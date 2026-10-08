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
import { type AppDeps, buildApp } from './app.js'
import {
  SHELL_PATH,
  STAGE_PAGE_SRC,
  type ViteManifest,
  injectShellMeta,
  injectShellPreloads,
  preStageInfoFor,
  shellMetaFor,
  stagePageModules,
  stagePagePreloads,
} from './spaShell.js'

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

/**
 * LA PÁGINA DE ETAPA PRECARGA CON EL HTML (E2, paso 10b, los arreglos; docs/retransmision.md §18.5,
 * D-56: la primera pintura de `Watch` en ≤ 2 s con «Fast 4G» y la CPU a ×4). En una carga en frío la
 * página de etapa era una cadena: la web, sus ficheros, `/health`, el horizonte, la ficha, la cabecera.
 * El fallback, que ya sabe que es una etapa, pone en su HTML lo que la página va a pedir de todos modos:
 * sus ficheros JS (del manifiesto de Vite) y, con `Watch` encendido para quien pide, el horizonte (con el
 * velo), la ficha y la cabecera, con las URL exactas que pide la web. Así salen con el HTML, a la vez que
 * el resto, en lugar de uno detrás de otro. Con `Watch` apagado para quien pide, nada: el HTML de siempre.
 */
describe('stagePageModules: los ficheros de la página de etapa, del manifiesto de Vite', () => {
  /** Un manifiesto como el de `vite build --manifest`: claves de fuente o de trozo, `imports` estáticos. */
  const manifest: ViteManifest = {
    'index.html': { file: 'assets/index-a.js', imports: ['_react-b.js', '_query-c.js'] },
    '_react-b.js': { file: 'assets/react-b.js' },
    '_query-c.js': { file: 'assets/query-c.js', imports: ['_react-b.js'] },
    [STAGE_PAGE_SRC]: {
      file: 'assets/StageReplay-d.js',
      imports: ['index.html', '_react-b.js', 'src/pages/StageWatch.tsx', '_Flag-e.js'],
    },
    'src/pages/StageWatch.tsx': {
      file: 'assets/StageWatch-f.js',
      imports: ['_Flag-e.js', '_g.js'],
    },
    '_Flag-e.js': { file: 'assets/Flag-e.js', imports: ['_query-c.js'] },
    '_g.js': { file: 'assets/g.js' },
    'src/pages/Home.tsx': { file: 'assets/Home-h.js', imports: ['_Flag-e.js'] },
  }

  it('el cierre de la página por sus importaciones estáticas, sin lo que ya carga el índice, en su orden', () => {
    expect(stagePageModules(manifest)).toEqual([
      '/assets/StageReplay-d.js',
      '/assets/StageWatch-f.js',
      '/assets/Flag-e.js',
      '/assets/g.js',
    ])
  })

  it('sin la página en el manifiesto (otra web, o sin compilar), nada', () => {
    expect(stagePageModules({ 'index.html': { file: 'assets/index-a.js' } })).toEqual([])
    expect(stagePageModules({})).toEqual([])
  })
})

describe('stagePagePreloads: lo que la página de etapa precarga con el HTML', () => {
  const MODULES = ['/assets/StageReplay-d.js', '/assets/StageWatch-f.js']
  const on = (watch: boolean, veil: boolean) => ({
    watch: () => Promise.resolve(watch),
    veil: () => Promise.resolve(veil),
  })
  const never = {
    watch: (): Promise<boolean> => {
      throw new Error('fuera de la página de etapa no se pregunta por quien pide')
    },
    veil: (): Promise<boolean> => {
      throw new Error('fuera de la página de etapa no se pregunta por quien pide')
    },
  }

  it('con Watch y el velo para quien pide: el horizonte, la ficha, la cabecera y los ficheros', async () => {
    expect(
      await stagePagePreloads(url('/world/races/race-france/stages/7'), on(true, true), MODULES),
    ).toEqual({
      fetches: [
        '/api/me/horizon',
        '/api/races/race-france/stages/7',
        '/api/races/race-france/stages/7/broadcast',
      ],
      modules: MODULES,
    })
  })

  it('sin el velo para quien pide, sin el horizonte: la web no lo pide', async () => {
    const p = await stagePagePreloads(url('/races/race-france/stages/07'), on(true, false), MODULES)
    expect(p.fetches).toEqual([
      '/api/races/race-france/stages/7',
      '/api/races/race-france/stages/7/broadcast',
    ])
    expect(p.modules).toEqual(MODULES)
  })

  it('sin Watch para quien pide, nada: el HTML de siempre', async () => {
    for (const veil of [true, false])
      expect(
        await stagePagePreloads(url('/world/races/race-france/stages/7'), on(false, veil), MODULES),
      ).toEqual({ fetches: [], modules: [] })
  })

  it('en el modo diagnóstico, los ficheros y ninguna petición (la web las pide con ?diag=1)', async () => {
    expect(
      await stagePagePreloads(
        url('/world/races/race-france/stages/7?diag=1'),
        on(true, true),
        MODULES,
      ),
    ).toEqual({ fetches: [], modules: MODULES })
  })

  it('la ficha de carrera, el acta y lo que no es una etapa: nada, sin preguntar por quien pide', async () => {
    for (const path of [
      '/world/races/race-france',
      '/world/races/race-france/stages/7/report',
      '/world/teams',
    ])
      expect(await stagePagePreloads(url(path), never, MODULES), path).toEqual({
        fetches: [],
        modules: [],
      })
  })
})

