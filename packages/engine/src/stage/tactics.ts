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
  /**
   * ¿IBA DANDO LA CARA AL FRENTE DEL PELOTÓN EN EL BLOQUE ANTERIOR? (v41). El que va en la rotación
   * del pelotón no es el que salta: viene de pagar el viento de ciento setenta hombres, y el que
   * ataca lo hace desde la rueda, con las piernas de no haber pagado nada. El dueño lo vio en una
   * carrera de producción —«el mismo que se escapó, antes de escaparse iba tirando del pelotón»— y
   * tiene toda la razón: no es que sea imposible, es que es la excepción, y el motor lo estaba
   * tratando como el caso normal.
   *
   * DEL PELOTÓN, y no de cualquier grupo, y esto se midió: dentro de una fuga o de un grupo de
   * cabeza rotan todos, así que ahí la bandera no distingue a nadie —y donde sí distinguía era en el
   * puerto final, donde el turno son uno o dos hombres y son justo los que tienen que atacar—.
   * Aplicarlo a todo hundía la brecha 1.º-10.º de la reina de 81 s a 59,5 y dejaba la fuga de
   * montaña en el 25,0 % contra un suelo de 25.
   */
  pulling: boolean
  /**
   * ¿VIENE DE QUE LE CACEN TRAS UNA FUGA LARGA? (v42). No es lo mismo que ir vacío: el depósito ya
   * lo mira `energyFraction`, y con un 29 % este motor le dejaba conservar un 29 % de las ganas. Lo
   * que esto dice es lo otro, lo que en carretera se ve a simple vista —al que le come el pelotón
   * después de pasarse el día delante se le va la cabeza y las piernas a la vez, y se sienta—.
   *
   * El dueño lo cazó entero en una etapa de producción: un corredor que se escapó en solitario, fue
   * cazado, se volvió a escapar, fue cazado otra vez, se escapó una tercera… **y ganó la etapa**.
   */
  gastado: boolean
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
  /**
   * QUIÉN DEFIENDE EN ESTE GRUPO, y con cuánto colchón (v46). Es la mitad que faltaba de la
   * conciencia de general del motor, y faltaba entera: hasta aquí toda ella colgaba de UNA pregunta
   * —`gcDeficitSeconds <= gcThreatFraction · gcControlLeash`— que dice si te juegas algo pero **no
   * de qué lado**. Medido sobre la misma función: el líder (déficit 0) y el rival a 419 s salían con
   * el MISMO apetito de ataque en el puerto final, 0,0816 contra 0,0454 del que está fuera de la
   * ventana. O sea que al maillot se le daba entero el bonus de «tengo que ganar tiempo», que es el
   * signo contrario del suyo.
   *
   * En carretera son dos carreras distintas: el que va a 30 s TIENE que atacar, y el que va de
   * amarillo no —le basta con no perderlo, y atacar es un riesgo que no necesita—. Y cuánto no lo
   * necesita depende de su ventaja: con cinco segundos no se puede sentar; con cuatro minutos, sí.
   *
   * `gcDefenderId` es null cuando no hay nadie defendiendo aquí —el líder no va en este grupo, o hay
   * un empate en cabeza—, y entonces todo se comporta como antes. Los calcula `gcDefence()`.
   */
  gcDefenderId: string | null
  /** Ventaja del que defiende sobre la amenaza más cercana PRESENTE en su grupo, en segundos. */
  gcCushionSeconds: number
  /**
   * CUÁNTO MERECE LA PENA ESTAR HOY EN LA FUGA, en [0,1] (v39). Es la pieza que faltaba y que
   * explica el defecto más gordo que ha salido de comparar el motor con las crónicas de las grandes
   * vueltas de 2024-2026: **el motor hacía fugas de TRES hombres en todos los terrenos**, y en la
   * carretera una fuga de montaña son quince, veinte o cincuenta.
   *
   *   Tour 2025 e12: 52 corredores · e16: 36 · e14/15/18: 17, 15, 14
   *   Vuelta 2025 e12: 53 · e15: 47 · e16/7/6: 17, 13, 10
   *   Tour 2026 e4: ~35 · Frontier Economics (114 etapas): media de 19 en alta montaña
   *   …y en LLANO, cuatro. Ahí el motor acertaba.
   *
   * Y el motivo no es que en montaña la gente sea más valiente: es que **en montaña la fuga puede
   * ganar y en el llano no**. El mismo estudio: 2 % de las llanas contra más del 40 % de las de
   * montaña, y de 30 etapas con fuga de más de dieciséis hombres la fuga ganó 23. Así que a la de
   * montaña se apunta media parrilla —todo el que no se juega la general tiene ahí su día— y a la
   * llana no se apunta nadie: cuatro anónimos a los diez kilómetros y a rodar.
   *
   * Vale 0 en una llana pura y 1 en una etapa que la fuga puede ganar. Lo usan las DOS mitades del
   * problema: cuánta gente salta (`followProbability`) y si el pelotón les da cuerda siendo tantos
   * (`pelotonAllows`).
   */
  breakAppeal: number
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
  // LA SALIDA (v33): el intento sube desde cero durante los primeros kilómetros. Sin esto el λ valía
  // su máximo desde el metro cero —el pelotón entero da la cohesión más alta que hay— y la carrera
  // llegaba al km 1 ya rota tres de cada cuatro veces.
  const kmRun = ctx.totalKm - ctx.kmToGo
  const settle = STAGE.tacticSettleKm > 0 ? clamp(kmRun / STAGE.tacticSettleKm, 0, 1) : 1
  // Ventana de ataques tardíos (SPEC 6.12): dentro de los últimos `lateAttackKm` la intensidad de
  // un ataque dentro del grupo sube a `lambdaLateAttack` sea cual sea el terreno. Es el ataque que
  // se juega la etapa a una carta.
  const inside = ctx.kind === 'ataque_grupo' || ctx.kind === 'ataque_final'
  const base =
    inside && ctx.kmToGo <= STAGE.lateAttackKm
      ? Math.max(baseLambda(ctx.kind), STAGE.lambdaLateAttack)
      : baseLambda(ctx.kind)
  return base * cohesion * proximity * tense * settle
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
 * QUIÉN DEFIENDE LA GENERAL EN ESTE GRUPO, Y CON CUÁNTO COLCHÓN (v46).
 *
 * El que defiende es el LÍDER DE LA CARRERA —déficit 0, no «el mejor de este grupo»—, y la
 * diferencia importa: cinco hombres escapados con el 8.º, el 9.º y el 10.º no llevan a nadie
 * defendiendo, llevan a tres que están GANANDO tiempo, y el mejor de ellos tiene que atacar igual
 * que los otros dos.
 *
 * Y su colchón se mide contra las amenazas QUE VAN CON ÉL, porque son las únicas cuyos ataques
 * puede responder. Que el segundo de la general se le haya ido por delante no es un problema de
 * marcaje sino de persecución, y de eso ya se encargan `pelotonAllows` y la cuerda.
 *
 * Devuelve `null` en los dos casos degenerados, y los dos son a propósito:
 *
 * - **el líder no va en este grupo** — aquí nadie defiende nada;
 * - **hay empate en cabeza** — dos hombres al mismo tiempo no son un líder con ventaja. Ocurre de
 *   verdad y mucho más de lo que parece: en la etapa 1, en una carrera de un día y en cualquier
 *   campo donde `packages/db` no tenga general que contar, TODOS entran con déficit 0. Por eso el
 *   empate devuelve null en vez de un colchón de cero: es la diferencia entre «defiende con 0 s de
 *   ventaja» y «aquí no hay nada que defender».
 *
 * Sin rival presente el colchón es infinito, y está bien: un líder metido en una fuga sin ningún
 * hombre de la general al lado ya está ganando tiempo y no tiene ninguna necesidad de atacar.
 */
