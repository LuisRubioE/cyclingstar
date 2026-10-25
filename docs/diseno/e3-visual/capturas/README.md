# E3 · Las pantallas de hoy, capturadas y medidas

Capturas de Cycling Star tal como está en `58c14da`, hechas el 20 de octubre de 2026 para el mapa 05
(`../mapas/05-pantallas.md`, que las describe y las comenta). Cada pantalla va dos veces: a 360 × 800
con relación de píxeles 2, `isMobile` y táctil (`NN-ruta-360.png`, 720 px de ancho de imagen) y a
1.280 × 800 con relación 1 (`NN-ruta-1280.png`). Todas de página entera. Las medidas de cada una están
en `medidas.json` y resumidas abajo; la primera pintura simulada y lo que pasa sin red, en
`pintura.json`.

## Cómo se hicieron

1. **El mundo** (`mundo.mjs`, 15 minutos en esta máquina). PGlite con todas las migraciones, la
   génesis de producción (`seedWorld` con `GENESIS_WORLD_SEED`, por `runTick` con `forceDays: 0`) y
   50 días de calendario corridos por `runTick` con la grabación de líneas encendida, 17 s por día. Al
   acabar: 3.902 corredores, 219 equipos, 107 etapas corridas, las 107 con su línea de `Watch`, y 355
   noticias. El día 50 de la temporada 1 hay carreras terminadas (Race Valencia, días 35 a 39) y en
   curso (Race Emirates, 4 de 7 etapas).
2. **Las cuentas**, todas por la API de verdad (better-auth y las rutas del juego):
   - **visitante**: sin sesión.
   - **jugador** (`jugador@example.com`): José Quintáns, escalador español de 18 años, agente libre,
     inscrito el día 0 a Race Murcia (días 44 y 45) y Race Jaén (47), en casa, y a Race Var (52, en
     Francia) y Race Sardegna (56 a 60, cinco etapas, en Italia), fuera. Las cuatro le convocan: tiene
     viaje de ida y vuelta en los días 51, 53, 55 y 61. Plan de bloques guardado el día 50, en modo
     `Mixed`: `Build`, `Specific`, `Taper`, `Recovery`.
   - **mánager** (`manager@example.com`): Nathan Van Acker, belga, en Noord Cycling (WorldTour,
     Bélgica) desde el día 0; premium y dueño del equipo desde el día 50 (`/api/teams/take-over`).
   - **nuevo** (`nuevo@example.com`): cuenta sin corredor.
3. **Lo que se tocó con SQL**, porque el camino del juego no lo permite en un mundo recién creado: el
   correo confirmado de las cuentas (como `apps/api/src/adminPanel.test.ts`); 400 de dinero al jugador
   (nace con 0 y un agente libre no puede pagarse un viaje fuera de su país); el contrato del corredor
   del mánager (el mercado no da ofertas por debajo de `MIN_RATING_FOR_OFFERS`, 0,42,
   `packages/db/src/contracts.ts` l. 75); `premium` del mánager; y, al servir, el ancla del reloj
   (`worlds.created_at`) para que la cuenta atrás no salga vencida.
4. **El servidor** (`servir.mjs`): `buildApp` con better-auth, la web compilada (`apps/web/dist`) y los
   dos interruptores de E2 en `on`, como en producción (`BROADCAST_WATCH` y `SPOILER_MODE`). No corre
   el tick.
5. **Las capturas** (`capturas.mjs`, con `medir.mjs`): Playwright 1.56.1 con el Chromium de
   `/opt/pw-browsers`, un contexto nuevo por captura, axe-core 4.10.3 inyectado (reglas de WCAG 2.0 a
   2.2, A y AA). Cada contexto lleva su propia IP en `x-forwarded-for`, porque el límite global de la
   API es de 300 peticiones por minuto e IP (`apps/api/src/security.ts` l. 10).
