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
 * El campo es el MISMO que el de la Race Radio (`scripts/race-radio.mjs`), para que las dos
 * herramientas hablen de las mismas carreras. Lee del `dist` compilado, como `pnpm sim`.
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
import { autoStageOrders } from '../packages/engine/dist/world/autoOrders.js'
import { generateNpcRider, sampleNpcAge } from '../packages/engine/dist/world/npc.js'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] != null ? Number(process.argv[i + 1]) : dflt
}
const RACES = arg('races', 12)
const RUNS = arg('runs', 3)
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

function runStage(race, stage, run) {
  const worldSeed = `caza-${race.id}-${run}`
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
if (total === 0) {
  console.log('Ninguna caza con autor en el recorte pedido.')
  process.exit(0)
}
const oneTeam = rows.filter((r) => r.teams === 1).length
const multi = rows.filter((r) => r.teams > 1).length
const overflow = rows.filter((r) => r.teams > r.namedTeams).length
const mismatch = rows.filter((r) => r.namedTeams !== r.named).length
const dist = new Map()
for (const r of rows) dist.set(r.teams, (dist.get(r.teams) ?? 0) + 1)
const pct = (n) => `${((100 * n) / total).toFixed(1)} %`

console.log(`Cazas con autor: ${total} (${races.length} carreras × ${RUNS} corridas)`)
console.log(`  la firma UN equipo:                      ${oneTeam} (${pct(oneTeam)})`)
console.log(`  la firman VARIOS equipos:                ${multi} (${pct(multi)})`)
console.log(`  cazaron más equipos de los que caben:    ${overflow} (${pct(overflow)})`)
console.log(`  un nombre nombra a dos del mismo equipo: ${mismatch} (${pct(mismatch)})`)
console.log(
  `  equipos que cazan: ${[...dist]
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => `${k}→${v}`)
    .join(' · ')}`,
)
