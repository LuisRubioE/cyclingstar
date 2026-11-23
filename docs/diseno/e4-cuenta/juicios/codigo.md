# Juicio E4 · Coherencia con el código y coste

Juez: «codigo». Pregunta: ¿es verdad en el código y en el paquete lo que cada propuesta dice, cuesta lo que
dice y deja producción desplegable con los usuarios que ya existen? Árbol `2a29e6d`. Leídos enteros el
brief, las dos fases, los cinco mapas y las tres propuestas (`atacante.md` 597 l., `jugador.md` 597,
`incremental.md` 417). **Medido** en `<scratchpad>/juez-codigo/` sin tocar `repo/` ni los clones:
`rafaga.mjs` (el límite por cuenta de `incremental` con su propio gancho, sobre `better-auth` 1.7.26 y
PGlite), `reserva.mjs` (la variante con tabla y reserva previa) e `ip.mjs` (`trustProxy` en `fastify`
5.12.8 y 5.11.2 con dirección de socket). «`ba17/`» es `better-auth@1.7.26/dist/` y «`core17/`»
`@better-auth/core@1.7.26/dist/` del clon `mapa01/clon17`. Leyenda: ● vale; ◐ a medias o con un defecto
que corregir; ○ falso, ausente o roto.

## 1. Tabla cruzada

| #   | Ítem                               | atacante                                                                               | jugador                                                                              | incremental                                                                         |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | Subida a 1.7.26 y 5.12.8           | ● PR 1 solo, `audit` bloqueante después de W5                                          | ◐ PR 2, detrás de un PR de pantallas: bien, pero las opciones se escriben contra 1.7 | ● PR 1 solo, con test que fija lo que cambia 1.7                                    |
| 2   | Sesiones al recuperar              | ● `revokeSessionsOnPasswordReset` (`ba17/utils/password.mjs` l. 34)                    | ● la misma opción                                                                    | ● la misma, medida (`null` tras el reset)                                           |
| 3   | Enlaces de recuperación            | ◐ hash y anular al pedir; el borrado por `value` mata su propio token de deshacer      | ◐ hash y «borrar `reset-password:*`»: con hash ese prefijo ya no existe (comprob. 7) | ● hash medido, borrado por `value`, enlaces en claro de antes siguen valiendo       |
| 4   | Enumeración por tiempo             | ● `backgroundTasks`, test con umbral de 30 ms                                          | ● `backgroundTasks`                                                                  | ● `backgroundTasks` medido: 7 frente a 6 ms y 86 frente a 82 ms                     |
| 5   | Vida de los JWT de correo          | ● 1 h; recuperación a 1.800 s con `resetPasswordTokenExpiresIn` (`password.mjs` l. 73) | ● 24 h con una sola opción: cierto en 1.7.26 (comprob. 5)                            | ● 1 h, sin cambio                                                                   |
| 6   | Rutas abiertas                     | ◐ lista blanca en el proxy y 5 rutas propias: correcto y caro                          | ● 404 en el proxy y dos rutas propias (`devices`, `DELETE /api/me`)                  | ● `disabledPaths` medido (404 antes del limitador; `auth.api` sigue)                |
| 7   | Qué IP vale                        | ◐ `trustProxy: true` más `x-cs-client-ip` para `better-auth` (válido) y alarma         | ◐ `trustProxy: true` y un log al arrancar                                            | ● función que toma la última entrada; falta validar que sea una IP (comprob. 3)     |
| 8   | Limitador de `better-auth`         | ● explícito hasta PR 4 y luego apagado                                                 | ● apagado                                                                            | ● apagado, y `disableIpTracking`                                                    |
| 9   | Límite por cuenta: almacén         | ◐ `auth_throttle` con clave primaria; cuenta tras la respuesta                         | ◐ `auth_limits` con clave primaria; cuándo cuenta, sin decir                         | ○ en `verifications`: en ráfaga pasan 39 de 40 (comprob. 1)                         |
| 10  | Aparato conocido                   | ● `cs_device` propia, 180 días                                                         | ● `cs_known` propia, 180 días, sobrevive al cierre de sesión                         | ◐ reutiliza `cs_viewer`, que depende de E2 (comprob. 12)                            |
| 11  | Fecha de nacimiento en el servidor | ● gancho `before` que reescribe el cuerpo (`dispatch.mjs` l. 111 a 124)                | ● gancho `before` antes de buscar el correo                                          | ● `additionalFields.validator`, medido antes de buscar el correo                    |
| 12  | Sesión: vida, caché e IP           | ● 7 días y techo de 90; IP truncada con `databaseHooks`                                | ◐ 30 días y `cookieCache` de 60 s: una sesión cerrada vale 60 s en toda la API       | ● 30 días, sin caché, `disableIpTracking` medido (`""`)                             |
| 13  | Pantalla de sesiones               | ● rutas propias con id opaco                                                           | ● `GET /api/me/devices` con id opaco                                                 | ◐ `list-sessions` entrega los tokens de las otras sesiones al JavaScript            |
| 14  | Borrado atómico                    | ● ruta propia en una transacción                                                       | ● `DELETE /api/me` en una transacción                                                | ● `beforeDelete` con `deleteUserAsAdmin`, medido                                    |
| 15  | Logs sin tokens                    | ● `serializers.req` con `redactUrl`, test sin `eyJ` ni arroba                          | ● ídem, y recorta la IP del log                                                      | ● ídem                                                                              |
| 16  | `last_seen_at` en toda visita      | ● a `createCurrentUserId`                                                              | ● `onRequest` con sesión                                                             | ● gancho `after` de `get-session`, que también corre por `auth.api` en cada ruta    |
| 17  | Emisor de avisos                   | ◐ «al final del día del tick», sin decir dónde                                         | ● barrido con `notice_log` único: no depende de quién avance el mundo                | ○ tras `runTick` en `tick/main.ts`: con `AUTO_TICK=on` no ve los días (comprob. 11) |
| 18  | SSRF del `endpoint` de push        | ● lista de hosts y `https:`                                                            | ○ no la trata                                                                        | ○ no la trata                                                                       |
| 19  | Migraciones y filas que ya existen | ◐ cinco (0055 a 0059), todas nulas o con defecto                                       | ◐ cinco, todas nulas o con defecto; `time_zone` sin fuente escrita                   | ● dos (más una por la objeción 1), nulas o con defecto                              |
| 20  | Plan y coste                       | ◐ 12 PR, 3 a 4 semanas; el proxy reescrito es lo caro                                  | ◐ 12 PR en tallas; `Account` en subpáginas no está costeada                          | ● 14 PR en líneas y horas (unas 1.600 l. y 72 h, estimado); cada uno desplegable    |

