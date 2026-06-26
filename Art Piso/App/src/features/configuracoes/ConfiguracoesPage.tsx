import { Power, PowerOff, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { usuarios as usuariosMock } from '@/data/mock-inventory'
import { useGsapListRefresh } from '@/lib/animations'
import type { Usuario, UserRole } from '@/types/inventory'

const roleLabel: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

const roleOptions = (Object.keys(roleLabel) as UserRole[]).map((role) => ({
  value: role,
  label: roleLabel[role],
}))

const statusLabel: Record<string, string> = {
  ativo: 'Ativo',
  ausente: 'Ausente',
  ocupado: 'Ocupado',
  disponivel: 'Disponível',
  critico: 'Crítico',
  vazio: 'Vazio',
}

export function ConfiguracoesPage() {
  const [listaUsuarios, setListaUsuarios] = useState<Usuario[]>(usuariosMock)
  const [usuarioOpen, setUsuarioOpen] = useState(false)
  const [usuarioEdit, setUsuarioEdit] = useState<Usuario | null>(null)
  const [usuarioExcluir, setUsuarioExcluir] = useState<Usuario | null>(null)
  const usuariosTableRef = useRef<HTMLTableElement>(null)

  const totalAdmins = listaUsuarios.filter((usuario) => usuario.role === 'admin').length
  const ehUltimoAdmin = (usuario: Usuario) => usuario.role === 'admin' && totalAdmins === 1
  // So a membership (ids) entra na chave: toggle de status/role de 1 usuario nao reanima tudo.
  const usuariosAnimacaoKey = listaUsuarios.map((usuario) => usuario.id).join('|')

  useGsapListRefresh(usuariosTableRef, [usuariosAnimacaoKey])

  function abrirNovoUsuario() {
    setUsuarioEdit(null)
    setUsuarioOpen(true)
  }

  function abrirEdicaoUsuario(usuario: Usuario) {
    setUsuarioEdit(usuario)
    setUsuarioOpen(true)
  }

  function alternarStatus(usuario: Usuario) {
    setListaUsuarios((atual) =>
      atual.map((item) =>
        item.id === usuario.id ? { ...item, status: item.status === 'ativo' ? 'ausente' : 'ativo' } : item,
      ),
    )
  }

  function excluirUsuario(usuario: Usuario) {
    setListaUsuarios((atual) => atual.filter((item) => item.id !== usuario.id))
  }

  function salvarUsuario(dados: Omit<Usuario, 'id' | 'status'>) {
    if (usuarioEdit) {
      setListaUsuarios((atual) =>
        atual.map((item) => (item.id === usuarioEdit.id ? { ...item, ...dados } : item)),
      )
    } else {
      setListaUsuarios((atual) => [...atual, { id: crypto.randomUUID(), status: 'ativo', ...dados }])
    }
    setUsuarioOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>Papéis alinhados ao escopo: administrador, vendedor e gerente.</CardDescription>
          </div>
          <Button onClick={abrirNovoUsuario}>Adicionar usuário</Button>
        </CardHeader>
        <CardContent>
          <table ref={usuariosTableRef} className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaUsuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>
                    <strong>{usuario.nome}</strong>
                    <p className="text-sm text-muted-foreground">{usuario.email}</p>
                  </td>
                  <td><Badge variant="reserved">{roleLabel[usuario.role] ?? usuario.role}</Badge></td>
                  <td><Badge variant={usuario.status === 'ativo' ? 'success' : 'default'}>{statusLabel[usuario.status] ?? usuario.status}</Badge></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => abrirEdicaoUsuario(usuario)}>
                        Editar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label={usuario.status === 'ativo' ? `Desativar ${usuario.nome}` : `Ativar ${usuario.nome}`}
                        title={usuario.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'}
                        onClick={() => alternarStatus(usuario)}
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
        key={usuarioEdit?.id ?? 'novo'}
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
          if (usuarioExcluir) excluirUsuario(usuarioExcluir)
        }}
        onClose={() => setUsuarioExcluir(null)}
      />
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
  onSave: (dados: Omit<Usuario, 'id' | 'status'>) => void
}) {
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [role, setRole] = useState<UserRole>(usuario?.role ?? 'vendedor')

  const valido = nome.trim().length > 0 && email.trim().length > 0

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
            onClick={() => onSave({ nome: nome.trim(), email: email.trim(), role })}
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
        <Field label="E-mail">
          <Input type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@artpiso.com.br" />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Papel</span>
          <SelectMenu value={role} onChange={(value) => setRole(value as UserRole)} options={roleOptions} />
        </div>
      </div>
    </Drawer>
  )
}
