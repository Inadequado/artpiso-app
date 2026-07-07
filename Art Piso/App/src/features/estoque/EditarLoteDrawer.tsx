import { Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useInventory } from '@/store/inventory'
import type { LoteEstoque } from '@/types/inventory'

/**
 * Edita identificacao do lote (codigo e quadra). Estoque e perda continuam
 * nos fluxos de Ajustes (corrigir quantidade / registrar perda).
 */
export function EditarLoteDrawer({
  open,
  lote,
  onClose,
}: {
  open: boolean
  lote: LoteEstoque | null
  onClose: () => void
}) {
  const { atualizarLote } = useInventory()
  const [codigo, setCodigo] = useState(lote?.lote ?? '')
  const [quadra, setQuadra] = useState(lote?.quadra ?? '')
  const [bitola, setBitola] = useState(lote?.bitola ?? '')
  const [tonalidade, setTonalidade] = useState(lote?.tonalidade ?? '')

  const valido = Boolean(lote && codigo.trim() && quadra.trim())

  function salvar() {
    if (!lote || !valido) return
    atualizarLote(lote.id, {
      lote: codigo.trim(),
      quadra: quadra.trim(),
      bitola: bitola.trim() || undefined,
      tonalidade: tonalidade.trim() || undefined,
    })
    onClose()
  }

  return (
    <Drawer
      open={open}
      title="Editar lote"
      description={lote ? lote.produto : undefined}
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
      {lote ? (
        <div className="flex flex-col gap-6">
          <Field label="Código do lote">
            <Input className="font-mono" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: L-2405" />
          </Field>
          <Field label="Quadra">
            <Input value={quadra} onChange={(e) => setQuadra(e.target.value)} placeholder="Ex: Q-03" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bitola (opcional)">
              <Input className="font-mono" value={bitola} onChange={(e) => setBitola(e.target.value)} placeholder="Ex: 2" />
            </Field>
            <Field label="Tonalidade (opcional)">
              <Input className="font-mono" value={tonalidade} onChange={(e) => setTonalidade(e.target.value)} placeholder="Ex: A3" />
            </Field>
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}
