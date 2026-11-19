# Mapa 01 · La cuenta y la seguridad

Commit `2a29e6d`. **Leídos enteros** (líneas): `apps/api/src/auth.ts` 226, `security.ts` 131,
`routes/authProxy.ts` 72, `app.ts` 392, `env.ts` 126, `index.ts` 115, `viewerCookie.ts` 73,
`apps/web/src/auth/client.ts` 7, `railway.json` 15. **Por tramos**, con la línea citada:
`routes/context.ts`, `mailer.ts`, `packages/db/src/schema.ts` (l. 100 a 175), `Register.tsx`,
`Account.tsx`, `domain/entryForms.ts`, y del paquete instalado: `ba/` es
`node_modules/.pnpm/better-auth@1.6.25…/node_modules/better-auth/dist/` y `core/` es
`@better-auth/core@1.6.25…/dist/` (rutas `api/routes/*.mjs`, `api/rate-limiter/index.mjs`,
`context/create-context.mjs`, `db/internal-adapter.mjs`, `cookies/index.mjs`, `utils/ip.mjs`),
`@better-auth/utils@0.4.2/dist/password.node.mjs` y `@fastify/rate-limit@11.2.0`.

**Cómo se ha medido.** Scripts propios en `<scratchpad>/mapa01/` (se pierden con la sesión), sobre un
clon de `2a29e6d` compilado con `pnpm exec tsc -b`. `arnes.mjs` levanta PGlite con las migraciones,
`createAuth` y `buildApp` de verdad escuchando en HTTP, un `Mailer` falso que guarda cada correo en
un fichero (con una espera opcional, `MAIL_DELAY_MS`, para imitar a Resend) y un gancho `onRequest`
que apunta `request.ip`, `request.ips` y las cabeceras crudas. Se arrancó dos veces: sin `NODE_ENV`
y con `NODE_ENV=production`. `rutas-sonda.mjs`, `rutas2.mjs`, `limites.mjs`, `enum.mjs` y
`tokens.mjs` hablan con él por `fetch`. Un segundo clon (`clon17`) sube `better-auth` a 1.7.26 y
`fastify` a 5.12.8 para §8. Producción: solo cuatro GET el 19 de noviembre de 2026.

## Resumen

1. **Recuperar la contraseña no cierra ninguna sesión** (§2, §3): `revokeSessionsOnPasswordReset`
   no está en `auth.ts` y su defecto es no (`ba/api/routes/password.mjs` l. 172). Medido: la sesión
   abierta antes del reset sigue respondiendo 200 después. Quien robó una sesión la conserva siete
   días renovables aunque la víctima recupere la cuenta, y la web no ofrece cerrar las otras.
2. **Los enlaces de recuperación no se anulan entre sí** (§2): pedir dos y usar el primero deja el
   segundo vivo (medido, 200). Se guardan en claro en `verifications.identifier`.
3. **El tiempo de respuesta delata las cuentas en tres rutas** (§5): registro, recuperación y cambio
   de correo esperan a que salga el correo solo cuando la cuenta existe (o no existe). Con un correo de
   250 ms: 84 frente a 341 ms al registrarse, 9 frente a 259 ms al recuperar, 8 frente a 263 ms al
   cambiar el correo (medianas de 9). Los cuerpos y los códigos son idénticos.
4. **Ningún límite mira la cuenta** (§4): tras más de 40 fallos contra un correo desde varias IP, la
   contraseña buena entra a la primera desde una IP nueva (medido). La capa de Fastify da 10 intentos
   cada 5 minutos por IP y **por ruta** (cada ruta su contador, medido y en el código).
5. **`better-auth` solo limita con `NODE_ENV=production`, y entonces su clave depende de la cabecera**
   (§4): con una IP en `X-Forwarded-For`, un cubo por IP; sin cabecera o con dos IP, **un cubo único
   para todo el mundo** por ruta (3 entradas cada 10 s para todos), medido. Nixpacks pone
   `NODE_ENV=production` según su documentación; Railway dice que reescribe la cabecera (§4.3).
6. **Hay rutas abiertas que la web no usa** (§1): `verify-password` responde por HTTP aunque lleva
   `scope: "server"` y solo tiene el límite flojo (60 por minuto, medido): 30 veces más intentos por
   hora que `change-password`. `update-user` guarda `name` e `image` sin tope (900.000 caracteres
   aceptados). `list-sessions`, `revoke-session(s)` y `revoke-other-sessions` funcionan y nadie las
   llama.
