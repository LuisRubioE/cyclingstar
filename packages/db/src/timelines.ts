/**
 * LA LÍNEA TEMPORAL DE LA ETAPA EN LA CAPA DE DATOS (E2, docs/retransmision.md §5.3, §5.5 y §5.6).
 *
 * Nace en el PR 4b con `startStageTimeline`, el colector aparte de §5.3, que engancha el grabador del
 * motor (`timelineRecorder`) a la etapa sin cambiar lo que ven la radio de hoy ni el aprendizaje (B10,
 * `timelineCollector.test.ts`). El paso 5 lo conecta al tick (`runOneStage`, con `TIMELINE_RECORD=on`)
 * y completa el fichero con la escritura y la lectura de `stage_timelines` (la 0047):
 *
 * - `recordStageTimeline` cierra la línea de una etapa corrida (el reparto congelado, el cierre, la
 *   autocomprobación I1 o I5 y el gzip) y deja su fila, línea o lápida, en el diario del tick. No
 *   escribe nada y nunca lanza: un fallo de la grabación deja la etapa sin línea, con su lápida y su
 *   nota, y nunca llega a la carrera ni a la transacción del día (D-12).
 * - `timelineTickLog` es ese diario: guarda en memoria las filas del día hasta `flush`, que las escribe
 *   todas en un solo `INSERT … ON CONFLICT DO NOTHING` dentro de un punto de guardado (5-l), y lleva las
 *   notas que `runTick` deja en `tick_log.notes`. Pide además los títulos de campeón una vez por día.
 * - `stageTimelineRow`, `tombstoneRow` y `writeStageTimelineRows`, las filas y su escritura.
 * - `readStageTimeline` y `readStageTemplateRev`, la lectura detrás de un LRU por proceso (D-10). Nadie
 *   las sirve todavía: la retransmisión sigue saliendo del adaptador de la radio hasta el 6a.
 */
import { gunzipSync, gzipSync } from 'node:zlib'
import {
  ENGINE_VERSION,
  STAGE,
  TIMELINE,
  type RaceRadio,
  type StageInput,
  type StageOutput,
  type StageProbe,
  type TimelineRecorder,
  freezeStageWeather,
  profileStripOf,
  selfCheckI1,
  selfCheckI5,
  timelineRecorder,
} from '@cyclingstar/engine'
import {
  type Attribute,
  BROADCAST,
  type Block,
  type ChampionTitle,
  type StageTimeline,
  TEMPLATE_REV,
  TimelineFormatError,
  decodeTimeline,
  encodeTimeline,
  photoBlocksOf,
} from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/postgres-js'
import { type CastContext, buildTimelineCast } from './cast.js'
import type { Horizon } from './horizon.js'
import { stageTimelines } from './schema.js'
import { type ChampionTitleSource, type Queryable, palmaresTitleSource } from './titles.js'

/**
 * La transacción del tick, el alias de `stageRun.ts` y `titles.ts`: el diseño la escribía sobre la del
 * esquema tipado, que sí le es asignable a ésta (la del tick no le es asignable a aquélla, nota 7 del 1a).
 */
type Tx = Parameters<Parameters<ReturnType<typeof drizzle>['transaction']>[0]>[0]

// ======================================================================= el colector aparte (§5.3)

/** Una etapa que se está grabando: la sonda que se le pasa al motor y lo que queda para cerrarla. */
export interface StageTimelineRun {
  readonly probe: StageProbe
  readonly recorder: TimelineRecorder
  /** El primer error del grabador, si lo hubo: desde él el grabador no recibe nada más y la etapa se queda sin línea (§5.5). */
  readonly failure: () => unknown
}

