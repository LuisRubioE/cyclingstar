import {
  type CalendarRace,
  type CallupCandidate,
  type Division,
  type RaceClass,
  SEASON_CALENDAR,
  type TeamPhilosophy,
  formStars,
  raceVocationFit,
  scheduledStageIndex,
  selectSquad,
} from '@cyclingstar/engine'
import { type Continent, continentForCountry, countriesInContinent } from '@cyclingstar/shared'
import { and, desc, eq, inArray, isNull, notInArray } from 'drizzle-orm'
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
/**
 * Tamaño objetivo del pelotón según la clase de carrera (acota el cómputo del motor y refleja la
 * realidad de cada nivel): una .WT junta ~22 equipos (los 18 WorldTour + wildcards Pro), una .Pro
 * ~20, y las continentales .1/.2 ~16-18 equipos regionales completados con corredores del continente.
 */
const FIELD_CAP_BY_CLASS: Record<RaceClass, number> = {
  WT: 176,
  Pro: 150,
  '1': 130,
  '2': 112,
  NC: 40,
}
/** Tope por defecto si faltara la clase (no debería ocurrir). */
const FIELD_CAP = 64
/** Plazas de wildcard (fuera de la región) reservadas por defecto en una carrera continental. */
const WILDCARD_FRACTION = 0.12

/** Hash entero estable de una cadena (para variar de forma determinista, p.ej. las wildcards). */
function hashInt(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
/**
 * Prioridad de división al llenar una carrera global (.WT/.Pro). En una .WT los equipos WorldTour
 * entran primero (plaza garantizada) y el resto son wildcards Pro; en una .Pro el núcleo son los
 * ProTeams, con WorldTour de invitados y Continental de relleno. Las continentales usan región.
 */
const DIVISION_PRIORITY: Partial<Record<RaceClass, Division[]>> = {
  WT: ['WT', 'PRS', 'CON'],
  Pro: ['PRS', 'WT', 'CON'],
}
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

/**
 * Elige los equipos del pelotón entre los admitidos (ya ordenados por presupuesto desc).
 *
 * - Carrera global (.WT/.Pro, sin región): se ordena por prioridad de división. En una .WT los 18
 *   equipos WorldTour entran garantizados y las plazas restantes son wildcards Pro; en una .Pro el
 *   núcleo son los ProTeams, con algunos WorldTour de invitados. Refleja el acceso real por nivel.
 * - Carrera regional (circuito continental .1/.2): mayoría de equipos del continente; solo si la
 *   región no llena el cupo se completan plazas con equipos de fuera (wildcards). No se fuerzan
 *   equipos extranjeros: una carrera americana la corren, sobre todo, equipos americanos.
 *
 * Pura y determinista (base de la reproducibilidad de la inscripción).
 */
export function selectFieldTeams<T extends { division?: Division; country: string | null }>(
  eligible: T[],
  cap: number,
  region?: Continent,
  priority?: Division[],
  wildcardSlots?: number,
): T[] {
  if (region) {
    const inRegion = eligible.filter((t) => continentForCountry(t.country ?? '') === region)
    const outRegion = eligible.filter((t) => continentForCountry(t.country ?? '') !== region)
    // La región es mayoría. Se reservan unas plazas de wildcard para equipos de fuera (un ProTeam
    // invitado o continentales de otro continente): el número varía por carrera (unas atraen a varios,
    // otras a ninguno), como en la realidad. Si la región no llena, las wildcards completan igual.
    const reserve = wildcardSlots ?? Math.max(1, Math.floor(cap * WILDCARD_FRACTION))
    const wildcards = Math.min(outRegion.length, reserve)
    const home = inRegion.slice(0, cap - wildcards)
    const wild = outRegion.slice(0, cap - home.length)
    return [...home, ...wild]
  }
  if (priority) {
    const rank = (d?: Division) => {
      const i = priority.indexOf(d as Division)
      return i === -1 ? priority.length : i
    }
    return [...eligible].sort((a, b) => rank(a.division) - rank(b.division)).slice(0, cap)
  }
  return eligible.slice(0, cap)
}

/**
 * Convoca el pelotón de una carrera con su escuadra (SPEC 6.18). Los equipos admitidos se eligen por
 * nivel/región (selectFieldTeams). En una carrera continental (.1/.2), si los equipos regionales no
 * llenan el pelotón objetivo, se completa con los mejores corredores del continente como entradas
 * individuales (el equivalente a selecciones nacionales y equipos club de relleno de esas carreras).
 */
async function convokeField(
  tx: Tx,
  worldId: string,
  race: CalendarRace,
  raceKey: string,
  worldSeed: string,
  season: number,
): Promise<void> {
  const size = SQUAD_SIZE[race.format]
  const fieldCap = FIELD_CAP_BY_CLASS[race.raceClass] ?? FIELD_CAP
  const cap = Math.max(1, Math.floor(fieldCap / size))
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
  // Carrera regional (circuito continental): mayoría de equipos del continente. El nº de wildcards de
  // fuera del continente varía por carrera (0..N) de forma determinista —unas atraen a varios equipos
  // extranjeros, otras a ninguno—, y una .1 (más prestigio) atrae más que una .2. Global (.WT/.Pro):
  // por prioridad de división (WorldTour garantizado en las .WT).
  const maxWild = race.raceClass === '1' ? 6 : 4
  const wildcardSlots = race.region ? hashInt(race.id) % (maxWild + 1) : undefined
  const teamRows = selectFieldTeams(
    eligible,
    cap,
    race.region,
    DIVISION_PRIORITY[race.raceClass],
    wildcardSlots,
  )
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

  // Relleno regional (solo circuito continental): si los equipos del continente no llenan el pelotón
  // objetivo, se completa con los mejores corredores del continente que aún no están inscritos —el
  // equivalente a las selecciones nacionales y equipos club que corren estas carreras en la realidad.
  if (race.region && rosterValues.length < fieldCap) {
    const already = rosterValues.map((v) => v.riderId)
    const countries = countriesInContinent(race.region)
    const conds = [
      eq(riders.worldId, worldId),
      inArray(riders.country, countries),
      isNull(riders.retiredAt),
    ]
    if (already.length > 0) conds.push(notInArray(riders.id, already))
    const fillers = await tx
      .select({ id: riders.id })
      .from(riders)
      .where(and(...conds))
      .orderBy(desc(riders.fame))
      .limit(fieldCap - rosterValues.length)
    for (const f of fillers) rosterValues.push({ raceId: raceKey, riderId: f.id })
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
