#!/usr/bin/env node
/**
 * ¿A QUIÉN NOMBRA LA CAZA? — medida de la v28.
 *
 * `chase_work` nombraba a los tres corredores que más habían puesto en una persecución. Cuando
 * cazaban tres equipos, eso repartía un nombre por escuadra y la frase acababa contando individuos.
 * La v28 suma el trabajo POR EQUIPO y nombra a los equipos. Esto lo mide sobre el banco: cuántas
 * cazas las firma un equipo, cuántas varios, y cuántas escuadras cazaron de verdad frente a las que
 * caben en la frase.
 *
 * Lee del `dist` compilado, como `pnpm sim` y la Race Radio.
 *
 *   pnpm --filter @cyclingstar/engine build
 *   node scripts/medir-caza.mjs [--races 12] [--runs 3]
 */
import { ATTRIBUTES, seededRng } from '../packages/shared/dist/index.js'
import { eff0, initialEnergy } from '../packages/engine/dist/banister.js'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { matchCount } from '../packages/engine/dist/stage/physics.js'
import { stageSeed } from '../packages/engine/dist/stage/rng.js'
import { simulateStage } from '../packages/engine/dist/stage/simulate.js'
import { autoStageOrders } from '../packages/engine/dist/stage/orders.js'
import { generateRiderGenome } from '../packages/engine/dist/world/genome.js'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] != null ? Number(process.argv[i + 1]) : dflt
}
const RACES = arg('races', 12)
const RUNS = arg('runs', 3)
const NEUTRAL = { agresividad: 50, ritmo: 50, riesgo: 50, colaboracion: 50 }

/** Un campo sembrado: 20 equipos de 7, con su genoma y su forma. */
function buildField(worldSeed, size) {
  const rng = seededRng(`${worldSeed}:campo`)
  const out = []
  const teams = Math.max(2, Math.round(size / 7))
  for (let i = 0; i < size; i++) {
    const teamId = `eq-${i % teams}`
    const g = generateRiderGenome(`${worldSeed}:${i}`, 'fondo')
    const ctl = 55 + 25 * rng()
    out.push({
      riderId: `c-${i}`,
      teamId,
      attrs: g.attributes,
      ctl,
      atl: ctl * (0.7 + 0.3 * rng()),
      morale: 50,
      fragility: g.hidden.fragility,
      bib: i + 1,
    })
  }
  return out
}

function runStage(race, stage, run) {
  const worldSeed = `caza-${race.id}-${run}`
  const field = buildField(worldSeed, race.level === 'WT' ? 154 : 119)
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
  const teamOf = new Map(field.map((r) => [r.riderId, r.teamId]))
  const out = simulateStage(
    { profile: stage.profile, riders, timeTrial: stage.timeTrial === true },
    stageSeed({ worldSeed, raceId: race.id, stageDay: stage.index, engineVersion: 1 }),
  )
  return out.events
    .filter((e) => e.plantilla === 'chase_work')
    .map((e) => ({
      named: e.protagonistas.length,
      namedTeams: new Set(e.protagonistas.map((id) => teamOf.get(id) ?? id)).size,
      teams: Number(e.datos?.teams ?? 0),
    }))
}

const races = SEASON_CALENDAR.filter((r) => r.stages.length >= 3).slice(0, RACES)
const rows = []
for (const race of races) {
  for (const stage of race.stages) {
    if (stage.timeTrial) continue
    for (let run = 0; run < RUNS; run++) rows.push(...runStage(race, stage, run))
  }
}

const total = rows.length
const oneTeam = rows.filter((r) => r.teams === 1).length
const multi = rows.filter((r) => r.teams > 1).length
const overflow = rows.filter((r) => r.teams > r.namedTeams).length
const dist = new Map()
for (const r of rows) dist.set(r.teams, (dist.get(r.teams) ?? 0) + 1)

console.log(`Cazas con autor medidas: ${total} (${races.length} carreras × ${RUNS} corridas)`)
console.log(`  la firma UN equipo:      ${oneTeam} (${((100 * oneTeam) / total).toFixed(1)} %)`)
console.log(`  la firman VARIOS:        ${multi} (${((100 * multi) / total).toFixed(1)} %)`)
console.log(
  `  cazaron más equipos de los que caben en la frase: ${overflow} (${((100 * overflow) / total).toFixed(1)} %)`,
)
console.log(
  `  reparto de equipos que cazan: ${[...dist]
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => `${k}→${v}`)
    .join(' · ')}`,
)
console.log(
  `  nombres por evento (mediana de protagonistas): ${
    [...rows].map((r) => r.named).sort((a, b) => a - b)[Math.floor(total / 2)]
  }`,
)
