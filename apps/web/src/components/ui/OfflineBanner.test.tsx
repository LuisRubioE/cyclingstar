import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { BACK_ONLINE_MS, OfflineBannerView, clockTime, lastSeenAt } from './OfflineBanner'

/**
 * `OfflineBanner` (E3, docs/visual.md §4.7 y §12.1; PR 4, I-29): la franja bajo la cabecera. Sus tres
 * estados con su `data-state` y su ARIA, la hora de lo visto y de dónde sale.
 */

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")
    .trim()

describe('OfflineBannerView', () => {
  const at1402 = new Date(2026, 9, 25, 14, 2, 31).getTime()

  it('hidden no pinta nada', () => {
    expect(renderToStaticMarkup(<OfflineBannerView state={{ kind: 'hidden' }} />)).toBe('')
  })

  it('sin red, con la hora de lo que la página enseña', () => {
    const html = renderToStaticMarkup(
      <OfflineBannerView state={{ kind: 'offline', seenAt: at1402 }} />,
    )
    expect(html).toMatch(/^<div role="status" data-ui="OfflineBanner" data-state="offline"/)
    expect(text(html)).toBe("You're offline. Showing what you saw at 14:02.")
  })

  it('sin red y sin nada visto, solo que no hay red', () => {
    const html = renderToStaticMarkup(
      <OfflineBannerView state={{ kind: 'offline', seenAt: null }} />,
    )
    expect(text(html)).toBe("You're offline.")
  })

  it('al volver la red, Back online, también un status', () => {
    const html = renderToStaticMarkup(<OfflineBannerView state={{ kind: 'ready' }} />)
    expect(html).toMatch(/^<div role="status" data-ui="OfflineBanner" data-state="ready"/)
    expect(text(html)).toBe('Back online')
  })

  it('la franja mide al menos 32 px y sus iconos no se leen', () => {
    for (const state of [{ kind: 'offline', seenAt: at1402 }, { kind: 'ready' }] as const) {
      const html = renderToStaticMarkup(<OfflineBannerView state={state} />)
      expect(html).toContain('min-h-8')
      expect(html).toMatch(/<svg[^>]*aria-hidden="true"/)
    }
  })

  it('Back online dura dos segundos', () => {
    expect(BACK_ONLINE_MS).toBe(2000)
  })

  it('la hora, en el reloj de 24 horas del jugador', () => {
    expect(clockTime(new Date(2026, 9, 25, 9, 5).getTime())).toBe('09:05')
    expect(clockTime(new Date(2026, 9, 25, 23, 59, 59).getTime())).toBe('23:59')
  })
})

describe('lastSeenAt: cuándo llegó lo que la página enseña', () => {
  const observers: Array<() => void> = []
  afterEach(() => {
    for (const off of observers.splice(0)) off()
  })

  /** Monta una consulta como la montaría una página, sin pedir nada: la hace activa. */
  function mount(client: QueryClient, key: string | readonly unknown[]): void {
    const observer = new QueryObserver(client, {
      queryKey: typeof key === 'string' ? [key] : key,
      queryFn: () => new Promise<never>(() => undefined),
      staleTime: Number.POSITIVE_INFINITY,
    })
    observers.push(observer.subscribe(() => undefined))
  }

  it('la respuesta más reciente de las consultas montadas', () => {
    const client = new QueryClient()
    client.setQueryData(['general'], 1, { updatedAt: 1_000 })
    client.setQueryData(['stage'], 2, { updatedAt: 3_000 })
    mount(client, 'general')
    mount(client, 'stage')
    expect(lastSeenAt(client)).toBe(3_000)
  })

  it('lo que la página no tiene montado no cuenta', () => {
    const client = new QueryClient()
    client.setQueryData(['general'], 1, { updatedAt: 1_000 })
    client.setQueryData(['otra-pagina'], 2, { updatedAt: 9_000 })
    mount(client, 'general')
    expect(lastSeenAt(client)).toBe(1_000)
  })

  it('lo que monta la cabecera en toda página no es lo que la página enseña', () => {
    const client = new QueryClient()
    client.setQueryData(['standings'], 1, { updatedAt: 1_000 })
    // el reloj del mundo, el horizonte, quién mira y el resumen del corredor, más recientes
    for (const key of [['health'], ['horizon'], ['admin-whoami'], ['rider', 'summary', '41.3']]) {
      client.setQueryData(key, 2, { updatedAt: 5_000 })
      mount(client, key)
    }
    mount(client, 'standings')
    expect(lastSeenAt(client)).toBe(1_000)
  })

  it('sin ninguna con datos, null', () => {
    const client = new QueryClient()
    mount(client, 'general')
    expect(lastSeenAt(client)).toBeNull()
  })
})
