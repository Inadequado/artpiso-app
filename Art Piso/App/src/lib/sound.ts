// Som de notificacao gerado via WebAudio (sem arquivo). Best-effort: ignora falhas
// de autoplay/sem suporte. Disparado em resposta a acao do usuario, entao normalmente
// ja ha gesto que libera o audio.

type WebkitWindow = typeof window & { webkitAudioContext?: typeof AudioContext }

let contexto: AudioContext | null = null

function getContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (contexto) return contexto
  const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  if (!AC) return null
  contexto = new AC()
  return contexto
}

function tocarNota(audio: AudioContext, freq: number, inicio: number, duracao: number, volume: number) {
  const osc = audio.createOscillator()
  const ganho = audio.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  ganho.gain.setValueAtTime(0.0001, inicio)
  ganho.gain.exponentialRampToValueAtTime(volume, inicio + 0.02)
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao)
  osc.connect(ganho).connect(audio.destination)
  osc.start(inicio)
  osc.stop(inicio + duracao + 0.02)
}

/** Toca um chime curto de duas notas (ding-dong). */
export function playNotificationSound() {
  try {
    const audio = getContexto()
    if (!audio) return
    if (audio.state === 'suspended') void audio.resume()
    const agora = audio.currentTime
    tocarNota(audio, 880, agora, 0.2, 0.16) // A5
    tocarNota(audio, 1318.5, agora + 0.13, 0.32, 0.18) // E6
  } catch {
    // som e secundario; falha nao deve afetar a UI
  }
}
