# Mapa 03 · Los datos y la ausencia

Commit `2a29e6d` (la copia de trabajo, `5950e82`, solo añade documentos de E4). **Leídos enteros**
(líneas): `docs/diseno/e4-cuenta/00-encargo.md` 353 y `00-fase-mapas.md` 112,
`apps/api/src/auth.ts` 226, `geoIp.ts` 227 y `viewerCookie.ts` 73, `apps/web/src/pages/Privacy.tsx` 49
y `packages/db/src/teamControl.ts` 208. **Por tramos**, con la línea citada: `packages/db/src/schema.ts`
(`users`, `sessions`, `accounts`, `verifications`, `teams`, `riders`, `race_watch`, `news`,
`training_*`), `horizon.ts`, `adminUsers.ts`, `callups.ts`, `contracts.ts`, `economy.ts`,
`calendarRun.ts`, `rollover.ts`, `teamPlan.ts`, `train.ts`, `stageRun.ts`, `world.ts`, `tick.ts`,
`packages/shared/src/trainingDay.ts`, `apps/api/src/spoiler.ts`, `security.ts`, `mailer.ts`, `env.ts`,
`index.ts`, `routes/authProxy.ts`, `routes/geo.ts`, `routes/riders.ts`, `routes/me.ts`,
`apps/web/src/pages/Register.tsx` y `Account.tsx`, `domain/entryForms.ts`, `theme.ts`, `net.ts`,
`api/watch.ts`, las migraciones 0001, 0044 y 0048, `docs/ops.md` (l. 6 a 40, 153 a 175, 258 a 350,
382 a 400) y, del paquete instalado `better-auth` 1.6.25, `api/routes/update-user.mjs`,
`password.mjs`, `email-verification.mjs`, `db/internal-adapter.mjs` y `@better-auth/core`
`utils/ip.mjs`. El mapa 01 cubre rutas, tokens y límites; aquí no se repiten.

**Cómo se ha medido.** Un clon propio de `2a29e6d` en `<scratchpad>/mapa03/clon` (`pnpm install
--frozen-lockfile`, `pnpm exec tsc -b`, 34 s) y dos scripts sobre el patrón de
`docs/diseno/e3-visual/capturas/mundo.mjs`: PGlite servida por socket, `runMigrations`, génesis con
`runTick` (`forceDays: 0`, semilla de producción) y la API de verdad (`buildApp` y `createAuth`) por
`app.inject`, con un `Mailer` que guarda los correos y el logger de Fastify a `info` volcado en un
fichero. `exp.mjs`: cuatro cuentas con corredor el día 0 (correo confirmado con SQL), tres de ellas
con contrato en un equipo WorldTour escrito con SQL como en `mundo.mjs`, dos premium que toman su
equipo; 28 días de tick sin que nadie entre (unos 290 s, 10 s por día de juego en esta máquina);
después, borrar una cuenta por `POST /api/auth/delete-user` y contar filas. `exp2.mjs`: cookies,
`last_seen_at`, IP con dos saltos y los logs de los enlaces. Salidas en
`<scratchpad>/mapa03/resultado.json` y `resultado2.json` (se pierden con la sesión).

## Resumen

1. **La IP se guarda**, al revés de lo que dice `Privacy.tsx` l. 27 y `docs/ops.md` l. 271: en
   `sessions.ip_address` (con su `user_agent`) en cada sesión, y en los logs de Fastify en cada
   petición (con el nivel `info`, el de por defecto). Medido: una sesión abierta con `X-Forwarded-For: 198.51.100.23` guarda esa IP; con dos
   IP en la cabecera guarda `""` (§1, §4).
2. **Los logs llevan el correo en claro dentro de los enlaces**: la línea `incoming request` registra
   la URL entera, y la de `verify-email` lleva un JWT cuyo cuerpo es `{"email":"…"}` en base64url; la
   de `reset-password` lleva el token en la ruta. El `maskEmail` de `mailer.ts` no los toca (§4).
