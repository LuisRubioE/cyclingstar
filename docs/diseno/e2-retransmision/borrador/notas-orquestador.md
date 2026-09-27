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
