import { createContext, useContext } from 'react'
import type { UserRole } from '@/types/inventory'

/**
 * Sessao do usuario LOGADO (gating de UI por papel, item B1):
 *  - vendedor: somente visualizacao — a UI esconde toda acao de escrita
 *    (o banco ja bloqueia via RLS/RPC; aqui e a experiencia)
 *  - gerente: opera o dia a dia, mas NAO ve Configuracoes (decisao 2026-07-15)
 *  - admin: tudo
 * Modo mock: admin fixo (comportamento original do mock).
 */

export type Sessao = {
  nome: string
  papel: UserRole
  /** Login do usuario (sem o dominio sintetico), ex.: "balcao". */
  usuario: string
  /** Configuracoes e visivel/acessivel so para admin. */
  ehAdmin: boolean
  /** Vendedor e leitura pura: esconde toda acao de escrita. */
  podeEditar: boolean
}

export const papelLabel: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

export function montarSessao(nome: string, papel: UserRole, usuario: string): Sessao {
  return { nome, papel, usuario, ehAdmin: papel === 'admin', podeEditar: papel !== 'vendedor' }
}

export const sessaoMock = montarSessao('Administrador', 'admin', 'admin')

export const SessaoContext = createContext<Sessao>(sessaoMock)

export function useSessao() {
  return useContext(SessaoContext)
}
