## 7. Los límites de intento

Hoy hay dos capas y ninguna mira la cuenta (§1.2): tras más de 40 fallos contra un correo desde varias IP, la contraseña buena entra a la primera (mapa 01 §4.2, serie H). Esta sección fija qué IP vale, qué capas quedan, la tabla por cuenta con su reserva, las seis reglas con su cifra, la cookie de aparato que impide que un tercero cierre la cuenta del dueño y el presupuesto de correo. Lo que ve quien choca está en §12.3.

### 7.1 Qué IP vale

- **Fastify**: `trustProxy` pasa de `true` (`app.ts` l. 160) a `(addr, hop) => hop === 0` (D-21; I-08; O-13). Con `true`, `request.ip` es la primera dirección de `X-Forwarded-For`, la que escribe el cliente si el borde añade en lugar de reescribir; con la función es la última, la que pone el borde. `trustProxy: 1` está prohibido: desde 5.12.1 da siempre la del socket, que es Railway (X-02; medido en `fastify` 5.12.8, `lib/request.js` l. 53 a 57; codigo C2 y C3). Un comentario en `app.ts` y un test lo dicen.
- **`clientIp(request)`** (`apps/api/src/clientIp.ts`): ni `true` ni la función validan (`'basura'` sale como IP, X-02). `clientIp` devuelve `request.ip` si `net.isIP` la acepta y `X-Forwarded-For` trae una o dos entradas; si no es una IP, o la cabecera trae más de dos, registra `xff_varias` (como mucho una vez por hora y proceso, sin la IP) y devuelve la del socket. `xff_varias` es una de las cifras que se miran (D-60; §19.4).
- **`better-auth` deja de usar la IP**: su limitador se apaga (§7.2) y `disableIpTracking` deja de guardarla (§6.2). Así deja de importar si Railway pone `NODE_ENV=production` (mapa 01 §4.3).
- **Las réplicas (H-03)**: el límite de Fastify vive en memoria y se multiplica por cada réplica de `web`. Antes del PR 6 el dueño mira en Railway cuántas hay y se escribe en `docs/ops.md`; con más de una, esa capa se lee «por réplica». La capa por cuenta vive en Postgres y no depende de ellas.

### 7.2 Las tres capas

1. **Fastify por IP, sin cambio**: 300 por minuto en todo, 60 por minuto en el resto de `/api/auth/*`, 10 cada 5 minutos por IP y por ruta en las de credenciales (`security.ts` l. 10, 36, 43 y 54 a 68). `CREDENTIAL_AUTH_PATHS` pierde `/api/auth/change-email` (§5.5) y se queda en siete. El 429 gana `message` y `retryAfterS` en `errorResponseBuilder` (`app.ts` l. 213 a 217; D-25).
2. **El limitador de `better-auth`, apagado por escrito**: `rateLimit: { enabled: false }`. Sin cabecera de IP o con dos mete a todo el mundo en un cubo de 3 cada 10 s por ruta (mapa 01 §4.2, serie E), y su clave sigue siendo `<ip>|<ruta>`: no ve el correo ni el resultado. Su almacén `database` tampoco lo arregla (la carrera de `GHSA-44jh-23m7-hpcf`, mapa 01 §8).
3. **`auth_limits`, nuestra, en Postgres**: sobrevive al despliegue, ve la cuenta y reserva antes de comprobar (§7.3).

### 7.3 `auth_limits`

Tabla con clave primaria (D-22; I-12; X-01): `key text primary key`, `window_start timestamptz`, `count integer`, `day_start timestamptz`, `day_count integer`, `locked_until timestamptz` nula. Las claves llevan un prefijo y el HMAC-SHA256 de su valor con una clave derivada de `SESSION_SECRET` (`HKDF` con la etiqueta `cs-auth-limits`): `acct:<hmac del correo normalizado>`, `dev:<hmac del nonce de cs_device>`, `pw:<hmac del id de usuario>`, `mailip:<hmac de la IP>` y `exp:<hmac del id de usuario>`. La tabla no guarda un correo, ni siquiera los que no existen: un SHA-256 sin secreto se invierte con un diccionario de correos (seguridad §2). El correo se normaliza con `trim` y minúsculas.

**La reserva.** El proxy llama a `reserveAttempt` **antes** de reenviar a `better-auth`, y `clearAttempts` al ver el 200 (H-01; O-14). Medido por el juez de código con una ráfaga de 40 peticiones a la vez y un límite de 10: contando después, 39 × 401 y la buena entra; reservando antes, 10 × 401 y 30 × 429 (`rafaga.json` y `reserva.json`).

