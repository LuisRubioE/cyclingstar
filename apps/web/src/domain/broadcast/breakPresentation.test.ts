/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  BROADCAST,
  type ChampionTitle,
  type Cue,
  type Instant,
  type InstantContext,
  type RiderCard,
  type RiderIx,
  type ShownCue,
  type StageTimeline,
  admitCue,
  aheadOfPeloton,
  breakRoundOf,
  decodeTimeline,
  fromDs,
  instantAt,
  paceAt,
  photoBlocksOf,
  riderCardsOf,
  startStateOf,
  staticNotoriety,
  visibilityOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { type CueDeck, type CueDeckContext, cueDeckInit, cueDeckStep } from './player'

/**
 * B3, SEGUNDA PARTE · LA PRESENTACIÓN DE LA FUGA (docs/retransmision.md §6.7 y §16.4; 6-m, 16-p;
 * [DUEÑO 3]: «cuando se escapan cinco, que se vean sus maillots»). Corre el reproductor de verdad sin
 * navegador, sus funciones puras (`cuesBetween` y la programación de §6.5 en `cueDeckStep`, `admitir`,
 * el fotograma de la cola, `isPresentation`, `aheadOfPeloton`, `breakRoundOf`), a 60 fotogramas por
 * segundo de pared, con el instante a `overlayHz` como `Watch`, y con la cabecera que arma la ruta: el
 * reparto servido y la salida de `riderCardsOf` y `startStateOf`, las mismas funciones de `shared` que
 * llama `serveCast` (la primera parte de B3, en `apps/api/src/broadcastFixtures.test.ts`, las comprueba
 * sobre la cabecera servida).
 *
 * Lee los fixtures congelados de `apps/api/src/__fixtures__/broadcast/` con `readFileSync`, como
 * `clientCost.test.ts`, y por eso lleva la referencia a los tipos de Node. El reloj es el de la curva
 * del modo por la velocidad (§8.2): la cola no lo frena (D-21), y la línea entera es la servida (B9).
 *
 * Umbral 100 %: (1) la lista y la frase de toda fuga salen enteras, salvo que no quede ningún escapado
 * por delante del pelotón; (2) en Watch a ×½ y ×1, todo escapado de la ronda que sigue por delante del
 * pelotón cuando le toca tiene su rótulo entero; (3) ningún rótulo de la ronda empieza con su corredor
 * ya fuera de cabeza. Imprime, sin umbral, la ronda a ×2 y el retraso del último rótulo de cada ronda.
 */

const ROAD = [
  'race-france-e7',
  'race-france-e18',
  'race-france-e20',
  'race-flanders-e1',
  'race-colombia-e5',
] as const
type Road = (typeof ROAD)[number]

function lineOf(name: Road): StageTimeline {
  const url = new URL(
    `../../../../api/src/__fixtures__/broadcast/${name}.timeline.gz`,
    import.meta.url,
  )
  return decodeTimeline(JSON.parse(gunzipSync(readFileSync(url)).toString('utf8')))
}

/** La cabecera que arma la ruta, en lo que la cola lee: el reparto servido y la salida (§7.8, §4.11). */
function headOf(tl: StageTimeline): { cast: RiderCard[]; ctx: InstantContext } {
  const cast = riderCardsOf(tl.cast, { rider: (id) => id, team: (id) => id }, new Set(), 'elite')
  const start = startStateOf(tl.cast, tl.riderIds.length)
  return {
    cast,
    ctx: { own: new Set(), start, photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx) },
  }
}

type Mode = { readonly view: 'watch' | 'highlights'; readonly speed: number }

/** Un rótulo que estuvo en pantalla: desde cuándo, hasta cuándo debía y hasta cuándo estuvo, en pared. */
interface Shown {
  readonly cue: Cue
  readonly fromS: number
  readonly untilS: number
  endS: number
  /** el instante en que salió */
  readonly at: Instant
}

interface Run {
  readonly shown: readonly Shown[]
  /** los rótulos de la ronda que el reproductor programó (su corredor iba por delante al tocarle) */
  readonly rounds: readonly { readonly cue: Cue; readonly atS: number }[]
  readonly lists: readonly Cue[]
  /** los que la cola tiró sin enseñarlos, con el instante en que los tiró */
  readonly dropped: ReadonlyMap<Cue, Instant>
}

