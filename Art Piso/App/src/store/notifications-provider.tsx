import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  NotificationsContext,
  type Notificacao,
  type NotificationsContextValue,
  type NovaNotificacao,
} from '@/store/notifications'

// Notificacoes semente: aparecem na lista, ja lidas (nao tocam o sino no load).
// Mais recente no topo. Espelham os formatos reais dos triggers do inventory-provider
// (estoque / reserva / entrega / perda) e batem com o dataset atual.
const seed: Notificacao[] = [
  {
    id: 'seed-esgotado',
    tipo: 'estoque',
    titulo: 'Produto esgotado',
    descricao: 'Ladrilho Hidráulico Mediterrâneo — 0 cx disponíveis',
    tempo: 'Agora',
    lida: true,
  },
  {
    id: 'seed-baixo',
    tipo: 'estoque',
    titulo: 'Estoque baixo',
    descricao: 'Revestimento Metro Sage — 5 cx disponíveis',
    tempo: '20 min',
    lida: true,
  },
  {
    id: 'seed-entrega-parcial',
    tipo: 'entrega',
    titulo: 'Entrega parcial',
    descricao: 'Piso Laminado Carvalho Mel — 3 cx (PED-1030)',
    tempo: '40 min',
    lida: true,
  },
  {
    id: 'seed-reserva-1028',
    tipo: 'reserva',
    titulo: 'Reserva criada',
    descricao: 'Porcelanato Cinza Concreto — 4 cx para Roberto Dias',
    tempo: '1 h',
    lida: true,
  },
  {
    id: 'seed-perda-2410',
    tipo: 'perda',
    titulo: 'Perda registrada',
    descricao: '3 cx em L-2410 · 5 pisos danificados',
    tempo: '2 h',
    lida: true,
  },
  {
    id: 'seed-reserva-1027',
    tipo: 'reserva',
    titulo: 'Reserva criada',
    descricao: 'Porcelanato Cinza Concreto — 8 cx para Construtora Horizonte',
    tempo: '3 h',
    lida: true,
  },
  {
    id: 'seed-entrega-1019',
    tipo: 'entrega',
    titulo: 'Entrega concluída',
    descricao: 'Piso Vinílico Carvalho Natural — 10 cx (PED-1019)',
    tempo: '5 h',
    lida: true,
  },
  {
    id: 'seed-perda-2405',
    tipo: 'perda',
    titulo: 'Perda registrada',
    descricao: '2 cx em L-2405 · 3 pisos danificados',
    tempo: '1 d',
    lida: true,
  },
  {
    id: 'seed-reserva-1024',
    tipo: 'reserva',
    titulo: 'Reserva criada',
    descricao: 'Porcelanato Branco Acetinado — 8 cx para Carlos Almeida',
    tempo: '1 d',
    lida: true,
  },
]

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(seed)
  const [ringTick, setRingTick] = useState(0)

  const notificar = useCallback((input: NovaNotificacao) => {
    const nova: Notificacao = {
      id: crypto.randomUUID(),
      tipo: input.tipo,
      titulo: input.titulo,
      descricao: input.descricao,
      tempo: 'Agora',
      lida: false,
    }
    setNotificacoes((atual) => [nova, ...atual])
    // Silenciosa: conta no badge mas nao toca o sino (evita fadiga de notificacao).
    if (!input.silencioso) setRingTick((tick) => tick + 1)
  }, [])

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes((atual) => atual.map((item) => (item.lida ? item : { ...item, lida: true })))
  }, [])

  const marcarLida = useCallback((id: string) => {
    setNotificacoes((atual) => atual.map((item) => (item.id === id && !item.lida ? { ...item, lida: true } : item)))
  }, [])

  const naoLidas = notificacoes.reduce((total, item) => total + (item.lida ? 0 : 1), 0)

  const value = useMemo<NotificationsContextValue>(
    () => ({ notificacoes, naoLidas, ringTick, notificar, marcarTodasLidas, marcarLida }),
    [notificacoes, naoLidas, ringTick, notificar, marcarTodasLidas, marcarLida],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
