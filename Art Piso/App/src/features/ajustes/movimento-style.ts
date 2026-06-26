import { ArrowRightLeft, PenLine, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MovimentoTipo } from '@/types/inventory'

/** Icone por tipo de operacao de ajuste. Compartilhado entre o "Historico recente" e o drawer completo. */
export const movimentoIcon: Record<MovimentoTipo, LucideIcon> = {
  perda: TriangleAlert,
  quadra: ArrowRightLeft,
  correcao: PenLine,
}

/** Cor (token) por tipo de operacao de ajuste. */
export const movimentoTone: Record<MovimentoTipo, string> = {
  perda: 'text-danger',
  quadra: 'text-primary',
  correcao: 'text-warning',
}
