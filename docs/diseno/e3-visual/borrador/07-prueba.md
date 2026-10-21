## 7. La prueba del teléfono: el criterio de aceptación

«Se juega bien en un teléfono» es una prueba del CI (D-18): `apps/web/e2e/telefono.spec.ts`, con Playwright, sobre `/_ui` y sobre las 45 pantallas del mapa 05, a 360 × 800 y a 320 × 640 px con tacto (`hasTouch`, `isMobile`) y relación de píxeles 2. Una pantalla se juega bien en un teléfono cuando pasa las nueve comprobaciones de §7.1; E3 está terminado cuando `telefono-baseline.json` está a cero en todas (§7.4). Lo que la prueba no ve lo mira el dueño en su teléfono (§7.7) o queda como riesgo (§7.8).

### 7.1 Las nueve comprobaciones

| #   | Qué mide        | Cómo lo mide, en la página                                                                                                                                                                                                                                                                                                                   | Umbral                                | Hoy (mapa 05, a 360)                                                                                             | En el prototipo de telefono (uso C1)                                   |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | el reflujo      | `document.documentElement.scrollWidth` frente a `innerWidth`, tras cargar y volver arriba                                                                                                                                                                                                                                                    | iguales, a 360 y a 320                | 45 de 45 a 360; a 320, sin medir                                                                                 | cumple a 360 y a 320                                                   |
| 2   | los recortes    | todo elemento visible con `overflow-x` `hidden` o `clip`, o con `text-overflow: ellipsis`, cuyo `scrollWidth` pase de su `clientWidth` en más de 1 px, sin `[data-clip-ok]` en él ni en un antepasado                                                                                                                                        | 0                                     | no contado; a la vista, el calendario del equipo, la plantilla, la nación y la barra inferior con cinco destinos | 0                                                                      |
| 3   | la letra        | cada nodo de texto visible (un `TreeWalker` de `SHOW_TEXT`, con caja de ancho mayor que 0): `getComputedStyle` de su padre; en un `<text>` de SVG, por la escala de `getScreenCTM()`                                                                                                                                                         | 12 px o más (`MIN_FONT_PX`)           | 8 px en `Watch`; 10 y 11 en tablas y fichas; 11 en la barra inferior                                             | 12; ningún nodo por debajo                                             |
| 4   | los campos      | `font-size` calculado de cada `input`, `select` y `textarea` visible                                                                                                                                                                                                                                                                         | 16 px o más (`MIN_FIELD_FONT_PX`)     | 34 de 42 a 14 px (mapa 01 §2.2)                                                                                  | 0 por debajo                                                           |
| 5   | los objetivos   | la caja de cada `a[href]`, `button`, `input`, `select`, `textarea`, `summary`, `[role=tab]` y `[role=button]` visible: 44 × 44 (`MIN_TARGET_PX`); un enlace dentro de una frase (en línea y con más texto en su bloque), 24 × 24 o con un círculo de 24 px que no toque otro objetivo; los enlaces de tabla y de fila cuentan como controles | 0 por debajo                          | el más bajo, de 13 a 20 px en 30 pantallas                                                                       | 4: los enlaces de nombre de 20 px de alto, que con esta regla no pasan |
| 6   | axe-core 4.10.3 | `axe.run(document)` con `runOnly` en `color-contrast`, `target-size`, `select-name`, `button-name`, `link-name`, `label`, `dlitem` y `definition-list`                                                                                                                                                                                       | 0 nodos                               | 2.816 de contraste; 40 de `dlitem`; `select-name` en 01, 29 y 45; 25 de `target-size`                            | 0                                                                      |
| 7   | la respuesta    | el borde superior de `[data-answer]` (`getBoundingClientRect().top` más `scrollY`) arriba del todo, a 360 × 800; falla si no hay ninguno, si hay dos o si su `data-ui` no es el de §7.3                                                                                                                                                      | 520 px o menos (`ANSWER_MAX_TOP_PX`)  | 1.060 en `/me/training`; la capa fija de `Watch`, 328                                                            | 152, con 297 a la vista                                                |
| 8   | la acción       | tras la edición de la pantalla (`edit`, §7.3), `[data-primary-action]` visible y entera en el 40 % de abajo de la ventana (`THUMB_ZONE`), arriba del todo y al final del desplazamiento                                                                                                                                                      | en las dos posiciones                 | `Save day edits`, hacia los 6.700 px                                                                             | a 687 de 800                                                           |
| 9   | el alto         | `document.documentElement.scrollHeight` en el estado inicial, en las pantallas de herramienta                                                                                                                                                                                                                                                | 3.200 px o menos (`TOOL_PAGE_MAX_PX`) | 19.914 la inscripción; 6.887 el calendario del equipo; 6.807 el plan                                             | 1.277 (1.349 a 320)                                                    |

