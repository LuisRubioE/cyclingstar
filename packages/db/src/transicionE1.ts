import {
  type CalendarRace,
  SEASON_CALENDAR,
  legacyCalendar,
  stageDayOfSeason,
} from '@cyclingstar/engine'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import type { RouteSource } from './raceRoutes.js'
import { raceRoutes, worlds } from './schema.js'

/**
 * LA TRANSICIÓN E1: LAS CARRERAS DE LOS PRÓXIMOS 10 DÍAS CONSERVAN EL RECORRIDO VIEJO (v88).
 *
 * `race_routes` congela el recorrido de una carrera el día de su etapa 1, con el generador que haya
 * en ese momento; hasta entonces la carrera se lee con `stagesForSeason`. Así que al desplegar el
 * generador nuevo (v87/v88) TODA carrera no empezada pasó a verse con él, también las de la semana
 * que viene: esas pueden estar ya convocadas y los jugadores las han visto con el recorrido viejo.
 *
 * Regla del dueño, a nivel de carrera: una carrera cuya etapa 1 cae en los días de juego
 * `[díaActual, díaActual + 10]` y que no está congelada se congela ENTERA con el recorrido del
 * generador viejo (`legacyCalendar()`, que reproduce byte a byte el calendario de la v86 y no varía
 * por temporada). Las ya congeladas no se tocan (las empezadas, sobre todo). Las de más allá no se
 * tocan y se verán y correrán con el generador nuevo.
 *
 * UNA VEZ POR MUNDO: la marca es `worlds.e1_transicion_hasta` (el último día de la ventana). Con la
 * marca puesta no hace nada; un mundo nacido con la v88 o después nace marcado (`tick.ts`).
 *
 * TEMPORAL: el día que se borre `sim/legacy/` esta operación ya habrá corrido en todos los mundos y
 * se borra con él (la columna puede quedarse o retirarse con drizzle-kit).
 */

/** Días de juego por temporada: la misma cuenta que `raceKeysForDay` en `calendarRun.ts`. */
const SEASON_DAYS = 364

/** Días de juego, contados desde el actual, cuyas carreras conservan el recorrido viejo. */
export const E1_TRANSICION_DIAS = 10

/** La base o una transacción (el mismo alias que `raceRoutes.ts`). */
type Db = ReturnType<typeof drizzle>
type Conn = Database | Parameters<Parameters<Db['transaction']>[0]>[0]

/** Lo que hizo la transición: la ventana y las carreras que congeló con el recorrido viejo. */
export interface ResultadoTransicionE1 {
  desde: number
  hasta: number
  congeladas: string[]
}

/**
 * Las `raceKey` de las carreras cuya etapa 1 cae en `[desde, hasta]`, cada una con su temporada: la
 * aritmética de `raceKeysForDay` (`calendarRun.ts`), así que una ventana que cruza el fin de
 * temporada da las carreras de la temporada siguiente con su sufijo `:s{n}`.
 */
export function carrerasQueEmpiezanEntre(
  desde: number,
  hasta: number,
): { raceKey: string; race: CalendarRace }[] {
  const out: { raceKey: string; race: CalendarRace }[] = []
  for (let dia = desde; dia <= hasta; dia++) {
    const season = Math.floor(dia / SEASON_DAYS)
    const dayOfSeason = dia % SEASON_DAYS
    for (const race of SEASON_CALENDAR) {
      if (stageDayOfSeason(race, 1) === dayOfSeason)
        out.push({ raceKey: `${race.id}:s${season}`, race })
    }
  }
  return out
}

/**
 * Corre la transición E1 en un mundo si no ha corrido todavía. Devuelve `null` si la marca ya estaba
 * puesta (no hace nada). Idempotente también por dentro: una carrera con alguna fila congelada no se
 * toca, como en `backfillRaceRoutes`. Pensada para ir en una transacción: congelado y marca van
 * juntos, o ninguno.
 */
export async function congelarTransicionE1(
  db: Conn,
  worldId: string,
  diaActual: number,
): Promise<ResultadoTransicionE1 | null> {
  const [mundo] = await db
    .select({ hasta: worlds.e1TransicionHasta })
    .from(worlds)
    .where(eq(worlds.id, worldId))
    .limit(1)
  if (!mundo || mundo.hasta !== null) return null

  const desde = diaActual
  const hasta = diaActual + E1_TRANSICION_DIAS
  const viejas = new Map(legacyCalendar().map((r) => [r.id, r]))
  const congeladas: string[] = []
  for (const { raceKey, race } of carrerasQueEmpiezanEntre(desde, hasta)) {
    const vieja = viejas.get(race.id)
    // El calendario viejo tiene las mismas carreras, días y número de etapas que el de hoy (el
    // generador solo cambia perfiles); si alguna no casara, se deja al generador nuevo antes que
    // congelar un recorrido que no cuadra con los días en que se corre.
    if (!vieja || vieja.stages.length !== race.stages.length) continue
    const antes = await db
      .select({ stageDay: raceRoutes.stageDay })
      .from(raceRoutes)
      .where(and(eq(raceRoutes.worldId, worldId), eq(raceRoutes.raceKey, raceKey)))
      .limit(1)
    if (antes.length > 0) continue
    const filas = vieja.stages.map((stage, i) => ({
      worldId,
      raceKey,
      stageDay: i + 1,
      profile: stage.profile,
      routeSource: stage.routeSource satisfies RouteSource,
      kind: stage.kind,
      label: stage.label,
      timeTrial: stage.timeTrial ?? false,
      arch: null,
    }))
    if (filas.length === 0) continue
    await db.insert(raceRoutes).values(filas).onConflictDoNothing()
    congeladas.push(raceKey)
  }
  await db.update(worlds).set({ e1TransicionHasta: hasta }).where(eq(worlds.id, worldId))
  return { desde, hasta, congeladas }
}
