# Dudas de `docs/retransmision.md` (E2): estado tras la coherencia (fase 6)

Este fichero nació en el ensamblado v0 (fase 3c) con las notas del orquestador (`notas-orquestador.md`) y los bloques «Dudas para el ensamblador» y «Dudas del cierre» de las veintidós secciones: veintisiete dudas en cuatro apartados (§1 de diseño, §2 de código de ejemplo, §3 sin comprobar, §4 fuera de E2), más lo que el ensamblado arregló (§5) y lo que ya estaba resuelto (§6). La pasada de coherencia (fase 6 de `04-fase-refutacion.md`) las ha vuelto a mirar una a una contra el texto de HOY de las secciones, tras las correcciones de la fase 5: el estado de cada una, con su evidencia, es la tabla de §0; debajo sigue el texto de cada duda como se escribió, con su estado delante.

Cómo se reproduce: `bash docs/diseno/e2-retransmision/borrador/ensamblar.sh --comprobar` escribe `retransmision-v1.md` desde las secciones (quita de él los bloques «Propuesto para el glosario», fundidos en `00-glosario.md`, y los de dudas, cuyo estado está aquí) y comprueba que no quedan esos bloques, referencias a `borrador/`, rayas ni guiones en medio de frase, líneas cortadas ni remisiones a subsecciones que no existen, y que los 49 injertos, 32 objeciones y 23 huecos de `juicios/veredicto.json` están en algún bloque de cierre. Los bloques de dudas se quedan en los ficheros de sección como registro de lo que pidió cada redactor.

En el ensamblado v0 cambiaron además otros tres ficheros: `00-glosario.md` (los nombres propuestos fundidos, las firmas finales y el registro en §G.14), `00-decisiones.md` (veintitrés entradas corregidas, precisadas o marcadas pendientes, con la versión anterior en cita, y el registro al principio) y `juicios/veredicto.json` (los 104 injertos, objeciones y huecos en estado `aplicado`, con sus secciones).

## 0. Estado tras la coherencia (fase 6)

De las veintisiete, diecinueve están cerradas por el texto de hoy (las doce de diseño, las cuatro primeras de código de ejemplo, la de las subidas de versión de la táctica y dos de las tres de fuera de E2); una es trabajo de la fase 7 (2.5); una sigue fuera de E2 sin cambio (4.3); y seis siguen abiertas porque necesitan una medida que solo puede hacer un paso del plan (3.1 a 3.6). La coherencia añade dos medidas pendientes que salen de lo cerrado (3.8 y 3.9). Ninguna duda de diseño queda abierta.

