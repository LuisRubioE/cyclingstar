# Notas del orquestador para el ensamblador y la pasada de coherencia

Hallazgos cruzados que los redactores comunicaron en sus informes y que afectan a secciones de
otros lotes. La pasada de coherencia tiene que cerrarlos uno a uno (o dejarlos en `dudas.md`).

## De L1 (§1 a §3)

- El «0-36 saltos de más de 60 s» de la contradicción C4 mezcla dos fenómenos: el defecto (ataque
  cazado con hueco negativo) da de 0 a 6 saltos de grupo por etapa por encima de 60 s; los 33 de
  Flandes son deriva que vuelve a 0.
- Extrapolación causal (D-04) medida en 15 corridas: p50 de 0 a 2 m, p99 de 52 a 508 m, nunca 1 km.
  Reloj estimado (D-07): desviación máxima de 0,69 km en la cabeza.
- El umbral de I2 (tránsito p90 ≤ 2) falla en la e18: p90 de 3 a 5. §16.2 lo fija tras medirlo.
- Decisiones 3-a a 3-f adoptadas por §4 (decisión 4-t). `marcasDe` pasa a `clockMarksOf`.

## De L2 (§4 y §15)

- D-39: el digest de una gran vuelta dura de 34,5 a 39,5 min con `digestBudgetS`, no «unos 30».
  L4 lo mide en 38, 40 o 43 min y decide que el número del botón se calcula (8-b).
- D-26: `knownWins` «por construcción» no vale para victorias de etapa dentro de una vuelta. L5 lo
  cierra en §7.5: solo cuentan victorias cuya fila `gc` de `palmares` tiene `game_day ≤ día −
  expiryGameDays`, con consulta EXISTS.
- Trampa del CI: un test nuevo bajo `packages/engine/src/sim/` no corre en ningún PR; la decisión
  15-d mete `timeline.test.ts` en el tramo «mundo y radio».
- `photoBlocksOf` tiene que quitar repetidos: en 69 etapas dos km de foto caen en el mismo bloque.
- Regla de ESLint que impide al motor importar `BROADCAST` y `SPOILER` (15-h o vecina).

## De L4 (§6 y §8)

- La voz dice «the bunch» con el grupo principal por debajo de 2/3 (22 de 48 líneas en la e18); el
  motor usa 1/2 en `chaseIsBunch` y no exporta `chaseReferenceIndex`. Afecta a §12.6 y §15.5.
- D-55: en `Watch` son unas 4 escrituras de progreso por minuto, no 1; §10.3 sigue diciendo 1. En
  `Highlights` ×4; en `Next action` el colchón de tramos es de 0,75 s.
- `TimelineCast` necesita un campo `favourites` congelado o puede fallar B1c (afecta a §4 y §5).
- `StageClosing` no tiene la tabla por equipos que pide DD-13.
- `PHOTO FINISH` no se puede hacer: `margin` es el hueco al grupo siguiente.
- En crono, `Highlights` y el digest son una sola curva, medida de 1:56 a 2:03; §9.4 no la nombra.
- Ningún salto pasa de L−1; `Next action` se apaga en el último km; la letra por modo coincide con
  `LETTER_OF_MODE` de §10.3.

## De L5 (§7 y §9)

- La API quita de puntos y montaña a los corredores con 0 puntos (`results.ts` l. 344 y 403); la
  lista del tick no (`packages/db/src/stageRun.ts` l. 551-557). El reparto sigue a la API (7-b).
- D-25 habla de 22 países con excepción antes; son 17, y 5 después. En la temporada 0 el Giro tiene
  campeones de 15 países y ninguno de Italia.
- Los tiempos de la crono tienen que ser enteros exactos: propone `checkClockDs` y meta en
  10·tiempoS. El pinchazo se revela por la traza en finishKm/2. El cierre de la crono es la última
  llegada, no el último en salir.
- Propuesto para §4: `checkClockDs`, `BroadcastHead.tt`, `tt.checks` en el chunk, avisos
  `tt_split` y `tt_finish`. Para §15: `ttSeekStepS`, `ttSeekLastStarters`.
