import { SEASON_CALENDAR } from '@cyclingstar/engine'
import {
  type BibStyle,
  DAYS_PER_SEASON,
  KIT_CHANGES_PER_SEASON,
  KIT_CODES,
  type KitBlockedWhy,
  type KitCheckCode,
  type KitCode,
  type KitVerdict,
  type TeamKitResponse,
  canonicalKit,
  currentSeason,
  parseKit,
} from '@cyclingstar/shared'
import { type LegacyJerseyStyle, legacyJerseyStyle } from '@cyclingstar/shared/legacyJersey'
import { and, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { KIT_ALLOWED, KIT_CONFLICTS } from './kitConflicts.generated.js'
import { kitRaster, rasterDistance } from './kitDistance.js'
import { kitOn, kitsBySeed, kitsOn } from './kitsOn.js'
import { emitNews } from './news.js'
import { gameState, raceRosters, riders, teamKits, teams } from './schema.js'
import { type SeasonRivals, rivalsOf, seasonRivals } from './seasonRivals.js'
import type { Queryable } from './titles.js'

/**
 * EL MAILLOT DE CADA EQUIPO, CON SU HISTORIA (E3, docs/visual.md §8.5 a §8.8; D-22, D-23, D-00e; PR 16a).
 * Lo único que escribe maillots es `setKit`; lo demás los lee (`kitOn`, `kitsOn`, en `kitsOn.ts`),
 * los juzga (`checkKit`, contra la tabla de choques, sin rasterizar nunca en una petición) o los
 * reparte: `assignKits` es la traducción del mundo de hoy y la regla de los equipos que nacen después,
 * pura, y `ensureKits` la aplica en la base. El tick no la llama hasta el 17b; nadie escribe en
 * `team_kits` antes.
 *
 * Todo maillot nuevo vale desde el día siguiente al de guardarlo, para que una etapa en curso no cambie
 * de maillot, y dos equipos del mismo mundo no llevan nunca el mismo canónico: lo impide el índice
 * `teams_world_kit_uidx` sobre `teams.kit_canonical`, que escribe `setKit` con cada guardado.
 */

/** La transacción del tick, el mismo alias que `titles.ts` y `stageRun.ts`. */
type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type KitSetBy = (typeof teamKits.$inferInsert)['setBy']

/** Otro equipo del mundo ya lleva ese maillot (su canónico): la ruta lo contesta con 409 `kit_ocupado`. */
export class KitTakenError extends Error {
  constructor(
    readonly kit: KitCode,
    readonly takenBy: { readonly teamId: string; readonly teamName: string },
  ) {
    super(`${kit} ya lo lleva ${takenBy.teamName}`)
    this.name = 'KitTakenError'
  }
}

/** Si un error es el 23505 de `teams_world_kit_uidx`, que Drizzle 0.45 puede traer envuelto en `cause`. */
function isKitTaken(error: unknown): boolean {
  for (let e: unknown = error; e instanceof Object; e = (e as { cause?: unknown }).cause) {
    const { code, constraint_name: constraint } = e as { code?: string; constraint_name?: string }
    if (code === '23505' && constraint === 'teams_world_kit_uidx') return true
  }
  return false
}

/**
 * Escribe el maillot de un equipo desde `fromDay`, en una transacción anidada: pone `kit_canonical` y
 * guarda la fila, o sustituye la que ya hubiera para ese día (8-t), así que el último guardado del día es
 * el que vale mañana. Si otro equipo del mundo lleva ya ese canónico, lanza `KitTakenError` y no toca
 * nada; cualquier otro error sube tal cual.
 */
export async function setKit(
  tx: Tx,
  teamId: string,
  kit: KitCode,
  setBy: KitSetBy,
  fromDay: number,
  sponsorDealId?: string,
): Promise<void> {
  if (parseKit(kit) === null) throw new Error(`setKit: ${kit} no es del vocabulario`)
  if ((setBy === 'sponsor') !== (sponsorDealId !== undefined))
    throw new Error('setKit: el contrato va solo con un patrocinio')
  const canonical = canonicalKit(kit)
  try {
    await tx.transaction(async (sp) => {
      await sp.update(teams).set({ kitCanonical: canonical }).where(eq(teams.id, teamId))
      await sp
        .insert(teamKits)
        .values({ teamId, validFromDay: fromDay, kit, setBy, sponsorDealId: sponsorDealId ?? null })
        .onConflictDoUpdate({
          target: [teamKits.teamId, teamKits.validFromDay],
          set: {
            kit,
            setBy,
            sponsorDealId: sponsorDealId ?? null,
            createdAt: sql`now()`,
          },
        })
    })
  } catch (error) {
    if (!isKitTaken(error)) throw error
    const [holder] = await tx
      .select({ teamId: teams.id, teamName: teams.name })
      .from(teams)
      .where(
        and(
          eq(teams.kitCanonical, canonical),
          ne(teams.id, teamId),
          eq(
            teams.worldId,
            sql`(select ${teams.worldId} from ${teams} where ${teams.id} = ${teamId})`,
          ),
        ),
      )
      .limit(1)
    throw new KitTakenError(kit, holder ?? { teamId: '', teamName: '' })
  }
}

// ---------------------------------------------------------------------------------- el reparto

const SIZE = 28
const NEAR = new Map<KitCode, ReadonlySet<KitCode>>(
  KIT_ALLOWED.map((code) => [code, new Set(KIT_CONFLICTS[code].near.map(([c]) => c))]),
)
/** Si dos maillots permitidos quedan a menos de 10, según la tabla de choques. */
export function kitsClash(a: KitCode, b: KitCode): boolean {
  return NEAR.get(a)?.has(b) ?? KIT_CONFLICTS[a]?.near.some(([c]) => c === b) ?? false
}

/** Un equipo al que hay que darle maillot. */
export interface KitAssignTeam {
  readonly id: string
  /** su `jersey_seed`: el orden de los libres de un equipo que nace después (8-d) */
  readonly seed: string
  /** su aspecto de hoy, para la traducción: el maillot nuevo más parecido (§8.6) */
  readonly look: LegacyJerseyStyle
}

export interface KitAssignInput {
  readonly teams: readonly KitAssignTeam[]
  readonly rivals: SeasonRivals
  /** los maillots que ya llevan los demás equipos del mundo, por equipo */
  readonly worn: ReadonlyMap<string, KitCode>
  /** `translate`: cada uno, el más parecido a su aspecto de hoy; `seed`: el orden de su semilla */
  readonly mode: 'translate' | 'seed'
  /** equipos que van primero, en este orden (la puerta repite así la traducción, §8.2) */
  readonly first?: readonly string[]
  /** los permitidos entre los que se elige (la cuenta de DD-24 prueba sin un color o una figura) */
  readonly allowed?: readonly KitCode[]
}

export interface KitAssignResult {
  readonly kits: ReadonlyMap<string, KitCode>
  /** los que no encontraron un libre lejos de todos sus rivales: con cuántos rivales chocan */
  readonly clashes: ReadonlyMap<string, number>
}

const lookOrder = new Map<string, readonly KitCode[]>()

/** Los permitidos, del más parecido al menos parecido a un aspecto de hoy, en visión normal y a 28 px. */
export function kitsByLook(look: LegacyJerseyStyle): readonly KitCode[] {
  const key = `${look.pattern}:${look.base}:${look.secondary}:${look.accent}`
  const hit = lookOrder.get(key)
  if (hit) return hit
  const today = kitRaster({ kind: 'legacy', style: look }, SIZE)
  const order = KIT_ALLOWED.map((code, i) => ({
    code,
    i,
    d: rasterDistance(today, kitRaster({ kind: 'kit', code }, SIZE), 'normal'),
  }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.code)
  lookOrder.set(key, order)
  return order
}

export { kitsBySeed }

/**
 * El reparto (§8.6, D-23): de más a menos rivales de temporada, cada equipo toma el primero de su orden
 * que no lleve ya otro equipo del mundo (por su canónico) y no choque con ningún rival que ya tenga
 * maillot. Si no le queda ninguno, el libre que choca con menos rivales (a igualdad, el primero de su
 * orden), y cuenta como choque. Pura: `ensureKits` la aplica en la base.
 */
export function assignKits(input: KitAssignInput): KitAssignResult {
  const allowed = new Set(input.allowed ?? KIT_ALLOWED)
  const worn = new Map(input.worn)
  const taken = new Set([...worn.values()].map(canonicalKit))
  const first = new Map((input.first ?? []).map((id, i) => [id, i]))
  const rivalsOf = (id: string) => input.rivals.get(id) ?? new Map<string, number>()
  const ordered = [...input.teams].sort(
    (a, b) =>
      (first.get(a.id) ?? Number.POSITIVE_INFINITY) -
        (first.get(b.id) ?? Number.POSITIVE_INFINITY) ||
      rivalsOf(b.id).size - rivalsOf(a.id).size ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
  const kits = new Map<string, KitCode>()
  const clashes = new Map<string, number>()
  for (const team of ordered) {
    const order = (
      input.mode === 'translate' ? kitsByLook(team.look) : kitsBySeed(team.seed)
    ).filter((c) => allowed.has(c))
    const rivalKits = [...rivalsOf(team.id).keys()]
      .map((id) => worn.get(id))
      .filter((k): k is KitCode => k !== undefined)
    const clashCount = (c: KitCode) => rivalKits.filter((k) => kitsClash(c, k)).length
    let pick: KitCode | undefined
    let best = Number.POSITIVE_INFINITY
    for (const c of order) {
      if (taken.has(canonicalKit(c))) continue
      const n = clashCount(c)
      if (n === 0) {
        pick = c
        best = 0
        break
      }
      if (n < best) {
        pick = c
        best = n
      }
    }
    if (pick === undefined)
      throw new Error(`assignKits: no queda ningún maillot libre para ${team.id}`)
    if (best > 0) clashes.set(team.id, best)
    kits.set(team.id, pick)
    worn.set(team.id, pick)
    taken.add(canonicalKit(pick))
  }
  return { kits, clashes }
}

// --------------------------------------------------------------------------------- el veredicto

const okVerdict: KitVerdict = {
  ok: true,
  code: null,
  conflict: null,
  reserved: null,
  takenBy: null,
  nextChangeDay: null,
}

// ---------------------------------------------------------------------- el cambio por temporada

/** Una fila de la historia del maillot de un equipo: lo que mira el cambio por temporada. */
export interface KitHistoryRow {
  readonly validFromDay: number
  readonly setBy: KitSetBy
}

/**
 * Los cambios del mánager que cuentan en la temporada de hoy (D-00k; §8.7; 8-g, 8-t): las filas `manager`
 * guardadas en ella (`currentSeason(validFromDay − 1)`, porque todo maillot vale desde el día siguiente al
 * de guardarlo) desde que el equipo tiene este dueño, menos dos: la de su primer cambio, que es libre, y
 * la de mañana, que un guardado de hoy sustituye. Las de la traducción, un patrocinio o un moderador no
 * cuentan nunca, ni las del dueño anterior. Sin `managedSinceDay`, en los equipos con dueño antes del 16a,
 * el cambio libre es el primero de todos.
 */
export function kitChangesCounted(
  rows: readonly KitHistoryRow[],
  managedSinceDay: number | null,
  today: number,
): number {
  const season = currentSeason(today)
  const mine = rows
    .filter(
      (r) =>
        r.setBy === 'manager' && (managedSinceDay === null || r.validFromDay > managedSinceDay),
    )
    .sort((a, b) => a.validFromDay - b.validFromDay)
  return mine
    .slice(1)
    .filter((r) => r.validFromDay !== today + 1 && currentSeason(r.validFromDay - 1) === season)
    .length
}

/** Si el mánager puede cambiar hoy de maillot; si no, desde qué día: el primero de la temporada siguiente. */
export function kitChangeAllowed(
  rows: readonly KitHistoryRow[],
  managedSinceDay: number | null,
  today: number,
): { readonly ok: true } | { readonly ok: false; readonly nextChangeDay: number } {
  return kitChangesCounted(rows, managedSinceDay, today) < KIT_CHANGES_PER_SEASON
    ? { ok: true }
    : { ok: false, nextChangeDay: nextSeasonDay(today) }
}

/** El primer día de la temporada siguiente a la de `day`. */
const nextSeasonDay = (day: number): number => (currentSeason(day) + 1) * DAYS_PER_SEASON

/** La historia del maillot de un equipo y desde cuándo lo lleva su dueño. */
async function kitHistory(
  q: Queryable,
  teamId: string,
): Promise<{ readonly rows: readonly KitHistoryRow[]; readonly managedSinceDay: number | null }> {
  const rows = await q
    .select({ validFromDay: teamKits.validFromDay, setBy: teamKits.setBy })
    .from(teamKits)
    .where(eq(teamKits.teamId, teamId))
  const [team] = await q
    .select({ managedSinceDay: teams.managedSinceDay })
    .from(teams)
    .where(eq(teams.id, teamId))
  return { rows, managedSinceDay: team?.managedSinceDay ?? null }
}

/**
 * El veredicto de un maillot para un equipo (§8.7), en el orden de `kitCheckCodeSchema`: el cambio por
 * temporada ya gastado (`kit_reciente`, con el día en que vuelve a poder), el que ya lleva o tiene
 * programado (`kit_igual`), sin contraste (`kit_contraste`), reservado por una señal (`kit_reservado`), el
 * que lleva otro equipo del mundo (`kit_ocupado`) y el que choca con un rival de temporada
 * (`kit_se_confunde`), nombrando al que más carreras comparte. Consulta la tabla; no rasteriza.
 */
export async function checkKit(
  q: Queryable,
  args: {
    readonly worldId: string
    readonly teamId: string
    readonly kit: KitCode
    readonly today: number
  },
): Promise<KitVerdict> {
  const { worldId, teamId, kit, today } = args
  const fromDay = today + 1
  const { rows, managedSinceDay } = await kitHistory(q, teamId)
  const allowed = kitChangeAllowed(rows, managedSinceDay, today)
  if (!allowed.ok)
    return { ...okVerdict, ok: false, code: 'kit_reciente', nextChangeDay: allowed.nextChangeDay }
  const [current, next] = [await kitOn(q, teamId, today), await kitOn(q, teamId, fromDay)]
  // el mismo maillot es el mismo canónico: el espejo de halves también (8-k)
  const same = (k: KitCode | null) => k !== null && canonicalKit(k) === canonicalKit(kit)
  if (same(current) || same(next)) return { ...okVerdict, ok: false, code: 'kit_igual' }
  const entry = KIT_CONFLICTS[kit]
  if (entry === undefined || !entry.contrastOk)
    return { ...okVerdict, ok: false, code: 'kit_contraste' }
  if (entry.reserved !== null)
    return { ...okVerdict, ok: false, code: 'kit_reservado', reserved: entry.reserved }
  const [holder] = await q
    .select({ teamId: teams.id, teamName: teams.name })
    .from(teams)
    .where(
      and(
        eq(teams.worldId, worldId),
        eq(teams.kitCanonical, canonicalKit(kit)),
        ne(teams.id, teamId),
      ),
    )
    .limit(1)
  if (holder) return { ...okVerdict, ok: false, code: 'kit_ocupado', takenBy: holder }
  const rivals = (await seasonRivals(q, worldId, currentSeason(fromDay))).get(teamId)
  if (rivals && rivals.size > 0) {
    const near = new Map(entry.near)
    const worn = await kitsOn(q, [...rivals.keys()], fromDay)
    const clashing = [...worn]
      .filter(([, k]) => near.has(k))
      .map(([id, k]) => ({ id, vision: near.get(k)!, races: rivals.get(id) ?? 0 }))
      .sort((a, b) => b.races - a.races || (a.id < b.id ? -1 : 1))
    const top = clashing[0]
    if (top) {
      const [rival] = await q
        .select({ teamName: teams.name })
        .from(teams)
        .where(eq(teams.id, top.id))
      return {
        ...okVerdict,
        ok: false,
        code: 'kit_se_confunde',
        conflict: { teamId: top.id, teamName: rival?.teamName ?? '', vision: top.vision },
      }
    }
  }
  return okVerdict
}

// --------------------------------------------------------------------------------- en la base

/** Un maillot que escribió `ensureKits`, y por qué. */
export interface KitChange {
  readonly teamId: string
  readonly kit: KitCode
  /** la traducción, un equipo que nace sin maillot o un NPC que cede el suyo a un humano rival */
  readonly why: 'translated' | 'seeded' | 'ceded'
}

/** Lo que hizo `ensureKits`. */
export interface EnsureKitsReport {
  /** la primera vez: el mundo entero traducido */
  readonly translated: number
  /** equipos sin maillot que tomaron uno por su semilla */
  readonly seeded: number
  /** NPC que cedieron su maillot a un humano rival (DD-08) */
  readonly ceded: number
  /** los que no encontraron un libre lejos de todos sus rivales */
  readonly clashes: number
  /** el día desde el que valen, mañana */
  readonly fromDay: number
  /** lo que escribió, equipo a equipo: de aquí salen sus noticias (17b) */
  readonly changed: readonly KitChange[]
}

/** El día de juego de hoy, el del reloj del mundo. */
async function today(q: Queryable, worldId: string): Promise<number> {
  const [row] = await q
    .select({ currentDay: gameState.currentDay })
    .from(gameState)
    .where(eq(gameState.worldId, worldId))
    .limit(1)
  return row?.currentDay ?? 0
}

/**
 * LAS ESCUADRAS YA CONGELADAS DE LO QUE AÚN NO HA SALIDO (17d): el pelotón de verdad de cada carrera que sale
 * desde `fromDay`, por su clave (`race:s0`), con los equipos de sus corredores. La previsión de rivales
 * (`seasonRivals`) no los ve a todos: la escuadra se congela catorce días antes de la salida
 * (`ENROLL_LOCK_DAYS`) con quien de verdad va, y en una temporada del banco de noche juntó a 5 pares de
 * equipos que no eran rivales previstos, en 12 carreras. Las que ya han salido no cuentan: su maillot es el
 * del día de la salida (16b). Sin los nacionales, como la previsión. Solo las de la temporada de `fromDay`:
 * el cierre de inscripciones no congela las de la siguiente hasta que empieza (`lockUpcomingRosters`).
 * En orden de clave, para que lo que se decide con ellas no dependa del orden de las filas.
 */
export async function frozenFields(
  q: Queryable,
  worldId: string,
  fromDay: number,
): Promise<ReadonlyMap<string, readonly string[]>> {
  const season = currentSeason(fromDay)
  const keys = SEASON_CALENDAR.filter(
    (race) => !race.championshipCountry && season * DAYS_PER_SEASON + race.startDay >= fromDay,
  ).map((race) => `${race.id}:s${season}`)
  const rows = await q
    .selectDistinct({ raceId: raceRosters.raceId, teamId: riders.teamId })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .where(and(inArray(raceRosters.raceId, keys), eq(riders.worldId, worldId)))
  const fields = new Map<string, string[]>()
  for (const r of [...rows].sort((x, y) =>
    x.raceId < y.raceId ? -1 : x.raceId > y.raceId ? 1 : 0,
  )) {
    if (r.teamId === null) continue
    fields.set(r.raceId, [...(fields.get(r.raceId) ?? []), r.teamId])
  }
  return fields
}

/** La previsión con las escuadras congeladas: dos equipos son rivales si comparten una de las dos. */
function withFrozen(
  rivals: SeasonRivals,
  frozen: ReadonlyMap<string, readonly string[]>,
): SeasonRivals {
  if (frozen.size === 0) return rivals
  const out = new Map([...rivals].map(([team, of]) => [team, new Map(of)] as const))
  for (const [team, of] of rivalsOf(frozen)) {
    const mine = out.get(team) ?? new Map<string, number>()
    for (const [rival, n] of of) mine.set(rival, (mine.get(rival) ?? 0) + n)
    out.set(team, mine)
  }
  return out
}

/**
 * Da maillot a quien no lo tiene (I-05). La primera vez traduce el mundo entero (§8.6); después, los
 * equipos que nacen sin fila toman el primer libre del orden de su semilla, y un NPC cuyo maillot choca
 * con el de un humano rival cede el suyo (DD-08). Rival es el de la previsión y, desde el 17d, el de una
 * escuadra ya congelada de lo que aún no ha salido (`frozenFields`), donde también cede, ante otro NPC, el de
 * menos presupuesto. Idempotente: una segunda pasada no cambia nada. Cada
 * maillot vale desde mañana, con `set_by = 'system'`; si un mánager se queda con uno mientras corre, se
 * prueba el siguiente libre. No escribe noticias: las escribe `emitKitNews` con lo que devuelve, en la
 * misma transacción del tick (17b).
 */
export async function ensureKits(tx: Tx, worldId: string): Promise<EnsureKitsReport> {
  const day = await today(tx, worldId)
  const fromDay = day + 1
  const rows = await tx
    .select({
      id: teams.id,
      ownerUserId: teams.ownerUserId,
      seed: teams.jerseySeed,
      budget: teams.budget,
    })
    .from(teams)
    .where(eq(teams.worldId, worldId))
  const worn = new Map(
    await kitsOn(
      tx,
      rows.map((r) => r.id),
      fromDay,
    ),
  )
  const frozen = await frozenFields(tx, worldId, fromDay)
  const rivals = withFrozen(await seasonRivals(tx, worldId, currentSeason(fromDay)), frozen)
  // su aspecto de hoy, el de su semilla: desde el 19e nadie lee la del dibujo, y la traducción ya corrió
  // para todo equipo que la tuviera (§17.19)
  const asTeam = (r: (typeof rows)[number]): KitAssignTeam => ({
    id: r.id,
    seed: r.seed,
    look: legacyJerseyStyle(r.seed),
  })
  const translating = worn.size === 0
  const missing = rows.filter((r) => !worn.has(r.id))
  // el NPC cede (DD-08): el maillot de un humano choca con el de un NPC rival
  const ceding = new Set<string>()
  if (!translating) {
    for (const human of rows.filter((r) => r.ownerUserId !== null)) {
      const kit = worn.get(human.id)
      if (kit === undefined) continue
      for (const rivalId of rivals.get(human.id)?.keys() ?? []) {
        const rival = rows.find((r) => r.id === rivalId)
        const theirs = worn.get(rivalId)
        if (rival?.ownerUserId === null && theirs !== undefined && kitsClash(kit, theirs))
          ceding.add(rivalId)
      }
    }
    // …y dos NPC que chocan en una escuadra ya congelada (17d): cede el de menos presupuesto (a igualdad, el
    // de id mayor). Su maillot nuevo evita a todos sus rivales, los previstos y los de las escuadras, así que
    // el que ya cede no hace ceder a nadie más; y los pares, de todas las escuadras, van del más rico al más
    // pobre, para que ceda antes el que resuelve más y lo que se decide no dependa del orden de las filas
    const byId = new Map(rows.map((r) => [r.id, r] as const))
    const richFirst = (x: string, y: string) =>
      (byId.get(y)?.budget ?? 0) - (byId.get(x)?.budget ?? 0) || (x < y ? -1 : x > y ? 1 : 0)
    const npcPairs: [string, string][] = []
    for (const field of frozen.values()) {
      const ordered = [...field].sort(richFirst)
      for (const [i, a] of ordered.entries())
        for (const b of ordered.slice(i + 1)) {
          const ra = byId.get(a)
          const rb = byId.get(b)
          if (ra === undefined || rb === undefined) continue
          // con un humano, lo dice DD-08, arriba; dos humanos no se fuerzan
          if (ra.ownerUserId !== null || rb.ownerUserId !== null) continue
          const ka = worn.get(a)
          const kb = worn.get(b)
          if (ka !== undefined && kb !== undefined && kitsClash(ka, kb)) npcPairs.push([a, b])
        }
    }
    npcPairs.sort(([a1, b1], [a2, b2]) => richFirst(a1, a2) || richFirst(b1, b2))
    // en cada par, el segundo es el de menos presupuesto
    for (const [a, b] of npcPairs) if (!ceding.has(a) && !ceding.has(b)) ceding.add(b)
  }
  for (const id of ceding) worn.delete(id)
  const pending = rows.filter((r) => !worn.has(r.id))
  let clashes = 0
  const changed: KitChange[] = []
  const whyOf = (id: string): KitChange['why'] =>
    translating ? 'translated' : ceding.has(id) ? 'ceded' : 'seeded'
  // se reparte y se escribe; si un mánager se ha quedado con uno mientras tanto, se vuelve a repartir
  // lo que falta, con ese ya ocupado
  let left = pending
  for (let round = 0; left.length > 0; round++) {
    if (round > pending.length) throw new Error('ensureKits: el reparto no avanza')
    const { kits, clashes: c } = assignKits({
      teams: left.map(asTeam),
      rivals,
      worn,
      mode: translating ? 'translate' : 'seed',
    })
    const retry: typeof rows = []
    for (const r of left) {
      const kit = kits.get(r.id)!
      try {
        await setKit(tx, r.id, kit, 'system', fromDay)
        worn.set(r.id, kit)
        changed.push({ teamId: r.id, kit, why: whyOf(r.id) })
        if (c.has(r.id)) clashes++
      } catch (error) {
        if (!(error instanceof KitTakenError)) throw error
        // el que lleva de verdad, que puede ser el espejo del que se probó
        const holder = error.takenBy.teamId
        worn.set(holder, (await kitOn(tx, holder, fromDay)) ?? kit)
        retry.push(r)
      }
    }
    left = retry
  }
  return {
    translated: translating ? pending.length : 0,
    seeded: translating ? 0 : missing.length,
    ceded: ceding.size,
    clashes,
    fromDay,
    changed,
  }
}

/**
 * LAS NOTICIAS DEL MAILLOT (E3, docs/visual.md §8.6; PR 17b, 17-l): una en el diario de cada equipo
 * cuyo maillot cambia, el día en que se ve (`report.fromDay`): `Mistral Racing has a new kit` en la
 * traducción y `New kit for Mistral Racing` cuando un NPC cede. El que nace sin maillot y toma uno por
 * su semilla no lo cambia: nace con él, y no lleva noticia.
 */
export async function emitKitNews(
  tx: Tx,
  worldId: string,
  report: EnsureKitsReport,
): Promise<void> {
  for (const c of report.changed) {
    if (c.why === 'seeded') continue
    await emitNews(tx, {
      worldId,
      gameDay: report.fromDay,
      seed: `kit:${c.teamId}:${report.fromDay}`,
      payload: {
        kind: c.why === 'translated' ? 'kit_new' : 'kit_ceded',
        teamId: c.teamId,
        kit: c.kit,
      },
    })
  }
}

/** La nota de `tick_log`: lo que hizo `ensureKits` y lo que tardó; null si no hizo nada. */
export function kitsNote(report: EnsureKitsReport, ms: number): string | null {
  const parts = [
    report.translated > 0 ? `${report.translated} traducidos` : null,
    report.seeded > 0 ? `${report.seeded} por semilla` : null,
    report.ceded > 0 ? `${report.ceded} cedidos` : null,
    report.clashes > 0 ? `${report.clashes} sin un libre lejos de sus rivales` : null,
  ].filter((p) => p !== null)
  if (parts.length === 0) return null
  return `maillots: ${parts.join(', ')} (${(ms / 1000).toFixed(1).replace('.', ',')} s)`
}

/**
 * La reversión de E9 (§8.8): para mañana, una fila `moderator` con el último maillot `system` del equipo,
 * o uno nuevo por su semilla si ese ya lo lleva otro, choca con un rival o es el que se revierte; nunca
 * el que se revierte ni su espejo. No devuelve el cambio de la temporada al mánager cuando el maillot
 * revertido ya estaba en vigor: su fila `manager` se queda en la historia y cuenta (D-00k). Si se
 * revierte el mismo día en que el mánager lo guardó, su fila de mañana se sustituye, como un cambio de
 * idea (8-t), y ese cambio deja de contar; si E9 quiere que cuente, lo apunta su registro (lo decide el
 * 18a con `kitChangeAllowed`). El motivo va al registro de la API.
 */
export async function revertKit(tx: Tx, teamId: string, reason: string): Promise<KitCode> {
  if (reason.trim().length < 3) throw new Error('revertKit: el motivo, de 3 caracteres o más')
  const [team] = await tx
    .select({ worldId: teams.worldId, seed: teams.jerseySeed })
    .from(teams)
    .where(eq(teams.id, teamId))
  if (!team) throw new Error(`revertKit: no existe el equipo ${teamId}`)
  const fromDay = (await today(tx, team.worldId)) + 1
  const [last] = await tx
    .select({ kit: teamKits.kit })
    .from(teamKits)
    .where(and(eq(teamKits.teamId, teamId), eq(teamKits.setBy, 'system')))
    .orderBy(desc(teamKits.validFromDay))
    .limit(1)
  const others = await tx
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.worldId, team.worldId), ne(teams.id, teamId)))
  const worn = new Map(
    await kitsOn(
      tx,
      others.map((o) => o.id),
      fromDay,
    ),
  )
  const rivals = await seasonRivals(tx, team.worldId, currentSeason(fromDay))
  const takenElsewhere = async (kit: KitCode) =>
    (
      await tx
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            eq(teams.worldId, team.worldId),
            eq(teams.kitCanonical, canonicalKit(kit)),
            ne(teams.id, teamId),
          ),
        )
        .limit(1)
    ).length > 0
  const previous = last?.kit as KitCode | undefined
  // el que se revierte: el que lleva mañana, el último guardado; ni él ni su espejo valen
  const reverted = await kitOn(tx, teamId, fromDay)
  const isReverted = (kit: KitCode) =>
    reverted !== null && canonicalKit(kit) === canonicalKit(reverted)
  const clashesWithRival = (kit: KitCode) =>
    [...(rivals.get(teamId)?.keys() ?? [])].some((id) => {
      const theirs = worn.get(id)
      return theirs !== undefined && kitsClash(kit, theirs)
    })
  let kit: KitCode
  if (
    previous !== undefined &&
    !isReverted(previous) &&
    !(await takenElsewhere(previous)) &&
    !clashesWithRival(previous)
  )
    kit = previous
  else {
    const { kits } = assignKits({
      teams: [{ id: teamId, seed: team.seed, look: legacyJerseyStyle(team.seed) }],
      rivals,
      worn,
      mode: 'seed',
      allowed: KIT_ALLOWED.filter((c) => !isReverted(c)),
    })
    kit = kits.get(teamId)!
  }
  await setKit(tx, teamId, kit, 'moderator', fromDay)
  return kit
}

