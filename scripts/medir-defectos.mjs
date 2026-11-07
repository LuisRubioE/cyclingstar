#!/usr/bin/env node
/**
 * CUENTA LAS DOCE CONTRADICCIONES DE LA CRÓNICA SOBRE EL MUNDO ENTERO (v25).
 *
 * El dueño leyó el diario de Race Jaén y dijo que «no tiene ni pies ni cabeza». Doce defectos de
 * coherencia en un solo diario, y la pregunta que ordena la tanda no es cuáles duelen más al leerlos
 * sino cuántas veces salen. Medir esto tiene que dejar de ser un favor que hace alguien una tarde:
 * esto es la herramienta.
 *
 * La cuenta la hace `packages/engine/src/sim/coherence.ts` —la MISMA que corre el test de coherencia
 * del motor— para que el número de producción y el del banco sean comparables.
 *
 * Dos fuentes:
 *
 *   node scripts/medir-defectos.mjs produccion [urlBase]
 *       Hasta W4 leía la API de producción (`/api/calendar` y `/api/races/:id/stages/:day`) y auditaba
 *       la crónica de todas las etapas ya corridas. Desde W4 la ruta de etapa no la sirve (D-16
 *       revocada) y el modo se niega, como `etapa`.
 *
 *   node scripts/medir-defectos.mjs banco [semillas]
 *       Corre el banco de carreras pequeñas (`sim/smallTours.ts`) con el motor y la crónica de ESTE
 *       árbol, y audita lo que sale. Es la única fuente que se puede correr antes y después.
 *
 *   node scripts/medir-defectos.mjs etapa <raceId> <day> [urlBase]
 *       El detalle de UNA etapa, hallazgo a hallazgo; se niega desde W4, como `produccion`.
 *
 * No vive en packages/engine/src porque el motor es puro y esto es herramienta de banco: lee del
 * `dist` ya compilado, igual que `pnpm sim` y `scripts/medir-carrera.mjs`.
 */
import { ATTRIBUTES, seededRng } from '../packages/shared/dist/index.js'
import { buildChronicle, chronicleNames } from '../apps/api/dist/chronicle.js'
import { applyDailyLoad, eff0, initialEnergy } from '../packages/engine/dist/banister.js'
import {
  DEFECTS,
  DEFECT_LABEL,
  FINALE_KM,
  MUTE_KM_LIMIT,
  addStoryToWorld,
  addToWorld,
  auditStage,
  emptyWorldAudit,
  storyMetrics,
} from '../packages/engine/dist/sim/coherence.js'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { SMALL_TOURS } from '../packages/engine/dist/sim/smallTours.js'
import { matchCount } from '../packages/engine/dist/stage/physics.js'
import { stageSeed } from '../packages/engine/dist/stage/rng.js'
import { simulateStage, stageTss } from '../packages/engine/dist/stage/simulate.js'
import { autoStageOrders } from '../packages/engine/dist/world/autoOrders.js'
import { generateNpcRider, sampleNpcAge } from '../packages/engine/dist/world/npc.js'

const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']
const NEUTRAL = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

// --- La entrada de la auditoría, desde las dos fuentes ----------------------------------------
// La clave con la que se identifica a un corredor DENTRO de la etapa: el nombre en producción (los
// eventos vienen ya resueltos) y el id en el banco. Da igual cuál, mientras sea la misma.

const fromApi = (chronicle) =>
  chronicle.map((e) => ({
    km: e.km,
    plantilla: e.plantilla,
    riders: (e.protagonists ?? []).map((p) => p.name),
    datos: e.datos ?? {},
  }))

// --- Fuente 1: producción, hasta W4 -------------------------------------------------------------
// Leía la crónica de la ruta de etapa (`produccion`, `etapa`, y `--rehacer`, que la rehacía con la capa
// de narración de este árbol). Desde W4 la ruta no la sirve: los dos modos se niegan, abajo.

// --- Fuente 2: el banco ---------------------------------------------------------------------------
// El mismo campo y el mismo bucle que `sim/smallTours.ts` (que no devuelve los eventos), más la
// crónica de `apps/api`: es exactamente la cadena que ve el jugador.

function fieldFor(level) {
  if (level === 'WT') return { teams: 22, per: 8, divisions: ['WT', 'WT', 'WT', 'PRS'] }
  if (level === 'PRS') return { teams: 20, per: 7, divisions: ['PRS', 'PRS', 'CON'] }
  return { teams: 18, per: 7, divisions: ['CON', 'CON', 'CON', 'CON', 'PRS', 'WT'] }
}

