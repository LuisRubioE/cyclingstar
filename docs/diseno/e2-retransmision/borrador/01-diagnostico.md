## 1. Diagnóstico medido: lo que el jugador lee hoy de una carrera

Esta sección cuenta el estado de hoy con fichero y línea, y con cifras medidas; no propone nada (las decisiones empiezan en §2 y se escriben en las secciones que las desarrollan). Las citas de línea son del HEAD `9c21885`, el de los juicios y las decisiones; el árbol sobre el que se escribe (`af953b9`) solo cambia documentos bajo `docs/diseno/`, así que las líneas de código coinciden. Las cifras tienen cinco procedencias y cada una se nombra donde se usa: los siete mapas (`mapas/01` a `07`); el juez del motor (comprobaciones C1 a C18 de `juicios/motor.md` §2, con sus scripts `reloj`, `saltos`, `tamano` y `rosters` sobre el `dist` del motor v89 y PGlite 0.5.4); los jueces de cobertura (§2) y de ejecutabilidad (§2.1 a §2.3); las propuestas donde midieron (`estado.md` §1 y §3, `datos.md` §10.5); y una remedida propia de esta sección y de §3, hecha en el scratchpad con `l1/reloj.mjs`, `l1/saltos.mjs` y `l1/deriva.mjs`. Esos tres scripts corren `simulateStage` del `dist` con el campo de `scripts/race-radio.mjs` (22 equipos de 8, 176 corredores; 18 de 7, 126, en `race-colombia`), las semillas `radio-<carrera>-<n>` con n de 0 a 2, y la foto de la sonda en cada bloque, sobre `race-france` e7 (llana), e13 (media) y e18 (reina), `race-flanders` y `race-colombia` e5 (reina): quince corridas. Reproducen al número lo que el juez del motor midió con el mismo campo (292.194 pares de bloques y el salto de 137,7 s en Colombia e5, semilla 0), así que donde coinciden se cita al juez.

La conclusión, adelantada. El punto 4 del encargo («el motor ya guarda los sucesos estructurados y fechados por kilómetro y por segundo», `docs/encargos.md` l. 161-162) es cierto a medias: los sucesos llevan km y segundo, pero el segundo es el reloj del grupo implicado, siete plantillas llevan una fecha que no es la de cuándo se supo, el estado de la carrera no está en los sucesos sino en una radio guardada por km que ha tirado el reloj y la identidad de cada grupo, y el reloj de un corredor no es continuo. Y todo lo que se puede saber de una etapa sale entero y a la vez por una ruta pública (`sup. E8`), y lo filtran otras 40 de las 48 superficies inventariadas y once puertas que el inventario no tenía (las nueve de `producto.md`, y `sup. X10` y `sup. X11`, que encontró §11.2).

### 1.1 Los tres canales del motor

El motor corre una etapa en `simulateStage(input, seed, probe?)` (`packages/engine/src/stage/simulate.ts` l. 1242) y avanza por DISTANCIA, no por tiempo: un bucle por bloque de 100 m (l. 3058) en el que el bloque `i` está en el km `(i + 0,5) · dx` (`kmAt`, l. 1929) y todos los grupos avanzan ese mismo bloque, cada uno con su reloj (`advanceGroup`, `group.ts` l. 82-119). Cada diez bloques, un km, se toman las decisiones y se emiten los partes (l. 3428). Lo que sale del bucle va por tres canales, y solo uno se guarda entero:

```
simulateStage(input, seed, probe?)                               stage/simulate.ts l. 1242
  crono:     simulateTimeTrial(input, seed), la sonda se ignora   l. 1264
  carretera: bloque a bloque, km = (i + 0,5) · 0,1                l. 3058, 1929
    canal 1  log.emit(km, tS, tipo, plantilla, ids, datos)  → StageOutput.events    → stage_snapshots.events
    canal 2  incidents.push({ riderId, km, tipo, … })       → StageOutput.incidents → no se guarda
    canal 3  probe.onSnapshot(km, SnapshotRider[], mainId)  → solo en los km pedidos → stage_snapshots.radio, adelgazada
  finishStage → StageOutput (types.ts l. 568-593): resultados y partes, sin estado intermedio
```

- **Canal 1, los sucesos.** `RaceEvent { km, tS, tipo, plantilla, protagonistas, datos? }` (`types.ts` l. 330-337), acumulados en `EventLog` (`events.ts` l. 9-49), que los entrega ordenados por `tS` y luego por `km` (l. 46-48). No hay unión discriminada: `plantilla` y las claves de `datos` son cadenas libres. Son 54 plantillas, 45 de carretera contando `rider_defies_team` y 9 de crono, y unas 85 claves de `datos` (mapa 01 §1.1, contadas sobre las 42 llamadas a `log.emit` de `simulate.ts` y las 12 de `timetrial.ts`). Se congelan tal cual en `stage_snapshots.events` (`packages/db/src/stageRun.ts` l. 580).
- **Canal 2, los percances.** `Incident { riderId, km, tipo, severidad, perdidaS, diasBaja }` (`types.ts` l. 358-365): caídas, pinchazos y averías con su km a 100 m y SIN segundo. `stageRun.ts` los usa para las lesiones y para el `mishap` de la radio (l. 586-590) y no los guarda. Una caída solo se ve por sus consecuencias: `peloton_split.causa = 'caida'`, `truce_*`, `rider_abandons.causa` (mapa 01 §1.4). Medido por el mapa 01 §5: de 0 a 9 caídas por llana y de 5 a 12 por reina.
- **Canal 3, la foto.** `StageProbe.onSnapshot(km, riders, mainGroupId)` (`types.ts` l. 487-504): por corredor vivo, un `SnapshotRider` (l. 449-485) con su grupo, su reloj, su energía y si tira, para qué y para quién; y cuál es el pelotón según el motor. Es observación: no está en `StageOutput` y el motor solo la toma en los km pedidos (`probeAt`, `simulate.ts` l. 1944-1950 y 8996-9024). Producción pide `radioKmPoints(km)`, una foto por km desde el 0 más la del último bloque (`raceRadio.ts` l. 230-236; `stageRun.ts` l. 515), y guarda la radio adelgazada (§1.8). El reloj de la foto no es el del grupo, aunque así lo diga el comentario de `types.ts` l. 453: es el del corredor, el del grupo más lo que lleva cedido sin soltarse (`tS + s.markLossS + s.driftS`, `simulate.ts` l. 9012).
- **La salida.** `StageOutput` (`types.ts` l. 568-593) lleva sucesos, resultados, percances, el parte de cada corredor (`efforts`), el trabajo y el tanque en meta: nada del estado de la carrera a mitad de etapa.

**Los sucesos son escasos.** Medido por el mapa 01 §5 (cinco semillas por etapa, campo del banco):

| Medida | Llana e7, 175 km | Reina e18, 185 km |
| --- | --- | --- |
| Sucesos emitidos, rango (mediana) | 46-76 (71) | 86-127 (108) |
| Narrables, con `narra ≠ 0` | 36-51 (42) | 69-83 (77) |
| Km con algún suceso narrable | 17-24 % | 23-29 % |
| Mayor silencio entre dos narrables | 15-21 km, 20-32 min | 14-29 km, 23-57 min |
| Fotos de radio, una por km | 176 | 186 |
| Cruces grupo-km (cada grupo cruza cada km a su hora) | 371-644 | 794-1.439 |
| Grupos por km, máximo | 4-7 | 9-18 |

Una retransmisión que viviera de sucesos se quedaría muda en siete de cada diez kilómetros: el estado tiene que ser la base y los sucesos, lo de encima (§2.1).

**El punto 4 del encargo, contestado: qué fecha lleva de verdad cada suceso.** Verificado en el código (mapa 01 §1.2; C9 y C10 del juez del motor):

