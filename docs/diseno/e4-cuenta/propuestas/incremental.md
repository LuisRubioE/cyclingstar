# E4 · Propuesta `incremental`: lo que ya trae `better-auth`, dos migraciones y catorce PR

Lente: la cuenta vista desde el código que ya existe y lo que cuesta cambiarlo. Commit `2a29e6d`. Paquete leído: `better-auth` 1.7.26 y `@better-auth/core` 1.7.26 del clon del mapa 01 (`<scratchpad>/mapa01/ba17` y `core17`; abajo, `ba17/…` y `core17/…`). **Medido** con dos scripts propios en `<scratchpad>/propuesta-incremental/` (se pierden con la sesión): `medir.mjs` levanta PGlite con las 55 migraciones de hoy más la columna propuesta, monta `betterAuth` 1.7.26 con la configuración de esta propuesta y le habla con `Request` de verdad por `auth.handler` (sin Fastify), con un correo falso que tarda 250 ms; salida en `resultado.json`. `ip.mjs` prueba `trustProxy` en `fastify` 5.12.8. **El mapa 05 no existía** al escribir las pantallas: trabajo con `apps/web/src/pages/` y no he visto capturas.

## §0. Resumen

La idea: casi todo lo que falla en la cuenta se arregla con **opciones de `better-auth` que nadie ha puesto**, no con código nuevo. Medido en 1.7.26: `revokeSessionsOnPasswordReset` cierra la sesión robada al recuperar; `verification.storeIdentifier: 'hashed'` saca los enlaces de recuperación en claro de la base y sigue aceptando los de antes del despliegue; `advanced.backgroundTasks` quita la espera del correo y con ella la enumeración por tiempo (7 frente a 6 ms al recuperar, 86 frente a 82 ms al registrarse, con un correo de 250 ms); `disabledPaths` cierra `verify-password` y `update-user` por HTTP sin tocar su uso desde el servidor; `user.additionalFields` con un `validator` de Zod rechaza en el propio registro a quien no tiene 16 años, también con un correo que ya existe, así que no delata cuentas. Lo que `better-auth` no trae (el límite por cuenta, un solo enlace de recuperación vivo, el borrado atómico) son **ganchos de 10 a 30 líneas** dentro de `auth.ts`, y el contador por cuenta vive en la tabla `verifications`, que ya existe y que `better-auth` ya purga.

En qué se distingue de lo obvio: lo obvio es una tabla de límites, otra de consentimientos, otra de ausencias, otra de preferencias y una pantalla nueva por pieza. Aquí hay **dos migraciones**: la 0055 cambia `users` una sola vez (fecha de nacimiento, ausencia, preferencias de aviso) y la 0056 crea la única tabla nueva, la de aparatos que reciben avisos. Y **catorce PR**, cada uno desplegable solo, con sus tests delante, que dejan producción mejor que antes; el primero solo sube versiones.

Qué resuelve: la sesión robada que sobrevive a la recuperación, el límite por cuenta, los tokens en claro en la base y en los logs, la enumeración, las rutas abiertas, el limitador que depende de `NODE_ENV`, el borrado a medias, la edad, las sesiones, `last_seen_at`, la privacidad falsa, los avisos del navegador y el modo ausencia. Qué deja: los webhooks de Resend y los informes DMARC hasta que haya buzón (los dos con su coste escrito, §10), el segundo factor del panel (§7, decisión del dueño), el contacto (§12) y todo lo que el mundo hace con un ausente (E7).

## §1. Diagnóstico, por gravedad

1. **Una sesión robada sobrevive a la recuperación** y la web no deja cerrar las otras (mapa 01 §2 y §3). Es el secuestro completo: quien la tiene sigue dentro siete días renovables.
2. **Ningún límite mira la cuenta** (mapa 01 §4.2, serie H): repartido entre IP, un correo admite intentos sin fin.
3. **Los tokens se ven donde no deben**: los de recuperación en claro en `verifications` y dos vivos a la vez (mapa 01 §2); los de verificación, con el correo dentro, y los de recuperación en la URL de cada línea `incoming request` del log (mapa 03 §4).
4. **El tope de Resend**: con el plan gratuito el correo 101 del día no sale, y con la verificación obligatoria es una cuenta que no entra (mapa 02 §3). No sé qué plan hay.
5. **`Privacy.tsx` dice cuatro cosas falsas** (mapa 03 §5), una de ellas que la IP no se guarda.
6. **No hay fecha de nacimiento** (mapa 03 §8): bloquea abrir el registro (§9.1 del brief, punto 1).
7. **El tiempo delata qué correos existen** en registro, recuperación y cambio de correo (mapa 01 §5).
8. **Rutas abiertas**: `verify-password` a 60 intentos por minuto; `update-user` sin tope (mapa 01 §1).
9. **La IP es frágil en las dos capas**: Fastify toma la de más a la izquierda de `X-Forwarded-For` (mapa 01 §4.1) y `better-auth` mete a todos en un cubo si la cabecera trae dos (mapa 01 §4.2, serie E) y solo limita con `NODE_ENV=production`, que no sabemos si está.
10. **El borrado no es atómico** (mapa 03 §3).
11. **`last_seen_at` no se escribe en toda visita** (mapa 03 §6).
12. **No hay avisos ni modo ausencia** (brief §2.3): no es un fallo, es lo que falta construir.
13. **El correo no tiene informes ni se entera de los rebotes**; DKIM de 1.024 bits (mapa 02 §2 y §3).
14. **Seis documentos prometen correo de juego** y cinco dicen que no hay recuperación (mapa 04 §6).

Lo que confirmo y lo que añado a los mapas: el mapa 01 §7 dice que `customRules` es «por ruta y por IP»; en 1.7.26 la regla puede ser una función de la petición, pero la clave sigue siendo `<ip>|<ruta>` (`ba17/api/rate-limiter/index.mjs` l. 248 y 262 a 278), así que el límite por cuenta no cabe en el limitador de `better-auth`. Y una novedad de 1.7 que el mapa 03 §8 no podía ver: si la tabla de Drizzle no tiene la columna de un campo adicional, `better-auth` lanza `SchemaMismatchError` en la primera petición (medido: así falló mi primera prueba, con `fieldName: 'birth_date'` y la clave `birthDate`; `ba17/context/create-context.mjs` l. 231).

## §2. Principios

1. **Opción antes que gancho, gancho antes que ruta propia.** Consecuencia: siete de los arreglos son una línea en `createAuth` (`apps/api/src/auth.ts` l. 102 a 223); los ganchos van en el `before` y el `after` que ya existen (l. 174 a 193); solo hay cuatro grupos de rutas propias nuevas, todas bajo `/api/me/` (`birth-date`, `away`, `push` con sus `prefs`, y `export`).
2. **Una capa por trabajo.** Fastify limita por IP; un gancho limita por cuenta; el limitador de `better-auth` se apaga por escrito. Consecuencia: el valor de `NODE_ENV` en Railway deja de importar para la seguridad, que es la regla que ya sigue `auth.ts` l. 196 a 208 con el origen.
3. **Las tablas que hay antes que tablas nuevas.** Consecuencia: los contadores por cuenta van a `verifications` con un prefijo, como hace `better-auth` con `reset-password:`; las preferencias de aviso, a una columna `jsonb` que admite avisos nuevos sin migración.
4. **`users` cambia una vez.** Consecuencia: la 0055 añade de golpe las cinco columnas que E4 necesita, nulas o con defecto, aunque tres no se usen hasta los PR 11 y 12.
5. **Cada PR deja producción mejor y desplegable sola.** Consecuencia: el orden de §16 va por gravedad, y ningún PR deja un estado intermedio peor (por ejemplo, el limitador de `better-auth` se apaga en el mismo PR en el que Fastify pasa a leer bien la IP).
6. **Los usuarios que ya existen son una restricción, no una nota.** Consecuencia: cada cambio dice qué pasa con la sesión, el enlace o la fila que ya están en producción (§17), y los enlaces en claro de antes del despliegue siguen valiendo (medido).
7. **La página de privacidad se corrige en el PR que cambia el hecho.** Consecuencia: no hay un PR de «texto de privacidad» al final; cada PR que toca lo que se guarda edita su párrafo de `Privacy.tsx`.

## §3. El registro y la edad

**El campo.** `user.additionalFields.birthDate` en `auth.ts`: `type: 'string'`, `required: true`, `input: true`, `returned: true`, y `validator.input` con un esquema de Zod que vive en `packages/shared/src/account/birthDate.ts` para que la web y la API compartan la regla. La columna es `users.birth_date date` (0055, §13), nula para las cuentas de antes. La clave de Drizzle en `schema.ts` tiene que ser `birthDate` (la del campo), o 1.7 no arranca (§1).

