#!/usr/bin/env node
/**
 * RACE RADIO — LA CARRERA KILÓMETRO A KILÓMETRO.
 *
 * El journal cuenta la etapa DESPUÉS. Esto es lo otro: qué grupos hay en cada kilómetro, quién va
 * en cada uno, cuánto hueco llevan y quién va tirando. Es la herramienta de depuración que faltaba:
 * cinco tandas de motor seguidas se atascaron reconstruyendo a mano el estado de la carrera desde el
 * reguero de eventos —y equivocándose—, cuando el motor lo sabe exactamente y lo dice en la foto de
 * `StageProbe`. Los huecos de esta tabla no se estiman: son la RESTA de los relojes de dos grupos en
 * el mismo kilómetro.
 *
 * La cuenta —de foto a «estado de carrera por kilómetro»— NO vive aquí, vive en
 * `packages/engine/src/sim/raceRadio.ts`, para que la vista del jugador la pueda reusar sin
 * reescribirla. Aquí solo está la fontanería: de dónde salen los datos y cómo se pintan.
 *
 * No vive en packages/engine/src porque el motor es puro y esto es herramienta de banco: lee del
 * `dist` ya compilado, igual que `pnpm sim` y que `scripts/medir-carrera.mjs`.
 *
 * DOS FUENTES, y la diferencia entre ellas es la trampa de esta herramienta:
 *
 *  - **Banco** (por defecto): la etapa se corre AQUÍ, con el recorrido del calendario y un campo
 *    sembrado. Siempre fiel, porque la tabla describe la carrera que se acaba de correr.
 *  - **Producción** (`--db`): `stage_snapshots` guarda la semilla y la entrada de la etapa que se
 *    corrió de verdad, así que se puede re-simular… **solo si corrió con el motor de HOY**. Si
 *    `stage_snapshots.engineVersion` no coincide con `ENGINE_VERSION`, el replay cuenta una carrera
 *    distinta de la que quedó en el marcador (es el defecto por el que el journal está congelado,
 *    ver `apps/api/src/stageHistory.ts`), y entonces esta herramienta DICE QUE NO SE PUEDE
 *    RECONSTRUIR en vez de enseñar una carrera que no pasó.
 *
 * Uso:
 *   pnpm --filter @cyclingstar/engine build
 *   node scripts/race-radio.mjs <raceId> <día> [opciones]
 *   DATABASE_URL=… node scripts/race-radio.mjs <raceId> <día> --db [opciones]
 *
 * Opciones:
 *   --db              lee la etapa de producción (`stage_snapshots`) en vez de correrla en el banco
 *   --season <n>      temporada de la clave de carrera en producción (por defecto, la del mundo)
 *   --every <km>      cada cuántos km se pide la foto (por defecto 1)
 *   --from <km>       primer km que se imprime
 *   --to <km>         último km que se imprime
 *   --riders <n>      tamaño del campo del banco (por defecto, el de la categoría de la carrera)
 *   --run <n>         variante de semilla del banco (por defecto 0)
 *   --groups <n>      cuántos grupos se pintan por fila (por defecto 4)
 *   --pullers <n>     cuántos relevistas se nombran por grupo (por defecto 2)
 *   --width <n>       ancho de la columna de cada grupo (por defecto 26)
 */
import { ATTRIBUTES, seededRng } from '../packages/shared/dist/index.js'
import { eff0, initialEnergy } from '../packages/engine/dist/banister.js'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { matchCount } from '../packages/engine/dist/stage/physics.js'
import { stageSeed } from '../packages/engine/dist/stage/rng.js'
import { simulateStage } from '../packages/engine/dist/stage/simulate.js'
import { stageLengthKm } from '../packages/engine/dist/stage/sample.js'
import {
  checkReplay,
  raceRadioCollector,
  radioKmPoints,
} from '../packages/engine/dist/sim/raceRadio.js'
import { autoStageOrders } from '../packages/engine/dist/world/autoOrders.js'
import { generateNpcRider, sampleNpcAge } from '../packages/engine/dist/world/npc.js'

