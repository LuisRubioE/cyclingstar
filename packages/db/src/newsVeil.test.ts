import type { NewsPayload } from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type Horizon, type VeiledStage, stageGameDay, worldHorizon } from './horizon.js'
import {
  type NewsItem,
  emitNews,
  getGlobalNews,
  getRiderNews,
  getStageNews,
  getTeamNews,
  stageReadyItem,
} from './news.js'
import { news, raceRosters } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { type TestWorld, seedTestWorld } from './timelineTestWorld.js'

/**
 * LAS NOTICIAS BAJO EL VELO (docs/retransmision.md §11.7 y §11.19; D-45, I-39; decisiones 11-g y 17-x;
 * E2, paso 8a), sobre PGlite. El filtro F de las tres lecturas del feed: fuera las noticias de las
 * etapas que el espectador tiene en el velo y, en su lugar, UN `stage_ready` por etapa velada, se
 * escribiera sobre ella una noticia o cinco, delante de las de su día. El feed de un equipo lleva un
 * marcador por etapa velada de cada carrera en cuya lista de salida está, tenga noticias o no. Y los
 * dos titulares de líder solo salen con `leaderNews`, que las rutas pasan cuando el velo aplica a quien
 * pide, y entonces con el filtro como los demás.
 *
 * Las noticias se escriben con `emitNews`, la escritura del tick, sin correr etapas: el filtro no mira
 * qué dicen, solo su carrera, su etapa y su día de juego.
 */

const KEY = 'race-france:s0'
const france = { raceId: 'race-france', season: 0 } as const
const g = (stageDay: number): number => stageGameDay(KEY, stageDay)

