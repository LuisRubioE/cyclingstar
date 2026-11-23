# Glosario canónico de `docs/cuenta.md` (E4 · La cuenta y el contacto)

Vocabulario ÚNICO del documento final. Dos redactores escriben en paralelo y usan estos nombres tal cual. Reglas:

1. Todo lo que se nombre (tabla, columna, ruta, opción, constante, tipo, cookie, correo, aviso, pantalla, componente, test, PR, texto de pantalla) está aquí. Si falta, el redactor lo propone al final de su sección en «Propuesto para el glosario» y no renombra nada.
2. Identificadores de código en inglés; códigos de error de la API nuevos en mayúsculas como los de `better-auth` (`BIRTH_DATE_REQUIRED`) y los propios de la API en castellano como hoy (`no_encontrado`).
3. Las decisiones que dan contenido a estos nombres están en `00-decisiones.md`; los valores de las constantes, aquí y en §16.
4. Base: `propuestas/jugador.md`, fundida con `atacante.md` e `incremental.md` (`juicios/veredicto.json`). Los alias de las propuestas, en §G.13.

---

## G.1 Palabras de la prosa (castellano)

| Término                      | Qué es                                                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| la base                      | `propuestas/jugador.md`, 86 puntos frente a 85 de `atacante` y 81 de `incremental` (D-01)                                                                                                                                  |
| los diez atacantes, A1 a A10 | los de `atacante.md` §1.1: relleno de credenciales, rival dirigido, ladrón de sesión, dueño de un buzón ajeno, atacante del panel, quemador de cuota, enumerador, menor que miente, abusador de avisos, escáner de enlaces |
| el límite por cuenta         | L1: los fallos de entrada contra un correo, cuenten o no de un aparato conocido; vive en `auth_limits`                                                                                                                     |
| la reserva                   | sumar el intento en `auth_limits` ANTES de comprobar la contraseña, con `INSERT … ON CONFLICT … RETURNING` (D-22)                                                                                                          |
| el aparato conocido          | el navegador que trae una `cs_device` válida para ese correo                                                                                                                                                               |
| la página de botón           | la página de la web donde aterriza todo enlace de correo; el token llega en `#token=` y nada cambia hasta pulsar (D-12)                                                                                                    |
| el enlace viejo              | `?token=` y `GET /api/auth/reset-password/:token`, que siguen valiendo `LEGACY_LINK_GRACE_DAYS`                                                                                                                            |
| el deshacer                  | el enlace de `email_changed` que devuelve la cuenta a la dirección vieja durante `UNDO_EMAIL_CHANGE_H`                                                                                                                     |
| la rama ocupada              | el cambio de correo a una dirección que ya tiene cuenta: se manda igual la aprobación y se avisa a la ocupada (D-14)                                                                                                       |
| el presupuesto               | `MAIL_DAILY_BUDGET`, los correos del día UTC, con `MAIL_RESET_RESERVE` reservados a recuperaciones (D-26)                                                                                                                  |
| el panel raíz                | el panel de `/admin` de la cuenta cuyo correo confirmado es `ADMIN_EMAIL` (`adminUsers.ts` l. 11 a 26)                                                                                                                     |
| la lista blanca              | las doce rutas de `better-auth` que el proxy deja pasar (`AUTH_ALLOWED_PATHS`); el resto, 404 (D-29)                                                                                                                       |
| el aviso                     | una notificación del navegador o de la app; nunca un correo (D-00c)                                                                                                                                                        |
| el gemelo en la web          | lo que la web enseña de lo mismo que dice un aviso, para quien no lo recibe (`Ready to watch`, el aviso del plan, `Welcome back`)                                                                                          |
| el barrido                   | `noticeSweep`: busca lo que hay que avisar y lo manda, idempotente por `notice_log` (D-47)                                                                                                                                 |
| la ausencia                  | el modo ausencia: `away_since` y `away_until` en `users`; ausente es `away_until > now()`                                                                                                                                  |
| la regla del mes             | la de E7: un mes real sin visita y el corredor pasa al entrenador; E4 da `inactiveSince` y el aviso, no la regla                                                                                                           |
| una visita                   | toda petición con sesión que pase por `get-session`; es el «login» de la regla del mes (D-40)                                                                                                                              |
| el silencio                  | de `NOTICE_QUIET_START_H` a `NOTICE_QUIET_END_H` en `users.time_zone` (D-43)                                                                                                                                               |
| la puerta de la fecha        | lo que ve una cuenta sin `birth_date`: `/account/birth-date` en la web y 403 `BIRTH_DATE_REQUIRED` en la API (D-09)                                                                                                        |
| la puerta neutra             | el registro no anuncia la edad mínima junto al campo (D-04)                                                                                                                                                                |
| la prueba del dueño          | lo que el dueño prueba en su teléfono y su buzón al cerrar (§19): iPhone con iOS 26, un buzón con Safe Links, registro y recuperación                                                                                      |

## G.2 Tablas y columnas (las nuevas y las que cambian)

