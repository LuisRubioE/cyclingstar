import type { ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

/**
 * UN FALLO, EN EL SITIO DEL CONTENIDO (E3, docs/visual.md §4.2; PR 4). Cuatro tipos, que en el PR 10
 * saca `errorKindOf` de los errores que ya lanza la web: `server` (cualquier otro), `network` (sin
 * respuesta, o cortada por tiempo), `outdated` (una respuesta que no cumple su contrato, o un trozo de
 * la web que ya no existe tras un despliegue) y `notFound`. En el PR 4 lo usa la barrera por ruta, ante un
 * trozo de JS que no carga: `network` sin red y `outdated` con ella (12-c; 17-v).
 *
 * Anatomía (PR 9a, con los tokens; 17-c): el icono `error` de 24 en `bad`, la frase en `body` 600, el
 * código de `server` en `caption` `ink-3` y `Try again` (`Button` `secondary` con `retry`), ocupado
 * mientras reintenta.
 */

export type ErrorKind = 'server' | 'network' | 'outdated' | 'notFound'

export interface ErrorStateProps {
  readonly kind: ErrorKind
  /** lo que no cargó, en la frase de `server` y `network`: `your training plan` */
  readonly label?: string
  /** un trozo de JS y no una consulta: `network` dice que la página necesita la red la primera vez */
  readonly chunk?: boolean
  /** el texto de `notFound`, el que dé la página (`This rider doesn't exist.`) */
  readonly message?: string
  /** el código de `server`, en pequeño: `Error 500` */
  readonly status?: number
  /** `Try again`: vuelve a pedir; sin él, no hay botón (en `outdated`, el botón recarga) */
  readonly onRetry?: () => void
  /** reintentando: el botón, ocupado */
  readonly retrying?: boolean
  /** lo que va en lugar del botón, en `notFound` (`Go to Dashboard`) */
  readonly action?: ReactNode
  /** la respuesta de la pantalla (§7.3; desde el PR 10, la pasa `QueryView`) */
  readonly answer?: boolean
}

/** La frase de cada tipo (pantalla). */
export function errorTitle({ kind, label, chunk, message }: ErrorStateProps): string {
  if (kind === 'outdated') return 'This version is out of date'
  if (kind === 'notFound') return message ?? 'Page not found'
  if (kind === 'network' && chunk) return 'This page needs a connection the first time.'
  return `Couldn't load ${label ?? 'this page'}`
}

export function ErrorState(props: ErrorStateProps) {
  const { kind, status, onRetry, retrying = false, action, answer = false } = props
  return (
    <div
      role="alert"
      data-ui="ErrorState"
      data-state="error"
      data-kind={kind}
      {...(answer ? { 'data-answer': '' } : {})}
      className="grid justify-items-start gap-2 py-6"
    >
      <span className="inline-flex text-bad">
        <Icon name="error" size={24} />
      </span>
      <p className="text-body font-semibold text-ink">{errorTitle(props)}</p>
      {kind === 'server' && status !== undefined && (
        <p className="text-caption text-ink-3">Error {status}</p>
      )}
      {kind === 'outdated' ? (
        <Button icon="retry" onClick={() => window.location.reload()}>
          Reload
        </Button>
      ) : kind === 'notFound' ? (
        action
      ) : (
        onRetry && (
          // ocupado y no deshabilitado (§4.1): se puede enfocar, y el clic, mientras reintenta, no hace nada
          <Button icon="retry" onClick={onRetry} busy={retrying} busyLabel="Trying again…">
            Try again
          </Button>
        )
      )}
    </div>
  )
}
