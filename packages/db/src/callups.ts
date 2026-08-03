import {
  SEASON_CALENDAR,
  type CallupCandidate,
  type TeamPhilosophy,
  formStars,
  raceVocationFit,
  selectSquad,
} from '@cyclingstar/engine'
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { contracts, raceCallups, riderRacePrefs, riders, teams } from './schema.js'

/**
 * IA de convocatorias en la capa de datos (Paso 35, SPEC 6.18, 7.2). Unos días antes de cada
 * carrera, cada equipo con corredores humanos decide su escuadra con el motor puro (selectSquad).
 * Marca lo que quiere el corredor (rider_race_prefs), registra la decisión (race_callups) y ajusta
 * la moral: no ser convocado a un objetivo marcado la baja; ser convocado la sube un poco.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const SEASON_DAYS = 364
const CALLUP_LEAD_DAYS = 5
const SQUAD_SIZE = { 'gran-vuelta': 8, 'una-semana': 7, 'un-dia': 7 } as const
const YOUNG_AGE = 23
const MORALE_SNUB = 8
const MORALE_CALLUP = 2

function clampMorale(x: number): number {
  return Math.max(0, Math.min(100, x))
}

/**
 * Un corredor humano es **agente libre** hasta que FIRMA una oferta en el mercado (Paso 36): solo
 * entonces obtiene equipo y contrato (acceptOffer escribe ambos a la vez). Este reconcilio libera a
 * cualquier humano cuyo `teamId` no esté respaldado por un contrato vigente. Repara dos casos:
 *  - el puente provisional antiguo, que asignaba equipo sin contrato al pasar el tick (bug), y
 *  - un contrato vencido, que devuelve al corredor a agencia libre para recibir nuevas ofertas.
 * Idempotente: un humano con contrato vigente no se toca; uno ya libre tampoco.
 */
export async function releaseUncontractedHumans(
  tx: Tx,
  worldId: string,
  season: number,
): Promise<void> {
  const assigned = await tx
    .select({ id: riders.id })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNotNull(riders.teamId), isNotNull(riders.userId)))
  if (assigned.length === 0) return

  for (const r of assigned) {
    const current = await tx
      .select({ endSeason: contracts.endSeason })
      .from(contracts)
      .where(eq(contracts.riderId, r.id))
      .limit(1)
    const hasValidContract = current[0] != null && current[0].endSeason >= season
    if (!hasValidContract) {
      await tx.update(riders).set({ teamId: null }).where(eq(riders.id, r.id))
    }
  }
}

