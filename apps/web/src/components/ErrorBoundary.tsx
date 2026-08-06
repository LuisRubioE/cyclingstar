import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Barrera de error raíz: sin ella, cualquier excepción durante el render dejaba la SPA en blanco
 * (React desmonta todo el árbol) y el jugador no sabía ni que había pasado algo. Aquí se muestra
 * un mensaje y se ofrece reintentar (vuelve a montar el árbol) o recargar la página.
 */

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Sin servicio de errores todavía: al menos queda en la consola con el árbol de componentes.
    console.error('Unhandled error in the UI', error, info.componentStack)
  }

  private readonly reset = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page hit an unexpected error. Your saved data is safe — try again, and reload if it
          keeps happening.
        </p>
        <p className="mt-4 break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          {error.message}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Reload the page
          </button>
        </div>
      </div>
    )
  }
}
