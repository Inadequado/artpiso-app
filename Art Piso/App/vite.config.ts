import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Teste em aparelho real via tunnel (cloudflared): sem isto o Vite responde
  // "Blocked request" para o dominio do tunel. Vale so para o servidor local.
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
  build: {
    rollupOptions: {
      output: {
        // Vendors em chunks proprios: o app muda toda semana, essas libs nao —
        // assim um deploy nao invalida o cache delas no aparelho da loja.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('/gsap/')) return 'gsap'
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'react'
        },
      },
    },
  },
})
