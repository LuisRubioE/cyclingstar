#!/usr/bin/env node
/**
 * B17 · EL RITMO MEDIDO (docs/retransmision.md §8.9, §16.4, §17.3 y §17.13; E2, paso 0: la línea base;
 * paso 10b: la línea grabada).
 *
 * Cuánto dura en pantalla cada etapa del banco con las curvas de la retransmisión, y si cada duración
 * cae en su banda (decisión 8-k). Corre `BROADCAST.pace` (`Watch`), `summaryPace` (`Highlights`), el
 * digest (`digestPace` y, en la crono, `ttDigestScale`) y `ttPace` (la crono) sobre las 24 etapas del
 * mapa 07 §7 —las 21 de `race-france`, `race-flanders`, `race-tramuntana` y `race-colombia` e5— y, por
 * defecto, con las semillas 0 y 1 del banco de `scripts/race-radio.mjs` (mismo campo, misma semilla de
 * etapa).
 *
 * LA CURVA ES LA DE `packages/shared` (decisión 17-c): `paceAt`, `playbackEstimateS`, `digestPace`,
 * `ttPaceAt`, `ttPlaybackEstimateS`, `ttDigestScale` y las constantes de `BROADCAST`. Hasta el 10a el
 * digest y la crono iban aquí como copias de §8.2 y §9.4; desde el 10b se importan, con las mismas
 * duraciones (comprobado al segundo con el reloj del adaptador).
 *
 * EL RELOJ DE LA CABEZA (`--reloj`):
 *
 * - `linea` (por defecto, desde el 10b): la LÍNEA GRABADA. Cada etapa se corre con el grabador
 *   enganchado como lo hace el tick (`startRecording`, packages/engine/src/sim/timelineBench.ts: la
 *   foto de cada bloque, los tres ganchos y el reparto del banco), y la cabeza es la menor marca de
 *   reloj de cada km de foto, la que pinta `Watch` y la que mide la rápida
 *   (`apps/api/src/broadcastPace.test.ts`, `headTrack`); el perfil, el de la cabecera
 *   (`tl.profile`). Observar no cambia la carrera (B11): las etapas son las mismas que sin grabador.
 *   En la crono, la hora a la que el último en salir entra en su último km entero sale de su traza
 *   (`ttLastKmFromS`, §9.4), exacta.
 * - `adaptador`: el reloj ESTIMADO del adaptador de la radio (§3.8; `storedHeadClock`,
 *   apps/api/src/broadcastSource.ts), el de las etapas sin línea, con el que corrió B17 del 3a al 10a:
 *   la velocidad del grupo en cabeza de cada foto de la radio guardada, integrada y reescalada para que
 *   la meta caiga en el tiempo del ganador. La crono no tiene radio: su ritmo va por la fracción de
 *   salidos, con el plan de salida público (`timeTrialStartOrder`) y la llegada de cada uno, y la hora
 *   del último km del último se estima repartiendo su tiempo por el perfil a las velocidades nominales.
 *
 * El banco corre cada etapa sin general; la crono de mitad de vuelta (la e16) se corre con la general
 * inventada del juez de ejecutabilidad (`juez-ejec/crono_gc.mjs`), la misma con la que §8.3 y §9.4 la
 * midieron: sale el líder el último, a 120 s.
 *
 * Las bandas (8-k): `Watch` de 6:00 a 22:00 en línea; `Highlights` de 1:45 a 7:30 en línea; los
 * últimos 5 km, al menos el 15 % de `Watch` en línea y el 35 % en los FINALES EN SUBIDA; la crono, de
 * 5:00 a 13:00; el digest, a menos del 40 % de su presupuesto; y el error de la duración anunciada
 * (`estimateS`), con p90 por debajo de 60 s en las etapas en línea que no acaban en alto (las que la
 * API llama `Summit finish`).
 *
 * LA BANDA DEL 35 %, DECIDIDA EN EL 3a. El paso 0 la aplicaba a toda etapa que la API llama `Summit
 * finish`, y tres de ellas (la e6, la e10 y la e20 de `race-france`) quedaban del 31 al 33 % (con el
 * reloj del 3a, del 27 al 32 %). Las tres acaban arriba, pero sus últimos 5 km suben de media un 3,7,
 * un 1,1 y un 2,1 %: la cabeza no frena ahí, y la curva no tiene en esos km más carrera que repartir
 * que en un final llano. Las que sí suben (la e15, la e18, la e19 y la `race-colombia` e5, del 6,7 al
 * 8,8 %) dan del 42 al 48 %. Así que el 35 % se pide a los finales en subida: `Summit finish` y al
 * menos un 5 % de media en los últimos 5 km del perfil (`CLIMBING_FINISH_MIN_PCT`). La curva no se
 * toca: las tres siguen por encima del 15 % de toda etapa. La banda del error de `estimateS` sigue
 * fuera de toda `Summit finish`, como en §15.3: es el error de las velocidades nominales en la
 * montaña, que existe aunque los últimos 5 km sean suaves (la e20, de −86 a −61 s).
 *
 * Uso (hacen falta los `dist` de packages/* y de apps/api):
 *   pnpm exec tsc -b
 *   node scripts/bench-pace.mjs [--runs 0,1] [--reloj linea|adaptador] [--json fichero.json]
 *
 * Sale con código 1 si alguna duración se sale de su banda.
 */
