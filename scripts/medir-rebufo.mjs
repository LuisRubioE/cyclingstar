#!/usr/bin/env node
/**
 * ¿QUIÉN PAGA VIENTO EN ESTA CARRERA? (banco del rebufo).
 *
 * El motor decide en cada bloque, para cada corredor, cuánto rebufo aprovecha (`shelterOf`), y de
 * ahí cuelga TODO lo que se gasta: el coste del bloque, la reserva y el trabajo que se le apunta.
 * Nunca se había mirado desde fuera. Este banco lo mira, y contesta las tres preguntas del encargo
 * de la v34 con números en vez de con una lectura del código:
 *
 *  1. **¿CUÁNTA GENTE ESTÁ EN EL VIENTO?** No cuántos van en cabeza en la foto de la radio, sino
 *     cuántos PAGAN. Se cuenta por estados y se resume en la única cifra que se puede contrastar
 *     con la carretera: la FACTURA del grupo en «hombres al viento», que es la suma sobre todos sus
 *     miembros de lo que a cada uno le falta de rebufo respecto a ir a rueda:
 *
 *         factura = Σ (shelterProtected − shelter_i) / shelterProtected
 *
 *     Un grupo que se releva tiene, en cada instante, UN hombre dando la cara y el resto a rueda.
 *     La factura de un pelotón que rueda a tempo, medida en la carretera, es 1. Lo que diga el
 *     banco por encima de 1 es viento que el motor se está inventando.
 *
 *  2. **¿EL LÍDER ARROPADO SE CANSA MÁS QUE UNO DEL FONDO DEL PELOTÓN?** «Va protegido y punto».
 *     Se compara el rebufo medio de un jefe de filas que lleva compañeros en su grupo contra la
 *     media de su propio grupo, y se cuenta cuántas veces entra al turno de relevos.
 *
 *  3. **¿LA LISTA DE «LOS QUE TIRAN» SIGNIFICA ALGO?** Cuántos corredores tiran del pelotón, de
 *     cuántos equipos distintos son, y cuántos de ellos son del equipo que lleva el frente. Una
 *     lista de treinta nombres de quince equipos no es un parte de radio: es un volcado.
 *
 * MIDE, NO ACUSA: imprime la distribución y el peor caso identificado por carrera y kilómetro, para
 * poder ir a mirarlo con `scripts/race-radio.mjs`.
 *
 * El rebufo NO se reimplementa aquí: se pide a `shelterOf` (packages/engine/src/stage/physics.ts),
 * que es la misma función que usa el motor. Así la medida de antes y la de después comparan lo
 * mismo aunque la regla cambie por dentro —las cifras de la v33 que cita docs/balance.md «v34» se
 * tomaron con este mismo banco sobre `c1ace88`, cuando `shelterOf` devolvía todavía cuatro
 * estados—.
 *
 * No vive en packages/engine/src porque el motor es puro y esto es herramienta de banco: lee del
 * `dist` ya compilado, igual que `pnpm sim` y que el resto de `scripts/medir-*.mjs`.
 *
 * Uso:
 *   pnpm --filter @cyclingstar/engine build
 *   node scripts/medir-rebufo.mjs [semillas]
 */
import { ATTRIBUTES, seededRng } from '../packages/shared/dist/index.js'
import { eff0, initialEnergy } from '../packages/engine/dist/banister.js'
import { STAGE } from '../packages/engine/dist/constants.js'
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { matchCount, shelterOf } from '../packages/engine/dist/stage/physics.js'
import { stageSeed } from '../packages/engine/dist/stage/rng.js'
import { simulateStage } from '../packages/engine/dist/stage/simulate.js'
import { stageLengthKm } from '../packages/engine/dist/stage/sample.js'
import { radioKmPoints } from '../packages/engine/dist/sim/raceRadio.js'
import { autoStageOrders } from '../packages/engine/dist/world/autoOrders.js'
import { generateNpcRider, sampleNpcAge } from '../packages/engine/dist/world/npc.js'

