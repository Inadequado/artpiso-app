import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useGsapPopover, useGsapPresence } from '@/lib/animations'
import { cn } from '@/lib/utils'

export type SelectMenuOption = {
  value: string
  label: string
  disabled?: boolean
}

type SelectMenuProps = {
  value: string
  onChange: (value: string) => void
  options: SelectMenuOption[]
  placeholder?: string
  className?: string
}

/**
 * Dropdown customizado no estilo do filtro de Vendedor: trigger com chevron,
 * painel arredondado com borda/sombra e opcao selecionada destacada com dot.
 * Substitui o <select> nativo mantendo o visual do design system.
 */
export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = 'Selecione…',
  className,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)
  const present = useGsapPresence(open, 160)

  useGsapPopover(open, listRef)

  useEffect(() => {
    if (!open) return
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Move o foco para a opcao selecionada (ou a primeira) ao abrir.
  useEffect(() => {
    if (!open) return
    const itens = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)')
    if (!itens || itens.length === 0) return
    const ativo = Array.from(itens).find((item) => item.dataset.value === value)
    ;(ativo ?? itens[0]).focus()
  }, [open, value])

  function moverFoco(atual: HTMLElement, direcao: 1 | -1) {
    const itens = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? [],
    )
    const indice = itens.indexOf(atual as HTMLButtonElement)
    const proximo = itens[indice + direcao]
    if (proximo) proximo.focus()
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-card px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {present ? (
        <div
          ref={listRef}
          role="listbox"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              moverFoco(event.target as HTMLElement, 1)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              moverFoco(event.target as HTMLElement, -1)
            }
          }}
          className="absolute left-0 top-full z-30 mt-2 max-h-72 w-full overflow-auto overscroll-contain rounded-lg border bg-card p-1.5 shadow-xl"
        >
          {options.map((option) => {
            const active = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                data-value={option.value}
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  option.disabled
                    ? 'cursor-not-allowed text-muted-foreground/45'
                    : active
                      ? 'bg-primary/15 font-semibold text-primary'
                      : 'text-foreground hover:bg-muted',
                )}
              >
                <span className="truncate">{option.label}</span>
                {active ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
