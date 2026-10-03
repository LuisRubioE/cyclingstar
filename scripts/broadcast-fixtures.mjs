#!/usr/bin/env node
/**
 * LAS ETAPAS CONGELADAS DE LA RETRANSMISIÓN (docs/retransmision.md §16.2 y §17.5; E2, paso 2: la
 * primera mitad; decisiones 16-a y 17-u).
 *
 * Seis etapas que no dependen de la versión del motor y miden `packages/shared` y la API: cinco en
 * línea (`race-france` e7, llana; e18, reina; e20, reina larga; `race-flanders` e1; `race-colombia`
 * e5, 126 corredores) y una crono, `race-france` e16; semilla 0 y el campo del banco. Regenerarlas es
 * un PR propio, nunca el efecto de una subida de versión del motor.
 *
 * Cómo: cada carrera sale de un mundo de PGlite sembrado con el CAMPO DEL BANCO de
 * `scripts/race-radio.mjs` (mismos equipos, vocaciones, genomas, carga y moral, semilla
 * `radio-<carrera>-0`) bajo ids uuid deterministas, con la forma de `idDe` de
 * `packages/db/src/stageRun.test.ts`: corredores del 1 en adelante por dorsal y equipos del 1001. Así
 * los ids de los sucesos y de la radio son los que la base admite (`riders.id` y `teams.id` son uuid).
 * `runOneStage` corre, como el tick, las etapas 1 a N de cada carrera con la misma semilla, y de cada
 * etapa congelada se escribe en `apps/api/src/__fixtures__/broadcast/`:
 *
 *   <etapa>.events.json.gz  `stage_snapshots.events`, tal como lo leyó la base
 *   <etapa>.radio.json.gz   la radio COMPLETA del colector (salvo en la crono, que no tiene): la que
 *                           `stageRun.ts` pasa a `radioForStorage`. No se guarda en ninguna parte, así
 *                           que se re-simula la etapa desde su `input` y su `seed`, y el script
 *                           comprueba que los sucesos salen iguales y que `radioForStorage` con la
 *                           lista de seguimiento y los maillots del manifiesto da, campo a campo,
 *                           `stage_snapshots.radio`
 *   <etapa>.acta.json.gz    las `ChronicleEntry` del acta, las que sirve hoy la ruta de etapa
 *   manifest.json           motor, semilla, campo, tamaños y sha256 de cada fichero; por carrera, cada
 *                           uuid con su dorsal, país, equipo y nombre de prueba (`Rider 012`); y por
 *                           etapa, lo que el adaptador lee de su snapshot (`riderIds`, `lengthKm`,
 *                           `winnerS`) y la lista de seguimiento y los maillots de su radio
 *
 * El paso 5 escribe la segunda mitad (`.timeline.gz` e `.i1.json.gz`) de la misma corrida y falla si
 * los sucesos o la radio difieren en un byte de los de aquí (17-u).
 *
 * Uso (hacen falta los `dist` de packages/* y de apps/api):
 *   pnpm exec tsc -b
 *   node scripts/broadcast-fixtures.mjs             escribe los ficheros
 *   node scripts/broadcast-fixtures.mjs --check     los regenera en memoria y sale con 1 si alguno cambia
 *   node scripts/broadcast-fixtures.mjs --adapter   el adaptador en frío (abajo), sin escribir nada
 *
 * EL ADAPTADOR EN FRÍO (§14.4 y §18.9; E2, paso 3a). Con `--adapter`, en el mismo mundo que escribe las
 * congeladas, mide lo que cuesta servir una etapa sin línea la primera vez (`timelineForStage` con el
 * LRU vacío): leer `stage_snapshots` y validar su radio (`storedRaceRadioSchema`) y sus sucesos, leer el
 * resultado, los maillots de salida (`jerseysThroughStage`, las cuatro consultas de
 * `leadersThroughStage`) y las identidades del reparto, y construir la línea (`adaptRadioStage`). Da la
 * primera llamada del proceso, la mediana de `ADAPTER_REPS` llamadas en frío, cada parte por separado
 * y lo que cuesta con la línea ya en el LRU. PGlite en el mismo proceso: la base de producción, por
 * socket, añade la red a las cinco lecturas.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { gunzipSync, gzipSync } from 'node:zlib'
import { ATTRIBUTES, assignLeaderJerseys, seededRng } from '../packages/shared/dist/index.js'
import {
  ENGINE_VERSION,
  SEASON_CALENDAR,
  generateNpcRider,
  raceRadioCollector,
  radioForStorage,
  radioKmPoints,
  sampleNpcAge,
  simulateStage,
  stageDayOfSeason,
  stageLengthKm,
  stagePlace,
} from '../packages/engine/dist/index.js'
import {
  freezeRaceRoute,
  gameState,
  getStageSnapshot,
  raceRosters,
  raceStagesForWorld,
  riderAttrs,
  riderHidden,
  riders,
  runOneStage,
  teams,
  worlds,
} from '../packages/db/dist/index.js'

const OUT = new URL('../apps/api/src/__fixtures__/broadcast/', import.meta.url)
const CHECK = process.argv.includes('--check')
const ADAPTER = process.argv.includes('--adapter')
/** Llamadas en frío por etapa con `--adapter`: la mediana, para que una pausa del recolector no mande. */
const ADAPTER_REPS = 7
/** Las filas de `--adapter`, una por etapa congelada, en el orden en que se miden. */
const adapterRows = []
/** La semilla del banco: `radio-<carrera>-<RUN>` (scripts/race-radio.mjs, `--run`). */
const RUN = 0
/** gzip 9, como `TIMELINE.gzipLevel` (§15.2): los ficheros solo se escriben una vez. */
const GZIP_LEVEL = 9

