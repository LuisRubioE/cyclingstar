import { Icon } from './Icon'

/**
 * SIN RED, EN EL SITIO DEL CONTENIDO (E3, docs/visual.md §4.2 y §12.1; PR 4, D-47). Lo que pinta una
 * consulta que React Query ha dejado en pausa por falta de red (`fetchStatus === 'paused'`): se rehace
 * sola al volver la red (`refetchOnReconnect`). Antes, `Loading…` sin fin.
 *
 * Con los tokens desde el PR 9a (17-c): el icono `offline` de 24 en `ink-3` y una línea `meta` `ink-2`.
 * Desde el PR 10 lo pinta `QueryView`, que le pasa `answer` cuando es la respuesta de la pantalla (§7.3).
 */
export function OfflineState({ answer = false }: { readonly answer?: boolean } = {}) {
  return (
    <div
      role="status"
      data-ui="OfflineState"
      data-state="offline"
      {...(answer ? { 'data-answer': '' } : {})}
      className="flex items-center gap-3 py-6"
    >
      <span className="inline-flex text-ink-3">
        <Icon name="offline" size={24} />
      </span>
      <p className="text-meta text-ink-2">You&apos;re offline. This loads when you reconnect.</p>
    </div>
  )
}
