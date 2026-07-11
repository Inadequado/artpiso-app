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
| Estoque → Novo produto (cadastro) | ✅ Revisado e corrigido (2026-07-11) — 5 achados + 1 novo, todos resolvidos |
| Estoque → Novo lote | ⏳ Não revisado formalmente (vários fixes da sessão 1 já o cobriram: quadra SelectMenu, código duplicado, herança de descrição/foto) |
| Estoque → Editar produto / Editar lote | ⏳ Não revisado |
| Reservas (criar / editar / entregar / estornar) | ⏳ Não revisado |
| Clientes | ⏳ Não revisado |
| Ajustes de Estoque (perda / quadra / correção) | ⏳ Não revisado |
| Configurações | ⏳ Não revisado |

---

## 1. Estoque → Novo Produto (`CadastroProdutoDrawer.tsx`)

Revisado em 2026-06-28. Fluxo: registra o produto e o primeiro lote em uma só passada (`features/estoque/CadastroProdutoDrawer.tsx`).

> **Mudança estrutural posterior (2026-07-07, pedido do usuário):** referência e tamanho viraram **opcionais** no cadastro. A identidade do produto migrou de `referencia` para `produtoId` (`LoteEstoque.produtoId` / `Produto.id`) em agrupamento, seleção, editar/excluir e notificações; referência agora é dado exibicional (some da UI quando vazia) e ficou editável no `EditarProdutoDrawer`. Os achados abaixo continuam valendo — ler "referência" como "produto" onde for identidade.

### ✅ RESOLVIDO (2026-07-11) — Dados do produto não ficavam travados ao reaproveitar produto existente
- **Era:** com `produtoExistente` detectado, marca/tamanho/preço/etc. continuavam editáveis e o salvar usava o que estivesse digitado — novo lote podia nascer com dados diferentes dos lotes-irmãos do mesmo `produtoId` (inconsistência enterrada: `agruparPorProduto` exibe o primeiro lote).
- **Feito:** com match ativo, os campos de produto (marca, tamanho, preço, descrição, foto, m²/caixa, peças/caixa) **somem** e viram card resumo read-only; o salvar usa **sempre os dados da entidade existente**, nunca os inputs (cobre também digitar a referência igual sem clicar na sugestão). Nome e referência continuam editáveis de propósito — são a saída do match ("altere o nome ou a referência" no lugar de botão "Trocar") e evitam travar a digitação num match transitório (ex.: "Metro" a caminho de "Metro Sage"). `selecionarProduto` (clique na sugestão) agora só preenche nome+referência, sem carryover de marca/foto se o usuário desfizer o match depois.

### ✅ RESOLVIDO (2026-07-11) — Campo "Descrição" era digitado e descartado (achado novo do mesmo dia)
- **Era:** o formulário coletava "Descrição (opcional)", mas o `salvar()` não a enviava e o tipo nem tinha o campo — texto perdido silenciosamente.
- **Decisão do usuário:** persistir. **Feito:** `descricao` virou atributo de produto (vive em cada lote, como marca/preço): salva no cadastro, herdada pelo `NovoLoteDrawer`, editável no `EditarProdutoDrawer` (aplica a todos os lotes) e exibida no `ProdutoDetalheDrawer` (abaixo da foto). No reaproveitamento de produto existente, vem da entidade como os demais campos. PENDÊNCIA FASE 2: coluna `descricao` no schema de produtos.

### ✅ RESOLVIDO (2026-07-11) — Quadra é texto livre, não `SelectMenu`
- **Era:** quadra como `<Input>` livre em `CadastroProdutoDrawer` e `NovoLoteDrawer`, sem validar contra as quadras reais (risco de quadra fantasma "Q-3" vs "Q-03"); a lista de `Quadra[]` vivia como estado local da `AjustesPage`.
- **Feito:** quadras subiram pro store compartilhado (`InventoryProvider`: `quadras` + `adicionarQuadra`/`atualizarQuadra`/`removerQuadra`/`alternarStatusQuadra`, todas registrando movimento no histórico). Campo Quadra virou `SelectMenu` alimentado pelo store em **três** drawers: `CadastroProdutoDrawer`, `NovoLoteDrawer` e `EditarLoteDrawer` (este não estava no achado, mas tinha o mesmo input cru).
- **Bônus:** `EstornoDrawer` e `estornarReserva` liam o seed do mock direto (quadra criada em Ajustes não aparecia na devolução) — agora leem do store.
- **Limite conhecido (Fase 2):** renomear quadra não faz cascata nos lotes (lote guarda o texto `Q-03`, não o id) — resolve com FK no schema, junto do Q1 (lote × quadra).

