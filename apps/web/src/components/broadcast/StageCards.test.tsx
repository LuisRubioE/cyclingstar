import type { BroadcastFinish, BroadcastHead, StageResultEntry } from '@cyclingstar/shared'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import {
  arrivalCardsOf,
  arrivalSeconds,
  closingCardsOf,
  previewCardsOf,
  previewSeconds,
  recapRowsOf,
  routeLines,
} from '../../domain/broadcast/montage'
import { castOf, headOf, instantOf, leaderWorn, range } from './__fixtures__/screen'
import {
  ArrivalCardView,
  ClosingCardView,
  PreviewCardView,
  RecapCard,
  StageClosingCards,
  StagePreviewCards,
} from './StageCards'

/**
 * LA PREVIA, LA LLEGADA Y EL CIERRE CON LOS TEXTOS DE §8.6 Y §8.7 (docs/retransmision.md; D-22, DD-14,
 * 8-h; paso 10a, §17.13), en estático con `renderToStaticMarkup` (§8.12, §16.6). Los nombres son los de
 * los ejemplos de §8.6; las cifras, las del reparto de mentira.
 */

const html = (node: ReactElement): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
/** El texto que se lee: sin etiquetas y con los espacios juntos. */
const text = (markup: string): string =>
  markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const NAMES = [
  'Sam Carter', // 0: el líder de la general (11)
  'Iñigo Arrieta',
  'Mads Olsen',
  'Pierre Lambert',
  'Rafael Díaz', // 4: el de los puntos
  'Jonas Verhoeven', // 5: el de la montaña
  'Nicolás Moreno', // 6
  'Antoine Leroy',
  'Jonas Kahn',
  'Jules Moreau', // 9: abandona
  'Andrea Rossi',
  'Erik Voss',
]
const cast = castOf(40, {
  ...Object.fromEntries(NAMES.map((name, i) => [i, { name }])),
  0: { name: 'Sam Carter', bib: 11, worn: leaderWorn('gc') },
  4: { name: 'Rafael Díaz', bib: 7, worn: leaderWorn('points') },
  5: { name: 'Jonas Verhoeven', bib: 45 },
  6: { name: 'Nicolás Moreno', bib: 15, team: { id: 'ta', name: 'Team Alpha', jerseySeed: 's' } },
  9: { name: 'Jules Moreau', bib: 46 },
  20: { name: 'Pelle Ekdal', own: true },
})

const base = headOf(cast)
const head: BroadcastHead = {
  ...base,
  startState: {
    leaders: { gc: 0, points: 4, kom: 5 },
    gcTop: [
      { rider: 0, rank: 1, gapS: 0 },
      { rider: 1, rank: 2, gapS: 4 },
      { rider: 2, rank: 3, gapS: 9 },
      { rider: 3, rank: 4, gapS: 31 },
    ],
    racingAtStart: cast.length,
  },
  preview: {
    route: {
      ...base.profile,
      climbs: [
        { footKm: 20, topKm: 37, cat: 'cat1', lenKm: 16.9, avgPct: 4, name: "Côte d'Engins" },
        ...base.profile.climbs,
        {
          footKm: 170,
          topKm: 185,
          cat: 'cat1',
          lenKm: 15.1,
          avgPct: 4.7,
          name: 'Orcières-Merlette',
        },
      ],
    },
    weather: base.weather,
    jerseysInPlay: [
      { jersey: 'gc', holder: 0, threats: [1, 2, 3] },
      { jersey: 'points', holder: 4, threats: [] },
      { jersey: 'kom', holder: 5, threats: [] },
    ],
    favourites: [
      { rider: 0, why: 'gc' },
      { rider: 1, why: 'gc' },
      { rider: 2, why: 'gc' },
      { rider: 6, why: 'climb' },
      { rider: 7, why: 'climb' },
      { rider: 8, why: 'climb' },
    ],
  },
}

const entry = (
  ix: number,
  puesto: number,
  tiempoS: number,
  over: Partial<StageResultEntry> = {},
): StageResultEntry => ({
  riderId: cast[ix]!.id,
  name: cast[ix]!.name,
  country: 'ES',
  teamName: cast[ix]!.team?.name ?? null,
  isBot: true,
  puesto,
  tiempoS,
  bonificacionS: 0,
  puntosVolante: 0,
  puntosMontana: 0,
  dnf: false,
  reason: null,
  ...over,
})

