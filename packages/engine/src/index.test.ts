import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v3: Cambio 0 (depósito por estado, erosión activa, controlador liberado, velocidades reales)
    // sobre la v2 (relevos por rol, marcaje unificado, ruido de sprint único).
    expect(ENGINE_VERSION).toBe(3)
  })
})
