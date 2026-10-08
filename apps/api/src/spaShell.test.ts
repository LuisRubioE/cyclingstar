import {
  type Horizon,
  anonHorizon,
  gameState,
  riders,
  teams,
  worldHorizon,
  worlds,
} from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { STAGE_KIND_WORDS, pageTitle } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { SHELL_PATH, injectShellMeta, preStageInfoFor, shellMetaFor } from './spaShell.js'

/**
 * EL FALLBACK DE LA SPA CON SU TÍTULO Y SUS `og:` (E2, docs/retransmision.md §11.8, §11.10 y §14.10;
 * D-36, D-42, DD-12, 11-c, 14-k; paso 9a). La vista previa de un enlace no ejecuta JavaScript: el
 * fallback inyecta en `index.html` el MISMO título que pondrá `usePageTitle`, calculado con `pageTitle`
 * y la misma información de la etapa, y las etiquetas `og:` neutras. El acta lleva además el ganador,
 * marcado `Spoiler`, solo si la etapa está fuera del velo de quien pide la página (DD-12): el robot de
 * vista previa no lleva cookie y su horizonte es `anon`. B1a lo mira con el canario en el mundo de B1
 * (`spoilerCanary.test.ts`); aquí, cada rama sobre un mundo mínimo de PGlite.
 */

const SHELL = [
  '<!doctype html>',
  '<html lang="en">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <title>Cycling Star</title>',
  '  </head>',
  '  <body><div id="root"></div></body>',
  '</html>',
].join('\n')

describe('SHELL_PATH: las páginas que llevan título propio antes del JavaScript', () => {
  it('casa la carrera, la etapa y el acta, también con la ruta vieja de /races (App.tsx)', () => {
    for (const [path, raceId, day, report] of [
      ['/world/races/race-france', 'race-france', undefined, undefined],
      ['/world/races/race-france/', 'race-france', undefined, undefined],
      ['/world/races/race-france/stages/7', 'race-france', '7', undefined],
      ['/world/races/race-france/stages/7/report', 'race-france', '7', '/report'],
      ['/races/race-sanremo/stages/1', 'race-sanremo', '1', undefined],
    ] as const) {
      const m = SHELL_PATH.exec(path)
      expect(m, path).not.toBeNull()
      expect([m![1], m![2], m![3]], path).toEqual([raceId, day, report])
    }
  })

  it('no casa nada más: ni la lista, ni otra pestaña de la carrera, ni la API', () => {
    for (const path of [
      '/',
      '/world/races',
      '/world/races/race-france/startlist',
      '/world/races/Race_France',
      '/world/races/race-france/stages/123',
      '/world/races/race-france/stages/7/radio',
      '/api/races/race-france/stages/7',
    ])
      expect(SHELL_PATH.exec(path), path).toBeNull()
  })
})

