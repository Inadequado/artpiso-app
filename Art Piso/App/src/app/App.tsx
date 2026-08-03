import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { EstoquePage } from '@/features/estoque/EstoquePage'
import { AppShell, type AppSection } from '@/components/layout/AppShell'
import { SplashScreen } from '@/components/layout/SplashScreen'
import { SignInPage } from '@/components/ui/sign-in'
import { paraEmailLogin } from '@/lib/login'
import { dataSource, supabase } from '@/lib/supabase'
import { InventoryProvider } from '@/store/inventory-provider'
import { useSessao } from '@/store/sessao'
import { SessaoProvider } from '@/store/sessao-provider'
import { SupabaseInventoryProvider } from '@/store/supabase-provider'
import { NotificationsProvider } from '@/store/notifications-provider'
import { SupabaseNotificationsProvider } from '@/store/supabase-notifications-provider'

// Code splitting: so o Estoque (secao inicial) entra no chunk de abertura. As
// demais paginas — e os drawers que elas arrastam junto — viram chunks sob
// demanda, tirando parse/compile do caminho critico do celular.
const ReservasPage = lazy(() => import('@/features/reservas/ReservasPage').then((m) => ({ default: m.ReservasPage })))
const ClientesPage = lazy(() => import('@/features/clientes/ClientesPage').then((m) => ({ default: m.ClientesPage })))
const AjustesPage = lazy(() => import('@/features/ajustes/AjustesPage').then((m) => ({ default: m.AjustesPage })))
const ConfiguracoesPage = lazy(() =>
  import('@/features/configuracoes/ConfiguracoesPage').then((m) => ({ default: m.ConfiguracoesPage })),
)

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
  const [showSplash, setShowSplash] = useState(true)

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
  }

  const DataProvider = dataSource === 'supabase' ? SupabaseInventoryProvider : InventoryProvider
  const BellProvider = dataSource === 'supabase' ? SupabaseNotificationsProvider : NotificationsProvider

  return (
    <>
      {showSplash ? <SplashScreen onDone={() => setShowSplash(false)} /> : null}
      {authenticated === null ? (
        // Modo Supabase: aguardando o getSession inicial (a splash cobre este vao)
        <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Carregando…</div>
      ) : authenticated ? (
        <SessaoProvider>
          <BellProvider>
            <DataProvider>
              <AreaLogada onLogout={handleLogout} />
            </DataProvider>
          </BellProvider>
        </SessaoProvider>
      ) : (
        <SignInPage
          description="Gerencie estoque, reservas e ajustes em um só lugar."
          onSignIn={handleSignIn}
          errorMessage={authError}
          loading={authLoading}
        />
      )}
    </>
  )
}

/** Area autenticada: navegacao + guarda de secao por papel (Configuracoes e so do admin). */
function AreaLogada({ onLogout }: { onLogout: () => void }) {
  const { ehAdmin } = useSessao()
  const [activeSection, setActiveSection] = useState<AppSection>('estoque')
  const [searchQuery, setSearchQuery] = useState('')

  // Guarda de rota: papel sem acesso a Configuracoes nunca renderiza a secao
  const section: AppSection = activeSection === 'configuracoes' && !ehAdmin ? 'estoque' : activeSection

  function handleNavigate(proxima: AppSection) {
    if (proxima === 'configuracoes' && !ehAdmin) return
    setActiveSection(proxima)
    setSearchQuery('')
  }

  const page = useMemo(() => {
    switch (section) {
      case 'estoque':
        return <EstoquePage />
      case 'reservas':
        return <ReservasPage />
      case 'clientes':
        return <ClientesPage />
      case 'ajustes':
        return <AjustesPage />
      case 'configuracoes':
        return <ConfiguracoesPage onLogout={onLogout} />
    }
  }, [section, onLogout])

  return (
    <AppShell
      activeSection={section}
      title={titles[section]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onNavigate={handleNavigate}
      onLogout={onLogout}
    >
      <Suspense fallback={<p className="py-12 text-center text-sm text-muted-foreground">Carregando…</p>}>{page}</Suspense>
    </AppShell>
  )
}