import { writeFileSync } from 'node:fs'
import {
  ATTRIBUTES,
  BROADCAST,
  digestPace,
  paceAt,
  photoBlocksOf,
  playbackEstimateS,
  seededRng,
  ttDigestScale,
  ttLastKmFromS,
  ttPaceAt,
  ttPlaybackEstimateS,
} from '../packages/shared/dist/index.js'
import { storedHeadClock } from '../apps/api/dist/broadcastSource.js'
import { eff0, initialEnergy } from '../packages/engine/dist/banister.js'
import { ENGINE_VERSION } from '../packages/engine/dist/constants.js'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { altitudesDelPerfil } from '../packages/engine/dist/stage/citas.js'
import { matchCount } from '../packages/engine/dist/stage/physics.js'
import { stageSeed } from '../packages/engine/dist/stage/rng.js'
import { sampleProfile, stageLengthKm } from '../packages/engine/dist/stage/sample.js'
import { simulateStage } from '../packages/engine/dist/stage/simulate.js'
import { timeTrialStartOrder } from '../packages/engine/dist/stage/startOrder.js'
import {
  raceRadioCollector,
  radioForStorage,
  radioKmPoints,
} from '../packages/engine/dist/sim/raceRadio.js'
import { startRecording } from '../packages/engine/dist/sim/timelineBench.js'
import { autoStageOrders } from '../packages/engine/dist/world/autoOrders.js'
import { generateNpcRider, sampleNpcAge } from '../packages/engine/dist/world/npc.js'
import { calendarStageSpec } from '../apps/api/dist/stageHistory.js'

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const RUNS = String(opt('runs', '0,1'))
  .split(',')
  .map((s) => Number(s.trim()))
const JSON_OUT = opt('json', null)
/** El reloj de la cabeza: la línea grabada (10b) o el estimado del adaptador (3a a 10a). */
const CLOCK = String(opt('reloj', 'linea'))
if (CLOCK !== 'linea' && CLOCK !== 'adaptador') {
  console.error(`--reloj ${CLOCK}: tiene que ser linea o adaptador`)
  process.exit(2)
}

// ---------------------------------------- la curva, de packages/shared (§8.2, §9.4, §15.3, 17-c)

/** `BROADCAST.pace` (`Watch`) y `summaryPace` (`Highlights`): s de carrera por s de pared. */
const PACE = BROADCAST.pace
const SUMMARY_PACE = BROADCAST.summaryPace
/** `BROADCAST.digestBudgetS`: s de pared por etapa en el digest, por tipo de etapa. */
const DIGEST_BUDGET_S = BROADCAST.digestBudgetS
/** `BROADCAST.nominalKmh`: km/h por pendiente media del km, para la hora estimada del último km de la crono. */
const nominalKmh = (pct) => BROADCAST.nominalKmh.find((b) => pct <= b.upToPct).kmh
/** Un perfil con solo las cotas: es lo único que leen la duración anunciada y el digest. */
const strip = (altM) => ({ altM, climbs: [], sprintsKm: [], laps: 1 })

/**
 * Los últimos 5 km de un final en subida suben al menos esto de media (%), sobre la cota por km del
 * perfil. Decidido en el 3a con las 24 etapas del banco (arriba): las `Summit finish` que no suben en
 * sus últimos 5 km se quedan en el 3,7 % como mucho (y las `Uphill finish`, en el 4,1 %), y las que
 * suben van del 6,7 al 8,8 %. Lo mismo que `CLIMBING_FINISH_MIN_PCT` de apps/api/src/broadcastPace.test.ts.
 */
