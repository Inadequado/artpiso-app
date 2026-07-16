import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { papelLabel, useSessao } from '@/store/sessao'

type PerfilDrawerProps = {
  open: boolean
  onClose: () => void
}

/** Iniciais do nome (ate 2 letras) para o bloco de avatar — espaco da foto no futuro. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/**
 * Perfil do usuario LOGADO: visualizacao (nome, papel, login) e troca da PROPRIA senha.
 * O bloco de senha so aparece com auth real (modo Supabase) e para quem pode editar —
 * vendedor e conta compartilhada de tablet, logo somente leitura tambem aqui.
 */
export function PerfilDrawer({ open, onClose }: PerfilDrawerProps) {
  const { nome, papel, usuario, podeEditar } = useSessao()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const podeTrocarSenha = Boolean(supabase) && podeEditar

  const novaCurta = novaSenha.length > 0 && novaSenha.length < 6
  const naoConfere = confirmar.length > 0 && confirmar !== novaSenha
  const formValido = senhaAtual.length > 0 && novaSenha.length >= 6 && confirmar === novaSenha

  function limpar() {
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmar('')
    setErro('')
    setSucesso('')
  }

  function handleClose() {
    limpar()
    onClose()
  }

  async function trocarSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !formValido) return
    setErro('')
    setSucesso('')
    setSalvando(true)

    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email
    if (!email) {
      setErro('Sessão expirada. Entre novamente.')
      setSalvando(false)
      return
    }

    // Valida a senha atual re-autenticando antes de permitir a troca.
    const { error: authErro } = await supabase.auth.signInWithPassword({ email, password: senhaAtual })
    if (authErro) {
      setErro('Senha atual incorreta.')
      setSalvando(false)
      return
    }

    const { error: updateErro } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvando(false)
    if (updateErro) {
      setErro(`Não foi possível alterar a senha: ${updateErro.message}`)
      return
    }

    setSenhaAtual('')
    setNovaSenha('')
    setConfirmar('')
    setSucesso('Senha alterada com sucesso.')
  }

  return (
    <Drawer open={open} title="Perfil" description="Dados do usuário atual" onClose={handleClose}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
            {iniciais(nome)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{nome}</p>
            <p className="text-sm text-muted-foreground">{papelLabel[papel]}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-t pt-6">
          <DetailItem label="Usuário" value={usuario} />
          <DetailItem label="Papel" value={papelLabel[papel]} />
        </dl>

        {podeTrocarSenha ? (
          <form onSubmit={trocarSenha} className="flex flex-col gap-4 border-t pt-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Trocar senha</h3>

            <Field label="Senha atual">
              <Input
                type="password"
                name="senha-atual"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(event) => setSenhaAtual(event.target.value)}
              />
            </Field>

            <Field label="Nova senha">
              <Input
                type="password"
                name="nova-senha"
                autoComplete="new-password"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
              />
              {novaCurta ? (
                <p className="mt-1.5 text-xs font-semibold text-danger">A senha precisa de pelo menos 6 caracteres.</p>
              ) : null}
            </Field>

            <Field label="Confirmar nova senha">
              <Input
                type="password"
                name="confirmar-senha"
                autoComplete="new-password"
                value={confirmar}
                onChange={(event) => setConfirmar(event.target.value)}
              />
              {naoConfere ? (
                <p className="mt-1.5 text-xs font-semibold text-danger">As senhas não conferem.</p>
              ) : null}
            </Field>

            {erro ? <p className="text-sm font-semibold text-danger">{erro}</p> : null}
            {sucesso ? <p className="text-sm font-semibold text-success">{sucesso}</p> : null}

            <Button type="submit" disabled={!formValido || salvando}>
              {salvando ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        ) : null}
      </div>
    </Drawer>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  )
}
