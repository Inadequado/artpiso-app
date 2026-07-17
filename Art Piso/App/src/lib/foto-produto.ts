import { supabase } from '@/lib/supabase'

const BUCKET = 'produtos'

/**
 * Persiste a foto do produto no momento de salvar:
 *  - data URL NOVO (arquivo local ou vindo de link): sobe pro Storage e
 *    devolve a URL publica (texto curto que vai pra coluna produtos.foto);
 *  - URL http (foto inalterada): devolve como esta;
 *  - vazio: devolve null.
 * No modo mock (sem Storage) mantem o data URL — comportamento original.
 */
export async function persistirFotoProduto(produtoId: string, foto: string | undefined): Promise<string | null> {
  if (!foto) return null
  if (!foto.startsWith('data:')) return foto
  if (!supabase) return foto

  const blob = await (await fetch(foto)).blob()
  const caminho = `${produtoId}/${Date.now()}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, blob, {
    contentType: 'image/webp',
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl
}
