/**
 * Simulación de una etapa completa, bloque a bloque (SPEC 6.16).
 * - Paso 24: etapa llana de principio a fin (fuga 6.10, controlador 6.9, banners 6.11, sprint 6.12).
 * - Paso 26: montaña: descuelgue en los puertos (6.8), muros con COL (6.4), cimas puntuables y
 *   finales en alto donde la ley de velocidad integra las diferencias sola.
 * Puro y determinista: todo el azar entra por los subflujos nominales del RNG (6.1).
 */
import { normal, type Rng } from '../random.js'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import {
  applyTimeCut,
  collapseLambda,
  elevationGainPerKm,
  shouldCollapse,
  timeCutFraction,
} from './abandon.js'
import { chaseField, isFinisher, lerp } from './chase.js'
import { EventLog } from './events.js'
import { type Group, advanceGroup, createGroup, gapSeconds, percentile75 } from './group.js'
import { blockCost, blockPerfil, effNow, erosion, rhythm, tankState } from './physics.js'
import { rollHazard } from './hazard.js'
import { rollCrash } from './crash.js'
import {
  type FinishTerrain,
  type FinishType,
  deriveFinishTerrain,
  finishScore,
  finishType,
  isSprintFinish,
  isUphillFinish,
} from './finish.js'
import { markingMargin, resolveMarking, wheelProbability } from './marcaje.js'
import {
  type MoveContext,
  type MoveKind,
  type MoveRider,
  chooseInstigator,
  followProbability,
  giveUpLambda,
  jumpGapSeconds,
  moveCooperation,
  pelotonAllows,
  rankOf,
  rollMoveAttempt,
  sustainsJump,
} from './tactics.js'
import {
  type TeamIntent,
  type TeamPlan,
  buildTeamPlans,
  currentIntent,
  frontClaim,
  teamAttackFactor,
  teamDrive,
} from './teamPlan.js'
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

/**
 * Un MOVIMIENTO en carretera: un grupo que se ha ido por delante del pelotón (docs/motor.md §13).
 * Un ataque logrado ES un grupo nuevo, así que lo único que hace falta añadir a `Group` es la
 * memoria táctica: de qué clase de intento nació, si el pelotón le ha dado cuerda, si ya ha cuajado
 * y —si es un puente— a quién iba a buscar.
 */
interface Move {
  g: Group
  kind: MoveKind
  /** Grupo del que salió. Un intento prospera cuando abre hueco sobre ÉL, no sobre el pelotón. */
  sourceId: string
  bornKm: number
  /** Reglas 4-5: el pelotón le ha dado cuerda. Si no, lo cierra a `tacticControlCommit`. */
  allowed: boolean
  /** Ha superado `tacticBreakGapSeconds`: el intento ha PROSPERADO. */
  prospered: boolean
  /** Es la fuga del día (la primera que cuaja dentro de la ventana). */
  dayBreak: boolean
  /** ¿Se narró el intento? Si no se contó cómo salió, tampoco se cuenta cómo acabó. */
  narrated: boolean
  /** Grupo al que iba a enganchar, si nació como puente (regla 7). */
  targetId: string | null
  /** Hasta qué km aguanta el esfuerzo de puente; pasado eso, se acabó (regla 7). */
  bridgeUntilKm: number | null
  /** Ritmo al que rueda cuando deja de puentear: el de un grupo que colabora y ya está. */
  restCommit: number
  /**
   * ATRIBUCIÓN (v11): trabajo al frente que han hecho SUS PERSEGUIDORES desde que el movimiento
   * salió. Es la cuenta que responde a «no sé quién hizo el trabajo para reducir la distancia»:
   * al capturarlo se nombra a quien más puso AQUÍ, no a quien tiró en el km 20 por otra cosa.
   */
  chaseLedger: Map<string, number>
  /** Mayor boquete que llegó a tener sobre su perseguidor, y en qué km lo tuvo. */
  peakGapS: number
  peakGapKm: number
}

