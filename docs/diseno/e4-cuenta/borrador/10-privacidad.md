## 10. Privacidad y datos

`Privacy.tsx` dice hoy cuatro cosas falsas (mapa 03 §5): que solo se guardan el correo, la contraseña y el juego (l. 19 a 20), que la IP no se guarda (l. 27), que solo hay una cookie de sesión (l. 33) y que basta pedir el borrado (l. 38), cuando no hay a quién pedirlo. Esta sección escribe el texto nuevo entero, dice de dónde sale cada frase y qué PR la hace verdad, y fija los logs, el borrado, la exportación y la última visita. Lo legal (responsable del tratamiento, base legal, si el texto basta) es a confirmar con un abogado (§21.3).

### 10.1 El texto entero de `Privacy.tsx` (pantalla)

Con DD-08 A: todo a la vista, un `Panel` por apartado, el primero con `answer` como hoy (`Privacy.tsx` l. 17). `<date>` es la fecha del PR que lo cambia por última vez; `<N>` se explica abajo.

```
Privacy
Last updated <date>. Cycling Star is a personal, non-commercial project run by one person.

What we keep about you
- Your email address, and your password stored as a one-way hash (we can't read it).
- Whether an administrator has approved your account, and when.
- Your date of birth, only to check you're 16 or over, and the version of the terms you accepted. Nobody else sees them.
- The language your browser asked for when you signed up and, if you turn on notifications, its time zone, so notices don't arrive at night.
- Your rider, your team and everything you do in the game: training, plans, the races you follow and how far you've watched them, your settings, and when you're away.
- When you last visited, so the game knows if you've been away.
- For each device you're signed in on: the browser and system it reported, and when you signed in and last used it.
- If you turn on notifications: an address from your browser's push service for each device.
- A record of each email we send you and whether it was delivered, without your address.

Your IP address
Your IP address is not saved with your account. When you create a rider we may ask a public service (ipinfo.io, ipwho.is or ipapi.co) for your country to pre-select a flag; our server keeps the answer in memory for a few hours. Our hosting provider keeps server logs with your full IP address for <N> days, to investigate attacks. Links from our emails are removed from our server logs.

Cookies and storage
- A session cookie keeps you signed in: 30 days, renewed while you play, never more than 90.
- A device cookie remembers that this browser has signed in to your account, so a stranger's wrong guesses can't lock you out: 180 days, kept after you sign out.
- A viewer cookie keeps results hidden until you watch them: 90 days.
- Your browser also stores your theme and a few display choices.
No third-party tracking or advertising cookies.

Emails and notifications
We send two kinds of email: a link to confirm your address and a link to reset your password. We never send game news by email.
If you turn on notifications, your browser's push service delivers them without being able to read them. Notices about your account's security, such as a new sign-in or a changed password, only reach you this way.

Who else handles your data
Railway hosts the game, its database and its logs. Resend delivers our two emails. Google, Mozilla, Apple or Microsoft deliver notifications, depending on your browser.

Who can change your account
An administrator approves new accounts, can change the email and the date of birth of your account, and can rename your team. Every change an administrator makes is recorded.

Your data, your choice
- Download a copy of everything we keep about you: Account, Your data.
- Delete your account: Account, Delete account. Your email, password, sessions, devices and settings are deleted at once. Your rider and your team stay in the world, run by the game, and your team keeps its name. Backups keep a copy for up to 14 days.

We don't offer a contact channel yet.
This notice will be reviewed against applicable law before public launch.
```

**`<N>`**: cuánto guarda Railway los logs, **no lo sé** (mapa 03 §4). Se rellena con lo que diga el panel de Railway en el PR 4; si no se sabe, el PR no se fusiona. **Los 14 días** de copias son los 14 volcados de `scripts/backup.sh` (`docs/ops.md` l. 15) si su cron (l. 24) está puesto, que tampoco sé: el dueño lo comprueba antes del PR 12, y si no corre, la frase pasa a `Backups are not kept.` o se pone el cron. `respaldo_mundo_1` (l. 313) no rueda: guarda el mundo anterior al reinicio, sin cuentas creadas después.

### 10.2 De dónde sale cada frase y qué PR la hace verdad

