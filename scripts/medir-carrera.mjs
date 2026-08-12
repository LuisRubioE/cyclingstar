#!/usr/bin/env node
/**
 * MIDE UNA CARRERA DEL CALENDARIO, etapa a etapa: cuántos grupos llegan a meta, cuánta cola (en % del
 * tiempo del ganador) y qué clase de corredor gana. Es la herramienta con la que se compara una
 * carrera ANTES y DESPUÉS de cargarle el recorrido real (docs/fuentes-recorridos.md).
 *
 * No vive en packages/engine/src porque el motor es puro y esto es herramienta de banco: lee del
 * `dist` ya compilado, igual que hace `pnpm sim`.
 *
 * Uso:  pnpm --filter @cyclingstar/engine build && node scripts/medir-carrera.mjs <raceId> [runs]
 */
import { ATTRIBUTES, seededRng } from '../packages/shared/dist/index.js'
import { eff0, initialEnergy } from '../packages/engine/dist/banister.js'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { matchCount } from '../packages/engine/dist/stage/physics.js'
import { stageSeed } from '../packages/engine/dist/stage/rng.js'
import { simulateStage } from '../packages/engine/dist/stage/simulate.js'
import { stageLengthKm } from '../packages/engine/dist/stage/sample.js'
import { autoStageOrders } from '../packages/engine/dist/world/autoOrders.js'
import { generateNpcRider, sampleNpcAge } from '../packages/engine/dist/world/npc.js'

const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']
const NEUTRAL = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

/** El mismo campo que usa el banco de reinas reales (sim/realQueens.ts), para poder comparar. */
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

function runOnce(race, stage, run) {
  const worldSeed = `medir-${race.id}-${run}`
  const field = buildField(worldSeed, race.level)
  const orders = autoStageOrders(
    field.map((r) => ({ riderId: r.riderId, attrs: r.attrs, teamId: r.teamId })),
    { kind: stage.kind, timeTrial: false },
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
      fragility: r.fragility,
      teamId: r.teamId,
    }
  })
  const out = simulateStage(
    { profile: stage.profile, riders },
    stageSeed({ worldSeed, raceId: race.id, stageDay: stage.index, engineVersion: 1 }),
  )
  const timed = out.results.filter((r) => r.estado === 'finish')
  const winnerT = timed[0]?.tiempoS ?? 0
  if (!winnerT) return null
  const last = timed.reduce((mx, r) => Math.max(mx, r.tiempoS), winnerT)
  const byId = new Map(field.map((r) => [r.riderId, r]))
  return {
    groups: new Set(timed.map((r) => r.tiempoS)).size,
    tailPct: (100 * (last - winnerT)) / winnerT,
    winnerVocation: byId.get(timed[0].riderId)?.vocation ?? '?',
    winnerGroupPct: (100 * timed.filter((r) => r.tiempoS === winnerT).length) / timed.length,
    finishers: timed.length,
  }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

const raceId = process.argv[2]
const runs = Number(process.argv[3] ?? 40)
const race = SEASON_CALENDAR.find((r) => r.id === raceId)
if (!race) throw new Error(`No existe ${raceId}`)

console.log(`\n${race.id} (${race.name}) — ${race.stages.length} etapa(s), ${runs} simulaciones`)
console.log(
  '  etapa  km     tipo        grupos(med)      cola%(med)      cola%(peor)  %grupo ganador  gana (1º)',
)
for (const stage of race.stages) {
  if (stage.timeTrial) {
    console.log(
      `  e${String(stage.index).padEnd(6)}${stageLengthKm(stage.profile).toFixed(0).padEnd(7)}crono       (no se mide)`,
    )
    continue
  }
  const rows = []
  for (let run = 0; run < runs; run++) {
    const r = runOnce(race, stage, run)
    if (r) rows.push(r)
  }
  const voc = {}
  for (const r of rows) voc[r.winnerVocation] = (voc[r.winnerVocation] ?? 0) + 1
  const top = Object.entries(voc).sort((a, b) => b[1] - a[1])
  console.log(
    `  e${String(stage.index).padEnd(6)}` +
      `${stageLengthKm(stage.profile).toFixed(0).padEnd(7)}` +
      `${String(stage.label ?? stage.kind).padEnd(12)}` +
      `${median(rows.map((r) => r.groups))
        .toFixed(1)
        .padEnd(17)}` +
      `${median(rows.map((r) => r.tailPct))
        .toFixed(2)
        .padEnd(16)}` +
      `${Math.max(...rows.map((r) => r.tailPct))
        .toFixed(2)
        .padEnd(13)}` +
      `${median(rows.map((r) => r.winnerGroupPct)).toFixed(0)}%`.padEnd(16) +
      `${top.map(([k, n]) => `${k}:${n}`).join(' ')}`,
  )
}