7. **La subida a `better-auth` 1.7.26 y `fastify` 5.12.8 compila y pasa los tests** (§8): 69 ficheros,
   1.126 tests, sin migración de esquema. Los tres avisos de `better-auth` no nos alcanzan hoy. La
   subida no arregla 1, 2, 3, 4 ni 6 (medido en 1.7.26).

## §1. Las rutas de `/api/auth/*`

El proxy monta las ocho rutas de `CREDENTIAL_AUTH_PATHS` como `POST` con el límite estricto y todo lo
demás por el comodín `GET` y `POST` con el flojo (`authProxy.ts` l. 62 a 71; `security.ts` l. 54 a
68). `better-auth` monta 31 puntos (`ba/api/index.mjs` l. 112 a 146), enumerados con `auth.api`
(`rutas.mjs`) y probados uno a uno con y sin sesión. «Fastify» es el límite de `security.ts` por IP;
«BA» es el de `better-auth`, que solo corre con `NODE_ENV=production` (§4).

| Ruta                                                   | La web                                      | Fastify | BA        | Qué hace hoy (medido)                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------- | ------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /sign-up/email`                                  | `Register.tsx` l. 119                       | 10/5min | 3/10 s    | Crea la cuenta y manda la verificación; con correo ya usado, 200 con un usuario inventado (§5)                                                                                                                                                                                            |
| `POST /sign-in/email`                                  | `Login.tsx` l. 52                           | 10/5min | 3/10 s    | 401 igual para correo inexistente y contraseña mala; 403 `EMAIL_NOT_VERIFIED` solo con la contraseña buena                                                                                                                                                                                |
| `GET, POST /get-session`                               | `useSessionState.ts` l. 23 y cuatro páginas | 60/min  | 100/10 s  | 200 `null` sin sesión; con sesión devuelve `session.token`, `ipAddress` y `userAgent` al JavaScript                                                                                                                                                                                       |
| `POST /sign-out`                                       | `Account.tsx` l. 385                        | 60/min  | 100/10 s  | Cierra la sesión y borra `cs_viewer` (`authProxy.ts` l. 18 a 21 y 52 a 54)                                                                                                                                                                                                                |
| `GET /verify-email`                                    | enlace del correo                           | 60/min  | 100/10 s  | Confirma y abre sesión (§2)                                                                                                                                                                                                                                                               |
| `POST /send-verification-email`                        | `Register.tsx` l. 42, `Account.tsx` l. 88   | 10/5min | 3/60 s    | Sin sesión, suelo de 500 ms en todos los casos (`ba/api/routes/email-verification.mjs` l. 104 a 117)                                                                                                                                                                                      |
| `POST /request-password-reset`                         | `ForgotPassword.tsx` l. 47                  | 10/5min | 3/60 s    | Siempre 200 con el mismo mensaje; delata por el tiempo (§5)                                                                                                                                                                                                                               |
| `GET /reset-password/:token`                           | enlace del correo                           | 60/min  | 100/10 s  | 302 a `/reset-password?token=…` o `?error=INVALID_TOKEN` (también en producción, GET del 19 de noviembre)                                                                                                                                                                                 |
| `POST /reset-password`                                 | `ResetPassword.tsx` l. 49                   | 10/5min | 100/10 s  | Cambia la contraseña; no cierra sesiones (§2)                                                                                                                                                                                                                                             |
| `POST /change-email`                                   | `Account.tsx` l. 139                        | 10/5min | 3/10 s    | No pide la contraseña; aviso a la dirección vieja si está confirmada (§2)                                                                                                                                                                                                                 |
| `POST /change-password`                                | `Account.tsx` l. 220 a 223                  | 10/5min | 3/10 s    | Pide la actual; la web manda `revokeOtherSessions: true`                                                                                                                                                                                                                                  |
| `POST /delete-user`                                    | `Account.tsx` l. 316                        | 10/5min | 100/10 s  | 400 sin contraseña (gancho de `auth.ts` l. 180 a 192); 400 `INVALID_PASSWORD` con una mala                                                                                                                                                                                                |
| `GET /list-sessions`                                   | no                                          | 60/min  | 100/10 s  | 200 con todas las sesiones del usuario: token, IP y agente de cada una                                                                                                                                                                                                                    |
| `POST /revoke-session`, `/revoke-sessions`             | no                                          | 60/min  | 100/10 s  | 200; la segunda cierra todas, la propia incluida                                                                                                                                                                                                                                          |
| `POST /revoke-other-sessions`                          | no                                          | 60/min  | 100/10 s  | 200; es la pieza que E4 pide para «cerrar las otras»                                                                                                                                                                                                                                      |
| `POST /update-user`                                    | no                                          | 60/min  | 100/10 s  | Escribe `name` e `image` sin validar (una URL ajena y 900.000 caracteres, 200). Ignora `isAdmin`, `premium`, `locale`, `theme` y `emailVerified` (consultado en `users`); `email`, 400. Ninguna ruta del juego lee `users.name` ni `users.image` (búsqueda en `apps/api` y `packages/db`) |
| `POST /verify-password`                                | no                                          | 60/min  | 100/10 s  | Con sesión, 200 si la contraseña es buena y 400 si no. `scope: "server"` (`password.mjs` l. 183) no se aplica por HTTP. Serie G de §4: 60 intentos por minuto                                                                                                                             |
| `POST /update-session`                                 | no                                          | 60/min  | 100/10 s  | 400 `No fields to update`                                                                                                                                                                                                                                                                 |
| `GET /list-accounts`                                   | no                                          | 60/min  | 100/10 s  | 200 con la cuenta `credential` (sin la contraseña)                                                                                                                                                                                                                                        |
| `/sign-in/social`, `/link-social`, `/callback/:id`     | no                                          | 60/min  | 3/10 s \* | 404 `PROVIDER_NOT_FOUND`; el callback, 302 a la página de error. Sin proveedores, inertes                                                                                                                                                                                                 |
| `/account-info`, `/get-access-token`, `/refresh-token` | no                                          | 60/min  | 100/10 s  | 400 o 401: no hay OAuth                                                                                                                                                                                                                                                                   |
| `/unlink-account`, `GET /delete-user/callback`         | no                                          | 60/min  | 100/10 s  | 400 «last account»; 404 (no hay `sendDeleteAccountVerification`)                                                                                                                                                                                                                          |
| `GET /ok`, `GET /error`                                | no                                          | 60/min  | 100/10 s  | 200 `{"ok":true}`; una página HTML de error de `better-auth`                                                                                                                                                                                                                              |

\* `/sign-in/social` empieza por `/sign-in` y cae en la regla especial (`rate-limiter/index.mjs`
l. 373). `set-password` es solo de servidor y da 404 por HTTP (medido). En producción, `GET /ok`,
`GET /list-sessions` (401) y `GET /reset-password/abc` responden igual que en local (GET del 19 de
noviembre de 2026), así que la tabla vale también allí.

**Riesgos de hoy en esta tabla.** Con una sesión robada: probar contraseñas por `verify-password` a 60
por minuto en vez de 10 cada 5 (sirve para reutilizarla en otros sitios o para borrar la cuenta);
leer las IP y los agentes de todas las sesiones de la víctima (`list-sessions`); cambiar el correo
sin la contraseña (frenado solo por el aviso a la dirección vieja, §2). Sin sesión, nada de la tabla
abre una cuenta.

## §2. Los tokens

| Token                                                   | Cómo se genera                                                                                                               | Longitud          | Dónde se guarda                                                                                                   | Vida                                                          | ¿Un solo uso?                                                                         | Al pedir otro                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Verificación (registro, entrar sin confirmar, reenviar) | JWT HS256 con `SESSION_SECRET`, `{email, iat, exp}` (`email-verification.mjs` l. 13 a 19)                                    | 147 car. (medido) | En ningún sitio: 0 filas nuevas en `verifications` (medido)                                                       | 3.600 s (`exp − iat`, medido; defecto l. 13)                  | No. Abierto otra vez tras confirmar: 302 sin sesión (l. 285 a 290, medido)            | El anterior sigue valiendo: abrió sesión (medido)         |
| Recuperación                                            | `generateId(24)`, alfabeto `a-zA-Z0-9`, unos 143 bits (`password.mjs` l. 74; `core/utils/id.mjs`)                            | 24 car.           | `verifications.identifier = 'reset-password:<token>'` **en claro**, `value` = id del usuario (l. 75 a 79, medido) | 3.600 s (l. 73, medido)                                       | Sí: `consumeVerificationValue` (l. 157); el segundo uso, 400 `INVALID_TOKEN` (medido) | **No caduca**: usado el 1.º, el 2.º también vale (medido) |
| Aviso a la dirección vieja                              | JWT `{email, updateTo, requestType: change-email-confirmation}` (`update-user.mjs` l. 490 a 498)                             | unos 230 car.     | En ningún sitio                                                                                                   | 3.600 s                                                       | No: cada clic manda otra vez el enlace a la nueva (2 correos con 2 clics, medido)     | No consta que se anule                                    |
| Verificación de la dirección nueva                      | JWT `{…, requestType: change-email-verification}` (`email-verification.mjs` l. 196 a 199)                                    | unos 230 car.     | En ningún sitio                                                                                                   | 3.600 s                                                       | En la práctica: el correo ya cambió y el 2.º uso da `USER_NOT_FOUND` (medido)         | No consta                                                 |
| Sesión                                                  | `generateId(32)`, unos 190 bits (`internal-adapter.mjs` l. 187)                                                              | 32 car.           | `sessions.token` **en claro**, con `ip_address` y `user_agent` (l. 177 y 178)                                     | 7 días, renovados (§3)                                        | No aplica                                                                             | No aplica                                                 |
| `cs_viewer`                                             | `v1.<userId>.<emitida>.<HMAC-SHA256>` con `SESSION_SECRET` y el prefijo `cs_viewer.` (`viewerCookie.ts` l. 27 a 31, 71 a 73) | unos 100 car.     | Solo en el navegador                                                                                              | 90 días (`packages/shared/src/broadcast/constants.ts` l. 209) | No aplica: solo restringe, nunca abre una ruta privada (`viewerCookie.ts` l. 5 a 21)  | Se renueva como mucho una vez al día                      |

**Lo que pasa con las sesiones** (medido en `tokens.mjs`): al **recuperar** la contraseña, las dos
sesiones abiertas siguen vivas y la de antes del reset responde 200 en `get-session`; el código solo
las cerraría con `revokeSessionsOnPasswordReset` (`password.mjs` l. 172), que `auth.ts` no pone. Al
**cambiar** la contraseña desde `Account`, `revokeOtherSessions: true` borra todas y abre una nueva
(`update-user.mjs` l. 180 a 190). Al **abrir sin sesión el enlace de la dirección nueva**, 1.6.25 abre
una sesión nueva para la cuenta (l. 214 a 221, medido); 1.7.26 ya no (medido, §8). `cs_viewer` no se
toca al recuperar ni al cerrar otras sesiones: solo `sign-out` y `delete-user` la borran.

**Los enlaces son GET que cambian estado.** Abrir `verify-email` confirma, abre sesión o manda el
correo a la dirección nueva. Un escáner de enlaces del buzón que siga el enlace del aviso de cambio
de correo lo aprobaría sin la persona: no lo he probado con un escáner real (estimado por el código).

**El cambio de correo con la dirección sin confirmar** (cuentas antiguas con sesión viva, `auth.ts`
l. 117 a 121): sin correo confirmado no hay aviso a la vieja (`update-user.mjs` l. 451) y el enlace va
directo a la nueva (l. 505 a 514). No lo he medido; es la rama del código.

## §3. La sesión

- **Duración y renovación**: 7 días (`expiresIn` 604.800 s) y `updateAge` 1 día por defecto
  (`ba/context/create-context.mjs` l. 145 a 148). Cada `get-session` con la sesión de más de un día
  la alarga otros 7 (`ba/api/routes/session.mjs` l. 205 a 210): quien entra cada semana no sale
  nunca; quien no entra en 7 días, sale. `freshAge` 1 día (l. 148), sin efecto en `delete-user` porque
  el gancho exige la contraseña siempre (`update-user.mjs` l. 329).
- **Sin caché de sesión**: `cookieCache` no está en `auth.ts`, así que cada petición con sesión lee
  `sessions` y `users` (`createCurrentUserId`, `routes/context.ts` l. 57).
- **La cookie**: `better-auth.session_token` en local; con `APP_URL` en https, `__Secure-` delante
  (`ba/cookies/index.mjs` l. 21 y 47), firmada con HMAC (l. 127). Medido: `Max-Age=604800; Path=/;
