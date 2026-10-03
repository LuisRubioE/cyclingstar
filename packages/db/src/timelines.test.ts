import { gunzipSync, gzipSync } from 'node:zlib'
import {
  ENGINE_VERSION,
  STAGE,
  TEST_TOUR,
  TIMELINE,
  radioKmPoints,
  stageLengthKm,
} from '@cyclingstar/engine'
import {
  type ChampionTitle,
  TEMPLATE_REV,
  decodeTimeline,
  encodeTimeline,
} from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { worldHorizon } from './horizon.js'
import { stageResults, stageSnapshots, stageTimelines, worlds } from './schema.js'
import { runOneStage } from './stageRun.js'
import { type TestDb, startTestDb } from './testDb.js'
import { type TestWorld, enrollAll, seedTestWorld, stageSpecOf } from './timelineTestWorld.js'
import {
  TIMELINE_TOMBSTONE_FORMAT,
  type StageTimelineRow,
  type TimelineTickLog,
  TimelineUnavailableError,
  clearStageTimelineCache,
  readStageTemplateRev,
  readStageTimeline,
  stageTimelineRow,
  timelineTickLog,
  tombstoneRow,
  writeStageTimelineRows,
} from './timelines.js'
import type { ChampionTitleSource } from './titles.js'

/**
 * LA LÍNEA GRABADA EN LA BASE (docs/retransmision.md §5.5, §5.6, §5.10 y §13.10 punto 5; E2, paso 5):
 * la vuelta del `bytea`, la lápida, la revisión de plantillas, el diario del tick con su `flush` de una
 * sola escritura por día (5-l), el LRU de lectura y EL GRABADOR QUE FALLA.
 *
 * Este fichero sustituye `timelineRecorder` del motor por uno que falla cuando el caso lo pide, con un
 * `vi.mock` parcial (el resto del motor es el de verdad). El mock vale para todo el fichero, y por eso
 * los casos del grabador que falla viven aquí y no en `stageRun.test.ts` (§17.8). El mismo mock apunta
 * la sonda que recibe el motor en cada etapa, para comprobar que con `TIMELINE_RECORD=off` la envoltura
 * es la de hoy y con `on` la del colector aparte (§5.3).
 */

type Fallo = 'ninguno' | 'arranque' | 'foto' | 'cierre'
const control = vi.hoisted(() => ({
  fallo: 'ninguno' as Fallo,
  sondas: [] as { readonly atKm: number; readonly ganchos: readonly string[] }[],
}))

vi.mock('@cyclingstar/engine', async (importOriginal) => {
  const real = await importOriginal<typeof import('@cyclingstar/engine')>()
  return {
    ...real,
    timelineRecorder: (opts: Parameters<typeof real.timelineRecorder>[0]) => {
      if (control.fallo === 'arranque') throw new Error('el grabador forzado no arranca')
      const rec = real.timelineRecorder(opts)
      if (control.fallo === 'foto')
        return {
          ...rec,
          onSnapshot: () => {
            throw new Error('el grabador forzado falla en una foto')
          },
        }
      if (control.fallo === 'cierre')
        return {
          ...rec,
          finish: () => {
            throw new Error('el grabador forzado falla al cerrar')
          },
        }
      return rec
    },
    simulateStage: (...args: Parameters<typeof real.simulateStage>) => {
      const probe = args[2]
      control.sondas.push({
        atKm: probe?.atKm.length ?? 0,
        ganchos: Object.keys(probe ?? {}).sort(),
      })
      return real.simulateStage(...args)
    },
  }
})

const FLAT = TEST_TOUR[0]!
const CRONO = TEST_TOUR[3]!

