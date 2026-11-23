## 5. Verificación, recuperación, cambio de correo y los correos

El dueño dejó el correo en dos enlaces: «Solo correo para forgot password y para acabar el registro (igual que en el de Twilight Stuggle)» (`00-encargo.md` l. 398 a 399, 23 de noviembre de 2026). Esta sección dice cómo viven esos dos enlaces, qué pasa al pulsarlos, cómo sale el jugador de cada estado y qué se retira: el cambio de correo de autoservicio, con sus dos correos y sus dos páginas, pasa al panel de administración.

### 5.1 Los tokens, después

| Token                     | Longitud y forma                                                              | Vida                                      | Un solo uso                                                                                                                                     | Al pedir otro                                                                 | Dónde se guarda                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Verificación del registro | JWT HS256 con `SESSION_SECRET`, 211 caracteres en 1.7.26 (mapa 01 §8, medido) | `EMAIL_JWT_TTL_S`, 86.400 s (hoy 3.600)   | en la práctica: una cuenta ya confirmada no vuelve a abrir sesión con él (mapa 01 §2, medido en 1.6.25; `emailLinks.test.ts` lo fija en 1.7.26) | el anterior sigue valiendo hasta su caducidad: un JWT no tiene estado         | en ningún sitio; fuera de los logs por el fragmento                                                               |
| Recuperación              | 24 caracteres `a-zA-Z0-9`, unos 143 bits (`password.mjs` l. 74)               | `RESET_TOKEN_TTL_S`, 3.600 s (sin cambio) | sí (`consumeVerificationValue`, l. 157)                                                                                                         | los anteriores siguen vivos **hasta que se usa uno**, y entonces mueren todos | `verifications.identifier` con hash SHA-256 (`verification.storeIdentifier: 'hashed'`) y `value` = id del usuario |

Las dos cifras: 24 horas para confirmar porque el correo del registro se lee al día siguiente y hoy ese correo es un registro fallido que manda a `Log in` (jugador §1.1, punto 5); una hora para recuperar porque quien recupera está delante de la pantalla esperándolo, y no se baja a 30 minutos porque el token ya no pasa por la URL ni por los logs (D-11). Los dos tokens de cambio de correo desaparecen: `user.changeEmail.enabled` pasa a `false` y `change-email` sale de la lista blanca (§5.5, §8.1).

Los enlaces de recuperación no se anulan al pedir otro (X-03): quien pide dos veces abre el que le llega antes, y anular el primero le daría un enlace muerto; además, anular al pedir deja a un atacante matar el enlace que el dueño tiene en la mano. Al usar uno, `emailAndPassword.onPasswordReset` borra las filas de `verifications` cuyo `value` es el id de ese usuario. Con `hashed` el prefijo `reset-password:` desaparece del identificador (O-09), así que se borra por `value`; hoy solo la recuperación escribe filas con `value` = id (mapa 03 §1). Los enlaces en claro anteriores al despliegue siguen valiendo con `hashed` (X-21, medido: 200).

### 5.2 La página de botón

Todo enlace de correo aterriza en una página de la web con un botón, y el token va en el fragmento, `#token=`, que el navegador no manda al servidor (D-12; I-04). La página lo lee, lo borra de la barra con `history.replaceState(null, '', location.pathname)` y no cambia nada hasta que se pulsa. Un escáner de enlaces que siga el correo carga una SPA y no pulsa (estimado: no se ha probado con un escáner real, H-08, y va a la prueba del dueño de §19.3).

Los correos construyen el enlace con `APP_URL`: `${APP_URL}/verify-email#token=${token}` y `${APP_URL}/reset-password#token=${token}`, con el `token` que `better-auth` pasa a `sendVerificationEmail` y a `sendResetPassword`. Dejan de usar `url` y `withCallbackURL` (`auth.ts` l. 33 a 41), que se queda para el enlace viejo.

**El enlace viejo.** `?token=` en `/verify-email` y `/reset-password`, y `GET /api/auth/reset-password/:token`, siguen funcionando `LEGACY_LINK_GRACE_DAYS` (7 días) desde el despliegue del PR 8. Los tokens de hoy viven una hora, así que ningún enlace enviado antes del despliegue sigue vivo pasada esa hora: los 7 días son el plazo para quitar el código, no para un enlace concreto.

