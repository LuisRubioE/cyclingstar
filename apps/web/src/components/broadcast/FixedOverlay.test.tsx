import { BROADCAST } from '@cyclingstar/shared'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  overlayDetailText,
  overlaySummaryText,
  overlayTrendOf,
} from '../../domain/broadcast/screen'
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

/**
 * RE-SELLADO EN EL PR 20 (E3, docs/visual.md §14.3; §16.3): la flecha de la tendencia era el glifo `▲` o
 * `▼` en dos colores, y pasa al icono `trend` de 16 en `gold`, girado y `aria-hidden`, porque `ui/10` no
 * deja un glifo en la interfaz. El texto que se lee pierde la flecha; dónde está y hacia dónde apunta lo
 * mira `trendOf`.
 */
function trendOf(node: ReactElement): string | null {
  const html = renderToStaticMarkup(node)
  const m =
    /data-trend="(up|down)"[^>]*>\s*<svg[^>]*aria-hidden="true"[^>]*>\s*<g transform="rotate\((-?\d+) 12 12\)">/.exec(
      html,
    )
  return m === null ? null : `${m[1]} ${m[2]}`
}

describe('FixedOverlay · la diferencia principal y contra quién (§6.2, 6-b)', () => {
  it('+3:46 con su flecha y su referencia: on the bunch', () => {
    const node = <FixedOverlay instant={breakAndBunch(86.54, 226)} head={HEAD} />
    expect(textOf(node)).toContain('+3:46 on the bunch')
    expect(trendOf(node)).toBe('up -90')
  })

  it('por debajo de sameTimeS, s.t.; en sameTimeS, ya la cifra', () => {
    const below = breakAndBunch(86.54, BROADCAST.sameTimeS - 1)
    expect(textOf(<FixedOverlay instant={below} head={HEAD} />)).toContain('s.t. on the bunch')
    const at = breakAndBunch(86.54, BROADCAST.sameTimeS)
    expect(textOf(<FixedOverlay instant={at} head={HEAD} />)).toContain('+0:05 on the bunch')
  })

  it('la tendencia que baja gira el icono hacia abajo', () => {
    const up = breakAndBunch(86.54, 226)
    const down = {
      ...up,
      mainGap: { ...up.mainGap!, trend: { deltaS: -24, windowKm: 5, arrow: 'down' as const } },
    }
    expect(trendOf(<FixedOverlay instant={down} head={HEAD} />)).toBe('down 90')
  })

  it('abierta, la tendencia que baja se escribe en positivo, con la flecha hacia abajo (PR 21n)', () => {
    const up = breakAndBunch(86.54, 226)
    const down = {
      ...up,
      mainGap: { ...up.mainGap!, trend: { deltaS: -24, windowKm: 5, arrow: 'down' as const } },
    }
    expect(overlayTrendOf(down, HEAD)).toEqual({ arrow: 'down', text: '0:24 in 5 km' })
    const open = renderToStaticMarkup(<FixedOverlay instant={down} head={HEAD} expanded />)
    expect(textOf(<FixedOverlay instant={down} head={HEAD} expanded />)).toContain(
      ' · 0:24 in 5 km',
    )
    expect(open.match(/data-trend="down"/g)?.length).toBe(2)
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
    const node = <FixedOverlay instant={quiet} head={HEAD} />
    expect(textOf(node)).toContain('+3:46 on the bunch')
    expect(trendOf(node)).toBeNull()
    expect(renderToStaticMarkup(node)).not.toContain('data-trend')
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
    // RE-SELLADO EN EL PR 21n (E3, ui/10): el ▲ de la tendencia pasa al icono `trend`, girado y que no se
    // lee, como el de la primera línea; las palabras, las de siempre
    expect(open).toContain('2:09:00 · 22.9 km/h · 5.0% · 21°C · rain · crosswind · 0:24 in 5 km')
    expect(overlayDetailText(withSpeed, HEAD)).toBe(
      '2:09:00 · 22.9 km/h · 5.0% · 21°C · rain · crosswind',
    )
    expect(overlayTrendOf(withSpeed, HEAD)).toEqual({ arrow: 'up', text: '0:24 in 5 km' })
    const openMarkup = renderToStaticMarkup(
      <FixedOverlay instant={withSpeed} head={HEAD} expanded />,
    )
    const closedMarkup = renderToStaticMarkup(<FixedOverlay instant={withSpeed} head={HEAD} />)
    expect(openMarkup).not.toMatch(/[▲▼]/)
    expect(openMarkup.match(/data-trend="up"/g)?.length).toBe(
      (closedMarkup.match(/data-trend="up"/g)?.length ?? 0) + 1,
    )
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
    expect(text).toBe('98.5 km to go +3:46 on the bunch')
  })
})

