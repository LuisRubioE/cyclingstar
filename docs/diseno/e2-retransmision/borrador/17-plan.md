## 17. El plan por pasos, tests primero

Esta sección ordena en trece pasos y veintidós PR todo lo que §1 a §16 y §18 piden construir, y para cada PR dice qué entra (motor, base, API, web), qué tests se escriben antes que el código, qué banco lo mide, de qué depende, cuánto cuesta, qué ve el dueño al acabarlo y con qué se revierte. No añade piezas: cada fichero, función, test y banco que nombra está en la sección que se cita, y donde las secciones no decían en qué PR entra una pieza, o lo decían de dos maneras, lo decide aquí con su motivo (bloque final, 17-a a 17-t). Escribe como hechos D-07, D-45, D-53, D-54, D-58, D-60 y D-61. La base es el plan de `ingeniero.md` §14 (13 pasos y unos 16 PR, dos interruptores y la marcha atrás por paso), ensanchado a 22 PR porque la fusión añade la línea grabada (4b y 5), el velo en cinco PR (7b, 8a, 8b, 9a y 9b) y la montura final (10a y 10b). Los nombres de los pasos son los de §G.10.

Las líneas citadas son las de HEAD `9c21885`; entre `9c21885` y `ec360b6`, el árbol en que se cierra esta sección, no cambia nada fuera de `docs/` (`git diff --stat 9c21885 ec360b6 -- . ':!docs'` vacío). Si al implementar una línea se ha movido, manda el nombre del símbolo citado.

### 17.1 Reglas del plan

1. **Tests primero.** Cada PR empieza escribiendo los ficheros de test que su subsección lista, con los casos que se dicen, y se cierra con `pnpm typecheck && pnpm test:rapido` en verde (`package.json` l. 12 y 21). Lo que todavía no puede pasar se escribe igual como `it.todo` con la cifra medida en el nombre, que es como lo hace `docs/generador.md` §15.1 (regla 1): encenderlo es una línea y deja rastro en el diff. Un test que cambia porque E2 cambia a propósito lo que protege se re-sella en el PR que hace el cambio, con la causa escrita en el propio test (§16.1).
2. **Un PR por fila de §17.2**, en el orden de §17.16. Tamaños: S hasta 300 líneas de diff, M hasta 800, L más (`ingeniero.md` §14). La descripción de cada PR lleva las cifras que su paso mide (B6, B15, B17, la de `storyMetrics` en el 4a, la del móvil y la prueba de lectura en el 10b) y la lista de lo que re-sella.
3. **`ENGINE_VERSION` no se mueve** (D-09): sigue en 89 (`packages/engine/src/constants.ts` l. 838) y `packages/engine/src/index.test.ts` l. 465 (`expect(ENGINE_VERSION).toBe(89)`) no se toca en ningún PR de E2. Un PR de E2 que necesite subirla está mal hecho y se para.
4. **Solo el paso 4 toca `packages/engine/`** (D-54, X-22). El CI corre los ocho tramos de bancos cuando el diff toca `^packages/engine/` (`.github/workflows/ci.yml` l. 189), suba o no la versión: 4.365 s de pruebas en serie, unos 73 min (`ci.yml` l. 103), que la matriz reparte en ocho tramos en paralelo; con seis tramos sumaron 82,8 min de runner, porque cada uno paga su preparación, y el más largo tardó 33,1 min (l. 123 y 143), y el reloj de los ocho de hoy no está escrito (l. 135-136). Si el diff no toca el motor, los bancos se saltan y los corre de noche `cobertura.yml` (l. 193). Por eso todo lo que E2 necesita dentro de ese camino, código y tests de banco, entra en el 4a o en el 4b (decisión 17-i), y ningún PR posterior lo toca.
5. **El coste de todo PR**: `typecheck` 37,4 s y `test:rapido` 562 y 529 s en dos corridas (medido, mapa 07 §4). E2 hace crecer la rápida de 2 a 4 min (estimado en §16.7: los mundos de PGlite de B1 y B12, las seis etapas congeladas y B10 corto).
6. **La trampa de `sim/`.** `test:rapido` excluye `packages/engine/src/sim/**` (`package.json` l. 21) y los tramos son listas escritas a mano (`ci.yml` l. 150-175): todo test nuevo bajo `sim/` entra en el tramo «mundo y radio» en el mismo PR que lo crea (15-d), y todo lo que depende de `packages/shared` tiene además su versión en la suite rápida sobre etapas congeladas (D-52), porque un cambio en `shared` no dispara los bancos.
7. **Migraciones**: solo `drizzle-kit generate --name <nombre>`, con el `.sql`, la foto y la entrada de `_journal.json` tal como salen (§13.1); cada una en el PR de su escritor, porque `columnasVivas.test.ts` pide escritor para toda columna numérica con defecto (13-a); nunca se revierten (`docs/tactica.md` §8.3, l. 6948); si otro documento toma antes un número, manda el nombre (D-49). Hoy la próxima libre es la `0043` (`packages/db/drizzle/meta/_journal.json`: 43 entradas, la última `0042_transicion_e1`, comprobado).
8. **La web de ayer no se rompe en ningún PR** (D-50): `apps/api/src/routes/yesterday.test.ts` nace en el paso 0 con las claves de cada esquema en `9c21885`, y todo PR que ensancha un esquema le añade su `.omit` (14-n).
9. **Todo se apaga sin desplegar** (D-53): lo que el jugador podría notar va detrás de `BROADCAST_WATCH` o de `SPOILER_MODE` (§14.6), con las excepciones que lista la regla 11; `TIMELINE_RECORD` frena la grabación; las migraciones solo añaden y son inertes si nadie las lee. Cada paso dice con qué se revierte: con un interruptor si puede, con un `git revert` si no, nunca con una migración hacia atrás.
10. **El formato guardado se cierra antes de la primera línea grabada** (decisión 17-a): lo que la pantalla necesite de lo grabado entra en el formato 1 en el 4b y en la `0044` en el 5; lo que llegue después es un `format` 2 con su decodificador (D-10), porque lo guardado no se reescribe.
11. **Lo que se fusiona a `main` sin que el jugador note nada**: todo, salvo seis cosas que se dicen en su PR. El paso 0 hace que la web cargue antes. El 1a añade dos titulares al feed y quita el espacio de la coma de `contract`. El 6b cambia frases del acta (las cuatro claves crudas pasan a frase y el grupo del título se nombra por su papel, 12-b). El 9a renombra la pestaña `Story` a `Report` (pantalla) y pone título a la pestaña del navegador, y el 9b abre en `Report` la clásica terminada. El 12 re-sortea una vez las variantes de las frases viejas. Lo demás, hasta el 10b, solo lo ven los administradores.

### 17.2 Los trece pasos

Los veintidós PR en su orden de ejecución, con lo que entra, los tests que se escriben primero (fichero; los casos, en la subsección de cada paso), los bancos que lo miden, si toca el motor, el tamaño, de qué depende, qué se ve y con qué se revierte. La columna Visible dice qué ve el dueño con `admins` y, si cambia algo, qué ve el jugador.

| Paso · PR | Qué entra | Tests primero | Bancos | Motor | Tam. | Depende de | Visible | Se revierte con |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 · 0 | `@fastify/compress`; los contratos de hoy en tests; el inventario de rutas | `contracts.test.ts` (dos casos), `yesterday.test.ts`, `spoilerRegistry.test.ts` (inventario), `app.test.ts` | B6 y B17, línea base | no | S | nada | todos: la web carga antes | quitar el plugin |
| 1 · 1a | `0043_noticias_con_datos`; `NewsPayload` y `renderNews` en `shared`; `text` de compatibilidad; dos titulares nuevos | `news.test.ts` (shared y db), `stageRun.test.ts`, `abandon.test.ts`, `migrations.test.ts`, `columnasVivas.test.ts` | B4 | no | M | nada; antes del reinicio | todos: dos titulares nuevos y la coma | el código; la `0043` es inerte |
| 1 · 1b | el enlace por `raceId`; dos etiquetas | `newsFeed.test.ts` | | no | S | 1a | nada | revert |
| 2 · 2 | la voz causal; el `revealS` de lo guardado; las constantes; los fixtures (primera mitad) | `chronicle.test.ts`, `voicePrefix.test.ts`, `voice.test.ts` | B19 | no | M | nada | nada | revert |
| 3 · 3a | el adaptador de la radio; las rutas de la retransmisión; corte, reductor, instante, ritmo y red; `BROADCAST_WATCH` | `broadcastCut.test.ts`, `broadcastPace.test.ts`, `pace.test.ts`, `reduce.test.ts`, `instant.test.ts`, `broadcastConstants.test.ts`, `routes/broadcast.test.ts`, `raceRadio.test.ts` | B9, B17 (rápida) | no | L | 2 | nada | `BROADCAST_WATCH=off` |
| 3 · 3b | el reproductor | `player.test.ts` | B9 (el ritmo) | no | M | 3a | nada | revert |
| 3 · 3c | la pantalla `Watch` | `FixedOverlay.test.tsx`, `GroupBar.test.tsx` | | no | M | 3b | el dueño: `Watch` sobre la radio de hoy | `BROADCAST_WATCH=off` |
| 4 · 4a | los tres ganchos; `GROUP_NOUNS`; `renderNews` fuera del motor; tres `export` | `probeHooks.test.ts`, `timetrial.test.ts`, `news.test.ts`, `stageJournal.test.ts`, `broadcastConstants.test.ts` | B11 (humo); los ocho tramos | sí | M | nada | nada | revert |
| 4 · 4b | el grabador; `TIMELINE`; el códec; el colector sin llamador; los fixtures (segunda mitad) | `timeline.test.ts`, `timelineCollector.test.ts`, `broadcastFixtures.test.ts` | B11, B10, I1, I2, I3, I5, B2, B21, B6 (el JSON y el `bytea` de las seis); los ocho tramos | sí | L | 4a, 3a | nada | revert |
| 5 · 5 | `0044_linea_temporal`; la envoltura en el tick; escribir y leer la línea; el reparto congelado; `TIMELINE_RECORD` | `timelines.test.ts`, `stageRun.test.ts`, `jerseys.test.ts`, `titles.test.ts`, `cast.test.ts`, `migrations.test.ts` | B6 a mano (el `bytea` de las 24 × 2), B15; `selfCheckI1` en cada etapa | no | L | 4b | nada | `TIMELINE_RECORD=off` |
| 6 · 6a | la línea grabada en la retransmisión; la cola de rótulos | `radioAdapter.test.ts`, `broadcastFixtures.test.ts`, `cues.test.ts`, `clientCost.test.ts` | B22, I2, B2, B8, B6 (lo servido) | no | L | 5 | el dueño: reloj exacto y rótulos de suceso | `BROADCAST_WATCH=off` |
| 6 · 6b | rótulos, maillots y frase de la fuga; las frases nuevas; la crono | `names.test.ts`, los de `components/broadcast/`, `templateCoverage.test.ts`, `stageJournal.test.ts`, `stageJournal.corpus.test.ts`, `raceRadioNames.test.tsx`, `timeTrial.test.ts` | B3, B7, B4, B19 con nombres | no | L | 6a | el dueño: rótulos y crono; todos: frases del acta | `BROADCAST_WATCH=off`; revert |
| 7 · 7a | `0045_lo_visto`; `race_watch`; `computeHorizon`; `cs_viewer`; `/api/me`; `SPOILER_MODE` | `horizon.test.ts`, `horizonLatency.test.ts`, `revealFree.test.ts`, `me.test.ts`, `routes/broadcast.test.ts`, `spoilerCanary.test.ts`, `spoilerDiff.test.ts`, `spoilerOutcomes.test.ts` | B12 (casi todo), B14, B20; B1a, B1b y B1c con pendientes; B14 contra Postgres, a mano | no | L | 5, 3a | nada | `SPOILER_MODE=off` |
| 7 · 7b | la ruta de etapa cerrada; el acta con puerta; el tope de lo alcanzado | `stageRoute.test.ts`, `routes/broadcast.test.ts`, `broadcastFixtures.test.ts` (B13), `raceRadio.test.ts` | B13, B18 | no | M | 7a, 6b | el dueño: la etapa cerrada | `SPOILER_MODE=off` |
| 8 · 8a | `0046_rastro_de_etapa`; `Horizon` obligatorio; `veilSql`; P, F, G y N; el registro que lanza | `spoilerRegistry.test.ts` (B1d), `horizonReaders.test.ts`, `newsVeil.test.ts`, `migrations.test.ts` | B1d, B12 (el predicado) | no | L | 7b | nada | `SPOILER_MODE=off` |
| 8 · 8b | `veilDelta`; R y M; las puertas de fuera | `fichaCorredor.test.ts`, `abandon.test.ts`, `ranking365.test.ts`, `spoilerDiff.test.ts`, `horizon.test.ts` | B12 (la retirada); B1a, B1b y B1c en verde en todas las rutas | no | L | 8a | nada | `SPOILER_MODE=off` |
| 9 · 9a | la web de la etapa: pestañas, puerta, `/report`, título, caché, vista previa, correo | `pageTitle.test.ts` (dos), `emails.test.ts`, `spoilerCanary.test.ts`, `queryKeys.test.ts` | B1a | no | L | 7b | todos: `Report` y el título de pestaña | interruptores; revert |
| 9 · 9b | la web del mundo: portada, avisos, noticias, órdenes y `Stages` | `raceTabs.test.ts`, `raceStages.test.ts`, `raceTimeline.test.ts` | | no | L | 8b, 9a | todos: la clásica terminada abre en `Report` | interruptores; revert |
| 10 · 10a | previa, cierre, `Highlights`, digest y mandos | `pace.test.ts`, `player.test.ts`, `PlayerControls.test.tsx` | | no | L | 6b, 9b | el dueño: la emisión entera | `BROADCAST_WATCH=off` |
| 10 · 10b | la aceptación y el encendido | los de las medidas | B17, B15, el móvil, PL | no | S | 10a, 8b | todos, al encender | los dos interruptores a `off` |
| 11 · 11 | la radio desde la línea; se deja de escribir `radio` | `broadcastFixtures.test.ts` (B16, corto y largo), `stageRun.test.ts` | B16 | no | M | 6a, 9a | nada | revert |
| 12 · 12 | la semilla neutra y el re-sello único; los narradores; los documentos | `stageJournal.test.ts`, `stageJournal.corpus.test.ts`, `narration.test.ts` | B5 | no | M | 11, 10b | todos: las variantes, una vez | revert |

### 17.3 Paso 0 · Red y línea base

**PR 0** · S · no toca el motor · no depende de nada y puede fusionarse el primer día.

Es el paso que deja medido lo de hoy antes de cambiarlo, como el paso 0 de `docs/generador.md` §15.2: sin la línea base de B6 y B17 no hay con qué comparar el 6a ni el 10b, y sin el inventario de rutas nadie sabría si §11.3 sigue completa cuando llegue el 8a.

**Tests primero.**
- `apps/web/src/api/contracts.test.ts` gana dos casos (§14.7; la ceguera 5 del mapa 07 §5.2, «ni `stageReplaySchema` ni `newsResponseSchema` en `contracts.test.ts`»): `stageReplaySchema` acepta una etapa con solo sus obligatorios (`day`, `name`, `km`, `run` y `altimetry`, `packages/shared/src/contracts.ts` l. 1483-1486 y 1498), sin los opcionales de resultado y sin `leaders`; y `newsItemSchema` acepta un titular con claves que no conoce, porque los objetos son *strip* (l. 9-12).
- `apps/api/src/routes/yesterday.test.ts` (nuevo, 14-n): pasa las respuestas de la ruta de etapa, de `/api/news`, de `/api/riders/me/last-race` y de `/health` por los esquemas de hoy y fija con una lista literal las claves de cada esquema en `9c21885`. Cada PR que ensancha un esquema añade aquí su `.omit` de los campos nuevos (1a, 3a, 7b y 8a).
- `apps/api/src/spoilerRegistry.test.ts` (nuevo), como inventario de rutas (decisión 17-b): construye la app con base, como `adminPanel.test.ts`, recoge con un gancho `onRoute` el `${método} ${url}` de todo lo que registra Fastify y lo compara en los dos sentidos con una lista literal: las 87 rutas de nuestro código (52 `GET`, 21 `POST`, 8 `PUT`, 4 `DELETE`, un `PATCH` y el comodín `/api/auth/*`) y las 53 `HEAD` automáticas (medido por L6 con `l6/rutas.mjs`, §14.5). Una ruta que se añada entre el 0 y el 8a tiene que entrar en la lista, y así la tabla de §11.3 llega completa al 8a, donde este fichero pasa a ser B1d.
- `apps/api/src/app.test.ts` gana dos casos: una respuesta de más de 1.024 B con `accept-encoding: br` sale comprimida y con `Vary: accept-encoding`, y una menor no (el umbral por defecto del plugin, su `index.js` l. 143; §14.8).

**Código.**
- `apps/api/package.json` gana `@fastify/compress` 9.2.0 (par de `fastify` 5.x); hoy no está instalado (en `node_modules/.pnpm` solo está `@fastify+static@10.1.2`, comprobado).
- `apps/api/src/app.ts`: `void app.register(fastifyCompress, { global: true, encodings: ['br', 'gzip'] })` detrás de `@fastify/helmet` (l. 86-106) y antes de `@fastify/static` (l. 204), como pide su documentación (§14.8).

**Bancos.** B6 nace como línea base: el peso con gzip de la ruta de etapa de hoy con el plugin puesto, en las etapas del banco, con la cifra en la descripción del PR (el mapa 02 §7 midió de 22,2 a 50,0 KB). B17 nace como línea base con `scripts/bench-pace.mjs` (nuevo, §16.4): corre `BROADCAST.pace`, `summaryPace` y `ttPace` con los valores de §15.3 sobre las 24 etapas del mapa 07 §7, con el reloj de la cabeza estimado como el adaptador (§3.8) desde la radio que el propio script recoge, y deja en el PR la tabla de §8.3 con las bandas de 8-k. Hasta el 3a el script lleva su propia copia de la curva, porque `paceAt` no existe todavía (decisión 17-c); en el 3a pasa a importarla y la cifra no se puede mover.

**Qué ve el dueño.** La web carga antes, él y cualquiera: la respuesta de una etapa pasa de 0,95-2,16 MB a 22-50 KB comprimidos (mapa 02 §7). Nada más cambia.

**Se revierte con** quitar la línea del `register` (revert del PR). No guarda nada.

**Coste.** Un PR de `typecheck` y rápida; 1 sesión de trabajo (estimado).

**Riesgo.** Bajo. Comprimir una respuesta de 2,7 MB cuesta 7,8 ms con brotli 4 y 14 ms con gzip (estimado, `l6/comprimir.mjs`, JSON sintético), y por encima de su umbral síncrono el plugin comprime con flujos, fuera del bucle de eventos (`index.js` l. 144-149). Si el borde de Railway ya comprime, no está en el código (§1.11): el plugin no estorba.

