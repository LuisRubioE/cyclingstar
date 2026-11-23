# E4 · Propuesta `jugador`: la cuenta vista desde un teléfono

Lente `jugador`, 19 de noviembre de 2026, sobre `2a29e6d`. Hechos: los cinco mapas («mapa 0n §x») y las
capturas de `capturas/` (por su número). «(pantalla)» y «(correo)» marcan el literal que verá el jugador.
«Medido» es de un mapa; «estimado», contado por mí sobre las capturas o deducido del código.

## 0. Resumen

**Cada acto de la cuenta termina con una frase verdadera en la pantalla, y cada cambio que importa, con
un correo a quien tenía la cuenta.** El ciclo de la identidad ya existe (mapa 01 §1); falla lo que siente
quien lo usa: el límite que dice «contraseña mala» con la buena (35), la contraseña nueva que deja en un
`Log in` mudo (47), la cuenta borrada que acaba en la portada sin una palabra (65), el enlace reabierto que
dice `you are signed in` sin sesión (22), la dirección vieja que no se entera de que se fue (mapa 05 §9).
El diseño sale de **ocho recorridos** contados en campos, toques, correos y esperas, antes y después (§1.2).

**Lo que lo distingue de lo obvio**: empieza por la persona de vacaciones con un iPhone y no por los
tokens. **La web es el canal de todo lo que el juego tiene que decir; el aviso del navegador solo lo
adelanta** a quien puede recibirlo, porque en un iPhone en una pestaña no llega ninguno (mapa 02 §6). Y el
modo ausencia no es un interruptor de avisos: es la pantalla que dice a cada jugador, con sus datos, qué se
para mientras no está (su plan acaba el día tal, sus ofertas caducan a los cinco días reales, como agente
libre no correrá) y se lo resume al volver.

**Resuelve** los defectos de pantalla del mapa 05 y los huecos del mapa 01 con su coste para el jugador, la
fecha de nacimiento que el navegador rellena de un toque, `Devices`, el modo ausencia, avisos con tope y
silencio, `Privacy` verdadera, exportar y el borrado atómico. **Deja** el contacto (§12), el mundo con el
ausente (E7), el texto del aviso de etapa (E2) y la app (§8.4). **El precio**: el registro pasa de 2 campos
a 5; todo lo demás baja o queda igual.

## 1. Diagnóstico

### 1.1 Lo que ve el jugador hoy, por gravedad

| #   | Lo que pasa                                                                                                                                                                 | Dónde                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Quien recupera la cuenta no echa al intruso: recuperar no cierra sesiones y la web no deja cerrar las otras                                                                 | mapa 01 §2 (medido); mapa 05 §7                                              |
| 2   | El límite se pinta como contraseña mala; `ForgotPassword` dice «enviado» con un 429                                                                                         | 35, 37; `Login.tsx` l. 61; `ForgotPassword.tsx` l. 47; `app.ts` l. 213 a 217 |
| 3   | Ningún correo dice que algo cambió (contraseña, correo, borrado, registro con un correo ajeno)                                                                              | mapa 05 §9; 57, 58                                                           |
| 4   | Pantallas que mienten o callan: `you are signed in` sin sesión, `/login` mudo, portada muda, correo prometido que no sale, `CheckInbox` que se pierde al recargar           | 22, 47, 65, 53c; mapa 05 §3                                                  |
| 5   | Enlaces de una hora: el correo leído al día siguiente es un registro fallido que manda a `Log in`                                                                           | mapa 01 §2; 23                                                               |
| 6   | La cuenta, al fondo: empieza a 620 px, y con el teclado el botón de `Update email` queda 122 px por debajo                                                                  | 50, 55                                                                       |
| 7   | Errores crudos y dobles: `Invalid email or password` sin punto, dos «mínimo 8», `Invalid password` con la actual vacía                                                      | mapa 05 §3, §4, §7; 60c                                                      |
| 8   | Sin salida para quien se queda fuera; `Privacy` promete un «Ask» sin destinatario                                                                                           | 02; mapa 03 §5                                                               |
| 9   | Lo que no se ve y cuesta: cuatro frases falsas en `Privacy.tsx`, el correo en las URL de los logs, el tope de 100 correos al día de Resend (el 101 es alguien que no entra) | mapa 03 §4 y §5; mapa 02 §3                                                  |

### 1.2 Los ocho recorridos

Campos y toques contados sobre las capturas y el código (estimado, sin contar teclear ni desplazar);
correos medidos (mapa 05 §8 y §9).

| Recorrido                          | Hoy: campos · toques · correos · lo que falla                       | Propuesta                                                               |
| ---------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| R1 Registrarse y entrar            | 2 · 4 · 1 · enlace de 1 h; `CheckInbox` se pierde al recargar       | 5 (1 toque con autorrelleno de la fecha) · 4 · 1 · enlace de 24 h       |
| R2 Olvidar la contraseña           | 5 · 6 · 1 · `/login` mudo; las sesiones viejas siguen               | 3 (el correo viaja desde `Login`) · 6 · 2 · todas las sesiones cerradas |
| R3 Irse de vacaciones              | nada que hacer · sesión caída a los 7 días · nadie dice qué se para | 0 · 3 · 0 · la pantalla dice qué pasará; vuelve con sesión              |
| R4 Cambiar de correo               | 1 · 5 · 2 · la vieja no se entera; destino ocupado, promesa falsa   | 1 · 5 · 3 (el «ha cambiado» a la vieja) · ningún texto promete de más   |
| R5 Volver tras un mes sin ausencia | sesión caída; nadie dice qué hizo el entrenador                     | sesión viva hasta 30 días; `Welcome back` con lo que se paró            |
| R6 Perder el teléfono              | solo cambiando la contraseña (3 campos)                             | 0 · 3 (`Account › Devices › Sign out`) · 0                              |
| R7 Chocar con el límite            | `Wrong email or password.` con la buena                             | `Too many attempts. Try again in 4 minutes.`                            |
| R8 Borrar la cuenta                | 1 · 3 · 0 · portada muda                                            | 1 · 4 (con «descarga antes») · 1 · despedida escrita                    |

## 2. Principios

| Principio                                                        | Consecuencia en el diseño                                                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1. Ningún final mudo                                             | toda acción que acaba en otra pantalla lleva allí un `Notice` `good` con `role="status"` (`docs/visual.md` §4.7) |
| 2. Lo que cambia la cuenta se cuenta por correo a quien la tenía | cuatro correos nuevos, todos de cuenta, ninguno de juego (`00-encargo.md` §9.1)                                  |
| 3. Un límite dice cuánto esperar y nunca se disfraza             | un traductor de errores único que lee `Retry-After` (§6.1)                                                       |
| 4. La web dice todo; el aviso solo adelanta                      | cada aviso tiene su gemelo en la web (§8.1), y el iPhone no pierde nada salvo la prisa                           |
| 5. Un tercero nunca bloquea al dueño                             | el límite por cuenta respeta el aparato conocido (`cs_known`, §6)                                                |
| 6. Un campo menos vale más que una comprobación más              | `Show` en lugar de `Repeat it`; el correo que viaja de `Login` a `ForgotPassword`; la fecha con `autocomplete`   |
| 7. Cada pantalla de la cuenta cabe sobre el teclado              | `Account` pasa a lista con subpáginas (§5)                                                                       |
| 8. Lo que la web dice de los datos es verdad el día que sale     | `Privacy.tsx` se reescribe en el PR que hace verdad cada frase (§16)                                             |

## 3. El registro y la edad

```
Create your account / Start building your rider.                                (pantalla)
Email · Password [Show] "At least 8 characters."
Date of birth  [Day] [Month] [Year]  "We only use it to check you're old enough to play."
[Create account]
By creating an account you agree to the Terms and the Privacy notice.
Already have an account? Log in
```