3. **El borrado de autoservicio funciona y no es atómico**: `releaseUserToWorld` y el `DELETE` de
   `better-auth` van en dos pasos (`update-user.mjs` l. 334 a 337), el del panel en una transacción
   (`adminUsers.ts` l. 168 a 174). Medido: cuenta, sesiones, credenciales y `race_watch` se van; el
   corredor (con su nombre), el equipo (con el nombre que eligió la persona), su plan, su bitácora, sus
   transacciones, su contrato y su maillot se quedan; una fila de `verifications` con el id del
   usuario sobrevive hasta su caducidad (§3).
4. **`Privacy.tsx` tiene cuatro afirmaciones falsas** y dos imprecisas (§5): la IP, «Only a session
   cookie» (existe `cs_viewer`, 90 días, y siete claves de `localStorage`), «That's it» (hay sesiones,
   `last_seen_at`, lo visto en `race_watch`, preferencias) y «Ask and…» (el borrado es de autoservicio
   y el corredor no se borra, pasa a la máquina).
5. **`users.last_seen_at` existe** (`schema.ts` l. 125, migración 0048, `touchLastSeen` en
   `horizon.ts` l. 585 a 603), con datos desde el commit `d598141` del 8 de octubre de 2026. **Nadie la
   lee** y no la escribe cualquier petición con sesión, solo las que resuelven el espectador: medido,
   entrar y `POST /api/riders` no la escriben; `GET /api/me/horizon` sí (§6).
6. **El tick no distingue a un humano que no entra de uno que entra** (§7): ningún módulo del tick lee
   `last_seen_at` ni `premium`. En 28 días medidos, los cuatro corredores ausentes entrenaron los 28
   días (el entrenador decide en `mixto` sin plan), los que tenían contrato entraron en 2 escuadras, corrieron 2
   etapas con órdenes automáticas y cobraron su salario, y los dos equipos con dueño siguieron con su calendario
   natural.
7. **Un agente libre ausente se queda parado para siempre**: no se inscribe en nada, no corre más que
   el campeonato de su país, y si su valoración baja de 0,42 no recibe ofertas (medido: 0 carreras, 0
   ofertas, 0 de dinero en 28 días). Un contrato que vence devuelve al ausente a ese estado (§7).
8. **La fecha de nacimiento** no tiene sitio hoy: sería la migración 0055 en `users`, un campo de
   `better-auth` en `auth.ts` y un tercer `Field` en `Register.tsx`; se tocan 8 ficheros de tests (4 a
   través de un fixture) y 2 scripts que registran cuentas (§8).

## §1. Las tablas de la cuenta, columna a columna

**`users`** (`schema.ts` l. 100 a 132). Escriben la tabla: `better-auth`, `adminUsers.ts` l. 157,
`horizon.ts` l. 593, `teamControl.ts` l. 63, `theme.ts` l. 21 y `watch.ts` l. 132 y 292 (no hay más
`update(users)` en `packages/db/src`).

| Columna                                          | Línea     | Quién la escribe                                                                          | Dato personal         |
| ------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------- | --------------------- |
| `id` uuid                                        | 101       | la base (`generateId: false`, `auth.ts` l. 219 a 221)                                     | identificador         |
| `name`                                           | 102       | `better-auth` al registrarse: **la parte local del correo** (`Register.tsx` l. 115 a 116) | sí, deriva del correo |
| `email` citext único                             | 103       | registro y cambio de correo                                                               | sí                    |
| `email_verified`                                 | 104       | `better-auth` al abrir el enlace; el panel (`adminUsers.ts` l. 153)                       | no                    |
| `image`                                          | 105       | nadie en nuestro código; `POST /api/auth/update-user` podría (mapa 01 §1)                 | potencial             |
| `password_hash`                                  | 108       | nadie: sin uso desde `better-auth` (comentario l. 106 a 107)                              | no                    |
| `locale`                                         | 109       | nadie: vale `'es'` para todos, nadie la lee (`emails.ts` l. 154 usa `'en'` fijo)          | no                    |
| `is_admin`, `premium`                            | 110, 113  | el panel y `setUserPremium`                                                               | no                    |
| `spoiler_scope`, `horizon_rev`, `reveal_confirm` | 115 a 127 | `watch.ts` l. 132 y 292                                                                   | preferencia           |
| `last_seen_at`                                   | 125       | `touchLastSeen` (§6)                                                                      | sí, conducta          |
| `theme`                                          | 129       | `PUT /api/me/theme` (`theme.ts` l. 21)                                                    | preferencia           |
| `created_at`, `updated_at`                       | 130 a 131 | la base y `better-auth`                                                                   | fecha de alta         |

