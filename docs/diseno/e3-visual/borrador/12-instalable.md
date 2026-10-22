## 12. Sin red, el peso y la primera pintura

El encargo pedía la web instalable (`docs/encargos.md` l. 242-248, «la aplicación INSTALABLE»; `docs/agenda.md` §4.15.1, web instalable y no app nativa), y la v0 la ejecutaba. **El dueño la retiró** el 22 de octubre de 2026, porque hará pronto una app: «DD-14: No, pronto haremos app, asi que quita la web instalable. DD-15: no aplica.» (`00-encargo.md` §7.6; D-00p, que sustituye a D-45, D-46, D-48, D-51 y D-52). Una web instalable sería trabajo que la app tiraría. Esto cambia el encargo y la decisión de la agenda, y lo cambia el dueño. **E3 no hace** el manifiesto, los iconos de pantalla de inicio, las metas de Apple, el service worker, el aviso de instalar, la versión nueva por service worker ni el medidor que revisaría la app nativa (§12.4), y **lo que E4 pedía de la web instalable**, el aviso al teléfono en iPhone, que Safari solo da a una web añadida a la pantalla de inicio (mapa 05 §14), **pasa a la app**. Se queda lo que vale sin instalar, porque es de la web y del teléfono y no de la instalación: la conducta sin red de los componentes (D-47, §12.1), las banderas en un sprite y el presupuesto de peso y de primera pintura (D-49 y D-50, §12.2). **El teléfono sigue siendo el criterio de aceptación** (D-18): la web es el juego hasta que exista la app, y la app usará el mismo sistema, con sus tokens en `tokens.json` (§12.3). Las líneas son las de `58c14da`.

### 12.1 Sin red

Hoy, sin red, la web se rompe de cuatro maneras (mapa 05 §13, capturas 48 a 51), y la peor es la sesión: cuando la página llega y la petición de la sesión no (una red que se cae a mitad de carga, un túnel), quien tiene sesión ve `Log in`, porque `ProtectedRoute.tsx` l. 12-13 lee una sesión que no llega como «sin sesión» (X-03). Con E3 (D-47; I-29; X-03, X-04), en el paso 4:

**La sesión tiene tres estados** (`SessionState`, en `apps/web/src/net.ts`): `signed-in` si `authClient.useSession()` trae datos; `signed-out` si no los trae y no hay error, o el error es un 401; y `unknown` en cualquier otro caso. La regla sale de cómo responde better-auth 1.6.25: sin sesión, `get-session` contesta 200 con `null` (`api/routes/session.mjs` l. 191), y un fallo de red deja `data` como estaba (`null` en una carga en frío) con `error` lleno (`client/session-atom.mjs` l. 88-98 y 110-122). En `unknown`, `ProtectedRoute` no lleva a `/login` y pinta la página, y la cabecera pinta la del jugador si `localStorage` tiene la marca `cs:signed-in` (se pone con `signed-in` y se quita con `signed-out`), sin nada de la cuenta. **`HorizonWatcher` no se toca**: solo vacía la caché si cambia una sesión ya resuelta (`cacheOwnerChanged`, `queryClient.ts` l. 165-167), y una carga en frío sin respuesta de la sesión no lo es (X-04); gana un test de que `unknown` no la vacía nunca.

**El aviso**: `OfflineBanner` (§4.7), con `navigator.onLine` y el `onlineManager` de React Query, en una franja de 32 px bajo la cabecera: `You're offline. Showing what you saw at 14:02.` (pantalla), con la hora de `dataUpdatedAt` de la consulta principal de la página (I-29), porque en el teléfono no se distingue una general de esta mañana de una de ayer; al volver la red, `Back online` (pantalla) dos segundos. **Lo pausado** (`fetchStatus === 'paused'`, el `networkMode` por defecto) pinta `OfflineState` (§4.2) y se rehace solo al volver (`refetchOnReconnect`, `queryClient.ts` l. 386). **Las mutaciones** esperan en la `ActionBar`, en memoria: `You're offline. Your changes stay here until you reconnect.` (pantalla). **Un trozo que no carga** pinta su `ErrorState` en su sitio, con la cabecera y la barra, y no la barrera raíz que sustituye la web entera (`main.tsx` l. 22-30), que queda para los fallos de pintado: sin red, `network`, `This page needs a connection the first time.` · `Try again` (pantalla); con red, que es lo que pasa tras un despliegue, cuando el nombre con huella del trozo viejo ya no existe, `outdated`, `This version is out of date · Reload` (pantalla), el mismo que pinta una respuesta que no pasa su esquema (§4.2; 12-c). Los cuatro casos, que comprueba `apps/web/e2e/sinred.spec.ts` salvo el de recargar:

| Caso (captura)                                     | Hoy                                                                                                  | Con E3                                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| un enlace a una página cuyo trozo no se cargó (48) | toda la web cambia por la barrera: `Something went wrong`, el error técnico del módulo y `Try again` | su `ErrorState` `network` en su sitio, con la cabecera y la barra                                                                         |
| recargar (49)                                      | `net::ERR_INTERNET_DISCONNECTED`, la página de error del navegador                                   | igual: sin service worker no hay nada que servir sin red, y E3 no lo arregla (D-00p); `sinred.spec.ts` no lo mira                         |
| volver a una página visitada (50)                  | la página, de la caché de React Query, sin aviso                                                     | la misma página con `You're offline. Showing what you saw at 14:02.`                                                                      |
| trozo cargado y datos sin pedir (51)               | `Loading…` sin fin (React Query no lanza consultas sin red)                                          | `OfflineState`, que se rehace al volver la red                                                                                            |
| la sesión no llega (sin captura)                   | `Log in`                                                                                             | la página, con la cabecera del jugador (`unknown` y la marca), nunca `/login`; `sinred.spec.ts` corta `get-session` tras cargar la página |

**Nunca se persiste la caché de React Query**: sin red, los datos salen de la memoria de la sesión, y una recarga los pierde.

### 12.2 Las banderas y el peso

**Las banderas** (D-49; O-08, X-07) son el 91 % de la CSS: la hoja que bloquea la primera pintura pesa 94,3 KB con el gzip de Vite y 92,4 por la red, la misma hoja con dos compresores (X-26; mapa 01 §8). Pasan a un sprite WebP de 64 × 48 por bandera (el triple de 21 × 16) con las 133 del juego, unos 47 KB (telefono §8.3), importado desde `apps/web/src/assets/flags.webp` para que Vite le ponga huella en `assets/`; sus coordenadas, en `apps/web/src/components/ui/flagSprite.generated.ts`, salen de `apps/web/scripts/flag-sprite.mjs` con su test de huella; `flag-icons` sale de `main.tsx` l. 9 y `Flag` (§4.6) pinta del sprite; el paquete no sale del proyecto: pasa a `devDependencies` de versión exacta (`7.5.0`), porque el generador del sprite, las celdas de medir y la copia de sus 133 SVG 4x3 que pinta `ChampionJersey` desde 72 px (§9.5) leen sus ficheros (17-s). Se descartó `public/flags/`: en la raíz saldrían con `max-age=0` (`app.ts` l. 131-133) y cada revalidación gasta el cupo de 300 peticiones por minuto e IP (`security.ts` l. 10). **Medido por telefono** (Slow 4G, CPU ×4, mediana de cinco): la hoja pasa de 92,4 a 9,2 KB con gzip, la primera pintura de 3,20 a 2,93 s en las tres páginas medidas y bajan de 62 a 82 KB por la red. **Los presupuestos** (D-50), en `apps/web/scripts/peso.test.mjs`, que corre con `node --test` tras `vite build`, con zlib de Node a nivel 9 sobre los ficheros de `dist/` (X-26), en el trabajo `Build` del CI:

| Constante             | Tope   | Hoy                                                        |
| --------------------- | ------ | ---------------------------------------------------------- |
| `CSS_BLOCKING_MAX_GZ` | 15 KB  | 94,3 (Vite) y 92,4 (por la red); con el sprite, 9,2        |
| `ENTRY_JS_MAX_GZ`     | 160 KB | unos 157: 250,9 de arranque menos 94,3 de CSS (mapa 01 §8) |
| `FLAG_SPRITE_MAX`     | 60 KB  | no hay sprite; unos 47 (telefono)                          |

**El barril de `packages/shared`** (H-03; sin evidencia de los jueces): `request.js` lleva 42 KB de `broadcast/*` porque el paquete no declara `sideEffects` (mapa 01 §8). En el paso 6 gana `"sideEffects": false` solo si `peso.test.mjs` enseña que `request.js` los suelta y `pnpm test` sigue en verde; si no, queda escrito en este apartado con la cifra. **Cada noche**, `apps/web/e2e/nocturno.spec.ts`, con Slow 4G, CPU ×4 y la mediana de cinco: primera pintura en frío de 3,0 s o menos (hoy, de 3,13 a 3,28 s en las cuatro pantallas del mapa 05 §12, con la mediana de tres, y de 3,16 a 3,23 según telefono §5.3; con el sprite, 2,93, telefono), lista en frío de 5,0 o menos (hoy, de 4,75 a 5,70 s en el mapa 05 y de 4,7 a 5,8 según telefono) y en caliente de 2,0, o de 3,0 en el entrenamiento (telefono §5.3). En caliente manda la caché inmutable de los `assets/` que E2 ya sirve un año (`app.ts` l. 125-144), sin service worker.