/**
 * EL REPRODUCTOR SIN NAVEGADOR: a 60 fotogramas por segundo de pared, el instante a `overlayHz`, la
 * cola en cada fotograma. `prefill`: rótulos que se meten en la cola en una hora de carrera dada.
 */
function run(
  tl: StageTimeline,
  mode: Mode,
  cast: readonly RiderCard[],
  ctx: InstantContext,
  prefill?: { readonly atS: number; readonly cues: readonly { cue: Cue; cls: 1 | 2 }[] },
): Run {
  const finishS = fromDs(visibilityOf(tl).finishDs)
  const deckCtx: CueDeckContext = {
    start: ctx.start,
    timeTrial: false,
    events: tl.events,
    catalog: tl.groups,
    cast,
    profile: tl.profile,
    own: ctx.own,
    view: mode.view,
    speed: mode.speed,
  }
  const zones = mode.view === 'highlights' ? BROADCAST.summaryPace : BROADCAST.pace
  const dt = 1 / 60
  let deck: CueDeck = cueDeckInit(ctx.start)
  let t = 0
  let wall = 0
  let instant = instantAt(tl, 0, ctx)
  let lastOverlay = Number.NEGATIVE_INFINITY
  let filled = prefill === undefined
  const shown: Shown[] = []
  let onScreen: ShownCue | null = null
  const seen = new Set<Cue>()
  const rounds: { cue: Cue; atS: number }[] = []
  const lists: Cue[] = []
  const dropped = new Map<Cue, Instant>()
  while (t < finishS) {
    if (wall - lastOverlay >= 1 / BROADCAST.overlayHz - 1e-9) {
      instant = instantAt(tl, t, ctx)
      lastOverlay = wall
    }
    if (!filled && t >= prefill!.atS) {
      // la cola llena de rótulos de clase 1 y 2 justo antes de la fuga
      let q = deck.queue
      for (const x of prefill!.cues)
        q = admitCue(q, x.cue, x.cls, { wallS: deck.wallS, toGoKm: instant.toGoKm, instant }).queue
      deck = { ...deck, queue: q }
      filled = true
    }
    const before = deck.queue
    deck = cueDeckStep(deck, instant, dt, true, deckCtx).deck
    // lo que sale de la espera sin pasar a pantalla: la cola lo ha tirado
    for (const w of before.waiting)
      if (deck.queue.shown?.cue !== w.cue && !deck.queue.waiting.some((x) => x.cue === w.cue))
        dropped.set(w.cue, instant)
    for (const x of [...deck.queue.waiting.map((w) => w.cue), deck.queue.shown?.cue]) {
      if (x === undefined || seen.has(x)) continue
      seen.add(x)
      if (x.kind === 'rider' && x.context === 'break_round')
        rounds.push({ cue: x, atS: deck.wallS })
      if (x.kind === 'break_formed') lists.push(x)
    }
    const now = deck.queue.shown
    if (now !== onScreen) {
      if (onScreen !== null) shown.at(-1)!.endS = deck.wallS
      if (now !== null)
        shown.push({
          cue: now.cue,
          fromS: deck.wallS,
          untilS: now.untilS,
          endS: Number.NaN,
          at: instant,
        })
      onScreen = now
    }
    const x = paceAt(instant.toGoKm, zones) * mode.speed
    t = Math.min(finishS, t + x * dt)
    wall += dt
  }
  if (onScreen !== null) shown.at(-1)!.endS = deck.wallS
  return { shown, rounds, lists, dropped }
}

/** ¿Salió entero? En pantalla hasta su hora (un fotograma de margen), sin que lo cortara nadie. */
const entire = (s: Shown): boolean => s.endS >= s.untilS - 1 / 60 - 1e-9
const shownOf = (r: Run, cue: Cue): Shown | undefined => r.shown.find((s) => s.cue === cue)

/** La frase de una fuga: el break_presented que sale con su lista (los mismos escapados, a su hora). */
const phraseOf = (r: Run, list: Cue): Shown | undefined =>
  r.shown.find(
    (s) =>
      s.cue.kind === 'break_presented' &&
      list.kind === 'break_formed' &&
      s.cue.t === list.t &&
      s.cue.group === list.group,
  )

