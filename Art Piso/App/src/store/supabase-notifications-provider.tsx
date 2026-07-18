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
 * "Lida" e POR USUARIO (tabela notificacao_leitura): o app le de
 * vw_notificacoes_usuario com o `lida` ja derivado p/ auth.uid(). A conta
 * compartilhada (balcao) e 1 user_id => "lida" efetivamente global naquele
 * login; admin e gerente tem badge independente.
 */

function tempoRelativo(iso: string) {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutos < 1) return 'Agora'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas} h`
  return `${Math.floor(horas / 24)} d`
}

// Linha da view vw_notificacoes_usuario (lida ja derivado p/ o usuario).
type LinhaNotificacao = {
  id: string
  tipo: Notificacao['tipo']
  titulo: string
  descricao: string
  silencioso: boolean
  lida: boolean
  created_at: string
}

// Linha CRUA da tabela notificacoes (sem lida — o estado de leitura vive noutra tabela).
type LinhaNotificacaoNova = Omit<LinhaNotificacao, 'lida'>

// Estado interno: guarda o created_at CRU e deriva o "tempo" so na renderizacao
// (com tick por minuto) — congelar o texto no load deixava "15 min" parado ate o F5.
type NotificacaoBase = Omit<Notificacao, 'tempo'> & { createdAt: string }

function paraBase(linha: LinhaNotificacao): NotificacaoBase {
  return {
    id: linha.id,
    tipo: linha.tipo,
    titulo: linha.titulo,
    descricao: linha.descricao,
    createdAt: linha.created_at,
    lida: linha.lida,
  }
}

// Notificacao recem-inserida: nasce NAO lida para todos.
function paraBaseNova(linha: LinhaNotificacaoNova): NotificacaoBase {
  return paraBase({ ...linha, lida: false })
}

export function SupabaseNotificationsProvider({ children }: { children: ReactNode }) {
  const [base, setBase] = useState<NotificacaoBase[]>([])
  const [ringTick, setRingTick] = useState(0)
  // Relogio do "ha quanto tempo": re-renderiza a lista a cada minuto.
  const [clockTick, setClockTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((tick) => tick + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const carregar = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('vw_notificacoes_usuario')
      .select('id, tipo, titulo, descricao, silencioso, lida, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      console.warn('Erro ao carregar notificações:', error.message)
      return
    }
    setBase((data as LinhaNotificacao[]).map(paraBase))
  }, [])

  useEffect(() => {
    if (!supabase) return
    // Carga inicial de sistema externo + assinatura realtime (setState nos callbacks).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar()
    const canal = supabase
      .channel('sino-notificacoes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
        const linha = payload.new as LinhaNotificacaoNova
        setBase((atual) => (atual.some((n) => n.id === linha.id) ? atual : [paraBaseNova(linha), ...atual]))
        if (!linha.silencioso) setRingTick((tick) => tick + 1)
      })
      // Meu "lido" chega por notificacao_leitura (a RLS entrega so as MINHAS linhas):
      // mantem a sincronia entre aparelhos do mesmo login (ex.: tablets do balcao).
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacao_leitura' }, (payload) => {
        const linha = payload.new as { notificacao_id: string }
        setBase((atual) => atual.map((n) => (n.id === linha.notificacao_id ? { ...n, lida: true } : n)))
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
    setBase((atual) => atual.map((item) => (item.lida ? item : { ...item, lida: true })))
    void (async () => {
      const { error } = await supabase!.rpc('fn_marcar_todas_lidas')
      if (error) console.warn('Erro ao marcar lidas:', error.message)
    })()
  }, [])

  const marcarLida = useCallback((id: string) => {
    setBase((atual) => atual.map((item) => (item.id === id && !item.lida ? { ...item, lida: true } : item)))
    void (async () => {
      const { error } = await supabase!.rpc('fn_marcar_lida', { p_notificacao_id: id })
      if (error) console.warn('Erro ao marcar lida:', error.message)
    })()
  }, [])

  // Deriva o "tempo" a cada render relevante (novas linhas OU o tick do minuto).
  const notificacoes = useMemo<Notificacao[]>(
    () => base.map(({ createdAt, ...resto }) => ({ ...resto, tempo: tempoRelativo(createdAt) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clockTick e o relogio proposital do tempo relativo
    [base, clockTick],
  )

  const naoLidas = notificacoes.reduce((total, item) => total + (item.lida ? 0 : 1), 0)

  const value = useMemo<NotificationsContextValue>(
    () => ({ notificacoes, naoLidas, ringTick, notificar, marcarTodasLidas, marcarLida }),
    [notificacoes, naoLidas, ringTick, notificar, marcarTodasLidas, marcarLida],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