### 12.3 `tokens.json`: el mismo sistema para la app

La app que hará el dueño usará el sistema de este documento (D-00p), y para que no copie valores a mano, `apps/web/scripts/tokens-json.mjs` lee el `@theme` de `apps/web/src/index.css` (el del paso 7, el de los tokens, §3.9) y los dos bloques que redefinen tokens, el modo oscuro (`:root[data-theme="dark"]`, D-00i) y el ámbito oscuro (`[data-surface='dark']`, §3.3), y escribe **`packages/shared/tokens.json`**, en la raíz del paquete y no en `src/`, que `packages/shared/package.json` exporta como `@cyclingstar/shared/tokens.json` (12-b). Es el único sitio del fichero: §3.8, §3.9, §15.1 y el PR 7 remiten aquí. Una clave por token, con el nombre sin el prefijo de su espacio (`--color-canvas` es `color.canvas`; `--text-body`, `text.body`) y el valor tal como está en el CSS; en `dark` y en `darkScope`, solo los que esos bloques redefinen:

```json
{
  "version": 1,
  "source": "apps/web/src/index.css",
  "sha256": "<la huella de index.css>",
  "light": {
    "color": { "canvas": "#eef2f6", "surface": "#ffffff", "ink": "#10202f", "kit-ink": "#10202f" },
    "text": { "body": "1rem" }
  },
  "dark": { "color": { "surface": "<el de D-00i>" } },
  "darkScope": { "color": { "surface": "#0b2740", "surface-2": "#123a5c" } }
}
```

El ejemplo está recortado: el fichero lleva todos los tokens de §3 y §15. `generados.test.ts` (con `huellas.json`, §16) falla si `index.css` cambia y `tokens.json` no se regenera. Nace en el PR 7, el de los tokens (§17.7), con `light` y `darkScope`; `dark` entra con el modo oscuro, en el 23, y desde ahí lo regenera cada PR que toque el `@theme`. El vocabulario del maillot no va aquí, porque es dato del juego y no del tema: la app lo importa de `packages/shared/src/kit.ts` (§8.1). La app no está diseñada, y E3 le deja los valores con sus nombres, no sus componentes.

### 12.4 Lo que se retira, y lo que entra en `index.html`

Con la web instalable (D-00p) salen del documento, y de su plan: el manifiesto (`apps/web/public/manifest.webmanifest`, con sus atajos) y los iconos de pantalla de inicio (`apps/web/scripts/icons.mjs`, de 192, 512 y `maskable`, el de Apple y los de los atajos); las metas de Apple (`apple-touch-icon`, `apple-mobile-web-app-title` y `apple-mobile-web-app-status-bar-style`); el service worker (`apps/web/sw/sw.js` y `decide.js`, su `decide.test.ts`, `apps/web/vite-plugin-sw.ts`, la precarga con `PRECACHE_MAX_GZ` y `NAV_TIMEOUT_MS`); la versión nueva (`UpdateToast`, `registerServiceWorker()`, `setReloadBlocked()`, `webBuild` en `GET /health`, `<meta name="cs-web-build">` y `UPDATE_CHECK_MIN_MS`); el aviso de instalar (`InstallHint`, `apps/web/src/domain/install.ts`, `INSTALL_HINT_AFTER_SESSIONS`, `INSTALL_SESSION_GAP_MS` y las marcas `cs:sessions`, `cs:last-seen` y `cs:install-hint-closed`) y el `Reload app` de la web instalada; y el medidor que revisaría la app nativa (`POST /api/telemetry/vitals` con `vitalsSchema`, `telemetry_vitals_daily` y su migración, `nativeReviewVerdict`, `GET /api/admin/telemetry` y las constantes `NATIVE_REVIEW_*`). Esa migración era la `0054_telemetria` de la v0, y su número es ahora el de `0054_modo_oscuro` (§17). DD-14 y DD-15 quedan decididas así.