/** Estado mutable de un corredor durante la simulación. */
interface RiderSim {
  input: StageRider
  energy0: number
  energy: number
  groupId: string
  work: number
  /**
   * TRABAJO AL FRENTE (v11, docs/motor.md §16). `work` mezcla el gasto de ir a rueda con el de
   * relevar y solo sirve para el TSS; esto cuenta SOLO los bloques en que el corredor está en el
   * turno de relevos, ponderado por lo que el grupo estaba apretando por encima del tempo de
   * carretera (`STAGE.frontWorkIdleCommit`). Separado por grupo, porque tirar del pelotón y
   * colaborar en la fuga son dos noticias distintas.
   */
  frontWorkPeloton: number
  frontWorkMove: number
  /**
   * El mismo trabajo al frente del pelotón, pero con OLVIDO (`pullWindowDecayPerKm`): es la
   * ventana con la que se responde «quién tira AHORA» en vez de «quién ha tirado más hoy».
   */
  pullWindow: number
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
  /**
   * Ya administró el esfuerzo (regla 8): se dejó ir a propósito. Un corredor solo puede rendirse UNA
   * vez —el que ya rueda a `giveUpCommit` en su grupeto no puede volver a «dejarse ir»—, y sin esta
   * marca `administerEffort` volvía a sortearlo cada bloque también sobre los grupos de descolgados:
   * medido en producción, Alex Taylor se descolgaba en el km 196, en el 204 y en el 209 de la misma
   * carrera (v13, docs/balance.md).
   */
  gaveUp: boolean
  /** Ya se contó su pájara: se narra una vez por corredor, no cada vez que le suelta el grupo. */
  bonkNoticed: boolean
  /**
   * Km SEGUIDOS con el tanque a cero (v14, docs/motor.md §VI.3). El contador se reinicia en cuanto
   * el corredor recupera algo de depósito: el colapso pide arrastrarse, no rozar el cero un bloque.
   */
  bonkKm: number
  /**
   * Se BAJÓ DE LA BICI en carretera: no llega a meta (`estado: 'abandon'`). Guarda el km para la
   * crónica; `null` mientras siga en carrera.
   */
  abandonedKm: number | null
  incident: Incident | null
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
 *
 * El impulso del cerillo vale en TODO terreno que selecciona (v12, docs/motor.md §14), no solo en
 * la subida: si en el adoquín se quema una cerilla para no soltarse, tiene que servir para lo
 * mismo que sirve en el puerto —aguantar los metros siguientes—, o quemarla sería tirarla.
 */
function riderPerfil(sim: RiderSim, block: Block): number {
  const eff = riderEff(sim)
  const useCol = block.tipo === 'subida' && block.g >= STAGE.wallMinGradient
  let perfil = blockPerfil(eff, block, useCol)
  if (sim.climbBoostBlocks > 0 && block.tipo !== 'llano') perfil += STAGE.matchBonus
  return perfil
}

/**
 * Cuánto SELECCIONA el terreno de un bloque (v12, docs/motor.md §14). 0 = no selecciona: el llano
 * no descuelga a nadie, y una bajada que en realidad es relieve menudo, tampoco.
 *
 * La subida vale 1 por definición —es la referencia con la que se calibró `lambdaDropBase`—, así
 * que la montaña sigue exactamente igual que antes de este cambio.
 */
function selectionFactor(block: Block): number {
  switch (block.tipo) {
    case 'subida':
      return 1
    case 'paves':
      // Las estrellas del sector escalan la dureza: viajan en el dato desde la v4 y hasta ahora
      // solo se leían para el coste en energía. Un 5★ rompe casi el doble que un 3★.
      return (STAGE.dropPavesFactor * block.estrellas) / STAGE.dropPavesStarsReference
    case 'descenso':
      return block.g <= STAGE.dropDescentMaxGradient ? STAGE.dropDescentFactor : 0
    case 'llano':
      return 0
  }
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
function relayDuty(m: RiderSim, protectedByTeam: boolean, teamDriveNow: number): number {
  const duty = STAGE.relayDutyByRole[m.input.orders.role]
  const freshness = m.energy0 > 0 ? Math.max(0, Math.min(1, m.energy / m.energy0)) : 0
  return (
    duty +
    STAGE.relayFreshnessWeight * freshness -
    (protectedByTeam ? STAGE.relayProtectedPenalty : 0) +
    // EL PLAN DE EQUIPO (v15, docs/motor.md §V.1). Este es el término que hace que el frente del
    // pelotón tenga DUEÑO: el equipo que persigue empuja a los suyos al turno y el que se esconde
    // los saca. Vale 0 para el agente libre y para el que corre por su cuenta (regla 1 de §V.1),
    // así que un campo sin equipos da exactamente el mismo turno que en la v14.
    STAGE.teamRelayDriveWeight * teamDriveNow +
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
  driveOfRider: (riderId: string) => number,
): Set<string> {
  const count = Math.min(members.length, Math.max(1, Math.ceil(paceFraction * members.length)))
  const scored = members.map((m) => {
    const helpers = domestiquesFor.get(m.input.riderId)
    const protectedByTeam = helpers != null && helpers.some((id) => idSet.has(id))
    return {
      id: m.input.riderId,
      duty: relayDuty(m, protectedByTeam, driveOfRider(m.input.riderId)),
    }
  })
  // Desempate final por id para que el orden sea total y no herede el orden de inserción.
  scored.sort((a, b) => b.duty - a.duty || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return new Set(scored.slice(0, count).map((s) => s.id))
}

/**
 * POR QUÉ tira quien tira (v13, docs/motor.md §16). El dueño lo dijo así: «cada vez que alguien tire
 * del pelotón, tienes que mencionar por qué; está trabajando para alguien, ¿no? Si no, no debería
 * desgastarse». El motor lo sabe desde la v9 —el rol y el `targetRiderId` de las órdenes— y no lo
 * contaba. Cuatro respuestas posibles, y la cuarta es un diagnóstico, no un adorno:
 *
 * - `gregarios`: todos los que tiran son gregarios del MISMO jefe de filas. Su equipo lleva la carrera.
 * - `tren`: todos son lanzadores del mismo sprinter. Es el tren de meta.
 * - `equipo`: sirven al mismo hombre con roles mezclados (un gregario y su lanzador, p. ej.).
 * - `alianza`: hay dos o más jefes de filas distintos detrás del trabajo. No manda un equipo: coinciden.
 * - `libre`: ninguno de los que tira trabaja para nadie. Es el «desgastarse a lo wey» del dueño, y si
 *   sale a menudo el defecto es del motor, no de la frase. Medido: 2,1% de las menciones (v12).
 */
export function pullReason(
  ids: readonly string[],
  worksFor: ReadonlyMap<string, { targetId: string; role: 'gregario' | 'lanzador' }>,
): {
  kind: 'gregarios' | 'tren' | 'equipo' | 'alianza' | 'libre'
  targetId?: string
  leaders: number
} {
  const targets = new Set<string>()
  const roles = new Set<string>()
  for (const id of ids) {
    const w = worksFor.get(id)
    if (!w) continue
    targets.add(w.targetId)
    roles.add(w.role)
  }
  if (targets.size === 0) return { kind: 'libre', leaders: 0 }
  if (targets.size > 1) return { kind: 'alianza', leaders: targets.size }
  const targetId = [...targets][0]!
  if (roles.size === 1 && roles.has('lanzador')) return { kind: 'tren', targetId, leaders: 1 }
  if (roles.size === 1 && roles.has('gregario')) return { kind: 'gregarios', targetId, leaders: 1 }
  return { kind: 'equipo', targetId, leaders: 1 }
}

export function simulateStage(input: StageInput, seed: string): StageOutput {
  // Contrarreloj: grupos de un corredor, sin drafting ni hazards de ataque (SPEC 6.13).
  if (input.timeTrial) return simulateTimeTrial(input, seed)

  const streams = stageRng(seed)
  // Subflujos nominales creados UNA vez: reutilizarlos preserva la secuencia (SPEC 6.1).
  const rngBreak = streams('breakaway')
  // Subflujo NOMINAL de la capa táctica (SPEC 6.1): los intentos de movimiento tiran de aquí, así
  // que añadirlos no altera la secuencia de la fuga, del sprint ni de las caídas.
  const rngTactics = streams('tactics')
  const rngSprint = streams('sprint')
  const rngHazard = streams('hazard')
  // Subflujo NOMINAL de la selección FUERA de la montaña (v12, SPEC 6.1, docs/motor.md §14). El
  // descuelgue en pavé y en descenso NO puede tirar de `rngHazard`: ese flujo lo consume el
  // descuelgue en subida bloque a bloque, y meterle tiradas nuevas DESPLAZARÍA su secuencia,
  // moviendo resultados de montaña que hoy están calibrados (y con ellos los invariantes) sin que
  // ninguna ley de la montaña haya cambiado. Con un subflujo propio la montaña sale idéntica.
  const rngRough = streams('rough')
  // Subflujo NOMINAL de los ABANDONOS (v14, SPEC 6.1, docs/motor.md §VI.3). Mismo motivo que
  // `rngRough`: el dado del colapso no puede salir de `rngTactics` —que consume `administerEffort`
  // bloque a bloque y con el que se calibró la regla 8— ni de `rngHazard`, que es el del descuelgue
  // en montaña. Con subflujo propio, una etapa en la que no se retira nadie sale dígito a dígito
  // igual que en la v13.
  const rngAbandon = streams('abandon')
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
      frontWorkPeloton: 0,
      frontWorkMove: 0,
      pullWindow: 0,
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
      gaveUp: false,
      bonkNoticed: false,
      bonkKm: 0,
      abandonedKm: null,
      incident: null,
    })
  }
  /**
   * Los corredores VIVOS de un grupo: ni han llegado a meta ni se han retirado. El que abandona
   * deja de existir para el resto del motor —no marca ritmo, no releva, no puntúa un banner— y por
   * eso el filtro está aquí y no repartido por el bucle.
   */
  const membersOf = (groupId: string): RiderSim[] =>
    [...sims.values()].filter(
      (s) => s.groupId === groupId && s.finishTs === null && s.abandonedKm === null,
    )

  // Trabajo de equipo (SPEC 6.18): quién arropa a quién. Un líder con `targetRiderId` de sus gregarios
  // gasta menos si los lleva en el grupo; un sprinter con lanzadores va mejor lanzado en la meta.
  const domestiquesFor = new Map<string, string[]>()
  const leadOutFor = new Map<string, string[]>()
  // Marcaje (SPEC 6.18): quién marca a qué rival. Un marcador se agarra a la rueda de su objetivo y
  // aguanta sus ataques en la subida mientras su nivel no esté muy por debajo (no le deja marcharse solo).
  const markTargetOf = new Map<string, string>()
  /** Cuántos marcadores MÁS (aparte de uno dado) vigilan a un objetivo: la rueda se disputa. */
  const marksAlso = (targetId: string, exceptId: string): number => {
    let n = 0
    for (const [markerId, t] of markTargetOf) if (t === targetId && markerId !== exceptId) n += 1
    return n
  }
  /**
   * PARA QUIÉN TRABAJA cada corredor (v13, docs/motor.md §16). Es el reverso de `domestiquesFor` y
   * `leadOutFor`, y existe por una pregunta del dueño: «cada vez que alguien tire del pelotón, tienes
   * que mencionar por qué; está trabajando para alguien, ¿no?». El motor ya tenía la respuesta en las
   * órdenes y la tiraba: el parte de `peloton_pull` nombraba a los tres que más habían tirado y no
   * decía a cuenta de quién. No es física: es telemetría que ya estaba y no se contaba.
   */
  const worksFor = new Map<string, { targetId: string; role: 'gregario' | 'lanzador' }>()
  for (const r of input.riders) {
    const target = r.orders.targetRiderId
    if (!target) continue
    if (r.orders.role === 'gregario' || r.orders.role === 'lanzador') {
      worksFor.set(r.riderId, { targetId: target, role: r.orders.role })
    }
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
  // Movimientos por delante del pelotón (docs/motor.md §13). La fuga del día ya no se compone antes
  // del km 0: EMERGE del primer intento que cuaja, y por delante puede haber a la vez una fuga, un
  // contraataque y un puente que no llega.
  const moves: Move[] = []
  let moveCounter = 0
  /** Km del último intento salido de cada grupo: la carrera respira entre ataque y ataque. */
  const lastAttemptKm = new Map<string, number>()
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
  /**
   * Y los que se han ido HACIA DELANTE en un ataque desde el último aviso. No son una criba: el
   * grupo también mengua cuando alguien se escapa, y narrar «12 descolgados» porque doce se han
   * fugado sería contar la carrera al revés.
   */
  let escapedSinceNotice = 0
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
  /** Km del último intento NARRADO: la crónica cuenta los ataques, no los inventaría. */
  let lastAttackNoticeKm = Number.NEGATIVE_INFINITY
  /** …y el de la última pájara narrada: en la reina se vacía el pelotón entero (v14). */
  let lastBonkNoticeKm = Number.NEGATIVE_INFINITY
  let chaseAnnounced = false
  let chaseAbandoned = false
  let consolidated = false
  let caught = false
  /** Los corredores que formaron la fuga del día: mientras alguno siga delante, no está cazada. */
  let dayBreakRiders: string[] = []
  let dayBreakFormed = false

  const kmAt = (i: number): number => (i + 0.5) * STAGE.dx

  // --- ATRIBUCIÓN DEL TRABAJO (v11, docs/motor.md §16) --------------------------------------
  // Estado del parte de «quién tira del pelotón»: desde qué km no se cuenta y a quién se nombró.
  let lastPullReportKm = Number.NEGATIVE_INFINITY
  let lastPullLeader = ''
  /** Ya se ha contado una vez cómo se reparte el trabajo dentro de la fuga. */
  let breakShareReported = false

  /**
   * Los que más trabajo al frente han hecho, de más a menos, quedándose solo con los que han
   * puesto una parte apreciable de lo que puso el primero: si tiran dos, se nombran dos; si tira
   * uno solo, se nombra uno. El desempate por id hace el orden total (nunca el de inserción).
   */
  const topWorkers = (
    ledger: Iterable<[string, number]>,
    max: number,
    minShare: number,
  ): { ids: string[]; best: number } => {
    const ranked = [...ledger]
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    const best = ranked[0]?.[1] ?? 0
    return {
      ids: ranked
        .slice(0, max)
        .filter(([, w]) => w >= best * minShare)
        .map(([id]) => id),
      best,
    }
  }

  /**
   * Quién hizo el trabajo para cerrar. Se engancha a la captura de un movimiento y nombra a los que
   * más pusieron EN ESA persecución (no a quien tiró en el km 20 por otra cosa). Si el movimiento
   * se cazó SOLO —porque se hundió, no porque nadie tirara— no emite nada: mentir es peor que
   * callar, y por eso hay dos umbrales, el del boquete que llegó a haber y el del trabajo hecho.
   */
  const attributeChase = (mv: Move, atKm: number, atTs: number): void => {
    if (mv.peakGapS < STAGE.chaseWorkMinGapSeconds) return
    const { ids, best } = topWorkers(
      mv.chaseLedger,
      STAGE.chaseWorkNamesMax,
      STAGE.chaseWorkNamesMinShare,
    )
    if (ids.length === 0 || best < STAGE.chaseWorkMinUnits) return
    log.emit(atKm, atTs, 'trabajo', 'chase_work', ids, {
      // Lo que se cerró: desde la cúspide del boquete hasta aquí, y en cuántos km.
      closedS: Math.round(mv.peakGapS),
      km: Math.max(1, Math.round(atKm - mv.peakGapKm)),
      work: Math.round(10 * best) / 10,
    })
  }

  // Los sprinters solo cazan si la meta NO TREPA (una llegada masiva que puedan disputar): en un
  // final en alto no persiguen, y la fuga vive o muere en la subida (SPEC 6.9).
  //
  // El adoquín cuenta como llegada rodada, y esto sí es un arreglo (v12): la condición pedía que
  // los últimos 2 km fueran `llano` o `descenso`, así que los 300 m del Espace Charles Crupelandt
  // —el sector 1 de Paris-Roubaix, a 1,1 km de meta— apagaban la persecución en TODA la carrera. El
  // pelotón pasaba al control de la general, daba los 350 s de `gcControlLeash` y la fuga del día
  // se llevaba el monumento con siete minutos. Un sector de pavé en el último kilómetro no convierte
  // la meta en una llegada de escaladores: sigue siendo un remate rodado de los que queden.
  const finalStretch = blocks.slice(Math.max(0, n - STAGE.finalBlocks))
  const finishFlat = finalStretch.every((b) => b.tipo !== 'subida')

  /**
   * Km desde cada bloque hasta el siguiente de ADOQUÍN (v12). Se recorre el recorrido una vez hacia
   * atrás y sirve para una sola cosa: que el pelotón no ruede a tempo en la aproximación a un
   * sector. La pelea por entrar delante es media clásica del Norte (`pavesApproachKm`).
   */
  const kmToNextPaves = new Float64Array(n)
  {
    let next = Number.POSITIVE_INFINITY
    for (let i = n - 1; i >= 0; i--) {
      next = blocks[i]!.tipo === 'paves' ? 0 : next + STAGE.dx
      kmToNextPaves[i] = next
    }
  }
  // Qué clase de final dibuja el RECORRIDO (docs/motor.md §12). Se mide una vez por etapa sobre los
  // últimos ~5 km y la última cota de los últimos 15; el TIPO de final concreto se resuelve luego
  // para cada grupo de meta, porque depende también de cuántos lleguen.
  const finishTerrain = deriveFinishTerrain(blocks)
  /**
   * LA FUERZA DE LA CAZA (`stage/chase.ts`): cuántos trenes tiene el campo, cómo de bueno es su
   * rematador y con cuántos compañeros cuenta. Antes bastaba UN corredor con SPR ≥ 70 para que el
   * pelotón entero persiguiera a tope, en una continental modesta igual que en una gran vuelta.
   * Con la fuerza a 1 (tres rematadores de primer nivel) el controlador da exactamente los mismos
   * números que antes; cuanto más flojo es el campo, más cuerda da, menos aprieta y antes se rinde.
   */
  const chaseStrength = chaseField(input.riders)
  const chasingSprinters = finishFlat && chaseStrength.force >= STAGE.chaseMinForce
  /**
   * Cuerda máxima, tope de esfuerzo y tirón final de los trenes, escalados por la fuerza del campo.
   *
   * Desde la v15 esto se recalcula en cada decisión del pelotón en vez de una vez por etapa, porque
   * la fuerza DISPONIBLE ya no es constante: mengua con el presupuesto de los equipos que persiguen
   * (§V.1). Con la fuerza fija —un campo sin equipos— devuelve exactamente los mismos números que
   * la v14, que es lo que mantiene quietos los invariantes de balance.
   */
  const chaseGear = (
    force: number,
  ): { leash: number; commitCap: number; finalDrive: number; feasible: number } => ({
    leash: STAGE.chaseMaxLeashSeconds * (1 + STAGE.chaseWeakLeashGain * (1 - force)),
    commitCap: lerp(STAGE.chaseWeakCommitCap, 1, force),
    finalDrive: lerp(STAGE.chaseWeakFinalDrive, STAGE.finalDriveCommit, force),
    feasible: STAGE.chaseFeasibleSecondsPerKm * lerp(STAGE.chaseWeakFeasibleFloor, 1, force),
  })
  let gear = chaseGear(chaseStrength.force)
  // Jefe de filas de los sprinters: el mejor rematador. Su equipo es el que suele tirar para cazar,
  // así que se nombra en la crónica de la persecución (protagonista del evento sprinters_chase).
  const leadSprinterId =
    [...input.riders].filter(isFinisher).sort((a, b) => b.eff0.SPR - a.eff0.SPR)[0]?.riderId ?? null

  /**
   * ¿Hay general en juego? En la etapa 1 de una vuelta y en toda carrera de un día, TODOS llegan
   * con `gcDeficitSeconds` = 0: leído literalmente, el pelotón entero sería el líder y cualquier
   * movimiento una amenaza mortal. No hay general que defender hasta que hay diferencias.
   */
  const hasGcContext = input.riders.some((r) => r.gcDeficitSeconds > 0)

  // --- EL PLAN DE EQUIPO (v15, docs/motor.md §V.1) -----------------------------------------
  // El motor ya conoce los equipos. Aquí se monta el plan de cada uno y el estado que se GASTA: el
  // presupuesto de esfuerzo al frente, que es lo que hace que la caza deje de ser un escalar de
  // etapa («este equipo tira y este otro se esconde», y el que lleva 80 km tirando ya no puede).
  // Un campo sin equipos deja el mapa vacío y con él todo lo de abajo neutro: los agentes libres
  // corren de forma individual (§V.1, regla 2) y la etapa sale dígito a dígito como en la v14.
  const teamPlans = buildTeamPlans(
    input.riders.map((r) => ({
      riderId: r.riderId,
      teamId: r.teamId ?? null,
      role: r.orders.role,
      mentality: r.orders.mentality,
      ...(r.orders.targetRiderId ? { targetRiderId: r.orders.targetRiderId } : {}),
      spr: r.eff0.SPR,
      gcDeficitSeconds: r.gcDeficitSeconds,
    })),
    { finishFlat, hasGcContext },
  )
  const teamOf = new Map<string, string>()
  /** Los que corren por su cuenta contra el plan de su equipo (§VI.2): fuera del plan, no del equipo. */
  const rebels = new Set<string>()
  for (const plan of teamPlans.values()) {
    for (const id of plan.memberIds) teamOf.set(id, plan.teamId)
    for (const id of plan.rebelIds) rebels.add(id)
  }
  /** Lo que cada equipo lleva gastado al frente del pelotón, en unidades de `frontWork`. */
  const teamSpent = new Map<string, number>()
  /** Su intención AHORA, recalculada en cada decisión del pelotón. */
  const teamIntent = new Map<string, TeamIntent>()
  /** Y el empuje que de ahí sale para el turno de relevos, cacheado entre decisiones. */
  const teamDriveNow = new Map<string, number>()
  /**
   * EL EQUIPO QUE LLEVA EL FRENTE. Uno solo, con histéresis: cede el relevo cuando gasta su
   * presupuesto o pierde su baza. Es lo que hace que la crónica pueda decir «Cumbre Escuadra ha
   * tomado el frente» en vez de nombrar a tres corredores de tres equipos distintos.
   */
  let frontTeamId: string | null = null
  for (const plan of teamPlans.values()) {
    teamIntent.set(plan.teamId, plan.baseIntent)
    teamDriveNow.set(plan.teamId, teamDrive(plan.baseIntent, 0, false))
  }
  /**
   * El empuje del plan sobre UN corredor. Cero para el agente libre y cero para el que corre por su
   * cuenta (§V.1, regla 1: las individualidades priman), así que ni le empuja al frente ni le saca
   * de él: decide con su rol, sus piernas y su mentalidad, como si no tuviera equipo.
   */
  const driveOfRider = (riderId: string): number => {
    if (rebels.has(riderId)) return 0
    const t = teamOf.get(riderId)
    return t == null ? 0 : (teamDriveNow.get(t) ?? 0)
  }
  const attackFactorOf = (riderId: string): number => {
    if (rebels.has(riderId)) return 1
    const t = teamOf.get(riderId)
    if (t == null) return 1
    const intent = teamIntent.get(t)
    return intent == null ? 1 : teamAttackFactor(intent)
  }
  const spentFractionOf = (plan: TeamPlan): number =>
    plan.budget > 0 ? (teamSpent.get(plan.teamId) ?? 0) / plan.budget : 1
  /**
   * DESOBEDECER (docs/motor.md §VI.2): quien sale hoy por su cuenta se anuncia una vez, al principio,
   * y se acabó. Es raro por construcción —`autoOrders` nunca nombra dos jefes en un equipo, así que
   * solo pasa cuando un jugador humano da una orden que contradice el plan— y por eso merece una
   * línea cuando pasa. Una sola: la crónica no es un inventario.
   */
  if (rebels.size > 0) {
    log.emit(0, 0, 'por_libre', 'rider_defies_team', [...rebels].sort().slice(0, 3), {
      total: rebels.size,
    })
  }

  // --- ABANDONOS (v14, docs/motor.md §VI.3) -------------------------------------------------
  /** Los que se han bajado de la bici, en orden de retirada. */
  const abandoned: RiderSim[] = []
  /**
   * SALVAGUARDA 1: como mucho un 4 % del pelotón que tomó la salida se va en una sola etapa por
   * decisión del motor. Es el tope contra la hemorragia, que es el riesgo real de esta mecánica:
   * un corte aplicado sin tope puede llevarse a media carrera en un mal día. Se reparte por orden
   * de llegada del suceso —primero el colapso, que ocurre en carretera; lo que quede, para el corte
   * de tiempo— y lo que no cabe se readmite con penalización en vez de eliminarse.
   */
  const abandonBudget = Math.floor(STAGE.abandonStageCapFraction * input.riders.length)

  /** El movimiento más adelantado que sigue teniendo corredores; `null` si no hay nada delante. */
  const frontMove = (): Move | null => {
    let best: Move | null = null
    for (const m of moves) {
      if (membersOf(m.g.id).length === 0) continue
      if (best === null || m.g.tS < best.g.tS) best = m
    }
    return best
  }

  /**
   * Cuerda que el pelotón está dispuesto a dar al grupo de cabeza (SPEC 6.9). Es la de siempre
   * (`gcControlLeash`) salvo que delante vaya una AMENAZA para la general: entonces el pelotón le
   * deja recuperar como mucho `gcThreatFraction` de su desventaja, porque más sería regalarle el
   * liderato. `gcDeficitSeconds` lo rellenaba packages/db en cada corredor y el motor lo ignoraba.
   */
  const gcLeash = (): number => {
    if (!hasGcContext) return STAGE.gcControlLeash
    const front = frontMove()
    if (!front) return STAGE.gcControlLeash
    let worst = Number.POSITIVE_INFINITY
    for (const m of membersOf(front.g.id)) worst = Math.min(worst, m.input.gcDeficitSeconds)
    if (!Number.isFinite(worst)) return STAGE.gcControlLeash
    return Math.min(STAGE.gcControlLeash, STAGE.gcThreatFraction * worst)
  }

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
    const onPaves = block.tipo === 'paves'
    /**
     * Terreno que ROMPE de verdad (v12, docs/motor.md §14): el puerto y el adoquín. Lo que se
     * pierde ahí no se recupera sobre la marcha —dentro de un sector de pavé no hay rueda a la que
     * volver, se va uno detrás de otro y el hueco se abre—, así que el recorte de los descolgados y
     * el reenganche al pelotón solo existen en terreno RODADOR. Entre sector y sector sí se vuelve,
     * que es como se corre Roubaix de verdad.
     *
     * El DESCENSO queda fuera a propósito: ahí se pierde la rueda y se recupera en el valle, y esa
     * es justo la diferencia entre una bajada y un sector de adoquines.
     */
    const onRough = onClimb || onPaves
    const raceThisClimb = totalKm - km <= STAGE.climbRaceKmToGo

    // Controlador del pelotón cada 10 bloques, con histéresis (SPEC 6.9). Regula SIEMPRE: haya fuga,
    // la hayan cazado o no se haya formado nunca. Antes vivía dentro de `if (breakaway && !caught)`,
    // de modo que sin fuga el pelotón rodaba TODA la etapa a `commitIdle` (39 minutos de diferencia
    // medidos en una llana de 180 km) y, al capturar, el compromiso quedaba congelado hasta meta.
    if (i % STAGE.decisionEveryBlocks === 0) {
      // El grupo de cabeza ya no es «la fuga»: es el movimiento más adelantado de los que haya en
      // carretera, que puede ser la fuga del día, un contraataque o un puente que se quedó a medias.
      const front = frontMove()
      const ahead = front !== null
      const gap = front ? peloton.tS - front.g.tS : 0
      const kmRestantes = totalKm - km

      // --- EL PLAN DE EQUIPO, al día (v15, docs/motor.md §V.1) -----------------------------
      // Cada decisión del pelotón se revisa qué está jugando cada equipo y cuánto le queda en las
      // piernas. De aquí salen dos cosas: el empuje que sus hombres llevan al turno de relevos
      // —lo que hace que el frente tenga dueño— y la fuerza DISPONIBLE de la caza, que ya no es un
      // escalar de etapa. Con el mapa vacío (campo sin equipos) esto no hace nada.
      if (teamPlans.size > 0) {
        const inMove = new Set<string>()
        for (const mv of moves) for (const m of membersOf(mv.g.id)) inMove.add(m.input.riderId)
        const menInPeloton = (plan: TeamPlan): number =>
          plan.memberIds.filter((id) => !rebels.has(id) && sims.get(id)?.groupId === PELOTON).length
        // 1. Qué juega cada equipo AHORA.
        for (const plan of teamPlans.values()) {
          // Solo cuenta el hombre delante si NO es un rebelde: el equipo no defiende a quien se ha
          // ido por su cuenta contra sus órdenes (§VI.2), así que sigue persiguiendo.
          const manUpTheRoad = plan.memberIds.some((id) => inMove.has(id) && !rebels.has(id))
          teamIntent.set(plan.teamId, currentIntent(plan, { manUpTheRoad, kmToGo: kmRestantes }))
        }
        // 2. QUIÉN LLEVA EL FRENTE. Con la carretera despejada el relevo pasa al siguiente equipo
        //    con derecho: el que más se juega y con el depósito colectivo más entero. Hay
        //    histéresis a propósito —solo se cede cuando el que manda ha gastado su presupuesto o
        //    ha perdido su baza—, porque un frente que cambia de dueño cada kilómetro no es un
        //    frente: es lo que producía la alianza permanente de la v14.
        const claimOf = (plan: TeamPlan): number =>
          menInPeloton(plan) > 0 ? frontClaim(teamIntent.get(plan.teamId) ?? 'nada') : 0
        const current = frontTeamId ? teamPlans.get(frontTeamId) : undefined
        if (!current || claimOf(current) === 0 || spentFractionOf(current) >= 1) {
          const relief = [...teamPlans.values()]
            .filter((p) => claimOf(p) > 0 && spentFractionOf(p) < 1)
            .sort(
              (a, b) =>
                claimOf(b) - claimOf(a) ||
                spentFractionOf(a) - spentFractionOf(b) ||
                b.quality - a.quality ||
                (a.teamId < b.teamId ? -1 : 1),
            )[0]
          // Si no queda nadie fresco con derecho al frente, sigue el que estaba (fundido) hasta que
          // alguien recupere la baza: la carretera no se queda sin nadie delante.
          if (relief) frontTeamId = relief.teamId
          else if (!current || claimOf(current) === 0) frontTeamId = null
        }
        // 3. El empuje de cada uno, y la fuerza que le QUEDA a la caza.
        let chaseReady = 0
        let chaseFull = 0
        for (const plan of teamPlans.values()) {
          const intent = teamIntent.get(plan.teamId) ?? 'nada'
          const spent = spentFractionOf(plan)
          teamDriveNow.set(plan.teamId, teamDrive(intent, spent, plan.teamId === frontTeamId))
          if (intent !== 'perseguir' && intent !== 'lanzar') continue
          // Peso: los hombres que el equipo tiene todavía en el pelotón. Un equipo diezmado no
          // puede cazar por muchas ganas que le queden.
          const present = menInPeloton(plan)
          chaseFull += present
          chaseReady += present * Math.max(0, 1 - spent)
        }
        const avail = chaseFull > 0 ? chaseReady / chaseFull : 1
        gear = chaseGear(chaseStrength.force * lerp(STAGE.teamChaseTiredForce, 1, avail))
      }

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
        ...moves.map((m) => ({ g: m.g, rank: 0 })),
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

      // --- ATRIBUCIÓN: quién tira del pelotón (v11, docs/motor.md §16) ----------------------
      // La ventana se olvida un poco cada kilómetro: el parte tiene que decir quién está tirando
      // AHORA, no quién ha tirado más en toda la etapa. Sin olvido, el que se partió el lomo en el
      // km 20 seguiría siendo el protagonista en el 150 y el parte sería siempre el mismo.
      for (const s of sims.values()) s.pullWindow *= STAGE.pullWindowDecayPerKm
      const pelotonNow = membersOf(PELOTON)
      // Nunca antes de que la fuga esté formada: hasta entonces el pelotón va en bloque y «quién
      // tira» no significa nada. Y nunca de un pelotón que no existe (queda uno solo).
      //
      // Pero una carrera en la que NO cuaja ninguna fuga se quedaba sin parte de relevos en toda la
      // etapa, y con ella sin nada que contar del tramo medio: medido en producción, Race Muscat no
      // tiene una sola línea entre el km 33 y el 136 (v13, defecto B6). Pasada una cuarta parte del
      // recorrido el pelotón ya lleva horas decidiendo el ritmo, haya fuga o no, y quién lo marca es
      // noticia igual.
      const pullWorthTelling = dayBreakFormed || km >= totalKm * STAGE.pullNoBreakRouteFrac
      if (pullWorthTelling && km >= breakFormedKm && pelotonNow.length >= 2) {
        const pull = topWorkers(
          pelotonNow.map((m): [string, number] => [m.input.riderId, m.pullWindow]),
          STAGE.pullNamesMax,
          STAGE.pullNamesMinShare,
        )
        // Se cuenta cuando CAMBIA QUIEN MANDA —el primero de la lista, no un tercer nombre que
        // rota— y han pasado unos km desde el parte anterior; o cuando el parte anterior ha
        // caducado aunque siga mandando el mismo. Mirar la lista entera daba 17 partes en una
        // clásica de 278 km: en un pelotón que se rompe cada muro, el tercer nombre nunca repite.
        const leader = pull.ids[0] ?? ''
        if (
          pull.ids.length > 0 &&
          pull.best >= STAGE.pullMinWork &&
          km - lastPullReportKm >= STAGE.pullReportMinKmGap &&
          (leader !== lastPullLeader || km - lastPullReportKm >= STAGE.pullReportKmGap)
        ) {
          const c = peloton.compromiso
          const why = pullReason(pull.ids, worksFor)
          log.emit(km, peloton.tS, 'tiran', 'peloton_pull', pull.ids, {
            commit: Math.round(100 * c) / 100,
            // POR QUÉ tiran (v13): `forKind` dice de qué clase de trabajo se trata y `forId`, cuando
            // hay uno solo, a quién sirve. Nadie se desgasta al frente por gusto: o es el equipo de
            // un jefe de filas, o es el tren de un sprinter, o son varios equipos coincidiendo en
            // que hay que cazar. Y si de verdad no hay nadie detrás de ese esfuerzo, se dice.
            forKind: why.kind,
            ...(why.targetId ? { forId: why.targetId } : {}),
            ...(why.leaders > 1 ? { forLeaders: why.leaders } : {}),
            // Clasificado, que es lo que la crónica sabe decir: a tempo de carretera, firme, o a tope.
            effort:
              c <= STAGE.pullEffortTempoMax
                ? 'tempo'
                : c >= STAGE.pullEffortFullMin
                  ? 'tope'
                  : 'firme',
            toGo: Math.round(kmRestantes),
            // El tamaño decide la VOZ de la crónica: con un pelotón grande manda el equipo, con un
            // grupo pequeño se nombra a los corredores (`STAGE.frontNamesMaxRiders`).
            size: pelotonNow.length,
            chasing: ahead ? 1 : 0,
          })
          lastPullReportKm = km
          lastPullLeader = leader
        }
      }

      // --- ATRIBUCIÓN: cómo se reparte el trabajo dentro de la fuga (v11) -------------------
      // El dato ya estaba (`frontWorkMove`) y sale gratis: una vez por etapa, con la fuga asentada,
      // y solo si el reparto es DESIGUAL —que se relevan bien ya lo cuenta `break_cooperation`—.
      if (!breakShareReported && dayBreakFormed && km - breakFormedKm >= STAGE.breakShareMinKm) {
        const dayMove = moves.find((mv) => mv.dayBreak)
        const mem = dayMove ? membersOf(dayMove.g.id) : []
        if (mem.length >= STAGE.breakShareMinRiders) {
          const total = mem.reduce((acc, m) => acc + m.frontWorkMove, 0)
          const fair = total / mem.length
          const share = topWorkers(
            mem.map((m): [string, number] => [m.input.riderId, m.frontWorkMove]),
            STAGE.pullNamesMax,
            STAGE.pullNamesMinShare,
          )
          const passengers = mem.filter(
            (m) => m.frontWorkMove < fair * STAGE.breakSharePassengerFactor,
          ).length
          if (
            total > 0 &&
            share.ids.length > 0 &&
            share.ids.length < mem.length &&
            share.best >= fair * STAGE.breakShareUnevenFactor
          ) {
            breakShareReported = true
            log.emit(km, dayMove!.g.tS, 'colaboracion', 'break_share', share.ids, {
              size: mem.length,
              passengers,
              toGo: Math.round(kmRestantes),
            })
          }
        }
      }

      // Ritmo base del pelotón cuando no hay nada que cazar por delante: tempo de carretera, a tope
      // en el puerto decisivo, y el tirón de los últimos km cuando la meta es llana (trenes de sprint).
      const freeRunTarget = onClimb
        ? raceThisClimb
          ? STAGE.climbRaceCommit
          : STAGE.climbTempoCommit
        : finishFlat && kmRestantes <= STAGE.finalDriveKm
          ? gear.finalDrive
          : STAGE.pelotonTempoCommit
      // Con la carretera despejada la pregunta de si la caza es viable se hace de cero: haber
      // claudicado ante la fuga del día no significa regalar el siguiente movimiento.
      if (moves.length === 0) chaseAbandoned = false
      let target: number = freeRunTarget
      // Reglas 4 y 5: mientras haya en carretera un movimiento al que el pelotón NO ha dado cuerda,
      // el pelotón lo cierra. Es lo que hace que la mayoría de los intentos fracasen —y lo que hace
      // que hagan falta varios antes de que cuaje la fuga del día— sin necesidad de un dado aparte.
      const closing = moves.length > 0 && !moves.some((m) => m.allowed)
      if (closing) {
        target = Math.max(freeRunTarget, STAGE.tacticControlCommit)
      } else if (ahead && chasingSprinters && !chaseAbandoned) {
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
        const desiredGap = gear.leash * frac
        const err = gap - desiredGap
        const cierreNecesario = gap / Math.max(1, kmRestantes - STAGE.chaseCatchTargetKm)
        // Los sprinters solo claudican ante LA FUGA DEL DÍA y con un boquete de verdad. La fórmula
        // divide por los km que faltan hasta el punto de captura, así que cerca de meta declara
        // inviable cualquier cosa: sin estas dos condiciones, cada ataque tardío de 15 s sentaba a
        // los trenes y le regalaba la etapa. Antes no se notaba porque no había ataques tardíos.
        const conceded =
          front?.dayBreak === true &&
          gap >= STAGE.chaseNeverConcedeSeconds &&
          cierreNecesario > gear.feasible
        if (conceded) {
          chaseAbandoned = true
          log.emit(km, peloton.tS, 'caza_abandonada', 'sprinters_give_up', [])
        } else {
          // …y el tope de esfuerzo lo pone el campo: un par de equipos flojos no pueden poner al
          // pelotón a 0,9 durante 100 km por mucho que el lazo se lo pida.
          target = Math.min(
            gear.commitCap,
            Math.max(0.1, STAGE.chaseHoldCommit + STAGE.chaseGain * err),
          )
        }
      } else if (ahead) {
        // Control de la general: en el llano el pelotón rueda a tempo para limitar el boquete (no
        // capturar); pero en cuanto empieza a subir, los favoritos atacan a tope y la subida
        // decide (SPEC 6.9). Boquete deseado constante fuera de la subida. Y si delante va una
        // AMENAZA para la general (`gcDeficitSeconds`, que el motor ignoraba), la cuerda se acorta.
        const err = gap - gcLeash()
        target = onClimb
          ? freeRunTarget
          : Math.min(1, Math.max(0.1, STAGE.chaseHoldCommit + STAGE.chaseGain * err))
      }
      // En los últimos km de una etapa de meta llana los trenes toman la carretera y el pelotón
      // vuela: el controlador de boquete NO puede dejarlo rodar por debajo de eso. Sin este suelo,
      // un ataque tardío de 20 s hacía que el lazo cerrado pidiera 0,72 —menos que el 0,85 del
      // tirón final— y el pelotón AFLOJABA por tener a alguien delante, regalando la etapa.
      if (finishFlat && kmRestantes <= STAGE.finalDriveKm && !chaseAbandoned) {
        target = Math.max(target, gear.finalDrive)
      }
      // Y en un sector de ADOQUINES —y en los kilómetros de aproximación, peleando por la posición—
      // se corre, no se rueda (v12, docs/motor.md §14). Es un SUELO, como el tirón final: si el
      // pelotón ya iba más rápido persiguiendo, el pavé no lo frena. Sin esto los 31 sectores de
      // Paris-Roubaix se pasaban al tempo de carretera y la selección que abría cada sector se
      // deshacía en el asfalto siguiente (medido: 58 -> 44 -> 57).
      if (onPaves || kmToNextPaves[i]! <= STAGE.pavesApproachKm) {
        target = Math.max(target, STAGE.pavesRaceCommit)
      }
      peloton = {
        ...peloton,
        compromiso: peloton.compromiso + (target - peloton.compromiso) * STAGE.commitHysteresis,
      }
      // La fuga CONSOLIDADA: el pelotón ha decidido que se juegue la etapa. Hasta la v12 bastaba con
      // que el compromiso bajara del umbral durante 2 km, y eso pasaba a los 10 km de carrera —cuando
      // el pelotón sencillamente aún no ha empezado a trabajar—: en cinco de las siete carreras de
      // producción la crónica decía «the peloton concedes» en el km 10 y «the break is caught» en el
      // 126 (v13, defecto B4). No es conceder, es no haber empezado. Ahora hacen falta las tres cosas:
      // que la carrera lleve un trecho hecho, que la fuga tenga una ventaja de verdad, y que aun así
      // el pelotón no se ponga a tirar. Y el contador de kilómetros consentidos SOLO corre mientras se
      // cumplen las dos primeras, para que el paseo del arranque no vaya sumando crédito.
      const couldConcede =
        km >= totalKm * STAGE.concedeMinRouteFrac && gap >= STAGE.concedeMinGapSeconds
      if (!consolidated && dayBreakFormed && !caught && couldConcede) {
        if (peloton.compromiso < STAGE.breakawayCommitThreshold) {
          lowCommitKm += STAGE.decisionEveryBlocks * STAGE.dx
          if (lowCommitKm >= STAGE.breakawayConsolidateKm) {
            consolidated = true
            log.emit(
              Math.max(km, breakFormedKm),
              peloton.tS,
              'fuga_consolidada',
              'peloton_concedes',
              dayBreakRiders,
            )
          }
        } else {
          lowCommitKm = 0
        }
      }
    }

    // Avance físico de un grupo y gasto de energía de sus corredores.
    // `kind` no cambia nada de la física: solo dice a qué contador de TRABAJO AL FRENTE va lo que
    // se releva aquí (v11). Tirar del pelotón, colaborar en la fuga y arrastrarse en un grupeto
    // son tres cosas distintas y la crónica las cuenta distinto.
    const advance = (
      group: Group,
      members: RiderSim[],
      paceFraction: number,
      kind: 'peloton' | 'move' | 'shed' = 'shed',
    ): Group => {
      if (members.length === 0) return group
      const p75 = pacemakerP75(members, block, paceFraction)
      const next = advanceGroup(group, block, p75, { isFinal })
      const idSet = new Set(members.map((m) => m.input.riderId))
      const relayers = relayTurn(members, idSet, paceFraction, domestiquesFor, driveOfRider)
      // Lo que vale un relevo en este bloque: solo cuenta lo que se aprieta POR ENCIMA del tempo
      // de carretera, así una captura que se cierra a 0,9 no se confunde con cien kilómetros de
      // paseo (y una captura sin nadie apretando se queda, con razón, sin autor).
      const frontEffort = Math.max(0, group.compromiso - STAGE.frontWorkIdleCommit) * STAGE.dx
      // Los movimientos que van por DELANTE de este grupo: lo que se releva aquí es trabajo de
      // persecución contra ellos, y es lo que se nombra al cazarlos.
      const chased =
        kind === 'shed' || frontEffort <= 0
          ? []
          : moves.filter((mv) => mv.g.id !== group.id && mv.g.tS < group.tS)
      for (const m of members) {
        const relaying = relayers.has(m.input.riderId)
        /**
         * ¿Va este hombre EN CABEZA DEL PELOTÓN, o solo dentro del cuarto delantero? (v15, §V.1).
         * El turno de relevos es una aproximación binaria de un continuo: en un pelotón de 176 el
         * turno son 44 hombres, y de esos los que de verdad dan la cara al viento son los cuatro o
         * cinco del equipo que ha tomado el frente. Los demás van colocados detrás de ellos.
         *
         * Esta es la distinción que activa el TERCER estado de rebufo de SPEC 6.5
         * (`shelterWorking`, definido desde el Paso 21 y sin usar): rotando en cabeza se paga más
         * viento que relevando en una fuga. Y es también lo que hace que el parte de «quién tira»
         * pueda nombrar a un EQUIPO: sin ella, los 44 acumulan exactamente el mismo trabajo.
         */
        const onTheFront =
          relaying &&
          kind === 'peloton' &&
          frontTeamId !== null &&
          !rebels.has(m.input.riderId) &&
          teamOf.get(m.input.riderId) === frontTeamId
        if (relaying && frontEffort > 0) {
          if (kind === 'peloton') {
            m.frontWorkPeloton += frontEffort
            // El parte responde «quién tira AHORA»: el que va en cabeza se lleva el trabajo entero
            // y el que releva colocado detrás, su parte. Es observación, no física: no mueve un
            // segundo. Sin equipo que lleve el frente, todos cuentan igual y esto es lo de siempre.
            m.pullWindow +=
              frontEffort * (frontTeamId === null || onTheFront ? 1 : STAGE.pullOffFrontShare)
            // …y se lo apunta a SU EQUIPO (v15, §V.1). Es el presupuesto que se agota: cuando un
            // equipo lleva 80 km al frente sus hombres salen del turno y el frente cambia de dueño.
            // El rebelde no gasta presupuesto de nadie: no tira por su equipo.
            const team = rebels.has(m.input.riderId) ? undefined : teamOf.get(m.input.riderId)
            if (team != null) teamSpent.set(team, (teamSpent.get(team) ?? 0) + frontEffort)
          } else if (kind === 'move') {
            m.frontWorkMove += frontEffort
          }
          for (const mv of chased) {
            mv.chaseLedger.set(
              m.input.riderId,
              (mv.chaseLedger.get(m.input.riderId) ?? 0) + frontEffort,
            )
          }
        }
        // EL QUE VA SOLO PAGA EL VIENTO ENTERO (v15, docs/motor.md §8). `shelterAlone` llevaba
        // definido desde el Paso 21 sin que lo usara nadie, así que un escapado en solitario cobraba
        // el rebufo de un grupo que no tenía —y también el descolgado que rueda solo—. Un grupo de
        // UNO no tiene rueda a la que ir: paga 0 de rebufo, igual que en la contrarreloj.
        const shelter =
          members.length === 1
            ? STAGE.shelterAlone
            : onTheFront
              ? STAGE.shelterWorking
              : relaying
                ? STAGE.shelterRelay
                : STAGE.shelterProtected
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
    const dropOut = (
      m: RiderSim,
      group: Group,
      delayS = 0,
      commit: number = STAGE.shedCommit,
    ): void => {
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
        createGroup(gid, [m.input.riderId], { tS, vActual: group.vActual, compromiso: commit }),
      )
    }

    // Descuelgue (SPEC 6.8): quien no aguanta el P75 de los punteros de su grupo o quema un cerillo
    // o se descuelga. Hasta la v11 esto solo pasaba EN SUBIDA (`if (block.tipo !== 'subida')`), y
    // por eso los 31 sectores reales de adoquines de Paris-Roubaix costaban energía pero no rompían
    // el pelotón: la clásica de adoquines llegaba entera y se decidía al sprint. Desde la v12 el
    // MISMO mecanismo vale en el pavé y en el descenso (docs/motor.md §14); lo único que cambia es
    // con qué atributo se mide el déficit (`blockPerfil`) y cuánto pesa (`selectionFactor`).
    const shatter = (group: Group, members: RiderSim[], paceFraction: number): string[] => {
      const dropped: string[] = []
      // Pájara (SPEC 6.7): con el tanque a cero el corredor se descuelga automáticamente, suba o no.
      // El efecto sobre el rendimiento se activó en la v8 (`effNow(..., bonk)`, que hasta entonces
      // no se llamaba desde ninguna parte); lo que faltaba desde entonces, y entra en la v14, es
      // CONTARLA: el motor la ejecutaba en silencio y el journal no podía narrarla.
      for (const m of members) {
        if (!isBonked(m)) continue
        dropOut(m, group)
        dropped.push(m.input.riderId)
        if (m.bonkNoticed) continue
        m.bonkNoticed = true
        // Se cuenta UNA vez por corredor y con throttle largo, y esto es deliberado: en la etapa
        // reina de una gran vuelta se vacía el pelotón entero, y narrar 170 pájaras sería el «no
        // menciones uno a uno todos los ciclistas que se van descolgando» del dueño otra vez. La
        // criba que producen ya la cuenta `peloton_split`; esto pone cara al primero que revienta.
        const narrate = km - lastBonkNoticeKm >= STAGE.bonkNarrateKmGap
        if (narrate) lastBonkNoticeKm = km
        log.emit(km, group.tS, 'pajara', 'rider_bonks', [m.input.riderId], {
          toGo: Math.round(totalKm - km),
          narra: narrate ? 1 : 0,
        })
      }
      const factor = selectionFactor(block)
      if (factor <= 0) return dropped
      // El dado: la montaña sigue con el suyo de siempre y el terreno nuevo estrena el suyo, para
      // no desplazar una secuencia calibrada (ver `rngRough` arriba).
      const rngDrop = block.tipo === 'subida' ? rngHazard : rngRough
      const alive = members.filter((m) => m.groupId === group.id)
      const pace = pacemakerP75(alive, block, paceFraction)
      const inGroup = new Set(alive.map((m) => m.input.riderId))
      for (const m of alive) {
        const deficit = pace - riderPerfil(m, block)
        if (deficit <= STAGE.dropDeficitTolerance) continue
        const lambda = (STAGE.lambdaDropBase * factor * deficit) / STAGE.dropDeficitDenom
        if (!rollHazard(rngDrop, lambda)) continue
        // Marcaje (SPEC 6.18): el hazard que acaba de saltar ES el momento de selección (el ataque).
        // Si m marca a un rival que va en su MISMO grupo, la respuesta la resuelve el módulo
        // oficial `marcaje.ts`: pegado a rueda, cede unos segundos, o se suelta. Vale igual en el
        // puerto, en el adoquín y en la bajada: un marcador pegado a la rueda de su objetivo lo
        // sigue estando ruede por donde ruede (v12).
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

    /**
     * Regla 8 (docs/motor.md §13): **es normal que un corredor agotado se descuelgue en los últimos
     * km**, en montaña y también en llano. Salvo motivación especial **se deja ir**, con el único
     * cuidado del FUERA DE CONTROL. Hasta ahora solo te descolgabas si no aguantabas el P75: nunca
     * porque decidieras ahorrar, así que el vaciado agonizaba a rueda hasta la meta.
     */
    const administerEffort = (group: Group, members: RiderSim[], inFront: boolean): void => {
      if (members.length === 0) return
      if (totalKm - km > STAGE.giveUpKm) return
      for (const m of members) {
        // Rendirse es un acto único: quien ya se dejó ir rueda a `giveUpCommit` en su grupeto y no
        // puede volver a dejarse ir. Sin esto el sorteo lo repescaba cada bloque —también dentro de
        // los grupos de descolgados, que este mismo bucle recorre— y la crónica narraba tres veces
        // el descuelgue del mismo corredor (v13, defecto B3).
        if (m.gaveUp) continue
        const lambda = giveUpLambda(
          {
            role: m.input.orders.role,
            mentality: m.input.orders.mentality,
            energyFraction: m.energy0 > 0 ? Math.max(0, m.energy / m.energy0) : 0,
            inFrontGroup: inFront,
          },
          totalKm - km,
        )
        if (lambda <= 0) continue
        if (!rollHazard(rngTactics, lambda)) continue
        // El cuidado del fuera de control: solo administra si lo que va a ceder de aquí a meta cabe
        // dentro del corte. La cuenta es la de la propia ley de velocidad —ritmo(c) es lineal en el
        // compromiso—, así que el retraso relativo se conoce sin simular nada.
        const slower = rhythm(group.compromiso) / rhythm(STAGE.giveUpCommit) - 1
        const remainingS = ((totalKm - km) / Math.max(1, group.vActual)) * 3600
        if (slower * remainingS > STAGE.giveUpMaxLossFraction * group.tS) continue
        m.gaveUp = true
        dropOut(m, group, 0, STAGE.giveUpCommit)
        log.emit(km, group.tS, 'abandona_ritmo', 'rider_sits_up', [m.input.riderId], {
          toGo: Math.round(totalKm - km),
        })
      }
    }

    /**
     * COLAPSO (docs/motor.md §VI.3, causa «colapso / enfermedad»): el que lleva kilómetros con el
     * tanque a cero, lejos de meta y ya rodando a lo suyo, se baja de la bici. Es el único abandono
     * que ocurre DENTRO de la etapa; el fuera de control se resuelve en meta, cuando se conoce el
     * tiempo del ganador, y la lesión la resuelve `packages/db`, que es quien sabe que hay un mañana.
     *
     * El tope del 4 % se comprueba aquí también: el colapso gasta presupuesto antes que el corte,
     * porque ya ha ocurrido en carretera cuando el corte se calcula.
     */
    const collapseCheck = (group: Group, members: RiderSim[], inFront: boolean): void => {
      // Lo que su grupo lleva perdido contra el pelotón, en fracción del tiempo de carrera: la
      // medida de si va camino de quedar fuera de control.
      const lostFraction = peloton.tS > 0 ? Math.max(0, group.tS - peloton.tS) / peloton.tS : 0
      for (const m of members) {
        // El contador de pájara sostenida se lleva para TODOS, se colapse o no: es lo que distingue
        // arrastrarse veinte kilómetros de rozar el cero en una rampa.
        if (isBonked(m)) m.bonkKm += STAGE.dx
        else m.bonkKm = 0
        if (abandoned.length >= abandonBudget) continue
        const ctx = { bonkKm: m.bonkKm, kmToGo: totalKm - km, inFrontGroup: inFront, lostFraction }
        if (!shouldCollapse(ctx)) continue
        if (!rollHazard(rngAbandon, collapseLambda(ctx))) continue
        m.abandonedKm = km
        abandoned.push(m)
        group.riderIds = group.riderIds.filter((id) => id !== m.input.riderId)
        log.emit(km, group.tS, 'abandono', 'rider_abandons', [m.input.riderId], {
          causa: 'colapso',
          toGo: Math.round(totalKm - km),
        })
      }
    }
    collapseCheck(peloton, membersOf(PELOTON), true)
    for (const m of moves) collapseCheck(m.g, membersOf(m.g.id), true)
    for (const sg of shed) collapseCheck(sg, membersOf(sg.id), false)

    const climbFrac = raceThisClimb ? STAGE.climbPaceFraction : STAGE.climbTempoFraction
    // En un sector de adoquines el ritmo lo marcan los de delante, como en el puerto decisivo: la
    // posición lo es todo y nadie pasa un sector a tempo desde mitad del pelotón (v12). Sin esto el
    // P75 del pavé lo marcaba el cuarto delantero entero y el sector no estiraba el grupo.
    const roughFrac = onPaves ? STAGE.pavesPaceFraction : STAGE.pelotonPaceFraction
    const pelFrac = onClimb ? climbFrac : roughFrac
    const moveFrac = (m: Move): number => (onClimb ? climbFrac : onPaves ? roughFrac : m.g.coop)

    // El que va ESCAPADO se juega la etapa y aprieta los dientes; el que va en el pelotón o
    // descolgado a 20 km de meta con el depósito vacío, no. (El filtro fino —líder, sprinter,
    // cazaetapas, supercombativo— lo pone `giveUpLambda`.)
    administerEffort(peloton, membersOf(PELOTON), false)
    for (const m of moves) administerEffort(m.g, membersOf(m.g.id), true)
    for (const sg of shed) administerEffort(sg, membersOf(sg.id), false)
    const pelotonDropped = shatter(peloton, membersOf(PELOTON), pelFrac)
    for (const m of moves) shatter(m.g, membersOf(m.g.id), moveFrac(m))
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
      const lost = frontAtLastNotice - front.length - escapedSinceNotice
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
          // Los que se fueron HACIA DELANTE en un ataque desde el aviso anterior. El grupo también
          // mengua cuando alguien se escapa, y contarlos como descolgados sería narrar la carrera
          // al revés: `dropped + escapados` es siempre la diferencia entre `before` y `remaining`.
          escapados: escapedSinceNotice,
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
          chasing: moves.length > 0 ? 1 : 0,
        })
        lastFrontNoticeKm = km
        frontAtLastNotice = front.length
        droppedSinceNotice = 0
        escapedSinceNotice = 0
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
          chasing: moves.length > 0 ? 1 : 0,
        })
        lastFrontNoticeKm = km
        frontAtLastNotice = front.length
        droppedSinceNotice = 0
        escapedSinceNotice = 0
        // El grupo vuelve a estar entero: la criba anterior se ha cerrado y la próxima empieza de
        // cero, tanto en el throttle como en quién puede volver a ser el protagonista.
        splitPhase = 0
        lastSplitDriverId = null
      }
    } else {
      // Fuera del desenlace el pelotón se rompe y se recompone sin consecuencias: lo que se soltó
      // en un puerto de tempo no se arrastra a la cuenta de la criba que sí decide la etapa.
      droppedSinceNotice = 0
      escapedSinceNotice = 0
      frontAtLastNotice = membersOf(PELOTON).length
      splitPhase = 0
      lastSplitDriverId = null
    }

    // --- Capa táctica: EL INTENTO DE MOVIMIENTO (docs/motor.md §13) -----------------------
    // Una sola pieza para las siete primeras reglas: alguien lo intenta, 0..N le siguen, algunos no
    // llegan, colaboran o no, y la carretera decide. Un ataque logrado ES un grupo nuevo, así que
    // aquí no hay física nueva: se crea el grupo con su reloj y el boquete se integra como siempre.
    const kmToGo = totalKm - km
    const racingNow = [...sims.values()].filter(
      (s) => s.finishTs === null && s.abandonedKm === null,
    ).length

    /**
     * Throttle COMÚN de todo lo que se narra de un ataque —el intento, el que cuaja, el que cazan—:
     * la crónica cuenta la historia de los movimientos, no su inventario. Devuelve si toca frase y,
     * si toca, apunta el kilómetro.
     */
    const claimAttackNotice = (gapKm: number): boolean => {
      if (km - lastAttackNoticeKm < gapKm) return false
      lastAttackNoticeKm = km
      return true
    }

    const asMoveRider = (m: RiderSim, type: FinishType): MoveRider => ({
      riderId: m.input.riderId,
      role: m.input.orders.role,
      mentality: m.input.orders.mentality,
      perfil: riderPerfil(m, block),
      finishScore: finishScore(riderEff(m), type),
      energyFraction: m.energy0 > 0 ? Math.max(0, m.energy / m.energy0) : 0,
      matches: m.matches,
      tac: m.input.eff0.TAC,
      spr: m.input.eff0.SPR,
      gcDeficitSeconds: m.input.gcDeficitSeconds,
      teamAttack: attackFactorOf(m.input.riderId),
    })

    /** Un intento de movimiento desde `source`. Puede no salir, salir y fracasar, o salir y cuajar. */
    const attemptFrom = (source: Group, kind: MoveKind, target: Group | null): void => {
      if (kmToGo <= STAGE.tacticNoAttackKm) return
      if (moves.length >= STAGE.tacticMaxMoves) return
      const last = lastAttemptKm.get(source.id)
      if (last != null && km - last < STAGE.tacticAttemptCooldownKm) return
      const members = membersOf(source.id)
      if (members.length < 2) return
      const ctx: MoveContext = {
        kind,
        kmToGo,
        totalKm,
        groupSize: members.length,
        fieldSize: racingNow,
        onClimb,
        tension: source.tension,
        hasGcContext,
      }
      if (!rollMoveAttempt(rngTactics, ctx)) return
      lastAttemptKm.set(source.id, km)
      const type = finishType(finishTerrain, members.length)
      const pool = members.map((m) => asMoveRider(m, type))
      const instigator = chooseInstigator(pool, ctx, rngTactics)
      if (instigator === null) return
      // Regla 2: **algunos van atentos y saltan detrás**, y regla 3: **muchos de los que lo intentan
      // no lo consiguen**. Los que no sostienen se quedan donde estaban; no es un fallo del modelo,
      // es la mitad de por qué un ataque no prospera.
      const jumpers: MoveRider[] = []
      let stranded = 0
      const instigatorSim = sims.get(instigator.riderId)
      for (const r of pool) {
        if (r.riderId === instigator.riderId) continue
        const sim = sims.get(r.riderId)
        // MARCAJE (SPEC 6.18, regla 9): el que tiene la orden de marcar a quien acaba de atacar no
        // decide con el dado de la atención: si vive en su rueda, responde. `wheelProbability`
        // existía, tenía tests y no la llamaba nadie; `resolveMarking` solo se usaba en el
        // descuelgue. Este es el otro momento para el que se escribieron: la respuesta al ataque.
        const marks = sim != null && markTargetOf.get(r.riderId) === instigator.riderId
        if (marks && instigatorSim) {
          const onWheel =
            rngTactics() <
            wheelProbability(r.tac, instigator.tac, marksAlso(instigator.riderId, r.riderId))
          if (onWheel) {
            const outcome = resolveMarking(markingMargin(r.perfil, instigator.perfil))
            if (outcome.kind === 'stuck') {
              jumpers.push(r)
              continue
            }
            if (outcome.kind === 'gives') {
              sim.markLossS += outcome.secondsLost
              stranded += 1
              continue
            }
            stranded += 1
            continue
          }
        }
        if (rngTactics() >= followProbability(r, instigator, ctx)) continue
        if (sustainsJump(r, instigator, rngTactics)) jumpers.push(r)
        else stranded += 1
      }
      const party = [instigator, ...jumpers]
      const names = party.slice(0, 3).map((r) => r.riderId)
      // …y la otra mitad de la regla 2: si salta medio grupo, esto no es un ataque, es el grupo
      // entero estirándose. No nace ningún grupo: el intento se ha diluido.
      // TELEMETRÍA frente a NARRATIVA (docs/motor.md §16): el motor emite TODOS los intentos —son
      // dato, y el banco de la capa táctica los cuenta— pero marca cuáles merecen una frase. Una
      // etapa tiene una docena de intentos y la crónica no puede ser una lista de doce ataques
      // fallidos: se cuenta el primero, los que espacian, los numerosos y los del desenlace.
      const narrate =
        party.length >= STAGE.tacticAttemptNarrateRiders
          ? claimAttackNotice(0)
          : claimAttackNotice(
              kmToGo <= STAGE.gapReportFinalKm
                ? STAGE.tacticAttemptNarrateFinalKmGap
                : STAGE.tacticAttemptNarrateKmGap,
            )
      if (party.length > members.length * STAGE.tacticFollowFractionMax) {
        log.emit(km, source.tS, 'intento', 'attack_swarm', names, {
          kind,
          saltan: party.length,
          grupo: members.length,
          toGo: Math.round(kmToGo),
          narra: narrate ? 1 : 0,
        })
        return
      }
      // El acelerón abre un boquete de golpe (SPEC 6.4: un ataque es una ACELERACIÓN) y cuesta un
      // cerillo a cada uno (SPEC 6.6). A partir de aquí manda la carretera.
      const gap = jumpGapSeconds(rngTactics)
      const finishes = pool.map((r) => r.finishScore)
      const meanRank =
        party.reduce((acc, r) => acc + rankOf(r.finishScore, finishes), 0) / party.length
      const coop = moveCooperation(party.length, meanRank, source.tension, rngBreak)
      moveCounter += 1
      const gid = `mov-${moveCounter}`
      const ids = party.map((r) => r.riderId)
      for (const r of party) {
        const s = sims.get(r.riderId)
        if (!s) continue
        s.groupId = gid
        s.matches = Math.max(0, s.matches - 1)
        // Lanzar el ataque cuesta un cerillo entero; saltar a la rueda del que ataca cuesta menos
        // —se va al rebufo— y por eso seguir es más barato que irse, como en carretera (SPEC 6.6).
        const cost =
          r.riderId === instigator.riderId
            ? STAGE.tacticAttackCost
            : STAGE.tacticAttackCost * STAGE.tacticFollowCostFactor
        s.energy = Math.max(0, s.energy - cost)
        s.work += cost
        s.climbBoostBlocks = STAGE.matchBonusBlocks
      }
      source.riderIds = source.riderIds.filter((id) => !ids.includes(id))
      if (source.id === PELOTON) escapedSinceNotice += ids.length
      const g = createGroup(gid, ids, {
        tS: source.tS - gap,
        vActual: source.vActual,
        // Un puente va a tope: por eso a veces no llega y se queda en tierra de nadie (regla 7).
        compromiso: kind === 'puente' ? STAGE.tacticBridgeCommit : coop,
      })
      // Reglas 4 y 5: el pelotón decide si da cuerda. Los ataques que salen de un grupo YA escapado
      // no pasan por esa aduana: allí no hay pelotón que cierre.
      const allowed = source.id !== PELOTON || pelotonAllows(party, ctx, rngTactics)
      moves.push({
        g,
        kind,
        sourceId: source.id,
        bornKm: km,
        allowed,
        prospered: false,
        dayBreak: false,
        narrated: narrate,
        targetId: target?.id ?? null,
        bridgeUntilKm: kind === 'puente' ? km + STAGE.tacticBridgeKm : null,
        restCommit: coop,
        chaseLedger: new Map(),
        peakGapS: gap,
        peakGapKm: km,
      })
      log.emit(km, g.tS, 'intento', 'attack_go', names, {
        kind,
        saltan: party.length,
        tierra: stranded,
        cuerda: allowed ? 1 : 0,
        grupo: members.length,
        toGo: Math.round(kmToGo),
        narra: narrate ? 1 : 0,
      })
    }

    // ¿Qué se intenta desde el pelotón en este bloque? Uno solo, el que toca por contexto.
    {
      // Mientras el pelotón cierra un movimiento al que no ha dado cuerda va en fila india y nadie
      // salta: los intentos se encadenan, no se solapan. Es también lo que da a la carrera su
      // respiración —ataque, caza, tregua, ataque— en vez de un muro de intentos simultáneos.
      const closingNow = moves.length > 0 && !moves.some((m) => m.allowed)
      const head = frontMove()
      const headGap = head ? peloton.tS - head.g.tS : 0
      const bridgeable =
        head !== null &&
        headGap >= STAGE.bridgeGapMinSeconds &&
        headGap <= STAGE.bridgeGapMaxSeconds
      const finalPhase = (onClimb && raceThisClimb) || kmToGo <= STAGE.lateAttackKm
      const kind: MoveKind = finalPhase
        ? 'ataque_final'
        : !dayBreakFormed
          ? 'fuga'
          : bridgeable
            ? 'puente'
            : 'contraataque'
      if (!closingNow) attemptFrom(peloton, kind, bridgeable && head ? head.g : null)
    }
    // Y desde cada grupo escapado: se sigue atacando dentro de la fuga (regla 6) y se puentea al
    // grupo de delante si lo hay a tiro (regla 7).
    for (const m of [...moves]) {
      const size = membersOf(m.g.id).length
      if (size < STAGE.tacticInsideAttackMinRiders) continue
      let ahead: Move | null = null
      for (const o of moves) {
        if (o === m || o.g.tS >= m.g.tS) continue
        if (ahead === null || o.g.tS > ahead.g.tS) ahead = o
      }
      const gapAhead = ahead ? m.g.tS - ahead.g.tS : 0
      const bridgeable =
        ahead !== null &&
        gapAhead >= STAGE.bridgeGapMinSeconds &&
        gapAhead <= STAGE.bridgeGapMaxSeconds
      if (bridgeable && ahead) {
        attemptFrom(m.g, 'puente', ahead.g)
        continue
      }
      // Regla 6: dentro de una fuga se sigue atacando, pero NO en mitad de la etapa —ahí se
      // colabora para que la fuga viva—. Los ataques llegan cuando la meta está cerca y ya está
      // claro que la fuga se juega el día, o cuando la TENSIÓN ha roto el pacto (SPEC 6.10).
      const tense = m.g.tension >= STAGE.breakawayTensionThreshold
      if (kmToGo > STAGE.tacticInsideAttackKm && !tense) continue
      attemptFrom(m.g, 'ataque_grupo', null)
    }

    peloton = advance(peloton, membersOf(PELOTON), pelFrac, 'peloton')
    for (const m of moves) {
      m.g = advance(m.g, membersOf(m.g.id), moveFrac(m), 'move')
      // La TENSIÓN del grupo escapado (SPEC 6.10): se acumula km a km y, pasado el umbral, dispara
      // los ataques internos y recorta la cooperación. Existía en `Group` y nadie la tocaba nunca.
      m.g.tension += STAGE.breakawayTensionPerKm * STAGE.dx
      // Cúspide del boquete sobre QUIEN LE PERSIGUE (v11): es el punto desde el que se mide «se
      // cerraron N segundos en M km» cuando lo cacen. Contar desde que nació diría siempre lo
      // mismo (0 s) y contra el pelotón diría una barbaridad cuando la carrera ya está rota.
      const src = moves.find((o) => o.g.id === m.sourceId)
      const chaserTs = src && membersOf(src.g.id).length > 0 ? src.g.tS : peloton.tS
      const gapNow = chaserTs - m.g.tS
      if (gapNow > m.peakGapS) {
        m.peakGapS = gapNow
        m.peakGapKm = km
      }
    }
    for (let g = 0; g < shed.length; g++) {
      const adv = advance(shed[g]!, membersOf(shed[g]!.id), 1, 'shed')
      // Un descolgado del pelotón NUNCA rueda por delante de él: en carretera el grupo grande, a rueda,
      // siempre es más rápido que un suelto. Sin este tope, un "descolgado" con compromiso alto se
      // escapaba en FANTASMA (más rápido que el pelotón a tempo) y ganaba la etapa sin que la fuga ni la
      // crónica lo contaran. PERO el tope no aplica en la SUBIDA: allí un descolgado sí puede quedar por
      // delante de lo que reste del pelotón (que se ha estirado y va más lento en conjunto), y la
      // selección debe mantenerse. En el PAVÉ el tope sigue puesto aunque también seleccione: el que se
      // suelta en un sector pierde tiempo porque va más lento que los de delante, no porque se le
      // empuje; si sale más rápido, es un fantasma y hay que taparlo igual que en el llano.
      shed[g] = !onClimb && adv.tS < peloton.tS ? { ...adv, tS: peloton.tS } : adv
    }

    // Recorte y reagrupamiento de los descolgados. En terreno RODADOR (llano/descenso) cierran el
    // boquete con el pelotón a un ritmo (s/km) y, al entrar en rango, se reenganchan. En terreno
    // que ROMPE —subida y, desde la v12, adoquín— no hay recorte: allí manda la selección, que es
    // lo que hace una etapa de montaña y lo que hace una clásica de pavés. Pero los descolgados que
    // ruedan a la MISMA altura sí se funden en grupetos: si no, la reina terminaba con una mediana
    // de 30 grupos de un solo corredor (docs/motor.md §3-bis-e).
    if (shed.length > 0) {
      // LA PUERTA DEL PELOTÓN (v12). Cuánto se recorta —y con cuánto boquete se vuelve a entrar—
      // depende de a qué ritmo vaya el grupo del que se soltó: a tempo se vuelve, con los trenes
      // lanzados no. Ver `chaseBackShutFloor`: por debajo del tempo de carretera el factor vale 1 y
      // esto es EXACTAMENTE lo de siempre (el llano canónico y el valle de la reina no se mueven).
      const paceShut = Math.max(
        STAGE.chaseBackShutFloor,
        Math.min(1, (1 - peloton.compromiso) / (1 - STAGE.pelotonTempoCommit)),
      )
      const pelotonSize = membersOf(PELOTON).length
      /**
       * …y la puerta se abre de par en par para quien persigue con MUCHA más gente de la que va
       * delante: un autobús que TRIPLICA en número al grupo de cabeza (`chaseBackBusFactor`) se
       * releva mejor y acaba cazándolo en llano por lanzado que vaya. Es lo que devuelve al pelotón
       * entero cuando un puerto lejos de meta deja delante a diez corredores y detrás a setenta.
       */
      const shutFor = (size: number): number =>
        size >= STAGE.chaseBackBusFactor * pelotonSize ? 1 : paceShut
      if (!onRough) {
        for (const sg of shed) {
          const size = membersOf(sg.id).length
          if (size === 0) continue
          const close = STAGE.chaseBackSecondsPerKm * STAGE.dx * shutFor(size)
          const gap = sg.tS - peloton.tS
          if (gap > 0) sg.tS = Math.max(peloton.tS, sg.tS - close)
        }
      }
      // En terreno que rompe el umbral de fusión es más estrecho (y no hay reenganche al pelotón):
      // los que van juntos de verdad forman grupeto, los que están cortados de verdad siguen cortados.
      // La fusión ENTRE descolgados no pasa por la puerta del pelotón: que dos grupetos que ruedan a
      // la misma altura se junten no depende de lo que apriete un pelotón que va minutos por delante.
      const mergeGap = onRough ? STAGE.grupetoJoinGapSeconds : STAGE.regroupGapSeconds
      const stillDropped: Group[] = []
      for (const sg of [...shed].sort((a, b) => a.tS - b.tS)) {
        const mem = membersOf(sg.id)
        if (mem.length === 0) continue
        // ¿alcanza al pelotón? se reengancha (solo en terreno rodador, y solo si el pelotón deja).
        if (!onRough && gapSeconds(peloton, sg) <= STAGE.regroupGapSeconds * shutFor(mem.length)) {
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
    for (const m of moves) crashCheck(m.g)

    // Regla 7: **y a veces no se llega**. Nadie sostiene el esfuerzo de un puente indefinidamente;
    // pasados sus kilómetros, el que saltó baja el ritmo al de un grupo cualquiera y se queda en
    // TIERRA DE NADIE —ni con los de delante ni con los de atrás—, que es un resultado legítimo.
    for (const m of moves) {
      if (m.bridgeUntilKm === null || km <= m.bridgeUntilKm) continue
      m.bridgeUntilKm = null
      m.targetId = null
      m.g.compromiso = m.restCommit
      log.emit(km, m.g.tS, 'puente_fallido', 'bridge_failed', m.g.riderIds.slice(0, 3), {
        toGo: Math.round(totalKm - km),
        narra: m.narrated ? 1 : 0,
      })
    }

    // --- Resolución de los movimientos (docs/motor.md §13, SPEC 6.3) ----------------------
    // Todo lo que le puede pasar a un grupo escapado: que otro le alcance (un puente que llega),
    // que el pelotón le coma, y —si aguanta— que deje de ser un intento y pase a ser la fuga del
    // día. No hay lógica nueva de boquetes: son los relojes de `group.ts` juntándose o separándose.
    if (moves.length > 0) {
      moves.sort((a, b) => a.g.tS - b.g.tS)
      // 1. Fusiones entre movimientos: el puente que engancha, el contraataque que da caza.
      for (let a = 0; a < moves.length - 1; a++) {
        const front = moves[a]!
        const back = moves[a + 1]!
        const backMembers = membersOf(back.g.id)
        if (backMembers.length === 0 || membersOf(front.g.id).length === 0) continue
        if (back.g.tS - front.g.tS > STAGE.captureGapSeconds) continue
        const joined = backMembers.map((m) => m.input.riderId)
        for (const m of backMembers) m.groupId = front.g.id
        front.g.riderIds = [...front.g.riderIds, ...joined]
        front.g.tension = (front.g.tension + back.g.tension) / 2
        back.g.riderIds = []
        if (back.dayBreak) {
          front.dayBreak = true
          back.dayBreak = false
        }
        // Tres cosas distintas se ven igual desde fuera —dos relojes que se juntan— y hay que
        // contarlas distinto: el puente que ENGANCHA, el ataque que el propio grupo REABSORBE, y
        // dos grupos que simplemente se encuentran en carretera.
        const bridged = back.kind === 'puente' && back.targetId === front.g.id
        const reeled = front.sourceId === back.g.id && !front.prospered
        if (reeled) {
          const attackers = membersOf(front.g.id)
            .map((x) => x.input.riderId)
            .filter((id) => !joined.includes(id))
          const narra = front.narrated && km - front.bornKm >= STAGE.tacticReeledNarrateKm
          log.emit(km, front.g.tS, 'intento_fallido', 'attack_reeled', attackers.slice(0, 3), {
            kind: front.kind,
            km: Math.max(1, Math.round(km - front.bornKm)),
            // Solo se cuenta cómo acaba lo que se contó cómo empezaba, y solo si duró algo.
            narra: narra ? 1 : 0,
          })
          // …y con ella, quién lo cerró. Solo de lo que se ha narrado: el epitafio de un intento
          // que no se contó tampoco necesita autor.
          if (narra) attributeChase(front, km, front.g.tS)
        } else {
          log.emit(
            km,
            front.g.tS,
            'enlace',
            bridged ? 'bridge_made' : 'move_merge',
            joined.slice(0, 3),
            {
              size: membersOf(front.g.id).length,
              toGo: Math.round(totalKm - km),
              // Dos relojes que se juntan son noticia si de verdad cambia la carrera: el puente que
              // engancha siempre, y una fusión solo si trae compañía.
              narra: bridged || joined.length >= STAGE.tacticMergeNarrateRiders ? 1 : 0,
            },
          )
        }
        // El grupo resultante hereda la memoria táctica del que iba delante, salvo el origen: ya no
        // persigue a nadie.
        front.targetId = bridged ? null : front.targetId
        // …y también la cuenta de quién le persigue (v11). Se toma el MÁXIMO corredor a corredor,
        // no la suma: los dos movimientos iban por delante del mismo pelotón a la vez, así que el
        // mismo relevo cuenta una vez, no dos. Se hace DESPUÉS de narrar, para que el epitafio del
        // ataque reabsorbido hable de quien le cerró a él y no de quien perseguía al otro grupo.
        for (const [id, w] of back.chaseLedger) {
          front.chaseLedger.set(id, Math.max(front.chaseLedger.get(id) ?? 0, w))
        }
        if (back.peakGapS > front.peakGapS) {
          front.peakGapS = back.peakGapS
          front.peakGapKm = back.peakGapKm
        }
      }
      // 2. ¿Ha cuajado? ¿Le ha cazado el pelotón?
      for (const m of moves) {
        const mem = membersOf(m.g.id)
        if (mem.length === 0) continue
        const gap = peloton.tS - m.g.tS
        // Un intento prospera cuando abre hueco sobre el grupo DEL QUE SALIÓ. Medirlo contra el
        // pelotón daría por cuajado cualquier ataque dentro de una fuga que ya lleva dos minutos.
        const source = moves.find((o) => o.g.id === m.sourceId)
        const sourceTs = source && membersOf(source.g.id).length > 0 ? source.g.tS : peloton.tS
        const gapOverSource = sourceTs - m.g.tS
        const ids = mem.map((x) => x.input.riderId)
        if (!m.prospered && gapOverSource >= STAGE.tacticBreakGapSeconds) {
          m.prospered = true
          // Regla 5: la fuga del día es **el primero que prospera tras varios fracasos**. Solo
          // dentro de la ventana: un movimiento que cuaja a falta de 40 km es un ataque tardío, y
          // la crónica no puede llamarlo igual.
          if (
            !dayBreakFormed &&
            m.kind !== 'puente' &&
            m.sourceId === PELOTON &&
            km <= totalKm * STAGE.tacticBreakWindowFraction
          ) {
            dayBreakFormed = true
            m.dayBreak = true
            dayBreakRiders = ids
            // La fuga se fecha en el km en que SALIÓ, no en el que se confirma que ha cuajado: en
            // carretera el movimiento nace cuando alguien ataca y solo después se ve si vive. Sin
            // esto la crónica decía «quedan 8 delante» en el km 1 y «se forma la fuga» en el 55.
            breakFormedKm = Math.round(m.bornKm)
            log.emit(m.bornKm, m.g.tS, 'fuga_formada', 'breakaway_formed', ids)
            // Con un compromiso alto la fuga va a bloque; con uno bajo se miran y no avanzan.
            log.emit(m.bornKm, m.g.tS, 'colaboracion', 'break_cooperation', ids, {
              cooperating: m.g.compromiso >= STAGE.breakCoopThreshold ? 1 : 0,
            })
            lastFrontSize = ids.length
            frontAtLastNotice = membersOf(PELOTON).length
          } else if (km - m.bornKm <= STAGE.tacticStickWindowKm) {
            // Solo se cuenta como «el ataque cuaja» lo que cuaja PRONTO. Un grupo que lleva 80 km
            // en carretera y que de pronto supera el umbral porque el grupo del que salió ya no
            // existe no ha atacado nada: lleva media etapa fugado.
            log.emit(km, m.g.tS, 'ataque', 'attack_sticks', ids.slice(0, 3), {
              kind: m.kind,
              size: ids.length,
              // La ventaja que se cuenta es la que ha sacado AL GRUPO DEL QUE SALIÓ, que es de lo
              // que habla la frase. Contar la del pelotón cuando la carrera ya está rota decía
              // «5:52» de un corredor que llevaba 23 s a sus perseguidores directos.
              gapS: Math.round(gapOverSource),
              toGo: Math.round(totalKm - km),
              narra: claimAttackNotice(STAGE.tacticStickNarrateKmGap) ? 1 : 0,
            })
          }
        }
        if (gap <= STAGE.captureGapSeconds) {
          for (const x of mem) x.groupId = PELOTON
          peloton = {
            ...peloton,
            riderIds: [...peloton.riderIds, ...ids],
            tS: Math.min(peloton.tS, m.g.tS),
          }
          m.g.riderIds = []
          if (!m.dayBreak) {
            // Regla 4: **muchos intentos fracasan, sin más**. Un movimiento que nunca llegó a
            // cuajar se narra como el intento que fue; uno que sí cuajó, como un movimiento cazado.
            const narra =
              m.prospered || (m.narrated && km - m.bornKm >= STAGE.tacticReeledNarrateKm)
            log.emit(
              km,
              peloton.tS,
              m.prospered ? 'movimiento_cazado' : 'intento_fallido',
              m.prospered ? 'move_caught' : 'attack_reeled',
              ids.slice(0, 3),
              {
                kind: m.kind,
                km: Math.max(1, Math.round(km - m.bornKm)),
                narra: narra ? 1 : 0,
              },
            )
            if (narra) attributeChase(m, km, peloton.tS)
          }
        }
      }
      // 3. La fuga del día está CAZADA cuando ninguno de los que la formaron sigue por delante. No
      //    basta con que se disuelva el grupo original: si uno de ellos se ha ido en un ataque
      //    posterior, la fuga sigue viva en carretera y decir lo contrario sería falso.
      if (dayBreakFormed && !caught) {
        const stillAway = dayBreakRiders.some((id) => {
          const s = sims.get(id)
          return (
            s != null &&
            s.finishTs === null &&
            s.abandonedKm === null &&
            moves.some((mv) => mv.g.id === s.groupId)
          )
        })
        if (!stillAway) {
          caught = true
          log.emit(km, peloton.tS, 'fuga_cazada', 'breakaway_caught', dayBreakRiders)
          // «No sé quién hizo el trabajo para reducir la distancia»: aquí se dice. El movimiento
          // que lleva la marca de fuga del día es el que guarda la cuenta de su persecución (las
          // fusiones se la traspasan), así que la respuesta sale de su libro y no de la etapa.
          const dayMove = moves.find((mv) => mv.dayBreak)
          if (dayMove) attributeChase(dayMove, km, peloton.tS)
        }
      }
      for (let a = moves.length - 1; a >= 0; a--) {
        if (membersOf(moves[a]!.g.id).length === 0) moves.splice(a, 1)
      }
    }

    // Disputa de banners (SPEC 6.11).
    if (block.banner === 'meta_volante') {
      // Meta volante: solo el grupo de cabeza esprinta por los puntos.
      const head = frontMove()
      const frontIsMove = head !== null && head.g.tS <= peloton.tS
      const front = frontIsMove ? membersOf(head.g.id) : membersOf(PELOTON)
      const frontTs = frontIsMove ? head.g.tS : peloton.tS
      disputeBanner(front, block, km, frontTs, log, rngSprint)
    } else if (block.banner === 'cima') {
      // Cima: puntúan los primeros en coronar en TODO el pelotón, no solo el grupo de cabeza, así
      // la clasificación de la montaña reparte entre varios escaladores (SPEC 6.11).
      const groups = [peloton, ...moves.map((m) => m.g), ...shed]
        .map((g) => ({ tS: g.tS, members: membersOf(g.id) }))
        .filter((g) => g.members.length > 0)
        .sort((a, b) => a.tS - b.tS)
      disputeClimb(groups, block, km, log, rngSprint)
    }
  }

  // --- Meta y resultados (SPEC 6.12, 6.15) -----------------------------------------------
  const allGroups: Group[] = [peloton, ...moves.map((m) => m.g), ...shed]
  const moveGroupIds = new Set(moves.map((m) => m.g.id))
  finishStage(sims, allGroups, log, rngSprint, totalKm, finishTerrain, leadOutFor, moveGroupIds)

  /**
   * FUERA DE CONTROL (docs/motor.md §VI.3, la causa de más peso). Se aplica AQUÍ y no en carretera
   * por una razón que no es de comodidad: el corte se mide contra el tiempo del GANADOR, y ese dato
   * no existe hasta que alguien cruza la meta.
   *
   * En CONTRARRELOJ no se aplica, y no por olvido: `simulateStage` desvía la crono a
   * `simulateTimeTrial` antes de llegar aquí. El reglamento real sí corta en las cronos, pero medido
   * sobre una
   * gran vuelta de 176 corredores el motor reparte en una crono de 20 km un abanico del 15 % de
   * mediana y del 36 % en la cola (docs/balance.md, «v14»): con el corte puesto, la etapa 1 se
   * llevaría por delante a 150 corredores. Ese abanico es un defecto ABIERTO del modelo de crono
   * —no de esta tanda— y hasta que se cierre, cortar en crono sería castigar a la carrera por un
   * error del motor. Queda anotado en docs/balance.md como pendiente.
   */
  // (La contrarreloj no llega aquí: `simulateStage` la desvía a `simulateTimeTrial` en la 1.ª línea.)
  const outOfTime = applyStageTimeCut(sims, blocks, abandonBudget - abandoned.length, totalKm, log)

  const results = buildResults(sims, abandoned, outOfTime)
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

/**
 * Aplica el CORTE DE TIEMPO a los que han llegado (docs/motor.md §VI.3) y devuelve quién queda
 * FUERA DE CONTROL. Tres decisiones, las tres de la especificación:
 *
 * 1. **El corte se mide contra el GRUPO, no contra el corredor suelto.** Los que comparten tiempo de
 *    meta llegaron juntos y caen o se salvan juntos. Esta es la salvaguarda que hacía imposible
 *    implementar el corte antes del reagrupamiento: cuando la montaña producía treinta grupos de un
 *    corredor, un corte por corredor era un corte por sorteo.
 * 2. **El límite lo fija la dureza del recorrido**: 8 % en llana, hasta 18 % en la reina.
 * 3. **El tope del 4 %** decide cuántos se eliminan de verdad; el resto se READMITE con la
 *    penalización del reglamento: pierde los puntos de la clasificación por puntos de esa etapa.
 */
function applyStageTimeCut(
  sims: Map<string, RiderSim>,
  blocks: readonly Block[],
  budget: number,
  totalKm: number,
  log: EventLog,
): Set<string> {
  const out = new Set<string>()
  const finishers = [...sims.values()].filter((s) => s.finishTs !== null)
  if (finishers.length === 0) return out
  const winnerTs = Math.min(...finishers.map((s) => s.finishTs!))
  const fraction = timeCutFraction(elevationGainPerKm(blocks))
  const limitS = winnerTs * (1 + fraction)
  // Los grupos de meta son los corredores que comparten TIEMPO: es como el motor asigna el reloj
  // (uno por grupo, redondeado una sola vez) y por tanto la definición operativa de «llegar juntos».
  const byTime = new Map<number, RiderSim[]>()
  for (const s of finishers) {
    const list = byTime.get(s.finishTs!) ?? []
    list.push(s)
    byTime.set(s.finishTs!, list)
  }
  const times = [...byTime.keys()].sort((a, b) => a - b)
  const groups = times.map((t) => ({ size: byTime.get(t)!.length, timeS: t }))
  const outcome = applyTimeCut(groups, limitS, budget)
  if (outcome.eliminated.length === 0 && outcome.readmitted.length === 0) return out

  const idsOf = (indexes: readonly number[]): RiderSim[] =>
    indexes.flatMap((i) => byTime.get(times[i]!)!)
  const gone = idsOf(outcome.eliminated)
  for (const s of gone) out.add(s.input.riderId)
  if (gone.length > 0) {
    log.emit(
      totalKm,
      gone[0]!.finishTs!,
      'fuera_control',
      'time_cut',
      [...gone.slice(0, 3).map((s) => s.input.riderId)],
      {
        count: gone.length,
        limitPct: Math.round(1000 * fraction) / 10,
        gapS: Math.round(gone[0]!.finishTs! - winnerTs),
      },
    )
  }
  const back = idsOf(outcome.readmitted)
  if (back.length > 0) {
    // La penalización real del jurado: readmitidos, pero sin los puntos de la clasificación por
    // puntos de la etapa. No se les quita el tiempo ni el puesto: siguen en carrera.
    for (const s of back) s.sprintPts = 0
    log.emit(
      totalKm,
      back[0]!.finishTs!,
      'readmision',
      'time_cut_readmitted',
      [...back.slice(0, 3).map((s) => s.input.riderId)],
      {
        count: back.length,
        limitPct: Math.round(1000 * fraction) / 10,
        gapS: Math.round(back[back.length - 1]!.finishTs! - winnerTs),
      },
    )
  }
  return out
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
    //
    // El liderato se mide EN SOLITARIO y contra los DEMÁS (v13, defecto B5). Con `>= maxPts` —donde
    // `maxPts` incluía al propio ganador— tres corredores distintos con UN punto cada uno se
    // proclamaban líderes de la montaña uno detrás de otro en la misma carrera: con un punto cada
    // uno, el tercero no lidera nada. Ahora hay que estar ESTRICTAMENTE por delante de todos.
    const bestOther = ordered.reduce((mx, m) => (m === winner ? mx : Math.max(mx, m.climbPts)), 0)
    log.emit(km, groups[0]?.tS ?? 0, 'banner', 'climb_kom', [winner.input.riderId], {
      category: block.climbCategory ?? '',
      points: table[0] ?? 0,
      leads: winner.climbPts > bestOther ? 1 : 0,
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
  /** Ids de los grupos que llegan ESCAPADOS por delante del pelotón (docs/motor.md §13). */
  moveGroupIds: Set<string>,
): void {
  const withMembers = groups
    .map((group) => ({
      group,
      // El que se bajó de la bici no llega a meta: no entra en ningún grupo de llegada (v14).
      members: [...sims.values()].filter((s) => s.groupId === group.id && s.abandonedKm === null),
    }))
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
        // ¿Se ganó DESDE LA CARRETERA? El ganador llegó en un grupo escapado, no con el pelotón.
        // Es el estadístico que mide de verdad «gana la fuga»: el anterior —estar en la lista del
        // evento `fuga_formada`— dejaba fuera al que llegó a la fuga por un puente y al que se fue
        // en un ataque posterior, que con capa táctica son la mitad de los casos.
        fuga: moveGroupIds.has(group.id) ? 1 : 0,
        // Qué clase de final resolvió la etapa: dato de telemetría (docs/motor.md §12 y §16). La
        // crónica no lo necesita todavía, pero es lo que permite comprobar desde fuera que un
        // repecho de 200 m no ha convertido una llana en llegada de escaladores.
        finish: type,
      })
    }
  })
}