HttpOnly; SameSite=Lax` (y `Secure` en https, `auth.ts` l. 213 a 218). El token crudo viaja también
  en el JSON de `get-session` y `list-sessions` (medido); sin `SESSION_SECRET` no basta para fabricar
  la cookie.
- **Lo que se guarda**: `ip_address` sale de `getIp` y `user_agent` de la cabecera
  (`internal-adapter.mjs` l. 177 y 178). Medido: `list-sessions` devuelve `["203.0.113.50",
"navegador-B"]` con una IP en `X-Forwarded-For`. Sin IP fiable (sin cabecera o con dos IP, en
  producción) se guarda `""` (l. 177; deducido, no medido). El contraste con `Privacy.tsx` es del
  mapa 03.

## §4. Los límites de intento

### 4.1 Las dos capas, en el código

| Capa                  | Cifras                                                                                                                                                                                                                                                                     | Clave                                                                                                                                                                      | Almacén y reinicio                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@fastify/rate-limit` | 300/min global; 60/min el comodín de auth; 10 cada 5 min las 8 rutas de credenciales (`security.ts` l. 10, 36, 43, 54 a 68). **Cada ruta con `config.rateLimit` tiene su propio contador** (`LocalStore.prototype.child`, `store/LocalStore.js` l. 79 a 81)                | `request.ip` (`index.js` l. 58), que con `trustProxy: true` es la IP **más a la izquierda** de `X-Forwarded-For` (medido)                                                  | LRU en memoria de 5.000 claves por contador (`LocalStore.js` l. 5 a 9); se vacía al reiniciar o desplegar. Con varias réplicas, una por réplica (no sé cuántas hay) |
| `better-auth`         | Por defecto 100 cada 10 s; `sign-in*`, `sign-up*`, `change-password`, `change-email`: 3 cada 10 s; `request-password-reset`, `send-verification-email`: 3 cada 60 s (`rate-limiter/index.mjs` l. 370 a 384). Ventana que se desliza con cada intento admitido (l. 25 a 62) | `<ip>\|<ruta>` (l. 287). IP de `X-Forwarded-For` solo si trae **una** (`core/utils/ip.mjs` l. 188); si no, `no-trusted-ip`: **un cubo compartido por ruta** (l. 275 y 287) | `Map` en memoria del proceso (l. 6), hasta 100.000 claves; se vacía al reiniciar. Encendido solo con `NODE_ENV=production` (`create-context.mjs` l. 171)            |

