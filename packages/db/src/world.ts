import { randomUUID } from 'node:crypto'
import { type Division, type NpcGenome, generateNpcRider, sampleNpcAge } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  VOCATIONS,
  type Vocation,
  seededRng,
} from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { riderAttrs, riderHidden, riders, teams } from './schema.js'
import { generateUniqueName } from './names.js'
import { makeLangTeamName } from './teamNameLang.js'

/**
 * Génesis del mundo NPC (SPEC 10, Paso 33). Equipos en tres divisiones y ~1.600 corredores,
 * reproducibles desde `worldSeed`. `planWorld` es el plan puro (determinista, testeable);
 * `seedWorld` lo inserta por lotes. Debut a los 20; en la génesis (temporada 0) birthSeason = 20-edad.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const DEBUT_AGE = 20
type Philosophy = 'general' | 'sprints' | 'clasicas' | 'cantera' | 'equilibrado'

interface DivisionPlan {
  division: Division
  teams: number
  roster: number
  budgetBase: number
}
/**
 * Nacionalidad de los equipos por división, con el reparto REAL por país (SPEC 7.1). El equipo i de
 * una división toma el país en la posición i de su lista. Continental es la distribución exacta del
 * pelotón real (185 equipos); WorldTour (18) y ProTeams (18) son la reconstrucción de la temporada
 * en curso (ajustable si cambia). Cada país existe en el registro de banderas/nombres.
 */
const dist = (pairs: [number, string][]): string[] =>
  pairs.flatMap(([n, code]) => Array<string>(n).fill(code))

const TEAM_DIST: Record<Division, string[]> = {
  // WorldTour real: 18 equipos con el reparto exacto por país (SPEC 7.1).
  WT: dist([
    [3, 'BE'],
    [2, 'FR'],
    [2, 'DE'],
    [2, 'NL'],
    [1, 'US'],
    [1, 'GB'],
    [1, 'CH'],
    [1, 'BH'],
    [1, 'AU'],
    [1, 'ES'],
    [1, 'AE'],
    [1, 'NO'],
    [1, 'KZ'],
  ]),
  // ProTeams reales: 16 equipos con el reparto exacto por país (SPEC 7.1).
  PRS: dist([
    [4, 'ES'],
    [3, 'IT'],
    [3, 'FR'],
    [2, 'US'],
    [2, 'CH'],
    [1, 'HU'],
    [1, 'BE'],
  ]),
  // Reparto exacto de los ~185 Continental reales por país.
  CON: dist([
    [15, 'CN'],
    [13, 'IT'],
    [12, 'FR'],
    [10, 'PT'],
    [9, 'JP'],
    [9, 'DE'],
    [8, 'NL'],
    [8, 'US'],
    [7, 'BE'],
    [6, 'AT'],
    [5, 'AU'],
    [5, 'CZ'],
    [4, 'TR'],
    [4, 'CO'],
    [4, 'DK'],
    [4, 'PH'],
    [3, 'ID'],
    [3, 'RW'],
    [3, 'KZ'],
    [3, 'SI'],
    [3, 'CH'],
    [3, 'KR'],
    [3, 'NO'],
    [3, 'TH'],
    [3, 'PL'],
    [2, 'MY'],
    [2, 'IR'],
    [2, 'MX'],
    [2, 'DZ'],
    [1, 'KG'],
    [1, 'ES'],
    [1, 'CL'],
    [1, 'GR'],
    [1, 'NZ'],
    [1, 'FI'],
    [1, 'BO'],
    [1, 'EE'],
    [1, 'UZ'],
    [1, 'MA'],
    [1, 'ZA'],
    [1, 'HU'],
    [1, 'AE'],
    [1, 'HN'],
    [1, 'RO'],
    [1, 'SE'],
    [1, 'BR'],
    [1, 'GB'],
    [1, 'HK'],
    [1, 'GT'],
    [1, 'LT'],
    [1, 'GU'],
    [1, 'SK'],
    [1, 'UA'],
    [1, 'XK'],
    [1, 'BH'],
    [1, 'EC'],
  ]),
}

/** Nacionalidad del equipo i de una división (con módulo, por si un mundo tiene equipos de más). */
export function teamCountryByIndex(division: Division, index: number): string {
  const arr = TEAM_DIST[division]
  return arr[index % arr.length]!
}

