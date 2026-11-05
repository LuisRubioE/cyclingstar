import { describe, expect, it } from 'vitest'
import {
  BACK_NAME_BOX,
  BACK_NUMBER_BOX,
  BIB,
  KIT_CAPITAL_EM,
  KIT_TEXT_MIN_PX,
  type KitSize,
  KIT_PX,
  SPONSOR_ZONES,
  type SponsorZone,
  TORSO,
  TORSO_BACK,
  type ZoneBox,
  zoneCapacity,
} from './kit.js'
import { type Point, flattenPath, insidePath } from './kitGeometry.js'

/**
 * LAS ZONAS DEL PATROCINADOR (E3, docs/visual.md §8.10; PR 17c; 8-z): cada caja cae dentro de la silueta
 * de su vista, y caben las mayúsculas de la tabla de §8.10 a 12 px, contando 1,07 em por letra, la `W` a
 * 600 de DejaVu Sans, la más ancha medida. Lo que de verdad se pinta lo decide el ancho medido del texto
 * (`fitsText`, en la web); esto es la cuenta del peor caso.
 */

/** Las cuatro esquinas y el centro, una centésima de u hacia dentro: el borde de la silueta es suyo. */
const probes = ({ x, y, w, h }: ZoneBox): Point[] => {
  const e = 0.01
  return [
    [x + e, y + e],
    [x + w - e, y + e],
    [x + e, y + h - e],
    [x + w - e, y + h - e],
    [x + w / 2, y + h / 2],
  ]
}

const SILHOUETTE = { front: TORSO, back: TORSO_BACK, bib: BIB } as const

describe('shared: las zonas del patrocinador (§8.10)', () => {
  it('cada caja cae dentro de la silueta de cada vista en que se ve', () => {
    for (const [zone, { views, boxes }] of Object.entries(SPONSOR_ZONES)) {
      for (const view of views) {
        const shape = flattenPath(SILHOUETTE[view])
        for (const box of boxes)
          for (const [x, y] of probes(box))
            expect(insidePath(shape, x, y), `${zone} en ${view}: ${x}, ${y}`).toBe(true)
      }
    }
    for (const box of [BACK_NAME_BOX, BACK_NUMBER_BOX])
      for (const [x, y] of probes(box))
        expect(insidePath(flattenPath(TORSO_BACK), x, y), `${x}, ${y}`).toBe(true)
  })

  it('las mayúsculas que caben, en el peor caso, son las de la tabla', () => {
    const at = (zone: SponsorZone, size: KitSize) =>
      zoneCapacity(SPONSOR_ZONES[zone].boxes[0]!, size)
    // de 72 y 96, solo el pecho: la espalda, las mangas y el culote solo se ven a 160 y a 320
    expect([72, 96, 160, 320].map((s) => at('chest', s as KitSize))).toEqual([2, 3, 5, 10])
    expect([160, 320].map((s) => at('back', s as KitSize))).toEqual([5, 10])
    expect([160, 320].map((s) => at('sleeves', s as KitSize))).toEqual([0, 3])
    expect([160, 320].map((s) => at('bibSides', s as KitSize))).toEqual([0, 10])
    expect([KIT_PX.showcase, KIT_PX.poster].map((s) => zoneCapacity(BACK_NAME_BOX, s))).toEqual([
      6, 12,
    ])
  })

  it('una letra de 12 px pide 576 / tamaño u, y cada mayúscula 1,07 em; en vertical cuenta el alto', () => {
    expect(KIT_TEXT_MIN_PX).toBe(12)
    expect(KIT_CAPITAL_EM).toBe(1.07)
    // 20 u a 160 px son 66,7 px, y caben 66,7 / (1,07 × 12) = 5,19: cinco
    expect(zoneCapacity({ x: 0, y: 0, w: 20, h: 10 }, 160)).toBe(5)
    // si la caja no da los 12 px de alto de la letra, ninguna
    expect(zoneCapacity({ x: 0, y: 0, w: 20, h: 3 }, 160)).toBe(0)
    // en vertical se cuenta a lo largo del alto, y el ancho tiene que dar la letra
    expect(zoneCapacity({ x: 0, y: 0, w: 3.5, h: 6, vertical: true }, 320)).toBe(3)
    expect(zoneCapacity({ x: 0, y: 0, w: 3.5, h: 6, vertical: true }, 160)).toBe(0)
  })

  it('las mangas se ven por delante y por detrás; el pecho, delante; la espalda, detrás; el culote, en el suyo', () => {
    expect(SPONSOR_ZONES.chest.views).toEqual(['front'])
    expect(SPONSOR_ZONES.back.views).toEqual(['back'])
    expect(SPONSOR_ZONES.sleeves.views).toEqual(['front', 'back'])
    expect(SPONSOR_ZONES.bibSides.views).toEqual(['bib'])
    for (const { boxes } of [SPONSOR_ZONES.sleeves, SPONSOR_ZONES.bibSides])
      for (const box of boxes) expect(box.vertical).toBe(true)
  })
})
