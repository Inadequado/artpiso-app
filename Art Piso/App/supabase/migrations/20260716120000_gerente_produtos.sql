-- =====================================================================
-- ART PISO 0.0.2 — Gerente passa a GERENCIAR PRODUTOS (criar + editar)
-- Decisao do usuario (2026-07-16): o cliente precisa que o gerente crie e
-- edite produtos. EXCLUIR produto SEGUE admin-only. A unica area restrita
-- ao gerente agora e a secao Configuracoes (usuarios/quadras/parametros).
-- Substitui a matriz antiga (produtos = admin-only).
-- =====================================================================

-- produtos: insert + update para admin e gerente; delete continua admin.
drop policy if exists produtos_write on produtos;

create policy produtos_insert on produtos for insert
  with check (auth_role() in ('admin', 'gerente'));

create policy produtos_update on produtos for update
  using (auth_role() in ('admin', 'gerente'))
  with check (auth_role() in ('admin', 'gerente'));

create policy produtos_delete on produtos for delete
  using (auth_role() = 'admin');

-- Aplicar m2/pecas em massa ao editar produto: agora admin e gerente
-- (senao editar as medidas quebraria pro gerente). Resto identico.
create or replace function public.fn_atualizar_medidas_produto(
  p_produto_id uuid, p_m2_por_caixa numeric, p_pecas_por_caixa int
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_exigir_papel('admin', 'gerente');
  if p_m2_por_caixa is null or p_m2_por_caixa <= 0 then raise exception 'm² por caixa inválido.'; end if;
  if p_pecas_por_caixa is null or p_pecas_por_caixa < 1 then raise exception 'Peças por caixa inválido.'; end if;
  update lotes
     set m2_por_caixa = p_m2_por_caixa,
         pecas_por_caixa = p_pecas_por_caixa
   where produto_id = p_produto_id;
  if not found then raise exception 'Produto sem lotes (nada a atualizar).'; end if;
end;
$$;
