import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import type { RadioGroupKind } from '../contracts.js'
import { synthLine, toyStage, toyStageWithDrop } from './__fixtures__/syntheticLine.js'
import { decodeTimeline } from './codec.js'
import { BROADCAST } from './constants.js'
import { chunkOf, cutTimeline, visibilityOf } from './cut.js'
import {
  type GroupNow,
  type InstantContext,
  chaseRefOf,
  groupLabelOf,
  groupRoleAt,
  groupRoleOf,
  instantAt,
  isGroupRole,
  mainGapOf,
  photoBlocksOf,
} from './instant.js'
import { GROUP_WORDS, groupLabelText } from './names.js'
import { clockMarksOf, photoAt } from './reduce.js'
import { type TimelineCore, toDs } from './timeline.js'
import type { StartState } from './wire.js'

/**
 * EL INSTANTE (E2, docs/retransmision.md §4.5, §6.2 y §6.3). Los casos de los papeles y de las
 * etiquetas de la tabla de §6.3 (los ocho primeros son los de `raceRadioNames.test.tsx`, que el 6b
 * re-sella), los de la diferencia principal de §6.2 y el instante sobre la etapa de juguete de
 * `__fixtures__/syntheticLine.ts`: la salida, I2, el tránsito, que lo pintado no retroceda y la
 * causalidad de B9. B9 sobre las cinco etapas congeladas va en `apps/api/src/broadcastCut.test.ts`.
 */

const road = (...xs: [number, RadioGroupKind][]) => xs.map(([size, kind]) => ({ size, kind }))
const labelOf = (
  size: number,
  role: ReturnType<typeof groupRoleOf>[number],
  groups: number,
  jerseys: readonly ('gc' | 'points' | 'kom')[] = [],
) =>
  groupLabelText(
    'en',
    groupLabelOf(
      size,
      Array.from({ length: size }, (_, i) => i),
      jerseys,
      role,
      groups,
    ),
    role,
    'bar',
    (r) => `Rider ${r}`,
  )

