import {
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
  KitTakenError,
  assignKits,
  checkKit,
  emitKitNews,
  ensureKits,
  kitsBySeed,
  kitsClash,
  revertKit,
  setKit,
} from './kits.js'
import { kitOn, kitsOn } from './kitsOn.js'
import { gameState, news, riders, teamKits, teams, users, worlds } from './schema.js'
import { type SeasonRivals, rivalsOf, seasonFields } from './seasonRivals.js'
import { releaseUserToWorld, takeOverBotTeam } from './teamControl.js'
import { type TestDb, startTestDb } from './testDb.js'
import { runTick } from './tick.js'

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
  const currentRivals = async () => rivalsOf(await seasonFields(t.db, worldId, 0))

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
      .select({ id: teams.id, seed: teams.jerseySeed, styleSeed: teams.jerseyStyleSeed })
      .from(teams)
      .where(eq(teams.worldId, worldId))
    const keptBase = rows.filter((r) => {
      const look = legacyJerseyStyle(r.styleSeed ?? r.seed)
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
        .select({ id: teams.id, seed: teams.jerseySeed, styleSeed: teams.jerseyStyleSeed })
        .from(teams)
        .where(eq(teams.worldId, worldId))
      const teamsIn = rows.map((r) => ({
        id: r.id,
        seed: r.seed,
        look: legacyJerseyStyle(r.styleSeed ?? r.seed),
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
