import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'

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

    // Con el sistema (E3, docs/visual.md §17.21; PR 21m): los tokens y los `Button` del catálogo, donde iban
    // la paleta y dos botones a mano; los textos, los de siempre.
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-page text-ink">Something went wrong</h1>
        <p className="mt-2 text-body text-ink-2">
          The page hit an unexpected error. Your saved data is safe — try again, and reload if it
          keeps happening.
        </p>
        <p className="mt-4 rounded-ui bg-surface-2 p-3 text-meta break-words text-ink-2">
          {error.message}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" onClick={this.reset}>
            Try again
          </Button>
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
        </div>
      </div>
    )
  }
}