| Tabla.columna                          | Tipo                                       | Qué guarda                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users.birth_date`                     | `date` nula                                | la fecha de nacimiento declarada (DD-09 A); clave de Drizzle `birthDate`                                                                                                                                                 |
| `users.terms_version`                  | `text` nula                                | la versión de las condiciones aceptada (`TERMS_VERSION`)                                                                                                                                                                 |
| `users.terms_accepted_at`              | `timestamptz` nula                         | cuándo                                                                                                                                                                                                                   |
| `users.away_since`, `users.away_until` | `timestamptz` nulas, con `CHECK` de pareja | la ausencia                                                                                                                                                                                                              |
| `users.time_zone`                      | `text` nula                                | zona IANA del navegador al encender los avisos                                                                                                                                                                           |
| `users.notice_prefs`                   | `jsonb not null default '{}'`              | los avisos encendidos o apagados; `{}` vale los defectos de `NOTICE_DEFAULTS`                                                                                                                                            |
| `users.email_undeliverable_at`         | `timestamptz` nula                         | el último rebote o queja de Resend                                                                                                                                                                                       |
| `users.device_epoch`                   | `integer not null default 0`               | entra en la firma de `cs_device`; subirlo las invalida todas                                                                                                                                                             |
| `users.locale`                         | `text`, defecto `'en'` (hoy `'es'`)        | la lengua de `Accept-Language` al registrarse (D-07)                                                                                                                                                                     |
| `users.name`                           | `text`                                     | `'Player'` para todos (D-08)                                                                                                                                                                                             |
| `sessions.ip_address`                  | `text`                                     | vacía: `''` desde la 0056 y `disableIpTracking`                                                                                                                                                                          |
| `auth_limits`                          | tabla                                      | `key text pk`, `window_start`, `count int`, `day_start`, `day_count int`, `locked_until`; claves con HMAC                                                                                                                |
| `email_log`                            | tabla                                      | `id uuid pk`, `resend_id text unique`, `kind`, `recipient_hash`, `user_id` (`on delete set null`), `status` (`queued`, `sent`, `delivered`, `bounced`, `complained`, `suppressed`, `failed`), `created_at`, `updated_at` |
| `push_targets`                         | tabla                                      | `id uuid pk`, `user_id` (cascade), `session_id` (`set null`), `channel` (`webpush`, `fcm`, `apns`), `endpoint_hash text unique`, `credential jsonb`, `label`, `created_at`, `last_ok_at`, `failures smallint`            |
| `notice_log`                           | tabla                                      | `user_id` (cascade), `kind`, `ref`, `sent_at`, `unique (user_id, kind, ref)`                                                                                                                                             |
| `admin_audit`                          | tabla                                      | `id uuid pk`, `at`, `actor`, `action`, `target_user_id` (sin clave), `detail jsonb`                                                                                                                                      |
| `verifications` (hoy)                  | tabla                                      | recuperación con `identifier` en hash y `value` = id; el deshacer con `value = 'undo-email:<id>'`                                                                                                                        |

## G.3 Migraciones (por orden del plan, D-57)

| Migración              | PR  | Qué                                                                                                                                            |
| ---------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `0055_auditoria_admin` | 5   | `admin_audit`                                                                                                                                  |
| `0056_cuenta_e4`       | 6   | las columnas de `users` de §G.2, `auth_limits`, `UPDATE sessions SET ip_address = ''`, `UPDATE users SET name = 'Player'`, defecto de `locale` |
| `0057_correo`          | 7   | `email_log`                                                                                                                                    |
| `0058_avisos`          | 14  | `push_targets`, `notice_log`                                                                                                                   |
| `0059_dos_factores`    | 18  | lo del plugin `twoFactor`, solo si DD-01 = B                                                                                                   |

## G.4 Rutas de la API

| Ruta                                         | Qué                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_ALLOWED_PATHS` (11; ver G.16.2)        | `POST sign-up/email`, `POST sign-in/email`, `GET get-session`, `POST sign-out`, `GET verify-email`, `POST send-verification-email`, `POST request-password-reset`, `GET reset-password/:token` (solo `LEGACY_LINK_GRACE_DAYS`), `POST reset-password`, `POST change-email`, `POST change-password`, `POST delete-user` |
| `GET /api/me/devices`                        | las sesiones con id opaco (`SHA-256` del token, 16 hex), `label`, `current`, `createdAt`, `lastActiveAt`                                                                                                                                                                                                               |
| `DELETE /api/me/devices/:id`                 | cierra una sesión y sus `push_targets`                                                                                                                                                                                                                                                                                 |
| `POST /api/auth/devices/sign-out-others`     | cierra las otras, sube `device_epoch` y reemite la `cs_device` del navegador propio                                                                                                                                                                                                                                    |
| `PUT /api/me/birth-date`                     | escribe la fecha una vez; 409 `already_set`                                                                                                                                                                                                                                                                            |
| `POST /api/me/export`                        | `{ password }`; JSON adjunto                                                                                                                                                                                                                                                                                           |
| `PUT /api/me/away`, `DELETE /api/me/away`    | `{ until }` ISO; termina antes                                                                                                                                                                                                                                                                                         |
| `POST /api/me/push-targets`                  | cuerpo discriminado por `channel`, con `timeZone`; devuelve `id`                                                                                                                                                                                                                                                       |
| `DELETE /api/me/push-targets/:id`            | la baja de un aparato (también al hacer `Sign out`)                                                                                                                                                                                                                                                                    |
| `GET /api/me/notices`, `PUT /api/me/notices` | las preferencias                                                                                                                                                                                                                                                                                                       |
| `POST /api/me/notices/:kind/off`             | la baja de un toque desde el service worker                                                                                                                                                                                                                                                                            |
| `POST /api/account/undo-email-change`        | `{ token }`, sin sesión                                                                                                                                                                                                                                                                                                |
| `POST /api/account/approve-email-change`     | `{ token }`, sin sesión: la rama ocupada                                                                                                                                                                                                                                                                               |
| `POST /api/webhooks/resend`                  | cuerpo crudo, firma `svix` con `RESEND_WEBHOOK_SECRET`                                                                                                                                                                                                                                                                 |
| `GET /api/admin/audit`                       | `admin_audit` para el panel                                                                                                                                                                                                                                                                                            |

## G.5 Opciones de `better-auth` 1.7.26 y de Fastify

