#!/usr/bin/env node
/**
 * B17 · EL RITMO MEDIDO (docs/retransmision.md §8.9, §16.4 y §17.3; E2, paso 0: la línea base).
 *
 * Cuánto dura en pantalla cada etapa del banco con las curvas de la retransmisión, y si cada duración
 * cae en su banda (decisión 8-k). Corre `BROADCAST.pace` (`Watch`), `summaryPace` (`Highlights`) y
 * `ttPace` (la crono) con los valores de §15.3 sobre las 24 etapas del mapa 07 §7 —las 21 de
 * `race-france`, `race-flanders`, `race-tramuntana` y `race-colombia` e5— y, por defecto, con las
 * semillas 0 y 1 del banco de `scripts/race-radio.mjs` (mismo campo, misma semilla de etapa).
 *
 * HASTA EL PASO 3a ESTE SCRIPT LLEVA SU PROPIA COPIA DE LA CURVA (decisión 17-c): `paceAt`,
 * `playbackEstimateS`, `digestPace` y `ttPaceAt` no existen todavía en `packages/shared`. Las de abajo
 * son las de §8.2 y §9.4, letra a letra, con las constantes de §15.3. En el 3a pasa a importar
 * `paceAt` y las demás, y la cifra no se puede mover: si se mueve, una de las dos copias está mal.
 *
 * El reloj de la cabeza es el ESTIMADO, el del adaptador de la radio (§3.8): la velocidad del grupo en
 * cabeza de cada foto de la radio guardada (`radioForStorage`, como `stageRun.ts`), integrada y
 * reescalada para que la meta caiga en el tiempo del ganador. Es el reloj que tendrán las etapas sin
 * línea grabada; en el 10b, B17 se vuelve a correr sobre la línea grabada.
 *
 * La crono no tiene radio: su ritmo va por la fracción de salidos, que solo pide el plan de salida
 * público (`timeTrialStartOrder`) y la llegada de cada uno (`results`). La hora a la que el último en
 * salir entra en su último km entero (`lastKmFromS` de §9.4) sale de la traza, que el motor no da
 * hasta el paso 4: aquí se estima repartiendo su tiempo real por el perfil a las velocidades
 * nominales (`nominalKmh`), y el 4b la tendrá exacta. El banco corre cada etapa sin general; la
 * crono de mitad de vuelta (la e16) se corre con la general inventada del juez de ejecutabilidad
 * (`juez-ejec/crono_gc.mjs`), la misma con la que §8.3 y §9.4 la midieron: sale el líder el último,
 * a 120 s.
 *
 * Las bandas (8-k): `Watch` de 6:00 a 22:00 en línea; `Highlights` de 1:45 a 7:30 en línea; los
 * últimos 5 km, al menos el 15 % de `Watch` en línea y el 35 % en los finales en alto (la etiqueta
 * `Summit finish` de la API); la crono, de 5:00 a 13:00; el digest, a menos del 40 % de su
 * presupuesto; y el error de la duración anunciada (`estimateS`), con p90 por debajo de 60 s en las
 * etapas en línea que no acaban en alto.
 *
 * Uso (hacen falta los `dist` de packages/* y de apps/api):
 *   pnpm exec tsc -b
 *   node scripts/bench-pace.mjs [--runs 0,1] [--json fichero.json]
 *
 * Sale con código 1 si alguna duración se sale de su banda.
 */
import { writeFileSync } from 'node:fs'
import { ATTRIBUTES, seededRng } from '../packages/shared/dist/index.js'
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

// ------------------------------------------- la copia de la curva y sus constantes (§15.3, 17-c)