// ------------------------------------------------------------------------------- el editor (18a)

/** Los rivales que enseña el editor, los que más carreras comparten (§8.7). */
const EDITOR_RIVALS = 8

/**
 * Lo que pinta el editor (§8.7; 8-e), `GET /api/teams/me/kit`: el maillot de hoy y el programado, el
 * culote, los cambios que le quedan esta temporada, los códigos que no puede elegir con su porqué (sin
 * contraste, reservado, el de otro equipo o el que choca con un rival de mañana), con lo que tacha sus
 * muestras, y sus ocho rivales con más carreras compartidas. Sin la tabla de choques en la web.
 */
export async function getTeamKitState(
  q: Queryable,
  args: { readonly worldId: string; readonly teamId: string; readonly today: number },
): Promise<TeamKitResponse> {
  const { worldId, teamId, today } = args
  const fromDay = today + 1
  const [team] = await q.select({ bib: teams.bib }).from(teams).where(eq(teams.id, teamId))
  const current = await kitOn(q, teamId, today)
  const [pending] = await q
    .select({ kit: teamKits.kit, validFromDay: teamKits.validFromDay })
    .from(teamKits)
    .where(and(eq(teamKits.teamId, teamId), gt(teamKits.validFromDay, today)))
    .orderBy(desc(teamKits.validFromDay))
    .limit(1)
  const { rows, managedSinceDay } = await kitHistory(q, teamId)
  const changesLeft = Math.max(
    0,
    KIT_CHANGES_PER_SEASON - kitChangesCounted(rows, managedSinceDay, today),
  )
  const others = await q
    .select({ canonical: teams.kitCanonical })
    .from(teams)
    .where(and(eq(teams.worldId, worldId), ne(teams.id, teamId)))
  const taken = new Set(others.flatMap((o) => (o.canonical === null ? [] : [o.canonical])))
  const rivals = (await seasonRivals(q, worldId, currentSeason(fromDay))).get(teamId) ?? new Map()
  const worn = await kitsOn(q, [...rivals.keys()], fromDay)
  const rivalKits = new Set(worn.values())
  const options: { kit: KitCode; why: KitBlockedWhy }[] = []
  for (const kit of KIT_CODES) {
    const entry = KIT_CONFLICTS[kit]
    const why: KitBlockedWhy | null =
      entry === undefined || !entry.contrastOk
        ? 'contraste'
        : entry.reserved !== null
          ? 'reservado'
          : taken.has(canonicalKit(kit))
            ? 'ocupado'
            : entry.near.some(([c]) => rivalKits.has(c))
              ? 'rival'
              : null
    if (why !== null) options.push({ kit, why })
  }
  const top = [...rivals]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, EDITOR_RIVALS)
  const names =
    top.length === 0
      ? []
      : await q
          .select({ id: teams.id, name: teams.name })
          .from(teams)
          .where(
            inArray(
              teams.id,
              top.map(([id]) => id),
            ),
          )
  const nameOf = new Map(names.map((n) => [n.id, n.name]))
  return {
    current,
    bib: team?.bib ?? 'black',
    pending: pending ? { kit: pending.kit as KitCode, validFromDay: pending.validFromDay } : null,
    changesLeft,
    nextChangeDay: changesLeft > 0 ? null : nextSeasonDay(today),
    options,
    rivals: top.map(([id, races]) => ({
      teamId: id,
      name: nameOf.get(id) ?? '',
      kit: worn.get(id) ?? null,
      races,
    })),
  }
}

