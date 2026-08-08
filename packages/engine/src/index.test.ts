import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v7: MODELO DE FINAL (docs/motor.md §12) — el orden dentro de un grupo deja de decidirlo un
    // solo atributo, el tipo de final se deriva del recorrido y del tamaño del grupo, el trabajo
    // del día se cobra en el remate y los banners se disputan con la erosión del momento. Sobre la
    // v6 (telemetría), la v5 (clásica larga), la v4 (pavé real) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(7)
  })
})