**Lectura.** Las tres aciertan en las cinco opciones de `better-auth` que cierran los bordes del mapa 01;
`incremental` es la única que las ha medido una a una. Las tres fallan igual en el límite por cuenta
(cuentan después de la respuesta). `atacante` tiene el modelo de amenazas más completo y lo paga en código
propio; `jugador`, las mejores pantallas y el emisor más robusto.

## 2. Comprobaciones

| #   | Afirmación                                                                                        | De                          | Resultado | Evidencia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------- | --------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | El contador por cuenta cabe en `verifications` (contradicción con `atacante` §13 y `jugador` §13) | incremental §6              | a medias  | En serie, cierta (su `resultado.json`). En ráfaga, falsa: 40 entradas malas a la vez contra un correo, límite 10, dan **39 × 401 y 1 × 429**, tres filas de contador (37, 36, 36) y la buena dentro de la ráfaga entra con 200 (`rafaga.json`). `verifications` no tiene índice único (`schema.ts` l. 168 a 175), así que no admite `ON CONFLICT`. Con tabla de clave primaria y reserva antes de reenviar: **10 × 401 y 30 × 429**, una fila, la buena da 429 (`reserva.json`). **Hace falta tabla** |
| 2   | `trustProxy: 1` da siempre la del socket desde 5.12.1                                             | incremental §6              | cierta    | `fastify@5.12.8/lib/request.js` l. 53 a 56 (`return function () { return false }`). Medido: 5.12.8 da `10.1.2.3` (socket) en los seis casos; 5.11.2, el instalado hoy, da la última de la cabecera. Detrás de Railway, `1` metería a todo el mundo en un cubo por ruta                                                                                                                                                                                                                                |
| 3   | `true` toma la primera de `X-Forwarded-For`; la función de un salto, la última                    | atacante §6.1; incremental  | cierta    | `ip.json`: con `6.6.6.6, 203.0.113.7`, `true` da `6.6.6.6` y la función `203.0.113.7`; con una sola dirección (lo que deja un proxy que reescribe) dan lo mismo. Dos reservas: con dos saltos de Railway la función daría la IP del salto (`203.0.113.7, 100.64.0.9` da `100.64.0.9`), y ni la función ni `true` validan: `basura` sale como IP                                                                                                                                                       |
| 4   | Existen en 1.7.26 y hacen lo que dicen las cinco opciones                                         | incremental §0; las tres    | cierta    | `backgroundTasks`: `ba17/context/create-context.mjs` l. 212 a 224; `storeIdentifier: 'hashed'`: `db/internal-adapter.mjs` l. 751, y la búsqueda en claro de respaldo l. 801; `disabledPaths`: `api/index.mjs` l. 169 a 171; `disableIpTracking`: `core17/utils/ip.mjs` l. 218 y `rate-limiter/index.mjs` l. 243; `revokeSessionsOnPasswordReset`: `utils/password.mjs` l. 34, en la misma transacción que la contraseña                                                                               |
| 5   | `emailVerification.expiresIn` gobierna todos los JWT de correo                                    | jugador §4.1                | cierta    | En 1.7.26 (cita 1.6.25): `email-verification.mjs` l. 29, 109 y 201; `update-user.mjs` l. 457, 474, 491 y 508. La única rama con 3.600 s fijos es la heredada (`email-verification.mjs` l. 253), inalcanzable sin `updateEmailWithoutVerification`                                                                                                                                                                                                                                                     |
| 6   | El validador de `additionalFields` corre antes de buscar el correo                                | incremental §3              | cierta    | `ba17/api/routes/sign-up.mjs` l. 157 (`parseUserInput`) frente a l. 192 (`findUserByEmail`); `db/schema.mjs` l. 81                                                                                                                                                                                                                                                                                                                                                                                    |
| 7   | Al usar un enlace, `onPasswordReset` borra las filas `reset-password:*` del usuario               | jugador §4.1                | a medias  | Con `hashed` el identificador guardado es SHA-256 en base64url de `reset-password:<token>` entero (`db/verification-token-storage.mjs` l. 4 a 10): el prefijo desaparece. Vale borrar por `value` = id; por prefijo solo caerían las filas en claro de antes                                                                                                                                                                                                                                          |
| 8   | Anular las recuperaciones anteriores con `DELETE … WHERE value = $userId AND identifier <> …`     | atacante §4.1               | a medias  | El orden es bueno (`password.mjs` l. 75 crea la fila, l. 82 envía) y el hash coincide. Pero su token de deshacer vive en la misma tabla con el mismo `value` (§4.1, tabla): quien cambia el correo y pide una recuperación en la media hora siguiente borra el deshacer de la víctima                                                                                                                                                                                                                 |
| 9   | El plugin de contraseñas filtradas falla cerrado                                                  | incremental §7              | cierta    | `ba17/plugins/haveibeenpwned/index.mjs` l. 33 a 40: cualquier fallo es 500. `betterFetch` va sin tiempo de espera: si el servicio cuelga, cuelga el registro. `atacante` §6.5 dice «no lo sé»                                                                                                                                                                                                                                                                                                         |
| 10  | El gancho `after` ve el 401 y el `before` corta o cambia el cuerpo                                | incremental §6; atacante §3 | cierta    | `ba17/api/dispatch.mjs` l. 256 a 264 (el `APIError` pasa a `returned`) y l. 111 a 124 (`context` se funde; otro objeto corta la ruta)                                                                                                                                                                                                                                                                                                                                                                 |
| 11  | Los avisos salen de `tick/main.ts` tras `runTick`, con los días que acaba de procesar             | incremental §8              | falsa     | El mundo lo avanza también `web` con `AUTO_TICK=on`, el defecto (`env.ts` l. 84; `index.ts` l. 74 a 106), y `/admin/tick`: el cron sale entonces con `daysProcessed` 0 y no avisa. `jugador` §8.4 lo resuelve con `notice_log`, aunque sitúa el barrido en `index.ts` l. 69 a 98, que es `web`, y no en el cron de 5 minutos que termina (`railway.tick.json` l. 8 y 9)                                                                                                                               |
| 12  | El aparato conocido es el que trae `cs_viewer`                                                    | incremental §6              | a medias  | `cs_viewer` solo se emite en rutas `horizon` o `watch` con sesión y `viewerSecret` (`spoiler.ts` l. 355 a 377): con `spoilerMode` en `off` o antes de visitar una de ellas no hay exención, y `sign-out` la borra (`authProxy.ts` l. 18 a 21). La seguridad queda atada a un interruptor de E2                                                                                                                                                                                                        |
| 13  | Con `cookieCache` de 60 s, cerrar otro aparato tarda un minuto como mucho                         | jugador §5                  | cierta    | `createCurrentUserId` usa `auth.api.getSession` (`routes/context.ts` l. 53 a 58), que con la caché no lee `sessions` (`ba17/api/routes/session.mjs` l. 41 a 50): vale para toda la API, también para la sesión que la recuperación acaba de cerrar                                                                                                                                                                                                                                                    |

