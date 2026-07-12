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
import { useGsapListRefresh } from '@/lib/animations'
import { useInventory, type UsuarioInput } from '@/store/inventory'
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

const statusLabel: Record<Usuario['status'], string> = {
  ativo: 'Ativo',
  ausente: 'Ausente',
}

export function ConfiguracoesPage() {
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
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>
                    <strong>{usuario.nome}</strong>
                    <p className="text-sm text-muted-foreground">{usuario.email}</p>
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
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label={usuario.status === 'ativo' ? `Desativar ${usuario.nome}` : `Ativar ${usuario.nome}`}
                        title={usuario.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'}
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
        ultimoAdmin={Boolean(usuarioEdit && ehUltimoAdmin(usuarioEdit))}
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

function UsuarioDrawer({
  open,
  usuario,
  ultimoAdmin,
  onClose,
  onSave,
}: {
  open: boolean
  usuario: Usuario | null
  /** Editando o unico admin do sistema: papel travado (nao pode ficar sem administrador). */
  ultimoAdmin: boolean
  onClose: () => void
  onSave: (dados: UsuarioInput) => void
}) {
  const { usuarios } = useInventory()
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [role, setRole] = useState<UserRole>(usuario?.role ?? 'vendedor')

  // E-mail e a identidade de login: formato basico + sem duplicar com outro usuario.
  const emailNorm = email.trim().toLowerCase()
  const emailFormatoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)
  const emailDuplicado = emailFormatoOk
    ? usuarios.find((item) => item.id !== usuario?.id && item.email.trim().toLowerCase() === emailNorm)
    : undefined
  const emailMensagem =
    email.trim().length > 0 && !emailFormatoOk
      ? 'Informe um e-mail válido (ex.: nome@artpiso.com.br).'
      : emailDuplicado
        ? `E-mail já usado por ${emailDuplicado.nome}.`
        : undefined

  const valido = nome.trim().length > 0 && emailFormatoOk && !emailDuplicado

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
          {emailMensagem ? (
            <p className="mt-1.5 text-xs font-semibold text-danger">{emailMensagem}</p>
          ) : null}
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Papel</span>
          {ultimoAdmin ? (
            <>
              <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                {roleLabel.admin}
              </div>
              <p className="text-xs text-muted-foreground">
                Único administrador do sistema — cadastre outro admin antes de mudar este papel.
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
