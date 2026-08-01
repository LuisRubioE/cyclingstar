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

  it('varía la redacción entre eventos distintos (no repite siempre la misma frase)', () => {
    const kinds: NewsKind[] = ['stage_win', 'breakaway_win', 'kom', 'gc_win', 'contract', 'injury']
    for (const kind of kinds) {
      const seen = new Set<string>()
      for (let i = 0; i < 40; i++) {
        seen.add(
          renderNews(kind, `e${i}`, {
            rider: 'R',
            team: 'T',
            race: 'Race X',
            stage: 1,
          }),
        )
      }
      // Cada tipo tiene varias plantillas, así que 40 eventos producen más de una redacción.
      expect(seen.size).toBeGreaterThan(1)
    }
  })
})
