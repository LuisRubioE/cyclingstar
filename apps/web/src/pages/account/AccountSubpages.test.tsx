import type { DevicesResponse, Health, HorizonSummary } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { campo, estado, pieza, respuestas, titulo } from '../__fixtures__/markup'
import { healthWith, horizonWith } from '../__fixtures__/world'
import { AccountAppearance } from './AccountAppearance'
import { AccountData } from './AccountData'
import { AccountDelete } from './AccountDelete'
import { AccountDevices, DEVICES_KEY } from './AccountDevices'
import { AccountEmail } from './AccountEmail'
import { AccountPassword, passwordFormProblem } from './AccountPassword'
import { AccountSpoilers } from './AccountSpoilers'

/**
 * LAS SUBPÁGINAS DE `Account` (docs/cuenta.md §12.2; DD-07 A; PR 11 de E4), en estático y en cada estado: cada
 * una con su `PageHeader` y `‹ Account` para volver, y una sola respuesta. Los textos, los del diseño.
 */

const sesion = vi.hoisted(() => ({
  user: { id: 'u1', email: 'luis@example.com', emailVerified: true } as {
    id: string
    email: string
    emailVerified: boolean
  } | null,
}))

vi.mock('../../auth/client', () => ({
  authClient: {
    useSession: () => ({ data: sesion.user ? { user: sesion.user } : null, isPending: false }),
  },
}))

beforeEach(() => {
  sesion.user = { id: 'u1', email: 'luis@example.com', emailVerified: true }
})

function pinta(
  path: string,
  el: ReactElement,
  cache: { devices?: DevicesResponse; veil?: boolean; horizon?: Partial<HorizonSummary> } = {},
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const health: Health = healthWith('on', cache.veil === false ? 'off' : 'on')
  client.setQueryData(['health'], health)
  client.setQueryData(['horizon'], horizonWith(cache.horizon ?? {}))
  client.setQueryData(['admin-whoami'], null)
  if (cache.devices !== undefined) client.setQueryData(DEVICES_KEY, cache.devices)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{el}</MemoryRouter>
    </QueryClientProvider>,
  )
}

/** La cabecera de una subpágina: su título, uno, y la vuelta a `Account`. */
function cabecera(markup: string, title: string): void {
  expect(titulo(markup)).toBe(title)
  expect(pieza(markup, 'PageHeader', title)).toMatch(
    /data-variant="back"[\s\S]*?<a [^>]*href="\/account"[^>]*>[\s\S]*?Account<\/a>/,
  )
  expect(respuestas(markup)).toBe(1)
}

describe('Email (§12.2; 12-a)', () => {
  it('el correo y dos frases, sin formulario', () => {
    const markup = pinta('/account/email', <AccountEmail />)
    cabecera(markup, 'Email')
    expect(markup).toContain('luis@example.com')
    expect(markup).toContain('Your email can only be changed by an administrator.')
    expect(markup).toContain(
      'If you lose access to this email, you won&#x27;t be able to recover your account.',
    )
    expect(markup).not.toContain('<form')
    expect(markup).not.toContain('<input')
    expect(markup).not.toContain('not confirmed')
  })

  it('sin confirmar, el aviso de hoy encima, con su acción', () => {
    sesion.user = { id: 'u1', email: 'luis@example.com', emailVerified: false }
    const markup = pinta('/account/email', <AccountEmail />)
    const notice = pieza(markup, 'Notice', 'Your email is not confirmed')
    expect(notice).toMatch(/data-variant="warn"/)
    expect(notice).toContain(
      'You will need it the next time you log in, and to recover your account if you ever lose your password.',
    )
    expect(notice).toContain('Send me a confirmation link')
    expect(markup.indexOf('not confirmed')).toBeLessThan(markup.indexOf('data-answer'))
  })
})

