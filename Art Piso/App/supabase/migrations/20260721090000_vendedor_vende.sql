-- ART PISO — Vendedor passa a VENDER (decisao do usuario, 2026-07-21)
-- Ate aqui o vendedor era leitura pura. O cliente pediu que ele possa CRIAR
-- clientes e CRIAR reservas (o balcao da loja opera no tablet compartilhado).
-- Escopo estrito: SO criar. Editar/excluir cliente e todo o ciclo da reserva
-- (editar, cancelar, entregar, devolver) continuam admin/gerente.
--
-- Enforcement real vive aqui (banco); a UI so espelha (ver sessao.ts/AppShell).

-- ---------------------------------------------------------------------
-- 1) clientes: quebra o "for all" em insert (inclui vendedor) x update/delete
--    (segue admin/gerente). Assim o vendedor cria, mas nao mexe depois.
-- ---------------------------------------------------------------------
drop policy clientes_write on clientes;
create policy clientes_insert on clientes for insert
  with check (auth_role() in ('admin', 'gerente', 'vendedor'));
create policy clientes_update on clientes for update
  using (auth_role() in ('admin', 'gerente'))
  with check (auth_role() in ('admin', 'gerente'));
create policy clientes_delete on clientes for delete
  using (auth_role() in ('admin', 'gerente'));

-- ---------------------------------------------------------------------
-- 2) cliente_enderecos: mesmo split — cadastrar um cliente novo insere o
--    endereco junto. Edicao de endereco (delete+insert) segue admin/gerente.
-- ---------------------------------------------------------------------
drop policy cliente_enderecos_write on cliente_enderecos;
create policy cliente_enderecos_insert on cliente_enderecos for insert
  with check (auth_role() in ('admin', 'gerente', 'vendedor'));
create policy cliente_enderecos_update on cliente_enderecos for update
  using (auth_role() in ('admin', 'gerente'))
  with check (auth_role() in ('admin', 'gerente'));
create policy cliente_enderecos_delete on cliente_enderecos for delete
  using (auth_role() in ('admin', 'gerente'));

-- ---------------------------------------------------------------------
-- 3) fn_criar_pedido: corpo VIGENTE (copiado verbatim de
--    20260717120000_mensagens_sem_q5.sql), mudando SO o guard para incluir
--    'vendedor'. Editar/cancelar/entregar/devolver NAO mudam.
-- ---------------------------------------------------------------------
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
  perform fn_exigir_papel('admin', 'gerente', 'vendedor');
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

-- ---------------------------------------------------------------------
-- 4) fn_notificar_cliente: inclui 'vendedor' no guard. Sem isso, a reserva
--    do vendedor commita mas o sino "Reserva criada" nao dispara — e e
--    justamente esse aviso que mostra ao DEPOSITO que a LOJA reservou.
--    Corpo identico ao de 20260714090000_notificacoes.sql, so o guard muda.
-- ---------------------------------------------------------------------
create or replace function public.fn_notificar_cliente(
  p_tipo text, p_titulo text, p_descricao text, p_silencioso boolean default false
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_exigir_papel('admin', 'gerente', 'vendedor');
  perform fn_notificar(p_tipo::notificacao_tipo, p_titulo, p_descricao, p_silencioso);
end;
$$;
