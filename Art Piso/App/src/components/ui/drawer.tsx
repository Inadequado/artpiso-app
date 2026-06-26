import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { gsapEase, prefersReducedMotion, useGsapPresence } from '@/lib/animations'
import { gsap } from 'gsap'

type DrawerProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  /** Painel mais largo, para layouts em duas colunas (ex.: detalhe com foto). */
  wide?: boolean
  /** Fecha no Esc. Desligar quando ha um sub-drawer por cima (so o de cima responde ao Esc). */
  closeOnEsc?: boolean
}

export function Drawer({ open, title, description, children, footer, onClose, wide = false, closeOnEsc = true }: DrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const present = useGsapPresence(open, 260)

  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open || !closeOnEsc) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, closeOnEsc])

  useLayoutEffect(() => {
    if (!present) return

    const backdrop = backdropRef.current
    const panel = panelRef.current
    const content = contentRef.current

    if (!backdrop || !panel || !content) return

    if (prefersReducedMotion()) {
      return
    }

    gsap.killTweensOf([backdrop, panel, ...Array.from(content.children)])

    const timeline = gsap.timeline()

    if (open) {
      timeline
        .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: gsapEase })
        .fromTo(panel, { x: '100%' }, { x: '0%', duration: 0.32, ease: 'power3.out' }, '<')
        .fromTo(
          content.children,
          { autoAlpha: 0, x: 12 },
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.22,
            stagger: 0.035,
            ease: gsapEase,
            clearProps: 'opacity,visibility,transform',
          },
          '-=0.12',
        )
    } else {
      timeline
        .to(content.children, { autoAlpha: 0, x: 8, duration: 0.12, ease: 'power1.in', stagger: 0.015 })
        .to(panel, { x: '100%', duration: 0.24, ease: 'power2.in' }, '<')
        .to(backdrop, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, '<')
    }

    return () => {
      timeline.kill()
    }
  }, [open, present])

  if (!present) return null

  return (
    <>
      <div ref={backdropRef} className="drawer-backdrop" onClick={onClose} />
      <aside ref={panelRef} className={`drawer-panel flex flex-col${wide ? ' drawer-panel--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div ref={contentRef} className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-4 border-b p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-pretty">{title}</h2>
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <Button ref={closeRef} variant="ghost" size="icon" onClick={onClose} aria-label="Fechar painel">
              <X aria-hidden="true" data-icon="inline-start" />
            </Button>
          </header>
          <div className="app-scrollbar flex-1 overflow-y-auto overscroll-contain p-6">{children}</div>
          {footer ? <footer className="border-t p-6">{footer}</footer> : null}
        </div>
      </aside>
    </>
  )
}
