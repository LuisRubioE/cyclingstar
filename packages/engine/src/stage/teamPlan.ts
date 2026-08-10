/**
 * EL PLAN DE EQUIPO (docs/motor.md §V.1).
 *
 * Hasta la v14 el motor no conocía los equipos: `StageRider` no traía `teamId` y lo único que había
 * era `orders.targetRiderId`, del que `simulate.ts` derivaba «X trabaja para Y». Eso alcanzaba para
 * el trabajo de un gregario, pero no para lo que pedía el dueño: **«por equipo, pero también
 * teniendo en cuenta las individualidades»**. Sin equipos, la caza era un escalar de etapa, el turno
 * de relevos se decidía corredor a corredor —y por eso los tres que más tiraban casi nunca eran del
 * mismo equipo— y no existía «este equipo tira y este otro se esconde».
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
 * La carta que juega un equipo en esta etapa. No es un estado de ánimo: cada una tiene consecuencias
 * medibles en el turno de relevos, en el presupuesto de esfuerzo y en las ganas de atacar.
 */
export type TeamIntent =
  /** Tiene rematador y la meta es suya: hay que cazar lo que se vaya. */
  | 'perseguir'
  /** Lo mismo, pero ya en los últimos km: el tren se monta para lanzarlo. */
  | 'lanzar'
  /** Su hombre lleva el maillot: controla el boquete, no captura. */
  | 'controlar'
  /** Tiene un jefe de filas que no es rematador: lo arropa y ahorra. */
  | 'proteger'
  /** Ya tiene un hombre en la carretera: ni tira ni ataca, defiende lo que hay delante. */
  | 'fuga'
  /** No tiene baza que jugar hoy: manda gente a la fuga y por lo demás se esconde. */
  | 'nada'

/** Un corredor visto por el plan de equipo: lo justo para repartir papeles. */
export interface TeamPlanRider {
  riderId: string
  /** `null` = agente libre: corre de forma individual (§V.1, regla 2). */
  teamId: string | null
  role: StageRole
  mentality: Mentality
  targetRiderId?: string
  /** Punta de velocidad de salida: decide si la baza del sprint es real. */
  spr: number
  /** Desventaja en la general (SPEC 6.9). 0 con contexto de general = lleva el maillot. */
  gcDeficitSeconds: number
}

/** El contexto de la etapa que decide qué carta puede jugar cada equipo. */
export interface TeamPlanContext {
  /** ¿La meta permite una llegada masiva? Si trepa, la baza del sprint no existe. */
  finishFlat: boolean
  /** ¿Hay general en juego? (mismo criterio que `simulate.ts`: alguien con déficit > 0). */
  hasGcContext: boolean
}

/** El plan de un equipo para la etapa, antes de que la carretera hable. */
export interface TeamPlan {
  teamId: string
  memberIds: string[]
  /** El hombre al que sirve el plan. `null` = el equipo no tiene jefe de filas hoy. */
  leaderId: string | null
  /** La carta que juega, derivada de las órdenes de sus corredores y del recorrido. */
  baseIntent: TeamIntent
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
  /**
   * Lo buena que es su baza: la punta del jefe de filas cuando la juega al sprint. Desempata quién
   * TOMA EL FRENTE cuando varios equipos quieren lo mismo — en carretera lo toma el que más se juega.
   */
  quality: number
}

/**
 * Cuánto derecho tiene una intención a llevar el frente del pelotón. 0 = no lo lleva.
 *
 * Manda el que se juega la etapa al sprint; después el que defiende el maillot; y por último el
 * equipo que arropa a su jefe de filas, que en una etapa de montaña sin general en juego es quien
 * pone el tempo, porque no hay nadie más a quien le interese.
 */
export function frontClaim(intent: TeamIntent): number {
  if (intent === 'perseguir' || intent === 'lanzar') return 3
  if (intent === 'controlar') return 2
  if (intent === 'proteger') return 1
  return 0
}

