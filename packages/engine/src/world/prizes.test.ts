import { describe, expect, it } from 'vitest'
import { gcPrizes, stagePrize } from './prizes.js'

describe('engine: premios de carrera (SPEC 9, Paso 38)', () => {
  it('el premio de etapa escala con el nivel', () => {
    expect(stagePrize('WT')).toBe(300)
    expect(stagePrize('WT')).toBeGreaterThan(stagePrize('PRS'))
    expect(stagePrize('PRS')).toBeGreaterThan(stagePrize('CON'))
  })

  it('la general reparte de forma decreciente desde el líder', () => {
    const wt = gcPrizes('WT')
    expect(wt[0]).toBe(5000)
    for (let i = 1; i < wt.length; i++) expect(wt[i]!).toBeLessThan(wt[i - 1]!)
  })

  it('el bote de la general escala con el nivel', () => {
    expect(gcPrizes('WT')[0]).toBeGreaterThan(gcPrizes('PRS')[0]!)
    expect(gcPrizes('PRS')[0]).toBeGreaterThan(gcPrizes('CON')[0]!)
  })
})