/** El paquete de meta: Moreno gana; Ekdal (del espectador) llega en el puesto 31 con el grupo de detrás. */
const finish: BroadcastFinish = {
  arrivals: [
    { gapS: 0, riders: [6] },
    { gapS: 12, riders: [8, 7] },
    { gapS: 134, riders: range(10, 40) },
  ],
  result: [
    entry(6, 1, 17978),
    entry(8, 2, 17990),
    entry(7, 3, 18009),
    ...range(10, 40).map((ix, i) => entry(ix, 4 + i, 18112)),
    entry(9, 0, 0, { dnf: true, reason: 'colapso' }),
  ],
  closing: {
    podium: [6, 8, 7],
    gcAfter: [
      { rider: 6, rank: 1, gapS: 0, move: 2 },
      { rider: 0, rank: 2, gapS: 21, move: -1 },
      { rider: 1, rank: 3, gapS: 48, move: -1 },
      { rider: 11, rank: 4, gapS: 60, move: 0 },
    ],
    jerseysTomorrow: [
      { jersey: 'gc', rider: 6, changed: true },
      { jersey: 'points', rider: 4, changed: false },
      { jersey: 'kom', rider: 7, changed: true },
    ],
    mostKmOutFront: { rider: 6, km: 142.3 },
    outOfRace: [
      { rider: 9, reason: 'abandon' },
      ...range(30, 42).map((rider) => ({ rider, reason: 'time_cut' as const })),
    ],
    tomorrow: {
      raceName: 'Race France',
      season: 0,
      stageDay: 19,
      stageCount: 21,
      km: 204,
      label: 'Hills',
      stageKind: 'media',
    },
  },
  report: {} as BroadcastFinish['report'],
  news: [],
  threeKmRule: [12],
}

describe('la previa (§8.6): cuatro cuadros de previewCardS', () => {
  const cards = previewCardsOf(head, { digest: false, oneDay: false })

  it('el recorrido: la etapa en mayúsculas con sus km, y cada puerto y cada volante en orden de km', () => {
    expect(cards.map((c) => c.k)).toEqual(['route', 'weather', 'jerseys', 'favourites'])
    expect(previewSeconds(cards)).toBe(20)
    const markup = text(html(<PreviewCardView card={cards[0]!} />))
    expect(markup).toBe(
      [
        'STAGE 18 · SUMMIT FINISH · 185 km',
        "Côte d'Engins · Cat. 1 · 16.9 km at 4.0% · km 37",
        'Côte de Monteynard · Cat. 2 · 12.0 km at 5.0% · km 92',
        'Cat. 3 climb · 8.0 km at 3.1% · km 113',
        'Intermediate sprint · km 129',
        'Orcières-Merlette · Cat. 1 · 15.1 km at 4.7% · finish',
      ].join(' '),
    )
  })

  it('como mucho seis líneas, el resto en +N more climbs; un circuito, delante', () => {
    const many = {
      ...head.preview.route,
      climbs: Array.from({ length: 8 }, (_, i) => ({
        footKm: 10 + i * 20,
        topKm: 15 + i * 20,
        cat: 'cat4',
        lenKm: 0,
        avgPct: 0,
        name: null,
      })),
      sprintsKm: [],
    }
    const lines = routeLines(many, 185)
    expect(lines).toHaveLength(6)
    expect(lines.at(-1)).toBe('+3 more climbs')
    expect(lines[0]).toBe('Cat. 4 climb · km 15')
    expect(routeLines({ ...many, climbs: [], laps: 3 }, 42.6)[0]).toBe('3 laps of 14.2 km')
  })

  it('el parte: la temperatura, la lluvia desde su km, el viento y los tramos de viento lateral', () => {
    expect(text(html(<PreviewCardView card={cards[1]!} />))).toBe(
      'WEATHER 21°C · rain from km 80 Wind 18 km/h Crosswind: km 80-185',
    )
  })

  it('JERSEYS IN PLAY: quién lleva cada maillot y, en la general, los siguientes con su diferencia', () => {
    const markup = html(<PreviewCardView card={cards[2]!} />)
    expect(text(markup)).toBe(
      // cada maillot con su nombre para quien no ve el color (`LeaderJersey`)
      'JERSEYS IN PLAY Race leader 11 Sam Carter · closest: Iñigo Arrieta +0:04 · Mads Olsen +0:09 · Pierre Lambert +0:31 Points leader 7 Rafael Díaz Mountains leader 45 Jonas Verhoeven',
    )
    expect(markup).toContain('aria-label="Race leader"')
    expect(markup).toContain('aria-label="Mountains leader"')
  })

  it('FAVOURITES: la general de salida y los del atributo del tipo de etapa', () => {
    expect(text(html(<PreviewCardView card={cards[3]!} />))).toBe(
      'FAVOURITES General classification: Sam Carter · Iñigo Arrieta · Mads Olsen Climbers: Nicolás Moreno · Antoine Leroy · Jonas Kahn',
    )
  })

  it('en el digest, solo el recorrido (§8.8); en una carrera de un día, sin maillots (tres, 15 s); en la primera etapa, nadie lo lleva', () => {
    expect(previewCardsOf(head, { digest: true, oneDay: false }).map((c) => c.k)).toEqual(['route'])
    const oneDay = previewCardsOf(head, { digest: false, oneDay: true })
    expect(oneDay.map((c) => c.k)).toEqual(['route', 'weather', 'favourites'])
    expect(previewSeconds(oneDay)).toBe(15)
    const first: BroadcastHead = {
      ...head,
      stage: { ...head.stage, day: 1 },
      preview: { ...head.preview, jerseysInPlay: [] },
    }
    const card = previewCardsOf(first, { digest: false, oneDay: false })[2]!
    expect(text(html(<PreviewCardView card={card} />))).toBe(
      'JERSEYS IN PLAY Stage 1 · the stage winner takes the first leader’s jersey',
    )
    // con la anterior velada, la cabecera solo trae el recorrido y el parte (8-f)
    const gated: BroadcastHead = {
      ...head,
      preview: { ...head.preview, jerseysInPlay: [], favourites: [] },
    }
    expect(previewCardsOf(gated, { digest: false, oneDay: false }).map((c) => c.k)).toEqual([
      'route',
      'weather',
    ])
  })

  it('StagePreviewCards pinta el cuadro del momento, sus puntos y ▶ Watch', () => {
    const markup = html(<StagePreviewCards cards={cards} index={2} onWatch={() => {}} />)
    expect(markup).toContain('data-preview-card="jerseys"')
    expect(text(markup)).toContain('Watch')
    expect(markup).not.toContain('FAVOURITES')
  })
})

