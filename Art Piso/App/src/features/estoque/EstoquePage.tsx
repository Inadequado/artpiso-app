import { AlertTriangle, ArrowRight, CalendarCheck, ChevronDown, ImageOff, Link2, PackageCheck, SlidersHorizontal, Warehouse } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { usePrimaryAction } from '@/components/layout/primary-action'
import { useSearchQuery } from '@/components/layout/search'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { MetricCard } from '@/components/ui/metric-card'
import { SelectMenu } from '@/components/ui/select-menu'
import {
  agruparPorProduto,
  caixasDisponiveis,
  caixasDisponiveisProduto,
  formatM2,
  formatPreco,
  m2Disponivel,
  m2DisponivelProduto,
  precoPorCaixa,
  quadrasDoLote,
  reservasAtivasDoProduto,
  statusProduto,
} from '@/data/mock-inventory'
import { useInventory } from '@/store/inventory'
import { useSessao } from '@/store/sessao'
import { CadastroProdutoDrawer } from '@/features/estoque/CadastroProdutoDrawer'
import { EditarLoteDrawer } from '@/features/estoque/EditarLoteDrawer'
import { EditarProdutoDrawer } from '@/features/estoque/EditarProdutoDrawer'
import { NovoLoteDrawer } from '@/features/estoque/NovoLoteDrawer'
import { ProdutoDetalheDrawer } from '@/features/estoque/ProdutoDetalheDrawer'
import { ReservaDrawer } from '@/features/reservas/ReservaDrawer'
import { useGsapListRefresh } from '@/lib/animations'
import type { LoteEstoque, Produto, Reserva, StockStatus } from '@/types/inventory'

const statusLabel: Record<StockStatus, string> = {
  disponivel: 'Disponível',
  baixo: 'Baixo estoque',
  esgotado: 'Esgotado',
  reservado: 'Reservado',
}

const statusVariant: Record<StockStatus, 'success' | 'warning' | 'danger' | 'reserved' | 'lowStock'> = {
  disponivel: 'success',
  baixo: 'lowStock',
  esgotado: 'danger',
  reservado: 'reserved',
}

const statusFiltravel: StockStatus[] = ['disponivel', 'baixo', 'esgotado']

