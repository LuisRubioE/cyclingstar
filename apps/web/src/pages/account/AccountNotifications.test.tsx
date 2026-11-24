import type { NoticesResponse } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { NOTICES_KEY } from '../../api/notices'
import { NoticeAsk } from '../../components/NoticeAsk'
import { NoticeOptOutView, noticeOptOutKind } from '../../components/NoticeOptOut'
import { pieza } from '../__fixtures__/markup'
import { type BrowserState, notificationsValue } from '../../notifications/push'
import { AccountNotifications } from './AccountNotifications'

/**
 * `Account › Notifications` (docs/cuenta.md §13.4; PR 14 de E4) en los ocho estados de su tabla: sin VAPID,
 * sin soporte, el iPhone fuera de la pantalla de inicio (con la explicación de iOS 16.4), sin decidir,
 * bloqueado, concedido sin suscripción, encendido y el fallo al suscribir. Y los dos `Notice` del permiso
 * (§13.3), con `See how` en el iPhone.
 */

vi.mock('../../auth/client', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}))

const INFO: NoticesResponse = {
  ok: true,
  enabled: true,
  publicKey: 'B'.repeat(87),
  prefs: {
    stage_digest: true,
    stage_ready: false,
    plan_ending: true,
    offer_received: true,
    away_warning: true,
    away_over: true,
  },
  timeZone: 'Europe/Madrid',
  targets: [
    {
      id: 'a',
      label: 'Chrome on Android',
      createdAt: '2026-11-20T10:00:00.000Z',
      lastOkAt: null,
      current: true,
    },
    {
      id: 'b',
      label: 'Firefox on Windows',
      createdAt: '2026-11-12T10:00:00.000Z',
      lastOkAt: null,
      current: false,
    },
  ],
}

function pinta(el: ReactElement, info: NoticesResponse = INFO): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(NOTICES_KEY, info)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/account/notifications']}>{el}</MemoryRouter>
    </QueryClientProvider>,
  )
}
const en = (browser: BrowserState, failed = false) =>
  pinta(<AccountNotifications initial={{ browser, failed }} />)

describe('Notifications, el panel This browser (§13.4)', () => {
  it('sin las tres VAPID: una frase y nada más', () => {
    const markup = pinta(<AccountNotifications initial={{ browser: 'disabled' }} />, {
      ...INFO,
      enabled: false,
    })
    expect(markup).toContain('Notifications aren&#x27;t available yet.')
    expect(markup).not.toContain('What we notify')
    expect(markup).not.toContain('Turn on')
  })

  it('sin soporte', () => {
    const markup = en('unsupported')
    expect(markup).toContain('This browser can&#x27;t show notifications.')
    expect(markup).toContain('Everything a notification would tell you is also on your Home page.')
    expect(markup).not.toContain('>Turn on<')
  })

  it('el iPhone fuera de la pantalla de inicio: cómo añadirla, con iOS 16.4, y sin Turn on', () => {
    const markup = en('ios-home')
    expect(markup).toContain('On iPhone and iPad, notifications only work from the Home Screen.')
    expect(markup).toContain(
      'Tap Share, then Add to Home Screen. Open Cycling Star from there, log in, and turn notifications on in Account, Notifications. You need iOS 16.4 or later.',
    )
    expect(markup).not.toContain('>Turn on<')
  })

  it('sin decidir y concedido sin suscripción: Turn on; bloqueado: dónde permitirlo', () => {
    expect(en('default')).toContain('Get notifications on this browser.')
    expect(pieza(en('default'), 'Button', 'Turn on')).toBeTruthy()
    expect(en('granted-off')).toContain('Notifications are off on this browser.')
    expect(pieza(en('granted-off'), 'Button', 'Turn on')).toBeTruthy()
    expect(en('denied')).toContain(
      'Notifications are blocked for Cycling Star in this browser&#x27;s settings. Allow them there, then come back.',
    )
    expect(en('denied')).not.toContain('>Turn on<')
  })

  it('encendido: el dibujo de §13.4, con las casillas, el silencio y los otros aparatos', () => {
    const markup = en('on')
    expect(markup).toContain('Chrome on Android · On')
    expect(markup).toContain('Signing out of this browser turns its notifications off.')
    expect(pieza(markup, 'Button', 'Turn off on this browser')).toBeTruthy()
    const casillas = [
      ...markup.matchAll(
        /data-ui="Checkbox"[^>]*data-state="(\w+)"[\s\S]*?<span[^>]*>([^<]*)<\/span><\/label>/g,
      ),
    ].map((m) => [m[2], m[1]])
    expect(casillas).toEqual([
      ['Stages ready (once a day, 19:00)', 'active'],
      ['Every stage of races you follow', 'inactive'],
      ['Training plan ending', 'active'],
      ['Contract offers', 'active'],
      ['Your away time is over', 'active'],
    ])
    expect(markup).toContain('Always on: a changed password, a new sign-in and a changed email.')
    expect(markup).toContain(
      'Quiet hours 22:00 to 08:00 (Europe/Madrid). Notifications wait until morning.',
    )
    expect(markup).toContain('Firefox on Windows')
    expect(markup).toContain('since 12 Nov')
    expect(pieza(markup, 'ActionRow', 'Firefox on Windows')).toContain('Remove')
  })

  it('el fallo al suscribir', () => {
    expect(en('default', true)).toContain(
      'Couldn&#x27;t turn on notifications. Try again in a minute.',
    )
  })

  it('el valor de la fila de Account', () => {
    expect(notificationsValue('on')).toBe('On for this browser')
    expect(notificationsValue('granted-off')).toBe('Off')
    expect(notificationsValue('ios-home')).toBe('Not on this browser')
  })
})

