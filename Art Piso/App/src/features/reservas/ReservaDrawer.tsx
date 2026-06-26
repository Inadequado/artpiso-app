import { CheckCircle2, ListPlus, PencilLine, Plus, Trash2, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { caixasDisponiveis, formatM2, formatPreco, proximoNumeroPedido } from '@/data/mock-inventory'
import { ClienteSelector } from '@/features/reservas/ClienteSelector'
import { RegimeTogglePanel } from '@/features/reservas/RegimeTogglePanel'
import { formatData } from '@/lib/masks'
import { dataPrevistaLonga } from '@/lib/reserva-regime'
import { useInventory, type NovoPedidoInput } from '@/store/inventory'
import type { Cliente, LoteEstoque } from '@/types/inventory'

/** Um item do carrinho: 1 lote + quantidade. Cada item vira 1 linha/reserva (R-01). */
type ItemPedido = { loteId: string; caixas: number }

type ReservaDrawerProps = {
  open: boolean
  onClose: () => void
  /** Quando informado, o primeiro item ja parte deste lote. */
  lote?: LoteEstoque
  /** Quando informado, o seletor de lote oferece apenas estes lotes (fluxo por produto). */
  lotesProduto?: LoteEstoque[]
  /** Emite o pedido (multi-item) a confirmar; o pai persiste no store. */
  onConfirm: (input: NovoPedidoInput) => void
}

/**
 * Nova reserva = PEDIDO multi-item (R-07). O modal segue o mesmo: a area de Produto/Lote
 * vira um construtor que ACUMULA itens (impressao de carrinho). Pedido, Cliente, Data e
 * Observacoes valem para o pedido inteiro; cada item adicionado vira uma linha (1 lote).
 */
export function ReservaDrawer({ open, onClose, lote: loteFixo, lotesProduto, onConfirm }: ReservaDrawerProps) {
  const { lotes: todosLotes, reservas } = useInventory()
  const [pedido, setPedido] = useState(() => proximoNumeroPedido(reservas))
  const [itens, setItens] = useState<ItemPedido[]>([])
  // Item em construcao (entrada do carrinho).
  const [loteId, setLoteId] = useState(loteFixo?.id ?? '')
  const [loteBusca, setLoteBusca] = useState(loteFixo ? `${loteFixo.produto} - ${loteFixo.lote}` : '')
  const [caixas, setCaixas] = useState('')
  // Nivel do pedido.
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [cadastroAberto, setCadastroAberto] = useState(false)
  const [dataPrevista, setDataPrevista] = useState('')
  const [manterReservadoAgora, setManterReservadoAgora] = useState(false)
  const [observacoes, setObservacoes] = useState('')

  const pool = lotesProduto ?? todosLotes
  const entregaLonga = dataPrevistaLonga(dataPrevista)

  // Lotes oferecidos: do pool, fora os ja no carrinho e os esgotados.
  const jaAdicionados = new Set(itens.map((item) => item.loteId))
  const buscaTrim = loteBusca.trim().toLowerCase()
  const opcoesLote = pool
    .filter((item) => !jaAdicionados.has(item.id) && caixasDisponiveis(item) > 0)
    .filter((item) =>
      buscaTrim === '' ? true : `${item.produto} ${item.lote}`.toLowerCase().includes(buscaTrim),
    )
    .slice(0, 8)
    .map((item) => ({
      value: item.id,
      label: `${item.produto} - ${item.lote}`,
      hint: `${caixasDisponiveis(item)} cx · ${item.quadra}`,
    }))

  const loteEntry = todosLotes.find((item) => item.id === loteId)
  const dispEntry = loteEntry ? caixasDisponiveis(loteEntry) : 0
  const qtdEntry = Number(caixas)
  const qtdEntryValida = Number.isFinite(qtdEntry) && qtdEntry > 0
  const excedeuEntry = Boolean(loteEntry) && !entregaLonga && qtdEntry > dispEntry
  const m2Entry = loteEntry && qtdEntryValida ? qtdEntry * loteEntry.m2PorCaixa : 0
  const loteJaNoCarrinho = loteEntry ? jaAdicionados.has(loteEntry.id) : false
  const podeAdicionar = Boolean(loteEntry) && qtdEntryValida && !excedeuEntry && !loteJaNoCarrinho

  function adicionarItem() {
    if (!loteEntry || !podeAdicionar) return
    setItens((atual) => [...atual, { loteId: loteEntry.id, caixas: qtdEntry }])
    setLoteId('')
    setLoteBusca('')
    setCaixas('')
  }

  function removerItem(id: string) {
    setItens((atual) => atual.filter((item) => item.loteId !== id))
  }

  // Totais do carrinho (caixas, m2, valor, disponivel agregado para o painel de regime).
  const resumo = useMemo(() => {
    return itens.reduce(
      (acc, item) => {
        const lote = todosLotes.find((l) => l.id === item.loteId)
        if (!lote) return acc
        acc.caixas += item.caixas
        acc.m2 += item.caixas * lote.m2PorCaixa
        acc.valor += item.caixas * lote.m2PorCaixa * lote.precoM2
        acc.disponivel += caixasDisponiveis(lote)
        return acc
      },
      { caixas: 0, m2: 0, valor: 0, disponivel: 0 },
    )
  }, [itens, todosLotes])

  const valido = itens.length > 0 && clienteSelecionado !== null

  function confirmar() {
    if (!valido || !clienteSelecionado) return
    onConfirm({
      pedido: pedido.trim() || undefined,
      clienteId: clienteSelecionado.id,
      cliente: clienteSelecionado.nome,
      documento: clienteSelecionado.documento,
      telefone: clienteSelecionado.telefone,
      dataPrevista,
      manterReservadoAgora: entregaLonga ? manterReservadoAgora : undefined,
      observacoes,
      itens,
    })
  }

  return (
    <Drawer
      open={open}
      title="Nova reserva"
      description="Monte o pedido com um ou mais lotes e vincule a um cliente."
      onClose={onClose}
      closeOnEsc={!cadastroAberto}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-[2]" disabled={!valido} onClick={confirmar}>
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
            {itens.length > 1 ? `Confirmar pedido (${itens.length} linhas)` : 'Confirmar reserva'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <SectionLabel icon={UserRound}>Cliente</SectionLabel>
          <ClienteSelector
            cliente={clienteSelecionado}
            onChange={setClienteSelecionado}
            onCadastroOpenChange={setCadastroAberto}
            hideLabel
          />
        </section>

        <section className="flex flex-col gap-4">
          <SectionLabel icon={ListPlus}>Itens do pedido</SectionLabel>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Produto / Lote
            </span>
            <Autocomplete
              value={loteBusca}
              onChange={(text) => {
                setLoteBusca(text)
                setLoteId('')
              }}
              onSelect={(id) => {
                const escolhido = pool.find((item) => item.id === id)
                setLoteId(id)
                if (escolhido) setLoteBusca(`${escolhido.produto} - ${escolhido.lote}`)
              }}
              options={opcoesLote}
              name="produtoLote"
              placeholder="Digite o produto ou o lote…"
            />
          </div>

          {loteEntry ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantidade (caixas)">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={entregaLonga ? undefined : dispEntry}
                    value={caixas}
                    placeholder="0"
                    onChange={(event) => setCaixas(event.target.value)}
                  />
                </Field>
                <Field label="Equivale a (m²)">
                  <div className="numeric flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                    {formatM2(m2Entry)} m²
                  </div>
                </Field>
              </div>
              <div className="-mt-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    Quadra <span className="font-mono text-foreground">{loteEntry.quadra}</span>
                  </span>
                  <span className="shrink-0 text-sm">
                    <span className="text-muted-foreground">Disponível </span>
                    <span className={`numeric font-bold ${excedeuEntry ? 'text-danger' : 'text-primary'}`}>
                      {dispEntry} cx
                    </span>
                  </span>
                </div>
                {excedeuEntry ? (
                  <p className="text-xs font-semibold text-danger">
                    Quantidade acima do disponível. Reduza para no máximo {dispEntry} cx.
                  </p>
                ) : null}
              </div>

              <Button type="button" variant="outline" disabled={!podeAdicionar} onClick={adicionarItem}>
                <Plus aria-hidden="true" data-icon="inline-start" />
                Adicionar item
              </Button>
            </>
          ) : null}

          {itens.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              {itens.map((item) => {
                const lote = todosLotes.find((l) => l.id === item.loteId)
                if (!lote) return null
                const m2 = item.caixas * lote.m2PorCaixa
                return (
                  <div key={item.loteId} className="flex items-center gap-3 border-b p-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{lote.produto}</p>
                      <p className="font-mono text-xs text-muted-foreground">{lote.lote} · {lote.quadra}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="numeric text-sm font-semibold">{item.caixas} cx</p>
                      <p className="numeric text-xs text-muted-foreground">{formatPreco(m2 * lote.precoM2)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-danger"
                      onClick={() => removerItem(item.loteId)}
                      aria-label={`Remover ${lote.produto} ${lote.lote}`}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                )
              })}
              <div className="flex items-center justify-between bg-muted/30 px-3 py-2.5">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Total · {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                </span>
                <span className="numeric text-sm font-bold text-primary">
                  {resumo.caixas} cx · {formatPreco(resumo.valor)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Adicione ao menos um lote ao pedido.</p>
          )}
        </section>

        <section className="flex flex-col gap-5">
          <SectionLabel icon={PencilLine}>Dados do pedido</SectionLabel>

          <Field label="Número do pedido">
            <Input
              name="pedido"
              autoComplete="off"
              value={pedido}
              onChange={(event) => setPedido(event.target.value)}
              placeholder="PED-XXXX"
            />
          </Field>

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