describe('las noticias bajo el velo (§11.7, 11-g, 17-x)', () => {
  let t: TestDb
  let w: TestWorld
  /** El primer equipo da todos los protagonistas; el segundo está en la lista de salida sin noticias; el tercero, fuera. */
  let conNoticias = ''
  let sinNoticias = ''
  let fuera = ''
  let ana = ''
  let bea = ''
  let otra = ''

  const velada: VeiledStage = { raceKey: KEY, stageDay: 3, gameDay: g(3), reason: 'own_rider' }
  const h: Horizon = {
    ...worldHorizon,
    kind: 'viewer',
    userId: '00000000-0000-4000-8000-000000000999',
    rev: '1.1',
    veil: [velada],
  }

  /** Un titular de una etapa de la Race France, como lo escribe el tick. */
  const deEtapa = async (stageDay: number, payload: NewsPayload, personal = false) =>
    emitNews(t.db, {
      worldId: w.worldId,
      gameDay: g(stageDay),
      seed: `veil:${payload.kind}:${stageDay}:${payload.riderId}`,
      payload,
      raceKey: KEY,
      riderId: payload.riderId,
      personal,
    })

  /** Las cinco noticias de la etapa velada en uno de sus dos desenlaces: gana `ganador`. */
  const etapaVelada = async (ganador: string, cae: string) => {
    await deEtapa(3, {
      kind: 'stage_win',
      ...france,
      stageDay: 3,
      riderId: ganador,
      teamId: conNoticias,
    })
    await deEtapa(3, {
      kind: 'gc_lead_taken',
      ...france,
      stageDay: 3,
      riderId: ganador,
      teamId: conNoticias,
    })
    await deEtapa(3, {
      kind: 'jersey_taken',
      ...france,
      stageDay: 3,
      riderId: ganador,
      teamId: conNoticias,
      jersey: 'points',
    })
    await deEtapa(
      3,
      {
        kind: 'abandon',
        ...france,
        stageDay: 3,
        riderId: cae,
        teamId: conNoticias,
        reason: 'lesion',
      },
      true,
    )
    await deEtapa(3, {
      kind: 'injury',
      ...france,
      stageDay: 3,
      riderId: cae,
      teamId: conNoticias,
      days: 6,
      prevHealth: 'sano',
      prevUntilDay: null,
    })
  }
  const borraLaVelada = () =>
    t.db.delete(news).where(and(eq(news.raceKey, KEY), eq(news.stageDay, 3)))

  beforeAll(async () => {
    t = await startTestDb()
    w = await seedTestWorld(t, { worldSeed: 'news-veil', teams: 3, perTeam: 3 })
    ;[conNoticias, sinNoticias, fuera] = w.teamIds as [string, string, string]
    ;[ana, bea, otra] = w.riderIds as [string, string, string]
    // En la lista de salida, los dos primeros equipos; el tercero no corre la Race France.
    await t.db
      .insert(raceRosters)
      .values(w.riderIds.slice(0, 6).map((riderId, i) => ({ raceId: KEY, riderId, bib: i + 1 })))
    // Las etapas 1 y 2, conocidas, con un titular de líder en la 2.
    await deEtapa(1, {
      kind: 'stage_win',
      ...france,
      stageDay: 1,
      riderId: ana,
      teamId: conNoticias,
    })
    await deEtapa(2, {
      kind: 'stage_win',
      ...france,
      stageDay: 2,
      riderId: bea,
      teamId: conNoticias,
    })
    await deEtapa(2, {
      kind: 'gc_lead_taken',
      ...france,
      stageDay: 2,
      riderId: bea,
      teamId: conNoticias,
    })
    await etapaVelada(ana, otra)
    // Un fichaje el mismo día que la velada: no nace de una etapa y se ve siempre.
    await emitNews(t.db, {
      worldId: w.worldId,
      gameDay: g(3),
      seed: 'veil:contract',
      payload: {
        kind: 'contract',
        riderId: otra,
        toTeamId: conNoticias,
        fromTeamId: null,
        relocateCountry: null,
        housingCovered: false,
      },
      riderId: otra,
    })
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  const deLaVelada = (n: NewsItem): boolean =>
    n.raceKey === KEY && n.stageDay === 3 && n.kind !== 'stage_ready'

  it('una etapa velada con cinco noticias da un solo stage_ready, en su sitio: delante de las de su día', async () => {
    const visto = await getGlobalNews(t.db, worldHorizon, w.worldId, 40, { leaderNews: true })
    const velado = await getGlobalNews(t.db, h, w.worldId, 40, { leaderNews: true })
    expect(visto.filter(deLaVelada)).toHaveLength(5)
    expect(velado.filter(deLaVelada)).toEqual([])
    const marcadores = velado.filter((n) => n.kind === 'stage_ready')
    expect(marcadores).toEqual([stageReadyItem(velada)])
    expect(marcadores[0]).toMatchObject({
      kind: 'stage_ready',
      text: 'Stage 3 of Race France is ready to watch',
      personal: false,
      riderId: null,
      teamId: null,
      payload: null,
      seed: null,
      tplRev: null,
      raceId: 'race-france',
      raceKey: KEY,
      stageDay: 3,
      gameDay: g(3),
    })
    // Lo demás, lo de quien sí la ha visto sin las de la velada, en el mismo orden.
    expect(velado.filter((n) => n.kind !== 'stage_ready')).toEqual(
      visto.filter((n) => !deLaVelada(n)),
    )
    // Su sitio: el primero de su día, delante del fichaje del mismo día.
    const i = velado.findIndex((n) => n.kind === 'stage_ready')
    expect(velado.slice(0, i).every((n) => n.gameDay > g(3))).toBe(true)
    expect(velado[i + 1]).toMatchObject({ kind: 'contract', gameDay: g(3) })
  })

  it('17-x: sin leaderNews no salen los titulares de líder; con él salen los de lo conocido, y los de la velada caen con el filtro', async () => {
    const lider = (ns: readonly NewsItem[]) =>
      ns.filter((n) => n.kind === 'gc_lead_taken' || n.kind === 'jersey_taken')
    expect(lider(await getGlobalNews(t.db, h, w.worldId, 40))).toEqual([])
    expect(lider(await getGlobalNews(t.db, worldHorizon, w.worldId, 40))).toEqual([])
    const conLider = lider(await getGlobalNews(t.db, h, w.worldId, 40, { leaderNews: true }))
    expect(conLider.map((n) => `${n.kind}@${n.stageDay}`)).toEqual(['gc_lead_taken@2'])
    expect(
      lider(await getGlobalNews(t.db, worldHorizon, w.worldId, 40, { leaderNews: true })).length,
    ).toBe(3)
  })

  it('el feed personal: la noticia propia de la etapa velada cae por el mismo filtro, con su marcador', async () => {
    const personal = await getRiderNews(t.db, h, w.worldId, otra, 40, { leaderNews: true })
    expect(personal.filter(deLaVelada)).toEqual([])
    expect(personal.filter((n) => n.kind === 'stage_ready')).toEqual([stageReadyItem(velada)])
    expect(personal.find((n) => n.kind === 'contract')?.personal).toBe(true)
  })

  it('el feed de un equipo: un marcador por etapa velada de cada carrera en cuya lista de salida está, tenga noticias o no (11-g)', async () => {
    const suyo = await getTeamNews(t.db, h, conNoticias, 15, { leaderNews: true })
    expect(suyo.filter(deLaVelada)).toEqual([])
    expect(suyo.filter((n) => n.kind === 'stage_ready')).toEqual([stageReadyItem(velada)])
    expect(suyo.some((n) => n.kind === 'stage_win' && n.stageDay === 1)).toBe(true)
    // En la lista de salida y sin una sola noticia: su marcador, y nada más.
    expect(await getTeamNews(t.db, h, sinNoticias, 15, { leaderNews: true })).toEqual([
      stageReadyItem(velada),
    ])
    // Fuera de la lista de salida: nada, aunque el espectador tenga la etapa velada.
    expect(await getTeamNews(t.db, h, fuera, 15, { leaderNews: true })).toEqual([])
    // Y sin velo, el feed de hoy: sin marcadores.
    expect(await getTeamNews(t.db, worldHorizon, sinNoticias, 15)).toEqual([])
  })

  it('getStageNews: de una etapa velada, ninguna; con el mundo, las suyas (la meta la sirve tras su puerta)', async () => {
    expect(await getStageNews(t.db, h, w.worldId, KEY, 3, { leaderNews: true })).toEqual([])
    expect(
      (await getStageNews(t.db, worldHorizon, w.worldId, KEY, 3, { leaderNews: true })).length,
    ).toBe(5)
  })

  it('dos desenlaces de la etapa velada dan los mismos bytes a quien no la ha visto (B1c del feed, 11-g)', async () => {
    const lee = async (hh: Horizon) =>
      JSON.stringify([
        await getGlobalNews(t.db, hh, w.worldId, 40, { leaderNews: true }),
        await getRiderNews(t.db, hh, w.worldId, otra, 40, { leaderNews: true }),
        await getTeamNews(t.db, hh, conNoticias, 15, { leaderNews: true }),
        await getTeamNews(t.db, hh, sinNoticias, 15, { leaderNews: true }),
      ])
    const [veladoA, vistoA] = [await lee(h), await lee(worldHorizon)]
    // El otro desenlace: gana Bea y nadie se cae (tres noticias en lugar de cinco).
    await borraLaVelada()
    await deEtapa(3, {
      kind: 'stage_win',
      ...france,
      stageDay: 3,
      riderId: bea,
      teamId: conNoticias,
    })
    await deEtapa(3, {
      kind: 'gc_lead_taken',
      ...france,
      stageDay: 3,
      riderId: bea,
      teamId: conNoticias,
    })
    await deEtapa(3, { kind: 'kom', ...france, stageDay: 3, riderId: ana, teamId: conNoticias })
    const [veladoB, vistoB] = [await lee(h), await lee(worldHorizon)]
    expect(veladoB).toBe(veladoA)
    expect(vistoB).not.toBe(vistoA) // no es vacío: quien la ha visto sí recibe otra cosa
    await borraLaVelada()
    await etapaVelada(ana, otra)
  })
})
