## 12. La web instalable

La decisión está tomada (`docs/agenda.md` §4.15.1: web instalable y no app nativa) y esta sección la ejecuta: que el juego se pueda añadir a la pantalla de inicio y se comporte como una app, sin barra de navegador, con su icono, arrancando rápido y sin romperse cuando la red va mal; es además el requisito de la notificación de E4 en iPhone. Hoy no hay nada: `apps/web/public/` solo tiene `favicon.svg`, `index.html` (l. 1-19) no enlaza manifiesto ni declara `theme-color`, `main.tsx` no registra service worker y `vite.config.ts` (l. 1-20) no tiene plugin (mapa 05 §14). Sin red, una recarga da la página de error del navegador (mapa 05 §13). La agenda cuenta así lo que preguntó el dueño: «La pregunta era una app de Android y de Apple para acceder de forma más nativa» (`docs/agenda.md` l. 535; [DUEÑO 23]). Las líneas son las de `58c14da`; los ficheros nuevos son los de §G.9.

### 12.1 El manifiesto

`apps/web/public/manifest.webmanifest` (paso 3; D-45), que `@fastify/static` sirve como `application/manifest+json` (medido por telefono §8.1) y que la CSP de hoy permite, porque `manifest-src` y `worker-src` caen en `default-src 'self'` (`apps/api/src/app.ts` l. 172-186). Entero:

```json
{
  "id": "/",
  "name": "Cycling Star",
  "short_name": "Cycling Star",
  "description": "A cycling manager you play from your phone between race days.",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui"],
  "theme_color": "#123a5c",
  "background_color": "#eef2f6",
  "lang": "en",
  "dir": "ltr",
  "categories": ["games", "sports"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    {
      "src": "/icons/maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Training",
      "url": "/me/training?source=pwa-shortcut",
      "icons": [{ "src": "/icons/shortcut-training-96.png", "sizes": "96x96", "type": "image/png" }]
    },
    {
      "name": "Races",
      "url": "/world/races",
      "icons": [{ "src": "/icons/shortcut-races-96.png", "sizes": "96x96", "type": "image/png" }]
    }
  ]
}
```

| Campo                             | Por qué                                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `scope`                     | una sola app en todo el origen                                                                                                    |
| `start_url`                       | `?source=pwa` cuenta los arranques desde el icono en el sensor (§12.8); el enrutador lo ignora                                    |
| `name`, `short_name`              | `Cycling Star`, 12 caracteres: lo que cabe bajo un icono                                                                          |
| `description`                     | la ficha de instalación de Android (pantalla)                                                                                     |
| `display`, `display_override`     | sin barra del navegador; `minimal-ui` donde `standalone` no exista                                                                |
| `theme_color`, `background_color` | la barra de estado como la cabecera (`navy`) y la pantalla de arranque como la página (`canvas`)                                  |
| `icons`                           | los que pide Chrome, 192 y 512 (mapa 05 §14); el `maskable` lleva el dibujo en el 70 % central, dentro de la zona segura del 80 % |
| `shortcuts`                       | `Training` y `Races` (pantalla), lo que se abre entre dos días de juego, con su icono de 96                                       |
| `lang`, `dir`, `categories`       | la interfaz está en inglés (`Claude.md`); `games` y `sports` para las tiendas que los leen                                        |

### 12.2 Los iconos y las metas de `index.html`

