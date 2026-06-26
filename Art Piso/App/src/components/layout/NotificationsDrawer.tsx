import { notificacaoIcon, notificacaoTone } from '@/components/layout/notification-style'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import type { Notificacao } from '@/store/notifications'

type NotificationsDrawerProps = {
  open: boolean
  notificacoes: Notificacao[]
  onClose: () => void
  onMarcarLida: (id: string) => void
}

/** Historico completo de notificacoes. Aberto pelo "Ver todas" do sino. */
export function NotificationsDrawer({ open, notificacoes, onClose, onMarcarLida }: NotificationsDrawerProps) {
  return (
    <Drawer
      open={open}
      title="Todas as notificações"
      description="Histórico de alertas operacionais."
      onClose={onClose}
      footer={
        <Button variant="outline" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {notificacoes.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {notificacoes.map((notificacao) => {
            const Icon = notificacaoIcon[notificacao.tipo]
            return (
              <li key={notificacao.id}>
                <button
                  type="button"
                  onClick={() => onMarcarLida(notificacao.id)}
                  className={cn(
                    'flex w-full gap-3 rounded-md p-3 text-left transition hover:bg-muted',
                    !notificacao.lida && 'bg-muted/40',
                  )}
                >
                  <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center', notificacaoTone[notificacao.tipo])}>
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{notificacao.titulo}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{notificacao.tempo}</span>
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{notificacao.descricao}</span>
                  </span>
                  {!notificacao.lida ? (
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Drawer>
  )
}
