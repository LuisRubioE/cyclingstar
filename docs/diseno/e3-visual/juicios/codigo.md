# Juicio E3 · Coherencia con el código y coste

Juez: «codigo». Pregunta: ¿es verdad en el código lo que cada propuesta dice de él, cuesta lo que dice y
deja el juego desplegable en cada paso? Árbol `58c14da` (la copia, `d15e550`, solo añade documentos).
Leídos enteros los tres ficheros de fase y las cuatro propuestas (`telefono.md` 698 l., `sistema.md` 696,
`identidad.md` 675, `lectura.md` 698), y de los mapas el resumen y las secciones que cito. **Medido** en el
clon de `<scratchpad>/repo` (Tailwind 4.3.3, Zod 4.4.3, `fastify-type-provider-zod` 7.0.0) con
`<scratchpad>/juez-codigo/frontera.cjs` y `cierre.cjs`, sin modificar ni el repositorio ni el clon.
Leyenda: ● vale, con mecanismo y coste creíble; ◐ a medias o con un defecto que corregir; ○ falso o ausente.

## 1. Tabla cruzada

| #   | Ítem                                  | telefono                                                                                      | sistema                                                                                    | identidad                                                                           | lectura                                                                                   |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Tokens en el `@theme`                 | ● color, letra, radio y sombra en el `@theme`; el tema queda abierto                          | ● 39 colores y 28 tokens; cierre con `initial` en el último PR (cierto, comprobación 4)    | ◐ sustituye los seis `brand-*`; la paleta de Tailwind sigue a mano                  | ◐ tokens por función; nada cierra el tema                                                 |
| 2   | Lo que impide reinventar              | ◐ ESLint solo en `pages/`: `components/`, con los hexadecimales de v3, queda fuera            | ● diez reglas en `apps/web/src` y trinquete de deuda por fichero                           | ○ ninguna regla; solo `contrast.test.ts`                                            | ◐ `noRawPalette.test.ts`, una búsqueda de cadenas con lista que encoge                    |
| 3   | Los seis tests con clases             | ◐ los enumera; vuelven a fijar clases                                                         | ● pasan a `data-ui`, `data-variant` y `data-state`, con sus líneas                         | ◐ re-sellados por sus clases                                                        | ◐ «se re-sellan», sin decir contra qué                                                    |
| 4   | Banderas fuera de la CSS              | ● sprite WebP de 47 KB que pide el primer `Flag`; hoja de 92,4 a 9,2 KB, medido               | ● un fichero por país con huella, caché primero                                            | ○ `public/flags/` sin huella: `max-age=0` y cupo por IP (comprobación 7)            | ○ `/flags/4x3/xx.svg` sin huella, y lee al revés `app.ts` l. 127-133                      |
| 5   | Presupuesto de peso                   | ● hoja que bloquea ≤ 15 KB y JS del arranque ≤ 160 (hoy 157)                                  | ◐ CSS ≤ 15 KB, pero arranque ≤ 255 KB: deja crecer el JS unos 80 KB sin aviso              | ◐ CSS ≤ 20 y entrada ≤ 70, con 23 KB de letra por defecto                           | ◐ solo la CSS ≤ 15 KB                                                                     |
| 6   | Letra                                 | ● la del sistema, 0 KB                                                                        | ● la del sistema, con los alfabetos de E10                                                 | ◐ Barlow Semi Condensed por defecto, 22.984 B y un salto de letra                   | ● la del sistema, 0 KB                                                                    |
| 7   | Manifiesto, iconos y metas            | ◐ completo y leído por Chromium; `black-translucent` sin área segura arriba                   | ● completo, barra de estado por defecto                                                    | ● completo, `theme_color` noche                                                     | ● completo, y avisa del área segura de arriba                                             |
| 8   | Service worker                        | ● primero la red, medido contra las precargas de E2 (`app.ts` l. 371); nunca `/api`           | ● primero la red; `/api` ni se guarda ni se intercepta; precarga cinco destinos            | ● a mano, con `sw-assets.json`; nunca `/api`                                        | ● plugin de Vite; nunca `/api` ni la caché de React Query                                 |
| 9   | Sin red y la sesión                   | ● sesión «desconocida»: ni `/login` ni caché vacía (comprobación 3)                           | ○ no ve `ProtectedRoute.tsx` l. 12-13: recargar sin red lleva a `/login`                   | ○ ídem                                                                              | ○ ídem: su caso 49 acaba en `/login`                                                      |
| 10  | Versión nueva y JS viejo              | ● `UpdateToast` y `webBuild` en `/health` contra el desfase de contratos                      | ◐ aviso de versión, sin desfase                                                            | ◐ ídem, nunca a mitad de `Watch`                                                    | ◐ ídem                                                                                    |
| 11  | Frontera: lo que corta                | ● `schema.response` y el serializador de hoy quitan lo no declarado, también anidado (medido) | ○ `.strict()` en un test: superficial, no caza `news` (comprobación 2)                     | ◐ `.strict()` en tests, superficial                                                 | ◐ `.strict()` en tests y desarrollo; aporta la resolución en el tipo                      |
| 12  | Frontera: declaración por ruta        | ◐ `exposes` sin comprobación, en 92 rutas y en la tabla literal                               | ● ninguna nueva                                                                            | ◐ `data`, como `exposes`                                                            | ● `response` obligatorio en el registro de E2: la declaración que trabaja                 |
| 13  | El canario de B1a                     | ◐ testigos nuevos; «las POST» sin acotar a las de lectura                                     | ● POST de lectura y testigos numéricos                                                     | ● testigos y la POST de la vista previa                                             | ● testigos con su valor y la vista previa                                                 |
| 14  | Maillot: columna, tabla y migración   | ◐ `teams.kit` `jsonb` no nulo «con relleno» en la migración: el reparto no es SQL             | ◐ ídem, «nula, relleno, `not null`» en una migración; el pasado con `legacyJerseyStyle`    | ● `team_kits` con historia y `ensureKits` en el tick, el patrón de `tick.ts` l. 283 | ● `teams.jersey` nula y su relleno; repinta el pasado al servir                           |
| 15  | Maillot en contratos y reparto        | ◐ solo nombra `CastTeam` (`cast.ts` l. 146-154)                                               | ◐ `CastTeam.jerseyDesign` y `WornJerseyIcon`                                               | ● los tres contratos, `RiderCard.team` y `serveCast`, con línea                     | ◐ `serveCast` al servir                                                                   |
| 16  | Validar el maillot en el servidor     | ◐ `checkKit` dibuja y mide en cada petición; los rivales, sin origen                          | ● tabla de choques precalculada, fuera del barril; los rivales, sin origen                 | ◐ `kitDistance` con tablas de cobertura generadas en Chromium; rivales sin origen   | ◐ por ámbito (división y continente): barato, pero no separa a quien coincide fuera de él |
| 17  | Examen: la proyección                 | ● carga de carrera, viaje a 15 TSS y TSB del diario; no dice cómo, con `projectLoad`          | ○ deja la carga de carrera «al motor»; `applyDailyLoad` ya está exportado (comprobación 8) | ◐ la carga de carrera sí; el viaje y el TSB del primer día, no                      | ● la más completa: modo, órdenes, plan de equipo y entrenador                             |
| 18  | Examen: precedencia, solapes, semanas | ◐ `resolveTrainingDay` y solapes en pantalla y tick; no ve el desfase de semanas              | ◐ ídem                                                                                     | ◐ solapes solo al guardar, sin orden en el tick                                     | ● ve y arregla el desfase (`riders.ts` l. 453 frente a `train.ts` l. 216)                 |
| 19  | La prueba del teléfono                | ◐ en el CI con mundo y trinquete; Playwright no está en el repositorio                        | ● en el CI sobre `/_ui` y cada noche en las 45 pantallas                                   | ◐ en el CI con etiqueta y cada noche, sin línea base                                | ○ a mano antes de fusionar: no se hace cumplir                                            |
| 20  | Plan y coste                          | ◐ 22 PR sin la cola larga de páginas                                                          | ● 37 PR con la deuda medida fichero a fichero; el tema se cierra al final                  | ○ 15 PR: tres para 146 botones, 63 paneles y 70 estados                             | ◐ 15 PR en días de agente; la cola larga, un L                                            |