/**
 * EL COLECTOR APARTE (D-08, §5.3; decisión 5-d). Pide la foto de CADA bloque y despacha por ÍNDICE de
 * bloque: la de un bloque de `radioKmPoints` va a `radioShot`, que es la radio y el aprendizaje de hoy
 * (`trabajaronParaOtro` en `stageRun.ts`), exactamente como hoy; todas van al grabador. El despacho es
 * por índice y no por km porque el motor no devuelve el km pedido sino el centro del bloque que le
 * corresponde (`probeAt` en `simulate.ts`), y `photoBlocksOf` hace la misma cuenta (§4.5, atada al motor
 * por `apps/api/src/broadcastConstants.test.ts`). Dos km de radio en el mismo bloque dan una sola foto,
 * como en el motor: `radioBlocks` es un conjunto de bloques.
 *
 * El grabador va envuelto: un fallo suyo lo apaga y se apunta en `failure`, y nunca llega al motor ni a
 * la transacción del día (D-12). La radio va fuera de la envoltura, como hoy: un fallo suyo es un fallo
 * de la etapa, igual que antes de E2. Construir el grabador sí puede lanzar (`timelineRecorder` valida
 * la salida): quien llama lo captura y corre la etapa con la sonda de hoy (`runOneStage`).
 */
export function startStageTimeline(opts: {
  readonly lengthKm: number
  readonly timeTrial: boolean
  /** el orden de `stage_snapshots.input.riders` (dorsal y luego id, `stageRun.ts`) */
  readonly riderIds: readonly string[]
  readonly radioShot: StageProbe['onSnapshot']
}): StageTimelineRun {
  // los de sampleProfile: Math.round(lengthKm / dx)
  const blocks = Math.round(opts.lengthKm / STAGE.dx)
  const radioBlocks: ReadonlySet<Block> = new Set(photoBlocksOf(opts.lengthKm, STAGE.dx))
  /** El bloque cuyo centro es `km`, con la cuenta del motor (`probeAt`). */
  const blockOf = (km: number): Block =>
    Math.max(0, Math.min(blocks - 1, Math.round(km / STAGE.dx - 0.5)))
  const recorder = timelineRecorder({
    blocks,
    dx: STAGE.dx,
    lengthKm: opts.lengthKm,
    timeTrial: opts.timeTrial,
    radioBlocks,
    riderIds: opts.riderIds,
  })
  let failure: unknown
  const safe =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A): void => {
      if (failure !== undefined) return
      try {
        fn(...args)
      } catch (err) {
        failure = err ?? new Error('el grabador falló sin error')
      }
    }
  const snapshot = safe(recorder.onSnapshot)
  return {
    recorder,
    failure: () => failure,
    probe: {
      atKm: Array.from({ length: blocks }, (_, b) => (b + 0.5) * STAGE.dx),
      onSnapshot: (km, riders, mainId) => {
        if (radioBlocks.has(blockOf(km))) opts.radioShot(km, riders, mainId)
        snapshot(km, riders, mainId)
      },
      onEvent: safe(recorder.onEvent),
      onBanner: safe(recorder.onBanner),
      onTimeTrialRide: safe(recorder.onTimeTrialRide),
    },
  }
}

// ================================================================= las filas y su escritura (§5.6)

/** Una fila de stage_timelines lista para escribir: una línea codificada (`stageTimelineRow`) o una lápida (`tombstoneRow`). */
export type StageTimelineRow = typeof stageTimelines.$inferInsert

/**
 * La etapa de la fila, el día de juego en que se corrió (ninguna otra tabla de etapa lo guarda) y la
 * revisión de plantillas del tick que la corrió: `TEMPLATE_REV` de shared (§12.7, 12-c), para que la voz
 * y el acta de la etapa se redacten siempre con las variantes que había ese día (B5).
 */
export interface StageTimelineMeta {
  readonly raceKey: string
  readonly stageDay: number
  readonly gameDay: number
  readonly tplRev: number
}

/** `format` de una LÁPIDA: la etapa se corrió con la grabación encendida y no dejó línea (5.5). Las líneas llevan `TIMELINE.format` (1). */
export const TIMELINE_TOMBSTONE_FORMAT = 0

