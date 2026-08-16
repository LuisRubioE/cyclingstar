#!/usr/bin/env node
/**
 * ¿SON POSIBLES LOS HUECOS QUE ENSEÑA LA RADIO? (banco de la física entre dos fotos).
 *
 * Tres cosas que el dueño vio en la Race Radio de Race Sardegna e3 y que no se habían medido nunca:
 *
 *  1. **El descolgado que va tan rápido como el pelotón.** «Hay un ciclista suelto que se quedó
 *     descolgado del pelotón… ¿cómo es posible que vaya tan rápido como el pelotón?». Un hombre solo
 *     no tiene rueda a la que ir: paga el viento entero (`shelterAlone`) contra el 42 % de rebufo de
 *     un grupo en llano, así que TIENE que ir más despacio. Si no lo va, hay un defecto de física.
 *  2. **Los 30 s cerrados en un kilómetro.** «No entiendo cómo en 1 km se han reducido 30 segundos
 *     de distancia entre algunos grupos». La cuenta de servilleta dice que es muchísimo: a 45 km/h
 *     un kilómetro se cubre en 80 s, así que ganar 30 s en ese kilómetro exige cubrirlo en 50 s, o
 *     sea a 72 km/h. En llano y sin bajada, eso no existe.
 *  3. **Los grupos que se reúnen de golpe.** «En el siguiente km se reúnen mágicamente 3 grupos».
 *     Una fusión es normal cuando el hueco ya era de segundos; lo que hay que mirar es la COLA: con
 *     cuánto hueco desaparece un grupo dentro de otro.
 *
 * Las tres son la misma pregunta —qué le pasa a los huecos de una foto a la siguiente— y por eso
 * viven en un solo banco. El hueco NO se estima: es la resta de los relojes de dos grupos en el
 * mismo kilómetro, que es lo que hace la propia radio.
 *
 * MIDE, NO ACUSA. Un cierre grande puede ser legítimo —una bajada, un abanico, un grupo que se
 * rinde— así que lo que se imprime es la DISTRIBUCIÓN y la cola, con el peor caso identificado por
 * carrera, etapa y kilómetro para poder ir a mirarlo con `scripts/race-radio.mjs`.
 *
 * No vive en packages/engine/src porque el motor es puro y esto es herramienta de banco: lee del
 * `dist` ya compilado, igual que `pnpm sim` y que el resto de `scripts/medir-*.mjs`.
 *
 * Uso:
 *   pnpm --filter @cyclingstar/engine build
 *   node scripts/medir-huecos.mjs [semillas]
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

const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']
const NEUTRAL = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

/** Carreras de banco: variadas de terreno, que es lo que mueve los huecos. */
const RACES = [
  'race-sardegna',
  'race-besseges',
  'race-provence',
  'race-colombia',
  'race-oman',
  'race-victoria',
]

/** Por encima de esto, un cierre en UN kilómetro merece que alguien lo mire. */
const CIERRE_SOSPECHOSO_S = 20
/** Y por encima de esto ya no hay carretera que lo explique en llano. */
const CIERRE_IMPOSIBLE_S = 30
/** Una fusión con más hueco que esto no es «se juntaron»: es un grupo que desaparece. */
const FUSION_SOSPECHOSA_S = 20

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

/** Una etapa corrida con su radio kilómetro a kilómetro. */
function radioDe(race, stage, run) {
  const worldSeed = `huecos-${race.id}-${run}`
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
  const col = raceRadioCollector(radioKmPoints(stageLengthKm(stage.profile)))
  simulateStage(
    { profile: stage.profile, riders },
    stageSeed({ worldSeed, raceId: race.id, stageDay: stage.index, engineVersion: 1 }),
    col.probe,
  )
  return col.radio()
}

const pct = (n, d) => (d > 0 ? `${((100 * n) / d).toFixed(2)} %` : '—')
function cuantiles(xs) {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))]
  return { p50: at(0.5), p90: at(0.9), p99: at(0.99), max: s[s.length - 1] }
}

// --- La medida ------------------------------------------------------------------------------

const runs = Number(process.argv[2] ?? 3)

/** 1. El solitario contra el pelotón: diferencia de velocidad en el MISMO kilómetro. */
const solitarioDelta = []
let solitarioIgualOMas = 0
let peorSolitario = null
/** 2. Cierre de hueco por kilómetro. Cerrar y ABRIR no son lo mismo —un grupo que revienta abre
 *  cien segundos sin que eso sea raro—, así que van por separado y la queja era del cierre. */
