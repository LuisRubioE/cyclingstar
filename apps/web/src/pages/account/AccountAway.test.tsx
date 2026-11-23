import type { AwayFacts, AwayResponse } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AWAY_KEY } from '../../api/away'
import { pieza, respuestas, titulo } from '../__fixtures__/markup'
import { AccountAway, AwayBody, backOnProblem, localMidnight, shortcutDate } from './AccountAway'

/**
 * `Account › Away` (docs/cuenta.md §14.1; DD-05 A; PR 13 de E4), en estático y en sus estados: sin ausencia,
 * los atajos, `Back on` y las líneas con los datos del jugador; con `Back on` en error; y con la ausencia
 * viva, la fecha, `Change date` y `End now`. Sin la frase de los avisos hasta el PR 14 (18-c).
 */

vi.mock('../../auth/client', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}))

const AHORA = new Date(2026, 10, 23, 15)
const FACTS: AwayFacts = {
  rider: {
    name: 'Luca Bianchi',
    gender: 'M',
    planEndsAt: new Date(2026, 10, 25, 12).toISOString(),
    freeAgent: false,
    contractEnding: false,
  },
  managesTeam: false,
}
const SIN: AwayResponse = { ok: true, awaySince: null, awayUntil: null, facts: FACTS }
const VIVA: AwayResponse = {
  ok: true,
  awaySince: new Date(2026, 10, 20).toISOString(),
  awayUntil: new Date(2026, 11, 3).toISOString(),
  facts: FACTS,
}

function pinta(el: ReactElement, away?: AwayResponse): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (away !== undefined) client.setQueryData(AWAY_KEY, away)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/account/away']}>{el}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Away sin ausencia (§14.1)', () => {
  it('la cabecera con la vuelta a Account, la frase, los atajos y Back on', () => {
    const markup = pinta(<AccountAway />, SIN)
    expect(titulo(markup)).toBe('Away')
    expect(pieza(markup, 'PageHeader', 'Away')).toMatch(/href="\/account"/)
    expect(respuestas(markup)).toBe(1)
    expect(markup).toContain('Going on holiday? Tell us when you&#x27;ll be back.')
    const atajos = pieza(markup, 'Segmented', '1 week')
    expect([...atajos.matchAll(/role="radio"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual([
      '1 week',
      '2 weeks',
      '4 weeks',
    ])
    // ninguno elegido, y el primero recibe el foco
    expect(atajos).not.toContain('aria-checked="true"')
    expect(atajos.match(/tabindex="0"/g)).toHaveLength(1)
    const fecha = pieza(markup, 'DateField', 'Back on')
    expect(fecha).toContain('autoComplete="off"')
    expect(markup).toContain('>Set away</')
  })

  it('las líneas con los datos del jugador, sin la de los avisos (18-c)', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <AwayBody away={SIN} now={AHORA} />
      </QueryClientProvider>,
    )
    const panel = pieza(markup, 'Panel', 'While you&#x27;re away')
    expect([...panel.matchAll(/<li>([^<]+)<\/li>/g)].map((m) => m[1])).toEqual([
      'Your plan runs until 25 Nov. After that your coach picks Luca Bianchi&#x27;s training.',
      'Luca Bianchi races when his team picks him, with automatic orders.',
      'Emails to reset your password still arrive.',
    ])
    expect(markup).not.toContain('Notifications')
  })

  it('con una fecha elegida, el botón la dice; con Back on en error, el error en el campo', () => {
    const conFecha = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <AwayBody away={SIN} now={AHORA} initialBack={shortcutDate(10, AHORA)} />
      </QueryClientProvider>,
    )
    expect(conFecha).toContain('>Set away until 3 Dec</')
    const conError = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <AwayBody
          away={SIN}
          now={AHORA}
          initialBack={shortcutDate(40, AHORA)}
          initialError="Up to 28 days. For longer, come back once and set it again."
        />
      </QueryClientProvider>,
    )
    expect(pieza(conError, 'DateField', 'Back on')).toMatch(
      /data-state="error"[\s\S]*Up to 28 days. For longer, come back once and set it again./,
    )
  })
})

describe('Away con la ausencia viva (§14.1)', () => {
  it('la fecha de vuelta, Change date y End now; sin formulario', () => {
    const markup = pinta(<AccountAway />, VIVA)
    expect(respuestas(markup)).toBe(1)
    expect(markup).toContain('You&#x27;re away until 3 Dec.')
    expect(markup).toContain('>Change date</')
    expect(markup).toContain('>End now</')
    expect(markup).not.toContain('<form')
    expect(markup).not.toContain('Notifications')
  })

  it('Change date vuelve al formulario con la fecha puesta', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <AwayBody away={VIVA} now={AHORA} initialEditing initialBack={shortcutDate(10, AHORA)} />
      </QueryClientProvider>,
    )
    expect(markup).toContain('<form')
    expect(markup).not.toContain('Going on holiday?')
    expect(markup).toContain('>Set away until 3 Dec</')
  })
})

describe('Back on: los atajos y los errores (§14.1)', () => {
  it('un atajo es hoy más 7, 14 o 28 días, a las 00:00 locales', () => {
    expect(shortcutDate(7, AHORA)).toEqual({ day: '30', month: '11', year: '2026' })
    expect(localMidnight(shortcutDate(28, AHORA))).toEqual(new Date(2026, 11, 21))
  })

  it('menos de 12 horas, una fecha pasada, más de 28 días y una que no existe', () => {
    expect(backOnProblem(shortcutDate(1, AHORA), AHORA)).toBe('Pick a later date.')
    expect(backOnProblem(shortcutDate(-2, AHORA), AHORA)).toBe('Pick a later date.')
    expect(backOnProblem(shortcutDate(29, AHORA), AHORA)).toBe(
      'Up to 28 days. For longer, come back once and set it again.',
    )
    expect(backOnProblem({ day: '31', month: '2', year: '2027' }, AHORA)).toBe('Enter a real date.')
    expect(backOnProblem({ day: '', month: '12', year: '2026' }, AHORA)).toBe('Enter a real date.')
    for (const n of [2, 7, 14, 28]) expect(backOnProblem(shortcutDate(n, AHORA), AHORA)).toBeNull()
  })
})
