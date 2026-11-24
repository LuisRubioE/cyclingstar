import { describe, expect, it } from 'vitest'
import {
  type AwayFacts,
  AWAY_MAX_DAYS,
  AWAY_MIN_HOURS,
  AWAY_SHORTCUT_DAYS,
  type WelcomeBack,
  awayBodySchema,
  awayLines,
  awayWindow,
  gameDayToReal,
  welcomeBackLines,
} from './away.js'

/**
 * LAS FRASES DE LA AUSENCIA (docs/cuenta.md §14.1 y §14.5; PR 13 de E4): las líneas de `Away` con los datos
 * de cada jugador, en su orden y con los textos del diseño; las de `Welcome back`, con y sin corredor y
 * con sus ofertas; y la ventana de la vuelta.
 */

const fecha = (iso: string): string => iso.slice(0, 10)
const LUCA = {
  name: 'Luca Bianchi',
  gender: 'M' as const,
  planEndsAt: '2026-11-25T10:00:00.000Z',
  freeAgent: false,
  contractEnding: false,
}

describe('shared: las constantes de la ausencia (§16)', () => {
  it('28 días como mucho, 12 horas como poco, y los atajos 7, 14 y 28', () => {
    expect(AWAY_MAX_DAYS).toBe(28)
    expect(AWAY_MIN_HOURS).toBe(12)
    expect(AWAY_SHORTCUT_DAYS).toEqual([7, 14, 28])
  })

  it('la ventana se cuenta desde ahora', () => {
    const now = new Date('2026-11-23T15:00:00Z')
    const { min, max } = awayWindow(now)
    expect(min.toISOString()).toBe('2026-11-24T03:00:00.000Z')
    expect(max.toISOString()).toBe('2026-12-21T15:00:00.000Z')
  })

  it('el cuerpo pide un instante con su desfase', () => {
    expect(awayBodySchema.safeParse({ until: '2026-12-03T00:00:00+01:00' }).success).toBe(true)
    expect(awayBodySchema.safeParse({ until: '2026-12-03' }).success).toBe(false)
    expect(awayBodySchema.safeParse({ until: '2026-12-03T00:00:00Z', x: 1 }).success).toBe(false)
  })

  it('cuatro días de juego por día real, estimados', () => {
    const now = new Date('2026-11-23T00:00:00Z')
    expect(gameDayToReal(108, 100, now).toISOString()).toBe('2026-11-25T00:00:00.000Z')
  })
})

describe('shared: las líneas de Away (§14.1)', () => {
  const base: AwayFacts = { rider: LUCA, managesTeam: false }

  it('con contrato y plan vivo: el plan, el equipo, los avisos (18-c) y el correo', () => {
    expect(awayLines(base, fecha)).toEqual([
      "Your plan runs until 2026-11-25. After that your coach picks Luca Bianchi's training.",
      'Luca Bianchi races when his team picks him, with automatic orders.',
      'Notifications stay quiet, except a changed password or a new sign-in.',
      'Emails to reset your password still arrive.',
    ])
  })

  it('sin plan vivo, el entrenador; con el contrato que vence, las ofertas', () => {
    const l = awayLines(
      { ...base, rider: { ...LUCA, planEndsAt: null, contractEnding: true } },
      fecha,
    )
    expect(l[0]).toBe("Your coach picks Luca Bianchi's training while you're away.")
    expect(l).toContain(
      'Contract offers expire after about 5 days. You can still answer them if you drop by.',
    )
  })

  it('agente libre: el campeonato y las inscritas, y las ofertas; con ella, her', () => {
    const libre = awayLines(
      { ...base, rider: { ...LUCA, name: 'Ana Ruiz', gender: 'F', freeAgent: true } },
      fecha,
    )
    expect(libre[1]).toBe(
      'As a free agent, Ana Ruiz only races your national championship and the races you entered.',
    )
    expect(libre[2]).toBe(
      'Contract offers expire after about 5 days. You can still answer them if you drop by.',
    )
    expect(awayLines({ ...base, rider: { ...LUCA, gender: 'F' } }, fecha)[1]).toBe(
      'Luca Bianchi races when her team picks her, with automatic orders.',
    )
  })

  it('el mánager, su línea; sin corredor, solo los avisos y el correo', () => {
    expect(awayLines({ ...base, managesTeam: true }, fecha)).toContain(
      'Your team keeps its natural calendar. Nobody signs riders or changes plans for you.',
    )
    expect(awayLines({ rider: null, managesTeam: false }, fecha)).toEqual([
      'Notifications stay quiet, except a changed password or a new sign-in.',
      'Emails to reset your password still arrive.',
    ])
  })
})

describe('shared: Welcome back (§14.5)', () => {
  const w: WelcomeBack = {
    from: '2026-11-11T00:00:00.000Z',
    days: 12,
    gameDays: 48,
    rider: { id: 'r1', name: 'Luca Bianchi', trainedDays: 41, stages: 3 },
    offers: { expired: 2, open: 1, firstExpiresAt: '2026-11-29T00:00:00.000Z' },
  }

  it('el ejemplo del diseño', () => {
    expect(welcomeBackLines(w, fecha)).toEqual([
      'You were away 12 days (48 game days). Luca Bianchi trained on 41 of them and raced 3 stages.',
      '2 contract offers expired. 1 is still open: answer by 2026-11-29.',
    ])
  })

  it('con varias abiertas, la primera que caduca', () => {
    expect(welcomeBackLines({ ...w, offers: { ...w.offers, open: 3 } }, fecha)[1]).toBe(
      '2 contract offers expired. 3 are still open. The first expires on 2026-11-29.',
    )
  })

  it('sin ofertas, sin la segunda línea; sin corredor, solo los días', () => {
    expect(
      welcomeBackLines({ ...w, offers: { expired: 0, open: 0, firstExpiresAt: null } }, fecha),
    ).toHaveLength(1)
    expect(welcomeBackLines({ ...w, rider: null }, fecha)).toEqual(['You were away 12 days.'])
  })
})
