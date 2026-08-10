/**
 * La CAPA TÁCTICA: el intento de movimiento (docs/motor.md §13).
 *
 * Las siete primeras reglas del dueño no son siete mecánicas, son UNA parametrizada por contexto:
 *
 * ```
 * alguien lo intenta   (λ sube si el grupo va junto y si la meta está cerca)
 *       ↓
 * 0..N le siguen       (quién salta depende de atención, rol, energía y cerillos)
 *       ↓
 * algunos no llegan    (los que saltaron y no sostienen se quedan donde estaban)
 *       ↓
 * ¿colaboran?          (cuantos más son, menos; los que peor rematan colaboran más)
 *       ↓
 * prospera o fracasa   (lo decide la carretera: el boquete se integra bloque a bloque)
 * ```
 *
 * Aquí viven las DECISIONES (puras, deterministas, sin estado); la carretera —crear el grupo,
 * integrar el boquete, cazar o no— la resuelve `simulate.ts` con la maquinaria de grupos que ya
 * existía: un ataque logrado ES un grupo nuevo.
 */
import { STAGE } from '../constants.js'
import { clamp, type Rng } from '../random.js'
import { blockProbability } from './hazard.js'
import type { Mentality, StageRole } from './types.js'

/**
 * Las cinco caras del mismo intento. Cambia el contexto (quién es candidato, contra qué λ y con
 * qué objetivo), no la mecánica.
 */
export type MoveKind =
  | 'fuga' // regla 5: los ataques de salida, de los que sale la fuga del día
  | 'contraataque' // regla 1 y 2 con una fuga ya en carretera
  | 'puente' // regla 7: saltar a enganchar al grupo de delante
  | 'ataque_grupo' // regla 6: dentro de una fuga se sigue atacando
  | 'ataque_final' // regla 9: los fuertes se atacan en el final en alto

/** Un corredor visto por la capa táctica: lo justo para decidir si ataca y si sigue un ataque. */
export interface MoveRider {
  riderId: string
  role: StageRole
  mentality: Mentality
  /** Perfil efectivo en este bloque: lo que de verdad puede sostener ahora (SPEC 6.4). */
  perfil: number
  /** Puntuación de remate en el final que viene. Quien peor remata es quien más ataca (regla 6). */
  finishScore: number
  /** Fracción de depósito restante, en [0,1]. */
  energyFraction: number
  /** Cerillos que le quedan: sin cerillo no hay ataque (SPEC 6.6). */
  matches: number
  tac: number
  /** Punta de velocidad: un sprinter puro no se va a la fuga del día (SPEC 6.10). */
  spr: number
  /** Desventaja en la general, en segundos (SPEC 6.9). 0 = es el líder. */
  gcDeficitSeconds: number
  /**
   * EL PLAN DE SU EQUIPO, visto desde las ganas de atacar (v15, docs/motor.md §V.1). 1 = no hay
   * plan que le condicione, y es lo que valen un agente libre y —por la regla 1 de §V.1— el que
   * corre por su cuenta contra las órdenes de su equipo: su decisión manda sobre el plan. Por
   * debajo de 1, el equipo tiene otra cosa que hacer (ya tiene un hombre delante, o está
   * persiguiendo); por encima, no tiene baza que jugar y manda gente a la fuga.
   */
  teamAttack: number
}

/** El contexto que parametriza el intento. */
export interface MoveContext {
  kind: MoveKind
  /** Km que faltan para meta. */
  kmToGo: number
  /** Longitud total de la etapa (km). */
  totalKm: number
  /** Cuántos corredores van en el grupo del que sale el intento. */
  groupSize: number
  /** Cuántos corren aún en la etapa: mide si el grupo «va junto» (regla 1). */
  fieldSize: number
  /** ¿Se sube en este bloque? En subida el ataque separa de verdad. */
  onClimb: boolean
  /** Tensión acumulada del grupo (SPEC 6.10): una fuga tensa ataca más y colabora menos. */
  tension: number
  /**
   * ¿Hay general en juego? En la etapa 1 de una vuelta y en una carrera de un día TODOS llegan con
   * `gcDeficitSeconds` = 0, que leído literalmente diría que el pelotón entero es el líder y que
   * cualquier movimiento es una amenaza mortal. No hay general que defender hasta que hay
   * diferencias: esta bandera es la que lo distingue.
   */
  hasGcContext: boolean
}