```ts
// packages/db/src/authLimits.ts
export interface AttemptRule {
  /** Ventana corta, en segundos, y su máximo. */
  windowS: number
  max: number
  /** Máximo en 24 horas, o null si no hay. */
  dayMax: number | null
  /** Cuánto queda cerrado al pasarse, en segundos. */
  lockS: number
}

export type AttemptResult = { allowed: true } | { allowed: false; retryAfterS: number }

export async function reserveAttempt(
  db: Database,
  key: string,
  rule: AttemptRule,
  now: Date,
): Promise<AttemptResult>
export async function clearAttempts(db: Database, keys: readonly string[]): Promise<void>
```

```sql
-- reserveAttempt: suma el intento salvo que la clave esté cerrada. $1 key, $2 now, $3 windowS.
INSERT INTO auth_limits AS a (key, window_start, count, day_start, day_count, locked_until)
VALUES ($1, $2, 1, $2, 1, NULL)
ON CONFLICT (key) DO UPDATE SET
  window_start = CASE WHEN a.locked_until > $2 THEN a.window_start
                      WHEN a.window_start <= $2 - make_interval(secs => $3) THEN $2
                      ELSE a.window_start END,
  count        = CASE WHEN a.locked_until > $2 THEN a.count
                      WHEN a.window_start <= $2 - make_interval(secs => $3) THEN 1
                      ELSE a.count + 1 END,
  day_start    = CASE WHEN a.locked_until > $2 THEN a.day_start
                      WHEN a.day_start <= $2 - interval '1 day' THEN $2
                      ELSE a.day_start END,
  day_count    = CASE WHEN a.locked_until > $2 THEN a.day_count
                      WHEN a.day_start <= $2 - interval '1 day' THEN 1
                      ELSE a.day_count + 1 END
RETURNING count, day_count, locked_until;

-- Si locked_until > now: { allowed: false, retryAfterS: ceil(locked_until - now) }.
-- Si count > max o day_count > dayMax: se cierra y se niega.
-- $4 lockS.
UPDATE auth_limits SET locked_until = $2 + make_interval(secs => $4) WHERE key = $1 AND (locked_until IS NULL OR locked_until <= $2);

-- clearAttempts
DELETE FROM auth_limits WHERE key = ANY($1);
```

Un intento negado no suma: mientras la clave está cerrada, el `CASE` deja los contadores como estaban, y el atacante no alarga el cierre a golpes. La purga diaria borra las filas con `window_start` y `day_start` de más de `AUTH_LIMITS_RETENTION_DAYS` (2) días (`packages/db/src/purge.ts`; §9.5).

### 7.4 Las reglas

| Regla                      | Clave                      | Cifra y ventana                                                | Qué cuenta                                                                                                                             | Al pasarse                                                                                                  |
| -------------------------- | -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| L1 entrar, por cuenta      | `acct:`                    | `ACCOUNT_FAILS`: 10 en 900 s, cierre de 900 s, sin tope diario | cada `sign-in/email` de un navegador **sin** `cs_device` válida para ese correo, exista o no la cuenta; se borra al 200 y al recuperar | 429 `ACCOUNT_LOCKED` a todo navegador sin `cs_device` válida; los que la traen siguen por L2                |
| L2 entrar, por aparato     | `dev:`                     | `DEVICE_FAILS`: 10 en 900 s y 30 en 86.400 s                   | cada `sign-in/email` con una `cs_device` válida para ese correo; se borra al 200                                                       | esa cookie deja de contar como aparato conocido mientras dure el cierre, y el intento pasa por L1           |
| L3 contraseña con sesión   | `pw:`                      | `SESSION_PASSWORD_FAILS`: 5 en 900 s y 10 en 86.400 s          | `change-password`, `delete-user` y `POST /api/me/export`; se borra al 200                                                              | 429 `PASSWORD_ATTEMPTS_LOCKED`; al décimo del día, el proxy cierra **esa** sesión y la web lleva a `/login` |
| L4 rutas de correo, por IP | `mailip:`                  | `MAIL_ROUTES_PER_IP_DAY`: 20 en 86.400 s                       | cada `sign-up/email`, `request-password-reset` y `send-verification-email`, salga o no correo                                          | 429 de la misma forma que Fastify                                                                           |
| L5 por destinatario        | `email_log.recipient_hash` | `MAIL_PER_RECIPIENT_HOUR`: 3 por hora, sin tope diario         | cada envío a ese buzón                                                                                                                 | no se envía y la respuesta no cambia                                                                        |
| L6 el presupuesto          | `email_log` del día UTC    | `MAIL_DAILY_BUDGET` y `MAIL_RESET_RESERVE` (§7.6)              | cada envío                                                                                                                             | §7.6                                                                                                        |
| Exportar                   | `exp:`                     | `EXPORTS_PER_DAY`: 3 en 86.400 s                               | cada exportación servida                                                                                                               | 429 con su espera                                                                                           |

