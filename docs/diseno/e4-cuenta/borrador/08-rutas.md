## 8. Las rutas, las dependencias y el administrador

`better-auth` monta 31 puntos y el proxy deja pasar todos por un comodín (mapa 01 §1; `authProxy.ts` l. 62 a 71); la web usa ocho. Esta sección cierra lo que no se usa por lista blanca, sube las dependencias, fija el registro de `better-auth` y escribe el panel de administración como lo quiere el dueño: el de `twilightstruggle`, sin segundo factor y con cada edición escrita (`00-encargo.md` §9.2, punto 1).

### 8.1 La lista blanca

`AUTH_ALLOWED_PATHS` (`apps/api/src/security.ts`) son **once** rutas (D-29; I-06; O-21); el proxy da 404 `{ ok: false, error: 'no_encontrado' }` a todo lo demás bajo `/api/auth/*` sin llegar a `better-auth`:

| Ruta                           | Qué hace                                                                    | Quién la usa                |
| ------------------------------ | --------------------------------------------------------------------------- | --------------------------- |
| `POST sign-up/email`           | crea la cuenta y manda `verify_signup`                                      | `Register`                  |
| `POST sign-in/email`           | entra; 403 `EMAIL_NOT_VERIFIED` y `verify_signup` si falta confirmar        | `Login`                     |
| `GET get-session`              | la sesión, sin token, IP ni agente (§6.3)                                   | todas las páginas           |
| `POST sign-out`                | cierra la sesión propia y borra `cs_viewer`                                 | `Account`                   |
| `GET verify-email`             | confirma y abre sesión                                                      | `VerifyEmail`               |
| `POST send-verification-email` | manda otro `verify_signup`                                                  | `CheckInbox`, `VerifyEmail` |
| `POST request-password-reset`  | manda `reset_password` si la cuenta existe                                  | `ForgotPassword`            |
| `GET reset-password/:token`    | 302 a `/reset-password?token=`; solo `LEGACY_LINK_GRACE_DAYS` desde el PR 8 | enlaces viejos              |
| `POST reset-password`          | guarda la contraseña nueva y cierra todas las sesiones                      | `ResetPassword`             |
| `POST change-password`         | cambia la contraseña con la actual y cierra las otras                       | `Account › Password`        |
| `POST delete-user`             | borra la cuenta con la contraseña (§10.4)                                   | `Account › Delete account`  |

`change-email` sale de la lista con el cambio de correo de autoservicio (§5.5). `disabledPaths` se calcula como el complemento de `AUTH_ALLOWED_PATHS` sobre `auth.api` y se pasa a `betterAuth` (X-14): `better-auth` da 404 en ellas antes del limitador y de los ganchos, sin variante de URL que lo esquive (`/sign-in/email/`, `//sign-in/email` y `/Sign-in/email` dan 404; `api/index.mjs` l. 169 a 171; `core/utils/url.mjs` l. 18 a 30). Son dos cerrojos y no uno porque el proxy puede montarse mal en una refactorización y `disabledPaths` no protege si alguien la vacía. `authRoutes.test.ts` recorre todos los puntos de `auth.api` y exige 404 por HTTP a todo lo que no está en la lista, y 200 o el error esperado a lo que sí.

### 8.2 Lo que se cierra y por qué

De los 31 puntos del mapa 01 §1 se cierran todos los que no están en la lista:

- `verify-password`: responde por HTTP aunque lleva `scope: "server"` (`password.mjs` l. 183), a 60 intentos por minuto con una sesión robada, 30 veces más que `change-password`. `auth.api.verifyPassword` sigue valiendo desde el servidor (lo usa `POST /api/me/export`, §10.5).
- `update-user`: guarda `name` e `image` sin validar (900.000 caracteres aceptados, medido) y nadie los lee.
- `list-sessions`, `revoke-session`, `revoke-sessions` y `revoke-other-sessions`: los sustituye `/api/me/devices` (§6.4), que no devuelve tokens.
- `change-email`: retirado (§5.5).
- `update-session`, `list-accounts`, `account-info`, `get-access-token`, `refresh-token`, `unlink-account`, `GET delete-user/callback`, `sign-in/social`, `link-social`, `callback/:id`, `ok` y `error`: sin uso; las de OAuth, inertes sin proveedores, se cierran antes de que un plugin las despierte.

### 8.3 Las subidas y la regla de los plugins

