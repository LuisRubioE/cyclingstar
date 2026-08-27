/**
 * Simulación de una etapa completa, bloque a bloque (SPEC 6.16).
 * - Paso 24: etapa llana de principio a fin (fuga 6.10, controlador 6.9, banners 6.11, sprint 6.12).
 * - Paso 26: montaña: descuelgue en los puertos (6.8), muros con COL (6.4), cimas puntuables y
 *   finales en alto donde la ley de velocidad integra las diferencias sola.
 * Puro y determinista: todo el azar entra por los subflujos nominales del RNG (6.1).
 */
import { clamp, normal, type Rng } from '../random.js'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import {
  applyTimeCut,
  collapseLambda,
  elevationGainPerKm,
  shouldCollapse,
  timeCutFraction,
} from './abandon.js'
import { chaseField, chaseForce, isFinisher, lerp } from './chase.js'
import { EventLog, announceRebels } from './events.js'
import {
  type Group,
  advanceGroup,
  chaseReferenceIndex,
  createGroup,
  gapSeconds,
  mainGroupId,
  percentile75,
} from './group.js'
import {
  blockCost,
  bonkPenalty,
  blockPerfil,
  blockSeconds,
  droppedCommit,
  effNow,
  erosion,
  idleEffort,
  relayRotation,
  rhythm,
  riderEffort,
  shelterOf,
  tankState,
  targetSpeed,
} from './physics.js'
import { rollHazard } from './hazard.js'
import {
  type CrashOutcome,
  crashPile,
  rollCrash,
  rollCrashSeverity,
  rollCrashSeverityLight,
} from './crash.js'
import {
  type FinishTerrain,
  type FinishType,
  admitsBunchFinish,
  deriveFinishTerrain,
  finishScore,
  finishType,
  isSprintFinish,
  isUphillFinish,
  placementSd,
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
  carriesGcLeader,
  moveCooperation,
  noChanceToWin,
  pelotonAllows,
  rankOf,
  rollMoveAttempt,
  sustainsJump,
} from './tactics.js'
import {
  type TeamPlan,
  type TeamSituation,
  type TeamStance,
  buildTeamPlans,
  frontClaim,
  teamAttackFactor,
  teamDrive,
  teamStance,
} from './teamPlan.js'
import { sampleProfile, stageLengthKm } from './sample.js'
import { stageRng } from './rng.js'
import { simulateTimeTrial } from './timetrial.js'
import type {
  Block,
  Incident,
  SnapshotRider,
  StageInput,
  StageOutput,
  StageProbe,
  StageResult,
  StageRider,
  TankState,
} from './types.js'

const PELOTON = 'peloton'

/**
 * QUÉ CLASE DE GRUPO ES CADA UNO, para ordenar la carretera y para saber contra quién se mide el
 * boquete (v27). El orden es el de la carretera —delante los movimientos, luego el pelotón y al
 * final los descolgados— y desempata a igualdad de reloj (ver `liveGroups`); y la CLASE es lo que
 * permite no medir nunca la ventaja contra un grupeto, que es la causa madre de esta tanda.
 */
const MOVE_RANK = 0
const PELOTON_RANK = 1
const SHED_RANK = 2

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
  /**
   * …y el RELOJ que tenía el grupo al nacer (v25). `breakaway_formed` se fecha en el km en que la
   * fuga SALIÓ pero se emitía con el `tS` del km en que se confirma que ha cuajado, que es otro
   * momento de la tarde. Como la crónica ordena por km y, dentro del km, por reloj (v21), el
   * resumen se colaba DELANTE del suceso: en Race Jaén, «ya solo quedan dos delante» (tS 77) se
   * leía antes de «saltan del pelotón» (tS 341), los dos en el km 1.
   */
  bornTs: number
  /** Reglas 4-5: el pelotón le ha dado cuerda. Si no, lo cierra a `tacticControlCommit`. */
  allowed: boolean
  /** Ha superado `tacticBreakGapSeconds`: el intento ha PROSPERADO. */
  prospered: boolean
  /** Es la fuga del día (la primera que cuaja dentro de la ventana). */
  dayBreak: boolean
  /** ¿Se narró el intento? Si no se contó cómo salió, tampoco se cuenta cómo acabó. */
  narrated: boolean
  /**
   * …y ¿se ha contado ya cómo acabó? (v25). Un movimiento puede desaparecer de tres maneras: le
   * cazan, se funde con otro, o se queda SIN GENTE porque sus corredores se van descolgando uno a
   * uno. Las dos primeras tenían evento; la tercera dejaba un ataque narrado sin desenlace y el
   * lector con un corredor «que se fue» y del que nunca más se supo.
   */
  closed: boolean
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
  /**
   * Los que iban en él la última vez que tuvo a alguien. Un grupo que se queda sin gente ya no
   * puede decir quién era, y el epitafio necesita nombres (v25).
   */
  lastIds: string[]
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
   * LA DERIVA (v26): segundos que lleva perdidos contra el frente de su grupo SIN haberse soltado
   * todavía. Es el estado que el motor no tenía y por el que un corredor solo podía estar en dos
   * sitios —clavado al ritmo del grupo o teletransportado atrás—: ahora la goma se estira.
   *
   * Se integra bloque a bloque con la MISMA ley de velocidad que mueve al grupo (SPEC 6.4), se
   * recupera si el corredor vuelve a poder con el ritmo, y al pasar de `driftDropGapSeconds` deja de
   * ir en el grupo y se convierte en su propio reloj —con esos segundos YA perdidos encima
   * (`dropOut(m, group, driftS)`), que es exactamente lo que el dado no sabía hacer—.
   *
   * Y si llega a meta sin haberse soltado, esos segundos son tiempo cedido DE VERDAD en carretera y
   * separan su tiempo del de su grupo, igual que `markLossS`. De ahí sale la llegada continua de un
   * final en alto —el ganador, y detrás a 4, a 9, a 17 s— en vez del escalón de la foto de grupo.
   */
  driftS: number
  /**
   * LA RESERVA (v26): segundos de deriva que todavía puede ABSORBER apretando los dientes, antes de
   * empezar a ceder de verdad. Es W′ —la capacidad de trabajo supraumbral del modelo de potencia
   * crítica— medida en la unidad en la que aquí se gasta (ver `STAGE.reserveSeconds`).
   *
   * Mientras quede, el corredor va CLAVADO al ritmo del grupo aunque su nivel no llegue: eso es lo
   * que hace que un final en alto deje llegar juntos a un grupo y no a un hombre. Cuando se acaba,
   * la deriva empieza a contar Y el corredor pierde además los `dropDeficitTolerance` puntos que la
   * reserva le estaba pagando: es el hundimiento. Se recupera rodando por debajo del ritmo
   * (`reserveRecoverySeconds`), que es lo que hace el valle entre dos puertos.
   */
  reserveS: number
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
   * EL CORREDOR EN APUROS (v20, docs/motor.md §VI.3): arrastra una caída SERIA de esta etapa. Son
   * `minor` y `major`, exactamente las severidades que `injuryEndsRace` ya sacaba de la carrera —el
   * 10 % de las caídas—, así que no es una categoría nueva sino la que ya existía leída dentro de la
   * etapa. Un corredor tocado **no se engancha a un grupeto** (ver `dropOut`) y abre la segunda vía
   * del colapso: solo, lejos de meta y ya fuera del corte, se baja de la bici.
   */
  hurt: boolean
  /**
   * EL KM DEL ÚLTIMO PERCANCE, sea de la gravedad que sea (v37). `hurt` solo marca las caídas SERIAS
   * —el 10 % de ellas, que cuestan 60-300 s—, y para decidir si el equipo baja a por su favorito
   * hace falta también la otra clase de percance: el susto o los rasguños, que cuestan 30-90 s y son
   * el 90 % de las caídas. Ésos son los que dejan al hombre a una distancia que todavía se puede
   * cerrar, que es justo la condición que puso el dueño («salvo que sea un pinchazo/caída y la
   * distancia sea pequeña»). El PINCHAZO y la avería mecánica no existen todavía en el motor y
   * quedan anotados en docs/balance.md: cuando existan, marcan aquí y esta regla los ve sola.
   */
  mishapKm: number | null
  /**
   * Se BAJÓ DE LA BICI en carretera: no llega a meta (`estado: 'abandon'`). Guarda el km para la
   * crónica; `null` mientras siga en carrera.
   */
  abandonedKm: number | null
  incident: Incident | null
  /**
   * ¿TIRA ESTE HOMBRE EN ESTE BLOQUE? (v28, binario desde la v34), para la foto de `StageProbe`. Lo
   * decide `advance()` en cada bloque y hasta la v28 se consumía en el sitio: fuera solo salía el
   * trabajo acumulado del día. Eran DOS banderas —el turno y, dentro de él, quién daba la cara al
   * viento— y desde la v34 es una sola, porque el motor ya no distingue esos dos estados.
   *
   * Es OBSERVACIÓN y nada más: solo se escribe cuando alguien ha pedido una foto (`probe`), no la
   * lee ninguna ley física y su valor no entra en ninguna decisión de carrera.
   */
  pulling: boolean
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
  // …y el castigo de la pájara entra por una RAMPA sobre el último tramo del depósito (v38), no por
  // el interruptor de `isBonked` —que se queda para lo que sí es un suceso: narrarla—.
  return effNow(sim.input.eff0, e, bonkPenalty(sim.energy, sim.energy0))
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
  /**
   * …Y EL CERILLO VALE TAMBIÉN EN LLANO (v39). Estaba excluido —`block.tipo !== 'llano'`— con la
   * idea de que el llano «no selecciona», y eso confunde dos cosas: que el llano no DESCUELGUE a
   * nadie por sí solo no significa que ahí no se pueda apretar. Un ataque en llano existe, cuesta
   * un cerillo igual, y lo que tiene que pasar es que compre POCO, no que compre nada. Y eso ya lo
   * dice la física sin ayuda: con `loadExponent` 0,39 en llano contra 1,0 subiendo, los mismos diez
   * puntos de perfil valen 0,4 s/km en el llano y 28 s/km en una rampa al 9 %. Prohibirlo a mano
   * era decir dos veces lo mismo, y mal: dejaba al que ataca en el llano sin nada que gastar.
   */
  if (sim.climbBoostBlocks > 0) perfil += STAGE.matchBonus
  return perfil
}

/**
 * Cuánto SELECCIONA el terreno de un bloque (v12, docs/motor.md §14). 0 = no selecciona: el llano
 * no descuelga a nadie, y una bajada que en realidad es relieve menudo, tampoco.
 *
 * El PUERTO DECISIVO vale 1 por definición —es la referencia con la que se calibró
 * `lambdaDropBase`—, así que la etapa reina canónica sigue exactamente igual que siempre: sus
 * únicos kilómetros de subida son los últimos quince.
 *
 * UN PUERTO DE TEMPO NO ES UN PUERTO DECISIVO (v16). Lejos de meta el pelotón sube a tempo, y el
 * motor ya lo sabía en la VELOCIDAD (`climbTempoFraction`: más corredores marcan el ritmo, el P75
 * baja) pero no en la SELECCIÓN: el descuelgue se sorteaba con la misma intensidad subiera el grupo
 * a 0,85 o a 0,40. Con un campo real de 176 corredores —donde el mejor escalador es un MON 85 y el
 * peor un MON 45— eso reventaba el pelotón en CADA cota: medido en Race Great Ocean, el pelotón
 * pasaba de 173 a 6 corredores en una rampa a 100 km de meta. Mientras el recorte fijo devolvía a
 * todo el mundo daba lo mismo; con el modelo de persecución arreglado, esos descolgados de mentira
 * llegaban a 20 minutos. Es la misma frase que el comentario de `onClimb` lleva escrita desde la
 * v11 —«así el pelotón no se destroza en cada cota y las diferencias las marca el último puerto,
 * como en la realidad»— aplicada donde faltaba.
 */
