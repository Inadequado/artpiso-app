import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/store/notifications'
import {
  InventoryContext,
  type ClienteInput,
  type InventoryContextValue,
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
 * historico; ajustes de estoque e cadastros via RPC/tabela. Reservas/pedidos
 * chegam na proxima fatia (acoes avisam em vez de quebrar).
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
  const [reservas] = useState<Reserva[]>([]) // proxima fatia (pedidos/reservas)

  const avisarErro = useCallback((contexto: string, erro: unknown) => {
    notificar({ tipo: 'info', titulo: contexto, descricao: mensagemErro(erro) })
  }, [notificar])

  // ------------------------------------------------------------- leituras
  const recarregar = useCallback(async () => {
    if (!supabase) return
    const [vwEstoque, tQuadras, tProfiles, tClientes, tMovimentos] = await Promise.all([
      supabase.from('vw_estoque').select('*').order('nome').order('lote'),
      supabase.from('quadras').select('id, numero, descricao, status').order('numero'),
      supabase.from('profiles').select('id, nome, role, status').order('nome'),
      supabase.from('clientes').select('id, nome, documento, telefone, cliente_enderecos(id, apelido, endereco)').order('nome'),
      supabase.from('movimentos').select('id, tipo, detalhe, observacao, lote_id, produto_id, created_at, profiles(nome)').order('created_at', { ascending: false }).limit(200),
    ])
    const falha = vwEstoque.error ?? tQuadras.error ?? tProfiles.error ?? tClientes.error ?? tMovimentos.error
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
      caixasEstoque: r.caixas_estoque ?? 0,
      caixasReserva: r.caixas_reserva ?? 0,
      caixasPerda: r.caixas_perda ?? 0,
      pisosDanificados: r.pisos_danificados || undefined,
      foto: r.foto ?? undefined,
    })))
    setQuadras((tQuadras.data ?? []).map((r): Quadra => ({
      id: r.id, numero: r.numero, descricao: r.descricao, status: r.status ?? undefined,
    })))
    // E-mail vive em auth.users (nao exposto para outros usuarios); exibicao usa o nome.
    setUsuarios((tProfiles.data ?? []).map((r): Usuario => ({
      id: r.id, nome: r.nome, email: '', role: r.role, status: r.status,
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
      usuario: (r.profiles as { nome: string } | null)?.nome ?? '—',
      data: formatarData(r.created_at),
    })))
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

  const proximaFatia = useCallback((acao: string) => {
    notificar({ tipo: 'info', titulo: 'Ainda não migrado', descricao: `${acao} chega na próxima fatia do modo Supabase.` })
  }, [notificar])

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
        const { error } = await supabase!.from('produtos').insert({
          id: lote.produtoId,
          nome: lote.produto,
          referencia: lote.referencia || null,
          marca: lote.marca,
          tamanho_nominal: lote.tamanho || null,
          descricao: lote.descricao ?? null,
          preco_m2: lote.precoM2,
          foto: lote.foto ?? null,
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
    if (atual && (patch.m2PorCaixa !== atual.m2PorCaixa || patch.pecasPorCaixa !== atual.pecasPorCaixa)) {
      // m2/caixa e pecas/caixa sao POR LOTE no banco; edicao em massa via produto fica pra proxima fatia.
      notificar({ tipo: 'info', titulo: 'Campo por lote', descricao: 'm²/caixa e peças/caixa são do LOTE no banco — edite pelo lote (próxima fatia cobre a edição em massa).' })
    }
    executar('Erro ao atualizar produto', async () => {
      const { error } = await supabase!.from('produtos').update({
        nome: patch.produto,
        referencia: patch.referencia || null,
        marca: patch.marca,
        tamanho_nominal: patch.tamanho || null,
        preco_m2: patch.precoM2,
        descricao: patch.descricao ?? null,
        foto: patch.foto ?? null,
      }).eq('id', produtoId)
      if (error) throw error
    })
  }, [executar, lotes, notificar])

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
      id: crypto.randomUUID(),
      nome: input.nome,
      documento: input.documento,
      telefone: input.telefone,
      enderecos: (input.enderecos ?? []).map((e) => ({ ...e, id: e.id || crypto.randomUUID() })),
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
          input.enderecos.map((e) => ({ id: e.id || crypto.randomUUID(), cliente_id: id, apelido: e.apelido ?? null, endereco: e.endereco })),
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
    adicionarUsuario: () => proximaFatia('Cadastro de usuários'),
    atualizarUsuario: () => proximaFatia('Edição de usuários'),
    removerUsuario: () => proximaFatia('Remoção de usuários'),
    alternarStatusUsuario: () => proximaFatia('Status de usuários'),
    adicionarCliente,
    atualizarCliente,
    removerCliente,
    adicionarLote,
    removerLote,
    removerProduto,
    atualizarLote,
    atualizarProduto,
    criarReserva: () => proximaFatia('Criar reserva'),
    criarPedido: () => proximaFatia('Criar pedido'),
    editarReserva: () => proximaFatia('Editar reserva'),
    editarPedido: () => proximaFatia('Editar pedido'),
    cancelarReserva: () => proximaFatia('Cancelar reserva'),
    entregarReserva: () => proximaFatia('Registrar entrega'),
    estornarReserva: () => proximaFatia('Devolução'),
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
