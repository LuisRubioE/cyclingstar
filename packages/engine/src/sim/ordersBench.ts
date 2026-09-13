/**
 * EL BANCO DE ÓRDENES, QUE NO EXISTÍA (docs/tactica.md §7.3, paso 0).
 *
 * `diseno/mapa-bancos.md` §7.7 lo dice sin rodeos: **«ningún banco varía `mentality`,
 * `contestSprints/Climbs`, `targetRiderId` o rol por decisión externa»**. O sea que el juego ofrece
 * al jugador siete palancas y ninguna prueba comprobaba que alguna de ellas HAGA algo. Y la queja
 * del dueño es exactamente ésa: «el resultado es casi lo mismo ponga lo que ponga ahí».
 *
 * El método es el pareado: **el mismo hombre, el mismo campo, la misma semilla, UNA palanca
 * cambiada**. Todo lo demás idéntico. Así la diferencia que salga es de la palanca y de nada más.
 *
 * **Y la dirección NO se mide sobre medias crudas, que es donde este repositorio ya se quemó.**
 * `diseno/mapa-bancos.md` §7.21 avisa de que con 6-12 semillas «todo lo más fino que 2-4 puntos
 * porcentuales está dentro del ruido», y §8 recuerda nocturnos caídos con CERO afirmaciones
 * falladas. Aquí se mide la **mediana de las diferencias PAREADAS**: misma semilla, dos corridas,
 * se resta. Una mediana pareada con doce semillas es casi determinista; una media cruda no lo es.
 *
 * LO QUE ESTE BANCO ENCONTRÓ EL PRIMER DÍA, para que conste desde el principio: de las siete
 * palancas, **`contestClimbs` no la lee nadie**. `disputeBanner` sí la mira, pero solo se llama para
 * las metas volantes; las cimas van por `disputeClimb`, que ordena `g.members` **directamente** y no
 * consulta la orden en ninguna línea. O sea que el jugador marca «disputa las cotas» y el motor no
 * se entera. (El diseño ya lo sabía: «**`contestClimbs` respetado**» es trabajo del paso 10. Aquí
 * queda MEDIDO en vez de supuesto.)
 *
 * SIETE PALANCAS Y NO ONCE, y hay que decirlo: `trigger_on`, `chase_policy`, `refuse_relay_teams` y
 * `day_goal` **no existen** —ni en `StageOrders` ni en la tabla `stage_orders`—, así que un banco de
 * once palancas no compilaría. Entran en el paso 17a, con la migración que las crea, y ahí se
 * re-mide el coste.
 */
import { ATTRIBUTES, type Attribute, seededRng } from '@cyclingstar/shared'
import { eff0, initialEnergy } from '../banister.js'
import { matchCount } from '../stage/physics.js'
import { stageSeed } from '../stage/rng.js'
import { simulateStage } from '../stage/simulate.js'
import type { StageOrders, StageProfile, StageRider } from '../stage/types.js'
import { generateNpcRider, sampleNpcAge } from '../world/npc.js'

/** Una palanca: cómo se pone «apagada» y cómo «encendida», y qué se espera que mueva. */
export interface Lever {
  id: string
  off: Partial<StageOrders>
  on: Partial<StageOrders>
  /** El signo que la palanca PROMETE sobre la métrica de su fila. */
  espera: 'sube' | 'baja'
  why: string
}

export const LEVERS: readonly Lever[] = [
  {
    id: 'mentality',
    off: { mentality: 'reservon' },
    on: { mentality: 'supercombativo' },
    espera: 'sube',
    why: 'la palanca más visible de la pantalla: atacar o esperar',
  },
  {
    id: 'effort',
    off: { effort: 'ahorrar' },
    on: { effort: 'a_tope' },
    espera: 'sube',
    why: 'hasta la v58 era un botón DESCONECTADO: el contrato no llevaba el campo',
  },
  {
    id: 'role-cazaetapas',
    off: { role: 'gregario' },
    on: { role: 'cazaetapas' },
    espera: 'sube',
    why: 'el rol decide las ganas de atacar (`ROLE_APPETITE`)',
  },
  {
    id: 'role-lider',
    off: { role: 'gregario' },
    on: { role: 'lider' },
    espera: 'sube',
    why: 'ser la carta del equipo tiene que valer algo en el resultado',
  },
  {
    id: 'contestSprints',
    off: { contestSprints: false },
    on: { contestSprints: true },
    espera: 'sube',
    why: 'disputar o no el remate',
  },
  {
    id: 'contestClimbs',
    off: { contestClimbs: false },
    on: { contestClimbs: true },
    espera: 'sube',
    why: 'disputar o no las cotas',
  },
  {
    id: 'triggerKm',
    off: { triggerKm: null },
    on: { triggerKm: 120 },
    espera: 'sube',
    why: 'la otra palanca que la pantalla promete: «lanza tu movimiento aquí»',
  },
]