**`sessions`** (l. 135 a 146): `token` en claro (l. 137, mapa 01 §2), `expires_at`, **`ip_address`**
(l. 139) e **`user_agent`** (l. 140), que escribe `createSession` de `better-auth`
(`internal-adapter.mjs` l. 177 a 178) con `getIp` (`core/dist/utils/ip.mjs` l. 201 a 216: lee
`x-forwarded-for`; `disableIpTracking` lo apagaría, l. 202). Nadie de nuestro código lee
`ip_address` ni `user_agent` (búsqueda sin resultados en `apps` y `packages`). Medido
(`resultado.json`, `sesionesTodas`): `198.51.100.23` y `Mozilla/5.0 (verificado)` en la sesión que abre
el enlace de verificación con esa cabecera; `""` sin cabecera; y `""` con
`X-Forwarded-For: 203.0.113.51, 10.0.0.3` (`resultado2.json`), que el mapa 01 §3 solo había deducido.

**`accounts`** (l. 149 a 165): una fila `provider_id = 'credential'` por usuario, con `password`
(l. 162), un hash scrypt (`better-auth/dist/crypto/password.mjs` l. 6), no un cifrado. Las columnas de
OAuth (l. 156 a 161) van vacías: solo hay correo y contraseña (`00-encargo.md` §9.1, punto 6).

**`verifications`** (l. 168 a 175), sin clave hacia `users`. Con la configuración de hoy solo la
escribe la recuperación: `identifier = reset-password:<token>`, `value = <id del usuario>`, una hora
(`password.mjs` l. 73 a 77). La verificación y el cambio de correo no dejan fila: son JWT firmados
que llevan el correo dentro (`email-verification.mjs` l. 13 a 28; `update-user.mjs` l. 457 a 505).

## §2. Todo lo que apunta a `users`

| Tabla y columna       | Línea de `schema.ts` | `onDelete`                     | Qué hace el borrado                         |
| --------------------- | -------------------- | ------------------------------ | ------------------------------------------- |
| `sessions.user_id`    | 141 a 143            | `cascade`                      | se borran                                   |
| `accounts.user_id`    | 153 a 155            | `cascade`                      | se borran (el hash con ellas)               |
| `race_watch.user_id`  | 944 a 946            | `cascade`                      | se borra lo visto y lo seguido              |
| `teams.owner_user_id` | 270                  | ninguno (`NO ACTION`)          | `releaseUserToWorld` lo pone a null antes   |
| `riders.user_id`      | 376                  | ninguno (`NO ACTION`)          | `releaseUserToWorld` lo pone a null antes   |
| `respaldo_mundo_1.*`  | migración 0044       | sin claves (`CREATE TABLE AS`) | nada: el id del usuario queda en las copias |

No hay más columnas que nombren a `users` en el esquema (`grep` de `users.id`: las cinco de arriba).
`teamControl.ts` l. 197 dice que `riders` y `teams` son «las dos únicas referencias a `users` sin
`ON DELETE CASCADE`»: es cierto, y su «sesiones y credenciales se van solas» omite `race_watch`, que
también. El esquema `respaldo_mundo_1` (`0044_reinicio_del_mundo.sql` l. 101 a 129) guarda una copia
de `riders` y `teams` del mundo 1 con su `user_id` y `owner_user_id`, y ninguna migración lo ha
borrado todavía (el `DROP SCHEMA` solo está escrito como comentario, l. 65; `docs/ops.md` l. 342 a
344). Lo que queda ahí de una cuenta borrada es un uuid sin correo.

## §3. El borrado

