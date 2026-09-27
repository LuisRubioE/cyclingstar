## 18. Rendimiento y móvil

Esta sección dice cuánto cuesta la retransmisión en el navegador, en la API, en el tick y en la base, qué parte de cada cifra está medida y cuál estimada, qué banco la vigila y en qué paso, y cómo se mide a mano lo que el repositorio no puede medir: el móvil. Escribe como hechos D-55, D-56 y D-57. Las líneas de código son las de HEAD `9c21885`, comprobadas en `dc6cf4b` (que solo añade `docs/`). Todo lo medido de nuevo está en la carpeta `l7/` del scratchpad, sin tocar el repositorio, en una máquina de 4 núcleos Intel Xeon a 2,1 GHz compartida, con Node 22.22.2:

- `l7/red.mjs`: lo que pesa por la red y lo que cuesta leerlo. Sobre las líneas del prototipo del grabador de L3 (`StoredTimelineV1`, §4.3; `l3/grabador.mjs`, motor v89 con los tres ganchos), arma la cabecera (`BroadcastHead`, con un reparto de 176 corredores de nombres de largo realista) y los tramos de 900 s de carrera (`chunkOf`, §4.6) con su voz (`buildChronicle` de hoy cortada por `revealS`, porque el modo `live` aún no existe), y mide JSON, gzip 6 (el nivel por defecto de zlib, el de `@fastify/compress`), brotli 4 (el suyo), `JSON.parse` y el `parse` de Zod 4.4.3 con los esquemas de §4.11 copiados.
- `l7/instante.mjs` y `l7/memoria.mjs`: el coste de un fotograma y la memoria del reproductor. `instante.mjs` implementa una APROXIMACIÓN del corte diagonal de §4.5, no su código: vale para el orden de magnitud.
- `l7/horizonte.mjs` y `l7/horizonte2.mjs`: las lecturas con horizonte en PGlite 0.5.4 (Postgres en WASM) con las 47 migraciones (las cuatro de E2, generadas por L3 con drizzle-kit en `l3/dbcopy2/drizzle`) y un mundo sintético de un año real: 15.600 corredores, 249.274 filas de `race_rosters` (la cota de B14), 1.000 jugadores con 60.254 filas de `race_watch`, puntos, palmarés, transacciones, premios de equipo y noticias.
- `l7/tick.mjs`: el tick de los días pico con la cadena entera de E2 (sonda en cada bloque, grabador, cierre, gzip 9 e I1) del prototipo de L3, dos corridas.
- `l7/webdist/`: la web de HEAD compilada con Vite 8, para pesar lo que baja la primera visita a una etapa.

Lo que no se puede medir aquí (un móvil de verdad, una red de verdad, Postgres de producción) va marcado como estimado, con la cuenta, y su medida pendiente está en §18.9 con el hueco para la cifra y la fecha.

### 18.1 El cliente

Lo que la web baja y lee de una etapa, por etapa del banco (`l7/red.mjs`; tiempos en Node, no en un móvil):

| Etapa | Cabecera: JSON · gzip · brotli | Tramos | Un tramo con gzip (mediana) · JSON mayor | Todos los tramos: JSON · gzip | Parse + Zod de la cabecera | Parse + Zod del tramo mayor | Parse + Zod de todos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `race-france` e7, llana, 175 km | 53,2 · 8,4 · 7,8 KB | 16 | 0,64-1,96 (1,12) · 7,1 KB | 73,6 · 19,5 KB | 0,16 + 0,55 ms | 0,03 + 0,42 ms | 0,30 + 2,44 ms |
| `race-france` e13, media, 206 km | 53,3 · 8,7 · 7,8 KB | 20 | 0,55-4,32 (1,77) · 16,2 KB | 145,6 · 38,9 KB | 0,16 + 0,18 ms | 0,06 + 0,40 ms | 0,50 + 2,93 ms |
| `race-france` e18, reina, 185 km | 53,9 · 8,9 · 7,9 KB | 20 | 0,76-4,37 (2,88) · 20,1 KB | 178,2 · 46,5 KB | 0,16 + 0,21 ms | 0,06 + 0,36 ms | 0,64 + 3,91 ms |
| `race-france` e20, reina, 171 km | 53,7 · 8,8 · 7,9 KB | 22 | 2,14-4,64 (3,38) · 19,7 KB | 292,7 · 72,7 KB | 0,16 + 0,18 ms | 0,07 + 0,47 ms | 1,08 + 6,49 ms |
| `race-flanders`, clásica, 278 km | 54,1 · 9,0 · 7,9 KB | 27 | 0,42-4,72 (1,85) · 18,8 KB | 199,3 · 53,8 KB | 0,16 + 0,19 ms | 0,06 + 0,36 ms | 0,70 + 4,20 ms |
| `race-colombia` e5, reina, 232 km, 126 corredores | 40,2 · 7,1 · 6,0 KB | 32 | 0,23-4,28 (2,27) · 18,9 KB | 269,6 · 71,0 KB | 0,12 + 0,16 ms | 0,06 + 0,29 ms | 0,99 + 6,47 ms |
| `race-france` e1, crono, 20 km | 49,8 · 7,6 · 7,3 KB | 14 | 0,26-2,12 (1,76) · 5,8 KB | 52,5 · 21,9 KB | 0,14 + 0,13 ms | 0,02 + 0,09 ms | 0,17 + 0,97 ms |
| `race-france` e16, crono, 26 km | 52,0 · 8,0 · 7,6 KB | 15 | 0,30-2,53 (2,22) · 7,6 KB | 67,0 · 27,9 KB | 0,15 + 0,19 ms | 0,02 + 0,10 ms | 0,21 + 1,19 ms |

La etapa entera, cabecera y tramos, son de 27,9 a 81,5 KB con gzip. Hoy la ruta de etapa manda de 871 a 2.949 KB sin comprimir (de 22 a 100 KB con gzip, pero la API no comprime nada) y parsearla y validarla cuesta de 2,8 a 9,3 ms más de 4,1 a 24,9 ms, de una vez (mapa 07 §7): la retransmisión baja la etapa más pesada en tramos de menos de 5 KB, y el trabajo de hilo principal de cada uno es de medio milisegundo. El mapa 07 §7 estimaba que un móvil medio es de tres a cinco veces más lento que este núcleo: el tramo mayor le costaría de 1,6 a 2,7 ms, y la etapa entera de hoy, de 100 a 170 ms de golpe.