**Los iconos** (D-45, I-23) son material generado (D-08): `apps/web/scripts/icons.mjs` pinta con el Chromium de Playwright el logotipo de `apps/web/src/components/Logo.tsx`, hoy en `#4f46e5` y `#f59e0b` de Tailwind v3 (l. 14-35; mapa 01 §6), recoloreado sobre `navy` `#123a5c`: la bici en blanco (11,76:1) y la estrella en `gold` `#e0a106` (5,19:1, calculado en `<scratchpad>/redactor-L2/contraste.py`). Escribe `icon-192.png`, `icon-512.png`, `maskable-512.png` (el dibujo en el 70 % central), `apple-touch-icon-180.png` (opaco, porque iOS rellena de negro la transparencia) y los dos de los atajos, con su huella en un test que falla si el logotipo cambia sin regenerar; el revisor los mira a 16, 48 y 180 px en el PR. `favicon.svg` se recolorea igual (hoy un cuadro `#4f46e5` con una rueda y una estrella `#f59e0b`). E3 recolorea y no redibuja: el logotipo no tiene dueño (mapa 04, contradicción 12). **Las metas**, en el `<head>` de `apps/web/index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#123a5c" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
<meta name="apple-mobile-web-app-title" content="Cycling Star" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

`viewport-fit=cover` hace que `env(safe-area-inset-*)` valga algo en WebKit, y sin él el hueco de la barra inferior (`BottomNav.tsx` l. 44; `App.tsx` l. 154) no sirve (sin comprobar en un aparato). La barra de estado va en `default` y no en `black-translucent` (O-02, X-10): con la translúcida, instalada en iPhone, la hora se pintaría sobre la cabecera hasta que `AppHeader` reserve `env(safe-area-inset-top)`, que lo hace en el paso 11 de todas formas (codigo C12).

### 12.3 El service worker

**Escrito a mano, sin Workbox** (D-46; I-11, O-13): `apps/web/sw/sw.js` (unas 120 líneas, estimado) con la decisión de cada petición en una función pura, **`decide(request)`**, en `apps/web/sw/decide.js`, que se prueba sola en `apps/web/sw/decide.test.ts`. Los dos ficheros declaran sus globales (`/* global self, caches, fetch */`) para que pasen `eslint .` (`.github/workflows/ci.yml` l. 252). La tabla de `decide`, en este orden (gana la primera fila que casa):

| Petición                                            | `SwDecision`    | Qué hace y por qué                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| otro método que `GET`, u otro origen                | `passthrough`   | sin `respondWith`: el navegador la hace como si no hubiera service worker                                                                                                                                                                                                                                 |
| `/api/*`, `/api/auth/*` y `/health`                 | `passthrough`   | **nunca se guarda ni se intercepta**: la API de E2 responde según lo que ha visto cada jugador (`spoiler.ts` l. 63-70), `index.html` precarga `/health` (l. 13) y el HTML de etapa precarga la API (`app.ts` l. 362-371); una caché que no distingue cuentas daría a la segunda el destripe de la primera |
| `/sw.js`                                            | `passthrough`   | el navegador la pide él; se sirve con `no-cache`                                                                                                                                                                                                                                                          |
| `/assets/*`                                         | `cache-first`   | llevan huella y la API ya los sirve un año inmutables (`app.ts` l. 125-144); un despliegue trae nombres nuevos                                                                                                                                                                                            |
| navegación (`request.mode === 'navigate'`)          | `network-first` | la red con `NAV_TIMEOUT_MS` = 3.000; si no contesta, la cáscara guardada (`/index.html`); nunca se guarda una navegación, porque el HTML de carrera y de etapa sale `private, no-store` con `Vary: Cookie` (l. 367-369)                                                                                   |
| `/manifest.webmanifest`, `/icons/*`, `/favicon.svg` | `cache-first`   | están en la precarga, y un service worker nuevo los renueva                                                                                                                                                                                                                                               |
| lo demás                                            | `passthrough`   | p. ej. `og-default.png`                                                                                                                                                                                                                                                                                   |

```js
// apps/web/sw/decide.js: pura, sin `self`; la llama el manejador `fetch` de sw.js
/** @typedef {'network-first' | 'cache-first' | 'passthrough'} SwDecision */
const PRECACHED = /^\/(manifest\.webmanifest|favicon\.svg|icons\/[\w-]+\.png)$/

/**
 * @param {{ method: string, url: string, mode: string }} request
 * @param {string} origin el de la web, `self.location.origin`
 * @returns {SwDecision}
 */
