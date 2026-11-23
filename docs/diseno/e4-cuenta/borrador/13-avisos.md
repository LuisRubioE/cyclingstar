## 13. Los avisos

Un aviso es una notificación del navegador o de la app, nunca un correo (D-00c): el dueño, el 19 de noviembre, «No, como mucho notificadores de browser y app» (`00-encargo.md` l. 313 a 315), y el 23, «Sin correo, solo notificación push» (l. 385 a 387). Hoy no existe ninguno: ni service worker, ni `Notification`, ni `PushManager` en `apps/web/src` (mapa 02 §7). La arquitectura es la de `twilightstruggle`, que el dueño puso de referencia (`00-encargo.md` l. 391 a 394): `web-push` con VAPID, apagado sin claves, enviado después del cambio y en segundo plano, una lista cerrada de servicios de push y un service worker sin caché (`ai/src/pvp/push.ts` l. 10 a 37; `ai/ui/public/sw.js`). Lo que cambia respecto a ella se dice en cada subsección. Desde el 23 de noviembre hay además tres avisos de seguridad, porque la seguridad ya no va por correo (§3, principio 2; §5.4; §7.5).

### 13.1 El catálogo

Nueve avisos. Los seis de juego se construyen solo con `PreStageInfo`, la lista de salida o datos de la cuenta (D-42); los tres de seguridad, con datos de la cuenta. Cada uno tiene su gemelo en la web, que es lo que ve quien no tiene avisos (principio 4). Textos (aviso), en inglés y enteros; `<rider>` es el nombre del corredor del jugador.

| Id                 | Disparador                                                                                                                            | Título / cuerpo (aviso)                                                                                                                                                                                                                                                                                            | Tope                                         | TTL  | `tag`            | `path`                               | De serie | Gemelo en la web                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ---- | ---------------- | ------------------------------------ | -------- | ------------------------------------------------------------------ |
| `stage_digest`     | a `STAGE_DIGEST_HOUR` (19) locales, etapas con su corredor en la salida que pasaron a velado desde el último resumen y siguen sin ver | con una: `stageReadyNotice` tal cual (`Stage 7 of Race France is ready to watch` / `187 km · mountain stage · your rider is on the start list`); con varias: `3 stages are ready to watch` / `Race France · your rider is on the start list` (con dos o más carreras: `2 races · your rider is on the start list`) | 1 por día local                              | 12 h | `digest`         | `/`                                  | sí       | `Ready to watch` de la portada (E2)                                |
| `stage_ready`      | cada etapa que pasa a velada de una carrera seguida (`race_watch.follow = 1`)                                                         | `stageReadyNotice` tal cual                                                                                                                                                                                                                                                                                        | 1 por carrera cada `STAGE_READY_EVERY_H` (6) | 6 h  | `stage-<raceId>` | `/world/races/<raceId>/stages/<day>` | no       | la misma fila de `Ready to watch`                                  |
| `plan_ending`      | al plan vivo le quedan `PLAN_ENDING_GAME_DAYS` (4) días de juego, un día real                                                         | `Your training plan ends tomorrow` / `After that your coach picks <rider>'s training.`                                                                                                                                                                                                                             | 1 por plan                                   | 12 h | `plan`           | `/me/training`                       | sí       | el aviso del plan de la portada (`PLAN_END_WARN_DAYS`, 7)          |
| `offer_received`   | el tick crea ofertas para su corredor libre                                                                                           | `New contract offers for <rider>` / `3 teams made an offer. Offers expire in about 5 days.` (con una: `One team made an offer. Offers expire in about 5 days.`)                                                                                                                                                    | 1 por día local                              | 12 h | `offers`         | `/me/contract`                       | sí       | `/me/contract` y `Welcome back` (§14.5)                            |
| `away_warning`     | 20 y 27 días reales de inactividad (§14.4), solo con la regla de E7 viva (PR 15)                                                      | `10 days left` / `If you don't visit by 19 Dec, your coach takes over <rider>. One visit is enough.` (a los 27: `3 days left`)                                                                                                                                                                                     | 2 por periodo de inactividad                 | 12 h | `away`           | `/`                                  | sí       | `Away` y `Welcome back` (§14.5)                                    |
| `away_over`        | llega `away_until`                                                                                                                    | `Welcome back` / `Your away time is over. Your notifications are on again.`                                                                                                                                                                                                                                        | 1 por ausencia                               | 12 h | `away`           | `/`                                  | sí       | `Welcome back`                                                     |
| `password_changed` | 200 de `reset-password` y de `change-password` (§5.4)                                                                                 | `Your password was changed` / `If it wasn't you, reset it now.`                                                                                                                                                                                                                                                    | ninguno: cada cambio es uno                  | 12 h | `password`       | `/forgot-password`                   | siempre  | la fila `Password` de `Account` (§12.1)                            |
| `new_sign_in`      | 200 de `sign-in/email` sin `cs_device` válida para ese correo (§7.5)                                                                  | `New sign-in to your account` / `Chrome on Android signed in just now. If it wasn't you, reset your password.` (con `deviceLabel` del agente, §6.4)                                                                                                                                                                | 1 por hora y cuenta (`NEW_SIGN_IN_EVERY_H`)  | 12 h | `signin`         | `/account/devices`                   | siempre  | la fila nueva de `Devices` (§12.2)                                 |
| `email_changed`    | un administrador va a cambiar el correo de la cuenta (`PATCH /api/admin/users/:id` con `email`, §5.5), antes de cambiarlo             | `Your account email was changed by an administrator` / `If you didn't ask for this, sign in and check Account.`                                                                                                                                                                                                    | ninguno: cada cambio es uno                  | 12 h | `email`          | `/account/email`                     | siempre  | `Account › Email` con el correo nuevo y `Recent changes` del panel |

