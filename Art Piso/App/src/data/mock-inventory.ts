import { DIAS_ANTECEDENCIA_ENTREGA, diasAteEntrega } from '@/lib/reserva-regime'
import type { Cliente, LoteEstoque, Produto, Quadra, QuadraStatus, Reserva, StockStatus, Usuario } from '@/types/inventory'

export const lotes: LoteEstoque[] = [
  {
    id: 'lote-2405',
    precoM2: 89.9,
    produto: 'Porcelanato Branco Acetinado',
    produtoId: 'prod-por-6060-bl',

    referencia: 'POR-6060-BL',
    marca: 'Portinari',
    tamanho: '60x60',
    lote: 'L-2405',
    quadra: 'Q-03',
    bitola: '2',
    tonalidade: 'A3',
    m2PorCaixa: 2.16,
    pecasPorCaixa: 6,
    caixasEstoque: 40,
    caixasReserva: 8,
    caixasPerda: 2,
    pisosDanificados: 3,
    // Amostra real (porcelanato marmorizado). Foto de produto segue padrao 1:1.
    foto: '/produtos/por-6060-bl.jpg',
  },
  {
    id: 'lote-2406',
    precoM2: 89.9,
    produto: 'Porcelanato Branco Acetinado',
    produtoId: 'prod-por-6060-bl',

    referencia: 'POR-6060-BL',
    marca: 'Portinari',
    tamanho: '60x60',
    lote: 'L-2406',
    quadra: 'Q-05',
    bitola: '3',
    tonalidade: 'A4',
    m2PorCaixa: 2.16,
    pecasPorCaixa: 6,
    caixasEstoque: 18,
    caixasReserva: 2,
    caixasPerda: 0,
  },
  {
    id: 'lote-2391',
    precoM2: 64.9,
    produto: 'Revestimento Metro Sage',
    produtoId: 'prod-eli-1020-sg',

    referencia: 'ELI-1020-SG',
    marca: 'Eliane',
    tamanho: '10x20',
    lote: 'L-2391',
    quadra: 'Q-01',
    m2PorCaixa: 0.9,
    pecasPorCaixa: 45,
    caixasEstoque: 12,
    caixasReserva: 6,
    caixasPerda: 1,
  },
  {
    id: 'lote-2410',
    precoM2: 119.9,
    produto: 'Piso Vinílico Carvalho Natural',
    produtoId: 'prod-bia-20120-cn',

    referencia: 'BIA-20120-CN',
    marca: 'Biancogres',
    tamanho: '20x120',
    lote: 'L-2410',
    quadra: 'Q-08',
    m2PorCaixa: 1.8,
    pecasPorCaixa: 8,
    caixasEstoque: 45,
    caixasReserva: 0,
    caixasPerda: 3,
    pisosDanificados: 5,
  },
  {
    id: 'lote-2200',
    precoM2: 149.9,
    produto: 'Ladrilho Hidráulico Mediterrâneo',
    produtoId: 'prod-ceu-2020-md',

    referencia: 'CEU-2020-MD',
    marca: 'Ceusa',
    tamanho: '20x20',
    lote: 'L-2200',
    quadra: 'Q-12',
    bitola: '1',
    tonalidade: 'C2',
    m2PorCaixa: 1.2,
    pecasPorCaixa: 30,
    caixasEstoque: 12,
    caixasReserva: 12,
    caixasPerda: 0,
  },
  {
    // Segundo lote do mesmo produto (Ladrilho Mediterraneo): base do demo R-07 (pedido multi-lote).
    id: 'lote-2201',
    precoM2: 149.9,
    produto: 'Ladrilho Hidráulico Mediterrâneo',
    produtoId: 'prod-ceu-2020-md',

    referencia: 'CEU-2020-MD',
    marca: 'Ceusa',
    tamanho: '20x20',
    lote: 'L-2201',
    quadra: 'Q-12',
    m2PorCaixa: 1.2,
    pecasPorCaixa: 30,
    caixasEstoque: 40,
    caixasReserva: 8,
    caixasPerda: 0,
  },
  {
    id: 'lote-3010',
    precoM2: 109.9,
    produto: 'Porcelanato Cinza Concreto',
    produtoId: 'prod-por-8080-cg',

    referencia: 'POR-8080-CG',
    marca: 'Portinari',
    tamanho: '80x80',
    lote: 'L-3010',
    quadra: 'Q-04',
    m2PorCaixa: 2.04,
    pecasPorCaixa: 3,
    caixasEstoque: 60,
    caixasReserva: 4,
    caixasPerda: 1,
    pisosDanificados: 2,
  },
  {
    // Segundo lote do mesmo produto: base do demo de troca de lote em entrega rotacionando.
    id: 'lote-3011',
    precoM2: 109.9,
    produto: 'Porcelanato Cinza Concreto',
    produtoId: 'prod-por-8080-cg',

    referencia: 'POR-8080-CG',
    marca: 'Portinari',
    tamanho: '80x80',
    lote: 'L-3011',
    quadra: 'Q-04',
    m2PorCaixa: 2.04,
    pecasPorCaixa: 3,
    caixasEstoque: 25,
    caixasReserva: 0,
    caixasPerda: 0,
  },
  {
    id: 'lote-3020',
    precoM2: 94.9,
    produto: 'Porcelanato Amadeirado Nature',
    produtoId: 'prod-por-2090-am',

    referencia: 'POR-2090-AM',
    marca: 'Biancogres',
    tamanho: '20x90',
    lote: 'L-3020',
    quadra: 'Q-06',
    m2PorCaixa: 1.62,
    pecasPorCaixa: 9,
    caixasEstoque: 38,
    caixasReserva: 6,
    caixasPerda: 2,
  },
  {
    id: 'lote-3021',
    precoM2: 94.9,
    produto: 'Porcelanato Amadeirado Nature',
    produtoId: 'prod-por-2090-am',

    referencia: 'POR-2090-AM',
    marca: 'Biancogres',
    tamanho: '20x90',
    lote: 'L-3021',
    quadra: 'Q-07',
    m2PorCaixa: 1.62,
    pecasPorCaixa: 9,
    caixasEstoque: 14,
    caixasReserva: 0,
    caixasPerda: 0,
  },
  {
    id: 'lote-3030',
    precoM2: 74.9,
    produto: 'Revestimento Cimento Queimado',
    produtoId: 'prod-eli-3060-cq',

    referencia: 'ELI-3060-CQ',
    marca: 'Eliane',
    tamanho: '30x60',
    lote: 'L-3030',
    quadra: 'Q-02',
    m2PorCaixa: 1.44,
    pecasPorCaixa: 8,
    caixasEstoque: 16,
    caixasReserva: 2,
    caixasPerda: 0,
  },
  {
    id: 'lote-3040',
    precoM2: 159.9,
    produto: 'Pastilha de Vidro Azul Oceano',
    produtoId: 'prod-vid-3030-az',

    referencia: 'VID-3030-AZ',
    marca: 'Atlas',
    tamanho: '30x30',
    lote: 'L-3040',
    quadra: 'Q-10',
    m2PorCaixa: 0.9,
    pecasPorCaixa: 10,
    caixasEstoque: 25,
    caixasReserva: 3,
    caixasPerda: 0,
  },
  {
    id: 'lote-3050',
    precoM2: 79.9,
    produto: 'Piso Laminado Carvalho Mel',
    produtoId: 'prod-lam-19120-cm',

    referencia: 'LAM-19120-CM',
    marca: 'Durafloor',
    tamanho: '19x120',
    lote: 'L-3050',
    quadra: 'Q-09',
    m2PorCaixa: 2.3,
    pecasPorCaixa: 10,
    caixasEstoque: 41,
    caixasReserva: 5,
    caixasPerda: 1,
  },
]

