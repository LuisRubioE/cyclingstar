import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getRiderTravelDays, outboundTravelDays, returnTravelDays } from './riderSchedule.js'
import { raceRosters, riders, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * El viaje de IDA (#30). El modelo de viajes siempre cobró el desplazamiento en dinero Y en días,
 * pero los días solo se aplicaban a la VUELTA: `travel_until_day` se escribe al terminar la carrera.
 * La víspera de correr en otro continente el corredor entrenaba con normalidad, y el planificador se
 * lo enseñaba como un día de trabajo más. Aquí se sella el cálculo de los días de ida, que es puro.
 */
describe('viaje de ida: qué días se pierden antes de la salida', () => {
  it('en casa no se viaja: se duerme en casa y se sale por la mañana', () => {
    expect(outboundTravelDays(100, 'ES', 'ES')).toEqual([])
    // Y sin distinguir mayúsculas, que es como llegan la residencia y el país de la carrera.
    expect(outboundTravelDays(100, 'es', 'ES')).toEqual([])
  })

  it('dentro del continente cuesta el día anterior', () => {
    expect(outboundTravelDays(100, 'ES', 'FR')).toEqual([99])
  })

  it('intercontinental cuesta los DOS días anteriores', () => {
    expect(outboundTravelDays(100, 'ES', 'CO')).toEqual([98, 99])
  })

  it('sin residencia conocida se asume lo peor (intercontinental), nunca gratis', () => {
    expect(outboundTravelDays(100, null, 'CO')).toEqual([98, 99])
  })

  it('los días son los ANTERIORES a la salida: el día de la carrera nunca se cuenta como viaje', () => {
    for (const to of ['ES', 'FR', 'CO']) {
      expect(outboundTravelDays(100, 'ES', to)).not.toContain(100)
    }
  })
})

/**
 * El viaje de VUELTA (docs/agenda.md §4.19). El modelo ya lo cobraba (`travel_until_day` y el tick de
 * entrenamiento), pero el plan solo enseñaba la IDA: el jugador veía un día de viaje antes de la
 * carrera y ninguno después. La vuelta es el espejo de la ida y se predice igual de bien, porque el
 * último día de carrera y el país se conocen de antemano.
 */
describe('viaje de vuelta: qué días se pierden después de la última etapa', () => {
  it('es el espejo de la ida: los k días POSTERIORES al último día, con la misma k', () => {
    expect(returnTravelDays(100, 'ES', 'ES')).toEqual([])
    expect(returnTravelDays(100, 'ES', 'FR')).toEqual([101])
    expect(returnTravelDays(100, 'ES', 'CO')).toEqual([101, 102])
    for (const to of ['ES', 'FR', 'CO']) {
      expect(returnTravelDays(100, 'ES', to)).toHaveLength(outboundTravelDays(100, 'ES', to).length)
      // El último día de carrera se corre, no se viaja.
      expect(returnTravelDays(100, 'ES', to)).not.toContain(100)
    }
  })
})

/**
 * Lo mismo contra Postgres real (PGlite), por la función que alimenta el plan y las órdenes.
 * Carreras de la temporada 0: `race-besseges` (FR, días 35-39), `race-colombia` (CO, 34-42),
 * `race-tachira` (VE, 9-18) y `race-down-under` (AU, 20-24).
 */
describe('db: el plan ve el viaje entero, ida y vuelta', () => {
  let t: TestDb
  const ids: Record<
    'continental' | 'intercontinental' | 'local' | 'movido' | 'encadenado',
    string
  > = { continental: '', intercontinental: '', local: '', movido: '', encadenado: '' }

  beforeAll(async () => {
    t = await startTestDb()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-vuelta', engineVersion: 1 })
      .returning({ id: worlds.id })
    const alta = async (
      tag: keyof typeof ids,
      residence: string,
      travelUntilDay: number | null,
    ): Promise<string> => {
      const [r] = await t.db
        .insert(riders)
        .values({
          worldId: world!.id,
          name: `Corredor ${tag}`,
          country: 'ES',
          residence,
          gender: 'M',
          birthSeason: -6,
          archetype: 'fondo',
          faceSeed: `cara-${tag}`,
          travelUntilDay,
        })
        .returning({ id: riders.id })
      return r!.id
    }
    ids.continental = await alta('continental', 'ES', null)
    ids.intercontinental = await alta('intercontinental', 'ES', null)
    ids.local = await alta('local', 'FR', null)
    // Vivía en España cuando se le convocó (la vuelta real quedó escrita: día 40) y ahora reside en
    // Francia: la previsión diría «en casa», pero lo que ya está escrito manda.
    ids.movido = await alta('movido', 'FR', 40)
    ids.encadenado = await alta('encadenado', 'ES', null)
    await t.db.insert(raceRosters).values([
      { raceId: 'race-besseges:s0', riderId: ids.continental },
      { raceId: 'race-colombia:s0', riderId: ids.intercontinental },
      { raceId: 'race-besseges:s0', riderId: ids.local },
      { raceId: 'race-besseges:s0', riderId: ids.movido },
      { raceId: 'race-tachira:s0', riderId: ids.encadenado },
      { raceId: 'race-down-under:s0', riderId: ids.encadenado },
    ])
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  const plan = async (riderId: string, from = 0, to = 60) =>
    (await getRiderTravelDays(t.db, riderId, from, to)).map((d) => [d.gameDay, d.direction])

  it('continental: un día de viaje ANTES de la salida y otro DESPUÉS de la última etapa', async () => {
    expect(await plan(ids.continental)).toEqual([
      [34, 'out'],
      [40, 'back'],
    ])
  })

  it('intercontinental: dos antes y dos después', async () => {
    expect(await plan(ids.intercontinental)).toEqual([
      [32, 'out'],
      [33, 'out'],
      [43, 'back'],
      [44, 'back'],
    ])
  })

  it('en casa no hay viaje ni de ida ni de vuelta', async () => {
    expect(await plan(ids.local)).toEqual([])
  })

  it('la vuelta REAL (`travel_until_day`) manda sobre la prevista', async () => {
    expect(await plan(ids.movido)).toEqual([[40, 'back']])
  })

  it('la vuelta lleva la carrera de la que se vuelve, para que el plan diga de dónde', async () => {
    const [ida, vuelta] = await getRiderTravelDays(t.db, ids.continental, 0, 60)
    expect(ida).toMatchObject({ raceKey: 'race-besseges:s0', direction: 'out', country: 'FR' })
    expect(vuelta).toMatchObject({ raceKey: 'race-besseges:s0', direction: 'back', country: 'FR' })
  })

  it('respeta la ventana pedida: la vuelta fuera del horizonte no sale', async () => {
    expect(await plan(ids.intercontinental, 30, 43)).toEqual([
      [32, 'out'],
      [33, 'out'],
      [43, 'back'],
    ])
  })

  it('carreras encadenadas: sin días repetidos, la ida gana a la vuelta y la carrera a las dos', async () => {
    // Táchira acaba el 18 (vuelta prevista 19-20) y Down Under sale el 20 (ida prevista 18-19). El 18
    // y el 20 son días de carrera; el 19 es a la vez vuelta y ida, y sale una sola vez, como ida.
    const dias = await getRiderTravelDays(t.db, ids.encadenado, 0, 30)
    expect(dias.map((d) => [d.gameDay, d.direction, d.raceKey])).toEqual([
      [7, 'out', 'race-tachira:s0'],
      [8, 'out', 'race-tachira:s0'],
      [19, 'out', 'race-down-under:s0'],
      [25, 'back', 'race-down-under:s0'],
      [26, 'back', 'race-down-under:s0'],
    ])
  })
})
