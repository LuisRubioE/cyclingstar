/**
 * SIN RED, EN EL SITIO DEL CONTENIDO (E3, docs/visual.md §4.2 y §12.1; PR 4, D-47). Lo que pinta una
 * consulta que React Query ha dejado en pausa por falta de red (`fetchStatus === 'paused'`): se rehace
 * sola al volver la red (`refetchOnReconnect`). Antes, `Loading…` sin fin.
 *
 * Nace con las clases de hoy y pasa a los tokens en el PR 9a (17-c); su test mira `data-*` y ARIA.
 */
export function OfflineState() {
  return (
    <div
      role="status"
      data-ui="OfflineState"
      data-state="offline"
      className="flex items-center gap-3 py-6 text-sm text-slate-600"
    >
      <OfflineIcon size={24} className="shrink-0 text-slate-400" />
      <p>You&apos;re offline. This loads when you reconnect.</p>
    </div>
  )
}

/** El icono `offline` (una nube tachada) hasta los iconos del catálogo, en el 9a. */
export function OfflineIcon({ size, className = '' }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.5 19H8a5 5 0 0 1-1.4-9.8" />
      <path d="M10.5 5.3A6 6 0 0 1 20 10a4.5 4.5 0 0 1 1 8" />
      <path d="M3 3l18 18" />
    </svg>
  )
}
