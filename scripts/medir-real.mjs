/**
 * LO QUE MIDEN LAS 177 ETAPAS REALES (docs/generador.md §13.3 y decisión 40; propuestas/datos.md §1.4).
 *
 * p10 / p50 / p90 de cada rasgo sobre las etapas con rasgos reales de `STAGE_FEATURES`: la columna
 * «real» de las bandas del censo sale de aquí. Lee el `dist` compilado, como `medir-carrera.mjs`:
 * el motor es puro y esto es herramienta de banco.
 *
 * Uso: pnpm --filter @cyclingstar/engine build && node scripts/medir-real.mjs
 */
import { STAGE_FEATURES } from '../packages/engine/dist/routes/stageFeatures.js'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { RACE_EDITIONS } from '../packages/engine/dist/routes/editions.js'
import { finalKindOf, kmAfterLastClimb } from '../packages/engine/dist/routes/finalKind.js'
import { stageKindOf } from '../packages/engine/dist/routes/stageKind.js'

const q = (arr, p) => {
  if (!arr.length) return NaN
  const s = [...arr].sort((a, b) => a - b)
  const i = Math.min(s.length - 1, Math.floor(p * (s.length - 1)))
  return s[i]
}
const fmt = (arr0) => {
  const arr = arr0.filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
  return arr.length
    ? `n=${arr.length} p10=${q(arr, 0.1).toFixed(1)} p50=${q(arr, 0.5).toFixed(1)} p90=${q(arr, 0.9).toFixed(1)} min=${Math.min(...arr).toFixed(1)} max=${Math.max(...arr).toFixed(1)}`
    : 'n=0'
}