**Dos caminos.** Autoservicio: `POST /api/auth/delete-user` con contraseña (el gancho `before` de
`auth.ts` l. 180 a 192 la exige; `better-auth` la comprueba, `update-user.mjs` l. 293 a 299), después
`beforeDelete` → `releaseUserToWorld` (su propia transacción, `teamControl.ts` l. 200 a 208), después
`internalAdapter.deleteUser` (sesiones, cuentas, usuario: `internal-adapter.mjs` l. 148 a 160) y
`deleteUserSessions` (`update-user.mjs` l. 334 a 337). **No es una transacción**: si el `DELETE`
fallara, el corredor ya sería NPC y la cuenta seguiría viva. Panel: `deleteUserAsAdmin` hace lo mismo
en una transacción (`adminUsers.ts` l. 168 a 174). La web lo explica en `Account.tsx` l. 329 a 330
(pantalla): `This cannot be undone. Your rider and your team stay in the world, run by the game, and
your email becomes free to use on another account.`

**Medido** (`exp.mjs`, la cuenta `borrado@example.com` el día 28, con corredor `Francisco Otxoa`,
equipo tomado y renombrado `Equipo De Borrado`, un plan, una carrera seguida, el modo oscuro y una
recuperación pedida justo antes). Sin contraseña: 400 `Enter your password to delete your account.`
Con ella: 200 `{"success":true,"message":"User deleted"}` y cuatro `Set-Cookie` a `Max-Age=0`:
`better-auth.session_token`, `better-auth.session_data`, `better-auth.dont_remember` y `cs_viewer`
(esta la borra `authProxy.ts` l. 17 a 20 y 52 a 53, solo en el dispositivo que borra).

| Filas de esa persona                      | Antes   | Después                  |
| ----------------------------------------- | ------- | ------------------------ |
| `users`, `accounts`                       | 1 y 1   | 0 y 0                    |
| `sessions`                                | 3       | 0                        |
| `race_watch`                              | 1       | 0                        |
| `verifications` con su id en `value`      | 1       | **1** (caduca a la hora) |
| `riders` con su `user_id` / `teams` suyos | 1 / 1   | 0 / 0                    |
| la fila del corredor, con su nombre       | 1       | **1**                    |
| un equipo llamado `Equipo De Borrado`     | 1       | **1**                    |
| `training_plans`, `rider_daily_log`       | 1, 28   | 1, 28                    |
| `transactions`, `contracts`, `team_kits`  | 4, 1, 1 | 4, 1, 1                  |

Un tick después el corredor sigue en el mismo equipo, con `user_id` null, 80 de dinero y sin retirar.
**Lo que queda con datos de la persona**: el nombre del equipo, que es texto libre de 2 a 40
caracteres (`updateOwnedTeam`, `teamControl.ts` l. 170 a 178); el maillot que eligió (`team_kits`,
`set_by = 'manager'`, `schema.ts` l. 334); el nombre del corredor, que **no** lo escribe la persona
(sale de `generateUniqueRiderName` con una semilla, `routes/riders.ts` l. 260 a 263); y la fila de
`verifications` hasta su caducidad. No hay mensajes ni chat en el esquema. Las copias (`scripts/backup.sh`
guarda los últimos 14 volcados, `docs/ops.md` l. 15) y `respaldo_mundo_1` conservan lo anterior.

## §4. Los datos personales de verdad

