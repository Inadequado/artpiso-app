import { createContext, useContext } from 'react'

/** Termo da busca do topo, compartilhado com a pagina ativa. */
export const SearchContext = createContext<string>('')

/** A pagina ativa le o termo digitado na busca do topo. */
export function useSearchQuery() {
  return useContext(SearchContext)
}