### 17.4 Paso 1 (1a, 1b) · Noticias con datos, antes del reinicio

El único paso con fecha. «El plazo queda en: **antes del reset**, añadir `seed` y `data` a `news` y mover el renderizado al momento de leer. Después del reset, cada noticia escrita sí es definitiva, porque a partir de ahí no habrá otro borrado.» (`docs/agenda.md` l. 131-133). Por eso la `0043_noticias_con_datos` es la primera migración de E2 (D-45, O-06, [DOC 1]), el 1a no depende de nada y va en paralelo con todo lo demás, y es lo primero que se fusiona si el reinicio se acerca. `ENGINE_VERSION` no se entera: el motor no se toca en el 1a (su `renderNews` sigue exportado y sin llamadores hasta el 4a, decisión 4-p).

**PR 1a** · M · base, `shared` y API · no depende de nada.

**Tests primero.**
- `packages/shared/src/news.test.ts` (nuevo, §12.8): un golden por `kind`, los trece, con un resolutor de prueba; el inglés de hoy (`packages/engine/src/world/news.ts` l. 33-50) carácter a carácter salvo la coma de `contract`; cada titular por debajo de 70 caracteres con nombres cortos; `newsPayloadSchema` rechaza un payload sin `prevHealth` o con un `reason` desconocido. Con él nace B4, la parte de las noticias.
- `packages/db/src/news.test.ts` (nuevo, PGlite): `emitNews` escribe `data`, `seed`, `race_key`, `stage_day`, `tpl_rev` y `text`; leer da el mismo texto que se escribió (B4); una fila anterior a la `0043`, solo con `text`, se sigue leyendo; el orden del día es el de la tabla de prioridades de §12.8.
- `packages/db/src/stageRun.test.ts` gana: `breakaway_win` solo con el ganador en un grupo `fuga` en la última foto (12-g); `gc_lead_taken` y `jersey_taken` cuando cambia el primero de la clasificación, nunca en la primera ni en la última etapa (12-h); `injury` con `prevHealth` y `prevUntilDay`.
- `packages/db/src/abandon.test.ts` l. 232-237 se re-sella: el titular se comprueba renderizando `data`, no leyendo `news.text`.
- `packages/db/src/migrations.test.ts` gana el índice `news_race_stage_idx`, la restricción `news_text_or_data` con los casos de `l3/aplicar2.mjs` (sin `text` ni `data`, código 23514; solo con `data`, entra) y el caso nuevo del mundo vivo (una copia de `drizzle/` con `_journal.json` cortado en `0042_transicion_e1`, migrar, escribir una fila en cada tabla que tocan las cuatro, migrar con la carpeta entera y leer las filas viejas), que el 5, el 7a y el 8a amplían (§13.10).
- `packages/db/src/columnasVivas.test.ts` con la expresión de 13-a. Nace en verde: sobre el esquema de hoy solo añade `worlds.repairVersion`, que se escribe (`worldRepair.ts` l. 46).
- `yesterday.test.ts`: `newsItemSchema` y `teamNewsItemSchema` con `.omit` de sus seis campos nuevos.

**Código.**
- `packages/db/src/schema.ts`: la tabla `news` de §13.2, y `pnpm --filter @cyclingstar/db exec drizzle-kit generate --name noticias_con_datos`.
- `packages/shared/src/news.ts` (los tipos de §4.12, `newsPayloadSchema`, `abandonReasonSchema`, `ABANDON_WORDS`, `outFor`, `NEWS_VARIANTS`, `renderNews`) y `packages/shared/src/render/variants.ts` (`Variant`, `pickVariant`, `fnv1a`, `TEMPLATE_REV` a 0), exportados en `packages/shared/src/index.ts`. `contracts.ts` importa `newsPayloadSchema` de `news.ts` y no al revés (14-a) y ensancha `newsItemSchema` (l. 787-799) y `teamNewsItemSchema` (l. 705-709) con los seis campos `.nullish()` de §14.2.
- `packages/db/src/news.ts`: `emitNews` con payload y semilla, y `text` redactado con `renderNews` hasta DD-19; `getGlobalNews`, `getTeamNews` y `getRiderNews` redactan al leer; el orden nuevo; `newsNames(db, payloads)`.
- `emitNews` gana la firma de §12.8 (`opts.seed`, `opts.payload`, `opts.raceKey`), y los que la llaman pasan su payload (§13.2): `stageRun.ts` l. 1069, 1131, 1210, 1223 y 1247, más `gc_lead_taken` y `jersey_taken` en `awardOutcome` (§12.8) y la condición de la fuga (12-g); `riderSchedule.ts` l. 299; `packages/db/src/contracts.ts` l. 332, con `housingCovered` (12-j); `rollover.ts` l. 326. El `teamId` de todo titular de etapa es el de `input.riders[].teamId`, que `awardOutcome` pasa a recibir (hoy no la recibe, l. 1143-1149): la misma fuente que el reparto congelado (D-15) y la voz (§12.7) (decisión 17-r). Se retiran `ABANDON_DETAIL` y el `outFor` de `applyIncidents` (§12.8).
- `/api/news` y `/api/teams/:id/news` mandan `payload`, `seed`, `tplRev`, `raceId`, `raceKey` y `stageDay`, y `text`.

**Bancos.** B4 (las noticias). **Qué ve el dueño**, y cualquier jugador: dos titulares nuevos en el feed desde la primera etapa corrida con el 1a (`X takes the overall lead at the Race Y.`, pantalla, y los de puntos y montaña) y el de `contract` sin el espacio antes de la coma, que el PR dice en su descripción. **Se revierte con** revert del código; la `0043` es inerte (columnas que admiten null, `text` se sigue escribiendo y la restricción la cumplen todas las filas viejas). **Coste**: 2 sesiones (estimado). **Riesgo**: que el reinicio llegue antes que el 1a, y las noticias del mundo nuevo nazcan sin datos para siempre; la defensa es que no depende de nada.

**PR 1b** · S · web · depende del 1a.

**Tests primero.** `apps/web/src/domain/newsFeed.test.ts` l. 32-44 se re-sella: el enlace sale de `raceId` y `raceOfHeadline` desaparece (§16.1).

**Código.** `raceOfHeadline` (`apps/web/src/domain/newsFeed.ts` l. 17-24) muere y el feed enlaza por `raceId`; `NEWS_KIND_LABEL` (`labels.ts` l. 167-181) gana `gc_lead_taken: 'Leader'` y `jersey_taken: 'Jersey'` (pantalla); `stage_ready: 'Watch'` llega con el marcador, en el 9b.

**Qué ve el dueño**: el feed de siempre, con los enlaces sacados del dato y no del inglés. **Se revierte con** revert. **Coste**: media sesión. **Riesgo**: ninguno.

### 17.5 Paso 2 · La voz causal

**PR 2** · M · API, `shared` y web · no depende de nada (en la práctica, tras el 0).

La voz es `buildChronicle` con la entrada truncada por `revealS`, el orden por la hora de revelado, la longitud de la etapa como dato y cinco pasadas apagadas (D-43, 12-a). Nadie la llama todavía: la llamarán la ruta del tramo en el 3a y la pantalla en el 3c. Nace con B19, y B19 nace con el `revealS` de lo guardado, el que calcula el adaptador de la radio sobre su reloj estimado (16-a): por eso este PR trae ya el reloj estimado de la cabeza y las reglas de revelado, y el 3a construye el adaptador encima (decisión 17-d).

**Tests primero.**
- `apps/api/src/chronicle.test.ts`, `describe('la voz en vivo')` (§12.2): un suceso con `revealS > untilS` no sale; una concesión seguida de una captura revelada después no lleva `cazada`; `toGo` y `desenlace` salen de `stageKm` y no del último suceso; una criba lejana no se borra aunque la carrera se recomponga; ataque y captura en 3 km son dos líneas; tres descuelgues en 5 km son tres líneas; a igual km manda `revealS`. Los 62 de hoy siguen sin tocarse, y son la prueba de que el acta es la de hoy.
- `apps/api/src/voicePrefix.test.ts` (nuevo): B19 en las cinco etapas en línea congeladas, la voz construida como lo hará la ruta del tramo cada 30 s de carrera hasta el borde de la meta: la de `t` es prefijo exacto de la de `t + 30 s`. Un segundo `it` corre lo mismo con `BROADCAST.liveClusters` y a todos los corredores sin rótulo, que es el peor caso (`l8/voz2.mjs` dio 0); el 6b lo repite con la política de nombres real (§12.3, DD-18).
- `apps/web/src/domain/voice.test.ts` (nuevo): `inVoice` deja fuera `front_group`, `time_gap` y `time_gap_run`, y el descuelgue de un corredor sin rótulo; el de uno con rótulo, dentro; el propio descuelgue no cuenta para nombrarle (12-m).
- Los fixtures, primera mitad (16-a): `scripts/broadcast-fixtures.mjs` (nuevo) escribe en `apps/api/src/__fixtures__/broadcast/`, desde el `dist` del motor, `<etapa>.events.json.gz`, `<etapa>.radio.json.gz` (salvo en la crono) y `<etapa>.acta.json.gz` de las seis etapas congeladas (`race-france` e7, e18, e20 y e16, la crono; `race-flanders` e1; `race-colombia` e5, 126 corredores; semilla 0 y el campo del banco), más `manifest.json` con motor, semilla, campo, tamaños y `sha256`, y `load.ts` con `FIXTURES`. Regenerarlos es un PR propio, nunca el efecto de una subida de versión del motor (§16.2).

**Código.**
- `apps/api/src/chronicle.ts`: `LiveChronicle`, `BuildChronicleOptions.live`, las dos firmas de `buildChronicle`, la entrada por `revealS`, el orden de 12-a, la longitud como dato en `followTheLeader`, `clockTheGaps` y `markReunion` (l. 545, 637 y 945) y las cinco pasadas apagadas (`markConcession` l. 319, `dropUndoneSelections` l. 361, `groupGapRuns` l. 362, `foldQuickAttacks` l. 371, `groupRuns` l. 375).
- `apps/api/src/liveClusters.ts` (§12.3), detrás de `BROADCAST.liveClusters`, que nace apagada.
- `apps/api/src/broadcastSource.ts` nace con `estimatedHeadClock` (§3.8) y el `revealS` de los sucesos guardados sobre ese reloj con `revealSOf`.
- `packages/shared/src/broadcast/`: `timeline.ts` (los tipos de §4.1 y §4.2, sin código), `reveal.ts` (`REVEAL_RULES`, `TT_REVEAL_RULES`, `revealSOf`, `RecorderView`), `constants.ts` (`BROADCAST` y `SPOILER` enteros, §15.3 y §15.4, con las once de 15-e) e `index.ts`.
- `apps/web/src/domain/voice.ts` (`inVoice`).
- `eslint.config.js`: las dos reglas de 15-b (el motor no importa `BROADCAST` ni `SPOILER`; `broadcast/{timeline,codec,reduce,reveal}.ts` no importan `./constants.js` ni `./index.js`), en el PR en que nacen los bloques que protegen (decisión 17-e).

**Bancos.** B19. **Qué ve el dueño**: nada; la voz no tiene todavía quién la pida. **Se revierte con** revert; no guarda nada. **Coste**: 2 sesiones (estimado). **Riesgo**: bajo y medido: con el `revealS` real, 0 violaciones del prefijo en 18 corridas y 12.083 pasos (`l8/voz.mjs`), frente a 44 ordenando por `tS` y 574 con el acta truncada sin más (§12.2); `dropLoneChaseGaps`, que D-43 dejaba sin medir, no rompe nada (V1 y V3 dan 0).

### 17.6 Paso 3 (3a API, 3b dominio web, 3c pantalla) · `Watch` para el dueño sobre la radio de hoy

El dueño caza defectos mirando: catorce tandas desde la radio (mapa 05 §2.8, [DUEÑO 10]). Por eso es el primero que ve la retransmisión, tras cuatro PR y sin tocar el motor ni la base: `Watch` (pantalla) sobre la radio que ya se guarda, con el reloj estimado del adaptador (D-07) y detrás de `BROADCAST_WATCH=admins` (I-45, D-53, D-54).

**PR 3a** · L · API y `shared` · depende del 2.

**Tests primero.**
- `apps/api/src/broadcastCut.test.ts` (nuevo): B9, con el código entero de §16.4, sobre las cinco etapas en línea congeladas; hasta el 6a `loadTimeline` construye la línea del adaptador con `<etapa>.radio.json.gz` y `.events.json.gz`. La crono entra en el 6b: sin línea no tiene retransmisión (decisión 3-d).
- `packages/shared/src/broadcast/pace.test.ts` (nuevo), las filas del 3a de §8.12: `paceAt` en los bordes de cada zona (a 50,0 km, ×30; a 50,01 km, ×60; en la línea, la del último km) y `pace` y `summaryPace` bajando por `aboveKm` hasta 0; `playbackEstimateS` con los `altM` de las cinco etapas de §8.3 da 8:12, 9:08, 13:10, 11:06 y 15:36, y la de `Highlights` de la e18, 4:25.
- `apps/api/src/broadcastPace.test.ts` (nuevo): B17 en la rápida, la curva sobre las cinco etapas en línea congeladas con las bandas de 8-k (§16.4); la crono entra en el 6b y el digest en el 10a.
- `packages/shared/src/broadcast/reduce.test.ts` (nuevo): I1 e I3 de la suite rápida sobre fotos sintéticas (D-52, §16.2).
- `packages/shared/src/broadcast/instant.test.ts` (nuevo): los casos nuevos de `groupRoleOf` y `groupLabelOf` de §6.3 y los de `mainGapOf` (§6.2).
- `apps/api/src/broadcastConstants.test.ts` (nuevo, §15.5): `bunchMinShare`, `chaseMinShare`, `photoBlocksOf` en las 1.418 etapas del calendario (224 ms medidos) y los ids de `SPOILER.headlineRaces`. Las dos copias que necesitan una exportación nueva del motor (`nameWholeGroupUpTo` y `chaseRefOf`) entran en el 4a.
- `apps/api/src/routes/broadcast.test.ts` (nuevo, §14.7): la cabecera, el tramo, la meta y el acta sobre PGlite con una etapa corrida: cada 2xx pasa `schema.parse` con su esquema y cada error, con `apiErrorBodySchema`; 404 `broadcast_off` a quien no es administrador con `admins`; 404 `broadcast_unavailable` en una crono sin línea. El tope de lo alcanzado (B18) llega en el 7b.
- `apps/api/src/raceRadio.test.ts` gana los casos de `veilStoredRadio` que el adaptador necesita: un grupo de 13 o más se queda con los doce primeros que tiran y los nombrables, uno de 12 no cambia, `size`, `pullingTotal` y `unnamed` cuadran tras `buildRaceRadio`, y en una etapa del banco ningún corredor del top 10 de la etapa que no sea nombrable sale en un grupo grande (§11.19; aquí y no en el 7b, decisión 17-f).
- `apps/api/src/app.test.ts`: `/health` sin interruptores sigue igual (l. 46-55) y con ellos lleva `features` (14-l); `yesterday.test.ts` la pasa sin `features`; `spoilerRegistry.test.ts` gana las cuatro rutas nuevas.

**Código.**
- `packages/shared/src/broadcast/`: `cut.ts` (`visibilityOf`, `cutTimeline`, `chunkOf`), `reduce.ts` (`reducePhoto`, `photoAt`), `instant.ts` (`instantAt`, `photoBlocksOf`, `groupRoleOf`, `mainGapOf`, `groupLabelOf`, `chaseRefOf`, `isGroupRole`, `InstantContext`), `wire.ts` (los tipos y esquemas de §4.11 de la cabecera, el tramo, la meta y el acta; `WatchMode`, `stageQuerySchema`, `chunkQuerySchema`, `finishBodySchema`, `stageGateErrorSchema`), `pace.ts` (`paceAt`, `playbackEstimateS`) y `names.ts` (`GROUP_WORDS`, `groupLabelText`). En `contracts.ts`, `stageGateSchema`, `watchStateSchema`, `preStageInfoSchema` y `switchModeSchema`, y la reexportación de `wire.ts` en `index.ts` detrás de `contracts.js` (14-a: al revés, el paquete no carga).
- `packages/db/src/horizon.ts` nace con los tipos de §4.10 que viven allí y las funciones puras `worldHorizon`, `anonHorizon()`, `isVeiled`, `throughStage` y `stageGateOf`: `timelineForStage` recibe un `Horizon` desde que existe (14-p), y `computeHorizon` llega en el 7a (decisión 17-g).
- `apps/api/src/broadcastSource.ts`: el adaptador de la radio (§3.8: la `StageTimeline` degradada, la identidad por posición, `clock: 'estimated'`, `source: 'radio'` y la lista de seguimiento cortada al construirla, para todos, con `veilStoredRadio` y el conjunto de nombrables de 11-l) y `timelineForStage(db, h, raceKey, stageDay)` con solo esa rama y su LRU.
- `apps/api/src/routes/broadcast.ts`: la cabecera, el tramo con su voz (`buildChronicle` con `live`, §14.3), `POST …/broadcast/finish` sin escribir nada (`race_watch` llega en el 7a) y el acta, con `?season=` y `?diag=1` aceptados (el modo diagnóstico actúa en el 7b).
- `apps/api/src/spoiler.ts` nace en su primera forma (decisión 17-h): los tipos de §14.5, el aumento de `FastifyContextConfig` y `FastifyRequest`, y `registerSpoilerGuard`, que apunta cada ruta en `app.spoilerRegistry` (con `policy` y `veil` opcionales hasta el 8a) y pone `viewer()` (solo la sesión), `broadcastOn()`, `spoilerApplies()` (siempre falso) y `horizon()` (`worldHorizon` con sesión, `anonHorizon()` sin ella).
- `apps/api/src/env.ts` gana `BROADCAST_WATCH` (§14.6); `app.ts`, `AppDeps.switches`; `routes/health.ts`, `features`; `index.ts` pasa los interruptores.

**Bancos.** B9 y B17 en la rápida. **Qué ve el dueño**: nada todavía: la pantalla es el 3c. **Se revierte con** `BROADCAST_WATCH=off` (las tres rutas dan 404) o revert. **Coste**: 3 sesiones (estimado). **Riesgo**: el adaptador pinta mal a los grupos que no son la cabeza: sin identidad ni marcas de composición, interpolar entre fotos llega a errar kilómetros (`estado.md` §3.6, 3,5 km en Flandes con identidad), y B22 solo mide la cabeza (duda 1 de §3). El dueño lo verá, que es para lo que se le enseña.

**PR 3b** · M · web · depende del 3a.

**Tests primero.** `apps/web/src/domain/broadcast/player.test.ts` (nuevo), las filas del 3b de §8.12: la parte del ritmo de B9 (la misma línea con sus sucesos y con `events` vacío da la misma `t` fotograma a fotograma, a 60 fotogramas por segundo); las siete comprobaciones de §8.11 en cada paso de 1.000 secuencias de acciones al azar; la red, con un servidor falso que aplica la admisión de §10.11 y responde a los 150 ms, las cinco etapas de §8.3 enteras a ×1 y ×4 sin un solo 409.

