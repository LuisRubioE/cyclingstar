import { SPOILER } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  DAY_S,
  VIEWER_COOKIE,
  cookieValue,
  readViewerCookie,
  signViewerCookie,
  viewerCookieHeader,
} from './viewerCookie.js'

/**
 * LA COOKIE QUE SOLO RESTRINGE, `cs_viewer` (docs/retransmision.md §10.8; D-34, 10-g; paso 7a): firmar,
 * leer y la cabecera. Lo que hace con ella la petición (el horizonte en lectura, que no escribe, y la
 * re-firma como mucho una vez al día) está en `routes/me.test.ts` y `routes/broadcast.test.ts`.
 */
const SECRET = 's'.repeat(32)
const USER = '00000000-0000-4000-8000-000000000123'
const NOW = 1_790_000_000

describe('cs_viewer (§10.8)', () => {
  it('firmada aquí, se lee con su usuario y su hora; mide lo que medía §10.8', () => {
    const c = signViewerCookie(USER, SECRET, NOW)
    expect(c.startsWith(`v1.${USER}.${NOW}.`)).toBe(true)
    expect(c.length).toBe(94)
    expect(readViewerCookie(c, SECRET, NOW + 3600)).toEqual({ userId: USER, issuedAtS: NOW })
  })

  it('manipulada, con otro secreto, de otro usuario o mal formada: null, sin lanzar', () => {
    const c = signViewerCookie(USER, SECRET, NOW)
    const otro = '00000000-0000-4000-8000-000000000999'
    for (const mala of [
      c.slice(0, -1) + (c.endsWith('A') ? 'B' : 'A'), // un carácter de la firma
      c.replace(USER, otro), // el usuario cambiado, con la firma del primero
      c.replace(`.${NOW}.`, `.${NOW - 10}.`), // la hora cambiada
      signViewerCookie(USER, 't'.repeat(32), NOW), // otro secreto
      `v2.${USER}.${NOW}.x`,
      `v1.no-es-un-uuid.${NOW}.x`,
      `v1.${USER}.1e9.x`,
      'basura',
      '',
      'x'.repeat(201),
    ])
      expect(readViewerCookie(mala, SECRET, NOW + 10), mala.slice(0, 40)).toBeNull()
    expect(readViewerCookie(undefined, SECRET, NOW)).toBeNull()
  })

  it(`caduca a los ${SPOILER.viewerCookieDays} días reales, y una del futuro no vale`, () => {
    const c = signViewerCookie(USER, SECRET, NOW)
    expect(readViewerCookie(c, SECRET, NOW + SPOILER.viewerCookieDays * DAY_S)).not.toBeNull()
    expect(readViewerCookie(c, SECRET, NOW + SPOILER.viewerCookieDays * DAY_S + 1)).toBeNull()
    expect(readViewerCookie(c, SECRET, NOW - 61)).toBeNull()
  })

  it('la cabecera: HttpOnly, SameSite=Lax, Path=/, Secure en https y Max-Age; con null, la borra', () => {
    const c = signViewerCookie(USER, SECRET, NOW)
    expect(viewerCookieHeader(c, true)).toBe(
      `${VIEWER_COOKIE}=${c}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${SPOILER.viewerCookieDays * DAY_S}`,
    )
    expect(viewerCookieHeader(null, false)).toBe(
      `${VIEWER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    )
  })

  it('cookieValue saca una cookie de la cabecera Cookie, entre otras', () => {
    const header = `better-auth.session_token=abc.def; ${VIEWER_COOKIE}=v1.x.1.y; otra=1`
    expect(cookieValue(header, VIEWER_COOKIE)).toBe('v1.x.1.y')
    expect(cookieValue(header, 'falta')).toBeUndefined()
    expect(cookieValue(undefined, VIEWER_COOKIE)).toBeUndefined()
  })
})