const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']
const NEUTRAL = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

/** Carreras de banco: variadas de terreno y de tamaño de campo, que es lo que mueve el reparto. */
const RACES = [
  'race-sardegna',
  'race-besseges',
  'race-provence',
  'race-colombia',
  'race-oman',
  'race-victoria',
]

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

/** Una etapa corrida, con una foto por kilómetro y las órdenes con las que se corrió. */
function correr(race, stage, run) {
  const worldSeed = `rebufo-${race.id}-${run}`
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
  const fotos = []
  simulateStage(
    { profile: stage.profile, riders },
    stageSeed({ worldSeed, raceId: race.id, stageDay: stage.index, engineVersion: 1 }),
    {
      atKm: radioKmPoints(stageLengthKm(stage.profile)),
      onSnapshot: (km, snap) => fotos.push({ km, snap: snap.map((r) => ({ ...r })) }),
    },
  )
  return {
    fotos,
    equipoDe: new Map(field.map((r) => [r.riderId, r.teamId])),
    rolDe: new Map(riders.map((r) => [r.riderId, r.orders.role])),
  }
}

const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—')
const pct = (n, d) => (d > 0 ? `${((100 * n) / d).toFixed(1)} %` : '—')

// --- La medida ------------------------------------------------------------------------------

const runs = Number(process.argv[2] ?? 3)

/** Los tres estados del motor (v34): solo es el caso n = 1 de «tira». */
const ESTADOS = ['solo', 'tira', 'a rueda']
const bloques = new Map(ESTADOS.map((e) => [e, 0]))
let bloquesTotal = 0
/** Rebufo medio y factura, SOLO del grupo principal: el pelotón es el que tiene el defecto. */
let facturaSuma = 0
let facturaN = 0
let peorFactura = null
/** Punto 2 del encargo: el jefe de filas arropado por los suyos. */
let liderShelter = 0
let liderN = 0
let liderEnTurno = 0
let liderGrupoShelter = 0
/** …y el contraste: el mismo número para el resto del pelotón (el «uno del fondo»). */
let fondoShelter = 0
let fondoN = 0
/** Punto 3: cuántos nombres y de cuántos equipos tiene la lista de «los que tiran». */
let listaTira = 0
let listaTiraEquipos = 0
/** …y si esa lista tiene DUEÑO: cuántos son del equipo más representado en ella. */
let listaDueno = 0
let listasN = 0

