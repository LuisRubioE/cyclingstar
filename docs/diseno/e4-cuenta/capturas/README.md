# E4 · Capturas de las pantallas de la cuenta (mapa 05)

Las capturas que cita `../mapas/05-pantallas.md`, sobre `2a29e6d`. Todas a `deviceScaleFactor` 1: las
`-360.png` a 360 × 800 con `isMobile` y táctil (`pointer: coarse`), las `-1280.png` a 1.280 × 800. Página
entera salvo las del teclado (solo lo visible, 470 px) y cuatro de `Account` (solo la ventana, para que
se vea el formulario del paso). La barra inferior fija sale en la franja de 743 a 800 px de la primera
pantalla, como la ve quien abre la página. Reducidas a 128 colores sin tramado (`optimizar.py`): 1,1 MB
en total.

## Cómo se rehacen

| Fichero          | Qué hace                                                                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `servir.mjs`     | PGlite con las migraciones y la génesis (`runTick` con `forceDays: 0`), `createAuth` y `buildApp` de verdad con la web compilada, un `Mailer` falso que escribe cada correo entero en `<out>/correos.jsonl` y una ruta del arnés, `POST /__sql`, para preparar estados. `NODE_ENV` se hereda del entorno |
| `recorridos.mjs` | Los recorridos con Playwright (el Chromium de `/opt/pw-browsers`), una IP propia por persona en `x-forwarded-for`, los enlaces leídos de `correos.jsonl`, el teclado simulado y las medidas de cada captura en `medidas.json`                                                                            |
| `produccion.mjs` | La única captura de producción (`80`), solo con GET: corta cualquier otro método. Corrida una vez, el 19 de noviembre de 2026; `rehacer.sh` no la repite                                                                                                                                                 |
| `optimizar.py`   | La paleta de 128 colores                                                                                                                                                                                                                                                                                 |
| `rehacer.sh`     | Todo en orden: `rehacer.sh <carpeta-de-trabajo> <clon-compilado>` (unos 10 minutos)                                                                                                                                                                                                                      |

Salidas de datos: `medidas.json` (por captura: ruta, texto de `main`, regiones `alert` y `status`,
objetivos visibles por debajo de 44 px, campos con su letra y su alto, y si el puntero es fino; y las
series y comprobaciones sin captura, con claves sin `.png`), `correos.json` (los correos de los
recorridos con su asunto, texto y HTML) y `produccion.json` (el texto y las 23 peticiones, todas GET).

Dos trampas de Playwright que los scripts ya resuelven: tras una captura de página entera más alta que
la ventana, Chromium pasa a `pointer: fine` y los campos bajan de 48 a 40 px (`fine:min-h-10`), así
que se vuelve a encender el táctil por CDP; y un HTML de correo sin `<meta viewport>` en un contexto
`isMobile` se pinta a 980 px, así que los correos van en un contexto de escritorio de 360.

## Índice