**Lectura.** Las cuatro aciertan en lo grueso del servidor (primero la red, `assets/` de la caché, `/api`
nunca guardada). `telefono` es la única que ha probado lo que dice del servidor, la sesión y el
serializador, y su flanco es el sistema como código; `sistema` es lo contrario. `identidad` acierta en el
dato del maillot y falla en peso y plan; `lectura` es la que mejor ha leído el examen.

## 2. Comprobaciones

| #   | Afirmación                                                                                                               | De                                      | Resultado | Evidencia                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | El serializador de Zod que ya monta la API quita lo que el esquema de respuesta no declara                               | telefono §9.1                           | cierta    | `app.ts` l. 162-163; `fastify-type-provider-zod` `core.cjs` l. 114-120 (`safeEncode` y `JSON.stringify`). Medido: `{ id, stars, ctl, attributes, days: [{ gameDay, tsb }] }` sale `{"id":"r1","stars":3.5,"days":[{"gameDay":5}]}`. Hoy ninguna ruta declara `response` (grep), y un `Date` en un `z.string()` da 500 |
| 2   | Validar cada respuesta con la versión `.strict()` de su esquema habría cazado las seis claves de más de `teams/:id/news` | sistema §9; identidad §9; lectura §9    | falsa     | las seis salen del `...r` de cada ítem (`news.ts` l. 448), dentro de `z.array(teamNewsItemSchema)` (`contracts.ts` l. 766-773); en Zod 4.4.3 `.strict()` solo mira la raíz: medido, una clave de más en un ítem pasa y una en la raíz falla. El mapa 02 §9, punto 6 (l. 332-335), dice lo mismo y se equivoca igual   |
| 3   | Sin red, quien tiene sesión ve `Log in` y la caché se vacía                                                              | telefono §1.6 y §8.3                    | cierta    | `ProtectedRoute.tsx` l. 12-13 lleva a `/login` con `data` nulo y `HorizonWatcher.tsx` l. 33 vacía la caché; vista la captura `propuesta-telefono/pwa/out/sinred-recargar-propuesta.png`. Es falso, por eso, lo que sistema §8, identidad §8 y lectura §8.3 prometen al recargar sin red                               |
| 4   | Con `initial` en el `@theme` deja de generarse la paleta de Tailwind y los arbitrarios siguen resolviendo                | sistema §0 y §2                         | cierta    | `__unstable__loadDesignSystem` está en `tailwindcss@4.3.3/dist/lib.js`; medido: cerrado, no resuelven `bg-indigo-600`, `text-white`, `max-w-6xl`, `rounded-2xl` ni `shadow-sm`; sí `text-[11px]` y `p-5`                                                                                                              |
| 5   | La vista previa numera las semanas desde mañana y el tick desde el `startDay` guardado                                   | lectura §1.5                            | cierta    | `riders.ts` l. 453 (`blocks[Math.floor(i / 7)]`, con `i` desde mañana) frente a `train.ts` l. 216 (la semana cuenta desde `fila.startDay`), y `PUT /plan` fija mañana (l. 413): desde el día siguiente al guardado, escalera y tick van desfasados                                                                    |
| 6   | El lint ya corre sobre `.tsx` y las reglas nuevas no piden otro trabajo del CI                                           | sistema §1.1                            | cierta    | `eslint.config.js` l. 228 y l. 255; `pnpm lint` es `eslint .` (`package.json` l. 23; `ci.yml` l. 252). `00-encargo.md` §6.7 («`.js` y `.mjs`») se queda corto                                                                                                                                                         |
| 7   | Las banderas como ficheros de `public/flags/` sacan el peso de la CSS sin coste                                          | identidad §3.3; lectura §5.3 y §14      | a medias  | hoy 142 banderas ya van sueltas en `dist/assets/` con huella (medido en el clon) e inmutables (`app.ts` l. 141); en la raíz saldrían `public, max-age=0` (l. 131-133) y cada revalidación gasta el cupo de 300 por minuto e IP (`security.ts` l. 10). `assets/` no «deja de contar»: deja de pedirse                  |
| 8   | La carga real del día de carrera en la proyección pide al motor                                                          | sistema §7.3                            | a medias  | `projectLoad` solo acepta sesiones del catálogo (`projection.ts` l. 40-48), pero el motor exporta `applyDailyLoad` (`index.ts` l. 365), que `packages/db` ya usa (`stageRun.ts` l. 13): la API compone la curva día a día sin tocar el motor. Las otras tres lo dan por hecho sin decir cómo                          |
| 9   | El maillot en `jsonb not null`, con su relleno en la migración de drizzle-kit                                            | telefono §6.3; sistema §6.2             | a medias  | hay SQL de datos en migraciones (`0032_techos_por_edad.sql`) y relleno idempotente en el tick (`tick.ts` l. 283), pero el reparto (ΔE00 dibujado contra rivales) no se escribe en SQL y un `NOT NULL` sin `DEFAULT` rompe el test del mundo vivo (`migrate.ts` l. 80). `ensureKits` (identidad) sigue el patrón       |
| 10  | `stageTables.test.tsx` sigue pasando con el maillot de equipo en cada fila                                               | identidad §12                           | cierta    | cuenta por etiqueta exacta (l. 35-36) y toma el primer enlace de la fila (l. 43-48); `leaderJerseys.test.tsx` l. 86-87 tampoco cae con el maillot delante del nombre                                                                                                                                                  |
| 11  | La prueba del teléfono corre en el CI con Playwright y axe-core                                                          | telefono §5.3; sistema §5; identidad §5 | a medias  | ninguno está en un `package.json`; los guiones del mapa 05 los usan instalados fuera (`capturas/README.md` l. 63-71): es dependencia nueva, Chromium en la caché del CI y un mundo con cuatro cuentas que hoy pide SQL (mapa 05 §1)                                                                                   |
| 12  | `viewport-fit=cover` y barra de estado `black-translucent` en el paso 2                                                  | telefono §8.1 y §13                     | a medias  | sin dispositivo: la cabecera no reserva `safe-area-inset-top` (solo lo usan `BottomNav.tsx` l. 44 y `App.tsx` l. 154), así que instalada en iPhone la hora se pintaría sobre la cabecera hasta el paso 8                                                                                                              |