/**
 * Tamaño de plantilla por división. Realista: un WorldTour tiene ~28 corredores (necesita cubrir a
 * la vez una gran vuelta de 8 y varias carreras más), un ProTeam ~20 y un Continental ~12. Compartido
 * por la génesis y por el rollover (que rellena las plantillas hasta este tamaño cada temporada).
 */
export const ROSTER_SIZE: Record<Division, number> = { WT: 28, PRS: 20, CON: 12 }

const DIVISIONS: DivisionPlan[] = [
  { division: 'WT', teams: TEAM_DIST.WT.length, roster: ROSTER_SIZE.WT, budgetBase: 5_000_000 },
  { division: 'PRS', teams: TEAM_DIST.PRS.length, roster: ROSTER_SIZE.PRS, budgetBase: 2_000_000 },
  { division: 'CON', teams: TEAM_DIST.CON.length, roster: ROSTER_SIZE.CON, budgetBase: 700_000 },
]
// Firmados = 18·28 + 16·20 + 185·12 = 3.044; la meta deja ~900 agentes libres para el mercado.
const TARGET_POPULATION = 3900

/**
 * Distribución de nacionalidades de los bots (SPEC 10). Ponderada por peso ciclista real: las
 * potencias tradicionales aparecen más para que el pelotón sea creíble; el resto del mundo con
 * federación entra con menos frecuencia. Se expande a un array plano para que `pick` sea uniforme.
 */
const COUNTRY_WEIGHTS: Record<string, number> = {
  FR: 6,
  IT: 6,
  ES: 6,
  BE: 6,
  NL: 5,
  GB: 4,
  DE: 4,
  CO: 4,
  SI: 3,
  DK: 3,
  AU: 3,
  US: 3,
  CH: 3,
  PT: 2,
  NO: 2,
  SK: 2,
  // Wave 1 del despliegue mundial (#1).
  AR: 2,
  EC: 2,
  KZ: 2,
  PL: 2,
  AT: 2,
  CZ: 2,
  IE: 1,
  CA: 1,
  NZ: 1,
  SE: 1,
  JP: 1,
  MX: 1,
  // Wave 2.
  UA: 2,
  EE: 2,
  LV: 2,
  LT: 2,
  BY: 2,
  ZA: 1,
  BR: 2,
  CL: 1,
  // Wave 3.
  VE: 1,
  FI: 2,
  HR: 2,
  HU: 1,
  RO: 1,
  // Wave 4.
  RU: 3,
  RS: 1,
  BG: 1,
  GR: 1,
  TR: 1,
  IL: 1,
  KR: 1,
  CN: 1,
  // Wave 5.
  UY: 1,
  PE: 1,
  CR: 1,
  MA: 1,
  ER: 1,
  // Wave 6.
  LU: 1,
  RW: 2,
  DZ: 1,
  IR: 1,
  GT: 1,
  BO: 1,
  GE: 1,
  IN: 1,
  // Wave 7.
  EG: 1,
  ET: 1,
  TH: 1,
  ID: 1,
  PH: 1,
  CU: 1,
  PA: 1,
  MD: 1,
  // Wave 8.
  NG: 1,
  KE: 1,
  TN: 1,
  MY: 1,
  VN: 1,
  AE: 1,
  AM: 1,
  IS: 1,
  // Wave 9.
  AZ: 1,
  UZ: 1,
  SA: 1,
  QA: 1,
  SG: 1,
  DO: 1,
  PY: 1,
  MK: 1,
  // Wave 10.
  KG: 1,
  HK: 1,
  GU: 1,
  BH: 1,
  XK: 1,
  HN: 1,
  // Wave 11: naciones anfitrionas de carreras continentales (para que tengan corredores y campeonato).
  AD: 1,
  AL: 1,
  BA: 1,
  BF: 1,
  BJ: 1,
  CM: 1,
  CY: 1,
  MU: 1,
  OM: 1,
  TW: 1,
}
const COUNTRIES = Object.entries(COUNTRY_WEIGHTS).flatMap(([code, w]) => Array(w).fill(code))
const PHILOSOPHIES: Philosophy[] = ['general', 'sprints', 'clasicas', 'cantera', 'equilibrado']

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!
}

