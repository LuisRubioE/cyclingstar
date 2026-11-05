import {
  type BibStyle,
  COUNTRY_NAMES,
  KIT_BASES,
  KIT_SECONDARIES,
  type Kit,
  type KitBase,
  type KitBlockedWhy,
  type KitCode,
  type KitColorName,
  type KitFigure,
  type KitVerdict,
  bibStylesFor,
  currentSeason,
  kitCode,
  seasonPosition,
} from '@cyclingstar/shared'

/**
 * EL EDITOR DEL MAILLOT, SIN PANTALLA (E3, docs/visual.md §8.7; PR 18b; 8-u, D-00h, D-00k). Lo que decide
 * `KitPicker` y que se prueba solo: el borrador por partes y su código, las muestras que no se pueden
 * elegir con la figura y la base de ese momento, los textos del veredicto (pantalla) y lo que dice la
 * `ActionBar` del guardado único (8-h).
 */

/** El maillot que se edita, por partes: el segundo color se recuerda aunque la figura sea lisa. */
export interface KitDraft {
  readonly figure: KitFigure
  readonly base: KitBase
  readonly secondary: KitColorName
}

/** El borrador de un maillot; de un liso, con un segundo color que no es su base para cuando cambie. */
export function draftOf(kit: Kit): KitDraft {
  if (kit.figure !== 'plain') return kit
  return { ...kit, secondary: kit.base === 'navy' ? 'white' : 'navy' }
}

/** El maillot del borrador: un liso no lleva segundo color. */
export function draftKit(d: KitDraft): Kit {
  return d.figure === 'plain'
    ? { figure: 'plain', base: d.base }
    : { figure: d.figure, base: d.base, secondary: d.secondary }
}

export const draftCode = (d: KitDraft): KitCode => kitCode(draftKit(d))

export const withFigure = (d: KitDraft, figure: KitFigure): KitDraft => ({ ...d, figure })

/** Otra base: si es el segundo color de ahora, los dos se cambian de sitio. */
export const withBase = (d: KitDraft, base: KitBase): KitDraft =>
  base === d.secondary ? { ...d, base, secondary: d.base } : { ...d, base }

/** Otro segundo color; el de la base no se puede. */
export const withSecondary = (d: KitDraft, secondary: KitColorName): KitDraft =>
  secondary === d.base ? d : { ...d, secondary }

/** Por qué no se puede elegir una muestra: lo que dice la API, o que es el color de la base. */
export type SwatchBlock = KitBlockedWhy | 'mismo'

export interface Swatch {
  readonly color: KitColorName
  readonly selected: boolean
  readonly blocked: SwatchBlock | null
}

/** Las trece de la base, con la figura y el segundo color de ese momento; la elegida, nunca tachada. */
export function baseSwatches(
  d: KitDraft,
  blocked: ReadonlyMap<KitCode, KitBlockedWhy>,
): readonly Swatch[] {
  return KIT_BASES.map((color) => {
    const selected = color === d.base
    return {
      color,
      selected,
      blocked: selected ? null : (blocked.get(draftCode(withBase(d, color))) ?? null),
    }
  })
}

/** Las quince del segundo color, con la figura y la base de ese momento (§8.7): la de la base, tachada. */
export function secondarySwatches(
  d: KitDraft,
  blocked: ReadonlyMap<KitCode, KitBlockedWhy>,
): readonly Swatch[] {
  return KIT_SECONDARIES.map((color) => {
    const selected = color === d.secondary
    const why: SwatchBlock | null =
      color === d.base
        ? 'mismo'
        : selected
          ? null
          : (blocked.get(draftCode({ ...d, secondary: color })) ?? null)
    return { color, selected, blocked: why }
  })
}

/** El porqué de una muestra tachada, que sale debajo al tocarla, nunca en un `title` (pantalla). */
export const SWATCH_REASON: Readonly<Record<SwatchBlock, string>> = {
  contraste: 'Too alike: the pattern would disappear in greyscale.',
  reservado: 'Too close to a leader or champion design. Those are reserved.',
  ocupado: 'Another team already wears this kit.',
  rival: 'Too close to a team you race.',
  mismo: 'That is the main colour.',
}

/** Lo que estorba de una señal reservada (§8.7): los tres líderes, el mundial y el continental. */
const RESERVED_NAME: Readonly<Record<string, string>> = {
  'leader:gc': 'the yellow jersey',
  'leader:points': 'the green jersey',
  'leader:kom': 'the blue jersey',
  'champion:world': "the world champion's jersey",
  'champion:continental': "the continental champion's jersey",
}