La capa de `better-auth` responde 429 con `X-Retry-After` y `{"message":"Too many requests…"}`
(l. 64 a 70); la de Fastify, 429 con `retry-after` y `{ok:false,error:"demasiadas_peticiones"}`
(`app.ts` l. 213 a 217). Un 429 de `better-auth` cuenta en Fastify, porque pasa antes por ella.

### 4.2 Medido en local (`limites.mjs`, una cuenta, contraseña mala salvo en H)

| Serie                                                     | Sin `NODE_ENV`                       | `NODE_ENV=production`                                        |
| --------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| A. 13 entradas, misma IP, sin cabecera                    | 10 × 401, luego 429 (300 s, Fastify) | 3 × 401, 7 × 429 de BA (10 s), luego 429 de Fastify          |
| B. después, 4 `request-password-reset` desde esa IP       | 4 × 200 (contador aparte)            | 3 × 200 y 429 de BA (60 s)                                   |
| C. 13 entradas, una IP distinta en la cabecera cada vez   | 13 × 401, nunca 429                  | 13 × 401, nunca 429                                          |
| D. 13 entradas, la misma IP en la cabecera                | como A                               | como A                                                       |
| E. 6 entradas con `X-Forwarded-For: <falsa>, 203.0.113.8` | 6 × 401 (Fastify toma la falsa)      | 6 × 429 de BA: comparten el cubo `no-trusted-ip` que gastó A |
| F. 4 entradas con `X-Real-IP` distinta y sin XFF          | 429: Fastify la ignora (`127.0.0.1`) | igual                                                        |
| G. 64 `verify-password` malas con sesión                  | 60 × 400, luego 429 (55 s)           | igual: no hay regla especial y 100 cada 10 s no llega antes  |
| H. la buena, desde otra IP, tras más de 40 fallos         | 200                                  | 200                                                          |