El fotograma (`l7/instante.mjs`, la aproximación del corte diagonal recorriendo cada etapa a pasos de 1 s de carrera):

| Etapa | Fotogramas | `instantAt`: media · p50 · p99 · máximo | Grupos, máximo | En tránsito, máximo | Línea decodificada (sin reparto) | Cabecera y tramos parseados |
| --- | --- | --- | --- | --- | --- | --- |
| `race-france` e7 | 14.271 | 0,009 · 0,004 · 0,046 · 1,52 ms | 6 | 5 | 0,38 MB | 0,23 MB |
| `race-france` e13 | 17.550 | 0,009 · 0,006 · 0,036 · 4,60 ms | 11 | 90 | 0,64 MB | 0,39 MB |
| `race-france` e18 | 17.979 | 0,010 · 0,008 · 0,040 · 1,21 ms | 14 | 81 | 0,89 MB | 0,47 MB |
| `race-france` e20 | 19.450 | 0,017 · 0,015 · 0,054 · 2,54 ms | 20 | 85 | 1,53 MB | 0,77 MB |
| `race-flanders` | 23.976 | 0,010 · 0,009 · 0,038 · 2,72 ms | 10 | 183 | 0,62 MB | 0,51 MB |
| `race-colombia` e5 | 27.935 | 0,016 · 0,014 · 0,056 · 3,14 ms | 23 | 29 | 1,67 MB | 0,69 MB |

Los máximos de uno a cinco milisegundos son la compilación y la recolección de basura de Node, no el corte. Las cuentas de corredores en tránsito de esta aproximación no son las de I2 (§4.4) y no se usan para nada: solo el tiempo y la memoria. El reproductor calcula un instante por fotograma de pantalla (60 por segundo) y repinta la capa fija `BROADCAST.overlayHz` (10) veces por segundo y la barra de grupos `BROADCAST.barHz` (4): el corte le cuesta de 0,2 a 0,9 ms por segundo en Node, y de 0,7 a 4,5 ms en un móvil tres a cinco veces más lento (estimado). Lo que no se ha medido es el repintado de React de la capa y de la barra, que solo se mide en un navegador (§18.5).

**B8 y sus umbrales.** Los umbrales de B8 son los de §16.4 (decisión 16-m, tomada con lo que se mide aquí): la mediana del `JSON.parse` más el `safeParse`, ≤ 2 ms el tramo mayor y ≤ 3 ms la cabecera, y el p95 de `instantAt` en 600 fotogramas seguidos, ≤ 0,25 ms, en Node. Lo medido aquí queda de cuatro a cinco veces por debajo (0,54 ms el tramo mayor, 0,71 ms la cabecera, p99 de 0,056 ms el fotograma, con una aproximación del corte): B8 caza una regresión de cinco veces y deja margen para el ruido del CI; si el `instantAt` de verdad del 6a pasa de 0,05 ms de p95, el umbral es cinco veces lo medido (16-m). Los primeros umbrales, 10 ms y 2 ms, quedaban de 14 a 36 veces por encima y solo habrían cazado una regresión de un orden de magnitud.

**La memoria del reproductor.** Una etapa vista entera deja en la web los tramos parseados (de 0,17 a 0,77 MB, en la caché de React Query con `staleTime` infinito, §14.11) y la línea decodificada (de 0,38 a 1,67 MB). El digest de una gran vuelta encadena hasta diecisiete etapas (§11.4): sin soltar nada serían de 17 a 23 MB de montón con las etapas del Tour de §11.4 (estimado con las cifras de la tabla), demasiado para un teléfono. Así que el digest guarda como mucho dos etapas, la que se reproduce y la siguiente, y al empezar una suelta los tramos de la anterior (`queryClient.removeQueries` con la clave de sus tramos) y su línea (decisión 18-e): de 1 a 5 MB en todo momento.

### 18.2 El servidor

**Servir un tramo.** Con la línea ya decodificada en la LRU, cortar un tramo, pasarlo a JSON y comprimirlo con gzip 6 cuesta de 0,23 a 1,00 ms (`l7/red.mjs`, «servir tramo»); `datos.md` §10.5 midió de 1,3 a 4,7 ms con la decodificación dentro, que es lo que paga el primer espectador de cada etapa. `@fastify/compress` entra en el paso 0, registrado antes de `@fastify/static` y con brotli 4 y gzip 6 (§14.8): con brotli, la etapa entera (cabecera y tramos) pesa de un 3 a un 6 % menos que con gzip.

**La LRU de líneas decodificadas** (decisión 18-d). §15 fija `BROADCAST.decodedCacheEntries` en 64 «unos 20 MB» (estimado por `datos.md` §12). L3 midió cada línea decodificada en la forma de §4.2 entre 0,5 y 1,9 MB (`l3/lru.mjs`), de 33 a 121 MB las 64, y aquí sale de 0,38 a 1,67 MB sin el reparto. `decodedCacheEntries` es 16 (decisión 18-d; §15.3): de 8 a 30 MB. Dieciséis etapas a la vez son más de las que un día de juego ofrece para ver (las del día de cabecera y las de los corredores propios), y el adaptador de la radio (§3.8) tiene la suya, del mismo tamaño.

**`computeHorizon` y B14** (D-33). B14 exige un p95 de `computeHorizon` de `SPOILER.horizonBudgetMs` (5 ms) con 250.000 filas de `race_rosters`; `recordProgress` se mide aparte con el mismo umbral (decisión 16-k). Medido en PGlite, con dos perfiles: un jugador con su corredor (43 carreras en guardia, velo de 28 etapas) y un mánager que además posee un equipo de 30 (273 carreras en guardia, velo de 60 etapas), y una población de 200 jugadores distintos:

| Forma de las consultas | Jugador: p50 · p95 | Mánager: p50 · p95 | 200 jugadores: p50 · p95 |
| --- | --- | --- | --- |
| las cuatro de §10.6, tal cual | 26,9 · 39,2 ms | 46,1 · 61,7 ms | 26,9 · 40,8 ms |
| B: los ids de la plantilla en la consulta 1 y `rider_id = any($ids)` en la 2 | 3,0-3,3 · 5,1-5,6 ms | 7,6-8,0 · 12,5-13,9 ms | 3,3-3,6 · 6,0-7,2 ms |
| D: B, y la cuarta consulta una vez por día de juego para todas las carreras | 1,9-2,1 · 3,1-3,7 ms | 4,4-4,6 · 8,6-9,3 ms | 2,3-2,6 · 4,5-5,5 ms |

(Los rangos son de las corridas de `l7/horizonte.mjs` y `l7/horizonte2.mjs`, dos o tres por forma.) La consulta 2 tal como la escribe §10.6, `rider_id = $1 or rider_id in (select id from riders where team_id = $2)` con los dos `like` de temporada, recorre `race_rosters` entera aunque exista `race_rosters_rider_idx`: el plan es un `Seq Scan` con 55.157 filas estimadas, de 23 a 40 ms. Con los ids por delante y `= any`, el plan usa el índice (`Bitmap Index Scan on race_rosters_rider_idx`) y cuesta de 0,75 a 2,1 ms. Sin el índice, la misma consulta vuelve a 23 ms: la `0045` es necesaria y no basta. La cuarta, la última etapa corrida de cada carrera en guardia, cuesta 2,1 ms con 273 carreras, y es la misma para todos los espectadores: hacerla una vez por día de juego para las 1.630 carreras de las dos temporadas cuesta 6,5 ms (p50) y deja un mapa en el proceso. Es exacto porque el tick corre las carreras del día y sube `currentDay` en la misma transacción (`packages/db/src/tick.ts` l. 262-284): quien lee `currentDay = D` ve todas las etapas de hasta el día D y ninguna más, así que el mapa se rehace cuando cambia `(worldId, currentDay)` y no se queda viejo nunca. En los dos perfiles, la forma B da el mismo número de carreras en guardia y de etapas veladas que las consultas de §10.6, y la D, el mismo velo que la B, etapa a etapa (comprobado en cada corrida).

`computeHorizon` usa la forma D (decisión 18-a). Con ella el jugador pasa B14, la población queda en el borde y el mánager no pasa: su p95 es de 8,6 a 9,3 ms, porque tiene seis veces más carreras en guardia. El umbral es de D-33 y no se toca: §16.4 mide los dos perfiles por separado, con el jugador como puerta en la suite rápida y el mánager como puerta contra Postgres en el paso 7; si el mánager no pasa ahí, decide el dueño (16-k, DD-21). Dos matices que la cifra no dice. PGlite es Postgres compilado a WASM en un solo hilo, y el juez del motor midió con él (C12): las cifras de producción deberían ser menores (estimado; B14 se repite una vez contra Postgres en el paso 7). Y el memo de `SPOILER.horizonMemoS` (60 s) por `(userId, currentDay, horizonRev)` hace que la segunda petición del mismo espectador en el mismo minuto cueste solo la consulta 1 (0,58 ms, p50): el coste de la tabla lo paga una petición por espectador y minuto, no cada una.

**`veilDelta`**, el que usan R y M (medido con el velo del mánager, 60 etapas):

| Campo | Filas | p50 · p95 |
| --- | --- | --- |
| `points` | 450 | 4,0 · 9,9 ms |
| `money` | 135 | 1,8 · 3,7 ms |
| `budget` | 200 | 2,8 · 4,5 ms |
| `palmares` | 60 | 1,3 · 2,4 ms |
| `health` | 45 | 1,5 · 2,6 ms |
| `abandons` | 19 | 1,5 · 2,2 ms |
| `raceDays`, todos los corredores de las listas de salida | 602 | 31,9 · 48,2 ms |
| `raceDays`, solo los corredores del espectador (31) | 31 | 1,5 · 1,9 ms |

`raceDays` solo lo usan el parte y el informe del corredor propio (sups. H4 y X1, §11.13), así que se calcula solo para el corredor del espectador y los de su equipo (decisión 18-b): la suma de las medianas baja de 44,7 a 14,3 ms. Y `veilDelta` se memoriza con la misma clave y la misma vida que el horizonte (decisión 18-c): sale del velo, que solo cambia con `horizon_rev`, y de filas que solo escribe el tick, que solo cambian con `currentDay`. Sin el memo, cada petición a una ruta con R o M pagaría esos 14 ms.

**Los agregados** (§11.5). El ranking mundial entero, 15.600 corredores con sus puntos de 365 días, cuesta 70 ms (p50; 104 el máximo) y se calcula una vez por día de juego y proceso; la resta y el reordenado de un espectador, 1,0 ms (p50). Las 40 últimas noticias con el filtro F cuestan 1,6 ms (p50), contra 0,5 ms sin él.

### 18.3 El tick

El tick corre un día de juego por transacción, cada seis horas reales (`railway.tick.json`, `cronSchedule` `0 */6 * * *`; `TICK_INTERVAL_MINUTES` 360, `apps/api/src/env.ts` l. 32), y E2 le añade la sonda en cada bloque, el grabador, el cierre, el gzip 9 y la autocomprobación I1 de cada etapa (§5). En una etapa grande eso es del orden de 100 ms sobre unos 2,4 s de simular, un 4 % (L3, §5.8). Los días que importan son los dos picos del calendario (C15; X-24): el 176, con 187 cronos nacionales, y el 179, con 153 nacionales en línea, todos de 40 corredores. Medido (`l7/tick.mjs`: 30 nacionales distintos de cada clase, simular con el motor compilado del repositorio sin sonda, y la cadena entera de E2 con el prototipo de L3; dos corridas):

| Día | Por nacional, hoy | Por nacional, con E2 | De más, mediana | El día entero, hoy | El día entero, con E2 |
| --- | --- | --- | --- | --- | --- |
| 179: 153 nacionales en línea | 678-712 ms | 780-836 ms | 94-112 ms | 103,8-109,0 s | 119,3-127,9 s (+15,5 a +18,9 s, +15 a +17 %) |
| 176: 187 cronos nacionales | 12-13 ms | 16-17 ms | 4 ms | 2,2-2,4 s | 3,1 s (+0,7 a +0,8 s) |