| Duda | Estado | Evidencia (fichero de `borrador/` y línea, o sección y decisión) | Paso que la mide |
| --- | --- | --- | --- |
| 1.1 los campos propuestos | cerrada (fase 5) | 4-u (`04-modelo.md` l. 1144): `favourites`, `checkClockDs`, `ttCheckDs`, `BroadcastHead.tt` y `tplRev`, `BroadcastChunk.tt.checks`, los `Cue` de crono y `RiderCard.gender` escritos en §4; `contract.housingCovered` en §4.12 (l. 1078); `"tpl_rev" smallint NOT NULL` en la `0044` (`13-esquema.md` l. 133, 13-j); `stageReplaySchema` gana `tplRev` y `riderRaceReportSchema`, `moments` (`14-api.md` l. 157 y 170, 12-k); las plantillas de crono en `CUE_OF_TEMPLATE` (`06-pantalla.md` l. 467-468, 6-j); formato 1 en el 4b y `tpl_rev` en la `0044` del 5 (17-a, `17-plan.md` l. 773) | |
| 1.2 la regla `emit` e `incident` | cerrada (fase 5) | 4-v (`04-modelo.md` l. 1145): el grupo del protagonista al final de `b − 1`, también en pinchazos y averías de carretera; D-05 corregida (fase 5); el riesgo 24 retirado (`19-riesgos.md` l. 48) | |
| 1.3 el borde de la meta de una crono | cerrada (fase 5) | 4-w (`04-modelo.md` l. 1146): la última llegada, con `tt_catches` en el paquete de meta; medido, en 30 de 154 corridas alguien llega después del último en salir (`rcod/n/ws/ttborde.mjs`) | |
| 1.4 la crono larga y `ttMaxStoredBytes` | cerrada en diseño (fase 5) | la e10 de `race-italy` (42 km, 176 corredores) medida con el prototipo: 31.436 B, y 32.203 B con `checkClockDs` (`09-crono.md` l. 81); el tope sube a 49.152 B (15-i, `15-constantes.md` l. 350; D-11 corregida); §19.6 (`19-riesgos.md` l. 187). La medida con el grabador de verdad es la 3.8 | |
| 1.5 la forma del nombre en pantalla | cerrada (fase 5) | 7-a (`07-rotulos.md` l. 499): el nombre tal como está guardado; D-27 cerrada (registro de `00-decisiones.md`); los ejemplos de §6, §8 y F.3 con el nombre guardado (`21-apendices.md` l. 559: `Pulling: Team Beta (for 11 Sam Carter)`) | |
| 1.6 B22 solo mide la cabeza | cerrada (fase 5) | 16-s (`16-bancos.md` l. 799) y B22 (l. 456): informa del p99 y del máximo de todos los grupos (0,84 a 0,89 km de p99, medido por el refutador de código); si pasa de 1 km decide el dueño (§20.6, 20-l). La medida contra la línea grabada es la 3.5 | |
| 1.7 `chaseRefOf` como quinta copia | cerrada (fase 5) | `15-constantes.md` l. 255 (el `it` de `chaseRefOf` contra `chaseReferenceIndex`), 15-a (l. 342) y 15-k; en el 4a (`17-plan.md`, §17.7) | |
| 1.8 `StageTimelineRead.known` | cerrada (fase 5) | `StageTimelineRead` sale y `readStageTimeline` devuelve `StageTimeline \| null` (5-p, `05-motor.md` l. 700; 14-p, `14-api.md` l. 630) | |
| 1.9 D-32 frente a 10-c | cerrada (fase 5) | 10-c (`10-horizonte.md` l. 611): `horizonReaders.test.ts` con el AST y el comprobador de tipos, y las excepciones escritas por su nombre, `buildTimelineCast` y `palmaresTitleSource.titlesOn` entre ellas; D-32 dice la excepción | |
| 1.10 B16 en «las 24 etapas» | cerrada (fase 5) | 16-t (`16-bancos.md` l. 800) y B16 (l. 450): las 22 en línea, y las dos cronos dan la radio vacía; §17.14 lo sigue (`17-plan.md` l. 429, 17-l) | |
| 1.11 `decodedCacheEntries` | cerrada (fase 5) | 18-d (`18-rendimiento.md` l. 273: «nace en 16») y `15-constantes.md` l. 178; D-10 corregida | |
| 1.12 la lista blanca de B1b | cerrada (fase 5) | la columna «Campos (`strip`)» de las dos tablas de §11.18 (`11-superficies.md` l. 701 y 713), que `B1B_WHITELIST` copia (`16-bancos.md` l. 91) | |
| 2.1 §14.3, la ruta del tramo | cerrada (fase 5) | el bloque de §14.3 llama a `withGroupRoles` antes de atar las horas y mete `liveClusters` con `BROADCAST.liveClusters` (`14-api.md` l. 197-212), con su porqué (l. 227) | |
| 2.2 §10.6, `computeHorizon` | cerrada (fase 5) | la forma D con `lastRunStages` (`10-horizonte.md` l. 226 y 236; 18-a) | |
| 2.3 §10.3 en SQL | cerrada (se queda así) | el pseudocódigo escribe en SQL para leerse de corrido y el texto dice que el código va con `.set({ … })` y `.values({ … })` de Drizzle, por `columnasVivas.test.ts` (`10-horizonte.md` l. 113; 13-a) | |
| 2.4 las remisiones `§G.n` y a `00-decisiones.md` | cerrada (fase 5 y fase 6) | la tabla del principio de §21.6 y 21-f; la coherencia llevó a su sitio las 23 remisiones `§G.n` que quedaban en §9, §10, §11 y §14 (cruzada de L10, Rcobertura-010) y cambió las cuatro menciones de `00-decisiones.md` del cuerpo (§2, §19.6, §20.3 y §21.5) por «las decisiones de la síntesis (D-nn)», como §0.3; ninguna queda fuera de los bloques de cierre | |
| 2.5 los bloques de cierre | de la fase 7 | fundirlos es del ensamblado final («ni Decisión tomada aquí sin fundir», `04-fase-refutacion.md` §7); no es una duda de diseño | fase 7 |
| 3.1 `sendBeacon` con un `Blob` JSON | abierta: medida | riesgo 17 y §19.6 (`19-riesgos.md` l. 27 y 180); `18-rendimiento.md` l. 218; el respaldo `text/plain` de 14-g lo cubre mientras tanto | 7a, a mano en Chrome y Safari de móvil (§18.9) |
| 3.2 B14 con el mánager contra Postgres | abierta: medida | medido en PostgreSQL 16 sin red, 3,88 ms de p95 contra 5 (§18.2); falta la red de Railway (`18-rendimiento.md` l. 215); si no pasa, DD-21 | 7a, desde el servicio `web` de Railway contra una copia de producción (§18.9) |
| 3.3 TOAST y la versión de Postgres de producción | abierta: medida | riesgo 12 y §19.6 (`19-riesgos.md` l. 22 y 177): para la línea no importa (`bytea` con gzip 9); la radio de hoy sigue en `jsonb` hasta el 11b | 5, en producción |
| 3.4 B15, el día entero | abierta: medida | la escritura de las 153 filas del 179 ya está medida, de 0,07 a 0,15 s (B15, `16-bancos.md` l. 449; §18.3); el día entero con sub-23 y `buildTimelineCast` sigue proyectado | 5 y 10b, a mano |
| 3.5 B21 y B22 contra una línea grabada | abierta: medida | L1 midió sobre la radio: p99 de 52 a 508 m (B21) y 0,69 km en la cabeza (B22); el refutador, 0,84 a 0,89 km de p99 en todos los grupos | 4b (B21) y 6a (B22) |
| 3.6 el móvil | abierta: medida | el protocolo de §18.5; §19.6 | 10b, a mano |
| 3.7 las subidas de versión de la táctica antes del 17d | cerrada (fase 5) | ya no es una medida: DD-25 (§20.2, reescrita por L10, Rdueno-006) decide qué se hace con una subida de otra línea antes del 17d, con el defecto de adelantar el 17d; §19.5 | |
| 3.8 la crono más larga con el grabador de verdad (nueva, de 1.4) | abierta: medida | `timeline.test.ts` elige en `SEASON_CALENDAR` la crono más larga de 176 corredores y mide su `bytea` (§9.8, 16-n; `19-riesgos.md` l. 187) | 4b, en el banco |
| 3.9 el racimo en vivo de 12-s con nombres (nueva) | abierta: medida | 12-s junta en el racimo a todo corredor salvo la fuga, los maillots y los propios (§12.3; D-43 precisada); sin nombres, 0 violaciones del prefijo (`l8/voz2.mjs`), y con la política de nombres real no se ha medido; `liveClusters` sigue apagada hasta entonces (DD-18) | 6b, B19 con la política de nombres real (§16.4, §19.6) |
| 4.1 el comentario de `SnapshotRider.tS` | cerrada (fase 6) | fila nueva de §19.7 (`19-riesgos.md`, «un reloj que el comentario llama de grupo»): E2 no se apoya en él, y lo corrige el PR 4a, que ya toca `types.ts` (§17.7) | |
| 4.2 DD-25 en `docs/tactica.md` | cerrada (fase 5) | DD-25 ya no impone una regla a la táctica: pregunta al dueño qué hacer con una subida antes del 17d, con el defecto de adelantarlo (§20.2); la nota del paso 12 en `docs/balance.md` lo cuenta (§17.15) | |
| 4.3 los 85 KB del motor en la página de etapa | fuera de E2, sin cambio | §18.5 lo pone quinto y último en lo que se baja si el móvil no llega (`18-rendimiento.md` l. 158, «Si no se cumple»); es de E6 | 3c, a mano, el peso de lo que E2 añade (§18.9) |

## 1. De diseño: todas cerradas en la fase 5

