import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v16: EL MODELO DE PERSECUCIÓN (docs/motor.md §9, docs/balance.md «v16») — la última deuda de
    // fondo del motor. El tiempo de un grupo descolgado dejaba de ser física en dos líneas: un
    // RECORTE FIJO de 8 s/km que le devolvía el boquete pasara lo que pasara y un TOPE que le
    // clavaba el reloj del pelotón si iba más rápido. Ahora su ritmo sale de `droppedCommit`:
    // relevarse reparte el viento (1/n del tiempo en cabeza), eso vale lo que valga el rebufo del
    // terreno —en la subida, casi nada— y primero se PELEA por volver y luego uno se resigna. Con
    // él, un puerto de tempo lejos de meta deja de descuajaringar el pelotón (`climbTempoSelection`)
    // y los descolgados dejan de ser invisibles para las caídas. El último grupo de una etapa reina
    // de gran vuelta pasa de entrar al 2 % del tiempo del ganador a entrar al 9 %, que es lo que
    // hace el grupeto en carretera, y con ello el corte de tiempo por fin señala a alguien.
    // v15: EL PLAN DE EQUIPO (docs/motor.md §V.1, docs/balance.md «v15») — la última pieza del plan
    // del motor. `StageRider` trae por fin `teamId` (nulo = agente libre, que corre solo) y con él
    // cada equipo tiene una INTENCIÓN —perseguir, lanzar, controlar, proteger, defender al hombre
    // que ya tiene delante o esconderse— y un PRESUPUESTO de esfuerzo que se agota: el que lleva
    // ~80 km al frente se funde y otro toma el relevo. Lo consultan el turno de relevos, la caza
    // (que deja de ser un escalar de etapa) y la capa de ataques. Las individualidades mandan sobre
    // el plan: el que desobedece (§VI.2) queda fuera de él. Entran además los dos estados de rebufo
    // que llevaban muertos desde el Paso 21 —`shelterAlone` y `shelterWorking`— y se re-ancla §VI.1
    // sobre la etapa reina REAL en vez de sobre la sintética de 1.200 m.
    // v14: ABANDONOS (docs/motor.md §15 y §VI.3, docs/balance.md «v14»). `StageResult.estado`
    // contemplaba `'abandon' | 'dnf'` desde el Paso 21 y el motor no había emitido jamás otra cosa
    // que `'finish'`: los 176 que salían eran los 176 que acababan. Ahora hay dos abandonos DENTRO
    // de la etapa —el COLAPSO (tanque a cero, lejos de meta, sostenido y ya camino del corte) y el
    // FUERA DE CONTROL (llegar más allá del 8 % en llana / 18 % en la reina)— con las dos
    // salvaguardas de §VI.3: el corte se mide contra el GRUPO y como mucho se va un 4 % del pelotón
    // en una etapa, readmitiendo con penalización lo que no cabe. El azar nuevo sale de un subflujo
    // NOMINAL propio (`abandon`), así que una etapa sin abandonos sale dígito a dígito igual que en
    // la v13 y la huella de `attribution.test.ts` no se mueve.
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
    // Sobre la v15 (plan de equipo), la v14 (abandonos), la v13 (identidad y motivo en el journal), la v12 (selección en pavé y descenso), la
    // v11 (atribución del trabajo), la v10 (composición y caza), la v9 (capa táctica), la
    // v8 (tiempos de grupo), la v7 (modelo de final), la v6 (telemetría), la v5 (clásica larga), la
    // v4 (pavé en el recorrido) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(16)
  })
})
