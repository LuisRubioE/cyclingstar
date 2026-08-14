import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    // v21: LA CRIBA QUE DECIDE LA ETAPA, Y LA FUGA QUE SE HUNDE (docs/motor.md §16,
    // docs/balance.md «v21»). El corte del pelotón solo se narraba dentro de los últimos
    // `climbRaceKmToGo` km, y la etapa se decide a veces mucho antes: en Race Great Ocean el grupo
    // de cabeza pasó de 116 a 80 a 50 km de meta y la crónica no dijo una palabra. Ahora hay un
    // evento propio para la criba LEJOS de meta (`peloton_selection`), con un listón que no es de
    // kilómetro sino de MAGNITUD —cuánta gente pierde la cabeza de carrera contra su máximo
    // reciente, y que la sangría haya parado— porque la ventana existía por una razón medida: sin
    // ella cada cota escupía una línea. Si la criba se DESHACE después no se cuenta, y eso lo
    // decide la crónica, que es la única capa que ve la etapa entera. Cambio de OBSERVACIÓN: ni
    // azar nuevo ni física nueva —el evento no consume un solo dado— y las huellas de tiempos de
    // `attribution.test.ts` y `timetrial.test.ts` salen idénticas dígito a dígito.
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
    // v22: LA RAMPA DE META (docs/balance.md «v22») — el motor tenía DOS clasificadores de final y
    // solo uno había aprendido la lección de la rampa corta. El bueno, `deriveFinishTerrain` (v7),
    // mide la última cota, cuánto dura y dónde muere; el otro era `finalStretch.every((b) => b.tipo
    // !== 'subida')`, un `every` en crudo sobre los últimos 2 km del que colgaban la caza de los
    // sprinters, el tirón final de los trenes y el plan de equipo. Un solo bloque de subida en la
    // pancarta lo apagaba todo: al GP de Québec, con 1 km al 3 % en la línea, le dejaba al 1 % del
    // pelotón en el tiempo del ganador y al décimo a 6:23. Ahora la pregunta «¿admite la meta una
    // llegada agrupada?» se la hace al modelo de final (`admitsBunchFinish`) y solo la niega el
    // final en `alto`. Sin física nueva y sin azar nuevo.
    // v23: LA FUGA DEL DÍA A LA QUE NADIE PERSIGUIÓ (docs/balance.md «v23») — `Move.allowed` se
    // decidía una vez, al nacer el movimiento, y no se revisaba jamás: un intento sin cuerda que aun
    // así CUAJABA dejaba al pelotón clavado en `tacticControlCommit` = 0,72, un valor fijo y ciego al
    // boquete, y congelaba la capa táctica (mientras se cierra un hueco no salta nadie). Medido en
    // Race Almeria e1: cuatro intentos en los primeros 19 km, la fuga del día formada en el 19, y ni
    // un `sprinters_chase` ni un intento más en los 190 restantes. Ahora la fuga del día deja de
    // contar como «intento que se está cerrando» y la caza se resuelve con su controlador de
    // siempre. Sin física nueva y sin azar nuevo: dos predicados que además de `allowed` miran
    // `dayBreak`.
    // v24: LA COLOCACIÓN EN EL SPRINT (docs/balance.md «v24») — la foto de meta de una carrera
    // pequeña era la misma todos los días porque el desenlace no tenía carretera: de los cinco
    // favoritos del remate del primer día, 4,63 de 5 seguían siéndolo el último, y todo lo que
    // separaba a dos sprinters era constante durante la semana (el `eff0`, el peaje del trabajo y un
    // tren que se cobraba +5 % siempre y no fallaba jamás) contra 5,7 % de dado por día. Entra
    // `placementSd`: un factor de media 1 que escala con el tamaño del grupo —cero por debajo de
    // `finishBunchMinRiders`, así que el final en alto, el solitario y la crono no se mueven— y que
    // el tren y la táctica reducen. Dado nuevo con subflujo NOMINAL nuevo (`placement`).
    // v25: LA FUGA DEL DIARIO NO ES LA FUGA DE LA CARRETERA (docs/balance.md «v25») — el motor
    // llevaba dos objetos que se llamaban los dos «la fuga» (la lista congelada del kilómetro en que
    // se formó y el grupo que va delante ahora) y lo que cuenta los mezclaba. Cambio de OBSERVACIÓN:
    // el parte de cabeza sigue a la GENTE y no al número, el boquete se mide contra el grueso de la
    // carrera, la captura nombra a los que iban delante en ese momento, `leads` dice «pasa a
    // liderar» y lo que se abre se cierra. Ni un dado, ni un subflujo, ni una constante de
    // calibración: las cuatro huellas selladas salen idénticas.
    // v27: EL DIARIO NECESITA ESPINA DORSAL (docs/balance.md «v27») — el boquete se medía contra el
    // grupo equivocado tras una criba masiva (el MAYOR de detrás es un grupeto de descolgados, y en
    // Race Andalucía la ventaja se midió trece kilómetros contra gente que ya no corría por nada:
    // 6:53 en el km 137 y 16 s en meta). La referencia pasa a ser los que SIGUEN EN CARRERA, el
    // parte de ventaja NOMBRA a quien va delante y dice contra quién se mide y cuánto queda.
    // Cambio de OBSERVACIÓN: ni un dado, ni un subflujo, ni una constante de calibración.
    // v30: un final en alto tiene que SUBIR, no solo medir. 6 etapas de 1.418 dejan de repartir el
    // remate con MON al 0,60 sobre un arrastre del 3%; todas pasan a «puncheur».
    // v29: el pelotón es el grupo que lleva la gente, no el que salió con ese id (mentía en el
    // 22,1 % de las fotos del banco, y en el 21,0 % iba más gente detrás de él que dentro).
    // v28: `chase_work` atribuye la caza POR EQUIPOS —el dueño lo pidió varias veces: «si 3 equipos
    // colaboraron, no tiene sentido que solo 1 de cada aparezca»— y lleva cuántos cazaron de verdad.
    // Sobre la v23 (la fuga del día), la v22 (la rampa de meta), la v21 (la criba lejana), la v18 (la contrarreloj), la v17 (el pelotón no se resigna), la v16 (modelo de persecución), la v15 (plan de equipo), la v14 (abandonos), la v13 (identidad y motivo en el journal), la v12 (selección en pavé y descenso), la
    // v11 (atribución del trabajo), la v10 (composición y caza), la v9 (capa táctica), la
    // v8 (tiempos de grupo), la v7 (modelo de final), la v6 (telemetría), la v5 (clásica larga), la
    // v4 (pavé en el recorrido) y la v3 (Cambio 0).
    expect(ENGINE_VERSION).toBe(30)
  })
})
