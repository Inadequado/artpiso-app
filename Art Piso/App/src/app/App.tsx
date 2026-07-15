import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AjustesPage } from '@/features/ajustes/AjustesPage'
import { ClientesPage } from '@/features/clientes/ClientesPage'
import { ConfiguracoesPage } from '@/features/configuracoes/ConfiguracoesPage'
import { EstoquePage } from '@/features/estoque/EstoquePage'
import { ReservasPage } from '@/features/reservas/ReservasPage'
import { AppShell, type AppSection } from '@/components/layout/AppShell'
import { SignInPage } from '@/components/ui/sign-in'
import { InventoryProvider } from '@/store/inventory-provider'
import { NotificationsProvider } from '@/store/notifications-provider'

const titles: Record<AppSection, string> = {
  estoque: 'Estoque',
  reservas: 'Reservas',
  clientes: 'Clientes',
  ajustes: 'Ajustes de Estoque',
  configuracoes: 'Configurações',
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [activeSection, setActiveSection] = useState<AppSection>('estoque')
  const [searchQuery, setSearchQuery] = useState('')

  function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthenticated(true)
  }

  function handleLogout() {
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

  if (!authenticated) {
    return (
      <SignInPage
        description="Gerencie estoque, reservas e ajustes em um só lugar."
        onSignIn={handleSignIn}
      />
    )
  }

  return (
    <NotificationsProvider>
      <InventoryProvider>
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
      </InventoryProvider>
    </NotificationsProvider>
  )
}
