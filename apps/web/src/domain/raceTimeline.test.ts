import type { CalendarRaceSummary } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  buildTimeline,
  champCountryName,
  champEventLabel,
  champEventsByDay,
  championshipsByNation,
  endDay,
  matchesClass,
  matchesFormat,
  matchesQuery,
  statusOf,
} from './raceTimeline'

/** Carrera mínima del calendario: solo lo que miran la línea temporal y sus filtros. */
function race(partial: Partial<CalendarRaceSummary> = {}): CalendarRaceSummary {
  const stages = partial.stages ?? [
    {
      index: 1,
      name: 'Stage 1',
      label: '1',
      kind: 'llana',
      km: 180,
      timeTrial: false,
      from: null,
      to: null,
    },
  ]
  return {
    id: partial.id ?? 'race-x',
    name: 'Race X',
    level: 'WT',
    raceClass: 'WT',
    championshipCountry: null,
    championshipCategory: null,
    country: 'ES',
    format: 'un-dia',
    startDay: 100,
    openTo: ['WT'],
    winner: null,
    restAfter: [],
    ...partial,
    stages,
  }
}

describe('último día de una carrera', () => {
  it('una de un día empieza y acaba el mismo día', () => {
    expect(endDay(race())).toBe(100)
  })

  it('los días de descanso alargan la carrera', () => {
    const stages = Array.from({ length: 21 }, (_, i) => ({
      index: i + 1,
      name: `Stage ${i + 1}`,
      label: String(i + 1),
      kind: 'llana',
      km: 180,
      timeTrial: false,
      from: null,
      to: null,
    }))
    expect(endDay(race({ stages, restAfter: [9, 15] }))).toBe(122)
  })
})

describe('estado respecto a hoy', () => {
  const vuelta = race({ startDay: 100, stages: [1, 2, 3].map(stageAt) })

  function stageAt(_v: number, i: number) {
    return {
      index: i + 1,
      name: `Stage ${i + 1}`,
      label: String(i + 1),
      kind: 'llana',
      km: 180,
      timeTrial: false,
      from: null,
      to: null,
    }
  }

  it('sin mundo todo está por venir', () => {
    expect(statusOf(vuelta, null)).toBe('upcoming')
  })

  it('está en curso desde su salida hasta su último día, inclusive', () => {
    expect(statusOf(vuelta, 99)).toBe('upcoming')
    expect(statusOf(vuelta, 100)).toBe('ongoing')
    expect(statusOf(vuelta, 102)).toBe('ongoing')
    expect(statusOf(vuelta, 103)).toBe('finished')
  })
})

describe('filtros del índice', () => {
  it('los campeonatos nacionales solo salen en su propio filtro', () => {
    const nc = race({ championshipCountry: 'ES', raceClass: 'Pro' })
    expect(matchesClass(nc, 'all')).toBe(false)
    expect(matchesClass(nc, 'Pro')).toBe(false)
    expect(matchesClass(nc, 'NC')).toBe(true)
  })

  it('el filtro de campeonatos excluye a las demás carreras', () => {
    expect(matchesClass(race({ raceClass: 'WT' }), 'NC')).toBe(false)
  })

  it('Continental agrupa las clases 1 y 2', () => {
    expect(matchesClass(race({ raceClass: '1' }), 'CON')).toBe(true)
    expect(matchesClass(race({ raceClass: '2' }), 'CON')).toBe(true)
    expect(matchesClass(race({ raceClass: 'WT' }), 'CON')).toBe(false)
  })

  it('filtra por formato', () => {
    expect(matchesFormat(race({ format: 'gran-vuelta' }), 'all')).toBe(true)
    expect(matchesFormat(race({ format: 'gran-vuelta' }), 'gran-vuelta')).toBe(true)
    expect(matchesFormat(race({ format: 'gran-vuelta' }), 'un-dia')).toBe(false)
  })

  it('busca por nombre, país y ganador, sin distinguir mayúsculas', () => {
    const r = race({ name: 'Tour of Flanders', country: 'BE', winner: 'Ana Ruiz' })
    expect(matchesQuery(r, '')).toBe(true)
    expect(matchesQuery(r, 'flanders')).toBe(true)
    expect(matchesQuery(r, 'be')).toBe(true)
    expect(matchesQuery(r, 'ruiz')).toBe(true)
    expect(matchesQuery(r, '  RUIZ  ')).toBe(true)
    expect(matchesQuery(r, 'giro')).toBe(false)
  })
})