### ✅ RESOLVIDO (2026-07-11) — Sem checagem de código de lote duplicado
- **Era:** `adicionarLote` não validava código repetido — dois lotes "L-2405" passavam sem aviso. Pior que estético: `reserva.lote` vincula por código, então duplicar mescla as reservas de lotes distintos.
- **Feito:** helper `loteComCodigo(codigo, lotes, ignorarLoteId?)` em `mock-inventory` (comparação normalizada, escopo GLOBAL do depósito; retorna o lote conflitante). Erro inline + salvar desabilitado em `CadastroProdutoDrawer`, `NovoLoteDrawer` e `EditarLoteDrawer` (renomear para código existente era o mesmo buraco). Guards defensivos silenciosos no provider (`adicionarLote` recusa duplicado; `atualizarLote` recusa renomeação duplicada) caso a UI seja burlada.
- **Complemento (mesma data, pergunta do usuário "e se chegar remessa do mesmo lote?"):** nova ação **Adicionar estoque** na Central de Ajustes (movimento tipo `entrada`, "+N cx em L-XXXX", notificação silenciosa de reposição) para remessa com mesmas bitola/tonalidade; specs diferentes = lote novo com sufixo (ex.: L-2405-B). A mensagem de duplicado nos dois cadastros orienta os dois caminhos; no Editar lote segue curta (contexto é renomear). Decisão de domínio e PH-12 registrados no `Memoria.md`.

### ✅ RESOLVIDO (2026-07-11) — Comparação de referência era frágil
- **Era:** match exato por `trim().toLowerCase()` — espaço duplo, acento ou hífen vs underline criavam produto duplicado em vez de reaproveitar.
- **Feito:** helpers `chaveNome` (minúsculas, sem acentos, espaços colapsados) e `chaveReferencia` (idem + ignora separadores `-`/`_`/`.`/espaço) em `mock-inventory`, aplicados no match de `produtoExistente` E nas sugestões do autocomplete (busca ficou acento-insensível). "POR 6060_BL" agora bate com "POR-6060-BL".

### ✅ RESOLVIDO (2026-07-11) — Foto vive por lote, não por produto
- **Era:** `foto` em `LoteEstoque`; lote novo criado pelo `NovoLoteDrawer` nascia sem a foto do produto.
- **Feito (mínimo coerente com a arquitetura atual):** `NovoLoteDrawer` herda `produto.foto` (e `descricao`), como já herda m²/peças/preço; no reaproveitamento do cadastro a foto vem da entidade. Mover foto/descrição para uma entidade `Produto` de verdade é decisão de schema da FASE 2 (hoje produto é derivado dos lotes). Lacuna conhecida assumida: não há como TROCAR a foto de um produto já cadastrado (o `EditarProdutoDrawer` não edita foto) — entra na revisão da tela Editar produto.

---

## Anotações antecipadas — Ajustes de Estoque (pedidos do usuário, 2026-07-11)

Registradas antes da sessão de revisão da tela; entram no escopo quando a sessão de Ajustes abrir.

### 🧩 MELHORIA — Máscara para o nome das quadras
- Definir uma máscara/formato padrão para o identificador da quadra (hoje o `QuadraDrawer` aceita texto livre, ex.: "Q-13" vs "q13" vs "Quadra 13"). **Aguardando o usuário confirmar os dados reais do depósito para definir o formato.**

### ✅ RESOLVIDO (2026-07-11) — Quadras sem paginação
- **Era:** cards de quadra em 1 linha de 4 com seletor de páginas. **Feito:** paginação removida (estado `quadraPage`, setas e fatiamento saíram da `AjustesPage`); todas as quadras em grid corrido de 4 por linha.

---

## Próximas sessões a revisar

(preencher conforme avançamos — uma seção numerada por sessão, mesmo formato acima)
