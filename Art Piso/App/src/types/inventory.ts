export type UserRole = 'admin' | 'vendedor' | 'gerente'

export type StockStatus = 'disponivel' | 'baixo' | 'esgotado' | 'reservado'

export type ReservaStatus = 'reservado' | 'parcial' | 'entregue' | 'cancelado' | 'estornado'

/**
 * Regime da reserva, ortogonal ao status do ciclo.
 *  - aguardando/ausente: caixas travadas para uma reserva comum.
 *  - rotacionando: entrega prevista longa; o estoque pode girar ate a data combinada.
 *  - travado: entrega prevista longa, mas o usuario optou por separar caixas agora.
 */
export type ReservaRegime = 'aguardando' | 'rotacionando' | 'travado'

export type EntregaReserva = {
  id: string
  /** Quando a entrega foi registrada (DD mes AAAA · HH:MM). */
  data: string
  responsavel: string
  caixas: number
  /** Lote de onde as caixas saíram fisicamente. Preenchido quando rotacionando troca de lote na entrega. */
  lote?: string
  /** De qual(is) quadra(s) as caixas sairam (texto pronto: "Q-08 (5 cx) · Q-11 (3 cx)"). */
  quadras?: string
  observacoes?: string
}

export type EstornoReserva = {
  id: string
  data: string
  responsavel: string
  caixas: number
  /** Quadra onde as caixas foram armazenadas ao retornar (pode diferir da quadra original). */
  quadraDestino: string
  motivo?: string
}

/** Caixas de um lote fisicamente guardadas numa quadra (Q1: lote pode ocupar 2+ quadras, caso de excesso). */
export type AlocacaoQuadra = {
  /** Numero da quadra (ex.: "Q-03"). */
  quadra: string
  caixas: number
}

export type LoteEstoque = {
  id: string
  /** Identidade do produto ao qual o lote pertence. Chave de agrupamento do catalogo (referencia e opcional). */
  produtoId: string
  produto: string
  /** Codigo de referencia comercial. Opcional: vazio = produto sem referencia. */
  referencia: string
  marca: string
  /** Tamanho nominal (ex.: "60x60"). Opcional: vazio = nao informado. */
  tamanho: string
  lote: string
  /** Onde as caixas estao. INVARIANTE: a soma das alocacoes = caixasEstoque. */
  alocacoes: AlocacaoQuadra[]
  /** Bitola/calibre impresso na caixa (varia por lote). Opcional. */
  bitola?: string
  /** Tonalidade impressa na caixa (varia por lote). Opcional. */
  tonalidade?: string
  m2PorCaixa: number
  /** Quantidade de pecas/pisos por caixa. Obrigatorio: base para registrar perda por unidade. */
  pecasPorCaixa: number
  /** Preco de venda por m2 (R$). Atributo de produto: igual para todos os lotes da referencia. */
  precoM2: number
  /** Descricao livre (acabamento, detalhes tecnicos). Atributo de produto: igual em todos os lotes. Opcional. */
  descricao?: string
  caixasEstoque: number
  caixasReserva: number
  caixasPerda: number
  /** Pecas/pisos avulsos quebrados dentro de caixas danificadas (registro informativo). */
  pisosDanificados?: number
  /** URL da foto do produto. Opcional: sem foto, a UI mostra cantos vazios. */
  foto?: string
}

/** Produto = agrupamento de lotes pelo mesmo produtoId. Unidade de catalogo (referencia e dado opcional, nao identidade). */
export type Produto = {
  id: string
  referencia: string
  produto: string
  marca: string
  tamanho: string
  m2PorCaixa: number
  pecasPorCaixa: number
  precoM2: number
  descricao?: string
  foto?: string
  lotes: LoteEstoque[]
}

