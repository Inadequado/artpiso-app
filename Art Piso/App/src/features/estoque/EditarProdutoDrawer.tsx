import { Info as InfoIcon, Save } from 'lucide-react'
import { useState } from 'react'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FotoProdutoField } from '@/features/estoque/FotoProdutoField'
import { agruparPorProduto, chaveNome, chaveReferencia, formatPreco } from '@/data/mock-inventory'
import { formatDecimalPonto, formatMoeda, parseMoeda } from '@/lib/masks'
import { useInventory } from '@/store/inventory'
import type { Produto } from '@/types/inventory'

/** Edita os dados de catalogo do produto. Aplica a TODOS os lotes da referencia. */
export function EditarProdutoDrawer({
  open,
  produto,
  onClose,
}: {
  open: boolean
  produto: Produto | null
  onClose: () => void
}) {
  const { atualizarProduto, lotes } = useInventory()
  const [nome, setNome] = useState((produto?.produto ?? '').toUpperCase())
  const [referencia, setReferencia] = useState(produto?.referencia ?? '')
  const [marca, setMarca] = useState(produto?.marca ?? '')
  const [tamanho, setTamanho] = useState(produto?.tamanho ?? '')
  const [m2PorCaixa, setM2PorCaixa] = useState(produto ? formatDecimalPonto(produto.m2PorCaixa) : '')
  const [pecasPorCaixa, setPecasPorCaixa] = useState(produto ? String(produto.pecasPorCaixa) : '')
  const [preco, setPreco] = useState(produto ? formatMoeda(produto.precoM2) : '')
  const [limiteBaixo, setLimiteBaixo] = useState(produto?.limiteEstoqueBaixo != null ? String(produto.limiteEstoqueBaixo) : '10')
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [foto, setFoto] = useState(produto?.foto)

  // Marcas existentes no autocomplete (mesmo padrao do cadastro): nao fragmentar o catalogo.
  const todosProdutos = agruparPorProduto(lotes)
  const termoMarca = marca.trim().toLowerCase()
  const marcasExistentes = Array.from(new Set(todosProdutos.map((p) => p.marca).filter(Boolean)))
  const sugestoesMarca = marcasExistentes
    .filter((m) => (termoMarca ? m.toLowerCase().includes(termoMarca) && m.toLowerCase() !== termoMarca : true))
    .slice(0, 6)
    .map((m) => ({ value: m, label: m }))

  // Referencia/nome nao podem colidir com OUTRO produto: o reaproveitamento do cadastro
  // identifica produto por essas chaves (e o schema Fase 2 preve referencia unique).
  const outros = todosProdutos.filter((p) => p.id !== produto?.id)
  const refChave = chaveReferencia(referencia)
  const refDuplicada = refChave ? outros.find((p) => chaveReferencia(p.referencia) === refChave) : undefined
  const nomeChave = chaveNome(nome)
  const nomeDuplicado = nomeChave ? outros.find((p) => chaveNome(p.produto) === nomeChave) : undefined

  const m2Num = Number(m2PorCaixa)
  const pecasNum = Number(pecasPorCaixa)
  const precoNum = parseMoeda(preco)
  const valido = Boolean(
    produto &&
      nome.trim() &&
      !nomeDuplicado &&
      !refDuplicada &&
      marca.trim() &&
      m2Num > 0 &&
      pecasNum > 0 &&
      precoNum > 0 &&
      Number(limiteBaixo) >= 1,
  )
  const variosLotes = (produto?.lotes.length ?? 0) > 1

  function salvar() {
    if (!produto || !valido) return
    atualizarProduto(produto.id, {
      produto: nome.trim().toUpperCase(),
      referencia: referencia.trim(),
      marca: marca.trim(),
      tamanho: tamanho.trim(),
      m2PorCaixa: m2Num,
      pecasPorCaixa: pecasNum,
      precoM2: precoNum,
      limiteEstoqueBaixo: Math.max(1, Number(limiteBaixo) || 10),
      descricao: descricao.trim() || undefined,
      foto,
    })
    onClose()
  }

  return (
    <Drawer
      open={open}
      title="Editar produto"
      description={produto?.referencia ? `Ref. ${produto.referencia}` : undefined}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-[2]" disabled={!valido} onClick={salvar}>
            <Save aria-hidden="true" data-icon="inline-start" />
            Salvar alterações
          </Button>
        </div>
      }
    >
      {produto ? (
        <div className="flex flex-col gap-6">
          <Field label="Nome do produto">
            <Input value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} placeholder="Ex: Porcelanato Branco Acetinado" />
            {nomeDuplicado ? (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                Já existe outro produto com este nome
                {nomeDuplicado.referencia ? ` (Ref. ${nomeDuplicado.referencia})` : ''}. Escolha um nome diferente.
              </p>
            ) : null}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Referência" optional>
              <Input className="font-mono" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Digite aqui..." />
              {refDuplicada ? (
                <p className="mt-1.5 text-xs font-semibold text-danger">
                  Referência já usada em {refDuplicada.produto}.
                </p>
              ) : null}
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
            <Field label="Tamanho (cm)" optional>
              <Input value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="Ex: 60x60" />
            </Field>
            <Field label="Preço de venda (R$/m²)">
              <Input inputMode="numeric" value={preco} onChange={(e) => setPreco(formatMoeda(e.target.value))} placeholder="R$ 0,00" />
              {precoNum > 0 && m2Num > 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">≈ {formatPreco(precoNum * m2Num)} por caixa</p>
              ) : null}
            </Field>
          </div>
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
              placeholder="10"
            />
          </Field>
          <Field label="Descrição" optional>
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Acabamento, detalhes técnicos…" />
          </Field>
          <FotoProdutoField value={foto} onChange={setFoto} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="m² por caixa">
              <Input inputMode="decimal" value={m2PorCaixa} onChange={(e) => setM2PorCaixa(formatDecimalPonto(e.target.value))} placeholder="0" />
            </Field>
            <Field label="Peças por caixa">
              <Input type="number" inputMode="numeric" min={1} value={pecasPorCaixa} onChange={(e) => setPecasPorCaixa(e.target.value)} placeholder="0" />
            </Field>
          </div>

          {variosLotes ? (
            <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <InfoIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Alterar m²/caixa ou peças/caixa vale para{' '}
                <strong className="text-foreground">todos os {produto.lotes.length} lotes</strong> desta referência.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  )
}
