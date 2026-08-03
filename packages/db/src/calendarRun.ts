import {
  type CalendarRace,
  type CallupCandidate,
  SEASON_CALENDAR,
  type TeamPhilosophy,
  formStars,
  raceVocationFit,
  scheduledStageIndex,
  selectSquad,
} from '@cyclingstar/engine'
import { type Continent, continentForCountry } from '@cyclingstar/shared'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { raceRosters, riderRacePrefs, riders, teams } from './schema.js'
import { runOneStage } from './stageRun.js'

/**
 * El calendario corre en el tick (Paso 44). Cada carrera del calendario (SPEC 8) ejecuta sus etapas
 * en el día de temporada que le toca; el día de arranque convoca un pelotón real (los mejores
 * equipos de las divisiones admitidas, con la escuadra elegida por el motor de convocatorias). El
 * almacenamiento se indexa por carrera y temporada (`${raceId}:s${season}`), así que cada año deja
 * su propio historial. Delega la simulación en stageRun.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const SEASON_DAYS = 364
const SQUAD_SIZE = { 'gran-vuelta': 8, 'una-semana': 7, 'un-dia': 7 } as const
/** Tope de corredores por pelotón, para acotar el cómputo del motor. */
const FIELD_CAP = 64
const YOUNG_AGE = 23
/** Pelotón de un campeonato nacional: los mejores del país, y mínimo para que se dispute. */
const NATIONAL_FIELD_CAP = 40
const NATIONAL_FIELD_MIN = 5

/**
 * Convoca un campeonato nacional (.NC): pelotón individual con los mejores corredores en activo del
 * país (por fama, proxy de nivel), sin importar su equipo. Si la nación no reúne el mínimo, no se
 * disputa esa temporada (roster vacío → la etapa no corre). Incluye a corredores humanos del país.
 */
async function convokeNationalField(
  tx: Tx,
  worldId: string,
  race: CalendarRace,
  raceKey: string,
): Promise<void> {
  const country = race.championshipCountry
  if (!country) return
  const best = await tx
    .select({ id: riders.id })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), eq(riders.country, country), isNull(riders.retiredAt)))
    .orderBy(desc(riders.fame))
    .limit(NATIONAL_FIELD_CAP)
  if (best.length < NATIONAL_FIELD_MIN) return
  await tx
    .insert(raceRosters)
    .values(best.map((r) => ({ raceId: raceKey, riderId: r.id })))
    .onConflictDoNothing()
}

/** Cuota de plazas de wildcard (equipos de fuera de la región) en una carrera regional. */
const WILDCARD_FRACTION = 0.25

/**
 * Elige los equipos del pelotón entre los admitidos (ya ordenados por presupuesto desc). En una
 * carrera regional, reserva la mayoría de plazas a equipos del continente y unas pocas de wildcard a
 * equipos de fuera; si la región no llena su cupo, las wildcards completan. Sin región, los mejores
 * por presupuesto. Pura y determinista (base de la reproducibilidad de la inscripción).
 */
export function selectFieldTeams<T extends { country: string | null }>(
  eligible: T[],
  cap: number,
  region?: Continent,
): T[] {
  if (!region) return eligible.slice(0, cap)
  const inRegion = eligible.filter((t) => continentForCountry(t.country ?? '') === region)
  const outRegion = eligible.filter((t) => continentForCountry(t.country ?? '') !== region)
  const wildcards = Math.min(outRegion.length, Math.max(1, Math.floor(cap * WILDCARD_FRACTION)))
  const home = inRegion.slice(0, cap - wildcards)
  const wild = outRegion.slice(0, cap - home.length)
  return [...home, ...wild]
}