| Caso | Plantillas | `km` que lleva | `tS` que lleva | Cuándo lo sabría la tele | Línea |
| --- | --- | --- | --- | --- | --- |
| general | casi todas | centro del bloque, a 100 m; las de decisión, en `k + 0,05` | el reloj del grupo implicado al cruzar ese punto (`peloton.tS`, `lead.g.tS`, `group.tS`) | en ese cruce; dos sucesos del mismo km pueden estar a minutos si son de grupos distintos | `simulate.ts` l. 1929, 3428 |
| (a) | `breakaway_formed`, `break_cooperation` | `bornKm`, donde nació el ataque | `bornTs` | cuando el hueco sobre el grupo de ORIGEN pasa de `tacticBreakGapSeconds` (45 s) | l. 8693, 8727-8733 |
| (b) | `rider_defies_team` | el de la primera aparición del rebelde | el de esa aparición | lo inserta `announceRebels` al cerrar, delante del suceso en que aparece | `events.ts` l. 71-99; `simulate.ts` l. 9081 |
| (c) | `bunch_sprint`, `final_km` | `totalKm − 1` | el de LLEGADA del grupo | en meta: los tres llevan el mismo segundo que `stage_win` (14.126,1 s en una llana, mapa 01 §1.2) | l. 9662, 9689 |
| (d) | `time_cut`, `time_cut_readmitted` | el de meta | la llegada del primer eliminado o readmitido | tras la meta | l. 9135-9164 |
| (e) | crono: `puncture`, `mechanical` | `meta / 2`, fijo | el reloj PROPIO del corredor | en `startS` más ese reloj; en la crono e16, tres pinchazos quedaban horas antes de la salida de su corredor | `timetrial.ts` l. 315-329 |
| (f) | `climb_kom` | el de la cima | `groups[0].tS`, el del primer grupo que corona | cuando corona el ganador, que es el primero de los que la disputan y puede ir en otro grupo (C9) | `simulate.ts` l. 9287, 9310 |
| (g) | `peloton_concedes` | `max(km, breakFormedKm)` | `peloton.tS` al emitirse | ya va bien: nunca antes de la fuga | l. 4814-4820 |
| caídas | no hay suceso | el del bloque, en `Incident` | ninguno | en el km de la caída, con el reloj del grupo del caído | `types.ts` l. 358-365 |

Y una octava que no está en ningún suceso: `estado.md` §1 midió, en 1.815 sucesos de 15 corridas, que 867 (el 48 %) llevan el reloj de un bloque antes que la foto; el bloque en que el motor emite cada suceso se pierde, y es el que dice cuándo se supo.

Lo cierto: todo suceso lleva un km a 100 m y un segundo en un eje común (§1.2), así que soltarlo por su reloj es casi soltarlo a su hora. Lo que no: las siete fechas de (a) a (g) y las caídas no dicen cuándo se supo (§4.7 fija cuándo se enseña cada uno, D-05); la radio guardada, que es donde vive el estado, pierde el reloj y la identidad de cada grupo (`radioForStorage`, `raceRadio.ts` l. 776-963, guarda `gapS` redondeado y ni `tS` ni `id`; mapa 01 §2.3), y en una reina solo nombra al 47-64 % de quien va fuera del pelotón; la crono no guarda traza, porque cada corredor se simula entero con su traza por bloque `raw` (`timetrial.ts` l. 249-305) y el parcial de cada uno no sale; y el motor sabe y no emite la fase de carrera (`faseAhora`, `simulate.ts` l. 3247), el tiempo por bloque (l. 3102-3108), los puestos segundo a octavo de cada pancarta (se reparten puntos y solo se emite al ganador, l. 9213-9224), el nombre de cada cima (`Banner` es `{ km, tipo, cat? }`, `types.ts` l. 27-32) y quién lleva cada maillot («El motor no sabe quién lleva maillot ni quién es favorito», `raceRadio.ts` l. 769-770). Reproducir a ritmo con lo guardado hoy no es barato; con lo que el motor calcula y tira, sí (mapa 01 §8).

**Lo que la tele enseña, contra lo que existe hoy** (mapa 01 §7 y mapa 06 §9, resumidos):

| Lo que enseña la tele | ¿Existe? | Dónde y a qué resolución | Qué falta |
| --- | --- | --- | --- |
| Km a meta de la cabeza | derivable | `km` de la cabeza y longitud del perfil; exacto | el km de la cabeza en cada instante |
| Diferencia principal y su tendencia | sí | `gapS` por grupo y km en la radio, resta exacta; `time_gap`, 7 u 8 por etapa | el reloj de cada grupo para situarla en el tiempo |
| Quién va en cada grupo | parcial | la radio nombra entero un grupo de hasta 12; en uno mayor, los que tiran y la lista de seguimiento | el grupo de cada corredor en cada km (un vector por km: 0,5-3,8 KB con gzip por etapa, mapa 01 §5) |
| Dónde está cada grupo en el perfil | no | el perfil sí (`sampleProfile`, `altitudesDelPerfil`, `tramosDelPerfil`) | el reloj de cada grupo en cada punto, que la radio tira |
| Maillots de clasificación | fuera del motor | `assignLeaderJerseys` en `packages/db` | quién lleva cada uno, congelado a la salida |
| Campeón y maillot de equipo | no | ninguna parte | la interfaz con E3 y E12 (§7.9) |
| Pancartas | pobre | ganador y reloj de la cabeza (`sprint_intermediate`, `climb_kom`) | el orden, los puntos y las bonificaciones de cada una |
| Caídas | no como suceso | `Incident`, sin segundo y sin guardar | la caída con su km y su reloj |
| Pinchazos y averías | sí, sin frase | `puncture`, `mechanical` | la frase; en crono, el reloj y el km verdaderos |
| Tiempo y viento | no | se calculan por bloque y se tiran (`simulate.ts` l. 3102-3108) | congelarlos con la etapa (D-14) |
| Lugares y avituallamiento | no | `Banner` es `{ km, tipo, cat? }` | nada: no se inventan (D-59) |
| Crono: orden, parciales, sillón | parcial | sucesos `tt_*`; el orden y el sillón, derivables de `input` y `results` | el reloj de cada corredor en cada km |

### 1.2 El reloj, medido

El mapa 01 §0 dice que el motor no tiene reloj absoluto; `producto`, `ingeniero`, `datos` y `television` dicen que `tS` es tiempo de carrera absoluto (X-01). `television.md` §3.1 y §3.4 dicen además que el reloj de la cabeza y los cambios de corredor son monótonos, y `estado.md` §3.1 y §3.3 que la cabeza lo es salvo en 0-2 bloques y el corredor no (X-02). El juez del motor lo midió (C1 a C4, `juicios/motor.md` §2 y §2.2) y esta sección lo ha re-medido con el mismo campo (`l1/reloj.mjs`: las mismas cifras). Aquí van solo los hechos; la decisión es §3.

1. **Hay un eje común (C1, cierta con matiz).** `Group.tS` es el «Cronómetro acumulado en segundos desde la salida» (`group.ts` l. 26-27) y nace en 0 (l. 56); un ataque nace con el reloj de su grupo de origen menos el salto (`simulate.ts` l. 7249) y una captura se queda con el menor de los dos (l. 8817). En el primer bloque nadie pasa de 9,2 s (15 de 15 corridas; el juez da 9,2-9,6). Lo que no existe es el instante: en el bloque `i` todos los grupos están en el mismo km, cada uno a su hora.
2. **La cabeza es casi monótona (C3, a medias las dos).** El reloj de la cabeza, el mínimo de los de todos los grupos en un bloque, no baja nunca mirando por km (0 bajadas en las 21 corridas del juez y en las 15 de aquí); por bloque baja de 0 a 2 veces por etapa, 2,8 s como mucho.
3. **El corredor no es continuo (C2, cierta; C4, falsa la monotonía de `television.md` §3.4).** El que entra en un grupo adopta su reloj («El corredor que entra en un grupo adopta el reloj de ese grupo», `simulate.ts` l. 7863) y la deriva que lleva dentro del grupo vuelve a 0 en el llano (l. 5536). El reloj de un corredor retrocede en el 0,001-0,31 % de los pares de bloques:

