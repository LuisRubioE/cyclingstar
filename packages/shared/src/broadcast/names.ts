/**
 * LAS PALABRAS DE LA RETRANSMISIÓN (E2, docs/retransmision.md §6.3, §6.4, §6.7, §7 y §12.5; D-18,
 * D-26, D-27, DD-04).
 *
 * Un solo vocabulario de grupos para la barra, la radio servida, la capa fija y la voz: la regla C7 del
 * dueño, «un solo concepto, con el mismo nombre, en el motor y en la Race Radio» (`docs/balance.md`,
 * v34). El código es `GroupRole` (y `GroupLabel`, `instant.ts`); las palabras, las de SPEC §6.15
 * (`Bunch`, `Lead group`, `Chase group`) más `Gruppetto` (DD-04, con su valor por defecto). El grupo
 * del maillot se llama igual en la barra y en la voz (6-b).
 *
 * Nace en el PR 3a con `GROUP_WORDS` y `groupLabelText`. El 6b (§17.20) trae lo demás: los textos del
 * rótulo de corredor (`cardCaption`, `cardLineText`, `championTitleText` con su lista de países con
 * artículo, `ordinal`, `gapText`, `listAnd`), la frase de la fuga (`breakHeadline`, sobre
 * `breakHeadlineParts`), la ronda de la moto (`breakRoundOf`), a quién se nombra en cada grupo
 * (`namedRidersOf`), la línea de quién tira (`pullingLineOf` y `PULL_MOTIVE_WORDS`) y la línea de la
 * tendencia del hueco en la voz (`gapTrendLine`). Todo es puro y recibe las cartas YA servidas, con el
 * velo aplicado: el velo no se decide aquí (§7.8). Los textos llevan el `locale` delante, con el tipo
 * literal `'en'` y el nombre `_locale` mientras no lo lean (12-q, D-62): E10 recibe estos puntos de
 * render.
 */
import type { PullMotive } from '../contracts.js'
import { COUNTRIES } from '../countries.js'
import type { ChampionTitle, Distinction, JerseyKind, RiderCard, WornJersey } from '../jerseys.js'
import type { NameResolver } from '../news.js'
import { BROADCAST } from './constants.js'
import type { Cue } from './cues.js'
import type { GapTrend, GroupLabel, GroupNow, GroupRole, InstantContext } from './instant.js'
import type { GroupDetail, RiderIx, TimelineEvent } from './timeline.js'

/** EL VOCABULARIO ÚNICO de grupos (D-18): [barra, voz]. Un papel o un maillot nuevo no compila sin su palabra. */
export const GROUP_WORDS = {
  role: {
    lead: ['Lead group', 'the lead group'],
    chase: ['Chase group', 'the chase group'],
    bunch: ['Bunch', 'the bunch'], // DD-04: `Peloton` es la alternativa
    gruppetto: ['Gruppetto', 'the gruppetto'],
  },
  together: ['Bunch together', 'the bunch'],
  jersey: {
    // el grupo del maillot, igual en la barra, la radio servida, la capa fija y la voz (6-b)
    gc: ['Race leader’s group', 'the race leader’s group'],
    points: ['Points leader’s group', 'the points leader’s group'],
    kom: ['Mountains leader’s group', 'the mountains leader’s group'], // «Mountains leader», como JERSEY_LABEL
  },
} as const satisfies {
  readonly role: Readonly<Record<GroupRole, readonly [string, string]>>
  readonly together: readonly [string, string]
  readonly jersey: Readonly<Record<JerseyKind, readonly [string, string]>>
}

/** Dónde se dice: la fila de la barra (y la capa fija) o la voz. */
export type GroupWordsForm = 'bar' | 'voice'

/**
 * EL TEXTO DE UNA ETIQUETA (§6.3). Nace con el `locale` delante, con el tipo literal `'en'` y el nombre
 * `_locale` mientras no lo lea (12-q, D-62). La barra escribe la palabra tal cual (las mayúsculas de
 * `LEAD GROUP` son presentación); la voz, en minúsculas y con artículo. Un grupo de tres o menos se
 * nombra por sus corredores: en la barra separados por `·`, en la voz como lista («A, B and C»); los
 * nombres los pone quien llama (`name`), y en la voz, con la identidad entera.
 */
