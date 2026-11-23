import { describe, expect, it, vi } from 'vitest'
import { forgetLinkToken, readEmailLink } from './authLinks'

/** Lo que trae un enlace de correo al llegar a su página de botón (docs/cuenta.md §5.2; PR 8). */
describe('readEmailLink', () => {
  it('el token va en el fragmento, que el navegador no manda al servidor', () => {
    expect(readEmailLink('#token=eyJ.abc.def', '')).toEqual({ kind: 'token', token: 'eyJ.abc.def' })
  })

  /* La gracia de los enlaces viejos (LEGACY_LINK_GRACE_DAYS, hasta el PR 19). */
  it('el enlace viejo, con ?token=, sigue valiendo', () => {
    expect(readEmailLink('', '?token=abc123')).toEqual({ kind: 'token', token: 'abc123' })
  })

  it('el enlace viejo que ya no valía trae su código, y el error manda sobre el token de la consulta', () => {
    expect(readEmailLink('', '?error=TOKEN_EXPIRED')).toEqual({
      kind: 'error',
      code: 'TOKEN_EXPIRED',
    })
    expect(readEmailLink('', '?error=INVALID_TOKEN&token=abc')).toEqual({
      kind: 'error',
      code: 'INVALID_TOKEN',
    })
  })

  it('el fragmento manda sobre la consulta', () => {
    expect(readEmailLink('#token=nuevo', '?error=INVALID_TOKEN')).toEqual({
      kind: 'token',
      token: 'nuevo',
    })
  })

  it('sin nada, no trae nada', () => {
    expect(readEmailLink('', '')).toEqual({ kind: 'none' })
    expect(readEmailLink('#token=', '')).toEqual({ kind: 'none' })
  })
})

describe('forgetLinkToken', () => {
  it('borra el token de la barra con replaceState, y solo si lo lleva', () => {
    const replaceState = vi.fn()
    const h = { replaceState } as unknown as History
    forgetLinkToken({ pathname: '/verify-email', search: '', hash: '#token=abc' }, h)
    expect(replaceState).toHaveBeenCalledWith(null, '', '/verify-email')
    forgetLinkToken({ pathname: '/reset-password', search: '?token=abc', hash: '' }, h)
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/reset-password')
    replaceState.mockClear()
    forgetLinkToken({ pathname: '/verify-email', search: '?error=INVALID_TOKEN', hash: '' }, h)
    expect(replaceState).not.toHaveBeenCalled()
  })
})
