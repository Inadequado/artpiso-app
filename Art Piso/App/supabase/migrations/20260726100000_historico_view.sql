-- ART PISO — Historico completo unificado (decisao do usuario, 2026-07-26)
-- Uma VIEW que junta, numa linha do tempo unica e ordenavel por created_at, os
-- 5 tipos de evento que ja vivem no banco. O frontend consulta com filtros
-- (periodo/tipo/cliente/produto/usuario/busca) + paginacao (.range()).
--
-- security_invoker = true: a view roda com as permissoes de QUEM consulta, entao
-- respeita o RLS de leitura ja existente nas tabelas (nada de vazar dado). PG15+.
--
-- Colunas normalizadas (todas as fontes preenchem o mesmo shape):
--   id           text  -- prefixado pela fonte, unico (mov-/res-/ent-/est-/can-)
--   created_at   timestamptz
--   tipo         text  -- 'ajuste' | 'reserva' | 'entrega' | 'devolucao' | 'cancelamento'
--   detalhe      text  -- texto pronto (numero do pedido, texto do movimento...)
--   observacao   text  -- motivo/observacao livre (perda, cancelamento, devolucao)
--   usuario      text  -- quem fez (null em cancelamento: banco nao guarda autor)
--   cliente_id   uuid  -- pra filtrar por cliente (null em ajuste)
--   cliente      text
--   produto_id   uuid  -- pra filtrar por produto
--   produto      text
--   lote         text
--   caixas       int

create or replace view public.vw_historico
with (security_invoker = true) as

-- 1) AJUSTES de estoque (entrada, perda, descarte, mover quadra, correcao)
select
  'mov-' || m.id::text            as id,
  m.created_at                    as created_at,
  'ajuste'                        as tipo,
  m.detalhe                       as detalhe,
  m.observacao                    as observacao,
  pr.nome                         as usuario,
  null::uuid                      as cliente_id,
  null::text                      as cliente,
  m.produto_id                    as produto_id,
  prod.nome                       as produto,
  lo.codigo                       as lote,
  null::int                       as caixas
from movimentos m
left join profiles pr on pr.id = m.usuario_id
left join produtos prod on prod.id = m.produto_id
left join lotes lo on lo.id = m.lote_id

union all

-- 2) RESERVA CRIADA
select
  'res-' || r.id::text,
  r.created_at,
  'reserva',
  ped.numero,
  ped.observacoes,
  pr.nome,
  cli.id,
  cli.nome,
  prod.id,
  prod.nome,
  lo.codigo,
  (r.caixas_saldo + r.caixas_entregues)
from reservas r
join pedidos ped on ped.id = r.pedido_id
join lotes lo on lo.id = r.lote_id
join produtos prod on prod.id = lo.produto_id
left join clientes cli on cli.id = ped.cliente_id
left join profiles pr on pr.id = ped.vendedor_id

union all

-- 3) ENTREGA
select
  'ent-' || e.id::text,
  e.created_at,
  'entrega',
  ped.numero,
  e.observacoes,
  coalesce(pr.nome, e.responsavel),
  cli.id,
  cli.nome,
  prod.id,
  prod.nome,
  lo.codigo,
  e.caixas
from entregas e
join lotes lo on lo.id = e.lote_id
join produtos prod on prod.id = lo.produto_id
join reservas r on r.id = e.reserva_id
join pedidos ped on ped.id = r.pedido_id
left join clientes cli on cli.id = ped.cliente_id
left join profiles pr on pr.id = e.registrado_por

union all

-- 4) DEVOLUCAO (estorno pos-entrega)
select
  'est-' || es.id::text,
  es.created_at,
  'devolucao',
  ped.numero,
  es.motivo,
  pr.nome,
  cli.id,
  cli.nome,
  prod.id,
  prod.nome,
  lo.codigo,
  es.caixas
from estornos es
join reservas r on r.id = es.reserva_id
join lotes lo on lo.id = r.lote_id
join produtos prod on prod.id = lo.produto_id
join pedidos ped on ped.id = r.pedido_id
left join clientes cli on cli.id = ped.cliente_id
left join profiles pr on pr.id = es.registrado_por

union all

-- 5) CANCELAMENTO (reserva cancelada; sem autor — o banco nao registra quem)
select
  'can-' || r.id::text,
  r.updated_at,
  'cancelamento',
  ped.numero,
  r.motivo_cancelamento,
  null::text,
  cli.id,
  cli.nome,
  prod.id,
  prod.nome,
  lo.codigo,
  null::int
from reservas r
join pedidos ped on ped.id = r.pedido_id
join lotes lo on lo.id = r.lote_id
join produtos prod on prod.id = lo.produto_id
left join clientes cli on cli.id = ped.cliente_id
where r.status = 'cancelado';

grant select on public.vw_historico to authenticated;
