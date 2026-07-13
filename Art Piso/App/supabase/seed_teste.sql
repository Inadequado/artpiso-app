-- =====================================================================
-- ART PISO — SEED DE TESTE (ambiente de teste, org free)
-- Colar e executar no SQL Editor do painel (roda como postgres).
-- NAO e migration: dados descartaveis para validar as telas; a producao
-- comeca limpa com a contagem oficial da planilha.
-- Pode rodar mais de uma vez sem duplicar (on conflict do nothing).
-- =====================================================================

-- 1) Promove o usuario criado no painel a ADMIN
update profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'artpiso@gmail.com');

-- 2) Quadras
insert into quadras (id, numero, descricao) values
  ('a0000000-0000-4000-8000-000000000001', 'Q-01', 'Corredor 1'),
  ('a0000000-0000-4000-8000-000000000002', 'Q-02', 'Corredor 2'),
  ('a0000000-0000-4000-8000-000000000003', 'Q-03', 'Corredor 3'),
  ('a0000000-0000-4000-8000-000000000005', 'Q-05', 'Fundo esquerdo'),
  ('a0000000-0000-4000-8000-000000000008', 'Q-08', 'Galpão anexo'),
  ('a0000000-0000-4000-8000-000000000011', 'Q-11', 'Galpão anexo — mezanino')
on conflict do nothing;

-- 3) Produtos
insert into produtos (id, nome, referencia, marca, tamanho_nominal, preco_m2, descricao) values
  ('b0000000-0000-4000-8000-000000000001', 'Porcelanato Cinza Concreto', 'POR-6060-CZ', 'Portinari', '60x60', 89.90, 'Acabamento acetinado, uso interno.'),
  ('b0000000-0000-4000-8000-000000000002', 'Piso Vinílico Carvalho', 'VIN-1220-CV', 'Durafloor', '122x18', 129.90, 'Clique, tráfego residencial alto.'),
  ('b0000000-0000-4000-8000-000000000003', 'Ladrilho Hidráulico Sage', null, 'Ladrilar', '20x20', 159.00, null)
on conflict do nothing;

-- 4) Lotes + alocacoes (inclui um lote MULTI-QUADRA para exercitar o Q1)
insert into lotes (id, produto_id, codigo, bitola, tonalidade, m2_por_caixa, pecas_por_caixa) values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'L-2405', '9,5', 'T-04', 2.16, 4),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'L-3011', '9,5', 'T-05', 2.16, 4),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'L-2410', null, null, 3.90, 10),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 'L-2201', null, 'Clara', 1.00, 25)
on conflict do nothing;

insert into lote_quadras (lote_id, quadra_id, caixas) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 40),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 25),
  -- L-2410 em DUAS quadras (30 + 15):
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000008', 30),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000011', 15),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005', 60)
on conflict do nothing;

-- 5) Clientes (documentos com digito verificador valido)
insert into clientes (id, nome, documento, telefone) values
  ('d0000000-0000-4000-8000-000000000001', 'Construtora Horizonte', '11.222.333/0001-81', '(11) 98888-0001'),
  ('d0000000-0000-4000-8000-000000000002', 'Marcos Paulo Andrade', '390.533.447-05', '(11) 97777-0002')
on conflict do nothing;

insert into cliente_enderecos (id, cliente_id, apelido, endereco) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Obra Centro', 'Rua das Acácias, 120 — Centro'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Obra Norte', 'Av. Brasil, 4500 — Vila Norte')
on conflict do nothing;

-- Confere: deve listar 4 lotes com estoque e o L-2410 com 2 alocacoes
select lote, nome, caixas_estoque, caixas_disponivel, alocacoes from vw_estoque order by nome;