**1.1 · Los campos que proponen las secciones y §4, §13 o §14 no escriben.** *Cerrada en la fase 5 (4-u, 13-j, 12-k; §0).* Secciones: §4.2, §4.3, §4.6, §4.9, §4.11, §4.12, §13.3 y §14.2, frente a §8 (8-g), §9 (9-b, 9-d, 9-i) y §12 (12-c, 12-j, 12-k). Una versión: los tipos, la tabla y los esquemas de §4, §13 y §14 no llevan `TimelineCast.favourites`, `TimeTrialTrace.checkClockDs`, `TimelineVisibility.ttCheckDs`, `BroadcastHead.tt`, `BroadcastChunk.tt.checks`, las variantes `tt_split` y `tt_finish` de `Cue`, `stage_timelines.tpl_rev`, `BroadcastHead.tplRev` y `StageReport.tplRev`, `contract.housingCovered` ni `riderRaceReportSchema.moments`. La otra: las secciones que los proponen los necesitan con esa forma exacta, y sin `favourites` B1c nace en rojo en el 7a (la previa de la N se leería con los atributos de hoy, que difieren entre los dos desenlaces; nota de L4, dudas del cierre de §16, riesgo de §17.8). El glosario ya los lleva marcados «propuesto» (§G.3.8) y §17 dice dónde entran si se aceptan (17-a: en el formato 1, en el PR 4b, y `tpl_rev` en la `0044` del 5, sin quinta migración). Para cerrarlo: aceptarlos y escribirlos en §4.2, §4.3 (codificación de los tres campos guardados), §4.6, §4.9, §4.11, §4.12, §13.3 (la columna, en SQL y en Drizzle), §14.2 y en `CUE_OF_TEMPLATE` de §6.6 (el destino de las plantillas de crono de §9.5), o rechazarlos uno a uno con su consecuencia escrita. No se ha hecho en el ensamblado porque toca la codificación y el contrato, no solo un nombre.

**1.2 · La regla `emit` e `incident` de §4.7 retrasa el rótulo de caídas y pinchazos.** *Cerrada en la fase 5 (4-v; §0).* Secciones: §4.7 y §5.4, frente a la duda 4 de §5; afecta a §6.5 y al riesgo 24 de §19.1. Una versión: el grupo de un corredor en el bloque `b` es su grupo al final de `b` (`groupAt(r, b)`), y el caído sale de su grupo en el mismo bloque. La otra, medida por L3 (`l3/grabador.mjs`, 627 caídas de 13 etapas por 3 semillas): el rótulo `CRASH` saldría 70,6 s de carrera tarde de mediana (p90 136 s, máximo 290 s) respecto del paso del grupo en que iba, y los pinchazos y averías de carretera, 141,6 s (p90 329, máximo 373). Propuesta de §5: en `emit` e `incident`, el grupo de `r` al final de `b − 1`. Para cerrarlo: decidirlo en §4.7 (y en la tabla de D-05), ajustar el pseudocódigo de §5.4 y quitar o rebajar el riesgo 24 de §19.1.

**1.3 · El borde de la meta de una crono.** *Cerrada en la fase 5 (4-w; §0).* Secciones: §4.2 (`FinishRecord.finishS`: «en crono, la llegada del último en salir»), §4.6 y la fila `tt_last_home` de 4-r, frente a la duda 1 de §9. Una versión: la meta de la crono es la llegada del último en SALIR. La otra, medida en 6 corridas: en 1 (la e16, semilla 0) un corredor llega después que él, y el motor cierra la crono con la última LLEGADA (`stage_win_itt`, `timetrial.ts` l. 611-619); con el borde de §4.6 ese corredor sigue en ruta cuando la pantalla pide la meta y su llegada solo viaja en el paquete. Propuesta de §9: el borde es la última llegada. Para cerrarlo: decidirlo en §4.2, §4.6 y §4.7, y seguirlo en §9.3, §9.4 (`lastKmFromS`, el `+10 min`) y §14.3.

**1.4 · La crono larga frente a `ttMaxStoredBytes`.** *Cerrada en diseño en la fase 5 (15-i); la medida con el grabador de verdad es la 3.8.* Secciones: §9.2 y §19.6, con los topes nuevos de D-11 (§15.2). Una versión: 32 KB bastan para la línea entera de una crono (medido de 18,8 a 24,2 KB con 176 corredores, §5.7, en cronos de 20 y 26 km). La otra: la traza de una crono de 40 km con 176 corredores se estima en 19-20 KB con relojes absolutos (a proporción de la e16, 12,8 KB de traza en 26 km), y con el resto de la línea (unos 11 KB en la e16) quedaría cerca de 31 KB; ninguna de las 24 etapas del banco pasa de 26 km, así que B6 no lo cazaría. Por deltas por km la traza serían unos 5 KB (`estado.md` §9). Para cerrarlo: medir una crono de 40 km con el prototipo del grabador y, según la cifra, guardar `tt` por deltas en §4.3 o subir el tope en §15.2.

**1.5 · La forma del nombre en pantalla.** *Cerrada en la fase 5 (7-a, D-27; §0).* Secciones: §6.1 a §6.7, §6.11, §8.6 y §8.7, el glosario (§G.11) y el apéndice F (F.3) y D-27, frente a §7.1 (decisión 7-a). Una versión: los ejemplos de pantalla de §6 y §8 escriben el apellido en mayúsculas o con inicial (`Pulling: Team Beta (for 11 S. CARTER)`, `DROPPED · 11 S. CARTER · Race leader · +0:25`, `MORENO · LEROY · KAHN`, `on CARTER`, `1. LEROY 10 pts`, `[GC] 11 S. CARTER · closest: ARRIETA +0:04`, `225 J. KAHN`). La otra: `riders` solo guarda `name` (`schema.ts` l. 279), `generateName` compone nombre y apellido sin guardarlos (`packages/db/src/names.ts` l. 96-98) y poner en mayúsculas «la última palabra» falla con los apellidos compuestos; por eso 7-a escribe el nombre del rótulo tal como está guardado (`Luca Bertolini`) y descarta `Luca BERTOLINI` y `L. BERTOLINI`. Para cerrarlo: o todos los ejemplos pasan al nombre guardado (y la barra del móvil, que es estrecha, se mide así en §18.5), o se fija una regla de nombre corto que no dependa de adivinar el apellido (lo que exigiría guardar las partes del nombre, fuera de E2). El glosario y F.3 marcan el ejemplo de `Pulling:` como pendiente.