El PR 3 sustituye el texto de hoy por el de §10.1 **sin** las frases que aún no son verdad; cada PR siguiente añade la suya, y `privacy.test.ts` comprueba que cada frase está y que las retiradas no vuelven (D-36; principio 8).

| Frase (resumida)                                                         | Lo que la hace verdad                                                                          | PR    |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----- |
| correo y contraseña con hash                                             | `accounts.password` con scrypt (mapa 03 §1); hoy dice `encrypted`                              | 3     |
| fecha de nacimiento y versión de las condiciones                         | `users.birth_date`, `terms_version` (§4.3)                                                     | 9     |
| lengua del navegador; zona horaria con avisos                            | `users.locale` al registrarse (§4.7); `users.time_zone` con `POST /api/me/push-targets` (D-43) | 9, 14 |
| el juego, lo seguido y lo visto, ajustes, ausencia                       | `riders`, `race_watch`, `users.theme`, `spoiler_scope`, `away_since`                           | 3, 13 |
| última visita                                                            | `users.last_seen_at` en toda visita (§10.6)                                                    | 12    |
| por aparato: navegador, sistema y fechas                                 | `sessions.user_agent`, `created_at`, `updated_at`; `Devices` (§6.4)                            | 3, 11 |
| dirección del servicio de push                                           | `push_targets.credential`                                                                      | 14    |
| registro de correos sin la dirección                                     | `email_log.recipient_hash` (§9.2)                                                              | 7     |
| la IP no se guarda con la cuenta                                         | `disableIpTracking` (§6.2); la 0056 vacía las filas                                            | 3, 6  |
| país por la IP, en memoria                                               | `geoIp.ts` l. 62 a 113; el orden real es ipinfo.io, ipwho.is, ipapi.co                         | 3     |
| logs con la IP entera `<N>` días, sin enlaces                            | `redactUrl` (§10.3); `<N>` del panel de Railway                                                | 4     |
| cookie de sesión de 30 días, nunca más de 90                             | `SESSION_EXPIRES_S`, `SESSION_MAX_AGE_DAYS` (§6.1)                                             | 3     |
| cookie de aparato de 180 días                                            | `cs_device` (§7.5)                                                                             | 6     |
| cookie del espectador de 90 días                                         | `cs_viewer` (E2); hoy Privacy la calla                                                         | 3     |
| tema y preferencias en el navegador                                      | `cs-theme` y las claves de `localStorage` de mapa 03 §4                                        | 3     |
| dos correos, ningún correo de juego                                      | §5.7; D-00c                                                                                    | 8     |
| avisos y avisos de seguridad solo por push                               | §5.4, §7.5, §13                                                                                | 14    |
| Railway, Resend y los servicios de push                                  | `docs/ops.md`; `mailer.ts` l. 45; §13                                                          | 3, 14 |
| cuenta aprobada y cuándo                                                 | `users.status`, `users.approved_at` (§4.9)                                                     | 5     |
| un administrador aprueba, cambia correo, fecha y equipo, y queda escrito | `admin_audit` y las rutas de §8.5                                                              | 5     |
| exportar                                                                 | `POST /api/me/export` (§10.5)                                                                  | 12    |
| borrar de una vez; el equipo conserva su nombre                          | `deleteAccount` (§10.4); DD-14 B                                                               | 12    |
| copias de 14 días                                                        | `scripts/backup.sh` y su cron                                                                  | 12    |
| sin canal de contacto                                                    | D-00b; se retira `Ask and…` (§11.2)                                                            | 3     |

### 10.3 Los logs y `redactUrl`

Hoy cada línea `incoming request` lleva la URL entera: el JWT de verificación con el correo descodificable, el token de recuperación en `/reset-password/<token>`, `callbackURL` y `remoteAddress` (mapa 03 §4, medido). Con E4 (D-37):

- `serializers.req` en el logger de `index.ts` (l. 64) escribe `method`, `url: redactUrl(url)` y `remoteAddress`.
- `redactUrl` (`apps/api/src/redact.ts`) cambia por `[redacted]` el valor de los parámetros `token`, `callbackURL` y de cualquier parámetro cuyo nombre contenga `email`, y el segmento que sigue a `/reset-password/`. El fragmento `#token=` no llega al servidor (§5.2); `redactUrl` cubre el enlace viejo y el botón de `VerifyEmail`, que sí lleva el token en la consulta.
- La IP se queda entera en los logs: es lo que permite investigar A1 y A6, y Privacy lo dice.
- `redact.test.ts` recorre el registro, la confirmación, la recuperación con el enlace nuevo y con el viejo, y exige que ninguna línea contenga `eyJ` ni una arroba.