// --- 1. ¿Alguien lo intenta? ---------------------------------------------------------------

/** Intensidad base por tipo de movimiento (eventos/km). Todas venían definidas y sin usar. */
function baseLambda(kind: MoveKind): number {
  switch (kind) {
    case 'fuga':
      return STAGE.lambdaBreakawayAttack
    case 'contraataque':
      return STAGE.lambdaCounterAttack
    case 'puente':
      return STAGE.lambdaBridge
    case 'ataque_grupo':
      return STAGE.lambdaClimbAttack
    case 'ataque_final':
      return STAGE.lambdaLateAttack
  }
}

/**
 * Intensidad del intento (regla 1): **sube si el grupo va junto** y **sube cuanto más cerca está
 * la meta**. Un pelotón entero y a 20 km de meta es el caldo de cultivo del ataque; un grupo ya
 * roto y a 150 km de meta, no.
 */
export function moveLambda(ctx: MoveContext): number {
  // Vale 1 cuando el grupo es TODA la carrera (el pelotón entero) y baja hasta el suelo según se
  // rompe: la cohesión solo puede restar, así que el λ nominal es el del grupo junto.
  const cohesion =
    ctx.fieldSize <= 0 ? 1 : clamp(ctx.groupSize / ctx.fieldSize, STAGE.tacticCohesionFloor, 1)
  const run = ctx.totalKm > 0 ? clamp(1 - ctx.kmToGo / ctx.totalKm, 0, 1) : 0
  const proximity = 1 + STAGE.tacticProximityGain * run * run
  // Una fuga tensa ataca mucho más: es la sociología de la fuga que `Group.tension` calculaba y
  // que nadie leía nunca (SPEC 6.10).
  const tense =
    ctx.tension >= STAGE.breakawayTensionThreshold ? STAGE.breakawayTensionAttackFactor : 1
  // Ventana de ataques tardíos (SPEC 6.12): dentro de los últimos `lateAttackKm` la intensidad de
  // un ataque dentro del grupo sube a `lambdaLateAttack` sea cual sea el terreno. Es el ataque que
  // se juega la etapa a una carta.
  const inside = ctx.kind === 'ataque_grupo' || ctx.kind === 'ataque_final'
  const base =
    inside && ctx.kmToGo <= STAGE.lateAttackKm
      ? Math.max(baseLambda(ctx.kind), STAGE.lambdaLateAttack)
      : baseLambda(ctx.kind)
  return base * cohesion * proximity * tense
}

/** ¿Salta el intento en este bloque? (marco de hazard de SPEC 6.8: p = 1 − e^{−λ·dx}). */
export function rollMoveAttempt(rng: Rng, ctx: MoveContext, dx: number = STAGE.dx): boolean {
  return rng() < blockProbability(moveLambda(ctx), dx)
}

// --- 2. ¿Quién lo intenta? -----------------------------------------------------------------

/** Cuánto le apetece a cada rol irse por su cuenta. */
const ROLE_APPETITE: Record<StageRole, number> = {
  cazaetapas: 1.0, // su día es este
  libre: 0.45, // sin órdenes: a ver qué sale
  lider: 0.3, // ataca, pero en su terreno y en su momento (regla 9)
  gregario: 0.2, // su oficio es tirar, no irse
  lanzador: 0.12,
  marcador: 0.1, // vive de la rueda del rival
  sprinter: 0.05, // se guarda para la meta
}

/**
 * Cuánta gente se apunta a cada clase de movimiento. Un puente lo saltan uno o dos: es un esfuerzo
 * a tumba abierta con el grupo ya lejos, no una rueda cómoda. Sin esta corrección medimos puentes
 * de siete corredores que convertían la fuga del día en medio pelotón.
 */