Lectura: en local la cabecera se falsifica a voluntad (C y E). **Lo que defiende hoy el login en
producción es Fastify con la IP que ponga Railway**: 10 intentos cada 5 minutos por IP (2.880 al día
por IP, calculado), sin tope por cuenta. Si `better-auth` está encendido, añade 3 cada 10 s por IP,
que no cambia el techo de 5 minutos. Y si un día llegara la cabecera con dos IP (un CDN delante),
`better-auth` cerraría el login a todo el mundo a 3 cada 10 s y dejaría `sessions.ip_address` vacío.

### 4.3 Railway y `NODE_ENV` (leído el 19 de noviembre de 2026)

- `docs.railway.com/networking/public-networking/specs-and-limits`: solo nombra `X-Real-IP` «for
  identifying client's remote IP»; de `X-Forwarded-For`, nada. La página no lleva fecha.
- `station.railway.com/questions/which-client-address-headers-does-the-ra-fb9e36d7` (moderador de
  Railway, 29 de septiembre de 2026): `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` y
  `X-Forwarded-Host` «are all overwritten at Railway's edge»; lo que entra por la red privada
  (`*.railway.internal`) no pasa por el borde. No es documentación, y otros hilos del mismo foro
  cuentan casos con IP de la infraestructura en `X-Real-IP`.
