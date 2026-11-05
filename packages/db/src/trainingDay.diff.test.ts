import { existsSync } from 'node:fs'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  type CoachBlock,
  INTENSITIES,
  type Intensity,
  RIDER_ARCHETYPES,
  SESSIONS,
  SESSION_CATALOG,
  type TrainingChoice,
  type TrainingDaySource,
  type TrainingMode,
  blockWeek,
  coachPlan,
  resolveTrainingDay,
  seasonPosition,
} from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  gameState,
  raceRosters,
  riderDailyLog,
  riders,
  teamTrainingOrders,
  trainingOrders,
  trainingPlans,
} from './schema.js'
import { type TestDb, startTestDb, startTestDbFromDump } from './testDb.js'
import { seedTestWorld } from './timelineTestWorld.js'
import {
  type TrainingDayInputs,
  type TrainingRiderRow,
  readTrainingDayInputs,
  trainingDayContext,
} from './train.js'

/**
 * EL DIFERENCIAL DEL TICK (E3, docs/visual.md §11.4; PR 13a). El tick elige la sesión de cada corredor con
 * `resolveTrainingDay`, y esto sella que elige lo mismo que la cadena que vivía en `train.ts`: copiada aquí
 * tal cual como referencia congelada, se comparan las dos, corredor a corredor y día a día durante 28
 * días, sobre las MISMAS lecturas del tick (`readTrainingDayInputs`), y una sola elección distinta, la
 * sesión o la intensidad, para el PR. Las dos leen el mismo plan ya elegido: cuál se elige lo prueba
 * `planPorBloques.test.ts`.
 *
 * Dos mundos. Uno sembrado aquí, en la suite rápida, con las siete ramas de la cadena en la base: los tres
 * modos, órdenes, planes de equipo, planes por bloques con semanas en `null`, viajes de ida y de vuelta,
 * salud y TSB que hacen descansar al entrenador, y una bitácora que dispara sus guardarraíles. Y el de la
 * prueba del teléfono (`TELEFONO_MUNDO`, en el trabajo `Teléfono`), con sus 3.902 corredores. Ninguno de
 * los dos tiene de todo en todos (el del teléfono, casi nada de lo que escribe un jugador), así que cada
 * día se compara además con cada corredor en cada modo y con una variedad fija de órdenes, planes, planes
 * de equipo y viajes puesta en memoria sobre lo leído: las dos cadenas leen el mismo objeto.
 */

/**
 * LA CADENA DE ANTES, CONGELADA: `packages/db/src/train.ts` l. 195-272 de `58c14da`, tal cual, sobre las
 * lecturas de `readTrainingDayInputs` (el `Set` del viaje es ahora un `Map`, y el plan, el de
 * `start_day` mayor). No se toca: si la precedencia cambia a propósito, cambia el test, con su motivo.
 */
function cadenaCongelada(
  rider: TrainingRiderRow,
  inputs: TrainingDayInputs,
  gameDay: number,
): TrainingChoice {
  // De viaje: la sesión del día es el viaje, gane quien gane la orden.
  if (inputs.travelByRider.has(rider.id)) return { session: 'viaje', intensity: 'normal' }
  const modo = (rider.trainingMode as TrainingMode) ?? 'mixto'
  const order = modo === 'entrenador' ? undefined : inputs.ordersByRider.get(rider.id)
  const teamPlan =
    modo === 'mixto' && rider.teamId ? inputs.teamPlanByTeam.get(rider.teamId) : undefined

  let bloqueDelJugador: TrainingChoice | undefined
  const fila = modo === 'entrenador' ? undefined : inputs.planByRider.get(rider.id)
  if (fila) {
    const semana = Math.floor((gameDay - fila.startDay) / 7)
    const bloque = [fila.block1, fila.block2, fila.block3, fila.block4][semana] as
      CoachBlock | null | undefined
    if (bloque) {
      bloqueDelJugador = blockWeek(
        bloque,
        rider.archetype,
        gameDay,
        (fila.focusAttr as Attribute | null) ?? null,
        (fila.intensity as Intensity | null) ?? 'normal',
      )
    }
  }

  let choice: TrainingChoice = order
    ? { session: order.session, intensity: order.intensity }
    : bloqueDelJugador
      ? bloqueDelJugador
      : teamPlan
        ? { session: teamPlan.session, intensity: teamPlan.intensity }
        : coachPlan({
            gameDay,
            seasonDay: seasonPosition(gameDay).dayOfSeason,
            archetype: rider.archetype,
            tsb: rider.ctl - rider.atl,
            health: rider.health,
            strainDays: rider.strainDays,
            daysToNextRace: null,
            nextRaceIsGoal: false,
            nextRaceStages: 1,
            teamGoalInDays: null,
            daysSinceBlockEnd: null,
            lastBlockDays: 0,
            hardLast7: inputs.fuertesRecientes.get(rider.id) ?? 0,
            yesterday: inputs.ayerPorCorredor.get(rider.id) ?? null,
          })
  if (modo === 'manual' && !order && !bloqueDelJugador) {
    choice = { session: 'descanso_activo', intensity: 'normal' }
  }
  return { session: choice.session, intensity: choice.intensity }
}

