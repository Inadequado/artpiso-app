import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { proximoNumeroPedido } from '@/data/mock-inventory'
import { persistirFotoProduto } from '@/lib/foto-produto'
import { uid } from '@/lib/id'
import { parseDataPrevista, regimePorData } from '@/lib/reserva-regime'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/store/notifications'
import {
  InventoryContext,
  type ClienteInput,
  type EditarPedidoInput,
  type EditarReservaInput,
  type EntregarReservaInput,
  type EstornarReservaInput,
  type InventoryContextValue,
  type NovaReservaInput,
  type NovoPedidoInput,
  type QuadraInput,
} from '@/store/inventory'
import type {
  AlocacaoQuadra,
  Cliente,
  LoteEstoque,
  Movimento,
  MovimentoTipo,
  Quadra,
  Reserva,
  Usuario,
} from '@/types/inventory'

/**
 * Provider REAL (Fase 2): mesmo contrato do InventoryContext, dados do Supabase.
 * As telas nao sabem a diferenca — quem escolhe entre este e o mock e a flag
 * VITE_DATA_SOURCE (App.tsx).
 *
 * FATIA 1 (catalogo + clientes): leitura de estoque/quadras/usuarios/clientes/
 * historico; ajustes de estoque e cadastros via RPC/tabela.
 * FATIA 2 (pedidos/reservas): leitura com entregas/estornos embutidos e as acoes
 * criar/editar/cancelar/entregar/estornar via RPCs (Q5/R-05/R-07 valem no banco).
 * Falta: CRUD de usuarios (admin API exige service role — painel por ora).
 */

const TITULO_MOVIMENTO: Record<MovimentoTipo, string> = {
  entrada: 'Entrada de estoque',
  perda: 'Perda registrada',
  quadra: 'Movimentação de quadra',
  correcao: 'Correção de quantidade',
}