- Cronos largas frente a `ttMaxStoredBytes`: unos 19-20 KB estimados para 40 km, por encima de 16 KB.

## De L6 (§10 y §14)

- drizzle expande un array dentro de `sql` a `($1, $2)`: `veilSql` con una lista falla; con
  `sql.param` funciona (medido en PGlite y postgres-js 3.4.9).
- Si `contracts.ts` importa algo de `wire.ts`, aunque sea la reexportación de §G.2, el paquete no
  carga («Cannot access before initialization», medido). Decisión 14-a: los cuatro esquemas de E2
  que necesitan las ampliaciones pasan a `contracts.ts` y la reexportación va en `index.ts`. §4.11
  y §4.13 tienen que moverse.
- Aplicar D-50 al pie de la letra rompe la web de ayer: `leaders` tiene que omitirse entero. La
  ruta de etapa omite el resultado cuando la pantalla no lo va a enseñar (`stageAccessOf`), no solo
  cuando la etapa está velada.
- Registro medido en Fastify 5.11.2: 140 registros (87 rutas propias más 53 `HEAD` que heredan el
  `config`). Hay rutas fuera de `/api`; un `onRoute` que lanza impide arrancar. `healthSchema` vive
  en el `index.ts` de shared, no en `contracts.ts`; `features` va opcional.
- Ruta de etapa sin los opcionales de resultado: 0,46-2,1 KB con gzip (medido); la cabecera unos
  6,7 KB con gzip (estimado). `@fastify/compress` entra en el paso 0, registrado antes de
  `@fastify/static`. Faltan en §15 los topes de red para B6 (sin evidencia de los jueces).
- Alineado con L3: la lápida de 5-k sustituye al corte por fecha; `timelineForStage` recibe el
  `Horizon` como `readStageTimeline` en 5-p (§10 cambia 10-c). L3 midió el LRU de 64 líneas en
  33-121 MB, no 20.
- D-55 corregido en §10.3 con 10-l: como mucho una escritura cada 15 s por usuario y carrera. No
  se enmascara la retirada voluntaria (10-i).
- Sin comprobar: `sendBeacon` con un `Blob` JSON en Chrome (respaldo `text/plain`), B14 con datos
  reales, Postgres de producción.

## De L3 (§5 y §13)

- El formato de §4.3 no cabe en los topes de D-11: 20,9-70,0 KB en `bytea` (mediana 38,8) y 222 KB
  de JSON de mediana. L3 propone topes de 96 KB, 640 KB, 256 KB y 32 KB. Por temporada unos 36 MB,
  no 11-20. Afecta a §4, §15 y §18.
- El LRU de 64 líneas ocupa 33-121 MB, no 20; L3 propone 16 entradas. Afecta a §15 y §18.
- La regla `emit`/`incident` de §4.7 retrasa el rótulo de las caídas 70,6 s de mediana y el de los
  pinchazos 141,6 s; arreglo propuesto: usar el grupo al final de b−1. Afecta a §4.7 y §6.
- I1 necesita que la tolerancia de relojes iguales cubra también el `kind`: sin ella falla 1 foto
  de 8.656. Afecta a §4 y §16.
- D-49 es falsa contra el código: `columnasVivas.test.ts` solo vería `prize`, no `follow`,
  `known_through` ni `horizon_rev`; la decisión 13-a amplía su expresión. Las escrituras de
  `watch.ts` en §10.3, hoy en SQL, tienen que ir con `.set({…})` de Drizzle o el test las da por
  muertas. Afecta a §10.3 y §00-decisiones (D-49).
- Firmas de §G.4 que cambian: `timelineRecorder`, `selfCheckI1` y `readStageTimeline` (recibe
  `Horizon`). El glosario tiene que actualizarse.
