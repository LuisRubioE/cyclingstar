/**
 * LAS NOTICIAS CON DATOS (docs/retransmision.md §4.12 y §12.8, D-45; E2, paso 1a).
 *
 * Hasta la migración `0046_noticias_con_datos` un titular se redactaba en inglés al escribirlo y se
 * guardaba solo el texto (`news.text`): la semilla se tiraba y los datos también, así que no había
 * forma de volver a contarlo en otra lengua, con otro nombre ni tapado por el velo. Ahora se guarda
 * lo que pasó, `NewsPayload` (ids, códigos y números; nunca nombres ni inglés), con su semilla y la
 * revisión de las plantillas, y la frase se pone al LEER con `renderNews`.
 *
 * Este fichero no importa `contracts.ts` (decisión 14-a): el esquema vive aquí y `contracts.ts` lo
 * importa para el `newsItemSchema`, nunca al revés.
 */
import { z } from 'zod'
import { pickVariant, type Variant } from './render/variants.js'
import { HEALTH_STATES, type HealthState } from './rider.js'

/** Por qué un corredor se ha ido de la carrera: race_rosters.abandoned_reason y el titular del abandono. `packages/db/src/stageRun.ts` la importa de aquí desde el paso 4a (4-p). */
export type AbandonReason = 'colapso' | 'fuera_control' | 'lesion' | 'enfermedad' | 'voluntario'
interface OfRace {
  readonly raceId: string
  readonly season: number
} // la carrera como dato: la raceKey es `${raceId}:s${season}`; raceOfHeadline muere

/** Los DATOS de un titular: ids, códigos y números; nunca nombres ni inglés (D-45). Se graban en news.data (0046) con su seed. teamId: el equipo del DÍA del hecho. */
export type NewsPayload =
  | (OfRace & {
      readonly kind: 'stage_win' | 'tt_win' | 'breakaway_win'
      readonly stageDay: number
      readonly riderId: string
      readonly teamId: string | null
    }) // breakaway_win exige además que el ganador fuera en la fuga en la última foto (12-g)
  | (OfRace & {
      readonly kind: 'one_day_win' | 'one_day_tt_win' | 'gc_win' | 'kom'
      readonly stageDay: number
      readonly riderId: string
      readonly teamId: string | null
    }) // stageDay: la etapa que lo cerró (la 1 en las de un día, la última en gc_win y kom)
  | (OfRace & {
      readonly kind: 'gc_lead_taken'
      readonly stageDay: number
      readonly riderId: string
      readonly teamId: string | null
    }) // NUEVA: cambia el líder de la general (I-25)
  | (OfRace & {
      readonly kind: 'jersey_taken'
      readonly stageDay: number
      readonly riderId: string
      readonly teamId: string | null
      readonly jersey: 'points' | 'kom'
    }) // NUEVA: cambia el de puntos o montaña
  | (OfRace & {
      readonly kind: 'abandon'
      readonly stageDay: number | null
      readonly riderId: string
      readonly teamId: string | null
      readonly reason: AbandonReason
    }) // null: se retira entre etapas (riderSchedule.ts, la retirada voluntaria)
  | (OfRace & {
      readonly kind: 'injury'
      readonly stageDay: number
      readonly riderId: string
      readonly teamId: string | null
      readonly days: number
      readonly prevHealth: HealthState
      readonly prevUntilDay: number | null
    }) // prev*: la salud de antes, que applyIncidents conoce, para la máscara de sup. P5
  | {
      readonly kind: 'contract'
      readonly riderId: string
      readonly toTeamId: string
      readonly fromTeamId: string | null
      readonly relocateCountry: string | null
      readonly housingCovered: boolean
    } // housingCovered: offer.payHousing, que el titular solo dice con traslado (12-j)
  | {
      readonly kind: 'retirement'
      readonly riderId: string
      readonly teamId: string | null
      readonly age: number
    }
export type NewsKind = NewsPayload['kind'] // los once que redactaba el motor hasta el 4a (world/news.ts) más gc_lead_taken y jersey_taken