**1.6 · B22 solo mide la cabeza.** *Cerrada en la fase 5 (16-s); la medida contra la línea grabada es la 3.5.* Secciones: §3.8, §16.4, frente a la duda 1 de §3. Una versión: D-07 fija la puerta del reloj estimado en el p99 de la posición de la CABEZA. La otra: el adaptador pinta los demás grupos interpolando entre fotos sin marcas de composición ni identidad, que es lo que teme O-13, y ese error puede llegar a km (`estado.md` §3.6: 3,5 km en Flandes con identidad). Propuesta de §3: que B22 informe además del p99 del cursor de todos los grupos, sin que sea puerta. Para cerrarlo: añadirlo a B22 en §16.4 o descartarlo por escrito.

**1.7 · `chaseRefOf` como quinta copia atada.** *Cerrada en la fase 5 (15-a, 15-k; §0).* Secciones: §15.5 (cuatro copias atadas: `bunchMinShare`, `chaseMinShare`, `nameWholeGroupUpTo` y `photoBlocksOf`; 15-a), frente a §6.3 (6-a: `chaseRefOf` copia `chaseReferenceIndex` y «se ata por test como las copias de §15.5») y la duda de §6. El PR 4a exporta `chaseReferenceIndex` (17-j). Para cerrarlo: añadir el `it` a `broadcastConstants.test.ts` en §15.5, exportando `chaseRefOf` de `instant.ts` o probándola a través de `groupRoleOf` sobre entradas generadas, y decirlo en 15-a.

**1.8 · `StageTimelineRead.known` frente a `WatchState.known`.** *Cerrada en la fase 5 (5-p, 14-p; §0).* Secciones: §5.6 y §14.4, frente a §10.2 (10-e). `StageTimelineRead.known` significa «fuera del velo» y `WatchState.known`, «conocida» (letras `W`, `S`, `R`, `A`): el mismo nombre para dos cosas distintas, contra la regla de un nombre por concepto. Propuesta de §14: renombrar el de §5.6 a `unveiled`; §14.4 no cambia en nada más. Para cerrarlo: decidir el nombre y llevarlo a §5.6, §14.4 y §G.4.

**1.9 · D-32 al pie de la letra frente a 10-c.** *Cerrada en la fase 5 (10-c; §0).* Secciones: §10.6 (10-c), §5.4 y §7.4, frente a D-32 punto 1. Una versión: D-32 pone `stage_timelines` y `palmares` entre las fuentes con `Horizon` obligatorio. La otra: 10-c deja sin él a `buildTimelineCast` y a `palmaresTitleSource.titlesOn`, que corren en el tick y no leen para ningún espectador. Si la fase adversaria prefiere la lectura literal, cambian esas dos firmas (pasarían `worldHorizon`) y nada más. D-32 ya dice la excepción (ensamblado v0).

**1.10 · B16 en «las 24 etapas».** *Cerrada en la fase 5 (16-t; §0).* Secciones: §12.10, §16.4 y §17.14. B16 compara la radio desde la línea con la guardada «en las 24 etapas del mapa 07 §7», pero en las dos cronos no hay radio (la crono ignora la sonda, `simulate.ts` l. 1264), como ya se corrigió para B10 (22 etapas en línea, §5.10). Para cerrarlo: decir 22 etapas en línea en los tres sitios o qué compara B16 en una crono.

**1.11 · `decodedCacheEntries`: 16 desde que existe.** *Cerrada en la fase 5 (18-d; §0).* Secciones: §15.3 y §17.9, frente a 18-d. El ensamblado fijó el valor de §15.3 en 16, con la memoria medida (D-10 corregida), y quitó del PR 6a el paso «baja de 64 a 16»; la decisión 18-d, que se queda como registro en el cierre de §18, dice que baja en el paso 6. Si la fase adversaria prefiere el plan de 18-d, §15.3 vuelve a 64 con la nota del 6a.

**1.12 · La lista blanca de B1b con sus rutas de campos.** *Cerrada en la fase 5 (§11.18; §0).* Secciones: §11.18 y §16.3 (16-o). `B1B_WHITELIST` traduce a la gramática de `strip` la prosa de §11.18 (con el token `[veiledDay]` para la fila de `/api/riders/me/form`). Propuesta de §16: que la tabla de §11.18 lleve además la ruta de campos en una columna, para que la traducción no quede al implementador. Es de forma; no cambia ningún banco.

## 2. Código de ejemplo por reescribir: cerradas, salvo la 2.5, que es de la fase 7

**2.1 · §14.3, la ruta del tramo.** *Cerrada en la fase 5 (§0).* El texto ya dice (ensamblado v0, parche C-55) que la ruta llama a `withGroupRoles` ANTES de construir `revealOf` y construye el mapa sobre lo que devuelve (12-n), y que mete los racimos de `liveClusters` antes de `buildChronicle` con `BROADCAST.liveClusters` encendida (§12.3); el bloque de código de §14.3 sigue sin esas dos llamadas. Para cerrarlo: reescribir el bloque con el orden de 12-n.

**2.2 · §10.6, `computeHorizon`.** *Cerrada en la fase 5 (18-a; §0).* El texto ya remite a la forma D (parche C-41) y §10.7 da la cifra medida (C-42); el bloque de código sigue con la consulta 2 que recorre `race_rosters` entera y la cuarta por espectador. Para cerrarlo: reescribir las consultas 2 y 4 como en §18.2 (18-a), con `lastRunStages` y los ids por delante.

**2.3 · §10.3, las escrituras de `watch.ts`.** *Cerrada: se queda así (§0).* El pseudocódigo escribe las actualizaciones en SQL; el texto ya dice que el código va con `.set({ … })` de Drizzle (parche C-39, 13-a). Si se quiere, el pseudocódigo puede pasar a Drizzle.

**2.4 · Las remisiones al glosario (§G.n) y a `00-decisiones.md` dentro del documento.** *Cerrada en las fases 5 y 6 (21-f; §0).* El cuerpo cita unas 125 veces subsecciones del glosario (`§G.4` 32 veces, `§G.2` 18, `§G.11` 14, `§G.9` 12, y otras) y 16 veces `00-decisiones.md`, que no son parte de `docs/retransmision.md`. Muchas dicen «la firma de §G.4» en el sentido de la que fijó la síntesis antes de escribir, así que no se pueden cambiar a ciegas. Para cerrarlo en la fase 7: llevar cada una a su sitio del documento (§21.6 F.1 a F.4, §4, §13, §14.2, §15, §16.9, §17.2) o reescribir la frase, y decidir si las decisiones `D-nn` viajan al documento (por ejemplo, como apéndice) o se citan solo por su contenido.

