# Mapa 05 · Las pantallas

Commit `2a29e6d`. **Leídos enteros** (líneas): `apps/web/src/pages/Login.tsx` 127, `Register.tsx` 190,
`VerifyEmail.tsx` 66, `ForgotPassword.tsx` 102, `ResetPassword.tsx` 117, `Account.tsx` 417,
`Privacy.tsx` 49, `domain/authLinks.ts` 67, `domain/entryForms.ts` 54, `auth/client.ts` 7,
`api/session.ts` 31, `components/ui/keyboard.ts` 33, `components/ProtectedRoute.tsx` 20,
`apps/api/src/auth.ts` 226. **Por tramos**: `App.tsx` (l. 300 a 419, rutas y pie), `Header.tsx`,
`BottomNav.tsx`, `ui/BottomNav.tsx`, `ui/AppHeader.tsx`, `ui/Field.tsx`, `ui/Button.tsx`,
`domain/nav.ts` (l. 95 a 108), `apps/api/src/emails.ts` (l. 1 a 150) y `app.ts` (l. 200 a 218).

**Cómo se ha medido.** Un clon de `2a29e6d` en `<scratchpad>/mapa05/clon` con `pnpm build`. Dos API
locales con `capturas/servir.mjs` (PGlite, `createAuth` y `buildApp` de verdad, la web compilada y un
`Mailer` falso que escribe cada correo en un fichero), una sin `NODE_ENV` y otra con
`NODE_ENV=production` (las dos capas de límites, mapa 01 §4). `capturas/recorridos.mjs` lo recorre todo
con Chromium a 360 × 800 (táctil) y a 1.280, sigue los enlaces de los correos y apunta en
`capturas/medidas.json` textos, avisos y objetivos. Las capturas se citan por su número
(`capturas/README.md`). Producción: solo `/login`, 23 peticiones GET (captura 80), mismos textos.

## Resumen

1. **El 429 de Fastify se pinta como contraseña mala** (§4): tras 10 intentos en 5 minutos desde una
   IP, `Login` dice `Wrong email or password.`, también con la contraseña buena (35, medido), porque el
   429 no trae `message` (`app.ts` l. 213 a 217) y la página cae en su texto por defecto (`Login.tsx`
   l. 61). Con `NODE_ENV=production`, el cuarto intento en 10 s dice, en cambio, el texto de
   `better-auth` (36).
2. **Ningún correo avisa de un cambio hecho** (§9): recuperar la contraseña, cambiarla, terminar un
   cambio de correo, borrar la cuenta o registrarse con un correo ajeno no mandan nada (medido).
3. **Cambiar a un correo ocupado promete un correo que no sale** (§7): la pantalla dice que ha mandado
   el enlace de aprobación y el `Mailer` no recibe nada (53c, medido).
4. **`VerifyEmail` dice `you are signed in` a quien no lo está** (§5): un enlace ya usado, abierto
   otra vez sin sesión, pinta `Email confirmed` con `get-session` nulo (22, medido).
5. **Lo que acaba en silencio** (§6, §7): la contraseña nueva guardada lleva a `/login` sin decir nada
   (47); la cuenta borrada, a la portada sin decir nada (65); y `ForgotPassword` da por enviado el
   enlace aunque la API conteste 429 (37), porque no mira la respuesta (`ForgotPassword.tsx` l. 47).
6. **Los errores del servidor salen crudos y no casan con los propios** (§3, §4, §7): `Invalid email or
password`, `Invalid password`, `Password too long` (sin punto) junto a los de la página, con dos
   versiones de «mínimo 8» y de «no coinciden». `Invalid password` sale también con la actual vacía.
7. **Táctil y teclado, casi bien** (§10): con el dedo, campos de 48 px y letra de 16 en todos; por
   debajo de 44 solo dos enlaces dentro de una frase. Con el teclado simulado la barra inferior se
   esconde y el botón de enviar se ve, salvo en `Account › Email` tras un envío.
8. **No hay salida para quien se queda fuera** (§1, §2): ni contacto en el pie ni en `Login`, y
   `Privacy` sigue pidiendo que se pida el borrado (mapa 03 §5).

## §1. Quien no ha entrado: cabecera, barra inferior y pie (01, 02, 80)

