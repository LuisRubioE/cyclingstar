import {
  type CalendarRace,
  type CallupCandidate,
  type Division,
  type RaceClass,
  SEASON_CALENDAR,
  type TeamPhilosophy,
  formStars,
  gcPointsByClass,
  raceLastDay,
  raceOngoingBefore,
  raceVocationFit,
  scheduledStageIndex,
  selectSquad,
  stagePointsByClass,
} from '@cyclingstar/engine'
import {
  type Continent,
  continentForCountry,
  countriesInContinent,
  raceAttendanceCost,
} from '@cyclingstar/shared'
import { and, asc, desc, eq, inArray, isNotNull, isNull, notInArray, or, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { creditRider } from './economy.js'
import {
  palmares,
  raceEntries,
  raceGc,
  raceRosters,
  riderRacePrefs,
  riders,
  stageResults,
  teamRacePlan,
  teams,
} from './schema.js'
import { runOneStage } from './stageRun.js'
import { ownedTeamAttendance } from './teamPlan.js'

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
/**
 * Cierre de inscripciones: días de juego antes de la salida en que se congela la escuadra de cada
 * carrera (SPEC 8). Como en el ciclismo real, los equipos nombran a sus corredores ~2 semanas antes,
 * no el día de la salida. Coincide con la ventana en que se muestra la lista de inscritos.
 */
export const ENROLL_LOCK_DAYS = 14
/**
 * Tamaño de escuadra por carrera (SPEC 8): en una GRAN VUELTA son 8 fijos (mínimo y máximo); en el
 * resto de carreras WorldTour/ProTeam, 7; en las CONTINENTALES (.1/.2), 6 como mucho y 5 como mínimo.
 * Un equipo que no reúne el mínimo de corredores disponibles no se presenta (nada de «medio equipo»);
 * su plaza la ocupa otro equipo o el relleno individual del continente.
 */
function squadFor(race: CalendarRace): { size: number; min: number } {
  if (race.format === 'gran-vuelta') return { size: 8, min: 8 }
  if (race.raceClass === '1' || race.raceClass === '2') return { size: 6, min: 5 }
  return { size: 7, min: 7 }
}

/**
 * Condición de "apto para correr": excluye a los ENFERMOS y LESIONADOS (SPEC 6.14, 4.3). Un corredor
 * con molestias leves sí puede tomar la salida (rinde algo peor por su eff), pero uno de baja se queda
 * en casa hasta recuperarse. La recuperación la hace el entrenamiento del tick al pasar su healthUntilDay.
 */
function fitToRace() {
  return notInArray(riders.health, ['enfermo', 'lesionado'])
}
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
  // Continentales (.1/.2): el NÚCLEO son los equipos Continental; los ProTeams entran como invitados
  // limitados (no deben dominar una carrera continental por tener más presupuesto).
  '1': ['CON', 'PRS'],
  '2': ['CON', 'PRS'],
}
/** Fracción máxima de plazas «de casa» para equipos invitados de división superior en una continental. */
const CONTINENTAL_GUEST_FRACTION = 0.3

/**
 * Plan de temporada de las tres grandes vueltas. Prestigio (0 = el mejor): el Tour se lleva a los
 * mejores. Un equipo WorldTour (que las corre las tres) reparte su plantilla por aptitud en tres
 * grupos DISJUNTOS —el mejor al Tour, el siguiente al Giro, el siguiente a la Vuelta, y así— de modo
 * que cada gran vuelta corre con corredores distintos y los de la Vuelta llegan frescos (no son las
 * sobras cansadas de las otras dos).
 */
