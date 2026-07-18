-- =====================================================================
-- ART PISO — SEED DE TESTE (ambiente de teste, org free)
-- Colar e executar no SQL Editor do painel (roda como postgres).
-- NAO e migration: dados descartaveis para validar as telas e tirar os
-- PRINTS do guia de uso; a producao comeca limpa (cadastro manual).
-- Pode rodar mais de uma vez sem duplicar (on conflict / valores absolutos).
--
-- ORDEM RECOMENDADA: rodar reset_teste.sql ANTES. O seed assume banco sem
-- dados: se ja existirem quadras/produtos com os MESMOS nomes (de testes
-- manuais), os inserts-pai sao pulados e os de lote/alocacao falham por FK.
--
-- Estados cobertos de proposito (para os selos e drawers do guia):
--   verde (disponivel) · laranja (estoque baixo por limite POR PRODUTO)
--   vermelho (esgotado) · lote multi-quadra · perda acumulada (p/ Descartar)
--
-- O que o seed NAO cobre (fazer PELO APP antes dos prints — gera dados
-- autenticos e os avisos do sino):
--   - fotos dos produtos (Editar produto -> upload ou link do catalogo)
--   - reservas/pedidos, entregas e devolucoes
--   - usuarios gerente/vendedor (Configuracoes -> Adicionar usuario)
-- =====================================================================

-- 1) Promove o usuario criado no painel a ADMIN
update profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'artpiso@gmail.com');

-- 2) Quadras
insert into quadras (id, numero, descricao) values
  ('a0000000-0000-4000-8000-000000000001', 'Q-1', 'Corredor 1'),
  ('a0000000-0000-4000-8000-000000000002', 'Q-2', 'Corredor 2'),
  ('a0000000-0000-4000-8000-000000000003', 'Q-3', 'Corredor 3'),
  ('a0000000-0000-4000-8000-000000000005', 'Q-5', 'Fundo esquerdo'),
  ('a0000000-0000-4000-8000-000000000008', 'Q-8', 'Galpão anexo'),
  ('a0000000-0000-4000-8000-000000000011', 'Q-11', 'Galpão anexo — mezanino')
on conflict do nothing;

-- 3) Produtos (nomes em MAIUSCULAS = como a UI salva; limite de estoque
--    baixo POR PRODUTO variado de proposito: 50 = giro alto, 3 = raro)
insert into produtos (id, nome, referencia, marca, tamanho_nominal, preco_m2, limite_estoque_baixo_cx, descricao) values
  ('b0000000-0000-4000-8000-000000000001', 'PORCELANATO CINZA CONCRETO', 'POR-6060-CZ', 'Portinari', '60x60',   89.90, 10, 'Acabamento acetinado, uso interno.'),
  ('b0000000-0000-4000-8000-000000000002', 'PISO VINÍLICO CARVALHO',     'VIN-1220-CV', 'Durafloor', '122x18', 129.90, 10, 'Clique, tráfego residencial alto.'),
  ('b0000000-0000-4000-8000-000000000003', 'LADRILHO HIDRÁULICO SAGE',   null,          'Ladrilar',  '20x20',  159.00,  3, null),
  ('b0000000-0000-4000-8000-000000000004', 'PORCELANATO BRANCO POLIDO',  'POR-8383-BR', 'Eliane',    '83,2x83', 119.90, 50, 'Polido de alto brilho, retificado.'),
  ('b0000000-0000-4000-8000-000000000005', 'PORCELANATO CARRARA',        'POR-8080-CA', 'Incepa',    '80x80',  149.90, 10, 'Mármore carrara, acabamento polido.'),
  ('b0000000-0000-4000-8000-000000000006', 'PISO LAMINADO NOGUEIRA',     'LAM-1291-NG', 'Quick-Step','129x19',  99.90, 10, 'Encaixe click, resistente a risco.'),
  ('b0000000-0000-4000-8000-000000000007', 'AZULEJO SUBWAY BRANCO',      'AZU-1020-BR', 'Roca',      '10x20',   79.90, 10, 'Brilhante, parede de cozinha e banho.')
on conflict do nothing;

-- 4) Lotes (bitola/tonalidade preenchidas = agora obrigatorias na UI)
insert into lotes (id, produto_id, codigo, bitola, tonalidade, m2_por_caixa, pecas_por_caixa) values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'L-2405', '9,5', 'T-04', 2.16,  4),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'L-3011', '9,5', 'T-05', 2.16,  4),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'L-2410', '4',   '2',    3.90, 10),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 'L-2201', '2',   '3',    1.00, 25),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000004', 'L-4102', '10',  'A2',   2.07,  3),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000005', 'L-3305', '10',  'A3',   1.92,  3),
  ('c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000006', 'L-1904', '8',   '1',    2.45, 10),
  -- AZULEJO SUBWAY: lote SEM alocacao = produto ESGOTADO (selo vermelho)
  ('c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000007', 'L-0907', '6',   '2',    1.20, 40)
on conflict do nothing;

insert into lote_quadras (lote_id, quadra_id, caixas) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 40),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 25),
  -- L-2410 em DUAS quadras (30 + 15): exercita o multi-quadra (Q1/M3)
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000008', 30),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000011', 15),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005', 60),
  -- BRANCO POLIDO: 12 cx com limite 50 = ESTOQUE BAIXO (selo laranja + sino)
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 12),
  ('c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 35),
  ('c0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000008', 26)
on conflict do nothing;

-- 5) Perda acumulada no CARRARA (4 cx): habilita o print do "Descartar
--    caixas perdidas" e do historico de perdas no detalhe do produto.
--    (Valor ABSOLUTO: rodar de novo nao acumula.)
update lotes set caixas_perda = 4, pisos_danificados = 7
 where id = 'c0000000-0000-4000-8000-000000000006';

insert into movimentos (id, tipo, detalhe, observacao, lote_id, produto_id) values
  ('f0000000-0000-4000-8000-000000000001', 'perda', '4 cx em L-3305 · Q-2 · 7 pisos danificados',
   'Caixas caíram da empilhadeira durante a descarga.',
   'c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000005')
on conflict do nothing;

-- 6) Clientes (documentos com digito verificador valido)
insert into clientes (id, nome, documento, telefone) values
  ('d0000000-0000-4000-8000-000000000001', 'Construtora Horizonte', '11.222.333/0001-81', '(11) 98888-0001'),
  ('d0000000-0000-4000-8000-000000000002', 'Marcos Paulo Andrade', '390.533.447-05', '(11) 97777-0002')
on conflict do nothing;

insert into cliente_enderecos (id, cliente_id, apelido, endereco) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Obra Centro', 'Rua das Acácias, 120 — Centro'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Obra Norte', 'Av. Brasil, 4500 — Vila Norte')
on conflict do nothing;

-- Confere: 8 lotes; CARRARA com 4 cx de perda; BRANCO POLIDO baixo (12 < 50);
-- SUBWAY esgotado (0 cx); L-2410 com 2 alocacoes
select lote, nome, caixas_estoque, caixas_disponivel, caixas_perda, alocacoes
  from vw_estoque order by nome, lote;
