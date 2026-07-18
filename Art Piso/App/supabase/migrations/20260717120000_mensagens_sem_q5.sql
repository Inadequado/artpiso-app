-- ART PISO — Tira os codigos internos de regra ("Q5") das mensagens de erro
-- que chegam ao usuario pelo sino (achado do roteiro de teste, bloco 11).
-- Recria as funcoes afetadas identicas, mudando SO o texto das exceptions.
-- ATENCAO: fn_criar_pedido e fn_editar_pedido aqui devem ser a versao VIGENTE
-- (extraidas mecanicamente de 20260712090300_rpcs.sql, unica definicao delas).

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
      raise exception 'Reserva acima do disponível do lote %.', v_lote.codigo;
    end if;
    insert into reservas (pedido_id, lote_id, caixas_saldo, caixas_travadas, regime)
    values (v_pedido_id, v_lote.id, v_caixas, v_travadas, v_regime);
  end loop;

  return v_pedido_id;
end;
$$;

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
        raise exception 'Aumento acima do disponível do lote.';
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
        raise exception 'Reserva acima do disponível do lote %.', v_lote.codigo;
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

create or replace function public.fn_check_disponivel_reserva()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if fn_disponivel_lote(new.lote_id) < 0 then
    raise exception 'Operação deixaria o lote com disponível negativo.';
  end if;
  return new;
end;
$$;

create or replace function public.fn_check_disponivel_alocacao()
returns trigger language plpgsql
set search_path = public
as $$
declare
  v_lote_id uuid := coalesce(new.lote_id, old.lote_id);
begin
  if fn_disponivel_lote(v_lote_id) < 0 then
    raise exception 'Operação deixaria o lote com disponível negativo.';
  end if;
  return null;  -- retorno de trigger AFTER e ignorado
end;
$$;
