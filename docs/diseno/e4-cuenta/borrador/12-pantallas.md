## 12. Las pantallas de la cuenta

Hoy `Account` es una página de 1.950 px a 360 donde lo de la cuenta empieza a 620 px, dos pantallas por debajo de lo que se ve al llegar (`Account.tsx` l. 393 a 415; mapa 05 §7). Esta sección dibuja `Account` como lista (DD-07 A), cada subpágina con sus estados, el traductor único de errores, los finales con su `Notice`, los dos componentes nuevos y la prueba del teléfono. `Notifications` y `Away` las dibujan §13 y §14.

### 12.1 `Account` como lista (pantalla, 360 px)

```
Account
you@example.com · Joined 12 Nov 2026

[ Admin panel                          › ]     solo administradores

Your account
[ Email                 you@example.com › ]
[ Password              Changed 12 Nov  › ]
[ Devices               3 signed in     › ]
[ Your data             Download a copy › ]
[ Delete account                        › ]

The game
[ Notifications   On for this browser   › ]
[ Away            Not set               › ]
[ Spoiler protection    Only yours      › ]
[ Appearance            Dark            › ]

[ Sign out ]
```

Cada fila es un `ActionRow` que abre `/account/<tarea>` (`AccountEmail`, `AccountPassword`, `AccountDevices`, `AccountData`, `AccountDelete`, `AccountNotifications`, `AccountAway`, `AccountSpoilers`, `AccountAppearance`), cada una con su `PageHeader` y `‹ Account` para volver. Los valores de la derecha salen de `GET /api/me/account` (propuesta de esta sección): `{ ok: true, email, joinedAt, passwordChangedAt: string | null, devices: number, emailUndeliverableAt: string | null }`. `passwordChangedAt` es `accounts.updated_at` de la fila `credential`; si `better-auth` no la toca al cambiar la contraseña (no lo he comprobado), la fila dice `Set`; `authFlow.test.ts` lo comprueba al cambiar la contraseña. Es el gemelo en la web de `password_changed`, como `Devices` lo es de `new_sign_in` (principio 2). Con `email_undeliverable_at`, el `Notice` `warn` de §9.3 va encima de todo.

**La alternativa B** (DD-07 B): una sola página con un `Panel` por tarea, como hoy, con el orden de arriba. Sin el formulario de cambio de correo (§5.5), el botón que el teclado tapaba ya no existe; B cuesta menos que antes, pero sigue empezando lo de la cuenta lejos del principio.

### 12.2 Las subpáginas (pantalla)

**Email** (`/account/email`): el correo y dos frases, sin formulario.

```
‹ Account
Email
you@example.com
Your email can only be changed by an administrator.
If you lose access to this email, you won't be able to recover your account.
```

Con el correo sin confirmar (cuentas antiguas con sesión viva, `Account.tsx` l. 81 a 111) va encima el aviso de hoy, `Your email is not confirmed` / `You will need it the next time you log in, and to recover your account if you ever lose your password.` / `Send me a confirmation link`; enviado, `Link sent. Check your inbox and the spam folder.` (sin la raya de l. 92).

**Password** (`/account/password`):

```
‹ Account
Password
Changing your password signs you out of your other devices.
Current password  [                    Show ]
New password      [                    Show ]
At least 8 characters.
[ Update password ]
```

| Estado              | Texto (pantalla)                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Actual vacía        | `Enter your current password.` (sin llamar a la API; hoy sale `Invalid password`, captura 60c)              |
| Nueva corta o larga | `Use at least 8 characters.` / `Your password can be at most 128 characters.`                               |
| Actual mala         | `That's not your current password.`                                                                         |
| L3                  | `Too many wrong passwords. Try again in 15 minutes.` y la cuenta atrás                                      |
| Guardada            | `Notice` `good`: `Password updated` / `You've been signed out of your other devices.`; los campos se vacían |

Desaparece `Confirm new password`: con `Show` basta (principio 6).

