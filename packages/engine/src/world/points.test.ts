import { describe, expect, it } from 'vitest'
import { gcResultPoints, stageResultPoints } from './points.js'

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
})