| Pieza        | A 360 (01)                                                                                                    | A 1.280 (01, 30)                                                                                  | Código                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Cabecera     | El logo solo, `Log in` (texto cian) y `Sign up` (pastilla dorada). Sin reloj ni secciones; no es fija         | Logo con `Cycling Star`, el reloj (`Not started · 5h 57m` en el mundo local), `Log in`, `Sign up` | `AppHeader.tsx` l. 55, 65, 76, 79 y 85        |
| Secciones    | En la barra inferior fija: `World`, `How to play`, `News`                                                     | Fila bajo la cabecera: `World`, `How to play`, `News`                                             | `nav.ts` l. 95 a 108; `Header.tsx` l. 91      |
| Pie          | `How to play` y `Privacy` (44 × 44, medido) y el aviso de ficción; nada de contacto, condiciones ni versión   | Igual, en una línea                                                                               | `App.tsx` l. 393 a 418                        |
| Ruta privada | `/account` sin sesión lleva a `/login` (medido); tras entrar se va a `/me/profile`, no de vuelta a `/account` | Igual                                                                                             | `ProtectedRoute.tsx` l. 16; `Login.tsx` l. 64 |

El aviso del pie (`App.tsx` l. 410 a 416, con una raya en el texto) dice que todo es inventado y que
el juego no tiene relación con ninguna organización ciclista real. En el DOM hay dos `nav` con `aria-label="Sections"` (la fila de la cabecera, oculta por debajo de
640 px, y la barra inferior: `Header.tsx` l. 91, `ui/BottomNav.tsx` l. 50); a 1.280 la barra inferior
está oculta (`sm:hidden`, l. 54). La barra inferior tapa el pie mientras no se llega al final de la
página (01, de 743 a 800 px).

## §2. Privacy (02)

Cuatro `Panel` bajo `Privacy` y su entradilla (`Privacy.tsx` l. 12 a 46): `What we store`, `Your IP
address`, `Cookies` y `Deleting your data`, y al pie `This notice is informational and will be reviewed
against applicable law before public launch.` El texto entero y si cada frase es verdad están en el
mapa 03 §5; la de la IP lleva una raya y la del borrado dice `Ask and your account and rider data will
be removed.` Lo que no está en la pantalla: fecha de la versión, responsable del tratamiento, enlace a
`Account` para borrar y a quién pedir nada. Mide 1.314 px a 360 (02).

## §3. Register y CheckInbox (10 a 18)

`Create your account`, `Start building your rider.`; `Email`, `Password` con la ayuda `At least 8
characters.`; `Create account`; debajo, `Already have an account? Log in` (`Register.tsx` l. 142 a
188). No pide nombre (se deriva del correo, l. 116), ni fecha de nacimiento, ni aceptar condiciones.

| Cuándo                     | Lo que se ve (pantalla)                                                                                   | Dónde                             | Captura  |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------- | -------- |
| Sin correo                 | `Enter your email.` en el campo, con el foco                                                              | `entryForms.ts` l. 18 y 37        | 11       |
| Correo sin `@`             | El globo del navegador (`Please include an '@' in the email address…` en Chromium); no sale en la captura | `type="email"`                    | (medido) |
| Contraseña de menos de 8   | `Your password must be at least 8 characters.`                                                            | `entryForms.ts` l. 19 y 38        | 12       |
| Contraseña de más de 128   | `Password too long` (del servidor, en `role="alert"`)                                                     | `Register.tsx` l. 127; mapa 01 §6 | 18       |
| Correo que ya tiene cuenta | La misma `Check your inbox`; **no sale ningún correo** (medido), ni al dueño                              | l. 129 a 132; mapa 01 §5          | 17       |
| Bien                       | `Check your inbox` y el correo de confirmar (§9)                                                          | l. 135                            | 14       |

`CheckInbox` (`Register.tsx` l. 50 a 85): `Check your inbox`; `We have sent a link to <correo>. Open it
to confirm your email and start playing. It expires in one hour.`; `Nothing there? Check the spam
folder, or make sure the address above is right.`; el botón `Send it again`; `Already confirmed? Log
in`. Reenviado: `Sent again. Give it a minute to arrive.` (15). El undécimo toque en 5 minutos desde una
IP (10 reenvíos salen) da el 429 de Fastify y se pinta el texto por defecto, `Could not send it again.
Try again in a few minutes.` (16, medido; l. 19 y 44). Con `NODE_ENV=production` el límite de
`better-auth` es de 3 por minuto y el texto sería el suyo (por el código, no medido). `CheckInbox` no
tiene ruta: es estado de `Register` (l. 100 y 135), así que **recargar o volver atrás la pierde** y deja
el formulario vacío. No hay forma de corregir el correo desde ella salvo volver a registrarse.

