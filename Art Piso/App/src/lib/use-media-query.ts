import { useSyncExternalStore } from 'react'

/**
 * Observa uma media query. Existe para o app PARAR DE MONTAR o que a tela nao
 * mostra: `hidden lg:table` esconde no CSS, mas o React reconcilia, o DOM guarda
 * e o Safari ate baixa as imagens. Com 400 produtos isso dobrava o custo de cada
 * render no celular.
 *
 * useSyncExternalStore em vez de useState+useEffect: o valor certo sai ja no
 * primeiro render, sem o flash de montar a versao errada e trocar depois.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notificar) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', notificar)
      return () => mql.removeEventListener('change', notificar)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Breakpoint `lg` do Tailwind: a partir daqui as telas usam tabela, abaixo usam cards. */
export const QUERY_DESKTOP = '(min-width: 1024px)'