**Devices** (`/account/devices`):

```
‹ Account
Devices
You're signed in on 3 devices.
Chrome on Android     This device
Active now · Signed in 12 Nov
Safari on iPhone                         [ Sign out ]
Active 2 days ago · Signed in 3 Nov
Firefox on Windows                       [ Sign out ]
Active 9 days ago · Signed in 20 Oct
[ Sign out everywhere else ]
```

| Estado                     | Texto (pantalla)                                                                |
| -------------------------- | ------------------------------------------------------------------------------- |
| Cargando                   | el `Panel` en `loading`, como el resto del catálogo                             |
| Solo este aparato          | `You're only signed in here.`, sin botones                                      |
| `Sign out` en una fila     | la fila desaparece; `Notice` `good` `Signed out of Safari on iPhone.`           |
| `Sign out everywhere else` | `Sheet` de confirmación: `Sign out of 2 other devices?` / `Sign out` / `Cancel` |
| Confirmado                 | `Signed out of 2 other devices.` (con `closed` de §6.5)                         |
| Error                      | `authErrorText` (§12.3)                                                         |

Las fechas, relativas hasta 7 días (`Active now`, `Active 2 days ago`) y absolutas después (`Signed in 20 Oct`, con el año si no es el actual). Los datos y las rutas, en §6.4 y §6.5.

**Your data** (`/account/data`):

```
‹ Account
Your data
Download a copy of everything we keep about you, as a JSON file.
Password  [                    Show ]
[ Download my data ]
```

Contraseña mala, L3 y red: §12.3. La cuarta del día: `You've downloaded your data 3 times today. Try again tomorrow.` El fichero y sus campos, en §10.5.

**Delete account** (`/account/delete`):

```
‹ Account
Delete account
This cannot be undone. Your rider and your team stay in the world, run by the game, and your email becomes free to use on another account.
Want a copy first? Download my data
Password  [                    Show ]
[ Delete my account for good ]      (Button danger)
[ Cancel ]
```

El texto de hoy (`Account.tsx` l. 329 a 330), sin el paso intermedio `Delete my account…`: la subpágina ya es ese paso. Vacía: `Enter your password to delete your account.` (el gancho dice lo mismo, `auth.ts` l. 189). Mala: `That's not your current password.` Bien: §10.4.

**Spoiler protection** (`/account/spoilers`) y **Appearance** (`/account/appearance`): los paneles de hoy (`Account.tsx` l. 43 y el de E2), movidos sin cambiar un texto. Son de E2 y de E3.

### 12.3 `authErrorText`

`apps/web/src/domain/authErrors.ts`, el traductor único de todas las páginas de entrada y de las subpáginas de `Account` (D-25). Nunca pinta el `message` del servidor: traduce por código.

```ts
export interface AuthErrorBody {
  code?: string
  error?: string
  message?: string
  retryAfterS?: number
}

/** status 0 es «sin red». Devuelve el texto de la tabla; null si el caso no se pinta (redirige). */
export function authErrorText(
  error: AuthErrorBody | null,
  status: number,
  retryAfterS: number | null,
): string | null

/** 45 da «45 seconds»; 60 da «1 minute»; 238 da «4 minutes». */
export function waitText(seconds: number): string
```