## §4. Login (30 a 36)

`Log in`, `Welcome back.`; `Email`, `Password`; `Forgot your password?` (enlace de 44 de alto); `Log
in`; `No account yet? Sign up` (`Login.tsx` l. 72 a 125). Al entrar, a `/me/profile` (l. 64).

| Cuándo                                                    | Lo que se ve (pantalla)                                                                                                                                                                      | Captura |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Sin correo, o sin contraseña                              | `Enter your email.` o `Enter your password.` en el campo (`entryForms.ts` l. 26 a 29)                                                                                                        | 31      |
| Contraseña mala, o correo que no existe (401)             | `Invalid email or password` (de `better-auth`, sin punto). Idéntico en los dos casos y con una cuenta sin confirmar y la contraseña mala (34b, medido)                                       | 32      |
| Contraseña buena y correo sin confirmar (403)             | `Notice` `warn`: `Confirm your email first` / `We have just sent a new link to <correo>. Open it and you will be signed in. Check the spam folder if it does not show up.`, y sale el correo | 34      |
| 429 de Fastify (intento 11 en 5 min por IP y ruta)        | `Wrong email or password.`: el texto por defecto de l. 61, porque el cuerpo es `{ok:false,error:"demasiadas_peticiones"}`. Con la contraseña buena, igual (35b)                              | 35      |
| 429 de `better-auth` (`NODE_ENV=production`, 4.º en 10 s) | `Too many requests. Please try again later.`                                                                                                                                                 | 36      |

Series medidas (`medidas.json`): sin `NODE_ENV`, 10 × 401 y luego 429; con `production`, 3 × 401 y
luego 429. Ningún texto dice cuánto esperar, aunque las dos capas mandan `retry-after` (mapa 01 §4.1).

## §5. VerifyEmail (20 a 25, 56, 57)

Página pública (`App.tsx` l. 317). Lee la consulta (`authLinks.ts` l. 62 a 66) y pinta uno de tres
estados (`VerifyEmail.tsx` l. 21 a 64):

| Estado            | Título (pantalla)   | Texto (pantalla)                                                                                    | Botones                               | Captura    |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------- |
| Sin parámetros    | `Email confirmed`   | `Your address is verified and you are signed in.`                                                   | `Continue` (`/me/profile`), `Account` | 20, 22, 57 |
| `?step=approved`  | `Change approved`   | `One step left: we have sent a link to your new address. Your email changes only when you open it.` | `Continue`, `Account`                 | 25, 56     |
| `?error=<código>` | `That did not work` | El mensaje del código y `Logging in with an unconfirmed email sends you a fresh link.`              | `Log in`, `Account`                   | 23, 24     |

Los mensajes de error (`authLinks.ts` l. 22 a 36; el primero lleva una raya y va en bloque):

```
TOKEN_EXPIRED           That link has expired — they are only valid for one hour. Ask for a new one.
INVALID_TOKEN           That link is not valid any more. Ask for a new one.
USER_NOT_FOUND          That account no longer exists.
EMAIL_ALREADY_VERIFIED  That email was already confirmed. You can log in.
INVALID_USER            That link belongs to a different account. Log out and open it again.
(otro)                  That link did not work. Ask for a new one.
```

Medido: un JWT vencido da `TOKEN_EXPIRED` (23); un token que no es JWT, `INVALID_TOKEN` (24). **El
enlace ya usado no da error**: abierto otra vez sin sesión, el servidor redirige a `/verify-email` sin
parámetros y la página dice `you are signed in` sin sesión (22, `get-session` nulo); igual el primer
enlace del registro tras confirmar con el segundo (22b). La primera vez sí abre sesión (20: 7 días, con
la IP y el agente). `Account` lleva a `/login` (es privada), y `Continue` también si no hay sesión. No
hay botón para pedir otro enlace: el texto manda a `Log in`, que solo reenvía con la contraseña buena.

## §6. ForgotPassword y ResetPassword (37, 40 a 49b)

