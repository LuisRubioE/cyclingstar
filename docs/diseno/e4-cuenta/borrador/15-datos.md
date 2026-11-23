## 15. Datos y migraciones

La última migración del árbol es `0054_modo_oscuro` (`packages/db/drizzle/`); E4 añade cuatro, de la `0055` a la `0058`. La `0059_dos_factores` desaparece con el TOTP (DD-01 A por el dueño, `00-encargo.md` l. 360 a 369; 8-b). Todas con `pnpm exec drizzle-kit generate` a partir de `packages/db/src/schema.ts`, columnas nulas o con defecto, sin reescribir ninguna tabla (D-57); los `UPDATE` de datos se añaden a mano al fichero generado, como ya hacen `0025`, `0032`, `0033`, `0043` y `0045`. Si otra línea de trabajo toma antes un número, manda el nombre y se renumera.

### 15.1 El esquema

**`users`, lo que se añade en la 0055** (el registro por aprobación, §4.9; va con el panel en el PR 5):

```ts
// packages/db/src/schema.ts, dentro de users
/** `pending` hasta que un administrador aprueba; `approved` después (§4.9). `UserStatus`. */
status: text('status').$type<UserStatus>().notNull().default('pending'),
/** Cuándo se aprobó; nula en las pendientes. La purga de DD-17 cuenta desde aquí (§15.4). */
approvedAt: timestamp('approved_at', { withTimezone: true }),
```

Y, en el tercer argumento de `pgTable`, el `CHECK` `users_status`: `status in ('pending', 'approved')`. La clave de Drizzle es `status`, como el `additionalFields` de `auth.ts`, o 1.7 lanza `SchemaMismatchError` (§4.2).

**`users`, lo que se añade en la 0056**:

```ts
// packages/db/src/schema.ts, dentro de users
/** Fecha de nacimiento declarada (D-05; DD-09 A). `mode: 'string'` para que no cruce zonas (4-b). */
birthDate: date('birth_date', { mode: 'string' }),
/** Versión de las condiciones aceptada al registrarse (`TERMS_VERSION`) y cuándo (D-10). */
termsVersion: text('terms_version'),
termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
/** La ausencia (§14): ausente es `away_until > now()`. Las dos o ninguna. */
awaySince: timestamp('away_since', { withTimezone: true }),
awayUntil: timestamp('away_until', { withTimezone: true }),
/** Desde cuándo cuenta el `Welcome back` pendiente; nula si no hay (§14.5, 14-d). */
welcomeBackFrom: timestamp('welcome_back_from', { withTimezone: true }),
/** Zona IANA del navegador al encender los avisos (§13.2). */
timeZone: text('time_zone'),
/** Solo lo que el jugador cambió; `{}` vale `NOTICE_DEFAULTS` (§13.1). */
noticePrefs: jsonb('notice_prefs').$type<Partial<Record<NoticeKind, boolean>>>().notNull().default({}),
/** Último rebote, queja o supresión de Resend (§9.3). */
emailUndeliverableAt: timestamp('email_undeliverable_at', { withTimezone: true }),
/** Entra en la firma de `cs_device`; subirlo las invalida todas (§7.5). */
deviceEpoch: integer('device_epoch').notNull().default(0),
```

Y en el tercer argumento de `pgTable`, `check('users_away_pair', sql\`(away_since is null) = (away_until is null) and (away_until is null or away_until > away_since)\`)`. `locale`cambia su defecto de`'es'`a`'en'` (`schema.ts`l. 109; D-07).`name`sigue`text not null default ''` y el gancho de registro lo escribe (§4.7).

**`auth_limits`** (0056; §7.3):

```ts
export const authLimits = pgTable('auth_limits', {
  /** `acct:`, `dev:`, `pw:`, `pwu:`, `mailip:`, `rsv:` o `exp:` y el HMAC de su valor (§7.3). */
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull(),
  dayStart: timestamp('day_start', { withTimezone: true }).notNull(),
  dayCount: integer('day_count').notNull(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
})
```

**`admin_audit`** (0055; §8.5):

```ts
export const adminAudit = pgTable(
  'admin_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    /** Id de la cuenta que actúa, o `'token'` con `ADMIN_TOKEN` (8-d). */
    actor: text('actor').notNull(),
    /** `user.status`, `user.email`, `user.email_verified`, `user.is_admin`, `user.premium`, `user.birth_date`, `user.delete`, `team.name`, `team.kit_revert`, `blocklist.add`, `blocklist.remove`, `world.tick`, `world.advance` (§8.5). */
    action: text('action').notNull(),
    /** Sin clave ajena: la fila sobrevive al borrado del objetivo. */
    targetUserId: uuid('target_user_id'),
    /** `{ field, from, to }`; para un equipo, también `teamId`. */
    detail: jsonb('detail').$type<AdminAuditDetail>().notNull(),
  },
  (t) => [index('admin_audit_at').on(t.at.desc()), index('admin_audit_target').on(t.targetUserId)],
)
```

