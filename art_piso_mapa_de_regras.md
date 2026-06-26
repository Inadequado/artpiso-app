# Art Piso — Regras Primordiais para Validação

> **Para que serve:** sentar com o Dev e revisar as **regras mais importantes** do sistema — as que sustentam o funcionamento do Art Piso. O objetivo é **validar juntos** o que der, e **deixar como pergunta/escopo** o que não fechar, para debater quando o MVP for apresentado ao **dono da Art Piso**.
>
> **O que NÃO entra aqui:** o básico e o óbvio (detalhes de tela, conveniências de UI, coisas já pacificadas). Só o que é **primordial** ou **precisa de decisão**.
>
> Histórico completo e origem de cada decisão ficam no `Memoria.md`.

---

## Legenda

| Marca | Significa |
|---|---|
| 🟢 **FUNDAMENTO** | Regra-base. Já decidida; o ponto é **confirmar** que todos concordam. |
| 🟡 **DECIDIR** | Tem regra/valor provisório no app; a decisão final está em aberto. |
| ❓ **DEV / DONO** | Depende da realidade da loja ou de definição técnica do Dev. |
| 🧩 **PROPOSTO** | Desenhado em conversa, **ainda não construído**. |

Regras que pedem ação trazem: **Hoje** (o que vale agora) · **Decisão** (o que falta bater) · **Impacto** (por que importa).

---

## 1. Fundamentos do estoque 🟢 (confirmar)

Regras-base. Provavelmente todos concordam — a ideia é dar o "de acordo" explícito.

- **Caixa é a fonte da verdade.** Saldo real é em **caixas**; **m² é sempre derivado** (`caixas × m²/caixa`), nunca digitado.
- **Disponível = Estoque − Reserva − Perda.** Reserva e perda não são digitadas; são consequência de ações.
- **Produto e Lote.** Um **produto** (referência) reúne um ou mais **lotes**. Preço, marca, tamanho e medidas são do **produto**; estoque, perda e localização são do **lote**.
- **Preço de venda é por m²** (igual em todos os lotes do produto).
- **Status é derivado** do disponível. No produto, só fica **"esgotado" quando o produto inteiro zera** — um lote esgotado isolado não rebaixa o produto.

---

## 2. Reserva, entrega e perda

**`R-01`** 🟢 **Reserva é por lote específico** (o vendedor escolhe) e **nunca excede o disponível** — bloqueio sempre.

**`R-02`** 🟢 **A baixa do estoque acontece na entrega, não na reserva.** **Entrega parcial** é permitida: o saldo restante fica aberto até completar.

**`R-03`** 🟢 **Perda = caixa inteira.** Caixa violada com pisos quebrados vira perda toda; o número de pisos é só **registro** — não recalcula o disponível por peça. Sem reaproveitamento de peças soltas.

**`R-04`** 🟢 **DECIDIDO / EM USO — CPF/CNPJ: valida formato + dígito verificador, sem API.** Documento **obrigatório**; valida o **tamanho** (CPF 11 / CNPJ 14) **e o dígito verificador** (cálculo local em `lib/masks.ts`, pega erro de digitação na hora). **Sem API** de verificação — não consulta se o documento existe/é ativo. *(Implementado 2026-06-21: `cpfValido`/`cnpjValido`/`documentoValido`; documentos-semente trocados por válidos.)*

**`R-05`** 🟡 **DECIDIR — Editar reserva já em entrega parcial.**
- **Hoje:** edita-se uma reserva **não entregue** (lote, quantidade, cliente).
- **Decisão:** uma reserva **parcialmente entregue** também pode ser editada?
- **Impacto:** mexer numa parcial recalcula o que já saiu; precisa de regra clara.

**`R-06`** ⏳ **DECIDIR — Cliente é só texto, não um cadastro.**
- **Hoje:** cada reserva **redigita** nome/CPF/telefone; não há registro de clientes.
- **Decisão:** criar um **cadastro de cliente** (reaproveitar dados, ver o histórico de pedidos de um cliente), ou manter texto livre no MVP?
- **Impacto:** cliente recorrente, histórico por cliente, menos erro de digitação. Candidato a fase 2.

