-- =====================================================================
-- ART PISO 0.0.2 — Migration 4/5: RPCs (operacoes compostas, transacionais)
-- O frontend NAO escreve direto nas tabelas operacionais: toda escrita
-- passa por estas funcoes (security definer + checagem de papel interna).
-- Espelham 1:1 as acoes do provider do mock validado na Fase 1.
-- =====================================================================

-- Papel exigido (erro amigavel unico para todas as RPCs)
create or replace function public.fn_exigir_papel(variadic p_papeis user_role[])
returns void
language plpgsql stable
set search_path = public
as $$
begin
  if auth_role() is null or not (auth_role() = any (p_papeis)) then
    raise exception 'Permissão negada para este papel.';
  end if;
end;
$$;

-- Log de ajuste (interno; execute revogado do client no fim do arquivo)
create or replace function public.fn_registrar_movimento(
  p_tipo movimento_tipo, p_detalhe text, p_observacao text, p_lote_id uuid, p_produto_id uuid
)
returns void
language sql
set search_path = public
as $$
  insert into movimentos (tipo, detalhe, observacao, lote_id, produto_id, usuario_id)
  values (p_tipo, p_detalhe, nullif(trim(coalesce(p_observacao, '')), ''), p_lote_id, p_produto_id, auth.uid());
$$;

-- =====================================================================
-- CATALOGO (lote nasce com a alocacao inicial — precisa ser atomico)
-- =====================================================================