Cada comprobación da un número de faltas por pantalla y ancho, que es lo que guarda la línea base: la 1, la 7, la 8 y la 9 dan 0 o 1; la 2, los elementos recortados; la 3, los nodos de texto; la 4, los campos; la 5, los objetivos; la 6, los nodos de axe. La 7 solo corre a 360 × 800, donde está definida; la 8, en las pantallas con `edit`; la 9, en las de herramienta: donde no corren, la línea base guarda `null`. Las cuatro constantes de letra y dedo se importan de `apps/web/src/components/ui/constants.ts`, y `PHONE_REF`, `PHONE_MIN`, `ANSWER_MAX_TOP_PX`, `THUMB_ZONE` y `TOOL_PAGE_MAX_PX`, de `apps/web/e2e/telefono.config.ts` (D-02).

### 7.2 El mundo de la prueba

H-15; O-26. `apps/web/e2e/world/build.mjs` es el port de `capturas/mundo.mjs` (248 líneas), el mismo mundo que midió el mapa 05:

1. **La base**: PGlite 0.5.4 servida por socket, con todas las migraciones (`runMigrations`), como `packages/db/src/testDb.ts` l. 58-109. PGlite tiene una sola sesión (l. 16-19): cada fase abre su conexión y la cierra, y la API va con `DB_POOL_MAX=1`.
2. **La génesis**: `runTick` con `forceDays: 0` y `GENESIS_WORLD_SEED`, que crea el mundo con `seedWorld` (`tick.ts` l. 265 y 70).
3. **Las cuentas**, el día 0, por la API de verdad (`buildApp` y better-auth con `app.inject`): el jugador, inscrito por `POST /api/riders/me/race-entries/:raceId` (`routes/riders.ts` l. 775) a Race Murcia y Race Jaén, en casa, y a Race Var y Race Sardegna, fuera; el mánager, con su corredor; y la cuenta sin corredor. **Las cuatro escrituras con SQL** del mapa 05 §1, porque el juego no las da en un mundo recién creado: el correo confirmado (`update users set email_verified = true`, como `apps/api/src/adminPanel.test.ts` l. 36); 400 de dinero al jugador (nace con 0 y un agente libre no sale de su país sin poder pagarse el viaje, `calendarRun.ts` l. 716); el contrato del corredor del mánager en un equipo WorldTour de su país, escrito como lo escribe `acceptOffer` (el mercado no ofrece nada por debajo de `MIN_RATING_FOR_OFFERS` = 0,42, `packages/db/src/contracts.ts` l. 75); y `premium` del mánager.
4. **El calendario**: 50 días por `runTick`, de 40 en 40, con `timelineRecord: 'on'`, como en producción (849 s, 17 s por día, medido por el mapa 05 §1). El último día, el mánager toma su equipo (`POST /api/teams/take-over`) y los dos corredores guardan el mismo plan de bloques.
5. **El volcado**: `dumpDataDir` en `mundo-50.tar.gz` y las cuentas en `cuentas.json`.

Cada paso comprueba su respuesta y el script falla si no es la esperada: una toma del equipo que no da 200, o un mundo que no acaba con 219 equipos, no puede llegar a la caché (decisión 7-a). El servidor de la prueba es `apps/web/e2e/world/serve.mjs`, el port de `capturas/servir.mjs`: `buildApp` con better-auth, la web compilada de `apps/web/dist`, `BROADCAST_WATCH` y `SPOILER_MODE` en `on` como en producción, sin tick, con el ancla del reloj (`worlds.created_at`) puesta para que la cuenta atrás no salga vencida, y una IP propia en `x-forwarded-for` por contexto, porque el límite de la API es de 300 peticiones por minuto e IP (`apps/api/src/security.ts` l. 10).

