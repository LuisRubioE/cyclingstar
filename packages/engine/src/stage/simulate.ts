/**
 * Simulación de una etapa completa, bloque a bloque (SPEC 6.16).
 * - Paso 24: etapa llana de principio a fin (fuga 6.10, controlador 6.9, banners 6.11, sprint 6.12).
 * - Paso 26: montaña: descuelgue en los puertos (6.8), muros con COL (6.4), cimas puntuables y
 *   finales en alto donde la ley de velocidad integra las diferencias sola.
 * Puro y determinista: todo el azar entra por los subflujos nominales del RNG (6.1).
 */
import { normal, type Rng } from '../random.js'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import { EventLog } from './events.js'
import { type Group, advanceGroup, createGroup, gapSeconds, percentile75 } from './group.js'
import { blockCost, blockPerfil, effNow, erosion } from './physics.js'
import { rollHazard } from './hazard.js'
import { rollCrash } from './crash.js'
import { sampleProfile, stageLengthKm } from './sample.js'
import { stageRng } from './rng.js'
import { simulateTimeTrial } from './timetrial.js'
import type { Block, Incident, StageInput, StageOutput, StageResult, StageRider } from './types.js'

const PELOTON = 'peloton'
const BREAKAWAY = 'fuga'

/** Estado mutable de un corredor durante la simulación. */
interface RiderSim {
  input: StageRider
  energy0: number
  energy: number
  groupId: string
  work: number
  finishTs: number | null
  bonusS: number
  sprintPts: number
  climbPts: number
  matches: number
  /** Bloques que resta el impulso de un cerillo gastado (+10 al terreno, SPEC 6.6). */
  climbBoostBlocks: number
  incident: Incident | null
}

/** ¿Es este corredor un candidato a la fuga (SPEC 6.10)? */
function isBreakawayCandidate(r: StageRider): boolean {
  return (
    r.orders.role === 'cazaetapas' ||
    r.orders.mentality === 'supercombativo' ||
    r.orders.mentality === 'combativo'
  )
}

/** ¿Interesa a este corredor la llegada masiva (SPEC 6.9)? */
function isSprinter(r: StageRider): boolean {
  return r.orders.role === 'sprinter' || r.eff0.SPR >= 70
}

/**
 * Perfil efectivo de un corredor en un bloque, ya con la erosión del momento (SPEC 6.4, 6.7).
 * En los muros (subida corta y empinada) manda COL en vez de MON; un cerillo activo suma +10.
 */
function riderPerfil(sim: RiderSim, block: Block): number {
  const e = erosion(sim.energy, sim.energy0, sim.input.eff0.RES)
  const eff = effNow(sim.input.eff0, e)
  const useCol = block.tipo === 'subida' && block.g >= STAGE.wallMinGradient
  let perfil = blockPerfil(eff, block, useCol)
  if (sim.climbBoostBlocks > 0 && block.tipo === 'subida') perfil += STAGE.matchBonus
  return perfil
}

/**
 * P75 del perfil de quienes marcan el ritmo (SPEC 6.4). No lo marca todo el grupo, sino su
 * fracción más fuerte al frente: los relevadores del pelotón o de la fuga. Cuando esos punteros
 * se erosionan, el P75 cae y el grupo afloja aunque quiera (SPEC 6.9).
 */
function pacemakerP75(members: RiderSim[], block: Block, fraction: number): number {
  if (members.length === 0) return 0
  const perfils = members.map((m) => riderPerfil(m, block)).sort((a, b) => b - a)
  const k = Math.max(1, Math.ceil(fraction * perfils.length))
  return percentile75(perfils.slice(0, k))
}

