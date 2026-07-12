import { Boxes, CalendarCheck, CheckCircle2, ChevronDown, ChevronUp, Link2, PencilLine, RotateCw, Truck, Undo2, XCircle } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { usePrimaryAction } from '@/components/layout/primary-action'
import { useSearchQuery } from '@/components/layout/search'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { MetricCard } from '@/components/ui/metric-card'
import { Textarea } from '@/components/ui/textarea'
import { clienteDaReserva, quadraDaReserva } from '@/data/mock-inventory'
import { DetalhesReservaDrawer } from '@/features/reservas/DetalhesReservaDrawer'
import { EditarPedidoDrawer } from '@/features/reservas/EditarPedidoDrawer'
import { EditarReservaDrawer } from '@/features/reservas/EditarReservaDrawer'
import { EntregaDrawer } from '@/features/reservas/EntregaDrawer'
import { EstornoDrawer } from '@/features/reservas/EstornoDrawer'
import { ReservaDrawer } from '@/features/reservas/ReservaDrawer'
import { RegimeTag } from '@/features/reservas/RegimeTag'
import { useGsapListRefresh } from '@/lib/animations'
import { caixasTravadasReserva } from '@/lib/reserva-regime'
import { cn } from '@/lib/utils'
import { useInventory } from '@/store/inventory'
import type { Reserva, ReservaStatus } from '@/types/inventory'

const statusVariant: Record<ReservaStatus, 'reserved' | 'success' | 'danger' | 'warning' | 'default'> = {
  reservado: 'reserved',
  parcial: 'warning',
  entregue: 'success',
  cancelado: 'danger',
  estornado: 'default',
}

const statusLabel: Record<ReservaStatus, string> = {
  reservado: 'Reservado',
  parcial: 'Entrega parcial',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
}

const statusTabs = [
  { id: 'todas', label: 'Todas' },
  { id: 'reservado', label: 'Reservado' },
  { id: 'parcial', label: 'Parcial' },
  { id: 'entregue', label: 'Entregue' },
  { id: 'cancelado', label: 'Cancelado' },
  { id: 'estornado', label: 'Estornado' },
] as const

type StatusTab = (typeof statusTabs)[number]['id']

type SortKey = 'pedido' | 'cliente'
type SortDir = 'asc' | 'desc'

