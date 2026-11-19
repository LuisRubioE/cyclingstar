# E4 · Propuesta `atacante`: la cuenta vista por quien quiere quitársela a otro

Commit de referencia `2a29e6d` (el código de la API y la web no cambia hasta `3eeb25f`). Base de hechos: los mapas 01 a 04. **El mapa 05 (pantallas) no existía
al escribir esto**: las pantallas se leen en `apps/web/src/pages/*.tsx` y no he mirado capturas. Lo que digo del paquete `better-auth` 1.7.26 lo he leído en el
clon del mapa 01 (`<scratchpad>/mapa01/ba17/`). Fuente externa: OWASP, «Slow Down Online Guessing Attacks with Device Cookies»,
`https://community.owasp.org/Slow_Down_Online_Guessing_Attacks_with_Device_Cookies` (consultada el 19 de noviembre de 2026). Cifras: **medida** si viene de un
mapa o de una prueba; si no, **estimada**.

## §0. Resumen

1. **La idea**: cada pieza de E4 parte de un ataque escrito antes que su freno, con el coste para el atacante en cifras. Diez atacantes (§1.1); para cada uno,
   lo que gana, lo que lo para y lo que **no** se defiende (§1.3).
2. **En qué se distingue de lo obvio.** Lo obvio es «un límite por cuenta», y un límite por cuenta ingenuo es un arma: con 10 peticiones cada 15 minutos
   cualquiera deja fuera al dueño. Aquí solo se cierra a **los navegadores que nunca entraron en esa cuenta** (cookie de dispositivo, OWASP), y recuperar la
   contraseña siempre reabre.
3. **Lo que cierra**: los bordes del mapa 01 (recuperar sin echar a nadie, dos enlaces vivos y en claro, enumeración por tiempo, ningún límite por cuenta, el
   cubo único de `better-auth`, rutas abiertas), las cuatro frases falsas de `Privacy.tsx`, los tokens en los logs, el borrado no atómico, la cuota de Resend
   como blanco (el correo 101 del día es un registro que no entra) y los escáneres de enlaces que aprueban solos.
4. **Tres piezas que nadie pidió y esta lente exige**: un **enlace de deshacer** en el aviso de cambio de correo, porque sin contacto (`00-encargo.md` §9.1)
   quien pierde su dirección no tiene a quién acudir; una **lista blanca** de rutas de `better-auth` en el proxy; y una **lista blanca de servicios de push**,
   porque hacer `POST` desde el servidor a un `endpoint` que manda el cliente es una SSRF hacia la red privada de Railway.
5. **El panel**: hoy lo abre quien abra el buzón de `ADMIN_EMAIL`. Se propone TOTP solo para administradores (DD-1), que no es OAuth, enlace mágico ni código
   por correo.
6. **Avisos** por Web Push con un service worker de dos oyentes y sin `fetch` (frontera con D-00p, §8.3); ninguno destripa; al iPhone se le dice la verdad.
7. **Sin defender, a sabiendas**: el buzón comprometido de un jugador, el relleno de credenciales que acierta a la primera (se avisa, no se para), el malware,
   el menor que miente, un compromiso de Railway o Resend.
8. **Coste**: 12 PR con tests primero, migraciones 0055 a 0059, de 3 a 4 semanas de un agente (estimado).

## §1. Diagnóstico

### 1.1 Quién ataca, con qué y qué gana

| #   | Atacante                                       | Tiene                                               | Gana                                                         | Hoy le basta con                                                                                   |
| --- | ---------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| A1  | Relleno de credenciales (red de bots)          | pares correo y contraseña filtrados, miles de IP    | cuentas en masa, equipos, premium                            | una IP por intento: el límite es por IP y por ruta (mapa 01 §4.2, serie C: 13 de 13 sin 429)       |
| A2  | Rival dirigido                                 | el correo de la víctima, quizá una contraseña vieja | su corredor, su equipo, su orgullo                           | más de 40 fallos desde varias IP y la buena entra (mapa 01 §4.2, serie H)                          |
| A3  | Ladrón de sesión (ordenador compartido, móvil) | la cookie, no la contraseña                         | la cuenta durante semanas                                    | recuperar no lo echa (mapa 01 §2) y la sesión se renueva sola cada día (mapa 01 §3)                |
| A4  | Dueño de un buzón ajeno                        | el correo de la víctima                             | todo: recupera, cambia correo, borra                         | no hay defensa posible sin un segundo factor                                                       |
| A5  | Atacante del panel                             | A3 o A4 contra la cuenta de `ADMIN_EMAIL`           | el juego entero: premium, admin, borrar cuentas              | lo mismo que A3 o A4: el raíz es «el correo confirmado» (`adminUsers.ts` l. 21 a 26)               |
| A6  | Quemador de cuota y reputación                 | 10 IP y un guion                                    | dejar sin correo a todo el juego (registros que no entran)   | 10 IP × 10 peticiones cada 5 min agotan 100 correos en 5 min (estimado, plan gratuito, mapa 02 §3) |
| A7  | Enumerador                                     | una lista de correos                                | saber quién juega (un menor, un compañero)                   | el tiempo: 341 frente a 84 ms al registrarse, 259 frente a 9 al recuperar (mapa 01 §5, medido)     |
| A8  | Menor que miente                               | un navegador                                        | jugar con menos de 16                                        | no se pide la edad (`00-encargo.md` §2.3)                                                          |
| A9  | Abusador de avisos                             | una sesión, o la clave VAPID filtrada               | SSRF desde la API; avisos de phishing a todos                | no existe todavía: nace con E4                                                                     |
| A10 | Escáner de enlaces del buzón (no malicioso)    | el correo, y sigue los enlaces                      | aprueba un cambio de correo o confirma una cuenta sin humano | los enlaces son GET que cambian estado (mapa 01 §2)                                                |

A10 se combina con A2: el rival se registra con el correo de trabajo de la víctima y **su** contraseña; el escáner del buzón corporativo abre el enlace de
verificación; la cuenta queda confirmada con el correo de la víctima y la contraseña del rival (estimado por el código, `sendOnSignUp` y
`autoSignInAfterVerification` en `auth.ts` l. 142 a 148; no probado con un escáner real, como dice el mapa 01 §2).

### 1.2 Qué falla, por gravedad

1. **Grave**: recuperar no echa a nadie (mapa 01 §2, medido); es la única salida de la víctima de A3.
2. **Grave**: la cuota de Resend como blanco único (mapa 02 §3), con rutas de correo a 10 cada 5 minutos **por IP**.
3. **Grave**: ningún límite por cuenta; el de `better-auth` mete a todos en `no-trusted-ip` si la cabecera trae dos IP (mapa 01 §4.2, series H y E).
4. **Alta**: el panel cuelga de un buzón ([DOC 22], mapa 04). La enumeración por tiempo (mapa 01 §5). Las rutas abiertas: `verify-password` a 60 por minuto,
   `update-user` sin tope, `list-sessions` con tokens (mapa 01 §1).
5. **Media**: dos enlaces de recuperación vivos y en claro; tokens y correos en los logs (mapa 03 §4); cambio de correo sin contraseña que un escáner puede
   aprobar (A10); borrado no atómico y `Privacy.tsx` falsa (mapa 03 §3 y §5).
6. **Baja hoy**: las dependencias (ningún aviso alcanza, mapa 01 §8), pero un plugin nuevo sobre 1.6 entraría con una crítica.

### 1.3 Lo que no se defiende, y por qué

**El buzón comprometido de un jugador (A4).** Solo lo para un segundo factor, y para jugadores no se propone: `00-encargo.md` §9.1 deja la cuenta en correo y
contraseña, y el valor de una cuenta de jugador no justifica la fricción. Se mitiga: avisos por correo de cada cambio (§4.5), enlace de deshacer, cierre de
sesiones. **A1 con la contraseña buena.** Una red de bots que acierta a la primera es indistinguible de la víctima. Se reduce con la lista de contraseñas
filtradas (§6.5) y se avisa al dueño con el correo de entrada nueva. **El menor que miente (A8).** La edad es declarada (decisión del dueño, `00-encargo.md`
§9.1, punto 1). Sin canal de contacto nadie puede avisar de un menor: riesgo de §12. **Malware, XSS en un navegador ajeno, Railway, Resend, el DNS de
`sistelcoin.com`.** Fuera del alcance de la cuenta. La CSP de `app.ts` l. 175 a 195 ya corta el XSS de terceros.

