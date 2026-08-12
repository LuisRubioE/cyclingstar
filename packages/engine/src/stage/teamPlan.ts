/**
 * EL PLAN DE EQUIPO, Y POR QUÉ (docs/motor.md §V.1).
 *
 * Hasta la v14 el motor no conocía los equipos: `StageRider` no traía `teamId` y lo único que había
 * era `orders.targetRiderId`, del que `simulate.ts` derivaba «X trabaja para Y». Eso alcanzaba para
 * el trabajo de un gregario, pero no para lo que pedía el dueño: **«por equipo, pero también
 * teniendo en cuenta las individualidades»**. Sin equipos, la caza era un escalar de etapa, el turno
 * de relevos se decidía corredor a corredor —y por eso los tres que más tiraban casi nunca eran del
 * mismo equipo— y no existía «este equipo tira y este otro se esconde».
 *
 * Y la mitad que faltaba, dictada después:
 *
 * > «no es solo saber qué equipo(s) participan de la persecución... también es saber POR QUÉ!! que
 * > normalmente será por ganar la etapa porque es una etapa en la que tienen al favorito o uno de
 * > los favoritos... o por la general (o bien son el líder y es una fuga peligrosa para la
 * > general... o bien el equipo de un favorito para la general, ídem)»
 *
 * Por eso la pieza central de este módulo no es una etiqueta de comportamiento sino un MOTIVO
 * (`TeamPurpose`) que sale de la situación de carrera y de nada más: quién tiene al favorito para el
 * final que dibuja ESTE recorrido, quién lleva el maillot, y a quién amenaza de verdad lo que se ha
 * ido por delante. El motivo decide cuánto gasta el equipo, si toma el frente, cuánto ataca y qué
 * dice la crónica. Y su corolario, que es el «no debería desgastarse a lo wey» del dueño a escala de
 * equipo: **el que no tiene ninguno de los tres motivos no tiene por qué gastar**.
 *
 * Aquí viven las DECISIONES del plan (puras, deterministas, sin estado y sin azar); el estado que se
 * gasta —el presupuesto de esfuerzo— lo lleva `simulate.ts`, que es quien ve la carretera.
 *
 * Tres reglas mandan sobre todo lo demás, y son las de §V.1:
 *
 * 1. **Las individualidades priman sobre el plan.** El que corre por su cuenta (§VI.2) queda FUERA
 *    del plan: ni le empuja ni le frena. Su decisión gana.
 * 2. **Un corredor sin equipo corre solo.** `teamId` nulo no participa de ningún plan colectivo.
 * 3. **Un campo sin equipos se comporta EXACTAMENTE como antes.** Es lo que permite que los
 *    escenarios canónicos —que no tienen equipos— no se muevan ni un segundo.
 */
import { STAGE } from '../constants.js'
import { clamp } from '../random.js'
import type { Mentality, StageRole } from './types.js'

/**
 * POR QUÉ gastaría un equipo hoy. Los tres motivos son los que dictó el dueño, y ninguno es una
 * etiqueta puesta a mano: los tres se derivan de la carrera.
 */
export type TeamPurpose =
  /** «Tenemos al favorito, o a uno de los favoritos, para ESTE final» (`finishScore` del recorrido). */
  | 'etapa'
  /** «Somos el equipo del líder»: alguien suyo lleva el maillot (`gcDeficitSeconds` = 0). */
  | 'maillot'
  /** «Somos el equipo de un favorito de la general», que se juega lo mismo un escalón más abajo. */
  | 'general'
  /** Ninguno de los tres. No tiene por qué gastar, y no gasta. */
  | 'ninguno'

/**
 * QUÉ hace un equipo con su motivo. Es la traducción del motivo a carretera, y depende de la
 * situación: el mismo motivo «por la etapa» es un tren de sprint en una llana y un tempo de
 * protección en un final en alto.
 */
export type TeamIntent =
  /** Hay que cazar lo que se vaya: la meta es suya. */
  | 'perseguir'
  /** Lo mismo, pero ya en los últimos km: el tren se monta para lanzarlo. */
  | 'lanzar'
  /** Limitar el boquete sin capturar: es lo que hace el equipo que defiende la general. */
  | 'controlar'
  /** Poner tempo y arropar a su hombre para el final que viene. */
  | 'proteger'
  /** Ya tiene un hombre en la carretera: ni tira ni ataca, defiende lo que hay delante. */
  | 'fuga'
  /** Sin motivo: se esconde, y manda gente a la fuga. */
  | 'nada'