El desglose de un nacional en línea, de media: la sonda en cada bloque con los tres ganchos y sin grabador, un 3,1-3,2 % sobre simular sin ella (700-734 ms contra 678-712); dentro de la simulación, el trabajo del grabador en cada foto, de 18 a 20 ms; el cierre, 16 ms; el gzip 9, 4 ms; I1, de 9 a 12 ms; y lo guardado, 21,9 KB en `bytea`. En una crono nacional la sonda casi no cuesta (de 0,3 a 2 %) y no hay grabador de grupos: solo la traza.

Tres lecturas de la tabla. La primera cierra X-08: la sonda sola cuesta un 3 %, dentro de lo que midió el juez del motor en etapas grandes (de −7,7 a +11,6 %, mediana +3,8 %, C6). La segunda cierra X-24 con medida en lugar de estimación: el juez estimaba de 2 a 8 s por día pico y §5.8, de 6 a 10 s el 179 y menos de un segundo el 176; medido, el 176 suma menos de un segundo y el 179 suma de 15,5 a 19 s, casi el doble de lo que estimaba §5.8, porque en un nacional de 40 corredores el grabador, el cierre e I1 pesan más en proporción que en una etapa de 176 (§5.8 cita ya esta medida). La tercera pone la cifra en su sitio: el tick del día 179 pasa de unos 106 s a unos 124 s de simular, en una transacción que tiene seis horas para acabar, y el criterio de `MVP.md` l. 19 («p95 de duración del tick por debajo de 60 segundos») mira el p95 de los ticks, que en 30 días son 120: los dos picos de una temporada de 364 días de juego no llegan a moverlo, y el día normal gana el 4 % de §5.8. Lo que sí pesa es lo que no se ha medido aquí: la escritura de 153 filas de `stage_timelines` de unos 22 KB en la misma transacción (unos 3,3 MB; estimado de 0,2 a 0,5 s en Postgres) y que el prototipo es JavaScript sin optimizar.

**B15 y su umbral.** B15 es de §16.4 (decisión 16-l): los días 176 y 179 con `TIMELINE_RECORD=off` y `on`, a mano en los pasos 5 y 10; falla si la grabación suma en un mismo día, a la vez, más de un 25 % y más de 15 s, o si deja alguna lápida. Con el prototipo pasan los dos días: el 179 suma de 15,5 a 18,9 s, pero solo de un 15 a un 17 %; el 176 pasa del 25 %, pero con 0,8 s como mucho. Exigir las dos cotas por separado suspendía cada día por la que no le toca, y los segundos dependen de la máquina: en esta, que simula el 179 en unos 106 s, 15 s son un 14 %. Si B15 falla, `TIMELINE_RECORD=off` apaga la grabación sin desplegar (D-12): el tick vuelve a su coste de hoy, las etapas nuevas se ven por el adaptador de la radio (§3.8, `Recorded before full race data`, pantalla), y lo primero que se optimiza es el grabador de nacionales, antes de volver a encender.

### 18.4 La escritura del progreso

D-55, escrito como hecho: el cliente informa de lo alcanzado cada `BROADCAST.progressEveryRealS` (15 s de pared), al pausar, al ocultarse y al salir; el servidor escribe `race_watch` solo si lo alcanzado creció al menos `BROADCAST.progressMinDeltaS` (60 s de carrera) o cambia el estado, con el último valor por `(userId, raceKey)` en la memoria del proceso, y pedir un tramo no escribe nada. D-55 lo estimaba en una escritura por minuto real y espectador; con la curva de §8.2 un informe de 15 s hace crecer lo alcanzado en 60 s o más en casi toda la etapa, y §10.3 (decisión 10-l) lo fija en como mucho una escritura cada 15 s de pared por usuario y carrera: cuatro por minuto mientras se mira, y una cada 45 s en el último km. La carga que eso pone en la base:

| Qué | Cifra | Procedencia |
| --- | --- | --- |
| `recordProgress`: `insert … on conflict`, `select … for update`, `update` y `horizon_rev` | 1,66 ms (p50) · 3,05 ms (p95) · 8,9 ms (máximo) | medido, `l7/horizonte.mjs`, PGlite |
| escrituras por espectador mirando | 4 por minuto | §10.3, derivado de `BROADCAST.pace` |
| 100 espectadores mirando a la vez | 400 por minuto, 6,7 por segundo: unos 11 ms de base por segundo, el 1,1 % de un núcleo | estimado con el p50 de arriba |
| 1.000 espectadores mirando a la vez | 67 por segundo: unos 110 ms por segundo, el 11 % de un núcleo | estimado ídem |
| la memoria del proceso | una entrada por `(userId, raceKey)`, del orden de 100 B: 100 KB por 1.000 espectadores | estimado |
| filas nuevas | ninguna por mirar: la clave de `race_watch` no cambia y el `update` no toca índices (HOT, §13) | §13 |

Ningún número de esta tabla tiene evidencia de los jueces (H-18): los umbrales son de D-55 y de 10-l, y B14 (§16.4, decisión 16-k) mide `computeHorizon` y `recordProgress` por separado, en el paso 7: medido aquí, `recordProgress` tiene un p95 de 3,05 ms. Si en producción pesara, se sube `progressMinDeltaS` (§15.6) y la escritura se espacia sin que el espectador lo note, porque el límite de los tramos usa la memoria del proceso y no lo escrito (§10.11). Con más de una instancia de la API la memoria no se comparte y lo escrito puede ir hasta 15 s de pared por detrás: un tramo pedido a otra instancia daría 409 y la web informaría y reintentaría (§10.3). El servicio `web` corre hoy una sola instancia (`railway.json`); el día que sean más, la memoria pasa a la base (decisión 18-i): cada informe escribe `race_watch.reached_s` con la guarda de 15 s de pared de 10-l y sin la de 60 s de carrera, y el límite de los tramos lee la fila. Son las mismas cuatro escrituras por minuto en casi toda la etapa, y también cuatro en el último km, donde hoy la guarda de 60 s deja una cada 45 s; no hace falta ninguna columna nueva.

### 18.5 El móvil, medido a mano

