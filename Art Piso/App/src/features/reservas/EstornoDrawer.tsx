import { Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { Textarea } from '@/components/ui/textarea'
import { clienteDaReserva } from '@/data/mock-inventory'
import { useInventory, type EstornarReservaInput } from '@/store/inventory'
import type { Reserva } from '@/types/inventory'

type EstornoDrawerProps = {
  reserva: Reserva | null
  onClose: () => void
  onConfirm: (input: EstornarReservaInput) => void
}

export function EstornoDrawer({ reserva, onClose, onConfirm }: EstornoDrawerProps) {
  const { lotes, clientes, quadras } = useInventory()
  const lote = lotes.find((l) => l.lote === reserva?.lote)
  const clienteNome = reserva ? (clienteDaReserva(reserva, clientes)?.nome ?? reserva.cliente) : ''

  const totalEntregue =
    reserva?.caixasEntregues ??
    reserva?.entregas?.reduce((sum, e) => sum + e.caixas, 0) ??
    reserva?.caixas ??
    0

  const quadraInicial = lote ? (quadras.find((q) => q.numero === lote.quadra)?.id ?? '') : ''

  const [caixas, setCaixas] = useState(String(totalEntregue || 1))
  const [quadraId, setQuadraId] = useState(quadraInicial)
  const [motivo, setMotivo] = useState('')

  const quantidade = Number(caixas)
  const quantidadeValida = Number.isFinite(quantidade) && quantidade >= 1 && quantidade <= totalEntregue
  const valido = Boolean(reserva) && quantidadeValida && quadraId !== ''

  return (
    <Drawer
      open={Boolean(reserva)}
      title="Registrar devolução"
      description={reserva ? `${reserva.pedido} · ${reserva.produto}` : undefined}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-[2]"
            disabled={!valido}
            onClick={() => {
              if (!reserva || !valido) return
              onConfirm({ id: reserva.id, caixas: quantidade, quadraId, motivo: motivo.trim() || undefined })
            }}
          >
            <Undo2 aria-hidden="true" data-icon="inline-start" />
            Confirmar devolução
          </Button>
        </div>
      }
    >
      {reserva ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="font-bold">{reserva.produto}</p>
            <p className="font-mono text-xs text-muted-foreground">{reserva.lote} · {reserva.quadra}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Cliente: <span className="font-semibold text-foreground">{clienteNome}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Total entregue: <span className="numeric font-semibold text-foreground">{totalEntregue} cx</span>
            </p>
          </div>

          <Field label="Caixas a devolver" hint={`Máximo: ${totalEntregue} cx`}>
            <Input
              type="number"
              min={1}
              max={totalEntregue}
              value={caixas}
              onChange={(e) => setCaixas(e.target.value)}
            />
          </Field>

          <Field label="Quadra de destino" hint="Registra onde as caixas foram colocadas — não altera a quadra do lote">
            <SelectMenu
              value={quadraId}
              onChange={setQuadraId}
              options={quadras.map((q) => ({ value: q.id, label: `${q.numero} — ${q.descricao}` }))}
              placeholder="Selecionar quadra"
            />
          </Field>

          <Field label="Motivo da devolução" hint="Opcional">
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: produto com defeito, pedido trocado, excesso de caixas…"
              rows={3}
            />
          </Field>
        </div>
      ) : null}
    </Drawer>
  )
}