export const reservas: Reserva[] = [
  {
    id: 'res-1024',
    pedido: 'PED-1024',
    cliente: 'Carlos Almeida',
    clienteId: 'cli-001',
    enderecoId: 'end-001a',
    enderecoEntrega: 'Casa — Rua das Acácias, 120 — Castelo, Belo Horizonte',
    telefone: '(31) 94421-1880',
    produto: 'Porcelanato Branco Acetinado',
    lote: 'L-2405',
    quadra: 'Q-03',
    caixas: 8,
    m2: 17.28,
    status: 'reservado',
    data: '12 out 2026',
    vendedor: 'Vendedor',
  },
  {
    id: 'res-1025',
    pedido: 'PED-1025',
    cliente: 'Mariana Souza',
    clienteId: 'cli-002',
    telefone: '(31) 91092-8801',
    produto: 'Revestimento Metro Sage',
    lote: 'L-2391',
    quadra: 'Q-01',
    caixas: 6,
    m2: 5.4,
    status: 'reservado',
    data: '14 out 2026',
    vendedor: 'Vendedor',
  },
  {
    id: 'res-1019',
    pedido: 'PED-1019',
    cliente: 'Construtora Vale',
    clienteId: 'cli-003',
    telefone: '(31) 3334-0001',
    produto: 'Piso Vinílico Carvalho Natural',
    lote: 'L-2410',
    quadra: 'Q-08',
    caixas: 10,
    m2: 18,
    status: 'entregue',
    data: '10 out 2026',
    vendedor: 'Renata Costa',
    entregas: [
      {
        id: 'ent-1019-1',
        data: '10 out 2026 · 16:20',
        responsavel: 'Renata Costa',
        caixas: 10,
      },
    ],
  },
  {
    id: 'res-1026',
    pedido: 'PED-1026',
    cliente: 'Fernanda Lima',
    clienteId: 'cli-004',
    telefone: '(31) 98812-4471',
    produto: 'Porcelanato Branco Acetinado',
    lote: 'L-2406',
    quadra: 'Q-05',
    caixas: 2,
    m2: 4.32,
    status: 'reservado',
    data: '15 out 2026',
    vendedor: 'Renata Costa',
  },
  {
    id: 'res-1027',
    pedido: 'PED-1027',
    cliente: 'Construtora Horizonte',
    clienteId: 'cli-005',
    telefone: '(31) 3201-7788',
    produto: 'Porcelanato Cinza Concreto',
    lote: 'L-3010',
    quadra: 'Q-04',
    caixas: 8,
    m2: 16.32,
    status: 'reservado',
    caixasTravadas: 0,
    regime: 'rotacionando',
    dataPrevista: '20/02/2027',
    data: '16 out 2026',
    vendedor: 'Vendedor',
  },
  {
    // Demo E-03: encomenda rotacionando que JA envelheceu para dentro da janela de antecedencia
    // (criada meses atras com entrega longa) e cujo produto nao cobre o pedido (disponivel 5 < 10).
    id: 'res-1040',
    pedido: 'PED-1040',
    cliente: 'Construtora Vale',
    clienteId: 'cli-003',
    enderecoId: 'end-003a',
    enderecoEntrega: 'Obra Torre Norte — Av. Amazonas, 4500 — Nova Suíça, Belo Horizonte',
    telefone: '(31) 3334-0001',
    produto: 'Revestimento Metro Sage',
    lote: 'L-2391',
    quadra: 'Q-01',
    caixas: 10,
    m2: 9,
    status: 'reservado',
    caixasTravadas: 0,
    regime: 'rotacionando',
    dataPrevista: '25/07/2026',
    data: '20 abr 2026',
    vendedor: 'Vendedor',
  },
  {
    id: 'res-1028',
    pedido: 'PED-1028',
    cliente: 'Roberto Dias',
    clienteId: 'cli-006',
    telefone: '(31) 99654-2210',
    produto: 'Porcelanato Cinza Concreto',
    lote: 'L-3010',
    quadra: 'Q-04',
    caixas: 4,
    m2: 8.16,
    status: 'reservado',
    caixasTravadas: 4,
    regime: 'travado',
    dataPrevista: '10/03/2027',
    data: '16 out 2026',
    vendedor: 'Renata Costa',
  },
  {
    id: 'res-1029',
    pedido: 'PED-1029',
    cliente: 'Amanda Ribeiro',
    clienteId: 'cli-007',
    telefone: '(31) 98220-6655',
    produto: 'Porcelanato Amadeirado Nature',
    lote: 'L-3020',
    quadra: 'Q-06',
    caixas: 6,
    m2: 9.72,
    status: 'reservado',
    data: '17 out 2026',
    vendedor: 'Vendedor',
  },
  {
    id: 'res-1030',
    pedido: 'PED-1030',
    cliente: 'Marcelo Tavares',
    clienteId: 'cli-008',
    telefone: '(31) 99110-3344',
    produto: 'Piso Laminado Carvalho Mel',
    lote: 'L-3050',
    quadra: 'Q-09',
    caixas: 5,
    m2: 11.5,
    caixasEntregues: 3,
    caixasTravadas: 5,
    entregas: [
      {
        id: 'ent-1030-1',
        data: '17 out 2026 · 15:05',
        responsavel: 'Renata Costa',
        caixas: 3,
        observacoes: 'Entrega parcial combinada com saldo para retirada posterior.',
      },
    ],
    status: 'parcial',
    data: '17 out 2026',
    vendedor: 'Renata Costa',
  },
  {
    id: 'res-1031',
    pedido: 'PED-1031',
    cliente: 'Juliana Castro',
    clienteId: 'cli-009',
    telefone: '(31) 98455-1209',
    produto: 'Pastilha de Vidro Azul Oceano',
    lote: 'L-3040',
    quadra: 'Q-10',
    caixas: 3,
    m2: 2.7,
    status: 'reservado',
    data: '18 out 2026',
    vendedor: 'Vendedor',
  },
  {
    id: 'res-1032',
    pedido: 'PED-1032',
    cliente: 'Eduardo Pinto',
    clienteId: 'cli-010',
    telefone: '(31) 99023-8890',
    produto: 'Revestimento Cimento Queimado',
    lote: 'L-3030',
    quadra: 'Q-02',
    caixas: 2,
    m2: 2.88,
    status: 'reservado',
    data: '18 out 2026',
    vendedor: 'Renata Costa',
  },
  {
    id: 'res-1033',
    pedido: 'PED-1033',
    cliente: 'Construtora Vale',
    clienteId: 'cli-003',
    telefone: '(31) 3334-0001',
    produto: 'Ladrilho Hidráulico Mediterrâneo',
    lote: 'L-2200',
    quadra: 'Q-12',
    caixas: 12,
    m2: 14.4,
    status: 'reservado',
    data: '19 out 2026',
    vendedor: 'Vendedor',
  },
  {
    // Mesma Construtora Vale, MESMO produto, LOTE DIFERENTE, MESMO pedido (PED-1033): demo do elo R-07.
    id: 'res-1033b',
    pedido: 'PED-1033',
    cliente: 'Construtora Vale',
    clienteId: 'cli-003',
    telefone: '(31) 3334-0001',
    produto: 'Ladrilho Hidráulico Mediterrâneo',
    lote: 'L-2201',
    quadra: 'Q-12',
    caixas: 8,
    m2: 9.6,
    status: 'reservado',
    data: '19 out 2026',
    vendedor: 'Vendedor',
  },
  {
    id: 'res-1034',
    pedido: 'PED-1034',
    cliente: 'Patrícia Gomes',
    clienteId: 'cli-011',
    telefone: '(31) 98701-5512',
    produto: 'Piso Vinílico Carvalho Natural',
    lote: 'L-2410',
    quadra: 'Q-08',
    caixas: 5,
    m2: 9,
    status: 'cancelado',
    caixasTravadas: 0,
    data: '19 out 2026',
    vendedor: 'Renata Costa',
    motivoCancelamento: 'Cliente optou por trocar o material antes da separação.',
  },
]