6. **La primera pintura y sin red** (`pintura.mjs`): CPU a ×4 y red de los perfiles de DevTools
   (`Slow 4G` y `Fast 4G`) por CDP. Es una simulación en Chromium sin cabeza, no un teléfono.
7. **La reducción** (`optimizar.py`): paleta de 256 colores por cobertura máxima, sin tramado (ningún
   píxel se desvía más de 28 de 255 en un canal), y las páginas más altas recortadas a 6.400 px de
   imagen en el teléfono (3.200 px de página) y a 3.600 en escritorio. Las dos del plan de entrenamiento
   van enteras. El alto real de cada página es la columna «Alto a 360» de la tabla de medidas.

## Al mirarlas

- **La barra inferior fija del teléfono** sale pintada en la franja de 743 a 800 px de página de la
  primera pantalla (de 1.486 a 1.600 px de imagen), tapando lo que haya debajo: es lo que ve quien abre
  la página. Al final de cada página del teléfono queda el hueco de 56 px que la web reserva para ella.
- **El velo de E2 está encendido**: el jugador y el mánager no han visto ninguna etapa, así que sus
  pantallas avisan `Results from N stages you haven't watched are hidden` y dan los puntos a 0. El
  visitante lo ve todo.
- **Recortadas** (por abajo): 03, 10, 11, 15, 19, 20, 21, 22 y 23 a 360 px, y 03, 10, 11, 15, 20, 21 y 23
  a 1.280 px.
- **49** (recargar sin red) sale en blanco: es la página de error de red del Chromium sin cabeza.

## Cómo regenerarlas

Desde un clon compilado de `58c14da` (`pnpm install --frozen-lockfile && pnpm build`) en el scratchpad,
con `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` y `axe-core` instalado aparte
(`npm install axe-core@4.10.3` en otra carpeta del scratchpad, `<axe>`). `<c>` es esta carpeta; los
scripts solo leen el clon que se les pasa con `--root` y escriben donde se les dice:

```sh
node <c>/mundo.mjs --root <clon> --out <mundo> --day 50          # unos 15 minutos
node <c>/servir.mjs --root <clon> --world <mundo>/mundo-50.tar.gz --port 3005 &
node <c>/capturas.mjs --base http://localhost:3005 --cuentas <mundo>/cuentas.json \
  --out <crudas> --axe <axe>/node_modules/axe-core/axe.min.js
node <c>/pintura.mjs --base http://localhost:3005 --cuentas <mundo>/cuentas.json --out <crudas>
python3 <c>/optimizar.py <crudas> <c>
python3 <c>/resumen.py <crudas>/medidas.json                       # la tabla de las medidas
python3 <c>/resumen.py --pintura <crudas>/pintura.json             # la de la primera pintura
```

Las IDs de equipos y corredores las sortea la génesis: otro mundo da otras (las de 12 y 13 salen de
`/api/teams` y `/api/rankings` al capturar). `--solo <regex>` repite solo unas pantallas.

## El índice