describe('groupRoleOf y groupLabelOf · un vocabulario y una regla (§6.3, D-18)', () => {
  it('el pelotón de 129 de 130 en cabeza y uno suelto detrás: Bunch, y el suelto por su nombre', () => {
    const roles = groupRoleOf(road([129, 'peloton'], [1, 'grupeto']), 130)
    expect(roles).toEqual(['bunch', 'gruppetto'])
    expect(labelOf(129, roles[0]!, 2)).toBe('Bunch')
    expect(labelOf(1, roles[1]!, 2)).toBe('Rider 0')
  })

  it('130 de 130 en un solo grupo: Bunch together', () => {
    const roles = groupRoleOf(road([130, 'peloton']), 130)
    expect(roles).toEqual(['bunch'])
    expect(labelOf(130, roles[0]!, 1)).toBe('Bunch together')
  })

  it('el pelotón de 110 de 130, segundo en carretera: Bunch', () => {
    expect(groupRoleOf(road([20, 'fuga'], [110, 'peloton']), 130)).toEqual(['lead', 'bunch'])
  })

  it('la carrera partida en 59 y 65 (con el título) de 124: Lead group y Chase group, porque 65 no son dos tercios', () => {
    const roles = groupRoleOf(road([59, 'fuga'], [65, 'peloton']), 124)
    expect(roles).toEqual(['lead', 'chase'])
    expect(roles.map((r, i) => labelOf(i === 0 ? 59 : 65, r, 2))).toEqual([
      'Lead group',
      'Chase group',
    ])
  })

  it('una contra de 8 entre la cabeza y el pelotón de 115 de 130: Chase group', () => {
    expect(groupRoleOf(road([7, 'fuga'], [8, 'contra'], [115, 'peloton']), 130)).toEqual([
      'lead',
      'chase',
      'bunch',
    ])
  })

  it('un corredor suelto (tierra) tercero: su nombre, no No man’s land', () => {
    const roles = groupRoleOf(road([10, 'fuga'], [119, 'peloton'], [1, 'tierra']), 130)
    expect(groupLabelOf(1, [42], [], roles[2]!, 3)).toEqual({ k: 'names', riders: [42] })
  })

  it('un grupeto de 12 detrás del pelotón: Gruppetto, con dos pes', () => {
    const roles = groupRoleOf(road([118, 'peloton'], [12, 'grupeto']), 130)
    expect(roles).toEqual(['bunch', 'gruppetto'])
    expect(labelOf(12, roles[1]!, 2)).toBe('Gruppetto')
  })

  it('el grupo del título con 40 de 130, tercero: Chase group, no 3rd group', () => {
    expect(groupRoleOf(road([50, 'fuga'], [40, 'contra'], [40, 'peloton']), 130)[2]).toBe('chase')
  })

  it('el líder de la general en un grupo de 20 detrás del pelotón: Race leader’s group', () => {
    const roles = groupRoleOf(road([110, 'peloton'], [20, 'grupeto']), 130)
    expect(labelOf(20, roles[1]!, 2, ['gc'])).toBe('Race leader’s group')
    // el del maillot se llama igual en la voz (6-b)
    expect(GROUP_WORDS.jersey.gc[1]).toBe('the race leader’s group')
  })

  it('una fuga de 5, el título con 100 de 176 (57 %) y 71 detrás: Lead group, Chase group, Gruppetto', () => {
    expect(groupRoleOf(road([5, 'fuga'], [100, 'peloton'], [71, 'grupeto']), 176)).toEqual([
      'lead',
      'chase',
      'gruppetto',
    ])
  })

  it('el título con 100 de 176 en cabeza y 76 detrás, sin fuga: los 76 son la referencia de chaseReferenceIndex', () => {
    expect(groupRoleOf(road([100, 'peloton'], [76, 'grupeto']), 176)).toEqual(['lead', 'chase'])
  })

  it('el instante de §6.1: tres filas con nombres, Bunch, Gruppetto, Gruppetto y un nombre', () => {
    const sizes = [3, 3, 2, 124, 35, 5, 1]
    const kinds: RadioGroupKind[] = [
      'fuga',
      'contra',
      'contra',
      'peloton',
      'grupeto',
      'grupeto',
      'grupeto',
    ]
    const roles = groupRoleOf(
      sizes.map((size, i) => ({ size, kind: kinds[i]! })),
      176,
    )
    expect(roles).toEqual([
      'lead',
      'chase',
      'chase',
      'bunch',
      'gruppetto',
      'gruppetto',
      'gruppetto',
    ])
    const labels = sizes.map((s, i) => groupLabelOf(s, [], [], roles[i]!, sizes.length).k)
    expect(labels).toEqual(['names', 'names', 'names', 'role', 'role', 'role', 'names'])
  })

  it('el maillot nombra al grupo solo si persigue o va descolgado, y manda JERSEY_PRIORITY', () => {
    expect(groupLabelOf(20, [], ['points', 'kom'], 'chase', 3)).toEqual({
      k: 'jersey_group',
      jersey: 'points',
    })
    expect(groupLabelOf(20, [], ['gc'], 'lead', 3)).toEqual({ k: 'role' })
    expect(groupLabelOf(20, [], ['gc'], 'bunch', 3)).toEqual({ k: 'role' })
  })

  it('la voz dice las mismas palabras, en minúscula y con artículo; tres nombres, como lista', () => {
    expect(groupLabelText('en', { k: 'role' }, 'gruppetto', 'voice', String)).toBe('the gruppetto')
    expect(groupLabelText('en', { k: 'together' }, 'bunch', 'voice', String)).toBe('the bunch')
    expect(
      groupLabelText('en', { k: 'names', riders: [1, 2, 3] }, 'lead', 'voice', (r) => `R${r}`),
    ).toBe('R1, R2 and R3')
    expect(
      groupLabelText('en', { k: 'names', riders: [1, 2] }, 'lead', 'bar', (r) => `R${r}`),
    ).toBe('R1 · R2')
  })

  it('chaseRefOf: el mayor que corre, o el primero que llega a la fracción; −1 sin nadie detrás', () => {
    expect(chaseRefOf([], 0.5)).toBe(-1)
    expect(
      chaseRefOf(
        [
          { size: 3, racing: true },
          { size: 40, racing: true },
        ],
        0.5,
      ),
    ).toBe(1)
    expect(
      chaseRefOf(
        [
          { size: 30, racing: true },
          { size: 40, racing: true },
        ],
        0.5,
      ),
    ).toBe(0)
    // nadie corre de verdad: entre todos
    expect(
      chaseRefOf(
        [
          { size: 1, racing: true },
          { size: 9, racing: false },
        ],
        0.5,
      ),
    ).toBe(1)
  })

  it('isGroupRole guarda lo que llega sin tipo en datos (§12.6)', () => {
    expect(isGroupRole('chase')).toBe(true)
    expect(isGroupRole('peloton')).toBe(false)
    expect(isGroupRole(3)).toBe(false)
  })
})