/** `llana-180` con campo de 88 (11 equipos de 8), que es lo que §7.3 pide. */
const EQUIPOS = 11
const POR_EQUIPO = 8

/**
 * `llana-180` CON PANCARTAS, y hay que decir por qué: la primera versión de este banco no las tenía
 * y `contestSprints`/`contestClimbs` salían moviendo **0 de 12 semillas**. Eso no era un defecto del
 * motor: era que en una llana sin un solo volante ni una sola cima **no hay nada que disputar**, así
 * que la palanca no tenía dónde actuar y el banco publicaba un cero falso.
 *
 * Una palanca solo se puede medir en el escenario donde significa algo. Aquí hay dos volantes y dos
 * cotas, que es lo que trae una llana de verdad.
 */
const PERFIL: StageProfile = {
  segments: [
    { km: 60, tipo: 'llano' },
    { km: 8, tipo: 'puerto' },
    { km: 50, tipo: 'llano' },
    { km: 6, tipo: 'puerto' },
    { km: 56, tipo: 'llano' },
  ],
  banners: [
    { km: 40, tipo: 'meta_volante' },
    { km: 68, tipo: 'cima' },
    { km: 100, tipo: 'meta_volante' },
    { km: 124, tipo: 'cima' },
  ],
}

const BASE: StageOrders = {
  role: 'gregario',
  mentality: 'reservon',
  effort: 'normal',
  triggerKm: null,
  contestSprints: false,
  contestClimbs: false,
}

interface Campo {
  riders: StageRider[]
  /** El hombre sobre el que se mueve la palanca: el primero del primer equipo. */
  sujeto: string
}

function buildCampo(seed: number): Campo {
  const worldSeed = `ordenes-${seed}`
  const rng = seededRng(`${worldSeed}:campo`)
  const riders: StageRider[] = []
  for (let t = 0; t < EQUIPOS; t++) {
    for (let k = 0; k < POR_EQUIPO; k++) {
      const riderId = `o-${t}-${k}`
      const genome = generateNpcRider(`${worldSeed}:${riderId}`, {
        division: 'PRS',
        vocation: 'fondo',
        age: sampleNpcAge(`${worldSeed}:${riderId}:age`, { v2: true }),
        v2: true,
      })
      const ctl = 60 + 15 * rng()
      const atl = 50 + 12 * rng()
      const tsb = ctl - atl
      const eff = {} as Record<Attribute, number>
      for (const a of ATTRIBUTES) eff[a] = eff0(genome.attributes[a], ctl, tsb, 'sano', 60)
      riders.push({
        riderId,
        eff0: eff,
        energy: initialEnergy(ctl, tsb, 'sano'),
        matches: matchCount(eff, tsb, false),
        tsb,
        orders: { ...BASE },
        gcDeficitSeconds: 0,
        fragility: genome.hidden.fragility,
        teamId: `o-team-${t}`,
      })
    }
  }
  return { riders, sujeto: 'o-0-0' }
}

/**
 * Lo que se mide del sujeto en una corrida. **Las tres cosas, porque no todas las palancas mueven
 * lo mismo**, y medirlas todas contra el puesto fue el primer error de este banco: `contestSprints`
 * y `contestClimbs` salían moviendo 0 de 12 semillas, y no era verdad. Lo que hacen es cambiar
 * quién DISPUTA las pancartas —o sea puntos—, y el puesto en meta no se entera.
 *
 * Un banco que mide la palanca equivocada publica un cero tan falso como el de un botón roto, y
 * encima con la apariencia de un hallazgo.
 */