## §2. Principios

1. **Primero el ataque, luego el freno, con su cifra.** Consecuencia: cada límite de §6 dice cuántos intentos al día y al año le deja al atacante.
2. **Lista blanca, nunca lista negra.** Consecuencia: el proxy deja pasar 11 rutas de `better-auth` y da 404 al resto (§7.1); un plugin o una ruta nueva no se
   exponen sin decidirlo.
3. **Un enlace de correo nunca cambia nada por sí solo.** Consecuencia: todo enlace aterriza en una página de la web con un botón, y el token va en el fragmento
   (`#token=`), que no llega a ningún log (§4.2).
4. **Lo defensivo sin fricción, lo ofensivo con contraseña.** Cerrar sesiones, apagar avisos o deshacer un cambio de correo no piden nada; cambiar el correo,
   exportar o borrar piden la contraseña (§5, §11).
5. **Un límite no puede convertirse en un cierre ajeno.** Consecuencia: el límite por cuenta solo afecta a navegadores que nunca entraron, y recuperar la
   contraseña siempre lo levanta (§6.3).
6. **El correo es un recurso escaso y un vector.** Consecuencia: presupuesto diario, tope por destinatario y registro de cada envío (§10).
7. **Lo que protege no depende del entorno.** Como `useSecureCookies` y `disableOriginCheck` (`auth.ts` l. 97 a 100 y 208): la IP, los límites y su almacén se
   fijan en código y se prueban, no se heredan de `NODE_ENV` ni de una conducta de Railway.
8. **Se guarda lo mínimo que defiende.** Consecuencia: el año de nacimiento y no la fecha; la IP truncada en la base; el correo con HMAC en las tablas de
   límites y envíos.

## §3. El registro y la edad

**Ataques.** A8 (el menor), A10+A2 (la cuenta ocupada con el correo de otro), A7 (registro como sonda).

**El campo.** `Date of birth` (pantalla), `<input type="date">`, tercer campo de `Register.tsx` tras `Email` y `Password`. **Puerta neutra**: el formulario no
dice la edad mínima antes de enviarse, para no enseñar qué fecha poner.

**En el servidor**, gancho `before` de `auth.ts` para `/sign-up/email` (como el de `/delete-user`, l. 180 a 192): Zod sobre `birthDate` (`YYYY-MM-DD`, año de
1900 en adelante, no futura); edad calculada con la fecha UTC de hoy; con menos de 16 años, `APIError('BAD_REQUEST', { code: 'AGE_BELOW_MINIMUM' })`. Si pasa,
el gancho **escribe** `birthYear` en el cuerpo, que `better-auth` guarda como campo propio (`user.additionalFields`, `input: true`): como el gancho lo
sobrescribe siempre, un cliente que mande `birthYear` sin `birthDate` recibe 400 y no esquiva la comprobación (test T3.2).

**Qué se guarda**: `users.birth_year smallint` y `users.age_confirmed_at timestamptz`. No la fecha: es el dato que piden las preguntas de seguridad de medio
internet y no lo necesita nada del juego; el año basta para saber quién puede tener 16 o 17 (decisión del dueño, DD-4). **De quien no cumple no se guarda
nada**: ni cuenta, ni correo, ni línea de log con el correo (el gancho lanza antes de crear el usuario).

**Lo que ve quien no cumple** (pantalla): `Sorry, you need to be at least 16 to play Cycling Star.` El navegador guarda `cs.ageGate` en `localStorage` con la
fecha; durante 24 horas `Register` enseña ese mismo texto en vez del formulario. Se esquiva borrando el almacenamiento: es un freno para el impulso, no para
quien insiste (A8 no se defiende, §1.3).

**Condiciones de uso**: casilla obligatoria `I am 16 or older and I accept the Terms and the Privacy notice.` (pantalla), con enlaces a `/terms` y `/privacy`.
Se guarda `users.terms_version text` y `users.terms_accepted_at`. **El texto de las condiciones no existe y lo escribe un abogado**: hasta entonces `/terms`
dice `Terms of use are being written. Until they are published, the Privacy notice is the only agreement.` (pantalla). Si la casilla con un texto provisional
vale como consentimiento: a confirmar con un abogado.

**El nombre**: hoy `name` es la parte local del correo (`Register.tsx` l. 115 a 116), un dato personal que nadie lee (mapa 01 §1). Un
`databaseHooks.user.create.before` lo pone a `Player` y la 0055 hace lo mismo con las filas que existen.

**La cuenta ocupada con un correo ajeno** (A2+A10): (1) la verificación pasa por un botón (§4.2), así que un escáner ya no la confirma; (2)
`onExistingUserSignUp` manda a la dirección el correo E7 (§4.5), como mucho uno cada 24 h; (3) la purga diaria borra las cuentas sin confirmar de más de 7 días
sin corredor ni equipo (§13), y con ellas la contraseña del intruso.

**Las cuentas que ya existen** (hoy, la del dueño): con sesión y `birth_year` nulo, la web lleva a `/confirm-age` con el mismo campo y la misma casilla; el
servidor da 403 `age_required` en crear corredor y tomar equipo (las dos puertas al juego). Si la fecha da menos de 16: la cuenta queda bloqueada
(`age_blocked_at`), se cierra la sesión y se borra a los 30 días. Qué hacer con los datos de un menor ya registrado: a confirmar con un abogado.

## §4. Verificación, recuperación y cambio de correo

### 4.1 Los tokens, después

| Token                         | Longitud y forma                                   | Vida                    | Un solo uso                                    | Al pedir otro                               | Guardado                                                            |
| ----------------------------- | -------------------------------------------------- | ----------------------- | ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Verificación                  | JWT HS256, 211 car. en 1.7.26 (mapa 01 §8, medido) | 3.600 s                 | en la práctica: tras confirmar no abre sesión  | el anterior sigue valiendo (JWT sin estado) | en ningún sitio; fuera de los logs por el fragmento                 |
| Recuperación                  | 24 car. `a-zA-Z0-9`, unos 143 bits                 | **1.800 s** (hoy 3.600) | sí (`consumeVerificationValue`)                | **anula los anteriores** (nuevo)            | **SHA-256 en base64url** (`verification.storeIdentifier: 'hashed'`) |
| Aviso a la dirección vieja    | JWT, unos 230 car.                                 | 3.600 s                 | no; detrás de un botón y con contraseña previa | sin cambio                                  | en ningún sitio                                                     |
| Deshacer el cambio (nuevo)    | 32 car. `generateId(32)`, unos 190 bits            | **7 días**              | sí                                             | uno por cambio                              | hash en `verifications`, `value` = id del usuario                   |
| Cookie de dispositivo (nuevo) | `v1.<hmac correo 32>.<nonce 16>.<firma 43>`        | 180 días                | no aplica                                      | se reescribe en cada entrada                | solo en el navegador                                                |

**Anular las recuperaciones anteriores**: dentro de `sendResetPassword({ user, token })`, antes de enviar, `DELETE FROM verifications WHERE value = $userId AND
identifier <> $hash('reset-password:' + token)`. Hoy solo la recuperación escribe en `verifications` (mapa 03 §1); el borrado se limita a filas de menos de
1.800 s para no tocar otra cosa el día que la haya. Test T4.2.

**Los enlaces vivos al desplegar `hashed`** siguen valiendo (mapa 01 §7, `internal-adapter.mjs` l. 675 a 678 de 1.6.25): ningún usuario pierde un correo en
vuelo.

### 4.2 Todo enlace pasa por un botón, y el token por el fragmento

Cada plantilla deja de usar la URL de `better-auth` y construye la suya con `APP_URL`:

| Correo                      | Enlace nuevo                         | Botón de la página (pantalla) | Lo que hace el botón                                           |
| --------------------------- | ------------------------------------ | ----------------------------- | -------------------------------------------------------------- |
| Verificar (registro)        | `/verify-email#token=<jwt>`          | `Confirm my email`            | `GET /api/auth/verify-email?token=…&callbackURL=/verify-email` |
| Verificar (dirección nueva) | `/verify-email#token=<jwt>&step=new` | `Use this email`              | igual                                                          |
| Aprobar el cambio           | `/approve-email#token=<jwt>`         | `Approve the change`          | igual, con `callbackURL=/verify-email?step=approved`           |
| Recuperar                   | `/reset-password#token=<token>`      | (el formulario de siempre)    | `POST /api/auth/reset-password` con el token en el cuerpo      |
| Deshacer                    | `/undo-email#token=<token>`          | `Give my account back`        | `POST /api/me/undo-email-change`                               |

