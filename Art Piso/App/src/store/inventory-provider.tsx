import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  clientes as clientesSeed,
  lotes as lotesSeed,
  reservas as reservasSeed,
  quadras,
  agruparPorProduto,
  caixasDisponiveis,
  caixasDisponiveisProduto,
  furoProduto,
  proximoNumeroPedido,
  statusPorDisponivel,
  statusProduto,
} from '@/data/mock-inventory'
import { caixasTravadasReserva, regimePorData } from '@/lib/reserva-regime'
import { useNotifications } from '@/store/notifications'
import {
  InventoryContext,
  type AtualizarLotePatch,
  type AtualizarProdutoPatch,
  type ClienteInput,
  type EditarPedidoInput,
  type EditarReservaInput,
  type EntregarReservaInput,
  type EstornarReservaInput,
  type InventoryContextValue,
  type NovaReservaInput,
  type NovoMovimento,
  type NovoPedidoInput,
} from '@/store/inventory'
import type { Cliente, EstornoReserva, LoteEstoque, Movimento, Reserva, StockStatus } from '@/types/inventory'

// Severidade de estoque para detectar PIORA (ok -> baixo -> esgotado).
const SEVERIDADE_ESTOQUE: Record<StockStatus, number> = {
  disponivel: 0,
  reservado: 0,
  baixo: 1,
  esgotado: 2,
}
// Usuario logado simulado ate o Supabase entrar (vendedor vem do login, nao e digitado).
const USUARIO_ATUAL = 'Victor'

// PLACEHOLDER (ver PH-2 no Memoria.md): perda acumulada por lote que dispara o alerta "Pico de perda".
// Numero a confirmar com o Dev (fixo em cx? % do lote? por lote ou produto?).
const LIMITE_PICO_PERDA_CX = 5

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function dataHoje() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

/** Timestamp do log de movimentacao: "DD mes AAAA · HH:MM". */
function agoraTexto() {
  const d = new Date()
  const data = `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${data} · ${hora}`
}

// Movimentacoes semente: dao corpo ao historico no primeiro load.
// Mais recente no topo (igual ao que o registrarMovimento faz: prepend).
// Espelha os formatos reais dos triggers (perda/quadra/correcao) e bate com
// caixasPerda/pisosDanificados de cada lote para o historico "explicar" o estado atual.
const movimentosSeed: Movimento[] = [
  { id: 'mov-seed-1', tipo: 'correcao', titulo: 'Correção de quantidade', detalhe: 'L-3010 ajustado de 58 para 60 cx', usuario: 'Victor', data: '19 jun 2026 · 16:30' },
  { id: 'mov-seed-2', tipo: 'quadra', titulo: 'Lote movido de quadra', detalhe: 'L-2410: Q-03 → Q-08', usuario: 'Victor', data: '19 jun 2026 · 14:05' },
  { id: 'mov-seed-3', tipo: 'perda', titulo: 'Perda registrada', detalhe: '1 cx em L-3050', usuario: 'Renata Costa', data: '19 jun 2026 · 09:15' },
  { id: 'mov-seed-4', tipo: 'perda', titulo: 'Perda registrada', detalhe: '3 cx em L-2410 · 5 pisos danificados', usuario: 'Renata Costa', data: '18 jun 2026 · 16:20' },
  { id: 'mov-seed-5', tipo: 'perda', titulo: 'Perda registrada', detalhe: '2 cx em L-2405 · 3 pisos danificados', usuario: 'Renata Costa', data: '18 jun 2026 · 10:40' },
  { id: 'mov-seed-6', tipo: 'quadra', titulo: 'Quadra registrada', detalhe: 'Q-08 adicionada ao depósito', usuario: 'Renata Costa', data: '18 jun 2026 · 08:55' },
  { id: 'mov-seed-7', tipo: 'perda', titulo: 'Perda registrada', detalhe: '1 cx em L-3010 · 2 pisos danificados', usuario: 'Renata Costa', data: '17 jun 2026 · 17:40' },
  { id: 'mov-seed-8', tipo: 'quadra', titulo: 'Lote movido de quadra', detalhe: 'L-3040: Q-09 → Q-10', usuario: 'Renata Costa', data: '17 jun 2026 · 11:20' },
  { id: 'mov-seed-9', tipo: 'correcao', titulo: 'Correção de quantidade', detalhe: 'L-3020 ajustado de 36 para 38 cx', usuario: 'Victor', data: '16 jun 2026 · 15:00' },
  { id: 'mov-seed-10', tipo: 'perda', titulo: 'Perda registrada', detalhe: '2 cx em L-3020', usuario: 'Renata Costa', data: '16 jun 2026 · 14:30' },
  { id: 'mov-seed-11', tipo: 'quadra', titulo: 'Quadra registrada', detalhe: 'Q-11 adicionada ao depósito', usuario: 'Victor', data: '16 jun 2026 · 08:10' },
  { id: 'mov-seed-12', tipo: 'perda', titulo: 'Perda registrada', detalhe: '1 cx em L-2391', usuario: 'Renata Costa', data: '15 jun 2026 · 14:00' },
]