**`VerifyEmail`** (`/verify-email#token=`, pantalla):

| Estado                                                  | Texto (pantalla)                                                                                     | Botones                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Con token, antes de pulsar                              | `Confirm your email` / `Tap the button to finish creating your account.`                             | `Confirm my email`                            |
| Pulsado, esperando                                      | el botón en `busy`, `Confirming…`                                                                    | ninguno                                       |
| Confirmado                                              | `Email confirmed` / `You're in. Let's create your rider.`                                            | `Continue` (a crear el corredor)              |
| Confirmado, sin sesión (la cuenta ya estaba confirmada) | `Email confirmed` / `Log in to start playing.`                                                       | `Log in`                                      |
| Caducado o malo (`INVALID_TOKEN`, `TOKEN_EXPIRED`)      | `This link has expired or has already been used.` / `Enter your email and we'll send you a new one.` | campo `Email`, `Send me a new link`, `Log in` |
| Sin token en el fragmento                               | `This link is incomplete.` / `Open it again from the email, or ask for a new one.`                   | campo `Email`, `Send me a new link`           |

El botón llama a `GET /api/auth/verify-email?token=…` sin `callbackURL`, que responde JSON y, con `autoSignInAfterVerification`, deja la sesión en ese navegador. Tras el 200 la página pregunta por la sesión antes de hablar: así no vuelve a decir `you are signed in` a quien no lo está (mapa 05 §5, captura 22). `Send me a new link` usa `send-verification-email` sin sesión, que ya iguala a 500 ms en todos los casos (`email-verification.mjs` l. 104 a 117) y responde siempre lo mismo: `If that address has an account waiting for confirmation, a new link is on its way.`

**`ResetPassword`** (`/reset-password#token=`, pantalla):

| Estado                             | Texto (pantalla)                                                                                                                  | Botones                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Con token                          | `Choose a new password` / campo `New password` con `Show`, `At least 8 characters.`                                               | `Save my new password`         |
| Guardando                          | el botón en `busy`                                                                                                                | ninguno                        |
| Guardada                           | va a `/login` con `Password saved` / `Log in with your new password. You have been signed out everywhere else.` (`Notice` `good`) |                                |
| Caducado o usado (`INVALID_TOKEN`) | `This link has expired or has already been used.` / `If you just set a new password, log in with it.`                             | `Log in`, `Ask for a new link` |
| Sin token                          | `This link is incomplete.` / `Open it again from the email, or ask for a new one.`                                                | `Ask for a new link`           |

Desaparece `Repeat it`: un campo con `Show` vale más que dos sin él (principio 6). El token va en el cuerpo de `POST /api/auth/reset-password`, nunca en la URL.

### 5.3 Registrarse y confirmar (R1)

1. `Register` (§4.1) manda `sign-up/email`. Con éxito, la web guarda el correo en `sessionStorage` (`cs.pendingEmail`) y enseña `CheckInbox`, que sobrevive a recargar y a volver atrás.
2. `CheckInbox` (pantalla): `Check your email` / `We've sent a link to <email>. Open it to confirm your address and start playing. It expires in 24 hours.` / `Nothing there? Check the spam folder.` / `Send it again` / `Wrong address? Start again` / `Already have an account with this email? No link is sent: log in or reset your password.` / `Log in`.
3. `Send it again` llama a `send-verification-email` y queda deshabilitado `RESEND_COOLDOWN_S` (60 s) con su porqué: `You can ask again in 0:42.`
4. El jugador abre el correo, pulsa en `VerifyEmail` y entra (§5.2).
5. Quien intenta entrar sin haber confirmado y con la contraseña buena recibe el 403 `EMAIL_NOT_VERIFIED` y un enlace nuevo (`sendOnSignIn`); `Login` dice (pantalla) `Confirm your email first` / `We have just sent a new link to <email>. Open it and you will be signed in. Check the spam folder if it does not show up.`

Registrarse con un correo que ya tiene cuenta no manda nada: el correo `signup_existing` que proponía `atacante` era un tercer correo y el dueño solo quiere dos (`00-encargo.md` §9.3). La respuesta es la misma 200 con un usuario inventado (mapa 01 §5) y la última línea de `CheckInbox` le dice al que ya tenía cuenta qué hacer, sin decirle a nadie si la dirección juega.

### 5.4 Recuperar la contraseña (R2)

