import { ATTRIBUTES } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getStageNonFinishers, getStageResults } from './results.js'
import { raceRosters, riderAttrs, riders, stageResults, teams, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * LOS DNF NO SALÍAN EN LA CLASIFICACIÓN DE LA ETAPA, contra Postgres real (PGlite).
 *
 * El dueño lo vio dos veces. Primero con nombre y apellidos: «etapa 2, el maillot amarillo lo lleva
 * Jean Vandenbroucke… no sale en el resultado de la etapa, ni hay mención en el journal… parece que
 * se retiró en algún punto, pero **no sé si fue antes de salir o en medio de la etapa**». Y después,
 * en una línea: «los DNF no salen en la clasificación de la etapa».
 *
 * El motor no tenía la culpa: `simulateStage` devuelve a todos con su `estado` (`finish`, `abandon`,
 * `dnf`). Es `stageRun.ts` quien, al guardar, se queda solo con los clasificados. Así que en la hoja
 * de la etapa no faltaban por un fallo de pintado: **no había fila que pintar**.
 *
 * Se prueba contra Postgres y no sobre una función pura a propósito, por la misma razón que el falso
 * líder de `gcMissingStage.test.ts`: lo que falla es una CONSULTA —qué filas hay y cuáles faltan—, y
 * una prueba de una fórmula habría pasado en verde con el defecto dentro.
 */

const KEY = 'race-dnf:s0'
const DAY = 2

interface Sembrado {
  /** Los que acabaron la etapa 2 y están en `stage_results`. */
  acabaron: string[]
  /** Tomó la salida y se bajó de la bici: en la salida, sin fila de resultado. */
  colapso: string
  /** Tomó la salida y cruzó fuera del corte: tampoco tiene fila. */
  fueraControl: string
  /** Se retiró en la etapa 1: NO tomó la salida de la 2, así que no está ni en la lista de salida. */
  seFueAntes: string
  /** Acabó la etapa y además se lesionó: está clasificado y no puede salir como DNF. */
  tocado: string
}

async function sembrar(t: TestDb): Promise<Sembrado> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-dnf', engineVersion: 1 })
    .returning({ id: worlds.id })
  const [team] = await t.db
    .insert(teams)
    .values({
      worldId: world!.id,
      name: 'Equipo de pruebas',
      division: 'WT',
      philosophy: 'general',
      jerseySeed: 'j0',
      country: 'BE',
    })
    .returning({ id: teams.id })

  const tags = ['ganador', 'segundo', 'tocado', 'colapso', 'fuera-control', 'se-fue-antes']
  const insertados = await t.db
    .insert(riders)
    .values(
      tags.map((tag, i) => ({
        worldId: world!.id,
        teamId: team!.id,
        name: `Corredor ${tag}`,
        country: 'BE',
        gender: 'M' as const,
        birthSeason: -6,
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
      })),
    )
    .returning({ id: riders.id })
  const [ganador, segundo, tocado, colapso, fueraControl, seFueAntes] = insertados.map(
    (r) => r.id,
  ) as [string, string, string, string, string, string]
  await t.db
    .insert(riderAttrs)
    .values(
      insertados.flatMap(({ id }) => ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 }))),
    )

  // La etapa 2 la acaban tres: el ganador, el segundo y el que se lesionó llegando.
  await t.db.insert(stageResults).values(
    [ganador, segundo, tocado].map((riderId, i) => ({
      raceId: KEY,
      stageDay: DAY,
      riderId,
      puesto: i + 1,
      tiempoS: 3600 + i,
      bonificacionS: 0,
      puntosVolante: 0,
      puntosMontana: 0,
    })),
  )
  /**
   * El roster, con los motivos tal como los escribe `markAbandons`. Fíjate en `tocado`: se marca
   * como abandono de ESTE mismo día —se lesionó llegando y no tomará la salida mañana— y sin embargo
   * SÍ está clasificado hoy. Es el caso que impide resolver esto por «quién abandonó este día».
   */
  await t.db.insert(raceRosters).values([
    { raceId: KEY, riderId: ganador, bib: 1 },
    { raceId: KEY, riderId: segundo, bib: 2 },
    { raceId: KEY, riderId: tocado, bib: 3, abandonedDay: 12, abandonedReason: 'lesion' },
    { raceId: KEY, riderId: colapso, bib: 4, abandonedDay: 12, abandonedReason: 'colapso' },
    {
      raceId: KEY,
      riderId: fueraControl,
      bib: 5,
      abandonedDay: 12,
      abandonedReason: 'fuera_control',
    },
    { raceId: KEY, riderId: seFueAntes, bib: 6, abandonedDay: 11, abandonedReason: 'colapso' },
  ])
  return {
    acabaron: [ganador, segundo, tocado],
    colapso,
    fueraControl,
    seFueAntes,
    tocado,
  }
}

