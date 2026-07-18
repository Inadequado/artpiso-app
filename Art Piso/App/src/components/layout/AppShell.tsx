import {
  Archive,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarPlus,
  ChevronRight,
  LogOut,
  Plus,
  Printer,
  Search,
  Settings,
  SlidersHorizontal,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/brand/Logo'
import { BottomNav } from '@/components/layout/BottomNav'
import { IosVh } from '@/components/layout/IosVh'
import { NotificationsDrawer } from '@/components/layout/NotificationsDrawer'
import { notificacaoIcon, notificacaoTone } from '@/components/layout/notification-style'
import { PrimaryActionContext } from '@/components/layout/primary-action'
import { PerfilDrawer } from '@/features/perfil/PerfilDrawer'
import { SearchContext } from '@/components/layout/search'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ringBell } from '@/lib/animations'
import { playNotificationSound } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/store/notifications'
import { papelLabel, useSessao } from '@/store/sessao'

export type AppSection = 'estoque' | 'reservas' | 'clientes' | 'ajustes' | 'configuracoes'

type AppShellProps = {
  activeSection: AppSection
  title: string
  children: ReactNode
  searchQuery: string
  onSearchChange: (value: string) => void
  onNavigate: (section: AppSection) => void
  onLogout?: () => void
}

// Acao primaria do topo por secao (contextual). null = secao sem botao no topo.
const sectionAction: Record<AppSection, { label: string; icon: LucideIcon } | null> = {
  estoque: { label: 'Novo produto/lote', icon: Plus },
  reservas: { label: 'Nova Reserva', icon: CalendarPlus },
  clientes: { label: 'Novo cliente', icon: UserPlus },
  ajustes: null,
  configuracoes: null,
}

const navItems: Array<{ id: AppSection; label: string; shortLabel?: string; icon: typeof Archive }> = [
  { id: 'estoque', label: 'Estoque', icon: Archive },
  { id: 'reservas', label: 'Reservas', icon: CalendarCheck },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'ajustes', label: 'Ajustes', icon: SlidersHorizontal },
  { id: 'configuracoes', label: 'Configurações', shortLabel: 'Config', icon: Settings },
]

// `href` abre em nova aba (paginas estaticas servidas de public/, vao junto no deploy).
const accountMenuItems: Array<{ id: string; label: string; description: string; icon: LucideIcon; href?: string }> = [
  {
    id: 'perfil',
    label: 'Perfil',
    description: 'Dados do usuario atual',
    icon: UserRound,
  },
  {
    id: 'guia',
    label: 'Guia de uso',
    description: 'Como usar cada tela do sistema',
    icon: BookOpen,
    href: '/guia.html',
  },
  {
    id: 'planilha',
    label: 'Planilha do depósito',
    description: 'Folha de pico para imprimir',
    icon: Printer,
    href: '/planilha-deposito.html',
  },
  {
    id: 'sair',
    label: 'Sair',
    description: 'Encerrar sessao do sistema',
    icon: LogOut,
  },
]