const MODOS = ['entrenador', 'mixto', 'manual'] as const satisfies readonly TrainingMode[]
/** Sin `viaje`: ni una orden ni un plan de equipo lo piden. */
const ENTRENABLES = SESSIONS.filter((s) => s !== 'viaje')
const PATRONES: readonly (readonly [
  CoachBlock | null,
  CoachBlock | null,
  CoachBlock | null,
  CoachBlock | null,
])[] = [
  ['base', 'construccion', 'especifico', 'afinado'],
  ['recuperacion', null, 'base', null],
  [null, null, null, null],
  ['especifico', 'especifico', null, 'recuperacion'],
  ['afinado', 'base', 'construccion', null],
]
const INTENSIDAD_DEL_PLAN: readonly (Intensity | null)[] = [null, 'suave', 'normal', 'fuerte']

/** El mismo día con todos los corredores en un modo: cada modo tiene sus ramas. */
const enModo = (inputs: TrainingDayInputs, modo: TrainingMode): TrainingDayInputs => ({
  ...inputs,
  riderRows: inputs.riderRows.map((r) => ({ ...r, trainingMode: modo })),
})

/**
 * Una variedad fija sobre lo leído, por el puesto de cada corredor en la lectura: órdenes, planes con
 * todas sus semanas y semanas en `null`, planes de equipo y viajes de ida y de vuelta. Solo donde lo leído
 * no trae ya uno, para no tapar lo que el mundo tiene.
 */
function conVariedad(inputs: TrainingDayInputs, gameDay: number): TrainingDayInputs {
  const ordersByRider = new Map(inputs.ordersByRider)
  const planByRider = new Map(inputs.planByRider)
  const teamPlanByTeam = new Map(inputs.teamPlanByTeam)
  const travelByRider = new Map(inputs.travelByRider)
  inputs.riderRows.forEach((r, i) => {
    if (i % 5 === 0 && !ordersByRider.has(r.id)) {
      ordersByRider.set(r.id, {
        riderId: r.id,
        gameDay,
        session: ENTRENABLES[i % ENTRENABLES.length]!,
        intensity: INTENSITIES[i % INTENSITIES.length]!,
      })
    }
    if (i % 3 === 1 && !planByRider.has(r.id)) {
      const [block1, block2, block3, block4] = PATRONES[i % PATRONES.length]!
      planByRider.set(r.id, {
        riderId: r.id,
        startDay: gameDay - (i % 28),
        block1,
        block2,
        block3,
        block4,
        focusAttr: i % 2 === 0 ? ATTRIBUTES[i % ATTRIBUTES.length]! : null,
        intensity: INTENSIDAD_DEL_PLAN[i % INTENSIDAD_DEL_PLAN.length]!,
        goalRaceId: null,
      })
    }
    if (r.teamId !== null && i % 7 === 0 && !teamPlanByTeam.has(r.teamId)) {
      teamPlanByTeam.set(r.teamId, {
        teamId: r.teamId,
        gameDay,
        session: ENTRENABLES[(i + 3) % ENTRENABLES.length]!,
        intensity: INTENSITIES[(i + 1) % INTENSITIES.length]!,
      })
    }
    if (i % 17 === 0 && !travelByRider.has(r.id)) {
      travelByRider.set(r.id, { raceKey: 'race-test:s0', direction: i % 2 === 0 ? 'out' : 'back' })
    }
  })
  return { ...inputs, ordersByRider, planByRider, teamPlanByTeam, travelByRider }
}

interface Cuenta {
  comparadas: number
  readonly porOrigen: Map<TrainingDaySource, number>
  readonly diferencias: string[]
}

