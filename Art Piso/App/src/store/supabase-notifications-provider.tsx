import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  NotificationsContext,
  type Notificacao,
  type NotificationsContextValue,
  type NovaNotificacao,
} from '@/store/notifications'

/**
 * Sino no modo Supabase: notificacoes PERSISTENTES (tabela `notificacoes`).
 * - Diretas (acao do usuario) entram via RPC fn_notificar_cliente;
 * - Derivadas (estoque baixo, furo, pico de perda) nascem no BANCO (triggers);
 * - Realtime: qualquer aparelho ouve os inserts — o sino toca em todos.
 * "Lida" e GLOBAL (conta compartilhada no tablet) — decisao consciente.
 */

function tempoRelativo(iso: string) {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutos < 1) return 'Agora'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas} h`
  return `${Math.floor(horas / 24)} d`
}

type LinhaNotificacao = {
  id: string
  tipo: Notificacao['tipo']
  titulo: string
  descricao: string
  silencioso: boolean
  lida: boolean
  created_at: string
}

function paraNotificacao(linha: LinhaNotificacao): Notificacao {
  return {
    id: linha.id,
    tipo: linha.tipo,
    titulo: linha.titulo,
    descricao: linha.descricao,
    tempo: tempoRelativo(linha.created_at),
    lida: linha.lida,
  }
}

export function SupabaseNotificationsProvider({ children }: { children: ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [ringTick, setRingTick] = useState(0)

  const carregar = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('notificacoes')
      .select('id, tipo, titulo, descricao, silencioso, lida, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      console.warn('Erro ao carregar notificações:', error.message)
      return
    }
    setNotificacoes((data as LinhaNotificacao[]).map(paraNotificacao))
  }, [])

  useEffect(() => {
    if (!supabase) return
    // Carga inicial de sistema externo + assinatura realtime (setState nos callbacks).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar()
    const canal = supabase
      .channel('sino-notificacoes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
        const linha = payload.new as LinhaNotificacao
        setNotificacoes((atual) => (atual.some((n) => n.id === linha.id) ? atual : [paraNotificacao(linha), ...atual]))
        if (!linha.silencioso) setRingTick((tick) => tick + 1)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificacoes' }, (payload) => {
        const linha = payload.new as LinhaNotificacao
        setNotificacoes((atual) => atual.map((n) => (n.id === linha.id ? { ...n, lida: linha.lida } : n)))
      })
      .subscribe()
    return () => {
      void supabase?.removeChannel(canal)
    }
  }, [carregar])

  const notificar = useCallback((input: NovaNotificacao) => {
    // Persiste no banco; o INSERT volta pelo realtime (com dedupe por id).
    void (async () => {
      const { error } = await supabase!.rpc('fn_notificar_cliente', {
        p_tipo: input.tipo,
        p_titulo: input.titulo,
        p_descricao: input.descricao,
        p_silencioso: input.silencioso ?? false,
      })
      if (error) console.warn('Erro ao notificar:', error.message)
    })()
  }, [])

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes((atual) => atual.map((item) => (item.lida ? item : { ...item, lida: true })))
    void (async () => {
      const { error } = await supabase!.from('notificacoes').update({ lida: true }).eq('lida', false)
      if (error) console.warn('Erro ao marcar lidas:', error.message)
    })()
  }, [])

  const marcarLida = useCallback((id: string) => {
    setNotificacoes((atual) => atual.map((item) => (item.id === id && !item.lida ? { ...item, lida: true } : item)))
    void (async () => {
      const { error } = await supabase!.from('notificacoes').update({ lida: true }).eq('id', id)
      if (error) console.warn('Erro ao marcar lida:', error.message)
    })()
  }, [])

  const naoLidas = notificacoes.reduce((total, item) => total + (item.lida ? 0 : 1), 0)

  const value = useMemo<NotificationsContextValue>(
    () => ({ notificacoes, naoLidas, ringTick, notificar, marcarTodasLidas, marcarLida }),
    [notificacoes, naoLidas, ringTick, notificar, marcarTodasLidas, marcarLida],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
