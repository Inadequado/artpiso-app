import { Ban, CalendarPlus, PackageCheck, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { agruparPorProduto } from '@/data/mock-inventory'
import { cn } from '@/lib/utils'
import { useInventory } from '@/store/inventory'
import type { EventoHistorico, EventoTipo, FiltroHistorico } from '@/types/inventory'

const LIMITE = 20

const tipoConfig: Record<EventoTipo, { label: string; Icon: LucideIcon; tone: string }> = {
  reserva: { label: 'Reserva criada', Icon: CalendarPlus, tone: 'text-primary' },
  entrega: { label: 'Entrega', Icon: PackageCheck, tone: 'text-success' },
  devolucao: { label: 'Devolução', Icon: RotateCcw, tone: 'text-lowStock' },
  cancelamento: { label: 'Cancelamento', Icon: Ban, tone: 'text-danger' },
  ajuste: { label: 'Ajuste de estoque', Icon: SlidersHorizontal, tone: 'text-muted-foreground' },
}

const PERIODOS: Array<{ label: string; dias: number }> = [
  { label: 'Tudo', dias: 0 },
  { label: 'Hoje', dias: 1 },
  { label: '7 dias', dias: 7 },
  { label: '30 dias', dias: 30 },
]

const TIPOS: Array<{ value: EventoTipo | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: 'reserva', label: 'Reservas criadas' },
  { value: 'entrega', label: 'Entregas' },
  { value: 'devolucao', label: 'Devoluções' },
  { value: 'cancelamento', label: 'Cancelamentos' },
  { value: 'ajuste', label: 'Ajustes de estoque' },
]

/** Linha do tempo completa (reservas, entregas, devoluções, cancelamentos e ajustes) com
 *  filtros e paginação. Modal central; a busca é paginada no provider (Supabase = view). */
export function HistoricoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { carregarHistorico, clientes, lotes, usuarios } = useInventory()

  const [periodoDias, setPeriodoDias] = useState(0)
  const [tipo, setTipo] = useState<EventoTipo | 'todos'>('todos')
  const [clienteId, setClienteId] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [usuario, setUsuario] = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [busca, setBusca] = useState('')

  const [eventos, setEventos] = useState<EventoHistorico[]>([])
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(false)

  // Debounce da busca (não dispara uma query por tecla).
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaInput), 300)
    return () => clearTimeout(t)
  }, [buscaInput])

  const filtro = useMemo<FiltroHistorico>(
    () => ({
      periodoDias,
      tipo,
      clienteId: clienteId || undefined,
      produtoId: produtoId || undefined,
      usuario: usuario || undefined,
      busca: busca || undefined,
    }),
    [periodoDias, tipo, clienteId, produtoId, usuario, busca],
  )

  // Primeira página: ao abrir e a cada mudança de filtro.
  useEffect(() => {
    if (!open) return
    let ativo = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load assincrono: indicador de carregando
    setCarregando(true)
    carregarHistorico(filtro, { limite: LIMITE, offset: 0 }).then((pg) => {
      if (!ativo) return
      setEventos(pg.eventos)
      setTemMais(pg.temMais)
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [open, filtro, carregarHistorico])

  // Fecha no Esc.
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function carregarMais() {
    setCarregando(true)
    carregarHistorico(filtro, { limite: LIMITE, offset: eventos.length }).then((pg) => {
      setEventos((atual) => [...atual, ...pg.eventos])
      setTemMais(pg.temMais)
      setCarregando(false)
    })
  }

  const produtos = useMemo(() => agruparPorProduto(lotes), [lotes])
  const clienteOptions = [{ value: '', label: 'Todos os clientes' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]
  const produtoOptions = [{ value: '', label: 'Todos os produtos' }, ...produtos.map((p) => ({ value: p.id, label: p.produto }))]
  const usuarioOptions = [{ value: '', label: 'Todos os usuários' }, ...usuarios.map((u) => ({ value: u.nome, label: u.nome }))]

  if (!open) return null

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Histórico completo">
        <div
          className="flex h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Cabeçalho */}
          <header className="flex items-center justify-between gap-4 border-b p-5">
            <div>
              <h2 className="text-lg font-bold">Histórico completo</h2>
              <p className="text-sm text-muted-foreground">Reservas, entregas, devoluções, cancelamentos e ajustes.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
              <X aria-hidden="true" />
            </Button>
          </header>

          {/* Filtros */}
          <div className="flex flex-col gap-3 border-b p-4">
            <div className="flex flex-wrap gap-1.5">
              {PERIODOS.map((p) => (
                <button
                  key={p.dias}
                  type="button"
                  onClick={() => setPeriodoDias(p.dias)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-semibold transition',
                    periodoDias === p.dias ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SelectMenu value={tipo} onChange={(v) => setTipo(v as EventoTipo | 'todos')} options={TIPOS} />
              <SelectMenu value={clienteId} onChange={setClienteId} options={clienteOptions} placeholder="Cliente" />
              <SelectMenu value={produtoId} onChange={setProdutoId} options={produtoOptions} placeholder="Produto" />
              <SelectMenu value={usuario} onChange={setUsuario} options={usuarioOptions} placeholder="Usuário" />
            </div>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-icon="inline-start" />
              <Input
                type="search"
                value={buscaInput}
                onChange={(e) => setBuscaInput(e.target.value)}
                placeholder="Buscar por pedido, produto, cliente, lote…"
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="app-scrollbar flex-1 overflow-y-auto p-4">
            {eventos.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {carregando ? 'Carregando…' : 'Nenhum evento para esses filtros.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {eventos.map((evento) => (
                  <EventoLinha key={evento.id} evento={evento} />
                ))}
              </ul>
            )}
          </div>

          {/* Rodapé */}
          <footer className="flex items-center justify-between gap-3 border-t p-4">
            <span className="text-xs text-muted-foreground">{eventos.length} evento{eventos.length === 1 ? '' : 's'}</span>
            {temMais ? (
              <Button variant="outline" onClick={carregarMais} disabled={carregando}>
                {carregando ? 'Carregando…' : 'Carregar mais'}
              </Button>
            ) : null}
          </footer>
        </div>
      </div>
    </>
  )
}

function EventoLinha({ evento }: { evento: EventoHistorico }) {
  const { label, Icon, tone } = tipoConfig[evento.tipo]
  const descricao =
    evento.tipo === 'ajuste'
      ? evento.detalhe
      : [
          evento.caixas != null ? `${evento.caixas} cx` : null,
          evento.detalhe ? `Pedido ${evento.detalhe}` : null,
          evento.cliente || null,
          evento.lote ? `Lote ${evento.lote}` : null,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <li className="flex gap-3 rounded-lg border p-3">
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center', tone)}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {label}
          {evento.produto ? <span className="text-muted-foreground"> · {evento.produto}</span> : null}
        </p>
        {descricao ? <p className="text-sm text-muted-foreground">{descricao}</p> : null}
        {evento.observacao ? <p className="mt-1 text-sm italic text-muted-foreground">“{evento.observacao}”</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">
          por {evento.usuario ?? '—'} · {evento.data}
        </p>
      </div>
    </li>
  )
}
