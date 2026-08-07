import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v4: los sectores de pavé reales entran en el recorrido (StageFeatures.cobbles), sobre la
    // v3 (Cambio 0: depósito por estado, erosión activa, controlador liberado, velocidades reales).
    expect(ENGINE_VERSION).toBe(4)
  })
})