**La validación**, en el servidor y con este orden de mensajes (pantalla):

| Caso                                          | Respuesta medida                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Sin el campo                                  | 400 `MISSING_FIELD`, `birthDate is required` (la web pone el suyo)      |
| No es `AAAA-MM-DD` o no existe (`2001-02-30`) | 400 `VALIDATION_ERROR`, `Enter a valid date of birth.`                  |
| Menos de 16 años cumplidos hoy, en UTC        | 400 `VALIDATION_ERROR`, `You must be at least 16 to play Cycling Star.` |
| Igual, con un correo que ya tiene cuenta      | **el mismo 400**: el validador corre antes de mirar si el correo existe |
| Correcta                                      | 200 y `users.birth_date = '2000-05-01'`                                 |

El último par es la razón de usar el validador de `better-auth` y no un gancho propio: `parseUserInput` corre en `ba17/api/routes/sign-up.mjs` l. 157 y la búsqueda del correo en l. 192, así que el menor no distingue una cuenta existente de una nueva (medido, `resultado.json`, `registro`). También se rechaza un año anterior a 1900.

**Qué se guarda y por qué.** La fecha entera tal como la declara la persona. Basta para el único uso de hoy (16 o más) y permite revisar la regla sin volver a preguntar si el abogado la cambia por país (`agenda.md` §3.7 habla de una horquilla de 13 a 16). Del menor rechazado **no se guarda nada**: el 400 sale antes de crear la fila, y el log del rechazo es una línea con la ruta y el código, sin la fecha. La alternativa más mínima (guardar solo el año, o solo que se declaró mayor) está en §19.

**La pantalla de registro** (`Register.tsx` l. 145 a 170, un tercer `Field` entre el correo y la contraseña; `registerProblem` de `domain/entryForms.ts` l. 32 a 39 gana el tercer argumento): `<input type="date">`, que en el teléfono abre el selector del sistema. Textos (pantalla):

- Rótulo `Date of birth`; ayuda `You must be 16 or older. We only use it to check your age.`
- Errores en el campo: `Enter your date of birth.`, `Enter a valid date of birth.`, `You must be at least 16 to play Cycling Star.` La web comprueba lo mismo antes de enviar, con la misma función compartida; el servidor manda.
- Bajo el botón `Create account`: `By creating an account you confirm the date above is yours. Read how we use your data: Privacy.` (con el enlace a `/privacy`).

**Las cuentas que ya existen** (hoy una, la del dueño, brief §9.1 punto 1). Al cargar, la web ya pide `get-session`; con `returned: true`, `user.birthDate` viene en él. Si es `null`, el envoltorio de las rutas con sesión de `App.tsx` (no he leído cuál es: hay uno por ruta desde l. 216) manda a `/account/birth-date`, salvo desde `/privacy`, `/account/birth-date` y el cierre o borrado de la cuenta. Pantalla:

- Título `One more thing`; estado `We now ask every player for their date of birth. You must be 16 or older to play.`; el mismo campo; botón `Save`.
- Guarda con `PUT /api/me/birth-date` (ruta propia, Zod con el mismo esquema, escribe solo si la columna es nula: con fecha, 409 `already_set`). `update-user` no sirve porque se cierra (§7).
- Si la fecha da menos de 16: 400, **no se guarda**, y la pantalla dice `You must be at least 16 to play Cycling Star. You can delete your account here.` con el formulario de borrado de `Account` (contraseña) y `Log out`.

La puerta es solo de la web: la API no rechaza a una cuenta sin fecha. Con una cuenta en producción no merece un comprobante en `currentUserId` (`routes/context.ts` l. 57); si el dueño abre el registro con cuentas antiguas sin fecha, se añade (§17).

**Las condiciones de uso.** No hay ninguna escrita, y redactarlas no es de este diseño: a confirmar con un abogado, igual que si los 16 valen en todos los países y si la fecha declarada basta. Lo que la propuesta pone es lo mínimo que no dictamina: la línea bajo el botón y la frase de edad en `Privacy.tsx` (§11). **Sin casilla de aceptar** y sin guardar un consentimiento: si el abogado los pide, son una columna `terms_accepted_at` y un `Field` más (una migración pequeña, §19).

## §4. Verificación, recuperación y cambio de correo

| Token                      | Longitud y forma                        | Vida    | Un solo uso                                   | Al pedir otro                    | Se guarda                                                       |
| -------------------------- | --------------------------------------- | ------- | --------------------------------------------- | -------------------------------- | --------------------------------------------------------------- |
| Verificación               | JWT HS256, 211 car. en 1.7 (mapa 01 §8) | 3.600 s | No: tras confirmar, reabrir no abre sesión    | El anterior sigue valiendo (JWT) | En ningún sitio                                                 |
| Recuperación               | `generateId(24)`, unos 143 bits         | 3.600 s | Sí (`consumeVerificationValue`)               | **El anterior muere** (gancho)   | `verifications.identifier` = SHA-256 en base64url, sin el token |
| Aviso a la dirección vieja | JWT, unos 230 car.                      | 3.600 s | No (JWT); aprobar exige ahora un botón        | No se anula                      | En ningún sitio                                                 |
| Verificación de la nueva   | JWT                                     | 3.600 s | En la práctica (1.7: 2.º uso `INVALID_TOKEN`) | No se anula                      | En ningún sitio                                                 |

**Recuperación, medido** (`resultado.json`, `recuperacion`):

- `storeIdentifier: 'hashed'`: ninguna fila contiene el token. Un enlace en claro de antes del despliegue **sigue valiendo** (200): `findVerificationValue` busca primero el hash y luego el texto plano (`ba17/db/internal-adapter.mjs` l. 800 a 801). No hay que invalidar nada al desplegar.
- **Un solo enlace vivo**: gancho `before` en `/request-password-reset` que borra las filas cuyo `value` es el id del usuario de ese correo (`DELETE … USING users … WHERE lower(u.email) = lower($1) AND v.value = u.id::text`) antes de crear la nueva. Pedidos dos, el primero da 400 y el segundo 200. La consulta es la misma exista o no el correo, así que no delata. Las filas de recuperación son las únicas con `value` igual a un id de usuario (la verificación y el cambio de correo no dejan fila, mapa 03 §1; los contadores de §6 guardan una cifra).
- `revokeSessionsOnPasswordReset: true`: la sesión abierta antes responde `null` después; en 1.7 el cierre y la contraseña nueva van en una transacción (`ba17/utils/password.mjs` l. 31 a 46).
- `onPasswordReset` borra lo que quede: las filas del usuario y su contador de entradas fallidas (§6). Medido: 0 filas tras el reset. También lo llama, con el mismo efecto, un gancho `after` de `/change-password` cuando responde 200.

**La enumeración por tiempo**, cerrada con `advanced.backgroundTasks.handler`: `better-auth` deja de esperar al correo en las ramas que lo envían (`ba17/context/create-context.mjs` l. 212 a 218; las llamadas en `password.mjs` l. 82, `sign-up.mjs` l. 255, `update-user.mjs` l. 476 y 496, `email-verification.mjs` l. 207 y 255). Medido con un correo de 250 ms, medianas de 9: recuperación 7 ms con cuenta y 6 sin ella (hoy 259 frente a 9); registro 86 ms nuevo y 82 ms existente (hoy 341 frente a 84). Los 11 correos salieron igual, después de la respuesta. El cambio de correo usa la misma función y no lo he medido (deducido del código). El manejador es una función que `createAuth` recibe inyectada: en producción `(p) => void p` con el error ya registrado (`mailer.send` nunca lanza, mapa 02 §1); en los tests, una que guarda la promesa para esperarla (§15).

**Sesiones al cambiar el correo**: no se cierran. El cambio exige ya la dirección vieja y la nueva, y la pantalla de sesiones (§5) deja cerrar las demás. `better-auth` no trae la opción y el gancho para distinguir «este `verify-email` era el de la dirección nueva» es más código del que vale.

**Cambio de correo, dos piezas propias pequeñas:**