`ForgotPassword`: `Forgot your password?`, `Give us your email and we will send you a link to set a new
one.`, `Email`, `Send me a link`, `Back to log in` (`ForgotPassword.tsx` l. 55 a 99). Sin correo,
`Enter your email.` (41). Pedido, la entradilla desaparece y queda `If there is an account for
<correo>, a link to choose a new password is on its way. It expires in one hour.` / `Nothing in your
inbox? Check the spam folder before asking for another one.` (42); idéntico para un correo sin cuenta
(42b, medido). **No mira la respuesta** (l. 47 y 48): con `NODE_ENV=production`, la cuarta petición en un
minuto es un 429 de `better-auth` y la pantalla dice lo mismo (37, serie en `medidas.json`). No hay
botón para pedir otro desde la pantalla de enviado: hay que recargar.

`ResetPassword` (`ResetPassword.tsx` l. 64 a 115): `Choose a new password`; `New password` con `At least
8 characters.`; `Repeat it`; `Save my new password` (43). Sin `Back to log in` ni entradilla.

| Cuándo                                         | Lo que se ve (pantalla)                                                                             | Captura  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| Menos de 8                                     | `Your password must be at least 8 characters.`                                                      | 44       |
| No coinciden                                   | `The two passwords do not match.` (`entryForms.ts` l. 52)                                           | 45       |
| Error del servidor                             | Su mensaje, o `Could not change your password.` (l. 52)                                             | (código) |
| Bien                                           | A `/login` vacío, **sin mensaje** y sin sesión (l. 56); ningún correo (medido)                      | 47       |
| El mismo enlace otra vez, o un token inventado | `That link is not valid any more. Ask for a new one.` y `Ask for a new link` (a `/forgot-password`) | 48, 49   |
| `/reset-password` tecleada                     | `Open this page from the link in your email.` y `Ask for a new link`                                | 49b      |

Usado el primero de dos enlaces, el segundo sigue abriendo el formulario (48b, medido; mapa 01 §2).

## §7. Account (50 a 65)

Orden a 360, de arriba abajo (50, 1.950 px de alto; `Account.tsx` l. 393 a 415): `Account settings` /
`Manage your login details.`; `Admin panel` (solo administradores, l. 395); `Spoiler protection` (E2,
con `Yours and the big ones`, `Only yours`, `Nothing` y `Ask before showing a result`, `Yes`/`No`);
`Appearance` (`Light`/`Dark`); el aviso de correo sin confirmar si toca; `Email`; `Password`; `Sign
out`; `Delete account`. Lo de la cuenta empieza a 620 px: dos pantallas de teléfono por debajo de lo
que se ve al llegar. No hay sesiones, ni datos, ni exportar, ni fecha de alta.

**Correo sin confirmar** (51, 52; cuentas antiguas con sesión viva, l. 81 a 111): `Your email is not
confirmed` / `You will need it the next time you log in, and to recover your account if you ever lose
your password.` y el botón `Send me a confirmation link`. Fallo, su mensaje o `Could not send the
email.` (l. 90). Enviado, el texto de l. 92, que lleva raya:

```
Link sent — check your inbox (and the spam folder).
```

**Email** (l. 113 a 188): `Signed in as <correo>. A new address has to be confirmed by email before it
replaces this one.`; `New email` (con `you@example.com` de ejemplo); `Update email`.

| Cuándo                             | Lo que se ve (pantalla)                                                                                                                 | Correos (medido)               | Captura |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------- |
| Vacío o el mismo                   | `Enter a new, different email.` (l. 133)                                                                                                | 0                              | 53, 53b |
| Correo confirmado, destino libre   | `We have sent an approval link to <viejo>. Once you approve, a confirmation link goes to <nuevo>; your email changes when you open it.` | 1, a la vieja                  | 54      |
| Correo confirmado, destino ocupado | El mismo texto                                                                                                                          | **0**                          | 53c     |
| Correo sin confirmar               | `We have sent a confirmation link to <nuevo>. Your email changes when you open it.` (l. 149)                                            | 1, directo a la nueva          | 52b     |
| Primer enlace (vieja), con sesión  | `Change approved` (56)                                                                                                                  | 1, a la nueva                  | 56      |
| Segundo enlace (nueva)             | `Email confirmed`; en `Account`, `Signed in as <nuevo>`                                                                                 | 0: la vieja no sabe que se fue | 57, 58  |