/** Un grupo del instante con lo que mira mainGapOf. */
function gnow(
  g: number,
  over: Partial<Pick<GroupNow, 'role' | 'kind' | 'jerseys' | 'members' | 'gap'>> = {},
): GroupNow {
  return {
    g,
    number: g + 1,
    role: 'chase',
    label: { k: 'role' },
    kind: 'contra',
    km: 100 - g,
    size: 10,
    members: [g * 10],
    gap: { toHeadS: 0, toAheadS: null, atKm: 84.05, trend: null },
    detail: null,
    jerseys: [],
    own: false,
    ...over,
  }
}
const START: StartState = {
  leaders: { gc: 3, points: null, kom: null },
  gcTop: [],
  racingAtStart: 176,
}

describe('mainGapOf · la diferencia principal y contra quién (§6.2, D-17)', () => {
  /** Las marcas en Ds de cada grupo en el km de foto: la cabeza a 1000 y cada grupo 50 s detrás del anterior. */
  const markAt = (g: GroupNow): number => 1000 + g.g * 500

  it('con un solo grupo no hay diferencia: Bunch together', () => {
    expect(mainGapOf([gnow(0, { role: 'bunch', kind: 'peloton' })], START, markAt)).toBeNull()
  })

  it('la fuga contra el pelotón, aunque haya otros grupos entre medias (on the bunch)', () => {
    const trend = { deltaS: 24, windowKm: 5, arrow: 'up' as const }
    const gap = mainGapOf(
      [
        gnow(0, { role: 'lead', kind: 'fuga' }),
        gnow(1),
        gnow(2, {
          role: 'bunch',
          kind: 'peloton',
          gap: { toHeadS: 100, toAheadS: 50, atKm: 84.05, trend },
        }),
      ],
      START,
      markAt,
    )
    expect(gap).toEqual({ ahead: 0, behind: 2, gapS: 100, trend, ref: 'bunch' })
  })

  it('sin grueso, el del título hace de pelotón (6-b)', () => {
    const gap = mainGapOf(
      [gnow(0, { role: 'lead', kind: 'fuga' }), gnow(1, { role: 'chase', kind: 'peloton' })],
      START,
      markAt,
    )
    expect(gap?.ref).toBe('bunch')
    expect(gap?.behind).toBe(1)
  })

  it('el pelotón en cabeza: contra el primero de detrás con un maillot o un top 3 de salida', () => {
    const head = gnow(0, { role: 'bunch', kind: 'peloton' })
    const withJersey = mainGapOf([head, gnow(1), gnow(2, { jerseys: ['gc'] })], START, markAt)
    expect(withJersey).toMatchObject({ behind: 2, ref: 'jersey_group', gapS: 100 })
    const top3: StartState = { ...START, gcTop: [{ rider: 10, rank: 3, gapS: 40 }] }
    expect(mainGapOf([head, gnow(1), gnow(2)], top3, markAt)).toMatchObject({
      behind: 1,
      ref: 'jersey_group',
    })
  })

  it('y si no hay ninguno, contra el segundo; el hueco nunca es negativo', () => {
    const head = gnow(0, { role: 'bunch', kind: 'peloton' })
    expect(mainGapOf([head, gnow(1)], START, markAt)).toMatchObject({
      behind: 1,
      ref: 'second',
      gapS: 50,
    })
    expect(mainGapOf([head, gnow(1)], START, () => 1000)).toMatchObject({ gapS: 0 })
  })
})

