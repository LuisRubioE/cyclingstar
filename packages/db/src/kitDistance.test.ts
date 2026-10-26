import { readFileSync } from 'node:fs'
import {
  CHAMPION_RAINBOW,
  CHAMPION_SILVER,
  CHAMPION_STAR_EDGE,
  COLLAR,
  KIT_COLORS,
  KIT_FIGURE_PATHS,
  type KitCode,
  LEADER_DOTS,
  LEADER_JERSEY,
  LOGO_STAR,
  NATIONAL_FLAG_BOX,
  TORSO,
  WORLD_STAR,
} from '@cyclingstar/shared'
import type { View } from '@cyclingstar/shared/colorMath'
import { describe, expect, it } from 'vitest'
import { FLAG_CELL_PIXELS } from './flagCells.generated.js'
import {
  COLLAR_PAINT,
  KIT_EDGE,
  KIT_SUPERSAMPLE,
  type KitDrawing,
  LEADER_EDGE,
  LEGACY_EDGE,
  LEGACY_PATTERN_PATHS,
  drawnDistance,
  kitDistance,
} from './kitDistance.js'

/**
 * LA DISTANCIA DIBUJADA, CONTRA SU DORADO (E3, docs/visual.md §8.4 y §16.2; PR 16a). El CI no tiene
 * Python, así que el rasterizador del mapa 03 (`--golden`) escribió una vez 50 pares con sus cinco
 * distancias, y aquí el port de TypeScript los repite a 0,5 o menos. Si cambia la geometría, el dorado ya
 * no es de hoy y se regenera:
 *
 *   <venv>/bin/python -I -B docs/diseno/e3-visual/mapas/03-maillots-medida.py --golden .
 */

interface Golden {
  readonly flagCellsSha256: string
  readonly geometry: Record<string, unknown>
  readonly pairs: readonly {
    readonly a: string
    readonly b: string
    readonly d: Record<'normal' | 'protan' | 'deutan' | 'tritan' | 'gris', number>
  }[]
}
const GOLDEN = JSON.parse(
  readFileSync(new URL('./__fixtures__/kitDistance.golden.json', import.meta.url), 'utf8'),
) as Golden

/** El dibujo de una clave del dorado: `kit:<código>`, `leader:gc`, `world`, `national:MA`, `legacy:…`. */
function drawingOf(key: string): KitDrawing {
  const [kind, ...rest] = key.split(':')
  switch (kind) {
    case 'kit':
      return { kind: 'kit', code: rest[0] as KitCode }
    case 'leader':
      return { kind: 'leader', jersey: rest[0] as 'gc' | 'points' | 'kom' }
    case 'world':
    case 'continental':
      return { kind }
    case 'national':
      return { kind: 'national', country: rest[0]! }
    case 'legacy': {
      const [pattern, base, secondary] = rest
      return {
        kind: 'legacy',
        style: {
          pattern: pattern as 'solid' | 'band' | 'stripes' | 'panels' | 'shoulders',
          base: base!,
          secondary: secondary!,
          accent: '#ffffff',
        },
      }
    }
    default:
      throw new Error(`una clave que no se entiende: ${key}`)
  }
}

const VIEW_OF: Record<keyof Golden['pairs'][number]['d'], View> = {
  normal: 'normal',
  protan: 'protan',
  deutan: 'deutan',
  tritan: 'tritan',
  gris: 'gray',
}

