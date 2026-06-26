import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { gsapEase, prefersReducedMotion, useGsapPresence } from '@/lib/animations'
import { gsap } from 'gsap'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  /** Conteudo extra no corpo (ex.: campo de motivo). Renderizado entre a descricao e os botoes. */
  children?: ReactNode
  onConfirm: () => void
  onClose: () => void
}

/**
 * Modal centralizado de confirmacao, reutilizavel para acoes sensiveis
 * (cancelar reserva, excluir, etc.). Fecha no backdrop, no Esc ou no cancelar.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Voltar',
  tone = 'default',
  children,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const present = useGsapPresence(open, 180)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useLayoutEffect(() => {
    if (!present) return

    const backdrop = backdropRef.current
    const dialog = dialogRef.current

    if (!backdrop || !dialog || prefersReducedMotion()) return

    gsap.killTweensOf([backdrop, dialog])

    const timeline = gsap.timeline()

    if (open) {
      timeline
        .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: gsapEase })
        .fromTo(
          dialog,
          { autoAlpha: 0, y: 8, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.2, ease: gsapEase },
          '<',
        )
    } else {
      timeline
        .to(dialog, { autoAlpha: 0, y: 6, scale: 0.97, duration: 0.14, ease: 'power1.in' })
        .to(backdrop, { autoAlpha: 0, duration: 0.14, ease: 'power1.in' }, '<')
    }

    return () => {
      timeline.kill()
    }
  }, [open, present])

  if (!present) return null

  return (
    <>
      <div ref={backdropRef} className="drawer-backdrop" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 grid place-items-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={dialogRef}
          className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="text-lg font-bold">{title}</h2>
          {description ? <div className="mt-2 text-sm text-muted-foreground">{description}</div> : null}
          {children ? <div className="mt-4">{children}</div> : null}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              variant={tone === 'danger' ? 'danger' : 'default'}
              className="flex-1"
              onClick={() => {
                onConfirm()
                onClose()
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
