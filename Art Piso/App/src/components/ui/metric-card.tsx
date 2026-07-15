import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type MetricTone = 'default' | 'success' | 'reserved' | 'warning' | 'danger'

const metricTone: Record<MetricTone, { card?: string; gradient: string; icon: string }> = {
  default: { gradient: 'from-muted-foreground/15', icon: 'text-foreground' },
  success: { gradient: 'from-success/20', icon: 'text-success' },
  reserved: { gradient: 'from-reserved/20', icon: 'text-reserved' },
  warning: { gradient: 'from-warning/20', icon: 'text-warning' },
  danger: { card: 'border-danger/40', gradient: 'from-danger/20', icon: 'text-danger' },
}

type MetricCardProps = {
  icon: LucideIcon
  label: string
  value: string
  detail?: string
  tone?: MetricTone
}

/**
 * Card de metrica do painel: painel de icone (1/3) com degrade suave ate
 * transparente a esquerda, e rotulo/valor/detalhe a direita.
 */
export function MetricCard({ icon: Icon, label, value, detail, tone = 'default' }: MetricCardProps) {
  const t = metricTone[tone]
  return (
    <Card className={cn('relative overflow-hidden', t.card)}>
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-r via-transparent to-transparent', t.gradient)} />
      <CardContent className="relative flex items-stretch p-0">
        <div className="flex w-1/4 items-center justify-center sm:w-1/3">
          <Icon aria-hidden="true" className={cn('size-8 sm:size-10', t.icon)} />
        </div>
        <div className="min-w-0 flex-1 p-3 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">{label}</p>
          <p className="mt-2 text-2xl font-black numeric sm:mt-3 sm:text-3xl">{value}</p>
          {detail ? <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