export function decide(request, origin) {
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== origin) return 'passthrough'
  const p = url.pathname
  if (p === '/health' || p === '/api' || p.startsWith('/api/')) return 'passthrough'
  if (p === '/sw.js') return 'passthrough'
  if (p.startsWith('/assets/')) return 'cache-first'
  if (request.mode === 'navigate') return 'network-first'
  return PRECACHED.test(p) ? 'cache-first' : 'passthrough'
}
```

`decide.test.ts` lleva un caso por fila de la tabla y cuatro bordes, los cuatro `passthrough`: `/api` a secas, `/health?x=1`, un `POST` a `/assets/x.js` y un `/assets/x.js` de otro origen. **La precarga**: `apps/web/vite-plugin-sw.ts` escribe `dist/sw.js` al cerrar el build con la lista que saca de `dist/.vite/manifest.json` (`vite.config.ts` l. 11): `index.html`, la entrada y su CSS, los trozos de los cinco destinos de la `BottomNav` (`/`, `/me/profile`, `/team/squad`, `/world/races` y `/news`, `apps/web/src/domain/nav.ts` l. 22-26) y el de `/me/training`, el del atajo (12-a), el manifiesto, los iconos y el sprite de banderas; unos 220 KB con gzip (estimado por sistema §8), con el tope `PRECACHE_MAX_GZ` = 250 KB de `peso.test.mjs`. El plugin inyecta también `NAV_TIMEOUT_MS` (de `apps/web/src/net.ts`) y la versión, la huella de la lista. **Con `Save-Data`** (`self.navigator.connection?.saveData`), solo la cáscara: `index.html`, la entrada y su CSS. Se descartó precargar todo el JS y la CSS, 80 ficheros y unos 320 KB (telefono §8.2), que compiten con lo que el jugador pide después con Slow 4G (O-13). **Por qué la navegación va primero por la red**, medido por telefono en caliente (Slow 4G, CPU ×4, mediana de tres): con la cáscara de la caché, `Watch` pinta a 1,47 s y está lista a 3,24, frente a 1,20 y 1,67 sin service worker, porque pierde las precargas que el servidor pone en el HTML de la etapa (`spaShell.ts` l. 201-221); primero la red, 1,08 y 1,50; en la portada y el entrenamiento no cambia nada (de 1,07 a 1,18 s), porque eso ya lo hace la caché inmutable de E2. **Nunca se persiste la caché de React Query**: sin red, los datos salen de la memoria de la sesión. **El registro**: `registerServiceWorker()` de `net.ts`, solo en producción (`import.meta.env.PROD`), tras el evento `load`; `webCacheHeaders` (`app.ts` l. 135-144) gana `sw.js` con `no-cache`, porque en la raíz saldría con `max-age=0`.

### 12.4 Sin red

Hoy, sin red, quien tiene sesión ve `Log in`: `ProtectedRoute.tsx` l. 12-13 lee una sesión que no llega como «sin sesión» (X-03; captura `pwa/out/sinred-recargar-propuesta.png` de telefono). Con E3 (D-47; I-29; X-03, X-04), en el paso 4:

**La sesión tiene tres estados** (`SessionState`, en `apps/web/src/net.ts`): `signed-in` si `authClient.useSession()` trae datos; `signed-out` si no los trae y no hay error, o el error es un 401; y `unknown` en cualquier otro caso. La regla sale de cómo responde better-auth 1.6.25: sin sesión, `get-session` contesta 200 con `null` (`api/routes/session.mjs` l. 191), y un fallo de red deja `data` como estaba (`null` en una recarga en frío) con `error` lleno (`client/session-atom.mjs` l. 88-98 y 110-122). En `unknown`, `ProtectedRoute` no lleva a `/login` y pinta la página, y la cabecera pinta la del jugador si `localStorage` tiene la marca `cs:signed-in` (se pone con `signed-in` y se quita con `signed-out`), sin nada de la cuenta. **`HorizonWatcher` no se toca**: solo vacía la caché si cambia una sesión ya resuelta (`cacheOwnerChanged`, `queryClient.ts` l. 165-167), y una recarga en frío sin red no lo es (X-04); gana un test de que `unknown` no la vacía nunca.

**El aviso**: `OfflineBanner` (§4.7), con `navigator.onLine` y el `onlineManager` de React Query, en una franja de 32 px bajo la cabecera: `You're offline. Showing what you saw at 14:02.` (pantalla), con la hora de `dataUpdatedAt` de la consulta principal de la página (I-29), porque en el teléfono no se distingue una general de esta mañana de una de ayer; al volver la red, `Back online` (pantalla) dos segundos. **Lo pausado** (`fetchStatus === 'paused'`, el `networkMode` por defecto) pinta `OfflineState` (§4.2) y se rehace solo al volver (`refetchOnReconnect`, `queryClient.ts` l. 386). **Las mutaciones** esperan en la `ActionBar`, en memoria: `You're offline. Your changes stay here until you reconnect.` (pantalla). **Un trozo que falla** pinta su `ErrorState` en su sitio, con la cabecera y la barra: `This page needs a connection the first time.` · `Try again` (pantalla), y no la barrera raíz que sustituye la web entera (`main.tsx` l. 22-30), que queda para los fallos de pintado. Los cuatro casos del mapa 05 §13, que comprueba `apps/web/e2e/sinred.spec.ts`:

| Caso (captura)                                     | Hoy                                                                                                  | Con E3                                                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| un enlace a una página cuyo trozo no se cargó (48) | toda la web cambia por la barrera: `Something went wrong`, el error técnico del módulo y `Try again` | si es un destino de la barra o el entrenamiento, está precargado y pinta su `OfflineState`; si no, su `ErrorState` en su sitio |
| recargar (49)                                      | `net::ERR_INTERNET_DISCONNECTED`, la página de error del navegador                                   | la cáscara del service worker, con la cabecera del jugador (`unknown` y la marca), nunca `/login`, y `OfflineBanner`           |
| volver a una página visitada (50)                  | la página, de la caché de React Query, sin aviso                                                     | la misma página con `You're offline. Showing what you saw at 14:02.`                                                           |
| trozo cargado y datos sin pedir (51)               | `Loading…` sin fin (React Query no lanza consultas sin red)                                          | `OfflineState`, que se rehace al volver la red                                                                                 |

