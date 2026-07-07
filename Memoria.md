# Memoria do Projeto

Estado vivo do Art Piso: regras validadas, decisoes, perguntas abertas, aprendizados, proximos passos.

`CLAUDE.md` e o cerebro/roteador. `Memoria.md` e o estado persistente. **Nao virar log de implementacao**: o que o codigo faz / qual arquivo / qual helper e fonte do REPO; aqui fica o PORQUE (decisoes, descartes, pendencias, armadilhas). O `art_piso_mapa_de_regras.md` (raiz) e a visao CURADA de regras (base do handoff visual) — nao duplicar; so acrescentar la.

## Estado Atual

- Fase de estruturacao/lapidacao. Ainda NAO ha app final: e um MOCK interativo. App em `Art Piso/App/` (React + Vite + TS + Tailwind + base shadcn-style), tema escuro padrao.
- Dados em mock com STORE COMPARTILHADO (`src/store/inventory.ts` + `inventory-provider.tsx`): acoes propagam entre telas; SEM persistencia (reseta no reload) ate o Supabase.
- Telas (sidebar): **Estoque** (tela unica de inventario, por produto — "Produtos e Lotes" foi fundida aqui), **Reservas**, **Clientes**, **Ajustes de Estoque**, **Configuracoes**. Login/logout mock (`SignInPage`), sem auth real. So papel `admin` no ambiente (ver PH-11).
- Notificacoes (sino) com store proprio (`notifications`), som + animacao, gatilhos reais; sem persistencia. CATALOGO COMPLETO do que e notificado (toca o sino x badge silencioso x nao notifica) curado em `art_piso_mapa_de_regras.md` (`H-04`) — fonte unica; nao duplicar aqui.
- Stitch (`Art Piso/Google Switch/`) = referencia visual, nao spec. Materiais do Dev em `Art Piso/Handoff/`.
- Localhost: `http://127.0.0.1:5173/`.
- Implementado em jun/2026 (detalhe nas Decisoes): ocupacao derivada das Quadras, tag de regime da reserva, Secao de Clientes (entidade), R-07 PEDIDO MULTI-ITEM (carrinho na Nova reserva, criarPedido, Ver pedido nivel-pedido, editor de pedido `editarPedido`, ordenacao/elo/agrupamento na lista), R-08 ESTORNO/DEVOLUCAO (status `estornado`, EstornoDrawer, historico de devolucoes no Ver pedido).
- Vendedor: campo "Vendedor" REMOVIDO da visualizacao de pedidos (nao agrega — um unico acesso compartilhado). Cadastro de usuarios em Configuracoes continua intacto; `vendedor_id` permanece no schema. Mock renomeado de "Lucas Martins" para "Vendedor" / vendedor@artpiso.com.br.

## Regras Persistentes

- O usuario quer que suas falas sejam tratadas como pensamento em construcao, nao verdades intocaveis.
- O agente tem liberdade para ser critico, complementar, questionar, apontar riscos e propor melhorias.
- Evitar perguntar de novo sobre algo ja validado/registrado aqui, salvo conflito claro com novo contexto.
- Problemas cruciais: registrar com causa, solucao aplicada e prevencao.
- Responder sempre em PORTUGUES (PT-BR).
- Nao criar HTML unico gigante para o app. Nao duplicar documentos com a mesma funcao.
- Backend/schema guia o frontend, mas nao engessa a experiencia visual. Frontend minimiza colunas visiveis e usa detalhes sob demanda.
- Caixas sao valor primario; m2 e apoio calculado. Disponivel = Estoque - Reserva - Perda.
- Papeis do sistema: `admin`, `vendedor`, `gerente`.
- Nada de `<select>`/`<input type=...>` cru: usar `SelectMenu` e demais componentes do design system. Padrao de UI repetivel (dropdown, menu, picker) vira componente reutilizavel em `components/ui/`.
- Meta-regra: correcao/lapidacao do usuario vira REGRA persistente aqui (pra nao repetir o erro e reaplicar o recurso em casos semelhantes), nao ajuste pontual esquecido.
- PADRAO DE LABEL (decisao do usuario, 2026-07-07): campo opcional NAO anuncia "(opcional)" no label — o rotulo fica limpo (ex.: "Bitola", "Referência", "Tamanho (cm)"). Obrigatoriedade e papel da validacao, nao do texto do campo. Excecao: hints/subtextos descritivos (ex.: "Opcional · JPG ou PNG" na foto) podem continuar.
- CADENCIA DE GIT (autorizacao permanente do usuario, 2026-07-07): commitar ao FIM DE CADA ETAPA concluida e verificada, sem pedir de novo a cada vez. Commits pequenos e bem-escopados (1 etapa = 1 commit). Push continua so por pedido explicito.
- Stitch e norte de referencia, NAO spec fiel: serve para (1) direcao visual e (2) inventario do que falta ligar. Filtrar pelo escopo: o que o Stitch traz e nao existe pra gente (papel errado, botao fora de lugar) e descartado.

## Decisoes