| Pieza                      | Diseño                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La fecha                   | Tres campos numéricos (`inputmode="numeric"`; `autocomplete` `bday-day`, `bday-month`, `bday-year`; 64, 64 y 96 px en una fila a 360). Un `<input type="date">` en Android abre el mes en curso y llegar a 2004 son unos cinco toques (estimado, sin aparato); con tres campos, el navegador que tenga la fecha la rellena de un toque, y si no son ocho cifras. Es `DateField`, componente nuevo con su PR, su test por estado y su sitio en `/_ui` (`docs/visual.md` l. 1329 a 1333). Alternativa, D-10                                          |
| `Show`                     | Un `Button` `quiet` de 44 × 44 dentro del `Field` (prop nueva `reveal`) que alterna `Show` y `Hide`. En las cinco contraseñas de la cuenta; quita `Repeat it` de `ResetPassword`                                                                                                                                                                                                                                                                                                                                                                   |
| Las condiciones            | Sin casilla: la línea bajo el botón, con `TextLink` a `/terms` y `/privacy`. `/terms` no existe: se crea con su enlace en el pie (`App.tsx` l. 393 a 418) y dice como mínimo la edad de 16, que es ficción, que el corredor y el equipo pasan al juego si la cuenta se borra o se abandona, y que la cuenta puede cerrarse. **Su texto y si basta la línea, a confirmar con un abogado** (D-12). Hasta entonces `TERMS_VERSION = '2026-11-draft'` y la página dice `These terms are a draft and will be reviewed before public launch.` (pantalla) |
| La regla, en el servidor   | Entra si `birth_date <= hoy UTC menos 16 años` (el 29 de febrero cuenta como 1 de marzo en año no bisiesto). Gancho `before` de `/sign-up/email` en `auth.ts`, junto al de `delete-user` (l. 175 a 193), que responde antes de mirar si el correo existe: no delata nada. El campo, en `user.additionalFields` (l. 150 a 173) como `birthDate`, obligatorio                                                                                                                                                                                        |
| Quien no tiene 16          | `Sorry, you can't play yet` / `Cycling Star is for people aged 16 or over. We have not kept anything you typed.` / `Back to the home page` (pantalla). No se crea nada; `cs.ageGate` en `sessionStorage` deja esta pantalla en lugar del formulario hasta cerrar la pestaña. La edad no se anuncia junto al campo, para no invitar a teclear otra. Si basta, **a confirmar con un abogado** (`agenda.md` §3.7)                                                                                                                                     |
| Qué se guarda              | `users.birth_date date` entera (los 16 se cumplen un día concreto, y si la edad mínima baja, la decisión reversible de `agenda.md` §3.7, no hay que volver a preguntar), `terms_version` y `terms_accepted_at`. Nadie la enseña; va en la exportación. La mínima, D-11                                                                                                                                                                                                                                                                             |
| Las cuentas que ya existen | Con `birth_date` nula, `Private` (`App.tsx` l. 318 a 325) enseña antes de nada `One more thing` / `We now ask everyone for their date of birth. Cycling Star is for people aged 16 or over.` / `DateField` / `Save and continue` (pantalla). La API la respalda: toda escritura de `/api/me/*` y `/api/riders/*` da 403 `BIRTH_DATE_REQUIRED`. Con menos de 16: `Cycling Star is for people aged 16 or over, so this account can't stay open. You can delete it here.` (pantalla) y el borrado de §11.3. Lo demás, **a confirmar con un abogado**  |

| Error                                   | Dónde                                    | Texto (pantalla)                               |
| --------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Falta un trozo de la fecha              | página, foco al primero vacío            | `Enter your date of birth.`                    |
| Fecha imposible, futura o antes de 1900 | página y servidor (`INVALID_BIRTH_DATE`) | `Enter a real date of birth.`                  |
| Menos de 16 años cumplidos              | servidor (`UNDER_MINIMUM_AGE`)           | `Sorry, you can't play yet` (arriba)           |
| Contraseña de más de 128                | página (hoy solo el servidor, 18)        | `Your password can be at most 128 characters.` |

## 4. Verificación, recuperación y cambio de correo

### 4.1 Los tokens

| Token                     | Hoy (mapa 01 §2)                        | Propuesta                                                                                                                  |
| ------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Verificación del registro | JWT de 147 car., 1 h, reutilizable      | **24 h** (`emailVerification.expiresIn: 86400`): el correo se lee al día siguiente. Reabierto no abre sesión (§4.2)        |
| Recuperación              | 24 car., 1 h, un uso, en claro, gemelos | 24 car., 1 h, un uso, **con hash** (`verification.storeIdentifier: 'hashed'`); **usar uno borra los demás** de ese usuario |
| Aprobación desde la vieja | JWT, 1 h, cada clic reenvía             | 24 h, como todos los JWT (abajo), dichas en el correo; un segundo clic no manda otro correo                                |
| Confirmación de la nueva  | JWT, 1 h                                | 24 h; en 1.7.26 ya no abre sesión y su segundo uso es `INVALID_TOKEN` (mapa 01 §8)                                         |

Una sola opción, `emailVerification.expiresIn`, fija la vida de **todos** los JWT de correo (leído en
1.6.25: `email-verification.mjs` l. 28, 108 y 196; `update-user.mjs` l. 457, 474, 491 y 505), así que los del
cambio de correo también pasan a 24 h; la aprobación sigue exigiendo el buzón viejo, y separar las dos vidas
pediría código propio. Los gemelos de recuperación siguen valiendo hasta que se usa uno porque quien pide dos
veces abre el que le llegue antes, y anular el primero al pedir el segundo le daría un enlace muerto. Al usar
uno mueren todos: `emailAndPassword.onPasswordReset` (`password.mjs` l. 168) borra las filas
`reset-password:*` cuyo `value` es ese usuario.

### 4.2 Recuperar (R2) y verificar (R1)

| Paso                           | Pantalla y texto (pantalla)                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Forgot your password?`        | Lleva el correo tecleado en `Login` por el estado del router (nunca en la URL, que acaba en los logs)                                                                                                                                                                                                                           |
| `Send me a link`               | **Mira la respuesta**: un 429 da el texto de §6.1; si no, la confirmación de hoy (42) y `Send another link`, deshabilitado 60 s con su porqué: `You can ask again in 0:42.`                                                                                                                                                     |
| `Choose a new password`        | Un campo, `New password` con `Show`                                                                                                                                                                                                                                                                                             |
| Guardar                        | Cierra **todas** las sesiones (`revokeSessionsOnPasswordReset: true`), pone a cero el límite por cuenta, manda `Your Cycling Star password was changed` y lleva a `/login` con `Password saved` / `Log in with your new password. You have been signed out everywhere else.`                                                    |
| Enlace reabierto (hoy 48)      | `This link has expired or has already been used.` / `If you just set a new password, log in with it.` y los botones `Log in` y `Ask for a new link`                                                                                                                                                                             |
| `CheckInbox`                   | Guarda el correo en `sessionStorage` (`cs.pendingEmail`): sobrevive a recargar y a volver. `We have sent a link to <correo>. Open it to confirm your email and start playing. It expires in 24 hours.` / `Nothing there? Check the spam folder.` / `Send it again` / `Wrong address? Start again` / `Already confirmed? Log in` |
| `VerifyEmail`, con sesión      | Pregunta por la sesión antes de hablar. `Email confirmed` / `You're in. Let's create your rider.` / `Continue`                                                                                                                                                                                                                  |
| `VerifyEmail`, sin sesión (22) | `Email confirmed` / `Log in to start playing. If you opened the link from your email app, log in in your usual browser.` / `Log in`. Lo del cliente de correo: por lo que sé, Gmail en iOS abre los enlaces en su propio navegador con sus cookies; **no lo he probado en un teléfono**                                         |
| Caducado o malo (23, 24)       | El texto de hoy más un campo `Email` y `Send me a new link` (`send-verification-email` sin sesión, que ya iguala a 500 ms, mapa 01 §1). Hoy manda a `Log in`, que solo reenvía con la contraseña buena                                                                                                                          |

### 4.3 Cambiar el correo (R4)

Sin pedir la contraseña: la aprobación ya exige el buzón viejo, y la contraseña sería un campo más que no
frena a quien ya tiene ese buzón.

| Paso                             | Texto (pantalla)                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pedido (destino libre u ocupado) | `Check <viejo> for an approval link. It expires in 24 hours.` / `If nothing arrives in 10 minutes, the new address may already be taken by another account.` |
| Cuenta antigua sin confirmar     | `We have sent a confirmation link to <nuevo>. Your email changes when you open it.`                                                                          |
| Aprobado desde la vieja          | `Change approved` / `One step left: open the link we sent to <nuevo>. Your email changes only then.`                                                         |
| Confirmado desde la nueva        | `Email changed` / `Your account now uses <nuevo>. We have told <viejo>.`                                                                                     |
| La cuenta de `ADMIN_EMAIL`       | `This account's email is set in the server settings and can't be changed here.`                                                                              |

El caso ocupado ya no promete un correo que no sale (53c) ni dice si la dirección está cogida: lo sugiere a
los diez minutos, lo mismo que vería quien tiene un filtro de spam. El correo del administrador raíz se
cambia en Railway: quien tenga ese buzón tiene el panel (`docs/ops.md` l. 131 a 134).

### 4.4 Los correos, enteros

Pie común sin raya: `Cycling Star · a fictional cycling-manager game.` / `This is an account email. Cycling
Star never sends newsletters or game emails.` El botón toma el `accent` de la web y no el índigo `#4f46e5`
(mapa 05 §9). Entre corchetes, título y botón del HTML.

