-- ART PISO - RESET DO BANCO DE TESTE
-- Zera os DADOS para comecar uma rodada de testes limpa. NAO toca no schema
-- (tabelas, funcoes, RLS, triggers, cron) nem nos parametros de configuracao.
--
-- COMO USAR: Supabase -> SQL Editor -> colar -> Run. CONFIRA que esta no
-- projeto de TESTE antes de rodar. E IRREVERSIVEL.
--
-- Escopo (decisao do usuario, 2026-07-17):
--   ZERA  -> todos os dados de negocio + as quadras
--   MANTEM -> parametros (config) e apenas o(s) usuario(s) admin (login + profile)
-- =====================================================================

-- PREVIEW (opcional): rode so este SELECT antes, pra ver quem fica/sai.
-- select u.email, p.role as papel,
--        case when p.role = 'admin' then 'MANTEM' else 'REMOVE' end as acao
-- from auth.users u
-- left join profiles p on p.id = u.id
-- order by acao;

begin;

-- 1) Zera TODOS os dados de negocio + as quadras (parametros fica intacto).
truncate table
  produtos, lotes, lote_quadras,
  clientes, cliente_enderecos,
  pedidos, reservas, entregas, entrega_quadras, estornos,
  movimentos,
  notificacoes, notificacao_leitura,
  produto_alertas, encomenda_alertas,
  quadras
restart identity cascade;

-- 2) Remove os usuarios de login que NAO sao admin.
--    O FK profiles.id -> auth.users(id) ON DELETE CASCADE limpa o profile junto.
--    O trigger trg_protege_admin so dispara em insert/update, nao em delete.
delete from auth.users
where id not in (select id from profiles where role = 'admin');

commit;

-- Depois de rodar: entre como admin e cadastre as QUADRAS antes dos produtos
-- (um lote precisa de uma quadra para ser alocado).
