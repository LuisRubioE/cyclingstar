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
  /**
   * SU PUESTO EN LA GENERAL de la carrera que se está corriendo (1 = lleva el maillot), o `undefined`
   * en una carrera de un día y en la primera etapa, donde todavía no hay general (v42).
   *
   * El dueño lo vio dos veces, en dos carreras distintas: «el líder con el maillot amarillo está
   * también tirando???» y «el líder se la pasa todo el tiempo tirando». La causa no era el motor de
   * relevos —eso se arregló aparte— sino que ESTE planificador no sabía quién lidera la carrera, así
   * que repartía roles solo por atributos y por el tipo de etapa. Medido con un equipo que lleva al
   * maillot (escalador) y a un buen velocista: en una etapa llana el maillot salía de **lanzador de
   * su propio velocista**, con deber de relevo 0,85, empuje de equipo completo y un cerillo quemado
   * en el último kilómetro. Con el maillot puesto.
   */
  gcRank?: number
}

/** Contexto de la etapa que condiciona los roles (llano → sprint, montaña → escalada, etc.). */
export interface AutoOrderStage {
  kind: 'llana' | 'media' | 'reina' | 'cri' | 'clasica' | string
  timeTrial: boolean
}

/**
 * ¿TIENE ESTE EQUIPO UNA BAZA DE SPRINT? **UN PERCENTIL, NO UN NÚMERO** (v63, decisión 25 del dueño).
 *
 * Era `SPRINTER_MIN = 68`, un umbral ABSOLUTO sobre el SPR crudo, calibrado contra una génesis donde
 * la media de división era la del ATRIBUTO y el 20 % del campo eran velocistas. Con la génesis v2 el
 * campo tiene un 9-10 % de velocistas y los atributos nacen por debajo de su techo, así que el 68
 * dejaba de significar lo que quería decir: en WorldTour lo pasaban ≈ el 9 % (la mitad de los equipos
 * se quedaban sin tren de sprint) y en ProSeries y Continental **el rol desaparecía casi del todo**.
 *
 * Lo que el 68 quería decir es «este equipo tiene una baza de sprint COMPARADA con el pelotón que
 * corre HOY», y eso es un percentil. El mejor SPR del equipo entra como velocista si supera el
 * **p75 del campo del día**, así que en toda carrera hay aproximadamente un cuarto de equipos con
 * tren, sea la ronda que sea. Un continental modesto vuelve a tener su rápido en su carrera.
 *
 * `tactica.md` §5.2 **ya lo implementa por percentil** diciendo textualmente que hereda esta
 * corrección de `entrenamiento.md` §6, y su §9.5 escribe «pasa a percentil, se hereda, no se
 * reabre». Tener dos umbrales para la misma decisión en dos documentos que se citan era el defecto.
 */
const SPRINTER_PCT = 0.75

/**
 * El SPR que hay que superar hoy para ser velocista: el p75 del campo, por interpolación lineal
 * entre los dos vecinos. Con menos de cuatro corredores no hay campo del que sacar percentiles, y
 * entonces no manda nadie: devuelve 0 y el mejor del equipo es su velocista, que es lo razonable en
 * una carrera de tres gatos.
 */
export function sprinterThreshold(field: readonly AutoOrderRider[]): number {
  const sprs = field.map((r) => sprintScore(r.attrs)).sort((a, b) => a - b)
  if (sprs.length < 4) return 0
  const pos = SPRINTER_PCT * (sprs.length - 1)
  const bajo = Math.floor(pos)
  const alto = Math.min(sprs.length - 1, bajo + 1)
  return sprs[bajo]! + (sprs[alto]! - sprs[bajo]!) * (pos - bajo)
}

/**
 * HASTA QUÉ PUESTO DE LA GENERAL un corredor es la carta de su equipo (v42). El maillot, desde luego,
 * y los que están a tiro: un equipo con el tercero de la general corre para él, no le pone a lanzar.
 * Cinco es «los que salen en la foto del podio provisional» sin llegar a ser medio pelotón.
 */
