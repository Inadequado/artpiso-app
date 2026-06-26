import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { documentoCompleto, documentoValido, formatCpfCnpj, formatTelefone, onlyDigits } from '@/lib/masks'
import type { ClienteInput } from '@/store/inventory'
import type { Cliente } from '@/types/inventory'

export function ClienteDrawer({
  open,
  cliente,
  nomeInicial,
  onClose,
  onSave,
}: {
  open: boolean
  cliente?: Cliente | null
  /** Nome pre-preenchido ao cadastrar a partir de outro fluxo (ex.: nova reserva). */
  nomeInicial?: string
  onClose: () => void
  onSave: (dados: ClienteInput) => void
}) {
  const [nome, setNome] = useState(cliente?.nome ?? nomeInicial ?? '')
  const [documento, setDocumento] = useState(cliente?.documento ?? '')
  const [telefone, setTelefone] = useState(cliente?.telefone ?? '')

  const documentoOk = documentoValido(documento)
  // Distingue "ainda incompleto" de "completo mas com digito verificador errado".
  const documentoMensagem =
    documento.length > 0 && !documentoOk
      ? documentoCompleto(documento)
        ? 'CPF/CNPJ inválido — confira os dígitos.'
        : 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) completo.'
      : undefined
  const telefoneOk = onlyDigits(telefone).length >= 10
  const valido = nome.trim().length > 0 && documentoOk && telefoneOk

  return (
    <Drawer
      open={open}
      title={cliente ? 'Editar cliente' : 'Novo cliente'}
      description="Cadastro do cliente: nome, CPF/CNPJ e telefone."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-[2]"
            disabled={!valido}
            onClick={() => onSave({ nome: nome.trim(), documento: documento.trim(), telefone: telefone.trim() })}
          >
            {cliente ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Field label="Nome">
          <Input
            name="nome"
            autoComplete="name"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Nome ou razão social"
          />
        </Field>
        <Field
          label="CPF / CNPJ"
          hint={documentoMensagem}
        >
          <Input
            inputMode="numeric"
            value={documento}
            onChange={(event) => setDocumento(formatCpfCnpj(event.target.value))}
            placeholder="000.000.000-00"
          />
        </Field>
        <Field label="Telefone">
          <Input
            type="tel"
            name="tel"
            autoComplete="tel"
            inputMode="numeric"
            value={telefone}
            onChange={(event) => setTelefone(formatTelefone(event.target.value))}
            placeholder="(31) 90000-0000"
          />
        </Field>
      </div>
    </Drawer>
  )
}
