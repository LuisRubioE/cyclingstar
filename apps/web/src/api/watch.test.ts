import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './request'
import {
  type ProgressStorage,
  beaconWatchProgress,
  forgetLocalProgress,
  localProgressKey,
  postReveal,
  postWatchProgress,
  putFollow,
  putSpoilerScope,
  readLocalProgress,
  writeLocalProgress,
} from './watch'

/**
 * LOS CLIENTES DE LO VISTO (docs/retransmision.md §14.2 y §14.11; E2, paso 7a): el progreso por `POST`
 * con `keepalive`; al salir, `sendBeacon` con un `Blob` JSON, el mismo JSON en `text/plain` si el
 * navegador no admite el `Blob` (14-g) y `fetch` con `keepalive` si la cola no lo acepta; revelar,
 * seguir y el alcance, con el `rev` de después; y el progreso del visitante, que no va al servidor:
 * vive en `localStorage` dentro de `try/catch` (11-p).
 */

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  } as Response
}

type FetchMock = ReturnType<typeof vi.fn<(path: string, init?: RequestInit) => Promise<Response>>>
const stubFetch = (body: unknown, status = 200): FetchMock => {
  const fetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>(async () =>
    response(body, status),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
const bodyOf = (init: RequestInit | undefined): unknown => JSON.parse(String(init?.body))

const RACE_KEY = 'race-france:s0'
const WATCH_URL = '/api/me/watch/race-france%3As0/3'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('web: el progreso con sesión (§14.2)', () => {
  it('es un POST con keepalive a /api/me/watch/:raceKey/:day, con su cuerpo JSON y su esquema', async () => {
    const fetchMock = stubFetch({ status: 'watching', rev: '187.0' })
    await expect(
      postWatchProgress(RACE_KEY, 3, { reachedS: 812.3, mode: 'play' }),
    ).resolves.toEqual({ status: 'watching', rev: '187.0' })
    const [path, init] = fetchMock.mock.calls[0]!
    expect(path).toBe(WATCH_URL)
    expect(init?.method).toBe('POST')
    expect(init?.keepalive).toBe(true)
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json')
    expect(bodyOf(init)).toEqual({ reachedS: 812.3, mode: 'play' })
  })

  it('un 429 llega como ApiError con su retry-after, que la cola del reproductor espera', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '12' }),
        json: async () => ({ ok: false, error: 'demasiadas_peticiones' }),
      })),
    )
    const err = await postWatchProgress(RACE_KEY, 3, { reachedS: 1, mode: 'play' }).catch(
      (e: unknown) => e,
    )
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).retryAfterS).toBe(12)
  })
})

describe('web: el informe de salir, sendBeacon (§14.11, 14-g)', () => {
  const BODY = { reachedS: 100.5, mode: 'summary' } as const

  it('un Blob application/json con el mismo cuerpo; si la cola lo acepta, nada más', async () => {
    const sent: { url: string; data: BodyInit }[] = []
    const post = vi.fn(async () => ({ status: 'watching' as const, rev: '1.0' }))
    beaconWatchProgress(
      RACE_KEY,
      3,
      BODY,
      (url, data) => {
        sent.push({ url, data })
        return true
      },
      post,
    )
    expect(sent).toHaveLength(1)
    expect(sent[0]!.url).toBe(WATCH_URL)
    const blob = sent[0]!.data as Blob
    expect(blob.type).toBe('application/json')
    expect(JSON.parse(await blob.text())).toEqual(BODY)
    expect(post).not.toHaveBeenCalled()
  })

  it('si el navegador no admite el Blob JSON (lanza), el mismo JSON en text/plain', () => {
    const sent: BodyInit[] = []
    const post = vi.fn(async () => ({ status: 'watching' as const, rev: '1.0' }))
    beaconWatchProgress(
      RACE_KEY,
      3,
      BODY,
      (_url, data) => {
        if (data instanceof Blob) throw new TypeError('sendBeacon: tipo no admitido')
        sent.push(data)
        return true
      },
      post,
    )
    expect(sent).toEqual([JSON.stringify(BODY)])
    expect(post).not.toHaveBeenCalled()
  })

  it('si la cola no lo acepta (false), o falla también en text/plain, o no hay sendBeacon: fetch con keepalive', async () => {
    const posts: unknown[] = []
    const post = vi.fn(async (_k: string, _d: number, body: unknown) => {
      posts.push(body)
      return { status: 'watching' as const, rev: '1.0' }
    })
    beaconWatchProgress(RACE_KEY, 3, BODY, () => false, post)
    beaconWatchProgress(
      RACE_KEY,
      3,
      BODY,
      () => {
        throw new TypeError('no')
      },
      post,
    )
    beaconWatchProgress(RACE_KEY, 3, BODY, undefined, post)
    expect(posts).toEqual([BODY, BODY, BODY])
  })

  it('sin argumentos usa fetch con keepalive donde no hay sendBeacon, y un fallo de red no lanza', async () => {
    const fetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>(async () => {
      throw new TypeError('offline')
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('navigator', {})
    expect(() => beaconWatchProgress(RACE_KEY, 3, BODY)).not.toThrow()
    await Promise.resolve()
    const [path, init] = fetchMock.mock.calls[0]!
    expect(path).toBe(WATCH_URL)
    expect(init?.keepalive).toBe(true)
  })
})

describe('web: revelar, seguir y el alcance (§14.2)', () => {
  it('revelar es un POST sin nada a /api/me/reveal/:raceKey/:day, y devuelve el rev de después', async () => {
    const fetchMock = stubFetch({ rev: '187.1' })
    await expect(postReveal(RACE_KEY, 3)).resolves.toEqual({ rev: '187.1' })
    const [path, init] = fetchMock.mock.calls[0]!
    expect(path).toBe('/api/me/reveal/race-france%3As0/3')
    expect(init?.method).toBe('POST')
    expect(bodyOf(init)).toEqual({})
  })

  it('seguir es un PUT a /api/me/follow/:raceKey con follow, drop o default', async () => {
    const fetchMock = stubFetch({ rev: '187.2' })
    await expect(putFollow(RACE_KEY, 'drop')).resolves.toEqual({ rev: '187.2' })
    const [path, init] = fetchMock.mock.calls[0]!
    expect(path).toBe('/api/me/follow/race-france%3As0')
    expect(init?.method).toBe('PUT')
    expect(bodyOf(init)).toEqual({ follow: 'drop' })
  })

  it('el alcance es un PUT a /api/me/spoiler-scope; revealConfirm solo si se da', async () => {
    const fetchMock = stubFetch({ rev: 'world' })
    await putSpoilerScope('own_only')
    await putSpoilerScope('guarded', false)
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/me/spoiler-scope',
      '/api/me/spoiler-scope',
    ])
    expect(fetchMock.mock.calls.map((c) => c[1]?.method)).toEqual(['PUT', 'PUT'])
    expect(fetchMock.mock.calls.map((c) => bodyOf(c[1]))).toEqual([
      { scope: 'own_only' },
      { scope: 'guarded', revealConfirm: false },
    ])
  })
})

