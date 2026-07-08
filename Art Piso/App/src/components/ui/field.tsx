import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Rotulo (uppercase) + controle de formulario empilhados. */
export function Field({
  label,
  children,
  className,
  labelClassName,
  hint,
  optional,
}: {
  label: string
  children: ReactNode
  className?: string
  labelClassName?: string
  /** Texto de apoio abaixo do controle (opcional). */
  hint?: ReactNode
  /** Campo nao obrigatorio: mostra a tag sutil "opcional" ao lado do label (padrao do projeto; nada de "(opcional)" no texto). */
  optional?: boolean
}) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className={cn('text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground', labelClassName)}>
        {label}
        {optional ? (
          <span className="ml-2 font-normal lowercase tracking-normal text-muted-foreground/60">opcional</span>
        ) : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}