/** Parte numerica do PED-XXXX, para ordenar por pedido. */
function numeroPedido(pedido: string) {
  const n = Number(pedido.replace(/\D/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function ReservasPage() {
  const { reservas: listaReservas, clientes, lotes, criarPedido, editarPedido, editarReserva, cancelarReserva: cancelarReservaAction, entregarReserva, estornarReserva } = useInventory()
  const [statusFilter, setStatusFilter] = useState<StatusTab>('todas')
  const [sortKey, setSortKey] = useState<SortKey>('pedido')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [novaReservaOpen, setNovaReservaOpen] = useState(false)
  const [novaReservaSeq, setNovaReservaSeq] = useState(0)
  const [editarPedidoItem, setEditarPedidoItem] = useState<Reserva | null>(null)
  const [editarPedidoSeq, setEditarPedidoSeq] = useState(0)
  const [entregaReserva, setEntregaReserva] = useState<Reserva | null>(null)
  const [entregaSeq, setEntregaSeq] = useState(0)
  const [editarSaldoItem, setEditarSaldoItem] = useState<Reserva | null>(null)
  const [editarSaldoSeq, setEditarSaldoSeq] = useState(0)
  const [cancelarReserva, setCancelarReserva] = useState<Reserva | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [estornoReserva, setEstornoReserva] = useState<Reserva | null>(null)
  const [estornoSeq, setEstornoSeq] = useState(0)
  const [detalhesReserva, setDetalhesReserva] = useState<Reserva | null>(null)
  const reservasTableRef = useRef<HTMLTableElement>(null)
  const busca = useSearchQuery()

  usePrimaryAction(() => {
    setNovaReservaSeq((seq) => seq + 1)
    setNovaReservaOpen(true)
  })

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return listaReservas.filter((reserva) => {
      const okStatus = statusFilter === 'todas' || reserva.status === statusFilter
      const nomeCli = clienteDaReserva(reserva, clientes)?.nome ?? reserva.cliente
      const okBusca =
        termo === '' ||
        [reserva.pedido, nomeCli, reserva.produto, reserva.lote, quadraDaReserva(reserva, lotes)].some((campo) =>
          campo.toLowerCase().includes(termo),
        )
      return okStatus && okBusca
    })
  }, [listaReservas, clientes, lotes, statusFilter, busca])

  // So a MEMBERSHIP da lista (ids) entra na chave: trocar aba/filtro/busca ou add/remover reanima;
  // mudar o status de 1 reserva (entregar/cancelar) NAO reanima a tabela inteira.
  const reservasAnimacaoKey = filtradas.map((reserva) => reserva.id).join('|')

  useGsapListRefresh(reservasTableRef, [reservasAnimacaoKey])

  // Contagem por PED na base inteira: define o elo (linha de um pedido com varias linhas).
  const pedidoCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const reserva of listaReservas) {
      map.set(reserva.pedido, (map.get(reserva.pedido) ?? 0) + 1)
    }
    return map
  }, [listaReservas])

  // Ordenacao por coluna (R-07). Secundario sempre por PED para manter as linhas de um mesmo
  // pedido contiguas mesmo ao ordenar por cliente.
  const ordenadas = useMemo(() => {
    const fator = sortDir === 'asc' ? 1 : -1
    return [...filtradas].sort((a, b) => {
      if (sortKey === 'cliente') {
        const na = clienteDaReserva(a, clientes)?.nome ?? a.cliente
        const nb = clienteDaReserva(b, clientes)?.nome ?? b.cliente
        const cmp = na.localeCompare(nb, 'pt-BR')
        if (cmp !== 0) return cmp * fator
        return numeroPedido(b.pedido) - numeroPedido(a.pedido)
      }
      return (numeroPedido(a.pedido) - numeroPedido(b.pedido)) * fator
    })
  }, [filtradas, clientes, sortKey, sortDir])

  // R-07: remove a divisoria quando a proxima linha e do MESMO pedido (agrupa visualmente o PED).
  const semBordaInferior = useMemo(() => {
    const ids = new Set<string>()
    for (let i = 0; i < ordenadas.length - 1; i++) {
      if (ordenadas[i].pedido === ordenadas[i + 1].pedido) ids.add(ordenadas[i].id)
    }
    return ids
  }, [ordenadas])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'pedido' ? 'desc' : 'asc')
    }
  }

  const resumo = useMemo(() => {
    const ativas = listaReservas.filter(
      (reserva) => reserva.status === 'reservado' || reserva.status === 'parcial',
    )
    const caixas = ativas.reduce((total, reserva) => total + caixasTravadasReserva(reserva), 0)
    const rotacionando = ativas.filter((reserva) => reserva.regime === 'rotacionando').length
    const parciais = listaReservas.filter((reserva) => reserva.status === 'parcial').length
    return { ativas: ativas.length, caixas, rotacionando, parciais }
  }, [listaReservas])

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-4 gap-4">
        <MetricCard icon={CalendarCheck} tone="reserved" label="Reservas ativas" value={`${resumo.ativas} ${resumo.ativas === 1 ? 'pedido' : 'pedidos'}`} detail="Aguardando entrega" />
        <MetricCard icon={Boxes} tone="default" label="Caixas separadas" value={`${resumo.caixas} cx`} detail="Separadas no estoque" />
        <MetricCard icon={RotateCw} tone="warning" label="Rotacionando" value={`${resumo.rotacionando} ${resumo.rotacionando === 1 ? 'pedido' : 'pedidos'}`} detail="Estoque girando até a entrega" />
        <MetricCard icon={Truck} tone="warning" label="Entrega parcial" value={`${resumo.parciais} ${resumo.parciais === 1 ? 'pedido' : 'pedidos'}`} detail="Saldo em aberto" />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'rounded px-3 py-1 text-xs font-bold transition-colors',
                statusFilter === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Reservas e pedidos</CardTitle>
          <CardDescription>Acompanhe reservas, entregas e cancelamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <table ref={reservasTableRef} className="data-table">
            <thead>
              <tr>
                <th>
                  <SortButton label="Pedido" active={sortKey === 'pedido'} dir={sortDir} onClick={() => toggleSort('pedido')} />
                </th>
                <th>
                  <SortButton label="Cliente" active={sortKey === 'cliente'} dir={sortDir} onClick={() => toggleSort('cliente')} />
                </th>
                <th>Produto/Lote</th>
                <th className="text-center">Quantidade</th>
                <th className="text-center">Status</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhuma reserva encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                ordenadas.map((reserva) => {
                  const cli = clienteDaReserva(reserva, clientes)
                  const multiLinha = (pedidoCounts.get(reserva.pedido) ?? 0) > 1
                  return (
                  <tr
                    key={reserva.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      semBordaInferior.has(reserva.id) && '[&>td]:!border-b-0',
                    )}
                    tabIndex={0}
                    aria-label={`Abrir pedido ${reserva.pedido}`}
                    onClick={() => setDetalhesReserva(reserva)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setDetalhesReserva(reserva)
                      }
                    }}
                  >
                    <td
                      className={cn(
                        'font-mono text-sm text-primary',
                        multiLinha && 'bg-gradient-to-r from-white/[0.07] to-transparent',
                      )}
                    >
                      <span
                        className="inline-flex items-center gap-1.5"
                        title={multiLinha ? 'Pedido com vários itens (linhas vinculadas)' : undefined}
                      >
                        {reserva.pedido}
                        {multiLinha ? <Link2 aria-hidden="true" className="size-3.5 text-muted-foreground" /> : null}
                      </span>
                    </td>
                    <td>
                      <strong>{cli?.nome ?? reserva.cliente}</strong>
                      <p className="text-sm text-muted-foreground">{cli?.telefone ?? reserva.telefone}</p>
                    </td>
                    <td>
                      <strong>{reserva.produto}</strong>
                      <p className="text-sm text-muted-foreground">{reserva.lote} - {quadraDaReserva(reserva, lotes)}</p>
                    </td>
                    <td className="text-center">
                      <strong className="numeric">{reserva.caixas} cx</strong>
                      <p className="text-sm text-muted-foreground numeric">{reserva.m2.toLocaleString('pt-BR')} m²</p>
                    </td>
                    <td className="text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <Badge variant={statusVariant[reserva.status]}>{statusLabel[reserva.status]}</Badge>
                        {(reserva.status === 'reservado' || reserva.status === 'parcial') && (reserva.regime === 'rotacionando' || reserva.regime === 'travado') ? (
                          <RegimeTag regime={reserva.regime} />
                        ) : null}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {reserva.status === 'reservado' || reserva.status === 'parcial' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation()
                                setEntregaReserva(reserva)
                                setEntregaSeq((seq) => seq + 1)
                              }}
                            >
                              <CheckCircle2 aria-hidden="true" data-icon="inline-start" />{reserva.status === 'parcial' ? 'Entregar restante' : 'Marcar entregue'}
                            </Button>
                            {reserva.status === 'reservado' ? (
                              <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setCancelarReserva(reserva); setMotivoCancelamento('') }}>
                                <XCircle aria-hidden="true" data-icon="inline-start" />Cancelar
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setEditarSaldoItem(reserva); setEditarSaldoSeq((seq) => seq + 1) }}>
                                <PencilLine aria-hidden="true" data-icon="inline-start" />Editar saldo
                              </Button>
                            )}
                          </>
                        ) : reserva.status === 'entregue' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              setEstornoReserva(reserva)
                              setEstornoSeq((seq) => seq + 1)
                            }}
                          >
                            <Undo2 aria-hidden="true" data-icon="inline-start" />Registrar devolução
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ReservaDrawer
        key={novaReservaSeq}
        open={novaReservaOpen}
        onClose={() => setNovaReservaOpen(false)}
        onConfirm={(input) => {
          criarPedido(input)
          setNovaReservaOpen(false)
        }}
      />

      <EditarPedidoDrawer
        key={editarPedidoSeq}
        reserva={editarPedidoItem}
        onClose={() => setEditarPedidoItem(null)}
        onConfirm={(input) => {
          editarPedido(input)
          setEditarPedidoItem(null)
        }}
      />

      <EditarReservaDrawer
        key={editarSaldoSeq}
        reserva={editarSaldoItem}
        onClose={() => setEditarSaldoItem(null)}
        onConfirm={(input) => {
          editarReserva(input)
          setEditarSaldoItem(null)
        }}
      />

      <EntregaDrawer
        key={entregaSeq}
        reserva={entregaReserva}
        onClose={() => setEntregaReserva(null)}
        onConfirm={(input) => {
          entregarReserva(input)
          setEntregaReserva(null)
        }}
      />

      <EstornoDrawer
        key={estornoSeq}
        reserva={estornoReserva}
        onClose={() => setEstornoReserva(null)}
        onConfirm={(input) => {
          estornarReserva(input)
          setEstornoReserva(null)
        }}
      />

      <DetalhesReservaDrawer
        reserva={detalhesReserva}
        onClose={() => setDetalhesReserva(null)}
        onEdit={(reserva) => {
          setDetalhesReserva(null)
          setEditarPedidoItem(reserva)
          setEditarPedidoSeq((seq) => seq + 1)
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelarReserva)}
        title="Cancelar reserva?"
        description={
          cancelarReserva ? (
            <>
              O pedido <strong className="text-foreground">{cancelarReserva.pedido}</strong> de{' '}
              <strong className="text-foreground">{clienteDaReserva(cancelarReserva, clientes)?.nome ?? cancelarReserva.cliente}</strong> será cancelado.{' '}
              {caixasTravadasReserva(cancelarReserva) > 0 ? (
                <>
                  As{' '}
                  <strong className="text-foreground">{caixasTravadasReserva(cancelarReserva)} caixas separadas</strong>{' '}
                  voltarão ao disponível.
                </>
              ) : (
                <>Nenhuma caixa está separada agora.</>
              )}
            </>
          ) : undefined
        }
        confirmLabel="Cancelar reserva"
        cancelLabel="Voltar"
        tone="danger"
        onConfirm={() => {
          if (cancelarReserva) cancelarReservaAction(cancelarReserva.id, motivoCancelamento)
        }}
        onClose={() => setCancelarReserva(null)}
      >
        <Field label="Motivo do cancelamento (opcional)">
          <Textarea
            value={motivoCancelamento}
            onChange={(event) => setMotivoCancelamento(event.target.value)}
            placeholder="Ex.: cliente desistiu, troca de produto…"
            rows={3}
          />
        </Field>
      </ConfirmDialog>
    </div>
  )
}

/** Cabecalho de coluna clicavel (ordenacao). Herda o estilo do th via preflight do Tailwind. */
function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      aria-label={`Ordenar por ${label}`}
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ChevronUp aria-hidden="true" className="size-3.5" />
        ) : (
          <ChevronDown aria-hidden="true" className="size-3.5" />
        )
      ) : null}
    </button>
  )
}
