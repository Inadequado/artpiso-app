import type { ReservaStatus } from '@/types/inventory'

/** Variantes de `Badge` usadas pelo status da reserva. */
type ReservaBadgeVariant = 'reserved' | 'success' | 'danger' | 'warning' | 'default'

/**
 * Cor do badge por status da reserva. FONTE UNICA — nao redeclarar por tela
 * (antes duplicado em ReservasPage/DetalhesReservaDrawer/EditarPedidoDrawer/ClientesPage).
 */
export const statusVariant: Record<ReservaStatus, ReservaBadgeVariant> = {
  reservado: 'reserved',
  parcial: 'warning',
  entregue: 'success',
  cancelado: 'danger',
  estornado: 'default',
}

/** Rotulo exibido por status da reserva. FONTE UNICA. */
export const statusLabel: Record<ReservaStatus, string> = {
  reservado: 'Reservado',
  parcial: 'Entrega parcial',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
}
