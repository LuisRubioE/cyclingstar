import type { Health, HorizonSummary } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { broadcastChunkKey, broadcastHeadKey } from './api/broadcast'
import {
  type AdminStatus,
  STALE_TIME,
  adminHintOf,
  adminStatusOf,
  createQueryClient,
  horizonWanted,
  revOf,
} from './queryClient'

/**
 * LOS DEFECTOS DE LA CACHÉ DE LA RETRANSMISIÓN (docs/retransmision.md §14.11; paso 3b): un tramo se
 * guarda para siempre y ninguna de sus consultas se reintenta sola, porque sus fallos los resuelve el
 * reproductor (o son la puerta y el interruptor, que no cambian por repetir).
 */
describe('web: createQueryClient', () => {
  const client = createQueryClient()

  it('un tramo no caduca nunca ni se reintenta (14-m)', () => {
    expect(
      client.getQueryDefaults([...broadcastChunkKey('race-france', 7, 2, 0, 9000)]),
    ).toMatchObject({ staleTime: Infinity, retry: false })
  })

  it('la cabecera y el acta no se reintentan: un 403 o un 404 no cambian por repetirlos', () => {
    expect(
      client.getQueryDefaults([...broadcastHeadKey('race-france', 7, undefined, false, '9.1')]),
    ).toMatchObject({
      retry: false,
    })
    expect(client.getQueryDefaults(['stage-report', 'race-france', 7])).toMatchObject({
      retry: false,
    })
  })

  it('lo de antes sigue igual: la ruta de etapa, con el tiempo del mundo', () => {
    expect(client.getQueryDefaults(['stage-replay', 'race-france', 7])).toEqual({
      staleTime: STALE_TIME.world,
    })
  })
})

describe('web: el horizonte en la caché (docs/retransmision.md §10.9, regla 2; paso 9a)', () => {
  it('[horizon] caduca en el acto y se pide al enfocar la ventana; las demás, no', () => {
    const client = createQueryClient()
    expect(client.getQueryDefaults(['horizon'])).toMatchObject({
      staleTime: 0,
      refetchOnWindowFocus: true,
    })
    expect(client.getQueryDefaults(['stage-replay', 'race-france', 7])).not.toHaveProperty(
      'refetchOnWindowFocus',
    )
  })

  it('9b: [horizon] no se pide otra vez al montar otra página, salvo que algo lo haya invalidado', () => {
    // Con el mundo bajo el velo, casi toda página lleva el `rev` en sus claves: pedir el horizonte en cada
    // navegación sumaría una petición por página. Lo cambian la meta, revelar, el progreso que sigue la
    // carrera, seguirla o soltarla, el alcance y el día nuevo (que lo invalidan), y otro dispositivo (al
    // enfocar la ventana).
    const refetchOnMount = createQueryClient().getQueryDefaults(['horizon']).refetchOnMount
    expect(typeof refetchOnMount).toBe('function')
    const decide = refetchOnMount as (q: { state: { isInvalidated: boolean } }) => boolean
    expect(decide({ state: { isInvalidated: false } })).toBe(false)
    expect(decide({ state: { isInvalidated: true } })).toBe(true)
  })
})

/**
 * EL `rev` SIN PEDIRLO CUANDO NO HACE FALTA (9b; §10.9 y §10.13). Con `SPOILER_MODE=off` el horizonte de
 * todos es el del mundo: el `rev` es `'world'` sin pedir `GET /api/me/horizon`, y la web se queda con las
 * peticiones de hoy. `/health`, que ya pide la cabecera en toda página, dice el modo. Con `admins`, el velo
 * solo vale para un administrador con sesión: a quien no la tiene, o a quien ya se sabe que no lo es (su
 * `whoami`, o la pista de este navegador, `adminHint.ts`), tampoco se le pide.
 */