// ---------------------------------------------------------------------------- argumentos

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const num = (name, fallback) => {
  const v = opt(name, null)
  return v === null ? fallback : Number(v)
}

const raceId = argv[0]
const day = Number(argv[1])
if (!raceId || !Number.isFinite(day)) {
  console.error('Uso: node scripts/race-radio.mjs <raceId> <día> [--db] [opciones]')
  process.exit(1)
}

const EVERY = num('every', 1)
const FROM = num('from', 0)
const TO = num('to', Number.POSITIVE_INFINITY)
const MAX_GROUPS = num('groups', 4)
const MAX_PULLERS = num('pullers', 2)
const WIDTH = num('width', 26)

// ---------------------------------------------------------------------------- fuente: banco

const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']
const VOC_SHORT = { escalada: 'esc', velocidad: 'vel', clasicas: 'cla', crono: 'cro', fondo: 'fon' }
const NEUTRAL = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

/** El mismo campo que el banco de reinas reales (sim/realQueens.ts), para poder comparar. */
function fieldFor(level) {
  if (level === 'WT') return { teams: 22, per: 8, divisions: ['WT', 'WT', 'WT', 'PRS'] }
  if (level === 'PRS') return { teams: 20, per: 7, divisions: ['PRS', 'PRS', 'CON'] }
  return { teams: 18, per: 7, divisions: ['CON', 'CON', 'CON', 'CON', 'PRS', 'WT'] }
}

/**
 * El campo del banco. `size` recorta por la cola: como el campo se genera equipo a equipo, pedir
 * 119 en una carrera de 20×7 deja 17 equipos ENTEROS, que es un pelotón de carrera de verdad y no
 * un revoltijo de equipos a medias.
 */
function buildField(worldSeed, level, size) {
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
        // El DORSAL con la convención real: decena de equipo y unidad de corredor (14·1 = 141).
        bib: (t + 1) * 10 + (k + 1),
        vocation,
        attrs: genome.attributes,
        fragility: genome.hidden.fragility,
        ctl: 55 + 25 * rng(),
        atl: 45 + 20 * rng(),
        morale: 55 + 20 * rng(),
      })
    }
  }
  return size && size < field.length ? field.slice(0, size) : field
}

function bankSource() {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race) throw new Error(`No existe ${raceId} en el calendario`)
  const stage = race.stages[day - 1]
  if (!stage) throw new Error(`${raceId} no tiene etapa ${day}`)
  const run = num('run', 0)
  const worldSeed = `radio-${race.id}-${run}`
  const field = buildField(worldSeed, race.level, num('riders', 0))
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
  const names = new Map(field.map((r) => [r.riderId, `#${r.bib} ${VOC_SHORT[r.vocation]}`]))
  return {
    input: { profile: stage.profile, riders, timeTrial: stage.timeTrial === true },
    seed: stageSeed({ worldSeed, raceId: race.id, stageDay: stage.index, engineVersion: 1 }),
    names,
    stageName: stage.name ?? `Stage ${day}`,
    raceName: race.name,
    origin: `banco (campo sembrado \`${worldSeed}\`, ${riders.length} corredores) — fiel por construcción: la tabla describe la etapa que se acaba de correr`,
  }
}

// ------------------------------------------------------------------- fuente: producción

/**
 * La etapa que se corrió DE VERDAD, con la guarda de versión. Ver la cabecera: re-simular con un
 * motor distinto del que corrió la etapa cuenta otra carrera, así que aquí solo hay dos respuestas
 * posibles —replay fiel o «no se puede reconstruir»— y nunca una tercera con una carrera inventada.
 */
