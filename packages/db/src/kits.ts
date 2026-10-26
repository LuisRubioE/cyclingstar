import {
  type KitCode,
  type KitVerdict,
  canonicalKit,
  currentSeason,
  parseKit,
  seededRng,
} from '@cyclingstar/shared'
import { type LegacyJerseyStyle, legacyJerseyStyle } from '@cyclingstar/shared/legacyJersey'
import { and, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/postgres-js'
import { KIT_ALLOWED, KIT_CONFLICTS } from './kitConflicts.generated.js'
import { kitRaster, rasterDistance } from './kitDistance.js'
import { gameState, teamKits, teams } from './schema.js'
import { type SeasonRivals, seasonRivals } from './seasonRivals.js'
import type { Queryable } from './titles.js'

/**
 * EL MAILLOT DE CADA EQUIPO, CON SU HISTORIA (E3, docs/visual.md §8.5 a §8.8; D-22, D-23, D-00e; PR 16a).
 * Lo único que escribe maillots es `setKit`; lo demás los lee (`kitOn`, `kitsOn`), los juzga (`checkKit`,
 * contra la tabla de choques, sin rasterizar nunca en una petición) o los reparte: `assignKits` es la
 * traducción del mundo de hoy y la regla de los equipos que nacen después, pura, y `ensureKits` la
 * aplica en la base. El tick no la llama hasta el 17b; nadie escribe en `team_kits` antes.
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

/** El maillot de cada equipo un día: la fila de mayor `valid_from_day` que no pase de ese día. */
export async function kitsOn(
  q: Queryable,
  teamIds: readonly string[],
  day: number,
): Promise<ReadonlyMap<string, KitCode>> {
  if (teamIds.length === 0) return new Map()
  const rows = await q
    .selectDistinctOn([teamKits.teamId], { teamId: teamKits.teamId, kit: teamKits.kit })
    .from(teamKits)
    .where(and(inArray(teamKits.teamId, [...teamIds]), lte(teamKits.validFromDay, day)))
    .orderBy(teamKits.teamId, desc(teamKits.validFromDay))
  return new Map(rows.map((r) => [r.teamId, r.kit as KitCode]))
}

/** El maillot de un equipo un día, o `null` si aún no tenía ninguno guardado y se dibuja con su semilla. */
export async function kitOn(q: Queryable, teamId: string, day: number): Promise<KitCode | null> {
  return (await kitsOn(q, [teamId], day)).get(teamId) ?? null
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

/** Los permitidos barajados con la semilla del equipo (Fisher-Yates con `seededRng`, FNV-1a). */
export function kitsBySeed(seed: string): readonly KitCode[] {
  const rng = seededRng(`kit:${seed}`)
  const order = [...KIT_ALLOWED]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  return order
}

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

/**
 * El veredicto de un maillot para un equipo (§8.7), en el orden de `kitCheckCodeSchema`: el que ya lleva
 * o tiene programado (`kit_igual`), sin contraste (`kit_contraste`), reservado por una señal
 * (`kit_reservado`), el que lleva otro equipo del mundo (`kit_ocupado`) y el que choca con un rival de
 * temporada (`kit_se_confunde`), nombrando al que más carreras comparte. `kit_reciente`, el límite de un
 * cambio por temporada, llega con el 18a (`kitChangeAllowed`). Consulta la tabla; no rasteriza.
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
 * Da maillot a quien no lo tiene (I-05). La primera vez traduce el mundo entero (§8.6); después, los
 * equipos que nacen sin fila toman el primer libre del orden de su semilla, y un NPC cuyo maillot choca
 * con el de un humano rival cede el suyo (DD-08). Idempotente: una segunda pasada no cambia nada. Cada
 * maillot vale desde mañana, con `set_by = 'system'`; si un mánager se queda con uno mientras corre, se
 * prueba el siguiente libre. Sin noticias hasta el 17b, que es cuando el tick la llama.
 */
export async function ensureKits(tx: Tx, worldId: string): Promise<EnsureKitsReport> {
  const day = await today(tx, worldId)
  const fromDay = day + 1
  const rows = await tx
    .select({
      id: teams.id,
      ownerUserId: teams.ownerUserId,
      seed: teams.jerseySeed,
      styleSeed: teams.jerseyStyleSeed,
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
  const rivals = await seasonRivals(tx, worldId, currentSeason(fromDay))
  const asTeam = (r: (typeof rows)[number]): KitAssignTeam => ({
    id: r.id,
    seed: r.seed,
    look: legacyJerseyStyle(r.styleSeed ?? r.seed),
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
  }
  for (const id of ceding) worn.delete(id)
  const pending = rows.filter((r) => !worn.has(r.id))
  let clashes = 0
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
  }
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
    .select({ worldId: teams.worldId, seed: teams.jerseySeed, styleSeed: teams.jerseyStyleSeed })
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
      teams: [
        { id: teamId, seed: team.seed, look: legacyJerseyStyle(team.styleSeed ?? team.seed) },
      ],
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
