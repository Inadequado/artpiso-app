import { MapPin, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { documentoCompleto, documentoValido, formatCpfCnpj, formatTelefone, onlyDigits } from '@/lib/masks'
import { useInventory, type ClienteInput } from '@/store/inventory'
import type { Cliente, EnderecoCliente } from '@/types/inventory'

/** Linha de endereco em edicao (campos em texto; vira EnderecoCliente no save). */
type EnderecoEdit = { id: string; apelido: string; endereco: string }

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
  const { reservas, clientes } = useInventory()
  const [nome, setNome] = useState(cliente?.nome ?? nomeInicial ?? '')
  const [documento, setDocumento] = useState(cliente?.documento ?? '')
  const [telefone, setTelefone] = useState(cliente?.telefone ?? '')
  const [enderecos, setEnderecos] = useState<EnderecoEdit[]>(
    () => cliente?.enderecos?.map((item) => ({ id: item.id, apelido: item.apelido ?? '', endereco: item.endereco })) ?? [],
  )

  const documentoOk = documentoValido(documento)
  // Documento e a identidade natural do cliente (PH-10): nao pode repetir em outro cadastro,
  // senao o historico de pedidos fragmenta entre dois clientes.
  const documentoDuplicado = documentoOk
    ? clientes.find((item) => item.id !== cliente?.id && onlyDigits(item.documento) === onlyDigits(documento))
    : undefined
  // Distingue "ainda incompleto" de "completo mas com digito verificador errado" e de "duplicado".
  const documentoMensagem =
    documento.length > 0 && !documentoOk
      ? documentoCompleto(documento)
        ? 'CPF/CNPJ inválido — confira os dígitos.'
        : 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) completo.'
      : documentoDuplicado
        ? `Documento já cadastrado para ${documentoDuplicado.nome}.`
        : undefined
  const telefoneOk = onlyDigits(telefone).length >= 10
  const enderecosOk = enderecos.every((item) => item.endereco.trim().length > 0)
  const valido = nome.trim().length > 0 && documentoOk && !documentoDuplicado && telefoneOk && enderecosOk

  // Endereco vinculado a pedido ATIVO (reservado/parcial) nao pode ser removido (evita orfa).
  function enderecoEmUso(id: string) {
    return reservas.some(
      (reserva) => reserva.enderecoId === id && (reserva.status === 'reservado' || reserva.status === 'parcial'),
    )
  }

  function adicionarEndereco() {
    setEnderecos((atual) => [...atual, { id: crypto.randomUUID(), apelido: '', endereco: '' }])
  }

  function atualizarEndereco(id: string, patch: Partial<EnderecoEdit>) {
    setEnderecos((atual) => atual.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function removerEndereco(id: string) {
    setEnderecos((atual) => atual.filter((item) => item.id !== id))
  }

  function salvar() {
    const lista: EnderecoCliente[] = enderecos.map((item) => ({
      id: item.id,
      apelido: item.apelido.trim() || undefined,
      endereco: item.endereco.trim(),
    }))
    onSave({
      nome: nome.trim(),
      documento: documento.trim(),
      telefone: telefone.trim(),
      enderecos: lista.length > 0 ? lista : undefined,
    })
  }

  return (
    <Drawer
      open={open}
      title={cliente ? 'Editar cliente' : 'Novo cliente'}
      description="Cadastro do cliente: nome, CPF/CNPJ, telefone e endereços de entrega."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-[2]" disabled={!valido} onClick={salvar}>
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

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin aria-hidden="true" className="size-4" />
            <h4 className="text-xs font-bold uppercase tracking-[0.14em]">
              Endereços de entrega
              <span className="ml-2 font-normal lowercase tracking-normal text-muted-foreground/60">opcional</span>
            </h4>
          </div>

          {enderecos.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Sem endereço cadastrado, os pedidos deste cliente saem como retirada na loja. Um cliente pode ter mais de
              uma obra.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {enderecos.map((item, indice) => {
                const emUso = enderecoEmUso(item.id)
                return (
                  <div key={item.id} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Endereço {indice + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-danger disabled:opacity-40"
                        disabled={emUso}
                        aria-label={`Remover endereço ${indice + 1}`}
                        title={emUso ? 'Endereço vinculado a pedido ativo não pode ser removido' : 'Remover endereço'}
                        onClick={() => removerEndereco(item.id)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                    <Field label="Apelido da obra" optional>
                      <Input
                        value={item.apelido}
                        onChange={(event) => atualizarEndereco(item.id, { apelido: event.target.value })}
                        placeholder="Ex: Obra Centro"
                      />
                    </Field>
                    <Field label="Endereço">
                      <Input
                        value={item.endereco}
                        onChange={(event) => atualizarEndereco(item.id, { endereco: event.target.value })}
                        placeholder="Rua, número — bairro, cidade"
                      />
                    </Field>
                  </div>
                )
              })}
            </div>
          )}

          <Button type="button" variant="outline" size="sm" className="self-start" onClick={adicionarEndereco}>
            <Plus aria-hidden="true" data-icon="inline-start" />
            Adicionar endereço
          </Button>
        </section>
      </div>
    </Drawer>
  )
}
