-- ART PISO — Fecha o furo do gerente: remover o ULTIMO lote de um produto
-- equivalia a excluir o produto (que e acao SO de admin, fn_remover_produto).
-- Regra: todo produto tem >= 1 lote; o produto inteiro so sai pelo caminho proprio.
-- (Achado do roteiro de teste 2026-07-17, bloco 9.)

create or replace function public.fn_remover_lote(p_lote_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_produto_id uuid;
begin
  perform fn_exigir_papel('admin', 'gerente');
  select produto_id into v_produto_id from lotes where id = p_lote_id;
  if v_produto_id is null then raise exception 'Lote não encontrado.'; end if;
  if exists (select 1 from reservas where lote_id = p_lote_id and status in ('reservado', 'parcial')) then
    raise exception 'Lote tem reserva ativa. Cancele ou entregue antes de excluir.';
  end if;
  -- Ultimo lote do produto: remover = excluir o produto, e isso e so do admin.
  if not exists (select 1 from lotes where produto_id = v_produto_id and id <> p_lote_id) then
    raise exception 'Único lote do produto. Para removê-lo, use Excluir produto (administrador).';
  end if;
  delete from lotes where id = p_lote_id;  -- lote_quadras cai em cascata
end;
$$;