/** El MISMO campo que arma `runSmallTour` (sim/smallTours.ts), línea a línea: si se separaran, los
 * números del banco dejarían de ser los de `pnpm sim` y no habría con qué comparar. */
function buildField(worldSeed, level) {
  const rng = seededRng(`${worldSeed}:st-field`)
  const { teams, per, divisions } = fieldFor(level)
  const field = []
  for (let t = 0; t < teams; t++) {
    const division = divisions[t % divisions.length]
    for (let k = 0; k < per; k++) {
      const riderId = `st-${t}-${k}`
      const vocation = VOCATIONS[Math.floor(rng() * VOCATIONS.length)]
      const age = sampleNpcAge(`${worldSeed}:${riderId}:age`)
      const genome = generateNpcRider(`${worldSeed}:${riderId}`, { division, vocation, age })
      field.push({
        riderId,
        teamId: `st-team-${t}`,
        attrs: genome.attributes,
        fragility: genome.hidden.fragility,
        ctl: 55 + 25 * rng(),
        atl: 45 + 20 * rng(),
        morale: 55 + 20 * rng(),
        rec: genome.attributes.REC,
      })
    }
  }
  return field
}

function correrCarrera(raceId, run) {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race) throw new Error(`no existe ${raceId}`)
  const worldSeed = `carrera-pequena-${raceId}-${run}`
  const field = buildField(worldSeed, race.level)
  const alive = new Map(field.map((r) => [r.riderId, { ...r }]))
  const stages = []
  for (const stage of race.stages) {
    const racing = [...alive.values()]
    if (racing.length === 0) break
    const orders = autoStageOrders(
      racing.map((r) => ({ riderId: r.riderId, attrs: r.attrs, teamId: r.teamId })),
      { kind: stage.kind, timeTrial: stage.timeTrial === true },
    )
    const riders = racing.map((r) => {
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
      {
        profile: stage.profile,
        riders,
        ...(stage.timeTrial === true ? { timeTrial: true } : {}),
      },
      stageSeed({ worldSeed, raceId, stageDay: stage.index, engineVersion: 1 }),
    )
    if (stage.timeTrial !== true) {
      const names = chronicleNames(
        racing.map((r) => ({ riderId: r.riderId, name: r.riderId, teamName: r.teamId })),
      )
      stages.push({
        id: `${raceId} e${stage.index}`,
        chronicle: buildChronicle(out.events, names),
      })
    }
    for (const r of racing) {
      const tss = stageTss(out.workUnits.get(r.riderId) ?? 0)
      const load = applyDailyLoad({ ctl: r.ctl, atl: r.atl }, tss, r.rec)
      r.ctl = load.ctl
      r.atl = load.atl
    }
    for (const result of out.results) {
      if (result.estado === 'finish') continue
      alive.delete(result.riderId)
    }
  }
  return stages
}

function medirBanco(runs) {
  const world = emptyWorldAudit()
  const porEtapa = []
  for (const tour of SMALL_TOURS) {
    for (let run = 0; run < runs; run++) {
      for (const stage of correrCarrera(tour.raceId, run)) {
        const entries = fromApi(stage.chronicle)
        const result = auditStage(entries)
        const id = `${stage.id} #${run}`
        addToWorld(world, result)
        addStoryToWorld(world, storyMetrics(entries), id)
        porEtapa.push({ id, result })
      }
    }
  }
  return { world, porEtapa }
}

// --- Salida ---------------------------------------------------------------------------------------

function imprimir(world, porEtapa) {
  const filas = DEFECTS.map((d) => ({
    d,
    n: world.counts[d],
    etapas: world.stagesWith[d],
  })).sort((a, b) => b.n - a.n || a.d.localeCompare(b.d))
  const ancho = Math.max(...DEFECTS.map((d) => DEFECT_LABEL[d].length))
  console.log(`\n${world.stages} etapas con crónica auditadas\n`)
  for (const f of filas) {
    console.log(
      `${DEFECT_LABEL[f.d].padEnd(ancho)}  ${String(f.n).padStart(5)}   en ${String(f.etapas).padStart(3)} etapas`,
    )
  }
  const total = DEFECTS.reduce((a, d) => a + world.counts[d], 0)
  console.log(`${'TOTAL'.padEnd(ancho)}  ${String(total).padStart(5)}`)
  const limpias = porEtapa.filter((x) =>
    Object.values(x.result.counts).every((n) => n === 0),
  ).length
  console.log(
    `${'etapas SIN una sola contradiccion'.padEnd(ancho)}  ${String(limpias).padStart(5)}`,
  )
  imprimirEspina(world.story, ancho)
}

