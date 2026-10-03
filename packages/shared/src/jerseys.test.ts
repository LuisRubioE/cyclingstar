import { describe, expect, it } from 'vitest'
import type { StageRef } from './broadcast/timeline.js'
import {
  type ChampionTitle,
  type Distinction,
  type JerseyInput,
  JERSEY_PRIORITY,
  type WornInput,
  type WornJersey,
  assignLeaderJerseys,
  distinctions,
  jerseyOf,
  leadingTeam,
  notorietyOf,
  raceLeaders,
  staticNotoriety,
  wornJerseys,
} from './jerseys.js'
import { seededRng } from './rng.js'

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

/*
 * ── EL MAILLOT QUE SE VE Y EL RÓTULO (E2, docs/retransmision.md §7.2 y §7.5; paso 5) ─────────────
 *
 * Los 18 casos de la tabla de §7.2, uno por `it` con su número, y la notoriedad de §7.5. Los de arriba
 * (los de hoy) no se tocan: `wornJerseys` reparte los de líder con la misma bajada por la tabla que
 * `assignLeaderJerseys` (el caso 4 lo ata sobre tablas al azar) y añade lo que la UCI dice del campeón.
 */

/** La N − 1 de una etapa de vuelta: la procedencia de todo lo que sale de la general de salida. */
const FROM: StageRef = { raceKey: 'race-france:s0', stageDay: 6 }

/** Un título nacional de Italia (el país de los ejemplos de §7.1), ganado el día 179 de la temporada 0. */
const titulo = (
  o: Pick<ChampionTitle, 'discipline' | 'category'> & Partial<ChampionTitle>,
): ChampionTitle => ({
  scope: 'national',
  country: 'IT',
  season: 0,
  validFromDay: 179,
  validToDay: 543,
  source: {
    raceKey: `nc-it-${o.category === 'u23' ? 'u23-' : ''}${o.discipline}:s0`,
    stageDay: 1,
  },
  provisional: true,
  ...o,
})
const RUTA_IT = titulo({ discipline: 'road', category: 'elite' })
const CRONO_IT = titulo({ discipline: 'itt', category: 'elite' })
const RUTA_IT_SUB23 = titulo({ discipline: 'road', category: 'u23' })
const MUNDO_RUTA = titulo({
  scope: 'world',
  country: null,
  discipline: 'road',
  category: 'elite',
  provisional: false,
  source: { raceKey: 'worlds-road:s0', stageDay: 1 },
})

/** Una etapa de vuelta, élite y en línea, sin títulos: cada caso cambia lo suyo. */
const entrada = (o: Partial<WornInput> = {}): WornInput => ({
  firstDay: false,
  discipline: 'road',
  category: 'elite',
  standings: { gc: [], points: [], kom: [] },
  standingsFrom: FROM,
  titles: new Map(),
  ...o,
})
const titulos = (...pares: [string, ChampionTitle[]][]) =>
  new Map<string, readonly ChampionTitle[]>(pares)
const lider = (jersey: 'gc' | 'points' | 'kom', delegated = false): WornJersey => ({
  kind: 'leader',
  jersey,
  delegated,
  from: FROM,
})
const SIN_SALIDA = { gcRank: null, gcDeficitS: null }
const OPTS = { gcLineTop: 20 }
/** Las distinciones de un corredor con los maillots ya repartidos, sin salida ni victorias si no se dan. */
const lineas = (
  riderId: string,
  input: WornInput,
  start: { gcRank: number | null; gcDeficitS: number | null } = SIN_SALIDA,
  wins: readonly StageRef[] = [],
): readonly Distinction[] => distinctions(riderId, input, wornJerseys(input), start, wins, OPTS)

