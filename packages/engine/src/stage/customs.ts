/**
 * LA ADUANA COMO SUBASTA DE TRABAJO (docs/tactica.md R03) y LA GENERAL VIRTUAL (R04).
 *
 * Es **la pieza de la que cuelga el día entero**, y su razón está escrita en la ficha del catálogo
 * que la pide: «si la cuerda sale de un dado, todo lo que viene después —control, caza, desenlace—
 * está construido sobre azar». Hoy la cuerda sale de `pelotonAllows`, que es exactamente eso: una
 * probabilidad que sube con el kilómetro y baja con el tamaño, sin que nadie del pelotón opine.
 *
 * Aquí opinan los equipos. **La fuga sale si nadie con hombres frescos está dispuesto a pagar el
 * cierre**, y quien objeta lo hace porque ese movimiento le cuesta algo concreto: puestos en la
 * general, tiempo que gana un rival, o la etapa que su carta iba a disputar.
 *
 * ## La hipótesis nula, que es lo primero
 *
 * Con **cero objeciones la aduana tiene que devolver la conducta de hoy, término a término**. No la
 * constante base: la FÓRMULA entera de `pelotonAllows`, con su rampa de arranque, su castigo por
 * tamaño y su techo. Eso es `pHoy()`, y está copiada línea a línea del original a propósito: es el
 * ancla contra la que se mide todo lo que este racimo mueve. Sin ella no hay forma de saber si un
 * movimiento en `flat.breakawayWinPct` viene del voto o de haber tirado la rampa por el camino.
 *
 * Difiere de `pelotonAllows` en dos sitios, los dos declarados:
 *
 * - **el castigo de general** (`tacticAllowGcPenalty`) ya no multiplica la probabilidad: entra como
 *   `gcObjection` en el `pot`, que es donde se puede comparar con lo que cuesta cerrar;
 * - **el veto del maillot** se resuelve antes de la cuenta (`JERSEY_VETO`), con `return`, en vez de
 *   ser un sumando. Un veto que se puede pagar no es un veto, y escrito como un 99 dentro de una
 *   suma que recorta cada objeción a `min(objeción, payable)` valía lo mismo que cualquier otra.
 */
import { clamp } from '../random.js'
import { STAGE } from '../constants.js'
import type { MoveContext, MoveKind } from './tactics.js'

/** Un corredor visto desde la aduana: su casa, su general y lo que remata. */
export interface CustomsRider {
  riderId: string
  teamId: string | null
  gcDeficitSeconds: number
  finishScore: number
}

/** El movimiento que se juzga. */
export interface CustomsMove {
  riders: readonly CustomsRider[]
  /** Boquete al pelotón, en segundos. Al nacer es ~0. */
  gapSeconds: number
  kind: MoveKind
  /** ¿Refuerza a una fuga que ya está en carretera? (R03.6). */
  reinforcesFront?: boolean | undefined
}

/**
 * Un equipo visto desde la aduana. Todo lo que necesita para objetar y para pujar, y nada más:
 * la función es pura y no conoce `simulate.ts`.
 */
export interface CustomsTeam {
  teamId: string
  memberIds: readonly string[]
  /** Su carta de etapa (`stageCandidateId`) y lo que remata. */
  cardStageId: string | null
  cardStageFinishScore: number
  /** Su hombre de la general (`gcLeaderId`) y su déficit. `null` si no hay general en juego. */
  cardGcId: string | null
  cardGcDeficitSeconds: number | null
  /** Cuántos leales le quedan vivos en el pelotón, y cuántos convocó. */
  presentInPeloton: number
  convocados: number
  /** Fracción de presupuesto ya gastada, en [0,1]. */
  spentFraction: number
  /**
   * Lo buena que es su carta: **un `finishScore`, en la escala 0-100 del motor**, no una fracción.
   *
   * Se dice aquí con todas las letras porque la primera versión de esto lo recortaba a [0,1] y
   * entonces cualquier carta real valía exactamente 1: la calidad dejaba de distinguir al equipo del
   * mejor rematador del día del que lleva un gregario, y el bote salía igual de alto para los
   * veintidós. `payableOf` la normaliza.
   */
  quality: number
  /** La correa de este equipo, en segundos (R04.2). */
  leashSeconds: number
  /** ¿Lleva el ganador de la etapa de ayer? (memoria, R09). */
  hasYesterdayWinner?: boolean | undefined
  /** ¿Está ahora mismo cerrando un movimiento sin cuerda? (R19.4: cerrar es PRECIO). */
  closing?: boolean | undefined
}

