/**
 * LO VISTO (E2, docs/retransmision.md §10.2, §10.3 y §10.12; D-28, D-29, D-30, D-55, D-57; decisiones
 * 10-a, 10-l y 10-m). Nace en el paso 7a, con la `0048_lo_visto`.
 *
 * Qué ha visto cada espectador de cada carrera vive en `race_watch`, una fila por (jugador, mundo,
 * carrera): lo conocido es el prefijo 1..known_through, con una letra por etapa en `how` (W directo, S
 * resumen o digest, R revelada, A arrastrada, X caducada), y la etapa a medias, en `watching_stage` y
 * `reached_s`. Aquí están las cuatro escrituras (`recordProgress`, `revealStage`, `setFollow` y
 * `setSpoilerScope`) y las dos lecturas que las rodean (`readWatch` y `readSpoilerPrefs`); el horizonte
 * que sale de ellas lo calcula `horizon.ts`.
 *
 * Las dos escrituras de lo conocido corren en UNA transacción que crea la fila si no existe y la
 * bloquea (`select … for update`) antes de calcular en TypeScript la fila nueva: dos dispositivos que
 * escriben a la vez no pierden letras y gana el máximo (D-57, `watchConcurrency.test.ts`). Todas
 * escriben con `.set({ … })` o `.values({ … })` de Drizzle y los campos por su nombre, porque es lo
 * único que `columnasVivas.test.ts` reconoce como escritura de `follow`, `knownThrough` y `horizonRev`
 * (13-a). Y las invariantes de la fila (`how` con `known_through` letras; a medias, solo la etapa
 * `known_through + 1`, y con lo alcanzado) las pone además la base con sus tres `CHECK` (13-b).
 *
 * `ProgressMemory` es la memoria del proceso de D-55: el último informe de lo alcanzado por (jugador,
 * mundo, carrera), que decide cuándo se escribe (10-l) y que el tope de los tramos del 7b lee aunque no
 * esté escrito (§10.11). Nadie fuera de este fichero y de `horizon.ts` nombra `race_watch` (B20,
 * `revealFree.test.ts`): ningún premio, logro, moral ni dinero lee lo visto (D-38).
 */