-- Novo lote com a 1a alocacao (cadastro do mock: minimo 1 caixa numa quadra)
create or replace function public.fn_criar_lote(
  p_produto_id uuid, p_codigo text, p_bitola text, p_tonalidade text,
  p_m2_por_caixa numeric, p_pecas_por_caixa int, p_caixas int, p_quadra_id uuid
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_lote_id uuid;
begin
  perform fn_exigir_papel('admin', 'gerente');
  if p_caixas is null or p_caixas < 1 then
    raise exception 'Estoque inicial mínimo é 1 caixa.';
  end if;
  if exists (select 1 from lotes where chave_referencia(codigo) = chave_referencia(p_codigo)) then
    raise exception 'Código de lote já usado. Remessa nova do mesmo lote = Adicionar estoque; specs diferentes = sufixo (ex.: %-B).', trim(p_codigo);
  end if;
  insert into lotes (produto_id, codigo, bitola, tonalidade, m2_por_caixa, pecas_por_caixa)
  values (p_produto_id, trim(p_codigo), nullif(trim(coalesce(p_bitola, '')), ''), nullif(trim(coalesce(p_tonalidade, '')), ''), p_m2_por_caixa, p_pecas_por_caixa)
  returning id into v_lote_id;
  insert into lote_quadras (lote_id, quadra_id, caixas) values (v_lote_id, p_quadra_id, p_caixas);
  return v_lote_id;
end;
$$;

-- Editar lote (so descritivos; localizacao muda por fn_mover_quadra, estoque por entrada/correcao)
create or replace function public.fn_atualizar_lote(
  p_lote_id uuid, p_codigo text, p_bitola text, p_tonalidade text
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_exigir_papel('admin', 'gerente');
  if exists (select 1 from lotes where chave_referencia(codigo) = chave_referencia(p_codigo) and id <> p_lote_id) then
    raise exception 'Código de lote já usado por outro lote.';
  end if;
  update lotes
     set codigo = trim(p_codigo),
         bitola = nullif(trim(coalesce(p_bitola, '')), ''),
         tonalidade = nullif(trim(coalesce(p_tonalidade, '')), '')
   where id = p_lote_id;
  if not found then raise exception 'Lote não encontrado.'; end if;
end;
$$;

-- Remover lote: bloqueia com reserva ATIVA (anti-orfa); com historico de
-- entrega/estorno a FK bloqueia tambem (auditoria: lote com movimento nao some).
create or replace function public.fn_remover_lote(p_lote_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_exigir_papel('admin', 'gerente');
  if exists (select 1 from reservas where lote_id = p_lote_id and status in ('reservado', 'parcial')) then
    raise exception 'Lote tem reserva ativa. Cancele ou entregue antes de excluir.';
  end if;
  delete from lotes where id = p_lote_id;  -- lote_quadras cai em cascata
  if not found then raise exception 'Lote não encontrado.'; end if;
end;
$$;

-- Remover produto: mesmo criterio, para todos os lotes dele
create or replace function public.fn_remover_produto(p_produto_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_exigir_papel('admin');
  if exists (
    select 1 from reservas r join lotes l on l.id = r.lote_id
    where l.produto_id = p_produto_id and r.status in ('reservado', 'parcial')
  ) then
    raise exception 'Produto tem reserva ativa. Cancele ou entregue antes de excluir.';
  end if;
  delete from lotes where produto_id = p_produto_id;
  delete from produtos where id = p_produto_id;
  if not found then raise exception 'Produto não encontrado.'; end if;
end;
$$;

-- =====================================================================
-- AJUSTES DE ESTOQUE (Ajustes: entrada, perda, mover, correcao)
-- =====================================================================

-- Entrada de remessa: soma na quadra de destino (cria alocacao se for quadra
-- nova para o lote — e assim que um lote passa a ocupar 2+ quadras)
create or replace function public.fn_registrar_entrada(p_lote_id uuid, p_caixas int, p_quadra_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_lote lotes%rowtype;
  v_quadra quadras%rowtype;
begin
  perform fn_exigir_papel('admin', 'gerente');
  if p_caixas is null or p_caixas < 1 then raise exception 'Quantidade inválida.'; end if;
  select * into v_lote from lotes where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  select * into v_quadra from quadras where id = p_quadra_id;
  if not found then raise exception 'Quadra não encontrada.'; end if;

  insert into lote_quadras (lote_id, quadra_id, caixas)
  values (p_lote_id, p_quadra_id, p_caixas)
  on conflict (lote_id, quadra_id) do update set caixas = lote_quadras.caixas + excluded.caixas;

  perform fn_registrar_movimento('entrada', format('+%s cx em %s · %s', p_caixas, v_lote.codigo, v_quadra.numero), null, v_lote.id, v_lote.produto_id);
end;
$$;

-- Perda: a caixa INTEIRA vira perda (nao mexe nas alocacoes — o acerto fisico
-- e a correcao). Quadra e INFORMATIVA no historico (M2). Motivo obrigatorio.
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
end;
$$;

-- Mover caixas entre quadras (M2: parcial ou total; origem zerada some).
-- Estoque do lote nao muda — so a distribuicao.
create or replace function public.fn_mover_quadra(p_lote_id uuid, p_origem_id uuid, p_destino_id uuid, p_caixas int)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_lote lotes%rowtype;
  v_na_origem int;
  v_origem text;
  v_destino text;
begin
  perform fn_exigir_papel('admin', 'gerente');
  if p_caixas is null or p_caixas < 1 then raise exception 'Quantidade inválida.'; end if;
  if p_origem_id = p_destino_id then raise exception 'Origem e destino são a mesma quadra.'; end if;
  select * into v_lote from lotes where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  select caixas into v_na_origem from lote_quadras where lote_id = p_lote_id and quadra_id = p_origem_id;
  if v_na_origem is null or v_na_origem < p_caixas then
    raise exception 'A origem tem só % cx do lote.', coalesce(v_na_origem, 0);
  end if;
  select numero into v_origem  from quadras where id = p_origem_id;
  select numero into v_destino from quadras where id = p_destino_id;
  if v_destino is null then raise exception 'Quadra de destino não encontrada.'; end if;

  if v_na_origem = p_caixas then
    delete from lote_quadras where lote_id = p_lote_id and quadra_id = p_origem_id;
  else
    update lote_quadras set caixas = caixas - p_caixas where lote_id = p_lote_id and quadra_id = p_origem_id;
  end if;
  insert into lote_quadras (lote_id, quadra_id, caixas)
  values (p_lote_id, p_destino_id, p_caixas)
  on conflict (lote_id, quadra_id) do update set caixas = lote_quadras.caixas + excluded.caixas;

  perform fn_registrar_movimento('quadra', format('%s: %s → %s (%s cx)', v_lote.codigo, v_origem, v_destino, p_caixas), null, v_lote.id, v_lote.produto_id);
end;
$$;

-- Correcao de contagem POR QUADRA (Q1): novo total da alocacao; estoque do
-- lote vira a soma. PH-9: BLOQUEIA total do lote abaixo do comprometido.
create or replace function public.fn_corrigir_estoque(p_lote_id uuid, p_quadra_id uuid, p_novo_total int)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_lote lotes%rowtype;
  v_atual int;
  v_total_lote int;
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
  select coalesce(sum(case when regime = 'rotacionando' then caixas_travadas else caixas_saldo end), 0) + v_lote.caixas_perda
    into v_comprometido
    from reservas where lote_id = p_lote_id and status in ('reservado', 'parcial');
  if v_total_lote - v_atual + p_novo_total < v_comprometido then
    raise exception 'Com essa contagem o lote ficaria com % cx, abaixo do comprometido (% cx). Cancele reservas antes de reduzir.',
      v_total_lote - v_atual + p_novo_total, v_comprometido;
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

-- =====================================================================
-- PEDIDOS E RESERVAS (R-07 grupo + linhas; Q5 no banco)
-- =====================================================================

-- Itens: jsonb [{"lote_id": uuid, "caixas": int, "regime": text?, "caixas_travadas": int?}]
create or replace function public.fn_criar_pedido(
  p_numero text, p_cliente_id uuid, p_endereco_id uuid, p_data_prevista date,
  p_observacoes text, p_itens jsonb
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_item jsonb;
  v_lote lotes%rowtype;
  v_caixas int;
  v_regime reserva_regime;
  v_travadas int;
  v_endereco text;
begin
  perform fn_exigir_papel('admin', 'gerente');
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'Pedido precisa de ao menos um item.';
  end if;
  if exists (select 1 from pedidos where lower(trim(numero)) = lower(trim(p_numero))) then
    raise exception 'Número de pedido já usado.';
  end if;
  if p_endereco_id is not null then
    select endereco into v_endereco from cliente_enderecos where id = p_endereco_id and cliente_id = p_cliente_id;
    if not found then raise exception 'Endereço não pertence ao cliente.'; end if;
  end if;

  insert into pedidos (numero, cliente_id, endereco_id, endereco_entrega, data_prevista, observacoes, vendedor_id)
  values (trim(p_numero), p_cliente_id, p_endereco_id, v_endereco, p_data_prevista, nullif(trim(coalesce(p_observacoes, '')), ''), auth.uid())
  returning id into v_pedido_id;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_caixas   := (v_item ->> 'caixas')::int;
    v_regime   := coalesce((v_item ->> 'regime')::reserva_regime, 'aguardando');
    v_travadas := case when v_regime = 'rotacionando' then coalesce((v_item ->> 'caixas_travadas')::int, 0) else 0 end;
    if v_caixas is null or v_caixas < 1 then raise exception 'Quantidade inválida em um dos itens.'; end if;
    if v_travadas < 0 or v_travadas > v_caixas then raise exception 'Caixas separadas acima da quantidade do item.'; end if;
    select * into v_lote from lotes where id = (v_item ->> 'lote_id')::uuid for update;
    if not found then raise exception 'Lote não encontrado em um dos itens.'; end if;
    if v_caixas > fn_disponivel_lote(v_lote.id) then
      raise exception 'Reserva acima do disponível do lote % (Q5: bloqueio sempre).', v_lote.codigo;
    end if;
    insert into reservas (pedido_id, lote_id, caixas_saldo, caixas_travadas, regime)
    values (v_pedido_id, v_lote.id, v_caixas, v_travadas, v_regime);
  end loop;

  return v_pedido_id;
end;
$$;

-- Editor completo do pedido (R-07 + R-05):
--  - dados compartilhados: cliente TRAVADO apos a 1a entrega (R-05)
--  - linha reservada: atualiza quantidade/regime; fora da lista = CANCELA com rastro
--  - linha parcial: so saldo/regime (lote imutavel); saldo 0 = concluida como entregue
--  - item sem reserva_id = linha nova (mesmas regras da criacao)
create or replace function public.fn_editar_pedido(
  p_pedido_id uuid, p_cliente_id uuid, p_endereco_id uuid, p_data_prevista date,
  p_observacoes text, p_itens jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_pedido pedidos%rowtype;
  v_tem_entrega boolean;
  v_item jsonb;
  v_res reservas%rowtype;
  v_lote lotes%rowtype;
  v_caixas int;
  v_regime reserva_regime;
  v_travadas int;
  v_endereco text;
  v_novo_id uuid;
  v_manter uuid[] := '{}';
begin
  perform fn_exigir_papel('admin', 'gerente');
  select * into v_pedido from pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;

  select exists (
    select 1 from reservas r
    where r.pedido_id = p_pedido_id
      and (r.caixas_entregues > 0 or r.status in ('parcial', 'entregue', 'estornado'))
  ) into v_tem_entrega;
  if v_tem_entrega and p_cliente_id is distinct from v_pedido.cliente_id then
    raise exception 'Cliente não pode ser trocado após a primeira entrega (R-05).';
  end if;
  if p_endereco_id is not null then
    select endereco into v_endereco from cliente_enderecos where id = p_endereco_id and cliente_id = p_cliente_id;
    if not found then raise exception 'Endereço não pertence ao cliente.'; end if;
  end if;

  update pedidos
     set cliente_id = p_cliente_id,
         endereco_id = p_endereco_id,
         endereco_entrega = v_endereco,
         data_prevista = p_data_prevista,
         observacoes = nullif(trim(coalesce(p_observacoes, '')), '')
   where id = p_pedido_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) loop
    v_caixas := (v_item ->> 'caixas')::int;
    if v_item ->> 'reserva_id' is not null then
      -- linha existente
      select * into v_res from reservas where id = (v_item ->> 'reserva_id')::uuid and pedido_id = p_pedido_id for update;
      if not found then raise exception 'Linha não pertence ao pedido.'; end if;
      v_manter := v_manter || v_res.id;
      if v_res.status not in ('reservado', 'parcial') then
        continue;  -- entregue/cancelado/estornado: so-leitura, ignora
      end if;
      v_regime   := coalesce((v_item ->> 'regime')::reserva_regime, v_res.regime);
      v_travadas := case when v_regime = 'rotacionando' then coalesce((v_item ->> 'caixas_travadas')::int, v_res.caixas_travadas) else 0 end;
      if v_caixas is null or v_caixas < 0 then raise exception 'Quantidade inválida em um dos itens.'; end if;
      if v_travadas < 0 or v_travadas > v_caixas then raise exception 'Caixas separadas acima da quantidade do item.'; end if;
      perform 1 from lotes where id = v_res.lote_id for update;
      if v_caixas > v_res.caixas_saldo and (v_caixas - v_res.caixas_saldo) > fn_disponivel_lote(v_res.lote_id) then
        raise exception 'Aumento acima do disponível do lote (Q5).';
      end if;
      if v_caixas = 0 then
        if v_res.status = 'parcial' then
          -- R-05: reduzir saldo a 0 ENCERRA como entregue (nao e devolucao)
          update reservas set caixas_saldo = 0, caixas_travadas = 0, status = 'entregue' where id = v_res.id;
        else
          raise exception 'Item com 0 caixas: remova a linha do pedido em vez de zerar.';
        end if;
      else
        update reservas set caixas_saldo = v_caixas, caixas_travadas = v_travadas, regime = v_regime where id = v_res.id;
      end if;
    else
      -- linha nova (mesmas regras da criacao)
      v_regime   := coalesce((v_item ->> 'regime')::reserva_regime, 'aguardando');
      v_travadas := case when v_regime = 'rotacionando' then coalesce((v_item ->> 'caixas_travadas')::int, 0) else 0 end;
      if v_caixas is null or v_caixas < 1 then raise exception 'Quantidade inválida em um dos itens.'; end if;
      select * into v_lote from lotes where id = (v_item ->> 'lote_id')::uuid for update;
      if not found then raise exception 'Lote não encontrado em um dos itens.'; end if;
      if v_caixas > fn_disponivel_lote(v_lote.id) then
        raise exception 'Reserva acima do disponível do lote % (Q5).', v_lote.codigo;
      end if;
      insert into reservas (pedido_id, lote_id, caixas_saldo, caixas_travadas, regime)
      values (p_pedido_id, v_lote.id, v_caixas, v_travadas, v_regime)
      returning id into v_novo_id;
      v_manter := v_manter || v_novo_id;
    end if;
  end loop;

  -- linha reservada fora da lista = removida na edicao -> CANCELA com rastro
  update reservas
     set status = 'cancelado',
         motivo_cancelamento = coalesce(motivo_cancelamento, 'Removida na edição do pedido'),
         caixas_travadas = 0
   where pedido_id = p_pedido_id
     and status = 'reservado'
     and not (id = any (v_manter));
end;
$$;

create or replace function public.fn_cancelar_reserva(p_reserva_id uuid, p_motivo text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_res reservas%rowtype;
begin
  perform fn_exigir_papel('admin', 'gerente');
  select * into v_res from reservas where id = p_reserva_id for update;
  if not found or v_res.status not in ('reservado', 'parcial') then
    raise exception 'Reserva não está ativa.';
  end if;
  update reservas
     set status = 'cancelado',
         caixas_travadas = 0,
         motivo_cancelamento = nullif(trim(coalesce(p_motivo, '')), '')
   where id = p_reserva_id;
end;
$$;

-- Entrega (Q6 parcial + M3 divisao por quadra + troca de lote rotacionando).
-- Retiradas: jsonb [{"quadra_id": uuid, "caixas": int}]; null = automatico (maior quadra primeiro).
create or replace function public.fn_entregar(
  p_reserva_id uuid, p_caixas int, p_responsavel text,
  p_observacoes text default null, p_lote_alternativo_id uuid default null, p_retiradas jsonb default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_res reservas%rowtype;
  v_lote lotes%rowtype;
  v_entrega_id uuid;
  v_ret jsonb;
  v_soma int := 0;
  v_aloc int;
  v_restante int;
  v_saldo_novo int;
  r record;
begin
  perform fn_exigir_papel('admin', 'gerente');
  select * into v_res from reservas where id = p_reserva_id for update;
  if not found or v_res.status not in ('reservado', 'parcial') then
    raise exception 'Reserva não está ativa.';
  end if;
  if p_caixas is null or p_caixas < 1 or p_caixas > v_res.caixas_saldo then
    raise exception 'Quantidade fora do saldo em aberto (% cx).', v_res.caixas_saldo;
  end if;
  if p_responsavel is null or trim(p_responsavel) = '' then
    raise exception 'Responsável pela entrega é obrigatório.';
  end if;

  -- lote efetivo (troca so para rotacionando SEM entrega iniciada — R-05)
  if p_lote_alternativo_id is not null and p_lote_alternativo_id <> v_res.lote_id then
    if v_res.regime <> 'rotacionando' or v_res.status <> 'reservado' then
      raise exception 'Troca de lote só é permitida para rotacionando sem entrega iniciada (R-05).';
    end if;
    select * into v_lote from lotes where id = p_lote_alternativo_id for update;
    if not found then raise exception 'Lote alternativo não encontrado.'; end if;
    if v_lote.produto_id <> (select produto_id from lotes where id = v_res.lote_id) then
      raise exception 'Lote alternativo é de outro produto.';
    end if;
    if fn_disponivel_lote(v_lote.id) < p_caixas then
      raise exception 'Lote alternativo sem disponível suficiente.';
    end if;
    update reservas set lote_id = v_lote.id where id = v_res.id;  -- rebind (mock)
    v_res.lote_id := v_lote.id;
  else
    select * into v_lote from lotes where id = v_res.lote_id for update;
  end if;

  -- retiradas por quadra: usa as escolhidas (M3) ou sugere maior-primeiro
  if p_retiradas is null or jsonb_array_length(p_retiradas) = 0 then
    v_restante := p_caixas;
    v_ret := '[]'::jsonb;
    for r in
      select quadra_id, caixas from lote_quadras
      where lote_id = v_lote.id
      order by caixas desc, quadra_id
    loop
      exit when v_restante <= 0;
      v_aloc := least(r.caixas, v_restante);
      v_ret := v_ret || jsonb_build_object('quadra_id', r.quadra_id, 'caixas', v_aloc);
      v_restante := v_restante - v_aloc;
    end loop;
    if v_restante > 0 then
      raise exception 'Estoque físico do lote não cobre a entrega.';
    end if;
  else
    v_ret := p_retiradas;
  end if;

  -- valida a divisao: sem quadra repetida, soma = total, cada parcela cabe
  if (select count(*) from jsonb_array_elements(v_ret) e)
     <> (select count(distinct e ->> 'quadra_id') from jsonb_array_elements(v_ret) e) then
    raise exception 'Quadra repetida na divisão da entrega.';
  end if;
  for r in select (e ->> 'quadra_id')::uuid as quadra_id, (e ->> 'caixas')::int as caixas
           from jsonb_array_elements(v_ret) e loop
    if r.caixas is null or r.caixas < 1 then raise exception 'Divisão por quadra inválida.'; end if;
    select caixas into v_aloc from lote_quadras where lote_id = v_lote.id and quadra_id = r.quadra_id;
    if v_aloc is null or v_aloc < r.caixas then
      raise exception 'Retirada acima do que há na quadra (% cx no local).', coalesce(v_aloc, 0);
    end if;
    v_soma := v_soma + r.caixas;
  end loop;
  if v_soma <> p_caixas then
    raise exception 'A divisão por quadra (% cx) deve somar o total da entrega (% cx).', v_soma, p_caixas;
  end if;

  -- baixa fisica nas quadras escolhidas (alocacao zerada some)
  for r in select (e ->> 'quadra_id')::uuid as quadra_id, (e ->> 'caixas')::int as caixas
           from jsonb_array_elements(v_ret) e loop
    select caixas into v_aloc from lote_quadras where lote_id = v_lote.id and quadra_id = r.quadra_id;
    if v_aloc = r.caixas then
      delete from lote_quadras where lote_id = v_lote.id and quadra_id = r.quadra_id;
    else
      update lote_quadras set caixas = caixas - r.caixas where lote_id = v_lote.id and quadra_id = r.quadra_id;
    end if;
  end loop;

  -- reserva: saldo encolhe (R-05); saldo 0 = entregue, senao parcial
  v_saldo_novo := v_res.caixas_saldo - p_caixas;
  update reservas
     set caixas_saldo = v_saldo_novo,
         caixas_entregues = caixas_entregues + p_caixas,
         caixas_travadas = case when regime = 'rotacionando'
                                then least(greatest(caixas_travadas - p_caixas, 0), v_saldo_novo)
                                else 0 end,
         status = case when v_saldo_novo = 0 then 'entregue'::reserva_status else 'parcial'::reserva_status end
   where id = v_res.id;

  insert into entregas (reserva_id, lote_id, caixas, responsavel, registrado_por, observacoes)
  values (v_res.id, v_lote.id, p_caixas, trim(p_responsavel), auth.uid(), nullif(trim(coalesce(p_observacoes, '')), ''))
  returning id into v_entrega_id;

  insert into entrega_quadras (entrega_id, quadra_id, caixas)
  select v_entrega_id, (e ->> 'quadra_id')::uuid, (e ->> 'caixas')::int
  from jsonb_array_elements(v_ret) e;

  return v_entrega_id;
end;
$$;

-- Estorno/devolucao (R-08): so de 'entregue'; volta DE VERDADE as alocacoes
create or replace function public.fn_estornar(
  p_reserva_id uuid, p_caixas int, p_quadra_destino_id uuid, p_motivo text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_res reservas%rowtype;
begin
  perform fn_exigir_papel('admin', 'gerente');
  select * into v_res from reservas where id = p_reserva_id for update;
  if not found or v_res.status <> 'entregue' then
    raise exception 'Só pedidos entregues podem ser devolvidos.';
  end if;
  if p_caixas is null or p_caixas < 1 or p_caixas > v_res.caixas_entregues then
    raise exception 'Quantidade fora do total entregue (% cx).', v_res.caixas_entregues;
  end if;
  if not exists (select 1 from quadras where id = p_quadra_destino_id) then
    raise exception 'Quadra de destino não encontrada.';
  end if;

  perform 1 from lotes where id = v_res.lote_id for update;
  insert into lote_quadras (lote_id, quadra_id, caixas)
  values (v_res.lote_id, p_quadra_destino_id, p_caixas)
  on conflict (lote_id, quadra_id) do update set caixas = lote_quadras.caixas + excluded.caixas;

  insert into estornos (reserva_id, caixas, quadra_destino_id, motivo, registrado_por)
  values (v_res.id, p_caixas, p_quadra_destino_id, nullif(trim(coalesce(p_motivo, '')), ''), auth.uid());

  update reservas set status = 'estornado' where id = v_res.id;
end;
$$;

-- =====================================================================
-- Rede de seguranca do Q5: mesmo que alguma escrita escape das checagens,
-- a transacao so COMMITA se nenhum lote ficar com disponivel negativo.
-- (constraint triggers DEFERRED: validam no fim da transacao)
-- =====================================================================
create or replace function public.fn_check_disponivel_reserva()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if fn_disponivel_lote(new.lote_id) < 0 then
    raise exception 'Operação deixaria o lote com disponível negativo (Q5).';
  end if;
  return new;
end;
$$;
create constraint trigger trg_q5_reservas
  after insert or update on reservas
  deferrable initially deferred
  for each row execute function fn_check_disponivel_reserva();

create or replace function public.fn_check_disponivel_alocacao()
returns trigger language plpgsql
set search_path = public
as $$
declare
  v_lote_id uuid := coalesce(new.lote_id, old.lote_id);
begin
  if fn_disponivel_lote(v_lote_id) < 0 then
    raise exception 'Operação deixaria o lote com disponível negativo (Q5).';
  end if;
  return null;  -- retorno de trigger AFTER e ignorado
end;
$$;
create constraint trigger trg_q5_lote_quadras
  after insert or update or delete on lote_quadras
  deferrable initially deferred
  for each row execute function fn_check_disponivel_alocacao();

-- =====================================================================
-- Log automatico da GESTAO DE QUADRAS no historico (mock loga criar/
-- remover/alternar status/editar). Quadras sao escritas DIRETO por policy
-- (admin/gerente), entao o log vem por trigger — security definer para o
-- insert em movimentos passar (movimentos nao tem policy de escrita).
-- =====================================================================
create or replace function public.fn_log_quadra()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform fn_registrar_movimento('quadra', format('Quadra %s criada — %s', new.numero, new.descricao), null, null, null);
    return new;
  elsif tg_op = 'DELETE' then
    perform fn_registrar_movimento('quadra', format('%s removida do depósito', old.numero), null, null, null);
    return old;
  else
    if new.status is distinct from old.status then
      perform fn_registrar_movimento('quadra',
        format('%s marcada como %s — %s', new.numero, case when new.status = 'ocupado' then 'ocupada' else 'disponível' end, new.descricao),
        null, null, null);
    end if;
    if new.numero is distinct from old.numero or new.descricao is distinct from old.descricao then
      perform fn_registrar_movimento('quadra', format('Quadra %s atualizada para %s — %s', old.numero, new.numero, new.descricao), null, null, null);
    end if;
    return new;
  end if;
end;
$$;
create trigger trg_log_quadra
  after insert or update or delete on quadras
  for each row execute function fn_log_quadra();

-- =====================================================================
-- Permissao de execucao: helpers internos NAO sao chamaveis pelo client
-- (as RPCs security definer continuam podendo usa-los internamente)
-- =====================================================================
revoke execute on function public.fn_registrar_movimento(movimento_tipo, text, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.fn_exigir_papel(user_role[]) from public, anon, authenticated;
