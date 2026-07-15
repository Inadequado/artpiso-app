-- =====================================================================
-- ART PISO 0.0.2 — Notificacoes persistentes + alertas DERIVADOS no banco
-- (etapa 1 do fechamento do modo Supabase)
--  - notificacoes: o sino sobrevive ao reload e vale p/ todos os aparelhos
--  - produto_alertas: estado por produto p/ alertar NA VIRADA (sem repetir)
--  - fn_avaliar_produto + triggers: estoque baixo/esgotado, reposto e furo
--  - pico de perda entra na fn_registrar_perda (le o limite de parametros)
-- "Lida" e GLOBAL (conta compartilhada no tablet) — decisao consciente.
-- =====================================================================

create type notificacao_tipo as enum ('reserva', 'perda', 'estoque', 'entrega', 'info');

create table notificacoes (
  id         uuid primary key default gen_random_uuid(),
  tipo       notificacao_tipo not null,
  titulo     text not null,
  descricao  text not null,
  silencioso boolean not null default false,  -- conta no badge mas nao toca o sino
  lida       boolean not null default false,  -- GLOBAL
  created_at timestamptz not null default now()
);
create index idx_notificacoes_data on notificacoes (created_at desc);

-- Estado por produto para detectar VIRADA (ok -> baixo -> esgotado; coberto -> furo).
create table produto_alertas (
  produto_id     uuid primary key references produtos(id) on delete cascade,
  status_estoque text not null check (status_estoque in ('ok', 'baixo', 'esgotado')),
  em_furo        boolean not null default false,
  atualizado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Inserção interna (revogada do client no fim do arquivo)
-- ---------------------------------------------------------------------
create or replace function public.fn_notificar(
  p_tipo notificacao_tipo, p_titulo text, p_descricao text, p_silencioso boolean default false
)
returns void
language sql security definer
set search_path = public
as $$
  insert into notificacoes (tipo, titulo, descricao, silencioso)
  values (p_tipo, p_titulo, p_descricao, p_silencioso);
$$;

-- Notificacao DIRETA de acao, disparada pelo app (reserva criada, entrega...).
-- Exposta ao client com checagem de papel (vendedor nao executa acoes).
create or replace function public.fn_notificar_cliente(
  p_tipo text, p_titulo text, p_descricao text, p_silencioso boolean default false
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_exigir_papel('admin', 'gerente');
  perform fn_notificar(p_tipo::notificacao_tipo, p_titulo, p_descricao, p_silencioso);
end;
$$;

-- ---------------------------------------------------------------------
-- Avaliador de produto: recomputa status/furo e alerta SO na virada.
-- Espelha o mock: esgotado quando o produto INTEIRO zera; baixo < limite
-- (parametros); furo (E-05) = prometido > estoque fisico liquido; melhora
-- de severidade = "Estoque reposto" silencioso.
-- ---------------------------------------------------------------------
create or replace function public.fn_avaliar_produto(p_produto_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
  v_limite int;
  v_fisico int;
  v_perda int;
  v_travadas int;
  v_prometido int;
  v_disponivel int;
  v_liquido int;
  v_status text;
  v_furo boolean;
  v_ant produto_alertas%rowtype;
  v_sev_novo int;
  v_sev_ant int;
begin
  select nome into v_nome from produtos where id = p_produto_id;
  if v_nome is null then
    delete from produto_alertas where produto_id = p_produto_id;
    return;
  end if;
  select coalesce((select valor from parametros where chave = 'limite_estoque_baixo_cx'), 10)::int into v_limite;

  select coalesce(sum(lq.caixas), 0) into v_fisico
    from lote_quadras lq join lotes l on l.id = lq.lote_id
   where l.produto_id = p_produto_id;
  select coalesce(sum(l.caixas_perda), 0) into v_perda
    from lotes l where l.produto_id = p_produto_id;
  select
    coalesce(sum(case when r.regime = 'rotacionando' then r.caixas_travadas else r.caixas_saldo end), 0),
    coalesce(sum(r.caixas_saldo), 0)
    into v_travadas, v_prometido
    from reservas r join lotes l on l.id = r.lote_id
   where l.produto_id = p_produto_id and r.status in ('reservado', 'parcial');

  v_disponivel := v_fisico - v_travadas - v_perda;
  v_liquido := v_fisico - v_perda;
  v_status := case when v_disponivel <= 0 then 'esgotado' when v_disponivel < v_limite then 'baixo' else 'ok' end;
  v_furo := v_prometido > v_liquido;

  select * into v_ant from produto_alertas where produto_id = p_produto_id;
  if v_ant.produto_id is null then
    -- primeira avaliacao: registra o estado atual SEM alertar (init)
    insert into produto_alertas (produto_id, status_estoque, em_furo)
    values (p_produto_id, v_status, v_furo)
    on conflict (produto_id) do nothing;
    return;
  end if;

  v_sev_novo := case v_status when 'esgotado' then 2 when 'baixo' then 1 else 0 end;
  v_sev_ant  := case v_ant.status_estoque when 'esgotado' then 2 when 'baixo' then 1 else 0 end;

  if v_sev_novo > v_sev_ant then
    perform fn_notificar('estoque',
      case when v_status = 'esgotado' then 'Produto esgotado' else 'Estoque baixo' end,
      format('%s — %s cx disponíveis', v_nome, greatest(v_disponivel, 0)));
  elsif v_sev_novo < v_sev_ant then
    perform fn_notificar('estoque', 'Estoque reposto',
      format('%s voltou ao estoque (%s cx disponíveis)', v_nome, v_disponivel), true);
  end if;

  if v_furo and not v_ant.em_furo then
    perform fn_notificar('estoque', 'Promessa em risco',
      format('%s — faltam %s cx para cobrir os pedidos', v_nome, v_prometido - v_liquido));
  elsif not v_furo and v_ant.em_furo then
    perform fn_notificar('estoque', 'Estoque cobre os pedidos',
      format('%s — dá pra separar as caixas prometidas', v_nome), true);
  end if;

  update produto_alertas
     set status_estoque = v_status, em_furo = v_furo, atualizado_em = now()
   where produto_id = p_produto_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Gatilhos: qualquer mudanca de estoque/reserva/perda reavalia o produto.
-- DEFERRED = avaliam no COMMIT, com o estado final da transacao (uma
-- entrega mexe em reservas E lote_quadras; avaliacoes repetidas sao no-op).
-- ---------------------------------------------------------------------
create or replace function public.fn_trigger_avaliar_lote_quadras()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_produto uuid;
begin
  select produto_id into v_produto from lotes where id = coalesce(new.lote_id, old.lote_id);
  if v_produto is not null then perform fn_avaliar_produto(v_produto); end if;
  return null;
end;
$$;
create constraint trigger trg_avaliar_lote_quadras
  after insert or update or delete on lote_quadras
  deferrable initially deferred
  for each row execute function fn_trigger_avaliar_lote_quadras();

create or replace function public.fn_trigger_avaliar_reservas()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_produto uuid;
begin
  select produto_id into v_produto from lotes where id = coalesce(new.lote_id, old.lote_id);
  if v_produto is not null then perform fn_avaliar_produto(v_produto); end if;
  return null;
end;
$$;
create constraint trigger trg_avaliar_reservas
  after insert or update or delete on reservas
  deferrable initially deferred
  for each row execute function fn_trigger_avaliar_reservas();

create or replace function public.fn_trigger_avaliar_lotes()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_avaliar_produto(coalesce(new.produto_id, old.produto_id));
  return null;
end;
$$;
create constraint trigger trg_avaliar_lotes
  after insert or update or delete on lotes
  deferrable initially deferred
  for each row execute function fn_trigger_avaliar_lotes();

-- Estado inicial dos produtos existentes (sem alertar)
insert into produto_alertas (produto_id, status_estoque, em_furo)
select p.id,
       case when disp.v <= 0 then 'esgotado'
            when disp.v < coalesce((select valor from parametros where chave = 'limite_estoque_baixo_cx'), 10) then 'baixo'
            else 'ok' end,
       coalesce(prom.v, 0) > coalesce(fis.v, 0) - coalesce(per.v, 0)
from produtos p
cross join lateral (
  select coalesce((select sum(lq.caixas) from lote_quadras lq join lotes l on l.id = lq.lote_id where l.produto_id = p.id), 0) as v
) fis
cross join lateral (
  select coalesce((select sum(l.caixas_perda) from lotes l where l.produto_id = p.id), 0) as v
) per
cross join lateral (
  select coalesce((select sum(case when r.regime = 'rotacionando' then r.caixas_travadas else r.caixas_saldo end)
                   from reservas r join lotes l on l.id = r.lote_id
                   where l.produto_id = p.id and r.status in ('reservado', 'parcial')), 0) as v
) trav
cross join lateral (
  select coalesce((select sum(r.caixas_saldo) from reservas r join lotes l on l.id = r.lote_id
                   where l.produto_id = p.id and r.status in ('reservado', 'parcial')), 0) as v
) prom
cross join lateral (
  select fis.v - trav.v - per.v as v
) disp
on conflict (produto_id) do nothing;

-- ---------------------------------------------------------------------
-- Pico de perda (PH-2) entra na propria RPC de perda (le parametros)
-- ---------------------------------------------------------------------
create or replace function public.fn_registrar_perda(
  p_lote_id uuid, p_caixas int, p_pisos int, p_motivo text, p_quadra_id uuid default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_lote lotes%rowtype;
  v_quadra text;
  v_limite_pico int;
begin
  perform fn_exigir_papel('admin', 'gerente');
  if p_caixas is null or p_caixas < 1 then raise exception 'Quantidade inválida.'; end if;
  if p_motivo is null or trim(p_motivo) = '' then raise exception 'Motivo da perda é obrigatório.'; end if;
  select * into v_lote from lotes where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  if p_caixas > fn_disponivel_lote(p_lote_id) then
    raise exception 'Perda acima do disponível do lote (%).', fn_disponivel_lote(p_lote_id);
  end if;
  if coalesce(p_pisos, 0) < 0 or coalesce(p_pisos, 0) > p_caixas * v_lote.pecas_por_caixa then
    raise exception 'Máximo plausível: % pisos (% cx × % pç/caixa).', p_caixas * v_lote.pecas_por_caixa, p_caixas, v_lote.pecas_por_caixa;
  end if;
  if p_quadra_id is not null then
    select numero into v_quadra from quadras where id = p_quadra_id;
  end if;

  update lotes
     set caixas_perda = caixas_perda + p_caixas,
         pisos_danificados = pisos_danificados + coalesce(p_pisos, 0)
   where id = p_lote_id;

  perform fn_registrar_movimento(
    'perda',
    format('%s cx em %s', p_caixas, v_lote.codigo)
      || coalesce(' · ' || v_quadra, '')
      || case when coalesce(p_pisos, 0) > 0
              then format(' · %s piso%s danificado%s', p_pisos, case when p_pisos = 1 then '' else 's' end, case when p_pisos = 1 then '' else 's' end)
              else '' end,
    p_motivo, v_lote.id, v_lote.produto_id);

  -- Pico de perda (silencioso): so quando a perda ACUMULADA do lote cruza o limite (1x)
  select coalesce((select valor from parametros where chave = 'limite_pico_perda_cx'), 5)::int into v_limite_pico;
  if v_lote.caixas_perda < v_limite_pico and v_lote.caixas_perda + p_caixas >= v_limite_pico then
    perform fn_notificar('perda', 'Pico de perda',
      format('%s — lote %s acumulou %s cx de perda',
        (select nome from produtos where id = v_lote.produto_id), v_lote.codigo, v_lote.caixas_perda + p_caixas),
      true);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS + permissoes de coluna: todos leem; client so pode marcar LIDA
-- (insert/delete so pelas funcoes; conteudo imutavel pro client)
-- ---------------------------------------------------------------------
alter table notificacoes    enable row level security;
alter table produto_alertas enable row level security;

create policy notificacoes_read on notificacoes for select using (auth.uid() is not null);
create policy notificacoes_marcar_lida on notificacoes for update
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy produto_alertas_read on produto_alertas for select using (auth.uid() is not null);

revoke update on notificacoes from anon, authenticated;
grant update (lida) on notificacoes to authenticated;

revoke execute on function public.fn_notificar(notificacao_tipo, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.fn_avaliar_produto(uuid) from public, anon, authenticated;

-- Realtime: o sino de todos os aparelhos ouve inserts/updates desta tabela
alter publication supabase_realtime add table notificacoes;
