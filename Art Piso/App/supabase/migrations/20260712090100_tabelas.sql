-- =====================================================================
-- ART PISO 0.0.2 — Migration 2/5: tabelas, indices e triggers de base
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles (espelha auth.users; e-mail vive em auth.users, nao duplicar)
-- ---------------------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  role       user_role not null default 'vendedor',
  status     user_status not null default 'ativo',
  created_at timestamptz not null default now()
);

-- Papel do usuario logado (usado em policies e RPCs)
create or replace function public.auth_role()
returns user_role
language sql stable security definer
set search_path = public
as $$ select role from profiles where id = auth.uid(); $$;

-- Cria o profile automaticamente quando um usuario e criado no Auth.
-- Papel padrao = vendedor (o MAIS restrito: somente visualizacao); admin promove depois.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- quadras (numero text livre; MASCARA pendente — P1 do doc 0.0.2)
-- ---------------------------------------------------------------------
create table quadras (
  id         uuid primary key default gen_random_uuid(),
  numero     text not null,
  descricao  text not null,
  status     quadra_status not null default 'disponivel',  -- ocupacao MANUAL (Q-01 revertida)
  created_at timestamptz not null default now()
);
create unique index quadras_numero_unico on quadras (lower(trim(numero)));

-- ---------------------------------------------------------------------
-- produtos (identidade = id; referencia OPCIONAL, unica quando preenchida)
-- ---------------------------------------------------------------------
create table produtos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  referencia      text,
  marca           text not null,
  tamanho_nominal text,
  descricao       text,
  preco_m2        numeric(10,2) not null check (preco_m2 >= 0),
  foto            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index produtos_nome_unico       on produtos (chave_nome(nome));
create unique index produtos_referencia_unica on produtos (chave_referencia(referencia))
  where referencia is not null;
create trigger trg_touch_produtos before update on produtos
  for each row execute function fn_touch_updated_at();

