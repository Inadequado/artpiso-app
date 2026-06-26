# Art Piso — Mapa de Backend (Dados + Endpoints)

> **Para que serve:** sentar com o Dev e validar a **estrutura de dados** (tabelas/colunas) e os **endpoints** que o app vai chamar. Mesmo espírito do `art_piso_mapa_de_regras.md`: confirmar o que der, **deixar em aberto** o que não fechar.
>
> **De onde vem:** este documento reflete o **estado validado de hoje** — o que já foi decidido e está rodando no mock (`Art Piso/App/`). Ele **não** é o `art_piso_0_0_1_schema.sql` cru: aquele schema é a base inicial e está **atrasado** em relação às decisões posteriores (cliente como entidade, entrega parcial, regime de encomenda, etc.). Onde os dois divergem, este mapa registra o **delta**.
>
> **O que NÃO entra aqui:** desenho final de itens **em aberto**. O que ainda não foi decidido fica listado na **seção 6**, sinalizado, **sem tabela** — para a gente não modelar errado e ter que reestruturar depois.
>
> Origem de cada regra de negócio fica no mapa de regras; histórico e o "porquê" ficam no `Memoria.md`.

---

## Legenda

| Marca | Significa |
|---|---|
| 🟢 **FIRME** | Validado e rodando no mock. Modelar a tabela/coluna/endpoint; o ponto é o Dev **confirmar viabilidade**. |
| 🟡 **DECIDIR** | Existe valor/placeholder provisório (ex.: limite de "estoque baixo" = 10). A decisão final está em aberto. |
| 🧩 **EM ABERTO** | Decidido-mas-não-construído, ou proposto. **Não modelado** aqui — só sinalizado onde mexeria (seção 6). |
| ❓ **DEV/DONO** | Depende de definição técnica do Dev ou da realidade da loja. |

Stack-alvo (herdada do handoff): **Supabase** (Postgres + Auth + Storage + RLS). Leitura/CRUD simples via **PostgREST** (tabelas/views); operações com regra via **RPC** (funções Postgres). Backend próprio (Fastify) só se algo não couber no Supabase.

---

## 1. Princípios do backend 🟢 (confirmar)

- **Caixa é a fonte da verdade.** Saldo físico é em **caixas**; **m² é sempre derivado** (`caixas × m²/caixa`), nunca gravado.
- **Disponível é derivado**, nunca digitado: `Disponível = Estoque − Reserva − Perda`.
- **Reserva não é um campo do lote** — é a soma das reservas ativas (calculada).
- **Cálculo mora no backend.** O frontend mostra leitura enxuta; o banco entrega tudo já calculado (caixas e m²).
- **Identidade do estoque = Produto + Lote.** O que não varia entre lotes fica no produto; o que varia, no lote.
- **Permissão reforçada no banco** (RLS), não só escondida no frontend.

---

## 2. Modelo de dados (tabelas e colunas)

> Convenção: tipos em Postgres. `uuid` com `gen_random_uuid()`; toda tabela de cadastro tem `created_at`/`updated_at` (`timestamptz default now()`). **DELTA** = diferença em relação ao `art_piso_0_0_1_schema.sql`.

### 2.0 Enums

| Enum | Valores | Estado |
|---|---|---|
| `user_role` | `admin` · `vendedor` · `gerente` | 🟢 igual ao 0.0.1 |
| `reserva_status` | `reservado` · **`parcial`** · `entregue` · `cancelado` · **`estornado`** | 🟢 **+ `parcial`** (entrega parcial) · **+ `estornado`** (R-08, devolução pós-entrega) |
| `reserva_regime` | `aguardando` · `rotacionando` · `travado` | 🟢 **novo** (eixo de encomenda) |
| `movimento_tipo` | `perda` · `quadra` · `correcao` | 🟢 **novo** (log de ajustes) |

### 2.1 `profiles` 🟢 — usuários e papel