export interface TeamPlan {
  id: string
  name: string
  country: string
  division: Division
  budget: number
  philosophy: Philosophy
  jerseySeed: string
  facilities: number
}

export interface RiderPlan {
  id: string
  teamId: string | null
  name: string
  country: string
  gender: 'M'
  archetype: Vocation
  birthSeason: number
  attributes: Record<Attribute, number>
  hidden: NpcGenome['hidden']
}

export interface WorldPlan {
  teams: TeamPlan[]
  riders: RiderPlan[]
}

function buildRider(
  worldSeed: string,
  index: number,
  division: Division,
  teamId: string | null,
  usedNames: Set<string>,
  teamCountry?: string,
): RiderPlan {
  const seed = `${worldSeed}:rider:${index}`
  const rng = seededRng(`${seed}:meta`)
  const archetype = pick(VOCATIONS, rng)
  // Núcleo nacional (SPEC 7.1): un corredor de equipo es, con probabilidad = cuota de su división,
  // del país del equipo; si no, del reparto mundial. Los agentes libres (sin equipo) son mundiales.
  const country =
    teamCountry && rng() < NATIONAL_CORE_SHARE[division] ? teamCountry : pick(COUNTRIES, rng)
  const age = sampleNpcAge(`${seed}:age`)
  const genome = generateNpcRider(`${seed}:genome`, { division, vocation: archetype, age })
  // Nombre único en todo el mundo (ni bots ni humanos repetidos).
  const name = generateUniqueName(`${seed}:name`, { country, gender: 'M' }, usedNames).fullName
  return {
    id: randomUUID(),
    teamId,
    name,
    country,
    gender: 'M',
    archetype,
    // Génesis en temporada 0: birthSeason = 20 - edad (envejece un año por temporada).
    birthSeason: DEBUT_AGE - age,
    attributes: genome.attributes,
    hidden: genome.hidden,
  }
}

/** Plan completo y reproducible del mundo: equipos y corredores (SPEC 10). Puro y determinista. */
export function planWorld(worldSeed: string): WorldPlan {
  const teamPlans: TeamPlan[] = []
  const riderPlans: RiderPlan[] = []
  const usedTeamNames = new Set<string>()
  const usedRiderNames = new Set<string>()
  let riderIndex = 0

  for (const div of DIVISIONS) {
    for (let t = 0; t < div.teams; t++) {
      const seed = `${worldSeed}:team:${div.division}:${t}`
      const rng = seededRng(seed)
      const id = randomUUID()
      const budget = Math.round(div.budgetBase * (0.6 + 0.8 * rng()))
      const facilities = 0.9 + rng() * 0.3 // K_inst [0.90, 1.20]
      const jerseySeed = `${seed}:jersey`
      const country = teamCountryByIndex(div.division, t)
      // Nombre ficticio en el idioma del país (romanizado). Mismo generador y orden que la
      // reconciliación del tick, para que en un mundo nuevo esta no cambie nada.
      const name = makeLangTeamName(jerseySeed, country, usedTeamNames)
      teamPlans.push({
        id,
        name,
        country,
        division: div.division,
        budget,
        philosophy: pick(PHILOSOPHIES, rng),
        jerseySeed,
        facilities,
      })
      for (let r = 0; r < div.roster; r++) {
        riderPlans.push(
          buildRider(worldSeed, riderIndex++, div.division, id, usedRiderNames, country),
        )
      }
    }
  }

  // Agentes libres (sin equipo) para el mercado, hasta la población objetivo.
  while (riderPlans.length < TARGET_POPULATION) {
    riderPlans.push(buildRider(worldSeed, riderIndex++, 'CON', null, usedRiderNames))
  }

  return { teams: teamPlans, riders: riderPlans }
}

/**
 * Inserta por lotes el plan del mundo. Idempotente y con top-up estructural: en un mundo nuevo
 * inserta todo (equipos, plantillas y agentes libres); en un mundo ya sembrado añade solo los
 * equipos que falten (identificados por su semilla de maillot, estable) y sus plantillas, sin
 * duplicar ni tocar a los corredores existentes. Así, subir el número real de equipos por división
 * hace que el mundo en marcha se complete en su siguiente tick. No repone agentes libres perdidos
 * por bajas naturales: solo cubre el salto estructural.
 */