| Estado y código                                                       | Texto (pantalla)                                                                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0, sin red                                                            | `Can't reach Cycling Star. Check your connection and try again.`                                                                                             |
| 429 de Fastify (`demasiadas_peticiones`) o L4                         | `Too many attempts from this connection. Try again in <wait>.`                                                                                               |
| 429 `ACCOUNT_LOCKED`                                                  | `Too many failed attempts on this account. Try again in 15 minutes, or reset your password.`, con `reset your password` como `TextLink` a `/forgot-password` |
| 429 `PASSWORD_ATTEMPTS_LOCKED`                                        | `Too many wrong passwords. Try again in 15 minutes.`; con `signedOut: true`, a `/login` con `You were signed out after too many wrong passwords.`            |
| 429 `EXPORT_LIMIT`                                                    | `You've downloaded your data 3 times today. Try again tomorrow.`                                                                                             |
| 401 `INVALID_EMAIL_OR_PASSWORD`                                       | `Wrong email or password.` (hoy `Invalid email or password`, sin punto)                                                                                      |
| 400 `INVALID_PASSWORD`                                                | `That's not your current password.`                                                                                                                          |
| 403 `EMAIL_NOT_VERIFIED`                                              | el `Notice` de §5.3                                                                                                                                          |
| 400 `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`                         | `Use at least 8 characters.` / `Your password can be at most 128 characters.`                                                                                |
| 400 `VALIDATION_ERROR` con `INVALID_BIRTH_DATE` o `UNDER_MINIMUM_AGE` | §4.8                                                                                                                                                         |
| 400 `INVALID_TOKEN`, `TOKEN_EXPIRED`                                  | `This link has expired or has already been used.`                                                                                                            |
| 403 `BIRTH_DATE_REQUIRED`                                             | ninguno: lleva a `/account/birth-date`                                                                                                                       |
| 503 `MAIL_BUDGET_EXHAUSTED`                                           | `We can't send emails right now. Try again tomorrow.`                                                                                                        |
| cualquier otro                                                        | `Something went wrong. Try again in a minute.`                                                                                                               |

Con un 429, el botón queda deshabilitado con su porqué (`docs/visual.md` §4.1) y una cuenta atrás que baja cada segundo: `You can try again in 3:58.` Al llegar a cero se habilita y el texto se va. `authErrors.test.ts` cubre cada fila y `waitText` en 1, 45, 60, 61 y 899 segundos.

### 12.4 `Login` y los finales

`Login` cambia en tres cosas: los errores pasan por `authErrorText` (hoy `Login.tsx` l. 61 pinta `Wrong email or password.` también con un 429, captura 35), `Forgot your password?` lleva el correo tecleado por el estado del router (§5.4), y la página lee un `Notice` de llegada. Los finales, todos `Notice` `good` con `role="status"` (D-56; principio 1):

| Llega de                       | Dónde               | Texto (pantalla)                                                                              |
| ------------------------------ | ------------------- | --------------------------------------------------------------------------------------------- |
| Guardar la contraseña nueva    | `/login`            | `Password saved` / `Log in with your new password. You have been signed out everywhere else.` |
| L3 cerró la sesión             | `/login`            | `You were signed out after too many wrong passwords.` (`Notice` `warn`)                       |
| Borrar la cuenta               | `/`                 | `Your account is deleted` / `Thanks for playing.`                                             |
| Confirmar el correo            | `/verify-email`     | `Email confirmed` / `You're in. Let's create your rider.`                                     |
| Guardar la fecha de nacimiento | la página que pidió | ninguno: la puerta desaparece                                                                 |

### 12.5 `DateField` y `Field` `reveal`

Entran por el catálogo de E3, con su test por estado y su sitio en `/_ui` (`docs/visual.md` l. 1329 a 1333; D-56).

```ts
// apps/web/src/components/ui/DateField.tsx
export interface DateFieldValue {
  day: string
  month: string
  year: string
}

export interface DateFieldProps {
  label: string
  hint?: string
  value: DateFieldValue
  onChange: (next: DateFieldValue) => void
  error?: string
  disabled?: boolean
}

/** `YYYY-MM-DD` con ceros, o null si falta un trozo. No valida la fecha: eso es birthDateSchema. */
export function toIsoDate(value: DateFieldValue): string | null
```

Tres `input` en una fila de 64, 64 y 96 px a 360 (caben a 320: 224 px más dos huecos de 8), con `Day`, `Month` y `Year` encima, `inputmode="numeric"`, `pattern="[0-9]*"`, `maxlength` 2, 2 y 4 y `autocomplete` `bday-day`, `bday-month` y `bday-year`. El foco no salta solo de un campo a otro. Con `error`, los tres llevan `aria-invalid` y `aria-describedby` al mensaje. Estados en `/_ui`: vacío, lleno, con error y deshabilitado. `DateField.test.tsx` cubre los cuatro y `toIsoDate` con `1`, `7`, `2008` (da `2008-07-01`).

