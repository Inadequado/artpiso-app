-- ART PISO — Quadra por deposito (decisao do usuario, 2026-07-26)
-- Sao 3 depositos (A/B/C, e no futuro D/E...), e cada um numera as quadras 1..30
-- — entao "Q-1" se repete entre depositos. Mas o `numero` e a CHAVE que resolve
-- a quadra em TODO o app (quadraIdPorNumero: cadastro de lote, entrada, perda,
-- descarte, mover de quadra, correcao, entrega). Pra manter essa chave UNICA sem
-- refatorar toda a resolucao-por-id (arriscado em producao), o deposito entra
-- DENTRO do numero:
--   numero    = "Q-1 B"  (numero + deposito; e a chave unica)
--   descricao = "B"      (deposito "limpo"; ordena/agrupa e edita redondo)
-- As alocacoes ligam por id (lote_quadras.quadra_id -> quadras.id), entao mudar
-- o TEXTO do numero NAO desvincula nenhum estoque.
--
-- Bake dos existentes: hoje numero="Q-<n>", descricao=<deposito>. Junta os dois.
-- Q-00 (Local pendente) fica de fora — e o balde sem deposito definido.
-- O guard evita re-bakear se rodar de novo. O indice unico segue em (numero):
-- "Q-1 B" <> "Q-1 A", e "Q-1 B" duplicado continua barrado.

update quadras
   set numero = trim(numero) || ' ' || trim(descricao)
 where id <> '00000000-0000-4000-8000-000000000000'
   and right(trim(numero), length(trim(descricao)) + 1) is distinct from ' ' || trim(descricao);