/** Las dos cadenas sobre lo leído de un día y sus variantes. */
function comparaElDia(inputs: TrainingDayInputs, gameDay: number, cuenta: Cuenta): void {
  const variado = conVariedad(inputs, gameDay)
  const variantes = [
    inputs,
    ...MODOS.map((m) => enModo(inputs, m)),
    variado,
    ...MODOS.map((m) => enModo(variado, m)),
  ]
  for (const v of variantes) {
    for (const rider of v.riderRows) {
      const antes = cadenaCongelada(rider, v, gameDay)
      const ahora = resolveTrainingDay(trainingDayContext(rider, v, gameDay))
      cuenta.comparadas++
      cuenta.porOrigen.set(ahora.source, (cuenta.porOrigen.get(ahora.source) ?? 0) + 1)
      if (ahora.session !== antes.session || ahora.intensity !== antes.intensity) {
        cuenta.diferencias.push(
          `${rider.id}, día ${gameDay}, ${rider.trainingMode}: antes ${antes.session}/${antes.intensity}, ahora ${ahora.session}/${ahora.intensity} (${ahora.source})`,
        )
      }
    }
  }
}

const nuevaCuenta = (): Cuenta => ({ comparadas: 0, porOrigen: new Map(), diferencias: [] })

/** Lo que se espera de 28 días comparados: ninguna diferencia, y las seis ramas del tick recorridas. */
function exigeLaCuenta(cuenta: Cuenta, minimo: number): void {
  expect(cuenta.diferencias.slice(0, 10)).toEqual([])
  expect(cuenta.diferencias).toHaveLength(0)
  expect(cuenta.comparadas).toBeGreaterThanOrEqual(minimo)
  // la carrera no llega al tick: quien corre está en su `skip`
  for (const origen of ['viaje', 'orden', 'bloque', 'equipo', 'entrenador', 'descanso'] as const) {
    expect(cuenta.porOrigen.get(origen) ?? 0, origen).toBeGreaterThan(0)
  }
  expect(cuenta.porOrigen.get('carrera')).toBeUndefined()
}

const RACE = SEASON_CALENDAR.find((r) => r.id === 'race-france')!
/** 28 días: los cuatro antes de la salida (la ida desde España) y los 24 siguientes (la vuelta). */
const DESDE = RACE.startDay - 4
const DIAS = Array.from({ length: 28 }, (_, k) => DESDE + k)

