import { describe, expect, it } from 'vitest'
import { authErrorText, countdownText, waitText } from './authErrors'

/**
 * EL TRADUCTOR ÚNICO DE LOS FALLOS DE LA CUENTA (docs/cuenta.md §12.3; D-25): cada fila de su tabla que puede
 * darse hoy, y las de los PR siguientes que ya están escritas. Nunca pinta el `message` del servidor.
 */

const SIN_RED = "Can't reach Cycling Star. Check your connection and try again."
const OTRO = 'Something went wrong. Try again in a minute.'

describe('waitText', () => {
  it.each([
    [1, '1 second'],
    [45, '45 seconds'],
    [60, '1 minute'],
    [61, '2 minutes'],
    [238, '4 minutes'],
    [240, '4 minutes'],
    [899, '15 minutes'],
  ])('%i s da «%s»', (s, texto) => {
    expect(waitText(s)).toBe(texto)
  })

  it('nunca menos de un segundo', () => {
    expect(waitText(0)).toBe('1 second')
    expect(waitText(-3)).toBe('1 second')
  })
})

describe('countdownText', () => {
  it('minutos y segundos, con dos cifras en los segundos', () => {
    expect(countdownText(238)).toBe('You can try again in 3:58.')
    expect(countdownText(45)).toBe('You can try again in 0:45.')
    expect(countdownText(60)).toBe('You can try again in 1:00.')
  })
})

describe('authErrorText', () => {
  it('status 0: sin red', () => {
    expect(authErrorText(null, 0, null)).toBe(SIN_RED)
  })

  it('429 de Fastify, con retryAfterS de 45 y de 240: cuánto esperar, nunca «contraseña mala»', () => {
    const body = { error: 'demasiadas_peticiones', message: 'Too many requests' }
    expect(authErrorText({ ...body, retryAfterS: 45 }, 429, 45)).toBe(
      'Too many attempts from this connection. Try again in 45 seconds.',
    )
    expect(authErrorText({ ...body, retryAfterS: 240 }, 429, 240)).toBe(
      'Too many attempts from this connection. Try again in 4 minutes.',
    )
  })

  it('429 que trae la espera solo en el cuerpo', () => {
    expect(authErrorText({ error: 'demasiadas_peticiones', retryAfterS: 45 }, 429, null)).toBe(
      'Too many attempts from this connection. Try again in 45 seconds.',
    )
  })

  it('429 del limitador de better-auth, sin código ni espera: un minuto', () => {
    expect(
      authErrorText({ message: 'Too many requests. Please try again later.' }, 429, null),
    ).toBe('Too many attempts from this connection. Try again in 1 minute.')
  })

  it('los 429 con código propio (los de PR siguientes)', () => {
    expect(authErrorText({ code: 'ACCOUNT_LOCKED' }, 429, 900)).toBe(
      'Too many failed attempts on this account. Try again in 15 minutes, or reset your password.',
    )
    expect(authErrorText({ code: 'PASSWORD_ATTEMPTS_LOCKED' }, 429, 900)).toBe(
      'Too many wrong passwords. Try again in 15 minutes.',
    )
    expect(authErrorText({ code: 'EXPORT_LIMIT' }, 429, 3600)).toBe(
      "You've downloaded your data 3 times today. Try again tomorrow.",
    )
  })

  it('401 INVALID_EMAIL_OR_PASSWORD, con su punto', () => {
    expect(
      authErrorText(
        { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
        401,
        null,
      ),
    ).toBe('Wrong email or password.')
  })

  it('400 INVALID_PASSWORD', () => {
    expect(authErrorText({ code: 'INVALID_PASSWORD' }, 400, null)).toBe(
      "That's not your current password.",
    )
  })

  it('403 EMAIL_NOT_VERIFIED: ningún texto, lo dice el Notice de la página', () => {
    expect(authErrorText({ code: 'EMAIL_NOT_VERIFIED' }, 403, null)).toBeNull()
  })

  it('403 ACCOUNT_PENDING: ningún texto, lo dice el Notice de Login (§4.9)', () => {
    expect(authErrorText({ code: 'ACCOUNT_PENDING' }, 403, null)).toBeNull()
  })

  it('400 PASSWORD_TOO_SHORT y PASSWORD_TOO_LONG', () => {
    expect(authErrorText({ code: 'PASSWORD_TOO_SHORT' }, 400, null)).toBe(
      'Use at least 8 characters.',
    )
    expect(authErrorText({ code: 'PASSWORD_TOO_LONG' }, 400, null)).toBe(
      'Your password can be at most 128 characters.',
    )
  })

  it('400 INVALID_TOKEN y TOKEN_EXPIRED, el mismo texto', () => {
    const texto = 'This link has expired or has already been used.'
    expect(authErrorText({ code: 'INVALID_TOKEN' }, 400, null)).toBe(texto)
    expect(authErrorText({ code: 'TOKEN_EXPIRED' }, 400, null)).toBe(texto)
  })

  it('503 MAIL_BUDGET_EXHAUSTED (PR siguiente), sin espera', () => {
    expect(authErrorText({ code: 'MAIL_BUDGET_EXHAUSTED' }, 503, null)).toBe(
      "We can't send emails right now. Try again tomorrow.",
    )
  })

  it('cualquier otro, y nunca el message del servidor', () => {
    expect(authErrorText({ code: 'ALGO_NUEVO', message: 'Internal detail' }, 400, null)).toBe(OTRO)
    expect(authErrorText({ error: 'interno' }, 500, null)).toBe(OTRO)
    expect(authErrorText(null, 502, null)).toBe(OTRO)
  })
})