**La caché del CI**: el mundo cuesta unos 15 minutos en una máquina de cuatro núcleos (`capturas/README.md`) y su volcado pesa 161 MB (medido por el redactor con `ls -l` sobre el `mundo-50.tar.gz` del mapa 05, en `<scratchpad>/mundo05/`). Se guarda con `actions/cache` y la clave `telefono-mundo-v1-` más la huella de `packages/db/drizzle/**`, `packages/engine/src/**` y `apps/web/e2e/world/build.mjs`: si cambia una migración, el motor o el script, se reconstruye. El PR del paso 2 mide el tamaño del archivo en la caché y su tiempo de restauración y los escribe en su descripción (D-18, sin evidencia de los jueces). **Lo que no vale** (X-23): «génesis y tres días» (telefono §5.3) no da las pantallas medidas: sin carreras terminadas, sin viaje, sin mánager y sin plan de bloques.

### 7.3 Las 45 pantallas

`TELEFONO_PANTALLAS` (O-27) tiene una entrada por cada fila con medidas de `capturas/README.md` (01 a 37 y 40 a 47). El `data-answer` es de este documento: dice qué contesta cada pantalla, y la sección que rediseña la pantalla lo pone en ese elemento. `QueryView` lo pasa a lo que pinte (§4.2), así que en las pantallas de estado (40 a 47) lo lleva el esqueleto, el error o el vacío.