/** El texto de un maillot reservado; un nacional, con el de D-00h. */
export function reservedText(signal: string | null): string {
  const named = signal === null ? undefined : RESERVED_NAME[signal]
  if (named !== undefined) return `Too close to ${named}. Leader and champion designs are reserved.`
  const country = signal?.startsWith('champion:') ? signal.slice('champion:'.length) : null
  if (country !== null) return `Too close to the champion of ${COUNTRY_NAMES.country(country)}.`
  return 'Too close to a leader or champion design. Those are reserved.'
}

/** Las visiones, por su nombre: un choque en visión normal no nombra ninguna. */
const VISION_NAME = { protan: 'protanopia', deutan: 'deuteranopia', tritan: 'tritanopia' } as const

/** Un cambio por temporada (D-00k): el primer día de la temporada siguiente, la de la API. */
export function lockedText(nextChangeDay: number): string {
  return `You can change your kit once per season. Next change from Day 1 · Season ${currentSeason(nextChangeDay) + 1}.`
}

/** El programado (§8.7): `New kit from tomorrow (day 51).`; sin el día de hoy (`/health`), solo el día. */
export function scheduledText(validFromDay: number, today: number | null): string {
  const day = seasonPosition(validFromDay).dayOfSeason
  return today !== null && validFromDay === today + 1
    ? `New kit from tomorrow (day ${day}).`
    : `New kit from day ${day}.`
}

/** Lo que cambia al guardar un maillot, en la `ActionBar`: vale desde mañana (§8.7). */
export function kitConsequence(today: number | null): string {
  return today === null
    ? 'New kit from tomorrow'
    : `New kit from tomorrow (day ${seasonPosition(today + 1).dayOfSeason})`
}

/** Sin los paneles, y con el cuerpo negro: los dos pasos hacia un culote que vale. */
const BIB_LISO: Readonly<Record<BibStyle, BibStyle>> = {
  black: 'black',
  'black.panel': 'black',
  base: 'base',
  'base.panel': 'base',
}
const BIB_NEGRO: Readonly<Record<BibStyle, BibStyle>> = {
  black: 'black',
  'black.panel': 'black.panel',
  base: 'black',
  'base.panel': 'black.panel',
}

/**
 * El culote que vale con un maillot (`bibStylesFor`, §8.10): el elegido o, si no vale, el que se ve igual.
 * Con la base negra, el «del color de la base» es el negro; sin paneles que se vean, el liso. El editor
 * enseña y guarda este, así que lo que se ve es lo que se guarda.
 */
export function bibFor(kit: Kit, bib: BibStyle): BibStyle {
  const valen = new Set(bibStylesFor(kit))
  const candidatos = [bib, BIB_LISO[bib], BIB_NEGRO[bib], BIB_LISO[BIB_NEGRO[bib]]]
  return candidatos.find((b) => valen.has(b)) ?? 'black'
}

/** La línea del veredicto (§8.7), con su tono: el `Notice` `good` o `warn`. */
export function verdictLine(v: KitVerdict): {
  readonly tone: 'good' | 'warn'
  readonly text: string
} {
  switch (v.code) {
    case null:
      return { tone: 'good', text: 'Distinct from every team in your races.' }
    case 'kit_ocupado':
      return {
        tone: 'warn',
        text: `This kit is already worn by ${v.takenBy?.teamName ?? 'another team'}.`,
      }
    case 'kit_se_confunde': {
      const name = v.conflict?.teamName ?? 'a team you race'
      const vision = v.conflict?.vision ?? 'normal'
      return {
        tone: 'warn',
        text:
          vision === 'normal'
            ? `Too close to ${name}. Try another colour or figure.`
            : `Too close to ${name} for colour-blind viewers (${VISION_NAME[vision]}). Try another colour or figure.`,
      }
    }
    case 'kit_reservado':
      return { tone: 'warn', text: reservedText(v.reserved) }
    case 'kit_contraste':
      return { tone: 'warn', text: SWATCH_REASON.contraste }
    case 'kit_igual':
      return { tone: 'warn', text: 'That is the kit you already have.' }
    case 'kit_reciente':
      return { tone: 'warn', text: lockedText(v.nextChangeDay ?? 0) }
  }
}

/** El veredicto que pide el editor a los 300 ms del último toque: nada que mirar, mirando, el que dio o un fallo. */
export type CheckState =
  | { readonly status: 'idle' }
  | { readonly status: 'busy' }
  | { readonly status: 'done'; readonly verdict: KitVerdict }
  | { readonly status: 'error' }

/** El `data-state` de la raíz de `KitPicker` (§8.7, la tabla de estados). */
export type PickerState =
  | 'ready'
  | 'busy'
  | 'dirty'
  | 'disabled'
  | 'saving'
  | 'saved'
  | 'failed'
  | 'offline'
  | 'error'
  | 'readonly'

