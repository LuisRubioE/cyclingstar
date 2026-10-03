#!/usr/bin/env node
/**
 * B6 · LA LÍNEA BASE DEL PESO DE LA RUTA DE ETAPA (docs/retransmision.md §16.4 y §17.3; E2, paso 0).
 *
 * Lo que mide: cuánto pesa HOY `GET /api/races/:raceId/stages/:day` de una etapa corrida, la etapa
 * conocida entera (`StageReplay` con resultado, clasificaciones, acta y radio), tal como sale por la
 * red con `@fastify/compress` puesto: en JSON, con gzip y con brotli. Es la cifra contra la que se
 * comparan el 6a (lo servido por la retransmisión) y el tope `BROADCAST.maxKnownStageGzipBytes`
 * (110 KB con gzip, el máximo medido por el mapa 07 §7 más un 10 %, §15.3), que B6 vigila desde el 6.
 *
 * Cómo: no reconstruye la respuesta a mano. Siembra un mundo de PGlite con el CAMPO DEL BANCO de
 * `scripts/race-radio.mjs` (mismos equipos, vocaciones, genomas, carga y moral, con la semilla
 * `radio-<carrera>-<run>`), bajo ids uuid y con nombres, países y equipos generados como en el mundo
 * de verdad, porque la identidad se repite en cada mención de la radio y pesa; corre las etapas con
 * `runOneStage`, como el tick (recorrido congelado, sitio y fecha de cada etapa), y pide la ruta a
 * `buildApp` con `app.inject`, que pasa por el plugin de verdad (gzip 6 y brotli 4, sus defectos).
 *
 * Las etapas del banco son las 24 del mapa 07 §7: las 21 de `race-france` (dos cronos), `race-flanders`,
 * `race-tramuntana` y `race-colombia` e5, esta con sus cuatro anteriores corridas, para que salga con
 * maillots. Con `--runs 0,1` (por defecto), las dos semillas: 24 × 2.
 *
 * Uso (hacen falta los `dist` de packages/* y de apps/api):
 *   pnpm exec tsc -b
 *   node scripts/bench-stage-size.mjs [--runs 0,1] [--json fichero.json]
 *
 * Sale con código 0 siempre: en el paso 0 es una línea base, no un banco con tope. El tope del 6 se
 * imprime como referencia.
 */
import { writeFileSync } from 'node:fs'
import { ATTRIBUTES, seededRng } from '../packages/shared/dist/index.js'
import {
  ENGINE_VERSION,
  SEASON_CALENDAR,
  generateNpcRider,
  sampleNpcAge,
  stageDayOfSeason,
  stagePlace,
} from '../packages/engine/dist/index.js'
import {
  freezeRaceRoute,
  gameState,
  generateName,
  makeLangTeamName,
  raceRosters,
  raceStagesForWorld,
  riderAttrs,
  riderHidden,
  riders,
  runOneStage,
  teams,
  worlds,
} from '../packages/db/dist/index.js'

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const RUNS = String(opt('runs', '0,1'))
  .split(',')
  .map((s) => Number(s.trim()))
const JSON_OUT = opt('json', null)

/** El tope de B6 para la ruta conocida (§15.3): se imprime como referencia, no se aplica aquí. */
const MAX_KNOWN_STAGE_GZIP_BYTES = 112_640

/** Las 24 etapas del mapa 07 §7; `run` son las que se corren antes, `measure` las que se miden. */
const BENCH = [
  { raceId: 'race-france', run: 21, measure: 'all' },
  { raceId: 'race-flanders', run: 1, measure: [1] },
  { raceId: 'race-tramuntana', run: 1, measure: [1] },
  { raceId: 'race-colombia', run: 5, measure: [5] },
]

// ------------------------------------------------------- el campo del banco (scripts/race-radio.mjs)

const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']
const COUNTRIES = [
  'ES',
  'FR',
  'IT',
  'BE',
  'NL',
  'CO',
  'GB',
  'DE',
  'DK',
  'SI',
  'AU',
  'US',
  'NO',
  'PT',
]

function fieldFor(level) {
  if (level === 'WT') return { teams: 22, per: 8, divisions: ['WT', 'WT', 'WT', 'PRS'] }
  if (level === 'PRS') return { teams: 20, per: 7, divisions: ['PRS', 'PRS', 'CON'] }
  return { teams: 18, per: 7, divisions: ['CON', 'CON', 'CON', 'CON', 'PRS', 'WT'] }
}

/** Ids uuid deterministas, como `idDe` de packages/db/src/stageRun.test.ts. */
const uuidOf = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/**
 * El campo de `scripts/race-radio.mjs` (`buildField`), con el MISMO consumo de su generador: la
 * vocación, la carga y la moral salen de `${worldSeed}:rq-field` en el mismo orden, y el genoma de la
 * semilla del corredor del banco (`rq-<equipo>-<corredor>`). El país sale de otro flujo, para no
 * moverle nada al banco.
 */