describe('la llegada (§8.7): el ganador, los grupos que llegan y el fuera de control', () => {
  const last = instantOf([
    { members: [6], km: 184.9 },
    { members: [8, 7], km: 184.7, gapS: 12 },
    { members: range(10, 40), km: 184, gapS: 130, kind: 'peloton' },
  ])

  it('STAGE WINNER, el grupo del espectador con la palabra de su grupo, y TIME CUT', () => {
    const cards = arrivalCardsOf(head, finish, last, {
      revealed: false,
      digest: false,
      oneDay: false,
    })
    expect(cards.map((c) => `${c.title} · ${c.detail}`)).toEqual([
      'STAGE WINNER · 15 Nicolás Moreno · Team Alpha · 4:59:38',
      'BUNCH · +2:14',
      'TIME CUT · 12 riders outside the limit',
    ])
    // el grupo de Kahn y Leroy no lleva a nadie del espectador, ningún maillot ni un top 10 de salida
    expect(arrivalSeconds(cards)).toBe(3 + 4 + 5)
    expect(text(html(<ArrivalCardView card={cards[0]!} />))).toBe(
      'STAGE WINNER 15 Nicolás Moreno · Team Alpha · 4:59:38',
    )
  })

  it('un grupo de tres o menos, por sus nombres, con la regla de los 3 km (6-o)', () => {
    const small: BroadcastFinish = {
      ...finish,
      arrivals: [
        { gapS: 0, riders: [6] },
        { gapS: 47, riders: [0, 12] },
      ],
      threeKmRule: [12],
    }
    const cards = arrivalCardsOf(head, small, last, {
      revealed: false,
      digest: false,
      oneDay: false,
    })
    expect(cards[1]).toMatchObject({
      title: `Sam Carter · ${cast[12]!.name} same time (3 km rule)`,
      detail: '+0:47',
    })
  })

  it('tras Show result, sin los grupos que llegan; en el digest, solo el ganador (§8.8)', () => {
    const revealed = arrivalCardsOf(head, finish, last, {
      revealed: true,
      digest: false,
      oneDay: false,
    })
    expect(revealed.map((c) => c.k)).toEqual(['winner', 'time_cut'])
    const digest = arrivalCardsOf(head, finish, last, {
      revealed: false,
      digest: true,
      oneDay: false,
    })
    expect(digest.map((c) => c.k)).toEqual(['winner'])
    expect(arrivalSeconds(digest)).toBe(3)
  })
})