const cierres = []
const aperturas = []
let sospechosos = 0
let imposibles = 0
let peorCierre = null
/** 3. Con cuánto hueco desaparece un grupo dentro de otro. */
const fusiones = []
let fusionesSospechosas = 0
let peorFusion = null
let paresMedidos = 0
/**
 * EL CONTROL QUE HAY QUE HACER ANTES DE ACUSAR A NADIE. El pelotón es «el grupo que lleva la gente»
 * y puede CAMBIAR de identidad de una foto a la otra (`mainGroupId`, con su histéresis). Si eso
 * pasa, restar el hueco de un grupo contra «el pelotón» en las dos fotos es restar contra DOS
 * referencias distintas, y sale un cierre gigantesco que no ha ocurrido en la carretera. Esos pares
 * se apartan y se cuentan, en vez de colarlos en la estadística.
 */
let paresConRelevoDePeloton = 0

for (const raceId of RACES) {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race) continue
  for (const stage of race.stages) {
    if (stage.timeTrial) continue
    for (let run = 0; run < runs; run++) {
      const radio = radioDe(race, stage, run)
      for (let i = 0; i < radio.kms.length - 1; i++) {
        const aqui = radio.kms[i]
        const luego = radio.kms[i + 1]
        const dKm = luego.km - aqui.km
        if (dKm <= 0) continue
        const donde = `${race.id} e${stage.index} km ${aqui.km.toFixed(0)} (semilla ${run})`
        const luegoPorId = new Map(luego.groups.map((g) => [g.id, g]))
        // A DÓNDE fue cada grupo: por id, y si desapareció, con quién acabó su gente (la misma
        // regla que usa la radio para no perder la velocidad de un grupo que se funde).
        const destino = (g) => {
          const mismo = luegoPorId.get(g.id)
          if (mismo) return { grupo: mismo, fundido: false }
          const mios = new Set(g.riderIds)
          let mejor = null
          let n = 0
          for (const o of luego.groups) {
            let c = 0
            for (const id of o.riderIds) if (mios.has(id)) c += 1
            if (c > n) {
              n = c
              mejor = o
            }
          }
          return mejor ? { grupo: mejor, fundido: true } : null
        }
        const velocidad = (g) => {
          const d = destino(g)
          if (!d) return null
          const dt = d.grupo.tS - g.tS
          return dt > 0 ? (3600 * dKm) / dt : null
        }
        const pelotonAqui = aqui.groups.find((g) => g.id === aqui.mainId)
        const pelotonLuego = luego.groups.find((g) => g.id === luego.mainId)
        if (!pelotonAqui || !pelotonLuego) continue
        // El pelotón cambió de dueño entre las dos fotos: la referencia no es la misma y cualquier
        // resta de huecos aquí mide el relevo del título, no la carretera.
        if (aqui.mainId !== luego.mainId) {
          paresConRelevoDePeloton += 1
          continue
        }
        paresMedidos += 1
        const vPeloton = velocidad(pelotonAqui)

        for (const g of aqui.groups) {
          if (g.id === aqui.mainId) continue
          const d = destino(g)

          // 1. EL SOLITARIO DESCOLGADO. Solo cuenta el que va por DETRÁS del pelotón y solo: el que
          //    va escapado delante está haciendo otra cosa (y va a tope, no a rueda de nadie).
          // …y solo mientras siga rodando SOLO: si se funde con otro grupo, su «velocidad» ya no es
          // la suya, es la del grupo que lo recogió más el hueco que cerró de golpe.
          if (g.size === 1 && g.tS > pelotonAqui.tS && vPeloton != null && d && !d.fundido) {
            const v = velocidad(g)
            if (v != null) {
              const delta = v - vPeloton
              solitarioDelta.push(delta)
              if (delta >= 0) solitarioIgualOMas += 1
              if (!peorSolitario || delta > peorSolitario.delta) {
                peorSolitario = { delta, v, vPeloton, donde }
              }
            }
          }

          // 2. EL CIERRE POR KILÓMETRO. Solo si el grupo sigue existiendo: si se fundió, el hueco no
          //    se «cerró», se acabó, y eso se cuenta aparte.
          if (d && !d.fundido) {
            const antes = g.tS - pelotonAqui.tS
            const ahora = d.grupo.tS - pelotonLuego.tS
            // Positivo = el hueco se RECORTA (se acercan). Negativo = se abre.
            const cierre = (Math.abs(antes) - Math.abs(ahora)) / dKm
            if (cierre >= 0) {
              cierres.push(cierre)
              if (cierre >= CIERRE_SOSPECHOSO_S) sospechosos += 1
              if (cierre >= CIERRE_IMPOSIBLE_S) imposibles += 1
              if (!peorCierre || cierre > peorCierre.cierre) {
                peorCierre = { cierre, antes, ahora, size: g.size, donde }
              }
            } else aperturas.push(-cierre)
          }

          // 3. LA FUSIÓN. Con cuánto hueco desaparece este grupo dentro de otro.
          if (d && d.fundido) {
            // EL HUECO QUE IMPORTA ES CONTRA EL GRUPO QUE SE LO COME, no contra el pelotón: un
            // grupeto a veinte minutos del pelotón que se junta con otro grupeto que va a su lado no
            // ha hecho nada raro, y medirlo contra el pelotón lo pintaba como un salto de 1.217 s.
            const otroAntes = aqui.groups.find((o) => o.id === d.grupo.id)
            const hueco = otroAntes ? Math.abs(g.tS - otroAntes.tS) : null
            if (hueco != null) {
              fusiones.push(hueco)
              if (hueco >= FUSION_SOSPECHOSA_S) fusionesSospechosas += 1
              if (!peorFusion || hueco > peorFusion.hueco) {
                peorFusion = { hueco, size: g.size, donde }
              }
            }
          }
        }
      }
    }
  }
}