**`R-07`** ❓ **DEV/DONO (em aberto) — Um pedido pode combinar vários lotes do mesmo produto?** Ex.: produto com 10 cx dividido em **lote X (5) + lote Y (5)**, e o cliente precisa de 10. **Hoje não dá:** a reserva é por **um lote só** e não passa do disponível dele (`R-01`, confirmado no `ReservaDrawer`); ele teria que fazer 2 reservas avulsas. O **Dev levantou essa limitação**. *(Antes registrado como "decidido/Opção A"; reaberto em 2026-06-21 a pedido do usuário, por ser complexo.)*
- **Inclinação do usuário:** faria mais sentido **poder juntar** os lotes.
- **Proposta (Opção A):** o **pedido** vira um guarda-chuva que agrupa reservas — cada reserva continua = 1 lote (**preserva o R-01**); o sistema distribui "10 cx do produto" em 5 do X + 5 do Y dentro de um pedido, com entrega/cancelamento em lote. Serve também pra obra com vários produtos.
- **Em aberto:** alinhar **viabilidade** e o **como** com o Dev.

**`R-08`** ❓ **DEV/DONO — Devolução / estorno após entrega.**
- **Hoje:** entregue é entregue; não há como **devolver** caixas ao estoque.
- **Decisão:** precisa de fluxo de **devolução** (sobra de obra volta ao estoque), ou fica fora do MVP?
- **Impacto:** realidade de loja; mexe em estoque e histórico.

**`R-09`** 🧩 **PROPOSTO (do usuário) — Visualizar pedidos agrupados por cliente na tela de Reservas.** Quando um cliente tem vários pedidos (comprou hoje e de novo depois), mostrar agrupado — "Carlos Almeida — 2 pedidos" — **sem unificar** (pedidos e números separados). É organização visual.
- **Diferente do `R-07`:** aqui são **compras diferentes ao longo do tempo** (não junta); no R-07 é **uma compra só** que estoura um lote (junta).
- **Base parcial já existe:** a seção Clientes mostra o histórico de pedidos por cliente (accordion).

---

## 3. Números provisórios (precisam de confirmação)

Valores que **chutamos** para o app rodar — não significam que estão certos.

**`N-01`** 🟡 **Limite de "estoque baixo" — hoje 10 caixas.** Igual para todo produto ou **mínimo por produto**? Em caixas ou em **% do estoque**? *(Controla o card "Estoque a repor" e o alerta automático.)*

**`N-02`** 🟡 **Limite de "pico de perda" — hoje 5 caixas acumuladas por lote.** A partir de quanto preocupa? Fixo ou **% do lote**?

**`N-03`** ❓ **DEV/DONO — Prazo de reposição do porcelanato.** *(pergunta-chave)* Quanto tempo, do **pedido ao recebimento**? Tem sazonalidade? É o número que sustenta toda a lógica de encomenda (seção 4).

---

## 4. Encomenda / Rotação (o maior tema — parte já em uso, parte proposta)

> **Parte já está no app:** a data decidindo o regime (`E-01`), a tag de regime (`E-06`) e o anti-furo reativo (`E-05`). O restante (antecedência/encomenda fina) segue proposto. Legenda por item abaixo.

**`E-01`** 🟢 **EM USO (parcial) — A data decide o regime.** Já no código (`regimePorData`): entrega com data **≥ 3 meses** entra como **encomenda (rotaciona)** — o estoque segue girando e o pedido é cumprido no fim; data mais curta (ou **sem data**) **trava**.
- **Pode mudar:** o corte exato (faixa ~2–3 meses) é placeholder; o resto do modelo (antecedência `E-03`) segue em aberto.

**`E-02`** 🟢 **O que importa é a urgência de guardar, não o lote.** Pode-se **substituir por outro lote** na entrega (recomprar o mesmo lote é quase impossível). "Travar" = guardar estas caixas; "rotacionar" = deixar girar e entregar no fim.

**`E-03`** 🟡 **Antecedência do aviso — hoje 45 dias.** O sistema avisa "este pedido precisa de X caixas em N dias" faltando 45 dias. **O número certo depende de `N-03`.**

**`E-04`** 🟢 **DECIDIDO — O override "não rotacionar este pedido" fica (é necessário).** É a exceção para forçar **HOLD num pedido específico urgente** ("segura estas caixas para este cliente"): **off por padrão** e **editável depois** (não só na criação). A regra da data segue decidindo o regime geral; o override é a saída manual para casos urgentes. *(Confirmado pelo usuário em 2026-06-20.)*

**`E-05`** 🟢 **DECIDIDO / EM USO — Anti-furo: a promessa não pode passar do estoque físico.** Por produto, o sistema vigia se os pedidos ativos cabem no **estoque físico** (caixas − perda). Quando deixa de caber — a **perda** derruba o lastro, ou um pedido **rotacionando** fica sem estoque —, avisa **"Promessa em risco — faltam N cx"**. Quando a reposição volta a cobrir, avisa **"Estoque cobre os pedidos — dá pra separar"**. *(Implementado 2026-06-20: `furoProduto` + observador, parte REATIVA.)*
- **Pode mudar depois:** avisar com **antecedência** ("vai faltar em N dias") depende do prazo de reposição (**N-03**) e ainda não entrou — é o **E-03**.

