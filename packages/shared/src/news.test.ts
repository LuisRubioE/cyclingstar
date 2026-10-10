import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  type NameResolver,
  type NewsKind,
  type NewsPayload,
  NEWS_VARIANTS,
  abandonReasonSchema,
  newsPayloadSchema,
  renderNews,
} from './news.js'
import { TEMPLATE_REV, type Variant, fnv1a, pickVariant } from './render/variants.js'

/**
 * B4, LA PARTE DE LAS NOTICIAS (docs/retransmision.md §12.8 y §16.4; E2, paso 1a). Un titular se
 * guarda como DATOS (`NewsPayload`: ids, códigos y números) con su semilla, y se redacta al LEER
 * con `renderNews`. Estos goldens fijan que la redacción nueva dice, carácter a carácter, lo mismo
 * que las plantillas del motor a las que sustituye (`packages/engine/src/world/news.ts`, que el paso
 * 4a borró con su test, decisión 4-p), salvo el espacio que `contract` ponía antes de la coma;
 * mientras convivieron, `packages/db/src/news.test.ts` cotejó las dos funciones kind a kind.
 *
 * La etapa se cita con su «de dónde a dónde» (v91, `stageRouteText`): el diseño se escribió contra
 * la v89, que no lo tenía, y el resolutor gana `route` para decirlo al leer.
 */

const ROUTES = new Map<string, string>([
  ['race-x:0:2', 'Barcelona'],
  ['race-x:0:4', 'A → B'],
])

/** El resolutor de prueba: nombres CORTOS, como el test del motor que este absorbe (`world/news.test.ts`). */
const SHORT: NameResolver = {
  rider: (id) => (id === 'r1' ? 'R' : 'A rider'),
  team: (id) => (id === 't2' ? 'T' : 'a team'),
  race: (raceId) => (raceId === 'race-x' ? 'Race X' : raceId),
  country: (iso2) => (iso2 === 'ES' ? 'Spain' : iso2),
  route: (raceId, season, stageDay) => ROUTES.get(`${raceId}:${season}:${stageDay}`) ?? null,
}

const race = { raceId: 'race-x', season: 0 } as const
const who = { riderId: 'r1', teamId: 't1' } as const

/** Un golden por kind, los trece: el payload que se guarda y el titular que se lee. */
const GOLDENS: readonly { readonly payload: NewsPayload; readonly text: string }[] = [
  {
    payload: { kind: 'stage_win', ...race, stageDay: 4, ...who },
    text: 'R wins stage 4 (A → B) of the Race X.',
  },
  {
    payload: { kind: 'tt_win', ...race, stageDay: 4, ...who },
    text: 'R wins the stage 4 (A → B) time trial at the Race X.',
  },
  {
    payload: { kind: 'breakaway_win', ...race, stageDay: 4, ...who },
    text: 'R wins stage 4 (A → B) of the Race X from the breakaway.',
  },
  {
    payload: { kind: 'one_day_win', ...race, stageDay: 1, ...who },
    text: 'R wins the Race X.',
  },
  {
    payload: { kind: 'one_day_tt_win', ...race, stageDay: 1, ...who },
    text: 'R wins the Race X time trial.',
  },
  {
    payload: { kind: 'kom', ...race, stageDay: 21, ...who },
    text: 'R wins the mountains classification at the Race X.',
  },
  {
    payload: { kind: 'gc_win', ...race, stageDay: 21, ...who },
    text: 'R wins the Race X overall.',
  },
  {
    payload: { kind: 'gc_lead_taken', ...race, stageDay: 4, ...who },
    text: 'R takes the overall lead at the Race X.',
  },
  {
    payload: { kind: 'jersey_taken', ...race, stageDay: 4, ...who, jersey: 'points' },
    text: 'R takes the points lead at the Race X.',
  },
  {
    payload: {
      kind: 'contract',
      riderId: 'r1',
      toTeamId: 't2',
      fromTeamId: 't1',
      relocateCountry: 'ES',
      housingCovered: true,
    },
    // Hoy: «R signs for T , relocating to Spain with housing covered.» (la coma con espacio delante).
    text: 'R signs for T, relocating to Spain with housing covered.',
  },
  {
    payload: {
      kind: 'injury',
      ...race,
      stageDay: 4,
      ...who,
      days: 35,
      prevHealth: 'sano',
      prevUntilDay: null,
    },
    text: 'R injured — out for 5 weeks.',
  },
  {
    payload: { kind: 'abandon', ...race, stageDay: 4, ...who, reason: 'colapso' },
    text: 'R abandons the Race X on stage 4 (A → B) — climbs off, out of energy.',
  },
  {
    payload: { kind: 'retirement', ...who, age: 38 },
    text: 'R retires at 38.',
  },
]

