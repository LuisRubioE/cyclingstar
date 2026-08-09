import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v9: LA CAPA TÁCTICA (docs/motor.md §13) — existen los ataques. La fuga del día emerge del
    // primer intento de movimiento al que el pelotón da cuerda en vez de componerse antes del km 0,
    // y por delante puede haber a la vez una fuga, un contraataque y un puente que no llega. Sobre
    // la v8 (tiempos de grupo), la v7 (modelo de final), la v6 (telemetría), la v5 (clásica larga),
    // la v4 (pavé real) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(9)
  })
})
