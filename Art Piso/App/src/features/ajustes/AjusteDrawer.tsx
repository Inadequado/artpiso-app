import { ArrowRightLeft, PenLine, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { caixasDisponiveis, formatM2 } from '@/data/mock-inventory'
import { useInventory } from '@/store/inventory'
import type { Quadra } from '@/types/inventory'

export type AjusteTipo = 'perda' | 'quadra' | 'correcao'

const config: Record<
  AjusteTipo,
  { title: string; description: string; icon: LucideIcon; confirmar: string }
> = {
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
  quadras: Quadra[]
  onClose: () => void
  /** Apenas sinaliza que a acao foi aplicada (o store ja registrou o movimento). */
  onConfirm: () => void
}

/** Drawer unico para ajustes em lote existente (perda, mudanca de quadra e correcao). */
export function AjusteDrawer({ tipo, quadras, onClose, onConfirm }: AjusteDrawerProps) {
  const { lotes, registrarPerda, moverQuadra, corrigirEstoque } = useInventory()
  const [loteId, setLoteId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [pisos, setPisos] = useState('')
  const [novaQuadra, setNovaQuadra] = useState('')

  const lote = lotes.find((item) => item.id === loteId)
  const cfg = tipo ? config[tipo] : null
  const Icon = cfg?.icon

  const numero = Number(quantidade)
  const pisosNum = Number(pisos)
  const pisosValidos = pisos.trim() === '' || (Number.isFinite(pisosNum) && pisosNum >= 0)
  const quantidadeValida = Number.isFinite(numero) && numero > 0
  const m2 = lote && quantidadeValida ? numero * lote.m2PorCaixa : 0
  const excedePerda = tipo === 'perda' && lote ? numero > caixasDisponiveis(lote) : false
  // Comprometido = reserva + perda. O novo total da correcao nao pode ficar abaixo disso,
  // senao o disponivel (estoque - reserva - perda) ficaria negativo.
  const comprometido = lote ? lote.caixasReserva + lote.caixasPerda : 0
  const correcaoAbaixoDoComprometido =
    tipo === 'correcao' && Boolean(lote) && Number.isFinite(numero) && numero >= 0 && numero < comprometido

  const valido = (() => {
    if (!lote) return false
    if (tipo === 'quadra') return Boolean(novaQuadra) && novaQuadra !== lote.quadra
    if (tipo === 'correcao') return Number.isFinite(numero) && numero >= comprometido
    if (tipo === 'perda') return quantidadeValida && !excedePerda && pisosValidos
    return quantidadeValida && !excedePerda
  })()

  function confirmar() {
    if (!lote || !tipo) return
    switch (tipo) {
      case 'perda':
        registrarPerda(lote.id, numero, pisos.trim() !== '' && pisosNum > 0 ? pisosNum : 0)
        break
      case 'quadra':
        moverQuadra(lote.id, novaQuadra)
        break
      case 'correcao':
        corrigirEstoque(lote.id, numero)
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
              onChange={setLoteId}
              placeholder="Selecione um lote…"
              options={lotes.map((item) => ({
                value: item.id,
                label: `${item.produto} — ${item.lote} (${item.quadra})`,
              }))}
            />
          </div>

          {lote ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-bold">{lote.produto}</p>
              <p className="mt-1 text-muted-foreground">
                Estoque atual: <span className="numeric font-semibold text-foreground">{lote.caixasEstoque} cx</span> ·
                Disponível: <span className="numeric font-semibold text-foreground">{caixasDisponiveis(lote)} cx</span> ·
                Quadra atual: <span className="font-mono text-foreground">{lote.quadra}</span>
              </p>
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
                  disabled: lote ? quadra.numero === lote.quadra : false,
                }))}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label={tipo === 'correcao' ? 'Novo total (caixas)' : 'Quantidade (caixas)'}>
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
            <Field label="Pisos danificados (opcional)">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={pisos}
                placeholder="0"
                onChange={(event) => setPisos(event.target.value)}
              />
              {lote ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Total de peças quebradas dentro das caixas perdidas, não por caixa. Referência: {lote.pecasPorCaixa} peças por caixa.
                </p>
              ) : null}
            </Field>
          ) : null}

          {excedePerda && lote ? (
            <p className="-mt-2 text-xs font-semibold text-danger">
              Perda acima do disponível ({caixasDisponiveis(lote)} cx). Reduza a quantidade.
            </p>
          ) : null}

          {correcaoAbaixoDoComprometido && lote ? (
            <p className="-mt-2 text-xs font-semibold text-danger">
              O total não pode ficar abaixo do comprometido ({comprometido} cx = {lote.caixasReserva} reservadas + {lote.caixasPerda} perda). Cancele reservas antes de reduzir.
            </p>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  )
}