/** "12 jul 2026 · 14:03" (mesmo formato dos textos do mock). */
function formatarData(iso: string) {
  const data = new Date(iso)
  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ')
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dia} · ${hora}`
}

/** Data prevista da UI (DD/MM/AAAA) -> coluna date (YYYY-MM-DD). */
function dataPrevistaParaISO(value?: string): string | null {
  const data = parseDataPrevista(value)
  if (!data) return null
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

/** Coluna date (YYYY-MM-DD) -> formato da UI (DD/MM/AAAA). */
function dataPrevistaParaUI(value?: string | null): string | undefined {
  if (!value) return undefined
  const [ano, mes, dia] = value.split('-')
  return `${dia}/${mes}/${ano}`
}

/** "Q-08 (5 cx) · Q-11 (3 cx)" a partir das linhas de entrega_quadras. */
function labelRetiradas(itens: { caixas: number; quadras: { numero: string } | null }[] | null | undefined) {
  const label = (itens ?? [])
    .map((item) => (item.quadras ? `${item.quadras.numero} (${item.caixas} cx)` : null))
    .filter(Boolean)
    .join(' · ')
  return label || undefined
}

function mensagemErro(erro: unknown) {
  if (erro && typeof erro === 'object' && 'message' in erro) return String((erro as { message: unknown }).message)
  return String(erro)
}

export function SupabaseInventoryProvider({ children }: { children: ReactNode }) {
  const { notificar } = useNotifications()
  const [carregado, setCarregado] = useState(false)
  const [lotes, setLotes] = useState<LoteEstoque[]>([])
  const [quadras, setQuadras] = useState<Quadra[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  // Chaves internas do banco que o contrato do mock nao carrega: numero do PED -> ids do pedido.
  const pedidosMeta = useRef(new Map<string, { id: string; clienteId: string }>())

  const avisarErro = useCallback((contexto: string, erro: unknown) => {
    notificar({ tipo: 'info', titulo: contexto, descricao: mensagemErro(erro) })
  }, [notificar])

  // ------------------------------------------------------------- leituras
  const recarregar = useCallback(async () => {
    if (!supabase) return
    const [vwEstoque, tQuadras, tProfiles, tClientes, tMovimentos, tReservas] = await Promise.all([
      supabase.from('vw_estoque').select('*').order('nome').order('lote'),
      supabase.from('quadras').select('id, numero, descricao, status').order('numero'),
      supabase.from('profiles').select('id, nome, email, role, status').order('nome'),
      supabase.from('clientes').select('id, nome, documento, telefone, cliente_enderecos(id, apelido, endereco)').order('nome'),
      supabase.from('movimentos').select('id, tipo, detalhe, observacao, lote_id, produto_id, created_at, profiles(nome)').order('created_at', { ascending: false }).limit(200),
      supabase.from('reservas').select(`
        id, caixas_saldo, caixas_entregues, caixas_travadas, regime, status, motivo_cancelamento, created_at,
        pedidos(id, numero, cliente_id, endereco_id, endereco_entrega, data_prevista, observacoes, clientes(nome, documento, telefone), profiles(nome)),
        lotes(codigo, m2_por_caixa, produtos(nome)),
        entregas(id, caixas, responsavel, observacoes, created_at, lotes(codigo), entrega_quadras(caixas, quadras(numero))),
        estornos(id, caixas, motivo, created_at, quadras(numero), profiles(nome))
      `).order('created_at', { ascending: false }),
    ])
    const falha = vwEstoque.error ?? tQuadras.error ?? tProfiles.error ?? tClientes.error ?? tMovimentos.error ?? tReservas.error
    if (falha) {
      avisarErro('Erro ao carregar dados', falha)
      return
    }

    setLotes((vwEstoque.data ?? []).map((r): LoteEstoque => ({
      id: r.lote_id,
      produtoId: r.produto_id,
      produto: r.nome,
      referencia: r.referencia ?? '',
      marca: r.marca,
      tamanho: r.tamanho_nominal ?? '',
      lote: r.lote,
      alocacoes: (r.alocacoes ?? []) as AlocacaoQuadra[],
      bitola: r.bitola ?? undefined,
      tonalidade: r.tonalidade ?? undefined,
      m2PorCaixa: Number(r.m2_por_caixa),
      pecasPorCaixa: r.pecas_por_caixa,
      precoM2: Number(r.preco_m2),
      descricao: r.descricao ?? undefined,
      limiteEstoqueBaixo: r.limite_estoque_baixo_cx ?? undefined,
      caixasEstoque: r.caixas_estoque ?? 0,
      caixasReserva: r.caixas_reserva ?? 0,
      caixasPerda: r.caixas_perda ?? 0,
      pisosDanificados: r.pisos_danificados || undefined,
      foto: r.foto ?? undefined,
    })))
    setQuadras((tQuadras.data ?? []).map((r): Quadra => ({
      id: r.id, numero: r.numero, descricao: r.descricao, status: r.status ?? undefined,
    })))
    setUsuarios((tProfiles.data ?? []).map((r): Usuario => ({
      id: r.id, nome: r.nome, email: r.email ?? '', role: r.role, status: r.status,
    })))
    setClientes((tClientes.data ?? []).map((r): Cliente => ({
      id: r.id, nome: r.nome, documento: r.documento, telefone: r.telefone,
      enderecos: (r.cliente_enderecos ?? []).map((e) => ({ id: e.id, apelido: e.apelido ?? undefined, endereco: e.endereco })),
    })))
    setMovimentos((tMovimentos.data ?? []).map((r): Movimento => ({
      id: r.id,
      tipo: r.tipo,
      titulo: TITULO_MOVIMENTO[r.tipo as MovimentoTipo],
      detalhe: r.detalhe,
      observacao: r.observacao ?? undefined,
      loteId: r.lote_id ?? undefined,
      produtoId: r.produto_id ?? undefined,
      usuario: (r.profiles as unknown as { nome: string } | null)?.nome ?? '—',
      data: formatarData(r.created_at),
    })))

    pedidosMeta.current = new Map()
    setReservas((tReservas.data ?? []).map((r): Reserva => {
      // Embeds to-one do PostgREST: o supabase-js os tipa como array, mas em
      // runtime vem OBJETO (relacao por FK). Normaliza aqui via `unknown` (os
      // leaves ja sao `any`); os to-many (entregas/estornos/entrega_quadras) ficam array.
      const pedido = r.pedidos as unknown as {
        id: string; numero: string; cliente_id: string; endereco_id: string | null
        endereco_entrega: string | null; data_prevista: string | null; observacoes: string | null
        clientes: { nome: string; documento: string | null; telefone: string | null } | null
        profiles: { nome: string } | null
      } | null
      const loteReserva = r.lotes as unknown as {
        codigo: string; m2_por_caixa: number; produtos: { nome: string } | null
      } | null
      if (pedido) pedidosMeta.current.set(pedido.numero, { id: pedido.id, clienteId: pedido.cliente_id })
      const entregas = [...(r.entregas ?? [])]
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map((e) => ({
          id: e.id,
          data: formatarData(e.created_at),
          responsavel: e.responsavel,
          caixas: e.caixas,
          lote: (e.lotes as unknown as { codigo: string } | null)?.codigo,
          quadras: labelRetiradas(e.entrega_quadras as unknown as { caixas: number; quadras: { numero: string } | null }[] | null),
          observacoes: e.observacoes ?? undefined,
        }))
      const estornos = [...(r.estornos ?? [])]
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map((e) => ({
          id: e.id,
          data: formatarData(e.created_at),
          responsavel: (e.profiles as unknown as { nome: string } | null)?.nome ?? '—',
          caixas: e.caixas,
          quadraDestino: (e.quadras as unknown as { numero: string } | null)?.numero ?? '—',
          motivo: e.motivo ?? undefined,
        }))
      // Snapshot de localizacao das HISTORICAS: de onde as entregas sairam.
      // (As ativas derivam do lote ao vivo via quadraDaReserva.)
      const quadrasHistoricas = [...new Set(
        (r.entregas ?? []).flatMap((e) =>
          ((e.entrega_quadras ?? []) as unknown as { quadras: { numero: string } | null }[]).map((q) => q.quadras?.numero),
        ).filter(Boolean),
      )].join(' · ')
      return {
        id: r.id,
        pedido: pedido?.numero ?? '—',
        clienteId: pedido?.cliente_id ?? undefined,
        cliente: pedido?.clientes?.nome ?? '',
        documento: pedido?.clientes?.documento ?? undefined,
        telefone: pedido?.clientes?.telefone ?? '',
        enderecoId: pedido?.endereco_id ?? undefined,
        enderecoEntrega: pedido?.endereco_entrega ?? undefined,
        produto: loteReserva?.produtos?.nome ?? '—',
        lote: loteReserva?.codigo ?? '—',
        quadra: quadrasHistoricas || '—',
        caixas: r.caixas_saldo,
        m2: r.caixas_saldo * Number(loteReserva?.m2_por_caixa ?? 0),
        caixasEntregues: r.caixas_entregues || undefined,
        // Contrato do mock: caixasTravadas numerico so p/ rotacionando (nos demais deriva do saldo).
        caixasTravadas: r.regime === 'rotacionando' ? r.caixas_travadas : undefined,
        entregas: entregas.length > 0 ? entregas : undefined,
        estornos: estornos.length > 0 ? estornos : undefined,
        dataPrevista: dataPrevistaParaUI(pedido?.data_prevista),
        status: r.status,
        regime: r.regime,
        data: formatarData(r.created_at),
        vendedor: pedido?.profiles?.nome ?? '—',
        observacoes: pedido?.observacoes ?? undefined,
        motivoCancelamento: r.motivo_cancelamento ?? undefined,
      }
    }))
  }, [avisarErro])

  useEffect(() => {
    // Carga inicial de sistema EXTERNO (fetch -> setState nos callbacks pos-await),
    // o caso de uso legitimo de effect; o linter nao distingue o setState assincrono.
    let ativo = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregar().finally(() => {
      if (ativo) setCarregado(true)
    })
    return () => {
      ativo = false
    }
  }, [recarregar])

  // Realtime GERAL (etapa 4): qualquer mudanca nas tabelas publicadas — deste ou de
  // OUTRO aparelho — recarrega os dados (debounce: uma transacao emite N eventos).
  useEffect(() => {
    if (!supabase) return
    let timer: number | undefined
    const canal = supabase
      .channel('dados-inventario')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        if (payload.table === 'notificacoes') return // o sino tem canal proprio
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          void recarregar()
        }, 400)
      })
      .subscribe()
    return () => {
      window.clearTimeout(timer)
      void supabase?.removeChannel(canal)
    }
  }, [recarregar])

  // ------------------------------------------------------------- helpers
  const quadraIdPorNumero = useCallback((numero: string) => {
    return quadras.find((q) => q.numero === numero)?.id
  }, [quadras])

  /** Executa uma mutacao async, recarrega e avisa erro amigavel (contrato do contexto e sincrono). */
  const executar = useCallback((contexto: string, acao: () => Promise<void>) => {
    void (async () => {
      try {
        await acao()
        await recarregar()
      } catch (erro) {
        avisarErro(contexto, erro)
      }
    })()
  }, [avisarErro, recarregar])

  const rpc = useCallback(async (fn: string, args: Record<string, unknown>) => {
    if (!supabase) return
    const { error } = await supabase.rpc(fn, args)
    if (error) throw error
  }, [])

  // -------------------------------------------------------------- usuarios
  // Criar/remover/trocar senha exigem a service_role, que vive na Edge
  // Function admin-usuarios (ela mesma confere se quem chama e admin).
  const invocarAdminUsuarios = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase!.functions.invoke('admin-usuarios', { body })
    if (error) throw new Error('Função de usuários indisponível. Ela foi publicada? (npx supabase functions deploy admin-usuarios)')
    const retorno = data as { ok: boolean; erro?: string }
    if (!retorno.ok) throw new Error(retorno.erro ?? 'Erro na função de usuários.')
  }, [])

  const adicionarUsuario = useCallback<InventoryContextValue['adicionarUsuario']>((dados) => {
    executar('Erro ao criar usuário', async () => {
      await invocarAdminUsuarios({ acao: 'criar', email: dados.email, senha: dados.senha, nome: dados.nome, role: dados.role })
      notificar({ tipo: 'info', titulo: 'Usuário criado', descricao: `${dados.nome} (${dados.email}) — papel ${dados.role}`, silencioso: true })
    })
  }, [executar, invocarAdminUsuarios, notificar])

  const atualizarUsuario = useCallback<InventoryContextValue['atualizarUsuario']>((id, dados) => {
    const atual = usuarios.find((item) => item.id === id)
    executar('Erro ao atualizar usuário', async () => {
      // Nome/papel vivem em profiles (policy de admin); e-mail/senha vivem no Auth (via funcao)
      const { error } = await supabase!.from('profiles').update({ nome: dados.nome, role: dados.role }).eq('id', id)
      if (error) throw error
      const emailMudou = Boolean(atual && dados.email.trim().toLowerCase() !== atual.email.trim().toLowerCase())
      if (emailMudou || dados.senha) {
        await invocarAdminUsuarios({
          acao: 'atualizar',
          id,
          email: emailMudou ? dados.email : undefined,
          senha: dados.senha || undefined,
        })
      }
    })
  }, [executar, invocarAdminUsuarios, usuarios])

  const removerUsuario = useCallback((id: string) => {
    executar('Erro ao remover usuário', () => invocarAdminUsuarios({ acao: 'remover', id }))
  }, [executar, invocarAdminUsuarios])

  const alternarStatusUsuario = useCallback((id: string) => {
    const atual = usuarios.find((item) => item.id === id)
    if (!atual) return
    // Regra do usuario (2026-07-14): status de ADMIN so muda direto no banco
    // (o trigger fn_protege_admin reforça; aqui e a mensagem amigavel).
    if (atual.role === 'admin') {
      notificar({ tipo: 'info', titulo: 'Ação bloqueada', descricao: 'Status de administrador é gerenciado direto no banco.' })
      return
    }
    executar('Erro ao alternar status do usuário', async () => {
      const { error } = await supabase!.from('profiles').update({ status: atual.status === 'ativo' ? 'ausente' : 'ativo' }).eq('id', id)
      if (error) throw error
    })
  }, [executar, notificar, usuarios])

  // ------------------------------------------------------------- quadras
  const adicionarQuadra = useCallback((dados: QuadraInput) => {
    executar('Erro ao criar quadra', async () => {
      const { error } = await supabase!.from('quadras').insert({ numero: dados.numero, descricao: dados.descricao })
      if (error) throw error
    })
  }, [executar])

  const atualizarQuadra = useCallback((id: string, dados: QuadraInput) => {
    executar('Erro ao atualizar quadra', async () => {
      const { error } = await supabase!.from('quadras').update({ numero: dados.numero, descricao: dados.descricao }).eq('id', id)
      if (error) throw error
    })
  }, [executar])

  const removerQuadra = useCallback((id: string) => {
    executar('Erro ao remover quadra', async () => {
      const { error } = await supabase!.from('quadras').delete().eq('id', id)
      if (error) throw new Error('Quadra com caixas alocadas não pode ser removida. Mova os lotes antes.')
    })
  }, [executar])

  const alternarStatusQuadra = useCallback((id: string) => {
    const quadra = quadras.find((item) => item.id === id)
    if (!quadra) return
    const novo = quadra.status === 'ocupado' ? 'disponivel' : 'ocupado'
    executar('Erro ao alternar status da quadra', async () => {
      const { error } = await supabase!.from('quadras').update({ status: novo }).eq('id', id)
      if (error) throw error
    })
  }, [executar, quadras])

  // ------------------------------------------------------------- catalogo
  const adicionarLote = useCallback((lote: LoteEstoque) => {
    executar('Erro ao cadastrar lote', async () => {
      // Produto novo (id gerado no drawer) ou existente (id reaproveitado): garante a linha.
      const { data: existente, error: erroBusca } = await supabase!.from('produtos').select('id').eq('id', lote.produtoId).maybeSingle()
      if (erroBusca) throw erroBusca
      if (!existente) {
        const fotoUrl = await persistirFotoProduto(lote.produtoId, lote.foto)
        const { error } = await supabase!.from('produtos').insert({
          id: lote.produtoId,
          nome: lote.produto,
          referencia: lote.referencia || null,
          marca: lote.marca,
          tamanho_nominal: lote.tamanho || null,
          descricao: lote.descricao ?? null,
          preco_m2: lote.precoM2,
          limite_estoque_baixo_cx: lote.limiteEstoqueBaixo ?? undefined,
          foto: fotoUrl,
        })
        if (error) throw error
      }
      const alocacao = lote.alocacoes[0]
      const quadraId = alocacao ? quadraIdPorNumero(alocacao.quadra) : undefined
      if (!quadraId) throw new Error(`Quadra ${alocacao?.quadra ?? ''} não encontrada.`)
      await rpc('fn_criar_lote', {
        p_produto_id: lote.produtoId,
        p_codigo: lote.lote,
        p_bitola: lote.bitola ?? null,
        p_tonalidade: lote.tonalidade ?? null,
        p_m2_por_caixa: lote.m2PorCaixa,
        p_pecas_por_caixa: lote.pecasPorCaixa,
        p_caixas: alocacao.caixas,
        p_quadra_id: quadraId,
      })
      notificar({ tipo: 'estoque', titulo: 'Lote cadastrado', descricao: `${lote.produto} — ${lote.lote} (${alocacao.caixas} cx)` })
    })
  }, [executar, notificar, quadraIdPorNumero, rpc])

  const removerLote = useCallback((loteId: string) => {
    executar('Erro ao remover lote', () => rpc('fn_remover_lote', { p_lote_id: loteId }))
  }, [executar, rpc])

  const removerProduto = useCallback((produtoId: string) => {
    executar('Erro ao remover produto', () => rpc('fn_remover_produto', { p_produto_id: produtoId }))
  }, [executar, rpc])

  const atualizarLote = useCallback((loteId: string, patch: { lote: string; bitola?: string; tonalidade?: string }) => {
    executar('Erro ao atualizar lote', () => rpc('fn_atualizar_lote', {
      p_lote_id: loteId,
      p_codigo: patch.lote,
      p_bitola: patch.bitola ?? null,
      p_tonalidade: patch.tonalidade ?? null,
    }))
  }, [executar, rpc])

  const atualizarProduto = useCallback<InventoryContextValue['atualizarProduto']>((produtoId, patch) => {
    const atual = lotes.find((l) => l.produtoId === produtoId)
    executar('Erro ao atualizar produto', async () => {
      const fotoUrl = await persistirFotoProduto(produtoId, patch.foto)
      const { error } = await supabase!.from('produtos').update({
        nome: patch.produto,
        referencia: patch.referencia || null,
        marca: patch.marca,
        tamanho_nominal: patch.tamanho || null,
        preco_m2: patch.precoM2,
        limite_estoque_baixo_cx: patch.limiteEstoqueBaixo,
        descricao: patch.descricao ?? null,
        foto: fotoUrl,
      }).eq('id', produtoId)
      if (error) throw error
      // m2/caixa e pecas/caixa vivem no LOTE; a edicao pelo produto aplica em massa (RPC)
      if (atual && (patch.m2PorCaixa !== atual.m2PorCaixa || patch.pecasPorCaixa !== atual.pecasPorCaixa)) {
        await rpc('fn_atualizar_medidas_produto', {
          p_produto_id: produtoId,
          p_m2_por_caixa: patch.m2PorCaixa,
          p_pecas_por_caixa: patch.pecasPorCaixa,
        })
      }
    })
  }, [executar, lotes, rpc])

  // ------------------------------------------------------------- ajustes
  const registrarEntrada = useCallback((loteId: string, caixas: number, quadra: string) => {
    executar('Erro na entrada de estoque', async () => {
      const quadraId = quadraIdPorNumero(quadra)
      if (!quadraId) throw new Error(`Quadra ${quadra} não encontrada.`)
      await rpc('fn_registrar_entrada', { p_lote_id: loteId, p_caixas: caixas, p_quadra_id: quadraId })
    })
  }, [executar, quadraIdPorNumero, rpc])

  const registrarPerda = useCallback((loteId: string, caixas: number, pisos: number, motivo: string, quadra?: string) => {
    executar('Erro ao registrar perda', () => rpc('fn_registrar_perda', {
      p_lote_id: loteId,
      p_caixas: caixas,
      p_pisos: pisos,
      p_motivo: motivo,
      p_quadra_id: quadra ? (quadraIdPorNumero(quadra) ?? null) : null,
    }))
  }, [executar, quadraIdPorNumero, rpc])

  const moverQuadra = useCallback((loteId: string, origem: string, destino: string, caixas: number) => {
    executar('Erro ao mover caixas de quadra', async () => {
      const origemId = quadraIdPorNumero(origem)
      const destinoId = quadraIdPorNumero(destino)
      if (!origemId || !destinoId) throw new Error('Quadra de origem ou destino não encontrada.')
      await rpc('fn_mover_quadra', { p_lote_id: loteId, p_origem_id: origemId, p_destino_id: destinoId, p_caixas: caixas })
    })
  }, [executar, quadraIdPorNumero, rpc])

  const corrigirEstoque = useCallback((loteId: string, quadra: string, novoTotalQuadra: number) => {
    executar('Erro na correção de quantidade', async () => {
      const quadraId = quadraIdPorNumero(quadra)
      if (!quadraId) throw new Error(`Quadra ${quadra} não encontrada.`)
      await rpc('fn_corrigir_estoque', { p_lote_id: loteId, p_quadra_id: quadraId, p_novo_total: novoTotalQuadra })
    })
  }, [executar, quadraIdPorNumero, rpc])

  // ------------------------------------------------------------- clientes
  const adicionarCliente = useCallback((input: ClienteInput): Cliente => {
    // Contrato sincrono (o ClienteSelector usa o retorno na hora): cria com id
    // local (otimista) e persiste em seguida; erro reverte no recarregar.
    const novo: Cliente = {
      id: uid(),
      nome: input.nome,
      documento: input.documento,
      telefone: input.telefone,
      enderecos: (input.enderecos ?? []).map((e) => ({ ...e, id: e.id || uid() })),
    }
    setClientes((atual) => [...atual, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
    executar('Erro ao cadastrar cliente', async () => {
      const { error } = await supabase!.from('clientes').insert({
        id: novo.id, nome: novo.nome, documento: novo.documento, telefone: novo.telefone,
      })
      if (error) throw error
      if (novo.enderecos?.length) {
        const { error: erroEnd } = await supabase!.from('cliente_enderecos').insert(
          novo.enderecos.map((e) => ({ id: e.id, cliente_id: novo.id, apelido: e.apelido ?? null, endereco: e.endereco })),
        )
        if (erroEnd) throw erroEnd
      }
    })
    return novo
  }, [executar])

  const atualizarCliente = useCallback((id: string, input: ClienteInput) => {
    executar('Erro ao atualizar cliente', async () => {
      const { error } = await supabase!.from('clientes').update({
        nome: input.nome, documento: input.documento, telefone: input.telefone,
      }).eq('id', id)
      if (error) throw error
      // Enderecos: sincroniza por substituicao (simples e correto p/ poucos enderecos);
      // a FK dos pedidos e 'on delete set null' + snapshot, entao historico nao quebra.
      const { error: erroDel } = await supabase!.from('cliente_enderecos').delete().eq('cliente_id', id)
      if (erroDel) throw erroDel
      if (input.enderecos?.length) {
        const { error: erroIns } = await supabase!.from('cliente_enderecos').insert(
          input.enderecos.map((e) => ({ id: e.id || uid(), cliente_id: id, apelido: e.apelido ?? null, endereco: e.endereco })),
        )
        if (erroIns) throw erroIns
      }
    })
  }, [executar])

  const removerCliente = useCallback((id: string) => {
    executar('Erro ao remover cliente', async () => {
      const { error } = await supabase!.from('clientes').delete().eq('id', id)
      if (error) throw new Error('Cliente com pedidos não pode ser removido (o histórico fica com ele).')
    })
  }, [executar])

  // ------------------------------------------------------------- pedidos / reservas
  /** Regime por item, espelhando o mock: rotacionando trava 0; o resto deriva do saldo no banco. */
  const itemPedido = useCallback((loteId: string, caixas: number, dataPrevista?: string, manterReservadoAgora?: boolean) => {
    const regime = regimePorData(dataPrevista, manterReservadoAgora) ?? 'aguardando'
    return { lote_id: loteId, caixas, regime, caixas_travadas: 0 }
  }, [])

  const criarPedido = useCallback((input: NovoPedidoInput) => {
    const itens = input.itens.filter((item) => item.caixas > 0)
    if (itens.length === 0) return
    if (!input.clienteId) {
      notificar({ tipo: 'info', titulo: 'Cliente obrigatório', descricao: 'Selecione um cliente cadastrado para criar o pedido.' })
      return
    }
    const numero = input.pedido?.trim() || proximoNumeroPedido(reservas)
    executar('Erro ao criar pedido', async () => {
      await rpc('fn_criar_pedido', {
        p_numero: numero,
        p_cliente_id: input.clienteId,
        p_endereco_id: input.enderecoId ?? null,
        p_data_prevista: dataPrevistaParaISO(input.dataPrevista),
        p_observacoes: input.observacoes ?? null,
        p_itens: itens.map((item) => itemPedido(item.loteId, item.caixas, input.dataPrevista, input.manterReservadoAgora)),
      })
      const totalCaixas = itens.reduce((total, item) => total + item.caixas, 0)
      notificar({
        tipo: 'reserva',
        titulo: itens.length > 1 ? 'Pedido criado' : 'Reserva criada',
        descricao: `${numero} — ${itens.length > 1 ? `${itens.length} itens · ` : ''}${totalCaixas} cx para ${input.cliente.trim()}`,
      })
    })
  }, [executar, itemPedido, notificar, reservas, rpc])

  const criarReserva = useCallback((input: NovaReservaInput) => {
    criarPedido({
      pedido: input.pedido,
      clienteId: input.clienteId,
      cliente: input.cliente,
      documento: input.documento,
      telefone: input.telefone,
      enderecoId: input.enderecoId,
      enderecoEntrega: input.enderecoEntrega,
      observacoes: input.observacoes,
      dataPrevista: input.dataPrevista,
      manterReservadoAgora: input.manterReservadoAgora,
      itens: [{ loteId: input.loteId, caixas: input.caixas }],
    })
  }, [criarPedido])

  const editarPedido = useCallback((input: EditarPedidoInput) => {
    const meta = pedidosMeta.current.get(input.pedidoOriginal)
    if (!meta) {
      notificar({ tipo: 'info', titulo: 'Pedido não encontrado', descricao: `Não achei o pedido ${input.pedidoOriginal} no banco.` })
      return
    }
    executar('Erro ao editar pedido', () => rpc('fn_editar_pedido', {
      p_pedido_id: meta.id,
      p_cliente_id: input.clienteId ?? meta.clienteId,
      p_endereco_id: input.enderecoId ?? null,
      p_data_prevista: dataPrevistaParaISO(input.dataPrevista),
      p_observacoes: input.observacoes ?? null,
      p_itens: input.itens.map((item) => ({
        ...itemPedido(item.loteId, item.caixas, input.dataPrevista, input.manterReservadoAgora),
        reserva_id: item.reservaId ?? null,
      })),
    }))
  }, [executar, itemPedido, notificar, rpc])

  const editarReserva = useCallback((input: EditarReservaInput) => {
    // Editor de 1 LINHA (saldo da parcial): monta o pedido inteiro para a RPC —
    // linhas reservadas ausentes seriam CANCELADAS pelo fn_editar_pedido (R-07).
    const linha = reservas.find((item) => item.id === input.id)
    const meta = linha ? pedidosMeta.current.get(linha.pedido) : undefined
    if (!linha || !meta) {
      notificar({ tipo: 'info', titulo: 'Reserva não encontrada', descricao: 'Não achei a linha no banco. Recarregue a página.' })
      return
    }
    const outrasLinhas = reservas
      .filter((item) => item.pedido === linha.pedido && item.id !== linha.id && item.status === 'reservado')
      .map((item) => {
        const lote = lotes.find((l) => l.lote === item.lote)
        return { reserva_id: item.id, lote_id: lote?.id ?? null, caixas: item.caixas, regime: item.regime ?? 'aguardando', caixas_travadas: item.caixasTravadas ?? 0 }
      })
    executar('Erro ao editar reserva', () => rpc('fn_editar_pedido', {
      p_pedido_id: meta.id,
      p_cliente_id: meta.clienteId, // cliente imutavel na parcial (R-05)
      p_endereco_id: linha.enderecoId ?? null,
      p_data_prevista: dataPrevistaParaISO(input.dataPrevista),
      p_observacoes: input.observacoes ?? null,
      p_itens: [
        { ...itemPedido(input.loteId, input.caixas, input.dataPrevista, input.manterReservadoAgora), reserva_id: input.id },
        ...outrasLinhas,
      ],
    }))
  }, [executar, itemPedido, lotes, notificar, reservas, rpc])

  const cancelarReserva = useCallback((id: string, motivo?: string) => {
    executar('Erro ao cancelar reserva', () => rpc('fn_cancelar_reserva', { p_reserva_id: id, p_motivo: motivo ?? null }))
  }, [executar, rpc])

  const entregarReserva = useCallback((input: EntregarReservaInput) => {
    const linha = reservas.find((item) => item.id === input.id)
    executar('Erro ao registrar entrega', async () => {
      const retiradas = (input.retiradas ?? []).map((r) => {
        const quadraId = quadraIdPorNumero(r.quadra)
        if (!quadraId) throw new Error(`Quadra ${r.quadra} não encontrada.`)
        return { quadra_id: quadraId, caixas: r.caixas }
      })
      await rpc('fn_entregar', {
        p_reserva_id: input.id,
        p_caixas: input.caixas,
        p_responsavel: input.responsavel,
        p_observacoes: input.observacoes ?? null,
        p_lote_alternativo_id: input.loteId ?? null,
        p_retiradas: retiradas.length > 0 ? retiradas : null,
      })
      const total = linha ? input.caixas >= linha.caixas : true
      notificar({
        tipo: 'entrega',
        titulo: total ? 'Entrega concluída' : 'Entrega parcial',
        descricao: `${linha?.produto ?? ''} — ${input.caixas} cx${linha ? ` (${linha.pedido})` : ''}`,
      })
    })
  }, [executar, notificar, quadraIdPorNumero, reservas, rpc])

  const estornarReserva = useCallback((input: EstornarReservaInput) => {
    const linha = reservas.find((item) => item.id === input.id)
    executar('Erro na devolução', async () => {
      await rpc('fn_estornar', {
        p_reserva_id: input.id,
        p_caixas: input.caixas,
        p_quadra_destino_id: input.quadraId,
        p_motivo: input.motivo ?? null,
      })
      notificar({
        tipo: 'entrega',
        titulo: 'Devolução registrada',
        descricao: `${linha?.produto ?? ''} — ${input.caixas} cx devolvidas${linha ? ` (${linha.pedido})` : ''}`,
      })
    })
  }, [executar, notificar, reservas, rpc])

  // ------------------------------------------------------------- stubs (proximas fatias)
  const value: InventoryContextValue = {
    lotes,
    reservas,
    clientes,
    quadras,
    usuarios,
    movimentos,
    registrarMovimento: () => {}, // o banco loga sozinho (RPCs/trigger)
    adicionarQuadra,
    atualizarQuadra,
    removerQuadra,
    alternarStatusQuadra,
    adicionarUsuario,
    atualizarUsuario,
    removerUsuario,
    alternarStatusUsuario,
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
    registrarEntrada,
    registrarPerda,
    moverQuadra,
    corrigirEstoque,
  }

  if (!carregado) {
    return <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Carregando dados do banco…</div>
  }

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}