for (const raceId of RACES) {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race) continue
  for (const stage of race.stages) {
    if (stage.timeTrial) continue
    for (let run = 0; run < runs; run++) {
      const { fotos, equipoDe, rolDe } = correr(race, stage, run)
      for (const { km, snap } of fotos) {
        // Los grupos de esta foto, y cuál es el grande: el pelotón es donde vive la queja.
        const porGrupo = new Map()
        for (const r of snap) {
          const l = porGrupo.get(r.groupId)
          if (l) l.push(r)
          else porGrupo.set(r.groupId, [r])
        }
        let principal = null
        for (const [, mem] of porGrupo) {
          if (!principal || mem.length > principal.length) principal = mem
        }
        /** Cuántos tiran de cada grupo: es el `n` entre el que se reparte el viento. */
        const tirandoEn = new Map()
        for (const [id, mem] of porGrupo) tirandoEn.set(id, mem.filter((r) => r.pulling).length)
        for (const [id, mem] of porGrupo) {
          const n = tirandoEn.get(id)
          for (const r of mem) {
            const estado = !r.pulling ? 'a rueda' : n <= 1 ? 'solo' : 'tira'
            bloques.set(estado, bloques.get(estado) + 1)
            bloquesTotal += 1
          }
        }
        if (!principal || principal.length < 20) continue
        const nPrincipal = tirandoEn.get(principal[0].groupId)
        // 1. LA FACTURA DEL VIENTO del pelotón, en hombres.
        let factura = 0
        let sumaShelter = 0
        for (const r of principal) {
          const s = shelterOf(r.pulling, nPrincipal)
          factura += (STAGE.shelterProtected - s) / STAGE.shelterProtected
          sumaShelter += s
        }
        facturaSuma += factura
        facturaN += 1
        if (!peorFactura || factura > peorFactura.factura) {
          peorFactura = {
            factura,
            n: principal.length,
            donde: `${race.id} e${stage.index} km ${km.toFixed(0)} (semilla ${run})`,
          }
        }
        const mediaGrupo = sumaShelter / principal.length
        // 2. EL LÍDER ARROPADO, y el del fondo del pelotón con el que se compara.
        const conEquipo = new Map()
        for (const r of principal) {
          const t = equipoDe.get(r.riderId)
          conEquipo.set(t, (conEquipo.get(t) ?? 0) + 1)
        }
        for (const r of principal) {
          const rol = rolDe.get(r.riderId)
          const s = shelterOf(r.pulling, nPrincipal)
          if (rol === 'lider' && (conEquipo.get(equipoDe.get(r.riderId)) ?? 0) > 1) {
            liderShelter += s
            liderGrupoShelter += mediaGrupo
            liderEnTurno += r.pulling ? 1 : 0
            liderN += 1
          } else if (rol === 'gregario' || rol === 'libre') {
            fondoShelter += s
            fondoN += 1
          }
        }
        // 3. LA LISTA DE LA RADIO en este kilómetro.
        const tiran = principal.filter((r) => r.pulling)
        listaTira += tiran.length
        const porEquipo = new Map()
        for (const r of tiran) {
          const t = equipoDe.get(r.riderId)
          porEquipo.set(t, (porEquipo.get(t) ?? 0) + 1)
        }
        listaTiraEquipos += porEquipo.size
        listaDueno += Math.max(0, ...porEquipo.values())
        listasN += 1
      }
    }
  }
}

console.log('')
console.log('BANCO DEL REBUFO — quién paga viento y entre cuántos se reparte')
console.log(
  `  ${RACES.length} carreras · ${runs} semillas · foto cada km · ${bloquesTotal.toLocaleString('es')} bloques-corredor`,
)
console.log('')
console.log('1. EN QUÉ ESTADO VA CADA CORREDOR (todos los grupos)')
for (const e of ESTADOS) {
  console.log(`   ${e.padEnd(12)} ${pct(bloques.get(e), bloquesTotal).padStart(8)}`)
}
console.log('')
console.log('2. LA FACTURA DEL VIENTO DEL PELOTÓN, en hombres al viento')
console.log(`   media           ${f2(facturaSuma / facturaN).padStart(8)}   (la carretera dice 1)`)
if (peorFactura) {
  console.log(
    `   peor            ${f2(peorFactura.factura).padStart(8)}   con ${peorFactura.n} en el grupo — ${peorFactura.donde}`,
  )
}
console.log('')
console.log('3. EL JEFE DE FILAS ARROPADO POR LOS SUYOS')
console.log(
  `   su rebufo medio       ${f2(liderShelter / liderN).padStart(6)}   (${STAGE.shelterProtected} = va a rueda del todo)`,
)
console.log(`   media de SU grupo     ${f2(liderGrupoShelter / liderN).padStart(6)}`)
console.log(
  `   gregario/libre medio  ${f2(fondoShelter / fondoN).padStart(6)}   (${fondoN.toLocaleString('es')} casos)`,
)
console.log(
  `   entra al turno        ${pct(liderEnTurno, liderN).padStart(6)}   (${liderN.toLocaleString('es')} casos)`,
)
console.log('')
console.log('4. LO QUE PUEDE NOMBRAR LA RADIO EN EL PELOTÓN (media por kilómetro)')
console.log(
  `   los que tiran ${f2(listaTira / listasN).padStart(6)} nombres de ${f2(listaTiraEquipos / listasN)} equipos`,
)
console.log(
  `   y de ésos      ${f2(listaDueno / listasN).padStart(5)} son del equipo más representado (¿tiene dueño el frente?)`,
)
console.log('')
