# Decisiones cerradas de `docs/cuenta.md` (E4 · La cuenta y el contacto)

Cada contradicción de hecho o de diseño entre las tres propuestas queda cerrada aquí. Los redactores las escriben como hechos y NO las reabren; lo que no esté aquí lo deciden en «Decisiones de esta sección» (`N-a`, `N-b`…). Nombres: los de `00-glosario.md`. Cada entrada: la decisión, su evidencia (C1 a C13 son las comprobaciones de `juicios/codigo.md` §2; «seguridad Cn» y «cobertura Cn», las de esos juicios; `I-nn`, `O-nn`, `H-nn` y `X-nn`, las de `juicios/veredicto.json`) y la sección (`§N` de `00-esqueleto.md`). **[sin evidencia]** marca lo que esta síntesis decide sin que un juez lo midiera; el documento dice quién lo mide y en qué PR.

**Árbol.** `2a29e6d` (`main`, 19-11-2026); hasta `a781831` solo cambian documentos. `ENGINE_VERSION` 91 (`packages/engine/src/constants.ts` l. 853), que E4 no sube. Última migración `0054_modo_oscuro`; la próxima, `0055`.

---

> **Manda sobre esta tabla: las respuestas del dueño del 23 de noviembre de 2026** (`00-encargo.md`
> §9.2). DD-01 A, con el panel como en twilightstruggle; DD-02 A solo por push; DD-03 A; DD-04 con
> detección del iPhone y explicación de la pantalla de inicio, como twilightstruggle; DD-12, 28 días
> reales; DD-10 B; DD-11 C; DD-14 B y un administrador puede cambiar siempre el nombre; DD-16 por push
> y nunca por correo; el resto, por defecto. Y §9.3: **solo dos correos** (recuperar la contraseña y
> confirmar el registro); **sin cambio de correo de autoservicio**, lo cambia un administrador desde el
> panel; DD-15 C, sin informes DMARC.

## 0. Lo que decidió el dueño el 19 de noviembre de 2026 (manda sobre todo lo de abajo)

`00-encargo.md` §9.1, citas textuales allí. Donde algo de abajo diga otra cosa, manda esto.

- **D-00a · 16 años con fecha de nacimiento.** Se declara en el registro; las cuentas que ya existen la dan al entrar. Antes de abrir el registro, a confirmar con un abogado (`agenda.md` §3.7). §4.
- **D-00b · Sin canal de contacto.** Se escribe como riesgo y coste, no como pieza; se retira de la web toda frase que prometa un canal (`Ask and…`, `Privacy.tsx` l. 37 a 38). §11.
- **D-00c · Ningún correo de juego**, tampoco el de la regla del mes. El correo es solo de la cuenta; los avisos de juego, solo por el navegador y la app. Consecuencias: `stageReadyEmail` no se envía nunca y se borra (vale `stageReadyNotice`); los subdominios por flujo pierden urgencia y se escriben para el día que haga falta; el service worker solo de avisos se escribe con su frontera con D-00p; el iPhone en una pestaña no recibe nada; quien no tiene avisos ve la regla del mes en la web. §9, §13, §14.
- **D-00d · La app sin tecnología ni fecha.** El teléfono es un canal más de `push_targets`, sin suponer Expo, Capacitor ni otra. §13.
- **D-00e · El modo ausencia con la frontera propuesta.** Lo declara el jugador con fecha de vuelta; mientras dura decide el entrenador, se callan los avisos y no corre la regla del mes; lo largo es de E7. §14.
- **D-00f · Solo correo y contraseña.** Nada de OAuth, enlace mágico ni código por correo; los avisos de `better-auth` se leen para la subida. El TOTP del panel es DD-01 por eso (X-16). §8.

---

## A. La base