**`email_log`** (0057; §9.2):

```ts
export const emailLog = pgTable(
  'email_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resendId: text('resend_id').unique(),
    /** `verify_signup` o `reset_password`. */
    kind: text('kind').notNull(),
    /** HMAC del correo normalizado, como `auth_limits`: L5 sin guardar el buzón. */
    recipientHash: text('recipient_hash').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    /** `queued`, `sent`, `delivered`, `bounced`, `complained`, `suppressed`, `failed`. */
    status: text('status').notNull().default('queued'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('email_log_recipient').on(t.recipientHash, t.createdAt),
    index('email_log_created').on(t.createdAt),
  ],
)
```

**`push_targets`** y **`notice_log`** (0058; §13):

```ts
export const pushTargets = pgTable(
  'push_targets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** La sesión que la creó; nula cuando la sesión caduca, y la fila se queda (D-49). */
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    channel: pushChannelEnum('channel').notNull(),
    /** SHA-256 hex del endpoint (Web Push) o del token (FCM, APNs). */
    endpointHash: text('endpoint_hash').notNull().unique(),
    /** `{ endpoint, keys }`, `{ token }` o `{ token, environment }`, según el canal (§13.6). */
    credential: jsonb('credential').notNull(),
    /** `deviceLabel` del agente al suscribir (`Chrome on Android`). */
    label: text('label').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastOkAt: timestamp('last_ok_at', { withTimezone: true }),
    failures: smallint('failures').notNull().default(0),
  },
  (t) => [index('push_targets_user').on(t.userId)],
)

export const noticeLog = pgTable(
  'notice_log',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    ref: text('ref').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('notice_log_once').on(t.userId, t.kind, t.ref),
    index('notice_log_sent').on(t.sentAt),
  ],
)
```

`pushChannelEnum` es `pgEnum('push_channel', ['webpush', 'fcm', 'apns'])`; el canal es un conjunto cerrado que solo crece con la app, y un `enum` lo dice en la base (15-a). `kind` de `notice_log` y de `email_log` es `text`: los catálogos viven en TypeScript (`NOTICE_KINDS`) y crecen con E9 sin migración.

### 15.2 Las migraciones

| Migración              | PR  | SQL principal                                                                                                                                                                                                                                                                                             | Filas de hoy                                                                                                                                                       | Índices                                                                                                 |
| ---------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `0055_auditoria_admin` | 5   | `CREATE TABLE admin_audit (…)`; `ALTER TABLE users ADD COLUMN status text DEFAULT 'pending' NOT NULL, ADD COLUMN approved_at timestamptz` y su `CHECK`; a mano: `UPDATE users SET status = 'approved', approved_at = now()`                                                                               | `admin_audit` vacía; todas las cuentas de hoy, `approved` (la del dueño entre ellas: ninguna se queda fuera)                                                       | `at desc`; `target_user_id`                                                                             |
| `0056_cuenta_e4`       | 6   | `ALTER TABLE users ADD COLUMN birth_date date, …` (las diez columnas de §15.1) y `ADD CONSTRAINT users_away_pair CHECK (…)`; `ALTER TABLE users ALTER COLUMN locale SET DEFAULT 'en'`; `CREATE TABLE auth_limits (…)`; a mano: `UPDATE sessions SET ip_address = ''` y `UPDATE users SET name = 'Player'` | columnas nulas (`birth_date` nula: la puerta de la fecha, D-09), `notice_prefs` `{}`, `device_epoch` 0; `locale` se queda como esté; IP vaciada; nombre `'Player'` | ninguno nuevo en `users`; la clave primaria de `auth_limits`                                            |
| `0057_correo`          | 7   | `CREATE TABLE email_log (…)`                                                                                                                                                                                                                                                                              | vacía                                                                                                                                                              | `(recipient_hash, created_at)`; `created_at`                                                            |
| `0058_avisos`          | 14  | `CREATE TYPE push_channel AS ENUM (…)`; `CREATE TABLE push_targets (…)`; `CREATE TABLE notice_log (…)`                                                                                                                                                                                                    | vacías                                                                                                                                                             | `push_targets (user_id)`; el único de `endpoint_hash`; el único de `notice_log`; `notice_log (sent_at)` |

