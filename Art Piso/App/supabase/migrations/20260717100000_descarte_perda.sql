-- ART PISO — DESCARTE DE PERDA (decisao do usuario, 2026-07-17)
-- Problema (roteiro de teste, bloco 8): a caixa perdida continuava contando na
-- quadra e a correcao bloqueava zerar (comprometido inclui a perda) — beco sem saida.
-- Solucao: acao explicita de DESCARTE, espelhando o fluxo real do deposito:
--   perda registra o prejuizo -> descarte tira as caixas da quadra E baixa o
--   contador de perda JUNTOS (disponivel nao muda) -> correcao vira contagem pura.
-- O historico de perdas (movimentos tipo 'perda') NUNCA e apagado; o descarte
-- gera o proprio movimento ('descarte') — auditoria completa dos dois atos.

-- Novo tipo de movimento (usado so em corpo de funcao nesta migration: seguro em transacao).
alter type movimento_tipo add value if not exists 'descarte';

-- ---------------------------------------------------------------------
-- Descartar caixas perdidas: admin + gerente (mesmo papel da perda)
-- ---------------------------------------------------------------------
create or replace function public.fn_descartar_perda(p_lote_id uuid, p_caixas int, p_quadra_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_lote lotes%rowtype;
  v_quadra text;
  v_alocacao int;
begin
  perform fn_exigir_papel('admin', 'gerente');
  if p_caixas is null or p_caixas < 1 then raise exception 'Quantidade inválida.'; end if;
  select * into v_lote from lotes where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  if p_caixas > v_lote.caixas_perda then
    raise exception 'O lote tem % cx de perda acumulada — não dá para descartar %.', v_lote.caixas_perda, p_caixas;
  end if;
  select numero into v_quadra from quadras where id = p_quadra_id;
  if v_quadra is null then raise exception 'Quadra não encontrada.'; end if;
  select coalesce((select caixas from lote_quadras where lote_id = p_lote_id and quadra_id = p_quadra_id), 0) into v_alocacao;
  if p_caixas > v_alocacao then
    raise exception 'A quadra % tem % cx do lote — não dá para descartar % de lá.', v_quadra, v_alocacao, p_caixas;
  end if;

  -- Fisico e contador caem JUNTOS: o disponivel (estoque - reserva - perda)
  -- nao muda — ele ja tinha caido no registro da perda.
  if v_alocacao = p_caixas then
    delete from lote_quadras where lote_id = p_lote_id and quadra_id = p_quadra_id;
  else
    update lote_quadras set caixas = caixas - p_caixas where lote_id = p_lote_id and quadra_id = p_quadra_id;
  end if;
  update lotes set caixas_perda = caixas_perda - p_caixas where id = p_lote_id;

  perform fn_registrar_movimento('descarte',
    format('%s cx perdidas descartadas de %s · %s', p_caixas, v_lote.codigo, v_quadra),
    null, v_lote.id, v_lote.produto_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Correcao: mensagem do bloqueio agora explica a composicao e ENSINA o
-- caminho (a antiga mandava "cancelar reservas" mesmo quando era perda).
-- ---------------------------------------------------------------------
create or replace function public.fn_corrigir_estoque(p_lote_id uuid, p_quadra_id uuid, p_novo_total int)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_lote lotes%rowtype;
  v_atual int;
  v_total_lote int;
  v_reservado int;
  v_comprometido int;
  v_quadra text;
begin
  perform fn_exigir_papel('admin', 'gerente');
  if p_novo_total is null or p_novo_total < 0 then raise exception 'Quantidade inválida.'; end if;
  select * into v_lote from lotes where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  select numero into v_quadra from quadras where id = p_quadra_id;
  if v_quadra is null then raise exception 'Quadra não encontrada.'; end if;

  select coalesce((select caixas from lote_quadras where lote_id = p_lote_id and quadra_id = p_quadra_id), 0) into v_atual;
  select coalesce(sum(caixas), 0) into v_total_lote from lote_quadras where lote_id = p_lote_id;
  select coalesce(sum(case when regime = 'rotacionando' then caixas_travadas else caixas_saldo end), 0)
    into v_reservado
    from reservas where lote_id = p_lote_id and status in ('reservado', 'parcial');
  v_comprometido := v_reservado + v_lote.caixas_perda;
  if v_total_lote - v_atual + p_novo_total < v_comprometido then
    raise exception 'Com essa contagem o lote ficaria com % cx, abaixo do comprometido (% cx = % reservadas + % de perda). %',
      v_total_lote - v_atual + p_novo_total, v_comprometido, v_reservado, v_lote.caixas_perda,
      case
        when v_lote.caixas_perda > 0 and v_reservado > 0
          then 'Descarte as caixas perdidas (Ajustes → Descartar caixas perdidas) e/ou cancele reservas antes de reduzir.'
        when v_lote.caixas_perda > 0
          then 'Descarte as caixas perdidas (Ajustes → Descartar caixas perdidas) antes de reduzir.'
        else 'Cancele reservas antes de reduzir.'
      end;
  end if;

  if p_novo_total = 0 then
    delete from lote_quadras where lote_id = p_lote_id and quadra_id = p_quadra_id;
  else
    insert into lote_quadras (lote_id, quadra_id, caixas)
    values (p_lote_id, p_quadra_id, p_novo_total)
    on conflict (lote_id, quadra_id) do update set caixas = excluded.caixas;
  end if;

  perform fn_registrar_movimento('correcao', format('%s · %s: ajustado de %s para %s cx', v_lote.codigo, v_quadra, v_atual, p_novo_total), null, v_lote.id, v_lote.produto_id);
end;
$$;