**`E-06`** 🟢 **IMPLEMENTADO — Tag de regime na reserva (além do status de ciclo).** *(seu ponto)*
- **Feito:** além do ciclo (Reservado / Parcial / Entregue / Cancelado), a reserva mostra o **regime**: **Rotacionando** (encomenda girando) e **Travado** (caixas guardadas pra ele). Sem regime = **Aguardando** (não mostra tag). Visual no app.
- **Falta:** a tag do override **"Fixado"** (pedido urgente forçado) — depende do **E-04** (decidido, mas ainda não construído).
- **Por quê:** batendo o olho, o operador sabe se as caixas estão **paradas pra ele** ou **girando**.

**`E-07`** 🧩 **DECIDIR — Encomenda vencida.** Quando a **data prevista passa** sem entrega, o que acontece? (alerta de atraso? marcação de "vencida"?)

---

## 5. Quadras / localização

> **Onde fica (decidido):** a configuração de quadra **não tem tela própria** — vive **dentro de Ajustes de Estoque**, junto com perda, mover lote e corrigir. Não criar seção/menu separado.

**`Q-01`** 🟢 **IMPLEMENTADO — Status da quadra é automático (derivado), com barra de ocupação.** Vem das caixas físicas dos lotes na quadra (não é escolhido na mão): **Disponível** (ainda cabe estoque) × **Ocupada** (cheia, caixas ≥ capacidade) + **barra de % de ocupação**. Simplificou o Vazia/Parcial/Cheia (decisão do usuário). O % só existe quando há **capacidade** definida (`Q-03`).

**`Q-02`** 🟢 Uma quadra pode conter **vários lotes**; **excluir** quadra é bloqueado se houver lote nela; mover lote de quadra atualiza a quadra nas reservas ativas.

**`Q-03`** 🟡 **DECIDIR — Capacidade da quadra (em caixas).** O **campo já existe** (opcional) e é o que destrava a barra de % e o status "Ocupada". **Falta definir** os valores por quadra (e se a capacidade deve ser obrigatória). Sem capacidade, a quadra fica sempre "Disponível" e mostra só a contagem.

*(Liga com `C-01`: se um lote pode se dividir em várias quadras, a gestão de quadra fica mais rica.)*

---

## 6. Histórico & Notificações 🟢 (decidido)

**`H-01`** 🟢 **A tela de Ajustes mantém o histórico das suas operações.** Registrar/editar/excluir quadra, registrar perda, mover lote e corrigir quantidade aparecem no "Histórico recente" ao lado (com quem e quando) e em "Ver histórico completo". **Primordial — já existe.**

**`H-02`** 🟢 **Sem audit log exaustivo no MVP.** Decidido: **não** mapear ponto a ponto cada movimento, nem histórico por produto/lote, nem registro de edições de cadastro. Seria poluição — não agrega no MVP.

**`H-03`** 🟢 **Os movimentos importantes viram NOTIFICAÇÃO — curada.** Só o que **muda uma decisão** toca o sino (estoque baixo, perda, reserva, entrega); o resto é badge silencioso ou nem entra. Notificação demais ninguém lê. *(A lista exata está no `H-04`.)*

**`H-04`** 🟢 **Lista completa das notificações de hoje (o que aparece no sino).** *(seu ponto: deixar visível, ponto a ponto, tudo que é notificado)*

Tudo que pode cair no modal do sino, hoje, está aqui. Serve para **bater a curadoria**: confirmar que essa é a lista certa — nem de menos (faltou algo importante?) nem de mais.

**Som:** todas as notificações que tocam o sino usam o **mesmo** chime curto (um som só pra tudo, sem distinção por tipo); as silenciosas não emitem som. *(Decidido: manter som único.)*

**Tocam o sino (alerta ativo — som + destaque):**