describe('photoBlocksOf · el calendario público de fotos (§4.5, 4-o)', () => {
  it('una foto por km entero, en el bloque cuyo centro es ese km, y otra en el último km', () => {
    // Como el motor, en coma flotante: 2,9 / 0,1 es 28,999…, y la última foto de una etapa de 3 km
    // cae en el bloque 28, no en el 29 (la de 175 km, en el último bloque; lo ata broadcastConstants.test.ts).
    expect(photoBlocksOf(3, 0.1)).toEqual([0, 10, 20, 28])
    expect(photoBlocksOf(175, 0.1).at(-1)).toBe(1749)
    expect(photoBlocksOf(175, 0.1)).toHaveLength(176)
  })

  it('sin repetir bloque y siempre dentro de la etapa, como el Map del motor', () => {
    for (const km of [0.25, 3, 157.2, 278.21]) {
      const blocks = photoBlocksOf(km, 0.1)
      expect(new Set(blocks).size).toBe(blocks.length)
      expect(blocks[0]).toBe(0)
      expect(blocks.at(-1)!).toBeLessThan(Math.round(km / 0.1))
      for (let i = 1; i < blocks.length; i++) expect(blocks[i]!).toBeGreaterThan(blocks[i - 1]!)
    }
  })
})

describe('instantAt · el corte diagonal sobre la etapa de juguete (§4.5)', () => {
  const { photos, riderIds } = toyStage()
  const { tl, ixOf } = synthLine(photos, riderIds, { photoEvery: 10, keyEvery: 20, lastBlocks: 10 })
  const ctx: InstantContext = {
    own: new Set([5]),
    start: { leaders: { gc: 0, points: null, kom: null }, gcTop: [], racingAtStart: 8 },
    photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
  }
  const finishDs = visibilityOf(tl).finishDs
  const mov = ixOf.get('mov-1')!
  const shed = ixOf.get('shed-2')!

  it('en la salida, antes de la primera marca, un solo grupo en el km 0 con todo el reparto (3-f)', () => {
    const i = instantAt(tl, 0, ctx)
    expect(i.groups).toHaveLength(1)
    expect(i.groups[0]).toMatchObject({ g: 0, km: 0, size: 8, label: { k: 'together' } })
    expect(i.mainGap).toBeNull()
    expect(i.toGoKm).toBeCloseTo(tl.lengthKm, 6)
  })

  it('I2: en la hora de su marca en un km de foto, cada grupo lleva a los de la foto (salvo los pintados atrás)', () => {
    for (const k of ctx.photoBlocks) {
      for (const [id, s] of Object.entries(photos[k]!.clockS)) {
        const g = ixOf.get(id)!
        const i = instantAt(tl, s, ctx)
        const now = i.groups.find((x) => x.g === g)
        expect(now, `${id} en el bloque ${k}`).toBeDefined()
        const inPhoto = [...photoAt(tl, k).groupOf].flatMap((x, r) => (x === g ? [r] : []))
        const paintedBehind = new Set(i.inTransit.filter((x) => x.to === g).map((x) => x.rider))
        expect(now!.members, `${id} en el bloque ${k}`).toEqual(
          inPhoto.filter((r) => !paintedBehind.has(r)),
        )
      }
    }
  })

  it('el ataque se ve al pasar su marca de nacimiento, y va en cabeza con su hueco a la cabeza a 0', () => {
    const born = photos[12]!.clockS['mov-1']!
    expect(instantAt(tl, born - 0.5, ctx).groups.map((g) => g.g)).not.toContain(mov)
    const later = instantAt(tl, photos[20]!.clockS['mov-1']!, ctx)
    expect(later.groups[0]!.g).toBe(mov)
    expect(later.groups[0]!.gap.toHeadS).toBe(0)
    expect(later.mainGap).toMatchObject({ ahead: mov, ref: 'bunch' })
  })

  it('el que se baja deja de contar al pasar su grupo; el cazado muere y su gente vuelve al pelotón', () => {
    const end = instantAt(tl, finishDs / 10, ctx)
    expect(end.racing).toBe(7)
    expect(end.gone).toBe(1)
    expect(end.groups.map((g) => g.g)).not.toContain(shed)
    expect(end.groups.find((g) => g.g === 0)!.members).toContain(5)
    expect(end.groups.find((g) => g.g === 0)!.own).toBe(true)
  })

  it('el título que cambia de grupo cambia el pelotón y el papel', () => {
    const end = instantAt(tl, finishDs / 10, ctx)
    expect(end.groups.find((g) => g.kind === 'peloton')?.g).toBe(mov)
  })

  it('lo pintado no retrocede nunca, y el que lleva el maillot se ve en su grupo', () => {
    const last = new Map<number, number>()
    for (let ds = 0; ds <= finishDs; ds += 7) {
      const i = instantAt(tl, ds / 10, ctx)
      for (const g of i.groups) {
        expect(g.km, `${g.g} a ${ds}`).toBeGreaterThanOrEqual(last.get(g.g) ?? 0)
        last.set(g.g, g.km)
        expect(g.jerseys.includes('gc')).toBe(g.members.includes(0))
      }
    }
  })

  it('B9 en pequeño: lo que se ve en T no cambia al cortar la línea en T, el corte es idempotente y los tramos suman la etapa', () => {
    for (let ds = 0; ds < finishDs; ds += 13) {
      const T = ds / 10
      const cut = cutTimeline(tl, T)
      expect(instantAt(cut, T, ctx), `T = ${T}`).toEqual(instantAt(tl, T, ctx))
      expect(cutTimeline(cut, T)).toEqual(cut)
    }
    const whole = chunkOf(tl, 0, finishDs)
    const joined: Record<string, unknown[]> = {}
    for (let from = 0; from < finishDs; from += 50) {
      const to = Math.min(from + 50, finishDs)
      const c = chunkOf(tl, from, to)
      expect(c).toEqual(chunkOf(cutTimeline(tl, to / 10), from, to))
      for (const [k, v] of Object.entries(c))
        if (Array.isArray(v)) joined[k] = [...(joined[k] ?? []), ...v]
    }
    for (const [k, v] of Object.entries(whole))
      if (Array.isArray(v)) expect(joined[k] ?? [], k).toEqual(v)
  })

  it('el tránsito: el descolgado va de su grupo al que lo recoge mientras el de detrás no llega al bloque', () => {
    // r5 se descuelga en el 25 a shed-2, que nace allí; entre el paso del pelotón y el de shed-2 por
    // ese bloque no va en ningún grupo
    const peloton25 = photos[25]!.clockS.peloton!
    const shed25 = photos[25]!.clockS['shed-2']!
    expect(shed25).toBeGreaterThan(peloton25)
    const between = instantAt(tl, (peloton25 + shed25) / 2, ctx)
    expect(between.inTransit).toEqual([expect.objectContaining({ rider: 5, from: 0, to: shed })])
    expect(between.groups.flatMap((g) => g.members)).not.toContain(5)
  })

  it('las constantes de la histéresis y de la tendencia son las de §15.3', () => {
    expect(BROADCAST.roleHysteresisKm).toBe(1)
    expect(BROADCAST.trendWindowKm).toBe(5)
  })

  it('un mishap de estado se ve con el suceso que lo cuenta, con su km en cualquiera de las dos décimas de su bloque (4-s)', () => {
    // r5 pincha en el bloque 25, el de su descuelgue. El motor fecha el suceso en el centro del bloque
    // (2,55 km), que guardado en décimas puede ser 2,5 o 2,6 según el redondeo; el grabador del 4b da
    // las dos (y con la regla del 3a, el bloque del km redondeado, solo casaba la primera).
    const revealS = photos[25]!.clockS.peloton! + 3
    const withMishap = (km: number): TimelineCore => {
      const at = tl.stateEvents.findIndex((e) => e.b > 25)
      return {
        ...tl,
        stateEvents: [
          ...tl.stateEvents.slice(0, at),
          { t: 'mishap', b: 25, rider: 5, kind: 'pinchazo', lostDs: 250 },
          ...tl.stateEvents.slice(at),
        ],
        events: [
          {
            source: 0,
            plantilla: 'puncture',
            km,
            tS: revealS,
            bEmit: 25,
            revealS,
            riders: [5],
            datos: null,
          },
        ],
      }
    }
    for (const km of [2.5, 2.6]) {
      const line = withMishap(km)
      const i = line.stateEvents.findIndex((e) => e.t === 'mishap')
      expect(visibilityOf(line).stateEventDs[i], `km ${km}`).toBe(toDs(revealS))
    }
    // el de otro bloque no lo cuenta: se ve con la marca de su grupo
    const far = withMishap(2.7)
    const i = far.stateEvents.findIndex((e) => e.t === 'mishap')
    expect(visibilityOf(far).stateEventDs[i]).not.toBe(toDs(revealS))
  })
})