/** El equipo que lleva un usuario y el día de hoy de su mundo; null si no lleva ninguno. */
export async function ownedTeamToday(
  q: Queryable,
  userId: string,
): Promise<{ readonly teamId: string; readonly worldId: string; readonly today: number } | null> {
  const [team] = await q
    .select({ teamId: teams.id, worldId: teams.worldId })
    .from(teams)
    .where(eq(teams.ownerUserId, userId))
    .limit(1)
  return team ? { ...team, today: await today(q, team.worldId) } : null
}

/** Lo que contesta el guardado del editor: el día desde el que vale el maillot, o su porqué. */
export type KitSaveResult =
  | { readonly ok: true; readonly validFromDay: number | null }
  | { readonly ok: false; readonly code: 'kit_reciente'; readonly nextChangeDay: number }
  | { readonly ok: false; readonly code: Exclude<KitCheckCode, 'kit_reciente'> | 'sin_equipo' }

/**
 * El guardado del editor (§8.7), `PUT /api/teams/me/kit`, en una transacción: el maillot, si vale, para
 * mañana con `set_by = 'manager'`; el culote, en el acto, sin contar para el límite ni para la unicidad.
 * Si el maillot no vale, no se guarda nada, tampoco el culote. Un guardado a la vez que otro equipo se
 * queda con el mismo canónico da `kit_ocupado` (el índice, §8.5).
 */
