import {
  type BroadcastHead,
  type ChronicleRider,
  KIT_MIN_PX,
  type RaceLeaders,
  type RaceRadio,
  type RadioGroup,
  type RadioRider,
  type StageReplay,
  type StageResultEntry,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PALETA, cuantas, elementoEn, pieza } from '../pages/__fixtures__/markup'
import { PaintedRaceRadio } from './PaintedRaceRadio'
import { RaceRadioPanel, radioGroupNames } from './RaceRadioPanel'
import { StageStory } from './StageStory'

/**
 * LA RADIO Y LA CRÓNICA CON EL SISTEMA (E3, docs/visual.md §14 y §17.21; PR 21m). Tres piezas de E2 que
 * cambian solo de aspecto: sin la paleta de Tailwind ni la marca de antes en su marcado, sin `title` (el
 * porqué, en un `InfoButton`, regla `ui/4`), sin valores arbitrarios, con los botones del catálogo y los
 * maillots de `KIT_MIN_PX` o más (§8.3). Lo que no cambia, también aquí: los textos de pantalla, los
 * encabezados y las listas, y ninguna región viva nueva (§14.1).
 *
 * La radio sin pintar no llega en estático: `paintedRadioFromChunks` se sustituye por una radio vacía, que
 * es la que pinta el aviso de `PaintedRaceRadio`.
 */
vi.mock('../domain/broadcast/paintedRadio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../domain/broadcast/paintedRadio')>()),
  paintedRadioFromChunks: (): RaceRadio => ({ starters: 0, kms: [] }),
}))

const html = (el: ReactElement): string => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // la radio pintada lee sus tramos de la caché: vacíos, ya están
  client.setQueryData(['painted-radio', 'r1', 3, 0], [])
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El texto del marcado, sin etiquetas ni los comentarios con que React separa dos textos seguidos. */
const texto = (markup: string): string =>
  markup
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")

/** Los anchos de los maillots de líder del marcado. */
const maillots = (markup: string): number[] =>
  [...markup.matchAll(/<svg[^>]*data-kit="leader-[^"]*"[^>]*width="(\d+)"/g)].map((m) =>
    Number(m[1]),
  )

/**
 * La identidad de un corredor, entera: el elemento que abre justo antes de su bandera (la `Flag` del
 * catálogo, la primera que sigue a `desde`), con lo que lleva dentro.
 */
const identidad = (markup: string, desde: number): string => {
  const bandera = markup.indexOf('<span data-ui="Flag"', desde)
  return bandera < 0 ? '' : elementoEn(markup, markup.lastIndexOf('<span class="', bandera))
}

/** La etiqueta de apertura de un elemento entero. */
const apertura = (elemento: string): string => /^<[^>]*>/.exec(elemento)?.[0] ?? ''