/**
 * LA PROBABILIDAD DE HOY, TÉRMINO A TÉRMINO (`pelotonAllows`, sin el castigo de general y sin el
 * veto). Es la hipótesis nula del racimo: con `pot = 0` la aduana vale exactamente esto.
 *
 * La rampa **multiplica la base Y la ganancia por kilómetro**, que es lo que hace el código del que
 * sale; ponerla solo sobre la base mandaba la fuga del día al kilómetro 1, que es la regresión que
 * la v39 arregló y que este racimo no puede deshacer de paso.
 */
export function pHoy(ctx: MoveContext, partySize: number): number {
  const run = ctx.totalKm > 0 ? clamp(1 - ctx.kmToGo / ctx.totalKm, 0, 1) : 0
  let p = STAGE.tacticAllowBase + STAGE.tacticAllowKmGain * run
  const settle =
    STAGE.tacticAllowSettleFlatKm +
    (STAGE.tacticAllowSettleClimbKm - STAGE.tacticAllowSettleFlatKm) * clamp(ctx.breakAppeal, 0, 1)
  const kmRun = Math.max(0, ctx.totalKm - ctx.kmToGo)
  const asentada = settle > 0 ? clamp(kmRun / settle, 0, 1) : 1
  p *= STAGE.tacticAllowSettleFloor + (1 - STAGE.tacticAllowSettleFloor) * asentada
  const holgura = 1 - clamp(ctx.breakAppeal, 0, 1)
  p -= STAGE.tacticAllowSizePenalty * holgura * Math.max(0, partySize - STAGE.breakawaySizeMin)
  return clamp(p, 0, STAGE.tacticAllowMax)
}

/**
 * LO QUE CUESTA CERRAR ESTE MOVIMIENTO (R03.1). Sin la base y **sin la rampa**: la rampa vive en
 * `pHoy`, que es donde hoy mide y donde tiene efecto cuando nadie objeta. Puesta aquí se anulaba
 * —con `pot = 0`, `price/(price + 0)` vale 1 para cualquier precio— y puesta en los dos lados de la
 * comparación se cancelaba.
 */
export function priceOf(move: CustomsMove, vientoLateral: number): number {
  const tamano = 1 + STAGE.customs.sizeGain * Math.max(0, move.riders.length - 3)
  return tamano * (1 + STAGE.customs.windGain * clamp(vientoLateral, 0, 1))
}

/** ¿Va la carta de general de este equipo dentro del movimiento? */
function cardGcInside(t: CustomsTeam, move: CustomsMove): boolean {
  return t.cardGcId !== null && move.riders.some((r) => r.riderId === t.cardGcId)
}

/** ¿Y la de etapa? */
function cardStageInside(t: CustomsTeam, move: CustomsMove): boolean {
  return t.cardStageId !== null && move.riders.some((r) => r.riderId === t.cardStageId)
}

/**
 * LA GENERAL VIRTUAL (R04.1): puestos que pierde MI hombre **y tiempo que gana un rival**.
 *
 * Los dos términos, y el segundo es el que faltaba: hoy el motor solo sabe mirar al mejor de la fuga
 * (`frontThreatDeficit`), que no dice ni a quién le cuesta ni cuánto. Con solo puestos, el maillot
 * metido en la fuga valía lo mismo para el equipo del segundo a diez segundos que a cinco minutos.
 *
 * El tiempo se normaliza por **la correa de ese equipo**: a partir de la correa el director ya no
 * «deja ir», así que ahí el término satura en 1.
 */
export function gcObjection(t: CustomsTeam, move: CustomsMove): number {
  const miDeficit = t.cardGcDeficitSeconds
  if (t.cardGcId === null || miDeficit === null) return 0
  const gap = Math.max(0, move.gapSeconds)
  let pasanDelante = 0
  let hayRival = false
  for (const f of move.riders) {
    if (f.riderId === t.cardGcId) continue
    // Iba DETRÁS de mi hombre y con este hueco le pasaría por delante.
    if (f.gcDeficitSeconds > miDeficit && f.gcDeficitSeconds - gap < miDeficit) pasanDelante += 1
    // Rival de general: o está cerca en la tabla, o está a menos de una correa de mi hombre. Un
    // fugado a cuarenta minutos no es rival aunque gane cinco.
    if (f.gcDeficitSeconds - miDeficit <= t.leashSeconds) hayRival = true
  }
  const porPuestos = clamp(pasanDelante / STAGE.customs.gcPlaces, 0, 1)
  const porTiempo =
    cardGcInside(t, move) || !hayRival ? 0 : clamp(gap / Math.max(1, t.leashSeconds), 0, 1)
  return porPuestos + porTiempo
}

