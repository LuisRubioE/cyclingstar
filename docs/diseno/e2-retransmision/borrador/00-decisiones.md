# Decisiones cerradas de `docs/retransmision.md` (E2 · La retransmisión)

Cada contradicción de hecho o de diseño entre las cinco propuestas queda aquí cerrada con una decisión y su evidencia. Los redactores las escriben como hechos y NO las reabren; si una sección necesita decidir algo que aquí no está, lo decide en un bloque «Decisión tomada aquí» y lo anota. Los nombres son los de `00-glosario.md`.

Cómo leer cada entrada. **Decisión**: lo que el documento final dice. **Evidencia**: de dónde sale, con el identificador del juicio (`C1` a `C18` son las comprobaciones del juez del motor, `juicios/motor.md` §2; «cobertura §2.n» y «ejecutabilidad #n» o «§2.1» son las de los otros dos jueces), el injerto (`I-nn`), la objeción (`O-nn`), el hueco (`H-nn`) o la contradicción (`X-nn`) de `juicios/veredicto.json`, y las líneas de código. **Descartado**: qué se propuso y no entra, y por qué. **Sección**: dónde se escribe (`§N` de `00-esqueleto.md`). Las entradas marcadas **Sin evidencia de los jueces** son decisiones que esta síntesis ha tenido que tomar sin que ningún juez las mida o las pida con mecanismo; el documento lo dice.

Árbol de referencia: HEAD `9c21885`, `ENGINE_VERSION` 89 (`packages/engine/src/constants.ts` l. 838), última migración `0042_transicion_e1` (`packages/db/drizzle/meta/_journal.json`, 43 entradas). Base: `ingeniero` por suma de puntuaciones (92,5), fundida con `estado`, `producto`, `datos` y `television` (ver `veredicto.json` → `ganadora`).

---

## Registro del ensamblado v0

Estas decisiones las corrigieron o precisaron las secciones con evidencia al escribirse (fase 3b), y el ensamblado (fase 3c) las lleva aquí para que el fichero diga lo mismo que el documento. Cada entrada tocada termina con un bloque «Corregida», «Precisada» o «Pendiente en el ensamblado v0», con la sección y la decisión que la cambiaron y, en cita, la versión anterior de cada frase. Las demás no cambian.

| Decisión | Cambio | Qué | Quién lo trae |
| --- | --- | --- | --- |
| D-04 | precisada | Se completa con lo que midió §3 y adoptó §4 (4-t); la decisión no cambia | §3.3, §4.5; decisiones 3-a, 3-b, 3-f y 4-t; medido por L1 con `l1/corte.mjs` y `l1/variantes.mjs` |
| D-05 | corregida | La fila del pinchazo de crono dice en qué km se lee el reloj propio, y se añaden el máximo de 4-g y las dos filas de 4-r | §4.7 (4-g, 4-r) y §9.6; duda de §9 |
| D-05 | corregida (fase 5) | La caída, y el pinchazo y la avería de carretera, se revelan con el grupo en que iba el corredor al final del bloque anterior (el rótulo salía 70,6 s tarde de mediana); `tt_catches` va a meta | §4.7 (4-v, 4-w); corrección L2, Rcobertura-009, Rcodigo-026, Rcodigo-025 |
| D-10 | corregida | El LRU baja de 64 a 16 entradas con la memoria medida | §5.6, §18.2; decisión 18-d; duda 3 de §5 |
| D-11 | corregida | Los topes pasan a 96, 640, 256 y 32 KB y el volumen por temporada, a unos 36 MB: los de la síntesis salían de formatos que no son el de §4.3, que no cabía en ellos (B6 habría nacido en rojo) | §5.7 y §15.2; duda 1 y 2 de §5, dudas de §13, §16 y §17; medido por L3 |
| D-11 | corregida (fase 5) | El tope de la crono pasa de 32 a 48 KB: la e10 de `race-italy` (42 km, 176 corredores) ocupa 32.203 bytes con `checkClockDs`, el 98,3 % del anterior | §15.2 (15-i); corrección L2, Rcodigo-014; `l3/grabador.mjs`, `rcod/n/grab2.mjs` |
| D-12 | precisada | Se añaden la lápida, que hace cierta la salida a `Report`, y la tolerancia del `kind` medida | §5.5; decisiones 5-i y 5-k |
| D-15 | precisada (fase 5) | El reparto lleva los favoritos por atributo de la previa, congelados con los atributos de antes del aprendizaje de la etapa | §4.2 (8-g, 4-u); corrección L2, Rcobertura-005, Rcodigo-036 |
| D-19 | precisada | El prólogo lleva también la medida de §9.4 con el último km real | §9.4, `l5/crono.mjs`; duda de §9 |
| D-21 | precisada (fase 5) | En una crono, `VIRTUAL GC` es de clase 2, y 3 si cambia el líder virtual: con la clase 1 de carretera la cola perdió uno de los siete de la e16 (medido); la ronda `ON COURSE` es de clase 0 y `TIME CUT` sigue en 2 | §9.5 (9-n); corrección L5, Rcobertura-032 a 034; `l5c/cola2.mjs` |
| D-23 | corregida | El km del pinchazo de crono no sale de la traza (el motor solo tiene `finishKm / 2`), la meta de la traza es entera y el prólogo lleva las dos medidas | §4.2 (4-f), §9.2 (9-a), §9.4 y §9.6; dudas de §4 y §9 |
| D-23 | precisada (fase 5) | La crono más larga de 176 corredores, `race-italy` e10 (42 km), ocupa 31.436 B, y 32.203 con `checkClockDs`: el 98,3 % del tope de entonces, que D-11 sube a 48 KB (15-i); por diferencias por km, 15.614 | §9.2; corrección L5, Rcobertura-031 (con Rcoste-007 y Rcodigo-014); `rcod/n/grab2.mjs`, `l5c/deltas.mjs` |
| D-25 | corregida | Son 17 países con nacional antes del día 179, no 22, y la vigencia usa la cota inferior estricta de 7-c | §7.4; decisión 7-c; duda de §7; medido por L5 con `l5/nacionales.mjs` |
| D-26 | corregida | La cuenta por el día de cada victoria no era cierta para una etapa ganada en una vuelta, que sigue velada hasta 56 días después de la ÚLTIMA etapa; cuentan las carreras terminadas hace más de `expiryGameDays` (7-e) | §7.5; decisión 7-e; dudas de §7 y §15 |
| D-27 | pendiente | la forma del nombre en `Pulling:` y en la barra: el ejemplo supone un apellido que el esquema no guarda | duda de §7; decisión 7-a |
| D-29 | precisada | La cota de filas y la carga de escritura siguen a §13.8 y a D-55 corregida; la decisión no cambia | §13.8, §10.3; duda 3 de §13 |
| D-30 | corregida (fase 5) | Fuera la cita de `captacion.md`, que es un mensaje de captación: el porqué del alcance es propio, con la cifra de todas las carreras en guardia (202 a la vez en la mediana, 669 como máximo); seguir al empezar a ver es un defecto que va a DD-01 | §10.4; corrección L6, Rdueno-023 y Rdueno-024; `c-l6/todas.mjs` |
| D-32 | precisada | Se añaden las firmas con `Horizon` que fijaron §5 y §14, el cuarto parámetro de `veilSql` y el registro medido | §5.6 (5-p), §10.6 (10-c, 10-d), §14.4 (14-p) y §14.5 (14-d) |
| D-33 | corregida | La forma de las consultas y la puerta de B14 cambian con lo que midió §18.2 | §18.2 (18-a), §16.4 (16-k), §20 (DD-21); medido por L7 con `l7/horizonte.mjs` y `l7/horizonte2.mjs` |
| D-33 | precisada (fase 5) | El código escribe la forma D, con `lastRunStages`; los memos del proceso tienen vida, barrido y tope (`SPOILER.horizonMemoEntries`), y `request.viewer()` memoriza la sesión | §10.3, §10.6, §10.7 (10-m, 10-n); corrección L6, Rcobertura-047, Rcoste-010, Rcoste-011; `coste/memo/memo.mjs`, `c-l6/veildelta-forma.mjs` |
| D-33 | precisada (fase 5) | B14 mide contra el Postgres de servicio del CI, y en PGlite solo informa y falla por encima de 15 ms; en PostgreSQL 16 sin red el jugador da 2,16 ms y el mánager 3,88, y DD-21 se mide desde el servicio `web` de Railway contra una copia de producción | §18.2, §18.9 (18-j); corrección L7, Rcoste-020 y Rcoste-012; `coste/pgm/horizonte-pg.mjs`, `horizonte-socket.mjs` y `progreso-socket.mjs` |
| D-35 | precisada (fase 5) | `cs_viewer` se renueva como mucho una vez al día, para que `Vary: Cookie` deje reutilizar un tramo; `clear()` no salta en la carga y las consultas con horizonte esperan al `rev` | §10.8, §10.9, §14.9, §14.11 (10-g, 14-m, 14-r); corrección L6, Rcoste-014, Rcoste-018, Rcodigo-057 |
| D-36 | precisada (fase 5) | El acta es indexable por defecto, como propone `docs/motor.md` l. 1510, y la elección es del dueño con DD-12: el robot de un buscador no lleva cookie y guarda su `og:description` con el ganador | §11.10; corrección L7, Rdueno-043 |
| D-39 | corregida | Una gran vuelta en digest no son unos 30 min sino de 38 a 43 con los cuadros, y el botón dice el número calculado; si el dueño quiere 30, bajan los presupuestos (DD-22) | §8.8 (8-b), §15.3 (`l2/digest.mjs`); dudas de §8, §15 y §20; DD-22 |
| D-40 | precisada (fase 5) | `?diag=1` vale también en la ficha de carrera y en el feed, con `worldHorizon`: el dueño caza defectos en las clasificaciones y en las noticias | §11.15 (11-h); corrección L7, Rdueno-039 |
| D-41 | precisada | Se añade la décima puerta que encontró §11.2 y la clase de la ruta del plan del equipo | §11.2 (11-b) y §11.3 (11-k) |
| D-41 | precisada (fase 5) | Los atributos de la ficha de cualquier corredor y las notas del preparador quedan libres por DD-08 (`sup. X11`, medido); el presupuesto del equipo se vela por defecto y la elección pasa al dueño (DD-26) | §11.2, §11.3 y §11.13 (11-r, 11-t); corrección L7, Rcodigo-061 y Rdueno-026; `rcod/n/b1/attrs.mjs` |
| D-43 | corregida | El orden de la voz es el de revelado (medido) y las pasadas son veintiuna; la regla del racimo gana la guarda de 12-d (nunca antes del revelado de ninguno de sus miembros), medida sin rótulos con 0 violaciones | §12.2 (12-a) y §12.3 (12-d); dudas de §12 |
| D-49 | corregida | Lo que D-49 decía del test no era cierto contra el código: la expresión de hoy solo ve `prize` | §13.7 (13-a); duda 1 y 4 de §13; medido por L3 con `l3/vivas.mjs` |
| D-50 | corregida | La lectura literal (`leaders` sin `afterStage`) rompía la web de ayer, y el resultado se omite cuando la pantalla no lo enseña | §14.1 (14-e) y §10.2 (10-e); nota del orquestador (L6) |
| D-51 | precisada | Se añaden el respaldo `text/plain` y el cuerpo de la meta | §14.2 (14-f, 14-g) |
| D-52 | precisada | Los 73 min son pruebas en serie, no tiempo de reloj ni de runner | §17.1, regla 4; nota del orquestador (L9) |
| D-53 | precisada (fase 5) | `PROGRESS_MIN_DELTA_S` frena sin desplegar la carga de escritura del progreso, que ningún interruptor frenaba sin apagar `Watch` | §15.8 (15-j); corrección L2, Rcoste-019 |
| D-53 | precisada (fase 5) | `AUTO_TICK` saca el tick del proceso del servicio `web` cuando existe el servicio `tick`: una etapa grande deja la web sin contestar de 3,3 a 4,8 s | §18.3 (18-k); corrección L7, Rcoste-039; `coste/b10/b10.mjs` |
| D-54 | precisada | Se añaden las fechas de B1d y de `PENDING_ROUTES` que fijó §17 | §17 (17-b, 17-n) |
| D-55 | corregida | No es una escritura por minuto sino unas cuatro: el umbral de 60 s no limita con la curva de §8.2, y 10-l añade el límite de una cada 15 s | §10.3 (10-l), §8.5 (8-d), §18.4; dudas de §8 y §18; nota del orquestador (L4, L6) |
| §DD | corregida | cinco decisiones nuevas del dueño (DD-21 a DD-25) y cifras de DD-06, DD-11, DD-12 y DD-13 | §20.2, §20.6 (20-a a 20-d) |
| §DD | corregida (fase 5) | DD-01 gana la tercera respuesta, todas las carreras, con su cifra, y seguir al empezar a ver una etapa | §10.4; corrección L6, Rdueno-023 y Rdueno-024; `c-l6/todas.mjs` |
| §DD | corregida (fase 5) | DD-08 cubre también los atributos de la ficha ajena; DD-12, el acta en los buscadores; DD-21 lleva la cifra de Postgres y se mide desde Railway; DD-01 dice lo que enseña la ficha de una carrera fuera de guardia; nace DD-26, el presupuesto del equipo con etapas veladas | §11.2, §11.5, §11.10, §11.13 y §18.2; corrección L7, Rcodigo-061, Rdueno-022, Rdueno-026, Rdueno-043 y Rcoste-012 |

---

## A. El tiempo, el espacio y el estado

### D-01 · El reloj: eje absoluto, no continuo por corredor

**Decisión.** Todos los `tS` están en un eje común: segundos desde la salida común, y el reloj de un grupo en un bloque es la hora de carrera a la que ese grupo cruza ese bloque (`Group.tS`, `group.ts` l. 26-27, nace en 0 en l. 56). Ese eje NO es continuo por corredor: al entrar en un grupo, el corredor adopta su reloj (`simulate.ts` l. 7863) y la deriva vuelve a 0 en el llano (l. 5536). Consecuencias, todas obligatorias:

1. El espacio (el bloque de 100 m) es canónico y el instante es una proyección (el corte diagonal, D-02 y D-04).
2. Nunca se reducen cambios de corredor en orden de reloj: estado lo probó y discrepa de la foto en el 0,3-12,5 % de los grupo-km (`estado.md` §3.3).
3. El reloj de la cabeza `L(b) = min_g r_g(b)` se fuerza monótono con un máximo acumulado: medido, 0 bajadas mirando por km y 0-2 por bloque de hasta 2,8 s (C3).
4. El hueco que se enseña es siempre la resta de los relojes de dos grupos en el MISMO bloque, en el último km de foto que ha cruzado el de detrás, que es como lo mide la moto de cronometraje (mapa 06 §1.4). Nunca el reloj de un corredor: el de la foto suma deriva y marcaje (`simulate.ts` l. 9012). El hueco de «tu corredor» es el de su grupo en el último punto común (H-17).
5. Marcas de reloj en cuatro sitios: cada foto de km; el nacimiento y la muerte de cada grupo; el bloque de cada cambio de su composición y el anterior; cada bloque del último km (`TIMELINE.lastKmMarkBlocks`). Entre marcas, interpolación lineal por bloque. Medido por estado (5 etapas × 3 semillas): error de posición p99 de 3 a 196 m, máximo 422 m (1,1 px en la altimetría de 720 px); sin las marcas de cambio de composición, Flandes llega a 3,5 km de error.
6. El motor llega a teletransportar a un corredor 138 s por delante (C4): un ataque que sale de un grupo que va detrás del grupo `peloton` se da por cazado con hueco negativo (`simulate.ts` l. 8678 y 8783; `race-colombia` e5, semilla 0, km 183,25). Es un defecto del motor que E2 NO arregla (sería conducta y subiría versión): lo tolera enseñando a ese corredor en tránsito (D-04) y lo deja escrito para el dueño (D-58).

**Evidencia.** C1, C2, C3, C4 y §2.2-2.3 del juez del motor; ejecutabilidad §2.3; I-01, I-03; O-13, O-21; H-12, H-17; X-01, X-02.
**Descartado.** «Los cambios de un corredor ocurren al reloj de su grupo nuevo (monótono)» (`television.md` §3.4): falso, 0-33 retrocesos por km y hasta 138 s por bloque (C4). «No hay reloj absoluto» (mapa 01 §0): lo que no existe es el instante, no el eje (C1). Interpolar con el km siguiente sin tránsito (`producto.md` §3.1, `ingeniero.md` §3.1): no dice qué hacer con un corredor que aparece 2 min por delante.
**Sección.** §3, §4.

### D-02 · El modelo de estado: la línea temporal de `estado`

**Decisión.** Se graba la línea temporal de `estado.md` §3 con los nombres del glosario: catálogo de grupos (`GroupCatalogEntry`), foto clave cada `TIMELINE.keyPhotoKm` km más una al empezar el último km (`KeyPhoto`), sucesos de estado por bloque (`move`, `out`, `main`, `clock`, `mishap`), sucesos narrables con el bloque en que se emitieron y la hora a la que se enseñan (`TimelineEvent.bEmit`, `.revealS`), capa de detalle en los bloques de `radioKmPoints` (`GroupDetail`), pancartas (`BannerResult`), reparto congelado, tiempo, perfil, crono y meta. El grabador pide la foto del motor en CADA bloque y solo guarda diferencias: en memoria tiene dos fotos, no la etapa. El reductor puro (`reducePhoto`, `photoAt`) vive en `packages/shared/src/broadcast/`: lo usan la API, la web y el propio grabador del motor, que ya importa `@cyclingstar/shared` (`packages/engine/package.json` l. 19; `coachView.ts` lo importa). Invariantes: **I1** (en cada km de `radioKmPoints`, la foto reducida proyectada es `radioKmFrom` de la foto del motor, en orden, ids, miembros, tamaño, `kind`, `gapS`, `racing`, `gone` y `mainId`: 0 discrepancias en 3.246 fotos medido por estado; 69 si se copia `mainId` sin la regla del título por bloque), **I2** (el instante coincide con la foto donde se mide; en tránsito p90 ≤ 2), **I3** (claves y empaquetado), **I5** (la traza de la crono cuadra con el resultado). Las fotos clave NO son unidad de entrega (D-06): son suma de control (I3) y acceso aleatorio en el servidor (la radio de un km, B2, B16).

**Evidencia.** Encargo del orquestador; motor §4 (la única propuesta que prueba su estado contra el motor); C5 (sonda en cada bloque, 20 de 20 etapas idénticas); I-01, I-02; I-cobertura-08, I-cobertura-10, I-ejecutabilidad-05.
**Descartado.** «El estado ES la radio» con cuatro campos opcionales en `StoredRaceRadio` (`ingeniero.md` §3): 1 km de resolución, +35-66 % en disco (C7) y sin reductor que se pueda probar. Radio v2 aditiva en `jsonb` (`producto.md` §3.3): redefine `riders` y engorda el `jsonb`. `StoredPaso` por km (`television.md` §3.3) y la estima por km de `datos.md` §3.1.
**Sección.** §4.

### D-03 · La identidad de los grupos y el título de pelotón

**Decisión.** La identidad de un grupo es su id del motor (`peloton`, `mov-3`, `shed-7`) mientras tenga gente (nace por origen y no caduca, `group.ts` l. 164-193). Cuando muere, su sucesor es el grupo al que fue la mayoría de sus corredores en el bloque de su muerte, la regla con que la radio ya sigue un grupo para medir su velocidad (`raceRadio.ts` l. 614-632 y 694-712): con ella el cursor de la fuga cazada se funde con el del grupo que la caza y la tendencia del hueco sigue la cadena. El número de carretera y el papel (`GroupRole`) se derivan en cada instante; el papel tiene una histéresis de `BROADCAST.roleHysteresisKm` (1 km) salvo que un `move` de más de un corredor toque ese grupo. El título de pelotón (`main`) se graba por bloque con la regla de la radio (el `mainId` de la foto si ese grupo tiene gente; si no, el del bloque anterior; `raceRadio.ts` l. 317-320): da el mismo `mainId` que la radio en 3.242 de 3.246 fotos (las 4 restantes, porque la radio hereda del km anterior y aquí del bloque anterior, que es la memoria correcta).
**Evidencia.** `estado.md` §3.5; I-04; I-cobertura-09; motor tabla fila 3.
**Descartado.** Identidad por posición (`ingeniero.md` §3.2 antes de su paso 4); linaje derivado al leer de la pertenencia (`producto.md` §3.2).
**Sección.** §3, §4, §6.

### D-04 · La posición de cada grupo en el instante

**Decisión.** `instantAt` es causal: solo usa datos con visibilidad ≤ `t` (D-06). Cada grupo está en el bloque donde su reloj vale `t`: desde su última marca de reloj con valor ≤ `t`, se extrapola a la velocidad entre sus dos últimas marcas, sin pasar el siguiente punto de foto de km (el calendario de fotos es público: sale de la longitud, `radioKmPoints`, `raceRadio.ts` l. 230-236) y sin volver nunca atrás en pantalla (se pinta el máximo de lo ya pintado). La composición de cada grupo es la de `photoAt` en su bloque con lo visible; un corredor que aparece en dos grupos se pinta en el de ATRÁS (en su punto el cambio aún no ha pasado) y uno que no aparece en ninguno va a `inTransit` con su origen y su destino. El error de posición por construcción es menor que un km; el típico lo midió §3.3 sobre la línea cortada en 15 corridas (`l1/corte.mjs`): p50 de 0 a 2 m y p99 de 52 a 508 m, nunca un km. Un grupo que solo tiene la marca de su nacimiento va a la velocidad de su grupo de origen (3-a, adoptada por §4.5 en 4-t); uno que sale en dos grupos se pinta en el de atrás y va además en tránsito (3-b); la salida se ve desde `t = 0` (3-f).
**Sin evidencia de los jueces.** `estado.md` §3.6 midió 3-196 m de error p99 INTERPOLANDO entre dos marcas, lo que exige la marca futura; el juez del motor prohíbe servir futuro (O-motor-08, I-motor-02). La unión (corte diagonal de estado con extrapolación acotada al estilo de `datos.md` §3.1) es de esta síntesis. B21 la mide en el paso 6 contra `instantAt` de la línea entera y escribe la cifra en §18.
**Sección.** §3, §4.
**Precisada en el ensamblado v0** (§3.3, §4.5; decisiones 3-a, 3-b, 3-f y 4-t; medido por L1 con `l1/corte.mjs` y `l1/variantes.mjs`). Se completa con lo que midió §3 y adoptó §4 (4-t); la decisión no cambia.

> Versión anterior: El error de posición por construcción es menor que un km; el típico NO está medido.

### D-05 · Cuándo se enseña cada suceso

**Decisión.** `revealS` se calcula al grabar (`revealSOf`) con `REVEAL_RULES` de `television.md` §11.3 fundida con el bloque de emisión de `estado.md`:

| Plantillas | `revealS` | Caso del mapa 01 §1.2 |
| --- | --- | --- |
| por defecto, y toda plantilla desconocida (R23.8 traerá `card_changed`) | el reloj del grupo de su primer protagonista (o de la cabeza, si no tiene) al final de `bEmit` | |
| `breakaway_formed`, `break_cooperation` | igual, con su `bEmit`: el bloque en que el hueco pasó de `tacticBreakGapSeconds` (45 s) sobre el grupo de ORIGEN, no `bornKm`/`bornTs` (`simulate.ts` l. 8693, 8708, 8727-8733) | (a) |
| `rider_defies_team` | el `bEmit` del siguiente suceso de su protagonista (`announceRebels` lo inserta al cerrar, `simulate.ts` l. 9081) | (b) |
| `climb_kom`, `sprint_intermediate` | el `revealS` de su `BannerResult`: el reloj del grupo del primero que puntúa, no `groups[0].tS` (`simulate.ts` l. 9287 y 9310) | (f) |
| `peloton_concedes` | por defecto (ya va en `max(km, breakFormedKm)`, l. 4814) | (g) |
| crono: `puncture`, `mechanical` | `startS` del corredor + su reloj propio en el km del suceso, leído de la traza (`timetrial.ts` l. 321-329): con el `tS` del suceso el rótulo saldría después de su llegada (medido, §9.6) | (e) |
| caída sintetizada de `incidents` (D-13) | el reloj, en su bloque, del grupo en que iba el caído al final del bloque anterior (4-v) | |
| carretera: `puncture`, `mechanical` | igual que la caída, con `máx(tS, …)` (4-v) | |
| `bunch_sprint`, `final_km`, `stage_win`, `stage_win_itt`, `time_cut`, `time_cut_readmitted` y, en crono, `tt_last_home` y `tt_catches` | NUNCA en un tramo: van al paquete de meta | (c), (d) |

En carretera, `revealS = máx(tS, regla)` (4-g: con la regla sola, `peloton_concedes` se revelaría 199 s antes de que el pelotón llegue al km); en crono, no. La tabla gana `crash` (regla `incident`) y `tt_last_home` (`finish`) (4-r). Los días de baja de una caída no se enseñan nunca en la retransmisión.
**Evidencia.** I-06, I-20; I-cobertura-12, I-motor-07, I-cobertura-13; `estado.md` §1.3 (medido: el 48 % de los sucesos lleva el reloj de un bloque antes que la foto); C9, C10; X-15.
**Descartado.** Cambiar en el motor el reloj de `climb_kom` y añadir `aT` a la fuga (`producto.md` §3.1, §11): sube versión (D-09). «(f) queda bien revelado por su `tS`» (`ingeniero.md` §1.3): falso (C9). La fuga visible cuando el hueco al `mainGroup` pasa de 45 s (`datos.md` §3.4): a medias, el origen no siempre es el `mainGroup` (C10).
**Sección.** §4, §5.
**Corregida en el ensamblado v0** (§4.7 (4-g, 4-r) y §9.6; duda de §9). La fila del pinchazo de crono dice en qué km se lee el reloj propio, y se añaden el máximo de 4-g y las dos filas de 4-r.

> Versión anterior: | crono: `puncture`, `mechanical` | `startS` del corredor + su reloj propio (`timetrial.ts` l. 321-329) | (e) |
> Versión anterior: Los días de baja de una caída no se enseñan nunca en la retransmisión.

**Corregida en la corrección, fase 5** (§4.7, decisiones 4-v y 4-w; hallazgos Rcobertura-007, Rcobertura-009, Rcodigo-025 y Rcodigo-026; `simulate.ts` l. 8266-8291 y 8471; medido por L3 con `l3/grabador.mjs`, 627 caídas, y en `rcod/n/ws/ttborde.mjs`, 154 cronos). La regla `incident` tomaba el grupo del caído al final de su bloque, y el motor lo saca de ese grupo en el mismo bloque: el rótulo salía 70,6 s de carrera tarde de mediana (máximo 290 s), y los pinchazos y averías de carretera, que iban por la regla por defecto, 141,6 s. Ahora las tres toman el grupo del final del bloque anterior. `tt_catches` va a meta porque lleva la hora de la última llegada, que es el borde de una crono (4-w; en 30 de 154 corridas alguien llega después que el último en salir).

> Versión anterior: | caída sintetizada de `incidents` (D-13) | el reloj interpolado del grupo del caído en su km | |
> Versión anterior: | `bunch_sprint`, `final_km`, `stage_win`, `stage_win_itt`, `time_cut`, `time_cut_readmitted` | NUNCA en un tramo: van al paquete de meta | (c), (d) |

### D-06 · La visibilidad de cada dato y el tramo por reloj de carrera

**Decisión.** Cada dato de la línea tiene su hora de visibilidad (`visibilityOf`, `datos.md` §3.4 con los relojes de estado): el cruce de un grupo por un bloque, a su reloj; un `move` de A a B, al primero de los dos cruces; un `out`, al cruce de su grupo; una marca de reloj, a su valor; la capa de detalle de un grupo, a su cruce; un suceso narrable o una pancarta, a su `revealS`; la crono, a `startS + kmClock`. El servidor sirve tramos por reloj de carrera, `(fromDs, toDs]`, de como mucho `BROADCAST.chunkRaceS` (900 s) y solo si `toDs` no pasa de lo alcanzado más `BROADCAST.prefetchRaceS` (900 s); si no, 409 `beyond_reached` (B18). Llegadas, resultado, acta y clasificaciones de después nunca van en un tramo: solo en `POST …/broadcast/finish`, que el cliente llama cuando lo alcanzado llega a la última marca de la cabeza (el tramo que la contiene lleva `atFinish: true`, que solo dice lo que ya dicen los km a meta), o tras revelar. Propiedad sellada (B9): `instantAt(cutTimeline(tl, T), T) = instantAt(tl, T)` para todo `T` antes de la meta, y todo dato de un tramo tiene visibilidad ≤ su `toDs`.
**Evidencia.** I-10, I-15; I-motor-02, I-cobertura-06, I-ejecutabilidad-16; O-20, O-25 (O-motor-08, O-ejecutabilidad-04).
**Descartado.** Tramos de 10 km (`estado.md` §7.1) y de 20 km (`ingeniero.md` §10.2) por espacio: un grupo a 5 min pasa por el final del tramo 5 min después que la cabeza (`group.ts` l. 121-124), así que se entrega su futuro; y el último tramo de 20 km lleva la meta 20 km antes. Tramos de 10 min con la voz construida (`television.md` §7.4) y de 15 min (`producto.md`): se conserva el reloj de producto, no su contenido por bloques.
**Sección.** §4, §10, §14.

### D-07 · El adaptador de la radio para las etapas sin línea

**Decisión.** La API sirve la retransmisión con un solo formato (`BroadcastHead` y `BroadcastChunk`), venga de `stage_timelines` o del adaptador de la radio (`timelineForStage` en `apps/api/src/broadcastSource.ts`) para las etapas sin línea: las corridas antes del paso 5 y todas las que el dueño mira en el paso 3. El adaptador construye una `StageTimeline` degradada desde `stage_snapshots.radio` y `.events`: fotos por km, reloj de la cabeza estimado integrando `speedKmh` del grupo 1 y reescalando para que la meta caiga en el tiempo del ganador, cada grupo en `headS(k) + gapS` (exacto en el punto), identidad `p` + posición (sin transiciones), pertenencia solo de los nombrados, lista de seguimiento filtrada en lectura con la política de D-27 (nunca los diez primeros de la etapa), `clock: 'estimated'`, `source: 'radio'` y el aviso `Recorded before full race data` (pantalla). En el paso 6, B22 mide el error de ese reloj contra la línea grabada de las mismas etapas; si el p99 de la posición de la cabeza pasa de `BROADCAST.estimatedClockMaxErrKm` (1 km), las etapas sin línea abren solo en `Report` con `Broadcast unavailable for this stage` (pantalla).
**Evidencia.** I-45 (I-cobertura-03: Watch sobre la radio de hoy en el paso 3); O-13 (O-ejecutabilidad-05: el primer Watch del dueño con cursores mal puestos); H-16 (H-motor-07).
**Sin evidencia de los jueces.** El umbral de 1 km.
**Sección.** §3, §14, §17.

---

## B. Lo que el motor guarda al correr la etapa

### D-08 · El colector aparte

**Decisión.** La envoltura de la sonda de `packages/db/src/stageRun.ts` (hoy l. 515-536) pide `atKm` con el centro de CADA bloque y despacha por índice de bloque: la foto de un bloque que corresponde a un punto de `radioKmPoints` va a `trabajaronParaOtro` y a `raceRadioCollector` exactamente como hoy; TODAS van al grabador (`timelineRecorder`). Se despacha por índice y no por km porque el motor llama a `onSnapshot` con `kmAt(idx)`, el centro del bloque, y no con el km pedido (`simulate.ts` l. 1946-1948 construye `probeAt` con `Math.round(target / STAGE.dx − 0,5)` y l. 9023 llama con `probeAt.get(i)`): la envoltura calcula el mismo índice para los puntos de la radio y compara índices. B10 sella que `trabajaronParaOtro` y la radio ven exactamente las fotos de hoy.
**Evidencia.** I-12; I-cobertura-05, I-motor-04; O-01 (O-cobertura-01); C11 (con fotos por bloque en la envoltura cambian 0-2 corredores de `trabajaronParaOtro` en 3 de 12 corridas, y con ellos `raceLearning`, `stageRun.ts` l. 791-802); `raceRadio.ts` l. 597 y 883 (`TURNO_KM` cuenta las tres FOTOS anteriores: con fotos de 100 m el turno pasaría de 3 km a 300 m, contra lo que fijó el dueño, balance l. 16615-16616); X-10.
**Descartado.** Fotos cada 100 m en los últimos 3 km por la misma sonda y el mismo colector (`producto.md` §11, cambio 2).
**Sección.** §5.

### D-09 · `ENGINE_VERSION` no sube en E2

**Decisión.** Ningún paso de E2 sube `ENGINE_VERSION`. Guardar lo que la sonda ya ve no la sube: 20 de 20 etapas idénticas en `results`, `events`, `efforts` e `incidents` con foto en cada bloque (C5), y es doctrina escrita (balance l. 16319-16323, 16604-16606 y 16708; `Claude.md` l. 13 habla de comportamiento). Cambiar el CONTENIDO de un suceso sí la sube (v73, balance l. 14036-14038). Todo lo que E2 necesita llega por observación: `onEvent` (el bloque de emisión), `onBanner` (el orden y los puntos de cada pancarta, con el reloj del grupo del primero que puntúa), `onTimeTrialRide` (la traza de la crono), más el colector aparte (D-08). Condiciones: B11 (huella idéntica con los tres ganchos) y B10. Regla para quien venga después, de E2 o de otro documento: toda subida de versión va DETRÁS del paso 17d de la táctica, porque `packages/db/src/raceReport.ts` l. 148 re-simula la «Last race» sin comparar `engine_version` (C16). Mientras la versión no cambie, `checkReplay` sigue fiel para las etapas ya corridas y `scripts/race-radio.mjs --db` (que re-simula desde la semilla y la entrada de `stage_snapshots` y se niega si la versión no coincide; no lee la radio guardada, cabecera del script l. 19-38) sigue siendo el microscopio del dueño en producción.
**Evidencia.** C5, C11, C16 y §2.3.2 del juez del motor; cobertura §2.8; O-05 (O-cobertura-05, O-motor-03); X-03, X-04.
**Descartado.** v90 por el orden de pancartas (`estado.md` §11): lo da `onBanner`. v90 con `aT`, reloj de `climb_kom`, suceso `crash` y pinchazos de crono (`producto.md` §11 cambios 4-7): lo dan `onEvent`, `onBanner`, `incidents` y `startS + tS`. Paso 11 opcional con `knownS` y podios (`ingeniero.md` §11.2): lo mismo.
**Sección.** §5, §19.

### D-10 · La tabla nueva y su codificación

**Decisión.** Tabla nueva `stage_timelines`, 1:1 con `stage_snapshots` (que no gana columnas, `tactica.md` l. 7589-7591) y escrita en la misma transacción: `body bytea` con el gzip 9 del JSON de `StoredTimelineV1`, más `game_day` (la primera tabla de etapa con día de juego: la necesitan el horizonte, el correo y B6), `format`, `engine_version`, `finish_s`, `bytes` y `created_at`; índice por `game_day`. Restricciones del formato, que el redactor de §4 escribe entero: listas planas de enteros y cadenas; relojes en décimas de segundo; km en décimas; la pertenencia de cada foto clave en base64 de un byte por corredor (GroupIx + 1, 0 = fuera); los códigos (`PullMotive`, `MishapKind`, `RadioGroupKind`, `plantilla`) como CADENA, nunca como índice de un enum; `format` en cada fila y un decodificador por versión (lo guardado no se reescribe); una guarda de tipos entre `SnapshotRider`, `StageProbe` y el grabador (un mapeo exhaustivo con `satisfies` que falla al compilar si la sonda gana o pierde un campo). El gzip lo pone `packages/db` (el motor no importa Node, `eslint.config.js` l. 80-137). La API guarda un LRU de `BROADCAST.decodedCacheEntries` (16) líneas decodificadas, en `packages/db/src/timelines.ts` y dentro de su proceso (5-p): el dato es inmutable. Con 64 entradas serían de 33 a 121 MB (medido por L3, `l3/lru.mjs`, §5.6), no los 20 que se estimaban; con 16, de 8 a 30 MB (18-d).
**Evidencia.** I-09, I-17; I-motor-01, I-motor-03; O-14 (O-motor-01: el orden del `z.enum` de `contracts.ts` l. 1376 no es un contrato; la radio entera ya cayó a null por un motivo nuevo, mapa 03 §8); O-15 (O-motor-02); H-13 (H-motor-04); C8 (mismo contenido: `bytea` gzip 1,6-2,4 veces menos que `jsonb` y 1,3-1,6 menos que `json`; PGlite no admite `lz4`, así que `json` y `jsonb` dependen de la compresión de producción y `bytea` no); `datos.md` §10.5 (decodificar, cortar y comprimir una petición, 1,3-4,7 ms); X-07, X-23.
**Descartado.** Columnas en `stage_snapshots`; campos dentro de `stage_snapshots.radio` en `jsonb` (`ingeniero.md`, `producto.md`); `stage_timelines.linea json` (`estado.md` §10.1); `stage_feeds.feed jsonb` (`television.md` §10.1); el motivo por índice posicional (`estado.md` §3.8).
**Sección.** §4, §5, §13.
**Corregida en el ensamblado v0** (§5.6, §18.2; decisión 18-d; duda 3 de §5). El LRU baja de 64 a 16 entradas con la memoria medida.

> Versión anterior: La API guarda un LRU de `BROADCAST.decodedCacheEntries` (64) líneas decodificadas: el dato es inmutable.

### D-11 · Qué mide cada cifra de tamaño, y los topes

**Decisión.** Las cuatro cifras de las propuestas son ciertas y miden objetos distintos, salvo una:

| Cifra | De | Qué mide | Veredicto (C7) |
| --- | --- | --- | --- |
| 17,5 KB de mediana (8 a 23) | `datos.md` §10.5 | la línea por km en `bytea` gzip, en disco, 28 etapas en línea | cierta |
| 5,5 a 39 KB | `estado.md` §3.8 | la línea entera con capa de detalle, como `json` en disco (PGlite, `pglz`), 5 etapas × 3 semillas | cierta |
| +52 a 74 KB | `ingeniero.md` §10.3 | el JSON que se añade a la radio de hoy | cierta; en disco la radio crece un 35-66 % |
| 106 a 178 KB | `producto.md` §3.5 | la retransmisión SERVIDA entera en JSON, no lo guardado | cierta como red; su «3-9 KB en disco» es falsa: +4,7 a +53 KB en `jsonb` |
| 126-559 KB en JSON, 10,7-146,4 KB en `jsonb` | juez del motor §2.1 | la radio de hoy | referencia |

Ninguna de esas cifras mide el formato que se guarda, el de §4.3; lo midió L3 con el prototipo del grabador (§5.7, `l3/grabador.mjs`, 23 etapas en línea × 2 semillas): de 20,9 a 70,0 KB por etapa en línea en `bytea` gzip 9 (mediana 38,8, p90 53,3; llana 22,7, media 35,6, reina 47,7, clásica 44,9), de 123 a 464 KB de JSON (mediana 222) y de 18,8 a 24,2 KB una crono de 176 corredores. Topes (constantes de §15.2), sobre esa medida: `TIMELINE.maxStoredBytes` 96 KB (98.304 bytes, 1,4 veces el máximo medido) por etapa en línea; JSON ≤ 640 KB de máximo y ≤ 256 KB de mediana; crono ≤ 48 KB (49.152 bytes, 1,5 veces la crono más larga medida: la e10 de `race-italy`, 42 km y 176 corredores, 32.203 bytes con `checkClockDs`; 15-i). Son umbrales de B6, no de escritura (15-g). Por temporada, del orden de 36 MB de `stage_timelines` (estimado con las medianas medidas por tipo y 176 corredores en todas las etapas que no son nacionales: cota superior) contra unos 40 MB de radio en disco (mapa 04 §5).
**Evidencia.** C7, C8, §2.1 del juez del motor; X-06.
**Sección.** §5, §13, §16.
**Corregida en el ensamblado v0** (§5.7 y §15.2; duda 1 y 2 de §5, dudas de §13, §16 y §17; medido por L3). Los topes pasan a 96, 640, 256 y 32 KB y el volumen por temporada, a unos 36 MB: los de la síntesis salían de formatos que no son el de §4.3, que no cabía en ellos (B6 habría nacido en rojo).

> Versión anterior: Topes (constantes de §G.7): `TIMELINE.maxStoredBytes` 48 KB por etapa en línea en `bytea` (el doble del máximo de datos; la línea de estado con detalle, estimada en ≤ 30 KB en `bytea` dividiendo su `json` medido entre 1,3); JSON ≤ 128 KB de máximo y ≤ 64 KB de mediana; crono ≤ 16 KB. Por temporada, del orden de 11-20 MB de `stage_timelines` (estimado con las medianas y las 1.418 etapas) contra unos 40 MB de radio en disco (mapa 04 §5).

**Corregida en la corrección, fase 5** (§15.2, decisión 15-i; hallazgo Rcodigo-014; medido con el prototipo del grabador de L3, `l3/grabador.mjs`, y con `checkClockDs`, `rcod/n/grab2.mjs`; las cronos del calendario, `rcod/cronos2.mjs`). El tope de la crono se fijó sobre las dos cronos del banco, de 20 y 26 km, y el calendario tiene tres WorldTour más largas con 176 corredores: la e10 de `race-italy` (42 km) ocupa 31.436 y 31.178 bytes, y 32.203 con `checkClockDs`, el 98,3 % de 32 KB; B6 no lo veía porque ninguna de sus 24 etapas pasa de 26 km.

> Versión anterior: crono ≤ 32 KB.

### D-12 · La autocomprobación al grabar y el interruptor de grabación

**Decisión.** El grabador comprueba I1 en cada foto de km antes de escribir (`selfCheckI1`; 15-24 ms por etapa, medido por estado). Si falla (con la tolerancia de igual reloj en Ds extendida al `kind`, 5-i: sin ella falla 1 foto de 8.656), NO escribe la línea, deja una lápida (una fila con `format = 0`, para que la API no la confunda con una etapa anterior al paso 5 y sirva el adaptador, 5-k), apunta en `tick_log.notes` (la columna ya existe, `schema.ts` l. 156-173) una línea `timeline I1: <raceKey> e<N> km <k>`, suma un contador del día y la etapa abre solo en `Report` con `Broadcast unavailable for this stage` (pantalla). El interruptor `TIMELINE_RECORD=off`, en `envSchema` y en `tickEnvSchema` (`apps/api/src/env.ts` l. 20-70), apaga la grabación sin desplegar si el tick se resiente.
**Evidencia.** O-22 (O-motor-10: el motor cambia cada pocos días y sin aviso una etapa se quedaría sin retransmisión en silencio); H-14.
**Sin evidencia de los jueces.** El interruptor `TIMELINE_RECORD`.
**Sección.** §5.
**Precisada en el ensamblado v0** (§5.5; decisiones 5-i y 5-k). Se añaden la lápida, que hace cierta la salida a `Report`, y la tolerancia del `kind` medida.

> Versión anterior: Si falla, NO escribe la línea, apunta en `tick_log.notes`

### D-13 · Las caídas salen de `incidents`

**Decisión.** La caída sale de `output.incidents` al grabar (km, corredor, pérdida; `types.ts` l. 358-365): como `mishap` de estado y como suceso sintetizado (`source: −1`, plantilla `crash`) para la cola de rótulos, que enseña `CRASH` al revelarse y los nombres `BROADCAST.crashNamesDelayS` después. La línea no guarda `severidad` ni `diasBaja`: la tele no sabe el diagnóstico en carretera (mapa 06 §3.1); los días de baja van en la noticia `injury`, atada a su etapa y velada con ella. El motor no gana un suceso `crash`.
**Evidencia.** I-20 (I-cobertura-13); O-05; la doctrina D7 del dueño, «si lo que hace el motor está bien ahí, no cambies el motor, cambia el race radio» (`docs/balance.md` l. 16555-16558, nota de radio posterior a la v86).
**Descartado.** El suceso `crash` en el motor (`producto.md` §11, cambio 6): sube versión y empuja el tope de 100 líneas narrables (`simulate.test.ts` l. 1383-1410; 0-9 caídas por llana y 5-12 por reina, mapa 01 §1.4). Guardar `severidad` y `diasBaja` para el acta (`television.md` §3.3).
**Sección.** §5.

### D-14 · El tiempo, congelado

**Decisión.** `StageWeather` se congela en la línea con `stageWeather`, `weatherPlan` y `roadBearings` sobre la semilla y el lugar de la etapa (`television.md` §11.2; `stage/weather.ts`), sin tocar el motor: alimenta el cuadro del parte de la previa (temperatura, lluvia y tramos de viento lateral) y el dato periódico que la capa fija enseña al tocarla.
**Evidencia.** I-19 (I-motor-06); mapa 06 §1.1 (la UCI pide viento y tiempo «regularly and systematically displayed»).
**Sección.** §5, §6, §8.

### D-15 · El reparto congelado, con procedencia

**Decisión.** `packages/db` arma el reparto al correr la etapa (`buildTimelineCast`, `packages/db/src/cast.ts`) y el grabador lo guarda: por corredor, el equipo CON EL QUE CORRIÓ (`input.riders[].teamId`, mapa 04 §4) y su `jerseySeed` de ese día, dorsal, país, género (`riders.gender`, `schema.ts` l. 285), general de salida con procedencia (la N−1), maillot llevado y distinciones calculados con `wornJerseys` (D-24) sobre las clasificaciones tras la N−1 (que `stageRun.ts` ya calcula, l. 550-557) y los títulos de `palmaresTitleSource` (D-25), cada dato con su `from`, y `knownWins` (D-26). Al servir la cabecera, todo campo cuyo `from` esté en el velo del espectador se degrada: `worn` de líder pasa a `{ kind: 'team' }`, se quitan las distinciones con ese origen y `start` va a null (B13).
**Evidencia.** I-11; I-cobertura-06; `datos.md` §6.1, §7.4; O-07 (la identidad del momento: un traspaso no reescribe el pasado).
**Sección.** §4, §7, §10.
**Precisada en la corrección, fase 5** (§4.2, decisiones 8-g y 4-u; hallazgos Rcobertura-005 y Rcodigo-036; `packages/db/src/stageRun.ts` l. 298-310, 790-805 y 891-897). El reparto lleva además los favoritos por atributo de la previa (`TimelineCast.favourites`), congelados con los atributos de `rider_attrs` que la etapa lee al empezar: el aprendizaje de la etapa los reescribe en la misma transacción, y leídos al servir llevarían ya el desenlace (B1c).

### D-16 · La radio guardada y la lista de seguimiento

**Decisión.** E2 no cambia lo que se escribe en `stage_snapshots.radio` hasta el paso 11: `RaceRadioPanel` y `buildRaceRadio` siguen iguales. Lo que destripa de la radio guardada (la lista de seguimiento mete a los diez primeros DE LA ETAPA desde el km 0, `stageRun.ts` l. 560-568; mapa 07 §5.2.1) se corta en LECTURA: la radio servida de una etapa no conocida pasa por la política de nombrado de D-27, y el deslizador llega solo hasta lo alcanzado. En el paso 11, con B16 en verde, la pestaña `Race Radio` lee `radioFromTimeline` (con todos los corredores nombrables y el contrato `RaceRadio` de hoy) y DD-11 decide dejar de escribir la radio (por defecto, sí, en ese mismo paso; la columna queda para las etapas viejas y `stageRun.test.ts` l. 322-339 se re-sella).
**Evidencia.** I-05; I-cobertura-10; O-16 (O-motor-04: I1 no cubre la capa de detalle, así que antes de dejar de escribir hace falta la prueba de igualdad); mapa 05 §2.8 (catorce tandas de defectos cazados desde la radio).
**Sección.** §5, §11, §12.

---

## C. La pantalla y el ritmo

### D-17 · Lo permanente, lo eventual y la diferencia principal

**Decisión.** Permanentes: la capa fija (km a meta de la cabeza, en metros dentro del último km y en vueltas si `laps > 1`; la diferencia principal con su tendencia), la barra de grupos (hasta `BROADCAST.mobileGroupRows` filas en móvil y `+N groups` para el resto), el perfil con un cursor por grupo y el puerto que viene, y `Your rider · in the bunch · +2:14` (pantalla) si el espectador corre. Eventual: la cola de rótulos (D-21). La diferencia principal se mide así: si el grupo 1 no es el pelotón, contra el pelotón (`ref: 'bunch'`); si el pelotón va en cabeza, contra el primer grupo de detrás que lleve un maillot o a un top 3 de salida (`'jersey_group'`); si no hay ninguno, contra el segundo (`'second'`); con un solo grupo, `Bunch together` (pantalla); por debajo de `BROADCAST.sameTimeS`, `s.t.`. La tendencia es el hueco ahora menos el de `trendWindowKm` antes, con flecha solo si pasa de `trendMinS`, y se reinicia si cambia la identidad del grupo de detrás. Nunca en pantalla: la duración de la reproducción, el número de sucesos que quedan, marcas en el perfil donde va a pasar algo (hoy la altimetría las lleva, `chronicle.ts` l. 169-175) ni la lista de llegada antes de la línea; en los últimos `quietFinalM` solo la distancia.
**Evidencia.** mapa 06 §1.1 (UCI, pliego §11.2: «distance remaining to the finish and main time gap. This overlay should be permanently viewed on screen»); agenda l. 510-515; `television.md` §3.4, §4; `producto.md` §4; `estado.md` §4 (a ×60 la diferencia cambia cada 1,5 s de pantalla: por eso la barra es permanente).
**Sección.** §6.

### D-18 · Un vocabulario de grupos

**Decisión.** Un solo código, `GroupRole` (`lead`, `chase`, `bunch`, `gruppetto`), más `GroupLabel` (`role`, `names` para tres o menos, `jersey_group`, `together`), que leen la barra, la radio servida, la voz y el acta. Las palabras son las de SPEC §6.15, que ya usan el journal (140 tests) y `GROUP_NOUNS` del motor: `Lead group` / `the lead group`, `Chase group` / `the chase group`, `Bunch` / `the bunch`, más `Gruppetto` / `the gruppetto` (DD-04). El grupo del maillot conserva los nombres que la radio ya usa y el dueño pidió (`Race leader’s group`, `Points leader’s group`, `KOM leader’s group`, `RaceRadioPanel.tsx` l. 85-89; «podría llamarse grupo del maillot amarillo en vez de grupo 3», l. 50-52, v58), elegido con `JERSEY_PRIORITY` (gc > points > kom, `jerseys.ts` l. 22) y no con el orden de la radio (gc > kom > points, `RaceRadioPanel.tsx` l. 102). Se retiran `Peloton`, `No man’s land` (el `tierra` del motor es un movimiento que ha quedado detrás del pelotón, no la tierra de nadie de la tele, mapa 06 §1.3), `2nd group`, `Group` y la grafía `Grupetto`. Se re-sellan a propósito `raceRadioNames.test.tsx` y `GROUP_NOUNS` gana `the gruppetto`.
**Evidencia.** I-07; I-ejecutabilidad-07; O-10 (O-cobertura-10, O-ejecutabilidad-02); regla C7 del dueño: «Binario: o tiras o no tiras. Se acabó el tercer estado intermedio. Un solo concepto, con el mismo nombre, en el motor y en la Race Radio.» (`docs/balance.md` l. 6740-6741, v34).
**Descartado.** Dos vocabularios en la misma pantalla: `PELOTON` en la barra y «the bunch» en la voz (`ingeniero.md` §4.3; `datos.md` decisión 8).
**Sección.** §6, §12.

### D-19 · La curva de ritmo, su duración medida y el coste diario

**Decisión.** `Watch` usa la curva de `producto.md` §5 SIN pausas (`BROADCAST.pace`): los rótulos no paran el reloj. `Highlights` usa `BROADCAST.summaryPace`. La duración depende solo del recorrido y del tiempo de carrera de la cabeza; la pantalla nunca enseña cuánto dura ni cuánto queda: la ficha dice `About 9 min` (pantalla) con `playbackEstimateS`, que usa velocidades nominales y no las de la carrera. Duraciones medidas por el juez de ejecutabilidad (§2.1, `juez-ejec/ritmo.mjs`, semillas 0 y 1, campo del banco de 176 corredores, sucesos narrables revelados en su `tS`; `television` sin su cola, `estado` con frenos aproximados por km):

| Etapa | television `Highlights` / `Full` | estado curva · con frenos | producto base · con pausas · resumen | datos completo · resumen | ingeniero ×1 (último km) |
| --- | --- | --- | --- | --- | --- |
| `race-france` e7 llana, 175 km | 9:54-10:06 / 25:40-26:16 | 3:26 · 5:32 | **7:39** · 9:44-9:48 · **2:12** | 8:46-8:51 · 3:36-3:42 | 6:42 (×1,5) |
| e13 media, 206 km | 10:19-10:21 / 26:29-26:31 | 4:00-4:07 · 7:52 | **8:49-9:03** · 11:58-13:09 · **2:30-2:34** | 10:15-12:08 · 4:05-5:10 | 7:39 (×1,8-1,9) |
| e18 reina, 185 km | 12:52-12:55 / 29:02-29:05 | 5:22-5:30 · 9:11 | **13:21-13:35** · 16:57-17:35 · **4:29-4:31** | 14:31-15:00 · 6:20-6:32 | 7:51 (×5,7) |
| `race-flanders`, 278 km | 10:19-10:20 / 26:29-26:30 | 5:01-5:08 · 9:30 | **10:54-11:07** · 15:16-15:36 · **2:56-2:59** | 14:10-14:11 · 5:57-5:59 | 9:09 (×1,9) |
| `race-colombia` e5 reina, 232 km | 14:53-15:02 / 31:03-31:12 | 8:03-8:13 · 14:20 | **19:38-19:59** · 25:32-27:14 · **6:32-6:37** | 19:27-21:00 · 8:19-9:14 | 8:33 (×8,7-8,9) |
| crono e1, prólogo, 176 a 60 s | sin presupuesto | 2:31-2:34 | **6:24-6:33** (6:55-7:06 con el último km real, §9.4) | 2:51-2:54 | 2:51-2:54 |
| crono e16 con general, 176 a 120 s | sin presupuesto | 4:45 | **11:21-11:23** | 8:09-8:12 | 5:18-5:19 |

Coste diario de seguir una gran vuelta: 21 etapas en 23 días de juego de 6 h son 5,75 días reales, unas 3,65 etapas por día real (mapa 02 §1.1, mapa 04 §2). Con la curva elegida, de 28 min al día (llanas: 7:39 × 3,65) a 49 min (reinas como la e18: 13:28 × 3,65), y hasta 73 min en días de reinas largas como Colombia e5; en `Highlights`, de 8 a 24 min. Por eso el modo por defecto es decisión del dueño con esa cifra (DD-03). Los valores de §G.7 son los iniciales: B17 mide la curva elegida en las 24 etapas del mapa 07 §7 en el paso 0 y otra vez en el paso 10, y la prueba de lectura (D-60) los acepta antes del encendido.
**Evidencia.** I-38 (I-ejecutabilidad-15: la reina e18 pasa de 7:51 a 13:21-13:35 y su último km de ×5,7 a ×1,5); O-12 (O-cobertura-12, O-ejecutabilidad-01); H-19 (H-ejecutabilidad-01); X-18, X-19.
**Descartado.** Segundos de pared por km (`ingeniero.md` §5.1): el último km sale a ×5,7-8,9 en finales en alto, las etapas más vistosas son las más comprimidas. Frenos tras cada hito (`estado.md` §5): el 35-45 % de la duración depende de los sucesos. Presupuesto por tramo con el último km a 1:1 (`television.md` §5.2): 15:02 en Colombia y `Full` de 31 min. Pausas de 3 s por rótulo (`producto.md` §5): hasta 27:14 y una estimación que no las cuenta. La regla de `datos.md` §5 (mediana 12,7 min, la más larga; su «unos 13 min al día» es falso, unos 46, ejecutabilidad #15).
**Sección.** §8.
**Precisada en el ensamblado v0** (§9.4, `l5/crono.mjs`; duda de §9). El prólogo lleva también la medida de §9.4 con el último km real.

> Versión anterior: | crono e1, prólogo, 176 a 60 s | sin presupuesto | 2:31-2:34 | **6:24-6:33** | 2:51-2:54 | 2:51-2:54 |

### D-20 · Los mandos

**Decisión.** Pausa (tocar la pantalla o la barra espaciadora; los rótulos se quedan); `×½ ×1 ×2 ×4` (cambia el factor, no las zonas); `Next action`, que acelera ×`BROADCAST.nextActionSpeedup` (20) hasta que se revela un `Cue` de clase ≥ `nextActionMinClass` (2), sin decir dónde: lo que corta el acelerón es un suceso ya revelado a su hora, así que es causal; saltos de RECORRIDO: `−5 km`, `+5 km`, `Next climb`, `Final 20 km`, `Last km`, que mueven lo alcanzado al destino (`mode: 'seek'`), traen los tramos intermedios y, al volver, enseñan `While you skipped` con los `Cue` de clase ≥ 2 saltados; hacia atrás, libre dentro de lo reproducido y sin red; `Show result`, con confirmación (DD-17), que revela. Al reanudar se vuelve `BROADCAST.resumeBackS` y se enseña `Previously`. La barra de progreso va en km, uniforme hacia delante, con marcas solo del recorrido (puertos, volantes). Con la pestaña oculta (`visibilitychange`) se pausa. Nunca un «siguiente suceso» como destino: lo delata.
**Evidencia.** I-21 (I-ejecutabilidad-01); `television.md` §5.3; mapa 06 §7.2 reglas 3 y 7.
**Descartado.** `Skip the quiet part` (`producto.md` §5) y el `Next action` de `datos.md` §5, que sirven hasta el siguiente suceso: revelan dónde pasa algo.
**Sección.** §8.

### D-21 · La cola de rótulos, sin freno

**Decisión.** Cada `Cue` tiene clase (`CUE_CLASS`): 3, meta, caza de la fuga, corte, cambio de líder virtual, caída o abandono de un maillot o de un top 5 de salida; 2, ataque, fuga formada, pancarta, caída, llama roja, fuera de control; 1, diferencias generales, grupo cambiado, percance, rótulo de corredor; 0, ronda de la moto, ficha del puerto, datos. Un rótulo de corredor a la vez (mapa 06 §5.3); cada `Cue` ocupa `BROADCAST.cueHoldS[clase]` segundos de pared sin parar el reloj; con `cueQueueMax` esperando, se descartan los de clase 0 y 1. La carrera nunca se frena por la cola. La tabla `CUE_OF_TEMPLATE` lleva las 54 plantillas que emite el motor (45 de carretera contando `rider_defies_team` y 9 de crono, mapa 01 §1.1) más `crash`, cada una a un `CueKind`, a `voice_only` o a `report_only`; B7 exige que ninguna quede sin destino.
**Evidencia.** I-21; O-27 (O-ejecutabilidad-09); `television.md` §3.5, §5.3, §12.
**Sin evidencia de los jueces.** Quitar el freno de la cola de `television.md` (`cueQueueBrake`, `cueBrakeFactor`): se hace por coherencia con I-38, para que la duración no dependa de lo que pasa.
**Sección.** §6, §9.
**Precisada en la corrección, fase 5** (§9.5, decisión 9-n; hallazgos Rcobertura-032, 033 y 034; medido por L5 con `l5c/cola2.mjs`, e16, semillas 0 a 2). En una crono la general virtual no es el cuadro de diferencias que sale cada 25 s de pared, sino el rótulo del paso del líder por un control o por la meta, dos o tres veces por crono: es de clase 2, y 3 si cambia el líder virtual, como en carretera; `cueClassOf` recibe si la etapa es crono. Con la clase 1, la cola perdió 1 de los 7 `VIRTUAL GC` de las tres semillas; con la 2, ninguno. La ronda `ON COURSE` de la crono es ronda de la moto (clase 0, `rider` con contexto `tt_round`), y `TIME CUT` es de clase 2 también en crono.

### D-22 · La previa y el cierre son parte de la emisión

**Decisión.** La emisión abre con cuatro cuadros de 5 s, en el orden de la señal UCI (mapa 06 §8.1): perfil y puertos (con nombre donde `STAGE_FEATURES` lo dé); parte y tramos de viento lateral (D-14); maillots en juego (quién los lleva y quién puede quitárselos hoy con la bonificación o los puntos en juego); favoritos: los tres primeros de la general de salida y los tres mejores inscritos por el atributo del tipo de etapa (llana SPR, media COL, reina MON, crono CRI, pavé PAV; los atributos son públicos, `publicRiderDetailSchema.attributes`, `contracts.ts` l. 713-737). Cierra, tras `BroadcastFinish`, con podio y resultado (`BROADCAST.closingResultTop` primeros y el propio), la general tras N con flechas, los maillots de mañana con los cambios, `Most kilometres out front` (el mayor `kmEnFuga` de `StageEffort`: un hecho, no el premio de un jurado, DD-14), abandonos y fuera de control, y la etapa de mañana con `Next: Stage 8 · Watch` (pantalla). Durante la carrera, la moto rodea la fuga (`breakRoundEveryS`) y sale el cuadro de diferencias generales cada `gapsTableEveryRealS`, salvo en los últimos `quietFinalKm`.
**Evidencia.** I-22 (I-cobertura-11, I-ejecutabilidad-02); O-29 (O-ejecutabilidad-12); `television.md` §5.2.
**Sección.** §6, §8.

### D-23 · La contrarreloj

**Decisión.** `StageProbe.onTimeTrialRide`, llamado por `simulateTimeTrial` al cerrar cada corredor con la sonda que hoy ignora (`simulate.ts` l. 1264), da salida, reloj propio en cada km y percance; se guarda `TimeTrialTrace` (14,7-20,3 KB de JSON medido por estado con una copia parcheada, resultados idénticos en 3 de 3; 2,5-10 KB en `bytea` medido por datos; con el formato de §4.3, la línea entera de una crono de 176 corredores ocupa de 18,8 a 24,2 KB, §5.7). La última entrada de la traza es `10 · Math.round(tS)`, el `tiempoS` de `results` por diez, e I5 es una igualdad (9-a). El estado en `t` es `timeTrialInstantAt`: en ruta (km y diferencia en el último parcial), sillón (mejor tiempo llegado antes de `t`, exacto), parciales en cualquier km (los de `ttSplitChecks`, ⅓ y ⅔, como rótulo), general virtual de los `virtualGcTop` en ruta. Ritmo por fracción de salidos (`BROADCAST.ttPace`; medido 6:24-6:33 un prólogo de 176 a 60 s, 6:55-7:06 con el último km real (§9.4), y 11:21-11:23 una crono con general a 120 s), el último km del último en salir a ×`ttLastKmX`. Los cuatro rótulos de la tele (`ON COURSE`, `SPLIT 1`, `FINISH` con `HOT SEAT`, `VIRTUAL GC`, pantalla), con signo y no solo color. El pinchazo se revela en `startS` más el reloj propio de la traza en el km del suceso, que es el que pone el motor, hoy siempre `finishKm / 2` (`timetrial.ts` l. 306-329; mapa 01 §1.2 e): la traza no da otro km (4-f, §9.6). B11 incluye la crono; I5 cuadra la traza con `results`.
**Evidencia.** I-08 (I-cobertura-15, I-ejecutabilidad-08); O-11 (O-cobertura-11, O-ejecutabilidad-10); ejecutabilidad §2.1 (duraciones de crono: solo la de producto es cierta).
**Descartado.** Dos controles y meta (`producto.md` §9); el §9 en prosa sin tipo y 4-6 min estimados para lo que mide 2:51 (`ingeniero.md` §9); 5.760 y 15.120 s de carrera sin presupuesto (`television.md` §9).
**Sección.** §9.
**Corregida en el ensamblado v0** (§4.2 (4-f), §9.2 (9-a), §9.4 y §9.6; dudas de §4 y §9). El km del pinchazo de crono no sale de la traza (el motor solo tiene `finishKm / 2`), la meta de la traza es entera y el prólogo lleva las dos medidas.

> Versión anterior: se guarda `TimeTrialTrace` (14,7-20,3 KB de JSON medido por estado con una copia parcheada, resultados idénticos en 3 de 3; 2,5-10 KB en `bytea` medido por datos).
> Versión anterior: medido 6:24-6:33 un prólogo de 176 a 60 s
> Versión anterior: El pinchazo se revela en `startS + tS` y su km verdadero sale de la traza (hoy `meta / 2`, mapa 01 §1.2 e).

**Precisada en la corrección, fase 5** (§9.2; hallazgos Rcobertura-031, Rcoste-007 y Rcodigo-014; medido con el prototipo del grabador de L3 más `checkClockDs`, `rcod/n/grab2.mjs`, y re-medido por L5 con los mismos bytes). Las cifras de 18,8 a 24,2 KB son las de las dos cronos del banco (20 y 26 km). La crono más larga de 176 corredores del calendario, `race-italy` e10 (42 km), ocupa 31.436 B (31.178 con la semilla 1) sin `checkClockDs` y 32.203 B con él: el 98,3 % de los 32.768 B que tenía `ttMaxStoredBytes`, que §15.2 sube a 49.152 (15-i, D-11 corregida). Con `kmClockDs` por diferencias por km, la salida que 15-i descarta, su línea bajaría a 15.614 B (`l5c/deltas.mjs`); B6 mide la e10 en el paso 5 (§9.8).

---

## D. Los rótulos

### D-24 · La regla UCI del maillot llevado

**Decisión.** `wornJerseys` es pura, vive en `packages/shared/src/jerseys.ts` y se calcula al grabar:
1. En la etapa 1 de una vuelta y en una carrera de un día nadie lleva maillot de líder; los campeones sí (UCI 2.6.018; hoy ya sale así: `leaders` es `NO_LEADERS` sin general previa, `routes/races.ts` l. 465-473).
2. Maillots de líder en `JERSEY_PRIORITY`: se baja por cada clasificación de salida saltando al que abandonó y al que ya lleva uno, como hoy (`assignLeaderJerseys`, `jerseys.ts` l. 80-98) y, NUEVO, al que tiene un título vigente de la disciplina y la categoría del día (2.6.018: «if this rider must wear his world or national champion's jersey … he shall wear that jersey»); al líder verdadero no se le salta nunca (1.3.071: manda la vuelta); `delegated` marca al que no es el primero de su tabla.
3. Sin maillot de líder, el título vigente de mayor alcance (mundo, continental, nacional) de la disciplina del día (ruta en las etapas en línea, crono en las cronos; 1.3.063, 1.3.068) y de su CATEGORÍA: un título sub-23 solo se lleva en carreras sub-23 (1.3.068: «in all events in the discipline, speciality and category in which they won their title, and no other event»).
4. Si no, la equipación de su equipo del día.
Distinciones, como mucho `BROADCAST.cardLinesMax` (3), en este orden: `wears_for` (`Points jersey (2nd in the classification)`), `leads` (`Also leads the mountains`), `champion` (el título que no lleva puesto), `gc` si su puesto de salida es ≤ `gcLineTop` (20) y no es el líder (`14th overall +4:02`), y `stage_wins` en esta carrera, filtradas por el velo. `JerseyKind` no crece (lo sellan `leaderJerseys.test.tsx` y todo `Record<JerseyKind, …>`, mapa 07 §1.3); el maillot joven de la táctica (`tactica.md` l. 6966) entraría como cuarto valor en «others» (2.6.018). El dorsal amarillo del equipo líder no entra en el rótulo (DD-13; `navegacion.md` §7.4).
**Evidencia.** Orquestador (la gramática UCI de `television.md` §6.1); I-24 (I-cobertura-14); O-03 (O-cobertura-03); mapa 06 §2.2.
**Sin evidencia de los jueces.** Saltar al campeón en la delegación: lo proponen `datos`, `television` e `ingeniero` y ningún juez lo pesó; queda con este defecto en DD-05 (el reglamento no dice qué pasa después, mapa 06 §2.2 punto 3).
**Sección.** §7.

### D-25 · Los campeones: de dónde salen y cuándo existen

**Decisión.** `palmaresTitleSource.titlesOn(worldId, gameDay)` (`packages/db/src/titles.ts`) hace una consulta `DISTINCT ON (race_id)` sobre `palmares` con `kind = 'gc'` (el índice `palmares_race_idx (world_id, race_id)`, `schema.ts` l. 785, la sirve para todos los países a la vez) y `race_id` que casa EXACTAMENTE `^nc-[a-z]{2}-(road|itt)$` (élite) o `^nc-[a-z]{2}-u23-(road|itt)$` (sub-23), nunca `LIKE 'nc-%-road'`, que casa con `nc-it-u23-road`; un título vale el día `d` si `validFromDay < d ≤ validToDay` (7-c: da lo mismo que «≤» con el orden actual del tick, que corre los nacionales detrás de toda otra carrera del día, y no depende de ese orden); vigencia hasta el día de la edición siguiente o `validFromDay + 364`; `provisional: true`; `source` es la etapa del campeonato, así que un título cuyo campeonato está velado para el espectador no viaja (B13). No hay Mundial ni continentales: no existen en el calendario (mapa 04 §4). **Antes del primer nacional de un mundo reiniciado no hay campeones**: `palmares` solo lo escribe `stageRun.ts` (l. 1280 y 1298) y la ruta élite de casi todos los países es `NATIONALS_ROAD_DAY = doy(6, 28)`, el día 179 de la temporada (`packages/engine/src/routes/calendar.ts` l. 204; la crono y el sub-23 en los días previos de la misma semana); de los 22 países de `NATIONALS_ROAD_OVERRIDE` (l. 211-234), 17 lo corren antes (Australia el día 11, Colombia el 39, Macao el 172) y 5 después (Irán 181, Mongolia 185, Jamaica 186, Kirguistán 235, Malasia 256; `l5/nacionales.mjs`, §7.4). El Giro de la temporada 0 (días 128-151) sale con campeones de 15 países y ninguno de Italia. En ese hueco el rótulo no dice nada y el maillot es el del equipo: sin marcador provisional ni aviso. E12 puede sembrar títulos al crear el mundo detrás de la misma interfaz (DD-06). Texto (pantalla): `Champion of Italy`, `Time trial champion of Italy`, `U23 champion of Italy`, con el nombre de país de `COUNTRIES`; el icono lleva la bandera y una forma propia (no solo color, `navegacion.md` l. 455-457) y nunca el arcoíris (SPEC §8). La vía de `race_gc` se descarta: sin `world_id` ni `game_day`, una consulta por carrera y solo para carreras con equipos (cobertura §2.1).
**Evidencia.** cobertura §2.2 (C «desde el primer día» falsa tras el reinicio); C18; I-47 (I-cobertura-17); O-04 (O-cobertura-04); O-30 (O-ejecutabilidad-13: `ITA CHAMP` no es televisión); H-01; X-13.
**Sin evidencia de los jueces.** `Champion of Italy` en lugar de `Italian Champion`, que pidió el juez de ejecutabilidad: `COUNTRIES` solo tiene `{ code, name, flag }` (`packages/shared/src/countries.ts` l. 6-11), sin gentilicios para 133 países, y E10 tendría que traducir esa tabla a cada idioma.
**Sección.** §7.
**Corregida en el ensamblado v0** (§7.4; decisión 7-c; duda de §7; medido por L5 con `l5/nacionales.mjs`). Son 17 países con nacional antes del día 179, no 22, y la vigencia usa la cota inferior estricta de 7-c.

> Versión anterior: toma la edición con mayor `game_day` ≤ el día;
> Versión anterior: solo los 22 países de `NATIONALS_ROAD_OVERRIDE` (l. 211-234: Australia, Colombia, Nueva Zelanda y otros) lo corren antes. El Giro de la temporada 0 (días 128-151) sale sin campeón de Italia.

### D-26 · La notoriedad sin `fame`

**Decisión.** `riders.fame` no se escribe en ninguna parte (`rollover.ts` l. 60 y 293; es la primera de `MUERTAS_CONOCIDAS`, `columnasVivas.test.ts` l. 34-38): no ordena nada y la superficie W6 (rivales por fama en las órdenes) no destripa. `NotorietyLevel`, de menor a mayor: 0 lleva el maillot de la general; 1 campeón del mundo; 2 lleva otro maillot de líder; 3 lleva uno delegado; 4 campeón continental o nacional; 5 amenaza la general (puesto de salida ≤ 10, o un déficit menor que el hueco de su grupo al del líder); 6 ha ganado una etapa de esta carrera en lo que el espectador conoce; 7 nombre conocido: `knownWins ≥ BROADCAST.knownNameMinWins` (3), contando las victorias de `palmares` (`kind` `gc` o `stage`) de carreras cuya fila `gc` tiene `game_day ≤` día de la etapa − `SPOILER.expiryGameDays` (consulta con `EXISTS`, §7.5), que ningún velo puede ocultar por construcción; 8 el resto. Desempate: puesto de salida, dorsal. La frase de la fuga nombra a los `breakNamedMax` (2) de menor nivel por debajo de 8 y cuenta al resto; el corredor del espectador se nombra SIEMPRE, aunque sea nivel 8 (`…with your rider Iñigo Arrieta and two others.`, pantalla); sin notables, `Five riders go clear.` (pantalla). La lista de la fuga va por dorsal (estable).
**Evidencia.** I-23 (I-ejecutabilidad-03); C14; cobertura §2.7; ejecutabilidad #10; H-05; X-12.
**Sin evidencia de los jueces.** `knownWins`: los jueces vieron el hueco (H-cobertura-05) y nadie propuso el dato.
**Sección.** §7.
**Corregida en el ensamblado v0** (§7.5; decisión 7-e; dudas de §7 y §15). La cuenta por el día de cada victoria no era cierta para una etapa ganada en una vuelta, que sigue velada hasta 56 días después de la ÚLTIMA etapa; cuentan las carreras terminadas hace más de `expiryGameDays` (7-e).

> Versión anterior: contando las victorias de `palmares` (`kind` `gc` o `stage`) con `game_day ≤` día de la etapa − `SPOILER.expiryGameDays`, que ningún velo puede ocultar por construcción;

### D-27 · A quién se nombra en cada grupo

**Decisión.** Sobre la pertenencia completa, la política de `ingeniero.md` §6.4: un grupo de hasta `nameWholeGroupUpTo` (12) se nombra entero (el mismo umbral que la radio, `raceRadio.ts` l. 611); en uno mayor, los que tiran, los que llevan un maillot que no es el de su equipo, el top `namedGcTop` (10) de la general de salida, los del espectador y los protagonistas de sucesos YA revelados (el que ataca en el km 40 se nombra en el pelotón desde el km 40, no antes); el resto se cuenta (`+143 riders`, pantalla). Cada grupo que tira lleva una línea: `Pulling: Team Beta (for 11 S. CARTER)` (pantalla). El hueco de un corredor es el de su grupo (D-01, punto 4). B3 exige rótulo para el 100 % de los corredores de todo grupo en todo instante (hoy, fuera del pelotón en reinas, el 47-64 %, mapa 01 §2.3).
**Evidencia.** I-46 (I-cobertura-04: «pero no dice quién es, wey», `docs/balance.md` l. 9594, v57); H-17; [DUEÑO 5] y R23.7 (`tactica.md` l. 4875-4876).
**Sección.** §6, §7.
**Pendiente en el ensamblado v0** (duda de §7; decisión 7-a). La línea de ejemplo `Pulling: Team Beta (for 11 S. CARTER)` supone un apellido que el esquema no guarda (`riders` solo guarda `name`); 7-a escribe el nombre del rótulo tal como está guardado. La forma del nombre en la barra, en `Pulling:` y en los cuadros queda abierta para la fase adversaria (`dudas.md`).

---

## E. El modo sin destripe

### D-28 · Qué es «visto»

**Decisión.** Para un espectador, una etapa corrida está oculta (en guardia y sin tocar), a medias (reproducida hasta `reached_s`: solo sirve para reanudar y para acotar los tramos; para el resto del producto sigue oculta), vista (`W` en directo o `S` en resumen o digest: lo alcanzado llegó a la meta), revelada (`R`), arrastrada (`A`) o caducada (`X`). Lo conocido de una carrera es SIEMPRE un prefijo 1..k, porque la N+1 sale con los maillots y la general de la N: ver o revelar la N revela 1..N−1 con `A`, y se dice antes (`This also reveals stages 3 and 4.`, pantalla). Lo alcanzado lo informa el cliente y es lo único que convierte una etapa en vista; lo servido lo decide el servidor y NO cuenta: si se cierra la pestaña con el último tramo descargado y sin reproducir, la etapa no está vista y ninguna otra pantalla la destripa. Confiar en el cliente es correcto: mintiendo solo se destripa a sí mismo.
**Evidencia.** Orquestador; `producto.md` §7.1-7.2; I-28; O-20 (O-motor-08: `entregadoHastaB` cuenta como visto lo que el jugador no ha visto).
**Descartado.** «Lo servido es lo visto» (`television.md` §7.1, `datos.md` §7.2, `estado.md` §7.1).
**Sección.** §10.

### D-29 · La tabla de lo visto lleva el mundo

**Decisión.** `race_watch`, una fila por (usuario, mundo, carrera) con `follow`, `known_through`, `how`, `watching_stage`, `reached_s` y `updated_at`; clave `(user_id, world_id, race_key)`. El `world_id` va en la clave porque las claves de carrera se repiten en cada mundo (`race-france:s0`) y ningún documento dice si las cuentas sobreviven al reinicio (mapa 04 §8): sin él, el mundo nuevo nacería «visto». Además, el procedimiento del reinicio borra `race_watch` (nota en `docs/ops.md`, paso 12). `users` gana `spoiler_scope`, `horizon_rev`, `last_seen_at` y `reveal_confirm`. Coste: la forma B del mapa 04 §3, de 40 a 80 mil filas por año real con 1.000 jugadores (unas 110 mil con la `X` de la caducidad y la guardia de cabecera por defecto, §13.8), y como mucho una escritura cada 15 s de pared por usuario y carrera mientras se mira (D-55, 10-l).
**Evidencia.** H-11 (H-motor-02); `producto.md` §7.2; mapa 04 §3.
**Descartado.** `stage_views` por etapa (`ingeniero`, `estado`, `datos`, `television`): la forma B basta porque lo conocido es un prefijo, y la procedencia etapa a etapa cabe en `how`.
**Sección.** §10, §13.
**Precisada en el ensamblado v0** (§13.8, §10.3; duda 3 de §13). La cota de filas y la carga de escritura siguen a §13.8 y a D-55 corregida; la decisión no cambia.

> Versión anterior: Coste: la forma B del mapa 04 §3, de 40 a 80 mil filas por año real con 1.000 jugadores, y una escritura por minuto real y espectador como mucho mientras se mira (D-55).

### D-30 · El alcance del velo por defecto

**Decisión.** Una carrera está en guardia para el espectador si es propia (su corredor está en su `race_rosters`, o el equipo que posee, `teams.owner_user_id`, corre en ella), si la sigue (`follow = 1`: el botón `Follow without spoilers`, o automáticamente al empezar a ver cualquiera de sus etapas, que es un defecto que va a DD-01) o, en el alcance `guarded`, que es el de defecto, si es de cabecera (`SPOILER.headlineRaces`: las tres grandes vueltas y los cinco monumentos, 68 etapas por temporada); y no la ha soltado (`follow = −1`). Alcances: `guarded`, `own_only` (propias y seguidas) y `off` (nada en guardia; la etapa sigue abriendo en `Watch`, sin puerta). El resto del mundo se ve al día, porque un ranking, un feed o una ficha que esperasen a todo lo no visto se quedarían parados para quien no mira nada: con todas las carreras en guardia, un jugador que no mira nada tendría a la vez 202 etapas veladas en la mediana y 669 como máximo, alguna en 356 días de 364 (medido, `c-l6/todas.mjs`), y esa es la tercera respuesta de DD-01. Coste medido por producto (`e2prod/headline.mjs`): un jugador en `guarded` que no mira nada tiene alguna etapa de cabecera velada 260 días de 364, 7 en la mediana, 29 en el p90 y 42 como máximo, y su ranking va por detrás en esas carreras. Las ocho de cabecera NO son palabra del dueño (el «por defecto» es de la agenda, mapa 05 §1): van a DD-01 con esa cifra. Seguir al empezar a ver tampoco lo es: el dueño pidió «News + Race Radio + journal, y sin destripe» (`docs/encargos.md` l. 680), y lo que le pasa al resto del producto de quien mira una etapa suelta va a DD-01 con su consecuencia.
**Evidencia.** Orquestador; I-28; `producto.md` §7.3; O-09 (O-cobertura-09).
**Sección.** §10.
**Corregida en la corrección, fase 5** (§10.4; hallazgos Rdueno-023 y Rdueno-024; medido con `c-l6/todas.mjs`, la cuenta de `e2prod/headline.mjs` sobre las 842 carreras del calendario). La cita de `docs/captacion.md` l. 100-101 es un mensaje de captación, en un documento que se declara «plan operativo. No es diseño de producto» (l. 3), y no puede justificar el alcance del velo: el porqué es propio y va con la cifra de la lectura literal del encargo («que ninguna otra pantalla se lo reviente por detrás», `docs/encargos.md` l. 145-146), todas las carreras en guardia, que es la tercera respuesta de DD-01. Y seguir una carrera al empezar a ver una de sus etapas es una decisión sobre el alcance del velo, la misma materia que DD-01, que el borrador tomaba sin decirlo: se implementa por defecto y va al dueño dentro de DD-01.

> Versión anterior: El resto del mundo se ve al día: «races happen whether you are watching or not» (`docs/captacion.md` l. 101).
> Versión anterior: si la sigue (`follow = 1`: el botón `Follow without spoilers`, o automáticamente al empezar a ver cualquiera de sus etapas)

### D-31 · La caducidad

**Decisión.** El velo de una carrera se levanta `SPOILER.expiryGameDays` (56 días de juego, 14 reales) después de su ÚLTIMA etapa, todas sus etapas a la vez (el prefijo se conserva); en la visita siguiente se escribe `X` y se avisa una vez (`Results of Race Italy are now shown (finished 16 days ago) · Watch the digest anyway`, pantalla). Mientras la carrera está en curso no caduca nada. Una etapa caducada sigue abriendo en `Watch` si se entra en ella.
**Evidencia.** `producto.md` §7.3 y `datos.md` §12 (56); O-26 (O-ejecutabilidad-07: con 28 días de juego queda revelado el Tour a quien se fue dos semanas; una gran vuelta dura unos 6 días reales, mapa 04 §2).
**Descartado.** 7 días reales (`estado.md`), 40 de juego (`television.md`), 28 de juego (`ingeniero.md`).
**Sección.** §10.

### D-32 · El horizonte en un solo punto

**Decisión.** Cuatro piezas que se vigilan entre sí:
1. **El tipo.** `Horizon` es parámetro OBLIGATORIO y sin defecto de toda función de `packages/db` que lea `stage_results`, `race_gc`, `stage_team_results`, `stage_snapshots.events` o `.radio`, `stage_timelines`, `palmares`, `rider_points`, `news`, `transactions`, `teams.budget`, `riders.season_points`, `riders.health` o `race_rosters.abandoned_day`. El tick, la administración y los bancos pasan `worldHorizon`, explícito. Una llamada nueva no compila sin decidir. `readStageTimeline` y `timelineForStage` lo reciben (5-p, 14-p); `buildTimelineCast` y `palmaresTitleSource.titlesOn`, que corren en el tick y no leen para nadie, no (10-c).
2. **El predicado.** `veilSql(h, raceKey, gameDay, stageDay?)` (con una segunda firma con `gameDay` nulo, para `stage_team_results`; enlaza las listas con `sql.param`, 10-d) es la ÚNICA forma de escribir el corte en SQL: `(raceKey, gameDay)` identifica una etapa porque ninguna carrera declara `doubleAfter` (mapa 02 §1.3), y desde la `0046` se usa `stage_day` donde existe. `throughStage` e `isVeiled` sirven lo que va por número de etapa.
3. **Los mecanismos.** P prefijo (las `…ThroughStage` que ya existen, `results.ts` l. 236, 320, 379); R resta (el total del mundo del día, cacheado, menos `VeilDelta`, y se reordena); F filtro (filas veladas fuera y UN marcador neutro por etapa velada en toda lista que sea un flujo); M máscara (el estado previo guardado: la salud en la noticia `injury`, el abandono); G puerta; B tramos; N neutro por construcción; L libre, con su motivo escrito. La existencia también informa: todo aviso («hay resultados ocultos») depende SOLO del horizonte y es igual en todas las fichas; ninguna decisión de enviar o de enseñar mira el contenido que esconde.
4. **El registro y el canario.** `registerSpoilerGuard` exige `config.spoiler` y su mecanismo, `config.veil` (14-d), en TODA ruta que devuelva cuerpo, sea del método que sea (la retirada `POST /api/riders/me/races/:raceKey/retire` devuelve `alreadyOut`, `routes/riders.ts` l. 648), y lanza al arrancar si falta; B1a a B1d recorren lo que registra Fastify, no una lista a mano (hay 52 rutas GET, cobertura §2.4; Fastify 5.11.2 registra 140: 87 rutas propias y 53 `HEAD` que heredan su `config`, medido por L6, §14.5).
**Evidencia.** I-49 (I-motor-11); I-28, I-29, I-30, I-39; O-31 (O-ejecutabilidad-14); `producto.md` §7.4; `ingeniero.md` §7.2-7.4; X-17.
**Sección.** §10, §11, §14.
**Precisada en el ensamblado v0** (§5.6 (5-p), §10.6 (10-c, 10-d), §14.4 (14-p) y §14.5 (14-d)). Se añaden las firmas con `Horizon` que fijaron §5 y §14, el cuarto parámetro de `veilSql` y el registro medido.

> Versión anterior: El tick, la administración y los bancos pasan `worldHorizon`, explícito. Una llamada nueva no compila sin decidir.
> Versión anterior: `veilSql(h, raceKey, gameDay)` es la ÚNICA forma de escribir el corte en SQL:
> Versión anterior: `registerSpoilerGuard` exige `config.spoiler` en TODA ruta que devuelva cuerpo,
> Versión anterior: (hay 52 rutas GET, cobertura §2.4)

### D-33 · El coste del horizonte: un índice y un memo

**Decisión.** `race_rosters` solo tiene la clave `(race_id, rider_id)` (`schema.ts` l. 609): buscar las carreras de un corredor es un recorrido secuencial, 19,6 ms con 249.232 filas (la cota de cuatro temporadas, un año real) contra 0,11 ms con índice (medido por el juez del motor en PGlite). La `0045` añade `race_rosters_rider_idx (rider_id)`. `computeHorizon` hace cuatro consultas (usuario y alcance; listas de su corredor y de su equipo en la temporada actual y la anterior; sus filas de `race_watch`; la última etapa corrida de cada carrera en guardia) y se memoriza por `(userId, currentDay, horizonRev)` `SPOILER.horizonMemoS` (60 s) en el proceso; `veilDelta` solo lee filas veladas por los índices nuevos y está vacío si no hay velo. La consulta 2 así escrita no usa el índice (`Seq Scan`, de 23 a 40 ms en PGlite) y la cuarta cuesta 2,1 ms con 273 carreras en guardia: `computeHorizon` usa la forma D (18-a), con los ids del espectador por delante, `rider_id = any($ids)` y la cuarta una vez por `(worldId, currentDay)` para todas las carreras (`lastRunStages`). B14: p95 ≤ `SPOILER.horizonBudgetMs` (5 ms), con `computeHorizon` y `recordProgress` medidos por separado y dos espectadores (16-k), contra el Postgres de servicio del CI en una base propia (`TEST_DATABASE_URL`): el jugador y `recordProgress` son puerta en la suite rápida; sin esa base, en PGlite, B14 imprime los p95 y falla solo por encima de 15 ms, que caza la pérdida del índice (18-j). El mánager de un equipo de 30 da de 8,6 a 9,3 ms en PGlite y 3,88 ms en PostgreSQL 16 sin red, y es puerta en la medida del paso 7, desde el servicio `web` de Railway contra una copia de la base de producción; si no pasa, decide el dueño y `SPOILER_MODE` no pasa a `on` (DD-21). `users.last_seen_at` se escribe como mucho una vez por hora (lo pide también E7, `encargos.md` l. 729-731).
**Evidencia.** O-17 (O-motor-05); H-10 (H-motor-01); I-33 (I-motor-16); C12; X-11.
**Descartado.** Leer `race_callups` (clave `(rider_id, race_id, season)`, la otra vía que da el juez): la guardia se define por la lista de salida, que es `race_rosters`.
**Sección.** §10, §13, §16.
**Corregida en el ensamblado v0** (§18.2 (18-a), §16.4 (16-k), §20 (DD-21); medido por L7 con `l7/horizonte.mjs` y `l7/horizonte2.mjs`). La forma de las consultas y la puerta de B14 cambian con lo que midió §18.2.

> Versión anterior: B14: p95 ≤ `SPOILER.horizonBudgetMs` (5 ms).

**Precisada en la corrección, fase 5** (§10.3, §10.6 y §10.7, decisiones 10-m y 10-n; hallazgos Rcoste-010, Rcoste-011 y Rcobertura-047; medido con `coste/memo/memo.mjs` y `c-l6/veildelta-forma.mjs`). El código de §10.6 escribe ya la forma D, con `lastRunStages`. Los memos del proceso (el de `computeHorizon`, el de `veilDelta`, 18-c, y el de la sesión de `request.viewer()`) son un `TtlMemo`: la entrada caducada se borra al leerla, cada `set` barre las caducadas y un tope, `SPOILER.horizonMemoEntries` (500), borra la más antigua; con solo `get` y `set` cada clave vieja se quedaba hasta reiniciar (9 y 35 KB por horizonte, 75 y 180 KB por `VeilDelta`, medido; de 18 a 470 MB al día, estimado). `request.viewer()` memoriza 60 s el usuario de la sesión, porque cada informe y cada tramo leían la sesión en la base; no con `session.cookieCache` de better-auth (10-n).

**Precisada en la corrección, fase 5** (L7: §18.2 y §18.9, decisión 18-j; hallazgos Rcoste-020 y Rcoste-012; medido con `coste/pgm/horizonte-pg.mjs`, `horizonte-socket.mjs` y `progreso-socket.mjs`). Por el socket de `testDb.ts`, que es el camino de `horizonLatency.test.ts`, el p95 del jugador va de 2,55 a 4,97 ms entre corridas en la misma máquina y `recordProgress` llega a 5,08: una puerta de 5 ms en PGlite sería intermitente en todo PR. En PostgreSQL 16.13 nativo, sin red, el jugador da 2,16 ms, el mánager 3,88 y la población 2,60. La puerta de la suite rápida pasa al Postgres del CI, y la de DD-21, a una medida con la red de Railway.

> Versión anterior: B14: p95 ≤ `SPOILER.horizonBudgetMs` (5 ms), con `computeHorizon` y `recordProgress` medidos por separado y dos espectadores (16-k): el jugador pasa (de 3,1 a 3,7 ms en PGlite) y es puerta en la suite rápida; el mánager de un equipo de 30 da de 8,6 a 9,3 ms en PGlite y es puerta contra Postgres en el paso 7; si no pasa, decide el dueño y `SPOILER_MODE` no pasa a `on` (DD-21).

### D-34 · La sesión de 7 días y la cookie de espectador

**Decisión.** better-auth caduca la sesión a los 7 días y la renueva como mucho una vez al día (`apps/api/node_modules/better-auth/dist/context/create-context.mjs` l. 146-147; `apps/api/src/auth.ts` no configura `session`): quien vuelve tras una semana llega sin sesión y hoy `/news`, `/world` y los rankings son públicos (la portada de invitado no enseña resultados, `Home.tsx` l. 44-72). Al entrar, el servidor pone `cs_viewer`: el id de usuario firmado con HMAC (`SESSION_SECRET`), `httpOnly`, `Secure`, `SameSite=Lax`, de `SPOILER.viewerCookieDays` (90). Una petición sin sesión y con `cs_viewer` válida recibe el horizonte de ese jugador en lectura (`readOnly: true`: no escribe progreso) y el aviso `Sign in to see results as you know them` (pantalla). Solo restringe: no autentica ni abre ninguna ruta privada (test en B12). Se borra con un cierre de sesión explícito. Alargar la sesión es de E4 y ayuda, pero no basta.
**Evidencia.** I-31 (I-motor-13, I-ejecutabilidad-09); O-18 (O-motor-06, O-ejecutabilidad-06); cobertura §2.5; C13; ejecutabilidad #7; X-16.
**Sección.** §10.

### D-35 · La caché de la web

**Decisión.** `Horizon.rev` va en la clave de toda consulta de React Query que dependa del horizonte; `GET /api/me/horizon` tiene `staleTime` 0 y se pide al enfocar; revelar o llegar a meta invalida `['horizon']` y lo demás se rehace solo; `queryClient.clear()` al entrar y al salir de la cuenta (hoy `signOut` no la limpia, `Account.tsx` l. 311-314, y las claves del mundo no llevan usuario y viven 30 min, `queryClient.ts` l. 17-46); `Cache-Control: private, no-store` y `Vary: Cookie` en toda respuesta que dependa del horizonte; los tramos, `private, max-age=3600`, porque el dato es inmutable y solo se sirve dentro de lo permitido.
**Evidencia.** I-32 (I-motor-12); O-18; C13.
**Sección.** §10, §14.
**Precisada en la corrección, fase 5** (§10.8, §10.9, §14.9 y §14.11, decisiones 10-g, 14-m y 14-r; hallazgos Rcoste-014, Rcoste-018 y Rcodigo-057). Con `Vary: Cookie` el navegador solo reutiliza un tramo si la cabecera `Cookie` es idéntica, y `cs_viewer` firmada en cada respuesta la cambiaba en cada petición: se renueva como mucho una vez al día. `clear()` solo con un cambio de un valor ya resuelto de la sesión, no en el paso de pendiente al primero; mientras `['horizon']` no responde, las consultas con horizonte esperan (`enabled`), en lugar de salir dos veces con un `rev` provisional; y el vigilante es un componente dentro del `QueryClientProvider`.

### D-36 · El visitante y el acta compartible

**Decisión.** `/world/races/:raceId/stages/:day` abre en `Watch` para todo el que no conoce la etapa, visitante sin cuenta incluido: su horizonte es `anon` y no se le oculta nada fuera de la etapa ([DUEÑO 8]: «un visitante sin cuenta debe poder ver el resultado de una carrera», `docs/motor.md` l. 1504-1506), pero entrar es sentarse a verla y el acta está a un toque. Para un espectador que la conoce, abre en `Report`. El acta vive en `/world/races/:raceId/stages/:day/report`, pública e indexable por defecto (la vista de espectador de `docs/motor.md` Parte IV, «la que indexa Google», l. 1510; «El mejor activo que tiene este juego hoy es la crónica de una etapa», `docs/captacion.md` l. 39-42); el robot de un buscador no lleva cookie y guarda su `og:description` con el ganador (DD-12), así que indexarla es una elección del dueño con DD-12. Compartir: `Share to watch` siempre (vista previa `Stage 8 · Race France · Watch the race`, `187 km · mountain stage`) y `Share the report` solo si quien comparte conoce la etapa, con el `og:description` marcado `Spoiler` (DD-12). Quien abre un `/report` de una etapa velada ve la puerta. El progreso del visitante vive en `localStorage`, envuelto en `try/catch`; si falla, desde la salida.
**Evidencia.** O-08 (O-cobertura-08); I-36 (I-ejecutabilidad-14); mapa 05 §6 contradicción 2.
**Descartado.** El visitante que abre la clásica conocida en el acta (`producto.md` §7.4, §7.5 fila C3).
**Sección.** §11.

**Precisada en la corrección, fase 5** (L7: §11.10; hallazgo Rdueno-043). Indexar el acta no es el requisito del dueño, que pide que sea pública ([DUEÑO 8]), sino la propuesta de `docs/motor.md` para la vista de espectador (l. 1510); y el buscador, con horizonte `anon`, deja el ganador en la lista de resultados. Se queda indexable por defecto y la elección va con DD-12; la otra cara es `X-Robots-Tag: noindex` en `/report`.

> Versión anterior: El acta vive en `/world/races/:raceId/stages/:day/report`, pública e indexable (la vista de espectador de `docs/motor.md` Parte IV; «El mejor activo que tiene este juego hoy es la crónica de una etapa», `docs/captacion.md` l. 39-42).

### D-37 · La previa de N+1 y las órdenes

**Decisión.** La ficha y la retransmisión de la N+1 llevan los maillots, la general y la lista de salida de tras la N. Con la N velada, `BroadcastHead.gate = { k: 'previous_unseen', firstUnseen }` y la puerta (pantalla): `You haven't watched stage 6 yet` · `Watch stage 6` · `Highlights of stage 6` · `Show result of stage 6 and continue`; la tercera revela la N y arrastra las anteriores. El reparto degrada lo que venga de la N (D-15, B13), y los títulos de campeón siguen la misma regla con su `source`. Las órdenes de la N+1 se pueden dar siempre (DD-09): la página abre con `Stage 6 is waiting for you` · `Watch (about 9 min)` · `Show result` · `Give orders anyway` (pantalla) y, en la tercera, sirve las clasificaciones hasta lo conocido (`raceOrdersResponseSchema`, `contracts.ts` l. 1174-1189, no lleva la general).
**Evidencia.** `producto.md` §7.13; `datos.md` §7.4; `television.md` §7.6; `ingeniero.md` §7.7; mapa 06 §7.2 regla 6 (la señal UCI abre con «finish of the previous stage + classifications»).
**Sección.** §11.

### D-38 · Revelar sin castigo

**Decisión.** `Show result` está en toda puerta. La primera vez confirma: `Show the result of Stage 7? You won't be able to watch it without knowing.` con `Don't ask again` (pantalla), que guarda `users.reveal_confirm = false`. Revelar no cuesta ni da nada: ningún premio, logro, moral ni dinero lee `race_watch` (B20). Revelada, la etapa se puede ver igual (`Watch anyway`, pantalla) y el producto no vuelve a preguntar.
**Evidencia.** I-35 (I-ejecutabilidad-13).
**Sección.** §11.

### D-39 · Volver tras una semana

**Decisión.** La portada abre con tres bloques, por este orden: `Continue watching` (etapas a medias, con la barra en km y `42 km to go`), `Ready to watch` (una tarjeta por etapa velada: carrera, número, km, tipo, perfil sin marcas y `Your rider raced` si su corredor estaba en la LISTA DE SALIDA, nunca porque hiciera algo) y `While you were away`, por cada carrera en guardia terminada con etapas veladas: `Watch the race in 40 minutes` (el número se calcula con `BROADCAST.digestBudgetS` y los cuadros: 38, 40 y 43 min para las tres grandes vueltas enteras, 8-b; sin los cuadros, de 34,5 a 39,5 min, §15.3; cada etapa cuenta como vista con `S`), `Key stages` (las que marca el PERFIL: reinas, cronos y la última; elegirlas por el resultado sería destriparlas), `Continue from stage 4` y `Show results` (pantalla). Una gran vuelta cabe entera en una semana (mapa 04 §2) y la caducidad de 56 días la mantiene en guardia. Al acabar una etapa, `Next: Stage 8 · Watch` sin reproducción automática; dos carreras del mismo día van en filas separadas, la más antigua primero.
**Evidencia.** I-37 (I-ejecutabilidad-10); O-26 (O-ejecutabilidad-07); `producto.md` §7.8-7.9; H-20 (H-ejecutabilidad-04).
**Sin evidencia de los jueces.** La cola seguida (H-20): sin reproducción automática, la más antigua primero y dos carreras del mismo día en filas separadas; el juez de ejecutabilidad vio el hueco (H-ejecutabilidad-04) y ninguna propuesta lo resolvió.
**Descartado.** `Catch up at ×4` (`ingeniero.md` §7.8: la final a 3 s por km); `Highlights of all` (`television.md`: horas); `Reveal all but the last 3` (`datos.md`: una gran vuelta en resumen, unas 2 h).
**Sección.** §8, §11.
**Corregida en el ensamblado v0** (§8.8 (8-b), §15.3 (`l2/digest.mjs`); dudas de §8, §15 y §20; DD-22). Una gran vuelta en digest no son unos 30 min sino de 38 a 43 con los cuadros, y el botón dice el número calculado; si el dueño quiere 30, bajan los presupuestos (DD-22).

> Versión anterior: `Watch the race in 30 minutes` (cada etapa en digest con `BROADCAST.digestBudgetS`: 21 etapas son unos 30 min; cada una cuenta como vista con `S`)

### D-40 · El modo diagnóstico del dueño

**Decisión.** Un administrador (`users.is_admin`) puede abrir cualquier etapa con `?diag=1`: la ruta de etapa, la radio y la línea se le sirven enteras sin aplicar su horizonte y SIN escribir `race_watch`; la pantalla lo dice (`Diagnostic view · not counted as watched`, pantalla). Es como el dueño sigue cazando defectos en la radio de producción sin revelarse las etapas que quiere ver como espectador ni quedarse sin mirarlas. La ficha de carrera y el feed aceptan el mismo `?diag=1`, con `worldHorizon` y la misma franja, porque también depura las clasificaciones y las noticias (11-h).
**Evidencia.** H-06 (H-cobertura-06, H-ejecutabilidad-03); [DUEÑO 10].
**Sin evidencia de los jueces.** El mecanismo es de esta síntesis (los jueces vieron el hueco; ninguna propuesta lo define).
**Sección.** §11.

**Precisada en la corrección, fase 5** (L7: §11.15, decisión 11-h; hallazgo Rdueno-039). Con `SPOILER_MODE=admins`, la ficha de carrera y el feed le enseñaban al dueño lo de antes en toda carrera en guardia que no hubiera visto, sin salida de diagnóstico, y ahí caza defectos («… y en las clasificaciones, incluso tras la etapa 1, pone DNF», `docs/balance.md` l. 9173-9175, v45).

> Versión anterior: Es como el dueño sigue cazando defectos en la radio de producción sin revelarse las etapas que quiere ver como espectador ni quedarse sin mirarlas.

### D-41 · Lo que no se vela, y lo que se ve de otros

**Decisión.** Se enseñan sin velo la condición y los atributos del corredor propio (frescura, estrellas, cerillos, forma y `FormChart`, sup. H3: se necesitan para ordenar, DD-08), y los atributos de la ficha de cualquier corredor y las notas del preparador, que mueve lo aprendido en la etapa (sup. X11, 11-r); pero su `parte` de los días de carrera velados va a null (sup. H4) y el informe del bloque y la tendencia (`/api/riders/me/report` y `/trend`, `routes/riders.ts` l. 447-477, que suman un aprendizaje que multiplica TAC por 1,8 al ganar y 1,4 en el top 10, `learning.ts` l. 106-110) filtran esos días (sup. X1). `upcoming-races` y `my-orders` enmascaran un abandono velado (sup. X2; hoy la carrera desaparece, `riderSchedule.ts` l. 217); `/api/free-agents` resta los puntos velados (sup. X4, `browse.ts` l. 234). Una décima puerta, `sup. X10`: el planificador (`GET /api/riders/me/orders`) y su proyección (`POST /api/riders/me/plan/preview`) dejan de contar como de carrera, tras un abandono, los días que quedaban (`riderSchedule.ts` l. 47), y se enmascaran con `VeilDelta.abandons`, a la vez que `sup. X2` (11-b). `GET /api/teams/me/race-plan` no lee dinero y es `safe` (11-k). El presupuesto del equipo SÍ se vela por defecto: `stage_team_results.prize` le da libro (resta R, sup. P6), y la elección es del dueño (DD-26, 11-t), porque el premio de equipo solo lo cobra el equipo que gana la etapa o la general y el dinero de los equipos es su primera decisión de economía. Lo que el jugador ve de otros jugadores se ve con SU horizonte, nunca con el del dueño de esos corredores; lo visto por cada uno es privado: ninguna ruta devuelve `race_watch` de otro y no existe «3 players watching». Regla para E9: todo contenido de jugador colgado de una etapa lleva sellado el horizonte de su autor al escribirlo y solo se enseña a quien ha llegado a ese punto.
**Evidencia.** `producto.md` §7.5, §7.15; I-34 (I-motor-14); I-29 (I-ejecutabilidad-11); O-32 (O-ejecutabilidad-08); H-08 (H-cobertura-08); cobertura §2.4; X-17.
**Descartado.** Aceptar el presupuesto como fuga (`ingeniero.md` 16.8, `datos.md` decisión 5).
**Sección.** §11.
**Precisada en el ensamblado v0** (§11.2 (11-b) y §11.3 (11-k)). Se añade la décima puerta que encontró §11.2 y la clase de la ruta del plan del equipo.

> Versión anterior: `/api/free-agents` resta los puntos velados (sup. X4, `browse.ts` l. 234).

**Precisada en la corrección, fase 5** (L7: §11.2, §11.3 y §11.13, decisiones 11-r y 11-t; hallazgos Rcodigo-061 y Rdueno-026; medido con `rcod/n/b1/attrs.mjs`). `GET /api/riders/:id` manda los atributos de cualquier corredor y la etapa velada los mueve (TAC de +0,37 a +0,41 en el mundo de B1, y el ganador no es el que más sube); `GET /api/riders/me/coach-view` saca sus notas de los atributos de hoy. Quedan L por DD-08, en la lista blanca de B1b. Y el presupuesto se vela por defecto, pero con la elección en §20: el velado es una cota inferior del real y `draftRace` no lo mira.

> Versión anterior: Se enseñan sin velo la condición y los atributos del corredor propio (frescura, estrellas, cerillos, forma y `FormChart`, sup. H3: se necesitan para ordenar, DD-08);
> Versión anterior: El presupuesto del equipo SÍ se vela: `stage_team_results.prize` le da libro (resta R, sup. P6).

### D-42 · Título de pestaña, historial, vista previa y correo

**Decisión.** `usePageTitle` es el único escritor de `document.title` (un test lo prohíbe fuera de él) y solo acepta `PreStageInfo` y `PageKind`: `Stage 7 · Race France · Cycling Star`; el acta, `Stage 7 report · Race France · Cycling Star`, también cuando la etapa es conocida, porque el historial y el autocompletado del navegador guardan títulos (pantalla). Las URL no llevan resultado. El fallback de la SPA (`apps/api/src/app.ts` l. 205-210) inyecta en `index.html` el mismo título y las etiquetas `og:` neutras para las rutas de carrera y etapa, porque la vista previa de un enlace no ejecuta JavaScript. El favicon es estático; un contador cuenta etapas por ver, nunca resultados (el `badge` de `Tabs.tsx` l. 78-79). Correo: `stageReadyEmail`, construido con `stageReadyNotice(PreStageInfo, ownRiderOnStartlist)` (asunto `Stage 7 of Race France is ready to watch`; primera línea `187 km · mountain stage · your rider is on the start list`; botón `Watch`, pantalla); la decisión de ENVIAR no mira el resultado (un correo que solo sale si tu corredor hizo algo destripa por existir); ningún adjetivo que dependa de lo que pasó; el envío es de E4 (DD-10). B1a renderiza el título, las `og:` y el correo con el canario.
**Evidencia.** I-27, I-36 (I-ejecutabilidad-14); `television.md` §7.5 (`PreStageInfo`: por tipo no cabe un resultado); `producto.md` §7.10-7.12; cobertura §2.9 (`index.html` l. 7 fijo; ningún `document.title` hoy).
**Sección.** §11.

---

## F. La voz, el acta y las noticias

### D-43 · La crónica que ve el futuro se corrige truncando su entrada

**Decisión.** La voz es `buildChronicle(events, names, { live: { untilS, stageKm, revealS } })` (`ingeniero.md` §8.2), y ninguna de las veintiuna pasadas se reescribe (veinte llamadas en l. 353-375 más `markConcession` dentro del `map`, l. 319; §12.2):
1. Entran solo los sucesos con `revealS ≤ untilS` (D-05): una pasada que no ve el futuro no puede contarlo, y así se neutraliza `caughtLaterKm` (`chronicle.ts` l. 297).
2. Orden por la hora de revelado: `revealS`, y a igualdad `tS`, `EVENT_ORDER` y km (12-a: con el `revealS` real, ordenar por `tS` rompe el prefijo 44 veces en 18 corridas y por `revealS`, ninguna); con `live`, la rama `byClock` de la crono (l. 323-327) no ordena.
3. La longitud de la etapa entra como dato: hoy la deducen del último suceso `followTheLeader` (l. 545), `clockTheGaps` (l. 637) y `markReunion` (l. 945), y truncado el último suceso es «ahora».
4. Se apagan exactamente cinco pasadas retroactivas, las que cambian o borran una línea ya dicha por algo que pasa después: `markConcession` (l. 319), `dropUndoneSelections` (l. 361, mira líneas posteriores en l. 856-866), `groupGapRuns` (l. 362), `foldQuickAttacks` (l. 371) y los racimos de `groupRuns` (l. 375).
5. La web quita de la voz lo que ya dice el estado (`time_gap`, `time_gap_run`, `front_group`) y los descuelgues sueltos de corredores sin rótulo, que cuenta la barra (`GRUPPETTO · 23`, pantalla).
`respecto`, `juntos` y `desenlace` SON causales y siguen en la voz: `followTheLeader` solo usa el `front` de las líneas anteriores (l. 546-601), `markReunion` acumula `maxFront` hasta la propia captura (l. 937-1005) y `desenlace` solo necesita la longitud. Medido por ingeniero (`prefijo.mjs`, 5 etapas × 3 semillas, 54-296 sucesos por etapa): revelando por reloj sin racimos, la voz a la hora `t` es prefijo exacto de la de `t + 30 s` en las 15 corridas, y en 18 con el `revealS` real (§12.2); truncar sin más da 94 violaciones. B19 lo sella sobre cinco etapas congeladas en `apps/api/src/__fixtures__/` (no dependen de la versión del motor). `dropLoneChaseGaps` (l. 396-410) calcula `field` con la etapa entera y nadie ha medido si rompe el prefijo: B19 lo dice, y si lo rompe también se apaga en vivo. Los racimos en vivo (la regla B3 del dueño: «No menciones uno a uno todos los ciclistas que se van descolgando: puedes mencionar muchos juntos con número», `docs/balance.md` l. 1845-1846, v13) van detrás de `BROADCAST.liveClusters` (apagado): un racimo de `liveClusterMin` (3) descuelgues de corredores sin rótulo dentro de `liveClusterWindowKm` (5) km se publica UNA vez, a la hora en que el grupo de su último miembro cruza el final de la ventana, y sus miembros nunca salen sueltos antes; se enciende solo si B19 sigue en 0 con él (DD-18). El acta es `buildChronicle` sin `live`, como hoy, con sus veintiuna pasadas; `chronicle.test.ts` (62) y `stageJournal.test.ts` (140) no se tocan por esto.
**Evidencia.** I-43 (I-cobertura-01, I-motor-09); I-44 (I-cobertura-02); O-02 (O-cobertura-02); cobertura §2.3 (línea a línea, cierta); ejecutabilidad #8; X-14.
**Sin evidencia de los jueces.** La regla del racimo en vivo publicado a la hora del cierre de su ventana para el grupo de su último miembro: ingeniero midió 0 violaciones con racimos revelando POR KM (descartado porque adelanta el descuelgue de un grupeto hasta 20 min) y 17 con una ventana de 1.200 s de reloj; esta regla no estaba medida. §12.3 la midió después sin rótulos, con la guarda de 12-d: 0 violaciones y una espera de 1.493 s de carrera de mediana (`l8/voz2.mjs`); falta medirla con la política de nombres real (B19 en el 6b, DD-18).
**Descartado.** Apagar `respecto`, `juntos` y `desenlace` o mandarlos al acta (`television.md` §8.1, `estado.md` §8.1, `datos.md` §8.1): son causales y el directo perdería el hilo del líder que el dueño pidió («si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío los últimos mensajes», `docs/balance.md` l. 5975-5976, v27). «La lista exacta la fija el test» (`producto.md` §8.1).
**Sección.** §12.
**Corregida en el ensamblado v0** (§12.2 (12-a) y §12.3 (12-d); dudas de §12). El orden de la voz es el de revelado (medido) y las pasadas son veintiuna; la regla del racimo gana la guarda de 12-d (nunca antes del revelado de ninguno de sus miembros), medida sin rótulos con 0 violaciones.

> Versión anterior: y ninguna de las veinte pasadas se reescribe:
> Versión anterior: 2. Orden por reloj: la rama `byClock` que ya existe para la crono (l. 323-327).
> Versión anterior: revelando por reloj sin racimos, la voz a la hora `t` es prefijo exacto de la de `t + 30 s` en las 15 corridas;
> Versión anterior: El acta es `buildChronicle` sin `live`, como hoy, con sus veinte pasadas;

### D-44 · Las plantillas que se escriben

**Decisión.** La voz y el acta reutilizan las 55 plantillas y 272 redacciones de `stageJournal.ts` (medido con el AST por el mapa 03 §2.3 y el juez de ejecutabilidad #6), pero se escriben: los `case` de `puncture`, `mechanical`, `truce_granted` y `truce_denied`, que hoy caen al `default` que imprime la clave cruda (`stageJournal.ts` l. 1602-1603); `crash` y `crash_names` (caída sintetizada, D-13); `break_presented` (la frase de la fuga, `breakHeadline`, D-26); `gap_trend` («the gap has fallen by 40 seconds in five kilometres», pantalla). El `default` deja de imprimir la clave: no imprime nada y B7 falla en el test.
**Evidencia.** O-24 (O-ejecutabilidad-03); ejecutabilidad #6; mapa 01 §3 c; X-21.
**Descartado.** «Ninguna frase nueva, ningún `case` nuevo» (`ingeniero.md` §8.2).
**Sección.** §12.

### D-45 · Las noticias: primera migración, con plazo

**Decisión.** La primera migración de E2 es `0043_noticias_con_datos` y va ANTES del reinicio del mundo (agenda l. 131-133: «antes del reset, añadir seed y data a news y mover el renderizado al momento de leer. Después del reset, cada noticia escrita sí es definitiva»): `news` gana `seed`, `data` (`NewsPayload`), `race_key`, `stage_day` y `tpl_rev`, nullable, con el índice `(world_id, race_key, stage_day)`, y `text` pasa a nullable. `emitNews` guarda datos con ids y códigos, nunca nombres ni inglés (`detail` desaparece: `reason`, `days`, `relocateCountry`, `age`), y la semilla que ya calcula y hoy tira (`win:${raceKey}:${gameDay}:${stageDay}`, `stageRun.ts` l. 1195 y 1214). `teamId` es el equipo del día del hecho, no el de hoy. `breakaway_win` exige que el ganador fuera en la fuga (su grupo en la última foto tiene `kind` `fuga`); hoy no se comprueba (`stageRun.ts` l. 1184-1186). `injury` lleva `prevHealth` y `prevUntilDay`, que `applyIncidents` conoce antes de escribir (l. 1117-1123), para la máscara de sup. P5. Dos `kind` nuevos con carrera y etapa, `gc_lead_taken` y `jersey_taken` (hoy no hay titular de cambio de líder, mapa 02 §3; MVP paso 39: «tras una etapa reina, el feed cuenta la historia»). `renderNews` pasa a `packages/shared/src/news.ts` y reproduce el inglés de hoy carácter a carácter, salvo el espacio antes de la coma de `contract` (mapa 02 §3), que se corrige y se dice; la copia del motor (`world/news.ts` l. 53-58) se retira en el paso 4a, que ya paga los bancos. La API manda `text` renderizado además de `payload` mientras una SPA cargada valide `text: z.string()` (`contracts.ts` l. 790): hasta una versión de web después del reinicio (DD-19). Orden estable dentro del día (hoy todas comparten `created_at`, mapa 04 §1.2): `game_day` desc, `race_key`, `stage_day` desc, prioridad del `kind` (general, líder, etapa, montaña, abandono, lesión, contrato, retirada), `id`. Con velo, fuera las filas de etapas veladas y UN `StageReadyItem` por etapa velada, se haya escrito sobre ella una noticia o cinco; con más de `SPOILER.newsGroupAbove` de una carrera, una sola línea. `raceOfHeadline` (`newsFeed.ts` l. 17-24) muere: el enlace sale de `raceId`.
**Evidencia.** I-13 (I-cobertura-07); I-25 (I-cobertura-16); O-06 (O-cobertura-06, O-motor-11); O-07 (O-cobertura-07; `results.ts` l. 191-207); ejecutabilidad #3; X-20.
**Descartado.** `/api/news` sin `text` (`estado.md` §8.2): rompe las pestañas abiertas. La migración de noticias tercera o sexta (`estado`, `television`, `producto`). El nombre y el equipo de HOY al renderizar (`producto.md` §8.3).
**Sección.** §12, §13, §17.

### D-46 · La semilla neutra y la estabilidad del pasado

**Decisión.** La semilla de variante de la voz y del acta deja de llevar los nombres y el «and» inglés (`stageJournal.ts` l. 325-328) y pasa a `${plantilla}:${Math.round(km * 10)}:${ids ordenados}`. Cada variante declara `since` y una etapa elige solo entre las de `since ≤` su revisión: `pickVariant(seed, variants, rev)`, con `rev` = `news.tpl_rev` en las noticias y el `TEMPLATE_REV` vigente el día de la etapa en la crónica. Así añadir una redacción no re-sortea el pasado (hoy `h % n` cambia con `n`, mapa 07 §3). La identidad de una mención es la del día: el equipo del reparto congelado o, en etapas sin línea, de `stage_snapshots.input.riders[].teamId`, no el de hoy (`results.ts` l. 191-207). Las variantes fijadas en `stageJournal.test.ts` se re-sellan UNA vez (paso 12) y desde entonces B5 impide cambios silenciosos.
**Evidencia.** I-14 (I-ejecutabilidad-17, I-cobertura-07); mapa 07 §3 y §6.
**Sección.** §12.

### D-47 · Los narradores sobrantes

**Decisión.** `narrate()` y su tabla (`narration.ts` l. 16-124) se borran: cero llamadas en producción. `personalNarration` y `raceVerdict` pasan a leer los sucesos guardados de la última etapa CONOCIDA con las plantillas del journal filtradas por protagonista; lo que no tenga frase no se imprime crudo (hoy `personalNarration` devuelve la clave, l. 146-147). `/api/riders/me/last-race` aplica el horizonte (sup. H1, H5). La reescritura de `raceReport.ts` para que no re-simule es del paso 17d de la táctica: E2 no la hace y, por D-09, no la rompe.
**Evidencia.** I-41; `producto.md` §8.4; cobertura tabla fila 18; ejecutabilidad #5; C16.
**Sección.** §12.

### D-48 · Un nombre por artefacto

**Decisión.** `Watch` es la retransmisión; `Report` es el acta (la pestaña `Story` se renombra); `Race Radio` es el microscopio. «journal», «crónica», «diario» y `Story` dejan de ser nombres de pantalla; en la prosa del documento, «la voz» y «el acta». En `Watch`, la lista de lo ya dicho por la voz se despliega con `Commentary` (pantalla).
**Evidencia.** `ingeniero.md` §8.1; mapa 05 §6 contradicción 8.
**Sección.** §6, §12.

---

## G. El esquema, la API, el contrato, las constantes y el plan

### D-49 · Las migraciones

**Decisión.** Cuatro, solo con `drizzle-kit generate`: `0043_noticias_con_datos` (D-45), `0044_linea_temporal` (D-10), `0045_lo_visto` (`race_watch`, `spoiler_scope`, columnas de `users`, índice de `race_rosters`; D-29, D-33) y `0046_rastro_de_etapa` (`stage_day` en `rider_points` y `palmares`, `race_key` y `stage_day` en `transactions`, `stage_team_results.prize`; D-41). Todo es nullable, con defecto constante o tabla nueva: el mundo de pruebas sigue vivo entre el despliegue y el reinicio (mapa 04 §8), nada se rellena hacia atrás y toda lectura tolera null en las columnas nuevas y la ausencia de línea. `columnasVivas.test.ts` exige escribir `race_watch.follow`, `known_through`, `users.horizon_rev` y `stage_team_results.prize` (los escriben `watch.ts` y `awardRacePrizes`) con la expresión del test ampliada en el PR 1a a dos o cuatro espacios y a `smallint` (13-a): con la de hoy solo vigilaría `prize` (medido, `l3/vivas.mjs`, §13.7). Las escrituras van con `.set({ … })` o `.values({ … })` de Drizzle, que es lo que el test reconoce, y no con SQL crudo. Si otro documento toma antes un número, el número se desplaza y manda el nombre. Hoy la próxima libre es la `0043` (comprobado en HEAD `9c21885`).
**Evidencia.** C17; I-34 (I-motor-14); O-06; X-22.
**Sección.** §13.
**Corregida en el ensamblado v0** (§13.7 (13-a); duda 1 y 4 de §13; medido por L3 con `l3/vivas.mjs`). Lo que D-49 decía del test no era cierto contra el código: la expresión de hoy solo ve `prize`.

> Versión anterior: `columnasVivas.test.ts` exige escribir `race_watch.follow`, `known_through`, `users.horizon_rev` y `stage_team_results.prize`: los escriben `watch.ts` y `awardRacePrizes`.

### D-50 · El contrato de hoy: ningún PR rompe la web de ayer

**Decisión.** (1) `GET /api/races/:raceId/stages/:day` sigue devolviendo `StageReplay`; cuando la pantalla no va a enseñar el resultado, y no solo con la etapa velada (una caducada, una fuera de guardia y la del visitante abren en `Watch`: `stageAccessOf`, §14.1; 10-e), omite sus campos opcionales de resultado (`results`, `chronicle`, `gc`, `kom`, `points`, `teamStage`, `teamGc`, `radio`, todos `.optional()`, `contracts.ts` l. 1499-1531) y `leaders` ENTERO, porque mandarlo sin `afterStage`, obligatorio dentro de él (l. 1526), rompe la web de ayer (14-e), sirve `altimetry` sin marcas (obligatoria, l. 1498, como `day`, `name`, `km` y `run`, l. 1483-1486) y gana `watch` opcional: la web de ayer ve pestañas vacías, no un error. (2) `/api/news` sigue mandando `text` (D-45). (3) Las rutas nuevas no las llama ninguna web vieja. (4) Toda respuesta nueva se valida con `schema.parse` en su test y con `satisfies` en el código: hoy ninguna ruta valida lo que devuelve (mapa 07 §2). (5) `buildRaceRadio` ignora claves nuevas (`z.object` sin `.strict()`, `chronicle.ts` l. 1257-1317; los motivos desconocidos degradan con `.catch(null)`, l. 1306).
**Evidencia.** I-16 (I-ejecutabilidad-18); ejecutabilidad §2.3 y comprobaciones 1 a 4; X-20.
**Descartado.** `StageCard` en la ruta de hoy (`producto.md` §10.2): no lleva `run` y la web valida con `stageReplaySchema` y lanza `ContractError` (`apps/web/src/api/results.ts` l. 51-55, `request.ts` l. 91-111). `/api/news` sin `text` (`estado.md`). El acta con 403 en la ruta de hoy y sin interruptor (`television.md` §7.4).
**Sección.** §14.
**Corregida en el ensamblado v0** (§14.1 (14-e) y §10.2 (10-e); nota del orquestador (L6)). La lectura literal (`leaders` sin `afterStage`) rompía la web de ayer, y el resultado se omite cuando la pantalla no lo enseña.

> Versión anterior: con la etapa velada omite sus campos opcionales de resultado (`results`, `chronicle`, `gc`, `kom`, `points`, `teamStage`, `teamGc`, `radio`, `leaders.afterStage`, todos `.optional()`, `contracts.ts` l. 1499-1531),

### D-51 · Las rutas y el progreso por `POST`

**Decisión.** Las de §G.6 del glosario, bajo `/api/races/:raceId/stages/:day/…` con `?season=` (se conservan las URL de hoy y se arregla de paso que una etapa de la temporada anterior no se pueda abrir, mapa 02 §4) y `/api/me/…` con `raceKey`. `GET` nunca cambia estado: el acta de una etapa velada da 403 con la puerta y revelar es `POST /api/me/reveal/…`; la meta es `POST …/broadcast/finish` (un `GET` con efectos lo dispararían los precargadores y los rastreadores). El progreso es `POST /api/me/watch/:raceKey/:day` porque `navigator.sendBeacon` solo hace `POST`: la web usa `fetch(…, { method: 'POST', keepalive: true })` y, en `pagehide`, `sendBeacon` con un `Blob` de tipo `application/json` (mismo origen: la API sirve la SPA, `app.ts` l. 205-210); el progreso acepta además el mismo JSON en `text/plain`, por si un navegador rechaza el `Blob` JSON (14-g; en Chrome, sin comprobar). `POST …/broadcast/finish` lleva cuerpo `{ mode }`, porque la letra de lo visto depende del modo (14-f, 8-e).
**Evidencia.** O-28 (O-ejecutabilidad-11); `datos.md` §10.3.
**Sección.** §14.
**Precisada en el ensamblado v0** (§14.2 (14-f, 14-g)). Se añaden el respaldo `text/plain` y el cuerpo de la meta.

> Versión anterior: (mismo origen: la API sirve la SPA, `app.ts` l. 205-210).

### D-52 · Dónde viven las constantes

**Decisión.** `BROADCAST` y `SPOILER` en `packages/shared/src/broadcast/constants.ts` (las leen la API y la web); en `packages/engine/src/constants.ts` solo `TIMELINE`, que lee el grabador. No son constantes de juego: no cambian una carrera, y cualquier diff bajo `packages/engine/` corre los ocho tramos de bancos del CI (`ci.yml` l. 189): 4.365 s de pruebas en serie, unos 73 min, que la matriz reparte en ocho tramos en paralelo; con seis tramos sumaron 82,8 min de runner y el más largo tardó 33,1 (regla 4 de §17.1; mapa 07 §4). Las dos reglas del motor que necesita el reductor se copian y se atan con un test que falla si divergen, como `PullMotive` (`apps/api/src/raceRadio.test.ts` l. 148-152): `BROADCAST.bunchMinShare` = `PELOTON_MIN_SHARE` (`raceRadio.ts` l. 91) y `BROADCAST.chaseMinShare` = `STAGE.gapChaseMainFraction` (`constants.ts` l. 2657). Como un cambio en `packages/shared/src/broadcast/reduce.ts` no dispara los bancos, I1 corre también en la suite rápida sobre fotos sintéticas y una etapa congelada.
**Evidencia.** I-48 (I-motor-08); O-19 (O-motor-07); ejecutabilidad #9; X-22.
**Sección.** §15.
**Precisada en el ensamblado v0** (§17.1, regla 4; nota del orquestador (L9)). Los 73 min son pruebas en serie, no tiempo de reloj ni de runner.

> Versión anterior: (`ci.yml` l. 189; unos 73 min, mapa 07 §4)

### D-53 · Los interruptores y la marcha atrás

**Decisión.** `BROADCAST_WATCH` y `SPOILER_MODE` (`off`, `admins`, `on`) en `apps/api/src/env.ts`, publicados en `/health.features`; `TIMELINE_RECORD` (D-12); y `AUTO_TICK` (`on` por defecto, como hoy), que Railway pone a `off` en `web` cuando existe el servicio `tick` (18-k). Encendido: `BROADCAST_WATCH=admins` desde el paso 3; `SPOILER_MODE=admins` desde el paso 7; los dos a `on` al cerrar el paso 10 con B1 en verde y la prueba de lectura aceptada. Un defecto de pantalla se apaga con `BROADCAST_WATCH=off`; uno de destripe o de latencia del horizonte, con `SPOILER_MODE=off`, sin desplegar. Las migraciones solo añaden y son inertes si el código no las lee. Los PR del motor (4a, 4b) se revierten como cualquier PR y dejan datos que nadie lee. Cada paso del plan dice con qué se revierte. Así se cumple `tactica.md` §8.3: un paso se revierte con un interruptor, no con la migración (l. 6948-6950).
**Evidencia.** I-45 (I-cobertura-03, I-motor-10); `ingeniero.md` §7.4, §14.
**Sección.** §14, §17.
**Precisada en la corrección, fase 5** (§15.8, decisión 15-j; hallazgo Rcoste-019). La carga de escritura del progreso no tenía freno sin desplegar: `SPOILER_MODE=off` deja las escrituras de `/api/me/*` (§10.13) y `BROADCAST_WATCH=off` apaga la retransmisión entera. `PROGRESS_MIN_DELTA_S`, variable opcional del servicio `web`, sustituye a `BROADCAST.progressMinDeltaS` y se cambia en Railway sin desplegar; no apaga nada.

**Precisada en la corrección, fase 5** (L7: §18.3, decisión 18-k; hallazgo Rcoste-039; medido con `coste/b10/b10.mjs`). El servicio `web` corre el tick en su proceso (`apps/api/src/index.ts` l. 56-85) y simular es síncrono: una etapa grande lo deja sin contestar de 3,3 a 4,8 s, más que el colchón de los modos rápidos. `AUTO_TICK` lo apaga sin tocar el servicio `tick`.

> Versión anterior: `BROADCAST_WATCH` y `SPOILER_MODE` (`off`, `admins`, `on`) en `apps/api/src/env.ts`, publicados en `/health.features`; `TIMELINE_RECORD` (D-12).

### D-54 · El plan

**Decisión.** Trece pasos y unos 22 PR (§G.10 del glosario). El primero que el dueño ve es el paso 3: Watch sobre la radio de hoy, reloj estimado, solo administradores, tras los PR de los pasos 0 y 2 (el 1 va en paralelo por su plazo). El que cierra el destripe es el 8b, con B1 en verde en todas las rutas; el 7 ya cierra la pantalla de la etapa. Solo el paso 4 (4a y 4b) toca `packages/engine` y paga los bancos, sin subir versión. B1a a B1c nacen en el paso 7 con la lista de rutas pendientes, B1d en el 8a (su fichero nace en el 0 como inventario, 17-b), y cada PR del paso 8 vacía las suyas hasta dejarla vacía al cerrar el 8b (17-n): el test falla si una pendiente ya pasa (para obligar a quitarla de la lista) o si una no pendiente falla. Coste por PR en el CI de hoy: `typecheck` 37 s y `test:rapido` unos 9 min en todo PR (mapa 07 §4); los del motor suman los bancos.
**Evidencia.** `ingeniero.md` §14; I-45; I-30 (I-motor-15, I-ejecutabilidad-12).
**Sección.** §17.
**Precisada en el ensamblado v0** (§17 (17-b, 17-n)). Se añaden las fechas de B1d y de `PENDING_ROUTES` que fijó §17.

> Versión anterior: B1a a B1c nacen en el paso 7 con la lista de rutas pendientes y cada PR del paso 8 vacía las suyas:

### D-55 · La carga de escritura del progreso

**Decisión.** El cliente informa de lo alcanzado cada `BROADCAST.progressEveryRealS` (15 s de pared), al pausar, al ocultarse y al salir; el servidor escribe `race_watch` solo si lo alcanzado creció al menos `progressMinDeltaS` (60 s de carrera) o cambia el estado, con el último valor por `(userId, raceKey)` en la memoria del proceso: con la curva de §8.2 un informe de 15 s hace crecer lo alcanzado más de 60 s en todas las zonas salvo el último km, así que el umbral solo no limita nada: el servidor tampoco escribe más de una vez cada `progressEveryRealS` (15 s de pared) por `(userId, raceKey)`, salvo cambio de estado (10-l), y quedan unas cuatro escrituras por minuto real y espectador en `Watch` (estimado, §10.3, §18.4). Pedir un tramo no escribe nada. Se mide en el paso 7: B14 mide `recordProgress` aparte (16-k), 3,05 ms de p95 en PGlite (§18.4).
**Evidencia.** H-18 (H-motor-09).
**Sin evidencia de los jueces.** El umbral de 60 s y la memoria del proceso.
**Sección.** §10, §18.
**Corregida en el ensamblado v0** (§10.3 (10-l), §8.5 (8-d), §18.4; dudas de §8 y §18; nota del orquestador (L4, L6)). No es una escritura por minuto sino unas cuatro: el umbral de 60 s no limita con la curva de §8.2, y 10-l añade el límite de una cada 15 s.

> Versión anterior: del orden de una escritura por minuto real y espectador.
> Versión anterior: Se mide en el paso 7 (B14 incluye el coste de `recordProgress`).

### D-56 · El móvil, medido a mano

**Decisión.** El repositorio no tiene herramienta de navegador: ni Playwright ni Puppeteer en ningún `package.json` (comprobado). En el paso 10 se mide a mano con las herramientas de Chrome en 360 × 800 y CPU ×4, sobre Colombia e5 y la reina e18, y el resultado se escribe en §18 con fecha: repintado de la capa fija y de la barra (`BROADCAST.overlayHz`, `barHz`) a ≥ 30 fps, ninguna tarea del hilo principal por encima de 50 ms durante la reproducción, primera pintura de `Watch` ≤ 2 s con «Fast 4G». Si no se cumple, se baja `barHz` y se simplifica el perfil antes de encender. `BottomNav` (56 px, `BottomNav.tsx` l. 22-70) se esconde mientras se reproduce: es una propuesta a E6.
**Evidencia.** H-09 (H-cobertura-09, H-ejecutabilidad-02); I-26 (I-ejecutabilidad-04).
**Sin evidencia de los jueces.** Los umbrales.
**Sección.** §18.

### D-57 · La red, dos dispositivos y la accesibilidad

**Decisión.** (1) Si un tramo falla, la reproducción se pausa con `Connection lost · Retry` (pantalla) y lo alcanzado es lo PINTADO, nunca lo descargado. (2) Con dos dispositivos gana el máximo; la segunda pestaña rehace el horizonte al enfocar (`rev`) y, si la etapa ya es conocida en el otro, dice `You finished this stage on another device · Watch anyway · Show report` (pantalla). (3) Accesibilidad: los rótulos en una región `aria-live="polite"`; con `prefers-reduced-motion` los cursores saltan de km en km sin animar; los parciales de crono llevan signo (`+0:05`, `−0:03`) además de color; los maillots se distinguen por forma (`navegacion.md` l. 455-457).
**Evidencia.** H-21 (H-ejecutabilidad-05), H-23 (H-ejecutabilidad-08), H-22 (H-ejecutabilidad-06).
**Sin evidencia de los jueces.** Las tres reglas.
**Sección.** §10, §18.

### D-58 · Los documentos que se corrigen

**Decisión.** El paso 12 corrige `docs/balance.md` l. 14684-14686: subir `ENGINE_VERSION` NO tira las crónicas guardadas (`routes/races.ts` l. 474-477 las lee sin mirar la versión); lo que se rompe es la «Last race» que re-simula `raceReport.ts` (C16). Deja en `balance.md`, para el dueño, el defecto del salto de hasta 138 s (D-01, punto 6; `simulate.ts` l. 8678 y 8783; `race-colombia` e5, semilla 0, km 183,25, medido por el juez del motor): E2 no lo arregla y lo tolera. Actualiza `docs/navegacion.md` §7.1-7.4 (pestañas, cabecera con ganador, clásica que abre en `Result`) para E6 y anota en `docs/ops.md` que el reinicio borra `race_watch`.
**Evidencia.** H-02 (H-cobertura-02); H-12 (H-motor-03); mapa 05 §6 contradicciones 1 y 5; X-05.
**Sección.** §17, §19.

### D-59 · Lo que la pantalla enseña de lo que no es suceso

**Decisión.** La criba lejana ([DUEÑO 7]: «es solo un tema del journal, no me preocupa de momento», `docs/balance.md` l. 8094-8095, v39, con un 58 % de cobertura contra el 75 %) la enseña la barra como cambio de estado aunque la voz no la narre, porque es estado y no narración; B2 incluye `peloton_selection`. Los lugares por km y el avituallamiento no se enseñan: el motor no los tiene (`Banner` es `{ km, tipo, cat? }`, `types.ts` l. 27-32; mapa 06 §9 filas 13 y 25). El tiempo sí (D-14).
**Evidencia.** H-03 (H-cobertura-03); H-07 (H-cobertura-07).
**Sección.** §6.

### D-60 · La prueba de lectura como puerta del encendido

**Decisión.** Antes de `BROADCAST_WATCH=on`, el dueño y una persona que no conozca el diseño ven tres etapas (una llana, una reina y una clásica) con `admins` y, en tres puntos al azar de cada una, responden sin ayuda las cuatro preguntas de SPEC §6.15: quién va delante, cuánta ventaja lleva, sobre quién y cuánto queda. Aceptación: nueve de nueve puntos con las cuatro respuestas bien. Es el criterio del MVP paso 31 («un tercero entiende qué pasó en la etapa sin que nadie se lo explique», `MVP.md` l. 140) y el de la v27 («La prueba de esta tanda es leer el diario… El criterio no es un porcentaje», `docs/balance.md` l. 6236-6237). Valida también las constantes de ritmo (D-19).
**Evidencia.** H-04 (H-cobertura-04, H-ejecutabilidad-07); [DOC 7].
**Sin evidencia de los jueces.** El umbral de nueve de nueve.
**Sección.** §16, §17.

### D-61 · Las etapas corridas entre el despliegue y el reinicio

**Decisión.** Se retransmiten con el adaptador de la radio (D-07) hasta que haya línea; B22 mide su error en el paso 6 y decide si abren en `Watch` o solo en `Report`. Lo que no se guardó no se inventa (mapa 05 §10.2: «una crónica que miente es peor que una muda», `docs/balance.md` l. 13274): una etapa sin radio (anterior a la `0029`) abre en `Report` a secas, y una sin sucesos, con el `journalUnavailable` de hoy.
**Evidencia.** H-16 (H-motor-07).
**Sección.** §17, §19.

### D-62 · Las fronteras

**Decisión.** E3 dibuja la capa fija, la barra, el rótulo, la señal de campeón y el editor del maillot de equipo; E2 le da datos, reglas y textos y usa los componentes de hoy (`LeaderJersey`, `Jersey`, `Flag`). E4 entrega los avisos y decide la vida de la sesión. E5 explica «por qué perdí» sobre el acta (R23.6). E6 coloca `Ready to watch`, `/report` y `Watch` en los menús y decide lo de `BottomNav`. E10 recibe todo como plantilla, datos y semilla neutra, con `locale` en cada punto de render, el género en el reparto y los códigos de grupo. E12 implementa `ChampionTitleSource` y el Mundial, y puede sembrar títulos. E13 hereda la regla: toda historia que el mundo cuente de sí mismo se sirve a horizonte. La táctica: Frontera 3 intacta (`StageOutput` no gana campos, `tactica.md` l. 246-249); R23.7 queda resuelto por la pertenencia completa; R23.4 en `breakHeadline`; R23.8 (`card_changed`) cae en la regla por defecto de `REVEAL_RULES` y B7 obliga a darle destino; el 17d es suyo.
**Evidencia.** mapa 05 §7; §15 de las cinco propuestas.
**Sección.** §19.

---

## DD. Decisiones que son del dueño

Cada una con el valor por defecto, que es el que se implementa, y su consecuencia. El documento las recoge en §20.

| # | Decisión | Por defecto (se implementa) | Consecuencia y cifra |
| --- | --- | --- | --- |
| DD-01 | Qué carreras se protegen sin pedirlo, y si ver una etapa pone su carrera en guardia | `guarded`: propias, de su equipo, seguidas y las 8 de cabecera; y seguir una carrera al empezar a ver cualquiera de sus etapas (D-30) | con `own_only`, la portada y las noticias pueden contar el Tour a quien no lo siguió a mano; con `guarded`, un jugador que no mira nada tiene como mucho 42 etapas veladas a la vez y su ranking va por detrás en esas carreras (medido por producto); con todas las carreras, la lectura literal del encargo, 202 a la vez en la mediana y 669 como máximo, alguna en 356 días de 364, y un velo de hasta 669 entradas (medido, `c-l6/todas.mjs`). Seguir al empezar a ver pone esa carrera en el velo de todas las pantallas hasta su caducidad; sin ello, solo `Follow without spoilers` protege, y ver la etapa 3 no protege la 4 del feed. Fuera de guardia, la ficha de carrera enseña el ganador de la carrera y el de cada etapa aunque no se hayan visto, mientras la etapa abre en `Watch` (§11.5, 11-u) |
| DD-02 | Caducidad del velo | 56 días de juego (14 reales) tras la última etapa de la carrera | con 28, como mucho 23 veladas, pero «vuelvo tras dos semanas» deja de funcionar |
| DD-03 | Modo por defecto al entrar | `Watch` a ×1 con `BROADCAST.pace` | seguir una gran vuelta cuesta de 28 a 49 min al día (llanas a reinas como la e18) y hasta 73 con reinas largas; en `Highlights`, de 8 a 24 |
| DD-04 | La palabra del grupo principal | `Bunch` (SPEC §6.15), con `Lead group`, `Chase group`, `Gruppetto` | `Peloton` es la de la tele y la de la radio de hoy; cambiarla re-sella `GROUP_NOUNS` y los 140 tests del journal |
| DD-05 | Delegación con un campeón | el maillot delegado se salta al campeón de la disciplina y pasa al siguiente | el reglamento no dice qué pasa después (mapa 06 §2.2); la alternativa es la regla de hoy, sin mirar títulos |
| DD-06 | Sembrar títulos al crear el mundo | no: es de E12 | tras el reinicio no hay campeones hasta el día 179 de la temporada 0, salvo en los 17 países que corren antes su nacional (no 22: los otros 5 lo corren después, §7.4); el Giro sale con campeones de 15 países y ninguno de Italia |
| DD-07 | Visitante sin cuenta | abre en `Watch`, acta a un toque y en `/report` | la captación comparte `/report`; el visitante ve resultados fuera de la etapa ([DUEÑO 8]) |
| DD-08 | Condición y atributos del corredor propio, y atributos de cualquier corredor en su ficha | visibles | una pista débil (la frescura, el `kResultado`) a cambio de poder dar órdenes; en la ficha ajena, la etapa velada sube TAC de +0,37 a +0,41 y el ganador no es el que más sube (medido, `sup. X11`); velarla exigiría `rider_attr_log`, que se purga a los 60 días |
| DD-09 | ¿Hay que ver la N para dar órdenes de la N+1? | no: aviso con tres salidas | quien tiene prisa ordena sin saber; nadie queda bloqueado |
| DD-10 | Correo de «lista para ver» | plantilla y test en E2; envío de E4, apagado | nadie recibe correo de juego hasta E4 |
| DD-11 | Dejar de escribir `stage_snapshots.radio` | sí, en el paso 11, cuando B16 esté en verde | la pestaña `Race Radio` lee la línea; la radio son unos 40 MB por temporada en disco, pero la línea ocupa del orden de 36 MB (§5.7, estimado), así que el ahorro neto es pequeño; `race-radio.mjs --db` pasa a leer la línea |
| DD-12 | Vista previa del acta compartida, y el acta en los buscadores | con el ganador, marcada `Spoiler`, solo si la etapa está fuera del velo de quien pide la página (14-k); el acta, indexable | es lo que vende en captación; el robot de un buscador tampoco lleva cookie y guarda el acta con el ganador; la alternativa es no poner nunca un resultado en una vista previa, y `X-Robots-Tag: noindex` en `/report` (§11.10) |
| DD-13 | Dorsal amarillo del equipo líder en el rótulo | no | se queda en la clasificación por equipos de `Report`: `StageClosing` (§4.11) no tiene tabla por equipos (20-c) |
| DD-14 | `Most kilometres out front` en el cierre | sí, como hecho | no es el premio de combatividad de un jurado |
| DD-15 | Estreno a hora fija para todos | no: cada uno ve cuando entra | el tick de 6 h no lo permite sin partir la transacción del día (mapa 02 §9) |
| DD-16 | Oferta adaptativa de `own_only` | sí, una vez, tras 2 carreras de cabecera ignoradas | sin ella, quien no mira nunca vive con un mundo retrasado sin saber por qué |
| DD-17 | Confirmar al revelar | sí, con `Don't ask again` | sin confirmación, un toque accidental no tiene vuelta |
| DD-18 | Racimos en la voz | sí, si B19 sigue en 0 con ellos | si no, la regla B3 del dueño la cumplen la cuenta de la barra y el acta |
| DD-19 | Dejar de escribir `news.text` | una versión de web después del reinicio | E10 traduce todo el feed desde el primer día del mundo nuevo |
| DD-20 | ¿El resumen cuenta como visto? | sí (letra `S`) | quien ve `Highlights` ya no tiene la etapa velada en ninguna superficie |
| DD-21 | El horizonte del mánager contra Postgres (B14) | `SPOILER_MODE` no pasa a `on` hasta que el mánager de un equipo de 30 pase el p95 ≤ 5 ms medido desde el servicio `web` de Railway contra una copia de la base de producción; lo primero que se optimiza es la cuarta consulta (16-k, 18-j) | en PGlite, con la forma D, el jugador da de 3,1 a 3,7 ms y el mánager de 8,6 a 9,3 ms; en PostgreSQL 16 sin red, 2,16 y 3,88 ms (§18.2); falta la red, tres idas y vueltas por cálculo |
| DD-22 | Los minutos del digest | se calculan con `digestBudgetS` y los cuadros: 38, 40 y 43 min para las tres grandes vueltas (8-b) | para 30 min, los cinco presupuestos bajan un cuarto y cada etapa del digest se ve más deprisa |
| DD-23 | El salto de hasta 138 s del motor | E2 lo tolera (el corredor sale en tránsito, 3-b) y lo anota en `docs/balance.md` en el paso 12 (D-58) | de 0 a 6 saltos de grupo de más de 60 s por etapa (§3.6); arreglarlo es conducta del motor y sube la versión (D-09) |
| DD-24 | `getBlockReport`, que cuenta siempre 0 días de carrera | no se arregla en E2: se anota en `docs/balance.md` en el paso 12 y el 8b solo lo vela (19-b) | en producción el informe del bloque dice `0 race days` y cuenta los días de carrera como de entrenamiento (`packages/db/src/riders.ts` l. 549) |
| DD-25 | La táctica y su paso 17d | toda subida de `ENGINE_VERSION`, también las de la táctica, va detrás de su 17d (D-09); la regla se lleva a `docs/tactica.md` | si la táctica sube antes del 17d, cada subida cambia lo que la «Last race» cuenta de las etapas ya corridas (C16) |
| DD-26 | El presupuesto del equipo con etapas veladas | velado: el de antes de los premios de equipo de las etapas veladas (R, §11.13, 11-t) | el mánager planifica con menos dinero del que tiene, sin que nada se le bloquee (`draftRace` no mira el presupuesto); visible, como DD-08, dejaría legible la victoria, porque el premio de equipo solo lo cobra el equipo que gana la etapa (3.000, 1.500 o 500) o la general |

**Corregida en el ensamblado v0** (§20.2 y §20.6; decisiones 20-a a 20-d). Las secciones dejaron cinco decisiones más del dueño, `DD-21` a `DD-25`, con su valor por defecto, y corrigieron las cifras de DD-06 (17 países, §7.4), DD-11 (unos 36 MB de línea por temporada, §5.7) y DD-13 (el cierre no tiene tabla por equipos, §8.6), y precisaron DD-12 (14-k). §20.2 tiene la tabla entera con su columna de consecuencias.

> Versión anterior de las filas corregidas:
>
> | # | Decisión | Por defecto (se implementa) | Consecuencia y cifra |
> | --- | --- | --- | --- |
> | DD-06 | Sembrar títulos al crear el mundo | no: es de E12 | el Giro de la temporada 0 sale sin campeón de Italia; el primer «campeón de Italia» en carrera llega tras el día 179 |
> | DD-11 | Dejar de escribir `stage_snapshots.radio` | sí, en el paso 11, cuando B16 esté en verde | la pestaña `Race Radio` lee la línea; unos 40 MB menos por temporada; `race-radio.mjs --db` no se entera (re-simula) |
> | DD-12 | Vista previa del acta compartida | con el ganador, marcada `Spoiler` | es lo que vende en captación; la alternativa es no poner nunca un resultado en una vista previa |
> | DD-13 | Dorsal amarillo del equipo líder en el rótulo | no | sigue en la tabla por equipos del cierre |

**Corregida en la corrección, fase 5** (§10.4; hallazgos Rdueno-023 y Rdueno-024; medido con `c-l6/todas.mjs`). DD-01 ofrecía `guarded` u `own_only` y no ponía delante del dueño la lectura literal de su encargo, todas las carreras, ni que ver una etapa pone su carrera en guardia; las dos van ahora en su fila, con su cifra y su consecuencia, y §20.2 y §20.3 tienen que recogerlas.

> Versión anterior de la fila:
>
> | # | Decisión | Por defecto (se implementa) | Consecuencia y cifra |
> | --- | --- | --- | --- |
> | DD-01 | Qué carreras se protegen sin pedirlo | `guarded`: propias, de su equipo, seguidas y las 8 de cabecera | con `own_only`, la portada y las noticias pueden contar el Tour a quien no lo siguió a mano; con `guarded`, un jugador que no mira nada tiene como mucho 42 etapas veladas a la vez y su ranking va por detrás en esas carreras (medido por producto) |

**Corregida en la corrección, fase 5** (L7: §11.2, §11.5, §11.10, §11.13 y §18.2; decisiones 11-r, 11-t, 11-u y 18-j; hallazgos Rcodigo-061, Rdueno-022, Rdueno-026, Rdueno-043 y Rcoste-012). DD-08 cubre también los atributos de la ficha de cualquier corredor (`sup. X11`, medido); DD-12, el acta en los buscadores, cuyo robot tampoco lleva cookie; DD-21 lleva la cifra de PostgreSQL 16 sin red y se mide desde Railway; la fila de DD-01 dice lo que enseña la ficha de una carrera fuera de guardia; y nace DD-26, el presupuesto del equipo con etapas veladas, que §11.13 velaba sin pasar por el dueño. §20.2 tiene que recogerlas.

> Versión anterior de las filas:
>
> | # | Decisión | Por defecto (se implementa) | Consecuencia y cifra |
> | --- | --- | --- | --- |
> | DD-08 | Condición y atributos del corredor propio | visibles | una pista débil (la frescura, el `kResultado`) a cambio de poder dar órdenes |
> | DD-12 | Vista previa del acta compartida | con el ganador, marcada `Spoiler`, solo si la etapa está fuera del velo de quien pide la página (14-k) | es lo que vende en captación; la alternativa es no poner nunca un resultado en una vista previa |
> | DD-21 | El horizonte del mánager contra Postgres (B14) | `SPOILER_MODE` no pasa a `on` hasta que el mánager de un equipo de 30 pase el p95 ≤ 5 ms contra Postgres; lo primero que se optimiza es la cuarta consulta (16-k) | en PGlite, con la forma D, el jugador da de 3,1 a 3,7 ms y el mánager de 8,6 a 9,3 ms (§18.2) |

---

## Lo que esta síntesis no ha podido comprobar

- El error de la posición extrapolada del instante (D-04): se mide en el paso 6 (B21).
- Si la regla del racimo en vivo mantiene el prefijo (D-43): se mide con B19 antes de encender `liveClusters`.
- El error del reloj estimado del adaptador de la radio (D-07, D-61): B22 en el paso 6.
- El coste del tick en los días 176 y 179 con el grabador (el juez del motor estimó de 2 a 8 s más): B15 en el paso 5.
- La compresión TOAST y la versión de Postgres de producción (el CI usa `postgres:17`, `ci.yml` l. 35; PGlite es 18.3 con `pglz`): con `bytea` gzip deja de importar para la línea, no para la radio de hoy.
- Si las cuentas (`users`, `sessions`) sobreviven al reinicio: `race_watch` lleva `world_id` y el reinicio la borra, así que da igual para E2.
- Cómo se ve todo en un teléfono real (D-56).

Medido después por las secciones (ensamblado v0): el error de la posición extrapolada (L1, `l1/corte.mjs`: p99 de 52 a 508 m en 15 corridas, §3.3); el del reloj estimado del adaptador contra la radio (L1: 0,69 km como máximo en la cabeza, §3.8); el tick de los días 176 y 179 con el prototipo del grabador (L7, `l7/tick.mjs`: de +0,7 a +0,8 s y de +15,5 a +18,9 s, §18.3); el horizonte en PGlite (L7: §18.2); y la regla del racimo sin rótulos (L8: 0 violaciones, §12.3). Siguen pendientes las medidas contra Postgres, con la línea grabada de verdad y en un teléfono (§18.9).