const MODES: readonly { readonly name: string; readonly mode: Mode }[] = [
  { name: 'Watch ×½', mode: { view: 'watch', speed: 0.5 } },
  { name: 'Watch ×1', mode: { view: 'watch', speed: 1 } },
  { name: 'Watch ×2', mode: { view: 'watch', speed: 2 } },
  { name: 'Highlights ×1', mode: { view: 'highlights', speed: 1 } },
]

describe('B3, segunda parte · la presentación de la fuga en las cinco congeladas en línea (§6.7, 6-m)', () => {
  const lines = ROAD.map((name) => {
    const tl = lineOf(name)
    return { name, tl, ...headOf(tl) }
  })
  const report: string[] = []

  it.each(MODES)(
    '$name: la lista, la frase y la ronda de toda fuga',
    ({ name: modeName, mode }) => {
      let lists = 0
      let tossed = 0
      let roundCards = 0
      let roundEntire = 0
      for (const { name, tl, cast, ctx } of lines) {
        const r = run(tl, mode, cast, ctx)
        for (const list of r.lists) {
          if (list.kind !== 'break_formed') continue
          lists++
          const listShown = shownOf(r, list)
          const phrase = phraseOf(r, list)
          // (1) entera, salvo que la cola la tirara porque ya no presentaba a nadie
          const ahead = (at: Instant) => list.riders.some((x) => aheadOfPeloton(at, x))
          if (listShown !== undefined)
            expect(entire(listShown), `${name} ${modeName}: la lista`).toBe(true)
          else {
            const at = r.dropped.get(list)
            expect(at, `${name} ${modeName}: la lista, ni enseñada ni tirada`).toBeDefined()
            expect(ahead(at!), `${name} ${modeName}: la lista tirada con alguien delante`).toBe(
              false,
            )
            tossed++
          }
          if (phrase !== undefined)
            expect(entire(phrase), `${name} ${modeName}: la frase`).toBe(true)
        }
        // (3) ningún rótulo de la ronda empieza con su corredor fuera de cabeza
        for (const s of r.shown)
          if (s.cue.kind === 'rider' && s.cue.context === 'break_round')
            expect(aheadOfPeloton(s.at, s.cue.rider), `${name} ${modeName}: ${s.cue.rider}`).toBe(
              true,
            )
        // (2) a ×½ y ×1, el rótulo de todo escapado programado, entero
        for (const x of r.rounds) {
          roundCards++
          const s = shownOf(r, x.cue)
          if (s !== undefined && entire(s)) roundEntire++
        }
        if (mode.view === 'highlights' || mode.speed > 2) expect(r.rounds).toHaveLength(0)
      }
      report.push(
        `  ${modeName}: ${lists - tossed} de ${lists} listas y frases enteras (${tossed} sin nadie ya ` +
          `delante); la ronda, ${roundEntire} de ${roundCards} rótulos enteros`,
      )
      expect(lists).toBeGreaterThanOrEqual(3)
      if (mode.view === 'watch' && mode.speed <= 1) {
        expect(roundCards).toBeGreaterThan(0)
        expect(roundEntire).toBe(roundCards)
      }
    },
  )

  it('las cifras', () => {
    console.info(`[broadcast] B3, segunda parte, en las cinco congeladas:\n${report.join('\n')}`)
    expect(report.length).toBe(MODES.length)
  })
})

/**
 * LA FUGA DE LA CLÁUSULA (§16.4): la primera de cinco o más de Flandes, que va por delante casi toda la
 * etapa, con una cabecera sintética que da a su primer escapado por dorsal el título de Italia y al
 * segundo el maillot de la montaña, revelada con la cola llena de rótulos de clase 1 y 2. Con la de la
 * e18 no vale en Highlights: entre su revelado y su caza, a ×300, cinco rótulos de clase 3 de la línea
 * (una caída con nombres de un top 5, un cambio de líder virtual, un top 5 descolgado, otra caída y un
 * corte) ocupan los 34 s de pared, y la cola la tira cuando ya no presenta a nadie, que es su regla.
 */
