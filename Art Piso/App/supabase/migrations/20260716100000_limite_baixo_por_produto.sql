-- =====================================================================
-- ART PISO 0.0.2 — Limite de "estoque baixo" POR PRODUTO
--  - Antes: limiar global unico (parametros.limite_estoque_baixo_cx = 10).
--  - Agora: cada produto tem o seu (ceramica padrao avisa em 50 cx;
--    porcelanato de baixa demanda avisa em 3). Coluna nao-nula, default 10.
--  - Aposenta o uso do parametro global NESTE limiar (o pico de perda segue
--    usando parametros). vw_estoque expoe a coluna; fn_avaliar_produto le dela.
-- =====================================================================

alter table produtos add column limite_estoque_baixo_cx int not null default 10;

-- ---------------------------------------------------------------------
-- vw_estoque: mesma "tabela principal", agora expondo o limite do produto
-- (coluna nova ao final; o app lê select('*') e o status passa a usá-la).
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
  (coalesce(alocado.caixas, 0) - coalesce(res.caixas_reserva, 0) - l.caixas_perda) * l.m2_por_caixa as m2_disponivel,

  -- ----- limiar de alerta (por produto) -----
  p.limite_estoque_baixo_cx                                as limite_estoque_baixo_cx
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
-- fn_avaliar_produto: base = versao da CURADORIA E-05 (20260714110000,
-- com desconto da janela E-03 no "Promessa em risco"). Unica mudanca aqui:
-- o limiar "baixo" (v_limite) vem da COLUNA DO PRODUTO, nao do parametro.
-- ---------------------------------------------------------------------
create or replace function public.fn_avaliar_produto(p_produto_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
  v_limite int;
  v_janela int;
  v_fisico int;
  v_perda int;
  v_travadas int;
  v_prometido int;
  v_desconto_janela int;
  v_disponivel int;
  v_liquido int;
  v_status text;
  v_furo boolean;
  v_faltam int;
  v_ant produto_alertas%rowtype;
  v_sev_novo int;
  v_sev_ant int;
begin
  select nome, limite_estoque_baixo_cx into v_nome, v_limite from produtos where id = p_produto_id;
  if v_nome is null then
    delete from produto_alertas where produto_id = p_produto_id;
    return;
  end if;
  select coalesce((select valor from parametros where chave = 'dias_antecedencia_entrega'), 30)::int into v_janela;

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

  -- Parcela do prometido que e ASSUNTO DO E-03 (encomenda em risco):
  -- o saldo NAO separado das rotacionando com entrega dentro da janela.
  select coalesce(sum(greatest(0, r.caixas_saldo - r.caixas_travadas)), 0) into v_desconto_janela
    from reservas r
    join pedidos ped on ped.id = r.pedido_id
    join lotes l on l.id = r.lote_id
   where l.produto_id = p_produto_id
     and r.status in ('reservado', 'parcial')
     and r.regime = 'rotacionando'
     and ped.data_prevista is not null
     and ped.data_prevista >= current_date
     and ped.data_prevista <= current_date + v_janela;

  v_disponivel := v_fisico - v_travadas - v_perda;
  v_liquido := v_fisico - v_perda;
  v_status := case when v_disponivel <= 0 then 'esgotado' when v_disponivel < v_limite then 'baixo' else 'ok' end;
  v_faltam := (v_prometido - v_desconto_janela) - v_liquido;
  v_furo := v_faltam > 0;

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
      format('%s — faltam %s cx para cobrir os pedidos', v_nome, v_faltam));
  elsif not v_furo and v_ant.em_furo then
    perform fn_notificar('estoque', 'Estoque cobre os pedidos',
      format('%s — dá pra separar as caixas prometidas', v_nome), true);
  end if;

  update produto_alertas
     set status_estoque = v_status, em_furo = v_furo, atualizado_em = now()
   where produto_id = p_produto_id;
end;
$$;

-- Sem re-baseline de produto_alertas: na migration todo produto herda o
-- default 10 (== o limiar global antigo), entao nenhum baseline de status
-- fica velho aqui. Ao CUSTOMIZAR o limite de um produto depois, o badge
-- (vw_estoque) atualiza na hora e o baseline do alerta reconcilia na proxima
-- movimentacao de estoque daquele produto — mesmo padrao de qualquer mudanca.
