import { Boxes, CalendarPlus, ImageOff, Layers, PenLine, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { caixasDisponiveis, caixasDisponiveisProduto, formatM2, formatPreco, m2Disponivel, m2DisponivelProduto, precoPorCaixa, statusLote } from '@/data/mock-inventory'
import { useInventory } from '@/store/inventory'
import type { LoteEstoque, Produto, StockStatus } from '@/types/inventory'

const statusLabel: Record<StockStatus, string> = {
  disponivel: 'Disponível',
  baixo: 'Baixo',
  esgotado: 'Esgotado',
  reservado: 'Reservado',
}

const statusVariant: Record<StockStatus, 'success' | 'warning' | 'danger' | 'reserved' | 'lowStock'> = {
  disponivel: 'success',
  baixo: 'lowStock',
  esgotado: 'danger',
  reservado: 'reserved',
}

function perdaTexto(caixasPerda: number, pisosDanificados = 0) {
  if (caixasPerda <= 0 && pisosDanificados <= 0) return null
  const partes: string[] = []
  if (caixasPerda > 0) partes.push(`${caixasPerda} cx`)
  if (pisosDanificados > 0) partes.push(`${pisosDanificados} ${pisosDanificados === 1 ? 'piso' : 'pisos'} danificado${pisosDanificados === 1 ? '' : 's'} no total`)
  return partes.join(' · ')
}

function perdaLoteTexto(caixasPerda: number, pisosDanificados = 0) {
  if (caixasPerda <= 0 && pisosDanificados <= 0) return null

  const linhaPrincipal: string[] = []
  if (caixasPerda > 0) linhaPrincipal.push(`${caixasPerda} cx`)
  if (pisosDanificados > 0) linhaPrincipal.push(`${pisosDanificados} ${pisosDanificados === 1 ? 'piso' : 'pisos'}`)

  return {
    principal: linhaPrincipal.join(' · '),
    detalhe:
      pisosDanificados > 0
        ? `danificado${pisosDanificados === 1 ? '' : 's'} no total`
        : null,
  }
}

/** Detalhe completo do produto: lotes (com quadra), informacoes tecnicas e perda (cx + pisos). */
export function ProdutoDetalheDrawer({
  produto,
  open,
  onClose,
  onNovoLote,
  onReservar,
  onEditarProduto,
  onEditarLote,
}: {
  produto: Produto | null
  open: boolean
  onClose: () => void
  onNovoLote: () => void
  onReservar: () => void
  onEditarProduto: () => void
  onEditarLote: (lote: LoteEstoque) => void
}) {
  const { reservas, movimentos, removerLote, removerProduto } = useInventory()
  const [loteExcluir, setLoteExcluir] = useState<LoteEstoque | null>(null)
  const [confirmarExcluirProduto, setConfirmarExcluirProduto] = useState(false)

  if (!produto) return null

  const reservasAtivasLote = (codigoLote: string) =>
    reservas.filter((reserva) => reserva.lote === codigoLote && reserva.status === 'reservado').length
  const produtoTemReservas = produto.lotes.some((lote) => reservasAtivasLote(lote.lote) > 0)

  const estoqueTotal = produto.lotes.reduce((total, lote) => total + lote.caixasEstoque, 0)
  const reservadoTotal = produto.lotes.reduce((total, lote) => total + lote.caixasReserva, 0)
  const perdaTotal = produto.lotes.reduce((total, lote) => total + lote.caixasPerda, 0)
  const pisosTotal = produto.lotes.reduce((total, lote) => total + (lote.pisosDanificados ?? 0), 0)
  const disponivelTotal = caixasDisponiveisProduto(produto)
  const perdaResumo = perdaTexto(perdaTotal, pisosTotal)
  // Eventos de perda deste produto (mais recente primeiro, ordem do log). Perda semeada direto
  // no lote sem evento correspondente nao aparece aqui — artefato do mock, some com o Supabase.
  const perdasDoProduto = movimentos.filter(
    (movimento) => movimento.tipo === 'perda' && movimento.produtoId === produto.id,
  )

  return (
    <>
    <Drawer
      open={open}
      wide
      title="Detalhe do produto"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onReservar}>
            <CalendarPlus aria-hidden="true" data-icon="inline-start" />
            Criar reserva
          </Button>
          <Button className="flex-1" onClick={onNovoLote}>
            <Plus aria-hidden="true" data-icon="inline-start" />
            Novo lote
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {produto.referencia ? <p className="font-mono text-xs text-primary">Ref. {produto.referencia}</p> : null}
              <h3 className="mt-1 text-xl font-bold text-pretty">{produto.produto}</h3>
              <p className="text-sm text-muted-foreground">
                {[produto.marca, produto.tamanho].filter(Boolean).join(' - ')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Editar produto"
              title="Editar dados do produto"
              onClick={onEditarProduto}
            >
              <PenLine aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border bg-muted/30">
            {produto.foto ? (
              <img src={produto.foto} alt={produto.produto} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center text-muted-foreground/30">
                <ImageOff aria-hidden="true" className="size-10" />
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground hover:text-danger disabled:opacity-40"
            disabled={produtoTemReservas}
            title={produtoTemReservas ? 'Produto com reservas ativas não pode ser excluído' : 'Excluir produto e todos os seus lotes'}
            onClick={() => setConfirmarExcluirProduto(true)}
          >
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            Excluir produto
          </Button>
        </div>

        <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers aria-hidden="true" className="size-4" />
            <h4 className="text-xs font-bold uppercase tracking-[0.14em]">Lotes vinculados ({produto.lotes.length})</h4>
          </div>
          <div className="flex flex-col gap-2">
            {produto.lotes.map((lote) => {
              const perda = perdaLoteTexto(lote.caixasPerda, lote.pisosDanificados)
              const status = statusLote(lote)
              return (
                <div key={lote.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-primary">{lote.lote}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        `Quadra ${lote.quadra}`,
                        lote.bitola ? `Bitola ${lote.bitola}` : '',
                        lote.tonalidade ? `Ton. ${lote.tonalidade}` : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {perda ? (
                      <p className="mt-1 text-xs text-danger">
                        Perda: {perda.principal}
                        {perda.detalhe ? (
                          <>
                            <br />
                            {perda.detalhe}
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="numeric text-sm font-bold">{caixasDisponiveis(lote)} cx</p>
                      <p className="numeric text-xs text-muted-foreground">{formatM2(m2Disponivel(lote))} m²</p>
                    </div>
                    <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Editar lote ${lote.lote}`}
                      title="Editar lote"
                      onClick={() => onEditarLote(lote)}
                    >
                      <PenLine aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-danger disabled:opacity-40"
                      aria-label={`Excluir lote ${lote.lote}`}
                      title={
                        reservasAtivasLote(lote.lote) > 0
                          ? 'Lote com reservas ativas não pode ser excluído'
                          : 'Excluir lote'
                      }
                      disabled={reservasAtivasLote(lote.lote) > 0}
                      onClick={() => setLoteExcluir(lote)}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Boxes aria-hidden="true" className="size-4" />
            <h4 className="text-xs font-bold uppercase tracking-[0.14em]">Informações técnicas</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Info label="m² por caixa" value={`${formatM2(produto.m2PorCaixa)} m²`} />
            <Info label="Peças por caixa" value={`${produto.pecasPorCaixa} pç`} />
            <Info label="Preço por m²" value={formatPreco(produto.precoM2)} />
            <Info label="Preço por caixa" value={formatPreco(precoPorCaixa(produto.precoM2, produto.m2PorCaixa))} />
            <Info label="Estoque total" value={`${estoqueTotal} cx`} />
            <Info label="Reservado" value={`${reservadoTotal} cx`} />
            <Info label="Perda" value={perdaResumo ?? '0 cx'} tone={perdaResumo ? 'danger' : undefined} />
            <Info label="Disponível" value={`${disponivelTotal} cx`} detail={`${formatM2(m2DisponivelProduto(produto))} m²`} />
          </div>
        </section>

        {perdasDoProduto.length > 0 ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TriangleAlert aria-hidden="true" className="size-4" />
              <h4 className="text-xs font-bold uppercase tracking-[0.14em]">Histórico de perdas ({perdasDoProduto.length})</h4>
            </div>
            <ul className="flex flex-col gap-2">
              {perdasDoProduto.map((movimento) => (
                <li key={movimento.id} className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-sm font-semibold text-danger">{movimento.detalhe}</p>
                  {movimento.observacao ? (
                    <p className="mt-1 text-sm italic text-muted-foreground">“{movimento.observacao}”</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">por {movimento.usuario} · {movimento.data}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        </div>
      </div>
    </Drawer>

    <ConfirmDialog
      open={Boolean(loteExcluir)}
      title="Excluir lote?"
      description={
        loteExcluir ? (
          <>
            O lote <strong className="text-foreground">{loteExcluir.lote}</strong> ({caixasDisponiveis(loteExcluir)} cx
            disponíveis) será removido do estoque. Esta ação não pode ser desfeita.
          </>
        ) : undefined
      }
      confirmLabel="Excluir lote"
      cancelLabel="Voltar"
      tone="danger"
      onConfirm={() => {
        if (!loteExcluir) return
        const ultimoLote = produto.lotes.length === 1
        removerLote(loteExcluir.id)
        if (ultimoLote) onClose()
      }}
      onClose={() => setLoteExcluir(null)}
    />

    <ConfirmDialog
      open={confirmarExcluirProduto}
      title="Excluir produto?"
      description={
        <>
          O produto <strong className="text-foreground">{produto.produto}</strong> e seus{' '}
          <strong className="text-foreground">{produto.lotes.length} {produto.lotes.length === 1 ? 'lote' : 'lotes'}</strong>{' '}
          serão removidos do estoque. Esta ação não pode ser desfeita.
        </>
      }
      confirmLabel="Excluir produto"
      cancelLabel="Voltar"
      tone="danger"
      onConfirm={() => {
        removerProduto(produto.id)
        onClose()
      }}
      onClose={() => setConfirmarExcluirProduto(false)}
    />
    </>
  )
}

function Info({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: 'danger' }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={tone === 'danger' ? 'mt-1 font-bold text-danger' : 'mt-1 font-bold numeric'}>{value}</p>
      {detail ? <p className="text-xs text-muted-foreground numeric">{detail}</p> : null}
    </div>
  )
}