### 10.4 Borrar

`POST /api/auth/delete-user` con `{ password }`, como hoy, con su gancho `before` que exige la contraseña (`auth.ts` l. 180 a 192). Lo que cambia (D-38; I-10; O-25):

- `user.deleteUser.beforeDelete` llama a `deleteAccount(db, userId)` (`packages/db/src/adminUsers.ts`), que en **una transacción** suelta corredor y equipo (`releaseUserToWorld`), borra las filas de `verifications` con `value` = id, vacía `from` y `to` de las filas `user.email` de `admin_audit` de esa cuenta y borra la fila de `users`. Caen en cascada `sessions`, `accounts`, `race_watch`, `push_targets` y `notice_log`; `email_log.user_id` pasa a nulo. `deleteUserAsAdmin` (l. 169 a 175) pasa a llamar a la misma función. Medido por `incremental`: el gancho deja 200 `{ success: true }` y cero filas de `users`, `sessions` y `accounts`, en una transacción y sin ruta propia.
- **El equipo conserva el nombre que puso el jugador** (DD-14 B): «dejamos el que puso, pero un admin o moderador podria modificarlo siempre (especialmente si es algo inapropiado)» (`00-encargo.md` l. 379 a 380). Un administrador lo cambia con `PATCH /api/admin/teams/:id` (§8.5). Si el nombre de un equipo es dato personal, a confirmar con un abogado.
- L3 cuenta la contraseña mala (§7.4).
- **No sale ningún correo** (`00-encargo.md` §9.3). El proxy, al ver el 200, quita de `cs_device` la entrada de ese correo y borra `cs_viewer` como hoy.
- La web, antes de `Delete my account for good`, ofrece `Want a copy first?` / `Download my data`; al terminar guarda `cs.accountDeleted` en `sessionStorage` y recarga en `/`, que enseña una vez el `Notice` `good` (pantalla) `Your account is deleted` / `Thanks for playing.` Hoy la portada no dice nada (mapa 05, captura 65).

**Lo que queda después** (mapa 03 §3, medido): la fila del corredor con su nombre, que generó el juego; el equipo con el nombre que puso la persona y el maillot que eligió (`team_kits`, `set_by = 'manager'`); el plan, la bitácora, las transacciones y el contrato; el id en `respaldo_mundo_1` si la cuenta es anterior al reinicio, y en `admin_audit` sin correos; `email_log` sin `user_id`, con el HMAC del correo, hasta 90 días; `auth_limits` con claves HMAC, hasta 2 días; las copias, hasta 14 días; los logs de Railway, `<N>` días; y lo que guarde Resend de los correos enviados, que no lo sé.

### 10.5 Exportar

`POST /api/me/export` con `{ password }` (D-39; I-22; O-24). El proxy reserva L3 (`pw:`), comprueba la contraseña con `auth.api.verifyPassword` desde el servidor (donde `scope: "server"` sí vale), y con la contraseña buena borra L3 y reserva `exp:` (`EXPORTS_PER_DAY`, 3 al día). Responde `200` con `Content-Type: application/json`, `Content-Disposition: attachment; filename="cycling-star-<YYYY-MM-DD>.json"` y `Cache-Control: no-store`. Contraseña mala: 400 `INVALID_PASSWORD`, con el texto de §12.3.