| Opción                                           | Valor                                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `emailAndPassword.revokeSessionsOnPasswordReset` | `true`                                                                                                           |
| `emailAndPassword.resetPasswordTokenExpiresIn`   | `RESET_TOKEN_TTL_S`                                                                                              |
| `emailAndPassword.onPasswordReset`               | borra `verifications` con `value` = id, pone L1 a cero, sube `device_epoch`, apunta el correo en `resetRequests` |
| `emailVerification.expiresIn`                    | `EMAIL_JWT_TTL_S` (todos los JWT de correo)                                                                      |
| `verification.storeIdentifier`                   | `'hashed'`                                                                                                       |
| `advanced.backgroundTasks.handler`               | `mailQueue.track` (D-15)                                                                                         |
| `advanced.ipAddress.disableIpTracking`           | `true`                                                                                                           |
| `rateLimit`                                      | `{ enabled: false }`                                                                                             |
| `disabledPaths`                                  | el complemento de `AUTH_ALLOWED_PATHS`                                                                           |
| `user.additionalFields.birthDate`                | `string`, `required`, `input`, `returned`, `validator.input: birthDateSchema`                                    |
| `databaseHooks.user.create.before`               | `name = 'Player'`, `locale` de `Accept-Language`                                                                 |
| `user.deleteUser.beforeDelete`                   | `deleteAccount` en una transacción (D-38)                                                                        |
| `emailAndPassword.onExistingUserSignUp`          | manda `signup_existing`                                                                                          |
| `logger`                                         | `{ level: 'warn' }`                                                                                              |
| `session.expiresIn` / `updateAge`                | `SESSION_EXPIRES_S` / `SESSION_UPDATE_AGE_S`; sin `cookieCache`                                                  |
| Fastify `trustProxy`                             | `(addr, hop) => hop === 0`; nunca `1`                                                                            |

## G.6 Constantes (valor; §16 tiene la tabla con intención)

| Constante                                                                     | Valor                                                                                                                               | Dónde                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `MIN_AGE_YEARS`                                                               | 16                                                                                                                                  | `packages/shared/src/account/constants.ts` |
| `MIN_BIRTH_YEAR`                                                              | 1900                                                                                                                                | íd.                                        |
| `TERMS_VERSION`                                                               | `'2026-11-draft'`                                                                                                                   | íd.                                        |
| `SESSION_EXPIRES_S`                                                           | 2.592.000 (30 días)                                                                                                                 | íd.                                        |
| `SESSION_UPDATE_AGE_S`                                                        | 86.400                                                                                                                              | íd.                                        |
| `SESSION_MAX_AGE_DAYS`                                                        | 90                                                                                                                                  | íd.                                        |
| `EMAIL_JWT_TTL_S`                                                             | 86.400                                                                                                                              | íd.                                        |
| `RESET_TOKEN_TTL_S`                                                           | 3.600                                                                                                                               | íd.                                        |
| `LEGACY_LINK_GRACE_DAYS`                                                      | 7                                                                                                                                   | íd.                                        |
| `UNDO_EMAIL_CHANGE_H`                                                         | 72                                                                                                                                  | íd.                                        |
| `RESEND_COOLDOWN_S`                                                           | 60                                                                                                                                  | íd.                                        |
| `EMAIL_CHANGES_PER_DAY`                                                       | 3                                                                                                                                   | íd.                                        |
| `EXPORTS_PER_DAY`                                                             | 3                                                                                                                                   | íd.                                        |
| `DEVICE_COOKIE_DAYS`                                                          | 180                                                                                                                                 | `apps/api/src/security.ts`                 |
| `DEVICE_COOKIE_MAX_ACCOUNTS`                                                  | 5                                                                                                                                   | íd.                                        |
| `ACCOUNT_FAILS` (L1)                                                          | 10 en 900 s; cierre de 900 s                                                                                                        | íd.                                        |
| `DEVICE_FAILS` (L2)                                                           | 10 en 900 s; 30 en 86.400 s                                                                                                         | íd.                                        |
| `SESSION_PASSWORD_FAILS` (L3)                                                 | 5 en 900 s; 10 en 86.400 s                                                                                                          | íd.                                        |
| `MAIL_ROUTES_PER_IP_DAY` (L4)                                                 | 20                                                                                                                                  | íd.                                        |
| `MAIL_PER_RECIPIENT_HOUR` (L5)                                                | 3                                                                                                                                   | íd.                                        |
| `MAIL_DAILY_BUDGET` (L6)                                                      | variable; 90 con el plan gratuito, 1.500 con Pro                                                                                    | `apps/api/src/env.ts`                      |
| `MAIL_RESET_RESERVE`                                                          | 30                                                                                                                                  | `security.ts`                              |
| `MAIL_LOW_PRIORITY_CUTOFF`                                                    | 0,7                                                                                                                                 | íd.                                        |
| `SIGNUP_EXISTING_EVERY_H` / `NEW_SIGN_IN_EVERY_H` / `CHANGE_TO_TAKEN_EVERY_H` | 24 / 1 / 24                                                                                                                         | íd.                                        |
| `HIBP_TIMEOUT_MS`                                                             | 3.000                                                                                                                               | íd.                                        |
| `MAIL_SHUTDOWN_GRACE_MS`                                                      | 10.000                                                                                                                              | `apps/api/src/mailQueue.ts`                |
| `AUTH_LIMITS_RETENTION_DAYS` / `EMAIL_LOG_RETENTION_DAYS`                     | 2 / 90                                                                                                                              | `packages/db/src/purge.ts`                 |
| `PURGE_UNCONFIRMED_DAYS`                                                      | 7 (DD-17)                                                                                                                           | íd.                                        |
| `AWAY_MAX_DAYS` / `AWAY_MIN_HOURS`                                            | 28 / 12                                                                                                                             | `packages/shared/src/account/constants.ts` |
| `AWAY_SHORTCUT_DAYS`                                                          | `[7, 14, 28]`                                                                                                                       | íd.                                        |
| `RETURN_NOTICE_AFTER_DAYS` / `MONTH_RULE_HINT_AFTER_DAYS`                     | 7 / 14                                                                                                                              | íd.                                        |
| `AWAY_WARNING_DAYS`                                                           | `[20, 27]`                                                                                                                          | `packages/shared/src/account/notices.ts`   |
| `NOTICE_DAILY_CAP`                                                            | 3 (sin contar `away_warning`)                                                                                                       | íd.                                        |
| `NOTICE_QUIET_START_H` / `NOTICE_QUIET_END_H` / `STAGE_DIGEST_HOUR`           | 22 / 8 / 19 (locales)                                                                                                               | íd.                                        |
| `NOTICE_ASK_SNOOZE_DAYS`                                                      | 30                                                                                                                                  | íd.                                        |
| `NOTICE_DEFAULTS`                                                             | los encendidos de DD-02 A                                                                                                           | íd.                                        |
| `PUSH_TARGETS_PER_USER` / `PUSH_DEAD_AFTER_FAILS`                             | 10 / 3                                                                                                                              | íd.                                        |
| `PUSH_ALLOWED_HOSTS`                                                          | `fcm.googleapis.com`, `updates.push.services.mozilla.com`, `web.push.apple.com`, sufijo `.notify.windows.com`                       | `apps/api/src/push/endpoint.ts`            |
| `AUTH_ALLOWED_PATHS`                                                          | las doce de §G.4                                                                                                                    | `apps/api/src/security.ts`                 |
| Sin cambio                                                                    | Fastify 300/min, 60/min, 10 cada 5 min (`security.ts` l. 10, 36, 43, 54 a 68); contraseña de 8 a 128; `SPOILER.lastSeenEveryMin` 60 |                                            |

