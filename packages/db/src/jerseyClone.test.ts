import { and, desc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getCastIdentities } from './castIdentities.js'
import { removeJerseyClones } from './jerseyClone.js'
import { teams, tickLog, worlds } from './schema.js'
import { updateOwnedTeam } from './teamControl.js'
import { type TestDb, startTestDb } from './testDb.js'
import { runTick } from './tick.js'
import { reconcileTeams, seedWorld, teamIndexFromSeed } from './world.js'

/**
 * EL CLON DEL MAILLOT (E3, docs/visual.md §8.9 y §17.3; PR 1). `seedWorld` corre en cada tick y reconoce
 * los equipos por su `jersey_seed`; hasta la 0050, cambiar el maillot la reescribía y el tick siguiente
 * creaba un NPC con la semilla vieja (de 219 equipos y 3.900 corredores a 220 y 3.912, mapa 03 §2.2).
 * Aquí, contra PGlite y con el mundo de la génesis entero: el arreglo, el borrado del clon que ya haya y
 * el equipo con la semilla cambiada que pierde su dueño.
 */

const SEED = 'semilla-clon'
const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const NOW = new Date('2026-01-01T00:00:00.000Z')
const USER_A = '00000000-0000-4000-8000-00000000000a'
const USER_B = '00000000-0000-4000-8000-00000000000b'