El fragmento no viaja en la petición de la página: el `incoming request` de la SPA ya no lleva el token (mapa 03 §4). La petición del botón sí lo lleva en la
URL de `verify-email`, y por eso hace falta además la redacción de logs (§11.2). Un escáner que sigue el enlace carga una SPA y no pulsa botones (estimado: los
escáneres conocidos no ejecutan clics; no probado). `ResetPassword.tsx` lee hoy `?token=`; pasa a leer `#token=` y conserva `?token=` 7 días por los correos en
vuelo.

### 4.3 Las sesiones al recuperar y al cambiar

- **Recuperar** cierra todas las sesiones: `emailAndPassword.revokeSessionsOnPasswordReset: true` (en 1.7.26, `utils/password.mjs` l. 34). Además pone a cero el
  contador de la cuenta en `auth_throttle` y emite la cookie de dispositivo al navegador que recupera (OWASP: quien abre el enlace prueba que manda en el
  buzón). Cómo: `onPasswordReset({ user }, request)` apunta `user.email` en un `WeakMap<Request, string>` del proxy, y el proxy, al ver el 200, pone la cookie.
  Que `ctx.request` sea el mismo objeto que el proxy pasa a `auth.handler` está por comprobar (test T4.4).
- **Cambiar la contraseña**: como hoy, `revokeOtherSessions: true` (`Account.tsx` l. 223), y además correo E4.
- **Cambiar el correo**: al aplicarse, cierra **las otras** sesiones (gancho `after` de `/verify-email` con `updateTo`), manda E5 a la dirección vieja y deja
  vivo el deshacer.
- **Deshacer**: devuelve la dirección vieja (si sigue libre), la marca confirmada, cierra **todas** las sesiones, borra las suscripciones de avisos y lleva a
  `/forgot-password` con un aviso: `Your email is back. Choose a new password to sign in.` (pantalla). Durante 7 días la cuenta no admite otro cambio de correo.

### 4.4 La enumeración por tiempo, cerrada

`advanced.backgroundTasks.handler` (existe en 1.6.25 y 1.7.26, `create-context.mjs` l. 212 a 224 de 1.7.26): con él, `runInBackgroundOrAwait` deja de esperar al
envío en las tres ramas de mapa 01 §5. El manejador pasa la promesa a una cola en memoria que registra el fallo con el buzón enmascarado. Con el correo
instantáneo los tiempos ya eran iguales (88 frente a 83 ms, 7 frente a 6, 14 frente a 9; mapa 01 §5, medido), así que es de esperar que con la espera fuera
queden igual (estimado; T4.6 lo mide con un `Mailer` de 250 ms y exige que la diferencia de medianas de 15 sea menor de 30 ms). Coste: un correo en cola se
pierde si el proceso muere en ese segundo; el registro de envíos (§10) lo deja ver. `send-verification-email` sin sesión ya tiene su suelo de 500 ms (mapa 01
§5) y se queda. `sign-up` con correo existente sigue respondiendo igual y ahora además manda E7 **en segundo plano**, sin delatar por tiempo.

### 4.5 Los correos, enteros (correo)

Pie común nuevo, sin raya: `Cycling Star, a fictional cycling-manager game.` (hoy `emails.ts` l. 54 lleva una). Las fechas, en UTC con el formato `19 Nov 2026,
18:42 UTC`.

Cada `/` del cuerpo es un salto de párrafo; la versión HTML lleva el mismo texto con el enlace en el botón (`layout`, `emails.ts` l. 36 a 57).

| Correo | Cuándo sale                                                      | Asunto (correo)                                      | Cuerpo (correo)                                                                                                                                                                                                                                                                                                                                               |
| ------ | ---------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1     | Registro, entrada sin confirmar, dirección nueva                 | `Confirm your Cycling Star email` (el de hoy)        | El de hoy (`emails.ts` l. 92); solo cambia el enlace (§4.2)                                                                                                                                                                                                                                                                                                   |
| E2     | Pedir recuperar la contraseña                                    | `Reset your Cycling Star password`                   | `Someone asked to reset the password of your Cycling Star account.` / `Open this link to choose a new one. It works once and expires in 30 minutes:` / `<url>` / `Choosing a new password signs you out on every device.` / `If it was not you, ignore this email: your password stays as it is.`                                                             |
| E3     | Pedir el cambio de correo; a la dirección vieja                  | `Approve the new email of your Cycling Star account` | `Someone signed in to your Cycling Star account asked to move it to <new email>.` / `To approve it, open this link and press the button. It expires in one hour:` / `<url>` / `If it was not you, do not approve it. Reset your password instead: that signs out every device, including the one that asked.` / `https://www.cyclingstar.app/forgot-password` |
| E4     | Contraseña cambiada o recuperada (nuevo)                         | `Your Cycling Star password was changed`             | `The password of your Cycling Star account was changed on <date>. Every other device has been signed out.` / `If it was not you, reset your password now:` / `https://www.cyclingstar.app/forgot-password`                                                                                                                                                    |
| E5     | Cambio de correo aplicado; a la vieja (nuevo)                    | `Your Cycling Star account moved to a new email`     | `Your Cycling Star account now uses <masked new email> instead of this address.` / `If it was not you, you can take it back during the next 7 days. Open this link and press the button: it moves the account back to this address and signs out every device.` / `<url>` / `After 7 days this address can no longer recover the account.`                    |
| E6     | Entrada sin cookie de dispositivo (nuevo); 1 por hora como mucho | `New sign-in to your Cycling Star account`           | `Someone signed in to your Cycling Star account from a browser we had not seen before: <Chrome on Android>, on <date>.` / `If it was you, there is nothing to do.` / `If it was not you, reset your password now. That signs out every device:` / `https://www.cyclingstar.app/forgot-password`                                                               |
| E7     | `onExistingUserSignUp` (nuevo); 1 cada 24 h como mucho           | `You already have a Cycling Star account`            | `Someone tried to create a Cycling Star account with this address, which already has one.` / `If it was you, log in instead, or reset your password if you forgot it:` / `https://www.cyclingstar.app/forgot-password` / `If it was not you, ignore this email. Nobody can use your account without your password.`                                           |

`<masked new email>` usa `maskEmail` (`mailer.ts` l. 65 a 69): si quien lo lee es el intruso, no aprende la dirección. E3 sí da la nueva entera: quien la lee es
el dueño legítimo y tiene que reconocerla.

## §5. Las sesiones

**Ataque.** A3: la cookie robada vive mientras se use (7 días que se renuevan cada día, mapa 01 §3).

- **Duración**: 7 días sin uso (`expiresIn` 604.800 s, `updateAge` 86.400 s, los de hoy) y **90 días de vida máxima** desde `created_at`, la misma cifra que
  `cs_viewer` (`constants.ts` l. 209). Se impone en `createCurrentUserId` (`routes/context.ts` l. 57) y en el proxy de `get-session`: sesión con más de 90 días,
  `revokeSession` y respuesta `null`. Quien juega cada día escribe la contraseña cuatro veces al año.
- **Sin `cookieCache`**: una caché firmada de 5 minutos haría que una sesión cerrada siguiera valiendo hasta 5 minutos en las rutas que la lean. La lectura de
  `sessions` por petición es barata a este volumen (estimado); el memo de `request.viewer()` de E2 se queda.
- **`get-session` sin el token**: el proxy reescribe su JSON y quita `session.token`, `session.ipAddress` y `session.userAgent`. La web no lee ninguno (búsqueda
  en `apps/web/src`: ni `.session.token` ni `ipAddress`). Una XSS futura no se lleva un token reutilizable con `revoke-session`.
- **`cs_viewer`**: sin cambios (solo restringe, `viewerCookie.ts` l. 5 a 21). Se borra además al deshacer un cambio de correo y al recuperar, en el navegador
  que lo hace.
- **Lo que se guarda de cada sesión**: la IP **truncada** (IPv4 a `/24`, `203.0.113.0`; IPv6 a `/48`) con un `databaseHooks.session.create.before`, y el agente
  de usuario entero. Truncada sirve al jugador («esta no soy yo») y no localiza a nadie; la IP entera queda solo en los logs (§11.2).

