import type { Health, HorizonSummary } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { broadcastChunkKey, broadcastHeadKey } from './api/broadcast'
import { STALE_TIME, createQueryClient, horizonWanted, revOf } from './queryClient'

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
 * peticiones de hoy. `/health`, que ya pide la cabecera en toda página, dice el modo.
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

  it('mientras no se sabe el modo, espera (undefined); si /health falla, unavailable', () => {
    expect(revOf(pending, pending)).toBeUndefined()
    expect(revOf(failed, pending)).toBe('unavailable')
    expect(horizonWanted(undefined)).toBe(false)
  })

  it('con SPOILER_MODE apagado (o una API sin interruptores) el rev es world y el horizonte no se pide', () => {
    for (const h of [health('off'), health()]) {
      expect(horizonWanted(h)).toBe(false)
      expect(revOf(ok(h), pending)).toBe('world')
    }
  })

  it('con admins u on, el del horizonte: espera a tenerlo, el 401 es anon y un fallo, unavailable', () => {
    for (const mode of ['admins', 'on'] as const) {
      const h = health(mode)
      expect(horizonWanted(h)).toBe(true)
      expect(revOf(ok(h), pending)).toBeUndefined()
      expect(revOf(ok(h), ok(summary('190.4')))).toBe('190.4')
      expect(revOf(ok(h), ok(null))).toBe('anon')
      expect(revOf(ok(h), failed)).toBe('unavailable')
    }
  })
})