const CLIMBING_FINISH_MIN_PCT = 5

/** La pendiente media de los últimos 5 km del perfil (`altM`, la cota al final de cada km entero). */
function last5Pct(altM, km) {
  const n = altM.length - 1
  const from = Math.max(0, n - 5)
  return (altM[n] - altM[from]) / ((km - from) * 10)
}

/** ∫ de 0 a `end` de 1 / `ttPaceAt` (§9.4): exacta, por tramos, porque la curva cambia en saltos. */
function ttWallS(plan, end, lastKmFromS) {
  let t = 0
  let wall = 0
  while (t < end) {
    let next = (Math.floor(t / plan.intervalS) + 1) * plan.intervalS
    if (lastKmFromS !== null && t < lastKmFromS) next = Math.min(next, lastKmFromS)
    next = Math.min(next, end)
    wall += (next - t) / ttPaceAt(t, plan, lastKmFromS)
    t = next
  }
  return wall
}

/**
 * La cabeza de una línea grabada en cada km de foto: [km del final de su bloque, s de carrera], la menor
 * marca de reloj del bloque. La misma cuenta que `headTrack` de apps/api/src/broadcastPace.test.ts.
 */
function lineHeadTrack(tl) {
  const minAt = new Map()
  for (const e of tl.stateEvents)
    if (e.t === 'clock')
      for (const [, ds] of e.marks) minAt.set(e.b, Math.min(minAt.get(e.b) ?? Infinity, ds))
  const pb = photoBlocksOf(tl.lengthKm, tl.dx)
  return pb.map((b, k) => [
    k === pb.length - 1 && b === tl.blocks - 1 ? tl.lengthKm : (b + 1) / 10,
    minAt.get(b) / 10,
  ])
}

/** Corre la etapa del banco con el grabador enganchado (`startRecording`) y cierra su línea. */
function recordBankStage(race, stage, run) {
  const { input, seed } = bankStage(race, stage, run)
  const rec = startRecording(race.id, stage.index, input, seed)
  const output = simulateStage(input, seed, rec.probe)
  return { input, output, tl: rec.close(output).timeline }
}

// ------------------------------------------------- el perfil por km (`ProfileStrip.altM`, §4.2)

/** Cota al final de cada km entero, de 0 al último km (parcial incluido), en metros enteros. */
function altMOf(profile) {
  const blocks = sampleProfile(profile)
  const alt = altitudesDelPerfil(blocks, 0.1, profile.startM ?? 0)
  const kmCount = Math.ceil(blocks.length / 10)
  const altM = [Math.round(profile.startM ?? 0)]
  for (let k = 1; k <= kmCount; k++) altM.push(Math.round(alt[Math.min(alt.length, k * 10) - 1]))
  return { altM, blocks: blocks.length }
}

// --------------------------------------------------- el banco (scripts/race-radio.mjs, bankSource)

const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']
const NEUTRAL = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

function fieldFor(level) {
  if (level === 'WT') return { teams: 22, per: 8, divisions: ['WT', 'WT', 'WT', 'PRS'] }
  if (level === 'PRS') return { teams: 20, per: 7, divisions: ['PRS', 'PRS', 'CON'] }
  return { teams: 18, per: 7, divisions: ['CON', 'CON', 'CON', 'CON', 'PRS', 'WT'] }
}

function buildField(worldSeed, level) {
  const rng = seededRng(`${worldSeed}:rq-field`)
  const { teams, per, divisions } = fieldFor(level)
  const field = []
  for (let t = 0; t < teams; t++) {
    const division = divisions[t % divisions.length]
    for (let k = 0; k < per; k++) {
      const riderId = `rq-${t}-${k}`
      const vocation = VOCATIONS[Math.floor(rng() * VOCATIONS.length)]
      const age = sampleNpcAge(`${worldSeed}:${riderId}:age`)
      const genome = generateNpcRider(`${worldSeed}:${riderId}`, { division, vocation, age })
      field.push({
        riderId,
        teamId: `rq-team-${t}`,
        bib: (t + 1) * 10 + (k + 1),
        attrs: genome.attributes,
        fragility: genome.hidden.fragility,
        ctl: 55 + 25 * rng(),
        atl: 45 + 20 * rng(),
        morale: 55 + 20 * rng(),
      })
    }
  }
  return field
}

