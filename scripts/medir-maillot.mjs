#!/usr/bin/env node
/**
 * ¿SE VA EL MAILLOT EN LA FUGA DEL DÍA? (banco de la regla 4 con general de verdad).
 *
 * El defecto que mide: en producción (Race Sardegna e2, 136 km llanos) el líder de la general
 * —escalador— salió en la fuga del día y ganó al sprint una etapa de velocistas. `pelotonAllows`
 * (`stage/tactics.ts`) trataba al maillot con un DESCUENTO plano de probabilidad, el mismo que a un
 * rival a 4:10, en vez de con un veto.
 *
 * POR QUÉ HACE FALTA OTRO BANCO. `scripts/medir-carrera.mjs` corre cada etapa con
 * `gcDeficitSeconds` = 0 en todo el campo, así que `hasGcContext` sale FALSO y la maquinaria de la
 * general —la que decide quién es amenaza— no llega a encenderse: ese banco no puede ver este
 * defecto ni para bien ni para mal. Aquí la general se ARRASTRA etapa a etapa, como en producción y
 * como ya hacía `analyzeSharjah` (`sim/tactics.ts`), y por eso desde la etapa 2 hay huecos reales y
 * hay maillot.
 *
 * Mide dos cosas, y las dos hacen falta:
 *
 *  1. LA CUERDA, medida en la propia decisión: `pelotonAllows` llamada directa, N tiradas por
 *     casilla. Es la tabla que separa al líder (0 s) de un rival dentro de la ventana de amenaza y
 *     de uno fuera. Aquí se ve si el motor DISTINGUE al que lleva el maillot, que era el fallo.
 *  2. LA CARRERA, medida en el resultado: una vuelta por etapas completa con su general, contando
 *     en cuántas etapas el maillot acaba en la fuga del día y en cuántas la gana.
 *
 * No vive en packages/engine/src porque el motor es puro y esto es herramienta de banco: lee del
 * `dist` ya compilado, igual que `pnpm sim` y que `scripts/medir-carrera.mjs`.
 *
 * Uso:
 *   pnpm --filter @cyclingstar/engine build
 *   node scripts/medir-maillot.mjs [raceId] [semillas] [tiradas]
 *
 * Por defecto `race-sardegna` (la carrera del parte de producción), 200 semillas y 200.000 tiradas.
 */
import { ATTRIBUTES, seededRng } from '../packages/shared/dist/index.js'
import { eff0, initialEnergy } from '../packages/engine/dist/banister.js'
import { STAGE } from '../packages/engine/dist/constants.js'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { matchCount } from '../packages/engine/dist/stage/physics.js'
import { stageSeed } from '../packages/engine/dist/stage/rng.js'
import { simulateStage } from '../packages/engine/dist/stage/simulate.js'
import { stageLengthKm } from '../packages/engine/dist/stage/sample.js'
import { pelotonAllows } from '../packages/engine/dist/stage/tactics.js'
import { autoStageOrders } from '../packages/engine/dist/world/autoOrders.js'
import { generateNpcRider, sampleNpcAge } from '../packages/engine/dist/world/npc.js'

const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']
const NEUTRAL = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

// --- 1. LA CUERDA: `pelotonAllows` medida directamente -------------------------------------

/**
 * Un corredor de mentira para la capa táctica: `pelotonAllows` solo mira la general y el tamaño del
 * grupo, pero el resto de campos van rellenos para que el tipo sea el de verdad y no una silueta.
 */
function fakeRider(id, gcDeficitSeconds) {
  return {
    riderId: id,
    role: 'libre',
    mentality: 'reservon',
    perfil: 70,
    finishScore: 50,
    energyFraction: 0.8,
    matches: 3,
    tac: 70,
    spr: 60,
    gcDeficitSeconds,
    teamAttack: 1,
  }
}

/** La casilla: probabilidad de que el pelotón dé cuerda, medida a fuerza bruta. */
function allowRate(gcDeficitSeconds, kmToGo, totalKm, size, kind, tiradas) {
  // Un grupo con UN amenazante dentro y el resto sin nada que ver con la general: es la fuga del
  // parte de producción, no un pelotón entero de líderes.
  const move = [fakeRider('amenaza', gcDeficitSeconds)]
  for (let i = 1; i < size; i++) move.push(fakeRider(`peon-${i}`, 3600))
  const ctx = {
    kind,
    kmToGo,
    totalKm,
    groupSize: 120,
    fieldSize: 140,
    onClimb: false,
    tension: 0,
    hasGcContext: true,
  }
  const rng = seededRng(`cuerda:${gcDeficitSeconds}:${kmToGo}:${size}:${kind}`)
  let ok = 0
  for (let i = 0; i < tiradas; i++) if (pelotonAllows(move, ctx, rng)) ok += 1
  return ok / tiradas
}

