import { describe, expect, it } from 'vitest'
import { DEVICE_COOKIE, createDeviceCookies } from './deviceCookie.js'

/**
 * `cs_device` CON DOS CUENTAS EN EL MISMO NAVEGADOR (docs/cuenta.md §6.5 y §7.5; 6-g, 6-h; PR 11). Reemitir
 * la entrada de una, como hace `sign-out-others` con el epoch nuevo, deja la de la otra igual byte a byte;
 * olvidar una (`Forget this device`) quita solo la suya, y sin otras borra la cookie. De punta a punta, con
 * las rutas, en `devices.test.ts`.
 */
const cookies = createDeviceCookies('s'.repeat(32), true)
const UNO = { id: 'u-uno', deviceEpoch: 0 }
const DOS = { id: 'u-dos', deviceEpoch: 3 }

/** `nombre=valor` de una cabecera `Set-Cookie`. */
const valor = (setCookie: string): string => setCookie.split(';')[0]!

describe('cs_device con dos cuentas (6-g, 6-h)', () => {
  const ambas = valor(
    cookies.issue(
      cookies.read(valor(cookies.issue([], 'uno@example.com', UNO))),
      'dos@example.com',
      DOS,
    ),
  )
  const deDos = ambas.split('=')[1]!.split('~')[1]!

  it('reemitir la de una con el epoch nuevo deja intacta la de la otra', () => {
    const nueva = valor(
      cookies.issue(cookies.read(ambas), 'uno@example.com', { ...UNO, deviceEpoch: 1 }),
    )
    expect(nueva.split('=')[1]!.split('~')).toContain(deDos)
    const entradas = cookies.read(nueva)
    expect(cookies.validFor(entradas, 'dos@example.com', DOS)).not.toBeNull()
    expect(cookies.validFor(entradas, 'uno@example.com', { ...UNO, deviceEpoch: 1 })).not.toBeNull()
    expect(cookies.validFor(entradas, 'uno@example.com', UNO)).toBeNull()
  })

  it('olvidar una quita solo la suya, con la misma forma de cookie', () => {
    const cabecera = cookies.forget(cookies.read(ambas), 'UNO@example.com ')
    expect(cabecera).toMatch(
      new RegExp(
        `^${DEVICE_COOKIE}=[^;~]+; Path=/api/auth; Max-Age=15552000; HttpOnly; SameSite=Lax; Secure$`,
      ),
    )
    expect(valor(cabecera)).toBe(`${DEVICE_COOKIE}=${deDos}`)
    expect(cookies.validFor(cookies.read(valor(cabecera)), 'uno@example.com', UNO)).toBeNull()
  })

  it('olvidar la única borra la cookie; olvidar una que no está no toca las otras', () => {
    const sola = valor(cookies.issue([], 'uno@example.com', UNO))
    expect(cookies.forget(cookies.read(sola), 'uno@example.com')).toMatch(
      new RegExp(`^${DEVICE_COOKIE}=; Path=/api/auth; Max-Age=0; HttpOnly; SameSite=Lax; Secure$`),
    )
    expect(valor(cookies.forget(cookies.read(ambas), 'nadie@example.com'))).toBe(ambas)
  })
})