/** Un corredor visto por el plan de equipo: lo justo para repartir papeles y motivos. */
export interface TeamPlanRider {
  riderId: string
  /** `null` = agente libre: corre de forma individual (§V.1, regla 2). */
  teamId: string | null
  role: StageRole
  mentality: Mentality
  targetRiderId?: string
  /** Punta de velocidad de salida: decide si la baza del sprint es real. */
  spr: number
  /**
   * Lo bueno que es para EL FINAL DE HOY (`stage/finish.ts::finishScore` sobre el tipo de final que
   * dibuja el recorrido). Es la cuenta que responde a «tienen al favorito de la etapa» sin tener que
   * inventar ningún dato: los mismos siete tipos de final y los mismos pesos por atributo que ya
   * deciden el remate.
   */
  finishScore: number
  /** Desventaja en la general (SPEC 6.9). 0 con contexto de general = lleva el maillot. */
  gcDeficitSeconds: number
}

/** El contexto de la etapa que decide qué motivos existen hoy. */
export interface TeamPlanContext {
  /**
   * ¿La meta admite una LLEGADA AGRUPADA? (`admitsBunchFinish`, v22). Si trepa de verdad —un final
   * en alto— la baza no se juega igual: no hay tren que montar y el equipo protege en vez de tirar.
   * Un repecho de meta SÍ admite llegada agrupada, y hasta la v21 no lo hacía (docs/balance.md v22).
   */
  bunchFinish: boolean
  /**
   * ¿Hay general en juego? En la etapa 1 de una vuelta y en toda carrera de un día TODOS llegan con
   * `gcDeficitSeconds` = 0: leído literalmente, el pelotón entero sería el líder. Sin esta bandera
   * los motivos de general se dispararían en cada clásica, que es justo lo que no pasa en carretera.
   */
  hasGcContext: boolean
}

/** El plan de un equipo para la etapa, antes de que la carretera hable. */
export interface TeamPlan {
  teamId: string
  memberIds: string[]
  /** El hombre al que sirve el plan. `null` = el equipo no tiene jefe de filas hoy. */
  leaderId: string | null
  /**
   * POR QUÉ gastaría hoy. Puede tener MÁS DE UNO (el equipo del líder que además lleva al mejor
   * rematador del día): ver `teamDrive` y `narratedPurpose` para qué se hace con eso.
   */
  purposes: TeamPurpose[]
  /** Su mejor hombre para el final de hoy. `null` si no tiene candidato real. */
  stageCandidateId: string | null
  /**
   * Lo bueno que es esa carta (`finishScore` del candidato, 0 si no lo hay). Desempata quién TOMA
   * EL FRENTE cuando dos equipos tienen el mismo derecho: en carretera lo toma el que más se juega.
   */
  quality: number
  /** Déficit en la general de su mejor clasificado; `null` si no hay general en juego. */
  gcDeficitSeconds: number | null
  /** ¿El recorrido dibuja una llegada que su candidato disputaría al sprint? */
  sprintFinish: boolean
  /**
   * PRESUPUESTO DE ESFUERZO, en las mismas unidades que el trabajo al frente de `advance()`
   * (`max(0, compromiso − frontWorkIdleCommit) · dx` por bloque y corredor que releva). Es lo que
   * impide que un equipo lleve 80 km tirando y siga a tope: cuando se agota, sus hombres salen del
   * turno de relevos y el frente pasa a otro equipo.
   */
  budget: number
  /**
   * Los que corren POR SU CUENTA contra el plan (docs/motor.md §VI.2). No es un castigo: quedan
   * fuera del plan, ni empujados ni frenados por él, y pierden lo que da el equipo (la protección de
   * gregarios y el tren de meta ya apuntan al jefe de filas, no a ellos).
   */
  rebelIds: string[]
}