const KINDS: readonly NewsKind[] = [
  'stage_win',
  'tt_win',
  'breakaway_win',
  'one_day_win',
  'one_day_tt_win',
  'kom',
  'gc_win',
  'gc_lead_taken',
  'jersey_taken',
  'contract',
  'injury',
  'abandon',
  'retirement',
]

const render = (p: NewsPayload, n: NameResolver = SHORT): string =>
  renderNews('en', p, 'semilla', TEMPLATE_REV, n)

describe('shared: el titular se redacta al leer desde sus datos (B4)', () => {
  it('hay un golden por kind, los trece', () => {
    expect(GOLDENS.map((g) => g.payload.kind).sort()).toEqual([...KINDS].sort())
    expect(Object.keys(NEWS_VARIANTS).sort()).toEqual([...KINDS].sort())
  })

  it.each(GOLDENS)('$payload.kind: «$text»', ({ payload, text }) => {
    expect(render(payload)).toBe(text)
  })

  it('cada titular cabe en una línea: menos de 70 caracteres con nombres cortos', () => {
    // La regla del test del motor que este absorbe (`world/news.test.ts`): un hecho por línea, sin florituras.
    for (const { payload } of GOLDENS) expect(render(payload).length).toBeLessThan(70)
  })

  it('la etapa se cita con su salida y su llegada, una ciudad si coinciden, y sin nada fuera del calendario', () => {
    const stage = (stageDay: number, kind: 'stage_win' | 'tt_win' = 'stage_win'): NewsPayload => ({
      kind,
      ...race,
      stageDay,
      ...who,
    })
    expect(render(stage(4))).toBe('R wins stage 4 (A → B) of the Race X.')
    expect(render(stage(2, 'tt_win'))).toBe(
      'R wins the stage 2 (Barcelona) time trial at the Race X.',
    )
    expect(render(stage(7))).toBe('R wins stage 7 of the Race X.')
  })

  it('el fichaje solo cuenta el traslado si lo hay, y la vivienda solo con traslado', () => {
    const contract = (relocateCountry: string | null, housingCovered: boolean): NewsPayload => ({
      kind: 'contract',
      riderId: 'r1',
      toTeamId: 't2',
      fromTeamId: null,
      relocateCountry,
      housingCovered,
    })
    expect(render(contract(null, false))).toBe('R signs for T.')
    expect(render(contract(null, true))).toBe('R signs for T.')
    expect(render(contract('ES', false))).toBe('R signs for T, relocating to Spain.')
  })

  it('la baja se cuenta en semanas desde 14 días y en días por debajo', () => {
    const injury = (days: number): string =>
      render({
        kind: 'injury',
        ...race,
        stageDay: 4,
        ...who,
        days,
        prevHealth: 'sano',
        prevUntilDay: null,
      })
    expect(injury(1)).toBe('R injured — out for 1 day.')
    expect(injury(5)).toBe('R injured — out for 5 days.')
    expect(injury(13)).toBe('R injured — out for 13 days.')
    expect(injury(14)).toBe('R injured — out for 2 weeks.')
    expect(injury(24)).toBe('R injured — out for 3 weeks.')
  })

  it('el abandono dice por qué con las palabras de hoy, y entre etapas no cita etapa', () => {
    const words: Record<string, string> = {
      colapso: 'climbs off, out of energy',
      fuera_control: 'eliminated on time',
      lesion: 'injured',
      enfermedad: 'ill',
      voluntario: 'withdraws',
    }
    for (const reason of abandonReasonSchema.options) {
      expect(render({ kind: 'abandon', ...race, stageDay: 7, ...who, reason })).toBe(
        `R abandons the Race X on stage 7 — ${words[reason]}.`,
      )
    }
    expect(render({ kind: 'abandon', ...race, stageDay: null, ...who, reason: 'voluntario' })).toBe(
      'R abandons the Race X — withdraws.',
    )
  })

  it('los dos titulares de líder dicen la clasificación que cambia de manos', () => {
    const jersey = (j: 'points' | 'kom'): string =>
      render({ kind: 'jersey_taken', ...race, stageDay: 4, ...who, jersey: j })
    expect(jersey('points')).toBe('R takes the points lead at the Race X.')
    expect(jersey('kom')).toBe('R takes the mountains lead at the Race X.')
  })

  it('los nombres los pone el resolutor al leer: los datos no llevan ninguno', () => {
    const otro: NameResolver = { ...SHORT, rider: () => 'Ana Ruiz', race: () => 'Race France' }
    expect(render(GOLDENS[0]!.payload, otro)).toBe(
      'Ana Ruiz wins stage 4 (A → B) of the Race France.',
    )
  })

  it('todas las redacciones de hoy son una por kind y desde la revisión 0', () => {
    for (const kind of KINDS) {
      const variants: readonly Variant<never>[] = NEWS_VARIANTS[kind]
      expect(variants.map((v) => v.since)).toEqual([0])
    }
  })
})