```ts
// apps/api/src/routes/me.ts
import type { InferSelectModel } from 'drizzle-orm'
import type {
  contracts,
  raceWatch,
  riderDailyLog,
  riders,
  teams,
  trainingPlans,
  transactions,
  users,
} from '@cyclingstar/db'
// DeviceRow está en este mismo fichero (§6.4).

type UserRow = InferSelectModel<typeof users>

export interface AccountExport {
  exportedAt: string
  /** La fila de users sin lo interno ni lo que no es suyo. */
  account: Omit<UserRow, 'passwordHash' | 'isAdmin' | 'deviceEpoch' | 'name' | 'image'>
  devices: DeviceRow[]
  /** Aparatos con avisos, sin la dirección ni las claves del servicio de push. `[]` fijo hasta el PR 14, que crea `push_targets` (10-g). */
  notificationDevices: {
    id: string
    channel: 'webpush' | 'fcm' | 'apns'
    label: string
    createdAt: string
    lastOkAt: string | null
  }[]
  racesFollowed: InferSelectModel<typeof raceWatch>[]
  rider: {
    rider: InferSelectModel<typeof riders>
    plans: InferSelectModel<typeof trainingPlans>[]
    log: InferSelectModel<typeof riderDailyLog>[]
    transactions: InferSelectModel<typeof transactions>[]
    contract: InferSelectModel<typeof contracts> | null
  } | null
  /** Solo si el equipo es suyo. */
  team: InferSelectModel<typeof teams> | null
  emails: { kind: 'verify_signup' | 'reset_password'; status: string; createdAt: string }[]
}
```

No lleva la contraseña ni su hash, los tokens de sesión, la IP (no se guarda), las claves de `auth_limits` ni el contenido de `admin_audit`. El PR 12 depende del 7, que crea `email_log` (§18.2); `notificationDevices` entra en el tipo con el PR 12 como `[]` fijo y con un `it.todo` en `exportData.test.ts`, y el PR 14 lo llena (10-g). `exportData.test.ts` exporta una cuenta con todo y comprueba que el fichero no contiene el token de sesión, el hash ni el `credential` de un aparato. Si basta para el derecho de acceso, a confirmar con un abogado.

### 10.6 `last_seen_at` en toda visita

Hoy solo la escriben las rutas que resuelven el espectador de E2 (`spoiler.ts` l. 273 a 276): entrar o crear el corredor no la tocan (mapa 03 §6, medido). Con E4, un gancho `hooks.after` de `better-auth` con `ctx.path === '/get-session'` y sesión llama a `touchLastSeen(db, userId)` (`horizon.ts` l. 585 a 603) sin esperarla, con su memo de una hora (`SPOILER.lastSeenEveryMin`, 60) (D-40; I-19; X-19). La web pide `get-session` al cargar cualquier página (`Header.tsx` l. 5 y 65; `useSessionState.ts` l. 23), así que toda visita cuenta, y eso es el «login» de la regla del mes (§14). `lastSeen.test.ts` entra, crea el corredor y comprueba que `last_seen_at` ya no es nula.

---

**Injertos aplicados.** I-10 (§10.4), I-19 (§10.6), I-22 (§10.5).

**Objeciones resueltas.** O-05 (§10.1: la zona horaria y la lengua del navegador, con su origen), O-24 (§10.5), O-25 (§10.4).

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.**

- **10-a**, el texto de Privacy sin la frase de contraseñas filtradas (DD-11 C), con dos correos (§9.3 del encargo), con los avisos de seguridad solo por push y con un apartado `Who can change your account` (§9.2 y §9.3 del encargo).
- **10-b**, el equipo de quien se borra conserva el nombre (DD-14 B por el dueño); `deleteAccount` no lo renombra. Manda sobre D-38.
- **10-c**, sin correo `account_deleted`; el final es `Your account is deleted` / `Thanks for playing.`, con `cs.accountDeleted` en `sessionStorage`.
- **10-d**, `deleteAccount` vacía `from` y `to` de las filas `user.email` de `admin_audit` de la cuenta borrada.
- **10-e**, el PR 3 pone el texto nuevo con solo lo que ya es verdad y cada PR añade su frase; la de las copias depende de que el cron de `backup.sh` corra.
- **10-f**, `AccountExport` deja fuera `isAdmin`, `deviceEpoch`, `name` e `image` de `users`, y la credencial de cada aparato.
- **10-g**, `notificationDevices` es `[]` fijo hasta el PR 14; el PR 12 depende del 7 por `emails`.
- **10-h**, Privacy dice «our server logs» y no «those logs»: los registros HTTP del borde de Railway no pasan por `redactUrl`, y si guardan la consulta no lo sé. El enlace de confirmación ya no lleva el token a una URL del servidor (§5.2).
- **10-i**, Privacy nombra la aprobación de la cuenta y que un administrador puede cambiar la fecha de nacimiento (§4.9, §8.5).