Espelha `auth.users`; o Supabase Auth cuida do login. **DELTA:** nenhum (igual ao 0.0.1).

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK → `auth.users(id)` | cascade no delete |
| `nome` | text NOT NULL | |
| `role` | `user_role` NOT NULL | default `vendedor` |
| `created_at` | timestamptz | |

> Helper `auth_role()` (já no 0.0.1) devolve o papel do usuário logado — usado nas policies de RLS.

### 2.2 `quadras` 🟢 — localização física

**DELTA:** **+ `capacidade`** (destrava o % de ocupação e o status "Ocupada"; Q-01).

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | serial PK | |
| `numero` | int NOT NULL UNIQUE | `>= 1` |
| `descricao` | text | opcional |
| **`capacidade`** | int NULL | 🟡 em caixas; **opcional**. Sem ela: sem %, quadra fica sempre "Disponível" (só contagem). O valor por quadra é `Q-03` (a decidir). |

### 2.3 `produtos` 🟢 — referência comercial

Nível **referência** (o que não muda entre lotes). **DELTA:** **+ `preco_m2`** (preço de venda por m² é atributo do produto — igual em todos os lotes).

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `referencia` | text NOT NULL UNIQUE | código de referência |
| `marca` | text NOT NULL | |
| `tamanho_nominal` | text | rótulo ("60x60"); a conta de m² usa o lote |
| `descricao` | text | opcional |
| `fotos` | text[] | default `{}` (paths no Storage); foto é opcional (Q14) |
| **`preco_m2`** | numeric(12,2) | preço de venda por m² |
| `created_at` / `updated_at` | timestamptz | |

### 2.4 `lotes` 🟢 — unidade real de estoque (referência + lote)

Aqui mora o que **varia por lote**. **DELTA:** **+ `pecas_por_caixa`**, **+ `pisos_danificados`**.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `produto_id` | uuid NOT NULL → `produtos(id)` | `on delete restrict` |
| `lote` | text NOT NULL | código/número do lote |
| `quadra_id` | int NOT NULL → `quadras(id)` | `on delete restrict` · **uma quadra por lote hoje** (ver C-01, seção 6) |
| `m2_por_caixa` | numeric(10,4) NOT NULL | `> 0`. Fica no **lote** (o fabricante pode mudar por lote) |
| **`pecas_por_caixa`** | int NOT NULL | `> 0`. Base para registrar perda por unidade |
| `caixas_estoque` | numeric(12,2) NOT NULL | default 0 · `>= 0` · **fonte da verdade física** |
| `caixas_perda` | numeric(12,2) NOT NULL | default 0 · `>= 0` |
| **`pisos_danificados`** | int NULL | informativo (peças quebradas em caixas perdidas); **não** recalcula disponível fracionado |
| `created_at` / `updated_at` | timestamptz | |
| | | **UNIQUE (`produto_id`, `lote`)** — identidade Referência + Lote |

> **Decisão de modelagem:** `preco_m2` vive no **produto**; `m2_por_caixa` e `pecas_por_caixa` no **lote**. O mock duplica esses três no objeto de lote por conveniência de render — no banco cada um fica na entidade dona.

### 2.5 `clientes` 🟢 — **TABELA NOVA** (R-06)

Cliente é **entidade** (não texto livre redigitado a cada reserva). A reserva referencia por id; editar o cliente reflete em tudo. **DELTA:** não existe no 0.0.1.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text NOT NULL | |
| `documento` | text NOT NULL | CPF/CNPJ — valida tamanho (11/14) + **dígito verificador** local, sem API (R-04) |
| `telefone` | text | |
| `created_at` / `updated_at` | timestamptz | |

> Campos mínimos por decisão (nome/documento/telefone). Endereço e afins, se entrarem, vêm **só aqui** e já valem em todo lugar.

### 2.6 `reservas` 🟢 — pedidos

