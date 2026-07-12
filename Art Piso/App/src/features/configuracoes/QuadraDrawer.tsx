import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useInventory } from '@/store/inventory'
import type { Quadra } from '@/types/inventory'

export function QuadraDrawer({
  open,
  quadra,
  onClose,
  onSave,
}: {
  open: boolean
  quadra?: Quadra | null
  onClose: () => void
  onSave: (dados: Pick<Quadra, 'numero' | 'descricao'>) => void
}) {
  const { quadras } = useInventory()
  const [numero, setNumero] = useState(quadra?.numero ?? '')
  const [descricao, setDescricao] = useState(quadra?.descricao ?? '')

  // O numero e o VINCULO dos lotes (lote.quadra e texto): nao pode repetir em outra quadra.
  const numeroDuplicado = numero.trim()
    ? quadras.find((item) => item.id !== quadra?.id && item.numero.trim().toLowerCase() === numero.trim().toLowerCase())
    : undefined
  const valido = numero.trim().length > 0 && !numeroDuplicado && descricao.trim().length > 0

  return (
    <Drawer
      open={open}
      title={quadra ? 'Editar quadra' : 'Nova quadra'}
      description={quadra ? 'Atualize a identificação da localização física.' : 'Cadastre uma localização física do depósito.'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-[2]"
            disabled={!valido}
            onClick={() => onSave({ numero: numero.trim(), descricao: descricao.trim() })}
          >
            {quadra ? 'Salvar alterações' : 'Criar quadra'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Field label="Identificador">
          <Input value={numero} onChange={(event) => setNumero(event.target.value)} placeholder="Q-13" />
          {numeroDuplicado ? (
            <p className="mt-1.5 text-xs font-semibold text-danger">
              Identificador já usado ({numeroDuplicado.descricao}). Escolha outro.
            </p>
          ) : null}
        </Field>
        <Field label="Descrição">
          <Input value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Ex.: Corredor 3" />
        </Field>
      </div>
    </Drawer>
  )
}