**2.5 · Los bloques de cierre.** *Es de la fase 7 (§0).* El v0 conserva «Injertos aplicados», «Objeciones resueltas», «Huecos rellenados», «Contradicciones de hecho resueltas» y «Decisión tomada aquí» de cada sección (quita solo los nombres propuestos y las dudas). La fase 7 los funde («ni Decisión tomada aquí sin fundir», `04-fase-refutacion.md` §7). Algunas decisiones de esos bloques remiten a «Dudas» que ya se cerraron (10-b, 11-k): se quedan como registro.

## 3. Sin comprobar: las mide un paso del plan (abiertas, salvo la 3.7)

- **3.1** *Abierta: 7a, a mano (§18.9).* `sendBeacon` con un `Blob` de tipo `application/json` en Chrome y Safari de móvil (§14.11; el respaldo `text/plain` de 14-g lo cubre). Paso 7, §18.9.
- **3.2** *Abierta: 7a, desde Railway (§18.9); en PostgreSQL 16 sin red ya da 3,88 ms.* B14 con el perfil de mánager contra Postgres (en PGlite, de 8,6 a 9,3 ms de p95 contra 5): si no pasa, decide el dueño (DD-21). Paso 7, §18.9.
- **3.3** *Abierta: 5, en producción (riesgo 12).* Postgres de producción y TOAST (H-15): el CI usa `postgres:17-alpine` y PGlite es la 18.3 con `pglz`. §19.6.
- **3.4** *Abierta: 5 y 10b, a mano; la escritura de las 153 filas ya está medida, de 0,07 a 0,15 s (§18.3).* B15 con la escritura real de las 153 filas del día 179 (el prototipo no escribía; estimado de 0,2 a 0,5 s más). Pasos 5 y 10.
- **3.5** *Abierta: 4b (B21) y 6a (B22).* B21 y B22 contra una línea grabada de verdad (L1 midió sobre la radio: p99 de 52 a 508 m, y 0,69 km en la cabeza). Paso 6.
- **3.6** *Abierta: 10b.* El móvil, a mano, con el protocolo de §18.5. Paso 10.
- **3.7** *Cerrada en la fase 5: es DD-25 (§20.2), con el defecto de adelantar el 17d.* Que la táctica tenga o no subidas de versión pendientes antes de su 17d (§19, duda 2): `docs/balance.md` l. 13248-13251 da el 17c por hecho y `raceReport.ts` l. 148 dice que el 17d no ha llegado. DD-25.
- **3.8** *Abierta: 4b, en el banco (nueva en la fase 6, de la 1.4).* La crono más larga de 176 corredores del calendario con el grabador de verdad: `timeline.test.ts` la elige en `SEASON_CALENDAR` (hoy `race-italy` e10) y mide su `bytea` con gzip 9 contra los 49.152 B de `ttMaxStoredBytes` (§9.8, 16-n); el prototipo dio 32.203 B.
- **3.9** *Abierta: 6b, B19 (nueva en la fase 6).* El racimo en vivo de 12-s (todo corredor salvo la fuga, los maillots y los propios, §12.3) con la política de nombres real: sin nombres, 0 violaciones del prefijo (`l8/voz2.mjs`); con nombres, lo mide el segundo `it` de B19 antes de encender `BROADCAST.liveClusters` (DD-18, §16.4).

## 4. Fuera de E2 (cerradas la 4.1 y la 4.2; la 4.3 sigue fuera)

- **4.1** *Cerrada en la fase 6: fila nueva de §19.7, y lo corrige el PR 4a (§17.7).* El comentario de `SnapshotRider.tS` (`packages/engine/src/stage/types.ts` l. 453, «Reloj de SU grupo al cruzar el punto») está desfasado: el motor escribe el reloj del corredor, el del grupo más `markLossS` y `driftS` (`simulate.ts` l. 9012). No es de E2 corregirlo; puede ir a §19.7 como defecto de hoy encontrado (dudas de §1 y de la cabecera).
- **4.2** *Cerrada en la fase 5: DD-25 ya no impone una regla a la táctica, pregunta al dueño (§20.2).* La regla de DD-25 (toda subida de versión detrás del 17d de la táctica) tiene que llegar a `docs/tactica.md`, que esta fase no puede tocar (`00-encargo.md` §1: solo `docs/diseno/e2-retransmision/` y `docs/retransmision.md`).
- **4.3** *Fuera de E2, sin cambio; §18.5 lo pone quinto y último.* La página de etapa arrastra 85 KB comprimidos del motor por sus importaciones de `@cyclingstar/engine` (`RaceRadioPanel.tsx` l. 13, `domain/stageJournal.ts` l. 18): §18.5 lo pone el último en lo que se baja si el móvil no llega, y E6 puede quererlo antes.

## 5. Arregladas en el ensamblado

Incoherencias mecánicas (una cifra que dos secciones daban distinta con la medida en una de ellas, un nombre o una firma que no casaba, una remisión a un bloque o a una columna que no existe, una fecha del plan que §17 movió con su porqué, una referencia a `borrador/`), arregladas en los ficheros de sección de `borrador/` y, por tanto, en el ensamblado. Los números son los de los parches del ensamblador; «D-nn corregida» remite al registro de `00-decisiones.md`.

