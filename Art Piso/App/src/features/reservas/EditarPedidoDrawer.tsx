import { CheckCircle2, ListPlus, Lock, PencilLine, Plus, Trash2, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { caixasDisponiveis, clienteDaReserva, formatM2, formatPreco } from '@/data/mock-inventory'
import { ClienteSelector } from '@/features/reservas/ClienteSelector'
import { RegimeTogglePanel } from '@/features/reservas/RegimeTogglePanel'
import { formatData } from '@/lib/masks'
import { caixasTravadasReserva, dataPrevistaLonga } from '@/lib/reserva-regime'
import { useInventory, type EditarPedidoInput } from '@/store/inventory'
import type { Cliente, Reserva, ReservaStatus } from '@/types/inventory'

const statusLabel: Record<ReservaStatus, string> = {
  reservado: 'Reservado',
  parcial: 'Entrega parcial',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
}
const statusVariant: Record<ReservaStatus, 'reserved' | 'success' | 'danger' | 'warning' | 'default'> = {
  reservado: 'reserved',
  parcial: 'warning',
  entregue: 'success',
  cancelado: 'danger',
  estornado: 'default',
}

/** Item editavel do carrinho. `reservaId` ausente = item novo; caixas em texto para o input. */
type ItemEdit = { key: string; reservaId?: string; loteId: string; caixas: string }

type EditarPedidoDrawerProps = {
  /** Uma linha do pedido a editar (identifica o PED). */
  reserva: Reserva | null
  onClose: () => void
  onConfirm: (input: EditarPedidoInput) => void
}

/**
 * Editor de PEDIDO inteiro (R-07, "carrinho em edicao"). Edita as linhas RESERVADAS (quantidade,
 * adicionar/remover) e os dados compartilhados (cliente, data, observacoes). Linhas parciais/
 * entregues/canceladas aparecem TRAVADAS (so leitura). Remover linha = cancelar (deixa rastro).
 */
export function EditarPedidoDrawer({ reserva, onClose, onConfirm }: EditarPedidoDrawerProps) {
  const { lotes: todosLotes, reservas, clientes } = useInventory()
  const loteById = (id: string) => todosLotes.find((l) => l.id === id)
  const loteByCode = (code: string) => todosLotes.find((l) => l.lote === code)

  const linhasDoPedido = reserva ? reservas.filter((r) => r.pedido === reserva.pedido) : []
  const reservadoLines = linhasDoPedido.filter((r) => r.status === 'reservado')
  const linhasTravadas = linhasDoPedido.filter((r) => r.status !== 'reservado')

  const [cliente, setCliente] = useState<Cliente | null>(() =>
    reserva ? clienteDaReserva(reserva, clientes) ?? null : null,
  )
  const [cadastroAberto, setCadastroAberto] = useState(false)
  const [dataPrevista, setDataPrevista] = useState(reserva?.dataPrevista ?? '')
  const [manterReservadoAgora, setManterReservadoAgora] = useState(reserva?.regime === 'travado')
  const [observacoes, setObservacoes] = useState(reserva?.observacoes ?? '')
  const [itens, setItens] = useState<ItemEdit[]>(() =>
    reservadoLines.map((r) => ({
      key: r.id,
      reservaId: r.id,
      loteId: loteByCode(r.lote)?.id ?? '',
      caixas: String(r.caixas),
    })),
  )
  // Item em construcao (builder de novos itens).
  const [builderLoteId, setBuilderLoteId] = useState('')
  const [builderBusca, setBuilderBusca] = useState('')
  const [builderCaixas, setBuilderCaixas] = useState('')

  const entregaLonga = dataPrevistaLonga(dataPrevista)

  // Travadas originais por reserva, para liberar o "add-back" no teto de quantidade.
  const travadasOriginais = new Map<string, number>()
  for (const r of reservadoLines) travadasOriginais.set(r.id, caixasTravadasReserva(r))

  function maxDoItem(item: ItemEdit) {
    const lote = loteById(item.loteId)
    if (!lote || entregaLonga) return Infinity
    const addBack = item.reservaId ? travadasOriginais.get(item.reservaId) ?? 0 : 0
    return caixasDisponiveis(lote) + addBack
  }

  function itemValido(item: ItemEdit) {
    const lote = loteById(item.loteId)
    const qtd = Number(item.caixas)
    return Boolean(lote) && Number.isFinite(qtd) && qtd >= 1 && qtd <= maxDoItem(item)
  }

  // Lotes ja presentes no pedido (itens + travados): nao podem ser re-adicionados.
  const lotesNoPedido = new Set<string>([
    ...itens.map((item) => item.loteId),
    ...linhasTravadas.map((r) => loteByCode(r.lote)?.id ?? ''),
  ])

  const buscaTrim = builderBusca.trim().toLowerCase()
  const opcoesLote = todosLotes
    .filter((l) => !lotesNoPedido.has(l.id) && caixasDisponiveis(l) > 0)
    .filter((l) => (buscaTrim === '' ? true : `${l.produto} ${l.lote}`.toLowerCase().includes(buscaTrim)))
    .slice(0, 8)
    .map((l) => ({ value: l.id, label: `${l.produto} - ${l.lote}`, hint: `${caixasDisponiveis(l)} cx · ${l.quadra}` }))

  const builderLote = loteById(builderLoteId)
  const builderDisp = builderLote ? caixasDisponiveis(builderLote) : 0
  const builderQtd = Number(builderCaixas)
  const builderQtdValida = Number.isFinite(builderQtd) && builderQtd >= 1
  const builderExcede = Boolean(builderLote) && !entregaLonga && builderQtd > builderDisp
  const builderPodeAdicionar = Boolean(builderLote) && builderQtdValida && !builderExcede

  function adicionarItem() {
    if (!builderLote || !builderPodeAdicionar) return
    setItens((atual) => [...atual, { key: crypto.randomUUID(), loteId: builderLote.id, caixas: builderCaixas }])
    setBuilderLoteId('')
    setBuilderBusca('')
    setBuilderCaixas('')
  }

  const resumo = itens.reduce(
    (acc, item) => {
      const lote = loteById(item.loteId)
      const qtd = Number(item.caixas)
      if (!lote || !Number.isFinite(qtd)) return acc
      acc.caixas += qtd
      acc.valor += qtd * lote.m2PorCaixa * lote.precoM2
      acc.disponivel += caixasDisponiveis(lote) + (item.reservaId ? travadasOriginais.get(item.reservaId) ?? 0 : 0)
      return acc
    },
    { caixas: 0, valor: 0, disponivel: 0 },
  )

  const valido = cliente !== null && itens.length >= 1 && itens.every(itemValido)

  function confirmar() {
    if (!reserva || !valido || !cliente) return
    onConfirm({
      pedidoOriginal: reserva.pedido,
      clienteId: cliente.id,
      cliente: cliente.nome,
      documento: cliente.documento,
      telefone: cliente.telefone,
      observacoes,
      dataPrevista,
      manterReservadoAgora: entregaLonga ? manterReservadoAgora : undefined,
      itens: itens.map((item) => ({ reservaId: item.reservaId, loteId: item.loteId, caixas: Number(item.caixas) })),
    })
  }

  return (
    <Drawer
      open={Boolean(reserva)}
      title="Editar pedido"
      description={reserva ? `Pedido ${reserva.pedido}` : undefined}
      onClose={onClose}
      closeOnEsc={!cadastroAberto}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-[2]" disabled={!valido} onClick={confirmar}>
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
            Salvar alterações
          </Button>
        </div>
      }
    >
      {reserva ? (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <SectionLabel icon={UserRound}>Cliente</SectionLabel>
            <ClienteSelector cliente={cliente} onChange={setCliente} onCadastroOpenChange={setCadastroAberto} hideLabel />
          </section>

          <section className="flex flex-col gap-4">
            <SectionLabel icon={ListPlus}>Itens do pedido</SectionLabel>

            {itens.length > 0 ? (
              <div className="flex flex-col gap-3">
                {itens.map((item) => {
                  const lote = loteById(item.loteId)
                  if (!lote) return null
                  const qtd = Number(item.caixas)
                  const m2 = Number.isFinite(qtd) ? qtd * lote.m2PorCaixa : 0
                  const max = maxDoItem(item)
                  const excede = !entregaLonga && Number.isFinite(qtd) && qtd > max
                  return (
                    <div key={item.key} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{lote.produto}</p>
                          <p className="font-mono text-xs text-muted-foreground">{lote.lote} · {lote.quadra}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-muted-foreground hover:text-danger"
                          onClick={() => setItens((atual) => atual.filter((it) => it.key !== item.key))}
                          aria-label={`Remover ${lote.produto} ${lote.lote}`}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 items-end gap-3">
                        <Field label="Quantidade (caixas)">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={entregaLonga ? undefined : max}
                            value={item.caixas}
                            onChange={(event) =>
                              setItens((atual) => atual.map((it) => (it.key === item.key ? { ...it, caixas: event.target.value } : it)))
                            }
                          />
                        </Field>
                        <div className="pb-2 text-right">
                          <p className="numeric text-sm font-semibold">{formatM2(m2)} m²</p>
                          <p className="numeric text-xs text-muted-foreground">{formatPreco(m2 * lote.precoM2)}</p>
                        </div>
                      </div>
                      {excede ? (
                        <p className="mt-1 text-xs font-semibold text-danger">Acima do disponível ({max} cx) no lote {lote.lote}.</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Adicione ao menos um lote ao pedido.</p>
            )}

            <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Adicionar lote</span>
              <Autocomplete
                value={builderBusca}
                onChange={(text) => {
                  setBuilderBusca(text)
                  setBuilderLoteId('')
                }}
                onSelect={(id) => {
                  const escolhido = loteById(id)
                  setBuilderLoteId(id)
                  if (escolhido) setBuilderBusca(`${escolhido.produto} - ${escolhido.lote}`)
                }}
                options={opcoesLote}
                name="novoLote"
                placeholder="Digite o produto ou o lote…"
              />
              {builderLote ? (
                <div className="grid grid-cols-2 items-end gap-3">
                  <Field label="Quantidade (caixas)">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={entregaLonga ? undefined : builderDisp}
                      value={builderCaixas}
                      placeholder="0"
                      onChange={(event) => setBuilderCaixas(event.target.value)}
                    />
                  </Field>
                  <p className="pb-2 text-right text-xs text-muted-foreground">
                    Disponível <span className="numeric font-semibold text-primary">{builderDisp} cx</span>
                  </p>
                </div>
              ) : null}
              <Button type="button" variant="outline" disabled={!builderPodeAdicionar} onClick={adicionarItem}>
                <Plus aria-hidden="true" data-icon="inline-start" />
                Adicionar item
              </Button>
            </div>

            {linhasTravadas.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <Lock aria-hidden="true" className="size-3.5" />
                  Linhas não editáveis aqui
                </span>
                {linhasTravadas.map((linha) => (
                  <div key={linha.id} className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{linha.produto}</p>
                      <p className="font-mono text-xs text-muted-foreground">{linha.lote} · {linha.caixas} cx</p>
                    </div>
                    <Badge variant={statusVariant[linha.status]}>{statusLabel[linha.status]}</Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-5">
            <SectionLabel icon={PencilLine}>Dados do pedido</SectionLabel>

            <Field label="Número do pedido">
              <Input value={reserva.pedido} readOnly disabled />
            </Field>

            <div className="-mt-2 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total do pedido</span>
              <span className="numeric font-bold text-primary">{resumo.caixas} cx · {formatPreco(resumo.valor)}</span>
            </div>

            <Field label="Data prevista de entrega">
              <Input
                name="dataPrevista"
                inputMode="numeric"
                autoComplete="off"
                value={dataPrevista}
                onChange={(event) => setDataPrevista(formatData(event.target.value))}
                placeholder="DD/MM/AAAA (opcional)"
              />
            </Field>

            {entregaLonga ? (
              <RegimeTogglePanel
                checked={manterReservadoAgora}
                onCheckedChange={setManterReservadoAgora}
                quantidade={resumo.caixas}
                disponivel={resumo.disponivel}
              />
            ) : null}

            <Field label="Observações">
              <Textarea
                rows={3}
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                placeholder="Detalhes adicionais sobre o pedido ou a entrega..."
              />
            </Field>
          </section>
        </div>
      ) : null}
    </Drawer>
  )
}

function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-primary">
      <Icon aria-hidden="true" className="size-4" />
      <h3 className="text-xs font-bold uppercase tracking-[0.18em]">{children}</h3>
    </div>
  )
}
