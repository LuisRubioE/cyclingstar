import { describe, expect, it } from 'vitest'
import { TRAVEL_COST, travelCost, travelCostToContinent, travelTier } from './travel.js'

describe('shared: modelo de viajes (tramos de distancia)', () => {
  it('mismo país no cuesta ni dinero ni días', () => {
    expect(travelTier('ES', 'ES')).toBe('home')
    expect(travelCost('ES', 'ES')).toEqual({ money: 0, days: 0 })
  })

  it('dentro del continente cuesta menos que entre continentes', () => {
    expect(travelTier('ES', 'FR')).toBe('continental') // Europa → Europa
    expect(travelTier('CO', 'FR')).toBe('intercontinental') // América → Europa
    expect(travelCost('ES', 'FR').money).toBeLessThan(travelCost('CO', 'FR').money)
    expect(travelCost('ES', 'FR').days).toBeLessThanOrEqual(travelCost('CO', 'FR').days)
  })

  it('el coste crece con la distancia (home < continental < intercontinental)', () => {
    expect(TRAVEL_COST.home.money).toBeLessThan(TRAVEL_COST.continental.money)
    expect(TRAVEL_COST.continental.money).toBeLessThan(TRAVEL_COST.intercontinental.money)
    expect(TRAVEL_COST.home.days).toBeLessThanOrEqual(TRAVEL_COST.continental.days)
    expect(TRAVEL_COST.continental.days).toBeLessThan(TRAVEL_COST.intercontinental.days)
  })

  it('destino por continente: un americano a una carrera de América viaja barato', () => {
    expect(travelCostToContinent('CO', 'America').money).toBe(TRAVEL_COST.continental.money)
    expect(travelCostToContinent('CO', 'Europe').money).toBe(TRAVEL_COST.intercontinental.money)
  })

  it('país desconocido se trata como intercontinental (peor caso)', () => {
    expect(travelTier(null, 'ES')).toBe('intercontinental')
  })
})
