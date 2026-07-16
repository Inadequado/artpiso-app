import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppSection } from '@/components/layout/AppShell'

type BottomNavItem = { id: AppSection; label: string; shortLabel?: string; icon: LucideIcon }

type BottomNavProps = {
  items: BottomNavItem[]
  activeSection: AppSection
  onNavigate: (section: AppSection) => void
}

// Navegacao inferior fixa — visivel so no mobile/tablet (< lg). No desktop a
// sidebar assume (ver AppShell). Padding inferior respeita a safe-area do notch.
// Colunas = nº de itens (o menu varia por papel: 5 p/ admin, 4 p/ os demais), entao
// o grid e dinamico para os itens ocuparem a largura toda, sem buraco a direita.
export function BottomNav({ items, activeSection, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      className="fixed inset-x-0 bottom-0 z-40 grid border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon
        const active = activeSection === item.id
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 pb-1.5 pt-2 text-[10px] font-medium leading-none tracking-tight transition-transform active:scale-90',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-[22px] shrink-0" strokeWidth={1.75} />
            <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
            <span
              aria-hidden="true"
              className={cn('h-1 w-1 rounded-full transition-colors', active ? 'bg-primary' : 'bg-transparent')}
            />
          </button>
        )
      })}
    </nav>
  )
}