**Código.** `apps/web/src/domain/broadcast/player.ts` (`playerInit`, `playerStep` y los tipos de §8.11; los informes llevan lo alcanzado y nunca `t`, 8-q); `apps/web/src/api/broadcast.ts` (`fetchBroadcastHead`, `fetchBroadcastChunk`, `postBroadcastFinish`, `fetchStageReport`); en `queryClient.ts`, los defectos de `['broadcast-chunk']` y `['broadcast-head']` (§14.11). Los efectos de informe del reproductor no se ejecutan hasta el 7a, cuando existe `POST /api/me/watch`.

**Qué ve el dueño**: nada. **Se revierte con** revert. **Coste**: 2 sesiones. **Riesgo**: bajo: es un reductor puro.

**PR 3c** · M · web · depende del 3b.

**Tests primero.** `apps/web/src/components/broadcast/FixedOverlay.test.tsx` y `GroupBar.test.tsx` (nuevos; render estático con `renderToStaticMarkup`, como `leaderJerseys.test.tsx` l. 2): los km a meta con un decimal y los metros en el último km, `3 laps to go`, la diferencia principal con su referencia (`on the bunch`), `s.t.` por debajo de `sameTimeS` y `Bunch together` (pantalla); una fila por grupo en orden de carretera y `+3 groups · 41 riders` por encima de `mobileGroupRows` (6-c). El 6b los amplía con lo que §16.6 les pide.

**Código.** `apps/web/src/pages/StageWatch.tsx` y `apps/web/src/components/broadcast/` (`FixedOverlay`, `GroupBar`, `ProfileStrip`, `VoiceTicker` y `PlayerControls` con pausa, velocidades y `Commentary`, pantalla); la pestaña `Watch` en la página de etapa de hoy, solo si `/health.features.broadcastWatch` no es `off` y la cabecera responde (con 404 `broadcast_off`, la página de hoy); el aviso `Recorded before full race data` (pantalla).

**Qué ve el dueño.** Con `BROADCAST_WATCH=admins`, abre una etapa de producción, pulsa `▶` (pantalla) y ve la capa fija, la barra de grupos con sus palabras, el perfil con un cursor por grupo y la voz a su hora, al ritmo de la curva de §8.2 (de 7:39 una llana a 19:59 la reina más larga, medido por el juez de ejecutabilidad). Con el reloj estimado y los grupos por su posición; sin rótulos de suceso (6a) ni de corredor (6b). El jugador, nada. **Se revierte con** `BROADCAST_WATCH=off`. **Coste**: 2 sesiones. **Riesgo**: el móvil no se mide hasta el 10b (§18.5).

### 17.7 Paso 4 (4a ganchos, 4b grabador) · El único que toca `packages/engine`

Los dos únicos PR de E2 que pagan los ocho tramos de bancos (D-54, X-22), y ninguno sube la versión (D-09): guardar lo que la sonda ya ve no cambia una carrera, medido en 20 de 20 etapas por el juez del motor (C5) y en 24 de 24 con los tres ganchos puestos (`l3/huella.mjs`, §5.1). Todo lo que E2 necesita dentro de `packages/engine/`, código y tests de banco, entra aquí, porque después ningún PR de E2 toca ese camino (decisión 17-i).

**PR 4a** · M · motor · no depende de nada: puede ir en paralelo con los pasos 1 a 3.

**Tests primero.**
- `packages/engine/src/stage/probeHooks.test.ts` (nuevo; suite rápida, porque `stage/` sí corre en `test:rapido`): la prueba de humo de B11 con ganchos que solo cuentan, en una etapa en línea y una crono: huella idéntica en `results`, `events`, `efforts` e `incidents` con y sin ganchos; en la etapa en línea, `onEvent` tantas veces como sucesos y `onBanner` una por pancarta con puntos; en la crono, `onTimeTrialRide` una por corredor y ni `onSnapshot` ni `onEvent`, que la crono no llama (§5.2).
- `packages/engine/src/stage/timetrial.test.ts` gana (§9.8): la sonda se llama una vez por corredor, en orden de id; la salida es idéntica con y sin sonda; lo que recibe cada llamada reproduce `results[r].tiempoS` al redondear.
- `packages/engine/src/world/news.test.ts` se muda a `packages/shared/src/news.test.ts`, que ya lo cubre desde el 1a, y se borra.
- `apps/web/src/domain/stageJournal.test.ts`: el test de los tres nombres (l. 1646-1650) se re-sella a cuatro (§12.6).
- `apps/api/src/broadcastConstants.test.ts` gana `nameWholeGroupUpTo` = `NAME_WHOLE_GROUP_UP_TO` y `chaseRefOf` contra `chaseReferenceIndex` sobre entradas generadas (§15.5, 6-a).

**Código.**
- `stage/types.ts`: `ProbeBanner`, `ProbeTimeTrialRide` y los tres métodos opcionales de `StageProbe` (§5.2). `stage/events.ts`: `EventLog.listen`. `stage/simulate.ts`: `onEvent` con el bloque de emisión, `onBanner` en `disputeBanner` (l. 9175) y `disputeClimb` (l. 9231) y la sonda pasada a `simulateTimeTrial` (l. 1264). `stage/timetrial.ts`: `onTimeTrialRide`.
- `sim/coherence.ts`: las filas de `GROUP_NOUNS` de la tabla de §12.6 (las de `mainNoun`, la de `crash` con los cuatro nombres y las vacías de las plantillas nuevas) y `the gruppetto` en `WATCHED_GROUP_NOUNS`, entre `the favourites` y `the fast men` (l. 612-613: la lista va de más larga a más corta).
- `sim/raceRadio.ts` pone `export` a `NAME_WHOLE_GROUP_UP_TO` (l. 611; 15-c), y `index.ts` lo exporta junto con `chaseReferenceIndex` (duda de §6).
- `world/news.ts` pierde `renderNews` y `NewsData` (l. 21-58) y `index.ts` deja de exportar `NewsKind` (4-p); `packages/db/src/stageRun.ts` importa `AbandonReason` de `shared` y borra el suyo (l. 1017).

**Bancos.** Los ocho tramos, porque el motor cambia. `coherence.test.ts` l. 347-360 («el vocabulario de grupos no pasa de tres nombres») sigue en verde: `crash` no lo emite el motor (D-13) y la unión de las filas de las plantillas que sí emite sigue siendo `the bunch`, `the chase group` y `the lead group`; la cifra de `storyMetrics` (`coherence.ts` l. 735-737) se remide sobre las 60 etapas de ese test y va en la descripción del PR (§16.1). **Qué ve el dueño**: nada. **Se revierte con** revert; no deja datos. **Coste**: la rápida más los ocho tramos (regla 4); 2 sesiones. **Riesgo**: que un gancho mueva una tirada del RNG: excluido por construcción (ninguno tira un dado, devuelve algo ni recibe un objeto que el motor vuelva a leer con otro valor, §5.2) y medido; B11 lo sella.

**PR 4b** · L · motor, `shared` y base · depende del 4a y del 3a (`instantAt`, `photoAt` y `photoBlocksOf` son del 3a).

**Tests primero.**
- `packages/engine/src/sim/timeline.test.ts` (nuevo; en el tramo «mundo y radio» en este mismo PR, 15-d): B11 entero (el código de §16.4: doce etapas por dos semillas, seis de ellas cronos, con el grabador de verdad y comprobando que los ganchos se llaman); I1 en las 24 etapas por dos semillas, con la tolerancia de relojes iguales que cubre también el `kind` (§5.5); I3; I5 exacta (9-a); B6 del JSON de `encodeTimeline` contra `TIMELINE.maxJsonBytes` y `medianJsonBytes` (§15.2; el motor no comprime ni en sus tests, 16-n). Y, porque es el último PR de E2 que toca el motor, las versiones de banco de I2 (la igualdad exacta en el km de foto y el tránsito con p90 ≤ 15 por etapa y ≤ 4 en el conjunto, 16-b), B2 (0 contradicciones de pertenencia y ±15 s en el 95 % de los huecos, 16-j) y B21 (informativo; falla si llega a 1 km), que §16.9 fechaba en el 6a (decisión 17-i).
- `packages/db/src/timelineCollector.test.ts` (nuevo): B10 entero (§16.4): tres etapas en la rápida y la envoltura ingenua que tiene que romper alguna; las 22 etapas en línea por dos semillas con `CS_BANCOS=1`.
- `apps/api/src/broadcastFixtures.test.ts` (nuevo, rápida): I1, I3 e I5 contra `<etapa>.timeline.gz` y `<etapa>.i1.json.gz`, y B6 del `bytea` con gzip 9 de las seis contra `TIMELINE.maxStoredBytes` y `ttMaxStoredBytes`; el 6a le añade I2, B2 y el B6 de lo servido, el 6b B3, y el 11, B16.
- Siguen en verde sin tocarse `packages/engine/src/sim/raceRadio.test.ts` y `packages/db/src/stageRun.test.ts` l. 322-339: sacar `radioGroupDetails` de `radioForStorage` no cambia un byte de `stage_snapshots.radio` (5-g).
- Los fixtures, segunda mitad (16-a): `scripts/broadcast-fixtures.mjs` escribe con el grabador real `<etapa>.timeline.gz` (gzip 9 de `StoredTimelineV1`) y `<etapa>.i1.json.gz` de las seis.

**Código.**
- Motor: `sim/timeline.ts` (`timelineRecorder`, `TimelineRecorder`, `RecorderFinishInput`, `profileStripOf`, `freezeStageWeather`, `selfCheckI1`, `selfCheckI5`, `ttTraceOf`, la guarda `SNAPSHOT_FIELDS`, `PROBE_HOOKS`, `CODES_MATCH` y `ORIGIN_OF_PREFIX`, e `I1Mismatch`; §5.4 y §5.5); `sim/raceRadio.ts` exporta `STORED_PULLERS_MAX` y saca `radioGroupDetails` (5-g); `constants.ts` gana el bloque `TIMELINE` (§15.2) detrás de `STAGE`, exportado en `index.ts` (l. 9-19); `index.ts` exporta además `realRaceScenario` (hoy sin exportar, `sim/scenarios.ts` l. 518), que B10 importa desde `packages/db` (decisión 17-j).
- `shared`: `broadcast/codec.ts` (`StoredTimelineV1`, `encodeTimeline`, `decodeTimeline`, `storedTimelineV1Schema`, `ORIGIN_CODE`, `BANNER_CODE`, `TimelineFormatError`), con el formato 1 cerrado (regla 10 y decisión 17-a).
- Base: `packages/db/src/timelines.ts` nace con `startStageTimeline`, el colector aparte de §5.3, sin llamador: el 5 lo engancha al tick.
- CI: `.github/workflows/ci.yml` mete `packages/engine/src/sim/timeline.test.ts` en «mundo y radio» (l. 166-175), y `.github/workflows/cobertura.yml` pone `CS_BANCOS: '1'` en el paso `pnpm test:coverage` (l. 63-64), que es el nocturno (§16.4, B10).

**Bancos.** Los ocho tramos. «Mundo y radio» (5,5 min medidos en la corrida de `ci.yml` l. 128) crece de 2 a 5 min (estimado: 48 simulaciones con foto en cada bloque y grabador y las 24 de B11, sin y con sonda, a entre 0,5 y 3 s cada una). **Qué ve el dueño**: nada: nadie llama al grabador. **Se revierte con** revert; no ha escrito nada. **Coste**: la rápida más los ocho tramos (regla 4); 4 sesiones. **Riesgo**: que el formato crezca por encima de los topes de §15.2 (D-11), fijados sobre lo que midió L3 con el prototipo (§5.7): hasta 70,0 KB por etapa en línea contra 96 KB, hasta 464 KB de JSON contra 640 KB (222 de mediana contra 256) y hasta 24,2 KB las cronos de 176 corredores contra 32 KB. Si pasa, B6 se pone en rojo y el PR no se cierra hasta ver qué creció (15-g). No se pierde nada en producción, porque son umbrales de banco y no de escritura (15-g).

### 17.8 Paso 5 · Grabar la línea

**PR 5** · L · base, API y `shared` · depende del 4b.

Desde este PR cada etapa corrida con `TIMELINE_RECORD=on` deja su fila en `stage_timelines`, en la misma transacción que `stage_snapshots` y en su punto de guardado (§5.5, §5.6). Nadie la sirve todavía: la retransmisión sigue saliendo del adaptador hasta el 6a. El reparto congelado entra aquí entero, con los maillots llevados, los títulos y la notoriedad, porque se congela al grabar (D-15) y lo guardado no se reescribe (D-10): si llegara en el 6b, las líneas grabadas entre medias quedarían sin él para siempre (decisión 17-k).

**Tests primero.**
- `packages/db/src/timelines.test.ts` (nuevo, §5.10 y §13.10 punto 5): la vuelta del `bytea`, igual byte a byte y descomprimida a lo escrito; la lápida (`format` 0) hace que `readStageTimeline` lance `TimelineUnavailableError` y se queda en el LRU; escribir dos veces deja una fila (`onConflictDoNothing`); una etapa sin fila da null.
- `packages/db/src/stageRun.test.ts` gana: con `spec.timeline`, la etapa escribe su fila en la misma transacción que `stage_snapshots`; sin él, que es `TIMELINE_RECORD=off`, la envoltura es byte a byte la de hoy; un grabador que lanza (forzado) deja una lápida y la nota `timeline I1: …` o `timeline error: …` en `tick_log.notes`, y el día se confirma igual.
- `packages/db/src/migrations.test.ts` gana `stage_timelines` y `stage_timelines_day_idx` y amplía el mundo vivo; `schema.test.ts`, `getTableName(stageTimelines)`.
- `packages/shared/src/jerseys.test.ts` gana los 18 casos de `wornJerseys` y `distinctions` de §7.2; los de hoy no se tocan ni se re-sellan.
- `packages/db/src/titles.test.ts` (nuevo, §7.4): sin filas, mapa vacío; un ganador de `nc-it-road` el día 179 no es campeón el 179 y sí el 180, con `validToDay` 543; `nc-it-u23-road` no da un título de élite (la trampa de `LIKE`).
- `packages/db/src/cast.test.ts` (nuevo): el de 7-b, `wornJerseys` sin títulos igual a `leadersThroughStage(N−1)` en las etapas del banco salvo empates exactos a puntos; `knownWins` con la consulta de 7-e; el `from` de cada dato.

**Código.**
- Base: en `schema.ts`, `stageTimelines` con el `customType` `bytea` (§13.3), y `drizzle-kit generate --name linea_temporal` (con `tpl_rev` si se acepta 12-c: decisión 17-a). `timelines.ts` se completa con `recordStageTimeline`, `writeStageTimeline`, `writeStageTimelineFailure`, `readStageTimeline(db, h, raceKey, stageDay)` con su LRU, `TimelineUnavailableError`, `TIMELINE_TOMBSTONE_FORMAT` y `timelineTickLog`. `stageRun.ts` cambia la envoltura de l. 515-536 por la de §5.3 y llama a `recordStageTimeline` tras el `insert` de `stage_snapshots` (l. 570-595); `StageRunSpec` y `CalendarDayOptions` (`calendarRun.ts`) ganan `timeline`; `tick.ts`, `RunTickOptions.timelineRecord` y el resumen en `tick_log.notes` (l. 337-347). `cast.ts` (`buildTimelineCast`, con los `favourites` de 8-g, que B1c necesita) y `titles.ts` (`ChampionTitleSource`, `palmaresTitleSource`, `Queryable`, 7-k).
- `shared`: `jerseys.ts` gana `ChampionTitle`, `WornJersey`, `Distinction`, `WornInput`, `wornJerseys`, `distinctions`, `notorietyOf` y `staticNotoriety`; `JerseyKind` sigue con tres valores y `leaderJerseys.test.tsx` sigue en verde.
- API: `env.ts` gana `TIMELINE_RECORD` en `envSchema` y `tickEnvSchema`; `apps/api/src/tick/main.ts` (l. 11) y `index.ts` (l. 38, 45 y 67) pasan `timelineRecord` a `runTick`.
- Los dos comentarios que no dicen la verdad (13-i): `schema.ts` l. 754 («~22 KB», cuando el juez del motor midió de 10,7 a 146,4 KB en `jsonb`) y `stageRun.ts` l. 74 (`stage_runs`, que no existe).

**Bancos.** B15, a mano: `scripts/bench-tick.mjs` (nuevo, §16.4) corre en una base de prueba los días 176 (187 cronos nacionales) y 179 (153 nacionales en línea) con `TIMELINE_RECORD=off` y `on`, con el grabador y la escritura de verdad, y la cifra va al PR; falla si un mismo día suma a la vez más de un 25 % y más de 15 s, o si deja alguna lápida (16-l). B6, a mano: `scripts/broadcast-fixtures.mjs --sizes` mide el `bytea` de las 24 etapas por dos semillas contra los topes de §15.2 (16-n); el JSON y el `bytea` de las seis ya corren desde el 4b, y el tick apunta una nota de tamaño cuando una línea pasa de su tope (15-g). `selfCheckI1` actúa en cada etapa desde este PR (D-12).

**Qué ve el dueño**: nada en pantalla; en el panel de administración, las notas del tick (`timeline: 312 grabadas, 1 sin línea`, §5.5). **Se revierte con** `TIMELINE_RECORD=off` en Railway, sin desplegar (las etapas de esos días quedan sin fila y abren con el adaptador), o revert; la `0044` es inerte. **Coste**: 3 sesiones (estimado).

**Riesgo.** El tick del día 179: el prototipo sumó de +15,5 a +18,9 s, del 15 al 17 %, y con la regla de 16-l pasa, porque no supera las dos cotas a la vez (§18.3); falta la escritura de las 153 filas, estimada de 0,2 a 0,5 s más, que es lo que este PR mide. `TIMELINE_RECORD=off` es el freno. Un PR de la táctica que cambie los sucesos deja la etapa sin línea con lápida y nota, nunca en silencio (O-22, D-12). Y los favoritos: si 8-g no se acepta y el reparto no los congela, la cabecera los leería con los atributos de hoy, que difieren entre dos desenlaces, y B1c nacería en rojo en el 7a (nota de L4 en §16).

### 17.9 Paso 6 (6a línea, 6b rótulos y crono) · La retransmisión exacta

**PR 6a** · L · API, `shared` y web · depende del 5.

