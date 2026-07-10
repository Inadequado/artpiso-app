import type { Reserva, ReservaRegime } from '@/types/inventory'

export const MESES_PARA_ROTACIONAR = 3

/**
 * Janela de antecedencia da encomenda (E-03): a partir de quantos dias antes da entrega
 * um pedido rotacionando sem cobertura de estoque vira alerta. Era 45 (placeholder PH-3);
 * 30 por decisao do usuario (2026-07-09). O valor final depende do prazo de reposicao (N-03).
 */
export const DIAS_ANTECEDENCIA_ENTREGA = 30

export function parseDataPrevista(value?: string): Date | null {
  const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const dia = Number(match[1])
  const mes = Number(match[2])
  const ano = Number(match[3])
  const data = new Date(ano, mes - 1, dia)

  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null
  data.setHours(0, 0, 0, 0)
  return data
}

export function dataPrevistaLonga(value?: string, base = new Date()) {
  const data = parseDataPrevista(value)
  if (!data) return false

  const limite = new Date(base)
  limite.setHours(0, 0, 0, 0)
  limite.setMonth(limite.getMonth() + MESES_PARA_ROTACIONAR)
  return data >= limite
}

export function regimePorData(dataPrevista?: string, manterReservadoAgora = false): ReservaRegime | undefined {
  if (!dataPrevistaLonga(dataPrevista)) return undefined
  return manterReservadoAgora ? 'travado' : 'rotacionando'
}

/** Dias (inteiros) ate a data prevista da reserva; negativo = vencida; null = sem data valida. */
export function diasAteEntrega(reserva: Reserva, base = new Date()): number | null {
  const data = parseDataPrevista(reserva.dataPrevista)
  if (!data) return null
  const hoje = new Date(base)
  hoje.setHours(0, 0, 0, 0)
  return Math.round((data.getTime() - hoje.getTime()) / 86_400_000)
}

export function caixasTravadasReserva(reserva: Reserva) {
  if (reserva.status !== 'reservado' && reserva.status !== 'parcial') return reserva.caixasTravadas ?? 0
  if (typeof reserva.caixasTravadas === 'number') return Math.max(0, Math.min(reserva.caixas, reserva.caixasTravadas))
  if (reserva.regime === 'rotacionando') return 0
  return reserva.caixas
}

export function deficitTravamentoReserva(reserva: Reserva) {
  return Math.max(0, reserva.caixas - caixasTravadasReserva(reserva))
}