D-56, escrito como hecho: el repositorio no tiene herramienta de navegador. Comprobado de nuevo: ninguno de los seis `package.json` del repositorio (la raíz, `apps/api`, `apps/web`, `packages/db`, `packages/engine` y `packages/shared`) nombra Playwright, Puppeteer, Cypress ni WebDriver, y la web se prueba sin DOM (los tests de `apps/web/src/domain/` son lógica pura). Así que en el paso 10 se mide a mano, con las herramientas de Chrome, y el resultado se escribe en §18.9 con fecha antes de encender `BROADCAST_WATCH`.

**El protocolo** (decisión 18-g):

1. Chrome de escritorio con el modo de dispositivo a 360 × 800 px y relación de píxeles 3, `CPU: 4x slowdown` y la red en `Fast 4G`, la caché vaciada y la sesión iniciada con un jugador que tiene la etapa sin ver.
2. Tres etapas, las del banco de mayor peso y más grupos: `race-colombia` e5 (32 tramos y hasta 23 grupos), `race-france` e18 (la reina de la tabla de 18.1) y una crono (`race-france` e16).
3. Por etapa, tres grabaciones de `Performance` de 60 s cada una: `Watch` (pantalla) a ×1 en la zona de ×60 de `BROADCAST.pace` (más de 50 km a meta), `Watch` a ×4 con el pelotón partido, y `Highlights` (pantalla) en los últimos 20 km.
4. De cada grabación se apunta: los fotogramas por segundo de la capa fija y de la barra (el panel `Frames` y el contador de repintados), la tarea más larga del hilo principal y cuántas pasan de 50 ms, y el montón de JavaScript al acabar.
5. Aparte, la primera pintura de `Watch`: desde la navegación a `/world/races/:raceId/stages/:day` con la caché vacía hasta el primer cuadro de la previa pintado (§8.6), en el panel `Performance` con la pestaña recién abierta.

**Los umbrales** (D-56; sin evidencia de los jueces): la capa fija y la barra repintan a 30 fps o más; ninguna tarea del hilo principal pasa de 50 ms durante la reproducción; la primera pintura de `Watch` llega en 2 s o menos con `Fast 4G`.

**Lo que se puede estimar ya.** La primera visita a una etapa baja la web entera, y eso sí se ha pesado (`l7/webdist/`, compilada de HEAD): el punto de entrada y sus siete precargas (`index.html`) suman 416 KB de JavaScript, 132 KB con gzip 6; la página de etapa añade 373 KB, 108 KB con gzip, de los que 308 KB (85 KB con gzip) son código del motor (`dist-*.js`: constantes y datos del generador de recorridos) que la web arrastra porque importa `@cyclingstar/engine` en cuatro sitios, dos de ellos en la página de etapa (`RaceRadioPanel.tsx` l. 13, `isTheBunch`, y `domain/stageJournal.ts` l. 18, `STAGE`) y los otros en `domain/condition.ts` l. 16 y `pages/RiderProfile.tsx` l. 10; y la hoja de estilos pesa 464 KB, 94 KB con gzip. En total, 334 KB comprimidos antes de la primera petición a la API. Con el perfil `Fast 4G` de Chrome (unos 8 Mbit/s de bajada y 165 ms de latencia, según el código de sus herramientas; no comprobado aquí), bajarlos son unos 0,35 s de transferencia más de cinco a siete viajes de ida y vuelta entre conexión, documento, módulos, página y API: de 1,2 a 1,5 s de red (estimado). Lo que falta, compilar y ejecutar 800 KB de JavaScript con la CPU a un cuarto, solo se mide en el navegador. La cuenta dice que los 2 s están al alcance y sin mucho margen.

**Si no se cumple**, se baja en este orden, midiendo tras cada paso: primero `BROADCAST.barHz` de 4 a 2; después el perfil sin animar, con los cursores saltando de km en km como con `prefers-reduced-motion`; después `BROADCAST.mobileGroupRows` de 4 a 3; y, para la primera pintura, la página de etapa deja de importar `@cyclingstar/engine` (`isTheBunch` y lo demás pasan a `packages/shared` o se importan por su módulo), que quita hasta 85 KB comprimidos. Nada de esto toca el motor ni el formato; todo es una constante de `shared` o un cambio de la web (§15.6).

**Las anchuras** (mapa 03 §7, estimadas sobre las clases de Tailwind, no medidas). En 360 px quedan unos 336 útiles (`px-3`, `App.tsx` l. 125). El carril de pestañas no salta de línea (`Tabs.tsx` l. 22-23 y 32-33): hoy cinco pestañas de `px-3 text-sm` suman unos 430 px, y las seis de §6.10 (`Report`, `Result`, `Classifications`, `Race Radio`, `Profile`, `Watch`) unos 510, así que en el teléfono siempre queda alguna fuera. Por eso importa que la pestaña por defecto sea la que se ve sin desplazar: `Watch` para quien no conoce la etapa y `Report` para quien la conoce, las dos primeras del carril. La altimetría escala al ancho (unos 296 × 82 px en una tarjeta), y el perfil de `Watch` ocupa 56 px de alto a todo el ancho (§6).

### 18.6 `BottomNav` escondido mientras se reproduce

`BottomNav` es la barra inferior fija de la web en el teléfono: 56 px de alto por destino (`h-14`) más el margen de la muesca, visible por debajo de 640 px (`sm:hidden`; `apps/web/src/components/BottomNav.tsx` l. 22-70), con su hueco reservado en el contenedor de la app (`pb-[calc(3.5rem+env(safe-area-inset-bottom))]`, `App.tsx` l. 122) y pintada fuera de las páginas (l. 323). En `Watch` (pantalla) esos 56 px, de 90 a 100 con la muesca, son del 7 al 12 % de una pantalla de 800 que ya reparten la capa fija, la barra de grupos, el perfil y los mandos (§6). E2 propone a E6, que es quien mantiene la navegación, esconderla mientras se reproduce (I-26, D-56), y deja escrito cómo (decisión 18-f):

```ts
// apps/web/src/components/BottomNav.tsx (propuesta a E6; se aplica en el PR 10a si E6 la acepta)
/** Esconde la barra inferior, y el hueco que le reserva App.tsx, mientras `hidden` sea verdad. Al desmontar, la devuelve. */
export function useHideBottomNav(hidden: boolean): void
```

