-- =====================================================================
-- ART PISO 0.0.2 — Notificacao "lida" POR USUARIO (plano B)
--  - O CONTEUDO segue global (uma linha por evento em notificacoes);
--  - O ESTADO de leitura vira por usuario: tabela notificacao_leitura.
--  - Conta compartilhada (balcao) = 1 user_id => "lida" efetivamente
--    global naquele login; admin e gerente ganham badge independente.
--  - vw_notificacoes_usuario devolve o `lida` ja derivado p/ auth.uid(),
--    mantendo o mesmo formato que o app ja consumia.
-- Substitui o modelo "lida GLOBAL" da migration 20260714090000.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Estado de leitura por usuario (presenca da linha = lida por ele)
-- ---------------------------------------------------------------------
create table notificacao_leitura (
  notificacao_id uuid not null references notificacoes(id) on delete cascade,
  user_id        uuid not null references auth.users(id)   on delete cascade default auth.uid(),
  lida_em        timestamptz not null default now(),
  primary key (notificacao_id, user_id)
);
create index idx_notificacao_leitura_user on notificacao_leitura (user_id);

-- Preserva o que ja estava lido: replica o `lida` GLOBAL de hoje para cada
-- usuario existente (roda ANTES de dropar a coluna lida).
insert into notificacao_leitura (notificacao_id, user_id)
select n.id, p.id
from notificacoes n
cross join profiles p
where n.lida = true
on conflict do nothing;

-- ---------------------------------------------------------------------
-- View que o app consome: mesmo formato de antes, mas `lida` por usuario
-- ---------------------------------------------------------------------
create or replace view public.vw_notificacoes_usuario
with (security_invoker = true)
as
select
  n.id,
  n.tipo,
  n.titulo,
  n.descricao,
  n.silencioso,
  n.created_at,
  exists (
    select 1 from notificacao_leitura nl
    where nl.notificacao_id = n.id and nl.user_id = auth.uid()
  ) as lida
from notificacoes n;

-- ---------------------------------------------------------------------
-- Marcar como lida (o proprio usuario) — vale ate para vendedor.
-- security definer + auth.uid(): user_id nunca e escolhido pelo cliente.
-- ---------------------------------------------------------------------
create or replace function public.fn_marcar_lida(p_notificacao_id uuid)
returns void
language sql security definer
set search_path = public
as $$
  insert into notificacao_leitura (notificacao_id, user_id)
  select p_notificacao_id, auth.uid()
  where auth.uid() is not null
  on conflict do nothing;
$$;

create or replace function public.fn_marcar_todas_lidas()
returns void
language sql security definer
set search_path = public
as $$
  insert into notificacao_leitura (notificacao_id, user_id)
  select n.id, auth.uid()
  from notificacoes n
  where auth.uid() is not null
  on conflict do nothing;
$$;

-- ---------------------------------------------------------------------
-- RLS: cada um le SO as proprias leituras. Escrita apenas pelos RPCs
-- (definer) acima — sem policy de insert/update/delete pro cliente.
-- ---------------------------------------------------------------------
alter table notificacao_leitura enable row level security;
create policy notificacao_leitura_read on notificacao_leitura
  for select using (user_id = auth.uid());

grant execute on function public.fn_marcar_lida(uuid)   to authenticated;
grant execute on function public.fn_marcar_todas_lidas() to authenticated;
revoke execute on function public.fn_marcar_lida(uuid)   from public, anon;
revoke execute on function public.fn_marcar_todas_lidas() from public, anon;

-- Realtime: sincroniza o "lido" entre aparelhos do MESMO usuario (balcao).
-- A RLS acima faz cada aparelho receber so os proprios inserts.
alter publication supabase_realtime add table notificacao_leitura;

-- ---------------------------------------------------------------------
-- Aposenta o modelo GLOBAL: sem a coluna lida (fonte de verdade errada)
-- e sem o write-grant que ela exigia (fecha a superficie apontada na
-- revisao de seguranca). O conteudo de notificacoes segue imutavel.
-- ---------------------------------------------------------------------
drop policy if exists notificacoes_marcar_lida on notificacoes;
revoke update (lida) on notificacoes from authenticated;
alter table notificacoes drop column lida;
