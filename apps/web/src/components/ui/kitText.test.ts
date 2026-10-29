import { readFileSync } from 'node:fs'
import {
  BACK_NAME_BOX,
  KIT_COLORS,
  KIT_FIGURE_PATHS,
  KIT_TEXT_MIN_PX,
  SPONSOR_ZONES,
  kitBackPath,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { MIN_FONT_PX } from './constants'
import {
  KIT_INK,
  KIT_WHITE,
  type KitSponsors,
  type TextMeasure,
  canvasMeasure,
  colorsUnder,
  fitsText,
  inkOn,
  sponsorPaints,
  textU,
  zoneShown,
} from './kitText'

/**
 * LO QUE SE ESCRIBE SOBRE UN MAILLOT (E3, docs/visual.md §8.10 y §9.9; PR 17c): sin DOM, con la medida que
 * se le pasa. `MISTRAL RACING` mide de 103,6 a 115,3 px a 12 px y 700 con las tres letras medidas
 * (`letras2.mjs`): cabe a 320, donde la caja del nombre mide 160 px, y no a 160, donde mide 80.
 */

/** Una medida de prueba: el ancho por letra en em, a cualquier peso. */
const porLetra =
  (em: number): TextMeasure =>
  (text, _weight, px) =>
    text.length * em * px

const VOLTRA = { name: 'Voltra Energy', mark: 'VE', color: KIT_COLORS.blue }

describe('kitText: si un texto cabe (8-z)', () => {
  it('a lo largo, su ancho medido; de través, los 12 px de la letra', () => {
    // 115,3 px, lo más ancho medido de MISTRAL RACING a 12 px y 700
    const mistral: TextMeasure = () => 115.3
    expect(fitsText('MISTRAL RACING', 700, BACK_NAME_BOX, 320, mistral)).toBe(true)
    expect(fitsText('MISTRAL RACING', 700, BACK_NAME_BOX, 160, mistral)).toBe(false)
    // la caja de 3 u de alto no da los 12 px de la letra a 160 (10 px), y nada cabe
    expect(fitsText('A', 600, { x: 0, y: 0, w: 20, h: 3 }, 160, () => 1)).toBe(false)
    // en vertical, a lo largo es el alto: las mangas a 320 dan 40 px, y a 160 no dan la letra
    const manga = SPONSOR_ZONES.sleeves.boxes[0]!
    expect(fitsText('VE', 600, manga, 320, porLetra(1))).toBe(true)
    expect(fitsText('VE', 600, manga, 160, porLetra(0.1))).toBe(false)
  })

  it('mide a 12 px y con su peso, y la letra de 12 px son 576 / tamaño u', () => {
    const vistos: [string, number, number][] = []
    fitsText('VE', 600, SPONSOR_ZONES.chest.boxes[0]!, 160, (t, w, px) => {
      vistos.push([t, w, px])
      return 0
    })
    expect(vistos).toEqual([['VE', 600, 12]])
    expect(textU(160)).toBeCloseTo(576 / 160, 10)
    expect(textU(320) * (320 / 48)).toBeCloseTo(KIT_TEXT_MIN_PX, 10)
  })

  it('sin canvas (el servidor), no cabe nada', () => {
    expect(canvasMeasure('VE', 600, 12)).toBe(Number.POSITIVE_INFINITY)
  })

  it('la letra mínima de la web es la de zoneCapacity: se importa, no se copia (D-02)', () => {
    expect(MIN_FONT_PX).toBe(KIT_TEXT_MIN_PX)
  })
})

describe('kitText: la tinta (§9.9; 8-s)', () => {
  it('white o kit-ink, la que más contraste con todo lo de debajo', () => {
    expect(inkOn([KIT_COLORS.navy])).toBe(KIT_WHITE)
    expect(inkOn([KIT_COLORS.yellow])).toBe(KIT_INK)
    expect(inkOn([KIT_COLORS.white])).toBe(KIT_INK)
    // sobre el azul y el amarillo a la vez, la del mejor peor caso
    const ambos = inkOn([KIT_COLORS.blue, KIT_COLORS.yellow])
    expect([KIT_WHITE, KIT_INK]).toContain(ambos)
  })

  it('kit-ink es el token de index.css, el mismo en los dos modos', () => {
    const tokens = JSON.parse(
      readFileSync(new URL('../../../../../packages/shared/tokens.json', import.meta.url), 'utf8'),
    ) as { light: { color: Record<string, string> } }
    expect(tokens.light.color['kit-ink']).toBe(KIT_INK)
  })

  it('lo que cae bajo una caja: la base, el segundo color, o los dos', () => {
    const { navy, yellow } = KIT_COLORS
    // el nombre de la espalda, sobre los hombros: los aros quedan por debajo
    expect(colorsUnder(BACK_NAME_BOX, kitBackPath('hoops'), navy, yellow)).toEqual([navy])
    // con el canesú, todo el segundo color
    expect(colorsUnder(BACK_NAME_BOX, kitBackPath('yoke'), navy, yellow)).toEqual([yellow])
    // con las mitades, las dos
    expect(colorsUnder(BACK_NAME_BOX, kitBackPath('halves'), navy, yellow).sort()).toEqual(
      [navy, yellow].sort(),
    )
    // un liso, la base
    expect(colorsUnder(BACK_NAME_BOX, KIT_FIGURE_PATHS.plain, navy, null)).toEqual([navy])
  })
})

describe('kitText: lo que pinta una zona comprada (8-p)', () => {
  it('el pecho se ve desde 72; las demás, solo a 160 y a 320', () => {
    expect([28, 48, 72, 96, 160, 320].map((s) => zoneShown('chest', s as 28))).toEqual([
      false,
      false,
      true,
      true,
      true,
      true,
    ])
    for (const zone of ['back', 'sleeves', 'bibSides'] as const)
      expect([96, 160, 320].map((s) => zoneShown(zone, s as 96))).toEqual([false, true, true])
  })

  it('el nombre si cabe; si no, la marca; si no, en grande, la caja llena; y en pequeño, nada', () => {
    const sponsors: KitSponsors = { chest: VOLTRA }
    const pinta = (size: 28 | 72 | 160 | 320, em: number) =>
      sponsorPaints(sponsors, 'front', size, porLetra(em)).map((e) => e.paint)
    // con letras estrechas, el nombre entero a 320 (13 × 0,6 × 12 = 94 px de 133)
    expect(pinta(320, 0.6)).toEqual([{ kind: 'text', text: 'Voltra Energy' }])
    // a 72, el nombre no cabe (30 px) y la marca sí
    expect(pinta(72, 0.6)).toEqual([{ kind: 'text', text: 'VE' }])
    // con letras imposibles, a 160 la caja llena del color de su ficha, y a 72 nada
    expect(pinta(160, 9)).toEqual([{ kind: 'fill', color: KIT_COLORS.blue }])
    expect(pinta(72, 9)).toEqual([])
    // a 28, ni se mira
    expect(pinta(28, 0)).toEqual([])
  })

  it('cada zona, en la vista donde se ve, y las dos cajas de las mangas pintan lo mismo', () => {
    const todos: KitSponsors = { chest: VOLTRA, back: VOLTRA, sleeves: VOLTRA, bibSides: VOLTRA }
    const zonas = (view: 'front' | 'back' | 'bib') =>
      sponsorPaints(todos, view, 320, porLetra(0.6)).map((e) => e.zone)
    expect(zonas('front')).toEqual(['chest', 'sleeves', 'sleeves'])
    expect(zonas('back')).toEqual(['back', 'sleeves', 'sleeves'])
    expect(zonas('bib')).toEqual(['bibSides', 'bibSides'])
    const mangas = sponsorPaints({ sleeves: VOLTRA }, 'front', 320, porLetra(0.6))
    expect(mangas.map((e) => e.paint)).toEqual([
      { kind: 'text', text: 'VE' },
      { kind: 'text', text: 'VE' },
    ])
    expect(mangas.map((e) => e.box)).toEqual(SPONSOR_ZONES.sleeves.boxes)
  })
})
