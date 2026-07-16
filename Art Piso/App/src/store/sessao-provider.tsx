import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { paraUsuarioExibicao } from '@/lib/login'
import { supabase } from '@/lib/supabase'
import { montarSessao, SessaoContext, sessaoMock, type Sessao } from '@/store/sessao'
import type { UserRole } from '@/types/inventory'

/** Carrega o perfil (nome + papel) do usuario logado; modo mock = admin fixo. */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(supabase ? null : sessaoMock)

  useEffect(() => {
    if (!supabase) return
    let ativo = true
    void (async () => {
      const { data: { user } } = await supabase!.auth.getUser()
      if (!user) return
      const { data: perfil } = await supabase!
        .from('profiles')
        .select('nome, role')
        .eq('id', user.id)
        .maybeSingle()
      if (!ativo) return
      // Perfil ausente (nao deveria acontecer): assume o papel MAIS restrito.
      setSessao(
        perfil
          ? montarSessao(perfil.nome, perfil.role as UserRole)
          : montarSessao(paraUsuarioExibicao(user.email ?? 'usuário'), 'vendedor'),
      )
    })()
    return () => {
      ativo = false
    }
  }, [])

  if (!sessao) {
    return <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Carregando…</div>
  }

  return <SessaoContext.Provider value={sessao}>{children}</SessaoContext.Provider>
}
