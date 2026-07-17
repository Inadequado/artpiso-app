import { ImagePlus, Link2, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { processarImagem } from '@/lib/imagem'
import { supabase } from '@/lib/supabase'

/**
 * Campo de foto do produto: upload de arquivo (Forma A) + colar link de
 * catalogo (Forma B). Ambos passam pelo MESMO recorte quadrado (processarImagem)
 * e entregam um data URL WebP; o upload pro Storage acontece so no salvar
 * (provider). O bloco de link so aparece no modo Supabase (precisa da Edge Function).
 */
/**
 * Erro HTTP da Edge Function (403 sem permissao, 500...): o motivo real vem no
 * corpo `{ erro }`, que o supabase-js esconde em `error.context` (a Response).
 * Extrai essa mensagem para o usuario ver o problema exato, nao um generico.
 */
async function mensagemDoErroHttp(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const corpo = await ctx.json()
      if (corpo?.erro) return String(corpo.erro)
    } catch {
      // corpo nao-JSON: cai no fallback
    }
  }
  return 'Não foi possível baixar a imagem deste link.'
}

export function FotoProdutoField({
  value,
  onChange,
}: {
  value?: string
  onChange: (foto?: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [link, setLink] = useState('')
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')

  async function usarArquivo(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0]
    event.target.value = '' // permite re-selecionar o mesmo arquivo
    if (!arquivo) return
    setErro('')
    setProcessando(true)
    try {
      onChange(await processarImagem(arquivo))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível usar esta imagem.')
    } finally {
      setProcessando(false)
    }
  }

  async function usarLink() {
    const url = link.trim()
    if (!url || !supabase) return
    setErro('')
    setProcessando(true)
    try {
      const { data, error } = await supabase.functions.invoke('buscar-imagem', { body: { url } })
      if (error) throw new Error(await mensagemDoErroHttp(error))
      if (!data?.ok) throw new Error(data?.erro ?? 'Não foi possível usar este link.')
      onChange(await processarImagem(data.dataUrl as string))
      setLink('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível usar este link.')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={usarArquivo}
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <img src={value} alt="Prévia do produto" className="size-16 rounded-md border object-cover" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Foto do produto</span>
            <div className="flex gap-3">
              <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => fileRef.current?.click()}>
                Trocar
              </button>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-semibold text-danger hover:underline"
                onClick={() => onChange(undefined)}
              >
                <X aria-hidden="true" className="size-3" /> Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={processando}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-60"
        >
          {processando ? (
            <Loader2 aria-hidden="true" className="size-7 animate-spin" />
          ) : (
            <ImagePlus aria-hidden="true" className="size-7" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {processando ? 'Processando…' : 'Adicionar foto do produto'}
          </span>
          <span className="text-xs">Recortada em quadrado · JPG, PNG ou WebP</span>
        </button>
      )}

      {supabase ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="url"
                inputMode="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Colar link da imagem do catálogo"
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void usarLink()
                  }
                }}
              />
            </div>
            <Button type="button" variant="outline" disabled={!link.trim() || processando} onClick={() => void usarLink()}>
              Buscar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">A imagem é baixada e guardada no sistema (não depende do site de origem).</p>
        </div>
      ) : null}

      {erro ? <p className="text-xs font-semibold text-danger">{erro}</p> : null}
    </div>
  )
}