export function simulateStage(input: StageInput, seed: string): StageOutput {
  // Contrarreloj: grupos de un corredor, sin drafting ni hazards de ataque (SPEC 6.13).
  if (input.timeTrial) return simulateTimeTrial(input, seed)

  const streams = stageRng(seed)
  // Subflujos nominales creados UNA vez: reutilizarlos preserva la secuencia (SPEC 6.1).
  const rngBreak = streams('breakaway')
  const rngSprint = streams('sprint')
  const rngHazard = streams('hazard')
  const rngCrash = streams('crash')
  const incidents: Incident[] = []

  const blocks = sampleProfile(input.profile)
  const totalKm = stageLengthKm(input.profile)
  const n = blocks.length
  const log = new EventLog()

  const sims = new Map<string, RiderSim>()
  for (const r of input.riders) {
    sims.set(r.riderId, {
      input: r,
      energy0: r.energy,
      energy: r.energy,
      groupId: PELOTON,
      work: 0,
      finishTs: null,
      bonusS: 0,
      sprintPts: 0,
      climbPts: 0,
      matches: r.matches,
      climbBoostBlocks: 0,
      incident: null,
    })
  }
  const membersOf = (groupId: string): RiderSim[] =>
    [...sims.values()].filter((s) => s.groupId === groupId && s.finishTs === null)

  let peloton = createGroup(
    PELOTON,
    input.riders.map((r) => r.riderId),
    { compromiso: STAGE.commitIdle },
  )
  let breakaway: Group | null = null
  // Grupos de descolgados: cada uno rueda a su propia velocidad (SPEC 6.3, 6.8).
  const shed: Group[] = []
  let shedCounter = 0

  let lowCommitKm = 0
  let chaseAbandoned = false
  let consolidated = false
  let caught = false
  let separated = false

  const kmAt = (i: number): number => (i + 0.5) * STAGE.dx

  // --- Formación de la fuga (SPEC 6.10) ---------------------------------------------------
  {
    const scored = input.riders
      .filter(isBreakawayCandidate)
      .map((r) => ({
        r,
        score:
          STAGE.breakawayScoreTac * r.eff0.TAC +
          STAGE.breakawayScoreLla * r.eff0.LLA +
          STAGE.breakawayScoreRng * 100 * rngBreak(),
      }))
      .sort((a, b) => b.score - a.score)
    const size = Math.min(scored.length, 3 + Math.floor(rngBreak() * 4)) // 3..6
    const fugados = scored.slice(0, size).map((s) => s.r.riderId)
    if (fugados.length >= 2) {
      for (const id of fugados) sims.get(id)!.groupId = BREAKAWAY
      peloton = { ...peloton, riderIds: peloton.riderIds.filter((id) => !fugados.includes(id)) }
      const coop =
        STAGE.breakawayCommitMin +
        (STAGE.breakawayCommitMax - STAGE.breakawayCommitMin) * rngBreak()
      breakaway = createGroup(BREAKAWAY, fugados, {
        tS: peloton.tS,
        vActual: peloton.vActual,
        compromiso: coop,
      })
      log.emit(0, breakaway.tS, 'fuga_formada', 'breakaway_formed', fugados)
    }
  }
  // Los sprinters solo cazan si la meta es llana (una llegada masiva que puedan disputar): en un
  // final en alto no persiguen, y la fuga vive o muere en la subida (SPEC 6.9).
  const finalStretch = blocks.slice(Math.max(0, n - STAGE.finalBlocks))
  const finishFlat = finalStretch.every((b) => b.tipo === 'llano' || b.tipo === 'descenso')
  // Final en alto: el tramo de meta trepa. El orden de meta lo decide entonces la escalada.
  const finishUphill = finalStretch.some((b) => b.tipo === 'subida')
  const chasingSprinters = input.riders.some(isSprinter) && finishFlat

  // --- Bucle principal (SPEC 6.16) --------------------------------------------------------
  for (let i = 0; i < n; i++) {
    const block = blocks[i]!
    const km = kmAt(i)
    const isFinal = n - i <= STAGE.finalBlocks

    // Caduca el impulso de cerillo de todos los corredores en carrera.
    for (const s of sims.values()) if (s.climbBoostBlocks > 0) s.climbBoostBlocks -= 1

    // Controlador del pelotón cada 10 bloques, con histéresis (SPEC 6.9).
    if (breakaway && !caught && i % STAGE.decisionEveryBlocks === 0) {
      const gap = peloton.tS - breakaway.tS
      const kmRestantes = totalKm - km
      let target: number = STAGE.commitIdle
      if (chasingSprinters && !chaseAbandoned) {
        // Los sprinters quieren capturar en meta: el boquete deseado mengua a 0 en finish - 12 km.
        const frac = Math.min(
          1,
          Math.max(
            0,
            (kmRestantes - STAGE.chaseCatchTargetKm) / (totalKm - STAGE.chaseCatchTargetKm),
          ),
        )
        const desiredGap = STAGE.chaseMaxLeashSeconds * frac
        const err = gap - desiredGap
        const cierreNecesario = gap / Math.max(1, kmRestantes - STAGE.chaseCatchTargetKm)
        if (cierreNecesario > STAGE.chaseFeasibleSecondsPerKm) {
          chaseAbandoned = true
          log.emit(km, peloton.tS, 'caza_abandonada', 'sprinters_give_up', [])
        } else {
          target = Math.min(1, Math.max(0.1, STAGE.chaseHoldCommit + STAGE.chaseGain * err))
        }
      } else {
        // Control de la general: en el llano el pelotón rueda a tempo para limitar el boquete (no
        // capturar); pero en cuanto empieza a subir, los favoritos atacan a tope y la subida
        // decide (SPEC 6.9). Boquete deseado constante fuera de la subida.
        const err = gap - STAGE.gcControlLeash
        target =
          block.tipo === 'subida'
            ? STAGE.climbRaceCommit
            : Math.min(1, Math.max(0.1, STAGE.chaseHoldCommit + STAGE.chaseGain * err))
      }
      peloton = {
        ...peloton,
        compromiso: peloton.compromiso + (target - peloton.compromiso) * STAGE.commitHysteresis,
      }
      if (!consolidated) {
        if (peloton.compromiso < STAGE.breakawayCommitThreshold) {
          lowCommitKm += STAGE.decisionEveryBlocks * STAGE.dx
          if (lowCommitKm >= STAGE.breakawayConsolidateKm) {
            consolidated = true
            log.emit(km, peloton.tS, 'fuga_consolidada', 'peloton_concedes', breakaway.riderIds)
          }
        } else {
          lowCommitKm = 0
        }
      }
    }

    // Avance físico de un grupo y gasto de energía de sus corredores.
    const advance = (group: Group, members: RiderSim[], paceFraction: number): Group => {
      if (members.length === 0) return group
      const p75 = pacemakerP75(members, block, paceFraction)
      const next = advanceGroup(group, block, p75, { isFinal })
      members.forEach((m, idx) => {
        const relaying = idx / members.length < paceFraction
        const shelter = relaying ? STAGE.shelterRelay : STAGE.shelterProtected
        const cost = blockCost(block, group.compromiso, shelter)
        m.energy = Math.max(0, m.energy - cost)
        m.work += cost
      })
      return next
    }

    // Descuelgue en los puertos (SPEC 6.8): quien no aguanta el P75 del grupo se cae o quema un
    // cerillo. Fuera de subida no pasa nada, así que el llano queda intacto.
    const shatter = (group: Group, members: RiderSim[], paceFraction: number): void => {
      if (block.tipo !== 'subida') return
      const pace = pacemakerP75(members, block, paceFraction)
      for (const m of members) {
        const deficit = pace - riderPerfil(m, block)
        if (deficit <= STAGE.dropDeficitTolerance) continue
        const lambda = (STAGE.lambdaDropBase * deficit) / STAGE.dropDeficitDenom
        if (!rollHazard(rngHazard, lambda)) continue
        if (m.matches > 0 && m.input.orders.mentality !== 'reservon') {
          m.matches -= 1
          m.climbBoostBlocks = STAGE.matchBonusBlocks
        } else {
          shedCounter += 1
          const gid = `shed-${shedCounter}`
          m.groupId = gid
          shed.push(
            createGroup(gid, [m.input.riderId], {
              tS: group.tS,
              vActual: group.vActual,
              compromiso: STAGE.shedCommit,
            }),
          )
        }
      }
    }

    // En subida mandan los más fuertes (fracción menor): el grupo se estira y se descuelga.
    const onClimb = block.tipo === 'subida'
    const pelFrac = onClimb ? STAGE.climbPaceFraction : STAGE.pelotonPaceFraction
    const brkFrac = onClimb ? STAGE.climbPaceFraction : (breakaway?.coop ?? STAGE.climbPaceFraction)

    shatter(peloton, membersOf(PELOTON), pelFrac)
    if (breakaway && !caught) shatter(breakaway, membersOf(BREAKAWAY), brkFrac)

    peloton = advance(peloton, membersOf(PELOTON), pelFrac)
    if (breakaway && !caught) breakaway = advance(breakaway, membersOf(BREAKAWAY), brkFrac)
    for (let g = 0; g < shed.length; g++) {
      shed[g] = advance(shed[g]!, membersOf(shed[g]!.id), 1)
    }

    // Caídas e incidentes (SPEC 6.14): en pavés, descensos y el embudo final. El caído pierde
    // tiempo y sale del grupo; una lesión se arrastra días (lo consume el tick, no el motor).
    const crashCheck = (group: Group): void => {
      for (const m of membersOf(group.id)) {
        const e = erosion(m.energy, m.energy0, m.input.eff0.RES)
        const eff = effNow(m.input.eff0, e)
        const out = rollCrash(rngCrash, block, isFinal, eff, e, m.input.fragility ?? 1)
        if (!out) continue
        incidents.push({ riderId: m.input.riderId, km, tipo: 'caida', ...out })
        shedCounter += 1
        const gid = `shed-${shedCounter}`
        m.groupId = gid
        shed.push(
          createGroup(gid, [m.input.riderId], {
            tS: group.tS + out.perdidaS,
            vActual: group.vActual,
            compromiso: STAGE.shedCommit,
          }),
        )
      }
    }
    crashCheck(peloton)
    if (breakaway && !caught) crashCheck(breakaway)

    // Captura de la fuga por el pelotón (SPEC 6.3).
    if (breakaway && !caught) {
      if (gapSeconds(peloton, breakaway) > STAGE.captureGapSeconds) separated = true
      if (separated && gapSeconds(peloton, breakaway) <= STAGE.captureGapSeconds) {
        caught = true
        for (const m of membersOf(BREAKAWAY)) m.groupId = PELOTON
        peloton = {
          ...peloton,
          riderIds: [...peloton.riderIds, ...breakaway.riderIds],
          tS: Math.min(peloton.tS, breakaway.tS),
        }
        log.emit(km, peloton.tS, 'fuga_cazada', 'breakaway_caught', breakaway.riderIds)
        breakaway = null
      }
    }

    // Disputa de banners (SPEC 6.11).
    if (block.banner === 'meta_volante') {
      // Meta volante: solo el grupo de cabeza esprinta por los puntos.
      const frontIsBreak = breakaway !== null && !caught && breakaway.tS <= peloton.tS
      const front = frontIsBreak ? membersOf(BREAKAWAY) : membersOf(PELOTON)
      const frontTs = frontIsBreak ? breakaway!.tS : peloton.tS
      disputeBanner(front, block, km, frontTs, log, rngSprint)
    } else if (block.banner === 'cima') {
      // Cima: puntúan los primeros en coronar en TODO el pelotón, no solo el grupo de cabeza, así
      // la clasificación de la montaña reparte entre varios escaladores (SPEC 6.11).
      const groups = [peloton, ...(breakaway && !caught ? [breakaway] : []), ...shed]
        .map((g) => ({ tS: g.tS, members: membersOf(g.id) }))
        .filter((g) => g.members.length > 0)
        .sort((a, b) => a.tS - b.tS)
      disputeClimb(groups, block, km, log, rngSprint)
    }
  }

  // --- Meta y resultados (SPEC 6.12, 6.15) -----------------------------------------------
  const allGroups: Group[] = [peloton, ...(breakaway && !caught ? [breakaway] : []), ...shed]
  finishStage(sims, allGroups, log, rngSprint, totalKm, finishUphill)

  const results = buildResults(sims)
  const workUnits = new Map<string, number>()
  for (const [id, s] of sims) workUnits.set(id, s.work)

  return { events: log.toArray(), results, workUnits, incidents, engineVersion: ENGINE_VERSION }
}

