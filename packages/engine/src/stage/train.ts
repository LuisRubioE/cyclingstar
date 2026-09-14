/**
 * EL TREN COMO SUBMOTOR DE QUINCE KILÓMETROS (R16, docs/tactica.md paso 15).
 *
 * Un tren **con estado**, no un `elTren` que a tres kilómetros de meta sustituye la rotación por
 * lanzadores. La diferencia es la carrera entera: hoy, entre el km 15 y el 3, el frente del pelotón
 * lo sigue decidiendo el turno de relevos por deber, y **el frente de los últimos quince kilómetros
 * se disputa y se pierde** —un tren se funde y otro lo hereda, uno llega tarde y remonta por fuera,
 * un contraataque obliga a rehacerlo, y hay días en que a ocho kilómetros todavía no manda nadie—.
 *
 * Y lleva `kind`, **porque hay dos trenes y el motor solo conocía uno**: el de sprint y el de
 * montaña. El de montaña es lo que hace que el último puerto de una gran vuelta se parezca a lo que
 * se ve en televisión, y además es el sitio donde encaja `lastHelperCommit`, una constante que
 * existía sin que nadie la aplicara.
 */
import { STAGE } from '../constants.js'

export type TrainKind = 'sprint' | 'montana'
export type TrainState = 'formando' | 'tirando' | 'roto' | 'lanzado'

export interface Train {
  teamId: string
  cardId: string
  kind: TrainKind
  /** En orden de relevo, del primero al último. */
  helpers: string[]
  /** Cuál está tirando ahora. Igual a `helpers.length` cuando ya no queda ninguno. */
  index: number
  /** Km que lleva tirando el actual. */
  turnKm: number
  state: TrainState
}

/** Lo que hace falta saber de un candidato a lanzador para ponerlo en la fila. */
export interface TrainCandidate {
  riderId: string
  /** LLA para el tren de sprint; MON para el de montaña. */
  motor: number
  freshness: number
}

/**
 * QUIÉN VA EN QUÉ ORDEN, y **los dos trenes se ordenan al revés el uno del otro**, que es la parte
 * que casi nadie escribe:
 *
 *  - el de **sprint** pone delante al más rodador y más fresco, porque el primer relevo es el más
 *    largo y el más duro;
 *  - el de **montaña** ordena por MON **ascendente** —de menos a más fuerte—, porque el último que
 *    queda antes de la rampa tiene que ser el mejor. Es la fila literal del catálogo.
 */
export function orderHelpers(kind: TrainKind, candidatos: TrainCandidate[]): string[] {
  const max = kind === 'sprint' ? STAGE.train.maxLaunchers : STAGE.train.maxClimbHelpers
  const orden = [...candidatos].sort((a, b) =>
    kind === 'sprint'
      ? b.motor - a.motor || b.freshness - a.freshness || (a.riderId < b.riderId ? -1 : 1)
      : a.motor - b.motor || b.freshness - a.freshness || (a.riderId < b.riderId ? -1 : 1),
  )
  return orden.slice(0, max).map((c) => c.riderId)
}

/**
 * CUÁNTO DURA EL TREN ENTERO, y **por qué esto no es un detalle de contabilidad**.
 *
 * Los tres relevos suman 9,5 km, no 15. El tren SE MONTA a quince kilómetros —ahí es donde los
 * equipos se colocan y la fila toma forma— pero **empieza a tirar más tarde**, para que el último
 * hombre se esté vaciando justo en la meta. Arrancando los turnos a los quince, medido, el tren se
 * gastaba entero a 5,5 km de meta y el velocista llegaba solo: el mejor del campo caía del 40 % al
 * **26,7 %** de las llanas, por debajo de su banda. Un tren que se acaba antes de la línea no es un
 * tren, es un despilfarro.
 */
export function trainSpanKm(t: Train): number {
  let total = 0
  for (let i = t.index; i < t.helpers.length; i++) total += turnKmOf(t.kind, i)
  return total - t.turnKm
}

