import type { RaceLeaders, StageGcEntry, StageResultEntry } from '@cyclingstar/shared'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { GcTable, PointsTable, ResultTable } from './StageReplay'

/**
 * LAS TABLAS DE LA FICHA DE ETAPA CON LOS MAILLOTS PUESTOS.
 *
 * La regla que se prueba aquí es la que se decidió para toda la web: **cada tabla marca el maillot
 * que lleva cada corredor, incluido el de la clasificación que la propia tabla ordena**.
 *
 * Parece redundante y no lo es: por la regla del «pasa al siguiente», el maillot verde NO tiene por
 * qué estar en la fila 1 de la tabla de puntos —si el líder de la general va primero por puntos, el
 * verde lo lleva el segundo—, así que quitarlo de «su» tabla sería justo esconderlo donde más se
 * busca. Y en la general el amarillo de la fila 1 confirma de un vistazo quién lo lleva.
 */
function html(node: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

const count = (markup: string, label: string): number =>
  markup.split(`aria-label="${label}"`).length - 1

/**
 * Quién lleva un maillot, por FILAS: se parte el HTML en `<tr>` y de cada fila que traiga la
 * etiqueta se saca el nombre del corredor (el primer enlace de la fila). Así da igual que el icono
 * vaya antes o después del nombre, que es justo lo que cambia entre el maillot y el dorsal.
 */
function wearers(markup: string, label: string): string[] {
  return markup
    .split('<tr')
    .filter((row) => row.includes(`aria-label="${label}"`))
    .map((row) => /<a [^>]*>([^<]+)<\/a>/.exec(row)?.[1] ?? '')
}

const gcRow = (riderId: string, name: string, over: Partial<StageGcEntry> = {}): StageGcEntry => ({
  riderId,
  name,
  country: 'ES',
  teamId: `team-${riderId}`,
  teamName: `Equipo ${riderId}`,
  isBot: true,
  tiempoTotalS: 3600,
  ...over,
})

const resultRow = (riderId: string, puesto: number): StageResultEntry => ({
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

const pointsRow = (riderId: string, puntos: number) => ({
  riderId,
  name: `Corredor ${riderId}`,
  country: 'ES',
  isBot: true,
  puntos,
})

const leaders: RaceLeaders = { gc: 'a', points: 'b', kom: 'c', team: 'team-a' }

describe('la general de la etapa', () => {
  it('marca el amarillo en el líder y el verde y el azul en quien los lleve', () => {
    const markup = html(
      <GcTable
        rows={[gcRow('a', 'Ana'), gcRow('b', 'Bea'), gcRow('c', 'Ces')]}
        leaders={leaders}
      />,
    )
    expect(wearers(markup, 'Race leader')).toEqual(['Ana'])
    expect(wearers(markup, 'Points leader')).toEqual(['Bea'])
    expect(wearers(markup, 'Mountains leader')).toEqual(['Ces'])
  })

  it('el equipo líder ya NO se marca: el nombre del equipo va solo', () => {
    const markup = html(<GcTable rows={[gcRow('a', 'Ana'), gcRow('b', 'Bea')]} leaders={leaders} />)
    expect(count(markup, 'Leading team')).toBe(0)
    expect(markup).not.toContain('Equipo a<svg')
  })

  it('UN CORREDOR QUE ABANDONÓ NO SALE DE AMARILLO, aunque encabece la tabla', () => {
    // El caso real de Race Colombia (etapa 8): el que no tomó la salida encabezaba la general por no
    // haber corrido. La consulta ya lo marca `dnf`, el reparto de maillots no se lo da, y la tabla
    // por tanto no lo pinta: son tres capas y ninguna lo deja pasar.
    const conFantasma = [gcRow('fantasma', 'Fantasma', { dnf: true }), gcRow('a', 'Ana')]
    const markup = html(<GcTable rows={conFantasma} leaders={leaders} />)
    expect(wearers(markup, 'Race leader')).toEqual(['Ana'])
  })

  it('sin maillots (etapa 1) la tabla se pinta entera y sin un solo icono', () => {
    const markup = html(<GcTable rows={[gcRow('a', 'Ana')]} leaders={undefined} />)
    expect(markup).toContain('Ana')
    expect(count(markup, 'Race leader')).toBe(0)
  })

  it('una fila sin equipo (agente libre) no rompe nada', () => {
    const markup = html(
      <GcTable rows={[gcRow('a', 'Ana', { teamId: null, teamName: null })]} leaders={leaders} />,
    )
    expect(count(markup, 'Leading team')).toBe(0)
    expect(count(markup, 'Race leader')).toBe(1)
  })
})

describe('la clasificación por puntos', () => {
  it('el verde NO tiene por qué ser la fila 1: por eso se pinta también en su propia tabla', () => {
    // El líder de la general (a) va primero por puntos, así que el verde lo lleva el segundo (b).
    const markup = html(
      <PointsTable rows={[pointsRow('a', 50), pointsRow('b', 40)]} unit="pts" leaders={leaders} />,
    )
    expect(wearers(markup, 'Points leader')).toEqual(['Corredor b'])
    expect(wearers(markup, 'Race leader')).toEqual(['Corredor a'])
  })
})

describe('el resultado de la etapa', () => {
  // La tabla pinta el juego de maillots que le den; QUÉ juego le da la página —`onRoad`, los de la
  // carretera, y no `afterStage`— se prueba abajo, en «la ficha de etapa».
  it('marca el maillot de quien lo lleve, esté en la fila que esté', () => {
    const markup = html(
      <ResultTable rows={[resultRow('b', 1), resultRow('a', 2)]} leaders={leaders} />,
    )
    expect(wearers(markup, 'Points leader')).toEqual(['Corredor b'])
    expect(wearers(markup, 'Race leader')).toEqual(['Corredor a'])
  })

  it('sin líderes se pinta igual', () => {
    const markup = html(<ResultTable rows={[resultRow('a', 1)]} leaders={undefined} />)
    expect(markup).toContain('Corredor a')
    expect(count(markup, 'Race leader')).toBe(0)
  })
})