**Entran en el `<head>` de `apps/web/index.html`**, en el PR 11, el del marco, dos metas que no son de la instalación y que hoy no están (`index.html` l. 1-19; §1.7; 12-a): `viewport-fit=cover` en la del viewport, para que `env(safe-area-inset-*)` valga algo en WebKit y el hueco de la barra inferior, que la web ya reserva (`BottomNav.tsx` l. 44; `App.tsx` l. 154), sirva en un iPhone con la barra de inicio (sin comprobar en un aparato; lo mira la prueba del dueño, §7.7), y `theme-color`, `#123a5c` (`navy`), con la que Chrome en Android pinta su barra del color de la cabecera. Y, con el modo oscuro (el PR 23), el guion `apps/web/public/theme.js`, que `index.html` carga en `<head>` antes de la hoja de estilos para pintar el modo antes de la primera pintura (§3.3, 3-h); la CSP no cambia (`script-src 'self'`):

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#123a5c" />
<script src="/theme.js"></script>
```

`favicon.svg` se queda como está: recolorearlo iba con los iconos, y el logotipo no tiene dueño (mapa 04, contradicción 12).

---

**Injertos aplicados.** I-29 (§12.1: la hora de los datos en el aviso sin red). Retirados por el dueño con la web instalable (D-00p): I-11 (el service worker que no interceptaba `/api/*`, `/health` ni `/api/auth/*` y no persistía la caché de React Query, de la que queda lo segundo, §12.1) e I-23 (los iconos generados con su huella).

**Objeciones resueltas.** O-08 (§12.2: el sprite entra por Vite, con huella, y sus coordenadas con test). Retiradas con la web instalable (D-00p): O-02 (la barra de estado de iPhone instalada) y O-13 (la precarga de los destinos).

**Huecos rellenados.** H-03 (§12.2: `sideEffects` en `packages/shared`, con su condición). Contradicciones de hecho escritas: X-03 (§12.1), X-04 (§12.1), X-07 (§12.2) y X-26 (§12.2: la misma hoja con dos compresores); X-10 (la barra de estado de la web instalada) sale con ella (D-00p).

**Decisiones de esta sección.**

- 12-a. `viewport-fit=cover` y `theme-color` entran en `index.html` en el PR 11 (hoy no están, §1.7), porque son de la web en el navegador y no de la instalación. Descartado: quitarlos con las metas de Apple, que dejaría sin servir el hueco que la barra inferior ya reserva.
- 12-b. `tokens.json` vive en `packages/shared`, en la raíz del paquete, y lo exporta su `package.json`, generado del CSS, que sigue siendo la fuente; es su único sitio (la pasada de coherencia, C-L3-12). Descartado: `apps/web/tokens.json`, que ponía la v1 en §3.9, porque la app será otro consumidor y una app importa de un paquete, no de otra app; y escribir los tokens en JSON y generar el CSS de él, que cambiaría dónde vive el tema (D-02) por una app que aún no existe.
- 12-c. Un trozo que no carga con red pinta `outdated` con `Reload`, y sin red, `network`: tras un despliegue, sin service worker, la pestaña vieja pide trozos que ya no existen y lo que lo arregla es recargar. Descartado: el mismo `network` para los dos casos, que diría al jugador que no tiene red cuando sí la tiene.

**Propuesto para el glosario.** `SessionState` y `cs:signed-in` (en `apps/web/src/net.ts`); `packages/shared/tokens.json` y `apps/web/scripts/tokens-json.mjs`; y salen del glosario, por D-00p: `manifest.webmanifest`, `icons.mjs`, `sw.js`, `decide`, `SwDecision`, `vite-plugin-sw.ts`, `PRECACHE_MAX_GZ`, `NAV_TIMEOUT_MS`, `UpdateToast`, `registerServiceWorker()`, `setReloadBlocked(blocked)`, `webBuild`, `<meta name="cs-web-build">`, `UPDATE_CHECK_MIN_MS`, `InstallHint`, `install.ts`, `INSTALL_HINT_AFTER_SESSIONS`, `INSTALL_SESSION_GAP_MS`, `cs:sessions`, `cs:last-seen`, `cs:install-hint-closed`, `vitalsDeviceSchema`, `vitalsSchema`, `telemetry_vitals_daily` con `ready_buckets` e `inp_buckets`, `0054_telemetria`, `nativeReviewVerdict`, `GET /api/admin/telemetry` y `NATIVE_REVIEW_*`.

**Dudas para el ensamblador.**

1. Las remisiones de otros lotes a lo que sale con la web instalable apuntan a subsecciones y decisiones que ya no existen: la v0 tenía §12.1 a §12.8 y las decisiones 12-a a 12-f, y ahora la conducta sin red es §12.1 (antes §12.4) y las banderas y el peso, §12.2 (antes §12.7); 12-a a 12-c son nuevas. §15 cita 12-e y §17 cita 12-a y 12-c (lote L3, cruzada).