export type TimelineFailureReason = 'I1' | 'I5' | 'format' | 'error'
export interface TimelineFailure {
  readonly reason: TimelineFailureReason
  /** los 200 primeros caracteres del error, en 'format' y 'error' */
  readonly message?: string
  /** las 20 primeras discrepancias de I1 o de I5 */
  readonly mismatches?: readonly unknown[]
}

/**
 * La fila de una línea, en JavaScript y sin tocar la base: la escribe `flush` (5.5). Devuelve también
 * lo que ocupa, para la nota de tamaño (15-g) y para B6.
 */
export function stageTimelineRow(
  tl: StageTimeline,
  meta: StageTimelineMeta,
): { readonly row: StageTimelineRow; readonly bytes: number; readonly jsonBytes: number } {
  const json = Buffer.from(JSON.stringify(encodeTimeline(tl)))
  const body = gzipSync(json, { level: TIMELINE.gzipLevel })
  const row = {
    raceId: meta.raceKey,
    stageDay: meta.stageDay,
    gameDay: meta.gameDay,
    format: tl.format,
    engineVersion: tl.engineVersion,
    tplRev: meta.tplRev,
    // en segundos enteros y hacia arriba: nada de la carrera pasa de aquí
    finishS: Math.ceil(tl.finish.finishS),
    bytes: body.length,
    body,
  } satisfies StageTimelineRow
  return { row, bytes: body.length, jsonBytes: json.length }
}

/**
 * La fila de una lápida: el motivo y las primeras discrepancias, legibles por el dueño con `gunzip`
 * (5.5). `tpl_rev` 0: con una lápida no se redacta nada.
 */
export function tombstoneRow(meta: StageTimelineMeta, failure: TimelineFailure): StageTimelineRow {
  const body = gzipSync(
    Buffer.from(JSON.stringify({ format: TIMELINE_TOMBSTONE_FORMAT, ...failure })),
    { level: TIMELINE.gzipLevel },
  )
  return {
    raceId: meta.raceKey,
    stageDay: meta.stageDay,
    gameDay: meta.gameDay,
    format: TIMELINE_TOMBSTONE_FORMAT,
    engineVersion: ENGINE_VERSION,
    tplRev: 0,
    finishS: 0,
    bytes: body.length,
    body,
  }
}

/**
 * Escribe filas en un solo `INSERT`, idempotente como `stage_snapshots`, y devuelve las que no escribió
 * porque la etapa ya tenía fila (`ON CONFLICT DO NOTHING`), para que `flush` las apunte (5.5). La llaman
 * `flush`, los tests y los fixtures (§16).
 */
export async function writeStageTimelineRows(
  tx: Queryable | Tx,
  rows: readonly StageTimelineRow[],
): Promise<readonly StageTimelineRow[]> {
  if (rows.length === 0) return []
  const wrote = await tx
    .insert(stageTimelines)
    .values([...rows])
    .onConflictDoNothing()
    .returning({ raceId: stageTimelines.raceId, stageDay: stageTimelines.stageDay })
  const keys = new Set(wrote.map((r) => `${r.raceId}|${r.stageDay}`))
  return rows.filter((r) => !keys.has(`${r.raceId}|${r.stageDay}`))
}

/** El mensaje que explica un error: el de su causa más honda (drizzle envuelve el de Postgres con la consulta entera). */
function messageOf(err: unknown): string {
  let e: unknown = err
  let message = err instanceof Error ? err.message : String(err)
  while (e instanceof Error && e.cause !== undefined) {
    e = e.cause
    if (e instanceof Error) message = e.message
    else if (e !== null && e !== undefined) message = String(e)
  }
  return message.replace(/\s+/g, ' ').trim().slice(0, 200)
}

// ======================================================================= el diario del tick (§5.5)

/**
 * EL DIARIO DE GRABACIÓN DE UN TICK (D-12, 5-m). Lo crea `runTick` si `TIMELINE_RECORD=on`; baja por
 * `CalendarDayOptions.timeline` y por `StageRunSpec.timeline` hasta `runOneStage`, como `cargaDelDia`.
 * Sin él, la etapa se corre con la envoltura de hoy y no se graba. Guarda en memoria las filas del día
 * hasta `flush` (5-l): quien corre etapas dentro de una transacción llama a `flush` antes de confirmarla.
 */
