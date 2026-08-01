import { generateRiderGenome } from '@cyclingstar/engine'
import {
  type Attribute,
  ATTRIBUTES,
  VOCATIONS,
  type Vocation,
  seededRng,
} from '@cyclingstar/shared'
import { drizzle } from 'drizzle-orm/postgres-js'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { generateName } from './names.js'
import { raceRosters, riderAttrs, riderHidden, riders } from './schema.js'

/**
 * NPC de relleno para la vuelta de prueba (Paso 32). Da un pelotón creíble a las etapas mientras
 * llega la génesis completa del mundo (Paso 33). Determinista desde `worldSeed`: el mismo mundo
 * genera el mismo pelotón. Los NPC no tienen dueño (userId = null).
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const TEST_TOUR_ID = 'test-tour'
/** Países con datos de nombres, para repartir el pelotón NPC. */
const FILLER_COUNTRIES = ['FR', 'IT', 'ES', 'BE', 'GB', 'DE', 'NL', 'US', 'CO', 'DK']
/** Forma inicial de un neoprofesional (SPEC 4): arranca en CTL=ATL=45. */
const INITIAL_LOAD = 45

export interface FillerSpec {
  name: string
  country: string
  gender: 'M'
  archetype: Vocation
  birthSeason: number
  faceSeed: string
  attributes: Record<Attribute, number>
  hidden: {
    talent: number
    fragility: number
    peakAge: number
    declineAge: number
    ceilings: Record<Attribute, number>
  }
}

/** Genera el genoma y el nombre de un NPC de relleno, determinista desde el mundo y su índice. */
export function fillerRiderSpec(
  worldSeed: string,
  index: number,
  currentSeason: number,
): FillerSpec {
  const seed = `${worldSeed}:npc:${index}`
  const archetype = VOCATIONS[index % VOCATIONS.length] ?? 'fondo'
  const country = FILLER_COUNTRIES[index % FILLER_COUNTRIES.length] ?? 'FR'
  const genome = generateRiderGenome(seed, archetype)
  const name = generateName(`${seed}:name`, { country, gender: 'M' }).fullName

  // A diferencia de un neoprofesional creado por el usuario, un NPC de relleno es un profesional
  // ya hecho: sus atributos están cerca de su techo (madurez 0.72-0.94), de modo que el pelotón
  // tiene sprinters, escaladores y cronistas de verdad y las etapas no las barre un solo corredor.
  const maturity = 0.72 + seededRng(`${seed}:mat`)() * 0.22
  const attributes = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) {
    const ceiling = genome.hidden.ceilings[attr]
    // La táctica se aprende corriendo (SPEC 3.6): arranca más baja aunque el techo sea alto.
    const factor = attr === 'TAC' ? maturity * 0.7 : maturity
    attributes[attr] = Math.min(ceiling, Math.max(20, Math.round(ceiling * factor)))
  }

  return {
    name,
    country,
    gender: 'M',
    archetype,
    // Edades 20-27 (debut a los 20; envejece un año por temporada).
    birthSeason: currentSeason - (index % 8),
    faceSeed: `${seed}:face`,
    attributes,
    hidden: genome.hidden,
  }
}

/**
 * Asegura que la vuelta de prueba tenga un pelotón de al menos `target` corredores en este mundo,
 * creando NPC de relleno y convocándolos. Idempotente: no recrea si ya hay suficientes.
 */
export async function ensureTestTourField(
  tx: Tx,
  worldId: string,
  worldSeed: string,
  target: number,
  currentSeason: number,
): Promise<void> {
  const countRows = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(raceRosters)
    .where(eq(raceRosters.raceId, TEST_TOUR_ID))
  const current = countRows[0]?.n ?? 0
  if (current >= target) return

  // Cuántos NPC ya existen en el mundo, para no repetir índices al rellenar más de una vez.
  const npcRows = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNull(riders.userId)))
  let index = npcRows[0]?.n ?? 0

  for (let created = 0; current + created < target; created++, index++) {
    const spec = fillerRiderSpec(worldSeed, index, currentSeason)
    const inserted = await tx
      .insert(riders)
      .values({
        worldId,
        userId: null,
        name: spec.name,
        country: spec.country,
        gender: spec.gender,
        birthSeason: spec.birthSeason,
        archetype: spec.archetype,
        faceSeed: spec.faceSeed,
        ctl: INITIAL_LOAD,
        atl: INITIAL_LOAD,
        morale: 60,
      })
      .returning({ id: riders.id })
    const rider = inserted[0]
    if (!rider) continue

    await tx
      .insert(riderAttrs)
      .values(ATTRIBUTES.map((attr) => ({ riderId: rider.id, attr, value: spec.attributes[attr] })))
    await tx.insert(riderHidden).values({
      riderId: rider.id,
      talent: spec.hidden.talent,
      ceilings: spec.hidden.ceilings,
      fragility: spec.hidden.fragility,
      peakAge: spec.hidden.peakAge,
      declineAge: spec.hidden.declineAge,
    })
    await tx
      .insert(raceRosters)
      .values({ raceId: TEST_TOUR_ID, riderId: rider.id })
      .onConflictDoNothing()
  }
}
