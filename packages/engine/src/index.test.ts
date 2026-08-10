import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v13: LO QUE EL JOURNAL CUENTA (docs/motor.md §16, docs/balance.md «v13»). Tres cambios de
    // comportamiento, todos de lo que el motor CUENTA y cuándo lo cuenta, ninguno con azar nuevo:
    // un corredor solo puede dejarse ir UNA vez (se descolgaba tres veces en la misma carrera), la
    // fuga solo se «concede» con recorrido hecho y ventaja de verdad (se concedía en el km 10 y se
    // cazaba en el 126), el liderato de la montaña solo se canta si es estricto (tres corredores
    // con un punto se proclamaban líderes) y el parte de «quién tira» sale también cuando no cuaja
    // ninguna fuga —y dice PARA QUIÉN se tira—. La huella de tiempos de `attribution.test.ts` sale
    // idéntica: ver allí por qué.
    // v12: SELECCIÓN EN PAVÉ Y DESCENSO (docs/motor.md §14, docs/balance.md «v12») — `shatter()`
    // deja de actuar solo en subida: el mismo mecanismo descuelga en el adoquín (con PAV y escalado
    // por las estrellas del sector) y, mucho más suave, en las bajadas de verdad (con DES). Con él,
    // el sector se corre en vez de rodarse, dentro del sector no hay reenganche, y la puerta del
    // pelotón se cierra según lo que aprieta. Entra Strade Bianche.
    // Sobre la v12 (selección en pavé y descenso), la v11 (atribución del trabajo), la v10 (composición y caza), la v9 (capa táctica), la
    // v8 (tiempos de grupo), la v7 (modelo de final), la v6 (telemetría), la v5 (clásica larga), la
    // v4 (pavé en el recorrido) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(13)
  })
})