```
(correo) Confirm your Cycling Star email        [Confirm your email · Confirm my email]  registro, reenvío
Confirm this address to finish creating your Cycling Star account.
Open this link (it expires in 24 hours): <enlace>
If you did not create an account, ignore this email and nothing will happen.
(correo) Confirm your new Cycling Star email    [Confirm your new email · Confirm this address]  a la NUEVA
Your Cycling Star account is moving to this address.
Open this link to finish the change (it expires in 24 hours): <enlace>
If you did not ask for this, ignore this email and nothing will change.
(correo) Approve the new email of your Cycling Star account   [Approve the email change · Approve the change]  a la VIEJA
Someone signed in to your Cycling Star account asked to move it to <nuevo>.
Open this link to approve it (it expires in 24 hours): <enlace>
If it was not you, do not open the link, and change your password: someone else is signed in.
(correo) Reset your Cycling Star password       [Reset your password · Choose a new password]
Someone asked to reset the password of your Cycling Star account.
Open this link to choose a new one (it expires in one hour): <enlace>
Saving a new password signs you out on every device.
If it was not you, ignore this email: your password stays as it is.
(correo) Your Cycling Star password was changed [Password changed]  NUEVO, al recuperar y al cambiar
The password of your Cycling Star account was changed on <fecha y hora UTC>.
If it was you, there is nothing to do. If it was not you, reset it now: <enlace a /forgot-password>
(correo) Your Cycling Star email was changed    [Email changed]  NUEVO, a la VIEJA
Your Cycling Star account now uses <nuevo>, so we will not write to this address again.
If it was you, there is nothing to do. If it was not you, someone can read this mailbox: change its password.
(correo) Your Cycling Star account was deleted  [Account deleted]  NUEVO
Your Cycling Star account was deleted on <fecha y hora UTC>. Your rider and your team stay in the world,
run by the game. This address is free to use on a new account.
(correo) Someone tried to sign up with your email   [You already have an account]  NUEVO, onExistingUserSignUp
Someone tried to create a Cycling Star account with this address, which already has one.
If it was you, log in: <enlace a /login>. Forgot your password? <enlace a /forgot-password>
If it was not you, ignore this email.
```

### 4.5 La enumeración por el tiempo

Las tres rutas que delatan esperan al envío en una sola rama (mapa 01 §5). Se cierra con
`advanced.backgroundTasks.handler` (`create-context.mjs` l. 216, ya en 1.6.25): ninguna respuesta espera a
Resend. Para el jugador además es más rápido: el registro pasa de unos 341 ms a unos 84 con un correo de
250 ms (cifras del mapa 01, con correo simulado). El precio, que la pantalla diga «enviado» antes de saber
si salió, lo cubren `Send it again` con su espera y `email_log` (§10).

## 5. Las sesiones

`Account › Devices` (R6), y debajo todo lo de la sesión:

```
Devices / You're signed in on 3 devices.                                         (pantalla)
Chrome on Android     [This device]   Active now · Signed in 12 Nov
Safari on iPhone      [Sign out]      Active 2 days ago · Signed in 3 Nov
Firefox on Windows    [Sign out]      Active 9 days ago · Signed in 20 Oct
[Sign out everywhere else]   It can take up to a minute for another device to notice.
```