## 3. Puntuaciones

| Propuesta   | Cobertura | Coherencia | Seguridad | Experiencia |
| ----------- | --------- | ---------- | --------- | ----------- |
| atacante    | 9         | 7          | 8         | 5           |
| jugador     | 8         | 6          | 6         | 9           |
| incremental | 7         | 8          | 6         | 6           |

**atacante.** Lo que afirma del paquete está leído en 1.7.26 y es cierto (`x-cs-client-ip` por
`ipAddressHeaders` funciona, `core17/utils/ip.mjs` l. 221 a 228). Cubre lo que las otras no ven: SSRF,
lista blanca, deshacer, auditoría del panel. Pierde en coherencia por su propio choque entre anular
recuperaciones y el deshacer (8), el contador que cuenta tras la respuesta y cinco rutas propias que
sustituyen a las de `better-auth`; y en experiencia por la puerta neutra y el enlace de 30 minutos.

**jugador.** Las pantallas que mienten (mapa 05) se arreglan en un primer PR sin migración, y su emisor con
`notice_log` es el único que no depende de quién corre el tick. Pero escribe contra su propia opción (el
prefijo con `hashed`, 7), mete una caché de sesión que deja 60 s a la sesión robada tras recuperar (13),
confunde el servicio `tick` con `web` (11), no trata la SSRF y no costea `Account` en subpáginas.