export function gcDefence(riders: readonly { riderId: string; gcDeficitSeconds: number }[]): {
  gcDefenderId: string | null
  gcCushionSeconds: number
} {
  let leader: string | null = null
  let empatados = 0
  let cushion = Number.POSITIVE_INFINITY
  for (const r of riders) {
    if (r.gcDeficitSeconds <= 0) {
      empatados += 1
      leader = r.riderId
    } else if (r.gcDeficitSeconds < cushion) {
      cushion = r.gcDeficitSeconds
    }
  }
  if (leader === null || empatados !== 1) return { gcDefenderId: null, gcCushionSeconds: 0 }
  return { gcDefenderId: leader, gcCushionSeconds: cushion }
}

/**
 * CUÁNTO ESTÁ DEFENDIENDO ESTE HOMBRE, en [0,1]: 0 = corre por ganar tiempo, 1 = corre por no
 * perderlo. Es lo que le da SIGNO a la apuesta de la general (v46).
 *
 * Sube con el colchón y satura en `gcDefendCushionS`. Y con colchón cero vale cero, o sea que el
 * motor se comporta EXACTAMENTE como antes en el límite: el líder al que le respiran en la nuca
 * corre como el que le persigue, que es lo que pasa en carretera.
 */
export function gcDefendShare(r: MoveRider, ctx: MoveContext): number {
  if (!ctx.hasGcContext || ctx.gcDefenderId !== r.riderId) return 0
  return clamp(ctx.gcCushionSeconds / STAGE.gcDefendCushionS, 0, 1)
}

