/**
 * EL VELO EN LA WEB DEL MUNDO (E2, docs/retransmision.md §11.4 a §11.6 y §11.12; D-39, I-37, I-39; paso 9b).
 *
 * Lo que la portada, los avisos de los agregados, la ficha de carrera y las órdenes pintan del velo de
 * quien mira, puro y sin DOM. Todo sale de dos fuentes que no dependen de lo que pasó en las etapas
 * veladas: el horizonte de quien mira (`GET /api/me/horizon`, `HorizonSummary`: qué etapas tiene por ver,
 * por qué, a medias y caducadas) y el calendario público (`GET /api/calendar`: cuántas etapas tiene cada
 * carrera, sus km y su tipo). Es la regla de §11.6: todo aviso depende solo del horizonte.
 */
import {
  type CalendarRaceSummary,
  DAYS_PER_SEASON,
  type HorizonSummary,
  type PreStageInfo,
  SPOILER,
  STAGE_KIND_WORDS,
  type SpoilerScope,
  type StageKind,
  currentSeason,
  digestMinutes,
  parseRaceKey,
} from '@cyclingstar/shared'

/**
 * ¿Lo que se ve está cortado por el velo de quien mira? Solo con un `rev` de espectador,
 * `${currentDay}.${horizon_rev}` (10-h): `'world'` (sin velo para él), `'anon'` (el visitante) y
 * `'unavailable'` no lo están. Es lo que enciende los avisos y los botones del velo en el mundo (9b): con
 * `SPOILER_MODE` apagado, o en `admins` para un jugador, la web es la de hoy. Nació en `queryClient.ts`, que
 * lo reexporta (y lo usa): así este fichero va con la caché, que toda página carga al arrancar.
 */
export function veilApplies(rev: string | undefined): boolean {
  return rev !== undefined && /^\d+\.\d+$/.test(rev)
}

/** Una carrera con etapas en el velo (`HorizonSummary.ready[]`). */
export type ReadyRace = HorizonSummary['ready'][number]

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

/** El número del aviso (11-m): las etapas del velo de quien mira, la suma de `ready[].stages`. */
export function hiddenStageCount(h: HorizonSummary | null | undefined): number {
  return (h?.ready ?? []).reduce((n, r) => n + r.stages.length, 0)
}

/** La clave de una carrera en la temporada del día de juego (`${raceId}:s${season}`); sin mundo, null. */
export function raceKeyOn(raceId: string, gameDay: number | null | undefined): string | null {
  return gameDay == null ? null : `${raceId}:s${currentSeason(gameDay)}`
}

/** Lo velado de una carrera para quien mira, o null si no está en su velo. */
export function raceVeil(
  h: HorizonSummary | null | undefined,
  raceKey: string | null,
): ReadyRace | null {
  if (raceKey === null) return null
  return h?.ready.find((r) => r.raceKey === raceKey) ?? null
}

/** La última etapa está en el velo: la carrera terminó y quien mira no sabe cómo (`Finished · ready to watch`). */
export function finalVeiled(veil: Pick<ReadyRace, 'stages'> | null, stageCount: number): boolean {
  return veil !== null && veil.stages.includes(stageCount)
}

/** «stage 10» o «stages 10-12»: lo velado de una carrera es un tramo seguido (lo conocido es un prefijo, D-31). */
export function stagesText(stages: readonly number[]): string {
  const first = Math.min(...stages)
  const last = Math.max(...stages)
  return first === last ? `stage ${first}` : `stages ${first}-${last}`
}

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * La cabecera de la ficha de una carrera en guardia (§11.5, sup. C2): `After stage 9 of 21 · stages 10-12
 * ready to watch`, con las tablas de tras la 9. Sin ninguna conocida, sin el `After`.
 */
export function raceVeilNotice(stages: readonly number[], stageCount: number): string {
  const k = Math.min(...stages) - 1
  return k >= 1
    ? `After stage ${k} of ${stageCount} · ${stagesText(stages)} ready to watch`
    : `${capital(stagesText(stages))} ready to watch`
}