1. `Login` › `Forgot your password?` lleva el correo tecleado a `ForgotPassword` por el estado del router, nunca por la URL.
2. `Send me a link` manda `request-password-reset` y **mira la respuesta**: un 429 o un 503 `MAIL_BUDGET_EXHAUSTED` dan su texto (§12.3); un 200, `Check your email` / `If <email> has an account, we've sent a link to reset your password. It expires in one hour.` y `Send another link`, deshabilitado `RESEND_COOLDOWN_S`. Hoy da por enviado el enlace con un 429 (`ForgotPassword.tsx` l. 47; mapa 05, captura 37).
3. `ResetPassword` (§5.2) manda `POST /api/auth/reset-password`. Al 200, en este orden:
   - `better-auth` cierra **todas** las sesiones (`emailAndPassword.revokeSessionsOnPasswordReset: true`; medido: la sesión anterior responde `null`, X-21).
   - `onPasswordReset({ user }, request)` borra las filas de `verifications` con `value` = id (los otros enlaces de recuperación), pone L1 a cero (`clearAttempts` de `acct:<hmac del correo>`), sube `users.device_epoch` (todas las `cs_device` de esa cuenta dejan de valer) y apunta `user.email` en `resetRequests`, un `WeakMap<Request, string>` del proxy.
   - El proxy ve el 200, encuentra el correo en `resetRequests` (`ctx.request` es el mismo objeto que el proxy pasa a `auth.handler`, `password.mjs` 1.7.26 l. 164, medido por seguridad C5) y emite a ese navegador una `cs_device` nueva para esa cuenta (D-13; I-03; §7.5). Así quien recupera sale del cierre de L1 aunque el atacante siga gastándolo (X-06: sin la cookie, 10 fallos más del atacante y la contraseña nueva desde un aparato nuevo da 429).
   - Se encola el aviso `password_changed` a todas las suscripciones de la cuenta (`push_targets`) y, una vez encolado, se borran todas: recuperar es el momento en que puede haber un intruso, y una suscripción suya seguiría recibiendo avisos del juego (§13).
4. `/login` con `Password saved` / `Log in with your new password. You have been signed out everywhere else.` (`Notice` `good`, `role="status"`).

**Cambiar la contraseña** desde `Account › Password` sigue mandando `revokeOtherSessions: true` (`Account.tsx` l. 223): cierra las otras sesiones, y con ellas sus suscripciones (I-25). Antes de cerrarlas, el proxy encola `password_changed` a las suscripciones de esas otras sesiones. No sale ningún correo.

### 5.5 El cambio de correo, en manos de un administrador

El jugador ya no cambia su correo (`00-encargo.md` §9.3, punto 1, lectura del orquestador con `twilightstruggle` delante: `ai/ui/src/online/profile.ts` l. 4 y 55). Lo que se retira:

- `user.changeEmail` (`auth.ts` l. 155 a 165) pasa a `enabled: false`; `POST /change-email` sale de la lista blanca y de `CREDENTIAL_AUTH_PATHS` (`security.ts` l. 54 a 68); `CHANGE_APPROVED_PATH` y `changeEmailConfirmationEmail` (`emails.ts` l. 118) se borran.
- No se crean `ApproveEmail` ni `UndoEmail`, ni `POST /api/account/undo-email-change` ni `approve-email-change`, ni el JWT de la rama ocupada; no hay `EMAIL_CHANGES_PER_DAY` ni `UNDO_EMAIL_CHANGE_H`.
- `Account › Email` enseña el correo sin formulario (§12.2). Con él desaparece la captura 55, el botón que el teclado tapaba, y la captura 53c, la promesa de un correo que no sale.

Lo que entra: el administrador cambia el correo de una cuenta desde el panel con `PATCH /api/admin/users/:id` y `{ email }` (§8.5), como en `twilightstruggle` (`ai/src/pvp/admin.ts` l. 212 a 235). Reglas: el correo se normaliza (`trim` y minúsculas); ni el viejo ni el nuevo pueden ser `ADMIN_EMAIL` (400 `admin_email_fijo`), porque dar ese correo a una cuenta confirmada la haría administrador raíz (`isRootAdmin`, `adminUsers.ts` l. 21 a 26); si otra cuenta ya lo usa, 409 `correo_ocupado`; `email_verified` queda en `true`, porque el administrador responde de la dirección; no se cierra ninguna sesión, porque el cambio lo pide el jugador; no sale ningún correo, ni a la dirección vieja ni a la nueva; y cada cambio escribe una fila en `admin_audit` con el correo viejo y el nuevo. Las `cs_device` de esa cuenta dejan de reconocerla porque llevan el HMAC del correo viejo: la siguiente entrada buena la reemite.

