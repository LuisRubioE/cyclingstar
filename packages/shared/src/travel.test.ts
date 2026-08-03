import { describe, expect, it } from 'vitest'
import {
  HOTEL_PER_RACE_DAY,
  TRANSPORT_COST,
  raceAttendanceCost,
  raceAttendanceCostToContinent,
  travelTier,
} from './travel.js'

describe('shared: modelo de viajes (tramos + fijo/variable)', () => {
  it('mismo país no cuesta transporte ni días de viaje', () => {
    expect(travelTier('ES', 'ES')).toBe('home')
    expect(TRANSPORT_COST.home).toEqual({ money: 0, days: 0 })
  })

  it('dentro del continente cuesta menos transporte que entre continentes', () => {
    expect(travelTier('ES', 'FR')).toBe('continental') // Europa → Europa
    expect(travelTier('CO', 'FR')).toBe('intercontinental') // América → Europa
    expect(TRANSPORT_COST.continental.money).toBeLessThan(TRANSPORT_COST.intercontinental.money)
    expect(TRANSPORT_COST.continental.days).toBeLessThan(TRANSPORT_COST.intercontinental.days)
  })

  it('el dinero = transporte fijo del tramo + hotel por día de carrera', () => {
    // Carrera de 5 días dentro del continente: fijo continental + 5·hotel.
    const c = raceAttendanceCost('ES', 'FR', 5)
    expect(c.money).toBe(TRANSPORT_COST.continental.money + 5 * HOTEL_PER_RACE_DAY)
    expect(c.days).toBe(TRANSPORT_COST.continental.days)
    // Más días de carrera → más dinero (hotel), mismos días de viaje.
    const longer = raceAttendanceCost('ES', 'FR', 9)
    expect(longer.money).toBeGreaterThan(c.money)
    expect(longer.days).toBe(c.days)
  })

  it('una carrera de un día en el propio país solo cuesta el hotel de ese día', () => {
    expect(raceAttendanceCost('ES', 'ES', 1)).toEqual({ money: HOTEL_PER_RACE_DAY, days: 0 })
  })

  it('destino por continente: un americano a una carrera de América viaja como continental', () => {
    const near = raceAttendanceCostToContinent('CO', 'America', 6)
    const far = raceAttendanceCostToContinent('CO', 'Europe', 6)
    expect(near.money).toBeLessThan(far.money)
    expect(near.days).toBeLessThan(far.days)
  })
})
