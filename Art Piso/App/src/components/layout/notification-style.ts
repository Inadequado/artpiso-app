import { Bell, CheckCircle2, PackageX, TriangleAlert, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NotificacaoTipo } from '@/store/notifications'

/** Icone por tipo de notificacao. Compartilhado entre o sino (AppShell) e o drawer "Ver todas". */
export const notificacaoIcon: Record<NotificacaoTipo, LucideIcon> = {
  reserva: CheckCircle2,
  perda: PackageX,
  estoque: TriangleAlert,
  entrega: Truck,
  info: Bell,
}

/** Cor (token) por tipo de notificacao. */
export const notificacaoTone: Record<NotificacaoTipo, string> = {
  reserva: 'text-success',
  perda: 'text-danger',
  estoque: 'text-warning',
  entrega: 'text-primary',
  info: 'text-muted-foreground',
}