**D-01 · La base es `jugador`, por la suma, con un punto de margen.** No hay mayoría (codigo eligió `incremental`, seguridad `atacante`, cobertura `jugador`). Suma de los cuatro ejes de los tres juicios: jugador 86 (29 + 28 + 29), atacante 85 (29 + 29 + 27), incremental 81 (27 + 28 + 26); el cálculo, en `veredicto.json` → `ganadora`. Un punto es un empate técnico: la base da la estructura y la voz (recorridos, pantallas, textos, `notice_log`, la regla del mes en la web); los injertos de seguridad de `atacante` (I-01 a I-06) y las opciones medidas de `incremental` (I-07 a I-10) son obligatorios y mandan sobre la base. Por eje: jugador gana experiencia (27), atacante seguridad (26), incremental coherencia (25). §0, §22.

**D-02 · Dónde vive cada cosa.** Constantes y reglas compartidas en `packages/shared/src/account/` (`constants.ts`, `birthDate.ts`, `deviceLabel.ts`, `notices.ts`); lo que toca la base en `packages/db/src/` (`authLimits.ts`, `inactivity.ts`, `notices.ts`, `purge.ts`, `adminUsers.ts`); la API en `apps/api/src/` (`clientIp.ts`, `deviceCookie.ts`, `mailQueue.ts`, `redact.ts`, `hibp.ts`, `push/`, `routes/account.ts`, `routes/webhooks.ts`); la web en `apps/web/src/pages/account/`, `domain/authErrors.ts`, `notifications/push.ts`, `public/sw.js`. Nada en `packages/engine/` ni en `packages/shared/src/broadcast/` (W5). §15, §16.

**D-03 · Los principios.** Los ocho de jugador §2, con dos cambios: el 5 pasa a «un tercero nunca bloquea al dueño, y recuperar siempre lo saca» (I-03), y se añade «ninguno de seguridad va por aviso: la seguridad va por correo, que no depende de un permiso» (I-18). Más tres de las otras: «opción antes que gancho, gancho antes que ruta propia» (incremental), «lista blanca, nunca lista negra» y «un enlace de correo nunca cambia nada por sí solo» (atacante). §3.

## B. El registro y la edad

**D-04 · El campo y la puerta neutra.** `DateField` de tres campos numéricos con `autocomplete` `bday-day`, `bday-month`, `bday-year` (jugador; seguridad I-05); la edad mínima no se anuncia junto al campo; quien no la cumple ve la pantalla del menor y `cs.ageGate` en `sessionStorage` (no `localStorage`: seguridad O-12). §4, §12.

**D-05 · Qué se guarda (defecto de DD-09).** `users.birth_date date` entera. Del menor rechazado no se guarda nada, ni el correo en un log. §4.

**D-06 · La validación en el servidor.** `user.additionalFields.birthDate` con `validator.input: birthDateSchema`: corre antes de buscar el correo, así que el menor recibe el mismo 400 con un correo nuevo y con uno que existe (X-09; I-09). Edad con la fecha UTC de hoy; 29 de febrero como 1 de marzo en año no bisiesto; año desde 1900, no futura. La clave de Drizzle es `birthDate` o 1.7 lanza `SchemaMismatchError`. §4.

**D-07 · Lo de E10.** Al registrarse, `databaseHooks.user.create.before` escribe `locale` con la etiqueta primaria de `Accept-Language` (dos letras) o `'en'`; el defecto de la columna pasa a `'en'`. El país ya lo tiene el corredor. Traducir es de E10. (H-12; O-05) **[sin evidencia]** §4.

**D-08 · El nombre y la imagen.** `name = 'Player'` por gancho y en la 0056; la web deja de mandar la parte local del correo; el `before` de `/sign-up/email` rechaza `image` (I-28). §4.

**D-09 · Las cuentas que ya existen.** Con `birth_date` nula, la web lleva a `/account/birth-date` (salvo `/privacy`, `/terms`, `/account/delete` y `Sign out`); la API responde 403 `BIRTH_DATE_REQUIRED` a toda escritura de `/api/riders/*` y `/api/me/*` salvo `birth-date`, `export`, `devices` y los avisos (codigo O-11). `PUT /api/me/birth-date` escribe una vez (409 `already_set`); con menos de 16 no guarda y la pantalla ofrece borrar la cuenta. Nada se bloquea ni se borra solo: qué hacer con un menor ya registrado, a confirmar con un abogado. §4.