| Parche | Sección | Qué se arregló | Por qué (duda o nota que lo pidió, y la evidencia) |
| --- | --- | --- | --- |
| C-01 | §0 | referencia a `borrador/00-decisiones.md` sustituida por el directorio del diseño | regla de la fase 7 (ninguna referencia a `borrador/`) |
| C-02 | §0 | referencia a `borrador/dudas.md` sustituida | regla de la fase 7 |
| C-03 | §0 | §0.7 con los topes de D-11 corregidos | nota del orquestador (L3), duda 1 de §5, D-11 corregida |
| C-04 | §1 | nueve puertas pasan a diez | nota del orquestador (L7): `sup. X10` |
| C-05 | §1 | la décima puerta citada en el diagnóstico | nota del orquestador (L7) |
| C-06 | §1 | cifra de países con nacional antes del día 179 | duda de §7 y nota del orquestador (L5): 17 países, no 22 |
| C-07 a C-08 | §2 | nueve puertas pasan a diez | nota del orquestador (L7) |
| C-09 | §4 | comentario de `CastRider.knownWins` con la cuenta de 7-e | duda de §7 y de §15; nota del orquestador (L2) |
| C-10 | §4 | la última entrada de la traza, entera | decisión 9-a de §9 |
| C-11 | §4 | I1 con la tolerancia del `kind` | duda 5 de §5 y nota del orquestador (L3) |
| C-12 | §4 | umbral de I2 de 16-b | duda 4 de §3, dudas de §16, nota del orquestador (L1) |
| C-13 | §4 | I5 como igualdad | dudas de §16 (16-c) y decisión 9-a |
| C-14 | §4 | comentario de §4.9 con 6-i | duda de §6 |
| C-15 | §4 | los cuatro esquemas de E2 pasan a `contracts.ts` | duda de §14 (14-a) y nota del orquestador (L6) |
| C-16 | §4 | definición duplicada de `stageGateSchema` fuera de §4.11 (vive en §14.2) | decisión 14-a |
| C-17 | §4 | definición duplicada de `preStageInfoSchema` fuera de §4.11 | decisión 14-a |
| C-18 | §4 | definiciones duplicadas de `watchStateSchema` y `switchModeSchema` fuera de §4.11 | decisión 14-a |
| C-19 | §4 | dónde vive cada esquema | decisión 14-a |
| C-20 | §4 | el LRU pasa de 64 a 16 entradas | duda 3 de §5, decisión 18-d, nota del orquestador (L3, L7) |
| C-21 | §5 | el LRU pasa de 64 a 16 | decisión 18-d |
| C-22 | §5 | la cifra de memoria del LRU | decisión 18-d |
| C-23 | §5 | los topes de §5.7 con la corrección de D-11 | duda 1 de §5, nota del orquestador (L3), D-11 corregida |
| C-24 | §5 | tiempo verbal: la cifra vieja de D-11 | D-11 corregida |
| C-25 | §5 | la cifra medida del tick en §5.8 | duda de §18 y nota del orquestador (L7) |
| C-26 | §5 | la exportación de `realRaceScenario` | dudas del cierre de §16 (B10) y decisión 17-j |
| C-27 | §5 | B10 corre en 22 etapas, no en 24 | dudas de §16 |
| C-28 | §5 | I5 como igualdad en `selfCheckI5` | decisiones 9-a y 16-c |
| C-29 | §5 | la meta de la traza en el pseudocódigo del grabador | decisión 9-a |
| C-15b | §4 | import solo de los esquemas que usa `wire.ts` | decisión 14-a |
| C-30 | §6 | la etapa caducada abre en `Watch`, como fijan §10.2 y §14.1 | duda de §11 y nota del orquestador (L7): §6.10 contra 10-e |
| C-31 | §7 | la remisión a Dudas se cierra con el comentario ya corregido en §4.2 | decisión 7-e |
| C-32 | §8 | las dos medidas del prólogo | duda de §9 |
| C-33 | §8 | el digest de una gran vuelta, calculado | duda de §8 y de §15; nota del orquestador (L2, L4); D-39 corregida |
| C-34 | §8 | B17 del paso 0 sin el adaptador | duda de §17 (17-c) |
| C-35 | §9 | el tope de la crono y lo que mide cada cifra | duda de §9 y D-11 corregida |
| C-36 | §9 | remisión a un bloque que no está en el ensamblado | duda de §9 (el borde de la meta de la crono va a `dudas.md`) |
| C-37 | §9 | §9.4 nombra la curva de la crono de 8-m | duda de §8 y nota del orquestador (L4) |
| C-38 | §10 | nueve puertas pasan a diez | nota del orquestador (L7) |
| C-39 | §10 | las escrituras de `watch.ts` con Drizzle, como exige 13-a | duda 4 de §13 y nota del orquestador (L3) |
| C-40 | §10 | la ruta del plan del equipo es `safe` | duda de §11 y nota del orquestador (L7); comprobado en `packages/db/src/teamPlan.ts` |
| C-41 | §10 | la forma D en §10.6 | duda de §18 y nota del orquestador (L7) |
| C-42 | §10 | la cifra medida de la cuarta consulta | duda de §18 |
| C-43 | §10 | B14 con los dos perfiles y `recordProgress` aparte | dudas de §16 y §18 (16-k) |
| C-44 | §11 | el recuento de rutas de §11.3 explicado | duda de la cabecera y nota del orquestador (L6): 96 frente a 87 más 53 `HEAD` |
| C-45 | §11 | la descripción de B1a | duda de §16 (16-d) |
| C-46 | §11 | remisión cerrada | duda de §11 |
| C-47 | §11 | el defecto de `getBlockReport` tiene ya su sitio | duda de §11 y decisión 19-b |
| C-48 | §11 | el test de dos cuentas está en §16.3 | duda de §11 |
| C-49 | §11 | el test del modo diagnóstico está en §17.10 | duda de §11 |
| C-50 | §12 | una sola fuente para el equipo del día | duda del cierre de §12 y decisión 17-r |
| C-51 | §13 | la firma de `emitNews` es la de §12.8 | duda del cierre de §12 y nota del orquestador (L9) |
| C-52 | §13 | el payload se llama como en la firma de §12.8 | duda del cierre de §12 |
| C-53 | §13 | el LRU pasa a 16 | decisión 18-d |
| C-54 | §13 | la carga de escritura del progreso | duda de §8 y de §18; nota del orquestador (L4, L6); D-55 corregida |
| C-55 | §14 | §14.3 dice dónde entran `withGroupRoles` y `liveClusters` | dudas del cierre de §12 y de §17; nota del orquestador (L8, L9) |
| C-56 | §14 | la cifra de B19 | duda de §12 |
| C-57 | §14 | el LRU pasa a 16 | decisión 18-d |
| C-58 | §14 | la cabecera medida | nota del orquestador (L7) |
| C-59 | §14 | el tramo medido | nota del orquestador (L7) |
| C-60 | §14 | los topes de red de B6, con nombre | duda de §14 y de §16 (16-h); nota del orquestador (L6, L7) |
| C-61 | §14 | el título de la ficha de carrera en `shellMetaFor` | duda de §14 y decisión 11-c |
| C-62 | §15 | remisión cerrada | duda de §15 cerrada por 7-e |
| C-63 | §15 | los topes de `TIMELINE` sobre lo medido | duda 1 de §5, dudas de §16 y §17, nota del orquestador (L3, L9); D-11 corregida |
| C-64 | §15 | las dos medidas del prólogo | duda de §9 |
| C-65 | §15 | `ttSeekStepS` y `ttSeekLastStarters` en el bloque de §15.3 | propuesto por §9 (9-g) y nota del orquestador (L5) |
| C-66 | §15 | `closingCardS`, `previewThreatsMax`, `recapMaxCues` y `cardRowsMax` en §15.3 | propuesto por §6 y §8 (8-i) |
| C-67 | §15 | los topes de red de B6 en §15.3 | decisión 16-h; dudas de §14 y §16 |
| C-68 | §15 | el LRU en 16 | duda 3 de §5, decisión 18-d, nota del orquestador (L3, L7) |
| C-69 | §15 | el digest calculado | duda de §15 y de §8; D-39 corregida |
| C-70 | §15 | remisión cerrada | D-39 corregida |
| C-71 | §15 | B14 mide `recordProgress` aparte | decisión 16-k |
| C-72 | §15 | la tabla de aceptación con las constantes nuevas | decisión 18-d; constantes propuestas por §6, §8, §9 y §16 |
| C-73 | §15 | 17 países, no 22 | duda de §7 |
| C-74 | §16 | B1d nace en el 8a, cuando las rutas se declaran | duda de §17 (17-b) |
| C-75 | §16 | las rutas pendientes se cierran en el 8b | duda de §17 (17-n) y referencia a una columna que no existe en §11.3 |
| C-76 | §16 | `PENDING_ROUTES` vacía en el 8b | duda de §17 (17-n) |
| C-77 | §16 | la versión de banco de B2 entra en el 4b | duda de §17 (17-i) |
| C-78 | §16 | la cifra de la cabecera | la tabla de §18.1 (la medida) da 9,0 KB como máximo |
| C-79 | §16 | B6 con los topes corregidos | duda de §16, nota del orquestador (L3, L9); D-11 corregida |
| C-80 | §16 | dónde corre B13 | duda de §17 (17-t) |
| C-81 | §16 | dónde corre B16 | duda de §17 (17-l) |
| C-82 | §16 | B18 nace en el 7b | duda de §17 (17-m) |
| C-83 | §16 | B21 entra en el 4b | duda de §17 (17-i) |
| C-84 | §16 | B16 sale del tramo del motor | decisión 17-l |
| C-85 | §16 | B16 largo en el nocturno | decisión 17-l |
| C-86 | §16 | los 73 min son pruebas en serie | nota del orquestador (L9): la cifra de CI |
| C-87 | §16 | tabla final | decisión 17-b |
| C-88 a C-89 | §16 | tabla final | decisión 17-i |
| C-90 | §16 | tabla final | D-11 corregida |
| C-91 | §16 | tabla final | decisión 17-l |
| C-92 | §16 | tabla final | decisión 17-m |
| C-93 | §16 | tabla final | decisión 17-i |
| C-94 | §16 | la tabla final remite al plan | decisiones 17-b, 17-i, 17-l, 17-m, 17-n, 17-s y 17-t |
| C-95 | §17 | el riesgo del 4b con los topes fijados | D-11 corregida; dudas de §16 y §17 |
| C-96 | §17 | el LRU nace en 16 | decisión 18-d, D-10 corregida |
| C-97 | §17 | `decodedCacheEntries` nace en 16 en el PR 2 | decisión 18-d, D-10 corregida |
| C-98 | §16 | el tramo mayor en KB de 1.024 bytes, como la tabla de §18.1 | unidades: `l7/red.out` da 9.242 y 4.832 bytes, que son 9,0 y 4,72 KB de 1.024 bytes (la tabla de §18.1 y los topes de §15.3) o 9,2 y 4,83 de 1.000 |
| C-99 | §17 | las cifras de B6 en KB de 1.024 bytes | unidades: `l7/red.out` da 9.242 y 4.832 bytes, que son 9,0 y 4,72 KB de 1.024 bytes (la tabla de §18.1 y los topes de §15.3) o 9,2 y 4,83 de 1.000 |
| C-100 | §18 | B8 con los umbrales de 16-m | duda de §18 y dudas del cierre de §16 (16-m) |
| C-101 | §18 | el LRU en 16 desde que existe | decisión 18-d y D-10 corregida |
| C-102 | §18 | B14 sin `recordProgress` dentro | decisión 16-k |
| C-103 | §18 | remisión cerrada | decisión 16-k y DD-21 |
| C-104 | §18 | la medida del tick llevada a §5.8 | duda de §18 |
| C-105 | §18 | B15 con la regla de 16-l | duda de §18 y dudas del cierre de §16 (16-l) |
| C-106 | §18 | B14 mide `recordProgress` aparte | decisión 16-k |
| C-107 | §18 | la cabecera y el tramo en las unidades de los topes | unidades: `l7/red.out` da 9.242 y 4.832 bytes, que son 9,0 y 4,72 KB de 1.024 bytes (la tabla de §18.1 y los topes de §15.3) o 9,2 y 4,83 de 1.000 |
| C-108 | §18 | la medida llevada a §14.8 | duda de §18 |
| C-109 | §18 | la tabla de medidas pendientes | decisión 16-l |
| C-110 | §18 | la tabla de medidas pendientes | decisión 16-k |
| C-111 a C-112 | §18 | tabla de presupuestos | unidades: `l7/red.out` da 9.242 y 4.832 bytes, que son 9,0 y 4,72 KB de 1.024 bytes (la tabla de §18.1 y los topes de §15.3) o 9,2 y 4,83 de 1.000 |
| C-113 | §18 | tabla de presupuestos | D-11 corregida |
| C-114 a C-116 | §18 | tabla de presupuestos | decisión 16-m |
| C-117 a C-118 | §18 | tabla de presupuestos | decisión 16-l |
| C-119 | §19 | el riesgo 10 con los topes fijados | D-11 corregida; dudas de §16, §17 y §19 |
| C-120 | §19 | la lista de los riesgos que más cuestan | D-11 corregida |
| C-121 | §19 | la crono larga frente al tope nuevo | D-11 corregida y duda de §9 |
| C-122 | §20 | referencia a `borrador/` sustituida | regla de la fase 7 |
| C-123 a C-127 | §21 | referencia a `borrador/` sustituida | regla de la fase 7 |
| C-128 | §21 | el apéndice F ya no remite a bloques que el ensamblado quita | paso 2 del ensamblado: los bloques «Propuesto para el glosario» fundidos |
| C-129 | §21 | F.3 con los textos de las secciones fundidos | paso 2 del ensamblado |
| C-130 | §21 | fuera `PHOTO FINISH` | nota del orquestador (L4) y decisión 8-h |
| C-131 | §21 | el ejemplo de `Pulling:` marcado como pendiente | duda de §7 (7-a) |
| C-132 | §21 | F.3 con los textos de las secciones | paso 2 del ensamblado: textos de pantalla de §6 a §12 y §14 |
| C-133 | §21 | la firma de `clockMarksOf` en F.2 | nota del orquestador (L1): `marcasDe` pasa a `clockMarksOf` |
| C-134 | §12 | §12.10 dice que `radioFromTimeline` acepta una línea cortada | duda de §11 (11-i) |
| C-135 | §9 | §9.4 dice que los saltos de la crono no cruzan la meta | duda de §8 |
| C-136 | §0 | el tamaño del documento, contado sobre el v0 | medida del ensamblado (`ensamblar.sh`) |