/**
 * EL AVISO DE LOS AGREGADOS (§11.5 y §11.6; I-39, 11-m): el ranking dice que está a horizonte y cuántas
 * etapas esconde; los demás (premios, salón, récords, naciones, equipos, fichas, el libro de cuentas),
 * cuántos resultados esconden. El número es el del velo de quien mira, el mismo en todas las páginas,
 * pase lo que pase en esas etapas y salga o no ese corredor en ellas. Sin velo, nada.
 */
export function aggregateNotice(kind: 'ranking' | 'results', n: number): string | null {
  if (n <= 0) return null
  const stages = `${n} ${plural(n, 'stage', 'stages')}`
  return kind === 'ranking'
    ? `World ranking · as you know it · ${stages} hidden`
    : `Results from ${stages} you haven't watched are hidden`
}

// -------------------------------------------------------------------------- la portada (§11.4)

/** Una tarjeta de `Ready to watch`: lo que dice de una etapa es recorrido (N), nunca resultado. */
export interface StageCard {
  readonly raceId: string
  readonly raceKey: string
  readonly stageDay: number
  /** `Stage 12 · 187 km · mountain stage`; en una carrera de un día, sin el número */
  readonly text: string
}

/** Una fila de `Ready to watch`: una carrera en curso con etapas por ver. */
export interface ReadyRow {
  readonly raceKey: string
  readonly raceId: string
  readonly raceName: string
  /** `Race France · 4 stages ready to watch`; o, con todo por ver en una de cabecera, `… is under way` */
  readonly header: string
  /** su corredor estaba en la LISTA DE SALIDA (`reason = 'own_rider'`), nunca porque hiciera algo */
  readonly ownRider: boolean
  readonly cards: readonly StageCard[]
}

/** Un bloque de `While you were away`: una carrera en guardia TERMINADA con etapas veladas (11-q). */
export interface AwayBlock {
  readonly raceKey: string
  readonly raceId: string
  readonly raceName: string
  readonly header: string
  readonly stageCount: number
  /** `Continue from stage 5`: la primera velada, en orden */
  readonly continueFrom: number
  /** `Show results`: revela la última y arrastra las demás (§11.11) */
  readonly lastStage: number
  /** `Key stages`: las veladas que marca el perfil (reinas, cronos y la última), en `Highlights` */
  readonly keyStages: readonly number[]
  /** `Watch the race in 33 minutes`: el digest de las veladas, con el número de `digestMinutes` (8-b; 10a) */
  readonly digestMinutes: number
}

/** Una fila de `Continue watching`: una etapa a medias. */
export interface WatchingRow {
  readonly raceKey: string
  readonly raceId: string
  readonly stageDay: number
  /** `Race France · Stage 5 · 42 km to go` */
  readonly text: string
}

export interface HomeBlocks {
  readonly watching: readonly WatchingRow[]
  readonly ready: readonly ReadyRow[]
  readonly away: readonly AwayBlock[]
}

const kindWords = (kind: string): string =>
  (STAGE_KIND_WORDS as Record<string, string>)[kind] ?? STAGE_KIND_WORDS.llana

const STAGE_KINDS: ReadonlySet<string> = new Set(['llana', 'media', 'reina', 'cri', 'clasica'])
/** El tipo de una etapa del calendario (`kind` va como texto), con la crono por su `timeTrial`. */
const stageKindOf = (s: { readonly kind: string; readonly timeTrial: boolean }): StageKind =>
  s.timeTrial ? 'cri' : STAGE_KINDS.has(s.kind) ? (s.kind as StageKind) : 'llana'

/**
 * EL ENLACE A `Watch` CON SU CURVA (§8.1, §11.4; 10a): `Highlights` (`?view=highlights`) o el digest de
 * una etapa a otra (`?view=digest&from=5&to=21`, 8-c), siempre con `?tab=watch`; en una carrera de un día,
 * su ficha, que es su etapa (§11.17).
 */
export function watchHref(
  raceId: string,
  stageDay: number,
  oneDay: boolean,
  view: 'highlights' | 'digest',
  to: number = stageDay,
): string {
  const page = oneDay ? `/world/races/${raceId}` : `/world/races/${raceId}/stages/${stageDay}`
  const range = view === 'digest' && !oneDay ? `&from=${stageDay}&to=${to}` : ''
  return `${page}?tab=watch&view=${view}${range}`
}