| Captura                          | Qué enseña                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `01-me-training`                 | El plan del jugador: la escalera de bloques, la lista `Day N · You'll arrive:` y el editor de 28 días desplegado |
| `02-me-races`                    | `On your programme`, las dos carreras convocadas (Var y Sardegna)                                                |
| `03-me-races-enter`              | La pestaña de inscripción del agente libre, 193 carreras con su viaje                                            |
| `04-me-profile`                  | La ficha propia del corredor                                                                                     |
| `05-race-vuelta`                 | Race Valencia terminada, la general (`Classifications`, `General`)                                               |
| `06-race-vuelta-teams`           | La misma, la clasificación por equipos                                                                           |
| `07-race-en-curso`               | Race Emirates en curso, 4 de 7 etapas                                                                            |
| `08-stage-watch`                 | La etapa 3 de Race Valencia en `Watch`, la previa                                                                |
| `09-stage-watch-jugando`         | La misma, 8 s después de `Play` (sin axe: la pantalla se mueve)                                                  |
| `10-stage-report`                | El acta pública de esa etapa (`/report`)                                                                         |
| `11-world-rankings`              | Los premios de la temporada y el ranking de 100                                                                  |
| `12-world-team`                  | La ficha pública de Al Faris Velo, el primer equipo WorldTour de `/api/teams`                                    |
| `13-world-rider`                 | La ficha pública de Oleksandr Prykhodko, primero del ranking                                                     |
| `14-team-squad`                  | La plantilla de Noord Cycling vista por su mánager                                                               |
| `15-team-calendar`               | El calendario del equipo, con su tabla de 85 carreras                                                            |
| `16-team-identity`               | La identidad del equipo: nombre, país y las 12 semillas del maillot                                              |
| `17-home-jugador`                | La portada del jugador                                                                                           |
| `18-home-visitante`              | La portada del visitante                                                                                         |
| `19-news`                        | Las noticias                                                                                                     |
| `20-world-races`                 | El índice de carreras de la temporada                                                                            |
| `21-world-teams`                 | Los 219 equipos                                                                                                  |
| `22-world-nations`               | Los países                                                                                                       |
| `23-world-nation`                | España y su ranking nacional                                                                                     |
| `24-hall-of-fame`                | El salón de la fama                                                                                              |
| `25-me-orders`                   | Las órdenes de carrera del jugador (Race Var)                                                                    |
| `26-me-contract`                 | El mercado, sin ofertas                                                                                          |
| `27-me-finances`                 | Las finanzas del jugador, con los dos viajes cobrados                                                            |
| `28-account`                     | La cuenta y la protección de resultados                                                                          |
| `29-me-training-manager`         | El plan del corredor del mánager, con el panel del plan de equipo                                                |
| `30-home-manager`                | La portada del mánager                                                                                           |
| `31-login`, `32-register`        | Entrar y crear la cuenta                                                                                         |
| `33-how-to-play`                 | Cómo se juega                                                                                                    |
| `34-create`                      | Crear el corredor (cuenta nueva)                                                                                 |
| `35-race-un-dia`                 | Race Jaén, carrera de un día terminada, en `Watch`                                                               |
| `36-stage-classifications`       | La etapa 3 de Race Valencia, pestaña `Classifications`                                                           |
| `37-me-races-results`            | Los resultados del jugador, velados                                                                              |
| `40-cargando`                    | `/me/training` con `/api/riders/me/orders` sin respuesta (captura a los 3 s)                                     |
| `41-error`                       | `/me/training` con `/api/riders/me/orders` en 500                                                                |
| `42-error-todo`                  | `/world/rankings` con toda la API en 500                                                                         |
| `43-vacio-team-squad`            | `/team/squad` de un agente libre                                                                                 |
| `44-vacio-home-sin-corredor`     | La portada de una cuenta sin corredor                                                                            |
| `45-vacio-training-sin-corredor` | `/me/training` de una cuenta sin corredor                                                                        |
| `46-no-encontrada`               | Una ruta que no existe                                                                                           |
| `47-corredor-inexistente`        | La ficha de un corredor que no existe                                                                            |
| `48-sin-red-navegar`             | Sin red, un enlace a una página cuyo JavaScript no se había cargado                                              |
| `49-sin-red-recargar`            | Sin red, recargar                                                                                                |
| `50-sin-red-visitada`            | Sin red, volver a una página ya visitada (solo la pantalla)                                                      |
| `51-sin-red-sin-datos`           | Sin red, una página de JavaScript cargado y datos sin pedir (solo la pantalla)                                   |

No se han capturado `/privacy`, `/forgot-password`, `/reset-password` y `/verify-email` (formularios
o texto del mismo molde que 31 y 32), ni `/admin` y `/admin/names` (solo para administradores).

## Las medidas

