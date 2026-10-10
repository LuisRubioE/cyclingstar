import type { RiderRaceReport } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { raceVerdict } from './narration'

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

/*
 * RE-SELLADO EN E2, PASO 12 (docs/retransmision.md §12.9, D-47), a propósito: se van los tres casos de
 * `narrate()` y `personalNarration`, que se borran con ellos. `narrate()` no tenía llamadas en
 * producción, y los momentos del corredor en `Your last race` son desde el 12 las líneas del acta
 * (`moments`, 12-k; `apps/api/src/routes/lastRace.test.ts`). Se queda el de `raceVerdict`, la única
 * prueba de una función que la tarjeta y la portada siguen pintando, con la misma lógica: desde el 8a
 * sobre la última etapa CONOCIDA.
 */
describe('web: el veredicto de la última carrera', () => {
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