/**
 * LA OBJECIÓN DE ETAPA (R03.2), con **sus dos ramas**. La segunda faltaba, y sin ella el equipo del
 * sprinter no cazaba nunca: contra nueve rodadores que rematan veinte puntos por debajo de su
 * velocista, la primera rama da cero, y una fuga consolidada le gana a la carta **remate quien
 * remate**, porque si llega no hay sprint.
 *
 * En la aduana —boquete ≈ 0 al nacer— la segunda rama no dispara: el equipo del sprinter no paga la
 * cuerda de cuatro anónimos, que es exactamente lo que hace en carretera.
 */
export function stageObjection(t: CustomsTeam, move: CustomsMove): number {
  if (t.cardStageId === null) return 0
  if (cardStageInside(t, move)) return 0
  return move.riders.some((f) => f.finishScore >= t.cardStageFinishScore - STAGE.customs.rivalGap)
    ? 1
    : 0
}

/**
 * …Y LA SEGUNDA RAMA, QUE **NO ES DE LA ADUANA** (R04.1b). Una fuga ya consolidada le gana a la
 * carta de etapa **remate quien remate**, porque si llega no hay sprint: ahí no importa si alguno de
 * los de dentro rematа cerca del velocista.
 *
 * Vive aquí y no en `stageObjection` porque las dos preguntas son distintas y el diseño lo dice con
 * todas las letras: en la ADUANA —boquete ≈ 0 al nacer— el equipo del sprinter **no paga la cuerda
 * de cuatro anónimos**, que es exactamente lo que hace en carretera; con la fuga ya a noventa
 * segundos, sí, y eso es lo que decide **a quién se persigue**.
 *
 * Meterla en la objeción de la aduana tiene un efecto medido y desastroso: la revisión por kilómetro
 * la dispara en cuanto el hueco pasa de `tacticBreakGapSeconds`, todos los equipos con carta objetan
 * de golpe, y **el movimiento pierde la cuerda justo en el kilómetro en que la había ganado**. Medido
 * en la llana canónica: la fuga gana el 0,0 % de las etapas y la captura sube al 99 %.
 */
export function stageThreat(t: CustomsTeam, move: CustomsMove): number {
  if (t.cardStageId === null) return 0
  if (cardStageInside(t, move)) return 0
  if (move.gapSeconds >= STAGE.tacticBreakGapSeconds) return 1
  return stageObjection(t, move)
}

/**
 * LO QUE ME CUESTA UN MOVIMIENTO, ENTERO (R04.1b). Es **la misma suma** que usa la aduana para el
 * `pot` y que usará la subasta del frente para elegir a quién persigue, y por eso vive en una sola
 * función: escribirlo dos veces era garantizar que se desincronizaran.
 *
 * El tercer término —los motivos secundarios, R05— vale 0 hasta el paso 9. Se deja el sumando
 * escrito para que quien lo encienda no tenga que buscar dónde va.
 */
export function threatOf(t: CustomsTeam, move: CustomsMove): number {
  return gcObjection(t, move) + stageThreat(t, move) + 0
}

/**
 * LA OBJECIÓN (R03.2). Cero si una carta va dentro —eso no es un descuento, es que ya no hay nada
 * que objetar—, y un descuento si va un leal cualquiera.
 *
 * Las tres piezas están en la misma escala a propósito («una carta mía se juega algo» = 1,0), que es
 * lo que hace comparables la objeción y lo que se puede pagar.
 */
export function objectionOf(t: CustomsTeam, move: CustomsMove): number {
  if (cardGcInside(t, move) || cardStageInside(t, move)) return 0
  const leales = new Set(t.memberIds)
  const hayLeal = move.riders.some((r) => leales.has(r.riderId))
  // Ojo: la objeción usa `stageObjection` y NO `threatOf`. Son la misma suma salvo en la segunda
  // rama de la etapa, que es de `threatOf` y no de la aduana (ver `stageThreat`).
  const bruto =
    gcObjection(t, move) + stageObjection(t, move) - (hayLeal ? STAGE.customs.loyalInside : 0)
  return clamp(bruto, 0, 4)
}

/**
 * CUÁNTO PUEDE PAGAR ESTE EQUIPO (R03.3). Hombres que le quedan, frescura y calidad de su carta,
 * por la memoria de lo que pasó ayer.
 *
 * Se normaliza por **convocados y no por ocho**: en una carrera de equipos de cuatro a seis,
 * dividir por ocho dejaba `payable ≤ 0,75` siempre y el pulso del frente saltaba en todas las etapas
 * por pura aritmética.
 *
 * Y **cerrar cuesta** (R19.4): el equipo que está cerrando un movimiento sin cuerda tiene menos que
 * ofrecer por el siguiente. Es el precio que sustituye al veto que el paso 5 retiró — los intentos
 * se solapan, y cerrar sale caro.
 */
