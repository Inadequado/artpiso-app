import { createContext, useContext } from 'react'
import type { Cliente, LoteEstoque, Movimento, MovimentoTipo, Reserva } from '@/types/inventory'

/** Dados de cadastro do cliente (sem id; gerado no store). */
export type ClienteInput = Omit<Cliente, 'id'>

export type AtualizarLotePatch = {
  lote: string
  quadra: string
}

export type AtualizarProdutoPatch = {
  produto: string
  /** Codigo de referencia comercial (opcional: vazio = sem referencia). */
  referencia: string
  marca: string
  tamanho: string
  m2PorCaixa: number
  pecasPorCaixa: number
  precoM2: number
}

export type NovaReservaInput = {
  loteId: string
  caixas: number
  /** Cliente vinculado por id (entidade). */
  clienteId?: string
  cliente: string
  documento?: string
  telefone?: string
  pedido?: string
  observacoes?: string
  dataPrevista?: string
  manterReservadoAgora?: boolean
}

/** Um item do pedido (carrinho): 1 lote + quantidade. Cada item vira 1 reserva (R-01). */
export type ItemReservaInput = {
  loteId: string
  caixas: number
}

/**
 * Pedido multi-item (R-07): varios lotes/produtos numa compra so.
 * Cliente, data prevista, regime e observacoes valem para o PEDIDO inteiro;
 * cada item de `itens` vira uma LINHA (reserva) propria, todas com o mesmo PED.
 */
export type NovoPedidoInput = {
  pedido?: string
  clienteId?: string
  cliente: string
  documento?: string
  telefone?: string
  observacoes?: string
  dataPrevista?: string
  manterReservadoAgora?: boolean
  itens: ItemReservaInput[]
}

export type EditarReservaInput = {
  id: string
  loteId: string
  caixas: number
  clienteId?: string
  cliente: string
  documento?: string
  telefone?: string
  observacoes?: string
  dataPrevista?: string
  manterReservadoAgora?: boolean
}

/** Um item no editor de pedido. `reservaId` ausente = item NOVO; presente = linha existente mantida. */
export type ItemPedidoEdit = {
  reservaId?: string
  loteId: string
  caixas: number
}

/**
 * Edicao de um PEDIDO inteiro (R-07, "carrinho em edicao"). So mexe nas linhas RESERVADAS:
 * - linha reservada presente em `itens` -> atualiza (quantidade + dados compartilhados);
 * - linha reservada AUSENTE de `itens` -> cancela (remover = deixa rastro);
 * - item sem `reservaId` -> cria nova reserva no mesmo PED.
 * Linhas parciais/entregues/canceladas ficam intocadas (nao editaveis aqui).
 */
export type EditarPedidoInput = {
  pedidoOriginal: string
  clienteId?: string
  cliente: string
  documento?: string
  telefone?: string
  observacoes?: string
  dataPrevista?: string
  manterReservadoAgora?: boolean
  itens: ItemPedidoEdit[]
}
export type EntregarReservaInput = {
  id: string
  caixas: number
  responsavel: string
  observacoes?: string
  /** Lote alternativo para entrega de pedidos rotacionando cujo lote original não tem estoque suficiente. */
  loteId?: string
}

export type EstornarReservaInput = {
  id: string
  caixas: number
  quadraId: string
  motivo?: string
}

export type NovoMovimento = {
  tipo: MovimentoTipo
  titulo: string
  detalhe: string
}

export type InventoryContextValue = {
  lotes: LoteEstoque[]
  reservas: Reserva[]
  clientes: Cliente[]
  movimentos: Movimento[]
  registrarMovimento: (input: NovoMovimento) => void
  adicionarCliente: (input: ClienteInput) => Cliente
  atualizarCliente: (id: string, input: ClienteInput) => void
  removerCliente: (id: string) => void
  adicionarLote: (lote: LoteEstoque) => void
  removerLote: (loteId: string) => void
  removerProduto: (produtoId: string) => void
  atualizarLote: (loteId: string, patch: AtualizarLotePatch) => void
  atualizarProduto: (produtoId: string, patch: AtualizarProdutoPatch) => void
  criarReserva: (input: NovaReservaInput) => void
  /** Cria um pedido multi-item: uma reserva por item, todas com o mesmo PED-XXXX (R-07). */
  criarPedido: (input: NovoPedidoInput) => void
  editarReserva: (input: EditarReservaInput) => void
  /** Edita um pedido inteiro (R-07): atualiza/cria/cancela linhas reservadas de uma vez. */
  editarPedido: (input: EditarPedidoInput) => void
  cancelarReserva: (id: string, motivo?: string) => void
  entregarReserva: (input: EntregarReservaInput) => void
  estornarReserva: (input: EstornarReservaInput) => void
  registrarPerda: (loteId: string, caixas: number, pisos: number) => void
  moverQuadra: (loteId: string, novaQuadra: string) => void
  corrigirEstoque: (loteId: string, novoTotal: number) => void
}

export const InventoryContext = createContext<InventoryContextValue | null>(null)

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error('useInventory deve ser usado dentro de InventoryProvider')
  return ctx
}