**Tests primero.**
- `apps/api/src/radioAdapter.test.ts` (nuevo): B22, la línea del adaptador construida desde `<etapa>.radio.json.gz` contra la grabada de la misma etapa: la posición de la cabeza, p99 ≤ `BROADCAST.estimatedClockMaxErrKm` (1 km). L1 midió como mucho 0,69 km (§3.8). Decide el adaptador (D-07, D-61): si da rojo, este PR borra su rama y toda etapa sin línea responde 404 `broadcast_unavailable` y abre en `Report` (§14.4); no es un interruptor, lo decide un banco.
- `apps/api/src/broadcastFixtures.test.ts` gana I2 (la igualdad exacta en el km de foto y el tránsito, 16-b) y B2 (16-j) en las cinco etapas en línea; `broadcastCut.test.ts` pasa a cargar la línea grabada.
- `packages/shared/src/broadcast/cues.test.ts` (nuevo, §16.6): `CUE_CLASS`, `CUE_OF_TEMPLATE` con las 54 plantillas y `crash`, `cuesBetween`, `cueClassOf` (6-g) y las reglas de la cola de 6-h.
- `apps/web/src/domain/broadcast/clientCost.test.ts` (nuevo): B8 con los umbrales de 16-m, `JSON.parse` y `safeParse` con mediana ≤ 2 ms el tramo mayor y ≤ 3 ms la cabecera, e `instantAt` con p95 ≤ 0,25 ms en 600 fotogramas (L7 midió 0,54 y 0,71 ms y un p99 de 0,036 a 0,056 ms con una aproximación del corte, §18.1). Este PR mide el `instantAt` de verdad y, si su p95 pasa de 0,05 ms, el umbral pasa a cinco veces lo medido, con la cifra en el PR.
- B6 de lo servido, con gzip 6 como `@fastify/compress` (16-h, 16-n): la cabecera ≤ `maxHeadGzipBytes` (16 KB; medido 7,1-9,0) y el tramo mayor ≤ `maxChunkGzipBytes` (12 KB; medido 0,23-4,72), con `app.inject` sobre las seis cargadas en PGlite por `broadcastFixtures.test.ts`; la meta ≤ `maxFinishGzipBytes` (40 KB; estimado 10-20), sobre la etapa corrida de `routes/broadcast.test.ts`, la única con resultado, general y noticias.
- `player.test.ts` gana que un `Cue` en la cola no para el reloj (D-21).

**Código.** `timelineForStage` lee primero `readStageTimeline` (con lápida, null y 404 `broadcast_unavailable`) y usa el adaptador solo sin fila (§14.4); `BROADCAST.decodedCacheEntries` se comprueba en 16, el valor de §15.3 (18-d: de 8 a 30 MB en lugar de los 33 a 121 que costaban 64); `cues.ts` en `shared`, con los cuatro topes de red de 16-h y `cardRowsMax` en `BROADCAST`; en la web, `CueCard` y la cola de rótulos en el reproductor (§6.5), los cursores que siguen al grupo por su sucesor (D-03) y la tendencia de la capa fija por la misma cadena (duda 6 de §3).

**Bancos.** B22, I2, B2, B8, B6 de lo servido y B9 sobre la línea. **Qué ve el dueño**: en las etapas corridas desde el 5, el reloj exacto y sin `Recorded before full race data` (pantalla), los cursores que no saltan al fundirse dos grupos y los rótulos de suceso (`ATTACK`, `CRASH`, `KOM`, pantalla). **Se revierte con** `BROADCAST_WATCH=off`, o revert (la línea se sigue grabando). **Coste**: 3 sesiones. **Riesgo**: B22 en rojo deja las etapas corridas entre el despliegue y el 5 solo en `Report` (D-61); con 0,69 km medidos no se espera.

**PR 6b** · L · `shared`, API y web · depende del 6a.

**Tests primero.**
- `packages/shared/src/broadcast/names.test.ts` (nuevo): los casos de la tabla de §7.6 con los tres más que da (el propio que además es notable; diez contados o más, en cifras; una carta con el título velado no sale como campeón), `namedRidersOf` (§7.7), `pullingLineOf` (6-d), `gapTrendLine` (§12.5) y los textos del rótulo, con los ocho países con artículo (7-d).
- Los de `apps/web/src/components/broadcast/` (§16.6) ganan las palabras de la barra (§6.3), el tránsito (`↓ 3 dropping back`, pantalla), `Your rider · in the bunch · +2:14` con sus variantes de 6-l y la carta del corredor con `ChampionMark`.
- B3 en `broadcastFixtures.test.ts`, sobre las seis y con la cabecera que arma la ruta: todo miembro de todo grupo nombrado o contado, y cada uno con su `RiderCard`.
- `apps/web/src/domain/templateCoverage.test.ts` (nuevo): B7 con el AST, las 54 plantillas que emite el motor (44 de carretera, `rider_defies_team` y las 13 de la crono, cuatro compartidas) más `crash`, cada una con frase, rótulo y regla de revelado.
- `apps/web/src/domain/stageJournal.test.ts`: los casos de `mainRole` y de las plantillas nuevas; «meteorito: Ana» (l. 89-93) da una línea vacía y no la clave (re-sello a propósito).
- `apps/web/src/domain/stageJournal.corpus.test.ts` (nuevo): B4 de la voz y del acta, cada `ChronicleEntry` de las actas congeladas da la misma frase dos veces y en dos procesos.
- `apps/web/src/components/raceRadioNames.test.tsx` (seis `it`) se re-sella con las palabras de D-18 (§6.3).
- `voicePrefix.test.ts`: el segundo `it` de B19 pasa a la política de nombres real sobre el reparto del fixture (DD-18).
- `packages/shared/src/broadcast/timeTrial.test.ts` (nuevo, §9.8); `pace.test.ts` gana `ttPaceAt` y `ttPlaybackEstimateS`; `broadcastCut.test.ts` gana la crono e16, y `broadcastPace.test.ts`, la banda de la crono de B17 (de 5:30 a 13:00).
- `voice.test.ts` gana `linesOf` (la caída y luego sus nombres) y `mainNoun`.

**Código.** En `shared`, `names.ts` completo (`breakHeadline`, `namedRidersOf`, `pullingLineOf`, `gapTrendLine` y los textos de §7), `timeTrial.ts` (`timeTrialInstantAt`), `ttPaceAt` y `ttPlaybackEstimateS` en `pace.ts`, y las variantes de crono de `Cue` (`tt_split`, `tt_finish`, 9-d). En la API, `serveCast` con `worldHorizon` (el velo le llega en el 7b) y `apps/api/src/voiceRoles.ts` (`withGroupRoles`, `MAIN_GROUP_TEMPLATES`) en la ruta del tramo y en la del acta (12-b): la ruta anota los papeles ANTES de atar cada suceso a su hora, porque la copia anotada es otro objeto (12-n), y con `liveClusters` encendida mete los racimos antes de `buildChronicle` (§12.3). En la web, los `case` nuevos de `stageJournal.ts` (`puncture`, `mechanical`, `truce_granted`, `truce_denied`, `crash`, `crash_names`), el `default` que devuelve la cadena vacía (D-44), `groupNounOf` y `linesOf`; `break_presented` en lugar de `breakaway_formed` en `Watch` (12-e) y `gap_trend`; la carta del corredor, `WornJerseyIcon` y `ChampionMark` en `Jersey.tsx` (7-h); `TimeTrialBoard`; y las palabras de D-18 en `RaceRadioPanel`.

**Bancos.** B3, B7, B4 (voz y acta), B19 con nombres y B9 de la crono. **Qué ve el dueño**: cada corredor con su carta y el maillot que lleva (D-24), la frase de la fuga (`The champion of Italy goes clear with four others.`, pantalla) donde haya campeones (en un mundo reiniciado, no antes del día 179 de la temporada 0, §7.4), la crono con `ON COURSE`, `SPLIT 1` y `HOT SEAT` (pantalla). Cualquier jugador ve, en el acta de siempre, frases donde había una clave cruda y `the chase group` en 40 de cada 210 líneas que antes decían `the bunch` (medido, `l8/rol.mjs`). **Se revierte con** `BROADCAST_WATCH=off` para la pantalla; las frases del acta, con revert. **Coste**: 3 sesiones. **Riesgo**: la frase de la fuga sin campeones en la primera mitad de la temporada 0 (§19.1).

### 17.10 Paso 7 (7a datos y rutas, 7b ruta de etapa) · Lo visto y la etapa cerrada

El servidor empieza a saber qué ha visto cada espectador (D-28, D-29) y a calcular su horizonte (D-32, D-33), y el 7b cierra la pantalla de la etapa, que es lo primero que el velo tiene que tapar. Nacen B1a, B1b y B1c con la lista de rutas que todavía destripan, `PENDING_ROUTES`, que cada PR del paso 8 vacía (I-30, D-54). `SPOILER_MODE=admins` desde aquí (D-53).

**PR 7a** · L · base, API y web · depende del 5 (el mundo de B1 corre etapas con `timelineTickLog`) y del 3a.

**Tests primero.**
- B12 en dos ficheros (§16.4): en `packages/db/src/horizon.test.ts` (nuevo), los casos que solo tocan la base (el prefijo, el arrastre, la etapa a medias, la meta por modo, la caducidad, el acuse, las fuentes y los alcances, la temporada anterior, la vuelta de prueba, el memo y los dos dispositivos); en `routes/me.test.ts` y `routes/broadcast.test.ts`, los que pasan por la petición (la puerta con su 403, lo servido que no es visto, la cookie que solo restringe, las cookies malas y `SPOILER_MODE`, que vive en `request.horizon()`). El del predicado llega con `veilSql` en el 8a y el de la retirada, con `veilDelta` en el 8b.
- `packages/db/src/horizonLatency.test.ts` (nuevo): B14 con 250.000 filas de `race_rosters` por `generate_series` (3.900 corredores), midiendo por separado, 200 veces cada una, `computeHorizon` sin memo en la forma D para el jugador y para el mánager de un equipo de 30, y `recordProgress` (16-k). Puerta en la rápida: p95 ≤ `SPOILER.horizonBudgetMs` (5 ms) en el jugador y, aparte, en `recordProgress`; el mánager se imprime con su p95 y es puerta en la medida a mano contra Postgres de este mismo paso (§18.9).
- `packages/db/src/revealFree.test.ts` (nuevo): B20, ningún fichero de `packages/db/src` ni de `packages/engine/src` fuera de la lista escrita nombra `raceWatch` o `race_watch`.
- `apps/api/src/routes/me.test.ts` (nuevo, §14.7): las cinco rutas de `/api/me` con `watchResponseSchema`, `revResponseSchema` y `horizonSummarySchema`; 401 sin sesión; el progreso en `text/plain`. `spoilerRegistry.test.ts` gana esas cinco rutas en su inventario, como en el 3a las de la retransmisión.
- El mundo de B1, `apps/api/src/__fixtures__/spoilerWorld.ts` (nuevo, el código de §16.3), y B1a, B1b y B1c: `spoilerCanary.test.ts` (sin su tercer `it`, el del título, las `og:` y el aviso, que entra en el 9a con `spaShell.ts` y `stageReadyEmail`), `spoilerDiff.test.ts` (sin el de las dos cuentas, que entra en el 8b) y `spoilerOutcomes.test.ts`. `PENDING_ROUTES` nace llena: cada ruta que todavía destripa, con el PR que la cierra (la columna «Mecanismo en» de §11.3) y los bancos que la ven.
- `packages/db/src/migrations.test.ts` gana `race_watch`, el enum, las columnas de `users`, `race_rosters_rider_idx`, el borrado en cascada de las dos claves ajenas y las tres restricciones de `race_watch` con los casos de `l3/aplicar2.mjs`; `schema.test.ts`, `getTableName(raceWatch)` y `spoilerScopeEnum.enumValues` atado a `SpoilerScope` en los dos sentidos.
- `columnasVivas.test.ts` ve escritas `follow`, `knownThrough` y `horizonRev`: las escrituras de `watch.ts` van con `.set({ … })` de Drizzle y nombres locales distintos del campo (13-a).

**Código.**
- Base: `drizzle-kit generate --name lo_visto` (`race_watch`, `spoiler_scope`, las cuatro columnas de `users` y `race_rosters_rider_idx`, §13.4); `watch.ts` (`recordProgress`, `revealStage`, `setFollow`, `setSpoilerScope`, `readWatch`, `LETTER_OF_MODE`, con la memoria del proceso de D-55 y la guarda de 15 s de 10-l); `horizon.ts` gana `computeHorizon` en la forma D (18-a), `lastRunStages`, `horizonSummary`, `touchLastSeen` y el memo por `(userId, currentDay, horizonRev)`; `index.ts` exporta `runOneStage`, `StageRunSpec` y `timelineTickLog`, que el mundo de B1 importa (§16.3).
- `shared`: `wire.ts` gana las entradas y las respuestas de `/api/me` (`watchProgressBodySchema`, `revealBodySchema`, `followBodySchema`, `spoilerScopeBodySchema`, `watchResponseSchema` y `revResponseSchema`, §14.2) y `horizonSummarySchema` (§4.11).
- API: `viewerCookie.ts` (`signViewerCookie`, `readViewerCookie`, `VIEWER_COOKIE`, `viewerCookieHeader`, §10.8); la segunda forma de `spoiler.ts` (17-h): `viewer()` de la sesión o de `cs_viewer` en lectura, `spoilerApplies()` y `horizon()` con `SPOILER_MODE` (§10.13), y el gancho `onSend` con `Vary: Cookie`, `Cache-Control: private, no-store` y la cookie re-firmada (§14.9); `env.ts` gana `SPOILER_MODE`; `app.ts`, `viewerSecret` y `secureCookies`; `routes/me.ts`; `POST …/broadcast/finish` pasa a escribir con `recordProgress` hasta `finishS`; `sign-out` y `delete-user` borran `cs_viewer`.
- Web: `apps/web/src/api/watch.ts` y `horizon.ts` (§14.11) y `RequestOptions.keepalive`; el reproductor ejecuta ya sus informes (`fetch` con `keepalive`, y en `pagehide`, `sendBeacon` con un `Blob` JSON y el respaldo en `text/plain` de 14-g); el progreso del visitante, en `localStorage` dentro de `try/catch` (11-p).

**Bancos.** B12 (casi entero), B14 (en la rápida y contra Postgres), B20 y B1a, B1b y B1c con sus pendientes. **Qué ve el dueño**: nada distinto; su `race_watch` empieza a llenarse. **Se revierte con** `SPOILER_MODE=off`; la `0045` es inerte. **Coste**: 3 sesiones (estimado).

**Riesgo.** El mánager de B14: en PGlite, con la forma D, da de 8,6 a 9,3 ms de p95, contra 3,1-3,7 ms del jugador y 3,05 ms de `recordProgress` (§18.2); PGlite es Postgres en WASM de un solo hilo, y por eso su puerta es la medida contra Postgres. Si no pasa allí, decide el dueño, y por defecto `SPOILER_MODE` no pasa a `on` hasta que pase (16-k). Y `sendBeacon` con un `Blob` JSON no se ha comprobado en Chrome ni en Safari: se mide aquí a mano (§18.9) y el respaldo `text/plain` lo cubre.

**PR 7b** · M · API y `shared` · depende del 7a y del 6b (la cabecera sirve cartas, y el velo las degrada).

**Tests primero.**
- `apps/api/src/stageRoute.test.ts` gana: `stageAccessOf` con las letras conocidas (`W`, `S`, `R`, `A`; la `X` abre en `Watch`, 10-e); la ruta de etapa omite los opcionales de resultado y `leaders` entero y sirve `altimetry` sin marcas (14-e); con `?diag=1`, un administrador recibe el `StageReplay` entero de una etapa velada y ninguna fila de `race_watch` cambia, y un jugador recibe lo mismo, byte a byte, que sin el parámetro (11-h).
- `apps/api/src/routes/broadcast.test.ts` gana B18: un tramo más allá de lo alcanzado más `BROADCAST.prefetchRaceS` da 409 `beyond_reached`, el que llega al borde lleva `atFinish` y ningún dato de meta, y la meta solo sale por `POST`; y 403 `previous_unseen` con su `gate`.
- B13 en `apps/api/src/broadcastFixtures.test.ts`: las seis cabeceras congeladas y 500 velos al azar con semilla fija; ningún campo con `from` en el velo viaja. No en `packages/shared/src/broadcast/veilCast.test.ts`, como dice §16.4, porque `veilCast` vive en `packages/db/src/horizon.ts` (§10.10) y `@cyclingstar/shared` no depende de `@cyclingstar/db` (`packages/shared/package.json`: solo `zod`) (decisión 17-t).
- `apps/api/src/raceRadio.test.ts` gana los casos de la pestaña (§11.16): la radio servida de una etapa no conocida, cortada con `veilStoredRadio`, y el deslizador hasta lo alcanzado.
- `yesterday.test.ts`: la ruta de etapa velada y la conocida pasan `stageReplaySchema.omit({ watch: true })` de `9c21885`. B6: la ruta de etapa velada, ≤ `maxVeiledStageGzipBytes` (4 KB; medido 0,46-2,1), sobre la etapa corrida de `routes/broadcast.test.ts` (16-n).
- `PENDING_ROUTES` pierde las rutas de la etapa (`sup. E1` a `sup. E8`).

**Código.** La ruta de etapa (`routes/races.ts` l. 387-539) con `stageAccessOf`, `watch` y `?season=`; la del acta con `sendGate` (403 `not_seen` o `previous_unseen`; `http.ts`); la admisión de los tramos de §10.11 (el tope de lo alcanzado y su 409, decisión 17-m); la puerta `previous_unseen` de la cabecera (D-37); `veilCast` en `horizon.ts` y `serveCast` con el horizonte de quien mira (§10.10); `veilStoredRadio` en la pestaña `Race Radio` (pantalla); `?diag=1` (D-40).

**Bancos.** B13, B18 y B1a a B1c sin las rutas de la etapa. **Qué ve el dueño**: con `SPOILER_MODE=admins`, la página de una etapa que no ha visto ya no trae el resultado: la web de hoy pinta pestañas vacías (`No result for this stage.`, pantalla, `StageReplay.tsx` l. 454) hasta el 9a, y la retransmisión no le sirve más allá de lo que ha alcanzado. El 7b cierra la pantalla de la etapa (D-54). **Se revierte con** `SPOILER_MODE=off`. **Coste**: 2 sesiones. **Riesgo**: romper la web de ayer; lo impide omitir `leaders` entero, que es opcional, y no su `afterStage`, que no lo es (14-e), y lo vigila `yesterday.test.ts`.

### 17.11 Paso 8 (8a, 8b) · El horizonte en toda la API

El 8a pone el registro con la política de todas las rutas y los mecanismos que ya tienen su lectura (P, F, G y N); el 8b, las restas y las máscaras (R y M), que necesitan `veilDelta` y las columnas de la `0046`, y las puertas de §11.2 (11-a). Con el 8b en verde, B1a, B1b y B1c pasan en todas las rutas y el destripe queda cerrado en el servidor (D-54).

**PR 8a** · L · base y API · depende del 7b.