**incremental.** La única que ha medido lo que propone, y casi todo es verdad: opciones, validador,
borrado atómico, enumeración, IP. Lo que no midió es lo que falla: la ráfaga contra su contador (1), el
emisor que no ve los días de `web` (11), la exención atada a `cs_viewer` (12); y no trata la SSRF, el
aviso a la dirección vieja ni `onExistingUserSignUp`.

## 4. Ganadora: `incremental`

Es la base que menos hay que reescribir contra el código: sus catorce PR van en orden de gravedad, cada uno
desplegable con los usuarios de hoy (enlaces en claro que siguen valiendo, sesiones que pasan a 30 días al
renovarse, columnas nulas), con dos migraciones y unas 1.600 líneas (estimado). Lo que le falta se injerta
sin rehacer nada: una tabla de límites (una migración más), una cookie de aparato, la lista de hosts de
push, el emisor por barrido y los correos de cuenta de las otras dos. Con `atacante` de base habría que
quitar código (proxy reescrito, rutas propias) y resolver el choque del deshacer; con `jugador`, rehacer la
capa de límites, la IP y la caché de sesión.

## 5. Injertos

1. **De `jugador` §13 (0056) y `atacante` §6.2: el límite por cuenta en una tabla propia con clave
   primaria**, reservado antes de reenviar (`INSERT … ON CONFLICT (key) DO UPDATE … RETURNING count`) y
   borrado al 200. Porque es lo único medido que aguanta la ráfaga (1) y no depende de la purga oportunista
   de `better-auth` (`internal-adapter.mjs` l. 806, solo cuando alguien busca una verificación).
