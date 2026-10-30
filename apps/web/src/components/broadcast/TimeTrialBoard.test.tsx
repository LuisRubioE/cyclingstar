import type { TimeTrialInstant } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TimeTrialBoard, TimeTrialOverlay } from './TimeTrialBoard'
import { castOf, leaderWorn } from './__fixtures__/screen'

/**
 * LA CRONO EN PANTALLA (docs/retransmision.md §9.5; paso 6b): la capa fija con el reloj y las tres
 * cuentas y el sillón, y el tablero con el sillón arriba y el control más reciente con sus tres
 * primeros, todo tiempo relativo con signo (D-57). Render estático, con un instante escrito a mano.
 */

const cast = castOf(12, { 4: { worn: leaderWorn('gc') } })
const tti: TimeTrialInstant = {
  t: 10_500,
  onCourse: [
    { rider: 9, km: 19.9, lastSplitKm: 17.3, deltaS: 38 },
    { rider: 4, km: 8.6, lastSplitKm: 8.6, deltaS: 93 },
  ],
  hotSeat: { rider: 7, timeS: 2284 },
  arrivals: [
    { rider: 7, timeS: 2284 },
    { rider: 2, timeS: 2352 },
  ],
  splits: [
    {
      km: 8.6,
      board: [
        { rider: 7, timeS: 1083 },
        { rider: 9, timeS: 1096 },
        { rider: 2, timeS: 1118 },
        { rider: 4, timeS: 1176 },
      ],
    },
    { km: 17.3, board: [] },
  ],
  virtualGc: null,
  toStart: 6,
  finished: 2,
}
const tt = { order: 'gc' as const, intervalS: 120, checksKm: [8.6, 17.3] }

const textOf = (m: string): string =>
  m
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

describe('TimeTrialOverlay · la capa fija de la crono (§9.5)', () => {
  it('el reloj, en ruta, llegados y por salir; y el sillón', () => {
    const text = textOf(renderToStaticMarkup(<TimeTrialOverlay tti={tti} cast={cast} />))
    expect(text).toContain('2:55:00 · 2 on course · 2 finished · 6 to start')
    expect(text).toContain(`HOT SEAT · 8 ${cast[7]!.name} 38:04`)
  })

  it('en el ámbito oscuro, como la de carretera, y sin ser una región viva (E3, §14.3; PR 20)', () => {
    const html = renderToStaticMarkup(<TimeTrialOverlay tti={tti} cast={cast} />)
    expect(html).toMatch(/^<div[^>]*data-surface="dark"/)
    expect(html).toMatch(/^<div[^>]*aria-live="off"/)
    expect(html).toContain('data-hot-seat=""')
  })

  it('es la capa fija de la crono, y la respuesta de su pantalla (§7.3, la 38; D-23)', () => {
    const html = renderToStaticMarkup(<TimeTrialOverlay tti={tti} cast={cast} />)
    expect(html).toMatch(/^<div[^>]*data-ui="FixedOverlay"/)
    expect(html).toMatch(/^<div[^>]*data-answer=""/)
    expect(html).toMatch(/^<div[^>]*data-state="ready"/)
  })
})

describe('TimeTrialBoard · el tablero que sustituye a la barra (§9.5)', () => {
  it('el sillón arriba y el control más reciente con sus tres primeros, con signo', () => {
    const html = renderToStaticMarkup(<TimeTrialBoard tti={tti} cast={cast} tt={tt} />)
    const text = textOf(html)
    expect(text).toContain('HOT SEAT')
    expect(text).toContain('Split 1 · km 9')
    expect(text).toContain('18:03')
    expect(text).toContain('+0:13')
    expect(text).toContain('+0:35')
    expect(text).not.toContain('+1:33') // el cuarto, al tocar el control
    // el maillot de cada uno, también el del líder
    expect(html.match(/<li/g)).toHaveLength(3)
  })

  it('sus dos botones son del catálogo, quiet de 44 a todo lo ancho, con los textos de hoy (E3, §14.4; PR 20)', () => {
    const html = renderToStaticMarkup(<TimeTrialBoard tti={tti} cast={cast} tt={tt} />)
    const buttons = [...html.matchAll(/<button[^>]*data-ui="Button"[^>]*>([\s\S]*?)<\/button>/g)]
    expect(buttons.map((b) => textOf(b[1]!))).toEqual([
      `HOT SEAT · 8 ${cast[7]!.name} 38:04`,
      'Split 1 · km 9',
    ])
    for (const b of buttons) expect(b[0]).toContain('data-variant="quiet"')
    expect(html.match(/<button/g)).toHaveLength(2)
  })
})
