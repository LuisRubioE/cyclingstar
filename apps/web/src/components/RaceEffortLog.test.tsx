import type { FormPoint } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RaceEffortLog } from './RaceEffortLog'

/**
 * EL DIARIO DE CARRERA, SIN TSS (E3, docs/visual.md §10.7 y §13.7; D-41, D-00o; PR 19b): el TSS sale de la
 * pantalla y de la API, y el día de carrera dice su carga en palabras, como el cuadro (`Load: hard`).
 */

const etapa: FormPoint = {
  gameDay: 52,
  fitness: 65,
  freshness: 41,
  load: 3,
  activity: 'carrera:race-france:e3',
  parte: {
    kmAlFrente: 12.5,
    kmEnFuga: 0,
    kmDescolgado: 0,
    ataques: 1,
    saltos: 0,
    cerillos: 2,
    reservaGastadaS: 40,
    gasto: { rodar: 30, relevo: 20, reserva: 5, cerillos: 10, banderas: 0 },
    pajaraKm: null,
    descuelgueKm: null,
  },
  from: 'Lyon',
  to: 'Grenoble',
}

const pinta = (points: FormPoint[]) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <RaceEffortLog points={points} />
    </MemoryRouter>,
  )

describe('el diario de carrera (§10.7; 19b)', () => {
  it('cada día de carrera dice su carga en palabras, y ninguno su TSS', () => {
    const html = pinta([
      etapa,
      { ...etapa, gameDay: 53, load: 4, activity: 'carrera:race-france:e4' },
    ])
    expect(html).toContain('day 52 · Load: hard')
    expect(html).toContain('day 53 · Load: very hard')
    expect(html).not.toContain('TSS')
  })

  it('los días de entrenamiento no salen: no tienen parte', () => {
    const html = pinta([{ ...etapa, activity: 'fondo', parte: null, from: null, to: null }])
    expect(html).toContain('No race days logged yet')
  })
})
