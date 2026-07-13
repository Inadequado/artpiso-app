-- =====================================================================
-- ART PISO 0.0.2 — Migration 3/5: derivados (funcoes de leitura e views)
-- Nada aqui e gravado: caixas sao a fonte da verdade, o resto e conta.
-- =====================================================================

-- Disponivel do lote = estoque fisico (soma alocacoes) - reserva TRAVADA - perda.
-- Regra DISPONIVEL x REGIME (validada no mock): aguardando/travado travam o saldo
-- inteiro; rotacionando trava so caixas_travadas (pode ser 0 — estoque gira).
create or replace function public.fn_disponivel_lote(p_lote_id uuid)
returns int
language sql stable
set search_path = public
as $$
  select coalesce((select sum(lq.caixas) from lote_quadras lq where lq.lote_id = p_lote_id), 0)
       - coalesce((select sum(case when r.regime = 'rotacionando' then r.caixas_travadas else r.caixas_saldo end)
                     from reservas r
                    where r.lote_id = p_lote_id
                      and r.status in ('reservado', 'parcial')), 0)
       - coalesce((select l.caixas_perda from lotes l where l.id = p_lote_id), 0);
$$;

-- Sugestao do proximo numero de pedido (PH-7: campo manual com sugestao anti-erro)
create or replace function public.fn_proximo_numero_pedido()
returns text
language sql stable
set search_path = public
as $$
  select 'PED-' || (coalesce(max(nullif(regexp_replace(numero, '\D', '', 'g'), '')::int), 1000) + 1)::text
  from pedidos;
$$;

-- ---------------------------------------------------------------------
-- vw_estoque: a "tabela principal" que o app consome, tudo ja calculado
-- ---------------------------------------------------------------------
create or replace view public.vw_estoque
with (security_invoker = true)
as
select
  l.id     as lote_id,
  l.codigo as lote,
  l.bitola,
  l.tonalidade,
  p.id     as produto_id,
  p.nome,
  p.referencia,
  p.marca,
  p.tamanho_nominal,
  p.descricao,
  p.preco_m2,
  p.foto,
  l.m2_por_caixa,
  l.pecas_por_caixa,
  l.pisos_danificados,

  -- ----- em CAIXAS -----
  coalesce(alocado.caixas, 0)                              as caixas_estoque,
  coalesce(res.caixas_reserva, 0)                          as caixas_reserva,
  l.caixas_perda,
  coalesce(alocado.caixas, 0) - coalesce(res.caixas_reserva, 0) - l.caixas_perda as caixas_disponivel,
  coalesce(alocado.alocacoes, '[]'::jsonb)                 as alocacoes,  -- [{quadra, caixas}] p/ o label da UI

  -- ----- em M2 (sempre derivado) -----
  coalesce(alocado.caixas, 0) * l.m2_por_caixa             as m2_estoque,
  coalesce(res.caixas_reserva, 0) * l.m2_por_caixa         as m2_reserva,
  l.caixas_perda * l.m2_por_caixa                          as m2_perda,
  (coalesce(alocado.caixas, 0) - coalesce(res.caixas_reserva, 0) - l.caixas_perda) * l.m2_por_caixa as m2_disponivel
from lotes l
join produtos p on p.id = l.produto_id
left join (
  select lq.lote_id,
         sum(lq.caixas) as caixas,
         jsonb_agg(jsonb_build_object('quadra', q.numero, 'caixas', lq.caixas) order by lq.caixas desc) as alocacoes
  from lote_quadras lq
  join quadras q on q.id = lq.quadra_id
  group by lq.lote_id
) alocado on alocado.lote_id = l.id
left join (
  select r.lote_id,
         sum(case when r.regime = 'rotacionando' then r.caixas_travadas else r.caixas_saldo end) as caixas_reserva
  from reservas r
  where r.status in ('reservado', 'parcial')
  group by r.lote_id
) res on res.lote_id = l.id;

-- ---------------------------------------------------------------------
-- vw_quadras: card de Ajustes ("N lotes · M cx" + status manual)
-- ---------------------------------------------------------------------
create or replace view public.vw_quadras
with (security_invoker = true)
as
select
  q.id,
  q.numero,
  q.descricao,
  q.status,
  count(lq.lote_id)              as lotes,
  coalesce(sum(lq.caixas), 0)    as caixas
from quadras q
left join lote_quadras lq on lq.quadra_id = q.id
group by q.id;