| Dónde                                                                 | Qué                                                                                                                               | Cuánto tiempo                                                 | Fuente                                                                                                    |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `users`                                                               | correo, nombre derivado del correo, alta, `last_seen_at`, preferencias                                                            | hasta el borrado                                              | §1                                                                                                        |
| `accounts`                                                            | hash scrypt de la contraseña                                                                                                      | hasta el borrado                                              | §1                                                                                                        |
| `sessions`                                                            | IP, agente, token, fechas, por sesión                                                                                             | 7 días renovables (mapa 01 §3); la fila no se purga, no lo sé | `schema.ts` l. 139 a 140                                                                                  |
| `race_watch`                                                          | qué carreras sigue y hasta dónde ha visto cada etapa                                                                              | hasta el borrado o el reinicio del mundo                      | `schema.ts` l. 941 a 976                                                                                  |
| `riders` y su rastro                                                  | país elegido (preseleccionado por la IP), corredor, entrenamiento, dinero                                                         | para siempre (pasa a NPC)                                     | §3                                                                                                        |
| Navegador                                                             | `better-auth.session_token`; `cs_viewer` (90 días)                                                                                | sesión; `Max-Age=7776000` medido                              | `viewerCookie.ts` l. 52 a 56                                                                              |
| `localStorage`                                                        | `cs-theme`, `cs:signed-in`, `cs.adminHint`, `cs.adaptiveIgnored`, `cs.adaptiveAsked`, `cs.commentary`, `cs.watch.<carrera>.<día>` | sin caducidad                                                 | `theme.ts` l. 18; `net.ts` l. 51; `adminHint.ts` l. 17; `api/watch.ts` l. 135 a 197; `commentary.ts` l. 9 |
| Logs de Fastify (`LOG_LEVEL` `info` por defecto, `env.ts` l. 33 a 35) | cada petición: método, URL entera, `host`, `remoteAddress` (la IP de `X-Forwarded-For` con `trustProxy`)                          | lo que guarde Railway: no lo sé                               | `index.ts` l. 64; `app.ts` l. 160                                                                         |
| Logs del correo                                                       | destinatario enmascarado (`l***@gmail.com`) y asunto                                                                              | íd.                                                           | `mailer.ts` l. 65 a 69, 85                                                                                |
| Resend                                                                | correo, asunto y cuerpo de los tres correos de cuenta                                                                             | lo que guarde Resend: no lo sé                                | `mailer.ts` l. 45                                                                                         |
| ipinfo.io, ipwho.is, ipapi.co                                         | la IP, al pedir `GET /api/geo/country`                                                                                            | en nuestra memoria, 6 h el acierto, 1.000 entradas            | `geoIp.ts` l. 62 a 113; `routes/geo.ts` l. 90                                                             |

**Los enlaces en los logs, medido** (`logs.ndjson` de `exp.mjs` y `resultado2.json`): la línea
`incoming request` de abrir el enlace de verificación trae
`/api/auth/verify-email?token=eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6…`, cuyo segundo tramo descodificado
empieza `{"email":"nuevo@example.com",`; el del cambio de correo lleva los dos correos (`update-user.mjs`
l. 491 y 505); el de recuperación, `GET /api/auth/reset-password/<token>?callbackURL=…`, con el token
entero, y `remoteAddress` `203.0.113.50`. No hay `redact` ni `serializers` en la configuración del
logger (búsqueda sin resultados en `apps/api/src`). Ni Sentry ni ningún otro tercero en el código: está
«pendiente de configurar» (`docs/ops.md` l. 260 a 261). La CSP solo deja hablar con el propio origen
(`app.ts` l. 178 a 187).

## §5. `Privacy.tsx`, frase a frase (comprobado en producción con GET: el fragmento `Privacy-CzTMl0z1.js` sirve el mismo texto)