**La pantalla** `Sessions` en `Account`, entre `Password` y `Appearance` (pantalla):

```
Signed in on
  Chrome on Android · this device
    Signed in 12 Nov 2026 · last active today · 203.0.113.x
  Firefox on Windows
    Signed in 2 Nov 2026 · last active 17 Nov 2026 · 198.51.100.x     [Sign out]
[Sign out of all other devices]
```

La API propia: `GET /api/me/sessions` (id opaco = 16 primeros caracteres hex de SHA-256 del token; nunca el token), `POST /api/me/sessions/:id/revoke` y `POST
/api/me/sessions/revoke-others`. **Sin contraseña** (principio 4): el ladrón que echa a la víctima solo consigue que la víctima recupere la contraseña, y eso lo
echa a él para siempre. Cerrar una sesión borra las suscripciones de avisos creadas desde ella (§8.4).

## §6. Los límites de intento

### 6.1 Qué IP vale

El proxy calcula la IP una vez (`request.ip` de Fastify, `trustProxy: true`, `app.ts` l. 160) y la pasa a `better-auth` en la cabecera `x-cs-client-ip`,
**borrando antes cualquiera que traiga el cliente** en `toWebHeaders` (`routes/context.ts` l. 7 a 18); `auth.ts` pone `advanced.ipAddress.ipAddressHeaders:
['x-cs-client-ip']`. Las dos capas ven la misma IP y el cubo `no-trusted-ip` desaparece.

**Comprobación al arrancar y en marcha**: un gancho `onRequest` cuenta, en las 1.000 primeras peticiones de `/api/*`, cuántas traen `X-Forwarded-For` con más de
una IP o sin ella. Si pasa del 1 %, `app.log.error` `client_ip_untrusted` con los recuentos (sin IP). Test T6.1: con `X-Forwarded-For: 1.1.1.1, 2.2.2.2`
`request.ip` es la primera, y un `x-cs-client-ip` del cliente no llega a `better-auth`. **Lo que no se puede probar en local** es la conducta de Railway: se
comprueba el día del despliegue mirando `sessions.ip_address` de una sesión nueva del dueño.

### 6.2 Las cifras

Capa 1, Fastify en memoria, **sin cambios** (`security.ts` l. 10, 36, 43): 300 al minuto global, 60 al minuto el comodín, 10 cada 5 minutos por IP y por ruta en
las de credenciales. Capa 2, nueva, en Postgres (`auth_throttle`, §13), decidida en el proxy antes de reenviar y contada al ver la respuesta:

| Regla                                        | Clave                                  | Cifra y ventana                               | Cuenta                                                                                         | Al pasarse                                                 |
| -------------------------------------------- | -------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| L1 entrar, por cuenta, navegador desconocido | `acct:<hmac correo>`                   | 10 en 15 min; 30 en 24 h                      | 401 de `sign-in`                                                                               | 429 `ACCOUNT_THROTTLED` a todo navegador sin cookie válida |
| L2 entrar, por cookie de dispositivo         | `dev:<nonce>`                          | 10 en 15 min                                  | 401 con esa cookie                                                                             | la cookie deja de contar como conocida 15 min              |
| L3 contraseña con sesión                     | `pw:<id usuario>`                      | 5 en 15 min; 10 en 24 h                       | 400 `INVALID_PASSWORD` en cambio, borrado, exportar, cambio de correo                          | 429; al décimo del día, se cierra **esa** sesión           |
| L4 rutas que mandan correo, por IP           | `mailip:<ip>`                          | 20 en 24 h                                    | cada petición a `sign-up`, `request-password-reset`, `send-verification-email`, `change-email` | 429                                                        |
| L5 correos por destinatario                  | `rcpt:<hmac correo>` en `delivery_log` | 3 por hora y 6 al día (de cuenta)             | cada envío                                                                                     | no se envía; la respuesta no cambia                        |
| L6 presupuesto diario                        | `delivery_log` del día UTC             | `MAIL_DAILY_BUDGET` (90 con el plan gratuito) | cada envío                                                                                     | §10.3                                                      |

Las claves usan HMAC-SHA256 del correo normalizado (`trim`, minúsculas) con una clave derivada de `SESSION_SECRET`: la tabla no guarda correos, ni siquiera los
inexistentes que alguien tecleó. L1 cuenta **igual** para correos que no existen: el 429 no delata cuentas (T6.3).

**Lo que le queda al atacante (calculado):** A2 contra una cuenta, desde navegadores sin cookie: 30 intentos al día, unos 11.000 al año, frente a los 2.880 al
día **por IP** y sin techo por cuenta de hoy (mapa 01 §4.2). A1 con un intento por cuenta no lo para L1; lo frenan la lista de filtradas (§6.5) y L4 en el
registro.

**Por qué no `rateLimit.storage: 'database'` de `better-auth`**: su clave sigue siendo `<ip>|<ruta>` (`rate-limiter/index.mjs` l. 254 de 1.7.26), no ve el
correo ni el resultado. Su limitador pasa a `rateLimit: { enabled: false }` **explícito** cuando la capa 2 entra (PR 4); hasta entonces, `enabled: true`
explícito con la IP de 6.1, para no depender de `NODE_ENV` (mapa 01 §4.3).

### 6.3 Cómo no cerrarle la cuenta a otro

L1 solo cierra a navegadores **sin** cookie de dispositivo válida para ese correo (OWASP, fuente del encabezado). El dueño, en su navegador de siempre, entra
aunque alguien esté gastando L1. En un navegador nuevo, el 429 le ofrece recuperar; recuperar pone L1 a cero y le da la cookie (§4.3). Lo que le cuesta a A2
mantener a alguien fuera **de navegadores nuevos**: 10 peticiones cada 15 minutos, que la capa 1 deja pasar. Es un estorbo, no un secuestro, y E6 no se manda
por intentos fallidos (sería un buzón lleno a voluntad ajena).

### 6.4 Lo que ve el jugador (pantalla)

L1: `Too many failed attempts for this email from new browsers. Try again in 15 minutes, or reset your password to sign in now.` con el enlace `Reset your
password`. Capa 1 y L4: `Too many attempts from your connection. Try again in <n> minutes.` (`n` de `retry-after`). L3: `Too many wrong passwords. Try again in
15 minutes.`; al cerrar la sesión, `/login` con `You were signed out after too many wrong passwords.`. Hoy `Login.tsx` l. 61 enseña `result.error.message` tal
cual, y un 429 de `better-auth` diría `Too many requests…` en su inglés; la web pasa a traducir por `code`, nunca a pintar el mensaje del servidor.

### 6.5 Contraseñas filtradas

Plugin `haveIBeenPwned` de `better-auth` en registro, cambio y recuperación: manda 5 caracteres del SHA-1 a `api.pwnedpasswords.com` y compara el resto en
local. Texto (pantalla): `This password has appeared in a data breach. Choose a different one.` Qué hace el plugin si la API no responde, **no lo sé**: el PR 4
lo mide, y si bloquea el registro se envuelve para dejar pasar con una línea de log. Va en el texto de privacidad. Es decisión del dueño (DD-3) porque es un
tercero más.

## §7. Las rutas abiertas, las dependencias y el panel

### 7.1 La lista blanca del proxy

`authProxy.ts` deja de tener el comodín libre (l. 66 a 71). Pasan, y nada más: `POST sign-up/email`, `POST sign-in/email`, `GET get-session`, `POST sign-out`,
`GET verify-email`, `POST send-verification-email`, `POST request-password-reset`, `GET reset-password/:token` (7 días, por los correos en vuelo), `POST
reset-password`, `POST change-email`, `POST change-password`. El resto, 404 `{ok:false,error:"no_encontrado"}` desde el proxy, sin llegar a `better-auth`:
`verify-password`, `update-user`, `update-session`, `list-sessions`, `revoke-*`, `list-accounts`, las sociales y de OAuth, `delete-user` (pasa a ruta propia,
§11.3), `ok` y `error`. Lo que hacían las útiles lo hacen rutas propias que llaman a `auth.api` desde el servidor (§5). Test T7.1 recorre las 31 rutas de
`ba/api/index.mjs` y exige 404 para todas las que no están en la lista.

