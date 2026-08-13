#!/usr/bin/env node
/**
 * INVENTARIO DE RECORRIDOS: qué carrera y qué etapa del calendario corre sobre un trazado REAL y cuál
 * sobre uno inventado.
 *
 * El motor mezcla tres orígenes distintos y desde fuera no se distinguen, así que una etapa puede
 * parecer fiel y no serlo. Este inventario los separa y los cuenta, para poder decidir por dónde
 * seguir cargando recorridos de verdad y para no volver a pelearse con un número a ojo:
 *
 *   REAL       la etapa tiene RASGOS reales autorizados en `STAGE_FEATURES` (o `CLASSIC_FEATURES`):
 *              puertos, sectores de adoquín y metas volantes en SU kilómetro, con su fuente anotada
 *              en `docs/fuentes-recorridos.md`. La altimetría es fiel.
 *
 *   EDICIÓN    la carrera viene de una edición verificada (`RACE_EDITIONS`): salida, meta, kilómetros
 *              y terreno de cada etapa son los de verdad, pero el RELIEVE se genera por terreno. En
 *              teoría bien y sin validar: la etapa dura lo que debe y va de donde va, pero sus
 *              puertos no son los suyos.
 *
 *   INVENTADO  ni edición ni rasgos: la composición de etapas la genera `stageMix` y el relieve
 *              `profileGen`. Verosímil, no real. Solo las localidades de salida y meta salen de
 *              `RACE_ROUTES`, que sí son geografía de verdad.
 *
 * Uso:
 *   node scripts/inventario-recorridos.mjs            → resumen por nivel y clase, en el terminal
 *   node scripts/inventario-recorridos.mjs --doc      → el documento entero (docs/inventario-recorridos.md)
 *
 * Lee del `dist` ya compilado, como el resto de herramientas de banco (`pnpm sim`, `medir-defectos`).
 */
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { RACE_EDITIONS } from '../packages/engine/dist/routes/editions.js'
import { RACE_CLASS_INFO } from '../packages/engine/dist/routes/uci.js'
import { stageEndpoints } from '../packages/engine/dist/routes/raceRoutes.js'
import { STAGE_FEATURES } from '../packages/engine/dist/routes/stageFeatures.js'

const KM = (segments) => Math.round(segments.reduce((a, s) => a + s.km, 0))

/** Los tres orígenes posibles de una etapa, del más fiel al menos. */
const REAL = 'real'
const EDICION = 'edicion'
const INVENTADO = 'inventado'

const ORIGEN_LABEL = {
  [REAL]: 'Real',
  [EDICION]: 'Sin validar',
  [INVENTADO]: 'Inventado',
}

function origenDe(raceId, stageIndex) {
  if (STAGE_FEATURES[raceId]?.[stageIndex - 1]) return REAL
  if (RACE_EDITIONS[raceId]) return EDICION
  return INVENTADO
}

/** Una fila por etapa, que es la unidad de la que se habla. */
function filas() {
  const out = []
  for (const race of SEASON_CALENDAR) {
    for (const stage of race.stages) {
      const ends = stageEndpoints(race.id, stage.index)
      out.push({
        raceId: race.id,
        race: race.name,
        level: race.level,
        raceClass: race.raceClass,
        country: race.country ?? '',
        format: race.format,
        startDay: race.startDay,
        stages: race.stages.length,
        index: stage.index,
        label: stage.label,
        kind: stage.kind,
        timeTrial: stage.timeTrial === true,
        from: ends?.from ?? '',
        to: ends?.to ?? '',
        km: KM(stage.profile.segments),
        origen: origenDe(race.id, stage.index),
      })
    }
  }
  return out
}

function resumen(rows) {
  const cuenta = (sel) => {
    const s = rows.filter(sel)
    const n = (o) => s.filter((r) => r.origen === o).length
    return { total: s.length, real: n(REAL), edicion: n(EDICION), inventado: n(INVENTADO) }
  }
  const pct = (a, b) => (b === 0 ? '—' : `${Math.round((100 * a) / b)}%`)
  const linea = (nombre, c) =>
    `${nombre.padEnd(16)} ${String(c.total).padStart(5)}  ${String(c.real).padStart(5)} ${pct(c.real, c.total).padStart(5)}  ${String(c.edicion).padStart(5)} ${pct(c.edicion, c.total).padStart(5)}  ${String(c.inventado).padStart(5)} ${pct(c.inventado, c.total).padStart(5)}`

  console.log('ETAPAS DEL CALENDARIO, por origen del recorrido\n')
  console.log(
    `${''.padEnd(16)} ${'total'.padStart(5)}  ${'real'.padStart(11)}  ${'sin val.'.padStart(11)}  ${'inventado'.padStart(11)}`,
  )
  for (const lvl of ['WT', 'PRS', 'CON'])
    console.log(
      linea(
        lvl,
        cuenta((r) => r.level === lvl),
      ),
    )
  console.log(
    linea(
      'TOTAL',
      cuenta(() => true),
    ),
  )

  console.log('\nCARRERAS (no etapas) enteramente inventadas, por nivel y clase:')
  const porCarrera = new Map()
  for (const r of filas()) {
    const cur = porCarrera.get(r.raceId) ?? { ...r, origenes: new Set() }
    cur.origenes.add(r.origen)
    porCarrera.set(r.raceId, cur)
  }
  const tally = {}
  for (const c of porCarrera.values()) {
    if (!c.origenes.has(INVENTADO)) continue
    const k = `${c.level} ${c.raceClass}`
    tally[k] = (tally[k] ?? 0) + 1
  }
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1]))
    console.log(`  ${k.padEnd(10)} ${v}`)
}

