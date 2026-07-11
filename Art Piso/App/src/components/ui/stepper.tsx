import { Minus, Plus } from 'lucide-react'

type StepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  label?: string
}

/** Controle numerico +/- reutilizavel (estoque inicial, quantidades de cadastro). */
export function Stepper({ value, onChange, min = 0, label = 'Quantidade' }: StepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-9 items-center justify-center rounded-md border transition-colors hover:bg-muted"
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(Math.max(min, Number(event.target.value) || 0))}
        onFocus={(event) => event.target.select()}
        className="numeric h-9 w-20 rounded-md border bg-background px-2 text-center text-lg font-bold text-primary outline-none transition-colors focus-visible:border-primary/60"
      />
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(value + 1)}
        className="flex size-9 items-center justify-center rounded-md border transition-colors hover:bg-muted"
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