1. **Pide la contraseña**: gancho `before` en `/change-email`, el patrón de `/delete-user` (`auth.ts` l. 180 a 192), que comprueba `password` contra la cuenta `credential` con `ctx.context.password.verify`. Error (pantalla): `Enter your current password to change your email.` y, si es mala, `Wrong password.` En `Account`, un `Field` `Current password` en el panel `Email`.
2. **Aprobar es un botón, no un enlace**: el correo a la dirección vieja deja de llevar el enlace de la API y lleva `https://www.cyclingstar.app/confirm-email-change#t=<jwt>`. El fragmento no llega al servidor (no entra en el log) y un escáner de enlaces que lo siga solo carga una página. La página lee del JWT, sin verificarlo, la dirección nueva (`updateTo`) y pinta (pantalla) título `Approve the new email`, texto `Move your Cycling Star account to new@example.com?`, botón `Approve the change` (navega a `/api/auth/verify-email?token=…&callbackURL=/verify-email?step=approved`) y enlace `This wasn't me` a `/forgot-password`. Cierra el riesgo del escáner del mapa 01 §2.

**Los correos** (las tres plantillas de hoy no cambian salvo el enlace del aviso; `emails.ts` l. 66, 92 y 118). Uno nuevo, `passwordChangedEmail`, que manda `onPasswordReset` y el gancho de `/change-password` (correo):

- Asunto: `Your Cycling Star password was changed`
- Texto: `The password of your Cycling Star account was changed on 19 November 2026 at 10:52 UTC. Every other device was logged out.` Línea en blanco. `If it was you, there is nothing to do.` `If it was not you, reset your password now: https://www.cyclingstar.app/forgot-password`
- HTML: el `layout` de hoy con título `Your password was changed`, botón `Reset my password` (a `/forgot-password`, sin token) y pie `This email has no login link. Never share your password.`

## §5. Las sesiones

**Duración**: `session.expiresIn` de 7 a **30 días** (2.592.000 s), `updateAge` 1 día (el de hoy). Quien entra una vez al mes no vuelve a escribir la contraseña, y eso es lo que E2 pedía a E4 (mapa 04 §7). Medido: la cookie sale con `Max-Age=2592000`. Las sesiones vivas pasan a 30 días en su siguiente renovación, sin migración (mapa 01 §3). El precio es una sesión robada más larga, y lo paga §4 (la recuperación la cierra) y esta pantalla.

**`cookieCache`, apagada a propósito**: con ella, cerrar otra sesión no surte efecto hasta que caduca la caché (5 minutos por defecto, `core17/types/init-options.d.mts` l. 1003 a 1015). Cada petición sigue leyendo `sessions` y `users`, y el memo de `request.viewer()` de E2 sigue haciendo falta.

**`cs_viewer`**: no cambia (90 días, solo restringe, `viewerCookie.ts` l. 5 a 21). Cerrar otras sesiones no la borra en esos aparatos, y no hace falta: no abre nada. Gana un uso (§6).

**Qué se guarda de cada sesión y por qué**: `token` (para casar la cookie), `user_id`, `expires_at`, `created_at`, `updated_at`, y `user_agent` para nombrar el aparato en la pantalla. **La IP, no**: `advanced.ipAddress.disableIpTracking: true` (medido: `ip_address` queda `""`), y la 0055 vacía las filas de antes. Nadie la lee hoy (mapa 03 §1), el limitador que la usaba se apaga (§6) y quitarla vuelve verdadera la frase de la privacidad en vez de reescribirla.

**La pantalla**, un panel `Sessions` en `Account` entre `Password` y `Appearance`, sobre `authClient.listSessions()`, `revokeSession({ token })` y `revokeOtherSessions()` de `better-auth` (medido: `list-sessions` devuelve 200 con `createdAt`, `expiresAt`, `id`, `ipAddress`, `token`, `updatedAt`, `userAgent`, `userId`). Textos (pantalla):

- Estado: `Devices where you are logged in.`
- Cada fila: el aparato (`Chrome on Android`, `Safari on iPhone`, `Firefox on Windows`; sin coincidencia, `Unknown browser`), la marca `This device` en la propia (se casa por `token` con `get-session`), y `Logged in 3 Nov 2026 · Active 18 Nov 2026`. «Active» es `updatedAt`, que solo se mueve una vez al día: por eso fecha y no hora.
- Botón por fila, salvo la propia: `Log out`. Debajo: `Log out all other devices`. Respuesta: `Logged out of 2 other devices.`; sin otras: `No other devices.`; error: `Could not load your sessions. Try again.`
- El nombre del aparato sale de una función pura de unas 25 líneas en `apps/web/src/domain/` (navegador entre Edge, Chrome, Firefox, Safari y Opera; sistema entre iPhone, iPad, Android, Windows, macOS y Linux), con su test. Sin librería.

`list-sessions` entrega al JavaScript el token de las otras sesiones; sin `SESSION_SECRET` no se fabrica la cookie (mapa 01 §3) y no hay plugin `bearer`, así que lo acepto en vez de envolver la ruta.

**`last_seen_at` en toda visita con sesión**: gancho `after` en `/get-session` que, si hay sesión, llama sin esperar a `touchLastSeen(db, userId)` (`packages/db/src/horizon.ts` l. 585 a 604), con su memo de una hora. La web pide `get-session` al cargar (mapa 01 §1, `useSessionState.ts` l. 23), así que cubre toda visita. Para la regla del mes, «login» es esto: una visita con sesión (mapa 04 §6.2).

## §6. Los límites de intento

| Capa                    | Qué                                                          | Cifra           | Clave                            | Almacén                          | Al desplegar  |
| ----------------------- | ------------------------------------------------------------ | --------------- | -------------------------------- | -------------------------------- | ------------- |
| Fastify (igual que hoy) | todo                                                         | 300/min         | IP                               | memoria, LRU de 5.000            | se vacía      |
| Fastify (igual que hoy) | resto de `/api/auth/*`                                       | 60/min          | IP                               | memoria                          | se vacía      |
| Fastify (igual que hoy) | las 8 rutas de `CREDENTIAL_AUTH_PATHS`, cada una su contador | 10 cada 5 min   | IP                               | memoria                          | se vacía      |
| Gancho propio           | entradas **fallidas** (401) en `/sign-in/email`              | 10 por hora     | SHA-256 del correo en minúsculas | `verifications`, `signin-fail:…` | **sobrevive** |
| Gancho propio           | correos de recuperación pedidos                              | 3 por hora      | íd.                              | `verifications`, `reset-mail:…`  | sobrevive     |
| Gancho propio           | correos de verificación pedidos sin sesión                   | 3 por hora      | íd.                              | `verifications`, `verify-mail:…` | sobrevive     |
| Gancho propio           | registros nuevos en todo el juego                            | 80 al día (§10) | ninguna                          | `count(*)` de `users` de 24 h    | no aplica     |
| `better-auth`           | **apagado**: `rateLimit: { enabled: false }`                 | no aplica       | no aplica                        | no aplica                        | no aplica     |

**El límite por cuenta, medido** (`resultado.json`, `limitePorCuenta`, una IP distinta en cada intento): diez 401 y luego 429; la contraseña **buena** desde otra IP, 429; desde un aparato conocido, 200; otra cuenta, 401 (no se contagia); y un correo **que no existe** da exactamente la misma serie, diez 401 y 429, así que el límite no delata. El contador es un `UPDATE … SET value = value::int + 1 … RETURNING` (atómico por fila) y un `INSERT` si no había; la carrera de dos primeros fallos a la vez crea dos filas y se cuenta la más nueva, que es tolerable para un contador de fallos. Las filas caducan con `expires_at` y `better-auth` las purga solo: borra las caducadas como mucho una vez por minuto al buscar cualquier verificación (`internal-adapter.mjs` l. 19 y 805).

**Cómo no convertirlo en un cerrojo para la cuenta de otro.** Tres salidas que el atacante no tiene:

1. **El aparato conocido**: si la petición trae una `cs_viewer` válida y su `userId` es el de ese correo (`readViewerCookie`, `viewerCookie.ts` l. 34 a 51, más una lectura de `users` solo cuando hay cookie), el límite por cuenta no se aplica; el de Fastify por IP, sí. El atacante no puede fabricarla sin `SESSION_SECRET`. Quien cerró sesión en ese aparato la perdió (`authProxy.ts` l. 18 a 21) y cae en la salida 2.
2. **La recuperación**: el límite de entradas no la frena, y `onPasswordReset` borra el contador. El precio para la víctima es una recuperación. Si el atacante gasta además los 3 correos de la hora, esos correos llegan al buzón de la víctima y el último sirve: el tope corta **antes** de borrar enlaces, así que el último enviado sigue vivo.
3. **La ventana**: una hora desde el primer fallo.

El techo para un atacante con IP sin fin: 10 contraseñas por hora y cuenta, 240 al día (calculado), frente a las ilimitadas de hoy. Con la lista de contraseñas filtradas (§7) las más probadas ya no existen en cuentas nuevas.