describe('instantAt · una marca que baja (nota 1 del 4b): la resuelve el instante, con el máximo acumulado del reloj del grupo', () => {
  const { photos, riderIds } = toyStageWithDrop()
  const { tl, ixOf } = synthLine(photos, riderIds, { photoEvery: 10, keyEvery: 20, lastBlocks: 10 })
  const ctx: InstantContext = {
    own: new Set(),
    start: { leaders: { gc: null, points: null, kom: null }, gcTop: [], racingAtStart: 8 },
    photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
  }
  const shed = ixOf.get('shed-2')!
  const { finishDs } = visibilityOf(tl)
  const at29 = toDs(photos[29]!.clockS['shed-2']!)
  const at30 = toDs(photos[30]!.clockS['shed-2']!)
  const at45 = toDs(photos[45]!.clockS['shed-2']!)
  const at46 = toDs(photos[46]!.clockS['shed-2']!)
  /** Las marcas de un tramo, de tres en tres. */
  const triples = (xs: readonly number[]): number[][] => {
    const out: number[][] = []
    for (let i = 0; i + 2 < xs.length; i += 3) out.push([xs[i]!, xs[i + 1]!, xs[i + 2]!])
    return out
  }

  it('la línea las lleva tal cual: la marca de shed-2 en el 30 es 10 s menor que la del 29, y la de su muerte en el 46, menor que la del 45', () => {
    const marks = clockMarksOf(tl, shed)
    expect(marks.find(([b]) => b === 29)?.[1]).toBe(at29)
    expect(marks.find(([b]) => b === 30)?.[1]).toBe(at30)
    expect(at29 - at30).toBe(100)
    expect(tl.groups[shed]!.diedB).toBe(46)
    expect(marks.find(([b]) => b === 45)?.[1]).toBe(at45)
    expect(at46).toBeLessThan(at45)
  })

  it('la muerte se ve a su marca, con su reloj, aunque baje: desde entonces shed-2 no se pinta (lo que pide I2 del banco)', () => {
    expect(visibilityOf(tl).groupDiedDs[shed]).toBe(at46)
    expect(instantAt(tl, at46 / 10, ctx).groups.map((g) => g.g)).not.toContain(shed)
    expect(instantAt(tl, (at46 - 1) / 10, ctx).groups.map((g) => g.g)).toContain(shed)
    // y su marca del 45, que no se ve hasta su reloj, va en el tramo de su hora, después de la muerte
    expect(triples(chunkOf(tl, 0, at46).clocks)).toContainEqual([46, shed, at46])
    expect(triples(chunkOf(tl, 0, at46).clocks)).not.toContainEqual([45, shed, at45])
  })

  it('la marca que baja se ve con la anterior, nunca antes: el primer tramo que la lleva es el de la del 29', () => {
    expect(triples(chunkOf(tl, 0, at29 - 1).clocks)).not.toContainEqual([30, shed, at30])
    expect(triples(chunkOf(tl, 0, at29).clocks)).toContainEqual([30, shed, at30])
    // y en el tramo va con su reloj de verdad: la web lo necesita para el hueco
    expect(triples(chunkOf(tl, at29 - 1, at29).clocks)).toContainEqual([29, shed, at29])
  })

  it('B9: lo que se ve en T no cambia al cortar la línea en T, en cada décima alrededor de las dos y en toda la etapa', () => {
    const around = [
      [at30 - 20, at29 + 20],
      [at46 - 20, at45 + 20],
    ] as const
    for (const [from, to] of around)
      for (let ds = from; ds <= to; ds++) {
        const T = ds / 10
        const cut = cutTimeline(tl, T)
        expect(instantAt(cut, T, ctx), `T = ${T}`).toEqual(instantAt(tl, T, ctx))
        expect(cutTimeline(cut, T)).toEqual(cut)
      }
    for (let ds = 0; ds < finishDs; ds += 7)
      expect(instantAt(cutTimeline(tl, ds / 10), ds / 10, ctx), `T = ${ds / 10}`).toEqual(
        instantAt(tl, ds / 10, ctx),
      )
  })

  it('los tramos, uno tras otro, son la línea cortada en su borde también con la marca que baja', () => {
    const joined: number[][] = []
    for (let from = 0; from < finishDs; from += 50) {
      const to = Math.min(from + 50, finishDs)
      const c = chunkOf(tl, from, to)
      expect(c).toEqual(chunkOf(cutTimeline(tl, to / 10), from, to))
      joined.push(...triples(c.clocks))
      const cut = cutTimeline(tl, Math.min(to, finishDs - 1) / 10)
      const want = cut.stateEvents.flatMap((e) =>
        e.t === 'clock' ? e.marks.map(([g, ds]) => [e.b, g, ds]) : [],
      )
      const byBlock = (x: number[], y: number[]): number => x[0]! - y[0]! || x[1]! - y[1]!
      expect([...joined].sort(byBlock), `hasta ${to}`).toEqual(want.sort(byBlock))
    }
  })

  it('lo pintado de shed-2 no retrocede, y no pasa del bloque 30 hasta que se ve su marca del 29', () => {
    let last = 0
    for (let ds = 0; ds <= finishDs; ds++) {
      const g = instantAt(tl, ds / 10, ctx).groups.find((x) => x.g === shed)
      if (g === undefined) continue
      expect(g.km, `a ${ds}`).toBeGreaterThanOrEqual(last)
      last = g.km
      if (ds < at29) expect(g.km, `a ${ds}`).toBeLessThanOrEqual((30 + 0.5) * tl.dx + 1e-9)
    }
  })

  it('r6, que cae del pelotón a shed-2, se pinta en un solo grupo a cada hora, y acaba en shed-2', () => {
    for (let ds = at30 - 200; ds <= at29 + 50; ds++) {
      const i = instantAt(tl, ds / 10, ctx)
      const painted = i.groups.filter((g) => g.members.includes(6)).length
      const moving = i.inTransit.filter((x) => x.rider === 6).length
      expect(painted, `a ${ds}`).toBeLessThanOrEqual(1)
      expect(painted + moving, `a ${ds}`).toBeGreaterThanOrEqual(1)
    }
    const after = instantAt(tl, at29 / 10 + 1, ctx)
    expect(after.groups.find((g) => g.g === shed)?.members).toContain(6)
  })
})

