import { Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { loteComCodigo, quadraLabelDetalhada } from '@/data/mock-inventory'
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
  const { atualizarLote, lotes } = useInventory()
  const [codigo, setCodigo] = useState(lote?.lote ?? '')
  const [bitola, setBitola] = useState(lote?.bitola ?? '')
  const [tonalidade, setTonalidade] = useState(lote?.tonalidade ?? '')

  const loteDuplicado = lote ? loteComCodigo(codigo, lotes, lote.id) : undefined
  const valido = Boolean(lote && codigo.trim() && !loteDuplicado && bitola.trim() && tonalidade.trim())

  function salvar() {
    if (!lote || !valido) return
    atualizarLote(lote.id, {
      lote: codigo.trim(),
      bitola: bitola.trim(),
      tonalidade: tonalidade.trim(),
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
            <Input className="font-mono" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Digite aqui..." />
            {loteDuplicado ? (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                Código já usado em {loteDuplicado.produto}. Escolha outro.
              </p>
            ) : null}
          </Field>
          <Field label="Localização">
            <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 font-mono text-sm text-muted-foreground">
              {quadraLabelDetalhada(lote)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Para mudar as caixas de lugar, use Ajustes → Mover lote de quadra (fica no histórico).
            </p>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bitola">
              <Input className="font-mono" value={bitola} onChange={(e) => setBitola(e.target.value)} placeholder="Ex: 2" />
            </Field>
            <Field label="Tonalidade">
              <Input className="font-mono" value={tonalidade} onChange={(e) => setTonalidade(e.target.value)} placeholder="Ex: 3" />
            </Field>
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}
