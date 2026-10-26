import type { StageGate } from '@cyclingstar/shared'
import type { UseQueryResult } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'
import { ApiError, ContractError, GateError, RETRY_AFTER_FALLBACK_S } from '../../api/request'
import { ChunkLoadError } from '../../lazyPage'
import { Button } from './Button'
import { LOADING_DELAY_MS, SLOW_HINT_MS } from './constants'
import { EmptyState } from './EmptyState'
import { type ErrorKind, ErrorState } from './ErrorState'
import { OfflineState } from './OfflineState'
import { Skeleton, type SkeletonShape } from './Skeleton'

/**
 * UNA CONSULTA, EN SUS SEIS ESTADOS (E3, docs/visual.md §4.2; PR 10; D-11, I-30). Recibe la consulta de
 * React Query y pinta, en el sitio del contenido: cargando, el `Skeleton` de lo que viene, invisible
 * hasta los 300 ms (`LOADING_DELAY_MS`) y con pulso desde ahí; lenta, a los 8 s (`SLOW_HINT_MS`) o con un
 * 429, el esqueleto y `Still loading. Slow connection?` · `Retry`; sin red, `OfflineState`, que se rehace
 * sola al volver; con un fallo, `ErrorState` del tipo que dé `errorKindOf`, con `Try again`; vacía, el
 * `EmptyState` con su porqué; y lista, los hijos. Ninguna página escribe `isPending &&` ni `Loading…`
 * (regla `ui/5`).
 *
 * **Tres respuestas no son un fallo** (Rcodigo-009): un `GateError`, el 403 con la puerta del velo de E2,
 * va a `gate`, y la página pinta su `StageGateCard`; un 429 es lenta, y la consulta se repite sola a los
 * `retryAfterS` (5 s sin cabecera, como `Watch`); y un 401 lo resuelve `SessionExpiryWatcher`, que lleva a
 * `/login`, mientras esto sigue cargando. Con datos ya en la mano, un fallo o una pausa al volver a pedir
 * no los tapan.
 *
 * Lista, pinta sus hijos sin envoltura, para no tocar la maqueta de la página; y sin hijos, nada: así lo
 * usa la página que ya tenía su cuerpo escrito con los datos, delante de él (`if (q.data === undefined)`).
 */

export type { SkeletonShape }
export type { ErrorKind }

export type QueryViewState = 'loading' | 'slow' | 'offline' | 'error' | 'empty' | 'ready' | 'gate'

type Consulta<T> = Pick<UseQueryResult<T>, 'data' | 'error' | 'status' | 'fetchStatus' | 'refetch'>

export interface QueryViewProps<T> {
  /** la consulta tal cual: mira `status`, `fetchStatus`, `error` y llama a `refetch` */
  readonly query: Consulta<T>
  /** lo que carga, en minúscula y en una frase: `your training plan`; va al lector y al error */
  readonly label: string
  readonly isEmpty?: (data: T) => boolean
  readonly empty?: { readonly text: string; readonly action?: ReactNode }
  /** el texto de `notFound`; sin él, un 404 se pinta como `server` */
  readonly notFound?: string
  /** la puerta del velo de E2: con un `GateError`, se pinta esto y no un fallo */
  readonly gate?: (gate: StageGate) => ReactNode
  readonly skeleton?: SkeletonShape
  /** pone `data-answer` en lo que pinte, en cualquiera de los seis estados (§7.3) */
  readonly answer?: boolean
  /**
   * lo que se pinta con los datos; sin hijos, solo lo que no es `ready`: la página que ya pinta lo suyo
   * con los datos lo pone delante, `if (q.data === undefined) return <QueryView query={q} … />`
   */
  readonly children?: (data: T) => ReactNode
}

/**
 * El tipo de fallo, de los errores que ya lanza la web (`api/request.ts` y `lazyPage.tsx`): un contrato
 * roto es una web vieja; un 404, `notFound`; sin respuesta o cortada por tiempo (status 0), `network`; un
 * trozo que no carga, `network` si falló sin red y `outdated` con ella, porque tras un despliegue el trozo
 * con la huella vieja ya no existe (12-c; la regla nace en la barrera del PR 4, 17-v); lo demás, `server`.
 */
export function errorKindOf(error: unknown): ErrorKind {
  if (error instanceof ContractError) return 'outdated'
  if (error instanceof ChunkLoadError) return error.offline ? 'network' : 'outdated'
  if (error instanceof ApiError) {
    if (error.status === 404) return 'notFound'
    if (error.status === 0) return 'network'
  }
  return 'server'
}

/** El estado que se pinta, puro: los tests lo miran sin DOM (§4.1). */
export function queryViewStateOf<T>(
  query: Pick<Consulta<T>, 'data' | 'error' | 'status' | 'fetchStatus'>,
  o: { readonly slow: boolean; readonly isEmpty?: ((data: T) => boolean) | undefined },
): QueryViewState {
  const { data, error } = query
  if (data !== undefined) return o.isEmpty?.(data) === true ? 'empty' : 'ready'
  if (query.status === 'error') {
    if (error instanceof GateError) return 'gate'
    if (error instanceof ApiError && error.status === 429) return 'slow'
    // la sesión caducada la resuelve SessionExpiryWatcher, que lleva a /login
    if (error instanceof ApiError && error.status === 401) return 'loading'
    return 'error'
  }
  if (query.fetchStatus === 'paused') return 'offline'
  return o.slow ? 'slow' : 'loading'
}

