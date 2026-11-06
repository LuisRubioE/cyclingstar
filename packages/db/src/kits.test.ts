import {
  DAYS_PER_SEASON,
  KIT_CODES,
  KIT_FIGURES,
  KIT_MIN_DISTANCE,
  KIT_SECONDARIES,
  type KitCode,
  canonicalKit,
  nearestKitColor,
  parseKit,
} from '@cyclingstar/shared'
import { VISIONS } from '@cyclingstar/shared/colorMath'
import { legacyJerseyStyle } from '@cyclingstar/shared/legacyJersey'
import { TransactionRollbackError, and, count, eq, inArray, isNull } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { KIT_ALLOWED, KIT_CONFLICTS } from './kitConflicts.generated.js'
import { kitRaster, rasterDistance } from './kitDistance.js'
import {
  type KitHistoryRow,
  KitTakenError,
  assignKits,
  checkKit,
  emitKitNews,
  ensureKits,
  frozenFields,
  kitChangeAllowed,
  kitChangesCounted,
  kitsBySeed,
  kitsClash,
  revertKit,
  setKit,
} from './kits.js'
import { kitOn, kitsOn, stateKitsOn } from './kitsOn.js'
import { gameState, news, raceRosters, riders, teamKits, teams, users, worlds } from './schema.js'
import { type SeasonRivals, rivalsOf, seasonFields } from './seasonRivals.js'
import { releaseUserToWorld, takeOverBotTeam } from './teamControl.js'
import { type TestDb, startTestDb } from './testDb.js'
import { runTick } from './tick.js'
import type { Queryable } from './titles.js'

/**
 * LOS MAILLOTS, EN LA BASE (E3, docs/visual.md §8.2, §8.5 a §8.8 y §16.2; PR 16a), contra PGlite y el
 * mundo de la génesis entero. Primero, **la puerta de D-00e**: la traducción de `ensureKits` da maillot
 * a todos los equipos y ninguna carrera de la temporada 0 (las que no son nacionales) junta a dos con
 * maillots a menos de 10 a 28 px en alguna de las cuatro visiones, ni dos equipos del mundo llevan el
 * mismo canónico. Escribe además los pares de cada carrera en grises, cuántos maillots quedan permitidos
 * y cuántos equipos conservan su color base. Si la puerta fallara, el PR repite la traducción con los
 * equipos de esas carreras primero (`assignKits`, `first`) y hace ceder a sus NPC; y si siguiera fallando,
 * el caso pasa a `it.todo` con su cifra y abre DD-24 con la cuenta de cuántas carreras fallarían sin cada
 * color y cada figura, que aquí corre solo de noche (`CS_BANCOS=1`, 16-i). Después, el resto de
 * `kits.ts`: la escritura con su historia, el maillot ocupado, el NPC que cede, el veredicto y la
 * reversión de E9.
 *
 * Desde el 17b la traducción la hace el tick (`ensureKits` tras `seedWorld` y `backfillRosters`), y la
 * génesis del `beforeAll` ya sale traducida: la puerta la deshace y la rehace para medirla sola, y el
 * caso del tick mira las noticias de un mundo de antes del 17b, como el de producción.
 */

const SEED = 'semilla-maillots'
const NOW = new Date('2026-01-01T00:00:00.000Z')
const NIGHTLY = process.env.CS_BANCOS === '1'
const USER = '00000000-0000-4000-8000-00000000016a'
/** El humano de la prueba del 17d, suyo para no depender de la de DD-08. */
const USER_17D = '00000000-0000-4000-8000-00000000017d'
const USER_17D_2 = '00000000-0000-4000-8000-0000000017d2'
const r1 = (x: number) => Math.round(x * 10) / 10

/** Las carreras de un reparto con algún par de rivales cuyos maillots chocan. */
function failingRaces(
  fields: ReadonlyMap<string, readonly string[]>,
  kits: ReadonlyMap<string, KitCode>,
): string[] {
  const out: string[] = []
  for (const [race, field] of fields) {
    const clash = field.some((a, i) =>
      field.slice(i + 1).some((b) => kitsClash(kits.get(a)!, kits.get(b)!)),
    )
    if (clash) out.push(race)
  }
  return out
}