**D-10 · Las condiciones (defecto de DD-13).** Línea bajo el botón, `/terms` en borrador con su enlace en el pie, `terms_version` y `terms_accepted_at`. §4.

## C. Enlaces, recuperación, cambio de correo y correos

**D-11 · Los tokens.** Todo JWT de correo vive `EMAIL_JWT_TTL_S` (24 h), con una sola opción (X-08). La recuperación: 24 caracteres, `RESET_TOKEN_TTL_S` (1 h; los 30 minutos de atacante se descartan por la experiencia y porque el token ya no pasa por logs ni por la URL), un uso, con hash (`storeIdentifier: 'hashed'`; los enlaces en claro de antes del despliegue siguen valiendo, X-21), y **mueren solo cuando otro se usa**: `onPasswordReset` borra `verifications` con `value` = id (X-03; O-09). El deshacer guarda `value = 'undo-email:<id>'` y no cae en ese borrado. §5.

**D-12 · Todo enlace pasa por una página de botón.** Token en `#token=`, borrado con `history.replaceState` al leerlo; cada página con su texto entero; el enlace viejo vale `LEGACY_LINK_GRACE_DAYS` (I-04). Cuesta un toque por enlace y se acepta. Que un escáner real no pulse no está comprobado (H-08): va a la prueba del dueño. §5.

**D-13 · Recuperar.** `revokeSessionsOnPasswordReset` cierra todas las sesiones (X-21); `onPasswordReset` borra los otros enlaces, pone L1 a cero, sube `device_epoch` y apunta el correo en `resetRequests`; el proxy, al ver el 200, emite `cs_device` a ese navegador (X-06; I-03); sale `password_changed`; `/login` con `Password saved`. §5.

**D-14 · El cambio de correo.** Pide la contraseña actual (gancho `before`, cuenta en L3; I-15); como mucho `EMAIL_CHANGES_PER_DAY`; el correo de `ADMIN_EMAIL` no cambia (403; I-05). Siempre sale `approve_change` a la vieja: con el destino ocupado, el `before` corta la ruta y manda una aprobación propia (JWT `requestType: 'change-email-taken'`); su página enseña lo mismo y su botón llama a `POST /api/account/approve-email-change`, que manda `change_to_taken` a la ocupada (H-06; X-11) **[sin evidencia]**. Al aplicarse, se cierran las otras sesiones, se reemite `cs_device` y sale `email_changed` con el deshacer de `UNDO_EMAIL_CHANGE_H` (72 h, no 7 días: seguridad O-08). Deshacer devuelve la vieja si sigue libre, cierra todas las sesiones, borra `push_targets` y lleva a `/forgot-password`; durante ese plazo no se admite otro cambio. §5.

**D-15 · La enumeración por tiempo y el cierre ordenado.** `backgroundTasks.handler = mailQueue.track` (X-15); `mailQueue` guarda las promesas en un `Set` e `index.ts` las espera hasta `MAIL_SHUTDOWN_GRACE_MS` en `SIGTERM` (H-02; O-18); `email_log` apunta `queued` antes de enviar. `enumTiming.test.ts` mide registro, recuperación y cambio de correo (codigo O-10). **[sin evidencia]** el `Set` y los 10 s. §5.

**D-16 · Los correos de cuenta.** Los diez de §G.9, enteros en §5, con el pie de §G.12, el botón en el `accent` de la web y no el índigo `#4f46e5`, fechas `19 Nov 2026, 18:42 UTC`, y `maskEmail` para la dirección nueva en `email_changed`. Topes propios: `signup_existing` y `change_to_taken` uno cada 24 h, `new_sign_in` uno por hora; todos dentro de L5 y L6 (O-04; I-14). §5.

## D. Sesiones

**D-17 · Vida y caché.** 30 días renovados cada día de uso, techo de 90 desde `created_at` (cerrada en `createCurrentUserId` y en el proxy de `get-session`), sin `cookieCache` (X-13; I-11), y sin alargarla en ausencia (28 días caben en 30: O-06). §6.

**D-18 · La IP no se guarda.** `disableIpTracking` (O-20); la 0056 vacía las filas; los logs de Railway la guardan entera. Precondición del PR 3: el dueño lee en Railway `ip_address` de sus sesiones y lo pega en el PR (H-04). §6.