function bankStage(race, stage, run) {
  const worldSeed = `radio-${race.id}-${run}`
  const field = buildField(worldSeed, race.level)
  const orders = autoStageOrders(
    field.map((r) => ({ riderId: r.riderId, attrs: r.attrs, teamId: r.teamId })),
    { kind: stage.kind, timeTrial: stage.timeTrial === true },
  )
  const riders = field.map((r) => {
    const tsb = r.ctl - r.atl
    const eff = {}
    for (const a of ATTRIBUTES) eff[a] = eff0(r.attrs[a], r.ctl, tsb, 'sano', r.morale)
    return {
      riderId: r.riderId,
      eff0: eff,
      energy: initialEnergy(r.ctl, tsb, 'sano'),
      matches: matchCount(eff, tsb, false),
      tsb,
      orders: orders.get(r.riderId) ?? NEUTRAL,
      gcDeficitSeconds: 0,
      bib: r.bib,
      fragility: r.fragility,
      teamId: r.teamId,
    }
  })
  // Una crono a mitad de vuelta se corre con general (el último sale el líder, a 120 s), y el banco no
  // la tiene: es la general inventada del juez de ejecutabilidad (juez-ejec/crono_gc.mjs), con la
  // que §8.3 y §9.4 midieron la e16, un orden sembrado con 7 s entre dos puestos.
  if (stage.timeTrial === true && stage.index > 1) {
    const rng = seededRng(`gc-${run}`)
    const order = riders.map((r) => ({ r, k: rng() })).sort((a, b) => a.k - b.k)
    order.forEach((x, i) => {
      x.r.gcDeficitSeconds = i * 7
      x.r.gcRank = i + 1
    })
  }
  return {
    input: { profile: stage.profile, riders, timeTrial: stage.timeTrial === true },
    seed: stageSeed({ worldSeed, raceId: race.id, stageDay: stage.index, engineVersion: 1 }),
  }
}

// --------------------------------------------------------------------------------- la medida

const ZONES = ['>50', '50-20', '20-5', '5-1', '1-0']
const zoneOf = (toGo) => (toGo > 50 ? 0 : toGo > 20 ? 1 : toGo > 5 ? 2 : toGo > 1 ? 3 : 4)

/** La curva sobre el reloj de la cabeza `H` ([km, s]), por décimas de km y repartida por zona. */
function wallByZone(H, L, zones) {
  const wall = [0, 0, 0, 0, 0]
  for (let i = 1; i < H.length; i++) {
    const [k0, t0] = H[i - 1]
    const [k1, t1] = H[i]
    const n = Math.max(1, Math.round((k1 - k0) / 0.1))
    for (let j = 0; j < n; j++) {
      const toGo = L - (k0 + ((k1 - k0) * (j + 0.5)) / n)
      wall[zoneOf(toGo)] += (t1 - t0) / n / paceAt(toGo, zones)
    }
  }
  return { wall, total: wall.reduce((a, b) => a + b, 0) }
}

/** La cabeza de la etapa ([km, s de carrera] por km de foto, la meta incluida) y su perfil por km. */
function roadHead(race, stage, run) {
  if (CLOCK === 'linea') {
    const { tl } = recordBankStage(race, stage, run)
    return {
      L: tl.lengthKm,
      H: lineHeadTrack(tl),
      altM: tl.profile.altM,
      raceS: tl.finish.finishS,
    }
  }
  const { input, seed } = bankStage(race, stage, run)
  const L = stageLengthKm(input.profile)
  const collector = raceRadioCollector(radioKmPoints(L))
  const output = simulateStage(input, seed, collector.probe)
  const stored = radioForStorage(collector.radio({ incidents: output.incidents }))
  const winnerS = Math.min(
    ...output.results.filter((r) => r.estado === 'finish' && r.tiempoS > 0).map((r) => r.tiempoS),
  )
  const head = storedHeadClock(stored.kms, L, winnerS)
  if (head === null) return null
  const H = head.kms.map((p, k) => [p.km, head.head[k]])
  H.push([L, head.head[head.head.length - 1]])
  return { L, H, altM: altMOf(input.profile).altM, raceS: winnerS }
}