const KIND_FOLLOW: Record<MoveKind, number> = {
  fuga: 1,
  contraataque: 0.7,
  puente: 0.35,
  ataque_grupo: 1,
  ataque_final: 1,
}

/** Y cuánto la mentalidad (SPEC 6.18). */
const MENTALITY_APPETITE: Record<Mentality, number> = {
  supercombativo: 1.6,
  combativo: 1.25,
  oportunista: 0.8,
  reservon: 0.3,
}

/**
 * Ganas de atacar de un corredor AHORA. Manda el rol y la mentalidad, la energía restante corrige
 * (con el depósito vacío no se ataca) y el contexto añade lo suyo:
 *
 * - `ataque_grupo` (regla 6): atacan **los que peor rematarían al sprint** de ese grupo.
 * - `ataque_final` (regla 9): atacan **los fuertes**, y más si andan cerca en la general.
 */
export function attackAppetite(
  r: MoveRider,
  ctx: MoveContext,
  ranks: { finishRank: number; perfilRank: number },
): number {
  if (r.matches <= 0) return 0
  if (r.energyFraction < STAGE.tacticMinEnergyFraction) return 0
  // Filtro de candidatos a la fuga (SPEC 6.10, dos constantes que llevaban definidas y sin usar
  // desde el Paso 21): a la fuga del día no se va un sprinter puro —espera su llegada— ni quien
  // llega a la etapa con el depósito por debajo del 40%.
  if (ctx.kind === 'fuga' || ctx.kind === 'contraataque') {
    if (r.spr >= STAGE.breakawaySkipSprThreshold) return 0
    if (r.energyFraction < STAGE.breakawaySkipEnergyFraction) return 0
  }
  let a = ROLE_APPETITE[r.role] * MENTALITY_APPETITE[r.mentality]
  // EL PLAN DE EQUIPO (v15, §V.1): un equipo con un hombre ya en la carretera no manda a otro, y el
  // que no tiene baza que jugar hoy es el que la manda. Multiplica, no decide: el rol y la
  // mentalidad siguen mandando, y el que corre por su cuenta entra aquí con un 1 limpio.
  a *= r.teamAttack
  // Frescura: quien va vaciado no salta aunque quiera.
  a *= clamp(r.energyFraction, 0, 1)
  if (ctx.kind === 'ataque_grupo') {
    // `finishRank` 0 = el peor rematador del grupo, 1 = el mejor. El que sabe que pierde el sprint
    // es el que tiene que irse antes: sin esto, en una fuga de cinco ataca el que iba a ganar igual.
    a *= 1 + STAGE.tacticWorstFinisherWeight * (1 - ranks.finishRank)
  }
  if (ctx.kind === 'ataque_final') {
    // En el final en alto el que ataca es el que puede: los de abajo del grupo ya van agarrados.
    a *= STAGE.tacticStrongFloor + (1 - STAGE.tacticStrongFloor) * ranks.perfilRank
    // Y el que se juega la general ataca más que el que ya la perdió (SPEC 6.9).
    if (ctx.hasGcContext && r.gcDeficitSeconds <= STAGE.gcThreatFraction * STAGE.gcControlLeash) {
      a *= 1 + STAGE.tacticGcStakeWeight
    }
  }
  return a
}

/** Rango [0,1] de un valor dentro de una lista (0 = el menor, 1 = el mayor). */
export function rankOf(value: number, values: number[]): number {
  if (values.length <= 1) return 1
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return hi > lo ? (value - lo) / (hi - lo) : 1
}

/** Elige a quién se le ocurre atacar, con probabilidad proporcional a sus ganas. `null` si nadie. */
export function chooseInstigator(
  riders: MoveRider[],
  ctx: MoveContext,
  rng: Rng,
): MoveRider | null {
  if (riders.length === 0) return null
  const finishes = riders.map((r) => r.finishScore)
  const perfils = riders.map((r) => r.perfil)
  const weights = riders.map((r) =>
    attackAppetite(r, ctx, {
      finishRank: rankOf(r.finishScore, finishes),
      perfilRank: rankOf(r.perfil, perfils),
    }),
  )
  const total = weights.reduce((acc, w) => acc + w, 0)
  if (total <= 0) return null
  let pick = rng() * total
  for (let i = 0; i < riders.length; i++) {
    pick -= weights[i]!
    if (pick <= 0) return riders[i]!
  }
  return riders[riders.length - 1]!
}