/**
 * B5 · LA ESTABILIDAD, LA PARTE DE LAS NOTICIAS (docs/retransmision.md §12.7 y §16.4; E2, paso 12). El
 * `sha256` de los trece goldens tal como se leen, con la revisión 0 y la semilla de los goldens: se sella
 * UNA vez, en el paso 12, y desde entonces solo cambia con un re-sellado deliberado, con la causa escrita
 * aquí. La otra mitad, las líneas de voz y de acta de las seis etapas congeladas, está en
 * `apps/web/src/domain/stageJournal.corpus.test.ts`. La semilla de un titular ya era neutra desde el 1a
 * (`news:<kind>:<seed>`, sin nombres) y cada kind tiene una sola redacción, así que la semilla neutra del
 * paso 12 no cambia ninguno de los trece.
 */
const B5_NEWS_SHA256 = '32677995ab32d6d885e7cac3b6e94dfdfa7e1c8e6e5d2914431ee353440e3f47'

describe('B5 · las noticias ya escritas se leen igual (§12.7, §16.4)', () => {
  it('el sha256 de los trece goldens, como se leen', () => {
    const lines = GOLDENS.map(({ payload }) => `${payload.kind} ${render(payload)}`)
    expect(createHash('sha256').update(lines.join('\n')).digest('hex')).toBe(B5_NEWS_SHA256)
  })

  it('una redacción nueva con un since nuevo no mueve ninguno: solo la puede elegir su revisión', () => {
    for (const { payload } of GOLDENS) {
      const today = NEWS_VARIANTS[payload.kind] as readonly Variant<NewsPayload>[]
      const tomorrow = [
        ...today,
        { since: TEMPLATE_REV + 1, render: () => 'una redacción nueva' },
      ] satisfies Variant<NewsPayload>[]
      // la semilla con que renderNews elige la redacción de un titular
      const seed = `news:${payload.kind}:semilla`
      expect(pickVariant(seed, tomorrow, TEMPLATE_REV).render(payload, SHORT)).toBe(render(payload))
    }
  })
})