function measureRoad(race, stage, run, label) {
  const head = roadHead(race, stage, run)
  if (head === null) return { kind: 'sin reloj' }
  const { L, H, altM, raceS } = head
  const watch = wallByZone(H, L, PACE)
  const highlights = wallByZone(H, L, SUMMARY_PACE)
  const digest = wallByZone(H, L, digestPace(strip(altM), stage.kind))
  const estimateS = playbackEstimateS(strip(altM), PACE)
  return {
    kind: 'road',
    stageKind: stage.kind,
    label,
    km: L,
    raceS,
    last5GradePct: last5Pct(altM, L),
    watchS: watch.total,
    zonesS: watch.wall,
    last5Pct: (100 * (watch.wall[3] + watch.wall[4])) / watch.total,
    highlightsS: highlights.total,
    digestS: digest.total,
    digestBudgetS: DIGEST_BUDGET_S[stage.kind],
    estimateS,
  }
}

/**
 * El plan de una crono, el borde de la meta (la última llegada) y la hora del último km del último en
 * salir: de su traza en la línea grabada; con el reloj del adaptador, de los resultados y el perfil.
 */
function timeTrialRun(race, stage, run) {
  if (CLOCK === 'linea') {
    const { tl } = recordBankStage(race, stage, run)
    const plan = { riders: tl.riderIds.length, intervalS: tl.tt.intervalS }
    // el último en salir y su llegada: su salida del plan más su reloj en la meta (9-a)
    const lastStartDs = Math.max(...tl.tt.startDs)
    const r = tl.tt.startDs.indexOf(lastStartDs)
    return {
      plan,
      mode: tl.tt.order === 'gc' ? 'general' : 'dorsales',
      endS: tl.finish.finishS,
      lastKmFromS: ttLastKmFromS(tl),
      lastRideEndS: (lastStartDs + tl.tt.kmClockDs[r].at(-1)) / 10,
      altM: tl.profile.altM,
      km: tl.lengthKm,
    }
  }
  const { input, seed } = bankStage(race, stage, run)
  const output = simulateStage(input, seed)
  const order = timeTrialStartOrder(
    input.riders.map((r) => ({
      riderId: r.riderId,
      gcDeficitSeconds: r.gcDeficitSeconds,
      gcRank: r.gcRank ?? null,
      bib: r.bib,
    })),
  )
  const plan = { riders: order.slots.length, intervalS: order.intervalS }
  const startOf = new Map(order.slots.map((s) => [s.riderId, s.startS]))
  const rides = output.results
    .filter((r) => Number.isFinite(r.tiempoS) && r.tiempoS > 0)
    .map((r) => ({ startS: startOf.get(r.riderId), tiempoS: r.tiempoS }))
  const endS = Math.max(...rides.map((x) => x.startS + x.tiempoS))
  const last = rides.reduce((a, b) => (b.startS > a.startS ? b : a))
  // La hora a la que el último en salir entra en su último km entero, repartiendo su tiempo real por
  // el perfil a las velocidades nominales (sin la traza de la línea, no hay otra cosa causal).
  const { altM, blocks } = altMOf(input.profile)
  const lastWholeKm = blocks % 10 === 0 ? blocks / 10 - 1 : Math.floor(blocks / 10)
  let before = 0
  let total = 0
  for (let k = 0; k < altM.length - 1; k++) {
    const share = k === altM.length - 2 ? (blocks - 10 * k) / 10 : 1
    const s = (share * 3600) / nominalKmh((altM[k + 1] - altM[k]) / 10)
    total += s
    if (k < lastWholeKm) before += s
  }
  return {
    plan,
    mode: order.mode,
    endS,
    lastKmFromS: last.startS + last.tiempoS * (before / total),
    lastRideEndS: last.startS + last.tiempoS,
    altM,
    km: stageLengthKm(input.profile),
  }
}

function measureTimeTrial(race, stage, run) {
  const tt = timeTrialRun(race, stage, run)
  const watchS = ttWallS(tt.plan, tt.endS, tt.lastKmFromS)
  const estimateS = ttPlaybackEstimateS(strip(tt.altM), tt.plan)
  return {
    kind: 'tt',
    stageKind: stage.kind,
    km: tt.km,
    riders: tt.plan.riders,
    intervalS: tt.plan.intervalS,
    mode: tt.mode,
    raceS: tt.endS,
    lastKmS: tt.lastRideEndS - tt.lastKmFromS,
    watchS,
    // 8-m: en una crono, Highlights y el digest son una sola curva, `ttPaceAt` escalada para que la
    // estimación nominal dure su presupuesto (`ttDigestScale`).
    digestS: watchS / ttDigestScale(strip(tt.altM), tt.plan),
    digestBudgetS: DIGEST_BUDGET_S.cri,
    estimateS,
  }
}