-- ---------------------------------------------------------------------
-- lotes (SEM caixas_estoque e SEM quadra_id: estoque = soma de lote_quadras)
-- ---------------------------------------------------------------------
create table lotes (
  id                uuid primary key default gen_random_uuid(),
  produto_id        uuid not null references produtos(id) on delete restrict,
  codigo            text not null,
  bitola            text,
  tonalidade        text,
  m2_por_caixa      numeric(10,4) not null check (m2_por_caixa > 0),
  pecas_por_caixa   int not null check (pecas_por_caixa > 0),
  caixas_perda      int not null default 0 check (caixas_perda >= 0),
  pisos_danificados int not null default 0 check (pisos_danificados >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index lotes_codigo_unico on lotes (chave_referencia(codigo));  -- unico GLOBAL (PH-12)
create index idx_lotes_produto on lotes (produto_id);
create trigger trg_touch_lotes before update on lotes
  for each row execute function fn_touch_updated_at();

-- ---------------------------------------------------------------------
-- lote_quadras (Q1: alocacao por quadra; alocacao zerada e REMOVIDA)
-- ---------------------------------------------------------------------
create table lote_quadras (
  lote_id   uuid not null references lotes(id)   on delete cascade,
  quadra_id uuid not null references quadras(id) on delete restrict,
  caixas    int  not null check (caixas > 0),
  primary key (lote_id, quadra_id)
);
create index idx_lote_quadras_quadra on lote_quadras (quadra_id);

-- ---------------------------------------------------------------------
-- clientes + enderecos (R-06)
-- ---------------------------------------------------------------------
create table clientes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  documento  text not null,   -- CPF/CNPJ com mascara; digito verificador validado no app (PH-10)
  telefone   text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index clientes_documento_unico on clientes (regexp_replace(documento, '\D', '', 'g'));
create trigger trg_touch_clientes before update on clientes
  for each row execute function fn_touch_updated_at();

create table cliente_enderecos (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  apelido    text,
  endereco   text not null    -- texto livre por ora (P5 do doc 0.0.2)
);
create index idx_cliente_enderecos_cliente on cliente_enderecos (cliente_id);

-- ---------------------------------------------------------------------
-- pedidos (grupo R-07) + reservas (linhas; ciclo de vida POR LINHA)
-- ---------------------------------------------------------------------
create table pedidos (
  id               uuid primary key default gen_random_uuid(),
  numero           text not null,
  cliente_id       uuid not null references clientes(id) on delete restrict,
  endereco_id      uuid references cliente_enderecos(id) on delete set null,
  endereco_entrega text,     -- SNAPSHOT na criacao (fallback); null = retirada na loja
  data_prevista    date,     -- null = entrega imediata
  observacoes      text,
  vendedor_id      uuid references profiles(id),  -- quem REGISTROU (conta compartilhada do tablet nao identifica pessoa)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index pedidos_numero_unico on pedidos (lower(trim(numero)));
create trigger trg_touch_pedidos before update on pedidos
  for each row execute function fn_touch_updated_at();

create table reservas (
  id                  uuid primary key default gen_random_uuid(),
  pedido_id           uuid not null references pedidos(id) on delete restrict,
  lote_id             uuid not null references lotes(id)   on delete restrict,
  caixas_saldo        int not null default 0 check (caixas_saldo >= 0),      -- saldo EM ABERTO (encolhe a cada entrega, R-05)
  caixas_entregues    int not null default 0 check (caixas_entregues >= 0),
  caixas_travadas     int not null default 0 check (caixas_travadas >= 0),   -- so rotacionando usa (demais: derivado = saldo)
  regime              reserva_regime not null default 'aguardando',
  status              reserva_status not null default 'reservado',
  motivo_cancelamento text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (pedido_id, lote_id),   -- carrinho nao repete lote (R-07)
  check (status in ('entregue', 'cancelado', 'estornado') or caixas_saldo > 0)
);
create index idx_reservas_pedido on reservas (pedido_id);
create index idx_reservas_lote   on reservas (lote_id);
create index idx_reservas_status on reservas (status);
create trigger trg_touch_reservas before update on reservas
  for each row execute function fn_touch_updated_at();

-- ---------------------------------------------------------------------
-- entregas + entrega_quadras (Q6 parcial + M3: de quais quadras saiu)
-- ---------------------------------------------------------------------
create table entregas (
  id             uuid primary key default gen_random_uuid(),
  reserva_id     uuid not null references reservas(id) on delete restrict,
  lote_id        uuid not null references lotes(id)    on delete restrict,  -- de onde saiu (rotacionando pode trocar)
  caixas         int not null check (caixas > 0),
  responsavel    text not null,   -- motorista/cliente (texto livre)
  registrado_por uuid references profiles(id),
  observacoes    text,
  created_at     timestamptz not null default now()
);
create index idx_entregas_reserva on entregas (reserva_id);

create table entrega_quadras (
  entrega_id uuid not null references entregas(id) on delete cascade,
  quadra_id  uuid not null references quadras(id)  on delete restrict,
  caixas     int  not null check (caixas > 0),
  primary key (entrega_id, quadra_id)
);

-- ---------------------------------------------------------------------
-- estornos (R-08: devolucao pos-entrega, volta as alocacoes)
-- ---------------------------------------------------------------------
create table estornos (
  id                uuid primary key default gen_random_uuid(),
  reserva_id        uuid not null references reservas(id) on delete restrict,
  caixas            int not null check (caixas > 0),
  quadra_destino_id uuid not null references quadras(id) on delete restrict,
  motivo            text,
  registrado_por    uuid references profiles(id),
  created_at        timestamptz not null default now()
);
create index idx_estornos_reserva on estornos (reserva_id);

-- ---------------------------------------------------------------------
-- movimentos (Q10: log de AJUSTES — entrada/perda/quadra/correcao)
-- ---------------------------------------------------------------------
create table movimentos (
  id         uuid primary key default gen_random_uuid(),
  tipo       movimento_tipo not null,
  detalhe    text not null,
  observacao text,
  lote_id    uuid references lotes(id)    on delete set null,
  produto_id uuid references produtos(id) on delete set null,
  usuario_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_movimentos_produto on movimentos (produto_id, tipo);
create index idx_movimentos_data on movimentos (created_at desc);

-- ---------------------------------------------------------------------
-- parametros (PH-1/2/3 ajustaveis sem deploy)
-- ---------------------------------------------------------------------
create table parametros (
  chave     text primary key,
  valor     numeric not null,
  descricao text not null
);
insert into parametros (chave, valor, descricao) values
  ('limite_estoque_baixo_cx',   10, 'Disponivel abaixo disso = produto em estoque baixo (PH-1)'),
  ('limite_pico_perda_cx',       5, 'Perda acumulada do lote que dispara alerta (PH-2)'),
  ('dias_antecedencia_entrega', 30, 'Janela do alerta de encomenda em risco — E-03 (PH-3)');
