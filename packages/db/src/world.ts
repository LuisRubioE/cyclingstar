import { randomUUID } from 'node:crypto'
import { type Division, type NpcGenome, generateNpcRider, sampleNpcAge } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  VOCATIONS,
  type Vocation,
  seededRng,
} from '@cyclingstar/shared'
import { eq, sql } from 'drizzle-orm'
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
}
const COUNTRIES = Object.entries(COUNTRY_WEIGHTS).flatMap(([code, w]) => Array(w).fill(code))
const PHILOSOPHIES: Philosophy[] = ['general', 'sprints', 'clasicas', 'cantera', 'equilibrado']

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!
}

export interface TeamPlan {
  id: string
  name: string
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
      teamPlans.push({
        id,
        name,
        division: div.division,
        budget,
        philosophy: pick(PHILOSOPHIES, rng),
        jerseySeed: `${seed}:jersey`,
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