## G.7 Tipos, esquemas y funciones

| Nombre                                                                                | Fichero                                      | Qué                                                                  |
| ------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `birthDateSchema`, `ageOn`, `isOldEnough`                                             | `packages/shared/src/account/birthDate.ts`   | la regla de la edad, compartida (UTC; 29 de febrero como 1 de marzo) |
| `deviceLabel(userAgent)`                                                              | `packages/shared/src/account/deviceLabel.ts` | `Chrome on Android`…, `Unknown browser`                              |
| `NoticeKind`, `NOTICE_CATALOG`, `NoticePayload`, `noticePayload()`                    | `packages/shared/src/account/notices.ts`     | el catálogo y la carga `{ kind, title, body, path, tag }`            |
| `inactiveSince(lastSeenAt, awayUntil)`, `isAway(user, now)`                           | `packages/db/src/inactivity.ts`              | el contrato con E7                                                   |
| `reserveAttempt`, `clearAttempts`                                                     | `packages/db/src/authLimits.ts`              | la reserva y el borrado al 200                                       |
| `noticeSweep(db, now, deliver)`                                                       | `packages/db/src/notices.ts`                 | el barrido                                                           |
| `deleteAccount(db, userId)`                                                           | `packages/db/src/adminUsers.ts`              | `deleteUserAsAdmin` más `verifications` y el renombre del equipo     |
| `purgeAccounts(db, now)`                                                              | `packages/db/src/purge.ts`                   | la purga diaria                                                      |
| `clientIp(request)`                                                                   | `apps/api/src/clientIp.ts`                   | la IP validada (D-21)                                                |
| `deviceCookie` (`issue`, `read`)                                                      | `apps/api/src/deviceCookie.ts`               | `cs_device`                                                          |
| `resetRequests`                                                                       | `apps/api/src/routes/authProxy.ts`           | `WeakMap<Request, string>` del correo que recupera                   |
| `mailQueue` (`track`, `drain`)                                                        | `apps/api/src/mailQueue.ts`                  | `backgroundTasks` y el cierre ordenado                               |
| `redactUrl`                                                                           | `apps/api/src/redact.ts`                     | logs sin tokens                                                      |
| `hashPasswordWithHibp`                                                                | `apps/api/src/hibp.ts`                       | el envoltorio de 3 s                                                 |
| `isAllowedPushEndpoint`                                                               | `apps/api/src/push/endpoint.ts`              | la SSRF                                                              |
| `Deliverer` (`send(target, payload) → 'ok' \| 'gone' \| 'retry'`), `webPushDeliverer` | `apps/api/src/push/deliver.ts`               | un canal por fichero                                                 |
| `web-push.d.ts`                                                                       | `apps/api/src/push/web-push.d.ts`            | los tipos mínimos de `web-push` 4.0.0                                |
| `authErrorText(error, status, retryAfterS)`                                           | `apps/web/src/domain/authErrors.ts`          | el traductor único de errores                                        |
| `noticeAsk`                                                                           | `apps/web/src/notifications/push.ts`         | registrar `sw.js`, pedir el permiso y suscribirse                    |

## G.8 Cookies y almacenamiento del navegador