describe('shared: newsPayloadSchema, lo que la API acepta de news.data', () => {
  it('acepta los trece payloads de los goldens tal cual', () => {
    for (const { payload } of GOLDENS) expect(newsPayloadSchema.parse(payload)).toEqual(payload)
  })

  it('rechaza una lesión sin la salud de antes (la máscara de la ficha la necesita)', () => {
    const lesion = { kind: 'injury', ...race, stageDay: 4, ...who, days: 10, prevUntilDay: null }
    expect(newsPayloadSchema.safeParse(lesion).success).toBe(false)
    expect(newsPayloadSchema.safeParse({ ...lesion, prevHealth: 'molestias' }).success).toBe(true)
    expect(newsPayloadSchema.safeParse({ ...lesion, prevHealth: 'roto' }).success).toBe(false)
  })

  it('rechaza un abandono con un motivo desconocido', () => {
    const p = { kind: 'abandon', ...race, stageDay: 4, ...who, reason: 'aburrimiento' }
    expect(newsPayloadSchema.safeParse(p).success).toBe(false)
  })

  it('rechaza un kind que no existe y un payload sin kind', () => {
    expect(newsPayloadSchema.safeParse({ kind: 'stage_ready', ...race, stageDay: 4 }).success).toBe(
      false,
    )
    expect(newsPayloadSchema.safeParse({ rider: 'Ana Ruiz', race: 'Race France' }).success).toBe(
      false,
    )
  })

  it('el traslado es un código de país de dos letras, o null', () => {
    const contract = {
      kind: 'contract',
      riderId: 'r1',
      toTeamId: 't2',
      fromTeamId: null,
      relocateCountry: 'Spain',
      housingCovered: false,
    }
    expect(newsPayloadSchema.safeParse(contract).success).toBe(false)
    expect(newsPayloadSchema.safeParse({ ...contract, relocateCountry: null }).success).toBe(true)
  })
})

describe('shared: las variantes por revisión (pickVariant, D-46)', () => {
  const v = (since: number, text: string): Variant<null> => ({ since, render: () => text })

  it('fnv1a es el FNV-1a de 32 bits de siempre (los vectores de la referencia)', () => {
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
    expect(fnv1a('foobar')).toBe(0xbf9cf968)
  })

  it('la revisión de las plantillas nace en 0', () => {
    expect(TEMPLATE_REV).toBe(0)
  })

  it('solo elige entre las redacciones que existían en esa revisión', () => {
    const variants = [v(0, 'a'), v(1, 'b')]
    for (let i = 0; i < 50; i++) {
      expect(pickVariant(`semilla-${i}`, variants, 0).render(null, SHORT)).toBe('a')
    }
    const picked = new Set(
      Array.from({ length: 50 }, (_, i) =>
        pickVariant(`semilla-${i}`, variants, 1).render(null, SHORT),
      ),
    )
    expect(picked).toEqual(new Set(['a', 'b']))
  })

  it('añadir una redacción con un since nuevo no re-sortea el pasado', () => {
    const hoy = [v(0, 'a'), v(0, 'b'), v(0, 'c')]
    const mañana = [...hoy, v(1, 'd')]
    for (let i = 0; i < 200; i++) {
      const seed = `etapa-${i}`
      expect(pickVariant(seed, mañana, 0).render(null, SHORT)).toBe(
        pickVariant(seed, hoy, 0).render(null, SHORT),
      )
    }
  })

  it('la elección es FNV-1a de la semilla módulo las redacciones vivas', () => {
    const variants = [v(0, 'a'), v(0, 'b'), v(0, 'c')]
    const seed = 'news:stage_win:win:race-x:s0:187:4'
    expect(pickVariant(seed, variants, 0)).toBe(variants[fnv1a(seed) % 3])
  })

  it('sin ninguna redacción viva en esa revisión, lanza', () => {
    expect(() => pickVariant('s', [v(2, 'a')], 1)).toThrow(/since <= 1/)
  })
})
