import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AjustesPage } from '@/features/ajustes/AjustesPage'
import { ClientesPage } from '@/features/clientes/ClientesPage'
import { ConfiguracoesPage } from '@/features/configuracoes/ConfiguracoesPage'
import { EstoquePage } from '@/features/estoque/EstoquePage'
import { ReservasPage } from '@/features/reservas/ReservasPage'
import { AppShell, type AppSection } from '@/components/layout/AppShell'
import { SignInPage } from '@/components/ui/sign-in'
import { paraEmailLogin } from '@/lib/login'
import { dataSource, supabase } from '@/lib/supabase'
import { InventoryProvider } from '@/store/inventory-provider'
import { SupabaseInventoryProvider } from '@/store/supabase-provider'
import { NotificationsProvider } from '@/store/notifications-provider'
import { SupabaseNotificationsProvider } from '@/store/supabase-notifications-provider'

const titles: Record<AppSection, string> = {
  estoque: 'Estoque',
  reservas: 'Reservas',
  clientes: 'Clientes',
  ajustes: 'Ajustes de Estoque',
  configuracoes: 'Configurações',
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(dataSource === 'mock' ? false : null as boolean | null)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<AppSection>('estoque')
  const [searchQuery, setSearchQuery] = useState('')

  // Modo Supabase: sessao persistida (recarregar a pagina nao desloga) + observador de auth.
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      // Modo mock: entra direto (comportamento original, sem auth real)
      setAuthenticated(true)
      return
    }
    const form = new FormData(event.currentTarget)
    // "balcao" vira "balcao@artpiso.local" invisivel; e-mail completo passa direto
    const email = paraEmailLogin(String(form.get('email') ?? ''))
    const password = String(form.get('password') ?? '')
    setAuthError('')
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setAuthLoading(false)
    if (error) {
      setAuthError(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : `Não foi possível entrar: ${error.message}`,
      )
    }
    // Sucesso: o onAuthStateChange acima marca a sessao como autenticada.
  }

  function handleLogout() {
    if (supabase) void supabase.auth.signOut()
    setAuthenticated(false)
    setActiveSection('estoque')
    setSearchQuery('')
  }

  function handleNavigate(section: AppSection) {
    setActiveSection(section)
    setSearchQuery('')
  }

  const page = useMemo(() => {
    switch (activeSection) {
      case 'estoque':
        return <EstoquePage />
      case 'reservas':
        return <ReservasPage />
      case 'clientes':
        return <ClientesPage />
      case 'ajustes':
        return <AjustesPage />
      case 'configuracoes':
        return <ConfiguracoesPage onLogout={handleLogout} />
    }
  }, [activeSection])

  // Modo Supabase: aguardando o getSession inicial (evita piscar a tela de login)
  if (authenticated === null) {
    return <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Carregando…</div>
  }

  if (!authenticated) {
    return (
      <SignInPage
        description="Gerencie estoque, reservas e ajustes em um só lugar."
        onSignIn={handleSignIn}
        errorMessage={authError}
        loading={authLoading}
      />
    )
  }

  const DataProvider = dataSource === 'supabase' ? SupabaseInventoryProvider : InventoryProvider
  const BellProvider = dataSource === 'supabase' ? SupabaseNotificationsProvider : NotificationsProvider

  return (
    <BellProvider>
      <DataProvider>
        <AppShell
          activeSection={activeSection}
          title={titles[activeSection]}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        >
          {page}
        </AppShell>
      </DataProvider>
    </BellProvider>
  )
}