export function payableOf(t: CustomsTeam, move: CustomsMove): number {
  const base =
    (t.presentInPeloton / Math.max(1, t.convocados)) *
    (1 - clamp(t.spentFraction, 0, 1)) *
    clamp(t.quality / 100, 0, 1)
  const memoria = t.hasYesterdayWinner === true ? STAGE.customs.yesterdayWinner : 1
  const ocupado = t.closing === true ? STAGE.customs.closingBusyDamp : 1
  const refuerzo = move.reinforcesFront === true ? 1 - STAGE.customs.bridgePassGain : 1
  return Math.max(0, base * memoria * ocupado * refuerzo)
}

/** El bote: lo que el pelotón, sumando equipo a equipo, está dispuesto a poner para cerrar. */
export function potOf(teams: readonly CustomsTeam[], move: CustomsMove): number {
  let pot = 0
  for (const t of teams) {
    const o = objectionOf(t, move)
    if (o <= 0) continue
    pot += Math.min(o, payableOf(t, move))
  }
  return pot
}

/**
 * LA PROBABILIDAD DE QUE EL PELOTÓN DÉ CUERDA.
 *
 * `P = pHoy · price / (price + peso · pot)`, así que **el voto SOLO BAJA la probabilidad respecto a
 * hoy**: mucho dinero dispuesto a pagar el cierre la hunde, y el precio solo la DEVUELVE hacia
 * `pHoy`, nunca por encima. «Una fuga cara de cerrar sale más que hoy» es falso y no se escribe.
 */
export function customsProbability(
  ctx: MoveContext,
  move: CustomsMove,
  teams: readonly CustomsTeam[],
  vientoLateral: number,
): number {
  const base = pHoy(ctx, move.riders.length)
  const pot = potOf(teams, move)
  if (pot <= 0) return base
  const price = priceOf(move, vientoLateral)
  return base * (price / (price + STAGE.customs.potWeight * pot))
}

/**
 * EL VETO DEL MAILLOT (R03.0), que va ANTES que la cuenta y no dentro de ella. La excepción es el
 * maillot sin un solo hombre vivo: no hay quien lo ejerza, y entonces el movimiento pasa a la cuenta
 * normal.
 */
export function jerseyVetoes(
  move: CustomsMove,
  hasGcContext: boolean,
  jerseyTeamHasMenAlive: boolean,
): boolean {
  if (!hasGcContext || !jerseyTeamHasMenAlive) return false
  return move.riders.some((r) => r.gcDeficitSeconds <= 0)
}

// --- R04.2: la correa, sobre el terreno que QUEDA -------------------------------------------

/** Lo que queda de carrera, visto por la correa. */
export interface RaceShape {
  kmSubidaRestante: number
  kmCronoRestante: number
  etapasEnLineaRestantes: number
  diasRestantes: number
}

/** Cuánto tiempo se puede recuperar todavía, con el terreno que queda (R04.2). */
export function recoverableSeconds(shape: RaceShape): number {
  return (
    STAGE.customs.gcClimbRecoverPerKm * Math.max(0, shape.kmSubidaRestante) +
    STAGE.customs.gcTtRecoverPerKm * Math.max(0, shape.kmCronoRestante) +
    (shape.etapasEnLineaRestantes >= 3 ? STAGE.customs.gcFlatRecoverBase : 0)
  )
}

/**
 * LA CORREA DE UN EQUIPO (R04.2), que **sustituye a `gcControlLeash` = 700**: una constante que
 * decidía sola a quién se persigue durante toda la carrera. Día 3 de 21 con montaña por delante, la
 * correa se va a novecientos y se deja ir; día 19 con una crono corta, baja a ciento y pico y se
 * caza.
 *
 * Suma el colchón que la carta YA tiene, porque sin él —en una carrera sin crono y con poca subida—
 * la correa vivía clavada en su suelo desde el día 1 y la fuga no pasaba de minuto y medio en
 * ninguna etapa: el extremo contrario del defecto que la regla venía a arreglar. Y el suelo se
 * escala con los días que quedan, por lo mismo.
 */
export function leashOf(colchonSeconds: number, shape: RaceShape): number {
  const suelo = STAGE.customs.gcLeashMinS * clamp(shape.diasRestantes / 5, 0.5, 1)
  const bruto = Math.max(0, colchonSeconds) + recoverableSeconds(shape) * STAGE.customs.gcLeashShare
  return clamp(bruto, suelo, STAGE.customs.gcLeashMaxS)
}