export interface TimelineTickLog {
  /** Una etapa grabada: su fila, pendiente hasta flush, y la nota de tamaño si pasa del tope (15-g). */
  recorded(row: StageTimelineRow, sizeNote: string | null): void
  /** Una etapa sin línea: su lápida, pendiente hasta flush, y su nota (`timeline I1: …`, `timeline I5: …` o `timeline error: …`). */
  failed(tombstone: StageTimelineRow, note: string): void
  /**
   * Los títulos vigentes el día `gameDay`, UNA vez por día y mundo aunque corran 187 etapas (§7.4, 7-c):
   * la cota inferior estricta de la vigencia hace que sirvan para todas las del día. Un fallo no se
   * recuerda, para que la etapa siguiente lo vuelva a intentar.
   */
  titlesOn(
    q: Queryable,
    worldId: string,
    gameDay: number,
  ): Promise<ReadonlyMap<string, readonly ChampionTitle[]>>
  /**
   * Escribe las filas pendientes en un solo `INSERT … ON CONFLICT DO NOTHING` dentro de un punto de
   * guardado, y las olvida. Una fila que el INSERT no escribe porque la etapa ya tenía una (un tick
   * reintentado tras escribirla, o un reinicio que no vació la tabla, §17.19) va a las notas como
   * `timeline error: <raceKey> e<n> ya tenía fila`. Si ese INSERT falla, escribe en otro punto de
   * guardado una lápida `{ reason: 'error' }` por cada etapa pendiente, y si también falla, no escribe
   * ninguna (esas etapas abren con el adaptador, D-07); las dos cosas van a las notas. El fallo no llega
   * a la transacción del día.
   */
  flush(tx: Tx): Promise<void>
  /**
   * Para `tick_log.notes`: `timeline: 312 grabadas, 1 sin línea` y detrás las notas, 20 como mucho (`… y
   * 7 más`); null si no hubo etapas. Cuenta lo que `flush` escribió, no lo que se grabó en memoria.
   */
  summary(): string | null
}

/** Las notas de un tick que caben en `tick_log.notes`: las demás se cuentan. */
const MAX_NOTES = 20

export function timelineTickLog(
  opts: { readonly titles?: ChampionTitleSource } = {},
): TimelineTickLog {
  const source = opts.titles ?? palmaresTitleSource
  const pending: StageTimelineRow[] = []
  const notes: string[] = []
  let lines = 0
  let tombstones = 0
  let touched = false
  let titles: {
    readonly key: string
    readonly value: ReadonlyMap<string, readonly ChampionTitle[]>
  } | null = null

  const count = (written: readonly StageTimelineRow[]): void => {
    for (const r of written) {
      if (r.format === TIMELINE_TOMBSTONE_FORMAT) tombstones += 1
      else lines += 1
    }
  }
  const writeInSavepoint = async (tx: Tx, rows: readonly StageTimelineRow[]): Promise<void> => {
    const left = await tx.transaction((sp) => writeStageTimelineRows(sp, rows))
    const notWritten = new Set(left)
    count(rows.filter((r) => !notWritten.has(r)))
    for (const r of left) notes.push(`timeline error: ${r.raceId} e${r.stageDay} ya tenía fila`)
  }

  return {
    recorded(row, sizeNote) {
      touched = true
      pending.push(row)
      if (sizeNote !== null) notes.push(sizeNote)
    },
    failed(tombstone, note) {
      touched = true
      pending.push(tombstone)
      notes.push(note)
    },
    async titlesOn(q, worldId, gameDay) {
      const key = `${worldId}|${gameDay}`
      if (titles?.key === key) return titles.value
      const value = await source.titlesOn(q, worldId, gameDay)
      titles = { key, value }
      return value
    },
    async flush(tx) {
      const rows = pending.splice(0)
      if (rows.length === 0) return
      try {
        await writeInSavepoint(tx, rows)
      } catch (err) {
        const message = messageOf(err)
        notes.push(`timeline error: el INSERT del día falló (${rows.length} etapas): ${message}`)
        try {
          await writeInSavepoint(
            tx,
            rows.map((r) =>
              tombstoneRow(
                { raceKey: r.raceId, stageDay: r.stageDay, gameDay: r.gameDay, tplRev: 0 },
                { reason: 'error', message },
              ),
            ),
          )
        } catch (err2) {
          notes.push(
            `timeline error: las lápidas del día tampoco se escribieron: ${messageOf(err2)}`,
          )
        }
      }
    },
    summary() {
      if (!touched && notes.length === 0) return null
      const shown = notes.slice(0, MAX_NOTES)
      const rest = notes.length - shown.length
      return [
        `timeline: ${lines} grabadas, ${tombstones} sin línea`,
        ...shown,
        ...(rest > 0 ? [`… y ${rest} más`] : []),
      ].join(' · ')
    },
  }
}

