import { Info as InfoIcon, Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatPreco } from '@/data/mock-inventory'
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
  const { atualizarProduto } = useInventory()
  const [nome, setNome] = useState(produto?.produto ?? '')
  const [marca, setMarca] = useState(produto?.marca ?? '')
  const [tamanho, setTamanho] = useState(produto?.tamanho ?? '')
  const [m2PorCaixa, setM2PorCaixa] = useState(produto ? String(produto.m2PorCaixa) : '')
  const [pecasPorCaixa, setPecasPorCaixa] = useState(produto ? String(produto.pecasPorCaixa) : '')
  const [preco, setPreco] = useState(produto ? String(produto.precoM2) : '')

  const m2Num = Number(m2PorCaixa)
  const pecasNum = Number(pecasPorCaixa)
  const precoNum = Number(preco)
  const valido = Boolean(produto && nome.trim() && marca.trim() && m2Num > 0 && pecasNum > 0 && precoNum > 0)
  const variosLotes = (produto?.lotes.length ?? 0) > 1

  function salvar() {
    if (!produto || !valido) return
    atualizarProduto(produto.referencia, {
      produto: nome.trim(),
      marca: marca.trim(),
      tamanho: tamanho.trim(),
      m2PorCaixa: m2Num,
      pecasPorCaixa: pecasNum,
      precoM2: precoNum,
    })
    onClose()
  }

  return (
    <Drawer
      open={open}
      title="Editar produto"
      description={produto ? `Ref. ${produto.referencia}` : undefined}
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
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Porcelanato Branco Acetinado" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Marca">
              <Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ex: Portinari" />
            </Field>
            <Field label="Tamanho (cm)">
              <Input value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="Ex: 60x60" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="m² por caixa">
              <Input type="number" inputMode="decimal" step="0.01" min={0} value={m2PorCaixa} onChange={(e) => setM2PorCaixa(e.target.value)} placeholder="2.16" />
            </Field>
            <Field label="Peças por caixa">
              <Input type="number" inputMode="numeric" min={1} value={pecasPorCaixa} onChange={(e) => setPecasPorCaixa(e.target.value)} placeholder="6" />
            </Field>
          </div>
          <Field label="Preço de venda (R$/m²)">
            <Input type="number" inputMode="decimal" step="0.01" min={0} value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="89.90" />
            {precoNum > 0 && m2Num > 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">≈ {formatPreco(precoNum * m2Num)} por caixa</p>
            ) : null}
          </Field>

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