/** TSS de etapa derivado del gasto de un corredor (workUnits), para el Banister (SPEC 5.1, 6.15). */
export function stageTss(workUnits: number): number {
  return workUnits * STAGE.tssPerWorkUnit
}

/** Mini sprint por los puntos de un banner (SPEC 6.11). El mejor del grupo se los lleva. */
function disputeBanner(
  members: RiderSim[],
  block: Block,
  km: number,
  tS: number,
  log: EventLog,
  rngSprint: Rng,
): void {
  const interested = members.filter((m) =>
    block.banner === 'meta_volante' ? m.input.orders.contestSprints : m.input.orders.contestClimbs,
  )
  const contenders = interested.length > 0 ? interested : members
  if (contenders.length === 0) return
  const isSprint = block.banner === 'meta_volante'
  const table = isSprint ? STAGE.sprintPoints : climbTable(block)
  const ranked = contenders
    .map((m) => ({
      m,
      // La volante la define SPR; la cima, el perfil de escalador (MON/COL).
      score:
        (isSprint ? m.input.eff0.SPR : Math.max(m.input.eff0.MON, m.input.eff0.COL)) *
        (0.9 + 0.2 * rngSprint()),
    }))
    .sort((a, b) => b.score - a.score)
  ranked.forEach(({ m }, idx) => {
    const pts = table[idx] ?? 0
    if (pts <= 0) return
    for (const c of contenders) c.energy = Math.max(0, c.energy - STAGE.bannerCost)
    if (isSprint) m.sprintPts += pts
    else m.climbPts += pts
  })
  const winner = ranked[0]?.m
  if (winner) {
    log.emit(km, tS, 'banner', isSprint ? 'sprint_intermediate' : 'climb_kom', [
      winner.input.riderId,
    ])
  }
}