## 3. Puntuaciones

| Propuesta | Cobertura | Coherencia | Ejecutabilidad | Experiencia |
| --------- | --------- | ---------- | -------------- | ----------- |
| telefono  | 8         | 8          | 7              | 9           |
| sistema   | 8         | 6          | 8              | 6           |
| identidad | 6         | 5          | 5              | 6           |
| lectura   | 7         | 7          | 6              | 8           |

**telefono.** La única que ha probado contra el servidor lo que propone: el serializador (1), la sesión
sin red (3), la red primero frente a las precargas de E2 y la hoja de 92 a 9 KB. Baja en ejecutabilidad
por el sistema como código: regla solo en `pages/`, sin cola larga, `teams.kit` no nulo sin camino de
relleno y el paso 2 en iPhone.

**sistema.** Su maquinaria es verdad medida (cierre del tema, lint sobre `.tsx`, trinquete) y la más
ejecutable sin preguntas (`data-*`, `/_ui`, 37 PR por deuda). Pierde donde se decide: su `.strict()` no
caza lo que dice (2), su recarga sin red acaba en `/login` (3), deja la carga de carrera por un motivo
falso (8) y su presupuesto de 255 KB no frena el JS. Su teléfono es el escritorio corregido.

**identidad.** La mejor en el dato del maillot (`team_kits`, `ensureKits` en el tick, contratos con
línea). Fuera del maillot cuesta caro y mide poco: banderas sin huella (7), 23 KB de letra por defecto,
`.strict()` superficial, sin red roto, ninguna regla contra reinventar y 15 PR para todo.

