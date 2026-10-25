import { Component, type ReactNode, useEffect, useState } from 'react'
import { ChunkLoadError } from '../lazyPage'
import { useOnline } from '../net'
import { ErrorState } from './ui/ErrorState'

/**
 * LA BARRERA POR RUTA (E3, docs/visual.md §12.1; PR 4, D-47 y 12-c). Un trozo de la web que no carga se
 * pinta en su sitio, con la cabecera y la barra, y no tira la web entera a la barrera raíz (`main.tsx`),
 * que queda para los fallos de pintado: cualquier otro error sube hasta ella.
 *
 * Sin red, `This page needs a connection the first time.` · `Try again`; con red, que es lo que pasa tras
 * un despliegue cuando el trozo con la huella vieja ya no existe, `This version is out of date · Reload`.
 * Lo decide `navigator.onLine` cuando el `import()` falla (`ChunkLoadError.offline`), hasta que el PR 10
 * pase la regla a `errorKindOf` (17-v).
 *
 * Reintentar es recargar: un navegador puede recordar el fallo del trozo hasta que la página se recarga
 * (`lazyPage.tsx`). Así que `Try again` recarga con red, y sin ella espera ocupado a que vuelva, porque
 * recargar sin red da la página de error del navegador (D-00p).
 */

/** El tipo de fallo de un trozo que no carga: sin red al fallar, `network`; con ella, la web es vieja. */
export function chunkErrorKind(failedOffline: boolean): 'network' | 'outdated' {
  return failedOffline ? 'network' : 'outdated'
}

/** Recarga la página: lo que hacen `Try again` y `Reload` (§4.2). */
const reload = () => window.location.reload()

/** El fallo de un trozo, en su sitio; `Try again` sin red espera a que vuelva y entonces recarga. */
export function ChunkError({ error }: { error: ChunkLoadError }) {
  const online = useOnline()
  const [waiting, setWaiting] = useState(false)
  useEffect(() => {
    if (waiting && online) reload()
  }, [waiting, online])
  return (
    <ErrorState
      kind={chunkErrorKind(error.offline)}
      chunk
      onRetry={() => (online ? reload() : setWaiting(true))}
      retrying={waiting}
    />
  )
}

interface Props {
  readonly children: ReactNode
  /** la ruta: al cambiar, la barrera se limpia y la página nueva se intenta */
  readonly resetKey: string
}

interface State {
  readonly error: unknown
}

export class RouteBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  override componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error !== null)
      this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children
    // Lo que no es un trozo sube a la raíz: un fallo de pintado no es de la red.
    if (!(error instanceof ChunkLoadError)) throw error
    return <ChunkError error={error} />
  }
}
