import type { BroadcastChunk } from '@cyclingstar/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { failureAction } from '../domain/broadcast/player'
import {
  broadcastChunkKey,
  broadcastHeadKey,
  fetchBroadcastChunk,
  fetchBroadcastHead,
  fetchStageReport,
  postBroadcastFinish,
} from './broadcast'
import { ApiError, ContractError } from './request'

/**
 * LOS CLIENTES DE LA RETRANSMISIÓN (docs/retransmision.md §14.2 y §14.11; paso 3b): las cuatro rutas
 * con su `?season=`, la meta por POST con su `mode`, cada respuesta validada con su esquema y los dos
 * errores que el reproductor no trata como un fallo (un 429 y un 409 `beyond_reached`).
 */

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as Response
}

/** Un tramo vacío y válido: (0, 9000], sin nada visible. */
const emptyChunk: BroadcastChunk = {
  fromDs: 0,
  toDs: 9000,
  groupsBorn: [],
  groupsDied: [],
  moves: [],
  main: [],
  clocks: [],
  mishaps: [],
  details: [],
  events: [],
  lines: [],
  banners: [],
  tt: null,
  atFinish: false,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('web: los clientes de la retransmisión', () => {
  it('un tramo va a …/broadcast/chunk con fromDs y toDs, y con la temporada si se da', async () => {
    const fetchMock = vi.fn<(path: string) => Promise<Response>>(async () => response(emptyChunk))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchBroadcastChunk('race-france', 7, 0, 9000)).resolves.toEqual(emptyChunk)
    await fetchBroadcastChunk('race-france', 7, 9000, 18000, 2)
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/races/race-france/stages/7/broadcast/chunk?fromDs=0&toDs=9000',
      '/api/races/race-france/stages/7/broadcast/chunk?season=2&fromDs=9000&toDs=18000',
    ])
  })

  it('la cabecera y el acta se validan con su esquema: una respuesta que no lo cumple es un ContractError con su ruta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: true })),
    )
    const head = await fetchBroadcastHead('race-france', 7, 3).catch((e: unknown) => e)
    expect(head).toBeInstanceOf(ContractError)
    expect((head as ContractError).path).toBe('/api/races/race-france/stages/7/broadcast?season=3')
    const report = await fetchStageReport('race-france', 7).catch((e: unknown) => e)
    expect(report).toBeInstanceOf(ContractError)
    expect((report as ContractError).path).toBe('/api/races/race-france/stages/7/report')
  })

  it('la meta es un POST con el modo en el cuerpo (14-f), nunca un GET', async () => {
    const fetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>(async () =>
      response({}),
    )
    vi.stubGlobal('fetch', fetchMock)
    await postBroadcastFinish('race-flanders', 1, 'summary').catch(() => null)
    expect(fetchMock).toHaveBeenCalledWith('/api/races/race-flanders/stages/1/broadcast/finish', {
      method: 'POST',
      body: '{"mode":"summary"}',
      headers: { 'content-type': 'application/json' },
    })
  })

  it('un 429 en un tramo llega al reproductor como throttled con su retry-after, y un 409 beyond_reached como beyond', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response({ ok: false, error: 'demasiadas_peticiones' }, 429, { 'retry-after': '20' }),
      ),
    )
    const tooMany = await fetchBroadcastChunk('race-france', 7, 0, 9000).catch((e: unknown) => e)
    expect(tooMany).toBeInstanceOf(ApiError)
    expect(failureAction(tooMany)).toEqual({ k: 'throttled', retryAfterS: 20 })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'beyond_reached' }, 409)),
    )
    const beyond = await fetchBroadcastChunk('race-france', 7, 0, 9000).catch((e: unknown) => e)
    expect(failureAction(beyond)).toEqual({ k: 'beyond' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'interno' }, 500)),
    )
    const down = await fetchBroadcastChunk('race-france', 7, 0, 9000).catch((e: unknown) => e)
    expect(failureAction(down)).toEqual({ k: 'failed' })
  })

  it('las claves: el tramo sin rev, con su intervalo; la cabecera, por etapa y temporada', () => {
    expect(broadcastChunkKey('race-france', 7, undefined, 0, 9000)).toEqual([
      'broadcast-chunk',
      'race-france',
      7,
      undefined,
      0,
      9000,
    ])
    expect(broadcastHeadKey('race-france', 7, 2)).toEqual(['broadcast-head', 'race-france', 7, 2])
  })
})
