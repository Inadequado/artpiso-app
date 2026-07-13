-- =====================================================================
-- ART PISO 0.0.2 — Migration 5/5: RLS
-- Papeis (decisao do usuario, 2026-07-12):
--   admin    = permissao total
--   gerente  = operacao do dia a dia (PROPOSTA em validacao no doc 0.0.2)
--   vendedor = SOMENTE VISUALIZACAO (conta compartilhada no tablet da loja)
-- Tabelas operacionais (lotes, alocacoes, pedidos, reservas, entregas,
-- estornos, movimentos) NAO tem policy de escrita: o client so escreve
-- via RPCs (security definer), que checam o papel internamente.
-- =====================================================================

alter table profiles          enable row level security;
alter table quadras           enable row level security;
alter table produtos          enable row level security;
alter table lotes             enable row level security;
alter table lote_quadras      enable row level security;
alter table clientes          enable row level security;
alter table cliente_enderecos enable row level security;
alter table pedidos           enable row level security;
alter table reservas          enable row level security;
alter table entregas          enable row level security;
alter table entrega_quadras   enable row level security;
alter table estornos          enable row level security;
alter table movimentos        enable row level security;
alter table parametros        enable row level security;

-- ---------------------------------------------------------------------
-- PROFILES: cada um le o proprio; admin le e gerencia todos
-- ---------------------------------------------------------------------
create policy profiles_self_read on profiles for select
  using (id = auth.uid() or auth_role() = 'admin');
create policy profiles_admin_write on profiles for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- LEITURA GERAL: todo autenticado le tudo (Q11; o tablet ve estoque,
-- reservas e clientes — vendedor e leitura em TODAS as tabelas)
-- ---------------------------------------------------------------------
create policy quadras_read           on quadras           for select using (auth.uid() is not null);
create policy produtos_read          on produtos          for select using (auth.uid() is not null);
create policy lotes_read             on lotes             for select using (auth.uid() is not null);
create policy lote_quadras_read      on lote_quadras      for select using (auth.uid() is not null);
create policy clientes_read          on clientes          for select using (auth.uid() is not null);
create policy cliente_enderecos_read on cliente_enderecos for select using (auth.uid() is not null);
create policy pedidos_read           on pedidos           for select using (auth.uid() is not null);
create policy reservas_read          on reservas          for select using (auth.uid() is not null);
create policy entregas_read          on entregas          for select using (auth.uid() is not null);
create policy entrega_quadras_read   on entrega_quadras   for select using (auth.uid() is not null);
create policy estornos_read          on estornos          for select using (auth.uid() is not null);
create policy movimentos_read        on movimentos        for select using (auth.uid() is not null);
create policy parametros_read        on parametros        for select using (auth.uid() is not null);

-- ---------------------------------------------------------------------
-- ESCRITA DE CADASTRO (tabelas simples, sem regra composta)
-- ---------------------------------------------------------------------
-- Quadras: admin e gerente
create policy quadras_write on quadras for all
  using (auth_role() in ('admin', 'gerente'))
  with check (auth_role() in ('admin', 'gerente'));

-- Produtos (catalogo): so admin (proposta da matriz)
create policy produtos_write on produtos for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

-- Clientes e enderecos: admin e gerente (gerente precisa p/ criar pedido
-- de cliente novo — flexibiliza a Q13 antiga; validar com o usuario)
create policy clientes_write on clientes for all
  using (auth_role() in ('admin', 'gerente'))
  with check (auth_role() in ('admin', 'gerente'));
create policy cliente_enderecos_write on cliente_enderecos for all
  using (auth_role() in ('admin', 'gerente'))
  with check (auth_role() in ('admin', 'gerente'));

-- Parametros: so admin
create policy parametros_write on parametros for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

-- Tabelas operacionais: SEM policy de escrita de proposito (so RPC).