describe('web: revOf y horizonWanted (9b)', () => {
  const health = (spoilerMode?: 'off' | 'admins' | 'on'): Health => ({
    ok: true,
    engineVersion: 91,
    gameDay: 190,
    migrationsApplied: true,
    tickIntervalMinutes: 360,
    ...(spoilerMode === undefined
      ? {}
      : { features: { broadcastWatch: 'admins' as const, spoilerMode } }),
  })
  const summary = (rev: string): HorizonSummary => ({
    rev,
    scope: 'guarded',
    ready: [],
    watching: [],
    expiredSinceLastVisit: [],
  })
  const ok = <T>(data: T) => ({ data, isError: false })
  const pending = { data: undefined, isError: false }
  const failed = { data: undefined, isError: true }
  const STATUSES: readonly AdminStatus[] = ['pending', 'no', 'yes', 'unknown']

  it('mientras no se sabe el modo, espera (undefined); si /health falla, unavailable', () => {
    for (const admin of STATUSES) {
      expect(revOf(pending, pending, admin)).toBeUndefined()
      expect(revOf(failed, pending, admin)).toBe('unavailable')
      expect(horizonWanted(undefined, admin)).toBe(false)
    }
  })

  it('con SPOILER_MODE apagado (o una API sin interruptores) el rev es world y el horizonte no se pide', () => {
    for (const h of [health('off'), health()])
      for (const admin of STATUSES) {
        expect(horizonWanted(h, admin)).toBe(false)
        expect(revOf(ok(h), pending, admin)).toBe('world')
      }
  })

  it('con on, el del horizonte para todos: espera a tenerlo, el 401 es anon y un fallo, unavailable', () => {
    const h = health('on')
    for (const admin of STATUSES) {
      expect(horizonWanted(h, admin)).toBe(true)
      expect(revOf(ok(h), pending, admin)).toBeUndefined()
      expect(revOf(ok(h), ok(summary('190.4')), admin)).toBe('190.4')
      expect(revOf(ok(h), ok(null), admin)).toBe('anon')
      expect(revOf(ok(h), failed, admin)).toBe('unavailable')
    }
  })

  it('con admins, solo se pide para un administrador o para quien no se sabe; a los demás, world sin pedirlo', () => {
    const h = health('admins')
    // sin saber aún si hay sesión, se espera: ni se pide ni hay rev
    expect(horizonWanted(h, 'pending')).toBe(false)
    expect(revOf(ok(h), pending, 'pending')).toBeUndefined()
    // sin sesión, o un jugador del que ya se sabe: world, sin petición
    expect(horizonWanted(h, 'no')).toBe(false)
    expect(revOf(ok(h), pending, 'no')).toBe('world')
    // un administrador, o una cuenta de la que no se sabe nada: el del horizonte
    for (const admin of ['yes', 'unknown'] as const) {
      expect(horizonWanted(h, admin)).toBe(true)
      expect(revOf(ok(h), pending, admin)).toBeUndefined()
      expect(revOf(ok(h), ok(summary('190.4')), admin)).toBe('190.4')
      expect(revOf(ok(h), ok(summary('world')), admin)).toBe('world')
      expect(revOf(ok(h), failed, admin)).toBe('unavailable')
    }
  })
})

/**
 * ¿ES ADMINISTRADOR QUIEN MIRA? (9b; §14.6). Lo que se sabe sin preguntar: sin sesión, no; con `whoami` en
 * la caché, lo que diga; si no, la pista de este navegador para esa cuenta; y si no, hay que preguntar.
 */
describe('web: adminStatusOf y adminHintOf (9b)', () => {
  const signedIn = { isPending: false, userId: 'u1' }

  it('mientras la sesión carga, pending; sin sesión, no (los dos interruptores en admins piden sesión)', () => {
    expect(adminStatusOf({ isPending: true, userId: null }, undefined, undefined)).toBe('pending')
    expect(adminStatusOf({ isPending: false, userId: null }, undefined, true)).toBe('no')
  })

  it('whoami manda sobre la pista; sin whoami, la pista; sin nada, unknown', () => {
    expect(adminStatusOf(signedIn, { ok: true, via: 'session', userId: 'u1' }, false)).toBe('yes')
    expect(adminStatusOf(signedIn, null, true)).toBe('no')
    expect(adminStatusOf(signedIn, undefined, true)).toBe('yes')
    expect(adminStatusOf(signedIn, undefined, false)).toBe('no')
    expect(adminStatusOf(signedIn, undefined, undefined)).toBe('unknown')
  })

  it('la pista sale de whoami siempre, y del horizonte solo con SPOILER_MODE=admins', () => {
    expect(adminHintOf(['admin-whoami'], { ok: true, via: 'session', userId: 'u1' }, 'on')).toBe(
      true,
    )
    expect(adminHintOf(['admin-whoami'], null, 'off')).toBe(false)
    // con admins, el rev de espectador es de un administrador y 'world' de quien no lo es (10-h)
    const h = (rev: string): HorizonSummary => ({
      rev,
      scope: 'guarded',
      ready: [],
      watching: [],
      expiredSinceLastVisit: [],
    })
    expect(adminHintOf(['horizon'], h('190.4'), 'admins')).toBe(true)
    expect(adminHintOf(['horizon'], h('world'), 'admins')).toBe(false)
    // con on, el velo es de todos: el horizonte no dice nada de quién es administrador
    expect(adminHintOf(['horizon'], h('190.4'), 'on')).toBeUndefined()
    expect(adminHintOf(['horizon'], null, 'admins')).toBeUndefined()
    expect(adminHintOf(['race', 'race-france'], h('190.4'), 'admins')).toBeUndefined()
  })
})