describe('db: los maillots (E3, §8.5 a §8.8)', () => {
  let t: TestDb
  let worldId: string
  let fields: ReadonlyMap<string, readonly string[]>
  let rivals: SeasonRivals
  let teamIds: string[]

  beforeAll(async () => {
    t = await startTestDb()
    await t.detached((url) =>
      runTick(url, {
        now: NOW,
        msPerGameDay: 6 * 60 * 60 * 1000,
        worldSeed: SEED,
        engineVersion: 1,
        forceDays: 0,
        timelineRecord: 'off',
      }),
    )
    const [w] = await t.db.select({ id: worlds.id }).from(worlds)
    worldId = w!.id
    fields = await seasonFields(t.db, worldId, 0)
    rivals = rivalsOf(fields)
    teamIds = (
      await t.db.select({ id: teams.id }).from(teams).where(eq(teams.worldId, worldId))
    ).map((r) => r.id)
  }, 300_000)

  afterAll(async () => {
    await t?.close()
  })

  /** El mundo de antes del 17b, sin maillots: como el de producción la noche del despliegue. */
  const withoutKits = async () => {
    await t.db.delete(teamKits).where(inArray(teamKits.teamId, teamIds))
    await t.db.update(teams).set({ kitCanonical: null }).where(eq(teams.worldId, worldId))
  }
  /** Las noticias del maillot del mundo. */
  const kitNews = () =>
    t.db
      .select({ kind: news.kind, gameDay: news.gameDay, riderId: news.riderId, data: news.data })
      .from(news)
      .where(and(eq(news.worldId, worldId), inArray(news.kind, ['kit_new', 'kit_ceded'])))
  /** Un tick que no avanza el día: lo de antes del bucle, la génesis, las reparaciones y los maillots. */
  const tickWithoutDays = () =>
    t.detached((url) =>
      runTick(url, {
        now: NOW,
        msPerGameDay: 6 * 60 * 60 * 1000,
        worldSeed: SEED,
        engineVersion: 1,
        forceDays: 0,
        timelineRecord: 'off',
      }),
    )

  /** Los rivales de hoy, de la base: un equipo con dueño corre su calendario natural y cambia los suyos. */
  const currentRivals = async (q: Queryable = t.db) => rivalsOf(await seasonFields(q, worldId, 0))

  type Tx = Parameters<Parameters<TestDb['db']['transaction']>[0]>[0]
  /** Lo que se prueba dentro y se deshace después, para no tocar el mundo de los demás casos. */
  const rolledBack = (fn: (tx: Tx) => Promise<void>) =>
    t.db
      .transaction(async (tx) => {
        await fn(tx)
        tx.rollback()
      })
      .catch((e: unknown) => {
        if (!(e instanceof TransactionRollbackError)) throw e
      })

  /** Lo que se mira dentro de un punto de guardado y se deshace después, sin salir de la transacción. */
  const probe = async <T>(tx: Tx, fn: (sp: Tx) => Promise<T>) => {
    const box: { value?: T } = {}
    await tx
      .transaction(async (sp) => {
        box.value = await fn(sp)
        sp.rollback()
      })
      .catch((e: unknown) => {
        if (!(e instanceof TransactionRollbackError)) throw e
      })
    return box.value
  }
  /** El reloj del mundo. */
  const atDay = (q: Queryable, day: number) =>
    q.update(gameState).set({ currentDay: day }).where(eq(gameState.worldId, worldId))
  /** Los corredores de un equipo, por su id. */
  const ridersOf = async (q: Queryable, team: string) =>
    (
      await q
        .select({ id: riders.id })
        .from(riders)
        .where(eq(riders.teamId, team))
        .orderBy(riders.id)
    ).map((r) => r.id)
  /**
   * Para montar una escena del 17d: los rivales previstos, los maillots del día `day` y sus canónicos, y
   * `hidden`, un maillot libre que choca con `kit` y con ninguno de los rivales previstos de `team`: lo que
   * la previsión no ve.
   */
  const sceneOf = async (q: Queryable, day: number) => {
    const now = await currentRivals(q)
    const kits = await kitsOn(q, teamIds, day)
    const worn = new Set([...kits.values()].map(canonicalKit))
    const hidden = (team: string, kit: KitCode) =>
      KIT_ALLOWED.find(
        (k) =>
          !worn.has(canonicalKit(k)) &&
          kitsClash(k, kit) &&
          ![...(now.get(team)?.keys() ?? [])].some((r) => kitsClash(k, kits.get(r)!)),
      )
    return { now, kits, worn, hidden }
  }

  /** Un `halves` de dos bases que nadie lleva, escrito al revés de su canónico. */
  const mirroredHalves = (worn: ReadonlySet<string>): KitCode => {
    const code = KIT_CODES.find((c) => {
      const kit = parseKit(c)
      return (
        kit?.figure === 'halves' &&
        canonicalKit(c) !== c &&
        !worn.has(canonicalKit(c)) &&
        !['yellow', 'white'].includes(kit.secondary)
      )
    })
    if (code === undefined) throw new Error('no queda ningún halves libre')
    return code
  }

  it('la puerta de D-00e: la génesis traducida, 0 carreras con un par por debajo de 10 y 0 canónicos repetidos', async () => {
    // la génesis ya la tradujo el tick (17b): se deshace para medir la traducción sola
    const fromTick = await kitsOn(t.db, teamIds, 1)
    expect(fromTick.size).toBe(teamIds.length)
    await withoutKits()
    const started = performance.now()
    const report = await t.db.transaction((tx) => ensureKits(tx, worldId))
    const seconds = (performance.now() - started) / 1000
    expect(report.translated).toBe(teamIds.length)
    const kits = await kitsOn(t.db, teamIds, 1)
    expect(kits.size).toBe(teamIds.length)
    expect(kits).toEqual(fromTick) // la del tick, la misma: la traducción no depende de quién la pida
    expect(await kitsOn(t.db, teamIds, 0)).toEqual(new Map()) // vale desde mañana
    expect(report.changed).toHaveLength(teamIds.length)
    expect(new Set(report.changed.map((c) => c.why))).toEqual(new Set(['translated']))
    expect(new Set([...kits.values()].map(canonicalKit)).size).toBe(kits.size)
    for (const kit of kits.values()) expect(KIT_ALLOWED).toContain(kit)

    const failing = failingRaces(fields, kits)
    // lo que se escribe: la distancia entre rivales, los pares en grises, los permitidos y el color base
    let pairs = 0
    let grayPairs = 0
    const racesWithGray = new Set<string>()
    const distances: number[] = []
    for (const [race, field] of fields)
      for (const [i, a] of field.entries())
        for (const b of field.slice(i + 1)) {
          const ra = kitRaster({ kind: 'kit', code: kits.get(a)! }, 28)
          const rb = kitRaster({ kind: 'kit', code: kits.get(b)! }, 28)
          distances.push(Math.min(...VISIONS.map((v) => rasterDistance(ra, rb, v))))
          pairs++
          if (rasterDistance(ra, rb, 'gray') < KIT_MIN_DISTANCE) {
            grayPairs++
            racesWithGray.add(race)
          }
        }
    distances.sort((x, y) => x - y)
    const rows = await t.db
      .select({ id: teams.id, seed: teams.jerseySeed })
      .from(teams)
      .where(eq(teams.worldId, worldId))
    const keptBase = rows.filter((r) => {
      const look = legacyJerseyStyle(r.seed)
      return parseKit(kits.get(r.id)!)?.base === nearestKitColor(look.base, 'base')
    }).length
    console.info(
      `kits: la traducción, ${seconds.toFixed(1)} s; ${fields.size} carreras, ${pairs} pares de rivales; ` +
        `${failing.length} carreras con un par por debajo de 10; el par más cercano a ${r1(distances[0]!)} ` +
        `(percentil 5, ${r1(distances[Math.floor(distances.length * 0.05)]!)}); en grises, ${grayPairs} pares ` +
        `por debajo de 10 en ${racesWithGray.size} carreras; ${KIT_ALLOWED.length} permitidos, ` +
        `${new Set(KIT_ALLOWED.map(canonicalKit)).size} distintos; ${keptBase} de ${rows.length} equipos ` +
        `conservan su color base; ${report.clashes} sin un libre lejos de sus rivales`,
    )
    expect(failing, failing.join(', ')).toEqual([])
    expect(report.clashes).toBe(0)
  }, 300_000)

  it('el tick (17b): da maillot a los 219, una noticia por equipo cuyo maillot cambia, y el segundo no cambia nada', async () => {
    // en la génesis, ninguna: el mundo acababa de nacer y sus equipos nacen con su maillot
    expect(await kitNews()).toEqual([])
    const translated = await kitsOn(t.db, teamIds, 1)
    await withoutKits()
    // el primer tick tras el despliegue, sin días que correr: lo que añade la traducción (17b)
    const started = performance.now()
    await tickWithoutDays()
    const seconds = (performance.now() - started) / 1000
    const kits = await kitsOn(t.db, teamIds, 1)
    expect(kits).toEqual(translated)
    const written = await kitNews()
    expect(written).toHaveLength(teamIds.length)
    for (const n of written) {
      const data = n.data as { teamId: string; kit: string }
      expect(n).toMatchObject({ kind: 'kit_new', gameDay: 1, riderId: null })
      expect(data.kit).toBe(kits.get(data.teamId))
    }
    expect(new Set(written.map((n) => (n.data as { teamId: string }).teamId))).toEqual(
      new Set(teamIds),
    )
    console.info(
      `kits: el primer tick con la traducción, ${seconds.toFixed(1)} s, con ${written.length} noticias`,
    )
    // el segundo, nada: ni una fila de maillot ni una noticia más
    const rows = async () =>
      (
        await t.db.select({ n: count() }).from(teamKits).where(inArray(teamKits.teamId, teamIds))
      )[0]!.n
    const before = await rows()
    await tickWithoutDays()
    expect(await rows()).toBe(before)
    expect(await kitNews()).toHaveLength(teamIds.length)
    await t.db.delete(news).where(eq(news.worldId, worldId))
  }, 300_000)

  it.runIf(NIGHTLY)(
    'de noche: cuántas carreras fallarían sin cada color y sin cada figura (DD-24, 16-i)',
    async () => {
      const rows = await t.db
        .select({ id: teams.id, seed: teams.jerseySeed })
        .from(teams)
        .where(eq(teams.worldId, worldId))
      const teamsIn = rows.map((r) => ({
        id: r.id,
        seed: r.seed,
        look: legacyJerseyStyle(r.seed),
      }))
      const without: Record<string, number> = {}
      for (const color of KIT_SECONDARIES) {
        const allowed = KIT_ALLOWED.filter((c) => !c.split('.').slice(1).includes(color))
        const { kits } = assignKits({
          teams: teamsIn,
          rivals,
          worn: new Map(),
          mode: 'translate',
          allowed,
        })
        without[color] = failingRaces(fields, kits).length
      }
      for (const figure of KIT_FIGURES) {
        const allowed = KIT_ALLOWED.filter((c) => !c.startsWith(`${figure}.`))
        const { kits } = assignKits({
          teams: teamsIn,
          rivals,
          worn: new Map(),
          mode: 'translate',
          allowed,
        })
        without[figure] = failingRaces(fields, kits).length
      }
      console.info(
        `kits: sin cada color y cada figura, las carreras que fallarían: ${JSON.stringify(without)}`,
      )
    },
    600_000,
  )

  it('kitOn y kitsOn: la fila de mayor valid_from_day que no pasa del día; null antes de la primera', async () => {
    const [id] = teamIds
    const worn = new Set([...(await kitsOn(t.db, teamIds, 1)).values()].map(canonicalKit))
    const free = KIT_ALLOWED.filter((c) => !worn.has(canonicalKit(c)))
    expect(free.length).toBeGreaterThan(2)
    await t.db.transaction(async (tx) => {
      await setKit(tx, id!, free[0]!, 'manager', 60)
      await setKit(tx, id!, free[1]!, 'manager', 70)
    })
    const first = (await kitsOn(t.db, [id!], 1)).get(id!)
    expect(await kitOn(t.db, id!, 0)).toBeNull()
    expect(await kitOn(t.db, id!, 59)).toBe(first)
    expect(await kitOn(t.db, id!, 60)).toBe(free[0])
    expect(await kitOn(t.db, id!, 69)).toBe(free[0])
    expect(await kitOn(t.db, id!, 70)).toBe(free[1])
    // el último guardado del mismo día sustituye al anterior (8-t)
    await t.db.transaction((tx) => setKit(tx, id!, free[2]!, 'manager', 70))
    expect(await kitOn(t.db, id!, 70)).toBe(free[2])
    const [canon] = await t.db
      .select({ c: teams.kitCanonical })
      .from(teams)
      .where(eq(teams.id, id!))
    expect(canon!.c).toBe(canonicalKit(free[2]!))
    // se deja como estaba para lo que sigue
    await t.db.delete(teamKits).where(and(eq(teamKits.teamId, id!), eq(teamKits.setBy, 'manager')))
    await t.db
      .update(teams)
      .set({ kitCanonical: canonicalKit(first!) })
      .where(eq(teams.id, id!))
  })

  it('stateKitsOn, el de los cuatro de estado: el de ese día; antes de la primera fila, la primera; y sin ninguna, el primero de su semilla (19e)', async () => {
    const [id, bare] = teamIds
    const first = (await kitsOn(t.db, [id!], 1)).get(id!)
    expect(first).toBeDefined()
    // la retransmisión sigue sin maillot antes de la traducción (D-23), y los de estado llevan el primero
    expect(await kitOn(t.db, id!, 0)).toBeNull()
    expect((await stateKitsOn(t.db, [id!], 0)).get(id!)).toBe(first)
    expect((await stateKitsOn(t.db, [id!], 1)).get(id!)).toBe(first)
    await rolledBack(async (tx) => {
      // un equipo sin ninguna fila, que la traducción del 17b hace imposible: el primero de su semilla
      await tx.delete(teamKits).where(eq(teamKits.teamId, bare!))
      const [row] = await tx
        .select({ seed: teams.jerseySeed })
        .from(teams)
        .where(eq(teams.id, bare!))
      const kits = await stateKitsOn(tx, [id!, bare!], 5)
      expect(kits.get(bare!)).toBe(kitsBySeed(row!.seed)[0])
      expect(kits.get(id!)).toBe(first)
      expect(await stateKitsOn(tx, [], 5)).toEqual(new Map())
    })
  })

  it('el maillot que lleva otro equipo: KitTakenError con quien lo lleva, y la transacción sigue viva', async () => {
    const kits = await kitsOn(t.db, teamIds, 1)
    const [a, b] = teamIds
    const theirs = kits.get(b!)!
    await t.db.transaction(async (tx) => {
      const error = await setKit(tx, a!, theirs, 'manager', 1).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(KitTakenError)
      expect((error as KitTakenError).takenBy.teamId).toBe(b)
      // el savepoint deja la transacción usable; y el propio maillot no le es ajeno a nadie
      await setKit(tx, b!, theirs, 'system', 1)
    })
    expect(await kitOn(t.db, a!, 1)).toBe(kits.get(a!))
  })

  it('setKit guarda el canónico: el espejo de halves es el mismo maillot, para el índice y para kit_igual', async () => {
    const kits = await kitsOn(t.db, teamIds, 1)
    const worn = new Set([...kits.values()].map(canonicalKit))
    const [a, b] = teamIds
    const mirrored = mirroredHalves(worn)
    await rolledBack(async (tx) => {
      await setKit(tx, a!, mirrored, 'manager', 1)
      const [row] = await tx
        .select({ canonical: teams.kitCanonical })
        .from(teams)
        .where(eq(teams.id, a!))
      expect(row!.canonical).toBe(canonicalKit(mirrored))
      expect(row!.canonical).not.toBe(mirrored)
      const error = await setKit(tx, b!, canonicalKit(mirrored), 'manager', 1).catch(
        (e: unknown) => e,
      )
      expect(error).toBeInstanceOf(KitTakenError)
      expect((error as KitTakenError).takenBy.teamId).toBe(a)
      // el espejo del suyo no es un cambio: kit_igual
      const verdict = await checkKit(tx, {
        worldId,
        teamId: a!,
        kit: canonicalKit(mirrored),
        today: 0,
      })
      expect(verdict.code).toBe('kit_igual')
    })
    expect(await kitOn(t.db, a!, 1)).toBe(kits.get(a!))
  })

  it('checkKit, en el orden de kitCheckCodeSchema', async () => {
    const kits = await kitsOn(t.db, teamIds, 1)
    const worn = new Set([...kits.values()].map(canonicalKit))
    const id = [...rivals.keys()].find((x) => (rivals.get(x)?.size ?? 0) > 20)!
    const check = (kit: KitCode) => checkKit(t.db, { worldId, teamId: id, kit, today: 0 })
    expect((await check(kits.get(id)!)).code).toBe('kit_igual')
    const noContrast = KIT_CODES.find((c) => !KIT_CONFLICTS[c].contrastOk)!
    expect((await check(noContrast)).code).toBe('kit_contraste')
    const reserved = KIT_CODES.find((c) => KIT_CONFLICTS[c].reserved === 'leader:gc')!
    expect(await check(reserved)).toMatchObject({ code: 'kit_reservado', reserved: 'leader:gc' })
    const other = teamIds.find((x) => x !== id)!
    expect(await check(kits.get(other)!)).toMatchObject({
      code: 'kit_ocupado',
      takenBy: { teamId: other },
    })
    // uno libre que choca con el de un rival: el veredicto nombra al rival que más carreras comparte
    const mine = rivals.get(id)!
    const clashing = KIT_ALLOWED.find(
      (c) => !worn.has(canonicalKit(c)) && [...mine.keys()].some((r) => kitsClash(c, kits.get(r)!)),
    )!
    const verdict = await check(clashing)
    expect(verdict.code).toBe('kit_se_confunde')
    const top = Math.max(
      ...[...mine].filter(([r]) => kitsClash(clashing, kits.get(r)!)).map(([, n]) => n),
    )
    expect(mine.get(verdict.conflict!.teamId)).toBe(top)
    expect(VISIONS).toContain(verdict.conflict!.vision)
    // y uno libre lejos de todos sus rivales
    const fine = KIT_ALLOWED.find(
      (c) =>
        !worn.has(canonicalKit(c)) && ![...mine.keys()].some((r) => kitsClash(c, kits.get(r)!)),
    )!
    expect(await check(fine)).toMatchObject({ ok: true, code: null })
    // y antes que todo, el cambio por temporada (18a): con dueño desde el día 0, el primero es libre y
    // el segundo de la temporada agota el cambio; lo da kit_reciente aunque el maillot valga
    await rolledBack(async (tx) => {
      await tx.update(teams).set({ managedSinceDay: 0 }).where(eq(teams.id, id))
      const second = KIT_ALLOWED.filter(
        (c) =>
          !worn.has(canonicalKit(c)) &&
          ![...mine.keys()].some((r) => kitsClash(c, kits.get(r)!)) &&
          canonicalKit(c) !== canonicalKit(fine),
      )[0]!
      // el día 1 es el de la traducción de la génesis: los dos cambios, los días 3 y 4
      await tx.insert(teamKits).values([
        { teamId: id, validFromDay: 3, kit: second, setBy: 'manager' },
        { teamId: id, validFromDay: 4, kit: second, setBy: 'manager' },
      ])
      expect(await checkKit(tx, { worldId, teamId: id, kit: fine, today: 10 })).toMatchObject({
        ok: false,
        code: 'kit_reciente',
        nextChangeDay: 364,
      })
    })
  })

  it('el NPC cede: si el maillot de un humano choca con el de un NPC rival, el NPC cambia esa noche', async () => {
    // un equipo pasa a tener dueño; con dueño corre su calendario natural, así que sus rivales se miran
    // de nuevo, como los mira ensureKits
    const [human] = [...rivals.keys()].sort(
      (a, b) => (rivals.get(b)?.size ?? 0) - (rivals.get(a)?.size ?? 0),
    )
    await t.db.insert(users).values({ id: USER, email: 'maillots@example.com', name: 'M' })
    await t.db.update(teams).set({ ownerUserId: USER }).where(eq(teams.id, human!))
    const now = await currentRivals()
    const kits = await kitsOn(t.db, teamIds, 1)
    const worn = new Set([...kits.values()].map(canonicalKit))
    // un maillot libre que choca con el de uno de sus rivales, que son todos NPC
    let kit: KitCode | undefined
    let npc = ''
    for (const rival of now.get(human!)?.keys() ?? []) {
      kit = KIT_ALLOWED.find((c) => !worn.has(canonicalKit(c)) && kitsClash(c, kits.get(rival)!))
      if (kit) {
        npc = rival
        break
      }
    }
    expect(kit).toBeDefined()
    await t.db.transaction((tx) => setKit(tx, human!, kit!, 'manager', 1))
    const report = await t.db.transaction(async (tx) => {
      const r = await ensureKits(tx, worldId)
      await emitKitNews(tx, worldId, r)
      return r
    })
    expect(report.ceded).toBeGreaterThanOrEqual(1)
    // una noticia por NPC que cede, en su diario: «New kit for …»
    const ceded = report.changed.filter((c) => c.why === 'ceded').map((c) => c.teamId)
    expect(ceded).toContain(npc)
    expect((await kitNews()).map((n) => [n.kind, (n.data as { teamId: string }).teamId])).toEqual(
      ceded.map((id) => ['kit_ceded', id]),
    )
    await t.db.delete(news).where(eq(news.worldId, worldId))
    const after = await kitsOn(t.db, teamIds, 1)
    expect(after.get(human!)).toBe(kit)
    expect(after.get(npc)).not.toBe(kits.get(npc))
    // ningún rival suyo choca ya con él, y nadie lleva el canónico de otro
    for (const rival of now.get(human!)?.keys() ?? [])
      expect(kitsClash(kit!, after.get(rival)!), rival).toBe(false)
    expect(new Set([...after.values()].map(canonicalKit)).size).toBe(after.size)
    // una segunda pasada no cambia nada
    expect(await t.db.transaction((tx) => ensureKits(tx, worldId))).toEqual({
      translated: 0,
      seeded: 0,
      ceded: 0,
      clashes: 0,
      fromDay: 1,
      changed: [],
    })
    expect(await kitsOn(t.db, teamIds, 1)).toEqual(after)
  })

  it('el NPC cede también en una escuadra ya congelada (17d): ante un humano, también si la carrera ya corre; ante otro NPC, el de menos presupuesto, si aún no ha salido; entre humanos, nadie', async () => {
    // la previsión no ve a todos: el pelotón real se completa con equipos que no estaban previstos, y la
    // escuadra se congela 14 días antes de la salida (ENROLL_LOCK_DAYS). En las de carreras que aún corren,
    // equipos que no son rivales previstos y cuyos maillots chocan: sin ellas, nadie cedería. Todo dentro de
    // una transacción que se deshace al final, para no tocar el mundo de los demás casos
    await rolledBack(async (tx) => {
      // dos humanos propios, para no depender de la prueba de arriba: los NPC con menos rivales previstos,
      // que con dueño siguen sin cruzarse con casi nadie; lo que su calendario natural cambie, lo resuelve
      // ensureKits antes de montar la escena
      const forecast = await currentRivals(tx)
      const before = await tx
        .select({ id: teams.id, owner: teams.ownerUserId })
        .from(teams)
        .where(eq(teams.worldId, worldId))
      const [human, human2] = before
        .filter((r) => r.owner === null)
        .map((r) => r.id)
        .sort((p, q) => (forecast.get(p)?.size ?? 0) - (forecast.get(q)?.size ?? 0))
      await tx.insert(users).values([
        { id: USER_17D, email: 'maillots-17d@example.com', name: 'N' },
        { id: USER_17D_2, email: 'maillots-17d-2@example.com', name: 'O' },
      ])
      await tx.update(teams).set({ ownerUserId: USER_17D }).where(eq(teams.id, human!))
      await tx.update(teams).set({ ownerUserId: USER_17D_2 }).where(eq(teams.id, human2!))
      await ensureKits(tx, worldId)
      // el segundo humano se pone uno que choca con el del primero: dos humanos no se fuerzan, y lo que haga
      // ceder a sus NPC rivales (DD-08) lo resuelve ensureKits antes de montar la escena
      const first = await sceneOf(tx, 9)
      const humanKit = KIT_ALLOWED.find(
        (k) => !first.worn.has(canonicalKit(k)) && kitsClash(k, first.kits.get(human!)!),
      )
      expect(humanKit).toBeDefined()
      await setKit(tx, human2!, humanKit!, 'manager', 1)
      await ensureKits(tx, worldId)
      const { now, kits, worn, hidden } = await sceneOf(tx, 9)
      const all = await tx
        .select({ id: teams.id, owner: teams.ownerUserId })
        .from(teams)
        .where(eq(teams.worldId, worldId))
      const npcs = all.filter((r) => r.owner === null).map((r) => r.id)
      // dos NPC que no son rivales previstos, el segundo con un maillot que choca con el del primero
      let a = ''
      let b = ''
      let clash: KitCode | undefined
      for (const p of npcs)
        for (const q of npcs)
          if (clash === undefined && p !== q && !now.get(p)?.has(q)) {
            clash = hidden(q, kits.get(p)!)
            if (clash !== undefined) [a, b] = [p, q]
          }
      expect(clash).toBeDefined()
      worn.add(canonicalKit(clash!))
      // un NPC que choca con el primer humano sin ser rival previsto de ninguno de los dos
      const c = npcs.find(
        (r) =>
          r !== a &&
          r !== b &&
          !now.get(human!)?.has(r) &&
          !now.get(human2!)?.has(r) &&
          hidden(r, kits.get(human!)!) !== undefined,
      )!
      const npcKit = hidden(c, kits.get(human!)!)
      expect(npcKit).toBeDefined()
      worn.add(canonicalKit(npcKit!))
      // y otro, más pobre que b, que corre con b otra carrera, con un maillot que choca con el de b y no con
      // el de a: con que ceda b basta, porque su maillot nuevo evita a los dos
      let x = ''
      let third: KitCode | undefined
      for (const r of npcs)
        if (third === undefined && ![a, b, c].includes(r) && !now.get(b)?.has(r)) {
          third = KIT_ALLOWED.find(
            (k) =>
              !worn.has(canonicalKit(k)) &&
              kitsClash(k, clash!) &&
              !kitsClash(k, kits.get(a)!) &&
              ![...(now.get(r)?.keys() ?? [])].some((q) => kitsClash(k, kits.get(q)!)),
          )
          if (third !== undefined) x = r
        }
      expect(third).toBeDefined()
      await tx.update(teams).set({ budget: 9_000_000 }).where(eq(teams.id, a))
      await tx.update(teams).set({ budget: 1_000_000 }).where(eq(teams.id, b))
      await tx.update(teams).set({ budget: 500_000 }).where(eq(teams.id, x))
      await setKit(tx, b, clash!, 'system', 1)
      await setKit(tx, c, npcKit!, 'system', 1)
      await setKit(tx, x, third!, 'system', 1)
      // las tres primeras que no son un nacional: la race-tachira corre del día 9 al 18, la race-pune del 19
      // al 23 y la race-down-under del 20 al 24; un corredor distinto en cada una
      const [aRider] = await ridersOf(tx, a)
      const [bRider, bOther] = await ridersOf(tx, b)
      await tx.insert(raceRosters).values([
        { raceId: 'race-tachira:s0', riderId: aRider! },
        { raceId: 'race-tachira:s0', riderId: bRider! },
        { raceId: 'race-down-under:s0', riderId: bOther! },
        { raceId: 'race-down-under:s0', riderId: (await ridersOf(tx, x))[0]! },
        { raceId: 'race-pune:s0', riderId: (await ridersOf(tx, human!))[0]! },
        { raceId: 'race-pune:s0', riderId: (await ridersOf(tx, human2!))[0]! },
        { raceId: 'race-pune:s0', riderId: (await ridersOf(tx, c))[0]! },
      ])
      // el día 25, las tres ya han terminado, y nadie cede
      await atDay(tx, 25)
      expect((await ensureKits(tx, worldId)).changed).toEqual([])
      // el día 22, la race-tachira ya ha terminado y las otras dos corren mañana, la race-pune su última
      // etapa: en ella cede el NPC ante el humano (DD-08), con un maillot que no choca con los dos; en la
      // race-down-under, b y x no se fuerzan, porque su choque se ve desde la salida
      const running = await probe(tx, async (sp) => {
        await atDay(sp, 22)
        const report = await ensureKits(sp, worldId)
        return { report, after: await kitsOn(sp, teamIds, 23) }
      })
      expect(running?.report.changed.map((r) => [r.teamId, r.why])).toEqual([[c, 'ceded']])
      for (const h of [human!, human2!])
        expect(kitsClash(running!.after.get(c)!, running!.after.get(h)!), h).toBe(false)
      // el día 8, las tres están por salir, la race-tachira mañana: cede b ante a, el más rico, y con eso
      // x ya no choca con nadie; y c ante el humano
      await atDay(tx, 8)
      const report = await ensureKits(tx, worldId)
      const byTeam = (p: readonly string[], q: readonly string[]) => (p[0]! < q[0]! ? -1 : 1)
      expect(report.changed.map((r) => [r.teamId, r.why]).sort(byTeam)).toEqual(
        [
          [b, 'ceded'],
          [c, 'ceded'],
        ].sort(byTeam),
      )
      const after = await kitsOn(tx, teamIds, 9)
      // el rico, el más pobre y los dos humanos conservan el suyo; los que ceden ya no chocan con los de
      // sus escuadras ni con sus rivales previstos
      expect(after.get(a)).toBe(kits.get(a))
      expect(after.get(x)).toBe(third)
      expect(after.get(human!)).toBe(kits.get(human!))
      expect(after.get(human2!)).toBe(humanKit)
      expect(kitsClash(after.get(b)!, after.get(a)!)).toBe(false)
      expect(kitsClash(after.get(b)!, after.get(x)!)).toBe(false)
      expect(kitsClash(after.get(c)!, after.get(human!)!)).toBe(false)
      expect(kitsClash(after.get(c)!, after.get(human2!)!)).toBe(false)
      for (const team of [b, c])
        for (const r of now.get(team)?.keys() ?? [])
          expect(kitsClash(after.get(team)!, after.get(r)!), `${team} ${r}`).toBe(false)
      // una segunda pasada no cambia nada
      expect((await ensureKits(tx, worldId)).changed).toEqual([])
    })
  })

  it('el maillot nuevo del que cede evita también a la escuadra de lo que ya corre, donde dos NPC no se fuerzan (17d)', async () => {
    // el día 22, la race-morvedre sale mañana y la race-pune corre mañana su última etapa: `Watch` pinta el
    // maillot de cada día de etapa, así que el que cede por la primera no puede chocar en la segunda
    await rolledBack(async (tx) => {
      await atDay(tx, 22)
      const { now, kits, worn, hidden } = await sceneOf(tx, 23)
      const all = await tx
        .select({ id: teams.id, owner: teams.ownerUserId })
        .from(teams)
        .where(eq(teams.worldId, worldId))
      const npcs = all.filter((r) => r.owner === null).map((r) => r.id)
      // p, rico, y q, más pobre, que no son rivales previstos: q con un maillot que choca con el de p
      let p = ''
      let q = ''
      let clash: KitCode | undefined
      for (const x of npcs)
        for (const y of npcs)
          if (clash === undefined && x !== y && !now.get(x)?.has(y)) {
            clash = hidden(y, kits.get(x)!)
            if (clash !== undefined) [p, q] = [x, y]
          }
      expect(clash).toBeDefined()
      worn.add(canonicalKit(clash!))
      await tx.update(teams).set({ budget: 9_000_000 }).where(eq(teams.id, p))
      await tx.update(teams).set({ budget: 1_000_000 }).where(eq(teams.id, q))
      await setKit(tx, q, clash!, 'system', 1)
      const [qRider, qOther] = await ridersOf(tx, q)
      await tx.insert(raceRosters).values([
        { raceId: 'race-morvedre:s0', riderId: (await ridersOf(tx, p))[0]! },
        { raceId: 'race-morvedre:s0', riderId: qRider! },
      ])
      // el que tomaría q si no corriera nada más
      const alone = await probe(tx, async (sp) => (await ensureKits(sp, worldId)).changed)
      expect(alone?.map((r) => [r.teamId, r.why])).toEqual([[q, 'ceded']])
      const wouldBe = alone![0]!.kit
      worn.add(canonicalKit(wouldBe))
      // y en la race-pune, con q, dos NPC que no son rivales previstos suyos: y, con un maillot que choca con
      // ese, y w, con uno que choca con el de y
      const y = npcs.find(
        (r) => ![p, q].includes(r) && !now.get(q)?.has(r) && hidden(r, wouldBe) !== undefined,
      )!
      const yKit = hidden(y, wouldBe)
      expect(yKit).toBeDefined()
      worn.add(canonicalKit(yKit!))
      const w = npcs.find(
        (r) => ![p, q, y].includes(r) && !now.get(y)?.has(r) && hidden(r, yKit!) !== undefined,
      )!
      const wKit = hidden(w, yKit!)
      expect(wKit).toBeDefined()
      await setKit(tx, y, yKit!, 'system', 1)
      await setKit(tx, w, wKit!, 'system', 1)
      await tx.insert(raceRosters).values([
        { raceId: 'race-pune:s0', riderId: qOther! },
        { raceId: 'race-pune:s0', riderId: (await ridersOf(tx, y))[0]! },
        { raceId: 'race-pune:s0', riderId: (await ridersOf(tx, w))[0]! },
      ])
      // la escuadra que sale mañana y la que corre mañana su última etapa; la race-tachira ya terminó
      const fields = await frozenFields(tx, worldId, 23)
      expect([...fields.upcoming].map(([race, of]) => [race, [...of].sort()])).toEqual([
        ['race-morvedre:s0', [p, q].sort()],
      ])
      expect([...fields.running].map(([race, of]) => [race, [...of].sort()])).toEqual([
        ['race-pune:s0', [q, y, w].sort()],
      ])
      // y en la temporada siguiente, las de sus claves, con sus días
      await tx.insert(raceRosters).values([
        { raceId: 'race-morvedre:s1', riderId: qRider! },
        { raceId: 'race-pune:s1', riderId: qOther! },
      ])
      const next = await frozenFields(tx, worldId, DAYS_PER_SEASON + 23)
      expect([[...next.upcoming.keys()], [...next.running.keys()]]).toEqual([
        ['race-morvedre:s1'],
        ['race-pune:s1'],
      ])
      // cede q, y solo q: y y w chocan en una carrera que ya corre, y no se fuerzan
      const report = await ensureKits(tx, worldId)
      expect(report.changed.map((r) => [r.teamId, r.why])).toEqual([[q, 'ceded']])
      const after = await kitsOn(tx, teamIds, 23)
      expect(after.get(q)).not.toBe(wouldBe)
      for (const r of [p, y, w]) expect(kitsClash(after.get(q)!, after.get(r)!), r).toBe(false)
      for (const r of now.get(q)?.keys() ?? [])
        expect(kitsClash(after.get(q)!, after.get(r)!), r).toBe(false)
      expect(after.get(y)).toBe(yKit)
      expect(after.get(w)).toBe(wKit)
    })
  })

  it('un equipo que nace sin maillot en un mundo ya traducido toma el primero libre de su semilla (8-d)', async () => {
    const before = await kitsOn(t.db, teamIds, 1)
    // el que no tiene dueño y tiene más rivales, como si acabara de nacer
    const npcs = await t.db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.worldId, worldId), isNull(teams.ownerUserId)))
    const newcomer = npcs
      .map((r) => r.id)
      .sort((a, b) => (rivals.get(b)?.size ?? 0) - (rivals.get(a)?.size ?? 0))[0]!
    await t.db.delete(teamKits).where(eq(teamKits.teamId, newcomer))
    await t.db.update(teams).set({ kitCanonical: null }).where(eq(teams.id, newcomer))
    const report = await t.db.transaction((tx) => ensureKits(tx, worldId))
    expect(report).toMatchObject({ translated: 0, seeded: 1 })
    // el que nace con su maillot no lo cambia: sin noticia (17b)
    expect(report.changed.map((c) => c.why)).toEqual(['seeded'])
    await t.db.transaction((tx) => emitKitNews(tx, worldId, report))
    expect(await kitNews()).toEqual([])
    const after = await kitsOn(t.db, teamIds, 1)
    const kit = after.get(newcomer)!
    const [seed] = await t.db
      .select({ seed: teams.jerseySeed })
      .from(teams)
      .where(eq(teams.id, newcomer))
    // el primero de su orden que nadie lleva y no choca con un rival vestido
    const others = new Map([...after].filter(([id]) => id !== newcomer))
    const taken = new Set([...others.values()].map(canonicalKit))
    const now = await currentRivals()
    const rivalKits = [...(now.get(newcomer)?.keys() ?? [])].map((id) => others.get(id)!)
    const expected = kitsBySeed(seed!.seed).find(
      (c) => !taken.has(canonicalKit(c)) && !rivalKits.some((k) => kitsClash(c, k)),
    )
    expect(kit).toBe(expected)
    // los demás, igual que antes
    for (const [id, k] of others) expect(k, id).toBe(before.get(id))
  })

  it('la reversión de E9: una fila moderator para mañana, nunca con el maillot que se revierte', async () => {
    const [team] = await t.db
      .select({ id: teams.id, seed: teams.jerseySeed })
      .from(teams)
      .where(eq(teams.ownerUserId, USER))
    const id = team!.id
    const now = await currentRivals()
    const kits = await kitsOn(t.db, teamIds, 1)
    const others = new Map([...kits].filter(([x]) => x !== id))
    const taken = new Set([...others.values()].map(canonicalKit))
    const rivalKits = [...(now.get(id)?.keys() ?? [])].map((r) => others.get(r)!)
    const free = (c: KitCode) =>
      !taken.has(canonicalKit(c)) && !rivalKits.some((k) => kitsClash(c, k))
    // sin fila system (el guardado de hoy sustituyó a la de la traducción, 8-t), con el que su semilla
    // le daría primero: la reversión no puede devolvérselo
    const first = kitsBySeed(team!.seed).find(free)!
    await rolledBack(async (tx) => {
      await setKit(tx, id, first, 'manager', 1)
      const kit = await revertKit(tx, id, 'un nombre ofensivo')
      expect(canonicalKit(kit)).not.toBe(canonicalKit(first))
      expect(free(kit)).toBe(true)
      const [row] = await tx
        .select({ kit: teamKits.kit, setBy: teamKits.setBy })
        .from(teamKits)
        .where(and(eq(teamKits.teamId, id), eq(teamKits.validFromDay, 1)))
      expect(row).toEqual({ kit, setBy: 'moderator' })
    })
    // con su fila system en vigor y el cambio del mánager para mañana, vuelve a la system
    const second = kitsBySeed(team!.seed).filter(free)[1]!
    await rolledBack(async (tx) => {
      await setKit(tx, id, first, 'system', 1)
      await tx.update(gameState).set({ currentDay: 1 }).where(eq(gameState.worldId, worldId))
      await setKit(tx, id, second, 'manager', 2)
      expect(await revertKit(tx, id, 'otra vez')).toBe(first)
      const rows = await tx
        .select({ day: teamKits.validFromDay, kit: teamKits.kit, setBy: teamKits.setBy })
        .from(teamKits)
        .where(eq(teamKits.teamId, id))
        .orderBy(teamKits.validFromDay)
      expect(rows).toEqual([
        { day: 1, kit: first, setBy: 'system' },
        { day: 2, kit: first, setBy: 'moderator' },
      ])
    })
  })

  it('tomar un equipo escribe managed_since_day, sin tocar team_kits; soltarlo lo vuelve a nulo', async () => {
    const user = '00000000-0000-4000-8000-00000000016b'
    await t.db
      .insert(users)
      .values({ id: user, email: 'mánager@example.com', name: 'N', premium: true })
    const [npcTeam] = await t.db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.worldId, worldId), eq(teams.division, 'CON')))
      .limit(1)
    const [rider] = await t.db
      .select({ id: riders.id })
      .from(riders)
      .where(eq(riders.teamId, npcTeam!.id))
      .limit(1)
    await t.db.update(riders).set({ userId: user }).where(eq(riders.id, rider!.id))
    const before = await t.db.select().from(teamKits).where(eq(teamKits.teamId, npcTeam!.id))
    expect(await takeOverBotTeam(t.db, user)).toMatchObject({ ok: true, teamId: npcTeam!.id })
    const [taken] = await t.db
      .select({ day: teams.managedSinceDay })
      .from(teams)
      .where(eq(teams.id, npcTeam!.id))
    expect(taken!.day).toBe(0)
    expect(await t.db.select().from(teamKits).where(eq(teamKits.teamId, npcTeam!.id))).toEqual(
      before,
    )
    await releaseUserToWorld(t.db, user)
    const [released] = await t.db
      .select({ owner: teams.ownerUserId, day: teams.managedSinceDay })
      .from(teams)
      .where(eq(teams.id, npcTeam!.id))
    expect(released).toEqual({ owner: null, day: null })
  })
})

