import { describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { REDACTED, loggerOptions, redactUrl } from './redact.js'

// Un JWT de verificación como los de better-auth: su cuerpo es {"email":"luis@example.com"}.
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6Imx1aXNAZXhhbXBsZS5jb20ifQ.c2lnbmF0dXJhLWZhbHNh'

describe('redactUrl', () => {
  it('tapa token, callbackURL y todo parámetro con email en el nombre', () => {
    expect(redactUrl(`/api/auth/verify-email?token=${JWT}&callbackURL=%2Fverify-email`)).toBe(
      `/api/auth/verify-email?token=${REDACTED}&callbackURL=${REDACTED}`,
    )
    expect(redactUrl('/x?newEmail=a%40b.com&page=2')).toBe(`/x?newEmail=${REDACTED}&page=2`)
    expect(redactUrl('/x?TOKEN=abc')).toBe(`/x?TOKEN=${REDACTED}`)
  })

  it('tapa el segmento de /reset-password/', () => {
    expect(redactUrl('/api/auth/reset-password/abc123?callbackURL=%2Freset')).toBe(
      `/api/auth/reset-password/${REDACTED}?callbackURL=${REDACTED}`,
    )
  })

  it('deja igual lo que no es secreto', () => {
    expect(redactUrl('/api/world/races?season=3')).toBe('/api/world/races?season=3')
    expect(redactUrl('/health')).toBe('/health')
  })

  it('un nombre de parámetro que no se entiende se tapa entero', () => {
    expect(redactUrl('/x?%E0%A4%A=1&page=2')).toBe(`/x?${REDACTED}&page=2`)
  })
})

describe('los logs de la API no llevan enlaces de cuenta (E4 PR 4)', () => {
  it('ninguna línea de una petición con token o correo lleva eyJ ni una arroba', async () => {
    const lines: string[] = []
    const app = buildApp({
      logger: loggerOptions('info', { stream: { write: (m) => lines.push(m) } }),
    })
    await app.ready()
    for (const url of [
      `/api/auth/verify-email?token=${JWT}&callbackURL=%2Fverify-email`,
      '/api/auth/reset-password/tok-de-recuperacion?callbackURL=%2Freset-password',
      '/reset-password?token=tok-de-recuperacion',
      '/whatever?email=luis%40example.com',
    ]) {
      await app.inject({ method: 'GET', url })
    }
    await app.close()
    const requestLines = lines.filter((l) => l.includes('incoming request'))
    expect(requestLines.length).toBeGreaterThanOrEqual(4)
    for (const line of lines) {
      expect(line).not.toContain('eyJ')
      expect(line).not.toContain('@')
      expect(line).not.toContain('%40')
      expect(line).not.toContain('tok-de-recuperacion')
    }
  })
})
