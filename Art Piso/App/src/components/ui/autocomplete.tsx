import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type AutocompleteOption = {
  value: string
  label: string
  hint?: string
}

type AutocompleteProps = {
  /** Texto livre digitado (campo continua editavel). */
  value: string
  onChange: (text: string) => void
  /** Disparado ao escolher uma sugestao (passa o value da opcao). */
  onSelect: (value: string) => void
  /** Sugestoes ja filtradas pelo pai. */
  options: AutocompleteOption[]
  placeholder?: string
  name?: string
  className?: string
  inputClassName?: string
}

/**
 * Campo de texto com sugestoes (combobox). Mantem digitacao livre e oferece
 * itens existentes para selecao. Visual alinhado ao SelectMenu.
 */
export function Autocomplete({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  name,
  className,
  inputClassName,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<number | null>(null)
  const mostrar = open && options.length > 0

  return (
    <div className={cn('relative', className)}>
      <Input
        name={name}
        className={inputClassName}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrar}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      />
      {mostrar ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 max-h-60 w-full overflow-auto overscroll-contain rounded-lg border bg-card p-1.5 shadow-xl"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={false}
              className="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(option.value)
                setOpen(false)
              }}
            >
              <span className="font-medium text-foreground">{option.label}</span>
              {option.hint ? <span className="text-xs text-muted-foreground">{option.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
