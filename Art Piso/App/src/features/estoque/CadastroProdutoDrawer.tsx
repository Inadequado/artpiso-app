import { Info as InfoIcon, Save } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { Stepper } from '@/components/ui/stepper'
import { Textarea } from '@/components/ui/textarea'
import { FotoProdutoField } from '@/features/estoque/FotoProdutoField'
import { agruparPorProduto, chaveNome, chaveReferencia, formatM2, formatPreco, loteComCodigo } from '@/data/mock-inventory'
import { uid } from '@/lib/id'
import { formatDecimalPonto, formatMedida, formatMoeda, parseMoeda } from '@/lib/masks'
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
  const [largura, setLargura] = useState('')
  const [comprimento, setComprimento] = useState('')
  const [limiteBaixo, setLimiteBaixo] = useState('')
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
  const { lotes, quadras } = useInventory()
  // Tamanho vira "LxC" so quando os dois lados estao preenchidos (campo opcional).
  const tamanhoFinal = largura.trim() && comprimento.trim() ? `${largura.trim()}x${comprimento.trim()}` : ''

  const produtosExistentes = agruparPorProduto(lotes)
  // Chaves normalizadas (sem acento/caixa/espaco duplo; referencia ignora separadores):
  // variacao de digitacao nao pode criar produto duplicado em vez de reaproveitar.
  const nomeChave = chaveNome(nome)
  const refChave = chaveReferencia(referencia)
  const sugestoes = nomeChave
    ? produtosExistentes
        .filter(
          (produto) =>
            chaveNome(produto.produto).includes(nomeChave) ||
            chaveReferencia(produto.referencia).includes(chaveReferencia(nome)),
        )
        .filter((produto) => chaveNome(produto.produto) !== nomeChave)
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
    (refChave ? produtosExistentes.find((produto) => chaveReferencia(produto.referencia) === refChave) : undefined) ??
    (nomeChave ? produtosExistentes.find((produto) => chaveNome(produto.produto) === nomeChave) : undefined)

  // Basta nome+referencia para ativar o match (produtoExistente); os demais dados do produto
  // NAO entram nos inputs — com match ativo eles vem da entidade no salvar. Assim, desfazer o
  // match (mudar o nome) nao deixa marca/preco/foto do produto antigo pre-preenchidos.
  function selecionarProduto(id: string) {
    const produto = produtosExistentes.find((item) => item.id === id)
    if (!produto) return
    setNome(produto.produto)
    setReferencia(produto.referencia)
  }

  // Com produto existente, os dados do produto vem da ENTIDADE, nunca dos inputs: os campos
  // ficam ocultos (viram resumo read-only) e o salvar ignora o que estiver digitado neles.
  // Evita lote-irmao com dados divergentes do mesmo produtoId (achado da revisao de telas).
  const m2Caixa = produtoExistente ? produtoExistente.m2PorCaixa : Number(m2PorCaixa)
  const pecasCaixa = produtoExistente ? produtoExistente.pecasPorCaixa : Number(pecasPorCaixa)
  const precoNum = produtoExistente ? produtoExistente.precoM2 : parseMoeda(preco)
  const totalM2 = Number.isFinite(m2Caixa) && m2Caixa > 0 ? estoque * m2Caixa : 0
  const dadosProdutoValidos = produtoExistente
    ? true
    // Preco OPCIONAL (2026-07-18): o gerente do deposito cadastra sem saber o valor de
    // venda; 0 = "sem preco" (exibido como traco), a loja preenche depois no Editar.
    : Boolean(nome.trim() && marca.trim() && m2Caixa > 0 && pecasCaixa > 0 && Number(limiteBaixo) >= 1)
  const loteDuplicado = loteComCodigo(lote, lotes, produtoExistente?.id)
  // Minimo 1 caixa (decisao do usuario): lote sem caixa nasceria esgotado sem aviso.
  const valido = Boolean(
    dadosProdutoValidos && lote.trim() && !loteDuplicado && quadra.trim() && estoque > 0 && bitola.trim() && tonalidade.trim(),
  )

  function salvar() {
    onSave({
      id: uid(),
      // Novo lote de produto existente herda o produtoId dele; produto novo ganha id proprio.
      produtoId: produtoExistente?.id ?? uid(),
      produto: produtoExistente ? produtoExistente.produto : nome.trim().toUpperCase(),
      referencia: produtoExistente ? produtoExistente.referencia : referencia.trim(),
      marca: produtoExistente ? produtoExistente.marca : marca.trim(),
      tamanho: produtoExistente ? produtoExistente.tamanho : tamanhoFinal,
      lote: lote.trim(),
      alocacoes: [{ quadra: quadra.trim(), caixas: estoque }],
      bitola: bitola.trim(),
      tonalidade: tonalidade.trim(),
      m2PorCaixa: m2Caixa,
      pecasPorCaixa: pecasCaixa,
      precoM2: precoNum,
      limiteEstoqueBaixo: produtoExistente ? produtoExistente.limiteEstoqueBaixo : Math.max(1, Number(limiteBaixo)),
      descricao: produtoExistente ? produtoExistente.descricao : descricao.trim() || undefined,
      caixasEstoque: estoque,
      caixasReserva: 0,
      caixasPerda: 0,
      foto: produtoExistente ? produtoExistente.foto : foto,
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
            <div className="-mt-1 flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              {produtoExistente.foto ? (
                <img src={produtoExistente.foto} alt="" className="size-16 shrink-0 rounded-md border object-cover" />
              ) : (
                <InfoIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              )}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <p>
                  Produto já cadastrado — você está adicionando um <strong className="text-foreground">novo lote</strong> a ele.
                </p>
                <p className="text-sm font-bold text-foreground">
                  {produtoExistente.produto}
                  {produtoExistente.referencia ? (
                    <span className="ml-2 font-mono text-xs font-normal text-primary">Ref. {produtoExistente.referencia}</span>
                  ) : null}
                </p>
                <p>
                  {[
                    [produtoExistente.marca, produtoExistente.tamanho].filter(Boolean).join(' - '),
                    `${formatM2(produtoExistente.m2PorCaixa)} m²/caixa`,
                    `${produtoExistente.pecasPorCaixa} pç/caixa`,
                    produtoExistente.precoM2 > 0 ? `${formatPreco(produtoExistente.precoM2)}/m²` : 'sem preço',
                  ].join(' · ')}
                </p>
                <p>Os dados acima serão mantidos. Para cadastrar um produto diferente, altere o nome ou a referência.</p>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Referência" optional>
              <Input className="font-mono" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Digite aqui..." />
            </Field>
            {produtoExistente ? null : (
              <Field label="Marca">
                <Autocomplete
                  value={marca}
                  onChange={setMarca}
                  onSelect={setMarca}
                  options={sugestoesMarca}
                  placeholder="Ex: Portinari"
                />
              </Field>
            )}
          </div>
          {produtoExistente ? null : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tamanho (cm)" optional>
                <div className="flex items-center gap-2">
                  <Input inputMode="decimal" value={largura} onChange={(e) => setLargura(formatMedida(e.target.value))} placeholder="60" className="w-16 text-center" />
                  <span aria-hidden="true" className="text-muted-foreground">×</span>
                  <Input inputMode="decimal" value={comprimento} onChange={(e) => setComprimento(formatMedida(e.target.value))} placeholder="60" className="w-16 text-center" />
                </div>
              </Field>
              <Field label="Preço (R$/m²)" optional>
                <Input inputMode="numeric" value={preco} onChange={(e) => setPreco(formatMoeda(e.target.value))} placeholder="R$ 0,00" />
                {precoNum > 0 && m2Caixa > 0 ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">≈ {formatPreco(precoNum * m2Caixa)} por caixa</p>
                ) : null}
              </Field>
            </div>
          )}
          {produtoExistente ? null : (
            <Field
              label="Avisar estoque baixo em (caixas)"
              hint="Quando o disponível deste produto ficar abaixo disso, ele alerta estoque baixo."
            >
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={limiteBaixo}
                onChange={(e) => setLimiteBaixo(e.target.value)}
                placeholder="Digite a quantidade"
              />
            </Field>
          )}
          {produtoExistente ? null : (
            <Field label="Descrição" optional>
              <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Acabamento, detalhes técnicos…" />
            </Field>
          )}
          {produtoExistente ? null : <FotoProdutoField value={foto} onChange={setFoto} />}
        </section>

        <section className="flex flex-col gap-4">
          <StepLabel number={2} tone="success">Dados do lote</StepLabel>
          <div className="grid grid-cols-[1.4fr_0.8fr] gap-4">
            <Field label="Código do lote">
              <Input className="font-mono" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Digite aqui..." />
              {loteDuplicado ? (
                <p className="mt-1.5 text-xs font-semibold text-danger">
                  Código já usado em {loteDuplicado.produto}. Remessa do mesmo lote? Use Ajustes → Adicionar
                  estoque. Bitola/tonalidade diferente? Cadastre com sufixo (ex.: {lote.trim()}-B).
                </p>
              ) : null}
            </Field>
            <Field label="Quadra">
              <SelectMenu
                value={quadra}
                onChange={setQuadra}
                placeholder="Selecione…"
                options={quadras.map((q) => ({ value: q.numero, label: `${q.numero} — ${q.descricao}` }))}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bitola">
              <Input className="font-mono" value={bitola} onChange={(e) => setBitola(e.target.value)} placeholder="Ex: 2" />
            </Field>
            <Field label="Tonalidade">
              <Input className="font-mono" value={tonalidade} onChange={(e) => setTonalidade(e.target.value)} placeholder="Ex: 3" />
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

            {produtoExistente ? null : (
              <div className="grid grid-cols-2 gap-3 border-t pt-4">
                <Field label="Peças por caixa" labelClassName="whitespace-nowrap tracking-[0.08em]">
                  <Input type="number" inputMode="numeric" min={1} value={pecasPorCaixa} onChange={(e) => setPecasPorCaixa(e.target.value)} placeholder="0" />
                </Field>
                <Field label="m² por caixa" labelClassName="tracking-[0.12em]">
                  <Input inputMode="decimal" value={m2PorCaixa} onChange={(e) => setM2PorCaixa(formatDecimalPonto(e.target.value))} placeholder="0" />
                </Field>
              </div>
            )}
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