- Encaja con la prueba del orquestador (`00-encargo.md` l. 101 a 112) y con un GET de hoy: la respuesta
  de producción trae `server: railway-hikari`, `x-railway-edge: ord1` y `x-ratelimit-limit: 60`.
- `NODE_ENV`: `railway.json` construye con `NIXPACKS` (l. 4), y `nixpacks.com/docs/providers/node`
  dice que el proveedor de Node pone `NODE_ENV=production`. **Probable, no comprobado**: con GET
  no se distingue (el límite de 60 por minuto de Fastify salta antes que los 100 cada 10 s de
  `better-auth`), y nuestro código no lo lee (`env.ts` no lo valida).

## §5. La enumeración de correos (`enum.mjs`, medianas de 9, IP distinta en cada petición)

| Ruta y caso                                      | Código | Cuerpo                                  | Correo al instante | Correo de 250 ms |
| ------------------------------------------------ | ------ | --------------------------------------- | ------------------ | ---------------- |
| `sign-up`, correo nuevo                          | 200    | `{token:null,user:{…}}`                 | 88 ms              | **341 ms**       |
| `sign-up`, correo que existe                     | 200    | igual, con un id inventado              | 83 ms              | **84 ms**        |
| `sign-in`, correo que no existe                  | 401    | `INVALID_EMAIL_OR_PASSWORD`             | 84 ms              | 78 ms            |
| `sign-in`, existe y contraseña mala              | 401    | igual                                   | 77 ms              | 86 ms            |
| `sign-in`, sin confirmar y contraseña buena      | 403    | `EMAIL_NOT_VERIFIED`                    | 84 ms              | 335 ms           |
| `request-password-reset`, no existe              | 200    | `If this email exists in our system, …` | 7 ms               | **9 ms**         |
| `request-password-reset`, existe                 | 200    | igual                                   | 6 ms               | **259 ms**       |
| `send-verification-email`, los tres casos        | 200    | `{status:true}`                         | 505 ms             | 505 ms           |
| `change-email`, a un correo libre (con sesión)   | 200    | `{status:true}`                         | 14 ms              | **263 ms**       |
| `change-email`, a un correo ocupado (con sesión) | 200    | igual                                   | 9 ms               | **8 ms**         |

Las respuestas no delatan nada; el tiempo sí, en las tres filas en negrita, porque `better-auth`
espera al envío (`runInBackgroundOrAwait`, `create-context.mjs` l. 214 a 224) solo en una rama:
`sign-up.mjs` l. 246 frente a l. 174; `password.mjs` l. 82 frente a l. 60 a 72; `update-user.mjs`
l. 490 a 498 frente a l. 456 a 460. La latencia real de Resend no la he medido (no se puede sin
mandar correo); 250 ms es una suposición. `send-verification-email` sin sesión ya trae un suelo de
500 ms (`email-verification.mjs` l. 104). `sign-in` iguala con un hash falso (`sign-in.mjs` l. 288 a
291). El 403 solo lo ve quien ya sabe la contraseña. Registrarse con un correo ajeno no avisa a su
dueño: `onExistingUserSignUp` no está en `auth.ts` (l. 175 del paquete). La opción que quitaría la
espera existe en 1.6.25: `advanced.backgroundTasks.handler` (`create-context.mjs` l. 216).

## §6. Las contraseñas

- **Longitud**: de 8 a 128 caracteres, defectos de `better-auth` (`create-context.mjs` l. 185 y
  186); la web solo comprueba el mínimo, `MIN_PASSWORD = 8` (`entryForms.ts` l. 16 y 37) y
  `Account.tsx` l. 208.
- **Hash**: scrypt de Node con N = 16.384, r = 16, p = 1, 64 bytes, sal de 16 bytes y la contraseña
  normalizada NFKC (`@better-auth/utils/dist/password.node.mjs` l. 3 a 33). Se guarda `sal:hash` en
  `accounts.password`, 161 caracteres (medido). La comparación final es `===` de dos hex (l. 41), no
  en tiempo constante; detrás de un scrypt, sin efecto medible (estimado). `users.password_hash`
  existe y no se usa (`schema.ts` l. 106 a 108).
- **Listas de contraseñas filtradas**: no se comprueban. `auth.ts` no carga ningún plugin
  (`haveIBeenPwned` incluido); `contrasena-de-prueba-larga` y cualquier cadena de 8 se aceptan.

## §7. Lo que E4 pide y la API ya trae sin usar

