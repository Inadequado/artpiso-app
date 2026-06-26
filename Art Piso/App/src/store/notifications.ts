import { createContext, useContext } from 'react'

export type NotificacaoTipo = 'reserva' | 'perda' | 'estoque' | 'entrega' | 'info'

export type Notificacao = {
  id: string
  tipo: NotificacaoTipo
  titulo: string
  descricao: string
  /** Rotulo de tempo (ex.: "Agora", "12 min"). */
  tempo: string
  lida: boolean
}

export type NovaNotificacao = {
  tipo: NotificacaoTipo
  titulo: string
  descricao: string
  /** Quando true, entra na lista e conta no badge, mas NAO toca o sino (sem som/animacao). */
  silencioso?: boolean
}

export type NotificationsContextValue = {
  notificacoes: Notificacao[]
  naoLidas: number
  /** Contador que incrementa a cada nova notificacao; o sino observa para tocar. */
  ringTick: number
  notificar: (input: NovaNotificacao) => void
  marcarTodasLidas: () => void
  marcarLida: (id: string) => void
}

// Valor padrao no-op: garante que useNotifications nunca quebre fora do provider.
const noop: NotificationsContextValue = {
  notificacoes: [],
  naoLidas: 0,
  ringTick: 0,
  notificar: () => {},
  marcarTodasLidas: () => {},
  marcarLida: () => {},
}

export const NotificationsContext = createContext<NotificationsContextValue>(noop)

export function useNotifications() {
  return useContext(NotificationsContext)
}