**lectura.** La que mejor ha leído el código del examen: el desfase de semanas (5), el `startDay` del
plan vivo y una vista previa que lee modo, órdenes y plan de equipo; aporta la resolución en el tipo. Cae
en lo de servir (banderas sin huella, recarga sin red) y deja la prueba del teléfono a mano.

## 4. Ganadora: `telefono`

Es la base que menos hay que corregir contra el código. Lo que afirma del servidor, la caché, la sesión y
el serializador es cierto y está medido; su frontera es la única que corta en producción y en profundidad
(comprobación 1), mientras las otras tres descansan en un `.strict()` que no hace lo que dicen (2); su sin
red es el único que sobrevive a una recarga (3); y su plan pone primero lo barato que más pesa en el
teléfono (pasos 2 a 5). Lo que le falta es lo que `sistema` tiene probado (cierre del tema, deuda por
fichero, `data-*`) y se injerta sin rehacer nada; con `sistema` de base habría que rehacer frontera, sin
red y examen, que son lo que se ve y lo que rompe.

## 5. Injertos

1. **De `sistema` §2.1, §12 y §13 (pasos 2 y 17): el tema cerrado como último PR**, `initial` en color,
   letra, radio, sombra y contenedor, con `vocabulario.test.ts` sobre `__unstable__loadDesignSystem` a
   versión fija y `deuda.json` por fichero. Porque es real en 4.3.3 (4) y cierra lo que la regla de
   `telefono` deja abierto; hasta el último PR todo sigue resolviendo.