/** «Si lo intenta N veces, ¿alguna se va?» — que es lo que de verdad decide una etapa. */
const compound = (p, n) => 1 - (1 - p) ** n

function medirCuerda(totalKm, size, tiradas) {
  const ventana = STAGE.gcThreatFraction * STAGE.gcControlLeash
  console.log(
    `\n=== 1. LA CUERDA — \`pelotonAllows\`, ${tiradas.toLocaleString('es')} tiradas/casilla`,
  )
  console.log(
    `    etapa de ${totalKm} km, fuga de ${size}; ventana de amenaza = ${ventana.toFixed(0)} s ` +
      `(${STAGE.gcThreatFraction} × ${STAGE.gcControlLeash})`,
  )
  const puntos = [
    ['km 0', totalKm],
    ['mitad', totalKm / 2],
    ['últimos km', 0],
  ]
  const casos = [
    ['el LÍDER (0 s)', 0, 'fuga'],
    ['un rival a 60 s', 60, 'fuga'],
    ['un rival a 150 s', 150, 'fuga'],
    ['un rival a 250 s', 250, 'fuga'],
    ['sin amenaza (300 s)', 300, 'fuga'],
    ['el LÍDER, ataque final', 0, 'ataque_final'],
  ]
  console.log(`\n    ${'caso'.padEnd(24)}${puntos.map(([n]) => n.padEnd(14)).join('')}`)
  for (const [nombre, deficit, kind] of casos) {
    const ps = puntos.map(([, kmToGo]) => allowRate(deficit, kmToGo, totalKm, size, kind, tiradas))
    console.log(
      `    ${nombre.padEnd(24)}` + ps.map((p) => `${(100 * p).toFixed(1)} %`.padEnd(14)).join(''),
    )
  }
  // Y el dato que convierte «poco probable» en «pasa siempre»: la etapa no hace un intento, hace
  // una docena, y basta con que UNO salga.
  console.log(`\n    compuesto sobre los intentos de una etapa (a la p de la mitad de etapa):`)
  console.log(
    `    ${'caso'.padEnd(24)}${['10 intentos', '20 intentos', '30 intentos'].map((n) => n.padEnd(14)).join('')}`,
  )
  for (const [nombre, deficit, kind] of casos) {
    const p = allowRate(deficit, totalKm / 2, totalKm, size, kind, tiradas)
    console.log(
      `    ${nombre.padEnd(24)}` +
        [10, 20, 30].map((n) => `${(100 * compound(p, n)).toFixed(0)} %`.padEnd(14)).join(''),
    )
  }
}

// --- 2. LA CARRERA: una vuelta por etapas con su general ------------------------------------

/** El mismo campo que el resto de bancos (`sim/realQueens.ts`), para poder comparar. */
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
        vocation,
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

/**
 * Corre la carrera entera ARRASTRANDO LA GENERAL, que es la diferencia con `medir-carrera.mjs`:
 * cada etapa entra con el hueco real de cada corredor y por eso desde la e2 hay maillot que
 * defender.
 */
