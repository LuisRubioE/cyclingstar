import { type CalendarRace, legacyCalendar, stagesForSeason } from '@cyclingstar/engine'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { canonico, freezeRaceRoute, getRaceRoute, raceStagesForWorld } from './raceRoutes.js'
import { raceRoutes, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import {
  E1_TRANSICION_DIAS,
  carrerasQueEmpiezanEntre,
  congelarTransicionE1,
} from './transicionE1.js'

/**
 * LA TRANSICIÓN E1 (v88): las carreras cuya etapa 1 cae en los próximos 10 días de juego conservan el
 * recorrido del generador viejo; las demás no empezadas se ven con el nuevo; las congeladas no se
 * tocan; corre una sola vez por mundo.
 */

const SEASON_DAYS = 364
/** Un día de la temporada 1, lejos de los bordes: la ventana no cruza de temporada. */
const DIA = SEASON_DAYS + 100

const VIEJAS = new Map(legacyCalendar().map((r) => [r.id, r]))
const vieja = (id: string): CalendarRace => VIEJAS.get(id)!

/** ¿El generador nuevo da, para esta carrera y temporada, un recorrido distinto del viejo? */
function cambiaConElNuevo(raceId: string, season: number): boolean {
  const nuevas = stagesForSeason(raceId, season)
  return vieja(raceId).stages.some((st, i) => canonico(st.profile) !== canonico(nuevas[i]?.profile))
}

describe('db: transición E1, las carreras de los próximos 10 días conservan el recorrido viejo', () => {
  let t: TestDb

  async function nuevoMundo(e1TransicionHasta: number | null = null): Promise<string> {
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-e1', engineVersion: 1, e1TransicionHasta })
      .returning({ id: worlds.id })
    return w!.id
  }

  async function filasDe(worldId: string): Promise<number> {
    const filas = await t.db
      .select({ k: raceRoutes.raceKey })
      .from(raceRoutes)
      .where(eq(raceRoutes.worldId, worldId))
    return filas.length
  }

  beforeAll(async () => {
    t = await startTestDb()
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('(a) una carrera que empieza dentro de 10 GD queda congelada con el perfil viejo, (c) una ya congelada no se toca y (d) la segunda llamada no hace nada', async () => {
    const worldId = await nuevoMundo()
    const ventana = carrerasQueEmpiezanEntre(DIA, DIA + E1_TRANSICION_DIAS)
    const cambian = ventana.filter(({ race }) => cambiaConElNuevo(race.id, 1))
    // Sin carreras que cambien con el generador nuevo la prueba no probaría nada.
    expect(cambian.length).toBeGreaterThanOrEqual(2)

    // (c) Una carrera de la ventana ya congelada (con el generador nuevo, como la congela el tick).
    const yaCongelada = cambian[0]!
    await freezeRaceRoute(t.db, worldId, yaCongelada.raceKey, yaCongelada.race.id, 1)

    const r = await congelarTransicionE1(t.db, worldId, DIA)
    expect(r).not.toBeNull()
    expect(r!.desde).toBe(DIA)
    expect(r!.hasta).toBe(DIA + E1_TRANSICION_DIAS)
    expect(r!.congeladas).not.toContain(yaCongelada.raceKey)
    expect(r!.congeladas.length).toBe(ventana.length - 1)

    // (a) Todas las de la ventana, salvo la ya congelada, llevan el recorrido viejo entero.
    for (const { raceKey, race } of ventana) {
      if (raceKey === yaCongelada.raceKey) continue
      expect(raceKey.endsWith(':s1')).toBe(true)
      const etapas = await raceStagesForWorld(t.db, worldId, raceKey, race.id, 1)
      const viejas = vieja(race.id).stages
      expect(etapas.length).toBe(viejas.length)
      etapas.forEach((e, i) => {
        const v = viejas[i]!
        expect(canonico(e.profile)).toBe(canonico(v.profile))
        expect(e.kind).toBe(v.kind)
        expect(e.label).toBe(v.label)
        expect(e.timeTrial).toBe(v.timeTrial ?? false)
        expect(e.routeSource).toBe(v.routeSource)
        expect(e.arch).toBeNull()
      })
    }

    // (c) La ya congelada conserva el recorrido con que se congeló, no el viejo.
    const nuevas = stagesForSeason(yaCongelada.race.id, 1)
    for (let i = 1; i <= nuevas.length; i++) {
      const leido = await getRaceRoute(t.db, worldId, yaCongelada.raceKey, i)
      expect(canonico(leido)).toBe(canonico(nuevas[i - 1]!.profile))
    }

    // La marca queda puesta con el día de corte.
    const [w] = await t.db
      .select({ hasta: worlds.e1TransicionHasta })
      .from(worlds)
      .where(eq(worlds.id, worldId))
    expect(w!.hasta).toBe(DIA + E1_TRANSICION_DIAS)

    // (d) La segunda llamada, aunque sea otro día, no hace nada.
    const antes = await filasDe(worldId)
    expect(await congelarTransicionE1(t.db, worldId, DIA + 5)).toBeNull()
    expect(await filasDe(worldId)).toBe(antes)
  })

  it('(b) una carrera que empieza en el día 11 o más no se congela y se lee con el generador nuevo', async () => {
    const worldId = await nuevoMundo()
    await congelarTransicionE1(t.db, worldId, DIA)
    const despues = carrerasQueEmpiezanEntre(DIA + E1_TRANSICION_DIAS + 1, DIA + 40)
    expect(despues.some(({ race }) => cambiaConElNuevo(race.id, 1))).toBe(true)
    for (const { raceKey, race } of despues) {
      expect(await getRaceRoute(t.db, worldId, raceKey, 1)).toBeNull()
      const etapas = await raceStagesForWorld(t.db, worldId, raceKey, race.id, 1)
      const nuevas = stagesForSeason(race.id, 1)
      etapas.forEach((e, i) => expect(canonico(e.profile)).toBe(canonico(nuevas[i]!.profile)))
    }
  })

  it('(e) cruce de temporada: la ventana del final de una temporada congela las carreras de la siguiente con su sufijo', async () => {
    const worldId = await nuevoMundo()
    const dia = SEASON_DAYS - 1 // último día de la temporada 0; la ventana llega al día 9 de la 1
    const ventana = carrerasQueEmpiezanEntre(dia, dia + E1_TRANSICION_DIAS)
    expect(ventana.length).toBeGreaterThan(0)
    for (const { raceKey, race } of ventana) {
      expect(raceKey).toBe(`${race.id}:s1`)
      expect(race.startDay).toBeLessThanOrEqual(dia + E1_TRANSICION_DIAS - SEASON_DAYS)
    }
    const r = await congelarTransicionE1(t.db, worldId, dia)
    expect(r!.congeladas.sort()).toEqual(ventana.map((v) => v.raceKey).sort())
    for (const { raceKey, race } of ventana) {
      const etapas = await raceStagesForWorld(t.db, worldId, raceKey, race.id, 1)
      etapas.forEach((e, i) =>
        expect(canonico(e.profile)).toBe(canonico(vieja(race.id).stages[i]!.profile)),
      )
      // La misma carrera en la temporada 0 (ya corrida o no) no se toca.
      expect(await getRaceRoute(t.db, worldId, `${race.id}:s0`, 1)).toBeNull()
    }
  })

  it('un mundo nacido marcado (génesis v88) no congela nada', async () => {
    const worldId = await nuevoMundo(-1)
    expect(await congelarTransicionE1(t.db, worldId, 0)).toBeNull()
    expect(await filasDe(worldId)).toBe(0)
  })
})