### Inventario / Estoque
- Estoque e a TELA UNICA de inventario, por PRODUTO (agrupado por referencia). "Produtos e Lotes" foi eliminada (duplicava o detalhe do lote).
- REFERENCIA E TAMANHO OPCIONAIS no cadastro de produto (decisao do usuario, IMPLEMENTADO 2026-07-07). Consequencia estrutural: a IDENTIDADE do produto migrou de `referencia` para `produtoId` (novo campo em `LoteEstoque`; `Produto.id`) — agrupamento (`agruparPorProduto`), selecao no Estoque, remover/atualizar produto e os observadores de notificacao agora usam o id (referencia virou DADO exibicional; some da UI quando vazia, junto com tamanho). Alinha o mock ao schema Supabase (`produtos.id uuid`). Referencia ficou EDITAVEL no `EditarProdutoDrawer` (da pra preencher depois num produto criado sem ela). Reaproveitamento no cadastro: match por referencia (quando digitada) OU nome exato — produto existente reusa o produtoId dele. PENDENCIA FASE 2: no schema, `produtos.referencia text not null unique` precisa virar nullable (ou unique parcial) pra acompanhar.
- Status de lote/produto e DERIVADO do disponivel (nao gravado). Produto so fica esgotado quando o produto INTEIRO zera (lote esgotado nao rebaixa o produto). Card de alerta = "Estoque a repor", conta PRODUTOS baixo/esgotado (nao lotes — lote esgotado nunca e recomposto, entra lote novo).
- Excluir lote/produto/cliente: BLOQUEAR quando ha reserva/pedido ATIVO (evita orfa). Renomear codigo de lote faz cascata no vinculo das reservas.
- Perda = a CAIXA inteira vira perda; nº de pisos quebrados e informativo (nao recalcula disponivel fracionado).

### Quadras (Q-01, feito 2026-06-20)
- Status DERIVADO, nao manual: **Disponivel** (ainda cabe estoque; junta vazia + parcial) x **Ocupada** (cheia, caixas >= capacidade) + BARRA DE PROGRESSO em % de ocupacao. Decisao do usuario simplificou o vazia/parcial/cheia.
- Campo `Quadra.capacidade?` (caixas, OPCIONAL): sem ela nao ha %, so contagem ("N lotes · M cx · sem capacidade") e fica sempre Disponivel. Ocupacao usa CAIXAS FISICAS (`caixasEstoque`) — caixa reservada ainda ocupa espaco.
- Quadras vivem em Ajustes de Estoque (sem tela propria). Capacidade configurada no `QuadraDrawer`.