**El cambio de correo pide la contraseña.** Gancho `before` de `/change-email`: lee `password` del cuerpo, la comprueba con `ctx.context.password.verify` contra
la fila `credential` y cuenta en L3. Sin ella, 400 `Enter your password to change your email.` (pantalla). Con eso A3 ya no puede ni pedir el cambio.

### 7.2 Las dependencias

PR 1: `better-auth` 1.7.26 (API y web), `fastify` 5.12.8, `zod` 4.6.7 o más, `fast-uri` por encima de 3.1.7 y 4.1.4 por `pnpm.overrides` si no suben solos.
Medido en el mapa 01 §8: compila y pasan 1.126 tests sin migración. El trabajo `audit` de `cobertura.yml` (l. 182 a 192) pasa a **bloqueante** para `pnpm audit
--prod --audit-level=high` de `apps/api` (el CI lo toca hoy la sesión de W5: el cambio se hace después). Regla escrita en `auth.ts`: ningún plugin de
`better-auth` entra sin leer los avisos de la versión instalada.

### 7.3 El panel del administrador raíz

1. **Segundo factor TOTP solo para administradores** (DD-1, por defecto sí): plugin `twoFactor` de `better-auth`; `isUserAdmin` por sesión exige
   `two_factor_enabled` (el token de máquina, `security.ts` l. 111 a 130, no cambia). Sin él, el panel enseña el QR y el texto (pantalla)
   `Set up two-factor authentication to open the admin panel.` Diez códigos de respaldo, que el dueño guarda fuera. Pide migración (0059) y una pantalla
   de código al entrar. Contra A4+A5 es lo único que funciona.
2. **El correo del raíz no se cambia desde la web**: `change-email` de la cuenta cuyo correo es `ADMIN_EMAIL`, 403 `The admin email is set by the deployment.`
   (pantalla). Se cambia con la variable.
3. **Registro de auditoría** `admin_audit` (0058): cada `PATCH` y `DELETE` de `/api/admin/users/:id` (`routes/admin.ts`), confirmar correo a mano incluido, con
   actor (`token` o id), acción, objetivo, IP truncada y hora. Se ve en el panel; no se borra al borrar el objetivo.

## §8. Los avisos

### 8.1 El catálogo

| Aviso                | Disparador                                                                                     | Texto (aviso)                                                                                                                              | Frecuencia máxima                                  | De serie |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | -------- |
| `month_rule_warning` | `last_seen_at` de hace 20 días reales, sin ausencia; lo enciende E7 cuando la regla exista     | `Your rider goes to the coach on 12 Dec` / `You have not visited for 20 days. Open Cycling Star to keep your rider.`                       | 1 cada 7 días; 2 por inactividad                   | sí       |
| `absence_ending`     | 24 h antes de `away_until`                                                                     | `Your time away ends tomorrow` / `Your rider is back in your hands on 3 Dec.`                                                              | 1 por ausencia                                     | sí       |
| `stage_ready`        | final del día del tick con etapa de una carrera seguida (`race_watch`), sin mirar el resultado | `stageReadyNotice('en', p, own)`: `Stage 7 of Race France is ready to watch` / `187 km · mountain stage · your rider is on the start list` | 4 al día; `Topic` por carrera (el nuevo sustituye) | no       |

Tope total: 6 avisos por usuario y día. TTL: 6 h para `stage_ready` (un día de juego, SPEC l. 53), 3 días para los otros. Ninguno de seguridad va por aviso: la
seguridad va por correo, que no depende de un permiso. **Ningún aviso destripa**: los tres se construyen sin leer resultados; el canario de
`spoilerCanary.test.ts` l. 206 pasa a renderizar el aviso del navegador en vez de `stageReadyEmail`, que se borra (mapa 02 §10).

### 8.2 El permiso

Se pide solo con un toque en `Account → Notifications` (Firefox y Safari lo exigen, mapa 02 §5), nunca al cargar. Panel (pantalla): título `Notifications`,
texto `Get a notice in this browser when something needs you. We never send game news by email.`, botón `Turn on notifications in this browser`, y debajo un
interruptor por aviso con su frase. Denegado: `Notifications are blocked for this site in your browser settings.`

**La baja de un toque.** Cada interruptor apaga su aviso para todos los aparatos; `Turn off in this browser` borra la suscripción de ese aparato. El aviso abre
la web en `/account#notifications` si se toca su acción `Settings` (dos acciones: `Open` y `Settings`). Sin contraseña (principio 4).

### 8.3 El service worker y D-00p

`apps/web/public/sw.js`, unas 30 líneas, dos oyentes: `push` (lee `{title, body, url, tag}` y llama a `showNotification`) y `notificationclick` (abre `url`
**solo si su origen es el de la web**; si no, abre `/`). Sin `fetch`, sin Cache API, sin manifiesto. Cabe en la CSP de hoy sin tocarla (mapa 02 §7, medido en
Chromium). **Frontera con D-00p** (`docs/visual.md` l. 2736): lo retirado era la cáscara sin red y la web instalable; este worker no guarda ninguna respuesta
(`retransmision.md` l. 7284 lo exige) ni hace la web instalable (sin manifiesto ni `fetch`, mapa 02 §7). Test T8.3: el fichero no contiene `fetch` ni `caches`.

### 8.4 El envío y sus ataques

- **SSRF (A9)**: el servidor hace `POST` al `endpoint` que manda el navegador. Se acepta solo `https:` y host en una lista: `fcm.googleapis.com`,
  `updates.push.services.mozilla.com`, `web.push.apple.com` y los que acaben en `.notify.windows.com` (el de Edge, a confirmar en una suscripción real). Todo lo
  demás, 400. Sin esto, un `endpoint` `http://postgres.railway.internal:5432` hace que la API hable con la red privada.
- **Clave VAPID**: privada en `VAPID_PRIVATE_KEY` de Railway, pública en `VAPID_PUBLIC_KEY` (87 y 43 caracteres, mapa 02 §7), `VAPID_SUBJECT`
  `https://www.cyclingstar.app`. Si se filtra, quien la tenga puede mandar avisos a todos con el texto que quiera: el `notificationclick` con origen fijo impide
  que lleven a otra web. Rotarla rompe todas las suscripciones (mapa 02 §7): se escribe en `docs/ops.md` como paso de incidente.
- **Librería**: `web-push` 4.0.0 (mapa 02 §8: sin avisos según `pnpm audit`, solo ESM, sin tipos; se escriben los tipos mínimos en
  `apps/api/src/push/webPush.d.ts`).
- **Suscripción muerta**: 404 o 410 la borra; 3 fallos seguidos de otro tipo, también.
- **Ordenador compartido**: `Sign out` borra antes la suscripción de ese navegador (la web llama a `DELETE /api/me/push/:endpointHash`); cerrar una sesión desde
  la pantalla de sesiones borra las de esa sesión. La caducidad de la sesión **no** las borra: el ausente que no entra en 7 días es justo quien necesita
  `month_rule_warning`.
- Tope: 10 suscripciones por usuario; la undécima sustituye a la más vieja.

### 8.5 El jugador de iPhone

Hoy no recibe nada en una pestaña (mapa 02 §6). En `Notifications`, con un agente de iPhone o iPad (pantalla): `On iPhone, notifications only reach Cycling Star
when you add it to your Home Screen (Share, then Add to Home Screen) and open it from there.` Es una frase, no un aviso de instalar, y no añade manifiesto (DD-6
da las alternativas). Para todos, y para el iPhone sobre todo, lo que importa se ve **en la web**: al volver tras más de 20 días, `Account` y `/me/profile`
llevan un `Notice`: `You were away for 23 days. After 30 days without a visit your rider goes to the coach. Turn on Away mode before your next break.`

### 8.6 El contrato para la app

`push_subscriptions.channel` (`webpush`, `fcm`, `apns`) y `credential jsonb` (para `webpush`, `endpoint`, `p256dh`, `auth`; para las otras, el token). Un
`PushChannel` por canal con `send(target, notice)`, que devuelve `ok`, `gone` o `retry`; el catálogo, los topes y la baja no saben qué canal hay debajo. La app
se registra con `POST /api/me/push` como la web. No supone Expo, Capacitor ni nada.

## §9. El modo ausencia

**Ataques**: el jugador que encadena ausencias para guardar una silla de mánager sin jugar; A3 que la enciende o la apaga. Ninguno roba nada; el primero es de
E7.

