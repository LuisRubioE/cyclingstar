import type { RaceLeaders } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { LeaderJersey, RiderJersey } from './Jersey'
import { TeamClassTable } from './TeamClassTable'

/**
 * LOS MAILLOTS EN LAS TABLAS, comprobados sobre el HTML que de verdad se pinta.
 *
 * Se renderiza con `renderToStaticMarkup` y no con un DOM de mentira: estos componentes no tienen
 * interacción que probar —lo que hay que verificar es qué fila lleva qué icono y con qué texto
 * alternativo—, y así no entra una dependencia de test nueva en el repo.
 */
function html(node: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

/** Cuántas veces aparece un texto alternativo en el HTML pintado. */
function count(markup: string, label: string): number {
  return markup.split(`aria-label="${label}"`).length - 1
}

const leaders: RaceLeaders = { gc: 'a', points: 'b', kom: 'c', team: 't1' }

describe('el maillot de líder que se pinta', () => {
  it('lleva texto alternativo: un icono de color sin más no lo lee nadie', () => {
    expect(html(<LeaderJersey kind="gc" />)).toContain('aria-label="Race leader"')
    expect(html(<LeaderJersey kind="points" />)).toContain('aria-label="Points leader"')
    expect(html(<LeaderJersey kind="kom" />)).toContain('aria-label="Mountains leader"')
  })

  it('y un `<title>` con el mismo texto, que el navegador enseña al pasar el ratón', () => {
    expect(html(<LeaderJersey kind="gc" />)).toContain('<title>Race leader</title>')
  })

  it('el color NO es lo único que los distingue: cada uno lleva su marca de forma', () => {
    // Amarillo liso, verde con banda, azul con lunares. En escala de grises siguen siendo tres
    // iconos distintos, que es lo que hace falta para una deuteranopia.
    expect(html(<LeaderJersey kind="gc" />)).not.toContain('<rect')
    expect(html(<LeaderJersey kind="points" />)).toContain('<rect')
    expect(html(<LeaderJersey kind="kom" />)).toContain('<circle')
  })

  it('los tres maillots son tres dibujos distintos', () => {
    const dibujos = new Set(
      [
        html(<LeaderJersey kind="gc" />),
        html(<LeaderJersey kind="points" />),
        html(<LeaderJersey kind="kom" />),
      ].map((m) => m.replace(/aria-label="[^"]*"|<title>[^<]*<\/title>/g, '')),
    )
    expect(dibujos.size).toBe(3)
  })

  it('cada corredor lleva SOLO el maillot que le toca, y el resto no lleva ninguno', () => {
    expect(html(<RiderJersey leaders={leaders} riderId="a" />)).toContain('Race leader')
    expect(html(<RiderJersey leaders={leaders} riderId="b" />)).toContain('Points leader')
    expect(html(<RiderJersey leaders={leaders} riderId="c" />)).toContain('Mountains leader')
    expect(html(<RiderJersey leaders={leaders} riderId="d" />)).toBe('')
  })

  it('sin maillots —etapa 1, carrera de un día— no se pinta nada', () => {
    expect(html(<RiderJersey leaders={undefined} riderId="a" />)).toBe('')
  })
})

const team = (teamId: string, teamName: string, over: Partial<{ out: boolean }> = {}) => ({
  teamId,
  teamName,
  country: 'ES',
  tiempoS: 100,
  sumaPuestos: 6,
  stagesScored: 1,
  out: false,
  ...over,
})

describe('la clasificación por equipos', () => {
  it('se pinta sin marcar a nadie: el equipo líder ya no lleva dorsal', () => {
    const markup = html(
      <TeamClassTable rows={[team('t9', 'Nueve'), team('t5', 'Cinco'), team('t1', 'Uno')]} />,
    )
    expect(markup).toContain('Uno')
    expect(count(markup, 'Leading team')).toBe(0)
    expect(markup).not.toContain('</a><svg')
  })
})