import { BROADCAST, type SpoilerScope, type WatchMode } from '@cyclingstar/shared'
import { and, eq, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { type KnowledgeLetter, stageCountOf } from './horizon.js'
import { raceWatch, users } from './schema.js'

/**
 * La letra con que queda una etapa cuando lo alcanzado llega a la meta (D-28): directo o resumen; el
 * digest cuenta como visto en resumen (DD-20). Un salto (`seek`) no cruza nunca la meta (8-j); si un
 * cliente lo informara, queda revelada (8-e).
 */
export const LETTER_OF_MODE = {
  play: 'W',
  summary: 'S',
  digest: 'S',
  seek: 'R',
} as const satisfies Record<WatchMode, KnowledgeLetter>

/** La fila: un jugador, un mundo, una carrera. */
export interface WatchKey {
  readonly userId: string
  readonly worldId: string
  readonly raceKey: string
}

/** La fila de `race_watch` de una carrera. */
export interface WatchRow {
  readonly follow: -1 | 0 | 1
  readonly knownThrough: number
  readonly how: string
  readonly watchingStage: number | null
  readonly reachedS: number | null
}

/** Lo que devuelve una escritura de lo alcanzado. */
export interface ProgressResult {
  /** `known`: la etapa ya es conocida (o fuera del velo con una X, 10-e) y volver a verla no mueve nada */
  readonly status: 'watching' | 'known'
  /** `users.horizon_rev` tras escribir: la mitad del `rev` que devuelve la ruta (§14.2) */
  readonly horizonRev: number
  /** si esta escritura puso `follow` a 1 (seguir al empezar a ver, D-30) */
  readonly followed: boolean
}

const keyOf = (k: WatchKey) =>
  and(
    eq(raceWatch.userId, k.userId),
    eq(raceWatch.worldId, k.worldId),
    eq(raceWatch.raceKey, k.raceKey),
  )

const FOLLOW_VALUES: readonly WatchRow['follow'][] = [-1, 0, 1]
const asFollow = (n: number): WatchRow['follow'] => FOLLOW_VALUES.find((f) => f === n) ?? 0

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Crea la fila si no existe y la bloquea hasta el final de la transacción (D-57). */
async function lockRow(tx: Tx, k: WatchKey): Promise<WatchRow> {
  await tx
    .insert(raceWatch)
    .values({ userId: k.userId, worldId: k.worldId, raceKey: k.raceKey })
    .onConflictDoNothing()
  const [r] = await tx
    .select({
      follow: raceWatch.follow,
      knownThrough: raceWatch.knownThrough,
      how: raceWatch.how,
      watchingStage: raceWatch.watchingStage,
      reachedS: raceWatch.reachedS,
    })
    .from(raceWatch)
    .where(keyOf(k))
    .for('update')
  if (r === undefined) throw new Error(`race_watch: la fila de ${k.raceKey} no está tras crearla`)
  return { ...r, follow: asFollow(r.follow) }
}

/** Escribe la fila nueva de una carrera. */
async function writeRow(tx: Tx, k: WatchKey, r: WatchRow): Promise<void> {
  await tx
    .update(raceWatch)
    .set({
      follow: r.follow,
      knownThrough: r.knownThrough,
      how: r.how,
      watchingStage: r.watchingStage,
      reachedS: r.reachedS,
      updatedAt: sql`now()`,
    })
    .where(keyOf(k))
}

/** `users.horizon_rev + 1`, en la misma transacción; devuelve el nuevo. */
async function bumpHorizonRev(tx: Tx, userId: string): Promise<number> {
  const [u] = await tx
    .update(users)
    .set({ horizonRev: sql`${users.horizonRev} + 1` })
    .where(eq(users.id, userId))
    .returning({ rev: users.horizonRev })
  if (u === undefined) throw new Error(`race_watch: no existe el usuario ${userId}`)
  return u.rev
}

async function currentHorizonRev(tx: Tx, userId: string): Promise<number> {
  const [u] = await tx.select({ rev: users.horizonRev }).from(users).where(eq(users.id, userId))
  return u?.rev ?? 0
}

/**
 * LO ALCANZADO EN LA ETAPA `stageDay` (§10.3). En el primer progreso de una etapa, lo anterior no
 * conocido se arrastra con `A` (decisión 10-a: la ruta solo llama sin la puerta `previous_unseen`, así
 * que esas etapas están fuera del velo) y una carrera con `follow` 0 pasa a seguida (D-30); después,
 * `watching_stage = N` y `reached_s` el mayor de lo escrito y lo nuevo (D-57). Si lo alcanzado llega a
 * `finishS`, la etapa pasa a conocida con la letra de su modo y la etapa a medias se vacía. Una etapa
 * ya conocida no registra nada: volver a ver no mueve nada. `horizon_rev` sube al arrastrar, al pasar a
 * conocida y al seguir. Una carrera soltada (`follow` −1) sigue soltada: ver no lo deshace.
 */
export function recordProgress(
  db: Database,
  k: WatchKey,
  stageDay: number,
  reachedS: number,
  mode: WatchMode,
  finishS: number,
): Promise<ProgressResult> {
  return db.transaction(async (tx) => {
    const r = await lockRow(tx, k)
    if (stageDay <= r.knownThrough)
      return { status: 'known', horizonRev: await currentHorizonRev(tx, k.userId), followed: false }
    let { follow, knownThrough, how, watchingStage, reachedS: reached } = r
    let bump = false
    if (knownThrough < stageDay - 1) {
      how += 'A'.repeat(stageDay - 1 - knownThrough)
      knownThrough = stageDay - 1
      bump = true
    }
    const followed = follow === 0
    if (followed) {
      follow = 1
      bump = true
    }
    if (reachedS >= finishS) {
      how += LETTER_OF_MODE[mode]
      knownThrough = stageDay
      watchingStage = null
      reached = null
      bump = true
    } else {
      const floor = Math.floor(reachedS)
      reached = watchingStage === stageDay && reached !== null ? Math.max(reached, floor) : floor
      watchingStage = stageDay
    }
    await writeRow(tx, k, { follow, knownThrough, how, watchingStage, reachedS: reached })
    const horizonRev = bump
      ? await bumpHorizonRev(tx, k.userId)
      : await currentHorizonRev(tx, k.userId)
    return { status: knownThrough >= stageDay ? 'known' : 'watching', horizonRev, followed }
  })
}

/**
 * CONOCER LA ETAPA SIN VERLA (§10.3): `R` para ella y `A` para los huecos de antes. Con `expired`, la
 * carrera ya caducó (§10.5) y se escribe `X` en todas las que faltan hasta la última: es el acuse del
 * aviso de caducidad (10-f). La etapa a medias se vacía si queda conocida. No toca `follow`. Si nada
 * cambia (la etapa ya era conocida), no escribe ni sube `horizon_rev`.
 */
export function revealStage(
  db: Database,
  k: WatchKey,
  stageDay: number,
  expired: boolean,
): Promise<{ readonly horizonRev: number }> {
  return db.transaction(async (tx) => {
    const r = await lockRow(tx, k)
    let { knownThrough, how, watchingStage, reachedS } = r
    if (expired) {
      const last = Math.max(stageCountOf(k.raceKey) ?? stageDay, stageDay)
      if (knownThrough < last) {
        how += 'X'.repeat(last - knownThrough)
        knownThrough = last
      }
    } else if (knownThrough < stageDay) {
      how += 'A'.repeat(stageDay - 1 - knownThrough) + 'R'
      knownThrough = stageDay
    }
    if (knownThrough === r.knownThrough)
      return { horizonRev: await currentHorizonRev(tx, k.userId) }
    if (watchingStage !== null && watchingStage <= knownThrough) {
      watchingStage = null
      reachedS = null
    }
    await writeRow(tx, k, { follow: r.follow, knownThrough, how, watchingStage, reachedS })
    return { horizonRev: await bumpHorizonRev(tx, k.userId) }
  })
}

/**
 * `Follow without spoilers` (1), `Stop protecting this race` (−1) o volver a la regla (0). Nada más:
 * seguir a mano no arrastra, y protege desde ya las etapas corridas y no conocidas (10-a). Sube
 * `horizon_rev` si cambia.
 */
export function setFollow(
  db: Database,
  k: WatchKey,
  follow: -1 | 0 | 1,
): Promise<{ readonly horizonRev: number }> {
  return db.transaction(async (tx) => {
    const r = await lockRow(tx, k)
    if (r.follow === follow) return { horizonRev: await currentHorizonRev(tx, k.userId) }
    await writeRow(tx, k, { ...r, follow })
    return { horizonRev: await bumpHorizonRev(tx, k.userId) }
  })
}

/**
 * El alcance del velo y la confirmación al revelar, en `users`. `horizon_rev` sube solo si cambia el
 * alcance (la confirmación no cambia nada de lo que se conoce). `revealConfirm` ausente no se toca:
 * `exactOptionalPropertyTypes` distingue ausente de `undefined`, y la ruta lo pasa tal cual (§14.2).
 */
export async function setSpoilerScope(
  db: Database,
  userId: string,
  scope: SpoilerScope,
  revealConfirm: boolean | undefined,
): Promise<{ readonly horizonRev: number }> {
  const [u] = await db
    .update(users)
    .set({
      spoilerScope: scope,
      ...(revealConfirm === undefined ? {} : { revealConfirm }),
      // En un UPDATE, la columna de la derecha es la de antes: sube solo si el alcance cambia.
      horizonRev: sql`case when ${users.spoilerScope} = ${scope} then ${users.horizonRev} else ${users.horizonRev} + 1 end`,
    })
    .where(eq(users.id, userId))
    .returning({ rev: users.horizonRev })
  if (u === undefined) throw new Error(`setSpoilerScope: no existe el usuario ${userId}`)
  return { horizonRev: u.rev }
}

/** La fila de una carrera, o null: la leen la cabecera, la ruta de etapa (7b) y las pruebas (§14.1). */
export async function readWatch(db: Database, k: WatchKey): Promise<WatchRow | null> {
  const [r] = await db
    .select({
      follow: raceWatch.follow,
      knownThrough: raceWatch.knownThrough,
      how: raceWatch.how,
      watchingStage: raceWatch.watchingStage,
      reachedS: raceWatch.reachedS,
    })
    .from(raceWatch)
    .where(keyOf(k))
  return r === undefined ? null : { ...r, follow: asFollow(r.follow) }
}

/** El alcance y la confirmación de un jugador (`GET /api/me/horizon` con el interruptor apagado), o null. */
export async function readSpoilerPrefs(
  db: Database,
  userId: string,
): Promise<{ readonly scope: SpoilerScope; readonly revealConfirm: boolean } | null> {
  const [u] = await db
    .select({ scope: users.spoilerScope, revealConfirm: users.revealConfirm })
    .from(users)
    .where(eq(users.id, userId))
  return u ?? null
}

// ------------------------------------------------- la memoria del proceso (D-55; 10-l y 10-m)

/** Lo último informado de una carrera, en la memoria del proceso. */
interface Reported {
  readonly k: WatchKey
  readonly stageDay: number
  readonly mode: WatchMode
  readonly finishS: number
  /** lo último informado, sin redondear: lo que admite el tope de los tramos (§10.11, 7b) */
  readonly reachedS: number
  /** lo último escrito en `race_watch.reached_s` para esta etapa; null si no hay nada escrito */
  readonly writtenS: number | null
  /** la hora de pared de la última escritura de esta carrera */
  readonly writtenAtMs: number
  /** la hora de pared del último informe: el barrido mira esta */
  readonly reportedAtMs: number
  /** la etapa ya es conocida: un informe más no escribe nada (volver a ver no mueve nada) */
  readonly known: boolean
}

/** Lo que hizo un informe. */
export interface ReportOutcome {
  readonly status: 'watching' | 'known'
  /** `users.horizon_rev` tras escribir; null si este informe no escribió (la ruta usa el de su horizonte) */
  readonly horizonRev: number | null
  readonly wrote: boolean
}

export interface ProgressMemoryOptions {
  /** s de carrera que tiene que crecer lo alcanzado para escribir: `PROGRESS_MIN_DELTA_S ?? BROADCAST.progressMinDeltaS` (15-j) */
  readonly minDeltaS?: number
  /** ms de pared entre dos escrituras de una carrera (10-l): `BROADCAST.progressEveryRealS` */
  readonly everyMs?: number
  /** ms de pared sin informes tras los que una entrada se barre: cuatro informes (10-m) */
  readonly staleMs?: number
  /** lo que se hace con el fallo de una escritura lanzada sin esperar al barrer (10-k): registrarlo */
  readonly onLateWriteError?: (err: unknown, k: WatchKey) => void
}

/**
 * LA MEMORIA DE LO ALCANZADO (D-55, §10.3, §18.4). El reproductor informa cada `progressEveryRealS` de
 * pared (15 s) y en cuatro momentos más; escribir cada informe serían cuatro escrituras por minuto y
 * espectador, y hasta ochenta en los modos rápidos. Así que el proceso guarda el último informe de cada
 * (jugador, mundo, carrera) y solo escribe en `race_watch`:
 *
 * - siempre que cambia el estado: una etapa nueva (el primer informe de una etapa, que además arrastra
 *   y sigue la carrera) y la meta;
 * - y si no, cuando lo alcanzado creció al menos `minDeltaS` (60 s de carrera) desde lo último escrito
 *   Y han pasado `everyMs` (15 s) de pared desde la última escritura de esa carrera (10-l).
 *
 * Cada informe pone su entrada al final del `Map` y barre desde el principio las que llevan `staleMs`
 * (60 s) sin informes, escribiendo antes, sin esperar y con su `.catch`, lo informado que aún no esté
 * escrito (10-m): la memoria guarda solo a quien mira ahora. El tope de los tramos (7b) lee
 * `reachedOf`, que es lo último informado aunque no esté escrito. Con más de una instancia de la API la
 * memoria no se comparte (§18.4): el servicio `web` corre una.
 */
export class ProgressMemory {
  private readonly entries = new Map<string, Reported>()
  private readonly minDeltaS: number
  private readonly everyMs: number
  private readonly staleMs: number
  private readonly onLateWriteError: (err: unknown, k: WatchKey) => void

  constructor(opts: ProgressMemoryOptions = {}) {
    this.minDeltaS = opts.minDeltaS ?? BROADCAST.progressMinDeltaS
    this.everyMs = opts.everyMs ?? BROADCAST.progressEveryRealS * 1000
    this.staleMs = opts.staleMs ?? 4 * this.everyMs
    this.onLateWriteError = opts.onLateWriteError ?? (() => {})
  }

  private static keyOf(k: WatchKey): string {
    return `${k.userId}|${k.worldId}|${k.raceKey}`
  }

  /** Lo pone al final del Map (el orden de inserción es el de los informes) y barre las viejas. */
  private put(db: Database, e: Reported): void {
    const key = ProgressMemory.keyOf(e.k)
    this.entries.delete(key)
    this.entries.set(key, e)
    this.sweep(db, e.reportedAtMs)
  }

  /**
   * Un informe de lo alcanzado en la etapa `stageDay`. La ruta ya ha mirado la sesión y la puerta
   * (`previous_unseen` no llega aquí, §14.2). Escribe con `recordProgress` cuando toca (arriba); si
   * no, solo recuerda.
   */
  async report(
    db: Database,
    k: WatchKey,
    stageDay: number,
    reachedS: number,
    mode: WatchMode,
    finishS: number,
    nowMs: number,
  ): Promise<ReportOutcome> {
    const e = this.entries.get(ProgressMemory.keyOf(k))
    const same = e !== undefined && e.stageDay === stageDay
    if (same && e.known) {
      this.put(db, { ...e, reportedAtMs: nowMs })
      return { status: 'known', horizonRev: null, wrote: false }
    }
    const reached = same ? Math.max(e.reachedS, reachedS) : reachedS
    const atFinish = reached >= finishS
    const due =
      same &&
      nowMs - e.writtenAtMs >= this.everyMs &&
      Math.floor(reached) - (e.writtenS ?? Number.NEGATIVE_INFINITY) >= this.minDeltaS
    if (!(!same || atFinish || due)) {
      this.put(db, { ...e, mode, finishS, reachedS: reached, reportedAtMs: nowMs })
      return { status: 'watching', horizonRev: null, wrote: false }
    }
    const r = await recordProgress(db, k, stageDay, reached, mode, finishS)
    this.put(db, {
      k,
      stageDay,
      mode,
      finishS,
      reachedS: reached,
      writtenS: r.status === 'known' ? null : Math.floor(reached),
      writtenAtMs: nowMs,
      reportedAtMs: nowMs,
      known: r.status === 'known',
    })
    return { status: r.status, horizonRev: r.horizonRev, wrote: true }
  }

  /** Lo último informado de esa etapa, o null: el tope de los tramos del 7b (§10.11). */
  reachedOf(k: WatchKey, stageDay: number): number | null {
    const e = this.entries.get(ProgressMemory.keyOf(k))
    return e !== undefined && e.stageDay === stageDay && !e.known ? e.reachedS : null
  }

  /** La meta ya está escrita (`POST …/broadcast/finish`): la entrada sobra (§10.3). */
  forget(k: WatchKey): void {
    this.entries.delete(ProgressMemory.keyOf(k))
  }

  /**
   * Barre desde el principio las entradas sin informes en `staleMs`, escribiendo antes lo informado que
   * no esté escrito, sin esperar (10-m). Lo llama cada informe; sin informes nadie barre, y las entradas
   * esperan al siguiente.
   */
  sweep(db: Database, nowMs: number): void {
    for (const [key, e] of this.entries) {
      if (nowMs - e.reportedAtMs < this.staleMs) break
      this.entries.delete(key)
      if (e.known || Math.floor(e.reachedS) <= (e.writtenS ?? Number.NEGATIVE_INFINITY)) continue
      recordProgress(db, e.k, e.stageDay, e.reachedS, e.mode, e.finishS).catch((err: unknown) =>
        this.onLateWriteError(err, e.k),
      )
    }
  }

  /** Cuántas carreras recuerda: para las pruebas (B12) y para medir (§18.4). */
  get size(): number {
    return this.entries.size
  }
}