**Tests primero.**
- `apps/api/src/spoilerRegistry.test.ts` pasa de inventario a B1d (17-b): la tabla de §11.3 escrita literal, con `SpoilerPolicy` y `VeilSpec` de cada ruta, comparada en los dos sentidos con `app.spoilerRegistry`; cada `L` con su `why`; las 53 `HEAD` heredan el `config` de su `GET` (`l6/head.mjs`); y una app de prueba con una ruta sin `config.spoiler` hace que `ready()` rechace con «ruta sin política de destripe» (§16.3).
- `packages/db/src/horizonReaders.test.ts` (nuevo, 10-c): toda función exportada de `packages/db/src` que lee una fuente de D-32 lleva `Horizon` de segundo parámetro, salvo la lista escrita con su motivo.
- `horizon.test.ts` gana «el predicado» de B12 (velo vacío; fila con `stage_day`; fila vieja con `stage_day` nulo) y `veilSql` con las listas enlazadas con `sql.param`, porque una lista dentro de `sql` se expande a `($1, $2)` (medido por L6, 10-d).
- `packages/db/src/newsVeil.test.ts` (nuevo, 11-g).
- `migrations.test.ts` gana las columnas y los dos índices de la `0046` y amplía el mundo vivo; el test de `awardRacePrizes` comprueba que lo que ganó el presupuesto de cada equipo es la suma de su `prize` (§13.10 punto 6), en `stageRun.test.ts`, que ya corre etapas con `runOneStage` sobre PGlite y lee `stageTeamResults` (l. 1-21), porque hoy no hay ningún test de esa función y §13.10 no le da fichero; `columnasVivas.test.ts` ve escrita `prize`.
- `yesterday.test.ts`: las noticias con un `stage_ready` y `last-race` con `ready` pasan los esquemas de hoy.
- `spoilerDiff.test.ts` gana la comprobación de 16-o: cada ruta de `B1B_WHITELIST`, que es la tabla de §11.18 con la gramática de `strip`, es `L` en el registro; antes del 8a las rutas no tienen clase.
- `PENDING_ROUTES` pierde las rutas de P, F, G y N (`sup. C1` a `C6`, `I1` a `I4`, `N1`, `N2`, `N4`, `P3`, `P4`, `H1`, `H5` y `H7`, con sus rutas de §11.3).

**Código.**
- Base: `drizzle-kit generate --name rastro_de_etapa` (§13.5) con sus escritores en el mismo PR (13-a): el origen de los puntos con `stageDay` (`ranking.ts` l. 79 y 98-108), `recordPalmares` con `stageDay`, `creditRider` con `ref` y `awardRacePrizes` con `ref` y `prize` en `creditTeam` (13-e, 13-f, 13-g), y `stageRun.ts` que los pasa. `veilSql` (10-d). `Horizon` pasa a segundo parámetro obligatorio de todas las funciones de la tabla de §10.6, las de R y M incluidas, que lo reciben y no lo usan hasta el 8b. Los mecanismos P (las `…ThroughStage`), F (las noticias con un `stage_ready` por etapa velada, el palmarés y los resultados de un corredor) y G (`last-race` sobre la última etapa CONOCIDA, D-47, y `raceVerdict` sobre ella, §12.9).
- API: toda ruta declara `config.spoiler` y `config.veil` con la tabla de §11.3, y `registerSpoilerGuard` pasa a su tercera forma (17-h): lanza al arrancar si falta la política, si una ruta con horizonte no tiene mecanismo o si una `L` no lleva motivo (§14.5), y `RouteEntry.policy` y `.veil` dejan de ser opcionales. El adaptador llama a `getStageSnapshot(db, worldHorizon, …)` (§14.4). `lastRaceResponseSchema` gana `ready`.

**Bancos.** B1d, B12 entero y B1a a B1c con menos pendientes. **Qué ve el dueño**: con la web de hoy, listas cortadas hasta lo que conoce, ganadores a null y los marcadores con su `text` neutro. **Se revierte con** `SPOILER_MODE=off` (todo horizonte es `worldHorizon` o `anonHorizon()`). El registro que lanza no tiene interruptor, y no le hace falta: una ruta sin política es un CI en rojo por B1d, nunca una sorpresa en producción. **Coste**: 3 sesiones. **Riesgo**: una ruta que se cuele sin política impide arrancar el servicio (`app.listen` rechaza y Railway no lo da por sano, §14.5); B1d corre en cada PR desde aquí.

**PR 8b** · L · base y API · depende del 8a.

**Tests primero.**
- `packages/db/src/fichaCorredor.test.ts` gana `veiledRaceDays`, `veilDailyLog`, y `getBlockReport` y `getAttrTrend` sin las filas `carrera` y `sobrecompensacion` de los días velados (11-e), con el formato de actividad que escribe el tick (`carrera:<raceId>:e<n>`, `stageRun.ts` l. 672 y 746) y no con el `carrera` a secas del test de hoy (l. 100): §19.7.
- `packages/db/src/abandon.test.ts` gana `sup. X2`, `sup. X9` y `sup. X10`: con el abandono en una etapa velada, `getRiderUpcomingRaces` sigue listando la carrera, `getRiderRaceDays` devuelve los días que quedaban y la retirada responde `alreadyOut: false` sin escribir nada.
- `packages/db/src/ranking365.test.ts` gana el recorte de 11-f (500 casos con semilla fija).
- `spoilerDiff.test.ts` gana B1b con dos cuentas: que otra cuenta vea o revele la etapa no cambia un byte de lo que recibe la primera (§11.14).
- Los de `veilDelta`, que leen puntos y palmarés con `stage_day` nulo (§13.10 punto 6), y el caso de B12 de la retirada voluntaria, que no entra en `VeilDelta.abandons` (10-i).
- `PENDING_ROUTES` se queda vacía (decisión 17-n).

**Código.** `veilDelta` en `horizon.ts`, con `raceDays` solo para los corredores del espectador y de su equipo (18-b) y el memo del horizonte (18-c); R en los rankings, los premios de la temporada, el salón, los récords, las naciones, los equipos, los agentes libres (con 11-f), el resumen y los logros de un corredor y el presupuesto del equipo con `prize`; M en la salud (`prevHealth` de la noticia `injury`), el abandono de `upcoming-races`, de las órdenes y de `plan/preview` y la retirada; F en el `parte` de los días velados, la tendencia y el informe del bloque (`sup. X1`) y el libro de cuentas; las diez puertas de §11.2.

**Bancos.** B1a, B1b y B1c en verde en todas las rutas. **Qué ve el dueño**: los agregados a su horizonte, con la web de hoy. **Se revierte con** `SPOILER_MODE=off`. **Coste**: 3 sesiones. **Riesgo**: `veilDelta` entero cuesta 14,3 ms sin memo (PGlite, §18.2) y se memoriza; el informe del bloque arrastra un defecto de hoy que E2 no arregla (§19.7).

### 17.12 Paso 9 (9a la etapa, 9b el mundo) · La web sin destripe

Hasta aquí el servidor ya no manda lo que la pantalla no enseña, y la web de hoy pinta pestañas vacías donde falta el dato (§14.1). El 9a cambia la web que enseña la etapa y el 9b la que enseña el mundo (11-a).

**PR 9a** · L · web, API y `shared` · depende del 7b.

**Tests primero.**
- `packages/shared/src/broadcast/pageTitle.test.ts` (nuevo, §11.19): los títulos de la tabla de §11.8 para cada `PageKind`, con la carrera de un día y con `p` nulo; `stageReadyNotice` con y sin lista de salida; en sus salidas no hay más palabras que las de `STAGE_KIND_WORDS`, el nombre de la carrera, los números y las fijas.
- `apps/web/src/domain/pageTitle.test.ts` (nuevo): `domain/pageTitle.ts` es el único fichero de `apps/web/src` que escribe `document.title`; el título de una etapa velada no lleva el nombre del ganador canario.
- `apps/api/src/emails.test.ts` gana `stageReadyEmail`: asunto, primera línea, botón y pie, sin el nombre del canario en el asunto, el texto ni el HTML.
- `spoilerCanary.test.ts` gana su tercer `it`: ni el título, ni las `og:`, ni el aviso llevan al ganador, y el robot sin cookie sí lo ve en el acta, marcado `Spoiler` (pantalla; DD-12).
- `apps/web/src/queryKeys.test.ts` (nuevo, §14.11): todo `queryKey` de una familia de `HORIZON_KEYS` se construye con `horizonKey`.
- El render de la puerta y de revelar sin castigo (`Show the result of Stage 7? You won't be able to watch it without knowing.`, `Don't ask again`, `Watch anyway`, pantalla; §11.11) y el de dos dispositivos (`You finished this stage on another device · Watch anyway · Show report`, pantalla; D-57).

**Código.** En `shared`, `pageTitle.ts` (`pageTitle`, `stageReadyNotice`, `STAGE_KIND_WORDS`). En la API, `apps/api/src/spaShell.ts` (`SHELL_PATH`, `preStageInfoFor`, `shellMetaFor`, `injectShellMeta`) en la rama `GET` del manejador de 404 (`app.ts` l. 205-213), y `stageReadyEmail(p, ownRiderOnStartlist, url)` en `emails.ts` (11-d), sin enviar nada: el envío es de E4 (DD-10). En la web: las pestañas `Watch`, `Report` (la antigua `Story`, D-48), `Result`, `Classifications`, `Race Radio` y `Profile`; la ruta `/world/races/:raceId/stages/:day/report`; `StageGateCard` con sus tres salidas; `Show result` con su confirmación y `users.reveal_confirm`; `?tab=` que no salta la puerta (`sup. E9`); `usePageTitle`; en `queryClient.ts`, `HORIZON_KEYS`, `horizonKey`, `useHorizonRev`, `['horizon']` con `staleTime` 0 y `clear()` al cambiar de cuenta (§10.9); `GateError` en `request.ts`; el aviso `Sign in to see results as you know them`; `Share to watch` y `Share the report`; y el modo diagnóstico en pantalla, con `Diagnostic view · not counted as watched` y su botón en la puerta para los administradores (11-h).

**Bancos.** B1a entero. **Qué ve el dueño**: la puerta en lugar de pestañas vacías, el acta en `/report` y el título de la pestaña del navegador sin resultado. **El jugador**, aun con los interruptores en `admins`: la pestaña `Story` se llama `Report` y la pestaña del navegador lleva `Stage 7 · Race France · Cycling Star` (pantalla); no se le esconde nada. **Se revierte con** los interruptores para el comportamiento y revert para los nombres. **Coste**: 3 sesiones. **Riesgo**: el título de la carrera antes y después del JavaScript tiene que ser el mismo (11-c); lo ata `pageTitle` en los dos lados.

**PR 9b** · L · web · depende del 8b y del 9a.

**Tests primero.** `apps/web/src/domain/raceTabs.test.ts` gana la carrera de un día terminada, conocida y no, y `?tab=story` que abre `report` (11-o); `apps/web/src/domain/raceStages.test.ts` (nuevo): `stageRowState` (con ganador servido, `report`; corrida y sin ganador, `watch`; sin correr, `not_raced`); `apps/web/src/domain/raceTimeline.test.ts` l. 120-128 se re-sella (el buscador busca sobre la lista ya cortada, `sup. I3`); y el render de la portada (`Continue watching`, `Ready to watch` y `While you were away` con `Key stages`, `Continue from stage 4` y `Show results`, pantalla), del marcador de noticias agrupado por encima de `SPOILER.newsGroupAbove` y de la puerta de las órdenes (`Stage 6 is waiting for you` · `Watch (about 9 min)` · `Show result` · `Give orders anyway`, pantalla).

**Código.** La portada de §11.4; los avisos de los agregados (`World ranking · as you know it · 3 stages hidden · Manage`, `After stage 9 of 21 · stages 10-12 ready to watch`, pantalla; §11.5); el feed con `StageReadyItem` y la etiqueta `stage_ready: 'Watch'`; las órdenes de la N+1 (§11.12, DD-09); las filas de `Stages` con `stageRowState`; `raceTabs(status, stageCount, known)`, que trata como conocida la etapa cuya respuesta no trae `watch`; el contador de `Tabs.tsx` (l. 78-79), que cuenta etapas por ver; `Follow without spoilers` y `Stop protecting this race`; el alcance del velo en los ajustes y la oferta adaptativa (10-b). `PENDING_ROUTES`, vacía desde el 8b, se borra con sus `it` (§16.3).

**Bancos.** Los B1 siguen en verde. **Qué ve el dueño**: el mundo tal como lo conoce. **El jugador**: la carrera de un día terminada abre en `Report` en lugar de `Result`, porque para él todas las etapas son conocidas mientras el velo no le aplique; lo demás sale solo con velo. **Se revierte con** los interruptores; revert para la pestaña. **Coste**: 3 sesiones. **Riesgo**: bajo; es pintura sobre respuestas ya cortadas.

### 17.13 Paso 10 (10a montaje y modos, 10b aceptación y encendido) · Previa, cierre, modos y encendido

**PR 10a** · L · web y `shared` · depende del 6b y del 9b.

**Tests primero.** `pace.test.ts` gana `digestPace` y `digestMinutes` (38, 40 y 43 min con los tipos de las tres grandes vueltas, 8-b), y `broadcastPace.test.ts`, la banda del digest de B17 (menos del 40 % de su presupuesto); `player.test.ts`, las filas del 10 de §8.12 (los saltos, el resumen de 8-n, `Next action` que se apaga en `last_km`, la letra de cada modo y la red en `Highlights` y `Next action`); `apps/web/src/components/broadcast/PlayerControls.test.tsx` (nuevo) a 360 px; y el render de la previa y del cierre con los textos de §8.6 (`JERSEYS IN PLAY`, `FAVOURITES`, `STAGE 18 · RESULT`, `MOST KILOMETRES OUT FRONT`, `Next: Stage 8 · Watch`, pantalla), de los saltos de crono (9-g) y de `Connection lost · Retry` (D-57).

**Código.** `StagePreviewCards` y `StageClosingCards` (D-22, DD-14; sin tabla por equipos, duda de §8); `Highlights` con `summaryPace`; el digest (`digestPace`, `digestMinutes` y el botón `Watch the race in 40 minutes`, con el número calculado, 8-b); los saltos, `While you skipped` y `Previously` (8-i, 8-n); `Next action`; los saltos de crono `−10 min`, `+10 min`, `Last 20 starters` y `Last starter` (con `ttSeekStepS` y `ttSeekLastStarters`); `recapMaxCues`, `previewThreatsMax` y `closingCardS` en `BROADCAST`; como mucho dos etapas del digest en memoria (18-e); y `useHideBottomNav` solo si E6 acepta la propuesta (18-f, I-26).

**Bancos.** Ninguno nuevo. **Qué ve el dueño**: la emisión entera, de la previa de cuatro cuadros al cierre. **Se revierte con** `BROADCAST_WATCH=off`. **Coste**: 3 sesiones.

**PR 10b** · S · constantes de `shared` y medidas · depende del 10a y del 8b.

La puerta del encendido (D-60, [DOC 7], H-04). En este orden:
1. **B17 otra vez**, ahora sobre la línea grabada de las 24 etapas (`bench-pace.mjs`), dentro de las bandas de 8-k.
2. **B15 otra vez** (`bench-tick.mjs`), días 176 y 179.
3. **El móvil, a mano**, con el protocolo de §18.5 (Chrome, 360 × 800, CPU ×4, «Fast 4G», `race-colombia` e5 y `race-france` e18 y e16): repintado ≥ 30 fps, ninguna tarea por encima de 50 ms y primera pintura de `Watch` ≤ 2 s (D-56, sin evidencia de los jueces). Las cifras y la fecha van a la tabla de §18.9. Si no se cumple, se baja `barHz` y se simplifica el perfil antes de encender.
4. **La prueba de lectura** (§16.5): el dueño y una persona que no conozca el diseño, tres etapas (llana, reina y clásica), tres puntos sorteados en cada una, las cuatro preguntas de SPEC §6.15 y nueve de nueve, con la verdad de cada punto sacada de la línea por `scripts/pl-truth.mjs` (nuevo, 16-i). El registro va en la descripción de este PR. Si falla, solo se toca lo que vive en `packages/shared` (ritmo, cola, palabras, rótulos), se remide B17 y se repite con nueve puntos nuevos; la misma pregunta que falla dos veces va al dueño.
5. **El encendido**: con B1a, B1b y B1c en verde en todas las rutas (desde el 8b), la prueba de lectura aceptada, el móvil dentro y el mánager de B14 dentro contra Postgres (o lo que haya decidido el dueño, 16-k), `BROADCAST_WATCH=on` y `SPOILER_MODE=on` en Railway, sin desplegar (D-53). Se implementan los valores por defecto de las decisiones del dueño (§20), `Watch` a ×1 entre ellos (DD-03).

**Qué ve el dueño**, y todos: el producto sin destripe. **Se revierte con** los dos interruptores a `off`. **Coste**: 1 sesión y media jornada de la prueba de lectura. **Riesgo**: que la prueba de lectura falle dos veces en la misma pregunta, que no es una constante sino una decisión (§16.5); y B14 con el perfil de mánager (§19.1).

### 17.14 Paso 11 · La radio desde la línea

**PR 11** · M · `shared`, base, API, web y el script de la radio · depende del 6a y del 9a; puede ir antes o después del 10.

Antes de dejar de escribir la radio hay que probar que la servida desde la línea es la de hoy, porque I1 no cubre la capa de detalle (O-16, D-16).

**Tests primero.** B16 en la rápida (`broadcastFixtures.test.ts`, contra `<etapa>.radio.json.gz`: `radioFromTimeline` igual a `buildRaceRadio(radioForStorage(radio, ∅, []))` km a km en grupos, tamaños, huecos, velocidades, percances, relevistas y motivos) y en las 24 etapas por dos semillas en el nocturno, con `CS_BANCOS=1`, en el mismo fichero: corre cada etapa con `startStageTimeline` y compara las dos radios, y vive en `apps/api` porque `buildRaceRadio` es de `apps/api` y ni el motor ni `packages/db` pueden importarla (decisión 17-l); `packages/db/src/stageRun.test.ts` l. 322-339 se re-sella sobre `radioFromTimeline` y la fila de `stage_timelines` (DD-11); y la pestaña `Race Radio` de una etapa no conocida enseña solo las fotos cerradas en lo pintado (11-i).

**Código.** `packages/shared/src/broadcast/radio.ts` (`radioFromTimeline`, `RadioNames`), que acepta una línea cortada (duda de §11); la pestaña la lee en las etapas con línea y sigue con `buildRaceRadio` en las viejas; `stageRun.ts` deja de escribir `stage_snapshots.radio` en las etapas nuevas, que es el valor por defecto de DD-11, en este mismo PR y con B16 en verde; el comentario de `schema.ts` dice desde cuándo es null; `scripts/race-radio.mjs --db` lee `stage_timelines` y solo re-simula una etapa sin fila (§12.10).

