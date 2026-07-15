import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Splash de abertura: a logo (badge branco) sobre o fundo escuro do app, com
 * fade de saida logo apos o carregamento. Estilo "tela inicial da logo" (como o
 * PWA do pintor). Aparece uma vez por carregamento; some indo pro login/app.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    // Timing deterministico (nao depende do onTransitionEnd): segura ~700ms,
    // faz o fade de 500ms e desmonta.
    const t1 = setTimeout(() => setLeaving(true), 700)
    const t2 = setTimeout(() => doneRef.current(), 1250)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500',
        leaving && 'pointer-events-none opacity-0',
      )}
    >
      <img
        src="/icons/icon-512.png"
        alt="Art Piso"
        className="size-24 rounded-[22px] shadow-2xl"
      />
    </div>
  )
}
