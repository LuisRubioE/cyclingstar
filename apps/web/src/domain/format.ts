/** Formateo de valores del juego para la interfaz (presentación pura, sin HTTP). */

/** Formatea segundos como h:mm:ss o mm:ss. */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

/** Dinero del juego con signo explícito (+/−) y separadores de millar. */
export function money(n: number): string {
  const sign = n < 0 ? '−' : n > 0 ? '+' : ''
  return `${sign}${Math.abs(n).toLocaleString('en-US')}`
}