describe('db: el clon del maillot (E3, §8.9; PR 1)', () => {
  let t: TestDb
  let worldId: string

  const tick = () =>
    t.detached((url) =>
      runTick(url, {
        now: NOW,
        msPerGameDay: SIX_HOURS_MS,
        worldSeed: SEED,
        engineVersion: 1,
        forceDays: 0,
        timelineRecord: 'off',
      }),
    )

  const counts = async () => {
    const [tm] = await t.client<{ n: number }[]>`
      select count(*)::int as n from teams where world_id = ${worldId}`
    const [rd] = await t.client<{ n: number }[]>`
      select count(*)::int as n from riders where world_id = ${worldId}`
    return { teams: tm?.n, riders: rd?.n }
  }

  /** El equipo que lleva hoy la semilla de génesis de esa división e índice. */
  const genesisTeam = async (division: 'WT' | 'PRS' | 'CON', index: number) => {
    const rows = await t.db
      .select({
        id: teams.id,
        name: teams.name,
        country: teams.country,
        jerseySeed: teams.jerseySeed,
        jerseyStyleSeed: teams.jerseyStyleSeed,
      })
      .from(teams)
      .where(
        and(
          eq(teams.worldId, worldId),
          eq(teams.jerseySeed, `${SEED}:team:${division}:${index}:jersey`),
        ),
      )
    expect(rows).toHaveLength(1)
    return rows[0]!
  }

  const lastTickNote = async () =>
    (
      await t.db
        .select({ notes: tickLog.notes })
        .from(tickLog)
        .orderBy(desc(tickLog.startedAt))
        .limit(1)
    )[0]?.notes

  /** La semilla con que se dibuja el equipo, por uno de los lectores de verdad (el del reparto). */
  const servedSeed = async (teamId: string) =>
    (await getCastIdentities(t.db, [], [teamId])).teams.get(teamId)?.jerseySeed

  beforeAll(async () => {
    t = await startTestDb()
    await tick()
    const w = await t.db.select({ id: worlds.id }).from(worlds).limit(1)
    worldId = w[0]!.id
    await t.client`insert into users (id, email, name) values
      (${USER_A}, 'dueno-a@example.com', 'Dueño A'), (${USER_B}, 'dueno-b@example.com', 'Dueño B')`
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('teamIndexFromSeed da el índice de una semilla de génesis y null para cualquier otra', () => {
    expect(teamIndexFromSeed('w:team:CON:12:jersey')).toBe(12)
    expect(teamIndexFromSeed('w:team:WT:0:jersey')).toBe(0)
    // Antes daba 0 a todas estas: el equipo se renombraba como el índice 0 de su división.
    expect(teamIndexFromSeed('3f9a2c1e-0000-4000-8000-000000000001:jersey:3')).toBeNull()
    expect(teamIndexFromSeed('w:team:XX:1:jersey')).toBeNull()
    expect(teamIndexFromSeed('w:team:PRS:2:jersey:extra')).toBeNull()
    expect(teamIndexFromSeed('equipacion-1')).toBeNull()
  })

  it('cambiar el maillot ya no clona el equipo: siguen 219 equipos y 3.900 corredores', async () => {
    expect(await counts()).toEqual({ teams: 219, riders: 3900 })
    // La reproducción del mapa 03 §2.2: el CON 0 con dueño, la cuarta candidata y un tick.
    const team = await genesisTeam('CON', 0)
    await t.db.update(teams).set({ ownerUserId: USER_A }).where(eq(teams.id, team.id))
    const candidate = `${team.id}:jersey:3`
    expect(await updateOwnedTeam(t.db, USER_A, { jerseySeed: candidate })).toEqual({ ok: true })
    // El maillot va a la semilla del dibujo: la de génesis, la identidad, sigue en su sitio.
    expect(await genesisTeam('CON', 0)).toMatchObject({ id: team.id, jerseyStyleSeed: candidate })
    await tick()
    expect(await counts()).toEqual({ teams: 219, riders: 3900 })
    // Y el tick no tuvo que borrar ningún clon: no nació ninguno.
    expect(await lastTickNote()).toBe('sin días pendientes')
    // La identidad no se mueve y el dibujo servido es el elegido.
    const after = await genesisTeam('CON', 0)
    expect(after.id).toBe(team.id)
    expect(after.jerseyStyleSeed).toBe(candidate)
    expect(await servedSeed(team.id)).toBe(candidate)
  }, 180_000)

  it('el clon de hoy: se borra con sus 12 corredores, el equipo conserva su dibujo y un segundo paso no hace nada', async () => {
    const team = await genesisTeam('CON', 1)
    const chosen = `${team.id}:jersey:5`
    // Lo que hacía `updateOwnedTeam` antes de la 0050: la semilla elegida en `jersey_seed`…
    await t.db
      .update(teams)
      .set({ ownerUserId: USER_B, jerseySeed: chosen })
      .where(eq(teams.id, team.id))
    // …y lo que hacía después el tick: `seedWorld` echa en falta la semilla de génesis y crea el NPC.
    await t.db.transaction((tx) => seedWorld(tx, worldId, SEED))
    expect(await counts()).toEqual({ teams: 220, riders: 3912 })
    const clone = await genesisTeam('CON', 1)
    expect(clone.id).not.toBe(team.id)
    expect(clone.name).toBe(team.name)

    const note = await t.db.transaction((tx) => removeJerseyClones(tx, worldId))
    expect(note).toBe(`jersey clone removed: ${clone.name} (${clone.id}), 12 riders`)
    expect(await counts()).toEqual({ teams: 219, riders: 3900 })
    // El equipo recupera su semilla de génesis y guarda la suya para el dibujo, que no cambia.
    const restored = await genesisTeam('CON', 1)
    expect(restored.id).toBe(team.id)
    expect(restored.jerseyStyleSeed).toBe(chosen)
    expect(await servedSeed(team.id)).toBe(chosen)

    // Idempotente: ni el paso ni el tick siguiente vuelven a crear ni a borrar nada.
    expect(await t.db.transaction((tx) => removeJerseyClones(tx, worldId))).toBeNull()
    await tick()
    expect(await counts()).toEqual({ teams: 219, riders: 3900 })
  }, 180_000)

  it('un equipo con la semilla cambiada que pierde su dueño ni se poda ni se renombra', async () => {
    const team = await genesisTeam('PRS', 2)
    await t.db
      .update(teams)
      .set({ jerseySeed: `${team.id}:jersey:7` })
      .where(eq(teams.id, team.id))
    await t.db.transaction((tx) => reconcileTeams(tx, worldId))
    const rows = await t.db
      .select({ name: teams.name, country: teams.country })
      .from(teams)
      .where(eq(teams.id, team.id))
    expect(rows).toEqual([{ name: team.name, country: team.country }])
    // Sin clon que le corresponda, el paso no borra nada ni deja nota (`null`, no una cadena vacía).
    expect(await t.db.transaction((tx) => removeJerseyClones(tx, worldId))).toBeNull()
    expect(await counts()).toEqual({ teams: 219, riders: 3900 })
  }, 180_000)
})
