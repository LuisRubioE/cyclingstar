# Esqueleto de `docs/retransmision.md` (E2 · La retransmisión)

Este fichero es la ley de los redactores de la fase 3b. Cada sección del documento final la escribe un redactor distinto y en paralelo; lo único que impide que se contradigan son cuatro ficheros que se leen juntos: el vocabulario ÚNICO (`borrador/00-glosario.md`, con sus apartados `§G.n`), las decisiones cerradas (`borrador/00-decisiones.md`, de `D-01` a `D-62` y de `DD-01` a `DD-20`), la consolidación de los juicios (`juicios/veredicto.json`: injertos `I-nn`, objeciones `O-nn`, huecos `H-nn` y contradicciones de hecho `X-nn`) y este esqueleto: el resumen que abre el documento (§A), el índice con lo que cada sección tiene que contener (§B), los lotes (§C), las tablas de trazabilidad (§D) y lo que el esqueleto fija por su cuenta (§E).

Base: `propuestas/ingeniero.md`, elegida por suma de puntuaciones porque no hubo mayoría (un voto cada una para `producto`, `estado` e `ingeniero`): ingeniero 92,5 (33 del juez de cobertura, 30,5 del juez del motor, 29 del juez de ejecutabilidad), estado 91, producto 89,5, television 89,5 y datos 87 (el cálculo está en `veredicto.json` → `ganadora`). El documento es una fusión y lo dice: de `ingeniero`, el plan PR a PR con interruptores y marcha atrás, la voz por truncado y el horizonte en un solo punto; de `estado`, el modelo de estado, el reductor, el corte diagonal, la sonda `onEvent` y los invariantes; de `producto`, la propiedad sin destripe entera (horizonte, velo, bancos B1b y B1c, sesión de 7 días y cookie de espectador, fugas fuera de las 48) y la curva de ritmo; de `datos`, la codificación `bytea` con gzip, la visibilidad por dato y `news` con semilla y datos; de `television`, la gramática UCI, los rótulos, el gancho `onBanner`, la previa y el cierre. Son 49 injertos, 32 objeciones, 23 huecos y 24 contradicciones de hecho, todos con destino en §D.

### Reglas de redacción comunes (repetidas aquí porque cada redactor solo ve su lote)

1. Castellano, en el registro de `docs/generador.md` y `docs/tactica.md`: denso, argumentado, sin relleno ni marketing, con tablas donde haya que comparar. La interfaz va en inglés (regla de `Claude.md`): todo texto de pantalla se escribe en inglés entre comillas invertidas y se marca «(pantalla)» la primera vez que aparece en cada subsección.
2. Nada de rayas ni guiones en medio de una frase: ni la raya larga, ni la media, ni un guion suelto entre dos espacios (`00-encargo.md` §4, regla 3). Se usan comas, paréntesis, dos puntos o punto. Las listas empiezan con un guion o con «1.» al principio de la línea y SIN sangría (una viñeta sangrada cuenta como guion entre espacios para el verificador). Los rangos se escriben sin espacios (`3-196 m`) o «de 3 a 196 m».
3. Toda afirmación sobre el código cita fichero y líneas contra HEAD `9c21885`, el de los juicios y las decisiones. Si el redactor lee otro HEAD y las líneas se movieron, cita las nuevas y lo dice una vez al principio de su sección. Nada inventado: si no se sabe, «no lo sé» o «no está en el código».
4. Toda cifra dice si es medida (quién, con qué script y sobre qué etapas: «juez del motor, C7», «`estado.md` §3.6», «ejecutabilidad §2.1, `juez-ejec/ritmo.mjs`») o estimada (y de qué). Lo que un redactor mida de nuevo se mide en el scratchpad con un script nombrado; nunca se edita un fichero del repositorio fuera de `docs/diseno/e2-retransmision/borrador/`.
5. Nombres: solo los del glosario, con su forma exacta. Un alias de una propuesta (tabla §G.13) solo aparece en el apéndice A. Si falta un nombre, el redactor lo propone al final de su sección (bloque «Propuesto para el glosario») y no renombra nada de lo que ya existe.
6. Decisiones: las de `00-decisiones.md` se escriben como hechos, con su evidencia, sin reabrirlas. Lo que este esqueleto deja abierto se decide en un bloque «Decisión tomada aquí». Si un redactor comprueba que una decisión es falsa contra el código, no la cambia por su cuenta: la escribe como está y abre una «Duda para el ensamblador» con la evidencia (irá a `borrador/dudas.md` y a la refutación).
7. Tipos: TypeScript estricto, sin `any`, Zod en los bordes. §4 es el ÚNICO sitio con los bloques enteros de §G.3 del glosario; las demás secciones los citan por `§4.m` y pueden enseñar valores de ejemplo, nunca redefinir un tipo ni añadirle un campo (si le falta uno, lo propone).
8. Constantes: por nombre (`BROADCAST.pace`), con su valor la primera vez que salen en la sección. §15 es el único sitio con los tres bloques enteros.
9. Versión y migraciones: `ENGINE_VERSION` es 89 (`packages/engine/src/constants.ts` l. 838) y NO sube en E2 (D-09); ninguna sección propone subirla. La próxima migración libre es la `0046` (`packages/db/drizzle/meta/_journal.json`: 43 entradas, la última `0042_transicion_e1`).
10. Citas del dueño: textuales, entre «», con fichero, línea y versión (`docs/balance.md` l. 1845-1846, v13). Nada va entre «» si no es cita.
11. Decisiones del dueño: con su id (`DD-nn`) y su valor por defecto, que es el que se implementa. Si una sección encuentra otra decisión que es del dueño, la toma con un valor por defecto en «Decisión tomada aquí», marcada «(del dueño)», y el ensamblador la sube a §20.
12. Cada decisión, tomada; cada tipo, escrito; cada constante, con valor e intención; cada paso del plan, con sus tests antes que su código. Nada «se podría».
13. Quien implemente será un agente que no tiene a quién preguntar (`00-encargo.md` §1): el texto se escribe contando con eso.
14. Identificadores: en el documento, las 48 superficies del mapa 03 y las nueve puertas de fuera se escriben con prefijo (`sup. C6`, `sup. X1`; §G.12), para no confundirlas con los encargos (E1 a E13), los invariantes (`I1`) ni los bancos (`B1`). En este esqueleto van sin prefijo por brevedad.

### Formato de cada fichero de sección

- La primera línea es `## N. Título`, con el título de §B. El fichero `00-cabecera.md` empieza con el título del documento, `# La retransmisión: el estado de la carrera, a su hora y sin destripe (diseño final)`, y sigue con `## 0. Cabecera y resumen ejecutivo`.
- Las subsecciones son `### N.m Título`, en el orden y con la numeración de los puntos de «Contiene» de §B, para que las referencias cruzadas `§N.m` entre lotes valgan. Se pueden añadir subsecciones al final; las fijadas no se renumeran ni se funden.
- Longitud: la de §B, con un margen de un 15 % arriba o abajo.
- Al final del fichero, tras una línea `---`, los bloques de cierre, en este orden y con estas etiquetas: **Injertos aplicados** (`I-nn` con la subsección donde cayó: `I-01 (§3.3)`), **Objeciones resueltas** (`O-nn (§N.m)`), **Huecos rellenados** (`H-nn (§N.m)`), **Decisión tomada aquí** (numeradas `N-a`, `N-b`: qué, por qué y qué se descarta; o «ninguna»), **Propuesto para el glosario** (nombre, definición de una línea y fichero; o «nada») y **Dudas para el ensamblador** (o «ninguna»). Todo injerto, objeción y hueco que §B asigna a la sección aparece en su bloque; si uno no se pudo aplicar, se dice por qué.
- Informe final de cada redactor: 12 líneas como máximo (ficheros, líneas, decisiones tomadas aquí, lo que no pudo comprobar).

---

## A. Resumen ejecutivo provisional

Es el que abre el documento (§0.4): el redactor de la cabecera lo escribe con estas diez ideas, en este orden y sin añadir otras. Las cifras son las de `00-decisiones.md`.

1. **La retransmisión es un estado grabado.** El motor ya mira cada bloque de 100 m con la sonda; E2 guarda por observación, en la tabla nueva `stage_timelines` (`bytea` con gzip 9: de 8 a 23 KB por etapa en línea, mediana 17,5 KB, medido por `datos`), una línea temporal con catálogo de grupos, fotos clave cada 10 km, sucesos de estado por bloque y sucesos narrables con su hora de revelado. La pantalla la reduce con un reductor puro que reproduce la foto del motor en las 3.246 fotos de km medidas (I1: 0 discrepancias, medido por `estado`).
2. **El reloj es un eje, no un instante.** Todos los relojes son segundos desde la salida común, pero un corredor no lo recorre de forma continua (puede saltar 138 s en un bloque, C4): el espacio es canónico, el instante es un corte diagonal causal, el hueco que se enseña es la resta de dos grupos en el mismo bloque, y el defecto del motor se tolera en pantalla y se anota para el dueño.
3. **Observar no cambia la carrera.** `ENGINE_VERSION` no sube: tres ganchos opcionales de la sonda (`onEvent`, `onBanner`, `onTimeTrialRide`) y un colector aparte que deja a la radio y al aprendizaje ver exactamente las fotos de hoy (B10 y B11; 20 de 20 etapas idénticas, medido por el juez del motor). Solo el paso 4 toca `packages/engine`, y toda subida futura de versión va detrás del paso 17d de la táctica.
4. **La pantalla es televisión.** Capa fija permanente (km a meta y diferencia principal con su tendencia), barra de grupos con un solo vocabulario (`Lead group`, `Chase group`, `Bunch`, `Gruppetto` y los grupos del maillot, pantalla), perfil con un cursor por grupo, cola de rótulos por clase que nunca frena la carrera, y previa y cierre como en la señal de la UCI.
5. **«Cuando se escapan cinco, que se vean sus maillots».** La regla UCI del maillot llevado (líder, delegado, campeón de su disciplina y su categoría, equipo), los campeones leídos de `palmares` (que no existen hasta el día 179 de la temporada 0 tras el reinicio), la notoriedad sin `fame` y la frase de la fuga que nombra a dos y siempre al corredor propio; la interfaz que E2 pide a E3 y E12, escrita.
6. **El ritmo depende del recorrido.** La curva de `producto` sin pausas: de 7:39 una llana a 19:59 la reina más larga, de 2:12 a 6:37 en `Highlights` (medido por el juez de ejecutabilidad). Seguir una gran vuelta cuesta de 28 a 49 min por día real, y por eso el modo por defecto es decisión del dueño (DD-03).
7. **Sin destripe es una propiedad del producto.** Un horizonte por espectador calculado en el servidor en un solo punto (tipo obligatorio, predicado SQL único y un registro de rutas que no arranca si una no declara su política); lo visto es un prefijo y cuenta lo alcanzado, nunca lo servido; carreras en guardia con caducidad de 56 días de juego; la cookie `cs_viewer` que solo restringe; y las 48 superficies del mapa 03 más nueve puertas de fuera, una a una, vigiladas por el canario B1.
8. **La voz no ve el futuro y las noticias se renderizan al leer.** La voz trunca la entrada de `buildChronicle` por hora de revelado, con la longitud de la etapa como dato y cinco pasadas retroactivas apagadas (la voz en `t` es prefijo de la de `t + 30 s`: 0 violaciones en 15 corridas, medido por `ingeniero`); el acta es la de hoy; `news` guarda `seed` y `data` en la primera migración, antes del reinicio, y así E10 puede traducirla.
9. **Nada rompe la web de hoy.** La ruta de etapa sigue devolviendo `StageReplay`, `/api/news` sigue mandando `text`, las cuatro migraciones solo añaden (de la `0046` a la `0049`), las constantes de pantalla viven en `packages/shared` (tocarlas no corre los bancos) y todo se apaga sin desplegar con `BROADCAST_WATCH`, `SPOILER_MODE` y `TIMELINE_RECORD`.
10. **Trece pasos y unos 22 PR, tests primero.** El dueño ve `Watch` sobre la radio de hoy en el paso 3; el destripe queda cerrado en el 8b con B1 en verde; se enciende al cerrar el 10 con la prueba de lectura (nueve de nueve); 20 decisiones son del dueño, cada una con su valor por defecto.

---

## B. El índice del documento

Veintidós secciones (la 0 es la cabecera), en el orden final. Longitud objetivo total: 10.860 líneas, del orden de `docs/tactica.md` (8.646) y `docs/generador.md` (11.121). Cada entrada dice: título, fichero, líneas objetivo y lote; qué contiene (cada punto numerado es una subsección `### N.m`); qué escribe entero; de qué secciones de qué propuestas, mapas y juicios sale; las decisiones que escribe como hechos; los injertos que recibe, las objeciones que resuelve, los huecos que rellena y las contradicciones de hecho que deja resueltas, por id; y lo que toca del dueño.

| §   | Título                                                                   | Fichero                      | Líneas     | Lote |
| --- | ------------------------------------------------------------------------ | ---------------------------- | ---------- | ---- |
| §0  | Cabecera y resumen ejecutivo                                             | `borrador/00-cabecera.md`    | 180        | L10  |
| §1  | Diagnóstico medido: lo que el jugador lee hoy de una carrera             | `borrador/01-diagnostico.md` | 380        | L1   |
| §2  | Principios                                                               | `borrador/02-principios.md`  | 150        | L1   |
| §3  | El reloj, el espacio y la identidad                                      | `borrador/03-reloj.md`       | 400        | L1   |
| §4  | El modelo de tipos: la línea temporal, el instante y la red              | `borrador/04-modelo.md`      | 900        | L2   |
| §5  | Lo que el motor guarda al correr la etapa: sonda, codificación y tamaños | `borrador/05-motor.md`       | 560        | L3   |
| §6  | El estado en pantalla: lo permanente y lo eventual                       | `borrador/06-pantalla.md`    | 620        | L4   |
| §7  | Los rótulos y la regla de maillots                                       | `borrador/07-rotulos.md`     | 540        | L5   |
| §8  | El ritmo y el montaje                                                    | `borrador/08-ritmo.md`       | 540        | L4   |
| §9  | La contrarreloj                                                          | `borrador/09-crono.md`       | 380        | L5   |
| §10 | Sin destripe (I): lo visto, el horizonte y el velo                       | `borrador/10-horizonte.md`   | 620        | L6   |
| §11 | Sin destripe (II): cada superficie, una a una                            | `borrador/11-superficies.md` | 820        | L7   |
| §12 | La voz, el acta y las noticias                                           | `borrador/12-voz.md`         | 620        | L8   |
| §13 | El esquema y las migraciones                                             | `borrador/13-esquema.md`     | 420        | L3   |
| §14 | La API y el contrato                                                     | `borrador/14-api.md`         | 540        | L6   |
| §15 | Las constantes                                                           | `borrador/15-constantes.md`  | 330        | L2   |
| §16 | Los bancos y los tests                                                   | `borrador/16-bancos.md`      | 640        | L8   |
| §17 | El plan por pasos, tests primero                                         | `borrador/17-plan.md`        | 800        | L9   |
| §18 | Rendimiento y móvil                                                      | `borrador/18-rendimiento.md` | 280        | L7   |
| §19 | Riesgos y fronteras                                                      | `borrador/19-riesgos.md`     | 280        | L9   |
| §20 | Decisiones que son del dueño                                             | `borrador/20-dueno.md`       | 220        | L10  |
| §21 | Apéndices: injertos, objeciones, cobertura y vocabulario                 | `borrador/21-apendices.md`   | 640        | L10  |
|     | **Total**                                                                |                              | **10.860** |      |

### §0 · Cabecera y resumen ejecutivo

`borrador/00-cabecera.md` · 180 líneas · lote L10

**Contiene:**

1. **0.1 Encargo, estado y versión del código.** El encargo literal (`docs/encargos.md` l. 134-162) y su porqué (`docs/agenda.md` l. 500-535, la fila D13 en l. 1392 y la Oleada 1 en l. 1431-1460); fichero y tamaño esperado; estado («diseño escrito, sin implementar»); el árbol de referencia (HEAD `9c21885`, `ENGINE_VERSION` 89 que E2 no sube, última migración `0042_transicion_e1`); la regla de arranque (no se toca código hasta que el dueño lo apruebe).
2. **0.2 Método y base.** Siete mapas, cinco propuestas, tres jueces, síntesis por lotes y las fases 4 a 7 (`04-fase-refutacion.md`); la base por suma de puntuaciones, con el cálculo entero y la nota de `veredicto.json` (el juez de cobertura eligió `producto` aunque dio más puntos a `ingeniero`; sumadas por eje, gana cada una en uno distinto), y la fusión: una línea por propuesta con lo que aporta (`veredicto.json` → `ganadora.fusion`). Deja al final una línea `Procedencia:` con los recuentos de la síntesis (7 mapas, 5 propuestas, 3 jueces, base, 49 injertos, 32 objeciones, 23 huecos, 24 contradicciones, 62 decisiones, 20 del dueño), que el cierre de la fase 6 completa con los de la refutación.
3. **0.3 Cómo leer.** Citas del dueño entre «» con fichero, línea y versión; medido frente a estimado; `(pantalla)`; los ids `DD-nn` y dónde están (§20); las comprobaciones del juez del motor (`C1` a `C18`); qué es un injerto, una objeción, un hueco y una contradicción de hecho, y dónde se rastrean (§21); qué NO es este documento (la implementación).
4. **0.4 Qué cambia respecto de hoy, en diez líneas.** Las diez ideas de §A de este esqueleto, en ese orden.
5. **0.5 Mapa del documento.** Una línea por sección con lo que el lector encuentra en ella.
6. **0.6 Nombres que chocan.** E1 a E13 son encargos de `docs/encargos.md`, no los EPIC de `docs/epics.md`; «radio» es la pestaña `Race Radio` (pantalla), no la radio de equipo en vivo; «journal», «crónica», «diario» y `Story` pasan a ser «la voz» y «el acta» (D-48; mapa 05 §6, contradicciones 8 y 13).

**Escribe entero:** la tabla de puntuaciones por juez y eje (de `veredicto.json` → `juicios`) y el mapa del documento.

**Sale de:** `00-encargo.md` §1; `docs/encargos.md` l. 134-162; `docs/agenda.md` l. 500-535, 1392 y 1431-1460; `juicios/veredicto.json` (`ganadora`, `ranking`, `votos`); §A de este esqueleto; como modelo, la cabecera de `docs/tactica.md` y el §0 de `docs/generador.md`. La fase 6 reescribe esta cabecera con la línea de procedencia completa (`04-fase-refutacion.md` §6).

**Decisiones que escribe como hechos:** ninguna propia (cita por su id las que necesite).

**Injertos que recibe:** ninguno.

**Objeciones que resuelve:** ninguna.

**Huecos que rellena:** ninguno.

**Contradicciones de hecho que deja resueltas:** ninguna.

**Del dueño:** los tres pilares del encargo ([DUEÑO 1], [DUEÑO 2], [DUEÑO 3]) en 0.1.

### §1 · Diagnóstico medido: lo que el jugador lee hoy de una carrera

`borrador/01-diagnostico.md` · 380 líneas · lote L1

**Contiene:**