**Qué IP vale.** Fastify: `trustProxy` pasa de `true` a `(_addr, hop) => hop === 0` (`app.ts` l. 160), que confía solo en quien abre la conexión (el borde de Railway) y toma la **última** dirección de `X-Forwarded-For`, la que añadió él. Medido en `fastify` 5.12.8 (`ip.json`): con `6.6.6.6, 203.0.113.7`, `true` da `6.6.6.6` (falsificable si Railway añadiera en vez de reescribir) y la función da `203.0.113.7`; con una sola dirección, las dos dan la misma. Ojo: `trustProxy: 1`, el número que parecería lo mismo, **da siempre la del socket** desde 5.12.1, que lo cerró por el aviso `GHSA-3m5p-2c4r-xxw2` (`fastify/lib/request.js` l. 53 a 57; medido). `better-auth` deja de necesitar la IP: sin limitador y sin rastreo (`rate-limiter/index.mjs` l. 243), su lectura de la cabecera ya no afecta a nada.

**La comprobación**, en test y en producción: un test de `app.inject` con `X-Forwarded-For: 6.6.6.6, 203.0.113.7` exige `request.ip === '203.0.113.7'`; y `authProxy.ts` registra una vez por hora `warn` `xff_varias` si una petición de credenciales llega con más de una dirección. Tras desplegar se busca esa etiqueta en los logs de Railway: cero es lo esperado (brief §2.2).

**Qué ve el jugador** (pantalla, en `Login.tsx` l. 54 a 61, que hoy enseñaría `Wrong email or password.` con un 429 de Fastify, porque su cuerpo no trae `message`: deducido del código, no medido):

- 429 de Fastify: `Too many attempts from this connection. Wait 5 minutes and try again.`
- 429 por cuenta: `Too many failed attempts for this account. Try again later, or reset your password.` con el enlace `Reset your password`.
- Topes de correo por cuenta: nada distinto. La pantalla de `ForgotPassword` dice lo de siempre; el correo simplemente no sale (el gancho `before` devuelve la misma respuesta genérica, que en 1.7 corta la ruta: `ba17/api/dispatch.mjs` l. 238 a 243).
- Tope diario de registros: 503 y `Sign-ups are paused for today. Please try again tomorrow.`

## §7. Las rutas abiertas, las dependencias y el panel

**Lo que se cierra**, con `disabledPaths` (`ba17/api/index.mjs` l. 169 a 171, responde 404 antes del limitador y de los ganchos): `/verify-password`, `/update-user`, `/update-session`, `/list-accounts`, `/link-social`, `/unlink-account`, `/sign-in/social`, `/account-info`, `/get-access-token`, `/refresh-token`, `/delete-user/callback`. Medido: las cuatro primeras dan 404 con sesión, y `auth.api.verifyPassword` desde el servidor sigue funcionando. La web no llama a ninguna (búsqueda de `updateUser`, `verifyPassword` en `apps/web/src`: nada). `/callback/:id` no cabe en una lista exacta y es inerte sin proveedores (mapa 01 §1). Se quedan abiertas `list-sessions`, `revoke-session` y `revoke-other-sessions`, que §5 usa.

**`sign-up` con `name` sin tope**: el gancho `before` de `/sign-up/email` rechaza `name` de más de 64 caracteres y cualquier `image` (400, `Invalid sign-up request.`). La web manda la parte local del correo (`Register.tsx` l. 115 a 116).

**Las dependencias** (PR 1, sin otro cambio): `better-auth` 1.7.26 en `apps/api` y `apps/web`; `fastify` 5.12.8; `zod` a `^4.6.7` donde se declare; `fast-uri` por `pnpm.overrides` (`>=3.1.7` y `>=4.1.4` en sus dos ramas). El mapa 01 §8 lo midió: compila y pasa 1.126 tests sin migración. Los avisos de `ip-address` (por `@fastify/rate-limit`) no los he recorrido; el PR corre `pnpm audit --audit-level=high` y lo que quede alto se escribe en su descripción.

**Contraseñas filtradas**: el plugin `haveIBeenPwned` de `better-auth` (`ba17/plugins/haveibeenpwned/ index.mjs`), que envuelve el hash de la contraseña en el registro, el cambio y la recuperación y manda solo los 5 primeros caracteres del SHA-1 a `api.pwnedpasswords.com`. Como corre también con un correo que ya existe (el registro hashea en las dos ramas, `sign-up.mjs` l. 200), no delata. Si el servicio no responde, **falla cerrado** (500): es decisión del dueño (§19) y va en su propio PR (13). Mensaje (pantalla), con `customPasswordCompromisedMessage`: `This password has appeared in a data breach. Choose a different one.`

**El panel del administrador raíz** (mapa 04 [DOC 22]: quien confirma el correo de `ADMIN_EMAIL`). Lo que le da esta propuesta sin pieza nueva: el límite por cuenta, la contraseña para cambiar el correo, el aviso de contraseña cambiada y la pantalla de sesiones. Lo que no le da: si alguien entra en el buzón del dueño, recupera la contraseña y entra. Lo único que lo cierra es un segundo factor (`twoFactor` de `better-auth`, TOTP; no es OAuth, enlace mágico ni código por correo, así que no choca con §9.1 punto 6), con una tabla y una pantalla: decisión del dueño, por defecto **no en E4** (§19), y mientras tanto una tarea de operación: el buzón de `ADMIN_EMAIL` con su propio segundo factor.

## §8. Los avisos

**El catálogo** (texto del aviso: título y cuerpo, en inglés):

| Clave                  | Disparador                                                                                                             | Texto (aviso)                                                                                                                | Frecuencia máxima                                           | De serie | Por qué                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------- | -------------------------------------------------------- |
| `stage_ready_own`      | se graba la línea temporal de una etapa (`stage_timelines`, regla 1 de E2 §11.9) con su corredor en la lista de salida | `stageReadyNotice`: `Stage 7 of Race France is ready to watch` / `187 km · mountain stage · your rider is on the start list` | 1 por carrera y día de juego (6 h reales), por construcción | sí       | es lo que hace volver, y no destripa                     |
| `stage_ready_followed` | lo mismo, para una carrera con `race_watch.follow = 1`                                                                 | el mismo, sin `your rider…`                                                                                                  | íd.                                                         | sí       | seguirla ya es pedirlo                                   |
| `offer_received`       | el tick crea una oferta para su corredor libre (`contracts.ts` l. 106 a 148)                                           | `You have a contract offer` / `Open Cycling Star to answer it. Offers expire after 21 game days.`                            | 1 al día real                                               | sí       | medido: un libre ausente pierde sus ofertas (mapa 03 §7) |
| `month_rule`           | 20 días reales sin visita (`last_seen_at`), solo cuando E7 escriba la regla                                            | `It's been 20 days` / `Visit before 9 December or the game will run your rider.`                                             | 1 por ausencia                                              | sí       | §9.1, punto 3; la fecha y la consecuencia las pone E7    |

Tope común: 8 avisos por aparato y día real (`PUSH.dailyCap`), y ninguno mientras dure la ausencia (§9). Las etapas usan `tag` y `Topic` `s:<sha1(raceId) en 30 car.>`, de modo que el aviso nuevo de una carrera sustituye al anterior en la bandeja (RFC 8030 §5.4, 32 caracteres como mucho; mapa 02 §8), y TTL de 21.600 s: una etapa avisada tarde ya no sirve. La URL es `/world/races/:raceId/stages/:day`; la de la oferta, `/me/contract`.

**El envío**: desde el servicio `tick` (`apps/api/src/tick/main.ts`), después de `runTick` y fuera de su transacción: con los días que acaba de procesar (`summary.currentDay` y `daysProcessed`) busca las filas nuevas de `stage_timelines` y sus destinatarios, y manda con `web-push` 4.0.0 (mapa 02 §8; sin tipos: una declaración `.d.ts` de 15 líneas con lo que se usa, sin `any`). Si el tick cae entre la transacción y el envío, ese aviso se pierde y no se duplica; lo acepto. La API manda solo el aviso de prueba. **Ningún aviso destripa**: el texto sale solo de `stageReadyNotice` y la lista de salida, y el canario (`spoilerCanary.test.ts` l. 206) pasa a renderizar la carga del aviso (`stageReadyPush`, función pura nueva en `packages/shared/src/broadcast/`). `stageReadyEmail` y sus tres tests se **borran**: §9.1 dice que no se envía nunca.

**Las claves**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` en los dos servicios de Railway, validadas en `env.ts` (las tres o ninguna, como `RESEND_API_KEY` y `MAIL_FROM`, `env.ts` l. 86 a 93). El sujeto es `https://www.cyclingstar.app` (RFC 8292 admite una URL), porque no hay buzón. Sin claves, la web no ofrece avisos. **Cambiar la clave rompe todas las suscripciones** (mapa 02 §7): se generan una vez y se escribe en `docs/ops.md`.

