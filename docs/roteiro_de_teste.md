# Roteiro de Teste — Art Piso

Roteiro para exercitar o sistema de ponta a ponta contra o **banco de teste**.
Siga na ordem: os blocos dependem uns dos outros (não dá pra criar lote sem quadra,
nem reserva sem produto e cliente).

**Como usar:** marque `[x]` no que passou. Se falhar, anote em **Bug/obs** logo abaixo
do item (o quê, em qual tela, o que esperava vs o que aconteceu).

Legenda de esforço: 🟢 rápido · 🟡 exige preparo · 🔴 difícil de testar agora (data/tempo/tablet).

---

## Bloco 0 — Preparação

- [x] **T-0.1** 🟢 Rodar `Art Piso/App/supabase/reset_teste.sql` no SQL Editor → **Esperado:** banco sem produtos/clientes/reservas/quadras; só o admin permanece.
- [x] **T-0.2** 🟢 Entrar como **admin** → **Esperado:** login OK, cai na tela de Estoque (vazia).

**Bug/obs:**

---

## Bloco 1 — Quadras (setup base)

Reset apagou as quadras; sem elas não dá pra alocar lote.

- [x] **T-1.1** 🟢 Configurações → criar quadra digitando só `1` → **Esperado:** salva como `Q-1`.
- [x] **T-1.2** 🟢 Criar `Q-2` e `Q-3`.
- [x] **T-1.3** 🟢 Tentar criar `Q-1` de novo → **Esperado:** bloqueia (identificador já usado).
- [x] **T-1.4** 🟢 Editar uma quadra → **Esperado:** abre mostrando só o número (sem o `Q-`).

**Bug/obs:**

---

## Bloco 2 — Cadastro de produto e máscaras

- [x] **T-2.1** 🟢 Novo cadastro → nome em minúsculas (ex.: `porcelanato branco`) → **Esperado:** salva em MAIÚSCULAS.
- [x] **T-2.2** 🟢 Preço: digitar `8990` → **Esperado:** vira `R$ 89,90`.
- [x] **T-2.3** 🟢 Tamanho: `60` × `60`; depois teste `83,2` × `83` → **Esperado:** aceita vírgula.
- [x] **T-2.4** 🟢 m² por caixa: digitar `216` → **Esperado:** vira `2.16`.
- [x] **T-2.5** 🟢 Deixar **Avisar estoque baixo** vazio → **Esperado:** não deixa salvar (obrigatório).
- [x] **T-2.6** 🟢 Deixar **bitola** ou **tonalidade** vazias → **Esperado:** não deixa salvar (obrigatórios).
- [x] **T-2.7** 🟢 Foto por **upload** de arquivo → **Esperado:** recorta quadrado e mostra prévia.
- [x] **T-2.8** 🟡 Foto por **link do catálogo** (colar URL de imagem) → **Esperado:** baixa e mostra a imagem.
- [x] **T-2.9** 🟢 Salvar o cadastro completo → **Esperado:** produto aparece no Estoque.

**Bug/obs:**
Foto na lista da sessão de estoque nao esta no formato correto (deveria ser quadrada e esta retangular para cima)

---

## Bloco 3 — Estoque, lotes e edição

- [x] **T-3.1** 🟢 Buscar o produto pelo nome e pela referência → **Esperado:** encontra nos dois.
- [x] **T-3.2** 🟢 Novo cadastro com o **mesmo nome/referência** → **Esperado:** reconhece produto existente e vira "novo lote" (mantém medidas/preço).
- [x] **T-3.3** 🟢 Abrir o detalhe → **Novo lote** com código diferente e outra quadra.
- [x] **T-3.4** 🟢 Tentar cadastrar lote com **código já usado** → **Esperado:** bloqueia com aviso.
- [x] **T-3.5** 🟢 Editar produto: mudar m²/caixa → **Esperado:** avisa que vale para todos os lotes; aplica.
- [x] **T-3.6** 🟢 Editar lote: mudar bitola/tonalidade → **Esperado:** salva; localização só muda por Ajustes.
- [x] **T-3.7** 🟡 Cadastrar produto com limite alto (ex.: avisar em `50`) e poucas caixas (ex.: `10`) → **Esperado:** selo **Estoque baixo** (laranja) + aviso no sino.
- [x] **T-3.8** 🟡 Zerar o estoque de um produto (via perda/correção) → **Esperado:** selo **Esgotado** + aviso no sino.

**Bug/obs:**
Bloqueia o mesmo valor do lote mesmo se o produto for diferente e de outra marca (deve restringir apenas se for o mesmo produto)

---

## Bloco 4 — Clientes

