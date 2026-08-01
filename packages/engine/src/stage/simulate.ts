/**
 * Simulación de una etapa completa, bloque a bloque (SPEC 6.16). El Paso 24 cubre la etapa
 * llana de principio a fin: fase de fuga y su sociología (6.10), controlador del pelotón con
 * histéresis (6.9), disputa de banners (6.11), y los últimos 2 km con el sprint (6.12).
 * Puro y determinista: todo el azar entra por los subflujos nominales del RNG (6.1).
 */
import { normal } from '../random.js'
import { STAGE } from '../constants.js'
import { EventLog } from './events.js'
import { type Group, advanceGroup, createGroup, gapSeconds, percentile75 } from './group.js'
import { blockCost, blockPerfil, effNow, erosion } from './physics.js'
import { sampleProfile, stageLengthKm } from './sample.js'
import { stageRng } from './rng.js'
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

/** Perfil efectivo de un corredor en un bloque, ya con la erosión del momento (SPEC 6.4, 6.7). */
function riderPerfil(sim: RiderSim, block: Block): number {
  const e = erosion(sim.energy, sim.energy0, sim.input.eff0.RES)
  const eff = effNow(sim.input.eff0, e)
  return blockPerfil(eff, block)
}

/** P75 del perfil de un grupo, que marca su ritmo (SPEC 6.4). */
function groupP75(members: RiderSim[], block: Block): number {
  return percentile75(members.map((m) => riderPerfil(m, block)))
}

