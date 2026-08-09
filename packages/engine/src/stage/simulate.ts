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
import { blockCost, blockPerfil, effNow, erosion, tankState } from './physics.js'
import { rollHazard } from './hazard.js'
import { rollCrash } from './crash.js'
import {
  type FinishTerrain,
  deriveFinishTerrain,
  finishScore,
  finishType,
  isSprintFinish,
  isUphillFinish,
} from './finish.js'
import { markingMargin, resolveMarking } from './marcaje.js'
import { sampleProfile, stageLengthKm } from './sample.js'
import { stageRng } from './rng.js'
import { simulateTimeTrial } from './timetrial.js'
import type {
  Block,
  Incident,
  StageInput,
  StageOutput,
  StageResult,
  StageRider,
  TankState,
} from './types.js'

const PELOTON = 'peloton'
const BREAKAWAY = 'fuga'

/** Estado mutable de un corredor durante la simulación. */
interface RiderSim {
  input: StageRider
  energy0: number
  energy: number
  groupId: string
  work: number
  /**
   * Tiempo de meta YA EN SEGUNDOS ENTEROS (SPEC 6.15). Es el tiempo del GRUPO, idéntico para todos
   * los que entran con él: en ciclismo la línea de meta no desempata dentro de un grupo, lo hace el
   * juez de llegada. Solo se separa de él lo que se ha cedido de verdad en carretera (`markLossS`).
   */
  finishTs: number | null
  /**
   * Orden de llegada global (0, 1, 2…), asignado grupo a grupo y, dentro de cada grupo, por el
   * ranking del remate. Es el ÚNICO desempate del puesto: antes el orden se colaba en el tiempo
   * sumando 1 ms por posición, y al redondear partía el grupo en dos tiempos distintos.
   */
  finishOrder: number
  bonusS: number
  sprintPts: number
  climbPts: number
  matches: number
  /** Bloques que resta el impulso de un cerillo gastado (+10 al terreno, SPEC 6.6). */
  climbBoostBlocks: number
  /** Desempate fijo del turno de relevos, en [0,1) (SPEC 6.1: subflujo nominal por corredor). */
  workJitter: number
  /** Segundos cedidos al objetivo marcado sin llegar a soltarse (`gives` de SPEC 6.18). */
  markLossS: number
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

/** ¿Está el corredor con la pájara (tanque a cero)? (SPEC 6.7). */
function isBonked(sim: RiderSim): boolean {
  return sim.energy <= 0
}

/**
 * Efectividades del corredor AHORA, con la erosión del momento y la pájara si el tanque está a
 * cero (SPEC 6.7). Único punto donde se resuelve `effNow`: antes el 3.er argumento (`bonk`) no se
 * pasaba nunca desde ninguna parte y todo el bloque de la pájara era código muerto.
 */
function riderEff(sim: RiderSim): ReturnType<typeof effNow> {
  const e = erosion(sim.energy, sim.energy0, sim.input.eff0.RES)
  return effNow(sim.input.eff0, e, isBonked(sim))
}

/**
 * Perfil efectivo de un corredor en un bloque, ya con la erosión del momento (SPEC 6.4, 6.7).
 * En los muros (subida corta y empinada) manda COL en vez de MON; un cerillo activo suma +10.
 */
function riderPerfil(sim: RiderSim, block: Block): number {
  const eff = riderEff(sim)
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

/**
 * Deber de relevo de un corredor (SPEC 6.5, 6.18): cuánto le "toca" dar la cara al viento ahora.
 * Manda el ROL (el gregario tira, el líder y el sprinter ahorran), la FRESCURA restante corrige
 * (quien va vaciado ya no puede relevar) y, si lleva gregarios propios en el grupo, sale del turno
 * porque su equipo trabaja por él. Un jitter fijo por corredor y etapa rompe empates.
 * Deliberadamente NO interviene la posición en el array de entrada.
 */
function relayDuty(m: RiderSim, protectedByTeam: boolean): number {
  const duty = STAGE.relayDutyByRole[m.input.orders.role]
  const freshness = m.energy0 > 0 ? Math.max(0, Math.min(1, m.energy / m.energy0)) : 0
  return (
    duty +
    STAGE.relayFreshnessWeight * freshness -
    (protectedByTeam ? STAGE.relayProtectedPenalty : 0) +
    STAGE.relayJitterWeight * m.workJitter
  )
}

/**
 * Quién releva en este bloque: los `ceil(paceFraction · N)` corredores con más deber de relevo
 * (SPEC 6.5). El resto va a rueda y paga `shelterProtected`. El tamaño del turno lo fija la misma
 * fracción de ritmo que marca el P75, así el número de corredores que trabajan no cambia; lo que
 * cambia (y es el arreglo) es QUIÉNES son: antes salían del orden del array `input.riders`.
 */
function relayTurn(
  members: RiderSim[],
  idSet: Set<string>,
  paceFraction: number,
  domestiquesFor: Map<string, string[]>,
): Set<string> {
  const count = Math.min(members.length, Math.max(1, Math.ceil(paceFraction * members.length)))
  const scored = members.map((m) => {
    const helpers = domestiquesFor.get(m.input.riderId)
    const protectedByTeam = helpers != null && helpers.some((id) => idSet.has(id))
    return { id: m.input.riderId, duty: relayDuty(m, protectedByTeam) }
  })
  // Desempate final por id para que el orden sea total y no herede el orden de inserción.
  scored.sort((a, b) => b.duty - a.duty || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return new Set(scored.slice(0, count).map((s) => s.id))
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
      finishOrder: 0,
      bonusS: 0,
      sprintPts: 0,
      climbPts: 0,
      matches: r.matches,
      climbBoostBlocks: 0,
      // Subflujo NOMINAL por corredor: el desempate del turno de relevos no depende del orden del
      // array de entrada ni del tamaño del pelotón, solo de la semilla y del id (SPEC 6.1).
      workJitter: streams(`work:${r.riderId}`)(),
      markLossS: 0,
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
  let lastFrontNoticeKm = Number.NEGATIVE_INFINITY
  let lastGapReportKm = Number.NEGATIVE_INFINITY
  let prevGapS = Number.POSITIVE_INFINITY
  // Descuelgues BRUTOS del pelotón desde el último aviso narrado, y cuántos corredores iban en él
  // entonces. El bruto es telemetría verdadera —cuántas veces se rompió la goma— pero NO es lo que
  // se narra: en el desenlace los mismos corredores se sueltan y se reenganchan una y otra vez, así
  // que el bruto llegaba a decir "54 descolgados" con el grupo pasando de 76 a 76. Lo narrado es la
  // diferencia entre `frontAtLastNotice` y el tamaño de ahora (docs/motor.md §16).
  let droppedSinceNotice = 0
  let frontAtLastNotice = input.riders.length
  // Cuántos avisos de criba se han dado ya en la selección en curso. Sube el listón del siguiente
  // (más kilómetros y una fracción mayor del grupo), que es lo que convierte una criba de 27 km en
  // dos o tres frases de progresión en vez de un parte cada 3 km. Un reagrupamiento lo pone a cero:
  // cuando el grupo se recompone, la siguiente selección es una historia nueva.
  let splitPhase = 0
  // Quién apretó en el aviso anterior, para no nombrar diez veces al mismo protagonista.
  let lastSplitDriverId: string | null = null
  // Último tamaño del grupo de cabeza anunciado, para no repetir el parte de una fuga estable.
  let lastFrontSize = input.riders.length
  let lastFrontReportKm = Number.NEGATIVE_INFINITY
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
    const size = Math.min(
      scored.length,
      STAGE.breakawaySizeMin + Math.floor(rngBreak() * STAGE.breakawaySizeRange),
    )
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
        Math.min(
          totalKm * STAGE.breakFormMaxRouteFraction,
          STAGE.breakFormMinKm + rngBreak() * STAGE.breakFormKmRange,
        ),
      )
      log.emit(breakFormedKm, breakaway.tS, 'fuga_formada', 'breakaway_formed', fugados)
      // Colaboración de la fuga: con un compromiso alto van a bloque; con uno bajo se miran y no
      // avanzan. Se narra una vez, para que el journal cuente si la fuga rueda bien o mal avenida.
      log.emit(breakFormedKm, breakaway.tS, 'colaboracion', 'break_cooperation', fugados, {
        cooperating: coop >= STAGE.breakCoopThreshold ? 1 : 0,
      })
      // La fuga YA se ha nombrado: el parte de cabeza no debe repetirla nada más salir.
      lastFrontSize = fugados.length
      frontAtLastNotice = peloton.riderIds.length
    }
  }
  // Los sprinters solo cazan si la meta es llana (una llegada masiva que puedan disputar): en un
  // final en alto no persiguen, y la fuga vive o muere en la subida (SPEC 6.9).
  const finalStretch = blocks.slice(Math.max(0, n - STAGE.finalBlocks))
  const finishFlat = finalStretch.every((b) => b.tipo === 'llano' || b.tipo === 'descenso')
  // Qué clase de final dibuja el RECORRIDO (docs/motor.md §12). Se mide una vez por etapa sobre los
  // últimos ~5 km y la última cota de los últimos 15; el TIPO de final concreto se resuelve luego
  // para cada grupo de meta, porque depende también de cuántos lleguen.
  const finishTerrain = deriveFinishTerrain(blocks)
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