**El service worker**, `apps/web/public/sw.js`, unas 40 líneas, con dos oyentes: `push` (lee el JSON, `showNotification` con `title`, `body`, `tag`, `data.url` y la acción `{ action: 'off', title: 'Turn off' }`) y `notificationclick` (abre `data.url`, o con `off` hace `POST /api/me/push/prefs` con esa clave apagada y la cookie de la sesión). **La frontera con D-00p** (`docs/visual.md` l. 2736): sin oyente `fetch`, sin Cache API, sin manifiesto, y **solo se registra cuando la persona pulsa `Turn on notifications`**; quien no lo pulsa no tiene service worker. No hace la web instalable (mapa 02 §7, medido en Chromium) ni cambia ninguna frase de D-00p salvo la letra «E3 no hace el service worker», que sigue siendo cierta: lo hace E4. Un test lee `sw.js` y falla si aparece `'fetch'` o `caches`.

**La tabla y las muertas**: `push_subscriptions` (0056, §13), una fila por aparato y canal. Un 404 o 410 del servicio de push borra la fila; cualquier otro error suma `fails`, y a los 5 seguidos se borra. Un envío bueno pone `fails = 0` y `last_ok_at`.

**El permiso** (pantalla), en un panel `Notifications` de `Account`, nunca al cargar:

- Sin soporte (sin `PushManager`): `Notifications aren't available in this browser.`
- En iPhone, en una pestaña: `On iPhone, notifications aren't available yet. Everything you missed is waiting in the game when you're back.` (por defecto; la alternativa de la pantalla de inicio, §19).
- Sin decidir: `Get a notification when a stage you care about is ready to watch. Results are never in the notification.` y el botón `Turn on notifications`.
- Bloqueado: `Notifications are blocked for this site in your browser settings.`
- Encendidos: cuatro interruptores (`Stages with my rider`, `Races I follow`, `Contract offers`, `Before the inactivity rule`, este último solo cuando exista E7), `Send a test notification` y `Turn off on this device`.

**La baja de un toque**: la acción `Turn off` del propio aviso (Chrome y Edge la pintan; Safari no, y allí el toque abre la web) y el interruptor del panel. Las dos escriben `users.notify_prefs`.

**El contrato para la app**: la tabla guarda `channel` (`webpush`, y mañana `fcm` o `apns`), `address` (el `endpoint` o el token), `keys` (las dos claves de Web Push, nulas en los otros) y `label`. El emisor recibe `{ title, body, url, tag, ttlS }`, que es lo común a los tres (mapa 02 §9); un canal es una función `send(row, payload)` que devuelve `ok`, `gone` o `retry`. La app, cuando exista, registra su token con la misma ruta `POST /api/me/push` y `channel: 'fcm'` o `'apns'`, y añade su función. Nada de esto supone su tecnología.

## §9. El modo ausencia

**Cómo se declara** (pantalla): panel `Away` en `Account`, el primero tras el aviso de correo sin confirmar. Estado `Going on holiday? Tell the game when you'll be back.` Campo `Back on` (`<input type="date">`, de mañana a 28 días); ayuda `Up to 28 days.`; botón `Start away mode`. Antes de confirmar, la lista de lo que pasa (pantalla):

- `Your rider keeps training: days you haven't planned are planned by your coach.` (con `training_mode = 'manual'`: `Your training is set to Manual, so days without orders are rest days.`, porque así lo hace hoy `packages/shared/src/trainingDay.ts` l. 132 a 134).
- `Races run on autopilot, as they do when you're not looking.`
- `Notifications are paused.`
- Si su corredor es libre: `As a free agent, your rider won't be entered in new races while you're away.` (medido en el mapa 03 §7).
- Cuando exista E7: `The inactivity rule doesn't count these days.`

**Qué guarda**: `PUT /api/me/away` con `{ until }`, un instante ISO que la web calcula como la medianoche local del día elegido; Zod exige entre ahora + 12 h y ahora + 28 días. Escribe `users.away_since = now()` y `users.away_until`. Estar ausente es `away_until > now()`: no hay tarea que lo apague.

**Mientras dura**: el tick **no cambia** (la frontera con E7, §18); los avisos no salen (el emisor filtra `away_until`); la regla del mes no cuenta (§9.1, punto 5), y el contrato con E7 es una función pura en `packages/db`: `inactiveSince(lastSeenAt, awayUntil) = max(lastSeenAt, awayUntil)`. Visitar no termina la ausencia: quien mira el móvil en la playa sigue de vacaciones.

**Cómo se vuelve**: a la fecha, solo; antes, con `I'm back` (`DELETE /api/me/away`, pone las dos columnas a nulo). El panel, mientras dura (pantalla): `You're away until Wed 3 Dec 2026.` con `Change date` y `I'm back`; al volver, `Welcome back. Your notifications are on again.` Lo que pasó lo cuenta `While you were away` de `Watch` (E2 §8.8 y §11.4), que no se duplica.

## §10. El correo transaccional

- **El id de cada envío**: `mailer.ts` l. 110 pasa a leer el JSON de Resend y registra `id` con la línea `correo enviado`. Cuesta 3 líneas y es lo que casará un rebote el día que haya webhook.
- **El tope de Resend**: el plan es desconocido. Hasta que el dueño lo mire, el tope diario de registros (§6) vale 80, que deja 20 correos para recuperaciones y reenvíos en el plan gratuito. Se cambia con `SIGNUP_DAILY_CAP` sin desplegar código.
- **El calentamiento**: con una cuenta hoy y registros que llegan poco a poco, el volumen ya crece solo y por debajo de los 150 del día 1 de Resend (mapa 02 §4). El riesgo es abrir de golpe: el plan es pasar a Pro (20 USD al mes) la semana antes de abrir y subir `SIGNUP_DAILY_CAP` así: 150, 300, 600, 1.200 y 2.000 los cinco primeros días, la escalera de Resend sin los topes por hora.
- **DKIM**: 1.024 bits. No sé si Resend deja elegir 2.048; se mira en su panel y, si deja, se rota.
- **DMARC con informes y webhooks de rebote y queja: aplazados** hasta que haya buzón (§12), porque los dos necesitan a alguien que los lea. Coste escrito: `rua=mailto:` a ese buzón (un TXT); el webhook es una ruta pública con el cuerpo crudo, la verificación de `svix-id`, `svix-timestamp` y `svix-signature`, y una línea de log por evento (mapa 02 §3), unas 60 líneas sin tabla.
- **La supresión** la hace Resend y es de todo el equipo (mapa 02 §3). Sin buzón, quien quede suprimido no tiene arreglo: es parte del riesgo de §12.
- **Si algún día hay correo de notificación**: un segundo dominio en Resend, `notify.cyclingstar.app`, con su DKIM y su return path; `mailer.ts` aprende a mandar `headers` (`List-Unsubscribe` y `List-Unsubscribe-Post: List-Unsubscribe=One-Click`) y una ruta de baja que responda 200 en blanco; y, para que una queja no suprima la recuperación, **otro equipo de Resend** (no comprobado, mapa 02 §4). Hoy nada de eso, por §9.1.

## §11. Privacidad y datos

**Los logs sin tokens**: un `serializers.req` en el logger de Fastify (`index.ts` l. 64) que deja `method`, `url`, `hostname` y `remoteAddress`, con `url` pasada por `redactUrl`: el valor de `token=` se sustituye por `[redacted]` y el segmento tras `/reset-password/` también. Test: una petición con cada forma y el log capturado no contiene el token ni el JWT. `better-auth` no escribe el correo en sus logs al nivel por defecto (medido: en la salida de `medir.mjs` solo hay `WARN` sin correo; la línea `Sign-up attempt for existing email` es `info`, `sign-up.mjs` l. 194).

**La IP**: fuera de la base (§5); en los logs de Railway, con su `remoteAddress`, porque es lo único con que se diagnostica un abuso. Cuánto los guarda Railway no lo sé (mapa 03 §4).

**El borrado atómico**, medido: `beforeDelete` llama a `deleteUserAsAdmin` (`packages/db/src/ adminUsers.ts` l. 168 a 174), que suelta corredor y equipo **y borra la fila de `users`** en una transacción; después `better-auth` borra cero filas y responde igual: 200 `{"success":true,"message":"User deleted"}`, con 0 `users`, 0 `sessions` y 0 `accounts` (`resultado.json`, `borrado`). Se añade a esa transacción el `DELETE` de las filas de `verifications` con su id. Lo que queda tras borrar: el corredor y su historial (nombre generado, no elegido), el equipo con su nombre y su maillot, el plan y las transacciones, y `respaldo_mundo_1` (mapa 03 §2 y §3). Si el nombre de un equipo es dato personal, a confirmar con un abogado; si lo es, el mismo `beforeDelete` lo renombra.

