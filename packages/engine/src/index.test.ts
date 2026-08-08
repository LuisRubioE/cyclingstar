import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v6: telemetría de la carrera (corte acumulado, boquete del grupo de cabeza, parte de quién va
    // delante), el puerto decisivo deja de ser toda la etapa en un final en alto y la erosión gana
    // su techo estructural, sobre la v5 (clásica larga en la calibración), la v4 (pavé real) y la
    // v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(6)
  })
})