Medidas en el navegador, a 360 px salvo la última columna: el alto de la página en px de página, el
ancho del documento contra el de la ventana, la letra más pequeña que se pinta (en toda la página y
solo en `main`, sin cabecera, barra ni pie), los caracteres de `main` por debajo de 12 px, los
objetivos táctiles de `main` (enlaces, botones, campos y pestañas) por debajo de 44 px en alguna de sus
dos medidas y la altura del más bajo, las tablas más anchas que su caja, y los nodos que axe-core da
por contraste insuficiente a 360 y a 1.280 px. En `medidas.json`, además, el elemento que desborda, los
contenedores con desplazamiento propio, las tablas, los cinco objetivos más pequeños, las parejas de
colores que fallan con su razón y los demás fallos de axe por regla.

| Captura                          | Ruta                                                       | Cuenta    | Alto a 360 | Ancho a 360 | Letra mín. (página · main) | Caracteres < 12 px en main | Objetivos < 44 px en main | Objetivo más bajo | Tablas más anchas que su caja a 360 | Contraste (360 · 1.280) |
| -------------------------------- | ---------------------------------------------------------- | --------- | ---------- | ----------- | -------------------------- | -------------------------- | ------------------------- | ----------------- | ----------------------------------- | ----------------------- |
| `01-me-training`                 | `/me/training`                                             | jugador   | 6807       | 360 / 360   | 11 · 12                    | 0 de 3185                  | 47 de 48                  | 20                | ninguna                             | 49 · 49                 |
| `02-me-races`                    | `/me/races`                                                | jugador   | 800        | 360 / 360   | 11 · 11                    | 14 de 182                  | 7 de 7                    | 17                | ninguna                             | 15 · 15                 |
| `03-me-races-enter`              | `/me/races?tab=enter`                                      | jugador   | 19914      | 360 / 360   | 11 · 11                    | 386 de 10881               | 386 de 387                | 17                | ninguna                             | 773 · 773               |
| `04-me-profile`                  | `/me/profile`                                              | jugador   | 2971       | 360 / 360   | 10 · 10                    | 6 de 1894                  | 16 de 16                  | 16                | ninguna                             | 20 · 20                 |
| `05-race-vuelta`                 | `/world/races/race-valencia`                               | visitante | 1677       | 360 / 360   | 11 · 12                    | 0 de 1056                  | 31 de 31                  | 15                | ninguna                             | 45 · 46                 |
| `06-race-vuelta-teams`           | `/world/races/race-valencia?tab=classifications&cls=teams` | visitante | 1361       | 360 / 360   | 11 · 12                    | 0 de 898                   | 30 de 30                  | 15                | ninguna                             | 25 · 26                 |
| `07-race-en-curso`               | `/world/races/race-emirates`                               | visitante | 1677       | 360 / 360   | 11 · 12                    | 0 de 1018                  | 30 de 30                  | 15                | ninguna                             | 43 · 43                 |
| `08-stage-watch`                 | `/world/races/race-valencia/stages/3`                      | visitante | 1226       | 360 / 360   | 8 · 8                      | 3 de 389                   | 15 de 16                  | 16                | ninguna                             | 13 · 14                 |
| `09-stage-watch-jugando`         | `/world/races/race-valencia/stages/3`                      | visitante | 1111       | 360 / 360   | 8 · 8                      | 4 de 397                   | 14 de 15                  | 16                | ninguna                             | sin axe · sin axe       |
| `10-stage-report`                | `/world/races/race-valencia/stages/3/report`               | visitante | 11502      | 360 / 360   | 11 · 12                    | 0 de 13556                 | 194 de 194                | 16                | ninguna                             | 130 · 130               |
| `11-world-rankings`              | `/world/rankings`                                          | visitante | 4724       | 360 / 360   | 11 · 11                    | 86 de 3517                 | 195 de 197                | 15                | ninguna                             | 197 · 197               |
| `12-world-team`                  | `/world/teams/aea0a913-e374-4a78-bbac-8939a8da3d9a`        | visitante | 2927       | 360 / 360   | 11 · 12                    | 0 de 1973                  | 29 de 29                  | 15                | ninguna                             | 48 · 48                 |
| `13-world-rider`                 | `/world/riders/4bd8094c-0099-4d57-9c6f-abc8fef2db2f`       | visitante | 2136       | 360 / 360   | 11 · 12                    | 0 de 1504                  | 34 de 34                  | 16                | ninguna                             | 26 · 26                 |
| `14-team-squad`                  | `/team/squad`                                              | manager   | 2017       | 360 / 360   | 10 · 10                    | 3 de 888                   | 60 de 60                  | 16                | ninguna                             | 5 · 5                   |
| `15-team-calendar`               | `/team/calendar`                                           | manager   | 6887       | 360 / 360   | 10 · 10                    | 439 de 5676                | 170 de 170                | 17                | 5 col., 460 en 336                  | 284 · 371               |
| `16-team-identity`               | `/team/identity`                                           | manager   | 1948       | 360 / 360   | 11 · 12                    | 0 de 657                   | 6 de 18                   | 36                | ninguna                             | 12 · 12                 |
| `17-home-jugador`                | `/`                                                        | jugador   | 1372       | 360 / 360   | 11 · 12                    | 0 de 590                   | 11 de 11                  | 15                | ninguna                             | 16 · 16                 |
| `18-home-visitante`              | `/`                                                        | visitante | 907        | 360 / 360   | 11 · 14                    | 0 de 275                   | 0 de 2                    | 46                | ninguna                             | 6 · 6                   |
| `19-news`                        | `/news`                                                    | visitante | 3920       | 360 / 360   | 11 · 11                    | 246 de 2625                | 27 de 44                  | 33                | ninguna                             | 51 · 51                 |
| `20-world-races`                 | `/world/races`                                             | visitante | 13820      | 360 / 360   | 11 · 12                    | 0 de 5893                  | 11 de 300                 | 32                | ninguna                             | 314 · 1020              |
| `21-world-teams`                 | `/world/teams`                                             | visitante | 17025      | 360 / 360   | 11 · 12                    | 0 de 6906                  | 0 de 219                  | 66                | ninguna                             | 225 · 225               |
| `22-world-nations`               | `/world/nations`                                           | visitante | 8173       | 360 / 360   | 11 · 12                    | 0 de 3043                  | 0 de 133                  | 46                | ninguna                             | 139 · 139               |
| `23-world-nation`                | `/world/nations/ES`                                        | visitante | 7628       | 360 / 360   | 11 · 12                    | 0 de 4493                  | 185 de 205                | 17                | 5 col., 429 en 336                  | 118 · 119               |
| `24-hall-of-fame`                | `/world/hall-of-fame`                                      | visitante | 2401       | 360 / 360   | 11 · 11                    | 63 de 1143                 | 46 de 46                  | 17                | 7 col., 520 en 336                  | 46 · 50                 |
| `25-me-orders`                   | `/me/orders`                                               | jugador   | 1636       | 360 / 360   | 10 · 10                    | 11 de 1079                 | 31 de 31                  | 13                | ninguna                             | 14 · 14                 |
| `26-me-contract`                 | `/me/contract`                                             | jugador   | 800        | 360 / 360   | 11 · 12                    | 0 de 422                   | 0 de 0                    | no hay            | ninguna                             | 8 · 8                   |
| `27-me-finances`                 | `/me/finances`                                             | jugador   | 1002       | 360 / 360   | 11 · 14                    | 0 de 366                   | 1 de 1                    | 20                | ninguna                             | 7 · 7                   |
| `28-account`                     | `/account`                                                 | jugador   | 1712       | 360 / 360   | 11 · 12                    | 0 de 904                   | 12 de 12                  | 13                | ninguna                             | 7 · 7                   |
| `29-me-training-manager`         | `/me/training`                                             | manager   | 1883       | 360 / 360   | 11 · 12                    | 0 de 1060                  | 12 de 13                  | 20                | ninguna                             | 13 · 13                 |
| `30-home-manager`                | `/`                                                        | manager   | 1678       | 360 / 360   | 11 · 12                    | 0 de 863                   | 24 de 24                  | 15                | ninguna                             | 19 · 19                 |
| `31-login`                       | `/login`                                                   | visitante | 800        | 360 / 360   | 11 · 14                    | 0 de 81                    | 4 de 5                    | 17                | ninguna                             | 6 · 6                   |
| `32-register`                    | `/register`                                                | visitante | 800        | 360 / 360   | 11 · 12                    | 0 de 124                   | 3 de 4                    | 17                | ninguna                             | 7 · 7                   |
| `33-how-to-play`                 | `/how-to-play`                                             | visitante | 1322       | 360 / 360   | 11 · 14                    | 0 de 1144                  | 2 de 2                    | 38                | ninguna                             | 6 · 6                   |
| `34-create`                      | `/create`                                                  | nuevo     | 947        | 360 / 360   | 11 · 12                    | 0 de 240                   | 6 de 7                    | 38                | ninguna                             | 8 · 8                   |
| `35-race-un-dia`                 | `/world/races/race-jaen`                                   | visitante | 1340       | 360 / 360   | 8 · 8                      | 5 de 466                   | 14 de 15                  | 15                | ninguna                             | 15 · 16                 |
| `36-stage-classifications`       | `/world/races/race-valencia/stages/3?tab=classifications`  | visitante | 1579       | 360 / 360   | 11 · 12                    | 0 de 1019                  | 35 de 35                  | 16                | ninguna                             | 45 · 46                 |
| `37-me-races-results`            | `/me/races?tab=results`                                    | jugador   | 800        | 360 / 360   | 11 · 12                    | 0 de 248                   | 5 de 5                    | 17                | ninguna                             | 12 · 12                 |
| `40-cargando`                    | `/me/training`                                             | jugador   | 800        | 360 / 360   | 11 · 16                    | 0 de 8                     | 0 de 0                    | no hay            | ninguna                             | 5 · 5                   |
| `41-error`                       | `/me/training`                                             | jugador   | 800        | 360 / 360   | 11 · 16                    | 0 de 34                    | 0 de 0                    | no hay            | ninguna                             | 5 · 5                   |
| `42-error-todo`                  | `/world/rankings`                                          | visitante | 800        | 360 / 360   | 11 · 16                    | 0 de 28                    | 0 de 0                    | no hay            | ninguna                             | 6 · 6                   |
| `43-vacio-team-squad`            | `/team/squad`                                              | jugador   | 800        | 360 / 360   | 11 · 14                    | 0 de 119                   | 1 de 1                    | 17                | ninguna                             | 4 · 4                   |
| `44-vacio-home-sin-corredor`     | `/`                                                        | nuevo     | 900        | 360 / 360   | 11 · 12                    | 0 de 342                   | 0 de 2                    | 46                | ninguna                             | 5 · 5                   |
| `45-vacio-training-sin-corredor` | `/me/training`                                             | nuevo     | 1554       | 360 / 360   | 11 · 12                    | 0 de 702                   | 11 de 12                  | 20                | ninguna                             | 12 · 12                 |
| `46-no-encontrada`               | `/ruta-que-no-existe`                                      | visitante | 800        | 360 / 360   | 11 · 14                    | 0 de 113                   | 2 de 2                    | 36                | ninguna                             | 6 · 6                   |
| `47-corredor-inexistente`        | `/world/riders/00000000-0000-4000-8000-000000000000`       | visitante | 800        | 360 / 360   | 11 · 16                    | 0 de 25                    | 0 de 0                    | no hay            | ninguna                             | 6 · 6                   |