Cada linha = um pedido, sempre de um **lote específico**. **DELTA:** ganha cliente por FK, entrega parcial, regime e rastreio; **perde** os campos de cliente em texto.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `numero_pedido` | text NOT NULL UNIQUE | **campo manual** digitado pelo usuário; helper `proximoNumeroPedido` auto-sugere o próximo número como salvaguarda, mas é editável. N reservas do mesmo pedido multi-item (R-07) compartilham o mesmo valor. |
| `lote_id` | uuid NOT NULL → `lotes(id)` | `on delete restrict` |
| **`cliente_id`** | uuid NOT NULL → `clientes(id)` | **fonte única do cliente** (substitui texto solto) |
| `caixas_reservadas` | numeric(12,2) NOT NULL | `> 0` · saldo **em aberto** (cai em entrega parcial) |
| **`caixas_entregues`** | numeric(12,2) NOT NULL | default 0 · acumulado das entregas parciais |
| **`caixas_travadas`** | numeric(12,2) NULL | caixas fisicamente separadas agora; `rotacionando` pode ser 0 |
| `status` | `reserva_status` NOT NULL | default `reservado` (+ `parcial`) |
| **`regime`** | `reserva_regime` NULL | ausente = `aguardando`. Definido pela `data_prevista` |
| **`data_prevista`** | date NULL | entrega prevista; em branco = retirada imediata. Base do modelo de encomenda |
| `data_entrega` | timestamptz NULL | quando concluiu de fato |
| `vendedor_id` | uuid → `profiles(id)` | vem do usuário logado (não digitado). Campo "Vendedor" removido da visualização (único acesso compartilhado); `vendedor_id` permanece no schema. |
| `observacoes` | text NULL | |
| **`motivo_cancelamento`** | text NULL | preenchido ao cancelar (opcional) |
| `created_at` / `updated_at` | timestamptz | |

> **Removidos vs 0.0.1:** `cliente_nome`, `cliente_telefone`, `cliente_doc`, `cliente_obs` — agora derivam de `clientes` via `cliente_id`.

> **R-07 — Pedido multi-item (FUNDAMENTO, 2026-06-25):** um pedido pode reservar múltiplos lotes. Modelo escolhido: **N linhas em `reservas` com o mesmo `numero_pedido`** (sem tabela `pedidos` separada). Cada linha preserva R-01 (1 reserva = 1 lote). Ciclo de vida independente por linha (entrega/cancelamento). O agrupamento visual e de ordenação é feito pelo `numero_pedido` no frontend.

### 2.7 `entregas` 🟢 — **TABELA NOVA** (histórico de entrega parcial)

Sustenta a entrega parcial: cada entrega registrada vira uma linha; a soma alimenta `reservas.caixas_entregues`. **DELTA:** não existe no 0.0.1.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `reserva_id` | uuid NOT NULL → `reservas(id)` | `on delete cascade` |
| `caixas` | numeric(12,2) NOT NULL | `> 0` |
| **`lote_id`** | uuid NULL → `lotes(id)` | lote de onde as caixas saíram fisicamente. Preenchido quando regime `rotacionando` troca de lote na entrega; `NULL` = lote original da reserva. |
| `responsavel` | text NOT NULL (ou uuid → `profiles`) | quem entregou |
| `observacoes` | text NULL | |
| `created_at` | timestamptz | quando |

### 2.8 `estornos` 🟢 — **TABELA NOVA** (histórico de devoluções, R-08)

Sustenta o estorno pós-entrega: cada devolução registrada vira uma linha; incrementa `lotes.caixas_estoque` do lote original. A quadra de destino é informativa — **não** atualiza `lotes.quadra_id` (gravar como histórico evita corromper a quadra das caixas remanescentes). **DELTA:** não existe no 0.0.1.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `reserva_id` | uuid NOT NULL → `reservas(id)` | `on delete cascade` |
| `caixas` | numeric(12,2) NOT NULL | `> 0`; max = total entregue da reserva |
| `quadra_destino` | text NOT NULL | onde as caixas foram armazenadas ao retornar (informativo) |
| `responsavel` | text NOT NULL (ou uuid → `profiles`) | quem registrou a devolução |
| `motivo` | text NULL | |
| `created_at` | timestamptz | quando |