- [x] **T-4.1** 🟢 Novo cliente com **CPF válido** → **Esperado:** aceita.
- [x] **T-4.2** 🟢 Digitar **CPF inválido** (dígito errado) → **Esperado:** avisa "confira os dígitos".
- [x] **T-4.3** 🟢 Cadastrar com **CNPJ** (14 dígitos) → **Esperado:** máscara alterna sozinha para CNPJ.
- [x] **T-4.4** 🟢 Cadastrar outro cliente com o **mesmo documento** → **Esperado:** bloqueia (já cadastrado).
- [x] **T-4.5** 🟢 Adicionar **2 endereços/obras** ao cliente → **Esperado:** salvam com apelido.
- [x] **T-4.6** 🟢 Telefone: digitar 11 dígitos → **Esperado:** vira `(31) 90000-0000`.

**Bug/obs:**

---

## Bloco 5 — Reservas e pedidos

- [x] **T-5.1** 🟢 Nova reserva → escolher cliente com obra → **Esperado:** dá pra escolher o endereço ou "Retirada na loja".
- [x] **T-5.2** 🟢 Adicionar **2 itens** (lotes diferentes) ao carrinho → **Esperado:** total soma caixas e valor.
- [x] **T-5.3** 🟢 Informar caixas **acima do disponível** (entrega próxima) → **Esperado:** bloqueia com "reduza para no máximo N".
- [x] **T-5.4** 🟢 Número do pedido: tentar letras → **Esperado:** só aceita dígitos. Deixar vazio → não confirma.
- [x] **T-5.5** 🟢 Repetir um número de pedido existente → **Esperado:** bloqueia (já usado).
- [x] **T-5.6** 🟢 Data prevista `31/02/2026` → **Esperado:** "data inexistente". Data no passado → "não pode estar no passado".
- [x] **T-5.7** 🟢 Confirmar a reserva → **Esperado:** aparece na lista; o disponível do lote cai.
- [x] **T-5.8** 🟡 Nova reserva com data **distante (3+ meses)** → **Esperado:** aparece o painel de regime (rotaciona) com o toggle "manter reservado agora".
- [x] **T-5.9** 🟢 Ver pedido / Editar pedido / Editar reserva → **Esperado:** abrem e salvam as alterações.

**Bug/obs:**

---

## Bloco 6 — Entrega

- [x] **T-6.1** 🟢 Confirmar entrega **total** de uma reserva → **Esperado:** status vira entregue; estoque baixa.
- [x] **T-6.2** 🟢 Entrega **parcial** (menos que o saldo) → **Esperado:** "restarão N cx em aberto"; status parcial.
- [x] **T-6.3** 🟡 Entregar de um lote em **2 quadras** → **Esperado:** mostra a divisão sugerida; soma tem que bater com o total.
- [ ] **T-6.4** 🔴 Reserva **rotacionando** com lote original insuficiente → **Esperado:** oferece outro lote do mesmo produto. (Exige montar o cenário de estoque.)

**Bug/obs:**

---

## Bloco 7 — Devolução

- [x] **T-7.1** 🟢 Registrar devolução de uma entrega → escolher quadra de destino → **Esperado:** caixas voltam ao estoque naquela quadra.
- [x] **T-7.2** 🟢 Tentar devolver **mais** do que foi entregue → **Esperado:** bloqueia (máximo = entregue).

**Bug/obs:**

---

## Bloco 8 — Ajustes de estoque

- [x] **T-8.1** 🟢 Adicionar estoque (entrada) num lote → **Esperado:** soma as caixas; aviso silencioso de reposição.
- [x] **T-8.2** 🟢 Registrar perda **sem motivo** → **Esperado:** não deixa (motivo obrigatório).
- [x] **T-8.3** 🟢 Registrar perda com motivo → **Esperado:** disponível cai; entra no histórico do produto.
- [x] **T-8.4** 🟢 Mover caixas de uma quadra para outra (parcial) → **Esperado:** lote passa a ocupar as duas; estoque total igual.
- [x] **T-8.5** 🟢 Corrigir quantidade abaixo do comprometido (reserva+perda) → **Esperado:** bloqueia com aviso.
- [x] **T-8.6** 🟢 No cartão de uma quadra, tocar no selo Disponível/Ocupada → **Esperado:** alterna e entra no histórico.
- [x] **T-8.7** 🟡 Criar reservas que somem **mais** que o estoque de um produto → **Esperado:** aviso "Promessa em risco" no sino; ao repor, "estoque cobre os pedidos".

**Bug/obs:**
Perda nao esta abaixando o valor nas quadras (consegui mover um lote de 10 cx que tinha 10 cx de perda (deveria ter zerado na quadra))

---

## Bloco 9 — Configurações e papéis (o mais importante)

### Usuários

- [x] **T-9.1** 🟢 Criar usuário **gerente** (login + senha) e um **vendedor**.
- [x] **T-9.2** 🟢 Tentar criar/editar como **admin** pela tela → o papel admin **não** aparece nas opções.
- [ ] **T-9.3** 🟢 Desativar e reativar um usuário; excluir um de teste.
- [ ] **T-9.4** 🟢 Tentar excluir o **último admin** → **Esperado:** bloqueado.

### Login como GERENTE