// =============================================================== cerrar la línea de una etapa (§5.5)

/** Lo que `recordStageTimeline` necesita de la etapa recién corrida: lo tiene `runOneStage` en memoria. */
export interface RecordStageContext {
  /** la grabación en marcha, o null si el grabador no llegó a arrancar */
  readonly run: StageTimelineRun | null
  /** por qué no arrancó, si no arrancó */
  readonly startFailure?: unknown
  readonly worldId: string
  readonly gameDay: number
  readonly raceKey: string
  /** el id del calendario: el nombre de los puertos reales (`STAGE_FEATURES`) y la categoría */
  readonly raceId: string
  readonly stageDay: number
  readonly kind: string
  readonly timeTrial: boolean
  readonly seed: string
  readonly input: StageInput
  readonly output: StageOutput
  /** la radio COMPLETA del colector (`stageRadio`); el grabador la ignora en una crono */
  readonly radio: RaceRadio
  readonly riders: CastContext['riders']
  readonly gcRows: CastContext['gcRows']
  readonly attrsByRider: ReadonlyMap<string, Readonly<Record<Attribute, number>>>
}

/**
 * CIERRA LA LÍNEA DE UNA ETAPA Y DEJA SU FILA EN EL DIARIO (§5.5). La llama `runOneStage` justo
 * después de escribir `stage_snapshots`, dentro de la transacción del día, y no escribe nada: la fila,
 * línea o lápida, espera en el diario hasta `flush`. El cierre, el gzip y la autocomprobación son
 * JavaScript y sus errores se capturan sin tocar la base; lo único que la toca es la lectura del reparto
 * (`buildTimelineCast` y los títulos del día), en un punto de guardado que solo lee, así que un error suyo
 * deshace ese punto y nunca la transacción del día. Nunca lanza.
 *
 * Si la autocomprobación no se cumple (I1 en línea, I5 en crono), la etapa se queda sin línea con su
 * lápida y la nota `timeline I1: <raceKey> e<n> km <k>` (o `timeline I5: … rider <id>`); si algo lanza,
 * con la nota `timeline error: <raceKey> e<n> <mensaje>`. Una línea que pasa de su tope de B6 se escribe
 * igual y deja `timeline size: <raceKey> e<n> <bytes>` (15-g).
 */