/**
 * UN CAMBIO POR TEMPORADA (E3, docs/visual.md §8.7; D-00k, 8-g, 8-t; PR 18a): la tabla de
 * `kitChangeAllowed`, pura. Cuentan las filas `manager` de la temporada de hoy de quien lleva el equipo,
 * menos la de su primer cambio y la de mañana, que un guardado de hoy sustituiría; las de la traducción,
 * un patrocinio o un moderador, nunca.
 */
describe('db: un cambio de maillot por temporada (kitChangeAllowed)', () => {
  const m = (validFromDay: number): KitHistoryRow => ({ validFromDay, setBy: 'manager' })
  const by = (validFromDay: number, setBy: KitHistoryRow['setBy']): KitHistoryRow => ({
    validFromDay,
    setBy,
  })
  const NEXT = { ok: false, nextChangeDay: 364 } as const

  it('el primer cambio tras tomar el equipo es libre; el segundo de la temporada, no', () => {
    expect(kitChangeAllowed([], 90, 100)).toEqual({ ok: true })
    expect(kitChangeAllowed([m(95)], 90, 100)).toEqual({ ok: true })
    expect(kitChangesCounted([m(95)], 90, 100)).toBe(0)
    expect(kitChangeAllowed([m(95), m(98)], 90, 100)).toEqual(NEXT)
    expect(kitChangesCounted([m(95), m(98)], 90, 100)).toBe(1)
  })

  it('dos guardados el mismo día cuentan uno: el de mañana se sustituye (8-t)', () => {
    // el segundo cambio, guardado hoy para mañana: se puede cambiar de idea hoy
    expect(kitChangeAllowed([m(95), m(101)], 90, 100)).toEqual({ ok: true })
    // y mañana ya contó
    expect(kitChangeAllowed([m(95), m(101)], 90, 101)).toEqual(NEXT)
  })

  it('la traducción, un patrocinio y un moderador no cuentan; el cambio del mánager tras ellos, sí', () => {
    const rows = [by(50, 'system'), m(95), by(97, 'sponsor'), by(98, 'moderator')]
    expect(kitChangeAllowed(rows, 90, 100)).toEqual({ ok: true })
    expect(kitChangeAllowed([...rows, m(99)], 90, 100)).toEqual(NEXT)
  })

  it('la temporada siguiente vuelve a ser libre; una fila cuenta en la temporada del día en que se guardó', () => {
    expect(kitChangeAllowed([m(95), m(98)], 90, 400)).toEqual({ ok: true })
    // guardada el último día de la 0 para el primero de la 1: es de la 0
    expect(kitChangeAllowed([m(300), m(364)], 90, 364)).toEqual({ ok: true })
    expect(kitChangeAllowed([m(300), m(330)], 90, 363)).toEqual(NEXT)
    expect(kitChangeAllowed([m(400), m(500)], 90, 600)).toEqual({ ok: false, nextChangeDay: 728 })
  })

  it('sin managed_since_day (con dueño antes del 16a), el primero de todos es el libre', () => {
    expect(kitChangeAllowed([m(95)], null, 100)).toEqual({ ok: true })
    expect(kitChangeAllowed([m(95), m(98)], null, 100)).toEqual(NEXT)
  })

  it('los cambios del dueño anterior no cuentan para el nuevo', () => {
    // el nuevo lo tomó el día 99; los de 95 y 98 eran del anterior
    expect(kitChangeAllowed([m(95), m(98)], 99, 100)).toEqual({ ok: true })
    expect(kitChangeAllowed([m(95), m(98), m(101)], 99, 102)).toEqual({ ok: true })
    expect(kitChangeAllowed([m(95), m(98), m(101), m(103)], 99, 104)).toEqual(NEXT)
  })
})