function bankField(worldSeed, level, raceIndex) {
  const rng = seededRng(`${worldSeed}:rq-field`)
  const countryRng = seededRng(`${worldSeed}:pais`)
  const { teams: nTeams, per, divisions } = fieldFor(level)
  const usedTeamNames = new Set()
  const teamRows = []
  const riderRows = []
  for (let t = 0; t < nTeams; t++) {
    const division = divisions[t % divisions.length]
    const teamCountry = COUNTRIES[Math.floor(countryRng() * COUNTRIES.length)]
    const teamId = uuidOf(raceIndex * 1_000_000 + 900_000 + t)
    teamRows.push({
      id: teamId,
      division,
      country: teamCountry,
      name: makeLangTeamName(`${worldSeed}:t${t}`, teamCountry, usedTeamNames),
      jerseySeed: `${worldSeed}:j${t}`,
    })
    for (let k = 0; k < per; k++) {
      const bankId = `rq-${t}-${k}`
      const vocation = VOCATIONS[Math.floor(rng() * VOCATIONS.length)]
      const age = sampleNpcAge(`${worldSeed}:${bankId}:age`)
      const genome = generateNpcRider(`${worldSeed}:${bankId}`, { division, vocation, age })
      const country =
        countryRng() < 0.5 ? teamCountry : COUNTRIES[Math.floor(countryRng() * COUNTRIES.length)]
      riderRows.push({
        id: uuidOf(raceIndex * 1_000_000 + t * 100 + k + 1),
        teamId,
        bib: (t + 1) * 10 + (k + 1),
        vocation,
        age,
        genome,
        country,
        name: generateName(`${worldSeed}:${bankId}`, { country, gender: 'M' }).fullName,
        ctl: 55 + 25 * rng(),
        atl: 45 + 20 * rng(),
        morale: 55 + 20 * rng(),
      })
    }
  }
  return { teamRows, riderRows }
}

// ------------------------------------------------------------------------------- el mundo

const fakeAuth = { api: { getSession: async () => null }, handler: async () => new Response('{}') }

async function measureRun(run) {
  // PGlite admite UNA sesión y la ruta de etapa lanza cuatro consultas a la vez (yesterday.test.ts).
  process.env.DB_POOL_MAX = '1'
  const { startTestDb } = await import('../packages/db/dist/testDb.js')
  const { buildApp } = await import('../apps/api/dist/app.js')
  const t = await startTestDb()
  const worldSeed = `bench-b6-${run}`
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed, engineVersion: ENGINE_VERSION })
    .returning({ id: worlds.id })
  const worldId = world.id
  // El reloj del mundo, en la temporada 0 y después de todas las carreras: la ruta lee `:s0`.
  await t.db.insert(gameState).values({ worldId, currentDay: 360, lastProcessedDay: 360 })

  const rows = []
  for (const [raceIndex, bench] of BENCH.entries()) {
    const race = SEASON_CALENDAR.find((r) => r.id === bench.raceId)
    const raceKey = `${race.id}:s0`
    const { teamRows, riderRows } = bankField(`radio-${race.id}-${run}`, race.level, raceIndex + 1)
    await t.db.insert(teams).values(
      teamRows.map((tm) => ({
        id: tm.id,
        worldId,
        name: tm.name,
        division: tm.division,
        philosophy: 'general',
        jerseySeed: tm.jerseySeed,
        country: tm.country,
      })),
    )
    await t.db.insert(riders).values(
      riderRows.map((r) => ({
        id: r.id,
        worldId,
        teamId: r.teamId,
        name: r.name,
        country: r.country,
        gender: 'M',
        birthSeason: -r.age,
        archetype: r.vocation,
        faceSeed: `${r.id}:cara`,
        ctl: r.ctl,
        atl: r.atl,
        morale: r.morale,
      })),
    )
    await t.db
      .insert(riderAttrs)
      .values(
        riderRows.flatMap((r) =>
          ATTRIBUTES.map((attr) => ({ riderId: r.id, attr, value: r.genome.attributes[attr] })),
        ),
      )
    await t.db.insert(riderHidden).values(
      riderRows.map((r) => ({
        riderId: r.id,
        talent: r.genome.hidden.talent,
        ceilings: r.genome.hidden.ceilings,
        fragility: r.genome.hidden.fragility,
        peakAge: r.genome.hidden.peakAge,
        declineAge: r.genome.hidden.declineAge,
      })),
    )
    await t.db
      .insert(raceRosters)
      .values(riderRows.map((r) => ({ raceId: raceKey, riderId: r.id, bib: r.bib })))

    // Como el tick (calendarRun.ts): el recorrido se congela al correr la 1 y cada etapa lleva su
    // sitio y su fecha (`stagePlace`), que deciden el clima.
    await freezeRaceRoute(t.db, worldId, raceKey, race.id, 0)
    const frozen = await raceStagesForWorld(t.db, worldId, raceKey, race.id, 0)
    for (let idx = 1; idx <= bench.run; idx++) {
      const stage = frozen[idx - 1]
      const t0 = performance.now()
      await t.db.transaction((tx) =>
        runOneStage(tx, worldId, stageDayOfSeason(race, idx), worldSeed, {
          raceKey,
          raceId: race.id,
          raceName: race.name,
          level: race.level,
          raceClass: race.raceClass,
          season: 0,
          stageDay: idx,
          kind: stage.kind,
          profile: stage.profile,
          timeTrial: stage.timeTrial,
          isFinal: idx === frozen.length,
          lugar: stagePlace(race, idx),
        }),
      )
      process.stderr.write(
        `  run ${run} · ${race.id} e${idx} corrida en ${((performance.now() - t0) / 1000).toFixed(1)} s\n`,
      )
    }
    const days = bench.measure === 'all' ? frozen.map((_, i) => i + 1) : bench.measure
    for (const day of days) rows.push({ run, race, day, timeTrial: frozen[day - 1].timeTrial })
  }

  const app = buildApp({ db: t.db, auth: fakeAuth, serveWeb: false })
  const out = []
  for (const row of rows) {
    const url = `/api/races/${row.race.id}/stages/${row.day}`
    const sizes = {}
    for (const [label, headers] of [
      ['json', {}],
      ['gzip', { 'accept-encoding': 'gzip' }],
      ['br', { 'accept-encoding': 'br' }],
    ]) {
      const res = await app.inject({ method: 'GET', url, headers })
      if (res.statusCode !== 200) throw new Error(`${url} respondió ${res.statusCode}: ${res.body}`)
      const expected = label === 'json' ? undefined : label
      if (res.headers['content-encoding'] !== expected)
        throw new Error(`${url} con ${label}: content-encoding ${res.headers['content-encoding']}`)
      sizes[label] = res.rawPayload.length
      if (label === 'json') {
        const body = res.json()
        sizes.radioKms = body.radio?.kms.length ?? 0
        sizes.riders = body.results?.length ?? 0
      }
    }
    out.push({
      run: row.run,
      stage: `${row.race.id} e${row.day}`,
      timeTrial: row.timeTrial,
      ...sizes,
    })
  }
  await app.close()
  await t.close()
  return out
}