**D-19 · Lo que llega a la web.** El proxy quita `session.token`, `ipAddress` y `userAgent` del JSON de `get-session` (I-24); `Devices` va por `GET /api/me/devices`, con id opaco y `deviceLabel` calculado en la API, sin IP ni agente crudo (DD-06 A). §6.

**D-20 · Cerrar sesiones.** `Sign out` por fila sin confirmar; `Sign out everywhere else` con confirmación, sube `device_epoch` y reemite la `cs_device` propia; cerrar borra los `push_targets` de esas sesiones. **[sin evidencia]** §6.

## E. Límites de intento

**D-21 · Qué IP vale.** Fastify `trustProxy: (addr, hop) => hop === 0` (X-02; I-08); `clientIp` valida con `net.isIP` y con una entrada que no es IP o más de dos registra `xff_varias` (una vez por hora) y usa el socket; `trustProxy: 1` prohibido; `better-auth` deja de usar la IP. Las réplicas de `web` (H-03): el dueño las mira en Railway; la capa por cuenta no depende de ellas. §7.

**D-22 · `auth_limits`.** Tabla con clave primaria; claves `acct:`, `dev:`, `pw:`, `mailip:` con HMAC-SHA256 y una clave derivada de `SESSION_SECRET` (también la IP); `reserveAttempt` antes de reenviar a `better-auth` (`INSERT … ON CONFLICT (key) DO UPDATE … RETURNING`) y `clearAttempts` al ver el 200 (X-01; H-01; I-12). §7.

**D-23 · `cs_device`.** Formato de §G.8; se emite al entrar bien y al recuperar; exime de L1 y tiene L2; se invalida subiendo `users.device_epoch` (al recuperar y al cerrar las otras); sobrevive a `Sign out` y Privacy lo dice (X-07; O-15). **[sin evidencia]** `device_epoch`. §7.

**D-24 · Las cifras.** Fastify por IP, sin cambio. L1 10 fallos en 15 min por cuenta, sin tope diario, cierra 15 min a quien no trae `cs_device`, igual para un correo que no existe. L2 10 en 15 min y 30 en 24 h por `cs_device`. L3 5 en 15 min y 10 en 24 h por usuario en `change-password`, `change-email`, `delete-user` y `export`; la décima cierra esa sesión. L4 20 en 24 h por IP en `sign-up`, `request-password-reset`, `send-verification-email` y `change-email`. L5 3 por hora por destinatario, sin tope diario: no se envía y la respuesta no cambia. L6 el presupuesto (D-26). (seguridad O-01 y O-03; I-13) §7.

**D-25 · Lo que ve quien choca.** `authErrorText` en todas las páginas de entrada y de `Account`; el 429 de Fastify gana `message` y `retryAfterS` (`app.ts` l. 213 a 217); botón deshabilitado con cuenta atrás; los textos de §G.12. §7, §12.

**D-26 · El presupuesto.** `MAIL_DAILY_BUDGET` (90 gratuito, 1.500 con Pro **[sin evidencia]**), `MAIL_RESET_RESERVE` 30 para recuperaciones de cuentas confirmadas, y al 70 % dejan de salir `new_sign_in`, `signup_existing` y `change_to_taken`; agotado, `Register` y `ForgotPassword` dicen `We can't send emails right now. Try again tomorrow.` (seguridad O-04). §7, §9.

**D-27 · Contraseñas filtradas (defecto de DD-11).** `hashPasswordWithHibp`: 5 caracteres del SHA-1 a `api.pwnedpasswords.com`, `HIBP_TIMEOUT_MS`, fallo abierto con `hibp_caido`; en registro, cambio y recuperación; no delata (X-10; I-23; H-05). §7.

## F. Rutas, dependencias y panel

**D-28 · Las subidas (PR 2).** `better-auth` 1.7.26 en API y web, `fastify` 5.12.8, `zod` ≥ 4.6.7, `fast-uri` por `pnpm.overrides`; medido: compila y pasa 1.126 tests (mapa 01 §8). `audit` de `cobertura.yml` bloqueante después de W5. Ningún plugin entra sin leer sus avisos. §8.