const BENCH = [
  ['race-france', 'all'],
  ['race-flanders', [1]],
  ['race-tramuntana', [1]],
  ['race-colombia', [5]],
]

const rows = []
for (const [raceId, days] of BENCH) {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  const list = days === 'all' ? race.stages.map((_, i) => i + 1) : days
  for (const day of list) {
    const stage = race.stages[day - 1]
    const label = calendarStageSpec(stage, stageLengthKm(stage.profile)).label
    for (const run of RUNS) {
      const m =
        stage.timeTrial === true
          ? measureTimeTrial(race, stage, run)
          : measureRoad(race, stage, run, label)
      rows.push({ stage: `${raceId} e${day}`, run, label, ...m })
      process.stderr.write(`  ${raceId} e${day} semilla ${run}\n`)
    }
  }
}

// ----------------------------------------------------------------------------------- el informe

const mmss = (s) => {
  const r = Math.round(s)
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`
}
/** Lo mínimo y lo máximo de las semillas; `sep` cambia a « a » cuando los números llevan signo. */
const range = (xs, f, sep = '-') => {
  const lo = f(Math.min(...xs))
  const hi = f(Math.max(...xs))
  return lo === hi ? lo : `${lo}${sep}${hi}`
}
const pct = (x) => String(Math.round(x))
const secs = (xs) => `${range(xs, (x) => String(Math.round(x)))} s`
const signedSecs = (xs) =>
  `${range(xs, (x) => `${Math.round(x) > 0 ? '+' : ''}${Math.round(x)}`, ' a ')} s`
const byStage = new Map()
for (const r of rows) {
  if (!byStage.has(r.stage)) byStage.set(r.stage, [])
  byStage.get(r.stage).push(r)
}
const isSummit = (r) => r.label === 'Summit finish'
/** Los finales en subida, a los que se pide el 35 % (decidido en el 3a, arriba). */
const isClimbingFinish = (r) => isSummit(r) && r.last5GradePct >= CLIMBING_FINISH_MIN_PCT

console.log(
  `\nB17 · el ritmo medido · motor v${ENGINE_VERSION} · semillas ${RUNS.join(', ')} · ${CLOCK === 'linea' ? 'la línea grabada (startRecording; la cabeza, su menor marca por km de foto)' : 'reloj estimado del adaptador (§3.8, storedHeadClock)'} · curva de packages/shared\n`,
)
console.log(
  `| Etapa | Etiqueta | km | sube en los últimos 5 km | \`Watch\` | ${ZONES.map((z) => `${z} km`).join(' | ')} | últimos 5 km, % | \`Highlights\` | digest (presupuesto) | anunciada · error |`,
)
console.log(
  `| --- | --- | --- | --- | --- | ${ZONES.map(() => '---').join(' | ')} | --- | --- | --- | --- |`,
)
for (const [stage, rs] of byStage) {
  const road = rs.filter((r) => r.kind === 'road')
  if (road.length === 0) continue
  const zones = ZONES.map((_, z) =>
    range(
      road.map((r) => r.zonesS[z]),
      mmss,
    ),
  ).join(' | ')
  console.log(
    `| ${stage} | ${road[0].label} | ${Math.round(road[0].km)} | ${road[0].last5GradePct.toFixed(1)} % | ${range(
      road.map((r) => r.watchS),
      mmss,
    )} | ${zones} | ${range(
      road.map((r) => r.last5Pct),
      pct,
    )} | ${range(
      road.map((r) => r.highlightsS),
      mmss,
    )} | ${range(
      road.map((r) => r.digestS),
      mmss,
    )} (${mmss(road[0].digestBudgetS)}) | ${mmss(road[0].estimateS)} · ${signedSecs(road.map((r) => r.estimateS - r.watchS))} |`,
  )
}
console.log(
  '\n| Crono | km | salida | `Watch` | último km del último | digest (presupuesto) | anunciada · error |',
)
console.log('| --- | --- | --- | --- | --- | --- | --- |')
for (const [stage, rs] of byStage) {
  const tt = rs.filter((r) => r.kind === 'tt')
  if (tt.length === 0) continue
  console.log(
    `| ${stage} | ${tt[0].km.toFixed(1)} | ${tt[0].riders} por ${tt[0].mode === 'general' ? 'la general' : 'dorsales'} a ${tt[0].intervalS} s | ${range(
      tt.map((r) => r.watchS),
      mmss,
    )} | ${secs(tt.map((r) => r.lastKmS))} | ${range(
      tt.map((r) => r.digestS),
      mmss,
    )} (${mmss(tt[0].digestBudgetS)}) | ${mmss(tt[0].estimateS)} · ${signedSecs(tt.map((r) => r.estimateS - r.watchS))} |`,
  )
}