describe('el cierre (§8.6): seis cuadros de closingCardS', () => {
  const cards = closingCardsOf(head, finish, { oneDay: false })
  const view = (i: number): string =>
    html(
      <ClosingCardView
        card={cards[i]!}
        nextHref={(d) => `/world/races/race-france/stages/${d}?tab=watch`}
        onReport={() => {}}
      />,
    )

  it('los seis, en su orden', () => {
    expect(cards.map((c) => c.k)).toEqual(['result', 'gc', 'jerseys', 'outFront', 'out', 'next'])
  })

  it('STAGE 18 · RESULT: los diez primeros, el podio resaltado, el del espectador con su puesto y la regla de los 3 km', () => {
    const markup = view(0)
    const t = text(markup)
    expect(t.startsWith('STAGE 18 · RESULT 1 15 Nicolás Moreno Team Alpha 4:59:38')).toBe(true)
    expect(t).toContain('2 9 Jonas Kahn')
    expect(t).toContain('+0:12')
    expect(t).toContain(`6 13 ${cast[12]!.name}`)
    expect(t).toContain('same time (3 km rule)')
    // el del espectador, el 14.º, tras los diez primeros
    expect(t).toContain(`14 21 Pelle Ekdal (your rider)`)
    expect((markup.match(/<li class="flex gap-2 font-semibold"/g) ?? []).length).toBe(3)
  })

  it('GENERAL CLASSIFICATION · after stage 18, con flechas', () => {
    expect(text(view(1))).toBe(
      'GENERAL CLASSIFICATION · after stage 18 1 ▲2 15 Nicolás Moreno 2 ▼1 11 Sam Carter +0:21 3 ▼1 2 Iñigo Arrieta +0:48 4 = 12 Erik Voss +1:00',
    )
  })

  it('JERSEYS TOMORROW con new donde cambian; tras la última, FINAL JERSEYS', () => {
    expect(text(view(2))).toBe(
      'JERSEYS TOMORROW Race leader 15 Nicolás Moreno · new Points leader 7 Rafael Díaz Mountains leader 8 Antoine Leroy · new',
    )
    const last = closingCardsOf(
      head,
      { ...finish, closing: { ...finish.closing, tomorrow: null } },
      { oneDay: false },
    )
    expect(last.find((c) => c.k === 'jerseys')).toMatchObject({ title: 'FINAL JERSEYS' })
    expect(last.at(-1)).toMatchObject({ k: 'next', text: 'Final stage', nextDay: null })
  })

  it('MOST KILOMETRES OUT FRONT (DD-14), y no sale si nadie rodó delante', () => {
    expect(text(view(3))).toBe('MOST KILOMETRES OUT FRONT 15 Nicolás Moreno · 142 km')
    const none = closingCardsOf(
      head,
      { ...finish, closing: { ...finish.closing, mostKmOutFront: null } },
      { oneDay: false },
    )
    expect(none.some((c) => c.k === 'outFront')).toBe(false)
  })

  it('OUT OF THE RACE: los abandonos y el fuera de control', () => {
    expect(text(view(4))).toBe('OUT OF THE RACE ABANDON · 46 Jules Moreau TIME CUT · 12 riders')
  })

  it('Next: Stage 19 · 204 km · Hills con Watch, y siempre Report', () => {
    const markup = view(5)
    expect(text(markup)).toBe('Next: Stage 19 · 204 km · Hills Watch Report')
    expect(markup).toContain('href="/world/races/race-france/stages/19?tab=watch"')
  })

  it('en una carrera de un día, sin la general, los maillots ni la siguiente', () => {
    const oneDay = closingCardsOf(head, finish, { oneDay: true })
    expect(oneDay.map((c) => c.k)).toEqual(['result', 'outFront', 'out', 'next'])
    expect(oneDay[0]).toMatchObject({ title: 'RESULT' })
    expect(oneDay.at(-1)).toMatchObject({ text: null, nextDay: null })
  })

  it('StageClosingCards empieza por el primero, con sus puntos y Next card', () => {
    const markup = html(
      <StageClosingCards cards={cards} nextHref={(d) => `/s/${d}`} onReport={() => {}} />,
    )
    expect(markup).toContain('STAGE 18 · RESULT')
    expect(markup).not.toContain('JERSEYS TOMORROW')
    expect(markup).toContain('Next card')
  })
})

describe('While you skipped y Previously (8-i, 8-n)', () => {
  it('los rótulos de recapOf con el km de la cabeza a su hora y su texto', () => {
    const at = (t: number) =>
      instantOf([{ members: range(0, 40), km: t / 100, kind: 'peloton' }], { t })
    const rows = recapRowsOf(
      [
        { kind: 'attack', t: 3700, riders: [6], fromGroup: 0 },
        { kind: 'abandon', t: 9200, rider: 9 },
      ] as Parameters<typeof recapRowsOf>[0],
      head,
      at,
    )
    expect(rows.map((r) => [r.where, r.title])).toEqual([
      ['km 37', 'ATTACK'],
      ['km 92', 'ABANDON'],
    ])
    const markup = html(
      <RecapCard recap={{ title: 'WHILE YOU SKIPPED', rows }} onDone={() => {}} />,
    )
    expect(text(markup)).toContain('WHILE YOU SKIPPED')
    expect(text(markup)).toContain('km 37 ATTACK · 15 Nicolás Moreno')
    expect(markup).toContain('aria-live="polite"')
  })
})