| Etapa (3 semillas) | Retrocesos por bloque (pares) | de más de 22 s | de más de 60 s | por km (máximo) | Bajadas de la cabeza por bloque (máximo) | por km |
| --- | --- | --- | --- | --- | --- | --- |
| `race-france` e7, llana | 4-10 (307.824) | 0 | 0 | 0 | 0-1 (1,1 s) | 0 |
| `race-france` e13, media | 364-416 (362.384) | 3-6 | 1-2 | 2-3 (58,7 s) | 0-2 (1,3 s) | 0 |
| `race-france` e18, reina | 419-559 (325.424) | 7-87 | 2-5 | 2 (51,5 s) | 1-2 (1,5 s) | 0 |
| `race-flanders` e1 | 540-1.527 (489.456) | 77-138 | 0-36 | 0-33 (39,7 s) | 1-2 (2,7 s) | 0 |
| `race-colombia` e5, 126 corredores | 172-277 (292.194) | 5-10 | 3-6 | 2-3 (77,3 s) | 1 (1,9 s) | 0 |
| `race-italy` e9, reina | 103-172 (323.664) | 1-3 | 0-2 | 0 | 1-2 (2,0 s) | 0 |
| `nc-es-road`, 40 corredores | 144-232 (73.160) | 1-11 | 1-7 | 0-6 (53,3 s) | 1-2 (2,8 s) | 0 |

Fuente: juez del motor §2.2 (`reloj.mjs`, `saltos.mjs`); las cinco primeras filas, reproducidas con `l1/reloj.mjs`. El retroceso mayor es de `race-colombia` e5, semilla 0, km 183,25: `rq-6-5` pasa de `shed-56` a `peloton` y su reloj salta 137,7 s hacia delante. Su mecanismo, y qué hace la pantalla con él, es §3.6.

Dos precisiones medidas aquí que la tabla no separa. Primera (`l1/saltos.mjs`): los retrocesos de más de 60 s son dos fenómenos. Los que cambian de grupo son todos de un `shed` al `peloton` y van de 0 a 6 por etapa en las quince corridas (e7, 0; e13, 1-2; e18, 2-5; Flandes, 0-3; Colombia, 3-6); los que no cambian de grupo son la deriva que se anula en el llano y solo aparecen en Flandes, semilla 0, donde son 33 de sus 36. El «0-36 por etapa» de C4 cuenta los dos. Segunda (`l1/deriva.mjs`): en las fotos de km, el reloj de un corredor se separa del de su grupo (el mínimo de los suyos) por p99 de 6 a 19 s según la etapa y hasta 118 s en Flandes y 60 s en la e18; por eso el reloj de foto de un corredor no sirve como su hueco (§3.5).

X-01 y X-02 quedan así: hay un eje absoluto común y no hay instante; la cabeza es monótona por km y casi por bloque; el corredor no lo es. Lo que se decide con ello es D-01 (§3.1).

### 1.3 La pantalla de etapa hoy

La ruta pública `/world/races/:raceId/stages/:day` hace una sola consulta, `fetchCalendarStage` (`apps/web/src/api/results.ts` l. 51-55), validada contra `stageReplaySchema` (`packages/shared/src/contracts.ts` l. 1482-1533), y pinta cinco pestañas (mapa 03 §1.1):

| Pestaña (pantalla) | Qué pinta | De qué dato |
| --- | --- | --- |
| `Story`, la de defecto (`StageReplay.tsx` l. 30-35 y 345-346) | la crónica ENTERA con el km al margen, «On the road today» con los maillots de la N−1 y el podio | `chronicle` (`buildChronicle` sobre `stage_snapshots.events`), `leaders.onRoad`, `results` |
| `Result` | top 20 con los DNF y OTL al final | `results` |
| `Race Radio` | una foto de un km elegida con un deslizador | `radio` (`buildRaceRadio`, `routes/races.ts` l. 518) |
| `Classifications` | general, puntos, montaña y equipos TRAS la etapa | `gc`, `kom`, `points`, `teamStage`, `teamGc`, `leaders.afterStage` |
| `Profile` | el SVG del motor con los hitos de la etapa | `altimetry`, con marcas de ataque, fuga, caza, pancarta y meta (`MARKER_LABEL`, `chronicle.ts` l. 169-175) |

- **No hay reproducción ni ocultación de ningún tipo** (mapa 03 §1.2): ni temporizador, ni `setInterval`, ni `refetchInterval` en ninguna página (el único `setInterval` de la web es la cuenta atrás de `WorldClock`). `RaceRadioPanel` abre en el km 0 (`useState(0)`, l. 363) y se mueve a mano con un deslizador y siete botones, uno de ellos `Finish` (pantalla), que salta a la meta (l. 387-419).
- **La etapa sale entera en una sola respuesta pública** que no mira quién pide (`routes/races.ts` l. 519-537), contra la regla «la API no puede mandar lo que la pantalla no enseña» ([DOC 5], `docs/encargos.md` l. 254-255): resultado, clasificaciones de después, crónica, radio y altimetría con marcas. Medido: de 0,95 a 2,16 MB de JSON, el 91-96 % de radio (mapa 02 §7); de 871 KB a 2,95 MB en 22 etapas en línea y de 22 a 100 KB con gzip, y la API no comprime (mapa 07 §7). Aunque la pantalla escondiera, el dato ya estaría en el navegador, en la caché de React Query con `staleTime` de 30 min (`queryClient.ts` l. 17-26).
- **No hay directo: el día se confirma de golpe.** Un día de juego son 6 horas reales (`TICK_INTERVAL_MINUTES` 360, `apps/api/src/env.ts` l. 32) y el tick lo corre en una sola transacción con todas las etapas de todas las carreras de ese día, sus generales, noticias, premios y palmarés, y al final pone `current_day` (`packages/db/src/tick.ts` l. 259-284; «un día se aplica entero o no se aplica», l. 260-261). Cuando la web dice «día d», la etapa de hoy ya tiene resultado (mapa 04 §2): toda retransmisión es una reproducción, y «lista para ver» es el estado natural de una etapa.
- **La radio, foto a foto** (mapa 03 §1.3): el km DESDE LA SALIDA en grande, nunca cuánto queda ni dónde está ese km en el perfil; un `GroupCard` por grupo con tamaño, velocidad o percance, los dos huecos (a la cabeza y al de delante), quién tira y por qué, y `+N riders more` (pantalla) para el resto.
- **La carrera de un día abre en `Result`** (`raceTabs.ts` l. 47-51) y su ficha lleva el ganador en la cabecera de todas las pestañas (`Race.tsx` l. 720-729): el ganador sale dos veces antes de tocar nada (mapa 03 §1.4).
- **Una etapa de la temporada anterior no se puede abrir**: la ruta resuelve la temporada con el día de HOY (`currentSeason(world.currentDay)`, `routes/races.ts` l. 399; mapa 02 §4).

Lo que pesa la etapa servida, medido por el mapa 07 §7 (campo del banco, radio por km y lista de seguimiento como en producción; tiempos en Node, no en un móvil):

