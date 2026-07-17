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

/** True quando a data DD/MM/AAAA existe de verdade no calendario (rejeita 31/02, 00/00...). */
export function dataValida(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 8) return false
  const dia = Number(d.slice(0, 2))
  const mes = Number(d.slice(2, 4))
  const ano = Number(d.slice(4, 8))
  if (mes < 1 || mes > 12 || dia < 1) return false
  const data = new Date(ano, mes - 1, dia)
  // Se o dia "estourou" o mes (ex.: 31/04), o Date normaliza para o mes seguinte; comparamos de volta.
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia
}

/** True quando a data DD/MM/AAAA (valida) esta antes de hoje. Hoje NAO conta como passado. */
export function dataNoPassado(value: string): boolean {
  if (!dataValida(value)) return false
  const d = onlyDigits(value)
  const data = new Date(Number(d.slice(4, 8)), Number(d.slice(2, 4)) - 1, Number(d.slice(0, 2)))
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return data.getTime() < hoje.getTime()
}

/**
 * Mensagem de erro de uma data de ENTREGA digitada (campo opcional). Vazio = sem erro.
 * Cobre incompleta, inexistente (31/02) e no passado. undefined = data ok para salvar.
 */
export function erroDataEntrega(value: string): string | undefined {
  const d = onlyDigits(value)
  if (d.length === 0) return undefined
  if (d.length < 8) return 'Data incompleta.'
  if (!dataValida(value)) return 'Data inexistente. Confira o dia e o mês.'
  if (dataNoPassado(value)) return 'A data não pode estar no passado.'
  return undefined
}

/**
 * Mascara de moeda BRL no modelo "centavos": o usuario digita apenas numeros e eles
 * preenchem da direita para a esquerda. Ex.: "8990" -> "R$ 89,90"; vazio -> "".
 */
export function formatMoeda(value: string | number): string {
  const digitos = typeof value === 'number' ? String(Math.round(value * 100)) : onlyDigits(value)
  if (digitos === '') return ''
  const centavos = Number(digitos)
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** Converte a string mascarada (ou qualquer entrada) em numero. "R$ 89,90" -> 89.9; vazio -> 0. */
export function parseMoeda(value: string): number {
  const digitos = onlyDigits(value)
  return digitos === '' ? 0 : Number(digitos) / 100
}

/**
 * Mascara decimal de 2 casas com PONTO (para campos numericos lidos com Number()):
 * o usuario digita so numeros e o ponto entra sozinho. Ex.: "216" -> "2.16"; vazio -> "".
 */
export function formatDecimalPonto(value: string | number): string {
  const digitos = typeof value === 'number' ? String(Math.round(value * 100)) : onlyDigits(value)
  if (digitos === '') return ''
  return (Number(digitos) / 100).toFixed(2)
}