- **Declarar**: `Account → Away mode`, fecha de vuelta entre mañana y **28 días** (112 días de juego), y el botón `Start away mode`. Texto (pantalla):
  `Going away? Pick the day you come back. Until then the coach decides your training, race orders run on autopilot, notifications stay quiet and the 30 day rule is paused.`
- **Mientras dura** (`users.away_since`, `away_until`): no hay avisos salvo `absence_ending`; el reloj de la regla del mes no corre; en `manual`, el día sin
  orden se resuelve como `mixto` y no como `descanso_activo` (`trainingDay.ts` l. 117 a 136; no toca el motor ni `ENGINE_VERSION`). Lo demás ya pasa solo (mapa
  03 §7): entrena, corre con órdenes automáticas, cobra. El agente libre sigue parado: es de E7.
- **Volver**: al llegar `away_until`, o antes con `End away mode` (sin contraseña). Al volver, `While you were away` de E2 hace el resumen (`retransmision.md`
  §8.8 y §11.4); E4 no lo duplica.
- **Encadenar**: una ausencia nueva se declara desde una visita con sesión, que ya demuestra que hay alguien. Lo más que deja sin regla del mes es 28 días tras
  la última visita, más los 30 de la regla.
- **Frontera con E7**: E4 da `isAway(user, now)`, `last_seen_at` escrita en toda visita (§11.4) y el aviso; qué hace el mundo con el ausente largo, el mánager y
  su silla, es de E7.

## §10. El correo transaccional

### 10.1 DNS

- **DMARC con informes**: `v=DMARC1; p=none; rua=mailto:<buzón>; fo=1`. Sin buzón propio (contacto aparcado), el destino es del dueño (DD-7). Tras 30 días de
  informes limpios, `p=quarantine; pct=25`, luego 100.
- **DKIM de 2.048 bits**: hoy 1.024 (mapa 02 §2). Si Resend deja elegir la longitud, **no lo sé**: se mira en su panel; si no, se queda y se apunta.
- **`CAA`** con `letsencrypt.org` y la autoridad de Railway: hoy no hay (mapa 02 §2) y es lo que impide que otro saque un certificado para el dominio. Cuál usa
  Railway: no lo sé, se lee del certificado servido.

### 10.2 Rebotes, quejas y supresión

`mailer.ts` lee la respuesta y guarda el `id` de Resend en `delivery_log` (hoy se pierde, l. 110). Ruta `POST /api/hooks/resend`, fuera de `/api/auth` y del
límite de credenciales, con el cuerpo crudo y la firma `svix` verificada con `RESEND_WEBHOOK_SECRET` (mapa 02 §3); sin firma válida, 401 y nada más.
`email.bounced` y `email.complained` marcan `users.email_undeliverable_at`; `Account` enseña `Our emails to this address bounce. Change it to one that works, or
you will not be able to reset your password.` (pantalla). Recordar: la supresión de Resend es de todo el equipo (mapa 02 §3); sin correo de juego, no hay otro
flujo que la contamine.

### 10.3 El tope, el presupuesto y el calentamiento

Plan gratuito: 100 al día y 3.000 al mes (mapa 02 §3); el plan de hoy, no lo sé. `MAIL_DAILY_BUDGET` (90 por defecto) y prioridades: al 70 % dejan de salir E6 y
E7; al 100 %, todo. Si el presupuesto se agota, `Register` y `ForgotPassword` dicen `We cannot send emails right now. Please try again tomorrow.` (pantalla): es
un estado global, no delata ninguna cuenta. Con A6 delante (10 IP), L4 deja 200 envíos al día como mucho y L5, 6 por buzón: sin el plan Pro, A6 sigue pudiendo
agotar el día, y por eso DD-2 recomienda Pro antes de abrir el registro. **Calentar y separar.** El volumen sin correo de juego es el de los registros (mapa 02
§4). El riesgo es el pico: la lista de espera de `captacion.md` entra en tandas de 50 invitaciones al día la primera semana y 150 la segunda. Separar por
subdominios solo hará falta con un segundo flujo: sería `notify.cyclingstar.app` con su DKIM y su return path, y para aislar la supresión, otro equipo de Resend
(mapa 02 §4, deducido). No se hace ahora.

## §11. Privacidad y datos

### 11.1 El texto nuevo de `Privacy.tsx` (pantalla)

Cada párrafo es un apartado con su título en negrita (lo que va antes del primer punto):

```text
Privacy. Cycling Star is a personal, non-commercial project. This page says what we keep and why.
What we store. Your email address. A hash of your password (we cannot read it). Your year of birth and the date you accepted these terms. Your in-game data: your rider, training, results, the races you follow and how far you have watched them. Your settings (theme, spoilers, notifications, away mode). When you last visited, used to pause or warn about inactivity. For each signed-in device: the browser it reported and a shortened IP address (the last part removed), so you can spot a device that is not yours.
Server logs. Every request is logged with its full IP address by our hosting provider, Railway, to investigate attacks. Links from our emails are removed from the logs. We are confirming how long Railway keeps logs.
Emails. Resend sends our account emails (confirmation, password reset, security notices). It receives your address and the email. We never send game news by email.
Notifications. If you turn them on, your browser gives us an address at its push service (Google, Mozilla, Apple or Microsoft). The text of each notice is encrypted on the way.
Your IP address and your country. When you create a rider we may ask a public IP-to-country service (ipinfo.io, ipwho.is or ipapi.co) for your country to pre-select a flag. That lookup is not saved.
Leaked passwords. When you choose a password we check it against Have I Been Pwned by sending only the first 5 characters of its hash.
Cookies and storage. A session cookie keeps you signed in. A device cookie remembers that this browser has signed in before, so others guessing your password cannot lock you out. A viewer cookie (90 days) keeps results hidden until you watch them. Your browser also stores your theme and a few display choices. No tracking or ad cookies.
Your data, your call. Download everything we keep about you in Account, Download my data. Delete your account in Account, Delete account: your email, password, sessions and settings are deleted at once. Your rider and your team stay in the world, run by the game, and your team gets a new name. Backups keep a copy for up to 14 days.
We do not offer a contact channel yet. This notice will be reviewed against applicable law before public launch.
```

Cada frase tiene su prueba: 14 días es `scripts/backup.sh` (mapa 03 §3) si el cron está puesto, que **no sé**; el plazo de Railway, no lo sé. Si un aviso de
privacidad sin un responsable con contacto es válido: a confirmar con un abogado.

### 11.2 Los logs

`logger.serializers.req` en `index.ts` l. 64: método, URL redactada y `remoteAddress`. `redactUrl` cambia el valor de `token`, `callbackURL` y cualquier
`?…email…` por `[redacted]` y el segmento de `/reset-password/<token>` por `/reset-password/[redacted]`. Test T11.2: ninguna línea de log de los recorridos
completos contiene un JWT (`eyJ`) ni una arroba. **La IP**: truncada en la base (§5), entera en los logs, por A1 y A6; las sesiones que ya existen se truncan en
la 0055.

### 11.3 El borrado atómico

Ruta propia `POST /api/me/delete` con `{ password }`: comprueba la contraseña con `auth.api` en el servidor (cuenta en L3) y, en **una** transacción como
`deleteUserAsAdmin` (`adminUsers.ts` l. 169 a 175): `releaseUserToWorld`, renombrar el equipo que tuviera a un nombre generado (el nombre lo escribió la
persona, mapa 03 §3; si es dato personal, a confirmar con un abogado), borrar las filas de `verifications` con su id, `push_subscriptions`, y el usuario
(sesiones, cuentas y `race_watch` caen en cascada). `auth_throttle` no tiene su id y `delivery_log` lo pierde (`set null`). Quedan: el corredor, el maillot, el
plan, la bitácora, el contrato (mapa 03 §3), el uuid en `respaldo_mundo_1` y en `admin_audit`.

### 11.4 Exportar, y `last_seen_at`

`POST /api/me/export` con contraseña (L3) y como mucho 3 al día: un JSON con la fila de `users` sin `is_admin`, sesiones (IP truncada), suscripciones (sin
claves), `race_watch`, corredor, equipo y preferencias. `last_seen_at`: `touchLastSeen` (`horizon.ts` l. 585 a 603) pasa de `resolveViewer` a
`createCurrentUserId`, así que la escribe toda petición con sesión, con su memo de una hora.

## §12. El contacto aparcado

