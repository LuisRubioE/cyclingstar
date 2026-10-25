import type { ReactNode } from 'react'

/**
 * UN FALLO, EN EL SITIO DEL CONTENIDO (E3, docs/visual.md §4.2; PR 4). Cuatro tipos, que en el PR 10
 * saca `errorKindOf` de los errores que ya lanza la web: `server` (cualquier otro), `network` (sin
 * respuesta, o cortada por tiempo), `outdated` (una respuesta que no cumple su contrato, o un trozo de
 * la web que ya no existe tras un despliegue) y `notFound`. En el PR 4 lo usa la barrera por ruta, ante un
 * trozo de JS que no carga: `network` sin red y `outdated` con ella (12-c; 17-v).
 *
 * Nace con las clases de hoy y pasa a los tokens en el PR 9a (17-c); su test mira `data-*` y ARIA.
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
}

/** La frase de cada tipo (pantalla). */
export function errorTitle({ kind, label, chunk, message }: ErrorStateProps): string {
  if (kind === 'outdated') return 'This version is out of date'
  if (kind === 'notFound') return message ?? 'Page not found'
  if (kind === 'network' && chunk) return 'This page needs a connection the first time.'
  return `Couldn't load ${label ?? 'this page'}`
}

export function ErrorState(props: ErrorStateProps) {
  const { kind, status, onRetry, retrying = false, action } = props
  const boton = 'rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700'
  return (
    <div
      role="alert"
      data-ui="ErrorState"
      data-state="error"
      data-kind={kind}
      className="flex flex-col items-start gap-2 py-6"
    >
      <ErrorIcon />
      <p className="text-base font-semibold text-slate-900">{errorTitle(props)}</p>
      {kind === 'server' && status !== undefined && (
        <p className="text-xs text-slate-500">Error {status}</p>
      )}
      {kind === 'outdated' ? (
        <button type="button" className={boton} onClick={() => window.location.reload()}>
          Reload
        </button>
      ) : kind === 'notFound' ? (
        action
      ) : (
        onRetry && (
          <button
            type="button"
            className={boton}
            // ocupado y no deshabilitado (§4.1): se puede enfocar, y el clic, mientras reintenta, no hace nada
            onClick={retrying ? undefined : onRetry}
            aria-busy={retrying || undefined}
            data-state={retrying ? 'busy' : undefined}
          >
            {retrying ? 'Trying again…' : 'Try again'}
          </button>
        )
      )}
    </div>
  )
}

/** El icono `error` hasta los iconos del catálogo, en el 9a. */
function ErrorIcon() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-red-600"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  )
}