**La exportación**: `GET /api/me/export`, con sesión, `Content-Disposition: attachment; filename="cycling-star-2026-11-19.json"`. Lleva la cuenta (correo, alta, fecha de nacimiento, última visita, ausencia, preferencias, premium), las sesiones (aparato y fechas, sin token), los aparatos de avisos (canal, nombre y alta, sin dirección ni claves), `race_watch`, el corredor con su plan y su bitácora, y el equipo si es suyo. En `Account`, un panel `Your data` con `Download my data` y el texto `A file with everything we store about you.`

**El texto nuevo de `Privacy.tsx`** (pantalla), entero:

- Cabecera `Privacy`; estado `Cycling Star is a personal, non-commercial project. This page says what we keep about you, why, and how to remove it.`
- `What we store`: `Your email address and a one-way hash of your password (never the password itself). Your date of birth, to check you are 16 or older. For each device where you are logged in, the browser and system it reports and when you logged in, so you can see and close your sessions. When you last visited, so the game knows whether you are active or away. Your away dates, your notification choices, your theme and spoiler settings, and which races you follow and how far you have watched them. If you turn on notifications, the address your browser gives us to deliver them to that device. And your in-game data: your rider, training, orders, results and, if you run one, your team.`
- `Your IP address`: `We don't store your IP address in our database. Our server logs record the IP address of each request to protect the game from abuse, and our host keeps those logs for a limited time. When you create a rider we may look up your country from your IP to pre-select a flag: our server asks a public IP-to-country service (ipinfo.io, ipwho.is or ipapi.co) for the two-letter country code and keeps the answer in memory for a few hours, never on disk. You can change the country before you confirm.`
- `Cookies and this device`: `Two cookies, both needed to play: a session cookie that keeps you logged in, and cs_viewer, which lasts 90 days and keeps results hidden on this device after you log out. This browser also stores a few preferences, such as your theme and what you have watched. No third-party tracking or ad cookies.`
- `Who else handles your data`: `Railway hosts the game and its database. Resend delivers our account emails. If you turn on notifications, your browser's push service (Google, Mozilla or Apple) delivers them; the message is encrypted and they can't read it.` (Y, si el dueño adopta §7: `When you choose a password, we send the first 5 characters of its SHA-1 hash to Have I Been Pwned to check it hasn't leaked. Your password never leaves our server.`)
- `Your data`: `Download everything we store about you from Account settings, under Your data. You can change your email and password there too.`
- `Deleting your account`: `Delete it yourself from Account settings. Your email, password, date of birth, sessions, notification addresses and watch history are erased at once. Your rider and your team stay in the world, run by the game, with their names and results, because other players raced against them. Copies in our backups are erased when those backups expire.`
- `Age`: `You must be 16 or older to play.`
- Pie: `This notice is informational and will be reviewed against applicable law before public launch.`

Cada párrafo llega con el PR que hace verdadero su hecho (§2, principio 7); hasta entonces, el párrafo de hoy se corrige para no mentir. La frase de las copias está a confirmar: `docs/ops.md` l. 15 dice 14 volcados si el cron está puesto, y no se sabe si lo está (mapa 03 §5).

## §12. El contacto aparcado

**El riesgo**, escrito para que el dueño lo vea: quien pierda el acceso a su buzón pierde la cuenta para siempre (la recuperación es por correo); quien quede suprimido en Resend no recibe nunca más un enlace; nadie puede avisar de que una cuenta es de un menor (`agenda.md` l. 254 y 259); quien escribió mal su fecha de nacimiento no puede corregirla, y los derechos que el autoservicio no cubre (la rectificación, por ejemplo) no tienen a dónde ir: si eso basta, a confirmar con un abogado. La exportación y el borrado propios (§11) cubren el acceso y la supresión.

**Lo que costaría el día que se quiera**: un alias `support@cyclingstar.app` (hoy el MX apunta al Apache de `138.201.228.184` y no sé si hay buzón detrás, mapa 02 §2), reenviado al buzón del dueño, en el DNS de `sistelcoin.com`; un enlace en el pie, en `Login` y en `Privacy.tsx`; y una frase en el 429 por cuenta. Unas 20 líneas de web, un registro DNS y el tiempo del dueño para contestar. Con ese buzón llegan también `rua` de DMARC y el webhook de §10.

**Lo que se quita ya** (PR 2, el primero que toca `Privacy.tsx`): `Ask and your account and rider data will be removed.` (l. 38), que se sustituye por el párrafo de borrado de §11 sin lo que aún no existe (la fecha de nacimiento y los aparatos de avisos entran con los PR 6 y 11). El PR busca en `apps/web/src` `contact`, `support`, `email us` y `ask` y retira cualquier otra promesa que encuentre; no la he buscado.

## §13. Datos y migraciones

**Dos migraciones**, las dos con `drizzle-kit generate` desde `schema.ts`.

**0055 `cuenta_e4`** (PR 6), `users` cambia una vez:

```sql
ALTER TABLE "users" ADD COLUMN "birth_date" date;
ALTER TABLE "users" ADD COLUMN "away_since" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "away_until" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "notify_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_away_pair" CHECK (("away_since" IS NULL) = ("away_until" IS NULL));
-- escrita a mano, como la 0044 entera: la IP que ya no se guarda (§5)
UPDATE "sessions" SET "ip_address" = '' WHERE "ip_address" <> '';
```

Filas que ya existen: `birth_date` nula (la puerta de §3), sin ausencia, `notify_prefs = {}` (los defectos de §14). Las cuatro columnas son nulas o con defecto constante: en Postgres 11 o más no reescriben la tabla (estimado; no he mirado la versión de Railway). Sin índice: ninguna consulta filtra por ellas salvo el emisor de avisos, que filtra `away_until` sobre los pocos destinatarios de una etapa. Las de ausencia y avisos se quedan sin uso hasta los PR 11 y 12; es el precio de no tocar `users` tres veces. El `UPDATE` deja `''` y no `NULL` porque es lo que escribe `better-auth` con el rastreo apagado (medido).

**0056 `avisos`** (PR 11), la única tabla nueva:

```sql
CREATE TABLE "push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "channel" text NOT NULL CHECK ("channel" IN ('webpush','fcm','apns')),
  "address" text NOT NULL UNIQUE,
  "keys" jsonb,
  "label" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_ok_at" timestamp with time zone,
  "fails" smallint DEFAULT 0 NOT NULL,
  "sent_day" date,
  "sent_count" smallint DEFAULT 0 NOT NULL
);
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" ("user_id");
```

`ON DELETE cascade` como `race_watch` (`schema.ts` l. 944 a 946): el borrado se las lleva. `address` única: el mismo aparato suscrito dos veces actualiza su fila (`ON CONFLICT ("address") DO UPDATE`).

**Lo que no lleva migración**: los contadores por cuenta (`verifications`), el hash de los enlaces, la duración de la sesión, las rutas cerradas, el borrado atómico y `last_seen_at`.

## §14. Constantes

| Constante                                  | Valor                    | Intención                                                           | Dónde                                      |
| ------------------------------------------ | ------------------------ | ------------------------------------------------------------------- | ------------------------------------------ |
| `ACCOUNT.minAge`                           | 16                       | §9.1, punto 1                                                       | `packages/shared/src/account/constants.ts` |
| `ACCOUNT.minBirthYear`                     | 1900                     | descartar fechas absurdas                                           | íd.                                        |
| `ACCOUNT.sessionExpiresS`                  | 2.592.000 (30 días)      | quien entra una vez al mes no repite la contraseña                  | íd.; lo lee `auth.ts`                      |
| `ACCOUNT.sessionUpdateAgeS`                | 86.400                   | el defecto; renovar más a menudo es escribir más                    | íd.                                        |
| `ACCOUNT.signInFailsMax` / `signInWindowS` | 10 / 3.600               | 240 intentos al día por cuenta como techo                           | íd.                                        |
| `ACCOUNT.resetMailsMax` / `verifyMailsMax` | 3 / 3, por 3.600 s       | no llenar un buzón ajeno ni gastar el cupo de Resend                | íd.                                        |
| `SIGNUP_DAILY_CAP`                         | 80 (variable de entorno) | 100 al día del plan gratuito menos 20 de margen                     | `apps/api/src/env.ts`                      |
| `ACCOUNT.nameMax`                          | 64                       | `name` no lo usa ninguna ruta del juego (mapa 01 §1)                | `packages/shared/src/account/constants.ts` |
| `ACCOUNT.awayMaxDays` / `awayMinHours`     | 28 / 12                  | cuatro semanas de vacaciones; menos de medio día no es una ausencia | íd.                                        |
| `PUSH.dailyCap`                            | 8 por aparato y día real | dos carreras a cuatro etapas al día (mapa 02 §10)                   | `packages/shared/src/account/push.ts`      |
| `PUSH.stageTtlS`                           | 21.600                   | un día de juego: después la etapa ya no es noticia                  | íd.                                        |
| `PUSH.deadAfterFails`                      | 5                        | un error pasajero no borra un aparato                               | íd.                                        |
| `PUSH.monthRuleWarnDays`                   | 20                       | `agenda.md` §4.15.5, punto 3                                        | íd.                                        |
| `DISABLED_AUTH_PATHS`                      | las 11 rutas de §7       | superficie mínima                                                   | `apps/api/src/security.ts`                 |