/** Los roles del marcado: solo los de las banderas y los maillots, como hoy. */
const roles = (markup: string): string[] => [
  ...new Set([...markup.matchAll(/\srole="([^"]+)"/g)].map((m) => m[1] ?? '')),
]

const rider = (name: string, over: Partial<RadioRider> = {}): RadioRider => ({
  name,
  id: null,
  bib: null,
  team: null,
  country: null,
  jersey: null,
  role: 'sheltered',
  motivo: null,
  para: null,
  ...over,
})

const PARA: ChronicleRider = { name: 'Bojan Kovacic', id: 'r9', bib: 1, team: null, country: 'SI' }

const group = (over: Partial<RadioGroup> & Pick<RadioGroup, 'kind' | 'size'>): RadioGroup => ({
  gapS: 0,
  gapToPrevS: 0,
  speedKmh: null,
  mishap: null,
  riders: [],
  unnamed: 0,
  pullingTotal: 0,
  ...over,
})

/** El km de la salida, el que abre la radio: los cuatro grupos de una tarde, con todo lo que se pinta. */
const GROUPS: RadioGroup[] = [
  group({
    kind: 'fuga',
    size: 3,
    speedKmh: 44.1,
    pullingTotal: 2,
    riders: [
      rider('Ana Ruiz', {
        id: 'r1',
        bib: 21,
        country: 'ES',
        team: 'Team Uno',
        jersey: 'kom',
        role: 'pulling',
        motivo: 'fuga',
      }),
      rider('Bea Sanz', { id: 'r2', bib: 34, country: 'FR', role: 'pulling', motivo: 'fuga' }),
      rider('Carla Gil', { bib: 45, country: 'IT' }),
    ],
  }),
  group({
    kind: 'peloton',
    size: 150,
    gapS: 95,
    gapToPrevS: 95,
    speedKmh: 41.2,
    pullingTotal: 5,
    unnamed: 140,
    riders: [
      rider('Dani Paz', {
        id: 'r4',
        bib: 61,
        role: 'pulling',
        motivo: 'equipo_maillot',
        para: PARA,
      }),
      rider('Eva Mora', {
        id: 'r5',
        bib: 62,
        role: 'pulling',
        motivo: 'equipo_maillot',
        para: PARA,
      }),
      rider('Bojan Kovacic', { id: 'r9', bib: 1, country: 'SI', jersey: 'gc' }),
    ],
  }),
  group({
    kind: 'tierra',
    size: 1,
    gapS: 300,
    gapToPrevS: 205,
    mishap: { tipo: 'caida', lostS: 30 },
    riders: [rider('Fede Luz', { id: 'r6', bib: 77 })],
  }),
  group({ kind: 'grupeto', size: 22, gapS: 600, gapToPrevS: 300, speedKmh: 35, unnamed: 22 }),
]

const RADIO: RaceRadio = {
  starters: 176,
  kms: [
    { km: 0.4, racing: 174, gone: 2, groups: GROUPS },
    { km: 12, racing: 174, gone: 2, groups: GROUPS },
  ],
}

describe('RaceRadioPanel con el sistema (21m)', () => {
  const markup = html(<RaceRadioPanel radio={RADIO} />)
  const painted = html(<RaceRadioPanel radio={RADIO} painted />)

  it('sin la paleta ni la marca de antes, sin valores arbitrarios y sin title', () => {
    for (const m of [markup, painted]) {
      expect(m).not.toMatch(PALETA)
      expect(m).not.toMatch(/class="[^"]*\[/)
      expect(m).not.toMatch(/\stitle="/)
    }
  })

  it('los maillots, de KIT_MIN_PX o más (§8.3)', () => {
    expect(maillots(markup)).toEqual([KIT_MIN_PX, KIT_MIN_PX])
  })

  it('los botones son los del catálogo, con sus textos de hoy', () => {
    for (const t of ['−20', '−5', '◀ km', 'km ▶', '+5', '+20', 'Finish'])
      expect(pieza(markup, 'Button', `>${t}<`), t).not.toBe('')
    expect(cuantas(markup, /data-ui="Button"/)).toBe(7)
    // hasta lo pintado, sin Finish (11-i)
    expect(cuantas(painted, /data-ui="Button"/)).toBe(6)
    expect(texto(painted)).not.toContain('Finish')
  })

  it('en los bordes, los saltos no se deshabilitan: deshabilitar pide su porqué a la vista (§4.1)', () => {
    // la radio abre en la salida, así que los tres de atrás están en su borde
    for (const t of ['−20', '−5', '◀ km', 'km ▶', '+5', '+20']) {
      const boton = pieza(markup, 'Button', `>${t}<`)
      expect(apertura(boton), t).toContain('data-state="ready"')
      expect(boton, t).not.toMatch(/\sdisabled|aria-disabled/)
    }
  })

  it('la bandera, el nombre y el maillot, juntos en un nowrap (D-00c), y nada cortado (§6.4)', () => {
    const fila = identidad(markup, markup.indexOf('>21<'))
    expect(apertura(fila)).toMatch(/\bwhitespace-nowrap\b/)
    for (const s of ['aria-label="Spain"', 'href="/world/riders/r1"', 'data-kit="leader-kom"'])
      expect(fila, s).toContain(s)
    // el nombre parte por sus espacios salvo en su última palabra, pegada al maillot (`glueEnd`),
    // y se lee entero (sin el `<title>` del maillot)
    expect(texto(fila.replace(/<svg[\s\S]*?<\/svg>/g, ''))).toBe('Ana Ruiz')
    // sin enlace, igual
    expect(texto(identidad(markup, markup.indexOf('>45<')))).toBe('Carla Gil')
    // ni el nombre, ni el equipo, ni el motivo, que suele acabar en un nombre, se cortan
    expect(markup).not.toContain('data-clip-ok')
    expect(markup).not.toMatch(/class="[^"]*\btruncate\b/)
  })

  it('los glifos del relevo se van (3-d) y su porqué va en un InfoButton (ui/4)', () => {
    expect(markup).not.toContain('⏵')
    expect(markup).not.toContain('⌂')
    const info = pieza(markup, 'InfoButton', 'taking turns into the wind')
    expect(info).toContain('aria-label="About pulling and sitting in"')
    expect(texto(info)).toContain('Pulling: taking turns into the wind. Sitting in, sheltered.')
  })

  it('los textos de hoy, intactos', () => {
    const t = texto(markup)
    for (const s of [
      'Race Radio',
      '174 racing · 2 out of 176',
      '0km',
      'Pulling (2)',
      'Pulling (2 of 5)',
      'Sitting in',
      '3 riders',
      '150 riders',
      '44.1 km/h',
      '41.2 km/h',
      '1:35 behind the leaders',
      '1:35 behind the group ahead',
      'Crash — 0:30 lost',
      'working the break',
      'defending the jersey of Bojan Kovacic',
      '+140 riders more',
      '+22 riders more',
      'Team Uno',
    ])
      expect(t, s).toContain(s)
    expect(markup).toContain('aria-label="Point on the course"')
    expect(texto(painted)).toContain("· up to km 12 · as far as you've watched")
  })

  it('el orden de D-00c: el dorsal, la bandera, el nombre con su enlace y el maillot', () => {
    const fila = markup.slice(markup.indexOf('>21<'), markup.indexOf('Team Uno'))
    const donde = [
      '>21<',
      'aria-label="Spain"',
      'href="/world/riders/r1"',
      'data-kit="leader-kom"',
    ].map((s) => fila.indexOf(s))
    expect(donde.every((i) => i >= 0)).toBe(true)
    expect([...donde].sort((a, b) => a - b)).toEqual(donde)
  })

  it('los encabezados, las listas y los roles de hoy; ninguna región viva', () => {
    const names = radioGroupNames(GROUPS, 174)
    expect(cuantas(markup, /<h2[\s>]/)).toBe(1)
    expect([...markup.matchAll(/<h3[^>]*>([^<]*)<\/h3>/g)].map((m) => m[1])).toEqual(names)
    // las del relevo y las de a rueda de los tres grupos con nombres
    expect(cuantas(markup, /<ul[\s>]/)).toBe(5)
    expect(markup).not.toContain('aria-live')
    expect(markup).not.toContain('<section')
    expect(roles(markup)).toEqual(['img'])
  })
})

describe('PaintedRaceRadio con el sistema (21m)', () => {
  const head = {} as BroadcastHead
  const markup = html(
    <PaintedRaceRadio head={head} raceId="r1" day={3} reachedS={0} onWatch={() => {}} />,
  )

  it('sin nada que enseñar: el aviso de hoy, sin la paleta', () => {
    expect(markup).not.toMatch(PALETA)
    expect(markup).not.toMatch(/class="[^"]*\[/)
    expect(markup).toMatch(/<h2[^>]*>Race Radio<\/h2>/)
    expect(texto(markup)).toContain(
      "Nothing to show yet: the race radio fills in as far as you've watched.",
    )
    expect(pieza(markup, 'Button', '>Watch<')).not.toBe('')
    expect(markup).not.toContain('aria-live')
  })
})

const result = (riderId: string, puesto: number, isBot = true): StageResultEntry => ({
  riderId,
  name: `Corredor ${riderId}`,
  country: 'ES',
  dnf: false,
  reason: null,
  teamId: `team-${riderId}`,
  teamName: `Equipo ${riderId}`,
  isBot,
  puesto,
  tiempoS: 3600 + puesto,
  bonificacionS: 0,
  puntosVolante: 0,
  puntosMontana: 0,
})

const onRoad: RaceLeaders = { gc: 'ayer', points: null, kom: null, team: null }
/** La crónica, sin enlaces ni banderas: los de sus menciones son de `ChronicleSentence`, que no es de aquí. */
const ANA: ChronicleRider = { name: 'Ana Ruiz', id: null, bib: 21, team: null, country: null }

const REPLAY: StageReplay = {
  day: 2,
  name: 'Etapa 2',
  km: 180,
  run: true,
  altimetry: '<svg />',
  champions: {},
  results: [result('hoy', 1, false), result('ayer', 2), result('otro', 3)],
  leaders: { onRoad, afterStage: onRoad },
  chronicle: [{ km: 87, tS: 7000, plantilla: 'attack_reeled', protagonists: [ANA] }],
}

describe('StageStory con el sistema (21m)', () => {
  const markup = html(<StageStory data={REPLAY} onFullResult={() => {}} />)
  const missing = html(<StageStory data={{ ...REPLAY, journalUnavailable: true }} />)

  it('sin la paleta ni la marca de antes, sin valores arbitrarios y sin title', () => {
    for (const m of [markup, missing]) {
      expect(m).not.toMatch(PALETA)
      expect(m).not.toMatch(/class="[^"]*\[/)
      expect(m).not.toMatch(/\stitle="/)
    }
  })

  it('el porqué de los maillots de la carretera, en un InfoButton (ui/4)', () => {
    const info = pieza(markup, 'InfoButton', 'as they were worn')
    expect(info).toContain('aria-label="About the jerseys on the road"')
    expect(texto(info)).toContain(
      'The jerseys as they were worn at the start of this stage — the standings after it are in Classifications.',
    )
  })

  it('Full result, un Button del catálogo con su texto de hoy', () => {
    expect(pieza(markup, 'Button', 'Full result →')).not.toBe('')
  })

  it('los maillots, de KIT_MIN_PX o más (§8.3)', () => {
    expect(maillots(markup).length).toBeGreaterThan(0)
    for (const px of maillots(markup)) expect(px).toBeGreaterThanOrEqual(KIT_MIN_PX)
  })

  it('el podio: la bandera, el nombre con su peso y el maillot (D-00c)', () => {
    // la fila del podio, y no la línea de `On the road today`, que también lo nombra
    const fila = markup.split('<li').find((li) => li.includes('>Corredor ayer</a>')) ?? ''
    const donde = ['aria-label="Spain"', '>Corredor ayer</a>', 'aria-label="Race leader"'].map(
      (s) => fila.indexOf(s),
    )
    expect(donde.every((i) => i >= 0)).toBe(true)
    expect([...donde].sort((a, b) => a - b)).toEqual(donde)
  })

  it('el podio, fila a fila: la identidad junta (D-00c) y el peso de humano o de bot', () => {
    const filas = markup.split('<li').filter((li) => /data-rider=/.test(li))
    expect(filas.map((li) => /data-rider="([a-z]+)"/.exec(li)?.[1])).toEqual([
      'human',
      'bot',
      'bot',
    ])
    for (const li of filas) {
      const peso = /data-rider="[a-z]+" class="([^"]*)"/.exec(li)?.[1] ?? ''
      if (li.includes('data-rider="human"')) expect(peso).toMatch(/\bfont-semibold\b/)
      else expect(peso).toMatch(/\bitalic\b/)
      // la bandera, el nombre y el maillot, en una fila flexible que no parte
      const junta = identidad(li, 0)
      expect(apertura(junta)).toMatch(/\binline-flex\b/)
      expect(apertura(junta)).not.toMatch(/\bflex-wrap\b/)
      expect(junta).toContain('aria-label="Spain"')
      expect(junta).toMatch(/<a [^>]*>Corredor [a-z]+<\/a>/)
    }
    expect(identidad(filas[1] ?? '', 0)).toContain('aria-label="Race leader"')
    expect(markup).not.toContain('data-clip-ok')
    expect(markup).not.toMatch(/class="[^"]*\btruncate\b/)
  })

  it('los textos de hoy, intactos', () => {
    const t = texto(markup)
    for (const s of [
      'How the stage unfolded',
      'On the road today',
      'km 87',
      'Podium',
      'Equipo hoy',
      'Full result →',
    ])
      expect(t, s).toContain(s)
    expect(texto(missing)).toContain(
      "The detailed journal wasn't recorded for this stage — it was raced before the chronicle was saved. The result is still the official one.",
    )
  })

  it('los encabezados y las listas de hoy; ninguna región viva', () => {
    expect(cuantas(markup, /<h2[\s>]/)).toBe(2)
    expect(cuantas(markup, /<ol[\s>]/)).toBe(2)
    expect(markup).not.toContain('aria-live')
    expect(markup).not.toContain('<section')
    expect(roles(markup)).toEqual(['img'])
  })
})
