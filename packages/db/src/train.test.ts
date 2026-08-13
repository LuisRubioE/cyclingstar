import { ATTRIBUTES } from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  raceRosters,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  teams,
  trainingOrders,
  worlds,
} from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { trainWorldDay } from './train.js'

/**
 * El día de VIAJE contra Postgres real (PGlite).
 *
 * Un corredor que vuelve de una carrera lejana entraba en el `skip` de `trainWorldDay` y salía por
 * `continue`, así que no llegaba a pasar por `simulateRiderDay`: su CTL/ATL se quedaban CONGELADOS
 * (viajar no descansaba nada) y no se escribía fila en `rider_daily_log`. Las dos consecuencias las
 * vio el dueño: "hice descanso activo y no mejoró mi frescura" (la sesión elegida ni se ejecutaba) y
 * un gráfico de forma que caía en vertical, porque cosía dos puntos con días de agujero en medio.
 *
 * Y el viaje de IDA (#30), que directamente no existía: solo se marcaba la VUELTA (`travel_until_day`
 * se escribe cuando la carrera termina), así que la víspera de correr en otro país el corredor
 * entrenaba con normalidad. La ida se DEDUCE de la convocatoria y de dónde reside el corredor: la
 * carrera de abajo sale el día 101 en Holanda, de modo que el día 100 el español está de camino y el
 * holandés, que la corre en casa, entrena como cualquier otro día.
 */

const GAME_DAY = 100
/** `race-braakman` sale el día 101 de la temporada 0, en NL: un día de viaje para quien no vive allí. */
const RACE_KEY = 'race-braakman:s0'

interface Seeded {
  worldId: string
  travelling: string
  resting: string
  racing: string
  /** Convocado a la carrera de mañana en el extranjero: hoy vuela. */
  flyingOut: string
  /** Convocado a la MISMA carrera, pero vive en el país: no viaja, entrena. */
  localToRace: string
}

async function seedWorld(t: TestDb): Promise<Seeded> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-viaje', engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = world!.id
  const [team] = await t.db
    .insert(teams)
    .values({
      worldId,
      name: 'Equipo de pruebas',
      division: 'WT',
      philosophy: 'general',
      jerseySeed: 'j0',
      country: 'ES',
    })
    .returning({ id: teams.id })

  // Los tres llegan al día con la MISMA carga (fatiga alta, como tras una tanda de carreras), para
  // que lo único que los distinga sea lo que hacen hoy.
  const inserted = await t.db
    .insert(riders)
    .values(
      ['viajero', 'descansa', 'corre', 'vuela', 'local'].map((tag, i) => ({
        worldId,
        teamId: team!.id,
        name: `Corredor ${tag}`,
        country: 'ES',
        // El «local» vive en el país de la carrera de mañana: para él no hay viaje.
        residence: tag === 'local' ? ('NL' as const) : ('ES' as const),
        gender: 'M' as const,
        birthSeason: -6, // 26 años el día 100: fuera de la zona de decaimiento por edad
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
        ctl: 60,
        atl: 130,
        // El viajero aún no ha llegado a casa hoy; los demás no vuelven de ninguna carrera.
        travelUntilDay: tag === 'viajero' ? GAME_DAY : null,
      })),
    )
    .returning({ id: riders.id })
  const [travelling, resting, racing, flyingOut, localToRace] = inserted.map((r) => r.id) as [
    string,
    string,
    string,
    string,
    string,
  ]
  const all = [travelling, resting, racing, flyingOut, localToRace]

  // Los dos convocados a la carrera de mañana. Lo único que los distingue es dónde viven.
  await t.db
    .insert(raceRosters)
    .values([flyingOut, localToRace].map((riderId) => ({ raceId: RACE_KEY, riderId })))

  await t.db
    .insert(riderAttrs)
    .values(all.flatMap((id) => ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 }))))
  await t.db.insert(riderHidden).values(
    all.map((id) => ({
      riderId: id,
      talent: 1,
      // Fragilidad 0 para que la tirada de enfermedad no ensucie la medición de la carga.
      ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])),
      fragility: 0,
      peakAge: 28,
      declineAge: 33,
    })),
  )
  // Órdenes explícitas: el que descansa hace descanso TOTAL (TSS 0). Así la comparación con el
  // viaje (TSS 15) tiene un sentido definido y no depende del plan que toque al entrenador ese día.
  await t.db.insert(trainingOrders).values([
    { riderId: travelling, gameDay: GAME_DAY, session: 'puertos', intensity: 'fuerte' },
    { riderId: resting, gameDay: GAME_DAY, session: 'descanso_total', intensity: 'normal' },
    // Los dos convocados piden lo MISMO para hoy: si acaban distinto, es por el viaje y por nada más.
    { riderId: flyingOut, gameDay: GAME_DAY, session: 'umbral', intensity: 'normal' },
    { riderId: localToRace, gameDay: GAME_DAY, session: 'umbral', intensity: 'normal' },
  ])
  return { worldId, travelling, resting, racing, flyingOut, localToRace }
}