/** Bloque de carreras de un nivel, en Markdown. */
function bloque(rows, titulo, intro) {
  if (rows.length === 0) return []
  const porCarrera = new Map()
  for (const r of rows) {
    if (!porCarrera.has(r.raceId)) porCarrera.set(r.raceId, [])
    porCarrera.get(r.raceId).push(r)
  }
  const carreras = [...porCarrera.values()].sort(
    (a, b) => a[0].startDay - b[0].startDay || a[0].race.localeCompare(b[0].race),
  )
  const lines = [`\n## ${titulo}\n`, intro, '']
  for (const etapas of carreras) {
    const c = etapas[0]
    const info = RACE_CLASS_INFO[c.raceClass]
    const clase = info ? `${c.level} · ${info.label ?? c.raceClass}` : `${c.level} · ${c.raceClass}`
    const dia = `día ${c.startDay}`
    lines.push(`\n### ${c.race}${c.country ? ` (${c.country})` : ''}`)
    lines.push(
      `${clase} · ${c.format} · ${etapas.length} ${etapas.length === 1 ? 'etapa' : 'etapas'} · ${dia}\n`,
    )
    lines.push('| # | Tipo | Salida | Meta | km | Recorrido |')
    lines.push('|---|---|---|---|---:|---|')
    for (const e of etapas) {
      const tipo = e.timeTrial ? `${e.label} (crono)` : e.label
      lines.push(
        `| ${e.index} | ${tipo} | ${e.from || '—'} | ${e.to || '—'} | ${e.km} | ${ORIGEN_LABEL[e.origen]} |`,
      )
    }
  }
  return lines
}

/** El documento entero: cabecera con el recuento y la leyenda, y después nivel por nivel. */
function documento() {
  const rows = filas()
  const cuenta = (sel) => {
    const s = rows.filter(sel)
    const n = (o) => s.filter((r) => r.origen === o).length
    return { total: s.length, real: n(REAL), edicion: n(EDICION), inventado: n(INVENTADO) }
  }
  const pct = (a, b) => (b === 0 ? '—' : `${Math.round((100 * a) / b)} %`)
  const fila = (nombre, c) =>
    `| ${nombre} | ${c.total} | ${c.real} (${pct(c.real, c.total)}) | ${c.edicion} (${pct(c.edicion, c.total)}) | ${c.inventado} (${pct(c.inventado, c.total)}) |`

  const out = [
    '# Inventario de recorridos',
    '',
    'Qué etapa del calendario corre sobre un trazado REAL y cuál sobre uno inventado.',
    '',
    '> Este documento LO GENERA `scripts/inventario-recorridos.mjs` desde el propio calendario del',
    '> motor. No se edita a mano: se regenera (`node scripts/inventario-recorridos.mjs --doc >',
    '> docs/inventario-recorridos.md`) cuando se carga un recorrido nuevo, y así no envejece.',
    '',
    '## Las tres procedencias',
    '',
    '| | Qué es real | Qué no |',
    '|---|---|---|',
    '| **Real** | Puertos, sectores de adoquín y metas volantes **en su kilómetro**, con la fuente anotada en `docs/fuentes-recorridos.md`. La altimetría es fiel. | — |',
    '| **Sin validar** | Salida, meta, kilómetros y terreno vienen de una edición verificada (`RACE_EDITIONS`). | El RELIEVE se genera por terreno: la etapa dura lo que debe y va de donde va, pero **sus puertos no son los suyos**. |',
    '| **Inventado** | Solo las localidades de salida y meta (`RACE_ROUTES`), que sí son geografía de verdad. | Todo lo demás: la composición de etapas la genera `stageMix` y el relieve `profileGen`. Verosímil, no real. |',
    '',
    '## El recuento',
    '',
    '| Nivel | Etapas | Real | Sin validar | Inventado |',
    '|---|---:|---:|---:|---:|',
    fila(
      '**WorldTour**',
      cuenta((r) => r.level === 'WT'),
    ),
    fila(
      '**ProSeries**',
      cuenta((r) => r.level === 'PRS'),
    ),
    fila(
      '**Continental**',
      cuenta((r) => r.level === 'CON'),
    ),
    fila(
      '**TOTAL**',
      cuenta(() => true),
    ),
    '',
    'De las continentales inventadas, **' +
      new Set(rows.filter((r) => r.raceClass === 'NC').map((r) => r.raceId)).size +
      '** son campeonatos nacionales: una prueba por país y categoría, sin recorrido publicado que cargar.',
  ]
  out.push(
    ...bloque(
      rows.filter((r) => r.level === 'WT'),
      'WorldTour',
      'El circuito de arriba. Es donde se ha cargado casi todo lo real.',
    ),
  )
  out.push(
    ...bloque(
      rows.filter((r) => r.level === 'PRS'),
      'ProSeries',
      'El segundo escalón. La mayoría corre sobre ediciones verificadas SIN relieve real: es el frente de trabajo con más recorrido por delante.',
    ),
  )
  out.push(
    ...bloque(
      rows.filter((r) => r.level === 'CON' && r.raceClass !== 'NC'),
      'Continental',
      'Carreras .1 y .2 de todos los continentes.',
    ),
  )
  out.push(
    ...bloque(
      rows.filter((r) => r.raceClass === 'NC'),
      'Campeonatos nacionales',
      'Una prueba en línea y una contrarreloj por país y categoría. Recorrido generado: no hay trazado publicado que cargar.',
    ),
  )
  console.log(out.join('\n'))
}

const args = process.argv.slice(2)
if (args[0] === '--doc') documento()
else resumen(filas())