Además, fuera de las secciones:

- `00-glosario.md`: fundidos los bloques «Propuesto para el glosario» de las veintidós secciones (§G.1, §G.2, §G.3.8, §G.4, §G.5, §G.6, §G.7, §G.9, §G.10, §G.11, §G.12, §G.13 y el registro de §G.14); §G.4 reescrita con las firmas finales (`timelineRecorder` 5-e, `selfCheckI1` 5-i, `readStageTimeline` y `timelineForStage` con `Horizon` 5-p y 14-p, `emitNews` de §12.8, `clockMarksOf`, `veilSql` 10-d, `registerSpoilerGuard` 14-c, `stageReadyEmail` 11-d, `titlesOn` 7-k, `chunkOf`, `cutTimeline` y `revealSOf` 4-b y 4-r); `checkClockDs` como campo propuesto; `ttSeekStepS` y las demás constantes nuevas; los topes de D-11; `decodedCacheEntries` en 16; I1, I2, I5, B1a, B1d, B6, B8, B10, B14, B15, B16 y B19 como quedaron en §16; `BROADCAST_WATCH=admins` con `isUserAdmin` (duda de §14); `healthSchema` en `index.ts` y la reexportación de `wire.ts` fuera de `contracts.ts` (14-a); `GuardReason`, `SpoilerScope`, `StageGate` y `PreStageInfo` en `wire.ts` (4-k, 4-l); los tipos de la red escritos a mano con `satisfies` (4-j); `PHOTO FINISH` fuera (8-h); `Watch the race in 40 minutes` (8-b).
- `00-decisiones.md`: D-10, D-11, D-25, D-26, D-39, D-49 y D-55 (las que pedían las notas), y además D-05, D-23, D-33, D-43 y D-50 corregidas; D-04, D-12, D-19, D-29, D-32, D-41, D-51, D-52 y D-54 precisadas; D-27 marcada pendiente (§1.5 de este fichero); §DD con `DD-21` a `DD-25` y DD-06, DD-11, DD-12 y DD-13 corregidas; cada una con la versión anterior en cita y el registro al principio.
- `juicios/veredicto.json`: los 49 injertos, las 32 objeciones y los 23 huecos, en estado `aplicado` con las secciones y subsecciones de los bloques de cierre que los citan (`aplicado_en`); ninguno `pendiente`.

