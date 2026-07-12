import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { Textarea } from '@/components/ui/textarea'
import { caixasDisponiveis, clienteDaReserva, enderecoEntregaDaReserva, quadraLabel, sugerirRetiradas } from '@/data/mock-inventory'
import { useInventory, type EntregarReservaInput } from '@/store/inventory'
import type { LoteEstoque, Reserva } from '@/types/inventory'

/** Sugestao inicial da divisao por quadra (maior primeiro), no formato dos inputs. */
function sugestaoRetiradas(lote: LoteEstoque | undefined, caixas: number): Record<string, string> {
  if (!lote || !Number.isFinite(caixas) || caixas <= 0) return {}
  return Object.fromEntries(sugerirRetiradas(lote.alocacoes, caixas).map((r) => [r.quadra, String(r.caixas)]))
}

type EntregaDrawerProps = {
  reserva: Reserva | null
  onClose: () => void
  onConfirm: (input: EntregarReservaInput) => void
}

export function EntregaDrawer({ reserva, onClose, onConfirm }: EntregaDrawerProps) {
  const { lotes, clientes } = useInventory()
  const loteOriginal = lotes.find((l) => l.lote === reserva?.lote)
  const clienteNome = reserva ? (clienteDaReserva(reserva, clientes)?.nome ?? reserva.cliente) : ''
  const enderecoEntrega = reserva ? enderecoEntregaDaReserva(reserva, clientes) : undefined

  const [responsavel, setResponsavel] = useState('')
  const [caixas, setCaixas] = useState(reserva ? String(reserva.caixas) : '')
  const [observacoes, setObservacoes] = useState('')
  const [loteAlternativoId, setLoteAlternativoId] = useState('')
  // Divisao por quadra (M3): quantas caixas saem de cada quadra do lote da entrega.
  // Nasce com a sugestao (maior quadra primeiro) e o usuario redistribui como quiser.
  const [retiradas, setRetiradas] = useState<Record<string, string>>(() =>
    sugestaoRetiradas(loteOriginal, reserva?.caixas ?? 0),
  )

  const saldo = reserva?.caixas ?? 0
  const quantidade = Number(caixas)
  const quantidadeValida = Number.isFinite(quantidade) && quantidade >= 1 && quantidade <= saldo
  const parcialEntrega = quantidadeValida && quantidade < saldo

  // Troca de lote só é permitida para rotacionando em status 'reservado'.
  // Após a primeira entrega parcial (status 'parcial') o lote fica fixo via R-05.
  const isRotacionando = reserva?.regime === 'rotacionando' && reserva?.status === 'reservado'
  const dispOriginal = loteOriginal ? caixasDisponiveis(loteOriginal) : 0
  const originalInsuficiente = isRotacionando && quantidadeValida && dispOriginal < quantidade

  const lotesAlternativos = originalInsuficiente
    ? lotes.filter(
        (l) => l.produto === reserva?.produto && l.lote !== reserva?.lote && caixasDisponiveis(l) >= quantidade,
      )
    : []
  const semAlternativa = originalInsuficiente && lotesAlternativos.length === 0
  const loteAlternativo = lotes.find((l) => l.id === loteAlternativoId)

  // Lote de onde as caixas SAEM de fato (rotacionando pode trocar); a divisao por quadra e dele.
  const loteEntrega = originalInsuficiente ? loteAlternativo : loteOriginal
  const multiQuadra = (loteEntrega?.alocacoes.length ?? 0) > 1
  const retiradaDaQuadra = (quadra: string) => Number(retiradas[quadra] || 0)
  const somaRetiradas = (loteEntrega?.alocacoes ?? []).reduce((total, a) => total + retiradaDaQuadra(a.quadra), 0)
  const retiradaExcede = (loteEntrega?.alocacoes ?? []).some((a) => retiradaDaQuadra(a.quadra) > a.caixas || retiradaDaQuadra(a.quadra) < 0)
  const retiradasOk = !multiQuadra || (somaRetiradas === quantidade && !retiradaExcede)

  // Quantidade e lote alternativo mudam o cenario: refaz a sugestao da divisao pro lote efetivo.
  function aoMudarCaixas(valor: string) {
    setCaixas(valor)
    const nova = Number(valor)
    const insuficiente = isRotacionando && Boolean(loteOriginal) && dispOriginal < nova
    setRetiradas(sugestaoRetiradas(insuficiente ? loteAlternativo : loteOriginal, nova))
  }

  function aoEscolherLoteAlternativo(id: string) {
    setLoteAlternativoId(id)
    setRetiradas(sugestaoRetiradas(lotes.find((l) => l.id === id), quantidade))
  }

  const valido =
    Boolean(reserva) &&
    responsavel.trim().length > 0 &&
    quantidadeValida &&
    !semAlternativa &&
    (!originalInsuficiente || Boolean(loteAlternativo)) &&
    retiradasOk

  function confirmar() {
    if (!reserva || !valido) return
    onConfirm({
      id: reserva.id,
      caixas: quantidade,
      responsavel,
      observacoes,
      loteId: originalInsuficiente && loteAlternativo ? loteAlternativo.id : undefined,
      retiradas: multiQuadra && loteEntrega
        ? loteEntrega.alocacoes
            .map((a) => ({ quadra: a.quadra, caixas: retiradaDaQuadra(a.quadra) }))
            .filter((r) => r.caixas > 0)
        : undefined,
    })
  }

  const loteExibido = originalInsuficiente && loteAlternativo ? loteAlternativo : loteOriginal

  return (
    <Drawer
      open={Boolean(reserva)}
      title="Confirmar entrega"
      description={reserva ? `Pedido ${reserva.pedido}` : undefined}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Voltar
          </Button>
          <Button className="flex-[2]" disabled={!valido} onClick={confirmar}>
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
            {parcialEntrega ? 'Finalizar entrega parcial' : 'Finalizar entrega'}
          </Button>
        </div>
      }
    >
      {reserva ? (
        <div className="flex flex-col gap-8">
          <Field label="Responsável pela entrega">
            <Input
              name="responsavel"
              autoComplete="name"
              value={responsavel}
              onChange={(event) => setResponsavel(event.target.value)}
              placeholder="Nome do motorista ou cliente"
            />
          </Field>

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary">
              <ClipboardList aria-hidden="true" className="size-4" />
              <h3 className="text-xs font-bold uppercase tracking-[0.18em]">Resumo do item</h3>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="font-bold">{reserva.produto}</h4>
              <p className="text-sm text-muted-foreground">Cliente: {clienteNome}</p>
              <p className="text-sm text-muted-foreground">Entrega: {enderecoEntrega ?? 'Retirada na loja'}</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <ResumoItem label="Saldo em aberto" value={`${saldo} cx`} />
                <ResumoItem label="Equivale a" value={`${reserva.m2.toLocaleString('pt-BR')} m²`} />
                <ResumoItem label="Lote" value={loteExibido?.lote ?? reserva.lote} mono />
              </div>
            </div>
          </section>

          <Field label="Caixas a entregar agora">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={saldo}
              value={caixas}
              placeholder="0"
              onChange={(event) => aoMudarCaixas(event.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {parcialEntrega
                ? `Entrega parcial: restarão ${saldo - quantidade} cx em aberto na reserva.`
                : 'Deixe igual ao saldo para entregar tudo de uma vez.'}
            </p>
          </Field>

          {originalInsuficiente ? (
            semAlternativa ? (
              <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  Sem estoque disponível para <strong>{reserva.produto}</strong>. Aguarde a reposição para registrar a entrega.
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 rounded-md border border-lowstock/40 bg-lowstock/10 px-3 py-2.5 text-sm text-lowstock">
                  <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Lote original <strong>{reserva.lote}</strong> tem apenas{' '}
                    <strong>{dispOriginal} cx</strong> disponíveis. Escolha outro lote do mesmo produto para esta entrega.
                  </span>
                </div>
                <Field label="Entregar do lote">
                  <SelectMenu
                    value={loteAlternativoId}
                    onChange={aoEscolherLoteAlternativo}
                    placeholder="Selecione um lote..."
                    options={lotesAlternativos.map((l) => ({
                      value: l.id,
                      label: `${l.lote} · ${quadraLabel(l)} — ${caixasDisponiveis(l)} cx disponíveis`,
                    }))}
                  />
                </Field>
              </>
            )
          ) : null}

          {multiQuadra && loteEntrega ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                De onde saem as caixas
              </span>
              <div className="flex flex-col gap-2">
                {loteEntrega.alocacoes.map((alocacao) => (
                  <div key={alocacao.quadra} className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
                    <span className="font-mono text-sm">
                      {alocacao.quadra}
                      <span className="ml-2 font-sans text-xs text-muted-foreground">{alocacao.caixas} cx no local</span>
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={alocacao.caixas}
                      className="w-24 text-right"
                      value={retiradas[alocacao.quadra] ?? ''}
                      placeholder="0"
                      onChange={(event) =>
                        setRetiradas((atual) => ({ ...atual, [alocacao.quadra]: event.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              {quantidadeValida && !retiradasOk ? (
                <p className="text-xs font-semibold text-danger">
                  {retiradaExcede
                    ? 'Alguma quadra está com mais caixas do que tem no local. Ajuste a divisão.'
                    : `Distribuídas ${somaRetiradas} de ${quantidade} cx. A divisão precisa somar o total da entrega.`}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  O lote está em mais de uma quadra. Sugerimos tirar da maior; redistribua se as caixas saírem de outro lugar.
                </p>
              )}
            </div>
          ) : null}

          <Field label="Observações">
            <Textarea
              rows={3}
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Detalhes adicionais sobre a entrega…"
            />
          </Field>
        </div>
      ) : null}
    </Drawer>
  )
}

function ResumoItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={mono ? 'font-mono text-sm' : 'numeric text-sm font-semibold'}>{value}</p>
    </div>
  )
}
