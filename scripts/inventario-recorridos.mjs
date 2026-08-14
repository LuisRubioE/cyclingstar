#!/usr/bin/env node
/**
 * INVENTARIO DE RECORRIDOS: todas las carreras y todas sus etapas, con su PROCEDENCIA.
 *
 * Lo pidió el dueño así: «un documento con el listado de todas las carreras y etapas; para cada una
 * pon clase, tipo de etapa, origen, destino, número de km, y si está ya correcta con la realidad o
 * está inventada o en teoría bien pero sin validar».
 *
 * Las tres procedencias son reales y distintas, y la diferencia importa para saber dónde compensa
 * buscar recorridos:
 *
 *  - **Real** — la etapa tiene RASGOS AUTORIZADOS en `STAGE_FEATURES`: los puertos y los sectores de
 *    pavé están puestos a mano desde una fuente citada (docs/fuentes-recorridos.md). Es lo único que
 *    se puede llamar fiel.
 *  - **Sin validar** — la etapa viene de una EDICIÓN REAL (`RACE_EDITIONS`): el origen, el destino y
 *    los kilómetros son los de verdad, pero el relieve lo genera el motor a partir del terreno
 *    declarado. La silueta es plausible, no es la de la carretera.
 *  - **Inventado** — no hay edición: el recorrido entero sale del generador (`stageMix` + `profileGen`).
 *
 * Genera `docs/inventario-recorridos.md`. Lee del `dist` compilado, como el resto del banco.
 *
 *   pnpm --filter @cyclingstar/engine build
 *   node scripts/inventario-recorridos.mjs
 */
import { writeFileSync } from 'node:fs'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { RACE_EDITIONS } from '../packages/engine/dist/routes/editions.js'
import { STAGE_FEATURES } from '../packages/engine/dist/routes/stageFeatures.js'
import { stageLengthKm } from '../packages/engine/dist/stage/sample.js'

/** Cómo se llama cada tipo de etapa del motor en el documento. */
const KIND = {
  llana: 'Llana',
  media: 'Media montaña',
  reina: 'Montaña',
  cri: 'Contrarreloj',
  clasica: 'Clásica',
}

/** Procedencia de una etapa: la pregunta que el documento viene a responder. */
function provenance(race, index) {
  const oneDay = race.stages.length === 1
  if (STAGE_FEATURES[`${race.id}:${index}`] || (oneDay && STAGE_FEATURES[race.id])) return 'Real'
  return RACE_EDITIONS[race.id] ? 'Sin validar' : 'Inventado'
}

const MARK = { Real: '✅ Real', 'Sin validar': '🟡 Sin validar', Inventado: '🔴 Inventado' }

const rows = []
for (const race of SEASON_CALENDAR) {
  const edition = RACE_EDITIONS[race.id]
  for (const [i, stage] of race.stages.entries()) {
    const index = i + 1
    const ed = edition?.stages?.[i]
    rows.push({
      raceId: race.id,
      raceName: race.name,
      raceClass: race.raceClass,
      country: race.country ?? '',
      startDay: race.startDay,
      index,
      kind: KIND[stage.kind] ?? stage.kind,
      label: stage.label ?? '',
      // Origen y destino solo existen si la etapa viene de una edición real. En una inventada no hay
      // ciudades que poner y decir una sería mentir: se deja en blanco a propósito.
      from: ed?.from ?? '',
      to: ed?.to ?? '',
      km: Math.round(ed?.km ?? stageLengthKm(stage.profile)),
      prov: provenance(race, index),
    })
  }
}

const total = rows.length
const count = (p) => rows.filter((r) => r.prov === p).length
const pct = (n) => `${((100 * n) / total).toFixed(1)} %`

// Recuento por clase, que es lo que dice dónde compensa trabajar.
const classes = [...new Set(rows.map((r) => r.raceClass))]
const byClass = classes
  .map((c) => {
    const rs = rows.filter((r) => r.raceClass === c)
    return {
      c,
      total: rs.length,
      real: rs.filter((r) => r.prov === 'Real').length,
      sin: rs.filter((r) => r.prov === 'Sin validar').length,
      inv: rs.filter((r) => r.prov === 'Inventado').length,
    }
  })
  .sort((a, b) => b.inv - a.inv)

