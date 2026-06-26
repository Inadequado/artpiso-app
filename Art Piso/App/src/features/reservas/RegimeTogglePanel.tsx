import { LockKeyhole, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type RegimeTogglePanelProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  quantidade: number
  disponivel: number
}

export function RegimeTogglePanel({ checked, onCheckedChange, quantidade, disponivel }: RegimeTogglePanelProps) {
  const quantidadeValida = Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0
  const disponivelSeguro = Math.max(0, disponivel)
  const travadas = checked ? Math.min(quantidadeValida, disponivelSeguro) : 0
  const deficit = checked ? Math.max(0, quantidadeValida - disponivelSeguro) : quantidadeValida
  const Icon = checked ? LockKeyhole : RotateCw

  return (
    <div className="rounded-md border border-lowstock/30 bg-lowstock/5 p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        {checked
          ? 'Entrega distante: as caixas ficam reservadas para este pedido, fora do estoque à venda.'
          : 'Entrega distante: por padrão as caixas não ficam separadas. Ative para separá-las mesmo assim.'}
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon aria-hidden="true" className={cn('size-4 shrink-0', checked ? 'text-success' : 'text-lowstock')} />
          <span className="text-sm font-bold">{checked ? 'Caixas separadas' : 'Reserva em rotação'}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            checked ? 'border-success/50 bg-success/70' : 'border-lowstock/50 bg-lowstock/40',
          )}
          onClick={() => onCheckedChange(!checked)}
        >
          <span
            className={cn(
              'inline-block size-5 rounded-full bg-background shadow transition-transform',
              checked ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>
      <p className="mt-2 text-balance text-xs text-muted-foreground">
        {checked
          ? `${travadas} de ${quantidadeValida} cx separadas agora.`
          : 'Estoque segue à venda; as caixas são separadas perto da entrega.'}
      </p>
      {checked && deficit > 0 ? (
        <p className="mt-1 text-xs font-semibold text-lowstock">
          Faltam {deficit} cx em estoque para separar tudo — reponha antes da entrega.
        </p>
      ) : null}
    </div>
  )
}