const GRAND_TOUR_PRESTIGE: Record<string, number> = {
  'race-france': 0,
  'race-italy': 1,
  'race-spain': 2,
}
/** Aptitud de gran vuelta por vocación (escaladores y fondistas primero, velocistas al final). */
const GT_VOCATION_BONUS: Record<string, number> = {
  escalada: 30,
  fondo: 20,
  crono: 10,
  clasicas: 5,
  velocidad: 0,
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
  busy: Set<string>,
  season: number,
): Promise<string[]> {
  const country = race.championshipCountry
  if (!country) return []
  const pool = await tx
    .select({ id: riders.id, birthSeason: riders.birthSeason, userId: riders.userId })
    .from(riders)
    .where(
      and(
        eq(riders.worldId, worldId),
        eq(riders.country, country),
        isNull(riders.retiredAt),
        fitToRace(),
      ),
    )
    .orderBy(desc(riders.fame))
    .limit(NATIONAL_FIELD_CAP * 3)
  // El sub-23 solo admite corredores de 23 años o menos (edad = 20 - birthSeason + temporada).
  const ageOk = (r: { birthSeason: number }) =>
    race.championshipCategory !== 'u23' || 20 - r.birthSeason + season <= 23
  const available = pool.filter((r) => ageOk(r) && !busy.has(r.id))
  // Un JUGADOR siempre corre el campeonato de SU país (aunque tenga poca fama): se incluyen todos los
  // humanos elegibles del país, y el resto del pelotón se completa con los mejores NPC hasta el cupo.
  const humans = available.filter((r) => r.userId != null).map((r) => r.id)
  const npcs = available.filter((r) => r.userId == null).map((r) => r.id)
  const best = [...new Set([...humans, ...npcs])].slice(0, NATIONAL_FIELD_CAP)
  if (best.length < NATIONAL_FIELD_MIN) return []
  await tx
    .insert(raceRosters)
    .values(best.map((riderId) => ({ raceId: raceKey, riderId })))
    .onConflictDoNothing()
  return best
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
  rotateBy?: number,
  homeCountry?: string | null,
): T[] {
  if (region) {
    const inRegion = eligible.filter((t) => continentForCountry(t.country ?? '') === region)
    const outRegion = eligible.filter((t) => continentForCountry(t.country ?? '') !== region)
    // Prioridad de casa: dentro del continente van PRIMERO los equipos del PAÍS de la carrera (por
    // presupuesto), luego el resto del continente. Una carrera española la corren sobre todo españoles.
    const homeFirst = (list: T[]) =>
      homeCountry
        ? [
            ...list.filter((t) => t.country === homeCountry),
            ...list.filter((t) => t.country !== homeCountry),
          ]
        : list
    // Wildcards de FUERA del continente: acotadas a unas pocas plazas (varía por carrera). Si la región
    // no llena el cupo, NO se completa con más extranjeros: el pelotón lo terminan corredores individuales
    // del propio continente (relleno regional en convokeField), no un aluvión de equipos de otro continente.
    const reserve = wildcardSlots ?? Math.max(1, Math.floor(cap * WILDCARD_FRACTION))
    const wildcards = Math.min(outRegion.length, reserve)
    const wild = rotatePick(outRegion, wildcards, rotateBy ?? 0)
    const homeSlots = cap - wild.length

    // Carrera continental: el NÚCLEO son los equipos de la división base (Continental); los de división
    // superior (ProTeams) entran como invitados LIMITADOS, no como mayoría por tener más presupuesto.
    const coreDiv = priority?.[0]
    if (coreDiv) {
      const core = homeFirst(inRegion.filter((t) => t.division === coreDiv))
      const guests = homeFirst(inRegion.filter((t) => t.division !== coreDiv))
      const guestCap = Math.min(
        guests.length,
        Math.max(1, Math.round(homeSlots * CONTINENTAL_GUEST_FRACTION)),
      )
      const guestPick = guests.slice(0, guestCap)
      const corePick = core.slice(0, homeSlots - guestPick.length)
      return [...corePick, ...guestPick, ...wild]
    }
    return [...homeFirst(inRegion).slice(0, homeSlots), ...wild]
  }
  if (priority) {
    const rank = (d?: Division) => {
      const i = priority.indexOf(d as Division)
      return i === -1 ? priority.length : i
    }
    // La división de máxima prioridad entra garantizada (los 18 WorldTour en una .WT). Las plazas de
    // wildcard restantes NO son siempre los mismos ProTeams de más presupuesto: rotan por carrera
    // dentro de una ventana de los mejores, así distintas carreras invitan a distintos equipos. El nº
    // de wildcards se acota con `wildcardSlots` (2-4 en una .WT): no se llena el pelotón entero de
    // invitados, como en la realidad —los WorldTour más unas pocas wildcards, no media parrilla Pro—.
    const guaranteed = eligible.filter((t) => rank(t.division) === 0).slice(0, cap)
    let remaining = cap - guaranteed.length
    if (wildcardSlots != null) remaining = Math.min(remaining, wildcardSlots)
    if (remaining <= 0) return guaranteed
    const pool = eligible.filter((t) => rank(t.division) > 0)
    // Las wildcards prefieren la casa: primero un equipo del PAÍS de la carrera, luego del mismo
    // CONTINENTE, y solo si sobran plazas se invita al resto (esas rotan por carrera para dar variedad).
    const homeCont = homeCountry ? continentForCountry(homeCountry) : null
    const own = homeCountry ? pool.filter((t) => t.country === homeCountry) : []
    const near =
      homeCont != null
        ? pool.filter(
            (t) => t.country !== homeCountry && continentForCountry(t.country ?? '') === homeCont,
          )
        : []
    const priorityPool = [...own, ...near]
    const wild = priorityPool.slice(0, remaining)
    if (wild.length < remaining) {
      const rest = pool.filter((t) => !priorityPool.includes(t))
      wild.push(...rotatePick(rest, remaining - wild.length, rotateBy ?? 0))
    }
    return [...guaranteed, ...wild]
  }
  return eligible.slice(0, cap)
}

/**
 * Elige `n` equipos de un pool ORDENADO por presupuesto, rotando la ventana según `seed` para que no
 * salgan siempre los mismos. Rota dentro de la franja de los mejores (~2·n), así los fuertes siguen
 * favorecidos pero el conjunto invitado varía de carrera a carrera. Puro y determinista.
 */
function rotatePick<T>(pool: T[], n: number, seed: number): T[] {
  if (n <= 0) return []
  if (pool.length <= n) return pool.slice(0, n)
  const window = Math.min(pool.length, 2 * n)
  const offset = (seed % (window - n + 1)) >>> 0
  return pool.slice(offset, offset + n)
}

/** Un equipo del pelotón elegido para una carrera (los campos que necesitan la convocatoria y la vista). */
interface FieldTeamRow {
  id: string
  name: string
  philosophy: string
  division: Division
  country: string | null
  ownerUserId: string | null
  jerseySeed: string
}

/**
 * Resuelve QUÉ equipos forman el pelotón de una carrera (sin elegir aún los corredores): los admitidos
 * por nivel/región (selectFieldTeams) más los overrides de los equipos con dueño (forcedIn/forcedOut).
 * Determinista. Lo comparten la convocatoria real del tick (convokeField) y la previsión de inscritos
 * (predictStartlist), para que la lista provisional coincida con lo que el día de salida ocurrirá.
 */
