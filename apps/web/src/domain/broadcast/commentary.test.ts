import { describe, expect, it } from 'vitest'
import { COMMENTARY_KEY, readCommentaryOpen, writeCommentaryOpen } from './commentary'

/**
 * `Commentary`, COMO LO DEJÓ CADA ESPECTADOR (W2a): abierto o cerrado en el `localStorage`, cerrado sin nada
 * guardado, y sin lanzar nunca, con el almacenamiento que sea.
 */
function memory(): Pick<Storage, 'getItem' | 'setItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

const broken: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

describe('Commentary, recordado (W2a)', () => {
  it('sin nada guardado, cerrado; abierto y cerrado, como se dejó', () => {
    const s = memory()
    expect(readCommentaryOpen(s)).toBe(false)
    writeCommentaryOpen(true, s)
    expect(s.data.get(COMMENTARY_KEY)).toBe('1')
    expect(readCommentaryOpen(s)).toBe(true)
    writeCommentaryOpen(false, s)
    expect(s.data.get(COMMENTARY_KEY)).toBe('0')
    expect(readCommentaryOpen(s)).toBe(false)
  })

  it('su clave no es una de lo alcanzado (cs.watch.<raceKey>.<day>)', () => {
    expect(COMMENTARY_KEY.startsWith('cs.watch.')).toBe(false)
  })

  it('sin almacenamiento o con uno que lanza, cerrado y sin lanzar', () => {
    expect(readCommentaryOpen(null)).toBe(false)
    expect(() => writeCommentaryOpen(true, null)).not.toThrow()
    expect(readCommentaryOpen(broken)).toBe(false)
    expect(() => writeCommentaryOpen(true, broken)).not.toThrow()
  })
})