| Pieza del encargo                           | Lo que hay en `better-auth` 1.6.25                                                               | Lo que falta                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Ver las sesiones propias                    | `GET /list-sessions` con IP, agente, creación y caducidad (medido)                               | Pantalla; decidir si se enseña la IP (mapa 03)                                                |
| Cerrar las otras                            | `POST /revoke-other-sessions` y `/revoke-session` (medido)                                       | Pantalla                                                                                      |
| Cerrar sesiones al recuperar                | `revokeSessionsOnPasswordReset: true` (`password.mjs` l. 172)                                    | Ponerlo en `auth.ts`                                                                          |
| Límite por cuenta                           | Nada en el núcleo; `customRules` por ruta y por IP (`rate-limiter/index.mjs` l. 301 a 318)       | Todo                                                                                          |
| Tokens guardados con hash                   | `verification.storeIdentifier: 'hashed'` (`db/verification-token-storage.mjs` l. 8 a 22)         | Ponerlo; los enlaces vivos al desplegar siguen valiendo (`internal-adapter.mjs` l. 675 a 678) |
| Qué IP vale                                 | `advanced.ipAddress.ipAddressHeaders` y `trustedProxies` (`core/utils/ip.mjs` l. 175 a 187, 204) | Decidirlo; Fastify tiene su propio `trustProxy: true` (`app.ts` l. 160)                       |
| Correo al dueño si alguien usa su dirección | `onExistingUserSignUp` (`sign-up.mjs` l. 175)                                                    | Plantilla y decisión                                                                          |

## §8. Las dependencias con avisos

`pnpm audit --json` en el clon (19 de noviembre de 2026) da, para lo que corre en la API:

| Aviso                                                                                                                             | Paquete y rango                                  | Qué es                                                                                | ¿Nos alcanza hoy?                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GHSA-965c-763c-88jm`, crítica, 30 sep 2026                                                                                       | `better-auth` ≥1.4.0-beta.18 <1.7.7              | El `state` de OAuth sirve como enlace mágico y abre la cuenta de otro                 | No: exige enlace mágico Y un proveedor social u OAuth genérico; no hay plugins ni proveedores (`auth.ts` l. 102 a 223; §1, 404 medidos)                                                     |
| `GHSA-r4xp-prcw-77qf`, alta, 30 sep 2026                                                                                          | `better-auth` ≥1.5.0-beta.12 <1.7.7              | El plugin OAuth Proxy acepta un perfil falso                                          | No: exige el plugin `oAuthProxy`                                                                                                                                                            |
| `GHSA-q84f-53jg-9ppm`, alta, 28 sep 2026                                                                                          | `better-auth` ≥1.3.8-beta.3 <1.7.0-rc.3          | La aprobación de dispositivo no dice quién pide                                       | No: exige `deviceAuthorization()`; ninguna 1.6 lo arregla                                                                                                                                   |
| `GHSA-44jh-23m7-hpcf`, baja                                                                                                       | `better-auth` y `drizzle-adapter` ≥1.6.17 <1.7.7 | Ráfagas concurrentes pasan el límite guardado en PostgreSQL                           | No: el almacén es la memoria (§4.1)                                                                                                                                                         |
| `GHSA-p68q-wchp-6fh7`, alta                                                                                                       | `fastify` ≥4.0.0 <5.12.2                         | Una URL malformada llega al 404 de otro plugin encapsulado sin su `preHandler`        | No: un solo `setNotFoundHandler`, en la raíz (`app.ts` l. 351 y 386)                                                                                                                        |
| `GHSA-667r-xxjv-c9mm`, alta                                                                                                       | `fastify` <5.12.2                                | Un `$async` con `value` en el cuerpo sustituye lo validado                            | No: no hay esquemas `$async` (búsqueda en `apps/api/src`); el validador es el de Zod (`app.ts` l. 165)                                                                                      |
| `GHSA-9q9j-q6p8-xq58`, `GHSA-hwr6-493r-vm6h`, altas                                                                               | `fastify` <5.12.2                                | Esquemas de cabeceras con `dependencies` en mayúsculas; esquema `false` que no valida | No: ninguna ruta usa esquema de cabeceras ni `false` (búsqueda)                                                                                                                             |
| `GHSA-3m5p-2c4r-xxw2`, `GHSA-w2qp-rph6-63g4`, moderadas                                                                           | `fastify` <5.12.1                                | `trustProxy` numérico falsificable; coerción de primitivos en la raíz                 | El primero, no (`trustProxy: true`, no un número); el segundo no lo he comprobado ruta a ruta                                                                                               |
| `GHSA-4mh8-r7rc-xpvc`, moderada                                                                                                   | `fastify` <5.12.5                                | Caída con trailers de HTTP/2                                                          | No: el servidor es HTTP/1 (`index.ts` l. 66)                                                                                                                                                |
| 13 avisos de `fast-uri` 3.1.5 y 4.1.2; `GHSA-mrhx-c7xc-m3w5` de `zod` 4.4.3; 5 de `ip-address` 10.4.0 (por `@fastify/rate-limit`) |                                                  | Normalización de URI, memoria con colecciones grandes, análisis de IPv6               | No los he recorrido uno a uno. `fast-uri` entra por el validador AJV de Fastify y por `fast-json-stringify`, y la API usa Zod para validar y su propio serializador (`app.ts` l. 165 y 166) |

URL: `https://github.com/advisories/<id>`. **Lo que dice el brief y ya no es exacto**
(`00-encargo.md` §3): la última de `better-auth` es **1.7.26** (18 de noviembre de 2026), y existe
una rama 1.6 viva (1.6.34, 1 de noviembre) que los avisos siguen dando por afectada; `fastify` va por
**5.12.8**, y uno de sus avisos pide 5.12.5. Desde el 19 de noviembre hay más avisos de los que
cuenta el brief (los de `ip-address` y varios nuevos de `fast-uri`).