**Riesgo, visto por el atacante**: la víctima de A4 no tiene a quién pedir su cuenta; nadie puede avisar de un menor (mapa 04 §6.3, 9); nadie puede avisar de un
fallo de seguridad. El deshacer de 7 días y E6 cubren lo primero mientras la víctima conserve su buzón; lo segundo y lo tercero quedan sin cubrir. **Lo que se
quita de la web**: `Ask and your account and rider data will be removed.` (`Privacy.tsx` l. 38). **El coste el día que se quiera** (estimado): un MX real o un
reenvío (hoy el MX apunta al Apache del alojamiento, mapa 02 §2), `support@` en el pie y en `Login`, un `/.well-known/security.txt` con `Contact:` y `Expires:`,
y la promesa de contestar, que es tiempo del dueño. Media hora de DNS y un PR pequeño.

## §13. Datos y migraciones

| Migración               | Cambio                                                                                                                                                                                                                                                                                             | Filas que existen                                 | Índice                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| 0055 `cuenta_y_edad`    | `users`: `birth_year smallint`, `age_confirmed_at`, `age_blocked_at`, `terms_version text`, `terms_accepted_at`, `away_since`, `away_until`, `email_undeliverable_at` (todas `timestamptz` y nulas), `notify_prefs jsonb not null default '{}'`; `name = 'Player'`; `sessions.ip_address` truncada | nulas: la del dueño se completa en `/confirm-age` | ninguno                                                                     |
| 0056 `limites_y_envios` | `auth_throttle(key text pk, window_start timestamptz, count int, day_start timestamptz, day_count int)`; `delivery_log(id uuid pk, channel text, kind text, recipient_hash text, user_id uuid null references users on delete set null, provider_id text, status text, created_at)`                | vacías                                            | `delivery_log(recipient_hash, created_at)`, `(created_at)`, `(provider_id)` |
| 0057 `avisos`           | `push_subscriptions(id uuid pk, user_id uuid references users on delete cascade, session_id uuid null references sessions on delete set null, channel text, endpoint_hash text unique, credential jsonb, created_at, last_ok_at, fail_count int)`                                                  | vacía                                             | `(user_id)`                                                                 |
| 0058 `auditoria_admin`  | `admin_audit(id uuid pk, at, actor text, action text, target_user_id uuid, ip_hint text, detail jsonb)`, sin clave hacia `users`                                                                                                                                                                   | vacía                                             | `(at)`                                                                      |
| 0059 `dos_factores`     | lo que pida el plugin `twoFactor` (`users.two_factor_enabled`, tabla `two_factors`), solo si DD-1                                                                                                                                                                                                  | `false`                                           | el del plugin                                                               |

Todas con `pnpm exec drizzle-kit generate` desde `schema.ts`. `session_id … on delete set null` y no `cascade`: la caducidad no debe borrar avisos (§8.4); el
cierre explícito los borra en código. **Purga diaria** (en el tick, un día real): `auth_throttle` de más de 2 días, `delivery_log` de más de 90, `sessions`
caducadas hace más de 30, `verifications` caducadas, y cuentas sin confirmar de más de 7 días sin corredor ni equipo.

## §14. Constantes

| Constante                     | Valor                  | Dónde                                      | Intención                                                                         |
| ----------------------------- | ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| `MIN_AGE`                     | 16                     | `packages/shared/src/account/constants.ts` | `00-encargo.md` §9.1; también `AGE_GATE_RETRY_HOURS` 24 y `PUSH_SUBS_PER_USER` 10 |
| `AWAY_MAX_DAYS`               | 28                     | íd.                                        | la regla del mes vuelve como mucho a los 58 días                                  |
| `RESET_TOKEN_TTL_S`           | 1.800                  | `apps/api/src/auth.ts`                     | menos tiempo para un enlace robado                                                |
| `UNDO_EMAIL_CHANGE_DAYS`      | 7                      | íd.                                        | la víctima sin contacto recupera su dirección                                     |
| `SESSION_MAX_AGE_DAYS`        | 90                     | íd.                                        | techo de una cookie robada; igual que `cs_viewer`                                 |
| `DEVICE_COOKIE_DAYS`          | 180                    | `apps/api/src/security.ts`                 | el navegador de siempre no se cierra                                              |
| `ACCOUNT_FAILS` (L1)          | 10 / 15 min; 30 / 24 h | íd.                                        | 11.000 intentos al año como mucho                                                 |
| `DEVICE_FAILS` (L2)           | 10 / 15 min            | íd.                                        | una cookie robada no da más que una nueva                                         |
| `SESSION_PASSWORD_FAILS` (L3) | 5 / 15 min; 10 / 24 h  | íd.                                        | la sesión robada no prueba contraseñas                                            |
| `MAIL_ROUTES_PER_IP_DAY` (L4) | 20                     | íd.                                        | A6 necesita muchas IP                                                             |
| `MAIL_PER_RECIPIENT` (L5)     | 3 / h; 6 / día         | íd.                                        | nadie llena un buzón ajeno                                                        |
| `MAIL_DAILY_BUDGET`           | 90 (variable)          | `env.ts`                                   | el correo 101 no llega a fallar en Resend                                         |
| `PUSH_PER_USER_DAY`           | 6                      | `packages/shared/src/account/constants.ts` | Chrome retira el permiso a quien avisa mucho (mapa 02 §5)                         |
| `STAGE_READY_PER_DAY`         | 4                      | íd.                                        | una vuelta da hasta 4 al día (mapa 02 §10)                                        |

## §15. Tests

**Nuevos, de seguridad** (en `apps/api/src/*.test.ts`, con PGlite y la API real, como `authFlow.test.ts`): T3.1 con menos de 16 años, 400 y ni fila en `users`
ni el correo en los logs; T3.2 `birthYear` sin `birthDate`, 400; T4.1 recuperar cierra las dos sesiones abiertas (la de antes responde `null`); T4.2 el segundo
enlace de recuperación anula el primero; T4.3 `verifications.identifier` no contiene el token; T4.4 tras recuperar, el navegador recibe `cs_device` y L1 está a
cero; T4.5 el aviso de cambio con un escáner simulado (un `GET` al enlace del correo) no cambia nada; T4.6 enumeración por tiempo: con un `Mailer` de 250 ms, la
diferencia de medianas de 15 entre correo existente y no existente es menor de 30 ms en registro, recuperación y cambio de correo; T6.1 la IP de 6.1; T6.2 diez
fallos desde 10 IP cierran a un navegador nuevo y no al que tiene cookie; T6.3 el 429 de L1 es igual para un correo que no existe; T6.4 L3 cierra la sesión al
décimo fallo; T6.5 L4 y L5 no cambian la respuesta, solo el envío; T6.6 los límites sobreviven a reconstruir `buildApp`; T7.1 la lista blanca (31 rutas); T7.2
`change-email` sin contraseña da 400; T7.3 el raíz no cambia su correo; T8.1 un `endpoint` fuera de la lista da 400 (con `http://localhost`,
`*.railway.internal` y una IP); T8.2 404 del servicio de push borra la suscripción; T8.3 `sw.js` sin `fetch` ni `caches`; T8.4 el canario renderiza el aviso;
T11.2 logs sin tokens ni arrobas; T11.3 un fallo inyectado tras `releaseUserToWorld` deja la cuenta y el corredor como estaban.

**Se re-sellan**: los registros de `authFlow.test.ts` (l. 72, 274, 368 y 423), `adminPanel.test.ts` l. 34 y el fixture `__fixtures__/spoilerWorld.ts` l. 244
añaden `birthDate` y la casilla (mapa 03 §8); `emails.test.ts` (el de la caducidad de una hora y los tres de `stageReadyEmail`, l. 81 a 121, que se van);
`entryForms.test.ts` y `Register.test.tsx`; los que usen `/api/auth/delete-user` o `list-sessions`.

## §16. Plan por PR, tests primero