> **Regra de status:** ao estornar, `reservas.status` passa para `estornado`. Estorno parcial (devolver menos do que foi entregue) é ponto a definir — hoje o fluxo estorna tudo.

### 2.9 `movimentos` 🟢 — **TABELA NOVA** (log de ajustes, H-01)

Histórico das operações de **ajuste de estoque** (perda, mudança de quadra, correção). Reserva/entrega/cadastro **não** entram aqui (vivem como notificação — H-02/H-03). **DELTA:** não existe no 0.0.1.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `tipo` | `movimento_tipo` NOT NULL | `perda` · `quadra` · `correcao` |
| `lote_id` | uuid NULL → `lotes(id)` | a qual lote se refere (quando aplicável) |
| `titulo` | text NOT NULL | linha curta |
| `detalhe` | text NOT NULL | descrição |
| `usuario_id` | uuid → `profiles(id)` | quem registrou |
| `created_at` | timestamptz | quando |

---

## 3. Views e cálculos derivados 🟢 (o backend é dono)

- **`vw_estoque`** — a "tabela principal" que o app consome, tudo já calculado em **caixas e m²** (`estoque`, `reserva`, `perda`, `disponível`).
  - **Mudança crítica vs 0.0.1:** o desconto do disponível usa apenas as **caixas travadas** das reservas ativas (`reservado` + `parcial`), **não** o total reservado. Motivo (regra já no código): `rotacionando` trava 0 → o estoque gira até a data e **não** consome disponível; `aguardando`/`travado` travam o total. Hoje o 0.0.1 soma todo `reservado` — precisa alinhar.
- **Status derivado** (`esgotado` / `baixo` / `disponivel`): `<= 0` esgotado; `< 10` baixo (🟡 limite **10** = N-01, a confirmar); senão disponível.
- **`status_produto`** — agrega os lotes: o produto só fica **esgotado quando o produto inteiro zera** (lote esgotado isolado não rebaixa o produto).
- **`furo_produto`** (anti-furo E-05) — por produto: `max(0, prometido − estoque_físico_líquido)`, com `prometido` = soma das `caixas_reservadas` ativas e `estoque_físico_líquido` = soma de `(caixas_estoque − caixas_perda)`. Sustenta as notificações "Promessa em risco" / "Estoque cobre os pedidos".
- **`ocupacao_quadra`** (Q-01) — por quadra: caixas físicas dos lotes na quadra vs `capacidade` → `%` e status `disponivel`/`ocupado` (cheia quando caixas ≥ capacidade). Sem capacidade: só contagem, sempre `disponivel`.

---

## 4. Endpoints

> Cada endpoint nasce de uma ação do app (contrato do store no mock). Formato: **mecanismo** (tabela/view/RPC) · **papéis** (RLS) · **validação/efeito**. RPC = função Postgres quando há regra a garantir no banco.

### 4.1 Auth / Perfil
- **Login/logout** — Supabase Auth. 🧩 hoje é mock (D-04).
- **Ler perfil próprio** — `profiles` (select). Admin lê todos.
- **Gerenciar usuários/papéis** — `profiles` (write) · **admin**.

### 4.2 Estoque (leitura)
- **Listar estoque** — `vw_estoque` (select) · todos autenticados. Filtros (P1): referência, marca, lote, quadra, disponibilidade.
- **Detalhe do produto/lote** — `vw_estoque` + `lotes`/`produtos`.

### 4.3 Produtos
- **Criar / editar produto** — `produtos` (insert/update) · **admin**.
- **Excluir produto** — `produtos` (delete) · **admin** · **bloquear** se houver lote/reserva ativa (evita órfão).