// Las bandas de 8-k.
const road = rows.filter((r) => r.kind === 'road')
const tts = rows.filter((r) => r.kind === 'tt')
const failures = []
const band = (name, xs, ok, show) => {
  const bad = xs.filter((r) => !ok(r))
  if (bad.length > 0) failures.push(name)
  console.log(
    `- ${bad.length === 0 ? 'EN BANDA' : 'FUERA'} · ${name}: ${bad.length === 0 ? 'todas' : bad.map((r) => `${r.stage} s${r.run} ${show(r)}`).join('; ')}`,
  )
}
const quantile = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]
}
console.log('\nLas bandas de 8-k:')
band(
  '`Watch` en línea, de 6:00 a 22:00',
  road,
  (r) => r.watchS >= 360 && r.watchS <= 1320,
  (r) => mmss(r.watchS),
)
band(
  '`Highlights` en línea, de 1:45 a 7:30',
  road,
  (r) => r.highlightsS >= 105 && r.highlightsS <= 450,
  (r) => mmss(r.highlightsS),
)
band(
  'los últimos 5 km, al menos el 15 % de `Watch`',
  road,
  (r) => r.last5Pct >= 15,
  (r) => `${pct(r.last5Pct)} %`,
)
band(
  `los últimos 5 km de un final en subida (\`Summit finish\` y ≥ ${CLIMBING_FINISH_MIN_PCT} % en ellos), al menos el 35 %`,
  road.filter(isClimbingFinish),
  (r) => r.last5Pct >= 35,
  (r) => `${pct(r.last5Pct)} %`,
)
band(
  'la crono, de 5:00 a 13:00',
  tts,
  (r) => r.watchS >= 300 && r.watchS <= 780,
  (r) => mmss(r.watchS),
)
band(
  'el digest, a menos del 40 % de su presupuesto',
  rows,
  (r) => Math.abs(r.digestS - r.digestBudgetS) < 0.4 * r.digestBudgetS,
  (r) => `${mmss(r.digestS)} de ${mmss(r.digestBudgetS)}`,
)
const errs = road.filter((r) => !isSummit(r)).map((r) => Math.abs(r.estimateS - r.watchS))
const errP90 = quantile(errs, 0.9)
if (!(errP90 < 60)) failures.push('estimateS')
console.log(
  `- ${errP90 < 60 ? 'EN BANDA' : 'FUERA'} · el error de \`estimateS\` fuera de los finales en alto, p90 < 60 s: p90 ${Math.round(errP90)} s (mediana ${Math.round(quantile(errs, 0.5))} s, ${errs.length} corridas)`,
)

const sum = (xs, f) => `${mmss(Math.min(...xs.map(f)))} a ${mmss(Math.max(...xs.map(f)))}`
console.log(
  `\nEn resumen: \`Watch\` en línea de ${sum(road, (r) => r.watchS)}; \`Highlights\` de ${sum(road, (r) => r.highlightsS)}; los últimos 5 km, del ${pct(Math.min(...road.map((r) => r.last5Pct)))} al ${pct(Math.max(...road.map((r) => r.last5Pct)))} % (en los finales en subida, del ${pct(Math.min(...road.filter(isClimbingFinish).map((r) => r.last5Pct)))} al ${pct(Math.max(...road.filter(isClimbingFinish).map((r) => r.last5Pct)))} %); la crono de ${sum(tts, (r) => r.watchS)}.`,
)
if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify({ engineVersion: ENGINE_VERSION, runs: RUNS, clock: CLOCK, rows }, null, 1),
  )
  console.log(`(volcado en ${JSON_OUT})`)
}
if (failures.length > 0) {
  console.log(`\nFUERA DE BANDA: ${failures.join(', ')}`)
  process.exitCode = 1
}
