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
  const maxTeams = Math.max(1, Math.floor(FIELD_CAP / size))
  const teamRows = await tx
    .select({ id: teams.id, philosophy: teams.philosophy, division: teams.division })
    .from(teams)
    .where(and(eq(teams.worldId, worldId), inArray(teams.division, race.openTo)))
    .orderBy(desc(teams.budget))
    .limit(maxTeams)
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
      if (existing.length === 0) await convokeField(tx, worldId, race, raceKey, worldSeed, season)
    }

    const stage = race.stages[idx - 1]
    if (!stage) continue
    const r = await runOneStage(tx, worldId, gameDay, worldSeed, {
      raceKey,
      raceId: race.id,
      raceName: race.name,
      level: race.level,
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
