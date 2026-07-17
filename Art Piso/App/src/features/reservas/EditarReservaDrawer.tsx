import { CheckCircle2, Package, PencilLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { Textarea } from '@/components/ui/textarea'
import { caixasDisponiveis, clienteDaReserva, formatM2, quadraLabel } from '@/data/mock-inventory'
import { ClienteSelector } from '@/features/reservas/ClienteSelector'
import { RegimeTogglePanel } from '@/features/reservas/RegimeTogglePanel'
import { erroDataEntrega, formatData } from '@/lib/masks'
import { caixasTravadasReserva, dataPrevistaLonga } from '@/lib/reserva-regime'
import { useInventory, type EditarReservaInput } from '@/store/inventory'
import type { Cliente, Reserva } from '@/types/inventory'

type EditarReservaDrawerProps = {
  reserva: Reserva | null
  onClose: () => void
  onConfirm: (input: EditarReservaInput) => void
}

export function EditarReservaDrawer({ reserva, onClose, onConfirm }: EditarReservaDrawerProps) {
  const { lotes, clientes } = useInventory()
  const loteOriginal = lotes.find((item) => item.lote === reserva?.lote)
  const [loteId, setLoteId] = useState(loteOriginal?.id ?? '')
  const [caixas, setCaixas] = useState(reserva ? String(reserva.caixas) : '')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(
    reserva ? clienteDaReserva(reserva, clientes) ?? null : null,
  )
  const [cadastroAberto, setCadastroAberto] = useState(false)
  const [dataPrevista, setDataPrevista] = useState(reserva?.dataPrevista ?? '')
  const [manterReservadoAgora, setManterReservadoAgora] = useState(reserva?.regime === 'travado')
  const [observacoes, setObservacoes] = useState(reserva?.observacoes ?? '')

  const isParcial = reserva?.status === 'parcial'
  const lote = lotes.find((item) => item.id === loteId)
  const travadasOriginais = reserva ? caixasTravadasReserva(reserva) : 0
  const mesmoLote = Boolean(lote && reserva && lote.lote === reserva.lote)
  const maxDisponivel = lote ? caixasDisponiveis(lote) + (mesmoLote ? travadasOriginais : 0) : 0
  const quantidade = Number(caixas)
  const quantidadeValida = Number.isFinite(quantidade) && quantidade > 0
  const entregaLonga = dataPrevistaLonga(dataPrevista)
  const m2 = lote && quantidadeValida ? quantidade * lote.m2PorCaixa : 0
  const excedeu = Boolean(lote) && !entregaLonga && quantidade > maxDisponivel
  const dataErro = erroDataEntrega(dataPrevista)
  const valido = Boolean(lote && reserva) && quantidadeValida && !excedeu && clienteSelecionado !== null && !dataErro

  function confirmar() {
    if (!lote || !reserva || !valido || !clienteSelecionado) return
    onConfirm({
      id: reserva.id,
      loteId: lote.id,
      caixas: quantidade,
      clienteId: clienteSelecionado.id,
      cliente: clienteSelecionado.nome,
      documento: clienteSelecionado.documento,
      telefone: clienteSelecionado.telefone,
      dataPrevista,
      manterReservadoAgora: entregaLonga ? manterReservadoAgora : undefined,
      observacoes,
    })
  }

  return (
    <Drawer
      open={Boolean(reserva)}
      title="Editar reserva"
      description={reserva ? `Pedido ${reserva.pedido}` : undefined}
      onClose={onClose}
      closeOnEsc={!cadastroAberto}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-[2]" disabled={!valido} onClick={confirmar}>
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
            Salvar alterações
          </Button>
        </div>
      }
    >
      {reserva ? (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <SectionLabel icon={Package}>Produto / Lote</SectionLabel>
            {isParcial ? (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="font-semibold">{lote?.produto}</p>
                <p className="font-mono text-sm text-muted-foreground">{lote?.lote} · Quadra {lote ? quadraLabel(lote) : ''}</p>
                <p className="mt-1 text-xs text-muted-foreground">Lote fixo — entrega parcial já registrada</p>
              </div>
            ) : (
              <SelectMenu
                value={loteId}
                onChange={setLoteId}
                placeholder="Selecione um lote..."
                options={lotes.map((item) => {
                  const disp = caixasDisponiveis(item) + (reserva.lote === item.lote ? travadasOriginais : 0)
                  return {
                    value: item.id,
                    label: `${item.produto} - ${item.lote} (${disp} cx)`,
                    disabled: !entregaLonga && disp <= 0,
                  }
                })}
              />
            )}
          </section>

          <section className="flex flex-col gap-5">
            <SectionLabel icon={PencilLine}>Dados da reserva</SectionLabel>

            {isParcial && reserva.caixasEntregues ? (
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Já entregue: </span>
                <span className="numeric font-semibold">{reserva.caixasEntregues} cx</span>
                <span className="text-muted-foreground"> · Saldo em aberto: </span>
                <span className="numeric font-semibold">{reserva.caixas} cx</span>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <Field label={isParcial ? 'Saldo em aberto (caixas)' : 'Quantidade (caixas)'}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={entregaLonga ? undefined : maxDisponivel}
                  value={caixas}
                  placeholder="0"
                  onChange={(event) => setCaixas(event.target.value)}
                />
              </Field>
              <Field label="Equivale a (m²)">
                <div className="numeric flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                  {formatM2(m2)} m²
                </div>
              </Field>
            </div>
            {excedeu ? (
              <p className="-mt-2 text-xs font-semibold text-danger">
                Acima do disponível ({maxDisponivel} cx). Reduza a quantidade.
              </p>
            ) : null}

            <ClienteSelector
              cliente={clienteSelecionado}
              onChange={setClienteSelecionado}
              onCadastroOpenChange={setCadastroAberto}
              readOnly={isParcial}
            />

            <Field label="Data prevista de entrega" optional>
              <Input
                name="dataPrevista"
                inputMode="numeric"
                autoComplete="off"
                value={dataPrevista}
                onChange={(event) => setDataPrevista(formatData(event.target.value))}
                placeholder="DD/MM/AAAA"
              />
              {dataErro ? <p className="mt-1.5 text-xs font-semibold text-danger">{dataErro}</p> : null}
            </Field>

            {entregaLonga ? (
              <RegimeTogglePanel
                checked={manterReservadoAgora}
                onCheckedChange={setManterReservadoAgora}
                quantidade={quantidadeValida ? quantidade : 0}
                disponivel={maxDisponivel}
              />
            ) : null}

            <Field label="Observações">
              <Textarea
                rows={3}
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                placeholder="Detalhes adicionais sobre a reserva ou entrega..."
              />
            </Field>
          </section>
        </div>
      ) : null}
    </Drawer>
  )
}

function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-primary">
      <Icon aria-hidden="true" className="size-4" />
      <h3 className="text-xs font-bold uppercase tracking-[0.18em]">{children}</h3>
    </div>
  )
}
