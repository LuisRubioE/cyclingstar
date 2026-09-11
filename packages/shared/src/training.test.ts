import { describe, expect, it } from 'vitest'
import { ATTRIBUTES, RIDER_ARCHETYPES, VOCATIONS, type Vocation } from './rider.js'
import {
  ARCHETYPE_CARD,
  type CoachContext,
  GROUP_TRAINING_BONUS_CAP,
  coachBlock,
  coachPlan,
  SESSIONS,
  SESSION_CATALOG,
  type Session,
  defaultCoachPlan,
  groupTrainingMultiplier,
  sessionTss,
  sessionsForAttribute,
} from './training.js'

describe('shared: catálogo de entrenamiento (SPEC 5.1)', () => {
  it('define cada sesión con carga por intensidad', () => {
    for (const session of SESSIONS) {
      const info = SESSION_CATALOG[session]
      expect(info.tss.suave).toBeGreaterThanOrEqual(0)
      expect(info.tss.fuerte).toBeGreaterThanOrEqual(info.tss.suave)
    }
  })

  it('la carga de Puertos fuerte es 140 (SPEC 5.1)', () => {
    expect(sessionTss({ session: 'puertos', intensity: 'fuerte' })).toBe(140)
  })

  it('el plan por defecto es determinista y cíclico (14 días desde la v53)', () => {
    expect(defaultCoachPlan(1)).toEqual(defaultCoachPlan(15))
    expect(defaultCoachPlan(3).session).toBe(defaultCoachPlan(17).session)
    // El ciclo dejó de ser de siete días cuando se le hizo sitio al oficio y a la carta de cada uno.
    // Se comprueba con una vocación concreta a propósito: para el corredor COMPLETO su carta es
    // `umbral`, que ya sale en el día 1, así que el día 8 le coincide por casualidad y no probaría
    // nada. Con un velocista el día 8 es su sesión de sprint.
    expect(defaultCoachPlan(1, 'velocidad')).not.toEqual(defaultCoachPlan(8, 'velocidad'))
  })

  /**
   * EL ENTRENADOR ENTRENABA CUATRO ATRIBUTOS DE DIEZ (v53, docs/epics.md «G1»).
   *
   * La microsemana vieja eran siete días con cinco sesiones y de las once del catálogo no aparecían
   * nunca `sprint`, `crono`, `bajada_paves`, `gimnasio` ni `video_tactica`. Medido sobre un
   * neoprofesional de 20 años, un año entero: RES +8,2, LLA +11,1, MON +3,6, COL +2,2… y CERO en
   * REC, CRI, SPR, DES, PAV y TAC. Un velocista no entrenaba el sprint en toda su carrera.
   *
   * Se sella lo que de verdad importa —que a cada uno le toque su carta y que el oficio se
   * entrene—, no el calendario concreto, que puede cambiar sin que esto sea un defecto.
   */
  it('cada vocación entrena su carta, y todos el oficio', () => {
    const cicloDe = (vocation: Vocation): Set<Session> => {
      const out = new Set<Session>()
      for (let d = 0; d < 28; d++) out.add(defaultCoachPlan(d, vocation).session)
      return out
    }
    const suCarta: Record<Vocation, Session> = {
      velocidad: 'sprint',
      crono: 'crono',
      escalada: 'puertos',
      clasicas: 'bajada_paves',
      fondo: 'umbral',
    }
    for (const vocation of VOCATIONS) {
      const ciclo = cicloDe(vocation)
      expect(`${vocation} entrena su carta: ${ciclo.has(suCarta[vocation])}`).toBe(
        `${vocation} entrena su carta: true`,
      )
      // El OFICIO es de todos: la táctica y el descenso/adoquín no son de una vocación.
      expect(`${vocation} aprende táctica: ${ciclo.has('video_tactica')}`).toBe(
        `${vocation} aprende táctica: true`,
      )
      expect(`${vocation} entrena el oficio: ${ciclo.has('bajada_paves')}`).toBe(
        `${vocation} entrena el oficio: true`,
      )
      // Y el descanso activo sigue estando: es lo único que entrena la recuperación.
      expect(`${vocation} descansa activo: ${ciclo.has('descanso_activo')}`).toBe(
        `${vocation} descansa activo: true`,
      )
    }
  })

  /**
   * NINGUNA SESIÓN ENTRENABA LA RECUPERACIÓN (v53). No es que el entrenador no la programara: es que
   * REC no aparecía en el `gains` de ninguna de las once sesiones, así que era imposible moverla
   * para nadie, tampoco para un jugador planificando a mano. Y REC no es decorado: acorta la
   * constante de tiempo de la fatiga en Banister y cuenta cerillas.
   */
  it('todos los atributos se pueden entrenar en alguna sesión', () => {
    for (const attr of ATTRIBUTES) {
      const sesiones = sessionsForAttribute(attr)
      expect(`${attr}: ${sesiones.length > 0}`).toBe(`${attr}: true`)
    }
  })

  it('el entrenamiento en grupo bonifica las sesiones de grupo y crece con los compañeros', () => {
    // Sesión de grupo (fondo): sin compañeros = 1; sube con cada compañero hasta el tope.
    expect(groupTrainingMultiplier('fondo', 0)).toBe(1)
    expect(groupTrainingMultiplier('fondo', 1)).toBeGreaterThan(1)
    expect(groupTrainingMultiplier('fondo', 3)).toBeGreaterThan(groupTrainingMultiplier('fondo', 1))
    expect(groupTrainingMultiplier('fondo', 20)).toBeCloseTo(1 + GROUP_TRAINING_BONUS_CAP)
    // Sesión individual (sprint, crono, gimnasio): nunca bonifica, aunque haya compañeros.
    expect(groupTrainingMultiplier('sprint', 5)).toBe(1)
    expect(groupTrainingMultiplier('crono', 5)).toBe(1)
    expect(groupTrainingMultiplier('gimnasio', 5)).toBe(1)
    // El descanso tampoco.
    expect(groupTrainingMultiplier('descanso_total', 5)).toBe(1)
  })
})