/**
 * Puntos de una cima repartidos por orden de coronación en todo el pelotón (SPEC 6.11): los grupos
 * cruzan la cima en orden de tiempo; dentro de cada grupo corona antes el mejor escalador.
 */
function disputeClimb(
  groups: { tS: number; members: RiderSim[] }[],
  block: Block,
  km: number,
  log: EventLog,
  rngSprint: Rng,
): void {
  const table = climbTable(block)
  const ordered: RiderSim[] = []
  for (const g of groups) {
    const ranked = g.members
      .map((m) => ({
        m,
        score: Math.max(m.input.eff0.MON, m.input.eff0.COL) * (0.9 + 0.2 * rngSprint()),
      }))
      .sort((a, b) => b.score - a.score)
    for (const r of ranked) ordered.push(r.m)
  }
  ordered.forEach((m, idx) => {
    const pts = table[idx] ?? 0
    if (pts <= 0) return
    m.energy = Math.max(0, m.energy - STAGE.bannerCost)
    m.climbPts += pts
  })
  const winner = ordered[0]
  if (winner) {
    log.emit(km, groups[0]?.tS ?? 0, 'banner', 'climb_kom', [winner.input.riderId])
  }
}

/** Puntos de una cima según su categoría, derivada de la dureza local (SPEC 6.2, 6.11). */
function climbTable(block: Block): readonly number[] {
  const cat = block.climbCategory
  if (cat === 'HC') return STAGE.climbPoints.HC
  if (cat === 'cat1') return STAGE.climbPoints.cat1
  if (cat === 'cat2') return STAGE.climbPoints.cat2
  if (cat === 'cat3') return STAGE.climbPoints.cat3
  return STAGE.climbPoints.cat4
}