export type Reserva = {
  id: string
  pedido: string
  cliente: string
  /** CPF ou CNPJ do cliente. Opcional na primeira versao. */
  documento?: string
  telefone: string
  produto: string
  lote: string
  /** SNAPSHOT da localizacao (label, ex.: "Q-03 · Q-11"). Para reservas ATIVAS a UI deriva do lote ao vivo (quadraDaReserva); o snapshot vale para o historico. */
  quadra: string
  /** Caixas em aberto (saldo a entregar). Em entrega parcial, cai para o restante. */
  caixas: number
  m2: number
  /** Caixas ja entregues acumuladas (entregas parciais). */
  caixasEntregues?: number
  /** Caixas fisicamente travadas/separadas agora. Rotacionando pode ser 0. */
  caixasTravadas?: number
  /** Historico das entregas ja registradas para este pedido. */
  entregas?: EntregaReserva[]
  /** Historico de devolucoes (estornos) pos-entrega. */
  estornos?: EstornoReserva[]
  /** Data prevista de entrega/retirada (DD/MM/AAAA). Opcional: em branco = retirada imediata. Base do futuro modelo de encomenda/rotacao. */
  dataPrevista?: string
  status: ReservaStatus
  /** Cliente vinculado por id (entidade). Reservas antigas/mock podem nao ter (casam por nome). */
  clienteId?: string
  /** Endereco de entrega escolhido (id em Cliente.enderecos). Ausente = retirada na loja. Nivel do PEDIDO (R-07). */
  enderecoId?: string
  /** Snapshot do endereco na criacao (fallback se o endereco for removido do cadastro). */
  enderecoEntrega?: string
  /** Regime de travamento (eixo separado do status). Ausente = 'aguardando' (modelo atual). */
  regime?: ReservaRegime
  data: string
  vendedor: string
  /** Observacoes livres sobre a reserva ou a entrega. */
  observacoes?: string
  /** Motivo do cancelamento (preenchido ao cancelar). */
  motivoCancelamento?: string
}

export type Usuario = {
  id: string
  nome: string
  email: string
  role: UserRole
  status: 'ativo' | 'ausente'
}

/**
 * Endereco de entrega do cliente (construcao civil: um cliente pode ter varias obras).
 * Vinculado por id na reserva (fonte unica), com snapshot de fallback (mesmo padrao do cliente).
 */
export type EnderecoCliente = {
  id: string
  /** Nome curto da obra/local (ex.: "Obra Centro"). Opcional. */
  apelido?: string
  /** Endereco em texto livre: rua, numero, bairro, cidade. */
  endereco: string
}

/**
 * Cliente como ENTIDADE (R-06): no lugar de texto livre redigitado a cada reserva.
 * A reserva passa a referenciar o cliente por id (fonte unica; editar o cliente reflete em tudo).
 * Campos minimos por decisao do usuario (2026-06-20): nome, documento (CPF/CNPJ) e telefone.
 */
export type Cliente = {
  id: string
  nome: string
  /** CPF ou CNPJ (com mascara). */
  documento: string
  telefone: string
  /** Enderecos de entrega (obras). Opcional: cliente pode nao ter nenhum (retirada na loja). */
  enderecos?: EnderecoCliente[]
}

export type MovimentoTipo = 'entrada' | 'perda' | 'quadra' | 'correcao'

/** Entrada do log de operacoes de AJUSTE de estoque (perda, mudanca de quadra, correcao, gestao de quadras). Mostrado no Historico da tela de Ajustes. Reserva/entrega/cadastro NAO entram aqui (vivem como notificacao). */
export type Movimento = {
  id: string
  tipo: MovimentoTipo
  titulo: string
  detalhe: string
  /** Motivo/observacao livre do ajuste (ex.: causa da perda). Opcional. */
  observacao?: string
  /** Lote alvo do ajuste (vinculo estruturado; o detalhe continua sendo o texto exibido). */
  loteId?: string
  /** Produto do lote alvo. Permite filtrar o historico por produto (ex.: perdas no detalhe). */
  produtoId?: string
  /** Quem registrou (usuario logado simulado ate o Supabase). */
  usuario: string
  /** Quando (DD mes AAAA · HH:MM). */
  data: string
}

export type QuadraStatus = 'disponivel' | 'ocupado'

export type Quadra = {
  id: string
  numero: string
  descricao: string
  /**
   * Ocupacao MANUAL (decisao do usuario, 2026-07-11, reverte Q-01): o gerente marca no card.
   * Caixas tem tamanhos variados, entao capacidade/percentual automatico fingia precisao;
   * o campo `capacidade` foi removido junto. Ausente = 'disponivel'.
   */
  status?: QuadraStatus
}