| Nombre                                               | Qué                                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__Secure-better-auth.session_token`                 | la sesión (`better-auth.session_token` en local); 30 días renovables                                                                                                            |
| `cs_viewer`                                          | E2, 90 días, solo restringe; no cambia                                                                                                                                          |
| `cs_device`                                          | `v1.<hmac del correo, 32>.<nonce 16>.<firma 43>` con `SESSION_SECRET` y `device_epoch`; hasta 5 cuentas; 180 días; `HttpOnly`, `SameSite=Lax`, `Secure`; sobrevive a `Sign out` |
| `cs.pendingEmail` (sessionStorage)                   | el correo de `CheckInbox`                                                                                                                                                       |
| `cs.ageGate` (sessionStorage)                        | quien no tiene 16 ve la puerta hasta cerrar la pestaña                                                                                                                          |
| `cs.noticeAskedAt`, `cs.pushTargetId` (localStorage) | la petición de permiso cerrada; el id del aparato suscrito                                                                                                                      |

## G.9 Los correos (por id; asunto en inglés)

| Id                        | Asunto (correo)                                                | Cuándo                                  |
| ------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| `verify_signup`           | `Confirm your Cycling Star email`                              | registro, reenvío, entrar sin confirmar |
| `verify_new_address`      | `Confirm your new Cycling Star email`                          | a la dirección nueva                    |
| `approve_change`          | `Approve the new email of your Cycling Star account`           | a la vieja (también en la rama ocupada) |
| `reset_password`          | `Reset your Cycling Star password`                             | pedir recuperar                         |
| `password_changed`        | `Your Cycling Star password was changed`                       | recuperar y cambiar (nuevo)             |
| `email_changed`           | `Your Cycling Star email was changed`                          | a la vieja, con el deshacer (nuevo)     |
| `account_deleted`         | `Your Cycling Star account was deleted`                        | borrar (nuevo)                          |
| `signup_existing`         | `You already have a Cycling Star account`                      | `onExistingUserSignUp` (nuevo)          |
| `new_sign_in`             | `New sign-in to your Cycling Star account`                     | entrada sin `cs_device` (nuevo, DD-16)  |
| `change_to_taken`         | `Someone tried to move a Cycling Star account to this address` | la rama ocupada aprobada (nuevo)        |
| (fuera) `stageReadyEmail` | se borra con sus tres tests                                    | nunca se envía (D-00c)                  |

## G.10 Los avisos (por id)

| Id               | Disparador                                                          | De serie (DD-02 A) |
| ---------------- | ------------------------------------------------------------------- | ------------------ |
| `stage_digest`   | a `STAGE_DIGEST_HOUR` local, etapas con su corredor listas sin ver  | sí                 |
| `stage_ready`    | cada etapa lista de una carrera seguida                             | no                 |
| `plan_ending`    | el plan vivo acaba en 4 días de juego                               | sí                 |
| `offer_received` | el tick crea una oferta para su corredor libre                      | sí                 |
| `away_warning`   | 20 y 27 días reales sin visita ni ausencia; solo con la regla de E7 | sí                 |
| `away_over`      | llega `away_until`                                                  | sí                 |

## G.11 Pantallas, rutas de la web y componentes

| Pantalla o componente                                                                                                                                                                  | Ruta y fichero                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Register`, `CheckInbox`                                                                                                                                                               | `/register`, `apps/web/src/pages/Register.tsx`                                                                                                                                   |
| `Login`                                                                                                                                                                                | `/login`, `Login.tsx`                                                                                                                                                            |
| `VerifyEmail` (página de botón)                                                                                                                                                        | `/verify-email#token=`, `VerifyEmail.tsx`                                                                                                                                        |
| `ApproveEmail`                                                                                                                                                                         | `/approve-email#token=`, `pages/ApproveEmail.tsx` (nuevo)                                                                                                                        |
| `UndoEmail`                                                                                                                                                                            | `/undo-email#token=`, `pages/UndoEmail.tsx` (nuevo)                                                                                                                              |
| `ForgotPassword`, `ResetPassword`                                                                                                                                                      | `/forgot-password`, `/reset-password#token=`                                                                                                                                     |
| `Account`                                                                                                                                                                              | `/account`, `Account.tsx` (lista, DD-07 A)                                                                                                                                       |
| `AccountEmail`, `AccountPassword`, `AccountDevices`, `AccountNotifications`, `AccountAway`, `AccountSpoilers`, `AccountAppearance`, `AccountData`, `AccountDelete`, `AccountBirthDate` | `/account/email`, `/password`, `/devices`, `/notifications`, `/away`, `/spoilers`, `/appearance`, `/data`, `/delete`, `/birth-date`; `apps/web/src/pages/account/*.tsx` (nuevos) |
| `Terms`                                                                                                                                                                                | `/terms`, `pages/Terms.tsx` (nuevo; enlace en el pie, `App.tsx` l. 393 a 418)                                                                                                    |
| `Privacy`                                                                                                                                                                              | `/privacy`, `Privacy.tsx` (texto nuevo)                                                                                                                                          |
| `AwayBand`                                                                                                                                                                             | un `Notice` `info` bajo la cabecera mientras dura la ausencia, en `apps/web/src/components/AwayBand.tsx`                                                                         |
| `WelcomeBack`                                                                                                                                                                          | un `Notice` `info` en `Home`, encima de `While you were away`                                                                                                                    |
| `DateField`                                                                                                                                                                            | `apps/web/src/components/ui/DateField.tsx` (nuevo, con su test y su sitio en `/_ui`)                                                                                             |
| `Field` `reveal`                                                                                                                                                                       | prop nueva de `Field.tsx`: `Show` y `Hide`                                                                                                                                       |
| `sw.js`                                                                                                                                                                                | `apps/web/public/sw.js`: `push`, `notificationclick`, `pushsubscriptionchange`; sin `fetch` ni `caches`                                                                          |
| Del catálogo de E3, sin cambios                                                                                                                                                        | `Notice`, `Panel`, `ActionRow`, `Button`, `Checkbox`, `Segmented`, `TextLink`, `PageHeader`, `Disclosure`, `Sheet`                                                               |

## G.12 Textos de pantalla (inglés; los fijos que usan las dos manos)