**La subida, probada** en `clon17` (`better-auth` 1.7.26 en `apps/api` y `apps/web`, `fastify` 5.12.8;
`pnpm install` resolvió `better-call` 1.4.6 y `zod` 4.6.7 dentro de ellos):

- `pnpm exec tsc -b` y el `tsc` de la web, sin errores. `vitest run apps/api apps/web/src/pages`: 69
  ficheros y 1.126 tests en verde (54 saltados, como antes).
- **Esquema**: los campos de `user`, `session`, `account` y `verification` son los mismos en las dos
  versiones; 1.7 solo añade metadatos de índices (`core/db/get-tables.mjs`, diff). Registro, entrada,
  verificación, recuperación y cambio de correo funcionan sobre nuestras tablas (medido). Las notas
  de 1.7.0 (`github.com/better-auth/better-auth/releases/tag/v1.7.0`) piden migraciones solo para
  plugins que no usamos (OAuth provider, SSO, SCIM, dispositivo); la de cuentas con `issuer` (#10403)
  no ha hecho falta con lo probado.
- **Defectos que no cambian** (leídos en 1.7.26): 7 días y 1 día de sesión, 8 a 128 de contraseña, el
  limitador solo en producción con las mismas reglas, `X-Forwarded-For` de una sola IP, los tokens de
  recuperación en claro.
- **Lo que cambia, medido**: el JWT de verificación lleva además `userId` (211 caracteres); abrir sin
  sesión el enlace de la dirección nueva ya no abre sesión, y su segundo uso da `INVALID_TOKEN`.
- **Lo que sigue igual, medido**: `verify-password` responde por HTTP; `update-user` acepta `name` e
  `image`; recuperar no cierra sesiones; dos enlaces de recuperación valen a la vez; el registro, la
  recuperación y el cambio de correo siguen esperando al envío solo en una rama (`runInBackgroundOrAwait`
  en `password.mjs` l. 82, `sign-up.mjs` l. 255 y `update-user.mjs` l. 476 y 496 de 1.7.26).
- Las notas de 1.7.7 arreglan el enlace mágico, el OAuth Proxy y la carrera del límite en
  PostgreSQL; ninguna toca recuperación, verificación, cookies ni IP.

## Lo que este mapa no ha podido comprobar

1. **Si Railway pone `NODE_ENV=production`** en el contenedor de `web`: lo dice la documentación de
   Nixpacks, no se ve con GET y no está en nuestro código. Se comprobaría con una línea de log al
   arrancar o con la pestaña de variables de Railway.
2. **Qué IP llega de verdad en producción** y si `X-Forwarded-For` trae siempre una sola: solo hay la
   prueba del orquestador, un hilo del foro de Railway y nuestro GET. Mirar `sessions.ip_address` de
   la cuenta del dueño en producción lo diría (si está vacío, la cabecera llega con más de una IP o
   `better-auth` no la acepta).
3. **La latencia real de Resend**, que decide si la diferencia de §5 se ve desde fuera: medirla exige
   mandar correo. Tampoco he medido el ruido de red entre Railway y un atacante.
4. **Cuántas réplicas tiene `web`**: con más de una, cada límite en memoria se multiplica.
5. **Qué hace un escáner de enlaces** de un buzón real con el aviso de cambio de correo (§2).
6. Los avisos de `fast-uri`, `zod`, `ip-address` y `GHSA-w2qp-rph6-63g4`, uno a uno contra nuestras
   rutas: solo he visto por dónde entran los paquetes.
