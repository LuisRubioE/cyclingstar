import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v11: ATRIBUCIÓN DEL TRABAJO (docs/balance.md «v11») — el motor cuenta quién da la cara al
    // viento en cada bloque y de ahí salen `peloton_pull` (quién tira del pelotón), `chase_work`
    // (quién hizo el trabajo para cerrar) y `break_share` (quién colabora en la fuga). No mueve
    // ningún tiempo: es observación, y `stage/attribution.test.ts` lo sella.
    // Sobre la v10 (composición y caza), la v9 (capa táctica), la v8 (tiempos de grupo), la v7
    // (modelo de final), la v6 (telemetría), la v5 (clásica larga), la v4 (pavé) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(11)
  })
})