El PR 2 sube `better-auth` a 1.7.26 en `apps/api` y `apps/web`, `fastify` a 5.12.8, `zod` a 4.6.7 o más y `fast-uri` por encima de 3.1.7 y 4.1.4 con `pnpm.overrides` si no suben solos (D-28). Medido en el mapa 01 §8: compila sin errores y pasan 69 ficheros y 1.126 tests, sin migración de esquema. Los tres avisos de `better-auth` (`GHSA-965c-763c-88jm`, `GHSA-r4xp-prcw-77qf`, `GHSA-q84f-53jg-9ppm`) no nos alcanzan porque exigen OAuth, enlace mágico o el plugin de dispositivo, y 1.7.26 los arregla igual; los de `fastify` tampoco (un solo `setNotFoundHandler`, ningún esquema `$async`, `app.ts` l. 165, 351 y 386). El trabajo `audit` de `cobertura.yml` (l. 182 a 192) pasa a bloqueante para `pnpm audit --prod --audit-level=high` de `apps/api` cuando W5 suelte el CI.

La regla, escrita como comentario encima de `betterAuth(` en `auth.ts`: ningún plugin de `better-auth` entra sin leer los avisos de la versión instalada, y toda ruta nueva entra en `AUTH_ALLOWED_PATHS` por decisión. E4 no añade ninguno: nada de OAuth, enlace mágico ni código por correo (D-00f).

### 8.4 El registro de `better-auth`

`logger: { level: 'warn' }` fijo en `auth.ts` (D-30; H-10). Con `info`, `better-auth` escribe `Sign-up attempt for existing email: <correo>` (`sign-up.mjs` l. 194): un correo entero en los logs y la prueba de que la cuenta existe. Hoy no sale porque el defecto es `warn` y nadie lo fija; fijarlo impide que un cambio de defecto en una subida lo encienda. Un test registra dos veces el mismo correo y comprueba que ninguna línea lo contiene.

### 8.5 El panel de administración

El modelo es el de `twilightstruggle` y el de `his` (`00-encargo.md` l. 360 a 369) y ya casi existe:

- **Administradores fijos por el despliegue**: el raíz es la cuenta cuyo correo confirmado es `ADMIN_EMAIL` (`adminUsers.ts` l. 21 a 26), evaluado en cada petición. Como `AI_ADMINS` en `twilightstruggle` (`ai/src/pvp/roles.ts` l. 10 a 12), el panel no lo puede quitar, ni borrar (`routes/admin.ts` l. 134 a 136), ni cambiarle el correo, ni dar ese correo a otra cuenta (§5.5).
- **Administradores dados desde el panel**: `users.is_admin`, que cualquier administrador da o quita, menos a sí mismo (`routes/admin.ts` l. 114 a 116, 409 `no_puedes_quitarte_admin`). Igual que `twilightstruggle` con sus administradores de la base.
- **El moderador** existe en los dos juegos de referencia (`his`, `backend/app/auth.py` l. 189 a 195, `require_moderator_or_admin`) y aquí es de E7. E4 deja el sitio: `admin_audit.actor` guarda un id de cuenta y no supone que sea administrador, y `GET /api/admin/audit` está escrita para que E7 la abra a un papel más, como `his` abre su registro a los dos (`routers/admin_log.py` l. 12 a 25).

**Lo que el panel gana en E4:**

| Ruta                                   | Cuerpo                          | Reglas                                                                                                                                                                                        | Escribe en `admin_audit`                                                                          |
| -------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `PATCH /api/admin/users/:id`           | ahora también `email`           | §5.5: normalizado, ni viejo ni nuevo `ADMIN_EMAIL` (400 `admin_email_fijo`), único (409 `correo_ocupado`), `email_verified` queda `true`                                                      | una fila por campo cambiado: `user.email`, `user.email_verified`, `user.is_admin`, `user.premium` |
| `PATCH /api/admin/teams/:id` (nueva)   | `{ name }`                      | las de `updateOwnedTeam` (`teamControl.ts` l. 170 a 178): de 2 a 40 caracteres, no bloqueado, no repetido en el mundo; vale para cualquier equipo, también el de una cuenta borrada (DD-14 B) | `team.name`                                                                                       |
| `DELETE /api/admin/users/:id`          | sin cambio                      | sin cambio (l. 122 a 140)                                                                                                                                                                     | `user.delete`                                                                                     |
| `POST /api/admin/teams/:id/kit/revert` | sin cambio (l. 222 a 240)       | sin cambio                                                                                                                                                                                    | `team.kit_revert`                                                                                 |
| `GET /api/admin/audit` (nueva)         | `?limit=` hasta 500, `?before=` | solo administradores                                                                                                                                                                          | nada                                                                                              |

**`admin_audit`** (0055): `id uuid pk`, `at timestamptz`, `actor text` (el id de la cuenta, o `'token'` si entra por `ADMIN_TOKEN`), `action text`, `target_user_id uuid` sin clave ajena (sobrevive al borrado del objetivo), `detail jsonb` con `{ field, from, to }` (para el equipo, también `teamId`). Sin IP. Una fila por campo, en la misma transacción que el cambio, como `ai_user_edits` de `twilightstruggle` (`admin.ts` l. 233 a 235). Al borrar una cuenta, `deleteAccount` vacía `from` y `to` de sus filas `user.email` (§10.4): el registro dice que hubo un cambio, no a qué correo.

