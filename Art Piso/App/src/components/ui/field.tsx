import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Rotulo (uppercase) + controle de formulario empilhados. */
export function Field({
  label,
  children,
  className,
  labelClassName,
  hint,
}: {
  label: string
  children: ReactNode
  className?: string
  labelClassName?: string
  /** Texto de apoio abaixo do controle (opcional). */
  hint?: ReactNode
}) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className={cn('text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground', labelClassName)}>{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}
