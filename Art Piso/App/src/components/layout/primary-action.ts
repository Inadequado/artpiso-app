import { createContext, useContext, useEffect } from 'react'

/** A pagina ativa registra aqui o que o botao de acao primaria do topo deve abrir. */
export const PrimaryActionContext = createContext<{ current: (() => void) | null }>({ current: null })

/** Registra o handler do botao de acao primaria do topo para a secao ativa. */
export function usePrimaryAction(handler: () => void) {
  const ref = useContext(PrimaryActionContext)
  useEffect(() => {
    ref.current = handler
    return () => {
      ref.current = null
    }
  })
}
