# Art Piso - Handoff de Escopo Inicial

> Sistema de controle de estoque para loja/deposito de pisos.
> Documento vivo de continuidade: entendimento do produto, escopo primordial, decisoes herdadas, perguntas abertas e limites para frontend/backend.

---

## 1. Estado atual

O projeto Art Piso esta em fase de brainstorm, organizacao de escopo e preparacao para futura implementacao.

Ainda nao estamos criando frontend, backend novo, estrutura definitiva de pastas ou deploy. O foco atual e entender o que um controle de estoque de pisos precisa ter de forma primordial, separar obrigatorio de opcional e registrar perguntas que precisam ser levadas ao dev/cliente.

Material tecnico ja recebido:

- `art_piso_0_0_1_schema.sql`: schema inicial Supabase/Postgres.
- `CLAUDE.md`: guia operacional para agentes de IA no projeto.
- `Memoria.md`: memoria viva do projeto.

---

## 2. Objetivo do produto

Criar um sistema simples e confiavel para controlar estoque de pisos por produto, lote e localizacao fisica.

O sistema precisa responder rapidamente:

- Qual produto existe?
- Qual lote existe?
- Onde esta no deposito?
- Quantas caixas existem fisicamente?
- Quantas caixas estao reservadas?
- Quantas caixas foram registradas como perda?
- Quantas caixas ainda estao disponiveis para venda?
- Qual e a equivalencia em m2?

O objetivo nao e mostrar todas as colunas do banco no frontend. O objetivo e o backend manter os dados e calculos corretos, enquanto o frontend mostra uma leitura enxuta e orientada a decisao.

---

## 3. Principio de frontend enxuto

O backend pode e deve ter varios campos, regras e calculos. O frontend nao deve transformar cada campo em uma coluna visual.

Principio:

> Guardar completo no backend. Mostrar simples no frontend.

Exemplo:

O backend pode entregar:

- `caixas_estoque`
- `caixas_reserva`
- `caixas_perda`
- `caixas_disponivel`
- `m2_estoque`
- `m2_reserva`
- `m2_perda`
- `m2_disponivel`

Mas a tela principal pode mostrar inicialmente algo mais limpo:

- Produto
- Lote
- Quadra
- Disponivel
- Status/alerta
- Acoes

Detalhes como estoque total, reserva, perda, m2 por caixa e historico podem ficar em painel expandido, modal, drawer ou tela de detalhe.

---

## 4. Conceitos do dominio

### Produto / referencia

Representa o piso como item comercial.

Exemplo:

- Referencia: `POR-6060-BL`
- Marca: `Portinari`
- Tamanho nominal: `60x60`

O produto nao e sozinho a unidade real do estoque, porque o mesmo produto pode existir em varios lotes.

### Lote

E a unidade real de controle do estoque de piso.

Em pisos, lotes diferentes podem ter variacao de tonalidade, calibre ou fabricacao. Por isso, dois lotes do mesmo produto podem nao ser ideais para misturar na mesma obra.

Regra herdada do schema:

> Identidade do estoque = Produto + Lote.

### Quadra

Representa a localizacao fisica no deposito.

O schema atual assume:

> Um lote fica em uma quadra. Uma quadra pode ter varios lotes.

Essa decisao ainda precisa ser confirmada com o dev/cliente, porque se um mesmo lote puder ficar dividido entre varias quadras, o modelo muda.

### Caixas e m2

A fonte da verdade do estoque e em caixas.

O m2 deve ser calculado:

`m2 = caixas x m2_por_caixa`

`m2_por_caixa` fica no lote, nao no produto, porque o fabricante pode alterar a metragem por caixa em lotes diferentes.

---

## 5. Stack pretendida

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind (PWA) |
| Backend / DB | Supabase self-hosted (Postgres + Auth + Storage + RLS) |
| Infra | VPS via Docker |
| Backend proprio | Fastify apenas se Supabase/RLS/RPC nao cobrirem alguma regra |

Decisao herdada:

- Um unico PWA deve adaptar a interface conforme o papel do usuario.
- Permissoes criticas devem ser reforcadas no banco com RLS, nao apenas escondidas no frontend.

---

## 6. Escopo P0 - Primordial

P0 e tudo que precisa existir para o estoque ser minimamente confiavel.

### 6.1 Cadastro de produto

Campos primordiais:

- referencia/codigo
- marca
- tamanho nominal
- descricao curta, se ajudar na identificacao

Objetivo:

Permitir identificar o piso comercialmente, antes de controlar seus lotes.

