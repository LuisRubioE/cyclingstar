/**
 * Órdenes automáticas de etapa para los corredores sin plan del jugador (SPEC 6.18). Sin esto, todo
 * el pelotón NPC correría como "libre/reservón": no se formarían fugas y la estrategia de equipo no
 * pesaría. Aquí cada equipo nombra un jefe de filas según el terreno, siembra un baroudeur para la
 * fuga, monta un tren de sprint en el llano y pone gregarios al servicio del líder. Es PURO y
 * DETERMINISTA (decide solo por atributos, con desempate estable por id) para que los replays cuadren.
 */
import type { Attribute } from '@cyclingstar/shared'
import type { StageOrders } from '../stage/types.js'

/** Un corredor tal como lo ve el planificador automático: sus efectividades y su equipo. */
export interface AutoOrderRider {
  riderId: string
  attrs: Record<Attribute, number>
  teamId: string | null
}

/** Contexto de la etapa que condiciona los roles (llano → sprint, montaña → escalada, etc.). */
export interface AutoOrderStage {
  kind: 'llana' | 'media' | 'reina' | 'cri' | 'clasica' | string
  timeTrial: boolean
}

const SPRINTER_MIN = 68 // por debajo de esto el equipo no juega la baza del sprint: va a por la fuga.

const climbScore = (a: Record<Attribute, number>): number => 0.6 * a.MON + 0.4 * a.COL
/**
 * QUIÉN ES EL HOMBRE DEL EQUIPO PARA ESTA CARRERA, en un número (v42). Es la misma cuenta con la que
 * `autoStageOrders` elige al jefe de filas unas líneas más abajo —montaña por piernas de montaña,
 * llano por remate, y lo demás por rodador completo—, expuesta para que la use quien reparta
 * DORSALES: el 1 de un equipo es su líder, no su corredor más famoso.
 *
 * El dueño lo vio en producción: «le han dado el dorsal 131 a un wey que ha quedado en el puesto 50
 * a 10 minutos, mientras que el 132 y otro más de ese equipo son primero y segundo de la general…
 * y mirando sus stats son claramente mejores que el 131».
 */
export function raceLeadScore(a: Record<Attribute, number>, kinds: readonly string[]): number {
  const montaña = kinds.filter((k) => k === 'reina' || k === 'media').length
  const llana = kinds.filter((k) => k === 'llana').length
  if (montaña > 0 && montaña >= llana) return climbScore(a)
  if (llana > montaña) return Math.max(sprintScore(a), allroundScore(a))
  return allroundScore(a)
}
const sprintScore = (a: Record<Attribute, number>): number => a.SPR
const breakScore = (a: Record<Attribute, number>): number => 0.5 * a.TAC + 0.3 * a.LLA + 0.2 * a.RES
const allroundScore = (a: Record<Attribute, number>): number =>
  0.4 * Math.max(a.MON, a.COL) + 0.3 * a.LLA + 0.3 * a.CRI
const leadOutScore = (a: Record<Attribute, number>): number => 0.6 * a.LLA + 0.4 * a.SPR

/** Ordena por una métrica de mayor a menor, con desempate estable por id (determinismo). */
function ranked(
  riders: AutoOrderRider[],
  metric: (a: Record<Attribute, number>) => number,
): AutoOrderRider[] {
  return [...riders].sort((x, y) => {
    const d = metric(y.attrs) - metric(x.attrs)
    return d !== 0 ? d : x.riderId < y.riderId ? -1 : 1
  })
}

function order(o: Partial<StageOrders>): StageOrders {
  return { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false, ...o }
}

/**
 * Reparte los roles de UN equipo (o de un puñado de agentes libres tratados como equipo de uno).
 * Escribe en `out` solo los roles distintos de "libre"; el resto hereda el defecto del motor.
 */
