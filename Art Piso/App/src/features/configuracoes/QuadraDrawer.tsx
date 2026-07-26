import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { onlyDigits } from '@/lib/masks'
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
  // Identidade = "Q-<numero> <deposito>" (ex.: "Q-1 B"), UNICA — e a chave que
  // resolve a quadra no app. Ao editar, extrai os digitos apos "Q-" e o deposito
  // da descricao. Deposito e texto LIVRE (A/B/C hoje, D/E amanha sem mexer no codigo).
  const [numero, setNumero] = useState(quadra?.numero.match(/^Q-?(\d+)/i)?.[1] ?? '')
  const [deposito, setDeposito] = useState(quadra?.descricao ?? '')

  const depositoFinal = deposito.trim().toUpperCase()
  const numeroFinal = numero.trim() && depositoFinal ? `Q-${numero.trim()} ${depositoFinal}` : ''
  // O numero (com deposito) e o VINCULO das alocacoes: nao pode repetir em outra quadra.
  const numeroDuplicado = numeroFinal
    ? quadras.find((item) => item.id !== quadra?.id && item.numero.trim().toLowerCase() === numeroFinal.toLowerCase())
    : undefined
  const valido = numeroFinal.length > 0 && !numeroDuplicado

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
            onClick={() => onSave({ numero: numeroFinal, descricao: depositoFinal })}
          >
            {quadra ? 'Salvar alterações' : 'Criar quadra'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Número">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                Q-
              </span>
              <Input
                inputMode="numeric"
                value={numero}
                onChange={(event) => setNumero(onlyDigits(event.target.value))}
                placeholder="13"
                className="pl-8"
              />
            </div>
          </Field>
          <Field label="Depósito">
            <Input
              value={deposito}
              onChange={(event) => setDeposito(event.target.value)}
              placeholder="Ex.: A"
              maxLength={12}
            />
          </Field>
        </div>
        {numeroFinal ? (
          <p className="-mt-3 text-xs text-muted-foreground">
            Identificador: <strong className="text-foreground">{numeroFinal}</strong>
          </p>
        ) : null}
        {numeroDuplicado ? (
          <p className="-mt-3 text-xs font-semibold text-danger">
            {numeroFinal} já existe. Escolha outro número ou depósito.
          </p>
        ) : null}
      </div>
    </Drawer>
  )
}