1. **1.1 Los tres canales del motor.** Sucesos (`RaceEvent`, `packages/engine/src/stage/events.ts`), foto (`StageProbe.onSnapshot`, `types.ts` l. 487-504, pedida solo en los km de `radioKmPoints`) y salida (`StageOutput`, `types.ts` l. 568-593, sin estado intermedio); el motor avanza por DISTANCIA en bloques de 100 m (mapa 01 §0). El punto 4 del encargo, contestado con una tabla: qué es cierto (km y `tS` en cada suceso) y qué no (las siete fechas trucadas, casos (a) a (g) del mapa 01 §1.2, con su línea; la radio guarda fotos por km sin reloj ni identidad estable, mapa 01 §2.3; la crono no guarda traza, mapa 01 §4; lo que el motor sabe y no emite, mapa 01 §1.4).
2. **1.2 El reloj, medido.** Eje común, pero no continuo por corredor: las cifras de C1 a C4 del juez del motor (de 0 a 2 bajadas por bloque de la cabeza, 2,8 s como mucho; un corredor retrocede hasta 77 s por km y 138 s por bloque; `race-colombia` e5, semilla 0, km 183,25). Solo el hecho; la decisión es §3.
3. **1.3 La pantalla de etapa hoy.** Qué pinta y de qué dato sale (mapa 03 §1); no hay reproducción ni ocultación (mapa 03 §1.2); la etapa sale entera en una sola respuesta (`routes/races.ts` l. 519-535, [DOC 5]); la radio foto a foto (mapa 03 §1.3); la carrera de un día que abre en `Result` (mapa 03 §1.4).
4. **1.4 El relato hoy.** 55 plantillas y 272 redacciones (mapa 03 §2.3, medido con el AST); las cuatro que caen al `default` que imprime la clave (`stageJournal.ts` l. 1602-1603); la crónica que ve el futuro, pasada a pasada con su línea; dos vocabularios del mismo grupo, cuatro nombres para un artefacto y `narration.ts` medio muerto (mapa 05 §6, contradicciones 7, 8 y 9).
5. **1.5 Las noticias.** El punto 5 del encargo: `news` guarda `kind` y `text` sin `seed` ni `data` (mapa 04 §1.2; `schema.ts` l. 792-811); la semilla se calcula y se tira (`stageRun.ts` l. 1195 y 1214); `renderNews` nombra con el equipo de HOY (`results.ts` l. 191-207); `breakaway_win` no se comprueba (`stageRun.ts` l. 1184-1186); el orden dentro del día es inestable; no hay titular de cambio de líder (mapa 02 §3).
6. **1.6 El destripe hoy, en cifras.** Las 48 superficies del mapa 03 §4 resumidas por pantalla (41 destripan; siete no: C6, T1, T2, T4, T5, T6 y W6); las nueve puertas de fuera (X1 a X9, una línea cada una; la tabla entera es §11.2); la sesión de 7 días y la caché de 30 min sin usuario en la clave; `race_rosters` sin índice por corredor (19,6 ms); la etapa sin `game_day`; la tabla que los documentos nombran y no existe (`stages.radio`, `stage_runs`; contradicción 4 del mapa 05); los correos que existen desde el 22-09-2026 aunque los rectores digan lo contrario (contradicción 15).
7. **1.7 Los maillots hoy.** El punto 6 del encargo: tres de clasificación con su prioridad y su delegación (`jerseys.ts` l. 22 y l. 80-98); el campeón no existe en ninguna tabla (los nacionales sí están en `palmares`); `riders.fame` es una columna muerta; no hay rótulo de corredor; «el del equipo» son dos cosas (contradicción 10 del mapa 05).
8. **1.8 Lo que pesa hoy.** La radio guardada: de 126 a 559 KB en JSON y de 10,7 a 146,4 KB en `jsonb` (juez del motor §2.1), unos 40 MB por temporada (mapa 04 §5). Qué miden las cifras de las propuestas se dice en §5.7.
9. **1.9 Lo que ya está bien y se conserva.** Tabla con fichero y línea: la radio como microscopio del dueño ([DUEÑO 10]; catorce tandas de defectos cazados, mapa 05 §2.8), `buildChronicle` con sus veinte pasadas en el acta, `stageJournal.ts` y sus 140 tests, `leaders` sin general previa (`NO_LEADERS`, `routes/races.ts` l. 465-473), `JERSEY_PRIORITY`, `palmares` con `palmares_race_idx`, `checkReplay`, `scripts/race-radio.mjs --db` y las lecturas `…ThroughStage` que ya prefijan (`results.ts` l. 236, 320 y 379).
10. **1.10 Por qué ahora.** La táctica está en implementación y cambia los sucesos (mapa 01 §6: R23.4, R23.7, R23.8 y el 17d); el reinicio del mundo fija el plazo de `news` (agenda l. 131-133).

**Escribe entero:** la tabla del punto 4 del encargo (qué fecha lleva de verdad cada suceso) y la tabla de lo que se conserva.

**Sale de:** §1 de las cinco propuestas (`producto.md` §1, con su §1.7 de puertas; `estado.md` §1; `ingeniero.md` §1.1-1.3; `datos.md` §1; `television.md` §1); mapas 01 §0-§5, 02 §1-§4, 03 §1-§6, 04 §1-§3 y §5, 05 §2 y §6, 06 §9 y 07 §1 y §5; juez del motor §2 (C1 a C18); cobertura §2; ejecutabilidad §2.2-2.3.

**Decisiones que escribe como hechos:** ninguna propia (cita por su id las que necesite).

**Injertos que recibe:** ninguno.

**Objeciones que resuelve:** ninguna.

**Huecos que rellena:** ninguno.

**Contradicciones de hecho que deja resueltas:** X-01 (¿Hay reloj absoluto?); X-02 (Monotonía del reloj); X-06 (Tamaño de la línea temporal); X-11 (¿El horizonte cuesta menos de 5 ms?); X-12 (riders.fame); X-13 (El campeón nacional); X-14 (¿Qué pasadas de la crónica miran el futuro?); X-16 (Sesión de 7 días y caché); X-17 (Las 48 superficies y las rutas); X-21 (Plantillas y narradores).

**Del dueño:** [DUEÑO 10]; [DOC 5].

### §2 · Principios

`borrador/02-principios.md` · 150 líneas · lote L1

**Contiene:** una tabla de doce principios con tres columnas (el principio; qué lo viola hoy, con su cita a §1; qué pieza del diseño lo cumple y en qué sección), y un párrafo por principio con el mismo número de subsección:

1. **2.1 Un estado con sucesos encima.** No una lista de frases (punto 2 del encargo): el estado es la reducción de la línea temporal (I1, §4).
2. **2.2 El espacio es canónico.** El instante es una proyección (D-01, §3).
3. **2.3 Observar no cambia la carrera.** `ENGINE_VERSION` no sube (D-09, §5).
4. **2.4 Nada del futuro sale del servidor antes de su hora.** «La API no puede mandar lo que la pantalla no enseña» ([DOC 5]; D-06, §14).
5. **2.5 Sin destripe es una propiedad del producto.** Un horizonte por espectador, en un solo punto, y la existencia también informa (D-32; §10, §11).
6. **2.6 Lo visto es lo alcanzado.** Y lo conocido es un prefijo (D-28).
7. **2.7 Un código, un vocabulario y un nombre por artefacto.** D-18, D-48 y la regla C7 del dueño («Un solo concepto, con el mismo nombre, en el motor y en la Race Radio.», `docs/balance.md` l. 6740-6741, v34).
8. **2.8 El ritmo depende del recorrido, no de lo que pasa.** D-19, D-21.
9. **2.9 Lo guardado se renderiza al leer.** Con semilla neutra, para E10 (D-45, D-46).
10. **2.10 El contrato de hoy no se rompe.** Y todo se apaga sin desplegar (D-50, D-53).
11. **2.11 Revelar no castiga.** Y nadie queda bloqueado (D-38, DD-09).
12. **2.12 Se mide antes de encender.** Bancos, móvil a mano y prueba de lectura (D-60, §16).

Cierra con la doctrina del dueño que acota a todos (mapa 05 §2.7): la D7 («si lo que hace el motor está bien ahí, no cambies el motor, cambia el race radio», `docs/balance.md` l. 16555-16558) y [DUEÑO 9] (nada de decidir en vivo).

**Escribe entero:** la tabla de los doce principios.

**Sale de:** §2 de las cinco propuestas; mapa 05 §1, §2.7 y §5; mapa 06 §1.1 y §7.2.

**Decisiones que escribe como hechos:** ninguna propia (cita por su id las que necesite).

**Injertos que recibe:** ninguno.

**Objeciones que resuelve:** ninguna.

**Huecos que rellena:** ninguno.

**Contradicciones de hecho que deja resueltas:** ninguna.

**Del dueño:** [DUEÑO 9]; [DOC 5].

### §3 · El reloj, el espacio y la identidad

`borrador/03-reloj.md` · 400 líneas · lote L1

**Contiene:**

1. **3.1 Tres relojes y un eje.** El eje común (segundos desde la salida común; `Group.tS`, `group.ts` l. 26-27, nace en 0 en l. 56), el reloj de un grupo en un bloque y el de un corredor (adopta el de su grupo al entrar, `simulate.ts` l. 7863; la deriva vuelve a 0 en el llano, l. 5536). D-01 entero, con sus seis consecuencias, y las medidas de C1 a C4.
2. **3.2 Foto contra instante.** La foto es un km (lo que el dueño llama foto en la radio) y el instante es la tele (I-05): tabla de qué da cada uno y quién lo usa (la radio y B16, la foto; `Watch`, el instante).
3. **3.3 El corte diagonal.** Cada grupo en el bloque donde su reloj vale `t`, extrapolado desde su última marca sin pasar el siguiente punto de foto y sin volver atrás en pantalla; el corredor que aparece en dos grupos se pinta en el de atrás; el que no aparece en ninguno va a `inTransit` (D-02, D-04). Un ejemplo con números sobre una etapa del banco (la e18 o `race-colombia` e5), paso a paso. Lo medido (`estado.md` §3.6: p99 de 3 a 196 m interpolando, máximo 422 m; sin marcas de cambio de composición, Flandes llega a 3,5 km) y lo no medido (el error extrapolando, que mide B21: sin evidencia de los jueces).
4. **3.4 Las marcas de reloj.** Los cuatro sitios donde se graba una marca (I-03) y qué resuelve cada uno, en tabla; el reloj de la cabeza forzado monótono con un máximo acumulado (C3); `TIMELINE.lastKmMarkBlocks`.
5. **3.5 El hueco que se enseña.** La resta de los relojes de dos grupos en el mismo bloque, en el último km de foto que ha cruzado el de detrás (como la moto de cronometraje, mapa 06 §1.4); el de «tu corredor» es el de su grupo en el último punto común (H-17); nunca el reloj de foto de un corredor (`simulate.ts` l. 9012).
6. **3.6 El salto de hasta 138 s.** Qué es (un ataque que sale de un grupo que va detrás del grupo `peloton` se da por cazado con hueco negativo, `simulate.ts` l. 8678 y 8783), cuántas veces pasa (de 0 a 36 saltos de más de 60 s por etapa, C4), cómo se tolera (tránsito en pantalla) y por qué E2 no lo arregla (sería conducta y subiría la versión); va a `docs/balance.md` para el dueño en el paso 12 (D-58).
7. **3.7 La identidad de los grupos.** El id del motor mientras tenga gente (`group.ts` l. 164-193), el sucesor por mayoría (`raceRadio.ts` l. 614-632 y 694-712), el número de carretera y el papel derivados en cada instante con histéresis de `BROADCAST.roleHysteresisKm`, y el título de pelotón por bloque con la regla de la radio (`raceRadio.ts` l. 317-320: 3.242 de 3.246 fotos iguales, y por qué las otras cuatro son mejores) (D-03, I-04).
8. **3.8 El reloj estimado de las etapas sin línea.** El adaptador de la radio (`timelineForStage`), cómo estima la cabeza (`speedKmh` del grupo 1 reescalado al tiempo del ganador), `clock: 'estimated'`, el aviso `Recorded before full race data` (pantalla), B22 y su umbral de 1 km (sin evidencia de los jueces), y qué abre solo en `Report`: las etapas anteriores a la `0029` y las que no tienen sucesos (D-07, D-61).

**Escribe entero:** la tabla foto contra instante; la tabla de las cuatro marcas; el pseudocódigo de la posición de un grupo en `t` (el de `instantAt` completo está en §4.5).

**Sale de:** `estado.md` §3.1, §3.3, §3.5 y §3.6 (base); `producto.md` §3.1-3.2; `datos.md` §3.1-3.2; `ingeniero.md` §1.3 y §3.1-3.2; `television.md` §3.1-3.2; juez del motor §2.2-2.3 (C1 a C4); ejecutabilidad §2.3; mapa 01 §0 y §2; mapa 06 §1.4-1.5.

**Decisiones que escribe como hechos:** D-01 (El reloj: eje absoluto, no continuo por corredor); D-03 (La identidad de los grupos y el título de pelotón); D-04 (La posición de cada grupo en el instante); D-07 (El adaptador de la radio para las etapas sin línea).

**Injertos que recibe:** I-01 (la línea temporal de estado y el corte diagonal); I-03 (marcas de reloj en cuatro sitios); I-04 (identidad con sucesor, histéresis y título por bloque); I-05 (foto frente a instante; la radio desde el estado).

**Objeciones que resuelve:** O-13 (reloj sin marcas; reloj estimado sin medir); O-21 (el salto de un corredor, sin acotar).

**Huecos que rellena:** H-12 (el salto de 138 s); H-16 (las etapas entre el despliegue y el reinicio); H-17 (qué segundo es la diferencia de un corredor).

**Contradicciones de hecho que deja resueltas:** X-01 (¿Hay reloj absoluto?); X-02 (Monotonía del reloj).

**Del dueño:** [DUEÑO 4] (cuánta ventaja y sobre quién).

### §4 · El modelo de tipos: la línea temporal, el instante y la red

`borrador/04-modelo.md` · 900 líneas · lote L2

**Contiene** (es el ÚNICO sitio del documento con los bloques TypeScript enteros de §G.3 del glosario; cada bloque lleva un comentario por campo y un párrafo de por qué tiene esa forma y contra qué línea de hoy encaja):

1. **4.1 Unidades.** `Block` (100 m, `STAGE.dx`), `Ds`, `RaceS`, `RiderIx`, `GroupIx`; por qué décimas y enteros.
2. **4.2 La línea temporal.** §G.3.1 entero: `GroupOrigin`, `GroupCatalogEntry`, `MishapKind`, `StateEvent` (las cinco variantes `move`, `out`, `main`, `clock`, `mishap`), `KeyPhoto`, `Puller`, `GroupDetail`, `Photo`, `TimelineEvent`, `BannerResult`, `StageRef`, `ProfileStrip`, `StageWeather`, `CastTeam`, `CastRider` (con `from` y `knownWins`), `TimelineCast`, `TimeTrialTrace`, `FinishRecord` y `StageTimeline`; y la tabla «de dónde sale cada campo» (fichero y línea del motor o de `packages/db`), como `estado.md` §3.4 y `datos.md` §3.6.
3. **4.3 El formato guardado.** `StoredTimelineV1` entero con sus restricciones (D-10): listas planas de enteros y cadenas; relojes y km en décimas; la pertenencia de cada foto clave en base64 de un byte por corredor; los códigos como cadena y nunca como índice de un enum (O-14); `format` en cada fila. `encodeTimeline` y `decodeTimeline` con el despacho por `format` (H-13), y la guarda de tipos entre `SnapshotRider`, `StageProbe` y el grabador escrita como código con `satisfies` (I-17, H-13).
4. **4.4 El reductor y sus invariantes.** `reducePhoto` con un `case` por variante y `photoAt` (I-01); I1, I2, I3 e I5 como enunciados formales (I-02); por qué I1 exige la regla del título por bloque (69 discrepancias sin ella, 0 con ella en 3.246 fotos, medido por `estado`).
5. **4.5 El instante.** §G.3.2 entero: `GroupRole`, `GroupLabel`, `GapTrend`, `GapReading`, `GroupNow`, `InTransit`, `MainGap`, `VirtualGcRow`, `Instant` y `TimeTrialInstant`; `instantAt` con su firma y su algoritmo en pseudocódigo (D-04), causal por construcción.
6. **4.6 La visibilidad y el corte.** `visibilityOf`, `cutTimeline` y `chunkOf` (D-06, I-10); la tabla de la hora de visibilidad de cada clase de dato; la propiedad B9 escrita.
7. **4.7 Cuándo se enseña cada suceso.** `REVEAL_RULES` y `revealSOf` (D-05, I-06, I-20): la tabla de D-05 entera con los casos (a) a (g) del mapa 01 §1.2 y la regla por defecto para toda plantilla desconocida (R23.8 traerá `card_changed`, [DOC 3]).
8. **4.8 El rótulo y los maillots.** §G.3.3 entero: `ChampionTitle`, `WornJersey`, `Distinction`, `WornInput`, `NotorietyLevel` y `RiderCard`. La regla es §7.
9. **4.9 La pantalla.** §G.3.4 entero: `CueClass`, `RiderCueContext`, `TimeCheckRow`, `Cue`, `CueKind`, `TemplateTarget` y `LiveLine`. La cola y `CUE_OF_TEMPLATE` son §6.
10. **4.10 El horizonte y el velo.** §G.3.5 entero: `GuardReason`, `KnowledgeLetter`, `SpoilerScope`, `VeiledStage`, `HorizonKind`, `Horizon`, `VeilDelta`, `Viewer`, `WorldRef` y `StageGate`. La semántica es §10.
11. **4.11 La red y el contrato.** §G.3.6 entero: `StartState`, `PaceZone`, `BroadcastHead`, `BroadcastChunk`, `BroadcastFinish`, `StageReport`, `StagePreview`, `StageClosing`, `HorizonSummary`, `PreStageInfo` y `WatchState`, con sus esquemas Zod (`broadcastHeadSchema`, `broadcastChunkSchema`, `broadcastFinishSchema`, `horizonSummarySchema`) y el formato plano de enteros por la red (I-17).
12. **4.12 Las noticias.** §G.3.7 entero: `AbandonReason`, `NewsPayload`, `NewsKind`, `StageReadyItem`, `NameResolver` y `Variant`. Los renders son §12.
13. **4.13 Dónde vive cada tipo.** La tabla fichero → tipos (de §G.2) y quién importa a quién: `packages/engine` ya importa `@cyclingstar/shared` (`packages/engine/package.json` l. 19; lo hace `coachView.ts`); `shared` no importa nada del motor; el gzip lo pone `packages/db`, porque el motor no importa Node (`eslint.config.js` l. 80-137).

**Escribe entero:** todos los bloques de §G.3 (de G.3.1 a G.3.7) con comentarios; `StoredTimelineV1`; la guarda con `satisfies`; el pseudocódigo de `reducePhoto`, `instantAt` y `cutTimeline`; la tabla de procedencia de cada campo; la tabla de `REVEAL_RULES`.

**Sale de:** `estado.md` §3.2-3.10 (base del modelo); `datos.md` §3.3-3.6 y §10.4; `ingeniero.md` §3.3-3.6; `television.md` §3.3-3.5 y §11.3; `producto.md` §3.3-3.4; juez del motor §4-§5 (C5, C8, C9, C10); mapa 01 §1-§2; mapa 07 §2.

**Decisiones que escribe como hechos:** D-01 (El reloj: eje absoluto, no continuo por corredor); D-02 (El modelo de estado: la línea temporal de `estado`); D-03 (La identidad de los grupos y el título de pelotón); D-04 (La posición de cada grupo en el instante); D-05 (Cuándo se enseña cada suceso); D-06 (La visibilidad de cada dato y el tramo por reloj de carrera); D-10 (La tabla nueva y su codificación); D-15 (El reparto congelado, con procedencia).

**Injertos que recibe:** I-01 (la línea temporal de estado y el corte diagonal); I-02 (invariantes I1, I2, I3 e I5 y la autocomprobación); I-03 (marcas de reloj en cuatro sitios); I-06 (`onEvent` y el bloque de emisión); I-10 (visibilidad por dato y corte causal); I-17 (formato plano de enteros, `format` y guarda de tipos); I-20 (`REVEAL_RULES` y caídas desde `incidents`).

**Objeciones que resuelve:** O-13 (reloj sin marcas; reloj estimado sin medir); O-14 (el motivo guardado por índice).