describe('línea temporal', () => {
  const temporada = [
    race({ id: 'a', name: 'A', startDay: 10, winner: 'Ana' }),
    race({ id: 'b', name: 'B', startDay: 20, winner: 'Bea' }),
    race({ id: 'c', name: 'C', startDay: 30, winner: 'Cris' }),
    race({ id: 'd', name: 'D', startDay: 40 }),
    race({ id: 'e', name: 'E', startDay: 50 }),
  ]

  it('ordena cronológicamente y mete el marcador de hoy entre lo corrido y lo que viene', () => {
    const { rows } = buildTimeline(temporada, { today: 35 })
    expect(rows.map((r) => (r.kind === 'today' ? 'HOY' : r.race.id))).toEqual([
      'a',
      'b',
      'c',
      'HOY',
      'd',
      'e',
    ])
  })

  it('la carrera que se corre hoy queda DESPUÉS del marcador, no en el pasado', () => {
    const { rows } = buildTimeline(temporada, { today: 30 })
    const marca = rows.findIndex((r) => r.kind === 'today')
    const enCurso = rows.findIndex((r) => r.kind === 'race' && r.race.id === 'c')
    expect(enCurso).toBeGreaterThan(marca)
    expect(rows[enCurso]).toMatchObject({ status: 'ongoing' })
  })

  it('sin mundo no hay marcador y todo está por venir', () => {
    const { rows } = buildTimeline(temporada, { today: null })
    expect(rows.every((r) => r.kind === 'race' && r.status === 'upcoming')).toBe(true)
  })

  it('con la temporada acabada el marcador va al final', () => {
    const { rows } = buildTimeline(temporada, { today: 200 })
    expect(rows[rows.length - 1]).toEqual({ kind: 'today', day: 200 })
  })

  it('pliega el pasado lejano y deja las recientes junto al marcador', () => {
    const { rows, earlierCount } = buildTimeline(temporada, { today: 35, recentWindow: 2 })
    expect(earlierCount).toBe(1)
    expect(rows.map((r) => (r.kind === 'today' ? 'HOY' : r.race.id))).toEqual([
      'b',
      'c',
      'HOY',
      'd',
      'e',
    ])
  })

  it('al pedir "ver anteriores" vuelve a salir toda la temporada', () => {
    const { rows, earlierCount } = buildTimeline(temporada, {
      today: 35,
      recentWindow: 2,
      showEarlier: true,
    })
    expect(earlierCount).toBe(0)
    expect(rows).toHaveLength(6)
  })

  it('sin mundo no se pliega nada: no hay pasado que recortar', () => {
    const { earlierCount } = buildTimeline(temporada, { today: null, recentWindow: 1 })
    expect(earlierCount).toBe(0)
  })

  it('el buscador y los filtros recortan la línea, y el total cuenta lo plegado', () => {
    const { rows, total, earlierCount } = buildTimeline(temporada, {
      today: 35,
      query: 'ana',
      recentWindow: 0,
    })
    expect(total).toBe(1)
    expect(earlierCount).toBe(1)
    expect(rows).toEqual([{ kind: 'today', day: 35 }])
  })

  it('deja fuera los campeonatos nacionales salvo en su filtro', () => {
    const conCampeonatos = [
      ...temporada,
      race({ id: 'nc', championshipCountry: 'ES', startDay: 25 }),
    ]
    expect(buildTimeline(conCampeonatos, { today: 35 }).total).toBe(5)
    expect(buildTimeline(conCampeonatos, { today: 35, classFilter: 'NC' }).total).toBe(1)
  })
})

describe('campeonatos nacionales', () => {
  function champ(country: string, name: string, startDay: number, itt: boolean, u23: boolean) {
    return race({
      id: `${country}-${name}`,
      name,
      startDay,
      championshipCountry: country,
      championshipCategory: u23 ? 'u23' : 'elite',
      stages: [
        {
          index: 1,
          name,
          label: '1',
          kind: itt ? 'cri' : 'clasica',
          km: 40,
          timeTrial: itt,
          from: null,
          to: null,
        },
      ],
    })
  }

  const españa = [
    champ('ES', 'Spain ITT Championship', 178, true, false),
    champ('ES', 'Spain Road Championship', 180, false, false),
    champ('ES', 'Spain U23 ITT Championship', 178, true, true),
  ]
  const australia = [champ('AU', 'Australia Road Championship', 20, false, false)]

  it('nombra la prueba y el país sin el sufijo', () => {
    expect(champEventLabel(españa[0]!)).toBe('ITT')
    expect(champEventLabel(españa[2]!)).toBe('U23 ITT')
    expect(champCountryName(españa[1]!)).toBe('Spain')
    expect(champCountryName(españa[2]!)).toBe('Spain')
  })

  it('agrupa por nación y ordena por fecha, no por alfabeto', () => {
    const naciones = championshipsByNation([...españa, ...australia])
    expect(naciones.map(([code]) => code)).toEqual(['AU', 'ES'])
    expect(naciones[1]![1]).toHaveLength(3)
  })

  it('agrupa las pruebas de un país por día, en orden de prueba', () => {
    const dias = champEventsByDay(españa)
    expect(dias.map(([day]) => day)).toEqual([178, 180])
    expect(dias[0]![1].map(champEventLabel)).toEqual(['ITT', 'U23 ITT'])
  })
})
