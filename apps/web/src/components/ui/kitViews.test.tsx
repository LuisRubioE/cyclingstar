import {
  BACK_NAME_BOX,
  BACK_NUMBER_BOX,
  BIB,
  BIB_CUFFS,
  BIB_PANELS,
  BIB_STRAPS,
  COLLAR,
  KIT_CODES,
  KIT_COLORS,
  KIT_FIGURES,
  type KitCode,
  POCKETS,
  TORSO,
  TORSO_BACK,
  kitBackPath,
  parseKit,
} from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Kit, type KitProps } from './Kit'
import { KIT_INK, KIT_WHITE, type TextMeasure, TextMeasureContext } from './kitText'

/**
 * LAS VISTAS GRANDES DEL MAILLOT (E3, docs/visual.md §8.10; PR 17c): la espalda de las siete figuras es la
 * de delante reflejada (`kitBackPath`, medida en `kit.test.ts`) sobre `TORSO_BACK`; el nombre y el dorsal
 * solo salen cuando caben o existen; el culote, con su estilo; y `back` y `bib` no compilan por debajo de
 * 160. Sin DOM: la medida del texto la da `TextMeasureContext`.
 */

/** Lo más ancho medido de `MISTRAL RACING` a 12 px y 700 (`letras2.mjs`): 115,3 px. */
const mistral: TextMeasure = (text) => (text === 'MISTRAL RACING' ? 115.3 : 1_000)
const pinta = (props: KitProps, medida: TextMeasure = mistral) =>
  renderToStaticMarkup(
    <TextMeasureContext value={medida}>
      <Kit {...props} />
    </TextMeasureContext>,
  )
/** Un código de cada figura, del vocabulario. */
const UNO_POR_FIGURA = KIT_FIGURES.map((f) =>
  KIT_CODES.find((c) => c.startsWith(`${f}.`) && c.includes('navy'))!,
)

