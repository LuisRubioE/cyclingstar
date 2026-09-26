import type { RiderRaceResult } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RaceResultRow } from './RaceResults'
import { StageRoute } from './StageRoute'

/**
 * «CADA VEZ QUE MENCIONE UNA ETAPA, QUE DIGA SIEMPRE EL ORIGEN Y DESTINO» (el dueño). Todas las
 * pantallas lo pintan con `StageRoute`; aquí, el componente y uno de sus usos, el desglose de etapas
 * de los resultados de un corredor.
 */
describe('StageRoute', () => {
  it('salida → llegada; una sola ciudad si coinciden; nada sin ciudades', () => {
    expect(renderToStaticMarkup(<StageRoute from="Tarragona" to="Barcelona" />)).toContain(
      'Tarragona → Barcelona',
    )
    expect(renderToStaticMarkup(<StageRoute from="Barcelona" to="Barcelona" />)).toBe(
      '<span class="text-slate-500">Barcelona</span>',
    )
    expect(renderToStaticMarkup(<StageRoute from={null} to={undefined} />)).toBe('')
  })

  it('el desglose de etapas de un resultado dice de dónde a dónde fue cada una', () => {
    const result: RiderRaceResult = {
      raceId: 'race-france',
      raceName: 'Race France',
      raceClass: 'WT',
      season: 0,
      stageCount: 21,
      isOneDay: false,
      gcPuesto: 12,
      dnf: false,
      finished: false,
      stages: [
        { stageDay: 1, puesto: 30, from: 'Barcelona', to: 'Barcelona' },
        { stageDay: 2, puesto: 4, from: 'Tarragona', to: 'Barcelona' },
      ],
    }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ul>
          <RaceResultRow result={result} />
        </ul>
      </MemoryRouter>,
    )
    expect(html).toContain('Stage 2 of 21')
    expect(html).toContain('Tarragona → Barcelona')
  })
})
