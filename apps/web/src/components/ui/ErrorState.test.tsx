import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChunkLoadError, pageLoader } from '../../lazyPage'
import { RouteBoundary } from '../RouteBoundary'
import { errorKindOf } from './QueryView'
import { ErrorState, type ErrorStateProps } from './ErrorState'

/**
 * `ErrorState` (E3, docs/visual.md §4.2; PR 4) y la barrera por ruta que lo usa ante un trozo de la web
 * que no carga (§12.1; 12-c): sin red, `network`; con red, `outdated`, lo que pasa tras un despliegue.
 * Render estático: `data-*`, ARIA y los textos de pantalla.
 */

const text = (node: ReactElement) =>
  renderToStaticMarkup(node)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
const retry = () => undefined
const html = (props: ErrorStateProps) => renderToStaticMarkup(<ErrorState {...props} />)

describe('ErrorState', () => {
  it('es un alert con su data-ui, su data-state y su tipo', () => {
    for (const kind of ['server', 'network', 'outdated', 'notFound'] as const)
      expect(html({ kind })).toMatch(
        new RegExp(
          `^<div role="alert" data-ui="ErrorState" data-state="error" data-kind="${kind}"`,
        ),
      )
  })

  it('server: lo que no cargó, el código en pequeño y Try again', () => {
    expect(
      text(<ErrorState kind="server" label="your training plan" status={500} onRetry={retry} />),
    ).toBe("Couldn't load your training plan Error 500 Try again")
  })

  it('network: la misma frase, sin código', () => {
    expect(text(<ErrorState kind="network" label="the standings" onRetry={retry} />)).toBe(
      "Couldn't load the standings Try again",
    )
    expect(text(<ErrorState kind="network" status={0} onRetry={retry} />)).toBe(
      "Couldn't load this page Try again",
    )
  })

  it('network de un trozo de JS: la página necesita la red la primera vez', () => {
    expect(text(<ErrorState kind="network" chunk onRetry={retry} />)).toBe(
      'This page needs a connection the first time. Try again',
    )
  })

  it('outdated: recargar, nunca Try again', () => {
    expect(text(<ErrorState kind="outdated" onRetry={retry} />)).toBe(
      'This version is out of date Reload',
    )
  })

  it('notFound: el texto de la página y su acción en lugar del botón', () => {
    expect(
      text(
        <ErrorState
          kind="notFound"
          message="This rider doesn't exist."
          onRetry={retry}
          action={<a href="/">Go to Dashboard</a>}
        />,
      ),
    ).toBe("This rider doesn't exist. Go to Dashboard")
    expect(text(<ErrorState kind="notFound" />)).toBe('Page not found')
  })

  it('sin onRetry no hay botón', () => {
    expect(html({ kind: 'server' })).not.toContain('<button')
  })

  it('reintentando, el botón está ocupado y no deshabilitado: se puede enfocar', () => {
    const busy = html({ kind: 'network', onRetry: retry, retrying: true })
    expect(busy).toContain('aria-busy="true"')
    expect(busy).toContain('data-state="busy"')
    expect(busy).toContain('Trying again…')
    expect(busy).not.toContain('disabled')
    const idle = html({ kind: 'network', onRetry: retry })
    expect(idle).not.toContain('aria-busy')
  })

  it('el icono no se lee: la frase ya lo dice', () => {
    expect(html({ kind: 'server' })).toMatch(/<svg[^>]*aria-hidden="true"/)
  })
})

describe('la barrera por ruta, ante un trozo que no carga (12-c)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** La barrera tras atrapar `error`, sin montarla: lo que pintaría. */
  function caught(error: unknown): RouteBoundary {
    const boundary = new RouteBoundary({ children: <p>the page</p>, resetKey: '/team' })
    boundary.state = RouteBoundary.getDerivedStateFromError(error)
    return boundary
  }
  const failed = new TypeError('Failed to fetch dynamically imported module')

  it('la regla, desde el PR 10 en errorKindOf (17-v): lo que falló sin red es network; con red, outdated', () => {
    expect(errorKindOf(new ChunkLoadError(failed, true))).toBe('network')
    expect(errorKindOf(new ChunkLoadError(failed, false))).toBe('outdated')
  })

  it('lo que falló sin red pinta en su sitio el ErrorState network con Try again, aunque la red haya vuelto', () => {
    // el render estático ve la red (`useOnline`): el tipo sale del fallo, no de la red de ahora
    const node = <>{caught(new ChunkLoadError(failed, true)).render()}</>
    expect(renderToStaticMarkup(node)).toContain('data-kind="network"')
    expect(text(node)).toBe('This page needs a connection the first time. Try again')
  })

  it('lo que falló con red, tras un despliegue, pide recargar', () => {
    const node = <>{caught(new ChunkLoadError(failed, false)).render()}</>
    expect(renderToStaticMarkup(node)).toContain('data-kind="outdated"')
    expect(text(node)).toBe('This version is out of date Reload')
  })

  it('lo que no es un trozo sube a la barrera raíz: un fallo de pintado no es de la red', () => {
    const paint = new Error('Cannot read properties of undefined')
    expect(() => caught(paint).render()).toThrow(paint)
  })

  it('sin error pinta la página', () => {
    const boundary = new RouteBoundary({ children: <p>the page</p>, resetKey: '/team' })
    expect(renderToStaticMarkup(<>{boundary.render()}</>)).toBe('<p>the page</p>')
  })

  it('la carga de una página apunta si había red cuando falló, y guarda lo que lanzó el import()', async () => {
    const load = pageLoader(async () => {
      throw failed
    })
    vi.stubGlobal('navigator', { onLine: false })
    const sinRed = await load().catch((e: unknown) => e)
    expect(sinRed).toBeInstanceOf(ChunkLoadError)
    expect((sinRed as ChunkLoadError).offline).toBe(true)
    expect((sinRed as ChunkLoadError).original).toBe(failed)
    vi.stubGlobal('navigator', { onLine: true })
    const conRed = await load().catch((e: unknown) => e)
    expect((conRed as ChunkLoadError).offline).toBe(false)
    expect((conRed as ChunkLoadError).name).toBe('ChunkLoadError')
  })

  it('y si carga, la página tal cual', async () => {
    const page = { default: () => null }
    await expect(pageLoader(async () => page)()).resolves.toBe(page)
  })
})