export function simulateStage(input: StageInput, seed: string): StageOutput {
  const rng = stageRng(seed)
  const blocks = sampleProfile(input.profile)
  const totalKm = stageLengthKm(input.profile)
  const n = blocks.length
  const log = new EventLog()

  // Estado por corredor.
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
      incident: null,
    })
  }
  const membersOf = (groupId: string): RiderSim[] =>
    [...sims.values()].filter((s) => s.groupId === groupId && s.finishTs === null)

  // Grupos: arranca todo el mundo en el pelotón.
  let peloton = createGroup(
    PELOTON,
    input.riders.map((r) => r.riderId),
    {
      compromiso: STAGE.commitIdle,
    },
  )
  let breakaway: Group | null = null

  // Contadores del controlador (6.9) y de la consolidación de la fuga (6.10).
  let lowCommitKm = 0
  let chaseAbandoned = false
  let consolidated = false
  let caught = false
  // La fuga arranca pegada al pelotón (gap 0); no puede "cazarse" hasta separarse de verdad.
  let separated = false

  const kmAt = (i: number): number => (i + 0.5) * STAGE.dx

  // --- Formación de la fuga (SPEC 6.10) ---------------------------------------------------
  // Los candidatos saltan y forman UNA fuga (la sociología emergente detallada llega con el
  // balance del Paso 25; aquí basta una fuga coherente).
  {
    const scored = input.riders
      .filter(isBreakawayCandidate)
      .map((r) => ({
        r,
        score:
          STAGE.breakawayScoreTac * r.eff0.TAC +
          STAGE.breakawayScoreLla * r.eff0.LLA +
          STAGE.breakawayScoreRng * 100 * rng('breakaway')(),
      }))
      .sort((a, b) => b.score - a.score)
    const size = Math.min(scored.length, 3 + Math.floor(rng('breakaway')() * 4)) // 3..6
    const fugados = scored.slice(0, size).map((s) => s.r.riderId)
    if (fugados.length >= 2) {
      for (const id of fugados) sims.get(id)!.groupId = BREAKAWAY
      peloton = { ...peloton, riderIds: peloton.riderIds.filter((id) => !fugados.includes(id)) }
      breakaway = createGroup(BREAKAWAY, fugados, {
        tS: peloton.tS,
        vActual: peloton.vActual,
        compromiso: 0.85,
      })
      log.emit(0, breakaway.tS, 'fuga_formada', 'breakaway_formed', fugados)
    }
  }
  const hasSprinters = input.riders.some(isSprinter)

  // --- Bucle principal (SPEC 6.16) --------------------------------------------------------
  for (let i = 0; i < n; i++) {
    const block = blocks[i]!
    const km = kmAt(i)
    const isFinal = n - i <= STAGE.finalBlocks

    // Controlador del pelotón cada 10 bloques, con histéresis (SPEC 6.9).
    if (breakaway && !caught && i % STAGE.decisionEveryBlocks === 0) {
      const gap = peloton.tS - breakaway.tS // segundos que la fuga saca al pelotón
      const kmRestantes = totalKm - km
      let target: number = STAGE.commitIdle
      if (hasSprinters && !chaseAbandoned) {
        const margen = Math.max(1, kmRestantes - STAGE.chaseCatchTargetKm)
        const cierreNecesario = gap / margen // s/km que hay que recortar
        if (cierreNecesario <= STAGE.chaseFeasibleSecondsPerKm) {
          target = Math.min(1, cierreNecesario / STAGE.chaseFeasibleSecondsPerKm)
        } else {
          chaseAbandoned = true
          log.emit(km, peloton.tS, 'caza_abandonada', 'sprinters_give_up', [])
        }
      }
      peloton = {
        ...peloton,
        compromiso: peloton.compromiso + (target - peloton.compromiso) * STAGE.commitHysteresis,
      }
      // Consolidación de la fuga: compromiso bajo durante 2 km seguidos (SPEC 6.10).
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

    // Avance físico de cada grupo y gasto de energía de sus corredores.
    const advance = (group: Group, members: RiderSim[], relayFraction: number): Group => {
      if (members.length === 0) return group
      const p75 = groupP75(members, block)
      const next = advanceGroup(group, block, p75, { isFinal })
      members.forEach((m, idx) => {
        // En el pelotón casi todos van protegidos; en la fuga, los primeros relevan.
        const shelter =
          group.id === BREAKAWAY
            ? idx / members.length < relayFraction
              ? STAGE.shelterRelay
              : STAGE.shelterProtected
            : STAGE.shelterProtected
        const cost = blockCost(block, group.compromiso, shelter)
        m.energy = Math.max(0, m.energy - cost)
        m.work += cost
      })
      return next
    }

    peloton = advance(peloton, membersOf(PELOTON), 0)
    if (breakaway && !caught) {
      breakaway = advance(breakaway, membersOf(BREAKAWAY), breakaway.coop)
    }

    // Captura: el boquete cayó a 5 s o menos, pero solo tras haberse abierto de verdad (SPEC 6.3).
    if (breakaway && !caught) {
      const gap = gapSeconds(peloton, breakaway)
      if (gap > STAGE.captureGapSeconds) separated = true
    }
    if (
      breakaway &&
      !caught &&
      separated &&
      gapSeconds(peloton, breakaway) <= STAGE.captureGapSeconds
    ) {
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

    // Disputa de banners (SPEC 6.11): el primer grupo en pasar se lleva los puntos.
    if (block.banner) {
      const frontIsBreak = breakaway !== null && !caught && breakaway.tS <= peloton.tS
      const front = frontIsBreak ? membersOf(BREAKAWAY) : membersOf(PELOTON)
      const frontTs = frontIsBreak ? breakaway!.tS : peloton.tS
      disputeBanner(front, block, km, frontTs, log, rng('sprint'))
    }
  }

  // --- Sprint final y resultados (SPEC 6.12, 6.15) ---------------------------------------
  const incidents: Incident[] = []
  finishStage(sims, peloton, breakaway, caught, log, rng('sprint'), totalKm)

  const results = buildResults(sims)
  const workUnits = new Map<string, number>()
  for (const [id, s] of sims) workUnits.set(id, s.work)

  return { events: log.toArray(), results, workUnits, incidents }
}

/** Mini sprint por los puntos de un banner (SPEC 6.11). El mejor SPR del grupo se los lleva. */
function disputeBanner(
  members: RiderSim[],
  block: Block,
  km: number,
  tS: number,
  log: EventLog,
  rngSprint: () => number,
): void {
  const interested = members.filter((m) =>
    block.banner === 'meta_volante' ? m.input.orders.contestSprints : m.input.orders.contestClimbs,
  )
  const contenders = interested.length > 0 ? interested : members
  if (contenders.length === 0) return
  const table = block.banner === 'meta_volante' ? STAGE.sprintPoints : STAGE.climbPoints.cat4
  const ranked = contenders
    .map((m) => ({ m, score: m.input.eff0.SPR * (0.9 + 0.2 * rngSprint()) }))
    .sort((a, b) => b.score - a.score)
  ranked.forEach(({ m }, idx) => {
    const pts = table[idx] ?? 0
    if (pts <= 0) return
    for (const c of contenders) c.energy = Math.max(0, c.energy - STAGE.bannerCost)
    if (block.banner === 'meta_volante') m.sprintPts += pts
    else m.climbPts += pts
  })
  const winner = ranked[0]?.m
  if (winner) {
    log.emit(
      km,
      tS,
      'banner',
      block.banner === 'meta_volante' ? 'sprint_intermediate' : 'climb_kom',
      [winner.input.riderId],
    )
  }
}

/** Cierra la etapa: sprint del grupo de cabeza y tiempos de todos (SPEC 6.12). */
function finishStage(
  sims: Map<string, RiderSim>,
  peloton: Group,
  breakaway: Group | null,
  caught: boolean,
  log: EventLog,
  rngSprint: () => number,
  totalKm: number,
): void {
  const groups: { group: Group; members: RiderSim[] }[] = []
  const pelotonMembers = [...sims.values()].filter((s) => s.groupId === PELOTON)
  groups.push({ group: peloton, members: pelotonMembers })
  if (breakaway && !caught) {
    groups.push({
      group: breakaway,
      members: [...sims.values()].filter((s) => s.groupId === BREAKAWAY),
    })
  }
  // El grupo de cabeza es el de menor reloj.
  groups.sort((a, b) => a.group.tS - b.group.tS)

  groups.forEach(({ group, members }, gi) => {
    // Sprint del grupo: todos comparten el tiempo del grupo (SPEC 6.12).
    const ranked = members
      .map((m) => {
        const e = erosion(m.energy, m.energy0, m.input.eff0.RES)
        const eff = effNow(m.input.eff0, e)
        const score = eff.SPR * normal(rngSprint, 1, STAGE.sprintScoreNoiseSd)
        return { m, score }
      })
      .sort((a, b) => b.score - a.score)
    ranked.forEach(({ m }, idx) => {
      // Micro-desempate por orden de sprint dentro del mismo tiempo de grupo.
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