export const usuarios: Usuario[] = [
  { id: 'usr-admin', nome: 'Victor', email: 'victor@artpiso.com.br', role: 'admin', status: 'ativo' },
  { id: 'usr-gerente', nome: 'Renata Costa', email: 'renata@artpiso.com.br', role: 'gerente', status: 'ativo' },
  { id: 'usr-vendedor', nome: 'Vendedor', email: 'vendedor@artpiso.com.br', role: 'vendedor', status: 'ativo' },
]

export const clientes: Cliente[] = [
  {
    id: 'cli-001',
    nome: 'Carlos Almeida',
    documento: '123.456.789-09',
    telefone: '(31) 94421-1880',
    enderecos: [
      { id: 'end-001a', apelido: 'Casa', endereco: 'Rua das Acácias, 120 — Castelo, Belo Horizonte' },
    ],
  },
  { id: 'cli-002', nome: 'Mariana Souza', documento: '987.654.321-00', telefone: '(31) 91092-8801' },
  {
    id: 'cli-003',
    nome: 'Construtora Vale',
    documento: '12.345.678/0001-95',
    telefone: '(31) 3334-0001',
    enderecos: [
      { id: 'end-003a', apelido: 'Obra Torre Norte', endereco: 'Av. Amazonas, 4500 — Nova Suíça, Belo Horizonte' },
      { id: 'end-003b', apelido: 'Obra Residencial Lago', endereco: 'Rua dos Ipês, 88 — Jardim Canadá, Nova Lima' },
    ],
  },
  { id: 'cli-004', nome: 'Fernanda Lima', documento: '111.444.777-35', telefone: '(31) 98812-4471' },
  { id: 'cli-005', nome: 'Construtora Horizonte', documento: '11.222.333/0001-81', telefone: '(31) 3201-7788' },
  { id: 'cli-006', nome: 'Roberto Dias', documento: '222.333.444-05', telefone: '(31) 99654-2210' },
  { id: 'cli-007', nome: 'Amanda Ribeiro', documento: '333.222.111-69', telefone: '(31) 98220-6655' },
  { id: 'cli-008', nome: 'Marcelo Tavares', documento: '444.555.666-19', telefone: '(31) 99110-3344' },
  { id: 'cli-009', nome: 'Juliana Castro', documento: '555.666.777-20', telefone: '(31) 98455-1209' },
  { id: 'cli-010', nome: 'Eduardo Pinto', documento: '666.777.888-30', telefone: '(31) 99023-8890' },
  { id: 'cli-011', nome: 'Patrícia Gomes', documento: '777.888.999-41', telefone: '(31) 98701-5512' },
  { id: 'cli-012', nome: 'Beatriz Rocha', documento: '529.982.247-25', telefone: '(31) 98544-7710' },
]

