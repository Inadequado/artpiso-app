import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
  const [numero, setNumero] = useState(quadra?.numero ?? '')
  const [descricao, setDescricao] = useState(quadra?.descricao ?? '')

  const valido = numero.trim().length > 0 && descricao.trim().length > 0

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
        </Field>
        <Field label="Descrição">
          <Input value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Ex.: Corredor 3" />
        </Field>
      </div>
    </Drawer>
  )
}