/**
 * El estado del editor. Sin cambios del maillot, `ready` (o `dirty`, si cambia el culote); ya cambiado esta
 * temporada, `disabled`, aunque el culote se pueda cambiar igual, porque no cuenta (D-00k); lo de guardar,
 * el de la `ActionBar`; y con un maillot nuevo, el de su veredicto: `disabled` si no se puede elegir de
 * ningún modo (sin contraste, o ya cambiado), `dirty` si es libre o choca con algo.
 */
export function pickerState(o: {
  readonly readonly: boolean
  readonly locked: boolean
  readonly kitChanged: boolean
  readonly bibChanged: boolean
  readonly save: 'idle' | 'saving' | 'saved' | 'failed'
  readonly check: CheckState
  readonly online: boolean
}): PickerState {
  if (o.readonly) return 'readonly'
  if (o.save !== 'idle') return o.save
  if (o.locked) return 'disabled'
  if (!o.kitChanged) return o.bibChanged ? 'dirty' : 'ready'
  switch (o.check.status) {
    case 'idle':
    case 'busy':
      return 'busy'
    case 'error':
      return o.online ? 'error' : 'offline'
    case 'done':
      return o.check.verdict.code === 'kit_contraste' || o.check.verdict.code === 'kit_reciente'
        ? 'disabled'
        : 'dirty'
  }
}

/** Lo que dice la `ActionBar` del guardado único (8-h): `Save kit` si solo cambia el maillot o el culote. */
export function saveSummary(o: {
  readonly kit: string | null
  readonly bib: string | null
  readonly name: string | null
  readonly country: string | null
}): { readonly changes: number; readonly consequence: string; readonly actionLabel: string } {
  const parts = [
    o.kit,
    o.bib,
    o.name === null ? null : `Name: ${o.name}`,
    o.country === null ? null : `Country: ${o.country}`,
  ].filter((p) => p !== null)
  return {
    changes: parts.length,
    consequence: parts.join(' · '),
    actionLabel: o.name === null && o.country === null ? 'Save kit' : 'Save changes',
  }
}

/** Lo que se guarda de una vez (8-h): el nombre y el país, si cambian, y el maillot y el culote. */
export interface IdentityChanges {
  readonly team: {
    readonly name?: string | undefined
    readonly country?: string | undefined
  } | null
  readonly kit: { readonly kit?: KitCode; readonly bib?: BibStyle } | null
}

/** Un guardado: si fue bien, y si el equipo ya quedó guardado aunque el maillot fallara. */
export type IdentitySaved =
  | { readonly ok: true; readonly teamSaved: boolean }
  | { readonly ok: false; readonly teamSaved: boolean; readonly code: string | null }

/**
 * El guardado único (8-h): primero `PUT /api/teams/me` y después `PUT /api/teams/me/kit`, solo lo que
 * cambia, y un solo resultado. Si el equipo falla, el maillot no se pide.
 */
export async function saveIdentity(
  changes: IdentityChanges,
  api: {
    readonly updateTeam: (edit: NonNullable<IdentityChanges['team']>) => Promise<unknown>
    readonly saveKit: (body: NonNullable<IdentityChanges['kit']>) => Promise<unknown>
    /** el código del servidor de un fallo (`ApiError.code`) */
    readonly codeOf: (error: unknown) => string | null
  },
): Promise<IdentitySaved> {
  let teamSaved = false
  try {
    if (changes.team !== null) {
      await api.updateTeam(changes.team)
      teamSaved = true
    }
    if (changes.kit !== null) await api.saveKit(changes.kit)
    return { ok: true, teamSaved }
  } catch (error) {
    return { ok: false, teamSaved, code: api.codeOf(error) }
  }
}

/** Los códigos con que `PUT /api/teams/me/kit` dice que el maillot no vale (§8.7). */
const KIT_REFUSED: ReadonlySet<string> = new Set([
  'kit_igual',
  'kit_contraste',
  'kit_reservado',
  'kit_ocupado',
  'kit_se_confunde',
])

/**
 * Qué hace la página con un guardado que falla: `locked`, ya cambiado esta temporada (el 429 que no es el
 * del límite de peticiones, 8-v); `kit`, un maillot que dejó de valer desde el veredicto; `other`, el
 * error de un campo o `Could not save. Try again.`
 */
export function saveFailure(code: string | null): 'locked' | 'kit' | 'other' {
  if (code === 'kit_reciente') return 'locked'
  return code !== null && KIT_REFUSED.has(code) ? 'kit' : 'other'
}
