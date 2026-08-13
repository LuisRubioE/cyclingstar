/**
 * Tests de CONTRATO de los clientes de api/: cada esquema acepta la forma real que devuelve la API
 * y rechaza las formas que antes se colaban con un `as` (campos ausentes, tipos cambiados,
 * vocabulario de dominio inválido). Si el backend cambia un campo, aquí se nota.
 */

import {
  ATTRIBUTES,
  type Attribute,
  calendarResponseSchema,
  enterableRacesResponseSchema,
  formResponseSchema,
  ledgerResponseSchema,
  myRiderResponseSchema,
  ordersResponseSchema,
  publicRiderDetailResponseSchema,
  raceOrdersResponseSchema,
  raceStartlistSchema,
  raceViewSchema,
  rankingResponseSchema,
  teamControlResponseSchema,
  teamResponseSchema,
  worldHealthResponseSchema,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'

/** Los 10 atributos siempre viajan completos (la API los rellena a 0 si faltan en la BD). */
const attributes = Object.fromEntries(ATTRIBUTES.map((a) => [a, 50])) as Record<Attribute, number>

describe('contratos: el ciclista del jugador', () => {
  it('acepta la respuesta de /api/riders/me con y sin ciclista', () => {
    expect(myRiderResponseSchema.parse({ rider: null })).toEqual({ rider: null })
    const rider = {
      id: 'r1',
      name: 'Ana Ruiz',
      country: 'ES',
      gender: 'F',
      archetype: 'escalada',
      birthSeason: 0,
      attributes,
    }
    expect(myRiderResponseSchema.parse({ rider })).toEqual({ rider })
  })

  it('rechaza una vocación que no existe en el dominio', () => {
    const rider = {
      id: 'r1',
      name: 'Ana Ruiz',
      country: 'ES',
      gender: 'F',
      archetype: 'trialera',
      birthSeason: 0,
      attributes,
    }
    expect(myRiderResponseSchema.safeParse({ rider }).success).toBe(false)
  })

  it('rechaza un ciclista al que le falta un atributo', () => {
    const incompletos: Partial<Record<Attribute, number>> = { ...attributes }
    delete incompletos.RES
    const rider = {
      id: 'r1',
      name: 'Ana Ruiz',
      country: 'ES',
      gender: 'F',
      archetype: 'crono',
      birthSeason: 0,
      attributes: incompletos,
    }
    expect(myRiderResponseSchema.safeParse({ rider }).success).toBe(false)
  })
})

describe('contratos: entrenamiento', () => {
  const payload = {
    currentDay: 12,
    horizonDays: 28,
    orders: [{ gameDay: 13, session: 'umbral', intensity: 'normal' }],
    raceDays: [15],
  }

  it('acepta la respuesta de /api/riders/me/orders', () => {
    expect(ordersResponseSchema.parse({ ...payload, travelDays: [] })).toEqual({
      ...payload,
      travelDays: [],
    })
  })

  // Los días de viaje llegan con destino, y sin ellos el planificador NO se cae: un despliegue en el
  // que la web va por delante de la API dejaría el campo ausente, y perder el plan entero por eso
  // sería peor que no enseñar el viaje.
  it('acepta los días de viaje y rellena la lista vacía si la API aún no los manda', () => {
    const viaje = {
      ...payload,
      travelDays: [{ gameDay: 14, raceKey: 'race-x:s0', raceName: 'Race X', country: 'co' }],
    }
    expect(ordersResponseSchema.parse(viaje)).toEqual(viaje)
    expect(ordersResponseSchema.parse(payload).travelDays).toEqual([])
  })

  it('rechaza una sesión de entrenamiento desconocida', () => {
    const roto = { ...payload, orders: [{ gameDay: 13, session: 'pilates', intensity: 'normal' }] }
    expect(ordersResponseSchema.safeParse(roto).success).toBe(false)
  })

  it('rechaza que falte raceDays (era justo el campo que reventaba como undefined)', () => {
    const roto: Record<string, unknown> = { ...payload }
    delete roto.raceDays
    expect(ordersResponseSchema.safeParse(roto).success).toBe(false)
  })
})

describe('contratos: forma y salud', () => {
  it('acepta la respuesta con salud y la respuesta sin ciclista (sin campo health)', () => {
    const conSalud = {
      log: [{ gameDay: 1, ctl: 10, atl: 5, tsb: 5, tss: 40, activity: 'fondo' }],
      form: { stars: 3, freshness: 0.6 },
      health: { state: 'molestias', untilDay: 20 },
    }
    expect(formResponseSchema.parse(conSalud)).toEqual(conSalud)
    expect(formResponseSchema.parse({ log: [], form: null })).toEqual({ log: [], form: null })
  })

  it('rechaza un estado de salud inventado', () => {
    const roto = { log: [], form: null, health: { state: 'resfriado', untilDay: null } }
    expect(formResponseSchema.safeParse(roto).success).toBe(false)
  })
})

describe('contratos: calendario y carrera', () => {
  const stage = {
    index: 1,
    name: 'Stage 1',
    label: 'Flat',
    kind: 'llana',
    km: 180,
    timeTrial: false,
    from: 'Bilbao',
    to: 'Burgos',
  }

  it('acepta el calendario de temporada', () => {
    const payload = {
      races: [
        {
          id: 'tour',
          name: 'Le Tour',
          level: 'WT',
          raceClass: 'WT',
          championshipCountry: null,
          championshipCategory: null,
          country: 'FR',
          format: 'gran-vuelta',
          startDay: 180,
          openTo: ['WT', 'PRS'],
          winner: null,
          restAfter: [9, 15],
          stages: [stage],
        },
      ],
      dayOfSeason: 12,
    }
    expect(calendarResponseSchema.parse(payload)).toEqual(payload)
  })

  it('rechaza un nivel de carrera fuera de WT/PRS/CON', () => {
    const payload = {
      races: [
        {
          id: 'tour',
          name: 'Le Tour',
          level: 'XX',
          raceClass: 'WT',
          championshipCountry: null,
          championshipCategory: null,
          country: 'FR',
          format: 'gran-vuelta',
          startDay: 180,
          openTo: [],
          winner: null,
          restAfter: [],
          stages: [],
        },
      ],
      dayOfSeason: null,
    }
    expect(calendarResponseSchema.safeParse(payload).success).toBe(false)
  })

  it('acepta la ficha de carrera sin mundo: identidad completa y resultados vacíos', () => {
    // Sin mundo cambian los RESULTADOS, no la identidad de la carrera: esa sale del calendario del
    // motor y va siempre completa, para que la página pueda situarla en la temporada.
    const payload = {
      race: {
        id: 'tour',
        name: 'Le Tour',
        level: 'WT',
        raceClass: 'WT',
        format: 'gran-vuelta',
        stageCount: 21,
        country: 'FR',
        startDay: 180,
      },
      dayOfSeason: null,
      status: 'upcoming',
      runDays: [],
      stages: [{ ...stage, altimetry: '<svg/>' }],
      restAfter: [],
      gc: [],
      points: [],
      kom: [],
      teamGc: [],
      // Sin mundo tampoco hay maillots: nadie lidera nada todavía.
      leaders: { gc: null, points: null, kom: null, team: null },
      stageWinners: [],
      history: [],
    }
    expect(raceViewSchema.parse(payload)).toEqual(payload)
  })

  it('rechaza un estado de carrera que no sea upcoming/racing/finished', () => {
    const payload = {
      race: {
        id: 'tour',
        name: 'Le Tour',
        level: 'WT',
        raceClass: 'WT',
        format: 'gran-vuelta',
        stageCount: 21,
        country: 'FR',
        startDay: 180,
      },
      dayOfSeason: 190,
      status: 'en-curso',
      runDays: [1],
      stages: [],
      restAfter: [],
      gc: [],
      points: [],
      kom: [],
      teamGc: [],
      stageWinners: [],
      history: [],
    }
    expect(raceViewSchema.safeParse(payload).success).toBe(false)
  })

  it('acepta la lista de inscritos antes y después del cierre de inscripciones', () => {
    const previa = { upcoming: false, teams: [], freeAgents: [] }
    expect(raceStartlistSchema.parse(previa)).toEqual(previa)
    const congelada = {
      upcoming: true,
      daysUntil: 3,
      frozen: true,
      teams: [
        {
          id: 't1',
          name: 'Equipo',
          country: 'ES',
          division: 'WT',
          jerseySeed: 'seed',
          riders: [{ id: 'r1', name: 'Ana', country: 'ES', isBot: false, bib: 11 }],
        },
      ],
      freeAgents: [],
    }
    expect(raceStartlistSchema.parse(congelada)).toEqual(congelada)
  })
})

describe('contratos: órdenes de etapa', () => {
  const payload = {
    race: { id: 'tour', name: 'Le Tour' },
    stages: [
      { day: 1, name: 'Stage 1', kind: 'llana', timeTrial: false, km: 180, altimetry: '<svg/>' },
    ],
    orders: [
      {
        stageDay: 1,
        role: 'cazaetapas',
        targetRiderId: null,
        mentality: 'combativo',
        effort: 'a_tope',
        triggerKm: 40,
        contestSprints: true,
        contestClimbs: false,
      },
    ],
    teammates: [{ id: 'r2', name: 'Luis' }],
    rivals: [{ id: 'r3', name: 'Marta' }],
  }

  it('acepta las órdenes de una carrera del calendario', () => {
    expect(raceOrdersResponseSchema.parse(payload)).toEqual(payload)
  })

  it('rechaza un rol o una mentalidad que el motor no entiende', () => {
    const rolMalo = {
      ...payload,
      orders: [{ ...payload.orders[0], role: 'capitan' }],
    }
    expect(raceOrdersResponseSchema.safeParse(rolMalo).success).toBe(false)
    const mentalidadMala = {
      ...payload,
      orders: [{ ...payload.orders[0], mentality: 'kamikaze' }],
    }
    expect(raceOrdersResponseSchema.safeParse(mentalidadMala).success).toBe(false)
  })
})

describe('contratos: mundo, equipo y dinero', () => {
  it('acepta el ranking y rechaza puntos que llegan como texto', () => {
    const fila = {
      riderId: 'r1',
      name: 'Ana',
      country: 'ES',
      teamId: null,
      teamName: null,
      isBot: false,
      points: 120,
    }
    expect(rankingResponseSchema.parse({ ranking: [fila] })).toEqual({ ranking: [fila] })
    expect(rankingResponseSchema.safeParse({ ranking: [{ ...fila, points: '120' }] }).success).toBe(
      false,
    )
  })

  it('acepta la ficha de equipo con su plantilla', () => {
    const payload = {
      team: {
        id: 't1',
        name: 'Equipo',
        country: null,
        division: 'CON',
        budget: 100,
        pointsSeason: 0,
        jerseySeed: 'seed',
        human: false,
        roster: [
          {
            id: 'r1',
            name: 'Ana',
            country: 'ES',
            archetype: 'fondo',
            isBot: true,
            seasonPoints: 0,
            foreign: false,
            health: 'sano',
          },
        ],
      },
    }
    expect(teamResponseSchema.parse(payload)).toEqual(payload)
  })

  it('acepta la ficha pública de corredor CON su salud (es pública, §3.6)', () => {
    const rider = {
      id: 'r1',
      name: 'Ana Ruiz',
      country: 'ES',
      residence: 'ES',
      archetype: 'escalada',
      age: 24,
      isBot: false,
      teamId: null,
      teamName: null,
      seasonPoints: 120,
      seasonRank: 12,
      fieldSize: 900,
      fame: 30,
      attributes,
      health: { state: 'lesionado', untilDay: 143 },
    }
    expect(publicRiderDetailResponseSchema.parse({ rider })).toEqual({ rider })
    // Sin salud la ficha ya no vale: la insignia del perfil cuenta con ella.
    const sinSalud: Record<string, unknown> = { ...rider }
    delete sinSalud.health
    expect(publicRiderDetailResponseSchema.safeParse({ rider: sinSalud }).success).toBe(false)
    // Y el estado sale del vocabulario del motor, no de un string cualquiera.
    expect(
      publicRiderDetailResponseSchema.safeParse({
        rider: { ...rider, health: { state: 'resfriado', untilDay: null } },
      }).success,
    ).toBe(false)
  })

  it('acepta el estado de control de equipo, con equipo y sin él', () => {
    expect(teamControlResponseSchema.parse({ control: null })).toEqual({ control: null })
    const control = {
      premium: true,
      isAdmin: false,
      team: { id: 't1', name: 'Equipo', isBot: true, ownedByMe: false },
    }
    expect(teamControlResponseSchema.parse({ control })).toEqual({ control })
  })

  it('acepta el libro de cuentas sin contrato (salario null)', () => {
    const payload = {
      balance: 42,
      entries: [{ gameDay: 7, kind: 'salario', amount: 20, note: 'Weekly wage' }],
      gameDay: 7,
      salary: null,
    }
    expect(ledgerResponseSchema.parse(payload)).toEqual(payload)
  })

  it('acepta las carreras en las que el agente libre puede inscribirse', () => {
    const payload = {
      races: [
        {
          raceId: 'volta',
          name: 'Volta',
          country: 'PT',
          startDay: 30,
          raceClass: '2',
          travelMoney: 12,
          travelDays: 2,
          entered: false,
          enrolled: false,
          affordable: true,
        },
      ],
    }
    expect(enterableRacesResponseSchema.parse(payload)).toEqual(payload)
  })

  it('acepta la salud del mundo del panel de admin', () => {
    const payload = {
      ok: true,
      health: {
        currentDay: 40,
        season: 0,
        worldCreatedAt: '2026-01-01T00:00:00.000Z',
        riders: { active: 900, human: 3, bots: 897, retired: 20, freeAgents: 40 },
        teams: { total: 60, human: 1, wt: 18, prs: 20, con: 22 },
        users: 5,
        recentTicks: [
          {
            startedAt: '2026-01-02T00:00:00.000Z',
            daysProcessed: 1,
            durationMs: 900,
            ok: true,
            notes: null,
          },
        ],
      },
    }
    expect(worldHealthResponseSchema.parse(payload)).toEqual(payload)
  })
})