/** Cuánto le toca tirar al relevo `i` de un tren de sprint: 5 km, luego 3, luego 1,5. */
export function turnKmOf(kind: TrainKind, index: number): number {
  if (kind === 'montana') return STAGE.train.climbTurnKm
  return STAGE.train.turnKm[Math.min(index, STAGE.train.turnKm.length - 1)] ?? 1.5
}

/**
 * EL TREN AVANZA UN BLOQUE (R16.1 y R16.2). Dos cosas lo hacen pasar al siguiente hombre: que se
 * agote su turno o **que se funda**. Y cuando no queda ninguno el tren no desaparece: queda `roto`,
 * que es un estado distinto y observable —la carta se ha quedado sola, y eso hay que poder
 * contarlo—.
 */
export function advanceTrain(t: Train, dkm: number, freshnessDelActual: number): Train {
  if (t.state === 'roto' || t.state === 'lanzado') return t
  if (t.index >= t.helpers.length) return { ...t, state: 'roto' }
  const fundido = freshnessDelActual < STAGE.train.spentFreshness
  const turnKm = t.turnKm + dkm
  if (!fundido && turnKm < turnKmOf(t.kind, t.index)) {
    return { ...t, turnKm, state: 'tirando' }
  }
  const index = t.index + 1
  return {
    ...t,
    index,
    turnKm: 0,
    state: index >= t.helpers.length ? 'roto' : 'tirando',
  }
}

/**
 * DÓNDE SE ABRE EL SPRINT, Y **NO ES UNA CONSTANTE** (R16.6, S-348/S-342/S-369).
 *
 * El lanzador entra a mil metros, se vacía y se aparta a doscientos; el sprinter sale de su rueda
 * entre 250 y 150 — **pero eso es un llano sin viento**. Con viento de cola o meta en bajada se abre
 * de mucho más lejos porque la rueda vale menos; con viento de cara o cuesta arriba, el primero que
 * abre se muere y todo el mundo espera.
 */
export function launchStandoffM(
  base: number,
  vientoCola: number,
  vientoCara: number,
  sobreAdoquin: boolean,
): number {
  let m = base
  if (vientoCola > 0) m *= 1 + (STAGE.train.tailwindGain - 1) * Math.min(1, vientoCola)
  if (vientoCara > 0) m *= 1 - (1 - STAGE.train.headwindDamp) * Math.min(1, vientoCara)
  if (sobreAdoquin) m *= STAGE.train.paveGain
  return m
}

/**
 * EL SPRINTER SIN TREN ELIGE RUEDA (R16.4, S-337/S-338). No corre al azar: se pega al mejor tren que
 * pueda alcanzar, pondera lo que ese tren vale contra lo lejos que está el hueco libre, y **pierde
 * por colocación, no por piernas** — que es exactamente la fila.
 */
export function pickWheel(
  trenes: { teamId: string; quality: number; huecoPlacement: number }[],
): string | null {
  let mejor: { teamId: string; score: number } | null = null
  for (const t of trenes) {
    const score = t.quality - STAGE.train.wheelPickWeight * t.huecoPlacement
    if (
      mejor === null ||
      score > mejor.score ||
      (score === mejor.score && t.teamId < mejor.teamId)
    ) {
      mejor = { teamId: t.teamId, score }
    }
  }
  return mejor?.teamId ?? null
}

/**
 * EL LANZADOR SIN SPRINTER SE RECICLA (R16.8, S-372). Si su hombre ya no está en el grupo, el
 * lanzador **pierde el peaje de su rol** y vuelve a correr como un libre. Hoy es al revés: pierde el
 * premio y conserva el peaje, o sea que se queda con lo peor de los dos papeles.
 */
export function launcherIsFree(suSprinterSigueEnElGrupo: boolean): boolean {
  return !suSprinterSigueEnElGrupo
}
