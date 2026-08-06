import { describe, expect, it } from 'vitest'
import { type NewsKind, renderNews } from './news.js'

describe('engine: generador de noticias (Paso 39)', () => {
  it('es determinista para la misma semilla y evento', () => {
    const d = { rider: 'A. Rider', race: 'Test tour', stage: 3 }
    expect(renderNews('stage_win', 'e3', d)).toBe(renderNews('stage_win', 'e3', d))
  })

  it('rellena los datos del evento', () => {
    const text = renderNews('stage_win', 's1', {
      rider: 'Niki Vega',
      race: 'Race France',
      stage: 5,
    })
    expect(text).toContain('Niki Vega')
    expect(text).toMatch(/5/)
  })

  it('los titulares son concretos: un hecho por línea, con el nombre y sin florituras', () => {
    // La noticia es un DATO (quién, qué, dónde), no una crónica: el estilo narrativo va en el journal.
    const cases: { kind: NewsKind; data: Parameters<typeof renderNews>[2]; must: RegExp }[] = [
      { kind: 'stage_win', data: { rider: 'R', race: 'Race X', stage: 4 }, must: /R wins stage 4/ },
      { kind: 'gc_win', data: { rider: 'R', race: 'Race X' }, must: /R wins the Race X overall\./ },
      { kind: 'contract', data: { rider: 'R', team: 'T' }, must: /R signs for T\./ },
      {
        kind: 'injury',
        data: { rider: 'R', detail: '5 weeks' },
        must: /R injured — out for 5 weeks\./,
      },
    ]
    for (const c of cases) {
      const text = renderNews(c.kind, 's', c.data)
      expect(text).toMatch(c.must)
      // Concreto: una sola oración corta.
      expect(text.length).toBeLessThan(70)
    }
  })
})