describe('injectShellMeta: el título y las og:, escapados', () => {
  const meta = {
    title: 'Stage 7 · Race France · Cycling Star',
    ogTitle: 'Stage 7 · Race France · Watch the race',
    ogDescription: '187 km · mountain stage',
  }

  it('cambia el primer <title> y pone las og: antes de </head>', () => {
    const html = injectShellMeta(SHELL, meta)
    expect(html).toContain('<title>Stage 7 · Race France · Cycling Star</title>')
    expect(html).not.toContain('<title>Cycling Star</title>')
    expect(html).toContain(
      '<meta property="og:title" content="Stage 7 · Race France · Watch the race" />',
    )
    expect(html).toContain('<meta property="og:description" content="187 km · mountain stage" />')
    expect(html.indexOf('og:description')).toBeLessThan(html.indexOf('</head>'))
    expect(html.match(/<title>/g)).toHaveLength(1)
  })

  it('escapa &, <, >, " y \' en el título y en las og:', () => {
    const html = injectShellMeta(SHELL, {
      title: `A & B <i>"x"</i> 'y'`,
      ogTitle: `"><script>alert(1)</script>`,
      ogDescription: `Spoiler · Winner: O'Brien & <b>`,
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<i>')
    expect(html).toContain('<title>A &amp; B &lt;i&gt;&quot;x&quot;&lt;/i&gt; &#39;y&#39;</title>')
    expect(html).toContain('content="Spoiler · Winner: O&#39;Brien &amp; &lt;b&gt;"')
  })

  it('un index.html sin <title> lo gana delante de </head>', () => {
    const html = injectShellMeta('<html><head></head><body></body></html>', meta)
    expect(html).toContain('<title>Stage 7 · Race France · Cycling Star</title>')
    expect(html.indexOf('<title>')).toBeLessThan(html.indexOf('</head>'))
  })
})

const RACE_ID = 'race-france'
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
const ONE_DAY = SEASON_CALENDAR.find((r) => r.stages.length === 1)!
const KEY = `${RACE_ID}:s0`
const RUN_DAY = 2
const NEXT_DAY = 3
const WINNER = 'Canary Wyner'
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const url = (path: string): URL => new URL(path, 'http://localhost')

describe('shellMetaFor y el fallback de la SPA, sobre un mundo mínimo (§14.10)', () => {
  let t: TestDb
  const poolBefore = process.env.DB_POOL_MAX

  /** Un espectador con la etapa corrida en su velo, como lo da `computeHorizon`. */
  const veiled: Horizon = {
    ...worldHorizon,
    kind: 'viewer',
    userId: idDe(900),
    readOnly: false,
    rev: '9.1',
    veil: [{ raceKey: KEY, stageDay: RUN_DAY, gameDay: 9, reason: 'headline' }],
  }

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'spa-shell', engineVersion: 1 })
      .returning({ id: worlds.id })
    const worldId = w!.id
    await t.db
      .insert(gameState)
      .values({ worldId, currentDay: RACE.startDay + 2, lastProcessedDay: RACE.startDay + 2 })
    await t.db.insert(teams).values({
      id: idDe(100),
      worldId,
      name: 'Team Canary',
      division: 'WT' as const,
      philosophy: 'general' as const,
      jerseySeed: 'j0',
      country: 'ES',
    })
    await t.db.insert(riders).values(
      [WINNER, 'Second Rider'].map((name, i) => ({
        id: idDe(i),
        worldId,
        teamId: idDe(100),
        name,
        country: 'ES',
        gender: 'M' as const,
        birthSeason: -25,
        archetype: 'fondo' as const,
        faceSeed: `f${i}`,
        ctl: 60,
        atl: 40,
      })),
    )
    // la etapa 2 corrida: solo su hoja, que es lo que lee el acta para su ganador
    await t.client`insert into stage_results (race_id, stage_day, rider_id, puesto, tiempo_s) values (${KEY}, ${RUN_DAY}, ${idDe(0)}, 1, 15000), (${KEY}, ${RUN_DAY}, ${idDe(1)}, 2, 15012)`
  }, 120_000)
  afterAll(async () => {
    await t?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('preStageInfoFor: la de la ruta de etapa (la carrera del calendario, la edición del mundo)', async () => {
    const p = await preStageInfoFor(t.db, RACE_ID, 7, undefined)
    const stage = RACE.stages.find((s) => s.index === 7)!
    expect(p).toMatchObject({
      raceName: RACE.name,
      season: 0,
      stageDay: 7,
      stageCount: RACE.stages.length,
      stageKind: stage.kind,
    })
    expect(p!.km).toBeGreaterThan(0)
    expect(await preStageInfoFor(t.db, RACE_ID, RACE.stages.length + 1, undefined)).toBeNull()
    expect(await preStageInfoFor(t.db, 'race-nowhere', 1, undefined)).toBeNull()
  })

  it('la ficha de carrera titula con la información de su etapa 1, como la web (11-c)', async () => {
    const meta = await shellMetaFor(t.db, anonHorizon(), url(`/world/races/${RACE_ID}`))
    const p1 = await preStageInfoFor(t.db, RACE_ID, 1, undefined)
    expect(meta).toEqual({
      title: pageTitle('en', p1, 'race'),
      ogTitle: `${RACE.name} · Cycling Star`,
      ogDescription: `${RACE.stages.length} stages`,
    })
    expect(meta!.title).toBe(`${RACE.name} · Cycling Star`)
    const oneDay = await shellMetaFor(t.db, anonHorizon(), url(`/world/races/${ONE_DAY.id}`))
    expect(oneDay!.ogDescription).toBe(STAGE_KIND_WORDS.clasica)
  })

  it('la etapa: el título de Watch y la descripción neutra, sea quien sea', async () => {
    const p = await preStageInfoFor(t.db, RACE_ID, RUN_DAY, undefined)
    for (const h of [anonHorizon(), veiled, worldHorizon]) {
      const meta = await shellMetaFor(t.db, h, url(`/world/races/${RACE_ID}/stages/${RUN_DAY}`))
      expect(meta).toEqual({
        title: `Stage ${RUN_DAY} · ${RACE.name} · Cycling Star`,
        ogTitle: `Stage ${RUN_DAY} · ${RACE.name} · Watch the race`,
        ogDescription: `${Math.round(p!.km)} km · ${STAGE_KIND_WORDS[p!.stageKind]}`,
      })
    }
  })

  it('el acta lleva el ganador, marcado Spoiler, solo fuera del velo de quien pide (DD-12, 14-k)', async () => {
    const report = url(`/world/races/${RACE_ID}/stages/${RUN_DAY}/report`)
    const p = await preStageInfoFor(t.db, RACE_ID, RUN_DAY, undefined)
    const neutral = `${Math.round(p!.km)} km · ${STAGE_KIND_WORDS[p!.stageKind]}`
    const robot = await shellMetaFor(t.db, anonHorizon(), report)
    expect(robot).toEqual({
      title: `Stage ${RUN_DAY} report · ${RACE.name} · Cycling Star`,
      ogTitle: `Stage ${RUN_DAY} report · ${RACE.name} · Cycling Star`,
      ogDescription: `Spoiler · Winner: ${WINNER} · ${neutral}`,
    })
    const player = await shellMetaFor(t.db, veiled, report)
    expect(player!.ogDescription).toBe(neutral)
    expect(JSON.stringify(player)).not.toContain(WINNER)
    // la siguiente, con la 2 en el velo, tiene su puerta `previous_unseen`: tampoco lleva a nadie
    const next = await shellMetaFor(
      t.db,
      veiled,
      url(`/world/races/${RACE_ID}/stages/${NEXT_DAY}/report`),
    )
    expect(JSON.stringify(next)).not.toContain(WINNER)
  })

  it('el acta de una etapa sin correr no tiene ganador que contar', async () => {
    const meta = await shellMetaFor(
      t.db,
      anonHorizon(),
      url(`/world/races/${RACE_ID}/stages/${NEXT_DAY}/report`),
    )
    expect(meta!.ogDescription).not.toContain('Winner')
  })

  it('lo que no es una carrera o una etapa del calendario no tiene meta: index.html tal cual', async () => {
    for (const path of [
      '/world/races/race-nowhere',
      `/world/races/${RACE_ID}/stages/${RACE.stages.length + 1}`,
      '/world/teams',
    ])
      expect(await shellMetaFor(t.db, anonHorizon(), url(path)), path).toBeNull()
  })

  it('el manejador de 404 sirve el HTML inyectado, privado y por cookie; el resto, como hoy', async () => {
    const app = buildApp({
      db: t.db,
      serveWeb: true,
      webIndexHtml: SHELL,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
    })
    try {
      const res = await app.inject({ method: 'GET', url: `/world/races/${RACE_ID}/stages/7` })
      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toContain('text/html')
      expect(res.headers['cache-control']).toBe('private, no-store')
      expect(String(res.headers.vary)).toContain('Cookie')
      expect(res.body).toContain(`<title>Stage 7 · ${RACE.name} · Cycling Star</title>`)
      expect(res.body).toContain('og:description')
      // el acta, sin sesión: el robot de vista previa
      const report = await app.inject({
        method: 'GET',
        url: `/world/races/${RACE_ID}/stages/${RUN_DAY}/report`,
      })
      expect(report.body).toContain(`Spoiler · Winner: ${WINNER}`)
      // la API sigue siendo un 404 en JSON
      const api = await app.inject({ method: 'GET', url: '/api/no-such-route' })
      expect(api.statusCode).toBe(404)
      expect(api.json()).toEqual({ ok: false, error: 'no_encontrado' })
    } finally {
      await app.close()
    }
  })
})