/** Lo que una lista enseña en lugar de las noticias de una etapa velada: UNO por etapa, se escribiera una noticia o cinco (D-45, I-39). Solo en lectura. */
export interface StageReadyItem {
  readonly kind: 'stage_ready'
  readonly raceId: string
  readonly season: number
  readonly stageDay: number
  readonly gameDay: number
}

/** Cómo resuelve un render los ids a texto, al LEER (D-46); E10 añadirá el idioma en cada punto de render. */
export interface NameResolver {
  rider(id: string): string
  team(id: string): string
  race(raceId: string): string
  country(iso2: string): string
  /**
   * De dónde a dónde va la etapa (`stageRouteText`, «Tarragona → Barcelona» o una ciudad sola), o
   * null si no se sabe. No está en el diseño, que es de la v89: desde la v90 todo titular que cita
   * una etapa la sitúa (el dueño: «cada vez que mencione una etapa, que diga siempre el origen y
   * destino»), y la ruta es un nombre, así que se resuelve al leer como los demás.
   */
  route(raceId: string, season: number, stageDay: number): string | null
}

const ofRace = { raceId: z.string().min(1), season: z.number().int().min(0) }
const who = { riderId: z.string().min(1), teamId: z.string().min(1).nullable() }
const stageDay = z.number().int().min(1)
export const abandonReasonSchema = z.enum([
  'colapso',
  'fuera_control',
  'lesion',
  'enfermedad',
  'voluntario',
]) satisfies z.ZodType<AbandonReason>

/** Lo que lee la API de news.data. Una fila que no valida se pinta con su `text`, o no se pinta (§14.2). */
export const newsPayloadSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.enum([
      'stage_win',
      'tt_win',
      'breakaway_win',
      'one_day_win',
      'one_day_tt_win',
      'gc_win',
      'kom',
      'gc_lead_taken',
    ]),
    ...ofRace,
    stageDay,
    ...who,
  }),
  z.object({
    kind: z.literal('jersey_taken'),
    ...ofRace,
    stageDay,
    ...who,
    jersey: z.enum(['points', 'kom']),
  }),
  z.object({
    kind: z.literal('abandon'),
    ...ofRace,
    stageDay: stageDay.nullable(),
    ...who,
    reason: abandonReasonSchema,
  }),
  z.object({
    kind: z.literal('injury'),
    ...ofRace,
    stageDay,
    ...who,
    days: z.number().int().min(1),
    prevHealth: z.enum(HEALTH_STATES),
    prevUntilDay: z.number().int().nullable(),
  }),
  z.object({
    kind: z.literal('contract'),
    riderId: z.string().min(1),
    toTeamId: z.string().min(1),
    fromTeamId: z.string().min(1).nullable(),
    relocateCountry: z.string().length(2).nullable(),
    housingCovered: z.boolean(),
  }),
  z.object({ kind: z.literal('retirement'), ...who, age: z.number().int().min(0) }),
]) satisfies z.ZodType<NewsPayload>

/** Lo que decía ABANDON_DETAIL (stageRun.ts), que se retira: el motivo es un código y la frase se pone al leer. */
const ABANDON_WORDS: Readonly<Record<AbandonReason, string>> = {
  colapso: 'climbs off, out of energy',
  fuera_control: 'eliminated on time',
  lesion: 'injured',
  enfermedad: 'ill',
  voluntario: 'withdraws',
}
/** La baja, como la contaba applyIncidents: semanas desde 14 días, días por debajo. */
const outFor = (d: number): string =>
  d >= 14 ? `${Math.round(d / 7)} weeks` : `${d} day${d === 1 ? '' : 's'}`

/** «stage 4 (Tarragona → Barcelona)», o «stage 4» si la etapa no tiene ruta: el `etapa(d)` del motor hasta el 4a (world/news.ts). */
const stageOf = (d: OfRace & { readonly stageDay: number }, n: NameResolver): string => {
  const route = n.route(d.raceId, d.season, d.stageDay)
  return `stage ${d.stageDay}${route ? ` (${route})` : ''}`
}