export async function seedWorld(tx: Tx, worldId: string, worldSeed: string): Promise<void> {
  const existing = await tx
    .select({ jerseySeed: teams.jerseySeed })
    .from(teams)
    .where(eq(teams.worldId, worldId))
  const existingSeeds = new Set(existing.map((r) => r.jerseySeed))
  const fresh = existingSeeds.size === 0

  const plan = planWorld(worldSeed)
  const newTeams = fresh ? plan.teams : plan.teams.filter((t) => !existingSeeds.has(t.jerseySeed))
  if (newTeams.length === 0) return // ya está a la estructura objetivo

  // En un mundo nuevo insertamos todos los corredores (incluidos los agentes libres); en un top-up
  // solo las plantillas de los equipos nuevos.
  const newTeamIds = new Set(newTeams.map((t) => t.id))
  const newRiders = fresh
    ? plan.riders
    : plan.riders.filter((r) => r.teamId !== null && newTeamIds.has(r.teamId))

  await insertChunked(
    newTeams.map((t) => ({
      id: t.id,
      worldId,
      name: t.name,
      country: t.country,
      division: t.division,
      budget: t.budget,
      philosophy: t.philosophy,
      jerseySeed: t.jerseySeed,
      facilities: t.facilities,
    })),
    200,
    (chunk) => tx.insert(teams).values(chunk),
  )

  await insertChunked(
    newRiders.map((r) => ({
      id: r.id,
      worldId,
      userId: null,
      teamId: r.teamId,
      name: r.name,
      country: r.country,
      gender: r.gender,
      birthSeason: r.birthSeason,
      archetype: r.archetype,
      faceSeed: `${r.id}:face`,
      ctl: 45,
      atl: 45,
      morale: 60,
    })),
    400,
    (chunk) => tx.insert(riders).values(chunk),
  )

  const attrValues = newRiders.flatMap((r) =>
    ATTRIBUTES.map((attr) => ({ riderId: r.id, attr, value: r.attributes[attr] })),
  )
  await insertChunked(attrValues, 2000, (chunk) => tx.insert(riderAttrs).values(chunk))

  await insertChunked(
    newRiders.map((r) => ({
      riderId: r.id,
      talent: r.hidden.talent,
      ceilings: r.hidden.ceilings,
      fragility: r.hidden.fragility,
      peakAge: r.hidden.peakAge,
      declineAge: r.hidden.declineAge,
    })),
    500,
    (chunk) => tx.insert(riderHidden).values(chunk),
  )
}

const DIV_RANK: Record<Division, number> = { WT: 0, PRS: 1, CON: 2 }

/** Índice del equipo dentro de su división, leído de su semilla de maillot (…:team:DIV:i:jersey). */
function teamIndexFromSeed(jerseySeed: string): number {
  const m = jerseySeed.match(/:team:[A-Z]+:(\d+):jersey$/)
  return m ? Number.parseInt(m[1]!, 10) : 0
}

/**
 * Reconcilia los equipos NPC con el reparto real de nacionalidades y les da nombre en el idioma de
 * su país (SPEC 7). Recorre los equipos bot en orden fijo (división, índice) —el mismo que la
 * génesis— reconstruyendo el conjunto de nombres usados, así que la asignación es determinista y un
 * punto fijo: tras aplicarla una vez, las siguientes ejecuciones no cambian nada (idempotente). Los
 * equipos con dueño (humanos) no se tocan; sus nombres se reservan para no colisionar. Repara así
 * los mundos anteriores a esta distribución en su siguiente tick.
 */
