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
  const rngDay = streams('day')
  const incidents: Incident[] = []

  const blocks = sampleProfile(input.profile)
  const totalKm = stageLengthKm(input.profile)
  const n = blocks.length
  const log = new EventLog()

  const sims = new Map<string, RiderSim>()
  for (const r of input.riders) {
    // Piernas del día: un factor por corredor y etapa (acotado a ±3σ) escala su nivel efectivo, así
    // un corredor algo inferior puede ganarle a uno mejor que tiene un mal día (SPEC 6.7).
    const dayFactor = Math.max(
      1 - 3 * STAGE.dayFormSd,
      Math.min(1 + 3 * STAGE.dayFormSd, normal(rngDay, 1, STAGE.dayFormSd)),
    )
    const eff0 = {} as typeof r.eff0
    for (const k in r.eff0) {
      const key = k as keyof typeof r.eff0
      eff0[key] = Math.max(0, Math.min(100, r.eff0[key] * dayFactor))
    }
    sims.set(r.riderId, {
      input: { ...r, eff0 },
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

  // Trabajo de equipo (SPEC 6.18): quién arropa a quién. Un líder con `targetRiderId` de sus gregarios
  // gasta menos si los lleva en el grupo; un sprinter con lanzadores va mejor lanzado en la meta.
  const domestiquesFor = new Map<string, string[]>()
  const leadOutFor = new Map<string, string[]>()
  // Marcaje (SPEC 6.18): quién marca a qué rival. Un marcador se agarra a la rueda de su objetivo y
  // aguanta sus ataques en la subida mientras su nivel no esté muy por debajo (no le deja marcharse solo).
  const markTargetOf = new Map<string, string>()
  for (const r of input.riders) {
    const target = r.orders.targetRiderId
    if (!target) continue
    if (r.orders.role === 'gregario') {
      const list = domestiquesFor.get(target) ?? []
      list.push(r.riderId)
      domestiquesFor.set(target, list)
    } else if (r.orders.role === 'lanzador') {
      const list = leadOutFor.get(target) ?? []
      list.push(r.riderId)
      leadOutFor.set(target, list)
    } else if (r.orders.role === 'marcador') {
      markTargetOf.set(r.riderId, target)
    }
  }

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
  // Km en que se «anuncia» la fuga en la crónica: ningún evento relativo a la fuga se fecha antes.
  let breakFormedKm = 0
  let lastSplitKm = Number.NEGATIVE_INFINITY
  let lastGapReportKm = Number.NEGATIVE_INFINITY
  let prevGapS = Number.POSITIVE_INFINITY
  let chaseAnnounced = false
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
      // La fuga se fragua en los primeros km de ataques, no en la línea de salida (km 0): se fecha en
      // un punto temprano, variado y determinista, sin pasar del 15% del recorrido en etapas cortas.
      breakFormedKm = Math.round(
        Math.min(totalKm * 0.15, STAGE.breakFormMinKm + rngBreak() * STAGE.breakFormKmRange),
      )
      log.emit(breakFormedKm, breakaway.tS, 'fuga_formada', 'breakaway_formed', fugados)
      // Colaboración de la fuga: con un compromiso alto van a bloque; con uno bajo se miran y no
      // avanzan. Se narra una vez, para que el journal cuente si la fuga rueda bien o mal avenida.
      log.emit(breakFormedKm, breakaway.tS, 'colaboracion', 'break_cooperation', fugados, {
        cooperating: coop >= STAGE.breakCoopThreshold ? 1 : 0,
      })
    }
  }
  // Los sprinters solo cazan si la meta es llana (una llegada masiva que puedan disputar): en un
  // final en alto no persiguen, y la fuga vive o muere en la subida (SPEC 6.9).
  const finalStretch = blocks.slice(Math.max(0, n - STAGE.finalBlocks))
  const finishFlat = finalStretch.every((b) => b.tipo === 'llano' || b.tipo === 'descenso')
  // Final en alto: el tramo de meta trepa. El orden de meta lo decide entonces la escalada.
  const finishUphill = finalStretch.some((b) => b.tipo === 'subida')
  const chasingSprinters = input.riders.some(isSprinter) && finishFlat
  // Jefe de filas de los sprinters: el mejor rematador. Su equipo es el que suele tirar para cazar,
  // así que se nombra en la crónica de la persecución (protagonista del evento sprinters_chase).
  const leadSprinterId =
    [...input.riders].filter(isSprinter).sort((a, b) => b.eff0.SPR - a.eff0.SPR)[0]?.riderId ?? null

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
      // Reporte de distancia (throttle cada gapReportKmGap): narra la ventaja de la fuga y si se
      // estira o se recorta, para seguir la carrera aunque no pase nada más (SPEC 6.15).
      if (
        gap >= STAGE.gapReportMinSeconds &&
        km >= breakFormedKm &&
        km - lastGapReportKm >= STAGE.gapReportKmGap
      ) {
        const trend =
          prevGapS === Number.POSITIVE_INFINITY
            ? 0
            : gap > prevGapS + 3
              ? 1
              : gap < prevGapS - 3
                ? -1
                : 0
        log.emit(km, peloton.tS, 'boquete', 'time_gap', [], { gapS: Math.round(gap), trend })
        lastGapReportKm = km
        prevGapS = gap
      }
      let target: number = STAGE.commitIdle
      if (chasingSprinters && !chaseAbandoned) {
        // Los equipos de los sprinters se ponen a tirar para cazar: se narra una vez, pasada cierta
        // parte del recorrido (antes la fuga tiene su cuerda), si aún no han claudicado.
        if (!chaseAnnounced && km >= totalKm * STAGE.chaseAnnounceFrac) {
          chaseAnnounced = true
          log.emit(
            km,
            peloton.tS,
            'persecucion',
            'sprinters_chase',
            leadSprinterId ? [leadSprinterId] : [],
          )
        }
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
            log.emit(
              Math.max(km, breakFormedKm),
              peloton.tS,
              'fuga_consolidada',
              'peloton_concedes',
              breakaway.riderIds,
            )
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
      const idSet = new Set(members.map((m) => m.input.riderId))
      members.forEach((m, idx) => {
        const relaying = idx / members.length < paceFraction
        const shelter = relaying ? STAGE.shelterRelay : STAGE.shelterProtected
        let cost = blockCost(block, group.compromiso, shelter)
        // Protección de gregarios: un líder arropado que no está relevando gasta menos según cuántos
        // de sus gregarios lleve en el grupo (SPEC 6.18). Así fichar buen equipo rinde de verdad.
        if (!relaying) {
          const helpers = domestiquesFor.get(m.input.riderId)
          if (helpers) {
            const present = helpers.reduce((c, id) => c + (idSet.has(id) ? 1 : 0), 0)
            if (present > 0) {
              const protect = Math.min(
                present * STAGE.domestiqueProtectPerHelper,
                STAGE.domestiqueProtectMax,
              )
              cost *= 1 - protect
            }
          }
        }
        m.energy = Math.max(0, m.energy - cost)
        m.work += cost
      })
      return next
    }

    // Descuelgue en los puertos (SPEC 6.8): quien no aguanta el P75 del grupo se cae o quema un
    // cerillo. Fuera de subida no pasa nada, así que el llano queda intacto.
    const shatter = (group: Group, members: RiderSim[], paceFraction: number): string[] => {
      if (block.tipo !== 'subida') return []
      const pace = pacemakerP75(members, block, paceFraction)
      const inGroup = new Set(members.map((m) => m.input.riderId))
      const dropped: string[] = []
      for (const m of members) {
        const deficit = pace - riderPerfil(m, block)
        if (deficit <= STAGE.dropDeficitTolerance) continue
        // Marcaje (SPEC 6.18): si m marca a un rival que sube en su MISMO grupo, se agarra a su rueda y
        // aguanta mientras su nivel de escalada no esté MUY por debajo del objetivo (margen ≥ -6). Así
        // "marcar a un rival" evita que se te escape en la subida (donde se decide la general).
        const targetId = markTargetOf.get(m.input.riderId)
        if (targetId && inGroup.has(targetId)) {
          const target = sims.get(targetId)
          if (target) {
            const margin =
              riderPerfil(m, block) - riderPerfil(target, block) + STAGE.markDraftTolerance
            if (margin >= STAGE.markDropMargin) continue // se queda a rueda del objetivo
          }
        }
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
          dropped.push(m.input.riderId)
        }
      }
      return dropped
    }

    // En subida mandan los más fuertes (fracción menor): el grupo se estira y se descuelga. PERO solo
    // se ataca el puerto de verdad cerca de meta (o en un final en alto): un puerto a mitad de etapa se
    // sube a TEMPO (fracción mayor → ritmo más suave), así el pelotón no se destroza en cada cota y las
    // diferencias las marca el último puerto, como en la realidad. Lejos de meta apenas se descuelga nadie.
    const onClimb = block.tipo === 'subida'
    const raceThisClimb = finishUphill || totalKm - km <= STAGE.climbRaceKmToGo
    const climbFrac = raceThisClimb ? STAGE.climbPaceFraction : STAGE.climbTempoFraction
    const pelFrac = onClimb ? climbFrac : STAGE.pelotonPaceFraction
    const brkFrac = onClimb ? climbFrac : (breakaway?.coop ?? STAGE.climbPaceFraction)

    const pelotonDropped = shatter(peloton, membersOf(PELOTON), pelFrac)
    if (breakaway && !caught) shatter(breakaway, membersOf(BREAKAWAY), brkFrac)
    // Corte en el puerto: cuando la subida descuelga a varios del pelotón, se narra en la crónica
    // (SPEC 6.15). Explica los boquetes de la clasificación que, si no, aparecerían sin motivo. Se
    // limita a uno cada pocos km para no repetir la misma frase bloque a bloque en un puerto largo.
    // Solo se narra el corte en un puerto que se está ATACANDO (decisivo, cerca de meta): en los de
    // tempo el pelotón se recompone después, así que anunciar "N se descuelgan" ahí sería engañoso.
    if (
      raceThisClimb &&
      pelotonDropped.length >= STAGE.splitEventMinDropped &&
      km - lastSplitKm >= STAGE.splitEventMinKmGap
    ) {
      log.emit(km, peloton.tS, 'corte', 'peloton_split', pelotonDropped, {
        remaining: membersOf(PELOTON).length,
      })
      lastSplitKm = km
    }

    peloton = advance(peloton, membersOf(PELOTON), pelFrac)
    if (breakaway && !caught) breakaway = advance(breakaway, membersOf(BREAKAWAY), brkFrac)
    for (let g = 0; g < shed.length; g++) {
      shed[g] = advance(shed[g]!, membersOf(shed[g]!.id), 1)
    }

    // Recorte en terreno NO montañoso (llano/descenso): los descolgados no se quedan rodando solos
    // para siempre. En terreno rodador CIERRAN el boquete con el pelotón a un ritmo (s/km) y, al entrar
    // en rango, se reenganchan; los que están demasiado lejos se funden entre sí (grupeto/autobús) y
    // llegan juntos más atrás. En subida no hay recorte: allí manda la selección (SPEC 6.3, realismo).
    // Es la pieza que evita finales irreales con decenas de grupos de un solo corredor en etapas llanas.
    if (!onClimb && shed.length > 0) {
      const close = STAGE.chaseBackSecondsPerKm * STAGE.dx
      for (const sg of shed) {
        if (membersOf(sg.id).length === 0) continue
        const gap = sg.tS - peloton.tS
        if (gap > 0) sg.tS = Math.max(peloton.tS, sg.tS - close)
      }
      const stillDropped: Group[] = []
      for (const sg of [...shed].sort((a, b) => a.tS - b.tS)) {
        const mem = membersOf(sg.id)
        if (mem.length === 0) continue
        // ¿alcanza al pelotón? se reengancha.
        if (gapSeconds(peloton, sg) <= STAGE.regroupGapSeconds) {
          for (const m of mem) m.groupId = PELOTON
          peloton = { ...peloton, riderIds: [...peloton.riderIds, ...sg.riderIds] }
          continue
        }
        // ¿se funde con un grupeto cercano ya por delante? forman un autobús que rueda junto.
        const near = stillDropped.find((o) => Math.abs(o.tS - sg.tS) <= STAGE.regroupGapSeconds)
        if (near) {
          for (const m of mem) m.groupId = near.id
          near.riderIds = [...near.riderIds, ...sg.riderIds]
        } else {
          stillDropped.push(sg)
        }
      }
      shed.length = 0
      shed.push(...stillDropped)
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
  finishStage(sims, allGroups, log, rngSprint, totalKm, finishUphill, leadOutFor)

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
  leadOutFor: Map<string, string[]>,
): void {
  const withMembers = groups
    .map((group) => ({ group, members: [...sims.values()].filter((s) => s.groupId === group.id) }))
    .filter((g) => g.members.length > 0)
  withMembers.sort((a, b) => a.group.tS - b.group.tS)

  withMembers.forEach(({ group, members }, gi) => {
    const idSet = new Set(members.map((m) => m.input.riderId))
    const ranked = members
      .map((m) => {
        const e = erosion(m.energy, m.energy0, m.input.eff0.RES)
        const eff = effNow(m.input.eff0, e)
        const base = finishUphill ? Math.max(eff.MON, eff.COL) : eff.SPR
        let score = base * normal(rngSprint, 1, STAGE.sprintScoreNoiseSd)
        // Tren de lanzadores: en una llegada masiva, un sprinter bien lanzado por su equipo remata
        // mejor (SPEC 6.18). Solo cuentan los lanzadores que llegan en su mismo grupo de meta.
        if (!finishUphill) {
          const train = leadOutFor.get(m.input.riderId)
          if (train) {
            const present = train.reduce((c, id) => c + (idSet.has(id) ? 1 : 0), 0)
            if (present > 0) {
              score *= 1 + STAGE.leadOutBoostPerHelper * Math.min(present, STAGE.leadOutMaxHelpers)
            }
          }
        }
        return { m, score }
      })
      .sort((a, b) => b.score - a.score)
    ranked.forEach(({ m }, idx) => {
      m.finishTs = group.tS + idx * 1e-3
    })
    if (gi === 0 && ranked[0]) {
      const field = ranked.length
      const isBunch = !finishUphill && field >= STAGE.bunchSprintMinRiders
      // Sprint masivo: si el grupo de cabeza es numeroso y la meta es llana, se narra el último km —
      // los rematadores que lo disputan y si el ganador remató bien lanzado por su tren (SPEC 6.15).
      if (isBunch) {
        const top3 = ranked.slice(0, 3).map((r) => r.m.input.riderId)
        const train = leadOutFor.get(ranked[0].m.input.riderId) ?? []
        const ledOut = train.some((id) => idSet.has(id)) ? 1 : 0
        log.emit(Math.max(0, totalKm - 1), group.tS, 'sprint', 'bunch_sprint', top3, {
          field,
          ledOut,
        })
      }
      // La victoria dice CÓMO se ganó, coherente con el resultado: en solitario (con su margen al
      // siguiente grupo), al sprint de un pelotón numeroso, o al esprint de un grupo reducido.
      const nextTs = withMembers[gi + 1]?.group.tS
      const margin = field === 1 && nextTs != null ? Math.round(nextTs - group.tS) : 0
      const won = isBunch ? 'sprint' : field === 1 ? 'solo' : 'group'
      log.emit(totalKm, group.tS, 'meta', 'stage_win', [ranked[0].m.input.riderId], {
        won,
        margin,
        field,
      })
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