En 15 la tabla no se desplaza: la recorta su panel (`overflow-hidden`), la columna `Travel` sale cortada
y la de `Plan`, con el botón `Add` o `Drop`, no se ve en el teléfono. En 23 y 24 sí se desplaza
(`overflow-x-auto`).

## La primera pintura simulada

360 × 800, relación 2, caché vacía, CPU a ×4; `Slow 4G` es 562,5 ms de latencia y 1,44 Mbit/s de
bajada, `Fast 4G` 165 ms y 8,1 Mbit/s. Mediana de tres cargas. «Lista» es cuando `main` deja de decir
`Loading…`. La mayor pintura (LCP) sale igual que la primera en las ocho: el elemento mayor es el texto
del pie, que se pinta con la primera.

| Página                                                           | Perfil  | Primera pintura | Lista  | Peticiones | Por la red | JS · CSS · API              |
| ---------------------------------------------------------------- | ------- | --------------- | ------ | ---------- | ---------- | --------------------------- |
| portada del jugador (`/`)                                        | Slow 4G | 3,23 s          | 5,70 s | 37         | 346 KB     | 190 · 92 · 62               |
| portada del jugador (`/`)                                        | Fast 4G | 1,20 s          | 2,01 s | 37         | 346 KB     | 190 · 92 · 62               |
| portada del visitante (`/`)                                      | Slow 4G | 3,13 s          | 4,88 s | 26         | 286 KB     | 190 · 92 · 2                |
| portada del visitante (`/`)                                      | Fast 4G | 1,17 s          | 1,70 s | 26         | 286 KB     | 190 · 92 · 2                |
| plan de entrenamiento (`/me/training`)                           | Slow 4G | 3,28 s          | 5,22 s | 25         | 283 KB     | 176 · 92 · 13               |
| plan de entrenamiento (`/me/training`)                           | Fast 4G | 1,26 s          | 2,10 s | 25         | 283 KB     | 176 · 92 · 13               |
| etapa (Watch, visitante) (`/world/races/race-valencia/stages/3`) | Slow 4G | 3,28 s          | 4,75 s | 34         | 369 KB     | 242 · 92 · 17 (y 16 de SVG) |
| etapa (Watch, visitante) (`/world/races/race-valencia/stages/3`) | Fast 4G | 1,20 s          | 1,64 s | 34         | 369 KB     | 242 · 92 · 17 (y 16 de SVG) |

