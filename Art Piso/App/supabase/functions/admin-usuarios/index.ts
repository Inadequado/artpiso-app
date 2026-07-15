// ART PISO — Edge Function: gestao de usuarios (criar / atualizar / remover)
// A service_role vive AQUI (injetada pelo Supabase), nunca no frontend.
// So ADMIN passa: a funcao valida o JWT de quem chama e o papel no profiles.
// Contrato: POST { acao: 'criar' | 'atualizar' | 'remover', ... } ->
//           200 { ok: true } | { ok: false, erro } (erros de negocio em 200
//           para a mensagem chegar limpa no app; 401/403 so para auth).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Quem chama (com o token DELE): precisa estar logado e ser admin
    const clienteUsuario = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await clienteUsuario.auth.getUser()
    if (!user) return resposta({ ok: false, erro: 'Não autenticado.' }, 401)
    const { data: perfil } = await clienteUsuario.from('profiles').select('role').eq('id', user.id).single()
    if (perfil?.role !== 'admin') return resposta({ ok: false, erro: 'Apenas administradores gerenciam usuários.' }, 403)

    const admin = createClient(url, service)
    const corpo = await req.json()

    if (corpo.acao === 'criar') {
      const { email, senha, nome, role } = corpo
      if (!email || !senha || String(senha).length < 6) {
        return resposta({ ok: false, erro: 'E-mail e senha (mínimo 6 caracteres) são obrigatórios.' })
      }
      const { data: novo, error } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true, // sem fluxo de confirmacao: o admin cadastrou pessoalmente
        user_metadata: { nome },
      })
      if (error) return resposta({ ok: false, erro: error.message })
      // O trigger handle_new_user criou o profile (papel padrao vendedor); aplica nome/papel escolhidos
      const { error: erroPerfil } = await admin.from('profiles').update({ nome, role }).eq('id', novo.user.id)
      if (erroPerfil) return resposta({ ok: false, erro: erroPerfil.message })
      return resposta({ ok: true })
    }

    if (corpo.acao === 'atualizar') {
      const atributos: Record<string, unknown> = {}
      if (corpo.email) {
        atributos.email = corpo.email
        atributos.email_confirm = true
      }
      if (corpo.senha) atributos.password = corpo.senha
      if (Object.keys(atributos).length > 0) {
        const { error } = await admin.auth.admin.updateUserById(corpo.id, atributos)
        if (error) return resposta({ ok: false, erro: error.message })
        if (corpo.email) {
          // Mantem o espelho de exibicao em profiles sincronizado
          await admin.from('profiles').update({ email: corpo.email }).eq('id', corpo.id)
        }
      }
      return resposta({ ok: true })
    }

    if (corpo.acao === 'remover') {
      if (corpo.id === user.id) {
        return resposta({ ok: false, erro: 'Você não pode remover o próprio usuário logado.' })
      }
      const { error } = await admin.auth.admin.deleteUser(corpo.id) // profiles cai em cascata
      if (error) return resposta({ ok: false, erro: error.message })
      return resposta({ ok: true })
    }

    return resposta({ ok: false, erro: 'Ação desconhecida.' })
  } catch (erro) {
    return resposta({ ok: false, erro: erro instanceof Error ? erro.message : String(erro) }, 500)
  }
})
