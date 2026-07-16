import { ChevronDown, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { usePrimaryAction } from '@/components/layout/primary-action'
import { useSearchQuery } from '@/components/layout/search'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ClienteDrawer } from '@/features/clientes/ClienteDrawer'
import { statusLabel, statusVariant } from '@/features/reservas/status'
import { useGsapListRefresh } from '@/lib/animations'
import { enderecoEntregaDaReserva, quadraDaReserva } from '@/data/mock-inventory'
import { onlyDigits } from '@/lib/masks'
import { cn } from '@/lib/utils'
import { useInventory } from '@/store/inventory'
import { useSessao } from '@/store/sessao'
import type { Cliente, Reserva, ReservaStatus } from '@/types/inventory'

const statusAtivo = (status: ReservaStatus) => status === 'reservado' || status === 'parcial'

/**
 * Pedidos vinculados ao cliente. Casa pela ENTIDADE: por id quando a reserva tem clienteId
 * (reservas novas); senao cai no nome (reservas mock antigas). Ordena os em aberto primeiro.
 */
function pedidosDoCliente(cliente: Cliente, reservas: Reserva[]) {
  return reservas
    .filter((reserva) => (reserva.clienteId ? reserva.clienteId === cliente.id : reserva.cliente === cliente.nome))
    .sort((a, b) => Number(statusAtivo(b.status)) - Number(statusAtivo(a.status)))
}

export function ClientesPage() {
  const { clientes, reservas, adicionarCliente, atualizarCliente, removerCliente } = useInventory()
  const [clienteOpen, setClienteOpen] = useState(false)
  const [clienteSeq, setClienteSeq] = useState(0)
  const [clienteEdit, setClienteEdit] = useState<Cliente | null>(null)
  const [clienteExcluir, setClienteExcluir] = useState<Cliente | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null)
  const clientesTableRef = useRef<HTMLTableElement>(null)
  const busca = useSearchQuery()

  usePrimaryAction(() => {
    setClienteEdit(null)
    setClienteSeq((seq) => seq + 1)
    setClienteOpen(true)
  })

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const digitos = onlyDigits(termo)
    const base =
      termo === ''
        ? clientes
        : clientes.filter(
            (cliente) =>
              cliente.nome.toLowerCase().includes(termo) ||
              cliente.telefone.toLowerCase().includes(termo) ||
              (digitos.length > 0 &&
                (onlyDigits(cliente.documento).includes(digitos) || onlyDigits(cliente.telefone).includes(digitos))),
          )
    return [...base].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
  }, [clientes, busca])

  // So a membership (ids) entra na chave: editar 1 cliente nao reanima a tabela inteira.
  const animacaoKey = filtrados.map((cliente) => cliente.id).join('|')
  useGsapListRefresh(clientesTableRef, [animacaoKey])

  function alternarExpandido(id: string) {
    setExpandido((atual) => (atual === id ? null : id))
    setPedidoExpandido(null)
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteEdit(cliente)
    setClienteSeq((seq) => seq + 1)
    setClienteOpen(true)
  }

  function salvarCliente(dados: Parameters<typeof adicionarCliente>[0]) {
    if (clienteEdit) {
      atualizarCliente(clienteEdit.id, dados)
    } else {
      adicionarCliente(dados)
    }
    setClienteOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="max-lg:border-0 max-lg:bg-transparent">
        <CardHeader className="max-lg:hidden">
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Cadastro dos clientes da loja. Clique em um cliente para ver os pedidos.</CardDescription>
        </CardHeader>
        <CardContent className="max-lg:p-0">
          {filtrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {clientes.length === 0
                ? 'Nenhum cliente cadastrado ainda. Use “Novo cliente” no topo.'
                : 'Nenhum cliente encontrado para a busca.'}
            </p>
          ) : (
          <>
            {/* Mobile/tablet: lista de cards (a tabela nao cabe abaixo de lg) */}
            <div className="flex flex-col gap-3 lg:hidden">
              {filtrados.map((cliente) => {
                const pedidos = pedidosDoCliente(cliente, reservas)
                return (
                  <ClienteCard
                    key={cliente.id}
                    cliente={cliente}
                    pedidos={pedidos}
                    aberto={expandido === cliente.id}
                    pedidoExpandido={pedidoExpandido}
                    onToggle={() => alternarExpandido(cliente.id)}
                    onTogglePedido={(id) => setPedidoExpandido((atual) => (atual === id ? null : id))}
                    onEditar={() => abrirEdicao(cliente)}
                    onExcluir={() => setClienteExcluir(cliente)}
                  />
                )
              })}
            </div>

            {/* Desktop: tabela completa */}
            <table ref={clientesTableRef} className="data-table hidden lg:table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th className="text-center">Pedidos Totais</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((cliente) => {
                  const pedidos = pedidosDoCliente(cliente, reservas)
                  const aberto = expandido === cliente.id
                  return (
                    <ClienteRow
                      key={cliente.id}
                      cliente={cliente}
                      pedidos={pedidos}
                      aberto={aberto}
                      pedidoExpandido={pedidoExpandido}
                      onToggle={() => alternarExpandido(cliente.id)}
                      onTogglePedido={(id) => setPedidoExpandido((atual) => (atual === id ? null : id))}
                      onEditar={() => abrirEdicao(cliente)}
                      onExcluir={() => setClienteExcluir(cliente)}
                    />
                  )
                })}
              </tbody>
            </table>
          </>
          )}
        </CardContent>
      </Card>

      <ClienteDrawer
        key={clienteSeq}
        open={clienteOpen}
        cliente={clienteEdit}
        onClose={() => setClienteOpen(false)}
        onSave={salvarCliente}
      />

      <ConfirmDialog
        open={Boolean(clienteExcluir)}
        title="Excluir cliente?"
        description={
          clienteExcluir ? (
            <>
              O cliente <strong className="text-foreground">{clienteExcluir.nome}</strong> será removido do cadastro.
              Esta ação não pode ser desfeita.
            </>
          ) : undefined
        }
        confirmLabel="Excluir cliente"
        cancelLabel="Voltar"
        tone="danger"
        onConfirm={() => {
          if (clienteExcluir) removerCliente(clienteExcluir.id)
        }}
        onClose={() => setClienteExcluir(null)}
      />
    </div>
  )
}