`stage_digest` y no una por etapa: con cuatro días de juego por día real una vuelta da hasta cuatro «etapa lista» al día, ocho con dos carreras (mapa 02 §10, estimado), y Chrome retira el permiso a las webs no instaladas que avisan mucho y se visitan poco (mapa 02 §5). Cuenta solo las etapas veladas desde el último resumen, para no repetir cada tarde las mismas a quien no mira (13-c). Las etapas listas salen de `computeHorizon` e `isVeiled` (`packages/db/src/horizon.ts` l. 381 y 866), las mismas que pintan `Ready to watch` (`WatchBlocks.tsx` l. 40 a 42). `offer_received` es del mercado de hoy (`contracts.ts` l. 37, `OFFER_TTL_DAYS` 21, unos 5 días reales, X-20); la negociación entre personas de E9 entra por este mismo catálogo cuando exista (I-29).

Los tres de seguridad (13-a, que recoge la propuesta de §5 y §7, más `email_changed` de §5.5): no tienen interruptor (DD-16 A), no cuentan en `NOTICE_DAILY_CAP`, no esperan al silencio y salen también durante la ausencia, porque su valor es llegar a tiempo y son raros (como mucho uno por hora el de entrada nueva). Los textos son los que propuso §5; `password_changed` lleva a `/forgot-password` y no a `Devices` (13-b): a quien le han cambiado la contraseña se le han cerrado las sesiones (§5.4) y `Devices` le pediría entrar con una contraseña que ya no sabe.

```ts
// packages/shared/src/account/notices.ts
import type { PreStageInfo } from '../wire.js'

export const NOTICE_KINDS = [
  'stage_digest',
  'stage_ready',
  'plan_ending',
  'offer_received',
  'away_warning',
  'away_over',
  'password_changed',
  'new_sign_in',
  'email_changed',
] as const
export type NoticeKind = (typeof NOTICE_KINDS)[number]

export interface NoticeSpec {
  /** Se puede apagar en `Notifications` y con `Turn off these`. Los de seguridad, no. */
  readonly switchable: boolean
  /** Encendido sin que el jugador diga nada (DD-02 A). */
  readonly byDefault: boolean
  /** Cuenta en `NOTICE_DAILY_CAP`. */
  readonly capped: boolean
  /** Espera al final del silencio. */
  readonly quiet: boolean
  /** Sale con la ausencia viva. */
  readonly whileAway: boolean
  readonly ttlS: number
  readonly urgency: 'normal' | 'high'
  /** Rótulo de la fila de `Notifications` (pantalla). */
  readonly label: string
}

/** Los valores, en la tabla de §13.1 y en el párrafo que sigue al bloque. */
export declare const NOTICE_CATALOG: Readonly<Record<NoticeKind, NoticeSpec>>

/** Lo que viaja al service worker y a la app: sin nada más que esto. */
export interface NoticePayload {
  readonly kind: NoticeKind
  readonly title: string
  readonly body: string
  /** Ruta de la web; la app la traduce a la suya. */
  readonly path: string
  readonly tag: string
  /** Si el service worker ofrece `Turn off these` (`NOTICE_CATALOG[kind].switchable`). */
  readonly off: boolean
}

export interface ReadyStage {
  readonly info: PreStageInfo
  readonly raceId: string
  readonly ownRiderOnStartlist: boolean
}

export type NoticeInput =
  | { readonly kind: 'stage_digest'; readonly stages: readonly ReadyStage[] }
  | { readonly kind: 'stage_ready'; readonly stage: ReadyStage }
  | { readonly kind: 'plan_ending'; readonly riderName: string }
  | { readonly kind: 'offer_received'; readonly riderName: string; readonly offers: number }
  | {
      readonly kind: 'away_warning'
      readonly riderName: string
      readonly daysLeft: number
      readonly deadline: string
    }
  | { readonly kind: 'away_over' }
  | { readonly kind: 'password_changed' }
  | { readonly kind: 'new_sign_in'; readonly deviceLabel: string }
  | { readonly kind: 'email_changed' }

/** Pura: el único constructor de avisos. `NOTICE_DEFAULTS` son los `byDefault` de los apagables. */
export declare function noticePayload(input: NoticeInput): NoticePayload
export declare const NOTICE_DEFAULTS: Readonly<Partial<Record<NoticeKind, boolean>>>
```

