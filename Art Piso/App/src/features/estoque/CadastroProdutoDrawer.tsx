import { ImagePlus, Info as InfoIcon, Save, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Stepper } from '@/components/ui/stepper'
import { Textarea } from '@/components/ui/textarea'
import { agruparPorProduto, formatM2, formatPreco } from '@/data/mock-inventory'
import { cn } from '@/lib/utils'
import { useInventory } from '@/store/inventory'
import type { LoteEstoque } from '@/types/inventory'

/** Cadastro completo: registra o produto e o seu primeiro lote em uma so passada. */
export function CadastroProdutoDrawer({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (lote: LoteEstoque) => void
}) {
  const [nome, setNome] = useState('')
  const [referencia, setReferencia] = useState('')
  const [marca, setMarca] = useState('')
  const [tamanho, setTamanho] = useState('')
  const [descricao, setDescricao] = useState('')
  const [lote, setLote] = useState('')
  const [quadra, setQuadra] = useState('')
  const [bitola, setBitola] = useState('')
  const [tonalidade, setTonalidade] = useState('')
  const [m2PorCaixa, setM2PorCaixa] = useState('')
  const [pecasPorCaixa, setPecasPorCaixa] = useState('')
  const [preco, setPreco] = useState('')
  const [estoque, setEstoque] = useState(0)
  const [foto, setFoto] = useState<string | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  const { lotes } = useInventory()

  const produtosExistentes = agruparPorProduto(lotes)
  const termo = nome.trim().toLowerCase()
  const sugestoes = termo
    ? produtosExistentes
        .filter(
          (produto) =>
            produto.produto.toLowerCase().includes(termo) || produto.referencia.toLowerCase().includes(termo),
        )
        .filter((produto) => produto.produto.toLowerCase() !== termo)
        .slice(0, 6)
        .map((produto) => ({
          value: produto.id,
          label: produto.produto,
          hint: [produto.marca, produto.tamanho, produto.referencia ? `Ref. ${produto.referencia}` : '']
            .filter(Boolean)
            .join(' · '),
        }))
    : []

  // Marcas ja cadastradas (distintas) para o autocomplete: evita fragmentar o catalogo
  // com a mesma marca grafada de formas diferentes. Mostra todas no foco; filtra ao digitar.
  const termoMarca = marca.trim().toLowerCase()
  const marcasExistentes = Array.from(new Set(produtosExistentes.map((p) => p.marca).filter(Boolean)))
  const sugestoesMarca = marcasExistentes
    .filter((m) => (termoMarca ? m.toLowerCase().includes(termoMarca) && m.toLowerCase() !== termoMarca : true))
    .slice(0, 6)
    .map((m) => ({ value: m, label: m }))

  // Reaproveitamento de produto existente: pela referencia (quando digitada) ou pelo nome exato
  // (cobre produto sem referencia). A identidade que vale no save e o produtoId do match.
  const produtoExistente =
    produtosExistentes.find(
      (produto) =>
        produto.referencia.trim().toLowerCase() === referencia.trim().toLowerCase() && referencia.trim() !== '',
    ) ?? produtosExistentes.find((produto) => produto.produto.trim().toLowerCase() === termo && termo !== '')

  function selecionarProduto(id: string) {
    const produto = produtosExistentes.find((item) => item.id === id)
    if (!produto) return
    setNome(produto.produto)
    setReferencia(produto.referencia)
    setMarca(produto.marca)
    setTamanho(produto.tamanho)
    setM2PorCaixa(String(produto.m2PorCaixa))
    setPecasPorCaixa(String(produto.pecasPorCaixa))
    setPreco(String(produto.precoM2))
    if (produto.foto) setFoto(produto.foto)
  }

  function onFotoSelecionada(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0]
    if (!arquivo) return
    const reader = new FileReader()
    reader.onload = () => setFoto(typeof reader.result === 'string' ? reader.result : undefined)
    reader.readAsDataURL(arquivo)
  }

  const m2Caixa = Number(m2PorCaixa)
  const pecasCaixa = Number(pecasPorCaixa)
  const precoNum = Number(preco)
  const totalM2 = Number.isFinite(m2Caixa) && m2Caixa > 0 ? estoque * m2Caixa : 0
  const valido = Boolean(
    nome.trim() &&
      marca.trim() &&
      lote.trim() &&
      quadra.trim() &&
      m2Caixa > 0 &&
      pecasCaixa > 0 &&
      precoNum > 0,
  )

  function salvar() {
    onSave({
      id: crypto.randomUUID(),
      // Novo lote de produto existente herda o produtoId dele; produto novo ganha id proprio.
      produtoId: produtoExistente?.id ?? crypto.randomUUID(),
      produto: nome.trim(),
      referencia: referencia.trim(),
      marca: marca.trim(),
      tamanho: tamanho.trim(),
      lote: lote.trim(),
      quadra: quadra.trim(),
      bitola: bitola.trim() || undefined,
      tonalidade: tonalidade.trim() || undefined,
      m2PorCaixa: m2Caixa,
      pecasPorCaixa: pecasCaixa,
      precoM2: precoNum,
      caixasEstoque: estoque,
      caixasReserva: 0,
      caixasPerda: 0,
      foto,
    })
  }

  return (
    <Drawer
      open={open}
      title="Novo cadastro"
      description="Registre o produto e vincule um lote ao estoque."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Descartar</Button>
          <Button className="flex-[2]" disabled={!valido} onClick={salvar}>
            <Save aria-hidden="true" data-icon="inline-start" />
            Salvar registro
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <StepLabel number={1} tone="primary">Informações do produto</StepLabel>
          <Field label="Nome do produto">
            <Autocomplete
              value={nome}
              onChange={setNome}
              onSelect={selecionarProduto}
              options={sugestoes}
              placeholder="Ex: Porcelanato Branco Acetinado"
            />
          </Field>
          {produtoExistente ? (
            <div className="-mt-1 flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <InfoIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Produto já cadastrado (<strong className="text-foreground">{produtoExistente.produto}</strong>
                {produtoExistente.referencia ? `, Ref. ${produtoExistente.referencia}` : ''}). Você está adicionando um{' '}
                <strong className="text-foreground">novo lote</strong> a ele; os dados do produto serão mantidos.
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Referência">
              <Input className="font-mono" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ex: POR-6060-BL" />
            </Field>
            <Field label="Marca">
              <Autocomplete
                value={marca}
                onChange={setMarca}
                onSelect={setMarca}
                options={sugestoesMarca}
                placeholder="Ex: Portinari"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tamanho (cm)">
              <Input value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="Ex: 60x60" />
            </Field>
            <Field label="Preço de venda (R$/m²)">
              <Input type="number" inputMode="decimal" step="0.01" min={0} value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="89.90" />
              {precoNum > 0 && m2Caixa > 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">≈ {formatPreco(precoNum * m2Caixa)} por caixa</p>
              ) : null}
            </Field>
          </div>
          <Field label="Descrição">
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Acabamento, detalhes técnicos…" />
          </Field>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={onFotoSelecionada}
          />
          {foto ? (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <img src={foto} alt="Prévia do produto" className="size-16 rounded-md border object-cover" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Foto adicionada</span>
                <div className="flex gap-3">
                  <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => fileRef.current?.click()}>
                    Trocar
                  </button>
                  <button type="button" className="flex items-center gap-1 text-xs font-semibold text-danger hover:underline" onClick={() => setFoto(undefined)}>
                    <X aria-hidden="true" className="size-3" /> Remover
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <ImagePlus aria-hidden="true" className="size-7" />
              <span className="text-sm font-semibold text-foreground">Adicionar foto do produto</span>
              <span className="text-xs">Opcional · JPG ou PNG</span>
            </button>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <StepLabel number={2} tone="success">Dados do lote</StepLabel>
          <div className="grid grid-cols-[1.4fr_0.8fr] gap-4">
            <Field label="Código do lote">
              <Input className="font-mono" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Ex: L-2405" />
            </Field>
            <Field label="Quadra">
              <Input value={quadra} onChange={(e) => setQuadra(e.target.value)} placeholder="Ex: Q-03" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bitola">
              <Input className="font-mono" value={bitola} onChange={(e) => setBitola(e.target.value)} placeholder="Ex: 2" />
            </Field>
            <Field label="Tonalidade">
              <Input className="font-mono" value={tonalidade} onChange={(e) => setTonalidade(e.target.value)} placeholder="Ex: A3" />
            </Field>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Estoque inicial</p>
              <p className="text-xs text-muted-foreground">Caixas como base do saldo</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Caixas</p>
                <p className="text-xs text-muted-foreground">Total no cadastro</p>
              </div>
              <Stepper value={estoque} onChange={setEstoque} label="Caixas em estoque" />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-4">
              <Field label="Peças por caixa" labelClassName="whitespace-nowrap tracking-[0.08em]">
                <Input type="number" inputMode="numeric" min={1} value={pecasPorCaixa} onChange={(e) => setPecasPorCaixa(e.target.value)} placeholder="6" />
              </Field>
              <Field label="m² por caixa" labelClassName="tracking-[0.12em]">
                <Input type="number" inputMode="decimal" step="0.01" min={0} value={m2PorCaixa} onChange={(e) => setM2PorCaixa(e.target.value)} placeholder="2.16" />
              </Field>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs font-medium text-muted-foreground">Total estimado:</span>
              <span className="numeric text-lg font-bold text-success">{formatM2(totalM2)} m²</span>
            </div>
          </div>

          <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <InfoIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Novos lotes para a mesma referência podem ser adicionados depois pelo botão{' '}
              <strong className="text-foreground">Novo lote</strong> no detalhe do produto.
            </p>
          </div>
        </section>
      </div>
    </Drawer>
  )
}

function StepLabel({ number, tone, children }: { number: number; tone: 'primary' | 'success'; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'flex size-7 items-center justify-center rounded-md text-sm font-bold',
          tone === 'success' ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary',
        )}
      >
        {number}
      </span>
      <h3 className="text-sm font-bold uppercase tracking-[0.12em]">{children}</h3>
    </div>
  )
}