/** La variante de NewsPayload de cada kind. No `Extract<NewsPayload, { kind: K }>`: siete kinds comparten variante con una unión en `kind`
 *  (`stage_win | tt_win | breakaway_win` y `one_day_win | one_day_tt_win | gc_win | kom`) y para ellos Extract da `never`;
 *  la intersección se reparte por la unión y solo anula las variantes cuyo `kind` no admite K. */
type Of<K extends NewsKind> = NewsPayload & { readonly kind: K }

/** Las redacciones de cada kind, con su `since`. Todas since 0: reproducen el inglés de hoy salvo la coma de `contract`. */
export const NEWS_VARIANTS: { readonly [K in NewsKind]: readonly Variant<Of<K>>[] } = {
  stage_win: [
    {
      since: 0,
      render: (d, n) => `${n.rider(d.riderId)} wins ${stageOf(d, n)} of the ${n.race(d.raceId)}.`,
    },
  ],
  tt_win: [
    {
      since: 0,
      render: (d, n) =>
        `${n.rider(d.riderId)} wins the ${stageOf(d, n)} time trial at the ${n.race(d.raceId)}.`,
    },
  ],
  breakaway_win: [
    {
      since: 0,
      render: (d, n) =>
        `${n.rider(d.riderId)} wins ${stageOf(d, n)} of the ${n.race(d.raceId)} from the breakaway.`,
    },
  ],
  one_day_win: [
    { since: 0, render: (d, n) => `${n.rider(d.riderId)} wins the ${n.race(d.raceId)}.` },
  ],
  one_day_tt_win: [
    {
      since: 0,
      render: (d, n) => `${n.rider(d.riderId)} wins the ${n.race(d.raceId)} time trial.`,
    },
  ],
  kom: [
    {
      since: 0,
      render: (d, n) =>
        `${n.rider(d.riderId)} wins the mountains classification at the ${n.race(d.raceId)}.`,
    },
  ],
  gc_win: [
    { since: 0, render: (d, n) => `${n.rider(d.riderId)} wins the ${n.race(d.raceId)} overall.` },
  ],
  gc_lead_taken: [
    {
      since: 0,
      render: (d, n) => `${n.rider(d.riderId)} takes the overall lead at the ${n.race(d.raceId)}.`,
    },
  ],
  jersey_taken: [
    {
      since: 0,
      render: (d, n) =>
        `${n.rider(d.riderId)} takes the ${d.jersey === 'points' ? 'points' : 'mountains'} lead at the ${n.race(d.raceId)}.`,
    },
  ],
  contract: [
    {
      since: 0,
      render: (d, n) =>
        `${n.rider(d.riderId)} signs for ${n.team(d.toTeamId)}${d.relocateCountry === null ? '' : `, relocating to ${n.country(d.relocateCountry)}${d.housingCovered ? ' with housing covered' : ''}`}.`,
    },
  ],
  injury: [
    {
      since: 0,
      render: (d, n) => `${n.rider(d.riderId)} injured — out for ${outFor(d.days)}.`,
    },
  ],
  abandon: [
    {
      since: 0,
      render: (d, n) =>
        `${n.rider(d.riderId)} abandons the ${n.race(d.raceId)}${d.stageDay === null ? '' : ` on ${stageOf({ raceId: d.raceId, season: d.season, stageDay: d.stageDay }, n)}`} — ${ABANDON_WORDS[d.reason]}.`,
    },
  ],
  retirement: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} retires at ${d.age}.` }],
}

/** EL TITULAR AL LEER (D-45). Semilla y revisión, las de la fila. `_locale`: el literal 'en' hasta E10, que ensancha el tipo y lo renombra
 *  cuando lo lea; con el nombre sin `_`, `noUnusedParameters` (tsconfig.base.json) da TS6133. */
export function renderNews(
  _locale: 'en',
  p: NewsPayload,
  seed: string,
  rev: number,
  n: NameResolver,
): string {
  const variants = NEWS_VARIANTS[p.kind] as readonly Variant<NewsPayload>[]
  return pickVariant(`news:${p.kind}:${seed}`, variants, rev).render(p, n)
}