describe('el maillot llevado y las distinciones (§7.2, los 18 casos)', () => {
  it('1 · etapa 1 de una vuelta sin títulos: todos de su equipo y sin líneas', () => {
    const e = entrada({
      firstDay: true,
      standingsFrom: null,
      standings: { gc: gc('a', 'b'), points: orden('a'), kom: orden('b') },
    })
    expect(wornJerseys(e).size).toBe(0)
    expect(lineas('a', e)).toEqual([])
    expect(lineas('b', e)).toEqual([])
  })

  it('2 · etapa 1, élite, en línea: el campeón de ruta lleva su maillot desde el primer día', () => {
    const e = entrada({ firstDay: true, standingsFrom: null, titles: titulos(['a', [RUTA_IT]]) })
    expect(wornJerseys(e)).toEqual(new Map([['a', { kind: 'champion', title: RUTA_IT }]]))
    expect(lineas('a', e)).toEqual([])
  })

  it('3 · carrera de un día en línea: el de ruta lo lleva y el de crono lo dice en una línea', () => {
    const e = entrada({
      firstDay: true,
      standingsFrom: null,
      titles: titulos(['a', [RUTA_IT]], ['b', [CRONO_IT]]),
    })
    const worn = wornJerseys(e)
    expect(worn.get('a')).toEqual({ kind: 'champion', title: RUTA_IT })
    expect(worn.has('b')).toBe(false)
    expect(lineas('b', e)).toEqual([{ kind: 'champion', title: CRONO_IT }])
  })

  it('4 · sin títulos, los líderes son los de assignLeaderJerseys, delegados donde no es el primero', () => {
    const rng = seededRng('e2-paso-5-caso-4')
    const ids = Array.from({ length: 10 }, (_, i) => `r${i}`)
    const baraja = (xs: readonly string[]): string[] => {
      const out = [...xs]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        const tmp = out[i]!
        out[i] = out[j]!
        out[j] = tmp
      }
      return out
    }
    for (let n = 0; n < 300; n++) {
      const standings: JerseyInput = {
        gc: baraja(ids).map((riderId) => (rng() < 0.15 ? { riderId, dnf: true } : { riderId })),
        points: orden(...baraja(ids).filter(() => rng() < 0.6)),
        kom: orden(...baraja(ids).filter(() => rng() < 0.6)),
      }
      const worn = wornJerseys(entrada({ standings }))
      const esperado = assignLeaderJerseys(standings)
      const fuera = new Set(standings.gc.filter((r) => r.dnf).map((r) => r.riderId))
      const tablas = { gc: standings.gc, points: standings.points, kom: standings.kom }
      let lideres = 0
      for (const jersey of JERSEY_PRIORITY) {
        const quien = esperado[jersey]
        if (quien === null) continue
        lideres += 1
        const primero = tablas[jersey].find((r) => !fuera.has(r.riderId))?.riderId
        expect(worn.get(quien), `tirada ${n}, ${jersey}`).toEqual(lider(jersey, quien !== primero))
      }
      expect(worn.size, `tirada ${n}`).toBe(lideres)
    }
  })

  it('5 · el líder de la general y de la montaña: el azul lo lleva el 2.º, y A lo dice en una línea', () => {
    const e = entrada({ standings: { gc: gc('a', 'b', 'c'), points: [], kom: orden('a', 'b') } })
    const worn = wornJerseys(e)
    expect(worn.get('a')).toEqual(lider('gc'))
    expect(worn.get('b')).toEqual(lider('kom', true))
    expect(lineas('a', e)).toEqual([{ kind: 'leads', jersey: 'kom', from: FROM }])
    expect(lineas('b', e)).toEqual([{ kind: 'wears_for', jersey: 'kom', rank: 2, from: FROM }])
  })

  it('6 · como el 5 con B campeón de ruta: B lleva su título y el azul baja al 3.º (DD-05)', () => {
    const e = entrada({
      standings: { gc: gc('a', 'b', 'c'), points: [], kom: orden('a', 'b', 'c') },
      titles: titulos(['b', [RUTA_IT]]),
    })
    const worn = wornJerseys(e)
    expect(worn.get('a')).toEqual(lider('gc'))
    expect(worn.get('b')).toEqual({ kind: 'champion', title: RUTA_IT })
    expect(worn.get('c')).toEqual(lider('kom', true))
    expect(lineas('c', e)).toEqual([{ kind: 'wears_for', jersey: 'kom', rank: 3, from: FROM }])
  })

  it('7 · el líder de la general con título de ruta lleva el amarillo y el título va a una línea', () => {
    const e = entrada({
      standings: { gc: gc('a', 'b'), points: [], kom: [] },
      titles: titulos(['a', [RUTA_IT]]),
    })
    expect(wornJerseys(e).get('a')).toEqual(lider('gc'))
    expect(lineas('a', e)).toEqual([{ kind: 'champion', title: RUTA_IT }])
  })

  it('8 · al líder de los puntos no se le salta aunque tenga título que llevar', () => {
    const e = entrada({
      standings: { gc: gc('x', 'a'), points: orden('a', 'x'), kom: [] },
      titles: titulos(['a', [RUTA_IT]]),
    })
    expect(wornJerseys(e).get('a')).toEqual(lider('points'))
    expect(lineas('a', e)).toEqual([{ kind: 'champion', title: RUTA_IT }])
  })

  it('9 · en una crono, el campeón de ruta va de su equipo y lo dice en una línea', () => {
    const e = entrada({ discipline: 'itt', titles: titulos(['a', [RUTA_IT]]) })
    expect(wornJerseys(e).has('a')).toBe(false)
    expect(lineas('a', e)).toEqual([{ kind: 'champion', title: RUTA_IT }])
  })

  it('10 · en una crono, el campeón de crono lleva su maillot', () => {
    const e = entrada({ discipline: 'itt', titles: titulos(['a', [CRONO_IT]]) })
    expect(wornJerseys(e).get('a')).toEqual({ kind: 'champion', title: CRONO_IT })
    expect(lineas('a', e)).toEqual([])
  })

  it('11 · en una carrera de élite, el campeón sub-23 va de su equipo (O-03)', () => {
    const e = entrada({ titles: titulos(['a', [RUTA_IT_SUB23]]) })
    expect(wornJerseys(e).has('a')).toBe(false)
    expect(lineas('a', e)).toEqual([{ kind: 'champion', title: RUTA_IT_SUB23 }])
  })

  it('12 · en el nacional sub-23 de ruta, el campeón sub-23 lleva su maillot', () => {
    const e = entrada({
      firstDay: true,
      standingsFrom: null,
      category: 'u23',
      titles: titulos(['a', [RUTA_IT_SUB23]]),
    })
    expect(wornJerseys(e).get('a')).toEqual({ kind: 'champion', title: RUTA_IT_SUB23 })
    expect(lineas('a', e)).toEqual([])
  })

  it('13 · el que abandonó no lleva nada y la montaña es de su primer clasificado, sin delegar', () => {
    const e = entrada({
      standings: {
        gc: gc({ riderId: 'a', dnf: true }, 'b', 'c'),
        points: [],
        kom: orden('a', 'c', 'b'),
      },
    })
    const worn = wornJerseys(e)
    expect(worn.has('a')).toBe(false)
    expect(worn.get('b')).toEqual(lider('gc'))
    expect(worn.get('c')).toEqual(lider('kom'))
  })

  it('14 · tras un prólogo, con puntos y montaña vacías, solo se viste el amarillo', () => {
    const e = entrada({ standings: { gc: gc('a', 'b', 'c'), points: [], kom: [] } })
    expect(wornJerseys(e)).toEqual(new Map([['a', lider('gc')]]))
  })

  it('15 · el campeón del mundo lleva el arcoíris y el nacional va a una línea', () => {
    const e = entrada({ titles: titulos(['a', [RUTA_IT, MUNDO_RUTA]]) })
    expect(wornJerseys(e).get('a')).toEqual({ kind: 'champion', title: MUNDO_RUTA })
    expect(lineas('a', e)).toEqual([{ kind: 'champion', title: RUTA_IT }])
  })

  it('16 · el primero de la general de salida no tiene línea de general: la dice su titular', () => {
    const e = entrada({ standings: { gc: gc('a', 'b'), points: [], kom: [] } })
    expect(wornJerseys(e).get('a')).toEqual(lider('gc'))
    expect(lineas('a', e, { gcRank: 1, gcDeficitS: 0 })).toEqual([])
    expect(lineas('b', e, { gcRank: 2, gcDeficitS: 4 })).toEqual([
      { kind: 'gc', rank: 2, deficitS: 4, from: FROM },
    ])
    expect(lineas('b', e, { gcRank: 21, gcDeficitS: 400 })).toEqual([])
  })

  it('17 · el 14.º a 4:02 que ganó la etapa 3: su general y su victoria', () => {
    const e = entrada({ standings: { gc: gc('a', 'b'), points: [], kom: [] } })
    const tercera: StageRef = { raceKey: 'race-france:s0', stageDay: 3 }
    expect(wornJerseys(e).has('b')).toBe(false)
    expect(lineas('b', e, { gcRank: 14, gcDeficitS: 242 }, [tercera])).toEqual([
      { kind: 'gc', rank: 14, deficitS: 242, from: FROM },
      { kind: 'stage_wins', stages: [tercera] },
    ])
  })

  it('18 · cinco distinciones, en el orden de D-24 y sin cortar: las tres primeras son las del rótulo', () => {
    // A lidera la general y los puntos: lleva el amarillo y el verde baja a C, que no tiene título
    // que llevar en una etapa en línea (el suyo es de crono). C lidera además la montaña, que no
    // puede llevar (ya va de verde): el azul baja a D.
    const e = entrada({
      standings: {
        gc: gc('a', 'x', 'y', 'z', 'c', 'd'),
        points: orden('a', 'c'),
        kom: orden('c', 'd'),
      },
      titles: titulos(['c', [CRONO_IT]]),
    })
    const worn = wornJerseys(e)
    expect(worn.get('a')).toEqual(lider('gc'))
    expect(worn.get('c')).toEqual(lider('points', true))
    expect(worn.get('d')).toEqual(lider('kom', true))
    const tercera: StageRef = { raceKey: 'race-france:s0', stageDay: 3 }
    const todas = lineas('c', e, { gcRank: 5, gcDeficitS: 63 }, [tercera])
    expect(todas.map((d) => d.kind)).toEqual(['wears_for', 'leads', 'champion', 'gc', 'stage_wins'])
    expect(todas.slice(0, 3)).toEqual([
      { kind: 'wears_for', jersey: 'points', rank: 2, from: FROM },
      { kind: 'leads', jersey: 'kom', from: FROM },
      { kind: 'champion', title: CRONO_IT },
    ])
    expect(lineas('a', e)).toEqual([{ kind: 'leads', jersey: 'points', from: FROM }])
  })

  it('las líneas de campeón van por categoría del día, luego por disciplina del día, luego por alcance', () => {
    const SUB23_CRONO = titulo({ discipline: 'itt', category: 'u23' })
    const e = entrada({ titles: titulos(['a', [SUB23_CRONO, RUTA_IT_SUB23, CRONO_IT]]) })
    // Ninguno se lleva en una etapa élite en línea: los tres van a líneas, en ese orden.
    expect(wornJerseys(e).has('a')).toBe(false)
    expect(lineas('a', e)).toEqual([
      { kind: 'champion', title: CRONO_IT },
      { kind: 'champion', title: RUTA_IT_SUB23 },
      { kind: 'champion', title: SUB23_CRONO },
    ])
  })
})