export const quadras: Quadra[] = [
  { id: 'q-01', numero: 'Q-01', descricao: 'Quadra Norte', capacidade: 12 },
  { id: 'q-02', numero: 'Q-02', descricao: 'Corredor de revestimentos', capacidade: 40 },
  { id: 'q-03', numero: 'Q-03', descricao: 'Quadra Sul', capacidade: 100 },
  { id: 'q-04', numero: 'Q-04', descricao: 'Área de grandes formatos', capacidade: 90 },
  { id: 'q-05', numero: 'Q-05', descricao: 'Pulmão sem capacidade definida' },
  { id: 'q-06', numero: 'Q-06', descricao: 'Corredor amadeirados A', capacidade: 80 },
  { id: 'q-07', numero: 'Q-07', descricao: 'Corredor amadeirados B', capacidade: 40 },
  { id: 'q-08', numero: 'Q-08', descricao: 'Corredor 2', capacidade: 60 },
  { id: 'q-09', numero: 'Q-09', descricao: 'Laminados e vinílicos', capacidade: 70 },
  { id: 'q-10', numero: 'Q-10', descricao: 'Pastilhas e peças especiais', capacidade: 50 },
  { id: 'q-11', numero: 'Q-11', descricao: 'Quadra vazia para expansão', capacidade: 30 },
  { id: 'q-12', numero: 'Q-12', descricao: 'Área de separação', capacidade: 80 },
]