La página de etapa la llama con la fase del reproductor (`PlayerPhase`, §8.11): escondida en `playing`, `waiting`, `seeking`, `recap` y `arrival`, que son las fases en las que la carrera corre o está a punto de enseñar algo; visible en `preview`, `paused` y `closing`, que son las de antes, las de parar y las de acabar, cuando el espectador puede querer irse. Pausar con un toque en el plano la devuelve, así que salir de `Watch` nunca cuesta más de un toque. En escritorio y tableta no cambia nada, porque la barra no existe por encima de 640 px.

### 18.7 La red

D-57, escrito como hecho en sus dos primeras partes. **Un tramo que falla** (red caída, 5xx) pausa la reproducción con `Connection lost · Retry` (pantalla; §8.5 y §10.12), y lo alcanzado es lo PINTADO, nunca lo descargado: un fallo a mitad no da por vista ninguna etapa, y `Retry` repite la petición. **Con dos dispositivos** gana el máximo: la segunda pestaña rehace el horizonte al volver al primer plano (`rev`, §10.9) y, si la etapa ya es conocida en el otro, dice `You finished this stage on another device · Watch anyway · Show report` (pantalla).

**Los topes de B6.** §16.4 los fija con los valores que propone §14.8, comprimidos con gzip 6: `BROADCAST.maxHeadGzipBytes` (16 KB), `maxChunkGzipBytes` (12 KB), `maxFinishGzipBytes` (40 KB) y `maxVeiledStageGzipBytes` (4 KB, la ruta de etapa sin los opcionales). Lo medido aquí cabe con holgura: la cabecera, de 7,1 a 9,0 KB, y el tramo mayor, 4,72 KB (KB de 1.024 bytes, como los topes). La etapa entera por tramos (de 27,9 a 81,5 KB con la cabecera) no tiene tope ni le hace falta: la acota el de cada tramo. §14.8 estimaba la etapa entera, con la meta, en 25-65 KB; medida sin la meta llega a 81,5 KB, porque la voz de las reinas pesa más de lo estimado (§14.8 cita ya la medida).

**Cuándo se nota la red.** El servidor sirve como mucho `BROADCAST.prefetchRaceS` (900 s de carrera) por delante de lo informado, y en los modos rápidos el reproductor informa antes de pedir cada tramo (§8.5, §10.3): el tiempo que tiene cada pareja de peticiones es lo que tarda la pantalla en consumir 900 s de carrera. Con `Fast 4G` una petición pequeña cuesta unos 0,17 s (la latencia más la transferencia de 5 KB) y con `Slow 4G`, unos 0,6 s (unos 1,4 Mbit/s y 560 ms de latencia, según el mismo código de Chrome; estimado):

| Modo y velocidad (pantalla) | Factor | Pared por cada 900 s de carrera | ¿`Loading` (pantalla)? con `Fast 4G` · con `Slow 4G` |
| --- | --- | --- | --- |
| `Watch` ×1, a más de 50 km de meta | ×60 | 15 s | no · no |
| `Watch` ×4, ídem | ×240 | 3,75 s | no · no |
| `Highlights` ×1, ídem | ×300 | 3 s | no · no |
| el digest de una reina (150 s para unas cinco horas) | ×120 de media | 7,5 s | no · no |
| `Highlights` ×4, o `Next action` sobre `Watch` ×1 | ×1.200 | 0,75 s | no · sí, un instante en cada tramo |
| `Next action` sobre `Watch` ×4 | ×4.800 | 0,19 s | sí · sí |

El último caso se nota con cualquier red, y es aceptable: `Next action` corre hasta que se revela un rótulo de clase 2 o más (§8.5), así que `Loading` dura lo que dura el salto. Una etapa entera en `Watch` son una cabecera, de 14 a 32 tramos, un informe cada 15 s (de 30 a 80 en una etapa de 8 a 20 minutos, §15.6) y la meta.

### 18.8 La accesibilidad

D-57, escrito como hecho en su tercera parte (H-22): los rótulos van en una región `aria-live="polite"`; con `prefers-reduced-motion` los cursores del perfil saltan de km en km sin animarse; los parciales de crono llevan signo (`+0:05`, `−0:03`, pantalla) además de color; y los maillots se distinguen por forma (liso, banda, lunares) además de color, con `aria-label` y `<title>` («Race leader», «Points leader», «Mountains leader», «Leading team»), como fija `docs/navegacion.md` l. 455-458 ([DOC 6]). Lo que queda por decir es qué NO va en la región viva (decisión 18-h):

- **La capa fija y la barra no son regiones vivas.** Se repintan 10 y 4 veces por segundo (`overlayHz`, `barHz`): anunciarlas saturaría el lector de pantalla. Llevan `aria-live="off"` y un resumen accesible bajo demanda: tocar la capa lee `54.3 km to go, lead group 5 riders, bunch at 2 minutes 14` (pantalla).
- **Un anuncio por rótulo admitido en la cola**, nunca por línea de la voz: la cola ya limita lo que sale (§6.5) y la voz entera está en `Commentary` (pantalla), que es una lista que se abre, no una región viva.
- **`Loading` y `Connection lost · Retry` (pantalla) van en `role="status"`**, y el resultado de la meta, que el espectador ha pedido al cruzarla, en la misma región de los rótulos.
- **Los mandos son botones con nombre** (pantalla): `▶` con `aria-label="Play"`, `❚❚` con `Pause`, y `Next action`, `−5 km`, `+5 km` y `Show result` con su texto. Las pestañas ya siguen el patrón ARIA de `tablist`, con foco itinerante y flechas (`Tabs.tsx` l. 25-28), y la de `Watch` lo hereda.

### 18.9 Las medidas pendientes

Lo que se mide después, con el hueco para la cifra y la fecha. Se rellena en el PR que la mide y antes de encender lo que vigila:

| Medida | Cómo | Paso | Umbral | Cifra | Fecha |
| --- | --- | --- | --- | --- | --- |
| repintado de la capa fija y de la barra, en móvil | el protocolo de 18.5 | 10 | ≥ 30 fps | pendiente | pendiente |
| tarea más larga del hilo principal, en móvil | ídem | 10 | ≤ 50 ms | pendiente | pendiente |
| primera pintura de `Watch` (pantalla), en móvil | ídem, punto 5 | 10 | ≤ 2 s con `Fast 4G` | pendiente | pendiente |
| montón de JavaScript tras un digest de diecisiete etapas | ídem, con el digest | 10 | ≤ 5 MB de retransmisión (18-e) | pendiente | pendiente |
| B15, con el grabador y la escritura reales | días 176 y 179, con y sin E2, en la misma máquina | 5 | no más de un 25 % y 15 s a la vez, y ninguna lápida (§16.4, 16-l) | pendiente (prototipo: +15 a +17 %, +15,5 a +18,9 s) | pendiente |
| B14 contra Postgres de producción | `computeHorizon` en la forma D, los dos perfiles por separado, una vez | 7 | p95 ≤ 5 ms (D-33); el mánager es la puerta (16-k, DD-21) | pendiente (PGlite: 3,1-3,7 y 8,6-9,3 ms) | pendiente |
| B21, la posición extrapolada | contra la línea entera (§16.4) | 6 | informativo (D-04) | pendiente (L1: p50 de 0 a 2 m, p99 de 52 a 508 m) | pendiente |
| B22, el reloj estimado | el adaptador contra la línea grabada (§16.4) | 6 | `estimatedClockMaxErrKm` | pendiente (L1: 0,69 km en la cabeza, como máximo) | pendiente |
| `sendBeacon` con un `Blob` JSON | Chrome y Safari de móvil, al ocultar la pestaña (§14.11) | 7 | llega el informe | pendiente | pendiente |
| un tramo por una red móvil de verdad | la pestaña `Network` en un teléfono en 4G | 10 | ≤ 0,75 s | pendiente | pendiente |

### 18.10 La tabla de presupuestos

Todo lo anterior en una tabla: qué, si está medido (M) o estimado (E), el umbral, el banco o la prueba que lo vigila y el paso en que se acepta.

| Qué | M o E | Umbral | Banco | Paso |
| --- | --- | --- | --- | --- |
| la cabecera por la red | M: 7,1-9,0 KB con gzip | ≤ 16 KB (§14.8, §16.4) | B6 | 6a |
| el tramo mayor por la red | M: 0,23-4,72 KB con gzip | ≤ 12 KB (§14.8, §16.4) | B6 | 6a |
| la ruta de etapa sin los opcionales | M: 0,46-2,1 KB con gzip (L6) | ≤ 4 KB (§14.8, §16.4) | B6 | 7b |
| el paquete de meta | E: 10-20 KB con gzip (L6) | ≤ 40 KB (§14.8, §16.4) | B6 | 6a |
| la etapa entera por tramos, con la cabecera | M: 27,9-81,5 KB con gzip | sin tope propio: lo acota el del tramo | | 6a |
| la línea guardada en `bytea` | M: 20,9-70,0 KB (L3); 21,9 KB por nacional | `TIMELINE.maxStoredBytes`, 96 KB (§15.2, D-11) | B6 | 5 |
| parse y Zod del tramo mayor, en Node | M: 0,02-0,07 + 0,09-0,47 ms | mediana ≤ 2 ms (§16.4, 16-m) | B8 | 6a |
| parse y Zod de la cabecera, en Node | M: 0,12-0,16 + 0,13-0,55 ms | mediana ≤ 3 ms (§16.4, 16-m) | B8 | 6a |
| `instantAt` por fotograma, en Node | M: p99 0,036-0,056 ms (aproximación) | p95 ≤ 0,25 ms en 600 fotogramas (§16.4, 16-m) | B8 | 6a |
| la memoria del reproductor | M: 0,6-2,4 MB por etapa | ≤ 5 MB en el digest (18-e) | medida a mano | 10 |
| servir un tramo | M: 0,23-1,00 ms con la línea en la LRU; 1,3-4,7 sin ella (`datos`) | informativo | | 3a |
| la LRU de líneas decodificadas | M: 0,38-1,9 MB por línea | 16 entradas (18-d) | la memoria de la API | 6a |
| `computeHorizon`, p95 | M, PGlite, forma D: 3,1-3,7 ms el jugador, 8,6-9,3 el mánager | ≤ 5 ms (D-33) | B14 | 7a |
| `recordProgress`, p95 | M, PGlite: 3,05 ms | ≤ 5 ms (D-33) | B14 | 7a |
| `veilDelta` entero | M, PGlite: 14,3 ms (suma de medianas, con 18-b) | informativo; memo (18-c) | | 8b |
| escrituras de progreso | E: 4 por minuto y espectador (§10.3) | como mucho una cada 15 s (10-l) | test de `recordProgress` (§16.4) | 7a |
| el tick del día 179 | M: +15,5 a +18,9 s (+15 a +17 %) | no más de un 25 % y 15 s a la vez (§16.4, 16-l) | B15 | 5 |
| el tick del día 176 | M: +0,7 a +0,8 s | no más de un 25 % y 15 s a la vez (§16.4, 16-l) | B15 | 5 |
| repintado en móvil | pendiente | ≥ 30 fps (D-56) | medida a mano | 10 |
| tarea más larga en móvil | pendiente | ≤ 50 ms (D-56) | medida a mano | 10 |
| primera pintura de `Watch` (pantalla) | E: 1,2-1,5 s de red, más compilar y ejecutar | ≤ 2 s con `Fast 4G` (D-56) | medida a mano | 10 |

---

**Injertos aplicados:** I-26 (§18.6: esconder `BottomNav` mientras se reproduce, como propuesta a E6, con las fases en que se esconde y `useHideBottomNav`).

**Objeciones resueltas:** ninguna (§B no asigna ninguna a esta sección).

**Huecos rellenados:** H-09 (§18.5: el móvil, con el protocolo, los umbrales, el peso de la web medido, la primera pintura estimada y el orden de lo que se baja); H-18 (§18.4: la carga de escritura del progreso, medida en PGlite y estimada por número de espectadores); H-21 (§18.7: los fallos de red y cuándo se nota la red según el modo y la velocidad); H-22 (§18.8: la accesibilidad, con lo que va y lo que no va en la región viva).

**Contradicciones de hecho resueltas:** X-08 (§18.3: la sonda en cada bloque cuesta un 3,1-3,2 % en nacionales, dentro de lo que midió el juez del motor); X-24 (§18.3: los días pico, medidos: de +0,7 a +0,8 s el 176 y de +15,5 a +18,9 s el 179).

