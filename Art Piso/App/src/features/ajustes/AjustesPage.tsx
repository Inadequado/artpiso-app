import { ArrowRightLeft, ChevronLeft, ChevronRight, History, MapPinned, PenLine, Plus, Trash2, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ocupacaoQuadra, quadras as quadrasMock } from '@/data/mock-inventory'
import { AjusteDrawer, type AjusteTipo } from '@/features/ajustes/AjusteDrawer'
import { HistoricoDrawer } from '@/features/ajustes/HistoricoDrawer'
import { movimentoIcon, movimentoTone } from '@/features/ajustes/movimento-style'
import { QuadraDrawer } from '@/features/configuracoes/QuadraDrawer'
import { cn } from '@/lib/utils'
import { useInventory } from '@/store/inventory'
import type { LoteEstoque, Movimento, Quadra } from '@/types/inventory'

type AjusteAction =
  | { tipo: AjusteTipo; label: string; description: string; icon: LucideIcon }
  | { tipo: 'nova-quadra'; label: string; description: string; icon: LucideIcon }

const actions: AjusteAction[] = [
  { tipo: 'nova-quadra', label: 'Registrar nova quadra', description: 'Criar uma localização física do depósito', icon: Plus },
  { tipo: 'perda', label: 'Registrar perda', description: 'Quebra, avaria ou ajuste de perda', icon: TriangleAlert },
  { tipo: 'quadra', label: 'Mover lote de quadra', description: 'Alterar a localização de um lote', icon: ArrowRightLeft },
  { tipo: 'correcao', label: 'Corrigir quantidade', description: 'Ajuste administrativo controlado', icon: PenLine },
]

const quadrasPorPagina = 4
const historicoRecenteLimite = 6

