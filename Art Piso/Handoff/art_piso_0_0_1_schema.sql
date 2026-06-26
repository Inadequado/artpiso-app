-- =====================================================================
--  ART PISO 0.0.1 — Schema inicial (Supabase / Postgres)
--  Controle de estoque de loja de pisos
--  Princípio: só guardamos a "fonte da verdade" (em CAIXAS).
--             m², Reserva e Disponível são SEMPRE derivados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Tipos (papéis e status de pedido)
-- ---------------------------------------------------------------------
create type user_role    as enum ('admin', 'vendedor', 'gerente');
create type reserva_status as enum ('reservado', 'entregue', 'cancelado');

-- ---------------------------------------------------------------------
-- 1. PROFILES  (espelha auth.users + papel do usuário)
--    O Supabase Auth cuida do login; aqui guardamos quem é quem.
-- ---------------------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  role       user_role not null default 'vendedor',
  created_at timestamptz not null default now()
);

-- Helper: papel do usuário logado (usado nas policies de RLS)
create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 2. QUADRAS  (depósito dividido em quadras numeradas a partir de 1)
-- ---------------------------------------------------------------------
create table quadras (
  id        serial primary key,
  numero    int not null unique check (numero >= 1),
  descricao text
);

-- ---------------------------------------------------------------------
-- 3. PRODUTOS  (nível REFERÊNCIA — identidade visual/comercial)
--    O que NÃO muda entre lotes fica aqui.
--    tamanho_nominal é só rótulo ("60x60"); a conta de m² usa o lote.
-- ---------------------------------------------------------------------
create table produtos (
  id              uuid primary key default gen_random_uuid(),
  referencia      text not null unique,        -- código de referência
  marca           text not null,
  tamanho_nominal text,                         -- ex.: "60x60", "90x90"
  descricao       text,
  fotos           text[] not null default '{}', -- paths no Supabase Storage
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. LOTES  (REFERÊNCIA + LOTE = unidade real de estoque)
--    Aqui mora tudo que VARIA por lote:
--      - quadra onde está
--      - m2_por_caixa (resiliente: o fabricante pode mudar isso)
--      - caixas em estoque (fonte da verdade física)
--      - caixas de perda
--    Reserva NÃO fica aqui — é somada da tabela 'reservas'.
-- ---------------------------------------------------------------------
create table lotes (
  id             uuid primary key default gen_random_uuid(),
  produto_id     uuid not null references produtos(id) on delete restrict,
  lote           text not null,                    -- número/código do lote
  quadra_id      int  not null references quadras(id) on delete restrict,
  m2_por_caixa   numeric(10,4) not null check (m2_por_caixa > 0),
  caixas_estoque numeric(12,2) not null default 0 check (caixas_estoque >= 0),
  caixas_perda   numeric(12,2) not null default 0 check (caixas_perda  >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Garante a identidade Referência + Lote:
  unique (produto_id, lote)
);

create index idx_lotes_produto on lotes(produto_id);
create index idx_lotes_quadra  on lotes(quadra_id);

-- ---------------------------------------------------------------------
-- 5. RESERVAS  (cada linha = um pedido)
--    Integra com a principal via lote_id.
--    A reserva é sempre de um LOTE específico (tonalidade/calibre importam).
--    Fonte da verdade em caixas; m² é derivado depois.
-- ---------------------------------------------------------------------
create table reservas (
  id                uuid primary key default gen_random_uuid(),
  numero_pedido     text not null unique,
  lote_id           uuid not null references lotes(id) on delete restrict,
  caixas_reservadas numeric(12,2) not null check (caixas_reservadas > 0),
  status            reserva_status not null default 'reservado',
  -- dados do comprador
  cliente_nome      text not null,
  cliente_telefone  text,
  cliente_doc       text,                  -- CPF/CNPJ
  cliente_obs       text,
  -- rastreio
  vendedor_id       uuid references profiles(id),
  data_entrega      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_reservas_lote   on reservas(lote_id);
create index idx_reservas_status on reservas(status);

-- ---------------------------------------------------------------------
-- 6. VIEW DE ESTOQUE  (a "tabela principal" que o app consome)
--    Devolve TUDO já calculado, em caixas E em m²:
--      Estoque, Reserva (soma dos pedidos ativos), Perda, Disponível
-- ---------------------------------------------------------------------
create or replace view vw_estoque as
select
  l.id                as lote_id,
  p.id                as produto_id,
  p.referencia,
  p.marca,
  p.tamanho_nominal,
  p.fotos,
  l.lote,
  q.numero            as quadra,
  l.m2_por_caixa,

  -- ----- em CAIXAS -----
  l.caixas_estoque,
  coalesce(r.caixas_reserva, 0)                                   as caixas_reserva,
  l.caixas_perda,
  (l.caixas_estoque - coalesce(r.caixas_reserva,0) - l.caixas_perda) as caixas_disponivel,

  -- ----- em M² (derivado do m2_por_caixa DESTE lote) -----
  (l.caixas_estoque                                   * l.m2_por_caixa) as m2_estoque,
  (coalesce(r.caixas_reserva,0)                       * l.m2_por_caixa) as m2_reserva,
  (l.caixas_perda                                     * l.m2_por_caixa) as m2_perda,
  ((l.caixas_estoque - coalesce(r.caixas_reserva,0) - l.caixas_perda)
                                                      * l.m2_por_caixa) as m2_disponivel
from lotes l
join produtos p on p.id = l.produto_id
join quadras  q on q.id = l.quadra_id
left join (
  select lote_id, sum(caixas_reservadas) as caixas_reserva
  from reservas
  where status = 'reservado'        -- só pedidos ativos descontam do disponível
  group by lote_id
) r on r.lote_id = l.id;

-- ---------------------------------------------------------------------
-- 7. CICLO DE VIDA DO PEDIDO (movimento físico do estoque)
--    reservado -> NÃO mexe no estoque físico (caixas ainda estão lá),
--                 só somem do "disponível" via a view.
--    entregue  -> baixa caixas_estoque (as caixas saíram do depósito).
--    cancelado -> simplesmente deixa de contar como reserva.
--    Estorno (entregue -> outro status) devolve as caixas ao estoque.
-- ---------------------------------------------------------------------
create or replace function fn_baixa_estoque_entrega()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'entregue' and old.status <> 'entregue' then
    update lotes
       set caixas_estoque = caixas_estoque - new.caixas_reservadas,
           updated_at = now()
     where id = new.lote_id;

  elsif old.status = 'entregue' and new.status <> 'entregue' then
    update lotes
       set caixas_estoque = caixas_estoque + old.caixas_reservadas,
           updated_at = now()
     where id = new.lote_id;
  end if;
  return new;
end;
$$;

create trigger trg_baixa_estoque
after update on reservas
for each row execute function fn_baixa_estoque_entrega();

-- (opcional) manter updated_at em dia
create or replace function fn_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_touch_produtos before update on produtos
  for each row execute function fn_touch_updated_at();
create trigger trg_touch_lotes before update on lotes
  for each row execute function fn_touch_updated_at();
create trigger trg_touch_reservas before update on reservas
  for each row execute function fn_touch_updated_at();

-- =====================================================================
-- 8. RLS — quem pode o quê (baseline; refinar conforme regras finais)
--    admin    : tudo
--    vendedor : lê estoque, cria/cancela reservas
--    gerente  : dá entrada de estoque, registra perda, gerencia quadra,
--               marca pedidos como entregues
-- =====================================================================
alter table profiles  enable row level security;
alter table quadras   enable row level security;
alter table produtos  enable row level security;
alter table lotes     enable row level security;
alter table reservas  enable row level security;

-- PROFILES: cada um vê o próprio; admin vê/gerencia todos
create policy profiles_self_read   on profiles for select
  using (id = auth.uid() or auth_role() = 'admin');
create policy profiles_admin_write on profiles for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- QUADRAS: todos autenticados leem; admin e gerente gerenciam
create policy quadras_read  on quadras for select using (auth.uid() is not null);
create policy quadras_write on quadras for all
  using (auth_role() in ('admin','gerente'))
  with check (auth_role() in ('admin','gerente'));

-- PRODUTOS: todos leem; admin gerencia
create policy produtos_read  on produtos for select using (auth.uid() is not null);
create policy produtos_write on produtos for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- LOTES: todos leem; admin e gerente gerenciam (estoque, perda, quadra)
create policy lotes_read  on lotes for select using (auth.uid() is not null);
create policy lotes_write on lotes for all
  using (auth_role() in ('admin','gerente'))
  with check (auth_role() in ('admin','gerente'));

-- RESERVAS: todos leem; vendedor e admin criam; vendedor/admin/gerente atualizam
create policy reservas_read   on reservas for select using (auth.uid() is not null);
create policy reservas_insert on reservas for insert
  with check (auth_role() in ('admin','vendedor'));
create policy reservas_update on reservas for update
  using (auth_role() in ('admin','vendedor','gerente'));

-- ---------------------------------------------------------------------
-- 9. SEED mínimo de exemplo (descomente para testar)
-- ---------------------------------------------------------------------
-- insert into quadras (numero) values (1),(2),(3),(4),(5);
-- insert into produtos (referencia, marca, tamanho_nominal)
--   values ('POR-6060-BL', 'Portinari', '60x60');
-- insert into lotes (produto_id, lote, quadra_id, m2_por_caixa, caixas_estoque)
--   select id, 'L-2405', 1, 2.16, 40 from produtos where referencia='POR-6060-BL';
