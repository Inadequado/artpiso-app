import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { movimentoIcon, movimentoTone } from '@/features/ajustes/movimento-style'
import { cn } from '@/lib/utils'
import type { Movimento } from '@/types/inventory'

type HistoricoDrawerProps = {
  open: boolean
  movimentos: Movimento[]
  onClose: () => void
}

/** Histórico completo de movimentações de estoque (auditoria: tipo, detalhe, quem e quando). */
export function HistoricoDrawer({ open, movimentos, onClose }: HistoricoDrawerProps) {
  return (
    <Drawer
      open={open}
      title="Histórico completo"
      description="Todas as movimentações de estoque registradas."
      onClose={onClose}
      footer={
        <Button variant="outline" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {movimentos.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {movimentos.map((movimento) => {
            const Icon = movimentoIcon[movimento.tipo]
            return (
              <li key={movimento.id} className="flex gap-3 rounded-lg border p-3">
                <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center', movimentoTone[movimento.tipo])}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{movimento.titulo}</p>
                  <p className="text-sm text-muted-foreground">{movimento.detalhe}</p>
                  {movimento.observacao ? (
                    <p className="mt-1 text-sm italic text-muted-foreground">“{movimento.observacao}”</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    por {movimento.usuario} · {movimento.data}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Drawer>
  )
}
