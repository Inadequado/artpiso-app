-- ART PISO — Excluir produto/lote/cliente: cancelada NAO trava (decisao do
-- usuario, 2026-07-21, apos achado do roteiro de teste).
--
-- Contexto: as FKs do banco sao ON DELETE RESTRICT, entao uma reserva CANCELADA
-- (que aponta pro lote / pedido) impedia excluir o produto ou o cliente, vazando
-- ate a mensagem crua do Postgres. A regra combinada e mais suave: so trava o que
-- e historico REAL — reserva ativa (reservado/parcial) ou entregue/estornada.
-- Se o unico vinculo forem reservas CANCELADAS, elas sao descartadas junto com a
-- entidade (e os pedidos que ficarem vazios). Movimentos de ajuste ficam
-- preservados (FK deles e ON DELETE SET NULL).
--
-- "nao-cancelada" = status <> 'cancelado' (cobre reservado/parcial/entregue/estornado).

-- ---------------------------------------------------------------------
-- fn_remover_produto (admin): so admin exclui produto.
-- ---------------------------------------------------------------------
create or replace function public.fn_remover_produto(p_produto_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_pedidos uuid[];
begin
  perform fn_exigir_papel('admin');
  if exists (
    select 1 from reservas r join lotes l on l.id = r.lote_id
    where l.produto_id = p_produto_id and r.status <> 'cancelado'
  ) then
    raise exception 'Produto tem reserva ativa ou entrega registrada. Cancele as ativas antes de excluir (o histórico de entregas fica com o produto).';
  end if;

  -- So restam reservas CANCELADAS nos lotes do produto: guarda os pedidos tocados,
  -- apaga as reservas e depois os pedidos que ficarem sem nenhuma linha.
  select array_agg(distinct r.pedido_id) into v_pedidos
    from reservas r join lotes l on l.id = r.lote_id
   where l.produto_id = p_produto_id;

  delete from reservas r using lotes l
   where r.lote_id = l.id and l.produto_id = p_produto_id;

  if v_pedidos is not null then
    delete from pedidos p
     where p.id = any(v_pedidos)
       and not exists (select 1 from reservas r where r.pedido_id = p.id);
  end if;

  delete from lotes where produto_id = p_produto_id;
  delete from produtos where id = p_produto_id;
  if not found then raise exception 'Produto não encontrado.'; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- fn_remover_lote (admin/gerente): mesma trava + guarda de ULTIMO lote.
-- ---------------------------------------------------------------------
create or replace function public.fn_remover_lote(p_lote_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_produto_id uuid;
  v_pedidos uuid[];
begin
  perform fn_exigir_papel('admin', 'gerente');
  select produto_id into v_produto_id from lotes where id = p_lote_id;
  if v_produto_id is null then raise exception 'Lote não encontrado.'; end if;
  if exists (select 1 from reservas where lote_id = p_lote_id and status <> 'cancelado') then
    raise exception 'Lote tem reserva ativa ou entrega registrada. Cancele as ativas antes de excluir.';
  end if;
  -- Ultimo lote do produto: remover = excluir o produto, e isso e so do admin.
  if not exists (select 1 from lotes where produto_id = v_produto_id and id <> p_lote_id) then
    raise exception 'Único lote do produto. Para removê-lo, use Excluir produto (administrador).';
  end if;

  -- Descarta as reservas canceladas do lote (senao a FK RESTRICT barra o delete)
  -- e limpa os pedidos que ficarem vazios.
  select array_agg(distinct pedido_id) into v_pedidos from reservas where lote_id = p_lote_id;
  delete from reservas where lote_id = p_lote_id;
  if v_pedidos is not null then
    delete from pedidos p
     where p.id = any(v_pedidos)
       and not exists (select 1 from reservas r where r.pedido_id = p.id);
  end if;

  delete from lotes where id = p_lote_id;  -- lote_quadras cai em cascata
end;
$$;

-- ---------------------------------------------------------------------
-- fn_remover_cliente (NOVO, admin/gerente): antes o app deletava direto e a FK
-- de pedidos barrava qualquer cliente com historico (inclusive cancelado).
-- ---------------------------------------------------------------------
create or replace function public.fn_remover_cliente(p_cliente_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_exigir_papel('admin', 'gerente');
  if not exists (select 1 from clientes where id = p_cliente_id) then
    raise exception 'Cliente não encontrado.';
  end if;
  if exists (
    select 1 from reservas r join pedidos pe on pe.id = r.pedido_id
    where pe.cliente_id = p_cliente_id and r.status <> 'cancelado'
  ) then
    raise exception 'Cliente tem reserva ativa ou entrega registrada — não pode ser excluído (o histórico de vendas fica com ele).';
  end if;

  -- So restam reservas CANCELADAS: apaga reservas -> pedidos -> cliente.
  delete from reservas r using pedidos pe
   where r.pedido_id = pe.id and pe.cliente_id = p_cliente_id;
  delete from pedidos where cliente_id = p_cliente_id;
  delete from clientes where id = p_cliente_id;  -- cliente_enderecos cai em cascata
end;
$$;