| Etapa | Radio guardada | Respuesta entera (gzip) | `JSON.parse` + `safeParse` | Grupos por km, máximo | Nombrados por km, máximo |
| --- | --- | --- | --- | --- | --- |
| `race-france` e5, llana, 158 km | 109 KB | 954 KB (23) | 3,0 + 4,6 ms | 9 | 37 |
| `race-france` e13, media, 206 km | 231 KB | 1.625 KB (48) | 6,7 + 7,1 ms | 11 | 90 |
| `race-france` e20, reina, 171 km | 514 KB | 2.942 KB (100) | 9,0 + 24,9 ms | 19 | 141 |
| `race-flanders`, 278 km | 324 KB | 2.134 KB (59) | 6,7 + 14,4 ms | 10 | 67 |
| `race-colombia` e5, 232 km, 126 corredores | 510 KB | 2.949 KB (75) | 9,0 + 24,2 ms | 19 | 126 |

La radio es entre el 88 y el 96 % de la respuesta porque `buildRaceRadio` repite la identidad entera de cada nombrado en cada grupo de cada km (`chronicle.ts` l. 1340-1400, mapa 02 §7): lo servido crece de 5,4 a 8,4 veces sobre lo guardado. Estimado por el mapa 07 §7 (un móvil medio, de tres a cinco veces más lento que el núcleo de la medida): de 100 a 170 ms de hilo principal para parsear y validar la etapa mayor, y de 0,7 a 4,7 s para bajarla sin comprimir por 4G.

### 1.4 El relato hoy