| Frase (pantalla)                                                                                 | Línea   | Veredicto                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Cycling Star is a personal, non-commercial project.`                                            | 14      | no comprobable en el código; `premium` existe «a futuro de pago» (`schema.ts` l. 111 a 112)                                 |
| `We keep data collection to the minimum needed to run the game.`                                 | 14      | discutible: `last_seen_at`, IP y agente no los necesita el juego hoy (nadie los lee, §1 y §6)                               |
| `Your email address and an encrypted password (for your account),`                               | 19      | imprecisa: es un hash scrypt, no un cifrado (§1)                                                                            |
| `and your in-game data (your rider, training orders, results). That's it.`                       | 19 a 20 | **falsa**: faltan sesiones con IP y agente, `last_seen_at`, `race_watch`, preferencias y el nombre sacado del correo        |
| `When you create a rider we may look up your country from your IP to pre-select a flag.`         | 25      | verdadera (`routes/geo.ts` l. 90; la pide la pantalla de crear corredor)                                                    |
| `Our server asks a public IP-to-country service (ipapi.co, ipinfo.io or ipwho.is)…`              | 26 a 27 | verdadera; el orden real es ipinfo.io, ipwho.is, ipapi.co (`geoIp.ts` l. 62 a 93)                                           |
| `The lookup is transient`, `your IP address is not stored`                                       | 27      | **falsa**: la consulta no se guarda en la base (caché en memoria 6 h), pero la IP sí, en `sessions` y en los logs (§4)      |
| `the country we guess is always yours to change.`                                                | 28      | verdadera al crear; después el país del corredor no se cambia (no hay ruta: `routes/riders.ts`, lista de l. 175 a 1042)     |
| `Only a session cookie to keep you logged in.`                                                   | 33      | **falsa**: `cs_viewer`, 90 días, puesta medida en `GET /api/me/horizon`; más siete claves de `localStorage`                 |
| `No third-party tracking or ad cookies.`                                                         | 33      | verdadera (CSP de `app.ts` l. 178 a 187; sin guiones de terceros)                                                           |
| `Ask and your account and rider data will be removed.`                                           | 38      | **falsa**: no hay a quién pedirlo (`00-encargo.md` §2.3, punto 6), se borra uno mismo, y el corredor se queda como NPC (§3) |
| `Backups roll off on their retention window.`                                                    | 38 a 39 | no comprobable: 14 volcados si el cron de `backup.sh` está puesto (`docs/ops.md` l. 15 a 25), y `respaldo_mundo_1` no rueda |
| `This notice is informational and will be reviewed against applicable law before public launch.` | 43 a 45 | promesa pendiente; a confirmar con un abogado                                                                               |

`docs/ops.md` l. 271 a 273 repite «la IP transitoria de geolocalización no se persiste»: cierto de la
geolocalización, engañoso como frase sobre la IP. `geoIp.ts` l. 29 a 31 dice lo mismo («No se persiste
nada»), cierto de ese módulo.

## §6. `last_seen_at`