- [x] **T-9.5** 🟢 Cria e edita produto (incl. foto por link) → **Esperado:** funciona.
- [ ] **T-9.6** 🟢 No detalhe do produto, **não** vê "Excluir produto".
- [x] **T-9.7** 🟢 **Não** vê a seção **Configurações** no menu.
- [x] **T-9.8** 🟢 Opera reservas, entregas, clientes e ajustes normalmente.

### Login como VENDEDOR

- [x] **T-9.9** 🟢 Nenhum botão de criar/editar/excluir em nenhuma tela.
- [x] **T-9.10** 🟢 Sem ação principal/FAB; sem Configurações; o toggle de quadra vira só um selo (não clica).
- [x] **T-9.11** 🟢 Consegue **consultar** estoque, preço, disponível e reservas.

**Bug/obs:**
GERENTE: esta conseguindo excluir produto

---

## Bloco 10 — Perfil e senha

- [x] **T-10.1** 🟢 Perfil → trocar senha com a **senha atual errada** → **Esperado:** "senha atual incorreta".
- [x] **T-10.2** 🟢 Nova senha com menos de 6 caracteres → **Esperado:** avisa o mínimo.
- [x] **T-10.3** 🟢 Trocar a senha corretamente e **relogar** com a nova → **Esperado:** entra.
- [x] **T-10.4** 🟢 No vendedor, o bloco de trocar senha **não** aparece.

**Bug/obs:**

---

## Bloco 11 — Notificações (sino)

- [x] **T-11.1** 🟢 Abrir o sino → **Esperado:** os avisos atuais ficam marcados como vistos (sem botão manual).
- [x] **T-11.2** 🟡 Logar em **outra conta** e conferir que o "visto" é **separado** por usuário.
- [x] **T-11.3** 🔴 Duas abas/aparelhos abertos: gerar um aviso numa → **Esperado:** aparece na outra sem F5 (tempo real).

**Bug/obs:**
Realtime do supabase nao esta funcionando nas notificações, o tempo da notificação só altera após o reload da pagina.
Remover o "Q5" das notificaçoes

---

## Bloco 12 — Encomenda no relógio (E-03)

- [ ] **T-12.1** 🔴 Reserva rotacionando, sem cobertura, com data dentro da janela (≤ 30 dias) → **Esperado:** aviso "Encomenda em risco". _Difícil sem manipular datas — testar com data prevista próxima e estoque insuficiente._

**Bug/obs:**

---

## Bloco 13 — Pendente: tablet (quando chegar o aparelho)

Ainda **não** dá pra testar (tablet não adquirido). Deixar reservado:

- [ ] **T-13.1** Instalar o PWA e abrir pela home (standalone).
- [ ] **T-13.2** Viewport correto (barra inferior sem faixa; conteúdo não sob a status bar).
- [ ] **T-13.3** Teclado **numérico** abre nos campos de preço/caixas/telefone/quadra.
- [ ] **T-13.4** Conta de vendedor compartilhada: só leitura no aparelho da loja.

**Bug/obs:**

---

## Reteste dos fixes (2026-07-17)

Os 6 achados da rodada acima foram corrigidos (commits do dia + migrations
aplicadas no banco de teste). Itens 4 e 6 foram vistos na VERCEL — rode
`vercel --prod` antes de retestá-los lá (local já tem tudo).

- [ ] **R-1** Gerente: produto com 1 lote só → botão "Excluir lote" desabilitado (com explicação). Com 2+ lotes, excluir o extra funciona. Produto some SÓ pelo "Excluir produto" do admin.
- [ ] **R-2** Descarte: registrar perda de 10 cx → Ajustes → **Descartar caixas perdidas** → quadra zera, contador de perda zera, disponível não muda. Depois, Corrigir contando 0 → aceita. Histórico mostra os dois atos.
- [ ] **R-3** Mensagem da correção bloqueada agora indica o caminho (descarte e/ou reservas), sem mandar "cancelar reservas" quando o problema é perda.
- [ ] **R-4** Lote: mesmo código em produtos/marcas DIFERENTES → aceita. Mesmo produto → continua bloqueando.
- [ ] **R-5** Erro de reserva acima do disponível → mensagem limpa, sem "(Q5)".
- [ ] **R-6** Sino: tempo relativo ("15 min") atualiza sozinho após ~1 min, sem F5.
- [ ] **R-7** Foto na lista de Estoque: thumb quadrado (após redeploy). Se AINDA sair retangular, inspecionar o elemento e anotar a regra CSS vencedora.
- [ ] **R-8** (fix de 2026-07-18, refaz o R-4 que falhou) Cadastrar produto NOVO com código de lote igual ao de OUTRO produto → salva sem erro e aparece no Estoque na hora. Repetir o código dentro do MESMO produto → continua bloqueando (mensagem orienta Adicionar estoque / sufixo). Se der erro no salvar, NADA pode ficar pela metade: o nome do produto deve continuar livre pra tentar de novo.

**Bug/obs:**

---

## Registro de bugs encontrados

| #   | Tela | O que aconteceu | Esperado | Severidade |
| --- | ---- | --------------- | -------- | ---------- |
|     |      |                 |          |            |
