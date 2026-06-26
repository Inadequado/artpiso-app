import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center text-xs font-bold uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'text-muted-foreground',
        success: 'text-success',
        warning: 'text-warning',
        lowStock: 'text-lowstock',
        danger: 'text-danger',
        reserved: 'text-reserved',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}