// --- 3. ¿Quién salta detrás, y quién no llega? ---------------------------------------------

/**
 * Probabilidad de que un corredor SALTE detrás del que ataca (regla 2: pueden ser 0 o 40).
 * Manda ir atento (TAC), tener piernas y tener interés; el rol de sprinter o gregario no salta.
 * En un grupo grande cada uno cuenta con que salte otro, así que la atención se diluye.
 */
export function followProbability(r: MoveRider, instigator: MoveRider, ctx: MoveContext): number {
  if (r.riderId === instigator.riderId) return 0
  if (r.energyFraction < STAGE.tacticMinEnergyFraction) return 0
  // Saltar a una rueda es un esfuerzo supraumbral: sin cerillo no se salta (SPEC 6.6).
  if (r.matches <= 0) return 0
  const attention = STAGE.tacticFollowTacWeight * (r.tac / 100)
  const appetite = STAGE.tacticFollowRoleWeight * ROLE_APPETITE[r.role]
  const spirit = STAGE.tacticFollowMentalityWeight * (MENTALITY_APPETITE[r.mentality] - 1)
  const legs = STAGE.tacticFollowEnergyWeight * (r.energyFraction - 1)
  // En el final el que va cerca en la general NO deja marchar al que ataca (regla 9, SPEC 6.9).
  const stake =
    ctx.kind === 'ataque_final' &&
    ctx.hasGcContext &&
    r.gcDeficitSeconds <= STAGE.gcThreatFraction * STAGE.gcControlLeash
      ? STAGE.tacticFollowGcWeight
      : 0
  // En un grupo GORDO cada uno cuenta con que salte otro y la atención se diluye (SPEC 6.12,
  // `bigGroupThreshold`). Así el número ABSOLUTO de los que saltan apenas depende de si el pelotón
  // es de 40 o de 176, que es lo que se ve en carretera.
  const crowd =
    ctx.groupSize > STAGE.bigGroupThreshold ? STAGE.bigGroupThreshold / ctx.groupSize : 1
  return clamp(
    KIND_FOLLOW[ctx.kind] *
      crowd *
      (STAGE.tacticFollowBase + attention + appetite + spirit + legs + stake),
    STAGE.tacticFollowMin,
    STAGE.tacticFollowMax,
  )
}

/**
 * ¿Sostiene el salto quien lo ha intentado? (regla 3: **muchos de los que intentan seguir el
 * ataque no lo consiguen**). Se resuelve con el mismo margen del marcaje (SPEC 6.18): si su perfil
 * de ahora no da para el del que ataca, se queda; y aún así el rebufo del ataque perdona unos
 * puntos.
 */
export function sustainsJump(r: MoveRider, instigator: MoveRider, rng: Rng): boolean {
  const margin = r.perfil - instigator.perfil + STAGE.markDraftTolerance
  if (margin >= 0) return true
  // Por debajo del margen la posibilidad decae: a −6 puntos ya casi nadie aguanta la rueda.
  const p = clamp(1 + margin / -STAGE.markDropMargin, 0, 1)
  return rng() < p
}

// --- 4. ¿Colaboran? ¿Prospera? -------------------------------------------------------------

/**
 * Boquete instantáneo (s) que abre el acelerón (SPEC 6.4: un ataque es una aceleración, no un
 * cambio de tempo). A partir de aquí manda la carretera: el boquete se integra bloque a bloque y
 * el grupo se caza o no se caza.
 */
export function jumpGapSeconds(rng: Rng): number {
  return STAGE.tacticJumpGapSeconds + rng() * STAGE.tacticJumpGapRange
}

/**
 * Cooperación del movimiento (regla 2: «y si son 40, es muy poco probable que colaboren lo
 * suficiente»). Cuantos más van, peor se entienden; y los que peor rematan colaboran más, porque
 * su única opción es que la fuga llegue.
 */