| Captura                                           | Pantalla y estado                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `01-portada-visitante-360/1280`                   | `/` sin sesión: cabecera, barra inferior y pie del visitante                                     |
| `02-privacy-360/1280`                             | `/privacy`                                                                                       |
| `10-register-360/1280`                            | `/register` vacío                                                                                |
| `11-register-sin-correo-360`                      | Enviar sin correo: `Enter your email.`                                                           |
| `12-register-corta-360`                           | Contraseña de 5: `Your password must be at least 8 characters.`                                  |
| `13-register-teclado-360`                         | Teclado simulado sobre la contraseña                                                             |
| `14-checkinbox-360`                               | `Check your inbox` tras registrarse                                                              |
| `15-checkinbox-reenviado-360`                     | `Send it again`, bien                                                                            |
| `16-checkinbox-limite-360`                        | El reenvío número 11 en 5 minutos (429 de Fastify)                                               |
| `17-register-correo-usado-360`                    | Registrarse con un correo que ya tiene cuenta: la misma `Check your inbox`, y ningún correo      |
| `18-register-demasiado-larga-360`                 | Contraseña de 129: `Password too long`                                                           |
| `20-verify-ok-360`                                | El enlace del registro abierto en otro navegador: `Email confirmed`, con sesión                  |
| `21-verify-continue-360`                          | `Continue`: `/me/profile` sin corredor                                                           |
| `22-verify-otra-vez-360`                          | El mismo enlace otra vez, sin sesión: `Email confirmed` y `you are signed in`, sin estarlo       |
| `23-verify-caducado-360`                          | Un enlace caducado (JWT con `exp` vencido): `TOKEN_EXPIRED`                                      |
| `24-verify-malo-360`                              | Un token que no es un JWT: `INVALID_TOKEN`                                                       |
| `25-verify-approved-360`                          | `/verify-email?step=approved` tecleada, sin sesión                                               |
| `30-login-360/1280`                               | `/login` vacío                                                                                   |
| `31-login-sin-correo-360`                         | Enviar vacío: `Enter your email.`                                                                |
| `32-login-contrasena-mala-360`                    | Contraseña mala: `Invalid email or password`                                                     |
| `33-login-teclado-360`                            | Teclado simulado sobre la contraseña                                                             |
| `34-login-sin-confirmar-360`                      | Contraseña buena y correo sin confirmar: `Confirm your email first`                              |
| `35-login-429-fastify-360`                        | Intento 11 en 5 minutos desde una IP, sin `NODE_ENV`: el 429 se pinta `Wrong email or password.` |
| `36-login-429-better-auth-360`                    | Intento 4 en 10 s con `NODE_ENV=production`: `Too many requests. Please try again later.`        |
| `37-forgot-429-better-auth-360`                   | Cuarta petición de recuperación en un minuto con `NODE_ENV=production`: la pantalla de enviado   |
| `40-forgot-360/1280`                              | `/forgot-password` vacío                                                                         |
| `41-forgot-sin-correo-360`                        | Enviar vacío                                                                                     |
| `42-forgot-enviado-360`                           | Pedido (la misma para un correo sin cuenta)                                                      |
| `43-reset-360`                                    | El enlace del correo: el formulario                                                              |
| `44-reset-corta-360`, `45-reset-no-coinciden-360` | Los dos errores del formulario                                                                   |
| `46-reset-teclado-360`                            | Teclado simulado sobre `Repeat it`                                                               |
| `47-reset-hecho-360`                              | Guardada: `/login`, sin ningún mensaje                                                           |
| `48-reset-usado-360`                              | El mismo enlace otra vez: `INVALID_TOKEN`                                                        |
| `49-reset-token-malo-360`                         | Un token inventado                                                                               |
| `49b-reset-sin-token-360`                         | `/reset-password` tecleada                                                                       |
| `50-account-360/1280`                             | `/account` de una cuenta confirmada                                                              |
| `51-account-sin-confirmar-360`                    | Cuenta antigua con sesión y sin confirmar: el aviso                                              |
| `52-account-sin-confirmar-enviado-360`            | El aviso, tras `Send me a confirmation link`                                                     |
| `53-account-correo-vacio-360`                     | `Update email` vacío                                                                             |
| `54-account-correo-pedido-360`                    | Cambio de correo pedido                                                                          |
| `55-account-teclado-360`                          | Teclado simulado sobre `New email`: el botón queda debajo                                        |
| `56-verify-approved-real-360`                     | El primer enlace (a la dirección vieja), en el navegador con sesión                              |
| `57-verify-cambio-hecho-360`                      | El segundo enlace (a la nueva)                                                                   |
| `58-account-correo-cambiado-360`                  | `/account` con el correo nuevo                                                                   |
| `60-account-pw-actual-mala-360`                   | Cambiar la contraseña con la actual mala: `Invalid password`                                     |
| `61-account-pw-cambiada-360`                      | `Password updated.`                                                                              |
| `62-account-borrar-abierto-360`                   | `Delete my account…` abierto                                                                     |
| `63-account-borrar-mala-360`                      | Borrar con la contraseña mala: `Invalid password`                                                |
| `64-account-borrar-teclado-360`                   | Teclado simulado sobre la contraseña del borrado                                                 |
| `65-account-borrada-360`                          | Borrada: `/` sin sesión                                                                          |
| `70-correo-1-360`                                 | Correo `Confirm your Cycling Star email`                                                         |
| `70-correo-2-360`                                 | Correo `Reset your Cycling Star password`                                                        |
| `70-correo-3-360`                                 | Correo `Confirm the new email of your Cycling Star account` (a la dirección vieja)               |
| `80-produccion-login-360`                         | `https://www.cyclingstar.app/login`, solo GET, 19 de noviembre de 2026                           |