**Bancos.** B16. **Qué ve el dueño**: la radio de siempre, con el mismo contrato; el tick escribe unos 40 MB menos por temporada (mapa 04 §5). **Se revierte con** revert, que vuelve a escribir la radio; las etapas corridas entre medias tienen la línea, de la que sale la misma radio (B16). **Coste**: 2 sesiones. **Riesgo**: B16 en rojo deja la radio escribiéndose (DD-11 espera); la lista de seguimiento que el tick escribe hoy sin filtrar los ceros (duda de §7) es justo lo que B16 compara con el conjunto vacío.

### 17.15 Paso 12 · Cierre

**PR 12** · M · web, `shared`, base y documentos · depende del 11 y del 10b: es el último.

**Tests primero.** `apps/web/src/domain/stageJournal.test.ts`: las variantes fijadas se re-sellan UNA vez, con la causa escrita, por la semilla neutra (D-46); B5 se congela en `stageJournal.corpus.test.ts` con el `sha256` de todas las líneas de voz y de acta de las seis etapas congeladas y de los trece goldens de noticias; `apps/web/src/domain/narration.test.ts` se borra con `narrate()`; y los momentos del corredor (`riderRaceReportSchema.moments`, 12-k) y la identidad del día en las crónicas.

**Código.** `variantSeed` y `pickVariant` con la revisión de la etapa en `stageJournal.ts` (§12.7); `narrate()` y su tabla fuera; `personalNarration` sustituida por `moments` en `LastRaceReport.tsx` (§12.9); `getRaceRiderIdentities` con el equipo del día (§12.7).

**Documentos** (D-58, H-02, X-05). `docs/balance.md` l. 14684-14686 se corrige: subir `ENGINE_VERSION` no tira las crónicas guardadas, porque la ruta de etapa las lee sin mirar la versión (`routes/races.ts` l. 474-477); lo que se rompe es la «Last race» que re-simula `raceReport.ts` (l. 148, C16). En la misma nota quedan, para el dueño, el salto de hasta 138 s y `getBlockReport`, que cuenta siempre 0 días de carrera (§19.7, decisión 19-b). `docs/navegacion.md` §7.1-7.4 pasa a decir lo que la tabla de §11.17 dice, para E6. `docs/ops.md` apunta que el reinicio borra `race_watch`, vacía `stage_timelines` con `stage_snapshots` y reinicia el servicio `web` (§13.9, 13-h).

**Qué ve el dueño**, y todos: una sola vez, algunas frases de etapas viejas cambian de variante, y las crónicas viejas nombran al equipo del día y no al de hoy. **Se revierte con** revert; los documentos se quedan. **Coste**: 1,5 sesiones. **Después del reinicio**, una versión de web más tarde, un PR mínimo deja de escribir y de mandar `news.text` (DD-19): la web de ese momento ya lo lee `.nullish()` y se despliega antes que la API que deja de mandarlo (§14.1).

### 17.16 Orden y dependencias

```
0 ──► 2 ──► 3a ──► 3b ──► 3c                                el camino del dueño
1a ──► 1b                                                   las noticias, con plazo, en paralelo con todo
4a ──► 4b ──► 5 ──► 6a ──► 6b                               el motor y la línea (4b pide además el 3a)
              5 ──► 7a ──► 7b ──► 8a ──► 8b                 el destripe en el servidor (7a pide el 3a; 7b, el 6b)
                          7b ──► 9a ──► 9b                  el destripe en la web (9b pide el 8b)
                 6b, 9b ──► 10a ──► 10b ──► encendido       (10b pide el 8b)
                  6a, 9a ──► 11 ──► 12                      (12 pide el 10b: es el último)
```

- **2 antes que 3a**: el adaptador revela los sucesos con el reloj estimado y las reglas que trae el 2 (17-d), y lee `BROADCAST`.
- **3a antes que 4b**: el grabador usa `photoAt` y `revealSOf`, y sus tests de banco, `instantAt` y `photoBlocksOf`; el 4a no necesita nada y puede ir en paralelo con los pasos 0 a 3.
- **4b antes que 5**, que engancha al tick el colector y el grabador; **5 antes que 6a**, que sirve la línea grabada, y **antes que 7a**, cuyo mundo de B1 corre etapas con `timelineTickLog`.
- **6b antes que 7b**: la cabecera sirve cartas y el velo las degrada (B13); el 7a puede ir en paralelo con el 6a y el 6b.
- **7b antes que 8a** y **8a antes que 8b**: la etapa se cierra primero, y R y M necesitan `veilDelta`, que lee las columnas de la `0046` (11-a).
- **7b antes que 9a** (la puerta existe en el servidor) y **8b antes que 9b** (los avisos de los agregados leen lo que el 8b resta); el 9a puede ir en paralelo con el 8a y el 8b.
- **10a tras el 6b y el 9b**; **10b tras el 10a y el 8b**, porque el encendido pide B1 en verde en todas las rutas (D-53).
- **11 tras el 6a y el 9a** (la pestaña ya tiene su puerta; D-16 pide la línea y B16), antes o después del 10; **12**, el último.

El camino crítico hasta el encendido es 0, 2, 3a, 4b, 5, 6a, 6b, 7b, 8a, 8b, 9b, 10a y 10b: trece PR y unas 34 sesiones de las 52 del total (estimación de este documento, no medida: la suma de los costes de §17.3 a §17.15, en §17.22); el 12, que va detrás del 10b, lo alarga a 35,5. Veintidós PR, de los que dos pagan los ocho tramos de bancos (el 4a y el 4b), cuatro migraciones y ninguna subida de versión.

### 17.17 Lo primero que ve el dueño y lo que cierra el destripe

**El primer paso que se nota es el 0**, y lo nota cualquiera: la web carga antes. **El primero que le da al dueño la sensación de sentarse a ver la etapa es el 3c** (D-54), tras el 0, el 2, el 3a y el 3b, sin tocar el motor ni la base: abre una etapa de producción con `BROADCAST_WATCH=admins`, pulsa `▶` (pantalla) y ve la capa fija, la barra de grupos, el perfil con los cursores y la voz a su hora. Con el reloj estimado del adaptador y los grupos por su posición, que llegan exactos en el 6a; y con la etapa entera en el servidor, porque el velo no existe hasta el 7a.

**El que cierra el destripe es el 8b** (D-54), con B1a, B1b y B1c en verde en todas las rutas que registra Fastify. El 7b cierra antes la pantalla de la etapa, pero no la portada, el feed ni los rankings; el 9a y el 9b hacen que la web lo pinte; y el jugador no lo vive hasta el encendido del 10b.

Si hay que parar antes de tiempo, hay cuatro cortes limpios, en el estilo de `docs/tactica.md` §8.2:

| Corte | Qué queda hecho | Qué contesta | Qué no |
| --- | --- | --- | --- |
| tras el 3c | `Watch` sobre la radio de hoy, para el dueño; las noticias con datos | el microscopio del dueño en forma de retransmisión; [DOC 1] cumplido antes del reinicio | nada de la retransmisión para el jugador; ningún velo |
| tras el 6b | la retransmisión exacta, con rótulos, maillots y crono, para los administradores | la pantalla entera de E2 salvo el montaje | sin destripe: el acta sigue abriéndose |
| tras el 8b | el destripe cerrado en el servidor | la API no manda lo que la pantalla no enseña ([DOC 5]) | la web de hoy pinta pestañas vacías a los administradores |
| tras el 10b | todo, encendido | los tres pilares del encargo ([DUEÑO 1], [DUEÑO 2], [DUEÑO 3]) | la radio desde la línea (11) y la semilla neutra (12) |

Ningún corte deja el producto peor que hoy: todo lo que no está encendido está detrás de un interruptor en `off` o en `admins`.

### 17.18 Encendido y marcha atrás

| Interruptor | Defecto | `admins` | `on` | Con `off`, sin desplegar |
| --- | --- | --- | --- | --- |
| `BROADCAST_WATCH` | `off` | desde el 3c | al cerrar el 10b | las tres rutas de `…/broadcast` dan 404 `broadcast_off` y la web abre la página de etapa de hoy (§14.6) |
| `SPOILER_MODE` | `off` | desde el 7a | al cerrar el 10b, con B1 en verde y la prueba de lectura aceptada | el horizonte es `worldHorizon` o `anonHorizon()`: la ruta de etapa devuelve su `StageReplay` entero y no hay puerta (§10.13) |
| `TIMELINE_RECORD` | `on` | | desde el 5 | el tick no graba: esas etapas quedan sin fila y abren con el adaptador (§5.5) |

Un defecto de pantalla se apaga con `BROADCAST_WATCH=off`; uno de destripe o un horizonte lento, con `SPOILER_MODE=off`; un tick que se resiente, con `TIMELINE_RECORD=off` (D-53). Así se cumple `docs/tactica.md` §8.3: un paso se revierte con un interruptor, no con la migración (l. 6948-6950). Por PR:
- **Con un interruptor**: 3a, 3c, 6a, 10a y la pantalla del 6b (`BROADCAST_WATCH`); 7a, 7b, 8a, 8b y el comportamiento del 9a y el 9b (`SPOILER_MODE`); 5 (`TIMELINE_RECORD`); 10b (los dos).
- **Con un `git revert`**: 0, 1a, 1b, 2, 3b, 4a, 4b, 11 y 12, y los nombres y las frases del 6b, el 9a y el 9b. El 4a y el 4b dejan, a lo sumo, código que nadie llama.
- **Lo que no se deshace, porque no hace falta**: las cuatro migraciones solo añaden y son inertes si nadie las lee; las líneas grabadas y las noticias con datos siguen legibles con o sin el código que las escribe; las letras de `race_watch` son del jugador y se quedan. Desde el 11 (DD-11) las etapas nuevas no tienen radio guardada: un revert vuelve a escribirla para las siguientes, y la de las de en medio sale de su línea (B16).

### 17.19 Entre el despliegue y el reinicio

El mundo de producción sigue vivo mientras se despliega E2 y se reinicia antes del lanzamiento (`docs/ops.md` l. 180-181; mapa 04 §8). Las etapas que se corren en ese hueco se retransmiten con lo que guardaron (D-61, H-16): lo que no se guardó no se inventa, porque «una crónica que miente es peor que una muda» (`docs/balance.md` l. 13274).

| La etapa se corrió | Tiene | Abre en (pantalla) | Desde qué PR |
| --- | --- | --- | --- |
| con la grabación encendida, desde el 5 | su línea | `Watch`, reloj exacto | 6a |
| entre la `0029` y el 5, o con `TIMELINE_RECORD=off` | radio y sucesos | `Watch` con el adaptador y `Recorded before full race data`; si B22 da rojo en el 6a, `Report` con `Broadcast unavailable for this stage` | 3a |
| una crono sin línea | sucesos | `Report` con `Broadcast unavailable for this stage` (3-d) | 3a |
| con una lápida (no pasó I1 o I5 al grabar) | nada que servir | `Report` con el mismo aviso (D-12) | 6a |
| antes de la `0029` | sucesos sin radio | `Report` a secas | siempre |
| antes de la `0024` | nada | `Report` con el `journalUnavailable` de hoy (`routes/races.ts` l. 477-497) | siempre |

**El reinicio dentro del plan.** Solo una cosa tiene que ir antes: la `0043` y su PR, el 1a, para que las noticias del mundo nuevo nazcan con `seed` y `data` ([DOC 1], D-45). Lo demás puede caer antes o después, y el reinicio hace en cada caso lo que §13.9 escribe y el paso 12 deja en `docs/ops.md`: si llega tras el 5, `stage_timelines` se vacía con `stage_snapshots`, porque las dos van por `race_key` sin mundo y una fila vieja de `race-france:s0` se serviría en el mundo nuevo; si llega tras el 7a, `race_watch` se borra, aunque su `world_id` en la clave haga inofensivo olvidarlo (D-29, H-11); y en todo caso se reinicia el servicio `web`, porque el LRU de líneas y el memo del horizonte viven en el proceso y no distinguen mundos (13-h). Si el reinicio llega antes del 5, las etapas del mundo nuevo anteriores al 5 usan el adaptador como las del viejo. Y una versión de web después del reinicio, `news.text` deja de escribirse y de mandarse (DD-19, §17.15).

### 17.20 Los ficheros de código, PR a PR

Lo que §17.3 a §17.15 dicen por paso, visto por fichero: en qué PR nace cada fichero nuevo y en cuáles crece cada uno de los que E2 toca, para que dos PR no creen el mismo y para que el ensamblador compruebe que cada pieza de §4 a §15 tiene su PR. En la columna Nace, hoy quiere decir que el fichero existe en `9c21885` (comprobado uno a uno); qué tipo vive en qué fichero de `shared` lo dice §4.13, que manda sobre esta tabla. Los tests van en §17.21.