- El reinicio vacía `stage_timelines` y reinicia `web`, porque el LRU no distingue mundos.
- El encargo nombra `apps/api/src/tick/stageRun.ts`, que no existe: el fichero real es
  `packages/db/src/stageRun.ts`. Corregir en todas las secciones que lo citen.

## De L7 (§11 y §18)

- Puerta nueva `sup. X10`: el planificador y `plan/preview` delatan el abandono (`riderSchedule.ts`
  l. 47).
- La consulta 2 de §10.6 recorre `race_rosters` entera (23-40 ms); §18 la deja en la «forma D»
  (`= any(ids)`, la cuarta una vez por `currentDay`). Coordinar con §10.6 y §13 (índice por corredor).
- B14 no pasa con el perfil de mánager (p95 de 8,6 a 9,3 ms en PGlite) ni con el jugador si cuenta
  `recordProgress`; B15 no pasa su cláusula de «15 s más». Los umbrales los fija §16.4 (L8).
- `getBlockReport` cuenta siempre 0 días de carrera: defecto de hoy, ajeno a E2 (anotar en riesgos
  o en `balance.md`, no arreglar aquí).
- La ruta `/api/teams/me/race-plan` es `safe`, contra lo que dice §10.6.
- §6.10 cuenta la etapa caducada entre las conocidas, contra la decisión 10-e.
- Medidas: cabecera 7,1-9,2 KB gzip, tramo ≤ 4,8 KB, etapa entera 28-82 KB; parse más Zod del tramo
  mayor ≤ 0,54 ms; tick del día 179 de 15,5 a 18,9 s y del 176 de 0,7 a 0,8 s; primera visita a una
  etapa 334 KB comprimidos (85 del motor). La LRU queda en 16 entradas (coincide con L3).
- 11.18 es la lista blanca entera de B1b, que L8 copia: una sola fuente en el ensamblado.

## De L8 (cierre) y L9 (§17 y §19)

- L8 (cierre): `withGroupRoles` devuelve copias y §14.3 ata cada suceso a su hora por identidad,
  así que las copias perdían su hora; lo cierra 12-n. La lista blanca de B1b se cita de §11.18 y
  `strip` gana `[veiledDay]` (16-o). B11 ya no exige `onEvent` en las cronos (§5.2). B10 importa
  `realRaceScenario`, que el motor no exporta: lo exporta el PR 4b. B6 repartido (16-n). B14 (16-k),
  B15 (16-l) y B8 (16-m) con umbrales nuevos. Bloques «Dudas del cierre (lote L8)» al final de
  `12-voz.md` (4) y `16-bancos.md` (8): piden cambios en §14.3, §13.2, §5.10, §17, §18.10 y §20.
- L9: decisiones que corrigen a otras secciones: 17-b (B1d en el 8a), 17-i (tests de banco solo en
  4a y 4b), 17-k (reparto congelado en el 5), 17-l (B16 largo en `apps/api`), 17-m (B18 en el 7b),
  17-n (`PENDING_ROUTES` vacía en el 8b), 17-t (B13 en `apps/api`: `shared` solo depende de zod y
  no puede importar `veilCast`), 17-r (equipo del día desde `input.riders[].teamId`).
- L9, dudas abiertas: los topes de D-11 dejan B6 en rojo y hay que fijarlos antes del 4b (L3 ya
  propuso 96 KB, 640 KB, 256 KB y 32 KB); si el mánager de B14 no pasa contra Postgres decide el
  dueño y §20 debe recogerlo; B1c depende de 8-g; §14.3 no llama a `withGroupRoles` ni a
  `liveClusters`; la firma de `emitNews` no está en §G; la cifra de CI del esqueleto está mal (los
  73 min son pruebas en serie, no tiempo real); si a la táctica le quedan subidas de versión, D-09
  le pide hacer antes el 17d. 19-b: `getBlockReport` va a `docs/balance.md` en el paso 12.
- Coste estimado del plan: unas 52 sesiones en total y 34 hasta el encendido (estimado, no medido).

## Estado tras la coherencia (fase 6)