2. **De `sistema` §13 paso 16: la cola larga por deuda** (`Race` 166, `MyRaces` 98, `TeamCalendar` 93…),
   unos 10 PR. Porque sin ella el paso 17 de `telefono` no puede poner la regla en error.
3. **De `sistema` §4 y §12: `data-ui`, `data-variant` y `data-state`, y componentes sin `className` para
   lo suyo**, con los seis tests re-sellados contra eso (`CueCard.test.tsx` l. 34, `GroupBar.test.tsx`
   l. 82…). Porque si no cada paleta los rompe, y en v4 dos clases de una familia las ordena la CSS emitida.
4. **De `sistema` §5 y §12: la prueba del teléfono en el CI sobre `/_ui`** (datos fijos, unos 2 min) y la
   de las pantallas con mundo, cada noche. Porque un mundo con cuatro cuentas en cada PR pide lo que el
   mapa 05 hizo con SQL (§1), con un Playwright que el repositorio no tiene (11).
5. **De `identidad` §6.2 y §13 paso 3: el relleno del maillot como paso idempotente del tick** tras
   `seedWorld` (el patrón de `backfillRosters`, `tick.ts` l. 265 y 283), la columna nula hasta entonces y
   el maillot nuevo «desde el día siguiente». Porque el reparto no es SQL (9).
6. **De `identidad` §6.2: la lista de lo que gana el maillot**: `contracts.ts` l. 665, 692 y 718,
   `broadcast/wire.ts` l. 354, `cast.ts` l. 151-154 y `broadcastSource.ts` l. 1324. Porque `telefono` solo
   nombra `cast.ts`, y el agente no tiene a quién preguntar por los otros cinco.
7. **De `sistema` §3.5 y §6.3: la tabla de choques precalculada** (`jerseyConflicts.ts`, fuera del barril),
   con la huella de la geometría de `identidad` §6.2. Porque así `checkKit` no dibuja ni aplica Machado y
   CIEDE2000 en cada petición, y una figura retocada sin regenerar hace caer el test.