describe('db: el día de viaje cuenta como día vivido, no como día congelado', () => {
  let t: TestDb
  let s: Seeded

  beforeAll(async () => {
    t = await startTestDb()
    s = await seedWorld(t)
    // `skip` trae a quien YA ha corrido hoy: la carrera fue su carga y `stageRun` escribe su diario.
    await t.db.transaction((tx) =>
      trainWorldDay(tx, s.worldId, GAME_DAY, 'semilla-viaje', new Set([s.racing])),
    )
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  const logOf = async (riderId: string) =>
    (
      await t.db
        .select()
        .from(riderDailyLog)
        .where(and(eq(riderDailyLog.riderId, riderId), eq(riderDailyLog.gameDay, GAME_DAY)))
    )[0]

  const riderOf = async (riderId: string) =>
    (await t.db.select().from(riders).where(eq(riders.id, riderId)))[0]!

  it('el viajero deja fila en el diario, con el viaje como actividad', async () => {
    const log = await logOf(s.travelling)
    expect(log).toBeDefined()
    expect(log!.activity).toBe('viaje')
    // Sin esta fila el gráfico de forma une dos puntos separados por días y la caída sale vertical.
  })

  it('el viajero SÍ recupera: su fatiga baja, aunque menos que la del que descansa', async () => {
    const travelled = await riderOf(s.travelling)
    const rested = await riderOf(s.resting)
    // Antes el ATL se quedaba clavado en 130: `applyDailyLoad` no se llegaba a ejecutar.
    expect(travelled.atl).toBeLessThan(130)
    // El viaje cuesta más que el descanso total, así que recupera algo menos: el viaje no es un día
    // libre. Y fíjate en la orden que dejó el viajero: `puertos/fuerte` (TSS 140). El viaje MANDA
    // sobre la orden —no se entrenan puertos en un aeropuerto—, así que su fatiga BAJA en vez de
    // dispararse, que es lo que pasaría si se le aplicase la sesión que pidió.
    expect(travelled.atl).toBeGreaterThan(rested.atl)
  })

  it('el viaje no da atributos: cuesta el día de trabajo', async () => {
    const log = await logOf(s.travelling)
    const attrs = await t.db.select().from(riderAttrs).where(eq(riderAttrs.riderId, s.travelling))
    expect(log!.tss).toBeGreaterThan(0)
    for (const a of attrs) expect(a.value).toBe(50)
  })

  it('quien ha corrido hoy sigue sin entrenar: su carga la escribe la etapa', async () => {
    expect(await logOf(s.racing)).toBeUndefined()
    expect((await riderOf(s.racing)).atl).toBe(130)
  })

  it('la VÍSPERA de una carrera en el extranjero se vuela: la sesión pedida no se hace', async () => {
    const log = await logOf(s.flyingOut)
    expect(log).toBeDefined()
    // Pidió `umbral`. Está en un aeropuerto: el viaje manda, igual que manda sobre la vuelta.
    expect(log!.activity).toBe('viaje')
  })

  it('quien corre esa misma carrera EN CASA no viaja: entrena lo que pidió', async () => {
    const log = await logOf(s.localToRace)
    expect(log).toBeDefined()
    expect(log!.activity).toBe('umbral')
    // Y nada de esto se guarda en `travel_until_day`: la ida se deduce, no se escribe por adelantado.
    expect((await riderOf(s.flyingOut)).travelUntilDay).toBeNull()
  })
})
