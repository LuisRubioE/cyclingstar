import {
  ATTRIBUTES,
  type Attribute,
  CEILING_OPINIONS,
  birthSeasonForAge,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type Horizon,
  type VeilDelta,
  type VeiledStage,
  clearHorizonCaches,
  stageGameDay,
  worldHorizon,
} from './horizon.js'
import {
  type BlockReport,
  type DailyLogRow,
  getAttrTrend,
  getBlockReport,
  getCoachView,
  getDailyLog,
  veilDailyLog,
  veiledRaceDays,
} from './riders.js'
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
    const trend = await getAttrTrend(t.db, worldHorizon, riderId, HOY)
    const mon = trend.find((x) => x.attr === 'MON')!
    // 0,9 + 1,1 dentro de la ventana. Los 9 puntos del día −40 no cuentan: si contaran, la flecha
    // diría «↑» de un corredor que lleva un mes parado.
    expect(mon.delta28).toBeCloseTo(2, 6)
  })

  it('un atributo que no se movió sale con cero, no con un hueco', async () => {
    // Importa para la UI: `→` se pinta con el cero. Un hueco obligaría a decidir fuera qué hacer.
    const trend = await getAttrTrend(t.db, worldHorizon, riderId, HOY)
    expect(trend.length).toBe(ATTRIBUTES.length)
    expect(trend.find((x) => x.attr === 'SPR')!.delta28).toBe(0)
  })

  it('lo que baja también se cuenta: la flecha no es solo para las buenas noticias', async () => {
    const trend = await getAttrTrend(t.db, worldHorizon, riderId, HOY)
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
    for (const c of vista.ceilings) expect(CEILING_OPINIONS).toContain(c.opinion)
    // Y tampoco estrellas (docs/agenda.md §4.20): los códigos de antes eran `tres`, `cuatro` y
    // `cinco`, o sea el techo en estrellas legible en la pestaña de red del navegador.
    expect(texto).not.toMatch(/tres|cuatro|cinco|★|star/i)
  })

  it('la opinión es RELATIVA: dice el mejor sitio del corredor, no a qué nivel llega', async () => {
    const vista = (await getCoachView(t.db, riderId, 'semilla-ficha', HOY))!
    // Sub-23, la lectura aún se forma: arriba, medio y abajo, con reservas.
    const usadas = new Set(vista.ceilings.map((c) => c.opinion))
    for (const o of usadas) expect(['apunta', 'quiza', 'no_parece']).toContain(o)
    expect(vista.ceilings.filter((c) => c.opinion === 'apunta').length).toBe(2)
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
    const informe = await getBlockReport(t.db, worldHorizon, riderId, HOY)
    const mon = informe.rows.find((r) => r.attr === 'MON')!
    expect(mon.total).toBeCloseTo(2, 6)
    const porOrigen = Object.fromEntries(mon.bySource.map((s) => [s.source, s.delta]))
    // Es la respuesta a «¿por qué mejoré?»: 1,1 de correr y 0,9 de entrenar, no «+2 y arréglatelas».
    expect(porOrigen.carrera).toBeCloseTo(1.1, 5)
    expect(porOrigen.entrenamiento).toBeCloseTo(0.9, 5)
  })

  it('cuenta los días de carrera aparte de los de entrenamiento', async () => {
    const informe = await getBlockReport(t.db, worldHorizon, riderId, HOY)
    expect(informe.raceDays).toBe(1)
    expect(informe.trainingDays).toBe(2) // dos `puertos`; el `fondo` del día −40 queda fuera
    expect(informe.sessions.find((s) => s.activity === 'puertos')!.days).toBe(2)
  })

  it('y tampoco el informe enseña el VALOR del atributo, solo cuánto se movió', async () => {
    const informe = await getBlockReport(t.db, worldHorizon, riderId, HOY)
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
    const informe = await getBlockReport(t.db, worldHorizon, r!.id, HOY)
    expect(informe.rows).toEqual([])
    expect(informe.trainingDays).toBe(0)
    const vista = (await getCoachView(t.db, r!.id, 'semilla-ficha', HOY))!
    // Sin equipo no hay gimnasio que contar, y eso es `null` y no «normal»: son cosas distintas.
    expect(vista.facilities).toBeNull()
    const trend = await getAttrTrend(t.db, worldHorizon, r!.id, HOY)
    expect(trend.every((x) => x.delta28 === 0)).toBe(true)
  })
})

