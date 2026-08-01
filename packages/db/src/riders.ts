import { type Attribute, ATTRIBUTES, type Gender, type Vocation } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { gameState, riderAttrs, riderHidden, riders } from './schema.js'

/**
 * Servicios de datos del ciclista (Paso 15). La creación inserta el corredor, sus atributos
 * visibles y su genoma oculto en una transacción. Los atributos ocultos (techos, talento...)
 * nunca se exponen a la web.
 */

export interface RiderHiddenInput {
  talent: number
  fragility: number
  peakAge: number
  declineAge: number
  ceilings: Record<Attribute, number>
}

export interface CreateRiderInput {
  worldId: string
  userId: string
  name: string
  country: string
  gender: Gender
  archetype: Vocation
  birthSeason: number
  faceSeed: string
  attributes: Record<Attribute, number>
  hidden: RiderHiddenInput
}

export interface PublicRider {
  id: string
  name: string
  country: string
  gender: Gender
  archetype: Vocation
  birthSeason: number
  /** Valores internos [1,99]; la web solo los renderiza como estrellas, nunca como número. */
  attributes: Record<Attribute, number>
}

/** Mundo actual y día de juego (o null si aún no hubo génesis). */
export async function getCurrentWorld(
  db: Database,
): Promise<{ worldId: string; currentDay: number } | null> {
  const rows = await db
    .select({ worldId: gameState.worldId, currentDay: gameState.currentDay })
    .from(gameState)
    .limit(1)
  const row = rows[0]
  return row ? { worldId: row.worldId, currentDay: row.currentDay } : null
}

/** Crea un corredor con sus atributos y su genoma oculto (una transacción). */
export async function createRider(db: Database, input: CreateRiderInput): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(riders)
      .values({
        worldId: input.worldId,
        userId: input.userId,
        name: input.name,
        country: input.country,
        gender: input.gender,
        birthSeason: input.birthSeason,
        archetype: input.archetype,
        faceSeed: input.faceSeed,
      })
      .returning({ id: riders.id })

    const rider = inserted[0]
    if (!rider) {
      throw new Error('no se pudo crear el corredor')
    }

    await tx
      .insert(riderAttrs)
      .values(
        ATTRIBUTES.map((attr) => ({ riderId: rider.id, attr, value: input.attributes[attr] })),
      )

    await tx.insert(riderHidden).values({
      riderId: rider.id,
      talent: input.hidden.talent,
      ceilings: input.hidden.ceilings,
      fragility: input.hidden.fragility,
      peakAge: input.hidden.peakAge,
      declineAge: input.hidden.declineAge,
    })

    return { id: rider.id }
  })
}

/** El ciclista del usuario (con atributos visibles), o null si aún no ha creado uno. */
export async function getRiderForUser(db: Database, userId: string): Promise<PublicRider | null> {
  const riderRows = await db.select().from(riders).where(eq(riders.userId, userId)).limit(1)
  const rider = riderRows[0]
  if (!rider) return null

  const attrRows = await db.select().from(riderAttrs).where(eq(riderAttrs.riderId, rider.id))
  const attributes = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) attributes[attr] = 0
  for (const row of attrRows) attributes[row.attr] = row.value

  return {
    id: rider.id,
    name: rider.name,
    country: rider.country,
    gender: rider.gender,
    archetype: rider.archetype,
    birthSeason: rider.birthSeason,
    attributes,
  }
}
