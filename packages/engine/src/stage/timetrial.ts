/**
 * Contrarreloj, cronoescalada y CRE: el mismo motor con grupos de un corredor (SPEC 6.13).
 * Sin drafting ni hazards de ataque, compromiso fijo de esfuerzo sostenido y perfil compuesto
 * (0.75·CRI + 0.15·LLA + 0.10·RES en llano, deslizando hacia MON con w(g) en subida). La erosión
 * castiga los recorridos largos; un ruido final N(1, 0.006) sobre el tiempo. Puro y determinista.
 */
import { normal } from '../random.js'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import { EventLog } from './events.js'
import {
  type Eff,
  blockCost,
  blockSeconds,
  climbWeight,
  effNow,
  erosion,
  stepSpeed,
  targetSpeed,
} from './physics.js'
import { sampleProfile } from './sample.js'
import { stageRng } from './rng.js'
import type { Block, StageInput, StageOutput, StageResult } from './types.js'

/** Perfil de crono: compuesto de especialista en llano que desliza hacia MON en subida (6.13). */
function ttPerfil(eff: Eff, block: Block): number {
  const flat =
    STAGE.ttCompositeCri * eff.CRI + STAGE.ttCompositeLla * eff.LLA + STAGE.ttCompositeRes * eff.RES
  if (block.tipo !== 'subida') return flat
  const w = climbWeight(block.g)
  return (1 - w) * flat + w * eff.MON
}

/** Simula una contrarreloj individual: cada corredor solo contra el crono (SPEC 6.13). */
export function simulateTimeTrial(input: StageInput, seed: string): StageOutput {
  const streams = stageRng(seed)
  const rngNoise = streams('tt')
  const rngDay = streams('day')
  const blocks = sampleProfile(input.profile)
  const log = new EventLog()
  const workUnits = new Map<string, number>()

  const finishers = input.riders.map((rider) => {
    // Piernas del día: escala el nivel efectivo del corredor esta crono (SPEC 6.7), como en carretera.
    const dayFactor = Math.max(
      1 - 3 * STAGE.dayFormSd,
      Math.min(1 + 3 * STAGE.dayFormSd, normal(rngDay, 1, STAGE.dayFormSd)),
    )
    const eff0 = {} as Eff
    for (const k in rider.eff0) {
      const key = k as keyof Eff
      eff0[key] = Math.max(0, Math.min(100, rider.eff0[key] * dayFactor))
    }
    let energy = rider.energy
    let vActual: number = STAGE.initialSpeed
    let tS = 0
    let work = 0
    for (const block of blocks) {
      const e = erosion(energy, rider.energy, eff0.RES)
      const eff = effNow(eff0, e)
      const perfil = ttPerfil(eff, block)
      const vObj = targetSpeed(block, perfil, STAGE.ttCommitment)
      const dtIn = blockSeconds(vActual)
      vActual = stepSpeed(vActual, vObj, block.g, dtIn)
      tS += blockSeconds(vActual)
      // Solo, sin rebufo (shelter 0): el crono se paga entero.
      const cost = blockCost(block, STAGE.ttCommitment, STAGE.shelterAlone)
      energy = Math.max(0, energy - cost)
      work += cost
    }
    workUnits.set(rider.riderId, work)
    return { riderId: rider.riderId, tS: tS * normal(rngNoise, 1, STAGE.ttNoiseSd) }
  })

  finishers.sort((a, b) => a.tS - b.tS)
  const results: StageResult[] = finishers.map((f, idx) => ({
    riderId: f.riderId,
    puesto: idx + 1,
    tiempoS: Math.round(f.tS),
    bonificacionS: 0,
    puntosVolante: 0,
    puntosMontana: 0,
    estado: 'finish' as const,
  }))
  if (results[0]) {
    log.emit(0, finishers[0]!.tS, 'meta', 'stage_win_itt', [results[0].riderId])
  }

  return { events: log.toArray(), results, workUnits, incidents: [], engineVersion: ENGINE_VERSION }
}