### 12.5 La versión nueva

El service worker nuevo se instala y **espera** (D-48): la web lo ve en `registration.waiting` y enseña `UpdateToast` (§4.7), `A new version is ready · Reload` (pantalla), sobre la `ActionBar`; al tocarlo manda `SKIP_WAITING` y recarga en `controllerchange`. **Nunca recarga sola**, y `UpdateToast` no sale mientras corre una retransmisión: `StageWatch` marca `setReloadBlocked(true)` (de `net.ts`) mientras reproduce, y el aviso espera a que pare. Si nadie lo toca, la versión entra al cerrar todas las pestañas. **El desfase** (una pestaña vieja contra una API nueva): `GET /health` (`apps/api/src/routes/health.ts` l. 22) gana `webBuild`, la huella del despliegue de la web, y la web la mira como mucho cada `UPDATE_CHECK_MIN_MS` = 1.800.000 ms, al volver la pestaña a primer plano; si no casa con la suya, llama a `registration.update()`. Como la web no puede saber la huella del `index.html` que la cargó, el plugin escribe la del trozo de entrada en `<meta name="cs-web-build">` de `index.html` y la API la lee de ese fichero al arrancar (12-b). Una respuesta que no pasa su esquema en la web pinta el `ErrorState` `outdated`: `This version is out of date · Reload` (pantalla).

### 12.6 iPhone y Android

**iPhone** (D-51, DD-15). Safari no tiene `beforeinstallprompt` y no dice que se pueda instalar, así que `InstallHint` (§4.7) lo explica: `Add Cycling Star to your Home Screen: tap Share, then Add to Home Screen` (pantalla), como `Notice` `note` en la portada, **tras la tercera sesión** (`INSTALL_HINT_AFTER_SESSIONS` = 3) o cuando E4 pida avisos, nunca en la primera visita, y una sola vez tras cerrarlo (`cs:install-hint-closed`). Una sesión es una carga en frío a más de 30 minutos de la anterior, contada en `localStorage` (`cs:sessions`, `cs:last-seen`) por `apps/web/src/domain/install.ts`. Desde iOS 26, toda web añadida a la pantalla de inicio se abre como app aunque no haya manifiesto, y los avisos siguen pidiendo que esté añadida (mapa 05 §14), que es el requisito de E4. **Instalada no hay barra con recarga**: con `display-mode: standalone` (o `navigator.standalone`), `ErrorState` añade `Reload app` (pantalla), y todas las pantallas de segundo nivel llevan su enlace de vuelta (§6.5). **Android**: la web guarda el evento `beforeinstallprompt` y ofrece `Install app` (pantalla) en `/account` y, una vez, en la portada tras ver una etapa entera; Chrome con los servicios de Google y Samsung Internet instalan como WebAPK, con entrada propia en el cajón (mapa 05 §14). **Medido por telefono**: Chromium lee el manifiesto sin errores (`Page.getAppManifest`) y el service worker queda activo; la instalabilidad no se pudo comprobar, porque `Page.getInstallabilityErrors` da la lista vacía también para la web de hoy, y no se ha probado en ningún teléfono (telefono §8.4). Lo comprueba la prueba del dueño (§7.7).

### 12.7 El peso