/**
 * Ordena a todos por tiempo, asigna puestos y bonificaciones (SPEC 6.15), y añade detrás a los que
 * NO figuran en la clasificación (v14, docs/motor.md §VI.3):
 *
 * - `abandon`: se bajó de la bici en carretera. Sin tiempo ni puesto (`puesto: 0`), que es lo que
 *   dice una hoja de resultados de un abandono.
 * - `dnf`: llegó FUERA DE CONTROL. Conserva el tiempo con que cruzó —cruzó de verdad— pero queda
 *   sin puesto y sin bonificación, y `packages/db` lo saca del resto de la carrera.
 *
 * Los no clasificados van al final del array a propósito: quien lo consume por índice (los puntos
 * de temporada, la clasificación por equipos) sigue viendo primero el orden real de la etapa, y
 * quien mire `estado` sabe que ahí abajo no hay clasificación que repartir.
 */
function buildResults(
  sims: Map<string, RiderSim>,
  abandoned: readonly RiderSim[],
  outOfTime: ReadonlySet<string>,
): StageResult[] {
  const finishers = [...sims.values()]
    .filter((s) => s.finishTs !== null && s.abandonedKm === null && !outOfTime.has(s.input.riderId))
    // Por tiempo y, a igualdad de tiempo (que es lo NORMAL dentro de un grupo), por el orden de
    // llegada que resolvió el remate. El puesto lo decide el juez de llegada, no el cronómetro.
    .sort((a, b) => a.finishTs! - b.finishTs! || a.finishOrder - b.finishOrder)
  finishers.forEach((s, idx) => {
    s.bonusS = STAGE.timeBonuses[idx] ?? 0
    // La meta de etapa reparte puntos de regularidad (SPEC 6.11): la fuente principal de la
    // clasificación por puntos, no solo las metas volantes intermedias.
    s.sprintPts += STAGE.finishPoints[idx] ?? 0
  })
  const classified: StageResult[] = finishers.map((s, idx) => ({
    riderId: s.input.riderId,
    puesto: idx + 1,
    // Ya es entero: se redondeó una vez, en el reloj del grupo.
    tiempoS: s.finishTs!,
    bonificacionS: s.bonusS,
    puntosVolante: s.sprintPts,
    puntosMontana: s.climbPts,
    estado: 'finish' as const,
  }))
  // Los no clasificados, en orden estable: primero los que se retiraron (por km de retirada) y
  // luego los que llegaron fuera de control (por tiempo). El desempate por id cierra el orden.
  const byId = (a: RiderSim, b: RiderSim): number =>
    a.input.riderId < b.input.riderId ? -1 : a.input.riderId > b.input.riderId ? 1 : 0
  const retired: StageResult[] = [...abandoned]
    .sort((a, b) => a.abandonedKm! - b.abandonedKm! || byId(a, b))
    .map((s) => ({
      riderId: s.input.riderId,
      puesto: 0,
      tiempoS: 0,
      bonificacionS: 0,
      puntosVolante: 0,
      puntosMontana: 0,
      estado: 'abandon' as const,
    }))
  const cut: StageResult[] = [...sims.values()]
    .filter((s) => outOfTime.has(s.input.riderId))
    .sort((a, b) => a.finishTs! - b.finishTs! || byId(a, b))
    .map((s) => ({
      riderId: s.input.riderId,
      puesto: 0,
      tiempoS: s.finishTs!,
      bonificacionS: 0,
      puntosVolante: 0,
      puntosMontana: 0,
      estado: 'dnf' as const,
    }))
  return [...classified, ...retired, ...cut]
}
