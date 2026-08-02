import { randomUUID } from 'node:crypto'
import { type Division, type NpcGenome, generateNpcRider, sampleNpcAge } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  VOCATIONS,
  type Vocation,
  seededRng,
} from '@cyclingstar/shared'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { riderAttrs, riderHidden, riders, teams } from './schema.js'
import { generateUniqueName } from './names.js'
import { makeUniqueTeamName } from './teamNames.js'

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
const DIVISIONS: DivisionPlan[] = [
  { division: 'WT', teams: 18, roster: 14, budgetBase: 5_000_000 },
  { division: 'PRS', teams: 15, roster: 12, budgetBase: 2_000_000 },
  { division: 'CON', teams: 24, roster: 10, budgetBase: 700_000 },
]
const TARGET_POPULATION = 1600

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
}
const COUNTRIES = Object.entries(COUNTRY_WEIGHTS).flatMap(([code, w]) => Array(w).fill(code))
const PHILOSOPHIES: Philosophy[] = ['general', 'sprints', 'clasicas', 'cantera', 'equilibrado']

/**
 * Nacionalidad de los equipos por división, según la realidad. El WorldTour lo dominan las
 * potencias tradicionales; el ProSeries se reparte más; el Continental es mundial (reutiliza el
 * reparto ciclista de los corredores). Determinista por equipo desde su semilla de maillot.
 */
const WT_TEAM_COUNTRY_WEIGHTS: Record<string, number> = {
  BE: 4,
  FR: 3,
  IT: 3,
  NL: 3,
  ES: 2,
  GB: 2,
  US: 2,
  AU: 2,
  DE: 2,
  CH: 1,
  KZ: 1,
  AE: 1,
}
const PRS_TEAM_COUNTRY_WEIGHTS: Record<string, number> = {
  BE: 3,
  FR: 3,
  IT: 3,
  ES: 2,
  NL: 2,
  GB: 2,
  NO: 1,
  DK: 1,
  PT: 1,
  PL: 1,
  AT: 1,
  CZ: 1,
  US: 1,
  AU: 1,
  CO: 1,
  KZ: 1,
  TR: 1,
  IL: 1,
  JP: 1,
  SI: 1,
}
const expand = (w: Record<string, number>): string[] =>
  Object.entries(w).flatMap(([code, n]) => Array(n).fill(code))
const TEAM_COUNTRY_POOL: Record<Division, string[]> = {
  WT: expand(WT_TEAM_COUNTRY_WEIGHTS),
  PRS: expand(PRS_TEAM_COUNTRY_WEIGHTS),
  // El Continental es mundial: mismo reparto (ponderado por peso ciclista) que las nacionalidades
  // de los corredores, así que aparecen equipos de casi cualquier federación.
  CON: COUNTRIES,
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!
}

/** Nacionalidad determinista de un equipo (misma fórmula en la génesis y en el backfill). */
export function teamCountryFromSeed(jerseySeed: string, division: Division): string {
  return pick(TEAM_COUNTRY_POOL[division], seededRng(`${jerseySeed}:country`))
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
      const name = makeUniqueTeamName(seed, usedTeamNames)
      const budget = Math.round(div.budgetBase * (0.6 + 0.8 * rng()))
      const facilities = 0.9 + rng() * 0.3 // K_inst [0.90, 1.20]
      const jerseySeed = `${seed}:jersey`
      teamPlans.push({
        id,
        name,
        country: teamCountryFromSeed(jerseySeed, div.division),
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

  // Agentes libres (sin equipo) para el mercado, hasta ~1.600 corredores.
  while (riderPlans.length < TARGET_POPULATION) {
    riderPlans.push(buildRider(worldSeed, riderIndex++, 'CON', null, usedRiderNames))
  }

  return { teams: teamPlans, riders: riderPlans }
}

/** Inserta por lotes el plan del mundo. Idempotente: no hace nada si el mundo ya tiene equipos. */
export async function seedWorld(tx: Tx, worldId: string, worldSeed: string): Promise<void> {
  const existing = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(teams)
    .where(eq(teams.worldId, worldId))
  if ((existing[0]?.n ?? 0) > 0) return

  const plan = planWorld(worldSeed)

  await insertChunked(
    plan.teams.map((t) => ({
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
    plan.riders.map((r) => ({
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

  const attrValues = plan.riders.flatMap((r) =>
    ATTRIBUTES.map((attr) => ({ riderId: r.id, attr, value: r.attributes[attr] })),
  )
  await insertChunked(attrValues, 2000, (chunk) => tx.insert(riderAttrs).values(chunk))

  await insertChunked(
    plan.riders.map((r) => ({
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

/**
 * Rellena la nacionalidad de los equipos que aún no la tienen (mundos anteriores a esta columna),
 * de forma determinista desde su semilla de maillot y su división. Idempotente: una vez con país,
 * no hace nada. Se ejecuta en el tick, como la reparación de nombres duplicados.
 */
export async function backfillTeamCountries(tx: Tx, worldId: string): Promise<number> {
  const rows = await tx
    .select({ id: teams.id, division: teams.division, jerseySeed: teams.jerseySeed })
    .from(teams)
    .where(and(eq(teams.worldId, worldId), isNull(teams.country)))
  for (const t of rows) {
    await tx
      .update(teams)
      .set({ country: teamCountryFromSeed(t.jerseySeed, t.division) })
      .where(eq(teams.id, t.id))
  }
  return rows.length
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