**Las banderas** (D-49; O-08, X-07) son el 91 % de la CSS: la hoja que bloquea la primera pintura pesa 94,3 KB con el gzip de Vite y 92,4 por la red, la misma hoja con dos compresores (X-26; mapa 01 §8). Pasan a un sprite WebP de 64 × 48 por bandera (el triple de 21 × 16) con las 133 del juego, unos 47 KB (telefono §8.3), importado desde `apps/web/src/assets/flags.webp` para que Vite le ponga huella en `assets/`; sus coordenadas, en `apps/web/src/components/ui/flagSprite.generated.ts`, salen de `apps/web/scripts/flag-sprite.mjs` con su test de huella; `flag-icons` sale de `main.tsx` l. 9 y `Flag` (§4.6) pinta del sprite. Se descartó `public/flags/`: en la raíz saldrían con `max-age=0` (`app.ts` l. 131-133) y cada revalidación gasta el cupo de 300 peticiones por minuto e IP (`security.ts` l. 10). **Medido por telefono** (Slow 4G, CPU ×4, mediana de cinco): la hoja pasa de 92,4 a 9,2 KB con gzip, la primera pintura de 3,20 a 2,93 s en las tres páginas medidas y bajan de 62 a 82 KB por la red. **Los presupuestos** (D-50), en `apps/web/scripts/peso.test.mjs`, tras `vite build`, con zlib de Node a nivel 9 sobre los ficheros de `dist/` (X-26), en el trabajo `Build` del CI:

| Constante             | Tope   | Hoy                                                        |
| --------------------- | ------ | ---------------------------------------------------------- |
| `CSS_BLOCKING_MAX_GZ` | 15 KB  | 94,3 (Vite) y 92,4 (por la red); con el sprite, 9,2        |
| `ENTRY_JS_MAX_GZ`     | 160 KB | unos 157: 250,9 de arranque menos 94,3 de CSS (mapa 01 §8) |
| `PRECACHE_MAX_GZ`     | 250 KB | no hay precarga; unos 220 estimados (§12.3)                |
| `FLAG_SPRITE_MAX`     | 60 KB  | no hay sprite; unos 47 (telefono)                          |

**El barril de `packages/shared`** (H-03; sin evidencia de los jueces): `request.js` lleva 42 KB de `broadcast/*` porque el paquete no declara `sideEffects` (mapa 01 §8). En el paso 6 gana `"sideEffects": false` solo si `peso.test.mjs` enseña que `request.js` los suelta y `pnpm test` sigue en verde; si no, queda escrito en este apartado con la cifra. **Cada noche**, `apps/web/e2e/nocturno.spec.ts`, con Slow 4G, CPU ×4 y la mediana de cinco: primera pintura en frío de 3,0 s o menos (hoy de 3,16 a 3,23; con el sprite, 2,93), lista en frío de 5,0 o menos (hoy de 4,7 a 5,8) y en caliente de 2,0, o de 3,0 en el entrenamiento (mapa 05 §12; telefono §5.3).

### 12.8 La prueba que revisa la app nativa

La agenda cuelga la revisión de la app nativa de una analítica que no existe (§4.22.3; mapa 04, contradicción 18; la tarea de `docs/encargos.md` l. 741-742 está sin hacer), así que E3 pone el sensor mínimo, propio y sin datos personales (D-52, DD-14), en el paso 23. **El cuerpo**: `POST /api/telemetry/vitals`, una vez por sesión, contesta siempre 204:

```ts
// packages/shared/src/contracts.ts
export const vitalsDeviceSchema = z.enum(['phone', 'tablet', 'desktop']) // por pointer: coarse y el ancho
export type VitalsDevice = z.infer<typeof vitalsDeviceSchema>
export const vitalsSchema = z
  .object({
    device: vitalsDeviceSchema,
    standalone: z.boolean(), // display-mode: standalone
    os: z.enum(['ios', 'android', 'other']),
    route: z.string().regex(/^\/[a-z0-9/:_-]{0,63}$/), // el patrón de la ruta, nunca la URL con ids
    source: z.enum(['pwa', 'pwa-shortcut']).nullable(), // el ?source= del manifiesto
    readyMs: z.number().int().min(0).max(60_000).nullable(), // «lista», donde se mida
    inpMs: z.number().int().min(0).max(10_000).nullable(),
  })
  .strict()
```

