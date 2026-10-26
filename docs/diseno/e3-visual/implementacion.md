# E3 · La implementación, PR a PR

Lo que entra en cada PR del plan de `docs/visual.md` (§17.2, en el orden de §17.25), lo que se aparta del diseño y por qué, y lo que el paso siguiente tiene que saber. Cada PR añade su fila a la tabla y su apartado de notas debajo, y su paso a la línea de estado de `docs/visual.md`.

La base de E3 es `912c5fa` (25-10-2026): `main` con el diseño fusionado (#306) sobre `58c14da`, la versión de producción con el motor v91 y E2 encendido. `ENGINE_VERSION` sigue en 91 y no la mueve ningún PR de E3 (§17.1, regla 3). Las citas de línea del diseño se escribieron contra `58c14da`, y entre `58c14da` y `912c5fa` no cambia nada fuera de `docs/`; cada PR las comprueba contra el código de su día, y las que se han movido van en sus notas.

## Decisiones del dueño durante la implementación

1. **El código de E3 se abre el 25 de octubre de 2026** (`docs/diseno/e3-visual/00-encargo.md` §7.8): «Sí, fusiónalo y empieza por el PR 1 y sigue con todo lo demás del E3». Se trabaja en el modo autónomo de `Claude.md`: cada PR con sus tests, el CI en verde y la fusión en cadena, parando solo para lo que pide al dueño (Railway, cuentas externas, verificación visual en producción o una decisión de producto grande).

## La tabla

| Paso · PR                                      | Qué entró                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Tests                                                                                                                                                                                                                        | Se aparta del diseño                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · 1, el clon                                 | La `0050_semilla_del_dibujo` (`teams.jersey_style_seed`, `text`, nula); `updateOwnedTeam` escribe ahí el maillot elegido; `teamDrawSeed`, `coalesce(jersey_style_seed, jersey_seed)`, en todo lo que dibuja; `teamIndexFromSeed` da `null` a una semilla que no es de génesis y `reconcileTeams` ni poda ni renombra esos equipos; y `removeJerseyClones`, un paso del tick tras `seedWorld`, que borra el clon que ya haya (D-00q)                                                                    | `jerseyClone.test.ts` (nuevo, cuatro casos de §8.9 contra PGlite con el mundo de la génesis entero); `migrations.test.ts` y `schema.test.ts` con la `0050`                                                                   | el clon se reconoce por la primera alta de corredores de la base y no por `worlds.created_at`; solo se borran sus corredores nacidos después de la génesis; dos lectores más del dibujo                                                                                                                    |
| 2 · 2a, el mundo de la prueba                  | `@playwright/test` 1.56.1 y `axe-core` 4.10.3; `playwright.config.ts` con sus dos proyectos; `e2e/world/build.mjs` y `serve.mjs` (§7.2); `e2e/fonts.conf`; los trabajos `Teléfono` (con el filtro de los cinco caminos) y `Teléfono de noche`, con la acción compuesta `.github/actions/telefono`                                                                                                                                                                                                      | `build.mjs`, que para si el mundo no acaba como se espera (219 equipos, el día 50, la toma del equipo, una crono corrida); `nocturno.spec.ts` con sus cuatro pasadas, dos hasta el 2b                                        | `fonts.conf` deja ver a Chromium solo los seis ficheros de DejaVu, no es un alias sobre la configuración del sistema; `Teléfono de noche` informa (`continue-on-error`); los umbrales que hoy no se cumplen, `test.fixme` con su cifra                                                                     |
| 2 · 2b, la prueba del teléfono                 | `telefono.spec.ts` con las diez comprobaciones en las 46 pantallas a 360 y 320, `control.html`, `pantallas.ts`, `medidas.ts`, `navega.ts` y `trinquete.ts`; `ui/constants.ts` y `shared/kit.ts`; `data-kit` en `Jersey.tsx`; `telefono-baseline.json` con las faltas de hoy; `Teléfono` mide la base y el PR; las pasadas 3 y 4 de la noche                                                                                                                                                            | el instrumento contra `control.html` y su letra por CDP; las reglas del trinquete con cifras de mentira; `kit.test.ts`                                                                                                       | el trinquete compara con la base medida sobre el mismo mundo en cada PR y el fichero apunta la dirección; la comprobación 1 contra `clientWidth`; la 38 salta a `Last starter`                                                                                                                             |
| 4 · 4, sin red                                 | `net.ts` (`SessionState`, `sessionStateOf`, `REQUEST_TIMEOUT_MS`, la marca `cs:signed-in` y `useOnline`) y `useSessionState`; el corte a 15 s en `api/request.ts`; `ProtectedRoute`, `Header` y `BottomNav` con `unknown`; `OfflineBanner`, `OfflineState` y `ErrorState`; la barrera por ruta y las páginas con su fallo tipado (`lazyPage`); `PausedOffline`; `sessionSeenOf` en `HorizonWatcher`; `sinred.spec.ts` y su paso en `Teléfono`                                                          | `net.test.ts` contra el cliente de better-auth 1.6.25; `queryClient.test.ts`, `OfflineBanner`, `OfflineState`, `ErrorState` (con la barrera), `PausedOffline` y `request.test.ts`; `sinred.spec.ts`, ocho casos y un `fixme` | `HorizonWatcher` sí se toca; mientras better-auth vuelve a pedir la sesión vale la última respuesta; lo de la cuenta solo con `signed-in`; `PausedOffline` hasta el 10; la hora, la de la consulta más reciente; reintentar un trozo es recargar                                                           |
| 6 · 6, el peso                                 | `scripts/flag-sprite.mjs`, que pinta las 133 banderas en `assets/flags.webp` y copia sus SVG a `assets/flags/`; `flagSprite.generated.ts`; `Flag.tsx` del sprite, con la caja de `.fi`; `flag-icons` fuera de `main.tsx` y en `devDependencies` 7.5.0; `"sideEffects": false` en `shared`; `scripts/peso.test.mjs` en `Build`; los umbrales de la noche                                                                                                                                                | `peso.test.mjs` (los tres presupuestos), `generados.test.ts` (las huellas del sprite y de los SVG copiados) y `Flag.test.tsx`                                                                                                | el sprite lleva un anillo que repite el borde de cada bandera (52,7 KB y no 47); lo pinta Chromium; `Flag` conserva su API hasta el 9b                                                                                                                                                                     |
| 7 · 7, los tokens                              | el `index.css` de §3.9, con el cierre comentado y los heredados, sin el modo oscuro; `kit-edge`, `kit-edge-strong` y `kit-ink`; `colorMath.ts` fuera del barril, con su entrada en `exports`; `scripts/tokens-json.mjs` y `packages/shared/tokens.json`, exportado; `generados.test.ts` donde lo pone §16.2, con `scripts/huellas.json`                                                                                                                                                                | `colorMath.test.ts` contra colour-science 0.4.7; `tokens.test.ts`, cada pareja de §3.1 a §3.3 y el ΔE00 informado; `generados.test.ts` con `tokens.json`                                                                     | el empate de la mezcla se redondea al par, como el `round` del diseño; `tokens.test.ts` lee `tokens.json`; `spacing.DEFAULT` y sin `brand-*` en `tokens.json`                                                                                                                                              |
| 8 · 8, las reglas                              | `vocabulario.test.ts` con `deuda.json` (los cuatro contadores por fichero, las dos sondas y el modo `escribe`); `apps/web/eslint-ui.mjs` con `UI_RULES`, `ARBITRARY_ALLOWED` y `UI_HEREDADOS`, y sus dos bloques en `eslint.config.js`; los cuatro paquetes de Tailwind a la 4.3.3 exacta; lo que se sirve sale solo de los fuentes de producción (`@source not`)                                                                                                                                      | `vocabulario.test.ts` (las sondas, los contadores contra sus muestras y el trinquete); `heredados.test.ts` (la lista solo encoge, un fichero nuevo nace en `error` y cada regla contra una muestra que avisa y otra que no)  | `tema` es 2.760 y no 2.740, por los tres componentes del 4 (17-c); el cerrado quita también los `brand-*`; `ARBITRARY_ALLOWED` vive en `eslint-ui.mjs`; `ui/5` no cuenta el mensaje de un `ApiError`; las reglas no corren en los `__fixtures__`                                                           |
| 9 · 9a, el catálogo                            | `ui/types.ts` y `ui/styles.ts`; las 26 fuentes de `scripts/icons/`, `scripts/ui-icons.mjs` (las reglas de las fuentes, el trazo y las siluetas de tono con Chromium), `ui/icons.tsx` y la hoja de contactos; `Icon`, `Button`, `TextLink`, `Field`, `Segmented`, `InfoButton`, `Disclosure`, `ActionBar` (con `keyboard.ts`), `Panel`, `PageHeader`, `Tabs`, `Stat`, `Notice` y `Chip`; `ErrorState`, `OfflineState` y `OfflineBanner` con los tokens; `/_ui`, con `fixtures.ts`, `noindex` y su trozo | un test por componente con un caso por estado, mirando `data-*` y ARIA; `generados.test.ts` con `ui-icons.mjs --check`; `/_ui`, la primera de `pantallas.ts`, a cero a 360 y a 320                                           | `/_ui` va fuera del marco de la web; `scrollbar-none`, una utilidad del tema; `--action-bar-bottom` a 0 hasta el 11; `Tabs` centra la activa con el `scrollLeft` de su carril; un `TextLink` fuera de una frase mide 44; el botón de la `ActionBar` no es un `Button`; los esqueletos, propios hasta el 10 |
| 9 · 9b, la identidad, las tablas y las escalas | `legacyJerseyStyle` en `packages/shared/src/legacyJersey.ts`, fuera del barril y con su entrada en `exports`, con su tabla dorada de las 219 semillas de la génesis; `visuals.ts`, una reexportación; `ui/LegacyJersey.tsx`; `Flag`, `StarRating`, `Meter`, `Scale5`, `RiderLabel`, `RiderHeader`, `RankTable`, `ActionRow` y `TripRow`; `domain/words.ts`; `TextLink` con `glueEnd`; sus estados en `/_ui`, con la general de 140 filas y la propia en el 34                                          | `legacyJersey.test.ts` contra la tabla dorada; `LegacyJersey.test.tsx` contra `Jersey`, semilla a semilla; un test por componente con un caso por estado; `/_ui`, a cero a 360 y a 320                                       | `teamLine` en `RiderLabel`, e `identityHeader` y `clip` en `RankTable`; `Show all` con el aspecto de `Button`; el maillot, pegado con `white-space`; los maillots de hoy hasta el 17a; `TripRow` escribe su interfaz; `ActionRow` ocupado, sin texto propio                                                |

## PR 1 · El clon

### Lo que entró

- **La `0050_semilla_del_dibujo`**, de `drizzle-kit generate --name semilla_del_dibujo`: una sola sentencia, `ALTER TABLE "teams" ADD COLUMN "jersey_style_seed" text;`, nula y sin defecto, así que no reescribe la tabla. Es la 51.ª entrada del journal (`idx` 50), la siguiente a la `0049_rastro_de_etapa`, como decía §17.1, regla 4.
- **`updateOwnedTeam`** (`packages/db/src/teamControl.ts`) escribe el maillot elegido en `jersey_style_seed` y nunca en `jersey_seed`. La ruta (`PUT /api/teams/me`) y su esquema no cambian: el cuerpo sigue llamando `jerseySeed` a la semilla elegida.
- **`teamDrawSeed`** y **`teamDrawSeedOrNull`** (`packages/db/src/jerseyClone.ts`): `coalesce(jersey_style_seed, jersey_seed)`, servido con el nombre de hoy, `jerseySeed`. Lo leen los seis sitios que dibujan: el reparto (`cast.ts`), `getCastIdentities` (`castIdentities.ts`), la lista y la ficha de equipos (`browse.ts`, `getTeams` y `getTeamDetail`) y las dos listas de inscritos de una carrera (`calendarRun.ts`, `resolveFieldTeams` y la escuadra congelada). Ningún contrato ni la web cambian.
- **`teamIndexFromSeed`** (`packages/db/src/world.ts`) se exporta y da `null` a toda semilla que no case con `:team:(WT|PRS|CON):i:jersey`. `reconcileTeams` deja fuera de la poda y del renombrado a esos equipos y reserva su nombre; `clusterTeamNationalities` los ordena al final de su división.
- **`removeJerseyClones(tx, worldId)`** (`packages/db/src/jerseyClone.ts`), en `runTick` tras `seedWorld`, en su propia transacción. Sin ningún equipo con semilla que no sea de génesis es una sola consulta y no deja nota; si encuentra el clon, `tick_log.notes` dice `jersey clone removed: <nombre> (<id>), 12 riders`.

### Lo que se aparta del diseño, y por qué

1. **El clon se reconoce por la primera alta de corredores, no por `worlds.created_at`.** §8.9 tomaba como clon a un equipo sin dueño «cuyos corredores nacieron todos más de un día después que el mundo (`worlds.created_at`)». Pero `worlds.created_at` es el ancla del reloj, y `reanchorClock` (`packages/db/src/tick.ts` l. 116-128) la mueve tras cada avance manual: con un mundo adelantado a mano, la génesis entera habría «nacido más de un día después que el mundo», todos los equipos serían candidatos y la regla de uno con uno no habría borrado nada. La génesis es la primera alta de corredores de la base, `min(riders.created_at)`: todos los de la génesis entran en una transacción, con el mismo `now()`, y los del clon en otra posterior. El criterio es que la mayoría de los corredores del equipo nacieran después de ese instante (y no todos, porque el mercado de los NPC pudo cambiar alguno de equipo desde que nació el clon).
2. **Del clon solo se borran sus corredores nacidos después de la génesis**, y no todos los que tenga hoy. Uno de la génesis que hubiera fichado por el clon es un corredor legítimo: queda libre, porque la clave `riders.team_id` es `on delete set null`. Las 19 referencias a `riders.id` de `schema.ts` son `on delete cascade`, así que el rastro de los borrados (contratos, diarios, resultados) se va con ellos, como decía el diseño.
3. **También cuentan los equipos sin dueño que abandonaron su semilla de génesis.** El diseño buscaba solo los que tienen dueño; uno que lo perdió después de cambiar el maillot también deja el hueco por el que `seedWorld` crea el clon, y la misma regla lo arregla.
4. **Dos lectores más del dibujo.** §17.3 nombraba los contratos, el reparto y `getCastIdentities`; `browse.ts` (la lista y la ficha, que dan los contratos de equipo) y `calendarRun.ts` (las listas de inscritos de una carrera, que pintan el maillot en `Race.tsx`) también leían `jersey_seed` para dibujar, y pasan a `teamDrawSeed`. Lo que identifica al equipo (`seedWorld`, `reconcileTeams`, `clusterTeamNationalities` y su nombre por idioma) sigue en `jersey_seed`.
5. **La nota de una división sin clon claro** solo sale cuando hay candidatos y no casan uno con uno (`jersey clone: CON, 2 sin semilla de génesis y 1 candidatos, no se borra nada`). Sin candidatos no hay nada que contar, como en los mundos de prueba que montan equipos con semillas propias (`equipacion-1`, `j1`).

### Las cifras (para la descripción del PR)

**La reproducción del mapa 03 §2.2**, con el arreglo (`jerseyClone.test.ts`, PGlite, el mundo de la génesis de la semilla `semilla-clon`): el CON 0 con dueño, la cuarta candidata (`<id>:jersey:3`) y un tick: siguen 219 equipos y 3.900 corredores, la semilla de génesis no se mueve y `getCastIdentities` sirve la elegida; el tick deja `sin días pendientes`, sin nota de clon. **Con el `updateOwnedTeam` de antes, el mismo caso falla** (el equipo pierde su semilla de génesis), comprobado devolviendo `teamControl.ts` a `912c5fa`. **El clon de hoy**: la semilla escrita a mano en `jersey_seed` y `seedWorld` dan 220 equipos y 3.912 corredores, con un NPC del mismo nombre; `removeJerseyClones` lo borra con sus 12 corredores, vuelven 219 y 3.900, el equipo con dueño recupera su semilla de génesis y conserva su dibujo, y ni un segundo paso ni el tick siguiente hacen nada. Los cuatro casos tardan unos 8 s.

### Lo que ve el dueño

Nada en pantalla. Elegir maillot en `/team/identity` deja de crear un equipo, y **tras el primer tick del despliegue el clon de producción ya no está**: el panel de administración lo dice en las notas del tick (`jersey clone removed: …`). Su equipo se sigue viendo con el maillot que eligió.

### El riesgo del despliegue

- **La `0050`** la aplica el arrancador al subir el servicio `web`, con su candado; es un `ADD COLUMN` nulo, instantáneo.
- **El borrado del clon no se deshace**: un revert devuelve el defecto (y la `0050` queda inerte), pero el clon y sus corredores no vuelven (D-00q, DD-17, decidido por el dueño). Lo grabado de las etapas que corrió el clon se queda: una etapa vieja sin línea pinta a esos corredores con el país desconocido (`XX`, `broadcastSource.ts` l. 1298), como a cualquier corredor que ya no está.
- **Si la nota del primer tick no dice `jersey clone removed`**, no se borró nada: o no había clon, o la división no casaba uno con uno (y lo dice). En ese caso el clon se queda como un NPC más, y no nace ninguno nuevo.

### Notas para el paso siguiente

1. **El 2a y el 2b** no dependen de este. El mundo de la prueba del teléfono (§7.2) se monta con `runTick`, que ya corre `removeJerseyClones`: en un mundo recién nacido no hace nada.
2. **`jersey_style_seed` muere en el 19c** con la `0053_sin_semilla_del_dibujo`, junto con `jerseySeed` de los contratos, cuando la traducción del 17b ya haya corrido en producción. Hasta entonces, todo lector nuevo que dibuje un equipo usa `teamDrawSeed`, nunca `teams.jerseySeed`.
3. **`teamIndexFromSeed` puede dar `null`**: quien lo use para ordenar o para un país tiene que decidir qué hace con un equipo sin semilla de génesis, como `reconcileTeams` y `clusterTeamNationalities`.

## PR 2a · El mundo de la prueba y los trabajos del CI

### Lo que entró

- **`@playwright/test` 1.56.1 y `axe-core` 4.10.3**, de versión exacta, en las `devDependencies` de `apps/web/package.json` (§7.6). El Chromium es el 141 (la compilación 1194), el mismo que trae preinstalado el contenedor de diseño en `/opt/pw-browsers`.
- **`apps/web/playwright.config.ts`**, con sus dos proyectos: `telefono` (`telefono.spec.ts`, desde el 2b) y `nocturno` (`nocturno.spec.ts`), un solo trabajador porque el mundo es una PGlite de una sola sesión, y la base en `E2E_BASE`.
- **`apps/web/e2e/world/build.mjs`**, el port de `docs/diseno/e3-visual/capturas/mundo.mjs` (§7.2): migraciones, génesis, las tres cuentas con sus cuatro escrituras con SQL, cincuenta días de calendario con `timelineRecord: 'on'`, la toma del equipo y los planes, y el volcado en `.mundo/mundo-50.tar.gz` con `cuentas.json`. Cada llamada a la API comprueba su código y el script para con su motivo si algo no es lo esperado, y antes de volcar comprueba el estado final: 219 equipos, el día 50, el corredor del jugador, el equipo del mánager y la primera contrarreloj corrida (7-a, 7-i). `--day` construye un mundo más corto para probar el script (uno de 20 días tarda 4 minutos); el CI y la línea base usan siempre el de 50.
- **`apps/web/e2e/world/serve.mjs`**, el port de `capturas/servir.mjs`: la API de verdad y la web compilada sobre el volcado, con `BROADCAST_WATCH` y `SPOILER_MODE` en `on` y el ancla del reloj puesta.
- **`apps/web/e2e/fonts.conf`**: sobre la configuración del sistema, Chromium solo ve los seis ficheros de `fonts-dejavu-core` (una lista blanca por nombre de fichero, estén en la carpeta que estén), y `system-ui`, `sans-serif`, `serif` y `monospace` son las de DejaVu (§7.6, 7-k).
- **`apps/web/e2e/nocturno.spec.ts`**, las pasadas de §16.5: el rendimiento en las cuatro páginas del mapa 05 §12 (la mediana de cinco cargas en frío y en caliente, con Slow 4G y la CPU a ×4) y `Watch` con los umbrales de E2 (la primera pintura con Fast 4G, los fotogramas y las tareas largas a ×1 y ×4). Las cifras de cada noche van adjuntas al informe (`nocturno.json`).
- **`apps/web/e2e/tsconfig.json`** y `typecheck` de la web con `-p e2e`: los `.ts` de la prueba los comprueba el compilador, no solo los transpila Playwright.
- **El trabajo `Teléfono`** en `ci.yml`, con el filtro de los cinco caminos (§7.4), y **`Teléfono de noche`** en `cobertura.yml`. Lo que comparten (la letra, comprobada con `fc-match` antes de seguir; Chromium con su caché `playwright-1.56.1`; el mundo con su caché `telefono-mundo-v1-`; y servirlo) va en una acción compuesta, `.github/actions/telefono`.

### Lo que se aparta del diseño, y por qué

1. **`fonts.conf` no es un alias sobre la configuración del sistema: es una lista blanca de seis ficheros.** §7.6 pedía resolver `system-ui` y `sans-serif` a DejaVu Sans. Pero la pila de la web de hoy no empieza por `system-ui` (eso llega con §3.4, en el 7): es `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif…`, y fontconfig da a `Arial` la Liberation Sans, la de sus mismas medidas, si la imagen la trae. Medido con Chromium 141 y `CSS.getPlatformFontsForNode` en el contenedor de diseño, con la pila de hoy: sin el fichero, Inter; con solo el alias, Liberation Sans; con el fichero que entra, DejaVu Sans, también con la pila de §3.4 y con `Inter` pedida por su nombre (y DejaVu Sans Mono con la de `font-mono`). La primera versión, una configuración propia que solo miraba la carpeta `/usr/share/fonts/truetype/dejavu`, se paró en el primer CI: en el Ubuntu del ejecutor, `system-ui` salía DejaVu Math TeX Gyre. Por eso la que entra incluye la del sistema y rechaza todo fichero de letra salvo los seis de `fonts-dejavu-core` por su nombre, estén donde estén. Va por nombre de fichero y no por familia porque fontconfig descarta primero por fichero: con `*.ttf` rechazado, una familia aceptada ya no llega. La acción comprueba con `fc-match system-ui` que la letra es DejaVu Sans antes de seguir y lista los ficheros de DejaVu del ejecutor; la comprobación de verdad, la de la letra que pinta Chromium, la hace por CDP la prueba del 2b (Ruso-021), porque las herramientas de fontconfig no aplican la lista a las fuentes ya cacheadas y Chromium sí.
2. **`Teléfono de noche` es informativo** (`continue-on-error`, como la auditoría de dependencias). §7.5 decía que «un umbral roto pone en rojo la noche y no para ningún PR». Pero un rojo de noche cuelga del commit de `main` de esa noche, y Railway salta el redespliegue de un commit en rojo, el de cambiar una variable (la cabecera de `cobertura.yml`, por las noches del 4 al 8 de octubre). Con `continue-on-error` el trabajo se pone en rojo y deja sus cifras, y el flujo no.
3. **Los umbrales que la web de hoy no cumple van como `test.fixme`**, con la cifra de hoy en el nombre (§17.1, regla 1): la primera pintura en frío de las cuatro páginas (de 3,09 a 3,18 s con DejaVu Sans; de 3,13 a 3,28 con Inter, mapa 05 §12; la baja el PR 6) y la lista en frío de la portada del jugador (de 4,80 a 5,60 s en tres pasadas; 5,70 con Inter) y del plan (de 5,04 a 5,08; 5,22 con Inter). Sus cifras se miden y se adjuntan igual cada noche; el PR que las baje quita el `fixme`.
4. **La letra al doble y de lado** (las pasadas 3 y 4 de §16.5) quedan como `test.fixme` hasta el 2b, que trae las 46 pantallas y las comprobaciones 1 y 2 que usan.
5. **`cuentas.json` lleva `firstTimeTrialStage: { race, stage }`**, la forma de `MundoDePrueba` de §7.3, además del resumen. La crono se busca en la base: las etapas corridas (`stage_snapshots`) cuyo recorrido congelado dice crono (`race_routes.time_trial`), y de ellas la que se corrió antes, con el día del calendario de su temporada. Las dos tablas guardan la clave de la temporada (`race-x:s0`) y el número de etapa en `stage_day`, no el día.
6. **El trabajo `Teléfono` del 2a no lanza Playwright**: construye o restaura el mundo, lo sirve y comprueba que contesta, como dice §17.4. El 2b le añade `playwright test --project=telefono`.

### Las cifras (para la descripción del PR)

**El mundo, en el contenedor de diseño** (cuatro núcleos): 635 s de principio a fin, 619 de ellos de calendario (490 hasta el día 40 y 123 hasta el 50, unos 12 s por día) y 16 de volcado. `mundo-50.tar.gz` pesa 161.162.801 bytes, los 161 MB de §7.2. Acaba con 219 equipos, 3.902 corredores, 107 etapas corridas con su línea, 360 noticias y el día 50; la primera crono corrida es la del campeonato de Australia (`nc-au-itt`, etapa 1, el día 8).

**El mundo, en el CI** (`ubuntu-latest`, Ubuntu 24.04, cuatro núcleos; la segunda ejecución del PR, la primera que llegó a construirlo): 393,8 s, 6,6 minutos y no los 15 estimados (304,6 hasta el día 40 y 74,4 hasta el 50); 156 MiB en disco y 160.303.347 bytes en la caché (`telefono-mundo-v1-` y la huella), que se sube en 1,5 s; y el mundo, servido y contestando, 8 s después. Chromium, la primera vez, se instala en 19,8 s con sus bibliotecas, y su caché (`playwright-1.56.1`) pesa 280.132.964 bytes, y no los 150 MB estimados, porque Playwright 1.56 baja Chromium y su `headless shell` (174 y 104 MiB). El trabajo entero, con las dos cosas por construir, 7 min 39 s. Lo que tarda en restaurarse el mundo de la caché, en la descripción del PR. Ese mundo acabó con 361 noticias: cuatro construcciones del mismo código han dado 354, 360, 361 y 361.

**La noche, en local** (`playwright test --project=nocturno` contra `serve.mjs`, 360 × 800 con relación 2, CPU ×4, DejaVu Sans; la mediana de cinco cargas; unos 170 s la pasada entera). De la menor a la mayor de tres pasadas:

| Página                   | Primera pintura en frío, Slow 4G | Lista en frío, Slow 4G | Lista en caliente |
| ------------------------ | -------------------------------- | ---------------------- | ----------------- |
| la portada del jugador   | de 3,09 a 3,14 s                 | de 4,80 a 5,60 s       | de 1,14 a 1,59 s  |
| la portada del visitante | de 3,11 a 3,13 s                 | de 4,80 a 4,82 s       | de 1,12 a 1,13 s  |
| el plan                  | de 3,09 a 3,12 s                 | de 5,04 a 5,08 s       | 2,44 s            |
| `Watch`                  | de 3,13 a 3,18 s                 | de 4,69 a 4,73 s       | de 1,36 a 1,38 s  |

`Watch` (la etapa 3 de Race Valencia): la primera pintura con Fast 4G, de 1,11 a 1,17 s; a ×1 y a ×4, 60 fotogramas por segundo y ninguna tarea larga, con la carrera avanzando mientras se mide (6,9 km en los diez segundos a ×1 y 29 a ×4; la prueba lo comprueba, porque una página quieta también da 60). La lista en frío de la portada del jugador baila 0,8 s de una pasada a otra, a caballo del umbral: por eso va como `fixme` con su horquilla, y la del visitante y la de `Watch`, que lo cumplen por un 4 % y un 6 %, pueden salir en rojo en el ejecutor del CI; lo dirá la primera noche.

**Un umbral roto no deja sin mirar a los demás.** Cada umbral es su test, sin encadenar: medido con un test que fallaba a propósito antes de los umbrales, los catorce de verdad corrieron igual y la pasada tardó lo mismo (170 s), porque el trabajador que Playwright pone tras un fallo lee las cifras guardadas en `.resultados/nocturno.json` en vez de medir otra vez.

### Lo que ve el dueño

Nada en el juego. En el CI, un trabajo nuevo, `Teléfono`, que de momento solo levanta el mundo de la prueba, y cada noche `Teléfono de noche`, con sus cifras en el informe de la ejecución (el artefacto `telefono-noche`).

### El riesgo del despliegue

Ninguno: no cambia nada de lo que se despliega. Lo nuevo es del CI y de `devDependencies`.

### Notas para el paso siguiente

1. **El 2b** pone `telefono.spec.ts`, `control.html`, `pantallas.ts` y la línea base, y el paso del trabajo `Teléfono` que lanza `playwright test --project=telefono` tras la acción `.github/actions/telefono`. La caché del mundo de `main` la deja el primer push que lo construye, el de la fusión del 2a; el 2b cambia la clave (trae `packages/shared/src/kit.ts`), así que reconstruye el suyo.
2. **La pantalla 38 es la crono del campeonato de Australia** (`nc-au-itt`, etapa 1, 39 km, el día 8): la primera corrida en el mundo de 50 días. Su página funciona con `Play`, `More`, `+10 min` y `Pause`. Pero el salto de diez minutos (7-j) cae antes del primer parcial (km 13): `TimeTrialBoard` pinta solo `HOT SEAT · nobody home yet`, sin el botón del parcial ni filas, que son lo que la pantalla tenía que mirar (Ruso-018). Y es un salto relativo: tras `Play`, `+10 min` y `Pause` el reloj quedó en 0:12:28 en una carga y en 0:11:02 en otra, porque corre entre clic y clic. `Last starter`, que es absoluto, deja los dos botones (de 20 y 16 px) y tres filas. Lo decide el 2b, con sus medidas.
3. **El mundo no sale idéntico en cada construcción**: dos del mismo código dieron 354 y 360 noticias (el resto de las cuentas igual: 219 equipos, 3.902 corredores, 107 etapas). Dentro de una ejecución del CI no importa, porque todo se mide sobre el mismo mundo; pero una caché que caduca reconstruye el mundo con la misma clave, y el 2b tiene que comprobar que la línea base aguanta dos construcciones, o saber de dónde sale la diferencia.
4. **La clave del mundo cambia con cualquier fuente de `packages/db/src`, del motor o de `shared`** (sin sus tests): un PR que las toca paga la reconstrucción, y desde el 2b reescribe la línea base de las pantallas con datos con las reglas de §7.4.

## PR 2b · Las 46 pantallas, las diez comprobaciones y la línea base

### Lo que entró

- **`apps/web/e2e/telefono.spec.ts`**, la prueba del teléfono: las diez comprobaciones de §7.1 en las 46 pantallas, a 360 × 800 y a 320 × 640 (92 medidas, unos 6 minutos). Antes de medir, el instrumento se prueba a sí mismo (17-b): la letra con que Chromium pinta el `h1` de `control.html`, leída por CDP, tiene que ser DejaVu Sans (Ruso-021), `control.html` tiene que dar exactas sus faltas (`[1, 2, 1, 1, 2, 1, 1, 1, 1, 1]`: una de cada, y dos recortes y dos objetivos) y las reglas del trinquete se prueban con cifras de mentira. Cada medida adjunta al informe sus cifras y una muestra de cada falta (la etiqueta, su `data-ui` y su texto), para encontrarla sin volver a medir.
- **`apps/web/e2e/medidas.ts`**: las comprobaciones 1, 2, 3, 4, 5, 7, 9 y 10 dentro de la página; la 6 es axe-core 4.10.3, inyectado como en el mapa 05 (7-e), y la 8, la acción tras la edición.
- **`apps/web/e2e/pantallas.ts`**: las 46 de §7.3, con su ruta, su cuenta, el `data-ui` de su respuesta, si es herramienta y su edición. **`navega.ts`** abre una como la ve su cuenta (las sesiones, una IP por contexto, la intercepción de los estados 40 a 42, la espera a que cargue, `scrollY` a 0 antes de nada y lo que la prepara), y lo comparten la prueba y la noche. **`trinquete.ts`**, las reglas del trinquete, puras.
- **`apps/web/e2e/control.html`** y **`telefono.config.ts`** (`PHONE_REF`, `PHONE_MIN`, `ANSWER_MAX_TOP_PX` = 520, `THUMB_ZONE` = 0,4, `TOOL_PAGE_MAX_PX` = 3.200 y `PHONE_FONT`).
- **`apps/web/src/components/ui/constants.ts`** (`MIN_FONT_PX` 12, `MIN_FIELD_FONT_PX` 16, `MIN_TARGET_PX` 44 y `MIN_INLINE_TARGET_PX` 24) y **`packages/shared/src/kit.ts`** con solo `KIT_MIN_PX` (28), `KIT_PX` y `KitSize` (15-a), en el barril y con `kit.test.ts`: la prueba los importa y no los copia (D-02).
- **`data-kit`** en los tres `<svg>` de `Jersey.tsx`, con el papel del maillot (`team`, `leader-gc`, `leader-points`, `leader-kom` y `champion`), sin cambiar su aspecto (7-g).
- **`apps/web/e2e/telefono-baseline.json`**, las faltas de hoy por pantalla y ancho (abajo, «Las cifras»).
- **`serve.mjs --web`**: otra web compilada sobre el mismo mundo y con la misma API, la de la base del PR.
- **El trabajo `Teléfono`** mide la base y el PR sobre el mismo mundo y sube lo medido como artefacto (`telefono`: `base.json`, `pr.json` y los informes); en `main`, informa.
- **`nocturno.spec.ts`** gana las pasadas 3 y 4 de §16.5, sobre las 46 con las comprobaciones 1 y 2: la letra raíz al 200 % a 360 × 800 y el teléfono de lado, a 800 × 360.

### Lo que se aparta del diseño, y por qué

1. **El trinquete compara con la base medida en la misma ejecución, en todos los PR, y el fichero apunta hacia dónde va cada cifra, no la cifra.** §7.4 comparaba con las cifras del fichero y solo medía la base cuando cambiaba la clave del mundo (7-h). Pero el mundo no sale igual en dos construcciones del mismo código: medidos los dos mundos de 50 días que se construyeron en el contenedor, 14 de los 92 pares de pantalla y ancho dan cifras distintas (la ficha del corredor que más puntos tiene, el resultado de la etapa, el ranking, las noticias…), y medido el mismo mundo dos veces, 0. El CI reconstruye el mundo cuando cambia su clave, cuando caduca su caché y en cada push a `main`, que no ve la caché de los PR: con el diseño de §7.4, el primer push tras cada fusión habría dejado `main` en rojo, y Railway no redespliega un commit en rojo. Así que el trabajo compila la web de la base del PR en un `worktree`, la sirve sobre el mismo mundo (`serve.mjs --web`) y la mide; el PR falla si una cifra sube sobre ella, si baja y el fichero no la baja, o si el fichero cambia y la medida no (`trinquete.ts`). Lo que el diseño pedía (que ninguna cifra suba, que lo que baja se apunte, que E3 esté terminado con el fichero a cero) se mantiene; el fichero deja de ser comparable cifra a cifra con un mundo concreto. Un PR que toca el instrumento (las comprobaciones o las pantallas) puede reescribirlo entero, como decía §7.4 para el cambio de mundo. El precio: dos medidas por PR, unos 12 minutos de los 15 del trabajo, en paralelo con `Test` (unos 16).
2. **En `main`, `Teléfono` informa y no para** (`continue-on-error` en el push). El PR ya pasó el trinquete contra su base, y una falta que solo saliera con los datos de otro mundo no puede dejar el commit en rojo.
3. **La comprobación 1 mide contra `clientWidth`, no contra `innerWidth`** (§7.1). Con `isMobile`, Chromium ensancha `innerWidth` hasta el contenido: con el bloque de 400 px de `control.html`, `innerWidth` da 401 a 360 de ancho, y la comprobación no fallaría nunca. Lo cazó `control.html` en su primera pasada, que es para lo que está (17-b). `clientWidth` se queda en 360, como `visualViewport.width`. Con ella, ninguna de las 46 refluye hoy, a 360 ni a 320 (el mapa 05 lo midió con `innerWidth` y dio lo mismo a 360).
4. **De lo que desborda sin recortarse, la comprobación 2 cuenta el elemento cuyo contenido se sale de su caja**, un hijo o un texto suyo fuera de su caja de relleno, y no a sus antepasados, que heredan el desborde; `html` y `body` no cuentan, porque su desborde es la comprobación 1. Sin eso, un solo `span` que se sale contaría tantas veces como cajas lo envuelven.
5. **La comprobación 4 cuenta los campos de texto**: casillas, botones de radio, deslizadores, selectores de color y de fichero y los botones de formulario no se escriben y no hacen que iOS amplíe la página. **El texto para lectores de pantalla** (`sr-only`, una caja de 1 × 1) no cuenta como visible en ninguna comprobación.
6. **La pantalla 38 salta a `Last starter` y no a `+10 min`** (7-j). En la primera crono del mundo, la de Australia (39 km), los diez minutos caen antes del primer parcial, en el km 13: `TimeTrialBoard` pinta solo `HOT SEAT · nobody home yet`, sin el botón del parcial ni filas, que son lo que la pantalla tenía que mirar (Ruso-018). Y `+10 min` es relativo a la hora, que corre entre el clic de `Play` y el del salto: el reloj quedó en 0:11:02 en una carga y en 0:12:28 en otra. `Last starter` es fijo y deja los dos botones (de 20 y 16 px de alto) y tres filas. Medidas dos veces, la 09 y la 38 dan las mismas cifras.
7. **Solo la 25 tiene edición en el 2b** (otro papel en la primera etapa de las órdenes, sin guardar), porque la regla 3 de §7.4 da las de la 01 y la 29 al PR 14 y la de la 16 al 18b; hasta entonces, su comprobación 8 es `null`.

### Las cifras (para la descripción del PR)

**Las faltas de hoy**, sumadas en las 46 pantallas (el mundo de 50 días del contenedor de diseño, con DejaVu Sans; pantalla a pantalla, en `telefono-baseline.json` y en la descripción del PR):

| Comprobación      | A 360 × 800                                        | A 320 × 640  |
| ----------------- | -------------------------------------------------- | ------------ |
| 1 · el reflujo    | 0                                                  | 0            |
| 2 · los recortes  | 313, en 15 pantallas                               | 405, en 29   |
| 3 · la letra      | 834 textos, en las 46                              | 834, en 46   |
| 4 · los campos    | 36, en 8                                           | 36, en 8     |
| 5 · los objetivos | 2.011, en las 46                                   | 2.009, en 46 |
| 6 · axe-core      | 2.898 nodos, en las 46                             | 2.928, en 46 |
| 7 · la respuesta  | falla en las 46                                    | no corre     |
| 8 · la acción     | falla en la única que corre, la 25                 | igual        |
| 9 · el alto       | falla en 2 de las 15 de herramienta, la 03 y la 15 | igual        |
| 10 · el maillot   | 273, en 8                                          | 273, en 8    |

Las que más pesan: la inscripción a carreras (03: 390 textos por debajo de 12 px, 396 objetivos cortos y 773 nodos de axe), `/world/races` (20: 247 recortes y 314 nodos), `/world/teams` (21: 219 maillots por debajo de 28 px) y el calendario del equipo (15: 208 textos y 284 nodos).

**El instrumento**: la pasada entera, 93 tests (el control, las reglas y las 92 medidas), tarda de 6,2 a 6,3 minutos en el contenedor. El mismo mundo medido dos veces da las mismas cifras en los 92 pares; dos mundos del mismo código, distintas en 14 (de ahí la desviación 1).

**La noche, con las pasadas nuevas** (8,7 minutos en total): con la letra al doble, 26 pantallas refluyen y hay 724 recortes; de lado, ninguna refluye. El rendimiento, en las horquillas del 2a (la lista en frío del plan, ya de 5,04 a 5,19 s en cuatro pasadas).

### Lo que ve el dueño

Nada en el juego: `data-kit` no cambia ningún maillot. En el CI, el trabajo `Teléfono` con la prueba entera; en la descripción del PR, la tabla de las faltas de hoy.

### El riesgo del despliegue

Ninguno: lo único que cambia en lo que se despliega es un atributo de los tres `<svg>` de `Jersey.tsx`, y `KIT_MIN_PX`, `KIT_PX` y `KitSize` en `@cyclingstar/shared`, que nadie usa todavía fuera de la prueba.

### Notas para el paso siguiente

1. **Cómo se apunta lo que baja.** Un PR que baja una cifra la baja también en `telefono-baseline.json`, a cualquier número menor que el de la base; lo natural es copiar la de `pr.json`, el artefacto `telefono` de su ejecución, que es lo que mide el CI. Un PR que no la baja no la toca. El 4 es el primero que el trinquete compara de verdad contra su base.
2. **En local**, con el mundo y el servidor de 2a: `FONTCONFIG_FILE=$PWD/apps/web/e2e/fonts.conf E2E_BASE=http://localhost:3005 pnpm --filter @cyclingstar/web exec playwright test --project=telefono` compara con el fichero (el modo `compara`, que solo vale en el mundo en que se escribió); `TELEFONO_LINEA_BASE=escribe TELEFONO_SALIDA=<fichero>` mide y escribe.
3. **La 01 no falla hoy la comprobación 9** en su estado inicial (3.200 px o menos): los 6.807 px de §7.1 eran con los 28 días desplegados, como la capturó el mapa 05. Las que fallan son la 03 y la 15.
4. **Las pasadas de la noche, hoy** (con este mundo): la letra al doble refluye en 26 de las 46, todas las del visitante y ninguna con sesión, lo que apunta a su cabecera (sin comprobar), y recorta 724 elementos en las 46; de lado, ninguna refluye. Las dos primeras van como `fixme` con su cifra.

## PR 4 · La web sin red

### Lo que entró

- **`apps/web/src/net.ts`**: `SessionState` (`signed-in`, `signed-out` y `unknown`) y `sessionStateOf`, con la regla de §12.1; `REQUEST_TIMEOUT_MS` (15.000); la marca `cs:signed-in` (`writeSignedInMark` y `readSignedInMark`, que no lanzan nunca, tampoco sin `localStorage` o con él bloqueado); y `useOnline`, la red del `onlineManager` de React Query. Sin el cliente de better-auth, a propósito: `api/request.ts` importa de aquí.
- **`apps/web/src/auth/useSessionState.ts`**: la sesión en tres estados con la marca al día (`state`, `isPending` y `signedIn`), para `ProtectedRoute`, `Header` y `BottomNav`.
- **`ProtectedRoute`** no lleva a `/login` con `unknown` y pinta la página; **`Header`** y **`BottomNav`** pintan la navegación del jugador con `unknown` y la marca.
- **`api/request.ts`**: `AbortSignal.timeout(REQUEST_TIMEOUT_MS)` en toda petición. El corte es un `ApiError` de status 0 con el código `timeout`, también si llega mientras se lee el cuerpo; y la red que se cae a mitad del cuerpo es un `ApiError` de status 0 `network`, cuando antes era un `TypeError` crudo. Sin `AbortSignal.timeout` (antes de Safari 16, que la web ya no pide), la petición sale sin corte.
- **`ui/OfflineBanner.tsx`**, **`ui/OfflineState.tsx`** y **`ui/ErrorState.tsx`**, con sus textos, sus `data-*` y su ARIA, y con las clases de hoy hasta el 9a (17-c). La franja va bajo la cabecera, en `App.tsx`.
- **La barrera por ruta** (`components/RouteBoundary.tsx`) y **las páginas con su fallo tipado** (`lazyPage.tsx`: `ChunkLoadError`, que lleva si el `import()` falló sin red): las 32 páginas de `App.tsx` pasan de `lazy` a `lazyPage`, bajo `<RouteBoundary resetKey={pathname}>`. Lo que falló sin red, `This page needs a connection the first time.` · `Try again`, que recarga con red y sin ella espera ocupado a que vuelva; lo que falló con red, `This version is out of date` · `Reload`. Cualquier otro error sube a la barrera raíz (`main.tsx`), que queda para los fallos de pintado.
- **`components/PausedOffline.tsx`**, lo pausado sin datos (desviación 4).
- **`HorizonWatcher`** con `sessionSeenOf` (`queryClient.ts`; desviación 1).
- **`apps/web/e2e/sinred.spec.ts`**, el proyecto `sinred` de `playwright.config.ts` y el paso `Sin red` del trabajo `Teléfono`.
- **El artefacto `telefono` sube por fin `.resultados`** (`include-hidden-files`): `upload-artifact` deja fuera las carpetas que empiezan por punto, y en el 2b solo subía `pr.json`.

### Lo que se aparta del diseño, y por qué

1. **`HorizonWatcher` sí se toca, en una línea.** §12.1 decía que no hacía falta, porque una carga en frío sin respuesta de la sesión no es una sesión resuelta. Pero better-auth 1.6.25, ante un fallo de red, deja de estar pendiente (`isPending` falso, `data` como estaba y `error` lleno; `client/session-atom.mjs` l. 110-122), y el vigilante lo apuntaba como «nadie»; al volver la red, better-auth pide la sesión otra vez (`client/session-refresh.mjs` l. 64-68), llega el id y `cacheOwnerChanged` daba cierto: `clear()` tiraba lo que la página ya había pedido, que es justo lo que X-04 quería evitar. `sessionSeenOf` cuenta `unknown` como pendiente. `queryClient.test.ts` lo prueba con las respuestas de better-auth en orden, y con la regla de antes, que vaciaba la caché una vez.
2. **Mientras better-auth vuelve a pedir la sesión sin datos, vale la última respuesta que se supo** (`useSessionState`). Al empezar cada petición de la sesión, better-auth pone `isPending` a cierto si no tiene datos y `error` a nulo (`client/session-atom.mjs` l. 49-60), y la pide al volver la red y al volver a la pestaña (`client/session-refresh.mjs` l. 58-68). Leída tal cual, la sesión sin saber pasaría a `signed-out` un momento en cada una: la cabecera parpadearía a `Log in`, que es lo que §12.1 quiere quitar, y `ProtectedRoute` desmontaría la página para pintar `Loading…`. Hoy no se ve porque `unknown` lleva antes a `/login`; el diseño no lo contaba. `isPending` queda para la primera carga.
3. **La marca cuenta con la sesión sin saber y ya respondida, y lo que pide datos de la cuenta mira `signed-in`, no la marca.** En la primera carga, antes de ninguna respuesta, la cabecera es la del visitante, como hoy. Y el resumen del corredor, que piden la cabecera y la barra para saber si hay equipo, solo se pide con la sesión confirmada: con una marca vieja (la sesión caducó) daría un 401, y el 401 lleva a `/login` (`SessionExpiryWatcher`) a quien solo miraba una página pública. Es lo que §12.1 llama «sin nada de la cuenta».
4. **`PausedOffline`, provisional hasta el PR 10.** §12.1 pinta `OfflineState` en lo pausado a través de `QueryView` (§4.2), que nace en el 10. Hasta entonces la página se quedaba en `Loading…` sin fin (captura 51): `PausedOffline` pinta `OfflineState` encima del contenido mientras haya alguna consulta montada en pausa y sin datos, y se va en el 10.
5. **La hora de la franja es la de la consulta montada más reciente, sin las de la cabecera**, y no la de «la consulta principal de la página» (I-29): ninguna dice cuál es la principal hasta `QueryView`. Las de la cabecera (`health`, `horizon`, `admin-whoami` y el resumen del corredor) se refrescan solas y harían parecer más reciente lo que se ve. La hora se sigue mientras no hay red: navegar sin red a otra página vista da la de esa página.
6. **El corte por tiempo tiene su código**, `timeout`, con status 0 como la red: `errorKindOf` (PR 10) lo leerá como `network` igual, y el mensaje dice lo que pasó (`The server took too long to answer.`).
7. **Reintentar un trozo es recargar la página, y el tipo se decide al fallar.** §12.1 da `Try again` a un trozo que no cargó sin red, como si volver a pedirlo bastara. No basta en todos los navegadores: la norma HTML guardaba el fallo de cada módulo en su mapa de módulos hasta recargar la página, y dejó de hacerlo el 15 de julio de 2026 (whatwg/html#10327); medido en Chromium 141, el de la prueba, tras el fallo el `import()` del mismo trozo ni sale a la red, aunque la red haya vuelto. Chromium tiene el cambio detrás de una bandera (su bug 534781954), y Firefox y WebKit lo siguen en los suyos (2055211 y 319492); en qué versión llega a cada uno no está comprobado. `React.lazy`, además, recuerda la carga fallida. Así que `Try again` recarga con red, y sin ella espera ocupado (`Trying again…`) y recarga en cuanto vuelve, porque recargar sin red da la página de error del navegador (D-00p). Y el tipo sale de `navigator.onLine` en el momento del fallo (`ChunkLoadError.offline`), no al pintar: volver con red a una página cuyo trozo falló sin red sigue diciendo `network`, y no `outdated`, que no sería verdad. Recargar vale en todos. Una primera versión rehacía el `lazy` y volvía a llamar al `import()`, y su prueba pasaba por accidente: miraba que no hubiera `ErrorState` mientras la página estaba en `Loading…`. Ahora cada caso comprueba que la página de noticias se pinta de verdad (sus filtros).
8. **`sinred.spec.ts` mira también el caso `outdated`** (con red, un trozo que da 404, como tras un despliegue, pide recargar, y `Reload` carga la página) **y un control**: un `get-session` que dice que no hay sesión sí lleva a `/login` y quita la marca. El de la mutación en pausa es `fixme` hasta la `ActionBar` del 9a. Los tests de la barrera por ruta viven en `ErrorState.test.tsx`, como pide §17, con la clase sin montar: los tests de la web son de render estático, sin DOM.
9. **`Sin red` corre aunque la prueba del teléfono falle**, con su carpeta de salida y sin el informe JSON, porque Playwright vacía la de salida al empezar y el informe es el de la prueba.

### Las cifras (para la descripción del PR)

- **`sinred.spec.ts`**: ocho casos y un `fixme`, unos 43 s en el contenedor, con un minuto como mucho por caso. Con la web de `main` fallan los siete casos sin red y pasa el control (en minuto y medio); con la del PR pasan los ocho, en dos pasadas seguidas.
- **La prueba del teléfono**, el PR contra la base sobre el mismo mundo y en modo trinquete: las 92 medidas, idénticas (94 tests en 6,3 minutos en el contenedor). El PR no mueve ninguna cifra, y `telefono-baseline.json` no cambia.
- **Los tests**: 50 nuevos, y la web queda en 973. `net.test.ts` (9, seis contra el cliente de better-auth 1.6.25 con un `fetch` de mentira, para que una versión que cambie lo que deja en `data` y `error` lo diga aquí), `queryClient.test.ts` (4 más), `OfflineBanner.test.tsx` (11), `OfflineState.test.tsx` (3), `ErrorState.test.tsx` (16, siete de la barrera y de la carga de una página), `PausedOffline.test.tsx` (3) y `request.test.ts` (4 más).

### Lo que ve el dueño

En modo avión, una página ya vista dice `You're offline. Showing what you saw at 14:02.`, y al volver la red, `Back online`; un enlace a una página cuyo trozo no se había cargado avisa en su sitio, con la cabecera y la barra, en lugar de tirar la web; una página con su trozo y sin sus datos dice `You're offline. This loads when you reconnect.` y carga sola al volver; nadie con sesión ve `Log in`; y tras un despliegue, una pestaña vieja pide recargar en lugar de romperse. Recargar sin red sigue dando la página de error del navegador: sin service worker no tiene arreglo (D-00p).

### El riesgo del despliegue

- **El corte a los 15 s vale para toda petición.** Una que tardara más esperaba hasta que el navegador se cansara; ahora es un error. La única ruta lenta que se conoce, `/api/world/advance`, que avanza días del mundo, no la llama ninguna página (`advanceWorld` no tiene quien la use).
- **Un fallo de pintado se ve igual que hoy**: sube a la barrera raíz. Lo que cambia es el trozo que no carga, que ya no tira la web.
- Se revierte con un revert.

### Notas para el paso siguiente

1. **El 10 se lleva la regla de la barrera a `errorKindOf`** (17-v), con el tipo que ya lleva el error (`ChunkLoadError.offline`, decidido al fallar) y no `navigator.onLine` al pintar, y quita `PausedOffline` cuando `QueryView` pinte `offline` en el sitio de cada consulta; `ErrorState` ya tiene los cuatro tipos y sus textos. Reintentar un trozo sigue siendo recargar (desviación 7).
2. **El 9a pasa `OfflineBanner`, `OfflineState` y `ErrorState` a los tokens** (17-c) y pone los iconos del catálogo (`offline`, `check` y `error`); sus tests miran `data-*` y ARIA, no las clases.
3. **El 11, la cabecera nueva**, lee `useSessionState().signedIn` para la navegación y `state === 'signed-in'` para todo lo que pide de la cuenta (desviación 3).
4. **La mutación en pausa** (`sinred.spec.ts`, `fixme`) se enciende con la `ActionBar` del 9a.
5. **En local**, con el servidor de 2a: `E2E_BASE=http://localhost:3005 pnpm --filter @cyclingstar/web exec playwright test --project=sinred` (y `E2E_CUENTAS` si el mundo no está en `e2e/world/.mundo`).

## PR 6 · El peso

### Lo que entró

- **`apps/web/scripts/flag-sprite.mjs`**: pinta las 133 banderas del juego (`COUNTRIES`), de los SVG 4x3 de `flag-icons` 7.5.0, en `src/assets/flags.webp`, doce columnas por doce filas de celdas de 64 × 48, en WebP de calidad 0,8; escribe `src/components/ui/flagSprite.generated.ts` (`FLAG_SPRITE`, con la geometría, el anillo, la calidad y tres huellas, y `FLAG_CELLS`, la celda de cada país); y copia los 133 SVG a `src/assets/flags/`, que `ChampionJersey` pintará desde 72 px (§9.5; el 17a). Pinta con el Chromium de Playwright y es determinista: dos pasadas dan el mismo fichero, byte a byte. No corre en el CI.
- **`Flag.tsx` pinta del sprite**, escalado en `em`, en la caja `.flag` de `index.css`, que es la de `.fi` de `flag-icons` (en línea, 1,333333 em de ancho y un renglón de 1 em que da su `::before`), sin capa, como estaba. Sin país, la misma caja vacía, que no se lee (§4.6), y no el `🏳️` de antes.
- **`flag-icons` sale de `main.tsx`** y pasa a `devDependencies` a la versión exacta `7.5.0`: el generador y la huella siguen leyendo sus SVG (17-s).
- **`"sideEffects": false` en `packages/shared`** (H-03; desviación 5).
- **`apps/web/scripts/peso.test.mjs`**, los tres presupuestos de §12.2 con `node --test` sobre `dist/`, en un paso nuevo del trabajo `Build` (`El peso de la web`).
- **`src/generados.test.ts`**: que `flags.webp` es el que escribió el generador, que se hizo con los SVG y los países de hoy, que cada país tiene su celda y que la copia de los SVG es la de `flag-icons`, sin tocar. Si falla, se regenera.
- **Los umbrales de `nocturno.spec.ts`**: la primera pintura en frío de las cuatro páginas pasa de `fixme` a test, como anunciaba su nombre («la baja el PR 6»), y la lista en frío del plan también, porque baja de 5,0; la de la portada del jugador sigue `fixme`, con su cifra de hoy.

### Lo que se aparta del diseño, y por qué

1. **El sprite lleva un anillo de 2 píxeles que repite el borde de cada bandera, y pesa 52,7 KB, no 47.** Sin él, al escalar se colaba en el borde la bandera vecina, una raya de uno o dos píxeles de pantalla que se veía a simple vista a 16 px: el WebP con pérdida suaviza los bordes de sus bloques, que son los de las celdas, y Chromium ajusta a píxeles de pantalla la posición y el tamaño del fondo. Medido con un sprite de prueba de la misma geometría y cada celda de un color plano, el borde dejaba de llevar color ajeno al enseñar cada celda 1,5 píxeles por dentro, a todos los tamaños de hoy (de 11 a 34) y con relación de píxeles 2 y 3. Huecos entre celdas no: hasta uno de un píxel costaba 10 KB, porque descuadra las celdas de los macrobloques de 16 del WebP, y uno de 16 dejaba el sprite en 69. Así que cada bandera se pinta a 60 × 44 en el centro de su celda, los 2 píxeles de alrededor repiten su borde, y `Flag` enseña solo esos 60 × 44: la bandera entera, en 4:3 (las dos escalas se compensan), y lo que se cuele es su propio color. Cuesta 5 KB, y el tope es 60.
2. **El sprite lo pinta Chromium**, con `canvas.toDataURL('image/webp', 0.8)`, y no una herramienta de imágenes: el Chromium de Playwright ya está para la prueba del teléfono y no hay que añadir otra dependencia con binarios. Como no corre en el CI, `generados.test.ts` guarda las huellas.
3. **`Flag` conserva su API de hoy** (`size`, la altura en px, 20 por defecto) y los tamaños de cada página: los de §4.6 (12, 16 o 24, y 21 × 16 en una fila) llegan con `ui/Flag.tsx` en el 9b. Hasta entonces, las pocas banderas de 26 a 34 px se ven algo más blandas que el SVG, porque se amplían desde 44 píxeles de alto.
4. **La caja es la de `.fi`, sin capa**, para que nada se mueva: las 92 medidas de la prueba del teléfono salen idénticas a las de la base. Pero esa prueba no ve una bandera invisible: la primera versión ponía en el `::before` un espacio normal, que se colapsa, y las banderas medían 0 de alto, y las 92 medidas salieron igual de idénticas. Lo cazó una comparación a ojo con las de antes, y ahora lo vigila `Flag.test.tsx`: el `::before` de `.flag` es U+00A0, como el de `.fi`.
5. **`"sideEffects": false` en `shared` entra**, porque se cumplen sus dos condiciones (H-03): `request.js` suelta lo de `broadcast/*` (de 46,2 a 30,6 KB con gzip) y `pnpm test` sigue en verde. Y una tercera que el diseño no pedía: ningún módulo de `shared` hace nada al importarse (revisado), y las 46 pantallas de la prueba del teléfono corren con el paquete ya sacudido. vitest no sacude el árbol como Rollup, así que `pnpm test` en verde, solo, no lo probaba.
6. **Los KB son de 1.000 bytes**, los del informe de Vite, y el gzip, el de Node a nivel 9 (X-26).

### Las cifras (para la descripción del PR)

| Lo que pesa, con gzip          | `main`   | con el PR |
| ------------------------------ | -------- | --------- |
| la hoja que bloquea la pintura | 92,1 KB  | 8,7 KB    |
| el JS de arranque              | 157,4 KB | 144,1 KB  |
| el sprite (tal cual)           | no hay   | 52,7 KB   |

- **Las banderas**, a ojo, la de antes y la del sprite lado a lado, en catorce de las más difíciles (escudos, estrellas, franjas finas) a 12, 16, 20, 24 y 34 px y con relación de píxeles 2 y 3: las mismas, con bordes limpios; a 34 px, la del sprite algo más blanda.
- **La prueba del teléfono**, con la web del PR sobre el mismo mundo que la base: las 92 medidas, idénticas (94 tests en 6,3 minutos), y `telefono-baseline.json` no cambia.
- **La noche** (Slow 4G, CPU ×4, la mediana de cinco), en el contenedor, `main` una pasada y el PR dos, sobre el mismo mundo:

  | Página                   | Primera pintura en frío, `main` | con el PR     | Lista en frío, `main` | con el PR     |
  | ------------------------ | ------------------------------- | ------------- | --------------------- | ------------- |
  | la portada del jugador   | 3,20 s                          | 2,91 y 2,92 s | 5,65 s                | 4,59 y 5,35 s |
  | la portada del visitante | 3,18 s                          | 2,90 y 2,90 s | 4,86 s                | 4,60 y 4,57 s |
  | el plan                  | 3,16 s                          | 2,89 y 2,92 s | 5,17 s                | 4,85 y 4,89 s |
  | `Watch`                  | 3,18 s                          | 2,92 y 2,93 s | 4,75 s                | 4,58 y 4,60 s |

  Lo que preveía el diseño, de 3,20 a 2,93 s (telefono §8.3). La lista en caliente no cambia (la caché inmutable de `assets/` ya la servía), ni `Watch` con Fast 4G (de 1,09 a 1,16 s). El margen de la primera pintura es corto, unos 70 ms en la peor medida: en el CI de cada noche, que informa y no para nada, puede salir por encima algún día.

- **Los tests**: `generados.test.ts` (5), `Flag.test.tsx` (6) y `peso.test.mjs` (3, fuera de vitest); `lastRaceReport.test.tsx` reconoce la bandera por su nombre y no por la clase `fi-es`.

### Lo que ve el dueño

La web pinta antes: la hoja que bloquea la primera pintura baja de 92 a 9 KB, y el JS de arranque, 13 KB. Las banderas son las mismas; a 26 px o más se ven algo más blandas hasta el 9b.

### El riesgo del despliegue

- **Si el sprite no carga**, la caja de la bandera queda vacía, sin emoji. Va con huella en `assets/` y la caché de un año, como el resto.
- **`"sideEffects": false`**: un módulo de `shared` que hiciera algo al importarse, sin que nadie usara lo que exporta, desaparecería del paquete de la web. Hoy no hay ninguno.
- Se revierte con un revert.

### Notas para el paso siguiente

1. **Regenerar el sprite**, si cambian `flag-icons` o `COUNTRIES` (lo dice `generados.test.ts`): `pnpm build` y `node apps/web/scripts/flag-sprite.mjs`, con el Chromium de Playwright (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` en el contenedor).
2. **El 9b** pasa `Flag` a `ui/Flag.tsx` con los tamaños de §4.6 y el filete `line`; la celda útil, 60 × 44, cubre 24 px a relación 2 casi uno a uno.
3. **El 17a**: `ChampionJersey` carga el SVG de su país de `src/assets/flags/` con `import.meta.glob`.
4. **`shared` no puede tener módulos que hagan algo al importarse** (`"sideEffects": false`): lo que haga falta, que se exporte y se llame.

## PR 7 · Los tokens

### Lo que entró

- **`apps/web/src/index.css`, el de §3.9**: el `@theme` con los 40 colores de §3.1 (y los tres de lo que se pinta sobre el maillot, `kit-edge`, `kit-edge-strong` y `kit-ink`, §8.3), la letra, el paso de 4 px, `radius-ui`, las dos sombras, los dos cortes y los dos contenedores; el cierre, comentado, y los seis `brand-*` heredados, que borra el paso 22; las variantes `fine` y `dark`; el ámbito oscuro con lo que redefine; y `body` con `canvas` e `ink`. Sin el modo oscuro (`:root[data-theme='dark']`) ni lo que el ámbito declara para él (3-j): entran en el 23.
- **`packages/shared/src/colorMath.ts`**, fuera del barril y con su entrada `"./colorMath"` en `exports` (Rcodigo-007): `wcagContrast`, `simulateCvd` (Machado 2009, severidad 1, en RGB lineal), `deltaE00` (CIEDE2000 en CIELAB D65), el tipo `Vision`, y lo que los une (`parseColor`, `over`, la mezcla en sRGB y a 8 bits, `srgbToLinear`, `linearToLab`, `viewLab` y `distance`, con los grises). Las matrices de Machado y de sRGB a XYZ y el blanco D65 son las de colour-science 0.4.7, con toda su precisión.
- **`apps/web/scripts/tokens-json.mjs`** y el **`packages/shared/tokens.json`** que escribe (§12.3), con `light` y `darkScope` y su entrada `"./tokens.json"` en `exports`; `--check` sale con 1 si no está al día.
- **`apps/web/src/tokens.test.ts`**: cada pareja de las tablas de §3.1 a §3.3, en el claro y en el ámbito, con su umbral, y el ΔE00 de los tonos en las cuatro visiones y en grises, en la salida.
- **`generados.test.ts` pasa a `src/components/ui/`**, donde lo pone §16.2, y gana la huella de `tokens.json`; la de la copia de los SVG de las banderas sale de `flagSprite.generated.ts` y va a **`apps/web/scripts/huellas.json`**, la de lo que no tiene cabecera donde escribirla (16-e), que escribe `flag-sprite.mjs`.
- **`docs/diseno/e3-visual/medidas/dorados-colorMath.py`**, que escribe los valores dorados de `colorMath.test.ts` (`colorMath.golden.json`) con colour-science 0.4.7 y el método de `fundamentos.py`.

### Lo que se aparta del diseño, y por qué

1. **En el empate, la mezcla redondea al par.** Las cifras de §3 salen del `round` de Python, que en el empate va al par, y el negro al 30 % sobre blanco cae en 178,5 justos: con `Math.round`, 179 y una razón de 2,10, y con el par, 178 y la de 2,12 del diseño (la de `kit-edge` sobre `surface`). `colorMath.ts` redondea como el diseño midió. El navegador, por su parte, pasa el alfa a 8 bits antes de mezclar (77/255 para 0,3) y aquí da 178 también, pero en otros casos puede diferir en una unidad del método del diseño: el método es la referencia, porque es el de todas las cifras de §3.
2. **`tokens.test.ts` lee los valores de `tokens.json`**, no del CSS: así el CSS tiene un solo lector, `tokens-json.mjs`, y `generados.test.ts` garantiza que el JSON es el del `index.css` de hoy.
3. **En `tokens.json`, lo que es su espacio entero va como `DEFAULT`** (`--spacing` es `spacing.DEFAULT`), que §12.3 no decía, y **no van los `brand-*` heredados**: la app no los usará.
4. **Los umbrales de cada pareja**, que las tablas dan por su uso: 4,5 para los textos; 3 para los bordes, el foco, la barra de la fila propia, cada tramo contra `surface`, el `gold` sobre la cabecera y el icono `navy-dark` sobre `gold`; 3 para el deshabilitado, exento, también en el ámbito (quitar la exención es del modo oscuro, en el 23); y los suelos medidos de los filetes del maillot en el claro, 2,09 y 2,41.
5. **`generados.test.ts` y `huellas.json` donde los pone §16.2**: el PR 6 los dejó en `src/` y la huella de los SVG en el fichero generado.

### Las cifras (para la descripción del PR)

- **`colorMath.test.ts`**: 13 tests contra colour-science 0.4.7, a 0,01: 13 contrastes, 4 mezclas, 27 colores en las tres dicromacias, 9 Lab y 45 ΔE00 en cuatro visiones y en grises.
- **`tokens.test.ts`**: 70 parejas del claro y 24 del ámbito, todas por encima de su umbral; y la tabla del ΔE00 de los tonos de §3.2, que sale cifra a cifra (las treinta). Probado al revés: con un `ink-3` más claro o el acento cian en el ámbito, falla donde debe.
- **La prueba del teléfono**, con la web del PR sobre el mismo mundo que la base: las 92 medidas, idénticas (94 tests en 6,2 minutos). El fondo nuevo y el texto en `ink` no mueven ninguna cifra de axe.
- **El peso**: la hoja que bloquea, de 8,7 a 8,9 KB (los tokens); el JS de arranque no cambia.

### Lo que ve el dueño

Casi nada: el fondo de la página pasa de `#e8edf2` a `#eef2f6`, y el texto sin color propio, del negro a `ink`, `#10202f`. La letra empieza ahora por `system-ui`, que en cada sistema es la que ya salía.

### El riesgo del despliegue

Ninguno: lo de hoy sigue resolviendo, porque el cierre va comentado y los heredados siguen. Se revierte con un revert.

### Notas para el paso siguiente

1. **Quien toque el `@theme`** corre `node apps/web/scripts/tokens-json.mjs`; si no, falla `generados.test.ts`.
2. **El 23**, el modo oscuro: el bloque `:root[data-theme='dark']` y lo que el ámbito declara para él (3-j), con sus parejas en `tokens.test.ts`, que ya mira que el modo no declare nada que el ámbito no; `tokens.json` gana `dark` solo.
3. **El 16a** importa `simulateCvd`, `deltaE00` y `VISIONS` de `@cyclingstar/shared/colorMath` para `kitDistance`, y cada módulo que salga del barril gana su entrada en `exports` igual (`legacyJersey.ts`, §8.6).
4. **Los valores dorados se regeneran** con `docs/diseno/e3-visual/medidas/dorados-colorMath.py` en un entorno con colour-science 0.4.7 (el CI no tiene Python).

## PR 8 · Las reglas

### Lo que entró

- **`apps/web/src/components/ui/vocabulario.test.ts`** (§5.2): carga dos sistemas de diseño con `__unstable__loadDesignSystem`, el de `index.css` y el cerrado, saca las clases de los 156 fuentes de producción con el `Scanner` de `@tailwindcss/oxide` y cuenta por fichero `tema`, `arbitrarios`, `espaciado` y `layout`. Falla si una cifra sube, si un fichero que no está tiene alguna y si una baja sin apuntarlo; con `VOCABULARIO_DEUDA=escribe` reescribe `deuda.json`, como `TELEFONO_LINEA_BASE=escribe` la línea base del teléfono. Las dos sondas (`bg-surface` resuelve con los dos; `bg-indigo-600` con el abierto y no con el cerrado), una tercera para el escáner y la versión exacta de Tailwind lo paran si deja de medir. Sin `deuda.json` exige cero: el paso 22 solo tiene que borrarlo.
- **`apps/web/src/components/ui/deuda.json`**, con la deuda de hoy en 86 ficheros (abajo).
- **`apps/web/eslint-ui.mjs`** (con sus tipos, `eslint-ui.d.mts`): `UI_RULES`, las diez reglas de §5.3 en 16 selectores, cada mensaje con su número; `ARBITRARY_ALLOWED`, los seis de §5.1 con su motivo; y `UI_HEREDADOS`, los 89 ficheros que hoy tienen algún aviso. **`eslint.config.js`** las pone en dos bloques: `error` para `apps/web/src/**` salvo los tests y sus `__fixtures__`, `components/ui/**` y los `*.generated.ts`, y `warn` para los heredados (el bloque desaparece solo cuando la lista se vacíe).
- **`apps/web/src/components/ui/heredados.test.ts`** (5-c): cada heredado tiene algún aviso `ui/` en `warn`, y el que ya no tiene ninguno sale de la lista; un fichero nuevo nace en `error`, y `components/ui` y los tests no llevan las reglas; y cada regla contra una muestra que tiene que avisar y otra que no (el `→` de `StageRoute`, el `◀` y el `▶` de `Scale5`, los arbitrarios permitidos, el mensaje de un `ApiError`).
- **Tailwind a la versión exacta 4.3.3**: `tailwindcss` y `@tailwindcss/vite`, que iban con `^`, y `@tailwindcss/node` y `@tailwindcss/oxide`, nuevos en las dependencias de desarrollo de la web, que ya estaban en el almacén (el lockfile no gana ningún paquete).
- **`@source not` en `index.css`**: Tailwind deja de leer los tests, sus `__fixtures__`, `e2e/`, `scripts/`, `eslint-ui.mjs` y `deuda.json`.

### Lo que se aparta del diseño, y por qué

1. **`tema` es 2.760, y no los 2.740 de §5.1.** Los 2.740 se midieron sobre `58c14da`, y el instrumento de este test los da exactos allí (146 ficheros, 6.322 apariciones, 2.740 en 183 clases, y los cinco primeros de §5.1 cifra a cifra), con el `@theme` de hoy o con el de entonces como abierto. Los 20 que sobran son de los tres componentes que el PR 4 hizo con las clases de hoy (`ErrorState` 9, `OfflineBanner` 8 y `OfflineState` 3), que pasan a los tokens en el 9a (17-c). Hoy: 156 ficheros, 6.372 apariciones en uso, 2.760 de deuda, el 43,3 %, en las mismas 183 clases.
2. **El cerrado quita también los `brand-*`.** §5.2 dice «el mismo fichero con las 17 líneas activas», pero los 2.740 de 5-b, «la que el cierre del paso 22 va a exigir», se midieron con `tema-final-cerrado.css`, que no los tiene, y el paso 22 los borra. Con ellos, sus usos no contarían. Comprobado: el cerrado que construye el test y `tema-final-cerrado.css` dan los mismos 2.740 sobre `58c14da`.
3. **`ARBITRARY_ALLOWED` vive en `eslint-ui.mjs`**, y `vocabulario.test.ts` lo importa: la regla `ui/7` también lo lee (sin él, el `pb-[var(--fixed-bottom)]` de `main` en `App.tsx`, que entra en el 11, sería un error desde el paso 22). Una sola lista.
4. **`arbitrarios` cuenta toda clase con un valor arbitrario**: un valor (`text-[11px]`), una propiedad (`[scrollbar-width:none]`), una variante (`[&::-webkit-scrollbar]:hidden`) y el atajo de Tailwind 4 para una variable, `p-(--x)`, que es `p-[var(--x)]` y que hoy no se usa: sin él, escribir el atajo saltaría el contador. 46 hoy, los 47 que hay menos el `pb-[env(safe-area-inset-bottom)]` de `BottomNav`.
5. **`espaciado`**: `auto` no es un paso y lo arbitrario cuenta en `arbitrarios`; `px` es un paso que no está en la lista; los ejes lógicos de Tailwind 4.3.3 (`pbs`, `pbe`, `mbs`, `mbe`) cuentan como los demás. Es la definición de `sistema`: sobre `58c14da` da sus 38 de 1.342 (§3.3); hoy, 38 de 1.352.
6. **`layout`**: margen, ancho (con lo que lo da en una fila flexible: `basis`, `grow`, `shrink` y `flex-1`, `flex-auto`, `flex-initial` y `flex-none`), alto y el sitio en la rejilla (`col-*`, `row-*`, `self-*`, `justify-self-*`, `place-self-*` y `order-*`), con cualquier variante. Mira todos los textos fijos del valor de la prop, también en una condición o una plantilla. Hoy ningún componente tiene `layout`: 0.
7. **Las reglas**, contra la tabla de §5.3:
   - `ui/5` **no cuenta el mensaje de un `ApiError`** (`errorMessage` en `api/*.ts`, 46 literales): no es un estado de pantalla, lo pinta `ErrorState` con lo suyo. Con ellos la regla daría 116 avisos y el 10 no podría dejarla a cero; sin ellos da los 70 de §17.10.
   - `ui/6` mira también los lados del borde (`border-l-rose-500`), `ring-offset`, `accent`, `caret` y `shadow` con un color de la paleta: dos avisos más en los `.tsx`.
   - `ui/7` ve también las propiedades y las variantes arbitrarias y el atajo `-(--x)`, y respeta `ARBITRARY_ALLOWED`, con cualquier variante delante: cinco más en los `.tsx`.
   - `ui/8`, solo un literal que es entero un hexadecimal de 3, 6 u 8 cifras; `ui/10`, como 5-f, también en las plantillas (con su texto ya interpretado, así que un `\u25B2` escrito con escape cae igual).
   - No corren en los `__fixtures__`, que son datos de los tests, como en `vocabulario.test.ts`.
8. **`heredados.test.ts` prueba también cada regla** contra sus muestras y el cableado de los dos bloques: un instrumento que deja de medir no puede dejar la lista en verde (como las sondas de `vocabulario.test.ts`).
9. **Lo que se sirve sale solo de los fuentes de producción.** Tailwind 4 lee todo el proyecto para saber qué clases generar, y las muestras de los tests nuevos (`bg-indigo-600`, `text-[11px]`, `pbs-5`…) habrían ido a la hoja que se sirve: 518 bytes más, comprimida. Con `@source not` en `index.css` deja de leer los tests, los `__fixtures__`, `e2e/`, `scripts/` y las reglas, y la hoja pierde además cuatro clases que solo venían de ahí (`border-collapse`, `collapse`, `container` y `shadow`), que ningún fuente de producción usa (comprobado con el escáner). `tokens.json` se reescribe por su huella.

### Las cifras (para la descripción del PR)

- **`deuda.json`**: 86 ficheros; `tema` 2.760, `arbitrarios` 46, `espaciado` 38 y `layout` 0. Los cinco primeros, los de §5.1: `Race.tsx` 187, `MyRaces.tsx` 132, `TeamCalendar.tsx` 110, `AdminNames.tsx` 104 y `RacesIndex.tsx` 100.
- **Los avisos `ui/`**: 1.485 en 89 ficheros, 1.453 en 84 `.tsx` y 32 en cinco `.ts` (`visuals.ts` 20, `health.ts` 4, `riderResults.ts` 4, y `montage.ts` y `screen.ts` de la retransmisión, 2 cada uno). Por regla: `ui/1` 111, `ui/2` 15, `ui/3` 42, `ui/4` 23, `ui/5` 70, `ui/6` 1.068, `ui/7` 44, `ui/8` 48, `ui/9` 8 y `ui/10` 56. Frente a los 1.417 de `sistema` en 83 `.tsx`: iguales `ui/1` a `ui/5`, `ui/8` (28 en los `.tsx`) y `ui/9`; en los `.tsx`, dos más en `ui/6`, cinco en `ui/7` y 29 en `ui/10` (la ampliada, con sus plantillas); y los 32 de los `.ts`. `pnpm lint` sigue en 0 errores.
- **El tiempo**: `vocabulario.test.ts`, menos de 1 s; `heredados.test.ts`, unos 3 s; `pnpm lint`, 13 s en local.
- **El peso**: la hoja que bloquea, de 8,94 a 8,87 KB comprimida (las cuatro clases que solo venían de los tests); el JS no cambia.
- **La prueba del teléfono**, con la web del PR sobre el mismo mundo que la base: las 92 medidas, idénticas (94 tests en 6,2 minutos).

### Lo que ve el dueño

Nada. Quien programa ve 1.485 avisos `ui/` más en `pnpm lint`, y un fichero nuevo con un `<button>`, un color de la paleta o un emoji no pasa el lint.

### El riesgo del despliegue

Ninguno: la web que se sirve pierde cuatro clases que ninguna página usa, y nada más. Se revierte con un revert.

### Notas para el paso siguiente

1. **Bajar la deuda**: el PR que la baja corre `VOCABULARIO_DEUDA=escribe pnpm vitest run apps/web/src/components/ui/vocabulario.test.ts` y comprueba que el diff de `deuda.json` solo baja; un fichero sin deuda sale solo. Si un fichero limpia sus avisos `ui/`, `heredados.test.ts` pide sacarlo de `UI_HEREDADOS`.
2. **Los componentes de `components/ui/`** no llevan las reglas del lint, pero sí cuentan en `deuda.json`: el 9a saca de ella a `ErrorState`, `OfflineBanner` y `OfflineState` (17-c).
3. **El 10** deja `ui/5` a cero: los 44 `Loading…` y los 26 `Could not load…` de pantalla. Los mensajes de `api/*.ts` no cuentan.
4. **El 11** escribe `pb-[var(--fixed-bottom)]`, `bottom-[var(--action-bar-bottom)]`, `@max-[4.75rem]:` y la máscara de `Tabs`, que ya están en `ARBITRARY_ALLOWED`; un arbitrario nuevo entra en esa lista con su motivo y una decisión del diseño.
5. **Subir Tailwind** hace fallar `vocabulario.test.ts` hasta que se vuelve a medir: la API es inestable.
6. **El 22** activa las 17 líneas, borra los `brand-*`, `deuda.json` y la lista `UI_HEREDADOS`; el test y el lint no piden más cambios.

## PR 9a · El catálogo

### Lo que entró

- **`apps/web/src/components/ui/types.ts`**, con los tipos de §4 (`Tone`, `ColumnPriority`, `UiState`, `IconName` y `Layout`), y **`styles.ts`**, el foco y los seis tonos de §3.2, que comparten los componentes.
- **Los 26 iconos** (§3.7 y §3.8; decisión 3-e): sus fuentes en `apps/web/scripts/icons/`, dibujadas a mano y propias; **`apps/web/scripts/ui-icons.mjs`**, que las valida (la raíz de `Icon`, solo geometría en comandos absolutos y entre 0 y 24, `currentColor`, ningún texto, relleno solo en las dos estrellas), mide con Chromium que el trazo no se sale de los 24 u y que las cuatro siluetas de tono no se parecen, escribe **`ui/icons.tsx`** con la huella de las fuentes y pinta **la hoja de contactos**, `docs/diseno/e3-visual/hojas/iconos.png`; y su `--check` en `generados.test.ts`, que no necesita Chromium.
- **Los catorce componentes**, cada uno con su test, un caso por estado mirando `data-*` y ARIA: `Icon`, `Button`, `TextLink`, `Field`, `Segmented`, `InfoButton`, `Disclosure`, `ActionBar` (con `keyboard.ts`, `isKeyboardOpen` y `useKeyboardOpen`), `Panel`, `PageHeader`, `Tabs`, `Stat`, `Notice` y `Chip`.
- **Los tres del paso 4, con los tokens** (17-c): `ErrorState`, `OfflineState` y `OfflineBanner`, con sus iconos del catálogo y `Button`; sus tests, intactos, siguen en verde. Salen de `deuda.json`, que vuelve a los 2.740 de §5.1.
- **`/_ui`** (§5.4): `pages/ui/UiPage.tsx`, con una sección por componente (`data-ui-demo`), un ejemplo por estado y, al final, lo que vive en el ámbito oscuro; `pages/ui/fixtures.ts`, con los datos fijos que usan estos catorce; `noindex`; su propio trozo; y lo fijo en su marco de 360 × 160 con `transform-gpu` (5-g).
- **La prueba del teléfono, sobre `/_ui`** (§7.4): la primera de `pantallas.ts`, sin `data-answer` (la 7 y la 8 no corren, y la 9 tampoco, porque no es una herramienta), y su entrada en `telefono-baseline.json`, a cero.
- **En `index.css`**: `--action-bar-bottom: 0px` en `:root` y la utilidad `scrollbar-none` (abajo, desviaciones 2 y 3). `tokens.json`, reescrito por su huella.

### Lo que se aparta del diseño, y por qué

1. **`/_ui` va fuera del marco de la web**, sin la cabecera ni la barra inferior de hoy. §5.4 dice que la página no lleva `ActionBar` ni `BottomNav` propias; con las de hoy dentro, sus objetivos pequeños y sus contrastes contarían en la prueba, y `/_ui` no podría nacer a cero. `App.tsx` la pinta sola, con su barrera y su trozo.
2. **`scrollbar-none` es una utilidad del tema** (`@utility` en `index.css`). Esconder la barra de un carril pide `scrollbar-width: none` y `::-webkit-scrollbar`, que en Tailwind solo se escriben como arbitrarios (así lo hace hoy `components/Tabs.tsx`), y `ARBITRARY_ALLOWED` no los tiene. Una utilidad declarada resuelve con el tema abierto y con el cerrado.
3. **`--action-bar-bottom` vale 0 hasta el PR 11**, que lo escribe con lo que mide. Sin valor, `bottom: var(--action-bar-bottom)` no vale y la barra se quedaría en su sitio estático; y en `/_ui` no se puede escribir sin `style` (`ui/9`) ni sin un arbitrario (`ui/7`).
4. **`Tabs` centra la activa moviendo solo su carril** (`scrollLeft`), y no con `scrollIntoView({ inline: 'center', block: 'nearest' })`: con `block: 'nearest'`, unas pestañas que no están a la vista al cargar bajan la página hasta ellas. Lo vio la prueba del teléfono en `/_ui`, donde la página bajaba sola al cargar (la comprobación previa de `scrollY`). Ruso-005 lo midió con las pestañas arriba, donde no se mueve.
5. **`Tabs` es un componente con dos aspectos y dos conductas**: `nav` y `page`, y con `items`, enlaces con `aria-current="page"`, o con `options`, el `tablist` de `components/Tabs.tsx`. Lleva `min-w-0`: el carril se desplaza y no ensancha lo que lo lleva (en `/_ui`, una rejilla con unas pestañas dentro ensanchaba la página a 598 px).
6. **Un `TextLink` fuera de una frase mide 44 de alto**: es un control para la prueba (la comprobación 5), como la acción de un `Panel` («de 44», §4.4) o el `Go to Dashboard` de `ErrorState`. En una frase (`inline`) sigue en línea, con sus 24.
7. **El botón de la `ActionBar` es un `<button>` con el aspecto de `Button`** (`buttonClass` y `ButtonContent`, de `Button.tsx`) y no un `Button`: mide 48 y lleva `data-primary-action`, que la API pública de `Button` no tiene.
8. **`PageHeader` y `Stat`, cargando, pintan su barra de esqueleto ellos mismos**: `Skeleton` llega en el PR 10, que los pasará a él.
9. **Lo que el tipo no puede exigir, lo exige el componente, y su test lo mira**: `Chip` sin texto, `Notice` que se cierra en `warn` o `bad`, `Panel` sin título ni nombre y `Segmented` con menos de 2 opciones o más de 4 lanzan.
10. **Un `select` deshabilitado** lleva `aria-disabled`, como los demás campos, y no se abre: su ratón y sus teclas se paran.
11. **La hoja de contactos** pinta el claro y el ámbito oscuro; el modo oscuro, cuando `tokens.json` lo tenga (PR 23).
12. **Las siluetas de tono**: un píxel cuenta como pintado con más de media cobertura (alfa sobre 127) a 16 × 16 y densidad 1, y el solape de dos iconos es la parte del menos pintado que cae sobre el otro, |A∩B| / min(|A|, |B|), para que uno pequeño metido dentro de otro grande no pase por distinto (§3.7 no decía cuál).
13. **La mutación en pausa de `sinred.spec.ts`** sigue en `fixme`, ahora para el PR 14: la `ActionBar` nace aquí, pero `/_ui` no llama a la API y la primera página que guarda con ella es la del plan.

### Las cifras (para la descripción del PR)

- **La prueba del teléfono**: `/_ui`, a cero a 360 y a 320 (`[0, 0, 0, 0, 0, 0, null, null, null, 0]`); y las 92 medidas de las otras 46 pantallas, idénticas, con la web del PR sobre el mismo mundo que la base (96 tests en 6,2 minutos).
- **Los tests**: 140 en 20 ficheros de `components/ui/`: los catorce nuevos, los tres del 4, `vocabulario.test.ts`, `heredados.test.ts` y `generados.test.ts`.
- **Las siluetas de tono** a 16 px: `check`/`warning` 25 %, `check`/`error` 10 %, `check`/`info` 35 %, `warning`/`error` 22 %, `warning`/`info` 31 % y `error`/`info` 8 %, todas lejos del tope del 75 %.
- **`deuda.json`**: de 86 a 83 ficheros y de 2.760 a 2.740 en `tema`, con `ErrorState` (9), `OfflineBanner` (8) y `OfflineState` (3) fuera; los ficheros nuevos, sin deuda.
- **El peso**, con gzip: la hoja que bloquea, de 8,87 a 10,54 KB, con las clases de los componentes nuevos y de `/_ui`, que conviven con las de hoy hasta el 22; el JS de arranque, de 144,1 a 146,7 KB, porque `ErrorState`, en la barrera de cada ruta, y `OfflineBanner` llevan ya `Button`, `Icon` y los 26 iconos. Los dos, dentro de sus presupuestos (15 y 160 KB). `/_ui` va en su trozo, de 7,5 KB.

### Lo que ve el dueño

`/_ui` en su teléfono: cada componente en cada estado, y la hoja de los iconos en la descripción del PR. Ninguna página cambia, salvo el aspecto de lo que ya era del paso 4: la franja sin red, el estado sin red y el de fallo, ahora con los tokens y los iconos del catálogo.

### El riesgo del despliegue

Ninguno: `/_ui` no tiene enlace desde ningún sitio y no llama a la API; lo demás no cambia. Se revierte con un revert.

### Notas para el paso siguiente

1. **Cómo se añade un componente**: su `ui/<Nombre>.tsx`, su test por estado y su sección en `/_ui`; la prueba del teléfono sobre `/_ui` tiene que seguir a cero (§5.4).
2. **El 9b** añade a `/_ui` sus componentes con los datos fijos que §5.4 lista (el nombre de 28 caracteres, la clasificación de 140 filas con la propia en el 34), y `fixtures.ts` gana los suyos.
3. **El 10** pasa el esqueleto de `PageHeader` y de `Stat` a `Skeleton`.
4. **El 11** escribe `--action-bar-bottom` y `--fixed-bottom` con lo que mide, y monta la `ActionBar` y la `BottomNav` escondidas con el teclado (`useKeyboardOpen`).
5. **Los iconos se regeneran** con `node apps/web/scripts/ui-icons.mjs` (con el Chromium de Playwright); `generados.test.ts` falla si una fuente cambia sin regenerar o rompe una regla.
6. **Un enlace suelto es un control**: fuera de una frase, `TextLink` ya mide 44; dentro de una, con `inline`.

## PR 9b · La identidad, las tablas y las escalas

### Lo que entró

- **`packages/shared/src/legacyJersey.ts`** (§8.6; Rcodigo-055 y Rcodigo-068): `legacyJerseyStyle(seed)`, el `jerseyStyle` de la web movido sin cambiar una cifra (sus 14 colores, sus cinco patrones, su FNV-1a de 32 bits, su xorshift32 y su caché por semilla), fuera del barril y con su entrada en `exports`, `@cyclingstar/shared/legacyJersey` (§3.9). **`legacyJersey.golden.json`**, la tabla que se sacó del de la web (en `a71c673`) antes de moverlo, para las 219 semillas de la génesis; y **`legacyJersey.test.ts`**, que la compara semilla a semilla, mira que las semillas son las de `seedWorld` (18, 16 y 185) y la entrada de `exports`.
- **`apps/web/src/components/visuals.ts`** solo reexporta `legacyJerseyStyle` como `jerseyStyle`: `Jersey` y `GroupBar.test.tsx` no cambian. Sale de `UI_HEREDADOS`, porque sus 20 avisos (`ui/8`, los colores en hexadecimal) se fueron con él a `packages/shared`.
- **`ui/LegacyJersey.tsx`**: el dibujo de `Jersey` (`components/Jersey.tsx` l. 17-54) congelado, a `KitSize`, con `data-kit="team"` y el nombre del equipo en su `aria-label` (`Mistral Racing kit`, §9.10). Su test compara su marcado con el de `Jersey` para las 219 semillas, a 28 y a 40.
- **Los nueve componentes**, cada uno con su test, un caso por estado mirando `data-*` y ARIA: `Flag`, `StarRating`, `Meter`, `Scale5` (con `Undertrained` y los ejes `◀ Too much training` y `Too little training ▶`, D-00n), `RiderLabel`, `RiderHeader`, `RankTable`, `ActionRow` y `TripRow`.
- **`apps/web/src/domain/words.ts`** (§4.10): nace con las palabras de estos componentes, `ARRIVAL_WORD` (las cinco de la llegada) y `DNF_WORD`.
- **`TextLink` gana `glueEnd`**, y su ayudante `gluedLastWord` (abajo, desviación 5).
- **`/_ui`**: su sección para cada uno de los diez, con los datos fijos de §5.4 en `fixtures.ts`: la general de 140 filas con la propia en el puesto 34, el nombre de corredor más largo (`Jean-Baptiste Delacroix-Mény`, 28 caracteres) y el título más largo (`U23 time trial champion of Saint Vincent and the Grenadines`, 59, en el nombre del maillot de campeón); y además los abandonos, la clasificación por equipos y la tabla velada.

### Lo que se aparta del diseño, y por qué

1. **`RiderLabel` gana `teamLine`**, que en una `RankTable` va a `false`. §6.1 pone el equipo como la columna `Team`, `secondary`, que la tabla pinta en el segundo renglón por debajo de 640 y como columna desde 640; con el segundo renglón propio de `RiderLabel`, desde 640 el equipo saldría dos veces.
2. **`RankTable` gana `identityHeader`** (`Rider` por defecto; `Team` en la de equipos) **y `clip` en sus columnas**, la única que se corta con `…` (el nombre del equipo, §4.5): la interfaz de §4.5 no tenía cómo decir cuál es.
3. **El `Show all` de `RankTable` se pinta con el aspecto de `Button`** (`secondary`, a todo lo ancho, de 44), con el `TOP_ROWS` de `ShowAll.tsx`, y no con `ShowAllButton`: ese conserva el aspecto de hoy en las páginas de hoy hasta que pasen a `RankTable` (12b), y cambiarlo cambiaría esas páginas en un PR donde el dueño solo ve `/_ui`.
4. **El nombre de `RiderLabel` es un `TextLink` en una frase** (`inline`, con su regla de 24 px de la comprobación 5): es parte del renglón de la identidad y no un control suelto. En una tabla, el enlace es la celda entera, de 44.
5. **El maillot se pega a la última palabra del nombre** ([DUEÑO 17]) con `white-space` y no con un carácter. Junto a un SVG siempre se puede partir (CSS Text 3 §5.1), y Chromium parte también donde se cierra una caja en `normal`: el renglón va en `nowrap` y solo lo de delante de la última palabra, en `normal` (`gluedLastWord` y `glueEnd`). Medido en `/_ui` a 320: con `U+2060` entre los dos, y con `nowrap` solo en el antepasado común, el maillot de `Jean-Baptiste Delacroix-Mény` y el de `Valencia Pro Team` caían solos al renglón siguiente.
6. **Hasta el 17a, los maillots de hoy**: `LeaderJersey`, el de campeón (`ChampionMark`) sin la bandera de al lado, que D-00c quita, y `LegacyJersey`, todos a 28 en `RiderLabel` y a 40 en `RiderHeader`.
7. **El maillot de `RiderHeader` no se pulsa todavía**: abre la `Sheet` desde el 17c, que la trae (§8.10).
8. **`RiderHeader`, cargando, sin encontrar o con un fallo, se pinta él mismo**: su esqueleto (el de `Skeleton` `header` llega en el 10) y `ErrorState`.
9. **`TripRow` escribe aquí su interfaz**, que §4.5 describe pero no da: `race`, `meta`, `legs` (`days`, `what` y lo que edita un descanso) y `active`; el `Now`, dentro de la cabecera, para que su nombre lo diga.
10. **En el segundo renglón de `RankTable`, el `·` cuelga del valor anterior**, como una coma: si el renglón parte, no empieza por él.
11. **La celda de identidad es `w-full max-w-0`**: un equipo cortado con `truncate` cuenta entero para el ancho mínimo de su columna, y a 320 la general ensanchaba su tabla 10 px. Así toma lo que dejan las demás.
12. **`ActionRow`, ocupado, no tiene texto propio**: el botón conserva el suyo con el indicador. `Adding…` no cabe en la caja de `Add` (se salía 17 px a 360), y la caja no cambia de ancho (§4.1).
13. **La fila velada**, en una línea: el icono, el texto y `Watch` a la derecha; el `·` del texto de pantalla no se pinta.
14. **`words.ts` nace solo con lo de estos componentes**: `formatGameDay` llega con la primera página que pinte días, porque `ActionRow` y `TripRow` reciben sus renglones ya escritos.
15. **Lo que el diseño no medía**: la `Flag`, sin esquinas redondeadas (hoy, 2 px; el tema cerrado solo tiene `radius-ui`); los segmentos del `Meter`, de 20 px de ancho; la estrella media, con todo el contorno en `gold-ink`; y las filas de `RankTable`, con un filete `line` entre ellas. La densidad `fine:` de una tabla sin maillot (36 px) llega con la de los movimientos, en la cola larga.

### Las cifras (para la descripción del PR)

- **La prueba del teléfono**: `/_ui`, a cero a 360 y a 320, con los diez; y las 92 medidas de las otras 46 pantallas, idénticas, con la web del PR sobre el mismo mundo que la base (96 tests en 6,3 minutos).
- **Los tests**: en `components/ui/`, 209 en 30 ficheros (eran 140 en 20): los diez nuevos y un caso más en `TextLink.test.tsx`; y `legacyJersey.test.ts`, 7, en `packages/shared`.
- **`deuda.json`**, igual: 2.740 en 83 ficheros; los nuevos, sin deuda.
- **Los avisos `ui/`**: de 1.485 en 89 ficheros a 1.465 en 88, los 20 de `visuals.ts` fuera. `pnpm lint`, 0 errores.
- **El peso**, con gzip: la hoja que bloquea, de 10,54 a 10,91 KB, con las clases de los componentes nuevos; el JS de arranque, de 146,7 a 147,5 KB en 13 ficheros (`OfflineBanner` sale a un trozo compartido con `/_ui`). Dentro de sus presupuestos (15 y 160 KB). `/_ui`, en su trozo, de 7,5 a 15,3 KB.

### Lo que ve el dueño

Más de `/_ui` en su teléfono: las banderas, las estrellas, el corredor en una lista y en su ficha, la general de 140 filas con la suya en el 34, las filas con acción, el viaje y las dos escalas. Ninguna página cambia: el maillot de hoy sale de `packages/shared` con las mismas cifras.

### El riesgo del despliegue

Ninguno: lo que se pinta en las páginas no cambia (`legacyJerseyStyle` da lo mismo que el `jerseyStyle` de antes para las 219 semillas, y `Jersey` lo usa igual). Se revierte con un revert.

### Notas para el paso siguiente

1. **El 12b** pinta las clasificaciones con `RankTable`: la identidad, `RiderLabel` con `link={false}` y `teamLine={false}`, y el equipo como columna `secondary` con `clip`; el maillot de líder, con `leader` de `jerseyOf`. Una tabla de equipos pone el nombre con `gluedLastWord` y su maillot detrás, dentro de algo en `nowrap`.
2. **El 17a** ensancha `team` a `WornTeam | null` y cambia, dentro de `ChosenJersey`, los dibujos de hoy por `Kit`, `LeaderJersey` y `ChampionJersey`. **El 17b**, al quitar `Jersey`, deja a `LegacyJersey.test.tsx` sin con quién compararse: que guarde antes el marcado de las cinco semillas de cada patrón.
3. **El 17c** hace del maillot de `RiderHeader` un botón que abre la `Sheet`.
4. **El 16b** (la traducción) importa `legacyJerseyStyle` de `@cyclingstar/shared/legacyJersey`.
5. **El 10** pasa el esqueleto de `RiderHeader` a `Skeleton`.
6. **Un maillot detrás de un nombre**, donde sea: `gluedLastWord` dentro de algo en `nowrap`, o `TextLink` con `glueEnd`.
