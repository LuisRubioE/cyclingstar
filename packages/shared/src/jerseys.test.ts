import { describe, expect, it } from 'vitest'
import {
  type JerseyInput,
  assignLeaderJerseys,
  jerseyOf,
  leadingTeam,
  raceLeaders,
} from './jerseys.js'

/** Una clasificación a partir de ids sueltos: el orden de la lista ES la clasificación. */
const orden = (...ids: string[]) => ids.map((riderId) => ({ riderId }))
const gc = (...rows: (string | { riderId: string; dnf: boolean })[]) =>
  rows.map((r) => (typeof r === 'string' ? { riderId: r } : r))

const input = (over: Partial<JerseyInput> = {}): JerseyInput => ({
  gc: [],
  points: [],
  kom: [],
  ...over,
})

describe('reparto de los maillots de líder', () => {
  it('sin clasificaciones no hay maillots (etapa 1, carrera sin correr)', () => {
    expect(assignLeaderJerseys(input())).toEqual({ gc: null, points: null, kom: null })
  })

  it('tres corredores distintos: cada uno con el suyo', () => {
    expect(
      assignLeaderJerseys(
        input({ gc: gc('a', 'b', 'c'), points: orden('b', 'a'), kom: orden('c', 'a') }),
      ),
    ).toEqual({ gc: 'a', points: 'b', kom: 'c' })
  })

  it('el líder de la general también primero por puntos: el verde PASA AL SIGUIENTE', () => {
    expect(
      assignLeaderJerseys(input({ gc: gc('a', 'b'), points: orden('a', 'b'), kom: orden('c') })),
    ).toEqual({ gc: 'a', points: 'b', kom: 'c' })
  })

  it('la cadena entera: el mismo corredor lidera las tres', () => {
    // Amarillo para A; el verde baja al 2.º de puntos (B); y el azul, que también sería A, baja al
    // 2.º de montaña… que es B y ya lleva verde, así que sigue bajando hasta C.
    expect(
      assignLeaderJerseys(
        input({
          gc: gc('a', 'b', 'c'),
          points: orden('a', 'b', 'c'),
          kom: orden('a', 'b', 'c'),
        }),
      ),
    ).toEqual({ gc: 'a', points: 'b', kom: 'c' })
  })

  it('si no queda nadie a quien darle el maillot, se queda sin dueño y no se inventa', () => {
    // Un solo corredor con puntos, y es el líder de la general: el verde no tiene siguiente.
    expect(assignLeaderJerseys(input({ gc: gc('a', 'b'), points: orden('a'), kom: [] }))).toEqual({
      gc: 'a',
      points: null,
      kom: null,
    })
  })

  it('quien abandonó NO lleva maillot: el amarillo pasa al primer clasificado', () => {
    // El caso real de Race Colombia: el que no tomó la salida de la etapa 8 encabezaba la general
    // por no haber corrido. `getGcThroughStage` lo marca `dnf` y aquí no puede vestirse de amarillo.
    expect(
      assignLeaderJerseys(
        input({ gc: gc({ riderId: 'fantasma', dnf: true }, 'a', 'b'), points: [], kom: [] }),
      ).gc,
    ).toBe('a')
  })

  it('el abandonado tampoco lleva verde ni azul, aunque siga en esas tablas con sus puntos', () => {
    // Puntos y montaña se acumulan sobre lo ya corrido y no saben de abandonos: el que se fue sigue
    // apareciendo con los puntos que ganó. La lista de excluidos sale de la general.
    expect(
      assignLeaderJerseys(
        input({
          gc: gc({ riderId: 'ido', dnf: true }, 'a', 'b'),
          points: orden('ido', 'b'),
          kom: orden('ido', 'a'),
        }),
      ),
    ).toEqual({ gc: 'a', points: 'b', kom: null })
    // El azul se queda sin dueño porque el único candidato que quedaba (A) ya va de amarillo.
  })

  it('una general entera de abandonos no rompe nada', () => {
    expect(
      assignLeaderJerseys(input({ gc: gc({ riderId: 'x', dnf: true }), points: [], kom: [] })),
    ).toEqual({ gc: null, points: null, kom: null })
  })

  it('un corredor de puntos que no está en la general se acepta (no se rompe la página)', () => {
    // No debería pasar —las tres salen de `stage_results`—, pero si pasara, lo honesto es dárselo:
    // la lista de excluidos son los marcados como no clasificados, no «los que no reconozco».
    expect(assignLeaderJerseys(input({ gc: [], points: orden('z'), kom: [] })).points).toBe('z')
  })
})

describe('el equipo líder', () => {
  it('es el primero de la acumulada que sigue en clasificación', () => {
    expect(leadingTeam([{ teamId: 't1', out: true }, { teamId: 't2' }, { teamId: 't3' }])).toBe(
      't2',
    )
  })

  it('sin clasificación por equipos no hay dorsal de líder', () => {
    expect(leadingTeam([])).toBeNull()
  })

  it('NO entra en la cadena de los maillots: se puede ir de amarillo y llevar dorsal a la vez', () => {
    const leaders = raceLeaders({
      gc: gc('a', 'b'),
      points: orden('a', 'b'),
      kom: orden('a'),
      teams: [{ teamId: 'suyo' }],
    })
    expect(leaders).toEqual({ gc: 'a', points: 'b', kom: null, team: 'suyo' })
  })
})

describe('consultar el maillot de un corredor', () => {
  const leaders = { gc: 'a', points: 'b', kom: 'c', team: 't' }

  it('devuelve el maillot de cada uno y null para el resto', () => {
    expect(jerseyOf(leaders, 'a')).toBe('gc')
    expect(jerseyOf(leaders, 'b')).toBe('points')
    expect(jerseyOf(leaders, 'c')).toBe('kom')
    expect(jerseyOf(leaders, 'd')).toBeNull()
  })

  it('sin maillots (etapa 1, carrera de un día) no consulta nada', () => {
    expect(jerseyOf(undefined, 'a')).toBeNull()
  })

  it('el equipo líder no es un maillot: no sale por aquí', () => {
    expect(jerseyOf(leaders, 't')).toBeNull()
  })
})