**Huecos que rellena:** H-13 (guarda de tipos y decodificador).

**Contradicciones de hecho que deja resueltas:** X-15 (Las fechas trucadas (a) y (f)); X-23 (El formato guardado de la línea).

**Del dueño:** [DOC 3] (R23.8 por la regla por defecto).

### §5 · Lo que el motor guarda al correr la etapa: sonda, codificación y tamaños

`borrador/05-motor.md` · 560 líneas · lote L3

**Contiene:**

1. **5.1 Lo que no cambia.** `ENGINE_VERSION` 89 no sube (D-09), con toda su evidencia: C5 (20 de 20 etapas idénticas en `results`, `events`, `efforts` e `incidents` con foto en cada bloque) y la doctrina escrita (`docs/balance.md` l. 16319-16323, 16604-16606 y 16708; `Claude.md` l. 13). Tabla de lo que las propuestas querían que subiera la versión y del gancho que lo da sin subirla (O-05). La regla para quien venga después: toda subida va detrás del paso 17d de la táctica, porque `packages/db/src/raceReport.ts` l. 148 re-simula la «Last race» sin mirar la versión (C16; H-02). `checkReplay` y `scripts/race-radio.mjs --db` siguen siendo fieles.
2. **5.2 Los tres ganchos de la sonda.** `onEvent`, el oyente de `EventLog.emit` con su bloque (I-06); `onBanner`, llamado en `disputeBanner` (`simulate.ts` l. 9175) y `disputeClimb` (l. 9231) con el orden, los puntos y el reloj del grupo del primero que puntúa (I-18); `onTimeTrialRide`, la sonda que `simulateTimeTrial` ignora hoy (l. 1264), cuyo contenido es §9. Las firmas TypeScript enteras de los tres métodos opcionales de `StageProbe` y del oyente de `EventLog`, y por qué ninguno mueve una tirada del RNG.
3. **5.3 El colector aparte.** La envoltura de `packages/db/src/stageRun.ts` (hoy l. 515-536) pide la foto de CADA bloque y despacha por índice (D-08, I-12, O-01): el cálculo de índice del motor (`simulate.ts` l. 1946-1948 y l. 9023) replicado; qué ven `trabajaronParaOtro` y `raceRadioCollector` (exactamente lo de hoy) y qué ve el grabador (todo); por qué no por km (`TURNO_KM` cuenta fotos, `raceRadio.ts` l. 597 y 883; el turno de 3 km que fijó el dueño, `docs/balance.md` l. 16615-16616). El código de la envoltura, entero.
4. **5.4 El grabador puro.** `timelineRecorder` (`packages/engine/src/sim/timeline.ts`): dos fotos en memoria y solo diferencias; el catálogo; fotos clave cada `TIMELINE.keyPhotoKm` más la del último km; marcas de reloj en los cuatro sitios (I-03); el título de pelotón por bloque; la capa de detalle en los bloques de `radioKmPoints`; las pancartas desde `onBanner`; `bEmit` desde `onEvent` y `revealS` con `revealSOf` (I-20); las caídas desde `output.incidents` sin `severidad` ni `diasBaja` (D-13); el tiempo congelado con `stageWeather`, `weatherPlan` y `roadBearings` (D-14, I-19); el reparto de `buildTimelineCast`, que arma `packages/db` (D-15); la meta. `TimelineRecorder` y `RecorderFinishInput` enteros y el grabador en pseudocódigo.
5. **5.5 La autocomprobación al grabar.** `selfCheckI1` (de 15 a 24 ms por etapa, medido por `estado`) (D-12, O-22, I-02); si falla, no escribe la línea, apunta `timeline I1: <raceKey> e<N> km <k>` en `tick_log.notes` (`schema.ts` l. 156-173), suma un contador del día y la etapa abre en `Report` con `Broadcast unavailable for this stage` (pantalla); el interruptor `TIMELINE_RECORD` (sin evidencia de los jueces).
6. **5.6 La codificación y la escritura.** `writeStageTimeline` con gzip 9 en `packages/db`, en la misma transacción que `stage_snapshots`, con `game_day`, `format`, `engine_version`, `finish_s` y `bytes` (D-10, I-09, O-15). Por qué `bytea`: con el mismo contenido, de 1,6 a 2,4 veces menos que `jsonb` y de 1,3 a 1,6 menos que `json` (C8); PGlite no admite `lz4`, así que `json` y `jsonb` dependen de la compresión de producción y `bytea` no (H-15: la compresión TOAST deja de importar para la línea, no para la radio). El LRU de la API (`BROADCAST.decodedCacheEntries`).
7. **5.7 Los tamaños, cada cifra con lo que mide.** La tabla entera de D-11 (17,5 KB de mediana en `bytea` por etapa en línea; de 5,5 a 39 KB la línea con detalle en `json`; de +52 a 74 KB el JSON que se añadiría a la radio; de 106 a 178 KB la retransmisión servida; la radio de hoy como referencia) y los topes `TIMELINE.maxStoredBytes`, `maxJsonBytes`, `medianJsonBytes` y `ttMaxStoredBytes`; por temporada, de 11 a 20 MB estimados contra unos 40 MB de radio.
8. **5.8 El coste de CPU.** La sonda en cada bloque, de −7,7 a +11,6 % con mediana +3,8 %; el grabador, de 38 a 51 ms por etapa grande y 8 ms por nacional; gzip, de 3 a 15 ms; los días pico 176 (187 cronos nacionales) y 179 (153 nacionales en línea), que mide B15 en el paso 5 (§16.4, §18.3).
9. **5.9 Lo que el motor no gana.** Ningún suceso `crash`, ni `aT`, ni un reloj nuevo para `climb_kom`, ni podios (D-09, D-13); la radio guardada se escribe igual hasta el paso 11 (D-16); `StageOutput` no gana campos (Frontera 3 de la táctica, `tactica.md` l. 246-249).
10. **5.10 Las condiciones que lo sellan.** B10 (las mismas fotos para el aprendizaje y la radio) y B11 (huella idéntica con los tres ganchos), enunciadas aquí; los tests enteros son §16.

**Escribe entero:** los métodos nuevos de `StageProbe`; el oyente de `EventLog`; `TimelineRecorder`; la envoltura de `stageRun.ts`; la tabla de tamaños; el pseudocódigo del grabador.

**Sale de:** §11 de las cinco propuestas (`estado.md` §11, `datos.md` §11, `television.md` §11.1-11.4, `producto.md` §11, `ingeniero.md` §11); `estado.md` §3.7-3.9; `datos.md` §10.5-10.6; juez del motor §2.1 y C5 a C11 y C16; mapa 01 §2 y §5; mapa 02 §1.4; mapa 04 §1.1.

**Decisiones que escribe como hechos:** D-05 (Cuándo se enseña cada suceso); D-08 (El colector aparte); D-09 (`ENGINE_VERSION` no sube en E2); D-10 (La tabla nueva y su codificación); D-11 (Qué mide cada cifra de tamaño, y los topes); D-12 (La autocomprobación al grabar y el interruptor de grabación); D-13 (Las caídas salen de `incidents`); D-14 (El tiempo, congelado); D-16 (La radio guardada y la lista de seguimiento).

**Injertos que recibe:** I-02 (invariantes I1, I2, I3 e I5 y la autocomprobación); I-03 (marcas de reloj en cuatro sitios); I-06 (`onEvent` y el bloque de emisión); I-09 (`stage_timelines` en `bytea` con gzip 9); I-12 (colector aparte, B10 y B11); I-18 (`onBanner`); I-19 (el tiempo congelado); I-20 (`REVEAL_RULES` y caídas desde `incidents`).

**Objeciones que resuelve:** O-01 (fotos finas por la misma sonda); O-05 (subir la versión sin necesidad); O-15 (`json` en vez de `bytea`); O-22 (la línea que no cumple I1: nota y salida).

**Huecos que rellena:** H-02 (la contradicción 5 del mapa 05 y el 17d); H-13 (guarda de tipos y decodificador); H-15 (Postgres de producción y TOAST).

**Contradicciones de hecho que deja resueltas:** X-03 (¿Guardar desde la sonda sube ENGINE_VERSION?); X-04 (¿Hace falta subir ENGINE_VERSION?); X-06 (Tamaño de la línea temporal); X-07 (json, jsonb o bytea); X-08 (Coste de CPU de la sonda en cada bloque); X-09 (¿La carrera sale idéntica con la sonda en cada bloque?); X-10 (¿Las fotos finas por la misma sonda son inocuas?); X-15 (Las fechas trucadas (a) y (f)).

**Del dueño:** [DUEÑO 10] (el microscopio sigue fiel).

### §6 · El estado en pantalla: lo permanente y lo eventual

`borrador/06-pantalla.md` · 620 líneas · lote L4

**Contiene:**

1. **6.1 La pantalla `Watch` de arriba abajo.** Un instante de la e18 dibujado en texto (pantalla), en móvil (360 px) y en escritorio: capa fija, barra de grupos, perfil, rótulo, voz y mandos, con los componentes que los pintan (`StageWatch.tsx`, `FixedOverlay`, `GroupBar`, `ProfileStrip`, `CueCard`, `VoiceTicker`, `PlayerControls`).
2. **6.2 Lo permanente.** La capa fija (km a meta de la cabeza, metros dentro del último km, vueltas si `laps > 1`); la diferencia principal (`MainGap` y su `ref`: `bunch`, `jersey_group` o `second`; `Bunch together`; `s.t.` por debajo de `sameTimeS`, pantalla) con su tendencia (`trendWindowKm`, `trendMinS`, reinicio si cambia la identidad del grupo de detrás); la barra de grupos (`mobileGroupRows`, `+N groups`); el perfil con un cursor por grupo y el puerto que viene ([DOC 2]); `Your rider · in the bunch · +2:14` (pantalla; [DUEÑO 5]). Tabla de lo permanente con su dato, su frecuencia de repintado (`overlayHz`, `barHz`) y la fila de la UCI que lo pide (mapa 06 §1.1) (D-17).
3. **6.3 Las cabeceras de grupo.** El código `GroupRole` y `GroupLabel` (D-18, I-07, O-10); la lista cerrada de palabras de barra y voz (`Lead group` / `the lead group`, `Chase group`, `Bunch`, `Gruppetto`, `Race leader’s group`, `Points leader’s group`, `KOM leader’s group`, `Bunch together`, pantalla) con la condición exacta de cada una sobre la foto (`bunchMinShare`, `chaseMinShare`); el grupo del maillot por `JERSEY_PRIORITY`, no por el orden de la radio; `names` para tres corredores o menos; lo que se retira (`Peloton`, `No man’s land`, `2nd group`, `Group` y la grafía `Grupetto`) y por qué; la histéresis del papel (I-04); DD-04.
4. **6.4 Los que tiran.** `Pulling: Team Beta (for 11 S. CARTER)` (pantalla) en cada grupo que tira (I-46, D-27); la política completa de a quién se nombra es §7.7; B3 exige rótulo para el 100 % de los corredores (hoy, fuera del pelotón en reinas, del 47 al 64 %, mapa 01 §2.3).
5. **6.5 Lo eventual: la cola de rótulos.** `CUE_CLASS` (tabla de las clases 0 a 3 con sus sucesos), un rótulo de corredor a la vez (mapa 06 §5.3), `cueHoldS`, `cueQueueMax` y el descarte de las clases 0 y 1; la cola nunca frena la carrera (D-21, sin evidencia de los jueces: se quita el freno de `television.md`); `cuesBetween` (I-21, O-27).
6. **6.6 La tabla `CUE_OF_TEMPLATE`.** Entera: las 54 plantillas que emite el motor (45 de carretera contando `rider_defies_team` y 9 de crono, mapa 01 §1.1 y §1.3) más `crash`, cada una a su `CueKind`, a `voice_only` o a `report_only`, con su clase; B7 exige que ninguna quede sin destino.
7. **6.7 Las diferencias y la moto.** El cuadro de diferencias generales (`gapsTableEveryRealS`, nunca en los últimos `quietFinalKm`), la moto que rodea la fuga (`breakRoundEveryS`), la general virtual (`virtualGcTop`, `virtualGcMaxS`; mapa 06 §3.3) y las pancartas con orden, puntos y bonificaciones (`BannerResult`; mapa 06 §3.2).
8. **6.8 Lo que no es suceso.** La criba lejana la enseña la barra como estado aunque la voz no la narre ([DUEÑO 7]; B2 incluye `peloton_selection`; D-59, H-03); el tiempo congelado, al tocar la capa fija (D-14, I-19); lugares y avituallamiento no, porque el motor no los tiene (`Banner` es `{ km, tipo, cat? }`, `types.ts` l. 27-32; H-07).
9. **6.9 Lo que nunca sale en pantalla.** La duración de la reproducción, cuántos sucesos quedan, marcas en el perfil donde va a pasar algo (hoy la altimetría las lleva, `chronicle.ts` l. 169-175) y la lista de llegada antes de la línea; en los últimos `quietFinalM`, solo la distancia (D-17).
10. **6.10 Las pestañas y los nombres.** `Watch`, `Report` (la antigua `Story`) y `Race Radio`; `Commentary` despliega lo ya dicho por la voz (pantalla; D-48). [DOC 4], pregunta 4: la «vista de espectador de la etapa» de `docs/navegacion.md` §9 es `Watch`.
11. **6.11 La previa y el cierre en pantalla.** Los cuatro cuadros (perfil y puertos, parte y viento, maillots en juego, favoritos sin fama) y el cierre (podio, general con flechas, maillots de mañana, `Most kilometres out front` (DD-14), abandonos y la etapa de mañana), con `StagePreviewCards` y `StageClosingCards` (D-22, I-22); su ritmo y su contenido exacto son §8.6.

**Escribe entero:** `CUE_CLASS` y `CUE_OF_TEMPLATE` (55 filas); la tabla de palabras de grupo con su condición; la tabla de lo permanente; los textos de pantalla de la capa fija y de la barra.

**Sale de:** `television.md` §3.3-3.5, §4 y §12 (base de la pantalla); `ingeniero.md` §4.1-4.3; `estado.md` §4; `producto.md` §4; `datos.md` §4; mapa 06 §1-§3, §5.3, §6 y §8; mapa 03 §1 y §2.6; mapa 01 §1.1 y §1.3.

**Decisiones que escribe como hechos:** D-03 (La identidad de los grupos y el título de pelotón); D-14 (El tiempo, congelado); D-17 (Lo permanente, lo eventual y la diferencia principal); D-18 (Un vocabulario de grupos); D-21 (La cola de rótulos, sin freno); D-22 (La previa y el cierre son parte de la emisión); D-27 (A quién se nombra en cada grupo); D-48 (Un nombre por artefacto); D-59 (Lo que la pantalla enseña de lo que no es suceso).

**Injertos que recibe:** I-04 (identidad con sucesor, histéresis y título por bloque); I-07 (un código de papel de grupo); I-19 (el tiempo congelado); I-21 (cola de rótulos, `Next action` y `While you skipped`); I-22 (previa de cuatro cuadros y cierre); I-46 (`Pulling:` y a quién se nombra).

**Objeciones que resuelve:** O-10 (dos vocabularios del grupo); O-27 (de plantilla a tipo de rótulo).

**Huecos que rellena:** H-03 (la criba lejana ([DUEÑO 7])); H-07 (lugares, avituallamiento y tiempo); H-17 (qué segundo es la diferencia de un corredor).

**Contradicciones de hecho que deja resueltas:** ninguna.

**Del dueño:** DD-04, DD-14; [DUEÑO 1], [DUEÑO 4], [DUEÑO 5], [DUEÑO 7]; [DOC 2], [DOC 4].

### §7 · Los rótulos y la regla de maillots

`borrador/07-rotulos.md` · 540 líneas · lote L5

**Contiene:**

1. **7.1 El rótulo de corredor.** `RiderCard` (tipo en §4.8) y sus líneas (`cardLinesMax`), con cinco ejemplos (pantalla): el líder de la general, un maillot delegado, un campeón nacional, un top 20 de la general de salida (`gcLineTop`) y un gregario sin distinción (mapa 06 §2.1).
2. **7.2 La regla UCI completa del maillot llevado.** `wornJerseys` en sus cuatro pasos con el reglamento citado (2.6.018, 1.3.071, 1.3.063, 1.3.068) (D-24, I-24, O-03); la delegación con `delegated` y el salto al campeón (DD-05, sin evidencia de los jueces); el título solo en su disciplina y su categoría (un sub-23 nunca de campeón en élite); `distinctions` en su orden; `JerseyKind` no crece (lo sellan `leaderJerseys.test.tsx` y los `Record<JerseyKind, …>`); el maillot joven de la táctica (`tactica.md` l. 6966) como cuarto valor en «others»; el dorsal amarillo del equipo líder, fuera del rótulo (DD-13). Tabla de casos con su resultado: son los casos nuevos de `jerseys.test.ts` (ampliado, no re-sellado).
3. **7.3 Las cinco categorías del dueño.** [DUEÑO 3], punto 6 del encargo y mapa 05 §4: las tres de clasificación, el campeón (E3 y E12) y el del equipo, que son dos cosas (la equipación del equipo del día con su `jerseySeed` y el dorsal del equipo líder, contradicción 10 del mapa 05; el mánager elige una de 12 semillas, contradicción 11). Tabla por categoría: qué hay hoy, qué enseña E2, qué añade E3 y qué añade E12.
4. **7.4 Los campeones.** `ChampionTitleSource` y `palmaresTitleSource.titlesOn`, con la consulta `DISTINCT ON (race_id)` escrita entera y la expresión exacta (`^nc-[a-z]{2}-(road|itt)$` y `^nc-[a-z]{2}-u23-(road|itt)$`; nunca `LIKE 'nc-%-road'`); vigencia y `provisional`; `source` velable (B13) (D-25, I-47, O-04, O-30, H-01). No hay campeones hasta el día 179 de la temporada 0 (`NATIONALS_ROAD_DAY`, `packages/engine/src/routes/calendar.ts` l. 204), salvo los 22 países de `NATIONALS_ROAD_OVERRIDE` (l. 211-234); el Giro de la temporada 0 sale sin campeón de Italia. Los textos `Champion of Italy`, `Time trial champion of Italy` y `U23 champion of Italy` (pantalla; `COUNTRIES` no tiene gentilicios, `packages/shared/src/countries.ts` l. 6-11: sin evidencia de los jueces); el icono con bandera y forma propia, nunca el arcoíris (SPEC §8; contradicción 12 del mapa 05); DD-06; el Mundial y los continentales no existen en el calendario (mapa 04 §4).
5. **7.5 La notoriedad sin `fame`.** La escala `NotorietyLevel` de 0 a 8 con la condición exacta de cada nivel; `knownWins`, las victorias de `palmares` con `game_day` fuera del alcance de cualquier velo (sin evidencia de los jueces); el desempate por puesto de salida y dorsal; por qué `riders.fame` no sirve (`rollover.ts` l. 60 y 293; `columnasVivas.test.ts` l. 34-38) (D-26, I-23, H-05).
6. **7.6 «Cuando se escapan cinco».** `breakHeadline` con `breakNamedMax` y el corredor propio siempre nombrado (I-23; R23.4 «hasta tres NOMBRES + conteo + equipos», [DOC 3]); los ejemplos literales (pantalla), incluidos `Five riders go clear.` y el del campeón de Italia que se escapa con cuatro más; la lista de la fuga, por dorsal.
7. **7.7 A quién se nombra en cada grupo.** `nameWholeGroupUpTo` (12, como `raceRadio.ts` l. 611), los que tiran, los que llevan un maillot que no es el de su equipo, `namedGcTop`, los del espectador y los protagonistas de sucesos ya revelados; `+143 riders` (pantalla); `namedRidersOf`; B3 (D-27, I-46; [DUEÑO 5] y R23.7: «pero no dice quién es, wey», `docs/balance.md` l. 9594, v57).
8. **7.8 La procedencia del reparto.** Cada dato del rótulo con su `from` (D-15, I-11); qué se degrada cuando la etapa de origen está velada (`worn` de líder a `{ kind: 'team' }`, fuera las distinciones con ese origen, `start` a null; lo aplica §10.10; B13); la identidad del día (el equipo con el que corrió, no el de hoy).
9. **7.9 Lo que E2 pide a E3 y E12.** La interfaz `ChampionTitleSource`; la señal de campeón y el editor del maillot de equipo son de E3; los títulos, el Mundial y la siembra al crear el mundo, de E12 (D-62); mientras tanto, los componentes de hoy (`LeaderJersey`, `Jersey`, `Flag`).