async function dbSource() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('--db necesita DATABASE_URL')
  const db = await import('../packages/db/dist/index.js').catch(() => {
    throw new Error('No existe packages/db/dist. Compila antes: pnpm exec tsc -b packages/db')
  })
  const { currentSeason } = await import('../packages/shared/dist/index.js')
  const conn = db.createDb(url)
  try {
    const world = await db.getCurrentWorld(conn.db)
    const season = num('season', null) ?? currentSeason(world?.currentDay ?? 1)
    const raceKey = `${raceId}:s${season}`
    const snapshot = await db.getStageSnapshot(conn.db, raceKey, day)
    if (!snapshot) {
      throw new Error(`No hay snapshot de ${raceKey} día ${day}: esa etapa no se ha corrido`)
    }
    // LA GUARDA, y la regla vive en el motor (`checkReplay`), no aquí: reconstruir una etapa que
    // corrió con otro motor cuenta una carrera distinta de la que quedó en el marcador.
    const replay = checkReplay(snapshot.engineVersion)
    if (!replay.faithful) {
      return {
        refused:
          `NO SE PUEDE RECONSTRUIR ${raceKey} día ${day}.\n` +
          `  La etapa corrió con el motor v${replay.ranWith} y este árbol es el v${replay.today}.\n` +
          `  Re-simularla contaría una carrera DISTINTA de la que quedó en el marcador, y esta\n` +
          `  herramienta no enseña carreras que no pasaron. Corre la radio en el banco (sin --db)\n` +
          `  o vuelve al árbol del v${replay.ranWith}.`,
      }
    }
    // Maillots, dorsales y equipos NO los sabe el motor y no debe saberlos: se cruzan aquí fuera,
    // en la misma capa y con la misma consulta que ya usa el journal (`apps/api/src/chronicle.ts`).
    const identities = await db.getRaceRiderIdentities(conn.db, raceKey)
    const names = new Map(
      identities.map((i) => [i.riderId, `${i.bib ?? '--'} ${lastName(i.name)}`]),
    )
    const race = SEASON_CALENDAR.find((r) => r.id === raceId)
    return {
      input: snapshot.input,
      seed: snapshot.seed,
      names,
      stageName: race?.stages[day - 1]?.name ?? `Stage ${day}`,
      raceName: race?.name ?? raceId,
      origin: `producción (\`stage_snapshots\` ${raceKey} día ${day}) — corrió con el motor v${replay.ranWith}, este árbol es el v${replay.today}: REPLAY FIEL`,
    }
  } finally {
    await conn.client.end({ timeout: 5 })
  }
}

const lastName = (name) =>
  String(name ?? '')
    .trim()
    .split(/\s+/)
    .slice(-1)[0] ?? '?'

// ---------------------------------------------------------------------------- pintado

const NOUN = {
  fuga: 'fuga',
  contra: 'contra',
  peloton: 'pelotón',
  tierra: 'tierra',
  grupeto: 'grupeto',
}

function mmss(s) {
  const t = Math.round(s)
  const m = Math.floor(t / 60)
  if (m < 60) return `${m}:${String(t % 60).padStart(2, '0')}`
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

const pad = (s, w) => (s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length))

const TAIL_W = 16

/**
 * La tabla. Una fila por kilómetro con los grupos EN ORDEN DE CARRETERA, y debajo, solo cuando
 * cambia, quién va en el turno de relevos de cada uno.
 *
 * La cola nunca se esconde: lo que no cabe en las columnas se resume en «cola N gr · M corr», de
 * modo que los tamaños de la fila SIEMPRE suman los que quedan en carrera. Una tabla de depuración
 * que se come corredores por el borde derecho es peor que no tenerla.
 */