| Dónde                 | Texto (pantalla)                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Registro, fecha       | `Date of birth` / `Day` `Month` `Year` / `We only use it to check you're old enough to play.`                                              |
| Registro, condiciones | `By creating an account you agree to the Terms and the Privacy notice.`                                                                    |
| Menor                 | `Sorry, you can't play yet` / `Cycling Star is for people aged 16 or over. We have not kept anything you typed.` / `Back to the home page` |
| Puerta de la fecha    | `One more thing` / `We now ask everyone for their date of birth. Cycling Star is for people aged 16 or over.` / `Save and continue`        |
| Errores de fecha      | `Enter your date of birth.` / `Enter a real date of birth.`                                                                                |
| `Terms` en borrador   | `These terms are a draft and will be reviewed before public launch.`                                                                       |
| 429 por IP            | `Too many attempts from this connection. Try again in 4 minutes.`                                                                          |
| 429 por cuenta        | `Too many failed attempts on this account. Try again in 15 minutes, or reset your password.`                                               |
| L3                    | `Too many wrong passwords. Try again in 15 minutes.`; al cerrar: `You were signed out after too many wrong passwords.`                     |
| 401                   | `Wrong email or password.`                                                                                                                 |
| Sin red / otro        | `Can't reach Cycling Star. Check your connection and try again.` / `Something went wrong. Try again in a minute.`                          |
| Cuenta atrás          | `You can try again in 3:58.`                                                                                                               |
| Presupuesto agotado   | `We can't send emails right now. Try again tomorrow.`                                                                                      |
| Recuperar hecho       | `Password saved` / `Log in with your new password. You have been signed out everywhere else.`                                              |
| Borrado hecho         | `Your account is deleted` / `We've sent a confirmation to <email>. Thanks for playing.`                                                    |
| Cambio de correo      | `Enter your current password to change your email.` / `This account's email is set in the server settings and can't be changed here.`      |
| Correo que no llega   | `We can't deliver email to <email>` / `Without it you can't recover your account if you forget your password. Change your email.`          |
| Contacto              | `If you lose access to this email, you won't be able to recover your account.`                                                             |
| Ausencia, banda       | `You're away until 3 Dec` / `End now`                                                                                                      |
| iPhone (DD-04 A)      | `Notifications aren't available on iPhone yet. Everything a notification would tell you is on your Home page when you open Cycling Star.`  |
| Pie de todo correo    | `Cycling Star · a fictional cycling-manager game.` / `This is an account email. Cycling Star never sends newsletters or game emails.`      |

## G.13 Tests

`authErrors.test.ts` (web), `authFlow.test.ts` (ampliado), `enumTiming.test.ts`, `accountLimit.test.ts`, `deviceCookie.test.ts`, `clientIp.test.ts`, `authRoutes.test.ts`, `redact.test.ts`, `mailQueue.test.ts`, `birthDate.test.ts` (shared y API), `devices.test.ts`, `deviceLabel.test.ts`, `emailLinks.test.ts`, `emailChange.test.ts`, `emails.test.ts` (re-sellado), `resendWebhook.test.ts`, `mailBudget.test.ts`, `hibp.test.ts`, `deleteAccount.test.ts`, `exportData.test.ts`, `lastSeen.test.ts`, `inactivity.test.ts`, `away.test.ts`, `trainingDayAway.test.ts`, `notices.test.ts`, `pushEndpoint.test.ts`, `sw.test.ts`, `spoilerCanary.test.ts` (re-sellado a `noticePayload`), `privacy.test.ts`, `adminAudit.test.ts`, `purge.test.ts`; en la web, los de cada página tocada, `DateField.test.tsx`, `Field.test.tsx` (`reveal`) y la prueba del teléfono de E3 con las páginas nuevas.

## G.14 Los PR (§18)

1 `pantallas` · 2 `dependencias` · 3 `opciones` · 4 `logs` · 5 `rutas` (0055) · 6 `limites` (0056) · 7 `correo` (0057) · 8 `enlaces` · 9 `edad` · 10 `filtradas` · 11 `account` · 12 `datos` · 13 `ausencia` · 14 `avisos` (0058) · 15 `regla-del-mes` (tras E7) · 16 `documentos` · 17 `operacion` · 18 `dos-factores` (0059, solo DD-01 B).

## G.15 Alias de las propuestas → nombre canónico

`cs_known` (jugador) → `cs_device`; `auth_throttle` (atacante) → `auth_limits`; `delivery_log` (atacante) → `email_log`; `push_subscriptions` (atacante, incremental) → `push_targets`; `notify_prefs` → `notice_prefs`; `month_rule_warning`, `month_rule` → `away_warning`; `absence_ending` → `away_over`; `stage_ready_own` → `stage_digest`; `stage_ready_followed` → `stage_ready`; `Sessions` (panel) → `AccountDevices`; `DELETE /api/me`, `POST /api/me/delete` → `POST /api/auth/delete-user` con `beforeDelete`; `/confirm-age` → `/account/birth-date`; `/confirm-email-change#t=` → `/approve-email#token=`; `E1` a `E7` de atacante → los ids de §G.9; `stageReadyPush` → `noticePayload`; `ACCOUNT.*`, `PUSH.*` de incremental → las constantes de §G.6.

## G.16 Lo que fundió el corrector (23 de noviembre de 2026)

Los bloques «Propuesto para el glosario» de las secciones, fundidos aquí y quitados de ellas, más los nombres que trajo la corrección (`refutaciones/correcciones.json`) y las decisiones del dueño de `00-encargo.md` §9.4 y §9.5. **Manda sobre G.1 a G.15** donde no coincidan.

### G.16.1 Tablas, columnas y migraciones (G.2, G.3)

