import { describe, expect, it } from 'vitest'
import { alsoRevealsText, revealPlan, revealQuestion } from './stageGate'

/**
 * LO QUE REVELA CADA SALIDA DE LA PUERTA (E2, docs/retransmision.md §10.3, §11.11 y §11.12; D-37, D-38;
 * paso 9a). Revelar la N escribe `R` en ella y `A` en las anteriores que faltaran (§10.3), y la
 * confirmación lo dice antes: `This also reveals stages 3 and 4.` o, con más de dos, `This also reveals
 * stages 5 to 20.`. Sin DOM: el render de la puerta va en `StageGate.test.tsx`.
 */
describe('revealPlan: qué etapa pasa a R y cuáles arrastra con A', () => {
  it('en lo que enseña el resultado, la etapa misma; sin anteriores por ver, ninguna más', () => {
    expect(revealPlan({ k: 'not_seen' }, 7, 'result')).toEqual({ stageDay: 7, also: [] })
  })

  it('con anteriores sin ver, la etapa y todas las que faltan desde la primera', () => {
    expect(revealPlan({ k: 'previous_unseen', firstUnseen: 4 }, 7, 'result')).toEqual({
      stageDay: 7,
      also: [4, 5, 6],
    })
  })

  it('en Watch, la puerta de la N+1 revela la N y arrastra las de antes (§11.12)', () => {
    expect(revealPlan({ k: 'previous_unseen', firstUnseen: 6 }, 7, 'watch')).toEqual({
      stageDay: 6,
      also: [],
    })
    expect(revealPlan({ k: 'previous_unseen', firstUnseen: 3 }, 7, 'watch')).toEqual({
      stageDay: 6,
      also: [3, 4, 5],
    })
  })
})

describe('las palabras de la confirmación (§11.11, DD-17)', () => {
  it('la pregunta nombra la etapa y avisa de lo que se pierde', () => {
    expect(revealQuestion(7)).toBe(
      "Show the result of Stage 7? You won't be able to watch it without knowing.",
    )
  })

  it('lo que también revela: nada, una, dos, o un tramo', () => {
    expect(alsoRevealsText([])).toBeNull()
    expect(alsoRevealsText([6])).toBe('This also reveals stage 6.')
    expect(alsoRevealsText([3, 4])).toBe('This also reveals stages 3 and 4.')
    expect(alsoRevealsText([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])).toBe(
      'This also reveals stages 5 to 20.',
    )
  })
})
