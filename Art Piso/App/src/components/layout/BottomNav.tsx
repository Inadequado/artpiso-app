import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppSection } from '@/components/layout/AppShell'

type BottomNavItem = { id: AppSection; label: string; icon: LucideIcon }

type BottomNavProps = {
  items: BottomNavItem[]
  activeSection: AppSection
  onNavigate: (section: AppSection) => void
}

// Navegacao inferior fixa — visivel so no mobile/tablet (< lg). No desktop a
// sidebar assume (ver AppShell). Padding inferior respeita a safe-area do notch.
export function BottomNav({ items, activeSection, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
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
              'flex min-h-14 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 text-[11px] font-medium transition-transform active:scale-90',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-[22px] shrink-0" strokeWidth={1.75} />
            <span className="truncate">{item.label}</span>
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
