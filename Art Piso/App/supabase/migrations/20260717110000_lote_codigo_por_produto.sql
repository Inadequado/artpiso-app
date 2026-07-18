-- ART PISO — Codigo de lote unico POR PRODUTO, nao mais global
-- (decisao do usuario, 2026-07-17, achado do roteiro de teste bloco 3):
-- fabricantes diferentes podem usar o mesmo codigo de lote — bloquear
-- globalmente impedia cadastros legitimos de produtos/marcas distintos.
-- Dentro do MESMO produto a regra continua: remessa nova = Adicionar estoque;
-- specs diferentes = sufixo (ex.: L-2405-B).

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
  if exists (
    select 1 from lotes
    where produto_id = p_produto_id and chave_referencia(codigo) = chave_referencia(p_codigo)
  ) then
    raise exception 'Código de lote já usado neste produto. Remessa nova do mesmo lote = Adicionar estoque; specs diferentes = sufixo (ex.: %-B).', trim(p_codigo);
  end if;
  insert into lotes (produto_id, codigo, bitola, tonalidade, m2_por_caixa, pecas_por_caixa)
  values (p_produto_id, trim(p_codigo), nullif(trim(coalesce(p_bitola, '')), ''), nullif(trim(coalesce(p_tonalidade, '')), ''), p_m2_por_caixa, p_pecas_por_caixa)
  returning id into v_lote_id;
  insert into lote_quadras (lote_id, quadra_id, caixas) values (v_lote_id, p_quadra_id, p_caixas);
  return v_lote_id;
end;
$$;

create or replace function public.fn_atualizar_lote(
  p_lote_id uuid, p_codigo text, p_bitola text, p_tonalidade text
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_exigir_papel('admin', 'gerente');
  if exists (
    select 1 from lotes
    where produto_id = (select produto_id from lotes where id = p_lote_id)
      and chave_referencia(codigo) = chave_referencia(p_codigo)
      and id <> p_lote_id
  ) then
    raise exception 'Código de lote já usado por outro lote deste produto.';
  end if;
  update lotes
     set codigo = trim(p_codigo),
         bitola = nullif(trim(coalesce(p_bitola, '')), ''),
         tonalidade = nullif(trim(coalesce(p_tonalidade, '')), '')
   where id = p_lote_id;
  if not found then raise exception 'Lote não encontrado.'; end if;
end;
$$;
