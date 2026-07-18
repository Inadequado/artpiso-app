import { ArrowRightLeft, PackagePlus, PackageX, PenLine, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MovimentoTipo } from '@/types/inventory'

/** Icone por tipo de operacao de ajuste. Compartilhado entre o "Historico recente" e o drawer completo. */
export const movimentoIcon: Record<MovimentoTipo, LucideIcon> = {
  entrada: PackagePlus,
  perda: TriangleAlert,
  quadra: ArrowRightLeft,
  correcao: PenLine,
  descarte: PackageX,
}

/** Cor (token) por tipo de operacao de ajuste. */
export const movimentoTone: Record<MovimentoTipo, string> = {
  entrada: 'text-success',
  perda: 'text-danger',
  quadra: 'text-primary',
  correcao: 'text-warning',
  descarte: 'text-muted-foreground',
}
