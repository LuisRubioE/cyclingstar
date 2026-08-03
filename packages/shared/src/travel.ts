import { type Continent, continentForCountry } from './regions.js'

/**
 * Modelo de viajes (base del sistema de desplazamientos). Un corredor "está" en un país; ir a una
 * carrera cuesta dinero y días de viaje (en los que NO entrena). El coste se modela por TRAMOS de
 * distancia (mismo país / mismo continente / otro continente) en vez de por distancias reales entre
 * ciudades: más simple, sin coordenadas, y suficiente para las decisiones de ir o no ir.
 *
 * El dinero tiene dos partes (como en la realidad):
 *  - FIJA de transporte: mover al corredor y su material (bicis, etc.) según la distancia (tramo).
 *  - VARIABLE por día de carrera: hotel e infraestructura, proporcional a la duración de la carrera.
 *
 * Quién paga el dinero se decide al cablearlo, no aquí: si el corredor tiene equipo, lo paga el
 * EQUIPO; el coste en DÍAS (viaje sin entrenar) siempre lo "paga" el corredor. Un agente libre paga
 * su propio dinero y, si no le llega, no puede ir.
 *
 * Todo aquí es puro y determinista: lo usan la IA de convocatorias y la auto-inscripción del libre.
 */

export type TravelTier = 'home' | 'continental' | 'intercontinental'

export interface TravelCost {
  /** Coste en dinero (misma unidad que salario/premios): transporte fijo + hotel por día de carrera. */
  money: number
  /** Días de viaje: no se entrena ni se compite en ellos (carga de "Travel", sin ganancias). */
  days: number
}

/** Parte FIJA de transporte por tramo (corredor + material). Días de viaje del propio desplazamiento. */
export const TRANSPORT_COST: Record<TravelTier, TravelCost> = {
  home: { money: 0, days: 0 },
  continental: { money: 40, days: 1 },
  intercontinental: { money: 150, days: 2 },
}

/** Parte VARIABLE: hotel e infraestructura por cada día de carrera. */
export const HOTEL_PER_RACE_DAY = 8

/** Tramo de viaje entre dos países (mismo país → continente → intercontinental). */
export function travelTier(from: string | null, to: string | null): TravelTier {
  if (from && to && from.toUpperCase() === to.toUpperCase()) return 'home'
  return travelTierByContinent(continentForCountry(from ?? ''), continentForCountry(to ?? ''))
}

/** Tramo cuando solo se conoce el continente destino (p.ej. una carrera etiquetada por región). */
export function travelTierByContinent(from: Continent | null, to: Continent | null): TravelTier {
  if (from && to && from === to) return 'continental'
  return 'intercontinental'
}

/**
 * Coste (dinero + días) de que un corredor de `from` acuda a una carrera en `to` de `raceDays` días.
 * money = transporte fijo del tramo + hotel·raceDays. days = días de viaje del tramo.
 */
export function raceAttendanceCost(
  from: string | null,
  to: string | null,
  raceDays: number,
): TravelCost {
  const transport = TRANSPORT_COST[travelTier(from, to)]
  return {
    money: transport.money + HOTEL_PER_RACE_DAY * Math.max(0, raceDays),
    days: transport.days,
  }
}

/** Igual, cuando el destino se conoce por continente (carrera regional/continental). */
export function raceAttendanceCostToContinent(
  from: string | null,
  to: Continent | null,
  raceDays: number,
): TravelCost {
  const transport = TRANSPORT_COST[travelTierByContinent(continentForCountry(from ?? ''), to)]
  return {
    money: transport.money + HOTEL_PER_RACE_DAY * Math.max(0, raceDays),
    days: transport.days,
  }
}