/**
 * Lo que espera un 429 para repetirse solo: sus `retryAfterS`, o 5 s sin cabecera, como la espera de
 * `Watch` (`RETRY_AFTER_FALLBACK_S`); `null` si no es un 429, o si ya hay datos en la mano.
 */
export function retryDelayMsOf<T>(query: Pick<Consulta<T>, 'data' | 'error'>): number | null {
  const { data, error } = query
  return data === undefined && error instanceof ApiError && error.status === 429
    ? (error.retryAfterS ?? RETRY_AFTER_FALLBACK_S) * 1000
    : null
}

export const SLOW_TEXT = 'Still loading. Slow connection?'

/** Lo que tarda: el esqueleto se ve a los 300 ms, y a los 8 s la consulta es lenta. */
function useEspera(cargando: boolean): { readonly visible: boolean; readonly slow: boolean } {
  const [paso, setPaso] = useState<0 | 1 | 2>(0)
  useEffect(() => {
    if (!cargando) {
      setPaso(0)
      return
    }
    const a = setTimeout(() => setPaso((p) => (p < 1 ? 1 : p)), LOADING_DELAY_MS)
    const b = setTimeout(() => setPaso(2), SLOW_HINT_MS)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [cargando])
  return { visible: paso >= 1, slow: paso >= 2 }
}

/**
 * El estado `loading` sin consulta detrás: un trozo de la web que llega (`Suspense`) o la sesión
 * (`ProtectedRoute`). El mismo marcado que el de `QueryView`, con su esqueleto a los 300 ms.
 */
export function LoadingState({
  label,
  skeleton = { kind: 'panel' },
}: {
  /** `the page`, `your session` */
  readonly label: string
  readonly skeleton?: SkeletonShape
}) {
  const { visible } = useEspera(true)
  return (
    <div data-ui="QueryView" data-state="loading" role="status">
      <span className="sr-only">{`Loading ${label}`}</span>
      <Skeleton shape={skeleton} visible={visible} />
    </div>
  )
}

export function QueryView<T>(props: QueryViewProps<T>) {
  const { query, label, isEmpty, empty, notFound, gate, skeleton, answer, children } = props
  const cargando = query.data === undefined && query.status === 'pending'
  const espera = useEspera(cargando)
  const state = queryViewStateOf(query, { slow: espera.slow, isEmpty })
  const { error, refetch } = query

  // un 429 se repite solo a los `retryAfterS` (5 s sin cabecera), como la espera de `Watch`
  const espera429 = retryDelayMsOf(query)
  useEffect(() => {
    if (espera429 === null) return
    const t = setTimeout(() => void refetch(), espera429)
    return () => clearTimeout(t)
  }, [espera429, error, refetch])

  // `data-answer` va en lo que se pinte (§7.3): la comprobación 7 mira el `data-ui` de la pantalla, el
  // `Skeleton`, el `ErrorState` o el `EmptyState`; lista, lo pone la página en su respuesta
  const marca = answer === true ? { answer: true } : {}
  const raiz = (contenido: ReactNode, status = false) => (
    <div data-ui="QueryView" data-state={state} {...(status ? { role: 'status' } : {})}>
      {contenido}
    </div>
  )
  const forma = skeleton ?? { kind: 'rows' }

  if (state === 'loading' || state === 'slow')
    return raiz(
      <>
        <span className="sr-only">{`Loading ${label}`}</span>
        <Skeleton shape={forma} visible={state === 'slow' || espera.visible} {...marca} />
        {state === 'slow' && (
          <p className="flex flex-wrap items-center gap-x-2 pt-2 text-meta text-ink-2">
            {SLOW_TEXT}
            <Button variant="quiet" onClick={() => void refetch()}>
              Retry
            </Button>
          </p>
        )}
      </>,
      true,
    )
  if (state === 'offline') return raiz(<OfflineState {...marca} />)
  if (state === 'gate' && error instanceof GateError && gate !== undefined)
    return <>{gate(error.gate)}</>
  if (state === 'error' || state === 'gate') {
    const kind = errorKindOf(error)
    if (kind === 'notFound' && notFound !== undefined)
      return raiz(<ErrorState kind="notFound" message={notFound} {...marca} />)
    const status = error instanceof ApiError && error.status > 0 ? { status: error.status } : {}
    return raiz(
      <ErrorState
        kind={kind === 'notFound' ? 'server' : kind}
        label={label}
        {...status}
        onRetry={kind === 'outdated' ? () => window.location.reload() : () => void refetch()}
        retrying={query.fetchStatus === 'fetching'}
        {...marca}
      />,
    )
  }
  if (query.data === undefined) return null
  if (state === 'empty') {
    if (empty === undefined) throw new Error('QueryView: un vacío dice por qué (`empty`)')
    return raiz(<EmptyState text={empty.text} action={empty.action} {...marca} />)
  }
  return children === undefined ? null : <>{children(query.data)}</>
}