describe('db: el que no acaba la etapa sigue saliendo en la hoja', () => {
  let t: TestDb
  let s: Sembrado
  /** La lista de salida de la etapa 2, que es la que el motor corrió (snapshot `input.riders`). */
  let salida: string[]

  beforeAll(async () => {
    t = await startTestDb()
    s = await sembrar(t)
    salida = [...s.acabaron, s.colapso, s.fueraControl]
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('sale el que se bajó de la bici, con su motivo', async () => {
    const fuera = await getStageNonFinishers(t.db, KEY, DAY, salida)
    const uno = fuera.find((r) => r.riderId === s.colapso)
    expect(`${uno?.dnf} ${uno?.reason}`).toBe('true colapso')
    // Sin puesto ni tiempo: no está clasificado, y no se le inventa uno.
    expect(`${uno?.puesto} ${uno?.tiempoS}`).toBe('0 0')
  })

  it('…y el que llegó fuera de control, que es otra cosa y se dice distinto', async () => {
    const fuera = await getStageNonFinishers(t.db, KEY, DAY, salida)
    expect(fuera.find((r) => r.riderId === s.fueraControl)?.reason).toBe('fuera_control')
  })

  it('el que acabó la etapa NO sale como DNF aunque se lesionara ese día', async () => {
    /**
     * Es la mitad que impide la corrección fácil y equivocada. `race_rosters` marca a este hombre
     * con `abandonedDay` del día de HOY —se cayó, terminó, y no sale mañana—, así que resolver esto
     * por «quién abandonó este día» lo pintaría como DNF de una etapa que sí acabó, y encima
     * duplicado: una vez en el puesto 3 y otra al final tachado.
     */
    const fuera = await getStageNonFinishers(t.db, KEY, DAY, salida)
    expect(fuera.map((r) => r.riderId)).not.toContain(s.tocado)
    const hoja = await getStageResults(t.db, KEY, DAY)
    expect(hoja.find((r) => r.riderId === s.tocado)?.puesto).toBe(3)
  })

  it('el que se retiró en una etapa ANTERIOR no aparece: no tomó la salida', async () => {
    // La otra pregunta del dueño —«no sé si fue antes de salir o en medio de la etapa»— la contesta
    // la lista de salida: quien no está en ella no salió, y no tiene nada que hacer en esta hoja.
    const fuera = await getStageNonFinishers(t.db, KEY, DAY, salida)
    expect(fuera.map((r) => r.riderId)).not.toContain(s.seFueAntes)
  })

  it('los clasificados siguen saliendo como siempre, y no marcados', async () => {
    const hoja = await getStageResults(t.db, KEY, DAY)
    expect(hoja.map((r) => r.riderId)).toEqual(s.acabaron)
    expect(hoja.every((r) => !r.dnf && r.reason === null)).toBe(true)
  })

  it('una etapa sin abandonos no devuelve a nadie', async () => {
    expect(await getStageNonFinishers(t.db, KEY, DAY, s.acabaron)).toEqual([])
    // …y sin lista de salida tampoco se inventa nada (una etapa antigua, sin snapshot legible).
    expect(await getStageNonFinishers(t.db, KEY, DAY, [])).toEqual([])
  })
})
