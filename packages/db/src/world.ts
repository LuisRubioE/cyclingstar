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
  WT: dist([
    [3, 'BE'],
    [3, 'FR'],
    [2, 'DE'],
    [2, 'NL'],
    [1, 'US'],
    [1, 'GB'],
    [1, 'CH'],
    [1, 'BH'],
    [1, 'AU'],
    [1, 'ES'],
    [1, 'AE'],
    [1, 'KZ'],
  ]),
  PRS: dist([
    [4, 'IT'],
    [3, 'ES'],
    [3, 'FR'],
    [2, 'CH'],
    [1, 'NO'],
    [1, 'BE'],
    [1, 'NL'],
    [1, 'US'],
    [1, 'JP'],
    [1, 'TH'],
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

const DIVISIONS: DivisionPlan[] = [
  { division: 'WT', teams: TEAM_DIST.WT.length, roster: 14, budgetBase: 5_000_000 },
  { division: 'PRS', teams: TEAM_DIST.PRS.length, roster: 12, budgetBase: 2_000_000 },
  { division: 'CON', teams: TEAM_DIST.CON.length, roster: 10, budgetBase: 700_000 },
]
// Firmados = 18·14 + 18·12 + 185·10 = 2.318; la meta deja ~880 agentes libres para el mercado.
const TARGET_POPULATION = 3200

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
): RiderPlan {
  const seed = `${worldSeed}:rider:${index}`
  const rng = seededRng(`${seed}:meta`)
  const archetype = pick(VOCATIONS, rng)
  const country = pick(COUNTRIES, rng)
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
        riderPlans.push(buildRider(worldSeed, riderIndex++, div.division, id, usedRiderNames))
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
