import type { Attribute } from '@cyclingstar/shared'
import type { FinishType } from './finish.js'
import type { Effort, Mentality, StageRole } from './types.js'

/**
 * LOS TRES CONTEXTOS DE LA CAPA TÁCTICA (docs/tactica.md §3, paso 2).
 *
 * **Este fichero define contratos y no cambia una sola conducta.** Los tipos viajan, se rellenan, y
 * **nadie los lee todavía**: cada racimo de reglas irá enganchando el suyo en su paso, y hasta
 * entonces las cuatro huellas selladas tienen que salir dígito a dígito idénticas. Si al mezclar
 * esto se moviera una, el paso estaría mal hecho por definición.
 *
 * Por qué van juntos y por qué son TRES y no uno: son tres NIVELES DE VERDAD distintos, y mezclarlos
 * es la raíz de la mitad de los defectos que el rediseño persigue.
 *
 * - `SelfView` es **exacto**: un corredor sabe con precisión lo suyo —cuánto le queda, qué le han
 *   mandado, cuánto debe—.
 * - `GroupView` es **casi exacto**: lo que se ve desde dentro del grupo. El censo de compañeros sí
 *   es exacto —se sabe quién es de tu casa—, pero `signals` NO: lo que se ve del rival se lee con
 *   error y admite disimulo.
 * - `RaceView` es **vieja y torcida**: lo que el director cree saber de la carrera, con retardo y
 *   con error. Es lo que hace posible que un director se equivoque.
 *
 * La regla que sostiene el diseño entero: **un corredor no lee nunca la verdad del rival.** No hay
 * un solo campo aquí que exponga la energía ajena.
 */

/** El vínculo de un corredor con el plan de su equipo (docs/tactica.md §2.5). */
export type PlanBinding = 'dentro' | 'exceptuado' | 'carta-blanca' | 'rebelde'

/**
 * Qué hace hoy este hombre. **Los siete valores son EXHAUSTIVOS**: los pasos 7, 9 y 10 comprueban
 * por tipo que ninguna regla use un literal fuera de aquí. `representante` y `libre` faltaban en la
 * primera redacción y había dos reglas usándolos.
 */
export type DutyTag =
  'carta' | 'peon' | 'lanzador' | 'grupeto' | 'infiltrado' | 'representante' | 'libre'

/** Una fila de una clasificación secundaria (puntos, montaña, joven, equipos). */
export interface StandingRow {
  kind: 'puntos' | 'montana' | 'joven' | 'equipos'
  rank: number
  points: number
  /** A cuánto está del que va delante: es lo que decide si vale la pena pelear hoy. */
  toNextRank: number
}

/** Lo que un corredor sabe de sí mismo, y lo sabe EXACTO. */
export interface SelfView {
  riderId: string
  /** Nulo = agente libre. */
  teamId: string | null
  role: StageRole
  mentality: Mentality
  effort: Effort
  triggerKm: number | null

  /** Perfil efectivo en este bloque. */
  perfil: number
  /** Con el `finishType` de ESTE grupo, no con la etiqueta de la etapa. */
  finishScore: number
  energyFraction: number
  matches: number
  tac: number
  spr: number
  des: number

  gcDeficitSeconds: number
  gcRank: number | null
  standings: StandingRow[]

  /** Iba en la rotación el bloque anterior. */
  pulling: boolean
  /** Dónde va en la cola del turno, o `null` si no está en ella. */
  turnIndex: number | null
  /** Hasta dónde vale su compromiso: es lo que el banco `temblor` vigila. */
  commitUntilKm: number | null
  /** [0,1], 0 = cabeza del grupo. */
  placement: number
  gastado: boolean
  hurt: 'minor' | 'major' | null

  binding: PlanBinding
  duty: DutyTag
  /** A quién sirve HOY, que puede no ser el líder del plan. */
  worksFor: string | null
  /** A quién le debe un relevo. */
  debtTo: string[]
}

/** Un compañero que va en MI grupo. */
export interface MateHere {
  riderId: string
  role: StageRole
  duty: DutyTag
  binding: PlanBinding
  freshness: number
  /** MISMA convención que `myFinishRank`: 0 = mejor rematador del grupo. */
  finishRank: number
  placement: number
}

/** Un compañero que va en OTRO grupo, con su hueco. */
export interface MateThere {
  riderId: string
  gapS: number
  duty: DutyTag
  binding: PlanBinding
  groupId: string
}

/** Cuántos hombres tiene una casa aquí, y quién es su carta. */
export interface TeamContingent {
  teamId: string
  here: number
  cardId: string | null
}

/** Alguien que me quita algo si llega conmigo. */
export interface ThreatRow {
  riderId: string
  teamId: string | null
  costIfHeWins: number
}