**Decisión tomada aquí:**

- **18-a. `computeHorizon` usa la forma D**: la consulta 1 trae los ids del corredor propio y de la plantilla, la 2 filtra con `rider_id = any($ids)`, y la cuarta se hace una vez por `(worldId, currentDay)` para todas las carreras de las dos temporadas y queda en un mapa del proceso (`lastRunStages`), exacto porque el tick sube `currentDay` en la misma transacción que corre las etapas (`tick.ts` l. 262-284). Por qué: la consulta 2 tal cual recorre `race_rosters` entera (de 23 a 40 ms), y la forma D deja al jugador en 3,1-3,7 ms de p95 con el mismo velo. Se descarta mantener la cuarta por espectador: es la misma para todos.
- **18-b. `veilDelta.raceDays` se calcula solo para el corredor del espectador y los de su equipo**, que son los únicos que la usan (sups. H4 y X1): 1,5 ms en lugar de 32. Se descarta calcularla para todas las listas de salida.
- **18-c. `veilDelta` se memoriza con la clave y la vida del horizonte**, `(userId, currentDay, horizonRev)` y `SPOILER.horizonMemoS`. Por qué: solo cambia con el velo o con el día, y sin memo cada petición con R o M pagaría unos 14 ms. Se descarta un memo por ruta.
- **18-d. `BROADCAST.decodedCacheEntries` baja de 64 a 16** en el paso 6, como permite §15.6 («se baja», con la memoria de la API de §18.2): de 8 a 30 MB en lugar de 33 a 121 (medido por L3). Se descarta mantener 64 con el cálculo de 20 MB, que era una estimación.
- **18-e. El digest guarda como mucho dos etapas en memoria**, la que se reproduce y la siguiente, y suelta los tramos y la línea de la anterior al empezar una: de 1 a 5 MB en lugar de 17 a 23. Se descarta confiar en la recolección de React Query, cuyo `staleTime` es infinito para los tramos (14-m).
- **18-f. `BottomNav` se esconde en `playing`, `waiting`, `seeking`, `recap` y `arrival`** y se ve en `preview`, `paused` y `closing`, con `useHideBottomNav` (propuesta a E6). Se descarta esconderla en toda la página de etapa: el espectador que pausa quiere poder irse.
- **18-g. El protocolo del móvil** es el de §18.5: 360 × 800, CPU ×4, `Fast 4G`, `race-colombia` e5, `race-france` e18 y la crono e16, tres grabaciones de 60 s por etapa y la primera pintura aparte, con el orden de lo que se baja si no se cumple. Se descarta medir en un solo modo: `Highlights` y ×4 son los que más repintan.
- **18-h. La capa fija y la barra no son regiones vivas**; hay un anuncio por rótulo admitido y ninguno por línea de voz; `Loading` y `Connection lost · Retry` van en `role="status"`. Se descarta anunciar la capa, que a 10 Hz saturaría el lector.
- **18-i. Con más de una instancia de la API, lo alcanzado pasa a la base**: cada informe escribe `race_watch.reached_s` con la guarda de 15 s de 10-l y sin la de 60 s de carrera, y el límite de los tramos lee la fila; sin columna nueva. Se descarta compartir la memoria entre instancias con otro servicio.

**Propuesto para el glosario:**

- `useHideBottomNav(hidden: boolean): void`: esconde la barra inferior mientras se reproduce; propuesta a E6 (`apps/web/src/components/BottomNav.tsx`; 18-f).
- `lastRunStages(db: Database, world: WorldRef): Promise<ReadonlyMap<string, number>>`: la última etapa corrida de cada carrera de las dos temporadas, memorizada por `(worldId, currentDay)` (`packages/db/src/horizon.ts`; 18-a).

**Dudas para el ensamblador:**

- La consulta 2 de `computeHorizon` tal como la escribe §10.6 no usa `race_rosters_rider_idx` (plan `Seq Scan`, de 23 a 40 ms en PGlite) y la cuarta cuesta 2,1 ms con 273 carreras, no «por debajo del milisegundo» (§10.7): §10.6 y §10.7 tienen que pasar a la forma D (18-a). Evidencia: `l7/horizonte.mjs` y `l7/horizonte2.mjs`, con sus planes.
- B14 (D-33: p95 ≤ 5 ms) no pasa con el perfil de mánager ni en la forma D: de 8,6 a 9,3 ms en PGlite. Y §16.4 lo mide con un `recordProgress` delante: si el p95 los cuenta juntos, tampoco pasa el jugador (3,1-3,7 ms más 3,05 ms de `recordProgress`, medidos por separado). La decisión es del dueño o de §16: medir B14 contra Postgres, fijar un umbral por perfil o medir las dos funciones por separado. §15.6 dice que si B14 no pasa se queda `SPOILER_MODE=off`. Se propone además que B14 informe del jugador y del mánager por separado.
- B15 (§16.4: como mucho un 25 % y 15 s más) no pasa con el prototipo el día 179 por los segundos: de +15,5 a +18,9 s, que son de un 15 a un 17 %. El tope en segundos depende de la máquina.
- §5.8 estima el día 179 en +6 a +10 s y el juez (X-24) en +2 a +8 s; medido con el prototipo, de +15,5 a +18,9 s.
- Los umbrales de B8 de §16.4 (mediana ≤ 10 ms, p95 ≤ 2 ms) quedan de 14 a 36 veces por encima de lo medido; con 2 ms, 3 ms y un p99 de 0,25 ms cazarían una regresión de cinco veces (§18.1).
- `BROADCAST.decodedCacheEntries` pasa de 64 a 16 (18-d); §15 dice «unos 20 MB».
- §14.8 estima la etapa entera en `Watch` en 25-65 KB con la meta; medida sin la meta, de 27,9 a 81,5 KB.
- D-55 habla de una escritura por minuto; §10.3 (10-l) y §18.4 cuentan cuatro. El texto de D-55 tendría que decir «cuatro».
- La página de etapa arrastra 85 KB comprimidos del motor por sus importaciones de `@cyclingstar/engine` (`RaceRadioPanel.tsx` l. 13 y `domain/stageJournal.ts` l. 18); §18.5 lo pone cuarto en lo que se baja, y E6 puede quererlo antes.