/**
 * EL ÁMBITO OSCURO Y EL RESUMEN ACCESIBLE (E3, docs/visual.md §3.3 y §14.3; H-05, X-15; PR 20): la capa es
 * del ámbito oscuro (`data-surface="dark"`), igual en los dos modos, y su nombre accesible ya no es su
 * texto visible: es `overlaySummaryText`, las dos frases, que se leen al enfocarla o tocarla, porque sigue
 * sin ser una región viva.
 */
describe('FixedOverlay · el ámbito oscuro y el resumen accesible (§14.3)', () => {
  /** Un atributo de la raíz (la respuesta, en el ámbito oscuro), con las entidades de React deshechas. */
  const rootAttr = (node: ReactElement, name: string): string | null => {
    const m = new RegExp(`^<div[^>]*\\s${name}="([^"]*)"`).exec(renderToStaticMarkup(node))
    return m === null ? null : m[1]!.replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  }
  /** Un atributo del botón que la abre y la cierra, con las entidades de React deshechas. */
  const buttonAttr = (node: ReactElement, name: string): string | null => {
    const m = new RegExp(`<button[^>]*\\s${name}="([^"]*)"`).exec(renderToStaticMarkup(node))
    return m === null ? null : m[1]!.replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  }

  it('en el ámbito oscuro, y sigue sin ser una región viva', () => {
    const node = <FixedOverlay instant={breakAndBunch(86.54, 226)} head={HEAD} />
    expect(rootAttr(node, 'data-surface')).toBe('dark')
    expect(rootAttr(node, 'aria-live')).toBe('off')
  })

  it('su nombre es el resumen, con las dos frases, abierta o cerrada', () => {
    const instant = breakAndBunch(86.54, 226)
    const summary = overlaySummaryText(instant, HEAD)
    expect(summary).toMatch(
      /^98\.5 km to go, lead group 3 riders, bunch at 3 minutes 46\. Race time 2 hours 9 minutes, /,
    )
    expect(buttonAttr(<FixedOverlay instant={instant} head={HEAD} />, 'aria-label')).toBe(summary)
    expect(buttonAttr(<FixedOverlay instant={instant} head={HEAD} expanded />, 'aria-label')).toBe(
      summary,
    )
  })

  it('en los últimos quietFinalM, el nombre también es solo la distancia', () => {
    const node = <FixedOverlay instant={breakAndBunch(LENGTH - 0.45, 12)} head={HEAD} />
    expect(buttonAttr(node, 'aria-label')).toBe('450 m to go.')
  })

  it('es la respuesta de Watch (§7.3): data-ui FixedOverlay y data-answer, que mira la comprobación 7', () => {
    const node = <FixedOverlay instant={breakAndBunch(86.54, 226)} head={HEAD} />
    expect(rootAttr(node, 'data-ui')).toBe('FixedOverlay')
    expect(rootAttr(node, 'data-answer')).toBe('')
    // la página está lista cuando su respuesta está en ready (§7.5): lo espera la prueba de noche
    expect(rootAttr(node, 'data-state')).toBe('ready')
  })

  it('se pulsa entera con el Expander del catálogo, hijo único de la raíz, y ningún button a mano (ui/1)', () => {
    const instant = breakAndBunch(86.54, 226)
    const closed = renderToStaticMarkup(<FixedOverlay instant={instant} head={HEAD} />)
    const open = renderToStaticMarkup(<FixedOverlay instant={instant} head={HEAD} expanded />)
    // la raíz y, dentro y sin nada más, el Expander: toda la capa es el botón
    expect(closed).toMatch(/^<div[^>]*data-ui="FixedOverlay"[^>]*><button[^>]*data-ui="Expander"/)
    expect(closed).toMatch(/<\/button><\/div>$/)
    expect(closed.match(/<button/g)?.length).toBe(1)
    // la capa ya es una superficie: el Expander sin flecha
    expect(closed).toContain('data-ui="Expander" data-variant="surface"')
    expect(closed).not.toContain('chevron-down')
    expect(buttonAttr(<FixedOverlay instant={instant} head={HEAD} />, 'aria-expanded')).toBe(
      'false',
    )
    expect(buttonAttr(<FixedOverlay instant={instant} head={HEAD} />, 'data-state')).toBe('closed')
    expect(
      buttonAttr(<FixedOverlay instant={instant} head={HEAD} expanded />, 'aria-expanded'),
    ).toBe('true')
    expect(open).toMatch(/<button[^>]*data-state="open"/)
    // la segunda línea, solo abierta y dentro del botón: tocarla otra vez la cierra
    const detail = overlayDetailText(instant, HEAD)
    expect(detail.length).toBeGreaterThan(0)
    expect(closed).not.toContain(detail)
    expect(open.indexOf(detail)).toBeGreaterThan(open.indexOf('<button'))
    expect(open.indexOf(detail)).toBeLessThan(open.indexOf('</button>'))
  })
})