**Escribe entero:** la tabla de casos de `wornJerseys`; la escala de notoriedad; la consulta de `titlesOn`; la tabla de las cinco categorías; los textos de pantalla de rótulos y titulares de fuga.

**Sale de:** `television.md` §6.1-6.5 (base de la regla); `ingeniero.md` §6.1-6.5; `producto.md` §6.1-6.3; `datos.md` §6.1-6.3; `estado.md` §6.1-6.4; mapa 06 §2; mapa 05 §4; mapa 04 §4; mapa 03 §6; cobertura §2.1, §2.2 y §2.7; juez del motor C14 y C18.

**Decisiones que escribe como hechos:** D-15 (El reparto congelado, con procedencia); D-24 (La regla UCI del maillot llevado); D-25 (Los campeones: de dónde salen y cuándo existen); D-26 (La notoriedad sin `fame`); D-27 (A quién se nombra en cada grupo).

**Injertos que recibe:** I-11 (procedencia `from` del reparto congelado); I-23 (notoriedad sin fama; el corredor propio siempre nombrado); I-24 (la regla UCI completa del maillot); I-46 (`Pulling:` y a quién se nombra); I-47 (icono de campeón con forma).

**Objeciones que resuelve:** O-03 (campeón sub-23 en élite); O-04 (campeones desde el primer día tras el reinicio); O-30 (`ITA CHAMP` no es televisión).

**Huecos que rellena:** H-01 (campeones antes del primer nacional); H-05 (notoriedad sin `fame`).

**Contradicciones de hecho que deja resueltas:** X-12 (riders.fame); X-13 (El campeón nacional).

**Del dueño:** DD-05, DD-06, DD-13; [DUEÑO 3], [DUEÑO 5]; [DOC 3], [DOC 6] (maillots por forma).

### §8 · El ritmo y el montaje

`borrador/08-ritmo.md` · 540 líneas · lote L4

**Contiene:**

1. **8.1 Los modos.** `Watch` (×1 con `BROADCAST.pace`), `Highlights` (`summaryPace`), el digest de `While you were away` (`digestBudgetS`) y la crono (`ttPace`, §9.4); qué letra de lo visto deja cada uno (`W`, `S`; DD-20).
2. **8.2 La curva.** Segundos de carrera por segundo de pared por zona de km a meta, sin pausas (D-19, I-38, O-12); `paceAt` y `playbackEstimateS` (`About 9 min`, pantalla, con velocidades nominales y no las de la carrera); por qué la duración no depende de lo que pasa (B9: el ritmo no mira los sucesos).
3. **8.3 Las duraciones medidas.** La tabla entera de D-19 (siete etapas, cinco curvas) con su procedencia (juez de ejecutabilidad §2.1, `juez-ejec/ritmo.mjs`, semillas 0 y 1, campo de 176 corredores) y los descartes con su cifra: segundos de pared por km (el último km a ×5,7-8,9 en los finales en alto), frenos tras cada hito (del 35 al 45 % de la duración dependería de los sucesos), presupuesto por tramo (`Full` de 31 min), pausas de 3 s por rótulo (hasta 27:14) y la regla de `datos.md` (mediana de 12,7 min).
4. **8.4 El coste diario.** 21 etapas en 23 días de juego de 6 h son unas 3,65 etapas por día real (mapa 02 §1.1, mapa 04 §2): de 28 a 49 min al día en `Watch` (hasta 73 con reinas largas) y de 8 a 24 en `Highlights`; por eso el modo por defecto es DD-03 (H-19).
5. **8.5 Los mandos.** Pausa (toque, barra espaciadora), `×½ ×1 ×2 ×4`, `Next action` (×20 hasta un `Cue` de clase ≥ 2; causal), saltos de recorrido (`−5 km`, `+5 km`, `Next climb`, `Final 20 km`, `Last km`) con `mode: 'seek'` y `While you skipped`, hacia atrás libre dentro de lo reproducido, `Show result` con confirmación (DD-17), reanudar con `resumeBackS` y `Previously`, pausa al ocultar la pestaña (pantalla) (D-20, I-21); la barra de progreso en km, con marcas solo del recorrido; nunca un «siguiente suceso». Tabla de cada mando con su efecto sobre lo alcanzado y sobre la red.
6. **8.6 El montaje.** La previa de cuatro cuadros de 5 s con su contenido exacto (perfil y puertos con los nombres de `STAGE_FEATURES`; parte y viento lateral del tiempo congelado, I-19; maillots en juego; favoritos por el atributo del tipo de etapa, públicos en `publicRiderDetailSchema.attributes`, `contracts.ts` l. 713-737) y el cierre tras `BroadcastFinish` (`closingResultTop`, la general con flechas, los maillots de mañana, `Most kilometres out front`, abandonos y fuera de control, `Next: Stage 8 · Watch`, pantalla); `finishFreezeS` y `climbCardLeadKm` (D-22, I-22, O-29; mapa 06 §5 y §8).
7. **8.7 La llegada.** Qué hace la pantalla cuando lo alcanzado llega a la última marca de la cabeza (`atFinish`) y llama a `POST …/broadcast/finish`; nada de la llegada viaja antes (I-15, D-06).
8. **8.8 Ver una cola seguida.** `Next: Stage 8 · Watch` sin reproducción automática; la más antigua primero; dos carreras del mismo día en filas separadas (sin evidencia de los jueces); el digest de 30 minutos para 21 etapas con `digestBudgetS` (H-20, D-39, I-37; la portada es §11.4).
9. **8.9 La aceptación del ritmo.** Los valores de `BROADCAST.pace` son iniciales: B17 los mide en las 24 etapas en el paso 0 y en el 10, y la prueba de lectura los acepta (D-60; el protocolo es §16.5).
10. **8.10 Lo que no se hace.** Estreno a hora fija para todos (DD-15; [DUEÑO 9]): el tick de 6 h no lo permite sin partir la transacción del día (mapa 02 §9).

**Escribe entero:** la tabla de duraciones medidas; la tabla de mandos; el contenido de los cuatro cuadros de la previa y del cierre (pantalla).

**Sale de:** `producto.md` §5 (base de la curva); `television.md` §5.1-5.4 y §8; `estado.md` §5; `datos.md` §5; `ingeniero.md` §5.1-5.2; ejecutabilidad §2.1; mapa 06 §5 y §8; mapa 04 §2; mapa 02 §1.1 y §9.

**Decisiones que escribe como hechos:** D-14 (El tiempo, congelado); D-19 (La curva de ritmo, su duración medida y el coste diario); D-20 (Los mandos); D-22 (La previa y el cierre son parte de la emisión); D-39 (Volver tras una semana).

**Injertos que recibe:** I-15 (la meta solo por `POST …/broadcast/finish`); I-19 (el tiempo congelado); I-21 (cola de rótulos, `Next action` y `While you skipped`); I-22 (previa de cuatro cuadros y cierre); I-37 (la portada y `While you were away`); I-38 (ritmo por zona de km, sin pausas).

**Objeciones que resuelve:** O-12 (ritmo sin medir o que comprime los finales); O-29 (previa y cierre mínimos).

**Huecos que rellena:** H-19 (minutos al día de seguir una vuelta); H-20 (ver una cola seguida).

**Contradicciones de hecho que deja resueltas:** X-18 (Duración de la reproducción); X-19 (Coste diario de seguir una gran vuelta).

**Del dueño:** DD-03, DD-15, DD-17, DD-20; [DUEÑO 9].

### §9 · La contrarreloj

`borrador/09-crono.md` · 380 líneas · lote L5

**Contiene:**

1. **9.1 Lo que hay hoy.** `simulateTimeTrial` corre corredor a corredor sin sonda (`simulate.ts` l. 1264); `ttSplitChecks` a ⅓ y ⅔; el pinchazo fechado en `meta / 2` (mapa 01 §1.2, caso e); las 9 plantillas de crono (mapa 01 §1.1 y §4). La crono por equipos real (`race-france` e1, `calendar.test.ts` l. 91-92) el motor la corre como individual (`timeTrial: true`; `timetrial.ts` no tiene rama de equipo): el redactor lo comprueba y la retransmisión enseña lo que el motor corre, diciéndolo.
2. **9.2 La traza.** `onTimeTrialRide`, llamado al cerrar cada corredor, y `TimeTrialTrace` (tipo en §4.2): salida, reloj propio en cada km y percance (D-23, I-08, O-11); tamaños (de 14,7 a 20,3 KB de JSON, medido por `estado` con una copia parcheada y resultados idénticos en 3 de 3; de 2,5 a 10 KB en `bytea`, medido por `datos`; tope `ttMaxStoredBytes`); I5.
3. **9.3 El estado en `t`.** `timeTrialInstantAt` y `TimeTrialInstant` (tipo en §4.5): en ruta (km y diferencia en el último parcial), el sillón (el mejor tiempo llegado antes de `t`, exacto), parciales en cualquier km como rótulo y la general virtual de los `virtualGcTop` en ruta; el algoritmo en pseudocódigo.
4. **9.4 El ritmo por fracción de salidos.** `ttPace` y `ttLastKmX`: medido, de 6:24 a 6:33 un prólogo de 176 corredores a 60 s y de 11:21 a 11:23 una crono con general a 120 s (ejecutabilidad §2.1). Los descartes: dos controles y meta (`producto.md` §9), el §9 de `ingeniero.md` en prosa sin tipo y con 4-6 min estimados para lo que mide 2:51, y los 5.760 y 15.120 s de carrera sin presupuesto de `television.md` §9.
5. **9.5 Los rótulos de la crono.** `ON COURSE`, `SPLIT 1`, `FINISH` con `HOT SEAT` y `VIRTUAL GC` (pantalla); parciales con signo y no solo con color (D-57); el orden de salida (mapa 06 §4).
6. **9.6 Los percances.** El pinchazo y la avería se revelan en `startS + tS` (D-05) y su km verdadero sale de la traza.
7. **9.7 La previa y el cierre de una crono.** Favoritos por CRI, orden de salida y el sillón en el cierre.
8. **9.8 Tests.** I5 (salida + traza final + pérdida = `results.tiempoS`), B11 con la crono y `timeTrial.test.ts` nuevo.

**Escribe entero:** la tabla de rótulos de la crono; el pseudocódigo de `timeTrialInstantAt`; los casos de I5.

**Sale de:** `estado.md` §9 (base de los tipos); `producto.md` §9 (el ritmo); `television.md` §9; `datos.md` §9; `ingeniero.md` §9; mapa 01 §4; mapa 06 §4; ejecutabilidad §2.1.

**Decisiones que escribe como hechos:** D-23 (La contrarreloj).

**Injertos que recibe:** I-08 (tipos y traza de la crono).

**Objeciones que resuelve:** O-11 (crono sin tipo o con dos controles).

**Huecos que rellena:** ninguno.

**Contradicciones de hecho que deja resueltas:** ninguna.

**Del dueño:** nada propio.

### §10 · Sin destripe (I): lo visto, el horizonte y el velo

`borrador/10-horizonte.md` · 620 líneas · lote L6

**Contiene:**

1. **10.1 La propiedad.** El punto 3 del encargo y [DUEÑO 2]: «entrar en una etapa debe ser sentarse a verla» y que «ninguna otra pantalla se lo reviente por detrás»; el «por defecto» es de la agenda (l. 521), no palabra del dueño (mapa 05 §1).
2. **10.2 Qué es visto.** Los estados de una etapa para un espectador (oculta, a medias, vista `W` o `S`, revelada `R`, arrastrada `A`, caducada `X`) y `KnowledgeLetter` (D-28, I-28, O-20); lo conocido es un prefijo y el arrastre se avisa (`This also reveals stages 3 and 4.`, pantalla); lo alcanzado frente a lo servido; por qué se confía en el cliente. Tabla de estados con lo que ve el espectador en cada uno.
3. **10.3 Dónde vive.** `race_watch` con `world_id` en la clave (el DDL es §13.4) y las columnas nuevas de `users`; el reinicio la borra (D-29, H-11); las escrituras (`recordProgress`, `revealStage`, `setFollow`, `setSpoilerScope`) con cuándo escribe cada una; la carga (`progressEveryRealS`, `progressMinDeltaS`, memoria por `(userId, raceKey)`; el umbral, sin evidencia de los jueces: D-55, H-18).
4. **10.4 Qué carreras están en guardia.** Propias, seguidas (`Follow without spoilers`, pantalla, o automáticamente al empezar a ver) y de cabecera (`SPOILER.headlineRaces`, 68 etapas por temporada) (D-30, O-09); los alcances `guarded`, `own_only` y `off`; el coste medido por `producto` (`e2prod/headline.mjs`: alguna etapa velada 260 de 364 días, 7 en la mediana, 29 en el p90 y 42 como máximo); la oferta adaptativa (`adaptiveAskAfterRaces`, DD-16); DD-01.
5. **10.5 La caducidad.** 56 días de juego tras la ÚLTIMA etapa, todas a la vez (D-31, O-26, DD-02); el aviso (`Results of Race Italy are now shown (finished 16 days ago) · Watch the digest anyway`, pantalla); nada caduca mientras la carrera está en curso; la etapa caducada sigue abriendo en `Watch`.
6. **10.6 El horizonte en un solo punto.** `Horizon` como parámetro obligatorio y sin defecto de toda lectura de `packages/db` que toque las fuentes de D-32 (lista entera); `worldHorizon` explícito para el tick, la administración y los bancos; `computeHorizon` con sus cuatro consultas escritas; `veilSql`, el predicado único, escrito en SQL y en Drizzle; `throughStage` e `isVeiled`; `veilDelta`; los mecanismos P, R, F, M, G, B, N y L definidos (I-49, D-32). Su aplicación, superficie a superficie, es §11.1.
7. **10.7 El coste.** `race_rosters_rider_idx` (de 19,6 a 0,11 ms, C12), el memo por `(userId, currentDay, horizonRev)` de `SPOILER.horizonMemoS`, B14 con p95 ≤ 5 ms sobre 250.000 filas y `users.last_seen_at` como mucho una vez por hora (lo pide también E7, `encargos.md` l. 729-731) (D-33, O-17, H-10, I-33).
8. **10.8 La sesión y la cookie.** La sesión de 7 días de better-auth (`apps/api/node_modules/better-auth/dist/context/create-context.mjs` l. 146-147) y quien vuelve tras una semana; `cs_viewer` (HMAC con `SESSION_SECRET`, `httpOnly`, `Secure`, `SameSite=Lax`, `viewerCookieDays`), que da el horizonte en lectura (`readOnly`) y solo restringe; el aviso `Sign in to see results as you know them` (pantalla); se borra al cerrar sesión; alargar la sesión es de E4 (D-34, I-31, O-18).
9. **10.9 La caché de la web.** `rev` en las claves de React Query, `staleTime` 0 para el horizonte, invalidación al revelar o al llegar a meta, `queryClient.clear()` al entrar y al salir de la cuenta (hoy no se limpia, `Account.tsx` l. 311-314; `queryClient.ts` l. 17-46) y `Cache-Control: private, no-store` con `Vary: Cookie` (D-35, I-32).
10. **10.10 El reparto bajo el velo.** Cómo se degrada al servir la cabecera (D-15, I-11, B13).
11. **10.11 La retransmisión cortada por lo alcanzado.** Lo servido nunca pasa de lo alcanzado más `prefetchRaceS`; 409 `beyond_reached` (D-06, I-10; las rutas son §14.3).
12. **10.12 La red y dos dispositivos.** Pausa con `Connection lost · Retry`; lo alcanzado es lo pintado; gana el máximo, `rev` al enfocar y `You finished this stage on another device · Watch anyway · Show report` (pantalla) (D-57, H-21, H-23; sin evidencia de los jueces).
13. **10.13 `SPOILER_MODE`.** Qué hacen `off`, `admins` y `on` dentro de `computeHorizon` (el cableado es §14.6).

**Escribe entero:** la tabla de estados de una etapa; `veilSql`; las cuatro consultas de `computeHorizon`; el formato y la verificación de `cs_viewer`; la tabla de escrituras de `race_watch`.

**Sale de:** `producto.md` §7.1-7.4, §7.8 y §10.2 (base de esta sección); `ingeniero.md` §7.1-7.2; `estado.md` §7.1-7.2; `datos.md` §7.1-7.2 y §7.4; `television.md` §7.1-7.2; mapa 04 §3 y §8; mapa 02 §6; mapa 05 §8; juez del motor C12 y C13; cobertura §2.4-2.5; ejecutabilidad #7.

**Decisiones que escribe como hechos:** D-06 (La visibilidad de cada dato y el tramo por reloj de carrera); D-15 (El reparto congelado, con procedencia); D-28 (Qué es «visto»); D-29 (La tabla de lo visto lleva el mundo); D-30 (El alcance del velo por defecto); D-31 (La caducidad); D-32 (El horizonte en un solo punto); D-33 (El coste del horizonte: un índice y un memo); D-34 (La sesión de 7 días y la cookie de espectador); D-35 (La caché de la web); D-55 (La carga de escritura del progreso); D-57 (La red, dos dispositivos y la accesibilidad).

**Injertos que recibe:** I-10 (visibilidad por dato y corte causal); I-11 (procedencia `from` del reparto congelado); I-28 (horizonte y velo: grados, prefijo, alcances y caducidad); I-31 (la cookie `cs_viewer`); I-32 (caché de la web: `rev`, `clear()` y `no-store`); I-33 (memo del horizonte y `last_seen_at`); I-49 (`Horizon` obligatorio, `veilSql` y el registro).

**Objeciones que resuelve:** O-09 (las 8 de cabecera no son del dueño); O-17 (horizonte sin índice por corredor); O-18 (la caché y la sesión de 7 días); O-20 (tramos por espacio; lo servido como visto); O-26 (`Catch up at ×4` y caducidad de 28 días).

**Huecos que rellena:** H-10 (índice y presupuesto del horizonte); H-11 (el reinicio y las tablas sin `world_id`); H-18 (la carga de escritura del progreso); H-21 (fallos de red); H-23 (dos dispositivos).

**Contradicciones de hecho que deja resueltas:** X-11 (¿El horizonte cuesta menos de 5 ms?); X-16 (Sesión de 7 días y caché).

**Del dueño:** DD-01, DD-02, DD-16, DD-20; [DUEÑO 2].

### §11 · Sin destripe (II): cada superficie, una a una

`borrador/11-superficies.md` · 820 líneas · lote L7

**Contiene:**