L1 cuenta igual con un correo que no existe: el 429 no delata cuentas (`accountLimit.test.ts`). L1 no tiene tope diario porque un tope diario sería un día entero sin entrar para el dueño en un navegador nuevo (seguridad O-01). L5 no tiene tope diario porque con dos correos y 3 por hora un buzón ajeno recibe como mucho 72 al día solo si alguien gasta 72 peticiones de L4, que son cuatro IP enteras (20 por IP). L3 deja de contar `change-email`, que ya no existe; D-38 lo pone «en el after» para `delete-user`, y aquí se lee como el resto: se reserva en el proxy antes de reenviar y se borra al 200 (el `after` ve el 400 `INVALID_PASSWORD`, X-23, pero contar después deja pasar una ráfaga, X-01).

### 7.5 `cs_device`: cómo no se cierra la cuenta de otro

**Formato** (D-23; §G.8): una cookie `cs_device` con hasta `DEVICE_COOKIE_MAX_ACCOUNTS` (5) entradas separadas por `~`, cada una `v1.<hmac del correo, 32>.<nonce, 16>.<firma, 43>`. El HMAC del correo va en base64url recortado a 32 caracteres; el nonce, 12 bytes aleatorios en base64url; la firma, HMAC-SHA256 en base64url de `v1.<hmac>.<nonce>.<device_epoch>` con una clave derivada de `SESSION_SECRET` (etiqueta `cs-device`). El `device_epoch` no viaja: se lee de `users` al comprobar, y subirlo invalida todas las entradas de esa cuenta. `HttpOnly`, `SameSite=Lax`, `Secure` en https, `Path=/api/auth`, `Max-Age` de `DEVICE_COOKIE_DAYS` (180). Cinco entradas son unos 490 bytes (calculado).

**Emisión** (`apps/api/src/deviceCookie.ts`, `issue` y `read`): al ver el 200 de `sign-in/email` el proxy añade o renueva la entrada de ese correo; al ver el 200 de `reset-password`, la del correo de `resetRequests` (§5.4); al cerrar las otras sesiones, la del propio correo con el epoch nuevo (§6.5). La sexta cuenta saca a la más vieja. Sobrevive a `Sign out` (por eso la nombra Privacy, §10.1) y muere con su `Max-Age` o al subir el epoch.

**Cómo protege.** L1 solo cierra a los navegadores sin entrada válida para ese correo (principio 5). Quien reparte intentos entre mil IP cierra los navegadores nuevos, no el teléfono del jugador. Si el dueño está en un navegador nuevo, el 429 le ofrece `reset your password`, y recuperar le da la cookie (I-03). La carrera está medida: sin la cookie, tras recuperar, 10 fallos más del atacante y la contraseña nueva desde un aparato nuevo da 429 (seguridad C4, `peticion.json`; X-06); con ella, entra. Una `cs_device` robada sirve como mucho para L2: 10 intentos en 15 minutos y 30 al día (O-15).

**El aviso de entrada nueva.** Una entrada buena (200 de `sign-in/email`) desde un navegador sin entrada válida para ese correo encola el aviso `new_sign_in` a las suscripciones de esa cuenta, como mucho uno cada `NEW_SIGN_IN_EVERY_H` (1) hora por cuenta (DD-16, por push y nunca por correo: `00-encargo.md` §9.2, punto 9). No hay interruptor (DD-16 A). El gemelo en la web es la fila nueva en `Devices`.

### 7.6 El presupuesto y sus prioridades

`MAIL_DAILY_BUDGET` es una variable de entorno (`apps/api/src/env.ts`), 90 con el plan gratuito de Resend, que da 100 al día y 3.000 al mes (mapa 02 §3); el dueño se queda en el gratuito y abre el registro por tandas (DD-10 B, `00-encargo.md` l. 378). 90 al día son como mucho 2.790 en un mes de 31 días: por debajo de los 3.000 (calculado). `MAIL_RESET_RESERVE` (30) queda para `reset_password` de cuentas confirmadas: `verify_signup` deja de salir cuando el día UTC lleva 60 envíos, y `reset_password` cuando lleva 90 (D-26).