function render(radio, names, head) {
  const label = (id) => names.get(id) ?? id
  const out = []
  out.push('')
  out.push(head.title)
  out.push(`fuente: ${head.origin}`)
  out.push(
    'leyenda: [n] grupo · tamaño · depósito medio   ·   huecos = resta de los relojes de cada grupo con el líder de carrera (exacta)',
  )
  out.push('')
  out.push(
    pad('km', 5) +
      pad('grupos, en orden de carretera', WIDTH * MAX_GROUPS) +
      pad('cola', TAIL_W) +
      'huecos',
  )
  out.push('─'.repeat(5 + WIDTH * MAX_GROUPS + TAIL_W + 26))
  let prevPullers = ''
  for (const row of radio.kms) {
    if (row.km < FROM || row.km > TO) continue
    const shown = row.groups.slice(0, MAX_GROUPS)
    const rest = row.groups.slice(MAX_GROUPS)
    let line1 = pad(row.km.toFixed(0), 5)
    let line2 = ' '.repeat(5)
    for (let i = 0; i < MAX_GROUPS; i++) {
      const g = shown[i]
      line1 += pad(
        g ? `[${g.position}] ${NOUN[g.kind]} ${g.size} · ${g.energyPct.toFixed(0)}%` : '',
        WIDTH,
      )
      const who = g ? g.pulling.slice(0, MAX_PULLERS).map((p) => label(p.riderId)) : []
      line2 += pad(who.length > 0 ? `tiran: ${who.join(', ')}` : '', WIDTH)
    }
    const restRiders = rest.reduce((n, g) => n + g.size, 0)
    line1 += pad(rest.length > 0 ? `cola ${rest.length} gr · ${restRiders}` : '', TAIL_W)
    line1 += shown.map((g) => `+${mmss(g.gapS)}`).join(' / ')
    if (rest.length > 0) line1 += ` … +${mmss(rest[rest.length - 1].gapS)}`
    if (row.gone > 0) line1 += `   fuera ${row.gone}`
    // La segunda línea solo cuando el turno CAMBIA: repetirla cada kilómetro es ruido, y lo que se
    // quiere ver es el relevo —cuándo un equipo suelta el frente y lo coge otro—.
    const turn = shown.map((g) => g.pulling.map((p) => p.riderId).join('+')).join('|')
    out.push(line1.trimEnd())
    if (turn.replace(/[|]/g, '') !== '' && turn !== prevPullers) out.push(line2.trimEnd())
    prevPullers = turn
  }
  return out.join('\n')
}

/** El desenlace, para poder cruzar la tabla con lo que quedó en el marcador. */
function outcome(result, names) {
  const label = (id) => names.get(id) ?? id
  const finished = result.results.filter((r) => r.estado === 'finish')
  const winner = finished[0]
  if (!winner) return 'sin ganador (nadie terminó)'
  const lines = [`ganador: ${label(winner.riderId)} en ${mmss(winner.tiempoS)}`]
  for (const r of finished.slice(1, 5)) {
    lines.push(`  ${r.puesto}.º ${label(r.riderId)} a +${mmss(r.tiempoS - winner.tiempoS)}`)
  }
  lines.push(
    `clasificados ${finished.length} · abandonos ${result.results.length - finished.length}`,
  )
  return lines.join('\n')
}

// ---------------------------------------------------------------------------- main

let source
try {
  source = flag('db') ? await dbSource() : bankSource()
} catch (err) {
  // Un fallo de fontanería es un mensaje, no un volcado de pila: esto se usa mirándolo.
  console.error(`\nrace-radio: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
}
if (source.refused) {
  console.error(`\n${source.refused}\n`)
  process.exit(2)
}

// UNA CRONO NO TIENE RADIO DE CARRERA, y decirlo es mejor que imprimir una tabla vacía: los grupos
// son de uno, no hay huecos que anunciar ni nadie a quien relevar, y `simulateStage` la desvía a
// `simulateTimeTrial`, que no toma fotos. Se lee por el reloj de meta, no por el kilómetro (v18).
if (source.input.timeTrial === true) {
  console.error(
    `\nrace-radio: ${raceId} e${day} es una CRONO. No hay radio de carrera que dar —cada corredor` +
      ` es su propio grupo—; su historia es el reloj de meta.\n`,
  )
  process.exit(3)
}

const totalKm = stageLengthKm(source.input.profile)
const collector = raceRadioCollector(radioKmPoints(totalKm, EVERY), {
  starters: source.input.riders.length,
  maxPullers: Math.max(MAX_PULLERS, 3),
})
const result = simulateStage(source.input, source.seed, collector.probe)
const radio = collector.radio()

console.log(
  render(radio, source.names, {
    title: `RACE RADIO · ${source.raceName} e${day} «${source.stageName}» · ${totalKm.toFixed(0)} km · ${source.input.riders.length} corredores${source.input.timeTrial ? ' · CRONO' : ''}`,
    origin: source.origin,
  }),
)
console.log('')
console.log(outcome(result, source.names))
console.log('')
