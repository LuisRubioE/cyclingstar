import type {
  AdminWhoami,
  Health,
  HorizonSummary,
  MeAccountResponse,
  Theme,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ME_ACCOUNT_KEY } from '../components/ProtectedRoute'
import { THEME_QUERY_KEY } from '../theme'
import { Account, devicesValue, passwordValue } from './Account'
import { healthWith, horizonWith } from './__fixtures__/world'
import { pieza, respuestas, titulo } from './__fixtures__/markup'

/**
 * `Account` COMO LISTA (docs/cuenta.md §12.1; DD-07 A; PR 11 de E4), en estático con la caché ya llena: la
 * cabecera con el correo y el alta, el aviso del correo que no llega encima, `Admin panel` solo para
 * administradores, `Your account` (lo que contesta) y `The game` con una fila por tarea, cada una a su
 * subpágina y con su valor de `GET /api/me/account`; `Notifications` y `Away` todavía no; y debajo `Sign out`
 * y `Shared computer? Forget this device`.
 */

vi.mock('../auth/client', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}))

const ESTE_AÑO = new Date().getFullYear()
const CUENTA: MeAccountResponse = {
  ok: true,
  email: 'luis@example.com',
  joinedAt: new Date(ESTE_AÑO, 10, 12, 12).toISOString(),
  birthDateSet: true,
  passwordChangedAt: new Date(ESTE_AÑO, 10, 12, 12).toISOString(),
  devices: 3,
  emailUndeliverableAt: null,
}

function page({
  veil = true,
  horizon = {},
  admin = false,
  theme,
  cuenta = CUENTA,
}: {
  veil?: boolean
  horizon?: Partial<HorizonSummary>
  admin?: boolean
  theme?: Theme
  /** null: todavía sin llegar */
  cuenta?: MeAccountResponse | null
} = {}): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const health: Health = healthWith('on', veil ? 'on' : 'off')
  client.setQueryData(['health'], health)
  client.setQueryData(['horizon'], horizonWith(horizon))
  if (theme !== undefined) client.setQueryData(THEME_QUERY_KEY, { theme })
  if (cuenta !== null) client.setQueryData(ME_ACCOUNT_KEY, cuenta)
  client.setQueryData(
    ['admin-whoami'],
    admin ? ({ ok: true, via: 'session', userId: 'u1' } as AdminWhoami) : null,
  )
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/account']}>
        <Account />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Las filas de un `Panel`, como `título → valor → destino`. */
const filas = (markup: string, panel: string): string[] => {
  const p = pieza(markup, 'Panel', `>${panel}</h2>`)
  return [
    ...p.matchAll(
      /<li data-ui="ActionRow"[\s\S]*?<a ([^>]*)><span[^>]*>([^<]*)<\/span><span[^>]*>([^<]*)<\/span>/g,
    ),
  ].map((m) => `${m[2]} → ${m[3]} → ${/href="([^"]+)"/.exec(m[1]!)?.[1]}`)
}

describe('Account como lista (§12.1; DD-07 A)', () => {
  it('la cabecera: Account, con el correo y el alta; una sola respuesta, Your account', () => {
    const markup = page()
    expect(titulo(markup)).toBe('Account')
    expect(pieza(markup, 'PageHeader', 'Account')).toContain(
      `>luis@example.com · Joined 12 Nov ${ESTE_AÑO}</p>`,
    )
    expect(respuestas(markup)).toBe(1)
    expect(pieza(markup, 'Panel', '>Your account</h2>')).toContain('data-answer=""')
    expect(markup).toMatch(/^<section class="[^"]*max-w-form/)
  })

  it('Your account: cinco filas, cada una a su subpágina y con su valor', () => {
    expect(filas(page(), 'Your account')).toEqual([
      'Email → luis@example.com → /account/email',
      'Password → Changed 12 Nov → /account/password',
      'Devices → 3 signed in → /account/devices',
      'Your data → Download a copy → /account/data',
      'Delete account →  → /account/delete',
    ])
  })

  it('The game: la protección (con el velo) y el modo; Notifications y Away todavía no', () => {
    expect(filas(page({ horizon: { scope: 'own_only' }, theme: 'dark' }), 'The game')).toEqual([
      'Spoiler protection → Only yours → /account/spoilers',
      'Appearance → Dark → /account/appearance',
    ])
    expect(filas(page({ veil: false }), 'The game')).toEqual([
      'Appearance → Light → /account/appearance',
    ])
    const markup = page()
    expect(markup).not.toContain('Notifications')
    expect(markup).not.toContain('>Away<')
  })

  it('los valores: Changed con la fecha o Set, y los aparatos', () => {
    const ahora = new Date(2026, 10, 23, 12)
    expect(passwordValue(new Date(2026, 10, 12, 12).toISOString(), ahora)).toBe('Changed 12 Nov')
    expect(passwordValue(new Date(2025, 0, 2, 12).toISOString(), ahora)).toBe('Changed 2 Jan 2025')
    expect(passwordValue(null, ahora)).toBe('Set')
    expect(devicesValue(1)).toBe('1 signed in')
  })

  it('sin la cuenta todavía, la cabecera espera y las filas salen sin valor', () => {
    const markup = page({ cuenta: null })
    expect(pieza(markup, 'PageHeader', 'Account')).toContain('data-state="loading"')
    expect(filas(markup, 'Your account')[0]).toBe('Email →  → /account/email')
  })

  it('el correo que no llega, un Notice warn sin acción encima de las filas (§9.3)', () => {
    const markup = page({ cuenta: { ...CUENTA, emailUndeliverableAt: '2026-11-23T12:00:00.000Z' } })
    const notice = pieza(markup, 'Notice', 'We can&#x27;t deliver email to luis@example.com')
    expect(notice).toContain(
      'Without it you can&#x27;t reset your password if you forget it. Only an administrator can change the email of an account.',
    )
    expect(notice).not.toContain('<button')
    expect(markup.indexOf('deliver email')).toBeLessThan(markup.indexOf('data-ui="Panel"'))
    expect(page()).not.toContain('deliver email')
  })

  it('Admin panel, un enlace de 44, y solo con sesión de admin', () => {
    const enlace = /<a ([^>]*)>Admin panel<\/a>/.exec(page({ admin: true }))?.[1] ?? ''
    expect(enlace).toContain('href="/admin"')
    expect(enlace).toContain('min-h-11')
    expect(page()).not.toContain('Admin panel')
  })

  it('debajo, Sign out y Shared computer? Forget this device (12-i)', () => {
    const markup = page()
    expect(pieza(markup, 'Button', 'Sign out')).toMatch(/data-variant="secondary"/)
    expect(pieza(markup, 'Button', 'Shared computer? Forget this device')).toMatch(
      /data-variant="quiet"/,
    )
    expect(markup.indexOf('>Sign out<')).toBeLessThan(markup.indexOf('Forget this device'))
  })

  it('ni formularios ni campos en la lista: cada tarea en su subpágina', () => {
    const markup = page({ admin: true })
    expect(markup).not.toContain('<form')
    expect(markup).not.toContain('<input')
    for (const b of markup.match(/<button\b[^>]*>/g) ?? []) expect(b, b).toMatch(/data-ui="Button"/)
  })
})