- **Columna**: `users.last_seen_at timestamptz`, nula (`schema.ts` l. 121 a 125), añadida por
  `0048_lo_visto.sql` l. 20. La migración entró en `main` con `d598141` (PR #288) el **8 de octubre de
  2026** a las 14:07 (+01:00); el diario de drizzle la fecha el 3 de octubre (`_journal.json`,
  `when`). La fecha del despliegue no está en el repositorio: el historial empieza ese día o poco
  después. El reinicio del mundo (0044) es anterior, así que no lo borró.
- **Quién la escribe**: `touchLastSeen` (`horizon.ts` l. 585 a 603): `update … set last_seen_at = now()`
  si es nula o tiene más de `SPOILER.lastSeenEveryMin` (60, `broadcast/constants.ts` l. 210) minutos,
  detrás de un memo por proceso (l. 185 a 188). La llama `resolveViewer` en `spoiler.ts` l. 273 a 276
  sin esperarla, **solo cuando la sesión es de verdad** (no con `cs_viewer`).
- **Cuándo**: solo en las peticiones que resuelven el espectador (`request.viewer()`, `horizon()`,
  `spoilerApplies()`: 50 llamadas en 7 ficheros de rutas, contadas con `grep` fuera de los tests).
  `GET /api/riders/me` no es una de ellas (`routes/riders.ts` l. 204 a 210 usa `currentUserId`).
  Medido: tras entrar, crear el corredor y tomar el equipo, las tres cuentas que no hicieron nada más
  seguían con nulo; la escribió la tanda `PUT /api/riders/me/plan`, `PUT /api/me/follow/…`, `PUT
/api/me/theme` (`exp.mjs`) y `GET /api/me/horizon` (`exp2.mjs`); los `PUT` de `routes/me.ts` pasan
  por `sessionUser`, que llama a `request.viewer()` (l. 76 a 82). En producción `spoilerMode` está en `on` (GET `/health` de hoy), y la web pide el
  horizonte desde `useHorizon` (`queryClient.ts` l. 286 a 293), así que una visita normal la escribe
  (deducido, no medido en producción).
- **Quién la lee**: nadie (`grep` en `apps` y `packages`: solo el esquema y `touchLastSeen`). El nombre
  `lastSeenAt` de `OfflineBanner.tsx` l. 49 es otra cosa (la última respuesta del navegador).

## §7. Qué hace el mundo con un humano que no entra

El tick corre por día de juego, en una transacción, en este orden: rollover, carreras, entrenamiento,
convocatorias, mercado, nómina y finanzas de equipo (`tick.ts` l. 331 a 345). Nada de eso mira si la
persona entra.

| Decisión                          | Si nadie la toma                                                                                                                                                                                                                                   | Línea                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Entrenamiento del día             | `training_mode` nace `mixto` (`schema.ts` l. 390); sin orden ni bloque del plan vivo ni plan de equipo, decide el entrenador. El plan vivo vale 28 días desde su `start_day` (`train.ts` l. 135 a 138); en `manual`, el hueco es `descanso_activo` | `trainingDay.ts` l. 117 a 136                                                                          |
| Órdenes de etapa                  | piloto automático por atributos y puesto en la general, igual que un NPC; sin él, `libre` y `reservon`                                                                                                                                             | `stageRun.ts` l. 413 a 443, 213 a 220                                                                  |
| Qué carreras corre (con equipo)   | la escuadra la elige `selectSquad` para todos los equipos; las preferencias guardadas (`rider_race_prefs`) siguen contando                                                                                                                         | `calendarRun.ts` l. 538 a 545, 618                                                                     |
| Qué carreras corre (agente libre) | solo las que él mismo inscribió (`race_entries`) y el campeonato de su país, que incluye a todo humano elegible                                                                                                                                    | `calendarRun.ts` l. 705 a 735, 257 a 261                                                               |
| Convocatoria y moral              | se deriva de la escuadra congelada; ser convocado sube 2 la moral, no serlo a un objetivo marcado la baja 8                                                                                                                                        | `callups.ts` l. 86 a 95, 166 a 186, 199 a 210                                                          |
| Ofertas                           | con contrato vigente, ninguna; libre, una cartera de 3 a 5 que caduca a los 21 días, y **ninguna si la valoración es menor de 0,42**. Nadie acepta por él                                                                                          | `contracts.ts` l. 37, 75, 106 a 148                                                                    |
| Contrato que vence                | vuelve a agente libre                                                                                                                                                                                                                              | `callups.ts` l. 45 a 67                                                                                |
| Salario y alquiler                | cada 7 días, como a cualquiera                                                                                                                                                                                                                     | `economy.ts` l. 65 a 87                                                                                |
| Retirada                          | solo por la edad dura de 39 (`lifecycle.ts` l. 12): unas 19 temporadas de 364 días, unos 1.730 días reales a cuatro por día (estimado)                                                                                                             | `rollover.ts` l. 264 a 290                                                                             |
| Equipo de un mánager              | calendario natural salvo excepciones guardadas en `team_race_plan`; sin plan de equipo; presupuesto semanal; neoprofesionales al cambiar de temporada; no entra en los repartos de los bots                                                        | `teamPlan.ts` l. 65 a 79; `economy.ts` l. 97 a 130; `rollover.ts` l. 347 a 372; `world.ts` l. 770, 787 |
| Premium                           | ningún módulo del tick lo lee (`grep premium` en `packages/db/src`: solo `teamControl.ts`, `adminUsers.ts` y el esquema)                                                                                                                           | §7                                                                                                     |

**Medido, 28 días de juego (7 reales) sin que nadie entre** (`exp.mjs`, días 1 a 28):

| Cuenta                            | Situación                    | Días entrenados (sesiones)                                                 | Carreras                       | Dinero | CTL     | Moral   |
| --------------------------------- | ---------------------------- | -------------------------------------------------------------------------- | ------------------------------ | ------ | ------- | ------- |
| `ausente` (FR, clásicas)          | agente libre                 | 28 (`fondo` 12, `descanso_activo` 8, `bajada_paves` 4, `descanso_total` 4) | 0; 0 ofertas                   | 0      | 45 → 50 | 60 → 60 |
| `contratado` (IT, velocidad)      | contrato en un WorldTour bot | 25, 2 de carrera y 1 de viaje                                              | 2 escuadras; 2 etapas corridas | 56     | 45 → 52 | 60 → 62 |
| `manager` (BE, clásicas, premium) | dueño de su WorldTour        | 22, 2 de carrera y 4 de viaje                                              | 2 escuadras; 2 etapas corridas | 80     | 45 → 55 | 60 → 63 |
| `borrado` (ES, escalada, premium) | dueño, con plan de bloques   | 28 (`puertos` 8 y otras siete)                                             | 0                              | 80     | 45 → 52 | 60 → 60 |

Ninguna fila de `stage_orders` (todo fue piloto automático), 4 filas de `race_callups` por corredor
con equipo, `team_race_plan` vacío y presupuestos de los dos equipos con dueño de 5,6 y 6,2 millones
el día 28. **Lo que ya pasa solo**: entrenar, correr con órdenes automáticas, cobrar, envejecer. **Lo
que se queda parado**: aceptar una oferta, inscribirse un agente libre, cambiar el plan (que caduca a
los 28 días y deja al entrenador), el plan de equipo y las excepciones del calendario, fichar.

## §8. La fecha de nacimiento: dónde encajaría (sin proponer)

- **Columna**: en `users` (`schema.ts` l. 100 a 132), que hoy no la tiene; la siguiente migración es
  la **0055** (la última es `0054_modo_oscuro.sql`). Las cuentas que ya existen quedarían con nulo.
- **Servidor**: `better-auth` acepta campos propios de usuario en el bloque `user` de `auth.ts`
  (l. 150 a 173); si el campo es obligatorio, `POST /api/auth/sign-up/email` sin él falla. La validación
  de la edad no existe en ningún sitio.
- **Formulario**: `Register.tsx` l. 95 a 124 (estado y envío; `name` sale del correo, l. 115 a 116) y
  los dos `Field` de l. 145 a 170; la validación vive en `registerProblem(email, password)`
  (`domain/entryForms.ts` l. 32 a 39).
- **Lo que se rompería** si el campo fuera obligatorio en el servidor: los registros por HTTP de
  `authFlow.test.ts` (l. 72, 274, 368 y 423), `adminPanel.test.ts` l. 34 y el fixture
  `__fixtures__/spoilerWorld.ts` l. 244, que usan `responses.test.ts`, `spoilerCanary.test.ts`,
  `spoilerDiff.test.ts` y `spoilerOutcomes.test.ts`; fuera de los tests, `apps/web/e2e/world/build.mjs`
  l. 138 y `docs/diseno/e3-visual/capturas/mundo.mjs`. En la web, `entryForms.test.ts` (l. 16, la firma
  de `registerProblem`) y `Register.test.tsx` l. 30 («el correo y la contraseña en su Field»).

## Lo que este mapa no ha podido comprobar

1. **Qué guarda de verdad la base de producción**: si `sessions.ip_address` está lleno o vacío depende
   de que Railway mande una sola IP en `X-Forwarded-For` (mapa 01 §4.3); solo con GET no se ve.
2. **`LOG_LEVEL` en producción y cuánto guarda Railway los logs**: si fuera `warn` o más, las líneas
   `incoming request` no se escribirían. No está en el repositorio.
3. **Si el cron de `backup.sh` y los respaldos gestionados de Railway están puestos**, y cuánto
   guarda Resend: la frase de las copias de `Privacy.tsx` queda sin veredicto.
4. **La fecha exacta del despliegue de la 0048**: solo la del commit.
5. **Una ausencia larga**: se midieron 28 días de juego; el vencimiento de un contrato, el cambio de
   temporada y la retirada se leen en el código y no se han corrido.
6. **Si se purgan las filas caducadas de `sessions` y `verifications`**: no encontré una tarea que lo
   haga en nuestro código; lo que haga `better-auth` por su cuenta no lo he medido.
7. **Lo legal** (si estas finalidades bastan, qué plazo de conservación vale, si el nombre del equipo
   de alguien que se borra es dato personal): a confirmar con un abogado.