/** Prioridad de rol para elegir jefe de filas cuando nadie apunta a nadie. */
function leaderScore(r: TeamPlanRider, ctx: TeamPlanContext): number {
  switch (r.role) {
    case 'sprinter':
      return ctx.finishFlat ? 4 : 1
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

/** La carta que juega el equipo con el jefe de filas que tiene. */
function pickIntent(
  leader: TeamPlanRider | undefined,
  ctx: TeamPlanContext,
  helpers: number,
): TeamIntent {
  if (!leader) return 'nada'
  if (leader.role === 'sprinter') {
    // La baza del sprint solo existe si la meta no trepa y el rematador tiene punta de verdad: el
    // mismo umbral con el que `chase.ts` decide quién cuenta como rematador.
    return ctx.finishFlat && leader.spr >= STAGE.chaseContenderMinSpr ? 'perseguir' : 'nada'
  }
  if (leader.role === 'lider') {
    // Con el maillot puesto se CONTROLA (se limita el boquete); sin él, se arropa al jefe y se
    // ahorra para donde la etapa se decida.
    if (ctx.hasGcContext && leader.gcDeficitSeconds <= 0) return 'controlar'
    return helpers > 0 ? 'proteger' : 'nada'
  }
  return 'nada'
}

/**
 * Construye el plan de cada equipo. Los agentes libres (`teamId` nulo) no aparecen: corren de forma
 * individual y ninguna de estas reglas les toca (§V.1, regla 2).
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
  const plans = new Map<string, TeamPlan>()
  for (const [teamId, team] of [...byTeam.entries()].sort((a, b) => byId(a[0], b[0]))) {
    const members = [...team].sort((a, b) => byId(a.riderId, b.riderId))
    const leaderId = pickLeader(members, ctx)
    const leader = members.find((r) => r.riderId === leaderId)
    const helpers = members.filter(
      (r) =>
        (r.role === 'gregario' || r.role === 'lanzador') &&
        (r.targetRiderId == null || r.targetRiderId === leaderId),
    ).length
    /**
     * DESOBEDECER LAS ÓRDENES DEL EQUIPO (docs/motor.md §VI.2), que estaba especificado y no se
     * ejecutaba en ninguna parte. Dos formas de ir por libre, y las dos se leen de las órdenes:
     *
     * - **Dos jefes en un equipo**: el que se declara líder o sprinter sin ser el jefe de filas del
     *   plan se ha ido por su cuenta. Es el caso del encargo: el jugador humano se pone de líder
     *   cuando su equipo ya tiene uno.
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
    // El presupuesto lo ponen los hombres que de verdad están al servicio del plan: los rebeldes no
    // tiran por el equipo, así que tampoco cuentan para lo que el equipo puede gastar.
    const committed = members.length - rebelIds.length
    plans.set(teamId, {
      teamId,
      memberIds: members.map((r) => r.riderId),
      leaderId,
      baseIntent: pickIntent(leader, ctx, helpers),
      budget: STAGE.teamBudgetPerRider * Math.max(1, committed),
      rebelIds,
      quality: leader ? leader.spr : 0,
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
}

/** La intención de AHORA: el plan del día corregido por lo que ha pasado en carretera. */
export function currentIntent(plan: TeamPlan, sit: TeamSituation): TeamIntent {
  // Tener un hombre delante lo cambia todo: no se persigue lo que lleva a un compañero dentro. Es
  // la regla más vieja del ciclismo y la que hace que la caza deje de ser un escalar del campo.
  if (sit.manUpTheRoad && plan.baseIntent !== 'controlar') return 'fuga'
  if (plan.baseIntent === 'perseguir' && sit.kmToGo <= STAGE.finalDriveKm) return 'lanzar'
  return plan.baseIntent
}

/** Cuánto empuja el equipo que LLEVA EL FRENTE, con el presupuesto intacto. */
function driveOnFront(intent: TeamIntent): number {
  switch (intent) {
    case 'perseguir':
    case 'lanzar':
      return STAGE.teamDriveChase
    case 'controlar':
      return STAGE.teamDriveControl
    case 'proteger':
      return STAGE.teamDriveTempo
    default:
      return driveWaiting(intent)
  }
}

/** Y cuánto el que ESPERA su turno: colocado, pero sin dar la cara al viento. */
function driveWaiting(intent: TeamIntent): number {
  switch (intent) {
    case 'perseguir':
    case 'lanzar':
      return STAGE.teamDriveWaiting
    case 'controlar':
      return STAGE.teamDriveWatching
    case 'proteger':
      return STAGE.teamDriveShelter
    case 'fuga':
      return STAGE.teamDriveUpTheRoad
    case 'nada':
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
 * El presupuesto gastado lo apaga: un equipo que lleva 80 km tirando llega a `teamDriveTired` y sus
 * hombres salen del turno, que es exactamente lo que pasa en carretera cuando un equipo se funde y
 * otro toma el relevo. No baja nunca de ahí: fundido no significa que estorbe.
 */
export function teamDrive(intent: TeamIntent, spentFraction: number, onTheFront: boolean): number {
  const base = onTheFront ? driveOnFront(intent) : driveWaiting(intent)
  if (base <= STAGE.teamDriveTired) return base
  const s = clamp(spentFraction, 0, 1)
  return base + (STAGE.teamDriveTired - base) * s
}

/**
 * Y cuánto ATACA. La capa de ataques consulta el plan (§V.1) y el plan la modula: el equipo que ya
 * tiene un hombre delante no manda a otro, el que persigue guarda a los suyos para el trabajo, y el
 * que no tiene baza que jugar hoy es el que MANDA GENTE A LA FUGA, que es de donde salen las fugas
 * de verdad. Un rebelde no pasa por aquí: su decisión manda sobre el plan (§V.1, regla 1).
 */
export function teamAttackFactor(intent: TeamIntent): number {
  switch (intent) {
    case 'fuga':
      return STAGE.teamAttackUpTheRoad
    case 'perseguir':
    case 'lanzar':
      return STAGE.teamAttackChasing
    case 'controlar':
    case 'proteger':
      return STAGE.teamAttackDefending
    case 'nada':
      return STAGE.teamAttackFree
  }
}