const GC_CARD_RANK = 5

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
  sprinterMin: number,
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

  /**
   * 0) EL MAILLOT MANDA SOBRE EL TERRENO (v42). Si el equipo lleva al líder de la carrera —o a
   * alguien de los primeros de la general—, ÉSE es su carta del día y no se discute: el equipo corre
   * para él. Va antes que el reparto por terreno porque en la carretera es antes: un equipo con el
   * maillot no juega la etapa, defiende la camiseta.
   *
   * No le quita la etapa al velocista —sigue con su rol y su meta— pero deja de haber tren, que es
   * exactamente lo que hace un equipo que defiende: los hombres son para el líder. Y lo que importa
   * de verdad: el maillot ya no puede salir de lanzador ni de gregario de nadie.
   */
  /**
   * …Y ES EL MEJOR COLOCADO, NO EL PRIMERO QUE APAREZCA (v50). Esto era un `find`, o sea que cogía
   * al primero del ARRAY que estuviese entre los cinco primeros de la general. Con dos hombres del
   * equipo en el podio provisional —que es justo cuando esto importa— el que salía de carta era el
   * que llevara el dorsal más bajo, y el líder de la carrera se caía al reparto por terreno.
   *
   * El dueño lo vio en la etapa 13 del Race Italy y describió el síntoma sin saber la causa: «el
   * líder… lo veo demasiado combativo; se escapa, lo consiguen, le pillan, luego lo vuelve a
   * intentar… no tiene sentido que un líder haga eso; otra cosa es que los que van segundo, tercero
   * o cuarto lo hagan… ¡y curiosamente no veo que lo hagan!». Las dos mitades son la misma línea:
   * el maillot salía de **cazaetapas** (apetito de ataque 1,0, el más alto que hay, y deber de
   * relevo 0,5, cinco veces el de un líder) mientras sus rivales, ésos sí, salían de `lider` con
   * mentalidad `reservon`. La carrera al revés, exactamente.
   *
   * Y de ahí salen los otros dos síntomas que contó, sin tocar nada más: como no era `lider`,
   * `relayDuty` no le reconocía como la carta del equipo, así que el empuje de su propio equipo le
   * subía al turno de relevos —«nada más iniciar está el líder tirando del pelotón»— y acababa la
   * etapa reina perdiendo seis minutos y el maillot. No era la energía mal calibrada: era que
   * llevaba todo el día haciendo el trabajo de otro.
   */
  const maillot = team.reduce<AutoOrderRider | undefined>((mejor, r) => {
    if (r.gcRank == null || r.gcRank > GC_CARD_RANK) return mejor
    return mejor === undefined || r.gcRank < mejor.gcRank! ? r : mejor
  }, undefined)
  let leaderId: string | undefined
  if (maillot) {
    const m = take(maillot)!
    out.set(m.riderId, order({ role: 'lider', mentality: 'reservon', contestClimbs: mountain }))
    leaderId = m.riderId
  }

  // 1) Jefe de filas según el terreno.
  //
  // …Y ESTO SIGUE CORRIENDO AUNQUE HAYA MAILLOT (v42), porque un equipo que defiende la general no
  // deja de tener velocista: en una llana su rápido sigue jugándose la etapa, con su tren y todo. Lo
  // único que cambia es QUIÉN es la carta del equipo —el maillot, ya tomado más arriba—, y por eso
  // aquí solo se salta la línea que nombra jefe al velocista. El primer intento sí lo saltaba entero
  // y convertía al velocista en cazaetapas, que es cambiar un absurdo por otro.
  if (flat) {
    const bestSpr = ranked(
      team.filter((r) => remaining.has(r.riderId)),
      sprintScore,
    )[0]
    if (bestSpr && sprintScore(bestSpr.attrs) >= sprinterMin) {
      const s = take(bestSpr)!
      out.set(s.riderId, order({ role: 'sprinter', mentality: 'reservon', contestSprints: true }))
      if (!leaderId) leaderId = s.riderId
      // Tren: el mejor lanzando del resto lo lanza en meta.
      const launcher = next(leadOutScore)
      if (launcher)
        out.set(
          launcher.riderId,
          order({ role: 'lanzador', targetRiderId: s.riderId, contestSprints: true }),
        )
    } else if (!leaderId) {
      const l = next(allroundScore)
      if (l) {
        out.set(l.riderId, order({ role: 'lider', mentality: 'oportunista' }))
        leaderId = l.riderId
      }
    }
  } else if (!leaderId) {
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
  // El listón del día se calcula UNA vez sobre el campo entero y se le pasa a todos: si cada equipo
  // lo sacara de su propia plantilla, «superar el p75» significaría «ser el mejor de tu equipo», que
  // es otra cosa y la cumplen los veintidós.
  const sprinterMin = sprinterThreshold(riders)
  for (const team of byTeam.values()) assignTeam(team, stage, out, sprinterMin)

  // Agentes libres: cada uno decide en solitario. El que vale para la fuga la busca; un buen sprinter
  // espera la meta; el resto rueda neutro. Así los sueltos también dan vida a la carrera.
  const mountain = stage.kind === 'reina' || stage.kind === 'media'
  const flat = stage.kind === 'llana'
  for (const r of freeAgents) {
    const brk = breakScore(r.attrs)
    const spr = sprintScore(r.attrs)
    if (flat && spr >= sprinterMin) {
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