/**
 * …Y CUÁNTO TIENE QUE ATACARLE EL QUE VA DETRÁS, en [0,1]: el ESPEJO de la defensa (v46).
 *
 * Esta mitad no es un adorno de simetría, es lo que hace que la otra sea correcta, y salió de
 * medirlo: quitarle al líder las ganas de atacar dejó la montaña MENOS SELECTIVA —el peor día de una
 * reina pasó de 17,65 % de cola a 13,75 %— porque parte de la carrera la hacía él. Y esa es
 * justamente la conclusión equivocada que se sacaría de ahí: que el maillot tiene que atacar. No.
 * Lo que pasa en carretera es que **si el líder se sienta, son sus rivales los que tienen que
 * moverle**, porque es a ellos a quienes se les acaba la carrera.
 *
 * Así que la selectividad vuelve, pero por la razón correcta y de la mano de quien de verdad la
 * produce. Escala con el MISMO colchón que la defensa —cuanto más cómodo va el líder, más
 * desesperados van los otros— y vale cero cuando no hay nadie defendiendo o cuando el líder va con
 * el agua al cuello, que es cuando ya se ataca solo.
 */
export function gcChallengeShare(r: MoveRider, ctx: MoveContext): number {
  if (!ctx.hasGcContext || ctx.gcDefenderId === null || ctx.gcDefenderId === r.riderId) return 0
  return clamp(ctx.gcCushionSeconds / STAGE.gcDefendCushionS, 0, 1)
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
  // …Y AL QUE ACABAN DE CAZAR TRAS UNA FUGA LARGA NO SE LE OCURRE NADA (v42). Ver `MoveRider.gastado`.
  if (r.gastado) return 0
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
  // …Y EL QUE VA TIRANDO DEL PELOTÓN NO SALTA (v41). No es un veto —de un relevo se puede arrancar, y
  // a veces se arranca— pero es la excepción: el que ataca viene de la rueda. Ver `MoveRider.pulling`.
  if (r.pulling) a *= STAGE.tacticPullingAppetite
  if (ctx.kind === 'ataque_grupo') {
    // `finishRank` 0 = el peor rematador del grupo, 1 = el mejor. El que sabe que pierde el sprint
    // es el que tiene que irse antes: sin esto, en una fuga de cinco ataca el que iba a ganar igual.
    a *= 1 + STAGE.tacticWorstFinisherWeight * (1 - ranks.finishRank)
  }
  if (ctx.kind === 'ataque_final') {
    /**
     * …Y EN EL DESENLACE DEPENDE DE DÓNDE SE ACABA (v39). El dueño: «lo de `ataque_final` dependerá:
     * si es un final en llano no haría sentido que un escalador ataque al final ahí».
     *
     * Tenía razón, y el defecto era de bulto: esto trataba igual el último puerto de una reina que
     * los últimos doce kilómetros llanos de una etapa de velocistas. En los dos casos empujaba a
     * atacar A LOS FUERTES y encima le sumaba un extra al que se juega la general —o sea que en una
     * llana el favorito de la general se lanzaba a doce kilómetros de meta para nada—.
     *
     * En la carretera son dos situaciones distintas y las decide el terreno:
     *
     * - **Cuesta arriba** atacan los fuertes, y el que se juega la general más que nadie: ahí el
     *   ataque GANA TIEMPO, que es de lo que va.
     * - **En llano** ataca el que sabe que pierde la llegada, exactamente igual que dentro de una
     *   fuga (`ataque_grupo`): el que va a ganar el sprint no se tira a doce kilómetros, espera. Y
     *   el favorito de la general no se juega nada arrancando en un llano donde no va a sacar
     *   tiempo, así que el extra de la general no se aplica.
     */
    if (ctx.onClimb) {
      // En el final en alto el que ataca es el que puede: los de abajo del grupo ya van agarrados.
      a *= STAGE.tacticStrongFloor + (1 - STAGE.tacticStrongFloor) * ranks.perfilRank
      /**
       * Y el que se juega la general ataca más que el que ya la perdió (SPEC 6.9)… PERO SOLO SI LO
       * QUE SE JUEGA ES GANAR TIEMPO (v46). Este bonus se le daba entero al maillot, que es el
       * único del grupo que no lo necesita: medido, el líder y el rival a 419 s salían con el mismo
       * 0,0816 de apetito. Ahora la apuesta tiene signo y el que defiende lo pierde de forma
       * gradual, no de golpe: con el colchón a cero sigue valiendo entero.
       *
       * Y NO SE CONVIERTE EN CASTIGO: al líder que defiende se le quita un bonus que estaba mal, no
       * se le pone un freno. El freno ya lo tiene y es el suyo —`autoOrders` le pone `reservon`, o
       * sea 0,3 de apetito— y meter aquí otro sería cobrarle dos veces la misma prudencia.
       */
      if (ctx.hasGcContext && r.gcDeficitSeconds <= STAGE.gcThreatFraction * STAGE.gcControlLeash) {
        a *=
          1 +
          STAGE.tacticGcStakeWeight * (1 - gcDefendShare(r, ctx)) +
          STAGE.tacticGcChallengeWeight * gcChallengeShare(r, ctx)
      }
    } else {
      a *= 1 + STAGE.tacticWorstFinisherWeight * (1 - ranks.finishRank)
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
  // …y tampoco salta a la rueda de nadie: le acaban de comer después de un día delante (v42).
  if (r.gastado) return 0
  // Saltar a una rueda es un esfuerzo supraumbral: sin cerillo no se salta (SPEC 6.6).
  if (r.matches <= 0) return 0
  const attention = STAGE.tacticFollowTacWeight * (r.tac / 100)
  const appetite = STAGE.tacticFollowRoleWeight * ROLE_APPETITE[r.role]
  const spirit = STAGE.tacticFollowMentalityWeight * (MENTALITY_APPETITE[r.mentality] - 1)
  const legs = STAGE.tacticFollowEnergyWeight * (r.energyFraction - 1)
  // En el final el que va cerca en la general NO deja marchar al que ataca (regla 9, SPEC 6.9).
  /**
   * …Y EL QUE DEFIENDE SALTA MÁS QUE EL QUE PERSIGUE (v46). Aquí el signo ya era el correcto —al
   * líder le interesa seguir— pero la magnitud no distinguía: el maillot y el rival a 300 s tenían
   * la misma probabilidad, 0,4870. En carretera no es lo mismo. El que persigue puede dejar marchar
   * un ataque que no le sirve; el que defiende no puede dejar marchar ninguno, porque cualquiera de
   * ellos le quita la camiseta. Esa es toda la diferencia entre atacar y defender, y es la mitad de
   * la conducta que faltaba: el líder deja de moverse y pasa a MARCAR.
   */
  const stake =
    ctx.kind === 'ataque_final' &&
    ctx.hasGcContext &&
    r.gcDeficitSeconds <= STAGE.gcThreatFraction * STAGE.gcControlLeash
      ? STAGE.tacticFollowGcWeight * (1 + STAGE.tacticFollowDefendGain * gcDefendShare(r, ctx))
      : 0
  // En un grupo GORDO cada uno cuenta con que salte otro y la atención se diluye (SPEC 6.12,
  // `bigGroupThreshold`). Así el número ABSOLUTO de los que saltan apenas depende de si el pelotón
  // es de 40 o de 176, que es lo que se ve en carretera.
  /**
   * …Y EL TOPE SE ENSANCHA CUANDO LA FUGA MERECE LA PENA (v39, `breakAppeal`). La dilución existe
   * porque en un pelotón grande cada uno cuenta con que salte otro, y eso es verdad EN UNA LLANA:
   * ahí la fuga no gana y nadie se pelea por entrar. En una etapa de montaña es al revés —la fuga
   * es el día de todo el que no se juega la general— y entonces no se diluye nada: salta todo el
   * que puede, y de ahí salen las fugas de veinte, treinta o cincuenta que se ven en la carretera y
   * que el motor no sabía hacer.
   */
  const apetito =
    ctx.kind === 'fuga' || ctx.kind === 'contraataque' ? clamp(ctx.breakAppeal, 0, 1) : 0
  const umbral = STAGE.bigGroupThreshold * (1 + STAGE.breakAppealCrowdGain * apetito)
  const crowd = ctx.groupSize > umbral ? umbral / ctx.groupSize : 1
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
 * EL BOQUETE QUE ABRE EL ACELERÓN, CALCULADO Y NO SORTEADO (v39).
 *
 * Hasta la v38 esto era un dado: **5 a 12 segundos, siempre, pasara lo que pasara**. El dueño lo
 * tumbó con dos casos que no necesitan más discusión:
 *
 * > «Si hay un grupo de 5, ataca 1 y todos los otros 4 saltan detrás de él, pues no se abre ningún
 * > boquete instantáneo, ¿no? O si están subiendo superfuerte un puerto e intenta atacar alguien
 * > pero su velocidad de ataque es menor que la del que va tirando del grupo, pues tampoco.»
 *
 * Y el otro lado de la misma moneda:
 *
 * > «El ataque lo que tiene que hacer es incrementar temporalmente la velocidad, y será muy
 * > diferente en montaña que en llano. Un ataque en montaña de un escalador probablemente puede
 * > hacer más de 12 segundos en 100 metros, y otro que no sea escalador quizás no consiga ni
 * > escaparse.»
 *
 * O sea: el boquete es una CONSECUENCIA, no un parámetro. Se mide como se mide cualquier boquete en
 * este motor —dos velocidades y una distancia— y sale gratis todo lo que él pide:
 *
 * - En una rampa dura un escalador gana un montón en trescientos metros; en el llano, el mismo
 *   hombre no gana nada, porque ahí la ley de velocidad apenas premia el vatio extra
 *   (`loadExponent` 0,39 en llano contra 1,0 subiendo) y encima va solo contra un grupo que rota.
 * - El que ataca sin ser más rápido que el grupo que deja **no abre hueco**: la cuenta da cero o
 *   negativo y el intento se queda en intento.
 *
 * Devuelve segundos, nunca negativo.
 */
export function jumpGapSeconds(attackerKmh: number, groupKmh: number): number {
  if (attackerKmh <= 0 || groupKmh <= 0) return 0
  /**
   * …Y EL SALTO SE MIDE EN SEGUNDOS, NO EN METROS (v39), que es la misma corrección que el dueño
   * hizo para el cerillo, un nivel más arriba: «en vez de durar un número de metros debería durar
   * un número de segundos». Un hachazo dura lo que dura un hachazo —tres cuartos de minuto a tumba
   * abierta— y eso son seiscientos metros rodando y doscientos cincuenta subiendo.
   *
   * Medirlo en metros hacía imposible cuadrar las dos bandas a la vez, y se ve en la medida: con
   * 0,45 km la reina entraba en banda (42 %) pero la llana se hundía al 3,3 % contra un suelo del
   * 5 %, y con 0,6 km pasaba lo contrario. No era un problema de calibración: era que el mismo
   * hachazo duraba el doble de TIEMPO en un puerto que en el llano.
   */
  const surgeKm = (groupKmh * STAGE.tacticSurgeSeconds) / 3600
  const ganado = surgeKm * (1 / groupKmh - 1 / attackerKmh) * 3600
  return Math.max(0, ganado)
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
 * ¿ME INTERESA A MÍ QUE ESTO LLEGUE JUNTO? (v39) — cuánto DEJA de colaborar un hombre porque no
 * tiene nada que ganar donde va.
 *
 * Es el mecanismo que faltaba, y el dueño lo pidió con dos ejemplos que son el mismo:
 *
 * > «en un grupo de seis a ocho kilómetros de meta relevan los seis, incluido el que sabe que
 * > pierde el sprint… y no solo es así: si es una etapa de montaña y en la fuga van con un súper
 * > escalador y tú eres mal escalador, lo normal es que no cooperes.»
 *
 * Los dos casos son la misma pregunta —**¿tengo yo alguna opción de ganar desde aquí?**— y el motor
 * ya tenía con qué contestarla: `finishScore` sobre el tipo de final que dibuja el recorrido. Contra
 * un rematador en un sprint y contra un escalador en un puerto la cuenta es la misma; lo que cambia
 * son los pesos del final, que es justo lo que `finishScore` sabe.
 *
 * Hasta la v38 la cooperación de un movimiento se decidía UNA VEZ, al nacer (`moveCooperation`: el
 * tamaño, el hambre media y la tensión) y **no se volvía a mirar nunca**. Una fuga de seis colaboraba
 * igual a 150 km de meta que a 5, y colaboraba igual llevara dentro a un fuera de serie o no. De ahí
 * salía el defecto que el banco de media montaña medía: el ganador llegaba SOLO el 4 % de las veces
 * contra el 20-30 % que pide el dueño, porque nadie se miraba y nadie se escapaba.
 *
 * Dos factores, y el segundo es el que hace que las fugas sigan existiendo:
 *
 * - **La desventaja**, en puntos de remate contra el mejor del grupo, saturando en
 *   `coopNoChanceGap`. Cero para el que manda en el grupo —él sí quiere que esto llegue— y uno para
 *   el que va con alguien inalcanzable.
 * - **Lo cerca que está la decisión.** Lejos de meta la fuga es de todos: si no llega, no gana
 *   nadie, así que hasta el peor rematador se deja la vida (`coopSelfishFloor`). Cerca, la carrera
 *   ya es de cada uno. Sin esta mitad, una fuga con un fuera de serie dentro no saldría jamás del
 *   kilómetro cero, que es lo contrario de lo que se ve en carretera.
 */
export function noChanceToWin(
  myFinishScore: number,
  bestFinishScore: number,
  kmToGo: number,
): number {
  const gap = Math.max(0, bestFinishScore - myFinishScore)
  const desventaja = clamp(gap / Math.max(1e-9, STAGE.coopNoChanceGap), 0, 1)
  if (desventaja <= 0) return 0
  const lejos = clamp(
    (kmToGo - STAGE.coopSelfishKm) / Math.max(1e-9, STAGE.coopSelfishFarKm - STAGE.coopSelfishKm),
    0,
    1,
  )
  const cerca = STAGE.coopSelfishFloor + (1 - STAGE.coopSelfishFloor) * (1 - lejos)
  return desventaja * cerca
}

/**
 * LOS MOVIMIENTOS DE LOS QUE SALE LA FUGA DEL DÍA: los que se marchan del pelotón camino de meta y
 * se juegan la etapa por delante. Son los que el maillot NO puede coger (v32, ver `pelotonAllows`).
 *
 * La lista es cerrada a propósito, y lo que falta importa más que lo que hay: **`ataque_final` no
 * está**. El líder que ataca en el puerto decisivo o en los últimos kilómetros no es una fuga que
 * se le escapa al pelotón, es la carrera —el maillot atacando para sentenciar es de las mejores
 * cosas que tiene el ciclismo— y ahí no hay veto que valga. `ataque_grupo` tampoco está porque
 * jamás llega hasta aquí: los ataques que salen de un grupo YA escapado no pasan por esta aduana.
 */
const DAY_BREAK_KINDS: readonly MoveKind[] = ['fuga', 'contraataque', 'puente']

/**
 * ¿VA EL MAILLOT EN ESTE MOVIMIENTO? Deficit 0 es, por definición, quien lleva el maillot
 * (`gcDeficitSeconds` se mide contra el mejor de la general), y empatar a cero es ir de co-líder.
 *
 * Vive aquí y no suelto en dos sitios porque la regla la aplican DOS capas y tienen que decir lo
 * mismo: `pelotonAllows` niega la cuerda, y `simulate.ts` niega además la CORONA de fuga del día
 * —un movimiento puede prosperar sin cuerda, y sin esto el veto se quedaba a medias (medido: 17 de
 * 17 casos que se colaban eran movimientos SIN cuerda coronados igualmente)—.
 *
 * `hasGcContext` es imprescindible: en la etapa 1 de una vuelta y en las carreras de un día todos
 * llegan con 0, y leerlo literal diría que el pelotón entero lleva el maillot.
 */
export function carriesGcLeader(
  gcDeficitsSeconds: Iterable<number>,
  hasGcContext: boolean,
): boolean {
  if (!hasGcContext) return false
  for (const d of gcDeficitsSeconds) if (d <= 0) return true
  return false
}

/**
 * ¿Le da el pelotón cuerda a este movimiento? (reglas 4 y 5: **muchos intentos fracasan** y **lo
 * normal es que haya muchos intentos antes de que cuaje la fuga del día**).
 *
 * No es azar puro: el pelotón deja marchar más según avanza la etapa —lleva rato peleando y se
 * cansa de cerrar—, menos si el grupo es numeroso, y **nunca de buena gana** si ahí va alguien
 * peligroso para la general (`gcDeficitSeconds` y `gcThreatFraction`).
 *
 * LA AMENAZA SE MIDE EN SEGUNDOS, NO EN UN SÍ/NO (v32). Hasta la v31 esto era un ESCALÓN: quien
 * estuviera dentro de la ventana de amenaza —258 s— se llevaba el mismo castigo plano
 * (`tacticAllowGcPenalty`) tanto si iba a 4:10 como si llevaba el maillot puesto. Medido, las dos
 * filas salían IDÉNTICAS (6,2 % / 12,4 % / 18,7 % al empezar, a mitad y al final de la etapa): el
 * motor no distinguía al líder de la general de un rival a cuatro minutos. Ahora el castigo lo pone
 * el MÁS PELIGROSO del grupo y vale lo que valga su cercanía real: entero pegado al maillot, cero
 * en el borde de la ventana, y una rampa lineal entre medias.
 *
 * Y EL MAILLOT ES VETO, NO DESCUENTO. Un descuento del 75 % por intento parece mucho y no lo es:
 * una etapa hace una docena larga de intentos y basta con que UNO salga, así que compuesto daba un
 * 73 % (10 intentos), 93 % (20) o 98 % (30) de que el líder se fuera en la fuga alguna vez. Que
 * pasara era lo normal, no mala suerte —y en producción pasó: Race Sardegna e2, 136 km llanos, el
 * maillot escalador en la fuga ganando al sprint una etapa de velocistas—. La fuga del día no se
 * lleva al líder de la general: el pelotón entero vive de que eso no ocurra.
 */
export function pelotonAllows(move: MoveRider[], ctx: MoveContext, rng: Rng): boolean {
  const run = ctx.totalKm > 0 ? clamp(1 - ctx.kmToGo / ctx.totalKm, 0, 1) : 0
  let p = STAGE.tacticAllowBase + STAGE.tacticAllowKmGain * run
  /**
   * …Y NO SE CONCEDE LA FUGA DEL DÍA EN EL KILÓMETRO UNO (v39). El dueño, leyendo la radio de
   * carrera: «yo veo que en el 99 % de los casos en el km 1 ataca alguien, lo cual no tiene mucho
   * sentido». Fui a medirlo y tenía razón en lo que importaba: los INTENTOS del km 1 están bien —una
   * fuga sale del disparo—, pero el pelotón se la CONCEDÍA ahí mismo. Medido en Race Jaén, tres
   * semillas seguidas: `attack_go` en el km 1,2 · 1,6 · 1,8 y `breakaway_formed` en el mismo
   * kilómetro dos de las tres veces. La primera línea de la crónica era siempre la misma.
   *
   * La causa era que `tacticAllowBase` vale 0,3 desde el metro cero, o sea que a los dos primeros
   * que saltaban se les daba cuerda tres de cada diez veces. Y un pelotón fresco en el kilómetro uno
   * no le regala el día a los dos primeros que saltan: todo el mundo quiere estar ahí, se cierra
   * todo, y la buena sale cuando la gente empieza a cansarse de cerrar. Eso es una rampa, igual que
   * la que ya tiene el INTENTO (`tacticSettleKm`), y por la misma razón.
   *
   * …Y CUÁNTO DURA LA PELEA DEPENDE DEL TERRENO (v39). Las crónicas de las grandes vueltas lo dicen
   * con números: la fuga de una llana se va **antes del kilómetro diez** —no se apunta nadie, van
   * cuatro anónimos— y la de una etapa de montaña puede tardar **cien kilómetros**, porque ahí se
   * apunta media parrilla y hasta que no se marcha el grupo bueno no para la pelea. Es la misma
   * `breakAppeal` que decide cuánta gente salta, leída para el otro lado: donde la fuga merece la
   * pena, cuesta que se vaya. Un solo número explica las dos mitades.
   */
  const settle =
    STAGE.tacticAllowSettleFlatKm +
    (STAGE.tacticAllowSettleClimbKm - STAGE.tacticAllowSettleFlatKm) * clamp(ctx.breakAppeal, 0, 1)
  const kmRun = Math.max(0, ctx.totalKm - ctx.kmToGo)
  const asentada = settle > 0 ? clamp(kmRun / settle, 0, 1) : 1
  p *= STAGE.tacticAllowSettleFloor + (1 - STAGE.tacticAllowSettleFloor) * asentada
  /**
   * …Y EL CASTIGO POR SER MUCHOS SE AFLOJA CUANDO LA FUGA MERECE LA PENA (v39). El castigo dice que
   * un pelotón cierra antes una fuga numerosa que una de cuatro anónimos, y en una llana es cierto.
   * En una etapa de montaña no: ahí el pelotón CONCEDE precisamente porque son muchos y porque casi
   * ninguno se juega la general —es la fuga de cincuenta y tres de la Vuelta 2025—. Sin esto, con
   * `tacticAllowSizePenalty` = 0,05 por hombre, una fuga de veinte se quedaba en probabilidad
   * negativa: no se le daba cuerda NUNCA, y las fugas grandes seguían sin existir por el otro lado.
   */
  const holgura = 1 - clamp(ctx.breakAppeal, 0, 1)
  p -= STAGE.tacticAllowSizePenalty * holgura * Math.max(0, move.length - STAGE.breakawaySizeMin)
  let vetoed = false
  if (ctx.hasGcContext) {
    // El que manda es el más cercano al maillot: un grupo es tan peligroso como su hombre peligroso.
    let closest = Number.POSITIVE_INFINITY
    for (const r of move) closest = Math.min(closest, r.gcDeficitSeconds)
    const threatWindow = STAGE.gcThreatFraction * STAGE.gcControlLeash
    if (closest < threatWindow) {
      p *= 1 - STAGE.tacticAllowGcPenalty * clamp(1 - closest / threatWindow, 0, 1)
    }
    vetoed =
      DAY_BREAK_KINDS.includes(ctx.kind) &&
      carriesGcLeader(
        move.map((r) => r.gcDeficitSeconds),
        ctx.hasGcContext,
      )
  }
  // EL DADO SE TIRA SIEMPRE, decida lo que decida el veto, y no es manía: `rngTactics` es un flujo
  // compartido por toda la etapa, así que ahorrarse una tirada aquí correría el flujo de TODAS las
  // etapas del juego —el mismo motivo por el que la v21 quitó la FRASE del ataque del km 0 y no el
  // movimiento—. Vetar sin tirar movería huellas selladas que no tienen nada que ver con esto.
  const allowed = rng() < clamp(p, 0, STAGE.tacticAllowMax)
  return allowed && !vetoed
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