**Password** (l. 190 a 293): `Changing your password signs you out of other devices.`; `Current
password`, `New password` (`At least 8 characters.`), `Confirm new password`; `Update password`. Errores:
`New password must be at least 8 characters.`, `The new passwords do not match.` (de la página);
`Invalid password` con la actual mala (60) **o vacía** (60c, no se comprueba en la página). Bien:
`Password updated.` (61), los campos se vacían y la otra sesión abierta queda cerrada (`get-session`
nulo, medido). Ningún correo.

**Delete account** (l. 300 a 373): `This cannot be undone. Your rider and your team stay in the world,
run by the game, and your email becomes free to use on another account.` y `Delete my account…`.
Abierto (62): `Password`, `Delete my account for good` (rojo) y `Cancel`. Vacío: `Enter your password to
delete your account.` (l. 311; el gancho del servidor dice lo mismo, `auth.ts` l. 189). Mala: `Invalid
password` (63). Buena: recarga completa a `/` (l. 322), la portada del visitante **sin ninguna frase**
(65) y ningún correo. **Sign out** lleva a `/login` (l. 386, medido).

## §8. Los recorridos enteros

| Recorrido             | Pasos (pantalla, petición y correo)                                                                                                                                                                                                                                                           | Capturas       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Registrarse           | `/register` → `POST /sign-up/email` → `Check your inbox` y correo «confirmar» → el enlace `GET /api/auth/verify-email?token=<JWT>&callbackURL=%2Fverify-email` en otro navegador → 302 con cookie → `Email confirmed` → `Continue` → `No rider yet` / `Create your rider to enter the world.` | 10, 14, 20, 21 |
| Entrar sin confirmar  | `/login` con la contraseña buena → 403 → `Confirm your email first` y correo «confirmar»                                                                                                                                                                                                      | 34             |
| Recuperar             | `/forgot-password` → correo «recuperar» → `GET /api/auth/reset-password/<24 car.>?callbackURL=%2Freset-password` → 302 a `/reset-password?token=…` → `POST /reset-password` → `/login` callado                                                                                                | 40, 42, 43, 47 |
| Cambiar el correo     | `Account › Email` → correo «aprobar» a la vieja → su enlace (`callbackURL=%2Fverify-email%3Fstep%3Dapproved`) → `Change approved` y correo «confirmar» a la nueva → su enlace → `Email confirmed` → `Signed in as <nuevo>`                                                                    | 54, 56, 57, 58 |
| Cambiar la contraseña | `Account › Password` → `POST /change-password` con `revokeOtherSessions: true` (`Account.tsx` l. 223) → `Password updated.`; las otras sesiones, cerradas                                                                                                                                     | 60, 61         |
| Borrar la cuenta      | `Delete my account…` → contraseña → `POST /delete-user` → `/` sin sesión y sin frase                                                                                                                                                                                                          | 62, 63, 65     |

`recorridos.mjs` entero tarda unos 9 minutos en esta máquina.

## §9. Los correos (70 y `correos.json`)

Tres plantillas sobre un mismo `layout` (`emails.ts` l. 36 a 57): tarjeta blanca de 520 px, título,
texto, botón índigo (`#4f46e5`, no el verde azulado de la web), el enlace copiable (`If the button
does not work, copy this link into your browser:`) y un pie común (l. 54) que lleva raya: `Cycling
Star`, la raya y `a fictional cycling-manager game.`. Texto plano de cada una, tal cual sale (el
enlace, abreviado):

```
(correo) Confirm your Cycling Star email                      [registro, reenvío, entrar sin confirmar, cuenta antigua, dirección nueva]
Confirm this address to use it with your Cycling Star account.
You need to do it before you can log in with it.

Open this link (it expires in one hour):
http://localhost:3005/api/auth/verify-email?token=<JWT>&callbackURL=%2Fverify-email

If you did not ask for this, ignore this email.
HTML: título «Confirm your email», botón «Confirm my email».

(correo) Reset your Cycling Star password
Someone asked to reset the password of your Cycling Star account.

Open this link to choose a new one (it expires in one hour):
http://localhost:3005/api/auth/reset-password/<token>?callbackURL=%2Freset-password

If it was not you, ignore this email: your password stays as it is.
HTML: título «Reset your password», botón «Choose a new password».

(correo) Confirm the new email of your Cycling Star account   [a la dirección VIEJA]
Someone asked to move your Cycling Star account to <nuevo>.

Open this link to approve the change:
http://localhost:3005/api/auth/verify-email?token=<JWT>&callbackURL=%2Fverify-email%3Fstep%3Dapproved

If it was not you, ignore this email and change your password: your address stays as it is.
HTML: título «Confirm your new email», botón «Approve the change».
```