`NOTICE_CATALOG`: `switchable` y `byDefault` como la columna «De serie» (los tres de seguridad, `switchable: false`); `capped` en todos salvo `away_warning` (D-43) y los tres de seguridad; `quiet` en todos salvo los tres de seguridad; `whileAway` solo en `away_over` y los tres de seguridad; `ttlS` 21.600 en `stage_ready` y 43.200 en el resto; `urgency` `high` en los de seguridad y `normal` en el resto; `label`, el texto de su fila en §13.4 (`Password changed`, `New sign-in` y `Email changed` para los tres que no se pintan como casilla). `deadline` llega ya escrito como `19 Dec` (el formato de fechas de §5.7), para que la función no lea relojes. `users.notice_prefs` guarda solo lo que el jugador cambió (`{ "stage_ready": true }`); `{}` vale `NOTICE_DEFAULTS`, y una clave de un aviso no apagable se ignora al leer y se rechaza al escribir.

### 13.2 Topes, silencio y zona horaria

- **Tope global**: `NOTICE_DAILY_CAP` (3) avisos por día local y usuario, contando solo los `capped`, es decir, sin `away_warning` ni los de seguridad (D-43). Un aviso que no cabe se apunta en `notice_log` y no sale: llegaría tarde y el siguiente barrido no debe mandarlo mañana (13-d).
- **Silencio**: de `NOTICE_QUIET_START_H` (22) a `NOTICE_QUIET_END_H` (8) en `users.time_zone`. Un aviso `quiet` que cae ahí no se apunta y sale en el primer barrido después de las 8, si su TTL y su disparador siguen en pie. Los de seguridad no esperan. Es decisión de la síntesis y §21.4 se la enseña al dueño (O-06).
- **La zona** llega del navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`) en el cuerpo de `POST /api/me/push-targets`, se valida contra `Intl.supportedValuesOf('timeZone')` y se escribe en `users.time_zone`; Privacy la nombra (§10.1; O-05). Sin zona, UTC.
- **TTL** por aviso (tabla de §13.1) y **`Topic`**: un aviso nuevo con el mismo `tag` sustituye al pendiente en el servicio de push. `Topic` admite 32 caracteres del alfabeto base64url (mapa 02 §8) y `stage-<raceId>` pasa de 32, así que `Topic` es el SHA-256 del `tag` en base64url, cortado a 32 (13-e).

### 13.3 El permiso y la baja de un toque

El permiso nunca se pide al cargar (D-44): Firefox desde la 72 y Safari solo lo conceden tras un toque (mapa 02 §5), y `twilightstruggle` hace lo mismo («Permission is only ever asked for on a click», `ai/ui/src/online/push.ts` l. 7). Se ofrece en los momentos de DD-03 A, con un `Notice` `info` que se cierra; cerrarlo escribe `cs.noticeAskedAt` y lo calla `NOTICE_ASK_SNOOZE_DAYS` (30) días (pantalla):

```
Tras crear el corredor, en la portada                                            (pantalla)
Get notified when your stages are ready?
One notification in the evening when stages with your rider are ready to watch, and a few
about your training plan and contract offers. Never more than 3 a day.
[Turn on]  [Not now]

Al seguir una carrera, en su página
Get a notification when each stage of this race is ready?
[Turn on]  [Not now]
```

`Turn on` en el segundo enciende también `stage_ready` (13-f): es lo que el jugador acaba de pedir. En un iPhone fuera de la pantalla de inicio, `Turn on` se sustituye por `See how`, que abre `Account › Notifications` (§13.4). En `Account` el botón está siempre.

**La baja de un toque**: cada aviso apagable lleva la acción `Turn off these` donde el navegador pinta acciones (Chrome, Edge, Firefox; `Notification.maxActions` mayor que 0), que el service worker convierte en `POST /api/me/notices/<kind>/off` sin abrir nada ni pedir contraseña. Donde no hay acciones (Safari), tocar el aviso abre su página con `?from=notice&kind=<kind>` y la página pinta arriba `Don't want these? Turn off "Stages ready"` / `Turn off` (pantalla, `Notice` `info`). Hecho: `Turned off. You can turn it on again in Account, Notifications.` (`Notice` `good`).

