import { QueryClient, QueryObserver, onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasPausedWithoutData } from './PausedOffline'

/**
 * DATOS SIN PEDIR Y SIN RED (E3, docs/visual.md §12.1, captura 51; PR 4): React Query deja en pausa la
 * consulta que no puede lanzar sin red, y hasta `QueryView` (PR 10) `PausedOffline` pinta `OfflineState`
 * mientras haya alguna montada en pausa sin nada que enseñar. Se rehace sola al volver la red.
 */
describe('hasPausedWithoutData', () => {
  const cleanup: Array<() => void> = []
  afterEach(() => {
    for (const off of cleanup.splice(0)) off()
    onlineManager.setOnline(true)
  })

  /** El cliente montado, como en `QueryClientProvider`: así oye a `onlineManager` y rehace lo pausado. */
  function client(): QueryClient {
    const c = new QueryClient()
    c.mount()
    cleanup.push(() => c.unmount())
    return c
  }

  function mount(c: QueryClient, key: string): void {
    const observer = new QueryObserver(c, { queryKey: [key], queryFn: async () => key })
    cleanup.push(observer.subscribe(() => undefined))
  }

  it('sin red, una consulta montada sin datos queda en pausa; al volver la red se rehace sola', async () => {
    const c = client()
    onlineManager.setOnline(false)
    mount(c, 'standings')
    expect(c.getQueryState(['standings'])?.fetchStatus).toBe('paused')
    expect(hasPausedWithoutData(c)).toBe(true)
    onlineManager.setOnline(true)
    await vi.waitFor(() => expect(c.getQueryData(['standings'])).toBe('standings'))
    expect(hasPausedWithoutData(c)).toBe(false)
  })

  it('en pausa pero con datos no cuenta: la página enseña lo que vio', () => {
    const c = client()
    c.setQueryData(['standings'], 'old')
    onlineManager.setOnline(false)
    mount(c, 'standings')
    // sin esperarla: en pausa, la promesa no se cumple hasta que vuelva la red
    void c.invalidateQueries({ queryKey: ['standings'] })
    expect(c.getQueryState(['standings'])?.fetchStatus).toBe('paused')
    expect(hasPausedWithoutData(c)).toBe(false)
  })

  it('con red, nada en pausa', () => {
    const c = client()
    mount(c, 'standings')
    expect(hasPausedWithoutData(c)).toBe(false)
  })
})