1. **11.1 Las 48 superficies del mapa 03 §4.** Una fila cada una (I-29): id del mapa, pantalla, qué destripa, ruta y líneas, mecanismo (P, R, F, M, G, B, N o L), qué ve el espectador que no conoce la etapa (pantalla) y qué banco la vigila (B1a, B1b o B1c); las siete que hoy no destripan (C6, T1, T2, T4, T5, T6 y W6), dichas con su porqué.
2. **11.2 Las nueve puertas de fuera del inventario.** Una fila cada una con el mismo formato (I-29, O-32): X1, el informe del bloque y la tendencia (`routes/riders.ts` l. 447-477; el aprendizaje multiplica por el puesto, `learning.ts` l. 106-110); X2, `upcoming-races` y `my-orders` (`riderSchedule.ts` l. 217); X3, la sesión; X4, `free-agents` (`browse.ts` l. 234); X5, la caché; X6, el historial; X7, la vista previa de enlaces; X8, el calendario de equipo; X9, `alreadyOut` de la retirada (`routes/riders.ts` l. 648).
3. **11.3 Las rutas, una a una.** Tabla (mapa 02 §4: 52 rutas `GET` más las de escritura que devuelven cuerpo) con su `config.spoiler` (`safe`, `horizon` o `watch`) y su mecanismo; es la lista que B1d contrasta con lo que registra Fastify (el registro es §14.5).
4. **11.4 La portada.** `Continue watching`, `Ready to watch` (una tarjeta por etapa velada; `Your rider raced` solo por la lista de salida) y `While you were away` (`Watch the race in 30 minutes`, `Key stages` elegidas por el perfil, `Continue from stage 4`, `Show results`) (pantalla; I-37, D-39); el que vuelve tras una semana con una gran vuelta acabada, contado paso a paso (mapa 04 §3); `Next: Stage 8 · Watch` (H-20).
5. **11.5 Los agregados con su fecha de horizonte.** `World ranking · as you know it · 3 stages hidden · Manage` y `After stage 9 of 21 · stages 10-12 ready to watch` (pantalla; I-42); rankings, puntos, palmarés, salón, récords, naciones y equipos por R; la ficha de una carrera en curso, hasta lo conocido. [DOC 4], pregunta 3: las etapas futuras de una carrera en curso se siguen enseñando con su recorrido y `Not raced yet` (`Race.tsx` l. 397), porque el recorrido no destripa (N).
6. **11.6 La existencia también informa.** Un marcador neutro por etapa velada en toda lista que sea un flujo, se haya escrito sobre ella una noticia o cinco; ningún aviso mira el contenido que esconde (I-39).
7. **11.7 Las noticias bajo el velo.** Filas veladas fuera, un `StageReadyItem` por etapa y `newsGroupAbove`; `raceOfHeadline` muere (`newsFeed.ts` l. 17-24); el feed sigue global con marca (contradicción 14 del mapa 05).
8. **11.8 Título de pestaña, historial, URL, favicon y vista previa.** `usePageTitle` como único escritor, con `PreStageInfo` y `PageKind`: `Stage 7 · Race France · Cycling Star` y `Stage 7 report · Race France · Cycling Star` (pantalla); URL sin resultado; el fallback de la SPA con título y `og:` neutros (`apps/api/src/app.ts` l. 205-210; `index.html` l. 7); el contador de etapas por ver (`Tabs.tsx` l. 78-79) (D-42, I-27, I-36).
9. **11.9 Correos y avisos.** `stageReadyEmail` construido con `stageReadyNotice` (asunto, primera línea y botón, pantalla); la decisión de enviar no mira el resultado; ningún adjetivo que dependa de lo que pasó; el envío es de E4 (D-42, DD-10); B1a renderiza el correo con el canario.
10. **11.10 Rutas públicas, el visitante y el acta compartible.** `Watch` para todo el que no conoce la etapa, visitante incluido (horizonte `anon`); `/world/races/:raceId/stages/:day/report` público e indexable; `Share to watch` siempre y `Share the report` solo si se conoce, con el `og:description` marcado `Spoiler` (pantalla); el progreso del visitante en `localStorage` con `try/catch` (D-36, O-08, DD-07, DD-12, [DUEÑO 8]; contradicciones 1 y 2 del mapa 05).
11. **11.11 «Dame el resultado».** `Show result` en toda puerta, la confirmación con `Don't ask again` (`users.reveal_confirm`) y `Watch anyway` (pantalla); B20: revelar no cuesta ni da nada (D-38, I-35, DD-17).
12. **11.12 La previa de la N+1 y las órdenes.** `gate: { k: 'previous_unseen', firstUnseen }` y la puerta con sus tres salidas; `Give orders anyway`; las clasificaciones de las órdenes, hasta lo conocido (`raceOrdersResponseSchema`, `contracts.ts` l. 1174-1189) (D-37, DD-09).
13. **11.13 El corredor y el equipo propios.** Condición y atributos visibles (DD-08); `parte` de los días velados a null (H4); X1, X2 y X4 con su mecanismo; el presupuesto velado con `stage_team_results.prize` (P6); el rastro de etapa en `rider_points`, `palmares` y `transactions` (D-41, I-34).
14. **11.14 Lo que se ve de otros jugadores.** Con el horizonte de quien mira; lo visto es privado (ninguna ruta devuelve `race_watch` de otro); la regla para E9 (D-41, I-40, H-08).
15. **11.15 El modo diagnóstico del dueño.** `?diag=1` para `users.is_admin`, sin horizonte y sin escribir `race_watch`, con `Diagnostic view · not counted as watched` (pantalla) (D-40, H-06, [DUEÑO 10]; sin evidencia de los jueces).
16. **11.16 La `Race Radio` bajo el velo.** La lista de seguimiento que nombra a los diez primeros de la etapa desde el km 0 (`stageRun.ts` l. 560-568), cortada en lectura con la política de §7.7; el deslizador, hasta lo alcanzado (D-16, I-05).
17. **11.17 Lo que `docs/navegacion.md` dice y cambia.** La cabecera con ganador, `Stages` con ganador, `Result` por defecto en la clásica y la portada con el puesto (mapa 03 §9; contradicción 1 del mapa 05); la corrección de §7.1-7.4 va en el paso 12 (D-58).

**Escribe entero:** la tabla de las 48 superficies (48 filas); la tabla de X1 a X9; la tabla de rutas con su política; los textos de pantalla de puertas, portada, título y correo.

**Sale de:** `producto.md` §7.5-7.16 (base de esta sección); `ingeniero.md` §7.3-7.8; `estado.md` §7.3-7.6; `datos.md` §7.3-7.5; `television.md` §7.3-7.7; mapa 03 §4, §4.1, §5 y §9; mapa 02 §4, §4.1 y §5; mapa 05 §6 y §8; mapa 06 §7; cobertura §2.4 y §2.9; ejecutabilidad #7 y #11.

**Decisiones que escribe como hechos:** D-16 (La radio guardada y la lista de seguimiento); D-32 (El horizonte en un solo punto); D-36 (El visitante y el acta compartible); D-37 (La previa de N+1 y las órdenes); D-38 (Revelar sin castigo); D-39 (Volver tras una semana); D-40 (El modo diagnóstico del dueño); D-41 (Lo que no se vela, y lo que se ve de otros); D-42 (Título de pestaña, historial, vista previa y correo).

**Injertos que recibe:** I-05 (foto frente a instante; la radio desde el estado); I-11 (procedencia `from` del reparto congelado); I-27 (`PreStageInfo` para títulos y avisos); I-28 (horizonte y velo: grados, prefijo, alcances y caducidad); I-29 (las 48 superficies y las puertas X1 a X9); I-34 (rastro de etapa y `stage_team_results.prize`); I-35 (revelar sin castigo); I-36 (`og:` neutras y las dos formas de compartir); I-37 (la portada y `While you were away`); I-39 (la existencia también informa); I-40 (lo que se ve de otros; la regla para E9); I-42 (agregados con su fecha de horizonte).

**Objeciones que resuelve:** O-08 (el visitante que abre el acta); O-26 (`Catch up at ×4` y caducidad de 28 días); O-32 (puertas sin mecanismo; el presupuesto).

**Huecos que rellena:** H-06 (el dueño, espectador y depurador); H-08 (dos jugadores en km distintos (E9)); H-20 (ver una cola seguida).

**Contradicciones de hecho que deja resueltas:** X-17 (Las 48 superficies y las rutas).

**Del dueño:** DD-07, DD-08, DD-09, DD-10, DD-12, DD-17; [DUEÑO 2], [DUEÑO 6], [DUEÑO 8], [DUEÑO 10]; [DOC 4].

### §12 · La voz, el acta y las noticias

`borrador/12-voz.md` · 620 líneas · lote L8

**Contiene:**

1. **12.1 Un dato, tres productos y un nombre para cada uno.** La voz (`Watch`, `Commentary`), el acta (`Report`) y el microscopio (`Race Radio`), pantalla; qué lee cada uno (D-48; contradicción 8 del mapa 05).
2. **12.2 La voz causal.** `buildChronicle(events, names, { live: { untilS, stageKm, revealS } })` y los cinco puntos de D-43 con sus líneas de `apps/api/src/chronicle.ts` (D-43, I-43, O-02): las cinco pasadas apagadas (`markConcession` l. 319, `dropUndoneSelections` l. 361, `groupGapRuns` l. 362, `foldQuickAttacks` l. 371, `groupRuns` l. 375) con por qué cada una mira el futuro; `respecto`, `juntos` y `desenlace`, causales (l. 546-601 y 937-1005); la longitud de la etapa como dato (l. 545, 637 y 945); la medida (`ingeniero`, `prefijo.mjs`: 0 violaciones en 15 corridas revelando por reloj sin racimos, 94 truncando sin más); `dropLoneChaseGaps` (l. 396-410), sin medir, lo decide B19; lo que la web quita de la voz porque ya lo dice el estado.
3. **12.3 Los racimos en vivo.** La regla B3 del dueño («No menciones uno a uno todos los ciclistas que se van descolgando: puedes mencionar muchos juntos con número», `docs/balance.md` l. 1845-1846, v13); `BROADCAST.liveClusters` apagado; la regla de publicación al cerrar la ventana; se enciende solo con B19 en 0 (I-44, DD-18; sin evidencia de los jueces).
4. **12.4 El acta.** `buildChronicle` sin `live`, con sus veinte pasadas, igual que hoy; `chronicle.test.ts` (62 tests) y `stageJournal.test.ts` (140) no se tocan por esto; vive en `/report`.
5. **12.5 Las plantillas que se escriben.** Los `case` de `puncture`, `mechanical`, `truce_granted` y `truce_denied`; `crash` y `crash_names`, `break_presented` y `gap_trend`, con su frase exacta (pantalla); el `default` deja de imprimir la clave (D-44, O-24).
6. **12.6 Un vocabulario en la voz.** `GROUP_NOUNS` (`packages/engine/src/sim/coherence.ts` l. 571, la tabla de nombres permitidos por plantilla que vigila `stageJournal.test.ts` l. 1627) gana `the gruppetto` (también en `WATCHED_GROUP_NOUNS`, l. 616, para que el test lo vigile) y las filas de las plantillas nuevas de 12.5; como vive en el motor, ese cambio va en el PR 4a, el único que ya paga los bancos (D-54). `raceRadioNames.test.tsx` (`apps/web/src/components/`) se re-sella en el paso 6 (D-18, I-07, O-10).
7. **12.7 La semilla neutra y el pasado estable.** `${plantilla}:${Math.round(km * 10)}:${ids ordenados}` en lugar de nombres y del «and» inglés (`stageJournal.ts` l. 325-328); `pickVariant` con `since` y `TEMPLATE_REV`; la identidad del día; el re-sello único del paso 12; B5 (D-46, I-14, O-07).
8. **12.8 Las noticias.** La primera migración y su plazo (agenda l. 131-133, citada literal); `NewsPayload` (tipo en §4.12); LAS ONCE PLANTILLAS de hoy (`packages/engine/src/world/news.ts` l. 8-19), una fila cada una con lo que guarda en `data`, su semilla, su frase de hoy carácter a carácter y su render nuevo, más las dos nuevas (`gc_lead_taken`, `jersey_taken`); `breakaway_win` comprobado; `injury` con `prevHealth` y `prevUntilDay`; `teamId` del día; el orden estable dentro del día; `text` de compatibilidad (DD-19); `renderNews` en `packages/shared` y la copia del motor fuera en el paso 4a; el espacio antes de la coma de `contract`, corregido y dicho; E2 es el dueño del arreglo (contradicción 6 del mapa 05) (D-45, I-13, I-25, O-06, O-07; punto 5 del encargo; [DOC 1]).
9. **12.9 Los narradores sobrantes.** `narrate()` se borra; `personalNarration` y `raceVerdict` leen la última etapa conocida; `/api/riders/me/last-race` con horizonte; el 17d no se toca (D-47, I-41; contradicción 9 del mapa 05).
10. **12.10 La radio guardada.** Se escribe igual hasta el paso 11; `radioFromTimeline` con el contrato `RaceRadio` de hoy; B16; DD-11; `race-radio.mjs --db` (D-16, I-05).
11. **12.11 Lo que E10 recibe.** Plantillas y datos sin inglés, semilla neutra, `locale` en cada punto de render, el género en el reparto y los códigos de grupo; la lista de textos que siguen en inglés y por qué (`palmares.detail`, las notas del libro) (D-62).

**Escribe entero:** la tabla de las once noticias más las dos nuevas; la tabla de las veinte pasadas con su estado en vivo; las frases nuevas (pantalla); el orden de los `kind`.

**Sale de:** `ingeniero.md` §8.1-8.5 (base de la voz); `datos.md` §8.1-8.4 (base de las noticias); `producto.md` §8.1-8.4; `estado.md` §8.1-8.3; `television.md` §8.1-8.3; mapa 02 §2-§3; mapa 03 §2 y §3; mapa 04 §1.2; mapa 07 §3 y §6; cobertura §2.3; ejecutabilidad #3, #5, #6 y #8.

**Decisiones que escribe como hechos:** D-16 (La radio guardada y la lista de seguimiento); D-18 (Un vocabulario de grupos); D-43 (La crónica que ve el futuro se corrige truncando su entrada); D-44 (Las plantillas que se escriben); D-45 (Las noticias: primera migración, con plazo); D-46 (La semilla neutra y la estabilidad del pasado); D-47 (Los narradores sobrantes); D-48 (Un nombre por artefacto).

**Injertos que recibe:** I-05 (foto frente a instante; la radio desde el estado); I-07 (un código de papel de grupo); I-13 (`NewsPayload` y la migración de noticias primera); I-14 (`pickVariant` con `since`; semilla neutra); I-25 (titulares de cambio de líder); I-41 (los narradores sobrantes); I-43 (la voz por truncado, cinco pasadas apagadas); I-44 (racimos en vivo al cerrar su ventana).

**Objeciones que resuelve:** O-02 (pasadas sin lista ni longitud de etapa); O-07 (nombre y equipo de hoy en titulares viejos); O-10 (dos vocabularios del grupo); O-24 («ninguna frase nueva»).

**Huecos que rellena:** ninguno.

**Contradicciones de hecho que deja resueltas:** X-14 (¿Qué pasadas de la crónica miran el futuro?); X-20 (Qué plan rompe la web de hoy); X-21 (Plantillas y narradores).

**Del dueño:** DD-11, DD-18, DD-19; [DUEÑO 4], [DUEÑO 6], [DUEÑO 10]; [DOC 1], [DOC 3].

### §13 · El esquema y las migraciones

`borrador/13-esquema.md` · 420 líneas · lote L3

**Contiene:**

1. **13.1 Las reglas.** Solo `drizzle-kit generate`; todo nullable, con defecto constante o en tabla nueva; nada se rellena hacia atrás; el mundo de pruebas sigue vivo entre el despliegue y el reinicio (mapa 04 §8); toda lectura tolera null y la ausencia de línea; la próxima libre es la `0046`; si otro documento toma antes un número, manda el nombre (D-49; mapa 04 §6).
2. **13.2 `0046_noticias_con_datos`.** Las columnas de `news`, el índice `news_race_stage_idx` y `text` nullable; el SQL generado y el Drizzle de `schema.ts`, enteros (D-45, I-13, O-06).
3. **13.3 `0047_linea_temporal`.** `stage_timelines` entera con su índice por `game_day`; SQL y Drizzle (D-10, I-09, O-15).
4. **13.4 `0048_lo_visto`.** `race_watch`, el enum `spoiler_scope`, las columnas de `users` y `race_rosters_rider_idx`; SQL y Drizzle (D-29, D-33, I-33, O-17, H-10, H-11).
5. **13.5 `0049_rastro_de_etapa`.** `stage_day` en `rider_points` y `palmares`, `race_key` y `stage_day` en `transactions` y `stage_team_results.prize`; quién escribe cada columna (`stageRun.ts`, `awardRacePrizes`) y desde cuándo (D-41, I-34).
6. **13.6 Lo que no se toca.** `stage_snapshots` no gana columnas (`tactica.md` l. 7589-7591) y `radio` se escribe hasta DD-11; la tabla que los documentos nombran y no existe (`stages.radio`, `stage_runs`; contradicción 4 del mapa 05).
7. **13.7 Columnas vivas y muertas.** `columnasVivas.test.ts` exige que se escriban `race_watch.follow`, `known_through`, `users.horizon_rev` y `stage_team_results.prize`; `riders.fame` sigue en `MUERTAS_CONOCIDAS` (D-26).
8. **13.8 Volúmenes.** `stage_timelines`, de 11 a 20 MB por temporada (estimado con las medianas y las 1.418 etapas); `race_watch`, de 40 a 80 mil filas por año real con 1.000 jugadores (la forma B del mapa 04 §3); una escritura por minuto real y espectador como mucho (D-55); mapa 04 §5.
9. **13.9 El reinicio.** Qué borra (`race_watch`), qué no se sabe (si sobreviven las cuentas) y la nota en `docs/ops.md` (D-58; mapa 04 §8).
10. **13.10 Tests del esquema.** La migración aplicada dos veces en CI, `schema.test.ts` y las lecturas con columnas null.

**Escribe entero:** las cuatro migraciones en SQL y en Drizzle.

**Sale de:** `datos.md` §10.1-10.2 (base); `producto.md` §10.1; `ingeniero.md` §10.1; `estado.md` §10.1; `television.md` §10.1; mapa 04 §1, §5, §6 y §8; juez del motor C12 y C17.

**Decisiones que escribe como hechos:** D-10 (La tabla nueva y su codificación); D-11 (Qué mide cada cifra de tamaño, y los topes); D-29 (La tabla de lo visto lleva el mundo); D-33 (El coste del horizonte: un índice y un memo); D-45 (Las noticias: primera migración, con plazo); D-49 (Las migraciones).

**Injertos que recibe:** I-09 (`stage_timelines` en `bytea` con gzip 9); I-13 (`NewsPayload` y la migración de noticias primera); I-33 (memo del horizonte y `last_seen_at`); I-34 (rastro de etapa y `stage_team_results.prize`).

**Objeciones que resuelve:** O-06 (la migración de `news`, tarde); O-15 (`json` en vez de `bytea`); O-17 (horizonte sin índice por corredor).

**Huecos que rellena:** H-10 (índice y presupuesto del horizonte); H-11 (el reinicio y las tablas sin `world_id`).

**Contradicciones de hecho que deja resueltas:** X-07 (json, jsonb o bytea); X-11 (¿El horizonte cuesta menos de 5 ms?); X-22 (Qué PR pagan los bancos y cuál es la próxima migración).

**Del dueño:** DD-11.

### §14 · La API y el contrato

`borrador/14-api.md` · 540 líneas · lote L6

**Contiene:**