### 13.4 `Notifications` (pantalla, 360 px)

`AccountNotifications`, en `/account/notifications`. Qué puede el navegador se decide como en `twilightstruggle` (`pushSupport`, `ai/ui/src/online/push.ts` l. 47 a 55): un iPhone o iPad (`/iPad|iPhone|iPod/` en el agente, o `MacIntel` con más de un punto táctil) que no está en modo `standalone` es `ios-home`; sin `serviceWorker`, `PushManager` o `Notification`, `unsupported`; si no, `ok`.

```
‹ Account
Notifications

Panel · This browser
Chrome on Android · On
Signing out of this browser turns its notifications off.
[ Turn off on this browser ]

Panel · What we notify
[x] Stages ready (once a day, 19:00)
[ ] Every stage of races you follow
[x] Training plan ending
[x] Contract offers
[x] Your away time is over
Always on: a changed password, a new sign-in and a changed email.
Quiet hours 22:00 to 08:00 (Europe/Madrid). Notifications wait until morning.

Panel · Other devices
Firefox on Windows · since 12 Nov                    [ Remove ]
```

`Before your coach takes over` aparece en la lista con el PR 15. Cada `Checkbox` guarda al cambiar con `PUT /api/me/notices` y dice `Notification settings saved.`; si falla, vuelve atrás y dice `Couldn't save. Try again in a minute.` Los estados del panel `This browser`, enteros:

| Estado                                                  | Lo que pinta (pantalla)                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin claves VAPID en el servidor (`enabled: false`)      | `Notifications aren't available yet.` y nada más en toda la página                                                                                                                                                                                                                                         |
| `unsupported`                                           | `This browser can't show notifications.` / `Everything a notification would tell you is also on your Home page.`                                                                                                                                                                                           |
| `ios-home` (DD-04 y `00-encargo.md` §9.5, por el dueño) | `On iPhone and iPad, notifications only work from the Home Screen.` / `Tap Share, then Add to Home Screen. Open Cycling Star from there, log in, and turn notifications on in Account, Notifications. You need iOS 16.4 or later.` / `Everything a notification would tell you is also on your Home page.` |
| Sin decidir (`Notification.permission` es `default`)    | `Get notifications on this browser.` / `[Turn on]`                                                                                                                                                                                                                                                         |
| Bloqueado (`denied`)                                    | `Notifications are blocked for Cycling Star in this browser's settings. Allow them there, then come back.`                                                                                                                                                                                                 |
| Concedido sin suscripción aquí                          | `Notifications are off on this browser.` / `[Turn on]` (suscribe sin volver a pedir el permiso)                                                                                                                                                                                                            |
| Encendido                                               | el dibujo de arriba                                                                                                                                                                                                                                                                                        |
| Fallo al suscribir                                      | `Couldn't turn on notifications. Try again in a minute.`                                                                                                                                                                                                                                                   |

**El iPhone** (DD-04): el dueño, el 23 de noviembre, «si detecta que es un iPhone, que permita pero explique cómo hacerlo» (`00-encargo.md` l. 373 a 376), y ese mismo día, preguntado por el manifiesto, «ok» (§9.5, punto 2): **un manifiesto mínimo, como el de `twilightstruggle`, solo para que el iPhone reciba avisos desde iOS 16.4 con la web en la pantalla de inicio**. Es lo que hace `twilightstruggle`: `iosHint` (`ai/ui/src/online/push.ts` l. 229 a 231) dice iOS 16.4 porque `/play` enlaza un manifiesto (`<link rel="manifest" href="/play/manifest.webmanifest">`, `ai/ui/online/index.html` l. 11; `PLAY_MANIFEST`, `ai/src/app.ts` l. 71 a 85, servido en l. 243 con `application/manifest+json`). Sin manifiesto, lo añadido a la pantalla de inicio solo se abre como app en iOS 26 o más (mapa 02 §6, puntos 1 y 2), y esa era la opción del borrador que el dueño no eligió. El manifiesto y su frontera con D-00p están en §13.5 (13-g). Que el aviso llegue en un iPhone de verdad **no está comprobado en un aparato**: es la prueba del dueño (§19.3; H-09). Abierta desde la pantalla de inicio, la página es la normal. Nada fuera de `Notifications` y del `See how` de §13.3: ni `InstallHint` ni un aviso en la portada (I-21, en lo que el dueño no cambió; O-08). Lo que el iPhone no recibe lo tiene en la web: `Ready to watch`, el aviso del plan de la portada, `/me/contract` y `Welcome back`.