describe('groupRoleAt · el papel y la etiqueta de un grupo, los de instantAt (6b, §12.6)', () => {
  // la reina e20 de las congeladas, con su línea grabada: la de más grupos y papeles que cambian
  const tl = decodeTimeline(
    JSON.parse(
      gunzipSync(
        readFileSync(
          new URL(
            '../../../../apps/api/src/__fixtures__/broadcast/race-france-e20.timeline.gz',
            import.meta.url,
          ),
        ),
      ).toString('utf8'),
    ),
  )
  const leaders: { gc: number | null; points: number | null; kom: number | null } = {
    gc: null,
    points: null,
    kom: null,
  }
  for (const c of tl.cast.riders) if (c.worn.kind === 'leader') leaders[c.worn.jersey] = c.rider
  const ctx: InstantContext = {
    own: new Set(),
    start: { leaders, gcTop: [], racingAtStart: tl.riderIds.length },
    photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
  }

  it('cada 60 s y para cada grupo, lo mismo que el instante: la voz y la barra dicen la misma palabra', () => {
    let checked = 0
    let hysteresis = 0
    for (let t = 0; t < tl.finish.finishS; t += 60) {
      const i = instantAt(tl, t, ctx)
      for (const g of i.groups) {
        const got = groupRoleAt(tl, t, ctx, (x) => x.g === g.g)
        expect(got, `t ${t} g ${g.g}`).toEqual({ g: g.g, role: g.role, label: g.label })
        checked++
        const raw = groupRoleOf(
          i.groups.map((x) => ({ size: x.size, kind: x.kind })),
          i.racing,
        )[g.number - 1]
        if (raw !== g.role) hysteresis++
      }
      // el del título, como lo pide withGroupRoles
      const main = i.groups.find((x) => x.kind === 'peloton')
      expect(groupRoleAt(tl, t, ctx, (x) => x.kind === 'peloton')?.role).toBe(main?.role)
    }
    expect(checked).toBeGreaterThan(500)
    expect(hysteresis).toBeGreaterThan(0) // la histéresis entra: no es solo el papel crudo
    expect(groupRoleAt(tl, 100, ctx, () => false)).toBeNull()
  })
})