1. **14.1 El contrato de hoy.** La ruta de etapa sigue devolviendo `StageReplay`; con la etapa velada omite los opcionales de resultado (`contracts.ts` l. 1499-1531) y sirve `altimetry` sin marcas; `watch`, opcional; la web de ayer ve pestañas vacías y no un error; `/api/news` sigue mandando `text`; `buildRaceRadio` ignora claves nuevas (`chronicle.ts` l. 1257-1317, `.catch(null)` en l. 1306); `StageCard` en la ruta de hoy, descartado (`ContractError`, `apps/web/src/api/results.ts` l. 51-55 y `request.ts` l. 91-111). Tabla de lo que rompería cada alternativa (D-50, I-16).
2. **14.2 Las rutas nuevas.** La tabla entera de §G.6 con método, `config.spoiler`, entrada, salida y errores (409 `beyond_reached`, 403 `previous_unseen`, 403 `{ gate }`); `?season=` (arregla que una etapa de la temporada anterior no se pueda abrir, mapa 02 §4); `GET` nunca cambia estado; la meta y revelar, por `POST`; el progreso por `POST` con `fetch` `keepalive` y `sendBeacon` con un `Blob` `application/json` (D-51, O-28); los esquemas Zod de entrada, enteros.
3. **14.3 Los tramos.** `chunkRaceS` y `prefetchRaceS`; B18; la meta nunca en un tramo, solo por `POST …/broadcast/finish`; `atFinish`; `Cache-Control: private, max-age=3600` en los tramos (D-06, I-10, I-15, O-20, O-25).
4. **14.4 La fuente de la retransmisión.** `timelineForStage` (la línea o el adaptador de la radio), el LRU de líneas decodificadas y `clock: 'estimated'` (D-07).
5. **14.5 El registro.** `SpoilerPolicy` (`safe`, `horizon`, `watch`), `SurfaceMechanism`, `RouteRegistry` y `registerSpoilerGuard`, escritos enteros; `config.spoiler` en toda ruta que devuelva cuerpo, sea del método que sea (`alreadyOut`, `routes/riders.ts` l. 648); lanza al arrancar; B1d recorre lo que registra Fastify (D-32, I-49, O-31).
6. **14.6 Los interruptores.** `BROADCAST_WATCH`, `SPOILER_MODE` y `TIMELINE_RECORD` en `envSchema` y `tickEnvSchema` (`apps/api/src/env.ts` l. 20-70), escritos enteros; `/health.features` con `SwitchMode`; qué hace cada valor en cada ruta (D-53, I-45).
7. **14.7 La validación.** `schema.parse` en el test y `satisfies` en el código para toda respuesta nueva; hoy ninguna ruta valida lo que devuelve (mapa 07 §2) (I-16).
8. **14.8 El formato por la red.** Enteros planos (I-17); `@fastify/compress` (paso 0); los pesos de la cabecera, del tramo y de la etapa servida, con B6.
9. **14.9 Las cabeceras HTTP.** `private, no-store` y `Vary: Cookie` en lo que depende del horizonte; `cs_viewer` en la respuesta de entrada (§10.8) (D-35, I-32).
10. **14.10 El fallback de la SPA.** Título y `og:` neutros inyectados en `index.html` para las rutas de carrera y etapa (`app.ts` l. 205-210) (I-36, D-42).
11. **14.11 El lado de la web.** Los clientes nuevos de `apps/web/src/api/`, `request.ts` y `queryClient.ts` con `rev` en las claves; `StageWatch.tsx` pide cabecera, tramos y meta, en ese orden.

**Escribe entero:** la tabla de rutas; `SpoilerPolicy`, `RouteRegistry` y `registerSpoilerGuard`; las entradas de `env.ts`; los esquemas Zod de entrada de las rutas `POST` y `PUT`.

**Sale de:** `datos.md` §10.3-10.7 (base); `ingeniero.md` §7.4 y §10.2-10.3; `producto.md` §10.2-10.3; `estado.md` §10.2; `television.md` §7.4 y §10.2-10.3; mapa 02 §4 y §6; mapa 07 §2; ejecutabilidad §2.3 y comprobaciones #1 a #4 y #11.

**Decisiones que escribe como hechos:** D-06 (La visibilidad de cada dato y el tramo por reloj de carrera); D-07 (El adaptador de la radio para las etapas sin línea); D-32 (El horizonte en un solo punto); D-35 (La caché de la web); D-50 (El contrato de hoy: ningún PR rompe la web de ayer); D-51 (Las rutas y el progreso por `POST`); D-53 (Los interruptores y la marcha atrás).

**Injertos que recibe:** I-09 (`stage_timelines` en `bytea` con gzip 9); I-10 (visibilidad por dato y corte causal); I-15 (la meta solo por `POST …/broadcast/finish`); I-16 (`schema.parse` y `satisfies`; el contrato de hoy); I-17 (formato plano de enteros, `format` y guarda de tipos); I-32 (caché de la web: `rev`, `clear()` y `no-store`); I-36 (`og:` neutras y las dos formas de compartir); I-45 (interruptores y `Watch` en el paso 3); I-49 (`Horizon` obligatorio, `veilSql` y el registro).

**Objeciones que resuelve:** O-20 (tramos por espacio; lo servido como visto); O-25 (la meta en el último tramo); O-28 (`sendBeacon` contra una ruta `PUT`); O-31 (el registro solo de `GET`).

**Huecos que rellena:** ninguno.

**Contradicciones de hecho que deja resueltas:** X-17 (Las 48 superficies y las rutas); X-20 (Qué plan rompe la web de hoy).

**Del dueño:** [DOC 5].

### §15 · Las constantes

`borrador/15-constantes.md` · 330 líneas · lote L2

**Contiene:**

1. **15.1 Dónde viven y por qué.** `TIMELINE` en `packages/engine/src/constants.ts` (la lee el grabador; tocarla corre los ocho tramos de bancos, `ci.yml` l. 189, unos 73 min); `BROADCAST` y `SPOILER` en `packages/shared/src/broadcast/constants.ts` (no cambian una carrera; tocarlas no corre los bancos). Es una desviación escrita de la regla 4 de `00-encargo.md` §4 («constantes en `packages/engine/src/constants.ts`»), con su motivo (D-52, I-48, O-19).
2. **15.2 `TIMELINE`.** Entera como TypeScript `as const`: valor, intención, procedencia (medido o estimado) y el test que la vigila.
3. **15.3 `BROADCAST`.** Entera, agrupada: ritmo, mandos, rótulos, tramos y progreso, nombres, racimos, reloj estimado, móvil y caché.
4. **15.4 `SPOILER`.** Entera.
5. **15.5 Las dos copias atadas por test.** `bunchMinShare` = `PELOTON_MIN_SHARE` (`raceRadio.ts` l. 91) y `chaseMinShare` = `STAGE.gapChaseMainFraction` (`constants.ts` l. 2657), con el test escrito como el de `PullMotive` (`apps/api/src/raceRadio.test.ts` l. 148-152); I1 corre también en la suite rápida, porque un cambio en `reduce.ts` no dispara los bancos.
6. **15.6 Cuáles son iniciales y quién las acepta.** Las del ritmo (B17 y la prueba de lectura), `estimatedClockMaxErrKm` (B22), `horizonBudgetMs` (B14), `overlayHz` y `barHz` (§18.5); cada una con su banco.
7. **15.7 Las constantes que E2 lee y no toca.** Del motor: `STAGE.dx`, `radioKmPoints`, `NAME_WHOLE_GROUP_UP_TO`, `PELOTON_MIN_SHARE`, `TURNO_KM`, `tacticBreakGapSeconds`, `NATIONALS_ROAD_DAY` y `NATIONALS_ROAD_OVERRIDE`; de `packages/shared`: `JERSEY_PRIORITY` (`jerseys.ts` l. 22). Cada una con su fichero y su línea.
8. **15.8 Los interruptores no son constantes.** Se cambian en Railway sin desplegar (§14.6).

**Escribe entero:** los tres bloques (`TIMELINE`, `BROADCAST`, `SPOILER`) con los valores de §G.7 y un comentario de intención por constante; el test de las dos copias.

**Sale de:** §12 de las cinco propuestas; §G.7 del glosario (valores cerrados); juez del motor (O-motor-07, I-motor-08); ejecutabilidad #9; mapa 07 §4.

**Decisiones que escribe como hechos:** D-52 (Dónde viven las constantes).

**Injertos que recibe:** I-48 (constantes en `packages/shared`).

**Objeciones que resuelve:** O-19 (las constantes en el motor).

**Huecos que rellena:** ninguno.

**Contradicciones de hecho que deja resueltas:** X-22 (Qué PR pagan los bancos y cuál es la próxima migración).

**Del dueño:** nada propio (los valores que son del dueño están en §20).

### §16 · Los bancos y los tests

`borrador/16-bancos.md` · 640 líneas · lote L8

**Contiene:**

1. **16.1 Lo que protege hoy el relato y lo que se re-sella a propósito.** `raceRadioNames.test.tsx` (paso 6), `stageJournal.test.ts` (las variantes, una vez, en el paso 12), `stageRun.test.ts` l. 322-339 (paso 11) y `GROUP_NOUNS` con `WATCHED_GROUP_NOUNS` (paso 4a: la medida de vocabulario de `coherence.ts`, l. 738, cuenta un nombre más donde salga `the gruppetto`, y se remide y se dice); lo que sigue en verde sin tocar (`chronicle.test.ts`, `leaderJerseys.test.tsx`, `index.test.ts` con la versión) (mapa 07 §1.5).
2. **16.2 Los invariantes I1, I2, I3 e I5.** Enunciado, fixture (las 24 etapas del mapa 07 §7 y cinco etapas congeladas en `apps/api/src/__fixtures__/`), suite (I1 también en la rápida sobre fotos sintéticas, D-52) y cifras medidas (I-02).
3. **16.3 B1a a B1d.** El canario, el diferencial con su lista blanca con motivo, los dos desenlaces y la política completa (I-30, D-54); la lista de rutas pendientes que cada PR del paso 8 vacía, y el test que falla si una pendiente ya pasa o si una no pendiente falla. El código de B1a y B1c, entero.
4. **16.4 B2 a B22, uno a uno.** Enunciado, fixture, umbral, paso en que nace y suite (§G.9). En particular: B9 (el corte causal, I-10); B10 y B11 (I-12; 20 de 20 medido); B12 (la aritmética del horizonte y la cookie que solo restringe); B13; B14 (250.000 filas, p95 ≤ 5 ms; O-17, H-10); B15 (los días 176 y 179 con grabador y escritura; O-23, H-14); B16 (O-16); B17; B18; B19 (0 en 15 corridas, medido por `ingeniero`); B20 (I-35); B21 y B22, informativos (sin evidencia de los jueces). El código de B9, B10 y B11, entero.
5. **16.5 La prueba de lectura.** PL: tres etapas (una llana, una reina y una clásica), tres puntos al azar en cada una, las cuatro preguntas de SPEC §6.15 y nueve de nueve (el umbral, sin evidencia de los jueces); quién (el dueño y una persona que no conozca el diseño), cuándo (paso 10) y qué se hace si falla (D-60, H-04, [DOC 7]).
6. **16.6 Los tests de pantalla y de producto.** El render estático de la capa fija, la barra y el rótulo; `usePageTitle` como único escritor (un test prohíbe `document.title` fuera de él); `stageReadyEmail` con el canario; revelar sin castigo (B20).
7. **16.7 El CI.** Qué suite corre cada banco; solo el paso 4 paga los ocho tramos; el coste (`typecheck` 37 s y `test:rapido` unos 9 min en todo PR) (mapa 07 §4).
8. **16.8 Las cegueras.** Las del mapa 07 §5.2 y cuáles tapa E2.
9. **16.9 La tabla final.** Banco, paso en que nace, suite, umbral, medido o no y sección que lo usa.

**Escribe entero:** la tabla de bancos; el código de B1a, B1c, B9, B10 y B11 como tests de vitest; el protocolo PL.

**Sale de:** §13 de las cinco propuestas (`producto.md` §13 para B1; `estado.md` §13 para I1 a I5; `ingeniero.md` §13 para B19; `datos.md` §13; `television.md` §13); mapa 07 §1 y §4-§7; juez del motor §2 (C5, C11, C12); ejecutabilidad #12.

**Decisiones que escribe como hechos:** D-11 (Qué mide cada cifra de tamaño, y los topes); D-33 (El coste del horizonte: un índice y un memo); D-60 (La prueba de lectura como puerta del encendido).

**Injertos que recibe:** I-02 (invariantes I1, I2, I3 e I5 y la autocomprobación); I-10 (visibilidad por dato y corte causal); I-12 (colector aparte, B10 y B11); I-30 (B1b diferencial y B1c de dos desenlaces); I-35 (revelar sin castigo).

**Objeciones que resuelve:** O-16 (I1 no cubre la capa de detalle); O-17 (horizonte sin índice por corredor); O-23 (la CPU inflada; el banco del día pico).

**Huecos que rellena:** H-04 (la prueba de lectura ([DOC 7])); H-10 (índice y presupuesto del horizonte); H-14 (el banco del tick en los días 176 y 179).

**Contradicciones de hecho que deja resueltas:** X-08 (Coste de CPU de la sonda en cada bloque); X-09 (¿La carrera sale idéntica con la sonda en cada bloque?); X-10 (¿Las fotos finas por la misma sonda son inocuas?); X-11 (¿El horizonte cuesta menos de 5 ms?); X-24 (Picos del tick).

**Del dueño:** [DUEÑO 4] (las cuatro preguntas); [DOC 7].

### §17 · El plan por pasos, tests primero

`borrador/17-plan.md` · 800 líneas · lote L9

**Contiene:**

1. **17.1 Reglas del plan.** Tamaños S (hasta 300 líneas de diff), M (hasta 800) y L; coste por PR (`typecheck` 37 s y `test:rapido` unos 9 min; los del motor, unos 73 min más); cada paso con «tests primero», «PR», «¿motor?», «visible» y «se revierte con» (D-53, D-54).
2. **17.2 Los trece pasos.** La tabla de §G.10 con sus unos 22 PR.
3. **17.3 Paso 0 · Red y línea base.** `@fastify/compress`, los contratos de `stageReplaySchema` y de las noticias en `contracts.test.ts`, el inventario de rutas, y B6 y B17 de línea base.
4. **17.4 Paso 1 (1a, 1b) · Noticias con datos, antes del reinicio.** `0046`, `renderNews` en `packages/shared`, `text` de compatibilidad, `gc_lead_taken` y `jersey_taken`; B4; va en paralelo por su plazo (D-45, I-13, O-06).
5. **17.5 Paso 2 · La voz causal.** `live` y `revealS` desde lo guardado; B19 con cinco etapas congeladas (D-43).
6. **17.6 Paso 3 (3a API, 3b dominio web, 3c pantalla) · `Watch` para el dueño sobre la radio de hoy.** El adaptador, el reloj estimado y `BROADCAST_WATCH=admins` (D-07, I-45).
7. **17.7 Paso 4 (4a ganchos, 4b grabador) · El único que toca `packages/engine`.** `onEvent`, `onBanner`, `onTimeTrialRide`, `timelineRecorder`, `selfCheckI1` y `TIMELINE`; B10 y B11; retira la copia de `renderNews` del motor; añade a `GROUP_NOUNS` `the gruppetto` y las filas de las plantillas nuevas (§12.5, §12.6); paga los bancos y NO sube la versión.
8. **17.8 Paso 5 · Grabar la línea.** `0047`, el colector aparte, `writeStageTimeline` y `TIMELINE_RECORD`; B15 sobre los días 176 y 179.
9. **17.9 Paso 6 (6a línea, 6b rótulos y crono) · La retransmisión exacta.** `instantAt` sobre la línea, `wornJerseys`, `palmaresTitleSource`, `breakHeadline`, las plantillas nuevas de §12.5 y la crono; B2, B3, B21 y B22; el re-sello de `raceRadioNames.test.tsx`.
10. **17.10 Paso 7 (7a datos y rutas, 7b ruta de etapa) · Lo visto y la etapa cerrada.** `0048`, `race_watch`, `watch.ts` y las rutas `/api/me/…`; B1 nace con la lista de pendientes; `SPOILER_MODE=admins`; B14.
11. **17.11 Paso 8 (8a, 8b) · El horizonte en toda la API.** `0049`, `Horizon` obligatorio, `veilSql`, los mecanismos y `registerSpoilerGuard`; cada PR vacía sus pendientes; B12 y B13; el 8b cierra el destripe (B1 en verde en todas las rutas).
12. **17.12 Paso 9 (9a, 9b) · La web sin destripe.** La portada (`Continue watching`, `Ready to watch`, `While you were away`), puertas y avisos, la previa de la N+1 y las órdenes, `/report`, `usePageTitle`, `Story` que pasa a `Report`, la caché y `cs_viewer`.
13. **17.13 Paso 10 (10a, 10b) · Previa, cierre, modos y encendido.** `StagePreviewCards`, `StageClosingCards`, `Highlights`, el digest y los mandos; el móvil medido a mano (D-56); la prueba de lectura (D-60); B17 otra vez; los dos interruptores a `on`.
14. **17.14 Paso 11 · La radio desde la línea.** `radioFromTimeline`, B16 y DD-11 (D-16, O-16).
15. **17.15 Paso 12 · Cierre.** La semilla neutra y el re-sello único (B5); `narrate` fuera; `docs/balance.md` l. 14684-14686 corregido y el defecto de los 138 s anotado; `docs/navegacion.md` §7.1-7.4; `docs/ops.md`; DD-19 (D-58, H-02).
16. **17.16 Orden y dependencias.** El grafo de pasos: el camino del dueño (0, 2, 3), el del motor (4, 5, 6) y el del destripe (7, 8, 9); el 1 en paralelo por el plazo; el 10 exige el 6 y el 9; el 11 exige el 5 y el 6.
17. **17.17 Lo primero que ve el dueño y lo que cierra el destripe.** El paso 3 y el 8b (D-54).
18. **17.18 Encendido y marcha atrás.** `admins` desde el 3 (`Watch`) y desde el 7 (el velo); `on` al cerrar el 10 con B1 en verde y la prueba de lectura aceptada; la tabla por paso de «se revierte con» (D-53).
19. **17.19 Entre el despliegue y el reinicio.** Las etapas corridas en ese hueco (D-61, H-16) y el reinicio dentro del plan: la `0046` antes; `race_watch` se borra; `text` hasta una versión de web después (DD-19).

**Escribe entero:** la tabla de pasos con sus columnas; por paso, la lista de tests primero con su fichero y sus casos.

**Sale de:** `ingeniero.md` §14 (base del plan); `estado.md` §14; `producto.md` §14; `datos.md` §14; `television.md` §14; mapa 07 §4; ejecutabilidad §4-§6; juez del motor §6 (O-motor-10, O-motor-11).

**Decisiones que escribe como hechos:** D-07 (El adaptador de la radio para las etapas sin línea); D-45 (Las noticias: primera migración, con plazo); D-53 (Los interruptores y la marcha atrás); D-54 (El plan); D-58 (Los documentos que se corrigen); D-60 (La prueba de lectura como puerta del encendido); D-61 (Las etapas corridas entre el despliegue y el reinicio).

**Injertos que recibe:** I-13 (`NewsPayload` y la migración de noticias primera); I-30 (B1b diferencial y B1c de dos desenlaces); I-45 (interruptores y `Watch` en el paso 3).

**Objeciones que resuelve:** O-06 (la migración de `news`, tarde); O-16 (I1 no cubre la capa de detalle).

**Huecos que rellena:** H-02 (la contradicción 5 del mapa 05 y el 17d); H-04 (la prueba de lectura ([DOC 7])); H-16 (las etapas entre el despliegue y el reinicio).

**Contradicciones de hecho que deja resueltas:** X-05 (¿Subir la versión tira las crónicas guardadas?); X-22 (Qué PR pagan los bancos y cuál es la próxima migración).

**Del dueño:** DD-11, DD-19; [DOC 1] (el plazo), [DOC 7] (la puerta del encendido).

### §18 · Rendimiento y móvil

`borrador/18-rendimiento.md` · 280 líneas · lote L7

**Contiene:**

