import {
  type CalendarRace,
  type CallupCandidate,
  type Division,
  type RaceClass,
  SEASON_CALENDAR,
  type TeamPhilosophy,
  formStars,
  raceLastDay,
  raceOngoingBefore,
  raceVocationFit,
  scheduledStageIndex,
  selectSquad,
} from '@cyclingstar/engine'
import {
  type Continent,
  continentForCountry,
  countriesInContinent,
  raceAttendanceCost,
} from '@cyclingstar/shared'
import { and, desc, eq, inArray, isNotNull, isNull, notInArray, or, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { creditRider } from './economy.js'
import { raceEntries, raceRosters, riderRacePrefs, riders, teamRacePlan, teams } from './schema.js'
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
    .where(and(eq(riders.worldId, worldId), eq(riders.country, country), isNull(riders.retiredAt)))
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
    const wild = rotatePick(outRegion, cap - home.length, rotateBy ?? 0)
    return [...home, ...wild]
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
    return [...guaranteed, ...rotatePick(pool, remaining, rotateBy ?? 0)]
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
  const size = SQUAD_SIZE[race.format]
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
  const size = SQUAD_SIZE[race.format]
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
    .where(and(inArray(riders.teamId, teamIds), isNull(riders.retiredAt)))
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
        // Plan de temporada: los WorldTour corren las tres. Reparten su plantilla por aptitud en tres
        // grupos disjuntos (los mejores al Tour); esta gran vuelta se lleva su tercio. Nadie repite,
        // así que la Vuelta corre con gente fresca y distinta, no con las sobras. El reparto por
        // paridad (i % 3) da esos tercios, pero solo es estable si la plantilla ordenada es la misma
        // en las tres convocatorias; si algún corredor mejor está ocupado en otra carrera el día de
        // salida de una gran vuelta pero no de otra, la paridad se desplaza y podría repetir. Por eso,
        // además, excluimos a quien ya haya sido convocado a una gran vuelta anterior esta temporada
        // (mismo dato que las wildcards Pro): garantiza que nadie corra dos grandes vueltas.
        const ranked = [...members].sort(
          (a, b) => gtSuit(b) - gtSuit(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
        )
        members = ranked
          .filter((_, i) => i % 3 === gtRank)
          .filter((m) => (gtCount.get(m.id) ?? 0) === 0)
      } else {
        // Wildcards (Pro): a lo sumo una gran vuelta; usa a los que aún no han corrido ninguna.
        members = members.filter((m) => (gtCount.get(m.id) ?? 0) === 0)
      }
    }
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
    const residenceById = new Map(members.map((m) => [m.id, m.residence ?? m.country]))
    for (const id of squad) {
      rosterValues.push({ raceId: raceKey, riderId: id })
      const cost = raceAttendanceCost(residenceById.get(id) ?? null, race.country ?? null, raceDays)
      if (cost.money > 0) travelByTeam.set(team.id, (travelByTeam.get(team.id) ?? 0) + cost.money)
      if (cost.days > 0)
        (travelReturn.get(cost.days) ?? travelReturn.set(cost.days, []).get(cost.days)!).push(id)
    }
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
      .orderBy(desc(riders.fame))
      .limit(fieldCap - rosterValues.length)
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
}
/** Un equipo del pelotón; `riders` va lleno solo cuando la escuadra ya está congelada. */
export interface StartlistTeam {
  id: string
  name: string
  country: string | null
  division: Division
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
    const roster = await tx
      .select({ riderId: raceRosters.riderId })
      .from(raceRosters)
      .where(eq(raceRosters.raceId, raceKey))
    if (roster.length > 0) {
      // Cierre pasado: la escuadra está congelada. Mostramos los corredores reales agrupados por equipo.
      const ids = roster.map((r) => r.riderId)
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
        })
        .from(riders)
        .leftJoin(teams, eq(teams.id, riders.teamId))
        .where(inArray(riders.id, ids))
      const byTeam = new Map<string, StartlistTeam>()
      const freeAgents: StartlistRider[] = []
      for (const r of rows) {
        const rider: StartlistRider = {
          id: r.id,
          name: r.name,
          country: r.country ?? '',
          isBot: r.userId == null,
        }
        if (r.teamId && r.teamName) {
          let t = byTeam.get(r.teamId)
          if (!t) {
            t = {
              id: r.teamId,
              name: r.teamName,
              country: r.teamCountry,
              division: r.teamDivision as Division,
              riders: [],
            }
            byTeam.set(r.teamId, t)
          }
          t.riders.push(rider)
        } else {
          freeAgents.push(rider)
        }
      }
      const teamsList = [...byTeam.values()].sort((a, b) => a.name.localeCompare(b.name))
      for (const t of teamsList) t.riders.sort((a, b) => a.name.localeCompare(b.name))
      freeAgents.sort((a, b) => a.name.localeCompare(b.name))
      return { frozen: true, teams: teamsList, freeAgents }
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
        riders: [],
      })),
      freeAgents: fa.map((r) => ({
        id: r.id,
        name: r.name,
        country: r.country ?? '',
        isBot: false,
      })),
    }
  })
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
    if (already.length > 0) continue // ya congelada
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
    if (already.length > 0) return
    await freezeRaceRoster(tx, worldId, worldSeed, race, season, gameDay)
  })
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