| PR  | Contenido                                                                                                                                                 | Depende de | Coste (estimado) |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------- |
| 1   | Subida de dependencias (§7.2)                                                                                                                             | nada       | 0,5 días         |
| 2   | `auth.ts`: cerrar sesiones al recuperar, `hashed`, 1.800 s, anular anteriores, `backgroundTasks`, IP de 6.1, limitador explícito; T4.1 a T4.3, T4.6, T6.1 | 1          | 1 día            |
| 3   | Lista blanca, `get-session` sin token, logs redactados; T7.1, T11.2                                                                                       | 2          | 1 día            |
| 4   | 0056; capa 2 (L1 a L4), cookie de dispositivo, HIBP si DD-3; T4.4, T6.2 a T6.6                                                                            | 3          | 3 días           |
| 5   | Correo: `delivery_log`, L5, presupuesto, webhook, E2 a E7, enlaces con botón y fragmento, deshacer; T4.5, T6.5                                            | 4          | 3 días           |
| 6   | Cambio de correo con contraseña, raíz bloqueado, 0058 auditoría; 0059 y TOTP si DD-1; T7.2, T7.3                                                          | 5          | 2 días (+2 TOTP) |
| 7   | Sesiones: pantalla, rutas propias, 90 días, IP truncada                                                                                                   | 3          | 1,5 días         |
| 8   | 0055; edad, condiciones, `/confirm-age`, `name = 'Player'`                                                                                                | 2          | 2 días           |
| 9   | `Privacy.tsx`, borrado atómico, exportar, `last_seen_at` en toda visita; T11.3                                                                            | 7, 8       | 2 días           |
| 10  | 0057; avisos: `sw.js`, VAPID, suscripciones, preferencias, `stage_ready`; T8.1 a T8.4                                                                     | 9          | 3 días           |
| 11  | Modo ausencia y `absence_ending`                                                                                                                          | 10         | 2 días           |
| 12  | Purga diaria, métricas de §17, `docs/ops.md`                                                                                                              | 11         | 1 día            |

Cada PR deja producción mejor: el 2 cierra solo los bordes más graves sin migración; el 3, las rutas; el 4, el límite por cuenta. **El registro público no se
abre antes del PR 8 y del abogado** (`00-encargo.md` §9.1, punto 1).

## §17. Riesgos del despliegue y lo que se mide

**Riesgos.** (1) La cuenta del dueño: tras el PR 2 conserva su sesión; tras el PR 6 con TOTP, no entra al panel hasta configurarlo (y el token de máquina sigue
abierto como salida). (2) Correos en vuelo al cambiar los enlaces: `?token=` y `GET reset-password/:token` valen 7 días más. (3) Un despliegue vacía la capa 1
en memoria: da al atacante 10 intentos más por IP y despliegue; la capa 2, en Postgres, no se vacía. (4) Con varias réplicas, la capa 1 se multiplica; cuántas
hay, no lo sé. (5) El tope de Resend en el día de la apertura: §10.3. (6) Railway cambia su cabecera: lo dice la alarma `client_ip_untrusted` (§6.1). (7)
`backgroundTasks` pierde un correo si el proceso muere: se ve en `delivery_log` (`queued` sin `sent`).

**Lo que se mide** (consultas sobre `delivery_log`, `auth_throttle`, `sessions` y los logs; un panel en `/admin`):

| Medida                                       | Umbral de alarma                          |
| -------------------------------------------- | ----------------------------------------- |
| Fallos de entrada en una hora, todo el juego | más de 10 veces la mediana de 7 días (A1) |
| Cuentas distintas con L1 disparado en un día | más de 5                                  |
| Envíos del día frente a `MAIL_DAILY_BUDGET`  | 70 %                                      |
| Rebotes y quejas sobre envíos, 7 días        | 4 % y 0,08 % (mapa 02 §4)                 |
| Registros sin confirmar a los 7 días         | más del 30 % (correo que no llega)        |
| Suscripciones borradas por 404 o 410, semana | más del 20 % (Chrome retira permisos)     |
| Deshacer cambios de correo usados            | uno solo: se mira a mano                  |

## §18. Fronteras

**E2**: E4 envía el aviso de etapa lista con `stageReadyNotice` y nada más; borra `stageReadyEmail` y mueve el canario. `While you were away` y su texto son de
E2. **E7**: E4 da `last_seen_at` en toda visita, `isAway` y `month_rule_warning` (apagado hasta que la regla exista). La regla, el entrenador al mando, la silla
y G8, de E7. **E8**: la cuenta sigue sabiendo si es premium; `admin_audit` registra quién lo da. **E9**: ninguna ruta nueva de mensajes; si E9 añade avisos,
entran en el catálogo de §8.1 con sus topes. **E10**: `users.locale` se queda como está; los textos, en inglés. **W5**: no se toca `Watch`, `docs/visual.md`, el
CI ni `packages/shared/src/broadcast/`; el canario se mueve cuando W5 lo deje libre. **La app**: §8.6.

## §19. Decisiones que son del dueño

| #    | Decisión                                        | Por defecto y porqué                                                                                         | Si elige otra cosa                                                                            |
| ---- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| DD-1 | Segundo factor para el panel                    | TOTP solo para administradores: lo único que para A4 contra el raíz; no es OAuth ni código por correo        | Sin TOTP: el panel sigue colgando del buzón de `ADMIN_EMAIL`; 2 días menos                    |
| DD-2 | Plan de Resend                                  | Pro (20 USD al mes) antes de abrir el registro: con el gratuito, A6 corta el registro de todos un día entero | Gratuito: `MAIL_DAILY_BUDGET` 90 y tandas de invitación pequeñas                              |
| DD-3 | Contraseñas filtradas (Have I Been Pwned)       | Sí: único freno a A1 que no depende de la IP                                                                 | No: una línea menos en privacidad, A1 sin freno propio                                        |
| DD-4 | Qué se guarda de la fecha de nacimiento         | El año: basta para saber quién tiene 16 o 17                                                                 | La fecha entera: permite saber el día exacto en que cumple 18; más valor si se filtra         |
| DD-5 | Correo de entrada desde un navegador nuevo (E6) | Encendido y sin interruptor: es la única pista de A1 con la contraseña buena                                 | Con interruptor en `Account`; o apagado, que ahorra correo y deja ciego al dueño de la cuenta |
| DD-7 | Destino de los informes DMARC                   | Un buzón del dueño fuera del dominio (pide el registro de autorización en ese dominio)                       | Un servicio gratuito de resúmenes DMARC (otro tercero); o sin informes, como hoy              |

Las de gusto, con tres alternativas cada una (la A es la de por defecto):

| #     | Decisión                   | A (por defecto)                                                                                                                                                                                                                | B                                                                                                                                                                    | C                                                                                                       |
| ----- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| DD-6  | El iPhone y los avisos     | Una frase en `Notifications`, solo con agente de iPhone o iPad: `On iPhone, notifications only reach Cycling Star when you add it to your Home Screen (Share, then Add to Home Screen) and open it from there.` Sin manifiesto | Nada específico: en iPhone, en lugar del botón, `Notifications are not available in this browser yet. Check the site when you come back.`                            | La frase de A y un paso a paso de tres líneas con capturas del botón Compartir; roza D-00p más que A    |
| DD-8  | Avisos encendidos de serie | `month_rule_warning` y `absence_ending` encendidos; `stage_ready` apagado                                                                                                                                                      | Los tres encendidos, `stage_ready` con tope de 2 al día                                                                                                              | Todos apagados                                                                                          |
| DD-9  | Cuándo se pide el permiso  | Solo desde `Account → Notifications`                                                                                                                                                                                           | Además, una tarjeta en `/me/profile` al seguir la primera carrera: `Get a notice when the next stage is ready?` con `Turn on` y `Not now` (que no vuelve en 30 días) | Además, al declarar `Away mode`: `Turn on notifications to hear when your time away ends.`              |
| DD-10 | Pantalla del modo ausencia | Panel en `Account` con el texto de §9, selector de fecha y `Start away mode`; activo, `Away until 3 Dec 2026` y `End away mode`                                                                                                | Tres botones de duración, `1 week`, `2 weeks` y `4 weeks`, en vez del selector                                                                                       | A y una franja en lo alto de cada página mientras dura: `You are away until 3 Dec.` con `End away mode` |
| DD-11 | Pantalla de sesiones       | La lista de §5, con IP truncada                                                                                                                                                                                                | Sin IP: navegador y fechas; menos dato, menos pista para la víctima                                                                                                  | Solo `Sign out of all other devices` y el número de sesiones abiertas                                   |
| DD-12 | Texto de privacidad        | El de §11.1, por apartados                                                                                                                                                                                                     | El mismo en una tabla `What`, `Why`, `How long`                                                                                                                      | Un resumen de cinco líneas arriba y el detalle plegado debajo                                           |

En las tres de DD-12 el contenido es el mismo, y su validez: a confirmar con un abogado.