- **55 plantillas y 272 redacciones.** `chronicleTemplate` (`apps/web/src/domain/stageJournal.ts` l. 318-1605) tiene 55 `case` con nombre y un `default`; 226 redacciones en 90 llamadas a `pick` y el resto en retornos directos (medido con el AST por el mapa 03 §2.3 y por el juez de ejecutabilidad, #6). Lo protegen 140 tests (`stageJournal.test.ts`). Es texto de interfaz, en inglés, redactado al leer: la crónica se guarda como dato (plantilla, datos e ids) y es el ejemplo bueno del encargo.
- **Cuatro plantillas sin frase (X-21).** `puncture`, `mechanical`, `truce_granted` y `truce_denied` no tienen `case` y caen en el `default`, que imprime la clave cruda con nombres y equipos (`stageJournal.ts` l. 1602-1603). Medido: 5 percances en 5 llanas y 12 en 5 reinas (mapa 01 §3). Por eso «las 272 redacciones se reutilizan sin un `case` nuevo» (`ingeniero.md` §8.2) es cierto a medias: su propio B7 exige frase para esas cuatro.
- **La crónica ve el futuro, pasada a pasada (X-14).** `buildChronicle` (`apps/api/src/chronicle.ts` l. 289-376) aplica veintiuna pasadas (las veinte llamadas de l. 353-375 y `markConcession`, que corre dentro del `map`, l. 319) sobre la etapa ENTERA, y cinco de ellas, más la longitud de la etapa, miran después de la línea que escriben:

| Pasada | Línea | Qué mira del futuro |
| --- | --- | --- |
| `markConcession`, con `caughtLaterKm` | l. 297 y 319 | si la fuga se caza después: `peloton_concedes` sale provisional («for the moment») |
| `dropUndoneSelections` | l. 361; recorre las líneas posteriores en l. 856-866 | borra la criba que la carrera deshace más tarde |
| `groupGapRuns` | l. 362 | funde en una línea partes de ventaja que ya se dijeron |
| `foldQuickAttacks` | l. 371 | funde un ataque con su captura posterior |
| `groupRuns`, los racimos | l. 375 | absorbe en un racimo descuelgues que ya salieron sueltos |
| la longitud de la etapa | l. 545, 637 y 945 | `followTheLeader`, `clockTheGaps` y `markReunion` la sacan del último suceso; truncada la entrada, el último suceso es «ahora» |
| `dropLoneChaseGaps` | l. 396-410 | calcula `field` con la etapa entera; nadie ha medido si rompe una lectura progresiva |

Y tres que parecen del futuro y no lo son: `followTheLeader` solo usa el `front` de las líneas anteriores (l. 546-601), `markReunion` acumula `maxFront` hasta la propia captura (l. 937-1005) y el `desenlace` solo necesita la longitud, que se sabe antes de salir. Es la lista de `ingeniero.md` §8.2, comprobada línea a línea por el juez de cobertura (§2, punto 3); lo que dicen `television.md`, `estado.md` y `datos.md` §8.1 de `respecto` y `juntos` es falso. La corrección es §12.2 (D-43).

- **Dos vocabularios del mismo grupo.** La crónica dice `the lead group`, `the chase group` y `the bunch`, y nada más (`stageJournal.ts` l. 30-54; la lista vive en el motor, `GROUP_NOUNS`, `packages/engine/src/sim/coherence.ts` l. 571, y la vigila `stageJournal.test.ts` l. 1523-1653). La radio dice `Peloton`, `Bunch together`, `Lead group`, `Chase group`, `No man’s land`, `Grupetto` y `2nd group` (pantalla; `RaceRadioPanel.tsx` l. 58-79), más los tres grupos del maillot (l. 85-89), que elige en un orden (amarillo, montaña, puntos: `JERSEY_ORDEN`, l. 102) distinto del del reparto (amarillo, puntos, montaña: `JERSEY_PRIORITY`, `packages/shared/src/jerseys.ts` l. 22). Es lo contrario de la regla C7 del dueño (§2.7).
- **Cuatro nombres para un artefacto.** «journal», «crónica», «diario» y la pestaña `Story` son lo mismo (`StageStory.tsx` pinta `data.chronicle`), y hay tres relatos más que no nombra ninguno: «What happened to you» (`LastRaceReport.tsx` l. 91-106), el veredicto de la portada (`Home.tsx` l. 182) y el parte de energía (`RaceEffortLog.tsx`) (mapa 05 §6, contradicción 8).
- **`narration.ts`, medio muerto (X-21).** `narrate()` y su tabla (`apps/web/src/domain/narration.ts` l. 16-124) no tienen ninguna llamada en producción: solo su test la usa (la función está en l. 118), con el vocabulario que la crónica retiró. `personalNarration` devuelve la clave cruda para todo lo que no sea uno de sus siete casos (l. 146-147), y así se lee «What happened to you»; `raceVerdict` (l. 152-164) da el veredicto de la portada. El informe que los alimenta re-simula la etapa con el motor de hoy (`packages/db/src/raceReport.ts` l. 148) (mapa 05 §6, contradicción 9).
- **La semilla de variante lleva los nombres y el «and» inglés** (`${e.plantilla}:${e.km}:${plain}`, `stageJournal.ts` l. 325-328) y la identidad de cada mención se resuelve con el equipo de HOY (`getRaceRiderIdentities`, `packages/db/src/results.ts` l. 191-208, con el `leftJoin` sobre `riders.teamId` en l. 205): un traspaso reescribe crónicas viejas, y traducir o añadir una redacción re-sortea el pasado (`h % n`, mapa 07 §3).

### 1.5 Las noticias

El punto 5 del encargo, comprobado:

- **`news` guarda `kind` y `text` y nada que los explique** (`packages/db/src/schema.ts` l. 792-811): `id`, `world_id`, `game_day`, `scope`, `rider_id`, `kind`, `text` y `created_at`. Ni `seed`, ni `data`, ni `race_key`, ni `stage_day`, ni `team_id` (mapa 04 §1.2).
- **La semilla se calcula y se tira.** `emitNews` recibe `seed` y `data`, llama a `renderNews` y guarda solo el texto (`packages/db/src/news.ts` l. 28-49). La semilla de la victoria decía de qué etapa era: `win:${seedBase}` con `seedBase = ${raceKey}:${gameDay}:${stageDay}` (`stageRun.ts` l. 1195 y 1214).
- **Los datos no son ingredientes.** `NewsData` lleva NOMBRES e inglés (`rider`, `team`, `race`, `stage`, `detail`: `packages/engine/src/world/news.ts` l. 21-27), y cada uno de los once `kind` (l. 8-19) tiene una sola plantilla (l. 33-50), así que la semilla hoy no elige nada. `detail` llega ya en inglés («climbs off, out of energy», «3 weeks», «at 38»; mapa 04 §1.2), y `contract` con traslado escribe «signs for T , relocating to Spain.», porque el `detail` empieza por coma y la plantilla antepone un espacio (mapa 02 §3).

Quién escribe cada `kind` hoy y qué semilla se tira (verificado en el código; mapa 02 §3):

| `kind` | Quién lo escribe y cuándo | Semilla calculada y tirada |
| --- | --- | --- |
| `stage_win`, `tt_win`, `breakaway_win`, `one_day_win`, `one_day_tt_win` | el tick, al acabar cada etapa (`stageRun.ts` l. 1201-1217); una sola noticia en una carrera de un día | `win:${raceKey}:${gameDay}:${stageDay}` |
| `gc_win` | el tick, en la última etapa de una carrera por etapas (l. 1221-1231) | `gc:${raceKey}:${gameDay}:${stageDay}` |
| `kom` | el tick, en la última etapa, si el líder de la montaña tiene puntos (l. 1233-1256) | `kom:${raceKey}` |
| `abandon` | el tick (`markAbandons`, l. 1069-1081) y la API cuando el jugador retira a su corredor, sin etapa (`riderSchedule.ts` l. 299-306) | `abandon:${raceKey}:${gameDay}:${riderId}` |
| `injury` | el tick (`applyIncidents`, l. 1131-1138), sin nombrar la carrera | `injury:${raceKey}:${gameDay}:${riderId}` |
| `contract` | la API, al aceptar una oferta (`packages/db/src/contracts.ts` l. 332-339) | `contract:${offerId}` |
| `retirement` | el tick, al cambiar de temporada, para los seis retirados con más palmarés (`rollover.ts` l. 319-333) | `${worldSeed}:retire:${riderId}` |

Todas se escriben `global`: ningún llamador pasa `personal: true` (mapa 02 §3).

- **`breakaway_win` no comprueba que el ganador fuera en la fuga**: basta que haya un `fuga_formada` y ningún `fuga_cazada` (`stageRun.ts` l. 1184-1186).
- **El equipo que acompaña al titular es el de HOY**: el feed lo une por `riders.teamId` al leer (`news.ts` l. 84-85).
- **El orden dentro del día no es estable**: todas las noticias de un día se escriben en la misma transacción y comparten `created_at` (la hora de inicio de la transacción), y el feed ordena por `game_day` y `created_at` (`news.ts` l. 87; mapa 04 §1.2, que lo deduce de la semántica de `now()` sin haberlo visto en una base con datos).
- **No hay titular de cambio de líder**, ni de maillot de puntos, ni de equipos, ni de jóvenes (mapa 02 §3).
- **La web adivina la carrera** buscando dentro del titular inglés el nombre más largo del calendario (`raceOfHeadline`, `apps/web/src/domain/newsFeed.ts` l. 17-24): con E10, o con dos carreras cuyo nombre contenga al de otra, se rompe.
- **Tres documentos se adjudican el arreglo**: la Oleada 0 de la agenda, E2 y E10 (mapa 05 §6, contradicción 6). `00-encargo.md` §1, punto 5, lo da a E2, con plazo: antes del reinicio (§1.10).

### 1.6 El destripe hoy, en cifras

**Las 48 superficies del mapa 03 §4, por familia.** La tabla entera, fila a fila y con su mecanismo, es §11.1.

| Familia | Superficies | Qué enseñan hoy | Destripan |
| --- | --- | --- | --- |
| La etapa | `sup. E1` a `E9` | la crónica entera por defecto, el podio, los maillots de la N−1, el resultado, las clasificaciones de después, la radio hasta la meta, el perfil con los hitos, la respuesta entera y `?tab=` en la URL | 9 de 9 |
| La carrera | `sup. C1` a `C6` | el ganador en la cabecera, las clasificaciones de ahora, la clásica en `Result`, el ganador de cada etapa, el palmarés de la temporada, el estado | 5 de 6: `sup. C6` dice cuántas etapas se han corrido, no quién ganó |
| El índice | `sup. I1` a `I4` | el ganador de cada carrera, el campeón nacional, el buscador por ganador, el calendario del equipo | 4 de 4 |
| Noticias | `sup. N1` a `N4` | titulares, etiqueta de familia, desplegables de filtro, noticias del equipo | 4 de 4 |
| Lo mío | `sup. H1` a `H7` | «Last race» con puesto y veredicto, puntos y dinero, forma, parte de energía, informe, libro de cuentas, mis resultados | 7 de 7 |
| Fichas | `sup. P1` a `P6` | puntos y puesto, logros, palmarés, resultados de cualquiera, salud, puntos y presupuesto del equipo | 6 de 6 |
| El mundo | `sup. W1` a `W6` | ranking, premios, palmarés de la vuelta de prueba, salón y récords, naciones y equipos, rivales por fama en las órdenes | 5 de 6: `sup. W6` ordena por `riders.fame`, que no se escribe (§1.7) |
| Transversales | `sup. T1` a `T6` | título de la pestaña, favicon, tooltips, contadores, correo, notificaciones | 1 de 6: solo los tooltips, que siguen a su tabla (`sup. T3`); el título es fijo (`apps/web/index.html` l. 7, y ningún `document.title` en `apps/web/src`), el favicon estático, el `badge` de `Tabs.tsx` l. 78-79 no lo usa nadie, los tres correos son de cuenta y no hay notificaciones |

Son 41 de 48; siete no destripan hoy (`sup. C6`, `T1`, `T2`, `T4`, `T5`, `T6` y `W6`), porque no dependen de un resultado o porque el dato está muerto (juez de cobertura §2, punto 4).

**Las nueve puertas de fuera del inventario** (`producto.md` §1.7 y §7.5; comprobadas por el juez de cobertura §2, punto 4). La tabla con su mecanismo es §11.2, que añade una décima, `sup. X10`: tras un abandono, el planificador y su proyección dejan de contar como de carrera los días que quedaban (`packages/db/src/riderSchedule.ts` l. 47; decisión 11-b), y una undécima, `sup. X11`: la ficha de cualquier corredor manda sus atributos, que mueve lo aprendido en la etapa velada (TAC de +0,37 a +0,41 en el mundo de B1, medido, `rcod/n/b1/attrs.mjs`); queda libre por DD-08 (decisión 11-r).

- `sup. X1`: el informe del bloque y la tendencia (`/api/riders/me/report` y `/trend`, `apps/api/src/routes/riders.ts` l. 447-477) suman un aprendizaje que multiplica TAC por 1,8 al ganar y 1,4 en el top 10 (`packages/engine/src/world/learning.ts` l. 106-110): el informe cuenta que ganaste.
- `sup. X2`: `upcoming-races` y `my-orders` dejan de listar la carrera si tu corredor abandonó (`packages/db/src/riderSchedule.ts` l. 217).
- `sup. X3`: la sesión caduca a los 7 días (abajo).
- `sup. X4`: `/api/free-agents` ordena por `seasonPoints` (`packages/db/src/browse.ts` l. 234).
- `sup. X5`: la caché de la web sobrevive a un cambio de cuenta en el mismo navegador (abajo).
- `sup. X6`: el historial y el autocompletado del navegador guardan títulos y URL.
- `sup. X7`: la vista previa de un enlace compartido, hoy genérica porque la SPA la sirve el fallback de `apps/api/src/app.ts` l. 205-210 con el `index.html` fijo.
- `sup. X8`: `/api/teams/me/calendar` con el presupuesto del equipo (`apps/api/src/routes/teams.ts` l. 63).
- `sup. X9`: la retirada `POST /api/riders/me/races/:raceKey/retire` responde `alreadyOut` (`routes/riders.ts` l. 648): dice que tu corredor ya abandonó.

La API tiene 52 rutas `GET` (contadas con perl sobre `apps/api/src/routes/*.ts` por el juez de cobertura, registros de varias líneas incluidos; re-contadas aquí sin los tests: 52). El «unas 50» de `ingeniero.md` §7.4 es cierto, y es la razón por la que el canario tiene que recorrer lo que registra Fastify y no una lista a mano (§11.3, §14.5). X-17 queda así: las 48 filas son exactas, siete no destripan, hay fugas fuera y las rutas son 52.

**La sesión y la caché (X-16).** better-auth caduca la sesión a los 7 días y la renueva como mucho una vez al día (`expiresIn: 3600 * 24 * 7` y `updateAge` de un día, `apps/api/node_modules/better-auth/dist/context/create-context.mjs` l. 146-147), y `apps/api/src/auth.ts` no configura `session`: quien vuelve tras una semana llega sin sesión. La portada del invitado no enseña resultados (`GuestHome`, `Home.tsx` l. 44-72), pero `/news`, `/world` y los rankings son públicos. La caché de la web guarda los datos del mundo 30 minutos con claves sin usuario (`STALE_TIME.world`, `queryClient.ts` l. 17-26), y cerrar sesión no la limpia (`authClient.signOut()` y `navigate('/login')`, `Account.tsx` l. 311-314). Es cierto lo que dice `producto.md` de la sesión y de la caché, y a medias lo de la portada de invitado (C13; juez de ejecutabilidad #7).

**Saber de qué carreras es un jugador cuesta un recorrido secuencial (X-11).** `race_rosters` solo tiene la clave `(race_id, rider_id)` (`schema.ts` l. 609). Medido por el juez del motor en PGlite con 249.232 filas (la cota de cuatro temporadas, un año real): 19,6 ms para las carreras de un corredor; con un índice por `rider_id`, 0,11 ms (C12). El «menos de 5 ms» estimado en `estado.md` §7.2 es falso sin índice.

**La etapa no tiene día.** `stage_snapshots`, `stage_results` y `stage_team_results` no llevan `game_day`, ni `world_id`, ni marca de tiempo; el día de juego de una etapa se deduce del calendario (mapa 04 §0 y §1.3). Lo agregado sí lleva fecha (`rider_points`, `palmares`, `transactions`, `rider_daily_log`), pero no etapa.

**Nadie sabe qué ha visto nadie.** Ni tabla, ni columna, ni campo de contrato, ni almacenamiento del navegador: cero resultados de `seen`, `visto`, `watched` o `last_seen` en el esquema y cero `localStorage` en uso (mapa 04 §3, mapa 03 §5). El único rastro de una visita es `sessions.updated_at`, con resolución de un día.

**Cuántas etapas nuevas encuentra un jugador** (mapa 04 §2, medido sobre ventanas del calendario; las de su corredor, estimadas con 45 a 65 días de carrera al año):

| Visita | Días de juego | Etapas del mundo, p50 (p90; máx.) | Sin nacionales | Etapas de SU corredor |
| --- | --- | --- | --- | --- |
| cada 6 horas | 1 | 2 (6; 187) | 2 (6; 11) | 0 o 1 |
| una vez al día | 4 | 11 (22; 411) | 9 (19; 39) | 0,5-0,7 de media; 4 seguidas si está en una vuelta |
| una vez a la semana | 28 | 94 (142; 530) | 73 (121; 138) | 3,5-5 de media; una gran vuelta ENTERA cabe en la semana |

Una gran vuelta dura 23-24 días de juego, unos 6 días reales (Italia, días 128-151; Francia, 185-207; España, 234-256): quien entra los domingos encuentra la vuelta acabada, con general, maillots, noticias y palmarés escritos. Y el calendario tiene picos: el día 176 corre 187 etapas (las cronos nacionales) y el 179, 153 (las nacionales en línea) (mapa 02 §1.3; C15).

**Documentos que declaran un estado falso** (mapa 05 §6, contradicciones 4 y 15): la tabla `stages.radio` que nombran `00-encargo.md` l. 53 y `docs/agenda.md` l. 121 (y nombraba `docs/encargos.md` hasta que lo corrigió el ensamblado de este documento) no existe (la radio es `stage_snapshots.radio`, `schema.ts` l. 756, y los sucesos `stage_snapshots.events`), ni la `stage_runs` de `docs/balance.md` l. 1857, 4285, 5471 y 8523. Y los rectores dicen que no se envía correo cuando desde el 22-09-2026 la app manda tres (commits `bd6f1f9` y `36aee34`; `apps/api/src/emails.ts` l. 64-135), aunque ninguno de carreras.

### 1.7 Los maillots hoy

El punto 6 del encargo, contra el código:

| Categoría del dueño | Dato hoy | Dibujo hoy | En el relato hoy |
| --- | --- | --- | --- |
| 1. General (amarillo) | `assignLeaderJerseys` sobre la general tras la N−1 | `LeaderJersey` (`Jersey.tsx` l. 71-117), con marca de forma además del color | en cada mención de la crónica (el de la N−1) y como nombre de grupo en la radio |
| 2. Puntos (verde) | ídem | ídem, con banda | ídem |
| 3. Montaña (azul) | ídem | ídem, con lunares | ídem |
| 4. Campeón nacional o del mundo | no existe; derivable de `palmares` | no existe | no |
| 5. Equipo | `teams.jersey_seed` | `Jersey` (`Jersey.tsx` l. 15-52), procedural | no: el equipo viaja como nombre |

- **Tres de clasificación, bien resueltos.** `JerseyKind = 'gc' | 'points' | 'kom'` (`jerseys.ts` l. 19), prioridad amarillo, verde, azul (`JERSEY_PRIORITY`, l. 22) y `assignLeaderJerseys` (l. 80-98), que baja por cada tabla saltando al que abandonó y al que ya lleva uno: es el «pasa al siguiente». La API da los de la carretera (tras la N−1) y los de después (`routes/races.ts` l. 468-473); en una carrera de un día, ninguno (`NO_LEADERS`, `jerseys.ts` l. 36-37). El tick los calcula para ordenar la lista de seguimiento de la radio (`stageRun.ts` l. 551-557) y no los guarda.
- **El campeón no existe en ninguna tabla (X-13).** Los campeonatos nacionales sí se corren (532 por temporada, cuatro por país: `nc-<cc>-road`, `nc-<cc>-itt`, `nc-<cc>-u23-road` y `nc-<cc>-u23-itt`, mapa 04 §4) y su ganador queda en `palmares` con `kind = 'gc'` (`stageRun.ts` l. 1297-1306), con el índice `palmares_race_idx (world_id, race_id)` (`schema.ts` l. 785): el campeón vigente es derivable con una consulta para todos los países. La vía de `race_gc` con la consulta del dorsal 1 del campeón defensor (`calendarRun.ts` l. 991-1007) es cierta a medias: una consulta por carrera, sin `world_id` ni `game_day`, y los nacionales numeran antes por puntos y salen (l. 976-988). Y dos afirmaciones de las propuestas son falsas: «desde el primer día», porque tras el reinicio no hay campeones hasta el nacional de ruta, `NATIONALS_ROAD_DAY = doy(6, 28)`, el día 179 (`packages/engine/src/routes/calendar.ts` l. 204), salvo en 17 de los 22 países de `NATIONALS_ROAD_OVERRIDE` (l. 211-234), que lo corren antes (los otros 5, después; medido en §7.4), y el Giro de la temporada 0 (días 128-151) sale sin campeón de Italia; y el filtro `LIKE 'nc-%-road'`, que casa con `nc-it-u23-road` (juez de cobertura §2, punto 2; C18). La decisión es §7.4 (D-25).
- **`riders.fame` es una columna muerta (X-12).** Nunca se escribe (`packages/db/src/rollover.ts` l. 58-62 y 290-296; es la primera de `MUERTAS_CONOCIDAS`, `columnasVivas.test.ts` l. 34-38): todos los corredores valen 0. Una notoriedad por percentil de fama (`television.md` §6.4) o un `CastRider.fame` (`datos.md` §3.3) no ordenan nada, y `sup. W6` no destripa (C14; cobertura §2.7; ejecutabilidad #10).
- **No hay rótulo de corredor.** La identidad de cada mención lleva el maillot de líder, la bandera, el dorsal y el equipo como NOMBRE (`chronicleRiderSchema`, `contracts.ts` l. 1232-1260, con `team: string | null` en l. 1247-1248), sin `teamId` ni `jerseySeed`; el maillot de equipo (`Jersey`, dibujado desde `jerseySeed`) se pinta en listas y fichas y nunca en resultados, crónica ni radio (mapa 03 §6).
- **«El del equipo» son dos cosas** (mapa 05 §6, contradicciones 10 y 11): la equipación de la escuadra, que es una semilla (`teams.jersey_seed`) que el mánager elige entre 12 candidatas (`apps/web/src/components/TeamManager.tsx` l. 21-26), y el dorsal amarillo del equipo líder (`RaceLeaders.team`, `leadingTeam`, `jerseys.ts` l. 116-118), que la web no pinta en ningún sitio. Las cinco categorías, y lo que añaden E2, E3 y E12, son §7.3.

### 1.8 Lo que pesa hoy

- **La radio guardada**: de 126 a 559 KB de JSON y de 10,7 a 146,4 KB en `jsonb` en disco, en nueve etapas (juez del motor §2.1, PGlite 0.5.4 con `pglz`); por tipo, medianas en disco de 16 KB en llana, 27 en media y 90 en reina, sobre 35 etapas (mapa 04 §1.1). Por temporada, unos 40 MB de radio en disco y 240 MB en JSON (estimado con las 1.418 etapas y esas medianas, mapa 04 §5). El «~22 KB por etapa» de `schema.ts` l. 754 solo casa con la mediana de una vuelta pequeña, y el «vector de enteros … por ~55 KB» que promete `raceRadio.ts` l. 483-490 no existe en el código.

| Tipo de etapa (n) | Radio en JSON, mediana (máx.) | Radio en `jsonb`, mediana (rango) | `events` en `jsonb` | `input` en `jsonb` |
| --- | --- | --- | --- | --- |
| llana (8) | 134 KB (170) | 16 KB (9-24) | 7 KB | 35 KB |
| media (14) | 184 KB (303) | 27 KB (19-41) | 8 KB | 28 KB |
| reina (9) | 392 KB (616) | 90 KB (44-156) | 13 KB | 34 KB |
| nacional de ruta, 40 corredores | 209 KB | 26 KB | 5 KB | 9 KB |

Fuente: mapa 04 §1.1, 35 etapas del calendario de la temporada 0 en PGlite. La crono no tiene radio: el motor ignora la sonda (`simulate.ts` l. 1264) y la radio guardada es un objeto vacío de 35 B (mapa 01 §5); las filas de crono del mapa 04 §1.1 (48 y 26 KB) no casan con eso y aquí no se usan.

- **Los sucesos**: de 3,9 a 9,7 KB por etapa en `jsonb` (juez del motor §2.1).
- **La etapa servida**: de 0,87 a 2,95 MB sin comprimir (§1.3).
- **Las cifras de tamaño de las propuestas** (17,5 KB de `datos`, 5,5-39 KB de `estado`, +52-74 KB de `ingeniero` y 106-178 KB de `producto`) son ciertas y miden objetos distintos, salvo el «3-9 KB en disco» de `producto.md`, que es falso: lo que su radio v2 añadiría en `jsonb` son de 4,7 a 53 KB (C7; X-06). La tabla de qué mide cada una, y los topes, es §5.7 (D-11).

### 1.9 Lo que ya está bien y se conserva

No todo es defecto. Lo que sigue funciona, está probado o medido, y el diseño lo conserva o construye encima:

| Pieza | Dónde | Qué hace bien | Qué pasa con ella en E2 |
| --- | --- | --- | --- |
| La radio, microscopio del dueño | `sim/raceRadio.ts`, `RaceRadioPanel.tsx`, `scripts/race-radio.mjs` | la foto de un km con quién tira, por qué y para quién, la velocidad y los dos huecos; catorce tandas de defectos del motor cazadas con ella (mapa 05 §2.8; [DUEÑO 10]) | se escribe igual hasta el paso 11 y después se sirve desde la línea con el contrato `RaceRadio` de hoy (D-16; §12.10) |
| La foto por km y `pullFor` | `stageRun.ts` l. 515-536; `raceLearning`, l. 791-802 | alimenta el aprendizaje de quien trabajó para otro | B10: la radio y el aprendizaje ven las mismas fotos que hoy (D-08; §5.3) |
| La sonda como observación | `types.ts` l. 487-504; «la radio no toca la carrera», `sim/raceRadio.test.ts` l. 748-799 | mirar no cambia la carrera (huella `puesto:id:tiempo` idéntica) | tres ganchos opcionales más, sellados por B11 (D-09; §5.2) |
| `checkReplay` | `raceRadio.ts` l. 49-55 | una etapa solo se re-simula con el motor que la corrió | sigue fiel, porque E2 no sube `ENGINE_VERSION` (D-09; §5.1) |
| `scripts/race-radio.mjs --db` | cabecera, l. 19-38 | re-simula desde la semilla y la entrada guardadas y se niega si la versión no coincide | sigue siendo el microscopio del dueño en producción (§5.1) |
| La crónica como dato | `stage_snapshots.events`; `buildChronicle`, `chronicle.ts` l. 289-376 | plantilla, datos e ids, redactada al leer; veintiuna pasadas de coherencia que valen también para lo ya congelado (l. 356-357) | el acta es `buildChronicle` sin `live`; la voz, la misma con la entrada truncada (D-43; §12.2-12.4) |
| `stageJournal.ts` | l. 318-1605; 140 tests | 55 plantillas, 272 redacciones, identidad completa en cada mención y las cuatro preguntas de SPEC §6.15 | la voz y el acta la reutilizan; gana cuatro `case` y las plantillas nuevas (D-44; §12.5) |
| El hueco como resta de relojes | `gapSeconds`, `group.ts` l. 121-124; `raceRadio.ts` l. 334 | es la medida de la moto de cronometraje (mapa 06 §1.4) | el hueco que se enseña es siempre ése (D-01; §3.5) |
| `isTheBunch`, compartido | `raceRadio.ts` l. 91-99 | motor, radio y web llaman pelotón al mismo grupo (v34) | `BROADCAST.bunchMinShare` es su copia, atada por un test (D-52; §15.5) |
| Sin maillots sin general previa | `NO_LEADERS`, `jerseys.ts` l. 36-37; `routes/races.ts` l. 468-473 | en la etapa 1 y en una carrera de un día nadie lleva maillot de líder | es el paso 1 de la regla UCI (D-24; §7.2) |
| `JERSEY_PRIORITY` y `assignLeaderJerseys` | `jerseys.ts` l. 22 y 80-98 | un maillot por corredor, «pasa al siguiente», nadie que haya abandonado | `wornJerseys` se construye encima y `JerseyKind` no crece (D-24; §7.2) |
| `palmares` y su índice | `stageRun.ts` l. 1280 y 1298; `schema.ts` l. 785 | guarda el ganador de cada campeonato nacional con `kind = 'gc'` | `palmaresTitleSource` deriva de ahí los campeones (D-25; §7.4) |
| Las lecturas `…ThroughStage` | `results.ts` l. 236, 320 y 379; `getTeamClassifications` | las clasificaciones ya se pueden pedir tras cualquier etapa | son el mecanismo P del horizonte (D-32; §10.6) |
| La tolerancia del contrato | `contracts.ts` l. 1499-1531 (`.optional()`), y l. 10-11 y 1482-1533 (`stageReplaySchema`, `z.object` *strip*, sin `.strict()`) | la API puede callar un campo o añadir uno sin romper una pestaña abierta con la web de ayer | la ruta de etapa sigue devolviendo `StageReplay` (D-50; §14.1) |
| La tolerancia de lo guardado | `chronicle.ts` l. 1257-1317 (`storedRaceRadioSchema`, `z.object` sin `.strict()`) y l. 1306 (`.catch(null)`) | una radio vieja, o con un motivo que el contrato no conoce, se sigue leyendo | igual en E2 (D-50; §14.1, regla 5) |
| Lo corrido se congela al correr | `stageRun.ts` l. 570-595, en la transacción del día | «lo que se corrió se lee, no se vuelve a correr» (`routes/races.ts` l. 245) | `stage_timelines` se escribe en la misma transacción (D-10; §5.6) |

### 1.10 Por qué ahora

- **La táctica mueve el motor a la vez.** Los pasos 0 a 21 están fusionados (del motor v66 al v82, y hoy v89; mapa 01 §6), y lo que falta cambia lo que se emite: R23.4 («hasta tres nombres + conteo + equipos»), R23.7 (el corredor propio siempre nombrado en su radio) y R23.8 (`card_changed`) no tienen código, y el 17d no está hecho: `packages/db/src/raceReport.ts` l. 148 sigue re-simulando (mapa 02 §8). Cada cambio en lo que el motor emite sube `ENGINE_VERSION`, y cada subida deja sin replay fiel a todas las etapas anteriores (`checkReplay`): lo que E2 decida guardar tiene que guardarse al correr la etapa, porque después no se podrá recuperar (mapa 01 §8, punto 6). Y el motor cambia deprisa: de la v86 el 22-09 a la v89 el 26-09 (juez del motor, H-motor-04), así que lo que se guarde necesita un formato versionado y una guarda de tipos contra la sonda (§4.3).

| Regla de la táctica | Estado en el código hoy | Qué le toca a E2 |
| --- | --- | --- |
| R23.1, motivos de relevo nuevos | a medias: existen `propio`, `equipo_puntos`, `equipo_montana`, `infiltrado` y `colocando` (`types.ts` l. 437-447); faltan `equipo_joven`, `equipo_equipos` y `aliado` | guardar los motivos como cadena y nunca por índice (D-10; §4.3) |
| R23.4, «hasta tres NOMBRES + conteo + equipos» | a medias: tres nombres (`party.slice(0, 3)`, `simulate.ts` l. 7092) y conteos, sin el reparto por equipos | la frase de la fuga (`breakHeadline`, §7.6) |
| R23.7, el corredor propio siempre nombrado en su radio | sin código: la lista de seguimiento no lleva a los corredores de los jugadores (`stageRun.ts` l. 560-568) | la pertenencia completa lo resuelve (§7.7) |
| R23.8, `card_changed` | no existe en el motor | cae en la regla por defecto de `REVEAL_RULES` y B7 le exige destino (§4.7, §6.6) |
| 17d, el informe deja de re-simular | no: `raceReport.ts` l. 148 re-simula sin mirar la versión (C16) | es de la táctica, y E2 no sube la versión (D-09); pero el 8a cambia la firma de la función que el 17d reescribe, `getRiderLastRaceReport` (`raceReport.ts` l. 78: gana el `Horizon` y elige la última etapa CONOCIDA, D-47, §12.9), y pone su ruta, `/api/riders/me/last-race`, bajo el velo con política `horizon` (§11.3): si el 17d llega después, conserva el `Horizon` y la política de su ruta y pasa B1a, B1b y B1c; si llega antes, el 8a se rebasa sobre él |

- **El reinicio del mundo fija el plazo de las noticias.** «El plazo queda en: **antes del reset**, añadir `seed` y `data` a `news` y mover el renderizado al momento de leer. Después del reset, cada noticia escrita sí es definitiva, porque a partir de ahí no habrá otro borrado» (`docs/agenda.md` l. 131-133), y «El reset es el último momento barato para todo cambio de esquema con historia detrás» (l. 184). Por eso la primera migración de E2 es la de `news` (D-45; §13.2, §17.4).
- **E2 va antes que E3, E6, E10 y E12**, que dependen de lo que E2 fije: el rótulo y la capa fija que E3 dibuja, las pantallas que E6 coloca, las plantillas que E10 traduce y los títulos de campeón que E12 crea (`00-encargo.md` §1, punto 6). E2 tiene que dejar escrita la interfaz que les pide y qué se enseña mientras no existan (§7.9, §19.2).

### 1.11 Lo que esta sección no ha podido comprobar

- **Tamaños y compresión de producción.** Todas las cifras de disco son de PGlite 0.5.4 (PostgreSQL 18.3 con TOAST `pglz`); el CI usa `postgres:17-alpine` (`ci.yml` l. 35) y la compresión de producción, `pglz` o `lz4`, no la sé (mapa 04, juez del motor C8).
- **Si el borde de Railway comprime las respuestas**: en el código no hay compresión; fuera del código, no lo sé (mapa 07 §8).
- **Cuántos jugadores hay y cuántas etapas miran**: las cifras por visita de §1.6 son del calendario; las del corredor propio, supuestos.
- **Si las cuentas (`users`, `sessions`) sobreviven al reinicio**: ningún documento lo dice (mapa 04 §8).
- **Cómo se ve la pantalla de etapa en un teléfono**: las anchuras del mapa 03 §7 son cálculos sobre clases de Tailwind, no medidas en un navegador.
- **La frecuencia de `echelon_*`, `rain_front` y `truce_*`**: no salió ninguno en la muestra del mapa 01.
- **El orden inestable de las noticias de un mismo día** se deduce de la semántica de `now()` en Postgres; nadie lo ha visto en una base con datos.
- **La CPU de producción**: los tiempos del tick son de máquinas compartidas del scratchpad.

---

**Injertos aplicados:** ninguno (§B del esqueleto no asigna ninguno a esta sección).

**Objeciones resueltas:** ninguna asignada.

**Huecos rellenados:** ninguno asignado.

**Contradicciones de hecho resueltas:** X-01 (§1.2); X-02 (§1.2); X-06 (§1.8, con la tabla en §5.7); X-11 (§1.6); X-12 (§1.7); X-13 (§1.7); X-14 (§1.4); X-16 (§1.6); X-17 (§1.6); X-21 (§1.4).

**Decisiones de esta sección:** ninguna. Esta sección solo cuenta el estado de hoy.

**Propuesto para el glosario:** nada.

**Dudas para el ensamblador:**

1. El «0-36 retrocesos de más de 60 s por etapa» de C4, que D-01 y el esqueleto (§3.6) usan como número del defecto, mezcla dos fenómenos: medido aquí (`l1/saltos.mjs`), los saltos de grupo de más de 60 s, que son el defecto de la caza con hueco negativo, van de 0 a 6 por etapa, y los otros 33 de Flandes son la deriva que se anula en el llano sin cambiar de grupo. §3.6 da las dos cifras; conviene que §19.1 (riesgos) cite la de 0 a 6 como tamaño del defecto.
2. El comentario de `SnapshotRider.tS` (`types.ts` l. 453, «Reloj de SU grupo al cruzar el punto») está desfasado: el motor escribe el reloj del corredor, el del grupo más `markLossS` y `driftS` (`simulate.ts` l. 9012). No es de E2 corregirlo; lo apunto por si §4.3 (la guarda de tipos entre `SnapshotRider` y el grabador) quiere decirlo.