/** Prioridad de rol para elegir jefe de filas cuando nadie apunta a nadie. */
function leaderScore(r: TeamPlanRider, ctx: TeamPlanContext): number {
  switch (r.role) {
    case 'sprinter':
      return ctx.bunchFinish ? 4 : 1
    case 'lider':
      return 3
    case 'cazaetapas':
      return 1
    default:
      return 0
  }
}

/** Desempate total y estable por id: el plan no puede depender del orden del array de entrada. */
function byId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * El jefe de filas de un equipo: a quien apuntan sus gregarios y lanzadores. Si nadie apunta a
 * nadie, el que mejor papel tenga para el final que dibuja el recorrido.
 */
function pickLeader(team: TeamPlanRider[], ctx: TeamPlanContext): string | null {
  const ids = new Set(team.map((r) => r.riderId))
  const votes = new Map<string, number>()
  for (const r of team) {
    if (r.role !== 'gregario' && r.role !== 'lanzador') continue
    const t = r.targetRiderId
    if (!t || !ids.has(t)) continue
    votes.set(t, (votes.get(t) ?? 0) + 1)
  }
  if (votes.size > 0) {
    return [...votes.entries()].sort((a, b) => b[1] - a[1] || byId(a[0], b[0]))[0]![0]
  }
  const ranked = [...team]
    .filter((r) => leaderScore(r, ctx) > 0)
    .sort((a, b) => leaderScore(b, ctx) - leaderScore(a, ctx) || byId(a.riderId, b.riderId))
  return ranked[0]?.riderId ?? null
}

/**
 * Construye el plan de cada equipo, con su MOTIVO. Los agentes libres (`teamId` nulo) no aparecen:
 * corren de forma individual y ninguna de estas reglas les toca (§V.1, regla 2).
 */