/**
 * LA FICHA BAJO EL VELO (docs/retransmision.md §11.13 y §11.19, decisión 11-e; sups. H4 y X1; paso 8b).
 *
 * Un día de carrera velado se enseña como día de carrera, con la clave de su etapa y sin parte, corriera
 * el corredor o no: tras un abandono, los días que quedaban pasan a ser de entrenamiento o de descanso, y
 * enseñarlos delataría el abandono. Lo aprendido en carrera esos días (`carrera` y `sobrecompensacion`)
 * sale de la tendencia y del informe; lo de entrenar se queda, como la carga (DD-08).
 *
 * Con el formato de actividad que escribe el tick (`carrera:<raceId>:e<n>`, `stageRun.ts`) y no con el
 * `carrera` a secas de arriba, que el tick no escribe nunca (§19.7): el velo se prueba sobre lo que hay
 * en producción. Es el ejemplo de §11.13: el jugador conoce el Tour hasta la etapa 11 (día 196 de la
 * temporada), es el día 200 y del 197 al 200 corrieron la 12, la 13, la 14 y la 15, veladas. Dos
 * corredores: uno las corre todas y el otro abandona en la 13 y luego descansa y entrena.
 */
describe('db: la ficha bajo el velo (11-e; 8b)', () => {
  const KEY = `race-france:s${SEASON}`
  /** El día de juego de cada etapa del Tour de la temporada 5 (`stageGameDay`, la cuenta del tick). */
  const g = (stageDay: number): number => stageGameDay(KEY, stageDay)
  const VELADAS = [12, 13, 14, 15] as const
  const veil = (stages: readonly number[]): VeiledStage[] =>
    stages.map((s) => ({ raceKey: KEY, stageDay: s, gameDay: g(s), reason: 'own_rider' }))
  const horizonOf = (userId: string, stages: readonly number[]): Horizon => ({
    ...worldHorizon,
    kind: 'viewer',
    userId,
    readOnly: false,
    rev: `${HOY}.1`,
    knownThrough: new Map([[KEY, Math.min(...stages) - 1]]),
    veil: veil(stages),
  })
  const FIXED = '00000000-0000-4000-8000-'
  const USER_ABANDONA = `${FIXED}000000000901`
  const USER_ACABA = `${FIXED}000000000902`
  const ABANDONA = `${FIXED}000000000011`
  const ACABA = `${FIXED}000000000012`
  let t: TestDb

  /** La actividad de cada día, del 196 al 200, de quien abandona en la 13 y de quien termina. */
  const ACTIVIDAD: Readonly<Record<string, readonly string[]>> = {
    [ABANDONA]: [
      'carrera:race-france:e11',
      'carrera:race-france:e12',
      'carrera:race-france:e13',
      'descanso_activo',
      'fondo',
    ],
    [ACABA]: [11, 12, 13, 14, 15].map((s) => `carrera:race-france:e${s}`),
  }

  beforeAll(async () => {
    t = await startTestDb()
    clearHorizonCaches()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-ficha-velo', engineVersion: 1 })
      .returning({ id: worlds.id })
    for (const [id, email] of [
      [USER_ABANDONA, 'abandona@example.com'],
      [USER_ACABA, 'acaba@example.com'],
    ] as const)
      await t.client`insert into users (id, email, name) values (${id}, ${email}, 'Ficha')`
    for (const [id, userId] of [
      [ABANDONA, USER_ABANDONA],
      [ACABA, USER_ACABA],
    ] as const) {
      await t.db.insert(riders).values({
        id,
        worldId: w!.id,
        userId,
        name: `Corredor ${id.slice(-2)}`,
        country: 'ES',
        gender: 'M' as const,
        archetype: 'escalada' as const,
        birthSeason: birthSeasonForAge(24, SEASON),
        faceSeed: `cara-${id}`,
      })
      await t.client`insert into race_rosters (race_id, rider_id, bib) values (${KEY}, ${id}, 1)`
      // un día de entrenamiento antes del Tour, y los cinco del ejemplo
      await t.client`insert into rider_daily_log (rider_id, game_day, tss, ctl, atl, tsb, activity)
                     values (${id}, ${g(1) - 3}, 60, 50, 50, 0, 'puertos')`
      for (const [i, activity] of ACTIVIDAD[id]!.entries()) {
        const parte = activity.startsWith('carrera:')
          ? JSON.stringify({ kmAlFrente: 10 + i, ataques: i })
          : null
        await t.client`insert into rider_daily_log (rider_id, game_day, tss, ctl, atl, tsb, activity, parte)
                       values (${id}, ${g(11) + i}, ${100 + i}, 55, ${60 + i}, ${-5 - i}, ${activity},
                               ${parte}::jsonb)`
      }
    }
    await t.client`update race_rosters set abandoned_day = ${g(13)}, abandoned_reason = 'colapso'
                   where rider_id = ${ABANDONA}`
    // Lo aprendido: en la 11, conocida; en las veladas, por el puesto (y la sobrecompensación de quien
    // termina); y el entrenamiento del que abandonó, que no depende de la etapa.
    await t.db.insert(riderAttrLog).values([
      { riderId: ABANDONA, gameDay: g(11), attr: 'MON' as const, delta: 0.2, source: 'carrera' },
      { riderId: ABANDONA, gameDay: g(12), attr: 'TAC' as const, delta: 0.5, source: 'carrera' },
      { riderId: ABANDONA, gameDay: g(13), attr: 'TAC' as const, delta: 0.3, source: 'carrera' },
      {
        riderId: ABANDONA,
        gameDay: g(15),
        attr: 'MON' as const,
        delta: 0.1,
        source: 'entrenamiento',
      },
      { riderId: ACABA, gameDay: g(11), attr: 'MON' as const, delta: 0.2, source: 'carrera' },
      ...VELADAS.map((s) => ({
        riderId: ACABA,
        gameDay: g(s),
        attr: 'TAC' as const,
        delta: 0.4,
        source: 'carrera' as const,
      })),
      {
        riderId: ACABA,
        gameDay: g(15),
        attr: 'RES' as const,
        delta: 0.5,
        source: 'sobrecompensacion',
      },
    ])
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('el ejemplo de §11.13 es el de la temporada 5: la 11 el día 196, la 15 el 200, y hoy es el 200', () => {
    expect(VELADAS.map((s) => g(s) - SEASON * 364)).toEqual([197, 198, 199, 200])
    expect(g(11) - SEASON * 364).toBe(196)
    expect(g(15)).toBe(HOY)
  })

  it('veiledRaceDays: los días velados de las carreras de SU lista de salida, con la clave de su etapa', () => {
    const h = horizonOf(USER_ACABA, VELADAS)
    const d: VeilDelta = {
      points: new Map(),
      money: new Map(),
      budget: new Map(),
      palmares: new Set(),
      health: new Map(),
      abandons: new Set(),
      raceDays: new Map([[ACABA, VELADAS.map(g)]]),
    }
    expect([...veiledRaceDays(h, d, ACABA)]).toEqual(
      VELADAS.map((s) => [g(s), `carrera:race-france:e${s}`]),
    )
    // Un corredor que no estaba en la lista de salida no tiene días de carrera velados.
    expect(veiledRaceDays(h, d, ABANDONA).size).toBe(0)
  })

  it('veilDailyLog: la carga se queda; la actividad pasa a la de su etapa y el parte, a null (la tabla de §11.13)', () => {
    const rows: DailyLogRow[] = ACTIVIDAD[ABANDONA]!.map((activity, i) => ({
      gameDay: g(11) + i,
      ctl: 55,
      atl: 60 + i,
      tsb: -5 - i,
      tss: 100 + i,
      activity,
      parte: null,
    }))
    const veiled = new Map(VELADAS.map((s) => [g(s), `carrera:race-france:e${s}`]))
    const served = veilDailyLog(rows, veiled)
    expect(served[0]).toBe(rows[0]) // la 11, conocida: la misma fila
    expect(served.map((r) => r.activity)).toEqual(ACTIVIDAD[ACABA])
    expect(served.map((r) => [r.ctl, r.atl, r.tsb, r.tss])).toEqual(
      rows.map((r) => [r.ctl, r.atl, r.tsb, r.tss]),
    )
    expect(served.slice(1).every((r) => r.parte === null)).toBe(true)
  })

  it('getDailyLog: los días velados, como días de carrera de su etapa y sin parte, abandonara o no (sup. H4)', async () => {
    const abandona = await getDailyLog(t.db, horizonOf(USER_ABANDONA, VELADAS), ABANDONA, 90)
    const acaba = await getDailyLog(t.db, horizonOf(USER_ACABA, VELADAS), ACABA, 90)
    const desde = (rows: readonly DailyLogRow[]) => rows.filter((r) => r.gameDay >= g(11))
    expect(desde(abandona).map((r) => r.activity)).toEqual(ACTIVIDAD[ACABA])
    expect(desde(acaba).map((r) => r.activity)).toEqual(ACTIVIDAD[ACABA])
    for (const rows of [abandona, acaba]) {
      expect(desde(rows)[0]!.parte).not.toBeNull() // la 11, conocida, con su parte
      expect(
        desde(rows)
          .slice(1)
          .every((r) => r.parte === null),
      ).toBe(true)
    }
    // Sin velo, lo de siempre: el descanso y el fondo de quien abandonó.
    const visto = await getDailyLog(t.db, worldHorizon, ABANDONA, 90)
    expect(desde(visto).map((r) => r.activity)).toEqual(ACTIVIDAD[ABANDONA])
  })

  it('getBlockReport y getAttrTrend: sin lo aprendido en carrera los días velados, y las mismas sesiones abandonara o no (sup. X1)', async () => {
    const hAbandona = horizonOf(USER_ABANDONA, VELADAS)
    const hAcaba = horizonOf(USER_ACABA, VELADAS)
    const abandona = await getBlockReport(t.db, hAbandona, ABANDONA, HOY)
    const acaba = await getBlockReport(t.db, hAcaba, ACABA, HOY)
    expect(abandona.sessions).toEqual(acaba.sessions)
    expect(abandona.trainingDays).toBe(acaba.trainingDays)
    expect(abandona.sessions).toContainEqual({ activity: 'carrera:race-france:e14', days: 1 })
    // El informe sigue contando `carrera` a secas, que el tick no escribe: 0 días de carrera (§19.7).
    expect([abandona.raceDays, acaba.raceDays]).toEqual([0, 0])
    const porAttr = (r: BlockReport) =>
      Object.fromEntries(r.rows.map((x) => [x.attr, Number(x.total.toFixed(6))]))
    // Lo aprendido en la 11, conocida, y el entrenamiento se quedan; TAC (por el puesto) y RES (la
    // sobrecompensación) de las veladas, no.
    expect(porAttr(abandona)).toEqual({ MON: 0.3 })
    expect(porAttr(acaba)).toEqual({ MON: 0.2 })
    const trend = async (h: Horizon, riderId: string) =>
      Object.fromEntries(
        (await getAttrTrend(t.db, h, riderId, HOY)).map((x) => [
          x.attr,
          Number(x.delta28.toFixed(6)),
        ]),
      )
    expect(await trend(hAcaba, ACABA)).toMatchObject({ MON: 0.2, TAC: 0, RES: 0 })
    // No es vacío: sin velo sale todo, y conocida la 12, su puesto vuelve a contar.
    expect(await trend(worldHorizon, ACABA)).toMatchObject({ MON: 0.2, TAC: 1.6, RES: 0.5 })
    expect(await trend(horizonOf(USER_ABANDONA, [13, 14, 15]), ABANDONA)).toMatchObject({
      MON: 0.3,
      TAC: 0.5,
    })
    const visto = await getBlockReport(t.db, worldHorizon, ABANDONA, HOY)
    expect(visto.sessions).toContainEqual({ activity: 'descanso_activo', days: 1 })
  })
})