- `users.status` (`text not null default 'pending'`, `CHECK` `pending` o `approved`) y `users.approved_at` (`timestamptz` nula), en la **0055**, con `UPDATE users SET status = 'approved', approved_at = now()` a mano (§4.9, §15.2).
- `users.welcome_back_from` (`timestamptz` nula), en la 0056 (§14.5).
- `push_targets.channel` como enum `push_channel` (`webpush`, `fcm`, `apns`).
- Claves de `auth_limits`: `acct:`, `dev:`, `pw:` (por **sesión**), `pwu:` (por cuenta), `mailip:` (IP, o su /64 en IPv6), `rsv:` (reserva de recuperar por destinatario) y `exp:` (§7.3).
- `email_log.kind`: solo `verify_signup` y `reset_password`. Sin `svix_id`.
- Acciones de `admin_audit`: `user.status`, `user.email`, `user.email_verified`, `user.is_admin`, `user.premium`, `user.birth_date`, `user.delete`, `team.name`, `team.kit_revert`, `blocklist.add`, `blocklist.remove`, `world.tick`, `world.advance`.
- Fuera: `0059_dos_factores` (DD-01 A).

### G.16.2 Rutas (G.4)

- `AUTH_ALLOWED_PATHS` son **11**, sin `change-email`; **9** desde el PR 19, sin `GET reset-password/:token` ni `GET verify-email`. Se comparan con la ruta normalizada; toda ruta con `..`, `.`, `//`, `%2e`, `%2f` o `%5c` da 404 (PR 3).
- Rutas propias de Fastify bajo `/api/auth`: `POST /api/auth/devices/sign-out-others` (sustituye a `POST /api/me/devices/sign-out-others`) y `POST /api/auth/devices/forget`.
- `POST /api/account/verify-email` con `{ token }`: llama a `auth.handler` dentro del proceso.
- Panel: `POST /api/admin/users/:id/approve`, `POST /api/admin/users/:id/reject`, `PATCH /api/admin/users/:id` con `email`, `signOutEverywhere` y `birthDate`, `PATCH /api/admin/teams/:id` (`{ name }`), `GET /api/admin/audit` con `limit` (hasta 500) y `before`.
- `GET /api/me/account` (nace en el PR 9 con `birthDateSet`; el PR 11 la completa); `GET /api/me/away`, `PUT /api/me/away` con `{ until }` (instante ISO con desfase), `DELETE /api/me/away`; `GET` y `DELETE /api/me/welcome-back`.
- Fuera: `POST /api/account/undo-email-change`, `approve-email-change`.

### G.16.3 Opciones (G.5)

- `user.changeEmail.enabled: false`; `user.additionalFields.birthDate` con `returned: false`; `user.additionalFields.status` con `input: false`, `returned: false`, `defaultValue: 'pending'`; `sendVerificationEmail` que no envía a una cuenta que no esté `approved`; un `hooks.before` que da 404 a las rutas con parámetros fuera de la lista.
- Fuera: `onExistingUserSignUp`.

### G.16.4 Constantes y variables (G.6)

- Nuevas: `ACCOUNT_PASSWORD_FAILS_DAY` 30; `STAGE_READY_EVERY_H` 6; `PLAN_ENDING_GAME_DAYS` 4; `PUSH_SEND_TIMEOUT_MS` 15.000; `NOTICE_LOG_RETENTION_DAYS` 90 (`purge.ts`); `PUSH_ALLOWED_HOSTS` como en 13-j.
- Cambian: `SESSION_PASSWORD_FAILS` es por sesión; `MAIL_RESET_RESERVE` se gasta una vez por destinatario y día; `MAIL_DAILY_BUDGET` 90 (gratuito), sin la alternativa de 1.500 salvo con DD-10 A; `PURGE_UNCONFIRMED_DAYS` cuenta desde `approved_at`; `CREDENTIAL_AUTH_PATHS` con siete rutas.
- Variables de entorno: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- Fuera: `HIBP_TIMEOUT_MS`, `MAIL_LOW_PRIORITY_CUTOFF`, `EMAIL_CHANGES_PER_DAY`, `UNDO_EMAIL_CHANGE_H`, `SIGNUP_EXISTING_EVERY_H`, `CHANGE_TO_TAKEN_EVERY_H`.

### G.16.5 Tipos, esquemas y funciones (G.7)

- `UserStatus = 'pending' | 'approved'` (`packages/shared/src/account/constants.ts`).
- `parseIsoDate`, `YearMonthDay`, `BirthDateError`, `makeBirthDateSchema` (`packages/shared/src/account/birthDate.ts`).
- `AttemptRule`, `AttemptResult` (`packages/db/src/authLimits.ts`); `AdminAuditDetail` (`{ field, from, to, teamId? }`); `pushChannelEnum`.
- `deviceRowSchema`, `devicesResponseSchema`, `AccountExport`, `pushTargetBodySchema`, `awayBodySchema` (`apps/api/src/routes/me.ts`); `apps/web/src/api/devices.ts`.
- `AuthErrorBody`, `waitText` (`apps/web/src/domain/authErrors.ts`); `DateFieldValue`, `DateFieldProps`, `toIsoDate`.
- `NOTICE_KINDS` (nueve, con `email_changed`), `NoticeSpec`, `NoticeInput`, `ReadyStage`, `NOTICE_DEFAULTS` (`notices.ts`); `NoticePayload` gana `off`; `PushChannel`, `DeliveryResult`, `DeliveryOptions`, `PushTargetRow` (`push/deliver.ts`); `pushSupport` (`apps/web/src/notifications/push.ts`); `TrainingDayContext.ownerAway`.
- Fuera: `hashPasswordWithHibp`.

### G.16.6 Cookies, almacenamiento y ficheros estáticos (G.8)

