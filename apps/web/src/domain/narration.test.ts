import type { RiderRaceReport } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { narrate, personalNarration, raceVerdict } from './narration'

const report = (over: Partial<RiderRaceReport> = {}): RiderRaceReport => ({
  raceName: 'Le Tour',
  stageName: 'Stage 3',
  raceId: 'tour',
  stageDay: 3,
  orders: null,
  position: 40,
  fieldSize: 100,
  timeGapToWinnerS: 120,
  sprintPoints: 0,
  komPoints: 0,
  bonusS: 0,
  winnerName: 'Ana',
  personalEvents: [],
  story: [],
  ...over,
})

describe('web: narración de la crónica', () => {
  it('es determinista: misma entrada, misma frase', () => {
    const a = narrate('stage_win', ['Ana Ruiz'], 7)
    const b = narrate('stage_win', ['Ana Ruiz'], 7)
    expect(a).toBe(b)
    expect(a).toContain('Ana Ruiz')
  })

  it('devuelve la clave del evento si no hay plantilla (no inventa texto)', () => {
    expect(narrate('evento_desconocido', ['Ana'])).toBe('evento_desconocido')
  })

  it('narra en segunda persona los momentos del propio corredor', () => {
    expect(personalNarration('stage_win')).toContain('You won the stage')
    expect(personalNarration('lo_que_sea')).toBe('lo_que_sea')
  })

  it('el veredicto respeta el orden de prioridades del informe', () => {
    expect(raceVerdict(report({ position: 1 }))).toContain('took the win')
    expect(raceVerdict(report({ position: 3 }))).toContain('podium')
    expect(
      raceVerdict(
        report({
          position: 6,
          orders: {
            role: 'sprinter',
            mentality: 'combativo',
            contestSprints: true,
            contestClimbs: false,
          },
        }),
      ),
    ).toContain('sprint')
    expect(raceVerdict(report({ position: 10, fieldSize: 100 }))).toContain('near the front')
    expect(raceVerdict(report({ position: 90, fieldSize: 100 }))).toContain('quiet day')
  })
})