describe('db: el tick elige como la cadena de antes, en un mundo sembrado (§11.4)', () => {
  let t: TestDb
  let worldId: string

  beforeAll(async () => {
    t = await startTestDb()
    const mundo = await seedTestWorld(t, {
      worldSeed: 'diferencial-del-tick',
      teams: 4,
      perTeam: 10,
    })
    worldId = mundo.worldId
    const ids = mundo.riderIds
    // Cada corredor, distinto: el arquetipo, la salud, el TSB y la tensión que hacen al entrenador
    // descansar o seguir; y un modo de los tres.
    for (const [i, id] of ids.entries()) {
      const tsb = [0, 10, -35, -45, -20][i % 5]!
      await t.db
        .update(riders)
        .set({
          archetype: RIDER_ARCHETYPES[i % RIDER_ARCHETYPES.length]!,
          health: (['sano', 'sano', 'molestias', 'sano', 'enfermo', 'sano', 'lesionado'] as const)[
            i % 7
          ]!,
          ctl: 60,
          atl: 60 - tsb,
          strainDays: i % 9 === 0 ? 3 : 0,
          trainingMode: MODOS[i % MODOS.length]!,
        })
        .where(eq(riders.id, id))
    }
    // La mitad, en `race-france`: la ida el día antes de la salida y la vuelta tras la última etapa.
    await t.db
      .insert(raceRosters)
      .values(
        ids.filter((_, i) => i % 2 === 0).map((riderId) => ({ raceId: `${RACE.id}:s0`, riderId })),
      )
    // Órdenes de días sueltos, planes de equipo y un plan por bloques por corredor, separados 28 días
    // o más, para que en ninguna ventana haya dos.
    await t.db.insert(trainingOrders).values(
      DIAS.flatMap((dia, k) =>
        ids
          .filter((_, i) => (i + k) % 4 === 0)
          .map((riderId, i) => ({
            riderId,
            gameDay: dia,
            session: ENTRENABLES[(i + k) % ENTRENABLES.length]!,
            intensity: INTENSITIES[(i + k) % INTENSITIES.length]!,
          })),
      ),
    )
    await t.db.insert(teamTrainingOrders).values(
      DIAS.filter((_, k) => k % 2 === 0).flatMap((dia, k) =>
        mundo.teamIds
          .filter((_, j) => j % 2 === 0)
          .map((teamId, j) => ({
            teamId,
            gameDay: dia,
            session: ENTRENABLES[(j + k + 5) % ENTRENABLES.length]!,
            intensity: INTENSITIES[(j + k) % INTENSITIES.length]!,
          })),
      ),
    )
    await t.db.insert(trainingPlans).values(
      ids
        .filter((_, i) => i % 3 !== 0)
        .map((riderId, i) => {
          const [block1, block2, block3, block4] = PATRONES[i % PATRONES.length]!
          return {
            riderId,
            startDay: DESDE - (i % 20),
            block1,
            block2,
            block3,
            block4,
            focusAttr: i % 2 === 0 ? ATTRIBUTES[i % ATTRIBUTES.length]! : null,
            intensity: INTENSIDAD_DEL_PLAN[i % INTENSIDAD_DEL_PLAN.length]!,
          }
        }),
    )
    // La bitácora: qué hizo cada uno cada día, a veces fuerte, para «ayer» y el guardarraíl de la semana.
    await t.db.insert(riderDailyLog).values(
      Array.from({ length: 28 + 7 }, (_, k) => DESDE - 7 + k).flatMap((dia) =>
        ids.map((riderId, i) => {
          const sesion = ENTRENABLES[(i + dia) % ENTRENABLES.length]!
          const fuerte = (i + dia) % 3 === 0
          const tss = SESSION_CATALOG[sesion].tss[fuerte ? 'fuerte' : 'normal']
          return { riderId, gameDay: dia, tss, ctl: 60, atl: 50, tsb: 10, activity: sesion }
        }),
      ),
    )
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('28 días, los 40 corredores en los tres modos y con la variedad: ninguna elección distinta', async () => {
    const cuenta = nuevaCuenta()
    for (const dia of DIAS) {
      const inputs = await t.db.transaction((tx) =>
        readTrainingDayInputs(tx, worldId, dia, new Set()),
      )
      comparaElDia(inputs, dia, cuenta)
    }
    // 28 días × 40 corredores × 8 variantes
    exigeLaCuenta(cuenta, 28 * 40 * 8)
    // la ida y la vuelta de `race-france` salen de la convocatoria, no de la variedad en memoria
    const inputs = await t.db.transaction((tx) =>
      readTrainingDayInputs(tx, worldId, RACE.startDay - 1, new Set()),
    )
    expect([...inputs.travelByRider.values()].map((v) => v.direction)).toContain('out')
  }, 120_000)
})

/**
 * El mundo de la prueba del teléfono, en el trabajo `Teléfono`: el volcado que deja `build.mjs`, en
 * `TELEFONO_MUNDO`. Los 28 días siguientes a su día, sin correrlos: el diferencial compara elecciones,
 * no entrena (un día de tick cuesta unos 17 s en PGlite).
 */
const MUNDO = process.env.TELEFONO_MUNDO
describe.runIf(MUNDO !== undefined && MUNDO !== '' && existsSync(MUNDO))(
  'db: el tick elige como la cadena de antes, en el mundo de la prueba del teléfono (§11.4)',
  () => {
    let t: TestDb

    beforeAll(async () => {
      t = await startTestDbFromDump(MUNDO!)
    }, 300_000)

    afterAll(async () => {
      await t?.close()
    })

    it('28 días desde el de su día, todos sus corredores: ninguna elección distinta', async () => {
      const [estado] = await t.db.select().from(gameState)
      expect(estado).toBeDefined()
      const cuenta = nuevaCuenta()
      let corredores = 0
      for (let k = 1; k <= 28; k++) {
        const dia = estado!.currentDay + k
        const inputs = await t.db.transaction((tx) =>
          readTrainingDayInputs(tx, estado!.worldId, dia, new Set()),
        )
        corredores = inputs.riderRows.length
        comparaElDia(inputs, dia, cuenta)
      }
      console.log(
        `diferencial del tick, mundo de la prueba: ${corredores} corredores, ${cuenta.comparadas} elecciones comparadas`,
      )
      exigeLaCuenta(cuenta, 28 * 1000 * 8)
    }, 900_000)
  },
)