**El panel** enseña en cada fila de cuenta `Change email` (pantalla: campo `New email`, `Save`, `Cancel`; confirmación `Change <old> to <new>? No email is sent to either address.`) y, si tiene equipo o lo tuvo, `Rename team` (campo `Team name`, `Save`). Debajo de la lista, un `Panel` `Recent changes` con las 50 últimas filas: `19 Nov 2026, 18:42 · <actor> · email · old → new`. Errores (pantalla): `The email of a fixed administrator (ADMIN_EMAIL) can't be changed or given here.`, `Another account already uses this email.`, `That team name is taken in this world.`, `That team name isn't allowed.`

### 8.6 Sin segundo factor

El dueño eligió el panel sin TOTP (DD-01 A): «Mira como resolví eso en hereistand y en twikightstruggle.app y me gustaría que sea parecido» (`00-encargo.md` l. 360 a 361), y ninguno de los dos lo tiene. Lo que queda escrito: quien tenga el buzón de `ADMIN_EMAIL` tiene el panel (A5, `docs/ops.md` l. 131 a 134), y lo que lo frena es el segundo factor del propio buzón del dueño, que el PR 17 (`operacion`) escribe como tarea en `docs/ops.md`. Con `admin_audit`, lo que haga un intruso en el panel queda escrito. La alternativa B (el plugin `twoFactor` sin `sendOTP`, la migración `0059_dos_factores` y el PR 18) no se hace; si el dueño la quisiera algún día, X-16 dice por qué solo sin `sendOTP` no choca con D-00f: `twoFactor` 1.7.26 monta `/two-factor/send-otp`, el código por correo (`ba17/plugins/two-factor/otp/index.mjs` l. 63 a 78), y la lista blanca lo dejaría en 404.

---

**Injertos aplicados.** I-05 (§8.5, sin el TOTP: el correo raíz fijo y `admin_audit`), I-06 (§8.1), I-07 (§8.1: `disabledPaths`).

**Objeciones resueltas.** O-01 (§8.5 y §8.6: el panel se escribe entero), O-21 (§8.1).

**Huecos rellenados.** H-10 (§8.4).

**Decisiones de esta sección.**

- **8-a**, once rutas en la lista blanca: `change-email` sale (`00-encargo.md` §9.3).
- **8-b**, sin TOTP (DD-01 A por el dueño): fuera la 0059, el PR 18 y las rutas `/two-factor/*`. Manda sobre D-29 y D-31.
- **8-c**, `ADMIN_EMAIL` sigue siendo un solo correo: el modelo de `twilightstruggle` (una lista fija del entorno más los que da el panel) ya se cumple con uno fijo y los de `is_admin`. Volverlo lista es cambiar el `z.string().email()` de `env.ts` l. 52 por una lista y `isRootAdmin`; no hace falta hoy.
- **8-d**, `admin_audit` guarda una fila por campo con `{ field, from, to }`, como `ai_user_edits`; `actor` es `'token'` con `ADMIN_TOKEN`.
- **8-e**, nueva `PATCH /api/admin/teams/:id` para que un administrador cambie siempre el nombre de un equipo (`00-encargo.md` §9.2, punto 7), con las reglas de `updateOwnedTeam`.
- **8-f**, `GET /api/admin/audit` pagina con `before` y como mucho 500 filas, (`his` da 500 por defecto y hasta 1.000, `admin_log.py` l. 14).

**Propuesto para el glosario.**

- `PATCH /api/admin/teams/:id` (`{ name }`); `GET /api/admin/audit` con `limit` y `before`.
- Acciones de `admin_audit`: `user.email`, `user.email_verified`, `user.is_admin`, `user.premium`, `user.delete`, `team.name`, `team.kit_revert`.
- Textos del panel (pantalla) de §8.5: `Change email`, `New email`, `Change <old> to <new>? No email is sent to either address.`, `Rename team`, `Team name`, `Recent changes` y los cuatro errores.
- `AUTH_ALLOWED_PATHS` (11) en §G.4 y §G.6, sin `change-email`.
- Fuera de §G.3: `0059_dos_factores`; fuera de §G.14: el PR 18.

**Dudas para el ensamblador.**

- El texto de `Terms` (§4.6) y el de Privacy (§10.1) dicen que un administrador puede cambiar el correo y el nombre del equipo. Si E7 crea el moderador, los dos textos y `GET /api/admin/audit` cambian con él.