export function buildTeamPlans(
  riders: readonly TeamPlanRider[],
  ctx: TeamPlanContext,
): Map<string, TeamPlan> {
  const byTeam = new Map<string, TeamPlanRider[]>()
  for (const r of riders) {
    if (!r.teamId) continue
    const list = byTeam.get(r.teamId) ?? []
    list.push(r)
    byTeam.set(r.teamId, list)
  }
  // «TENEMOS AL FAVORITO DE HOY» se mide contra el CAMPO, no en abstracto: un rematador de 78 es el
  // favorito en una continental y no pinta nada en una gran vuelta. Es la misma idea con la que
  // `chase.ts` decide quién tiene opciones reales de sprint, pero sobre el final que dibuja el
  // recorrido y con la mezcla de atributos de `stage/finish.ts`, no con un solo SPR.
  const bestFinish = riders.reduce((mx, r) => Math.max(mx, r.finishScore), 0)

  const plans = new Map<string, TeamPlan>()
  for (const [teamId, team] of [...byTeam.entries()].sort((a, b) => byId(a[0], b[0]))) {
    const members = [...team].sort((a, b) => byId(a.riderId, b.riderId))
    const leaderId = pickLeader(members, ctx)
    /**
     * DESOBEDECER LAS ÓRDENES DEL EQUIPO (docs/motor.md §VI.2), que estaba especificado y no se
     * ejecutaba en ninguna parte. Dos formas de ir por libre, y las dos se leen de las órdenes:
     *
     * - **Dos jefes en un equipo**: el que se declara líder o sprinter sin ser el jefe de filas del
     *   plan se ha ido por su cuenta. Es el caso del encargo: el jugador humano se pone de líder
     *   cuando su equipo ya tiene uno. `world/autoOrders.ts` nunca nombra dos, así que en un pelotón
     *   de bots esto no ocurre nunca.
     * - **El que trabaja para un extraño**: apunta con `targetRiderId` a alguien que no es de su
     *   equipo. El equipo no puede contar con él.
     *
     * El coste es el que pedía §VI.2, INTRÍNSECO y no administrativo: queda fuera del plan, así que
     * no le empuja el turno de relevos de su equipo ni le cubre su presupuesto, y sigue sin recibir
     * la protección de gregarios ni el tren de meta, que apuntan al jefe de filas.
     */
    const rebelIds = members
      .filter((r) => {
        if (r.riderId === leaderId) return false
        if ((r.role === 'lider' || r.role === 'sprinter') && leaderId !== null) return true
        if (r.role !== 'gregario' && r.role !== 'lanzador') return false
        return r.targetRiderId != null && !members.some((m) => m.riderId === r.targetRiderId)
      })
      .map((r) => r.riderId)
    const rebels = new Set(rebelIds)
    // El plan solo cuenta con los que están a sus órdenes: el que se ha ido por su cuenta no le da
    // al equipo ni un motivo ni un hombre. Si su líder es un rebelde, el equipo se queda sin baza.
    const loyal = members.filter((r) => !rebels.has(r.riderId))

    // --- MOTIVO 1: por la ETAPA ---------------------------------------------------------------
    const candidate = [...loyal].sort(
      (a, b) => b.finishScore - a.finishScore || byId(a.riderId, b.riderId),
    )[0]
    const hasStageCard =
      candidate != null && bestFinish - candidate.finishScore <= STAGE.teamStageCardGap

    // --- MOTIVOS 2 y 3: por la GENERAL ---------------------------------------------------------
    // Solo con general en juego: en la etapa 1 y en las carreras de un día todos van con 0 y no hay
    // maillot que defender (es el mismo criterio de `hasGcContext` en `simulate.ts`).
    const best = loyal.reduce((mn, r) => Math.min(mn, r.gcDeficitSeconds), Number.POSITIVE_INFINITY)
    const gcDeficitSeconds = ctx.hasGcContext && Number.isFinite(best) ? best : null
    const wearsJersey = gcDeficitSeconds === 0
    // «Favorito de la general» = el que todavía se la juega. El umbral es el mismo con el que el
    // pelotón mide una amenaza (`gcThreatFraction · gcControlLeash`): quien está a más de eso del
    // maillot no está defendiendo una general, está corriendo otra carrera.
    const gcContender =
      gcDeficitSeconds !== null &&
      !wearsJersey &&
      gcDeficitSeconds <= STAGE.gcThreatFraction * STAGE.gcControlLeash

    const purposes: TeamPurpose[] = []
    if (hasStageCard) purposes.push('etapa')
    if (wearsJersey) purposes.push('maillot')
    if (gcContender) purposes.push('general')
    if (purposes.length === 0) purposes.push('ninguno')

    const committed = loyal.length
    plans.set(teamId, {
      teamId,
      memberIds: members.map((r) => r.riderId),
      leaderId,
      purposes,
      stageCandidateId: hasStageCard && candidate ? candidate.riderId : null,
      quality: candidate ? candidate.finishScore : 0,
      gcDeficitSeconds,
      sprintFinish: ctx.bunchFinish,
      budget: STAGE.teamBudgetPerRider * Math.max(1, committed),
      rebelIds,
    })
  }
  return plans
}

/** Lo que la carretera le dice al plan en un momento dado de la etapa. */
export interface TeamSituation {
  /** ¿Tiene el equipo un hombre en un movimiento por delante del pelotón? */
  manUpTheRoad: boolean
  /** Km que faltan para meta. */
  kmToGo: number
  /**
   * Desventaja en la general del MEJOR CLASIFICADO que va en el movimiento de cabeza; `null` si no
   * hay nada delante o no hay general en juego. Es la cuenta que ya hacía `gcLeash()` para el
   * pelotón entero, mirada equipo a equipo: un equipo cuyo líder va a tres minutos no se asusta por
   * una fuga con el 40.º de la general; el equipo del maillot sí.
   */
  frontThreatDeficit: number | null
}

/** Lo que un equipo está haciendo AHORA y por qué. */
export interface TeamStance {
  purpose: TeamPurpose
  intent: TeamIntent
  /** ¿Le amenaza de verdad lo que hay delante? Es lo que convierte «controlar» en «perseguir». */
  threatened: boolean
  /** Cuántos motivos tiene hoy: dos cartas se defienden con más gente que una. */
  purposeCount: number
}

/** ¿Amenaza lo que va delante a ESTE equipo? (la cuenta de `gcLeash`, mirada por equipo). */
function isThreatened(plan: TeamPlan, sit: TeamSituation): boolean {
  if (plan.gcDeficitSeconds === null || sit.frontThreatDeficit === null) return false
  if (!plan.purposes.includes('maillot') && !plan.purposes.includes('general')) return false
  // Si al de delante le dan la cuerda entera, ¿se pone por delante de nuestro hombre?
  return (
    sit.frontThreatDeficit - plan.gcDeficitSeconds <= STAGE.gcThreatFraction * STAGE.gcControlLeash
  )
}

