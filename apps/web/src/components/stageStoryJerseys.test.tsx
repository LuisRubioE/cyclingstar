import type { RaceLeaders, StageReplay, StageResultEntry } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { StageStory } from './StageStory'

/**
 * EL PODIO LLEVA EL MAILLOT DE LA CARRETERA, NO EL DE DESPUÉS.
 *
 * El fallo que se reportó: «en la clasificación de la etapa 2 sale ya con maillot amarillo el que va
 * líder DESPUÉS de la etapa 2, no el que iba líder después de la etapa 1, que es lo que debería
 * mostrar». Y tenía razón: el orden de llegada de una tarde —la tabla `Result` y el podio de
 * `Story`— cuenta lo que se vio en la carretera, y en la carretera el amarillo lo llevaba puesto el
 * líder de la víspera. El que se lo acaba de quitar en esa misma meta sale de amarillo en
 * `Classifications`, que es la pestaña que enseña el estado nuevo.
 *
 * Aquí se prueba el podio porque es un componente suelto; la misma decisión en la tabla `Result` es
 * una línea de `StageReplay` (`leaders={data.leaders?.onRoad}`) documentada en la cabecera de
 * `ResultTable`.
 */
const row = (riderId: string, puesto: number): StageResultEntry => ({
  riderId,
  name: `Corredor ${riderId}`,
  country: 'ES',
  teamId: `team-${riderId}`,
  teamName: `Equipo ${riderId}`,
  isBot: true,
  puesto,
  tiempoS: 3600 + puesto,
  bonificacionS: 0,
  puntosVolante: 0,
  puntosMontana: 0,
})

/** El de ayer llevaba el amarillo; el de hoy se lo quita al ganar la etapa. */
const onRoad: RaceLeaders = { gc: 'ayer', points: null, kom: null, team: null }
const afterStage: RaceLeaders = { gc: 'hoy', points: null, kom: null, team: null }

const replay: StageReplay = {
  day: 2,
  name: 'Etapa 2',
  km: 180,
  run: true,
  altimetry: '<svg />',
  results: [row('hoy', 1), row('ayer', 2), row('otro', 3)],
  leaders: { onRoad, afterStage },
}

/** El nombre del corredor de cada fila del podio que trae la etiqueta del maillot pedido. */
function wearers(markup: string, label: string): string[] {
  return markup
    .split('<li')
    .filter((li) => li.includes(`aria-label="${label}"`))
    .map((li) => /<a [^>]*>([^<]+)<\/a>/.exec(li)?.[1] ?? '')
}

describe('el podio de la crónica', () => {
  it('pinta el amarillo en quien lo llevaba PUESTO, no en quien lo gana hoy', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <StageStory data={replay} />
      </MemoryRouter>,
    )
    expect(wearers(markup, 'Race leader')).toEqual(['Corredor ayer'])
  })
})
