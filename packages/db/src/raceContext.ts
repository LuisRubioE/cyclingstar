import type { RaceContext, RaceMemory, RaceShape, StageProfile } from '@cyclingstar/engine'
import { SEASON_CALENDAR, finalKindOf, kmAfterLastClimb, lastClimbKm } from '@cyclingstar/engine'
import { and, eq, lt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { getRaceClassifications, standingsByRider } from './classifications.js'
import { stageResults } from './schema.js'

/**
 * EL CONTEXTO DE CARRERA QUE `packages/db` LE DA AL MOTOR (docs/tactica.md §3.3, paso 4).
 *
 * Es lo que convierte una etapa suelta en **el día N de una carrera**: qué queda de recorrido, cómo
 * van las secundarias y qué recuerda la carrera de los días anteriores.
 *
 * **Nadie lo lee todavía.** Se construye y viaja; cada racimo irá leyendo el suyo en su paso. El
 * invariante que este paso tiene que cumplir es el contrario del habitual: con `race` puesto y con
 * `race` quitado, las cuatro huellas selladas salen **idénticas**.
 */

type Db = ReturnType<typeof drizzle>
type Conn = Database | Parameters<Parameters<Db['transaction']>[0]>[0]

/** La forma de lo que queda: se lee del perfil, que es geometría y cuesta lo que cuesta leerlo. */
export function raceShapeOf(profile: StageProfile, kmDone: number, daysLeft: number): RaceShape {
  const totalKm = profile.segments.reduce((a, s) => a + s.km, 0)
  const ultima = lastClimbKm(profile)
  return {
    totalKm,
    kmDone,
    // El siguiente puerto es el primero que queda por delante del km recorrido.
    nextClimbKm: siguientePuerto(profile, kmDone),
    lastClimbKm: ultima,
    valleyAfterLastClimbKm: kmAfterLastClimb(profile),
    daysLeft,
  }
}

function siguientePuerto(profile: StageProfile, kmDone: number): number | null {
  let km = 0
  for (const s of profile.segments) {
    km += s.km
    if (s.tipo === 'puerto' && km > kmDone) return km
  }
  return null
}

/**
 * LO QUE LA CARRERA RECUERDA. En el paso 4 son dos cosas que ya están en la base y nadie había
 * reunido: quién ha ganado ya algo —cambia cómo le miran— y qué equipos tienen su día hecho.
 *
 * Las DEUDAS de relevos nacen vacías y se dice: no hay dónde leerlas todavía. Las escribe R09 en el
 * paso 16, y hasta entonces una lista vacía es más honesta que una inventada.
 */
export async function raceMemoryOf(
  db: Conn,
  raceKey: string,
  stageDay: number,
): Promise<RaceMemory> {
  const previas = await db
    .select({ riderId: stageResults.riderId, puesto: stageResults.puesto })
    .from(stageResults)
    .where(and(eq(stageResults.raceId, raceKey), lt(stageResults.stageDay, stageDay)))
  const ganadores = [...new Set(previas.filter((r) => r.puesto === 1).map((r) => r.riderId))]
  return { debts: [], winners: ganadores, satisfiedTeams: [] }
}

/** El contexto completo de una etapa. */
export async function buildRaceContext(
  db: Conn,
  raceKey: string,
  raceId: string,
  stageDay: number,
  gameDay: number,
): Promise<RaceContext> {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  const totalStages = race?.stages.length ?? 1
  const clasif = await getRaceClassifications(db, raceKey, gameDay)
  const stage = race?.stages[stageDay - 1]
  return {
    stageDay,
    totalStages,
    ...(stage
      ? { shape: raceShapeOf(stage.profile, 0, Math.max(0, totalStages - stageDay + 1)) }
      : {}),
    standings: standingsByRider(clasif),
    memory: await raceMemoryOf(db, raceKey, stageDay),
  }
}

/** Reexportado para que quien arme el contexto no tenga que importar del motor por su cuenta. */
export { finalKindOf }
export type { RaceContext }