describe('los dos Notice del permiso (§13.3; DD-03 A)', () => {
  it('en la portada: el texto, Turn on y Not now', () => {
    const markup = pinta(<NoticeAsk variant="home" initial="default" />)
    expect(markup).toContain('Get notified when your stages are ready?')
    expect(markup).toContain(
      'One notification in the evening when stages with your rider are ready to watch, and a few about your training plan and contract offers. Never more than 3 a day.',
    )
    expect(pieza(markup, 'Button', 'Turn on')).toBeTruthy()
    expect(pieza(markup, 'Button', 'Not now')).toBeTruthy()
  })

  it('al seguir una carrera; en el iPhone, See how lleva a Notifications', () => {
    expect(pinta(<NoticeAsk variant="race" initial="granted-off" />)).toContain(
      'Get a notification when each stage of this race is ready?',
    )
    const iphone = pinta(<NoticeAsk variant="race" initial="ios-home" />)
    expect(pieza(iphone, 'Button', 'See how')).toMatch(/href="\/account\/notifications"/)
    expect(iphone).not.toContain('>Turn on<')
  })

  it('nada si ya están encendidos, bloqueados, sin soporte o sin VAPID', () => {
    for (const s of ['on', 'denied', 'unsupported'] as const)
      expect(pinta(<NoticeAsk variant="home" initial={s} />)).toBe('')
    expect(pinta(<NoticeAsk variant="home" initial="default" />, { ...INFO, enabled: false })).toBe(
      '',
    )
  })
})

describe("Don't want these? (§13.3), al llegar desde un aviso sin botones", () => {
  it('solo con from=notice y un aviso que se apaga', () => {
    expect(noticeOptOutKind(new URLSearchParams('from=notice&kind=stage_digest'))).toBe(
      'stage_digest',
    )
    expect(noticeOptOutKind(new URLSearchParams('from=notice&kind=new_sign_in'))).toBeNull()
    expect(noticeOptOutKind(new URLSearchParams('kind=stage_digest'))).toBeNull()
    expect(noticeOptOutKind(new URLSearchParams('from=notice&kind=otra'))).toBeNull()
  })

  it('la pregunta con el nombre de la casilla, y lo hecho', () => {
    const nada = () => undefined
    const pide = renderToStaticMarkup(
      <MemoryRouter>
        <NoticeOptOutView kind="stage_digest" state="ask" onTurnOff={nada} />
      </MemoryRouter>,
    )
    expect(pide).toContain('Don&#x27;t want these? Turn off &quot;Stages ready&quot;')
    expect(pieza(pide, 'Button', 'Turn off')).toBeTruthy()
    const hecho = renderToStaticMarkup(
      <NoticeOptOutView kind="stage_digest" state="done" onTurnOff={nada} />,
    )
    expect(hecho).toContain('Turned off. You can turn it on again in Account, Notifications.')
  })
})
