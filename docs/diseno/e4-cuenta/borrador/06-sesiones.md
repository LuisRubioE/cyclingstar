## 6. Las sesiones

Hoy una sesión dura 7 días renovados con cada uso, guarda la IP y el agente, y su token viaja al JavaScript en cada `get-session` (mapa 01 §3). Nadie la ve ni la cierra salvo de rebote al cambiar la contraseña (`00-encargo.md` §2.3, punto 2). E2 dejó a E4 por escrito alargarla (`docs/retransmision.md` l. 6693; X-22). Esta sección fija su vida, lo que se guarda, lo que llega a la web y cómo se cierra. La pantalla `Devices` se dibuja en §12.2.

### 6.1 Vida, renovación, techo y sin caché

- **30 días renovados cada día de uso**: `session.expiresIn = SESSION_EXPIRES_S` (2.592.000) y `session.updateAge = SESSION_UPDATE_AGE_S` (86.400) (D-17). Quien vuelve de dos semanas de vacaciones no teclea la contraseña en un sitio raro; 30 casa con la regla del mes de E7 y con la ausencia más larga, 28 días (DD-12), así que declarar una ausencia no alarga la sesión (O-06).
- **Techo de `SESSION_MAX_AGE_DAYS` (90) desde `created_at`**: una cookie robada no vive más de un trimestre aunque se use cada día (I-11). Se cierra en dos sitios, los dos que leen la sesión: `createCurrentUserId` (`apps/api/src/routes/context.ts` l. 53 a 58) trata una sesión de más de 90 días como ninguna y la borra, y el proxy de `get-session` responde `null` y la borra igual. `better-auth` no tiene esa opción.
- **Sin `cookieCache`** (X-13; O-10): con ella, una sesión cerrada seguiría valiendo hasta un minuto en toda la API, también la que la recuperación acaba de cerrar (`routes/context.ts` l. 53 a 58; `session.mjs` 1.7.26 l. 41 a 50). El memo de `request.viewer()` de E2, que dura una petición, se queda.
- **Las sesiones de hoy**: tienen `expires_at` a 7 días; la primera petición con más de un día de antigüedad las lleva a 30 con la opción nueva (`session.mjs` l. 205 a 210). La cuenta del dueño, si alguna sesión suya tiene más de 90 días el día del PR 3, tendrá que entrar otra vez (§19.1).

### 6.2 Qué se guarda de cada sesión

`sessions` sigue con `token`, `user_id`, `expires_at`, `created_at`, `updated_at` y `user_agent`. La IP no: `advanced.ipAddress.disableIpTracking: true` (D-18; I-07; O-20; `core17/utils/ip.mjs` l. 218) y la 0056 vacía las filas de hoy (`UPDATE sessions SET ip_address = ''`). Nadie la lee (mapa 03 §1) y los límites usan la de la petición (§7.1). El agente se queda porque `Devices` lo necesita para nombrar el aparato; no sale de la API (§6.4).

**Precondición del PR 3 (H-04).** Antes de fusionarlo, el dueño ejecuta en la consola de Postgres de Railway, solo lectura, `SELECT ip_address, created_at FROM sessions WHERE user_id = '<su id>' ORDER BY created_at DESC LIMIT 5;` y pega el resultado en el PR. Una IP pública suya confirma la lectura de `00-encargo.md` §2.2 (Railway reescribe `X-Forwarded-For` con una sola IP); vacío, o una IP de Railway, cambia la lectura de D-21 y hay que mirarla antes del PR 6.

### 6.3 `get-session` sin token

El proxy (`apps/api/src/routes/authProxy.ts`) reescribe el JSON de `GET /api/auth/get-session` y quita `session.token`, `session.ipAddress` y `session.userAgent` (D-19; I-24). La web no lee ninguno (búsqueda en `apps/web/src`, mapa 01 §3), y una XSS futura no se lleva un token reutilizable. El mismo paso del proxy aplica el techo de 90 días (§6.1); la visita la apunta el gancho `after` de `get-session` (§10.6).

### 6.4 `GET /api/me/devices`

Sustituye a `list-sessions`, que da 404 (§8.1). Llama a `auth.api.listSessions` desde el servidor y devuelve, ordenadas por `updated_at` descendente:

```ts
// apps/api/src/routes/me.ts (respuesta) y apps/web/src/api/devices.ts (lectura)
export interface DeviceRow {
  /** 16 caracteres hex del SHA-256 del token: identifica la fila y no sirve como cookie. */
  id: string
  /** deviceLabel(userAgent), calculado en la API. */
  label: string
  /** La sesión de esta petición. */
  current: boolean
  /** sessions.created_at, ISO 8601 UTC. */
  createdAt: string
  /** sessions.updated_at, ISO 8601 UTC. */
  lastActiveAt: string
}

export const deviceRowSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{16}$/),
  label: z.string().min(1).max(60),
  current: z.boolean(),
  createdAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
})

export const devicesResponseSchema = z.object({
  ok: z.literal(true),
  devices: z.array(deviceRowSchema),
})
```

