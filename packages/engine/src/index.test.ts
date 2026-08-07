import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v5: la clásica larga entra en la calibración (relieve anónimo por terreno, coste del banner
    // corregido y recalibración del desgaste para que un monumento no sature la erosión), sobre la
    // v4 (sectores de pavé reales en el recorrido) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(5)
  })
})