function ClienteRow({
  cliente,
  pedidos,
  aberto,
  pedidoExpandido,
  onToggle,
  onTogglePedido,
  onEditar,
  onExcluir,
}: {
  cliente: Cliente
  pedidos: Reserva[]
  aberto: boolean
  pedidoExpandido: string | null
  onToggle: () => void
  onTogglePedido: (id: string) => void
  onEditar: () => void
  onExcluir: () => void
}) {
  const { podeEditar } = useSessao()
  const painelId = `cliente-${cliente.id}-pedidos`
  // R-07: pedido multi-item vira N linhas com o mesmo PED — a coluna conta PEDIDOS, nao linhas.
  const totalPedidos = new Set(pedidos.map((pedido) => pedido.pedido)).size
  // Regra anti-orfa (mesma do produto/lote): cliente com pedido ativo nao pode ser excluido.
  const temPedidoAtivo = pedidos.some((pedido) => statusAtivo(pedido.status))
  return (
    <>
      <tr className="cursor-pointer transition-colors hover:bg-muted/40" onClick={onToggle}>
        <td>
          <button
            type="button"
            className="flex items-center gap-2 text-left"
            aria-expanded={aberto}
            aria-controls={painelId}
            onClick={(event) => {
              event.stopPropagation()
              onToggle()
            }}
          >
            <ChevronDown
              aria-hidden="true"
              className={cn('size-4 shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-180')}
            />
            <span className="min-w-0">
              <strong className="block">{cliente.nome}</strong>
              <span className="block font-mono text-sm text-muted-foreground">{cliente.documento}</span>
            </span>
          </button>
        </td>
        <td>{cliente.telefone}</td>
        <td className="numeric text-center font-semibold">{totalPedidos}</td>
        <td>
          {podeEditar ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation()
                  onEditar()
                }}
              >
                Editar
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-danger disabled:opacity-40"
                aria-label={`Excluir ${cliente.nome}`}
                title={temPedidoAtivo ? 'Cliente com pedido ativo não pode ser excluído' : 'Excluir cliente'}
                disabled={temPedidoAtivo}
                onClick={(event) => {
                  event.stopPropagation()
                  onExcluir()
                }}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>
          ) : null}
        </td>
      </tr>
      {aberto ? (
        <tr>
          <td colSpan={4} className="bg-muted/15 p-0">
            <div id={painelId} className="px-4 py-4">
              <PedidosDoCliente
                pedidos={pedidos}
                pedidoExpandido={pedidoExpandido}
                onTogglePedido={onTogglePedido}
              />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function ClienteCard({
  cliente,
  pedidos,
  aberto,
  pedidoExpandido,
  onToggle,
  onTogglePedido,
  onEditar,
  onExcluir,
}: {
  cliente: Cliente
  pedidos: Reserva[]
  aberto: boolean
  pedidoExpandido: string | null
  onToggle: () => void
  onTogglePedido: (id: string) => void
  onEditar: () => void
  onExcluir: () => void
}) {
  const { podeEditar } = useSessao()
  const painelId = `cliente-card-${cliente.id}-pedidos`
  // R-07: pedido multi-item vira N linhas com o mesmo PED — a coluna conta PEDIDOS, nao linhas.
  const totalPedidos = new Set(pedidos.map((pedido) => pedido.pedido)).size
  // Regra anti-orfa (mesma do produto/lote): cliente com pedido ativo nao pode ser excluido.
  const temPedidoAtivo = pedidos.some((pedido) => statusAtivo(pedido.status))
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-expanded={aberto}
        aria-controls={painelId}
        onClick={onToggle}
      >
        <ChevronDown
          aria-hidden="true"
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-180')}
        />
        <span className="min-w-0 flex-1">
          <strong className="block truncate">{cliente.nome}</strong>
          <span className="block font-mono text-sm text-muted-foreground">{cliente.documento}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="numeric block font-semibold">{totalPedidos}</span>
          <span className="block text-xs text-muted-foreground">pedido{totalPedidos === 1 ? '' : 's'}</span>
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
        <span className="text-sm text-muted-foreground">{cliente.telefone}</span>
        {podeEditar ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onEditar}>
              Editar
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground hover:text-danger disabled:opacity-40"
              aria-label={`Excluir ${cliente.nome}`}
              title={temPedidoAtivo ? 'Cliente com pedido ativo não pode ser excluído' : 'Excluir cliente'}
              disabled={temPedidoAtivo}
              onClick={onExcluir}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {aberto ? (
        <div id={painelId} className="border-t bg-muted/15 px-4 py-4">
          <PedidosDoCliente pedidos={pedidos} pedidoExpandido={pedidoExpandido} onTogglePedido={onTogglePedido} />
        </div>
      ) : null}
    </div>
  )
}

function PedidosDoCliente({
  pedidos,
  pedidoExpandido,
  onTogglePedido,
}: {
  pedidos: Reserva[]
  pedidoExpandido: string | null
  onTogglePedido: (id: string) => void
}) {
  const { clientes, lotes } = useInventory()
  if (pedidos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum pedido para este cliente ainda.</p>
  }
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Histórico de pedidos</h4>
      <div className="flex flex-col gap-2">
        {pedidos.map((pedido) => {
          const aberto = pedidoExpandido === pedido.id
          const detalheId = `pedido-${pedido.id}-detalhe`
          return (
            <div key={pedido.id} className="overflow-hidden rounded-lg border bg-card">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                onClick={() => onTogglePedido(pedido.id)}
                aria-expanded={aberto}
                aria-controls={detalheId}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <ChevronDown
                    aria-hidden="true"
                    className={cn('size-4 shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-180')}
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-sm text-primary">{pedido.pedido}</span>
                    <span className="block truncate font-semibold">{pedido.produto}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="numeric text-sm text-muted-foreground">{pedido.caixas} cx</span>
                  <Badge variant={statusVariant[pedido.status]}>{statusLabel[pedido.status]}</Badge>
                </span>
              </button>
              {aberto ? (
                <dl id={detalheId} className="grid grid-cols-2 gap-x-4 gap-y-3 border-t bg-muted/15 px-4 py-3 sm:grid-cols-3">
                  <Detalhe label="Lote / Quadra" value={`${pedido.lote} · ${quadraDaReserva(pedido, lotes)}`} mono />
                  <Detalhe label="Quantidade" value={`${pedido.caixas} cx · ${pedido.m2.toLocaleString('pt-BR')} m²`} numeric />
                  <Detalhe label="Criado em" value={pedido.data} />
                  {pedido.dataPrevista ? <Detalhe label="Entrega prevista" value={pedido.dataPrevista} /> : null}
                  {pedido.caixasEntregues ? <Detalhe label="Já entregue" value={`${pedido.caixasEntregues} cx`} numeric /> : null}
                  <Detalhe label="Endereço de entrega" value={enderecoEntregaDaReserva(pedido, clientes) ?? 'Retirada na loja'} />
                  {pedido.observacoes ? (
                    <div className="col-span-full">
                      <dt className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">Observações</dt>
                      <dd className="mt-1 text-sm">{pedido.observacoes}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Detalhe({ label, value, mono = false, numeric = false }: { label: string; value: string; mono?: boolean; numeric?: boolean }) {
  return (
    <div>
      <dt className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className={mono ? 'mt-1 font-mono text-sm' : numeric ? 'numeric mt-1 text-sm font-semibold' : 'mt-1 text-sm font-semibold'}>
        {value}
      </dd>
    </div>
  )
}
