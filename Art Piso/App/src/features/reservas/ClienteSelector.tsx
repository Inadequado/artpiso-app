import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Button } from '@/components/ui/button'
import { ClienteDrawer } from '@/features/clientes/ClienteDrawer'
import { onlyDigits } from '@/lib/masks'
import { useInventory } from '@/store/inventory'
import type { Cliente } from '@/types/inventory'

/**
 * Seleciona o cliente de uma reserva por ENTIDADE (id). Reusado em criar/editar reserva.
 * - Cliente selecionado: mostra resumo read-only (nome/doc/telefone) + "Trocar".
 * - Sem seleção: autocomplete por nome/CPF; nome novo abre o ClienteDrawer (cadastro canonico).
 * `onCadastroOpenChange` permite o drawer pai desligar o Esc enquanto o sub-cadastro esta aberto.
 */
export function ClienteSelector({
  cliente,
  onChange,
  onCadastroOpenChange,
  hideLabel = false,
  readOnly = false,
}: {
  cliente: Cliente | null
  onChange: (cliente: Cliente | null) => void
  onCadastroOpenChange?: (open: boolean) => void
  /** Oculta o rotulo interno "Cliente" (quando o pai ja tem um cabecalho de secao). */
  hideLabel?: boolean
  /** Bloqueia a selecao: esconde o botao "Trocar" e o autocomplete (reserva parcial). */
  readOnly?: boolean
}) {
  const { clientes, adicionarCliente } = useInventory()
  const [busca, setBusca] = useState(cliente?.nome ?? '')
  const [cadastroOpen, setCadastroOpen] = useState(false)
  const [cadastroSeq, setCadastroSeq] = useState(0)

  const buscaTrim = busca.trim().toLowerCase()
  const digitos = onlyDigits(busca)
  const sugestoes =
    buscaTrim === ''
      ? []
      : clientes
          .filter(
            (item) =>
              item.nome.toLowerCase().includes(buscaTrim) ||
              (digitos.length > 0 && onlyDigits(item.documento).includes(digitos)),
          )
          .slice(0, 6)
          .map((item) => ({ value: item.id, label: item.nome, hint: item.documento }))

  function abrirCadastro() {
    setCadastroSeq((seq) => seq + 1)
    setCadastroOpen(true)
    onCadastroOpenChange?.(true)
  }

  function fecharCadastro() {
    setCadastroOpen(false)
    onCadastroOpenChange?.(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {hideLabel ? null : (
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Cliente</span>
      )}
      {cliente ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold">{cliente.nome}</p>
              <p className="font-mono text-sm text-muted-foreground">{cliente.documento}</p>
              <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
            </div>
            {!readOnly ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  onChange(null)
                  setBusca('')
                }}
              >
                Trocar
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <Autocomplete
            value={busca}
            onChange={setBusca}
            onSelect={(id) => {
              const encontrado = clientes.find((item) => item.id === id)
              if (encontrado) {
                onChange(encontrado)
                setBusca(encontrado.nome)
              }
            }}
            options={sugestoes}
            name="cliente"
            placeholder="Buscar cliente por nome ou CPF/CNPJ…"
          />
          {buscaTrim !== '' ? (
            <button
              type="button"
              onClick={abrirCadastro}
              className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <UserPlus aria-hidden="true" className="size-4 shrink-0 text-primary" />
              Cadastrar “{busca.trim()}” como novo cliente
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">Busque um cliente cadastrado ou cadastre um novo.</p>
          )}
        </>
      )}

      <ClienteDrawer
        key={cadastroSeq}
        open={cadastroOpen}
        cliente={null}
        nomeInicial={busca.trim()}
        onClose={fecharCadastro}
        onSave={(dados) => {
          const novo = adicionarCliente(dados)
          onChange(novo)
          setBusca(novo.nome)
          fecharCadastro()
        }}
      />
    </div>
  )
}