2. **De `atacante` §4.1 y §6.3 (o `jugador` §6, `cs_known`): una cookie de aparato propia**, firmada como
   `cs_viewer` (`viewerCookie.ts` l. 27 a 31), emitida al entrar bien y al recuperar. Porque la exención no
   puede depender de `spoilerMode` (12).
3. **De `jugador` §8.4: el emisor como barrido idempotente con `notice_log unique (user_id, kind, ref)`**,
   llamado tras cualquier `runTick` (el de `web`, el del cron y el de `/admin`). Porque el de `incremental`
   pierde los días que avanza `web` (11).
4. **De `atacante` §8.4: la lista de hosts del `endpoint` y solo `https:`**, con su test (`localhost`,
   `*.railway.internal`, una IP). Porque la API hará `POST` a una URL que manda el cliente.
5. **De `atacante` §8.3: `notificationclick` solo abre URL del mismo origen.** Porque una clave VAPID
   filtrada no debe poder llevar a otra web.
6. **De `atacante` §4.5 (E5, E7) y `jugador` §4.4: el correo «email changed» a la dirección vieja y
   `onExistingUserSignUp`**, uno cada 24 h. Porque con `backgroundTasks` no delatan por tiempo
   (`sign-up.mjs` l. 201 a 206 los encola tras la transacción) y la propuesta solo avisa de la contraseña.
7. **De `atacante` §4.2: el token en el fragmento para todos los enlaces**, no solo la aprobación, con
   `?token=` y `GET reset-password/:token` vivos 7 días por los correos en vuelo. Porque la redacción de
   logs no cubre la petición de la página.
8. **De `jugador` §6.1 y su PR 1: `authErrors.ts`, el 429 de Fastify con `message` y `retryAfterS`
   (`app.ts` l. 213 a 217), `ForgotPassword` que mira la respuesta y `VerifyEmail` que pregunta por la
   sesión.** Porque arregla lo que el jugador ya ve, sin migración, y puede ser el PR 2.
9. **De `atacante` §7.1: la lista blanca como test**, que recorre los puntos de `auth.api` y exige 404 en
   los que no están permitidos, con `disabledPaths` calculado como su complemento. Porque un plugin o una
   subida que añada una ruta no se expone sin decidirlo, y sin reescribir el proxy.
10. **De `atacante` §7.3 punto 2 y `jugador` §4.3: el correo de `ADMIN_EMAIL` no se cambia desde la web**,
    con 403 en el gancho `before` de `/change-email`. Porque es la puerta del panel (mapa 04, [DOC 22]) y
    cuesta cinco líneas.
11. **De `atacante` §5 y `jugador` §5: la pantalla de sesiones con id opaco**, sin token ni IP, en una ruta
    propia sobre `auth.api.listSessions`. Porque `list-sessions` da los tokens al JavaScript.
12. **De `jugador` §4.1: 24 h para los JWT de correo con `emailVerification.expiresIn`** (5), si el dueño
    lo acepta. Porque es una línea, vale también para la aprobación y la propuesta no lo había visto.

## 6. Objeciones a la ganadora

1. **§6, el contador en `verifications`**: falla en ráfaga (1). Va a tabla (injerto 1); la 0056 pasa a ser
   `auth_limits` y `push_subscriptions` la 0057. El PR 5 gana una migración.
2. **§6, la exención por `cs_viewer`** (12): cookie propia (injerto 2).
3. **§8, el emisor en `tick/main.ts`** (11): barrido idempotente (injerto 3). Las variables VAPID entran en
   `loadTickEnv` (`env.ts` l. 124) y en el de `web`.
4. **§8, sin validación del `endpoint`**: SSRF (injerto 4).
5. **§6, la función de `trustProxy`**: validar con `net.isIP` y, si la última entrada no es una IP o llegan
   más de dos, registrar `xff_varias` y usar la del socket. Antes del PR 2, mirar `sessions.ip_address` de la
   cuenta del dueño en producción: `disableIpTracking` y el `UPDATE` de la 0055 borran la única prueba de
   lo que manda Railway.
6. **§4, `backgroundTasks` sin cierre ordenado**: `index.ts` no maneja `SIGTERM` (búsqueda: nada). Un
   `Set` de promesas pendientes y `await` de hasta 10 s al cerrar (`TIMEOUT_MS`, `mailer.ts` l. 51), en el
   mismo PR 2. Si no, cada despliegue puede tirar un enlace.
