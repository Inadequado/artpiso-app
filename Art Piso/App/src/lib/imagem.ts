// Processa a imagem escolhida (arquivo local OU baixada de link) num padrao
// unico: recorta no CENTRO em quadrado, reduz e exporta WebP. Uniformiza o
// grid e deixa o arquivo leve — tira o peso de "padronizar" do usuario.
const TAMANHO_FOTO = 800
const QUALIDADE = 0.85

/** Recebe um Blob (arquivo) ou string (data URL) e devolve um data URL WebP quadrado. */
export async function processarImagem(origem: Blob | string, tamanho = TAMANHO_FOTO): Promise<string> {
  const img = await carregarImagem(origem)
  const lado = Math.min(img.naturalWidth, img.naturalHeight)
  if (lado === 0) throw new Error('Imagem inválida.')
  const sx = (img.naturalWidth - lado) / 2
  const sy = (img.naturalHeight - lado) / 2

  const canvas = document.createElement('canvas')
  canvas.width = tamanho
  canvas.height = tamanho
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar a imagem.')
  ctx.drawImage(img, sx, sy, lado, lado, 0, 0, tamanho, tamanho)
  return canvas.toDataURL('image/webp', QUALIDADE)
}

function carregarImagem(origem: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = typeof origem === 'string' ? origem : URL.createObjectURL(origem)
    const limpar = () => {
      if (typeof origem !== 'string') URL.revokeObjectURL(url)
    }
    img.onload = () => {
      limpar()
      resolve(img)
    }
    img.onerror = () => {
      limpar()
      reject(new Error('Não foi possível carregar a imagem.'))
    }
    img.src = url
  })
}