/** Soma as caixas em reservas ATIVAS (status reservado) de um lote, por codigo de lote. */
function reservadasDoLote(codigoLote: string, reservas: Reserva[]) {
  return reservas
    .filter((reserva) => reserva.lote === codigoLote && (reserva.status === 'reservado' || reserva.status === 'parcial'))
    .reduce((total, reserva) => total + caixasTravadasReserva(reserva), 0)
}

/**
 * Estado inicial. caixasReserva e DERIVADO das reservas semente (so as ativas),
 * garantindo consistencia desde o inicio: reservas entregues/canceladas nao contam.
 */
function estadoInicial() {
  const reservas = reservasSeed.map((reserva) => ({ ...reserva }))
  const lotes = lotesSeed.map((lote) => ({
    ...lote,
    caixasReserva: reservadasDoLote(lote.lote, reservas),
  }))
  return { lotes, reservas }
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState(estadoInicial)
  const { lotes, reservas } = estado
  const { notificar } = useNotifications()
  const [movimentos, setMovimentos] = useState<Movimento[]>(movimentosSeed)
  const [clientes, setClientes] = useState<Cliente[]>(clientesSeed)

  const adicionarCliente = useCallback((input: ClienteInput): Cliente => {
    const novo: Cliente = {
      id: crypto.randomUUID(),
      nome: input.nome.trim(),
      documento: input.documento.trim(),
      telefone: input.telefone.trim(),
    }
    setClientes((atual) => [novo, ...atual])
    return novo
  }, [])

  const atualizarCliente = useCallback((id: string, input: ClienteInput) => {
    setClientes((atual) =>
      atual.map((cliente) =>
        cliente.id === id
          ? { ...cliente, nome: input.nome.trim(), documento: input.documento.trim(), telefone: input.telefone.trim() }
          : cliente,
      ),
    )
  }, [])

  const removerCliente = useCallback((id: string) => {
    setClientes((atual) => atual.filter((cliente) => cliente.id !== id))
  }, [])

  // Log de movimentacao do estoque (jornada/auditoria). Lado a lado com as acoes, como o notificar.
  const registrarMovimento = useCallback((input: NovoMovimento) => {
    setMovimentos((atual) => [
      { id: crypto.randomUUID(), tipo: input.tipo, titulo: input.titulo, detalhe: input.detalhe, usuario: USUARIO_ATUAL, data: agoraTexto() },
      ...atual,
    ])
  }, [])

  const adicionarLote = useCallback((lote: LoteEstoque) => {
    // Estoque reposto (silencioso): produto que JA EXISTIA e estava a repor (baixo/esgotado)
    // recebe lote novo com disponivel. Produto totalmente novo nao conta como reposicao.
    const lotesDoProduto = lotes.filter((item) => item.produtoId === lote.produtoId)
    const entrando = caixasDisponiveis(lote)
    if (lotesDoProduto.length > 0 && entrando > 0) {
      const disponivelAntes = lotesDoProduto.reduce((total, item) => total + caixasDisponiveis(item), 0)
      const statusAntes = statusPorDisponivel(disponivelAntes)
      if (statusAntes === 'baixo' || statusAntes === 'esgotado') {
        notificar({
          tipo: 'estoque',
          titulo: 'Estoque reposto',
          descricao: `${lote.produto} voltou ao estoque (+${entrando} cx)`,
          silencioso: true,
        })
      }
    }
    setEstado((atual) => ({ ...atual, lotes: [...atual.lotes, lote] }))
  }, [lotes, notificar])

  const removerLote = useCallback((loteId: string) => {
    setEstado((atual) => ({ ...atual, lotes: atual.lotes.filter((item) => item.id !== loteId) }))
  }, [])

  const removerProduto = useCallback((produtoId: string) => {
    setEstado((atual) => ({ ...atual, lotes: atual.lotes.filter((item) => item.produtoId !== produtoId) }))
  }, [])

  const atualizarLote = useCallback((loteId: string, patch: AtualizarLotePatch) => {
    setEstado((atual) => {
      const alvo = atual.lotes.find((item) => item.id === loteId)
      if (!alvo) return atual
      const codigoMudou = patch.lote !== alvo.lote
      return {
        lotes: atual.lotes.map((item) => (item.id === loteId ? { ...item, ...patch } : item)),
        // Renomear o codigo do lote faz cascata no vinculo das reservas (evita orfas).
        reservas: codigoMudou
          ? atual.reservas.map((reserva) =>
              reserva.lote === alvo.lote ? { ...reserva, lote: patch.lote } : reserva,
            )
          : atual.reservas,
      }
    })
  }, [])

  // Campos de produto vivem em cada lote (LoteEstoque); editar produto aplica a todos os lotes do produtoId.
  const atualizarProduto = useCallback((produtoId: string, patch: AtualizarProdutoPatch) => {
    setEstado((atual) => ({
      ...atual,
      lotes: atual.lotes.map((item) => (item.produtoId === produtoId ? { ...item, ...patch } : item)),
    }))
  }, [])

  const criarReserva = useCallback((input: NovaReservaInput) => {
    const loteMsg = lotes.find((item) => item.id === input.loteId)
    if (loteMsg) {
      notificar({
        tipo: 'reserva',
        titulo: 'Reserva criada',
        descricao: `${loteMsg.produto} — ${input.caixas} cx${input.cliente.trim() ? ` para ${input.cliente.trim()}` : ''}`,
      })
    }
    setEstado((atual) => {
      const lote = atual.lotes.find((item) => item.id === input.loteId)
      if (!lote) return atual

      const regime = regimePorData(input.dataPrevista, input.manterReservadoAgora)
      const disponivelAgora = caixasDisponiveis(lote)
      const caixasTravadas = regime === 'rotacionando' ? 0 : Math.min(input.caixas, Math.max(0, disponivelAgora))
      const nova: Reserva = {
        id: crypto.randomUUID(),
        pedido: input.pedido?.trim() ? input.pedido.trim() : proximoNumeroPedido(atual.reservas),
        clienteId: input.clienteId,
        cliente: input.cliente.trim(),
        documento: input.documento?.trim() || undefined,
        telefone: input.telefone?.trim() ?? '',
        produto: lote.produto,
        lote: lote.lote,
        quadra: lote.quadra,
        caixas: input.caixas,
        m2: input.caixas * lote.m2PorCaixa,
        caixasTravadas,
        dataPrevista: input.dataPrevista?.trim() || undefined,
        regime,
        status: 'reservado',
        data: dataHoje(),
        vendedor: USUARIO_ATUAL,
        observacoes: input.observacoes?.trim() || undefined,
      }
      return {
        ...atual,
        reservas: [nova, ...atual.reservas],
        lotes: atual.lotes.map((item) =>
          item.id === lote.id ? { ...item, caixasReserva: item.caixasReserva + caixasTravadas } : item,
        ),
      }
    })
  }, [lotes, notificar])

  // R-07: cria um PEDIDO multi-item. Cliente/data/regime/observacoes valem para o pedido inteiro;
  // cada item de `itens` vira uma reserva (linha) propria, todas com o MESMO PED-XXXX (preserva R-01).
  const criarPedido = useCallback((input: NovoPedidoInput) => {
    const itens = input.itens.filter((item) => item.caixas > 0)
    if (itens.length === 0) return
    setEstado((atual) => {
      const pedido = input.pedido?.trim() ? input.pedido.trim() : proximoNumeroPedido(atual.reservas)
      const regime = regimePorData(input.dataPrevista, input.manterReservadoAgora)
      const dataPrevista = input.dataPrevista?.trim() || undefined
      const observacoes = input.observacoes?.trim() || undefined
      const documento = input.documento?.trim() || undefined
      const telefone = input.telefone?.trim() ?? ''
      const cliente = input.cliente.trim()

      // Acumula as caixas travadas por lote (lotes distintos por item; o Map e so um guard).
      const acumuladoPorLote = new Map<string, number>()
      const novasReservas: Reserva[] = []
      for (const item of itens) {
        const lote = atual.lotes.find((l) => l.id === item.loteId)
        if (!lote) continue
        const jaTravado = acumuladoPorLote.get(lote.id) ?? 0
        const disponivelAgora = Math.max(0, caixasDisponiveis(lote) - jaTravado)
        const caixasTravadas = regime === 'rotacionando' ? 0 : Math.min(item.caixas, disponivelAgora)
        acumuladoPorLote.set(lote.id, jaTravado + caixasTravadas)
        novasReservas.push({
          id: crypto.randomUUID(),
          pedido,
          clienteId: input.clienteId,
          cliente,
          documento,
          telefone,
          produto: lote.produto,
          lote: lote.lote,
          quadra: lote.quadra,
          caixas: item.caixas,
          m2: item.caixas * lote.m2PorCaixa,
          caixasTravadas,
          dataPrevista,
          regime,
          status: 'reservado',
          data: dataHoje(),
          vendedor: USUARIO_ATUAL,
          observacoes,
        })
      }
      if (novasReservas.length === 0) return atual

      return {
        ...atual,
        reservas: [...novasReservas, ...atual.reservas],
        lotes: atual.lotes.map((item) => {
          const add = acumuladoPorLote.get(item.id)
          return add ? { ...item, caixasReserva: item.caixasReserva + add } : item
        }),
      }
    })
    // Notificacao UNICA do pedido (toca o sino 1x, nao 1 por linha).
    const totalCaixas = itens.reduce((total, item) => total + item.caixas, 0)
    const nomeCliente = input.cliente.trim()
    notificar({
      tipo: 'reserva',
      titulo: 'Reserva criada',
      descricao: `${itens.length} ${itens.length === 1 ? 'item' : 'itens'} — ${totalCaixas} cx${nomeCliente ? ` para ${nomeCliente}` : ''}`,
    })
  }, [notificar])

  const editarReserva = useCallback((input: EditarReservaInput) => {
    setEstado((atual) => {
      const reserva = atual.reservas.find((item) => item.id === input.id)
      if (!reserva || (reserva.status !== 'reservado' && reserva.status !== 'parcial')) return atual
      const isParcial = reserva.status === 'parcial'
      // Para parcial: lote e imutavel (entrega ja saiu daquele lote); ignora input.loteId.
      const novoLote = isParcial
        ? atual.lotes.find((item) => item.lote === reserva.lote)
        : atual.lotes.find((item) => item.id === input.loteId)
      if (!novoLote) return atual

      const loteAntigoCodigo = reserva.lote
      const mesmoLote = novoLote.lote === loteAntigoCodigo
      const travadasAntes = caixasTravadasReserva(reserva)
      const regime = regimePorData(input.dataPrevista, input.manterReservadoAgora)
      const disponivelNovoLote = caixasDisponiveis(novoLote) + (mesmoLote ? travadasAntes : 0)
      const caixasTravadas = regime === 'rotacionando' ? 0 : Math.min(input.caixas, Math.max(0, disponivelNovoLote))

      const lotes = atual.lotes.map((item) => {
        if (mesmoLote && item.lote === loteAntigoCodigo) {
          return { ...item, caixasReserva: Math.max(0, item.caixasReserva - travadasAntes + caixasTravadas) }
        }
        if (!mesmoLote && item.lote === loteAntigoCodigo) {
          return { ...item, caixasReserva: Math.max(0, item.caixasReserva - travadasAntes) }
        }
        if (!mesmoLote && item.id === novoLote.id) {
          return { ...item, caixasReserva: item.caixasReserva + caixasTravadas }
        }
        return item
      })

      const reservas = atual.reservas.map((item) => {
        if (item.id !== input.id) return item
        const base = {
          ...item,
          caixas: input.caixas,
          m2: input.caixas * novoLote.m2PorCaixa,
          caixasTravadas,
          dataPrevista: input.dataPrevista?.trim() || undefined,
          regime,
          observacoes: input.observacoes?.trim() || undefined,
        }
        // Para parcial: lote, produto, quadra e cliente sao imutaveis.
        if (isParcial) return base
        return {
          ...base,
          clienteId: input.clienteId,
          cliente: input.cliente.trim(),
          documento: input.documento?.trim() || undefined,
          telefone: input.telefone?.trim() ?? item.telefone,
          produto: novoLote.produto,
          lote: novoLote.lote,
          quadra: novoLote.quadra,
        }
      })

      return { lotes, reservas }
    })
  }, [])

  // R-07: edita um PEDIDO inteiro de uma vez. So mexe nas linhas RESERVADAS (parciais/entregues
  // ficam intocadas). caixasReserva dos lotes e RECOMPUTADO da lista final (fonte unica), evitando
  // bookkeeping de deltas. Remover linha = cancelar (deixa rastro).
  const editarPedido = useCallback((input: EditarPedidoInput) => {
    setEstado((atual) => {
      const pedidoOriginal = input.pedidoOriginal
      const regime = regimePorData(input.dataPrevista, input.manterReservadoAgora)
      const dataPrevista = input.dataPrevista?.trim() || undefined
      const observacoes = input.observacoes?.trim() || undefined
      const documento = input.documento?.trim() || undefined
      const telefone = input.telefone?.trim() ?? ''
      const cliente = input.cliente.trim()
      const clienteId = input.clienteId
      const itensPorId = new Map(
        input.itens.filter((item) => item.reservaId).map((item) => [item.reservaId as string, item]),
      )

      const reservas: Reserva[] = []
      for (const reserva of atual.reservas) {
        if (reserva.pedido !== pedidoOriginal || reserva.status !== 'reservado') {
          reservas.push(reserva) // outro pedido OU linha travada (parcial/entregue/cancelada)
          continue
        }
        const item = itensPorId.get(reserva.id)
        if (!item) {
          reservas.push({ ...reserva, status: 'cancelado', caixasTravadas: 0, motivoCancelamento: 'Removido na edição do pedido' })
          continue
        }
        const lote = atual.lotes.find((l) => l.lote === reserva.lote)
        const m2PorCaixa = lote?.m2PorCaixa ?? 0
        reservas.push({
          ...reserva,
          clienteId,
          cliente,
          documento,
          telefone,
          caixas: item.caixas,
          m2: item.caixas * m2PorCaixa,
          caixasTravadas: regime === 'rotacionando' ? 0 : item.caixas,
          dataPrevista,
          regime,
          observacoes,
        })
      }
      // Itens novos (sem reservaId) -> novas reservas no mesmo PED.
      for (const item of input.itens.filter((item) => !item.reservaId)) {
        const lote = atual.lotes.find((l) => l.id === item.loteId)
        if (!lote) continue
        reservas.push({
          id: crypto.randomUUID(),
          pedido: pedidoOriginal,
          clienteId,
          cliente,
          documento,
          telefone,
          produto: lote.produto,
          lote: lote.lote,
          quadra: lote.quadra,
          caixas: item.caixas,
          m2: item.caixas * lote.m2PorCaixa,
          caixasTravadas: regime === 'rotacionando' ? 0 : item.caixas,
          dataPrevista,
          regime,
          status: 'reservado',
          data: dataHoje(),
          vendedor: USUARIO_ATUAL,
          observacoes,
        })
      }
      const lotes = atual.lotes.map((lote) => ({ ...lote, caixasReserva: reservadasDoLote(lote.lote, reservas) }))
      return { ...atual, reservas, lotes }
    })
  }, [])

  const cancelarReserva = useCallback((id: string, motivo?: string) => {
    setEstado((atual) => {
      const reserva = atual.reservas.find((item) => item.id === id)
      if (!reserva || (reserva.status !== 'reservado' && reserva.status !== 'parcial')) return atual
      const travadas = caixasTravadasReserva(reserva)
      return {
        reservas: atual.reservas.map((item) =>
          item.id === id
            ? { ...item, status: 'cancelado', caixasTravadas: 0, motivoCancelamento: motivo?.trim() || undefined }
            : item,
        ),
        // Cancelar devolve as caixas travadas ao disponivel (reduz a reserva do lote).
        lotes: atual.lotes.map((item) =>
          item.lote === reserva.lote
            ? { ...item, caixasReserva: Math.max(0, item.caixasReserva - travadas) }
            : item,
        ),
      }
    })
  }, [])

  const entregarReserva = useCallback((input: EntregarReservaInput) => {
    const reservaAtual = reservas.find((item) => item.id === input.id)
    if (reservaAtual && (reservaAtual.status === 'reservado' || reservaAtual.status === 'parcial')) {
      const entregues = Math.min(reservaAtual.caixas, Math.max(1, input.caixas))
      const total = entregues >= reservaAtual.caixas
      notificar({
        tipo: 'entrega',
        titulo: total ? 'Entrega concluída' : 'Entrega parcial',
        descricao: `${reservaAtual.produto} — ${entregues} cx (${reservaAtual.pedido})`,
      })
    }
    setEstado((atual) => {
      const reserva = atual.reservas.find((item) => item.id === input.id)
      if (!reserva || (reserva.status !== 'reservado' && reserva.status !== 'parcial')) return atual
      const entregues = Math.min(reserva.caixas, Math.max(1, input.caixas))
      const travadasAntes = caixasTravadasReserva(reserva)
      const travadasEntregues = Math.min(entregues, travadasAntes)
      const travadasRestantes = Math.max(0, travadasAntes - travadasEntregues)
      const restante = reserva.caixas - entregues
      // Rotacionando pode trocar de lote na entrega; lote alternativo vem do input.
      const loteParaEntrega = input.loteId
        ? atual.lotes.find((item) => item.id === input.loteId)
        : atual.lotes.find((item) => item.lote === reserva.lote)
      const m2PorCaixa = loteParaEntrega?.m2PorCaixa ?? 0
      const entrega = {
        id: crypto.randomUUID(),
        data: agoraTexto(),
        responsavel: input.responsavel.trim(),
        caixas: entregues,
        lote: loteParaEntrega?.lote,
        observacoes: input.observacoes?.trim() || undefined,
      }
      return {
        reservas: atual.reservas.map((item) =>
          item.id === input.id
            ? {
                ...item,
                caixas: restante,
                m2: restante * m2PorCaixa,
                caixasEntregues: (item.caixasEntregues ?? 0) + entregues,
                caixasTravadas: restante <= 0 ? 0 : travadasRestantes,
                entregas: [...(item.entregas ?? []), entrega],
                status: restante <= 0 ? 'entregue' : 'parcial',
                // Se trocou de lote (rotacionando): vincula a reserva ao lote real da entrega.
                lote: loteParaEntrega?.lote ?? item.lote,
                quadra: loteParaEntrega?.quadra ?? item.quadra,
              }
            : item,
        ),
        // Baixa por entrega: sai do estoque fisico e deixa de ser reserva (so o que foi entregue).
        lotes: atual.lotes.map((item) =>
          item.lote === (loteParaEntrega?.lote ?? reserva.lote)
            ? {
                ...item,
                caixasReserva: Math.max(0, item.caixasReserva - travadasEntregues),
                caixasEstoque: Math.max(0, item.caixasEstoque - entregues),
              }
            : item,
        ),
      }
    })
  }, [reservas, notificar])

  const estornarReserva = useCallback((input: EstornarReservaInput) => {
    const reservaAtual = reservas.find((r) => r.id === input.id)
    if (reservaAtual?.status === 'entregue') {
      notificar({
        tipo: 'entrega',
        titulo: 'Devolução registrada',
        descricao: `${reservaAtual.produto} — ${input.caixas} cx devolvidas (${reservaAtual.pedido})`,
      })
    }
    setEstado((atual) => {
      const reserva = atual.reservas.find((r) => r.id === input.id)
      if (!reserva || reserva.status !== 'entregue') return atual
      const quadraDestino = quadras.find((q) => q.id === input.quadraId)
      const quadraNumero = quadraDestino?.numero ?? input.quadraId
      const estorno: EstornoReserva = {
        id: crypto.randomUUID(),
        data: agoraTexto(),
        responsavel: USUARIO_ATUAL,
        caixas: input.caixas,
        quadraDestino: quadraNumero,
        motivo: input.motivo,
      }
      return {
        ...atual,
        reservas: atual.reservas.map((r) =>
          r.id === input.id
            ? { ...r, status: 'estornado', estornos: [...(r.estornos ?? []), estorno] }
            : r,
        ),
        lotes: atual.lotes.map((l) =>
          l.lote === reserva.lote
            ? { ...l, caixasEstoque: l.caixasEstoque + input.caixas }
            : l,
        ),
      }
    })
  }, [reservas, notificar])

  const registrarPerda = useCallback((loteId: string, caixas: number, pisos: number) => {
    const lote = lotes.find((item) => item.id === loteId)
    if (lote) {
      notificar({
        tipo: 'perda',
        titulo: 'Perda registrada',
        descricao: `${caixas} cx em ${lote.lote}${pisos > 0 ? ` · ${pisos} piso${pisos === 1 ? '' : 's'} danificado${pisos === 1 ? '' : 's'}` : ''}`,
      })
      registrarMovimento({
        tipo: 'perda',
        titulo: 'Perda registrada',
        detalhe: `${caixas} cx em ${lote.lote}${pisos > 0 ? ` · ${pisos} piso${pisos === 1 ? '' : 's'} danificado${pisos === 1 ? '' : 's'}` : ''}`,
      })
      // Pico de perda (silencioso): so quando a perda ACUMULADA do lote cruza o limite (1x, sem repetir).
      const perdaAntes = lote.caixasPerda
      const perdaDepois = perdaAntes + caixas
      if (perdaAntes < LIMITE_PICO_PERDA_CX && perdaDepois >= LIMITE_PICO_PERDA_CX) {
        notificar({
          tipo: 'perda',
          titulo: 'Pico de perda',
          descricao: `${lote.produto} — lote ${lote.lote} acumulou ${perdaDepois} cx de perda`,
          silencioso: true,
        })
      }
    }
    setEstado((atual) => ({
      ...atual,
      lotes: atual.lotes.map((item) =>
        item.id === loteId
          ? {
              ...item,
              caixasPerda: item.caixasPerda + caixas,
              pisosDanificados: (item.pisosDanificados ?? 0) + pisos,
            }
          : item,
      ),
    }))
  }, [lotes, notificar, registrarMovimento])

  const moverQuadra = useCallback((loteId: string, novaQuadra: string) => {
    const loteMov = lotes.find((item) => item.id === loteId)
    if (loteMov) {
      registrarMovimento({
        tipo: 'quadra',
        titulo: 'Lote movido de quadra',
        detalhe: `${loteMov.lote}: ${loteMov.quadra} → ${novaQuadra}`,
      })
    }
    setEstado((atual) => {
      const alvo = atual.lotes.find((item) => item.id === loteId)
      return {
        lotes: atual.lotes.map((item) => (item.id === loteId ? { ...item, quadra: novaQuadra } : item)),
        // Snapshot: reservas ATIVAS do lote acompanham a nova quadra; historicas (entregue/cancelado)
        // mantem a quadra antiga (registro do que foi de fato combinado na epoca).
        reservas: alvo
          ? atual.reservas.map((reserva) =>
              reserva.lote === alvo.lote && (reserva.status === 'reservado' || reserva.status === 'parcial')
                ? { ...reserva, quadra: novaQuadra }
                : reserva,
            )
          : atual.reservas,
      }
    })
  }, [lotes, registrarMovimento])

  const corrigirEstoque = useCallback((loteId: string, novoTotal: number) => {
    const loteCorr = lotes.find((item) => item.id === loteId)
    if (loteCorr) {
      registrarMovimento({
        tipo: 'correcao',
        titulo: 'Correção de quantidade',
        detalhe: `${loteCorr.lote} ajustado de ${loteCorr.caixasEstoque} para ${novoTotal} cx`,
      })
    }
    setEstado((atual) => ({
      ...atual,
      lotes: atual.lotes.map((item) => (item.id === loteId ? { ...item, caixasEstoque: novoTotal } : item)),
    }))
  }, [lotes, registrarMovimento])

  // Alerta de estoque baixo/esgotado: dispara SO na virada (quando o produto PIORA de nivel),
  // nunca repete enquanto continua baixo. Ignora o load inicial. Cobre todas as acoes (reserva,
  // entrega, perda, correcao, edicao) de forma unificada, por observar o estado resultante.
  const statusProdutoAnterior = useRef<Map<string, StockStatus> | null>(null)
  useEffect(() => {
    const produtos = agruparPorProduto(lotes)
    const atual = new Map(produtos.map((produto) => [produto.id, statusProduto(produto)]))
    const anterior = statusProdutoAnterior.current
    statusProdutoAnterior.current = atual
    if (anterior === null) return
    for (const produto of produtos) {
      const depois = atual.get(produto.id)
      const antes = anterior.get(produto.id)
      if (!depois || antes === undefined) continue
      if (SEVERIDADE_ESTOQUE[depois] > SEVERIDADE_ESTOQUE[antes] && (depois === 'baixo' || depois === 'esgotado')) {
        notificar({
          tipo: 'estoque',
          titulo: depois === 'esgotado' ? 'Produto esgotado' : 'Estoque baixo',
          descricao: `${produto.produto} — ${caixasDisponiveisProduto(produto)} cx disponíveis`,
        })
      }
    }
  }, [lotes, notificar])

  // Anti-furo (E-05, parte REATIVA): a promessa (pedidos ativos) nao pode passar do estoque fisico.
  // Dispara na VIRADA, observando o estado resultante de qualquer acao (perda, correcao, entrega,
  // reserva, reposicao). Entra em furo -> alerta forte; sai do furo -> "da pra separar". Estado atual,
  // sem depender do prazo de reposicao (N-03). A antecedencia ("vai faltar em N dias") fica no E-03.
  const furoProdutoAnterior = useRef<Map<string, number> | null>(null)
  useEffect(() => {
    const produtos = agruparPorProduto(lotes)
    const atual = new Map(produtos.map((produto) => [produto.id, furoProduto(produto, reservas)]))
    const anterior = furoProdutoAnterior.current
    furoProdutoAnterior.current = atual
    if (anterior === null) return
    for (const produto of produtos) {
      const depois = atual.get(produto.id) ?? 0
      const antes = anterior.get(produto.id) ?? 0
      if (antes === 0 && depois > 0) {
        notificar({
          tipo: 'estoque',
          titulo: 'Promessa em risco',
          descricao: `${produto.produto} — faltam ${depois} cx para cobrir os pedidos`,
        })
      } else if (antes > 0 && depois === 0) {
        notificar({
          tipo: 'estoque',
          titulo: 'Estoque cobre os pedidos',
          descricao: `${produto.produto} — a reposição cobriu o que faltava; dá pra separar os pedidos`,
        })
      }
    }
  }, [lotes, reservas, notificar])

  const value = useMemo<InventoryContextValue>(
    () => ({
      lotes,
      reservas,
      clientes,
      movimentos,
      registrarMovimento,
      adicionarCliente,
      atualizarCliente,
      removerCliente,
      adicionarLote,
      removerLote,
      removerProduto,
      atualizarLote,
      atualizarProduto,
      criarReserva,
      criarPedido,
      editarReserva,
      editarPedido,
      cancelarReserva,
      entregarReserva,
      estornarReserva,
      registrarPerda,
      moverQuadra,
      corrigirEstoque,
    }),
    [
      lotes,
      reservas,
      clientes,
      movimentos,
      registrarMovimento,
      adicionarCliente,
      atualizarCliente,
      removerCliente,
      adicionarLote,
      removerLote,
      removerProduto,
      atualizarLote,
      atualizarProduto,
      criarReserva,
      criarPedido,
      editarReserva,
      editarPedido,
      cancelarReserva,
      entregarReserva,
      estornarReserva,
      registrarPerda,
      moverQuadra,
      corrigirEstoque,
    ],
  )

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}