### 5.6 La enumeración por el tiempo y el cierre ordenado

Hoy el registro y la recuperación esperan a Resend solo en una rama (mapa 01 §5). `advanced.backgroundTasks.handler = mailQueue.track` lo cierra: ninguna respuesta espera al correo. Medido con un correo de 250 ms y 41 muestras: recuperar, 4,0 frente a 4,6 ms (sin la opción, 5,6 frente a 255,6); registrarse, 85,8 frente a 80,7 (X-15). El precio, que la pantalla diga «enviado» antes de saber si salió, lo cubren `Send it again` y `email_log` (§9.2).

`mailQueue` (`apps/api/src/mailQueue.ts`) guarda cada promesa en un `Set` y la quita al resolverse; `index.ts`, al recibir `SIGTERM`, espera a `mailQueue.drain()` como mucho `MAIL_SHUTDOWN_GRACE_MS` (10.000) antes de cerrar (D-15; H-02; O-18). `mailer.send` apunta la fila de `email_log` con `status = 'queued'` antes de llamar a Resend, así que un correo perdido en un despliegue se ve como `queued` que nunca pasó a `sent`. El `Set` y los 10 s no los midió ningún juez: los fija `mailQueue.test.ts`. `enumTiming.test.ts` mide el registro y la recuperación con un `Mailer` de 250 ms y exige menos de 30 ms de diferencia entre ramas.

### 5.7 Los dos correos, enteros

El pie de los dos, sin raya (la de `emails.ts` l. 54 se quita). El botón toma el `accent` de la web y no el índigo `#4f46e5` (mapa 05 §9). Entre corchetes, el título y el botón del HTML; el texto plano es el que sigue, tal cual.

```
(correo) verify_signup
Subject: Confirm your Cycling Star email
[Confirm your email · Confirm my email]

Confirm this address to finish creating your Cycling Star account.

Open this link and tap the button (it expires in 24 hours):
<APP_URL>/verify-email#token=<token>

If you did not create an account, ignore this email and nothing will happen.

Cycling Star · a fictional cycling-manager game.
This is an account email. Cycling Star never sends newsletters or game emails.
```

```
(correo) reset_password
Subject: Reset your Cycling Star password
[Reset your password · Choose a new password]

Someone asked to reset the password of your Cycling Star account.

Open this link to choose a new one (it expires in one hour):
<APP_URL>/reset-password#token=<token>

Saving a new password signs you out on every device.
If it was not you, ignore this email: your password stays as it is.

Cycling Star · a fictional cycling-manager game.
This is an account email. Cycling Star never sends newsletters or game emails.
```

`verify_signup` sale al registrarse, al pedir otro enlace y al entrar sin confirmar; `reset_password`, al pedir recuperar para una cuenta que existe. Las plantillas son `verifyEmailEmail` y `resetPasswordEmail` de hoy (`emails.ts` l. 92 y 66) con el enlace y el texto nuevos. Se borran `changeEmailConfirmationEmail` (l. 118) y `stageReadyEmail` (l. 153) con sus tres tests (D-00c). Los ocho correos restantes de §G.9 (`verify_new_address`, `approve_change`, `password_changed`, `email_changed`, `account_deleted`, `signup_existing`, `new_sign_in`, `change_to_taken`) no se escriben: `password_changed` y `new_sign_in` pasan a ser avisos (§13), y los demás desaparecen.

---

**Injertos aplicados.** I-03 (§5.4), I-04 (§5.2), I-07 (§5.1 y §5.4: `revokeSessionsOnPasswordReset`, `storeIdentifier`, `backgroundTasks`). I-14 y I-15, no aplicados: son el correo `email_changed` con su deshacer, `signup_existing`, `new_sign_in` por correo y el cambio de correo con contraseña, y el dueño los retiró (`00-encargo.md` §9.2, punto 9, y §9.3); de I-14 queda `new_sign_in` como aviso.