console.log(
  `\nBANCO DE HUECOS — ${RACES.length} carreras × ${runs} semillas · ${paresMedidos.toLocaleString('es')} pares de fotos consecutivas` +
    `\n(apartados ${paresConRelevoDePeloton} pares en los que el pelotón cambió de dueño: ahí la referencia no es la misma)\n`,
)

console.log('1. EL DESCOLGADO SOLITARIO contra el pelotón, en el mismo kilómetro')
const q1 = cuantiles(solitarioDelta)
if (!q1) console.log('   (no ha habido ningún descolgado solo detrás del pelotón)')
else {
  console.log(`   casos medidos: ${solitarioDelta.length}`)
  console.log(
    `   diferencia de velocidad (km/h, negativo = más lento que el pelotón, que es lo esperado):`,
  )
  console.log(
    `     mediana ${q1.p50.toFixed(1)} · p90 ${q1.p90.toFixed(1)} · p99 ${q1.p99.toFixed(1)} · máx ${q1.max.toFixed(1)}`,
  )
  console.log(
    `   VA IGUAL O MÁS RÁPIDO que el pelotón: ${solitarioIgualOMas} (${pct(solitarioIgualOMas, solitarioDelta.length)})`,
  )
  if (peorSolitario) {
    console.log(
      `   peor caso: +${peorSolitario.delta.toFixed(1)} km/h (${peorSolitario.v.toFixed(1)} contra ${peorSolitario.vPeloton.toFixed(1)}) — ${peorSolitario.donde}`,
    )
  }
}

console.log('\n2. CIERRE DE HUECO en UN kilómetro (grupos que siguen existiendo)')
const q2 = cuantiles(cierres)
if (!q2) console.log('   (sin datos)')
else {
  console.log(`   casos medidos: ${cierres.length}`)
  console.log(
    `   segundos por km: mediana ${q2.p50.toFixed(1)} · p90 ${q2.p90.toFixed(1)} · p99 ${q2.p99.toFixed(1)} · máx ${q2.max.toFixed(1)}`,
  )
  console.log(
    `   ≥ ${CIERRE_SOSPECHOSO_S} s/km: ${sospechosos} (${pct(sospechosos, cierres.length)}) · ≥ ${CIERRE_IMPOSIBLE_S} s/km: ${imposibles} (${pct(imposibles, cierres.length)})`,
  )
  const qA = cuantiles(aperturas)
  if (qA) {
    console.log(
      `   (para comparar, huecos que se ABREN: ${aperturas.length} casos, mediana ${qA.p50.toFixed(1)} · p99 ${qA.p99.toFixed(1)} · máx ${qA.max.toFixed(1)} s/km)`,
    )
  }
  if (peorCierre) {
    console.log(
      `   peor caso: ${peorCierre.cierre.toFixed(1)} s en 1 km (de ${peorCierre.antes.toFixed(0)} s a ${peorCierre.ahora.toFixed(0)} s, grupo de ${peorCierre.size}) — ${peorCierre.donde}`,
    )
  }
}

console.log('\n3. FUSIONES: con cuánto hueco desaparece un grupo dentro de otro')
const q3 = cuantiles(fusiones)
if (!q3) console.log('   (sin datos)')
else {
  console.log(`   casos medidos: ${fusiones.length}`)
  console.log(
    `   hueco CONTRA EL GRUPO QUE SE LO COME al fundirse (s): mediana ${q3.p50.toFixed(1)} · p90 ${q3.p90.toFixed(1)} · p99 ${q3.p99.toFixed(1)} · máx ${q3.max.toFixed(1)}`,
  )
  console.log(
    `   se funden con ≥ ${FUSION_SOSPECHOSA_S} s de hueco: ${fusionesSospechosas} (${pct(fusionesSospechosas, fusiones.length)})`,
  )
  if (peorFusion) {
    console.log(
      `   peor caso: ${peorFusion.hueco.toFixed(0)} s de hueco, grupo de ${peorFusion.size} — ${peorFusion.donde}`,
    )
  }
}
console.log()