**D-29 · La lista blanca.** `AUTH_ALLOWED_PATHS` en el proxy, `disabledPaths` como complemento (X-14) y `authRoutes.test.ts` recorre `auth.api` y exige 404 fuera (I-06; O-21). Con DD-01 B se añaden las rutas de TOTP y de respaldo y siguen en 404 `send-otp` y `verify-otp`. §8.

**D-30 · El registro de `better-auth`.** `logger: { level: 'warn' }` fijo, con test (H-10). **[sin evidencia]** §8.

**D-31 · El panel raíz.** Correo raíz fijo, `admin_audit` (0055) en cada `PATCH` y `DELETE` de `/api/admin/users/:id`, visible en el panel; TOTP según DD-01, por defecto no (O-01; X-16). §8.

## G. Correo transaccional

**D-32 · DNS.** DMARC `p=none; rua=mailto:<DD-15>; fo=1`, a `quarantine` tras 30 días limpios; DKIM de 2.048 si Resend deja (no lo sé); CAA con la autoridad que use Railway; `docs/ops.md` l. 106 corregido (I-26). §9.

**D-33 · Saber qué pasó.** `mailer.ts` guarda el `id` de Resend en `email_log`; `POST /api/webhooks/resend` con `svix`; rebote, queja o supresión ponen `email_undeliverable_at` y `Account` lo dice. §9.

**D-34 · Plan, calentamiento y purga.** Pro antes de abrir (DD-10); tandas de la lista de espera de 50, 100 y 200 los tres primeros días y libre desde el séptimo si los rebotes no pasan del 4 %; purga diaria: `auth_limits` de más de 2 días, `email_log` de más de 90, `verifications` caducadas y, con DD-17, cuentas sin confirmar de más de 7 días sin corredor ni equipo (I-27; H-07). Sin tope diario de registros (seguridad: es un apagado a disposición de cualquiera). §9.

**D-35 · Subdominios, el día que haya otro flujo.** `notify.cyclingstar.app` con DKIM y return path, `List-Unsubscribe` y `List-Unsubscribe-Post`, y otro equipo de Resend porque la supresión es del equipo (mapa 02 §3 y §4). Hoy no se hace. §9.

## H. Privacidad, datos y contacto

**D-36 · `Privacy.tsx`.** El texto de jugador §11.1 corregido con estas decisiones: la IP no se guarda en la base y sí en los logs de Railway durante `<N>` días (no lo sé: se rellena del panel de Railway o el PR no se fusiona); `cs_device`; la zona horaria y la lengua del navegador; HIBP con DD-11; las condiciones; `We never send game news by email.`; sin `Ask`. Cada PR edita el apartado del hecho que cambia; `privacy.test.ts` crece con ellos. Responsable y base legal, a confirmar con un abogado. §10.

**D-37 · Los logs.** `serializers.req` con `redactUrl` (`token`, `callbackURL`, `/reset-password/<token>`, cualquier `email`); la IP entera se queda. §10.

**D-38 · Borrar.** `beforeDelete` llama a `deleteAccount`: `releaseUserToWorld`, el equipo con nombre generado (DD-14), las `verifications` del usuario y la fila de `users` en una transacción; cascadas de `sessions`, `accounts`, `race_watch`, `push_targets`, `notice_log`; `email_log` a nulo; L3 en el `after`; sale `account_deleted`; la portada dice `Your account is deleted` (I-10; O-25). §10.

**D-39 · Exportar.** `POST /api/me/export` con contraseña (L3) y `EXPORTS_PER_DAY`; JSON adjunto `cycling-star-<fecha>.json` con `users` sin hash, sesiones como `Devices`, `race_watch`, corredor con plan, bitácora, transacciones y contrato, equipo si es suyo, preferencias y aparatos sin credenciales (I-22; O-24). §10.

**D-40 · `last_seen_at` en toda visita.** Gancho `after` de `get-session` que llama sin esperar a `touchLastSeen` con su memo de una hora (X-19; I-19). §10.