**El agregado**: la migración `0054_telemetria` crea `telemetry_vitals_daily`, una fila por (`day`, `device`, `standalone`, `os`, `route`), con `sessions` y, para poder sacar el p75 sin guardar muestras, dos cuentas por tramos, `ready_buckets` (40 de 250 ms) e `inp_buckets` (40 de 25 ms), que el `POST` suma en un `update` atómico (12-c); `ready_p75_ms` e `inp_p75_ms` se rellenan al cerrar el día, con el primer `POST` del día siguiente. Sin IP, sin cuenta y sin la URL. **La regla** (telefono §8.5), pura, en `nativeReviewVerdict(rows)` de `apps/api/src/telemetry.ts`, con sus constantes: si en una semana el `NATIVE_REVIEW_PHONE_SHARE` = 50 % o más de las sesiones es de teléfono (el sensor no cuenta jugadores, porque no guarda cuentas), la app nativa se revisa cuando, `NATIVE_REVIEW_WEEKS` = 4 semanas seguidas, el p75 de «lista» en teléfono pasa de `NATIVE_REVIEW_READY_P75_MS` = 4.000 ms o el de INP de `NATIVE_REVIEW_INP_P75_MS` = 300; o cuando menos del `NATIVE_REVIEW_INSTALL_SHARE` = 20 % de las sesiones de teléfono es instalada tres meses después de que salga `InstallHint`; o cuando E4 mide que en iPhone acepta avisos menos del `NATIVE_REVIEW_PUSH_ACCEPT` = 30 % de los instalados o que falla más del `NATIVE_REVIEW_PUSH_FAIL` = 10 %. El veredicto sale en una línea del panel de administración, por `GET /api/admin/telemetry` (con `requireAdmin` y `ADMIN_VEIL`). No sustituye a la tarea de analítica.

---

**Injertos aplicados.** I-11 (§12.3: el service worker no intercepta `/api/*`, `/health` ni `/api/auth/*`, sin `respondWith`, y no persiste la caché de React Query), I-23 (§12.2: los iconos generados con su huella), I-29 (§12.4: la hora de los datos en el aviso sin red).

**Objeciones resueltas.** O-02 (§12.2: la barra de estado en `default`), O-08 (§12.7: el sprite entra por Vite, con huella, y sus coordenadas con test), O-13 (§12.3: la precarga de los destinos y no de todo, con su tope y `Save-Data`).

**Huecos rellenados.** H-03 (§12.7: `sideEffects` en `packages/shared`, con su condición). Contradicciones de hecho escritas: X-03 (§12.4), X-04 (§12.4), X-07 (§12.7), X-10 (§12.2) y X-26 (§12.7: la misma hoja con dos compresores).

**Decisiones de esta sección.**

- 12-a. La precarga lleva también el trozo de `/me/training`, porque es el destino del atajo `Training` del manifiesto y sin él el atajo falla sin red. D-46 nombraba solo los cinco de la barra.
- 12-b. `webBuild` es la huella del trozo de entrada, que el plugin escribe en `<meta name="cs-web-build">` de `index.html` y la API lee de ese fichero, porque la web no puede conocer la huella del `index.html` que la cargó sin que el fichero se contenga a sí mismo.
- 12-c. `telemetry_vitals_daily` gana `ready_buckets` e `inp_buckets`, que §G.8 no tenía, porque un p75 diario no se puede sumar sesión a sesión. Descartado: guardar cada sesión, que guardaría más de lo que pide D-52.
- 12-d. `UpdateToast` espera a que pare la retransmisión, con `setReloadBlocked` de `net.ts`, en lugar de salir y que el jugador recargue en mitad de una etapa.
- 12-e. Una sesión, para `InstallHint`, es una carga en frío a más de 30 minutos de la anterior.
- 12-f. El sensor cuenta sesiones y no jugadores, y la regla de D-52 se aplica a la fracción de sesiones.

**Propuesto para el glosario.** `registerServiceWorker()` y `setReloadBlocked(blocked)` (en `apps/web/src/net.ts`); `<meta name="cs-web-build">` (en `index.html`, lo escribe `vite-plugin-sw.ts`); `apps/web/scripts/icons.mjs` ya está, con su test de huella; `cs:signed-in`, `cs:sessions`, `cs:last-seen` y `cs:install-hint-closed` (las marcas de `localStorage`); `vitalsDeviceSchema`; `ready_buckets` e `inp_buckets` de `telemetry_vitals_daily` (`0054_telemetria`); `nativeReviewVerdict` (en `apps/api/src/telemetry.ts`); `GET /api/admin/telemetry` (paso 23).

**Dudas para el ensamblador.**

1. D-50 llama `rendimiento.spec.ts` a lo que §G.10 llama `nocturno.spec.ts`; aquí va el del glosario.
2. §G.8 da a `telemetry_vitals_daily` las columnas `ready_p75_ms` e `inp_p75_ms` sin cómo se calculan; esta sección añade dos columnas de tramos (12-c). El plan del paso 23 (§17) debe recogerlas en la migración.