export function EstoquePage() {
  const { lotes: listaLotes, reservas, adicionarLote, criarPedido } = useInventory()
  const { podeEditar } = useSessao()
  const [reservaOpen, setReservaOpen] = useState(false)
  const [reservaSeq, setReservaSeq] = useState(0)
  const [detalheOpen, setDetalheOpen] = useState(false)
  const [cadastroOpen, setCadastroOpen] = useState(false)
  const [cadastroSeq, setCadastroSeq] = useState(0)
  const [novoLoteOpen, setNovoLoteOpen] = useState(false)
  const [novoLoteSeq, setNovoLoteSeq] = useState(0)
  const [editarProdutoOpen, setEditarProdutoOpen] = useState(false)
  const [editProdutoSeq, setEditProdutoSeq] = useState(0)
  const [loteEditar, setLoteEditar] = useState<LoteEstoque | null>(null)
  const [editLoteSeq, setEditLoteSeq] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [quadraFiltro, setQuadraFiltro] = useState('todas')
  const [marcaFiltro, setMarcaFiltro] = useState('todas')
  const [statusFiltro, setStatusFiltro] = useState('todas')
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const produtosTableRef = useRef<HTMLTableElement>(null)
  const busca = useSearchQuery()

  usePrimaryAction(() => {
    setCadastroSeq((seq) => seq + 1)
    setCadastroOpen(true)
  })

  const produtos = useMemo(() => agruparPorProduto(listaLotes), [listaLotes])
  const quadras = useMemo(() => Array.from(new Set(listaLotes.flatMap((lote) => quadrasDoLote(lote)))), [listaLotes])
  const marcas = useMemo(() => Array.from(new Set(produtos.map((produto) => produto.marca))), [produtos])

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return produtos.filter((produto) => {
      const okQuadra = quadraFiltro === 'todas' || produto.lotes.some((lote) => quadrasDoLote(lote).includes(quadraFiltro))
      const okMarca = marcaFiltro === 'todas' || produto.marca === marcaFiltro
      const okStatus = statusFiltro === 'todas' || statusProduto(produto) === statusFiltro
      const okBusca =
        termo === '' ||
        [produto.produto, produto.referencia, produto.marca, ...produto.lotes.flatMap((l) => [l.lote, ...quadrasDoLote(l)])].some(
          (campo) => campo.toLowerCase().includes(termo),
        )
      return okQuadra && okMarca && okStatus && okBusca
    })
  }, [produtos, quadraFiltro, marcaFiltro, statusFiltro, busca])

  const filtroAtivo = quadraFiltro !== 'todas' || marcaFiltro !== 'todas' || statusFiltro !== 'todas'
  const filtrosAtivos =
    Number(quadraFiltro !== 'todas') + Number(marcaFiltro !== 'todas') + Number(statusFiltro !== 'todas')
  const produtosAnimacaoKey = produtosFiltrados.map((produto) => produto.id).join('|')

  useGsapListRefresh(produtosTableRef, [produtosAnimacaoKey])

  function limparFiltros() {
    setQuadraFiltro('todas')
    setMarcaFiltro('todas')
    setStatusFiltro('todas')
  }

  const resumo = useMemo(() => {
    const estoque = listaLotes.reduce((total, lote) => total + lote.caixasEstoque, 0)
    const m2Estoque = listaLotes.reduce((total, lote) => total + lote.caixasEstoque * lote.m2PorCaixa, 0)
    const caixas = listaLotes.reduce((total, lote) => total + caixasDisponiveis(lote), 0)
    const m2 = listaLotes.reduce((total, lote) => total + m2Disponivel(lote), 0)
    const reservadas = listaLotes.reduce((total, lote) => total + lote.caixasReserva, 0)
    const m2Reserva = listaLotes.reduce((total, lote) => total + lote.caixasReserva * lote.m2PorCaixa, 0)
    return { estoque, m2Estoque, caixas, m2, reservadas, m2Reserva }
  }, [listaLotes])

  // Produtos a repor: referências baixo ou esgotado. Conta por PRODUTO (não por lote),
  // então nao infla com lotes esgotados acumulados: o produto sai da conta quando entra lote novo.
  const produtosARepor = useMemo(
    () => produtos.filter((produto) => statusProduto(produto) !== 'disponivel').length,
    [produtos],
  )

  const selecionado = produtos.find((produto) => produto.id === selectedId) ?? null

  function salvarLote(novo: LoteEstoque) {
    adicionarLote(novo)
    setSelectedId(novo.produtoId)
  }

  function abrirReserva() {
    setReservaSeq((seq) => seq + 1)
    setReservaOpen(true)
  }

  function openReserva(produto: Produto) {
    setSelectedId(produto.id)
    abrirReserva()
  }

  function openDetalhe(produto: Produto) {
    setSelectedId(produto.id)
    setDetalheOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard icon={Warehouse} tone="default" label="Estoque físico total" value={`${resumo.estoque} cx`} detail={`${formatM2(resumo.m2Estoque)} m² no depósito`} />
        <MetricCard icon={PackageCheck} tone="success" label="Disponível para venda" value={`${resumo.caixas} cx`} detail={`${formatM2(resumo.m2)} m²`} />
        <MetricCard icon={CalendarCheck} tone="reserved" label="Reservas ativas" value={`${resumo.reservadas} cx`} detail={`${formatM2(resumo.m2Reserva)} m² não entregues`} />
        <MetricCard icon={AlertTriangle} tone="danger" label="Estoque a repor" value={`${produtosARepor}`} detail={produtosARepor === 1 ? 'produto baixo ou esgotado' : 'produtos baixos ou esgotados'} />
      </section>

      {/* Desktop: filtros inline acima da tabela. No mobile o botao fica dentro do card, abaixo do cabecalho. */}
      <section className="hidden lg:block">
        <FiltrosProduto
          quadras={quadras}
          marcas={marcas}
          quadraFiltro={quadraFiltro}
          marcaFiltro={marcaFiltro}
          statusFiltro={statusFiltro}
          onQuadra={setQuadraFiltro}
          onMarca={setMarcaFiltro}
          onStatus={setStatusFiltro}
          onLimpar={limparFiltros}
          filtroAtivo={filtroAtivo}
        />
      </section>

      <Card className="max-lg:border-0 max-lg:bg-transparent">
        <CardHeader className="max-lg:px-0">
          <CardTitle>Estoque por produto</CardTitle>
          <CardDescription>Cada linha agrupa os lotes de uma referência. Abra os detalhes para ver lotes, quadras e perdas.</CardDescription>
        </CardHeader>
        <CardContent className="max-lg:p-0">
          {/* Mobile: botao de filtros logo abaixo do cabecalho, antes da lista */}
          <Button
            variant="outline"
            className="mb-4 w-full justify-between lg:hidden"
            onClick={() => setFiltrosOpen(true)}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Filtros
              {filtrosAtivos > 0 ? (
                <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {filtrosAtivos}
                </span>
              ) : null}
            </span>
            <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
          </Button>

          {/* Mobile/tablet: lista de cards (a tabela nao cabe abaixo de lg) */}
          <div className="flex flex-col gap-3 lg:hidden">
            {produtosFiltrados.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado para os filtros selecionados.
              </p>
            ) : (
              produtosFiltrados.map((produto) => (
                <ProdutoCard
                  key={produto.id}
                  produto={produto}
                  reservas={reservas}
                  onReservar={() => openReserva(produto)}
                  onDetalhe={() => openDetalhe(produto)}
                />
              ))
            )}
          </div>

          {/* Desktop: tabela completa */}
          <table ref={produtosTableRef} className="data-table hidden lg:table">
            <thead>
              <tr>
                <th className="w-16">Foto</th>
                <th>Produto</th>
                <th>Lotes</th>
                <th>Disponível</th>
                <th>Preço/m²</th>
                <th>Reservas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-muted-foreground">
                    Nenhum produto encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : null}
              {produtosFiltrados.map((produto) => {
                const disponivel = caixasDisponiveisProduto(produto)
                const status = statusProduto(produto)
                const qtdReservas = reservasAtivasDoProduto(produto.produto, reservas)
                return (
                  <tr key={produto.id}>
                    <td>
                      <ProdutoThumb foto={produto.foto} nome={produto.produto} />
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <strong>{produto.produto}</strong>
                        <span className="text-sm text-muted-foreground">
                          {[produto.marca, produto.tamanho, produto.referencia ? `Ref. ${produto.referencia}` : '']
                            .filter(Boolean)
                            .join(' - ')}
                        </span>
                      </div>
                    </td>
                    <td className="numeric text-sm">
                      {produto.lotes.length > 1 ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary"
                          title={`${produto.lotes.length} lotes desta referência`}
                        >
                          <Link2 aria-hidden="true" className="size-3.5" />
                          {produto.lotes.length} lotes
                        </span>
                      ) : (
                        <span className="text-muted-foreground">1 lote</span>
                      )}
                    </td>
                    <td>
                      <div className="numeric flex flex-col">
                        <strong className="text-primary">{disponivel} cx</strong>
                        <span className="text-sm text-muted-foreground">{formatM2(m2DisponivelProduto(produto))} m²</span>
                      </div>
                    </td>
                    <td>
                      <div className="numeric flex flex-col">
                        <strong>{formatPreco(produto.precoM2)}</strong>
                        {produto.precoM2 > 0 ? (
                          <span className="text-sm text-muted-foreground">{formatPreco(precoPorCaixa(produto.precoM2, produto.m2PorCaixa))}/cx</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="numeric text-sm">
                      {qtdReservas} {qtdReservas === 1 ? 'reserva' : 'reservas'}
                    </td>
                    <td>
                      <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {podeEditar ? (
                          <Button size="sm" disabled={disponivel <= 0} onClick={() => openReserva(produto)}>
                            Reservar
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => openDetalhe(produto)}>
                          Detalhes
                          <ArrowRight aria-hidden="true" data-icon="inline-end" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ReservaDrawer
        key={reservaSeq}
        open={reservaOpen}
        lotesProduto={selecionado?.lotes}
        onClose={() => setReservaOpen(false)}
        onConfirm={(input) => {
          criarPedido(input)
          setReservaOpen(false)
        }}
      />

      <ProdutoDetalheDrawer
        produto={selecionado}
        open={detalheOpen}
        onClose={() => setDetalheOpen(false)}
        onNovoLote={() => {
          setDetalheOpen(false)
          setNovoLoteSeq((seq) => seq + 1)
          setNovoLoteOpen(true)
        }}
        onReservar={() => {
          setDetalheOpen(false)
          abrirReserva()
        }}
        onEditarProduto={() => {
          setDetalheOpen(false)
          setEditProdutoSeq((seq) => seq + 1)
          setEditarProdutoOpen(true)
        }}
        onEditarLote={(lote) => {
          setDetalheOpen(false)
          setLoteEditar(lote)
          setEditLoteSeq((seq) => seq + 1)
        }}
      />

      <CadastroProdutoDrawer
        key={`cadastro-${cadastroSeq}`}
        open={cadastroOpen}
        onClose={() => setCadastroOpen(false)}
        onSave={(novo) => {
          salvarLote(novo)
          setCadastroOpen(false)
        }}
      />

      <NovoLoteDrawer
        key={`novolote-${novoLoteSeq}`}
        open={novoLoteOpen}
        produto={selecionado}
        onClose={() => {
          // Cancelar volta ao detalhe do produto, igual aos demais fluxos abertos por ele.
          setNovoLoteOpen(false)
          setDetalheOpen(true)
        }}
        onSave={(novo) => {
          salvarLote(novo)
          setNovoLoteOpen(false)
          setDetalheOpen(true)
        }}
      />

      <EditarProdutoDrawer
        key={`prod-${editProdutoSeq}`}
        open={editarProdutoOpen}
        produto={selecionado}
        onClose={() => {
          setEditarProdutoOpen(false)
          setDetalheOpen(true)
        }}
      />

      <EditarLoteDrawer
        key={`lote-${editLoteSeq}`}
        open={Boolean(loteEditar)}
        lote={loteEditar}
        onClose={() => {
          setLoteEditar(null)
          setDetalheOpen(true)
        }}
      />

      <Drawer
        open={filtrosOpen}
        title="Filtros"
        description="Refine o estoque por quadra, marca e disponibilidade."
        onClose={() => setFiltrosOpen(false)}
        footer={
          <Button className="w-full" onClick={() => setFiltrosOpen(false)}>
            Ver resultados
          </Button>
        }
      >
        <FiltrosProduto
          stacked
          quadras={quadras}
          marcas={marcas}
          quadraFiltro={quadraFiltro}
          marcaFiltro={marcaFiltro}
          statusFiltro={statusFiltro}
          onQuadra={setQuadraFiltro}
          onMarca={setMarcaFiltro}
          onStatus={setStatusFiltro}
          onLimpar={limparFiltros}
          filtroAtivo={filtroAtivo}
        />
      </Drawer>
    </div>
  )
}

// Controles de filtro do Estoque. `stacked` = layout vertical full-width (dentro
// do painel mobile); sem ele, layout inline (barra do desktop).
function FiltrosProduto({
  stacked = false,
  quadras,
  marcas,
  quadraFiltro,
  marcaFiltro,
  statusFiltro,
  onQuadra,
  onMarca,
  onStatus,
  onLimpar,
  filtroAtivo,
}: {
  stacked?: boolean
  quadras: string[]
  marcas: string[]
  quadraFiltro: string
  marcaFiltro: string
  statusFiltro: string
  onQuadra: (value: string) => void
  onMarca: (value: string) => void
  onStatus: (value: string) => void
  onLimpar: () => void
  filtroAtivo: boolean
}) {
  const selClass = stacked ? 'w-full' : 'w-48'
  const statusClass = stacked ? 'w-full' : 'w-52'
  return (
    <div className={stacked ? 'flex flex-col gap-3' : 'flex flex-wrap items-center gap-2'}>
      <SelectMenu
        className={selClass}
        value={quadraFiltro}
        onChange={onQuadra}
        options={[{ value: 'todas', label: 'Todas as quadras' }, ...quadras.map((quadra) => ({ value: quadra, label: quadra }))]}
      />
      <SelectMenu
        className={selClass}
        value={marcaFiltro}
        onChange={onMarca}
        options={[{ value: 'todas', label: 'Todas as marcas' }, ...marcas.map((marca) => ({ value: marca, label: marca }))]}
      />
      <SelectMenu
        className={statusClass}
        value={statusFiltro}
        onChange={onStatus}
        options={[{ value: 'todas', label: 'Toda disponibilidade' }, ...statusFiltravel.map((status) => ({ value: status, label: statusLabel[status] }))]}
      />
      {filtroAtivo ? (
        <Button variant="ghost" size="sm" className={stacked ? 'w-full' : undefined} onClick={onLimpar}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  )
}

// Card de produto para mobile/tablet (equivalente a uma linha da tabela do desktop).
function ProdutoCard({
  produto,
  reservas,
  onReservar,
  onDetalhe,
}: {
  produto: Produto
  reservas: Reserva[]
  onReservar: () => void
  onDetalhe: () => void
}) {
  const { podeEditar } = useSessao()
  const disponivel = caixasDisponiveisProduto(produto)
  const status = statusProduto(produto)
  const qtdReservas = reservasAtivasDoProduto(produto.produto, reservas)
  const meta = [produto.marca, produto.tamanho, produto.referencia ? `Ref. ${produto.referencia}` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex gap-3">
        <ProdutoThumb foto={produto.foto} nome={produto.produto} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <strong className="text-pretty leading-tight">{produto.produto}</strong>
            <Badge variant={statusVariant[status]} className="shrink-0">
              {statusLabel[status]}
            </Badge>
          </div>
          {meta ? <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p> : null}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <strong className="numeric text-2xl font-black text-primary">{disponivel} cx</strong>
        <span className="text-sm text-muted-foreground">{formatM2(m2DisponivelProduto(produto))} m² disponível</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {produto.lotes.length > 1 ? (
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <Link2 aria-hidden="true" className="size-3.5" />
            {produto.lotes.length} lotes
          </span>
        ) : (
          <span>1 lote</span>
        )}
        <span>{produto.precoM2 > 0 ? `${formatPreco(produto.precoM2)}/m²` : '—'}</span>
        <span>
          {qtdReservas} {qtdReservas === 1 ? 'reserva' : 'reservas'}
        </span>
      </div>

      <div className={podeEditar ? 'mt-3 grid grid-cols-2 gap-2' : 'mt-3 grid grid-cols-1 gap-2'}>
        {podeEditar ? (
          <Button size="sm" disabled={disponivel <= 0} onClick={onReservar}>
            Reservar
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onDetalhe}>
          Detalhes
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}

function ProdutoThumb({ foto, nome }: { foto?: string; nome: string }) {
  if (foto) {
    // Moldura com tamanho fixo + img preenchendo: garante o QUADRADO mesmo se
    // alguma regra externa mexer no sizing do <img> (foto saia retangular na
    // lista em producao — achado do roteiro de teste, bloco 2).
    return (
      <span className="block size-12 shrink-0 overflow-hidden rounded-md border">
        <img src={foto} alt={nome} className="h-full w-full object-cover" />
      </span>
    )
  }
  return (
    <div
      className="flex size-12 items-center justify-center rounded-md border border-dashed bg-muted/20 text-muted-foreground/40"
      aria-label="Sem foto"
    >
      <ImageOff aria-hidden="true" className="size-4" />
    </div>
  )
}