interface Resultado {
  puesto: number
  /** Trabajo gastado, en unidades del motor: la otra mitad de «¿hace algo la orden?». */
  work: number
  /** Puntos de volante y de montaña: es lo que mueven las dos palancas de disputar. */
  puntos: number
}

function corre(seed: number, palanca: Partial<StageOrders> | null): Resultado | null {
  const campo = buildCampo(seed)
  const riders = campo.riders.map((r) =>
    r.riderId === campo.sujeto && palanca !== null
      ? { ...r, orders: { ...r.orders, ...palanca } }
      : r,
  )
  const out = simulateStage(
    { profile: PERFIL, riders },
    stageSeed({
      worldSeed: `ordenes-${seed}`,
      raceId: 'llana-180-ordenes',
      stageDay: 1,
      engineVersion: 1,
    }),
  )
  const fila = out.results.find((r) => r.riderId === campo.sujeto)
  if (fila === undefined) return null
  return {
    puesto: fila.puesto,
    work: out.workUnits.get(campo.sujeto) ?? 0,
    puntos: fila.puntosVolante + fila.puntosMontana,
  }
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!
}

export interface LeverResult {
  id: string
  seeds: number
  /** Mediana de la diferencia PAREADA de puesto (negativa = mejora, porque el puesto 1 es el mejor). */
  medianRankDelta: number
  /** Mediana de la diferencia pareada de trabajo gastado. */
  medianWorkDelta: number
  /** Mediana de la diferencia pareada de puntos de pancarta. */
  medianPointsDelta: number
  /**
   * CUÁNTO MUEVE **CUANDO MUEVE**, y por qué hace falta esta columna.
   *
   * `contestSprints` sale moviendo 1 de 12 semillas, y leer eso como «casi no hace nada» sería
   * falso: cuando el grupo del sujeto SÍ disputa la pancarta, la palanca es decisiva —pasa de 0 a
   * 20 puntos de volante, porque al ser el único interesado se lleva el banner entero—. Lo que pasa
   * es que en un pelotón de 88 con una fuga por delante, la volante se la disputa la fuga y el
   * pelotón ni la ve.
   *
   * O sea que la palanca no está desconectada: está CONDICIONADA, y las dos cosas se arreglan de
   * formas distintas. Una mediana sobre las doce semillas confunde las dos.
   */
  medianPointsWhenMoved: number
  /** En cuántas semillas la palanca cambió ALGO. Cero = botón desconectado. */
  seedsThatMoved: number
  espera: 'sube' | 'baja'
}

export interface OrdersStats {
  seeds: number
  levers: LeverResult[]
  /** Cuántas de las siete palancas mueven algo en al menos una semilla. */
  leversThatDoAnything: number
}

/**
 * Corre el banco. `seeds` semillas × 7 palancas × 2 valores, pareado por semilla.
 *
 * Lo que hay que leer primero no es la dirección sino `seedsThatMoved`: una palanca que no mueve
 * NADA en ninguna semilla no está mal calibrada, está desconectada, y eso es un defecto de otra
 * clase.
 */
export function analyzeOrders(seeds: number): OrdersStats {
  const levers: LeverResult[] = []
  for (const lever of LEVERS) {
    const rank: number[] = []
    const work: number[] = []
    const pts: number[] = []
    let movieron = 0
    for (let s = 0; s < seeds; s++) {
      const off = corre(s, { ...BASE, ...lever.off })
      const on = corre(s, { ...BASE, ...lever.on })
      if (off === null || on === null) continue
      rank.push(on.puesto - off.puesto)
      work.push(on.work - off.work)
      pts.push(on.puntos - off.puntos)
      if (
        on.puesto !== off.puesto ||
        Math.abs(on.work - off.work) > 1e-9 ||
        on.puntos !== off.puntos
      ) {
        movieron += 1
      }
    }
    levers.push({
      id: lever.id,
      seeds: rank.length,
      medianRankDelta: median(rank),
      medianWorkDelta: median(work),
      medianPointsDelta: median(pts),
      medianPointsWhenMoved: median(pts.filter((x) => x !== 0)),
      seedsThatMoved: movieron,
      espera: lever.espera,
    })
  }
  return {
    seeds,
    levers,
    leversThatDoAnything: levers.filter((l) => l.seedsThatMoved > 0).length,
  }
}