describe('db: la distancia dibujada, contra el dorado del mapa 03 (E3, §8.4)', () => {
  it('el dorado se hizo con la geometría de hoy', () => {
    const g = GOLDEN.geometry
    expect(g.size).toBe(28)
    expect(g.supersample).toBe(KIT_SUPERSAMPLE)
    expect(g.torso).toBe(TORSO)
    expect(g.collar).toBe(COLLAR)
    expect(g.colors).toEqual(KIT_COLORS)
    expect(g.figures).toEqual(KIT_FIGURE_PATHS)
    expect(g.logoStar).toBe(LOGO_STAR)
    expect(g.worldStar).toEqual(WORLD_STAR)
    expect(g.rainbow).toEqual(CHAMPION_RAINBOW)
    expect(g.starEdge).toBe(CHAMPION_STAR_EDGE)
    expect(g.silver).toBe(CHAMPION_SILVER)
    expect(g.leaders).toEqual({
      gc: { base: LEADER_JERSEY.gc.base, mark: null },
      points: { base: LEADER_JERSEY.points.base, mark: 'band' },
      kom: { base: LEADER_JERSEY.kom.base, mark: 'dots' },
    })
    expect(g.leaderDotRadius).toBe(LEADER_JERSEY.kom.mark.radiusU)
    expect(g.leaderDots).toEqual(LEADER_DOTS)
    expect(g.flagBox).toEqual([
      NATIONAL_FLAG_BOX.x,
      NATIONAL_FLAG_BOX.y,
      NATIONAL_FLAG_BOX.width,
      NATIONAL_FLAG_BOX.height,
    ])
    const edge = (e: { color: string; alpha: number; widthU: number }) => [
      e.color,
      e.alpha,
      e.widthU,
    ]
    expect(g.kitEdge).toEqual(edge(KIT_EDGE))
    expect(g.leaderEdge).toEqual(edge(LEADER_EDGE))
    expect(g.legacyEdge).toEqual(edge(LEGACY_EDGE))
    expect(g.collarPaint).toEqual([COLLAR_PAINT.color, COLLAR_PAINT.alpha])
    expect(g.legacy).toEqual(LEGACY_PATTERN_PATHS)
    expect(GOLDEN.flagCellsSha256).toBe(FLAG_CELL_PIXELS.sha256)
  })

  it('los 50 pares, a 0,5 o menos en las cinco vistas', () => {
    expect(GOLDEN.pairs).toHaveLength(50)
    let worst = 0
    for (const { a, b, d } of GOLDEN.pairs) {
      const got = drawnDistance(drawingOf(a), drawingOf(b), 28)
      for (const [key, view] of Object.entries(VIEW_OF) as [keyof typeof d, View][]) {
        const diff = Math.abs(got[view]! - d[key])
        worst = Math.max(worst, diff)
        expect(diff, `${a} y ${b} en ${view}: ${got[view]} frente a ${d[key]}`).toBeLessThanOrEqual(
          0.5,
        )
      }
    }
    console.info(`kitDistance: la mayor diferencia con el dorado, ${worst.toFixed(4)}`)
  })

  it('un maillot está a 0 de sí mismo, la distancia es simétrica y el espejo de halves es su par', () => {
    const d = kitDistance('hoops.navy.yellow', 'hoops.navy.yellow')
    for (const v of Object.values(d)) expect(v).toBe(0)
    const ab = kitDistance('band.red.white', 'sash.blue.yellow')
    const ba = kitDistance('sash.blue.yellow', 'band.red.white')
    for (const view of Object.keys(ab) as View[]) expect(ab[view]).toBeCloseTo(ba[view], 10)
    expect(kitDistance('halves.red.blue', 'halves.blue.red').normal).toBeCloseTo(
      kitDistance('plain.red', 'plain.blue').normal,
      6,
    )
  })

  it('el maillot de hoy se mide como lo pinta la web: los literales de LegacyJersey.tsx', () => {
    const web = readFileSync(
      new URL('../../../apps/web/src/components/ui/LegacyJersey.tsx', import.meta.url),
      'utf8',
    )
    for (const literal of [
      '<rect x="14" y="24" width="20" height="6" fill={secondary} />',
      '<rect x="14" y="18" width="20" height="3" fill={secondary} />',
      '<rect x="14" y="26" width="20" height="3" fill={secondary} />',
      '<rect x="14" y="34" width="20" height="3" fill={secondary} />',
      ...LEGACY_PATTERN_PATHS.panels,
      ...LEGACY_PATTERN_PATHS.shoulders,
      'stroke="rgba(0,0,0,0.18)" strokeWidth="1"',
      'opacity="0.85"',
    ])
      expect(web, literal).toContain(literal)
  })
})