| Notificação | Quando dispara | Exemplo |
|---|---|---|
| **Estoque baixo** | Um produto cai abaixo do limite de "baixo" (hoje **10 cx** — ver `N-01`). Dispara na *virada* do nível, venha de entrega, perda, correção ou edição. | "Revestimento Metro Sage — 5 cx disponíveis" |
| **Produto esgotado** | O produto **inteiro** zera (0 cx disponível). | "Ladrilho Hidráulico Mediterrâneo — 0 cx disponíveis" |
| **Reserva criada** | Uma nova reserva é registrada. | "Porcelanato Cinza Concreto — 4 cx para Roberto Dias" |
| **Entrega concluída** | A reserva é entregue por completo. | "Piso Vinílico Carvalho Natural — 10 cx (PED-1019)" |
| **Entrega parcial** | Uma entrega parcial é registrada (sobra saldo em aberto). | "Piso Laminado Carvalho Mel — 3 cx (PED-1030)" |
| **Perda registrada** | Perda é lançada num lote (com nº de pisos danificados, quando houver). | "3 cx em L-2410 · 5 pisos danificados" |
| **Promessa em risco** *(anti-furo, `E-05`)* | Os pedidos ativos de um produto deixam de caber no estoque físico (perda derruba o lastro, ou rotacionando sem estoque). | "Ladrilho Hidráulico Mediterrâneo — faltam 1 cx para cobrir os pedidos" |
| **Estoque cobre os pedidos** *(anti-furo, `E-05`)* | A reposição volta a cobrir o que estava prometido — dá pra separar os pedidos pendentes. | "Ladrilho Hidráulico Mediterrâneo — dá pra separar os pedidos" |

**Badge silencioso (entra na lista e conta no contador, mas NÃO toca som/animação):**

| Notificação | Quando dispara | Por que silencioso |
|---|---|---|
| **Estoque reposto** | Um produto que estava baixo/esgotado volta a ter estoque (lote novo / entrada). | Boa notícia, não exige ação imediata. |
| **Pico de perda** | A perda acumulada de um lote cruza o limite (hoje **5 cx** — ver `N-02`), uma vez só. | Sinal de atenção, não urgência. |

**NÃO notifica (vai só para o Histórico de Ajustes, ou não gera nada):** editar reserva, **cancelar reserva**, mover lote de quadra, corrigir quantidade, cadastrar/editar produto, registrar/editar/excluir quadra. *(Decisão `H-02`/`H-03`: o sino é curado; o resto é histórico ou nada.)*

**🧩 PROPOSTO — notificações que ainda NÃO existem (entram com o modelo de encomenda, seção 4):**

| Notificação | Quando deveria disparar | Liga com |
|---|---|---|
| **Encomenda se aproximando** | A data prevista de uma encomenda (rotacionando) entra na janela de antecedência — hoje proposto em **45 dias** (depende de `N-03`). Avisa "este pedido precisa de X cx em N dias". | `E-03` |
| **Encomenda vencida** | A data prevista passou **sem entrega**. (Formato do alerta a definir — atraso? marcação "vencida"?) | `E-07` |

*O **anti-furo reativo** já saiu daqui — virou as notificações "Promessa em risco" e "Estoque cobre os pedidos" (acima, no sino). O que falta é a versão **proativa** (avisar com antecedência), que depende do `N-03`.*

> **A confirmar:** (1) **Cancelar reserva** hoje **não** avisa ninguém — está certo, ou um cancelamento deveria pingar (ao menos badge: libera estoque que alguém pode esperar)? (2) "Estoque reposto" e "Pico de perda" como **silenciosos** está bom? (3) A lista 🧩 PROPOSTO acima cobre os eventos do modelo de encomenda, ou falta algum?

---

## 7. Decidido, mas ainda não construído

**`C-01`** ⏳ **Lote dividido em mais de uma quadra.**
- **Hoje:** cada lote tem **uma** quadra única.
- **Decisão:** já foi decidido que **um lote pode estar em várias quadras** — falta construir.
- **Impacto:** muda o modelo (estoque por **lote × quadra**) e as telas de Estoque/Ajustes. Maior lacuna "decidida mas não feita".

---

## 8. Em aberto para o Dev / realidade da loja ❓

**`D-01`** **Permissões por papel.** Hoje roda **só com admin**. Quem faz o quê — reservar, entregar, ajustar estoque, travar encomenda — será do **Dev**. (Já decidido em conceito: vendedor vê/cancela qualquer reserva; gerente não altera dados do cliente.)

**`D-02`** **Correção que zeraria o disponível.** Hoje **bloqueia** reduzir abaixo do reservado/perdido. **Bloquear** é o certo, ou **avisar e permitir**?

**`D-03`** **Recadastro de lote esgotado.** O Dev pretende um **recall inteligente**: ao recadastrar um lote que já existiu, relembrar o antigo em vez de duplicar.

**`D-04`** **Persistência e login reais (Supabase).** Hoje tudo é mock: notificações, histórico e login **somem ao recarregar** e o acesso é fachada.

---

## 9. Fora do MVP / parado (consciente)

- **Design visual/estético** (paleta, hierarquia, tipografia) — não feito.
- **UX de produto** (fluxo de cada tarefa, atalhos, prioridade por tela) — não feito.
- **Tablet / responsivo** — hoje é desktop apenas.

---

*Para a origem de qualquer regra (perguntas Q1–Q16, placeholders PH-1–PH-11), ver o `Memoria.md`.*
