/**
 * Tests de CONTRATO de los clientes de api/: cada esquema acepta la forma real que devuelve la API
 * y rechaza las formas que antes se colaban con un `as` (campos ausentes, tipos cambiados,
 * vocabulario de dominio inválido). Si el backend cambia un campo, aquí se nota.
 */

import {
  ATTRIBUTES,
  type Attribute,
  calendarResponseSchema,
  coachViewResponseSchema,
  enterableRacesResponseSchema,
  formResponseSchema,
  ledgerResponseSchema,
  myRiderResponseSchema,
  newsItemSchema,
  newsResponseSchema,
  ordersResponseSchema,
  publicRiderDetailResponseSchema,
  raceOrdersResponseSchema,
  raceStagePlanSchema,
  raceStartlistSchema,
  raceViewSchema,
  rankingResponseSchema,
  stageReplaySchema,
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
    const trip = { raceKey: 'race-x:s0', raceName: 'Race X', country: 'co' }
    const viaje = {
      ...payload,
      travelDays: [
        { ...trip, gameDay: 14, direction: 'out' },
        { ...trip, gameDay: 18, direction: 'back' },
      ],
    }
    expect(ordersResponseSchema.parse(viaje)).toEqual(viaje)
    expect(ordersResponseSchema.parse(payload).travelDays).toEqual([])
  })

  // Una API anterior solo mandaba la IDA y sin sentido: se lee como ida, no se rechaza.
  it('un día de viaje sin sentido se lee como IDA', () => {
    const viejo = {
      ...payload,
      travelDays: [{ gameDay: 14, raceKey: 'race-x:s0', raceName: 'Race X', country: 'co' }],
    }
    expect(ordersResponseSchema.parse(viejo).travelDays[0]?.direction).toBe('out')
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

describe('contratos: la opinión del entrenador', () => {
  const vista = (opinion: string) => ({
    coachView: {
      ceilings: ATTRIBUTES.map((attr) => ({ attr, opinion })),
      notes: ['techo_cerca'],
      declining: false,
      facilities: 'normal',
      season: 3,
    },
  })

  it('acepta las opiniones relativas de hoy', () => {
    for (const o of ['pronto', 'asoma', 'apunta', 'quiza', 'no_parece', 'lo_tuyo', 'flojo']) {
      expect(coachViewResponseSchema.safeParse(vista(o)).success).toBe(true)
    }
  })

  // docs/agenda.md §4.20: la API no manda lo que la pantalla no enseña. Si alguien vuelve a meter
  // el techo en estrellas en el contrato, esto se pone rojo.
  it('rechaza las opiniones en estrellas de antes', () => {
    for (const o of ['tres', 'cuatro', 'cinco']) {
      expect(coachViewResponseSchema.safeParse(vista(o)).success).toBe(false)
    }
  })
})

describe('contratos: forma y salud', () => {
  it('acepta la respuesta con salud y la respuesta sin ciclista (sin campo health)', () => {
    const conSalud = {
      log: [{ gameDay: 1, ctl: 10, atl: 5, tsb: 5, tss: 40, activity: 'fondo' }],
      form: { stars: 3, freshness: 0.6 },
      health: { state: 'molestias', untilDay: 20 },
    }
    // …y el PARTE del día llega a `null` cuando no viene (v47): un día de entrenamiento no tiene
    // carrera que contar, y una API que va por detrás de la web tampoco lo manda. Es lo que hace
    // que la ficha pueda pintar el desglose sin comprobar si el campo existe.
    expect(formResponseSchema.parse(conSalud)).toEqual({
      ...conSalud,
      log: [{ ...conSalud.log[0]!, parte: null }],
    })
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
  /** Una etapa del plan de la ficha: la del calendario más su origen y su edición (§3.11). */
  const planStage = {
    ...stage,
    altimetry: '<svg/>',
    routeSource: 'edicion',
    edicion: 1,
    arch: { frase: 'Flat; sprint finish', skeleton: 'et_llana', geo: 'meseta' },
    cambiosRespectoAnterior: [],
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
        routeSource: 'mixto',
      },
      dayOfSeason: null,
      status: 'upcoming',
      runDays: [],
      stages: [{ ...planStage, altimetry: '<svg/>' }],
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

  it('la etapa de la ficha trae su origen, su edición, su frase y lo que cambió (§11.4, D10)', () => {
    const generada = {
      ...stage,
      altimetry: '<svg/>',
      routeSource: 'generado',
      edicion: 3,
      arch: { frase: 'Flat; sprint finish', skeleton: 'et_llana', geo: 'meseta' },
      cambiosRespectoAnterior: ['192 km → 201 km'],
    }
    expect(raceStagePlanSchema.parse(generada)).toEqual(generada)
    // Lo real no tiene ficha del generador ni cambios que anunciar.
    const real = { ...planStage, routeSource: 'real', arch: null }
    expect(raceStagePlanSchema.parse(real)).toEqual(real)
  })

  it('rechaza un origen fuera de los tres, una edición 0 o una etapa sin la lista de cambios', () => {
    expect(raceStagePlanSchema.safeParse({ ...planStage, routeSource: 'inventado' }).success).toBe(
      false,
    )
    expect(raceStagePlanSchema.safeParse({ ...planStage, edicion: 0 }).success).toBe(false)
    const sinCambios: Record<string, unknown> = { ...planStage }
    delete sinCambios.cambiosRespectoAnterior
    expect(raceStagePlanSchema.safeParse(sinCambios).success).toBe(false)
    expect(raceStagePlanSchema.safeParse({ ...planStage, arch: { frase: 'Flat' } }).success).toBe(
      false,
    )
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
    teams: [{ id: 't9', name: 'Rival Team' }],
  }

  it('acepta las órdenes de una carrera del calendario', () => {
    expect(raceOrdersResponseSchema.parse(payload)).toEqual(payload)
  })

  /**
   * EL DESPLIEGUE ESCALONADO, FIJADO (paso 17a). `teams` llega con la lista de equipos de la carrera
   * —la necesita `refuseRelayTeams`, que toma identificadores de EQUIPO— y va con `.default([])` a
   * propósito: entre que sube la API y sube la web hay una ventana en la que el servidor todavía no
   * lo manda, y sin el defecto la respuesta ENTERA dejaría de parsear y la pantalla de órdenes se
   * caería por un campo que solo sirve para una palanca.
   */
  it('una respuesta sin `teams` sigue valiendo, y la lista sale vacía', () => {
    const viejo: Record<string, unknown> = { ...payload }
    delete viejo.teams
    expect(raceOrdersResponseSchema.parse(viejo).teams).toEqual([])
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

/**
 * LA WEB DE AYER AGUANTA LO QUE LA RETRANSMISIÓN VA A SERVIR (docs/retransmision.md §14.1 y §14.7,
 * D-50; E2, paso 0). Estos dos esquemas no tenían ningún caso aquí (la ceguera 5 del mapa 07 §5.2), y
 * son justo los dos que E2 estira: la ruta de etapa deja de mandar el resultado de una etapa que la
 * pantalla no va a enseñar, y los titulares ganan sus datos. Lo que se fija es la tolerancia de HOY,
 * la que permite desplegar la API antes que la web sin que una pestaña abierta se caiga.
 */
describe('contratos: la etapa y las noticias, tal como las tolera la web de hoy', () => {
  it('una etapa corrida con solo sus obligatorios, sin resultado ni maillots, vale', () => {
    // §14.1, regla 1: `day`, `name`, `km`, `run` y `altimetry` son obligatorios y se mandan siempre;
    // los opcionales de resultado y `leaders` ENTERO se pueden omitir. `leaders` no puede ir a medias:
    // dentro lleva `onRoad` y `afterStage` obligatorios.
    const veiled = { day: 3, name: 'Stage 3 · Hills', km: 196, run: true, altimetry: '<svg/>' }
    expect(stageReplaySchema.parse(veiled)).toEqual(veiled)
    for (const key of ['day', 'name', 'km', 'run', 'altimetry']) {
      const incompleta: Record<string, unknown> = { ...veiled }
      delete incompleta[key]
      expect(stageReplaySchema.safeParse(incompleta).success).toBe(false)
    }
    const onRoad = { gc: 'r1', points: null, kom: null, team: null }
    expect(stageReplaySchema.safeParse({ ...veiled, leaders: { onRoad } }).success).toBe(false)
    const leaders = { onRoad, afterStage: onRoad }
    expect(stageReplaySchema.parse({ ...veiled, leaders })).toEqual({ ...veiled, leaders })
  })

  it('la etapa velada del 7b llega con lo visto (`watch`), y una puerta que no conoce no pasa', () => {
    // §14.1 y §14.2 (paso 7b): con SPOILER_MODE aplicado, la ruta de etapa gana `watch`, opcional.
    const veiled = { day: 3, name: 'Stage 3 · Hills', km: 196, run: true, altimetry: '<svg/>' }
    const watch = { known: false, reachedS: 1200, gate: { k: 'not_seen' }, seen: false } as const
    expect(stageReplaySchema.parse({ ...veiled, watch })).toEqual({ ...veiled, watch })
    const previous = { ...watch, gate: { k: 'previous_unseen', firstUnseen: 2 } } as const
    expect(stageReplaySchema.parse({ ...veiled, watch: previous }).watch).toEqual(previous)
    const bad = { ...watch, gate: { k: 'quien_sabe' } }
    expect(stageReplaySchema.safeParse({ ...veiled, watch: bad }).success).toBe(false)
  })

  it('un titular con claves que no conoce vale, y las claves de más se quedan fuera', () => {
    // Re-sellado en el 1a (docs/retransmision.md §14.2): los seis campos del titular con datos
    // (`payload`, `seed`, `tplRev`, `raceId`, `raceKey` y `stageDay`), que en el paso 0 eran aquí
    // las claves de más, ya son del esquema. Lo que el caso fija no cambia: un campo que la API
    // añada mañana se queda fuera y la web lee el titular por lo que conoce. Que la web de AYER se
    // trague los seis lo fija `apps/api/src/routes/yesterday.test.ts`, con su `.omit`.
    const today = {
      gameDay: 187,
      kind: 'stage_win',
      text: 'Ana Ruiz wins stage 3 of the Race France.',
      personal: false,
      riderId: 'r1',
      riderName: 'Ana Ruiz',
      country: 'ES',
      teamId: 't1',
      teamName: 'Equipo Uno',
      payload: {
        kind: 'stage_win',
        raceId: 'race-france',
        season: 0,
        stageDay: 3,
        riderId: 'r1',
        teamId: 't1',
      },
      seed: 'win:race-france:s0:187:3',
      tplRev: 0,
      raceId: 'race-france',
      raceKey: 'race-france:s0',
      stageDay: 3,
    }
    const widened = { ...today, watch: { known: false }, gate: null }
    expect(newsItemSchema.parse(widened)).toEqual(today)
    expect(newsResponseSchema.parse({ news: [widened] })).toEqual({ news: [today] })
  })

  it('un titular de antes de la 0046 llega sin datos y se lee por su text', () => {
    const old = {
      gameDay: 40,
      kind: 'contract',
      text: 'Ana Ruiz signs for Equipo Uno , relocating to Spain.',
      personal: true,
      riderId: 'r1',
      riderName: 'Ana Ruiz',
      country: 'ES',
      teamId: 't1',
      teamName: 'Equipo Uno',
    }
    expect(newsItemSchema.parse(old)).toEqual(old)
    const sinDatos = {
      ...old,
      payload: null,
      seed: null,
      tplRev: null,
      raceId: null,
      raceKey: null,
      stageDay: null,
    }
    expect(newsItemSchema.parse(sinDatos)).toEqual(sinDatos)
    // Unos datos que no son un `NewsPayload` no se mandan: la API los pone a null (§14.2).
    expect(newsItemSchema.safeParse({ ...old, payload: { rider: 'Ana Ruiz' } }).success).toBe(false)
  })
})
