import { describe, expect, it } from 'vitest'
import type { PreStageInfo } from '../broadcast/wire.js'
import {
  NOTICE_CATALOG,
  NOTICE_DEFAULTS,
  NOTICE_KINDS,
  type ReadyStage,
  effectiveNoticePrefs,
  isNoticeOn,
  isQuietHour,
  localClock,
  noticePayload,
  noticePrefsBodySchema,
} from './notices.js'

/**
 * EL CATÁLOGO DE AVISOS (docs/cuenta.md §13.1 y §13.2; PR 14 de E4): los nueve, sus banderas, los textos
 * exactos de la tabla, las preferencias por defecto, el silencio y la hora local.
 */

const p7: PreStageInfo = {
  raceName: 'Race France',
  season: 1,
  stageDay: 7,
  stageCount: 21,
  km: 187.2,
  label: 'Stage 7',
  stageKind: 'reina',
}
const etapa = (info: PreStageInfo, raceId = 'tdf', own = true): ReadyStage => ({
  info,
  raceId,
  ownRiderOnStartlist: own,
})

describe('NOTICE_CATALOG', () => {
  it('los tres de seguridad no se apagan, no cuentan en el tope, no esperan y salen con la ausencia', () => {
    for (const k of ['password_changed', 'new_sign_in', 'email_changed'] as const) {
      expect(NOTICE_CATALOG[k]).toMatchObject({
        switchable: false,
        capped: false,
        quiet: false,
        whileAway: true,
        urgency: 'high',
      })
    }
  })

  it('capped en todos salvo away_warning y los de seguridad; whileAway solo away_over y seguridad; ttl', () => {
    expect(NOTICE_KINDS.filter((k) => NOTICE_CATALOG[k].capped)).toEqual([
      'stage_digest',
      'stage_ready',
      'plan_ending',
      'offer_received',
      'away_over',
    ])
    expect(NOTICE_KINDS.filter((k) => NOTICE_CATALOG[k].whileAway)).toEqual([
      'away_over',
      'password_changed',
      'new_sign_in',
      'email_changed',
    ])
    expect(NOTICE_CATALOG.stage_ready.ttlS).toBe(21_600)
    expect(NOTICE_CATALOG.plan_ending.ttlS).toBe(43_200)
  })

  it('NOTICE_DEFAULTS (DD-02 A): todo encendido menos stage_ready; sin claves de seguridad', () => {
    expect(NOTICE_DEFAULTS).toEqual({
      stage_digest: true,
      stage_ready: false,
      plan_ending: true,
      offer_received: true,
      away_warning: true,
      away_over: true,
    })
  })

  it('una clave de seguridad se ignora al leer y se rechaza al escribir', () => {
    expect(isNoticeOn({ new_sign_in: false }, 'new_sign_in')).toBe(true)
    expect(isNoticeOn({ stage_ready: true }, 'stage_ready')).toBe(true)
    expect(effectiveNoticePrefs({}).stage_ready).toBe(false)
    expect(noticePrefsBodySchema.safeParse({ new_sign_in: false }).success).toBe(false)
    expect(noticePrefsBodySchema.safeParse({ stage_ready: true }).success).toBe(true)
  })
})

describe('noticePayload: los textos de §13.1', () => {
  it('stage_digest con una etapa es stageReadyNotice tal cual', () => {
    expect(noticePayload({ kind: 'stage_digest', stages: [etapa(p7)] })).toEqual({
      kind: 'stage_digest',
      title: 'Stage 7 of Race France is ready to watch',
      body: '187 km · mountain stage · your rider is on the start list',
      path: '/',
      tag: 'digest',
      off: true,
    })
  })

  it('stage_digest con varias, de una carrera y de dos', () => {
    const tres = [etapa(p7), etapa({ ...p7, stageDay: 8 }), etapa({ ...p7, stageDay: 9 })]
    expect(noticePayload({ kind: 'stage_digest', stages: tres })).toMatchObject({
      title: '3 stages are ready to watch',
      body: 'Race France · your rider is on the start list',
    })
    const dos = [etapa(p7), etapa({ ...p7, raceName: 'Race Italy' }, 'giro')]
    expect(noticePayload({ kind: 'stage_digest', stages: dos }).body).toBe(
      '2 races · your rider is on the start list',
    )
  })

  it('stage_ready lleva la ruta de la etapa y la etiqueta de la carrera', () => {
    expect(noticePayload({ kind: 'stage_ready', stage: etapa(p7) })).toMatchObject({
      path: '/world/races/tdf/stages/7',
      tag: 'stage-tdf',
      title: 'Stage 7 of Race France is ready to watch',
    })
  })

  it('los demás, enteros', () => {
    expect(noticePayload({ kind: 'plan_ending', riderName: 'Luca Bianchi' })).toMatchObject({
      title: 'Your training plan ends tomorrow',
      body: "After that your coach picks Luca Bianchi's training.",
      path: '/me/training',
    })
    expect(
      noticePayload({ kind: 'offer_received', riderName: 'Luca Bianchi', offers: 3 }),
    ).toMatchObject({
      title: 'New contract offers for Luca Bianchi',
      body: '3 teams made an offer. Offers expire in about 5 days.',
    })
    expect(
      noticePayload({ kind: 'offer_received', riderName: 'Luca Bianchi', offers: 1 }).body,
    ).toBe('One team made an offer. Offers expire in about 5 days.')
    expect(
      noticePayload({
        kind: 'away_warning',
        riderName: 'Luca Bianchi',
        daysLeft: 10,
        deadline: '19 Dec',
      }),
    ).toMatchObject({
      title: '10 days left',
      body: "If you don't visit by 19 Dec, your coach takes over Luca Bianchi. One visit is enough.",
    })
    expect(noticePayload({ kind: 'away_over' })).toMatchObject({
      title: 'Welcome back',
      body: 'Your away time is over. Your notifications are on again.',
    })
    expect(noticePayload({ kind: 'password_changed' })).toEqual({
      kind: 'password_changed',
      title: 'Your password was changed',
      body: "If it wasn't you, reset it now.",
      path: '/forgot-password',
      tag: 'password',
      off: false,
    })
    expect(noticePayload({ kind: 'new_sign_in', deviceLabel: 'Chrome on Android' })).toMatchObject({
      title: 'New sign-in to your account',
      body: "Chrome on Android signed in just now. If it wasn't you, reset your password.",
      path: '/account/devices',
      off: false,
    })
    expect(noticePayload({ kind: 'email_changed' })).toMatchObject({
      title: 'Your account email was changed by an administrator',
      body: "If you didn't ask for this, sign in and check Account.",
      path: '/account/email',
    })
  })
})

describe('el silencio y la hora local (§13.2)', () => {
  it('de 22 a 8', () => {
    expect([21, 22, 23, 0, 7, 8].map(isQuietHour)).toEqual([false, true, true, true, true, false])
  })

  it('la misma hora UTC es otra en Madrid y en Los Ángeles; sin zona o con una desconocida, UTC', () => {
    const t = new Date('2026-11-23T18:30:00Z')
    expect(localClock(t, 'Europe/Madrid')).toEqual({ date: '2026-11-23', hour: 19 })
    expect(localClock(t, 'America/Los_Angeles')).toEqual({ date: '2026-11-23', hour: 10 })
    expect(localClock(t, null)).toEqual({ date: '2026-11-23', hour: 18 })
    expect(localClock(t, 'Mars/Olympus')).toEqual({ date: '2026-11-23', hour: 18 })
    expect(localClock(new Date('2026-11-23T23:30:00Z'), 'Europe/Madrid').date).toBe('2026-11-24')
  })
})
