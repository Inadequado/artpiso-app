-- =====================================================================
-- ART PISO 0.0.2 — Realtime geral + edicao em massa de medidas
-- (etapa 4 do fechamento do modo Supabase; foto no Storage ADIADA
--  por decisao do usuario 2026-07-15 — prioridade futura)
--  - Todas as tabelas operacionais entram na publication do Realtime:
--    mudanca feita em um aparelho aparece nos outros SEM F5
--  - fn_atualizar_medidas_produto: m2/caixa e pecas/caixa sao POR LOTE
--    no banco; a edicao pelo produto aplica em todos os lotes dele
-- =====================================================================

-- (notificacoes ja esta na publication desde a migration de notificacoes)
alter publication supabase_realtime add table
  produtos, lotes, lote_quadras, quadras,
  clientes, cliente_enderecos,
  pedidos, reservas, entregas, entrega_quadras, estornos,
  movimentos, profiles, parametros;

-- Edicao em massa das medidas do produto (catalogo e do ADMIN na matriz).
-- O mock trata m2/caixa e pecas/caixa como atributo de produto (iguais em
-- todos os lotes); no banco vivem no lote — esta RPC alinha os dois mundos.
create or replace function public.fn_atualizar_medidas_produto(
  p_produto_id uuid, p_m2_por_caixa numeric, p_pecas_por_caixa int
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_exigir_papel('admin');
  if p_m2_por_caixa is null or p_m2_por_caixa <= 0 then raise exception 'm² por caixa inválido.'; end if;
  if p_pecas_por_caixa is null or p_pecas_por_caixa < 1 then raise exception 'Peças por caixa inválido.'; end if;
  update lotes
     set m2_por_caixa = p_m2_por_caixa,
         pecas_por_caixa = p_pecas_por_caixa
   where produto_id = p_produto_id;
  if not found then raise exception 'Produto sem lotes (nada a atualizar).'; end if;
end;
$$;
