// Gera os PNGs do PWA a partir do SVG da marca (public/pwa-icon.svg).
// Rodar: `npm run gen:icons`. Portado do minas-tintas-pintor (que usa sharp).
// O SVG ja e full-bleed branco com a logo centralizada (~66%), entao serve como
// "any" e "maskable" e como badge da splash. Densidade alta = rasterizacao nitida.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SRC = 'public/pwa-icon.svg'
const OUT = 'public/icons'
mkdirSync(OUT, { recursive: true })

async function png(size, name) {
  await sharp(SRC, { density: 384 })
    .resize(size, size, { fit: 'contain' })
    .png()
    .toFile(`${OUT}/${name}`)
  console.log('escrito:', `${OUT}/${name}`)
}

await png(192, 'icon-192.png')
await png(512, 'icon-512.png')
await png(512, 'icon-maskable-512.png') // full-bleed branco = ja dentro da zona segura
await png(180, 'icon-180.png') // apple-touch-icon (iOS)