function cardOf(race: CalendarRaceSummary, raceKey: string, stageDay: number): StageCard | null {
  const s = race.stages.find((x) => x.index === stageDay)
  if (s === undefined) return null
  const where = race.stages.length === 1 ? [] : [`Stage ${stageDay}`]
  return {
    raceId: race.id,
    raceKey,
    stageDay,
    text: [...where, `${Math.round(s.km)} km`, kindWords(s.kind as StageKind)].join(' · '),
  }
}

/**
 * LOS TRES BLOQUES DE LA PORTADA (§11.4): de `HorizonSummary` y del calendario. Una carrera cuya última
 * etapa está velada está TERMINADA (lo velado son etapas corridas y lo conocido es un prefijo) y va a
 * `While you were away`, no a `Ready to watch` (11-q). El orden es el de `ready`, la más antigua primero
 * (§8.8). Sin el calendario, nada: las tarjetas necesitan los km y el tipo.
 */
export function homeBlocks(h: HorizonSummary, races: readonly CalendarRaceSummary[]): HomeBlocks {
  const byId = new Map(races.map((r) => [r.id, r]))
  const raceOf = (raceKey: string): CalendarRaceSummary | undefined =>
    byId.get(parseRaceKey(raceKey).raceId)
  const ready: ReadyRow[] = []
  const away: AwayBlock[] = []
  for (const r of h.ready) {
    const race = raceOf(r.raceKey)
    if (race === undefined || r.stages.length === 0) continue
    const S = Math.max(1, race.stages.length)
    const n = r.stages.length
    const count = S === 1 ? 'ready to watch' : `${n} ${plural(n, 'stage', 'stages')} ready to watch`
    if (finalVeiled(r, S)) {
      const kinds = new Map(race.stages.map((s) => [s.index, s]))
      away.push({
        raceKey: r.raceKey,
        raceId: race.id,
        raceName: r.raceName,
        header: `${r.raceName} · ${count}`,
        stageCount: S,
        continueFrom: Math.min(...r.stages),
        lastStage: S,
        keyStages: r.stages.filter((d) => {
          const s = kinds.get(d)
          return d === S || s?.kind === 'reina' || s?.kind === 'cri' || s?.timeTrial === true
        }),
        digestMinutes: digestMinutes(
          r.stages.flatMap((d) => {
            const s = kinds.get(d)
            return s === undefined ? [] : [stageKindOf(s)]
          }),
        ),
      })
      continue
    }
    const last = Math.max(...r.stages)
    // Una cuenta nueva conoce hasta la 0: una de cabecera en curso es suya para ver desde la salida.
    const underWay = r.reason === 'headline' && Math.min(...r.stages) === 1
    ready.push({
      raceKey: r.raceKey,
      raceId: race.id,
      raceName: r.raceName,
      header: underWay
        ? `${r.raceName} is under way · Stage ${last} of ${S} · Watch from the start`
        : `${r.raceName} · ${count}`,
      ownRider: r.reason === 'own_rider',
      cards: r.stages.flatMap((d) => cardOf(race, r.raceKey, d) ?? []),
    })
  }
  const watching = h.watching.flatMap((w): WatchingRow[] => {
    const race = raceOf(w.raceKey)
    if (race === undefined) return []
    const name = h.ready.find((r) => r.raceKey === w.raceKey)?.raceName ?? race.name
    const where = race.stages.length === 1 ? [] : [`Stage ${w.stageDay}`]
    return [
      {
        raceKey: w.raceKey,
        raceId: race.id,
        stageDay: w.stageDay,
        text: [name, ...where, `${Math.round(w.toGoKm)} km to go`].join(' · '),
      },
    ]
  })
  return { watching, ready, away }
}

// ------------------------------------------------------- la caducidad y la oferta (§10.4, §10.5)

