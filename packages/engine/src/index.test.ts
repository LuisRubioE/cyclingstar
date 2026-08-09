import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v10: COMPOSICIÓN Y CAZA (docs/balance.md «v10») — una vuelta generada tiene algo que morder
    // (crono también en las cortas y en las llanas, media montaña que muere arriba, última etapa
    // decisiva) y la persecución depende del CAMPO que persigue, no de que exista un sprinter.
    // Sobre la v9 (capa táctica), la v8 (tiempos de grupo), la v7 (modelo de final), la v6
    // (telemetría), la v5 (clásica larga), la v4 (pavé real) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(10)
  })
})