export function moveCooperation(
  size: number,
  meanFinishRank: number,
  tension: number,
  rng: Rng,
): number {
  const base =
    STAGE.breakawayCommitMin + (STAGE.breakawayCommitMax - STAGE.breakawayCommitMin) * rng()
  const crowd = STAGE.tacticCoopSizePenalty * Math.max(0, size - STAGE.breakawaySizeMin)
  // meanFinishRank 0 = los peores rematadores del grupo de origen: se dejan la vida por llegar.
  const hunger = STAGE.tacticCoopHungerWeight * (1 - meanFinishRank)
  const tense = tension >= STAGE.breakawayTensionThreshold ? STAGE.breakawayTensionCoopFactor : 1
  return clamp(
    (base - crowd + hunger) * tense,
    STAGE.tacticCoopMin,
    Math.min(1, STAGE.breakawayCommitMax + STAGE.tacticCoopHungerWeight),
  )
}

/**
 * ¿Le da el pelotón cuerda a este movimiento? (reglas 4 y 5: **muchos intentos fracasan** y **lo
 * normal es que haya muchos intentos antes de que cuaje la fuga del día**).
 *
 * No es azar puro: el pelotón deja marchar más según avanza la etapa —lleva rato peleando y se
 * cansa de cerrar—, menos si el grupo es numeroso, y **nunca de buena gana** si ahí va alguien
 * peligroso para la general (`gcDeficitSeconds` y `gcThreatFraction`, ambos definidos y sin leer
 * hasta ahora).
 */
export function pelotonAllows(move: MoveRider[], ctx: MoveContext, rng: Rng): boolean {
  const run = ctx.totalKm > 0 ? clamp(1 - ctx.kmToGo / ctx.totalKm, 0, 1) : 0
  let p = STAGE.tacticAllowBase + STAGE.tacticAllowKmGain * run
  p -= STAGE.tacticAllowSizePenalty * Math.max(0, move.length - STAGE.breakawaySizeMin)
  const threat =
    ctx.hasGcContext &&
    move.some((r) => r.gcDeficitSeconds <= STAGE.gcThreatFraction * STAGE.gcControlLeash)
  if (threat) p *= 1 - STAGE.tacticAllowGcPenalty
  return rng() < clamp(p, 0, STAGE.tacticAllowMax)
}

// --- Regla 8: el agotado que se deja ir ----------------------------------------------------

/** Lo que hace falta saber de un corredor para decidir si administra el esfuerzo (regla 8). */
export interface GiveUpRider {
  role: StageRole
  mentality: Mentality
  energyFraction: number
  /** ¿Va en el grupo de cabeza? El que se juega la etapa no se deja ir. */
  inFrontGroup: boolean
}

/**
 * Regla 8: **es normal que un corredor agotado se descuelgue en los últimos km**, en montaña y
 * también en llano; salvo motivación especial, **se deja ir**.
 *
 * Hoy solo te descuelgas si no aguantas el P75; nunca porque decidas ahorrar. Esto es la decisión;
 * el cuidado del fuera de control lo pone `simulate.ts`, que solo lo permite cuando lo que se puede
 * perder de aquí a meta cabe dentro del corte (`giveUpMaxLossFraction`).
 */
export function giveUpLambda(r: GiveUpRider, kmToGo: number): number {
  if (kmToGo > STAGE.giveUpKm) return 0
  if (r.energyFraction > STAGE.giveUpEnergyFraction) return 0
  // El que se juega algo aprieta los dientes: el líder, el sprinter que espera su llegada, y el que
  // va delante jugándose la etapa. El reservón, en cambio, administra antes que nadie.
  if (r.inFrontGroup) return 0
  if (r.role === 'lider' || r.role === 'sprinter' || r.role === 'cazaetapas') return 0
  if (r.mentality === 'supercombativo') return 0
  const emptiness = clamp(
    (STAGE.giveUpEnergyFraction - r.energyFraction) / STAGE.giveUpEnergyFraction,
    0,
    1,
  )
  return STAGE.lambdaGiveUp * emptiness
}