## Sin red

Con la sesión del jugador, `context.setOffline(true)` a mitad de uso, a 360 y a 1.280 px (lo mismo en
los dos):

| Caso                                                  | Lo que se ve                                                                                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (48) Enlace a `/news`, cuyo trozo no estaba cargado   | La barrera de error de toda la web, sin cabecera ni barra: `Something went wrong`, el error técnico `Failed to fetch dynamically imported module: …/assets/News-….js`, `Try again` y `Reload the page` |
| (50) Volver a `/me/profile`, visitada con red         | La ficha entera, de la caché, sin aviso de que no hay red                                                                                                                                              |
| (51) Ficha de otro corredor (trozo cargado, datos no) | `Loading…` sin fin (8 s observados)                                                                                                                                                                    |
| (49) Recargar                                         | `net::ERR_INTERNET_DISCONNECTED`, la página de error del navegador                                                                                                                                     |

## Ficheros

- `NN-ruta-360.png` y `NN-ruta-1280.png`: las 98 capturas reducidas.
- `medidas.json` (de `capturas.mjs`) y `pintura.json` (de `pintura.mjs`): las medidas enteras.
- `mundo.mjs`, `servir.mjs`, `capturas.mjs`, `medir.mjs`, `pintura.mjs`, `optimizar.py` y
  `resumen.py`: los scripts, que solo leen el clon que se les pasa con `--root` (o el servidor de
  `--base`) y no importan nada de este repositorio.
