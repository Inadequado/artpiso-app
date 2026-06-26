# CLAUDE.md

Guia operacional do projeto Art Piso para agentes de IA.

Este arquivo e o cerebro/roteador do ambiente. Ele define como trabalhar, quais documentos consultar, quais principios respeitar e quando usar as skills. Ele nao deve virar historico detalhado; historico, estado atual, decisoes e aprendizados ficam em `Memoria.md`.

## 1. Antes de trabalhar

Consultar nesta ordem:

1. `Memoria.md`
2. `Art Piso/Handoff/art_piso_0_0_1_handoff.md`
3. `Art Piso/Handoff/art_piso_0_0_1_schema.sql`, quando o assunto envolver banco, colunas, permissoes ou calculos
4. `Art Piso/Google Switch/`, quando o assunto envolver referencias visuais geradas pelo Stitch
5. `.claude/skills/`, quando o assunto envolver stack, UI, revisao, debug, plano ou implementacao

Se algum caminho mudar, atualizar este arquivo e `Memoria.md`.

## 2. Regra de colaboracao critica

As falas do usuario sao pensamento humano em construcao, nao verdades intocaveis.

O agente deve:

- ser critico com respeito;
- apontar riscos e incoerencias;
- sugerir alternativas melhores;
- complementar ideias incompletas;
- questionar decisoes quando houver impacto importante;
- reformular propostas para chegar a uma versao mais forte.

O objetivo e construir a melhor versao possivel do projeto, nao apenas obedecer literalmente.

## 3. Estado de postura do projeto

O projeto esta em fase de estruturacao e lapidacao.

Ainda nao ha app final implementado. As telas do Stitch sao referencia visual, nao design final aprovado.

Evitar:

- criar HTML unico gigante;
- copiar o Stitch sem corrigir incoerencias;
- implementar antes de decidir estrutura minima;
- transformar cada coluna do banco em coluna visual;
- duplicar documentos com a mesma funcao.

## 4. Principios do produto

Art Piso e um sistema operacional de controle de estoque para loja/deposito de pisos.

Principios:

- Backend guarda dados completos e faz calculos sempre que possivel.
- Frontend mostra informacao enxuta, clara e orientada a decisao.
- Caixas sao a fonte da verdade.
- m2 e sempre derivado de caixas x `m2_por_caixa`.
- Produto + Lote define a unidade real de estoque.
- Reserva e disponivel nao devem ser digitados manualmente.
- Disponivel = Estoque - Reserva - Perda.
- Permissoes criticas devem ser reforcadas no banco, nao apenas escondidas no frontend.

## 5. Papeis do sistema

Usar estes papeis como referencia ate decisao contraria:

- `admin`: gerencia usuarios, produtos, lotes, reservas e configuracoes.
- `vendedor`: consulta estoque, cria reservas e cancela reservas permitidas.
- `gerente`: da entrada de estoque, registra perda, gerencia quadras e marca entregas.

Nao trocar por `operador`, `conferente`, `diretor` ou outros nomes sem decisao explicita.

## 6. Direcao de frontend

O frontend deve ser uma ferramenta de trabalho, nao uma landing page.

Prioridades visuais:

- Estoque como tela principal.
- Reservas como segundo fluxo central.
- Produtos e Lotes para cadastro/manutencao.
- Ajustes para entrada, perda, correcao e mudanca de quadra.
- Configuracoes para usuarios, papeis e quadras.

Regras:

- Mostrar caixas como valor primario; m2 como apoio.
- Usar detalhes sob demanda para informacoes tecnicas.
- Preferir drawers/sheets/modais para criar reserva, confirmar entrega e detalhe de lote.
- Usar linguagem clara: `Marcar entregue`, `Criar reserva`, `Registrar perda`, `Adicionar estoque`.
- Evitar botoes ambiguos como apenas `Confirmar`.

## 7. Stack recomendada neste momento

Direcao atual:

- React 19
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- dados mockados inicialmente
- Supabase depois, quando a UI estiver lapidada

Next.js nao esta descartado, mas so deve entrar por decisao explicita de arquitetura/deploy. A existencia da skill `next-best-practices` nao deve empurrar o projeto para Next automaticamente.

## 8. Uso das skills

Skills disponiveis em `.claude/skills/`:

- `find-skills`: buscar novas skills quando houver lacuna real.
- `superpowers`: brainstorm, planos, execucao, TDD, debug, review e verificacao.
- `debugh`: explorar codebase, revisar impacto, refatorar e depurar quando houver app real.
- `next-best-practices`: usar se Next.js for escolhido ou para consulta pontual.
- `shadcn`: guiar componentes reais de UI.
- `tailwind-design-system`: guiar tokens, tema, design system e Tailwind.
- `web-design-guidelines`: revisar UX/UI, acessibilidade e qualidade visual.

Ordem recomendada para implementar futuramente:

1. Fechar stack.
2. Criar app React/Vite/TypeScript.
3. Configurar Tailwind e shadcn.
4. Definir tema/tokens.
5. Criar AppShell, Sidebar e Topbar.
6. Criar componentes base: Button, Badge, Card, Table, Sheet, Input, Select.
7. Criar mocks.
8. Migrar Estoque.
9. Migrar Nova Reserva e Detalhe do Lote.
10. Migrar Reservas.
11. Migrar Produtos/Lotes.
12. Migrar Ajustes e Configuracoes.
13. Revisar UI e codigo.

## 9. Responsabilidade do Memoria.md

`Memoria.md` deve guardar:

- estado atual;
- regras persistentes validadas;
- decisoes tomadas;
- perguntas em aberto;
- aprendizados;
- problemas conhecidos;
- proximos passos.

Nao duplicar nele instrucoes operacionais longas que pertencem ao `CLAUDE.md`.

## 10. Responsabilidade dos handoffs

`Art Piso/Handoff/` deve guardar materiais tecnicos e de escopo que ainda sao fonte de referencia.

Manter somente anexos que ainda tenham utilidade real.

Atualmente esperados:

- `art_piso_0_0_1_handoff.md`
- `art_piso_0_0_1_schema.sql`