describe('shared: el entrenador bot v2 (v59)', () => {
  const base: CoachContext = {
    gameDay: 0,
    seasonDay: 0,
    archetype: 'escalada',
    tsb: 0,
    health: 'sano',
    strainDays: 0,
    daysToNextRace: null,
    nextRaceIsGoal: false,
    nextRaceStages: 1,
    teamGoalInDays: null,
    daysSinceBlockEnd: null,
    lastBlockDays: 0,
    hardLast7: 0,
    yesterday: null,
  }

  it('no le manda series a un corredor fundido, que es lo que el ciclo fijo hacía', () => {
    expect(coachPlan({ ...base, tsb: -45 }).reason).toBe('hundido')
    expect(coachPlan({ ...base, tsb: -45 }).session).toBe('descanso_total')
    expect(coachPlan({ ...base, tsb: -35 }).reason).toBe('cargado')
    expect(coachPlan({ ...base, tsb: -35 }).session).toBe('descanso_activo')
  })

  it('la salud manda sobre todo, y las molestias ya no son invisibles', () => {
    expect(coachPlan({ ...base, health: 'enfermo' }).session).toBe('descanso_total')
    expect(coachPlan({ ...base, health: 'molestias' }).session).toBe('descanso_activo')
    expect(coachPlan({ ...base, health: 'molestias' }).reason).toBe('molestias')
  })

  it('afina antes de una carrera por etapas, y abre las piernas la víspera', () => {
    const antes = { ...base, daysToNextRace: 5, nextRaceStages: 5 }
    expect(coachPlan(antes).reason).toBe('afinado')
    expect(coachPlan({ ...antes, daysToNextRace: 1 }).reason).toBe('aperturas')
    expect(coachPlan({ ...antes, daysToNextRace: 2 }).intensity).toBe('suave')
  })

  it('afina también para el objetivo del EQUIPO, que es lo que faltaba', () => {
    // Un equipo bot que declara una carrera objetivo no conseguía que los suyos llegaran afinados:
    // el contexto solo sabía de la marca del jugador, y un NPC no tiene ninguna.
    expect(coachPlan({ ...base, teamGoalInDays: 4 }).reason).toBe('afinado')
  })

  it('los guardarraíles: no apretar dos veces por semana, y parar si hay tensión', () => {
    // Una semana de construcción: hay carrera dentro de tres semanas —ni tan cerca que toque
    // afinar ni tan lejos que sea pretemporada— y la semana del mesociclo es de carga.
    const cargando = { ...base, seasonDay: 0, gameDay: 2, daysToNextRace: 20 }
    expect(coachPlan(cargando).intensity).toBe('fuerte')
    // Ya apretó esta semana: el bot no lo repite.
    expect(coachPlan({ ...cargando, hardLast7: 1 }).intensity).toBe('normal')
    expect(coachPlan({ ...cargando, hardLast7: 1 }).reason).toBe('guardarrail')
    // Y con tres días de tensión acumulada manda descansar aunque toque cargar.
    expect(coachPlan({ ...cargando, strainDays: 3 }).session).toBe('descanso_activo')
  })

  it('cada arquetipo afila LO SUYO, y el gregario no tiene carta que afilar', () => {
    for (const a of RIDER_ARCHETYPES) expect(ARCHETYPE_CARD[a]).toBeTruthy()
    expect(ARCHETYPE_CARD.puncheur).toBe('muros')
    expect(ARCHETYPE_CARD.velocidad).toBe('sprint')
    expect(ARCHETYPE_CARD.gregario).toBe('fondo')
  })

  it('volver de una tanda de carreras se hace poco a poco', () => {
    const vuelta = { ...base, lastBlockDays: 7, daysSinceBlockEnd: 2 }
    expect(coachBlock(vuelta).block).toBe('recuperacion')
    expect(coachBlock(vuelta).reason).toBe('post_vuelta')
  })
})