describe('Password (§12.2; 12-c)', () => {
  it('la frase, la actual y la nueva con Show, sin Confirm, y Update password', () => {
    const markup = pinta('/account/password', <AccountPassword />)
    cabecera(markup, 'Password')
    expect(markup).toContain('Changing your password signs you out of your other devices.')
    for (const [id, label, auto] of [
      ['cur-pw', 'Current password', 'current-password'],
      ['new-pw', 'New password', 'new-password'],
    ] as const) {
      const f = campo(markup, id)
      expect(f).toMatch(new RegExp(`<label for="${id}"[^>]*>${label}</label>`))
      expect(f).toMatch(new RegExp(`type="password"[^>]*autoComplete="${auto}"`))
      expect(f).toMatch(/>Show</)
    }
    expect(campo(markup, 'new-pw')).toContain('At least 8 characters.')
    expect(markup).not.toContain('Confirm new password')
    expect(pieza(markup, 'Button', 'Update password')).toMatch(/type="submit"/)
  })

  it('lo que falta se dice sin llamar a la API: la actual vacía, la nueva corta o larga', () => {
    expect(passwordFormProblem('', 'contrasena-nueva')).toEqual({
      field: 'current',
      msg: 'Enter your current password.',
    })
    expect(passwordFormProblem('vieja', 'corta')).toEqual({
      field: 'next',
      msg: 'Use at least 8 characters.',
    })
    expect(passwordFormProblem('vieja', 'x'.repeat(129))).toEqual({
      field: 'next',
      msg: 'Your password can be at most 128 characters.',
    })
    expect(passwordFormProblem('vieja', 'x'.repeat(128))).toBeNull()
  })

  it('el error en su campo', () => {
    const markup = pinta(
      '/account/password',
      <AccountPassword
        initial={{ fieldError: { field: 'current', msg: 'Enter your current password.' } }}
      />,
    )
    expect(estado(campo(markup, 'cur-pw'))).toBe('error')
    expect(campo(markup, 'cur-pw')).toContain('Enter your current password.')
  })

  it('la actual mala y L3, con la tabla única, como alert', () => {
    for (const msg of [
      'That&#x27;s not your current password.',
      'Too many wrong passwords. Try again in 15 minutes.',
    ]) {
      const markup = pinta(
        '/account/password',
        <AccountPassword initial={{ status: { kind: 'err', msg: msg.replace('&#x27;', "'") } }} />,
      )
      expect(markup).toContain(`<p role="alert" class="text-meta text-bad">${msg}</p>`)
    }
  })

  it('guardada: Notice good Password updated, con su frase', () => {
    const markup = pinta('/account/password', <AccountPassword initial={{ saved: true }} />)
    const notice = pieza(markup, 'Notice', 'Password updated')
    expect(notice).toMatch(/data-variant="good"[^>]*role="status"/)
    expect(notice).toContain('You&#x27;ve been signed out of your other devices.')
  })
})

const ahora = Date.now()
const iso = (msAtras: number): string => new Date(ahora - msAtras).toISOString()
const DIA = 86_400_000
const TRES: DevicesResponse = {
  ok: true,
  devices: [
    {
      id: 'a'.repeat(16),
      label: 'Chrome on Android',
      current: true,
      createdAt: iso(3 * DIA),
      lastActiveAt: iso(0),
    },
    {
      id: 'b'.repeat(16),
      label: 'Safari on iPhone',
      current: false,
      createdAt: iso(5 * DIA),
      lastActiveAt: iso(2 * DIA),
    },
    {
      id: 'c'.repeat(16),
      label: 'Firefox on Windows',
      current: false,
      createdAt: iso(40 * DIA),
      lastActiveAt: iso(30 * DIA),
    },
  ],
}

