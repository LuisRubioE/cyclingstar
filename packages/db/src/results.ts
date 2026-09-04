import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { gcOrderBy } from './gcSort.js'
import { raceGc, raceRosters, riders, stageResults, stageSnapshots, teams } from './schema.js'

/** Lecturas de resultados y clasificaciones para la web del replay (Paso 31, pulido). */

export interface GcRow {
  riderId: string
  name: string
  country: string
  /** Id del equipo, para poder marcar al equipo líder de la clasificación por equipos. */
  teamId: string | null
  teamName: string | null
  isBot: boolean
  tiempoTotalS: number
  puntosVolante: number
  puntosMontana: number
  /** Abandonó la carrera (caída grave): ya no está clasificado, se muestra como DNF al final. */
  dnf: boolean
}

export async function getRaceGc(db: Database, raceId: string): Promise<GcRow[]> {
  const rows = await db
    .select({
      riderId: raceGc.riderId,
      name: riders.name,
      country: riders.country,
      teamId: teams.id,
      teamName: teams.name,
      userId: riders.userId,
      tiempoTotalS: raceGc.tiempoTotalS,
      puntosVolante: raceGc.puntosVolante,
      puntosMontana: raceGc.puntosMontana,
      abandonedDay: raceRosters.abandonedDay,
    })
    .from(raceGc)
    .innerJoin(riders, eq(riders.id, raceGc.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .leftJoin(
      raceRosters,
      and(eq(raceRosters.raceId, raceGc.raceId), eq(raceRosters.riderId, raceGc.riderId)),
    )
    .where(eq(raceGc.raceId, raceId))
    // Los que abandonaron caen al final (no están clasificados); el resto por tiempo y, a igualdad de
    // tiempo, por el desempate del ciclismo (mejores puestos acumulados). Ver `gcSort.ts`.
    .orderBy(sql`case when ${raceRosters.abandonedDay} is null then 0 else 1 end`, ...gcOrderBy())
  return rows.map(({ userId, abandonedDay, ...r }) => ({
    ...r,
    isBot: userId === null,
    dnf: abandonedDay !== null,
  }))
}

// La clasificación por equipos NO se deriva de la general: se acumulan los tres mejores DE CADA
// ETAPA, que no son los mismos corredores cada día. Vive entera en `teamClassification.ts`.

export interface StageResultRow {
  riderId: string
  name: string
  country: string
  teamId: string | null
  teamName: string | null
  isBot: boolean
  puesto: number
  tiempoS: number
  bonificacionS: number
  puntosVolante: number
  puntosMontana: number
  /**
   * NO ACABÓ LA ETAPA (v50): tomó la salida y no está en la clasificación. `puesto` y `tiempoS`
   * valen 0 y no significan nada; la fila existe para que el corredor no desaparezca de la hoja.
   */
  dnf: boolean
  /**
   * POR QUÉ no acabó, tal como lo guardó `race_rosters.abandonedReason`: `colapso` (se bajó de la
   * bici), `lesion` (caída), `fuera_control` (llegó fuera del corte), `enfermedad` o `voluntario`.
   * `null` cuando no hay motivo guardado —una carrera de UN DÍA no marca abandonos, porque no hay
   * resto de carrera que abandonar— y entonces la interfaz dice «DNF» a secas.
   */
  reason: string | null
}

export async function getStageResults(
  db: Database,
  raceId: string,
  stageDay: number,
): Promise<StageResultRow[]> {
  return db
    .select({
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      teamId: teams.id,
      teamName: teams.name,
      isBot: sql<boolean>`${riders.userId} is null`,
      puesto: stageResults.puesto,
      tiempoS: stageResults.tiempoS,
      bonificacionS: stageResults.bonificacionS,
      puntosVolante: stageResults.puntosVolante,
      puntosMontana: stageResults.puntosMontana,
      dnf: sql<boolean>`false`,
      reason: sql<string | null>`null`,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(stageResults.raceId, raceId), eq(stageResults.stageDay, stageDay)))
    .orderBy(asc(stageResults.puesto))
}

/**
 * LOS QUE TOMARON LA SALIDA Y NO ESTÁN EN LA CLASIFICACIÓN (v50).
 *
 * El dueño, sobre la etapa 2 de una vuelta: «el maillot amarillo lo lleva Jean Vandenbroucke… no
 * sale en el resultado de la etapa, ni hay mención en el journal… parece que se retiró en algún
 * punto, pero **no sé si fue antes de salir o en medio de la etapa**». Y luego, más corto: «los DNF
 * no salen en la clasificación de la etapa».
 *
 * Tenía razón las dos veces, y el motor no era el culpable: `simulateStage` devuelve a TODOS con su
 * `estado` (`finish`, `abandon`, `dnf`), y es `stageRun.ts` quien, al guardar, se queda solo con los
 * clasificados —a los demás solo les apunta la carga del día—. Así que en la hoja de la etapa no
 * desaparecían por un defecto de pintado: es que no había fila que pintar.
 *
 * SE DERIVA AL LEER, y no se guardan filas nuevas en `stage_results`, a propósito. Esa tabla la
 * agregan seis consultas distintas —la general, la montaña, los puntos, la clasificación por
 * equipos, el palmarés y el desempate por suma de puestos— y varias cuentan `count(distinct
 * stage_day)` para saber a quién le falta una etapa. Meter ahí filas de gente que no acabó obligaría
 * a acordarse de excluirlas en las seis, y olvidarse en UNA da una clasificación mal en silencio,
 * que es justo la familia de defectos que esta tanda viene arreglando.
 *
 * La lista de salida sale del SNAPSHOT de la etapa (`input.riders`), que es exactamente el campo que
 * el motor corrió ese día y que las dos rutas ya cargan. Con eso las dos preguntas del dueño se
 * contestan solas: **si no está en la lista de salida, no tomó la salida; si está y no está
 * clasificado, se retiró en carretera**.
 */
export async function getStageNonFinishers(
  db: Database,
  raceId: string,
  stageDay: number,
  startedRiderIds: readonly string[],
): Promise<StageResultRow[]> {
  if (startedRiderIds.length === 0) return []
  const clasificados = await db
    .select({ riderId: stageResults.riderId })
    .from(stageResults)
    .where(and(eq(stageResults.raceId, raceId), eq(stageResults.stageDay, stageDay)))
  const enLaHoja = new Set(clasificados.map((r) => r.riderId))
  const faltan = startedRiderIds.filter((id) => !enLaHoja.has(id))
  if (faltan.length === 0) return []
  return db
    .select({
      riderId: riders.id,
      name: riders.name,
      country: riders.country,
      teamId: teams.id,
      teamName: teams.name,
      isBot: sql<boolean>`${riders.userId} is null`,
      // No hay puesto ni tiempo, y no se inventan: el que no acaba no está clasificado.
      puesto: sql<number>`0`,
      tiempoS: sql<number>`0`,
      bonificacionS: sql<number>`0`,
      puntosVolante: sql<number>`0`,
      puntosMontana: sql<number>`0`,
      dnf: sql<boolean>`true`,
      reason: raceRosters.abandonedReason,
    })
    .from(riders)
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .leftJoin(raceRosters, and(eq(raceRosters.raceId, raceId), eq(raceRosters.riderId, riders.id)))
    .where(inArray(riders.id, faltan))
    .orderBy(asc(riders.name))
}

/** Identidad completa de un inscrito, para nombrar a los protagonistas de la crónica. */
export interface RaceRiderIdentity {
  riderId: string
  name: string
  country: string
  teamName: string | null
  bib: number | null
}

/**
 * Identidad de TODOS los inscritos en la carrera: dorsal, equipo y país. La crónica la necesita
 * porque el dueño pidió que cada mención de un ciclista lleve su dorsal, su equipo y su bandera, y
 * los resultados de la etapa no bastan: solo traen a los clasificados (el que se cayó y no acabó es
 * protagonista de eventos y no aparecería) y no tienen el dorsal, que vive en `race_rosters.bib`.
 * En un roster antiguo, sin dorsales asignados, `bib` viene a null y la crónica degrada sola.
 */
export async function getRaceRiderIdentities(
  db: Database,
  raceId: string,
): Promise<RaceRiderIdentity[]> {
  const rows = await db
    .select({
      riderId: raceRosters.riderId,
      name: riders.name,
      country: riders.country,
      teamName: teams.name,
      bib: raceRosters.bib,
    })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(eq(raceRosters.raceId, raceId))
  return rows.map((r) => ({ ...r, country: r.country ?? '' }))
}

/**
 * Clasificación general tal como estaba tras la etapa `stageDay` (tiempo neto acumulado).
 *
 * Se recalcula desde `stage_results` (no desde `race_gc`, que solo guarda el estado actual), así que
 * el desempate se deriva aquí de los mismos datos: suma de puestos hasta esa etapa y puesto en la
 * última disputada. Mismo criterio y mismo orden total que `gcOrderBy()`.
 */
/**
 * La general ACUMULADA hasta una etapa, para la ficha de esa etapa.
 *
 * Se suma sobre `stage_results`, y eso tiene una trampa que costó un falso líder en producción: si
 * un corredor NO tiene fila en una etapa —porque abandonó, porque no tomó la salida o por cualquier
 * agujero— su suma es menor y **la ausencia le hace más rápido**. En la Race Colombia, Roberto
 * Martínez no terminó la etapa 8 y la general le puso primero con 4h36 sobre el segundo, después de
 * haber sido 129.º y 130.º en las dos reinas anteriores: las 6h09 del ganador de la etapa que no
 * corrió eran su «ventaja». `riderResults.ts` ya avisaba de esto por escrito y por eso el perfil se
 * había pasado a `race_gc`; esta consulta, que es la que ve el jugador en la pestaña de general de
 * cada etapa, se quedó con la mala.
 *
 * Dos defensas, y las dos hacen falta:
 *  1. **Quien abandonó no está clasificado** (`race_rosters.abandoned_day`): cae al final y sale
 *     marcado como DNF, igual que en `getRaceGc`.
 *  2. **Solo se clasifica quien tiene TODAS las etapas corridas hasta hoy.** Es la red que hace
 *     imposible por construcción que a alguien le beneficie faltar, esté marcado el abandono o no:
 *     si a un corredor le falta un día, no puede estar en la general aunque nadie lo haya anotado.
 */
export async function getGcThroughStage(
  db: Database,
  raceId: string,
  stageDay: number,
): Promise<
  {
    riderId: string
    name: string
    country: string
    teamId: string | null
    teamName: string | null
    isBot: boolean
    tiempoTotalS: number
    dnf: boolean
  }[]
> {
  const net = sql<number>`sum(${stageResults.tiempoS} - ${stageResults.bonificacionS})::int`
  const sumaPuestos = sql<number>`sum(${stageResults.puesto})::int`
  const ultimoPuesto = sql<number>`(array_agg(${stageResults.puesto} order by ${stageResults.stageDay} desc))[1]`
  // Cuántas etapas de esta carrera se han corrido hasta `stageDay`: el que no las tenga todas no
  // está clasificado. Se cuenta sobre los propios resultados para no depender del calendario.
  const stagesRun = db
    .select({ n: sql<number>`count(distinct ${stageResults.stageDay})::int`.as('n') })
    .from(stageResults)
    .where(and(eq(stageResults.raceId, raceId), lte(stageResults.stageDay, stageDay)))
  const mine = sql<number>`count(distinct ${stageResults.stageDay})::int`
  /**
   * NO CLASIFICADO = LE FALTA ALGUNA DE LAS ETAPAS CORRIDAS HASTA AQUÍ. Nada más, y ahí está el
   * arreglo (v45).
   *
   * Antes esto era «abandonó **o** le falta una etapa», con el abandono leído del roster
   * (`abandonedDay is not null`). Y esa pregunta **no mira la etapa que se está viendo**: el roster
   * guarda el estado FINAL del corredor en la carrera, así que en cuanto alguien se bajaba en la
   * etapa 8 aparecía como DNF también en la clasificación de la 1, la 2 y la 3 —donde iba
   * perfectamente clasificado y a veces de líder—.
   *
   * El dueño lo vio en Race Guatemala: «pone DNF... si ha pasado eso en la última etapa, solo
   * debería salir eso en la última, no en el resto».
   *
   * Y la condición que queda basta SOLA, que es lo que hace que esto sea una resta y no un parche:
   * el que abandona **no deja fila** en `stage_results` (ver `stageRun.ts`, «ABANDONOS DEL MOTOR»),
   * así que para cualquier etapa a partir de la suya le faltan etapas y sale DNF, y para las
   * anteriores las tiene todas y sale clasificado. La comprobación del roster era redundante ADEMÁS
   * de estar mal.
   */
  const unranked = sql<boolean>`(${mine} < (${stagesRun}))`
  const rows = await db
    .select({
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      teamId: teams.id,
      teamName: teams.name,
      isBot: sql<boolean>`bool_and(${riders.userId} is null)`,
      tiempoTotalS: net,
      dnf: unranked.as('dnf'),
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(stageResults.raceId, raceId), lte(stageResults.stageDay, stageDay)))
    .groupBy(stageResults.riderId, riders.name, riders.country, teams.id, teams.name)
    .orderBy(
      sql`case when ${unranked} then 1 else 0 end`,
      asc(net),
      asc(sumaPuestos),
      asc(ultimoPuesto),
      asc(stageResults.riderId),
    )
  return rows
}

export interface PointsRow {
  riderId: string
  name: string
  country: string
  isBot: boolean
  puntos: number
}

/**
 * Clasificación por puntos (metas volantes). Acumulada en toda la carrera, o solo hasta `throughStage`
 * (inclusive) si se indica —para ver la clasificación tal como quedó tras una etapa concreta—.
 */
export async function getPointsClassification(
  db: Database,
  raceId: string,
  throughStage?: number,
): Promise<PointsRow[]> {
  const total = sql<number>`sum(${stageResults.puntosVolante})::int`
  const rows = await db
    .select({
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      isBot: sql<boolean>`bool_and(${riders.userId} is null)`,
      puntos: total,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .where(
      and(
        eq(stageResults.raceId, raceId),
        throughStage != null ? lte(stageResults.stageDay, throughStage) : undefined,
      ),
    )
    .groupBy(stageResults.riderId, riders.name, riders.country)
    .orderBy(desc(total))
  return rows.filter((r) => r.puntos > 0)
}

export interface StageWinnerRow {
  stageDay: number
  riderId: string
  name: string
  country: string
  teamName: string | null
  isBot: boolean
}

/** Ganadores de cada etapa de una carrera (puesto 1), en orden de etapa (Paso 44). */
export async function getStageWinners(db: Database, raceId: string): Promise<StageWinnerRow[]> {
  const rows = await db
    .select({
      stageDay: stageResults.stageDay,
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      teamName: teams.name,
      userId: riders.userId,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(stageResults.raceId, raceId), eq(stageResults.puesto, 1)))
    .orderBy(asc(stageResults.stageDay))
  return rows.map(({ userId, ...r }) => ({ ...r, isBot: userId === null }))
}

/**
 * Clasificación de la montaña (cimas). Acumulada en toda la carrera, o solo hasta `throughStage`
 * (inclusive) si se indica —para ver la montaña tal como quedó tras una etapa concreta—.
 */
export async function getKomClassification(
  db: Database,
  raceId: string,
  throughStage?: number,
): Promise<PointsRow[]> {
  const total = sql<number>`sum(${stageResults.puntosMontana})::int`
  const rows = await db
    .select({
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      isBot: sql<boolean>`bool_and(${riders.userId} is null)`,
      puntos: total,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .where(
      and(
        eq(stageResults.raceId, raceId),
        throughStage != null ? lte(stageResults.stageDay, throughStage) : undefined,
      ),
    )
    .groupBy(stageResults.riderId, riders.name, riders.country)
    .orderBy(desc(total))
  return rows.filter((r) => r.puntos > 0)
}

export interface StageSnapshotRow {
  seed: string
  engineVersion: number
  input: unknown
  /** Crónica congelada al correr la etapa; null en snapshots antiguos (sin journal detallado). */
  events: unknown
  /** Radio de carrera congelada al correr la etapa; null en snapshots anteriores a guardarla. */
  radio: unknown
}

export async function getStageSnapshot(
  db: Database,
  raceId: string,
  stageDay: number,
): Promise<StageSnapshotRow | null> {
  const rows = await db
    .select({
      seed: stageSnapshots.seed,
      engineVersion: stageSnapshots.engineVersion,
      input: stageSnapshots.input,
      events: stageSnapshots.events,
      radio: stageSnapshots.radio,
    })
    .from(stageSnapshots)
    .where(and(eq(stageSnapshots.raceId, raceId), eq(stageSnapshots.stageDay, stageDay)))
    .limit(1)
  return rows[0] ?? null
}

/** El recorrido que se corrió de verdad en una etapa, sacado de su snapshot. */
export interface RacedProfileRow {
  stageDay: number
  /** `StageProfile` congelado; se tipa en quien lo consume, que es quien conoce el motor. */
  profile: unknown
  timeTrial: boolean
}

/**
 * Los recorridos REALMENTE corridos de todas las etapas de una carrera, en una sola consulta.
 *
 * El calendario se recalcula desde el código, así que la ficha de una etapa ya corrida cambia si
 * cambia el generador de recorridos (ver `apps/api/src/stageHistory.ts`). Para la página de la
 * carrera, que dibuja de un tirón las etapas de toda la vuelta, hace falta leerlos en lote: uno por
 * uno serían 21 consultas en una gran vuelta.
 */
export async function getRacedStageProfiles(
  db: Database,
  raceId: string,
): Promise<RacedProfileRow[]> {
  const rows = await db
    .select({ stageDay: stageSnapshots.stageDay, input: stageSnapshots.input })
    .from(stageSnapshots)
    .where(eq(stageSnapshots.raceId, raceId))
  return rows.map((r) => {
    const input = r.input as { profile?: unknown; timeTrial?: boolean } | null
    return {
      stageDay: r.stageDay,
      profile: input?.profile ?? null,
      timeTrial: input?.timeTrial === true,
    }
  })
}

/** Días de etapa que ya se han corrido (tienen resultados), para listar el estado de la vuelta. */
export async function getRunStageDays(db: Database, raceId: string): Promise<number[]> {
  const rows = await db
    .selectDistinct({ stageDay: stageResults.stageDay })
    .from(stageResults)
    .where(eq(stageResults.raceId, raceId))
    .orderBy(asc(stageResults.stageDay))
  return rows.map((r) => r.stageDay)
}