**D-41 · El contacto aparcado.** Riesgo: quien pierde su buzón pierde la cuenta; la rectificación no tiene destino; nadie puede avisar de un menor; el único canal de hecho es el grupo de WhatsApp de la beta ([DUEÑO 12]). Coste: un reenvío de `support@`, un enlace en el pie, `Login` y `Privacy`, `security.txt`, y el tiempo de contestar. El PR 3 retira `Ask and…` y busca en `apps/web/src` otras promesas (I-20; H-11; H-13). §11.

## I. Avisos

**D-42 · El catálogo.** Los seis de §G.10, construidos solo con `PreStageInfo`, la lista de salida o datos de la cuenta; cada uno con su gemelo en la web; ninguno de seguridad (I-18). `offer_received` es del mercado de hoy; lo de la negociación entre personas entra por el mismo catálogo desde E9 (I-29). §13.

**D-43 · Topes, silencio y zona.** `NOTICE_DAILY_CAP` 3 sin contar `away_warning`; silencio de 22 a 8 en `users.time_zone`, que llega del navegador (`Intl`) con `POST /api/me/push-targets` y Privacy lo nombra (O-05); lo que cae en el silencio sale a las 8; TTL 6 h para `stage_ready`, 12 h para el resto; `tag` y `Topic` por aviso. El silencio lo decide la síntesis y §21 se lo enseña al dueño (O-06). **[sin evidencia]** §13.

**D-44 · El permiso y la baja.** Nunca al cargar; en los momentos de DD-03; baja de un toque con la acción `Turn off these` (Chrome, Edge, Firefox) o con `?from=notice&kind=` donde no hay acciones; sin contraseña. §13.

**D-45 · El service worker y D-00p.** `apps/web/public/sw.js` registrado solo al pulsar `Turn on`; `push`, `notificationclick` (solo URL del propio origen, si no `/`: I-02) y `pushsubscriptionchange`; sin `fetch`, sin Cache API, sin manifiesto: no hace la web instalable ni guarda nada (mapa 02 §7) y `sw.test.ts` lo fija. D-00p no cambia; la frase de `visual.md` l. 3656 se corrige como frontera en `docs/cuenta.md`. §13.

**D-46 · El envío y la SSRF.** `web-push` 4.0.0 con `web-push.d.ts`; VAPID en `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT=https://www.cyclingstar.app`; `isAllowedPushEndpoint` al guardar y al enviar (I-01; X-12; O-12); 404 o 410 borran, `PUSH_DEAD_AFTER_FAILS` seguidos también; `PUSH_TARGETS_PER_USER`, el undécimo sustituye al más viejo; ningún error vuelve al navegador ni hay aviso de prueba. §13.

**D-47 · El emisor.** `noticeSweep` se llama al final de cada pasada de `tick/main.ts` (cada 5 minutos, procese o no días) y tras cada `runTick` de `web` (`index.ts` l. 48, 56 y 90); inserta en `notice_log` antes de enviar, así que dos procesos no duplican; las variables VAPID entran en `loadEnv` y `loadTickEnv` (X-04; O-11). Con la ausencia viva no sale nada salvo `away_over`. **[sin evidencia]** la llamada sin días. §13.

**D-48 · Ningún aviso destripa.** `noticePayload` usa `stageReadyNotice` y la URL y el `tag` desde el `raceId` de fuera; el canario (`spoilerCanary.test.ts` l. 206) pasa a `noticePayload`; `stageReadyEmail` y sus tres tests se borran. El comentario de `pageTitle.ts` l. 5 es de W5 (H-16). §13.

**D-49 · Aparatos compartidos.** `Sign out` borra antes el `push_target` de ese navegador; cerrar una sesión borra los suyos; la caducidad no (I-25; O-19). §13.

**D-50 · El contrato para la app.** `push_targets.channel` y `credential jsonb`; un `Deliverer` por canal; la carga `{ kind, title, body, path, tag }` con `path` de la web; la app se registra con `POST /api/me/push-targets`. §13.

**D-51 · El iPhone (defecto de DD-04).** El texto de §G.12; nada fuera de `Notifications`; lo que no recibe lo tiene en la web (I-21; O-08; H-09). §13.