### 4.4 Lotes & ajustes de estoque
- **Adicionar lote** — `lotes` (insert) · **admin/gerente**.
- **Editar lote (código/quadra)** — `lotes` (update) · **admin/gerente** · renomear código faz cascata no vínculo das reservas.
- **Excluir lote** — `lotes` (delete) · **admin/gerente** · bloquear com reserva ativa.
- **Corrigir estoque** — RPC `corrigir_estoque(lote, novo_total)` · **admin/gerente** · 🟡 bloqueia abaixo do comprometido (reserva+perda) — D-02/PH-9 a confirmar · gera `movimento` (`correcao`).
- **Mover de quadra** — RPC `mover_quadra(lote, nova_quadra)` · **admin/gerente** · atualiza a quadra nas reservas ativas · gera `movimento` (`quadra`).
- **Registrar perda** — RPC `registrar_perda(lote, caixas, pisos)` · **admin/gerente** · perda = caixa inteira; `pisos` é informativo · gera `movimento` (`perda`).

### 4.5 Quadras
- **CRUD de quadra (+ capacidade)** — `quadras` · **admin/gerente** · excluir bloqueado se houver lote na quadra. (Vivem dentro de "Ajustes de Estoque"; sem tela própria.)

### 4.6 Clientes
- **Listar / criar / editar cliente** — `clientes` · **admin** (gerente não altera cliente — Q13). Criar **retorna** o cliente (para vincular na reserva na hora).
- **Excluir cliente** — `clientes` (delete) · **admin** · bloquear com pedido ativo.

### 4.7 Reservas (RPC — operações com regra)
- **Criar reserva** — RPC `criar_reserva(input)` · **admin/vendedor** · valida **não passar do disponível** (Q5, bloqueio sempre) · gera `numero_pedido` (`PED-XXXX`) · define `regime` pela `data_prevista` (≥ ~3 meses → `rotacionando`; senão trava).
- **Editar reserva** — RPC `editar_reserva(input)` · **admin/vendedor** · **R-05 (DECIDIDO/IMPLEMENTADO 2026-06-25):** reserva `parcial` pode ser editada, mas **só o saldo em aberto** (`caixas`). Lote e cliente travados após a 1ª entrega parcial. Reduzir saldo a 0 encerra como `entregue` (não é estorno — nada volta ao estoque). Reserva `reservado` (sem entrega) aceita edição livre.
- **Cancelar reserva** — RPC `cancelar_reserva(id, motivo?)` · **admin/vendedor** (vê/cancela qualquer reserva — Q11/Q12) · grava `motivo_cancelamento` · libera o disponível.
- **Entregar (parcial/total)** — RPC `entregar_reserva(id, caixas, lote_id?, responsavel, obs?)` · **admin/gerente** · baixa `caixas_estoque` do lote entregue (original ou alternativo) · cria linha em `entregas` (com `lote_id` quando houve troca) · atualiza `caixas_entregues`/saldo e status (`parcial`/`entregue`). **Troca de lote (rotacionando):** só permitida no 1º `status === 'reservado'`; após entrega parcial o lote fica fixo (R-05).
- **Estornar reserva** — RPC `estornar_reserva(id, caixas, quadra_destino, responsavel, motivo?)` · **admin/gerente** · só disponível para `status === 'entregue'` · incrementa `caixas_estoque` do lote original · cria linha em `estornos` · muda status para `estornado` · **não** atualiza `lotes.quadra_id` (quadra de destino é informativa — gravar no histórico evita corromper a quadra das caixas remanescentes).

### 4.8 Movimentos / Histórico
- **Listar histórico** — `movimentos` (select) · admin/gerente. Alimentado pelos RPCs de ajuste (4.4).

### 4.9 Notificações
- 🧩 **EM ABERTO** — hoje é store de mock, **sem persistência** (some no reload). Decidir se persiste (`notificacoes`) ou deriva do estado. Ver seção 6.

---

## 5. Permissões (RLS) ❓ (refinar com o Dev)

Baseline herdado do 0.0.1, a refinar por papel:

