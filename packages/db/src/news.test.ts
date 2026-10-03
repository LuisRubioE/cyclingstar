import { type NewsPayload, TEMPLATE_REV } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { emitNews, getGlobalNews, getRiderNews, getTeamNews, newsNames } from './news.js'
import { news, riders, teams, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * LAS NOTICIAS CON DATOS EN LA BASE (docs/retransmision.md §12.8 y §13.2, D-45; E2, paso 1a), contra
 * PGlite y con la migración 0046 aplicada: `emitNews` guarda los datos del titular, su semilla, la
 * carrera y la etapa, y sigue escribiendo `text` de compatibilidad; las lecturas lo redactan al LEER.
 * Es B4 de las noticias en la base (§16.4): lo leído es lo escrito, fila a fila.
 */

const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const TEAM_A = idDe(101)
const TEAM_B = idDe(102)
const ANA = idDe(1)
const BEA = idDe(2)
const CLARA = idDe(3)

const france = { raceId: 'race-france', season: 0 } as const
const RACE_KEY = 'race-france:s0'

/** Un titular de cada uno de los trece kinds, con su semilla y la clave de quien lo escribe. */
const TRECE: readonly { seed: string; raceKey: string | null; payload: NewsPayload }[] = [
  {
    seed: `win:${RACE_KEY}:200:4`,
    raceKey: RACE_KEY,
    payload: { kind: 'stage_win', ...france, stageDay: 4, riderId: ANA, teamId: TEAM_A },
  },
  {
    seed: `win:${RACE_KEY}:201:5`,
    raceKey: RACE_KEY,
    payload: { kind: 'tt_win', ...france, stageDay: 5, riderId: BEA, teamId: TEAM_B },
  },
  {
    seed: `win:${RACE_KEY}:202:6`,
    raceKey: RACE_KEY,
    payload: { kind: 'breakaway_win', ...france, stageDay: 6, riderId: CLARA, teamId: TEAM_A },
  },
  {
    seed: 'win:race-flanders:s0:90:1',
    raceKey: 'race-flanders:s0',
    payload: {
      kind: 'one_day_win',
      raceId: 'race-flanders',
      season: 0,
      stageDay: 1,
      riderId: ANA,
      teamId: TEAM_A,
    },
  },
  {
    seed: 'win:nc-au-itt:s0:150:1',
    raceKey: 'nc-au-itt:s0',
    payload: {
      kind: 'one_day_tt_win',
      raceId: 'nc-au-itt',
      season: 0,
      stageDay: 1,
      riderId: BEA,
      teamId: null,
    },
  },
  {
    seed: `kom:${RACE_KEY}`,
    raceKey: RACE_KEY,
    payload: { kind: 'kom', ...france, stageDay: 21, riderId: CLARA, teamId: TEAM_A },
  },
  {
    seed: `gc:${RACE_KEY}:217:21`,
    raceKey: RACE_KEY,
    payload: { kind: 'gc_win', ...france, stageDay: 21, riderId: ANA, teamId: TEAM_A },
  },
  {
    seed: `lead:${RACE_KEY}:200:4`,
    raceKey: RACE_KEY,
    payload: { kind: 'gc_lead_taken', ...france, stageDay: 4, riderId: BEA, teamId: TEAM_B },
  },
  {
    seed: `jersey:kom:${RACE_KEY}:200:4`,
    raceKey: RACE_KEY,
    payload: {
      kind: 'jersey_taken',
      ...france,
      stageDay: 4,
      riderId: CLARA,
      teamId: TEAM_A,
      jersey: 'kom',
    },
  },
  {
    seed: 'contract:oferta-1',
    raceKey: null,
    payload: {
      kind: 'contract',
      riderId: BEA,
      toTeamId: TEAM_A,
      fromTeamId: TEAM_B,
      relocateCountry: 'ES',
      housingCovered: true,
    },
  },
  {
    seed: `injury:${RACE_KEY}:203:${ANA}`,
    raceKey: RACE_KEY,
    payload: {
      kind: 'injury',
      ...france,
      stageDay: 7,
      riderId: ANA,
      teamId: TEAM_A,
      days: 16,
      prevHealth: 'molestias',
      prevUntilDay: 205,
    },
  },
  {
    seed: `abandon:${RACE_KEY}:203:${CLARA}`,
    raceKey: RACE_KEY,
    payload: {
      kind: 'abandon',
      ...france,
      stageDay: 7,
      riderId: CLARA,
      teamId: TEAM_A,
      reason: 'fuera_control',
    },
  },
  {
    seed: `semilla-del-mundo:retire:${BEA}`,
    raceKey: null,
    payload: { kind: 'retirement', riderId: BEA, teamId: TEAM_B, age: 37 },
  },
]

describe('db: emitNews guarda los datos y las lecturas redactan al leer', () => {
  let t: TestDb
  let worldId: string

  beforeAll(async () => {
    t = await startTestDb()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-noticias', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = world!.id
    await t.db.insert(teams).values([
      {
        id: TEAM_A,
        worldId,
        name: 'Equipo Alfa',
        division: 'WT',
        philosophy: 'general',
        jerseySeed: 'ja',
        country: 'ES',
      },
      {
        id: TEAM_B,
        worldId,
        name: 'Equipo Beta',
        division: 'WT',
        philosophy: 'general',
        jerseySeed: 'jb',
        country: 'FR',
      },
    ])
    await t.db.insert(riders).values(
      [
        [ANA, 'Ana Ruiz', TEAM_A],
        [BEA, 'Bea Soto', TEAM_B],
        [CLARA, 'Clara Gil', TEAM_A],
      ].map(([id, name, teamId], i) => ({
        id: id!,
        worldId,
        teamId: teamId!,
        name: name!,
        country: 'ES',
        gender: 'F' as const,
        birthSeason: -25,
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
      })),
    )
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  it('emitNews escribe data, seed, race_key, stage_day, tpl_rev y text', async () => {
    const payload: NewsPayload = {
      kind: 'stage_win',
      ...france,
      stageDay: 3,
      riderId: ANA,
      teamId: TEAM_A,
    }
    await emitNews(t.db, {
      worldId,
      gameDay: 199,
      seed: `win:${RACE_KEY}:199:3`,
      raceKey: RACE_KEY,
      riderId: ANA,
      payload,
    })
    const [row] = await t.db.select().from(news).where(eq(news.gameDay, 199))
    expect(row).toMatchObject({
      worldId,
      gameDay: 199,
      scope: 'global',
      riderId: ANA,
      kind: 'stage_win',
      seed: `win:${RACE_KEY}:199:3`,
      data: payload,
      raceKey: RACE_KEY,
      stageDay: 3,
      tplRev: TEMPLATE_REV,
      // La etapa 3 de Race France va de Granollers a Les Angles (`stageCities`).
      text: 'Ana Ruiz wins stage 3 (Granollers → Les Angles) of the Race France.',
    })
    await t.db.delete(news).where(eq(news.gameDay, 199))
  })

  it('B4: leer da el mismo texto que se escribió, fila a fila, en los trece kinds', async () => {
    for (const [i, n] of TRECE.entries()) {
      await emitNews(t.db, {
        worldId,
        gameDay: 300 + i,
        seed: n.seed,
        raceKey: n.raceKey,
        riderId: n.payload.riderId,
        payload: n.payload,
      })
    }
    const filas = await t.db.select().from(news).where(eq(news.worldId, worldId))
    expect(filas).toHaveLength(13)
    const leidas = await getGlobalNews(t.db, worldId, 100, { leaderNews: true })
    expect(leidas).toHaveLength(13)
    for (const fila of filas) {
      const leida = leidas.find((l) => l.gameDay === fila.gameDay)!
      expect(leida.text, fila.kind).toBe(fila.text)
      expect(leida.payload).toEqual(fila.data)
      expect(leida).toMatchObject({
        kind: fila.kind,
        seed: fila.seed,
        tplRev: 0,
        raceKey: fila.raceKey,
        stageDay: fila.stageDay,
        raceId: fila.raceKey === null ? null : fila.raceKey.split(':s')[0],
      })
    }
    // Los dos sin carrera ni etapa, y el abandono entre etapas tampoco tendría etapa.
    const contrato = filas.find((f) => f.kind === 'contract')!
    expect(contrato).toMatchObject({ raceKey: null, stageDay: null })
    expect(contrato.text).toBe(
      'Bea Soto signs for Equipo Alfa, relocating to Spain with housing covered.',
    )
    await t.db.delete(news).where(eq(news.worldId, worldId))
  })

  it('una fila de antes de la 0046 se lee por su text, y una sin text, por sus datos', async () => {
    const vieja = 'Bea Soto signs for Equipo Alfa , relocating to Spain.'
    await t.db.insert(news).values([
      // Antes de la 0046: solo el titular redactado.
      { worldId, gameDay: 400, scope: 'global', riderId: BEA, kind: 'contract', text: vieja },
      // Después de DD-19 (una web después del reinicio): solo los datos.
      {
        worldId,
        gameDay: 401,
        scope: 'global',
        riderId: ANA,
        kind: 'gc_win',
        seed: `gc:${RACE_KEY}:401:21`,
        data: { kind: 'gc_win', ...france, stageDay: 21, riderId: ANA, teamId: TEAM_A },
        raceKey: RACE_KEY,
        stageDay: 21,
        tplRev: 0,
      },
      // Unos datos que no son un NewsPayload, con su texto: se pinta el texto…
      {
        worldId,
        gameDay: 402,
        scope: 'global',
        riderId: CLARA,
        kind: 'stage_win',
        text: 'Clara Gil wins stage 2 of the Race France.',
        seed: 'win:x',
        data: { kind: 'stage_win', rider: 'Clara Gil' } as unknown as NewsPayload,
        raceKey: RACE_KEY,
        stageDay: 2,
        tplRev: 0,
      },
      // …y sin texto, no se pinta.
      {
        worldId,
        gameDay: 403,
        scope: 'global',
        riderId: CLARA,
        kind: 'stage_win',
        seed: 'win:y',
        data: { kind: 'stage_win', rider: 'Clara Gil' } as unknown as NewsPayload,
        raceKey: RACE_KEY,
        stageDay: 3,
        tplRev: 0,
      },
    ])
    const leidas = await getGlobalNews(t.db, worldId)
    expect(leidas.map((l) => l.gameDay)).toEqual([402, 401, 400])
    expect(leidas[2]).toMatchObject({
      text: vieja,
      payload: null,
      seed: null,
      tplRev: null,
      raceId: null,
      raceKey: null,
      stageDay: null,
      riderName: 'Bea Soto',
    })
    expect(leidas[1]).toMatchObject({
      text: 'Ana Ruiz wins the Race France overall.',
      raceId: 'race-france',
      raceKey: RACE_KEY,
      stageDay: 21,
    })
    expect(leidas[0]).toMatchObject({
      text: 'Clara Gil wins stage 2 of the Race France.',
      payload: null,
      raceId: 'race-france',
    })
    await t.db.delete(news).where(eq(news.worldId, worldId))
  })

  it('el orden del día: carrera, etapa de la última a la primera, la prioridad del kind', async () => {
    // Todo el mismo día de juego, escrito en desorden; y la general del día anterior detrás.
    const mismoDia = 500
    const orden: { payload: NewsPayload; raceKey: string | null }[] = [
      {
        raceKey: null,
        payload: { kind: 'retirement', riderId: BEA, teamId: TEAM_B, age: 37 },
      },
      {
        raceKey: RACE_KEY,
        payload: {
          kind: 'injury',
          ...france,
          stageDay: 5,
          riderId: ANA,
          teamId: TEAM_A,
          days: 3,
          prevHealth: 'sano',
          prevUntilDay: null,
        },
      },
      {
        raceKey: RACE_KEY,
        payload: { kind: 'breakaway_win', ...france, stageDay: 4, riderId: CLARA, teamId: TEAM_A },
      },
      {
        raceKey: RACE_KEY,
        payload: {
          kind: 'abandon',
          ...france,
          stageDay: 5,
          riderId: CLARA,
          teamId: TEAM_A,
          reason: 'enfermedad',
        },
      },
      {
        raceKey: null,
        payload: {
          kind: 'contract',
          riderId: ANA,
          toTeamId: TEAM_B,
          fromTeamId: TEAM_A,
          relocateCountry: null,
          housingCovered: false,
        },
      },
      {
        raceKey: RACE_KEY,
        payload: { kind: 'stage_win', ...france, stageDay: 5, riderId: BEA, teamId: TEAM_B },
      },
      {
        raceKey: 'race-flanders:s0',
        payload: {
          kind: 'one_day_win',
          raceId: 'race-flanders',
          season: 0,
          stageDay: 1,
          riderId: ANA,
          teamId: TEAM_A,
        },
      },
      {
        raceKey: RACE_KEY,
        payload: { kind: 'gc_lead_taken', ...france, stageDay: 5, riderId: BEA, teamId: TEAM_B },
      },
    ]
    for (const [i, n] of orden.entries()) {
      await emitNews(t.db, {
        worldId,
        gameDay: mismoDia,
        seed: `orden-${i}`,
        raceKey: n.raceKey,
        riderId: n.payload.riderId,
        payload: n.payload,
      })
    }
    await emitNews(t.db, {
      worldId,
      gameDay: mismoDia - 1,
      seed: 'orden-ayer',
      raceKey: RACE_KEY,
      riderId: ANA,
      payload: { kind: 'gc_win', ...france, stageDay: 21, riderId: ANA, teamId: TEAM_A },
    })
    const kinds = (await getGlobalNews(t.db, worldId, 40, { leaderNews: true })).map((l) => l.kind)
    expect(kinds).toEqual([
      'one_day_win', // race-flanders:s0 va antes que race-france:s0
      'gc_lead_taken', // race-france, etapa 5: quién manda ahora…
      'stage_win', // …la etapa…
      'abandon', // …quién se va…
      'injury', // …y quién se hace daño
      'breakaway_win', // race-france, etapa 4
      'contract', // fuera de carrera, al final del día
      'retirement',
      'gc_win', // el día anterior
    ])
    await t.db.delete(news).where(eq(news.worldId, worldId))
  })

  it('sin opts.leaderNews, ninguna lectura devuelve los dos titulares de líder (17-x)', async () => {
    const lider: NewsPayload = {
      kind: 'gc_lead_taken',
      ...france,
      stageDay: 4,
      riderId: ANA,
      teamId: TEAM_A,
    }
    const maillot: NewsPayload = { ...lider, kind: 'jersey_taken', jersey: 'points' }
    const etapa: NewsPayload = { ...lider, kind: 'stage_win' }
    for (const [i, payload] of [lider, maillot, etapa].entries()) {
      await emitNews(t.db, {
        worldId,
        gameDay: 600,
        seed: `l-${i}`,
        raceKey: RACE_KEY,
        riderId: ANA,
        payload,
      })
    }
    const kinds = (items: { kind: string }[]): string[] => items.map((i) => i.kind).sort()
    expect(kinds(await getGlobalNews(t.db, worldId))).toEqual(['stage_win'])
    expect(kinds(await getTeamNews(t.db, TEAM_A))).toEqual(['stage_win'])
    expect(kinds(await getRiderNews(t.db, worldId, ANA))).toEqual(['stage_win'])
    const todos = ['gc_lead_taken', 'jersey_taken', 'stage_win']
    expect(kinds(await getGlobalNews(t.db, worldId, 40, { leaderNews: true }))).toEqual(todos)
    expect(kinds(await getTeamNews(t.db, TEAM_A, 15, { leaderNews: true }))).toEqual(todos)
    expect(kinds(await getRiderNews(t.db, worldId, ANA, 40, { leaderNews: true }))).toEqual(todos)
    await t.db.delete(news).where(eq(news.worldId, worldId))
  })

  it('news_text_or_data: una fila sin texto ni datos no entra', async () => {
    await expect(
      t.client`insert into news (world_id, game_day, scope, kind) values (${worldId}, 700, 'global', 'stage_win')`,
    ).rejects.toMatchObject({ code: '23514' })
  })
})

/**
 * EL RESOLUTOR DE NOMBRES DE UNA PÁGINA (§12.8): `newsNames` contesta, con la base y el calendario,
 * lo que `renderNews` pide al leer.
 *
 * Hasta el paso 4a de E2 este bloque cotejaba además, kind a kind, el render de `shared` con la
 * función del motor a la que sustituyó (`packages/engine/src/world/news.ts`), en los once kinds de la
 * v91 y con los mismos nombres y la misma ruta: salían iguales carácter a carácter salvo la coma de
 * `contract`. El 4a sacó del motor `renderNews`, `NewsData` y `NewsKind` (decisión 4-p) y el cotejo se
 * fue con ellos; lo que fijaba sigue en los goldens de `packages/shared/src/news.test.ts`.
 */
describe('db: newsNames resuelve lo que el render pide', () => {
  const r = { ...france, riderId: ANA, teamId: TEAM_A }
  const contract: NewsPayload = {
    kind: 'contract',
    riderId: ANA,
    toTeamId: TEAM_A,
    fromTeamId: null,
    relocateCountry: 'ES',
    housingCovered: true,
  }
  const stageWin: NewsPayload = { kind: 'stage_win', ...r, stageDay: 2 }

  it('newsNames resuelve con la base y el calendario lo que el render pide', async () => {
    const t = await startTestDb()
    try {
      const [world] = await t.db
        .insert(worlds)
        .values({ worldSeed: 'semilla-nombres', engineVersion: 1 })
        .returning({ id: worlds.id })
      await t.db.insert(teams).values({
        id: TEAM_A,
        worldId: world!.id,
        name: 'Equipo Alfa',
        division: 'WT',
        philosophy: 'general',
        jerseySeed: 'ja',
        country: 'ES',
      })
      await t.db.insert(riders).values({
        id: ANA,
        worldId: world!.id,
        teamId: TEAM_A,
        name: 'Ana Ruiz',
        country: 'ES',
        gender: 'F',
        birthSeason: -25,
        archetype: 'fondo',
        faceSeed: 'cara',
      })
      const n = await newsNames(t.db, [contract, stageWin])
      expect(n.rider(ANA)).toBe('Ana Ruiz')
      expect(n.team(TEAM_A)).toBe('Equipo Alfa')
      expect(n.race('race-france')).toBe('Race France')
      expect(n.country('ES')).toBe('Spain')
      expect(n.route('race-france', 0, 2)).toBe('Tarragona → Barcelona')
      expect(n.route('race-france', 0, 1)).toBe('Barcelona')
      // Lo que no existe no rompe el titular: un nombre genérico, el id de la carrera, sin ruta.
      expect(n.rider(BEA)).toBe('A rider')
      expect(n.race('race-que-no-existe')).toBe('race-que-no-existe')
      expect(n.route('race-que-no-existe', 0, 1)).toBeNull()
    } finally {
      await t.close()
    }
  }, 120_000)
})