describe('Devices (§12.2; 12-g)', () => {
  it('cargando, el Panel en loading', () => {
    const markup = pinta('/account/devices', <AccountDevices />)
    cabecera(markup, 'Devices')
    expect(pieza(markup, 'PageHeader', 'Devices')).toContain('data-state="loading"')
    expect(markup).toMatch(/data-ui="QueryView" data-state="loading"/)
  })

  it('las tres: la línea, la propia This device y Active now, las otras con su Sign out, y Sign out everywhere else', () => {
    const markup = pinta('/account/devices', <AccountDevices />, { devices: TRES })
    expect(pieza(markup, 'PageHeader', 'Devices')).toContain(
      '>You&#x27;re signed in on 3 devices.</p>',
    )
    const propia = pieza(markup, 'ActionRow', 'Chrome on Android')
    expect(propia).toContain('This device')
    expect(propia).toMatch(/Active now · Signed in \d+ [A-Z][a-z]{2}/)
    expect(propia).not.toContain('<button')
    const iphone = pieza(markup, 'ActionRow', 'Safari on iPhone')
    expect(iphone).toContain('Active 2 days ago · Signed in')
    expect(iphone).toMatch(/<button[^>]*aria-label="Sign out of Safari on iPhone"[\s\S]*?Sign out/)
    // pasados 7 días, la fecha
    expect(pieza(markup, 'ActionRow', 'Firefox on Windows')).toMatch(
      /Active \d+ [A-Z][a-z]{2}( \d{4})? · Signed in/,
    )
    expect(pieza(markup, 'Button', 'Sign out everywhere else')).not.toBe('')
    // nada de IP ni del agente
    expect(markup).not.toMatch(/Mozilla|\d+\.\d+\.\d+\.\d+/)
  })

  it('solo este aparato: You’re only signed in here., sin botones', () => {
    const markup = pinta('/account/devices', <AccountDevices />, {
      devices: { ok: true, devices: [TRES.devices[0]!] },
    })
    expect(pieza(markup, 'PageHeader', 'Devices')).toContain(
      '>You&#x27;re only signed in here.</p>',
    )
    expect(markup).not.toContain('Sign out everywhere else')
    expect(markup).not.toMatch(/aria-label="Sign out of/)
  })

  it('cerrada una, su Notice good', () => {
    const markup = pinta(
      '/account/devices',
      <AccountDevices initial={{ done: 'Signed out of Safari on iPhone.' }} />,
      { devices: TRES },
    )
    expect(pieza(markup, 'Notice', 'Signed out of Safari on iPhone.')).toMatch(
      /data-variant="good"[^>]*role="status"/,
    )
  })

  it('Sign out everywhere else pregunta en una Sheet: Sign out of 2 other devices? / Sign out / Cancel', () => {
    const markup = pinta('/account/devices', <AccountDevices initial={{ confirming: true }} />, {
      devices: TRES,
    })
    const hoja = pieza(markup, 'Sheet', 'Sign out of 2 other devices?')
    expect(hoja).not.toBe('')
    expect(pieza(hoja, 'Button', '>Sign out<')).toMatch(/data-variant="danger"/)
    expect(pieza(hoja, 'Button', 'Cancel')).toMatch(/data-variant="quiet"/)
  })

  it('confirmado, Signed out of 2 other devices.; y el error, con la tabla única', () => {
    const hecho = pinta(
      '/account/devices',
      <AccountDevices initial={{ done: 'Signed out of 2 other devices.' }} />,
      { devices: { ok: true, devices: [TRES.devices[0]!] } },
    )
    expect(hecho).toContain('Signed out of 2 other devices.')
    const fallo = pinta(
      '/account/devices',
      <AccountDevices
        initial={{ error: "Can't reach Cycling Star. Check your connection and try again." }}
      />,
      { devices: TRES },
    )
    expect(
      pieza(fallo, 'Notice', 'Can&#x27;t reach Cycling Star. Check your connection and try again.'),
    ).toMatch(/data-variant="bad"[^>]*role="alert"/)
  })
})

describe('Your data (§12.2; PR 12)', () => {
  it('la frase, la contraseña con Show y Download my data', () => {
    const markup = pinta('/account/data', <AccountData />)
    cabecera(markup, 'Your data')
    expect(markup).toContain('Download a copy of everything we keep about you, as a JSON file.')
    const f = campo(markup, 'data-pw')
    expect(f).toMatch(/<label for="data-pw"[^>]*>Password<\/label>/)
    expect(f).toMatch(/type="password"[^>]*autoComplete="current-password"/)
    expect(f).toMatch(/>Show</)
    expect(pieza(markup, 'Button', 'Download my data')).toMatch(/type="submit"/)
  })

  it('vacía, en su campo; mala y la cuarta del día, como alert con la tabla única (§12.3)', () => {
    const vacia = pinta(
      '/account/data',
      <AccountData initial={{ fieldError: 'Enter your password to download your data.' }} />,
    )
    expect(estado(campo(vacia, 'data-pw'))).toBe('error')
    expect(campo(vacia, 'data-pw')).toContain('Enter your password to download your data.')
    const cuarta = pinta(
      '/account/data',
      <AccountData
        initial={{
          status: {
            kind: 'err',
            msg: "You've downloaded your data 3 times today. Try again tomorrow.",
          },
        }}
      />,
    )
    expect(cuarta).toContain(
      '<p role="alert" class="text-meta text-bad">You&#x27;ve downloaded your data 3 times today. Try again tomorrow.</p>',
    )
  })
})

describe('Delete account (§12.2; 12-d)', () => {
  it('abierta desde el principio: la frase de hoy, la copia antes, la contraseña con Show, danger y Cancel', () => {
    const markup = pinta('/account/delete', <AccountDelete />)
    cabecera(markup, 'Delete account')
    expect(markup).toContain(
      'This cannot be undone. Your rider and your team stay in the world, run by the game, and your email becomes free to use on another account.',
    )
    expect(markup).toMatch(
      /Want a copy first\? <a [^>]*href="\/account\/data"[^>]*>Download my data/,
    )
    expect(markup).not.toContain('Delete my account…')
    const f = campo(markup, 'delete-pw')
    expect(f).toMatch(/<label for="delete-pw"[^>]*>Password<\/label>/)
    expect(f).toMatch(/type="password"[^>]*autoComplete="current-password"/)
    expect(f).toMatch(/>Show</)
    expect(pieza(markup, 'Button', 'Delete my account')).toMatch(
      /type="submit"[^>]*data-variant="danger"/,
    )
    expect(pieza(markup, 'Button', 'Cancel')).toMatch(/href="\/account"/)
  })

  it('vacía, en su campo; mala, como alert', () => {
    const vacia = pinta(
      '/account/delete',
      <AccountDelete initial={{ fieldError: 'Enter your password to delete your account.' }} />,
    )
    expect(estado(campo(vacia, 'delete-pw'))).toBe('error')
    expect(campo(vacia, 'delete-pw')).toContain('Enter your password to delete your account.')
    const mala = pinta(
      '/account/delete',
      <AccountDelete
        initial={{ status: { kind: 'err', msg: "That's not your current password." } }}
      />,
    )
    expect(mala).toContain(
      '<p role="alert" class="text-meta text-bad">That&#x27;s not your current password.</p>',
    )
  })
})

describe('Spoiler protection y Appearance (§12.2): los paneles de E2 y E3, movidos', () => {
  it('la protección, con su Panel de siempre y sus dos elecciones', () => {
    const markup = pinta('/account/spoilers', <AccountSpoilers />, {
      horizon: { scope: 'own_only' },
    })
    cabecera(markup, 'Spoiler protection')
    expect(markup).toContain('role="radiogroup" aria-label="Races to protect"')
    expect(markup).toContain('role="radiogroup" aria-label="Ask before showing a result"')
  })

  it('sin el velo para quien mira, no hay nada que elegir: la página no pinta nada (vuelve a Account)', () => {
    expect(pinta('/account/spoilers', <AccountSpoilers />, { veil: false })).toBe('')
  })

  it('el modo, Light y Dark', () => {
    const markup = pinta('/account/appearance', <AccountAppearance />)
    cabecera(markup, 'Appearance')
    expect(markup).toMatch(/role="radiogroup" aria-label="Appearance"[\s\S]*?Light[\s\S]*?Dark/)
  })
})