| Fichero | Nace | Crece en | Lo que trae E2 |
| --- | --- | --- | --- |
| `packages/engine/src/stage/types.ts` | hoy | 4a | `ProbeBanner`, `ProbeTimeTrialRide` y los tres ganchos opcionales de `StageProbe` (§5.2) |
| `packages/engine/src/stage/events.ts` | hoy | 4a | `EventLog.listen` |
| `packages/engine/src/stage/simulate.ts` | hoy | 4a | `onEvent`; `onBanner` en `disputeBanner` y `disputeClimb`; la sonda pasada a `simulateTimeTrial` |
| `packages/engine/src/stage/timetrial.ts` | hoy | 4a | `onTimeTrialRide` |
| `packages/engine/src/sim/coherence.ts` | hoy | 4a | las filas de `GROUP_NOUNS` de §12.6 y `the gruppetto` (pantalla) en `WATCHED_GROUP_NOUNS` |
| `packages/engine/src/sim/raceRadio.ts` | hoy | 4a, 4b | el `export` de `NAME_WHOLE_GROUP_UP_TO` (4a); el de `STORED_PULLERS_MAX` y `radioGroupDetails` fuera de `radioForStorage`, sin cambiar un byte de lo guardado (4b, 5-g) |
| `packages/engine/src/world/news.ts` | hoy | 4a | pierde `renderNews` y `NewsData` (4-p) |
| `packages/engine/src/sim/timeline.ts` | 4b | | `timelineRecorder`, `selfCheckI1`, `selfCheckI5`, `profileStripOf`, `freezeStageWeather`, `ttTraceOf` y sus guardas (§5.4, §5.5) |
| `packages/engine/src/constants.ts` | hoy | 4b | el bloque `TIMELINE`, detrás de `STAGE` (§15.2) |
| `packages/engine/src/index.ts` | hoy | 4a, 4b | `NAME_WHOLE_GROUP_UP_TO` y `chaseReferenceIndex`, y fuera `NewsKind` (4a); la lista de §5.9 y `realRaceScenario` (4b, 17-j) |
| `packages/shared/src/news.ts` | 1a | | §4.12 entero, `abandonReasonSchema`, `ABANDON_WORDS`, `outFor`, `NEWS_VARIANTS` y `renderNews` (§12.8) |
| `packages/shared/src/render/variants.ts` | 1a | | `Variant`, `pickVariant`, `fnv1a` y `TEMPLATE_REV` a 0 (§12.7) |
| `packages/shared/src/index.ts` | hoy | 1a, 2, 3a | `./news.js` y `./render/variants.js` (1a); `./broadcast/index.js` (2); la reexportación de `wire.ts` detrás de `contracts.js` (3a, 14-a) |
| `packages/shared/src/contracts.ts` | hoy | 1a, 3a, 8a, 12 | `newsItemSchema` y `teamNewsItemSchema` con sus seis campos (1a); `stageGateSchema`, `watchStateSchema`, `preStageInfoSchema` y `switchModeSchema` (3a, 14-a); `lastRaceResponseSchema.ready` (8a); `riderRaceReportSchema.moments` (12, 12-k) |
| `packages/shared/src/jerseys.ts` | hoy | 5 | §4.8 entero: `wornJerseys`, `distinctions`, `notorietyOf` y `staticNotoriety` (§7.2, §7.5) |
| `packages/shared/src/broadcast/timeline.ts` | 2 | | los tipos de §4.1 y §4.2 |
| `packages/shared/src/broadcast/reveal.ts` | 2 | | `REVEAL_RULES`, `TT_REVEAL_RULES`, `revealSOf` y `RecorderView` (§4.7) |
| `packages/shared/src/broadcast/constants.ts` | 2 | 6a, 10a, 10b | `BROADCAST` y `SPOILER` de §15.3 y §15.4 (2); `cardRowsMax` y los cuatro topes de red de 16-h (6a); `recapMaxCues`, `previewThreatsMax`, `closingCardS`, `ttSeekStepS` y `ttSeekLastStarters` (10a); lo que ajuste la prueba de lectura (10b) |
| `packages/shared/src/broadcast/index.ts` | 2 | cada PR que añade un fichero a `broadcast/` | la reexportación de §4.13 |
| `packages/shared/src/broadcast/cut.ts` | 3a | | `visibilityOf`, `cutTimeline` y `chunkOf` (§4.6) |
| `packages/shared/src/broadcast/reduce.ts` | 3a | | `reducePhoto` y `photoAt` (§4.4) |
| `packages/shared/src/broadcast/instant.ts` | 3a | | `instantAt`, `photoBlocksOf`, `groupRoleOf`, `mainGapOf`, `groupLabelOf`, `chaseRefOf`, `isGroupRole` e `InstantContext` (§4.5, §6.2, §6.3) |
| `packages/shared/src/broadcast/wire.ts` | 3a | 7a | §4.11 con sus esquemas y las entradas de la retransmisión (3a); las entradas y las respuestas de `/api/me` y `horizonSummarySchema` (7a) |
| `packages/shared/src/broadcast/pace.ts` | 3a | 6b, 10a | `paceAt` y `playbackEstimateS` (3a); `ttPaceAt` y `ttPlaybackEstimateS` (6b); `digestPace` y `digestMinutes` (10a) |
| `packages/shared/src/broadcast/names.ts` | 3a | 6b | `GROUP_WORDS` y `groupLabelText` (3a); `breakHeadline`, `namedRidersOf`, `pullingLineOf`, `gapTrendLine` y los textos de §7 (6b) |
| `packages/shared/src/broadcast/codec.ts` | 4b | | §4.3: `StoredTimelineV1`, `encodeTimeline`, `decodeTimeline` y su esquema, con el formato 1 cerrado (17-a) |
| `packages/shared/src/broadcast/cues.ts` | 6a | | `CUE_CLASS`, `CUE_OF_TEMPLATE`, `cuesBetween` y `cueClassOf` (§6.5, §6.6) |
| `packages/shared/src/broadcast/timeTrial.ts` | 6b | | `timeTrialInstantAt` (§9.3) |
| `packages/shared/src/broadcast/pageTitle.ts` | 9a | | `pageTitle`, `stageReadyNotice` y `STAGE_KIND_WORDS` (§11.8) |
| `packages/shared/src/broadcast/radio.ts` | 11 | | `radioFromTimeline` y `RadioNames` (§12.10) |
| `packages/db/src/schema.ts` y `packages/db/drizzle/` | hoy | 1a, 5, 7a, 8a, 11 | la `0043` (1a); la `0044` y el comentario de l. 754 (5, 13-i); la `0045` (7a); la `0046` (8a); el comentario que dice desde cuándo `radio` es null (11) |
| `packages/db/src/news.ts` | hoy | 1a, 8a | `emitNews` con la firma de §12.8, las lecturas que redactan y `newsNames` (1a); el horizonte y un `stage_ready` por etapa velada (8a) |
| `packages/db/src/stageRun.ts` | hoy | 1a, 4a, 5, 8a, 11 | los payloads, `gc_lead_taken` y `jersey_taken` (1a); `AbandonReason` de `shared` (4a); la envoltura de §5.3 y `recordStageTimeline` (5); `stageDay` y `ref` a los escritores (8a); deja de escribir `stage_snapshots.radio` (11) |
| `packages/db/src/riderSchedule.ts` | hoy | 1a, 8b | el payload de la noticia de l. 299 (1a); `getRiderRaceDays` (l. 17) y `getRiderUpcomingRaces` (l. 193) con la máscara del abandono (8b) |
| `packages/db/src/contracts.ts` y `rollover.ts` | hoy | 1a | los payloads de `contract.ts` l. 332, con `housingCovered`, y de `rollover.ts` l. 326 |
| `packages/db/src/timelines.ts` | 4b | 5 | `startStageTimeline` sin llamador (4b); `recordStageTimeline`, la escritura, la lectura con su LRU, la lápida y `timelineTickLog` (5) |
| `packages/db/src/calendarRun.ts` y `tick.ts` | hoy | 5 | `CalendarDayOptions.timeline`, `RunTickOptions.timelineRecord` y el resumen en `tick_log.notes` |
| `packages/db/src/cast.ts` | 5 | | `buildTimelineCast`, con `knownWins` (7-e) y los `favourites` de 8-g |
| `packages/db/src/titles.ts` | 5 | | `ChampionTitleSource`, `palmaresTitleSource` y `Queryable` (7-k) |
| `packages/db/src/horizon.ts` | 3a | 7a, 7b, 8a, 8b | los tipos y las funciones puras (3a, 17-g); `computeHorizon` en la forma D, `lastRunStages`, `horizonSummary`, `touchLastSeen` y el memo (7a); `veilCast` (7b); `veilSql` (8a); `veilDelta` (8b) |
| `packages/db/src/watch.ts` | 7a | | `recordProgress`, `revealStage`, `setFollow`, `setSpoilerScope`, `readWatch` y `LETTER_OF_MODE` (§10.3) |
| `packages/db/src/index.ts` | hoy | cada PR que añade un fichero a `packages/db/src` | lo nuevo de cada uno; en el 7a, además, `runOneStage`, `StageRunSpec` y `timelineTickLog` para el mundo de B1 (§16.3) |
| `packages/db/src/ranking.ts` | hoy | 8a, 8b | el origen de los puntos (l. 79 y 98-108) y `recordPalmares` (l. 113) con `stageDay` (8a); R en los rankings (8b) |
| `packages/db/src/economy.ts` | hoy | 8a | `creditRider` (l. 29) con `ref`, y `awardRacePrizes` (l. 135) con `ref` y `prize` (13-e a 13-g) |
| `packages/db/src/results.ts` | hoy | 8a, 12 | P en las `…ThroughStage`, como `getGcThroughStage` de l. 236 (8a); `getRaceRiderIdentities` (l. 191) con el equipo del día (12, §12.7) |
| `packages/db/src/riders.ts` | hoy | 8b | `getAttrTrend` (l. 366) y `getBlockReport` (l. 517) sin las filas de los días velados (11-e) |
| las demás lectoras de la tabla de §10.6 | hoy | 8a, 8b | `Horizon` de segundo parámetro, y su mecanismo: P, F, G y N en el 8a; R y M en el 8b |
| `apps/api/package.json` | hoy | 0 | `@fastify/compress` 9.2.0 |
| `apps/api/src/app.ts` | hoy | 0, 3a, 7a, 9a | el plugin (0); `AppDeps.switches` (3a); `viewerSecret` y `secureCookies` (7a); `spaShell` en la rama `GET` del manejador de 404, l. 205-213 (9a) |
| `apps/api/src/env.ts` | hoy | 3a, 5, 7a | `BROADCAST_WATCH` (3a); `TIMELINE_RECORD` en `envSchema` y `tickEnvSchema` (5); `SPOILER_MODE` (7a) |
| `apps/api/src/index.ts` y `tick/main.ts` | hoy | 3a, 5 | los interruptores a la app (3a); `timelineRecord` a `runTick` (5) |
| `apps/api/src/routes/health.ts` | hoy | 3a | `features` (14-l) |
| las rutas de `/api/news` y `/api/teams/:id/news` | hoy | 1a | `payload`, `seed`, `tplRev`, `raceId`, `raceKey` y `stageDay`, además de `text` |
| `apps/api/src/chronicle.ts` | hoy | 2, 3a | la voz en vivo: `LiveChronicle`, `live`, el orden de 12-a y las cinco pasadas apagadas (2); `veilStoredRadio` (3a, 17-f) |
| `apps/api/src/liveClusters.ts` | 2 | | los racimos en vivo, apagados (§12.3) |
| `apps/api/src/broadcastSource.ts` | 2 | 3a, 6a, 6b, 7b | `estimatedHeadClock` y el `revealS` de lo guardado (2); el adaptador y `timelineForStage` con su LRU (3a); la línea grabada primero (6a); `serveCast` con `worldHorizon` (6b) y con el horizonte de quien mira (7b) |
| `apps/api/src/routes/broadcast.ts` | 3a | 6b, 7a, 7b | la cabecera, el tramo con su voz, la meta y el acta (3a); `withGroupRoles` antes de atar las horas, y los racimos (6b, 12-n); la meta escribe con `recordProgress` (7a); la admisión de los tramos, `previous_unseen` y `?diag=1` (7b) |
| `apps/api/src/voiceRoles.ts` | 6b | | `withGroupRoles` y `MAIN_GROUP_TEMPLATES` (12-b) |
| `apps/api/src/spoiler.ts` | 3a | 7a, 7b, 8a | el registro que apunta (3a); `viewer()` con `cs_viewer`, `SPOILER_MODE` y el gancho `onSend` (7a); `stageAccessOf` (7b); las tres comprobaciones que lanzan (8a); decisión 17-h |
| `apps/api/src/viewerCookie.ts` | 7a | | la cookie `cs_viewer` (§10.8) |
| `apps/api/src/routes/me.ts` | 7a | | las cinco rutas de `/api/me` (§14.2) |
| `apps/api/src/routes/races.ts` y `http.ts` | hoy | 7b | la ruta de etapa con `stageAccessOf` y el acta con `sendGate` |
| todas las rutas de `apps/api/src/routes/` | hoy | 8a, 8b | `config.spoiler` y `config.veil` de la tabla de §11.3 (8a); lo que R y M restan (8b) |
| `apps/api/src/spaShell.ts` | 9a | | `SHELL_PATH`, `preStageInfoFor`, `shellMetaFor` e `injectShellMeta` (§14.10) |
| `apps/api/src/emails.ts` | hoy | 9a | `stageReadyEmail`, sin enviar (DD-10) |
| `apps/web/src/domain/newsFeed.ts` y `domain/labels.ts` | hoy | 1b, 9b | el enlace por `raceId`, y `gc_lead_taken` y `jersey_taken` en `NEWS_KIND_LABEL` (1b); `stage_ready` (9b) |
| `apps/web/src/domain/voice.ts` | 2 | | `inVoice` (12-m) |
| `apps/web/src/domain/broadcast/player.ts` | 3b | 6a, 10a | el reductor y sus informes (3b, 8-q); la cola de rótulos (6a); los modos, los saltos y el digest (10a) |
| `apps/web/src/api/broadcast.ts` | 3b | | las cuatro llamadas de la retransmisión (§14.11) |
| `apps/web/src/api/watch.ts` y `horizon.ts` | 7a | | las de `/api/me` (§14.11) |
| `apps/web/src/api/request.ts` | hoy | 7a, 9a | `RequestOptions.keepalive` (7a); `GateError` (9a) |
| `apps/web/src/queryClient.ts` | hoy | 3b, 9a | los defectos de `['broadcast-chunk']` y `['broadcast-head']` (3b); `HORIZON_KEYS`, `horizonKey`, `useHorizonRev` y `clear()` al cambiar de cuenta (9a) |
| `apps/web/src/pages/StageWatch.tsx` y `components/broadcast/` | 3c | 6a, 6b, 7a, 10a | la capa fija, la barra, el perfil, la voz y los mandos (3c); `CueCard` y los cursores por sucesor (6a); las cartas, `TimeTrialBoard` y las palabras de la barra (6b); los informes de lo alcanzado (7a); la previa, el cierre, los modos y el digest (10a) |
| `apps/web/src/domain/stageJournal.ts` | hoy | 6b, 12 | los `case` nuevos, el `default` vacío, `groupNounOf` y `linesOf` (6b); `variantSeed` y `pickVariant` con la revisión de la etapa (12) |
| `apps/web/src/components/Jersey.tsx` y `RaceRadioPanel.tsx` | hoy | 6b | `WornJerseyIcon` y `ChampionMark` (7-h); las palabras de D-18 |
| `apps/web/src/domain/pageTitle.ts` | 9a | | `usePageTitle`, el único que escribe `document.title` (§11.8) |
| `apps/web/src/pages/StageReplay.tsx` | hoy | 3c, 9a | 3c: la pestaña `Watch` (pantalla); 9a: `Report` (pantalla), `StageGateCard`, la ruta `/report` y el modo diagnóstico |
| `apps/web/src/domain/raceStages.ts` | 9b | | `stageRowState` (§11.4, `sup. C4`) |
| `apps/web/src/pages/Race.tsx`, `domain/raceTabs.ts`, `domain/raceTimeline.ts` y `components/Tabs.tsx` | hoy | 9b | las filas de la pestaña `Stages` (pantalla; `Race.tsx` l. 358-369), `raceTabs` con lo conocido (`raceTabs.ts` l. 53), el buscador sobre lo cortado y el contador de etapas por ver (`Tabs.tsx` l. 78-79) |
| la portada, el feed, las órdenes y los ajustes | hoy | 9b | §11.4, §11.5 y §11.12: los tres bloques de la portada, los avisos de los agregados, `StageReadyItem`, la puerta de las órdenes y el alcance del velo |
| `apps/web/src/components/LastRaceReport.tsx` y `domain/narration.ts` | hoy | 12 | `moments` en lugar de `personalNarration`; `narrate()` y su tabla fuera (§12.9) |
| `scripts/bench-pace.mjs` | 0 | 3a, 10b | la línea base de B17 con su copia de la curva (0, 17-c); importa `paceAt` (3a); B17 sobre la línea grabada (10b) |
| `scripts/broadcast-fixtures.mjs` y `apps/api/src/__fixtures__/broadcast/` | 2 | 4b, 5 | sucesos, radio, acta, `manifest.json` y `load.ts` de las seis (2); `.timeline.gz` e `.i1.json.gz` (4b); `--sizes` sobre las 24 × 2 (5) |
| `scripts/bench-tick.mjs` | 5 | 10b | B15 en los días 176 y 179 |
| `scripts/pl-truth.mjs` | 10b | | la verdad de cada punto de la prueba de lectura (16-i) |
| `scripts/race-radio.mjs` | hoy | 11 | `--db` lee `stage_timelines` (§12.10) |
| `apps/api/src/__fixtures__/spoilerWorld.ts` | 7a | 7b, 8a, 8b, 9b | el mundo de B1, las listas blancas y `PENDING_ROUTES` llena (7a); las pendientes que se cierran (7b, 8a, 8b); `PENDING_ROUTES` borrada (9b) |
| `eslint.config.js` | hoy | 2 | las dos reglas de 15-b (17-e) |
| `.github/workflows/ci.yml` y `cobertura.yml` | hoy | 4b | `timeline.test.ts` en «mundo y radio» (`ci.yml` l. 166-175); `CS_BANCOS: '1'` en el paso de `cobertura.yml` l. 63-64 |
| `docs/balance.md`, `docs/navegacion.md` y `docs/ops.md` | hoy | 12 | lo de D-58 (§17.15) |

### 17.21 Los tests, PR a PR

El mismo índice para los ficheros de test: dónde nace cada uno, qué PR lo amplía, qué mide y en qué suite corre. La suite rápida es `test:rapido`, en todo PR; la nocturna, `cobertura.yml` con `CS_BANCOS=1`. Los casos de cada uno están en la subsección de su paso.

| Fichero de test | Nace | Crece en | Mide | Suite |
| --- | --- | --- | --- | --- |
| `apps/api/src/app.test.ts` | hoy | 0, 3a | la compresión (§14.8); `/health` con `features` (14-l) | rápida |
| `apps/api/src/routes/yesterday.test.ts` | 0 | 1a, 3a, 7b, 8a | la web de ayer (D-50, 14-n) | rápida |
| `apps/api/src/spoilerRegistry.test.ts` | 0 | 3a, 7a, 8a | el inventario de rutas hasta el 8a; B1d desde el 8a (17-b) | rápida |
| `apps/api/src/chronicle.test.ts` | hoy | 2 | la voz en vivo (§12.2); los 62 de hoy, sin tocar | rápida |
| `apps/api/src/voicePrefix.test.ts` | 2 | 6b | B19 | rápida |
| `apps/api/src/broadcastCut.test.ts` | 3a | 6a, 6b | B9 | rápida |
| `apps/api/src/broadcastPace.test.ts` | 3a | 6b, 10a | B17 | rápida |
| `apps/api/src/broadcastConstants.test.ts` | 3a | 4a | las copias atadas de §15.5 | rápida |
| `apps/api/src/routes/broadcast.test.ts` | 3a | 6a, 7a, 7b | el contrato (§14.7); B6 de la meta y de la etapa velada; B12 por la petición; B18 | rápida |
| `apps/api/src/raceRadio.test.ts` | hoy | 3a, 7b | `veilStoredRadio` y la pestaña (§11.16, §11.19) | rápida |
| `apps/api/src/broadcastFixtures.test.ts` | 4b | 6a, 6b, 7b, 11 | I1, I3, I5 y B6 del `bytea` (4b); I2, B2 y B6 de lo servido (6a); B3 (6b); B13 (7b, 17-t); B16 (11) | rápida; B16 largo, nocturno |
| `apps/api/src/radioAdapter.test.ts` | 6a | | B22 | rápida |
| `apps/api/src/routes/me.test.ts` | 7a | | el contrato de `/api/me`; B12 por la petición | rápida |
| `apps/api/src/spoilerCanary.test.ts` | 7a | 9a | B1a | rápida |
| `apps/api/src/spoilerDiff.test.ts` | 7a | 8a, 8b | B1b | rápida |
| `apps/api/src/spoilerOutcomes.test.ts` | 7a | | B1c | rápida |
| `apps/api/src/stageRoute.test.ts` | hoy | 7b | `stageAccessOf`, la ruta que omite (14-e) y `?diag=1` (11-h) | rápida |
| `apps/api/src/emails.test.ts` | hoy | 9a | `stageReadyEmail` sin el canario | rápida |
| `packages/db/src/news.test.ts` | 1a | | B4 de las noticias | rápida |
| `packages/db/src/stageRun.test.ts` | hoy | 1a, 5, 8a, 11 | los titulares nuevos (1a); la fila y la lápida (5); `awardRacePrizes` (8a); la radio desde la línea (11) | rápida |
| `packages/db/src/abandon.test.ts` | hoy | 1a, 8b | el titular desde `data` (1a); `sup. X2`, `X9` y `X10` (8b) | rápida |
| `packages/db/src/migrations.test.ts` | hoy | 1a, 5, 7a, 8a | cada migración y el mundo vivo (§13.10) | rápida |
| `packages/db/src/columnasVivas.test.ts` | hoy | 1a, 7a, 8a | un escritor por columna con defecto (13-a) | rápida |
| `packages/db/src/schema.test.ts` | hoy | 5, 7a | `getTableName` y el enum atado a `SpoilerScope` | rápida |
| `packages/db/src/timelineCollector.test.ts` | 4b | | B10 | rápida; largo, nocturno |
| `packages/db/src/timelines.test.ts` | 5 | | la vuelta del `bytea` y la lápida (§5.10) | rápida |
| `packages/db/src/titles.test.ts` | 5 | | los campeones (§7.4) | rápida |
| `packages/db/src/cast.test.ts` | 5 | | el reparto congelado (7-b, 7-e) | rápida |
| `packages/db/src/horizon.test.ts` | 7a | 8a, 8b | B12 | rápida |
| `packages/db/src/horizonLatency.test.ts` | 7a | | B14 | rápida; el mánager, a mano contra Postgres |
| `packages/db/src/revealFree.test.ts` | 7a | | B20 | rápida |
| `packages/db/src/horizonReaders.test.ts` | 8a | | `Horizon` en toda lectora (10-c) | rápida |
| `packages/db/src/newsVeil.test.ts` | 8a | | las noticias bajo el velo (11-g) | rápida |
| `packages/db/src/fichaCorredor.test.ts` | hoy | 8b | la ficha sin los días velados (11-e) | rápida |
| `packages/db/src/ranking365.test.ts` | hoy | 8b | el recorte de 11-f | rápida |
| `packages/shared/src/news.test.ts` | 1a | 4a | B4 de las noticias; absorbe el del motor (4a) | rápida |
| `packages/shared/src/jerseys.test.ts` | hoy | 5 | `wornJerseys` y `distinctions` (§7.2) | rápida |
| `packages/shared/src/broadcast/pace.test.ts` | 3a | 6b, 10a | la curva (§8.12) | rápida |
| `packages/shared/src/broadcast/reduce.test.ts` | 3a | | I1 e I3 sobre fotos sintéticas | rápida |
| `packages/shared/src/broadcast/instant.test.ts` | 3a | | los papeles y el hueco principal (§6.2, §6.3) | rápida |
| `packages/shared/src/broadcast/cues.test.ts` | 6a | | la cola de rótulos (§6.5) | rápida |
| `packages/shared/src/broadcast/names.test.ts` | 6b | | la tabla de §7.6 | rápida |
| `packages/shared/src/broadcast/timeTrial.test.ts` | 6b | | la crono (§9.8) | rápida |
| `packages/shared/src/broadcast/pageTitle.test.ts` | 9a | | los títulos de §11.8 | rápida |
| `packages/engine/src/stage/probeHooks.test.ts` | 4a | | B11, la prueba de humo | rápida |
| `packages/engine/src/stage/timetrial.test.ts` | hoy | 4a | la sonda de la crono (§9.8) | rápida |
| `packages/engine/src/world/news.test.ts` | hoy | se borra en el 4a | lo cubre el de `shared` | |
| `packages/engine/src/sim/timeline.test.ts` | 4b | | B11, I1, I2, I3, I5, B2, B21 y B6 del JSON | «mundo y radio»; nocturno |
| `apps/web/src/api/contracts.test.ts` | hoy | 0 | la ceguera 5 del mapa 07 §5.2 | rápida |
| `apps/web/src/domain/newsFeed.test.ts` | hoy | 1b | el enlace por `raceId` | rápida |
| `apps/web/src/domain/voice.test.ts` | 2 | 6b | `inVoice`, `linesOf` y `mainNoun` | rápida |
| `apps/web/src/domain/broadcast/player.test.ts` | 3b | 6a, 10a | B9 del ritmo y las siete comprobaciones de §8.11 | rápida |
| `apps/web/src/components/broadcast/FixedOverlay.test.tsx` y `GroupBar.test.tsx` | 3c | 6b | la capa fija y la barra (§16.6) | rápida |
| `apps/web/src/domain/stageJournal.test.ts` | hoy | 4a, 6b, 12 | los re-sellos de §16.1 | rápida |
| `apps/web/src/domain/broadcast/clientCost.test.ts` | 6a | | B8 | rápida |
| `apps/web/src/domain/templateCoverage.test.ts` | 6b | | B7 | rápida |
| `apps/web/src/domain/stageJournal.corpus.test.ts` | 6b | 12 | B4 de la voz y del acta (6b); B5 (12) | rápida |
| `apps/web/src/components/raceRadioNames.test.tsx` | hoy | 6b | las palabras de D-18 | rápida |
| `apps/web/src/domain/pageTitle.test.ts` | 9a | | el único escritor de `document.title` | rápida |
| `apps/web/src/queryKeys.test.ts` | 9a | | `horizonKey` en toda clave con horizonte | rápida |
| `apps/web/src/domain/raceTabs.test.ts` | hoy | 9b | la clásica terminada y `?tab=story` (11-o) | rápida |
| `apps/web/src/domain/raceStages.test.ts` | 9b | | `stageRowState` | rápida |
| `apps/web/src/domain/raceTimeline.test.ts` | hoy | 9b | el buscador sobre lo cortado | rápida |
| `apps/web/src/components/broadcast/PlayerControls.test.tsx` | 10a | | los mandos a 360 px | rápida |
| los de render de la puerta, la portada, las órdenes, la previa y el cierre | 9a, 9b, 10a | | §8.6, §11.4, §11.11 y §11.12; §16.6 no les da fichero y van junto a su componente, con `renderToStaticMarkup` | rápida |
| `apps/web/src/domain/narration.test.ts` | hoy | se borra en el 12 | con `narrate()` | |

