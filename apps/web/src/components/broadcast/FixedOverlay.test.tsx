import { BROADCAST } from '@cyclingstar/shared'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FixedOverlay } from './FixedOverlay'
import { castOf, headOf, instantOf, leaderWorn, range } from './__fixtures__/screen'

/**
 * LA CAPA FIJA DE `Watch` (docs/retransmision.md §6.2, 6-f; paso 3c), sobre el HTML que de verdad se
 * pinta: render estático con `renderToStaticMarkup`, como `leaderJerseys.test.tsx`, sin un DOM de
 * mentira. Dos números y contra quién: los km a meta de la cabeza (con un decimal, en metros dentro
 * del último km y en vueltas en un circuito) y la diferencia principal con su tendencia y su
 * referencia; `s.t.` por debajo de `sameTimeS` y `Bunch together` con un solo grupo. El 6b la amplía
 * con lo que §16.6 le pide.
 */

/** El texto que se lee, sin etiquetas y con las entidades de React deshechas. */
function textOf(node: ReactElement): string {
  return renderToStaticMarkup(node)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

const CAST = castOf(176)
const HEAD = headOf(CAST)
const LENGTH = HEAD.stage.lengthKm // 185,04

/** La cabeza de tres a `headKm`, y el pelotón de 124 (con el título) a `gapS`. */
function breakAndBunch(headKm: number, gapS: number) {
  return instantOf(
    [
      { members: [0, 1, 2], km: headKm },
      { members: range(3, 127), km: headKm - 1.5, gapS, kind: 'peloton' },
    ],
    {
      lengthKm: LENGTH,
      racing: 127,
      mainGap: {
        ahead: 0,
        behind: 1,
        gapS,
        trend: { deltaS: 24, windowKm: BROADCAST.trendWindowKm, arrow: 'up' },
        ref: 'bunch',
      },
    },
  )
}

describe('FixedOverlay · los km a meta (§6.2)', () => {
  it('con un decimal: 98.5 km to go', () => {
    const text = textOf(<FixedOverlay instant={breakAndBunch(86.54, 226)} head={HEAD} />)
    expect(text).toContain('98.5 km to go')
  })

  it('en el último km, en metros hacia abajo a la decena; en la línea, 0 m', () => {
    const toGo = (km: number) => ({ ...breakAndBunch(LENGTH - km, 6), toGoKm: km })
    expect(textOf(<FixedOverlay instant={toGo(0.856)} head={HEAD} />)).toMatch(/^850 m to go/)
    expect(textOf(<FixedOverlay instant={toGo(0.0004)} head={HEAD} />)).toMatch(/^0 m to go/)
    expect(textOf(<FixedOverlay instant={toGo(0)} head={HEAD} />)).toMatch(/^0 m to go/)
    // 999 m siguen siendo metros; 1 km justo ya es el decimal
    expect(textOf(<FixedOverlay instant={toGo(0.9999)} head={HEAD} />)).toMatch(/^990 m to go/)
    expect(textOf(<FixedOverlay instant={toGo(1)} head={HEAD} />)).toMatch(/^1\.0 km to go/)
  })

  it('en un circuito, las vueltas delante: 3 laps to go · 42.5 km, y en la última, Last lap', () => {
    const lap = headOf(CAST, { lengthKm: 85 })
    const circuit = { ...lap, profile: { ...lap.profile, laps: 5 } }
    const at = (headKm: number, lapsToGo: number) =>
      instantOf(
        [
          { members: [0, 1, 2], km: headKm },
          { members: range(3, 127), km: headKm - 1, gapS: 40, kind: 'peloton' },
        ],
        { lengthKm: 85, racing: 127, lapsToGo },
      )
    expect(textOf(<FixedOverlay instant={at(42.5, 3)} head={circuit} />)).toMatch(
      /^3 laps to go · 42\.5 km/,
    )
    expect(textOf(<FixedOverlay instant={at(76.8, 1)} head={circuit} />)).toMatch(
      /^Last lap · 8\.2 km to go/,
    )
  })
})

describe('FixedOverlay · la diferencia principal y contra quién (§6.2, 6-b)', () => {
  it('+3:46 con su flecha y su referencia: on the bunch', () => {
    const text = textOf(<FixedOverlay instant={breakAndBunch(86.54, 226)} head={HEAD} />)
    expect(text).toContain('+3:46 ▲ on the bunch')
  })

  it('por debajo de sameTimeS, s.t.; en sameTimeS, ya la cifra', () => {
    const below = breakAndBunch(86.54, BROADCAST.sameTimeS - 1)
    expect(textOf(<FixedOverlay instant={below} head={HEAD} />)).toContain('s.t. ▲ on the bunch')
    const at = breakAndBunch(86.54, BROADCAST.sameTimeS)
    expect(textOf(<FixedOverlay instant={at} head={HEAD} />)).toContain('+0:05 ▲ on the bunch')
  })

  it('desde la hora, con las horas: +1:02:10', () => {
    expect(textOf(<FixedOverlay instant={breakAndBunch(86.54, 3730)} head={HEAD} />)).toContain(
      '+1:02:10',
    )
  })

  it('sin tendencia que enseñar, sin flecha', () => {
    const flat = breakAndBunch(86.54, 226)
    const quiet = {
      ...flat,
      mainGap: { ...flat.mainGap!, trend: { deltaS: 2, windowKm: 5, arrow: 'flat' as const } },
    }
    const text = textOf(<FixedOverlay instant={quiet} head={HEAD} />)
    expect(text).toContain('+3:46 on the bunch')
    expect(text).not.toMatch(/[▲▼]/)
  })

  it('un solo grupo en carrera: Bunch together', () => {
    const together = instantOf([{ members: range(0, 176), km: 40, kind: 'peloton' }], {
      lengthKm: LENGTH,
    })
    expect(together.mainGap).toBeNull()
    expect(textOf(<FixedOverlay instant={together} head={HEAD} />)).toContain('Bunch together')
  })

  it('contra un grupo de tres o menos, por sus nombres; contra el grupo del maillot, por el maillot', () => {
    // el pelotón en cabeza y detrás dos sueltos: la referencia es el segundo, que se nombra
    const twoBehind = instantOf(
      [
        { members: range(2, 176), km: 120, kind: 'peloton' },
        { members: [0, 1], km: 119.6, gapS: 35 },
      ],
      { lengthKm: LENGTH },
    )
    expect(textOf(<FixedOverlay instant={twoBehind} head={HEAD} />)).toContain(
      `on ${CAST[0]!.name} and ${CAST[1]!.name}`,
    )
    // la fuga delante y el líder en un grupo de 20 detrás de ella, sin pelotón de dos tercios
    const leaderBehind = instantOf(
      [
        { members: range(20, 30), km: 120 },
        { members: range(0, 20), km: 119, gapS: 75, jerseys: ['gc'] },
        { members: range(30, 176), km: 118, gapS: 140, kind: 'peloton' },
      ],
      {
        lengthKm: LENGTH,
        racing: 176,
        mainGap: { ahead: 0, behind: 1, gapS: 75, trend: null, ref: 'jersey_group' },
      },
    )
    expect(leaderBehind.groups[1]!.label).toEqual({ k: 'jersey_group', jersey: 'gc' })
    expect(textOf(<FixedOverlay instant={leaderBehind} head={HEAD} />)).toContain(
      '+1:15 on the race leader’s group',
    )
  })

  it('en los últimos quietFinalM, solo la distancia (§6.9)', () => {
    const text = textOf(<FixedOverlay instant={breakAndBunch(LENGTH - 0.45, 12)} head={HEAD} />)
    expect(text).toBe('450 m to go')
  })
})

describe('FixedOverlay · la segunda línea, al tocarla (6-f)', () => {
  it('reloj, velocidad de la cabeza, pendiente, tiempo y el detalle de la tendencia', () => {
    const base = breakAndBunch(86.54, 226)
    const withSpeed = {
      ...base,
      t: 7740,
      groups: base.groups.map((g, i) =>
        i === 0
          ? {
              ...g,
              detail: { g: 0, speedKmh: 22.9, pullingTotal: 3, pullers: [], mishap: null },
            }
          : g,
      ),
    }
    const closed = textOf(<FixedOverlay instant={withSpeed} head={HEAD} />)
    expect(closed).not.toContain('2:09:00')
    const open = textOf(<FixedOverlay instant={withSpeed} head={HEAD} expanded />)
    // la cota del km 86 al 87 sube 50 m: 5,0 %; el tramo del tiempo desde el km 80 lleva lluvia y viento cruzado
    expect(open).toContain('2:09:00 · 22.9 km/h · 5.0% · 21°C · rain · crosswind · ▲ 0:24 in 5 km')
  })

  it('sin velocidad medida ni tendencia, no se escriben', () => {
    const base = breakAndBunch(30.2, 60)
    const plain = { ...base, t: 2700, mainGap: { ...base.mainGap!, trend: null } }
    const open = textOf(<FixedOverlay instant={plain} head={HEAD} expanded />)
    expect(open).toContain('0:45:00 · 0.0% · 21°C')
    expect(open).not.toContain('km/h')
    expect(open).not.toContain(' in 5 km')
  })

  it('el líder de la carrera en la cabeza no cambia la capa: los maillots son de la barra', () => {
    const cast = castOf(176, { 0: { worn: leaderWorn('gc') } })
    const text = textOf(<FixedOverlay instant={breakAndBunch(86.54, 226)} head={headOf(cast)} />)
    expect(text).toBe('98.5 km to go +3:46 ▲ on the bunch')
  })
})