**Un aparato compartido** (D-49; I-25; O-19): `Sign out` borra antes el `push_target` de ese navegador (`DELETE /api/me/push-targets/:id` con `cs.pushTargetId`, §6.5); cerrar una sesión desde `Devices` borra los suyos; la caducidad de la sesión no los borra (la columna pasa a nula), porque el ausente que no entra es quien necesita `away_warning`. Si en ese navegador entra otra cuenta y enciende los avisos, la suscripción pasa a la cuenta nueva (§13.6).

### 13.5 `sw.js` y la frontera con D-00p

`apps/web/public/sw.js`, JavaScript plano sin importaciones, registrado con ámbito `/` solo al pulsar `Turn on` (`noticeAsk`, `apps/web/src/notifications/push.ts`). Tres oyentes y nada más (D-45):

- `push`: lee el JSON `NoticePayload` y llama a `showNotification(title, { body, tag, renotify: true, data: { path, kind }, actions })`, con `actions = [{ action: 'off', title: 'Turn off these' }]` si `off` y `Notification.maxActions > 0`. Sin icono propio: D-00p quitó los iconos y el navegador pone el suyo (13-h). Siempre pinta: no deja fuera un aviso por haber una pestaña visible, como sí hace `twilightstruggle` (`sw.js` l. 30 a 31), porque un push recibido y no pintado hace que Chrome pinte uno genérico y aquí ningún aviso es de algo que se esté mirando en ese instante (13-i).
- `notificationclick`: con `action === 'off'`, `fetch('/api/me/notices/<kind>/off', { method: 'POST', credentials: 'same-origin' })` y cierra. Si no, construye `new URL(path, self.location.origin)`; si su origen no es el propio, usa `/` (I-02: una clave VAPID filtrada no lleva al jugador a otra web); sin acciones, añade `?from=notice&kind=`; enfoca una ventana del propio origen ya abierta en esa ruta, navega otra del propio origen, o abre una nueva (como `sw.js` de `twilightstruggle`, l. 54 a 71).
- `pushsubscriptionchange`: vuelve a suscribir con la misma `applicationServerKey` y manda `POST /api/me/push-targets`; si la sesión ya no vale (401), se pierde y la fila vieja muere por 404 o 410 (§13.6).

Más `install` con `skipWaiting` y `activate` con `clients.claim`, como `twilightstruggle` (l. 16 a 17). **Sin `fetch`, sin Cache API y sin metas de Apple**: no guarda nada y no sirve nada sin red.

**El manifiesto mínimo** (`00-encargo.md` §9.5, punto 2). `apps/web/public/manifest.webmanifest`, enlazado desde `apps/web/index.html` con `<link rel="manifest" href="/manifest.webmanifest">`, con estas claves y ninguna más:

```json
{
  "name": "Cycling Star",
  "short_name": "Cycling Star",
  "id": "/",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#123a5c",
  "theme_color": "#123a5c"
}
```

El color es el de `theme-color` de hoy (`apps/web/index.html` l. 19). **Sin `icons`**: D-00p quitó los iconos, el iPhone hace el suyo con una captura de la página, y la instalación de Chrome pide un manifiesto con nombre e icono (mapa 02 §7), así que sin iconos Chrome no ofrece instalar; esto último no lo he comprobado en un Android de verdad y va a la prueba del dueño (§19.3). Lo sirve `@fastify/static` desde `public/` como el favicon; si su tipo sale `application/manifest+json`, no lo sé, y el test lo fija. La CSP no cambia: `default-src 'self'` cubre `manifest-src` (`app.ts` l. 178). Lo que D-00p quitó sigue quitado: ni funcionar sin red, ni caché, ni ofrecer instalar (ningún `beforeinstallprompt`, ningún `InstallHint`, ningún botón). `sw.test.ts` lo fija: ni `addEventListener('fetch'`, ni `caches`, ni `importScripts` en `sw.js`; `index.html` con un solo `rel="manifest"` y sin `apple-mobile-web-app-capable`; el manifiesto con exactamente esas ocho claves y sin `icons`. Cabe en la CSP de hoy sin cambios (`app.ts` l. 175 a 195; medido en Chromium, mapa 02 §7) y el servidor de estáticos ya lo sirve como `application/javascript` con `max-age=0` (`app.ts` l. 131 a 134). D-00p (`docs/visual.md` l. 2736) quitó la web instalable y su cáscara sin red; esto no es ninguna de las dos: un service worker que solo recibe avisos y un manifiesto que solo sirve para que el iPhone abra la web como app y así reciba avisos. La frase de `visual.md` l. 3656 («ni service worker») se corrige como frontera en `docs/cuenta.md` y se le pasa a W5 (§20.3).