Sin cambio: los límites de Fastify (`security.ts` l. 10, 36, 43 y 54 a 68), 3.600 s de los enlaces (los correos ya lo dicen), 8 a 128 caracteres de contraseña, `SPOILER.lastSeenEveryMin` = 60.

## §15. Tests

**Nuevos, por PR** (todos contra la base real de PGlite como `authFlow.test.ts`, salvo los de función pura):

- PR 2: recuperar cierra la sesión de antes; el enlace en claro de antes del despliegue sigue valiendo; ninguna fila de `verifications` contiene el token; las 11 rutas de §7 dan 404 por HTTP y `auth.api.verifyPassword` sigue; **la enumeración por tiempo**: con un correo falso de 250 ms, la mediana de 9 de `request-password-reset` con y sin cuenta difiere en menos de 50 ms, y lo mismo el registro y `change-email` (umbral holgado para la máquina del CI); `X-Forwarded-For: 6.6.6.6, 203.0.113.7` da `request.ip === '203.0.113.7'`; `sessions.ip_address` queda vacía.
- PR 3: el log de una petición a `verify-email?token=…` y a `reset-password/<token>` no contiene el token, ni el JWT, ni el correo.
- PR 4: dos enlaces pedidos, el primero muere; usar uno borra el resto; `change-password` también; sale `passwordChangedEmail` con su asunto; el cuarto correo de recuperación en una hora no sale y la respuesta es idéntica byte a byte.
- PR 5: **el límite por cuenta**: diez 401 y 429; la buena desde otra IP, 429; con `cs_viewer` del mismo usuario, 200; con `cs_viewer` de otro usuario, 429; un correo inexistente, la misma serie; la recuperación borra el contador; el tope diario de registros da 503. En la web: `Login` pinta los dos textos de 429.
- PR 6: sin fecha, 400; menor, 400 con el texto; fecha imposible, 400; menor con correo existente, **el mismo 400**; mayor, 200 y la fila; `PUT /api/me/birth-date` solo escribe una vez y no guarda a un menor; la web lleva a `/account/birth-date` a una cuenta sin fecha.
- PR 7: la pantalla de sesiones lista, marca `This device`, cierra una y cierra las otras; la función del nombre del aparato con diez agentes reales; `last_seen_at` se escribe con `get-session`.
- PR 8: borrar deja 0 filas de `users`, `sessions`, `accounts`, `race_watch`, `verifications` y `push_subscriptions` en una transacción, y si el `DELETE` falla no se suelta el corredor; la exportación no lleva token, hash, dirección de push ni claves.
- PR 9: `change-email` sin contraseña, 400; el correo del aviso lleva `/confirm-email-change#t=` y no la ruta de la API.
- PR 11: `sw.js` no contiene `fetch` ni `caches`; el canario renderiza `stageReadyPush`; un 404 del servicio borra la fila; un ausente no recibe; el noveno aviso del día no sale; el aviso de etapa no depende del resultado (mismo texto con dos resultados distintos).
- PR 12: la ausencia acepta de 12 h a 28 días; `I'm back` la cierra; `inactiveSince` con sus cuatro casos.

**Los de hoy que se re-sellan**: `authFlow.test.ts` (los registros de l. 72, 274, 368 y 423 llevan `birthDate`; los que leen el buzón justo tras la respuesta esperan la promesa del manejador inyectado, porque el correo ya no sale antes de responder); `adminPanel.test.ts` l. 34; el fixture `__fixtures__/spoilerWorld.ts` l. 244 (y con él cuatro suites); `entryForms.test.ts` l. 16 y `Register.test.tsx` l. 30 (tres campos); `emails.test.ts` pierde los tres de `stageReadyEmail` (l. 81 a 121). Fuera de los tests, `apps/web/e2e/world/build.mjs` l. 138 y `docs/diseno/e3-visual/capturas/mundo.mjs` (mapa 03 §8). Ningún test de hoy prueba que recuperar **no** cierre sesiones (lista de `it` de `authFlow.test.ts` y `auth.test.ts`).

## §16. Plan por PR, tests primero

Coste estimado en líneas cambiadas de código (sin tests ni lock) y horas de un agente.

| PR  | Qué                                                                                                                                                                                                                                                                                         | Depende de | Migración | Coste           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- | --------------- |
| 1   | Dependencias: `better-auth` 1.7.26, `fastify` 5.12.8, `zod`, `fast-uri`. Un test fija lo que 1.7 cambia (el enlace de la dirección nueva sin sesión no abre sesión)                                                                                                                         | nada       | no        | 20 l., 2 h      |
| 2   | `auth.ts` configurado: `revokeSessionsOnPasswordReset`, `storeIdentifier`, `backgroundTasks` inyectable, `disabledPaths`, `disableIpTracking`, `rateLimit` apagado, `name` acotado; `trustProxy` por función y el log `xff_varias`; el párrafo de la IP de `Privacy.tsx` y fuera `Ask and…` | 1          | no        | 60 l., 4 h      |
| 3   | Logs sin tokens                                                                                                                                                                                                                                                                             | nada       | no        | 30 l., 2 h      |
| 4   | Un enlace de recuperación vivo, `passwordChangedEmail`, topes de correo por cuenta                                                                                                                                                                                                          | 2          | no        | 90 l., 4 h      |
| 5   | Límite por cuenta con `cs_viewer`, textos de 429 en `Login`, tope diario de registros                                                                                                                                                                                                       | 2          | no        | 120 l., 5 h     |
| 6   | 0055, fecha de nacimiento en el registro, la puerta de las cuentas antiguas, `PUT /api/me/birth-date`, la línea bajo el botón, el párrafo de edad                                                                                                                                           | 1          | **0055**  | 200 l., 8 h     |
| 7   | Sesiones de 30 días, panel `Sessions`, `last_seen_at` en `get-session`, el párrafo de sesiones                                                                                                                                                                                              | 2          | no        | 160 l., 6 h     |
| 8   | Borrado atómico y `Download my data`, párrafos de borrado y de tus datos                                                                                                                                                                                                                    | 6          | no        | 150 l., 6 h     |
| 9   | Cambio de correo con contraseña y la página `confirm-email-change`                                                                                                                                                                                                                          | 2          | no        | 120 l., 5 h     |
| 10  | `id` de Resend en el log; `docs/ops.md` del correo al día (DNS real, tope, escalera, VAPID)                                                                                                                                                                                                 | nada       | no        | 10 l., 2 h      |
| 11  | Avisos: 0056, `sw.js`, VAPID, `POST /api/me/push`, panel, envío desde el tick, baja de un toque, fuera `stageReadyEmail`                                                                                                                                                                    | 6          | **0056**  | 450 l., 16 h    |
| 12  | Modo ausencia: rutas, panel, silencio de avisos, `inactiveSince` para E7                                                                                                                                                                                                                    | 6, 11      | no        | 180 l., 7 h     |
| 13  | Contraseñas filtradas (si el dueño dice sí)                                                                                                                                                                                                                                                 | 1          | no        | 15 l., 2 h      |
| 14  | Documentos: los seis del correo de juego y los cinco de «no hay recuperación» (mapa 04 §6), `docs/ops.md` l. 106 y 271, G11                                                                                                                                                                 | nada       | no        | solo texto, 3 h |

Total estimado: unas 1.600 líneas y 72 horas. El orden es el de la gravedad de §1: los PR 1 a 5 cierran el secuestro, la fuerza bruta y los tokens sin una sola migración y pueden salir en una semana; el 6 desbloquea abrir el registro (con el abogado); el 11 es el único grande y el único que añade una tabla.