**Objeciones resueltas.** O-04 (§5.3 y §5.7: los correos sin tope ya no existen; los dos que quedan van dentro de L5 y del presupuesto, §7), O-09 (§5.1), O-16 (§5.4), O-17 (§5.5: sin cambio de correo de autoservicio no hay aprobación que un escáner pulse), O-18 (§5.6).

**Huecos rellenados.** H-02 (§5.6), H-06 (§5.5: sin autoservicio la enumeración por el cambio de correo desaparece), H-08 (§5.2, escrito como no comprobado).

**Decisiones de esta sección.**

- **5-a**, se escriben dos correos y no diez (`00-encargo.md` §9.3, punto 1). Manda sobre D-16, D-14 y §G.9.
- **5-b**, el cambio de correo de autoservicio se retira entero (§9.3): sin `change-email`, sin `ApproveEmail` ni `UndoEmail`, sin las dos rutas de `/api/account/*`. Manda sobre D-14.
- **5-c**, el cambio hecho por un administrador deja `email_verified` en `true`, no cierra sesiones, no manda correo y escribe `admin_audit`; rechaza `ADMIN_EMAIL` como viejo y como nuevo, como `twilightstruggle` (`admin.ts` l. 215 a 217).
- **5-d**, recuperar encola `password_changed` por push a todas las suscripciones y después las borra; cambiar la contraseña lo encola a las de las otras sesiones antes de cerrarlas. Es la lectura de `00-encargo.md` §9.3 («van por push si el jugador lo tiene»).
- **5-e**, `CheckInbox` gana la línea `Already have an account with this email? No link is sent: log in or reset your password.`, que sustituye al correo `signup_existing`.
- **5-f**, `LEGACY_LINK_GRACE_DAYS` se lee como el plazo para quitar el código de los enlaces viejos: con tokens de una hora, ninguno vive tanto.
- **5-g**, `Send me a new link` de `VerifyEmail` responde siempre `If that address has an account waiting for confirmation, a new link is on its way.`

**Propuesto para el glosario.**

- Fuera de §G.9: `verify_new_address`, `approve_change`, `password_changed` (correo), `email_changed`, `account_deleted`, `signup_existing`, `new_sign_in` (correo), `change_to_taken`. Fuera de §G.4: `POST /api/account/undo-email-change` y `approve-email-change`. Fuera de §G.11: `ApproveEmail`, `UndoEmail`. Fuera de §G.6: `EMAIL_CHANGES_PER_DAY`, `UNDO_EMAIL_CHANGE_H`, `SIGNUP_EXISTING_EVERY_H`, `CHANGE_TO_TAKEN_EVERY_H`. Fuera de §G.13: `emailChange.test.ts`. Fuera de §G.5: `onExistingUserSignUp`.
- `user.changeEmail.enabled: false` en §G.5.
- En §G.10, dos avisos de seguridad: `password_changed` (al recuperar, a todas las suscripciones; al cambiar la contraseña, a las de las otras sesiones) y `new_sign_in` (§7.5).
- Errores del panel: 400 `admin_email_fijo`, 409 `correo_ocupado`.
- Textos (pantalla): `Confirm your email` / `Tap the button to finish creating your account.` / `Confirming…` / `This link is incomplete.` / `Open it again from the email, or ask for a new one.` / `Enter your email and we'll send you a new one.` / `If that address has an account waiting for confirmation, a new link is on its way.` / `Check your email` y las líneas de `CheckInbox` de §5.3 / `If <email> has an account, we've sent a link to reset your password. It expires in one hour.`

**Dudas para el ensamblador.**

- §13 (L2): los textos de los avisos `password_changed` y `new_sign_in`, si respetan el silencio de la noche y si cuentan en `NOTICE_DAILY_CAP`. Recomendación de este lote: fuera del tope y fuera del silencio (son raros, como mucho `NEW_SIGN_IN_EVERY_H` uno por hora, y su valor es llegar a tiempo), sin interruptor (DD-16 A), `path` a `/account/devices`. Textos propuestos: `Your password was changed` / `If it wasn't you, reset it now.` y `New sign-in to your account` / `<deviceLabel> signed in just now. If it wasn't you, reset your password.`
- §18 (L2): el PR 8 (`enlaces`) ya no lleva cambio de correo; el PR que quita el código de los enlaces viejos a los 7 días no está en §G.14.