`Field` gana `reveal?: boolean`, solo con `type="password"`: un `Button` `quiet` de 44 × 44 dentro del campo, `type="button"`, que alterna `Show` y `Hide`, con `aria-pressed` y `aria-controls`; cambia el `type` del `input` y no toca `autocomplete`. Va en todas las contraseñas de E4: `Register`, `Login`, `ResetPassword`, `Password` (las dos), `Your data` y `Delete account`. `Field.test.tsx` añade el estado `reveal` y su alternancia.

### 12.6 El teclado y la prueba del teléfono

La captura 55 (el botón `Update email` 122 px por debajo del teclado, mapa 05 §10) desaparece con el formulario (§5.5). En las subpáginas el formulario empieza bajo el `PageHeader`: en `Password`, el primer campo queda hacia 150 px (estimado, sin aparato) y el botón por encima de los 470 px que deja el teclado simulado. La prueba del teléfono de E3 (`docs/visual.md` §7) añade, a 360 y a 320, `/account` y cada subpágina, `/account/birth-date`, `/terms`, `/register` con `DateField` en error, la pantalla del menor, `CheckInbox`, `VerifyEmail` y `ResetPassword` en cada estado de §5.2, y comprueba con el teclado simulado de mapa 05 §10 que el botón de cada formulario se ve. Un teclado de verdad, en Android y en iPhone, va a la prueba del dueño (§19.3).

---

**Injertos aplicados.** Ninguno asignado.

**Objeciones resueltas.** O-06 (§12.1: `Account` es DD-07, con su alternativa B escrita, y sus pantallas nuevas entran por el catálogo de E3, §12.5), O-22 (§12.1: la fuente de cada valor de la lista; el coste del PR 11 lo escribe §18).

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.**

- **12-a**, `Account › Email` sin formulario (`00-encargo.md` §9.3) y con la frase `Your email can only be changed by an administrator.`
- **12-b**, nueva `GET /api/me/account` para los valores de la lista; `passwordChangedAt` sale de `accounts.updated_at` de la fila `credential`.
- **12-c**, `Password` pierde `Confirm new password` y su final es `Password updated` / `You've been signed out of your other devices.`
- **12-d**, `Delete account` sin el paso `Delete my account…`: la subpágina ya es ese paso.
- **12-e**, `DateField` no salta de campo solo; `toIsoDate` no valida.
- **12-f**, el 429 de exportar lleva el código `EXPORT_LIMIT`; el décimo intento de L3 lleva `signedOut: true`.
- **12-g**, fechas de `Devices` relativas hasta 7 días y absolutas después.

**Propuesto para el glosario.**

- `GET /api/me/account` y su respuesta; `AuthErrorBody`, `waitText` (`apps/web/src/domain/authErrors.ts`); `DateFieldValue`, `DateFieldProps`, `toIsoDate`.
- 429 `EXPORT_LIMIT`; `signedOut` en el 429 `PASSWORD_ATTEMPTS_LOCKED`.
- Textos (pantalla): `Your email can only be changed by an administrator.`; `Link sent. Check your inbox and the spam folder.`; `Changing your password signs you out of your other devices.`; `Password updated` / `You've been signed out of your other devices.`; `That's not your current password.`; `Enter your current password.`; `You're only signed in here.`; `Signed out of <device>.`; `Signed out of <n> other devices.`; `Sign out of <n> other devices?`; `Download a copy of everything we keep about you, as a JSON file.`; `You've downloaded your data 3 times today. Try again tomorrow.`
- Fuera de §G.12: `Enter your current password to change your email.` y `This account's email is set in the server settings and can't be changed here.`
