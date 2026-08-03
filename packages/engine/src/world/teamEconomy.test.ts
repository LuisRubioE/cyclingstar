import { describe, expect, it } from 'vitest'
import { AVG_WEEKLY_WAGE, SPONSOR_INCOME_PER_WEEK, npcWageBill } from './teamEconomy.js'

describe('engine: economía del equipo (patrocinio, salarios)', () => {
  it('el patrocinio escala con la división (WT > Pro > Continental)', () => {
    expect(SPONSOR_INCOME_PER_WEEK.WT).toBeGreaterThan(SPONSOR_INCOME_PER_WEEK.PRS)
    expect(SPONSOR_INCOME_PER_WEEK.PRS).toBeGreaterThan(SPONSOR_INCOME_PER_WEEK.CON)
  })

  it('el salario medio también escala con la división', () => {
    expect(AVG_WEEKLY_WAGE.WT).toBeGreaterThan(AVG_WEEKLY_WAGE.PRS)
    expect(AVG_WEEKLY_WAGE.PRS).toBeGreaterThan(AVG_WEEKLY_WAGE.CON)
  })

  it('la masa salarial de NPCs es el salario medio por el tamaño de la plantilla', () => {
    expect(npcWageBill('WT', 28)).toBe(AVG_WEEKLY_WAGE.WT * 28)
    expect(npcWageBill('CON', 0)).toBe(0)
    expect(npcWageBill('CON', -5)).toBe(0) // nunca negativa
  })

  it('el patrocinio cubre a grandes rasgos una plantilla completa (presupuesto estable)', () => {
    // El ingreso semanal debe rondar la masa salarial de una plantilla objetivo, con margen para viajes.
    expect(SPONSOR_INCOME_PER_WEEK.WT).toBeGreaterThanOrEqual(npcWageBill('WT', 28))
    expect(SPONSOR_INCOME_PER_WEEK.PRS).toBeGreaterThanOrEqual(npcWageBill('PRS', 20))
    expect(SPONSOR_INCOME_PER_WEEK.CON).toBeGreaterThanOrEqual(npcWageBill('CON', 12))
  })
})