8. **De `lectura` §7.5 (puntos 2 y 3): la vista previa con el `startDay` del plan vivo**, el cuerpo con
   `edits`, modo y plan de equipo, y `PUT /plan` que conserva ese `startDay` (`riders.ts` l. 413). Porque si
   no las cabeceras `Days 51 to 57` de `telefono` §7.4 y la proyección hablan de semanas distintas (5).
9. **De `lectura` §9 (puntos 1 y 3): `schema.response` obligatorio en el registro de E2 y la resolución
   en el tipo** (`multipleOf(0.5)` en estrellas, enteros de 0 a 100, enumerados), en lugar de `exposes`.
   Porque con el serializador (1) un `63.4172` deja de poder salir: es una declaración que trabaja.
10. **De `sistema` §3.1: el ámbito oscuro `[data-surface='dark']`**, nueve tokens con el mismo `Button`
    en `Watch`. Porque `telefono` §10 no dice qué hacen sus componentes sobre `navy-dark`, y así
    `WatchBlocks` y `PlayerControls` usan el catálogo sin variantes nuevas.
11. **De `sistema` §8 y `lectura` §8.2: el service worker no intercepta `/api/*`, `/health` ni
    `/api/auth/*`** y no persiste la caché de React Query. Porque `index.html` precarga `/health` (l. 13) y
    el HTML de etapa precarga la API (`app.ts` l. 371): interceptarlas les cambia caché y credenciales.

## 6. Objeciones a `telefono`

1. **§6.3 y paso 13: `teams.kit` no nulo con relleno «en la migración».** El reparto no es SQL y
   `seedWorld` inserta sin él (`world.ts` l. 478-493): columna nula, relleno en el tick (injerto 5) y
   `NOT NULL`, si se quiere, en una migración posterior.
2. **§8.1 y paso 2: `black-translucent` sin área segura arriba** (12): barra por defecto en el paso 2, o
   `env(safe-area-inset-top)` en la cabecera en el mismo PR.
3. **§9.1 y paso 16: un esquema de respuesta convierte en 500 lo que no casa** (medido con un `Date`; hoy
   no hay fechas en los contratos, grep). Cada ruta necesita su respuesta real serializada en un test, y
   codificar con Zod las de la retransmisión (de 0,87 a 3,8 MB, `app.ts` l. 194-196) está sin medir: el
   paso es de 3 a 4 PR, no un L.
4. **§9 punto 4: `exposes` no comprueba nada** y toca las 92 rutas y la tabla literal
   (`spoilerRegistry.test.ts` l. 31): se cambia por el injerto 9.
5. **§9 punto 3: el canario barre «las POST»**: solo las de lectura, en lista cerrada; barrer todas ejecuta
   mutaciones en el mundo de prueba.
6. **§4 y §12: la regla de ESLint solo mira `pages/`**; `components/` (53 ficheros, con los hexadecimales
   de v3 de `broadcast/`, mapa 01 §2.4) entra en `apps/web/src/**` menos `ui/`, que el lint ya cubre (6).
7. **§13: falta la cola larga** (injerto 2): el total es de unos 32 PR, no 22 (estimado).
8. **§8.3: el sprite entra por Vite**, con huella en `assets/`, o sale con `max-age=0` (`app.ts`
   l. 131-133); sus 133 coordenadas, generadas y comparadas en un test.
9. **§7.2 y §11: `PREVIEW_RACE_DAY_TSS` es una constante de juego** y va en
   `packages/engine/src/constants.ts` con su intención y su línea en `docs/balance.md` (`Claude.md` l. 12),
   sin subir `ENGINE_VERSION` porque el motor no la lee; la curva se compone con `applyDailyLoad` (8).
10. **§7.4: no arregla el desfase de semanas** entre vista previa y tick (5): injerto 8.
11. **§5.3 y paso 1: Playwright y axe-core no son dependencias** (11): el paso los fija de versión, guarda
    Chromium en la caché del CI y, con el injerto 4, deja el mundo para la pasada nocturna.