| #   | Ruta                                                                 | Cuenta    | `data-answer`                                  | Herramienta | `edit` (comprobación 8)                   |
| --- | -------------------------------------------------------------------- | --------- | ---------------------------------------------- | ----------- | ----------------------------------------- |
| 01  | `/me/training`                                                       | jugador   | `Panel` `How you'll arrive`                    | sí          | cambia el bloque de la semana 1           |
| 02  | `/me/races`                                                          | jugador   | `Panel` `On your programme`                    | sí          | ninguna                                   |
| 03  | `/me/races?tab=enter`                                                | jugador   | `Panel` `Available to enter`                   | sí          | ninguna                                   |
| 04  | `/me/profile`                                                        | jugador   | `Panel` `Condition`                            | no          | ninguna                                   |
| 05  | `/world/races/race-valencia`                                         | visitante | `RankTable`, la general                        | no          | ninguna                                   |
| 06  | `/world/races/race-valencia?tab=classifications&cls=teams`           | visitante | `RankTable`, los equipos                       | no          | ninguna                                   |
| 07  | `/world/races/race-emirates`                                         | visitante | `RankTable`, la general                        | no          | ninguna                                   |
| 08  | `/world/races/race-valencia/stages/3`                                | visitante | `FixedOverlay`, la capa fija                   | no          | ninguna                                   |
| 09  | la misma, ocho segundos después de `Play`                            | visitante | `FixedOverlay`                                 | no          | ninguna                                   |
| 10  | `/world/races/race-valencia/stages/3/report`                         | visitante | `RankTable`, el resultado                      | no          | ninguna                                   |
| 11  | `/world/rankings`                                                    | visitante | `RankTable`, el ranking                        | no          | ninguna                                   |
| 12  | `/world/teams/<el primer WorldTour de GET /api/teams>`               | visitante | `RankTable`, la plantilla                      | no          | ninguna                                   |
| 13  | `/world/riders/<el primero de GET /api/rankings>`                    | visitante | `Panel` `Attributes`                           | no          | ninguna                                   |
| 14  | `/team/squad`                                                        | manager   | `RankTable`, la plantilla                      | no          | ninguna                                   |
| 15  | `/team/calendar`                                                     | manager   | `Panel` del plan de carreras                   | sí          | ninguna                                   |
| 16  | `/team/identity`                                                     | manager   | `KitPicker`, el maillot a 72 px                | sí          | desde el paso 18, cambia el color de base |
| 17  | `/`                                                                  | jugador   | `Panel` de lo siguiente (`dashboard.ts`)       | no          | ninguna                                   |
| 18  | `/`                                                                  | visitante | `Panel` de bienvenida, con `Create account`    | no          | ninguna                                   |
| 19  | `/news`                                                              | visitante | `Panel` de las noticias                        | no          | ninguna                                   |
| 20  | `/world/races`                                                       | visitante | `Panel` de las carreras                        | no          | ninguna                                   |
| 21  | `/world/teams`                                                       | visitante | `Panel` de los equipos                         | no          | ninguna                                   |
| 22  | `/world/nations`                                                     | visitante | `Panel` de los países                          | no          | ninguna                                   |
| 23  | `/world/nations/ES`                                                  | visitante | `RankTable`, el ranking de España              | no          | ninguna                                   |
| 24  | `/world/hall-of-fame`                                                | visitante | `RankTable`                                    | no          | ninguna                                   |
| 25  | `/me/orders`                                                         | jugador   | `Panel` de las órdenes de Race Var             | sí          | cambia el papel de la primera etapa       |
| 26  | `/me/contract`                                                       | jugador   | `Panel` de las ofertas                         | sí          | ninguna                                   |
| 27  | `/me/finances`                                                       | jugador   | `Stat` `Balance`                               | no          | ninguna                                   |
| 28  | `/account`                                                           | jugador   | `Panel` de la protección de resultados         | sí          | ninguna                                   |
| 29  | `/me/training`                                                       | manager   | `Panel` `How you'll arrive`                    | sí          | cambia el bloque de la semana 1           |
| 30  | `/`                                                                  | manager   | `Panel` de lo siguiente                        | no          | ninguna                                   |
| 31  | `/login`                                                             | visitante | `Panel` del acceso                             | sí          | ninguna                                   |
| 32  | `/register`                                                          | visitante | `Panel` del registro                           | sí          | ninguna                                   |
| 33  | `/how-to-play`                                                       | visitante | el primer `Panel`                              | no          | ninguna                                   |
| 34  | `/create`                                                            | nuevo     | `Panel` de la creación del corredor            | sí          | ninguna                                   |
| 35  | `/world/races/race-jaen`                                             | visitante | `FixedOverlay`                                 | no          | ninguna                                   |
| 36  | `/world/races/race-valencia/stages/3?tab=classifications`            | visitante | `RankTable`, la general tras la etapa          | no          | ninguna                                   |
| 37  | `/me/races?tab=results`                                              | jugador   | `RankTable`, los resultados (velados)          | no          | ninguna                                   |
| 40  | `/me/training`, con `/api/riders/me/orders` sin respuesta, a los 3 s | jugador   | `Skeleton`                                     | sí          | ninguna                                   |
| 41  | `/me/training`, con `/api/riders/me/orders` en 500                   | jugador   | `ErrorState`                                   | sí          | ninguna                                   |
| 42  | `/world/rankings`, con toda la API en 500                            | visitante | `ErrorState`                                   | no          | ninguna                                   |
| 43  | `/team/squad`                                                        | jugador   | `EmptyState` (un agente libre no tiene equipo) | no          | ninguna                                   |
| 44  | `/`                                                                  | nuevo     | `EmptyState`, con `Create your rider`          | no          | ninguna                                   |
| 45  | `/me/training`                                                       | nuevo     | `EmptyState`                                   | sí          | ninguna                                   |
| 46  | `/ruta-que-no-existe`                                                | visitante | `ErrorState` `notFound`                        | no          | ninguna                                   |
| 47  | `/world/riders/00000000-0000-4000-8000-000000000000`                 | visitante | `ErrorState` `notFound`                        | no          | ninguna                                   |

Hoy fallan la comprobación 9 tres de las quince de herramienta (01, 03 y 15) y la 7 todas, porque ninguna lleva `data-answer`. La 09 se mide sin axe, como hizo el mapa 05, porque la pantalla se mueve (decisión 7-b). Las ocho de `edit` «ninguna» guardan cada acción al momento y no tienen `ActionBar`; si la sección que rediseña una pantalla le da una, añade su `edit` en el mismo PR.