function runRace(race, run) {
  const worldSeed = `maillot-${race.id}-${run}`
  const field = buildField(worldSeed, race.level)
  const byId = new Map(field.map((r) => [r.riderId, r]))
  const gc = new Map(field.map((r) => [r.riderId, 0]))
  const rows = []

  for (const stage of race.stages) {
    const orders = autoStageOrders(
      field.map((r) => ({ riderId: r.riderId, attrs: r.attrs, teamId: r.teamId })),
      { kind: stage.kind, timeTrial: !!stage.timeTrial },
    )
    const best = Math.min(...gc.values())
    // El maillot de HOY: el que menos tiempo lleva al empezar la etapa.
    const leader = [...gc.entries()].sort((a, b) => a[1] - b[1])[0][0]
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
        gcDeficitSeconds: (gc.get(r.riderId) ?? 0) - best,
        fragility: r.fragility,
        teamId: r.teamId,
      }
    })
    const out = simulateStage(
      { profile: stage.profile, riders, ...(stage.timeTrial ? { timeTrial: true } : {}) },
      stageSeed({ worldSeed, raceId: race.id, stageDay: stage.index, engineVersion: 1 }),
    )
    // ¿Hay general en juego? La misma bandera que mira el motor: hasta que no hay huecos, no hay
    // maillot que defender y esta etapa no cuenta para la medida.
    const hasGc = riders.some((r) => r.gcDeficitSeconds > 0)
    const formed = out.events.find((e) => e.plantilla === 'breakaway_formed')
    const timed = out.results.filter((r) => r.estado === 'finish')
    if (hasGc && !stage.timeTrial) {
      rows.push({
        index: stage.index,
        kind: stage.label ?? stage.kind,
        // La fuga del día se lleva al maillot.
        leaderInBreak: formed ? formed.protagonistas.includes(leader) : false,
        leaderWins: timed[0]?.riderId === leader,
        // El caso del parte: se va Y gana.
        leaderBreakWin:
          (formed ? formed.protagonistas.includes(leader) : false) && timed[0]?.riderId === leader,
        breakSize: formed ? formed.protagonistas.length : 0,
        hadBreak: !!formed,
        winnerVocation: timed[0] ? (byId.get(timed[0].riderId)?.vocation ?? '?') : '?',
        leaderVocation: byId.get(leader)?.vocation ?? '?',
      })
    }
    for (const r of out.results) {
      gc.set(r.riderId, (gc.get(r.riderId) ?? 0) + r.tiempoS - (r.bonificacionS ?? 0))
    }
  }
  return rows
}

function medirCarrera(race, runs) {
  console.log(
    `\n=== 2. LA CARRERA — ${race.id} (${race.name}), ${runs} semillas, general arrastrada`,
  )
  const all = []
  for (let run = 0; run < runs; run++) all.push(...runRace(race, run))
  const conFuga = all.filter((r) => r.hadBreak)
  const enFuga = all.filter((r) => r.leaderInBreak)
  const pct = (n, d) => (d > 0 ? `${((100 * n) / d).toFixed(1)} %` : '—')
  console.log(`    etapas medidas (con general en juego): ${all.length}`)
  console.log(`    …de ellas con fuga del día formada:    ${conFuga.length}`)
  console.log(
    `    EL MAILLOT EN LA FUGA DEL DÍA:        ${enFuga.length}  (${pct(enFuga.length, conFuga.length)} de las que tienen fuga)`,
  )
  console.log(
    `    …y además GANA la etapa:              ${all.filter((r) => r.leaderBreakWin).length}  (el caso del parte)`,
  )
  console.log(
    `    el maillot gana la etapa (de cualquier forma): ${pct(all.filter((r) => r.leaderWins).length, all.length)}`,
  )
  console.log(`\n    por etapa:`)
  console.log(
    `    ${'etapa'.padEnd(8)}${'km'.padEnd(7)}${'tipo'.padEnd(13)}${'con fuga'.padEnd(11)}${'maillot en fuga'.padEnd(18)}${'y gana'}`,
  )
  for (const stage of race.stages) {
    const rs = all.filter((r) => r.index === stage.index)
    if (rs.length === 0) continue
    const cf = rs.filter((r) => r.hadBreak)
    console.log(
      `    e${String(stage.index).padEnd(7)}` +
        `${stageLengthKm(stage.profile).toFixed(0).padEnd(7)}` +
        `${String(rs[0].kind).padEnd(13)}` +
        `${String(cf.length).padEnd(11)}` +
        `${`${rs.filter((r) => r.leaderInBreak).length} (${pct(rs.filter((r) => r.leaderInBreak).length, cf.length)})`.padEnd(18)}` +
        `${rs.filter((r) => r.leaderBreakWin).length}`,
    )
  }
}

// --- Fontanería ----------------------------------------------------------------------------

const raceId = process.argv[2] ?? 'race-sardegna'
const runs = Number(process.argv[3] ?? 200)
const tiradas = Number(process.argv[4] ?? 200_000)
const race = SEASON_CALENDAR.find((r) => r.id === raceId)
if (!race) throw new Error(`No existe ${raceId}`)

const e2 = race.stages[1] ?? race.stages[0]
medirCuerda(Math.round(stageLengthKm(e2.profile)), 4, tiradas)
medirCarrera(race, runs)
console.log()