export async function reconcileTeams(tx: Tx, worldId: string): Promise<number> {
  const rows = await tx
    .select({
      id: teams.id,
      division: teams.division,
      jerseySeed: teams.jerseySeed,
      ownerUserId: teams.ownerUserId,
      name: teams.name,
      country: teams.country,
    })
    .from(teams)
    .where(eq(teams.worldId, worldId))

  const used = new Set<string>()
  for (const t of rows) {
    if (t.ownerUserId !== null) used.add(t.name.toLowerCase()) // los equipos humanos mandan
  }
  const bots = rows.filter((t) => t.ownerUserId === null)
  const inRange = (t: (typeof bots)[number]) =>
    teamIndexFromSeed(t.jerseySeed) < TEAM_DIST[t.division].length

  // Poda de equipos NPC sobrantes: si un mundo se expandió a más equipos de los reales (p. ej. un
  // Continental de 200 cuando el reparto son 185), los de índice fuera de rango se eliminan. Sus
  // corredores pasan a agentes libres (team_id nulo); borrar el equipo arrastra contratos y ofertas
  // (onDelete cascade). Nunca se podan equipos con dueño. Idempotente: una vez podados, no vuelven.
  let changed = 0
  for (const t of bots.filter((b) => !inRange(b))) {
    await tx.update(riders).set({ teamId: null }).where(eq(riders.teamId, t.id))
    await tx.delete(teams).where(eq(teams.id, t.id))
    changed++
  }

  // Reconcilia los equipos en rango en orden fijo (división, índice) —el mismo que la génesis—, para
  // que la asignación sea un punto fijo determinista (no-op en un mundo nuevo).
  const keep = bots
    .filter(inRange)
    .sort(
      (a, b) =>
        DIV_RANK[a.division] - DIV_RANK[b.division] ||
        teamIndexFromSeed(a.jerseySeed) - teamIndexFromSeed(b.jerseySeed),
    )
  for (const t of keep) {
    const country = teamCountryByIndex(t.division, teamIndexFromSeed(t.jerseySeed))
    const name = makeLangTeamName(t.jerseySeed, country, used)
    if (t.country !== country || t.name !== name) {
      await tx.update(teams).set({ country, name }).where(eq(teams.id, t.id))
      changed++
    }
  }
  return changed
}

/**
 * Cuota del "núcleo nacional" de la plantilla por división: qué fracción de los corredores de un
 * equipo debería ser de su propio país (SPEC 7.1). Continental tiene una identidad nacional fuerte
 * (mayoría del país); ProTeams algo menos; WorldTour son los más internacionales.
 */
// Cuota de "núcleo nacional" por división: los Continental reales son casi mononacionales (equipos
// regionales/de desarrollo), los ProTeams tienen mayoría local con fichajes de fuera, y los
// WorldTour son los más internacionales. Sube CON a 0.85 para que no parezcan legiones extranjeras.
export const NATIONAL_CORE_SHARE: Record<Division, number> = { WT: 0.35, PRS: 0.55, CON: 0.85 }

export interface ClusterTeam {
  id: string
  division: Division
  country: string
  /** Orden estable del equipo dentro de su división (índice de la semilla de maillot). */
  order: number
}
export interface ClusterRider {
  id: string
  country: string
  /** Equipo bot en el que corre ahora (todos los de la entrada son movibles). */
  teamId: string
}

/**
 * Planifica el "núcleo nacional" de cada equipo SIN cambiar la nacionalidad de nadie: reparte los
 * corredores bot movibles entre los equipos bot de su MISMA división para que cada equipo tenga
 * mayoría de su país, conservando el tamaño de cada plantilla. Función pura y determinista (base de
 * la idempotencia): dada la misma entrada produce el mismo mapa destino, así que reaplicarla no
 * cambia nada. Devuelve solo los corredores que cambian de equipo (riderId → nuevo teamId).
 *
 * Dos fases por división: (1) cada equipo, en orden fijo, toma hasta su cuota de paisanos de una
 * cola por país; (2) los corredores que sobran rellenan los huecos restantes en orden fijo (la
 * "legión extranjera"). La conservación (suma de plazas = nº de corredores) garantiza que todos
 * acaban colocados.
 */
