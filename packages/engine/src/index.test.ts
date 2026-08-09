import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v8: TIEMPOS DE GRUPO Y CRÓNICA DE LA CRIBA — todos los de un grupo reciben el MISMO tiempo
    // (el desempate de 1 ms por puesto partía el grupo al redondear), la criba se narra por lo que
    // el grupo pierde de verdad y en pocas frases de progresión, y nace el evento de
    // reagrupamiento. Sobre la v7 (modelo de final), la v6 (telemetría), la v5 (clásica larga),
    // la v4 (pavé real) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(8)
  })
})
