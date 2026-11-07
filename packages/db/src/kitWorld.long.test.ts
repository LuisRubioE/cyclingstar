import { writeFileSync } from 'node:fs'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { type KitCode, canonicalKit } from '@cyclingstar/shared'
import { and, eq, like } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFrozenStartlist } from './calendarRun.js'
import { worldHorizon } from './horizon.js'
import { KIT_ALLOWED } from './kitConflicts.generated.js'
import { kitsClash, setKit } from './kits.js'
import { kitsOn } from './kitsOn.js'
import { gameState, news, teams, tickLog, users, worlds } from './schema.js'
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
 * dos se ponen dos que chocan entre sí, que no se fuerzan. En cada carrera congelada que no es un
 * campeonato nacional, el día que sale, con sus equipos de ese día y el maillot de su primera etapa: 0
 * pares por debajo de 10 entre rivales con un NPC, y los choques entre humanos, contados.
 *
 * DESDE EL 17d se mira cada carrera el día que sale y no al final: leídas al final, tras los fichajes y los
 * equipos nuevos del cambio de temporada, las listas mezclaban en cada carrera equipos que no la corrieron
 * (la escuadra no guarda el equipo de cada corredor), y el banco contaba 2.538 pares donde el día de la
 * salida había 12. Esos 12 eran de verdad: cinco pares de equipos que la previsión no veía como rivales
 * (Grom Kolo y Phénix Course, en 8 carreras), y desde el 17d el NPC cede también ante ellos
 * (`frozenFields`, `ensureKits`). Medido en el contenedor, en una temporada entera (`KIT_WORLD_DIAS` por
 * defecto): 0, con 5 noticias de cesión de 5 equipos y 0 ejecuciones del tick sin un libre.
 *
 * `KIT_WORLD_DIAS` acorta la temporada para probar el banco en el contenedor (por defecto, 364), y
 * `KIT_WORLD_OUT` escribe las cifras en un fichero.
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
      const owned = new Set(humans)
      /**
       * EL PELOTÓN DE CADA CARRERA, EL DÍA QUE SALE (17d): la escuadra congelada no guarda el equipo de
       * cada corredor, y la lista lo toma del corredor (`readFrozenStartlist`, `riders.teamId`), así que
       * leída al final de la temporada, tras los fichajes y los equipos nuevos del cambio de temporada,
       * mezcla en cada carrera equipos que no la corrieron. Se mira cada una en cuanto ha salido, con sus
       * equipos de ese día y el maillot de su primera etapa.
       */
      const seen = new Set<string>()
      const atStart = { races: 0, pairs: 0, withNpc: [] as string[], betweenHumans: [] as string[] }
      const check = (
        tally: typeof atStart,
        raceId: string,
        teamsOf: readonly { id: string; name: string; kit: KitCode | null }[],
      ) => {
        tally.races++
        const field = teamsOf.filter((x) => x.kit !== null)
        for (const [i, a] of field.entries())
          for (const b of field.slice(i + 1)) {
            tally.pairs++
            if (!kitsClash(a.kit!, b.kit!)) continue
            const tag = `${raceId}: ${a.name} y ${b.name}`
            if (owned.has(a.id) && owned.has(b.id)) tally.betweenHumans.push(tag)
            else tally.withNpc.push(tag)
          }
      }
      for (let d = 0; d < DIAS; d++) {
        await tick(1)
        const [clock] = await t.db
          .select({ day: gameState.currentDay })
          .from(gameState)
          .where(eq(gameState.worldId, worldId))
        const day = clock?.day ?? 0
        const season = Math.floor(day / 364)
        for (const race of SEASON_CALENDAR) {
          const key = `${race.id}:s${season}`
          if (race.championshipCountry || race.startDay > day % 364 || seen.has(key)) continue
          const list = await readFrozenStartlist(t.db, worldHorizon, race, season)
          if (list === null || !list.frozen) continue
          seen.add(key)
          check(atStart, race.id, list.teams)
        }
      }
      const minutes = (performance.now() - started) / 60_000
      // lo que cuesta: las noticias de los NPC que han cedido su maillot en la temporada, una por cada vez
      // que cede (17b), y cuántos equipos distintos son: si son menos, alguno ha vuelto a ceder
      const cededNews = await t.db
        .select({ data: news.data })
        .from(news)
        .where(and(eq(news.worldId, worldId), eq(news.kind, 'kit_ceded')))
      const ceded = cededNews.length
      const cededTeams = new Set(cededNews.map((n) => (n.data as { teamId?: string }).teamId)).size
      // y las ejecuciones del tick en que alguno no encontró un maillot libre lejos de sus rivales
      // (`kitsNote`): el que cede así puede volver a ceder la noche siguiente
      const noFree = (
        await t.db
          .select({ notes: tickLog.notes })
          .from(tickLog)
          .where(like(tickLog.notes, '%sin un libre%'))
      ).length
      // y la lectura de antes, al final de la temporada, para ver cuánto la mueven los fichajes
      const atEnd = { races: 0, pairs: 0, withNpc: [] as string[], betweenHumans: [] as string[] }
      for (const race of SEASON_CALENDAR) {
        if (race.championshipCountry) continue
        const list = await readFrozenStartlist(t.db, worldHorizon, race, 0)
        if (list === null || !list.frozen) continue
        check(atEnd, race.id, list.teams)
      }
      console.info(
        `kitWorld: ${DIAS} noches en ${minutes.toFixed(1)} min; el día de la salida, ${atStart.races} carreras, ` +
          `${atStart.pairs} pares, ${atStart.withNpc.length} con un NPC por debajo de 10, ` +
          `${atStart.betweenHumans.length} entre humanos (${atStart.betweenHumans.slice(0, 5).join('; ')}); ` +
          `${ceded} noticias de NPC que ceden su maillot, de ${cededTeams} equipos; ` +
          `${noFree} ejecuciones del tick con alguno sin un libre; ` +
          `leídas al final, ${atEnd.races} carreras y ${atEnd.withNpc.length} con un NPC`,
      )
      if (process.env.KIT_WORLD_OUT !== undefined)
        writeFileSync(
          process.env.KIT_WORLD_OUT,
          JSON.stringify(
            {
              dias: DIAS,
              minutes,
              ceded,
              cededTeams,
              noFree,
              atStart,
              atEnd: { ...atEnd, withNpc: atEnd.withNpc.length },
            },
            null,
            1,
          ),
        )
      expect(atStart.races).toBeGreaterThan(0)
      expect(atStart.withNpc, atStart.withNpc.slice(0, 10).join('; ')).toEqual([])
    },
    4 * 60 * 60_000,
  )
})