function assignTeam(
  team: AutoOrderRider[],
  stage: AutoOrderStage,
  out: Map<string, StageOrders>,
): void {
  if (team.length === 0) return
  const mountain = stage.kind === 'reina' || stage.kind === 'media'
  const flat = stage.kind === 'llana'
  const remaining = new Set(team.map((r) => r.riderId))
  const take = (r?: AutoOrderRider): AutoOrderRider | undefined => {
    if (r && remaining.has(r.riderId)) {
      remaining.delete(r.riderId)
      return r
    }
    return undefined
  }
  const next = (metric: (a: Record<Attribute, number>) => number): AutoOrderRider | undefined =>
    take(
      ranked(
        team.filter((r) => remaining.has(r.riderId)),
        metric,
      )[0],
    )

  // 1) Jefe de filas según el terreno.
  let leaderId: string | undefined
  if (flat) {
    const bestSpr = ranked(team, sprintScore)[0]
    if (bestSpr && sprintScore(bestSpr.attrs) >= SPRINTER_MIN) {
      const s = take(bestSpr)!
      out.set(s.riderId, order({ role: 'sprinter', mentality: 'reservon', contestSprints: true }))
      leaderId = s.riderId
      // Tren: el mejor lanzando del resto lo lanza en meta.
      const launcher = next(leadOutScore)
      if (launcher)
        out.set(
          launcher.riderId,
          order({ role: 'lanzador', targetRiderId: s.riderId, contestSprints: true }),
        )
    } else {
      const l = next(allroundScore)
      if (l) {
        out.set(l.riderId, order({ role: 'lider', mentality: 'oportunista' }))
        leaderId = l.riderId
      }
    }
  } else {
    const l = next(mountain ? climbScore : allroundScore)
    if (l) {
      out.set(l.riderId, order({ role: 'lider', mentality: 'reservon', contestClimbs: mountain }))
      leaderId = l.riderId
    }
  }

  // 2) Un baroudeur a la fuga (mientras quede equipo de sobra para arropar al líder).
  if (remaining.size > 2) {
    const baroudeur = next(breakScore)
    if (baroudeur)
      out.set(
        baroudeur.riderId,
        order({
          role: 'cazaetapas',
          mentality: 'combativo',
          contestSprints: flat,
          contestClimbs: mountain,
        }),
      )
  }

  /**
   * 3) Y EL RESTO DEL EQUIPO SON GREGARIOS DE SU JEFE — TODOS (v38, defecto medido).
   *
   * Hasta la v37 esto ponía DOS gregarios «y el resto, libres», y ese resto era enorme: medido sobre
   * un campo de producción de 176 corredores en 22 equipos de 8, se quedaban **sin órdenes 70 en una
   * llana y 88 en una media montaña o una reina**, o sea la MITAD EXACTA del pelotón. Y «sin
   * órdenes» no es neutro: el motor los trata como `libre`, cuyo deber de relevo vale 0,6 —por
   * ENCIMA de un cazaetapas (0,5), de un marcador (0,35) y de un sprinter (0,2)—. O sea que media
   * parrilla de anónimos tenía más obligación de dar la cara que los especialistas, y de ahí salía
   * buena parte de lo que en la radio de carrera no se entendía.
   *
   * En una carrera no hay nadie «sin órdenes»: el que no es el jefe, ni el lanzador, ni el hombre
   * que van a mandar a la fuga, es gregario de su jefe. Eso es un equipo.
   */
  if (leaderId) {
    for (const r of team) {
      if (!remaining.has(r.riderId)) continue
      remaining.delete(r.riderId)
      out.set(r.riderId, order({ role: 'gregario', targetRiderId: leaderId }))
    }
  }
}

/**
 * Órdenes automáticas para el pelotón. Agrupa por equipo y reparte roles; los agentes libres (sin
 * equipo) se tratan de uno en uno, decidiendo si van a la fuga, al sprint o neutros. En contrarreloj
 * no hay táctica de grupo, así que devuelve vacío (todos "libre"). Solo cubre a quien NO trae plan.
 */
export function autoStageOrders(
  riders: AutoOrderRider[],
  stage: AutoOrderStage,
): Map<string, StageOrders> {
  const out = new Map<string, StageOrders>()
  if (stage.timeTrial || stage.kind === 'cri') return out

  const byTeam = new Map<string, AutoOrderRider[]>()
  const freeAgents: AutoOrderRider[] = []
  for (const r of riders) {
    if (r.teamId) {
      const list = byTeam.get(r.teamId) ?? []
      list.push(r)
      byTeam.set(r.teamId, list)
    } else {
      freeAgents.push(r)
    }
  }
  for (const team of byTeam.values()) assignTeam(team, stage, out)

  // Agentes libres: cada uno decide en solitario. El que vale para la fuga la busca; un buen sprinter
  // espera la meta; el resto rueda neutro. Así los sueltos también dan vida a la carrera.
  const mountain = stage.kind === 'reina' || stage.kind === 'media'
  const flat = stage.kind === 'llana'
  for (const r of freeAgents) {
    const brk = breakScore(r.attrs)
    const spr = sprintScore(r.attrs)
    if (flat && spr >= SPRINTER_MIN) {
      out.set(r.riderId, order({ role: 'sprinter', mentality: 'reservon', contestSprints: true }))
    } else if (brk >= 58) {
      out.set(
        r.riderId,
        order({
          role: 'cazaetapas',
          mentality: 'combativo',
          contestSprints: flat,
          contestClimbs: mountain,
        }),
      )
    }
  }
  return out
}
