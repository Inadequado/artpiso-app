import { ArrowRightLeft, PackagePlus, PenLine, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { Textarea } from '@/components/ui/textarea'
import { caixasDisponiveis, formatM2, maiorAlocacao, quadraLabel, quadraLabelDetalhada } from '@/data/mock-inventory'
import { useInventory } from '@/store/inventory'

export type AjusteTipo = 'entrada' | 'perda' | 'quadra' | 'correcao'

const config: Record<
  AjusteTipo,
  { title: string; description: string; icon: LucideIcon; confirmar: string }
> = {
  entrada: {
    title: 'Adicionar estoque',
    description: 'Entrada de remessa em um lote existente.',
    icon: PackagePlus,
    confirmar: 'Registrar entrada',
  },
  perda: {
    title: 'Registrar perda',
    description: 'Quebra, avaria ou ajuste de perda.',
    icon: TriangleAlert,
    confirmar: 'Registrar perda',
  },
  quadra: {
    title: 'Mover lote de quadra',
    description: 'Escolha o lote e a quadra de destino.',
    icon: ArrowRightLeft,
    confirmar: 'Mover lote',
  },
  correcao: {
    title: 'Corrigir quantidade',
    description: 'Ajuste administrativo do estoque do lote.',
    icon: PenLine,
    confirmar: 'Aplicar correção',
  },
}

type AjusteDrawerProps = {
  tipo: AjusteTipo | null
  onClose: () => void
  /** Apenas sinaliza que a acao foi aplicada (o store ja registrou o movimento). */
  onConfirm: () => void
}

/** Drawer unico para ajustes em lote existente (perda, mudanca de quadra e correcao). */
export function AjusteDrawer({ tipo, onClose, onConfirm }: AjusteDrawerProps) {
  const { lotes, quadras, registrarEntrada, registrarPerda, moverQuadra, corrigirEstoque } = useInventory()
  const [loteId, setLoteId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [pisos, setPisos] = useState('')
  const [motivo, setMotivo] = useState('')
  const [novaQuadra, setNovaQuadra] = useState('')
  // Quadra da operacao (Q1): destino da entrada / alocacao a recontar na correcao.
  const [quadraAlvo, setQuadraAlvo] = useState('')

  const lote = lotes.find((item) => item.id === loteId)
  const cfg = tipo ? config[tipo] : null
  const Icon = cfg?.icon

  // Ao trocar o lote, pre-preenche a quadra da operacao: entrada sugere a maior alocacao;
  // correcao so auto-preenche quando o lote ocupa UMA quadra (com 2+ a escolha e consciente).
  function selecionarLote(id: string) {
    setLoteId(id)
    const escolhido = lotes.find((item) => item.id === id)
    if (tipo === 'entrada') {
      setQuadraAlvo(escolhido ? (maiorAlocacao(escolhido)?.quadra ?? '') : '')
    } else if (tipo === 'correcao') {
      setQuadraAlvo(escolhido && escolhido.alocacoes.length === 1 ? escolhido.alocacoes[0].quadra : '')
    }
  }

  const numero = Number(quantidade)
  const pisosNum = Number(pisos)
  const quantidadeValida = Number.isFinite(numero) && numero > 0
  // Teto plausivel dos pisos danificados: nao cabem mais pisos do que as caixas perdidas contem.
  const pisosMax = lote && quantidadeValida ? numero * lote.pecasPorCaixa : 0
  const pisosExcede = tipo === 'perda' && pisos.trim() !== '' && quantidadeValida && Boolean(lote) && pisosNum > pisosMax
  const pisosValidos = pisos.trim() === '' || (Number.isFinite(pisosNum) && pisosNum >= 0 && !pisosExcede)
  const m2 = lote && quantidadeValida ? numero * lote.m2PorCaixa : 0
  const excedePerda = tipo === 'perda' && lote ? numero > caixasDisponiveis(lote) : false
  // Correcao e POR QUADRA (Q1): o novo total do LOTE = demais alocacoes + novo total da quadra.
  // Comprometido = reserva + perda; o total do lote nao pode ficar abaixo disso (PH-9).
  const alocacaoNaQuadraAlvo = lote && quadraAlvo ? (lote.alocacoes.find((a) => a.quadra === quadraAlvo)?.caixas ?? 0) : 0
  const novoTotalLote = lote ? lote.caixasEstoque - alocacaoNaQuadraAlvo + (Number.isFinite(numero) ? numero : 0) : 0
  const comprometido = lote ? lote.caixasReserva + lote.caixasPerda : 0
  const correcaoAbaixoDoComprometido =
    tipo === 'correcao' && Boolean(lote) && Boolean(quadraAlvo) && Number.isFinite(numero) && numero >= 0 && novoTotalLote < comprometido
  // Mover (M1) leva o lote INTEIRO: destino invalido so quando ele ja esta todo naquela quadra.
  const inteiroNaQuadra = (numeroQuadra: string) =>
    Boolean(lote && lote.alocacoes.length === 1 && lote.alocacoes[0].quadra === numeroQuadra)

  const valido = (() => {
    if (!lote) return false
    if (tipo === 'quadra') return Boolean(novaQuadra) && !inteiroNaQuadra(novaQuadra)
    if (tipo === 'correcao') return Boolean(quadraAlvo) && Number.isFinite(numero) && numero >= 0 && novoTotalLote >= comprometido
    if (tipo === 'entrada') return quantidadeValida && Boolean(quadraAlvo)
    if (tipo === 'perda') return quantidadeValida && !excedePerda && pisosValidos && motivo.trim() !== ''
    return quantidadeValida && !excedePerda
  })()

  function confirmar() {
    if (!lote || !tipo) return
    switch (tipo) {
      case 'entrada':
        registrarEntrada(lote.id, numero, quadraAlvo)
        break
      case 'perda':
        registrarPerda(lote.id, numero, pisos.trim() !== '' && pisosNum > 0 ? pisosNum : 0, motivo.trim())
        break
      case 'quadra':
        moverQuadra(lote.id, novaQuadra)
        break
      case 'correcao':
        corrigirEstoque(lote.id, quadraAlvo, numero)
        break
    }
    onConfirm()
  }

  return (
    <Drawer
      open={Boolean(tipo)}
      title={cfg?.title ?? ''}
      description={cfg?.description}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-[2]" disabled={!valido} onClick={confirmar}>
            {Icon ? <Icon aria-hidden="true" data-icon="inline-start" /> : null}
            {cfg?.confirmar}
          </Button>
        </div>
      }
    >
      {tipo ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Lote</span>
            <SelectMenu
              value={loteId}
              onChange={selecionarLote}
              placeholder="Selecione um lote…"
              options={lotes.map((item) => ({
                value: item.id,
                label: `${item.produto} — ${item.lote} (${quadraLabel(item)})`,
              }))}
            />
          </div>

          {lote ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-bold">{lote.produto}</p>
              <p className="mt-1 text-muted-foreground">
                Estoque atual: <span className="numeric font-semibold text-foreground">{lote.caixasEstoque} cx</span> ·
                Disponível: <span className="numeric font-semibold text-foreground">{caixasDisponiveis(lote)} cx</span>
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Onde está: <span className="font-mono text-foreground">{quadraLabelDetalhada(lote)}</span>
              </p>
            </div>
          ) : null}

          {lote && (tipo === 'entrada' || tipo === 'correcao') ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {tipo === 'entrada' ? 'Quadra de destino' : 'Quadra da contagem'}
              </span>
              <SelectMenu
                value={quadraAlvo}
                onChange={setQuadraAlvo}
                placeholder="Selecione a quadra…"
                options={
                  tipo === 'entrada'
                    ? quadras.map((quadra) => ({ value: quadra.numero, label: `${quadra.numero} — ${quadra.descricao}` }))
                    : (lote.alocacoes.length > 0
                        ? lote.alocacoes.map((alocacao) => ({
                            value: alocacao.quadra,
                            label: `${alocacao.quadra} — ${alocacao.caixas} cx contadas hoje`,
                          }))
                        : quadras.map((quadra) => ({ value: quadra.numero, label: `${quadra.numero} — ${quadra.descricao}` })))
                }
              />
              {tipo === 'entrada' ? (
                <p className="text-xs text-muted-foreground">
                  Pode ser uma quadra nova para o lote — é assim que um lote passa a ocupar mais de uma quadra.
                </p>
              ) : null}
            </div>
          ) : null}

          {tipo === 'quadra' ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Nova quadra</span>
              <SelectMenu
                value={novaQuadra}
                onChange={setNovaQuadra}
                placeholder="Selecione a quadra de destino…"
                options={quadras.map((quadra) => ({
                  value: quadra.numero,
                  label: `${quadra.numero} — ${quadra.descricao}`,
                  disabled: inteiroNaQuadra(quadra.numero),
                }))}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label={tipo === 'correcao' ? 'Novo total na quadra (caixas)' : tipo === 'entrada' ? 'Caixas recebidas' : 'Quantidade (caixas)'}>
                <Input
                  type="number"
                  min={tipo === 'correcao' ? 0 : 1}
                  value={quantidade}
                  placeholder="0"
                  onChange={(event) => setQuantidade(event.target.value)}
                />
              </Field>
              <Field label="Equivale a (m²)">
                <div className="numeric flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                  {formatM2(m2)} m²
                </div>
              </Field>
            </div>
          )}

          {tipo === 'perda' ? (
            <>
              <Field label="Pisos danificados" optional>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={pisosMax > 0 ? pisosMax : undefined}
                  value={pisos}
                  placeholder="0"
                  onChange={(event) => setPisos(event.target.value)}
                />
                {pisosExcede && lote ? (
                  <p className="mt-1.5 text-xs font-semibold text-danger">
                    Máximo plausível: {pisosMax} pisos ({numero} cx × {lote.pecasPorCaixa} pç/caixa).
                  </p>
                ) : lote ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Total de peças quebradas dentro das caixas perdidas, não por caixa. Referência: {lote.pecasPorCaixa} peças por caixa.
                  </p>
                ) : null}
              </Field>
              <Field label="Motivo da perda">
                <Textarea
                  rows={3}
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder="Ex: caixa caiu da empilhadeira durante a descarga…"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Fica registrado no histórico de ajustes, junto de quem registrou e quando.
                </p>
              </Field>
            </>
          ) : null}

          {excedePerda && lote ? (
            <p className="-mt-2 text-xs font-semibold text-danger">
              Perda acima do disponível ({caixasDisponiveis(lote)} cx). Reduza a quantidade.
            </p>
          ) : null}

          {correcaoAbaixoDoComprometido && lote ? (
            <p className="-mt-2 text-xs font-semibold text-danger">
              Com essa contagem o lote ficaria com {novoTotalLote} cx, abaixo do comprometido ({comprometido} cx = {lote.caixasReserva} reservadas + {lote.caixasPerda} perda). Cancele reservas antes de reduzir.
            </p>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  )
}
