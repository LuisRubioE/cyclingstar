import { describe, expect, it } from 'vitest'
import { authErrorMessage, readResetLink, readVerificationLink } from './authLinks'

describe('readResetLink', () => {
  it('saca el token del enlace bueno', () => {
    expect(readResetLink('?token=abc123')).toEqual({ kind: 'token', token: 'abc123' })
  })

  /* El caso MÁS probable de todos: los enlaces de better-auth caducan en una hora. */
  it('traduce el enlace caducado a qué hacer ahora', () => {
    const out = readResetLink('?error=TOKEN_EXPIRED')
    expect(out.kind).toBe('error')
    expect(out).toMatchObject({ message: expect.stringContaining('expired') })
  })

  it('el error manda aunque venga también un token', () => {
    expect(readResetLink('?error=INVALID_TOKEN&token=abc').kind).toBe('error')
  })

  /* Sin token no hay formulario posible: pedir una contraseña nueva ahí sería mentir al usuario. */
  it('sin token ni error no enseña formulario', () => {
    expect(readResetLink('')).toEqual({
      kind: 'error',
      message: 'Open this page from the link in your email.',
    })
  })
})

describe('readVerificationLink', () => {
  /* Aquí lo normal es llegar SIN parámetros: el servidor redirige limpio cuando todo fue bien. */
  it('sin parámetros es que ha ido bien', () => {
    expect(readVerificationLink('')).toEqual({ kind: 'ok' })
  })

  it('con error, lo cuenta', () => {
    expect(readVerificationLink('?error=EMAIL_ALREADY_VERIFIED')).toMatchObject({ kind: 'error' })
  })
})

describe('authErrorMessage', () => {
  it('un código desconocido no deja al usuario sin instrucciones', () => {
    expect(authErrorMessage('ALGO_NUEVO')).toContain('Ask for a new one')
  })

  it('cada código conocido dice algo distinto', () => {
    const codes = [
      'TOKEN_EXPIRED',
      'INVALID_TOKEN',
      'USER_NOT_FOUND',
      'EMAIL_ALREADY_VERIFIED',
      'INVALID_USER',
    ]
    expect(new Set(codes.map(authErrorMessage)).size).toBe(codes.length)
  })
})
