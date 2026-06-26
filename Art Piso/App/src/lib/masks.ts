/** Utilitarios de mascara reutilizaveis (aplicar no onChange dos inputs). */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Formata progressivamente como CPF ate 11 digitos e, a partir do 12o,
 * passa sozinho para CNPJ. Auto-deteccao pelo numero de digitos.
 */
export function formatCpfCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    let out = d.slice(0, 3)
    if (d.length > 3) out += `.${d.slice(3, 6)}`
    if (d.length > 6) out += `.${d.slice(6, 9)}`
    if (d.length > 9) out += `-${d.slice(9, 11)}`
    return out
  }
  let out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}`
  if (d.length > 12) out += `-${d.slice(12, 14)}`
  return out
}

/** Formata telefone fixo (00) 0000-0000 ou celular (00) 00000-0000. */
export function formatTelefone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (d.length <= 6) return `(${ddd}) ${resto}`
  if (d.length <= 10) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`
}

/** True quando o documento esta completo: 11 digitos (CPF) ou 14 (CNPJ). */
export function documentoCompleto(value: string): boolean {
  const n = onlyDigits(value).length
  return n === 11 || n === 14
}

/** Valida CPF pelos digitos verificadores (calculo local, sem API). */
export function cpfValido(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // todos iguais (00000000000, ...) passam na conta mas sao invalidos
  const dv = (ate: number) => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}

/** Valida CNPJ pelos digitos verificadores (calculo local, sem API). */
export function cnpjValido(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false
  const dv = (ate: number) => {
    const pesos = ate === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * pesos[i]
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13])
}

/** Valida o documento (CPF ou CNPJ) pelos digitos verificadores. Local, sem API (R-04). */
export function documentoValido(value: string): boolean {
  const n = onlyDigits(value).length
  if (n === 11) return cpfValido(value)
  if (n === 14) return cnpjValido(value)
  return false
}

/** Formata data como DD/MM/AAAA progressivamente (sem date picker nativo). */
export function formatData(value: string): string {
  const d = onlyDigits(value).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}
