import { Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Stepper } from '@/components/ui/stepper'
import { formatM2 } from '@/data/mock-inventory'
import type { LoteEstoque, Produto } from '@/types/inventory'

/** Vincula um novo lote a um produto existente (herda m²/caixa e peças/caixa do produto). */
export function NovoLoteDrawer({
  open,
  produto,
  onClose,
  onSave,
}: {
  open: boolean
  produto: Produto | null
  onClose: () => void
  onSave: (lote: LoteEstoque) => void
}) {
  const [codigo, setCodigo] = useState('')
  const [quadra, setQuadra] = useState('')
  const [bitola, setBitola] = useState('')
  const [tonalidade, setTonalidade] = useState('')
  const [estoque, setEstoque] = useState(0)

  const valido = Boolean(produto && codigo.trim() && quadra.trim())
  const totalM2 = produto ? estoque * produto.m2PorCaixa : 0

  function salvar() {
    if (!produto) return
    onSave({
      id: crypto.randomUUID(),
      produtoId: produto.id,
      produto: produto.produto,
      referencia: produto.referencia,
      marca: produto.marca,
      tamanho: produto.tamanho,
      lote: codigo.trim(),
      quadra: quadra.trim(),
      bitola: bitola.trim() || undefined,
      tonalidade: tonalidade.trim() || undefined,
      m2PorCaixa: produto.m2PorCaixa,
      pecasPorCaixa: produto.pecasPorCaixa,
      precoM2: produto.precoM2,
      caixasEstoque: estoque,
      caixasReserva: 0,
      caixasPerda: 0,
    })
  }

  return (
    <Drawer
      open={open}
      title="Novo lote"
      description={produto ? `Vincular um lote a ${produto.produto}.` : undefined}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-[2]" disabled={!valido} onClick={salvar}>
            <Save aria-hidden="true" data-icon="inline-start" />
            Salvar lote
          </Button>
        </div>
      }
    >
      {produto ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            {produto.referencia ? <p className="font-mono text-xs text-primary">Ref. {produto.referencia}</p> : null}
            <p className="mt-1 font-bold">{produto.produto}</p>
            <p className="text-muted-foreground">
              {[[produto.marca, produto.tamanho].filter(Boolean).join(' - '), `${formatM2(produto.m2PorCaixa)} m²/caixa`, `${produto.pecasPorCaixa} pç/caixa`].join(' · ')}
            </p>
          </div>

          <Field label="Código do lote">
            <Input className="font-mono" value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="Ex: L-2407" />
          </Field>
          <Field label="Quadra">
            <Input value={quadra} onChange={(event) => setQuadra(event.target.value)} placeholder="Ex: Q-03" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bitola" optional>
              <Input className="font-mono" value={bitola} onChange={(event) => setBitola(event.target.value)} placeholder="Ex: 2" />
            </Field>
            <Field label="Tonalidade" optional>
              <Input className="font-mono" value={tonalidade} onChange={(event) => setTonalidade(event.target.value)} placeholder="Ex: A3" />
            </Field>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Estoque inicial</p>
                <p className="text-xs text-muted-foreground">Total de caixas no cadastro</p>
              </div>
              <Stepper value={estoque} onChange={setEstoque} label="Caixas em estoque" />
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs font-medium text-muted-foreground">Total estimado:</span>
              <span className="numeric text-lg font-bold text-success">{formatM2(totalM2)} m²</span>
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}