### 13.6 El envío: `web-push`, VAPID, la SSRF y las suscripciones muertas

- **`web-push` 4.0.0** (ESM, sin tipos; `apps/api/src/push/web-push.d.ts` declara lo que se usa: `sendNotification`, `RequestOptions`, `PushSubscription`, `WebPushError` con `statusCode`; mapa 02 §8). `pnpm audit` de 4.0.0: sin avisos (medido por el mapa 02).
- **VAPID**: `VAPID_PUBLIC_KEY` (87 caracteres), `VAPID_PRIVATE_KEY` (43) y `VAPID_SUBJECT=https://www.cyclingstar.app`, en `loadEnv` y en `loadTickEnv` (D-46; D-47). **Apagado sin claves**, como `twilightstruggle` (`push.ts` l. 18 a 19): sin las tres no se envía nada, `GET /api/me/notices` dice `enabled: false` y nadie se suscribe. Cambiar la clave rompe todas las suscripciones (mapa 02 §7): se genera una vez (PR 17) y no se rota sin decirlo en `docs/ops.md`.
- **`isAllowedPushEndpoint(url)`** (`apps/api/src/push/endpoint.ts`; I-01; X-12; O-12): `web-push` abre TLS al host y puerto de la URL sea cual sea el esquema, y sus errores son un oráculo de puertos de la red privada de Railway (seguridad C2). Se acepta solo con `https:`, puerto vacío o `443`, sin usuario ni contraseña, como mucho 1.024 caracteres y con el host igual a uno de `PUSH_ALLOWED_HOSTS` o acabado en `.` y uno de ellos. La lista es la de `twilightstruggle` (`PUSH_HOSTS`, `ai/src/pvp/push.ts` l. 354 a 361): `googleapis.com`, `google.com`, `push.services.mozilla.com`, `notify.windows.com`, `push.apple.com` (13-j). Las claves, como allí (`validSubscription`, l. 364 a 375): `p256dh` y `auth` en base64url, de 200 y 100 caracteres como mucho. Se valida al guardar y otra vez al enviar, por las filas viejas.
- **El `Deliverer`** (`apps/api/src/push/deliver.ts`; D-50):

```ts
export type PushChannel = 'webpush' | 'fcm' | 'apns'
export type DeliveryResult = 'ok' | 'gone' | 'retry'
export interface DeliveryOptions {
  readonly ttlS: number
  readonly urgency: 'normal' | 'high'
  /** SHA-256 del `tag` en base64url, 32 caracteres. */
  readonly topic: string
}
export interface PushTargetRow {
  readonly id: string
  readonly channel: PushChannel
  readonly credential: unknown // se valida con el esquema de su canal antes de usarla
}
export interface Deliverer {
  readonly channel: PushChannel
  send(
    target: PushTargetRow,
    payload: NoticePayload,
    opts: DeliveryOptions,
  ): Promise<DeliveryResult>
}
```

`webPushDeliverer` llama a `sendNotification` con `timeout` de `PUSH_SEND_TIMEOUT_MS` (15.000, el de `twilightstruggle`, l. 165): 2xx es `ok`; 404 o 410 es `gone` (RFC 8030 §7.3); un endpoint que `isAllowedPushEndpoint` ya no acepta es `gone`; cualquier otro error es `retry` y se registra con el host y el estado, sin el endpoint ni el cuerpo. Con `ok`, `last_ok_at = now()` y `failures = 0`; con `gone`, la fila se borra; con `retry`, `failures + 1`, y al llegar a `PUSH_DEAD_AFTER_FAILS` (3) seguidos se borra. Ningún error vuelve al navegador y no hay aviso de prueba que salga de la API (I-01), a diferencia de `POST /push/test` de `twilightstruggle` (l. 393): sería un envío a voluntad del cliente.

- **`POST /api/me/push-targets`**: guarda por `endpoint_hash` (SHA-256 del endpoint o del token); si ya existe, la fila pasa a esta cuenta y a esta sesión. `PUSH_TARGETS_PER_USER` (10): el undécimo sustituye al de `last_ok_at` (o `created_at`) más viejo, como `MAX_DEVICES` de `twilightstruggle` (l. 54). El cuerpo:

```ts
// apps/api/src/routes/me.ts
const b64url = z.string().regex(/^[A-Za-z0-9_-]+=*$/)
const timeZone = z
  .string()
  .max(64)
  .refine((tz) => tz === 'UTC' || Intl.supportedValuesOf('timeZone').includes(tz))
export const pushTargetBodySchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('webpush'),
    endpoint: z.string().max(1024).refine(isAllowedPushEndpoint),
    keys: z.object({ p256dh: b64url.max(200), auth: b64url.max(100) }),
    timeZone,
  }),
  z.object({ channel: z.literal('fcm'), token: z.string().min(1).max(4096), timeZone }),
  z.object({
    channel: z.literal('apns'),
    token: z.string().regex(/^[0-9a-f]{64,200}$/),
    environment: z.enum(['production', 'sandbox']),
    timeZone,
  }),
])
// 200 { ok: true, id }; 400 VALIDATION_ERROR; 400 canal_no_disponible para fcm y apns hasta que haya app.
```

`GET /api/me/notices` responde `{ ok: true, enabled, publicKey, prefs, timeZone, targets: [{ id, label, createdAt, lastOkAt, current }] }`; `PUT /api/me/notices` recibe `Partial<Record<NoticeKind, boolean>>` solo con claves apagables. Las cuatro rutas de avisos quedan fuera de la puerta de la fecha (D-09).

### 13.7 El emisor y `notice_log`

**Los avisos de juego los manda el barrido** (D-47; X-04; O-11): `noticeSweep(db, now, deliver)` (`packages/db/src/notices.ts`) se llama al final de cada pasada de `apps/api/src/tick/main.ts` (el cron de cada 5 minutos, procese o no días; `main.ts` l. 9 a 20) y después de cada `runTick` de `web` (`apps/api/src/index.ts` l. 48, 56 y 90). Con `AUTO_TICK` encendido, que es el defecto (`env.ts` l. 84), los días los procesa `web` y el cron sale con cero días; el barrido no depende de quién los procese. Solo corre si están las tres variables VAPID. En el proceso `tick` se espera a que acabe antes de salir; en `web` va en segundo plano.

Por cada usuario con al menos un `push_target`: si está ausente (`isAway`, §14.4), solo los `whileAway`; si es hora de silencio, ninguno `quiet`; por cada aviso encendido cuyo disparador se cumple, calcula su `ref` (`stage_digest`: la fecha local; `stage_ready`: `<raceKey>:<stageDay>`; `plan_ending`: el id del plan; `offer_received`: la fecha local; `away_warning`: `<inactiveSince>:<20|27>`; `away_over`: `away_since`), comprueba el tope y hace `INSERT INTO notice_log (user_id, kind, ref) … ON CONFLICT DO NOTHING RETURNING`: **solo si la fila es nueva se envía**, a todos sus `push_targets`. Dos procesos a la vez no duplican porque la fila se escribe antes de enviar (`unique (user_id, kind, ref)`).

**Los de seguridad no esperan al barrido** (13-k): los dispara el proxy de auth al ver el 200 y salen en segundo plano por `mailQueue.track` (§5.6), que no es solo del correo y que el cierre ordenado espera, como `later` de `twilightstruggle` (`push.ts` l. 105 a 116):

- `password_changed` al recuperar: `DELETE FROM push_targets WHERE user_id = $1 RETURNING …` y se envía con esa copia en memoria (§5.4, 5-d): quien recupera no hereda las suscripciones de un intruso. Al cambiar la contraseña: las filas de las otras sesiones se leen antes de reenviar a `better-auth` y, con el 200, se borran y reciben el aviso; las de sesión nula (sesión caducada) lo reciben y se quedan; la de este navegador no lo recibe (13-l).
- `new_sign_in`: a todas las filas de la cuenta, con `ref` la hora UTC (`2026-11-23T18`), que hace de tope de una por hora en el mismo `INSERT … ON CONFLICT`.

`notice_log` se purga a los `NOTICE_LOG_RETENTION_DAYS` (90) días (§15.4): ninguna `ref` vive tanto (un plan, 28 días de juego; una ausencia, 28 reales).

### 13.8 Ningún aviso destripa

La regla de E2 (`docs/retransmision.md` §11.9, l. 7280 a 7282; D-42; D-48): el disparador no mira el resultado, ninguna palabra depende de lo que pasó y el canario renderiza el aviso. `stage_digest` y `stage_ready` salen de `stageReadyNotice` (`packages/shared/src/broadcast/pageTitle.ts` l. 71 a 83) y de contar etapas veladas, que no depende del resultado; `path` y `tag` salen del `raceId` de fuera, porque `PreStageInfo` no lo lleva (mapa 02 §10). Los demás usan el nombre del corredor, cifras de ofertas y fechas. El canario (`spoilerCanary.test.ts` l. 206) pasa de `stageReadyEmail` a `noticePayload` (X-18), y el PR 14 borra `stageReadyEmail` (`emails.ts` l. 153 a 170) con sus tres tests (`emails.test.ts` l. 81 a 121), en el mismo PR que mueve el canario para que no quede un momento sin él. El comentario que la nombra en `pageTitle.ts` l. 5 es de W5 (H-16): el PR 14 no toca `packages/shared/src/broadcast/` y la corrección va por escrito (§20.3).