| Recurso | admin | vendedor | gerente |
|---|---|---|---|
| Estoque (leitura) | ✓ | ✓ | ✓ |
| Produtos | CRUD | — | — |
| Lotes / perda / quadra / correção | CRUD | — | CRUD |
| Clientes | CRUD | — | — (Q13) |
| Reservas: criar/editar/cancelar | ✓ | ✓ (Q11/Q12) | — |
| Reservas: entregar | ✓ | — | ✓ |
| Usuários/papéis | ✓ | — | — |

> **Hoje** o ambiente roda **só com `admin`** (PH-11); a distribuição final de papéis é decisão do Dev (**D-01**). A tabela acima é a intenção, não a verdade do ambiente atual.

---

## 6. Em aberto que afeta o schema 🧩 / ❓ (NÃO modelado)

Itens com decisão pendente ou ainda não construídos. **Ficam aqui de propósito**, sem tabela/coluna — para não modelar e ter que reestruturar. Quando algum for decidido, vira FUNDAMENTO na seção 2.

- **C-01 — Lote em várias quadras.** Decidido em conceito (um lote pode se dividir), **não construído**. Hoje `lotes.quadra_id` é único. Se for em frente, muda para **estoque por (lote × quadra)** — afeta `lotes`, os cálculos de estoque e a `vw_estoque`. *(Mantido em aberto.)*
- **E-04 — Override "Fixado" (HOLD de pedido urgente).** Decidido que fica, não construído. Entraria como flag na `reservas` + tag na UI. 🧩
- **E-03 / encomenda fina — aviso proativo** ("vai faltar em N dias"). Depende do prazo de reposição (**N-03**, ❓ Dev). Sem isso, fica só o anti-furo reativo (já modelado em `furo_produto`).
- **Persistência de notificações.** Decidir entre tabela `notificacoes` (eventos: reserva criada, entrega, perda…) vs derivar do estado (estoque baixo, furo são deriváveis). Hoje é mock sem persistência. 🧩
- **Placeholders numéricos.** Onde vivem os limites (N-01 baixo = 10; N-02 pico de perda = 5; PH-3/4/5 prazos da encomenda): tabela de **configuração** vs constantes no código. 🟡 — definir junto com os valores.

---

## 7. Delta resumido vs `art_piso_0_0_1_schema.sql`

Para o Dev bater o olho no que muda em relação ao schema inicial:

| Onde | Mudança |
|---|---|
| `reserva_status` | + `parcial` · + `estornado` (R-08) |
| `reserva_regime` | **enum novo** (`aguardando/rotacionando/travado`) |
| `movimento_tipo` | **enum novo** (`perda/quadra/correcao`) |
| `quadras` | + `capacidade` |
| `produtos` | + `preco_m2` |
| `lotes` | + `pecas_por_caixa`, + `pisos_danificados` |
| `clientes` | **tabela nova** (cliente vira entidade) |
| `reservas` | + `cliente_id` (FK), + `caixas_entregues`, + `caixas_travadas`, + `regime`, + `data_prevista`, + `motivo_cancelamento`; `numero_pedido` é campo manual (não gerado por trigger) — vários itens do mesmo pedido compartilham o valor; **− `cliente_nome/telefone/doc/obs`** |
| `entregas` | **tabela nova** (histórico de entrega parcial) · + `lote_id` NULL (troca de lote em rotacionando) |
| `estornos` | **tabela nova** (histórico de devoluções R-08) |
| `movimentos` | **tabela nova** (log de ajustes H-01) |
| `vw_estoque` | disponível desconta **caixas travadas**, não todo o reservado; considerar `parcial` como ativo |
| RPCs | `criar/editar/cancelar/entregar/estornar_reserva`, `registrar_perda`, `mover_quadra`, `corrigir_estoque` (regra no banco) |
| RLS | refinar por papel (seção 5); hoje só `admin` no ambiente |

---

*Itens 🧩/❓ não modelados ficam na seção 6. Origem das regras: `art_piso_mapa_de_regras.md`. Histórico e "porquê": `Memoria.md`.*