**Lo que se re-sella, por PR**, con la causa escrita en el propio test (regla 1; la tabla de lo que protege cada uno es §16.1): el 1a, `abandon.test.ts` l. 232-237; el 1b, `newsFeed.test.ts` l. 32-44; el 4a, el test de los tres nombres de `stageJournal.test.ts` (l. 1646-1650), que pasa a cuatro, y `world/news.test.ts`, que se muda; el 6b, «meteorito: Ana» (`stageJournal.test.ts` l. 89-93) y los seis `it` de `raceRadioNames.test.tsx`; el 9b, `raceTimeline.test.ts` l. 120-128; el 11, `stageRun.test.ts` l. 322-339; el 12, las variantes fijadas de `stageJournal.test.ts`, una sola vez, y `narration.test.ts`, que se borra. Ningún otro PR pone en rojo un test de hoy. Lo que §16.1 llama la red de E2 sigue en verde en los veintidós sin tocarse: los 62 de `chronicle.test.ts`, `leaderJerseys.test.tsx`, `index.test.ts` l. 465, «la radio no toca la carrera» (`packages/engine/src/sim/raceRadio.test.ts` l. 748-799), las huellas de `stage/attribution.test.ts` y `stage/timetrial.test.ts`, `checkReplay`, `coherence.test.ts`, `stage/journal.test.ts`, `stageTables.test.tsx` y `stageStoryJerseys.test.tsx`.

### 17.22 El coste, PR a PR

Los costes de §17.3 a §17.15 juntos, en sesiones de trabajo como las de `docs/generador.md` §15 («**Coste.** 1 sesión», l. 9613), estimadas por este documento y no medidas. La columna En orden suma en el orden de §17.2 con un solo implementador, y la de Camino crítico dice cuándo acaba cada PR del camino de §17.16 si lo que puede ir en paralelo va en paralelo. Todo PR paga la rápida: unos 10 min hoy (37,4 s de `typecheck` y de 529 a 562 s de `test:rapido`, medido) y de 11 a 14 con lo que E2 le añade (regla 5, estimado).

| PR | Tam. | Sesiones | Además de la rápida | En orden | Camino crítico |
| --- | --- | --- | --- | --- | --- |
| 0 | S | 1 | B6 y B17 de línea base, a mano | 1 | 1 |
| 1a | M | 2 | | 3 | |
| 1b | S | 0,5 | | 3,5 | |
| 2 | M | 2 | | 5,5 | 3 |
| 3a | L | 3 | | 8,5 | 6 |
| 3b | M | 2 | | 10,5 | |
| 3c | M | 2 | | 12,5 | |
| 4a | M | 2 | los ocho tramos (regla 4) | 14,5 | |
| 4b | L | 4 | los ocho tramos (regla 4) | 18,5 | 10 |
| 5 | L | 3 | B15 y B6 del `bytea`, a mano | 21,5 | 13 |
| 6a | L | 3 | | 24,5 | 16 |
| 6b | L | 3 | | 27,5 | 19 |
| 7a | L | 3 | B14 contra Postgres y `sendBeacon`, a mano | 30,5 | |
| 7b | M | 2 | | 32,5 | 21 |
| 8a | L | 3 | | 35,5 | 24 |
| 8b | L | 3 | | 38,5 | 27 |
| 9a | L | 3 | | 41,5 | |
| 9b | L | 3 | | 44,5 | 30 |
| 10a | L | 3 | | 47,5 | 33 |
| 10b | S | 1, más media jornada de la prueba de lectura | B17, B15, el móvil y la prueba de lectura, a mano | 48,5 | 34 |
| 11 | M | 2 | B16 largo, en el nocturno | 50,5 | |
| 12 | M | 1,5 | | 52 | 35,5 |

Los cortes de §17.17 caen, en orden, a las 12,5 sesiones (tras el 3c; a las 10 si el 1a y el 1b esperan, y no deben esperar si el reinicio está cerca), a las 27,5 (tras el 6b), a las 38,5 (tras el 8b) y a las 48,5 (tras el 10b). El 7a, el 9a y el 11 no están en el camino crítico: el 7a acaba a las 16 sesiones en paralelo con el 6a y el 6b; el 9a, a las 24, antes que el 8b; y el 11, a las 26.

---

**Injertos aplicados.** I-13 (§17.4: la `0043` como primera migración de E2, en el paso 1 y antes del reinicio, con `NewsPayload`, el equipo del día, `breakaway_win` comprobado y `text` de compatibilidad hasta DD-19), I-30 (§17.10 y §17.11: B1b diferencial y B1c de dos desenlaces nacen en el 7a con `PENDING_ROUTES`, que el 7b, el 8a y el 8b vacían y que se comprueba en los dos sentidos), I-45 (§17.6 y §17.18: los interruptores `BROADCAST_WATCH` y `SPOILER_MODE` y `Watch` para el dueño en el paso 3 con el reloj estimado).

**Objeciones resueltas.** O-06 (§17.4: la migración de noticias es la primera y tiene fecha), O-16 (§17.14: B16, en la rápida y en las 24 etapas, antes de dejar de escribir la radio).

**Huecos rellenados.** H-02 (§17.15: el paso 12 corrige `docs/balance.md` l. 14684-14686 y ata toda subida de versión al 17d; la doctrina entera es §19.5), H-04 (§17.13: la prueba de lectura como puerta del encendido, en el 10b), H-16 (§17.19: las etapas corridas entre el despliegue y el reinicio). Contradicciones de hecho que quedan resueltas: X-05 (§17.15: subir la versión no tira las crónicas guardadas) y X-22 (§17.1 y §17.7: pagan los bancos los PR que tocan `packages/engine/`, solo el 4a y el 4b; la próxima migración libre es la `0043`). Del dueño: DD-11 (§17.14) y DD-19 (§17.15, §17.19), con su valor por defecto; [DOC 1] (§17.4) y [DOC 7] (§17.13).

**Decisión tomada aquí.**
- 17-a. El formato guardado se cierra antes de la primera línea grabada: lo que las secciones proponen guardar además de §4.3 (`TimeTrialTrace.checkClockDs` de 9-b, `TimelineCast.favourites` de 8-g) entra en el formato 1 en el 4b si el ensamblador lo acepta, y `stage_timelines.tpl_rev` de 12-c, en la `0044` del 5 y no en una quinta migración. Descartado: añadirlo después, que obliga a un `format` 2 con su decodificador y deja sin el dato las líneas grabadas entre medias.
- 17-b. `apps/api/src/spoilerRegistry.test.ts` nace en el paso 0 como inventario de rutas (método y URL) y pasa a ser B1d en el 8a, cuando la lista gana la clase y el mecanismo y el registro empieza a lanzar. Descartado: B1d en el 7a, como dice §16.9: las rutas se declaran todas en el 8a (§11.3, §14.1 y §B del esqueleto) y en el 7a B1d no podría estar en verde.
- 17-c. La línea base de B17 del paso 0 la da un script con su propia copia de la curva y su propio reloj estimado de la cabeza, porque D-19 la fija en el paso 0 y `paceAt` y el adaptador nacen en el 2 y el 3a; en el 3a el script pasa a importar `paceAt`. Descartado: mover la línea base al 3a.
- 17-d. El PR 2 trae `reveal.ts`, el reloj estimado de la cabeza y el `revealS` de los sucesos guardados, porque B19 nace con el de lo guardado (16-a); el 3a construye el adaptador encima.
- 17-e. `BROADCAST` y `SPOILER` nacen enteros en el PR 2, el primero que los lee, con las dos reglas de ESLint de 15-b en el mismo PR (la duda de §15 las situaba en el 4b): protegen desde que existe lo protegido.
- 17-f. `veilStoredRadio` y sus casos entran con el adaptador en el 3a, porque el adaptador corta para todos la lista de seguimiento (11-l) y el dueño ya ve `Watch` en el 3c; el 7b añade los de la pestaña, que §11.19 fechaba en el 7b.
- 17-g. `packages/db/src/horizon.ts` nace en el 3a con los tipos y las funciones puras (`worldHorizon`, `anonHorizon()`, `isVeiled`, `throughStage`, `stageGateOf`), porque `timelineForStage` y `readStageTimeline` reciben un `Horizon` desde que existen (5-p, 14-p); `computeHorizon` llega en el 7a, `veilCast` en el 7b, `veilSql` en el 8a y `veilDelta` en el 8b.
- 17-h. `registerSpoilerGuard` se construye en tres PR: el 3a (el registro que apunta sin lanzar, con `policy` y `veil` opcionales, y los cuatro métodos de la petición sin horizonte), el 7a (`cs_viewer`, `SPOILER_MODE` y el gancho `onSend`) y el 8a (las tres comprobaciones que lanzan, con `policy` y `veil` obligatorios). Por qué: B1a a B1c barren el registro desde el 7a y las rutas se declaran en el 8a.
- 17-i. Todo lo de E2 bajo `packages/engine/` entra en el 4a o en el 4b, también las versiones de banco de I2, B2 y B21 que §16.9 fechaba en el 6a (`instantAt` existe desde el 3a), para que ningún PR posterior pague los bancos (D-54).
- 17-j. El 4a exporta del motor `NAME_WHOLE_GROUP_UP_TO` y `chaseReferenceIndex`, y el 4b, `realRaceScenario`, que hoy no se exporta (`sim/scenarios.ts` l. 518; `index.ts` l. 197-204) y que B10 importa desde `packages/db`.
- 17-k. El reparto congelado entra entero en el 5 (`buildTimelineCast`, `wornJerseys`, `distinctions`, `palmaresTitleSource` y `knownWins`), no en el 6b como decía el esqueleto (§17.9): se congela al grabar (D-15) y lo guardado no se reescribe (D-10). El 6b trae lo que se sirve y se pinta (`serveCast`, `namedRidersOf`, `breakHeadline` y las cartas).
- 17-l. La versión larga de B16 (24 etapas por dos semillas) corre en el nocturno con `CS_BANCOS=1` en `apps/api/src/broadcastFixtures.test.ts`, y no en el tramo «mundo y radio» como dicen §16.4 y §16.7, por tres razones: el paso 11 no puede tocar `packages/engine/` (D-54); B16 compara con `buildRaceRadio`, que vive en `apps/api` (`apps/api/src/chronicle.ts` l. 1340) y el motor no puede importar; y `radioFromTimeline` no existe hasta el 11, así que el `timeline.test.ts` del 4b no tendría con qué comparar. La corta, en el mismo fichero, sobre las seis.
- 17-m. El tope de lo alcanzado de los tramos (409 `beyond_reached`) y B18 entran en el 7b, con el cierre de la etapa (11-a; «Mecanismo en: 3a · 7b» de §11.3), y no en el 7a como dice §16.9.
- 17-n. `PENDING_ROUTES` se queda vacía al cerrar el 8b (D-54: el 8b cierra con B1 en verde en todas las rutas); la constante y sus `it` se borran en el 9b, como dice §16.3.
- 17-o. El digest y su botón entran en el 10a; el 9b pinta `While you were away` con sus otras tres salidas.
- 17-p. El 10b es el PR de la aceptación: medidas, prueba de lectura, ajustes de constantes de `shared` y su registro; los interruptores se encienden cuando está fusionado.
- 17-q. Tamaños y costes: S, M o L por líneas de diff; el trabajo, en sesiones estimadas por este documento (unas 52 en total y 34 hasta el encendido por el camino crítico, §17.22), no medidas.
- 17-r. El `teamId` de los titulares de etapa sale de `input.riders[].teamId`, que `awardOutcome` pasa a recibir en el 1a (hoy no lo recibe: `packages/db/src/stageRun.ts` l. 1143-1149): es la misma fuente que el reparto congelado (D-15) y la voz (§12.7). Descartado: `riders.team_id` al escribir, la otra fuente que da 12.8; dentro del tick valen lo mismo, y con una sola fuente para titular, reparto y voz hay una cosa menos que comprobar.
- 17-s. B12 y B13 siguen a §16.9 (7a, 8a y 8b; 7b) y no al esqueleto, que en §17.11 los ponía en el paso 8: `computeHorizon` nace en el 7a y `veilCast` en el 7b, y los casos de cada función entran con su código; el paso 8 añade el del predicado (8a) y el de la retirada (8b).
- 17-t. B13 corre en `apps/api/src/broadcastFixtures.test.ts`, junto a B3, y no en `packages/shared/src/broadcast/veilCast.test.ts` como dice §16.4: `veilCast` vive en `packages/db/src/horizon.ts` (§10.10), `@cyclingstar/shared` solo depende de `zod` (`packages/shared/package.json` l. 18-20) y las seis cabeceras congeladas están en `apps/api/src/__fixtures__/broadcast/`. Descartado: mover `veilCast` a `shared`, que cambia §10.10 para acomodar un test.

**Propuesto para el glosario.**
- Los nombres de los PR que §G.10 no daba: 8a, P, F, G y N; 8b, R y M; 9a, la web de la etapa; 9b, la web del mundo; 10a, montaje y modos; 10b, aceptación y encendido.
- `packages/db/src/cast.test.ts`: los tests del reparto congelado (7-b, 7-e y la procedencia), en el paso 5.
- `apps/web/src/components/broadcast/FixedOverlay.test.tsx` y `GroupBar.test.tsx`: los primeros de los tests de componentes de §16.6, en el 3c.
- `apps/api/src/spoilerRegistry.test.ts` como inventario de rutas del paso 0 (el fichero de B1d de §16.3, que nace antes).

**Dudas para el ensamblador.**
- §16.3 y §16.9 fechan B1d en el 7a; §11.3, §14.1 y el esqueleto ponen el registro que lanza en el 8a. 17-b sigue a estos y deja el fichero como inventario desde el 0.
- §16.9 fecha B18 en el 7a y §11.3 pone el tope de lo alcanzado en el 7b (17-m); y las versiones de banco de I2, B2 y B21, en el 6a, que obligaría al 6a a tocar `packages/engine/` (17-i). §16.4, §16.7 y el comentario del código de §16.4 (`timeline.test.ts`, «paso 4b») ponen B16 en el tramo «mundo y radio», que obligaría al 11 a pagar los bancos y no puede importar `buildRaceRadio` (17-l). §16.4 pone B13 en `packages/shared`, que no puede importar `veilCast` (17-t).
- §16.3 dice que `PENDING_ROUTES` «se vacía en el 9b»; con D-54 se vacía en el 8b (17-n).
- B6 de lo guardado nace en rojo con los topes de D-11 (§5.7, §16.4): los valores de §15.2 tienen que quedar fijados antes de abrir el 4b.
- B14 con el perfil de mánager (16-k): es puerta contra Postgres en el 7a, y si no pasa decide el dueño, con `SPOILER_MODE` sin pasar a `on` mientras tanto (§17.13, punto 5). §20 tiene que recogerlo como decisión del dueño. B15 pasa con la regla de 16-l, pero §18.1, §18.3 y §18.10 citan todavía los umbrales viejos de B8 y B15.
- B1c depende de los favoritos congelados de 8-g (`TimelineCast.favourites`): si el ensamblador no acepta 8-g, B1c nace en rojo en el 7a (§17.8, riesgo), y la única salida es congelarlos en un `format` 2 (D-10).
- §14.3 no llama a `withGroupRoles` ni a `liveClusters`: el 6b los pone en la ruta del tramo en el orden de 12-n (los papeles antes de atar las horas; los racimos antes de `buildChronicle`), y el código de §14.3 tiene que decirlo.
- La firma de `emitNews` que usa el 1a es la de 12.8 (`opts.seed`, `opts.payload`, `opts.raceKey`), que §G.2 y §G.4 no recogen; §13.2 la remite a §12.7 y §12.8. El equipo del día, por 17-r.
- La regla 4 corrige la cifra del CI de los bancos del esqueleto («los del motor, unos 73 min más»): 73 min son las pruebas en serie; la matriz paga más minutos de runner (82,8 con seis tramos) y menos de reloj (el tramo más largo), y el de los ocho de hoy no está medido en `ci.yml`.
- El esqueleto (§17.9) pone `wornJerseys` y `palmaresTitleSource` en el 6b; 17-k los adelanta al 5.
- §13.3 no tiene `stage_timelines.tpl_rev` (12-c) ni §4.2 `TimelineCast.favourites` (8-g) ni `TimeTrialTrace.checkClockDs` (9-b): si se aceptan, entran en el 4b y en el 5 (17-a).
- §8.9 dice que B17 corre en el paso 0 «con el adaptador», que aún no existe (17-c).