describe('db: la línea temporal en stage_timelines (§5.5, §5.6, 5-l)', () => {
  let t: TestDb
  let w: TestWorld
  let dia = 100

  beforeAll(async () => {
    t = await startTestDb()
    w = await seedTestWorld(t, { worldSeed: 'semilla-grabar' })
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  beforeEach(() => {
    control.fallo = 'ninguno'
    control.sondas.length = 0
    clearStageTimelineCache()
  })

  /**
   * Corre la etapa 1 de `raceKey` como el tick, en su transacción, con el diario si se da y su `flush`
   * detrás de la etapa (§5.5: quien corre etapas fuera de `runTick` llama a `flush` antes de confirmar).
   */
  const correr = async (
    raceKey: string,
    opts: { log?: TimelineTickLog; flush?: boolean; stage?: (typeof TEST_TOUR)[number] } = {},
  ): Promise<void> => {
    await enrollAll(t, w, raceKey)
    dia += 1
    await t.db.transaction(async (tx) => {
      await runOneStage(tx, w.worldId, dia, w.worldSeed, {
        ...stageSpecOf(raceKey, 1, opts.stage ?? FLAT, false),
        ...(opts.log ? { timeline: opts.log } : {}),
      })
      if (opts.log && opts.flush !== false) await opts.log.flush(tx)
    })
  }

  /** La fila de una etapa, tal como está en la base. */
  const fila = async (raceKey: string, stageDay = 1) =>
    (
      await t.db
        .select()
        .from(stageTimelines)
        .where(and(eq(stageTimelines.raceId, raceKey), eq(stageTimelines.stageDay, stageDay)))
    )[0]

  /** Un diario que además se queda con las filas que le llegan, para comparar con lo escrito. */
  const espia = () => {
    const log = timelineTickLog()
    const filas: StageTimelineRow[] = []
    const notas: (string | null)[] = []
    const espiado: TimelineTickLog = {
      ...log,
      recorded: (row, nota) => {
        filas.push(row)
        notas.push(nota)
        log.recorded(row, nota)
      },
    }
    return { log: espiado, filas, notas }
  }

  it('la etapa grabada deja su fila: el bytea vuelve igual byte a byte y se descomprime a lo escrito (I3)', async () => {
    const { log, filas, notas } = espia()
    await correr('race-vuelta:s0', { log })
    expect(filas).toHaveLength(1)
    expect(notas).toEqual([null])
    const escrita = filas[0]!
    const leida = (await fila('race-vuelta:s0'))!
    expect(Buffer.isBuffer(leida.body)).toBe(true)
    expect(leida.body.equals(escrita.body)).toBe(true)
    expect(leida).toMatchObject({
      format: TIMELINE.format,
      engineVersion: ENGINE_VERSION,
      tplRev: TEMPLATE_REV,
      gameDay: dia,
      bytes: escrita.body.length,
    })
    // El cuerpo es el gzip del JSON de StoredTimelineV1, y ese JSON se lee a sí mismo (I3). Se compara
    // el dato y no el texto: el recorrido, el reparto y el tiempo pasan tal cual al JSON, y al leerlos
    // Zod devuelve sus claves en el orden del esquema (`profile` sale del motor con `climbs` antes).
    const json = gunzipSync(leida.body).toString('utf8')
    const tl = decodeTimeline(JSON.parse(json))
    expect(JSON.parse(JSON.stringify(encodeTimeline(tl)))).toEqual(JSON.parse(json))
    expect(decodeTimeline(JSON.parse(JSON.stringify(encodeTimeline(tl))))).toEqual(tl)
    expect(tl.clock).toBe('exact')
    expect(tl.riderIds).toEqual(w.riderIds)
    expect(leida.finishS).toBe(Math.ceil(tl.finish.finishS))
    // La lectura da la misma línea y la revisión de plantillas del tick que la grabó.
    expect(await readStageTimeline(t.db, worldHorizon, 'race-vuelta:s0', 1)).toEqual(tl)
    expect(await readStageTemplateRev(t.db, worldHorizon, 'race-vuelta:s0', 1)).toBe(TEMPLATE_REV)
    expect(log.summary()).toBe('timeline: 1 grabadas, 0 sin línea')
  }, 120_000)

  it('una crono se graba con su traza y pasa I5', async () => {
    const log = timelineTickLog()
    await correr('race-crono:s0', { log, stage: CRONO })
    const tl = await readStageTimeline(t.db, worldHorizon, 'race-crono:s0', 1)
    expect(tl?.timeTrial).toBe(true)
    expect(tl?.tt?.kmClockDs).toHaveLength(w.riderIds.length)
    expect(log.summary()).toBe('timeline: 1 grabadas, 0 sin línea')
  }, 120_000)

  it('sin flush la etapa no deja fila; sin diario, la envoltura es la de hoy y no hay fila', async () => {
    await correr('race-sin-flush:s0', { log: timelineTickLog(), flush: false })
    expect(await fila('race-sin-flush:s0')).toBeUndefined()
    control.sondas.length = 0
    await correr('race-apagada:s0')
    expect(await fila('race-apagada:s0')).toBeUndefined()
    // TIMELINE_RECORD=off: el motor recibe la sonda de hoy, con los km de radio y solo onSnapshot.
    expect(control.sondas).toEqual([
      {
        atKm: radioKmPoints(stageLengthKm(FLAT.profile)).length,
        ganchos: ['atKm', 'onSnapshot'],
      },
    ])
    // Y con la grabación, la del colector aparte: una foto por bloque y los tres ganchos.
    control.sondas.length = 0
    await correr('race-encendida:s0', { log: timelineTickLog() })
    expect(control.sondas).toEqual([
      {
        atKm: Math.round(stageLengthKm(FLAT.profile) / STAGE.dx),
        ganchos: ['atKm', 'onBanner', 'onEvent', 'onSnapshot', 'onTimeTrialRide'],
      },
    ])
  }, 180_000)

  for (const fallo of ['arranque', 'foto', 'cierre'] as const) {
    it(`el grabador que falla (${fallo}): la etapa escribe sus resultados y deja una lápida y su nota`, async () => {
      control.fallo = fallo
      const raceKey = `race-falla-${fallo}:s0`
      const log = timelineTickLog()
      await correr(raceKey, { log })
      // La carrera se corrió y se guardó entera, como sin grabador.
      const resultados = await t.db
        .select({ riderId: stageResults.riderId })
        .from(stageResults)
        .where(eq(stageResults.raceId, raceKey))
      expect(resultados.length).toBeGreaterThan(0)
      const snap = await t.db
        .select({ seed: stageSnapshots.seed })
        .from(stageSnapshots)
        .where(eq(stageSnapshots.raceId, raceKey))
      expect(snap).toHaveLength(1)
      // La etapa queda sin línea, con su lápida (D-12), y el diario lo cuenta.
      const lapida = (await fila(raceKey))!
      expect(lapida).toMatchObject({ format: TIMELINE_TOMBSTONE_FORMAT, tplRev: 0, finishS: 0 })
      const motivo = JSON.parse(gunzipSync(lapida.body).toString('utf8')) as {
        format: number
        reason: string
        message: string
      }
      expect(motivo).toMatchObject({ format: 0, reason: 'error' })
      expect(motivo.message).toContain('el grabador forzado')
      const resumen = log.summary()!
      expect(resumen).toMatch(/^timeline: 0 grabadas, 1 sin línea · timeline error: /)
      expect(resumen).toContain(`${raceKey} e1`)
      await expect(readStageTimeline(t.db, worldHorizon, raceKey, 1)).rejects.toBeInstanceOf(
        TimelineUnavailableError,
      )
      // Si el grabador no llegó a arrancar, la etapa se corrió con la envoltura de hoy.
      if (fallo === 'arranque')
        expect(control.sondas.map((s) => s.ganchos)).toEqual([['atKm', 'onSnapshot']])
    }, 120_000)
  }

  describe('las filas, sin correr etapas', () => {
    const meta = (raceKey: string, stageDay = 1) => ({
      raceKey,
      stageDay,
      gameDay: 300,
      tplRev: 7,
    })

    it('la lápida lanza TimelineUnavailableError con su motivo y se queda en el LRU', async () => {
      await t.db.transaction((tx) =>
        writeStageTimelineRows(tx, [
          tombstoneRow(meta('race-lapida:s0'), {
            reason: 'I1',
            mismatches: [{ b: 12, km: 1.25, field: 'members' }],
          }),
        ]),
      )
      const lapida = (await fila('race-lapida:s0'))!
      expect(lapida).toMatchObject({ format: 0, tplRev: 0, finishS: 0, gameDay: 300 })
      expect(JSON.parse(gunzipSync(lapida.body).toString('utf8'))).toEqual({
        format: 0,
        reason: 'I1',
        mismatches: [{ b: 12, km: 1.25, field: 'members' }],
      })
      const error = await readStageTimeline(t.db, worldHorizon, 'race-lapida:s0', 1).catch(
        (e: unknown) => e,
      )
      expect(error).toBeInstanceOf(TimelineUnavailableError)
      expect(error).toMatchObject({ raceKey: 'race-lapida:s0', stageDay: 1, reason: 'I1' })
      expect(await readStageTemplateRev(t.db, worldHorizon, 'race-lapida:s0', 1)).toBe(0)
      // Se queda en el LRU: borrada la fila, la lectura sigue sin ir a la base.
      await t.db.delete(stageTimelines).where(eq(stageTimelines.raceId, 'race-lapida:s0'))
      await expect(
        readStageTimeline(t.db, worldHorizon, 'race-lapida:s0', 1),
      ).rejects.toBeInstanceOf(TimelineUnavailableError)
      clearStageTimelineCache()
      expect(await readStageTimeline(t.db, worldHorizon, 'race-lapida:s0', 1)).toBeNull()
    })

    it('un cuerpo que no se deja decodificar (Zod o el formato) es una etapa sin línea, no un 500', async () => {
      const basura = (raceKey: string, json: unknown): StageTimelineRow => ({
        raceId: raceKey,
        stageDay: 1,
        gameDay: 300,
        format: 1,
        engineVersion: ENGINE_VERSION,
        tplRev: 0,
        finishS: 1,
        bytes: 1,
        body: gzipSync(Buffer.from(JSON.stringify(json))),
      })
      await t.db.transaction((tx) =>
        writeStageTimelineRows(tx, [
          basura('race-zod:s0', { format: 1, nada: true }),
          basura('race-formato:s0', { format: 9 }),
        ]),
      )
      for (const raceKey of ['race-zod:s0', 'race-formato:s0']) {
        const error = await readStageTimeline(t.db, worldHorizon, raceKey, 1).catch(
          (e: unknown) => e,
        )
        expect(error, raceKey).toBeInstanceOf(TimelineUnavailableError)
        expect(error).toMatchObject({ reason: 'decode' })
      }
    })

    it('una etapa sin fila da null, no entra en el LRU y se ve en cuanto se graba', async () => {
      expect(await readStageTimeline(t.db, worldHorizon, 'race-luego:s0', 1)).toBeNull()
      expect(await readStageTemplateRev(t.db, worldHorizon, 'race-luego:s0', 1)).toBe(0)
      await t.db.transaction((tx) =>
        writeStageTimelineRows(tx, [tombstoneRow(meta('race-luego:s0'), { reason: 'error' })]),
      )
      await expect(
        readStageTimeline(t.db, worldHorizon, 'race-luego:s0', 1),
      ).rejects.toBeInstanceOf(TimelineUnavailableError)
    })

    it('la fila guarda el TEMPLATE_REV del tick y readStageTemplateRev lo devuelve', async () => {
      const { log, filas } = espia()
      await correr('race-revision:s0', { log })
      expect(filas[0]?.tplRev).toBe(TEMPLATE_REV)
      // Una línea de verdad con otra revisión: lo que se guarda es lo que se lee.
      const tl = (await readStageTimeline(t.db, worldHorizon, 'race-revision:s0', 1))!
      const { row } = stageTimelineRow(tl, meta('race-revision-7:s0'))
      expect(row.tplRev).toBe(7)
      await t.db.transaction((tx) => writeStageTimelineRows(tx, [row]))
      expect(await readStageTemplateRev(t.db, worldHorizon, 'race-revision-7:s0', 1)).toBe(7)
      expect(await readStageTimeline(t.db, worldHorizon, 'race-revision-7:s0', 1)).toEqual(tl)
    }, 120_000)

    it('flush escribe en un solo INSERT: si falla, una lápida por etapa y la transacción de fuera se confirma', async () => {
      const log = timelineTickLog()
      const buena = tombstoneRow(meta('race-flush-a:s0'), { reason: 'error' })
      // Un format que no cabe en smallint: el INSERT del día entero falla.
      const mala: StageTimelineRow = {
        ...tombstoneRow(meta('race-flush-b:s0'), { reason: 'error' }),
        format: 70_000,
      }
      log.recorded({ ...buena, format: 1, tplRev: 3 }, null)
      log.recorded(mala, null)
      const [mundo] = await t.db.select({ id: worlds.id }).from(worlds).limit(1)
      await t.db.transaction(async (tx) => {
        await tx.update(worlds).set({ repairVersion: 77 }).where(eq(worlds.id, mundo!.id))
        await log.flush(tx)
      })
      // La transacción de fuera se confirmó…
      const [w2] = await t.db
        .select({ v: worlds.repairVersion })
        .from(worlds)
        .where(eq(worlds.id, mundo!.id))
      expect(w2?.v).toBe(77)
      // …y la fila buena no entró sola: el INSERT era uno y las dos etapas quedan con su lápida.
      for (const raceKey of ['race-flush-a:s0', 'race-flush-b:s0']) {
        const f = (await fila(raceKey))!
        expect(f.format, raceKey).toBe(0)
        expect(JSON.parse(gunzipSync(f.body).toString('utf8'))).toMatchObject({ reason: 'error' })
      }
      const resumen = log.summary()!
      expect(resumen).toMatch(/^timeline: 0 grabadas, 2 sin línea · timeline error: /)
      expect(resumen).toContain('smallint')
    })

    it('escribir dos veces deja una fila, y la que no entra deja la nota «ya tenía fila» (§17.19)', async () => {
      const primero = timelineTickLog()
      primero.recorded(
        { ...tombstoneRow(meta('race-doble:s0'), { reason: 'error' }), tplRev: 1 },
        null,
      )
      await t.db.transaction((tx) => primero.flush(tx))
      const segundo = timelineTickLog()
      segundo.failed(tombstoneRow(meta('race-doble:s0'), { reason: 'I1' }), 'timeline I1: x')
      await t.db.transaction((tx) => segundo.flush(tx))
      const filas = await t.db
        .select()
        .from(stageTimelines)
        .where(eq(stageTimelines.raceId, 'race-doble:s0'))
      expect(filas).toHaveLength(1)
      expect(filas[0]!.tplRev).toBe(1)
      expect(segundo.summary()).toBe(
        'timeline: 0 grabadas, 0 sin línea · timeline I1: x · timeline error: race-doble:s0 e1 ya tenía fila',
      )
    })
  })

  describe('el diario del tick, sin base', () => {
    it('sin etapas no dice nada; con notas, como mucho 20 y cuántas quedan', async () => {
      expect(timelineTickLog().summary()).toBeNull()
      const log = timelineTickLog()
      for (let i = 0; i < 27; i++)
        log.failed(
          tombstoneRow(
            { raceKey: `r${i}:s0`, stageDay: 1, gameDay: 1, tplRev: 0 },
            { reason: 'I1' },
          ),
          `timeline I1: r${i}:s0 e1 km 1.25`,
        )
      // Antes de flush, nada escrito: el resumen cuenta lo que flush escribe.
      expect(log.summary()).toMatch(/^timeline: 0 grabadas, 0 sin línea · timeline I1: r0:s0/)
      const partes = log.summary()!.split(' · ')
      expect(partes).toHaveLength(1 + 20 + 1)
      expect(partes.at(-1)).toBe('… y 7 más')
    })

    it('pide los títulos una vez por día y mundo, aunque corran muchas etapas', async () => {
      const llamadas: number[] = []
      const fuente: ChampionTitleSource = {
        titlesOn: (_q, _mundo, dia) => {
          llamadas.push(dia)
          return Promise.resolve(new Map<string, readonly ChampionTitle[]>())
        },
      }
      const log = timelineTickLog({ titles: fuente })
      for (let i = 0; i < 5; i++) await log.titlesOn(t.db, 'mundo', 176)
      await log.titlesOn(t.db, 'mundo', 177)
      await log.titlesOn(t.db, 'mundo', 177)
      expect(llamadas).toEqual([176, 177])
    })

    it('un fallo al pedir los títulos no se recuerda: la etapa siguiente lo vuelve a intentar', async () => {
      let n = 0
      const fuente: ChampionTitleSource = {
        titlesOn: () => {
          n += 1
          return n === 1
            ? Promise.reject(new Error('palmares no responde'))
            : Promise.resolve(new Map<string, readonly ChampionTitle[]>())
        },
      }
      const log = timelineTickLog({ titles: fuente })
      await expect(log.titlesOn(t.db, 'mundo', 179)).rejects.toThrow('palmares no responde')
      expect((await log.titlesOn(t.db, 'mundo', 179)).size).toBe(0)
      expect(n).toBe(2)
    })
  })
})