```ts
// apps/web/e2e/pantallas.ts
import type { Page } from '@playwright/test'
export type CuentaDePrueba = 'jugador' | 'manager' | 'visitante' | 'nuevo'
/** cuentas.json del mundo, más los dos ids que la prueba resuelve al empezar. */
export interface MundoDePrueba {
  readonly day: number
  readonly password: string
  readonly accounts: Readonly<Record<CuentaDePrueba, { readonly email: string | null }>>
  readonly firstWorldTourTeamId: string // de GET /api/teams
  readonly topRankedRiderId: string // de GET /api/rankings
}
export interface TelefonoPantalla {
  readonly id: string // el de la captura: '01-me-training'
  readonly path: string | ((world: MundoDePrueba) => string)
  readonly account: CuentaDePrueba
  readonly answer: string // el `data-ui` del elemento con `data-answer`
  readonly tool: boolean // corre la comprobación 9
  readonly edit?: (page: Page) => Promise<void> // deja cambios sin guardar; sin ella, la 8 no corre
  readonly intercept?: { readonly url: string; readonly respond: 'hang' | 500 } // los estados 40 a 42
  readonly waitMs?: number // espera antes de medir: la 09, 8.000 tras `Play`; la 40, 3.000
}
```

### 7.4 Dónde corre y el trinquete

I-04; D-18. Un trabajo nuevo, `Teléfono`, en `.github/workflows/ci.yml`, con el mismo patrón que el de los bancos (l. 215-230): un paso «¿Toca la web, la API o `packages/db`?» compara con `git diff --name-only` contra la base y sigue si alguna ruta empieza por `apps/web/`, `apps/api/` o `packages/db/`, en cada PR y en cada push a `main`. Restaura Chromium y el mundo de la caché, corre `pnpm build`, levanta `serve.mjs` y lanza `playwright test --project=telefono` desde `apps/web/playwright.config.ts`, con dos proyectos: `telefono` (los dos anchos) y `nocturno` (§7.5). Primero `/_ui`, que no necesita el mundo, y después las 45.

**El trinquete**: `apps/web/e2e/telefono-baseline.json` guarda, por pantalla y ancho, las faltas de cada comprobación en el orden de §7.1. El PR del paso 2 lo escribe con las medidas de hoy y no cambia la web; desde ahí el CI falla si una cifra sube, y también si baja sin que el PR la apunte, como `deuda.json` (§5.2). Cada paso del plan baja las suyas. **E3 está terminado cuando el fichero está a cero** (o `null` donde no corre); el paso 24 lo borra y la prueba exige cero. La forma, con cifras de ejemplo:

```json
{
  "pantallas": {
    "_ui": { "360": [0, 0, 0, 0, 0, 0, 0, 0, null], "320": [0, 0, 0, 0, 0, 0, null, 0, null] },
    "01-me-training": {
      "360": [0, 1, 0, 0, 47, 53, 1, 1, 1],
      "320": [0, 1, 0, 0, 47, 53, null, 1, 1]
    }
  }
}
```

Son ilustrativas: el paso 2 escribe las de verdad. El coste son de 5 a 7 minutos más por PR que toca la web, la API o `packages/db` y unos 150 MB de Chromium en la caché (estimado por telefono): es DD-16, por defecto sí; sin la prueba, la aceptación del teléfono deja de ser automática y vuelve a ser a mano.

### 7.5 El rendimiento, cada noche

D-50. `apps/web/e2e/nocturno.spec.ts`, en un trabajo nuevo de `.github/workflows/cobertura.yml`, que ya corre cada noche (l. 23-26, `15 4 * * *`). Chromium con la red y la CPU de DevTools por CDP (Slow 4G: 562,5 ms y 1,44 Mbit/s; CPU ×4), a 360 × 800 con relación 2, la mediana de cinco cargas, en frío (sin caché ni service worker) y en caliente, sobre las cuatro páginas del mapa 05 §12: la portada del jugador, la del visitante, el plan y `Watch`. «Lista» es cuando el `[data-answer]` está en `data-state="ready"` y nada de `main` sigue en `loading`.