El de la dirección vieja no dice cuándo caduca (el JWT dura una hora, mapa 01 §2) y su título HTML,
`Confirm your new email`, llega a quien no cambia nada. La confirmación de la dirección nueva usa la
plantilla genérica, que dice `You need to do it before you can log in with it.` y no nombra el cambio.
Los correos que **no existen** (medido que no sale ninguno): contraseña recuperada, contraseña
cambiada, correo cambiado (a la vieja), cuenta borrada, registro con un correo que ya tiene cuenta y
cambio a un correo ocupado. Los 29 correos de la pasada (25 sin `NODE_ENV`, 4 con `production`) son
de esas tres plantillas.

## §10. El teclado del teléfono y los objetivos táctiles

**El teclado, simulado.** Chromium sin pantalla no abre teclado. Se enfoca el campo, se rebaja
`visualViewport.height` a 470 px (estimado para un Android de 360 × 800 con el teclado abierto) con su
evento `resize`, que es lo que mira `keyboard.ts` (l. 11 a 15: abierto por debajo de 0,75 del alto), y
se desplaza lo mínimo para que el campo quede a la vista. iPhone no se ha probado.

| Captura | Campo enfocado (px)                          | Botón de enviar (px)                    | ¿Se ve el botón?                                                                   | Barra inferior |
| ------- | -------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- | -------------- |
| 13      | `Password` de `Register`, 257 a 305          | `Create account`, 385 a 429             | Sí                                                                                 | Escondida      |
| 33      | `Password` de `Login`, 257 a 305 (con error) | `Log in`, 405 a 449                     | Sí                                                                                 | Escondida      |
| 46      | `Repeat it`, 257 a 305 (con error)           | `Save my new password`, 341 a 385       | Sí                                                                                 | Escondida      |
| 55      | `New email`, 376 a 424                       | `Update email`, 548 a 592               | **No** (122 px por debajo): el mensaje de estado de tres líneas queda entre medias | Escondida      |
| 64      | `Password` del borrado, 318 a 366            | `Delete my account for good`, 410 a 454 | Sí; `Cancel` queda cortado                                                         | Escondida      |

La cabecera no es fija (no hay `sticky` ni `fixed` en `AppHeader.tsx`), así que con el teclado no
roba sitio. **Objetivos táctiles** (todas las capturas a 360, `medidas.json`): los campos miden 48 px
con el dedo (`min-h-12`) y 40 con ratón (`fine:min-h-10`, `Field.tsx` l. 137), y su letra es de 16 px
en todos; los botones, 44 o más; los enlaces del pie, 44 × 44. Por debajo de 44 solo hay dos, los dos
dentro de una frase (la excepción de WCAG 2.5.8): `Log in` (41 × 17) en `Register` y `CheckInbox`, y
`Sign up` (50 × 17) en `Login`. `autocomplete` va en todos los campos y casa con su papel (`email`,
`current-password`, `new-password`).

## Lo que este mapa no ha podido comprobar

1. **Un teclado de verdad**, en Android y en iPhone: §10 simula el alto visible con 470 px estimados.
2. **El 429 en producción tal cual**: no se puede provocar allí (solo GET). Que producción tenga
   `NODE_ENV=production` lo deduce el mapa 01 §4.3 de la documentación; si es así, la captura 36 es lo
   que ve quien falla tres veces en 10 s.
3. **Los correos en clientes reales** (Gmail, Outlook, Apple Mail, modo oscuro): solo se ha pintado su
   HTML en Chromium a 360 (70). Tampoco cuánto tarda Resend ni si alguno va a spam.
4. **`Send it again` para un correo ya confirmado** y **el modo oscuro** (todo está en claro).
5. **El aviso de correo sin confirmar en `Account`** se ha fabricado con SQL (sesión abierta y
   `email_verified` puesto a falso después); en producción no sé cuántas cuentas están así (el
   encargo dice que hoy solo la del dueño existe).
