import { LogOut, Power, PowerOff, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { useGsapListRefresh } from '@/lib/animations'
import { paraEmailLogin, paraUsuarioExibicao } from '@/lib/login'
import { useInventory, type UsuarioInput } from '@/store/inventory'
import type { Usuario, UserRole } from '@/types/inventory'

const roleLabel: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

// Papel admin FORA das opcoes (decisao do usuario, 2026-07-14): admin so e
// concedido direto no banco — o app nunca cria nem promove administradores.
const roleOptions = (['gerente', 'vendedor'] as UserRole[]).map((role) => ({
  value: role,
  label: roleLabel[role],
}))

const statusLabel: Record<Usuario['status'], string> = {
  ativo: 'Ativo',
  ausente: 'Ausente',
}

export function ConfiguracoesPage({ onLogout }: { onLogout?: () => void }) {
  const { usuarios, adicionarUsuario, atualizarUsuario, removerUsuario, alternarStatusUsuario } = useInventory()
  const [usuarioOpen, setUsuarioOpen] = useState(false)
  const [usuarioSeq, setUsuarioSeq] = useState(0)
  const [usuarioEdit, setUsuarioEdit] = useState<Usuario | null>(null)
  const [usuarioExcluir, setUsuarioExcluir] = useState<Usuario | null>(null)
  const usuariosTableRef = useRef<HTMLTableElement>(null)

  const totalAdmins = usuarios.filter((usuario) => usuario.role === 'admin').length
  const ehUltimoAdmin = (usuario: Usuario) => usuario.role === 'admin' && totalAdmins === 1
  // So a membership (ids) entra na chave: toggle de status/role de 1 usuario nao reanima tudo.
  const usuariosAnimacaoKey = usuarios.map((usuario) => usuario.id).join('|')

  useGsapListRefresh(usuariosTableRef, [usuariosAnimacaoKey])

  function abrirNovoUsuario() {
    setUsuarioEdit(null)
    setUsuarioSeq((seq) => seq + 1)
    setUsuarioOpen(true)
  }

  function abrirEdicaoUsuario(usuario: Usuario) {
    setUsuarioEdit(usuario)
    setUsuarioSeq((seq) => seq + 1)
    setUsuarioOpen(true)
  }

  function salvarUsuario(dados: UsuarioInput) {
    if (usuarioEdit) {
      atualizarUsuario(usuarioEdit.id, dados)
    } else {
      adicionarUsuario(dados)
    }
    setUsuarioOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Conta — no mobile o acesso de conta vive aqui; no desktop fica na sidebar. */}
      <Card className="lg:hidden">
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            AP
          </span>
          <div className="min-w-0">
            <CardTitle>Administrador</CardTitle>
            <CardDescription>Gerente geral</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={onLogout}>
            <LogOut aria-hidden="true" data-icon="inline-start" />
            Sair
          </Button>
        </CardContent>
      </Card>

      <Card className="max-lg:border-0 max-lg:bg-transparent">
        <CardHeader className="flex-row items-center justify-between max-lg:px-0">
          <div>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>Papéis alinhados ao escopo: administrador, vendedor e gerente.</CardDescription>
          </div>
          <Button onClick={abrirNovoUsuario}>Adicionar usuário</Button>
        </CardHeader>
        <CardContent className="max-lg:p-0">
          {/* Mobile/tablet: lista de cards (a tabela nao cabe abaixo de lg) */}
          <div className="flex flex-col gap-3 lg:hidden">
            {usuarios.map((usuario) => (
              <UsuarioCard
                key={usuario.id}
                usuario={usuario}
                ultimoAdmin={ehUltimoAdmin(usuario)}
                onEditar={() => abrirEdicaoUsuario(usuario)}
                onToggleStatus={() => alternarStatusUsuario(usuario.id)}
                onExcluir={() => setUsuarioExcluir(usuario)}
              />
            ))}
          </div>

          {/* Desktop: tabela completa */}
          <table ref={usuariosTableRef} className="data-table hidden lg:table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>
                    <strong>{usuario.nome}</strong>
                    <p className="text-sm text-muted-foreground">{paraUsuarioExibicao(usuario.email)}</p>
                  </td>
                  <td><Badge variant="reserved">{roleLabel[usuario.role]}</Badge></td>
                  <td><Badge variant={usuario.status === 'ativo' ? 'success' : 'default'}>{statusLabel[usuario.status]}</Badge></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => abrirEdicaoUsuario(usuario)}>
                        Editar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                        aria-label={usuario.status === 'ativo' ? `Desativar ${usuario.nome}` : `Ativar ${usuario.nome}`}
                        title={
                          usuario.role === 'admin'
                            ? 'Status de administrador é gerenciado direto no banco'
                            : usuario.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'
                        }
                        disabled={usuario.role === 'admin'}
                        onClick={() => alternarStatusUsuario(usuario.id)}
                      >
                        {usuario.status === 'ativo' ? (
                          <PowerOff aria-hidden="true" className="size-4" />
                        ) : (
                          <Power aria-hidden="true" className="size-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-danger disabled:opacity-40"
                        aria-label={`Excluir ${usuario.nome}`}
                        title={ehUltimoAdmin(usuario) ? 'Não é possível excluir o último administrador' : 'Excluir usuário'}
                        disabled={ehUltimoAdmin(usuario)}
                        onClick={() => setUsuarioExcluir(usuario)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <UsuarioDrawer
        key={usuarioSeq}
        open={usuarioOpen}
        usuario={usuarioEdit}
        onClose={() => setUsuarioOpen(false)}
        onSave={salvarUsuario}
      />

      <ConfirmDialog
        open={Boolean(usuarioExcluir)}
        title="Excluir usuário?"
        description={
          usuarioExcluir ? (
            <>
              O usuário <strong className="text-foreground">{usuarioExcluir.nome}</strong> perderá o acesso ao sistema.
              Esta ação não pode ser desfeita.
            </>
          ) : undefined
        }
        confirmLabel="Excluir usuário"
        cancelLabel="Voltar"
        tone="danger"
        onConfirm={() => {
          if (usuarioExcluir) removerUsuario(usuarioExcluir.id)
        }}
        onClose={() => setUsuarioExcluir(null)}
      />
    </div>
  )
}

function UsuarioCard({
  usuario,
  ultimoAdmin,
  onEditar,
  onToggleStatus,
  onExcluir,
}: {
  usuario: Usuario
  ultimoAdmin: boolean
  onEditar: () => void
  onToggleStatus: () => void
  onExcluir: () => void
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block truncate">{usuario.nome}</strong>
          <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="reserved">{roleLabel[usuario.role]}</Badge>
          <Badge variant={usuario.status === 'ativo' ? 'success' : 'default'}>{statusLabel[usuario.status]}</Badge>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t pt-3">
        <Button size="sm" variant="ghost" onClick={onEditar}>
          Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={onToggleStatus}
        >
          {usuario.status === 'ativo' ? (
            <PowerOff aria-hidden="true" data-icon="inline-start" />
          ) : (
            <Power aria-hidden="true" data-icon="inline-start" />
          )}
          {usuario.status === 'ativo' ? 'Desativar' : 'Ativar'}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto size-8 text-muted-foreground hover:text-danger disabled:opacity-40"
          aria-label={`Excluir ${usuario.nome}`}
          title={ultimoAdmin ? 'Não é possível excluir o último administrador' : 'Excluir usuário'}
          disabled={ultimoAdmin}
          onClick={onExcluir}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function UsuarioDrawer({
  open,
  usuario,
  onClose,
  onSave,
}: {
  open: boolean
  usuario: Usuario | null
  onClose: () => void
  onSave: (dados: UsuarioInput) => void
}) {
  const { usuarios } = useInventory()
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [login, setLogin] = useState(usuario ? paraUsuarioExibicao(usuario.email) : '')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<UserRole>(usuario?.role ?? 'vendedor')

  // Login e a identidade: USUARIO simples (sem e-mail) ou e-mail completo, sem duplicar.
  const loginNorm = login.trim().toLowerCase()
  const ehEmail = loginNorm.includes('@')
  const loginFormatoOk = ehEmail
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginNorm)
    : /^[a-z0-9][a-z0-9._-]+$/.test(loginNorm)
  const emailFinal = paraEmailLogin(loginNorm)
  const loginDuplicado = loginFormatoOk
    ? usuarios.find((item) => item.id !== usuario?.id && item.email.trim().toLowerCase() === emailFinal)
    : undefined
  const loginMensagem =
    loginNorm.length > 0 && !loginFormatoOk
      ? ehEmail
        ? 'Informe um e-mail válido (ex.: nome@artpiso.com.br).'
        : 'Use letras minúsculas e números, sem espaços (ex.: balcao).'
      : loginDuplicado
        ? `Login já usado por ${loginDuplicado.nome}.`
        : undefined

  // Senha de login: obrigatoria no cadastro; na edicao so quando quiser redefinir.
  const senhaOk = usuario ? senha === '' || senha.length >= 6 : senha.length >= 6

  const valido = nome.trim().length > 0 && loginFormatoOk && !loginDuplicado && senhaOk

  return (
    <Drawer
      open={open}
      title={usuario ? 'Editar usuário' : 'Adicionar usuário'}
      description="Defina nome, e-mail e papel de acesso."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-[2]"
            disabled={!valido}
            onClick={() => onSave({ nome: nome.trim(), email: emailFinal, role, senha: senha || undefined })}
          >
            {usuario ? 'Salvar alterações' : 'Adicionar usuário'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Field label="Nome">
          <Input name="nome" autoComplete="name" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome completo" />
        </Field>
        <Field label="Usuário (login)">
          <Input type="text" name="login" autoComplete="username" spellCheck={false} value={login} onChange={(event) => setLogin(event.target.value)} placeholder="ex.: balcao" />
          {loginMensagem ? (
            <p className="mt-1.5 text-xs font-semibold text-danger">{loginMensagem}</p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Nome curto para entrar no sistema, sem e-mail — ou um e-mail completo, se preferir.
            </p>
          )}
        </Field>
        <Field label="Senha" optional={Boolean(usuario)}>
          <Input
            type="password"
            name="senha"
            autoComplete="new-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            placeholder={usuario ? 'Deixe em branco para manter a atual' : 'Mínimo 6 caracteres'}
          />
          {senha.length > 0 && senha.length < 6 ? (
            <p className="mt-1.5 text-xs font-semibold text-danger">A senha precisa de pelo menos 6 caracteres.</p>
          ) : usuario ? (
            <p className="mt-1.5 text-xs text-muted-foreground">Preencher redefine a senha de login deste usuário.</p>
          ) : null}
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Papel</span>
          {usuario?.role === 'admin' ? (
            <>
              <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                {roleLabel.admin}
              </div>
              <p className="text-xs text-muted-foreground">
                Papel de administrador é definido direto no banco de dados, não pelo app.
              </p>
            </>
          ) : (
            <SelectMenu value={role} onChange={(value) => setRole(value as UserRole)} options={roleOptions} />
          )}
        </div>
      </div>
    </Drawer>
  )
}
