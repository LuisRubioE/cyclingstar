import { ATTRIBUTES, type Attribute, birthSeasonForAge } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getAttrTrend, getBlockReport, getCoachView } from './riders.js'
import {
  riderAttrLog,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  teams,
  worlds,
} from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * LA FICHA DEL CORREDOR (paso 10 del rediseño de entrenamiento, docs/entrenamiento.md §2.3 y §4.6).
 *
 * Lo que hay que probar de estas tres consultas no es que devuelvan filas: es la PROMESA que las
 * justifica. Ninguna puede dejar salir un oculto, la ventana tiene que ser de verdad 28 días —si
 * arrastra los 60 que guarda la tabla, la flecha se vuelve historia y no tendencia—, y el informe
 * tiene que separar lo que se entrenó de lo que se aprendió corriendo.
 */

const SEASON = 5
const HOY = SEASON * 364 + 200

const attrs = (v: number): Record<Attribute, number> =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Record<Attribute, number>

describe('db: la ficha del corredor', () => {
  let t: TestDb
  let worldId: string
  let riderId: string
  let teamId: string

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-ficha', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = w!.id
    const [eq1] = await t.db
      .insert(teams)
      .values({
        worldId,
        name: 'Equipo con Gimnasio',
        country: 'ES',
        division: 'WT' as const,
        jerseySeed: 'j1',
        philosophy: 'equilibrado' as const,
        facilities: 1.18,
        staffLevel: 3,
      })
      .returning({ id: teams.id })
    teamId = eq1!.id

    const [r] = await t.db
      .insert(riders)
      .values({
        worldId,
        teamId,
        name: 'Ficha Completa',
        country: 'ES',
        gender: 'M' as const,
        archetype: 'escalada' as const,
        birthSeason: birthSeasonForAge(21, SEASON),
        faceSeed: 'cara',
      })
      .returning({ id: riders.id })
    riderId = r!.id

    await t.db
      .insert(riderAttrs)
      .values(ATTRIBUTES.map((attr) => ({ riderId, attr, value: attr === 'MON' ? 72 : 55 })))
    await t.db.insert(riderHidden).values({
      riderId,
      talent: 80,
      fragility: 1.5,
      peakAge: 28,
      declineAge: 33,
      ceilings: attrs(90),
    })

    // Dos días DENTRO de la ventana de 28 y uno FUERA, para que la ventana se pueda comprobar.
    await t.db.insert(riderAttrLog).values([
      { riderId, gameDay: HOY - 3, attr: 'MON' as const, delta: 0.9, source: 'entrenamiento' },
      { riderId, gameDay: HOY - 3, attr: 'MON' as const, delta: 1.1, source: 'carrera' },
      { riderId, gameDay: HOY - 10, attr: 'TAC' as const, delta: -0.5, source: 'entrenamiento' },
      { riderId, gameDay: HOY - 40, attr: 'MON' as const, delta: 9, source: 'entrenamiento' },
    ])
    await t.db.insert(riderDailyLog).values([
      {
        riderId,
        gameDay: HOY - 3,
        tss: 90,
        ctl: 50,
        atl: 55,
        tsb: -5,
        activity: 'carrera',
      },
      { riderId, gameDay: HOY - 4, tss: 70, ctl: 50, atl: 52, tsb: -2, activity: 'puertos' },
      { riderId, gameDay: HOY - 5, tss: 70, ctl: 50, atl: 52, tsb: -2, activity: 'puertos' },
      { riderId, gameDay: HOY - 40, tss: 70, ctl: 50, atl: 52, tsb: -2, activity: 'fondo' },
    ])
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('la flecha suma los 28 días y NO los 60 que guarda la tabla', async () => {
    const trend = await getAttrTrend(t.db, riderId, HOY)
    const mon = trend.find((x) => x.attr === 'MON')!
    // 0,9 + 1,1 dentro de la ventana. Los 9 puntos del día −40 no cuentan: si contaran, la flecha
    // diría «↑» de un corredor que lleva un mes parado.
    expect(mon.delta28).toBeCloseTo(2, 6)
  })

  it('un atributo que no se movió sale con cero, no con un hueco', async () => {
    // Importa para la UI: `→` se pinta con el cero. Un hueco obligaría a decidir fuera qué hacer.
    const trend = await getAttrTrend(t.db, riderId, HOY)
    expect(trend.length).toBe(ATTRIBUTES.length)
    expect(trend.find((x) => x.attr === 'SPR')!.delta28).toBe(0)
  })

  it('lo que baja también se cuenta: la flecha no es solo para las buenas noticias', async () => {
    const trend = await getAttrTrend(t.db, riderId, HOY)
    expect(trend.find((x) => x.attr === 'TAC')!.delta28).toBeCloseTo(-0.5, 6)
  })

  it('LA OPINIÓN DEL ENTRENADOR NO DEJA SALIR UN SOLO NÚMERO', async () => {
    const vista = (await getCoachView(t.db, riderId, 'semilla-ficha', HOY))!
    // Ésta es la prueba que de verdad importa: el JSON entero, serializado, no puede contener ni el
    // techo (90), ni el talento (80), ni la fragilidad (1,5).
    const texto = JSON.stringify(vista)
    expect(texto).not.toContain('90')
    expect(texto).not.toContain('80')
    expect(texto).not.toContain('1.5')
    expect(vista.ceilings.length).toBe(ATTRIBUTES.length)
    for (const c of vista.ceilings) expect(['tres', 'cuatro', 'cinco']).toContain(c.opinion)
  })

  it('es estable dentro de la temporada y puede cambiar al año siguiente', async () => {
    const a = await getCoachView(t.db, riderId, 'semilla-ficha', HOY)
    const b = await getCoachView(t.db, riderId, 'semilla-ficha', HOY + 5)
    // Mismo año, misma opinión: sin guardar nada, porque la semilla lleva la temporada dentro.
    expect(JSON.stringify(a!.ceilings)).toBe(JSON.stringify(b!.ceilings))
    const siguiente = await getCoachView(t.db, riderId, 'semilla-ficha', HOY + 364)
    expect(siguiente!.season).toBe(a!.season + 1)
  })

  it('las frases salen de los ocultos: este chaval tiene talento y es frágil', async () => {
    const vista = (await getCoachView(t.db, riderId, 'semilla-ficha', HOY))!
    expect(vista.notes).toContain('progresa_rapido') // talento 80, 21 años
    expect(vista.notes).toContain('fragil') // fragilidad 1,5
    expect(vista.notes).not.toContain('declive') // 21 años, `declineAge` 33
    expect(vista.declining).toBe(false)
  })

  it('el gimnasio del equipo llega como una palabra, no como un multiplicador', async () => {
    const vista = (await getCoachView(t.db, riderId, 'semilla-ficha', HOY))!
    expect(vista.facilities).toBe('alto') // 1,18 sobre un rango de 0,90..1,20
  })

  it('EL INFORME SEPARA LO QUE ENTRENÓ DE LO QUE APRENDIÓ CORRIENDO', async () => {
    const informe = await getBlockReport(t.db, riderId, HOY)
    const mon = informe.rows.find((r) => r.attr === 'MON')!
    expect(mon.total).toBeCloseTo(2, 6)
    const porOrigen = Object.fromEntries(mon.bySource.map((s) => [s.source, s.delta]))
    // Es la respuesta a «¿por qué mejoré?»: 1,1 de correr y 0,9 de entrenar, no «+2 y arréglatelas».
    expect(porOrigen.carrera).toBeCloseTo(1.1, 5)
    expect(porOrigen.entrenamiento).toBeCloseTo(0.9, 5)
  })

  it('cuenta los días de carrera aparte de los de entrenamiento', async () => {
    const informe = await getBlockReport(t.db, riderId, HOY)
    expect(informe.raceDays).toBe(1)
    expect(informe.trainingDays).toBe(2) // dos `puertos`; el `fondo` del día −40 queda fuera
    expect(informe.sessions.find((s) => s.activity === 'puertos')!.days).toBe(2)
  })

  it('y tampoco el informe enseña el VALOR del atributo, solo cuánto se movió', async () => {
    const informe = await getBlockReport(t.db, riderId, HOY)
    // MON vale 72 en la base. Si el 72 apareciera, el informe sería una forma de leer la ficha.
    expect(JSON.stringify(informe)).not.toContain('72')
  })

  it('un corredor recién nacido no revienta: informe vacío y frase honesta', async () => {
    const [r] = await t.db
      .insert(riders)
      .values({
        worldId,
        name: 'Sin Historia',
        country: 'ES',
        gender: 'M' as const,
        archetype: 'gregario' as const,
        birthSeason: birthSeasonForAge(19, SEASON),
        faceSeed: 'cara2',
      })
      .returning({ id: riders.id })
    await t.db
      .insert(riderAttrs)
      .values(ATTRIBUTES.map((attr) => ({ riderId: r!.id, attr, value: 30 })))
    await t.db.insert(riderHidden).values({
      riderId: r!.id,
      talent: 40,
      fragility: 1,
      peakAge: 28,
      declineAge: 33,
      ceilings: attrs(70),
    })
    const informe = await getBlockReport(t.db, r!.id, HOY)
    expect(informe.rows).toEqual([])
    expect(informe.trainingDays).toBe(0)
    const vista = (await getCoachView(t.db, r!.id, 'semilla-ficha', HOY))!
    // Sin equipo no hay gimnasio que contar, y eso es `null` y no «normal»: son cosas distintas.
    expect(vista.facilities).toBeNull()
    const trend = await getAttrTrend(t.db, r!.id, HOY)
    expect(trend.every((x) => x.delta28 === 0)).toBe(true)
  })
})