export async function saveTeamKit(
  db: Database,
  userId: string,
  body: { readonly kit?: KitCode | undefined; readonly bib?: BibStyle | undefined },
): Promise<KitSaveResult> {
  return db.transaction(async (tx): Promise<KitSaveResult> => {
    const [team] = await tx
      .select({ id: teams.id, worldId: teams.worldId })
      .from(teams)
      .where(eq(teams.ownerUserId, userId))
      .limit(1)
    if (!team) return { ok: false, code: 'sin_equipo' }
    const day = await today(tx, team.worldId)
    let validFromDay: number | null = null
    if (body.kit !== undefined) {
      const verdict = await checkKit(tx, {
        worldId: team.worldId,
        teamId: team.id,
        kit: body.kit,
        today: day,
      })
      if (verdict.code === 'kit_reciente')
        return { ok: false, code: 'kit_reciente', nextChangeDay: nextSeasonDay(day) }
      if (verdict.code !== null) return { ok: false, code: verdict.code }
      try {
        await setKit(tx, team.id, body.kit, 'manager', day + 1)
      } catch (error) {
        if (error instanceof KitTakenError) return { ok: false, code: 'kit_ocupado' }
        throw error
      }
      validFromDay = day + 1
    }
    if (body.bib !== undefined)
      await tx.update(teams).set({ bib: body.bib }).where(eq(teams.id, team.id))
    return { ok: true, validFromDay }
  })
}

/**
 * La reversión de E9 con su noticia (§8.8): `revertKit` y, en el diario del equipo, `Mistral Racing's kit
 * was reset by a moderator.`, fechada el día en que se ve. Null si el equipo no existe.
 */
export async function revertTeamKit(
  db: Database,
  teamId: string,
  reason: string,
): Promise<{ readonly kit: KitCode; readonly validFromDay: number } | null> {
  return db.transaction(async (tx) => {
    const [team] = await tx
      .select({ worldId: teams.worldId })
      .from(teams)
      .where(eq(teams.id, teamId))
    if (!team) return null
    const kit = await revertKit(tx, teamId, reason)
    const validFromDay = (await today(tx, team.worldId)) + 1
    await emitNews(tx, {
      worldId: team.worldId,
      gameDay: validFromDay,
      seed: `kit_reset:${teamId}:${validFromDay}`,
      payload: { kind: 'kit_reset', teamId, kit },
    })
    return { kit, validFromDay }
  })
}
