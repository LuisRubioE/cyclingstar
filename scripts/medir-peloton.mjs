#!/usr/bin/env node
/**
 * ¿CUÁNTAS VECES EL «PELOTÓN» NO ERA EL PELOTÓN? — medida de la v29.
 *
 * Los grupos del motor se llamaban por su ORIGEN: el que salió del pelotón seguía llamándose así
 * aunque le quedaran dos corredores, y el que se descolgó seguía siendo «grupeto» aunque llevara
 * cien. Esto compara, foto a foto, la etiqueta VIEJA (el id `peloton`) con la NUEVA (el grupo que
 * lleva la gente) sobre las etapas del banco, y cuenta dónde discrepan y cuánto.
 *
 *   pnpm --filter @cyclingstar/engine build
 *   node scripts/medir-peloton.mjs [--races 10] [--runs 1]
 */
import { ATTRIBUTES, seededRng } from '../packages/shared/dist/index.js'
import { eff0, initialEnergy } from '../packages/engine/dist/banister.js'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { matchCount } from '../packages/engine/dist/stage/physics.js'
import { stageSeed } from '../packages/engine/dist/stage/rng.js'
import { simulateStage } from '../packages/engine/dist/stage/simulate.js'
import { stageLengthKm } from '../packages/engine/dist/stage/sample.js'
import { raceRadioCollector, radioKmPoints } from '../packages/engine/dist/sim/raceRadio.js'
import { autoStageOrders } from '../packages/engine/dist/world/autoOrders.js'
import { generateNpcRider, sampleNpcAge } from '../packages/engine/dist/world/npc.js'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] != null ? Number(process.argv[i + 1]) : dflt
}
const RACES = arg('races', 10)
const RUNS = arg('runs', 1)
const NEUTRAL = { agresividad: 50, ritmo: 50, riesgo: 50, colaboracion: 50 }
const VOCATIONS = ['escalada', 'velocidad', 'crono', 'clasicas', 'fondo']

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

function radioOf(race, stage, run) {
  const worldSeed = `pel-${race.id}-${run}`
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
  const input = { profile: stage.profile, riders, timeTrial: stage.timeTrial === true }
  const radio = raceRadioCollector(radioKmPoints(stageLengthKm(stage.profile)))
  simulateStage(
    input,
    stageSeed({ worldSeed, raceId: race.id, stageDay: stage.index, engineVersion: 1 }),
    radio.probe,
  )
  return radio.radio()
}

const races = SEASON_CALENDAR.filter((r) => r.stages.length >= 3).slice(0, RACES)
let fotos = 0
let discrepan = 0
let peorHueco = { d: 0, where: '' }
let peorFalsoPeloton = { size: Number.POSITIVE_INFINITY, where: '' }
let colaMalLlamada = 0

for (const race of races) {
  for (const stage of race.stages) {
    if (stage.timeTrial) continue
    for (let run = 0; run < RUNS; run++) {
      const r = radioOf(race, stage, run)
      for (const row of r.kms) {
        fotos += 1
        const nuevo = row.groups.find((g) => g.kind === 'peloton')
        const viejo = row.groups.find((g) => g.id === 'peloton')
        if (!nuevo || !viejo || nuevo.id === viejo.id) continue
        discrepan += 1
        const d = nuevo.size - viejo.size
        if (d > peorHueco.d) peorHueco = { d, where: `${race.id} e${stage.index} km ${row.km}` }
        if (viejo.size < peorFalsoPeloton.size)
          peorFalsoPeloton = { size: viejo.size, where: `${race.id} e${stage.index} km ${row.km}` }
        // Cuánta gente iba detrás del falso pelotón llamándose grupeto.
        const detras = row.groups.filter((g) => g.tS > viejo.tS).reduce((a, g) => a + g.size, 0)
        if (detras > viejo.size) colaMalLlamada += 1
      }
    }
  }
}

const pct = (n) => `${((100 * n) / fotos).toFixed(2)} %`
console.log(`Fotos de carrera miradas: ${fotos} (${races.length} carreras × ${RUNS} corrida/s)`)
console.log(`  el «pelotón» del id NO era el pelotón: ${discrepan} (${pct(discrepan)})`)
console.log(
  `  …y detrás de él iba MÁS gente que dentro: ${colaMalLlamada} (${pct(colaMalLlamada)})`,
)
console.log(
  `  peor caso por tamaño: el que se llamaba pelotón llevaba ${peorFalsoPeloton.size} · ${peorFalsoPeloton.where}`,
)
console.log(
  `  mayor diferencia de gente entre el bueno y el del id: ${peorHueco.d} corredores · ${peorHueco.where}`,
)