function selectionFactor(block: Block): number {
  switch (block.tipo) {
    case 'subida':
      // LA SUBIDA YA NO PASA POR AQUÍ (v26): su descuelgue es deriva, no dado, y la deriva se integra
      // con la ley de velocidad sin escalar por ninguna perilla. Lo que `climbTempoSelection` = 0,3
      // hacía —que una cota de tempo lejos de meta no descuajaringase el pelotón— lo hace ahora la
      // RESERVA, y lo hace mejor porque es física y no un número elegido: en una cota que se sube a
      // tempo el déficit contra el P75 es pequeño (`climbTempoFraction` baja el ritmo que se marca),
      // la reserva lo absorbe entero y el valle siguiente la recarga. La constante queda retirada.
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
  const first = topP75(members, block, fraction)
  if (block.tipo !== 'subida') return first
  const head = paceSetters(members, block, first)
  return head.length === 0 ? first : topP75(head, block, fraction)
}

/** El P75 del perfil de la fracción más fuerte de un grupo: la cuenta de siempre (SPEC 6.4). */
function topP75(members: RiderSim[], block: Block, fraction: number): number {
  if (members.length === 0) return 0
  const perfils = members.map((m) => riderPerfil(m, block)).sort((a, b) => b - a)
  const k = Math.max(1, Math.ceil(fraction * perfils.length))
  return percentile75(perfils.slice(0, k))
}

/**
 * QUIÉNES MARCAN EL RITMO DE VERDAD (v26): en una subida, los que van pegados al frente del grupo y
 * no los que ya se están descolgando de él.
 *
 * Sin esto, la deriva tenía un efecto colateral MEDIDO y grave: como el que cede metros sigue
 * contando como miembro del grupo, el grupo dejaba de encoger, y `climbPaceFraction` es una
 * FRACCIÓN —el 12 % de 60 son 8 hombres, el 12 % de 7 es uno—. Con el grupo entero el ritmo lo
 * marcaba el 3.º y no el 1.º, el pelotón subía más despacio y la fuga pasaba a ganar el **65,4 %** de
 * las reinas contra una banda del 25-45 %.
 *
 * Y la corrección no es un parche, es lo que pasa en la carretera: el que va estirado en la cola de
 * un grupo por una rampa no está dando relevos ahí delante. Al restarlos, el ratchet de siempre
 * vuelve —el grupo de cabeza encoge, el ritmo sube, se estira otro— pero ahora lo frena la reserva
 * en vez de un dado, que es de lo que va toda la tanda.
 */
function paceSetters(members: RiderSim[], block: Block, pace: number): RiderSim[] {
  return members.filter(
    (m) => m.driftS <= 0 && riderPerfil(m, block) + STAGE.dropDeficitTolerance >= pace,
  )
}

/**
 * Deber de relevo de un corredor (SPEC 6.5, 6.18): cuánto le "toca" dar la cara al viento ahora.
 * Manda el ROL (el gregario tira, el líder y el sprinter ahorran), la FRESCURA restante corrige
 * (quien va vaciado ya no puede relevar) y, si lleva gregarios propios en el grupo, sale del turno
 * porque su equipo trabaja por él. Un jitter fijo por corredor y etapa rompe empates.
 * Deliberadamente NO interviene la posición en el array de entrada.
 */
function relayDuty(
  m: RiderSim,
  protectedByTeam: boolean,
  teamDriveNow: number,
  sittingOn: boolean,
): number {
  const duty = STAGE.relayDutyByRole[m.input.orders.role]
  const freshness = m.energy0 > 0 ? Math.max(0, Math.min(1, m.energy / m.energy0)) : 0
  return (
    duty +
    STAGE.relayFreshnessWeight * freshness -
    (protectedByTeam ? STAGE.relayProtectedPenalty : 0) -
    // Su equipo persigue esta fuga por detrás: no colabora en ella (v33).
    (sittingOn ? STAGE.relaySittingOnPenalty : 0) +
    // EL PLAN DE EQUIPO (v15, docs/motor.md §V.1). Este es el término que hace que el frente del
    // pelotón tenga DUEÑO: el equipo que persigue empuja a los suyos al turno y el que se esconde
    // los saca. Vale 0 para el agente libre y para el que corre por su cuenta (regla 1 de §V.1),
    // así que un campo sin equipos da exactamente el mismo turno que en la v14.
    STAGE.teamRelayDriveWeight * teamDriveNow +
    STAGE.relayJitterWeight * m.workJitter
  )
}

/**
 * Quién TIRA en este bloque: los `relayRotation(N, paceFraction)` corredores con más deber de
 * relevo (SPEC 6.5). El resto va a rueda y paga `shelterProtected`. Quiénes son no puede salir del
 * orden del array `input.riders` —de ahí el deber de relevo— y CUÁNTOS son ya no es una fracción
 * del grupo desde la v34: en la cabeza de una carretera caben unos pocos hombres rotando, y el
 * viento que pagan se reparte entre ellos (`shelterOf`).
 *
 * …Y SI EL FRENTE TIENE DUEÑO, ROTAN LOS SUYOS (v34). Es la regla 3 de §V.1 —«el frente lo lleva
 * UNO»— dicha por fin donde se decide quién paga viento, en vez de en un descuento aplicado después
 * al contarlo. Hasta la v33 el turno era tan grande (44 hombres de 176) que el equipo dueño del
 * frente cabía dentro con sitio de sobra para media parrilla, y la crónica solo podía nombrarlo
 * porque el trabajo de los demás se apuntaba al 30 % (`pullOffFrontShare`, retirada aquí): dos
 * hombres que pagan el MISMO viento no pueden trabajar cantidades distintas.
 *
 * Ahora la rotación es corta, así que el dueño la llena: de los que más deber tienen se quedan los
 * SUYOS, y los demás se colocan detrás. Si no queda ninguno —o si nadie lleva el frente, que es lo
 * normal en una fuga o en un grupeto— rotan los de más deber, como siempre. De aquí salen a la vez
 * las tres cosas que la v33 tenía repartidas en tres sitios: quién paga el viento, a quién se le
 * gasta el presupuesto de equipo y a quién nombra el parte.
 */
function relayTurn(
  members: RiderSim[],
  idSet: Set<string>,
  paceFraction: number,
  domestiquesFor: Map<string, string[]>,
  driveOfRider: (riderId: string) => number,
  /** ¿Va este hombre en una fuga que SU PROPIO equipo está persiguiendo por detrás? (v33). */
  sittingOn: (riderId: string) => boolean = () => false,
  /** ¿Es este grupo EL PELOTÓN? Fuera de él el listón es otro; ver abajo. */
  isBunch = true,
  /** ¿Hay equipos en esta carrera? También cambia el listón; ver abajo. */
  hayEquipos = true,
  /** ¿Es este hombre del equipo que LLEVA EL FRENTE? Decide el suelo; ver abajo. */
  delDueño: (riderId: string) => boolean = () => false,
  /**
   * ¿CUÁNTO NO LE INTERESA A ESTE HOMBRE QUE EL GRUPO LLEGUE JUNTO? (v39, `noChanceToWin`). En
   * [0,1]: cero para el que manda en el remate de este grupo y uno para el que va con alguien
   * inalcanzable a las puertas de la decisión.
   */
  sinOpciones: (riderId: string) => number = () => 0,
): Set<string> {
  const scored = members.map((m) => {
    const helpers = domestiquesFor.get(m.input.riderId)
    const protectedByTeam = helpers != null && helpers.some((id) => idSet.has(id))
    const drive = driveOfRider(m.input.riderId)
    /**
     * …Y SOLO CUENTA PARA EL QUE CORRE PARA SÍ MISMO. Un gregario da la cara aunque no pueda ganar
     * nada, porque no tira por él: tira por su jefe. Así que lo que uno deja de colaborar por no
     * tener opciones se mide contra lo que su equipo le esté empujando al frente, y el que lleva un
     * trabajo encima lo ignora entero.
     *
     * Esto es lo que hace que la misma regla valga para los dos sitios sin ponerle un «salvo el
     * pelotón» delante —que fue el primer intento y estaba mal—: dentro de una fuga el empuje de
     * equipo vale 0 y manda el interés propio; en el pelotón manda el plan (§V.1) y el tren del
     * velocista sigue lanzando en el último kilómetro aunque ninguno de sus hombres vaya a ganar.
     * Y en el grupo de treinta que decide una media montaña —que lleva el id del PELOTÓN aunque ya
     * no lo sea— sale lo que se ve en carretera: tira el equipo que manda y los demás se miran.
     */
    const paraMí = Math.max(0, Math.min(1, 1 - drive))
    return {
      id: m.input.riderId,
      duty:
        relayDuty(m, protectedByTeam, drive, sittingOn(m.input.riderId)) -
        STAGE.relayNoChanceWeight * paraMí * sinOpciones(m.input.riderId),
    }
  })
  // Desempate final por id para que el orden sea total y no herede el orden de inserción.
  scored.sort((a, b) => b.duty - a.duty || (a.id < b.id ? -1 : 1))
  /**
   * CUÁNTOS CABEN DELANTE. El menor de dos cosas: lo que pide el ritmo de este terreno
   * (`paceFraction`) y el tope de la carretera. **Ese tope son veinte hombres** (v38) y vale igual
   * para un pelotón que para una fuga, que es lo que pidió el dueño: «yo creo que en general quizás
   * deberíamos aplicar un máximo de unos 20 ciclistas; más de 20 pasando a los relevos es irreal…
   * pero eso aplica tanto a una fuga de 25 en la que ya no hay entendimiento entre todos como al
   * propio pelotón: si hay 4 equipos colaborando, pues 5 de cada uno».
   */
  const techo = Math.max(
    1,
    Math.min(members.length, STAGE.relayRotationMax, Math.ceil(paceFraction * members.length)),
  )
  /**
   * Y QUIÉNES SON: LOS QUE QUIEREN, no «los que caben» (v38). Hasta la v37 se cogían siempre los N
   * primeros por deber, tuvieran ganas o no, y encima había que apartar después a mano al jefe
   * arropado y al que no colabora. El dueño: «yo creo que tendríamos que decir que los que estén por
   * encima de un umbral X tiran; y si está por encima del máximo, seleccionar al top de esos; y si
   * sale 0, escoger el mínimo que según el tamaño del grupo podría ser 1-4».
   *
   * Con eso desaparecen tres parches de golpe —la lista de apartados (v36/v37), el filtro del dueño
   * del frente (v34) y el de «como mucho tres equipos» (v35)—: si el frente tiene dueño es porque el
   * empuje de su equipo pone a SUS hombres por encima del umbral y a los demás por debajo, que es la
   * misma frase dicha donde se decide.
   */
  /**
   * …Y EL LISTÓN NO ES EL MISMO EN EL PELOTÓN QUE FUERA DE ÉL. En el pelotón la norma es NO tirar
   * —ciento setenta de ciento setenta y seis van a rueda— y lo que hace que alguien dé la cara es
   * que su equipo lo empuje; el listón es alto a propósito. En una FUGA o en un GRUPETO no hay
   * equipo que empuje a nadie y la norma es la contraria: se relevan todos, porque el que va ahí o
   * colabora o no llega. Ahí el listón solo tiene que dejar fuera al que tiene un motivo para NO
   * colaborar —el que no persigue lo suyo (v33), el jefe arropado (v36), el que tiene al jefe
   * descolgado (v37)—, y ésos ya salen en negativo del deber.
   *
   * Sin esta distinción el umbral del pelotón se aplicaba a todo y en una fuga de seis tiraba UNO
   * solo, medido: turno mediana 1 en fugas y grupetos de cualquier tamaño.
   */
  /**
   * …Y HAY TRES LISTONES, UNO POR SITUACIÓN, porque tres situaciones distintas responden distinto a
   * «¿por qué iba yo a dar la cara al viento?».
   *
   * - **El pelotón con equipos** (`relayDutyThreshold`). La norma es NO tirar —ciento setenta de
   *   ciento setenta y seis van a rueda— y lo que pone a un hombre delante es que SU EQUIPO lo
   *   mande. El listón va por encima de lo que da el rol solo, así que lo cruza el que lleva
   *   empuje de equipo y nadie más: por eso el frente tiene dueño.
   * - **Una FUGA o un GRUPETO** (`...Loose`). No hay equipo que empuje a nadie y la norma es la
   *   contraria: se relevan todos, porque el que va ahí o colabora o no llega. El listón solo tiene
   *   que dejar fuera al que tiene un motivo para NO colaborar —el que no persigue lo suyo (v33),
   *   el jefe arropado (v36), el que tiene al jefe descolgado (v37)—, y ésos ya salen en negativo.
   * - **Un pelotón SIN equipos** (`...NoTeams`). Es el caso del banco y de los campos de prueba, y
   *   no es ninguno de los dos anteriores. Con el listón del pelotón NADIE lo cruza nunca —el
   *   empuje de equipo vale 0 para todos (§V.1, regla 1)— y medido, un pelotón de 99 corredores
   *   libres rodaba los 200 km enteros con los MISMOS TRES hombres del suelo de rescate y la
   *   crónica se quedaba sin un solo parte de relevos. Y con el listón de la fuga se van al turno
   *   hasta los jefes de filas: medido en el banco de los dos capitanes, uno de ellos daba la cara
   *   en 32 bloques de 119 y el otro en ninguno, decidido por el desempate, con un 31 % de
   *   diferencia de gasto entre dos hombres idénticos.
   *
   *   Sin equipos que empujen, lo que decide es EL ROL: el gregario y el corredor sin órdenes se
   *   reparten el trabajo, y el jefe, el sprinter y el marcador van a rueda como en cualquier
   *   pelotón. El listón se pone entre esos dos grupos.
   */
  const listón = !isBunch
    ? STAGE.relayDutyThresholdLoose
    : hayEquipos
      ? STAGE.relayDutyThreshold
      : STAGE.relayDutyThresholdNoTeams
  const quieren = scored.filter((s) => s.duty >= listón).length
  /**
   * …Y ALGUIEN TIENE QUE DAR LA CARA IGUAL: un grupo rueda porque alguien va delante. Son los que
   * menos se resisten, y cuántos depende del tamaño —uno en una fuga de dos, cuatro en un pelotón—.
   * Éste es también el caso del hombre que va SOLO, que da la cara el 100 % del tiempo porque no
   * hay nadie más.
   *
   * Y el suelo es UN SUELO, no un caso aparte (v38, defecto medido). Estaba escrito como «si no
   * quiere NADIE, saca el mínimo», y entonces con UN solo hombre por encima del listón salía UNO —
   * por debajo del mínimo de cuatro—. No es un detalle: en la llana canónica, cuando los equipos de
   * los velocistas se funden a la vez, se medía **un hombre tirando en un pelotón de 157**, y la
   * fuga se iba de 86 s a más de seis minutos en los sesenta kilómetros siguientes. El número de
   * relevistas es el de los que quieren, pero acotado entre el suelo y el techo.
   */
  const minimo = Math.max(
    1,
    Math.min(members.length, STAGE.relayMinPullers, Math.ceil(members.length / STAGE.relayMinPer)),
  )
  const cuantos = Math.max(minimo, Math.min(quieren, techo))
  if (cuantos <= quieren) return new Set(scored.slice(0, cuantos).map((s) => s.id))
  /**
   * …Y CUANDO HAY QUE RELLENAR POR DEBAJO DEL LISTÓN, LOS QUE DAN LA CARA SON LOS DEL DUEÑO DEL
   * FRENTE (v38). Es la regla de siempre —«el frente lo lleva UNO»— dicha para el único caso en que
   * no salía sola: cuando NADIE quiere tirar, el deber de todo el mundo se aplana y el orden lo
   * decidía el desempate por id, o sea el azar.
   *
   * No es cosmético. Medido en el banco de la voz de la crónica, en el desenlace de una etapa con
   * el campo vaciado los deberes se apilaban todos en 0,43 y el suelo sacaba al frente a un hombre
   * cualquiera: en 62 de 153 partes con voz de equipo el que tiraba era un equipo SIN NINGÚN
   * MOTIVO, y entonces el parte no puede decir por qué tira. En carretera, el equipo que ha llevado
   * la carrera todo el día mantiene a un hombre delante aunque vaya vacío; no se aparta para que
   * tire el que no se juega nada.
   */
  const relleno = [...scored].sort(
    (a, b) =>
      Number(delDueño(b.id)) - Number(delDueño(a.id)) || b.duty - a.duty || (a.id < b.id ? -1 : 1),
  )
  return new Set(relleno.slice(0, cuantos).map((s) => s.id))
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

/**
 * `probe` es OBSERVACIÓN PURA (v26): pide una foto del orden de la carrera en unos kilómetros dados
 * y no altera nada —ni un dado, ni un compromiso, ni un reloj—. Sin él, y es el caso de producción,
 * el motor corre exactamente igual que antes. La CONTRARRELOJ lo ignora a propósito: allí cada
 * corredor es su propio grupo desde la salida y el orden dentro de la etapa no es una pregunta con
 * sentido (SPEC 6.13).
 */
export function simulateStage(entrada: StageInput, seed: string, probe?: StageProbe): StageOutput {
  /**
   * LA CARRERA NO LA PUEDE DECIDIR EL ORDEN EN QUE LLEGAN LOS CORREDORES (v35, docs/balance.md
   * «El motor depende del ORDEN DE ENTRADA»). El motor es determinista dada la semilla, pero NO era
   * invariante a permutaciones de `input.riders`: las piernas del día (`rngDay`) se reparten
   * recorriendo el array, así que barajar a los mismos corredores con la misma semilla daba otra
   * carrera. Medido en la v34: 36 de 36 barajados cambiaban el resultado.
   *
   * Eso convertía en física el orden de una consulta SQL. La v34 lo tapó donde se veía —el roster
   * de producción sale ordenado por dorsal (`packages/db/src/stageRun.ts`)—, pero el agujero
   * seguía abierto para cualquier otro que llame al motor. Aquí se cierra donde tiene que estar:
   * el motor ORDENA por `riderId` antes de mirar nada, así que da igual con qué orden le lleguen.
   * El dorsal, la general y las órdenes siguen decidiendo lo que decidían; lo que ya no decide
   * nada es la posición en el array.
   */
  const input: StageInput = {
    ...entrada,
    riders: [...entrada.riders].sort((a, b) =>
      a.riderId < b.riderId ? -1 : a.riderId > b.riderId ? 1 : 0,
    ),
  }
  // Contrarreloj: grupos de un corredor, sin drafting ni hazards de ataque (SPEC 6.13).
  if (input.timeTrial) return simulateTimeTrial(input, seed)

  const streams = stageRng(seed)
  // Subflujos nominales creados UNA vez: reutilizarlos preserva la secuencia (SPEC 6.1).
  const rngBreak = streams('breakaway')
  // Subflujo NOMINAL de la capa táctica (SPEC 6.1): los intentos de movimiento tiran de aquí, así
  // que añadirlos no altera la secuencia de la fuga, del sprint ni de las caídas.
  const rngTactics = streams('tactics')
  const rngSprint = streams('sprint')
  // Subflujo NOMINAL de la COLOCACIÓN en meta (v24, SPEC 6.1, docs/motor.md §12.6). Mismo motivo
  // que `rngRough` y `rngAbandon`: el dado de la colocación no puede salir de `rngSprint`, que
  // consume el ruido del remate y los mini-sprints de banner con los que se calibró el modelo de
  // final; meterle tiradas nuevas DESPLAZARÍA su secuencia y movería resultados que hoy están
  // calibrados sin que ninguna ley del sprint haya cambiado. Con subflujo propio, un grupo pequeño
  // —donde la colocación no reparte nada— sale dígito a dígito igual que en la v23.
  const rngPlacement = streams('placement')
  /**
   * EL SUBFLUJO `hazard` YA NO SE PIDE (v26), y hay que decirlo porque es el único dado que este
   * motor ha QUITADO. Era el del descuelgue en subida: `rollHazard(rngHazard, λ(déficit))` bloque a
   * bloque. La deriva de la v26 lo sustituye por física —la misma ley de velocidad de SPEC 6.4— y no
   * tira nada, así que en una etapa de montaña ese flujo deja de consumirse entero.
   *
   * No desplaza a NADIE: los subflujos nominales son independientes por construcción (SPEC 6.1), así
   * que el pavé (`rough`), el sprint, las caídas y la táctica salen dígito a dígito igual. Lo que se
   * mueve es la montaña, y se mueve porque ha cambiado su física, no porque haya cambiado su azar.
   */
  // Subflujo NOMINAL de la selección FUERA de la montaña (v12, SPEC 6.1, docs/motor.md §14). El
  // descuelgue en pavé y en descenso NO podía tirar del `hazard` de la subida: ese flujo lo consumía
  // el descuelgue en subida bloque a bloque, y meterle tiradas nuevas DESPLAZARÍA su secuencia,
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
  /**
   * EL HUMOR DEL PELOTÓN (v38). El dueño: «también la probabilidad de que el pelotón eche la hueva y
   * vaya lento… muchas veces el pelotón debería tener flojera y dejar hacer».
   *
   * Hasta la v37 el pelotón corría SIEMPRE igual de nervioso: mismas constantes, misma etapa, y la
   * única variación venía de quién atacaba. En la carretera no es así —hay días de cierre a muerte y
   * días en los que la carrera no arranca— y esa diferencia decide cosas: si el que se cae en el km
   * 5 vuelve o no vuelve, y si la fuga del día se va o no se va.
   *
   * Es un dado por ETAPA, no por bloque: un pelotón no cambia de humor cada cien metros. Y se aplica
   * a lo que el pelotón DECIDE, nunca a los suelos que son de carretera —el tirón final de los
   * trenes y el pavé—, porque esos no son ganas, son la carretera obligando.
   */
  const humorDelPeloton = 1 + STAGE.pelotonMoodSpread * (2 * streams('mood')() - 1)
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
      driftS: 0,
      reserveS: STAGE.reserveSeconds,
      gaveUp: false,
      bonkNoticed: false,
      bonkKm: 0,
      hurt: false,
      mishapKm: null,
      abandonedKm: null,
      incident: null,
      pulling: false,
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
  /**
   * Cuántos se han DEJADO IR ya desde cada grupo (regla 8), por id de grupo. Es el freno colectivo
   * de la v17: rendirse es una decisión individual, pero en el km 212 de Race Colombia e5 se
   * sentaron 73 corredores de golpe, cada uno pasando su guarda por separado, y en cuanto se fueron
   * los primeros el pelotón menguó y el resto lo tuvo más fácil todavía. Los que quedan SON el
   * grupo: pasada `giveUpGroupMaxFraction` de la cohorte, el grupo deja de disolverse.
   */
  const gaveUpFromGroup = new Map<string, number>()

  let lowCommitKm = 0
  // Km en que se «anuncia» la fuga en la crónica: ningún evento relativo a la fuga se fecha antes.
  let breakFormedKm = 0
  let lastFrontNoticeKm = Number.NEGATIVE_INFINITY
  let lastGapReportKm = Number.NEGATIVE_INFINITY
  let prevGapS = Number.POSITIVE_INFINITY
  /**
   * QUIÉN LLEVA EL TÍTULO DE PELOTÓN (v29). Empieza en el grupo que se llama así —que al salir de
   * meta lo es— y a partir de ahí lo defiende o lo pierde por TAMAÑO, con la histéresis de
   * `mainGroupId`. Es estado porque la histéresis lo exige: sin memoria de quién lo tenía, dos
   * mitades parecidas se lo intercambiarían cada bloque.
   */
  let mainId: string | null = PELOTON
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
  /**
   * LA CRIBA LEJOS DE META (v21, docs/motor.md §16). Todo lo de arriba vive dentro del desenlace
   * (`raceThisClimb`), y por buenas razones: con perfiles reales hay relieve por todas partes y un
   * puerto de tempo rompe y recompone el pelotón sin consecuencias. Pero la etapa a veces se decide
   * FUERA de esa ventana —Race Great Ocean, 116 → 80 a 50 km de meta— y ahí la crónica se callaba.
   *
   * Este contador es el de la selección lejana y va APARTE del de arriba a propósito: mide la
   * pérdida ACUMULADA del grupo de cabeza desde su último máximo, no desde el último aviso, y por
   * eso no participa en la cadena de avisos del desenlace (que sí tiene que cerrar sin huecos).
   * El listón es de MAGNITUD: solo se cuenta la criba que se lleva a una parte grande del grupo.
   */
  let farAtPeak = input.riders.length
  let farEscaped = 0
  let farNoticeKm = Number.NEGATIVE_INFINITY
  /** Desde qué kilómetro se está midiendo la selección lejana en curso. */
  let farFromKm = 0
  /** Tamaño del bloque anterior y último km en el que el grupo ENCOGIÓ: la criba aún está pasando. */
  let farPrevSize = input.riders.length
  let farShrinkKm = 0
  /**
   * QUIÉNES iban delante en el último parte de cabeza, no cuántos (v25). El motor llevaba solo el
   * TAMAÑO, y por eso una fuga que cambia de miembros sin cambiar de número —Pinho se cae, entra
   * Jereb— no producía ni una línea: el lector se encontraba nombres nuevos delante sin que nadie
   * los hubiera visto llegar, y nombres viejos desaparecidos sin que nadie los hubiera visto
   * marcharse. Es la mitad de la causa madre de esta versión: la fuga del DÍA (`dayBreakRiders`,
   * congelada) no es el grupo que va delante AHORA.
   */
  let lastFrontIds: string[] = []
  let lastFrontReportKm = Number.NEGATIVE_INFINITY
  /** Km del último intento NARRADO: la crónica cuenta los ataques, no los inventaría. */
  let lastAttackNoticeKm = Number.NEGATIVE_INFINITY
  /** …y el de la última pájara narrada: en la reina se vacía el pelotón entero (v14). */
  let lastBonkNoticeKm = Number.NEGATIVE_INFINITY
  let chaseAnnounced = false
  let chaseAbandoned = false
  let consolidated = false
  let caught = false
  /** A quién se ha proclamado ya líder de la montaña: ver `disputeClimb` (v25). */
  const komLead: { proclaimed: string | null } = { proclaimed: null }
  /** Los corredores que FORMARON la fuga del día. Es una foto del km en que salió, y nada más. */
  let dayBreakRiders: string[] = []
  /**
   * …y LOS QUE VAN EN ELLA AHORA (v25). Aquí estaba la causa madre de esta versión: el motor
   * llevaba una sola lista, la congelada, y la usaba para contestar dos preguntas distintas —quién
   * formó la fuga y a quién están cazando—. En Race Jaén el km 190 anunciaba que «Carlos Pinho y
   * Alex Taylor vuelven al pelotón» cuando Pinho no iba delante desde el km 150 y los cazados eran
   * CINCO. La fuga del día no es el grupo que va delante ahora.
   */
  let dayBreakNow: string[] = []
  /** Todo el que ha pasado por la fuga del día: mientras uno siga escapado, la fuga no está cazada. */
  const dayBreakEver = new Set<string>()
  /** ¿Se la comió el pelotón, o se deshizo sola por el camino? No es el mismo desenlace. */
  let dayBreakSwallowed = false
  let dayBreakFormed = false

  const kmAt = (i: number): number => (i + 0.5) * STAGE.dx

  /**
   * LAS FOTOS PEDIDAS (v26). Cada km del `probe` se resuelve UNA vez, aquí, al bloque cuyo centro le
   * corresponde, para que el bucle no tenga que hacer aritmética por bloque: sin `probe` este mapa
   * está vacío y lo único que se ejecuta en carretera es una comparación contra cero.
   */
  const probeAt = new Map<number, number>()
  if (probe) {
    for (const target of probe.atKm) {
      const idx = Math.max(0, Math.min(n - 1, Math.round(target / STAGE.dx - 0.5)))
      probeAt.set(idx, kmAt(idx))
    }
  }

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
    // EL QUE SE RINDIÓ NO FIRMA LA CAZA (v21). En producción, Race Bességes e4 atribuía la captura
    // a Patrick Henry, que se había dejado ir diecisiete kilómetros antes. El trabajo que hizo es
    // REAL y no se borra del libro —lo hizo—, pero la frase habla en presente («the catch belongs
    // to»): la firman los que seguían peleando cuando ocurrió. Si no queda ninguno, la captura se
    // queda sin autor, que es lo que este evento ya hacía cuando la fuga se hundía sola.
    const alive = [...mv.chaseLedger].filter(([id]) => {
      const s = sims.get(id)
      return s != null && !s.gaveUp && s.abandonedKm === null
    })
    // El UMBRAL sigue midiéndose sobre el trabajo INDIVIDUAL, exactamente como antes: lo que decide
    // si una captura tiene autor no cambia, solo cambia a quién se nombra.
    const { ids: soloIds, best } = topWorkers(
      alive,
      STAGE.chaseWorkNamesMax,
      STAGE.chaseWorkNamesMinShare,
    )
    if (soloIds.length === 0 || best < STAGE.chaseWorkMinUnits) return
    // …PERO UNA PERSECUCIÓN LA HACEN EQUIPOS, NO TRES SEÑORES (v28). El dueño lo dijo varias veces:
    // «no tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca». Nombrar a los tres
    // que más pusieron reparte un nombre por equipo y la frase queda contando individuos, cuando lo
    // que pasó fue que tres ESCUADRAS se pusieron a cazar. Así que el trabajo se suma POR EQUIPO,
    // se ordenan los equipos, y de cada uno se nombra a su hombre más gastado como su representante.
    // Un agente libre es su propio «equipo»: firma él, que es la verdad.
    const teamWork = new Map<string, number>()
    const faceOfTeam = new Map<string, [string, number]>()
    for (const [id, w] of alive) {
      if (w <= 0) continue
      const key = teamOf.get(id) ?? `libre:${id}`
      teamWork.set(key, (teamWork.get(key) ?? 0) + w)
      const cur = faceOfTeam.get(key)
      if (!cur || w > cur[1] || (w === cur[1] && id < cur[0])) faceOfTeam.set(key, [id, w])
    }
    const rankedTeams = [...teamWork].sort(
      (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
    )
    const topTeam = rankedTeams[0]?.[1] ?? 0
    // Los que pusieron una parte apreciable de lo que puso el que más: si cazó uno solo, sale uno.
    const working = rankedTeams.filter(([, w]) => w >= topTeam * STAGE.chaseWorkNamesMinShare)
    const ids = working
      .slice(0, STAGE.chaseWorkNamesMax)
      .map(([key]) => faceOfTeam.get(key)?.[0] ?? '')
      .filter((id) => id !== '')
    if (ids.length === 0) return
    log.emit(atKm, atTs, 'trabajo', 'chase_work', ids, {
      // CUÁNTOS equipos cazaron de verdad, que no tiene por qué ser cuántos caben en la frase. Sin
      // este número la crónica solo puede contar los nombres que le llegan (tres como mucho) y una
      // caza a cinco bandas se lee como una alianza de tres. Con él puede decir «and two more».
      teams: working.length,
      // Lo que se cerró: la CÚSPIDE del boquete y en cuántos km se fue desde ella. Son los dos
      // números que la frase tiene que decir tal cual: contarlo como «cerraron 2:20 en 5 km» hacía
      // que chocara con el último parte narrado («1:50» dos kilómetros antes), y las dos cosas eran
      // ciertas. La cúspide es la que explica el trabajo; el último parte, dónde estaba la carrera.
      closedS: Math.round(mv.peakGapS),
      km: Math.max(1, Math.round(atKm - mv.peakGapKm)),
      /**
       * …Y DÓNDE ESTUVO ESA CÚSPIDE (v25). La v21 dejó de llamarla «cerraron 2:20 en 5 km», pero
       * seguía siendo un número suelto: en Race Jaén la frase dice «peaked at 3:04» dos líneas
       * después de que el lector leyera «2:53», y las dos son ciertas —el boquete se mide cada
       * bloque y se narra cada veinte kilómetros—. Con el km, la cúspide deja de ser una cifra que
       * contradice a la anterior y pasa a ser un sitio de la carretera («3:04 allá por el km 26»).
       */
      peakKm: Math.round(mv.peakGapKm),
      work: Math.round(10 * best) / 10,
    })
  }

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
   * …y qué CLASE de final es, contado con el pelotón entero: es la pregunta «¿quién es el favorito
   * de HOY?» que necesita el plan de equipo (§V.1) para saber qué equipos tienen una carta que
   * jugar. El tipo por grupo de meta se resuelve luego, corredor a corredor, en `finishStage`.
   */
  const stageFinishType = finishType(finishTerrain, input.riders.length)
  /**
   * ¿ADMITE LA META UNA LLEGADA AGRUPADA? De este booleano cuelga todo lo que hace que un pelotón
   * llegue junto: que los equipos de los sprinters se pongan a cazar (`chasingSprinters`), el tirón
   * de los últimos kilómetros (`finalDriveKm`) y el plan de equipo de los que tienen rematador.
   *
   * HASTA LA v21 ERA `finalStretch.every((b) => b.tipo !== 'subida')` (v22, docs/balance.md): un
   * `every` en crudo sobre los últimos 2 km en el que UN solo bloque de subida lo apagaba todo. El
   * motor tenía DOS clasificadores de final y solo uno había aprendido la lección de la rampa de
   * 200 m: `deriveFinishTerrain` mide la última cota, cuánto dura y dónde muere, y descarta las
   * rachas cortas; el `every` no distinguía un repecho del 3 % de un puerto del 10 %.
   *
   * Lo destapó el GP de Québec al cargarle su circuito real: 1 km al 3 % en la línea dejaba al 1 %
   * del pelotón en el tiempo del ganador (la carrera real la ganó Alaphilippe con 2 s sobre el
   * segundo). Ahora la pregunta se la hace al modelo de final, que ya sabe la respuesta.
   */
  const bunchFinish = admitsBunchFinish(stageFinishType)
  /**
   * LA FUERZA DE LA CAZA (`stage/chase.ts`): cuántos trenes tiene el campo, cómo de bueno es su
   * rematador y con cuántos compañeros cuenta. Antes bastaba UN corredor con SPR ≥ 70 para que el
   * pelotón entero persiguiera a tope, en una continental modesta igual que en una gran vuelta.
   * Con la fuerza a 1 (tres rematadores de primer nivel) el controlador da exactamente los mismos
   * números que antes; cuanto más flojo es el campo, más cuerda da, menos aprieta y antes se rinde.
   */
  const chaseStrength = chaseField(input.riders)
  // Los equipos de los sprinters solo cazan si la meta admite una llegada agrupada: en un final en
  // alto no persiguen, y la fuga vive o muere en la subida (SPEC 6.9). El adoquín cuenta como
  // llegada rodada desde la v12 —los 300 m del Espace Charles Crupelandt, a 1,1 km de meta,
  // apagaban la persecución en TODA Paris-Roubaix y el pelotón le regalaba el monumento a la fuga
  // del día— y desde la v22 también el repecho de meta, por la misma razón y con el mismo defecto.
  const chasingSprinters = bunchFinish && chaseStrength.force >= STAGE.chaseMinForce
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
      // «TENEMOS AL FAVORITO DE HOY» sale de la maquinaria de final que ya existe: el tipo de final
      // que dibuja el RECORRIDO y la mezcla de atributos con que se resuelve el remate. No hay dato
      // nuevo: es `finishScore` sobre `deriveFinishTerrain`, la misma cuenta del sprint.
      finishScore: finishScore(r.eff0, stageFinishType),
      gcDeficitSeconds: r.gcDeficitSeconds,
    })),
    { bunchFinish, hasGcContext },
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
  /** Qué hace y POR QUÉ cada equipo AHORA, recalculado en cada decisión del pelotón. */
  const teamNow = new Map<string, TeamStance>()
  /** Y el empuje que de ahí sale para el turno de relevos, cacheado entre decisiones. */
  const teamDriveNow = new Map<string, number>()
  /**
   * EL EQUIPO QUE LLEVA EL FRENTE. Uno solo, con histéresis: cede el relevo cuando gasta su
   * presupuesto o pierde su baza. Es lo que hace que la crónica pueda decir «Cumbre Escuadra ha
   * tomado el frente» en vez de nombrar a tres corredores de tres equipos distintos.
   */
  let frontTeamId: string | null = null
  const restStance: TeamSituation = {
    manUpTheRoad: false,
    kmToGo: totalKm,
    frontThreatDeficit: null,
    // Antes de que empiece la carrera no hay nada delante que cazar.
    gapSeconds: null,
  }
  for (const plan of teamPlans.values()) {
    const stance = teamStance(plan, restStance)
    teamNow.set(plan.teamId, stance)
    teamDriveNow.set(plan.teamId, teamDrive(stance, 0, false))
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
    const stance = teamNow.get(t)
    return stance == null ? 1 : teamAttackFactor(stance)
  }
  /** El MOTIVO por el que tira un equipo, para la crónica; `null` si no es un equipo el que tira. */
  const purposeOfTeam = (teamId: string | null): string | null =>
    teamId == null ? null : (teamNow.get(teamId)?.purpose ?? null)
  const spentFractionOf = (plan: TeamPlan): number =>
    plan.budget > 0 ? (teamSpent.get(plan.teamId) ?? 0) / plan.budget : 1
  /**
   * DESOBEDECER (docs/motor.md §VI.2): quien sale hoy por su cuenta queda FUERA del plan de su
   * equipo —ni le empujan al frente ni le arropan—, y eso es lo que aplican las dos funciones de
   * arriba. La CRÓNICA de esa desobediencia NO se emite aquí: se coloca al final, en el kilómetro en
   * que el rebelde aparece por primera vez haciendo algo (`announceRebels`, stage/events.ts).
   */

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
    /**
     * QUIÉN HA TIRADO DE LA RESERVA EN ESTE BLOQUE (v26). El resto la RECUPERA, y la recuperación
     * vive en `advance` porque es donde se recorre a cada corredor con el reloj de su grupo delante
     * —la recarga de W′ se cuenta en segundos de carretera, no en kilómetros—. Se llena en `shatter`,
     * que corre antes que `advance` en el mismo bloque.
     */
    const spentReserve = new Set<string>()

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
        /**
         * «UN HOMBRE DELANTE» ES DELANTE, NO EN CUALQUIER CORRO (v38). Esto metía en el saco TODOS
         * los movimientos de la carretera, y un `mov-N` es cualquier grupo que no sea el pelotón:
         * también el corro de dos que se acaba de quedar a 40 s por detrás, o el resto de una fuga
         * ya cazada que rueda descolgado. Medido en la llana canónica de 176 hombres: en el km 150,
         * **15 de los 22 equipos** creían tener a alguien en la fuga y por tanto ninguno perseguía.
         *
         * La regla de la carretera es sobre lo que se PERSIGUE: no se tira detrás de un grupo que
         * lleva a un compañero dentro. Un compañero que va por detrás no exime de nada.
         */
        const inMove = new Set<string>()
        for (const mv of moves) {
          if (mv.g.tS >= peloton.tS) continue
          for (const m of membersOf(mv.g.id)) inMove.add(m.input.riderId)
        }
        // …Y «EN EL PELOTÓN» ES EN EL GRUPO QUE LLEVA LA GENTE, no en el que conserva el id (v33).
        // Era `groupId === PELOTON`: cuando el grueso de la carrera nacía de un descuelgue —un
        // `shed-N` que se come al pelotón, o el corte de un abanico—, TODOS los equipos contaban
        // cero hombres «en el pelotón», nadie reclamaba el frente y `frontTeamId` se quedaba en
        // null. Medido en el km 167 de una etapa de 168: cero hombres dando la cara en la MITAD de
        // las corridas, o sea ningún equipo de sprinters lanzando en el último kilómetro.
        const bunchId = mainId ?? PELOTON
        const menInPeloton = (plan: TeamPlan): number =>
          plan.memberIds.filter((id) => !rebels.has(id) && sims.get(id)?.groupId === bunchId).length
        // 1. Qué juega cada equipo AHORA, y POR QUÉ. La amenaza se mide con el MEJOR CLASIFICADO
        //    que va delante: es la cuenta de `gcLeash()` mirada equipo a equipo, que es lo que
        //    distingue al equipo del maillot —al que esa fuga sí le quita el liderato— del equipo
        //    cuyo hombre va a tres minutos y no se juega nada con ella.
        let frontThreatDeficit: number | null = null
        if (hasGcContext && front) {
          let worst = Number.POSITIVE_INFINITY
          for (const m of membersOf(front.g.id)) worst = Math.min(worst, m.input.gcDeficitSeconds)
          frontThreatDeficit = Number.isFinite(worst) ? worst : null
        }
        for (const plan of teamPlans.values()) {
          /**
           * «TENGO UN HOMBRE DELANTE» ES TENER DELANTE A TU CARTA, NO A CUALQUIERA (v38).
           *
           * La regla —no se persigue lo que lleva a un compañero dentro— es de las más viejas del
           * ciclismo, pero se estaba aplicando a CUALQUIER hombre del equipo. Y en una llana el
           * equipo del velocista manda a su cazaetapas a la fuga precisamente porque no le cuesta
           * nada: si sale, etapa gratis; si no, se corre el sprint igual. Nadie renuncia a su
           * velocista porque su noveno hombre esté en la escapada.
           *
           * Medido en el banco de la voz de la crónica (8 equipos de 5, cuatro con velocista): con
           * los cuatro cazaetapas de esos cuatro equipos en la fuga, los cuatro se declaraban
           * exentos a la vez y el frente del pelotón se quedaba **sin dueño el 20 % de los bloques**
           * —nadie con motivo tirando, y un parte que no puede decir por qué—.
           *
           * Así que el equipo se aparta solo cuando el que va delante es SU CARTA para hoy
           * (`stageCandidateId`, el mejor suyo para este final). Y solo cuenta si no es un rebelde:
           * el equipo no defiende a quien se ha ido por su cuenta contra sus órdenes (§VI.2).
           */
          const suCarta = plan.stageCandidateId
          const manUpTheRoad =
            suCarta != null
              ? inMove.has(suCarta) && !rebels.has(suCarta)
              : plan.memberIds.some((id) => inMove.has(id) && !rebels.has(id))
          teamNow.set(
            plan.teamId,
            teamStance(plan, {
              manUpTheRoad,
              kmToGo: kmRestantes,
              frontThreatDeficit,
              // EL BOQUETE DE HOY (v38): la postura se decide mirando la carretera, no solo la
              // general de ayer. Sin nada delante vale `null` y no hay nada que cazar.
              gapSeconds: front ? gap : null,
            }),
          )
        }
        // 2. QUIÉN LLEVA EL FRENTE. Con la carretera despejada el relevo pasa al siguiente equipo
        //    con derecho: el que más se juega y con el depósito colectivo más entero. Hay
        //    histéresis a propósito —solo se cede cuando el que manda ha gastado su presupuesto o
        //    ha perdido su baza—, porque un frente que cambia de dueño cada kilómetro no es un
        //    frente: es lo que producía la alianza permanente de la v14.
        const claimOf = (plan: TeamPlan): number => {
          const stance = teamNow.get(plan.teamId)
          return stance && menInPeloton(plan) > 0 ? frontClaim(stance) : 0
        }
        const current = frontTeamId ? teamPlans.get(frontTeamId) : undefined
        const relief = [...teamPlans.values()]
          .filter((p) => claimOf(p) > 0 && spentFractionOf(p) < 1)
          .sort(
            (a, b) =>
              claimOf(b) - claimOf(a) ||
              spentFractionOf(a) - spentFractionOf(b) ||
              b.quality - a.quality ||
              (a.teamId < b.teamId ? -1 : 1),
          )[0]
        /**
         * EL RELEVO ENTRE EQUIPOS NO ESPERA A QUE EL PRIMERO SE FUNDA DEL TODO (v38).
         *
         * La condición era «cede cuando pierde la baza o gasta su presupuesto ENTERO», y con el
         * turno largo de la v38 el trabajo se reparte entre los tres o cuatro equipos con carta, así
         * que el dueño terminaba la etapa con el 0,73 gastado y **no cedía nunca**: medido, 1,02
         * equipos distintos llevaban el frente en una llana, contra un objetivo de 1,8-4.
         *
         * Y bajar el presupuesto para forzarlo es la palanca equivocada, también medido: agotarlo
         * apaga además el EMPUJE del equipo (`teamDriveTired`), así que con presupuesto 3 el frente
         * cambiaba de manos de sobra pero el pelotón dejaba de cazar y la fuga ganaba el 38 % de las
         * llanas contra el 12 % de ahora. Son dos cosas distintas: cuánto trabaja el pelotón y quién
         * de los que trabajan lleva la etiqueta de llevarlo.
         *
         * En carretera el cambio no es un colapso: el equipo que lleva media hora delante se aparta
         * y entra otro que está más entero, y el pelotón no afloja ni un segundo. Así que se cede
         * cuando el que manda YA HA PUESTO LO SUYO (`teamFrontHandoverSpent`) y hay un relevo con
         * tanto derecho como él y bastante más depósito (`teamFrontHandoverEdge`).
         */
        const cansado =
          current != null &&
          relief != null &&
          spentFractionOf(current) >= STAGE.teamFrontHandoverSpent &&
          claimOf(relief) >= claimOf(current) &&
          spentFractionOf(relief) + STAGE.teamFrontHandoverEdge <= spentFractionOf(current)
        if (!current || claimOf(current) === 0 || spentFractionOf(current) >= 1 || cansado) {
          /**
           * Si no queda nadie fresco con derecho al frente, sigue el que estaba (fundido) hasta que
           * alguien recupere la baza: la carretera no se queda sin nadie delante.
           *
           * …salvo que EL QUE ESTABA YA NO ESTUVIERA (v33). Ese caso caía en `frontTeamId = null`, y
           * de ahí no se salía: para volver a poner a alguien delante hacía falta un equipo con baza
           * Y FRESCO, y en el desenlace ya no queda ninguno. Medido en los últimos 20 km de una
           * etapa de 168: **el 59 % de los bloques sin nadie al frente**, con 3,9 equipos frescos de
           * 18 y 1,9 con intención de lanzar el sprint. Justo cuando los trenes tienen que estar
           * volando no había tren: sin `frontTeamId` nadie empuja a los suyos a la rotación, así
           * que ni el frente tiene dueño ni la crónica puede decir quién lleva al pelotón.
           *
           * El presupuesto dice que un equipo no puede llevar el frente OCHENTA kilómetros, no que
           * no pueda lanzar un sprint: el lanzamiento es exactamente el momento de vaciar lo que
           * quede. Así que cuando no hay nadie fresco, manda la baza aunque venga fundido.
           */
          if (relief) frontTeamId = relief.teamId
          else if (current && claimOf(current) > 0) {
            // Sigue el que estaba, fundido y todo.
          } else {
            const fundido = [...teamPlans.values()]
              .filter((p) => claimOf(p) > 0)
              .sort(
                (a, b) =>
                  claimOf(b) - claimOf(a) ||
                  spentFractionOf(a) - spentFractionOf(b) ||
                  b.quality - a.quality ||
                  (a.teamId < b.teamId ? -1 : 1),
              )[0]
            frontTeamId = fundido ? fundido.teamId : null
          }
        }
        // 3. El empuje de cada uno, y la fuerza que le QUEDA a la caza.
        let chaseReady = 0
        let chaseFull = 0
        for (const plan of teamPlans.values()) {
          const stance = teamNow.get(plan.teamId)
          if (!stance) continue
          const spent = spentFractionOf(plan)
          teamDriveNow.set(plan.teamId, teamDrive(stance, spent, plan.teamId === frontTeamId))
          if (stance.intent !== 'perseguir' && stance.intent !== 'lanzar') continue
          // Peso: los hombres que el equipo tiene todavía en el pelotón. Un equipo diezmado no
          // puede cazar por muchas ganas que le queden.
          const present = menInPeloton(plan)
          chaseFull += present
          chaseReady += present * Math.max(0, 1 - spent)
        }
        const avail = chaseFull > 0 ? chaseReady / chaseFull : 1
        /**
         * EL EQUIPO QUE TIENE UN HOMBRE EN LA FUGA NO TIRA (v38, §V.1). El dueño, explicando por qué
         * a veces una escapada se va a quince minutos en una llana: «puede ocurrir y ocurre a veces,
         * que el pelotón se despista, deja hacer a una escapada —especialmente si los equipos de los
         * sprinters tienen a alguien metido en la fuga y entonces no van a tirar— y la escapada se va
         * a 15 o 20 minutos».
         *
         * Es la misma idea que la v33 —el que no colabora en la fuga porque los suyos la persiguen—
         * leída desde el otro lado: si tu hombre está delante, no organizas el tren para cazarlo. Y
         * no es una bandera nueva: los trenes de caza ya están identificados (`chaseField`) y quién
         * va en la fuga del día también, así que basta con no contar los trenes cuyo equipo tenga
         * gente delante y volver a sumar la fuerza (`chaseForce`).
         *
         * Con ello la caza deja de ser una propiedad fija de la etapa y pasa a depender de QUIÉN se
         * ha metido en la fuga, que es de lo que va la mañana de una llana.
         */
        const enLaFuga = new Set<string>()
        for (const mv of moves) {
          if (!mv.dayBreak) continue
          for (const id of membersOf(mv.g.id)) {
            const equipo = teamOf.get(id.input.riderId)
            if (equipo != null) enLaFuga.add(equipo)
          }
        }
        const trenesQueTiran = chaseStrength.trains.filter(
          (t) => !enLaFuga.has(teamOf.get(t.riderId) ?? ''),
        )
        const fuerza =
          trenesQueTiran.length === chaseStrength.trains.length
            ? chaseStrength.force
            : chaseForce(trenesQueTiran)
        gear = chaseGear(fuerza * lerp(STAGE.teamChaseTiredForce, 1, avail))

        /**
         * 4. LOS SUYOS SE DEJAN CAER A POR ÉL (v36, §V.1). Hasta la v35 el trabajo de equipo se
         * acababa en el instante en que el jefe salía del grupo: el descuento de coste del gregario,
         * el deber de relevo y el marcaje piden los TRES ir en el mismo grupo, así que un jefe que se
         * caía o se descolgaba dejaba de tener equipo. Medido sobre 120 etapas del banco: pasa 3,18
         * veces por etapa, en el 40 % de ellas con dos o más de los suyos dentro del pelotón, y el
         * que no vuelve pierde 443 s de mediana. Nadie se dejaba caer NUNCA.
         *
         * Cuántos van a por él lo dicta lo que se juegue el equipo, con las palabras del dueño: «si
         * es el favorito para una gran vuelta o carrera por etapas, puede justificar descolgar a todo
         * el equipo menos 1; si es una carrera de 1 día no, salvo que la diferencia sea pequeña».
         * Las dos ramas ya existen en el plan: `maillot`/`general` solo son motivo con general en
         * juego —lo que separa una vuelta de una clásica—, y `etapa` es el día de hoy.
         *
         * Lo que NO hay que escribir es lo que pasa después, y por eso esto es una decisión y no una
         * física nueva: en cuanto están con él son un grupo que se releva (`droppedCommit`), el tope
         * de la v35 les deja volver si el pelotón va sin prisa y no si va cazando, y **el jefe deja
         * de tirar solo** porque `relayDuty` saca del turno al que lleva a los suyos al lado — que es
         * la otra mitad de la frase del dueño: «en ese caso que el líder no pase a tirar, él se
         * reserva».
         */
        if (kmRestantes >= STAGE.helpBackMinKmToGo) {
          const bunchNow = mainId ?? PELOTON
          for (const plan of teamPlans.values()) {
            const leaderId = plan.leaderId
            if (leaderId == null) continue
            const jefe = sims.get(leaderId)
            if (!jefe || jefe.finishTs !== null || jefe.abandonedKm !== null) continue
            if (jefe.groupId === bunchNow) continue
            // Solo se va a por el que se ha QUEDADO. Al que está por delante no hay que rescatarlo.
            const suGrupo = shed.find((g) => g.id === jefe.groupId)
            if (!suGrupo) continue
            /**
             * …Y SOLO POR EL QUE SE HA QUEDADO DE VERDAD. El suelo es la PUERTA del pelotón
             * (`regroupGapSeconds`): por debajo de ella el jefe está en la fila y vuelve solo —es el
             * acordeón, que pasa 24 veces por etapa—, y nadie se deja caer por diez segundos. Sin
             * este suelo la regla saltaba 6,35 veces por etapa; con él, solo cuando hace falta.
             */
            const gap = suGrupo.tS - peloton.tS
            if (gap < STAGE.regroupGapSeconds || gap > STAGE.helpBackMaxGapSeconds) continue
            const porLaGeneral =
              plan.purposes.includes('maillot') || plan.purposes.includes('general')
            /**
             * …Y POR LA ETAPA CASI NUNCA (v37). El dueño corrigió la v36: «por la etapa yo creo que
             * nadie debería bajarse… salvo que sea un pinchazo/caída y la distancia sea pequeña, y
             * sea gran favorito para ganar la etapa, según el tipo de etapa». Es de carretera:
             * renunciar a tu propia carrera por una etapa que tu jefe YA ha perdido no lo hace
             * nadie; hacerlo por el favorito que se acaba de ir al suelo, sí.
             *
             * Las tres condiciones salen de lo que el motor ya sabe: el PERCANCE es `mishapKm` —una
             * caída de CUALQUIER gravedad en los últimos kilómetros; el pinchazo y la avería mecánica
             * no existen todavía y quedan anotados—, la CARTA DEL DÍA es `stageCandidateId`, y «gran
             * favorito» es que su `finishScore` —que ya mira qué tipo de final dibuja el recorrido—
             * esté entre los mejores del pelotón (`helpBackStageFavouriteTeams`).
             *
             * Y OJO CON EL PERCANCE QUE SE USA, que es donde la primera versión de esto se equivocó:
             * pedir `hurt` (la caída SERIA de la v20) hacía la regla IMPOSIBLE, porque una caída
             * seria cuesta 60-300 s y la condición de «distancia pequeña» son 60. Medido: 0 avisos
             * en 120 etapas. La caída que deja al hombre a una distancia que todavía se cierra es la
             * LEVE —30-90 s, el 90 % de las caídas—, y ésa es la que ahora se mira. La seria sigue
             * contando si por lo que sea el hueco se queda corto, que también pasa.
             */
            const favoritoDeHoy =
              plan.stageCandidateId === leaderId &&
              jefe.mishapKm !== null &&
              km - jefe.mishapKm <= STAGE.helpBackMishapKm &&
              [...teamPlans.values()].filter((p) => p.quality > plan.quality).length <
                STAGE.helpBackStageFavouriteTeams
            const conEl = plan.memberIds.filter(
              (id) => id !== leaderId && sims.get(id)?.groupId === jefe.groupId,
            ).length
            /**
             * DE DÓNDE SALE EL QUE BAJA, que es la otra decisión y la dio el dueño: «alguien de la
             * fuga no lo mandes para atrás… alguien del pelotón sí. Salvo que sea con carrera
             * rota… y uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo».
             *
             * Las tres clases de grupo del motor lo dicen solas, sin inventar ninguna bandera:
             *
             * - **de la CABEZA DE CARRERA no baja nadie.** El que va delante del todo se está
             *   jugando la carrera y es lo único que su equipo tiene ahí fuera; lo que hace es
             *   dejar de tirar (ver `jefeEnApuros`), no dar media vuelta.
             * - **del pelotón, sí**, que es el caso normal.
             * - **de un grupo de PERSEGUIDORES, también** (v37, corrección del dueño: «si va en un
             *   grupo de perseguidores y su jefe está en problemas… pues ahí sí, que se descuelgue»).
             *   Da igual que el motor lo llame `mov` o `shed`: lo que decide no es de dónde nació el
             *   grupo, es si va en cabeza de carrera o persiguiendo a alguien.
             * - **y con la CARRERA ROTA, de cualquier grupo que vaya por delante del suyo**: el que
             *   rueda en el segundo grupo no corre por nada que su equipo pueda ganar, así que
             *   espera al jefe del tercero.
             *
             * Y el que ya va por detrás en un grupeto NO cuenta: esperar hacia atrás no existe.
             */
            // La CABEZA DE CARRERA: el movimiento que va delante del todo, o el pelotón si no hay
            // ninguno por delante. Se calcula aquí y no se toma de la telemetría de más abajo
            // porque esta decisión ocurre antes en el bloque.
            let cabeza = PELOTON
            let relojCabeza = peloton.tS
            for (const mv of moves) {
              if (membersOf(mv.g.id).length === 0) continue
              if (mv.g.tS < relojCabeza) {
                relojCabeza = mv.g.tS
                cabeza = mv.g.id
              }
            }
            const relojDe = (groupId: string): number | null => {
              if (groupId === PELOTON) return peloton.tS
              const mv = moves.find((x) => x.g.id === groupId)
              if (mv) return mv.g.tS
              return shed.find((g) => g.id === groupId)?.tS ?? null
            }
            const puedeBajar = (m: RiderSim): boolean => {
              if (m.groupId === bunchNow) return true
              if (m.groupId === cabeza || m.groupId === suGrupo.id) return false
              const suyo = relojDe(m.groupId)
              return suyo !== null && suyo < suGrupo.tS
            }
            // Quién PUEDE ir: los suyos, enteros y no rebeldes (§VI.2: el que corre por su cuenta no
            // trabaja para el equipo aunque lleve su maillot).
            const disponibles = plan.memberIds
              .filter((id) => id !== leaderId && !rebels.has(id))
              // …y la carta del día no se sacrifica: si el equipo además se juega la etapa con otro
              // hombre, ése se queda delante. Un equipo puede perder a su jefe y ganar la etapa.
              .filter((id) => id !== plan.stageCandidateId || !plan.purposes.includes('etapa'))
              .map((id) => sims.get(id))
              .filter(
                (m): m is RiderSim =>
                  m != null &&
                  puedeBajar(m) &&
                  !m.hurt &&
                  !m.gaveUp &&
                  m.energy0 > 0 &&
                  m.energy / m.energy0 >= STAGE.helpBackMinFreshness,
              )
            // El hombre que se queda delante es un hombre EN EL PELOTÓN: si no queda ninguno ahí, no
            // hay nada que guardar y bajan todos los que puedan.
            const guarda = Math.min(
              STAGE.helpBackGcKeepInBunch,
              disponibles.filter((m) => m.groupId === bunchNow).length,
            )
            const quiere = porLaGeneral
              ? disponibles.length - guarda
              : favoritoDeHoy && gap <= STAGE.helpBackStageGapSeconds
                ? STAGE.helpBackStageHelpers - conEl
                : 0
            const cuantos = Math.min(disponibles.length, Math.max(0, quiere))
            if (cuantos === 0) continue
            // …y van los que MÁS ENTEROS estén, que es a quien manda un director. Desempate por id
            // para que el orden de entrada no decida quién se sacrifica.
            const van = disponibles
              .sort(
                (a, b) =>
                  // Primero el que ya va a medio camino: el del grupo de delante espera, y el del
                  // pelotón solo baja si con eso no basta.
                  Number(a.groupId === bunchNow) - Number(b.groupId === bunchNow) ||
                  b.energy / b.energy0 - a.energy / a.energy0 ||
                  (a.input.riderId < b.input.riderId ? -1 : 1),
              )
              .slice(0, cuantos)
            for (const m of van) {
              m.groupId = suGrupo.id
              m.pulling = false
              suGrupo.riderIds = [...suGrupo.riderIds, m.input.riderId]
            }
            log.emit(
              km,
              suGrupo.tS,
              'ayuda_al_jefe',
              'domestiques_drop_back',
              van.map((m) => m.input.riderId).slice(0, STAGE.pullNamesMax),
              {
                // La convención de la crónica: un dato acabado en `Id` con un corredor conocido
                // viaja resuelto a la web sin darlo de alta en ninguna tabla (apps/api/chronicle).
                jefeId: leaderId,
                cuantos: van.length,
                gapS: Math.round(gap),
                porQue: porLaGeneral ? 'general' : 'etapa',
                toGo: Math.round(kmRestantes),
              },
            )
          }
        }
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
        ...moves.map((m) => ({ g: m.g, rank: MOVE_RANK })),
        { g: peloton, rank: PELOTON_RANK },
        ...shed.map((g) => ({ g, rank: SHED_RANK })),
      ]
        .map((x) => ({ g: x.g, rank: x.rank, members: membersOf(x.g.id) }))
        .filter((x) => x.members.length > 0)
        .sort((a, b) => a.g.tS - b.g.tS || a.rank - b.rank)
      const racing = liveGroups.reduce((c, x) => c + x.members.length, 0)
      const lead = liveGroups[0]
      /**
       * QUIÉN ES EL PELOTÓN AHORA MISMO (v29, `mainGroupId` en stage/group.ts). Hasta aquí el rango
       * de un grupo era su ORIGEN —el que salió del pelotón era «el pelotón» aunque le quedaran dos
       * corredores, y el que se descolgó era «grupeto» aunque llevara cien—, y de esa etiqueta
       * colgaban la crónica y la medida del boquete. El pelotón es EL GRUPO QUE LLEVA LA GENTE.
       */
      mainId = mainGroupId(
        liveGroups.map((x) => ({ id: x.g.id, size: x.members.length })),
        mainId,
        STAGE.mainGroupTakeoverRatio,
      )
      const mainIdx = liveGroups.findIndex((x) => x.g.id === mainId)
      /**
       * CONTRA QUÉ SE MIDE EL BOQUETE (v25 + v27). La regla entera —y el porqué de cada mitad— está
       * en `chaseReferenceIndex` (stage/group.ts), que es pura y tiene sus propios casos: el puente
       * en solitario de Race Jaén que se convertía en «la caza», y el grupeto de Race Andalucía
       * contra el que se midió la ventaja trece kilómetros mientras la etapa la decidían otros.
       */
      const behind = liveGroups.slice(1)
      const chaseIdx = chaseReferenceIndex(
        // …Y «SEGUIR EN CARRERA» ES IR DELANTE DEL PELOTÓN O SER EL PELOTÓN (v29). Era `rank !==
        // SHED_RANK`, es decir el ORIGEN: un grupo de cien descolgados no contaba como carrera y
        // dos corredores que salieron del pelotón sí. Grupeto es quien va por DETRÁS del grueso,
        // venga de donde venga; y `liveGroups` va en orden de carretera, así que la posición lo dice.
        behind.map((x, i) => ({ size: x.members.length, racing: mainIdx < 0 || i + 1 <= mainIdx })),
        STAGE.gapChaseMainFraction,
      )
      const chase = chaseIdx >= 0 ? behind[chaseIdx] : undefined
      /**
       * QUÉ ES ESE GRUPO, para que la frase pueda nombrarlo (v27). El vocabulario de grupos de
       * SPEC 6.15 y docs/motor.md §16 tiene tres palabras y ésta es la que las reparte: si el grupo contra
       * el que se mide es el PELOTÓN y sigue siendo el grueso de la carrera, es «the bunch»; si es un
       * trozo de carrera que persigue por delante del resto, es «the chase group». Sin este dato la
       * crónica llamaba a las dos cosas igual, y desde una criba son grupos distintos.
       */
      // …y «el pelotón» es el grupo que lleva la gente (v29), no el que salió con ese nombre.
      const chaseIsBunch =
        chase !== undefined && chase.g.id === mainId && chase.members.length * 2 >= racing
      const chaseKind = chaseIsBunch ? 'peloton' : 'caza'

      // Parte de cabeza: cuando delante quedan pocos, se dice QUIÉNES son. Es la pregunta directa
      // del dueño ("hay 5 ciclistas, ¡podrías haber dicho cuáles!"). Solo si la COMPOSICIÓN ha
      // cambiado desde el último parte, así una fuga estable no repite la lista cada cinco km.
      let frontReported = false
      /**
       * …Y NO SE HABLA DE UN GRUPO CUYA SALIDA NO SE HA CONTADO (v25). El parte de cabeza nombraba a
       * los de delante en cuanto eran pocos, aunque el movimiento que los puso ahí no tuviera frase
       * —porque saltó en el kilómetro cero, donde la crónica no narra ataques desde la v21, o porque
       * el throttle de intentos se lo comió—. El resultado es la primera línea del diario: «ya solo
       * quedan ocho delante» con ocho nombres que el lector no ha visto salir y que no volverá a
       * ver. La fuga del día siempre tiene su frase (`breakaway_formed`), así que nunca se calla.
       */
      const leadMove = lead ? moves.find((m) => m.g.id === lead.g.id) : undefined
      const leadTold = leadMove === undefined || leadMove.dayBreak || leadMove.narrated
      if (lead && leadTold) {
        const size = lead.members.length
        const ids = lead.members.map((m) => m.input.riderId)
        // …y CAMBIAR es cambiar de gente, no de número (v25). Con el tamaño solo, una fuga de dos
        // que pierde a uno y gana a otro seguía siendo «dos delante» y el relevo se hacía en
        // silencio: es exactamente lo que pasó entre el km 1 y el km 156 de Race Jaén.
        const entran = ids.filter((id) => !lastFrontIds.includes(id))
        const salen = lastFrontIds.filter((id) => !ids.includes(id))
        if (size > STAGE.frontNamesMaxRiders) {
          // Con el pelotón entero en cabeza no hay «grupo de cabeza» en la cabeza del lector, así
          // que el próximo parte pequeño es una fuga que NACE y no un grupo que cambia: si no se
          // olvidara, el primer parte de una fuga de ocho saldría con «salen: 118».
          lastFrontIds = []
        } else if (
          (entran.length > 0 || salen.length > 0) &&
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
            // SOBRE QUIÉN (v27). La ventaja sin la referencia es media respuesta: el lector tiene
            // que poder decir sobre quién se lleva, y desde una criba «el pelotón» y «la caza» son
            // grupos distintos.
            ...(chase ? { chaseSize: chase.members.length, chaseKind } : {}),
            // EL PARTE CUENTA EL CAMBIO, no solo la foto: cuántos han llegado y cuántos se han
            // caído desde la última vez. Es lo que hace que «ya solo quedan N delante» deje de
            // anunciarse con N CRECIENDO —69 veces en 31 etapas del día de juego 46— y que el
            // lector pueda seguir a un grupo que se recompone por dentro. Van por NÚMERO y no por
            // nombre porque los nombres ya están todos en la propia lista de protagonistas: lo que
            // falta no es quiénes van delante, es qué ha cambiado desde la última vez que se dijo.
            ...(lastFrontIds.length > 0 && entran.length > 0 ? { entran: entran.length } : {}),
            ...(salen.length > 0 ? { salen: salen.length } : {}),
          })
          lastFrontReportKm = km
          lastFrontIds = ids
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
          /**
           * EL PARTE DE VENTAJA DICE QUIÉN VA DELANTE (v27). Salía sin un solo protagonista: «the
           * lead grows and grows for the lone leader — 2:57 to 6:53». El lector lleva cien
           * kilómetros leyendo la ventaja de un hombre del que no se le dice el nombre, y cuando
           * ese hombre gana la etapa no lo reconoce. Con la cabeza pequeña se nombra —es la misma
           * regla y el mismo umbral del parte de cabeza—; con un grupo grande la frase habla del
           * grupo, que es lo que un lector puede seguir.
           */
          const leadNames =
            lead.members.length <= STAGE.frontNamesMaxRiders
              ? lead.members
                  .map((m) => ({ id: m.input.riderId, p: riderPerfil(m, block) }))
                  .sort((a, b) => b.p - a.p || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
                  .slice(0, 3)
                  .map((x) => x.id)
              : []
          log.emit(km, lead.g.tS, 'boquete', 'time_gap', leadNames, {
            gapS: Math.round(frontGap),
            trend,
            leadSize: lead.members.length,
            chaseSize: chase.members.length,
            // …SOBRE QUIÉN y CUÁNTO QUEDA: las otras dos preguntas de la regla de la v27. El parte
            // llevaba la ventaja y el tamaño de los dos grupos, y no el punto de la carretera en el
            // que se lee, que es lo que convierte un número en una situación de carrera.
            chaseKind,
            toGo: Math.round(kmRestantes),
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
          // Y el que se rindió no tira (v21): desde esta versión tampoco entra en el turno de
          // relevos, pero su ventana de trabajo tarda unos kilómetros en olvidarse y podría seguir
          // encabezando el parte. El que se ha dejado ir no es quien lleva el pelotón.
          pelotonNow
            .filter((m) => !m.gaveUp)
            .map((m): [string, number] => [m.input.riderId, m.pullWindow]),
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
          // POR QUÉ TIRA ESE EQUIPO (v15, docs/motor.md §V.1). El dueño lo pidió literal: «no es
          // solo saber qué equipo(s) participan de la persecución… también es saber POR QUÉ». Solo
          // se dice cuando los que tiran son TODOS del mismo equipo: si es una alianza, el motivo
          // de cada uno es distinto y una sola palabra mentiría.
          const pullTeams = new Set(pull.ids.map((id) => teamOf.get(id) ?? ''))
          const pullTeam = pullTeams.size === 1 ? ([...pullTeams][0] ?? '') : ''
          const porQue = pullTeam !== '' ? purposeOfTeam(pullTeam) : null
          log.emit(km, peloton.tS, 'tiran', 'peloton_pull', pull.ids, {
            commit: Math.round(100 * c) / 100,
            // POR QUÉ tiran (v13): `forKind` dice de qué clase de trabajo se trata y `forId`, cuando
            // hay uno solo, a quién sirve. Nadie se desgasta al frente por gusto: o es el equipo de
            // un jefe de filas, o es el tren de un sprinter, o son varios equipos coincidiendo en
            // que hay que cazar. Y si de verdad no hay nadie detrás de ese esfuerzo, se dice.
            forKind: why.kind,
            ...(why.targetId ? { forId: why.targetId } : {}),
            ...(why.leaders > 1 ? { forLeaders: why.leaders } : {}),
            // …y el MOTIVO del equipo que tira: por la etapa (tienen al favorito de hoy), por el
            // maillot (es suyo y lo de delante lo amenaza) o por la general (su favorito se la
            // juega igual). Ausente si no tira un equipo, o si tira sin motivo ninguno.
            ...(porQue != null && porQue !== 'ninguno' ? { porQue } : {}),
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
        : bunchFinish && kmRestantes <= STAGE.finalDriveKm
          ? gear.finalDrive
          : STAGE.pelotonTempoCommit
      // Con la carretera despejada la pregunta de si la caza es viable se hace de cero: haber
      // claudicado ante la fuga del día no significa regalar el siguiente movimiento.
      if (moves.length === 0) chaseAbandoned = false
      let target: number = freeRunTarget
      // Reglas 4 y 5: mientras haya en carretera un movimiento al que el pelotón NO ha dado cuerda,
      // el pelotón lo cierra. Es lo que hace que la mayoría de los intentos fracasen —y lo que hace
      // que hagan falta varios antes de que cuaje la fuga del día— sin necesidad de un dado aparte.
      //
      // …PERO ESO VALE MIENTRAS SON INTENTOS (v23, docs/balance.md «v23»). `allowed` se decide UNA
      // vez, en el km en que nace el movimiento, y hasta la v22 no se revisaba jamás: un movimiento
      // al que el pelotón dijo que no y que aun así CUAJÓ se quedaba en el limbo el resto de la
      // etapa. Y en ese limbo pasaban dos cosas a la vez, las dos malas: el pelotón se clavaba en
      // `tacticControlCommit` = 0,72 —un valor FIJO, que ignora si el boquete es de 20 s o de 4
      // minutos, porque el controlador de la caza vive en la rama de al lado y no llegaba a
      // ejecutarse nunca— y la capa táctica se congelaba, porque mientras se cierra no salta nadie
      // (ver `closingNow`). Medido en Race Almeria e1: cuatro intentos sin cuerda, el último en el
      // km 19, la fuga del día formada en el 19 y **ni un solo `sprinters_chase` ni un solo intento
      // más en los 190 km siguientes**, con el pelotón a 0,72 clavado y el escapado ganando solo.
      //
      // La fuga DEL DÍA no es un intento: es el que ganó la aduana. A partir de ahí la pregunta ya
      // no es «cierro este hueco» sino «cazo o concedo», y ésa la contesta el controlador de la caza
      // con su lazo cerrado, su narración y su claudicación.
      const closing = moves.length > 0 && !moves.some((m) => m.allowed || m.dayBreak)
      if (closing) {
        target = Math.max(freeRunTarget, STAGE.tacticControlCommit)
      } else if (ahead && chasingSprinters && !chaseAbandoned) {
        // Los equipos de los sprinters se ponen a tirar para cazar: se narra una vez, pasada cierta
        // parte del recorrido (antes la fuga tiene su cuerda), si aún no han claudicado.
        if (!chaseAnnounced && km >= totalKm * STAGE.chaseAnnounceFrac) {
          chaseAnnounced = true
          const porQue = purposeOfTeam(frontTeamId)
          log.emit(
            km,
            peloton.tS,
            'persecucion',
            'sprinters_chase',
            leadSprinterId ? [leadSprinterId] : [],
            // El motivo del equipo que ha tomado el frente (v15): la caza de una llana casi siempre
            // es «por la etapa», pero la del equipo del maillot ante una fuga peligrosa no lo es.
            porQue != null && porQue !== 'ninguno' ? { porQue } : {},
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
      // …Y EL HUMOR DEL DÍA (v38): hay días en que el pelotón echa la hueva y deja hacer. Se aplica
      // aquí, sobre lo que el pelotón DECIDE, y no más abajo: los suelos del tirón final y del pavé
      // no son ganas, son la carretera obligando, y ésos no dependen del humor de nadie.
      target = Math.max(0.1, Math.min(1, target * humorDelPeloton))
      // En los últimos km de una etapa de meta llana los trenes toman la carretera y el pelotón
      // vuela: el controlador de boquete NO puede dejarlo rodar por debajo de eso. Sin este suelo,
      // un ataque tardío de 20 s hacía que el lazo cerrado pidiera 0,72 —menos que el 0,85 del
      // tirón final— y el pelotón AFLOJABA por tener a alguien delante, regalando la etapa.
      if (bunchFinish && kmRestantes <= STAGE.finalDriveKm && !chaseAbandoned) {
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
      /**
       * …Y UN FRENTE SIN DUEÑO TIRA MENOS (v35, §V.1). La segunda mitad de la frase del dueño —«si
       * el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren, pero con MENOR
       * INTENSIDAD»—. Quién paga el viento lo decide `relayTurn`; a qué velocidad se va, esto: un
       * acuerdo entre equipos no es un tren, y el pelotón que nadie lleva rueda algo más despacio.
       * Con el campo sin equipos (`teamPlans` vacío) no hay dueño posible y esto no se aplica: el
       * banco canónico y sus huellas selladas no lo ven.
       */
      if (teamPlans.size > 0 && frontTeamId === null) target *= STAGE.noOwnerCommitFactor
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
    /**
     * ¿QUIÉN TIENE A SU JEFE EN APUROS POR DETRÁS? (v37, §V.1). El dueño, sobre el gregario que va
     * en la fuga: «si va en cabeza de carrera lo normal es que no se deje caer, pero que tampoco
     * tire de la fuga (salvo que vaya solo, claro está)».
     *
     * Es la misma idea que la v33 —el que no colabora en la fuga porque los suyos la persiguen— con
     * otro motivo: aquí no es que su equipo esté cazando, es que su jefe se ha quedado y esto ya no
     * le sirve para nada. Lo que se hace con él es lo mismo: sale del turno. Y no se le manda atrás,
     * porque en cabeza de carrera está lo único que su equipo tiene en la carretera.
     *
     * «Salvo que vaya solo» sale gratis: `relayTurn` garantiza que siempre tire alguien, así que un
     * escapado en solitario da la cara igual por mucho que su jefe se haya quedado.
     */
    const jefeEnApuros = new Set<string>()
    for (const plan of teamPlans.values()) {
      const leaderId = plan.leaderId
      if (leaderId == null) continue
      const jefe = sims.get(leaderId)
      if (!jefe || jefe.finishTs !== null || jefe.abandonedKm !== null) continue
      const suGrupo = shed.find((g) => g.id === jefe.groupId)
      if (!suGrupo) continue
      const gap = suGrupo.tS - peloton.tS
      if (gap < STAGE.regroupGapSeconds || gap > STAGE.helpBackMaxGapSeconds) continue
      // …y el que ya está CON él no cuenta: ése ha bajado a ayudarle y tira, que es a lo que fue.
      for (const id of plan.memberIds) {
        if (id === leaderId) continue
        const m = sims.get(id)
        if (m && m.groupId !== jefe.groupId) jefeEnApuros.add(id)
      }
    }

    /**
     * EL QUE NO TIENE NADA QUE GANAR AQUÍ NO COLABORA (v39, `tactics.ts::noChanceToWin`), y de
     * cuánta gente esté en ese caso depende también LO FUERTE QUE TIRE EL GRUPO. Devuelve las dos
     * cosas de una: la función por corredor y la media del grupo.
     *
     * Se mide contra el MEJOR DE ESTE GRUPO en el final que viene, con el tipo de final calculado
     * para el tamaño que tiene el grupo AHORA: los seis de una fuga se juegan un sprint reducido, no
     * el masivo del pelotón, y contra un puerto se juegan otra cosa distinta. Por eso la misma
     * cuenta sirve para el velocista que pierde el sprint y para el rodador que va con un escalador:
     * lo que cambia son los pesos del final, y eso lo sabe `finishScore`.
     *
     * Se aplica a TODOS los grupos, incluido el pelotón, y no hace falta ninguna excepción: lo que
     * cada uno deja de colaborar se pesa dentro de `relayTurn` contra el empuje de su equipo, así
     * que el gregario que tira por su jefe lo ignora entero. Ponerle un «salvo el pelotón» delante
     * fue el primer intento y estaba mal, porque el grupo de treinta que decide una media montaña
     * lleva el id del pelotón aunque hace rato que no lo es.
     *
     * …Y SOLO EN UN GRUPO QUE YA ES UNA SELECCIÓN, no en la carrera entera. Aplicado al pelotón en
     * bloque apagaba a los TRENES en el último kilómetro —ahí nadie más que el velocista puede
     * ganar, así que el término valía 1 para casi todos— y una llegada masiva pasaba a rodar con
     * seis hombres dando la cara en vez de veinte. En carretera es al revés: un sprint es lo más
     * rápido que va un pelotón en todo el día. La frontera no es «pelotón sí o no» sino qué fracción
     * de la carrera queda ahí dentro: un grupo que es TODA la carrera rueda con los planes de equipo
     * (§V.1); uno que es una selección rueda con el interés de cada uno.
     */
    const interésPropio = (
      members: RiderSim[],
    ): { de: (riderId: string) => number; media: number } => {
      if (members.length <= 1) return { de: () => 0, media: 0 }
      const selección = 1 - clamp(members.length / Math.max(1, racingNow), 0, 1)
      const tipo = finishType(finishTerrain, members.length)
      const remate = new Map<string, number>()
      let mejor = Number.NEGATIVE_INFINITY
      for (const m of members) {
        const v = finishScore(riderEff(m), tipo)
        remate.set(m.input.riderId, v)
        if (v > mejor) mejor = v
      }
      const kmToGo = totalKm - km
      const de = (riderId: string): number =>
        selección * noChanceToWin(remate.get(riderId) ?? mejor, mejor, kmToGo)
      let suma = 0
      for (const m of members) suma += de(m.input.riderId)
      return { de, media: suma / members.length }
    }

    const advance = (
      group: Group,
      members: RiderSim[],
      paceFraction: number,
      kind: 'peloton' | 'move' | 'shed' = 'shed',
    ): Group => {
      if (members.length === 0) return group
      /**
       * ¿ES ESTE GRUPO EL PELOTÓN? Por la GENTE que lleva y no por el id con el que nació (v33, la
       * deuda que dejó escrita la v29). De esto cuelgan el equipo al frente y el libro del trabajo,
       * y estaban atados a `kind === 'peloton'`: un `shed-N` que ya era el grueso de la carrera no
       * podía tener equipo al frente, y su trabajo no se apuntaba.
       */
      const isBunch = group.id === (mainId ?? PELOTON)
      const idSet = new Set(members.map((m) => m.input.riderId))
      /**
       * SE PROBÓ QUE EL GRUPO RODARA AL RITMO DEL JEFE Y NO SE HA HECHO (v36). La idea: los
       * gregarios que bajan a por su jefe llegan enteros, así que su P75 marcaría un ritmo que el
       * jefe reventado no puede seguir. Suena a carretera —un gregario rueda a lo que puede su
       * jefe— y el motor ya tiene el número para eso (`markDraftTolerance`, el +4 del marcaje).
       *
       * NO se hace por dos motivos, los dos medidos. **No hace falta**: `shatter` no se ejecuta
       * sobre los grupos de descolgados, así que un grupeto NUNCA suelta a nadie —el jefe no puede
       * quedarse atrás de su propio rescate—; y **rompe justo lo que viene a arreglar**: con el tope
       * puesto, el jefe al que bajan a buscar volvía el 66 % de las veces contra el 70 % del que se
       * quedaba solo (en llano, 68 % contra 82 %), o sea que la ayuda le PERJUDICABA. Sin el tope,
       * 81 % contra 63 %. Un grupeto rueda al ritmo de sus hombres fuertes y los demás van a rueda:
       * es el modelo que el motor ya tenía para todos los grupetos, y el rescate no es una excepción.
       */
      const p75 = pacemakerP75(members, block, paceFraction)
      /**
       * EL QUE NO TIENE NADA QUE GANAR AQUÍ NO COLABORA (v39, `tactics.ts::noChanceToWin`). El
       * dueño: «en un grupo de seis a ocho kilómetros de meta relevan los seis, incluido el que sabe
       * que pierde el sprint… y si en la fuga van con un súper escalador y tú eres mal escalador, lo
       * normal es que no cooperes».
       *
       * Se mide contra el MEJOR DE ESTE GRUPO en el final que viene, con el tipo de final calculado
       * para el tamaño que tiene el grupo AHORA: los seis de una fuga se juegan un sprint reducido,
       * no el masivo del pelotón, y contra un puerto se juegan otra cosa distinta. Por eso la misma
       * cuenta sirve para el velocista que pierde el sprint y para el rodador que va con un
       * escalador: lo que cambia son los pesos del final, y eso lo sabe `finishScore`.
       *
       * Se aplica a TODOS los grupos, incluido el pelotón, y no hace falta ninguna excepción: lo
       * que cada uno deja de colaborar se pesa dentro de `relayTurn` contra el empuje de su equipo,
       * así que el gregario que tira por su jefe lo ignora entero. Ponerle un «salvo el pelotón»
       * delante fue el primer intento y estaba mal, porque el grupo de treinta que decide una media
       * montaña lleva el id del pelotón aunque hace rato que no lo es.
       */
      /**
       * …Y SOLO EN UN GRUPO QUE YA ES UNA SELECCIÓN, no en la carrera entera. Es la otra mitad del
       * encaje, y la aprendí midiendo: aplicado al pelotón en bloque apagaba a los TRENES en el
       * último kilómetro —ahí nadie más que el velocista puede ganar, así que el término valía 1
       * para casi todos— y una llegada masiva pasaba a rodar con seis hombres dando la cara en vez
       * de veinte. En carretera es al revés: un sprint es lo más rápido que va un pelotón en todo
       * el día, precisamente porque los trenes van a tumba abierta.
       *
       * La frontera no es «pelotón sí o no» —el grupo de treinta que decide una media montaña lleva
       * el id del pelotón y hace rato que no lo es—: es qué fracción de la carrera queda ahí dentro.
       * Un grupo que es TODA la carrera rueda con los planes de equipo (§V.1, que ya modela quién
       * tira y por qué); un grupo que es una selección rueda con el interés de cada uno. Es la misma
       * cohesión que la capa táctica usa para el λ del ataque, leída al revés.
       */
      const sinOpciones = interésPropio(members).de
      /**
       * EL QUE NO COLABORA EN LA FUGA PORQUE LOS SUYOS LA PERSIGUEN (v33). La queja, textual: «hay
       * un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1 ciclista tirando de la
       * fuga… eso es sabotearse a su trabajo». Y la salida es la que da el dueño: el que sobra no es
       * el de atrás sino el de delante —«el escapado de ese equipo no debería entrar a los relevos…
       * así además llega más fresco al final»—, porque el equipo del maillot SÍ tiene que cerrar el
       * boquete aunque el fugado sea suyo, y esa excepción es correcta.
       *
       * El turno tiene tamaño fijo, así que apartarlo no frena al grupo: releva otro en su lugar.
       */
      const relayers = relayTurn(
        members,
        idSet,
        paceFraction,
        domestiquesFor,
        // EL EMPUJE DE EQUIPO MANDA EN EL PELOTÓN, NO EN LA FUGA (v38). El plan de equipo decide qué
        // hace el equipo CON EL PELOTÓN; dentro de una fuga se relevan todos, que es lo que una fuga
        // es. Sin esto, el fugado cuyo equipo tiene un hombre delante —él mismo— se llevaba el
        // castigo de «no persigas lo tuyo» y no tiraba de su propia fuga.
        (riderId) => (isBunch ? driveOfRider(riderId) : 0),
        (riderId) =>
          (!isBunch && frontTeamId !== null && teamOf.get(riderId) === frontTeamId) ||
          // …o su jefe se ha quedado atrás (v37): en la fuga ya no tira, pero no se le manda atrás.
          (!isBunch && jefeEnApuros.has(riderId)),
        isBunch,
        teamPlans.size > 0,
        (riderId) => isBunch && frontTeamId !== null && teamOf.get(riderId) === frontTeamId,
        sinOpciones,
      )
      /**
       * CUÁNTOS SE REPARTEN EL VIENTO AL FRENTE: LOS QUE TIRAN, y punto (v38).
       *
       * Hasta hace nada aquí había DOS cuentas distintas —una para la velocidad («cuántos caben en
       * la carretera») y otra para el coste («quién acaba pagándolo»)— porque los filtros de equipo
       * podían dejar tirando a tres hombres de un pelotón entero y atar la velocidad a eso hundía la
       * carrera. Con el turno decidido por UMBRAL ya no hace falta: si el frente tiene dueño es
       * porque el empuje de su equipo pone a los suyos por encima del umbral, y ésos son a la vez
       * los que dan la cara y los que la pagan. Una cuenta, no dos.
       */
      const alFrente = relayers.size
      const next = advanceGroup(group, block, p75, alFrente, { isFinal })
      /**
       * LO QUE VALE UN RELEVO EN ESTE BLOQUE, MEDIDO POR EL VIENTO Y NO POR LA VELOCIDAD (v26).
       *
       * Era `max(0, compromiso − frontWorkIdleCommit)`, y eso es un número de VELOCIDAD: con una
       * fuga de seis rodando a 0,44 daba **cero**, así que seis hombres dos minutos por delante de
       * un pelotón de ciento cincuenta durante 150 km tenían anotado que no habían hecho nada en
       * todo el día. De ahí colgaban tres defectos: `break_share` se repartía sobre ceros, la
       * reserva de un fugado se recargaba como la de uno que va a rueda, y su TSS iba subestimado.
       *
       * Ahora se mide con `riderEffort` —el compromiso por el viento que de verdad le toca dar
       * (`1 − draftMax·shelter`)— contra el esfuerzo de referencia de un corredor ARROPADO en un
       * grupo que rueda al tempo. Es el argumento de `droppedCommit` (v16) —«relevarse reparte el
       * viento; el que va solo da la cara el 100 %»— cobrado en TRABAJO en vez de en velocidad.
       *
       * Se calcula por CORREDOR y no por grupo, porque el viento que te toca depende de tu turno:
       * el que da la cara al frente del pelotón, el que releva en una fuga y el que va a rueda no
       * están haciendo lo mismo. Para el pelotón el número sale casi igual que antes (un relevo a
       * 0,85 daba 0,35 y da 0,40), así que la voz de la crónica no se mueve.
       */
      const idle = idleEffort(block)
      const workOf = (shelter: number): number =>
        Math.max(0, riderEffort(block, group.compromiso, shelter) - idle) * STAGE.dx
      // Para las decisiones que son del GRUPO —a quién se persigue— vale el del que tira.
      const frontEffort = workOf(shelterOf(true, relayers.size))
      // Los movimientos que van por DELANTE de este grupo: lo que se releva aquí es trabajo de
      // persecución contra ellos, y es lo que se nombra al cazarlos.
      const chased =
        kind === 'shed' || frontEffort <= 0
          ? []
          : moves.filter((mv) => mv.g.id !== group.id && mv.g.tS < group.tS)
      const blockS = blockSeconds(next.vActual)
      for (const m of members) {
        // EL ACORDEÓN SE CIERRA EN EL LLANO (v26). La deriva es la goma de un grupo estirado por una
        // rampa; en cuanto el terreno deja de seleccionar, el que iba diez segundos por detrás
        // DENTRO del grupo vuelve a la fila —con un 42 % de rebufo y sin gravedad, cerrar eso son
        // doscientos metros—. Sin esto, un corredor que cediera unos segundos en una cota del km 40
        // los arrastraba hasta la meta ciento cuarenta kilómetros después, que es exactamente el
        // fantasma que la v16 quitó por el otro lado.
        if (block.tipo === 'llano') m.driftS = 0
      }
      for (const m of members) {
        // O TIRA O NO TIRA (v34). Aquí había un tercer estado —«va en el turno pero colocado detrás
        // de los que dan la cara»— que era un nombre para un continuo y dejaba al 41,5 % del
        // pelotón pagando un viento intermedio que nadie paga en la carretera. Ya no: el que está
        // en la rotación paga el viento repartido entre los que rotan (`shelterOf`) y el que no,
        // va a rueda. Lo que SÍ sigue existiendo es el DUEÑO del frente (`frontTeamId`), que es
        // cosa de equipos y no de rebufo: decide quién entra a la rotación (`relayDuty`) y quién
        // gasta presupuesto, unas líneas más abajo.
        const pulling = relayers.has(m.input.riderId)
        // …y aquí se ANOTA, solo si alguien ha pedido una foto (v28). El turno se decide cada bloque
        // y se consumía en el sitio; la radio de carrera necesita justo esto para poder decir quién
        // va tirando en el kilómetro que se mira. No lo lee nadie más.
        if (probe) m.pulling = pulling
        const shelter = shelterOf(pulling, relayers.size)
        const mineEffort = workOf(shelter)
        if (pulling && mineEffort > 0) {
          if (isBunch) {
            m.frontWorkPeloton += mineEffort
            // El parte responde «quién tira AHORA», y desde la v34 todos los que tiran pagan lo
            // mismo, así que lo que ordena esta ventana es cuántos bloques lleva cada uno en la
            // rotación. Es observación, no física: no mueve un segundo.
            m.pullWindow += mineEffort
            // …y se lo apunta a SU EQUIPO (v15, §V.1). Es el presupuesto que se agota: cuando un
            // equipo lleva 80 km al frente sus hombres salen del turno y el frente cambia de dueño.
            // El rebelde no gasta presupuesto de nadie: no tira por su equipo.
            const team = rebels.has(m.input.riderId) ? undefined : teamOf.get(m.input.riderId)
            if (team != null) teamSpent.set(team, (teamSpent.get(team) ?? 0) + mineEffort)
          } else if (kind === 'move') {
            m.frontWorkMove += mineEffort
          }
          for (const mv of chased) {
            mv.chaseLedger.set(
              m.input.riderId,
              (mv.chaseLedger.get(m.input.riderId) ?? 0) + mineEffort,
            )
          }
        }
        /**
         * LA RESERVA SE RECARGA A RUEDA Y SE GASTA DANDO LA CARA (v26, corrección de la primera
         * entrega). Estaba mal, y el defecto era exactamente el que dejó `mountain.breakawayWinPct`
         * en el 61 % contra una banda de 25-45: los 120 del pelotón que van a rueda y los 6 de una
         * fuga que llevan 150 km relevándose recargaban **igual**, así que la fuga llegaba al puerto
         * final con el depósito lleno, sus gregarios aguantaban la rueda del mejor y no se deshacía.
         *
         * W′ solo se recarga POR DEBAJO del umbral, y ahí está todo dicho. Los dos términos que
         * deciden si vas por debajo o por encima ya los tenía el motor y no había que inventar
         * ninguna constante:
         *
         * - `cover` = cuánto rebufo estás recibiendo, normalizado sobre `shelterProtected`: 1 a
         *   rueda, 0,56 relevando en una fuga, 0,44 dando la cara al frente del pelotón, 0 solo.
         * - `push` = cuánto aprieta tu grupo por encima del tempo de carretera.
         *
         * El saldo es la resta. Un pelotón a tempo con el corredor arropado recarga a plena
         * velocidad; una fuga de seis a bloque, en la que TODOS relevan, tiene saldo negativo y va
         * mordiendo la reserva kilómetro a kilómetro. Es la física que faltaba —una fuga se caza en
         * el puerto final porque lleva todo el día trabajando, no porque una perilla lo diga— y por
         * eso el que se descuelga solo tampoco recupera nunca: paga el viento entero.
         */
        if (!spentReserve.has(m.input.riderId)) {
          // …Y EL SALDO SALE DE LA MISMA CUENTA. W′ solo se recarga POR DEBAJO del umbral, así que
          // el saldo es la distancia entre lo que este hombre está gastando ahora mismo
          // (`riderEffort`, su compromiso por el viento que le toca dar) y el esfuerzo de un
          // corredor arropado a tempo de carretera. El que va a rueda en el pelotón recarga; el que
          // releva en una fuga de seis gasta, aunque su grupo ruede al mismo «compromiso» que el
          // pelotón, porque le toca dar la cara una vez de cada seis; y el que va solo se vacía.
          const mine = riderEffort(block, group.compromiso, shelter)
          const balance = idle > 0 ? (idle - mine) / idle : 0
          m.reserveS = clamp(
            m.reserveS +
              ((STAGE.reserveSeconds * blockS) / STAGE.reserveRecoverySeconds) *
                clamp(balance, -1, 1),
            0,
            STAGE.reserveSeconds,
          )
        }
        /**
         * LO QUE CUESTA ESTE BLOQUE, Y NO HAY DESCUENTO POR LLEVAR EQUIPO (v38). Hasta la v37 un
         * líder arropado que no relevaba pagaba un 5 % menos por gregario presente hasta el 15 %
         * (`domestiqueProtectPerHelper`, SPEC 6.18), «para que fichar buen equipo rinda de verdad».
         * El dueño lo tumbó con una frase: «un líder arropado por gregarios dentro del pelotón gasta
         * LO MISMO que uno que va a rueda en el pelotón cómodamente sin entrar a los relevos».
         *
         * Y tiene razón de carretera: lo que te ahorra energía es IR A RUEDA, y eso ya lo cobra
         * `shelterProtected` igual para todos —es la frase de la v34, «protegido y punto, ni un
         * vatio más que el último del pelotón»—. Llevar gregarios no te pone MÁS a rueda de lo que
         * ya vas; lo que te da es que ellos tiren por ti (y eso ya se paga solo, porque son ellos
         * los que entran al turno y pagan el viento) y que te saquen del turno cuando hace falta
         * (v36). El descuento era una tercera vía que cobraba dos veces lo mismo.
         */
        const cost = blockCost(block, group.compromiso, pulling, relayers.size)
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
     *
     * El grupo nace al ritmo del que se descuelga y el bucle principal lo recalcula cada bloque con
     * `droppedCommit` (v16): ya no hay un `shedCommit` que traer aquí, ni un compromiso especial que
     * pasarle al que se deja ir —lo dice su `gaveUp`, que el ritmo del grupo ya mira—.
     *
     * …CON UNA EXCEPCIÓN, Y ES LA DE LA v20: **el que va TOCADO no coge autobús.** El arreglo de
     * §3-bis-e tenía una consecuencia que nadie había medido: como todo el que se descuelga acaba en
     * un grupeto, y un grupeto organizado entra siempre dentro del corte, en el motor no existía el
     * corredor en apuros —el que se ha caído fuerte, va roto y pierde veinte minutos él solo—, que en
     * carretera es justo el que se va fuera de control. Un corredor con una caída `minor` o `major`
     * no puede coger la rueda de un grupo que pasa: abre grupo propio y rueda a lo suyo.
     *
     * Es la EXCEPCIÓN MOTIVADA y no la regla, y el número lo dice: son el 10 % de las caídas, unas
     * 0,7 por etapa. La pájara NO entra aquí a propósito —en la reina se vacía el pelotón entero y
     * quitarle el grupeto al que revienta devolvería los treinta grupos de un corredor de §3-bis-e—.
     */
    const dropOut = (m: RiderSim, group: Group, delayS = 0): void => {
      // LA GOMA SE ROMPIÓ, SEA POR LO QUE SEA (v26). El bruto de descolgados que viaja en el parte
      // de criba (`shed`) lo acumulaba solo `shatter`, así que el que se dejaba ir (regla 8) y el
      // que se iba al suelo salían del pelotón sin contarse: medido, el parte podía decir «shed 25»
      // con una pérdida neta de 26, que es una contradicción de la crónica contra sí misma. Contarlo
      // AQUÍ cubre las tres vías por construcción, porque las tres pasan por esta puerta.
      if (group.id === PELOTON) droppedSinceNotice += 1
      // El que acaba de soltarse no está relevando: solo importa para la foto (v28), donde si no un
      // caído —el único descuelgue que ocurre DESPUÉS de `advance()`— saldría tirando de su grupeto.
      m.pulling = false
      const tS = group.tS + delayS
      const near = m.hurt
        ? undefined
        : shed.find(
            (sg) =>
              Math.abs(sg.tS - tS) <= STAGE.grupetoJoinGapSeconds && membersOf(sg.id).length > 0,
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
          compromiso: droppedCommit(
            block,
            1,
            m.energy0 > 0 ? Math.max(0, Math.min(1, m.energy / m.energy0)) : 0,
            tS - peloton.tS,
            membersOf(PELOTON).length,
            peloton.compromiso,
          ),
        }),
      )
    }

    /**
     * A QUÉ RITMO VA A RODAR el que se deja ir (v17). Es exactamente la cuenta que hace el bucle
     * principal para el ritmo de un grupeto, aplicada al grupeto en el que `dropOut` lo va a meter:
     * el que ya rueda por ahí a su misma altura si lo hay, y si no, él solo. Sin esto la guarda de
     * la regla 8 predecía con `giveUpCommit` —un modelo que la v16 borró— y regalaba permisos para
     * sentarse que la física cobraba al triple (docs/balance.md «v17»).
     *
     * Se evalúa en el régimen RESIGNADO (`shedResignGapSeconds`) porque es el estado al que llega
     * quien se sienta a 20 km de meta, no en el boquete de ahora mismo: con el boquete de ahora
     * —cero, porque todavía va en el grupo— la cuenta diría que va a rodar a su umbral y no perder
     * nada, que es justo la mentira que hay que quitar.
     */
    const predictedShedPace = (group: Group, m: RiderSim): number => {
      // …y al TOCADO se le predice lo que de verdad le espera: rodar solo. `dropOut` ya no le da
      // autobús (v20), así que mirar el grupeto que pasa sería la misma clase de mentira que la v17
      // quitó de aquí.
      const near = m.hurt
        ? undefined
        : shed.find(
            (sg) =>
              Math.abs(sg.tS - group.tS) <= STAGE.grupetoJoinGapSeconds &&
              membersOf(sg.id).length > 0,
          )
      const size = near ? membersOf(near.id).length + 1 : 1
      const fresh = m.energy0 > 0 ? Math.max(0, Math.min(1, m.energy / m.energy0)) : 0
      const able = droppedCommit(
        block,
        size,
        fresh,
        STAGE.shedResignGapSeconds,
        membersOf(PELOTON).length,
        peloton.compromiso,
      )
      // …y el que se ha dejado ir arrastra al grupo en la proporción en que sean los suyos, que es
      // la misma línea del bucle principal. Si cae solo, el grupeto ES él y rueda a lo suyo.
      return able + (Math.min(able, STAGE.giveUpCommit) - able) / size
    }

    /**
     * ¿A QUÉ NIVEL SUBE UN MARCADOR? AL DE SU OBJETIVO (SPEC 6.18, v26 §10).
     *
     * «Sigo a ese hombre vaya donde vaya» es literalmente lo que la orden significa, y en un puerto
     * eso quiere decir que **un marcador no deriva respecto al GRUPO: deriva respecto a su HOMBRE**.
     * Si su hombre aguanta el ritmo, él aguanta; si su hombre se hunde, él se hunde con él. Devuelve
     * el perfil con el que hay que medir su deriva, o `undefined` si aquí no hay marcaje que valga
     * (no marca a nadie, o su objetivo ya no va en su grupo).
     *
     * POR QUÉ HACE FALTA: hasta ahora el rol se resolvía SOLO dentro de `comesOff`, que colgaba del
     * dado del descuelgue. La v26 retiró ese dado en la subida, así que `resolveMarking` pasó a
     * consultarse únicamente cuando la goma YA se había roto —pasado `driftDropGapSeconds`— y un
     * marcador que nunca llega a ese umbral no se resolvía jamás: el rol quedó inerte en el terreno
     * en el que más significa. Medido en el banco de `simulate.test.ts`, marcar salía exactamente
     * igual que no marcar (14 contra 14 de 60 corridas).
     *
     * No hay modelo nuevo ni constante nueva: son los TRES desenlaces de `marcaje.ts` de siempre,
     * leídos en el eje continuo en vez de en el dado, y el `markDraftTolerance` es el mismo +4 del
     * rebufo que `markingMargin` ya usa para decidir si la rueda le vale.
     *
     * - `stuck` — vive en su rueda: sube exactamente a lo que suba su objetivo, más rápido o más
     *   despacio de lo que él haría solo. Es el sacrificio que la orden ES: quien marca a un hombre
     *   peor que él renuncia a su propia carrera.
     * - `gives` — no le llega ni con la rueda: rueda a lo suyo MÁS el rebufo que sí recibe, por
     *   debajo de su objetivo, y va cediendo. Los segundos cedidos siguen contándose donde se
     *   contaban (`markLossS`, en `comesOff`, cuando el hueco llega a romperse).
     * - `dropped` — ha perdido la rueda: deriva a lo suyo, como cualquiera.
     *
     * Nunca sube más de `markDraftTolerance` por encima de su propio perfil, y esos cuatro puntos
     * son el rebufo, que es gratis por definición: el marcaje no regala un esfuerzo supraumbral.
     */
    const markedPerfil = (m: RiderSim, block: Block): number | undefined => {
      const targetId = markTargetOf.get(m.input.riderId)
      if (targetId == null) return undefined
      const target = sims.get(targetId)
      // Su objetivo tiene que ir AQUÍ, en su mismo grupo y ahora mismo: si se ha ido por delante o se
      // ha quedado, la rueda ya no existe y el marcaje lo resuelve la capa táctica (`wheelProbability`).
      if (!target || target.groupId !== m.groupId) return undefined
      const own = riderPerfil(m, block)
      const his = riderPerfil(target, block)
      const outcome = resolveMarking(markingMargin(own, his))
      if (outcome.kind === 'stuck') return his
      if (outcome.kind === 'gives') return own + STAGE.markDraftTolerance
      return undefined
    }

    /**
     * ¿SE ROMPE LA GOMA? Lo que pasa en el instante en que un corredor deja de poder con el ritmo:
     * primero el MARCAJE (SPEC 6.18) y después el CERILLO (SPEC 6.6). Devuelve `true` solo si de
     * verdad se suelta.
     *
     * Estaba en línea dentro del sorteo del descuelgue y sale aquí en la v26 porque ahora lo llaman
     * dos caminos —la deriva de la subida y el dado del pavé y el descenso— y tiene que ser LA MISMA
     * respuesta en los dos: quien vive en la rueda de su objetivo la sigue teniendo ruede por donde
     * ruede, y quien quema una cerilla la quema para lo mismo.
     *
     * Las tres salidas que NO son soltarse ponen la deriva a cero, y es lo que significan: el
     * marcador pegado a la rueda no está cediendo metros, el que cede unos segundos los apunta en
     * `markLossS` —que es donde se cuentan los cedidos de verdad— y el que quema un cerillo ha
     * gastado 5 unidades de depósito precisamente en cerrar el hueco que llevaba abierto. Sin esto
     * el que se salva volvería a estar por encima del umbral en el bloque siguiente y gastaría todas
     * sus cerillas en medio kilómetro.
     */
    const comesOff = (
      m: RiderSim,
      block: Block,
      inGroup: ReadonlySet<string>,
      allowMatch: boolean,
    ): boolean => {
      // Marcaje (SPEC 6.18): ESTE es el momento de selección. Si m marca a un rival que va en su
      // MISMO grupo, la respuesta la resuelve el módulo oficial `marcaje.ts`: pegado a rueda, cede
      // unos segundos, o se suelta. Vale igual en el puerto, en el adoquín y en la bajada: un
      // marcador pegado a la rueda de su objetivo lo sigue estando ruede por donde ruede (v12).
      // …y su objetivo tiene que seguir ahí AHORA MISMO (v26 §10): con la deriva, marcador y marcado
      // llegan al umbral en el mismo bloque, y salvar al marcador después de haber soltado a su
      // hombre sería justo lo contrario de lo que la orden dice. Por eso se mira el grupo vivo
      // (`groupId`) y no la foto del principio del bloque.
      const targetId = markTargetOf.get(m.input.riderId)
      if (targetId && inGroup.has(targetId)) {
        const target = sims.get(targetId)
        if (target && target.groupId === m.groupId) {
          const outcome = resolveMarking(
            markingMargin(riderPerfil(m, block), riderPerfil(target, block)),
          )
          if (outcome.kind === 'stuck') {
            m.driftS = 0
            return false
          }
          if (outcome.kind === 'gives') {
            m.markLossS += outcome.secondsLost
            m.driftS = 0
            return false
          }
          // 'dropped': se suelta y sigue por el camino normal de descuelgue.
        }
      }
      /**
       * Quemar un cerillo salva el descuelgue, pero CUESTA energía (SPEC 6.6): `matchCost` estaba
       * definido y no se restaba en ninguna parte, así que un cerillo salía gratis.
       *
       * EN LA SUBIDA YA NO SE QUEMA AQUÍ (v26), y es una consecuencia y no un recorte: el cerillo y
       * la reserva son **el mismo depósito fisiológico** —los dos son trabajo supraumbral, W′— y la
       * reserva es su versión continua. Cobrarlos por separado le daba al corredor cuatro depósitos
       * en vez de uno: medido, con tres cerillos que además ponían la deriva a cero, un puerto de 12
       * km al 6,5 % dejaba de descolgar a NADIE —las 80 corredores del banco de la v8 llegaban al
       * mismo segundo, incluido el MON 48 contra un ritmo de 63—. El cerillo sigue existiendo, y
       * sigue sirviendo para lo que la carretera lo usa: atacar, seguir un ataque y aguantar un
       * sector de adoquines o una bajada, que son sucesos y no derivas.
       */
      if (
        allowMatch &&
        m.matches > 0 &&
        m.input.orders.mentality !== 'reservon' &&
        m.energy > STAGE.matchCost
      ) {
        m.matches -= 1
        m.climbBoostBlocks = STAGE.matchBonusBlocks
        m.energy = Math.max(0, m.energy - STAGE.matchCost)
        m.work += STAGE.matchCost
        m.driftS = 0
        return false
      }
      return true
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
      const alive = members.filter((m) => m.groupId === group.id)
      const pace = pacemakerP75(alive, block, paceFraction)
      const inGroup = new Set(alive.map((m) => m.input.riderId))
      /**
       * LA DERIVA, EN LUGAR DEL DADO (v26). En la SUBIDA el que no llega al ritmo del grupo ya no se
       * juega un dado a soltarse: pierde tiempo, poco a poco y en proporción a su déficit, y solo
       * cuando lo acumulado pasa de `driftDropGapSeconds` deja de ir en el grupo —para entonces YA
       * ha perdido esos segundos, que es exactamente lo que el dado no sabía hacer—.
       *
       * No hay ley nueva: la velocidad que le da SU perfil sale de `targetSpeed` (SPEC 6.4), la misma
       * que mueve al grupo, y lo que se integra es la resta de los dos tiempos de bloque. El déficit
       * entra ya descontada la tolerancia —los `dropDeficitTolerance` puntos que uno aprieta los
       * dientes y cubre— y todo se escala por `selectionFactor`, que es lo que dice cuánto selecciona
       * este terreno (un puerto de tempo lejos de meta, 0,3; el decisivo, 1).
       *
       * Y es SIMÉTRICA, que es la otra mitad: el que vuelve a poder con el ritmo recupera lo cedido
       * al mismo precio, así que un bache de un kilómetro no condena a nadie. Por debajo de cero no
       * baja: nadie va por DELANTE del grupo en el que está.
       *
       * En el PAVÉ y en el DESCENSO se conserva el dado (`rngRough`, v12): allí no se pierde una
       * rueda por no poder con el ritmo sino por un error, un corte o un pinchazo, que es un suceso y
       * no una deriva. Y así el terreno de la v12 sigue calibrado dígito a dígito.
       */
      if (block.tipo === 'subida') {
        // Los dos relojes se miden con el MISMO turno (v38): lo que se compara es lo que puede el
        // hombre contra lo que puede el grupo, no un turno contra otro.
        const turno = relayRotation(alive.length, paceFraction)
        const vPace = blockSeconds(targetSpeed(block, pace, group.compromiso, turno))
        for (const m of alive) {
          // Los `dropDeficitTolerance` puntos son lo que uno cubre APRETANDO LOS DIENTES, y eso es
          // justo lo que paga la reserva: sin reserva ya no se cubren, y el corredor cae de golpe a
          // su nivel de verdad. Ese escalón ES el hundimiento (v26).
          // …y el MARCADOR mide su deriva contra su objetivo, no contra el grupo (`markedPerfil`).
          const own =
            (markedPerfil(m, block) ?? riderPerfil(m, block)) +
            (m.reserveS > 0 ? STAGE.dropDeficitTolerance : 0)
          const drift = blockSeconds(targetSpeed(block, own, group.compromiso, turno)) - vPace
          if (drift <= 0) {
            // Va sobrado: recupera reserva y cierra el hueco que llevara abierto. Es la otra mitad
            // de la simetría —un bache de un kilómetro no condena a nadie— y es lo que permite que
            // dos relojes que convergen vuelvan a ser uno.
            m.reserveS = Math.min(STAGE.reserveSeconds, m.reserveS - drift)
            m.driftS = Math.max(0, m.driftS + drift)
            spentReserve.add(m.input.riderId)
            continue
          }
          spentReserve.add(m.input.riderId)
          if (m.reserveS > 0) {
            // Tira de la reserva y NO cede un metro. Aquí vive el grupo de cabeza de un final en
            // alto: no se sostiene por el rebufo —al 8 % vale un 9,6 %— sino porque cada uno de sus
            // hombres puede ir un rato por encima de lo suyo.
            //
            // Y CUESTA DEPÓSITO, que es lo que lo hace una decisión y no un regalo. Es la misma
            // clase de esfuerzo que un cerillo (SPEC 6.6) pero repartido, y su precio sale de la
            // física: W′ contra el trabajo de una etapa (ver `reserveEnergyCost`). Sin este cobro
            // aguantar por encima de lo tuyo salía GRATIS, el pelotón llegaba entero y fresco a meta
            // y se apagaban de golpe la pájara, el «me dejo ir» de la regla 8 y media calibración de
            // la erosión de §VI.1: medido, `simulate.test.ts` pasaba de 5 corridas con
            // `abandona_ritmo` a 1 de 24, y el reagrupamiento del banco de la v8 dejaba de ocurrir.
            const spend = Math.min(m.reserveS, drift)
            const cost = (STAGE.reserveEnergyCost * spend) / STAGE.reserveSeconds
            m.reserveS -= drift
            m.energy = Math.max(0, m.energy - cost)
            m.work += cost
            continue
          }
          m.driftS += drift
          if (m.driftS < STAGE.driftDropGapSeconds) continue
          if (!comesOff(m, block, inGroup, false)) continue
          dropOut(m, group, m.driftS)
          m.driftS = 0
          dropped.push(m.input.riderId)
        }
        return dropped
      }
      for (const m of alive) {
        const deficit = pace - riderPerfil(m, block)
        if (deficit <= STAGE.dropDeficitTolerance) continue
        const lambda = (STAGE.lambdaDropBase * factor * deficit) / STAGE.dropDeficitDenom
        if (!rollHazard(rngRough, lambda)) continue
        // El hazard que acaba de saltar ES el momento de selección (el ataque, el corte, el error):
        // lo que pasa a partir de ahí es lo mismo que en la subida y lo resuelve `comesOff`.
        if (!comesOff(m, block, inGroup, true)) continue
        dropOut(m, group)
        dropped.push(m.input.riderId)
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

      /**
       * EL FRENO COLECTIVO (v17). Rendirse lo decide cada uno, pero un grupo no se disuelve: en el
       * km 212 de Race Colombia e5 se sentaron 73 corredores de golpe —cada uno pasó la guarda por
       * su cuenta— y la cosa se realimentaba, porque cada uno que se iba dejaba al pelotón más
       * pequeño y al siguiente le salía más barato. La cohorte es «los que están + los que ya se
       * fueron»; pasada su fracción, los que quedan SON el grupo y aguantan.
       */
      let gone = gaveUpFromGroup.get(group.id) ?? 0
      const cohort = gone + members.length
      const budget = Math.floor(STAGE.giveUpGroupMaxFraction * cohort)
      for (const m of members) {
        if (gone >= budget) break
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
        /**
         * EL CUIDADO DEL FUERA DE CONTROL: solo administra si lo que va a ceder de aquí a meta cabe
         * dentro del corte. La cuenta es la de la propia ley de velocidad —ritmo(c) es lineal en el
         * compromiso—, así que el retraso relativo se conoce sin simular nada.
         *
         * PERO CONTRA QUÉ RITMO (v17, la corrección de la regresión de la v16). Hasta ahora esto
         * predecía con `giveUpCommit`: «voy a rodar a 0,5 lo que queda». Y eso dejó de ser verdad en
         * la v16, cuando el que se deja ir pasó a caer en un GRUPETO cuyo ritmo lo fija
         * `droppedCommit` —y que se resigna en cuanto pierde de vista al grupo de cabeza—. La
         * guarda decía «solo vas a perder un 4 %, adelante» y la carretera le cobraba un 22 %
         * (medido, Race Colombia e5). Ahora predice con la MISMA física que va a vivir: el grupeto
         * en el que va a caer, a su tamaño real y en el régimen resignado, que es el estado al que
         * llegará —pedirle la cuenta con el boquete de AHORA sería volver a mentirle, porque quien
         * acaba de soltarse todavía pelea y por eso todavía no pierde nada—.
         */
        const shedPace = predictedShedPace(group, m)
        const slower = rhythm(group.compromiso) / rhythm(shedPace) - 1
        const remainingS = ((totalKm - km) / Math.max(1, group.vActual)) * 3600
        if (slower * remainingS > STAGE.giveUpMaxLossFraction * group.tS) continue
        m.gaveUp = true
        gone += 1
        gaveUpFromGroup.set(group.id, gone)
        dropOut(m, group)
        /**
         * RENDIRSE EN LA LÍNEA DE META NO SE CUENTA (v21). En producción, Race Bességes e4 emitía un
         * «8 riders give up the fight» con `toGo: 0` en el km 164 de 164: dejarse ir cuando ya has
         * llegado no es una noticia, y con el orden por reloj esa frase cerraba la crónica DESPUÉS
         * de la victoria.
         *
         * Lo que se calla es la FRASE y no la decisión, y está medido: quitar también la decisión
         * —que era lo natural— deja al último grupo de la etapa reina de gran vuelta en el 7,7 %
         * cuando su objetivo es 8-14 %, y devuelve etapas reina con el pelotón entero al mismo
         * segundo (invariantes de `sim/targets.ts`). El que administra en el último kilómetro sigue
         * perdiendo lo que pierde; es la calibración de §VI.3 y no se toca desde aquí.
         */
        if (totalKm - km >= STAGE.giveUpMinKmToGo) {
          log.emit(km, group.tS, 'abandona_ritmo', 'rider_sits_up', [m.input.riderId], {
            toGo: Math.round(totalKm - km),
          })
        }
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
        const ctx = {
          bonkKm: m.bonkKm,
          kmToGo: totalKm - km,
          inFrontGroup: inFront,
          lostFraction,
          // El corredor en apuros (v20): tocado y en un grupo diminuto. El tamaño se lee AQUÍ y no en
          // `abandon.ts` porque es lo único de la regla que depende del estado de la carretera.
          hurt: m.hurt,
          groupSize: members.length,
        }
        if (!shouldCollapse(ctx)) continue
        if (!rollHazard(rngAbandon, collapseLambda(ctx))) continue
        m.abandonedKm = km
        abandoned.push(m)
        group.riderIds = group.riderIds.filter((id) => id !== m.input.riderId)
        log.emit(km, group.tS, 'abandono', 'rider_abandons', [m.input.riderId], {
          // Se distinguen las dos vías porque la crónica cuenta cosas distintas: uno se ha vaciado y
          // al otro se lo ha llevado una caída.
          causa: m.hurt ? 'caida' : 'colapso',
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
    shatter(peloton, membersOf(PELOTON), pelFrac)
    for (const m of moves) shatter(m.g, membersOf(m.g.id), moveFrac(m))
    // Cómo cambia el pelotón en el desenlace: la CRIBA que lo parte y el REAGRUPAMIENTO que lo
    // recompone (SPEC 6.15). Ambos son la misma cuenta —de cuántos a cuántos ha pasado el grupo
    // desde el aviso anterior— y por eso comparten estado: así la cadena de avisos no tiene huecos
    // y el lector nunca se encuentra corredores que aparecen o desaparecen sin explicación.
    // Solo dentro del desenlace: en un puerto de tempo a mitad de etapa el pelotón se rompe y se
    // recompone constantemente, y narrarlo sería ruido.
    if (raceThisClimb) {
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
      /**
       * LA CRIBA QUE DECIDE, TAMBIÉN AQUÍ (v21). El throttle de arriba escala con cada aviso ya
       * dado (`step`), y eso es lo que convierte un puerto largo en dos o tres frases en vez de
       * diez. Pero cuando la selección es ENORME el escalado se traga la noticia: medido en
       * producción, Race Bességes e4 narra «de 128 a 101» en el km 160 y dos kilómetros después el
       * grupo de cabeza son 16 corredores —de 101 a 16 sin una línea—, porque el segundo aviso
       * pedía 6 km de separación y la etapa se acabó en 4.
       *
       * El listón que rompe el escalado es el MISMO que decide la criba lejos de meta —magnitud
       * absoluta y en fracción del grupo—, y con el mismo suelo de kilómetros que el corte grande,
       * sin escalar: una criba así merece su frase pase lo que pase, y como mucho cada 3 km.
       */
      const decisive =
        lost >= STAGE.splitFarMinDropped &&
        lost >= frontAtLastNotice * STAGE.splitFarMinDropFraction &&
        km - lastFrontNoticeKm >= STAGE.splitEventBigDropKmGap
      if (
        (material && (km - lastFrontNoticeKm >= STAGE.splitEventMinKmGap * step || bigCut)) ||
        decisive
      ) {
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
      /**
       * …PERO LA REFERENCIA BAJA CON EL GRUPO Y NO SUBE CON ÉL (v26). Esta línea era
       * `frontAtLastNotice = tamaño actual` en cada bloque, y con eso el REAGRUPAMIENTO solo se
       * podía narrar si el puerto moría justo en el kilómetro en que empieza el desenlace: un metro
       * más allá, la referencia ya había subido siguiendo al grupo que volvía y la resta daba cero.
       * Medido en el banco de la v8: con el puerto en el borde exacto se narra en 6 de 8 semillas y
       * moviendo la meta 15 km, en 0 de 8. Con la deriva de la v26 el caso NORMAL es justo ese —el
       * pelotón se estira en la rampa y se cierra en el valle— así que la referencia pasa a ser el
       * MÍNIMO por el que ha pasado, y solo vuelve a subir cuando el grupo se ha recompuesto del
       * todo (`farAtPeak`, la misma marca que usa la criba lejana de la v21). Sin esto la crónica
       * deja «41 delante» y en meta entran ciento veinte juntos.
       */
      const farFront = membersOf(PELOTON).length
      frontAtLastNotice = farFront >= farAtPeak ? farFront : Math.min(frontAtLastNotice, farFront)
      splitPhase = 0
      lastSplitDriverId = null

      /**
       * …pero una criba GRANDE lejos de meta sí decide la etapa, y hasta la v20 no tenía frase
       * (v21, docs/motor.md §16). El criterio NO es «narra siempre» —eso devolvería el parte por
       * cada cota del recorrido, que es lo que la v6 midió en 26 líneas por etapa—: es MAGNITUD, y
       * se mide con dos cosas que el motor sí sabe en carretera.
       *
       * 1. **Cuánta gente ha perdido la cabeza de carrera**, contra el MÁXIMO reciente del grupo y
       *    no contra el último aviso: en un puerto de tempo el pelotón suelta y recoge sin parar, y
       *    lo que interesa es el saldo. Si el grupo se recompone, la referencia sube y la cuenta
       *    empieza limpia.
       * 2. **Que la sangría haya PARADO**. Medido sobre el banco: una cota de tempo hunde el grupo
       *    de 175 a 90 y lo devuelve entero dos kilómetros después, así que contar en el fondo del
       *    agujero es contar un espejismo (y además narra un número que nadie volverá a ver).
       *    Esperar a que el grupo lleve `splitFarSettleKm` sin encoger cuesta cuatro kilómetros de
       *    retraso y da la cifra con la que la criba se queda.
       *
       * Lo que este listón NO puede saber es si la criba se DESHACE cincuenta kilómetros después:
       * eso es futuro, y el motor emite en carretera. Lo resuelve la crónica, que ve la etapa entera
       * (`apps/api/src/chronicle.ts`), igual que hizo la v13 con la concesión que luego se desmiente.
       */
      const front = membersOf(PELOTON)
      if (front.length >= farAtPeak) {
        farAtPeak = front.length
        farEscaped = 0
        farFromKm = km
      }
      if (front.length < farPrevSize) farShrinkKm = km
      farPrevSize = front.length
      const farLost = farAtPeak - front.length - farEscaped
      if (
        farLost >= STAGE.splitFarMinDropped &&
        farLost >= farAtPeak * STAGE.splitFarMinDropFraction &&
        km - farShrinkKm >= STAGE.splitFarSettleKm &&
        km - farNoticeKm >= STAGE.splitFarKmGap
      ) {
        // Quién aprieta, con el mismo criterio que el corte del desenlace: el más fuerte de los que
        // siguen delante, que es quien está haciendo el daño.
        const ranking = front
          .map((m) => ({ id: m.input.riderId, p: riderPerfil(m, block) }))
          .sort((a, b) => b.p - a.p || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        const driver = ranking[0]?.id
        log.emit(km, peloton.tS, 'criba', 'peloton_selection', driver ? [driver] : [], {
          dropped: farLost,
          escapados: farEscaped,
          remaining: front.length,
          before: farAtPeak,
          // Desde dónde y hasta dónde: una criba lejana se cuenta con los km que ha durado, porque
          // no es un instante sino un tramo (un puerto, un sector de viento).
          fromKm: Math.round(farFromKm),
          toGo: Math.round(totalKm - km),
          chasing: moves.length > 0 ? 1 : 0,
        })
        farNoticeKm = km
        farAtPeak = front.length
        farEscaped = 0
        farFromKm = km
        farShrinkKm = km
      }
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
      /**
       * NO SE NARRA UN ATAQUE ANTES DE QUE BAJE LA BANDERA (v21). En producción, Race Bességes e4
       * abría la crónica con «Attack: … force the pace and open a gap» en el KM 0, y en el kilómetro
       * cero el lector todavía no ha visto salir a nadie.
       *
       * Se quita la FRASE y no el movimiento, y es una decisión medida: prohibir el intento —que es
       * lo que parecía natural— significa no tirar el dado del intento, y eso desplaza el flujo
       * `rngTactics` de TODAS las etapas del juego. Medido: mueve las cuatro huellas selladas, sube
       * la victoria de la fuga en montaña del 41,0 % al 43,8 % sobre 500 corridas y saca de banda el
       * gate de 120 semillas (47,5 % contra un techo del 45 %). Un ataque en los primeros cien
       * metros existe en carretera —las fugas salen del disparo—; lo que no existe es la frase.
       * Sigue viajando como TELEMETRÍA, igual que el resto de los intentos que no merecen línea.
       */
      const narrate =
        km >= STAGE.tacticMinAttackKm &&
        (party.length >= STAGE.tacticAttemptNarrateRiders
          ? claimAttackNotice(0)
          : claimAttackNotice(
              kmToGo <= STAGE.gapReportFinalKm
                ? STAGE.tacticAttemptNarrateFinalKmGap
                : STAGE.tacticAttemptNarrateKmGap,
            ))
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
      /**
       * EL ACELERÓN, MEDIDO CON LA FÍSICA (v39). Dos velocidades y una distancia: la del que ataca
       * —solo, a tope, con el cerillo y con el extra del salto— contra la del grupo que deja atrás,
       * rodando a lo que rodaba. De ahí sale el boquete, y de ahí salen las dos frases del dueño:
       * en una rampa dura un escalador abre diez o quince segundos en trescientos metros, y en el
       * llano el mismo hombre no abre nada porque la ley de velocidad apenas premia el vatio extra.
       *
       * El grupo que deja atrás son LOS QUE SE QUEDAN, no los que había: si medio grupo salta con
       * él, los que quedan son menos y rotan peor, y el boquete sale mayor —que es exactamente lo
       * que pasa en carretera—. Y si saltan tantos que no queda grupo, esto no llega aquí: lo ha
       * parado antes `tacticFollowFractionMax` (el ataque se ha diluido).
       */
      const saltan = new Set(party.map((p) => p.riderId))
      const quedan = members.filter((m) => !saltan.has(m.input.riderId))
      const fracción = onClimb ? climbFrac : onPaves ? roughFrac : source.coop
      const vGrupo =
        quedan.length > 0
          ? targetSpeed(
              block,
              pacemakerP75(quedan, block, fracción),
              source.compromiso,
              relayRotation(quedan.length, fracción),
            )
          : 0
      /**
       * …Y EN EL SALTO NO PAGA TODAVÍA EL PEAJE DE IR SOLO. Es la sutileza que se ve al medirlo: si
       * al que arranca se le cobra ya la exposición de un hombre solo (`relayPaceEdge(1)`), en el
       * llano NADIE abre hueco nunca —el peaje del viento se come el acelerón entero— y eso es
       * falso: un ataque en llano abre cinco o diez segundos, lo que pasa es que después no se
       * sostienen. Y es que en el momento del hachazo él viene DE DENTRO del grupo: acelera desde
       * la rueda, y el viento de ir solo empieza a cobrárselo cuando ya está fuera.
       *
       * Así que el salto se mide con la MISMA exposición que tenía el grupo, y el peaje de ir solo
       * lo cobra a partir del bloque siguiente la física de siempre (`advance`). Cada cosa en su
       * sitio, y sin decir dos veces lo mismo.
       */
      const vAtaque = targetSpeed(
        block,
        instigator.perfil + STAGE.matchBonus + STAGE.tacticSurgeBonus,
        1,
        relayRotation(Math.max(1, quedan.length), fracción),
      )
      const gap = jumpGapSeconds(vAtaque, vGrupo)
      /**
       * …Y SI NO ABRE HUECO, NO HAY GRUPO. «Si su velocidad de ataque es menor que la del que va
       * tirando del grupo, tampoco se crea ningún boquete»: el intento se cuenta como telemetría
       * —es dato, y el banco lo cuenta— pero no nace nada. El cerillo se ha gastado igual, que es
       * lo que pasa cuando uno se tira y no sale.
       */
      if (gap < STAGE.tacticJumpMinGapSeconds) {
        for (const r of party) {
          const s2 = sims.get(r.riderId)
          if (!s2) continue
          s2.matches = Math.max(0, s2.matches - 1)
          const c = STAGE.tacticAttackCost
          s2.energy = Math.max(0, s2.energy - c)
          s2.work += c
        }
        log.emit(km, source.tS, 'intento', 'attack_go', names, {
          kind,
          saltan: party.length,
          grupo: members.length,
          toGo: Math.round(kmToGo),
          sinHueco: 1,
          narra: 0,
        })
        return
      }
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
      if (source.id === PELOTON) {
        escapedSinceNotice += ids.length
        // …y lo mismo para la cuenta de la criba lejana, que lleva su propio libro (v21): el que se
        // ESCAPA no es un descolgado ni aquí ni allí.
        farEscaped += ids.length
      }
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
        bornTs: g.tS,
        allowed,
        prospered: false,
        dayBreak: false,
        narrated: narrate,
        closed: false,
        targetId: target?.id ?? null,
        bridgeUntilKm: kind === 'puente' ? km + STAGE.tacticBridgeKm : null,
        restCommit: coop,
        chaseLedger: new Map(),
        lastIds: ids,
        peakGapS: gap,
        peakGapKm: km,
      })
      log.emit(km, g.tS, 'intento', 'attack_go', names, {
        // El boquete que ha abierto el acelerón, que desde la v39 es una CUENTA y no un dado: es
        // dato de primera para el banco y para entender una carrera leyendo la telemetría.
        hueco: Math.round(gap),
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
      //
      // Con la MISMA excepción que el controlador del pelotón (v23): una vez que uno de esos
      // movimientos es la fuga del día, la etapa ha entrado en su fase siguiente y se vuelve a
      // atacar —se puentea a la fuga, se contraataca—. Sin esto, un intento sin cuerda que cuajaba
      // dejaba la carrera congelada hasta meta: medido, cuatro intentos en los primeros 19 km de
      // Race Almeria e1 y ninguno más en los 190 restantes.
      const closingNow = moves.length > 0 && !moves.some((m) => m.allowed || m.dayBreak)
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

    /**
     * LA COOPERACIÓN DE UNA FUGA SE VUELVE A MEDIR, Y ES CONTAGIOSA (v39). El dueño, las dos cosas:
     *
     * > «lo de quién tira de cada grupo habría que irlo midiendo a menudo… quizás no cada 100
     * > metros, pero quizás cada km. Y ojo, porque si hay 1 wey que no pasa a cooperar en la
     * > escapada, los otros quizás quieran desgastarse menos y entonces tirar menos fuerte para no
     * > desgastarse para que ese wey que va ahí sin gastar energía se la lleve.»
     *
     * Hasta la v38 el compromiso de un movimiento se fijaba AL NACER (`moveCooperation`: tamaño,
     * hambre media y tensión) y no se volvía a mirar nunca: una fuga de seis rodaba igual de fuerte
     * a 150 km de meta que a 5, y llevara dentro a un fuera de serie o no.
     *
     * Ahora, una vez por kilómetro, se recalcula contra la cooperación con la que nació y se le
     * descuenta la parte del grupo que se ha plantado. Y el contagio es la mitad que importa: **no
     * es que tiren menos porque son menos**, eso ya lo cobra el turno de relevos; es que los que
     * SIGUEN tirando aflojan a propósito, porque nadie se vacía para que gane el que va a rueda.
     */
    if (i % STAGE.coopReviewBlocks === 0) {
      for (const m of moves) {
        const mem = membersOf(m.g.id)
        if (mem.length === 0) continue
        const desertan = interésPropio(mem).media
        const objetivo = m.restCommit * (1 - STAGE.coopContagionWeight * desertan)
        m.g.compromiso += (objetivo - m.g.compromiso) * STAGE.commitHysteresis
      }
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
    /**
     * EL RITMO DEL DESCOLGADO, CADA BLOQUE (v16, docs/motor.md §9). Aquí estaba la deuda de fondo:
     * el grupo descolgado rodaba a la constante `shedCommit` = 0,82 —el ritmo de un pelotón
     * lanzado— fuera uno o cuarenta, en el llano o en una rampa al 9 %, entero o vacío. Ahora lo
     * decide `droppedCommit`: relevarse reparte el viento (1/n del tiempo en cabeza), eso vale lo
     * que valga el rebufo del terreno, y se rueda con lo que quede en las piernas.
     *
     * Se recalcula bloque a bloque y no al descolgarse, porque las tres entradas cambian: el
     * grupeto crece cuando se le suman otros, y se vacía kilómetro a kilómetro.
     *
     * …y desde la v17 también cambia CONTRA CUÁNTOS va: el cuarto argumento es el tamaño del grupo
     * al que persigue, porque un autobús que triplica al de delante no se resigna (docs/balance.md
     * «v17»). Es el mismo pelotón contra el que se mide su boquete.
     */
    for (const sg of shed) {
      const mem = membersOf(sg.id)
      if (mem.length === 0) continue
      let fresh = 0
      let gaveUp = 0
      for (const m of mem) {
        fresh += m.energy0 > 0 ? Math.max(0, Math.min(1, m.energy / m.energy0)) : 0
        if (m.gaveUp) gaveUp += 1
      }
      const able = droppedCommit(
        block,
        mem.length,
        fresh / mem.length,
        sg.tS - peloton.tS,
        membersOf(PELOTON).length,
        peloton.compromiso,
      )
      // …y el que SE HA DEJADO IR (regla 8) ya no pelea por nada: rueda a lo suyo y arrastra al
      // grupo en la proporción en que sean los suyos. Un grupeto donde la mitad se ha sentado va
      // más lento que uno donde nadie lo ha hecho, que es lo que se ve en carretera.
      const share = gaveUp / mem.length
      sg.compromiso = able + (Math.min(able, STAGE.giveUpCommit) - able) * share
      /**
       * EL DESCOLGADO ESPERA AL QUE VIENE DETRÁS (v38). Es la conducta más básica del ciclismo en la
       * cola de la carrera y el motor no la tenía: el que se suelta afloja hasta que le coge el
       * siguiente, y entre los dos hacen el grupeto que les lleva a meta dentro del corte.
       *
       * Sin ella, cada descolgado moría por su cuenta. Medido sobre dos giras completas del banco de
       * la gran vuelta: de los ocho corredores que se fueron FUERA DE CONTROL, **los ocho iban
       * solos** —ni uno en un grupeto—. Y con la ley de velocidad de la v38 eso se agrava solo,
       * porque un hombre suelto va un 14,5 % más lento que un grupo que se releva, así que los
       * huecos entre descolgados sueltos CRECEN en vez de cerrarse y no llegan a juntarse nunca.
       *
       * Solo espera el que va POCO ACOMPAÑADO (`grupetoWaitSize`): un grupeto hecho ya no para a
       * recoger a nadie. Solo espera a quien está CERCA (`grupetoWaitSeconds`): a tres minutos no se
       * espera, se sigue. Y solo lejos de meta: en el desenlace ya no hay grupeto que hacer, hay que
       * llegar.
       */
      const yaEsGrupeto = mem.length >= STAGE.grupetoWaitSize
      if (!yaEsGrupeto && totalKm - km >= STAGE.grupetoWaitMinKmToGo) {
        let masCerca: number | null = null
        for (const otro of shed) {
          if (otro.id === sg.id || membersOf(otro.id).length === 0) continue
          if (otro.tS <= sg.tS) continue
          if (masCerca === null || otro.tS < masCerca) masCerca = otro.tS
        }
        if (masCerca !== null && masCerca - sg.tS <= STAGE.grupetoWaitSeconds) {
          sg.compromiso = Math.min(sg.compromiso, STAGE.grupetoWaitCommit)
        }
      }
    }
    for (let g = 0; g < shed.length; g++) {
      shed[g] = advance(shed[g]!, membersOf(shed[g]!.id), 1, 'shed')
    }

    // Reagrupamiento de los descolgados. Hasta la v15 aquí había un RECORTE FIJO —el descolgado
    // cerraba `chaseBackSecondsPerKm` = 8 s por kilómetro pasara lo que pasara— y un TOPE que le
    // clavaba el reloj del pelotón si resultaba ir más rápido. Las dos líneas pisaban la física que
    // `advanceGroup` acababa de calcular, y entre las dos son la causa raíz de que los rezagados
    // perdieran demasiado poco tiempo (docs/motor.md §9). Ya no están: lo que queda es lo que sí es
    // real —quién va CON el grupo y quién no— y lo demás lo decide `droppedCommit`.
    //
    // En terreno que ROMPE —subida y, desde la v12, adoquín— no hay reenganche al pelotón: allí
    // manda la selección, que es lo que hace una etapa de montaña y lo que hace una clásica de
    // pavés. Pero los descolgados que ruedan a la MISMA altura sí se funden en grupetos: si no, la
    // reina terminaba con una mediana de 30 grupos de un solo corredor (docs/motor.md §3-bis-e).
    if (shed.length > 0) {
      // LA PUERTA DEL PELOTÓN (v12). Con cuánto boquete se considera que se vuelve a ir DENTRO del
      // grupo depende de a qué ritmo vaya ese grupo: a tempo, veinte metros son la misma fila; con
      // los trenes lanzados, no. Ver `chaseBackShutFloor`: por debajo del tempo de carretera el
      // factor vale 1 y esto es lo de siempre (el llano canónico y el valle de la reina no se mueven).
      // …y «ir a tempo» se mide contra `chaseBackShutTempo` y NO contra `pelotonTempoCommit` (v38).
      // Eran la misma constante y son dos decisiones distintas: una dice a qué ritmo rueda el
      // pelotón cuando no tiene nada que cazar y la otra, contra qué se compara ese ritmo para saber
      // si la fila sigue siendo una fila. Atadas, bajar la primera ESTRECHABA la puerta.
      const paceShut = Math.max(
        STAGE.chaseBackShutFloor,
        Math.min(1, (1 - peloton.compromiso) / (1 - STAGE.chaseBackShutTempo)),
      )
      const pelotonSize = membersOf(PELOTON).length
      /**
       * …y la puerta se abre de par en par para quien viene con MUCHA más gente de la que va
       * delante: un autobús que TRIPLICA en número al grupo de cabeza (`chaseBackBusFactor`) se
       * releva mejor y entra con él por lanzado que vaya. Es lo que devuelve al pelotón entero
       * cuando un puerto lejos de meta deja delante a diez corredores y detrás a setenta.
       */
      const shutFor = (size: number): number =>
        size >= STAGE.chaseBackBusFactor * pelotonSize ? 1 : paceShut
      // En terreno que rompe el umbral de fusión es más estrecho (y no hay reenganche al pelotón):
      // los que van juntos de verdad forman grupeto, los que están cortados de verdad siguen cortados.
      // La fusión ENTRE descolgados no pasa por la puerta del pelotón: que dos grupetos que ruedan a
      // la misma altura se junten no depende de lo que apriete un pelotón que va minutos por delante.
      const mergeGap = onRough ? STAGE.grupetoJoinGapSeconds : STAGE.regroupGapSeconds
      /**
       * EL GRUPO EN APUROS NO SE FUNDE CON NADIE (v20). `dropOut` ya no le da autobús al que va
       * tocado, pero sin esto el arreglo duraba un bloque: la fusión de descolgados lo volvía a
       * meter en el primer grupeto que pasara a menos de 22 s. Un grupo TODO él de heridos ni absorbe
       * ni es absorbido; en cuanto lleve un corredor entero, vuelve a ser un grupeto normal —dos que
       * ruedan juntos de verdad se ayudan, y eso también es carretera—.
       */
      const allHurt = (g: Group): boolean => {
        const mem = membersOf(g.id)
        return mem.length > 0 && mem.every((m) => m.hurt)
      }
      const stillDropped: Group[] = []
      for (const sg of [...shed].sort((a, b) => a.tS - b.tS)) {
        const mem = membersOf(sg.id)
        if (mem.length === 0) continue
        /**
         * ¿ALCANZA al pelotón? Se reengancha. Y este es también el sitio donde muere el «tope
         * fantasma» de la v15: un grupo descolgado que fuera de la subida acaba con MENOS reloj que
         * el pelotón no es un fantasma al que haya que clavarle el cronómetro —lo que hacía la línea
         * `adv.tS < peloton.tS ? { ...adv, tS: peloton.tS }`—, es un grupo que ha vuelto, y lo que
         * hace en carretera es entrar en el pelotón. En la SUBIDA no: allí un descolgado sí puede
         * pasar por delante de lo que quede del pelotón y la selección debe mantenerse.
         */
        const caught = !onClimb && sg.tS <= peloton.tS
        /**
         * …Y LA PUERTA NO ABSORBE (v35). Hasta la v34 bastaba con ESTAR a menos de 22 s: un grupo
         * que rodaba a la misma velocidad que el pelotón —o incluso perdiendo una décima por
         * kilómetro— entraba igual, porque la puerta no preguntaba si se estaba acercando. Medido
         * en el banco de huecos: en los descensos, 196 de 196 grupos volvían, y el hueco de los que
         * volvían crecía +0,1 s/km mientras tanto. Eso no es reengancharse, es que la puerta se los
         * tragaba. Es la queja del dueño («es muy fácil reengancharse»; «en una bajada es normal
         * que algunos se reenganchen, pero no todos, wey»).
         *
         * Ahora hay que estar VOLVIENDO: ir más rápido que ellos en este bloque. Los dos grupos
         * pisan el mismo bloque del recorrido, así que la comparación es de carretera y no de
         * reloj. El que alcanza de verdad (`caught`) entra igual, y el autobús que triplica en
         * número sigue teniendo su puerta de par en par —lo que no tiene es un remolque gratis—.
         */
        const cerrando = sg.vActual > peloton.vActual
        if (
          caught ||
          (!onRough &&
            cerrando &&
            gapSeconds(peloton, sg) <= STAGE.regroupGapSeconds * shutFor(mem.length))
        ) {
          for (const m of mem) m.groupId = PELOTON
          peloton = { ...peloton, riderIds: [...peloton.riderIds, ...sg.riderIds] }
          continue
        }
        // ¿se funde con un grupeto cercano ya por delante? forman un autobús que rueda junto.
        const near = allHurt(sg)
          ? undefined
          : stillDropped.find((o) => Math.abs(o.tS - sg.tS) <= mergeGap && !allHurt(o))
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
      const miembros = membersOf(group.id)
      const yaEnElSuelo = new Set<string>()
      /** Lo que le pasa a UNO que se ha ido al suelo: se apunta, se marca y sale del grupo. */
      const alSuelo = (m: RiderSim, out: CrashOutcome, perdidaS: number): void => {
        yaEnElSuelo.add(m.input.riderId)
        incidents.push({ riderId: m.input.riderId, km, tipo: 'caida', ...out, perdidaS })
        // EL CORREDOR EN APUROS (v20): la caída SERIA lo marca antes de sacarlo del grupo, porque es
        // lo que decide si `dropOut` le da autobús o lo deja solo. `minor` y `major` son las mismas
        // severidades que `injuryEndsRace` ya sacaba de la carrera al día siguiente; un rasguño o un
        // susto (el 90 % de las caídas) se levanta y vuelve al grupeto como siempre.
        if (out.severidad === 'minor' || out.severidad === 'major') m.hurt = true
        // …y el percance se apunta SIEMPRE, con su kilómetro: el susto y los rasguños también
        // cuentan para que su equipo decida si baja a por él (v37).
        m.mishapKm = km
        dropOut(m, group, perdidaS)
      }
      for (const m of miembros) {
        if (yaEnElSuelo.has(m.input.riderId)) continue
        const e = erosion(m.energy, m.energy0, m.input.eff0.RES)
        const eff = riderEff(m)
        const out = rollCrash(rngCrash, block, isFinal, eff, e, m.input.fragility ?? 1)
        if (!out) continue
        alSuelo(m, out, out.perdidaS)
        /**
         * …Y SE LLEVA A LOS DE AL LADO (v38). El dueño: «normalmente cuando se cae alguien en el
         * pelotón casi siempre se caen varios… normalmente VARIOS, con lo cual podrían tirar». No es
         * narración: decide si el cortado acaba SOLO —y entonces no vuelve y se va fuera de
         * control— o en un grupo que se releva y llega.
         *
         * Se los lleva de una TIRADA CONTIGUA de la lista, que es lo más parecido a «los que iban a
         * su alrededor» que puede decir un motor sin posiciones dentro del grupo. Y todos pierden
         * **el mismo tiempo**, que es la parte que importa: un montón para a todos en el mismo sitio,
         * así que salen del suelo juntos y forman grupo en vez de quedar desperdigados a un minuto
         * unos de otros. El que se hace daño de verdad pierde lo suyo por encima de eso.
         */
        const disponibles = miembros.filter(
          (x) => x !== m && !yaEnElSuelo.has(x.input.riderId) && x.groupId === group.id,
        )
        const cuantos = crashPile(rngCrash, out.severidad, disponibles.length + 1)
        if (cuantos > 0 && disponibles.length > 0) {
          const inicio = Math.floor(rngCrash() * disponibles.length)
          for (let k = 0; k < cuantos; k++) {
            const otro = disponibles[(inicio + k) % disponibles.length]!
            if (yaEnElSuelo.has(otro.input.riderId)) continue
            /**
             * …Y EN UN MONTÓN LA MAYORÍA SE LEVANTA Y SIGUE. El que provoca la caída se lleva la
             * peor parte; los que van detrás caen encima, a menos velocidad y sobre cuerpos y
             * bicis, y casi siempre se levantan con un rasguño. Sin esto cada montón multiplicaba
             * las lesiones por el tamaño del montón: medido, los abandonos de una gran vuelta se
             * iban al 28,4 % (banda 12-20) y el 81,5 % eran por caída (banda 30-67).
             */
            const seLastima = rngCrash() < STAGE.crashPileHurtChance
            const suyo = seLastima
              ? rollCrashSeverity(rngCrash, otro.input.fragility ?? 1)
              : rollCrashSeverityLight(rngCrash)
            alSuelo(otro, suyo, Math.max(out.perdidaS, suyo.perdidaS))
          }
        }
      }
    }
    crashCheck(peloton)
    for (const m of moves) crashCheck(m.g)
    // …y EN LOS GRUPETOS también (v16). El bucle recorría el pelotón y los escapados, y a los
    // descolgados no los miraba nadie: un corredor que se soltaba en el km 40 cruzaba los 20 km de
    // descenso siguientes con probabilidad CERO de caerse. Mientras el descolgado volvía siempre al
    // pelotón daba casi igual; con el modelo de persecución arreglado hay gente rodando ahí atrás
    // media etapa, y medido, las lesiones de una gran vuelta caían de 65 a 28 sin que ninguna ley de
    // las caídas hubiera cambiado. Un grupeto que baja un puerto se cae; menos, pero se cae.
    for (const sg of [...shed]) crashCheck(sg)

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
        back.closed = true
        if (reeled) {
          // EL ATAQUE VUELVE A SU GRUPO (v25): el que sigue en carretera es el PADRE, así que la
          // historia que continúa es la suya. Sin esto, un manotazo narrado dentro de una fuga que
          // nunca tuvo frase convertía a la fuga entera en «narrada», y el parte de cabeza empezaba
          // a nombrar delante a gente a la que el lector no había visto salir.
          /**
           * …Y EL DESENLACE ES DEL ATAQUE, NO DEL PADRE (v35). La línea de abajo —el grupo que
           * sobrevive hereda la narración del padre— se ejecutaba ANTES de leer `narra`, así que un
           * ataque contado con su frase («two riders jump clear») se cerraba en silencio si el grupo
           * del que había salido no estaba narrado. Es justo lo contrario de la regla de la v25 que
           * hay escrita tres líneas más abajo: lo que se abre, se cierra.
           *
           * Lo destapó la v35 al dejar de regalar reenganches: en `llana-180` un ataque de dos
           * dentro de la fuga del día volvía a su grupo sin una línea, y dos kilómetros después la
           * crónica cazaba a CUATRO cuando el último parte de cabeza decía dos. El lector leía una
           * contradicción (`cazadaFantasma`) que no era del motor sino de este orden de dos líneas.
           */
          const narraCierre = front.narrated
          front.narrated = back.narrated
          const attackers = membersOf(front.g.id)
            .map((x) => x.input.riderId)
            .filter((id) => !joined.includes(id))
          // LO QUE SE ABRE SE CIERRA (v25). Aquí había un `km - bornKm >= tacticReeledNarrateKm`
          // además de `narrated`, y ése es el agujero más grande de los doce: 184 ataques narrados
          // en 31 etapas del día de juego 46 se abrían con su frase y no volvían a mencionarse
          // nunca, porque la goma les había vuelto en menos de tres kilómetros. El umbral evitaba
          // ruido en los intentos que NO se contaron; para los que sí, callarse el desenlace no
          // ahorra una línea, deja una historia sin final. Se cuenta cómo acaba TODO lo que se
          // contó cómo empezaba.
          const narra = narraCierre
          log.emit(km, front.g.tS, 'intento_fallido', 'attack_reeled', attackers.slice(0, 3), {
            kind: front.kind,
            km: Math.max(1, Math.round(km - front.bornKm)),
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
              // CUÁNTOS SE SUMAN (v25). El evento decía en cuántos queda el grupo y no cuántos han
              // llegado, así que el lector veía crecer la cabeza de carrera sin que nadie le dijera
              // por dónde entraban. Es el mismo dato que `front_group.entran`, y de él sale la
              // frase: «tres más enganchan — ya son diez delante».
              entran: joined.length,
              toGo: Math.round(totalKm - km),
              // Dos relojes que se juntan son noticia si de verdad cambia la carrera: el puente que
              // engancha siempre, y una fusión solo si trae compañía… O SI LO QUE SE SUMA TENÍA SU
              // PROPIA HISTORIA ABIERTA (v25). Un contraataque de dos que alcanza a la fuga se
              // fundía en silencio, y ahí se perdían las dos mitades: el ataque que se contó y no se
              // cerró, y los dos nombres nuevos que aparecían delante sin que nadie los viera
              // llegar. Es literalmente el caso de Race Jaén (Jereb y Moretti, km 156).
              narra:
                bridged || joined.length >= STAGE.tacticMergeNarrateRiders || back.narrated ? 1 : 0,
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
        m.lastIds = ids
        // LA FUGA DEL DÍA, TAL COMO ESTÁ AHORA (v25). Se refresca antes de resolver nada, así que
        // cuando el pelotón se la coma unas líneas más abajo la lista sea la de los que iban de
        // verdad delante y no la del kilómetro en que salió.
        if (m.dayBreak) {
          dayBreakNow = ids
          for (const id of ids) dayBreakEver.add(id)
        }
        if (!m.prospered && gapOverSource >= STAGE.tacticBreakGapSeconds) {
          m.prospered = true
          // Regla 5: la fuga del día es **el primero que prospera tras varios fracasos**. Solo
          // dentro de la ventana: un movimiento que cuaja a falta de 40 km es un ataque tardío, y
          // la crónica no puede llamarlo igual.
          // …Y LA CORONA TAMPOCO ES PARA EL MAILLOT (v32). Negarle la cuerda en `pelotonAllows` no
          // bastaba: un movimiento puede PROSPERAR sin cuerda —el agujero que documenta §13, por el
          // que un intento que nadie autorizó acaba siendo la fuga del día— y medido, los 17 casos
          // que seguían colándose eran exactamente eso: el líder dentro, sin cuerda, coronado
          // igual. La corona no es una etiqueta: de ella cuelga que el pelotón DEJE DE CERRAR y le
          // conceda la cuerda de `gcControlLeash`. Sin corona el pelotón sigue cerrando, que es lo
          // que hace un pelotón cuando el maillot se le ha ido por delante.
          if (
            !dayBreakFormed &&
            m.kind !== 'puente' &&
            m.sourceId === PELOTON &&
            km <= totalKm * STAGE.tacticBreakWindowFraction &&
            !carriesGcLeader(
              mem.map((x) => x.input.gcDeficitSeconds),
              hasGcContext,
            )
          ) {
            dayBreakFormed = true
            m.dayBreak = true
            dayBreakRiders = ids
            // …y la lista VIVA arranca igual que la congelada. Sin esto la fuga nacía «vacía» para
            // la cuenta de quién sigue delante —el refresco de arriba corre ANTES de marcarla— y el
            // paso 3 la declaraba cazada en el kilómetro siguiente.
            dayBreakNow = ids
            for (const id of ids) dayBreakEver.add(id)
            // La fuga se fecha en el km en que SALIÓ, no en el que se confirma que ha cuajado: en
            // carretera el movimiento nace cuando alguien ataca y solo después se ve si vive. Sin
            // esto la crónica decía «quedan 8 delante» en el km 1 y «se forma la fuga» en el 55.
            breakFormedKm = Math.round(m.bornKm)
            log.emit(m.bornKm, m.bornTs, 'fuga_formada', 'breakaway_formed', ids)
            // Con un compromiso alto la fuga va a bloque; con uno bajo se miran y no avanzan. Pero
            // UNO NO COLABORA CONSIGO MISMO (v21): en producción, la fuga de un solo corredor de
            // Race Bességes e4 salía con un «up front they collaborate well, rolling smooth turns».
            // La cooperación es una propiedad del grupo y con un hombre no existe.
            if (ids.length > 1) {
              log.emit(m.bornKm, m.bornTs, 'colaboracion', 'break_cooperation', ids, {
                cooperating: m.g.compromiso >= STAGE.breakCoopThreshold ? 1 : 0,
              })
            }
            lastFrontIds = ids
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
          m.closed = true
          if (m.dayBreak) dayBreakSwallowed = true
          if (!m.dayBreak) {
            // Regla 4: **muchos intentos fracasan, sin más**. Un movimiento que nunca llegó a
            // cuajar se narra como el intento que fue; uno que sí cuajó, como un movimiento cazado.
            // Lo que se abre se cierra (v25): ver la nota de `attack_reeled` en las fusiones.
            const narra = m.prospered || m.narrated
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
      // 3. La fuga del día está CAZADA cuando ninguno de los que HAN PASADO POR ELLA sigue por
      //    delante. No basta con que se disuelva el grupo original: si uno de ellos se ha ido en un
      //    ataque posterior, la fuga sigue viva en carretera y decir lo contrario sería falso. Y
      //    desde la v25 la cuenta se lleva sobre todos los que estuvieron dentro, no solo sobre los
      //    que la formaron: al que puenteó y luego atacó también hay que esperarle.
      if (dayBreakFormed && !caught) {
        const stillAway = [...dayBreakEver].some((id) => {
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
          // A QUIÉN CAZAN: a los que iban delante EN ESE MOMENTO (v25), no a la lista congelada del
          // kilómetro en que la fuga salió. `deLos` conserva de cuántos salió, que es la otra mitad
          // de la historia cuando el grupo ha cambiado por el camino.
          const quienes = dayBreakNow.length > 0 ? dayBreakNow : dayBreakRiders
          log.emit(km, peloton.tS, 'fuga_cazada', 'breakaway_caught', quienes, {
            // QUIÉN ERA Y CUÁNTO LLEVABA (v21). En producción, Race Bességes e4: Nicolás Ferrari se
            // pasa 130 km escapado en solitario, le cazan a la vista de la meta y acaba CUARTO a
            // 5 s… y la crónica lo despachaba con «the break is caught» sin nombrarlo. Con estos
            // tres números la frase puede contar el desenlace que fue: cuántos eran, cuánto tiempo
            // llevaban delante y a qué distancia de meta se acabó.
            size: quienes.length,
            ...(dayBreakRiders.length !== quienes.length ? { deLos: dayBreakRiders.length } : {}),
            awayKm: Math.max(0, Math.round(km - breakFormedKm)),
            toGo: Math.round(totalKm - km),
            // …Y CÓMO SE ACABÓ. Si el pelotón nunca llegó a comérsela —se fue cayendo sola, uno a
            // uno— «the break is caught» es falso, y la crónica tiene que decir otra cosa.
            ...(dayBreakSwallowed ? {} : { motivo: 'deshecha' }),
          })
          // «No sé quién hizo el trabajo para reducir la distancia»: aquí se dice. El movimiento
          // que lleva la marca de fuga del día es el que guarda la cuenta de su persecución (las
          // fusiones se la traspasan), así que la respuesta sale de su libro y no de la etapa.
          const dayMove = moves.find((mv) => mv.dayBreak)
          if (dayMove) attributeChase(dayMove, km, peloton.tS)
        }
      }
      for (let a = moves.length - 1; a >= 0; a--) {
        const m = moves[a]!
        if (membersOf(m.g.id).length > 0) continue
        /**
         * EL MOVIMIENTO QUE SE APAGA (v25). Un intento no siempre acaba cazado ni fundido: a veces
         * se queda sin gente porque los suyos se van descolgando de él uno a uno, y entonces el
         * grupo se borraba en silencio. Eso dejaba un ataque con frase de salida y sin desenlace —el
         * defecto más numeroso de los doce— y, cuando el que se apagaba era la fuga del día, un
         * lector esperando una captura que no llegaba nunca. Lo que se abre se cierra.
         */
        if (!m.closed && m.narrated && !m.dayBreak) {
          log.emit(km, peloton.tS, 'intento_fallido', 'move_faded', m.lastIds.slice(0, 3), {
            kind: m.kind,
            km: Math.max(1, Math.round(km - m.bornKm)),
            toGo: Math.round(totalKm - km),
          })
        }
        m.closed = true
        moves.splice(a, 1)
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
      disputeClimb(groups, block, km, log, rngSprint, komLead)
    }

    /**
     * LA FOTO DE LA CARRERA (v26), al final del bloque y con todo ya resuelto: quién se ha
     * descolgado, quién ha vuelto y qué reloj lleva cada grupo. Es lo que le faltaba al banco para
     * poder mirar DENTRO de un puerto —el orden al pie y el orden en la cima— sin suponer nada.
     */
    if (probe && probeAt.has(i)) {
      const clocks = new Map<string, number>([[PELOTON, peloton.tS]])
      for (const m of moves) clocks.set(m.g.id, m.g.tS)
      for (const sg of shed) clocks.set(sg.id, sg.tS)
      const snapshot: SnapshotRider[] = []
      for (const s of sims.values()) {
        if (s.abandonedKm !== null) continue
        const tS = clocks.get(s.groupId)
        if (tS === undefined) continue
        snapshot.push({
          riderId: s.input.riderId,
          groupId: s.groupId,
          // EL RELOJ DE VERDAD, no el de su grupo: el del grupo más lo que lleva cedido en carretera
          // sin haberse soltado —la deriva de la v26 y los segundos del marcaje—. Es exactamente la
          // cuenta con la que se le va a dar el tiempo en meta (`lossOf`), y sin ella la foto vería
          // empatados a los cuarenta corredores de un grupo que en realidad va estirado en la rampa.
          tS: tS + s.markLossS + s.driftS,
          energy: s.energy,
          energy0: s.energy0,
          // QUIÉN VA TIRANDO (v28): el turno de este bloque, ya resuelto por `advance()` unas líneas
          // más arriba en el mismo bloque, y la ventana de trabajo con la que se ordena.
          pulling: s.pulling,
          pullWindow: s.pullWindow,
        })
      }
      probe.onSnapshot(probeAt.get(i)!, snapshot)
    }
  }

  // --- Meta y resultados (SPEC 6.12, 6.15) -----------------------------------------------
  const allGroups: Group[] = [peloton, ...moves.map((m) => m.g), ...shed]
  const moveGroupIds = new Set(moves.map((m) => m.g.id))
  finishStage(
    sims,
    allGroups,
    log,
    rngSprint,
    rngPlacement,
    totalKm,
    finishTerrain,
    leadOutFor,
    moveGroupIds,
  )

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
    // La línea del que corre por su cuenta se coloca donde APARECE, no en el km 0 (v31).
    events: announceRebels(log.toArray(), rebels),
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
  /**
   * A quién se ha PROCLAMADO ya líder de la montaña en esta etapa (v25). Es el estado que hace que
   * `leads` diga «pasa a liderar» y no «lidera»: sin él, el que ya mandaba se proclamaba otra vez en
   * cada cima que coronaba —35 veces en 21 etapas del día de juego 46—.
   */
  kom: { proclaimed: string | null },
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
    /**
     * `leads` DICE «PASA A LIDERAR», NO «LIDERA» (v25). Con la lectura vieja —«está por delante de
     * todos»— el que ya mandaba se proclamaba líder otra vez en cada cima que coronaba: en Race
     * Jaén, Alex Taylor «takes the lead in the mountains» en el km 44 y otra vez en el km 100, y
     * sobre el día de juego 46 son 35 proclamaciones repetidas en 21 etapas. Ganar un maillot es
     * una noticia; conservarlo no es la misma noticia contada dos veces.
     *
     * El liderato se sigue midiendo EN SOLITARIO y contra los DEMÁS (v13, defecto B5): hay que
     * estar ESTRICTAMENTE por delante. Lo que se añade es la otra mitad —no estarlo ya antes—.
     */
    const takesLead = winner.climbPts > bestOther && kom.proclaimed !== winner.input.riderId
    if (takesLead) kom.proclaimed = winner.input.riderId
    log.emit(km, groups[0]?.tS ?? 0, 'banner', 'climb_kom', [winner.input.riderId], {
      category: block.climbCategory ?? '',
      points: table[0] ?? 0,
      leads: takesLead ? 1 : 0,
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
  /** Dado de la COLOCACIÓN en el grupo de meta (v24, docs/motor.md §12.6). */
  rngPlacement: Rng,
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
        const train = leadOutFor.get(m.input.riderId)
        const present =
          train === undefined ? 0 : train.reduce((c, id) => c + (idSet.has(id) ? 1 : 0), 0)
        if (sprintFinish && present > 0) {
          score *= 1 + STAGE.leadOutBoostPerHelper * Math.min(present, STAGE.leadOutMaxHelpers)
        }
        // LA COLOCACIÓN (v24, docs/motor.md §12.6). Se tira SIEMPRE, también cuando el sd es 0,
        // para que la secuencia del subflujo no dependa del tamaño del grupo ni de quién lleve
        // tren: un grupo pequeño consume su tirada y la multiplica por 1 exacto.
        const sd = placementSd(members.length, present, eff.TAC)
        const draw = normal(rngPlacement, 1, sd)
        score *= sd === 0 ? 1 : Math.max(1 - 3 * sd, Math.min(1 + 3 * sd, draw))
        return { m, score }
      })
      .sort((a, b) => b.score - a.score)
    // El tiempo del GRUPO, redondeado UNA sola vez y compartido por todos sus corredores. Antes se
    // sumaba al reloj un épsilon de 1 ms por posición para desempatar el ORDEN y luego se redondeaba
    // el resultado: un grupo que cruzaba en X,477 s repartía X a los 23 primeros y X+1 a los demás,
    // un corte inventado por el redondeo que además se acumulaba etapa tras etapa en la general y en
    // la clasificación por equipos. El orden vive ahora en `finishOrder`, no en el reloj.
    const groupTimeS = Math.round(group.tS)
    // …Y EL QUE LLEGA ESTIRADO NO DISPUTA EL REMATE (v26). El orden dentro del grupo lo decide el
    // remate, pero solo entre los que llegan JUNTOS: el que trae segundos cedidos en carretera entra
    // por detrás de todos los que no traen ninguno, gane el sprint que gane. Con las dos pérdidas a
    // cero —el caso de un grupo que llega compacto, que es el normal— este orden es el de siempre.
    const lossOf = (m: RiderSim): number => Math.round(m.markLossS + m.driftS)
    const strungOut = [...ranked].sort((a, b) => lossOf(a.m) - lossOf(b.m))
    strungOut.forEach(({ m }, idx) => {
      // Los segundos cedidos marcando (SPEC 6.18) y los de la DERIVA de la v26 son tiempo cedido DE
      // VERDAD en carretera —ninguno de los dos se soltó del grupo, pero los dos llegaron con ese
      // retraso—, así que sí separan su tiempo del de sus compañeros de grupo. Es la única
      // separación legítima dentro de un grupo, y es de donde sale la llegada CONTINUA de un final
      // en alto: el ganador, y detrás a 4, a 9, a 17 s, en vez del escalón de la foto de grupo.
      m.finishTs = groupTimeS + lossOf(m)
      m.finishOrder = order + idx
    })
    order += strungOut.length
    if (gi === 0 && strungOut[0]) {
      const field = strungOut.length
      // Sprint masivo A EFECTOS DE CRÓNICA: un grupo numeroso que no llega trepando disputa la
      // meta al sprint, ruede por asfalto, por adoquín o cuesta abajo. Es el mismo criterio de
      // antes (`!finishUphill && field >= 8`) con una definición de "cuesta arriba" que ya no la
      // dispara un solo bloque de los últimos 2 km.
      const isBunch = !isUphillFinish(type) && field >= STAGE.bunchSprintMinRiders
      // Sprint masivo: si el grupo de cabeza es numeroso y la meta es llana, se narra el último km —
      // los rematadores que lo disputan y si el ganador remató bien lanzado por su tren (SPEC 6.15).
      if (isBunch) {
        const top3 = strungOut.slice(0, 3).map((r) => r.m.input.riderId)
        const train = leadOutFor.get(strungOut[0].m.input.riderId) ?? []
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
      /**
       * …Y SOBRE QUIÉN SE LLEVA ESE MARGEN (v27). `margin` es el hueco al SIGUIENTE GRUPO, y el
       * lector que lleva media etapa leyendo «6:53 sobre la persecución» necesita saber que estos
       * 16 s no son sobre lo mismo: son sobre el que viene detrás, que puede ser un compañero de
       * fuga que se acaba de soltar. Con `chaseSize` la frase puede decirlo en la misma línea.
       */
      const chaseSize = withMembers[gi + 1]?.members.length ?? 0
      const won = isBunch ? 'sprint' : field === 1 ? 'solo' : 'group'
      // Reporte de último km cuando NO es un sprint masivo: quién manda en cabeza y con cuánta ventaja,
      // para que el desenlace no llegue de golpe (el sprint masivo ya lo cuenta bunch_sprint).
      if (!isBunch) {
        const leaders = strungOut.slice(0, Math.min(3, field)).map((r) => r.m.input.riderId)
        log.emit(Math.max(0, totalKm - 1), group.tS, 'final', 'final_km', leaders, {
          margin,
          field,
          chaseSize,
        })
      }
      log.emit(totalKm, group.tS, 'meta', 'stage_win', [strungOut[0].m.input.riderId], {
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
