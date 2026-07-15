-- =====================================================================
-- ART PISO 0.0.2 — Curadoria do "Promessa em risco" (E-05)
-- Decisao do usuario (2026-07-14): quando o deficit vem de encomendas
-- rotacionando DENTRO da janela do E-03, quem fala e o "Encomenda em
-- risco" (mais especifico: PED + prazo). O E-05 desconta essa parcela e
-- segue dono do resto: excesso de promessa FORA da janela (encomendas
-- distantes), que o E-03 nao enxerga. Evita o alerta duplo com o mesmo
-- numero visto no teste.
-- =====================================================================

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
  select nome into v_nome from produtos where id = p_produto_id;
  if v_nome is null then
    delete from produto_alertas where produto_id = p_produto_id;
    return;
  end if;
  select coalesce((select valor from parametros where chave = 'limite_estoque_baixo_cx'), 10)::int into v_limite;
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

-- Recalcula o estado gravado com a formula nova SEM notificar (evita
-- "estoque cobre os pedidos" espurio na primeira reavaliacao pos-deploy)
update produto_alertas pa
   set em_furo = novo.furo,
       atualizado_em = now()
  from (
    select p.id as produto_id,
           (
             coalesce((select sum(r.caixas_saldo)
                       from reservas r join lotes l on l.id = r.lote_id
                       where l.produto_id = p.id and r.status in ('reservado','parcial')), 0)
             - coalesce((select sum(greatest(0, r.caixas_saldo - r.caixas_travadas))
                         from reservas r
                         join pedidos ped on ped.id = r.pedido_id
                         join lotes l on l.id = r.lote_id
                         where l.produto_id = p.id
                           and r.status in ('reservado','parcial')
                           and r.regime = 'rotacionando'
                           and ped.data_prevista is not null
                           and ped.data_prevista >= current_date
                           and ped.data_prevista <= current_date + coalesce((select valor from parametros where chave = 'dias_antecedencia_entrega'), 30)::int), 0)
           ) >
           (
             coalesce((select sum(lq.caixas) from lote_quadras lq join lotes l on l.id = lq.lote_id where l.produto_id = p.id), 0)
             - coalesce((select sum(l.caixas_perda) from lotes l where l.produto_id = p.id), 0)
           ) as furo
    from produtos p
  ) novo
 where pa.produto_id = novo.produto_id;