## §17. Riesgos del despliegue y lo que se mide

**Con los usuarios que ya existen** (hoy la cuenta del dueño):

- PR 2: los enlaces de recuperación en claro siguen valiendo hasta su hora (medido); las sesiones vivas no se cierran; las IP viejas se quedan hasta la 0055. Ningún test cubre que **el cierre de sesiones al recuperar** no saque al dueño en mitad de algo: lo hará la primera vez que recupere.
- PR 2, `backgroundTasks`: un despliegue que mate el proceso con un correo en vuelo lo pierde (hasta 10 s, `TIMEOUT_MS` de `mailer.ts` l. 51). `index.ts` no maneja `SIGTERM` (búsqueda: nada). La persona pide otro; lo acepto.
- PR 6: el dueño ve la puerta al entrar y escribe su fecha. Si 1.7 no encontrara `birthDate` en el esquema, la API no respondería (§1): la migración corre antes de escuchar (`index.ts` l. 16) y un test arranca `createAuth` con el esquema real, así que el fallo se ve en el CI y no en producción.
- PR 7: las sesiones pasan a 30 días al renovarse; nadie sale.
- PR 11: nadie tiene suscripción; nadie recibe nada hasta pulsar el botón.

**Con el tope de Resend**: el tope diario de registros (80) hace que el registro 81 del día vea un 503 honesto en vez de una cuenta que no recibe su enlace. Si el plan resulta ser Pro, se sube la variable.

**Con un despliegue que vacía los límites en memoria**: solo los de Fastify por IP, 10 intentos más por IP y ruta en cada despliegue; los de cuenta están en Postgres.

**Lo que se mide después**, en los logs de Railway con etiquetas fijas (`limite_cuenta`, `xff_varias`, `registros_cerrados`, `correo enviado`, `push_enviado`, `push_muerta`) y una consulta en el panel (`adminStats.ts`):

| Qué                                  | Con qué                                      | Umbral que obliga a mirar                    |
| ------------------------------------ | -------------------------------------------- | -------------------------------------------- |
| Peticiones con dos IP en la cabecera | `xff_varias`                                 | más de 0 en una semana                       |
| Bloqueos por cuenta                  | `limite_cuenta` al día                       | más de 20, o la misma cuenta 3 días seguidos |
| Correos al día                       | `correo enviado` al día                      | 70 con el plan gratuito                      |
| Registros cerrados por el tope       | `registros_cerrados`                         | más de 0: subir el tope o el plan            |
| Cuentas sin fecha de nacimiento      | `count(*)` con `birth_date` nula             | más de 0 entre las que entraron en 30 días   |
| Aparatos con avisos y avisos muertos | filas de `push_subscriptions`, `push_muerta` | muertas por encima del 20 % de las enviadas  |
| Ausencias activas                    | `count(*)` con `away_until > now()`          | ninguno: es para E7                          |

## §18. Fronteras

- **E2 y W5**: E4 decide cuándo, a quién y por qué canal sale el aviso de etapa lista; el texto es de E2 (`stageReadyNotice`), y E4 añade la URL y la etiqueta desde fuera (mapa 02 §10). `While you were away` no se toca. W5 toca `packages/shared/src/broadcast/`: `stageReadyPush` se añade al lado sin cambiar lo que hay, y el PR 11 se rebasa sobre W5.
- **E7**: E4 da `away_since`, `away_until`, `last_seen_at` escrita en toda visita, `inactiveSince` y la clave `month_rule` del catálogo; E7 decide qué pasa con el ausente, la fecha del aviso y si en ausencia el modo `manual` pasa a decidir el entrenador (§19). El tick no cambia en E4.
- **E8**: `premium` sigue donde está; la cuenta es la misma en la web y en la app.
- **E9**: los avisos de la negociación y el chat usan la misma tabla y el mismo emisor con claves nuevas en `notify_prefs`, sin migración.
- **E10**: `users.locale` sigue en `'es'` y nadie la lee; E4 no la toca. Los textos de este documento son ingleses literales; traducirlos es de E10.
- **La app**: el contrato de §8 (canal, dirección, claves, carga común).
- **El motor**: nada. `ENGINE_VERSION` sigue en 91.

## §19. Decisiones que son del dueño

1. **La sesión de 30 días.** Por defecto 30, porque la ausencia y la regla del mes hablan de semanas. Si elige 7, nada más cambia y quien vuelve de vacaciones escribe la contraseña.
2. **Qué se guarda de la fecha de nacimiento.** Por defecto la fecha entera (§3). Alternativas: solo el año (`birth_year smallint`; quien nació en el año del corte se trata con el 31 de diciembre, y algún mayor de 16 tendrá que esperar unos meses), o solo `adult_declared_at` (no se puede revisar la regla sin volver a preguntar). Cualquiera de las dos cambia la 0055 y el validador.
3. **Las contraseñas filtradas.** Por defecto sí (PR 13), aceptando que si el servicio cae no se puede registrar ni cambiar la contraseña hasta que vuelva. Si no, el techo de 240 intentos al día por cuenta se queda sin esa ayuda.
4. **El plan de Resend y el tope diario.** Por defecto gratuito con 80 registros al día hasta abrir, y Pro la semana anterior a abrir. Si no paga, el tope se queda en 80 y la escalera de §10 no existe.
5. **El segundo factor del panel.** Por defecto no en E4. Si sí: `twoFactor` de `better-auth` solo para la cuenta de `ADMIN_EMAIL`, una migración más (su tabla y una columna) y una pantalla de alta.
6. **El jugador de iPhone.** Por defecto, el texto de §8 que dice que no hay avisos todavía, hasta que alguien pruebe en un iPhone con iOS 26 lo que el mapa 02 §6 da por probable. Alternativa, si funciona: `On iPhone: tap Share, then Add to Home Screen, open Cycling Star from there and turn notifications on.` (sin manifiesto, sin aviso de instalar: no rompe D-00p, pero lo roza, y por eso es del dueño).
7. **Qué avisos van encendidos de serie** (gusto). (A, por defecto) los cuatro encendidos, porque pedir el permiso ya es elegir; (B) solo `stage_ready_own` y `offer_received`, con las carreras seguidas apagadas, para quien teme el castigo de Chrome (mapa 02 §5); (C) todos apagados y el panel abierto tras conceder el permiso, para que elija cada uno.
8. **Cuándo se pide el permiso y cómo se ve** (gusto). (A, por defecto) solo en `Account`, panel `Notifications`, con el texto de §8; (B) además, una tarjeta en `Watch` tras seguir una carrera: `Want a notification when the next stage is ready? [Turn on] [Not now]`, que no vuelve tras `Not now`; (C) además, en `Home`, una línea fina bajo la cabecera la primera semana: `Get notified when your rider races. Turn on`. El aviso se ve igual en las tres: título de una línea, cuerpo de una, y en Chrome el botón `Turn off`.
9. **La pantalla del modo ausencia** (gusto). (A, por defecto) panel `Away` en `Account` con el campo `Back on` y la lista de lo que pasa; (B) lo mismo y, mientras dura, una banda en `Home`: `You're away until Wed 3 Dec. I'm back`; (C) una página `/away` propia, enlazada desde `Account` y `Home`, con la lista en grande y un calendario de 28 días.
10. **La pantalla de sesiones** (gusto). (A, por defecto) la lista en `Account` con aparato, fechas, `Log out` y `Log out all other devices`; (B) solo el botón `Log out all other devices` y la cuenta `You're logged in on 3 devices.`, sin lista (sin la función de aparatos); (C) una página `/account/sessions` con la lista y, en `Account`, una línea `3 devices · Manage`.
11. **El texto de privacidad** (gusto). (A, por defecto) el de §11, por paneles y en prosa; (B) el mismo contenido en una tabla de tres columnas, `What`, `Why`, `How long`; (C) un resumen de cinco líneas arriba (`We store your email, a hash of your password, your date of birth, your devices and your game. We don't store your IP. We don't sell anything. You can download or delete it all from Account settings.`) y el texto de §11 debajo, plegado.
12. **El modo `manual` en ausencia.** Por defecto no se toca (el tick es de E7): el panel avisa de que serán días de descanso. Alternativa: que E7 haga que un ausente en `manual` entrene como `mixto`, que es lo que dice al pie de la letra «mientras dura decide el entrenador» (§9.1, punto 5).
13. **La casilla de condiciones.** Por defecto ninguna hasta que el abogado diga qué hace falta. Si la pide: `terms_accepted_at timestamptz` en `users` (otra migración) y la casilla `I accept the Terms and the Privacy notice.`