/**
 * Qué haría un equipo si solo tuviera ESE motivo, y cuánto derecho le da al frente del pelotón.
 * Un mismo motivo lleva a carreras distintas: «por la etapa» es un tren de sprint en una llana y un
 * tempo de protección en un final que trepa; «por la general» solo se convierte en trabajo cuando
 * lo de delante amenaza de verdad.
 */
function intentFor(
  purpose: TeamPurpose,
  plan: TeamPlan,
  sit: TeamSituation,
  threatened: boolean,
): TeamIntent {
  switch (purpose) {
    case 'etapa':
      return plan.sprintFinish
        ? sit.kmToGo <= STAGE.finalDriveKm
          ? 'lanzar'
          : 'perseguir'
        : 'proteger'
    case 'maillot':
      return 'controlar'
    case 'general':
      // El equipo de un favorito NO tira porque sí: solo cuando lo de delante le amenaza. Si no, se
      // coloca y deja el trabajo al del maillot, que es de quien es el problema.
      return threatened ? 'controlar' : 'nada'
    default:
      return 'nada'
  }
}

/**
 * Cuánto derecho da un motivo al frente del pelotón. 0 = no lo lleva, y ese es el corolario del
 * dueño: **el que no tiene motivo no gasta**.
 *
 * El orden es el de la carretera. Manda el MAILLOT AMENAZADO: cuando la fuga se lleva el liderato no
 * hay discusión sobre quién tira. Después, empatados, el que se juega la etapa al sprint —es su día
 * y no hay otro— y el favorito de la general amenazado. Luego el maillot tranquilo, que pone su
 * tempo de control. Y por último el equipo que solo arropa a su hombre para un final que trepa, que
 * se pone delante si no hay nadie más interesado.
 */
function claimFor(intent: TeamIntent, purpose: TeamPurpose, threatened: boolean): number {
  if (intent === 'fuga' || intent === 'nada') return 0
  if (intent === 'controlar') {
    if (!threatened) return 2
    return purpose === 'maillot' ? 4 : 3
  }
  if (intent === 'perseguir' || intent === 'lanzar') return 3
  return 1 // proteger
}

/**
 * QUÉ HACE Y POR QUÉ, con la carretera delante.
 *
 * Un equipo puede tener MÁS DE UN MOTIVO —el del maillot que además lleva al mejor rematador del
 * día— y aquí se decide qué se hace con eso. **Manda el motivo que más derecho da al frente**, y no
 * una prioridad fija: en una llana con su sprinter, ese equipo corre por la etapa; si la fuga se
 * lleva el liderato, corre por el maillot aunque tenga al sprinter. La decisión sale de la situación
 * de carrera, que es lo que se pidió.
 *
 * Para el ESFUERZO los motivos se ACUMULAN (ver `teamDrive`): tener dos cartas hace poner más gente
 * al frente. Para la FRASE manda uno solo, porque una frase con dos motivos no se lee.
 */
export function teamStance(plan: TeamPlan, sit: TeamSituation): TeamStance {
  const threatened = isThreatened(plan, sit)
  const purposeCount = plan.purposes.filter((p) => p !== 'ninguno').length
  // Tener un hombre delante lo cambia todo: no se persigue lo que lleva a un compañero dentro. Es
  // la regla más vieja del ciclismo… salvo para el equipo del maillot, que tiene que controlar el
  // boquete aunque el que se haya ido sea suyo.
  const jersey = plan.purposes.includes('maillot')
  if (sit.manUpTheRoad && !jersey) {
    return { purpose: plan.purposes[0] ?? 'ninguno', intent: 'fuga', threatened, purposeCount }
  }
  let best: TeamStance = { purpose: 'ninguno', intent: 'nada', threatened, purposeCount }
  let bestClaim = -1
  for (const purpose of plan.purposes) {
    const intent = intentFor(purpose, plan, sit, threatened)
    const claim = claimFor(intent, purpose, threatened)
    if (claim <= bestClaim) continue
    bestClaim = claim
    best = { purpose, intent, threatened, purposeCount }
  }
  return best
}