7. **§7, contraseñas filtradas sin tiempo de espera** (9): envolver con 3 s y decidir fallo abierto o
   cerrado (§8 de este juicio).
8. **§4, solo `passwordChangedEmail`**: faltan el aviso a la vieja y `onExistingUserSignUp` (injerto 6).
9. **§5, `list-sessions` con tokens al JavaScript**: ruta propia (injerto 11).
10. **§15, el test de enumeración**: el cambio de correo está «deducido del código»; el test del PR 2 tiene
    que medirlo, porque `update-user.mjs` l. 456 a 460 sigue sin esperar en la rama ocupada.
11. **§3, la puerta de la fecha solo en la web**: con el registro abierto, `currentUserId` tiene que
    responder 403 en crear corredor y tomar equipo (como `atacante` §3), o el agente la olvidará.
12. **§16, el coste**: con los injertos, unas 1.900 líneas, 85 horas y tres migraciones (estimado).

## 7. Lo que ninguna propuesta resuelve

1. **La reserva atómica del límite por cuenta**: `atacante` decide antes y cuenta después, `jugador` no dice
   cuándo, `incremental` comprueba en `before` y cuenta en `after`. Las tres dejan pasar la ráfaga (1).
2. **El cierre ordenado con correos en segundo plano** (objeción 6): `atacante` lo ve en `delivery_log`,
   ninguna lo evita.
3. **Cuántas réplicas tiene `web`**: el límite de Fastify en memoria se multiplica por réplica (mapa 01,
   «no ha podido comprobar», punto 4) y ninguna propuesta lo mira antes de confiar en él.
4. **Comprobar la IP que llega antes de dejar de guardarla** (objeción 5): nadie ordena la lectura de
   `sessions.ip_address` en producción antes del PR que la vacía.
5. **El tiempo de espera de la consulta a Have I Been Pwned** (9).

## 8. Las decisiones del dueño

- **Suyas de verdad**: la vida de la sesión (7, 30 o 90 días; por defecto 30, con `Devices`); qué se guarda
  de la fecha (entera o el año; por defecto entera, mismo coste en código); el plan de Resend (Pro antes de
  abrir); TOTP del panel (por defecto no en E4, con el correo raíz bloqueado); contraseñas filtradas (por
  defecto sí, con 3 s de espera y fallo abierto registrado); la duración máxima de la ausencia (28 o 45
  días: roza a E7); la casilla de condiciones (con el abogado).
- **Las cierra la síntesis**: `trustProxy`, la tabla de límites y sus cifras, `disabledPaths`, `hashed`,
  `backgroundTasks`, el emisor, la lista de hosts, la cookie de aparato, sin `cookieCache`.
- **De gusto, con valor por defecto**. Avisos de serie: (A) etapa con su corredor, ofertas y regla del mes
  encendidos, carreras seguidas apagadas; (B) el resumen diario de `jugador` (pide `time_zone` y horas de
  silencio, una columna y más código); (C) todos apagados. **Por defecto A.** Permiso: (A) en `Account`
  y una tarjeta tras crear el corredor; (B) solo `Account`; (C) además en la portada a la tercera visita.
  **Por defecto A.** iPhone: (A) «aún no hay avisos en iPhone» hasta probar iOS 26 en un aparato; (B) la
  instrucción de la pantalla de inicio (`jugador` §8.3). **Por defecto A.** Ausencia: (A) panel en
  `Account` con la fecha y dos líneas calculadas (fin del plan, `train.ts` l. 135 a 138; agente libre);
  (B) con atajos de 1, 2 y 4 semanas; (C) página propia. **Por defecto A.** Sesiones: (A) lista sin IP;
  (B) con IP truncada; (C) solo el botón. **Por defecto A.** Privacidad: (A) por paneles; (B) tabla; (C)
  resumen y detalle plegado. **Por defecto A.** `Account`: (A) una página con paneles y el caso del
  teclado (captura 55) arreglado; (B) subpágina por tarea, que reescribe `Account.tsx` (417 l.) y sus
  tests. **Por defecto A.**