Los umbrales: primera pintura en frío de 3,0 s o menos (hoy de 3,13 a 3,28, mapa 05 §12, mediana de tres; con el sprite de banderas, 2,93, telefono §8.3); lista en frío de 5,0 s o menos (hoy de 4,75 a 5,70); lista en caliente de 2,0 s o menos, o 3,0 en el plan (hoy 1,4, 2,8 y 1,7, telefono §5.3). El peso no espera a la noche: lo mide `peso.test.mjs` en el trabajo `Build` de cada PR (§12.7), con `CSS_BLOCKING_MAX_GZ` = 15 KB (hoy 94,3), `ENTRY_JS_MAX_GZ` = 160 KB (hoy unos 157), `PRECACHE_MAX_GZ` = 250 KB y `FLAG_SPRITE_MAX` = 60 KB. Un umbral roto pone en rojo la noche y no para ningún PR. La misma noche corren las dos pasadas de §7.8.

### 7.6 Las dependencias

O-11; X-09. Ni Playwright ni axe-core están hoy en ningún `package.json`: los guiones del mapa 05 los usaron instalados aparte (`capturas/README.md` l. 62-71). Entran en el paso 2 como `devDependencies` de versión exacta de `apps/web/package.json`: `@playwright/test` `1.56.1` y `axe-core` `4.10.3`. axe se inyecta con `page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })` y se llama con `axe.run`, como `capturas/medir.mjs`, sin `@axe-core/playwright`. Chromium es el 141 (la compilación 1194 de Playwright 1.56.1): en el CI se instala con `playwright install --with-deps chromium` si falta en la caché de `~/.cache/ms-playwright`, con la clave `playwright-1.56.1`; en el contenedor de diseño no se instala nunca (`/opt/pw-browsers`, `00-encargo.md` §4).

### 7.7 La prueba del dueño en su teléfono

D-19; H-19. Es la decisión 6 de E2 (`docs/diseno/e2-retransmision/implementacion.md` l. 17) y la puerta del paso de cierre (24); no bloquea los demás (DD-20, por defecto sí). El dueño hace estas tareas a una mano, en su teléfono y con la web instalada desde la novena, y apunta en el PR del paso 24 para cada una `sale a la primera`, `sale con ayuda` o `no sale`, con el modelo y la versión del sistema. Un `no sale` abre un arreglo antes de cerrar E3.

| #   | Tarea                                | Empieza en                      | Sale a la primera si…                                                                               |
| --- | ------------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | entrar                               | `/login`                        | entra sin ampliar la página ni fallar un toque                                                      |
| 2   | ver cómo llega a su próxima carrera  | la portada                      | lo lee en la primera pantalla de `/me/training`, sin bajar                                          |
| 3   | cambiar un bloque                    | `/me/training`                  | cambia el bloque de una semana, lee la consecuencia y guarda con la `ActionBar` sin buscar el botón |
| 4   | poner órdenes                        | `/me/orders`                    | pone el papel de una etapa y guarda                                                                 |
| 5   | inscribirse                          | `/me/races?tab=enter`           | encuentra con `Affordable` una carrera que puede pagar y se inscribe                                |
| 6   | ver una etapa                        | `Watch`                         | la sigue con el pulgar (pausa, velocidad, saltos) y nada le tapa el comentario                      |
| 7   | abrir la general y una ficha         | una carrera                     | encuentra su fila y abre la ficha de otro corredor                                                  |
| 8   | cambiar el maillot                   | `/team/identity`                | cambia figura y colores, entiende el porqué de un color tachado y guarda                            |
| 9   | instalar                             | Safari o Chrome                 | añade la web a la pantalla de inicio siguiendo `InstallHint` y la abre sin barra del navegador      |
| 10  | abrir sin red                        | la web instalada, en modo avión | ve su cabecera y lo que ya había visto, con `OfflineBanner`, y nunca `Log in`                       |
| 11  | con VoiceOver o TalkBack, si los usa | `/me/training` y `Watch`        | oye su llegada (`Scale5`) y los rótulos de la etapa (H-19); si no los usa, la tarea no se hace      |

### 7.8 Lo que la prueba no ve

D-19. Nada de esto bloquea un PR, porque pide un aparato o una letra que el CI no tiene, y un trinquete que dependiera de la letra del ejecutor sería inestable:

- **WebKit y un teléfono de verdad** (H-13): Safari, que es el motor de todo navegador de iPhone; las barras fijas con `100dvh`, `env(safe-area-inset-*)` y `viewport-fit=cover`; la letra de verdad, San Francisco y Roboto (el CI mide con la letra del sistema de su contenedor, y el plan B de §6.3 depende de ella). Los cubre la prueba del dueño (§7.7) y quedan como riesgo en §18.
- **La letra al doble** (H-17; WCAG 1.4.4 y la escala de letra de Android): una pasada nocturna a 360 × 800 con la letra raíz al 200 % (`document.documentElement.style.fontSize = '200%'`), con las comprobaciones 1 y 2, que informa. Los altos de §3.5 son mínimos, no fijos, para que no recorten.
- **De lado** (H-16): una pasada nocturna a 800 × 360 con la comprobación 1, que informa; el manifiesto no fija `orientation` (§6.5).
- **El lector de pantalla en un teléfono** (H-19): los `role="img"` de la escala y del maillot y los `aria-live` de `Watch` solo se comprueban en el marcado; los oye la undécima tarea del dueño, si usa uno, y si no queda como riesgo en §18.

---

**Injertos aplicados.** I-04 (§7.4: la prueba también sobre `/_ui` en cada PR; §7.5: el rendimiento cada noche; las 45 pantallas siguen en cada PR, contra el mundo guardado en la caché).

**Objeciones resueltas.** O-11 (§7.6: Playwright y axe-core como dependencias fijadas, y Chromium en la caché del CI). O-26 (§7.2: el mundo de la prueba definido y su paso previo, el 2). O-27 (§7.3: las 45 pantallas con su ruta, su cuenta, su `data-answer` y si son de herramienta).

**Huecos rellenados.** H-13 (§7.7 y §7.8: un teléfono de verdad lo cubre la prueba del dueño, puerta del cierre). H-15 (§7.2: el mundo reproducible, con su caché y su clave). H-16 (§7.8: la pasada de lado; las barras con el teclado, §6.5). H-17 (§7.8: la letra al doble). H-19 (§7.7: la undécima tarea, con lector de pantalla).

**Contradicciones de hecho.** X-09 (§7.6: Playwright y axe-core no son dependencias hoy). X-23 (§7.2: «génesis y tres días» no da las pantallas medidas).

**Decisiones de esta sección.**

- **7-a**, `build.mjs` comprueba cada respuesta y el estado final del mundo (219 equipos, la toma del equipo en 200) antes de volcarlo, para que un mundo a medias no llegue a la caché y fije una línea base falsa.
- **7-b**, la 09 se mide sin axe y con las demás comprobaciones, como el mapa 05, porque la pantalla se mueve.
- **7-c**, la comprobación 7 exige también que el `data-ui` del elemento marcado sea el de §7.3, para que `data-answer` no se ponga en cualquier cosa que quepa en 520 px.
- **7-d**, la 7 corre solo a 360 × 800; la 8, solo en las pantallas con `edit`; la 9, solo en las de herramienta; donde no corren, la línea base guarda `null`.
- **7-e**, axe se inyecta como hace `capturas/medir.mjs`, sin `@axe-core/playwright`: una dependencia menos y el mismo instrumento que dio las cifras de hoy.
- **7-f**, la prueba del dueño se apunta en el PR del paso 24 con tres respuestas por tarea y el modelo del teléfono.

**Propuesto para el glosario.**

- `CuentaDePrueba`, `MundoDePrueba` y `TelefonoPantalla`: los tipos de `apps/web/e2e/pantallas.ts`.
- `apps/web/e2e/world/serve.mjs`: el servidor de la prueba, port de `capturas/servir.mjs`.
- `apps/web/playwright.config.ts`, con los proyectos `telefono` y `nocturno`.
- `Teléfono`: el trabajo del CI en `.github/workflows/ci.yml`; y su paso «¿Toca la web, la API o `packages/db`?».

**Dudas para el ensamblador.**

- D-50 llama `rendimiento.spec.ts` a la prueba de cada noche y §G.10 la llama `nocturno.spec.ts`; esta sección usa el nombre del glosario.