/** El derecho al frente de la postura que el equipo ha tomado. */
export function frontClaim(stance: TeamStance): number {
  return claimFor(stance.intent, stance.purpose, stance.threatened)
}

/** Cuánto empuja el equipo que LLEVA EL FRENTE, con el presupuesto intacto. */
function driveOnFront(stance: TeamStance): number {
  switch (stance.intent) {
    case 'perseguir':
    case 'lanzar':
      return STAGE.teamDriveChase
    case 'controlar':
      // Una fuga que amenaza de verdad al maillot no se controla: se caza.
      return stance.threatened ? STAGE.teamDriveChase : STAGE.teamDriveControl
    case 'proteger':
      return STAGE.teamDriveTempo
    default:
      return driveWaiting(stance)
  }
}

/** Y cuánto el que ESPERA su turno: colocado, pero sin dar la cara al viento. */
function driveWaiting(stance: TeamStance): number {
  switch (stance.intent) {
    case 'perseguir':
    case 'lanzar':
      return STAGE.teamDriveWaiting
    case 'controlar':
      return STAGE.teamDriveWatching
    case 'proteger':
      return STAGE.teamDriveShelter
    case 'fuga':
      return STAGE.teamDriveUpTheRoad
    default:
      return STAGE.teamDriveIdle
  }
}

/**
 * CUÁNTO TIRA ESTE EQUIPO AHORA, en [-1, 1]. Es el término que `relayDuty` suma al deber de relevo
 * de sus corredores, y lo que hace que el frente del pelotón tenga DUEÑO en vez de ser una alianza
 * de tres equipos distintos (docs/balance.md, v11: la voz de equipo salía el 2-12 % de las veces).
 *
 * `onTheFront` es la pieza que faltaba y que se ve en cualquier carrera: aunque cuatro equipos
 * quieran el sprint, **el frente lo lleva uno** y los demás se colocan detrás esperando su turno.
 * Con todos empujando igual, los tres que más tiraban salían de tres equipos distintos por pura
 * aritmética, y la crónica no podía nombrar a nadie.
 *
 * **Los motivos se ACUMULAN aquí aunque solo se narre uno**: el equipo que defiende el maillot y
 * además lleva al mejor rematador del día pone más gente al frente que el que solo tiene una carta,
 * porque se juega el doble. Es la decisión que pedía el encargo, y va en el esfuerzo y no en la
 * frase porque una frase con dos motivos no se lee.
 *
 * El presupuesto gastado lo apaga: un equipo que lleva 80 km tirando llega a `teamDriveTired` y sus
 * hombres salen del turno, que es exactamente lo que pasa en carretera cuando un equipo se funde y
 * otro toma el relevo. No baja nunca de ahí: fundido no significa que estorbe.
 */
export function teamDrive(stance: TeamStance, spentFraction: number, onTheFront: boolean): number {
  const raw = onTheFront ? driveOnFront(stance) : driveWaiting(stance)
  const base =
    raw > 0 && stance.purposeCount > 1 ? Math.min(1, raw + STAGE.teamDriveSecondCard) : raw
  if (base <= STAGE.teamDriveTired) return base
  const s = clamp(spentFraction, 0, 1)
  return base + (STAGE.teamDriveTired - base) * s
}

/**
 * Y cuánto ATACA. La capa de ataques consulta el plan (§V.1) y el MOTIVO la modula: el equipo que ya
 * tiene un hombre delante no manda a otro, el que persigue guarda a los suyos para el trabajo, el
 * que defiende la general vigila, y **el que no tiene ningún motivo es el que manda gente a la
 * fuga**, que es de donde salen las fugas de verdad. Un rebelde no pasa por aquí: su decisión manda
 * sobre el plan (§V.1, regla 1).
 */
export function teamAttackFactor(stance: TeamStance): number {
  switch (stance.intent) {
    case 'fuga':
      return STAGE.teamAttackUpTheRoad
    case 'perseguir':
    case 'lanzar':
      return STAGE.teamAttackChasing
    case 'controlar':
    case 'proteger':
      return STAGE.teamAttackDefending
    default:
      return STAGE.teamAttackFree
  }
}