export function planNationalClustering(
  teamsIn: ClusterTeam[],
  ridersIn: ClusterRider[],
  shareByDivision: Record<Division, number> = NATIONAL_CORE_SHARE,
): Map<string, string> {
  const changes = new Map<string, string>()
  const divisions = new Set(teamsIn.map((t) => t.division))

  for (const division of divisions) {
    const teamsD = teamsIn.filter((t) => t.division === division).sort((a, b) => a.order - b.order)
    const teamIds = new Set(teamsD.map((t) => t.id))
    const ridersD = ridersIn.filter((r) => teamIds.has(r.teamId))

    // Plazas por equipo = nº de corredores movibles que tiene ahora (conserva el tamaño).
    const slots = new Map<string, number>()
    for (const t of teamsD) slots.set(t.id, 0)
    for (const r of ridersD) slots.set(r.teamId, (slots.get(r.teamId) ?? 0) + 1)

    // Colas por país (orden estable por id) para repartir de forma determinista.
    const byCountry = new Map<string, string[]>()
    for (const r of [...ridersD].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
      const q = byCountry.get(r.country)
      if (q) q.push(r.id)
      else byCountry.set(r.country, [r.id])
    }
    const taken = new Set<string>()
    const assignment = new Map<string, string>() // riderId → teamId destino
    const filled = new Map<string, number>() // teamId → plazas ya ocupadas

    // Fase 1: núcleo nacional, repartido EQUITATIVAMENTE entre los equipos de un mismo país (round
    // robin). Así, cuando un país tiene varios equipos y no le sobran paisanos, todos quedan a un
    // nivel parecido en vez de llenar los primeros y dejar a los últimos como legión extranjera.
    const share = shareByDivision[division]
    for (const t of teamsD) filled.set(t.id, 0)
    const teamsByCountry = new Map<string, ClusterTeam[]>()
    for (const t of teamsD) {
      const l = teamsByCountry.get(t.country)
      if (l) l.push(t)
      else teamsByCountry.set(t.country, [t])
    }
    for (const [country, cteams] of teamsByCountry) {
      const queue = byCountry.get(country)
      if (!queue) continue
      const target = new Map(
        cteams.map((t) => {
          const total = slots.get(t.id) ?? 0
          return [t.id, Math.min(total, Math.round(share * total))]
        }),
      )
      let qi = 0
      let progress = true
      while (qi < queue.length && progress) {
        progress = false
        for (const t of cteams) {
          if (qi >= queue.length) break
          if ((filled.get(t.id) ?? 0) >= (target.get(t.id) ?? 0)) continue
          const riderId = queue[qi]!
          qi++
          taken.add(riderId)
          assignment.set(riderId, t.id)
          filled.set(t.id, (filled.get(t.id) ?? 0) + 1)
          progress = true
        }
      }
    }

    // Fase 2: rellenar huecos restantes con los que sobran (orden estable por id).
    const leftover = ridersD
      .filter((r) => !taken.has(r.id))
      .map((r) => r.id)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    let cursor = 0
    for (const t of teamsD) {
      const total = slots.get(t.id) ?? 0
      let count = filled.get(t.id) ?? 0
      while (count < total && cursor < leftover.length) {
        assignment.set(leftover[cursor]!, t.id)
        cursor++
        count++
      }
    }

    // Solo los que cambian de equipo.
    const currentTeam = new Map(ridersD.map((r) => [r.id, r.teamId]))
    for (const [riderId, teamId] of assignment) {
      if (currentTeam.get(riderId) !== teamId) changes.set(riderId, teamId)
    }
  }

  return changes
}

/**
 * Aplica el núcleo nacional (planNationalClustering) sobre el mundo: mueve corredores bot entre
 * equipos bot de su misma división para que cada equipo tenga mayoría de su país. No toca corredores
 * humanos ni equipos con dueño (se excluyen del reparto), ni agentes libres. Idempotente: en un
 * mundo ya agrupado no hace ningún cambio. Devuelve cuántos corredores se movieron.
 */