12. **§6.6: `KIT_MIN_PX` = 16 sube los maillots de 13 px** de `GroupBar.tsx` l. 242, `CueCard` y
    `TimeTrialBoard`: un cambio del diseño de E2 que el paso 14 no cuenta y que E2 y E6 tendrían que
    aceptar; el vocabulario medido a 13 px (las otras tres) lo evita.
13. **§8.2: precargar los 80 ficheros (unos 320 KB) en la primera visita** compite con Slow 4G con lo que el
    jugador pide después: basta el arranque y los cinco destinos (sistema, unos 220 KB).

## 7. Lo que ninguna propuesta resuelve

1. **Los rivales de temporada**: validar «a menos de 10 de quien coincide contigo» pide saber quién corre
   con quién, y `predictStartlist` es una transacción por carrera (`calendarRun.ts` l. 785) que solo usa
   `routes/calendar.ts` l. 290. Nadie dice dónde se guarda ese conjunto ni qué pasa con un maillot ya
   guardado cuando un mánager añade una carrera en `TeamCalendar`.
2. **`jerseySeed` sigue cruzando la frontera** (`contracts.ts` l. 665, 692 y 718; `wire.ts` l. 354)
   cuando el maillot ya es dato: la regla de §9 aplicada al propio cambio de E3.
3. **El peso que queda en el arranque**: `request.js` lleva 42 KB de `broadcast/*` por el barril de
   `packages/shared` sin `sideEffects` (mapa 01 §8); sin banderas, es lo siguiente que pesa.
4. **Los planes ya solapados en producción**: el arreglo vale desde el siguiente guardado y nadie los
   limpia (un paso del tick o una migración de datos).

## 8. Las decisiones de gusto

- **Paleta.** A la página: «manager sobrio» (telefono A y lectura a: navy `#123a5c`, acento `#0b6e8a`,
  oro, tarjetas blancas sin barras de color), «el manager de hoy, accesible» (sistema A, telefono B,
  identidad B, lectura b: barras lisas `#006e8c` y `#d99400` con tinta) y «noche y oro» (identidad A,
  `#14213d` y `#e0a526`). **Por defecto, telefono A**: con el tema cerrado las tres cuestan seis tokens, y
  la sobria quita las dos superficies que hoy fallan el contraste (de 2,06 a 3,33, mapa 01 §2.3).
- **Tipografía.** La del sistema (0 KB), Inter variable (47,1 a 48,3 KB el latín, 83,1 a 85 el
  extendido) y Barlow Semi Condensed solo en títulos y cifras (22.984 B el peso 600). **Por defecto, la del
  sistema**: cero bytes y ningún salto con Slow 4G; otra se serviría desde `public/fonts/`, porque la CSP
  solo deja `font-src 'self' data:` (`app.ts` l. 183).
- **Campeón.** La estrella oro `#f0b323` sobre marino `#14284b` (sistema S1), la estrella sobre blanco
  (telefono A, lectura a), la banda de honor (identidad A) y una variante del dueño (las tres franjas de
  telefono C o el espectro en diagonal de identidad C). **Por defecto, S1**: cuesta lo que la estrella
  sobre blanco (una figura sobre `TORSO`, desde el `ChampionMark` de `Jersey.tsx` l. 135) y queda a 50,1
  de la marca a 13 px, frente a 11,2 (lectura) o 16,6 a 16 px (telefono); la banda pide 133 colores
  nacionales generados, con errores conocidos (Corea, identidad §6.5).
- **Vocabulario del maillot.** 10 colores y 7 figuras (sistema, 610), 12 y 7 a 16 px (telefono A, 651),
  14 y 6 con regla de contraste (identidad A, 443) y 15 y 6 (lectura a, 605). **Por defecto, sistema**:
  medido a 13 px, el tamaño de `GroupBar.tsx` l. 242, sin mover el diseño de E2, y con una tabla de choques
  pequeña que se consulta sin dibujar.