Lo que ve el jugador: si el día va por 60, `sign-up/email` y `send-verification-email` responden 503 `MAIL_BUDGET_EXHAUSTED` antes de llegar a `better-auth`, y `Register` y `CheckInbox` dicen `We can't send emails right now. Try again tomorrow.` (pantalla). Si va por 90, también `request-password-reset`. Es un estado global, el mismo para cualquier correo: no delata cuentas. `sign-in/email` de una cuenta sin confirmar con la contraseña buena sigue dando el 403, sin enviar; `Login` dice entonces `Confirm your email first` / `We can't send a new link right now. Try again tomorrow.` Con DD-10 B no hay correos de baja prioridad que cortar al 70 %: el umbral `MAIL_LOW_PRIORITY_CUTOFF` desaparece, y el 70 % se queda como alarma (§19.4).

Con A6 delante (10 IP, §2.4), L4 deja 200 peticiones de correo al día y el presupuesto de 60 para registros se agota igual; las 30 de reserva siguen sirviendo a quien recupera. Es el precio de DD-10 B, escrito por el veredicto: «un atacante con cinco IP puede agotar el día».

### 7.7 Contraseñas filtradas: no

El dueño eligió no comprobarlas (DD-11 C): «no entraría ahí... Si alguien quiere usar una pass comprometida aqui pues allá el» (`00-encargo.md` l. 383 a 384). No hay `hashPasswordWithHibp` ni `HIBP_TIMEOUT_MS`, ni consulta a `api.pwnedpasswords.com`, ni línea en Privacy. Lo que deja (§2.3): A1 con una contraseña buena no tiene freno propio; le quedan L1 si falla, y el aviso `new_sign_in` si acierta.

### 7.8 Lo que ve quien choca

Los textos y la cuenta atrás están en la tabla de `authErrorText` (§12.3). Lo que fija esta sección: todo 429 lleva `retryAfterS` en el cuerpo y `retry-after` en la cabecera; `ACCOUNT_LOCKED` y `PASSWORD_ATTEMPTS_LOCKED` son los únicos códigos nuevos de límite; un 503 `MAIL_BUDGET_EXHAUSTED` no lleva espera.

---

**Injertos aplicados.** I-03 (§7.5), I-07 (§7.2: `rateLimit: { enabled: false }`), I-08 (§7.1), I-12 (§7.3), I-13 (§7.4 y §7.6, sin el corte al 70 %, que no tiene qué cortar), I-23 no aplicado: es la comprobación de contraseñas filtradas y el dueño eligió no hacerla (DD-11 C, §7.7).

**Objeciones resueltas.** O-04 (§7.4 y §7.6: L5 y presupuesto para los dos correos), O-13 (§7.1), O-14 (§7.3), O-15 (§7.3 y §7.5), O-16 (§7.5).

**Huecos rellenados.** H-01 (§7.3), H-03 (§7.1), H-05 (§7.7: cerrado sin espera porque no hay consulta).

**Decisiones de esta sección.**

- **7-a**, la clave HMAC se deriva de `SESSION_SECRET` con HKDF y una etiqueta por uso (`cs-auth-limits`, `cs-device`).
- **7-b**, exportar cuenta en `auth_limits` con la clave `exp:`; L3 y `exp:` son contadores distintos.
- **7-c**, L3 se reserva antes en el proxy también en `delete-user`; el «after» de D-38 se lee como el borrado del contador al 200.
- **7-d**, un intento negado no suma (el `CASE` con `locked_until`).
- **7-e**, `cs_device` lleva `Path=/api/auth`, nonce de 12 bytes y entradas separadas por `~`; la sexta cuenta saca a la más vieja.
- **7-f**, con DD-10 B: `MAIL_DAILY_BUDGET` 90, `verify_signup` hasta 60 y `reset_password` hasta 90; `MAIL_LOW_PRIORITY_CUTOFF` desaparece; `Login` tiene su texto con el presupuesto agotado.
- **7-g**, `new_sign_in` se encola desde el proxy al 200 de `sign-in/email` sin `cs_device` válida, uno por hora y cuenta, solo por push.

**Propuesto para el glosario.**

- Códigos: 429 `ACCOUNT_LOCKED`, 429 `PASSWORD_ATTEMPTS_LOCKED`, 503 `MAIL_BUDGET_EXHAUSTED`. Clave `exp:` en `auth_limits`.
- `AttemptRule`, `AttemptResult` (`packages/db/src/authLimits.ts`).
- Texto (pantalla): `We can't send a new link right now. Try again tomorrow.`
- Fuera de §G.6: `HIBP_TIMEOUT_MS`, `MAIL_LOW_PRIORITY_CUTOFF`. Fuera de §G.7: `hashPasswordWithHibp`. Fuera de §G.13: `hibp.test.ts`. Fuera de §G.14: el PR 10 `filtradas`.
- `CREDENTIAL_AUTH_PATHS` queda en siete rutas.
