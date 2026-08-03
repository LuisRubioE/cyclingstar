import { describe, expect, it } from 'vitest'
import { gcPointsByClass, gcResultPoints, stagePointsByClass, stageResultPoints } from './points.js'

describe('engine: puntos de ranking (SPEC, Paso 40)', () => {
  it('el ganador puntúa más que el resto y decrece con el puesto', () => {
    expect(stageResultPoints('WT', 0)).toBeGreaterThan(stageResultPoints('WT', 1))
    expect(gcResultPoints('WT', 0)).toBeGreaterThan(gcResultPoints('WT', 4))
  })

  it('fuera del top no da puntos', () => {
    expect(stageResultPoints('WT', 50)).toBe(0)
    expect(gcResultPoints('WT', 50)).toBe(0)
  })

  it('el nivel escala los puntos (WT > PRS > CON)', () => {
    expect(gcResultPoints('WT', 0)).toBeGreaterThan(gcResultPoints('PRS', 0))
    expect(gcResultPoints('PRS', 0)).toBeGreaterThan(gcResultPoints('CON', 0))
  })

  it('la general pesa más que una etapa', () => {
    expect(gcResultPoints('WT', 0)).toBeGreaterThan(stageResultPoints('WT', 0))
  })

  it('la clase escala los puntos (.WT > .Pro > .1 > .2) y conserva los pesos históricos', () => {
    expect(gcPointsByClass('WT', 0)).toBeGreaterThan(gcPointsByClass('Pro', 0))
    expect(gcPointsByClass('Pro', 0)).toBeGreaterThan(gcPointsByClass('1', 0))
    expect(gcPointsByClass('1', 0)).toBeGreaterThan(gcPointsByClass('2', 0))
    // .WT/.Pro/.1 = WT/PRS/CON de siempre (sin romper rankings existentes).
    expect(gcPointsByClass('WT', 0)).toBe(gcResultPoints('WT', 0))
    expect(gcPointsByClass('Pro', 0)).toBe(gcResultPoints('PRS', 0))
    expect(gcPointsByClass('1', 0)).toBe(gcResultPoints('CON', 0))
    expect(stagePointsByClass('WT', 0)).toBe(stageResultPoints('WT', 0))
  })

  it('el campeonato nacional (.NC) pesa por encima de una .1', () => {
    expect(gcPointsByClass('NC', 0)).toBeGreaterThan(gcPointsByClass('1', 0))
    expect(stagePointsByClass('NC', 0)).toBeGreaterThan(stagePointsByClass('1', 0))
  })
})