- Cruzadas: las 299 de `refutaciones/cruzadas-L1.json` a `-L10.json` tienen su entrada en
  `refutaciones/coherencia.json`: 129 aplicadas en esta pasada, 170 que ya estaban (el lote de
  destino las registró en su `correcciones-L<n>.json` y sus nombres y cifras clave están hoy en el
  fichero de sección) y ninguna desestimada. Una que el destino daba por aplicada no lo estaba
  entera (L9, Rcoste-044: B18 seguía naciendo solo en el 7b) y se aplicó aquí.
- Las que el orquestador marcó como importantes, todas aplicadas: `rolesCtx` de §14.3 con los
  líderes de `tl.cast.riders`; `startSpoilerWorld` vacía las dos LRU de líneas y §14.4 exporta
  `clearAdaptedTimelineCache` (Rcodigo-086); `TEST_DATABASE_URL` en el 1a en §13.10, §16.4 (B12),
  §16.7 y §18.2 (17-w); `ROAD_FIXTURES`, `seedFixtureWorld` y la cláusula de no vacío de B13 en
  §16 (17-u); D-58 con `SPEC.md`; 6-h y §12.3 (decisión nueva 12-s); la cita de D-18 entera;
  `estimatedHeadClock` que devuelve null y §14.4 que lo recoge.
- Decisiones nuevas de la coherencia: 15-l (`TIMELINE.medianJsonBytes` a 320 KB, 1,44 veces la
  medida; D-11 corregida en la fase 6) y 12-s (el racimo en vivo junta a todo corredor salvo la
  fuga, los maillots y los propios; D-43 precisada en la fase 6). D-58 precisada (`SPEC.md` y
  `docs/ops.md` en el 5 y el 7a). El registro de `00-decisiones.md` gana las filas de D-09 (fase 5),
  D-53 (L9), D-11, D-43 y D-58 (fase 6), y quince citas de «Versión anterior» dejan de pegarse
  entre sí o al párrafo siguiente.
- Coherencia transversal: el glosario declara `CueClass` y `PaceZone` en `timeline.ts` (17-z),
  `RiderCueContext` sin `attack` (6-p), `BroadcastFinish.threeKmRule` y `WatchState.seen`, como §4;
  gana los nombres que las secciones usaban y él no tenía (`leadersThroughStage`,
  `clearAdaptedTimelineCache`, `viewerCookieHeader`, `isJerseyKind`, `oneDayStageTarget`,
  `mainJersey` y `groupJersey`, las exportaciones de `spoilerWorld.ts` y
  `timelineCollectorBench.ts`) y G.9 sigue a §16.4 (B3, B6, B13, B15, B18 y PL); F.2 lo sigue. Las
  remisiones `§G.n` (29) y a `00-decisiones.md` (8) del documento pasan a su sitio (21-f): en el v1
  solo queda la de 21-f, que las pone de ejemplo. «Diez puertas» pasa a once en §10 y §17; la
  mediana de 320 KB llega a §0.7, §16.4 y §19 (riesgos 1 y 10); D-23 mide la e10 en el banco
  desde el 4b (16-n); §19.7 gana el comentario de
  `SnapshotRider.tS`, que corrige el 4a. Comprobado sin cambios: las 298 decisiones de sección que
  se citan existen; D-01 a D-62, DD-01 a DD-29, I, O, H y X dentro de su rango; los tipos del
  glosario iguales a los de §4; 27 decisiones del dueño, 13 pasos y 23 PR, 56 sesiones (52,5 hasta
  el encendido en orden, 37 por el camino crítico), once puertas, 17 de 22 países y 5:20 a 11:23 la
  crono, iguales en todas las secciones.
- Dudas (`dudas.md`, tabla de §0): de las 27, 19 cerradas con su evidencia; abiertas solo las que
  pide una medida, con su paso: `sendBeacon` (7a), B14 del mánager desde Railway (7a), TOAST en
  producción (5), B15 del día entero (5 y 10b), B21 y B22 contra una línea grabada (4b y 6a) y el
  móvil (10b), más dos que salen de lo cerrado: la crono más larga con el grabador de verdad (4b) y
  el racimo de 12-s con nombres (6b, B19). La 2.5 (fundir los bloques de cierre) es de la fase 7 y
  la 4.3 (85 KB del motor en la página de etapa) sigue fuera de E2.