/** Corre las convocatorias que toca decidir este día de juego (idempotente por temporada). */
export async function runCallups(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
): Promise<void> {
  const season = Math.floor(gameDay / SEASON_DAYS)
  await releaseUncontractedHumans(tx, worldId, season)

  const dayOfSeason = gameDay % SEASON_DAYS
  // Los campeonatos nacionales no se convocan por equipo (pelotón nacional), se excluyen aquí.
  const due = SEASON_CALENDAR.filter(
    (r) => !r.championshipCountry && r.startDay - CALLUP_LEAD_DAYS === dayOfSeason,
  )
  if (due.length === 0) return

  // Solo deciden los equipos con al menos un corredor humano (los jugadores).
  const playerTeams = await tx
    .selectDistinct({
      id: teams.id,
      division: teams.division,
      philosophy: teams.philosophy,
    })
    .from(teams)
    .innerJoin(riders, eq(riders.teamId, teams.id))
    .where(and(eq(teams.worldId, worldId), isNotNull(riders.userId)))
  if (playerTeams.length === 0) return

  for (const race of due) {
    const raceFit = raceVocationFit(race.stages.map((s) => s.kind))
    const size = SQUAD_SIZE[race.format]
    for (const team of playerTeams) {
      if (!race.openTo.includes(team.division)) continue

      // Ya decidida esta temporada.
      const existing = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(raceCallups)
        .innerJoin(riders, eq(riders.id, raceCallups.riderId))
        .where(
          and(
            eq(riders.teamId, team.id),
            eq(raceCallups.raceId, race.id),
            eq(raceCallups.season, season),
          ),
        )
      if ((existing[0]?.n ?? 0) > 0) continue

      const roster = await tx
        .select({
          id: riders.id,
          userId: riders.userId,
          archetype: riders.archetype,
          fame: riders.fame,
          ctl: riders.ctl,
          atl: riders.atl,
          teamTrust: riders.teamTrust,
          morale: riders.morale,
          birthSeason: riders.birthSeason,
        })
        .from(riders)
        .where(and(eq(riders.teamId, team.id), isNull(riders.retiredAt)))
      if (roster.length === 0) continue

      const wanted = new Set(
        (
          await tx
            .select({ riderId: riderRacePrefs.riderId })
            .from(riderRacePrefs)
            .where(eq(riderRacePrefs.raceId, race.id))
        ).map((r) => r.riderId),
      )

      const candidates: CallupCandidate[] = roster.map((r) => ({
        riderId: r.id,
        archetype: r.archetype,
        pointsSeason: Math.round(r.fame * 4), // proxy hasta que existan puntos de temporada (Paso 40)
        formStars: formStars(r.ctl, r.ctl - r.atl),
        desire: wanted.has(r.id),
        teamTrust: r.teamTrust,
        young: YOUNG_AGE >= 20 - r.birthSeason + season,
      }))

      const { squad } = selectSquad(candidates, {
        raceFit,
        philosophy: team.philosophy as TeamPhilosophy,
        size,
        seed: `${worldSeed}:${race.id}:${team.id}:s${season}`,
      })
      const selected = new Set(squad)

      for (const r of roster) {
        const isSelected = selected.has(r.id)
        const isWanted = wanted.has(r.id)
        await tx
          .insert(raceCallups)
          .values({
            riderId: r.id,
            raceId: race.id,
            season,
            decidedDay: gameDay,
            selected: isSelected,
            wanted: isWanted,
          })
          .onConflictDoNothing()
        // La moral solo se mueve para el corredor humano (la tensión del jugador, SPEC 7.2).
        if (r.userId) {
          const delta = isSelected ? MORALE_CALLUP : isWanted ? -MORALE_SNUB : 0
          if (delta !== 0) {
            await tx
              .update(riders)
              .set({ morale: clampMorale(r.morale + delta) })
              .where(eq(riders.id, r.id))
          }
        }
      }
    }
  }
}

export interface RacePrefRow {
  raceId: string
  name: string
  level: string
  format: string
  startDay: number
  stageCount: number
  wanted: boolean
  callup: 'selected' | 'not-selected' | null
}

/** El calendario para un corredor con su deseo marcado y el resultado de convocatoria si lo hay. */
export async function getRacePrefs(
  db: Database,
  riderId: string,
  season: number,
): Promise<RacePrefRow[]> {
  const prefs = new Set(
    (
      await db
        .select({ raceId: riderRacePrefs.raceId })
        .from(riderRacePrefs)
        .where(eq(riderRacePrefs.riderId, riderId))
    ).map((r) => r.raceId),
  )
  const callups = new Map(
    (
      await db
        .select({ raceId: raceCallups.raceId, selected: raceCallups.selected })
        .from(raceCallups)
        .where(and(eq(raceCallups.riderId, riderId), eq(raceCallups.season, season)))
    ).map((r) => [r.raceId, r.selected]),
  )
  // Los campeonatos nacionales no son objetivos de convocatoria de equipo: fuera de la lista.
  return SEASON_CALENDAR.filter((race) => !race.championshipCountry).map((race) => {
    const sel = callups.get(race.id)
    return {
      raceId: race.id,
      name: race.name,
      level: race.level,
      format: race.format,
      startDay: race.startDay,
      stageCount: race.stages.length,
      wanted: prefs.has(race.id),
      callup: sel === undefined ? null : sel ? ('selected' as const) : ('not-selected' as const),
    }
  })
}

/** Marca o desmarca una carrera como objetivo del corredor. */
export async function setRacePref(
  db: Database,
  riderId: string,
  raceId: string,
  wanted: boolean,
): Promise<void> {
  if (!SEASON_CALENDAR.some((r) => r.id === raceId)) throw new Error('carrera desconocida')
  if (wanted) {
    await db.insert(riderRacePrefs).values({ riderId, raceId }).onConflictDoNothing()
  } else {
    await db
      .delete(riderRacePrefs)
      .where(and(eq(riderRacePrefs.riderId, riderId), eq(riderRacePrefs.raceId, raceId)))
  }
}