describe('kitViews: la espalda (8-n)', () => {
  it('las siete figuras: la región de detrás, recortada por TORSO_BACK, sin cuello y con los bolsillos', () => {
    for (const code of UNO_POR_FIGURA) {
      const kit = parseKit(code)!
      const s = pinta({ code, teamName: 'Mistral Racing', view: 'back', size: 160 })
      expect(s, code).toContain('data-view="back"')
      expect(s, code).toContain(`<path d="${TORSO_BACK}" fill="${KIT_COLORS[kit.base]}"`)
      expect(s, code).not.toContain(`d="${TORSO}"`)
      expect(s, code).not.toContain(COLLAR)
      expect(s, code).toContain(
        `<path d="${POCKETS}" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"`,
      )
      const region = kitBackPath(kit.figure)
      if (kit.figure === 'plain') {
        expect(region).toBeNull()
        expect(s).not.toContain('clipPath')
        continue
      }
      expect(s, code).toContain(
        `<path d="${region}" fill="${KIT_COLORS[kit.secondary]}" clip-path="url(#`,
      )
      expect(/<clipPath id="[^"]+"><path d="([^"]+)"/.exec(s)?.[1], code).toBe(TORSO_BACK)
    }
  })

  it('el nombre del equipo, en mayúsculas a 700, solo si cabe a 12 px: a 320 sí, a 160 no', () => {
    const a = (size: 160 | 320) =>
      pinta({ code: 'hoops.navy.yellow', teamName: 'Mistral Racing', view: 'back', size })
    const grande = a(320)
    const cx = BACK_NAME_BOX.x + BACK_NAME_BOX.w / 2
    const cy = BACK_NAME_BOX.y + BACK_NAME_BOX.h / 2
    expect(grande).toContain(
      `<text data-back="name" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="1.8" font-weight="700" fill="${KIT_WHITE}">MISTRAL RACING</text>`,
    )
    expect(a(160)).not.toContain('data-back="name"')
    // sobre el canesú amarillo, kit-ink
    const canesu = pinta({
      code: 'yoke.navy.yellow',
      teamName: 'Mistral Racing',
      view: 'back',
      size: 320,
    })
    expect(canesu).toContain(`fill="${KIT_INK}">MISTRAL RACING</text>`)
  })

  it('el dorsal, solo si lo hay: el rectángulo blanco y el número en kit-ink de 6 u', () => {
    const sin = pinta({ code: 'plain.red', teamName: 'Mistral Racing', view: 'back', size: 160 })
    expect(sin).not.toContain('data-back="number"')
    expect(sin).toContain('aria-label="Mistral Racing kit, back"')
    const con = pinta({
      code: 'plain.red',
      teamName: 'Mistral Racing',
      view: 'back',
      size: 160,
      number: 214,
    })
    const { x, y, w, h } = BACK_NUMBER_BOX
    expect(con).toContain(
      `<rect data-back="number" x="${x}" y="${y}" width="${w}" height="${h}" fill="${KIT_WHITE}"`,
    )
    expect(con).toMatch(new RegExp(`font-size="6" font-weight="700" fill="${KIT_INK}">214</text>`))
    expect(con).toContain('aria-label="Mistral Racing kit, back, number 214"')
  })
})

describe('kitViews: el culote (8-o)', () => {
  const culote = (code: KitCode, bib: 'black' | 'black.panel' | 'base' | 'base.panel') =>
    pinta({ code, teamName: 'Mistral Racing', view: 'bib', size: 160, bib })

  it('los tirantes y el cuerpo, negros o de la base; sin cuello ni torso', () => {
    const s = culote('hoops.navy.yellow', 'black')
    expect(s).toContain('data-view="bib"')
    expect(s).toContain('aria-label="Mistral Racing shorts"')
    expect(s).toContain(`<path d="${BIB_STRAPS}" fill="${KIT_COLORS.black}"`)
    expect(s).toContain(`<path d="${BIB}" fill="${KIT_COLORS.black}"`)
    expect(s).not.toContain(BIB_PANELS)
    // sin paneles, los puños son del cuerpo y no se repintan
    expect(s).not.toContain(BIB_CUFFS)
    expect(s).not.toContain(COLLAR)
    expect(s).not.toContain(`d="${TORSO}"`)
    expect(culote('hoops.navy.yellow', 'base')).toContain(
      `<path d="${BIB}" fill="${KIT_COLORS.navy}"`,
    )
  })

  it('con paneles, los del segundo color, y los puños como ellos, recortados por el culote', () => {
    const s = culote('hoops.navy.yellow', 'base.panel')
    expect(s).toContain(`<path d="${BIB_PANELS}" fill="${KIT_COLORS.yellow}"`)
    expect(s).toMatch(
      new RegExp(`<path d="${BIB_CUFFS}" fill="${KIT_COLORS.yellow}" clip-path="url\\(#`),
    )
    expect(/<clipPath id="[^"]+"><path d="([^"]+)"/.exec(s)?.[1]).toBe(BIB)
    // un liso con cuerpo negro, los paneles en su base
    expect(culote('plain.red', 'black.panel')).toContain(
      `<path d="${BIB_PANELS}" fill="${KIT_COLORS.red}"`,
    )
  })

  it('el filete recorre el culote y los tirantes', () => {
    expect(culote('plain.red', 'black')).toContain(
      `<path d="${BIB} ${BIB_STRAPS}" fill="none" stroke-width="1"`,
    )
  })
})

describe('kitViews: back y bib, solo a 160 y a 320 (§8.3)', () => {
  it('por debajo de 160 no compilan', () => {
    // solo el tipo: los elementos se crean y no se pintan
    // @ts-expect-error la espalda no existe a 96
    void (<Kit code="plain.red" teamName="x" view="back" size={96} />)
    // @ts-expect-error ni el culote a 72
    void (<Kit code="plain.red" teamName="x" view="bib" size={72} bib="black" />)
    // @ts-expect-error el culote pide su estilo
    void (<Kit code="plain.red" teamName="x" view="bib" size={160} />)
    // @ts-expect-error y el dorsal es de la espalda
    void (<Kit code="plain.red" teamName="x" size={160} number={7} />)
    expect(pinta({ code: 'plain.red', teamName: 'x', view: 'back', size: 320 })).toContain(
      'width="320" height="320"',
    )
  })
})