export async function recordStageTimeline(
  tx: Tx,
  log: TimelineTickLog,
  ctx: RecordStageContext,
): Promise<void> {
  const meta: StageTimelineMeta = {
    raceKey: ctx.raceKey,
    stageDay: ctx.stageDay,
    gameDay: ctx.gameDay,
    tplRev: TEMPLATE_REV,
  }
  const where = `${ctx.raceKey} e${ctx.stageDay}`
  try {
    const run = ctx.run
    if (run === null) throw ctx.startFailure ?? new Error('el grabador no arrancó')
    const failure = run.failure()
    if (failure !== undefined) throw failure
    const profile = profileStripOf(ctx.input.profile, {
      raceId: ctx.raceId,
      stageDay: ctx.stageDay,
    })
    const cast = await tx.transaction(async (sp) =>
      buildTimelineCast(sp, {
        worldId: ctx.worldId,
        gameDay: ctx.gameDay,
        raceKey: ctx.raceKey,
        raceId: ctx.raceId,
        stageDay: ctx.stageDay,
        kind: ctx.kind,
        timeTrial: ctx.timeTrial,
        input: ctx.input,
        profile,
        riders: ctx.riders,
        gcRows: ctx.gcRows,
        attrsByRider: ctx.attrsByRider,
        titles: await log.titlesOn(sp, ctx.worldId, ctx.gameDay),
      }),
    )
    const tl = run.recorder.finish({
      input: ctx.input,
      output: ctx.output,
      radio: ctx.timeTrial ? null : ctx.radio,
      cast,
      profile,
      weather: freezeStageWeather(ctx.input, ctx.seed),
    })
    if (ctx.timeTrial) {
      const misses = selfCheckI5(tl, ctx.output)
      const first = misses[0]
      if (first !== undefined) {
        log.failed(
          tombstoneRow(meta, { reason: 'I5', mismatches: misses.slice(0, 20) }),
          `timeline I5: ${where} rider ${tl.riderIds[first.rider] ?? first.rider}`,
        )
        return
      }
    } else {
      const misses = selfCheckI1(tl, run.recorder.kmPhotos)
      const first = misses[0]
      if (first !== undefined) {
        log.failed(
          tombstoneRow(meta, { reason: 'I1', mismatches: misses.slice(0, 20) }),
          `timeline I1: ${where} km ${Math.round(first.km * 100) / 100}`,
        )
        return
      }
    }
    const { row, bytes } = stageTimelineRow(tl, meta)
    const cap = ctx.timeTrial ? TIMELINE.ttMaxStoredBytes : TIMELINE.maxStoredBytes
    log.recorded(row, bytes > cap ? `timeline size: ${where} ${bytes}` : null)
  } catch (err) {
    const message = messageOf(err)
    log.failed(
      tombstoneRow(meta, {
        reason: err instanceof TimelineFormatError ? 'format' : 'error',
        message,
      }),
      `timeline error: ${where} ${message}`,
    )
  }
}

// ========================================================================== la lectura (§5.6, 5-p)

/** La etapa tiene lápida o su cuerpo no se deja decodificar: abre solo en `Report` (D-12, §14.4). */
export class TimelineUnavailableError extends Error {
  constructor(
    readonly raceKey: string,
    readonly stageDay: number,
    readonly reason: TimelineFailureReason | 'decode',
  ) {
    super(`stage_timelines: ${raceKey} e${stageDay} sin línea (${reason})`)
    this.name = 'TimelineUnavailableError'
  }
}

const FAILURE_REASONS: readonly TimelineFailureReason[] = ['I1', 'I5', 'format', 'error']

/**
 * El motivo de una lápida, validado al leer: lo que viene de la base es un borde. Una lápida cuyo motivo
 * no se entiende es un cuerpo ilegible (lanza, y quien llama lo cuenta como `decode`). `packages/db` no
 * depende de Zod; la línea sí pasa por el esquema de `decodeTimeline`.
 */
function tombstoneReasonOf(json: unknown): TimelineFailureReason {
  if (typeof json === 'object' && json !== null && 'format' in json && 'reason' in json) {
    const reason = FAILURE_REASONS.find((r) => r === json.reason)
    if (json.format === TIMELINE_TOMBSTONE_FORMAT && reason !== undefined) return reason
  }
  throw new Error('lápida ilegible')
}

/**
 * LRU de líneas decodificadas en el proceso de la API (D-10): el dato es inmutable, así que no se
 * invalida nunca. Cada entrada es la línea con el `tpl_rev` de su fila, o el error de su lápida o de un
 * cuerpo que no se decodifica. La clave no lleva el mundo: por eso el reinicio reinicia el servicio
 * `web` (13-h, `docs/ops.md`).
 */
