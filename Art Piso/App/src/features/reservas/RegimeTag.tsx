import { Lock, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReservaRegime } from '@/types/inventory'

/** Ausente = 'aguardando' (modelo atual: caixas travadas). */
function resolverRegime(regime?: ReservaRegime): ReservaRegime {
  return regime ?? 'aguardando'
}

const config: Record<ReservaRegime, { label: string; icon: typeof Lock; className: string }> = {
  aguardando: {
    label: 'Aguardando',
    icon: Lock,
    className: 'border-border text-muted-foreground',
  },
  rotacionando: {
    label: 'Rotacionando',
    icon: RotateCw,
    className: 'border-transparent bg-lowstock text-white',
  },
  travado: {
    label: 'Travado',
    icon: Lock,
    className: 'border-[0.5px] border-white bg-black text-white',
  },
}

/**
 * Tag de REGIME da reserva, eixo separado do status de ciclo.
 * Aguardando = caixas travadas para o cliente. Rotacionando = encomenda distante (estoque gira).
 */
export function RegimeTag({ regime, className }: { regime?: ReservaRegime; className?: string }) {
  const { label, icon: Icon, className: tone } = config[resolverRegime(regime)]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold',
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </span>
  )
}