describe('la notoriedad sin fama (§7.5)', () => {
  const N = { gcThreatTop: 10, knownNameMinWins: 3 }
  const gcLinea = (rank: number, deficitS: number): Distinction => ({
    kind: 'gc',
    rank,
    deficitS,
    from: FROM,
  })
  const equipo: WornJersey = { kind: 'team' }
  const victoria: Distinction = {
    kind: 'stage_wins',
    stages: [{ raceKey: 'race-france:s0', stageDay: 3 }],
  }

  it('los nueve niveles, de menor a mayor', () => {
    expect(staticNotoriety(lider('gc'), [], 0, 'elite', N)).toBe(0)
    expect(staticNotoriety({ kind: 'champion', title: MUNDO_RUTA }, [], 0, 'elite', N)).toBe(1)
    expect(staticNotoriety(equipo, [{ kind: 'champion', title: MUNDO_RUTA }], 0, 'elite', N)).toBe(
      1,
    )
    expect(staticNotoriety(lider('points'), [], 0, 'elite', N)).toBe(2)
    expect(staticNotoriety(lider('kom'), [], 0, 'elite', N)).toBe(2)
    expect(staticNotoriety(lider('kom', true), [], 0, 'elite', N)).toBe(3)
    expect(staticNotoriety({ kind: 'champion', title: RUTA_IT }, [], 0, 'elite', N)).toBe(4)
    expect(staticNotoriety(equipo, [{ kind: 'champion', title: CRONO_IT }], 0, 'elite', N)).toBe(4)
    expect(staticNotoriety(equipo, [gcLinea(9, 120)], 0, 'elite', N)).toBe(5)
    expect(staticNotoriety(equipo, [gcLinea(14, 242)], 0, 'elite', N)).toBe(8)
    expect(staticNotoriety(equipo, [victoria], 0, 'elite', N)).toBe(6)
    expect(staticNotoriety(equipo, [], 3, 'elite', N)).toBe(7)
    expect(staticNotoriety(equipo, [], 2, 'elite', N)).toBe(8)
  })

  it('un título sub-23 en una carrera de élite es una línea, no el nivel 4 (7-f)', () => {
    const linea: Distinction = { kind: 'champion', title: RUTA_IT_SUB23 }
    expect(staticNotoriety(equipo, [linea], 0, 'elite', N)).toBe(8)
    expect(staticNotoriety(equipo, [linea], 0, 'u23', N)).toBe(4)
  })

  it('durante la carrera sube a 5 quien va por delante del líder más de lo que pierde en la general', () => {
    const card = { ix: 7, notoriety: 6 as const, lines: [gcLinea(14, 30)] }
    const grupos = (ventajaS: number) => ({
      groups: [
        { number: 1, members: [7, 8], jerseys: [], gap: { toHeadS: 0 } },
        { number: 2, members: [1, 2, 3], jerseys: ['gc' as const], gap: { toHeadS: ventajaS } },
      ],
    })
    expect(notorietyOf(card, grupos(45))).toBe(5)
    expect(notorietyOf(card, grupos(30))).toBe(6)
    // Sin línea de general (más allá de gcLineTop) no se sabe su déficit: no sube.
    expect(notorietyOf({ ...card, lines: [] }, grupos(600))).toBe(6)
    // Con el líder por delante, tampoco.
    const delante = {
      groups: [
        { number: 1, members: [1, 2], jerseys: ['gc' as const], gap: { toHeadS: 0 } },
        { number: 2, members: [7], jerseys: [], gap: { toHeadS: 40 } },
      ],
    }
    expect(notorietyOf(card, delante)).toBe(6)
    // Quien ya está en el 5 o por encima se queda donde está.
    expect(notorietyOf({ ...card, notoriety: 3 }, grupos(45))).toBe(3)
  })
})