export function caixasDisponiveis(lote: LoteEstoque) {
  return lote.caixasEstoque - lote.caixasReserva - lote.caixasPerda
}

/** Proximo numero de pedido (PED-XXXX) a partir do maior existente. Fonte unica: provider (auto) e drawer (sugestao do campo Pedido). */
export function proximoNumeroPedido(reservas: Reserva[]) {
  const numeros = reservas
    .map((reserva) => Number(reserva.pedido.replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n))
  const max = numeros.length ? Math.max(...numeros) : 1000
  return `PED-${max + 1}`
}

export function m2Disponivel(lote: LoteEstoque) {
  return caixasDisponiveis(lote) * lote.m2PorCaixa
}

/** Status derivado das caixas disponiveis. Fonte unica para lote e produto. */
export function statusPorDisponivel(caixas: number): StockStatus {
  if (caixas <= 0) return 'esgotado'
  if (caixas < 10) return 'baixo'
  return 'disponivel'
}

/** Status do lote, sempre derivado do disponivel (nao e mais um campo gravado). */
export function statusLote(lote: LoteEstoque): StockStatus {
  return statusPorDisponivel(caixasDisponiveis(lote))
}

export function formatM2(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPreco(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

/** Preco por caixa derivado do preco por m2 (preco/m2 x m2/caixa). */
export function precoPorCaixa(precoM2: number, m2PorCaixa: number) {
  return precoM2 * m2PorCaixa
}

/** Agrupa lotes pelo produtoId, formando os produtos do catalogo (referencia e dado opcional, nao chave). */
export function agruparPorProduto(lista: LoteEstoque[]): Produto[] {
  const mapa = new Map<string, Produto>()
  for (const lote of lista) {
    const atual = mapa.get(lote.produtoId)
    if (atual) {
      atual.lotes.push(lote)
    } else {
      mapa.set(lote.produtoId, {
        id: lote.produtoId,
        referencia: lote.referencia,
        produto: lote.produto,
        marca: lote.marca,
        tamanho: lote.tamanho,
        m2PorCaixa: lote.m2PorCaixa,
        pecasPorCaixa: lote.pecasPorCaixa,
        precoM2: lote.precoM2,
        foto: lote.foto,
        lotes: [lote],
      })
    }
  }
  return Array.from(mapa.values())
}

export function caixasDisponiveisProduto(produto: Produto) {
  return produto.lotes.reduce((total, lote) => total + caixasDisponiveis(lote), 0)
}

export function m2DisponivelProduto(produto: Produto) {
  return caixasDisponiveisProduto(produto) * produto.m2PorCaixa
}

/**
 * Status a nivel de produto. Um lote esgotado nao rebaixa o produto:
 * enquanto houver caixas disponiveis, o produto fica disponivel (ou baixo).
 */
export function statusProduto(produto: Produto): StockStatus {
  return statusPorDisponivel(caixasDisponiveisProduto(produto))
}

/** Numero de reservas ATIVAS (reservado ou entrega parcial em aberto) de um produto. */
export function reservasAtivasDoProduto(produto: string, lista: Reserva[]) {
  return lista.filter(
    (reserva) =>
      reserva.produto === produto && (reserva.status === 'reservado' || reserva.status === 'parcial'),
  ).length
}

/** Estoque FISICO liquido do produto: caixas reais menos perda (o que de fato da pra entregar). */
export function estoqueFisicoProduto(produto: Produto) {
  return produto.lotes.reduce((total, lote) => total + (lote.caixasEstoque - lote.caixasPerda), 0)
}

/** Caixas PROMETIDAS: soma das caixas em aberto de reservas ativas (reservado/parcial) do produto. */
export function prometidoProduto(produtoNome: string, reservas: Reserva[]) {
  return reservas
    .filter((r) => r.produto === produtoNome && (r.status === 'reservado' || r.status === 'parcial'))
    .reduce((total, r) => total + r.caixas, 0)
}

/**
 * Furo da promessa (anti-furo, estado atual): quanto o estoque fisico NAO cobre do que esta prometido.
 * 0 = promessa coberta; >0 = faltam caixas para cumprir os pedidos ativos (ex.: a perda derrubou o
 * estoque, ou um pedido rotacionando ficou sem lastro). Independe do prazo de reposicao (N-03/PH-5):
 * a antecedencia (avisar "vai faltar em N dias") e outro tema (E-03), ainda em aberto.
 */
export function furoProduto(produto: Produto, reservas: Reserva[]) {
  return Math.max(0, prometidoProduto(produto.produto, reservas) - estoqueFisicoProduto(produto))
}

/** Um pedido rotacionando dentro da janela de antecedencia sem cobertura de estoque (E-03). */
export type EncomendaEmRisco = {
  reserva: Reserva
  /** Dias ate a entrega (0 = hoje). */
  dias: number
  /** Caixas que faltam para cobrir o saldo do pedido. */
  faltam: number
}

/**
 * Encomendas em risco (E-03): pedidos ROTACIONANDO ativos com entrega em ate
 * DIAS_ANTECEDENCIA_ENTREGA dias cuja cobertura nao fecha. Fila por URGENCIA: ordena pela data e
 * vai alocando o disponivel do produto; pedido que nao coube (nem parcialmente) entra em risco —
 * pega inclusive o caso de dois pedidos que individualmente cabem mas juntos nao. Vencidas
 * (dias < 0) ficam de fora: encomenda vencida e outro tema (E-07).
 */
export function encomendasEmRisco(produtos: Produto[], reservas: Reserva[], base = new Date()): EncomendaEmRisco[] {
  const riscos: EncomendaEmRisco[] = []
  for (const produto of produtos) {
    const naJanela = reservas
      .map((reserva) => ({ reserva, dias: diasAteEntrega(reserva, base) }))
      .filter(
        (item): item is { reserva: Reserva; dias: number } =>
          item.reserva.produto === produto.produto &&
          item.reserva.regime === 'rotacionando' &&
          (item.reserva.status === 'reservado' || item.reserva.status === 'parcial') &&
          item.dias !== null &&
          item.dias >= 0 &&
          item.dias <= DIAS_ANTECEDENCIA_ENTREGA,
      )
      .sort((a, b) => a.dias - b.dias)
    if (naJanela.length === 0) continue

    let disponivel = caixasDisponiveisProduto(produto)
    for (const { reserva, dias } of naJanela) {
      const faltam = Math.max(0, reserva.caixas - Math.max(0, disponivel))
      disponivel -= reserva.caixas
      if (faltam > 0) riscos.push({ reserva, dias, faltam })
    }
  }
  return riscos
}

/**
 * Cliente vinculado a uma reserva. Fonte unica: resolve pela ENTIDADE.
 * Por id quando houver (reservas novas); senao casa pelo nome (reservas mock antigas).
 * undefined se nao achar (a UI cai no texto guardado na reserva como fallback).
 */
export function clienteDaReserva(reserva: Reserva, clientes: Cliente[]): Cliente | undefined {
  if (reserva.clienteId) return clientes.find((cliente) => cliente.id === reserva.clienteId)
  return clientes.find((cliente) => cliente.nome === reserva.cliente)
}

/** Texto de exibicao de um endereco: "Apelido — endereco" ou so o endereco. */
export function enderecoLabel(endereco: { apelido?: string; endereco: string }) {
  return endereco.apelido ? `${endereco.apelido} — ${endereco.endereco}` : endereco.endereco
}

/**
 * Endereco de entrega da reserva. Prefere a ENTIDADE (id em Cliente.enderecos: editar o
 * endereco reflete nos pedidos); cai no snapshot se o endereco foi removido do cadastro.
 * undefined = retirada na loja.
 */
export function enderecoEntregaDaReserva(reserva: Reserva, clientes: Cliente[]): string | undefined {
  if (!reserva.enderecoId) return reserva.enderecoEntrega
  const cliente = clienteDaReserva(reserva, clientes)
  const endereco = cliente?.enderecos?.find((item) => item.id === reserva.enderecoId)
  return endereco ? enderecoLabel(endereco) : reserva.enderecoEntrega
}

/** Lotes fisicamente guardados na quadra (ligacao por numero da quadra). */
export function lotesNaQuadra(numero: string, lista: LoteEstoque[]) {
  return lista.filter((lote) => lote.quadra === numero)
}

/** Caixas fisicas (estoque) presentes na quadra, somando os lotes nela. */
export function caixasNaQuadra(numero: string, lista: LoteEstoque[]) {
  return lotesNaQuadra(numero, lista).reduce((total, lote) => total + lote.caixasEstoque, 0)
}

export type OcupacaoQuadra = {
  /** Caixas fisicas na quadra. */
  caixas: number
  /** Quantidade de lotes distintos na quadra. */
  lotes: number
  /** Capacidade configurada (caixas). undefined enquanto nao definida. */
  capacidade?: number
  /** Percentual 0-100 de ocupacao; so existe quando ha capacidade. */
  percentual?: number
  /** Ocupado = cheio (caixas >= capacidade). Disponivel = ainda cabe estoque (inclui vazia). */
  status: QuadraStatus
}

/**
 * Ocupacao derivada da quadra a partir das caixas dos lotes nela.
 * Sem capacidade definida nao ha %: a quadra fica sempre "disponivel" (nao da pra saber se esta cheia).
 */
export function ocupacaoQuadra(quadra: Quadra, lista: LoteEstoque[]): OcupacaoQuadra {
  const caixas = caixasNaQuadra(quadra.numero, lista)
  const lotes = lotesNaQuadra(quadra.numero, lista).length
  const capacidade = quadra.capacidade && quadra.capacidade > 0 ? quadra.capacidade : undefined
  const percentual = capacidade ? Math.min(100, Math.round((caixas / capacidade) * 100)) : undefined
  const status: QuadraStatus = capacidade && caixas >= capacidade ? 'ocupado' : 'disponivel'
  return { caixas, lotes, capacidade, percentual, status }
}