- `cs_device`: la firma es HMAC de `v1.<hmac>.<nonce>.<userId>.<device_epoch>`; `Forget this device` quita la entrada propia.
- `cs.accountDeleted` (sessionStorage).
- `apps/web/public/manifest.webmanifest`: el manifiesto mínimo de §13.5, sin `icons`.

### G.16.7 Correos y avisos (G.9, G.10)

- Correos: solo `verify_signup` (sale al aprobar la cuenta) y `reset_password`. Fuera: `verify_new_address`, `approve_change`, `password_changed` (correo), `email_changed` (correo), `account_deleted`, `signup_existing`, `new_sign_in` (correo), `change_to_taken`.
- Avisos de seguridad, siempre, sin interruptor: `password_changed` (200 de `reset-password` y de `change-password`), `new_sign_in` (200 de `sign-in/email` sin `cs_device` válida; uno por hora) y `email_changed` (un administrador cambia el correo, antes del cambio).

### G.16.8 Pantallas y componentes (G.11)

- La fila de `Terms` cita el texto de §4.6; la puerta de la fecha vive en `ProtectedRoute.tsx` l. 11, no en `App.tsx` l. 318 a 325.
- Fuera: `ApproveEmail`, `UndoEmail`.
- `AwayBand`, `WelcomeBack` y los dos `Notice` del permiso, con su sitio en `/_ui`.

### G.16.9 Códigos de error

- 403 `ACCOUNT_PENDING`; 429 `ACCOUNT_LOCKED`, 429 `PASSWORD_ATTEMPTS_LOCKED` (con `signedOut`), 429 `EXPORT_LIMIT`; 503 `MAIL_BUDGET_EXHAUSTED`; `INVALID_BIRTH_DATE` y `UNDER_MINIMUM_AGE` (los `message` del 400 `VALIDATION_ERROR` y los códigos de `PUT /api/me/birth-date`).
- Propios de la API: 400 `admin_email_fijo`, 409 `correo_ocupado`, 409 `es_el_admin_raiz`, 409 `no_pendiente`, 409 `usa_sign_out`, 400 `canal_no_disponible`, 400 `fecha_fuera_de_rango`.

### G.16.10 Textos de pantalla (G.12)

Los enteros están en su sección; aquí, cuáles cambian o entran:

- Registro y enlaces (§4, §5): `Request received` y las líneas de `CheckInbox` de §5.3; `Your account is waiting for approval` / `An administrator reviews new accounts by hand. When yours is approved, we'll email you a link to finish signing up.`; `Confirm your email` / `Tap the button to finish creating your account.` / `Confirming…`; `This link is incomplete.` / `Open it again from the email, or ask for a new one.`; `Enter your email and we'll send you a new one.`; `If that address has an approved account waiting for confirmation, a new link is on its way.`; `If <email> has an account, we've sent a link to reset your password. It expires in one hour.`; `Your date of birth is already saved.`; `Use at least 8 characters.`; `Your password can be at most 128 characters.`; `Cycling Star is for people aged 16 or over, so this account can't stay open. You can delete it here.`; `We can't send a new link right now. Try again tomorrow.`
- Cuenta (§9.3, §10, §12): `We can't deliver email to <email>` / `Without it you can't reset your password if you forget it. Only an administrator can change the email of an account.`; `Your email can only be changed by an administrator.`; `Link sent. Check your inbox and the spam folder.`; `Changing your password signs you out of your other devices.`; `Password updated` / `You've been signed out of your other devices.`; `That's not your current password.`; `Enter your current password.`; `You're only signed in here.`; `Signed out of <device>.`; `Signed out of <n> other devices.`; `Sign out of <n> other devices?`; `Shared computer? Forget this device`; `Signed out. This browser no longer counts as one of your devices.`; `Download a copy of everything we keep about you, as a JSON file.`; `You've downloaded your data 3 times today. Try again tomorrow.`; `Your account is deleted` / `Thanks for playing.` (sustituye al que prometía un correo); `Want a copy first?` / `Download my data`; `Backups are not kept.` si el cron no corre.
- Panel (§8.5): `Waiting for approval (<n>)`, `Requested <date>`, `Approve`, `Reject`, `Reject <email>? The request is deleted and nothing is sent.`, `Nobody is waiting.`, `Change email`, `New email`, `Sign out everywhere`, `Change <old> to <new>? No email is sent to either address. A notification goes to their devices.`, `Change date of birth`, `Rename team`, `Team name`, `Recent changes`, y los siete errores de §8.5.
- Avisos (§13): los de §13.3 y §13.4; la fila «iPhone» pasa a la de `ios-home` (iOS 16.4); `Always on: a changed password, a new sign-in and a changed email.`; el aviso `email_changed`: `Your account email was changed by an administrator` / `If you didn't ask for this, sign in and check Account.`; si la prueba del iPhone falla, `Notifications don't work on iPhone and iPad yet.` (19-a).
- Ausencia (§14): los de §14.1, §14.3 y §14.5.
- Fuera: `Enter your current password to change your email.`, `This account's email is set in the server settings and can't be changed here.`, `Change your email.`

### G.16.11 Tests (G.13)

- Nuevo: `signupApproval.test.ts` (PR 5). `authRoutes.test.ts` empieza en el PR 3 (las rutas con `..`).
- Fuera: `hibp.test.ts`, `emailChange.test.ts`.

### G.16.12 Los PR (G.14)

- Diecisiete: 1 a 9, 11 a 17 y 19; el 10 (`filtradas`) y el 18 (`dos-factores`) retirados; 19 `fin-enlaces-viejos`. El **3** es el primer PR de seguridad y lleva los dos arreglos de producción (`00-encargo.md` §9.4); el **5** lleva el registro por aprobación (§9.5); el **14**, el manifiesto mínimo. Unas 134 horas.