// ---------------------------------------------------------------------------------- informe

const kb = (bytes) => (bytes / 1024).toFixed(1)
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return { min: s[0], median: s[Math.floor((s.length - 1) / 2)], max: s[s.length - 1] }
}
const fmt = (xs) => {
  const { min, median, max } = stats(xs)
  return `${kb(min)} · ${kb(median)} · ${kb(max)}`
}

const all = []
for (const run of RUNS) all.push(...(await measureRun(run)))

console.log(
  `\nB6 · línea base de la ruta de etapa conocida · motor v${ENGINE_VERSION} · semillas ${RUNS.join(', ')}\n`,
)
console.log(
  '| Etapa | Semilla | Corredores | Fotos de radio | JSON (KB) | gzip (KB) | brotli (KB) |',
)
console.log('| --- | --- | --- | --- | --- | --- | --- |')
for (const r of all) {
  console.log(
    `| ${r.stage}${r.timeTrial ? ' (crono)' : ''} | ${r.run} | ${r.riders} | ${r.radioKms} | ${kb(r.json)} | ${kb(r.gzip)} | ${kb(r.br)} |`,
  )
}
const road = all.filter((r) => !r.timeTrial)
const tt = all.filter((r) => r.timeTrial)
console.log('\nmínimo · mediana · máximo, en KB:')
console.log(
  `  ${road.length} en línea: JSON ${fmt(road.map((r) => r.json))}; gzip ${fmt(road.map((r) => r.gzip))}; brotli ${fmt(road.map((r) => r.br))}`,
)
console.log(
  `  ${tt.length} cronos:   JSON ${fmt(tt.map((r) => r.json))}; gzip ${fmt(tt.map((r) => r.gzip))}; brotli ${fmt(tt.map((r) => r.br))}`,
)
const worst = all.reduce((a, b) => (b.gzip > a.gzip ? b : a))
console.log(
  `  la más pesada con gzip: ${worst.stage} (semilla ${worst.run}), ${kb(worst.gzip)} KB; el tope del 6 (maxKnownStageGzipBytes) es ${kb(MAX_KNOWN_STAGE_GZIP_BYTES)} KB`,
)
console.log(
  '  referencia, mapa 07 §7 (motor v89, una semilla, gzip de Node): JSON 871 · 1.551 · 2.949 KB; gzip 22 · 49 · 100 KB',
)
if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify({ engineVersion: ENGINE_VERSION, runs: RUNS, rows: all }, null, 1),
  )
  console.log(`\n(volcado en ${JSON_OUT})`)
}