## J. Ausencia

**D-52 · Declarar.** `/account/away` con `Segmented` de `AWAY_SHORTCUT_DAYS` y `DateField` `Back on`; de `AWAY_MIN_HOURS` a `AWAY_MAX_DAYS` (DD-12); las líneas calculadas sin tocar el motor: fin del plan vivo (`train.ts` l. 135 a 138), ofertas (21 días de juego, unos 5 reales: X-20), agente libre (mapa 03 §7), la regla del mes solo con E7; `PUT` y `DELETE /api/me/away`. Los atajos, **[sin evidencia]**. §14.

**D-53 · Mientras dura.** Avisos callados salvo `away_over`; la regla del mes no corre; en `manual`, el día sin orden se resuelve como `mixto` en `trainingDay.ts` (X-05; I-16; O-02); entrar no la termina; `AwayBand` bajo la cabecera (DD-05 A); los correos de cuenta siguen. §14.

**D-54 · Inactividad y E7.** `inactiveSince = max(last_seen_at, away_until)`, también para el reloj del mánager (H-15); «login» es una visita (D-40); E7 decide la regla, el plazo, la silla y G8; si una ausencia se ve desde fuera es de E9 (O-07). §14.

**D-55 · `Welcome back` y la regla en la web.** Tras una ausencia o `RETURN_NOTICE_AFTER_DAYS` sin visita, en `Home`, encima de `While you were away` (sin duplicarlo), con cifras de `rider_daily_log` y `offers`; la regla del mes en `Away` y en `Welcome back` (si la visita anterior fue hace `MONTH_RULE_HINT_AFTER_DAYS` o más), solo con E7. Quien no acepta avisos y no vuelve no recibe nada: se le escribe al dueño y a E7 (H-14). §14.

## K. Pantallas, datos, plan y documentos

**D-56 · `Account` y las pantallas.** Lista con subpáginas (DD-07 A); las pantallas nuevas entran por el catálogo de E3 (`DateField` y `Field` `reveal` con su test y su sitio en `/_ui`; `docs/visual.md` l. 1329 a 1333) y pasan la prueba del teléfono a 360 y 320; los finales con `Notice` `good` y `role="status"`. §12.

**D-57 · Las migraciones.** Las de §G.3, con `pnpm exec drizzle-kit generate`, nulas o con defecto, sin reescribir la tabla; numeradas por el orden del plan (si otra línea toma antes un número, manda el nombre). **[sin evidencia]** el orden. §15.

**D-58 · El plan.** Los PR de §G.14, tests primero, cada uno desplegable con la cuenta de hoy. El 1 (pantallas) y el 2 (dependencias) primero; del 3 al 8, el secuestro, la fuerza bruta, los enlaces y el correo; el registro no se abre antes del 9, del abogado y de DD-10; el 15 espera a E7; el 16 a W5 para `visual.md`; el 18 solo con DD-01 B. Coste total, unas 120 horas (estimado del arquitecto; codigo estimaba 85 sobre `incremental` sin `Account` en subpáginas). **[sin evidencia]** §18.

**D-59 · Los documentos.** El PR 16 sustituye, con el texto escrito en §20: el correo de juego en `agenda.md` l. 313 a 314 y 665 a 668, `encargos.md` l. 446, `retransmision.md` l. 12895 y 13004 y `visual.md` l. 3623 (después de W5); «no hay recuperación» en `encargos.md` l. 312 a 316 y 776 a 778, G11 (`epics.md` l. 603 a 610) y `captacion.md` l. 26 a 28, 213 a 216 y 263 a 264; `docs/ops.md` l. 106 y 271; `last_seen` «no existe» en `encargos.md` l. 439 a 441 y 773 a 775 y `agenda.md` l. 615 a 616 y 688 a 691 (X-17; I-17; O-03). §20.

**D-60 · Lo que se mide.** Registros sin confirmar a las 24 h (más del 30 %), rebotes y quejas (4 % y 0,08 % en 7 días), bloqueos por cuenta (más de 5 cuentas al día), `xff_varias` (más de 0 en una semana), envíos frente al presupuesto (70 %), `hibp_caido`, suscripciones perdidas (más del 20 % a la semana), cuentas sin fecha, ausencias y vueltas para E7. §19.

