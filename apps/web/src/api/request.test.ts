import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  ApiError,
  ContractError,
  isUnauthorized,
  request,
  requestOptionalAuth,
  retryAfterOf,
} from './request'

const schema = z.object({ ok: z.boolean(), value: z.number() })

/** Respuesta falsa mínima (lo que usa el wrapper: status/ok/json). */
function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('web: wrapper request()', () => {
  it('devuelve la respuesta validada contra el esquema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: true, value: 3, extra: 'ignored' })),
    )
    await expect(request('/api/x', schema)).resolves.toEqual({ ok: true, value: 3 })
  })

  it('lanza ContractError si la respuesta no cumple el contrato', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: true })),
    )
    await expect(request('/api/x', schema)).rejects.toBeInstanceOf(ContractError)
  })

  it('lanza ApiError con el código del servidor cuando no es 2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'no_convocado' }, 403)),
    )
    const error = await request('/api/x', schema).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(403)
    expect((error as ApiError).code).toBe('no_convocado')
  })

  it('un 500 NO se disfraza de respuesta vacía: se propaga', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'interno' }, 500)),
    )
    await expect(request('/api/x', schema)).rejects.toBeInstanceOf(ApiError)
  })

  it('marca el 401 como sesión caducada para el manejador global', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'no_autorizado' }, 401)),
    )
    const error = await request('/api/x', schema).catch((e: unknown) => e)
    expect(isUnauthorized(error)).toBe(true)
  })

  it('requestOptionalAuth devuelve null ante un 401 pero propaga el resto de errores', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'no_autorizado' }, 401)),
    )
    await expect(requestOptionalAuth('/api/x', schema)).resolves.toBeNull()

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'interno' }, 500)),
    )
    await expect(requestOptionalAuth('/api/x', schema)).rejects.toBeInstanceOf(ApiError)
  })

  it('un fallo de red es un ApiError de status 0, no una excepción cruda de fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const error = await request('/api/x', schema).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(0)
    expect(isUnauthorized(error)).toBe(false)
  })

  it('serializa el cuerpo JSON y su cabecera en las mutaciones', async () => {
    const fetchMock = vi.fn(async () => response({ ok: true, value: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    await request('/api/x', schema, { method: 'PUT', json: { a: 1 } })
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      method: 'PUT',
      body: '{"a":1}',
      headers: { 'content-type': 'application/json' },
    })
  })
})

describe('web: el retry-after de un 429 (docs/retransmision.md §14.11, 14-q)', () => {
  const tooMany = (retryAfter: string | null): Response =>
    ({
      ok: false,
      status: 429,
      headers: new Headers(retryAfter === null ? {} : { 'retry-after': retryAfter }),
      json: async () => ({ ok: false, error: 'demasiadas_peticiones' }),
    }) as Response

  it('un 429 lleva en ApiError los segundos de su retry-after, que el reproductor espera con Loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => tooMany('12')),
    )
    const error = await request('/api/x', schema).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 429, code: 'demasiadas_peticiones', retryAfterS: 12 })
  })

  it('sin retry-after, o en cualquier otra respuesta de error, retryAfterS es null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => tooMany(null)),
    )
    expect(await request('/api/x', schema).catch((e: unknown) => e)).toMatchObject({
      status: 429,
      retryAfterS: null,
    })
    // un 409 no lee la cabecera (la respuesta de mentira ni siquiera la tiene)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: false, error: 'beyond_reached' }, 409)),
    )
    expect(await request('/api/x', schema).catch((e: unknown) => e)).toMatchObject({
      status: 409,
      code: 'beyond_reached',
      retryAfterS: null,
    })
  })

  it('retryAfterOf lee segundos, como los manda @fastify/rate-limit; una fecha o un número raro dan null', () => {
    expect(retryAfterOf('12')).toBe(12)
    expect(retryAfterOf(' 7 ')).toBe(7)
    expect(retryAfterOf('1.5')).toBe(1.5)
    expect(retryAfterOf('0')).toBe(0)
    expect(retryAfterOf(null)).toBeNull()
    expect(retryAfterOf('')).toBeNull()
    expect(retryAfterOf('-3')).toBeNull()
    expect(retryAfterOf('Wed, 21 Oct 2015 07:28:00 GMT')).toBeNull()
  })
})