export function AjustesPage() {
  const { lotes, movimentos, registrarMovimento } = useInventory()
  const [ajusteAberto, setAjusteAberto] = useState<AjusteTipo | null>(null)
  const [ajusteSeq, setAjusteSeq] = useState(0)
  const [quadraOpen, setQuadraOpen] = useState(false)
  const [quadraEdit, setQuadraEdit] = useState<Quadra | null>(null)
  const [quadraExcluir, setQuadraExcluir] = useState<Quadra | null>(null)
  const [quadraPage, setQuadraPage] = useState(0)
  const [listaQuadras, setListaQuadras] = useState<Quadra[]>(quadrasMock)
  const [historicoOpen, setHistoricoOpen] = useState(false)

  const totalQuadraPages = Math.max(1, Math.ceil(listaQuadras.length / quadrasPorPagina))
  const quadraPageAtual = Math.min(quadraPage, totalQuadraPages - 1)
  const quadrasVisiveis = listaQuadras.slice(
    quadraPageAtual * quadrasPorPagina,
    quadraPageAtual * quadrasPorPagina + quadrasPorPagina,
  )
  const mostrarNavegacaoQuadras = totalQuadraPages > 1
  const historicoRecente = movimentos.slice(0, historicoRecenteLimite)
  const mostrarHistoricoCompleto = movimentos.length > historicoRecenteLimite

  function abrirNovaQuadra() {
    setQuadraEdit(null)
    setQuadraOpen(true)
  }

  function abrirEdicaoQuadra(quadra: Quadra) {
    setQuadraEdit(quadra)
    setQuadraOpen(true)
  }

  function salvarQuadra(dados: Pick<Quadra, 'numero' | 'descricao'>) {
    if (quadraEdit) {
      setListaQuadras((atual) =>
        atual.map((item) => (item.id === quadraEdit.id ? { ...item, ...dados } : item)),
      )
      registrarMovimento({ tipo: 'quadra', titulo: 'Quadra atualizada', detalhe: `${dados.numero} atualizada no depósito` })
    } else {
      setQuadraPage(Math.floor(listaQuadras.length / quadrasPorPagina))
      setListaQuadras((atual) => [...atual, { id: crypto.randomUUID(), ...dados }])
      registrarMovimento({ tipo: 'quadra', titulo: 'Quadra registrada', detalhe: `${dados.numero} registrada no depósito` })
    }
    setQuadraOpen(false)
  }

  function excluirQuadra(quadra: Quadra) {
    setListaQuadras((atual) => atual.filter((item) => item.id !== quadra.id))
    registrarMovimento({ tipo: 'quadra', titulo: 'Quadra removida', detalhe: `${quadra.numero} removida do depósito` })
  }

  // Ocupacao MANUAL (reverte Q-01): o gerente alterna no card; cada virada fica no historico.
  function alternarStatusQuadra(quadra: Quadra) {
    const novo = quadra.status === 'ocupado' ? 'disponivel' : 'ocupado'
    setListaQuadras((atual) => atual.map((item) => (item.id === quadra.id ? { ...item, status: novo } : item)))
    registrarMovimento({
      tipo: 'quadra',
      titulo: novo === 'ocupado' ? 'Quadra marcada como ocupada' : 'Quadra marcada como disponível',
      detalhe: `${quadra.numero} — ${quadra.descricao}`,
    })
  }

  return (
    <div className="grid grid-cols-[1fr_360px] gap-6">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Central de ajustes</CardTitle>
            <CardDescription>Operações de gerente e administrador para manter o estoque coerente.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.tipo}
                  type="button"
                  onClick={() => {
                    if (action.tipo === 'nova-quadra') {
                      abrirNovaQuadra()
                      return
                    }
                    setAjusteSeq((seq) => seq + 1)
                    setAjusteAberto(action.tipo)
                  }}
                  className="rounded-lg border bg-muted/20 p-5 text-left transition hover:bg-muted"
                >
                  <Icon aria-hidden="true" className="text-primary" data-icon="inline-start" />
                  <h3 className="mt-4 font-bold">{action.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPinned aria-hidden="true" className="size-4 text-primary" />
                <CardTitle>Quadras</CardTitle>
              </div>
              <CardDescription>Localizações físicas do depósito usadas nos lotes.</CardDescription>
            </div>
            {mostrarNavegacaoQuadras ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={quadraPageAtual === 0}
                  aria-label="Quadras anteriores"
                  onClick={() => setQuadraPage((page) => Math.max(0, page - 1))}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={quadraPageAtual >= totalQuadraPages - 1}
                  aria-label="Próximas quadras"
                  onClick={() => setQuadraPage((page) => Math.min(totalQuadraPages - 1, page + 1))}
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-3">
            {quadrasVisiveis.map((quadra) => (
              <QuadraCard
                key={quadra.id}
                quadra={quadra}
                lotes={lotes}
                onEdit={() => abrirEdicaoQuadra(quadra)}
                onDelete={() => setQuadraExcluir(quadra)}
                onToggleStatus={() => alternarStatusQuadra(quadra)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History aria-hidden="true" className="size-4 text-primary" />
            <CardTitle>Histórico recente</CardTitle>
          </div>
          <CardDescription>Últimas movimentações de estoque.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {historicoRecente.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
          ) : (
            historicoRecente.map((movimento) => <Movement key={movimento.id} movimento={movimento} />)
          )}
          {mostrarHistoricoCompleto ? (
            <Button variant="outline" onClick={() => setHistoricoOpen(true)}>
              Ver histórico completo
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <AjusteDrawer
        key={ajusteSeq}
        tipo={ajusteAberto}
        quadras={listaQuadras}
        onClose={() => setAjusteAberto(null)}
        onConfirm={() => setAjusteAberto(null)}
      />

      <HistoricoDrawer
        open={historicoOpen}
        movimentos={movimentos}
        onClose={() => setHistoricoOpen(false)}
      />

      <QuadraDrawer
        key={quadraEdit?.id ?? 'nova'}
        open={quadraOpen}
        quadra={quadraEdit}
        onClose={() => setQuadraOpen(false)}
        onSave={salvarQuadra}
      />

      <ConfirmDialog
        open={Boolean(quadraExcluir)}
        title="Excluir quadra?"
        description={
          quadraExcluir ? (
            <>
              A quadra <strong className="text-foreground">{quadraExcluir.numero}</strong> será removida da lista de
              localizações do depósito nesta sessão.
            </>
          ) : undefined
        }
        confirmLabel="Excluir quadra"
        cancelLabel="Voltar"
        tone="danger"
        onConfirm={() => {
          if (quadraExcluir) excluirQuadra(quadraExcluir)
        }}
        onClose={() => setQuadraExcluir(null)}
      />
    </div>
  )
}

function QuadraCard({
  quadra,
  lotes,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  quadra: Quadra
  lotes: LoteEstoque[]
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}) {
  const ocupacao = ocupacaoQuadra(quadra, lotes)
  const temLotes = ocupacao.lotes > 0
  const ocupada = quadra.status === 'ocupado'

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-black text-primary">{quadra.numero}</p>
            <p className="text-sm text-muted-foreground">{quadra.descricao}</p>
          </div>
          <div className="-mr-2 -mt-2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              aria-label={`Editar quadra ${quadra.numero}`}
              title="Editar quadra"
              onClick={onEdit}
            >
              <PenLine aria-hidden="true" className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-danger disabled:opacity-40"
              aria-label={`Excluir quadra ${quadra.numero}`}
              title={temLotes ? 'Quadra com lotes não pode ser excluída' : 'Excluir quadra'}
              disabled={temLotes}
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="self-start rounded-md transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60"
            aria-pressed={ocupada}
            title={ocupada ? 'Marcar como disponível' : 'Marcar como ocupada'}
            onClick={onToggleStatus}
          >
            <Badge variant={ocupada ? 'warning' : 'success'}>{ocupada ? 'Ocupada' : 'Disponível'}</Badge>
          </button>

          <p className="text-xs text-muted-foreground">
            {ocupacao.lotes} {ocupacao.lotes === 1 ? 'lote' : 'lotes'} · {ocupacao.caixas} cx
          </p>
        </div>
      </div>
    </div>
  )
}

function Movement({ movimento }: { movimento: Movimento }) {
  const Icon = movimentoIcon[movimento.tipo]
  return (
    <div className="flex gap-3 rounded-md border p-3">
      <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center', movimentoTone[movimento.tipo])}>
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{movimento.titulo}</p>
        <p className="text-sm text-muted-foreground">{movimento.detalhe}</p>
        {movimento.observacao ? (
          <p className="mt-1 text-sm italic text-muted-foreground">“{movimento.observacao}”</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">por {movimento.usuario} · {movimento.data}</p>
      </div>
    </div>
  )
}