export function AppShell({
  activeSection,
  title,
  children,
  searchQuery,
  onSearchChange,
  onNavigate,
  onLogout,
}: AppShellProps) {
  const { nome, papel, ehAdmin, podeEditar } = useSessao()
  // Gating por papel (B1): vendedor nao ve acao primaria/FAB; Configuracoes e so do admin
  const primaryAction = podeEditar ? sectionAction[activeSection] : null
  const itensNav = ehAdmin ? navItems : navItems.filter((item) => item.id !== 'configuracoes')
  // Planilha de pico e ferramenta do deposito: vendedor (leitura) nao ve.
  const itensConta = accountMenuItems.filter((item) => item.id !== 'planilha' || podeEditar)
  const primaryActionRef = useRef<(() => void) | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [verTodasOpen, setVerTodasOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLSpanElement>(null)

  const { notificacoes, naoLidas, ringTick, marcarTodasLidas, marcarLida } = useNotifications()
  const ringTickAnterior = useRef(ringTick)

  // Toca o sino (anima + som) quando chega uma nova notificacao. Ignora o mount inicial.
  useEffect(() => {
    if (ringTick === ringTickAnterior.current) return
    ringTickAnterior.current = ringTick
    ringBell(bellRef.current)
    playNotificationSound()
  }, [ringTick])

  function abrirNotificacoes() {
    // Abrir o sino ja marca todas como vistas (comportamento "abriu = viu"): o badge zera
    // e o realce de nao-lida some. Historico continua acessivel em "Ver todas".
    if (!notificationsOpen && naoLidas > 0) marcarTodasLidas()
    setNotificationsOpen((open) => !open)
  }

  useEffect(() => {
    if (!notificationsOpen) return

    function onPointerDown(event: PointerEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [notificationsOpen])

  useEffect(() => {
    if (!accountOpen) return

    function onPointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountOpen])

  return (
    <div className="app-shell dark min-h-[100dvh] bg-background text-foreground lg:flex">
      <IosVh />
      <aside className="relative hidden w-20 shrink-0 lg:block">
        <div className="group absolute inset-y-0 left-0 z-30 flex w-20 flex-col overflow-hidden border-r bg-card transition-[width] duration-200 ease-out hover:w-[264px] focus-within:w-[264px]">
          <div className="flex h-20 shrink-0 items-center gap-3 border-b px-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
              <LogoSymbol className="w-full h-auto" />
            </span>
            <LogoWordmark className="h-5 w-auto shrink-0 text-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100" />
          </div>

          <nav className="flex flex-1 flex-col gap-2 p-4">
            {itensNav.map((item) => {
              const Icon = item.icon
              const active = activeSection === item.id
              return (
                <button
                  key={item.id}
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-muted-foreground transition',
                    active && 'bg-primary text-primary-foreground',
                    !active && 'hover:bg-muted hover:text-foreground',
                  )}
                  type="button"
                  title={item.label}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon aria-hidden="true" className="shrink-0" data-icon="inline-start" />
                  <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>

          <div ref={accountRef} className="relative border-t p-4">
            {accountOpen ? (
              <div className="absolute bottom-20 left-4 z-50 w-[232px] rounded-lg border bg-card shadow-2xl" role="menu">
                <div className="border-b p-4">
                  <p className="text-sm font-bold">{nome}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{papelLabel[papel]}</p>
                </div>
                <div className="flex flex-col p-2">
                  {itensConta.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className="flex items-center gap-3 rounded-md p-3 text-left transition hover:bg-muted"
                        onClick={() => {
                          setAccountOpen(false)
                          if (item.href) window.open(item.href, '_blank', 'noopener')
                          if (item.id === 'sair') onLogout?.()
                          if (item.id === 'perfil') setPerfilOpen(true)
                        }}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                        </span>
                        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors group-hover:bg-muted group-focus-within:bg-muted"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                AP
              </span>
              <span className="min-w-0 whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                <span className="block text-sm font-bold">{nome}</span>
                <span className="block text-xs text-muted-foreground">{papelLabel[papel]}</span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <main className="app-main flex h-[100dvh] min-w-0 flex-1 flex-col lg:h-screen">
        <header className="hidden h-20 shrink-0 items-center justify-between border-b bg-card px-8 lg:flex">
          <div>
            <h1 className="text-2xl font-bold text-pretty">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-[420px]">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                data-icon="inline-start"
              />
              <Input
                type="search"
                name="busca"
                aria-label="Buscar por referência, lote, cliente ou quadra"
                autoComplete="off"
                spellCheck={false}
                className="pl-10"
                placeholder="Buscar por referência, lote, cliente ou quadra…"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
            <div ref={notificationsRef} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações'}
                aria-haspopup="menu"
                aria-expanded={notificationsOpen}
                onClick={abrirNotificacoes}
              >
                <span ref={bellRef} className="inline-flex">
                  <Bell aria-hidden="true" data-icon="inline-start" />
                </span>
                {naoLidas > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                ) : null}
              </Button>

              {notificationsOpen ? (
                <div
                  className="absolute right-0 top-12 z-50 w-[360px] rounded-lg border bg-card shadow-2xl"
                  role="menu"
                >
                  <div className="flex items-start justify-between gap-3 border-b p-4">
                    <div>
                      <h2 className="font-bold">Notificações</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Alertas operacionais do estoque.</p>
                    </div>
                  </div>
                  <div className="flex max-h-80 flex-col overflow-y-auto p-2">
                    {notificacoes.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
                    ) : (
                      notificacoes.map((notificacao) => {
                        const Icon = notificacaoIcon[notificacao.tipo]
                        return (
                          <button
                            key={notificacao.id}
                            type="button"
                            role="menuitem"
                            onClick={() => marcarLida(notificacao.id)}
                            className={cn(
                              'flex gap-3 rounded-md p-3 text-left transition hover:bg-muted',
                              !notificacao.lida && 'bg-muted/40',
                            )}
                          >
                            <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center', notificacaoTone[notificacao.tipo])}>
                              <Icon aria-hidden="true" className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-3">
                                <span className="font-semibold">{notificacao.titulo}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">{notificacao.tempo}</span>
                              </span>
                              <span className="mt-1 block text-sm text-muted-foreground">{notificacao.descricao}</span>
                            </span>
                            {!notificacao.lida ? (
                              <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            ) : null}
                          </button>
                        )
                      })
                    )}
                  </div>
                  <div className="border-t p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false)
                        setVerTodasOpen(true)
                      }}
                      className="w-full rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      Ver todas as notificações
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {primaryAction ? (
              <Button onClick={() => primaryActionRef.current?.()}>
                <primaryAction.icon data-icon="inline-start" />
                {primaryAction.label}
              </Button>
            ) : null}
          </div>
        </header>

        <header className="relative shrink-0 border-b bg-background pt-[max(env(safe-area-inset-top),var(--safe-top-boot,0px))] lg:hidden">
          <div className="flex h-14 items-center justify-between gap-2 px-4">
            <h1 className="min-w-0 truncate text-lg font-bold">{title}</h1>
            <div className="flex items-center gap-1">
              {/* Guia no topo mobile: o menu de conta (desktop) nao existe aqui — e o tablet
                  e justamente onde o guia mais serve (conta compartilhada do vendedor). */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Guia de uso"
                onClick={() => window.open('/guia.html', '_blank', 'noopener')}
              >
                <BookOpen aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={mobileSearchOpen ? 'Fechar busca' : 'Buscar'}
                aria-expanded={mobileSearchOpen}
                onClick={() => setMobileSearchOpen((open) => !open)}
              >
                {mobileSearchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações'}
                onClick={() => {
                  if (naoLidas > 0) marcarTodasLidas()
                  setVerTodasOpen(true)
                }}
              >
                <Bell aria-hidden="true" />
                {naoLidas > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                ) : null}
              </Button>
            </div>
          </div>
          {mobileSearchOpen ? (
            <div className="px-4 pb-3">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-icon="inline-start"
                />
                <Input
                  type="search"
                  name="busca-mobile"
                  aria-label="Buscar por referência, lote, cliente ou quadra"
                  autoComplete="off"
                  spellCheck={false}
                  className="pl-10"
                  placeholder="Buscar…"
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  autoFocus
                />
              </div>
            </div>
          ) : null}
        </header>

        <PrimaryActionContext.Provider value={primaryActionRef}>
          <SearchContext.Provider value={searchQuery}>
            <div className="app-scrollbar flex-1 overflow-y-auto p-4 pb-24 lg:p-8">{children}</div>
          </SearchContext.Provider>
        </PrimaryActionContext.Provider>
      </main>

      {primaryAction ? (
        <button
          type="button"
          aria-label={primaryAction.label}
          onClick={() => primaryActionRef.current?.()}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform active:scale-90 lg:hidden"
        >
          <primaryAction.icon aria-hidden="true" className="size-6" />
        </button>
      ) : null}

      <BottomNav items={itensNav} activeSection={activeSection} onNavigate={onNavigate} />

      <NotificationsDrawer
        open={verTodasOpen}
        notificacoes={notificacoes}
        onClose={() => setVerTodasOpen(false)}
        onMarcarLida={marcarLida}
      />

      <PerfilDrawer open={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </div>
  )
}
