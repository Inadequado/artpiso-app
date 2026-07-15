import { useEffect } from 'react'

// ──────────────────────────────────────────────────────────────────────────
// [FIX iOS PWA] Portado do PWA minas-tintas-pintor (IosVh).
//
// No launch FRIO do PWA standalone no iOS, o viewport (e o 100dvh) nasce
// DEFASADO — a moldura .app-shell (min-height:100dvh) nasce curta e a bottom-nav
// fixa, ancorada nela, nasce "empurrada" com uma faixa embaixo, ate um gesto
// real (rubber-band) reconciliar. Scroll programatico NAO reconcilia.
//
// Aqui a moldura ganha uma regua que nunca mente: --app-vh = screen.height
// (px fisico, correto desde o 1o frame). O CSS usa min-height/height:
// var(--app-vh, 100dvh) SO sob html.ios-standalone — fora do iOS standalone
// nada muda (Android/Safari/desktop seguem no 100dvh).
//
// Gate: navigator.standalone === true so existe no iOS. screen.width/height no
// iOS sao fixos no retrato -> deriva a altura pela orientacao.
// ──────────────────────────────────────────────────────────────────────────
export function IosVh() {
  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean }
    if (nav.standalone !== true) return

    const html = document.documentElement
    html.classList.add('ios-standalone')

    const apply = () => {
      const portrait = window.matchMedia('(orientation: portrait)').matches
      const h = portrait
        ? Math.max(window.screen.width, window.screen.height)
        : Math.min(window.screen.width, window.screen.height)
      html.style.setProperty('--app-vh', `${h}px`)
    }
    apply()
    window.addEventListener('orientationchange', apply)
    return () => window.removeEventListener('orientationchange', apply)
  }, [])

  return null
}