### 6.2 Cadastro de lote

Campos primordiais:

- produto vinculado
- codigo/numero do lote
- quadra/localizacao
- m2 por caixa
- caixas em estoque
- caixas de perda

Objetivo:

Controlar o estoque no nivel correto para pisos: produto + lote.

### 6.3 Controle de quadra

Campos primordiais:

- numero da quadra
- descricao opcional

Objetivo:

Permitir localizar o material dentro do deposito.

Pergunta bloqueadora:

- Um mesmo lote pode ficar em mais de uma quadra?

### 6.4 Estoque calculado

Metricas primordiais:

- Estoque
- Reserva
- Perda
- Disponivel

Regra:

`Disponivel = Estoque - Reserva - Perda`

Esses valores devem existir em caixas e em m2, mas o frontend nao precisa exibir tudo em colunas separadas.

### 6.5 Reserva / pedido

Campos primordiais:

- numero do pedido
- lote reservado
- quantidade em caixas
- cliente
- vendedor
- status

Status primordiais:

- `reservado`
- `entregue`
- `cancelado`

Objetivo:

Reservar caixas de um lote especifico para um cliente/pedido.

### 6.6 Baixa por entrega

Regra primordial:

- Quando uma reserva muda para `entregue`, o estoque fisico do lote deve baixar.
- Quando uma reserva deixa de ser `entregue`, deve haver estorno/devolucao das caixas ao estoque.

### 6.7 Cancelamento de reserva

Regra primordial:

- Uma reserva cancelada deixa de contar como reserva.
- As caixas voltam a aparecer como disponiveis, desde que nao tenham sido entregues.

### 6.8 Bloqueio de reserva acima do disponivel

Regra primordial:

- O sistema nao deve permitir reservar mais caixas do que o disponivel, salvo se o dev/cliente confirmar uma excecao de negocio.

Observacao tecnica:

- O schema inicial ainda nao implementa essa validacao de forma forte no banco.
- Esta validacao deve ser resolvida antes de producao, preferencialmente no backend/banco, nao apenas no frontend.

### 6.9 Papeis basicos

Papeis herdados:

| Papel | Permissao esperada |
|---|---|
| admin | Gerencia usuarios, produtos, lotes, reservas e configuracoes |
| vendedor | Consulta estoque, cria reservas e cancela reservas permitidas |
| gerente | Da entrada de estoque, registra perda, gerencia quadras e marca entrega |

RLS atual e baseline. Precisa ser refinado antes de producao.

---

## 7. Escopo P1 - Importante

P1 deve ser previsto, mas nao deve travar o entendimento inicial.

- Busca por referencia, marca, lote, quadra e disponibilidade.
- Filtros simples para a tela de estoque.
- Foto principal do produto para identificacao.
- Data prevista de entrega.
- Regras mais refinadas por papel.
- Historico simples de entradas e perdas.
- Alerta de estoque baixo.
- Reservas antigas ou vencidas.
- Visualizacao de detalhes do lote sem poluir a tabela principal.

---

## 8. Escopo P2 - Opcional / futuro

P2 nao deve entrar como obrigatorio agora, salvo confirmacao explicita.

- Entrega parcial.
- Auditoria completa de todas as movimentacoes.
- Nota fiscal.
- Codigo de barras.
- Multiplas fotos por produto.
- Relatorios avancados.
- Dashboard gerencial completo.
- Enderecamento mais detalhado que quadra, como rua, prateleira ou posicao.
- Aplicativo separado por papel.
- Backend proprio em Fastify, caso Supabase seja suficiente.

---

## 9. Modelo de dados herdado

O schema inicial define:

| Tabela/view | Papel |
|---|---|
| `profiles` | Espelha `auth.users`; guarda nome e role |
| `quadras` | Locais fisicos do deposito |
| `produtos` | Referencia comercial do piso |
| `lotes` | Unidade real de estoque: produto + lote |
| `reservas` | Pedidos/reservas vinculados a lote |
| `vw_estoque` | View principal com estoque, reserva, perda e disponivel calculados |

Enums:

- `user_role`: `admin`, `vendedor`, `gerente`
- `reserva_status`: `reservado`, `entregue`, `cancelado`

`vw_estoque` deve ser tratada como candidata principal para alimentar a tela de estoque.

---

## 10. Regras herdadas do schema

### Decisoes boas que devem ser preservadas