### Reservas
- `ReservaDrawer` e unico: Estoque abre com lote fixo, Reservas com seletor de lote. m2 sempre derivado (nao digitavel); bloqueio acima do disponivel (Q5). Entrega pode ser parcial (Q6). CPF/CNPJ obrigatorio (PH-10).
- Filtro de VENDEDOR removido de Reservas: vendedor vem do usuario LOGADO (`reservas.vendedor_id`), nao digitado; poucos usuarios. NAO remover `vendedor_id` do schema. Reservas = abas de status + busca.
- Regime da reserva (E-06, feito visual 2026-06-20): eixo ORTOGONAL ao status de ciclo. `Reserva.regime` (`aguardando` | `rotacionando` | `travado`; ausente = aguardando). Tag `RegimeTag` em Reservas e no detalhe. Ligado ao modelo de encomenda (secao abaixo) — ja comecou a entrar no codigo (`lib/reserva-regime.ts`).
- Vocabulario padronizado em "entrega/entregue" (nao "retirada"). Idem no regime: a UI fala em SEPARAR caixas (acao concreta do deposito), nao "travar". Painel do toggle (`RegimeTogglePanel`) explica que entrega distante = encomenda e que por padrao nao separa agora; on = "Separadas agora: X de Y cx"; aviso laranja so quando ha DEFICIT REAL (ligou o separar e falta estoque). Helper da data = "Opcional. Sem data = entrega imediata." REFORCO (2026-06-21): o card de metrica de Reservas e o dialogo de cancelamento diziam "Caixas travadas"/"caixas travadas" — ALINHADO para "Caixas separadas"/"caixas separadas" (titulo casava com o subtitulo "Separadas no estoque"). EXCECAO consciente: a TAG de regime continua "Travado" (e o MODO da reserva, conceito diferente da acao fisica de separar caixas).
- Ver pedido (`DetalhesReservaDrawer`): mostra "Separadas agora: X de Y cx" (NEUTRO). REMOVIDO o "Pendente para travar" que aparecia em laranja para toda rotacao saudavel (alarme falso: `caixas - travadas` = tudo). Quando rotacionando, nota neutra "serao separadas conforme a entrega se aproxima". O alerta de DEFICIT REAL (estoque livre nao cobre o pedido) fica para quando entrar a logica de estoque livre / anti-furo do modelo de encomenda.
- Cor de ATENCAO do regime ("Rotacionando") unificada com "Baixo estoque" no token `lowstock` (#f97316, `tokens.css` @theme): badge "Baixo estoque", `RegimeTag` rotacionando, `RegimeTogglePanel` e "Entrega prevista" rotacionando do detalhe usam o mesmo token.
- Cancelar reserva captura MOTIVO (opcional): Textarea no `ConfirmDialog` (que ganhou slot `children` reutilizavel); `cancelarReserva(id, motivo)` grava em `Reserva.motivoCancelamento`; exibido em bloco no "Ver pedido" de reservas canceladas.
- DISPONIVEL x REGIME (regra CONFIRMADA, ja no codigo via `caixasTravadasReserva` em `lib/reserva-regime.ts`): o disponivel desconta apenas as caixas TRAVADAS/separadas, NAO o total reservado. `rotacionando` trava 0 -> NAO consome disponivel (estoque gira ate a data); `aguardando`/`travado` travam o total -> consomem. `caixasReserva` do lote e DERIVADO em runtime (`estadoInicial`/`reservadasDoLote`), entao o valor no seed do `mock-inventory.ts` e so cosmetico e DEVE casar com o runtime (hoje casa). Efeito colateral conhecido e ACEITO: caixas de pedido rotacionando aparecem como disponiveis no Estoque sem aviso — e o furo anti-overbooking deixado de proposito para o modelo de encomenda (PH-3/4/5). CONSEQUENCIA NA ENTREGA: lote original pode estar esgotado quando a entrega chegar; resolvido via TROCA DE LOTE NA ENTREGA (IMPLEMENTADO 2026-06-25).
- TROCA DE LOTE NA ENTREGA (rotacionando, IMPLEMENTADO 2026-06-25): ao registrar entrega de pedido rotacionando, o `EntregaDrawer` verifica `caixasDisponiveis(loteOriginal) >= quantidade`. Se insuficiente: aviso laranja + `SelectMenu` com lotes do mesmo produto que cubram a quantidade; se nenhum cobre: erro vermelho + botao desabilitado (aguardar reposicao). A troca so e permitida em `status === 'reservado'`: apos a 1a entrega parcial (`status === 'parcial'`) o lote fica fixo via R-05. Ao confirmar com lote alternativo: `entregarReserva` (provider) recebe `input.loteId`; baixa `caixasEstoque` do lote escolhido; atualiza `reserva.lote` e `reserva.quadra`; grava `entrega.lote` no historico (`EntregaReserva.lote? novo campo`). `DetalhesReservaDrawer` exibe o lote junto de cada entrega quando houve troca. SEED: `L-3011` adicionado ao Porcelanato Cinza Concreto (25 cx) para exercitar o seletor.
- R-07 DECIDIDO (2026-06-25): PEDIDO MULTI-ITEM em formato CARRINHO. A "Nova reserva" deixa de ser de 1 item: o vendedor preenche PEDIDO e CLIENTE 1x (nivel do pedido) e adiciona ITENS lote a lote (produto c/ AUTOCOMPLETE -> lote -> quantidade -> "+ Adicionar item"). UNIDADE do item = LOTE: o MESMO produto entra varias vezes (1 por lote). GUARDA-CORPOS: item CAPADO no disponivel do lote (R-01); lote ja adicionado SOME do seletor (sem repetir o mesmo lote, bloqueio na origem). Ao CONFIRMAR cria 1 LINHA por item (= 1 reserva = 1 lote), todas com o MESMO PED-XXXX e o MESMO cliente -> preserva R-01. Tela de Reservas: linhas SEPARADAS (nao mescla); colunas PEDIDO e CLIENTE ORDENAVEIS (clicaveis, com setinha ▲▼): ordenar por Pedido agrupa o pedido em bloco (visao R-07), por Cliente agrupa o historico do cliente (visao R-09); ICONE DE ELO marca linhas do mesmo PED (complementa a ordenacao, nao substitui). CICLO DE VIDA POR LINHA, independente (entrega/cancela sozinha; casa com R-05). PEDIDO = agrupamento LEVE (criar junto + vinculo visual), NAO transacao atomica. Campo PEDIDO volta a ser MANUAL (reverte PH-7 / a remocao feita na fase 2 dos Clientes). DESCARTADO: distribuicao automatica (superada pelo carrinho manual) e "reserva multi-produto numa linha" (quebraria R-01). IMPLEMENTADO (2026-06-25): construtor carrinho no `ReservaDrawer` (a area Produto/Lote virou mini-builder: CLIENTE no TOPO como 1a secao, Autocomplete de lote digitavel, "Adicionar item" so aparece DEPOIS de escolher um lote, faixa Quadra/Disponivel sem repetir o lote); acao `criarPedido` (provider) cria N reservas com 1 PED + 1 notificacao unica; campo "Numero do pedido" MANUAL dentro de "Dados do pedido", pre-preenchido por `proximoNumeroPedido` (helper compartilhado em mock-inventory, reusado pelo provider). Tela de Reservas: colunas Pedido/Cliente ORDENAVEIS (padrao Pedido DESC), elo (Link2) nos PED multi-linha, clique na linha abre o pedido inteiro, e AGRUPAMENTO VISUAL (sem border-bottom entre linhas do mesmo PED + degrade branco sutil `from-white/[0.07]` so na coluna Pedido das multi-linha). VER PEDIDO = nivel-pedido (Opcao A escolhida): `DetalhesReservaDrawer` mostra o bloco do cliente 1x + lista de ITENS (so leitura); as acoes operacionais (entregar/cancelar) por LINHA vivem na TABELA, nao no drawer; o drawer tem 1 botao unico "Editar pedido". EDITAR PEDIDO = editor completo "carrinho em edicao" (`EditarPedidoDrawer` + acao ATOMICA `editarPedido`): edita as linhas RESERVADAS (quantidade / adicionar / remover) e os dados compartilhados (cliente/data/obs); REMOVER linha = CANCELAR com rastro (decisao do usuario); linhas parciais/entregues/canceladas ficam TRAVADAS so-leitura; PED read-only no editor (renomear a chave de agrupamento e arriscado); `caixasReserva` dos lotes e RECOMPUTADO via `reservadasDoLote` (fonte unica, sem bookkeeping de deltas). SEED de demo: 2o lote do Ladrilho (L-2201, lote-2201) + linha extra no PED-1033 (mesmo produto, lote diferente) p/ exercitar o elo. LIMITES CONHECIDOS: editar linha PARCIAL e o R-05 (decidido, NAO construido) -> travada no editor; `EditarReservaDrawer` (editor de 1 linha) ficou SEM USO (mantido no repo). NOTA TECNICA (reaplicavel): `useMemo` com deps de arrays recalculados a cada render quebra o React Compiler (`react-hooks/preserve-manual-memoization`) -> calcular direto, SEM memo manual (o compiler memoiza).
- UX Reservas (2026-06-25): na lista, "Ver pedido" NAO e botao visivel. Clique na LINHA abre o drawer do pedido inteiro (funciona em qualquer item/lote do PED). Acoes operacionais continuam como botoes por LINHA/ITEM (entregar/cancelar), para nao sugerir que a acao vale para o pedido inteiro. Motivo: em pedido multi-item o botao repetido/ausente por linha confundia e parecia duplicidade.
- R-05 DECIDIDO E IMPLEMENTADO (2026-06-25): reserva PARCIALMENTE entregue PODE ser editada, mas SO o SALDO EM ABERTO. Modelo: apos entrega parcial `reserva.caixas` JA E o saldo (encolhe), `caixasEntregues` acumula o que saiu (imutavel), `entregas[]` guarda cada entrega; o entregue ja baixou `caixasEstoque` do lote. EDITAVEL na parcial: quantidade do saldo, data prevista/regime, observacoes. TRAVADO na parcial: LOTE e CLIENTE (a 1a entrega ja saiu daquele lote pra aquele cliente e baixou estoque; trocar corromperia estoque/historico e quebraria R-01; as `entregas[]` nem guardam de qual lote vieram). NAO se "desentrega" (`caixasEntregues` imutavel). REDUZIR saldo a 0 = ENCERRA o pedido como `entregue`/concluido (NAO e devolucao/estorno = R-08; nada volta ao estoque). AUMENTAR respeita disponivel do lote (R-01/Q5). NOTA: a trava de CLIENTE vale so na PARCIAL; no fluxo `reservado` (nada entregue) cliente continua editavel. IMPLEMENTADO (2026-06-25): `editarReserva` (inventory-provider) aceita `parcial`; para parcial o lote e forcado ao mesmo (ignora input.loteId), campos imutaveis (cliente/produto/lote/quadra) sao preservados; `ClienteSelector` ganhou prop `readOnly` (oculta "Trocar"); `EditarReservaDrawer` em modo parcial mostra lote como card read-only, bloco "Ja entregue: X cx · Saldo em aberto: Y cx" e label "Saldo em aberto (caixas)"; `ReservasPage` ganhou botao "Editar saldo" (icone lapis) para linhas `parcial` que abre o `EditarReservaDrawer` com key remount.
- R-09 ARQUIVADO (2026-06-25): agrupamento por cliente na tela de Reservas. DESCARTADO: a ClientesPage ja atende o caso de uso (accordion de pedidos por cliente); nao ha cenario real que justifique duplicar essa visao dentro de Reservas.
- R-08 DEVOLUCAO/ESTORNO (IMPLEMENTADO 2026-06-25): novo status terminal `estornado` (badge muted/cinza). So disponivel para reservas `entregue`. `EstornoDrawer` pede: (1) caixas a devolver (max = total entregue), (2) quadra de destino (informativo), (3) motivo (opcional). Acao `estornarReserva`: incrementa `caixasEstoque` do lote; NAO atualiza `lote.quadra` — gravar como historico informativo e nao tocar o campo do lote evita corromper a quadra das caixas remanescentes (lote pode ter estoque proprio alem do que foi devolvido; quando Q1 for implementado o estorno referenciara um sub-estoque por quadra). A quadra de destino fica so em `estorno.quadraDestino`; relocar o lote inteiro usa Ajustes > Mover quadra. Historico de devolucoes aparece em "Ver pedido" abaixo do bloco de Entregas. Aba "Estornado" adicionada na lista de Reservas. REGRA REAPLICAVEL: dado de operacao que afeta SO PARTE das caixas de um lote — gravar como historico, nao atualizar o campo do lote.

### Clientes (R-06, fase 1 feita 2026-06-20)
- Cliente como ENTIDADE, vinculo POR ID (fonte unica; editar cliente reflete em tudo). NAO snapshot; SEM texto livre como fallback. Campos MINIMOS: nome, CPF/CNPJ, telefone.
- Secao propria na sidebar. Lista em ordem alfabetica; linha EXPANSIVEL (accordion) mostra o historico de pedidos inline (em aberto primeiro), cada pedido abre uma descricao simples. Coluna "Pedidos Totais" so com o numero. Cadastrar/editar/excluir (excluir habilitado, com ConfirmDialog).
- FASE 2 (COMPLETA, 2026-06-20): vinculo cliente<->reserva por ID em CRIAR e EDITAR.
  - Bloco "Cliente" e SO selecao, via componente reusavel `features/reservas/ClienteSelector.tsx`: Autocomplete por nome/CPF -> existente vira resumo read-only (nome+doc+telefone) + "Trocar"; nome novo abre o `ClienteDrawer` lateral (formulario CANONICO do cliente, prop `nomeInicial`; campos futuros tipo endereco entram SO nele e ja valem em todo lugar).
  - CPF/CNPJ e telefone SAIRAM dos drawers de reserva (viram exibicao derivada). Campo "Numero do pedido" REMOVIDO (auto `PED-XXXX`).
  - Dados: `Reserva.clienteId?`, `Nova/EditarReservaInput.clienteId`; `adicionarCliente` agora RETORNA o `Cliente` criado; criar/editar gravam clienteId; `valido` exige cliente selecionado.
  - FONTE UNICA: readers derivam pela ENTIDADE via helper `clienteDaReserva(reserva, clientes)` em `data/mock-inventory.ts` (por id; fallback por nome p/ reservas mock sem id). Aplicado em ReservasPage (linha/busca/cancelar), DetalhesReservaDrawer, EntregaDrawer e no historico da ClientesPage. Editar o cliente reflete nas reservas.
  - LIMITE conhecido: as reservas do MOCK nao tem clienteId semeado (casam por nome) - renomear um cliente mock quebraria o vinculo das reservas antigas dele; some quando entrar Supabase/FK. A reserva ainda guarda cliente/doc/telefone como copia (fallback); os readers preferem a entidade.
  - ESC empilhado: `Drawer` ganhou prop `closeOnEsc`; com o sub-cadastro aberto, so o drawer de cima responde ao Esc.

### UI / plataforma
- Acao primaria do topo e contextual por secao (`usePrimaryAction`): Estoque=Novo produto/lote, Reservas=Nova Reserva, Clientes=Novo cliente; Ajustes/Configuracoes sem botao.
- Dashboard de Reservas: cards mostram ESTADO OPERACIONAL atual, nao vaidade (2026-06-21). DROPADO o card "Entregues" — contagem acumulada vitalicia so cresce e nao orienta decisao (a aba "Entregue" ja navega o historico). Cards atuais (4, grid-cols-4): Reservas ativas (aguardando entrega) · Caixas separadas (separadas no estoque) · Rotacionando (estoque girando ate a entrega) · Entrega parcial (saldo em aberto). Principio reaplicavel: metrica de painel deve ser acionavel, nao placar acumulado.
- Foto do produto OPCIONAL (Q14): vive so no detalhe (`ProdutoDetalheDrawer`, drawer LARGO), foto 1:1 limpa sem texto por cima; thumb minimo na tabela. Cadastro nao trava por foto.
- Tema escuro como padrao (paleta clara existe em tokens, nao e default). Inputs numericos sem setinhas nativas.
- GSAP enxugado: SEM animacao de entrada de tela nem do painel de notificacoes (custo/flash); mantido so o stagger de linhas de tabela (`useGsapListRefresh`, chave = membership/ids, pra nao reanimar em mutacao de 1 item). `SelectMenu` usa popover leve.
- Backdrop de drawers/modais: preto neutro `rgb(0 0 0 / 0.55)`, sem blur. CSS modular em `src/styles/` (tokens/base/components/utilities/globals).
- Incoerencias do Stitch descartadas: `Novo Lote` no Estoque, `Novo Papel` em Configuracoes, usuario "Operador/Turno".

### Stack / escopo
- React + Vite + TS + Tailwind + shadcn/ui. Next.js so por decisao explicita. Supabase depois da UI lapidada. Escopo por prioridade P0/P1/P2.
- Escopo P0 (cadastro produto/lote, quadra, caixas como verdade, reserva por lote, baixa na entrega, cancelamento devolve ao disponivel, bloqueio acima do disponivel, papeis basicos) — visao curada em `art_piso_mapa_de_regras.md`.

## Decisoes de Escopo (respondidas pelo usuario em 2026-06-18)

- Q1 - Um lote PODE ficar dividido em mais de uma quadra. Impacto: estoque passa a ser por (lote x quadra). (Modelo atual ainda trata quadra como propriedade unica do lote — divergencia a resolver no schema.)
- Q2 - Controla pelos DOIS (caixa e m2), mas caixas continuam a FONTE DA VERDADE; m2 e derivado (m2_por_caixa). "Pelos dois" = exibir/operar nas duas unidades.
- Q3 - Quadra basta como localizacao (sem rua/prateleira/posicao na v1).
- Q4 - Vendedor escolhe o lote especifico ao reservar (sem sugestao automatica).
- Q5 - Reserva NAO pode passar do disponivel: bloqueio sempre, sem excecao.
- Q6 - Reserva PODE ter entrega parcial (saldo restante + estado parcial; baixa por entrega).
- Q7 - Reserva PODE ter quantidade/lote/cliente alterados apos criada (fluxo de edicao).
- Q8 - Reserva NAO tem prazo de validade.
- Q9 - Perda: uma coluna consolidada basta (sem historico de perdas na v1).
- Q11 - Vendedor ve TODAS as reservas (nao so as proprias).
- Q12 - Vendedor pode cancelar QUALQUER reserva.
- Q13 - Gerente NAO altera dados do cliente; so marca entrega / ajusta estoque.
- Q15 - Produto identificado por referencia manual (sem codigo de barras na v1).

## Modelo de Reserva com Data Prevista / Encomenda (decisao de design, parcial no codigo)

Campo `dataPrevista` ja existe (opcional, texto DD/MM/AAAA; em branco = retirada imediata). O eixo regime/travamento JA comecou no codigo (`lib/reserva-regime.ts`, `caixasTravadas`, regime `travado`). A logica FINA e os numeros seguem pendentes (PH-3/4/5).

- Base do modelo: caixa reservada ja sai do disponivel, entao venda de balcao NAO come o reservado. O unico evento que ameaca uma reserva e a PERDA derrubando o estoque abaixo do total reservado -> alerta forte.
- Problema: travar caixas paradas por muitos meses congela estoque que deveria girar. "Sempre travar" e forte demais para reserva distante.
- Duas modalidades decididas pela DATA: **entrega rapida** (horizonte curto) trava de verdade; **encomenda** (horizonte longo) NAO trava agora, estoque gira, a reserva e um compromisso na agenda; perto da data "fecha o cerco" e trava. ANTI-FURO: somar encomendas futuras de um produto e avisar se as vendas consomem mais do que se conseguira entregar.
- ANTI-FURO (E-05) PARTE REATIVA IMPLEMENTADA (2026-06-20): `furoProduto(produto, reservas)` em `data/mock-inventory.ts` = max(0, prometido - estoque fisico liquido), onde prometido = soma das `caixas` de reservas ATIVAS (reservado/parcial) e estoque fisico = soma de (caixasEstoque - caixasPerda) dos lotes. Observador em `inventory-provider` (espelha o de estoque baixo, dispara na VIRADA): entra em furo -> notifica "Promessa em risco — faltam N cx"; sai do furo (reposicao cobriu) -> "Estoque cobre os pedidos — da pra separar". E ESTADO ATUAL, NAO depende do N-03. A parte PROATIVA (avisar com antecedencia "vai faltar em N dias") segue pendente = E-03 (precisa do N-03). DECISAO DE DOC do usuario: regra implementada vira FUNDAMENTO escrito (o que foi decidido, pode mudar depois), nao "proposto" nem removida.
- Escala PLACEHOLDER: ate ~2 meses = rapida (trava); 3+ meses = encomenda (rotaciona). Faixa 2-3 a definir.
- Ponto da virada (encomenda -> firme) = data-do-cliente MENOS (prazo de reposicao + margem). Antecedencia de disparo PLACEHOLDER = 45 dias.
- EIXO CORRETO do travamento (esclarecimento do usuario): nao e a numeracao do lote, e a URGENCIA. TRAVAR = "estas caixas ficam pra este cliente, ninguem mexe". ROTACIONAR = "deixa girar; lotes iniciais acabam, entram outros do MESMO produto (lote diferente ok - PH-6) e no fim entrega-se". Identidade do lote e IRRELEVANTE.
- OVERRIDE "nao rotacionar este pedido": NAO um toggle que duplica a regra da data (seria redundante e convidaria a travar tudo). E uma EXCECAO para forcar HOLD num pedido especifico (urgente), off por padrao, EDITAVEL depois (nao so na criacao). E-04 CONFIRMADO pelo usuario (2026-06-20): o override FICA, e necessario.
- CHECAGEM ao ativar override tarde: pode nao haver mais estoque pra travar (ex.: reservou pro mes 7, no mes 2 o lote ja caiu). Comportamento: AVISAR na hora (inline, mostrando o deficit "faltam X cx") + notificacao acompanha o risco ate cobrir. NAO bloquear (ha prazo pra repor; trocar de lote e permitido - PH-6).

## Placeholders a Confirmar com o Dev (PH)

Numeros/regras que CHUTAMOS; base do documento de perguntas pro Dev. Convem revisar o app inteiro nesta otica antes de fechar.

- PH-1 LIMITE "ESTOQUE BAIXO": hoje fixo global `< 10 cx` (`statusPorDisponivel`). 10 e o certo? Igual pra todo produto ou configuravel por produto? cx ou %? Usuario: MANTER 10 por ora, revisar no doc final.
- PH-2 LIMITE "PICO DE PERDA": placeholder 5 cx acumuladas por lote (`LIMITE_PICO_PERDA_CX`). A partir de quanto preocupa? cx ou %? por lote ou produto? Usuario: MANTER 5 por ora.
- PH-3 ANTECEDENCIA DE DISPARO DA ENCOMENDA: 45 dias (placeholder). Liga a PH-5. Usuario: MANTER 45 como inicial.
- PH-4 ESCALA RAPIDA x ENCOMENDA: ate ~2 meses trava / 3+ rotaciona (placeholder). Faixa 2-3 a definir.
- PH-5 PRAZO DE REPOSICAO DO PORCELANATO (= Q16): do pedido ao recebimento; define PH-3 e PH-4. Sazonalidade? produtos que demoram mais?
- PH-6 CASAMENTO DE LOTE / TONALIDADE: RESOLVIDO - PODE substituir por outro lote (quase impossivel o cliente recomprar o mesmo lote). Logo a rotacao pode trocar o lote livremente; "mesmo lote/tonalidade" perde forca como motivo de override.
- PH-7 NUMERACAO DE PEDIDO: REVISTO (2026-06-25 via R-07). O campo "Pedido" VOLTA ao modal de Nova reserva, preenchido MANUALMENTE (a fase 2 dos Clientes tinha REMOVIDO o campo e deixado auto `PED-XXXX`). Agora o PED e o que AGRUPA as linhas de um pedido (mesmo PED = mesmo pedido = elo). EM ABERTO: se o campo auto-sugere o proximo numero como salvaguarda anti-erro de digitacao (recomendado).
- PH-8 LOTE ESGOTADO / RECADASTRO: assumimos que lote esgotado nao volta (entra lote novo). RESOLVIDO - o Dev fara algo inteligente (recadastrar sobre o lote antigo quando o codigo ja existiu); nao e preocupacao nossa agora.
- PH-9 DISPONIVEL NEGATIVO NA CORRECAO: o `AjusteDrawer` BLOQUEIA correcao abaixo do comprometido (reserva+perda). Confirmar com o Dev se bloquear e o certo (vs avisar e permitir).
- PH-10 CPF/CNPJ NA RESERVA: OBRIGATORIO. R-04 DECIDIDO/IMPLEMENTADO (2026-06-21): valida TAMANHO (11/14) + DIGITO VERIFICADOR (calculo local em `lib/masks.ts`: `cpfValido`/`cnpjValido`/`documentoValido`), SEM API (nao consulta existencia). ClienteDrawer usa `documentoValido`; hint distingue "incompleto" de "digito errado". Documentos-semente trocados por validos. (O usuario primeiro disse "so preenchimento" e depois reconsiderou pedindo o verificador — digito verificador NAO e API, e local/de graca.)
- PH-11 QUEM PODE TRAVAR/PERMISSOES: por ora SO admin; distribuicao de papeis sera definida pelo Dev depois.

## Perguntas em Aberto

- Q16 (Dev) - Prazo real de reposicao de porcelanato/pisos (pedido -> chegada). Sazonalidade? Produtos mais lentos? Define a antecedencia segura do modelo de encomenda. (= PH-5)
- R-08 RESOLVIDO (2026-06-25) — ver decisao R-08 em Reservas acima.
- Q-03 - CAPACIDADE da quadra: hoje campo opcional; e o que destrava o nivel cheia/parcial. Como definir o valor padrao / por quadra.
- E-07 - ENCOMENDA VENCIDA quando a data prevista passa (ligado ao modelo de encomenda).
- Status de produto ESGOTADO preso no visual: tratar o caso "produto inteiro esgotado" sabendo que o Dev nao recadastra o mesmo lote (entra lote novo). Liga a PH-8.
- RESOLVIDOS recentemente (nao reabrir): Q10 historico (log `movimentos` so de perda/quadra/correcao + `HistoricoDrawer`; reserva/entrega/cadastro vivem so como notificacao), R-06 clientes (fase 1), Q-01 quadra, R-05 editar parcial (decidido 2026-06-25, IMPLEMENTADO 2026-06-25), R-07 pedido multi-item carrinho (2026-06-25, decisao + impl na secao Reservas), seed clienteId (CONFIRMADO FEITO 2026-06-25), R-09 agrupamento por cliente em Reservas (ARQUIVADO 2026-06-25, ClientesPage ja atende), troca de lote na entrega rotacionando (IMPLEMENTADO 2026-06-25).

## Aprendizados (reaplicaveis)

- **Reset de drawer em useEffect**: o lint `react-hooks/set-state-in-effect` acusa `setState` em `useEffect([open])` so pra limpar form. Solucao: remontar via `key` no pai (key que muda a cada abertura), estado inicializa das props no mount. Rodar `npx eslint src` (nao so `tsc`) antes de dar tarefa por pronta.
- **Controle HTML cru fora do design system**: antes de usar `<select>`/input cru, checar se ja existe padrao (ex.: `SelectMenu`); se nao, criar reutilizavel em `components/ui/`. `<label>` envolvendo botoes aninhados causa conflito de clique.
- **Split do store**: `inventory.ts` (context/hook/tipos) + `inventory-provider.tsx` (Provider) por causa do `react-refresh/only-export-components`. NAO recriar `inventory.tsx` (um shim `export *` reapareceu e quebrou lint/resolucao).
- **Windows**: Vite/Tailwind com `EPERM`/binario nativo -> rodar com permissao elevada. Mover pasta com `.git` interno (`Move-Item` nega acesso) -> copiar / validar contagem / remover origem.

## Fase Atual de Trabalho (definida com o usuario em 2026-06-28)

Jornada combinada: **Fase 1** = revisao do app tela por tela (UX, consistencia, bugs/falhas no MOCK), registrada em `art_piso_revisao_telas.md` — corrigir antes de tocar no banco. **Fase 2** = so depois da Fase 1 fechada, integracao com Supabase. Depois da Fase 1, usuario e agente definem juntos o **curso de trabalho** (ordem/cronograma) para a Fase 2 em diante. Motivo declarado pelo usuario: agilizar o processo futuro; usuario vem de chat com Opus 4.8 e esta comecando a usar o Claude Code agora (sem experiencia previa na ferramenta) — espera tambem ajuda nesse aprendizado, nao so no codigo.

Primeira sessao revisada (2026-06-28): Estoque -> Novo Produto (`CadastroProdutoDrawer.tsx`). Achados no `art_piso_revisao_telas.md` (nao duplicar aqui): dados do produto nao travam ao reaproveitar produto existente (risco de inconsistencia entre lotes da mesma referencia), Quadra como input livre em vez de `SelectMenu` (inconsistente com `AjusteDrawer`), sem checagem de codigo de lote duplicado, comparacao de referencia fragil, foto vive por lote em vez de por produto. Fixes ainda NAO aplicados — so analise registrada.

Contexto do time (esclarecido 2026-06-28): projeto feito em DUPLA. O parceiro montou o FRONTEND (mock atual) e entregou pro usuario continuar com o BACKEND. Explica achados de config apontando pra outra maquina (ver limpeza abaixo) — sao resquicio do ambiente do parceiro, nao erro do usuario.

### Metodo de trabalho global + roteiro da Fase 1 (2026-07-07)

- Criado `~/.claude/CLAUDE.md` GLOBAL (metodo de trabalho universal: postura critica, documentacao viva, ritual de plano antes de codar, cadencia de git, verificacao antes de "pronto"). O `CLAUDE.md` do projeto foi enxugado: secao 2 agora so aponta pro global (nao duplica); secao 8 corrigida (lista de skills fantasma da maquina do parceiro removida -> skills nativas do Claude Code; ordem de implementacao antiga marcada como CUMPRIDA).
- DECIDIDO (usuario): Fase 1 segue no modo REVISAR + CORRIGIR POR TELA — cada sessao fecha completa (revisa, corrige, verifica, marca ✅ no `art_piso_revisao_telas.md`) antes de abrir a proxima. Comecar pelos 4 achados abertos do Novo Produto.
- Commit SEGUE ADIADO por decisao do usuario (2026-07-07): working tree acumula a limpeza de 2026-06-28 + edicoes de CLAUDE.md/Memoria de hoje. Avisar de novo na proxima sessao se continuar pendente.

### Limpeza da raiz (2026-06-28)
Varredura da raiz a pedido do usuario; itens sem uso pra continuacao do projeto, REMOVIDOS/AJUSTADOS (mudancas feitas, COMMIT ADIADO pro usuario revisar amanha):
- `.claude/settings.json`: removida a entrada `additionalDirectories` que apontava pra maquina do parceiro (`c:\Users\victo\...`) — nao existe/nao se aplica nesta maquina.
- Worktree `.claude/worktrees/modest-brahmagupta-3de32e` (git worktree de sessao de agente anterior, identico ao `main`, sem commit proprio): removido via `git worktree remove`; branch orfa `claude/modest-brahmagupta-3de32e` tambem deletada (`git branch -d`).
- `art_piso_mapa_de_regras.html`: deletado — era um render HTML estatico duplicado do `art_piso_mapa_de_regras.md` (mesma funcao, ia desatualizar a cada edicao do `.md`).
- Estado: mudancas feitas no working tree, `git status` mostra modified/deleted/untracked, **NADA commitado ainda** — usuario pediu pra guardar o commit pra continuar amanha.

## Proximos Passos

1. **Refinar modelo de encomenda/regime**: override editavel, anti-furo, alertas de data; e fechar os numeros (PH-3/4/5) com o Dev. (vinculo cliente<->reserva por id ja FEITO — fase 2.)
2. ~~Semear clienteId nas reservas do MOCK~~ — CONFIRMADO FEITO (2026-06-25): todas as 13 reservas ja tem `clienteId`; fallback por nome e codigo morto. Pendente real so no Supabase (FK real).
3. **Revisao de DESIGN VISUAL/estetico e UX de produto** (a revisao de engenharia/acessibilidade ja foi feita).
4. **Consolidar componentes**: extrair o map de status da reserva (label/variant), hoje duplicado em ReservasPage/DetalhesReservaDrawer/ClientesPage/EditarPedidoDrawer, para um modulo compartilhado — quando a WIP de reservas assentar.
5. **Persistencia**: integrar Supabase (sair do mock), confirmando antes as Perguntas em Aberto que afetam o schema (Q1 lote x quadra — impacta estorno de devolucao tambem, etc.).
6. **P2**: suporte a tablet (hoje desktop-only, `min-width: 1180px`) e navegacao `<button>` -> router.