/** `BROADCAST.pace`: s de carrera por s de pared con la cabeza a más de `aboveKm` de meta. */
const PACE = [
  { aboveKm: 50, x: 60 },
  { aboveKm: 20, x: 30 },
  { aboveKm: 5, x: 12 },
  { aboveKm: 1, x: 4 },
  { aboveKm: 0, x: 1.5 },
]
/** `BROADCAST.summaryPace` (`Highlights`), la misma forma. */
const SUMMARY_PACE = [
  { aboveKm: 50, x: 300 },
  { aboveKm: 20, x: 120 },
  { aboveKm: 5, x: 40 },
  { aboveKm: 1, x: 10 },
  { aboveKm: 0, x: 3 },
]
/** `BROADCAST.digestBudgetS`: s de pared por etapa en el digest, por tipo de etapa. */
const DIGEST_BUDGET_S = { llana: 60, media: 90, reina: 150, cri: 120, clasica: 150 }
/** `BROADCAST.ttPace`: s de carrera por s de pared mientras la fracción de salidos es ≤ `upToStarted`. */
const TT_PACE = [
  { upToStarted: 0.6, x: 120 },
  { upToStarted: 0.9, x: 40 },
  { upToStarted: 1, x: 12 },
]
/** `BROADCAST.ttLastKmX`: el último km del último en salir. */
const TT_LAST_KM_X = 2
/** `BROADCAST.nominalKmh`: km/h por pendiente media del km, para la duración anunciada. */
const NOMINAL_KMH = [
  { upToPct: -4, kmh: 56 },
  { upToPct: -1.5, kmh: 47 },
  { upToPct: 1.5, kmh: 44 },
  { upToPct: 4, kmh: 37 },
  { upToPct: 7, kmh: 22 },
  { upToPct: Infinity, kmh: 16 },
]
const nominalKmh = (pct) => NOMINAL_KMH.find((b) => pct <= b.upToPct).kmh

/** §8.2: la primera zona con `toGoKm > aboveKm`; en la línea, la del último km. */
function paceAt(toGoKm, zones) {
  for (const z of zones) if (toGoKm > z.aboveKm) return z.x
  return zones[zones.length - 1].x
}

/** §8.2: la duración a ×1 que anuncia la ficha, solo con el perfil (`altM`) y las velocidades nominales. */
function playbackEstimateS(altM, zones) {
  const km = altM.length - 1
  let wall = 0
  for (let k = 0; k < km; k++) {
    const pct = (altM[k + 1] - altM[k]) / 10
    const raceS = 3600 / nominalKmh(pct)
    for (let j = 0; j < 10; j++) wall += raceS / 10 / paceAt(km - k - (j + 0.5) / 10, zones)
  }
  return wall
}

/** §8.2: el digest, `summaryPace` escalada para que la estimación nominal dure su presupuesto. */
function digestPace(altM, kind) {
  const k = playbackEstimateS(altM, SUMMARY_PACE) / DIGEST_BUDGET_S[kind]
  return SUMMARY_PACE.map((z) => ({ aboveKm: z.aboveKm, x: z.x * k }))
}

/** §9.4: el `paceAt` de la crono, por fracción de salidos y con el último km del último a ×2. */
function ttPaceAt(t, plan, lastKmFromS) {
  if (lastKmFromS !== null && t >= lastKmFromS) return TT_LAST_KM_X
  const started =
    Math.min(plan.riders, Math.floor(Math.max(0, t) / plan.intervalS) + 1) / plan.riders
  return (TT_PACE.find((z) => started <= z.upToStarted) ?? TT_PACE.at(-1)).x
}

/** ∫ de 0 a `end` de 1 / ttPaceAt: exacta, por tramos, porque la curva cambia en saltos. */
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

/** §9.4: la duración que se anuncia de una crono, solo con el plan y el perfil. */
function ttPlaybackEstimateS(altM, plan) {
  const km = altM.length - 1
  let rodaje = 0
  for (let k = 0; k < km; k++) rodaje += 3600 / nominalKmh((altM[k + 1] - altM[k]) / 10)
  const ultimo = 3600 / nominalKmh((altM[km] - altM[km - 1]) / 10)
  const fin = (plan.riders - 1) * plan.intervalS + rodaje
  return ttWallS(plan, fin, fin - ultimo)
}

// ----------------------------------------------- el reloj estimado de la cabeza (§3.8, la copia)

function headSpeed(photo) {
  const v = photo.groups[0]?.speedKmh ?? null
  return v !== null && v > 0 ? v : null
}