export async function clusterTeamNationalities(tx: Tx, worldId: string): Promise<number> {
  const teamRows = await tx
    .select({
      id: teams.id,
      division: teams.division,
      country: teams.country,
      jerseySeed: teams.jerseySeed,
      ownerUserId: teams.ownerUserId,
    })
    .from(teams)
    .where(eq(teams.worldId, worldId))
  const botTeams = teamRows.filter(
    (t): t is typeof t & { country: string } => t.ownerUserId === null && t.country !== null,
  )
  const botTeamIds = new Set(botTeams.map((t) => t.id))
  if (botTeamIds.size === 0) return 0

  const riderRows = await tx
    .select({
      id: riders.id,
      country: riders.country,
      teamId: riders.teamId,
      userId: riders.userId,
    })
    .from(riders)
    .where(eq(riders.worldId, worldId))
  // Movibles: bots (sin userId) que corren en un equipo bot. Los humanos y los de equipos con dueño
  // se quedan donde están; los agentes libres (teamId nulo) no entran.
  const movable: ClusterRider[] = riderRows
    .filter((r) => r.userId === null && r.teamId !== null && botTeamIds.has(r.teamId))
    .map((r) => ({ id: r.id, country: r.country, teamId: r.teamId as string }))

  const clusterTeams: ClusterTeam[] = botTeams.map((t) => ({
    id: t.id,
    division: t.division,
    country: t.country,
    order: teamIndexFromSeed(t.jerseySeed),
  }))

  const changes = planNationalClustering(clusterTeams, movable)
  for (const [riderId, teamId] of changes) {
    await tx.update(riders).set({ teamId }).where(eq(riders.id, riderId))
  }
  return changes.size
}

/**
 * Renacionaliza plantillas bot: rebautiza a los corredores bot EXTRANJEROS sobrantes con el país (y
 * un nombre nuevo de ese país) de su equipo, hasta alcanzar la cuota nacional de la división. La
 * reagrupación (clusterTeamNationalities) solo REUBICA a los paisanos existentes; no puede crear más.
 * Esto sí, y es lo que hace nacionales a los mundos creados antes del sesgo de nacionalidad (o con
 * pocos paisanos): un equipo chino sin chinos pasa a tener mayoría china en el siguiente tick.
 *
 * No toca corredores humanos ni equipos con dueño. Idempotente: una vez el equipo llega a su cuota,
 * no cambia a nadie. Los nombres duplicados que pueda crear los limpia dedupeWorldNames después.
 * Devuelve cuántos corredores se renacionalizaron.
 */
export async function renationalizeBotRosters(
  tx: Tx,
  worldId: string,
  worldSeed: string,
  shareByDivision: Record<Division, number> = NATIONAL_CORE_SHARE,
): Promise<number> {
  const teamRows = await tx
    .select({
      id: teams.id,
      division: teams.division,
      country: teams.country,
      ownerUserId: teams.ownerUserId,
    })
    .from(teams)
    .where(eq(teams.worldId, worldId))
  const botTeams = teamRows.filter(
    (t): t is typeof t & { country: string } => t.ownerUserId === null && t.country !== null,
  )
  if (botTeams.length === 0) return 0
  const teamById = new Map(botTeams.map((t) => [t.id, t]))

  const riderRows = await tx
    .select({
      id: riders.id,
      country: riders.country,
      teamId: riders.teamId,
      userId: riders.userId,
      gender: riders.gender,
    })
    .from(riders)
    .where(eq(riders.worldId, worldId))

  const byTeam = new Map<string, typeof riderRows>()
  for (const r of riderRows) {
    if (r.userId !== null || !r.teamId || !teamById.has(r.teamId)) continue
    const list = byTeam.get(r.teamId) ?? []
    list.push(r)
    byTeam.set(r.teamId, list)
  }

  const used = new Set<string>()
  let changed = 0
  for (const team of botTeams) {
    const members = byTeam.get(team.id) ?? []
    if (members.length === 0) continue
    const target = Math.round((shareByDivision[team.division] ?? 0) * members.length)
    const home = members.filter((m) => m.country === team.country).length
    if (home >= target) continue
    const need = target - home
    const foreign = members
      .filter((m) => m.country !== team.country)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    for (let i = 0; i < need && i < foreign.length; i++) {
      const r = foreign[i]!
      const name = generateUniqueName(
        `${worldSeed}:renat:${r.id}`,
        { country: team.country, gender: r.gender === 'F' ? 'F' : 'M' },
        used,
      ).fullName
      await tx.update(riders).set({ country: team.country, name }).where(eq(riders.id, r.id))
      changed++
    }
  }
  return changed
}

/** Inserta un array en lotes para no exceder el límite de parámetros de Postgres. */
async function insertChunked<T>(
  rows: T[],
  size: number,
  insert: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size))
  }
}
