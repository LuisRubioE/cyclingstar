import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { type KitCode, canonicalKit } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFrozenStartlist } from './calendarRun.js'
import { worldHorizon } from './horizon.js'
import { KIT_ALLOWED } from './kitConflicts.generated.js'
import { kitsClash, setKit } from './kits.js'
import { kitsOn } from './kitsOn.js'
import { teams, users, worlds } from './schema.js'
import { rivalsOf, seasonFields } from './seasonRivals.js'
import { type TestDb, startTestDb } from './testDb.js'
import { runTick } from './tick.js'

/**
 * EL MAILLOT A LO LARGO DE UNA TEMPORADA (E3, docs/visual.md §8.6, §16.2 y §16.5; PR 17b; 16-c, D-24),
 * DE NOCHE: solo con `CS_BANCOS=1`, en el trabajo `Bancos de noche` de `cobertura.yml`. Los rivales con
 * que se traduce son una previsión (los admitidos se ordenan por el presupuesto del día en que se congela
 * la escuadra), así que lo que vale es el pelotón que de verdad se congela. El mundo de la génesis corre
 * su temporada noche a noche, un tick por día como en producción, con tres equipos de jugador: uno se
 * pone un maillot que choca con el de un NPC rival, que tiene que ceder esa noche (DD-08), y los otros
 * dos se ponen dos que chocan entre sí, que no se fuerzan. Al final, en cada carrera congelada que no es
 * un campeonato nacional, con el maillot que cada equipo llevaba el día de la salida: 0 pares por debajo
 * de 10 entre rivales con un NPC, y los choques entre humanos, contados.
 *
 * `KIT_WORLD_DIAS` acorta la temporada para probar el banco en el contenedor (por defecto, 364).
 */

const NIGHTLY = process.env.CS_BANCOS === '1'
const DIAS = Number(process.env.KIT_WORLD_DIAS ?? '364')
const SEED = 'semilla-temporada-maillots'
const NOW = new Date('2026-01-01T00:00:00.000Z')
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`

describe.runIf(NIGHTLY)('db: el maillot a lo largo de una temporada (nocturno)', () => {
  let t: TestDb
  let worldId = ''
  /** Los tres de jugador: el que hace ceder a un NPC y los dos que chocan entre sí. */
  let humans: readonly string[] = []

  const tick = (forceDays: number) =>
    t.detached((url) =>
      runTick(url, {
        now: NOW,
        msPerGameDay: 6 * 60 * 60 * 1000,
        worldSeed: SEED,
        engineVersion: 1,
        forceDays,
        timelineRecord: 'off',
      }),
    )

  beforeAll(async () => {
    t = await startTestDb()
    await tick(0)
    const [w] = await t.db.select({ id: worlds.id }).from(worlds)
    worldId = w!.id
    const ids = (
      await t.db.select({ id: teams.id }).from(teams).where(eq(teams.worldId, worldId))
    ).map((r) => r.id)
    const rivals = rivalsOf(await seasonFields(t.db, worldId, 0))
    const byRivals = [...ids].sort(
      (a, b) => (rivals.get(b)?.size ?? 0) - (rivals.get(a)?.size ?? 0),
    )
    const kits = await kitsOn(t.db, ids, 1)
    const worn = new Set([...kits.values()].map(canonicalKit))
    /** Un maillot que nadie lleva y que choca con el de `team`. */
    const clashingWith = (team: string): KitCode | undefined =>
      KIT_ALLOWED.find((c) => !worn.has(canonicalKit(c)) && kitsClash(c, kits.get(team)!))
    // el primero, el que más rivales tiene, con uno que choca con el de un NPC rival suyo
    const pusher = byRivals[0]!
    const npc = [...(rivals.get(pusher)?.keys() ?? [])].find((r) => clashingWith(r) !== undefined)!
    const pushKit = clashingWith(npc)!
    worn.add(canonicalKit(pushKit))
    // y dos rivales entre sí, el segundo con uno que choca con el del tercero
    let pair = ''
    let partner = ''
    let pairKit: KitCode | undefined
    for (const a of byRivals.slice(1)) {
      if (a === npc) continue
      const b = [...(rivals.get(a)?.keys() ?? [])].find(
        (x) => x !== pusher && x !== npc && clashingWith(x) !== undefined,
      )
      if (b === undefined) continue
      pair = a
      partner = b
      pairKit = clashingWith(b)
      break
    }
    humans = [pusher, pair, partner]
    for (const [i, team] of humans.entries()) {
      const id = idDe(900 + i)
      await t.db.insert(users).values({ id, email: `temporada-${i}@example.com`, name: `J${i}` })
      await t.db.update(teams).set({ ownerUserId: id }).where(eq(teams.id, team))
    }
    await t.db.transaction(async (tx) => {
      await setKit(tx, pusher, pushKit, 'manager', 1)
      await setKit(tx, pair, pairKit!, 'manager', 1)
    })
  }, 600_000)

  afterAll(async () => {
    await t?.close()
  })

  it(
    `${DIAS} noches: 0 pares por debajo de 10 entre rivales con un NPC; los choques entre humanos, contados`,
    async () => {
      const started = performance.now()
      for (let d = 0; d < DIAS; d++) await tick(1)
      const minutes = (performance.now() - started) / 60_000
      const owned = new Set(humans)
      let races = 0
      let pairs = 0
      const withNpc: string[] = []
      const betweenHumans: string[] = []
      for (const race of SEASON_CALENDAR) {
        if (race.championshipCountry) continue
        const list = await readFrozenStartlist(t.db, worldHorizon, race, 0)
        if (list === null || !list.frozen) continue
        races++
        const field = list.teams.filter((x) => x.kit !== null)
        for (const [i, a] of field.entries())
          for (const b of field.slice(i + 1)) {
            pairs++
            if (!kitsClash(a.kit!, b.kit!)) continue
            const tag = `${race.id}: ${a.name} y ${b.name}`
            if (owned.has(a.id) && owned.has(b.id)) betweenHumans.push(tag)
            else withNpc.push(tag)
          }
      }
      console.info(
        `kitWorld: ${DIAS} noches en ${minutes.toFixed(1)} min; ${races} carreras congeladas, ${pairs} pares; ` +
          `${withNpc.length} con un NPC por debajo de 10; ${betweenHumans.length} entre humanos ` +
          `(${betweenHumans.slice(0, 5).join('; ')})`,
      )
      expect(races).toBeGreaterThan(0)
      expect(withNpc, withNpc.slice(0, 10).join('; ')).toEqual([])
    },
    4 * 60 * 60_000,
  )
})