1. **18.1 El cliente.** El parse y el Zod del tramo mayor, `instantAt` por fotograma, `overlayHz` y `barHz`; B8 (mapa 07 §7).
2. **18.2 El servidor.** Decodificar, cortar y comprimir una petición, de 1,3 a 4,7 ms (medido por `datos`, §10.5); el LRU; `computeHorizon` con B14; el memo.
3. **18.3 El tick.** La CPU de la sonda y del grabador, los días 176 y 179, B15 y `TIMELINE_RECORD` como freno.
4. **18.4 La escritura del progreso.** Una escritura por minuto real y espectador como mucho; el umbral, sin evidencia de los jueces (D-55, H-18).
5. **18.5 El móvil, medido a mano.** No hay Playwright ni Puppeteer en ningún `package.json`; el protocolo (Chrome, 360 × 800, CPU ×4, `race-colombia` e5 y la e18); los umbrales (≥ 30 fps, ninguna tarea por encima de 50 ms, primera pintura de `Watch` ≤ 2 s con «Fast 4G»; sin evidencia de los jueces); qué se baja si no se cumple; las anchuras del mapa 03 §7 (estimadas sobre clases de Tailwind) (D-56, H-09, [DOC 6]).
6. **18.6 `BottomNav` escondido mientras se reproduce.** 56 px (`BottomNav.tsx` l. 22-70), como propuesta a E6 (I-26).
7. **18.7 La red.** Pausa y `Connection lost · Retry` (pantalla) (D-57, H-21).
8. **18.8 La accesibilidad.** `aria-live="polite"`, `prefers-reduced-motion`, parciales con signo y maillots por forma (`navegacion.md` l. 455-457) (D-57, H-22).
9. **18.9 Las medidas pendientes.** Con su hueco para la cifra y la fecha: B21 (la posición extrapolada), B22 (el reloj estimado), B15 y el móvil.

**Escribe entero:** la tabla de presupuestos (qué, medido o estimado, umbral, banco y paso).

**Sale de:** mapa 07 §7; mapa 03 §7; `datos.md` §10.5-10.6; `ingeniero.md` §5.3; `television.md` §5.5; ejecutabilidad (H-ejecutabilidad-02, 05 y 06); juez del motor §2.1.

**Decisiones que escribe como hechos:** D-55 (La carga de escritura del progreso); D-56 (El móvil, medido a mano); D-57 (La red, dos dispositivos y la accesibilidad).

**Injertos que recibe:** I-26 (esconder `BottomNav` (propuesta a E6)).

**Objeciones que resuelve:** ninguna.

**Huecos que rellena:** H-09 (el móvil, medido); H-18 (la carga de escritura del progreso); H-21 (fallos de red); H-22 (accesibilidad).

**Contradicciones de hecho que deja resueltas:** X-08 (Coste de CPU de la sonda en cada bloque); X-24 (Picos del tick).

**Del dueño:** [DOC 6].

### §19 · Riesgos y fronteras

`borrador/19-riesgos.md` · 280 líneas · lote L9

**Contiene:**

1. **19.1 Riesgos, con su defensa.** Tabla: la táctica mueve el motor a la vez (R23.x; B7 e I1 en la suite rápida); plantillas nuevas (R23.8 `card_changed` cae en la regla por defecto de `REVEAL_RULES` y B7 obliga a darle destino); el salto de 138 s (O-21, H-12); una subida de versión antes del 17d (O-05, H-02, C16); la numeración de migraciones; las pestañas abiertas con la web de ayer; el reloj estimado (H-16); el coste del horizonte; los días pico del tick; la compresión de producción (H-15); las fugas que se dejan libres a propósito (L), con su motivo; el móvil sin medir; el racimo en vivo y la posición extrapolada, sin medir.
2. **19.2 Las fronteras.** Tabla por encargo (E3, E4, E5, E6, E9, E10, E12, E13 y la táctica) con «lo que E2 hace» y «lo que deja» (D-62); la regla para E9 (I-40, H-08) y `BottomNav` para E6 (I-26).
3. **19.3 La táctica.** La Frontera 3 intacta (`StageOutput` no gana campos, `tactica.md` l. 246-249); R23.7 resuelto por la pertenencia completa; R23.4 en `breakHeadline`; R23.8; el 17d es suyo.
4. **19.4 Lo que E2 no hace.** La frontera de `encargos.md` (mapa 05 §7).
5. **19.5 La doctrina de versiones.** Escrita para quien venga después: toda subida de `ENGINE_VERSION` va detrás del 17d; subirla no tira las crónicas guardadas, rompe la «Last race» que re-simula (`raceReport.ts` l. 148) (D-09, D-58).
6. **19.6 Lo que no se ha podido comprobar.** La lista final de `00-decisiones.md`, para la fase adversaria.

**Escribe entero:** la tabla de riesgos y la de fronteras.

**Sale de:** §15 de las cinco propuestas; mapa 05 §7 y §11; mapa 01 §6; juez del motor §7; cobertura §7; ejecutabilidad §7.

**Decisiones que escribe como hechos:** D-09 (`ENGINE_VERSION` no sube en E2); D-58 (Los documentos que se corrigen); D-61 (Las etapas corridas entre el despliegue y el reinicio); D-62 (Las fronteras).

**Injertos que recibe:** I-26 (esconder `BottomNav` (propuesta a E6)); I-40 (lo que se ve de otros; la regla para E9).

**Objeciones que resuelve:** O-05 (subir la versión sin necesidad); O-21 (el salto de un corredor, sin acotar).

**Huecos que rellena:** H-02 (la contradicción 5 del mapa 05 y el 17d); H-08 (dos jugadores en km distintos (E9)); H-12 (el salto de 138 s); H-15 (Postgres de producción y TOAST).

**Contradicciones de hecho que deja resueltas:** X-04 (¿Hace falta subir ENGINE_VERSION?); X-05 (¿Subir la versión tira las crónicas guardadas?).

**Del dueño:** nada propio.

### §20 · Decisiones que son del dueño

`borrador/20-dueno.md` · 220 líneas · lote L10

**Contiene:**

1. **20.1 Cómo se lee.** Cada decisión con su valor por defecto (que es el que se implementa), la consecuencia, dónde se cambia (constante, interruptor o paso) y la cifra que la informa.
2. **20.2 La tabla.** DD-01 a DD-20 enteras (de `00-decisiones.md` §DD), con una columna más: «si el dueño dice lo contrario, qué cambia y en qué sección».
3. **20.3 Las que llevan cifra.** DD-01 (alguna etapa velada 260 de 364 días; 7, 29 y 42), DD-02 (56 frente a 28 días de juego), DD-03 (de 28 a 49 min al día, 73 con reinas largas; de 8 a 24 en `Highlights`), DD-04 (el re-sello de los 140 tests del journal), DD-06 (el Giro de la temporada 0 sin campeón) y DD-11 (unos 40 MB por temporada).
4. **20.4 Lo que el dueño ya decidió y acota a E2.** [DUEÑO 7] (la criba aparcada), [DUEÑO 9] (nada en vivo), la D7 («no cambies el motor, cambia el race radio») y la C7 (un solo concepto con el mismo nombre) (mapa 05 §2.7).
5. **20.5 Lo que el dueño ve antes de encender.** `Watch` sobre la radio de hoy en el paso 3 y la prueba de lectura en el 10.

**Escribe entero:** la tabla DD-01 a DD-20 con su columna de consecuencias.

**Sale de:** §16 de las cinco propuestas; `00-decisiones.md` §DD; mapa 05 §2.7.

**Decisiones que escribe como hechos:** ninguna propia (cita por su id las que necesite).

**Injertos que recibe:** ninguno.

**Objeciones que resuelve:** O-04 (campeones desde el primer día tras el reinicio); O-09 (las 8 de cabecera no son del dueño).

**Huecos que rellena:** H-01 (campeones antes del primer nacional); H-19 (minutos al día de seguir una vuelta).

**Contradicciones de hecho que deja resueltas:** X-19 (Coste diario de seguir una gran vuelta).

**Del dueño:** DD-01 a DD-20; [DUEÑO 7], [DUEÑO 8], [DUEÑO 9].

### §21 · Apéndices: injertos, objeciones, cobertura y vocabulario

`borrador/21-apendices.md` · 640 líneas · lote L10

**Contiene:**

1. **21.1 Apéndice A · Los 49 injertos y dónde cayeron.** Id, origen (propuesta y sección), qué, sección donde cayó (según los bloques «Injertos aplicados» de cada fichero, que el ensamblador contrasta con `veredicto.json`) y decisión; y la tabla de alias de §G.13 (nombre de la propuesta y nombre del documento).
2. **21.2 Apéndice B · Las objeciones y lo desestimado.** Las 32 objeciones con su respuesta (id, contra qué propuesta, qué, resolución y sección); las 24 afirmaciones de hecho desestimadas o matizadas (X-01 a X-24: qué dijo cada propuesta, el veredicto y la evidencia); los descartes de `00-decisiones.md`, agregados por decisión.
3. **21.3 Apéndice C · Cobertura.** Los seis puntos del encargo; [DUEÑO 1] a [DUEÑO 10]; [DOC 1] a [DOC 7]; las quince contradicciones del mapa 05 §6; las 48 superficies (remite a §11.1); los 23 huecos; las 14 decisiones sin evidencia de los jueces y el banco que las mide. Son las tablas de §D de este esqueleto, comprobadas contra el texto final.
4. **21.4 Apéndice D · Vocabulario.** §G.1 (palabras de la prosa), §G.2 (ficheros), §G.4 (funciones), §G.11 (términos de pantalla) y §G.12 (identificadores) del glosario, con los bloques «Propuesto para el glosario» ya fundidos; los tipos están en §4, las constantes en §15, las rutas en §14, las tablas en §13, los bancos en §16 y los pasos en §17.

**Escribe entero:** las tablas de los cuatro apéndices.

**Sale de:** `juicios/veredicto.json`; §D de este esqueleto; `00-decisiones.md`; `00-glosario.md`.

**Decisiones, injertos, objeciones, huecos y contradicciones:** todos, como tablas: los 49 injertos en el apéndice A; las 32 objeciones, las 24 contradicciones de hecho y los descartes en el apéndice B; los 23 huecos y las 14 decisiones sin evidencia de los jueces en el apéndice C.

**Del dueño:** todos los [DUEÑO n] y [DOC n], como tabla.

---

## C. Los lotes

Diez lotes para los redactores de la fase 3b; los correctores de la fase 5 trabajan por estos mismos lotes (`04-fase-refutacion.md` §5). Cada redactor lee `00-encargo.md`, este esqueleto, `00-glosario.md`, `00-decisiones.md`, `juicios/veredicto.json`, `propuestas/ingeniero.md` entera (la base) y las fuentes que citan las entradas de §B de sus secciones.

| Lote      | Secciones                                                                              | Líneas     | Depende de                                                                                           | Lee además (si ya está) | Ola |
| --------- | -------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- | ----------------------- | --- |
| L1        | §1 (Diagnóstico medido), §2 (Principios), §3 (El reloj, el espacio y la identidad)     | 930        | ninguno                                                                                              | nada más                | 1   |
| L2        | §4 (El modelo de tipos), §15 (Las constantes)                                          | 1.230      | ninguno: es la raíz (tipos y constantes)                                                             | §3                      | 1   |
| L3        | §5 (Lo que el motor guarda al correr la etapa), §13 (El esquema y las migraciones)     | 980        | L2 (tipos de §4.2 y §4.3; `TIMELINE`)                                                                | §3                      | 2   |
| L4        | §6 (El estado en pantalla), §8 (El ritmo y el montaje)                                 | 1.160      | L2 (`Instant`, `Cue`, `BroadcastHead`; `BROADCAST`)                                                  | §3, §7                  | 2   |
| L5        | §7 (Los rótulos y la regla de maillots), §9 (La contrarreloj)                          | 920        | L2 (`RiderCard`, `ChampionTitle`, `TimeTrialTrace`, `TimeTrialInstant`; `BROADCAST`)                 | §5, §6                  | 2   |
| L6        | §10 (Sin destripe (I)), §14 (La API y el contrato)                                     | 1.160      | L2 (`Horizon`, `VeilDelta`, los tipos de la red; `SPOILER`)                                          | §5, §13                 | 2   |
| L7        | §11 (Sin destripe (II)), §18 (Rendimiento y móvil)                                     | 1.100      | L2 y L6 (los mecanismos de §10.6, el registro y las rutas de §14)                                    | §6, §8, §12             | 3   |
| L8        | §12 (La voz, el acta y las noticias), §16 (Los bancos y los tests)                     | 1.260      | L2 (las constantes que miden los bancos), L3 (lo que se guarda y sus topes) y L6 (B1 y el horizonte) | §6, §7, §9              | 3   |
| L9        | §17 (El plan por pasos, tests primero), §19 (Riesgos y fronteras)                      | 1.080      | L2, L3, L6 y L8 (tipos, migraciones, rutas y bancos)                                                 | todas las demás         | 4   |
| L10       | §0 (Cabecera y resumen ejecutivo), §20 (Decisiones que son del dueño), §21 (Apéndices) | 1.040      | todos                                                                                                | todas                   | 5   |
| **Total** | 22 secciones                                                                           | **10.860** |                                                                                                      |                         |     |

Reglas de dependencia:

- El plan (L9) necesita los tipos (L2), las migraciones (L3), las rutas (L6) y los bancos (L8); los bancos (L8) necesitan las constantes (L2), lo que se guarda (L3) y el horizonte (L6); todo lo demás necesita los tipos y las constantes (L2).
- Olas: 1 (L1 y L2), 2 (de L3 a L6), 3 (L7 y L8), 4 (L9) y 5 (L10). Si el orquestador lanza varias olas a la vez, el glosario y las decisiones son el contrato: el redactor no espera, usa los nombres y las decisiones tal cual y remite por `§N.m` a las subsecciones que fija §B; el ensamblador comprueba después que las remisiones casan.
- «Lee además» es lectura recomendada si la sección ya está escrita; si no, el redactor no la adivina: remite a ella por su número.
- L10 va el último porque el apéndice A se escribe con los bloques «Injertos aplicados» de todas las secciones. Si tiene que empezar antes, escribe sus tablas desde §D de este esqueleto y el ensamblador las corrige contra los bloques.

---

## D. Trazabilidad

Las cuatro primeras tablas salen de `juicios/veredicto.json` y de `00-decisiones.md` sin tocar; las demás son del esqueleto.

### D.1 Injerto → sección (los 49 de `veredicto.json`, en su orden)

| Injerto | Origen                                           | Qué                                                      | Secciones         | Decisión               |
| ------- | ------------------------------------------------ | -------------------------------------------------------- | ----------------- | ---------------------- |
| I-01    | `estado.md` §3.1-3.3, §3.7                       | la línea temporal de estado y el corte diagonal          | §3, §4            | D-02                   |
| I-02    | `estado.md` §3.9, §11                            | invariantes I1, I2, I3 e I5 y la autocomprobación        | §4, §5, §16       | D-02, D-12             |
| I-03    | `estado.md` §3.6                                 | marcas de reloj en cuatro sitios                         | §3, §4, §5        | D-01                   |
| I-04    | `estado.md` §3.5                                 | identidad con sucesor, histéresis y título por bloque    | §3, §6            | D-03                   |
| I-05    | `estado.md` §3.1, §8.1                           | foto frente a instante; la radio desde el estado         | §3, §11, §12      | D-16                   |
| I-06    | `estado.md` §11                                  | `onEvent` y el bloque de emisión                         | §4, §5            | D-05                   |
| I-07    | `estado.md` §3.5, §8.1                           | un código de papel de grupo                              | §6, §12           | D-18                   |
| I-08    | `estado.md` §9 (y datos §9, television §9)       | tipos y traza de la crono                                | §9                | D-23                   |
| I-09    | `datos.md` §10.1, §10.5-10.6                     | `stage_timelines` en `bytea` con gzip 9                  | §5, §13, §14      | D-10                   |
| I-10    | `datos.md` §3.4, §7.2, B9                        | visibilidad por dato y corte causal                      | §4, §10, §14, §16 | D-06                   |
| I-11    | `datos.md` §6.1, §7.4, B13                       | procedencia `from` del reparto congelado                 | §7, §10, §11      | D-15, D-37             |
| I-12    | `datos.md` §11 punto 2, B10, B11                 | colector aparte, B10 y B11                               | §5, §16           | D-08, D-09             |
| I-13    | `datos.md` §8.3, §10.2, §10.7                    | `NewsPayload` y la migración de noticias primera         | §12, §13, §17     | D-45                   |
| I-14    | `datos.md` §8.2                                  | `pickVariant` con `since`; semilla neutra                | §12               | D-46                   |
| I-15    | `datos.md` §3.4, §10.3                           | la meta solo por `POST …/broadcast/finish`               | §8, §14           | D-06                   |
| I-16    | `datos.md` §10.7                                 | `schema.parse` y `satisfies`; el contrato de hoy         | §14               | D-50                   |
| I-17    | `datos.md` §10.4 (y H-motor-04)                  | formato plano de enteros, `format` y guarda de tipos     | §4, §14           | D-10                   |
| I-18    | `television.md` §11.1                            | `onBanner`                                               | §5                | D-09                   |
| I-19    | `television.md` §3.3, §11.2                      | el tiempo congelado                                      | §5, §6, §8        | D-14                   |
| I-20    | `television.md` §11.3 (y estado §11, datos §3.4) | `REVEAL_RULES` y caídas desde `incidents`                | §4, §5            | D-05, D-13             |
| I-21    | `television.md` §3.5, §5.3, §12                  | cola de rótulos, `Next action` y `While you skipped`     | §6, §8            | D-20, D-21             |
| I-22    | `television.md` §5.2, §6.4, §8.3, §10.2          | previa de cuatro cuadros y cierre                        | §6, §8            | D-22                   |
| I-23    | `television.md` §6.4                             | notoriedad sin fama; el corredor propio siempre nombrado | §7                | D-26                   |
| I-24    | `television.md` §6.1-6.3                         | la regla UCI completa del maillot                        | §7                | D-24                   |
| I-25    | `television.md` §8.3 (y estado §8.2)             | titulares de cambio de líder                             | §12               | D-45                   |
| I-26    | `television.md` §5.5                             | esconder `BottomNav` (propuesta a E6)                    | §18, §19          | D-56                   |
| I-27    | `television.md` §7.5 (y producto §7.10-7.11)     | `PreStageInfo` para títulos y avisos                     | §11               | D-42                   |
| I-28    | `producto.md` §7.1-7.4                           | horizonte y velo: grados, prefijo, alcances y caducidad  | §10, §11          | D-28, D-30, D-31, D-32 |
| I-29    | `producto.md` §1.7, §7.5, §7.6                   | las 48 superficies y las puertas X1 a X9                 | §11               | D-41                   |
| I-30    | `producto.md` §13, §14                           | B1b diferencial y B1c de dos desenlaces                  | §16, §17          | D-54                   |
| I-31    | `producto.md` §7.8                               | la cookie `cs_viewer`                                    | §10               | D-34                   |
| I-32    | `producto.md` §7.4, §7.5 (X5), §10.2             | caché de la web: `rev`, `clear()` y `no-store`           | §10, §14          | D-35                   |
| I-33    | `producto.md` §7.4 (y datos §10.1)               | memo del horizonte y `last_seen_at`                      | §10, §13          | D-33                   |
| I-34    | `producto.md` §10.1 (0048)                       | rastro de etapa y `stage_team_results.prize`             | §11, §13          | D-41, D-49             |
| I-35    | `producto.md` §7.7                               | revelar sin castigo                                      | §11, §16          | D-38                   |
| I-36    | `producto.md` §7.10, §7.12                       | `og:` neutras y las dos formas de compartir              | §11, §14          | D-36, D-42             |
| I-37    | `producto.md` §7.8-7.9, §12                      | la portada y `While you were away`                       | §8, §11           | D-39                   |
| I-38    | `producto.md` §5, §12                            | ritmo por zona de km, sin pausas                         | §8                | D-19                   |
| I-39    | `producto.md` §2 principio 4, §7.4               | la existencia también informa                            | §11               | D-32, D-45             |
| I-40    | `producto.md` §7.15                              | lo que se ve de otros; la regla para E9                  | §11, §19          | D-41                   |
| I-41    | `producto.md` §8.4                               | los narradores sobrantes                                 | §12               | D-47                   |
| I-42    | `producto.md` §7.14                              | agregados con su fecha de horizonte                      | §11               | D-32, D-41             |
| I-43    | `ingeniero.md` §8.2 (base)                       | la voz por truncado, cinco pasadas apagadas              | §12               | D-43                   |
| I-44    | `ingeniero.md` §8.2 (tabla, fila 4) (base)       | racimos en vivo al cerrar su ventana                     | §12               | D-43                   |
| I-45    | `ingeniero.md` §7.4, §14 (base)                  | interruptores y `Watch` en el paso 3                     | §14, §17          | D-07, D-53, D-54       |
| I-46    | `ingeniero.md` §4.2, §6.4 (base)                 | `Pulling:` y a quién se nombra                           | §6, §7            | D-27                   |
| I-47    | `ingeniero.md` §6.3 (base)                       | icono de campeón con forma                               | §7                | D-25                   |
| I-48    | `ingeniero.md` §12 (base)                        | constantes en `packages/shared`                          | §15               | D-52                   |
| I-49    | `ingeniero.md` §7.2, §7.4 (base)                 | `Horizon` obligatorio, `veilSql` y el registro           | §10, §14          | D-32                   |

