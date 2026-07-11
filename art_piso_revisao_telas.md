# Art Piso — Revisão de Telas (Pré-Banco)

> **Para que serve:** acompanhar a revisão do app tela por tela — UX, consistência, bugs e falhas — **antes** de mexer no banco de dados (Supabase). Cada sessão revisada fecha com uma lista de achados, marcados por prioridade; o fix em si é aplicado depois, quando o usuário decidir a ordem.
>
> **Metodologia (definida com o usuário em 2026-06-28):** revisão etapa por etapa, sessão por sessão do app.
> 1. **Fase 1** — achar e corrigir bugs/inconsistências de UI e dados no MOCK atual (este documento).
> 2. **Fase 2** — só depois da Fase 1 fechada, entra a integração com banco (Supabase).
> 3. Depois da Fase 1, usuário e agente definem juntos o **curso de trabalho** (ordem/cronograma) para a Fase 2 em diante.
>
> **O que NÃO entra aqui:** decisões de regra de negócio em aberto (ficam no `art_piso_mapa_de_regras.md`) e modelagem de banco (fica no `art_piso_mapa_de_backend.md`). Aqui é só achado + proposta de fix por tela. Histórico/porquê mais longo fica no `Memoria.md`.

---

## Legenda

| Marca | Significa |
|---|---|
| 🔴 **BUG** | Comportamento errado ou dado pode corromper. Prioridade alta. |
| 🟡 **INCONSISTÊNCIA** | Funciona, mas quebra um padrão já estabelecido em outra tela. |
| 🧩 **MELHORIA** | Não é erro — é uma sugestão de ajuste. |
| ✅ **RESOLVIDO** | Já corrigido (registrar data + o que foi feito). |

---

## Status geral por sessão

| Sessão / tela | Status |
|---|---|
| Estoque → Novo produto (cadastro) | 🔄 Revisado, achados abaixo — fixes ainda não aplicados |
| Estoque → Novo lote | ⏳ Não revisado |
| Estoque → Editar produto / Editar lote | ⏳ Não revisado |
| Reservas (criar / editar / entregar / estornar) | ⏳ Não revisado |
| Clientes | ⏳ Não revisado |
| Ajustes de Estoque (perda / quadra / correção) | ⏳ Não revisado |
| Configurações | ⏳ Não revisado |

---

## 1. Estoque → Novo Produto (`CadastroProdutoDrawer.tsx`)

Revisado em 2026-06-28. Fluxo: registra o produto e o primeiro lote em uma só passada (`features/estoque/CadastroProdutoDrawer.tsx`).

> **Mudança estrutural posterior (2026-07-07, pedido do usuário):** referência e tamanho viraram **opcionais** no cadastro. A identidade do produto migrou de `referencia` para `produtoId` (`LoteEstoque.produtoId` / `Produto.id`) em agrupamento, seleção, editar/excluir e notificações; referência agora é dado exibicional (some da UI quando vazia) e ficou editável no `EditarProdutoDrawer`. Os achados abaixo continuam valendo — ler "referência" como "produto" onde for identidade.

### 🔴 BUG — Dados do produto não ficam travados ao reaproveitar produto existente
- **Onde:** `CadastroProdutoDrawer.tsx:67-82` (detecção de `produtoExistente` + `selecionarProduto`).
- **Problema:** quando a referência já existe, aparece o aviso "você está adicionando um novo lote; os dados do produto serão mantidos" — mas nome/referência/marca/tamanho/preço continuam editáveis depois do autocomplete preencher. Se o usuário mexer neles (ou digitar a referência igual sem clicar na sugestão), o novo lote é salvo com valores **diferentes** dos lotes-irmãos da mesma referência.
- **Por que importa:** `agruparPorProduto` (`data/mock-inventory.ts:516`) monta a exibição do produto a partir do **primeiro** lote daquela referência — a inconsistência fica enterrada no dado, não aparece na tela. Quebra o princípio "Produto + Lote define a unidade real de estoque".
- **Fix proposto:** quando `produtoExistente` for detectado, travar (read-only) nome/referência/marca/tamanho/preço — mesmo padrão que o `ClienteSelector` já usa para cliente existente (trava campos + botão "Trocar").

### ✅ RESOLVIDO (2026-07-11) — Quadra é texto livre, não `SelectMenu`
- **Era:** quadra como `<Input>` livre em `CadastroProdutoDrawer` e `NovoLoteDrawer`, sem validar contra as quadras reais (risco de quadra fantasma "Q-3" vs "Q-03"); a lista de `Quadra[]` vivia como estado local da `AjustesPage`.
- **Feito:** quadras subiram pro store compartilhado (`InventoryProvider`: `quadras` + `adicionarQuadra`/`atualizarQuadra`/`removerQuadra`/`alternarStatusQuadra`, todas registrando movimento no histórico). Campo Quadra virou `SelectMenu` alimentado pelo store em **três** drawers: `CadastroProdutoDrawer`, `NovoLoteDrawer` e `EditarLoteDrawer` (este não estava no achado, mas tinha o mesmo input cru).
- **Bônus:** `EstornoDrawer` e `estornarReserva` liam o seed do mock direto (quadra criada em Ajustes não aparecia na devolução) — agora leem do store.
- **Limite conhecido (Fase 2):** renomear quadra não faz cascata nos lotes (lote guarda o texto `Q-03`, não o id) — resolve com FK no schema, junto do Q1 (lote × quadra).

### 🔴 BUG — Sem checagem de código de lote duplicado
- **Onde:** `adicionarLote` em `store/inventory-provider.tsx:142-160`.
- **Problema:** não valida se o código do lote já existe (nem globalmente, nem dentro do mesmo produto). Hoje é possível cadastrar dois lotes "L-2405" sem aviso.

### 🟡 INCONSISTÊNCIA — Comparação de referência é frágil
- **Onde:** `CadastroProdutoDrawer.tsx:67-69`.
- **Problema:** compara `referencia.trim().toLowerCase()` de forma exata. Pequenas variações de digitação (espaço duplo, hífen vs underline) não batem e criam produto duplicado em vez de reaproveitar o existente.

### 🧩 MELHORIA — Foto vive por lote, não por produto
- **Onde:** campo `foto` está em `LoteEstoque`, não em `Produto` (`types/inventory.ts`).
- **Observação:** cada lote carrega seu próprio campo de foto; hoje só é copiado manualmente dentro de `selecionarProduto`. Funciona, mas é redundante — foto é claramente um atributo de produto, não de lote.

---

## Anotações antecipadas — Ajustes de Estoque (pedidos do usuário, 2026-07-11)

Registradas antes da sessão de revisão da tela; entram no escopo quando a sessão de Ajustes abrir.

### 🧩 MELHORIA — Máscara para o nome das quadras
- Definir uma máscara/formato padrão para o identificador da quadra (hoje o `QuadraDrawer` aceita texto livre, ex.: "Q-13" vs "q13" vs "Quadra 13"). **Formato exato a definir com o usuário.**

### 🧩 MELHORIA — Quadras sem paginação
- Hoje os cards de quadra ficam em 1 linha de 4 com seletor de páginas (`quadrasPorPagina = 4` na `AjustesPage`). **Decidido:** remover a paginação e listar todas as quadras em grid corrido, mantendo 4 por linha.

---

## Próximas sessões a revisar

(preencher conforme avançamos — uma seção numerada por sessão, mesmo formato acima)
