import { describe, expect, it } from 'vitest'
import { type CensusGroup, type CensusRider, census, myMates } from './views.js'

/**
 * EL CENSO DE GRUPO (docs/tactica.md §3.2, paso 2).
 *
 * Quince situaciones de R01 dependen de una sola cosa —que un corredor sepa quién de los suyos va
 * aquí, quién delante y quién detrás— y hoy no lo sabe, aunque `simulate.ts` tenga el dato a mano en
 * todos los bloques y nunca lo haya reunido.
 *
 * Lo que se prueba aquí es el contrato, porque **en este paso nadie lo lee**: si el censo naciera
 * mal, el paso 3 engancharía R01 sobre un dato falso y el error aparecería tres pasos después
 * disfrazado de defecto de regla.
 */

const r = (
  riderId: string,
  teamId: string | null,
  finishScore: number,
  over: Partial<CensusRider> = {},
): CensusRider => ({
  riderId,
  teamId,
  role: 'libre',
  finishScore,
  perfil: 60,
  placement: 0.5,
  energyFraction: 0.7,
  ...over,
})

const g = (
  groupId: string,
  tS: number,
  members: CensusRider[],
  over: Partial<CensusGroup> = {},
): CensusGroup => ({
  groupId,
  kind: 'peloton',
  isMain: true,
  tS,
  members,
  ...over,
})

describe('engine: el censo de un grupo', () => {
  it('cuenta las CASAS que van dentro, que es el número de la queja del dueño', () => {
    const grupo = g('fuga', 100, [
      r('a1', 'A', 70),
      r('a2', 'A', 60),
      r('b1', 'B', 80),
      r('suelto', null, 50),
    ])
    const c = census(grupo, 'sprint_reducido')
    expect(c.teamCensus.get('A')?.here).toBe(2)
    expect(c.teamCensus.get('B')?.here).toBe(1)
    expect(c.freeAgents).toBe(1)
    // El agente libre no es una casa de una: es otra cosa, y el turno lo trata aparte.
    expect(c.teamCensus.has('null')).toBe(false)
  })

  it('LA CARTA DE CADA CASA ES SU MEJOR REMATADOR AQUÍ, no el mejor de la casa', () => {
    // Es lo que convierte «somos tres» en «somos tres y el bueno es él», que es lo que R02 necesita.
    const grupo = g('fuga', 100, [r('a1', 'A', 55), r('a2', 'A', 90), r('b1', 'B', 80)])
    const c = census(grupo, 'sprint_reducido')
    expect(c.teamCensus.get('A')?.cardId).toBe('a2')
  })

  it('el mejor rematador del grupo se calcula con el final de ESTE grupo', () => {
    const grupo = g('fuga', 100, [r('a1', 'A', 55), r('b1', 'B', 91), r('c1', 'C', 70)])
    expect(census(grupo, 'alto').bestFinisherId).toBe('b1')
  })

  it('un empate se rompe por id: dos corridas iguales tienen que dar lo mismo', () => {
    // Sin desempate estable, el censo sería una fuente de no-determinismo dentro de un motor que
    // presume de serlo, y el defecto aparecería como una huella que baila.
    const grupo = g('fuga', 100, [r('zz', 'A', 70), r('aa', 'B', 70)])
    expect(census(grupo, 'alto').bestFinisherId).toBe('aa')
  })

  it('compromiso y tensión nacen a CERO, declarados y no inventados', () => {
    // Los mueve R18 en el paso 7. Un cero declarado es mejor que un número que nadie sabría leer.
    const c = census(g('p', 0, [r('a', 'A', 60)]), 'sprint_masivo')
    expect(c.compromiso).toBe(0)
    expect(c.tension).toBe(0)
  })
})

describe('engine: los míos, desde mi sitio', () => {
  const fuga = g('fuga', 100, [r('a1', 'A', 70), r('b1', 'B', 80)], { kind: 'move', isMain: false })
  const peloton = g('peloton', 240, [r('a2', 'A', 60), r('a3', 'A', 55), r('c1', 'C', 65)])
  const cola = g('cola', 400, [r('a4', 'A', 40)], { kind: 'shed', isMain: false })

  it('DELANTE es quien lleva menos reloj, que en carrera es la posición', () => {
    const yo = peloton.members[0]!
    const m = myMates(yo, peloton, [fuga, peloton, cola], () => 0.5)
    expect(m.matesAhead.map((x) => x.riderId)).toEqual(['a1'])
    expect(m.matesBehind.map((x) => x.riderId)).toEqual(['a4'])
    expect(m.mates.map((x) => x.riderId)).toEqual(['a3'])
  })

  it('el hueco es el del GRUPO y va en positivo: el signo lo dice el lado', () => {
    const yo = peloton.members[0]!
    const m = myMates(yo, peloton, [fuga, peloton, cola], () => 0.5)
    expect(m.matesAhead[0]?.gapS).toBe(140)
    expect(m.matesBehind[0]?.gapS).toBe(160)
  })

  it('YO NO SOY COMPAÑERO DE MÍ MISMO, que es el error fácil de esta función', () => {
    const yo = fuga.members[0]!
    const m = myMates(yo, fuga, [fuga], () => 0.5)
    expect(m.mates).toEqual([])
  })

  it('un agente libre no tiene compañeros en ninguna parte', () => {
    const suelto = r('x', null, 60)
    const solo = g('peloton', 240, [suelto, r('a2', 'A', 60)])
    const m = myMates(suelto, solo, [solo, fuga], () => 0.5)
    expect(m).toEqual({ mates: [], matesAhead: [], matesBehind: [] })
  })
})
