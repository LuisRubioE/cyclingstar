import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v19: EL ABANICO DE LA CONTRARRELOJ (docs/balance.md «v19»). La ley de velocidad de SPEC 6.4
    // era el DOBLE de inclinada de lo que es en carretera, y se veía en la crono, que es donde se
    // aplica sin rebufo ni grupo: en `race-colombia` e3 (33 km) el nivel 40 rodaba a 37,5 km/h
    // —velocidad de cicloturista— y del primero al último había un 46,4 % contra el 8-15 % real.
    // Dos cosas, las dos de física: (1) la escala 0-100 de un atributo NO es una escala de vatios
    // —un continental modesto no pone el 60 % de los vatios de un especialista, pone el 85 %—, así
    // que entra por una recta con suelo (`p75PowerFloor` = 0,55) en vez de pelada; y (2) el
    // exponente depende del TERRENO: 0,39 en llano, donde manda el aire y la velocidad va como la
    // raíz cúbica de la potencia, y 1,0 subiendo, donde manda la gravedad y va como la potencia
    // entera. Las dos juntas dejan el PUERTO donde estaba (±1 % en todo el rango de niveles) y
    // comprimen el llano a la mitad, que es donde estaba el defecto. Y el orden de salida de la
    // crono desempata la general por PUESTO y no por dorsal (`StageRider.gcRank`, que rellena
    // packages/db con `gcSort.ts`), que es la regla real: «el desempate en una etapa 2 no es por
    // dorsal, es por posición en la etapa 1».
    // v18: LA CONTRARRELOJ (docs/balance.md «v18 — La contrarreloj»). Una crono no tenía ORDEN DE
    // SALIDA: cada corredor acumulaba su tiempo desde cero, nadie salía a una hora, y la etapa
    // entera se contaba con UN evento (`stage_win_itt`). Ahora la rampa la reparte una regla pura y
    // propia (`stage/startOrder.ts`): orden INVERSO de la general cada 2 minutos si es una etapa de
    // vuelta que no es la primera, y por DORSALES cada minuto —agrupando por la última cifra, del
    // más alto al más bajo, así que el dorsal 1 cierra la crono— en la primera etapa y en las
    // carreras de un día. El dorsal viaja al motor desde `packages/db` (`StageRider.bib`), igual que
    // el `gcDeficitSeconds`. De ahí sale el RELOJ DE CARRERA: hora de salida y de llegada, silla del
    // mejor tiempo, dos parciales y ALCANCES —que son narrativa pura, porque alcanzar NO da rebufo—.
    // Sin dado nuevo ni subflujo nuevo: la huella de la crono canónica es la de la v17 dígito a
    // dígito (`stage/timetrial.test.ts`) y los dos invariantes de crono no se mueven.
    // v17: EL PELOTÓN NO SE RESIGNA (docs/balance.md «v17») — corrección de una REGRESIÓN de la v16
    // vista en producción: Race Colombia e5 metió a 126 de 130 corredores a más de 74 minutos (el
    // 22 % del tiempo del ganador contra un objetivo del 8-14 %) con el boquete creciendo +105 s por
    // kilómetro en 47 km de terreno RODADOR. `droppedCommit` decidía resignarse solo por el boquete,
    // y el tamaño entraba únicamente por `1 − 1/n`, que satura: un pelotón entero se rendía igual
    // que un rezagado solo. Vuelve `chaseBackBusFactor` —la salvaguarda de la v12 que la v16 retiró
    // por error— a la decisión de resignarse, cobrada a precio de rebufo, así que ser mayoría paga
    // en el llano y no en la rampa (el grupeto de la reina queda intacto). Con ella, la guarda del
    // «me dejo ir» pasa a predecir con la física real —el grupeto en el que va a caer— en vez de con
    // el `giveUpCommit` que la v16 había dejado sin sentido, y aparece un tope de cuántos pueden
    // sentarse a la vez (en el km 212 se sentaban 73 de golpe). Y el banco crece: `sim/realQueens.ts`
    // mide la cola sobre ocho etapas reina REALES elegidas por forma, con Race Colombia e5 dentro.
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
    // Sobre la v18 (la contrarreloj), la v17 (el pelotón no se resigna), la v16 (modelo de persecución), la v15 (plan de equipo), la v14 (abandonos), la v13 (identidad y motivo en el journal), la v12 (selección en pavé y descenso), la
    // v11 (atribución del trabajo), la v10 (composición y caza), la v9 (capa táctica), la
    // v8 (tiempos de grupo), la v7 (modelo de final), la v6 (telemetría), la v5 (clásica larga), la
    // v4 (pavé en el recorrido) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(20)
  })
})
