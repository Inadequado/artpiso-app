# CLAUDE.md

Guia operacional do projeto Art Piso para agentes de IA.

Este arquivo e o cerebro/roteador do ambiente. Ele define como trabalhar, quais documentos consultar, quais principios respeitar e quando usar as skills. Ele nao deve virar historico detalhado; historico, estado atual, decisoes e aprendizados ficam em `Memoria.md`.

## 1. Antes de trabalhar

Consultar nesta ordem:

1. `Memoria.md`
2. `art_piso_revisao_telas.md`, quando o assunto for a revisao tela-por-tela do app (Fase 1, pre-banco) em andamento
3. `Art Piso/Handoff/art_piso_0_0_1_handoff.md`
4. `Art Piso/Handoff/art_piso_0_0_2_schema.md`, quando o assunto envolver banco, colunas, permissoes ou calculos (o `art_piso_0_0_1_schema.sql` fica como referencia historica do ponto de partida)
5. `Art Piso/Google Switch/`, quando o assunto envolver referencias visuais geradas pelo Stitch
6. `.claude/skills/`, quando o assunto envolver stack, UI, revisao, debug, plano ou implementacao

Se algum caminho mudar, atualizar este arquivo e `Memoria.md`.

## 2. Metodo de trabalho

A postura de colaboracao (critica, nao literal), o ritual de planejamento, a cadencia de git e a verificacao antes de "pronto" sao regras UNIVERSAIS — vivem no `CLAUDE.md` global (`~/.claude/CLAUDE.md`), nao aqui, pra nao duplicar. Aplicam-se a este projeto como a qualquer outro.

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

REDEFINIDOS pelo usuario (2026-07-12):

- `admin`: permissao TOTAL.
- `gerente`: permissao limitada — funcoes exatas A DECIDIR (proposta em validacao no schema 0.0.2).
- `vendedor`: SOMENTE VISUALIZACAO, sem edicao — conta compartilhada num tablet disponivel na loja para todos os vendedores.

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

Nao ha pasta `.claude/skills/` neste ambiente (a lista antiga — `superpowers`, `debugh`, `shadcn` etc. — era da maquina do parceiro e foi removida daqui). Usar as skills nativas do Claude Code, conforme a tarefa:

- `code-review`: revisar o diff atual em busca de bugs e simplificacoes.
- `verify`: exercitar uma mudanca de ponta a ponta antes de dar por pronta.
- `run`: subir o app (Vite dev server) para ver uma mudanca funcionando.
- `simplify`: aplicar limpezas de reuso/simplificacao no codigo alterado.
- `security-review`: revisao de seguranca das mudancas pendentes (relevante na fase Supabase/RLS).

Se surgir lacuna real de skill, avaliar na hora — nao assumir que uma skill listada existe sem conferir.

Nota de fase: a ordem de implementacao que vivia aqui (criar app, configurar Tailwind, migrar telas) ja foi CUMPRIDA — o mock existe com todas as telas. A fase atual e a Fase 1 (revisao tela a tela, `art_piso_revisao_telas.md`) e depois Fase 2 (Supabase); ver `Memoria.md`.

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
- `art_piso_0_0_1_schema.sql` (referencia historica; superado pelo 0.0.2)
- `art_piso_0_0_2_schema.md` (schema vigente da Fase 2, proposto 2026-07-12)