describe('web: el progreso del visitante, en localStorage (11-p)', () => {
  /** Un almacenamiento de mentira, como el del navegador. */
  function memory(): ProgressStorage & { readonly items: Map<string, string> } {
    const items = new Map<string, string>()
    return {
      items,
      getItem: (k) => items.get(k) ?? null,
      setItem: (k, v) => {
        items.set(k, v)
      },
      removeItem: (k) => {
        items.delete(k)
      },
    }
  }
  /** El de una ventana privada o con el almacenamiento bloqueado o lleno: todo lanza. */
  const broken: ProgressStorage = {
    getItem: () => {
      throw new DOMException('bloqueado', 'SecurityError')
    },
    setItem: () => {
      throw new DOMException('lleno', 'QuotaExceededError')
    },
    removeItem: () => {
      throw new DOMException('bloqueado', 'SecurityError')
    },
  }

  it('la clave es cs.watch.<raceKey>.<day> y el valor, {"reachedS": n}', () => {
    const s = memory()
    expect(localProgressKey(RACE_KEY, 3)).toBe('cs.watch.race-france:s0.3')
    expect(readLocalProgress(RACE_KEY, 3, s)).toBeNull()
    writeLocalProgress(RACE_KEY, 3, 812.3, s)
    expect(s.items.get('cs.watch.race-france:s0.3')).toBe('{"reachedS":812.3}')
    expect(readLocalProgress(RACE_KEY, 3, s)).toBe(812.3)
    expect(readLocalProgress(RACE_KEY, 4, s)).toBeNull()
  })

  it('lo alcanzado no baja: un informe menor no pisa al mayor', () => {
    const s = memory()
    writeLocalProgress(RACE_KEY, 3, 900, s)
    writeLocalProgress(RACE_KEY, 3, 450, s)
    expect(readLocalProgress(RACE_KEY, 3, s)).toBe(900)
  })

  it('al llegar a la meta se olvida: la vuelta siguiente abre en la previa, como una etapa conocida', () => {
    const s = memory()
    writeLocalProgress(RACE_KEY, 3, 900, s)
    forgetLocalProgress(RACE_KEY, 3, s)
    expect(readLocalProgress(RACE_KEY, 3, s)).toBeNull()
  })

  it('dentro de try/catch: un almacenamiento que lanza, o que no existe, da null y no rompe nada', () => {
    expect(readLocalProgress(RACE_KEY, 3, broken)).toBeNull()
    expect(() => writeLocalProgress(RACE_KEY, 3, 10, broken)).not.toThrow()
    expect(() => forgetLocalProgress(RACE_KEY, 3, broken)).not.toThrow()
    expect(readLocalProgress(RACE_KEY, 3, null)).toBeNull()
    expect(() => writeLocalProgress(RACE_KEY, 3, 10, null)).not.toThrow()
  })

  it('un valor que no es el suyo (otra forma, un número imposible, texto) se ignora', () => {
    const s = memory()
    for (const bad of [
      '{"reached":3}',
      '{"reachedS":-1}',
      '{"reachedS":"9"}',
      '{"reachedS":1e9}',
      'null',
      'basura',
      '[]',
    ]) {
      s.items.set(localProgressKey(RACE_KEY, 3), bad)
      expect(readLocalProgress(RACE_KEY, 3, s), bad).toBeNull()
    }
  })
})
