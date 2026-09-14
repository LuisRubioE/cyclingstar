/**
 * PERCANCES MECÁNICOS Y EL COCHE DE EQUIPO (R11, docs/tactica.md paso 13).
 *
 * Racimo entero ausente hasta hoy: en este motor **nadie pinchaba**. Y eso no es una laguna de
 * detalle, es la que bloquea el precio de cualquier percance —la situación S-222 es la nº 18 de las
 * veinte más graves del catálogo por eso mismo—: sin coche que llegue tarde, una avería no cuesta
 * nada, y sin que cueste nada no hay nada que decidir alrededor.
 *
 * La forma es la de `crash.ts`: un dado por bloque, un radio de consecuencias y un precio. Lo que
 * cambia es que aquí el precio **no lo pone el azar, lo pone la organización de la carrera**: cuánto
 * tarda TU coche, que depende de dónde vayas, de qué puesto ocupe tu equipo en la caravana y de si
 * la carretera deja pasar a alguien.
 */
import { STAGE } from '../constants.js'

export type MishapKind = 'pinchazo' | 'averia'

/**
 * EL DADO (R11.1). Cuatro factores, y el que manda es el terreno: **×20 en el adoquín y ×45 en la
 * tierra**. Ése es el número que hace que «pinchar en el peor sitio» exista de verdad; con un dado
 * plano, un sector de pavé sería una subida con más ruido.
 *
 * Y se pincha MÁS ATRÁS (`placementGain`), que no es superstición: delante se ve el agujero.
 */
export function mishapLambda(
  terreno: 'llano' | 'subida' | 'descenso' | 'paves',
  lluvia: number,
  placement: number,
): number {
  const t = STAGE.mishap.terrainFactor[terreno]
  return (
    STAGE.mishap.base *
    t *
    (1 + STAGE.mishap.rainGain * Math.max(0, Math.min(1, lluvia))) *
    (1 + STAGE.mishap.placementGain * Math.max(0, Math.min(1, placement)))
  )
}

/** Dónde está este corredor cuando le pasa: eso decide si hay coche o no lo hay. */
export interface CarAccess {
  /** [0,1], su sitio dentro del grupo. */
  placement: number
  /** Puesto de su equipo en la caravana, 1 = el del líder de la general. */
  convoyRank: number
  /** ¿Hay caravana ahí? En cabeza de carrera, en un puerto cerrado o con la carrera rota, no. */
  hayCaravana: boolean
}

/**
 * CUÁNTO TARDA EL COCHE (R11.2, S-222/S-435), y aquí está la injusticia estructural que el ciclismo
 * tiene de verdad: **treinta segundos sistemáticos** entre el hombre del equipo del líder —cuyo
 * coche va el primero de la fila— y el del equipo modesto, que va el vigésimo. No es mala suerte,
 * es el reglamento, y cambia cada día con la general.
 *
 * Sin caravana el precio se triplica y aparece la asistencia neutra: tarda más y da una rueda que
 * encaja peor.
 */
export function carArrivalS(a: CarAccess): number {
  const base =
    STAGE.mishap.carBaseS +
    STAGE.mishap.carPerPlaceS * 100 * Math.max(0, Math.min(1, a.placement)) +
    STAGE.mishap.carConvoyRankS * Math.max(0, a.convoyRank - 1)
  return a.hayCaravana ? base : base * STAGE.mishap.carNoAccessGain
}

/** Lo que cuesta el percance entero: esperar al coche y el cambio. */
export function mishapStopS(kind: MishapKind, a: CarAccess): number {
  const cambio = kind === 'pinchazo' ? STAGE.mishap.changePunctureS : STAGE.mishap.changeMechanicalS
  // La rueda neutra encaja peor, y por eso se tarda más en volver a rodar con ella.
  const neutra = a.hayCaravana ? 1 : STAGE.mishap.neutralWheelGain
  return carArrivalS(a) + cambio * neutra
}

/**
 * EL ASCENSOR DE LA CARAVANA (R11.3, S-435). Volver al pelotón por el pasillo de los coches es
 * **media carrera**: se avanza a rebufo de veinte vehículos y se recuperan doce segundos por
 * kilómetro durante seis. Sin caravana no hay ascensor, y entonces el mismo pinchazo cuesta minutos
 * en vez de segundos — que es exactamente la diferencia entre pinchar en el km 40 y pinchar en el
 * puerto final.
 */
export function caravanPullS(kmDesdeElPercance: number, hayCaravana: boolean): number {
  if (!hayCaravana) return 0
  const km = Math.max(0, Math.min(STAGE.mishap.caravanMaxKm, kmDesdeElPercance))
  return STAGE.mishap.caravanPullS * km
}

/**
 * LA BICI, NO LA RUEDA (R11.4, S-201). El sacrificio material que de verdad se ve en carretera es
 * la bici entera, y solo vale si coinciden talla y pedales: una diferencia de más de un cuadro y el
 * gesto es inútil. El que la cede pierde el percance ENTERO y su día se ha acabado.
 *
 * Dónde no existe: en la crono no hay compañero al que quitársela, y dentro de los últimos tres
 * kilómetros no salva nada porque el tiempo ya está dado.
 */
export function canSwapBike(alturaA: number, alturaB: number): boolean {
  return Math.abs(alturaA - alturaB) <= STAGE.mishap.bikeSwapCm
}

/**
 * ¿SE ESPERA AL DEL PERCANCE DENTRO DE LA FUGA? (R11.5, S-110/S-111). **Aritmética, no cortesía**:
 * se espera si el pelotón está lo bastante lejos como para poder permitírselo y si el que ha
 * pinchado estaba haciendo su parte del trabajo. Y no se espera **nunca** al que va a ganarte el
 * sprint del grupo, que es la regla más vieja y más fría de una fuga.
 */
export function breakWaits(
  gapToPelotonS: number,
  pullShare: number,
  partySize: number,
  esElMejorRematador: boolean,
): boolean {
  if (esElMejorRematador) return false
  if (gapToPelotonS <= STAGE.mishap.waitMinGapS) return false
  return partySize > 0 && pullShare >= 1 / partySize
}
