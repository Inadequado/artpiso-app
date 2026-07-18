-- =====================================================================
-- ART PISO — Fix do cadastro de produto+lote (bug do reteste R-4, 2026-07-17)
--
-- Dois problemas encadeados:
--  1. A migration 20260717110000 mudou a checagem das RPCs para "codigo de
--     lote unico POR PRODUTO", mas ESQUECEU o indice global lotes_codigo_unico
--     da base — o insert continuava estourando "duplicate key" p/ codigo
--     repetido entre produtos/marcas diferentes (cadastro legitimo).
--  2. O cadastro de produto novo era 2 operacoes separadas no client
--     (insert em produtos + rpc fn_criar_lote): a 1a commitava, a 2a falhava
--     -> produto ORFAO no banco (sem lote), invisivel no Estoque (vw_estoque
--     parte de lotes) e travando o nome p/ sempre (produtos_nome_unico).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Indice passa a refletir a regra decidida: unico POR PRODUTO.
-- ---------------------------------------------------------------------
drop index if exists lotes_codigo_unico;
create unique index lotes_codigo_unico_por_produto
  on lotes (produto_id, chave_referencia(codigo));

-- ---------------------------------------------------------------------
-- 2. Limpeza dos produtos orfaos deixados pelo fluxo nao-atomico
--    (produto sem NENHUM lote e estado invalido: todo produto tem >= 1 lote).
--    Fotos que subiram pro Storage junto tambem saem (best-effort).
-- ---------------------------------------------------------------------
do $$
begin
  delete from storage.objects
   where bucket_id = 'produtos'
     and (storage.foldername(name))[1] in (
       select p.id::text from produtos p
        where not exists (select 1 from lotes l where l.produto_id = p.id)
     );
exception when others then
  null;  -- limpeza de foto e best-effort; nao pode derrubar a migration
end $$;

delete from produtos p
 where not exists (select 1 from lotes l where l.produto_id = p.id);

-- ---------------------------------------------------------------------
-- 3. Cadastro ATOMICO: produto + lote + alocacao numa transacao so.
--    Falhou qualquer parte (ex.: codigo de lote duplicado no produto),
--    nada fica pela metade. Reusa fn_criar_lote (mesma transacao).
--    Checagens de nome/referencia duplicados dao mensagem limpa (a UI ja
--    bloqueia; aqui e o backstop no lugar do "duplicate key" cru no sino).
-- ---------------------------------------------------------------------
create or replace function public.fn_criar_produto_com_lote(
  p_produto_id uuid, p_nome text, p_referencia text, p_marca text,
  p_tamanho text, p_descricao text, p_preco_m2 numeric,
  p_limite_estoque_baixo int, p_foto text,
  p_codigo text, p_bitola text, p_tonalidade text,
  p_m2_por_caixa numeric, p_pecas_por_caixa int, p_caixas int, p_quadra_id uuid
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_produto_id uuid := coalesce(p_produto_id, gen_random_uuid());
begin
  perform fn_exigir_papel('admin', 'gerente');
  if exists (select 1 from produtos where chave_nome(nome) = chave_nome(p_nome)) then
    raise exception 'Já existe um produto com o nome "%".', trim(p_nome);
  end if;
  if nullif(trim(coalesce(p_referencia, '')), '') is not null and exists (
    select 1 from produtos
     where referencia is not null
       and chave_referencia(referencia) = chave_referencia(p_referencia)
  ) then
    raise exception 'Referência "%" já usada por outro produto.', trim(p_referencia);
  end if;
  insert into produtos (id, nome, referencia, marca, tamanho_nominal, descricao,
                        preco_m2, limite_estoque_baixo_cx, foto)
  values (
    v_produto_id,
    trim(p_nome),
    nullif(trim(coalesce(p_referencia, '')), ''),
    trim(p_marca),
    nullif(trim(coalesce(p_tamanho, '')), ''),
    nullif(trim(coalesce(p_descricao, '')), ''),
    p_preco_m2,
    coalesce(p_limite_estoque_baixo, 10),
    nullif(trim(coalesce(p_foto, '')), '')
  );
  perform fn_criar_lote(v_produto_id, p_codigo, p_bitola, p_tonalidade,
                        p_m2_por_caixa, p_pecas_por_caixa, p_caixas, p_quadra_id);
  return v_produto_id;
end;
$$;
