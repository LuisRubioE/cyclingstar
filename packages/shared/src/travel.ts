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
  const tier = travelTier(from, to)
  const transport = TRANSPORT_COST[tier]
  // En CASA (misma nación) no hay coste de asistencia individual: ni transporte ni hotel (se duerme
  // en casa / desplazamiento local). Así un corredor sin dinero SIEMPRE puede correr en su país.
  const hotel = tier === 'home' ? 0 : HOTEL_PER_RACE_DAY * Math.max(0, raceDays)
  return { money: transport.money + hotel, days: transport.days }
}

/** Igual, cuando el destino se conoce por continente (carrera regional/continental). */
export function raceAttendanceCostToContinent(
  from: string | null,
  to: Continent | null,
  raceDays: number,
): TravelCost {
  const tier = travelTierByContinent(continentForCountry(from ?? ''), to)
  const transport = TRANSPORT_COST[tier]
  const hotel = tier === 'home' ? 0 : HOTEL_PER_RACE_DAY * Math.max(0, raceDays)
  return { money: transport.money + hotel, days: transport.days }
}

/*
 * ── Vivienda ────────────────────────────────────────────────────────────────────────────────────
 * Un corredor RESIDE en un país. En su propio país vive en casa de la familia: gratis. Al firmar por
 * un equipo se muda al país del equipo (donde entrena con el resto); si ese país no es el suyo, paga
 * ALQUILER semanal. Un equipo puede asumir ese alquiler como extra del contrato (el corredor acepta
 * menos salario a cambio de que le paguen la vivienda). Todo puro: lo usan las ofertas y la nómina.
 */

/** Alquiler semanal de vivienda cuando el corredor reside fuera de su país (la casa familiar es gratis). */
export const HOUSING_RENT_PER_WEEK = 6

/** Coste semanal de vivienda de un corredor de nacionalidad `nationality` que reside en `residence`. */
export function weeklyHousingCost(residence: string | null, nationality: string | null): number {
  if (!residence || !nationality) return 0
  return residence.toUpperCase() === nationality.toUpperCase() ? 0 : HOUSING_RENT_PER_WEEK
}

/**
 * Dónde reside un corredor tras firmar por un equipo: se muda al país del equipo (allí está la base y
 * entrena con el grupo). Si el equipo no tiene país conocido, mantiene su residencia actual.
 */
export function residenceAfterSigning(
  current: string | null,
  teamCountry: string | null,
): string | null {
  return teamCountry ?? current
}

/*
 * ── Decisión de acudir a una carrera (coste/beneficio) ───────────────────────────────────────────
 * Un equipo (bot o humano) solo manda corredores a una carrera si le compensa: el valor esperado
 * (premios, puntos y fama, traducidos a dinero por quien llama) debe cubrir el coste en dinero del
 * viaje. Un agente libre, además, está limitado por su bolsillo: si no le llega, no puede ir. El
 * coste en DÍAS (viaje sin entrenar) lo informa la misma decisión para que el que llama lo aplique.
 */

export interface AttendanceDecision {
  cost: TravelCost
  /** El presupuesto disponible cubre el dinero del viaje. */
  affordable: boolean
  /** El valor esperado de acudir supera el dinero del viaje (net ≥ 0). */
  worthwhile: boolean
  /** Valor esperado − dinero del viaje (margen; negativo = pierde dinero yendo). */
  net: number
}

/**
 * Decide si acudir a una carrera dados el coste del viaje, el presupuesto disponible y el valor
 * esperado (en dinero) de correrla. `worthwhile` = rentable; `affordable` = se lo puede permitir.
 * Un bot va si es rentable y lo puede pagar; un agente libre, además, nunca por encima de su bolsillo.
 * Pura y determinista.
 */
export function attendanceDecision(
  cost: TravelCost,
  budget: number,
  expectedValue: number,
): AttendanceDecision {
  const net = expectedValue - cost.money
  return { cost, affordable: cost.money <= budget, worthwhile: net >= 0, net }
}