/** Convoca el pelotón de una carrera: los mejores equipos admitidos, con su escuadra (SPEC 6.18). */
async function convokeField(
  tx: Tx,
  worldId: string,
  race: CalendarRace,
  raceKey: string,
  worldSeed: string,
  season: number,
): Promise<void> {
  const size = SQUAD_SIZE[race.format]
  const cap = Math.max(1, Math.floor(FIELD_CAP / size))
  const eligible = await tx
    .select({
      id: teams.id,
      philosophy: teams.philosophy,
      division: teams.division,
      country: teams.country,
    })
    .from(teams)
    .where(and(eq(teams.worldId, worldId), inArray(teams.division, race.openTo)))
    .orderBy(desc(teams.budget))
  // Carrera regional (circuito continental): preferencia a los equipos del continente y unas pocas
  // plazas de wildcard para equipos de fuera. Sin región, se toman los mejores por presupuesto.
  const teamRows = selectFieldTeams(eligible, cap, race.region)
  if (teamRows.length === 0) return
  const teamIds = teamRows.map((t) => t.id)

  const candidates = await tx
    .select({
      id: riders.id,
      teamId: riders.teamId,
      archetype: riders.archetype,
      fame: riders.fame,
      ctl: riders.ctl,
      atl: riders.atl,
      teamTrust: riders.teamTrust,
      birthSeason: riders.birthSeason,
    })
    .from(riders)
    .where(and(inArray(riders.teamId, teamIds), isNull(riders.retiredAt)))
  const byTeam = new Map<string, typeof candidates>()
  for (const c of candidates) {
    if (!c.teamId) continue
    const list = byTeam.get(c.teamId) ?? []
    list.push(c)
    byTeam.set(c.teamId, list)
  }

  const wanted = new Set(
    (
      await tx
        .select({ riderId: riderRacePrefs.riderId })
        .from(riderRacePrefs)
        .where(eq(riderRacePrefs.raceId, race.id))
    ).map((r) => r.riderId),
  )
  const raceFit = raceVocationFit(race.stages.map((s) => s.kind))

  const rosterValues: { raceId: string; riderId: string }[] = []
  for (const team of teamRows) {
    const members = byTeam.get(team.id) ?? []
    if (members.length === 0) continue
    const cands: CallupCandidate[] = members.map((m) => ({
      riderId: m.id,
      archetype: m.archetype,
      pointsSeason: Math.round(m.fame * 4),
      formStars: formStars(m.ctl, m.ctl - m.atl),
      desire: wanted.has(m.id),
      teamTrust: m.teamTrust,
      young: YOUNG_AGE >= 20 - m.birthSeason + season,
    }))
    const { squad } = selectSquad(cands, {
      raceFit,
      philosophy: team.philosophy as TeamPhilosophy,
      size,
      seed: `${worldSeed}:field:${raceKey}:${team.id}`,
    })
    for (const id of squad) rosterValues.push({ raceId: raceKey, riderId: id })
  }
  if (rosterValues.length > 0) {
    await tx.insert(raceRosters).values(rosterValues).onConflictDoNothing()
  }
}

/** Corre las etapas del calendario que tocan este día de juego. Devuelve quién corrió. */
export async function runCalendarDay(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
): Promise<Set<string>> {
  const season = Math.floor(gameDay / SEASON_DAYS)
  const dayOfSeason = gameDay % SEASON_DAYS
  const raced = new Set<string>()

  for (const race of SEASON_CALENDAR) {
    const idx = scheduledStageIndex(race, dayOfSeason)
    if (idx == null) continue
    const raceKey = `${race.id}:s${season}`

    if (idx === 1) {
      const existing = await tx
        .select({ riderId: raceRosters.riderId })
        .from(raceRosters)
        .where(eq(raceRosters.raceId, raceKey))
        .limit(1)
      if (existing.length === 0) {
        if (race.championshipCountry) await convokeNationalField(tx, worldId, race, raceKey)
        else await convokeField(tx, worldId, race, raceKey, worldSeed, season)
      }
    }

    const stage = race.stages[idx - 1]
    if (!stage) continue
    const r = await runOneStage(tx, worldId, gameDay, worldSeed, {
      raceKey,
      raceId: race.id,
      raceName: race.name,
      level: race.level,
      raceClass: race.raceClass,
      season,
      stageDay: idx,
      kind: stage.kind,
      profile: stage.profile,
      timeTrial: stage.timeTrial ?? false,
      isFinal: idx === race.stages.length,
    })
    for (const id of r) raced.add(id)
  }

  return raced
}