export function groupLabelText(
  _locale: 'en',
  label: GroupLabel,
  role: GroupRole,
  form: GroupWordsForm,
  name: (rider: RiderIx) => string,
): string {
  const i = form === 'bar' ? 0 : 1
  switch (label.k) {
    case 'together':
      return GROUP_WORDS.together[i]
    case 'role':
      return GROUP_WORDS.role[role][i]
    case 'jersey_group':
      return GROUP_WORDS.jersey[label.jersey][i]
    case 'names': {
      const names = label.riders.map(name)
      if (form === 'bar') return names.join(' · ')
      if (names.length <= 1) return names[0] ?? GROUP_WORDS.role[role][1]
      return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]!}`
    }
  }
}

// ------------------------------------------------------------- los textos del rótulo (§7.1, §7.4)

/** El maillot por su nombre, en una línea `wears_for` (§7.1). */
const JERSEY_NAME = {
  gc: 'Leader’s jersey',
  points: 'Points jersey',
  kom: 'Mountains jersey',
} as const satisfies Record<JerseyKind, string>

/** La clasificación por su nombre, en el titular de un líder y en una línea `leads` (§7.1). */
const CLASS_NAME = {
  gc: 'general classification',
  points: 'points classification',
  kom: 'mountains classification',
} as const satisfies Record<JerseyKind, string>

/** 1st 2nd 3rd 4th … 11th 12th 13th … 21st: la regla inglesa de los ordinales. */
export function ordinal(n: number): string {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  const last = n % 10
  return `${n}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`
}

/**
 * Un hueco de general con su signo, siempre (D-57): `+4:02`, desde la hora `+1:02:10`, `+0:00` si
 * empata a tiempo y `−0:03` (con el signo menos tipográfico) por delante.
 */
export function gapText(s: number): string {
  const sign = s < 0 ? '−' : '+'
  const total = Math.round(Math.abs(s))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const ss = String(total % 60).padStart(2, '0')
  return h > 0 ? `${sign}${h}:${String(m).padStart(2, '0')}:${ss}` : `${sign}${m}:${ss}`
}

/**
 * «3», «3 and 7», «3, 7 and 12»: la lista en inglés, como `listNames` (apps/web/src/domain/
 * stageJournal.ts), que `shared` no puede importar. E10 la recibe como punto de render (D-62).
 */
export function listAnd(xs: readonly string[]): string {
  const last = xs.at(-1)
  if (last === undefined) return ''
  return xs.length === 1 ? last : `${xs.slice(0, -1).join(', ')} and ${last}`
}

/**
 * Los nombres de `COUNTRIES` que en inglés llevan artículo (decisión 7-d): `Champion of the
 * Netherlands`. Lista cerrada, atada por test a `COUNTRIES`.
 */
export const WITH_THE: ReadonlySet<string> = new Set([
  'Netherlands',
  'United Kingdom',
  'United States',
  'Philippines',
  'United Arab Emirates',
  'Dominican Republic',
  'Cayman Islands',
  'Seychelles',
])

/**
 * EL TEXTO DE UN TÍTULO (§7.4; O-30): `Champion of Italy`, `Time trial champion of Italy`, `U23
 * champion of Italy`, `U23 time trial champion of Italy`, y los del mundo, `World champion` y `World
 * time trial champion`. Nunca un gentilicio ni `ITA CHAMP`: el nombre del país es el de `COUNTRIES`,
 * que da el `NameResolver` (el de cada idioma, con E10).
 */
export function championTitleText(
  _locale: 'en',
  t: ChampionTitle,
  n: Pick<NameResolver, 'country'>,
): string {
  const kind = `${t.category === 'u23' ? 'U23 ' : ''}${t.discipline === 'itt' ? 'time trial ' : ''}champion`
  switch (t.scope) {
    case 'world':
      return `World ${kind}`
    case 'continental':
      return `Continental ${kind}` // provisional hasta que E12 dé los nombres de continente
    case 'national': {
      const name = n.country(t.country ?? '')
      const text = `${kind} of ${WITH_THE.has(name) ? 'the ' : ''}${name}`
      return text.charAt(0).toUpperCase() + text.slice(1)
    }
  }
}

/**
 * EL TITULAR DEL RÓTULO (§7.1), que sale del maillot llevado y no es una línea: el del líder no
 * delegado (`Leader, general classification`) y el título del campeón; nada para el delegado (su línea
 * `wears_for` ya lo dice) ni para el de equipo.
 */
export function cardCaption(worn: WornJersey, n: Pick<NameResolver, 'country'>): string | null {
  switch (worn.kind) {
    case 'leader':
      return worn.delegated ? null : `Leader, ${CLASS_NAME[worn.jersey]}`
    case 'champion':
      return championTitleText('en', worn.title, n)
    case 'team':
      return null
  }
}

/** UNA LÍNEA DEL RÓTULO (§7.1), en el orden en que las da `distinctions` (§7.2). */
export function cardLineText(d: Distinction, n: Pick<NameResolver, 'country'>): string {
  switch (d.kind) {
    case 'wears_for':
      return `${JERSEY_NAME[d.jersey]} (${ordinal(d.rank)} in the classification)`
    case 'leads':
      return d.jersey === 'kom'
        ? 'Also leads the mountains'
        : `Also leads the ${CLASS_NAME[d.jersey]}`
    case 'champion':
      return championTitleText('en', d.title, n)
    case 'gc':
      return `${ordinal(d.rank)} overall ${gapText(d.deficitS)}`
    case 'stage_wins':
      return `Won ${d.stages.length === 1 ? 'stage' : 'stages'} ${listAnd(d.stages.map((r) => String(r.stageDay)))}`
  }
}

// ------------------------------------------------------------- la frase de la fuga (§7.6, D-26)

/** Los números en palabras hasta nueve (§7.6); desde diez, en cifras. */
const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
]
const numberWord = (n: number): string => NUMBER_WORDS[n] ?? String(n)
const capitalized = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** El nombre de un país, el de `COUNTRIES` (el `NameResolver` de hoy; el de cada idioma, con E10). */
export const COUNTRY_NAMES: Pick<NameResolver, 'country'> = {
  country: (iso2) => COUNTRIES.find((c) => c.code === iso2)?.name ?? iso2,
}

/**
 * Cómo nombra la frase a un notable, por su nivel (la tabla de §7.5): los niveles 0 a 4 por lo que
 * llevan o lo que son (`the race leader`, `the champion of Italy`), los 5 a 7 por su nombre (7-i).
 * `n` resuelve el país del título.
 */
function notableForm(c: RiderCard, n: Pick<NameResolver, 'country'>): string {
  const titleOf = (): ChampionTitle | null =>
    c.worn.kind === 'champion'
      ? c.worn.title
      : (c.lines.find((d): d is Extract<Distinction, { kind: 'champion' }> => d.kind === 'champion')
          ?.title ?? null)
  /** El título con la primera letra en minúscula, salvo U23 (§7.6). */
  const titleForm = (t: ChampionTitle): string => {
    const text = championTitleText('en', t, n)
    return `the ${text.startsWith('U23') ? text : text.charAt(0).toLowerCase() + text.slice(1)}`
  }
  switch (c.notoriety) {
    case 0:
      return 'the race leader'
    case 1:
    case 4: {
      const t = titleOf()
      return t === null ? c.name : titleForm(t)
    }
    case 2:
      return c.worn.kind === 'leader' && c.worn.jersey !== 'gc'
        ? `the ${c.worn.jersey === 'points' ? 'points' : 'mountains'} leader`
        : c.name
    case 3:
      return c.worn.kind === 'leader'
        ? `${c.name} in the ${JERSEY_NAME[c.worn.jersey].toLowerCase()}`
        : c.name
    case 5: {
      const gc = c.lines.find((d): d is Extract<Distinction, { kind: 'gc' }> => d.kind === 'gc')
      return gc === undefined ? c.name : `${c.name} (${ordinal(gc.rank)} overall)`
    }
    case 6: {
      const wins = c.lines.find(
        (d): d is Extract<Distinction, { kind: 'stage_wins' }> => d.kind === 'stage_wins',
      )
      const last = wins?.stages.at(-1)
      return last === undefined ? c.name : `stage ${last.stageDay} winner ${c.name}`
    }
    default:
      return c.name
  }
}

/** El puesto de salida de un rótulo, si lo trae (su línea `gc`; el líder, el 1). */
function startRankOf(c: RiderCard): number {
  if (c.worn.kind === 'leader' && c.worn.jersey === 'gc' && !c.worn.delegated) return 1
  const gc = c.lines.find((d) => d.kind === 'gc')
  return gc !== undefined && gc.kind === 'gc' ? gc.rank : Number.POSITIVE_INFINITY
}

/** Lo que la frase hace con cada escapado (§7.6), en `RiderIx`. */
export interface BreakHeadlineParts {
  /** los notables que nombra, por (notoriedad, puesto de salida, dorsal): como mucho `breakNamedMax` */
  readonly named: readonly RiderIx[]
  /** los del espectador que no están entre los nombrados, por dorsal: se nombran SIEMPRE (R23.7) */
  readonly own: readonly RiderIx[]
  /** los que se cuentan, por dorsal */
  readonly others: readonly RiderIx[]
}

/**
 * QUIÉN SALE EN LA FRASE DE LA FUGA (§7.6): los notables (nivel por debajo de 8) por su nivel, el
 * puesto de salida y el dorsal, hasta `breakNamedMax`; los del espectador, siempre, y el que además es
 * notable ocupa su hueco por notoriedad y no se repite; y el resto, contado. `ownIx` se suma a la marca
 * `own` de cada carta.
 */
export function breakHeadlineParts(
  cards: readonly RiderCard[],
  ownIx: ReadonlySet<RiderIx>,
): BreakHeadlineParts {
  const byBib = [...cards].sort((a, b) => (a.bib ?? a.ix) - (b.bib ?? b.ix) || a.ix - b.ix)
  const isOwn = (c: RiderCard): boolean => c.own || ownIx.has(c.ix)
  const named = byBib
    .filter((c) => c.notoriety < 8)
    .sort(
      (a, b) =>
        a.notoriety - b.notoriety ||
        startRankOf(a) - startRankOf(b) ||
        (a.bib ?? a.ix) - (b.bib ?? b.ix),
    )
    .slice(0, BROADCAST.breakNamedMax)
  const inNamed = new Set(named.map((c) => c.ix))
  const own = byBib.filter((c) => isOwn(c) && !inNamed.has(c.ix))
  const inOwn = new Set(own.map((c) => c.ix))
  return {
    named: named.map((c) => c.ix),
    own: own.map((c) => c.ix),
    others: byBib.filter((c) => !inNamed.has(c.ix) && !inOwn.has(c.ix)).map((c) => c.ix),
  }
}

/**
 * LA FRASE DE LA FUGA (§7.6; D-26, I-23, R23.4): la del rótulo `break_presented` y la de la voz de
 * `Watch`, que sustituye a la de `breakaway_formed` (12-e). Ordena por notoriedad y cuenta al resto:
 * «se escapan cinco» y «se escapa el campeón de Italia con cuatro más» son carreras distintas. `cards`
 * son las cartas servidas de los escapados (ya con el velo: una carta con el título velado no sale
 * como campeón, §7.8).
 *
 * - Sin notables ni propios: los tres o menos, por su nombre y por dorsal; más, `Five riders go clear.`
 * - El sujeto, los nombrados con la forma de su nivel; sin ellos, los propios (`Your rider {Name}`).
 * - `with …`: los propios que no son sujeto y el resto (`four others`, en palabras hasta nueve).
 * - `, two of them from Team Delta`: si al menos dos de los CONTADOS son del mismo equipo (el que más;
 *   a igualdad, el del dorsal más bajo).
 */
export function breakHeadline(
  _locale: 'en',
  cards: readonly RiderCard[],
  ownIx: ReadonlySet<RiderIx>,
  n: Pick<NameResolver, 'country'> = COUNTRY_NAMES,
): string {
  const parts = breakHeadlineParts(cards, ownIx)
  const cardOf = new Map(cards.map((c) => [c.ix, c] as const))
  const at = (ix: RiderIx): RiderCard => cardOf.get(ix)!
  const isOwn = (ix: RiderIx): boolean => at(ix).own || ownIx.has(ix)
  const yourRiders = (ixs: readonly RiderIx[]): string =>
    `your ${ixs.length === 1 ? 'rider' : 'riders'} ${listAnd(ixs.map((ix) => at(ix).name))}`
  const counted = parts.others
  const teamClause = (): string => {
    const byTeam = new Map<string, { name: string; count: number; minBib: number }>()
    for (const ix of counted) {
      const c = at(ix)
      if (c.team === null) continue
      const t = byTeam.get(c.team.id) ?? {
        name: c.team.name,
        count: 0,
        minBib: Number.POSITIVE_INFINITY,
      }
      byTeam.set(c.team.id, { ...t, count: t.count + 1, minBib: Math.min(t.minBib, c.bib ?? ix) })
    }
    const best = [...byTeam.values()].sort((a, b) => b.count - a.count || a.minBib - b.minBib)[0]
    return best === undefined || best.count < 2
      ? ''
      : `, ${numberWord(best.count)} of them from ${best.name}`
  }
  if (parts.named.length === 0 && parts.own.length === 0) {
    const size = cards.length
    if (size <= BROADCAST.byNamesUpTo) {
      const names = counted.map((ix) => at(ix).name)
      return `${listAnd(names)} ${size === 1 ? 'goes' : 'go'} clear.`
    }
    return `${capitalized(numberWord(size))} riders go clear${teamClause()}.`
  }
  // El sujeto: los nombrados con la forma de su nivel (el propio, `your rider {Name}`); sin ellos, los propios.
  const subject =
    parts.named.length > 0
      ? listAnd(parts.named.map((ix) => (isOwn(ix) ? yourRiders([ix]) : notableForm(at(ix), n))))
      : yourRiders(parts.own)
  const subjectCount = parts.named.length > 0 ? parts.named.length : parts.own.length
  const withParts: string[] = []
  if (parts.named.length > 0 && parts.own.length > 0) withParts.push(yourRiders(parts.own))
  if (counted.length > 0)
    withParts.push(`${numberWord(counted.length)} ${counted.length === 1 ? 'other' : 'others'}`)
  const withText = withParts.length === 0 ? '' : ` with ${listAnd(withParts)}`
  return `${capitalized(subject)} ${subjectCount === 1 ? 'goes' : 'go'} clear${withText}${teamClause()}.`
}

/**
 * LA FRASE DE LA FUGA COMO RÓTULO (§6.5, §7.6; 6-i): el `break_presented` que el reproductor programa en
 * cuanto sale el `break_formed` de la fuga, con los mismos escapados. `named`, los que la frase nombra en
 * su orden (los notables y después los del espectador); `others`, los que cuenta. La frase la escribe
 * `breakHeadline` sobre las cartas de `riders`. Es lo que B3 comprueba en la API y en la web con la
 * cabecera de la ruta.
 */
export function breakPresentedOf(
  formed: Extract<Cue, { readonly kind: 'break_formed' }>,
  cast: readonly RiderCard[],
  own: ReadonlySet<RiderIx>,
): Extract<Cue, { readonly kind: 'break_presented' }> {
  const riders = [...formed.riders].sort((a, b) => a - b)
  const cards = riders.flatMap((r) => (cast[r] === undefined ? [] : [cast[r]]))
  const parts = breakHeadlineParts(cards, own)
  return {
    kind: 'break_presented',
    t: formed.t,
    group: formed.group,
    named: [...parts.named, ...parts.own],
    others: parts.others.length,
    riders,
  }
}

/**
 * A QUIÉNES PRESENTA LA MOTO (6-m, §6.7): todos, por dorsal, si son hasta `nameWholeGroupUpTo`; si no,
 * los que llevan un maillot que no es el de su equipo, después los del espectador y después por nivel
 * de notoriedad (§7.5), hasta `nameWholeGroupUpTo`, por dorsal.
 */
export function breakRoundOf(
  riders: readonly RiderIx[],
  cast: readonly RiderCard[],
): readonly RiderIx[] {
  const byBib = [...riders].sort((a, b) => a - b)
  if (byBib.length <= BROADCAST.nameWholeGroupUpTo) return byBib
  const tier = (r: RiderIx): number => {
    const c = cast[r]
    return c === undefined ? 30 : (c.worn.kind !== 'team' ? 0 : c.own ? 10 : 20) + c.notoriety // NotorietyLevel va de 0 a 8
  }
  return [...byBib]
    .sort((a, b) => tier(a) - tier(b) || a - b)
    .slice(0, BROADCAST.nameWholeGroupUpTo)
    .sort((a, b) => a - b)
}

// ------------------------------------------------------- a quién se nombra en cada grupo (§7.7)

/**
 * A QUIÉN SE NOMBRA en un grupo a la hora del instante (§7.7; D-27, I-46); el resto se cuenta. Un grupo
 * de hasta `nameWholeGroupUpTo` se nombra entero (el mismo umbral que la radio, atado por test, §15.5).
 * En uno mayor, de sus miembros: los que tiran (`g.detail.pullers`, la capa de detalle del último km de
 * foto cruzado), los que llevan un maillot que no es el de su equipo, los `namedGcTop` primeros de la
 * general de salida, los del espectador (R23.7) y los protagonistas de los sucesos YA revelados
 * (`revealed`: la línea cortada no trae otros), así que el que ataca en el km 40 se nombra desde el km 40
 * y no antes. `named` va por `RiderIx` creciente (dorsal).
 */
export function namedRidersOf(
  g: GroupNow,
  cast: readonly RiderCard[],
  revealed: readonly TimelineEvent[],
  ctx: InstantContext,
): { readonly named: readonly RiderIx[]; readonly others: number } {
  const members = [...g.members].sort((a, b) => a - b)
  if (members.length <= BROADCAST.nameWholeGroupUpTo) return { named: members, others: 0 }
  const nameable = new Set<RiderIx>()
  for (const p of g.detail?.pullers ?? []) nameable.add(p.rider)
  for (const c of cast) if (c.worn.kind !== 'team') nameable.add(c.ix)
  for (const row of ctx.start.gcTop) if (row.rank <= BROADCAST.namedGcTop) nameable.add(row.rider)
  for (const r of ctx.own) nameable.add(r)
  for (const e of revealed) for (const r of e.riders) nameable.add(r)
  const named = members.filter((r) => nameable.has(r))
  return { named, others: members.length - named.length }
}

// ----------------------------------------------------------------- los que tiran (§6.4; 6-d)

/** La línea de quién tira de una fila, en datos (el componente pone las palabras, E10). */
export type PullingLine =
  /** todos los equipos del grupo relevan: `Pulling: all 3 in turn` */
  | { readonly k: 'in_turn'; readonly pulling: number; readonly of: number }
  | {
      readonly k: 'teams'
      readonly teams: readonly {
        readonly teamId: string
        readonly count: number
        /** el mismo destinatario en al menos dos de sus relevistas */
        readonly forRider: RiderIx | null
        /** el motivo de más relevistas; a igualdad, el que sale antes en detail.pullers */
        readonly motive: PullMotive | null
      }[]
      readonly moreTeams: number
    }

/**
 * LA LÍNEA DE QUIÉN TIRA de una fila (D-27, I-46; 6-d). null si nadie da la cara en su último km de
 * foto. Un grupo de hasta `nameWholeGroupUpTo` en el que relevan todos sus equipos es una fuga que
 * colabora (`in_turn`); si no, los dos equipos con más relevistas, cada uno con su destinatario si lo
 * comparten al menos dos y, si no, con su motivo mayoritario, y cuántos equipos más tiran.
 */
export function pullingLineOf(
  detail: GroupDetail | null,
  members: readonly RiderIx[],
  cast: readonly RiderCard[],
): PullingLine | null {
  if (detail === null || detail.pullingTotal === 0) return null
  const teamOf = (r: RiderIx): string => cast[r]?.team?.id ?? `solo:${r}`
  const teamsIn = new Set(members.map(teamOf))
  const byTeam = new Map<string, RiderIx[]>()
  for (const p of detail.pullers)
    byTeam.set(teamOf(p.rider), [...(byTeam.get(teamOf(p.rider)) ?? []), p.rider])
  if (members.length <= BROADCAST.nameWholeGroupUpTo && [...teamsIn].every((t) => byTeam.has(t)))
    return { k: 'in_turn', pulling: detail.pullingTotal, of: members.length }
  const ranked = [...byTeam.entries()].sort(
    (a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1),
  )
  const forOf = (team: string): RiderIx | null => {
    const n = new Map<RiderIx, number>()
    for (const p of detail.pullers)
      if (teamOf(p.rider) === team && p.forRider !== null)
        n.set(p.forRider, (n.get(p.forRider) ?? 0) + 1)
    const best = [...n.entries()].sort((a, b) => b[1] - a[1])[0]
    return best !== undefined && best[1] >= 2 ? best[0] : null
  }
  const motiveOf = (team: string): PullMotive | null => {
    const n = new Map<PullMotive, number>()
    for (const p of detail.pullers)
      if (teamOf(p.rider) === team && p.motive !== null) n.set(p.motive, (n.get(p.motive) ?? 0) + 1)
    let best: PullMotive | null = null
    let most = 0
    for (const [m, c] of n)
      if (c > most) {
        best = m
        most = c
      } // el Map guarda el orden de inserción: el primero en llegar gana el empate
    return best
  }
  return {
    k: 'teams',
    teams: ranked.slice(0, 2).map(([teamId, rs]) => ({
      teamId,
      count: rs.length,
      forRider: forOf(teamId),
      motive: motiveOf(teamId),
    })),
    moreTeams: Math.max(0, ranked.length - 2),
  }
}

/**
 * El porqué de un equipo en la línea, en pocas palabras (pantalla): las frases de la radio sin
 * destinatario (`motiveLabel`, RaceRadioPanel.tsx), acortadas para una línea. Un motivo nuevo no
 * compila sin su palabra.
 */
export const PULL_MOTIVE_WORDS = {
  solo: 'alone',
  abanico: 'in the echelon',
  tren: 'lead-out',
  fuga: 'working the break',
  persecucion: 'chasing',
  grupeto: 'just riding',
  equipo_etapa: 'for the stage',
  equipo_maillot: 'defending the jersey',
  equipo_general: 'for the GC',
  rol: 'team duty',
  propio: 'own tempo',
  equipo_puntos: 'for the points jersey',
  equipo_montana: 'for the mountains jersey',
  infiltrado: 'sitting on',
  colocando: 'guarding the leader',
} as const satisfies Readonly<Record<PullMotive, string>>

// ------------------------------------------------------------ la tendencia en la voz (§12.5)

/**
 * LA LÍNEA DE ESTADO DE LA TENDENCIA (§12.5; D-44): `The gap has fallen by 40 seconds in five
 * kilometres.` o `…has grown by 1:10…` desde el minuto, con la ventana en palabras hasta nueve. null
 * sin flecha: la voz la dice solo cuando la flecha pasa a subir o a bajar (quien llama decide cuándo).
 */
export function gapTrendLine(_locale: 'en', trend: GapTrend): string | null {
  if (trend.arrow === 'flat') return null
  const s = Math.round(Math.abs(trend.deltaS))
  const by =
    s < 60
      ? `${s} ${s === 1 ? 'second' : 'seconds'}`
      : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const km = Math.round(trend.windowKm)
  return `The gap has ${trend.arrow === 'down' ? 'fallen' : 'grown'} by ${by} in ${numberWord(km)} ${km === 1 ? 'kilometre' : 'kilometres'}.`
}