type Decoded = { readonly tl: StageTimeline; readonly tplRev: number } | TimelineUnavailableError
const decoded = new Map<string, Decoded>()

/** La entrada de la etapa, del LRU o de la base. null sin fila, y eso no se guarda: la etapa aún puede correrse y grabarse. */
async function decodedEntry(
  db: Queryable,
  raceKey: string,
  stageDay: number,
): Promise<Decoded | null> {
  const key = `${raceKey}|${stageDay}`
  const hit = decoded.get(key)
  if (hit !== undefined) {
    // el más reciente, al final
    decoded.delete(key)
    decoded.set(key, hit)
    return hit
  }
  const [row] = await db
    .select({
      format: stageTimelines.format,
      tplRev: stageTimelines.tplRev,
      body: stageTimelines.body,
    })
    .from(stageTimelines)
    .where(and(eq(stageTimelines.raceId, raceKey), eq(stageTimelines.stageDay, stageDay)))
  if (row === undefined) return null
  let entry: Decoded
  try {
    const json: unknown = JSON.parse(gunzipSync(row.body).toString('utf8'))
    entry =
      row.format === TIMELINE_TOMBSTONE_FORMAT
        ? new TimelineUnavailableError(raceKey, stageDay, tombstoneReasonOf(json))
        : { tl: decodeTimeline(json), tplRev: row.tplRev }
  } catch {
    // Zod (una forma que no es la del esquema) o TimelineFormatError (un format sin decodificador o
    // listas que no casan, §4.3, H-13): las dos son una etapa sin línea, nunca un 500.
    entry = new TimelineUnavailableError(raceKey, stageDay, 'decode')
  }
  decoded.set(key, entry)
  if (decoded.size > BROADCAST.decodedCacheEntries) {
    // el más antiguo
    const oldest = decoded.keys().next()
    if (oldest.done !== true) decoded.delete(oldest.value)
  }
  return entry
}

/**
 * LA LÍNEA GRABADA DE UNA ETAPA (§5.6, 5-p). `stage_timelines` es una fuente de D-32 y el `Horizon` es
 * obligatorio aunque la lectura no lo use: el velo y el límite de lo alcanzado los deciden `stageGateOf`
 * y `race_watch` en la ruta (§10.11, 14-p). Devuelve la línea entera; el corte lo hace quien sirve (D-06,
 * §14.3). null: la etapa no tiene fila (corrida antes del paso 5 o con `TIMELINE_RECORD=off`), y quien
 * llama sirve el adaptador (D-07). Una lápida o un cuerpo que no se decodifica lanzan
 * `TimelineUnavailableError`. Nadie la llama todavía: la pone delante del adaptador el 6a.
 */
export async function readStageTimeline(
  db: Queryable,
  _h: Horizon,
  raceKey: string,
  stageDay: number,
): Promise<StageTimeline | null> {
  const e = await decodedEntry(db, raceKey, stageDay)
  if (e instanceof TimelineUnavailableError) throw e
  return e?.tl ?? null
}

/**
 * La revisión de plantillas con que se redactan la voz y el acta de la etapa (`BroadcastHead.tplRev` y
 * `StageReport.tplRev`, §4.11; 12-c): el `tpl_rev` de su fila, de la misma entrada del LRU, así que
 * detrás de `readStageTimeline` no vuelve a la base. 0 sin fila (el adaptador) y 0 en una lápida.
 */
export async function readStageTemplateRev(
  db: Queryable,
  _h: Horizon,
  raceKey: string,
  stageDay: number,
): Promise<number> {
  const e = await decodedEntry(db, raceKey, stageDay)
  return e === null || e instanceof TimelineUnavailableError ? 0 : e.tplRev
}

/** Solo para los tests y los scripts: cada base de PGlite reutiliza claves de carrera. */
export function clearStageTimelineCache(): void {
  decoded.clear()
}