---

## DD. Decisiones del dueño

El valor por defecto es el que se implementa. Las ocho primeras se deciden mirando `opciones/index.html` (alternativas pintadas a 360 px); las demás, en §21. Las alternativas enteras, en `veredicto.json` → `decisiones_del_dueno`.

| DD    | Qué                                  | Por defecto                                                                       | Si elige otra                                                                                                   | Antes del PR      |
| ----- | ------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------- |
| DD-01 | TOTP del panel (opciones)            | A: no en E4; correo raíz fijo, `admin_audit`, segundo factor del buzón como tarea | B: TOTP solo para administradores con `twoFactor` sin `sendOTP` (`send-otp` y `verify-otp` en 404), 0059, PR 18 | 18                |
| DD-02 | Avisos de serie (opciones)           | A: `stage_digest`, `plan_ending`, `offer_received`, `away_warning`, `away_over`   | B: solo `away_warning` y `away_over`; C: A y `stage_ready`                                                      | 14                |
| DD-03 | Cuándo se pide el permiso (opciones) | A: tras crear el corredor y al seguir una carrera, y en `Account`                 | B: solo en `Account`; C: A y la portada a la tercera visita                                                     | 14                |
| DD-04 | El iPhone (opciones)                 | A: aún no hay avisos en iPhone                                                    | B: el camino de iOS 26, tras probarlo; C: B y un aviso en la portada                                            | 14                |
| DD-05 | Pantalla de ausencia (opciones)      | A: atajos, fecha, líneas calculadas y banda                                       | B: solo la fecha; C: A sin banda                                                                                | 13                |
| DD-06 | Pantalla de sesiones (opciones)      | A: lista sin IP                                                                   | B: con IP recortada (vuelve a guardarla); C: solo el número y el botón                                          | 11                |
| DD-07 | `Account` (opciones)                 | A: lista con subpáginas                                                           | B: una página con paneles y el teclado de la captura 55 arreglado                                               | 11                |
| DD-08 | Presentación de Privacy (opciones)   | A: todo a la vista, por apartados                                                 | B: tabla `What`, `Why`, `How long`; C: resumen y detalle plegado                                                | 12                |
| DD-09 | Qué se guarda de la fecha            | A: la fecha entera                                                                | B: el año                                                                                                       | 9                 |
| DD-10 | Plan de Resend                       | A: Pro antes de abrir el registro                                                 | B: gratuito con tandas pequeñas                                                                                 | abrir el registro |
| DD-11 | Contraseñas filtradas                | A: sí, 3 s y fallo abierto                                                        | B: fallo cerrado; C: no                                                                                         | 10                |
| DD-12 | Ausencia máxima                      | A: 28 días                                                                        | B: 45                                                                                                           | 13                |
| DD-13 | Condiciones de uso                   | A: línea bajo el botón con versión guardada                                       | B: casilla obligatoria; las dos, a confirmar con un abogado                                                     | 9                 |
| DD-14 | Equipo de quien se borra             | A: nombre generado                                                                | B: el que dejó; a confirmar con un abogado                                                                      | 12                |
| DD-15 | Destino de DMARC                     | A: un buzón suyo fuera del dominio                                                | B: un servicio de resúmenes; C: ninguno                                                                         | 17                |
| DD-16 | Correo de entrada nueva              | A: encendido, uno por hora                                                        | B: con interruptor; C: apagado                                                                                  | 7                 |
| DD-17 | Purgar cuentas sin confirmar         | A: sí, a 7 días, sin corredor ni equipo                                           | B: no                                                                                                           | 17                |

## Lo que esta síntesis no ha podido comprobar

1. Nada en un iPhone, en un buzón con escáner real ni en producción más allá de lo que leyeron los mapas: lo cubre la prueba del dueño (§19).
2. El plan de Resend, `NODE_ENV`, el número de réplicas y cuánto guarda Railway los logs: los mira el dueño en sus paneles.
3. Las cifras sin evidencia marcadas arriba: las fija el test del PR que las introduce.