/**
 * LO QUE SE VE DEL OTRO, Y NUNCA ES LA VERDAD.
 *
 * **Contrato, y hay que respetarlo o el diseño se cae**: esto no se rellena nunca con el estado real
 * del rival. Se rellena con la lectura del observador, que lleva error en función de su TAC y admite
 * disimulo del observado. Es lo que hace que «oler la sangre» PUEDA FALLAR y que un jefe tocado
 * pueda ir delante con cara de fresco.
 */
export interface RoadSignal {
  /** En qué puesto le veo, con error. */
  placeSeen: number
  matesLeftSeen: number
  /** [0,1] cuánto le veo sufrir. */
  drifting: number
  /** Sube de pie: está al límite. */
  standing: boolean
  teamOffFront: boolean
}

/**
 * LA COLA DEL TURNO (R18.1). Pagan viento los `techo` primeros —`order.slice(0, techo)`—, cada uno
 * con sus kilómetros restantes. La PERTENENCIA se recalcula por bloque como hoy; el ORDEN persiste,
 * que es la diferencia entera con lo que hay.
 */
export interface Turn {
  order: string[]
  head: number
  kmLeft: number[]
}

/** Lo que un corredor ve de su grupo. Se calcula UNA vez por grupo y bloque, y se comparte. */
export interface GroupView {
  groupId: string
  kind: 'peloton' | 'move' | 'shed'
  size: number
  isMain: boolean
  tS: number
  compromiso: number
  /** El reloj que pudre una fuga. */
  tension: number

  // --- El censo ---------------------------------------------------------------------------
  mates: MateHere[]
  matesAhead: MateThere[]
  matesBehind: MateThere[]
  teamCensus: Map<string, TeamContingent>
  /** Los sueltos: el listón del turno los trata aparte. */
  freeAgents: number

  // --- El peligro -------------------------------------------------------------------------
  bestFinisherId: string
  /**
   * **LA ÚNICA CONVENCIÓN DEL DOCUMENTO, y va escrita aquí porque tres fórmulas la usaban al revés**:
   * `0 = MEJOR rematador del grupo, 1 = el PEOR`. Se calcula con el `finishType` de ESTE grupo, no
   * con la etiqueta de la etapa.
   */
  myFinishRank: number
  /** [0,1], 0 = mejor perfil efectivo. */
  myPerfilRank: number
  threats: ThreatRow[]
  signals: Map<string, RoadSignal>

  // --- Quién tira -------------------------------------------------------------------------
  turn: Turn
  frontTeamId: string | null

  // --- El final de ESTE grupo -------------------------------------------------------------
  /** Calculado con el TAMAÑO del grupo, no con la etiqueta de la etapa. */
  finishType: FinishType
  /** Cuántos trenes caben aquí. */
  lanes: number
}

/** La forma de la carrera: lo que queda por delante. */
export interface RaceShape {
  totalKm: number
  kmDone: number
  /** Km del siguiente puerto, o `null` si no queda ninguno. */
  nextClimbKm: number | null
  /** Km de la última cota de la etapa, o `null` si no hay. */
  lastClimbKm: number | null
  /** Cuánto valle queda tras la última cota. */
  valleyAfterLastClimbKm: number | null
  /** Días que le quedan a la carrera, incluido hoy. */
  daysLeft: number
}

/** Lo que la carrera recuerda de los días anteriores. */
export interface RaceMemory {
  /** Quién le debe un relevo a quién, de días anteriores. */
  debts: { from: string; to: string; km: number }[]
  /** Quién ha ganado ya algo: cambia cómo le miran. */
  winners: string[]
  /** Equipos que ya tienen su día hecho. */
  satisfiedTeams: string[]
}

/** Lo que un corredor —su director— sabe de la carrera. Vieja y torcida a propósito. */
export interface RaceView {
  shape: RaceShape
  standings: Map<string, StandingRow[]>
  memory: RaceMemory
  /** Cuántos km de retardo lleva la información de este director. */
  newsLagKm: number
}

/** El contexto de carrera que `StageInput` puede traer. Todo opcional: sin él corre como siempre. */
export interface RaceContext {
  shape?: RaceShape
  standings?: Map<string, StandingRow[]>
  memory?: RaceMemory
  /** Día de la carrera, 1-indexado. */
  stageDay?: number
  totalStages?: number
}

/** Las banderas con las que un banco enciende o apaga una capa, para poder medir su brazo. */
export interface TacticFlags {
  [flag: string]: boolean
}

/** Los atributos que `SelfView` expone, para que el censo no tenga que importarlos sueltos. */
export type ViewAttrs = Record<Attribute, number>

/** Lo mínimo que el censo necesita saber de un corredor para contarlo. */
export interface CensusRider {
  riderId: string
  teamId: string | null
  role: StageRole
  finishScore: number
  perfil: number
  /** [0,1], 0 = cabeza del grupo. */
  placement: number
  energyFraction: number
}

