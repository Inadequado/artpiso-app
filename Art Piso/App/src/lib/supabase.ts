import { createClient } from '@supabase/supabase-js'

/**
 * Fonte de dados do app (flag da transicao Fase 2):
 *  - 'mock': store local com seeds, sem rede (comportamento original).
 *  - 'supabase': banco real via RLS/RPCs (exige VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).
 */
export const dataSource: 'mock' | 'supabase' =
  import.meta.env.VITE_DATA_SOURCE === 'supabase' ? 'supabase' : 'mock'

function criarClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('VITE_DATA_SOURCE=supabase exige VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local')
  }
  return createClient(url, key)
}

/** Client unico do app. `null` em modo mock (nenhuma chamada de rede acontece). */
export const supabase = dataSource === 'supabase' ? criarClient() : null