/**
 * Cierra la etapa: define el orden dentro de cada grupo y los tiempos (SPEC 6.12). En una llegada
 * masiva manda el SPR; en un final en alto, la capacidad escaladora (MON/COL), así el ganador de
 * una etapa de montaña es un escalador, coherente con quien corona primero.
 */
function finishStage(
  sims: Map<string, RiderSim>,
  groups: Group[],
  log: EventLog,
  rngSprint: Rng,
  totalKm: number,
  finishUphill: boolean,
): void {
  const withMembers = groups
    .map((group) => ({ group, members: [...sims.values()].filter((s) => s.groupId === group.id) }))
    .filter((g) => g.members.length > 0)
  withMembers.sort((a, b) => a.group.tS - b.group.tS)

  withMembers.forEach(({ group, members }, gi) => {
    const ranked = members
      .map((m) => {
        const e = erosion(m.energy, m.energy0, m.input.eff0.RES)
        const eff = effNow(m.input.eff0, e)
        const base = finishUphill ? Math.max(eff.MON, eff.COL) : eff.SPR
        const score = base * normal(rngSprint, 1, STAGE.sprintScoreNoiseSd)
        return { m, score }
      })
      .sort((a, b) => b.score - a.score)
    ranked.forEach(({ m }, idx) => {
      m.finishTs = group.tS + idx * 1e-3
    })
    if (gi === 0 && ranked[0]) {
      log.emit(totalKm, group.tS, 'meta', 'stage_win', [ranked[0].m.input.riderId])
    }
  })
}

/** Ordena a todos por tiempo, asigna puestos y bonificaciones (SPEC 6.15). */
function buildResults(sims: Map<string, RiderSim>): StageResult[] {
  const finishers = [...sims.values()]
    .filter((s) => s.finishTs !== null)
    .sort((a, b) => a.finishTs! - b.finishTs!)
  finishers.forEach((s, idx) => {
    s.bonusS = STAGE.timeBonuses[idx] ?? 0
    // La meta de etapa reparte puntos de regularidad (SPEC 6.11): la fuente principal de la
    // clasificación por puntos, no solo las metas volantes intermedias.
    s.sprintPts += STAGE.finishPoints[idx] ?? 0
  })
  return finishers.map((s, idx) => ({
    riderId: s.input.riderId,
    puesto: idx + 1,
    tiempoS: Math.round(s.finishTs!),
    bonificacionS: s.bonusS,
    puntosVolante: s.sprintPts,
    puntosMontana: s.climbPts,
    estado: 'finish' as const,
  }))
}
