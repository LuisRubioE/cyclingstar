import { type Continent, continentForCountry } from './regions.js'

/**
 * Modelo de viajes (base del sistema de desplazamientos). Un corredor "está" en un país; ir a una
 * carrera cuesta dinero y días de viaje (en los que NO entrena). El coste se modela por TRAMOS de
 * distancia (mismo país / mismo continente / otro continente) en vez de por distancias reales entre
 * ciudades: más simple, sin coordenadas, y suficiente para las decisiones de ir o no ir.
 *
 * Todo aquí es puro y determinista: lo usan tanto la IA de convocatorias (¿le compensa al equipo/
 * corredor viajar a esta carrera?) como la auto-inscripción del agente libre (¿tiene dinero?).
 */

export type TravelTier = 'home' | 'continental' | 'intercontinental'

export interface TravelCost {
  /** Coste en dinero del viaje (misma unidad que el salario/premios del corredor). */
  money: number
  /** Días de viaje: no se entrena ni se compite en ellos (carga de "Travel", sin ganancias). */
  days: number
}

/** Coste por tramo. Un agente libre (ingresos 0) apenas puede salir de su continente. */
export const TRAVEL_COST: Record<TravelTier, TravelCost> = {
  home: { money: 0, days: 0 },
  continental: { money: 40, days: 1 },
  intercontinental: { money: 150, days: 2 },
}

/** Tramo de viaje entre dos países (mismo país → continente → intercontinental). */
export function travelTier(from: string | null, to: string | null): TravelTier {
  if (from && to && from.toUpperCase() === to.toUpperCase()) return 'home'
  return travelTierByContinent(continentForCountry(from ?? ''), continentForCountry(to ?? ''))
}

/** Tramo cuando solo se conoce el continente (p.ej. una carrera etiquetada por región). */
export function travelTierByContinent(
  from: Continent | null,
  to: Continent | null,
): TravelTier {
  if (from && to && from === to) return 'continental'
  return 'intercontinental'
}

/** Coste (dinero + días) de viajar de un país a otro. */
export function travelCost(from: string | null, to: string | null): TravelCost {
  return TRAVEL_COST[travelTier(from, to)]
}

/** Coste cuando el destino se conoce por continente (carrera regional/continental). */
export function travelCostToContinent(
  from: string | null,
  to: Continent | null,
): TravelCost {
  return TRAVEL_COST[travelTierByContinent(continentForCountry(from ?? ''), to)]
}