/**
 * LAS CUATRO MEDIDAS DE LA ESPINA DORSAL (v27). No son defectos que bajar a cero: son propiedades
 * del relato que se leen contra un listón, y sin ellas no se puede saber si la tanda ha servido.
 */
function imprimirEspina(s, ancho) {
  if (s.stages === 0) return
  const pct = (a, b) => (b > 0 ? `${((100 * a) / b).toFixed(1)}%` : '—')
  const fila = (etiqueta, valor, cola = '') =>
    console.log(`${etiqueta.padEnd(ancho)}  ${String(valor).padStart(5)}   ${cola}`)
  console.log('')
  fila(
    'km MAXIMOS sin una linea de situacion',
    s.peorMudoKm,
    `peor: ${s.peorMudoEtapa} · media por etapa ${(s.mudoKmSuma / s.stages).toFixed(1)} km · ` +
      `${s.etapasMudas}/${s.stages} etapas pasan de ${MUTE_KM_LIMIT} km ` +
      `(${s.etapasMudasConFuga} con alguien delante)`,
  )
  fila('dos protagonistas «con hueco» a la vez', s.dosConHueco, `en ${s.etapasConDos} etapas`)
  fila(
    'lineas de cronica por etapa',
    (s.lineasSuma / s.stages).toFixed(1),
    `${s.lineasSuma} en total`,
  )
  fila(
    `lineas de los ultimos ${FINALE_KM} km que hablan del ganador`,
    s.finalDelGanador,
    `de ${s.finalLineas} (${pct(s.finalDelGanador, s.finalLineas)})`,
  )
  fila(
    'nombres de grupo distintos (max por etapa)',
    s.nombresMax,
    `${s.etapasConCuatroNombres}/${s.stages} etapas usan mas de tres`,
  )
}

const [modo, ...args] = process.argv.slice(2)

// DESDE W4 LA RUTA DE ETAPA NO SIRVE LA CRÓNICA (la revisión de `Watch` del dueño; D-16 revocada):
// `produccion` y `etapa` la leían de ahí, y sin ella cada etapa contaría como «sin crónica» y la auditoría
// saldría vacía sin decirlo. Se niegan; `banco` corre la crónica de este árbol y sigue midiendo.
if (modo === 'produccion' || modo === 'etapa') {
  console.error(
    `\nmedir-defectos: desde W4 la ruta de etapa no sirve la crónica (D-16 revocada), así que \`${modo}\` ya no tiene de dónde leerla; usa \`banco\`.\n`,
  )
  process.exit(1)
} else if (modo === 'banco-detalle') {
  // El detalle de una carrera del banco, hallazgo a hallazgo: es como se mira un defecto de cerca.
  const [raceId, run = '0', filtro] = args
  for (const stage of correrCarrera(raceId, Number(run))) {
    const { findings } = auditStage(fromApi(stage.chronicle))
    const vistos = filtro ? findings.filter((f) => f.defect === filtro) : findings
    if (vistos.length === 0) continue
    console.log(`\n=== ${stage.id} ===`)
    for (const f of vistos)
      console.log(`  km ${String(f.km).padStart(3)}  ${f.defect}: ${f.detail}`)
  }
} else if (modo === 'banco-traza') {
  const [raceId, run = '0', etapa] = args
  for (const stage of correrCarrera(raceId, Number(run))) {
    if (etapa && !stage.id.endsWith(`e${etapa}`)) continue
    console.log(`\n=== ${stage.id} ===`)
    for (const e of stage.chronicle) {
      console.log(
        `${String(e.km).padStart(3)} ${String(e.tS).padStart(6)} ${e.plantilla.padEnd(20)} [${e.protagonists.map((p) => p.name).join(', ')}] ${JSON.stringify(e.datos ?? {})}`,
      )
    }
  }
} else if (modo === 'banco') {
  const runs = Number(args[0] ?? 3)
  const { world, porEtapa } = medirBanco(runs)
  console.log(`Banco de carreras pequeñas — ${SMALL_TOURS.length} carreras × ${runs} semillas`)
  imprimir(world, porEtapa)
} else {
  console.error('uso: medir-defectos.mjs produccion|banco|etapa …  (ver cabecera del fichero)')
  process.exit(1)
}