/** §3.8: el reloj de la cabeza en cada foto y en meta, o null si ninguna foto tiene velocidad. */
function estimatedHeadClock(kms, totalKm, winnerS) {
  let v = null
  for (const photo of kms) {
    v = headSpeed(photo)
    if (v !== null) break
  }
  if (v === null) return null
  const raw = [0]
  for (let k = 0; k < kms.length; k++) {
    const here = kms[k]
    const nextKm = k + 1 < kms.length ? kms[k + 1].km : totalKm
    v = headSpeed(here) ?? v
    raw.push(raw[raw.length - 1] + ((nextKm - here.km) / v) * 3600)
  }
  const scale = winnerS / raw[raw.length - 1]
  return { clock: raw.map((s) => s * scale), scale }
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

function measureRoad(race, stage, run, label) {
  const { input, seed } = bankStage(race, stage, run)
  const L = stageLengthKm(input.profile)
  const collector = raceRadioCollector(radioKmPoints(L))
  const output = simulateStage(input, seed, collector.probe)
  const stored = radioForStorage(collector.radio({ incidents: output.incidents }))
  const winnerS = Math.min(
    ...output.results.filter((r) => r.estado === 'finish' && r.tiempoS > 0).map((r) => r.tiempoS),
  )
  const head = estimatedHeadClock(stored.kms, L, winnerS)
  if (head === null) return { kind: 'sin reloj' }
  const H = stored.kms.map((p, k) => [p.km, head.clock[k]])
  H.push([L, head.clock[head.clock.length - 1]])
  const watch = wallByZone(H, L, PACE)
  const highlights = wallByZone(H, L, SUMMARY_PACE)
  const { altM } = altMOf(input.profile)
  const digest = wallByZone(H, L, digestPace(altM, stage.kind))
  const estimateS = playbackEstimateS(altM, PACE)
  return {
    kind: 'road',
    stageKind: stage.kind,
    label,
    km: L,
    raceS: winnerS,
    scale: head.scale,
    watchS: watch.total,
    zonesS: watch.wall,
    last5Pct: (100 * (watch.wall[3] + watch.wall[4])) / watch.total,
    highlightsS: highlights.total,
    digestS: digest.total,
    digestBudgetS: DIGEST_BUDGET_S[stage.kind],
    estimateS,
  }
}

function measureTimeTrial(race, stage, run) {
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
  // el perfil a las velocidades nominales (sin la traza del paso 4, no hay otra cosa causal).
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
  const lastKmFromS = last.startS + last.tiempoS * (before / total)
  const watchS = ttWallS(plan, endS, lastKmFromS)
  const estimateS = ttPlaybackEstimateS(altM, plan)
  return {
    kind: 'tt',
    stageKind: stage.kind,
    km: stageLengthKm(input.profile),
    riders: plan.riders,
    intervalS: plan.intervalS,
    mode: order.mode,
    raceS: endS,
    lastKmS: last.startS + last.tiempoS - lastKmFromS,
    watchS,
    // 8-m: en una crono, Highlights y el digest son una sola curva, ttPaceAt escalada para que la
    // estimación nominal dure su presupuesto.
    digestS: (watchS * DIGEST_BUDGET_S.cri) / estimateS,
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

console.log(
  `\nB17 · línea base del ritmo · motor v${ENGINE_VERSION} · semillas ${RUNS.join(', ')} · reloj estimado del adaptador (§3.8) · curva copiada (17-c)\n`,
)
console.log(
  `| Etapa | Etiqueta | km | \`Watch\` | ${ZONES.map((z) => `${z} km`).join(' | ')} | últimos 5 km, % | \`Highlights\` | digest (presupuesto) | anunciada · error |`,
)
console.log(
  `| --- | --- | --- | --- | ${ZONES.map(() => '---').join(' | ')} | --- | --- | --- | --- |`,
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
    `| ${stage} | ${road[0].label} | ${Math.round(road[0].km)} | ${range(
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
  'los últimos 5 km de un final en alto, al menos el 35 %',
  road.filter(isSummit),
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
  `\nEn resumen: \`Watch\` en línea de ${sum(road, (r) => r.watchS)}; \`Highlights\` de ${sum(road, (r) => r.highlightsS)}; los últimos 5 km, del ${pct(Math.min(...road.map((r) => r.last5Pct)))} al ${pct(Math.max(...road.map((r) => r.last5Pct)))} % (en alto, del ${pct(Math.min(...road.filter(isSummit).map((r) => r.last5Pct)))} al ${pct(Math.max(...road.filter(isSummit).map((r) => r.last5Pct)))} %); la crono de ${sum(tts, (r) => r.watchS)}; el reloj estimado, reescalado por ${Math.min(...road.map((r) => r.scale)).toFixed(4)}-${Math.max(...road.map((r) => r.scale)).toFixed(4)}.`,
)
if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify({ engineVersion: ENGINE_VERSION, runs: RUNS, rows }, null, 1),
  )
  console.log(`(volcado en ${JSON_OUT})`)
}
if (failures.length > 0) {
  console.log(`\nFUERA DE BANDA: ${failures.join(', ')}`)
  process.exitCode = 1
}
