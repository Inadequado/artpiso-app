-- ART PISO — Quadra padrao "Q-00" (decisao do usuario, 2026-07-17)
-- A LOJA as vezes cadastra um produto sem saber ainda em qual quadra fisica
-- ele vai ficar — quem decide isso de verdade e o GERENTE DO DEPOSITO. Em vez
-- de forcar uma quadra real "chutada" (que ficaria errada no chao), existe
-- uma quadra FIXA de espera: Q-00 · "Local pendente". O deposito move o lote
-- pra quadra certa depois (Ajustes -> Mover de quadra), como qualquer outra
-- realocacao — nenhuma tela precisa mudar, ela so aparece no seletor.
--
-- PERMANENTE: existe em todo ambiente (teste e producao). Sobrevive ao
-- reset_teste.sql (que a recria logo apos truncar quadras — ver o arquivo).
insert into quadras (id, numero, descricao)
values ('00000000-0000-4000-8000-000000000000', 'Q-00', 'Local pendente')
on conflict (id) do nothing;