## 6. Ya resueltas en otra sección, sin cambio

- Las decisiones 3-a, 3-b, 3-c, 3-e y 3-f de §3 (la velocidad del grupo de origen, el tránsito en dos grupos, el hueco del que va sin grupo, el hueco antes de la primera foto, la salida en `t = 0`) y la tendencia por la cadena de `successor` (dudas 2, 3, 6 y 7 de §3): §4 las adoptó (4-t), y §6.2 sigue la cadena.
- `apps/api/src/tick/stageRun.ts` (nota de L3, duda 8 de §5): ninguna sección cita esa ruta como la del fichero; las tres menciones (§5, §7 y §11) son para decir que no existe y que el fichero es `packages/db/src/stageRun.ts`.
- La cobertura en §21.4 y no en §21.3 (duda del cierre de §12): la única remisión a «§21.3» como cobertura estaba en ese bloque de dudas; el apéndice D (§21.4) ya apunta a §12.2, §12.7, §12.10 y §12.5.
- El «0-36 retrocesos» de C4 (dudas 1 de §1 y 5 de §3): §19.1 ya cita de 0 a 6 saltos de grupo de más de 60 s por etapa (§3.6), y D-01 no usa el 0-36.
- DD-08 y sus pistas (`RES` y `LEARNING.dnfFactor`, duda de §11): la fila de §20.2 ya las nombra.
- `getBlockReport` (dudas de §11 y §19): es DD-24 y 19-b; §11.13 remite ya a él (parche C-47).
- Lo que §16 pedía a §17 (el script de fixtures en el 2 y el 4b, `CS_BANCOS=1` en el 4b, las exportaciones de `packages/db` en el 7a, `--sizes` en el 5, `realRaceScenario` en el 4b) y lo que §8 pedía (las pruebas de §8.12 en el 3a, el 3b y el 10): §17 ya lo lleva.
- Las bandas de B17 (duda de §8): §16.4 usa las de 8-k.
- La frase de la voz para `puncture` y `mechanical` en crono sin segundos (duda 3 de §9): las frases de §12.5 no dan segundos.
- La lista de seguimiento del tick sin el filtro de ceros (duda de §7): §17.14 dice que es justo lo que B16 compara con el conjunto vacío.
- B11 y `onEvent` en las cronos (dudas del cierre de §16): §16.4 ya exige lo contrario y lo dice.
- B12 en dos ficheros y tres PR (dudas del cierre de §16): 17-s sigue a §16.9.
- DD-13 y la tabla por equipos del cierre (duda de §8): 20-c ya la dejó en `Report`.
- Los dos tests que §11 proponía a §16 (B1b con dos cuentas y el modo diagnóstico): están en §16.3 y en §17.10 (parches C-48 y C-49).
- `SPOILER_MODE` dentro o fuera de `computeHorizon` (duda 2 de §10): el esqueleto lo pedía dentro y §10.13 lo pone alrededor, en `request.horizon()` (§14.5); es una desviación del esqueleto, no una incoherencia del documento.
- La memoria de la oferta adaptativa entre dispositivos (duda 3 de §10): es la variante de DD-16 que §20.2 ya ofrece al dueño.
- `knownWins` y §10.10 (duda 4 de §10): 7-e cambió la cuenta y §10.10 no la degrada, así que §10 no cambia.
