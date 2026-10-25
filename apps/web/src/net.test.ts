import { createAuthClient } from 'better-auth/client'
import { describe, expect, it } from 'vitest'
import {
  type MarkStorage,
  SIGNED_IN_MARK,
  type SessionAnswer,
  readSignedInMark,
  sessionStateOf,
  writeSignedInMark,
} from './net'

/**
 * LA SESIÓN EN TRES ESTADOS Y SU MARCA (E3, docs/visual.md §12.1 y §16.2; PR 4, X-03). La regla de
 * `sessionStateOf` sale de cómo responde better-auth 1.6.25, y aquí se mira contra el cliente de verdad,
 * con un `fetch` falso: si una versión nueva cambiara lo que deja en `data` y `error`, esto lo dice antes
 * de que alguien con sesión vuelva a ver `Log in`.
 */

const USER = {
  id: 'u1',
  email: 'ana@example.com',
  name: 'Ana',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
const SESSION = {
  id: 's1',
  userId: 'u1',
  token: 't',
  expiresAt: '2027-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

type Answer = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

const json =
  (body: unknown, status: number): Answer =>
  async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const failedFetch: Answer = async () => {
  throw new TypeError('Failed to fetch')
}

/**
 * Lo que deja el átomo de la sesión de better-auth tras cada respuesta de `get-session`, en orden. En
 * Node el átomo no pide la sesión al montarse (no hay `window`), así que cada vuelta la pide `refetch`.
 */
async function sessionAfter(...answers: Answer[]): Promise<SessionAnswer[]> {
  let i = 0
  const client = createAuthClient({
    baseURL: 'http://localhost:3000',
    fetchOptions: {
      customFetchImpl: (input, init) => {
        const answer = answers[Math.min(i, answers.length - 1)]
        if (!answer) throw new Error('sin respuestas')
        return answer(input, init)
      },
    },
  })
  const atom = client.useSession
  const out: SessionAnswer[] = []
  for (; i < answers.length; i++) {
    const seen = await new Promise<SessionAnswer>((resolve) => {
      let first = true
      const unsubscribe = atom.subscribe((v) => {
        // la primera llamada es el valor de ahora: se espera a la respuesta nueva
        if (first) {
          first = false
          return
        }
        if (v.isPending || v.isRefetching) return
        resolve({ data: v.data, error: v.error })
        setTimeout(unsubscribe, 0)
      })
      void atom.get().refetch()
    })
    out.push(seen)
  }
  return out
}

describe('sessionStateOf, con las respuestas de better-auth 1.6.25 (§12.1)', () => {
  it('un 200 con null es sin sesión', async () => {
    const [a] = await sessionAfter(json(null, 200))
    expect(sessionStateOf(a!)).toBe('signed-out')
  })

  it('un 200 con la sesión es con sesión', async () => {
    const [a] = await sessionAfter(json({ user: USER, session: SESSION }, 200))
    expect(sessionStateOf(a!)).toBe('signed-in')
  })

  it('un 401 es sin sesión: better-auth borra los datos', async () => {
    const [a] = await sessionAfter(json({ message: 'Unauthorized' }, 401))
    expect(a!.data).toBeNull()
    expect(sessionStateOf(a!)).toBe('signed-out')
  })

  it('un fallo de red en frío no se sabe: ni datos ni 401, y nunca lleva a /login', async () => {
    const [a] = await sessionAfter(failedFetch)
    expect(a!.data).toBeNull()
    expect(a!.error).not.toBeNull()
    expect(sessionStateOf(a!)).toBe('unknown')
  })

  it('un 503 tampoco se sabe: el servidor no ha dicho que no haya sesión', async () => {
    const [a] = await sessionAfter(json({ message: 'down' }, 503))
    expect(sessionStateOf(a!)).toBe('unknown')
  })

  it('un fallo de red tras tener sesión la conserva: better-auth deja los datos de antes', async () => {
    const [antes, despues] = await sessionAfter(
      json({ user: USER, session: SESSION }, 200),
      failedFetch,
    )
    expect(sessionStateOf(antes!)).toBe('signed-in')
    expect(despues!.error).not.toBeNull()
    expect(sessionStateOf(despues!)).toBe('signed-in')
  })

  it('la regla, sin el cliente: datos, nada, un 401 y lo demás', () => {
    expect(sessionStateOf({ data: { user: USER }, error: null })).toBe('signed-in')
    expect(sessionStateOf({ data: null, error: null })).toBe('signed-out')
    expect(sessionStateOf({ data: undefined, error: undefined })).toBe('signed-out')
    expect(sessionStateOf({ data: null, error: { status: 401 } })).toBe('signed-out')
    expect(sessionStateOf({ data: null, error: { status: 500 } })).toBe('unknown')
    expect(sessionStateOf({ data: null, error: { status: '401' } })).toBe('unknown')
    expect(sessionStateOf({ data: null, error: 'roto' })).toBe('unknown')
  })
})

/** Un `localStorage` de mentira, con lo que la marca usa. */
function memoryStorage(): MarkStorage & { readonly items: Map<string, string> } {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => void items.set(k, v),
    removeItem: (k) => void items.delete(k),
  }
}

describe('la marca cs:signed-in (§12.1)', () => {
  it('signed-in la pone, signed-out la quita y unknown no la toca', () => {
    const storage = memoryStorage()
    writeSignedInMark('signed-in', storage)
    expect(storage.items.get(SIGNED_IN_MARK)).toBe('1')
    expect(readSignedInMark(storage)).toBe(true)
    writeSignedInMark('unknown', storage)
    expect(readSignedInMark(storage)).toBe(true)
    writeSignedInMark('signed-out', storage)
    expect(storage.items.has(SIGNED_IN_MARK)).toBe(false)
    expect(readSignedInMark(storage)).toBe(false)
    writeSignedInMark('unknown', storage)
    expect(readSignedInMark(storage)).toBe(false)
  })

  it('sin almacenamiento, o si lanza (una ventana privada), no hay marca y nada se rompe', () => {
    const roto: MarkStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(() => writeSignedInMark('signed-in', roto)).not.toThrow()
    expect(readSignedInMark(roto)).toBe(false)
    expect(() => writeSignedInMark('signed-out', null)).not.toThrow()
    expect(readSignedInMark(null)).toBe(false)
  })
})
