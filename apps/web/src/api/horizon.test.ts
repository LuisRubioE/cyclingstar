import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchHorizon } from './horizon'
import { ApiError, ContractError } from './request'

/**
 * EL HORIZONTE DE QUIEN MIRA (docs/retransmision.md §14.2 y §14.11; E2, paso 7a): `GET /api/me/horizon`
 * con su esquema, y el 401 de quien no tiene sesión ni `cs_viewer` es null, no un error: el manejador
 * global de 401 no puede mandar a `/login` a un visitante por abrir una página.
 */

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  } as Response
}

const SUMMARY = {
  rev: '187.0',
  scope: 'guarded',
  ready: [
    {
      raceKey: 'race-france:s0',
      raceName: 'Race France',
      stages: [3],
      reason: 'own_rider',
      expiresOnDay: 263,
    },
  ],
  watching: [],
  expiredSinceLastVisit: [],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('web: fetchHorizon (§14.11)', () => {
  it('pide GET /api/me/horizon y devuelve el resumen validado', async () => {
    const fetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>(async () =>
      response(SUMMARY),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchHorizon()).resolves.toEqual(SUMMARY)
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/me/horizon')
    expect(fetchMock.mock.calls[0]![1]?.method).toBe('GET')
  })

  it('sin sesión ni cs_viewer (401) es null; un 500 se propaga y una respuesta rota es un ContractError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'no_autorizado' }, 401)),
    )
    await expect(fetchHorizon()).resolves.toBeNull()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'interno' }, 500)),
    )
    await expect(fetchHorizon()).rejects.toBeInstanceOf(ApiError)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ rev: 3 })),
    )
    await expect(fetchHorizon()).rejects.toBeInstanceOf(ContractError)
  })
})