describe('injectShellPreloads: las precargas, delante de </head>', () => {
  it('las peticiones como fetch anónimo (el fetch de la web es same-origin) y los ficheros como módulos', () => {
    const html = injectShellPreloads(SHELL, {
      fetches: ['/api/me/horizon'],
      modules: ['/assets/StageReplay-d.js'],
    })
    expect(html).toContain(
      '<link rel="preload" href="/api/me/horizon" as="fetch" crossorigin="anonymous" />',
    )
    expect(html).toContain(
      '<link rel="modulepreload" crossorigin href="/assets/StageReplay-d.js" />',
    )
    expect(html.indexOf('modulepreload')).toBeLessThan(html.indexOf('</head>'))
    // las peticiones antes que los ficheros: llegan antes de que la página las pida
    expect(html.indexOf('/api/me/horizon')).toBeLessThan(html.indexOf('modulepreload'))
  })

  it('sin nada que precargar, el HTML tal cual; y las URL, escapadas', () => {
    expect(injectShellPreloads(SHELL, { fetches: [], modules: [] })).toBe(SHELL)
    const html = injectShellPreloads(SHELL, { fetches: ['/a?b=1&c="2"'], modules: [] })
    expect(html).toContain('href="/a?b=1&amp;c=&quot;2&quot;"')
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
/** El horizonte de quien pide, como lo pasa `app.ts` (`() => request.horizon()`). */
const of = (h: Horizon) => (): Promise<Horizon> => Promise.resolve(h)
/** Fuera del acta el fallback no pide el horizonte: pedirlo resolvería la sesión de balde. */
const noHorizon = (): Promise<Horizon> => {
  throw new Error('el horizonte solo se pide para el acta')
}

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
    const meta = await shellMetaFor(t.db, noHorizon, url(`/world/races/${RACE_ID}`))
    const p1 = await preStageInfoFor(t.db, RACE_ID, 1, undefined)
    expect(meta).toEqual({
      title: pageTitle('en', p1, 'race'),
      ogTitle: `${RACE.name} · Cycling Star`,
      ogDescription: `${RACE.stages.length} stages`,
    })
    expect(meta!.title).toBe(`${RACE.name} · Cycling Star`)
    const oneDay = await shellMetaFor(t.db, noHorizon, url(`/world/races/${ONE_DAY.id}`))
    expect(oneDay!.ogDescription).toBe(STAGE_KIND_WORDS.clasica)
  })

  it('la etapa: el título de Watch y la descripción neutra, sea quien sea (no pide el horizonte)', async () => {
    const p = await preStageInfoFor(t.db, RACE_ID, RUN_DAY, undefined)
    const stage = url(`/world/races/${RACE_ID}/stages/${RUN_DAY}`)
    expect(await shellMetaFor(t.db, noHorizon, stage)).toEqual({
      title: `Stage ${RUN_DAY} · ${RACE.name} · Cycling Star`,
      ogTitle: `Stage ${RUN_DAY} · ${RACE.name} · Watch the race`,
      ogDescription: `${Math.round(p!.km)} km · ${STAGE_KIND_WORDS[p!.stageKind]}`,
    })
  })

  it('pide el horizonte de quien pide solo para el acta, y una vez', async () => {
    let asked = 0
    const counting = (): Promise<Horizon> => {
      asked += 1
      return Promise.resolve(veiled)
    }
    for (const path of [
      `/world/races/${RACE_ID}`,
      `/world/races/${RACE_ID}/stages/${RUN_DAY}`,
      '/world/races/race-nowhere/stages/2/report',
      '/world/teams',
      '/account',
    ])
      await shellMetaFor(t.db, counting, url(path))
    expect(asked).toBe(0)
    await shellMetaFor(t.db, counting, url(`/world/races/${RACE_ID}/stages/${RUN_DAY}/report`))
    expect(asked).toBe(1)
  })

  it('el acta lleva el ganador, marcado Spoiler, solo fuera del velo de quien pide (DD-12, 14-k)', async () => {
    const report = url(`/world/races/${RACE_ID}/stages/${RUN_DAY}/report`)
    const p = await preStageInfoFor(t.db, RACE_ID, RUN_DAY, undefined)
    const neutral = `${Math.round(p!.km)} km · ${STAGE_KIND_WORDS[p!.stageKind]}`
    const robot = await shellMetaFor(t.db, of(anonHorizon()), report)
    expect(robot).toEqual({
      title: `Stage ${RUN_DAY} report · ${RACE.name} · Cycling Star`,
      ogTitle: `Stage ${RUN_DAY} report · ${RACE.name} · Cycling Star`,
      ogDescription: `Spoiler · Winner: ${WINNER} · ${neutral}`,
    })
    const player = await shellMetaFor(t.db, of(veiled), report)
    expect(player!.ogDescription).toBe(neutral)
    expect(JSON.stringify(player)).not.toContain(WINNER)
    // la siguiente, con la 2 en el velo, tiene su puerta `previous_unseen`: tampoco lleva a nadie
    const next = await shellMetaFor(
      t.db,
      of(veiled),
      url(`/world/races/${RACE_ID}/stages/${NEXT_DAY}/report`),
    )
    expect(JSON.stringify(next)).not.toContain(WINNER)
  })

  it('el acta de una etapa sin correr no tiene ganador que contar', async () => {
    const meta = await shellMetaFor(
      t.db,
      of(anonHorizon()),
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
      expect(await shellMetaFor(t.db, noHorizon, url(path)), path).toBeNull()
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

  it('la página de etapa precarga con Watch encendido para quien pide; con off o admins sin serlo, nada', async () => {
    const manifest: ViteManifest = {
      'index.html': { file: 'assets/index-a.js', imports: ['_react-b.js'] },
      '_react-b.js': { file: 'assets/react-b.js' },
      [STAGE_PAGE_SRC]: { file: 'assets/StageReplay-d.js', imports: ['index.html', '_Flag-e.js'] },
      '_Flag-e.js': { file: 'assets/Flag-e.js', imports: ['_react-b.js'] },
    }
    // la sesión, del encabezado `x-test-user` (como routes/broadcast.test.ts): el jugador no es administrador
    const auth = {
      api: {
        getSession: async ({ headers }: { headers: Headers }) => {
          const id = headers.get('x-test-user')
          return id ? { user: { id } } : null
        },
      },
      handler: async () => new Response('{}', { status: 200 }),
    } as unknown as NonNullable<AppDeps['auth']>
    const stage = `/world/races/${RACE_ID}/stages/7`
    const at = async (
      broadcastWatch: 'off' | 'admins' | 'on',
      spoilerMode: 'off' | 'admins' | 'on',
    ): Promise<string> => {
      const app = buildApp({
        db: t.db,
        auth,
        serveWeb: true,
        webIndexHtml: SHELL,
        webManifest: manifest,
        migrationsApplied: true,
        tickIntervalMinutes: 360,
        switches: { broadcastWatch, spoilerMode },
      })
      try {
        const res = await app.inject({
          method: 'GET',
          url: stage,
          headers: { 'x-test-user': idDe(900) },
        })
        expect(res.statusCode).toBe(200)
        return res.body
      } finally {
        await app.close()
      }
    }
    const on = await at('on', 'on')
    for (const href of [
      '/api/me/horizon',
      `/api/races/${RACE_ID}/stages/7`,
      `/api/races/${RACE_ID}/stages/7/broadcast`,
    ])
      expect(on).toContain(
        `<link rel="preload" href="${href}" as="fetch" crossorigin="anonymous" />`,
      )
    expect(on).toContain('<link rel="modulepreload" crossorigin href="/assets/StageReplay-d.js" />')
    expect(on).toContain('<link rel="modulepreload" crossorigin href="/assets/Flag-e.js" />')
    expect(on).not.toContain('/assets/react-b.js')
    // con el velo apagado, sin el horizonte
    expect(await at('on', 'off')).not.toContain('/api/me/horizon')
    // Watch apagado, o en admins para un jugador: el HTML de siempre, con su título
    for (const html of [await at('off', 'on'), await at('admins', 'on')]) {
      expect(html).not.toContain('rel="preload"')
      expect(html).not.toContain('modulepreload')
      expect(html).toContain(`<title>Stage 7 · ${RACE.name} · Cycling Star</title>`)
    }
  })
})