/** El acuse de una carrera caducada (§10.5, 10-f): se enseña una vez y revela su última etapa con `X`. */
export interface ExpiredNotice {
  readonly raceKey: string
  readonly raceId: string
  readonly lastStage: number
  /** `Results of Race Italy are now shown (finished 16 days ago)` */
  readonly text: string
}

/**
 * Una por carrera de `expiredSinceLastVisit` que el calendario conoce. Los días son reales: los de juego
 * desde su última etapa, al ritmo del tick (`tickIntervalMinutes`, cuatro días de juego por día real con
 * el de 6 h), redondeados.
 */
export function expiredNotices(
  h: HorizonSummary,
  races: readonly CalendarRaceSummary[],
  gameDay: number,
  tickIntervalMinutes: number,
): ExpiredNotice[] {
  return h.expiredSinceLastVisit.flatMap((raceKey): ExpiredNotice[] => {
    const { raceId, season } = parseRaceKey(raceKey)
    const race = races.find((r) => r.id === raceId)
    if (race === undefined || season === null) return []
    const S = Math.max(1, race.stages.length)
    const lastDay = season * DAYS_PER_SEASON + race.startDay + S - 1 + race.restAfter.length
    const realDays = Math.max(0, Math.round(((gameDay - lastDay) * tickIntervalMinutes) / 1440))
    return [
      {
        raceKey,
        raceId,
        lastStage: S,
        text: `Results of ${race.name} are now shown (finished ${realDays} ${plural(realDays, 'day', 'days')} ago)`,
      },
    ]
  })
}

const HEADLINE: ReadonlySet<string> = new Set(SPOILER.headlineRaces)

/**
 * LA OFERTA ADAPTATIVA (DD-16, 10-b): la web cuenta como ignorada cada carrera de cabecera que aparece en
 * `expiredSinceLastVisit` (caducó con etapas veladas: no la terminó de ver). Devuelve la lista acumulada,
 * sin repetir; vive en el `localStorage` de este navegador, porque el esquema no tiene dónde.
 */
export function adaptiveIgnored(prev: readonly string[], expired: readonly string[]): string[] {
  const out = [...prev]
  for (const raceKey of expired)
    if (HEADLINE.has(parseRaceKey(raceKey).raceId) && !out.includes(raceKey)) out.push(raceKey)
  return out
}

/** Se ofrece una sola vez (`cs.adaptiveAsked`), con `guarded`, tras `SPOILER.adaptiveAskAfterRaces` ignoradas. */
export function adaptiveOfferDue(
  ignored: readonly string[],
  asked: boolean,
  scope: SpoilerScope,
): boolean {
  return !asked && scope === 'guarded' && ignored.length >= SPOILER.adaptiveAskAfterRaces
}

// ----------------------------------------------------------- las órdenes de la N+1 (§11.12)

/** La etapa que espera a quien mira en esa carrera: la primera corrida y no conocida; null si no hay. */
export function waitingStage(h: HorizonSummary | null | undefined, raceKey: string): number | null {
  const veil = raceVeil(h, raceKey)
  return veil === null || veil.stages.length === 0 ? null : Math.min(...veil.stages)
}

// --------------------------------------------------------- la última carrera (§11.4, sup. H1 y H5)

/** `Your last race · Race France, Stage 8 · Ready to watch`; de una carrera de un día, sin la etapa. */
export function lastRaceReadyText(
  ready: Pick<PreStageInfo, 'raceName' | 'stageDay' | 'stageCount'>,
): string {
  const where =
    ready.stageCount === 1 ? ready.raceName : `${ready.raceName}, Stage ${ready.stageDay}`
  return `Your last race · ${where} · Ready to watch`
}

/**
 * La carrera de esa `PreStageInfo` (que por tipo no lleva su id, D-42), en el horizonte de quien mira: la
 * de ese nombre con esa etapa en el velo. Null si no está (quien lee con `cs_viewer` no recibe la lista).
 */
export function readyRaceKey(
  h: HorizonSummary | null | undefined,
  ready: Pick<PreStageInfo, 'raceName' | 'stageDay'>,
): string | null {
  return (
    h?.ready.find((r) => r.raceName === ready.raceName && r.stages.includes(ready.stageDay))
      ?.raceKey ?? null
  )
}