/** Las seis etapas congeladas (16-a), por carrera: se corren las etapas 1 a la última que se congela. */
const RACES = [
  { raceId: 'race-france', days: [7, 16, 18, 20] },
  { raceId: 'race-flanders', days: [1] },
  { raceId: 'race-colombia', days: [5] },
]
const nameOf = (raceId, day) => `${raceId}-e${day}`

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

/** Ids uuid deterministas, con la forma de `idDe` de packages/db/src/stageRun.test.ts. */
const uuidOf = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/**
 * El campo de `scripts/race-radio.mjs` (`buildField`), con el MISMO consumo de su generador: la
 * vocación, la carga y la moral salen de `${worldSeed}:rq-field` en el mismo orden, y el genoma de la
 * semilla del corredor del banco (`rq-<equipo>-<corredor>`). El país sale de otro flujo, para no
 * moverle nada al banco (como `scripts/bench-stage-size.mjs`). Los corredores van por dorsal.
 */
function bankField(worldSeed, level) {
  const rng = seededRng(`${worldSeed}:rq-field`)
  const countryRng = seededRng(`${worldSeed}:pais`)
  const { teams: nTeams, per, divisions } = fieldFor(level)
  const teamRows = []
  const riderRows = []
  for (let t = 0; t < nTeams; t++) {
    const division = divisions[t % divisions.length]
    const teamCountry = COUNTRIES[Math.floor(countryRng() * COUNTRIES.length)]
    const teamId = uuidOf(1001 + t)
    teamRows.push({
      id: teamId,
      division,
      country: teamCountry,
      name: `Team ${String(t + 1).padStart(2, '0')}`,
      jerseySeed: `${worldSeed}:j${t}`,
    })
    for (let k = 0; k < per; k++) {
      const bankId = `rq-${t}-${k}`
      const vocation = VOCATIONS[Math.floor(rng() * VOCATIONS.length)]
      const age = sampleNpcAge(`${worldSeed}:${bankId}:age`)
      const genome = generateNpcRider(`${worldSeed}:${bankId}`, { division, vocation, age })
      const country =
        countryRng() < 0.5 ? teamCountry : COUNTRIES[Math.floor(countryRng() * COUNTRIES.length)]
      const bib = (t + 1) * 10 + (k + 1)
      riderRows.push({
        id: uuidOf(riderRows.length + 1),
        teamId,
        bib,
        vocation,
        age,
        genome,
        country,
        name: `Rider ${String(bib).padStart(3, '0')}`,
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

async function seedRace(t, race, worldSeed) {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed, engineVersion: ENGINE_VERSION })
    .returning({ id: worlds.id })
  // El reloj del mundo, en la temporada 0 y después de todas las carreras: la ruta lee `:s0`.
  await t.db.insert(gameState).values({ worldId: world.id, currentDay: 360, lastProcessedDay: 360 })
  const { teamRows, riderRows } = bankField(worldSeed, race.level)
  await t.db.insert(teams).values(
    teamRows.map((tm) => ({
      id: tm.id,
      worldId: world.id,
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
      worldId: world.id,
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
  const raceKey = `${race.id}:s0`
  await t.db
    .insert(raceRosters)
    .values(riderRows.map((r) => ({ raceId: raceKey, riderId: r.id, bib: r.bib })))
  return { worldId: world.id, raceKey, teamRows, riderRows }
}

/**
 * LA LISTA DE SEGUIMIENTO Y LOS MAILLOTS con que `stageRun.ts` adelgaza la radio, rehechos con lo
 * que hay en la base antes de correr la etapa: la general de salida (el orden de `gcRank` de la
 * entrada, que es el de `gcRows`) con los puntos de `race_gc`, y los diez primeros de la etapa. El
 * script comprueba después que con ellas `radioForStorage` da `stage_snapshots.radio`.
 */
function watchListOf(input, pointsBefore, finishers) {
  const gcRows = input.riders
    .filter((r) => r.gcRank != null)
    .sort((a, b) => a.gcRank - b.gcRank)
    .map((r) => ({
      riderId: r.riderId,
      gcRank: r.gcRank,
      ...(pointsBefore.get(r.riderId) ?? { pv: 0, pm: 0 }),
    }))
  // `gcRank` es el puesto en `gcRows`: si falta alguno, había en la general alguien que no corre.
  if (gcRows.some((r, i) => r.gcRank !== i + 1))
    throw new Error('la general de salida no es contigua: falta alguien de gcRows en la entrada')
  const byPoints = [...gcRows].sort((a, b) => b.pv - a.pv)
  const byKom = [...gcRows].sort((a, b) => b.pm - a.pm)
  const jerseys = assignLeaderJerseys({
    gc: gcRows.map((r) => ({ riderId: r.riderId })),
    points: byPoints.map((r) => ({ riderId: r.riderId })),
    kom: byKom.map((r) => ({ riderId: r.riderId })),
  })
  const priority = [jerseys.gc, jerseys.points, jerseys.kom].filter((id) => id !== null)
  const watch = new Set([
    ...priority,
    ...gcRows.slice(0, 10).map((r) => r.riderId),
    ...finishers.slice(0, 10),
  ])
  return { watch: [...watch].sort(), priority }
}

async function runRace({ raceId, days }) {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  const worldSeed = `radio-${race.id}-${RUN}`
  // PGlite admite UNA sesión y la ruta de etapa lanza cuatro consultas a la vez (yesterday.test.ts).
  process.env.DB_POOL_MAX = '1'
  const { startTestDb } = await import('../packages/db/dist/testDb.js')
  const { buildApp } = await import('../apps/api/dist/app.js')
  const t = await startTestDb()
  const seeded = await seedRace(t, race, worldSeed)
  const { worldId, raceKey } = seeded
  // Como el tick (calendarRun.ts): el recorrido se congela al correr la 1 y cada etapa lleva su sitio
  // y su fecha (`stagePlace`), que deciden el clima.
  await freezeRaceRoute(t.db, worldId, raceKey, race.id, 0)
  const frozen = await raceStagesForWorld(t.db, worldId, raceKey, race.id, 0)
  const stages = []
  for (let idx = 1; idx <= Math.max(...days); idx++) {
    const stage = frozen[idx - 1]
    const congelada = days.includes(idx)
    const pointsBefore = new Map()
    if (congelada) {
      const rows =
        await t.client`select rider_id, puntos_volante, puntos_montana from race_gc where race_id = ${raceKey}`
      for (const r of rows)
        pointsBefore.set(r.rider_id, { pv: r.puntos_volante, pm: r.puntos_montana })
    }
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
      `  ${race.id} e${idx} corrida en ${((performance.now() - t0) / 1000).toFixed(1)} s\n`,
    )
    if (!congelada) continue

    const snap = await getStageSnapshot(t.db, raceKey, idx)
    const input = snap.input
    const lengthKm = stageLengthKm(input.profile)
    // La radio completa no se guarda: se vuelve a correr la etapa, que con la misma entrada y la misma
    // semilla es la misma carrera (observar no cambia la carrera, B11).
    const collector = raceRadioCollector(radioKmPoints(lengthKm))
    const output = simulateStage(input, snap.seed, collector.probe)
    if (!isDeepStrictEqual(output.events, snap.events))
      throw new Error(`${race.id} e${idx}: la etapa re-simulada no da los sucesos guardados`)
    const finishers = output.results
      .filter((r) => r.estado === 'finish')
      .sort((a, b) => a.puesto - b.puesto)
      .map((r) => r.riderId)
    const [winner] =
      await t.client`select tiempo_s from stage_results where race_id = ${raceKey} and stage_day = ${idx} and puesto = 1`
    const radio = input.timeTrial === true ? null : collector.radio({ incidents: output.incidents })
    const { watch, priority } = watchListOf(input, pointsBefore, finishers)
    if (
      radio !== null &&
      !isDeepStrictEqual(radioForStorage(radio, new Set(watch), priority), snap.radio)
    )
      throw new Error(`${race.id} e${idx}: radioForStorage no da la radio guardada`)
    stages.push({
      name: nameOf(race.id, idx),
      raceId: race.id,
      day: idx,
      raceKey,
      timeTrial: input.timeTrial === true,
      lengthKm,
      winnerS: winner.tiempo_s,
      riderIds: input.riders.map((r) => r.riderId),
      watch,
      priority,
      events: snap.events,
      radio,
    })
  }

  if (ADAPTER) {
    adapterRows.push(...(await benchAdapter(t, raceKey, stages)))
    await t.close()
    return { race: null, stages: [] }
  }

  // EL ACTA, la que sirve hoy la ruta de etapa: con los nombres, los equipos y los maillots de la base.
  const app = buildApp({ db: t.db, auth: fakeAuth, serveWeb: false })
  for (const s of stages) {
    const res = await app.inject({ method: 'GET', url: `/api/races/${s.raceId}/stages/${s.day}` })
    if (res.statusCode !== 200)
      throw new Error(`${s.name}: la ruta de etapa respondió ${res.statusCode}`)
    s.acta = res.json().chronicle
    if (!Array.isArray(s.acta) || s.acta.length === 0)
      throw new Error(`${s.name}: el acta sale vacía`)
  }
  await app.close()
  await t.close()

  const teamsOut = Object.fromEntries(
    seeded.teamRows.map((tm) => [
      tm.id,
      { name: tm.name, country: tm.country, jerseySeed: tm.jerseySeed },
    ]),
  )
  const ridersOut = Object.fromEntries(
    seeded.riderRows.map((r) => [
      r.id,
      { bib: r.bib, country: r.country, team: r.teamId, name: r.name },
    ]),
  )
  return { race: { raceId: race.id, worldSeed, teams: teamsOut, riders: ridersOut }, stages }
}

// ------------------------------------------------------------------------------- los ficheros

const gz = (value) => gzipSync(Buffer.from(JSON.stringify(value)), { level: GZIP_LEVEL })
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

const files = new Map()
const manifest = {
  generatedBy: 'scripts/broadcast-fixtures.mjs',
  engineVersion: ENGINE_VERSION,
  seed: RUN,
  field:
    'el campo del banco de scripts/race-radio.mjs (semilla radio-<carrera>-0), con ids uuid por dorsal (corredores desde el 1, equipos desde el 1001) y nombres de prueba',
  races: {},
  stages: {},
}
for (const spec of RACES) {
  const { race, stages } = await runRace(spec)
  if (race === null) continue // --adapter: se mide y no se escribe nada
  manifest.races[race.raceId] = {
    worldSeed: race.worldSeed,
    teams: race.teams,
    riders: race.riders,
  }
  for (const s of stages) {
    const out = { events: gz(s.events), acta: gz(s.acta) }
    if (s.radio !== null) out.radio = gz(s.radio)
    const described = {}
    for (const [kind, buf] of Object.entries(out)) {
      const file = `${s.name}.${kind}.json.gz`
      files.set(file, buf)
      described[kind] = { file, bytes: buf.length, sha256: sha256(buf) }
    }
    manifest.stages[s.name] = {
      raceId: s.raceId,
      day: s.day,
      raceKey: s.raceKey,
      timeTrial: s.timeTrial,
      lengthKm: s.lengthKm,
      winnerS: s.winnerS,
      riderIds: s.riderIds,
      watch: s.watch,
      priority: s.priority,
      files: described,
    }
  }
}
if (ADAPTER) {
  reportAdapter(adapterRows)
  process.exit(0)
}
files.set('manifest.json', Buffer.from(`${compactJson(manifest)}\n`))

if (CHECK) {
  let changed = 0
  for (const [file, buf] of files) {
    let before = null
    try {
      before = readFileSync(new URL(file, OUT))
    } catch {
      before = null
    }
    // Se comparan los JSON y no los gzip: otra versión de zlib comprime los mismos bytes de otra forma.
    const same =
      before !== null &&
      (file.endsWith('.gz')
        ? gunzipSync(before).equals(gunzipSync(buf))
        : before.equals(buf) ||
          isDeepStrictEqual(
            withoutHashes(JSON.parse(before.toString('utf8'))),
            withoutHashes(JSON.parse(buf.toString('utf8'))),
          ))
    if (!same) {
      changed += 1
      console.log(`  cambia: ${file}`)
    }
  }
  console.log(changed === 0 ? 'Los fixtures no cambian.' : `${changed} ficheros cambian.`)
  process.exit(changed === 0 ? 0 : 1)
}

mkdirSync(OUT, { recursive: true })
for (const [file, buf] of files) writeFileSync(new URL(file, OUT), buf)
console.log(`\nFixtures de la retransmisión · motor v${ENGINE_VERSION} · semilla ${RUN}\n`)
console.log('| Etapa | Corredores | Sucesos | Radio (KB gz) | Acta (KB gz) | Sucesos (KB gz) |')
console.log('| --- | --- | --- | --- | --- | --- |')
for (const [name, s] of Object.entries(manifest.stages)) {
  const kb = (kind) => (s.files[kind] ? (s.files[kind].bytes / 1024).toFixed(1) : '·')
  const events = JSON.parse(gunzipSync(files.get(s.files.events.file)).toString('utf8'))
  console.log(
    `| ${name}${s.timeTrial ? ' (crono)' : ''} | ${s.riderIds.length} | ${events.length} | ${kb('radio')} | ${kb('acta')} | ${kb('events')} |`,
  )
}
const total = [...files.values()].reduce((a, b) => a + b.length, 0)
console.log(`\nEn total ${(total / 1024).toFixed(0)} KB en ${files.size} ficheros.`)

/**
 * JSON legible y corto: un objeto o una lista de valores sueltos va en una línea si la línea entera
 * cabe en 160 caracteres (un corredor, un equipo, un fichero), y si no, un elemento por línea.
 * Prettier no lo toca (.prettierignore): lo generado manda sobre el formateador, como el inventario
 * de recorridos.
 */
// --------------------------------------------------------------- el adaptador en frío (--adapter)

/** La mediana (una función con nombre: el bucle de arriba la llama antes de llegar aquí). */
function median(xs) {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/** Lo que tarda `fn`, en ms, y su resultado. */
async function timed(fn) {
  const t0 = performance.now()
  const value = await fn()
  return { ms: performance.now() - t0, value }
}

/**
 * El adaptador en frío de las etapas congeladas de una carrera, en su mundo. La primera llamada del
 * proceso va aparte (la primera de todas paga además la carga de módulos y de los esquemas); después,
 * `ADAPTER_REPS` en frío (el LRU vaciado antes de cada una), cada parte por separado y una con la línea
 * ya en el LRU.
 */
async function benchAdapter(t, raceKey, stages) {
  const {
    adaptRadioStage,
    clearAdaptedTimelineCache,
    jerseysThroughStage,
    nameableAtStart,
    profileStripOf,
    provisionalCast,
    stageWeatherOf,
    storedEventsOf,
    timelineForStage,
  } = await import('../apps/api/dist/broadcastSource.js')
  const { storedRaceRadioSchema } = await import('../apps/api/dist/chronicle.js')
  const { getCastIdentities, getStageResults, worldHorizon } =
    await import('../packages/db/dist/index.js')
  const rows = []
  for (const s of stages) {
    clearAdaptedTimelineCache()
    const first = await timed(() => timelineForStage(t.db, worldHorizon, raceKey, s.day))
    const cold = []
    for (let i = 0; i < ADAPTER_REPS; i++) {
      clearAdaptedTimelineCache()
      cold.push((await timed(() => timelineForStage(t.db, worldHorizon, raceKey, s.day))).ms)
    }
    const warm = await timed(() => timelineForStage(t.db, worldHorizon, raceKey, s.day))
    // Las partes, una a una, como las hace `timelineForStage` (broadcastSource.ts, adaptStoredStage).
    const parts = { read: [], validate: [], results: [], jerseys: [], cast: [], build: [] }
    let tl = first.value
    if (!s.timeTrial)
      for (let i = 0; i < ADAPTER_REPS; i++) {
        const snap = await timed(() => getStageSnapshot(t.db, raceKey, s.day))
        const v = await timed(() => ({
          radio: storedRaceRadioSchema.parse(snap.value.radio),
          events: storedEventsOf(snap.value.events),
        }))
        const res = await timed(() => getStageResults(t.db, raceKey, s.day))
        const jer = await timed(() => jerseysThroughStage(t.db, raceKey, s.day - 1))
        const input = snap.value.input
        const entries = input.riders.map((r) => ({
          riderId: r.riderId,
          bib: r.bib ?? null,
          teamId: r.teamId ?? null,
          gcRank: r.gcRank ?? null,
          gcDeficitS: r.gcDeficitSeconds ?? null,
        }))
        const ids = await timed(() =>
          getCastIdentities(
            t.db,
            entries.map((e) => e.riderId),
            [...new Set(entries.flatMap((e) => (e.teamId ? [e.teamId] : [])))],
          ),
        )
        const finishers = res.value.filter((r) => !r.dnf && r.tiempoS > 0)
        const lengthKm = stageLengthKm(input.profile)
        const from = s.day > 1 ? { raceKey, stageDay: s.day - 1 } : null
        const built = await timed(() =>
          adaptRadioStage({
            radio: v.value.radio,
            events: v.value.events,
            riderIds: entries.map((e) => e.riderId),
            lengthKm,
            winnerS: Math.min(...finishers.map((r) => r.tiempoS)),
            engineVersion: snap.value.engineVersion,
            finishTimes: new Map(finishers.map((r) => [r.riderId, r.tiempoS])),
            nameableAlways: nameableAtStart(jer.value.leaders, entries),
            profile: profileStripOf(input.profile),
            weather: stageWeatherOf(snap.value.seed, input.lugar, lengthKm),
            cast: provisionalCast(entries, ids.value, jer.value, from),
            racedProfile: input.profile,
          }),
        )
        tl = built.value
        parts.read.push(snap.ms)
        parts.validate.push(v.ms)
        parts.results.push(res.ms)
        parts.jerseys.push(jer.ms)
        parts.cast.push(ids.ms)
        parts.build.push(built.ms)
      }
    const radioKb = s.timeTrial
      ? 0
      : Buffer.byteLength(JSON.stringify((await getStageSnapshot(t.db, raceKey, s.day)).radio)) /
        1024
    rows.push({
      name: s.name,
      timeTrial: s.timeTrial,
      radioKb,
      groups: tl?.groups.length ?? 0,
      stateEvents: tl?.stateEvents.length ?? 0,
      first: first.ms,
      cold: median(cold),
      coldMax: Math.max(...cold),
      warm: warm.ms,
      parts: Object.fromEntries(
        Object.entries(parts).map(([k, xs]) => [k, xs.length ? median(xs) : 0]),
      ),
    })
    process.stderr.write(`  ${s.name}: el adaptador en frío, ${median(cold).toFixed(1)} ms\n`)
  }
  return rows
}

function reportAdapter(rows) {
  const ms = (x) => x.toFixed(1)
  console.log(
    `\nEl adaptador en frío (§18.9) · motor v${ENGINE_VERSION} · semilla ${RUN} · PGlite en el proceso · mediana de ${ADAPTER_REPS}\n`,
  )
  console.log(
    '| Etapa | Radio (KB de JSON) | Grupos · sucesos de estado | Primera del proceso (ms) | En frío (ms, mediana · máx.) | leer · validar · resultado · maillots · reparto · construir (ms) | En el LRU (ms) |',
  )
  console.log('| --- | --- | --- | --- | --- | --- | --- |')
  for (const r of rows) {
    const p = r.parts
    console.log(
      `| ${r.name}${r.timeTrial ? ' (crono: sin línea, null)' : ''} | ${r.timeTrial ? '·' : r.radioKb.toFixed(0)} | ${r.timeTrial ? '·' : `${r.groups} · ${r.stateEvents}`} | ${ms(r.first)} | ${ms(r.cold)} · ${ms(r.coldMax)} | ${r.timeTrial ? '·' : [p.read, p.validate, p.results, p.jerseys, p.cast, p.build].map(ms).join(' · ')} | ${ms(r.warm)} |`,
    )
  }
}

function compactJson(value, indent = '', column = 0) {
  const flat = (v) => v === null || typeof v !== 'object'
  if (flat(value)) return JSON.stringify(value)
  const inner = `${indent}  `
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const line = `[${value.map((v) => JSON.stringify(v)).join(', ')}]`
    if (value.every(flat) && column + line.length <= 160) return line
    return `[\n${value.map((v) => inner + compactJson(v, inner, inner.length)).join(',\n')}\n${indent}]`
  }
  const entries = Object.entries(value)
  if (entries.length === 0) return '{}'
  const line = `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ')} }`
  if (entries.every(([, v]) => flat(v)) && column + line.length <= 160) return line
  const rows = entries.map(([k, v]) => {
    const key = `${inner}${JSON.stringify(k)}: `
    return key + compactJson(v, inner, key.length)
  })
  return `{\n${rows.join(',\n')}\n${indent}}`
}

/** El manifiesto sin los sha256 de los gzip, que cambian con la versión de zlib aunque el JSON no. */
function withoutHashes(m) {
  return {
    ...m,
    stages: Object.fromEntries(
      Object.entries(m.stages).map(([k, s]) => [
        k,
        {
          ...s,
          files: Object.fromEntries(
            Object.entries(s.files).map(([kind, f]) => [kind, { file: f.file }]),
          ),
        },
      ]),
    ),
  }
}
