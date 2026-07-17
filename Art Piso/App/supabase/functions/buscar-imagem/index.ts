// ART PISO — Edge Function: baixa a imagem de um LINK de catalogo (Forma B).
// O navegador nao baixa de outro site (CORS); o servidor baixa e devolve os
// bytes (data URL). O client entao recorta/comprime e sobe pro Storage.
// So admin/gerente chama (ambos gerenciam produtos). Guardas anti-SSRF:
// so http/https, sem host interno/privado,
// content-type image/*, tamanho limitado.
// Contrato: POST { url } -> 200 { ok: true, dataUrl } | { ok: false, erro }.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const TIMEOUT_MS = 10_000

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Bloqueia loopback, link-local e faixas privadas (anti-SSRF). */
function ehIpPrivado(ip: string): boolean {
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return false
  if (p[0] === 127 || p[0] === 10 || p[0] === 0) return true
  if (p[0] === 169 && p[1] === 254) return true
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true
  if (p[0] === 192 && p[1] === 168) return true
  return false
}

async function hostSeguro(hostname: string): Promise<boolean> {
  const nome = hostname.toLowerCase()
  if (nome === 'localhost' || nome.endsWith('.local') || nome.endsWith('.internal')) return false
  // Literal de IP: checa direto. Hostname: resolve e checa cada A record.
  if (/^[0-9.]+$/.test(nome) || nome.includes(':')) return !ehIpPrivado(nome)
  try {
    const ips = await Deno.resolveDns(nome, 'A')
    return ips.length > 0 && ips.every((ip) => !ehIpPrivado(ip))
  } catch {
    return false
  }
}

function bytesParaBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supaUrl = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!

    // Quem chama (com o token DELE): precisa estar logado e ser admin.
    const clienteUsuario = createClient(supaUrl, anon, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await clienteUsuario.auth.getUser()
    if (!user) return resposta({ ok: false, erro: 'Não autenticado.' }, 401)
    const { data: perfil } = await clienteUsuario.from('profiles').select('role').eq('id', user.id).single()
    if (perfil?.role !== 'admin' && perfil?.role !== 'gerente') {
      return resposta({ ok: false, erro: 'Apenas administradores ou gerentes podem buscar imagens.' }, 403)
    }

    const { url } = await req.json()
    if (!url || typeof url !== 'string') return resposta({ ok: false, erro: 'Link da imagem é obrigatório.' })

    let alvo: URL
    try {
      alvo = new URL(url)
    } catch {
      return resposta({ ok: false, erro: 'Link inválido.' })
    }
    if (alvo.protocol !== 'http:' && alvo.protocol !== 'https:') {
      return resposta({ ok: false, erro: 'Use um link http ou https.' })
    }
    if (!(await hostSeguro(alvo.hostname))) {
      return resposta({ ok: false, erro: 'Este endereço não é permitido.' })
    }

    const controle = new AbortController()
    const timer = setTimeout(() => controle.abort(), TIMEOUT_MS)
    let remota: Response
    try {
      remota = await fetch(alvo.toString(), { signal: controle.signal, redirect: 'follow' })
    } catch {
      return resposta({ ok: false, erro: 'Não foi possível baixar a imagem.' })
    } finally {
      clearTimeout(timer)
    }
    if (!remota.ok) return resposta({ ok: false, erro: `A imagem respondeu ${remota.status}.` })

    const tipo = remota.headers.get('content-type') ?? ''
    if (!tipo.startsWith('image/')) {
      return resposta({ ok: false, erro: 'O link não aponta para uma imagem.' })
    }

    const bytes = new Uint8Array(await remota.arrayBuffer())
    if (bytes.length === 0) return resposta({ ok: false, erro: 'Imagem vazia.' })
    if (bytes.length > MAX_BYTES) return resposta({ ok: false, erro: 'Imagem muito grande (máx. 8 MB).' })

    const dataUrl = `data:${tipo};base64,${bytesParaBase64(bytes)}`
    return resposta({ ok: true, dataUrl })
  } catch (erro) {
    return resposta({ ok: false, erro: erro instanceof Error ? erro.message : String(erro) }, 500)
  }
})