- Ensamblado: `ensamblar.sh` escribe `retransmision-v1.md` con la cabecera «Estado: borrador v1,
  tras la refutación adversaria y la corrección, antes de la auditoría»; el glosario entra como
  apéndice F, que es §21.6 (21-f: no se concatena `00-glosario.md`, que duplicaría §4, §13, §14.2
  y §15). v1: 11.411 líneas; `--comprobar`, 0 fallos y 0 avisos (49 injertos, 32 objeciones y 23
  huecos en algún bloque de cierre).
- Para la auditoría: las notas de arriba son de las fases 3 y 5 y varias ya no valen (los topes de
  D-11 están fijados; el coste es de 56 sesiones y 37 por el camino crítico, no 52 y 34). Conviene
  mirar contra el texto de hoy las 170 cruzadas «ya_estaba», porque se aceptó el registro del lote
  de destino con una comprobación automática de nombres; y la cabecera (§0.8) espera al cierre.

## Abiertos de la auditoría que cruzan secciones (para el cierre)

- A-L1-009 (de L1 a §5.4): `05-motor.md` dice «de 418 a 3.617 marcas… las mismas cifras que §3.4» y
  §3.4 da de 558 a 3.617. L3 corrigió §5.4 a «10-22 KB» pero no consta la cifra de marcas.
- L1 avisa: `17-plan.md` l. 122 aún dice que §3.8 daba privada `estimatedHeadClock`; «About N min»
  no está en G.11 ni en F.3.
- A-L3-002 (de L3 a §17): §17.8 y §17.20 no nombran `race.ts` (`raceWorldDay`). A-L3-005: §17 y
  §19.5 dicen «de 100 a 514 KB»; el mapa 07 midió 102,5.
- Rcobertura-014 (parcial en L2): falta `tplRev` en el `.omit` de `yesterday.test.ts` en §14 y en
  §17 (17-plan.md l. 330). A-L2-003 (de L2 a §10.6): `anonHorizon`, `first`, `guardCandidates` y
  `buildHorizon` sin declarar (pasado a L6).
- A-L4-008 (de L4 a §4.9 y G.3.4): `RiderCueContext` tiene el contexto `'dropped'` que nadie produce.
  A-L4-009: la regla de `Next action` sin la excepción de la ronda de la moto en §4.9 l. 864 y
  §18.7 l. 191 (pasado a L7 para §18). A-L4-012: §16.6 y §17.9 dicen «se tiran al cazarse» en vez
  de «cuando el escapado ya no va por delante del pelotón»; §17.20 y §17.9 tienen que nombrar las
  dos funciones de la cola. Rcodigo-028 (parcial): 7-a no dice lo que costaría un nombre corto.
- De L5 (auditoría): §6.5 (parcial), `admitir` no lleva la sustitución de `tt_split` y `tt_finish`
  de 9-d; §4.8, dos comentarios contradicen 7-b y `staticNotoriety`; §16.4, B17 atribuye a L4 las
  medidas de la crono (son del juez y de L5); §17.17 y §21 (X-13) dicen que no hay campeones hasta
  el día 179 y en 17 países los hay antes.
- De L6 (auditoría): A-L6-011, §11.15 y D-40 dicen que `?diag=1` es solo para `users.is_admin`
  mientras §10.13, §14.6 y `whoami` aceptan también el correo de `ADMIN_EMAIL` (pasado a L7);
  §17.10 (17-plan.md l. 330) sin `tplRev` en el `.omit`; §17.20 no dice en qué PR gana
  `stageReplaySchema` `watch` y `tplRev`; §11.10 aún abre la etapa `A` en `Report` (debe ser `Watch`, 6-r).