- Produto + lote define a identidade do estoque.
- Caixas sao a fonte da verdade.
- m2 e sempre derivado.
- `m2_por_caixa` fica no lote.
- Reserva e disponivel nao sao digitados manualmente.
- Disponivel vem de estoque menos reserva menos perda.
- Mudanca para `entregue` baixa estoque fisico.
- Saida de `entregue` estorna estoque.
- Permissao deve ser reforcada com RLS.

### Pontos que precisam evoluir

- Validacao contra reserva acima do disponivel.
- Refinamento de RLS por papel.
- Decisao sobre lote em uma ou varias quadras.
- Decisao sobre historico de entrada/perda.

---

## 11. Fluxos primordiais

### Fluxo: cadastrar produto e lote

1. Cadastrar produto/referencia.
2. Cadastrar lote vinculado ao produto.
3. Informar quadra.
4. Informar m2 por caixa.
5. Informar caixas em estoque.

Resultado esperado:

- Lote aparece na tela de estoque com disponibilidade calculada.

### Fluxo: consultar estoque

1. Usuario acessa tela principal.
2. Sistema lista produto/lote/quadra.
3. Sistema mostra disponibilidade de forma resumida.
4. Usuario pode abrir detalhes para ver estoque, reserva, perda e m2.

Resultado esperado:

- Usuario entende rapidamente o que pode vender/reservar.

### Fluxo: criar reserva

1. Vendedor escolhe produto/lote.
2. Informa quantidade de caixas.
3. Informa cliente e numero do pedido.
4. Sistema valida disponibilidade.
5. Reserva fica com status `reservado`.

Resultado esperado:

- Quantidade reservada deixa de aparecer como disponivel.

### Fluxo: cancelar reserva

1. Usuario autorizado cancela reserva.
2. Status muda para `cancelado`.

Resultado esperado:

- Quantidade volta ao disponivel.

### Fluxo: marcar entrega

1. Gerente/admin marca reserva como `entregue`.
2. Sistema baixa estoque fisico do lote.

Resultado esperado:

- Estoque fisico diminui.
- Reserva deixa de contar como reserva ativa.

### Fluxo: registrar perda

1. Gerente/admin registra quantidade perdida.
2. Sistema atualiza perda do lote.

Resultado esperado:

- Disponivel diminui.

Observacao:

- No schema atual, perda e uma coluna consolidada, nao um historico.

---

## 12. Perguntas abertas para dev/cliente

Estas perguntas nao devem travar o brainstorm, mas precisam ser respondidas antes do fechamento definitivo do escopo.

1. Um mesmo lote pode ficar dividido em mais de uma quadra?
2. A Art Piso vende/controla na pratica por caixa, por m2 ou pelos dois?
3. O vendedor escolhe um lote especifico ao reservar ou escolhe o produto e o sistema sugere o lote?
4. Reserva pode ser maior que o disponivel em algum caso especial ou deve ser sempre bloqueada?
5. Uma reserva/pedido pode ter entrega parcial?
6. Depois de criada, uma reserva pode ter quantidade, lote ou cliente alterados?
7. A perda precisa de historico desde o inicio ou uma coluna consolidada basta para a primeira versao?
8. Entrada de estoque precisa ter historico desde o inicio ou basta ajustar o estoque do lote?
9. Quadra e suficiente como localizacao ou existe necessidade de rua, prateleira ou posicao?
10. Reserva tem prazo de validade?
11. Vendedor pode ver todas as reservas ou apenas as proprias?
12. Vendedor pode cancelar qualquer reserva ou apenas as proprias?
13. Gerente pode alterar dados do cliente ou apenas marcar entrega/ajustar estoque?
14. Produto precisa obrigatoriamente de foto na primeira versao?
15. O cliente precisa identificar produto por codigo de barras, referencia manual ou ambos?

---

## 13. Criterios para nao perder o foco

Antes de adicionar uma nova regra ao escopo P0, perguntar:

- Sem isso o estoque fica errado?
- Sem isso o usuario nao consegue vender/reservar/entregar?
- Sem isso existe risco de divergencia entre estoque fisico e sistema?
- Sem isso o backend pode aceitar uma operacao invalida?

Se a resposta for nao, provavelmente e P1 ou P2.

---

## 14. Proximos passos sugeridos

1. Continuar brainstorm do escopo primordial.
2. Validar perguntas abertas com dev/cliente.
3. Refinar o schema se alguma resposta mudar o modelo.
4. Depois disso, desenhar a estrutura de pastas do projeto.
5. Depois disso, desenhar o frontend com base no P0, evitando excesso de colunas.

---

Versao do documento: 0.0.2 - revisao de escopo priorizado sobre a base 0.0.1.
