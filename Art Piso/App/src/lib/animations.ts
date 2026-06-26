import { useEffect, useLayoutEffect, useState } from 'react'
import type { DependencyList, RefObject } from 'react'
import { gsap } from 'gsap'

export const gsapEase = 'power2.out'

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useGsapPresence(open: boolean, exitDurationMs = 180) {
  const [present, setPresent] = useState(open)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPresent(true)
      return
    }

    if (!present) return

    const duration = prefersReducedMotion() ? 0 : exitDurationMs
    const timeout = window.setTimeout(() => {
      setPresent(false)
    }, duration)

    return () => window.clearTimeout(timeout)
  }, [exitDurationMs, open, present])

  return open || present
}

export function useGsapListRefresh(
  ref: RefObject<HTMLElement | null>,
  deps: DependencyList,
  selector = 'tbody tr',
) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || prefersReducedMotion()) return

    const rows = root.querySelectorAll(selector)
    if (rows.length === 0) return

    const tween = gsap.fromTo(
      rows,
      { autoAlpha: 0, y: 8 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        ease: gsapEase,
        stagger: 0.05,
        clearProps: 'opacity,visibility,transform',
      },
    )

    return () => {
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Balanco de sino tocando: oscila a partir do topo e amortece ate parar. */
export function ringBell(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return
  gsap.killTweensOf(el)
  gsap
    .timeline({ defaults: { transformOrigin: 'top center' }, onComplete: () => gsap.set(el, { clearProps: 'transform' }) })
    .set(el, { rotate: 0 })
    .to(el, { rotate: -18, duration: 0.09, ease: 'power2.out' })
    .to(el, { rotate: 14, duration: 0.1, ease: 'power1.inOut' })
    .to(el, { rotate: -10, duration: 0.1, ease: 'power1.inOut' })
    .to(el, { rotate: 6, duration: 0.1, ease: 'power1.inOut' })
    .to(el, { rotate: -3, duration: 0.1, ease: 'power1.inOut' })
    .to(el, { rotate: 0, duration: 0.12, ease: 'power2.out' })
}

export function useGsapPopover(open: boolean, ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const panel = ref.current
    if (!panel || prefersReducedMotion()) return

    const items = panel.querySelectorAll('button, [role="menuitem"], [role="option"]')
    const timeline = gsap.timeline()

    if (open) {
      timeline.fromTo(
        panel,
        { autoAlpha: 0, y: -6, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.18, ease: gsapEase },
      )

      if (items.length > 0) {
        timeline.fromTo(
          items,
          { autoAlpha: 0, y: -3 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.16,
            stagger: 0.018,
            ease: gsapEase,
            clearProps: 'opacity,visibility,transform',
          },
          '-=0.08',
        )
      }
    } else {
      timeline.to(panel, { autoAlpha: 0, y: -4, scale: 0.98, duration: 0.14, ease: 'power1.in' })
    }

    return () => {
      timeline.kill()
    }
  }, [open, ref])
}