    // En subida mandan los más fuertes (fracción menor): el grupo se estira y se descuelga. PERO solo
    // se ataca el puerto de verdad cerca de meta: un puerto a mitad de etapa se sube a TEMPO
    // (fracción mayor → ritmo más suave), así el pelotón no se destroza en cada cota y las
    // diferencias las marca el último puerto, como en la realidad.
    //
    // La condición era `finishUphill || km a meta <= climbRaceKmToGo`, y ese primer término era un
    // defecto medido: en una etapa con final en alto TODA la etapa contaba como puerto decisivo, así
    // que el pelotón subía a tope desde el km 0 cada cota del recorrido. Con perfiles REALES —que
    // tienen relieve en todas partes, al contrario que la reina sintética— eso producía ciclos de
    // 170 → 15 → 173 corredores: el pelotón estallaba en un puerto a 120 km de meta y se recomponía
    // entero en el llano siguiente. No es solo que la crónica no pudiera contarlo (era el "de 81 a 3"
    // del dueño): es que no pasa en carretera. En la reina canónica no cambia nada —sus únicos km de
    // subida son los últimos 15— y por eso los invariantes no se movían y el defecto no se veía.
    const onClimb = block.tipo === 'subida'
    const raceThisClimb = totalKm - km <= STAGE.climbRaceKmToGo