### D.2 Objeción → sección (las 32)

| Objeción | Contra              | Qué                                            | Secciones     | Decisión   |
| -------- | ------------------- | ---------------------------------------------- | ------------- | ---------- |
| O-01     | producto            | fotos finas por la misma sonda                 | §5            | D-08       |
| O-02     | producto            | pasadas sin lista ni longitud de etapa         | §12           | D-43       |
| O-03     | producto            | campeón sub-23 en élite                        | §7            | D-24, D-25 |
| O-04     | producto            | campeones desde el primer día tras el reinicio | §7, §20       | D-25       |
| O-05     | producto, estado    | subir la versión sin necesidad                 | §5, §19       | D-09       |
| O-06     | producto, estado    | la migración de `news`, tarde                  | §13, §17      | D-45, D-49 |
| O-07     | producto            | nombre y equipo de hoy en titulares viejos     | §12           | D-45, D-46 |
| O-08     | producto            | el visitante que abre el acta                  | §11           | D-36       |
| O-09     | producto            | las 8 de cabecera no son del dueño             | §10, §20      | D-30       |
| O-10     | producto, ingeniero | dos vocabularios del grupo                     | §6, §12       | D-18       |
| O-11     | producto, ingeniero | crono sin tipo o con dos controles             | §9            | D-23       |
| O-12     | producto, ingeniero | ritmo sin medir o que comprime los finales     | §8            | D-19       |
| O-13     | producto, ingeniero | reloj sin marcas; reloj estimado sin medir     | §3, §4        | D-01, D-07 |
| O-14     | estado              | el motivo guardado por índice                  | §4            | D-10       |
| O-15     | estado              | `json` en vez de `bytea`                       | §5, §13       | D-10       |
| O-16     | estado              | I1 no cubre la capa de detalle                 | §16, §17      | D-16       |
| O-17     | estado              | horizonte sin índice por corredor              | §10, §13, §16 | D-33       |
| O-18     | estado, ingeniero   | la caché y la sesión de 7 días                 | §10           | D-34, D-35 |
| O-19     | estado              | las constantes en el motor                     | §15           | D-52       |
| O-20     | estado              | tramos por espacio; lo servido como visto      | §10, §14      | D-06, D-28 |
| O-21     | estado              | el salto de un corredor, sin acotar            | §3, §19       | D-01, D-58 |
| O-22     | estado              | la línea que no cumple I1: nota y salida       | §5            | D-12       |
| O-23     | estado              | la CPU inflada; el banco del día pico          | §16           | D-12       |
| O-24     | ingeniero           | «ninguna frase nueva»                          | §12           | D-44       |
| O-25     | ingeniero           | la meta en el último tramo                     | §14           | D-06       |
| O-26     | ingeniero           | `Catch up at ×4` y caducidad de 28 días        | §10, §11      | D-31, D-39 |
| O-27     | ingeniero           | de plantilla a tipo de rótulo                  | §6            | D-21       |
| O-28     | ingeniero           | `sendBeacon` contra una ruta `PUT`             | §14           | D-51       |
| O-29     | ingeniero           | previa y cierre mínimos                        | §8            | D-22       |
| O-30     | ingeniero           | `ITA CHAMP` no es televisión                   | §7            | D-25       |
| O-31     | ingeniero           | el registro solo de `GET`                      | §14           | D-32       |
| O-32     | ingeniero           | puertas sin mecanismo; el presupuesto          | §11           | D-41       |

### D.3 Hueco → sección (los 23)

| Hueco | Qué                                          | Secciones     | Decisión   | Sin evidencia de los jueces |
| ----- | -------------------------------------------- | ------------- | ---------- | --------------------------- |
| H-01  | campeones antes del primer nacional          | §7, §20       | D-25       | no                          |
| H-02  | la contradicción 5 del mapa 05 y el 17d      | §5, §17, §19  | D-09, D-58 | no                          |
| H-03  | la criba lejana ([DUEÑO 7])                  | §6            | D-59       | no                          |
| H-04  | la prueba de lectura ([DOC 7])               | §16, §17      | D-60       | sí                          |
| H-05  | notoriedad sin `fame`                        | §7            | D-26       | sí                          |
| H-06  | el dueño, espectador y depurador             | §11           | D-40       | sí                          |
| H-07  | lugares, avituallamiento y tiempo            | §6            | D-14, D-59 | no                          |
| H-08  | dos jugadores en km distintos (E9)           | §11, §19      | D-41       | no                          |
| H-09  | el móvil, medido                             | §18           | D-56       | sí                          |
| H-10  | índice y presupuesto del horizonte           | §10, §13, §16 | D-33       | no                          |
| H-11  | el reinicio y las tablas sin `world_id`      | §10, §13      | D-29       | no                          |
| H-12  | el salto de 138 s                            | §3, §19       | D-01, D-58 | no                          |
| H-13  | guarda de tipos y decodificador              | §4, §5        | D-10       | no                          |
| H-14  | el banco del tick en los días 176 y 179      | §16           | D-12       | no                          |
| H-15  | Postgres de producción y TOAST               | §5, §19       | D-10       | no                          |
| H-16  | las etapas entre el despliegue y el reinicio | §3, §17       | D-07, D-61 | sí                          |
| H-17  | qué segundo es la diferencia de un corredor  | §3, §6        | D-01, D-27 | no                          |
| H-18  | la carga de escritura del progreso           | §10, §18      | D-55       | sí                          |
| H-19  | minutos al día de seguir una vuelta          | §8, §20       | D-19       | no                          |
| H-20  | ver una cola seguida                         | §8, §11       | D-39       | sí                          |
| H-21  | fallos de red                                | §10, §18      | D-57       | sí                          |
| H-22  | accesibilidad                                | §18           | D-57       | sí                          |
| H-23  | dos dispositivos                             | §10           | D-57       | sí                          |

### D.4 Contradicción de hecho → decisión → sección (las 24)

| Contradicción | Tema                                                   | Decisión   | Secciones         |
| ------------- | ------------------------------------------------------ | ---------- | ----------------- |
| X-01          | ¿Hay reloj absoluto?                                   | D-01       | §1, §3            |
| X-02          | Monotonía del reloj                                    | D-01       | §1, §3            |
| X-03          | ¿Guardar desde la sonda sube ENGINE_VERSION?           | D-08, D-09 | §5                |
| X-04          | ¿Hace falta subir ENGINE_VERSION?                      | D-09       | §5, §19           |
| X-05          | ¿Subir la versión tira las crónicas guardadas?         | D-58       | §17, §19          |
| X-06          | Tamaño de la línea temporal                            | D-11       | §1, §5            |
| X-07          | json, jsonb o bytea                                    | D-10       | §5, §13           |
| X-08          | Coste de CPU de la sonda en cada bloque                | D-12       | §5, §16, §18      |
| X-09          | ¿La carrera sale idéntica con la sonda en cada bloque? | D-09       | §5, §16           |
| X-10          | ¿Las fotos finas por la misma sonda son inocuas?       | D-08       | §5, §16           |
| X-11          | ¿El horizonte cuesta menos de 5 ms?                    | D-33       | §1, §10, §13, §16 |
| X-12          | riders.fame                                            | D-26       | §1, §7            |
| X-13          | El campeón nacional                                    | D-25       | §1, §7            |
| X-14          | ¿Qué pasadas de la crónica miran el futuro?            | D-43       | §1, §12           |
| X-15          | Las fechas trucadas (a) y (f)                          | D-05       | §4, §5            |
| X-16          | Sesión de 7 días y caché                               | D-34, D-35 | §1, §10           |
| X-17          | Las 48 superficies y las rutas                         | D-32, D-41 | §1, §11, §14      |
| X-18          | Duración de la reproducción                            | D-19       | §8                |
| X-19          | Coste diario de seguir una gran vuelta                 | D-19       | §8, §20           |
| X-20          | Qué plan rompe la web de hoy                           | D-50, D-45 | §12, §14          |
| X-21          | Plantillas y narradores                                | D-44, D-47 | §1, §12           |
| X-22          | Qué PR pagan los bancos y cuál es la próxima migración | D-52, D-49 | §13, §15, §17     |
| X-23          | El formato guardado de la línea                        | D-10       | §4                |
| X-24          | Picos del tick                                         | D-12       | §16, §18          |

### D.5 Obligación de la síntesis (`03-fase-sintesis.md` §3a, punto 4) → sección

| Obligación                                                                                                          | Sección                |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Cabecera y resumen ejecutivo                                                                                        | §0                     |
| Diagnóstico medido                                                                                                  | §1                     |
| Principios                                                                                                          | §2                     |
| El modelo de tipos del estado y la línea temporal                                                                   | §3, §4                 |
| Lo que el motor guarda al correr la etapa (sonda, codificación, tamaños)                                            | §5 (el esquema, §13)   |
| El estado en pantalla: lo permanente, lo eventual, la capa fija, las cabeceras de grupo, las diferencias, el perfil | §6.2, §6.3, §6.5, §6.7 |
| Los rótulos y la regla de maillots                                                                                  | §7                     |
| El ritmo y el montaje                                                                                               | §8                     |
| La contrarreloj                                                                                                     | §9                     |
| Sin destripe: el horizonte y el velo                                                                                | §10.4-10.6             |
| La tabla de lo visto                                                                                                | §10.2-10.3, §13.4      |
| Las 48 superficies una a una                                                                                        | §11.1-11.2             |
| Rutas públicas                                                                                                      | §11.3, §11.10, §14.2   |
| Título de pestaña                                                                                                   | §11.8                  |
| Correos                                                                                                             | §11.9                  |
| Sesión y cookie                                                                                                     | §10.8                  |
| El que vuelve tras una semana                                                                                       | §11.4, §8.8            |
| «Dame el resultado»                                                                                                 | §11.11                 |
| El acta compartible                                                                                                 | §11.10                 |
| La previa de N+1                                                                                                    | §11.12                 |
| La crónica causal                                                                                                   | §12.2-12.4             |
| `news` con semilla y datos; las 11 plantillas                                                                       | §12.8, §13.2           |
| E10                                                                                                                 | §12.11                 |
| El esquema y las migraciones                                                                                        | §13                    |
| La API y el contrato                                                                                                | §14                    |
| Las constantes                                                                                                      | §15                    |
| Los bancos y tests                                                                                                  | §16                    |
| El plan por pasos con tests primero                                                                                 | §17                    |
| Rendimiento y móvil                                                                                                 | §18                    |
| Riesgos y fronteras                                                                                                 | §19                    |
| Decisiones del dueño                                                                                                | §20                    |
| Apéndices: injertos y dónde cayeron, objeciones desestimadas, cobertura del encargo y de los [DUEÑO n]              | §21.1-21.3             |

### D.6 El encargo (`00-encargo.md` §1, sus seis puntos) → sección

| Punto                                                                                                                                   | Sección                              |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1. Rehacer lo que el jugador lee de una carrera, con la televisión como norte                                                           | §6, §7, §8, §12 (el diagnóstico, §1) |
| 2. Un estado que evoluciona, con tipos; qué es permanente y qué eventual                                                                | §3, §4, §6                           |
| 3. Sin destripe por defecto, como propiedad del producto entero (portada, ranking, clasificaciones, feed, correo, título de la pestaña) | §10, §11, §14                        |
| 4. «El motor ya guarda los sucesos fechados», comprobado contra el código                                                               | §1.1, §4.7, §5                       |
| 5. El defecto de `news`                                                                                                                 | §12.8, §13.2, §17.4                  |
| 6. Los maillots de la escapada, con las cinco categorías y la interfaz para E3 y E12                                                    | §7                                   |

### D.7 [DUEÑO n] (mapa 05 §5.1) → sección

| Requisito                                                   | Sección                    |
| ----------------------------------------------------------- | -------------------------- |
| [DUEÑO 1] El norte de la televisión como estado permanente  | §6.2 (y §2)                |
| [DUEÑO 2] Sin destripe                                      | §10, §11                   |
| [DUEÑO 3] Cuando se escapan cinco, que se vean sus maillots | §7.2-7.6                   |
| [DUEÑO 4] Las cuatro preguntas en cualquier punto           | §6.2, §12.2, §16.5         |
| [DUEÑO 5] El corredor propio se ve aunque no sea noticia    | §6.2, §7.6-7.7             |
| [DUEÑO 6] Coherencia en el tiempo                           | §11.5, §11.12, §12.7       |
| [DUEÑO 7] La criba lejana, aparcada                         | §6.8, §20.4                |
| [DUEÑO 8] El visitante sin cuenta                           | §11.10, §20                |
| [DUEÑO 9] Nada de decidir en vivo                           | §2, §8.10, §20.4           |
| [DUEÑO 10] La radio sigue siendo el microscopio             | §5.1, §11.15-11.16, §12.10 |

### D.8 [DOC n] (mapa 05 §5.2) → sección

| Requisito                                                        | Sección                                                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [DOC 1] `news` con `seed` y `data`, antes del reset              | §12.8, §13.2, §17.4                                                                            |
| [DOC 2] Un cursor por grupo sobre la altimetría                  | §6.2                                                                                           |
| [DOC 3] R23.4, R23.7 y R23.8                                     | §7.6 (R23.4), §7.7 (R23.7), §4.7 y §6.6 (R23.8), §19.3                                         |
| [DOC 4] Las dos preguntas abiertas de `docs/navegacion.md` §9    | §11.5 (etapas futuras: se conserva `Not raced yet`), §6.10 (la vista de espectador es `Watch`) |
| [DOC 5] «La API no puede mandar lo que la pantalla no enseña»    | §2.4, §10.11, §14.3                                                                            |
| [DOC 6] Móvil como plataforma y maillots distinguibles por forma | §18.5, §18.8, §7.4                                                                             |
| [DOC 7] El criterio del MVP paso 31 como prueba de lectura       | §16.5, §17.13                                                                                  |

### D.9 Contradicciones del mapa 05 §6 → sección

| Contradicción                                                                      | Sección                  |
| ---------------------------------------------------------------------------------- | ------------------------ |
| 1. Sin destripe contra la navegación                                               | §11.17, §17.15           |
| 2. Sin destripe contra la vista de espectador pública y la crónica que se comparte | §11.10                   |
| 3. La crónica ve el futuro                                                         | §12.2                    |
| 4. La tabla que no existe (`stages.radio`, `stage_runs`)                           | §1.6, §13.6              |
| 5. «Traducible y re-renderizable», con matices                                     | §4.3, §12.7-12.8, §17.19 |
| 6. Tres dueños para el arreglo de `news`                                           | §12.8                    |
| 7. Dos vocabularios del mismo grupo                                                | §6.3, §12.6              |
| 8. Cuatro nombres para un artefacto                                                | §6.10, §12.1             |
| 9. `narration.ts` medio muerto                                                     | §12.9                    |
| 10. «El del equipo» son dos cosas                                                  | §7.3                     |
| 11. «El mánager no elige nada» frente a las 12 semillas                            | §7.3                     |
| 12. Arcoíris y Mundial                                                             | §7.4, §19.2              |
| 13. Códigos que chocan (E1 a E13 contra los EPIC; dos «radios»)                    | §0.6                     |
| 14. El feed personal                                                               | §11.7                    |
| 15. Estado falso en los rectores (los correos existen)                             | §1.6, §11.9              |

### D.10 Decisiones sin evidencia de los jueces → quién las mide → sección

| Decisión | Qué se decidió sin juez                                                                      | Quién lo mide o lo acepta                    | Sección            |
| -------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------ |
| D-04     | la posición extrapolada del instante                                                         | B21, paso 6                                  | §3.3, §18.9        |
| D-07     | el umbral de 1 km del reloj estimado                                                         | B22, paso 6                                  | §3.8, §14.4        |
| D-12     | el interruptor `TIMELINE_RECORD`                                                             | B15, paso 5                                  | §5.5               |
| D-21     | la cola de rótulos sin freno                                                                 | B17 y la prueba de lectura                   | §6.5               |
| D-24     | la delegación que salta al campeón                                                           | DD-05                                        | §7.2               |
| D-25     | `Champion of Italy` en lugar de un gentilicio                                                | la prueba de lectura; E10                    | §7.4               |
| D-26     | `knownWins` como notoriedad                                                                  | B3 y la prueba de lectura                    | §7.5               |
| D-39     | la cola seguida: sin reproducción automática, la más antigua primero, filas separadas (H-20) | la prueba de lectura y el paso 9             | §8.8, §11.4        |
| D-40     | el modo diagnóstico `?diag=1`                                                                | test de ruta (no escribe `race_watch`)       | §11.15             |
| D-43     | la regla del racimo en vivo                                                                  | B19 antes de encender `liveClusters` (DD-18) | §12.3              |
| D-55     | el umbral de escritura del progreso                                                          | B14 con `recordProgress`, paso 7             | §10.3, §18.4       |
| D-56     | los umbrales del móvil                                                                       | medida a mano, paso 10                       | §18.5              |
| D-57     | la red, dos dispositivos y la accesibilidad                                                  | tests de pantalla, pasos 9 y 10              | §10.12, §18.7-18.8 |
| D-60     | nueve de nueve en la prueba de lectura                                                       | el propio protocolo, paso 10                 | §16.5              |

---

## E. Lo que este esqueleto fija por su cuenta

Además de `00-decisiones.md`, que no se reabre, este esqueleto fija cinco cosas de forma, una de sitio y una de fondo. Las de forma: (1) §4 es el único sitio con los bloques enteros de tipos y §15 el único con los de constantes; (2) la numeración `## N.` y `### N.m` y los bloques de cierre de cada fichero; (3) el título del documento, `La retransmisión: el estado de la carrera, a su hora y sin destripe (diseño final)`; (4) el apéndice D con la parte del glosario que no está en el cuerpo, para que `docs/retransmision.md` se lea sin `borrador/`; (5) los diez lotes y sus olas. La de sitio: `GROUP_NOUNS` vive en el motor (`packages/engine/src/sim/coherence.ts` l. 571), así que `the gruppetto` de D-18 y las filas de las plantillas nuevas de D-44 van en el PR 4a, el único que toca `packages/engine` (D-54); las plantillas se escriben en el 6b. La de fondo contesta la pregunta 3 de `docs/navegacion.md` §9 ([DOC 4]: abierta en `docs/navegacion.md` l. 492-493 y sin respuesta en ninguna propuesta): las etapas futuras de una carrera en curso se siguen enseñando con su recorrido y `Not raced yet`, como hoy (`Race.tsx` l. 397, mapa 03 §9), porque el recorrido no destripa; no la midió ni la pidió ningún juez.
