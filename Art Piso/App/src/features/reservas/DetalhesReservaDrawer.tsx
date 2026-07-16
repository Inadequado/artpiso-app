import { PenLine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { RegimeTag } from '@/features/reservas/RegimeTag'
import { statusLabel, statusVariant } from '@/features/reservas/status'
import { clienteDaReserva, enderecoEntregaDaReserva, quadraDaReserva } from '@/data/mock-inventory'
import { caixasTravadasReserva } from '@/lib/reserva-regime'
import { useInventory } from '@/store/inventory'
import { useSessao } from '@/store/sessao'
import type { Reserva } from '@/types/inventory'

type DetalhesReservaDrawerProps = {
  /** Linha clicada; o drawer mostra TODAS as linhas do mesmo pedido (R-07). */
  reserva: Reserva | null
  onClose: () => void
  onEdit?: (reserva: Reserva) => void
}

/**
 * Visao (somente leitura) do PEDIDO inteiro (R-07): bloco do cliente uma vez no topo e a lista
 * de itens (uma linha = um lote) abaixo. As acoes operacionais por linha (entregar/cancelar)
 * vivem na TABELA; aqui o pedido tem uma unica acao: Editar pedido.
 */
export function DetalhesReservaDrawer({ reserva, onClose, onEdit }: DetalhesReservaDrawerProps) {
  const { clientes, reservas } = useInventory()
  const { podeEditar } = useSessao()
  const cli = reserva ? clienteDaReserva(reserva, clientes) : undefined
  const clienteNome = cli?.nome ?? reserva?.cliente ?? ''
  const clienteDoc = cli?.documento ?? reserva?.documento
  const clienteTel = cli?.telefone ?? reserva?.telefone ?? ''
  const enderecoEntrega = reserva ? enderecoEntregaDaReserva(reserva, clientes) : undefined

  // Todas as linhas do MESMO pedido. Ordena por lote para estabilidade visual.
  const linhas = reserva
    ? reservas.filter((item) => item.pedido === reserva.pedido).sort((a, b) => a.lote.localeCompare(b.lote))
    : []
  const totalCaixas = linhas.reduce((total, item) => total + item.caixas, 0)
  // Linha editavel para o botao unico "Editar pedido" (interim: edita 1 linha por vez).
  const linhaEditavel = linhas.find((item) => item.status === 'reservado') ?? null

  return (
    <Drawer
      open={Boolean(reserva)}
      title="Ver pedido"
      description={reserva ? `Pedido ${reserva.pedido}` : undefined}
      onClose={onClose}
      footer={
        podeEditar && linhaEditavel && onEdit ? (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Fechar
            </Button>
            <Button className="flex-[2]" onClick={() => onEdit(linhaEditavel)}>
              <PenLine aria-hidden="true" data-icon="inline-start" />
              Editar pedido
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        )
      }
    >
      {reserva ? (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
            <DetailItem label="Cliente" value={clienteNome} />
            {clienteDoc ? <DetailItem label="CPF / CNPJ" value={clienteDoc} /> : null}
            <DetailItem label="Telefone" value={clienteTel} />
            <DetailItem label="Criado em" value={reserva.data} />
            {reserva.dataPrevista ? (
              <DetailItem
                label="Entrega prevista"
                value={reserva.dataPrevista}
                tone={reserva.regime === 'rotacionando' ? 'lowstock' : undefined}
              />
            ) : null}
            <div className="col-span-full">
              <DetailItem label="Endereço de entrega" value={enderecoEntrega ?? 'Retirada na loja'} />
            </div>
          </dl>

          {reserva.observacoes ? (
            <div>
              <dt className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">Observações</dt>
              <dd className="mt-1 text-sm">{reserva.observacoes}</dd>
            </div>
          ) : null}

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {linhas.length === 1 ? 'Item do pedido' : `Itens do pedido (${linhas.length})`}
              </h4>
              <span className="numeric text-xs font-semibold text-muted-foreground">{totalCaixas} cx no total</span>
            </div>

            <div className="flex flex-col gap-3">
              {linhas.map((linha) => (
                <ItemPedidoCard key={linha.id} linha={linha} />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </Drawer>
  )
}

/** Card (somente leitura) de uma linha (1 lote) dentro do pedido. */
function ItemPedidoCard({ linha }: { linha: Reserva }) {
  const { lotes } = useInventory()
  const caixasTravadas = caixasTravadasReserva(linha)
  const ativo = linha.status === 'reservado' || linha.status === 'parcial'
  const mostraRegime = ativo && (linha.regime === 'rotacionando' || linha.regime === 'travado')

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{linha.produto}</p>
          <p className="font-mono text-xs text-muted-foreground">{linha.lote} · {quadraDaReserva(linha, lotes)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={statusVariant[linha.status]}>{statusLabel[linha.status]}</Badge>
          {mostraRegime ? <RegimeTag regime={linha.regime} /> : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <DetailItem label={linha.status === 'parcial' ? 'Saldo em aberto' : 'Quantidade'} value={`${linha.caixas} cx`} numeric />
        <DetailItem label="Equivale a" value={`${linha.m2.toLocaleString('pt-BR')} m²`} numeric />
        {linha.caixasEntregues ? <DetailItem label="Já entregue" value={`${linha.caixasEntregues} cx`} numeric /> : null}
        {mostraRegime ? <DetailItem label="Separadas agora" value={`${caixasTravadas} de ${linha.caixas} cx`} numeric /> : null}
      </dl>

      {linha.status === 'cancelado' && linha.motivoCancelamento ? (
        <div className="mt-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2">
          <dt className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-danger">Motivo do cancelamento</dt>
          <dd className="mt-1 text-sm">{linha.motivoCancelamento}</dd>
        </div>
      ) : null}

      {linha.entregas?.length ? (
        <div className="mt-3 flex flex-col gap-2 border-t pt-3">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Entregas</p>
          {linha.entregas.map((entrega) => (
            <div key={entrega.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {entrega.data} · {entrega.responsavel}
                {entrega.lote ? <span className="ml-1 font-mono text-xs"> · {entrega.lote}</span> : null}
                {entrega.quadras ? <span className="ml-1 font-mono text-xs"> · {entrega.quadras}</span> : null}
              </span>
              <span className="numeric font-semibold text-success">{entrega.caixas} cx</span>
            </div>
          ))}
        </div>
      ) : null}

      {linha.estornos?.length ? (
        <div className="mt-3 flex flex-col gap-2 border-t pt-3">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Devoluções</p>
          {linha.estornos.map((estorno) => (
            <div key={estorno.id} className="flex flex-col gap-0.5">
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {estorno.data} · {estorno.responsavel}
                  <span className="ml-1 font-mono text-xs"> · {estorno.quadraDestino}</span>
                </span>
                <span className="numeric font-semibold text-foreground">{estorno.caixas} cx</span>
              </div>
              {estorno.motivo ? (
                <p className="text-xs text-muted-foreground">{estorno.motivo}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DetailItem({
  label,
  value,
  mono = false,
  numeric = false,
  tone,
}: {
  label: string
  value: string
  mono?: boolean
  numeric?: boolean
  tone?: 'lowstock'
}) {
  return (
    <div>
      <dt className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className={tone === 'lowstock' ? 'mt-1 text-sm font-semibold text-lowstock' : mono ? 'mt-1 font-mono text-sm' : numeric ? 'numeric mt-1 text-sm font-semibold' : 'mt-1 text-sm font-semibold'}>
        {value}
      </dd>
    </div>
  )
}