La 0056 lleva todas las columnas de `users` de E4, aunque `birth_date` la use el PR 9, `away_*` y `welcome_back_from` el 13 y `time_zone` y `notice_prefs` el 14: una sola reescritura de catálogo de `users` en vez de cuatro, y cada PR posterior queda sin migración (15-b). Es el orden de D-57. `ADD COLUMN` nula o con defecto constante no reescribe la tabla en Postgres 11 o más. Los dos `UPDATE` no se pueden deshacer: la IP de las sesiones y el nombre de hoy se pierden (§19.1). `sessions.ip_address` se queda como columna (`schema.ts` l. 138), vacía; quitarla pediría tocar el modelo de `better-auth`.

### 15.3 Lo que no lleva migración

- El cambio de correo de autoservicio retirado (§5.5): sin columnas ni filas de `verifications` para el deshacer.
- El cambio de correo, de fecha y de nombre de equipo desde el panel (§8.5): `users.email`, `users.birth_date` y `teams.name` ya existen (la segunda desde la 0056); solo escriben `admin_audit`.
- El manifiesto mínimo (§13.5): un fichero en `apps/web/public/`.
- Las claves nuevas de `auth_limits` (`pwu:`, `rsv:`, §7.3): la tabla no cambia.
- `stageReadyEmail` borrada, `cs_device` (cookie), `deviceLabel` (calculada), `inactiveSince` (función).
- `users.password_hash` (`schema.ts` l. 106 a 108): existe «sin uso con better-auth», dice su comentario; E4 no la toca (contesta la duda de §10).
- `users.last_seen_at`: existe desde la 0048 (`schema.ts` l. 121 a 125).
- La recuperación con hash (`verification.storeIdentifier: 'hashed'`) usa `verifications` tal cual (§5.1).

### 15.4 La purga

`purgeAccounts(db, now)` (`packages/db/src/purge.ts`; D-34; §9.5) borra, con `DELETE` indexados e idempotentes: `auth_limits` con `window_start` y `day_start` de más de `AUTH_LIMITS_RETENTION_DAYS` (2) días y sin cierre vivo; `email_log` de más de `EMAIL_LOG_RETENTION_DAYS` (90); `notice_log` de más de `NOTICE_LOG_RETENTION_DAYS` (90); `verifications` caducadas; y, con DD-17 A, las cuentas aprobadas y sin confirmar con `approved_at` de más de `PURGE_UNCONFIRMED_DAYS` (7) días, sin corredor ni equipo, por `deleteAccount` (§10.4). Las `pending` no se purgan: las decide un administrador (§4.9, 9-g). **Dónde corre** (15-c): en `runTick`, una vez por pasada que procese días, después del último, como ya corre `purgeAttrLog` (`packages/db/src/tick.ts` l. 218 y 346). Con cuatro días de juego por día real son unas cuatro pasadas al día (estimado), y da igual quién procese los días, `web` o `tick`. Los plazos se miden en tiempo real, no en días de juego.

### 15.5 Lo que registra cuentas y se re-sella

Con `birthDate` obligatorio en el registro (§4.2), todo lo que llama a `sign-up/email` tiene que mandarla (mapa 03 §8): `apps/api/src/authFlow.test.ts` l. 72, 274, 368 y 423; `apps/api/src/adminPanel.test.ts` l. 34; el fixture `__fixtures__/spoilerWorld.ts` l. 244, con sus cuatro usuarios y las suites que lo usan; `apps/web/e2e/world/build.mjs` l. 138; y `docs/diseno/e3-visual/capturas/mundo.mjs`. El último no se edita en E4 (es de E3 y no corre en el CI): se anota en el PR 9 para quien vuelva a hacer capturas (15-d). Los tests que leen `users.name` esperan `'Player'` desde el PR 9 (§17.2).

---

**Injertos aplicados.** I-27 (§15.4: la purga y su sitio).

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.**

- **15-a**, `push_targets.channel` como `pgEnum`; los `kind`, `text`.
- **15-b**, la 0056 lleva todas las columnas de `users` de E4, también `welcome_back_from` (14-d); los PR 9, 13 y 14 no migran.
- **15-c**, la purga corre dentro de `runTick`, tras procesar días, como `purgeAttrLog`; no es una tarea aparte.
- **15-d**, `capturas/mundo.mjs` de E3 no se toca; se anota.
- **15-e**, `notice_log` se purga a 90 días.
- **15-f**, `users.status` y `users.approved_at` van en la 0055, con el panel, porque el registro está abierto hoy y la puerta tiene que llegar pronto; el `UPDATE` a mano deja aprobadas todas las cuentas que existan al migrar.
