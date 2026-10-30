import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClockNotice } from './ClockNotice'

/**
 * EL AVISO DE LO ESTIMADO (docs/retransmision.md §3.8; D-07): con el reloj estimado del adaptador de la
 * radio, se dice; con la línea grabada, nada. Desde el PR 20 (E3, docs/visual.md §14.6; Rcobertura-038),
 * es un `Notice` `info` del catálogo con su texto de hoy.
 */
describe('ClockNotice · el aviso de lo estimado (§14.6)', () => {
  it('estimado: un Notice info, con el título y el texto de hoy', () => {
    const html = renderToStaticMarkup(<ClockNotice clock="estimated" />)
    expect(html).toMatch(/^<div[^>]*data-ui="Notice"[^>]*data-variant="info"/)
    expect(html).toContain('Recorded before full race data')
    expect(html).toContain('Positions of the groups behind are estimated')
  })

  it('con la línea grabada, nada', () => {
    expect(renderToStaticMarkup(<ClockNotice clock="exact" />)).toBe('')
  })
})
