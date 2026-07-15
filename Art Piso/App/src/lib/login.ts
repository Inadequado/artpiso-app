/**
 * Login por USUARIO simples (sem e-mail obrigatorio, decisao do usuario 2026-07-14):
 * o Supabase Auth exige e-mail por baixo, entao "balcao" vira "balcao@artpiso.local"
 * de forma invisivel (cadastro e login). O endereco nunca recebe e-mail — as contas
 * nascem confirmadas e redefinicao de senha e feita pelo admin na tela de usuarios.
 * Quem digitar um e-mail completo (ex.: o admin) continua entrando normalmente.
 */
export const DOMINIO_LOGIN = 'artpiso.local'

/** "balcao" -> "balcao@artpiso.local"; e-mails completos passam intactos. */
export function paraEmailLogin(entrada: string): string {
  const valor = entrada.trim().toLowerCase()
  return valor.includes('@') ? valor : `${valor}@${DOMINIO_LOGIN}`
}

/** Exibicao: esconde o dominio sintetico ("balcao@artpiso.local" -> "balcao"). */
export function paraUsuarioExibicao(email: string): string {
  const sufixo = `@${DOMINIO_LOGIN}`
  return email.toLowerCase().endsWith(sufixo) ? email.slice(0, email.length - sufixo.length) : email
}