/** Un grupo tal como el censo lo ve: su identidad y quién va dentro. */
export interface CensusGroup {
  groupId: string
  kind: 'peloton' | 'move' | 'shed'
  isMain: boolean
  tS: number
  members: CensusRider[]
}

/**
 * EL CENSO DE UN GRUPO (R01, docs/tactica.md §3.2).
 *
 * Es **la pieza más barata del catálogo y la que más filas apaga**: quince situaciones de R01
 * dependen de una sola cosa —que un corredor sepa quién de los suyos va aquí, quién delante y quién
 * detrás—, y hoy no lo sabe. `simulate.ts` tiene el dato a mano en todos los bloques y nunca lo ha
 * reunido.
 *
 * Se calcula **una vez por grupo y bloque** y se comparte por referencia entre los que van en él.
 * Ésa es la condición de coste: hacerlo por corredor sería multiplicar por el tamaño del pelotón el
 * trabajo de cada bloque, y el banco mide `censusCost ≤ 3 %`.
 *
 * **Nadie lo lee todavía.** Se construye, se puebla y se queda ahí hasta que el paso 3 enganche R01.
 */
export function census(
  g: CensusGroup,
  finishType: FinishType,
): Omit<GroupView, 'myFinishRank' | 'myPerfilRank' | 'threats' | 'signals' | 'turn'> {
  const porRemate = [...g.members].sort(
    (a, b) => b.finishScore - a.finishScore || (a.riderId < b.riderId ? -1 : 1),
  )
  const rango = new Map(porRemate.map((m, i) => [m.riderId, i / Math.max(1, porRemate.length - 1)]))

  const teamCensus = new Map<string, TeamContingent>()
  for (const m of g.members) {
    if (m.teamId === null) continue
    const c = teamCensus.get(m.teamId) ?? { teamId: m.teamId, here: 0, cardId: null }
    c.here += 1
    // La carta de la casa AQUÍ es su mejor rematador de este grupo con ESTE tipo de final: es lo que
    // convierte «somos tres» en «somos tres y el bueno es él», que es lo que R02 necesita.
    if (c.cardId === null || rango.get(m.riderId)! < rango.get(c.cardId)!) c.cardId = m.riderId
    teamCensus.set(m.teamId, c)
  }

  return {
    groupId: g.groupId,
    kind: g.kind,
    size: g.members.length,
    isMain: g.isMain,
    tS: g.tS,
    // Compromiso y tensión nacen a cero: los mueve R18 en el paso 7. Un cero declarado es mejor que
    // un número inventado que nadie sabría interpretar.
    compromiso: 0,
    tension: 0,
    mates: [],
    matesAhead: [],
    matesBehind: [],
    teamCensus,
    freeAgents: g.members.filter((m) => m.teamId === null).length,
    bestFinisherId: porRemate[0]?.riderId ?? '',
    finishType,
    // Los carriles los pone R15/R16 en el paso 15; hasta entonces, uno.
    lanes: 1,
    frontTeamId: null,
  }
}

/**
 * LOS MÍOS, DESDE MI SITIO: la parte del censo que SÍ depende de quién pregunta.
 *
 * Va aparte de `census` a propósito. El censo de casas es del GRUPO —se calcula una vez—, pero
 * «quién de los míos va delante» depende de cuál es mi casa, así que es por corredor. Separarlos es
 * lo que permite pagar el censo una vez y esta parte solo cuando alguien la necesite.
 */
export function myMates(
  yo: CensusRider,
  miGrupo: CensusGroup,
  otros: readonly CensusGroup[],
  finishRank: (riderId: string) => number,
): Pick<GroupView, 'mates' | 'matesAhead' | 'matesBehind'> {
  if (yo.teamId === null) return { mates: [], matesAhead: [], matesBehind: [] }
  const mates: MateHere[] = miGrupo.members
    .filter((m) => m.teamId === yo.teamId && m.riderId !== yo.riderId)
    .map((m) => ({
      riderId: m.riderId,
      role: m.role,
      duty: 'libre' as DutyTag,
      binding: 'dentro' as PlanBinding,
      freshness: m.energyFraction,
      finishRank: finishRank(m.riderId),
      placement: m.placement,
    }))

  const ahead: MateThere[] = []
  const behind: MateThere[] = []
  for (const g of otros) {
    if (g.groupId === miGrupo.groupId) continue
    for (const m of g.members) {
      if (m.teamId !== yo.teamId) continue
      const fila: MateThere = {
        riderId: m.riderId,
        // El hueco con signo del grupo: negativo si va delante, positivo si va detrás.
        gapS: Math.abs(g.tS - miGrupo.tS),
        duty: 'libre',
        binding: 'dentro',
        groupId: g.groupId,
      }
      // Va DELANTE quien lleva menos reloj: en carrera el tiempo es la posición.
      if (g.tS < miGrupo.tS) ahead.push(fila)
      else behind.push(fila)
    }
  }
  return { mates, matesAhead: ahead, matesBehind: behind }
}