    // Controlador del pelotón cada 10 bloques, con histéresis (SPEC 6.9). Regula SIEMPRE: haya fuga,
    // la hayan cazado o no se haya formado nunca. Antes vivía dentro de `if (breakaway && !caught)`,
    // de modo que sin fuga el pelotón rodaba TODA la etapa a `commitIdle` (39 minutos de diferencia
    // medidos en una llana de 180 km) y, al capturar, el compromiso quedaba congelado hasta meta.
    if (i % STAGE.decisionEveryBlocks === 0) {
      const ahead = breakaway !== null && !caught
      const gap = ahead ? peloton.tS - breakaway!.tS : 0
      const kmRestantes = totalKm - km

      // --- Telemetría de situación (docs/motor.md §16) -------------------------------------
      // Los grupos vivos, ordenados por reloj. El parte de carrera se da sobre el grupo de CABEZA
      // y su primer perseguidor, sean quienes sean. Antes el único boquete que se contaba era
      // "pelotón menos fuga": cuando la cabeza pasaba a ser un trozo del pelotón —o un corredor
      // solo tras la criba del último puerto— el journal se quedaba mudo justo en el desenlace, y
      // la ventaja final aparecía de la nada en la frase de meta.
      // El desempate a igualdad de reloj importa: en el bloque 0 la fuga y el pelotón comparten tS
      // (la fuga nace con el reloj del pelotón) y, si gana el pelotón, el "grupo de cabeza" pasa a
      // ser el pelotón entero durante un instante y el parte de cabeza se dispara luego por partida
      // doble. Delante va la fuga; detrás, el pelotón; y al final, los descolgados.
      const liveGroups = [
        ...(ahead ? [{ g: breakaway!, rank: 0 }] : []),
        { g: peloton, rank: 1 },
        ...shed.map((g) => ({ g, rank: 2 })),
      ]
        .map((x) => ({ g: x.g, rank: x.rank, members: membersOf(x.g.id) }))
        .filter((x) => x.members.length > 0)
        .sort((a, b) => a.g.tS - b.g.tS || a.rank - b.rank)
      const racing = liveGroups.reduce((c, x) => c + x.members.length, 0)
      const lead = liveGroups[0]
      const chase = liveGroups[1]

      // Parte de cabeza: cuando delante quedan pocos, se dice QUIÉNES son. Es la pregunta directa
      // del dueño ("hay 5 ciclistas, ¡podrías haber dicho cuáles!"). Solo si el tamaño ha cambiado
      // desde el último parte, así una fuga estable no repite la lista cada cinco kilómetros.
      let frontReported = false
      if (lead) {
        const size = lead.members.length
        if (size > STAGE.frontNamesMaxRiders) {
          lastFrontSize = size
        } else if (
          size !== lastFrontSize &&
          size < racing &&
          km >= breakFormedKm &&
          km - lastFrontReportKm >= STAGE.frontGroupReportKmGap
        ) {
          const names = lead.members
            .map((m) => ({ id: m.input.riderId, p: riderPerfil(m, block) }))
            .sort((a, b) => b.p - a.p || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
            .map((x) => x.id)
          log.emit(km, lead.g.tS, 'cabeza', 'front_group', names, {
            size,
            gapS: chase ? Math.max(0, Math.round(chase.g.tS - lead.g.tS)) : 0,
            toGo: Math.round(kmRestantes),
          })
          lastFrontReportKm = km
          lastFrontSize = size
          frontReported = true
          // La ventaja ya se ha contado con este parte: cuenta como reporte de boquete.
          if (chase) {
            lastGapReportKm = km
            prevGapS = chase.g.tS - lead.g.tS
          }
        }
      }
      // Reporte de distancia. En el desenlace el throttle se aprieta: 25 km sin noticias en los
      // últimos kilómetros son exactamente los que hacen aparecer siete minutos sin explicación.
      const reportEveryKm =
        kmRestantes <= STAGE.gapReportFinalKm ? STAGE.gapReportFinalKmGap : STAGE.gapReportKmGap
      // Si el parte de cabeza acaba de salir, ya lleva la ventaja dentro: repetirla en la línea
      // siguiente es ruido («los 2 líderes tienen 50s» / «quedan dos delante, 50s»).
      if (
        !frontReported &&
        lead &&
        chase &&
        km >= breakFormedKm &&
        km - lastGapReportKm >= reportEveryKm
      ) {
        const frontGap = chase.g.tS - lead.g.tS
        // Solo se cuenta el boquete si delante hay una MINORÍA: que el pelotón en bloque saque 25 s
        // a un rezagado no es noticia, y contarlo llenaría la crónica de ruido.
        const leadIsMinority = lead.members.length * 2 <= racing
        // Y solo si la ventaja se ha movido, salvo que toque el parte lento de todos modos.
        const moved =
          prevGapS === Number.POSITIVE_INFINITY ||
          Math.abs(frontGap - prevGapS) >=
            Math.max(STAGE.gapTrendThresholdSeconds, STAGE.gapReportChangeFraction * prevGapS)
        if (
          frontGap >= STAGE.gapReportMinSeconds &&
          leadIsMinority &&
          (moved || km - lastGapReportKm >= STAGE.gapReportKmGap)
        ) {
          const trend =
            prevGapS === Number.POSITIVE_INFINITY
              ? 0
              : frontGap > prevGapS + STAGE.gapTrendThresholdSeconds
                ? 1
                : frontGap < prevGapS - STAGE.gapTrendThresholdSeconds
                  ? -1
                  : 0
          log.emit(km, lead.g.tS, 'boquete', 'time_gap', [], {
            gapS: Math.round(frontGap),
            trend,
            leadSize: lead.members.length,
            chaseSize: chase.members.length,
          })
          lastGapReportKm = km
          prevGapS = frontGap
        }
      }

      // Ritmo base del pelotón cuando no hay nada que cazar por delante: tempo de carretera, a tope
      // en el puerto decisivo, y el tirón de los últimos km cuando la meta es llana (trenes de sprint).
      const freeRunTarget = onClimb
        ? raceThisClimb
          ? STAGE.climbRaceCommit
          : STAGE.climbTempoCommit
        : finishFlat && kmRestantes <= STAGE.finalDriveKm
          ? STAGE.finalDriveCommit
          : STAGE.pelotonTempoCommit
      let target: number = freeRunTarget
      if (ahead && chasingSprinters && !chaseAbandoned) {
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
      } else if (ahead) {
        // Control de la general: en el llano el pelotón rueda a tempo para limitar el boquete (no
        // capturar); pero en cuanto empieza a subir, los favoritos atacan a tope y la subida
        // decide (SPEC 6.9). Boquete deseado constante fuera de la subida.
        const err = gap - STAGE.gcControlLeash
        target = onClimb
          ? freeRunTarget
          : Math.min(1, Math.max(0.1, STAGE.chaseHoldCommit + STAGE.chaseGain * err))
      }
      peloton = {
        ...peloton,
        compromiso: peloton.compromiso + (target - peloton.compromiso) * STAGE.commitHysteresis,
      }
      if (!consolidated && breakaway && !caught) {
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
      const relayers = relayTurn(members, idSet, paceFraction, domestiquesFor)
      for (const m of members) {
        const relaying = relayers.has(m.input.riderId)
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
      }
      return next
    }

    /**
     * Saca a un corredor de su grupo (descuelgue, pájara o caída). Si ya rueda por ahí un grupo de
     * descolgados a su MISMA altura de carrera se une a él —los que se sueltan a la vez ruedan
     * juntos, que es como nacen los grupetos— y solo si no hay ninguno abre grupo propio. Sin esto
     * la montaña terminaba con decenas de grupos de UN corredor (docs/motor.md §3-bis-e).
     */
    const dropOut = (m: RiderSim, group: Group, delayS = 0): void => {
      const tS = group.tS + delayS
      const near = shed.find(
        (sg) => Math.abs(sg.tS - tS) <= STAGE.grupetoJoinGapSeconds && membersOf(sg.id).length > 0,
      )
      if (near) {
        m.groupId = near.id
        near.riderIds = [...near.riderIds, m.input.riderId]
        return
      }
      shedCounter += 1
      const gid = `shed-${shedCounter}`
      m.groupId = gid
      shed.push(
        createGroup(gid, [m.input.riderId], {
          tS,
          vActual: group.vActual,
          compromiso: STAGE.shedCommit,
        }),
      )
    }

    // Descuelgue en los puertos (SPEC 6.8): quien no aguanta el P75 del grupo se cae o quema un
    // cerillo. Fuera de subida solo suelta la pájara, así que el llano queda casi intacto.
    const shatter = (group: Group, members: RiderSim[], paceFraction: number): string[] => {
      const dropped: string[] = []
      // Pájara (SPEC 6.7): con el tanque a cero el corredor se descuelga automáticamente, suba o no.
      // Hasta ahora `effNow(..., bonk)` no se llamaba nunca y todo este bloque era código muerto.
      // (Sin evento de crónica: la pájara se narrará cuando exista la telemetría del Cambio 5; hoy
      // una plantilla nueva se imprimiría en crudo en la crónica, que vive fuera del motor.)
      for (const m of members) {
        if (!isBonked(m)) continue
        dropOut(m, group)
        dropped.push(m.input.riderId)
      }
      if (block.tipo !== 'subida') return dropped
      const alive = members.filter((m) => m.groupId === group.id)
      const pace = pacemakerP75(alive, block, paceFraction)
      const inGroup = new Set(alive.map((m) => m.input.riderId))
      for (const m of alive) {
        const deficit = pace - riderPerfil(m, block)
        if (deficit <= STAGE.dropDeficitTolerance) continue
        const lambda = (STAGE.lambdaDropBase * deficit) / STAGE.dropDeficitDenom
        if (!rollHazard(rngHazard, lambda)) continue
        // Marcaje (SPEC 6.18): el hazard que acaba de saltar ES el momento de selección (el ataque).
        // Si m marca a un rival que sube en su MISMO grupo, la respuesta la resuelve el módulo
        // oficial `marcaje.ts`: pegado a rueda, cede unos segundos, o se suelta.
        const targetId = markTargetOf.get(m.input.riderId)
        if (targetId && inGroup.has(targetId)) {
          const target = sims.get(targetId)
          if (target) {
            const outcome = resolveMarking(
              markingMargin(riderPerfil(m, block), riderPerfil(target, block)),
            )
            if (outcome.kind === 'stuck') continue
            if (outcome.kind === 'gives') {
              m.markLossS += outcome.secondsLost
              continue
            }
            // 'dropped': se suelta y sigue por el camino normal de descuelgue.
          }
        }
        // Quemar un cerillo salva el descuelgue, pero CUESTA energía (SPEC 6.6): `matchCost` estaba
        // definido y no se restaba en ninguna parte, así que un cerillo salía gratis.
        if (
          m.matches > 0 &&
          m.input.orders.mentality !== 'reservon' &&
          m.energy > STAGE.matchCost
        ) {
          m.matches -= 1
          m.climbBoostBlocks = STAGE.matchBonusBlocks
          m.energy = Math.max(0, m.energy - STAGE.matchCost)
          m.work += STAGE.matchCost
        } else {
          dropOut(m, group)
          dropped.push(m.input.riderId)
        }
      }
      return dropped
    }

    const climbFrac = raceThisClimb ? STAGE.climbPaceFraction : STAGE.climbTempoFraction
    const pelFrac = onClimb ? climbFrac : STAGE.pelotonPaceFraction
    const brkFrac = onClimb ? climbFrac : (breakaway?.coop ?? STAGE.climbPaceFraction)

    const pelotonDropped = shatter(peloton, membersOf(PELOTON), pelFrac)
    if (breakaway && !caught) shatter(breakaway, membersOf(BREAKAWAY), brkFrac)
    // Cómo cambia el pelotón en el desenlace: la CRIBA que lo parte y el REAGRUPAMIENTO que lo
    // recompone (SPEC 6.15). Ambos son la misma cuenta —de cuántos a cuántos ha pasado el grupo
    // desde el aviso anterior— y por eso comparten estado: así la cadena de avisos no tiene huecos
    // y el lector nunca se encuentra corredores que aparecen o desaparecen sin explicación.
    // Solo dentro del desenlace: en un puerto de tempo a mitad de etapa el pelotón se rompe y se
    // recompone constantemente, y narrarlo sería ruido.
    if (raceThisClimb) {
      droppedSinceNotice += pelotonDropped.length
      const front = membersOf(PELOTON)
      // Lo NARRADO es lo que el grupo ha perdido de verdad desde el aviso anterior. Con el recuento
      // bruto (`droppedSinceNotice`) la crónica decía «54 riders slip off the back» y acto seguido
      // «about 76 left in front» cuando el aviso anterior ya decía 76: no había caído nadie: los
      // mismos corredores se soltaban en la rampa y volvían en el repecho siguiente.
      const lost = frontAtLastNotice - front.length
      const rejoined = front.length - frontAtLastNotice
      // Progresión: una criba larga se cuenta en POCAS frases que enseñen cómo va cayendo el grupo,
      // no en un parte cada 3 km. Cada aviso ya dado sube el listón del siguiente —más kilómetros y
      // una fracción mayor de lo que quedaba—, así un puerto de 27 km da dos o tres frases.
      const step = 1 + STAGE.splitPhaseEscalation * splitPhase
      // Un corte grande se cuenta en el acto, sin esperar al throttle de km: 76 corredores fuera
      // en tres kilómetros son una frase que el lector necesita ahí, no cinco kilómetros después.
      const bigCut =
        lost >= STAGE.splitEventBigDropMin &&
        lost >= frontAtLastNotice * STAGE.splitEventBigDropFraction * step &&
        km - lastFrontNoticeKm >= STAGE.splitEventBigDropKmGap * step
      const material =
        lost >= STAGE.splitEventMinDropped &&
        lost >= frontAtLastNotice * STAGE.splitEventMinDropFraction * step
      if (material && (km - lastFrontNoticeKm >= STAGE.splitEventMinKmGap * step || bigCut)) {
        // Quién aprieta: uno de los más fuertes en cabeza del pelotón en este puerto, pero NO el
        // mismo del aviso anterior — nombrar diez veces seguidas al mismo equipo era la mitad de la
        // sensación de "parte clónico". Con un grupo grande su EQUIPO es quien tira y así se narra;
        // con un grupo pequeño lo decide la web, que para eso recibe el tamaño.
        const ranking = front
          .map((m) => ({ id: m.input.riderId, p: riderPerfil(m, block) }))
          .sort((a, b) => b.p - a.p || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        const driver = (ranking.find((x) => x.id !== lastSplitDriverId) ?? ranking[0])?.id
        log.emit(km, peloton.tS, 'corte', 'peloton_split', driver ? [driver] : [], {
          dropped: lost,
          remaining: front.length,
          before: frontAtLastNotice,
          // Descuelgues brutos contados por el motor en el tramo: la goma se rompió tantas veces,
          // aunque muchos volvieran. Es telemetría, no es lo que se narra.
          shed: droppedSinceNotice,
          // Cuántos avisos lleva ya esta criba: la web usa el 0 para presentar al que aprieta y los
          // siguientes para contar la progresión sin volver a nombrarlo.
          phase: splitPhase,
          // Si la fuga sigue por delante, este grupo NO va en cabeza: es el que persigue. Decir
          // "N left in front" con una fuga en carretera era sencillamente falso.
          chasing: breakaway && !caught ? 1 : 0,
        })
        lastFrontNoticeKm = km
        frontAtLastNotice = front.length
        droppedSinceNotice = 0
        lastSplitDriverId = driver ?? null
        splitPhase += 1
      } else if (
        // Reagrupamiento: los descolgados vuelven y el grupo se recompone. Existía en el modelo
        // desde siempre (los cortados recortan `chaseBackSecondsPerKm` en llano y se reenganchan
        // dentro de `regroupGapSeconds`) y NO se narraba nunca: la crónica dejaba "51 delante" en la
        // última frase y en meta llegaban más de cien juntos. Es información de carrera de primer
        // orden y ahora tiene su evento.
        rejoined >= STAGE.regroupEventMinRiders &&
        rejoined >= frontAtLastNotice * STAGE.regroupEventMinFraction &&
        km - lastFrontNoticeKm >= STAGE.regroupEventKmGap
      ) {
        log.emit(km, peloton.tS, 'reagrupamiento', 'peloton_regroup', [], {
          joined: rejoined,
          remaining: front.length,
          before: frontAtLastNotice,
          chasing: breakaway && !caught ? 1 : 0,
        })
        lastFrontNoticeKm = km
        frontAtLastNotice = front.length
        droppedSinceNotice = 0
        // El grupo vuelve a estar entero: la criba anterior se ha cerrado y la próxima empieza de
        // cero, tanto en el throttle como en quién puede volver a ser el protagonista.
        splitPhase = 0
        lastSplitDriverId = null
      }
    } else {
      // Fuera del desenlace el pelotón se rompe y se recompone sin consecuencias: lo que se soltó
      // en un puerto de tempo no se arrastra a la cuenta de la criba que sí decide la etapa.
      droppedSinceNotice = 0
      frontAtLastNotice = membersOf(PELOTON).length
      splitPhase = 0
      lastSplitDriverId = null
    }

    peloton = advance(peloton, membersOf(PELOTON), pelFrac)
    if (breakaway && !caught) breakaway = advance(breakaway, membersOf(BREAKAWAY), brkFrac)
    for (let g = 0; g < shed.length; g++) {
      const adv = advance(shed[g]!, membersOf(shed[g]!.id), 1)
      // Un descolgado del pelotón NUNCA rueda por delante de él: en carretera el grupo grande, a rueda,
      // siempre es más rápido que un suelto. Sin este tope, un "descolgado" con compromiso alto se
      // escapaba en FANTASMA (más rápido que el pelotón a tempo) y ganaba la etapa sin que la fuga ni la
      // crónica lo contaran. PERO el tope solo aplica en LLANO/DESCENSO: en la SUBIDA un descolgado sí
      // puede quedar por delante de lo que reste del pelotón (que se ha estirado y va más lento en
      // conjunto), y ahí la selección debe mantenerse —no reagrupar—.
      shed[g] = !onClimb && adv.tS < peloton.tS ? { ...adv, tS: peloton.tS } : adv
    }

    // Recorte y reagrupamiento de los descolgados. En terreno RODADOR (llano/descenso) cierran el
    // boquete con el pelotón a un ritmo (s/km) y, al entrar en rango, se reenganchan. En SUBIDA no
    // hay recorte —allí manda la selección, que es lo que hace una etapa de montaña—, pero los
    // descolgados que ruedan a la MISMA altura sí se funden en grupetos: si no, la reina terminaba
    // con una mediana de 30 grupos de un solo corredor (docs/motor.md §3-bis-e).
    if (shed.length > 0) {
      if (!onClimb) {
        const close = STAGE.chaseBackSecondsPerKm * STAGE.dx
        for (const sg of shed) {
          if (membersOf(sg.id).length === 0) continue
          const gap = sg.tS - peloton.tS
          if (gap > 0) sg.tS = Math.max(peloton.tS, sg.tS - close)
        }
      }
      // En subida el umbral de fusión es más estrecho (y no hay reenganche al pelotón): los que van
      // juntos de verdad forman grupeto, los que están cortados de verdad siguen cortados.
      const mergeGap = onClimb ? STAGE.grupetoJoinGapSeconds : STAGE.regroupGapSeconds
      const stillDropped: Group[] = []
      for (const sg of [...shed].sort((a, b) => a.tS - b.tS)) {
        const mem = membersOf(sg.id)
        if (mem.length === 0) continue
        // ¿alcanza al pelotón? se reengancha (solo en terreno rodador).
        if (!onClimb && gapSeconds(peloton, sg) <= STAGE.regroupGapSeconds) {
          for (const m of mem) m.groupId = PELOTON
          peloton = { ...peloton, riderIds: [...peloton.riderIds, ...sg.riderIds] }
          continue
        }
        // ¿se funde con un grupeto cercano ya por delante? forman un autobús que rueda junto.
        const near = stillDropped.find((o) => Math.abs(o.tS - sg.tS) <= mergeGap)
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
        const eff = riderEff(m)
        const out = rollCrash(rngCrash, block, isFinal, eff, e, m.input.fragility ?? 1)
        if (!out) continue
        incidents.push({ riderId: m.input.riderId, km, tipo: 'caida', ...out })
        dropOut(m, group, out.perdidaS)
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
  finishStage(sims, allGroups, log, rngSprint, totalKm, finishTerrain, leadOutFor)

  const results = buildResults(sims)
  const workUnits = new Map<string, number>()
  const tank = new Map<string, TankState>()
  for (const [id, s] of sims) {
    workUnits.set(id, s.work)
    tank.set(id, tankState(s.energy, s.energy0, s.input.eff0.RES))
  }

  return {
    events: log.toArray(),
    results,
    workUnits,
    incidents,
    tank,
    engineVersion: ENGINE_VERSION,
  }
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
    .map((m) => {
      // La volante la define SPR; la cima, el perfil de escalador (MON/COL). Con la EROSIÓN del
      // momento (`riderEff`), no con el corredor fresco del km 0: puntuar los banners con `eff0`
      // era incoherente con el resto del motor —un escalador reventado seguía coronando primero—
      // y estaba anotado como defecto abierto desde el Cambio 0 (docs/motor.md §9).
      const eff = riderEff(m)
      return {
        m,
        score:
          (isSprint ? eff.SPR : Math.max(eff.MON, eff.COL)) *
          normal(rngSprint, 1, STAGE.sprintScoreNoiseSd),
      }
    })
    .sort((a, b) => b.score - a.score)
  // Disputar el banner cuesta `bannerCost` UNA vez a cada contendiente (SPEC 6.11). El descuento
  // vivía dentro del reparto de puntos, así que se cobraba una vez POR PUESTO puntuable: con la
  // tabla de la meta volante (8 puestos) cada aspirante pagaba 16 de tanque por cada volante, y en
  // una carrera con tres sprints intermedios eso vaciaba medio depósito antes de correr.
  for (const c of contenders) c.energy = Math.max(0, c.energy - STAGE.bannerCost)
  ranked.forEach(({ m }, idx) => {
    const pts = table[idx] ?? 0
    if (pts <= 0) return
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
      .map((m) => {
        // Con la erosión del momento, igual que la meta volante: quien llega a la cima vaciado
        // corona detrás de quien llega entero, aunque sea mejor escalador en el papel.
        const eff = riderEff(m)
        return {
          m,
          score: Math.max(eff.MON, eff.COL) * normal(rngSprint, 1, STAGE.sprintScoreNoiseSd),
        }
      })
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
    // Datos para una crónica informativa: categoría del puerto, puntos que suma el primero, y si con
    // ellos pasa a LIDERAR la clasificación de la montaña (o solo se acerca). `ordered` tiene ya a
    // todos los corredores en carrera, así que el máximo de climbPts es el líder actual de la montaña.
    const maxPts = ordered.reduce((mx, m) => Math.max(mx, m.climbPts), 0)
    log.emit(km, groups[0]?.tS ?? 0, 'banner', 'climb_kom', [winner.input.riderId], {
      category: block.climbCategory ?? '',
      points: table[0] ?? 0,
      leads: winner.climbPts >= maxPts && winner.climbPts > 0 ? 1 : 0,
    })
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
 * Cierra la etapa: define el orden dentro de cada grupo y los tiempos (SPEC 6.12, docs/motor.md §12).
 *
 * El orden ya NO lo decide un solo atributo. Cada grupo resuelve su propio TIPO de final —que
 * depende del recorrido y de cuántos lleguen— y dentro de él se puntúa con una MEZCLA de atributos
 * (`finishScore`), corregida por el TRABAJO que cada uno ha hecho durante el día: quien ha tirado
 * llega peor que quien fue a rueda, que es lo que convierte "ir a rueda" en una decisión con coste
 * de oportunidad y no en la única estrategia.
 */
function finishStage(
  sims: Map<string, RiderSim>,
  groups: Group[],
  log: EventLog,
  rngSprint: Rng,
  totalKm: number,
  terrain: FinishTerrain,
  leadOutFor: Map<string, string[]>,
): void {
  const withMembers = groups
    .map((group) => ({ group, members: [...sims.values()].filter((s) => s.groupId === group.id) }))
    .filter((g) => g.members.length > 0)
  withMembers.sort((a, b) => a.group.tS - b.group.tS)

  // Contador del orden de llegada. Los grupos ya van ordenados por reloj, así que basta con ir
  // repartiéndolo grupo a grupo y, dentro de cada uno, por el ranking del remate.
  let order = 0

  withMembers.forEach(({ group, members }, gi) => {
    const idSet = new Set(members.map((m) => m.input.riderId))
    const type = finishType(terrain, members.length)
    const sprintFinish = isSprintFinish(type)
    // El trabajo se compara con la MEDIA DEL GRUPO que llega: lo que cuenta no es haber gastado
    // mucho en términos absolutos (eso ya lo cobra la erosión), sino haber trabajado más que
    // aquellos contra los que se disputa la meta.
    const meanWork = members.reduce((acc, m) => acc + m.work, 0) / members.length
    const ranked = members
      .map((m) => {
        const e = erosion(m.energy, m.energy0, m.input.eff0.RES)
        const eff = effNow(m.input.eff0, e, m.energy <= 0)
        let score = finishScore(eff, type) * normal(rngSprint, 1, STAGE.sprintScoreNoiseSd)
        // Peaje del trabajo del día (docs/motor.md §12): `workUnits` ya se calculaba y no se usaba
        // para nada en el resultado.
        if (meanWork > 0) {
          const extra = m.work / meanWork - 1
          const toll = Math.max(
            -STAGE.finishWorkMax,
            Math.min(STAGE.finishWorkMax, STAGE.finishWorkWeight * extra),
          )
          score *= 1 - toll
        }
        // Tren de lanzadores: en una llegada al sprint, un sprinter bien lanzado por su equipo
        // remata mejor (SPEC 6.18). Solo cuentan los lanzadores que llegan en su mismo grupo.
        if (sprintFinish) {
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
    // El tiempo del GRUPO, redondeado UNA sola vez y compartido por todos sus corredores. Antes se
    // sumaba al reloj un épsilon de 1 ms por posición para desempatar el ORDEN y luego se redondeaba
    // el resultado: un grupo que cruzaba en X,477 s repartía X a los 23 primeros y X+1 a los demás,
    // un corte inventado por el redondeo que además se acumulaba etapa tras etapa en la general y en
    // la clasificación por equipos. El orden vive ahora en `finishOrder`, no en el reloj.
    const groupTimeS = Math.round(group.tS)
    ranked.forEach(({ m }, idx) => {
      // Los segundos cedidos marcando (SPEC 6.18) son tiempo cedido DE VERDAD en carretera (el
      // marcador no se soltó del grupo, pero llegó con ese retraso), así que sí separan su tiempo
      // del de sus compañeros de grupo. Es la única separación legítima dentro de un grupo.
      m.finishTs = groupTimeS + Math.round(m.markLossS)
      m.finishOrder = order + idx
    })
    order += ranked.length
    if (gi === 0 && ranked[0]) {
      const field = ranked.length
      // Sprint masivo A EFECTOS DE CRÓNICA: un grupo numeroso que no llega trepando disputa la
      // meta al sprint, ruede por asfalto, por adoquín o cuesta abajo. Es el mismo criterio de
      // antes (`!finishUphill && field >= 8`) con una definición de "cuesta arriba" que ya no la
      // dispara un solo bloque de los últimos 2 km.
      const isBunch = !isUphillFinish(type) && field >= STAGE.bunchSprintMinRiders
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
      const margin = nextTs != null ? Math.max(0, Math.round(nextTs - group.tS)) : 0
      const won = isBunch ? 'sprint' : field === 1 ? 'solo' : 'group'
      // Reporte de último km cuando NO es un sprint masivo: quién manda en cabeza y con cuánta ventaja,
      // para que el desenlace no llegue de golpe (el sprint masivo ya lo cuenta bunch_sprint).
      if (!isBunch) {
        const leaders = ranked.slice(0, Math.min(3, field)).map((r) => r.m.input.riderId)
        log.emit(Math.max(0, totalKm - 1), group.tS, 'final', 'final_km', leaders, {
          margin,
          field,
        })
      }
      log.emit(totalKm, group.tS, 'meta', 'stage_win', [ranked[0].m.input.riderId], {
        won,
        margin,
        field,
        // Qué clase de final resolvió la etapa: dato de telemetría (docs/motor.md §12 y §16). La
        // crónica no lo necesita todavía, pero es lo que permite comprobar desde fuera que un
        // repecho de 200 m no ha convertido una llana en llegada de escaladores.
        finish: type,
      })
    }
  })
}

/** Ordena a todos por tiempo, asigna puestos y bonificaciones (SPEC 6.15). */
function buildResults(sims: Map<string, RiderSim>): StageResult[] {
  const finishers = [...sims.values()]
    .filter((s) => s.finishTs !== null)
    // Por tiempo y, a igualdad de tiempo (que es lo NORMAL dentro de un grupo), por el orden de
    // llegada que resolvió el remate. El puesto lo decide el juez de llegada, no el cronómetro.
    .sort((a, b) => a.finishTs! - b.finishTs! || a.finishOrder - b.finishOrder)
  finishers.forEach((s, idx) => {
    s.bonusS = STAGE.timeBonuses[idx] ?? 0
    // La meta de etapa reparte puntos de regularidad (SPEC 6.11): la fuente principal de la
    // clasificación por puntos, no solo las metas volantes intermedias.
    s.sprintPts += STAGE.finishPoints[idx] ?? 0
  })
  return finishers.map((s, idx) => ({
    riderId: s.input.riderId,
    puesto: idx + 1,
    // Ya es entero: se redondeó una vez, en el reloj del grupo.
    tiempoS: s.finishTs!,
    bonificacionS: s.bonusS,
    puntosVolante: s.sprintPts,
    puntosMontana: s.climbPts,
    estado: 'finish' as const,
  }))
}