Sin IP ni agente crudo (DD-06 A): a casi nadie le dice nada una IP, y un país pediría geolocalizar cada sesión. `deviceLabel(userAgent)` (`packages/shared/src/account/deviceLabel.ts`) es una función pura que devuelve `<navegador> on <sistema>`, y `Unknown browser` si no reconoce nada. Sus doce casos de `deviceLabel.test.ts`, con el agente recortado a lo que decide:

| #   | Agente (lo que decide)                                          | `label`                       |
| --- | --------------------------------------------------------------- | ----------------------------- |
| 1   | `Linux; Android 15` … `Chrome/131`                              | `Chrome on Android`           |
| 2   | `Linux; Android 15` … `SamsungBrowser/27`                       | `Samsung Internet on Android` |
| 3   | `Linux; Android 15` … `Firefox/133`                             | `Firefox on Android`          |
| 4   | `iPhone; CPU iPhone OS 26_1` … `Version/26.1 Mobile` … `Safari` | `Safari on iPhone`            |
| 5   | `iPhone` … `CriOS/131`                                          | `Chrome on iPhone`            |
| 6   | `iPhone` … `FxiOS/133`                                          | `Firefox on iPhone`           |
| 7   | `iPad; CPU OS 26_1` … `Safari`                                  | `Safari on iPad`              |
| 8   | `Windows NT 10.0` … `Chrome/131` … `Edg/131`                    | `Edge on Windows`             |
| 9   | `Windows NT 10.0` … `Firefox/133`                               | `Firefox on Windows`          |
| 10  | `Macintosh; Intel Mac OS X 10_15_7` … `Chrome/131`              | `Chrome on Mac`               |
| 11  | `Macintosh` … `Version/26.1 Safari`                             | `Safari on Mac`               |
| 12  | vacío, o `curl/8.5.0`                                           | `Unknown browser`             |

El orden de las comprobaciones importa y el test lo fija: `Edg/` antes que `Chrome/`, `SamsungBrowser/`, `CriOS/` y `FxiOS/` antes que `Safari`, `iPad` antes que `Mac` (un iPad moderno puede anunciarse como `Macintosh`; entonces sale `Safari on Mac`, y se acepta).

### 6.5 Cerrar una sesión y las otras

- **`DELETE /api/me/devices/:id`**: busca entre las sesiones del usuario la de ese id; si no hay, 404 `no_encontrado`; si es la propia, 409 `usa_sign_out` (la propia se cierra con `Sign out`). Borra antes las filas de `push_targets` con ese `session_id` (I-25) y después la sesión con `auth.api.revokeSession`. Sin confirmación: se deshace entrando (D-20). Responde `{ ok: true }`.
- **`POST /api/me/devices/sign-out-others`**: borra los `push_targets` de las otras sesiones, llama a `auth.api.revokeOtherSessions`, sube `users.device_epoch` en uno y reemite la `cs_device` de este navegador con el epoch nuevo (§7.5). Responde `{ ok: true, closed: <número> }`. Lleva confirmación en la pantalla (§12.2).
- Sin `cookieCache`, el otro aparato se entera en su siguiente petición: la pantalla no promete «hasta un minuto».
- **`Sign out`** del propio navegador borra antes su `push_target` (con `cs.pushTargetId`, `DELETE /api/me/push-targets/:id`) y después llama a `sign-out` (D-49). La `cs_device` sobrevive (D-23) y `cs_viewer` se borra como hoy (`authProxy.ts` l. 18 a 21 y 52 a 54).
- **La caducidad** no borra suscripciones: el ausente que no entra es quien necesita `away_warning` (I-25; §13).

### 6.6 `cs_viewer`, sin cambio

90 días (`packages/shared/src/broadcast/constants.ts` l. 209), solo restringe y nunca abre una ruta privada (`viewerCookie.ts` l. 5 a 21). Cerrar otra sesión no necesita borrarla y no sirve como aparato conocido (X-07): solo se emite en rutas de E2 con sesión y `sign-out` la borra. Es de E2 y de W5; E4 no la toca.

---

**Injertos aplicados.** I-07 (§6.2: `disableIpTracking`), I-11 (§6.1), I-24 (§6.3), I-25 (§6.5).

**Objeciones resueltas.** O-06 (§6.1: la ausencia no alarga la sesión), O-10 (§6.1), O-20 (§6.2).

**Huecos rellenados.** H-04 (§6.2).

**Decisiones de esta sección.**

- **6-a**, el techo de 90 días borra la sesión al detectarlo, en `createCurrentUserId` y en el proxy de `get-session`.
- **6-b**, `DELETE /api/me/devices/:id` sobre la sesión propia responde 409 `usa_sign_out`.
- **6-c**, `POST /api/me/devices/sign-out-others` devuelve `closed` con el número de sesiones cerradas, para el `Notice` de §12.2.
- **6-d**, los doce agentes de `deviceLabel.test.ts` son los de la tabla de §6.4, y un iPad que se anuncia como Mac sale `Safari on Mac`.
- **6-e**, el SQL de la precondición del PR 3 es el de §6.2, de solo lectura.

**Propuesto para el glosario.**

- `deviceRowSchema`, `devicesResponseSchema` (`apps/api/src/routes/me.ts`); `apps/web/src/api/devices.ts`.
- 409 `usa_sign_out`; la respuesta `{ ok: true, closed }` de `POST /api/me/devices/sign-out-others`.
