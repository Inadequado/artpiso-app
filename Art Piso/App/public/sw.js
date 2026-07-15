// Service worker minimo do Art Piso.
// Objetivo por ora: apenas tornar o app instalavel (PWA). SEM cache offline —
// todo request passa direto pra rede. Cache/offline fica para uma etapa futura.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Handler de fetch passthrough: presente para os criterios de instalabilidade,
// mas sem interceptar/cachear nada.
self.addEventListener('fetch', () => {})
