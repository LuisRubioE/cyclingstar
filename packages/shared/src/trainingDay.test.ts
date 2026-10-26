import { describe, expect, it } from 'vitest'
import type { TrainingMode } from './contracts.js'
import {
  type CoachBlock,
  type CoachContext,
  type TrainingChoice,
  blockWeek,
  coachPlan,
} from './training.js'
import {
  TRAINING_DAY_SOURCES,
  type TrainingDayContext,
  type TrainingDaySource,
  resolveTrainingDay,
} from './trainingDay.js'

/**
 * LA PRECEDENCIA DEL DÍA DE ENTRENAMIENTO (E3, docs/visual.md §11.4; PR 13a): la tabla de los tres modos
 * por los siete orígenes. Cada fila pone en el contexto lo que da su origen y todo lo que va por debajo de
 * él, así que la fila dice quién gana cuando está todo; cada columna es un modo.
 */

const DIA = 5 * 364 + 100
const COACH: CoachContext = {
  gameDay: DIA,
  seasonDay: 100,
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
const ORDEN: TrainingChoice = { session: 'umbral', intensity: 'fuerte' }
const EQUIPO: TrainingChoice = { session: 'fondo', intensity: 'suave' }
const BLOQUES: readonly [CoachBlock, CoachBlock, CoachBlock, CoachBlock] = [
  'base',
  'construccion',
  'especifico',
  'recuperacion',
]
/** Un plan que empezó hace 15 días: hoy es su tercera semana, la del `especifico`. */
const PLAN = {
  startDay: DIA - 15,
  blocks: BLOQUES,
  focusAttr: null,
  intensity: null,
} as const
/** El mismo plan con la tercera semana en `null`: «esa semana decide el entrenador». */
const PLAN_SIN_ESTA_SEMANA = { ...PLAN, blocks: ['base', 'construccion', null, 'afinado'] } as const
const CARRERA = { raceKey: 'race-france:s5' }
const VIAJE = { raceKey: 'race-france:s5', direction: 'out' } as const

const contexto = (
  mode: TrainingMode,
  over: Partial<TrainingDayContext> = {},
): TrainingDayContext => ({
  gameDay: DIA,
  mode,
  archetype: 'escalada',
  race: null,
  travel: null,
  order: null,
  plan: null,
  teamPlan: null,
  coach: COACH,
  ...over,
})

/** Lo que cada escenario pone en el contexto: su origen y lo de debajo. */
const ESCENARIOS: Readonly<Record<string, Partial<TrainingDayContext>>> = {
  carrera: { race: CARRERA, travel: VIAJE, order: ORDEN, plan: PLAN, teamPlan: EQUIPO },
  viaje: { travel: VIAJE, order: ORDEN, plan: PLAN, teamPlan: EQUIPO },
  orden: { order: ORDEN, plan: PLAN, teamPlan: EQUIPO },
  bloque: { plan: PLAN, teamPlan: EQUIPO },
  'semana en null, con equipo': { plan: PLAN_SIN_ESTA_SEMANA, teamPlan: EQUIPO },
  equipo: { teamPlan: EQUIPO },
  'semana en null, sin equipo': { plan: PLAN_SIN_ESTA_SEMANA },
  nada: {},
}

/** Quién gana en cada escenario y modo: `entrenador`, `mixto` y `manual`. */
const TABLA: Readonly<
  Record<
    keyof typeof ESCENARIOS,
    readonly [TrainingDaySource, TrainingDaySource, TrainingDaySource]
  >
> = {
  carrera: ['carrera', 'carrera', 'carrera'],
  viaje: ['viaje', 'viaje', 'viaje'],
  orden: ['entrenador', 'orden', 'orden'],
  bloque: ['entrenador', 'bloque', 'bloque'],
  'semana en null, con equipo': ['entrenador', 'equipo', 'descanso'],
  equipo: ['entrenador', 'equipo', 'descanso'],
  'semana en null, sin equipo': ['entrenador', 'entrenador', 'descanso'],
  nada: ['entrenador', 'entrenador', 'descanso'],
}
const MODOS: readonly TrainingMode[] = ['entrenador', 'mixto', 'manual']

/** La sesión y la intensidad que da cada origen en estos contextos. */
const ELECCION: Readonly<Record<TrainingDaySource, TrainingChoice | null>> = {
  carrera: null,
  viaje: { session: 'viaje', intensity: 'normal' },
  orden: ORDEN,
  bloque: blockWeek('especifico', 'escalada', DIA, null, 'normal'),
  equipo: EQUIPO,
  entrenador: (({ session, intensity }) => ({ session, intensity }))(coachPlan(COACH)),
  descanso: { session: 'descanso_activo', intensity: 'normal' },
}

describe('shared: resolveTrainingDay, la tabla de los tres modos por los siete orígenes (§11.4)', () => {
  for (const [escenario, over] of Object.entries(ESCENARIOS)) {
    MODOS.forEach((mode, i) => {
      const esperado = TABLA[escenario]![i]!
      it(`${escenario}, en ${mode}: ${esperado}`, () => {
        const dia = resolveTrainingDay(contexto(mode, over))
        expect(dia.source).toBe(esperado)
        const eleccion = ELECCION[esperado]
        expect(dia.session).toBe(eleccion?.session ?? null)
        expect(dia.intensity).toBe(eleccion?.intensity ?? null)
      })
    })
  }

  it('la tabla dice los siete orígenes, y en el orden de la precedencia', () => {
    const vistos = new Set(Object.values(TABLA).flat())
    expect([...vistos].sort()).toEqual([...TRAINING_DAY_SOURCES].sort())
    expect(TRAINING_DAY_SOURCES).toEqual([
      'carrera',
      'viaje',
      'orden',
      'bloque',
      'equipo',
      'entrenador',
      'descanso',
    ])
  })
})

describe('shared: resolveTrainingDay, lo que acompaña a la elección', () => {
  it('la carrera y el viaje dicen de qué carrera; lo demás, de ninguna', () => {
    expect(resolveTrainingDay(contexto('mixto', ESCENARIOS.carrera)).raceKey).toBe(CARRERA.raceKey)
    expect(resolveTrainingDay(contexto('mixto', ESCENARIOS.viaje)).raceKey).toBe(VIAJE.raceKey)
    expect(resolveTrainingDay(contexto('mixto', ESCENARIOS.orden)).raceKey).toBeNull()
  })

  it('el bloque dice cuál es y su semana, de la 1 a la 4', () => {
    expect(resolveTrainingDay(contexto('mixto', { plan: PLAN })).block).toEqual({
      code: 'especifico',
      week: 3,
    })
    for (const [semana, desfase] of [
      [1, 0],
      [1, 6],
      [2, 7],
      [4, 27],
    ] as const) {
      const dia = resolveTrainingDay(
        contexto('manual', { plan: { ...PLAN, startDay: DIA - desfase } }),
      )
      expect(dia.block).toEqual({ code: BLOQUES[semana - 1], week: semana })
    }
    // ni la orden ni el entrenador traen bloque
    expect(resolveTrainingDay(contexto('mixto', ESCENARIOS.orden)).block).toBeNull()
    expect(resolveTrainingDay(contexto('entrenador', { plan: PLAN })).block).toBeNull()
  })

  it('un plan fuera de su ventana de 28 días no da bloque: el que empieza mañana, ni el de hace 28', () => {
    for (const startDay of [DIA + 1, DIA - 28]) {
      const dia = resolveTrainingDay(contexto('mixto', { plan: { ...PLAN, startDay } }))
      expect(dia.source).toBe('entrenador')
      expect(dia.block).toBeNull()
    }
  })

  it('el bloque lleva el foco y la intensidad del plan, y `normal` si no la tiene', () => {
    const conFoco = { ...PLAN, focusAttr: 'MON', intensity: 'fuerte' } as const
    expect(resolveTrainingDay(contexto('mixto', { plan: conFoco }))).toMatchObject(
      blockWeek('especifico', 'escalada', DIA, 'MON', 'fuerte'),
    )
    expect(resolveTrainingDay(contexto('mixto', { plan: PLAN }))).toMatchObject(
      blockWeek('especifico', 'escalada', DIA, null, 'normal'),
    )
  })

  it('el entrenador decide con su contexto: enfermo, descanso total', () => {
    const enfermo = { ...COACH, health: 'enfermo' } as const
    const dia = resolveTrainingDay(contexto('entrenador', { coach: enfermo }))
    expect(dia).toMatchObject({ source: 'entrenador', session: 'descanso_total' })
  })
})