async function resolveFieldTeams(
  tx: Tx,
  worldId: string,
  race: CalendarRace,
  raceKey: string,
  season: number,
): Promise<{ teamRows: FieldTeamRow[]; forcedOut: Set<string> }> {
  const { size } = squadFor(race)
  const fieldCap = FIELD_CAP_BY_CLASS[race.raceClass] ?? FIELD_CAP
  const cap = Math.max(1, Math.floor(fieldCap / size))
  const eligible = await tx
    .select({
      id: teams.id,
      name: teams.name,
      philosophy: teams.philosophy,
      division: teams.division,
      country: teams.country,
      ownerUserId: teams.ownerUserId,
      jerseySeed: teams.jerseySeed,
    })
    .from(teams)
    .where(and(eq(teams.worldId, worldId), inArray(teams.division, race.openTo)))
    .orderBy(desc(teams.budget))
  // Cupo de wildcards (equipos invitados fuera del núcleo), acotado y variable por carrera de forma
  // determinista. Global (.WT/.Pro): los del núcleo entran garantizados (los 18 WorldTour en una .WT) y
  // solo se invitan unas pocas wildcards —2-4 en una .WT (Down Under ~2), 3-5 en una .Pro—, no medio
  // pelotón. Regional (.1/.2): la región es mayoría y se reservan 0..N plazas de fuera del continente,
  // una .1 (más prestigio) atrae algo más que una .2.
  let wildcardSlots: number | undefined
  if (race.region) {
    const maxWild = race.raceClass === '1' ? 4 : 3
    wildcardSlots = hashInt(race.id) % (maxWild + 1)
  } else if (race.raceClass === 'WT') {
    wildcardSlots = 2 + (hashInt(`${race.id}:wild`) % 3)
  } else if (race.raceClass === 'Pro') {
    wildcardSlots = 3 + (hashInt(`${race.id}:wild`) % 3)
  }
  // Semilla de rotación por carrera y temporada: las wildcards rotan año a año, no siempre las mismas.
  const rotateBy = hashInt(`${raceKey}:wild`)
  const auto = selectFieldTeams(
    eligible,
    cap,
    race.region,
    DIVISION_PRIORITY[race.raceClass],
    wildcardSlots,
    rotateBy,
    race.country,
  )
  // Draft de calendario (equipos con dueño): cada equipo humano corre su calendario NATURAL (sus
  // carreras de casa) salvo las excepciones que guarde el manager —saltar una natural o añadir una de
  // fuera—. Se le fuerza dentro de las que le tocan y fuera de las que no. Sin equipos humanos (mundo
  // bot puro) no hay overrides ni dueños, así que esto no cambia nada.
  const overrideRows = await tx
    .select({ teamId: teamRacePlan.teamId, attend: teamRacePlan.attend })
    .from(teamRacePlan)
    .where(and(eq(teamRacePlan.season, season), eq(teamRacePlan.raceId, race.id)))
  const overrideByTeam = new Map(overrideRows.map((o) => [o.teamId, o.attend]))
  const { forcedIn, forcedOut } = ownedTeamAttendance(eligible, race, overrideByTeam)
  let teamRows = auto
  if (forcedIn.size > 0 || forcedOut.size > 0) {
    teamRows = auto.filter((t) => !forcedOut.has(t.id))
    const present = new Set(teamRows.map((t) => t.id))
    for (const t of eligible) {
      if (forcedIn.has(t.id) && !present.has(t.id)) teamRows.push(t)
    }
  }
  return { teamRows, forcedOut }
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
  busy: Set<string>,
): Promise<string[]> {
  const { size, min: minSquad } = squadFor(race)
  const fieldCap = FIELD_CAP_BY_CLASS[race.raceClass] ?? FIELD_CAP
  const { teamRows, forcedOut } = await resolveFieldTeams(tx, worldId, race, raceKey, season)
  if (teamRows.length === 0) return []
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
      residence: riders.residence,
      country: riders.country,
    })
    .from(riders)
    .where(and(inArray(riders.teamId, teamIds), isNull(riders.retiredAt), fitToRace()))
  const byTeam = new Map<string, typeof candidates>()
  for (const c of candidates) {
    if (!c.teamId) continue
    // Un corredor que ya está corriendo otra carrera no está disponible para esta.
    if (busy.has(c.id)) continue
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

  // Gran vuelta: prestigio de ESTA (Tour=0, Giro=1, Vuelta=2) y cuántas lleva ya cada corredor esta
  // temporada (para las wildcards Pro, que a lo sumo corren una).
  const gtRank = race.format === 'gran-vuelta' ? GRAND_TOUR_PRESTIGE[race.id] : undefined
  const gtCount = new Map<string, number>()
  if (gtRank != null) {
    const gtKeys = SEASON_CALENDAR.filter(
      (r) => r.format === 'gran-vuelta' && `${r.id}:s${season}` !== raceKey,
    ).map((r) => `${r.id}:s${season}`)
    if (gtKeys.length > 0) {
      const rows = await tx
        .select({ riderId: raceRosters.riderId })
        .from(raceRosters)
        .where(inArray(raceRosters.raceId, gtKeys))
      for (const row of rows) gtCount.set(row.riderId, (gtCount.get(row.riderId) ?? 0) + 1)
    }
  }
  const gtSuit = (m: { fame: number; archetype: string }) =>
    m.fame + (GT_VOCATION_BONUS[m.archetype] ?? 0)

  // El equipo paga el VIAJE (transporte + hotel) de cada corredor que manda, según su residencia y el
  // país de la carrera. Días de carrera = etapas (proxy del hotel). Se acumula por equipo y se cobra
  // del presupuesto al final. Los rellenos regionales (individuales, sin equipo) no lo pagan aquí.
  const raceDays = race.stages.length
  const travelByTeam = new Map<string, number>()
  // Días de viaje por corredor (vuelta de la carrera): buckets 1 (continental) / 2 (intercontinental).
  const travelReturn = new Map<number, string[]>()
  const rosterValues: { raceId: string; riderId: string }[] = []
  for (const team of teamRows) {
    let members = byTeam.get(team.id) ?? []
    if (gtRank != null) {
      if (team.division === 'WT') {
        // Plan de temporada: los WorldTour corren las tres grandes vueltas. Reparten su plantilla (~28)
        // por aptitud en tres grupos por prestigio (los mejores al Tour); esta gran vuelta se lleva su
        // tercio FRESCO (quien aún no ha corrido otra grande esta temporada), para que la Vuelta corra
        // con gente distinta y no con las sobras. Como la escuadra es de 8 fijos, si el tercio fresco no
        // llega a 8 se completa con los mejores que aún no hayan corrido DOS grandes vueltas (se permite
        // una segunda, nunca una tercera): así se garantiza el equipo de 8 sin que nadie corra las tres.
        const ranked = [...members].sort(
          (a, b) => gtSuit(b) - gtSuit(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
        )
        const base = ranked
          .filter((_, i) => i % 3 === gtRank)
          .filter((m) => (gtCount.get(m.id) ?? 0) === 0)
        const fill = ranked.filter((m) => !base.includes(m) && (gtCount.get(m.id) ?? 0) <= 1)
        members = [...base, ...fill].slice(0, size)
      } else {
        // Wildcards (Pro): a lo sumo una gran vuelta; usa a los que aún no han corrido ninguna.
        members = members.filter((m) => (gtCount.get(m.id) ?? 0) === 0)
      }
    }
    // No se admite un equipo que no puede alinear la escuadra mínima (nada de «medio equipo»).
    if (members.length < minSquad) continue
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
    const residenceById = new Map(members.map((m) => [m.id, m.residence ?? m.country]))
    for (const id of squad) {
      rosterValues.push({ raceId: raceKey, riderId: id })
      const cost = raceAttendanceCost(residenceById.get(id) ?? null, race.country ?? null, raceDays)
      if (cost.money > 0) travelByTeam.set(team.id, (travelByTeam.get(team.id) ?? 0) + cost.money)
      if (cost.days > 0)
        (travelReturn.get(cost.days) ?? travelReturn.set(cost.days, []).get(cost.days)!).push(id)
    }
  }

  // Relleno regional (solo circuito continental): un puñado de corredores individuales del continente
  // (el equivalente a las selecciones nacionales / equipos club de relleno), NO un pelotón entero de
  // sueltos. Se acota a unas pocas escuadras para que la carrera la dominen los equipos, no los sueltos.
  const maxFill = 2 * size
  if (race.region && rosterValues.length < fieldCap) {
    const already = rosterValues.map((v) => v.riderId)
    const countries = countriesInContinent(race.region)
    const conds = [
      eq(riders.worldId, worldId),
      inArray(riders.country, countries),
      isNull(riders.retiredAt),
      fitToRace(),
      // SOLO NPCs: el relleno son las "selecciones nacionales / equipos club" del continente. Un
      // humano entra por convocatoria de su equipo o por auto-inscripción (que le cobra el viaje);
      // si se colara aquí, correría gratis y saltaría su opt-in/economía de agente libre.
      isNull(riders.userId),
    ]
    // Un equipo con dueño que decidió NO acudir (forcedOut) no aporta ni corredores de relleno: si el
    // manager saltó la carrera, ninguno de los suyos corre aquí (ni como individual del continente).
    // Se preservan los agentes libres NPC (team_id nulo), que sí pueden rellenar.
    if (forcedOut.size > 0) {
      conds.push(or(isNull(riders.teamId), notInArray(riders.teamId, [...forcedOut]))!)
    }
    const excluded = [...new Set([...already, ...busy])]
    if (excluded.length > 0) conds.push(notInArray(riders.id, excluded))
    const fillers = await tx
      .select({ id: riders.id })
      .from(riders)
      .where(and(...conds))
      // Prioridad de casa: primero los corredores del PAÍS de la carrera, luego el resto del continente
      // (ambos por fama). Así una carrera española la completan antes ciclistas españoles que de fuera.
      .orderBy(
        sql`case when ${riders.country} = ${race.country ?? null} then 0 else 1 end`,
        desc(riders.fame),
      )
      .limit(Math.min(fieldCap - rosterValues.length, maxFill))
    for (const f of fillers) rosterValues.push({ raceId: raceKey, riderId: f.id })
  }

  if (rosterValues.length > 0) {
    await tx.insert(raceRosters).values(rosterValues).onConflictDoNothing()
  }
  // Cobra a cada equipo el viaje de los suyos (del presupuesto). Los equipos de casa apenas pagan
  // (solo hotel), los que cruzan continente pagan más: el coste real de llevar la carrera a otro sitio.
  for (const [teamId, money] of travelByTeam) {
    if (money > 0) {
      await tx
        .update(teams)
        .set({ budget: sql`${teams.budget} - ${money}` })
        .where(eq(teams.id, teamId))
    }
  }
  // Marca los días de viaje de vuelta: el corredor no entrena hasta `último día de carrera + días de
  // viaje`. Así el viaje lejano le cuesta días de entrenamiento (además del dinero al equipo).
  const lastRaceDay = season * SEASON_DAYS + raceLastDay(race)
  for (const [days, ids] of travelReturn) {
    if (ids.length > 0) {
      await tx
        .update(riders)
        .set({ travelUntilDay: lastRaceDay + days })
        .where(inArray(riders.id, ids))
    }
  }
  return rosterValues.map((v) => v.riderId)
}

/**
 * Auto-inscripción de agentes libres (Paso: economía de viajes). Un corredor humano SIN equipo que se
 * inscribió a esta carrera entra en el pelotón si (a) no está ya ocupado en otra carrera hoy y (b) le
 * llega el dinero para su propio viaje (transporte + hotel), que se le cobra del bolsillo. Devuelve
 * los que finalmente entran. Sin equipo que pague: el viaje sale de su saldo, como en la realidad.
 */
async function convokeSelfEntries(
  tx: Tx,
  worldId: string,
  race: CalendarRace,
  raceKey: string,
  busy: Set<string>,
  season: number,
  gameDay: number,
): Promise<string[]> {
  const rows = await tx
    .select({
      riderId: raceEntries.riderId,
      residence: riders.residence,
      country: riders.country,
      money: riders.money,
    })
    .from(raceEntries)
    .innerJoin(riders, eq(riders.id, raceEntries.riderId))
    .where(
      and(
        eq(raceEntries.raceId, race.id),
        eq(raceEntries.season, season),
        eq(raceEntries.enrolled, false),
        eq(riders.worldId, worldId),
        isNull(riders.teamId),
        isNotNull(riders.userId),
        isNull(riders.retiredAt),
        fitToRace(),
      ),
    )
  const raceDays = race.stages.length
  const enrolled: string[] = []
  for (const r of rows) {
    if (busy.has(r.riderId)) continue
    const cost = raceAttendanceCost(r.residence ?? r.country, race.country ?? null, raceDays)
    if (r.money < cost.money) continue // no le llega para el viaje: no puede ir
    await tx
      .insert(raceRosters)
      .values({ raceId: raceKey, riderId: r.riderId })
      .onConflictDoNothing()
    if (cost.money > 0) {
      await creditRider(tx, r.riderId, gameDay, 'viaje', -cost.money, `${race.name} · travel`)
    }
    // Días de viaje de vuelta: el agente libre tampoco entrena hasta volver de una carrera lejana.
    if (cost.days > 0) {
      await tx
        .update(riders)
        .set({ travelUntilDay: season * SEASON_DAYS + raceLastDay(race) + cost.days })
        .where(eq(riders.id, r.riderId))
    }
    await tx
      .update(raceEntries)
      .set({ enrolled: true })
      .where(
        and(
          eq(raceEntries.riderId, r.riderId),
          eq(raceEntries.raceId, race.id),
          eq(raceEntries.season, season),
        ),
      )
    busy.add(r.riderId)
    enrolled.push(r.riderId)
  }
  return enrolled
}

/** Un corredor de la lista de inscritos (cuando la escuadra ya está congelada). */
export interface StartlistRider {
  id: string
  name: string
  country: string
  isBot: boolean
  /** Dorsal asignado al congelar la escuadra (null en rosters antiguos sin dorsales). */
  bib: number | null
}
/** Un equipo del pelotón; `riders` va lleno solo cuando la escuadra ya está congelada. */
export interface StartlistTeam {
  id: string
  name: string
  country: string | null
  division: Division
  /** Semilla del maillot del equipo (para pintar su kit). */
  jerseySeed: string
  riders: StartlistRider[]
}
/** Lista de inscritos de una carrera por empezar. */
export interface RaceStartlist {
  /**
   * `true` cuando ya pasó el cierre de inscripciones (SPEC 8): la escuadra está congelada y los equipos
   * traen a sus corredores reales. `false` mientras faltan más de `ENROLL_LOCK_DAYS`: solo se prevén los
   * equipos que acudirán, no sus corredores (aún no elegidos).
   */
  frozen: boolean
  teams: StartlistTeam[]
  freeAgents: StartlistRider[]
}

/**
 * Inscritos de una carrera aún por empezar. Si ya pasó el cierre de inscripciones, devuelve la ESCUADRA
 * CONGELADA real (los corredores que traerá cada equipo, más los agentes libres que entraron), leída de
 * `race_rosters`. Si aún falta más de `ENROLL_LOCK_DAYS`, devuelve la PREVISIÓN: los equipos que se
 * espera que acudan (misma elección determinista que hará el tick) y los agentes libres ya apuntados,
 * sin nombrar corredores todavía. Solo lectura.
 */
export async function predictStartlist(
  db: Db,
  worldId: string,
  race: CalendarRace,
  season: number,
): Promise<RaceStartlist> {
  const raceKey = `${race.id}:s${season}`
  return db.transaction(async (tx) => {
    // Cierre pasado: la escuadra está congelada. Mostramos los corredores reales, por equipo y dorsal.
    const rows = await tx
      .select({
        id: riders.id,
        name: riders.name,
        country: riders.country,
        userId: riders.userId,
        teamId: riders.teamId,
        teamName: teams.name,
        teamCountry: teams.country,
        teamDivision: teams.division,
        teamJersey: teams.jerseySeed,
        bib: raceRosters.bib,
      })
      .from(raceRosters)
      .innerJoin(riders, eq(riders.id, raceRosters.riderId))
      .leftJoin(teams, eq(teams.id, riders.teamId))
      .where(eq(raceRosters.raceId, raceKey))
    if (rows.length > 0) {
      const byTeam = new Map<string, StartlistTeam & { minBib: number }>()
      const freeAgents: StartlistRider[] = []
      for (const r of rows) {
        const rider: StartlistRider = {
          id: r.id,
          name: r.name,
          country: r.country ?? '',
          isBot: r.userId == null,
          bib: r.bib,
        }
        if (r.teamId && r.teamName) {
          let t = byTeam.get(r.teamId)
          if (!t) {
            t = {
              id: r.teamId,
              name: r.teamName,
              country: r.teamCountry,
              division: r.teamDivision as Division,
              jerseySeed: r.teamJersey ?? '',
              riders: [],
              minBib: Number.POSITIVE_INFINITY,
            }
            byTeam.set(r.teamId, t)
          }
          t.riders.push(rider)
          if (rider.bib != null) t.minBib = Math.min(t.minBib, rider.bib)
        } else {
          freeAgents.push(rider)
        }
      }
      // Orden por dorsal (el equipo del dorsal más bajo primero; corredores por su número). Si un roster
      // antiguo no tiene dorsales, se cae a orden alfabético.
      const byBib = (a: StartlistRider, b: StartlistRider) =>
        a.bib != null && b.bib != null ? a.bib - b.bib : a.name.localeCompare(b.name)
      const teamsList = [...byTeam.values()].sort((a, b) =>
        Number.isFinite(a.minBib) && Number.isFinite(b.minBib)
          ? a.minBib - b.minBib
          : a.name.localeCompare(b.name),
      )
      for (const t of teamsList) t.riders.sort(byBib)
      freeAgents.sort(byBib)
      return {
        frozen: true,
        teams: teamsList.map((t) => ({
          id: t.id,
          name: t.name,
          country: t.country,
          division: t.division,
          jerseySeed: t.jerseySeed,
          riders: t.riders,
        })),
        freeAgents,
      }
    }
    // Aún no congelada: previsión de equipos + agentes libres apuntados (sin nombrar corredores).
    const { teamRows } = await resolveFieldTeams(tx, worldId, race, raceKey, season)
    const fa = await tx
      .select({ id: riders.id, name: riders.name, country: riders.country })
      .from(raceEntries)
      .innerJoin(riders, eq(riders.id, raceEntries.riderId))
      .where(
        and(
          eq(raceEntries.raceId, race.id),
          eq(raceEntries.season, season),
          eq(riders.worldId, worldId),
          isNotNull(riders.userId),
          isNull(riders.teamId),
          isNull(riders.retiredAt),
        ),
      )
    return {
      frozen: false,
      teams: teamRows.map((t) => ({
        id: t.id,
        name: t.name,
        country: t.country,
        division: t.division,
        jerseySeed: t.jerseySeed,
        riders: [],
      })),
      freeAgents: fa.map((r) => ({
        id: r.id,
        name: r.name,
        country: r.country ?? '',
        isBot: false,
        bib: null,
      })),
    }
  })
}

/**
 * Asigna el dorsal (número de corredor) a la escuadra ya congelada de una carrera (SPEC 8), al estilo
 * del ciclismo real: decenas por equipo. El equipo del campeón defensor (ganador de la general de la
 * edición anterior) se lleva el bloque del 1 —su líder el dorsal 1—; si no hay edición previa, ese
 * bloque queda vacío y el primer equipo empieza en el 11. El resto de equipos van 11-1X, 21-2X, 31-3X…
 * por orden (división y presupuesto). Dentro de cada equipo, el corredor de más fama (el líder) lleva
 * el x1. En un campeonato nacional (sin equipos) se numera 1..N por fama. Determinista.
 */
async function assignBibs(tx: Tx, race: CalendarRace, season: number): Promise<void> {
  const raceKey = `${race.id}:s${season}`
  const rows = await tx
    .select({ riderId: raceRosters.riderId, fame: riders.fame, teamId: riders.teamId })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .where(eq(raceRosters.raceId, raceKey))
  if (rows.length === 0) return

  const setBib = async (riderId: string, bib: number) => {
    await tx
      .update(raceRosters)
      .set({ bib })
      .where(and(eq(raceRosters.raceId, raceKey), eq(raceRosters.riderId, riderId)))
  }

  // Campeonato nacional: sin equipos, se numera por fama (el mejor, o el campeón defensor, el 1).
  if (race.championshipCountry) {
    const ordered = [...rows].sort((a, b) => b.fame - a.fame)
    let n = 1
    for (const r of ordered) await setBib(r.riderId, n++)
    return
  }

  // Campeón defensor: ganador de la general de la edición del año pasado y su equipo actual.
  let championTeamId: string | null = null
  let championRiderId: string | null = null
  if (season > 0) {
    const prevKey = `${race.id}:s${season - 1}`
    const winner = await tx
      .select({ riderId: raceGc.riderId })
      .from(raceGc)
      .where(eq(raceGc.raceId, prevKey))
      .orderBy(asc(raceGc.tiempoTotalS))
      .limit(1)
    championRiderId = winner[0]?.riderId ?? null
    if (championRiderId) {
      const tr = await tx
        .select({ teamId: riders.teamId })
        .from(riders)
        .where(eq(riders.id, championRiderId))
        .limit(1)
      championTeamId = tr[0]?.teamId ?? null
    }
  }

  // Agrupar por equipo; los agentes libres (sin equipo) se numeran al final.
  const byTeam = new Map<string, { riderId: string; fame: number }[]>()
  const freeAgents: { riderId: string; fame: number }[] = []
  for (const r of rows) {
    if (r.teamId) {
      const list = byTeam.get(r.teamId) ?? []
      list.push({ riderId: r.riderId, fame: r.fame })
      byTeam.set(r.teamId, list)
    } else {
      freeAgents.push({ riderId: r.riderId, fame: r.fame })
    }
  }

  // Orden de equipos: por prioridad de división (si aplica) y luego presupuesto; el campeón, primero.
  const teamIds = [...byTeam.keys()]
  const teamInfo =
    teamIds.length > 0
      ? await tx
          .select({ id: teams.id, division: teams.division, budget: teams.budget })
          .from(teams)
          .where(inArray(teams.id, teamIds))
      : []
  const info = new Map(teamInfo.map((t) => [t.id, t]))
  const priority = DIVISION_PRIORITY[race.raceClass]
  const rankDiv = (d?: Division) => {
    if (!priority) return 0
    const i = priority.indexOf(d as Division)
    return i === -1 ? priority.length : i
  }
  teamIds.sort((a, b) => {
    const ra = rankDiv(info.get(a)?.division)
    const rb = rankDiv(info.get(b)?.division)
    if (ra !== rb) return ra - rb
    return (info.get(b)?.budget ?? 0) - (info.get(a)?.budget ?? 0)
  })
  const championFirst = championTeamId != null && byTeam.has(championTeamId)
  if (championFirst) {
    teamIds.splice(teamIds.indexOf(championTeamId as string), 1)
    teamIds.unshift(championTeamId as string)
  }

  // Decenas por equipo. El bloque del 1 (decena 0) es solo del campeón defensor; si no hay, se empieza
  // en la decena 1 (dorsales 11-1X) y el bloque del 1 queda vacío.
  let decade = championFirst ? 0 : 1
  for (const teamId of teamIds) {
    const members = byTeam.get(teamId)!
    members.sort((a, b) => b.fame - a.fame) // el líder (más fama) primero → x1
    if (teamId === championTeamId && championRiderId) {
      const idx = members.findIndex((m) => m.riderId === championRiderId)
      if (idx > 0) members.unshift(members.splice(idx, 1)[0]!)
    }
    const base = decade * 10
    for (let i = 0; i < members.length; i++) await setBib(members[i]!.riderId, base + i + 1)
    decade++
  }

  // Agentes libres: decenas siguientes, 9 por decena.
  freeAgents.sort((a, b) => b.fame - a.fame)
  for (let k = 0; k < freeAgents.length; k++) {
    await setBib(freeAgents[k]!.riderId, (decade + Math.floor(k / 9)) * 10 + (k % 9) + 1)
  }
}

/** Corredores ya comprometidos con otra carrera cuya ventana se solapa con la de `race` (misma temporada). */
async function busyForRaceWindow(tx: Tx, race: CalendarRace, season: number): Promise<Set<string>> {
  const start = race.startDay
  const end = raceLastDay(race)
  const overlappingKeys = SEASON_CALENDAR.filter(
    (r) => r.id !== race.id && r.startDay <= end && start <= raceLastDay(r),
  ).map((r) => `${r.id}:s${season}`)
  const busy = new Set<string>()
  if (overlappingKeys.length === 0) return busy
  const rows = await tx
    .select({ riderId: raceRosters.riderId })
    .from(raceRosters)
    .where(inArray(raceRosters.raceId, overlappingKeys))
  for (const row of rows) busy.add(row.riderId)
  return busy
}

/**
 * Cierre de inscripciones (SPEC 8): cuando faltan `ENROLL_LOCK_DAYS` o menos para la salida se congela
 * la escuadra de la carrera —equipos, sus corredores y agentes libres apuntados— en `race_rosters`,
 * igual que en el ciclismo real, donde los equipos anuncian su alineación días antes y no el mismo día.
 * Así la lista de inscritos que se muestra son corredores reales y el planificador de cada piloto ya
 * sabe que tiene carrera. Se congela en el primer tick dentro de la ventana y en orden de salida, para
 * que la carrera más próxima reserve antes a los corredores que comparte con otra que se solape.
 * Idempotente: una carrera ya congelada no se vuelve a tocar (y el día de salida se reutiliza tal cual).
 */
async function lockUpcomingRosters(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
): Promise<void> {
  const season = Math.floor(gameDay / SEASON_DAYS)
  const dayOfSeason = gameDay % SEASON_DAYS
  const upcoming = SEASON_CALENDAR.filter(
    (r) => r.startDay > dayOfSeason && r.startDay - dayOfSeason <= ENROLL_LOCK_DAYS,
  ).sort((a, b) => a.startDay - b.startDay)
  for (const race of upcoming) {
    const raceKey = `${race.id}:s${season}`
    const already = await tx
      .select({ riderId: raceRosters.riderId })
      .from(raceRosters)
      .where(eq(raceRosters.raceId, raceKey))
      .limit(1)
    if (already.length > 0) {
      // Ya congelada: solo corrige si trae más equipos de los que admite el cupo actual.
      await refreezeIfOverfilled(tx, worldId, worldSeed, race, season)
      continue
    }
    await freezeRaceRoster(tx, worldId, worldSeed, race, season, gameDay)
  }
}

/**
 * Congela la escuadra de una carrera: convoca equipos (o campeonato nacional) más los agentes libres
 * apuntados, evitando a los ya comprometidos con otra carrera solapada. Asume que aún no está congelada.
 */
async function freezeRaceRoster(
  tx: Tx,
  worldId: string,
  worldSeed: string,
  race: CalendarRace,
  season: number,
  gameDay: number,
): Promise<void> {
  const raceKey = `${race.id}:s${season}`
  const busy = await busyForRaceWindow(tx, race, season)
  const enrolled = race.championshipCountry
    ? await convokeNationalField(tx, worldId, race, raceKey, busy, season)
    : await convokeField(tx, worldId, race, raceKey, worldSeed, season, busy)
  for (const id of enrolled) busy.add(id)
  await convokeSelfEntries(tx, worldId, race, raceKey, busy, season, gameDay)
  await assignBibs(tx, race, season)
}

/**
 * Corrige una escuadra ya congelada cuyo pelotón trae MÁS equipos de los que admite el cupo actual
 * (p.ej. carreras congeladas antes de recortar las wildcards y el relleno): vuelve a convocar equipos y
 * relleno individual con las reglas nuevas, preservando solo a los agentes libres HUMANOS ya inscritos
 * (para no recobrarles el viaje). No toca las carreras que ya cumplen el cupo (converge en una pasada)
 * ni los campeonatos nacionales (sin equipos).
 */
async function refreezeIfOverfilled(
  tx: Tx,
  worldId: string,
  worldSeed: string,
  race: CalendarRace,
  season: number,
): Promise<void> {
  if (race.championshipCountry) return
  const raceKey = `${race.id}:s${season}`
  const teamRows = await tx
    .select({ teamId: riders.teamId })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .where(and(eq(raceRosters.raceId, raceKey), isNotNull(riders.teamId)))
  const frozenTeams = new Set(teamRows.map((r) => r.teamId))
  if (frozenTeams.size === 0) return
  const desired = await resolveFieldTeams(tx, worldId, race, raceKey, season)
  // Se recongela si SOBRAN equipos (más de los del cupo actual) o si algún equipo trae MENOS del
  // mínimo (escuadras de 1-2, congeladas antes de la regla de mínimo). Si no, ya está bien: no se toca.
  const perTeam = new Map<string, number>()
  for (const r of teamRows) perTeam.set(r.teamId!, (perTeam.get(r.teamId!) ?? 0) + 1)
  const undersized = [...perTeam.values()].some((n) => n < squadFor(race).min)
  if (frozenTeams.size <= desired.teamRows.length && !undersized) return

  // Sobran equipos: borra todo el roster SALVO los agentes libres humanos (team nulo y con usuario) y
  // reconvoca equipos + relleno con las reglas nuevas. Así no se recobra el viaje a quien ya se inscribió.
  const toDelete = await tx
    .select({ riderId: raceRosters.riderId })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .where(
      and(eq(raceRosters.raceId, raceKey), or(isNotNull(riders.teamId), isNull(riders.userId))),
    )
  const ids = toDelete.map((r) => r.riderId)
  if (ids.length > 0) {
    await tx
      .delete(raceRosters)
      .where(and(eq(raceRosters.raceId, raceKey), inArray(raceRosters.riderId, ids)))
  }
  const busy = await busyForRaceWindow(tx, race, season)
  await convokeField(tx, worldId, race, raceKey, worldSeed, season, busy)
  await assignBibs(tx, race, season)
}

/**
 * Garantiza que la escuadra de una carrera esté congelada si ya pasó el cierre de inscripciones
 * (`ENROLL_LOCK_DAYS`). Sirve de red de seguridad para mostrar la lista bajo demanda: si el tick aún no
 * la había congelado (p.ej. un mundo que ya estaba dentro de la ventana al desplegar), la congela ahora.
 * Se serializa por carrera con un advisory lock para no convocar dos veces ni cobrar dos viajes si dos
 * peticiones coinciden. Fuera de la ventana no hace nada. Idempotente.
 */
export async function ensureRaceRosterFrozen(
  db: Db,
  worldId: string,
  worldSeed: string,
  race: CalendarRace,
  gameDay: number,
): Promise<void> {
  const season = Math.floor(gameDay / SEASON_DAYS)
  const dayOfSeason = gameDay % SEASON_DAYS
  const daysUntil = race.startDay - dayOfSeason
  if (daysUntil <= 0 || daysUntil > ENROLL_LOCK_DAYS) return // aún no toca (o ya empezó)
  const raceKey = `${race.id}:s${season}`
  await db.transaction(async (tx) => {
    // Serializa por carrera: una petición congela y las demás esperan y ven que ya está.
    await tx.execute(sql`select pg_advisory_xact_lock(${hashInt(raceKey)})`)
    const already = await tx
      .select({ riderId: raceRosters.riderId })
      .from(raceRosters)
      .where(eq(raceRosters.raceId, raceKey))
      .limit(1)
    if (already.length > 0) {
      // Ya congelada: corrige el exceso de equipos si lo hay (carreras congeladas antes del recorte).
      await refreezeIfOverfilled(tx, worldId, worldSeed, race, season)
      return
    }
    await freezeRaceRoster(tx, worldId, worldSeed, race, season, gameDay)
  })
}

/** Corre las etapas del calendario que tocan este día de juego. Devuelve quién corrió. */
/**
 * Corrige datos YA guardados de un mundo (idempotente): quita el honor de ETAPA de las carreras de un
 * día (contaba doble con la general en el palmarés / Hall of Fame) y asigna dorsales a los rosters
 * congelados que aún no los tengan (carreras congeladas antes de existir los dorsales). No-op cuando
 * ya está todo bien, así que es barato correrlo cada tick.
 */
async function backfillWorldData(tx: Tx, worldId: string, season: number): Promise<void> {
  const oneDayBases = new Set(SEASON_CALENDAR.filter((r) => r.stages.length === 1).map((r) => r.id))
  const stageHonors = await tx
    .select({ id: palmares.id, raceId: palmares.raceId })
    .from(palmares)
    .where(and(eq(palmares.worldId, worldId), eq(palmares.kind, 'stage')))
  // El palmarés guarda el id BASE de la carrera (sin sufijo :s{season}), así que se compara directo.
  const stale = stageHonors.filter((h) => oneDayBases.has(h.raceId)).map((h) => h.id)
  if (stale.length > 0) await tx.delete(palmares).where(inArray(palmares.id, stale))

  const nullBib = await tx
    .selectDistinct({ raceId: raceRosters.raceId })
    .from(raceRosters)
    .where(isNull(raceRosters.bib))
  for (const { raceId } of nullBib) {
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue // la vuelta de prueba no lleva dorsales de calendario
    const race = SEASON_CALENDAR.find((r) => r.id === m[1])
    if (race) await assignBibs(tx, race, Number(m[2]))
  }

  // Rehace los puntos de ranking de la temporada: corrige el doble conteo viejo de las carreras de un día.
  await recomputeSeasonPoints(tx, worldId, season)
}

/**
 * Recalcula los puntos de ranking de la temporada desde cero (SPEC, Paso 40). Es la ÚNICA fuente de
 * verdad de `seasonPoints` (etapa + general), así que rehacerla corrige de raíz el viejo bug del
 * doble conteo de las carreras de un día (que sumaban puntos de etapa Y de general por la misma
 * llegada). Idempotente y autocurativa: reproduce exactamente las reglas vivas (una carrera de un día
 * solo da puntos de general; los de etapa solo en carreras por etapas; la general solo si la carrera
 * ya terminó) con las mismas funciones puras, y solo escribe a los corredores cuyo total cambia.
 */
async function recomputeSeasonPoints(tx: Tx, worldId: string, season: number): Promise<void> {
  // Solo hace falta si ya se corrió alguna carrera de un día esta temporada (la única fuente del doble
  // conteo). Si no, no hay nada que corregir y nos ahorramos escanear resultados.
  const oneDayKeys = SEASON_CALENDAR.filter((r) => r.stages.length === 1).map(
    (r) => `${r.id}:s${season}`,
  )
  if (oneDayKeys.length === 0) return
  const anyOneDayRun = await tx
    .select({ riderId: stageResults.riderId })
    .from(stageResults)
    .where(inArray(stageResults.raceId, oneDayKeys))
    .limit(1)
  if (anyOneDayRun.length === 0) return

  const totals = new Map<string, number>()
  const add = (riderId: string, pts: number): void => {
    if (pts !== 0) totals.set(riderId, (totals.get(riderId) ?? 0) + pts)
  }
  for (const race of SEASON_CALENDAR) {
    const key = `${race.id}:s${season}`
    const isOneDay = race.stages.length === 1
    // Puntos de etapa: en carreras por etapas, por cada puesto de cada etapa. En las de un día NO
    // (contarían doble con la general, que es la misma llegada).
    if (!isOneDay) {
      const sres = await tx
        .select({ riderId: stageResults.riderId, puesto: stageResults.puesto })
        .from(stageResults)
        .where(eq(stageResults.raceId, key))
      for (const row of sres) add(row.riderId, stagePointsByClass(race.raceClass, row.puesto - 1))
    }
    // Puntos de general: solo si la carrera ya TERMINÓ (existe resultado de su última etapa).
    const finalRun = await tx
      .select({ riderId: stageResults.riderId })
      .from(stageResults)
      .where(and(eq(stageResults.raceId, key), eq(stageResults.stageDay, race.stages.length)))
      .limit(1)
    if (finalRun.length > 0) {
      const gc = await tx
        .select({ riderId: raceGc.riderId })
        .from(raceGc)
        .where(eq(raceGc.raceId, key))
        .orderBy(asc(raceGc.tiempoTotalS))
      gc.forEach((row, i) => add(row.riderId, gcPointsByClass(race.raceClass, i)))
    }
  }

  // Escribe solo las diferencias: en la primera pasada corrige a quien tenía el doble; después,
  // como coincide con lo almacenado, no toca nada (idempotente y barato tras converger).
  const stored = await tx
    .select({ id: riders.id, seasonPoints: riders.seasonPoints })
    .from(riders)
    .where(eq(riders.worldId, worldId))
  for (const r of stored) {
    const correct = totals.get(r.id) ?? 0
    if (correct !== r.seasonPoints) {
      await tx.update(riders).set({ seasonPoints: correct }).where(eq(riders.id, r.id))
    }
  }
}

export async function runCalendarDay(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
): Promise<Set<string>> {
  const season = Math.floor(gameDay / SEASON_DAYS)
  const dayOfSeason = gameDay % SEASON_DAYS
  const raced = new Set<string>()

  // Corrige datos viejos del mundo (palmarés de 1 día, dorsales faltantes, puntos de ranking). Idempotente.
  await backfillWorldData(tx, worldId, season)

  // Corredores OCUPADOS hoy: los que ya están corriendo una carrera que arrancó antes y aún no
  // termina (nadie puede estar en dos carreras a la vez). Los que empiecen carrera hoy se van
  // añadiendo según se convocan, para que las carreras posteriores del día no los repitan.
  const ongoingKeys = SEASON_CALENDAR.filter((r) => raceOngoingBefore(r, dayOfSeason)).map(
    (r) => `${r.id}:s${season}`,
  )
  const busy = new Set<string>()
  if (ongoingKeys.length > 0) {
    const rows = await tx
      .select({ riderId: raceRosters.riderId })
      .from(raceRosters)
      .where(inArray(raceRosters.raceId, ongoingKeys))
    for (const row of rows) busy.add(row.riderId)
  }

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
        const enrolled = race.championshipCountry
          ? await convokeNationalField(tx, worldId, race, raceKey, busy, season)
          : await convokeField(tx, worldId, race, raceKey, worldSeed, season, busy)
        for (const id of enrolled) busy.add(id)
        // Agentes libres humanos que se auto-inscribieron y pueden pagarse el viaje entran también.
        const selfEntered = await convokeSelfEntries(
          tx,
          worldId,
          race,
          raceKey,
          busy,
          season,
          gameDay,
        )
        for (const id of selfEntered) busy.add(id)
      } else {
        // Ya estaba convocada (p.ej. reanudación): sus corredores también quedan ocupados hoy.
        for (const row of existing) busy.add(row.riderId)
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

  // Cierre de inscripciones: congela la escuadra de las carreras que arrancan dentro de ~2 semanas.
  // Va después del bucle de etapas para que las carreras convocadas hoy ya cuenten al calcular solapes.
  await lockUpcomingRosters(tx, worldId, gameDay, worldSeed)

  return raced
}