| Pieza                   | Diseño                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Duración                | **30 días renovados cada día de uso** (`expiresIn: 2592000`, `updateAge: 86400`). Hoy 7: quien vuelve de dos semanas entra otra vez con la contraseña en otro sitio. 30 casa con la regla del mes                                                                                                                                                                                                                                                                                                                                                                                    |
| Ausencia                | Al declararla, la sesión de ese aparato se alarga hasta la vuelta más 7 días (§9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `cookieCache`           | 60 s: quita una lectura de `sessions` y `users` por petición (mapa 01 §3; `docs/retransmision.md` l. 6293) y deja que cerrar otro aparato tarde un minuto como mucho, que se dice                                                                                                                                                                                                                                                                                                                                                                                                    |
| `cs_viewer`             | No cambia (90 días): solo restringe, y cerrar otra sesión no necesita borrarla                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| La IP de la sesión      | **No se guarda**: un `databaseHooks.session.create.before` la deja nula. Nadie la lee (mapa 03 §1) y los límites miran la de la petición. Que el gancho tenga esa forma en 1.7.26, **a comprobar** en el PR                                                                                                                                                                                                                                                                                                                                                                          |
| El token                | No llega a la web: `GET /api/me/devices` envuelve `list-sessions` y da un id opaco (8 caracteres del SHA-256 del token), nunca el token, la IP ni el agente crudo (hoy sí, mapa 01 §1)                                                                                                                                                                                                                                                                                                                                                                                               |
| `Devices`: lo que se ve | El navegador y el sistema, de `user_agent` (función pura `deviceLabel`, con `Unknown browser` de reserva); «Active» es `updated_at` y «Signed in», `created_at`. **Sin IP**: a casi nadie le dice nada, y un país pediría geolocalizar cada sesión (D-6)                                                                                                                                                                                                                                                                                                                             |
| `Devices`: cerrar       | `Sign out` en una fila llama a `revoke-session` sin confirmar (se deshace entrando); `Sign out everywhere else`, a `revoke-other-sessions`, con confirmación en la tarjeta: `Sign out of 2 other devices?` / `Sign out` / `Cancel` (pantalla)                                                                                                                                                                                                                                                                                                                                        |
| `Account` como lista    | `/account` pasa a lista de `ActionRow`, la cuenta arriba y el juego abajo, con su valor: `Email` (`you@example.com`), `Password` (`Changed 12 Nov`), `Devices` (`3 signed in`), `Notifications` (`On for this browser`), `Away` (`Not set`), `Spoiler protection`, `Appearance`, `Your data` (`Download a copy`), `Sign out`, `Delete account` (pantalla). Cada fila abre `/account/<tarea>` con su `PageHeader` y el formulario arriba: el botón queda sobre el teclado (estimado: el campo de `55`, hoy a 376 px, quedaría hacia 150). Un toque más por tarea; la alternativa, D-7 |

## 6. Los límites de intento

Tres capas: **por IP, Fastify, como hoy** (10 cada 5 minutos por ruta de credenciales, `security.ts` l. 54 a
68); **el limitador de `better-auth`, apagado** (`rateLimit: { enabled: false }`), porque sin cabecera de IP
o con dos mete a todo el mundo en un cubo de 3 cada 10 s (mapa 01 §4.2, serie E) y un CDN delante cerraría
el login a todos, y así deja de importar si Railway pone `NODE_ENV`; y **por cuenta, nuestro, en Postgres**
(`auth_limits`, §13), que sobrevive al despliegue.

| Ruta y qué se cuenta              | Clave                                                                                                                 | Cifra y ventana                         | Al pasarse                                                                                                                                                                                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sign-in/email`, fallos           | correo normalizado, exista o no                                                                                       | 10 en 15 min                            | 15 min cerrado a los aparatos **sin** `cs_known` de esa cuenta; 429 `ACCOUNT_LOCKED`                                                                                                                                                                                         |
| `request-password-reset`          | correo normalizado                                                                                                    | 3 por hora                              | 200 igual y sin enviar: no delata                                                                                                                                                                                                                                            |
| `send-verification-email`         | correo normalizado                                                                                                    | 3 por hora                              | igual                                                                                                                                                                                                                                                                        |
| `change-email`                    | usuario                                                                                                               | 3 en 24 h                               | 429 con espera                                                                                                                                                                                                                                                               |
| `change-password`, actual mala    | usuario                                                                                                               | 5 en 15 min                             | 429 con espera                                                                                                                                                                                                                                                               |
| `DELETE /api/me`, contraseña mala | usuario                                                                                                               | 5 en 15 min                             | 429 con espera                                                                                                                                                                                                                                                               |
| `GET /api/me/export`              | usuario                                                                                                               | 3 en 24 h                               | 429 con espera                                                                                                                                                                                                                                                               |
| `cs_known` (todas)                | al entrar bien, `v1.<userId>.<emitida>.<HMAC>` como `cs_viewer` (`viewerCookie.ts` l. 27 a 31)                        | 180 días, hasta 5 cuentas por navegador | el bloqueo por cuenta no toca a quien la trae: quien reparte intentos entre mil IP cierra los aparatos nuevos, no el teléfono del jugador. No se borra al cerrar sesión (sí al borrar la cuenta), y por eso va en `Privacy`. Recuperar la contraseña pone el contador a cero |
| Qué IP vale                       | la de Fastify con `trustProxy: true`, la primera de `X-Forwarded-For`, que Railway reescribe (mapa 01 §4.3, probable) |                                         | un log al arrancar apunta cuántas IP trae la cabecera en la primera petición; un test con dos IP fija que la clave sigue siendo una IP y no un cubo común                                                                                                                    |

### 6.1 Lo que ve el jugador (R7)

Un traductor, `authErrorText(error, status, retryAfterS)` en `apps/web/src/domain/authErrors.ts`, para las
seis páginas de entrada y las subpáginas de `Account`. El 429 de Fastify gana `message` y `retryAfterS`. El
botón queda deshabilitado con su porqué (`docs/visual.md` §4.1) y la cuenta atrás: `You can try again in
3:58.` (pantalla).

| Caso                   | Texto (pantalla)                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| 429 por IP             | `Too many attempts from this connection. Try again in 4 minutes.` (o `in 45 seconds`)        |
| 429 `ACCOUNT_LOCKED`   | `Too many failed attempts on this account. Try again in 15 minutes, or reset your password.` |
| 401 de `sign-in`       | `Wrong email or password.` (sustituye a `Invalid email or password`)                         |
| Contraseña actual mala | `That's not your current password.` (vacía: `Enter your current password.`, sin llamar)      |
| Sin red                | `Can't reach Cycling Star. Check your connection and try again.`                             |
| Otro                   | `Something went wrong. Try again in a minute.`                                               |

## 7. Las rutas abiertas y las dependencias

| Qué                                           | Diseño                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rutas cerradas (404 en `routes/authProxy.ts`) | `verify-password` (60 intentos por minuto con una sesión robada, mapa 01 §1), `update-user` (`name` e `image` sin tope; nadie los lee), `update-session`, `list-accounts`, `list-sessions` (la sustituye `/api/me/devices`), `delete-user` (la sustituye `DELETE /api/me`) y las de OAuth |
| Subidas                                       | `better-auth` 1.7.26 y `fastify` 5.12.8, en verde y sin migración (mapa 01 §8), con `zod` 4.6.7 y `fast-uri` al día con ellas. Antes que cualquier opción nueva, para escribirlas contra 1.7                                                                                              |
| El administrador raíz                         | Su correo no cambia desde la web (§4.3) y `Devices` le enseña dónde está abierta su sesión. El resto es de la lente `atacante`                                                                                                                                                            |

## 8. Los avisos

### 8.1 El catálogo

Por el navegador y la app, nunca por correo (§9.1 del encargo); construidos solo con `PreStageInfo`, la
lista de salida o datos de la cuenta (D-42). Cada uno con su gemelo en la web, que es lo que ve el iPhone.

| Aviso          | Disparador                                                                | Texto (aviso)                                                                                                         | Tope                   | De serie | Gemelo en la web                                |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------- | ----------------------------------------------- |
| `stage_digest` | 19:00 locales, si hay etapas con su corredor en la salida listas sin ver  | `3 stages are ready to watch` / `Race France · your rider is on the start list`; con una, `stageReadyNotice` tal cual | 1 al día               | sí       | `Ready to watch` (E2, `retransmision.md` §11.4) |
| `stage_ready`  | cada etapa lista de una carrera seguida                                   | `Stage 7 of Race France is ready to watch` / `187 km · mountain stage`                                                | 1 por carrera cada 6 h | no       | la misma                                        |
| `plan_ending`  | el plan vivo acaba en 4 días de juego (un día real)                       | `Your training plan ends tomorrow` / `After that your coach picks <rider>'s training.`                                | 1 por plan             | sí       | el aviso de la portada (`PLAN_END_WARN_DAYS`)   |
| `away_warning` | 20 y 27 días reales sin visita ni ausencia (solo con la regla de E7 viva) | `10 days left` / `If you don't visit by 19 Dec, your coach takes over <rider>. One visit is enough.`                  | 2 por ausencia         | sí       | `Welcome back` y la subpágina `Away` (§9.3)     |
| `away_over`    | llega la fecha de vuelta                                                  | `Welcome back` / `Your away time is over. Your notifications are on again.`                                           | 1 por ausencia         | sí       | `Welcome back`                                  |

El resumen diario y no una por etapa: con cuatro días de juego por día real, una vuelta da hasta cuatro
«etapa lista» al día, ocho con dos (mapa 02 §10, estimado), y Chrome retira el permiso a webs no instaladas
con muchos avisos y poca visita (mapa 02 §5). **Tope global**: 3 al día por usuario sin contar
`away_warning`. **Silencio**: de 22:00 a 08:00 locales (`users.time_zone`); lo que cae ahí sale a las 08:00.

### 8.2 El permiso y la baja

| Pieza                     | Diseño (los textos, de pantalla)                                                                                                                                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cuándo                    | Nunca al cargar. Un `Notice` `info` tras crear el corredor y al seguir una carrera; `Turn on` es el gesto que piden Firefox y Safari (mapa 02 §5). Cerrarlo lo calla 30 días (`cs.noticeAskedAt`)                                                                                                                                 |
| Tras crear el corredor    | `Know when your stages are ready?` / `We send one notification a day at most, in the evening, when a stage with your rider is ready to watch.` / `Turn on`                                                                                                                                                                        |
| Al seguir una carrera     | `Get a notification when the next stage is ready?` / `Turn on`                                                                                                                                                                                                                                                                    |
| Permiso denegado          | `Notifications are blocked for Cycling Star in this browser's settings.`                                                                                                                                                                                                                                                          |
| `Account › Notifications` | `This browser · Chrome on Android` con su interruptor; una fila `Checkbox` por aviso (`Stages ready (daily, 19:00)`, `Every stage of races you follow`, `Training plan ending`, `Before your coach takes over`); `Quiet hours 22:00 to 08:00 (Europe/Madrid)`; los otros aparatos suscritos con `Remove`                          |
| Baja de un toque          | Cada aviso lleva la acción `Turn off these` (Chrome, Edge y Firefox pintan `actions`), que el service worker convierte en `POST /api/me/notices/<kind>/off` sin abrir nada. Sin acciones (Safari), tocar el aviso abre la página con `?from=notice&kind=<kind>` y arriba `Don't want these? Turn off "Stages ready"` / `Turn off` |

### 8.3 El jugador de iPhone

Ningún iPhone recibe avisos en una pestaña (mapa 02 §6). En un iPhone o iPad (por `navigator.userAgent`,
porque en la pestaña `PushManager` no existe), `Notifications` sustituye los interruptores por:

```
iPhone can't show notifications from a browser tab.                              (pantalla)
On iOS 26 or later you can add Cycling Star to your Home Screen (Share, then Add to Home Screen),
open it from there and turn notifications on in this page.
Everything a notification would tell you is also on your Home page when you open Cycling Star.
```

Abierta desde la pantalla de inicio (`display-mode: standalone`), la subpágina es la normal. Que funcione sin
manifiesto en iOS 26 lo dicen dos fuentes y **no está comprobado en un aparato** (mapa 02 §6). Nada fuera de
esta subpágina: ni `InstallHint` ni un aviso en la portada (alternativas en D-3). Lo que el iPhone no recibe
lo tiene en la web: `Ready to watch`, el aviso del plan de la portada y `Welcome back` (§9.3).

### 8.4 El service worker, el envío, el destripe y la app

| Pieza                   | Diseño                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sw.js` y D-00p         | `apps/web/public/sw.js`, registrado al pulsar `Turn on` (no al cargar), con tres oyentes: `push` (`showNotification` con `title`, `body`, `tag`, `data.url` y la acción de baja), `notificationclick` (abre `data.url` o hace el `POST` de baja) y `pushsubscriptionchange`. **Sin `fetch`, sin Cache API, sin manifiesto ni metas de Apple**: cabe en la CSP de hoy (medido en Chromium, mapa 02 §7) y no instala ni guarda nada, que un test fija (§15). D-00p quitó la web instalable y su cáscara sin red; esto no es ninguna de las dos. La frase de `docs/visual.md` l. 3656 («ni service worker») se corrige como frontera en `docs/cuenta.md`, no en `visual.md`, que edita W5     |
| El envío                | `web-push` 4.0.0 (ESM, sin tipos: un `web-push.d.ts` propio de unas 20 líneas; mapa 02 §8); `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT=https://www.cyclingstar.app` (una URL vale, RFC 8292, sin buzón). `noticeSweep` cada 15 minutos en el servicio `tick` (`index.ts` l. 69 a 98) inserta en `notice_log` antes de enviar (`unique (user_id, kind, ref)`): dos réplicas no duplican. TTL de 12 h; `Topic` igual al `tag` (`stage-<raceId>`, `digest`, `plan`, `away`), para que un aviso sustituya al anterior. Una suscripción que da 404 o 410 se borra, y tras tres fallos seguidos de otro tipo también. Con `away_until` en el futuro no sale nada salvo `away_over` |
| Ningún aviso destripa   | `stage_digest` y `stage_ready` salen de `stageReadyNotice` (`pageTitle.ts` l. 71 a 83) y de contar etapas listas, que no depende del resultado; los demás usan el nombre del corredor y fechas. La URL y el `tag` salen del `raceId` de fuera (mapa 02 §10). El canario (`spoilerCanary.test.ts` l. 206) pasa a mirar `noticePayload()`, y `stageReadyEmail` se borra                                                                                                                                                                                                                                                                                                                      |
| El contrato para la app | `push_targets` guarda `channel` (`webpush`, `fcm`, `apns`), la credencial del canal en `jsonb` y una etiqueta de aparato. El aviso es `{ kind, title, body, path, tag }`, con `path` la ruta de la web, que la app traduce a la suya. `POST /api/me/push-targets` lleva un cuerpo discriminado por `channel` (Zod). Enchufar la app es un `Deliverer` por canal; el catálogo y las preferencias no cambian                                                                                                                                                                                                                                                                                 |

## 9. El modo ausencia

### 9.1 Cómo se declara (R3)

`Account › Away`, también enlazada desde `Welcome back`:

```
Away / Going on holiday? Tell us when you'll be back.                            (pantalla)
[1 week] [2 weeks] [1 month]  (Segmented)     Back on [Day] [Month] [Year]
While you're away
· Your coach picks <rider>'s training from 25 Nov, when your plan ends.
· <rider> races when his team picks him, with automatic orders.
· Contract offers expire after about 5 days. You won't be able to answer them while away.
· Notifications stay quiet. Account emails still arrive.
· The 30-day rule is paused: your coach won't take over for being away.
[Set away until 3 Dec]
You'll stay signed in on this device until you're back.
```

**Duración**: de 1 a 45 días reales (`AWAY_MAX_DAYS`, 180 de juego, media temporada); más da `Up to 45 days.
For longer, come back once and set it again.` (D-5). **Las líneas se calculan** sin tocar el motor: el fin del
plan vivo (`train.ts` l. 135 a 138), el contrato, la caducidad de las ofertas (21 días de juego, `contracts.ts`
l. 37: 5,25 reales). Agente libre: `As a free agent, <rider> only races your national championship while
you're away.` (mapa 03 §7). Mánager: `Your team keeps its natural calendar. Nobody signs riders or changes
plans for you.` (pantalla). La línea de la regla del mes, solo con la regla de E7 viva.

### 9.2 Mientras dura, y la vuelta

| Cambia                                                               | No cambia                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| Ningún aviso del navegador ni de la app, salvo `away_over`           | Los correos de la cuenta                              |
| La regla del mes no corre (E7 lee `away_until`)                      | El tick: entrena, corre, cobra, envejece (mapa 03 §7) |
| La sesión del aparato que la declaró dura hasta la vuelta más 7 días | Se puede entrar y jugar, y **entrar no la termina**   |

A la fecha termina sola, a las 00:00 locales del día de vuelta, y sale `away_over`. Antes, en toda pantalla
con sesión y bajo la cabecera, `You're away until 3 Dec` / `End now` (pantalla, `Notice` `info`): un toque.
Entrar a mirar no la termina porque quien abre la web en la playa para ver una etapa no quiere que se le
enciendan los avisos. **Inactivo** se cuenta desde `max(last_seen_at, away_until)`: la ausencia congela los 30
días, no los rellena. **La frontera con E7**: E4 da `users.away_since`, `users.away_until`, la pantalla, el silencio y la definición de inactivo. E7
decide qué hace el mundo con el ausente (entrenador, contrato, silla del mánager, G8) y si una ausencia se
ve desde fuera. E4 no lee `away_until` en el tick.

### 9.3 `Welcome back` y la regla del mes en la web

Tras una ausencia declarada, o tras 7 días reales o más sin visita, la portada abre con un `Notice` `info`
que se cierra, encima de `While you were away` de E2 (que no se duplica):

```
Welcome back                                                                     (pantalla)
You were away 12 days (48 game days). <rider> trained on 41 of them and raced 3 stages.
2 contract offers expired. 1 is still open: answer by 29 Nov.     [See your rider]
```

Las cifras salen de `rider_daily_log.activity` y de `offers` con su estado `expirada` (`schema.ts` l. 1091 a
1150 y 1245 a 1267); quién decidió cada día no se guarda, así que no se dice. Para quien no tiene avisos (todo iPhone en pestaña), **la regla del mes se enseña cuando está**: en la subpágina `Away` (`If you
don't visit for 30 days, your coach takes over <rider>. Set an away date to pause this.`) y en `Welcome back`
si la visita anterior fue hace 14 días o más (`Next time, set an away date: after 30 days without a visit
your coach takes over.`) (pantalla). Ambas, solo con la regla de E7 en marcha.

## 10. El correo transaccional

| Pieza                | Diseño                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DKIM                 | 2.048 bits, rotando el de 1.024 (mapa 02 §2) desde el panel de Resend                                                                                                                                                                                                                                                                                                         |
| DMARC                | `v=DMARC1; p=none; rua=mailto:<buzón del dueño>`; si el buzón es de otro dominio, ese dominio publica `cyclingstar.app._report._dmarc.<suyo>` (RFC 7489 §7.1). En `p=none` hasta un mes de informes limpios                                                                                                                                                                   |
| El plan              | Con verificación obligatoria, el correo 101 del día es alguien que no entra (mapa 02 §3). Pro (20 USD al mes) antes de abrir el registro (D-13). No sé qué plan hay hoy                                                                                                                                                                                                       |
| Calentar             | Abrir por tandas de la lista de espera (`docs/captacion.md`): 50 el primer día, 100 el segundo, 200 el tercero, libre desde el séptimo si los rebotes no pasan del 4 % (mapa 02 §4)                                                                                                                                                                                           |
| Saber qué pasó       | `mailer.ts` guarda el `id` de Resend en `email_log` con el tipo y el usuario, sin el buzón; `POST /api/webhooks/resend`, fuera del proxy de auth, con el cuerpo crudo y la firma `svix` (mapa 02 §3), apunta `delivered`, `bounced`, `complained` y `suppressed`                                                                                                              |
| Lo que ve el jugador | Si su último correo rebotó o está suprimido, `Account` abre con `We can't deliver email to <correo>` / `Without it you can't recover your account if you forget your password. Change your email.` (pantalla, `Notice` `warn`). Es lo único que le dirá que se ha quedado sin red, sin contacto detrás                                                                        |
| Subdominios          | Hoy un flujo y un remitente, `no-reply@cyclingstar.app`, como quiso el dueño ([DUEÑO 2], mapa 04 §2). Con correo de notificación: `notify.cyclingstar.app` aparte con su DKIM y su return path, `List-Unsubscribe` y `List-Unsubscribe-Post` (mapa 02 §4), y **otro equipo de Resend**, porque la supresión es por equipo y una queja suprimiría la recuperación (mapa 02 §3) |

## 11. Privacidad y datos

### 11.1 El nuevo `Privacy.tsx`, entero (pantalla)

```
Privacy
Last updated <fecha del PR>. Cycling Star is a personal project run by one person.

What we keep about you
- Your email address, and your password stored as a one-way hash (we can't read it).
- Your date of birth, only to check you're 16 or over. Nobody else sees it.
- Your rider, your team and everything you do in the game: training, plans, races you follow, what
  you've watched, your settings.
- When you last visited, so the game knows if you're away.
- For each device you're signed in on: the browser and system, and when you signed in and last used it.
- If you turn on notifications: an address from your browser's push service for each device.
- A record of the account emails we send you and whether they were delivered.

Your IP address
When you create a rider we may look up your country from your IP to pre-select a flag. Our server asks a
public service (ipinfo.io, ipwho.is or ipapi.co) for the two-letter country code and keeps the answer in
memory for a few hours. Your IP is not saved with your account. Our server logs keep it, shortened, for
<N> days, to stop abuse.

Cookies and storage
- A session cookie to keep you signed in (30 days, renewed while you play).
- A cookie that remembers what you've watched (90 days).
- A cookie that remembers this device signed in to your account, so a stranger's failed attempts don't
  lock you out (180 days, kept after you sign out).
- Your theme and a few display choices, stored in your browser.
No third-party tracking or advertising cookies.

Who else handles your data
Railway hosts the game and its database. Resend delivers account emails. Your browser's push service
(Google, Mozilla or Apple) delivers notifications, without being able to read them.

Your data, your choice
- Download a copy of your data: Account, Your data.
- Delete your account: Account, Delete account. It happens at once. Your rider and your team stay in the
  world, run by the game, under names the game gives them. Backups are kept for up to 14 days.

This notice will be reviewed against applicable law before public launch.
```

`<N>`: **no lo sé** (mapa 03 §4); se rellena en el PR con lo que diga el panel de Railway, o no se fusiona.
Los 14 días de copias son los de `scripts/backup.sh` (`docs/ops.md` l. 15), a comprobar que el cron corre.
Responsable del tratamiento y base legal: **a confirmar con un abogado**.

### 11.2 Logs, `last_seen_at`, exportar

| Pieza          | Diseño                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logs           | `serializers.req` en el logger (`index.ts` l. 64) quita la consulta de `/api/auth/*`, escribe `/api/auth/reset-password/:token` y recorta `remoteAddress` (IPv4 a `/24`, IPv6 a `/48`)                                                                                                                                                                                                                                                                                                                         |
| `last_seen_at` | En toda visita con sesión: `touchLastSeen` (`horizon.ts` l. 585 a 603) pasa de `resolveViewer` a un `onRequest` de toda petición con sesión, con su memo de una hora. Hoy entrar o crear el corredor no la escriben (mapa 03 §6, medido). De ella cuelgan `Welcome back`, `away_warning` y E7                                                                                                                                                                                                                  |
| Exportar       | `Account › Your data › Download a copy` hace `GET /api/me/export`, `application/json` con `Content-Disposition: attachment; filename="cycling-star-<fecha>.json"`: `users` sin `password_hash`, las sesiones como en `Devices`, `race_watch`, el corredor con su plan, su bitácora, sus transacciones y su contrato, el equipo si es suyo, las preferencias y los aparatos suscritos sin claves. Debajo: `A JSON file with everything we keep about you.` (pantalla). Si basta, **a confirmar con un abogado** |

### 11.3 Borrar de una vez (R8)

`DELETE /api/me` con `{ password }`: verifica con `auth.api.verifyPassword` desde el servidor (donde su
`scope: "server"` sí vale) y, en **una transacción** como `deleteUserAsAdmin` (`adminUsers.ts` l. 168 a 174),
suelta corredor y equipo (`releaseUserToWorld`), da al equipo un nombre generado (D-14), borra sus filas de
`verifications` y el usuario (cascadas de `sessions`, `accounts`, `race_watch`, `push_targets`,
`notice_log`). Después, el correo de §4.4 y las cookies a cero. La subpágina ofrece antes `Want a copy
first?` / `Download my data`; al terminar, `/` con `Your account is deleted` / `We've sent a confirmation to
<correo>. Thanks for playing.` (pantalla).

## 12. El contacto aparcado

| Qué             | Diseño                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El riesgo       | Quien pierde su correo pierde la cuenta sin nadie a quien pedírsela; quien ve la cuenta de un menor no puede avisar (`agenda.md` l. 254 y 259); quien recibe un correo que no pidió no puede preguntar. La subpágina `Email` lo dice: `If you lose access to this email, you won't be able to recover your account.` (pantalla) |
| Lo que se quita | `Ask and your account and rider data will be removed.` (`Privacy.tsx` l. 38). Ningún texto nuevo promete una respuesta                                                                                                                                                                                                          |
| Lo que costaría | Un reenvío de `support@cyclingstar.app` en el alojamiento al que apunta el MX (mapa 02 §2), una línea en el pie, `Login` y `Privacy`, un PR de una hora. El coste real es contestar                                                                                                                                             |

## 13. Datos y migraciones

Con drizzle-kit, desde la 0055 (mapa 03 §8). `users.locale` no se toca (E10).

| Migración | Cambio                                                                                                                                                                                                                                             | Filas de hoy                    | Índice                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| 0055      | `users`: `birth_date date`, `terms_version text`, `terms_accepted_at timestamptz`; `update sessions set ip_address = null`                                                                                                                         | nulas: la puerta de §3          | ninguno                            |
| 0056      | `auth_limits (key text, scope text, window_start timestamptz, count int, locked_until timestamptz, primary key (key, scope))`                                                                                                                      | vacía                           | `locked_until`, para purgar        |
| 0057      | `email_log (id uuid, resend_id text unique, user_id uuid references users on delete set null, kind text, status text, created_at, updated_at)`                                                                                                     | vacía                           | `(user_id, created_at desc)`       |
| 0058      | `users`: `away_since timestamptz`, `away_until timestamptz`, `time_zone text`, `notice_prefs jsonb not null default '{}'`                                                                                                                          | nulas y `{}` (defectos de §8.1) | `away_until` parcial, no nula      |
| 0059      | `push_targets (id, user_id … on delete cascade, channel, endpoint text unique, credential jsonb, device_label, created_at, last_ok_at, failures int)`; `notice_log (user_id … on delete cascade, kind, ref, sent_at, unique (user_id, kind, ref))` | vacías                          | `push_targets (user_id)`; el único |

## 14. Constantes

En `packages/shared/src/account/constants.ts`; las de límites, en `apps/api/src/security.ts`.

| Constante                                   | Valor                 | Intención                                                     |
| ------------------------------------------- | --------------------- | ------------------------------------------------------------- |
| `MIN_AGE_YEARS`                             | 16                    | decisión del dueño (`00-encargo.md` §9.1)                     |
| `TERMS_VERSION`                             | `'2026-11-draft'`     | volver a pedir cuando cambie                                  |
| `SESSION_DAYS` / `SESSION_CACHE_S`          | 30 / 60               | volver de vacaciones con sesión; cerrar otro aparato en 1 min |
| `VERIFY_LINK_S` / `RESET_LINK_S`            | 86.400 / 3.600        | todo JWT de correo se lee mañana; la recuperación, corta      |
| `RESEND_COOLDOWN_S`                         | 60                    | la espera visible de `Send it again`                          |
| `ACCOUNT_FAIL_LIMIT` / `ACCOUNT_LOCK_S`     | 10 en 900 s / 900     | por cuenta, sin tocar al aparato conocido                     |
| `KNOWN_DEVICE_DAYS`                         | 180                   | vida de `cs_known`                                            |
| `AWAY_MAX_DAYS` / `AWAY_SESSION_GRACE_DAYS` | 45 / 7                | media temporada; la sesión espera a la vuelta                 |
| `RETURN_NOTICE_AFTER_DAYS`                  | 7                     | cuándo sale `Welcome back` sin ausencia                       |
| `AWAY_WARNING_DAYS`                         | [20, 27]              | los dos avisos antes de los 30                                |
| `NOTICE_DAILY_CAP`                          | 3                     | el castigo de Chrome a muchos avisos                          |
| `NOTICE_QUIET_HOURS` / `STAGE_DIGEST_HOUR`  | 22 a 8 / 19 (locales) | nada de madrugada; una vez al día, por la tarde               |
| `NOTICE_TTL_S` / `NOTICE_SWEEP_MS`          | 43.200 / 900.000      | el aviso viejo no sirve; el barrido                           |
| `NOTICE_ASK_SNOOZE_DAYS`                    | 30                    | el `Notice` del permiso, cerrado                              |

## 15. Tests

Nuevos, rojos antes de su código:

| Fichero                           | Qué fija                                                                                                                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authErrors.test.ts`              | cada fila de §6.1, con `retryAfterS` de 45 y 240                                                                                                                                                                                                                                    |
| `authFlow.test.ts` (ampliado)     | el 429 de Fastify trae `message`; recuperar cierra las dos sesiones abiertas (hoy siguen, mapa 01 §2); usar un enlace de recuperación mata su gemelo; el de verificación reabierto no abre sesión; los cuatro correos nuevos salen, uno por caso; `ADMIN_EMAIL` no cambia de correo |
| `enumTiming.test.ts`              | con un `Mailer` de 250 ms, las medianas de 9 de las dos ramas de registro, recuperación y cambio de correo difieren menos de 30 ms                                                                                                                                                  |
| `accountLimit.test.ts`            | 11 fallos desde 11 IP dan `ACCOUNT_LOCKED` desde una IP nueva; con `cs_known` entra; recuperar pone el contador a cero; un correo inexistente se bloquea igual; el contador sobrevive a rehacer la app                                                                              |
| `birthDate.test.ts`               | 16 cumplidos hoy entra y mañana no; 29 de febrero; 1899; futura; sin fecha, 400; la puerta con 403 `BIRTH_DATE_REQUIRED`                                                                                                                                                            |
| `devices.test.ts`                 | sin token, IP ni agente crudo; `deviceLabel` con 12 agentes                                                                                                                                                                                                                         |
| `away.test.ts`                    | declarar, entrar sin terminarla, terminar, el tope, `max(last_seen_at, away_until)`                                                                                                                                                                                                 |
| `notices.test.ts`                 | tope, silencio con dos zonas, dos barridos a la vez sin duplicar, 410 borra, nada con ausencia                                                                                                                                                                                      |
| `sw.test.ts`                      | `sw.js` sin oyente `fetch` ni `caches`, e `index.html` sin manifiesto (la frontera con D-00p, comprobada)                                                                                                                                                                           |
| `privacy.test.ts`, `logs.test.ts` | el texto sin `not stored`, `Only a session cookie` ni `Ask`; ninguna línea de log con `@` ni `token=` tras abrir un enlace                                                                                                                                                          |
| `deleteMe.test.ts`                | un fallo inyectado tras soltar el corredor no deja nada a medias                                                                                                                                                                                                                    |
| Web                               | `VerifyEmail` con y sin sesión; `CheckInbox` tras recargar; `ResetPassword` sin `Repeat it`; `Field` con `reveal` y `DateField` por estado en `/_ui`; las subpáginas en la prueba del teléfono a 360 y 320 (`docs/visual.md` §7)                                                    |

**Re-sellados**: `authFlow.test.ts` l. 72, 274, 368 y 423, `adminPanel.test.ts` l. 34 y el fixture
`spoilerWorld.ts` l. 244 (con sus cuatro usuarios) ganan `birthDate` (mapa 03 §8); `entryForms.test.ts`,
`Register.test.tsx` l. 30, los de `Account`, `emails.test.ts` y `spoilerCanary.test.ts` l. 206.

## 16. Plan por PR, tests primero

| PR  | Qué                                                                                                                                                                                                                       | Depende de | Coste (estimado) |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------- |
| 1   | **Las pantallas que mienten**: `authErrors`, 429 con `message`, `VerifyEmail` con sesión, los finales de `ResetPassword` y del borrado, `ForgotPassword` que mira, el texto del destino ocupado, `CheckInbox` persistente | nada       | S, 1 día         |
| 2   | `better-auth` 1.7.26 y `fastify` 5.12.8                                                                                                                                                                                   | nada       | S                |
| 3   | Sesiones al recuperar, tokens con hash, gemelos muertos, verificación de 24 h, correos en segundo plano, los cuatro correos nuevos y el pie                                                                               | 2          | M                |
| 4   | `Privacy.tsx` nueva, logs sin tokens, IP fuera de `sessions`, rutas cerradas                                                                                                                                              | 3          | S                |
| 5   | Límites por cuenta, `cs_known`, `better-auth` sin limitador (0056)                                                                                                                                                        | 1, 3       | M                |
| 6   | Fecha de nacimiento, `/terms`, la puerta de las cuentas viejas, `DateField`, `Field` con `reveal` (0055)                                                                                                                  | 2          | M                |
| 7   | `Account` como lista, `Devices`, `cookieCache`, sesión de 30 días                                                                                                                                                         | 4          | M                |
| 8   | `last_seen_at` en toda visita, modo ausencia, `Welcome back` (0058)                                                                                                                                                       | 7          | M                |
| 9   | Exportar y borrado atómico                                                                                                                                                                                                | 7          | S                |
| 10  | `email_log`, webhook de Resend, el aviso de correo que rebota (0057)                                                                                                                                                      | 3          | S                |
| 11  | `sw.js`, `push_targets`, `Notifications`, el permiso, el iPhone, `noticeSweep` con `stage_digest`, `stage_ready` y `plan_ending` (0059)                                                                                   | 8          | L, 3 días        |
| 12  | `away_warning` y las frases de la regla del mes                                                                                                                                                                           | 11 y E7    | S                |

El 1 va primero porque arregla lo que el jugador ya ve, sin migración. Ninguno pide variable nueva salvo el
11 (VAPID): sin ella `Notifications` dice `Not available yet` (pantalla) y nada se rompe.

## 17. Riesgos del despliegue y lo que se mide

| Riesgo                            | Qué pasa y cómo se cubre                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las cuentas de hoy (la del dueño) | La puerta de la fecha al entrar; su sesión pasa a 30 días en la próxima renovación; un enlace de recuperación vivo al desplegar el hash sigue valiendo su hora (mapa 01 §7) |
| El PR 3                           | No cierra sesiones al desplegar; las de una cuenta al recuperarla, que es lo buscado y se dice                                                                              |
| El tope de Resend                 | Con el plan gratuito, el registro 101 del día no entra. No se abre el registro sin el plan decidido                                                                         |
| Un despliegue                     | Vacía los límites de Fastify (10 intentos más por IP); los de cuenta, en Postgres, no                                                                                       |
| Nada probado en un iPhone         | Mapa 05 §10, mapa 02 §6. El dueño prueba en su teléfono registro, recuperación y, con iOS 26, el aviso desde la pantalla de inicio, como en `docs/visual.md` §7.7           |

| Qué se mide                                           | Con qué                              | Umbral (mío)              |
| ----------------------------------------------------- | ------------------------------------ | ------------------------- |
| Registros sin confirmar a las 24 h                    | `users.email_verified`, `created_at` | más del 30 %              |
| Correos rebotados o suprimidos                        | `email_log.status`                   | más del 4 % en 7 días     |
| Bloqueos por cuenta                                   | `auth_limits.locked_until`           | más de 3 al día           |
| Suscripciones perdidas por semana                     | borrados por 404 y 410               | más del 20 % de las vivas |
| Ausencias declaradas y terminadas antes de tiempo     | `away_since`, `away_until`           | se mira, sin umbral       |
| Vueltas tras más de 20 días, con y sin `away_warning` | `last_seen_at`, `notice_log`         | se mira, para E7          |

## 18. Fronteras

| Con    | Es de E4                                                                                     | No es de E4                                                   |
| ------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| E2     | cuándo, a quién, con qué tope y baja sale el aviso de etapa; el canario mira `noticePayload` | el texto (`stageReadyNotice`), `While you were away`, `Watch` |
| E7     | `away_since`, `away_until`, la definición de inactivo, `away_warning` y sus frases           | el mundo con el ausente, la silla del mánager, G8, la regla   |
| E8     | nada: `premium` sigue en `users`                                                             | vender                                                        |
| E9     | que un aviso nuevo entre por el catálogo y sus preferencias                                  | el chat y sus avisos; si una ausencia se ve desde fuera       |
| E10    | `time_zone`; textos en inglés                                                                | traducir, `locale`                                            |
| W5     | nada: `visual.md` no se edita                                                                | `Watch`                                                       |
| La app | `push_targets` con canal, el aviso con `path`; la misma cuenta y sesiones                    | construirla                                                   |
| Motor  | nada (`ENGINE_VERSION` 91)                                                                   | todo                                                          |

## 19. Decisiones que son del dueño

A es el valor por defecto, con su porqué; B y C, lo que cambia con otra. Los textos, en inglés, son de pantalla.

| #    | Decisión                       | A (por defecto)                                                                                 | B                                                                                                                                                 | C                                                                                                                                                |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-1  | Avisos encendidos de serie     | `stage_digest`, `plan_ending`, `away_warning`, `away_over`: uno al día como mucho, por la tarde | solo `away_warning`; el resto, uno a uno (menos castigo de Chrome, menos razones para dar el permiso)                                             | también `stage_ready`, hasta 3 al día (más inmediato; Chrome puede retirar el permiso, mapa 02 §5)                                               |
| D-2  | Cuándo se pide el permiso      | tras crear el corredor y al seguir una carrera (§8.2)                                           | solo en `Notifications` (casi nadie lo encontrará)                                                                                                | en la portada a la tercera visita: `Never miss a stage of <rider>` / `Turn on`                                                                   |
| D-3  | El iPhone                      | la explicación de §8.3, solo en `Notifications`                                                 | `Notifications aren't available on iPhone yet. Everything is on your Home page.`, sin nombrar la pantalla de inicio: más fiel a la letra de D-00p | A más un `Notice` una vez en la portada (`Want notifications on iPhone? See how` / `Show me`): lo más parecido al `InstallHint` que D-00p retiró |
| D-4  | La pantalla de ausencia        | la de §9.1: atajos, fecha y líneas calculadas                                                   | solo la fecha y `Your coach decides while you're away.`, sin cálculo: un PR más corto y un jugador que no sabe qué se para                        | solo los tres atajos, sin fecha                                                                                                                  |
| D-5  | Duración máxima de la ausencia | 45 días                                                                                         | 30, como la regla del mes (la ausencia solo calla avisos)                                                                                         | 90, un verano entero (un mánager ausente deja a otros sin quien decida, que pesa en E7)                                                          |
| D-6  | `Devices`                      | navegador, sistema y fechas, sin IP                                                             | además el país de la entrada (`Spain`): geolocalizar cada sesión y guardar el país                                                                | solo `You're signed in on 3 devices` y `Sign out everywhere else`                                                                                |
| D-7  | `Account`                      | lista con subpáginas (§5)                                                                       | una página con la cuenta arriba y el velo y el tema abajo: ningún toque más, y el teclado vuelve a tapar botones (55)                             |                                                                                                                                                  |
| D-8  | `Privacy`                      | el texto de §11.1, todo a la vista                                                              | arriba `We keep your email, your game, and when you last visited. We don't sell anything or track you.` y cada bloque en un `Disclosure`          |                                                                                                                                                  |
| D-9  | Duración de la sesión          | 30 días                                                                                         | 7, como hoy (vuelve el `Log in` tras las vacaciones)                                                                                              | 90 (más vida para una sesión robada, que `Devices` compensa a medias)                                                                            |
| D-10 | El campo de la fecha           | tres campos                                                                                     | `<input type="date">` nativo: un campo, peor en Android para fechas lejanas (sin medir en un aparato)                                             |                                                                                                                                                  |
| D-11 | Qué se guarda de la fecha      | la fecha entera                                                                                 | el año y `age_checked_at` (menos dato; si la edad mínima cambia, hay que volver a preguntar a todos)                                              |                                                                                                                                                  |
| D-12 | Las condiciones                | la línea bajo el botón; **a confirmar con un abogado**                                          | casilla obligatoria `I agree to the Terms`, un toque más; **a confirmar con un abogado**                                                          |                                                                                                                                                  |
| D-13 | El plan de Resend              | Pro antes de abrir el registro                                                                  | el gratuito, con tandas de menos de 80 registros al día                                                                                           |                                                                                                                                                  |
| D-14 | El equipo de quien se borra    | nombre generado por el juego                                                                    | el que dejó la persona, como hoy (mapa 03 §3). Si es dato personal, **a confirmar con un abogado**                                                |                                                                                                                                                  |
| D-15 | Los enlaces de verificación    | 24 horas, todos los JWT de correo                                                               | una hora, como hoy (más registros perdidos por leer el correo tarde)                                                                              |                                                                                                                                                  |