const out = []
out.push('# Inventario de recorridos')
out.push('')
out.push(
  'Todas las carreras del calendario y todas sus etapas, con su **procedencia**: si el recorrido es',
  'fiel a la realidad, si viene de una edición real pero con el relieve generado, o si está inventado',
  'de principio a fin.',
)
out.push('')
out.push(
  '> **Generado**, no escrito a mano: `node scripts/inventario-recorridos.mjs`. Si algo aquí no',
)
out.push('> cuadra con el juego, el que miente es el documento y se regenera.')
out.push('')
out.push('## Qué significa cada procedencia')
out.push('')
out.push(
  '| | qué es | qué se puede fiar |',
  '|---|---|---|',
  '| ✅ **Real** | rasgos autorizados en `STAGE_FEATURES`, puestos a mano desde fuente citada (`docs/fuentes-recorridos.md`) | los puertos y el pavé están donde están de verdad |',
  '| 🟡 **Sin validar** | viene de una edición real (`RACE_EDITIONS`): origen, destino y km son los de verdad | la distancia y las ciudades; **el relieve lo genera el motor** |',
  '| 🔴 **Inventado** | no hay edición: recorrido entero del generador | nada: es plausible, no es real |',
)
out.push('')
out.push('## El estado, en una tabla')
out.push('')
out.push(`**${total} etapas** en ${SEASON_CALENDAR.length} carreras.`)
out.push('')
out.push('| | etapas | % |')
out.push('|---|---:|---:|')
for (const p of ['Real', 'Sin validar', 'Inventado']) {
  out.push(`| ${MARK[p]} | ${count(p)} | ${pct(count(p))} |`)
}
out.push('')
out.push('### Por clase de carrera')
out.push('')
out.push('| clase | etapas | ✅ real | 🟡 sin validar | 🔴 inventado |')
out.push('|---|---:|---:|---:|---:|')
for (const b of byClass) {
  out.push(`| ${b.c} | ${b.total} | ${b.real} | ${b.sin} | ${b.inv} |`)
}
out.push('')
out.push('## Carrera por carrera')
out.push('')

let lastRace = null
for (const r of rows) {
  if (r.raceId !== lastRace) {
    lastRace = r.raceId
    const rs = rows.filter((x) => x.raceId === r.raceId)
    const resumen = ['Real', 'Sin validar', 'Inventado']
      .map((p) => [p, rs.filter((x) => x.prov === p).length])
      .filter(([, n]) => n > 0)
      .map(([p, n]) => `${MARK[p]} ${n}`)
      .join(' · ')
    out.push('')
    out.push(
      `### ${r.raceName} \`${r.raceId}\``,
      '',
      `Clase **${r.raceClass}**${r.country ? ` · ${r.country.toUpperCase()}` : ''} · día ${r.startDay} · ${rs.length} etapa${rs.length === 1 ? '' : 's'} · ${resumen}`,
      '',
      '| # | tipo | origen | destino | km | procedencia |',
      '|---:|---|---|---|---:|---|',
    )
  }
  const kind = r.label ? `${r.kind} · ${r.label}` : r.kind
  out.push(
    `| ${r.index} | ${kind} | ${r.from || '—'} | ${r.to || '—'} | ${r.km} | ${MARK[r.prov]} |`,
  )
}
out.push('')

writeFileSync('docs/inventario-recorridos.md', `${out.join('\n')}\n`)
console.log(`docs/inventario-recorridos.md — ${total} etapas en ${SEASON_CALENDAR.length} carreras`)
for (const p of ['Real', 'Sin validar', 'Inventado']) {
  console.log(`  ${p.padEnd(12)} ${String(count(p)).padStart(5)}  ${pct(count(p))}`)
}