### 13.9 El contrato para la app

La app no tiene tecnología ni fecha (D-00d). Lo que la deja enchufar sin rehacer nada (mapa 02 §9): `push_targets.channel` y `credential jsonb` (Web Push guarda `endpoint` y claves; FCM, un token; APNs, un token y su entorno); un `Deliverer` por canal y fichero (`fcmDeliverer`, `apnsDeliverer` el día que existan, con FCM HTTP v1 y una cuenta de servicio, y APNs con la membresía de pago de Apple, mapa 02 §9); la carga `NoticePayload` con `path` de la web, que la app traduce a su ruta; y `POST /api/me/push-targets` con el cuerpo discriminado de §13.6, que hoy responde 400 `canal_no_disponible` a `fcm` y `apns`. El catálogo, las preferencias, el tope, el silencio y `notice_log` no cambian con la app: un aviso es uno por usuario, llegue por los canales que llegue.

---

**Injertos aplicados.** I-01 (§13.6), I-02 (§13.5), I-18 (§13.1, al revés por el dueño: tres avisos de seguridad y ningún correo de seguridad, como §3), I-21 (§13.4: lo que el dueño no cambió, nada fuera de `Notifications`; el «sin instrucción» lo sustituyó el dueño por la explicación), I-25 (§13.4 y §13.7), I-29 (§13.1).

**Objeciones resueltas.** O-05 (§13.2: `time_zone` del navegador y nombrada en Privacy), O-06 (§13.2: el silencio va a §21.4), O-08 (§13.4: la explicación existe por decisión del dueño y dice iOS 16.4, con el manifiesto mínimo que el dueño aceptó el 23 de noviembre), O-11 (§13.7), O-12 (§13.6), O-19 (§13.4 y §13.5).

**Huecos rellenados.** H-09 (§13.4, escrito como no comprobado y llevado a la prueba del dueño, §19.3), H-16 (§13.8).

**Contradicciones.** X-04 (§13.7), X-12 (§13.6), X-18 (§13.8).

**Decisiones de esta sección.**

- **13-a**, tres avisos de seguridad, `password_changed`, `new_sign_in` y `email_changed`, sin interruptor, fuera del tope y del silencio y también durante la ausencia (propuesta de §5 y §7, por `00-encargo.md` §9.2, punto 9, y §9.3; `email_changed` por §5.5). Manda sobre D-42 («ninguno de seguridad») y sobre D-53 («callados salvo `away_over`»), §22.5.
- **13-b**, `password_changed` lleva a `/forgot-password` y no a `/account/devices`.
- **13-c**, `stage_digest` cuenta solo las etapas veladas desde el último resumen.
- **13-d**, un aviso que no cabe en el tope se apunta en `notice_log` y no sale nunca.
- **13-e**, `Topic` es el SHA-256 del `tag` en base64url, cortado a 32.
- **13-f**, `Turn on` al seguir una carrera enciende también `stage_ready`.
- **13-g**, un manifiesto mínimo sin iconos, como el de `twilightstruggle`, por el dueño (`00-encargo.md` §9.5, punto 2): la explicación del iPhone dice iOS 16.4 o más. Sin metas de Apple, sin caché, sin funcionar sin red y sin ofrecer instalar: lo demás de D-00p sigue en pie.
- **13-h**, el aviso sin icono propio.
- **13-i**, el service worker pinta siempre; sin comprobación de pestaña visible.
- **13-j**, `PUSH_ALLOWED_HOSTS` pasa a la lista de sufijos de `twilightstruggle` (incluye `google.com`, que según su comentario usan los Chrome nuevos; no lo he comprobado). Manda sobre la lista exacta que proponía el glosario de la síntesis y sobre I-01.
- **13-k**, los avisos de seguridad salen del proxy al ver el 200, en segundo plano por `mailQueue.track`, sin esperar al barrido; `email_changed` sale de la ruta del panel, antes de cambiar el correo.
- **13-l**, al cambiar la contraseña reciben el aviso las suscripciones de las otras sesiones (que se borran) y las de sesión nula (que se quedan); la del propio navegador, no.
