import { describe, expect, it, vi } from 'vitest'
import { CONFIRM_EMAIL_PATH, confirmEmail } from './confirmEmail'

/**
 * EL BOTÓN DE `VerifyEmail` (docs/cuenta.md §5.2; 5-h; PR 8): el token viaja en el cuerpo de un POST, nunca
 * en la URL, y el caducado o el malo se dicen con el texto de `authErrorText`.
 */
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFAYi5jIn0.firma'

const respuesta = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('confirmEmail', () => {
  it('manda el token en el cuerpo de POST /api/account/verify-email, y no en la URL', async () => {
    const doFetch = vi.fn(async () => respuesta(200, { status: true }))
    expect(await confirmEmail(TOKEN, doFetch)).toBeNull()
    expect(doFetch).toHaveBeenCalledTimes(1)
    const [url, init] = doFetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/account/verify-email')
    expect(url).toBe(CONFIRM_EMAIL_PATH)
    expect(url).not.toContain(TOKEN)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ token: TOKEN })
  })

  it('el token caducado o ya usado da el texto de authErrorText (§12.3)', async () => {
    for (const code of ['TOKEN_EXPIRED', 'INVALID_TOKEN']) {
      const fallo = await confirmEmail(TOKEN, async () => respuesta(401, { code }))
      expect(fallo).toMatchObject({
        code,
        status: 401,
        text: 'This link has expired or has already been used.',
      })
    }
  })

  it('sin red, el texto de sin red', async () => {
    const fallo = await confirmEmail(TOKEN, async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(fallo?.status).toBe(0)
    expect(fallo?.text).toBe("Can't reach Cycling Star. Check your connection and try again.")
  })
})