const rows = []
let byOrigin = {}
for (const race of SEASON_CALENDAR) {
  race.stages.forEach((st, i) => {
    const f = STAGE_FEATURES[race.id]?.[i]
    const origin = f
      ? 'real'
      : RACE_EDITIONS[race.id]
        ? 'edicion'
        : race.id.startsWith('nc-')
          ? 'nc'
          : race.stages.length > 1
            ? 'mix'
            : 'undia'
    byOrigin[origin] = (byOrigin[origin] ?? 0) + 1
    const km = st.profile.segments.reduce((a, s) => a + s.km, 0)
    const row = {
      id: race.id,
      i: i + 1,
      kind: st.kind,
      label: st.label,
      country: race.country,
      cls: race.raceClass,
      format: race.format,
      nStages: race.stages.length,
      origin,
      km,
      f,
      tt: st.timeTrial === true,
    }
    if (f) {
      const climbs = (f.climbs ?? []).slice().sort((a, b) => a.summitKm - b.summitKm)
      row.nClimbs = climbs.length
      row.climbs = climbs
      row.hasElev = (f.elevation?.length ?? 0) >= 2
      row.dPlusPub = climbs.reduce((a, c) => a + c.lengthKm * c.avgGradient * 10, 0)
      row.lastToFinish = climbs.length ? km - climbs[climbs.length - 1].summitKm : null
      row.lastLen = climbs.length ? climbs[climbs.length - 1].lengthKm : null
      row.lastG = climbs.length ? climbs[climbs.length - 1].avgGradient : null
      row.maxLen = climbs.length ? Math.max(...climbs.map((c) => c.lengthKm)) : null
      row.firstPos = climbs.length ? climbs[0].summitKm / km : null
      row.nCob = (f.cobbles ?? []).length
      row.cobKm = (f.cobbles ?? []).reduce((a, c) => a + c.lengthKm, 0)
      row.lastCobToFinish = row.nCob
        ? km - (f.cobbles[f.cobbles.length - 1].startKm + f.cobbles[f.cobbles.length - 1].lengthKm)
        : null
      row.nSprints = (f.sprints ?? []).length
      // climbs inside last 30 km / last 60
      row.climbKmLast30 = climbs
        .filter((c) => km - c.summitKm <= 30)
        .reduce((a, c) => a + c.lengthKm, 0)
      row.climbKmLast60 = climbs
        .filter((c) => km - c.summitKm <= 60)
        .reduce((a, c) => a + c.lengthKm, 0)
      row.climbKmBefore60 = climbs
        .filter((c) => km - c.summitKm > 60)
        .reduce((a, c) => a + c.lengthKm, 0)
      // repeated climbs (circuit): same name appearing >1
      const names = climbs.map((c) => c.name.replace(/\s*\(\d+\)$/, '').replace(/\s*x\d+$/, ''))
      row.repeats = names.length - new Set(names).size
    }
    row.fk = finalKindOf(st.profile)
    row.kmAfter = kmAfterLastClimb(st.profile)
    row.shape = stageKindOf(st.profile, row.tt).kind
    rows.push(row)
  })
}
console.log('ORIGEN', byOrigin)
const real = rows.filter((r) => r.origin === 'real')
console.log(
  'REAL total',
  real.length,
  'con climbs',
  real.filter((r) => r.nClimbs > 0).length,
  'con elevation',
  real.filter((r) => r.hasElev).length,
  'con cobbles',
  real.filter((r) => r.nCob > 0).length,
  'con sprints',
  real.filter((r) => r.nSprints > 0).length,
)
console.log(
  'REAL por kind',
  Object.fromEntries(
    ['llana', 'media', 'reina', 'clasica', 'cri'].map((k) => [
      k,
      real.filter((r) => r.kind === k).length,
    ]),
  ),
)
console.log(
  'REAL por format',
  Object.fromEntries(
    ['gran-vuelta', 'una-semana', 'un-dia'].map((k) => [
      k,
      real.filter((r) => r.format === k).length,
    ]),
  ),
)
console.log(
  'REAL paises',
  Object.entries(
    real.reduce((m, r) => {
      m[r.country] = (m[r.country] ?? 0) + 1
      return m
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map((e) => e.join(':'))
    .join(' '),
)
console.log(
  'REAL carreras',
  new Set(real.map((r) => r.id)).size,
  [...new Set(real.map((r) => r.id))].join(' '),
)

for (const kind of ['reina', 'media', 'llana', 'clasica']) {
  const rs = real.filter((r) => r.kind === kind && !r.tt && r.nClimbs > 0)
  console.log(`\n== REAL ${kind} (con puertos publicados) ==`)
  console.log(' km            ', fmt(rs.map((r) => r.km)))
  console.log(' nClimbs       ', fmt(rs.map((r) => r.nClimbs)))
  console.log(' dPlus publicado', fmt(rs.map((r) => r.dPlusPub)))
  console.log(' maxLen        ', fmt(rs.map((r) => r.maxLen)))
  console.log(' lastLen       ', fmt(rs.map((r) => r.lastLen)))
  console.log(' lastG         ', fmt(rs.map((r) => r.lastG)))
  console.log(' lastToFinish  ', fmt(rs.map((r) => r.lastToFinish)))
  console.log(' firstPos(frac)', fmt(rs.map((r) => r.firstPos)))
  console.log(' climbKm last30', fmt(rs.map((r) => r.climbKmLast30)))
  console.log(' climbKm before60', fmt(rs.map((r) => r.climbKmBefore60)))
  console.log(' repeats(circuit)', fmt(rs.map((r) => r.repeats)))
  const fks = rs.reduce((m, r) => {
    m[r.fk] = (m[r.fk] ?? 0) + 1
    return m
  }, {})
  console.log(' finalKindOf   ', JSON.stringify(fks))
  const shp = rs.reduce((m, r) => {
    m[r.shape] = (m[r.shape] ?? 0) + 1
    return m
  }, {})
  console.log(' stageKindOf   ', JSON.stringify(shp))
}
// individual climbs stats by format
for (const format of ['gran-vuelta', 'una-semana', 'un-dia']) {
  const cl = real.filter((r) => r.format === format).flatMap((r) => r.climbs ?? [])
  console.log(`\n== puertos reales publicados, ${format}: n=${cl.length}`)
  console.log(' len  ', fmt(cl.map((c) => c.lengthKm)))
  console.log(' g    ', fmt(cl.map((c) => c.avgGradient)))
  console.log(
    ' <=3km',
    cl.filter((c) => c.lengthKm <= 3).length,
    ' 3-8.5',
    cl.filter((c) => c.lengthKm > 3 && c.lengthKm < 8.5).length,
    ' >=8.5',
    cl.filter((c) => c.lengthKm >= 8.5).length,
  )
}
// cobbles
const cob = real.filter((r) => r.nCob > 0)
console.log('\n== pavé real ==')
for (const r of cob)
  console.log(
    ` ${r.id} e${r.i} km=${r.km} sectores=${r.nCob} kmPave=${r.cobKm.toFixed(1)} ultimoAmeta=${r.lastCobToFinish.toFixed(1)} puertos=${r.nClimbs}`,
  )
// summit finish real reina: last climb length
const sf = real.filter((r) => r.kind === 'reina' && r.fk === 'alto')
console.log(
  '\n== reinas reales con final en alto: lastLen ',
  fmt(sf.map((r) => r.lastLen)),
  ' lastG ',
  fmt(sf.map((r) => r.lastG)),
)
const sfm = real.filter((r) => r.kind === 'media' && r.fk === 'alto')
console.log(
  '== medias reales con final en alto: lastLen ',
  fmt(sfm.map((r) => r.lastLen)),
  ' lastG ',
  fmt(sfm.map((r) => r.lastG)),
)
// one-day real with climbs: last climb
const od = real.filter((r) => r.format === 'un-dia' && r.nClimbs > 0)
console.log(
  '\n== un día real: lastLen',
  fmt(od.map((r) => r.lastLen)),
  'lastToFinish',
  fmt(od.map((r) => r.lastToFinish)),
  'nClimbs',
  fmt(od.map((r) => r.nClimbs)),
)
// generated: per origin counts by kind
for (const o of ['mix', 'edicion', 'undia', 'nc']) {
  const rs = rows.filter((r) => r.origin === o)
  console.log(
    `\n== generado ${o}: n=${rs.length}`,
    JSON.stringify(
      rs.reduce((m, r) => {
        m[r.kind] = (m[r.kind] ?? 0) + 1
        return m
      }, {}),
    ),
    'mismatch kind',
    rs.filter((r) => r.shape !== r.kind).length,
  )
}
// countries of generated one-day and mix races: top list
const gen = rows.filter((r) => r.origin !== 'real' && r.origin !== 'nc')
const genC = gen.reduce((m, r) => {
  m[r.country] = (m[r.country] ?? 0) + 1
  return m
}, {})
console.log(
  '\nGENERADO (sin NC) por país',
  Object.entries(genC)
    .sort((a, b) => b[1] - a[1])
    .map((e) => e.join(':'))
    .join(' '),
)
const realC = new Set(real.map((r) => r.country))
console.log(
  'países con etapas generadas y NINGUNA real:',
  Object.keys(genC)
    .filter((c) => !realC.has(c))
    .join(' '),
)
// km of one-day generated by class
for (const cls of ['WT', 'Pro', '1', '2']) {
  const rs = rows.filter((r) => r.origin === 'undia' && r.cls === cls)
  console.log(`un día generado ${cls}: km`, fmt(rs.map((r) => r.km)))
}
for (const cls of ['Pro', '1', '2']) {
  const rs = rows.filter((r) => r.origin === 'mix' && r.cls === cls)
  console.log(`mix ${cls}: km`, fmt(rs.map((r) => r.km)), 'nStages', fmt(rs.map((r) => r.nStages)))
}
// mix races: sequences
const mixRaces = {}
for (const r of rows.filter((r) => r.origin === 'mix'))
  (mixRaces[r.id] ??= []).push(
    r.kind[0] + (r.label === 'Uphill finish' ? '^' : r.label === 'Summit finish' ? '!' : ''),
  )
const seqs = Object.values(mixRaces).map((s) => s.join(' '))
const seqCount = seqs.reduce((m, s) => {
  m[s] = (m[s] ?? 0) + 1
  return m
}, {})
console.log('\nvueltas mix', seqs.length, 'secuencias distintas', Object.keys(seqCount).length)
console.log(
  Object.entries(seqCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map((e) => `${e[1]}× [${e[0]}]`)
    .join('\n'),
)
