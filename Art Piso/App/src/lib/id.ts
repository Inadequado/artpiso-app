/**
 * Gera um UUID em QUALQUER contexto.
 *
 * `crypto.randomUUID` so existe em contexto SEGURO (HTTPS ou localhost). Ao abrir
 * o dev server por IP na rede (ex.: http://192.168.1.5:3005 no celular) o contexto
 * e INSEGURO e `crypto.randomUUID` fica `undefined` — chama-lo lancava erro e
 * derrubava a app inteira (tela preta) no telefone. `crypto.getRandomValues`, por
 * outro lado, existe tambem em contexto inseguro, entao o fallback cobre esse caso.
 */
export function uid(): string {
  const c = globalThis.crypto as Crypto | undefined

  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }

  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40 // versao 4
    b[8] = (b[8] & 0x3f) | 0x80 // variante RFC 4122
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
  }

  // Ultimo recurso (nao-cripto): suficiente para keys de UI no mock.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