describe('B3, segunda parte · una fuga con el campeón y el líder, con la cola llena (§6.7, 6-m)', () => {
  const tl = lineOf('race-flanders-e1')
  const { cast: served, ctx } = headOf(tl)
  const formed = tl.events.find((e) => e.plantilla === 'breakaway_formed' && e.riders.length >= 5)!
  const byBib = [...formed.riders].sort((a, b) => (served[a]!.bib ?? a) - (served[b]!.bib ?? b))
  const title: ChampionTitle = {
    scope: 'national',
    country: 'IT',
    discipline: 'road',
    category: 'elite',
    season: 0,
    validFromDay: 0,
    validToDay: 365,
    source: { raceKey: 'race-france:s0', stageDay: 17 },
    provisional: true,
  }
  const opts = { gcThreatTop: BROADCAST.gcThreatTop, knownNameMinWins: BROADCAST.knownNameMinWins }
  const from = { raceKey: 'race-france:s0', stageDay: 17 }
  const cast = served.map((c): RiderCard => {
    if (c.ix === byBib[0]) {
      const worn = { kind: 'champion', title } as const
      return { ...c, worn, notoriety: staticNotoriety(worn, c.lines, 0, 'elite', opts) }
    }
    if (c.ix === byBib[1]) {
      const worn = { kind: 'leader', jersey: 'kom', delegated: false, from } as const
      return { ...c, worn, notoriety: staticNotoriety(worn, c.lines, 0, 'elite', opts) }
    }
    return c
  })
  const leaderCtx: InstantContext = {
    ...ctx,
    start: { ...ctx.start, leaders: { ...ctx.start.leaders, kom: byBib[1]! } },
  }
  // la cola llena justo antes: un ataque de clase 2 y dos cuadros de clase 1
  const filler = (rider: RiderIx): Cue => ({
    kind: 'mishap',
    t: 0,
    rider,
    mishap: 'pinchazo',
    lostS: 0,
  })
  const prefill = {
    atS: formed.revealS - 1,
    cues: [
      { cue: { kind: 'attack', t: 0, riders: [0], fromGroup: 0 } as Cue, cls: 2 as const },
      { cue: filler(1), cls: 1 as const },
      { cue: filler(2), cls: 1 as const },
    ],
  }
  const listOf = (r: Run): Cue | undefined =>
    r.lists.find((x) => x.kind === 'break_formed' && x.t === formed.revealS)

  it('en Watch a ×1 salen enteras la lista con sus maillots, la frase y toda la ronda', () => {
    const r = run(tl, { view: 'watch', speed: 1 }, cast, leaderCtx, prefill)
    const list = listOf(r)!
    expect(list).toBeDefined()
    expect(entire(shownOf(r, list)!)).toBe(true)
    const phrase = phraseOf(r, list)!
    expect(entire(phrase)).toBe(true)
    if (phrase.cue.kind === 'break_presented')
      expect(phrase.cue.named.slice(0, 2)).toEqual([byBib[1], byBib[0]])
    const round = breakRoundOf(formed.riders, cast)
    const roundShown = r.shown.filter(
      (s) =>
        s.cue.kind === 'rider' &&
        s.cue.context === 'break_round' &&
        s.fromS >= shownOf(r, list)!.fromS,
    )
    // la ronda de esta fuga: uno por escapado que seguía en cabeza al tocarle, por dorsal, y todos enteros
    const presented = roundShown
      .map((s) => (s.cue.kind === 'rider' ? s.cue.rider : -1))
      .filter((x) => round.includes(x))
    expect(presented.length).toBeGreaterThan(0)
    expect(presented).toEqual([...presented].sort((a, b) => a - b))
    for (const s of roundShown) expect(entire(s)).toBe(true)
  })

  it('a ×4 y en Highlights, la lista y la frase, sin ronda', () => {
    for (const mode of [
      { view: 'watch', speed: 4 },
      { view: 'highlights', speed: 1 },
    ] as const) {
      const r = run(tl, mode, cast, leaderCtx, prefill)
      const list = listOf(r)!
      expect(entire(shownOf(r, list)!), mode.view).toBe(true)
      expect(entire(phraseOf(r, list)!), mode.view).toBe(true)
      expect(r.rounds).toHaveLength(0)
    }
  })
})
