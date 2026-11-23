## 1. Lo que ya existe y lo que el encargo daba por hecho

El texto de E4 (`docs/encargos.md` l. 308 a 337) y el de G11 (`docs/epics.md` l. 597 a 654) se escribieron antes de que la API mandara correo, y buena parte de lo que dicen ya no es verdad. Esta sección es el suelo del diseño: lo que hay en `2a29e6d` (sin cambios de código hasta `3c8f431`, comprobado con `git diff --stat 2a29e6d HEAD -- apps packages`, vacío), lo que los mapas encontraron debajo y lo que se queda como está. Todo lo que sigue en el documento parte de aquí y no de la letra del encargo.

### 1.1 Lo que ya existe

| Lo que dice el encargo o G11                                        | Lo que hay hoy                                                                                                                                                                                                                                                                                                                                                                                           | Lo que hace E4                                                                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `better-auth` corre «sin enviar un solo correo»                     | Salen tres correos de cuenta por la API HTTP de Resend, sin SDK: recuperar (`resetPasswordEmail`, `apps/api/src/emails.ts` l. 66), confirmar (`verifyEmailEmail`, l. 92) y aprobar un cambio de correo desde la dirección vieja (`changeEmailConfirmationEmail`, l. 118). Remitente `no-reply@cyclingstar.app`; `send` nunca lanza y enmascara el buzón (`mailer.ts` l. 65 a 69 y 102 a 114; mapa 02 §1) | Se quedan dos, `verify_signup` y `reset_password` (`00-encargo.md` §9.3); el tercero se borra con el cambio de correo de autoservicio (§5.5) |
| «Nadie verifica que el correo sea suyo»                             | Verificación obligatoria: `requireEmailVerification: true` (`auth.ts` l. 122); el registro no abre sesión; abrir el enlace confirma y entra (`autoSignInAfterVerification`); quien entra sin confirmar recibe un 403 y un enlace nuevo después de comprobar la contraseña (`sendOnSignIn`, l. 146)                                                                                                       | Se queda; el enlace pasa a una página de botón y vive 24 horas (§5)                                                                          |
| «Una contraseña perdida es una cuenta perdida»                      | Hay recuperación: `sendResetPassword` (`auth.ts` l. 126 a 128), con `ForgotPassword` y `ResetPassword`                                                                                                                                                                                                                                                                                                   | Se endurece: cierra todas las sesiones, el enlace se guarda con hash y da la cookie de aparato (§5.4)                                        |
| «El cambio de correo se aplica a pelo»                              | Cambio con aprobación desde la dirección vieja y verificación de la nueva (`changeEmail`, `auth.ts` l. 155 a 165); el destino de cada enlace lo fija el servidor (`withCallbackURL`, l. 33 a 41)                                                                                                                                                                                                         | **Se retira**: el jugador no cambia su correo; lo cambia un administrador desde el panel y queda escrito (§5.5, §8.5)                        |
| (no lo menciona)                                                    | Cambio de contraseña en `Account`, que cierra las otras sesiones (`revokeOtherSessions: true`, `apps/web/src/pages/Account.tsx` l. 223)                                                                                                                                                                                                                                                                  | Se queda, en su subpágina (§12.2)                                                                                                            |
| (no lo menciona)                                                    | Borrar la cuenta pide siempre la contraseña (gancho `before`, `auth.ts` l. 180 a 192); corredor y equipo pasan a la máquina (`releaseUserToWorld`, `packages/db/src/teamControl.ts` l. 200 a 208); `sessions`, `accounts` y `race_watch` caen en cascada (`schema.ts` l. 143, 155 y 946)                                                                                                                 | Pasa a una transacción (§10.4)                                                                                                               |
| (no lo menciona)                                                    | Cookie de sesión `httpOnly`, `sameSite: lax`, `secure` en https; comprobación de origen siempre encendida; orígenes de confianza con su gemelo `www` (`auth.ts` l. 43 a 81 y 194 a 223)                                                                                                                                                                                                                  | Se queda (§1.4)                                                                                                                              |
| Las pantallas de entrada y de la cuenta                             | `Login`, `Register` con `CheckInbox`, `VerifyEmail`, `ForgotPassword`, `ResetPassword` y `Account` con el sistema de E3 (`docs/visual.md` §17.21)                                                                                                                                                                                                                                                        | Se corrigen sus textos en el PR 1 y `Account` pasa a lista (§12)                                                                             |
| «Empezar a registrar la última visita» (`encargos.md` l. 772 a 775) | Existe: `users.last_seen_at` (migración 0048 de E2, `schema.ts` l. 121 a 125), escrita como mucho una vez por hora por `touchLastSeen` (`horizon.ts` l. 585 a 603), con historial desde el 8 de octubre de 2026 (mapa 03 §6)                                                                                                                                                                             | Se escribe en toda visita (§10.6)                                                                                                            |
| (no lo menciona)                                                    | El primer correo de notificación está escrito y no se envía: `stageReadyEmail` (`emails.ts` l. 153), con tres tests (`emails.test.ts` l. 81 a 121) y el canario de destripe (`spoilerCanary.test.ts` l. 206)                                                                                                                                                                                             | Se borra; vale su texto, `stageReadyNotice`, para el aviso (§13)                                                                             |
| (no lo menciona)                                                    | `users.locale` existe con `'es'` por defecto (`schema.ts` l. 109) y la interfaz entera está en inglés                                                                                                                                                                                                                                                                                                    | El defecto pasa a `'en'` y el registro escribe la lengua del navegador (§4.7)                                                                |

### 1.2 Lo que está a medias y lo que no existe

**A medias: los límites de intento.** Hay dos capas y ninguna mira la cuenta (`00-encargo.md` §2.2). `@fastify/rate-limit` da 300 por minuto y por IP en todo, 60 por minuto en el resto de `/api/auth/*` y 10 cada 5 minutos por IP y por ruta en las ocho de `CREDENTIAL_AUTH_PATHS` (`apps/api/src/security.ts` l. 10, 36, 43 y 54 a 68), en memoria: se vacía en cada despliegue. El limitador de `better-auth` nadie lo configura y solo corre con `NODE_ENV=production` (mapa 01 §4.1); Nixpacks lo pone según su documentación y no está comprobado en Railway (mapa 01 §4.3). Medido: más de 40 fallos contra un correo desde varias IP y la contraseña buena entra a la primera desde una IP nueva (mapa 01, serie H).

**No existe:** la fecha de nacimiento y las condiciones de uso; ver las sesiones propias y cerrarlas (salvo de rebote al cambiar la contraseña); notificaciones de ningún tipo; el modo ausencia; un canal de contacto; exportar los datos (`00-encargo.md` §2.3). La separación del correo transaccional y el de notificación ya no hace falta (§9.6).

### 1.3 Lo que los mapas añadieron, por gravedad

| #   | Hallazgo                                                                                                                                                                         | Medido o leído                                                       | Dónde se arregla    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------- |
| 1   | Recuperar la contraseña no cierra ninguna sesión: la de antes del reset sigue respondiendo 200                                                                                   | medido, mapa 01 §2                                                   | §5.4                |
| 2   | Dos enlaces de recuperación valen a la vez, y se guardan en claro en `verifications.identifier`                                                                                  | medido, mapa 01 §2                                                   | §5.1                |
| 3   | El tiempo de respuesta delata qué correos tienen cuenta: con un correo de 250 ms, 341 frente a 84 ms al registrarse y 259 frente a 9 ms al recuperar                             | medido, mapa 01 §5 (medianas de 9; los 250 ms son supuestos)         | §5.6                |
| 4   | Ningún límite mira la cuenta, y el de `better-auth` mete a todo el mundo en un solo cubo si la cabecera trae dos IP                                                              | medido, mapa 01 §4.2                                                 | §7                  |
| 5   | `verify-password` responde por HTTP a 60 intentos por minuto con una sesión robada; `update-user` guarda 900.000 caracteres en `name` e `image`                                  | medido, mapa 01 §1                                                   | §8.1                |
| 6   | La IP se guarda en `sessions.ip_address` y entera en los logs; los tokens de los enlaces y el correo descodificable salen en la URL de cada línea de log                         | medido, mapa 03 §4                                                   | §6.2, §10.3         |
| 7   | `Privacy.tsx` dice cuatro cosas falsas: que la IP no se guarda, que solo hay una cookie, que los datos son «that's it» y que se puede pedir el borrado (l. 19 a 20, 27, 33 y 38) | leído, mapa 03 §5                                                    | §10.1               |
| 8   | El borrado de autoservicio no es una transacción: si el `DELETE` fallara, el corredor ya sería de la máquina y la cuenta seguiría viva                                           | leído, mapa 03 §3                                                    | §10.4               |
| 9   | El 429 de Fastify se pinta como contraseña mala, y `ForgotPassword` da por enviado el enlace con un 429 (`Login.tsx` l. 61; `ForgotPassword.tsx` l. 47; `app.ts` l. 213 a 217)   | medido, mapa 05 §4 y §6                                              | §12.3               |
| 10  | Finales mudos: la contraseña nueva lleva a `/login` sin decir nada, la cuenta borrada a la portada sin una frase, y `VerifyEmail` dice `you are signed in` sin sesión            | medido, mapa 05 §5 a §7                                              | §5.2, §12.4         |
| 11  | Cambiar a un correo ocupado promete un correo que no sale                                                                                                                        | medido, mapa 05 §7, captura 53c                                      | desaparece con §5.5 |
| 12  | DKIM de 1.024 bits y DMARC `p=none` sin `rua`: nadie recibe un informe                                                                                                           | leído en el DNS, mapa 02 §2                                          | §9.1                |
| 13  | El plan de Resend no se sabe; el gratuito da 100 correos al día y 3.000 al mes, y con verificación obligatoria el correo 101 del día es alguien que no entra                     | leído, mapa 02 §3                                                    | §9.4                |
| 14  | En iPhone, el aviso web solo llega a una web añadida a la pantalla de inicio                                                                                                     | leído, mapa 02 §6                                                    | §13                 |
| 15  | El agente libre de un humano que no entra se queda parado: nadie le firma                                                                                                        | leído, mapa 03 §7                                                    | §14                 |
| 16  | El cuerpo del 200 del registro delata si el correo tiene cuenta: `user.id` de 36 caracteres con uno nuevo y de 32 con uno que existe                                             | medido por el refutador de código en 1.6.25 y 1.7.26                 | §5.3, PR 3          |
| 17  | Una ruta con `..` o `.` (`/api/auth/x/../sign-in/email`) cae en el comodín y se salta el límite estricto de credenciales; el borde de Railway no la normaliza                    | medido en local; comprobado en producción con GET el 23 de noviembre | §7.2, PR 3          |
| 18  | El registro está abierto: `auth.ts` no tiene `disableSignUp` (l. 142) y la cabecera ofrece `Sign up`                                                                             | leído                                                                | §4.9                |

Los hallazgos 16 y 17 los encontró el refutador de código y están en producción hoy. Preguntado si los arreglaba un PR urgente aparte, el dueño respondió «no, primero el plan de E4» (`00-encargo.md` §9.4, 23 de noviembre de 2026): **los dos entran en el PR 3, el primer PR de seguridad del plan** (§18.3).

### 1.4 Lo que está bien y se queda

- **La cookie de sesión** y la **comprobación de origen** encendida siempre, también en los tests (`auth.ts` l. 194 a 223): ningún cambio.
- **`withCallbackURL`** (`auth.ts` l. 33 a 41): el servidor fija a dónde lleva cada enlace. Con las páginas de botón (§5.2) deja de hacer falta en los correos nuevos y se queda para los enlaces viejos.
- **`send` nunca lanza** (`mailer.ts` l. 102 a 114): un correo que no sale no tumba el registro. E4 le añade guardar el `id` de Resend (§9.2).
- **`cs_viewer`** (E2, `viewerCookie.ts` l. 27 a 31): solo restringe y nunca abre una ruta privada. No es la cookie de aparato (X-07) y no cambia (§6.6).
- **El catálogo de E3**: toda pantalla nueva sale de `Notice`, `Panel`, `ActionRow`, `Button`, `Checkbox`, `Segmented`, `TextLink`, `PageHeader`, `Disclosure` y `Sheet`; solo entran `DateField` y la prop `reveal` de `Field` (§12.5).
- **El panel de administración** ya tiene la forma que el dueño quiere (`00-encargo.md` §9.2, punto 1): un administrador raíz fijado por el despliegue (`ADMIN_EMAIL`, `packages/db/src/adminUsers.ts` l. 21 a 26), administradores dados desde el panel que nadie se puede quitar a sí mismo (`routes/admin.ts` l. 114 a 116) y un raíz que nadie borra (l. 134 a 136). Le falta el registro de lo que se edita (§8.5).
- **Las dependencias**: ningún aviso abierto nos alcanza hoy (mapa 01 §8); se suben igual (§8.3).

---

**Injertos aplicados.** Ninguno asignado.

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.**

- **1-a**, la fila del cambio de correo de la tabla de `00-encargo.md` §2.1 se escribe con lo que decidió el dueño el 23 de noviembre (`00-encargo.md` §9.3): el autoservicio se retira. El esqueleto (§B, §1) aún lo daba por vivo.
- **1-b**, la separación del correo de notificación sale de «lo que no existe» y pasa a «no hace falta»: no habrá correo de notificación (D-00c) y §9.6 escribe lo que haría falta el día que lo hubiera.

## 2. El modelo de amenazas

La mitad del encargo es seguridad (`00-encargo.md` §1, punto 2), y un freno sin su atacante delante no se puede medir. Esta sección nombra a los diez que se defienden, dice qué los para en este diseño y con qué cifra, y escribe lo que no se defiende y por qué. Las decisiones del dueño del 23 de noviembre (`00-encargo.md` §9.2 y §9.3) quitan tres frenos que las propuestas daban por puestos: el segundo factor del panel, la lista de contraseñas filtradas y los correos que avisan de un cambio. Lo que esos frenos cubrían se dice aquí con lo que queda en su lugar.

### 2.1 Los diez atacantes

| #   | Atacante                                                   | Tiene                                               | Gana                                                                                    | Hoy le basta con                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Relleno de credenciales (red de bots)                      | pares de correo y contraseña filtrados, miles de IP | cuentas en masa, equipos, premium                                                       | una IP por intento: el límite es por IP y por ruta (mapa 01 §4.2, serie C: 13 de 13 sin 429)                                                                                                                                                                                      |
| A2  | Rival dirigido                                             | el correo de la víctima, quizá una contraseña vieja | su corredor, su equipo                                                                  | más de 40 fallos desde varias IP y la buena entra (mapa 01 §4.2, serie H)                                                                                                                                                                                                         |
| A3  | Ladrón de sesión (ordenador compartido, teléfono prestado) | la cookie, no la contraseña                         | la cuenta durante semanas                                                               | recuperar no lo echa (mapa 01 §2) y la sesión se renueva sola (mapa 01 §3)                                                                                                                                                                                                        |
| A4  | Dueño de un buzón ajeno                                    | el correo de la víctima                             | todo: recupera y entra                                                                  | no hay defensa posible sin un segundo factor                                                                                                                                                                                                                                      |
| A5  | Atacante del panel                                         | A3 o A4 contra la cuenta de `ADMIN_EMAIL`           | el juego entero: premium, administradores, borrar cuentas, y desde E4 cambiar correos   | lo mismo que A3 o A4: el raíz es «el correo confirmado» (`adminUsers.ts` l. 21 a 26)                                                                                                                                                                                              |
| A6  | Quemador de cuota y reputación                             | 10 IP y un guion                                    | dejar sin correo a todo el juego: registros que no entran, recuperaciones que no llegan | 10 IP por 10 peticiones cada 5 minutos agotan 100 correos en 5 minutos (estimado, plan gratuito, mapa 02 §3)                                                                                                                                                                      |
| A7  | Enumerador                                                 | una lista de correos                                | saber quién juega (un menor, un compañero de trabajo)                                   | el tiempo: 341 frente a 84 ms al registrarse, 259 frente a 9 ms al recuperar (mapa 01 §5, medido); y sin medir tiempos, el cuerpo del 200 del registro: `user.id` de 36 caracteres si el correo es nuevo y de 32 si existe (refutador de código, medido en 1.6.25 y 1.7.26; §5.3) |
| A8  | Menor que miente                                           | un navegador                                        | jugar con menos de 16                                                                   | no se pide la edad (`00-encargo.md` §2.3)                                                                                                                                                                                                                                         |
| A9  | Abusador de avisos                                         | una sesión, o la clave VAPID filtrada               | una SSRF desde la API; avisos de phishing a todos                                       | no existe todavía: nace con E4                                                                                                                                                                                                                                                    |
| A10 | Escáner de enlaces del buzón (no malicioso)                | el correo, y sigue los enlaces                      | confirma una cuenta sin humano                                                          | los enlaces son GET que cambian estado (mapa 01 §2)                                                                                                                                                                                                                               |

A10 se suma a A2: el rival se registra con el correo de trabajo de la víctima y **su** contraseña, el escáner del buzón corporativo abre el enlace de verificación y la cuenta queda confirmada con el correo de la víctima y la contraseña del rival (estimado por el código, `sendOnSignUp` y `autoSignInAfterVerification`; no probado con un escáner real, H-08). Con el registro por aprobación (§4.9) el enlace solo sale cuando un administrador aprueba la cuenta, así que el ataque pasa además por la mano del administrador.

### 2.2 Lo que para a cada uno

| #   | Lo que lo para en este diseño                                                                                                                                                                                                                                                                                                                                                                                 | Sección                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| A1  | L1 por cuenta, sin tope diario; L4 en el registro; el aviso `new_sign_in` por push a quien tiene avisos (DD-16, solo push)                                                                                                                                                                                                                                                                                    | §7.4, §13              |
| A2  | L1 cierra solo a los navegadores sin `cs_device`; la reserva antes de comprobar (una ráfaga de 40 deja 10 × 401 y 30 × 429, codigo C1); clave HMAC que no se invierte con un diccionario; una ruta con `..`, `.`, `//` o codificada da 404 antes de todo límite, porque hoy `/api/auth/x/../sign-in/email` cae en el comodín y se salta el límite estricto (medido en producción, `00-encargo.md` §9.4; PR 3) | §7.2, §7.3, §7.5       |
| A3  | Recuperar cierra todas las sesiones; `Devices` las enseña y cierra; techo de 90 días; sin `cookieCache`; el token no llega al JavaScript (el proxy lo quita de todo JSON de `/api/auth/*`, también del 200 de `sign-in/email`); `Sign out` borra la suscripción de avisos; `Forget this device` en un ordenador compartido; L3 por sesión, así que el ladrón no cierra `change-password` al dueño             | §5.4, §6, §7.4         |
| A4  | Nada lo para (§2.3). Lo acota: recuperar avisa por push a los aparatos del dueño (`password_changed`) y `Devices` enseña la entrada nueva                                                                                                                                                                                                                                                                     | §5.4, §6.4             |
| A5  | El correo de `ADMIN_EMAIL` no se cambia ni se da desde el panel; cada edición de un administrador queda en `admin_audit` con el valor viejo y el nuevo; el segundo factor del buzón del dueño, como tarea de operación                                                                                                                                                                                        | §8.5, §8.6             |
| A6  | El registro ya no manda correo: `verify_signup` sale cuando un administrador aprueba (§4.9). Quedan L4 (20 rutas de correo al día por IP), L5 (3 por hora por destinatario) y el presupuesto con su reserva para recuperar, que cada destinatario gasta una vez al día                                                                                                                                        | §4.9, §7.4, §7.6, §9.4 |
| A7  | `backgroundTasks`: ninguna respuesta espera al correo (4,0 frente a 4,6 ms al recuperar con un correo de 250 ms, X-15); el proxy fija el cuerpo del 200 del registro a `{ "token": null, "user": null }` (PR 3, `00-encargo.md` §9.4); L1 cuenta igual un correo que no existe; el registro con un correo que existe no manda nada                                                                            | §5.3, §5.6, §7.4       |
| A8  | La fecha de nacimiento con la puerta neutra; el mismo 400 con un correo nuevo y con uno que existe (X-09)                                                                                                                                                                                                                                                                                                     | §4                     |
| A9  | `isAllowedPushEndpoint` al guardar y al enviar; `PUSH_TARGETS_PER_USER`; ningún error vuelve al navegador                                                                                                                                                                                                                                                                                                     | §13                    |
| A10 | Todo enlace aterriza en una página de botón con el token en el fragmento; la purga de cuentas sin confirmar a 7 días (DD-17 A)                                                                                                                                                                                                                                                                                | §5.2, §9.5             |

### 2.3 Lo que no se defiende, y por qué

- **El buzón comprometido (A4).** Solo lo pararía un segundo factor, y la cuenta se queda en correo y contraseña (D-00f). Desde el 23 de noviembre tampoco hay correos que avisen de un cambio ni deshacer (`00-encargo.md` §9.3): el dueño del buzón recupera, entra y la víctima se entera por push si tiene avisos encendidos, o al ver que su contraseña ya no vale. Sin canal de contacto no tiene a quién pedir la cuenta (§11).
- **A1 con la contraseña buena.** Una red de bots que acierta a la primera no se distingue de la víctima. El dueño eligió no comprobar contraseñas filtradas (DD-11 C, «Si alguien quiere usar una pass comprometida aqui pues allá el», `00-encargo.md` l. 383 a 384). Queda el aviso de entrada nueva por push y la fila nueva en `Devices`.
- **El panel sin segundo factor (A5).** El dueño eligió el panel de twilightstruggle sin TOTP (DD-01 A, `00-encargo.md` l. 360 a 369). Quien tenga el buzón de `ADMIN_EMAIL` tiene el panel (`docs/ops.md` l. 131 a 134). Se mitiga fuera del juego: el segundo factor del propio buzón del dueño, escrito como tarea en `docs/ops.md` (§8.6).
- **El administrador engañado.** Desde E4 un administrador cambia correos (§5.5). Quien convenza a un administrador de que es otro jugador recibe su cuenta: cambia el correo, recupera y entra. La sesión abierta de la víctima **no** es un freno: al guardar la contraseña nueva, `revokeSessionsOnPasswordReset` borra todas las sesiones (`ba17/utils/password.mjs` l. 31 a 34) y recuperar borra sus suscripciones (§5.4). Lo que queda: el aviso `email_changed` por push a los aparatos de la víctima antes del cambio, si tiene avisos (§5.5); la fila de `admin_audit` con el correo viejo; y la prudencia del administrador, que no tiene prisa. No hay más freno mientras no haya un canal donde comprobar quién pide. Al revés, si quien pide el cambio es la víctima de A4 que perdió el buzón, `Sign out everywhere`, encendida por defecto, echa al intruso.
- **El ordenador compartido.** `cs_device` dura 180 días y sobrevive a `Sign out` (§7.5). En un ordenador compartido donde nadie pulsa `Forget this device` (§6.5), quien llegue después y sepa la contraseña entra por L2 y sin aviso `new_sign_in`. Cambiar la contraseña sube `device_epoch` y saca de «conocidos» a todos los demás navegadores (§5.4).
- **El menor que miente (A8).** La edad es declarada (D-00a). Sin contacto, nadie puede avisar de un menor (H-11, §11). Qué hacer con uno descubierto, a confirmar con un abogado (§21.3).
- **Fuera del alcance de la cuenta**: malware y XSS en el navegador de la víctima, Railway, Resend y el DNS de `sistelcoin.com`. La CSP de `app.ts` l. 175 a 195 ya corta el código de terceros.

### 2.4 Lo que le queda al atacante (calculado)

| Atacante                                                | Con este diseño                                                                                                                                                                                                                                                                                                       | Hoy                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A2 contra una cuenta, desde navegadores sin `cs_device` | L1: 10 cada 15 minutos, 960 al día (10 × 96 ventanas)                                                                                                                                                                                                                                                                 | sin techo por cuenta: 2.880 al día por cada IP (10 cada 5 minutos) |
| A2 o A3 con una `cs_device` robada                      | L2: 10 en 15 minutos y 30 en 24 horas por cookie, y después cae en L1                                                                                                                                                                                                                                                 | no aplica                                                          |
| A3 con una sesión robada, probando contraseñas          | L3 por sesión: 5 en 15 minutos y 10 en 24 horas; la décima cierra esa sesión; las otras sesiones del dueño siguen pudiendo cambiar la contraseña (techo de 30 al día por cuenta). `verify-password` da 404                                                                                                            | 60 por minuto por `verify-password` (mapa 01 §1)                   |
| A6 con 10 IP                                            | registrarse no gasta correo (§4.9); L4: 200 peticiones de recuperar al día (10 × 20). La reserva de 30 la gasta cada destinatario una vez al día UTC, así que agotarla pide 30 cuentas confirmadas distintas, o 30 correos de jugadores de verdad (que recibirían el enlace); con ellas, el día se agota igual (§7.6) | 100 correos en 5 minutos                                           |
| A7 por el tiempo                                        | diferencia por debajo del ruido (4,0 frente a 4,6 ms, X-15)                                                                                                                                                                                                                                                           | 250 ms de diferencia con un correo de 250 ms                       |

A2 con 960 intentos al día contra una cuenta no es un secuestro si la contraseña no está en su lista, y no le cierra la puerta al dueño en su navegador de siempre (§7.5). Que L1 no tenga tope diario es deliberado: un tope diario lo convertiría en un día entero sin entrar para el dueño desde un navegador nuevo (D-24; seguridad O-01).

---

**Injertos aplicados.** Ninguno asignado.

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.**

- **2-a**, A4 y A1 se escriben sin los frenos que el dueño quitó: sin correos de cambio ni deshacer (§9.3 del encargo) y sin contraseñas filtradas (DD-11 C). El esqueleto contaba con los dos.
- **2-b**, se añade al modelo el administrador engañado, que nace con el cambio de correo hecho por un administrador (§9.3 del encargo); no tiene número de atacante para no renumerar los diez del glosario.
- **2-c**, la cifra de A6 se escribe con el plan gratuito y las 30 de reserva (DD-10 B), no con Pro.

## 3. Principios

Once reglas que deciden lo que el resto del documento no diga. Las ocho primeras son las de la base (jugador §2), con el principio 2 reescrito por lo que el dueño decidió el 23 de noviembre y el 5 corregido por I-03; las tres últimas vienen de `incremental` y de `atacante` (D-03).

### 3.1 Los once, con su consecuencia

| #   | Principio                                                                                                          | Consecuencia en el diseño                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ningún final mudo                                                                                                  | toda acción que acaba en otra pantalla lleva allí un `Notice` `good` con `role="status"` (`docs/visual.md` §4.7): `Password saved`, `Your account is deleted`, `Email confirmed` (§12.4)                                                                                                                             |
| 2   | El correo lleva dos enlaces y nada más; lo que cambia la cuenta se ve en la web y llega por aviso a quien lo tiene | salen `verify_signup` y `reset_password` y ningún otro (`00-encargo.md` §9.3); la contraseña cambiada, la entrada nueva y el correo cambiado por un administrador van por push (§5.4, §5.5, §13) y siempre se ven en `Devices` y en las filas `Password` y `Email` de `Account` (§12.1), que son su gemelo en la web |
| 3   | Un límite dice cuánto esperar y nunca se disfraza                                                                  | un traductor de errores único, `authErrorText`, que lee `retryAfterS` (§12.3)                                                                                                                                                                                                                                        |
| 4   | La web dice todo; el aviso solo adelanta                                                                           | cada aviso tiene su gemelo en la web (§13), y quien no tiene avisos (el iPhone sin pantalla de inicio, quien dijo que no) no pierde nada salvo la prisa                                                                                                                                                              |
| 5   | Un tercero nunca bloquea al dueño, y recuperar siempre lo saca                                                     | L1 solo cierra a los navegadores sin `cs_device`, y recuperar da esa cookie al navegador que recupera (I-03, §7.5)                                                                                                                                                                                                   |
| 6   | Un campo menos vale más que una comprobación más                                                                   | `Show` en lugar de `Repeat it`; el correo que viaja de `Login` a `ForgotPassword`; la fecha con `autocomplete` (§4.1)                                                                                                                                                                                                |
| 7   | Cada pantalla de la cuenta cabe sobre el teclado                                                                   | `Account` pasa a lista con subpáginas, el formulario arriba (DD-07 A, §12.1)                                                                                                                                                                                                                                         |
| 8   | Lo que la web dice de los datos es verdad el día que sale                                                          | `Privacy.tsx` cambia en el PR que hace verdad cada frase, y `privacy.test.ts` crece con él (§10.2)                                                                                                                                                                                                                   |
| 9   | Opción antes que gancho, gancho antes que ruta propia                                                              | lo que `better-auth` 1.7.26 ya trae se activa con su opción (`revokeSessionsOnPasswordReset`, `storeIdentifier`, `backgroundTasks`, `disableIpTracking`, `disabledPaths`); lo que no, con un gancho (`beforeDelete`, `databaseHooks`); una ruta propia solo donde no hay otra (`/api/me/devices`, `/api/me/export`)  |
| 10  | Lista blanca, nunca lista negra                                                                                    | el proxy deja pasar once rutas de `better-auth` y da 404 a las demás, comparadas con la ruta normalizada; una subida o un plugin no abren una ruta sin decidirlo (§7.2, §8.1)                                                                                                                                        |
| 11  | Un enlace de correo nunca cambia nada por sí solo                                                                  | todo enlace aterriza en una página de botón y el token viaja en el fragmento, que no llega a ningún log, y al pulsar, en el cuerpo de un `POST` (§5.2)                                                                                                                                                               |

El principio 2 sustituye a dos que la síntesis había escrito y que el dueño deshizo: «lo que cambia la cuenta se cuenta por correo a quien la tenía» (jugador §2) e «ninguno de seguridad va por aviso: la seguridad va por correo, que no depende de un permiso» (I-18). El dueño: «Solo correo para forgot password y para acabar el registro» y «Sin correo, solo notificación push» (`00-encargo.md` l. 386 y 398 a 399). El precio, escrito: quien no tiene avisos encendidos no se entera de una entrada nueva ni de un cambio de contraseña hasta que mira `Devices` o su contraseña deja de valer (§2.3).

---

**Injertos aplicados.** I-18 (§3.1, principio 2): aplicado al revés de como lo escribió el veredicto, porque el dueño decidió lo contrario después; la frontera que fijaba (qué va por correo y qué por aviso) queda escrita, con la seguridad del lado del aviso.

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.**

- **3-a**, el principio 2 se reescribe con `00-encargo.md` §9.2, punto 9, y §9.3, punto 1: dos correos, y la seguridad por push con su gemelo en la web.
- **3-b**, el principio 10 dice once rutas y no doce: `change-email` sale de la lista blanca con el cambio de correo de autoservicio (§8.1).

## 4. El registro y la edad

El dueño fijó la edad mínima en 16, declarada con la fecha de nacimiento, y que las cuentas que ya existen la den al entrar («Ok», `00-encargo.md` l. 309 a 310; D-00a). Sigue en pie el aviso de `docs/agenda.md` §3.7: **confirmarlo con un abogado antes de abrir el registro**, que con la aprobación de §4.9 quiere decir antes de aprobar a nadie. Esta sección dice cómo se pide, dónde se valida, qué se guarda, qué ve quien no llega y qué pasa con las cuentas de hoy. Desde el 23 de noviembre el registro es **por aprobación**, como en `twilightstruggle`: quien se registra queda `pending` hasta que un administrador lo aprueba, y solo entonces sale el correo para terminar el registro (§4.9; `00-encargo.md` §9.5, punto 1).

### 4.1 El formulario (pantalla, 360 px)

```
Create your account
Start building your rider.

Email
[ you@example.com                       ]
Password
[ ••••••••••••                   [Show] ]
At least 8 characters.
Date of birth
[ Day ] [ Month ] [  Year  ]
We only use it to check you're old enough to play.

[            Create account             ]
By creating an account you agree to the Terms and the Privacy notice.
Already have an account? Log in
```

- **La fecha** es `DateField` (§12.5): tres campos numéricos de 64, 64 y 96 px en una fila, `inputmode="numeric"` y `autocomplete` `bday-day`, `bday-month` y `bday-year` (D-04). Un `<input type="date">` en Android abre el mes en curso y llegar a 2008 cuesta unos cinco toques (estimado, sin aparato); con tres campos, el navegador que tenga la fecha la rellena de un toque y si no son ocho cifras.
- **La puerta neutra**: ni la etiqueta ni la ayuda nombran la edad mínima, para no invitar a teclear otra fecha. La ayuda es `We only use it to check you're old enough to play.` (pantalla).
- **`Show`** es la prop `reveal` de `Field` (§12.5): un `Button` `quiet` de 44 × 44 que alterna `Show` y `Hide`.
- **Las condiciones** van en una línea bajo el botón, con `TextLink` a `/terms` y a `/privacy`, sin casilla (DD-13 A, §4.6).
- La web manda `name: ''` porque `sign-up/email` lo exige (`name: z.string()`, `better-auth` 1.7.26, `api/routes/sign-up.mjs` l. 16) y el servidor lo pone a `'Player'` (§4.7). Hoy manda la parte local del correo.

### 4.2 La validación en el servidor

La regla vive en `packages/shared/src/account/birthDate.ts`, compartida por la web (para el error en la página) y por la API (para la verdad). En la API corre como `user.additionalFields.birthDate` con `validator.input: birthDateSchema` (D-06; I-09): `better-auth` 1.7.26 valida los campos adicionales en `parseUserInput` (`sign-up.mjs` l. 157) antes de buscar el correo (l. 192), así que el menor recibe el mismo 400 con un correo nuevo y con uno que ya tiene cuenta (X-09, reproducido por el juez de seguridad). El error sale como 400 `VALIDATION_ERROR` con el `message` de la primera incidencia de Zod (`ba17/db/schema.mjs` l. 81 a 85, leído); por eso los mensajes de la regla son los códigos. El validador tiene que ser síncrono: uno asíncrono da 500 `ASYNC_VALIDATION_NOT_SUPPORTED` (l. 82).

```ts
// packages/shared/src/account/birthDate.ts
import { z } from 'zod'
import { MIN_AGE_YEARS, MIN_BIRTH_YEAR } from './constants.js'

export interface YearMonthDay {
  year: number
  month: number // 1 a 12
  day: number
}

export type BirthDateError = 'INVALID_BIRTH_DATE' | 'UNDER_MINIMUM_AGE'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` a sus tres números, o null si la fecha no existe (31 de abril, 29 de febrero de 2023). */
export function parseIsoDate(value: string): YearMonthDay | null {
  const m = ISO_DATE.exec(value)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null
  }
  return { year, month, day }
}

/** Años cumplidos el día UTC de `today`. Quien nació un 29 de febrero cumple el 1 de marzo en año no bisiesto. */
export function ageOn(birth: YearMonthDay, today: Date): number {
  const month = today.getUTCMonth() + 1
  const day = today.getUTCDate()
  const before = month < birth.month || (month === birth.month && day < birth.day)
  return today.getUTCFullYear() - birth.year - (before ? 1 : 0)
}

export function isOldEnough(birth: YearMonthDay, today: Date): boolean {
  return ageOn(birth, today) >= MIN_AGE_YEARS
}

/** La regla entera con un reloj inyectable, para los tests. */
export function makeBirthDateSchema(now: () => Date = () => new Date()) {
  return z.string().superRefine((value, ctx) => {
    const today = now()
    const birth = parseIsoDate(value)
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    if (
      birth === null ||
      birth.year < MIN_BIRTH_YEAR ||
      Date.UTC(birth.year, birth.month - 1, birth.day) > todayUtc
    ) {
      ctx.addIssue({ code: 'custom', message: 'INVALID_BIRTH_DATE' satisfies BirthDateError })
      return
    }
    if (!isOldEnough(birth, today)) {
      ctx.addIssue({ code: 'custom', message: 'UNDER_MINIMUM_AGE' satisfies BirthDateError })
    }
  })
}

export const birthDateSchema = makeBirthDateSchema()
```

En `auth.ts`, dentro de `user`: `additionalFields: { birthDate: { type: 'string', required: true, input: true, returned: false, validator: { input: birthDateSchema } } }` (4-f). Con `returned: false` la fecha no viaja en `get-session` ni en el 200 del registro, y la web sabe si falta por `GET /api/me/account` (`birthDateSet: boolean`, §4.5). Con `input: true`, `update-user` la podría reescribir (`ba17/api/routes/update-user.mjs` l. 56 la pasa por `parseUserInput(…, "update")`); lo impide que esa ruta dé 404 (§8.1), y un comentario junto a `additionalFields` lo dice para que nadie la vuelva a abrir sin saberlo (`authRoutes.test.ts` fija el 404). La clave de Drizzle de `users.birth_date` tiene que ser `birthDate`: con otra, 1.7 lanza `SchemaMismatchError` en la primera petición (`create-context.mjs` l. 231, medido por `incremental`). La columna es `date` con `mode: 'string'`, para que viaje como `YYYY-MM-DD` sin pasar por la zona horaria. `MIN_AGE_YEARS` es 16 y `MIN_BIRTH_YEAR` 1900 (`packages/shared/src/account/constants.ts`).

### 4.3 Qué se guarda y qué no

- **`users.birth_date`**, la fecha entera (DD-09 A, D-05): los 16 se cumplen un día concreto, y si la edad mínima baja algún día (la decisión reversible de `agenda.md` §3.7) no hay que volver a preguntar. Nadie la enseña; va en la exportación (§10.5).
- **`users.terms_version`** (`TERMS_VERSION`, `'2026-11-draft'`) y **`users.terms_accepted_at`**, escritas por `databaseHooks.user.create.before` (§4.6).
- **Del menor rechazado no se guarda nada**: el 400 sale antes de crear la fila, los logs de Fastify llevan la URL y no el cuerpo (`index.ts` l. 64), y el `logger` de `better-auth` queda en `warn` (D-30), así que tampoco escribe el correo.

### 4.4 Quien no tiene 16 (pantalla)

```
Sorry, you can't play yet
Cycling Star is for people aged 16 or over. We have not kept anything you typed.
[ Back to the home page ]
```

La web la enseña al recibir `UNDER_MINIMUM_AGE` (o al calcularlo ella misma antes de enviar, con la misma regla). Escribe `cs.ageGate` en `sessionStorage`: mientras la pestaña viva, `/register` enseña esta pantalla en lugar del formulario. Es `sessionStorage` y no `localStorage` para que un hermano mayor en el mismo navegador no herede la puerta (D-04; seguridad O-12). No impide mentir (A8, §2.3); impide el «pruebo otra fecha» inmediato. Si basta, a confirmar con un abogado.

### 4.5 Las cuentas que ya existen

Hoy hay una, la del dueño (`00-encargo.md` l. 309 a 310). Con `birth_date` nula:

- **La web**: `ProtectedRoute` (`apps/web/src/components/ProtectedRoute.tsx` l. 11) lleva a `/account/birth-date` antes de nada, salvo en `/privacy`, `/terms`, `/account/delete` y `Sign out` (D-09). La puerta de la fecha (pantalla): `One more thing` / `We now ask everyone for their date of birth. Cycling Star is for people aged 16 or over.` / `DateField` / `Save and continue`.
- **La API**: un `preHandler` global (`onRequest` de la app, no de un grupo de rutas) responde 403 `BIRTH_DATE_REQUIRED` a toda petición con sesión que no sea `GET` bajo `/api/`, salvo `/api/auth/*`, `/api/admin/*`, `/api/webhooks/*` y la lista de excepciones de D-09 (la puerta que no bloquea salir, leer las condiciones ni borrar la cuenta): `PUT /api/me/birth-date`, `POST /api/me/export`, `/api/me/devices/*` y las rutas de avisos (`/api/me/push-targets*`, `/api/me/notices*`). La lista vive escrita junto al gancho (codigo O-11). Así cubre también las rutas de juego que no cuelgan de `/api/riders/*` ni de `/api/me/*`: `POST /api/teams/take-over`, `PUT /api/teams/me`, `PUT /api/teams/me/kit`, `POST` y `DELETE /api/teams/me/calendar/:raceId` (`apps/api/src/routes/teams.ts` l. 70, 86, 133, 198 y 214) y `PUT /api/my-orders` (`races.ts` l. 182). `birthDate.test.ts` recorre las rutas registradas (con `onRoute`) y exige el 403 en cada una que no esté en la lista.
- **`GET /api/me/account`** nace en este PR con `{ ok: true, birthDateSet: boolean }`; el PR 11 le añade el resto de §12.1. `ProtectedRoute` lo lee en lugar de la sesión, porque la fecha ya no viaja en ella (4-f).
- **`PUT /api/me/birth-date`** con `{ birthDate: string }`, validado con `birthDateSchema`: escribe una vez y responde `{ ok: true }`; si ya hay fecha, 409 `already_set`. La rectificación la hace un administrador desde el panel (`PATCH /api/admin/users/:id` con `birthDate`, fila `user.birth_date` en `admin_audit` sin el valor en `Recent changes`, §8.5), como en `twilightstruggle`, donde los datos del perfil los cambia un administrador; quien la tecleó mal solo tiene que llegar a él, y sin canal de contacto ese es el hueco (§11.1); con menos de 16, 400 `UNDER_MINIMUM_AGE` y no guarda nada.
- **El menor ya registrado** ve (pantalla): `Cycling Star is for people aged 16 or over, so this account can't stay open. You can delete it here.` y `Delete account`, que lleva a `/account/delete` (§10.4). Nada se bloquea ni se borra solo: qué hacer con la cuenta de un menor ya registrado, a confirmar con un abogado (§21.3).

### 4.6 Las condiciones y `/terms` (DD-13 A)

`/terms` no existe. Se crea `pages/Terms.tsx` con su enlace en el pie (`App.tsx` l. 393 a 418), junto a `Privacy`. Su texto, en borrador hasta que lo lea un abogado (pantalla):

```
Terms
These terms are a draft and will be reviewed before public launch.

Who can play
Cycling Star is for people aged 16 or over.

A game
Riders, teams and races are fictional.

Your rider and your team
If you delete your account or stop playing, your rider and your team stay in the world, run by the game. Your team keeps the name you gave it. An administrator can rename any team.

Your account
New accounts are approved by an administrator before they can play. An administrator can change the email and the date of birth of an account. Every change an administrator makes is recorded.

Emails
We only email you to confirm your address and to reset your password.
```

Al registrarse, `databaseHooks.user.create.before` escribe `terms_version = TERMS_VERSION` y `terms_accepted_at = now()`. Si basta la línea bajo el botón o hace falta casilla (DD-13 B), y el texto entero, a confirmar con un abogado. Dos reglas que proponía el borrador, «One account per person» y que un administrador «can close an account that breaks these terms», no las ha decidido nadie y son de E7 (integridad y moderación, `00-encargo.md` §5): no entran en el texto, y quedan como pregunta para E7 y para el abogado (§21.3, punto 2).

### 4.7 `name`, `image` y `locale`

- **`name`**: `databaseHooks.user.create.before` lo pone a `'Player'` y la 0056 hace lo mismo con las filas de hoy (D-08; I-28). Es un dato personal que nadie lee (cobertura C7; el panel enseña corredor y equipo, `adminUsers.ts` l. 114 a 122). Que el gancho cambie la fila creada no abre un oráculo, porque el proxy sustituye el cuerpo de todo 200 de `sign-up/email` por uno fijo (§5.3).
- **`image`**: el gancho `before` de `/sign-up/email` responde 400 si el cuerpo trae `image`. `update-user`, la otra puerta, da 404 (§8.1).
- **`locale`**: el mismo gancho de creación escribe la etiqueta primaria de `Accept-Language` en dos letras minúsculas (`es-ES,es;q=0.9` da `es`) o `'en'` si no hay; el defecto de la columna pasa de `'es'` a `'en'` (D-07; H-12; O-05). El país ya lo guarda el corredor. Traducir es de E10.

### 4.8 Los errores (pantalla)

| Caso                                      | Dónde                                    | Código               | Texto (pantalla)                               |
| ----------------------------------------- | ---------------------------------------- | -------------------- | ---------------------------------------------- |
| Falta un trozo de la fecha                | página, foco al primer campo vacío       | ninguno              | `Enter your date of birth.`                    |
| Fecha imposible, futura o anterior a 1900 | página y servidor                        | `INVALID_BIRTH_DATE` | `Enter a real date of birth.`                  |
| Menos de 16 años cumplidos                | página y servidor                        | `UNDER_MINIMUM_AGE`  | la pantalla de §4.4                            |
| Contraseña de menos de 8                  | página y servidor                        | `PASSWORD_TOO_SHORT` | `Use at least 8 characters.`                   |
| Contraseña de más de 128                  | página (hoy solo el servidor) y servidor | `PASSWORD_TOO_LONG`  | `Your password can be at most 128 characters.` |
| Fecha ya guardada                         | servidor, `PUT /api/me/birth-date`       | 409 `already_set`    | `Your date of birth is already saved.`         |
| Límites, red y presupuesto                | servidor                                 | §12.3                | los de `authErrorText`                         |

### 4.9 El registro por aprobación (las tandas)

El dueño, el 23 de noviembre: «Ok, si, de momento hagamos igual» (`00-encargo.md` §9.5, punto 1), sobre hacerlo como `twilightstruggle` (`ai/src/pvp/auth.ts` l. 19, 45, 362 a 411 y 526 a 541). Es el mecanismo de las tandas de DD-10 B: el registro sigue abierto (hoy lo está: `apps/api/src/auth.ts` no tiene `disableSignUp`, l. 142), pero nadie juega hasta que un administrador lo aprueba, al ritmo que quiera.

- **El estado**: `users.status`, `text not null` con defecto `'pending'` y `CHECK (status in ('pending', 'approved'))`, y `users.approved_at timestamptz` nula. El tipo es `UserStatus = 'pending' | 'approved'` (`packages/shared/src/account/constants.ts`). En `auth.ts`, `additionalFields.status: { type: 'string', input: false, returned: false, defaultValue: 'pending' }`: nadie la escribe por `sign-up/email`. De los cuatro estados de `twilightstruggle` (`pending | approved | rejected | disabled`, l. 45) E4 usa dos: rechazar borra la petición (abajo) y suspender es moderación, de E7. Las cuentas de hoy pasan a `approved` en la 0055 (§15.2).
- **Quien se registra** queda `pending`, con `email_verified` en `false`. `sendOnSignUp` sigue en `true`, pero la función `sendVerificationEmail` de `auth.ts` lee `status` de la base por el id (`SELECT status FROM users WHERE id = $1`, sin fiarse del objeto que le pasa `better-auth`) y no envía nada si no es `approved`. Así ni el registro (`sign-up.mjs` l. 247 a 260), ni `sendOnSignIn` (`sign-in.mjs` l. 341 a 353), ni `send-verification-email` sin sesión (`email-verification.mjs` l. 96 a 118) mandan correo a una cuenta pendiente: las tres puertas pasan por esa función.
- **El administrador de la lista**: si el correo es el de `ADMIN_EMAIL`, `databaseHooks.user.create.before` escribe `status = 'approved'` y `approved_at = now()`, y el correo sale al registrarse, como `twilightstruggle` aprueba a la llegada a quien está en `AI_ADMINS` (l. 366 y 384; y `sessionUser`, l. 526 a 541, aprueba al vuelo a un administrador que se quedó pendiente).
- **Aprobar**: `POST /api/admin/users/:id/approve` (§8.5). Solo con `status = 'pending'` (si no, 409 `no_pendiente`). Comprueba antes el presupuesto de `verify_signup` (§7.6): con el día gastado, 503 `MAIL_BUDGET_EXHAUSTED` y no cambia nada. Si cabe, en una transacción pone `status = 'approved'`, `approved_at = now()` y la fila `user.status` de `admin_audit` (`{ field: 'status', from: 'pending', to: 'approved' }`); después llama a `auth.api.sendVerificationEmail({ body: { email } })` sin sesión, que encuentra la cuenta sin confirmar y manda `verify_signup` (`email-verification.mjs` l. 107 a 112). Ese es el correo para terminar el registro, uno de los dos de `00-encargo.md` §9.3, y no uno nuevo.
- **Rechazar**: `POST /api/admin/users/:id/reject`. Solo con `status = 'pending'` (si no, 409 `no_pendiente`). Borra la cuenta (`users` y su fila `credential` de `accounts`, en una transacción; una cuenta pendiente no tiene corredor ni equipo porque no ha podido entrar) y escribe `user.status` con `{ field: 'status', from: 'pending', to: 'rejected' }` y `target_user_id`, sin el correo. No sale ningún correo. Es una diferencia escrita con `twilightstruggle`, que guarda la fila rechazada y deja volver a pedir (l. 355 a 358): aquí no se guarda nada de quien no entra (el mismo principio que el menor rechazado, §4.3), y como la fila desaparece, la persona puede volver a registrarse con el mismo correo.
- **Entrar estando pendiente**: `better-auth` comprueba la contraseña antes que la confirmación (`sign-in.mjs` l. 335 a 353) y responde 403 `EMAIL_NOT_VERIFIED` sin enviar nada. El proxy, solo en ese 403 de `sign-in/email` (la contraseña ya era buena, así que no delata nada a quien no la sabe), busca el estado por el correo y, si es `pending`, cambia el código por 403 `ACCOUNT_PENDING`. `Login` dice (pantalla) `Your account is waiting for approval` / `An administrator reviews new accounts by hand. When yours is approved, we'll email you a link to finish signing up.`
- **Tras registrarse**, la web enseña `CheckInbox` en su forma de petición recibida (§5.3), la misma para un correo nuevo, para uno que ya existe y para el de `ADMIN_EMAIL`.
- **Las invitaciones** de la lista de espera las manda el dueño a mano desde su buzón (`docs/captacion.md` l. 111), fuera de Resend: no son un tercer correo del juego. Quien llega sin invitación también puede pedir cuenta, y espera igual.
- **El ritmo** lo pone el administrador con las aprobaciones de cada día, dentro de las tandas de §9.4. Abrir el registro no cambia ningún código: es empezar a aprobar. Nadie se aprueba antes del PR 9 y de la lista del abogado (§21.3); quien se registre antes espera en `pending`, y cuando lo aprueban y entra, la puerta de §4.5 le pide la fecha.
- `signupApproval.test.ts` (PR 5) lo fija: el registro deja `pending` y no manda correo; ni `sign-in/email` con la contraseña buena ni `send-verification-email` mandan nada a una pendiente; aprobar manda un `verify_signup` y escribe `admin_audit`; rechazar borra la cuenta y deja registrarse otra vez; `ADMIN_EMAIL` entra aprobado; con el presupuesto gastado, aprobar da 503 y no cambia el estado.

---

**Injertos aplicados.** I-09 (§4.2), I-28 (§4.7).

**Objeciones resueltas.** O-05 (§4.7: `locale` de `Accept-Language`; `time_zone` y su frase en Privacy son de §13 y §10.1).

**Huecos rellenados.** H-12 (§4.7).

**Decisiones de esta sección.**

- **4-a**, `birthDateSchema` se construye con `makeBirthDateSchema(now)` para que los tests fijen el reloj; la API y la web usan `birthDateSchema`.
- **4-b**, la columna `birth_date` es `date` con `mode: 'string'` para que la fecha no cruce zonas horarias.
- **4-c**, la web manda `name: ''`, que `sign-up.mjs` l. 16 exige, y el gancho lo sustituye por `'Player'`.
- **4-d**, el texto de `/terms` dice que el equipo conserva el nombre y que un administrador puede cambiarlo y cambiar el correo de una cuenta, por DD-14 B y por `00-encargo.md` §9.3; y que solo se manda correo para confirmar y recuperar.
- **4-e**, el error de contraseña corta es `Use at least 8 characters.`, uno solo para la página y el servidor (hoy hay dos versiones, mapa 05 §3).
- **4-f**, `birthDate` con `returned: false`; la web pregunta `birthDateSet` a `GET /api/me/account`, que nace en el PR 9.
- **4-g**, la puerta de la fecha en la API es un gancho global sobre todo lo que no es `GET` bajo `/api/`, con su lista de excepciones; no un gancho por grupo de rutas.
- **4-h**, la fecha la rectifica un administrador desde el panel, con su fila en `admin_audit`.
- **4-i**, el registro por aprobación de §4.9, por el dueño (`00-encargo.md` §9.5, punto 1).

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

El botón manda el token en el cuerpo de `POST /api/account/verify-email` (`{ token }`, Zod), una ruta de Fastify que llama a `auth.handler` dentro del proceso con un `Request` GET a `/api/auth/verify-email?token=…` armado allí, sin `callbackURL`, y devuelve su JSON y su `Set-Cookie`; con `autoSignInAfterVerification` deja la sesión en ese navegador (`email-verification.mjs` l. 289 a 300). Así el token, que abre sesión, no cruza el borde de Railway en una URL: `redactUrl` limpia nuestros logs (§10.3), pero no los registros HTTP del borde, y si guardan la consulta no lo sé (5-h). `GET /api/auth/verify-email` queda solo para los enlaces viejos, hasta el PR 19. Tras el 200 la página pregunta por la sesión antes de hablar: así no vuelve a decir `you are signed in` a quien no lo está (mapa 05 §5, captura 22). `Send me a new link` usa `send-verification-email` sin sesión, que ya iguala a 500 ms en todos los casos (`email-verification.mjs` l. 104 a 117) y responde siempre lo mismo: `If that address has an approved account waiting for confirmation, a new link is on its way.` A una cuenta pendiente no le manda nada (§4.9).

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

1. `Register` (§4.1) manda `sign-up/email`. La cuenta queda `pending` y no sale ningún correo (§4.9). Con éxito, la web guarda el correo en `sessionStorage` (`cs.pendingEmail`) y enseña `CheckInbox`, que sobrevive a recargar y a volver atrás.
2. `CheckInbox` (pantalla): `Request received` / `An administrator reviews new accounts by hand, a few each day. When yours is approved, we'll email <email> a link to finish signing up. The link expires in 24 hours.` / `Nothing yet? Check the spam folder once you've been approved.` / `Wrong address? Start again` / `Already have an account with this email? Nothing is sent: log in or reset your password.` / `Log in`. Sin `Send it again`: no hay nada que reenviar hasta que un administrador apruebe.
3. Un administrador aprueba desde el panel y sale `verify_signup` (§4.9, §8.5).
4. El jugador abre el correo, pulsa en `VerifyEmail` y entra (§5.2).
5. Quien intenta entrar con la contraseña buena antes de confirmar recibe el 403. Si su cuenta está aprobada, `better-auth` le manda un enlace nuevo (`sendOnSignIn`) y `Login` dice (pantalla) `Confirm your email first` / `We have just sent a new link to <email>. Open it and you will be signed in. Check the spam folder if it does not show up.` Si sigue pendiente, el proxy cambia el código por 403 `ACCOUNT_PENDING` y `Login` dice el texto de §4.9.

Registrarse con un correo que ya tiene cuenta no manda nada: el correo `signup_existing` que proponía `atacante` era un tercer correo y el dueño solo quiere dos (`00-encargo.md` §9.3). La última línea de `CheckInbox` le dice al que ya tenía cuenta qué hacer, sin decirle a nadie si la dirección juega.

**El cuerpo del 200 delata la cuenta, hoy, y se cierra en el PR 3** (`00-encargo.md` §9.4). Que `better-auth` responda «la misma 200 con un usuario inventado» es falso en el cuerpo: con un correo nuevo, `user.id` es el uuid de Postgres (36 caracteres); con uno que existe, el `generateId()` de 32 caracteres de `better-auth`, porque `advanced.database.generateId: false` (`auth.ts` l. 219 a 220) deja `ctx.context.generateId` sin nada y la rama inventada cae en el genérico (`sign-up.mjs` l. 161 y 208). Medido por el refutador de código en 1.7.26 y en 1.6.25, la de producción. Con el gancho de §4.7 habría un segundo oráculo: `name: 'Player'` en la fila creada frente al `name: ''` del cuerpo en la inventada (l. 163). El arreglo: **el proxy sustituye el cuerpo de todo 200 de `/api/auth/sign-up/email` por `{ "token": null, "user": null }`**, fijo; `Register.tsx` l. 119 a 127 solo lee `result.error` y no lo nota (5-i). No se elige `emailAndPassword.customSyntheticUser`, porque se rompe en cuanto el gancho cambie otro campo. `enumTiming.test.ts` exige, además del tiempo, cuerpos iguales byte a byte para un correo nuevo y uno que existe.

### 5.4 Recuperar la contraseña (R2)

1. `Login` › `Forgot your password?` lleva el correo tecleado a `ForgotPassword` por el estado del router, nunca por la URL.
2. `Send me a link` manda `request-password-reset` y **mira la respuesta**: un 429 o un 503 `MAIL_BUDGET_EXHAUSTED` dan su texto (§12.3); un 200, `Check your email` / `If <email> has an account, we've sent a link to reset your password. It expires in one hour.` y `Send another link`, deshabilitado `RESEND_COOLDOWN_S`. Hoy da por enviado el enlace con un 429 (`ForgotPassword.tsx` l. 47; mapa 05, captura 37).
3. `ResetPassword` (§5.2) manda `POST /api/auth/reset-password`. Al 200, en este orden:
   - `better-auth` cierra **todas** las sesiones (`emailAndPassword.revokeSessionsOnPasswordReset: true`; medido: la sesión anterior responde `null`, X-21).
   - `onPasswordReset({ user }, request)` borra las filas de `verifications` con `value` = id (los otros enlaces de recuperación), pone L1 a cero (`clearAttempts` de `acct:<hmac del correo>`), sube `users.device_epoch` (todas las `cs_device` de esa cuenta dejan de valer) y apunta `user.email` en `resetRequests`, un `WeakMap<Request, string>` del proxy.
   - El proxy ve el 200, encuentra el correo en `resetRequests` (`ctx.request` es el mismo objeto que el proxy pasa a `auth.handler`, `password.mjs` 1.7.26 l. 164, medido por seguridad C5) y emite a ese navegador una `cs_device` nueva para esa cuenta (D-13; I-03; §7.5). Así quien recupera sale del cierre de L1 aunque el atacante siga gastándolo (X-06: sin la cookie, 10 fallos más del atacante y la contraseña nueva desde un aparato nuevo da 429).
   - Se encola el aviso `password_changed` a todas las suscripciones de la cuenta (`push_targets`) y, una vez encolado, se borran todas: recuperar es el momento en que puede haber un intruso, y una suscripción suya seguiría recibiendo avisos del juego (§13).
4. `/login` con `Password saved` / `Log in with your new password. You have been signed out everywhere else.` (`Notice` `good`, `role="status"`).

**Cambiar la contraseña** desde `Account › Password` sigue mandando `revokeOtherSessions: true` (`Account.tsx` l. 223): cierra las otras sesiones, y con ellas sus suscripciones (I-25). Antes de cerrarlas, el proxy encola `password_changed` a las suscripciones de esas otras sesiones. Al ver el 200, el proxy sube `users.device_epoch`, vuelve a emitir la `cs_device` de este navegador con el epoch nuevo (la ruta está bajo `/api/auth`, así que la cookie llega) y borra las claves `pw:` de la cuenta (`clearAttempts`, §7.3). Sin subir el epoch, el navegador de quien sabía la contraseña vieja seguiría siendo «conocido» 180 días y entraría con la nueva sin aviso `new_sign_in` (5-j). No sale ningún correo.

### 5.5 El cambio de correo, en manos de un administrador

El jugador ya no cambia su correo (`00-encargo.md` §9.3, punto 1, lectura del orquestador con `twilightstruggle` delante: `ai/ui/src/online/profile.ts` l. 4 y 55). Lo que se retira:

- `user.changeEmail` (`auth.ts` l. 155 a 165) pasa a `enabled: false`; `POST /change-email` sale de la lista blanca y de `CREDENTIAL_AUTH_PATHS` (`security.ts` l. 54 a 68); `CHANGE_APPROVED_PATH` y `changeEmailConfirmationEmail` (`emails.ts` l. 118) se borran.
- No se crean `ApproveEmail` ni `UndoEmail`, ni `POST /api/account/undo-email-change` ni `approve-email-change`, ni el JWT de la rama ocupada; no hay `EMAIL_CHANGES_PER_DAY` ni `UNDO_EMAIL_CHANGE_H`.
- `Account › Email` enseña el correo sin formulario (§12.2). Con él desaparece la captura 55, el botón que el teclado tapaba, y la captura 53c, la promesa de un correo que no sale.

Lo que entra: el administrador cambia el correo de una cuenta desde el panel con `PATCH /api/admin/users/:id` y `{ email }` (§8.5), como en `twilightstruggle` (`ai/src/pvp/admin.ts` l. 212 a 235). Reglas: el correo se normaliza (`trim` y minúsculas); ni el viejo ni el nuevo pueden ser `ADMIN_EMAIL` (400 `admin_email_fijo`), porque dar ese correo a una cuenta confirmada la haría administrador raíz (`isRootAdmin`, `adminUsers.ts` l. 21 a 26); si otra cuenta ya lo usa, 409 `correo_ocupado`; `email_verified` queda en `true`, porque el administrador responde de la dirección; no sale ningún correo, ni a la dirección vieja ni a la nueva; y cada cambio escribe una fila en `admin_audit` con el correo viejo y el nuevo. Dos cosas más, porque sin correos de seguridad el push es la única señal (`00-encargo.md` §9.3) y el caso normal es alguien que ha perdido su buzón (5-k):

- **Antes de cambiarlo**, se encola a todas las suscripciones de la cuenta el aviso `email_changed` (pantalla: `Your account email was changed by an administrator` / `If you didn't ask for this, sign in and check Account.`), de seguridad como `password_changed` (§13.1).
- **La confirmación lleva una casilla**, `Sign out everywhere`, encendida por defecto: cierra todas las sesiones de la cuenta, borra sus suscripciones después de enviar el aviso, sube `device_epoch` y borra sus claves `pw:`. Quien pide el cambio porque perdió el buzón suele tener un intruso dentro; con la casilla apagada (el jugador lo pide desde su sesión y no quiere salir), las sesiones siguen.

Las `cs_device` de esa cuenta dejan de reconocerla porque llevan el HMAC del correo viejo: la siguiente entrada buena la reemite. El correo de la cuenta raíz no se toca (§8.5: 409 `es_el_admin_raiz`).

### 5.6 La enumeración por el tiempo y el cierre ordenado

Hoy el registro y la recuperación esperan a Resend solo en una rama (mapa 01 §5). `advanced.backgroundTasks.handler = mailQueue.track` lo cierra: ninguna respuesta espera al correo. Medido con un correo de 250 ms y 41 muestras: recuperar, 4,0 frente a 4,6 ms (sin la opción, 5,6 frente a 255,6); registrarse, 85,8 frente a 80,7 (X-15). El precio, que la pantalla diga «enviado» antes de saber si salió, lo cubren `Send another link`, `Send me a new link` y `email_log` (§9.2).

`mailQueue` (`apps/api/src/mailQueue.ts`) guarda cada promesa en un `Set` y la quita al resolverse; `index.ts`, al recibir `SIGTERM`, espera a `mailQueue.drain()` como mucho `MAIL_SHUTDOWN_GRACE_MS` (10.000) antes de cerrar (D-15; H-02; O-18). `mailer.send` apunta la fila de `email_log` con `status = 'queued'` antes de llamar a Resend, así que un correo perdido en un despliegue se ve como `queued` que nunca pasó a `sent`. El `Set` y los 10 s no los midió ningún juez: los fija `mailQueue.test.ts`. `enumTiming.test.ts` mide el registro y la recuperación con un `Mailer` de 250 ms y exige menos de 30 ms de diferencia entre ramas.

### 5.7 Los dos correos, enteros

El pie de los dos, sin raya (la de `emails.ts` l. 54 se quita). El botón toma el `accent` de la web y no el índigo `#4f46e5` (mapa 05 §9). Entre corchetes, el título y el botón del HTML; el texto plano es el que sigue, tal cual.

```
(correo) verify_signup
Subject: Confirm your Cycling Star email
[Confirm your email · Confirm my email]

Your Cycling Star account has been approved. Confirm this address to finish creating it.

Open this link and tap the button (it expires in 24 hours):
<APP_URL>/verify-email#token=<token>

If you did not ask for an account, ignore this email and nothing will happen.

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

`verify_signup` sale al aprobar la cuenta un administrador (o al registrarse con el correo de `ADMIN_EMAIL`), al pedir otro enlace y al entrar sin confirmar, siempre con la cuenta aprobada (§4.9); `reset_password`, al pedir recuperar para una cuenta que existe. Las plantillas son `verifyEmailEmail` y `resetPasswordEmail` de hoy (`emails.ts` l. 92 y 66) con el enlace y el texto nuevos. Se borran `changeEmailConfirmationEmail` (l. 118) y `stageReadyEmail` (l. 153) con sus tres tests (D-00c). Los ocho correos que llegaron a proponerse además de estos dos (`verify_new_address`, `approve_change`, `password_changed`, `email_changed`, `account_deleted`, `signup_existing`, `new_sign_in`, `change_to_taken`) no se escriben: `password_changed` y `new_sign_in` pasan a ser avisos (§13), y los demás desaparecen.

---

**Injertos aplicados.** I-03 (§5.4), I-04 (§5.2), I-07 (§5.1 y §5.4: `revokeSessionsOnPasswordReset`, `storeIdentifier`, `backgroundTasks`). I-14 y I-15, no aplicados: son el correo `email_changed` con su deshacer, `signup_existing`, `new_sign_in` por correo y el cambio de correo con contraseña, y el dueño los retiró (`00-encargo.md` §9.2, punto 9, y §9.3); de I-14 queda `new_sign_in` como aviso.

**Objeciones resueltas.** O-04 (§5.3 y §5.7: los correos sin tope ya no existen; los dos que quedan van dentro de L5 y del presupuesto, §7), O-09 (§5.1), O-16 (§5.4), O-17 (§5.5: sin cambio de correo de autoservicio no hay aprobación que un escáner pulse), O-18 (§5.6).

**Huecos rellenados.** H-02 (§5.6), H-06 (§5.5: sin autoservicio la enumeración por el cambio de correo desaparece), H-08 (§5.2, escrito como no comprobado).

**Decisiones de esta sección.**

- **5-a**, se escriben dos correos y no diez (`00-encargo.md` §9.3, punto 1). Manda sobre D-14 y D-16 (§22.5) y sobre el catálogo de correos de las propuestas.
- **5-b**, el cambio de correo de autoservicio se retira entero (§9.3): sin `change-email`, sin `ApproveEmail` ni `UndoEmail`, sin las dos rutas de `/api/account/*`. Manda sobre D-14.
- **5-c**, el cambio hecho por un administrador deja `email_verified` en `true`, no cierra sesiones, no manda correo y escribe `admin_audit`; rechaza `ADMIN_EMAIL` como viejo y como nuevo, como `twilightstruggle` (`admin.ts` l. 215 a 217).
- **5-d**, recuperar encola `password_changed` por push a todas las suscripciones y después las borra; cambiar la contraseña lo encola a las de las otras sesiones antes de cerrarlas. Es la lectura de `00-encargo.md` §9.3 («van por push si el jugador lo tiene»).
- **5-e**, `CheckInbox` gana la línea `Already have an account with this email? No link is sent: log in or reset your password.`, que sustituye al correo `signup_existing`.
- **5-f**, `LEGACY_LINK_GRACE_DAYS` se lee como el plazo para quitar el código de los enlaces viejos: con tokens de una hora, ninguno vive tanto.
- **5-g**, `Send me a new link` de `VerifyEmail` responde siempre `If that address has an approved account waiting for confirmation, a new link is on its way.`
- **5-h**, el botón de `VerifyEmail` va por `POST /api/account/verify-email` con el token en el cuerpo, no por `GET` con el token en la URL.
- **5-i**, el proxy fija el cuerpo del 200 de `sign-up/email` a `{ "token": null, "user": null }` (PR 3, `00-encargo.md` §9.4).
- **5-j**, cambiar la contraseña sube `device_epoch`, reemite la `cs_device` propia y borra las claves `pw:`.
- **5-k**, el cambio de correo por un administrador avisa por push (`email_changed`) y ofrece cerrar todas las sesiones, encendido por defecto.
- **5-l**, `CheckInbox` tras registrarse dice que la cuenta espera aprobación y no ofrece reenviar (§4.9).

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

El proxy (`apps/api/src/routes/authProxy.ts`) reescribe el JSON de `GET /api/auth/get-session` y quita `session.token`, `session.ipAddress` y `session.userAgent` (D-19; I-24). No basta con `get-session`: el 200 de `sign-in/email` lleva el token en el cuerpo (`token: session.token`, `ba17/api/routes/sign-in.mjs` l. 365 a 370). Así que el proxy quita `token` y `session.token` de **todo** JSON que responda bajo `/api/auth/*` (6-f). La web no lee ninguno (búsqueda en `apps/web/src`, mapa 01 §3), y una XSS futura no se lleva un token reutilizable. `authFlow.test.ts` comprueba que ningún cuerpo de las rutas de la lista blanca contiene el valor de la cookie de sesión. El mismo paso del proxy aplica el techo de 90 días (§6.1); la visita la apunta el gancho `after` de `get-session` (§10.6).

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
- **`POST /api/auth/devices/sign-out-others`**: borra los `push_targets` de las otras sesiones, llama a `auth.api.revokeOtherSessions`, sube `users.device_epoch` en uno, borra las claves `pw:` de la cuenta (§7.3) y reemite la `cs_device` de este navegador con el epoch nuevo (§7.5). Responde `{ ok: true, closed: <número> }`. Lleva confirmación en la pantalla (§12.2). Vive bajo `/api/auth` y no bajo `/api/me` porque la cookie lleva `Path=/api/auth` (7-e): en `/api/me/*` el navegador no la manda, el servidor no vería las otras entradas y el `Set-Cookie` las pisaría, dejando sin protección frente a L1 a las otras cuentas de ese navegador. La atiende Fastify con una ruta estática, que gana al comodín como ya hacen las de `CREDENTIAL_AUTH_PATHS`, sin pasar por `better-auth`, y está en la lista del proxy como ruta propia (§8.1). `deviceCookie.test.ts` comprueba que, con dos cuentas en la cookie, cerrar las otras sesiones de una deja intacta la entrada de la otra (6-g).
- **`POST /api/auth/devices/forget`**: quita de la `cs_device` la entrada del correo de la sesión, sin tocar las otras, y responde `{ ok: true }`. Es lo que hace el botón `Forget this device` de `Account` (§12.1), que después llama a `sign-out`. Ruta propia de Fastify por la misma razón que la anterior (6-h).
- Sin `cookieCache`, el otro aparato se entera en su siguiente petición: la pantalla no promete «hasta un minuto».
- **`Sign out`** del propio navegador borra antes su `push_target` (con `cs.pushTargetId`, `DELETE /api/me/push-targets/:id`) y después llama a `sign-out` (D-49). La `cs_device` sobrevive (D-23) y `cs_viewer` se borra como hoy (`authProxy.ts` l. 18 a 21 y 52 a 54). Junto a él, `Shared computer? Forget this device` hace lo mismo y antes quita la entrada de la `cs_device` (`POST /api/auth/devices/forget`).
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
- **6-c**, `POST /api/auth/devices/sign-out-others` devuelve `closed` con el número de sesiones cerradas, para el `Notice` de §12.2.
- **6-f**, el proxy quita `token` y `session.token` de todo JSON de `/api/auth/*`, no solo de `get-session`.
- **6-g**, cerrar las otras sesiones vive en `POST /api/auth/devices/sign-out-others`, bajo el `Path` de `cs_device`.
- **6-h**, `Forget this device` quita la entrada de la `cs_device` y sale; `POST /api/auth/devices/forget`.
- **6-d**, los doce agentes de `deviceLabel.test.ts` son los de la tabla de §6.4, y un iPad que se anuncia como Mac sale `Safari on Mac`.
- **6-e**, el SQL de la precondición del PR 3 es el de §6.2, de solo lectura.

## 7. Los límites de intento

Hoy hay dos capas y ninguna mira la cuenta (§1.2): tras más de 40 fallos contra un correo desde varias IP, la contraseña buena entra a la primera (mapa 01 §4.2, serie H). Esta sección fija qué IP vale, qué capas quedan, la tabla por cuenta con su reserva, las seis reglas con su cifra, la cookie de aparato que impide que un tercero cierre la cuenta del dueño y el presupuesto de correo. Lo que ve quien choca está en §12.3.

### 7.1 Qué IP vale

- **Fastify**: `trustProxy` pasa de `true` (`app.ts` l. 160) a `(addr, hop) => hop === 0` (D-21; I-08; O-13). Con `true`, `request.ip` es la primera dirección de `X-Forwarded-For`, la que escribe el cliente si el borde añade en lugar de reescribir; con la función es la última, la que pone el borde. `trustProxy: 1` está prohibido: desde 5.12.1 da siempre la del socket, que es Railway (X-02; medido en `fastify` 5.12.8, `lib/request.js` l. 53 a 57; codigo C2 y C3). Un comentario en `app.ts` y un test lo dicen.
- **`clientIp(request)`** (`apps/api/src/clientIp.ts`): ni `true` ni la función validan (`'basura'` sale como IP, X-02). `clientIp` devuelve `request.ip` si `net.isIP` la acepta. Si la cabecera trae más de dos entradas, devuelve igualmente `request.ip` y solo registra `xff_varias` (como mucho una vez por hora y proceso, sin la IP): con `(addr, hop) => hop === 0`, `request.ip` ya es la última entrada, la que pone el borde (`fastify` 5.12.8, `lib/request.js` l. 45 a 57), y bajar a la del socket metería a todos en el cubo del borde de Railway, que un atacante llenaría a propósito mandando dos entradas falsas (7-h). Solo si `request.ip` no es una IP devuelve la del socket y registra `xff_varias`. **IPv6**: en L4 y en el `keyGenerator` de Fastify una IPv6 cuenta por su /64, porque un solo equipo rota por su /64 sin límite práctico (7-i); si Railway acepta IPv6 de entrada, no lo sé. `xff_varias` es una de las cifras que se miran (D-60; §19.4).
- **`better-auth` deja de usar la IP**: su limitador se apaga (§7.2) y `disableIpTracking` deja de guardarla (§6.2). Así deja de importar si Railway pone `NODE_ENV=production` (mapa 01 §4.3).
- **Las réplicas (H-03)**: el límite de Fastify vive en memoria y se multiplica por cada réplica de `web`. Antes del PR 6 el dueño mira en Railway cuántas hay y se escribe en `docs/ops.md`; con más de una, esa capa se lee «por réplica». La capa por cuenta vive en Postgres y no depende de ellas.

### 7.2 Las tres capas

0. **La ruta, normalizada antes de todo** (PR 3, `00-encargo.md` §9.4). Hoy una ruta con un segmento `..` o `.` se salta el límite estricto: find-my-way recibe la ruta tal cual, `/api/auth/x/../sign-in/email` no casa con la ruta estática y cae en el comodín de 60 por minuto, y después `forwardToAuth` arma `new URL(request.url, …)` (`authProxy.ts` l. 34), que la normaliza, y `better-auth` atiende `sign-in/email` igual. Medido por el refutador de código con `node:http`: 25 fallos sin un 429 desde una IP y después la contraseña buena entra; `request-password-reset` por la misma vía manda el correo. El orquestador lo comprobó en producción el 23 de noviembre, solo con GET: `curl --path-as-is https://www.cyclingstar.app/api/auth/x/../../health` da el 404 de `better-auth` con `x-ratelimit-limit: 60`, así que el borde de Railway no normaliza. El arreglo: un `onRequest` de `/api/auth/*`, antes del límite y del proxy, responde 404 `no_encontrado` si la ruta cruda (`request.raw.url` sin la consulta) no es igual a `new URL(...).pathname`, o si lleva `//`, `/./`, `/../`, `%2e`, `%2f` o `%5c` (sin mirar mayúsculas). Después, la lista blanca (§8.1), L1 a L4, el presupuesto y el límite de Fastify se deciden en un solo sitio y con la ruta normalizada, nunca con la configuración de la ruta estática (7-j). `authRoutes.test.ts` repite con `node:http`, que no normaliza, las tres variantes medidas contra `sign-in/email`, `request-password-reset` y `change-password`, y exige 404.
1. **Fastify por IP**: 300 por minuto en todo, 60 por minuto en el resto de `/api/auth/*`, 10 cada 5 minutos por IP y por ruta en las de credenciales (`security.ts` l. 10, 36, 43 y 54 a 68). `CREDENTIAL_AUTH_PATHS` pierde `/api/auth/change-email` (§5.5) y se queda en siete. El 429 gana `message` y `retryAfterS` en `errorResponseBuilder` (`app.ts` l. 213 a 217; D-25).
2. **El limitador de `better-auth`, apagado por escrito**: `rateLimit: { enabled: false }`. Sin cabecera de IP o con dos mete a todo el mundo en un cubo de 3 cada 10 s por ruta (mapa 01 §4.2, serie E), y su clave sigue siendo `<ip>|<ruta>`: no ve el correo ni el resultado. Su almacén `database` tampoco lo arregla (la carrera de `GHSA-44jh-23m7-hpcf`, mapa 01 §8).
3. **`auth_limits`, nuestra, en Postgres**: sobrevive al despliegue, ve la cuenta y reserva antes de comprobar (§7.3).

### 7.3 `auth_limits`

Tabla con clave primaria (D-22; I-12; X-01): `key text primary key`, `window_start timestamptz`, `count integer`, `day_start timestamptz`, `day_count integer`, `locked_until timestamptz` nula. Las claves llevan un prefijo y el HMAC-SHA256 de su valor con una clave derivada de `SESSION_SECRET` (`HKDF` con la etiqueta `cs-auth-limits`): `acct:<hmac del correo normalizado>`, `dev:<hmac del nonce de cs_device>`, `pw:<hmac del id de sesión>`, `pwu:<hmac del id de usuario>`, `mailip:<hmac de la IP, o de su /64 si es IPv6>`, `rsv:<hmac del correo normalizado>` y `exp:<hmac del id de usuario>`. La tabla no guarda un correo, ni siquiera los que no existen: un SHA-256 sin secreto se invierte con un diccionario de correos (seguridad §2). El correo se normaliza con `trim` y minúsculas.

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

| Regla                      | Clave                                    | Cifra y ventana                                                                                                           | Qué cuenta                                                                                                                             | Al pasarse                                                                                                  |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| L1 entrar, por cuenta      | `acct:`                                  | `ACCOUNT_FAILS`: 10 en 900 s, cierre de 900 s, sin tope diario                                                            | cada `sign-in/email` de un navegador **sin** `cs_device` válida para ese correo, exista o no la cuenta; se borra al 200 y al recuperar | 429 `ACCOUNT_LOCKED` a todo navegador sin `cs_device` válida; los que la traen siguen por L2                |
| L2 entrar, por aparato     | `dev:`                                   | `DEVICE_FAILS`: 10 en 900 s y 30 en 86.400 s                                                                              | cada `sign-in/email` con una `cs_device` válida para ese correo; se borra al 200                                                       | esa cookie deja de contar como aparato conocido mientras dure el cierre, y el intento pasa por L1           |
| L3 contraseña con sesión   | `pw:` (por sesión) y `pwu:` (por cuenta) | `SESSION_PASSWORD_FAILS`: 5 en 900 s y 10 en 86.400 s por sesión; `ACCOUNT_PASSWORD_FAILS_DAY`: 30 en 86.400 s por cuenta | `change-password`, `delete-user` y `POST /api/me/export`; se borran al 200, al recuperar y con `sign-out-others`                       | 429 `PASSWORD_ATTEMPTS_LOCKED`; al décimo del día, el proxy cierra **esa** sesión y la web lleva a `/login` |
| L4 rutas de correo, por IP | `mailip:`                                | `MAIL_ROUTES_PER_IP_DAY`: 20 en 86.400 s                                                                                  | cada `sign-up/email`, `request-password-reset` y `send-verification-email`, salga o no correo                                          | 429 de la misma forma que Fastify                                                                           |
| L5 por destinatario        | `email_log.recipient_hash`               | `MAIL_PER_RECIPIENT_HOUR`: 3 por hora, sin tope diario                                                                    | cada envío a ese buzón                                                                                                                 | no se envía y la respuesta no cambia                                                                        |
| L6 el presupuesto          | `email_log` del día UTC                  | `MAIL_DAILY_BUDGET` y `MAIL_RESET_RESERVE` (§7.6)                                                                         | cada envío                                                                                                                             | §7.6                                                                                                        |
| Exportar                   | `exp:`                                   | `EXPORTS_PER_DAY`: 3 en 86.400 s                                                                                          | cada exportación servida                                                                                                               | 429 con su espera                                                                                           |

L1 cuenta igual con un correo que no existe: el 429 no delata cuentas (`accountLimit.test.ts`). L1 no tiene tope diario porque un tope diario sería un día entero sin entrar para el dueño en un navegador nuevo (seguridad O-01). L5 no tiene tope diario porque con dos correos y 3 por hora un buzón ajeno recibe como mucho 72 al día solo si alguien gasta 72 peticiones de L4, que son cuatro IP enteras (20 por IP). L3 se cuenta por sesión (7-k): contada por cuenta, el ladrón de una sesión (A3) gastaba 10 contraseñas malas y le cerraba al dueño `change-password`, `delete-user` y la exportación en todas sus sesiones durante 24 horas, justo cuando cambiar la contraseña es la reacción natural; el techo por cuenta de 30 al día frena a quien reparte intentos entre sesiones. L3 deja de contar `change-email`, que ya no existe; D-38 lo pone «en el after» para `delete-user`, y aquí se lee como el resto: se reserva en el proxy antes de reenviar y se borra al 200 (el `after` ve el 400 `INVALID_PASSWORD`, X-23, pero contar después deja pasar una ráfaga, X-01).

### 7.5 `cs_device`: cómo no se cierra la cuenta de otro

**Formato** (D-23): una cookie `cs_device` con hasta `DEVICE_COOKIE_MAX_ACCOUNTS` (5) entradas separadas por `~`, cada una `v1.<hmac del correo, 32>.<nonce, 16>.<firma, 43>`. El HMAC del correo va en base64url recortado a 32 caracteres; el nonce, 12 bytes aleatorios en base64url; la firma, HMAC-SHA256 en base64url de `v1.<hmac>.<nonce>.<userId>.<device_epoch>` con una clave derivada de `SESSION_SECRET` (etiqueta `cs-device`). Ni el id de la cuenta ni el `device_epoch` viajan: se leen de `users` (la cuenta que tiene ese correo) al comprobar, y subir el epoch invalida todas las entradas de esa cuenta. El id va en la firma porque `device_epoch` vale 0 en todas las cuentas nuevas: sin él, si un correo cambia de dueño (una cuenta borrada y otra registrada con el mismo correo, o un correo que un administrador ha liberado), la entrada del navegador del dueño anterior valdría para la cuenta nueva (7-l). `HttpOnly`, `SameSite=Lax`, `Secure` en https, `Path=/api/auth`, `Max-Age` de `DEVICE_COOKIE_DAYS` (180). Cinco entradas son unos 490 bytes (calculado).

**Emisión** (`apps/api/src/deviceCookie.ts`, `issue` y `read`): al ver el 200 de `sign-in/email` el proxy añade o renueva la entrada de ese correo; al ver el 200 de `reset-password`, la del correo de `resetRequests` (§5.4); al cerrar las otras sesiones y al cambiar la contraseña, la del propio correo con el epoch nuevo (§6.5, §5.4); `Forget this device` quita la del propio correo (§6.5). La sexta cuenta saca a la más vieja. Sobrevive a `Sign out` (por eso la nombra Privacy, §10.1) y muere con su `Max-Age`, al subir el epoch o con `Forget this device`.

**Cómo protege.** L1 solo cierra a los navegadores sin entrada válida para ese correo (principio 5). Quien reparte intentos entre mil IP cierra los navegadores nuevos, no el teléfono del jugador. Si el dueño está en un navegador nuevo, el 429 le ofrece `reset your password`, y recuperar le da la cookie (I-03). La carrera está medida: sin la cookie, tras recuperar, 10 fallos más del atacante y la contraseña nueva desde un aparato nuevo da 429 (seguridad C4, `peticion.json`; X-06); con ella, entra. Una `cs_device` robada sirve como mucho para L2: 10 intentos en 15 minutos y 30 al día (O-15).

**El aviso de entrada nueva.** Una entrada buena (200 de `sign-in/email`) desde un navegador sin entrada válida para ese correo encola el aviso `new_sign_in` a las suscripciones de esa cuenta, como mucho uno cada `NEW_SIGN_IN_EVERY_H` (1) hora por cuenta (DD-16, por push y nunca por correo: `00-encargo.md` §9.2, punto 9). No hay interruptor (DD-16 A). El gemelo en la web es la fila nueva en `Devices`.

### 7.6 El presupuesto y sus prioridades

`MAIL_DAILY_BUDGET` es una variable de entorno (`apps/api/src/env.ts`), 90 con el plan gratuito de Resend, que da 100 al día y 3.000 al mes (mapa 02 §3); el dueño se queda en el gratuito y abre el registro por tandas (DD-10 B, `00-encargo.md` l. 378). 90 al día son como mucho 2.790 en un mes de 31 días: por debajo de los 3.000 (calculado). `MAIL_RESET_RESERVE` (30) queda para `reset_password` de cuentas confirmadas: `verify_signup` deja de salir cuando el día UTC lleva 60 envíos, y `reset_password` cuando lleva 90 (D-26). **Cada destinatario gasta la reserva una sola vez por día UTC** (7-m): la primera recuperación del día de un correo puede salir de las 30 (clave `rsv:` en `auth_limits`, 1 en 86.400 s); las siguientes, solo del cupo general de 60. Sin esto, la reserva se gastaba con cualquier `request-password-reset` de una cuenta confirmada, la pidiera quien la pidiera: 10 cuentas propias daban 30 recuperaciones en una hora antes de chocar con L5.

Lo que ve el jugador: si el día va por 60, `send-verification-email` responde 503 `MAIL_BUDGET_EXHAUSTED` antes de llegar a `better-auth` y `VerifyEmail` dice `We can't send emails right now. Try again tomorrow.` (pantalla); `sign-up/email` ya no manda correo (§4.9) y no se corta. Aprobar una cuenta en el panel da el mismo 503 y no la aprueba (§4.9). Si va por 90, también `request-password-reset`. Es un estado global, el mismo para cualquier correo: no delata cuentas. `sign-in/email` de una cuenta sin confirmar con la contraseña buena sigue dando el 403, sin enviar; `Login` dice entonces `Confirm your email first` / `We can't send a new link right now. Try again tomorrow.` Con DD-10 B no hay correos de baja prioridad que cortar al 70 %: el umbral `MAIL_LOW_PRIORITY_CUTOFF` desaparece, y el 70 % se queda como alarma (§19.4).

Con A6 delante (10 IP, §2.4): registrarse ya no gasta correo, porque `verify_signup` sale al aprobar (§4.9), y lo que queda es recuperar. L4 deja 200 peticiones al día y L5 tres por buzón y hora. La reserva aguanta mientras el atacante no tenga 30 cuentas confirmadas distintas o 30 correos de jugadores de verdad (que con el cuerpo fijo del registro, §5.3, ya no saca del juego); con ellas, el día se agota igual, y es el precio de DD-10 B. Una alarma de §19.4 salta si la reserva pasa de 10 en un día.

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
- **7-h**, con más de dos entradas en `X-Forwarded-For`, `clientIp` usa `request.ip` y solo apunta `xff_varias`.
- **7-i**, una IPv6 cuenta por su /64 en L4 y en el `keyGenerator` de Fastify.
- **7-j**, la ruta de `/api/auth/*` se normaliza antes de todo límite; una ruta que no coincide con su forma normal da 404 (PR 3).
- **7-k**, L3 por sesión (`pw:`) con un techo por cuenta (`pwu:`, 30 al día).
- **7-l**, la firma de `cs_device` lleva el id de la cuenta.
- **7-m**, cada destinatario gasta la reserva de recuperar una vez por día UTC (`rsv:`).

## 8. Las rutas, las dependencias y el administrador

`better-auth` monta 31 puntos y el proxy deja pasar todos por un comodín (mapa 01 §1; `authProxy.ts` l. 62 a 71); la web usa ocho. Esta sección cierra lo que no se usa por lista blanca, sube las dependencias, fija el registro de `better-auth` y escribe el panel de administración como lo quiere el dueño: el de `twilightstruggle`, sin segundo factor y con cada edición escrita (`00-encargo.md` §9.2, punto 1).

### 8.1 La lista blanca

`AUTH_ALLOWED_PATHS` (`apps/api/src/security.ts`) son **once** rutas (D-29; I-06; O-21); el proxy da 404 `{ ok: false, error: 'no_encontrado' }` a todo lo demás bajo `/api/auth/*` sin llegar a `better-auth`:

| Ruta                           | Qué hace                                                                                                                                          | Quién la usa                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `POST sign-up/email`           | crea la cuenta `pending`, sin correo (§4.9); el proxy fija el cuerpo del 200 (§5.3)                                                               | `Register`                  |
| `POST sign-in/email`           | entra; 403 `EMAIL_NOT_VERIFIED` y `verify_signup` si falta confirmar y la cuenta está aprobada; 403 `ACCOUNT_PENDING` si espera aprobación (§4.9) | `Login`                     |
| `GET get-session`              | la sesión, sin token, IP ni agente (§6.3)                                                                                                         | todas las páginas           |
| `POST sign-out`                | cierra la sesión propia y borra `cs_viewer`                                                                                                       | `Account`                   |
| `GET verify-email`             | confirma y abre sesión; desde el PR 8 solo la llaman los enlaces viejos, hasta el PR 19                                                           | enlaces viejos              |
| `POST send-verification-email` | manda otro `verify_signup`                                                                                                                        | `CheckInbox`, `VerifyEmail` |
| `POST request-password-reset`  | manda `reset_password` si la cuenta existe                                                                                                        | `ForgotPassword`            |
| `GET reset-password/:token`    | 302 a `/reset-password?token=`; solo `LEGACY_LINK_GRACE_DAYS` desde el PR 8                                                                       | enlaces viejos              |
| `POST reset-password`          | guarda la contraseña nueva y cierra todas las sesiones                                                                                            | `ResetPassword`             |
| `POST change-password`         | cambia la contraseña con la actual y cierra las otras                                                                                             | `Account › Password`        |
| `POST delete-user`             | borra la cuenta con la contraseña (§10.4)                                                                                                         | `Account › Delete account`  |

`change-email` sale de la lista con el cambio de correo de autoservicio (§5.5). La lista se compara con la ruta ya normalizada, después del `onRequest` que da 404 a toda ruta con `..`, `.`, `//` o codificada (§7.2, punto 0; PR 3). Además de las once de `better-auth`, el proxy tiene dos rutas propias de Fastify bajo `/api/auth`, que no llegan a `better-auth`: `POST /api/auth/devices/sign-out-others` y `POST /api/auth/devices/forget` (§6.5). Y `POST /api/account/verify-email` (§5.2), fuera de `/api/auth/*`, llama a `auth.handler` dentro del proceso; por eso `/verify-email` no entra nunca en `disabledPaths` (que la cerraría también para esa llamada interna): desde el PR 19 la cierra solo el proxy a lo que llega de fuera (8-l).

`disabledPaths` se calcula como el complemento de `AUTH_ALLOWED_PATHS` sobre `auth.api` y se pasa a `betterAuth` (X-14): `better-auth` da 404 en las rutas fijas antes del limitador y de los ganchos, sin variante de URL que lo esquive (`/sign-in/email/`, `//sign-in/email` y `/Sign-in/email` dan 404; `api/index.mjs` l. 169 a 171; `core/utils/url.mjs` l. 18 a 30). **Con las rutas con parámetros no vale**: `better-auth` compara la ruta normalizada con `disabledPaths.includes(normalizedPath)` (`api/index.mjs` l. 169 a 171), así que `/callback/:id` nunca casa con `/callback/google`, ni `/reset-password/:token` (desde el PR 19) con `/reset-password/abc`. Para ellas, el segundo cerrojo es un `hooks.before` que lanza 404 cuando la plantilla del punto (`ctx.path`) no está en la lista (8-g). Son dos cerrojos y no uno porque el proxy puede montarse mal en una refactorización y `disabledPaths` no protege si alguien la vacía. `authRoutes.test.ts` recorre todos los puntos de `auth.api` y exige 404 por HTTP a todo lo que no está en la lista, y 200 o el error esperado a lo que sí; prueba `/callback/x` y, desde el PR 19, `/reset-password/abc`; repite con `node:http` las variantes con `..` y `.` de §7.2; y fija que `update-user` sigue en 404 (§4.2).

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

- **Administradores fijos por el despliegue**: el raíz es la cuenta cuyo correo confirmado es `ADMIN_EMAIL` (`adminUsers.ts` l. 21 a 26), evaluado en cada petición. Como `AI_ADMINS` en `twilightstruggle` (`ai/src/pvp/roles.ts` l. 10 a 12), el panel no lo puede quitar, ni borrar (`routes/admin.ts` l. 134 a 136), ni cambiarle el correo, ni dar ese correo a otra cuenta (§5.5). Hoy sí podía quitarlo por otra puerta: un administrador dado desde el panel manda `PATCH /api/admin/users/<id del raíz>` con `{ emailVerified: false }` (`admin.ts` l. 51 a 58 y 104 a 119, sin comprobación del raíz), `isRootAdmin` exige el correo confirmado y el raíz deja de serlo, y además no puede entrar hasta abrir un enlace nuevo. Desde el PR 5, el `PATCH` sobre la cuenta raíz (`isRootAdminUser`, como ya hace el `DELETE`, l. 134 a 136) responde 409 `es_el_admin_raiz` para `emailVerified`, `isAdmin`, `email` y `birthDate` (8-h). `AI_ADMINS` es una lista; aquí `ADMIN_EMAIL` es un solo correo porque hay un solo dueño, y los demás administradores se dan desde el panel (8-c). El día que haya dos dueños fijos, `ADMIN_EMAILS` como lista separada por comas, con `ADMIN_EMAIL` como alias, y `isRootAdmin` que mire la lista.
- **Administradores dados desde el panel**: `users.is_admin`, que cualquier administrador da o quita, menos a sí mismo (`routes/admin.ts` l. 114 a 116, 409 `no_puedes_quitarte_admin`). Igual que `twilightstruggle` con sus administradores de la base.
- **El moderador** existe en los dos juegos de referencia (`his`, `backend/app/auth.py` l. 189 a 195, `require_moderator_or_admin`) y aquí es de E7. E4 deja el sitio: `admin_audit.actor` guarda un id de cuenta y no supone que sea administrador, y `GET /api/admin/audit` está escrita para que E7 la abra a un papel más, como `his` abre su registro a los dos (`routers/admin_log.py` l. 12 a 25). Cuando E7 cree el moderador, cambian con él esa ruta y las frases de `/terms` (§4.6) y de Privacy (§10.1) que dicen «an administrator».

**Lo que el panel gana en E4:**

| Ruta                                        | Cuerpo                                                   | Reglas                                                                                                                                                                                                                                                                                                                                                                                            | Escribe en `admin_audit`                                                                                                                                                                         |
| ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PATCH /api/admin/users/:id`                | ahora también `email`, `signOutEverywhere` y `birthDate` | §5.5: normalizado, ni viejo ni nuevo `ADMIN_EMAIL` (400 `admin_email_fijo`), único (409 `correo_ocupado`), `email_verified` queda `true`, aviso `email_changed` antes y, con `signOutEverywhere` (por defecto `true`), todas las sesiones cerradas; `birthDate` con `birthDateSchema` (§4.5); sobre la cuenta raíz, 409 `es_el_admin_raiz` para `emailVerified`, `isAdmin`, `email` y `birthDate` | una fila por campo cambiado: `user.email`, `user.email_verified`, `user.is_admin`, `user.premium`, `user.birth_date` (esta sin el valor en `Recent changes`, que dice `date of birth · changed`) |
| `PATCH /api/admin/teams/:id` (nueva)        | `{ name }`                                               | las de `updateOwnedTeam` (`teamControl.ts` l. 170 a 178): de 2 a 40 caracteres, no bloqueado, no repetido en el mundo; vale para cualquier equipo, también el de una cuenta borrada (DD-14 B)                                                                                                                                                                                                     | `team.name`                                                                                                                                                                                      |
| `POST /api/admin/users/:id/approve` (nueva) | nada                                                     | §4.9: solo `pending` (409 `no_pendiente`); con el presupuesto gastado, 503 `MAIL_BUDGET_EXHAUSTED` sin cambiar nada; aprueba y manda `verify_signup`                                                                                                                                                                                                                                              | `user.status` (`pending` a `approved`)                                                                                                                                                           |
| `POST /api/admin/users/:id/reject` (nueva)  | nada                                                     | §4.9: solo `pending` (409 `no_pendiente`); borra la cuenta, sin correo                                                                                                                                                                                                                                                                                                                            | `user.status` (`pending` a `rejected`), sin el correo                                                                                                                                            |
| `DELETE /api/admin/users/:id`               | sin cambio                                               | sin cambio (l. 122 a 140)                                                                                                                                                                                                                                                                                                                                                                         | `user.delete`                                                                                                                                                                                    |
| `POST /api/admin/teams/:id/kit/revert`      | sin cambio (l. 222 a 240)                                | sin cambio                                                                                                                                                                                                                                                                                                                                                                                        | `team.kit_revert`                                                                                                                                                                                |
| `POST /api/admin/premium`                   | sin cambio (l. 259 a 270)                                | sin cambio                                                                                                                                                                                                                                                                                                                                                                                        | `user.premium` con `{ field: 'premium', from, to }`                                                                                                                                              |
| `POST /api/admin/blocklist`                 | sin cambio (l. 188)                                      | sin cambio                                                                                                                                                                                                                                                                                                                                                                                        | `blocklist.add` con `{ field: <kind>, from: null, to: <nombre> }`                                                                                                                                |
| `DELETE /api/admin/blocklist/:id`           | sin cambio (l. 207)                                      | sin cambio                                                                                                                                                                                                                                                                                                                                                                                        | `blocklist.remove` con `{ field: <kind>, from: <nombre>, to: null }`                                                                                                                             |
| `POST /admin/tick` y `POST /admin/advance`  | sin cambio (l. 146 y 161)                                | sin cambio                                                                                                                                                                                                                                                                                                                                                                                        | `world.tick` y `world.advance` con `{ field: 'days', from: null, to: <días pedidos> }`; `actor` es el id o `'token'`                                                                             |
| `GET /api/admin/audit` (nueva)              | `?limit=` hasta 500, `?before=`                          | solo administradores                                                                                                                                                                                                                                                                                                                                                                              | nada                                                                                                                                                                                             |

**`admin_audit`** (0055): `id uuid pk`, `at timestamptz`, `actor text` (el id de la cuenta, o `'token'` si entra por `ADMIN_TOKEN`), `action text`, `target_user_id uuid` sin clave ajena (sobrevive al borrado del objetivo), `detail jsonb` con `{ field, from, to }` (para el equipo, también `teamId`). Sin IP. Una fila por campo, en la misma transacción que el cambio, como `ai_user_edits` de `twilightstruggle` (`admin.ts` l. 233 a 235). Al borrar una cuenta, `deleteAccount` vacía `from` y `to` de sus filas `user.email` (§10.4): el registro dice que hubo un cambio, no a qué correo.

Así toda edición de un administrador queda escrita, como pidió el dueño («cada edición de un administrador», `00-encargo.md` §9.2, punto 1): las del tick y el avance mueven el mundo y no una cuenta, pero las hace un administrador o una máquina con `ADMIN_TOKEN`, y el registro dice cuál (8-i).

**El panel** abre con `Waiting for approval (<n>)` (pantalla), la cola de §4.9 de la más vieja a la más nueva: por fila, el correo, `Requested 19 Nov 2026`, `Approve` y `Reject`; la confirmación de `Reject` dice `Reject <email>? The request is deleted and nothing is sent.`; sin nadie, `Nobody is waiting.` En cada fila de cuenta, `Change email` (pantalla: campo `New email`, casilla `Sign out everywhere` encendida, `Save`, `Cancel`; confirmación `Change <old> to <new>? No email is sent to either address. A notification goes to their devices.`), `Change date of birth` (`DateField`, `Save`) y, si tiene equipo, `Rename team` (campo `Team name`, `Save`). **Un equipo sin dueño humano** (el de quien se borró, DD-14, o un equipo bot) no tiene fila de cuenta: `Rename team` está también en la página del equipo, `/world/teams/:id` (`App.tsx` l. 297), para quien es administrador, con el mismo campo y la misma ruta (8-j). `adminPanel.test.ts` lo cubre por la API y el test de `Team` por la web. Debajo de la lista, un `Panel` `Recent changes` con las 50 últimas filas: `19 Nov 2026, 18:42 · <actor> · email · old → new`. Errores (pantalla): `The email of a fixed administrator (ADMIN_EMAIL) can't be changed or given here.`, `Another account already uses this email.`, `That team name is taken in this world.`, `That team name isn't allowed.`, `The fixed administrator's account can't be changed here.` (409 `es_el_admin_raiz`), `This request was already decided.` (409 `no_pendiente`), `Today's email budget is used up. Approve again tomorrow.` (503 `MAIL_BUDGET_EXHAUSTED`).

### 8.6 Sin segundo factor

El dueño eligió el panel sin TOTP (DD-01 A): «Mira como resolví eso en hereistand y en twikightstruggle.app y me gustaría que sea parecido» (`00-encargo.md` l. 360 a 361), y ninguno de los dos lo tiene. Lo que queda escrito: quien tenga el buzón de `ADMIN_EMAIL` tiene el panel (A5, `docs/ops.md` l. 131 a 134), y lo que lo frena es el segundo factor del propio buzón del dueño, que el PR 17 (`operacion`) escribe como tarea en `docs/ops.md`. Con `admin_audit`, lo que haga un intruso en el panel queda escrito. La alternativa B (el plugin `twoFactor` sin `sendOTP`, la migración `0059_dos_factores` y el PR 18) no se hace; si el dueño la quisiera algún día, X-16 dice por qué solo sin `sendOTP` no choca con D-00f: `twoFactor` 1.7.26 monta `/two-factor/send-otp`, el código por correo (`ba17/plugins/two-factor/otp/index.mjs` l. 63 a 78), y la lista blanca lo dejaría en 404.

---

**Injertos aplicados.** I-05 (§8.5, sin el TOTP: el correo raíz fijo y `admin_audit`), I-06 (§8.1), I-07 (§8.1: `disabledPaths`).

**Objeciones resueltas.** O-01 (§8.5 y §8.6: el panel se escribe entero), O-21 (§8.1).

**Huecos rellenados.** H-10 (§8.4).

**Decisiones de esta sección.**

- **8-a**, once rutas en la lista blanca: `change-email` sale (`00-encargo.md` §9.3).
- **8-b**, sin TOTP (DD-01 A por el dueño): fuera la 0059, el PR 18 y las rutas `/two-factor/*`. Manda sobre D-29 y D-31.
- **8-c**, `ADMIN_EMAIL` sigue siendo un solo correo porque hay un solo dueño: el modelo de `twilightstruggle` (una lista fija del entorno más los que da el panel) ya se cumple con uno fijo y los de `is_admin`. Volverlo lista (`ADMIN_EMAILS`, con `ADMIN_EMAIL` como alias) es cambiar el `z.string().email()` de `env.ts` l. 52 y `isRootAdmin`; se hace el día que haya un segundo dueño fijo.
- **8-d**, `admin_audit` guarda una fila por campo con `{ field, from, to }`, como `ai_user_edits`; `actor` es `'token'` con `ADMIN_TOKEN`.
- **8-e**, nueva `PATCH /api/admin/teams/:id` para que un administrador cambie siempre el nombre de un equipo (`00-encargo.md` §9.2, punto 7), con las reglas de `updateOwnedTeam`.
- **8-f**, `GET /api/admin/audit` pagina con `before` y como mucho 500 filas (`his` da 500 por defecto y hasta 1.000, `admin_log.py` l. 14).
- **8-g**, las rutas con parámetros se cierran con un `hooks.before` sobre `ctx.path`, porque `disabledPaths` no las alcanza.
- **8-h**, el `PATCH` sobre la cuenta raíz responde 409 `es_el_admin_raiz` para `emailVerified`, `isAdmin`, `email` y `birthDate`.
- **8-i**, `admin_audit` también apunta premium, la lista de bloqueo, el tick y el avance forzado.
- **8-j**, `Rename team` también en la página del equipo para un administrador, para los equipos sin fila de cuenta.
- **8-k**, el panel gana la cola de aprobación (`approve` y `reject`, §4.9).
- **8-l**, `disabledPaths` es el complemento de `AUTH_ALLOWED_PATHS` más `/verify-email`, que usa la ruta interna de §5.2.

## 9. El correo transaccional

El juego manda dos correos, `verify_signup` y `reset_password` (§5.7), y ninguno de juego (D-00c). Esta sección dice lo que hace falta para que lleguen y para saber cuándo no llegan: el DNS, el registro de cada envío con el webhook de Resend, lo que ve el jugador cuyo buzón rebota, el plan gratuito con su registro por aprobación y por tandas, la purga y lo que haría falta el día que hubiera otro flujo.

### 9.1 El DNS de hoy y el cambio

Consultado el 19 de noviembre de 2026 (mapa 02 §2): DKIM en `resend._domainkey` con una clave RSA de **1.024 bits**; return path de Resend en `send.cyclingstar.app` y `rsend.cyclingstar.app` (CNAME); SPF del dominio raíz solo para el alojamiento, que no hace falta para Resend; `_dmarc` con `v=DMARC1; p=none;`, sin `rua` ni `ruf`; sin `CAA`. La alineación pasa por DKIM (`d=cyclingstar.app`) y por el return path en modo relajado (deducido de los registros).

| Registro                   | Cambio                                                                                                                                        | Por qué                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DMARC                      | **ninguno**: se queda `v=DMARC1; p=none;`                                                                                                     | el dueño no quiere informes por ahora (DD-15 C, «No sabia que se podia hacer eso... pero ok, de momento lo dejamos», `00-encargo.md` l. 407 a 408). Sin informes no hay forma de saber que un mes ha sido limpio, así que tampoco se pasa a `quarantine`. `p=none` basta para Gmail incluso a quien manda más de 5.000 al día (mapa 02 §3) |
| DKIM                       | 2.048 bits si el panel de Resend deja elegir la longitud; si no, se queda y se apunta en `docs/ops.md`                                        | Google pide 1.024 o más y recomienda 2.048 (mapa 02 §2). Si Resend deja elegirla: no lo sé                                                                                                                                                                                                                                                 |
| `CAA`                      | `0 issue "letsencrypt.org"` y el de la autoridad que use Railway, que se lee del certificado que sirve `www.cyclingstar.app` el día del PR 17 | hoy cualquier autoridad puede emitir un certificado para el dominio                                                                                                                                                                                                                                                                        |
| `docs/ops.md` l. 106 y 108 | se corrigen: `send.` es un CNAME (no `MX` y `TXT`), existe `rsend.`, y DMARC no es opcional porque está puesto                                | mapa 02 §2 (I-26)                                                                                                                                                                                                                                                                                                                          |

Lo que se pierde sin informes, escrito para el dueño: nadie sabrá si un tercero manda correo en nombre de `cyclingstar.app`. El día que lo quiera, es una línea: `rua=mailto:<buzón>` y, si el buzón es de otro dominio, que ese dominio publique `cyclingstar.app._report._dmarc.<suyo>` (RFC 7489 §7.1).

### 9.2 `email_log` y el webhook de Resend

Hoy `mailer.ts` no lee la respuesta de Resend y el `id` de cada envío se pierde (l. 110): un rebote no se puede casar con su correo (mapa 02 §1). Con E4 (D-33):

- **`email_log`** (0057): `id uuid pk`, `resend_id text unique`, `kind` (`verify_signup` o `reset_password`), `recipient_hash` (HMAC del correo normalizado, como `auth_limits`), `user_id` con `on delete set null`, `status` (`queued`, `sent`, `delivered`, `bounced`, `complained`, `suppressed`, `failed`), `created_at`, `updated_at`. Sin el correo en claro, sin asunto ni cuerpo.
- **`mailer.send`** apunta `queued` antes de llamar a Resend (§5.6), lee el JSON de la respuesta y guarda `resend_id` y `sent`; con un rechazo, `failed`. Sigue sin lanzar. `send` recibe el `kind` y el `userId` además de lo de hoy.
- **`POST /api/webhooks/resend`**, fuera de `/api/auth/*` y del límite de credenciales, con el cuerpo **crudo** y la firma `svix` (`svix-id`, `svix-timestamp`, `svix-signature`) comprobada con `RESEND_WEBHOOK_SECRET` y la librería `svix`. En Fastify un analizador de cuerpo es de un contexto de encapsulación, no de una ruta: puesto en la raíz cambiaría el JSON de toda la API. Así que la ruta se registra en su propio contexto, `app.register(async (s) => { s.addContentTypeParser('application/json', { parseAs: 'buffer' }, …); s.post('/api/webhooks/resend', …) })` (9-f). Sin firma válida, 401 y nada más. Un evento repetido no hace daño sin guardar `svix-id`: `status` nunca retrocede (un `delivered` no pisa a `bounced`, `complained`, `suppressed` ni `failed`), así que aplicar dos veces el mismo estado no cambia nada (9-e). Eventos: `email.delivered`, `email.bounced`, `email.complained`, `email.suppressed` y `email.failed` cambian `status`; los tres del medio ponen además `users.email_undeliverable_at = now()` en la cuenta de ese `user_id`. El plan gratuito permite un webhook (mapa 02 §3), y basta.
- `resendWebhook.test.ts` firma cuerpos con un secreto de prueba y comprueba la firma mala, la repetida, que un `delivered` tardío no pisa un `bounced`, cada evento, y que otra ruta de la API sigue recibiendo el JSON analizado.

### 9.3 La supresión y lo que ve el jugador

Resend deja de mandar a una dirección tras un rebote duro o una queja, en todos los dominios del equipo (mapa 02 §3). Desde E4 el juego lo sabe: con `users.email_undeliverable_at` puesto y sin un envío entregado después, `Account` abre con un `Notice` `warn` (pantalla):

```
We can't deliver email to <email>
Without it you can't reset your password if you forget it. Only an administrator can change the email of an account.
```

Es lo único que le dirá que se ha quedado sin red, sin contacto detrás (§11). La segunda frase cambia la que proponía el glosario (`Change your email.`), porque el jugador ya no puede cambiarlo (§5.5). La marca se borra cuando un administrador cambia el correo (§8.5) o cuando llega un `email.delivered` posterior.

### 9.4 El plan, el presupuesto y el calentamiento por tandas

El dueño: «de momento nos quedamos en el gratis y abrimos registro por tandas pequeñas» (DD-10 B, `00-encargo.md` l. 378). El plan gratuito da 100 correos al día y 3.000 al mes (mapa 02 §3); qué plan hay hoy y qué código devuelve Resend al pasar el tope, no lo sé. El presupuesto (§7.6) para antes: `MAIL_DAILY_BUDGET` 90, `verify_signup` hasta 60 en el día UTC, `reset_password` hasta 90.

**Las tandas.** El mecanismo es el registro por aprobación de §4.9 (el dueño, «Ok, si, de momento hagamos igual», `00-encargo.md` §9.5, punto 1): quien se registra espera en `pending` y no gasta correo; cada aprobación del panel gasta un `verify_signup`, y otro por cada `Send me a new link` o entrada sin confirmar: entre 1 y 2 por persona aprobada (estimado). El dueño manda las invitaciones de la lista de espera a mano desde su buzón (`docs/captacion.md` l. 111), fuera de Resend, y aprueba al ritmo de esta tabla, con 60 correos al día para registros:

| Día desde la primera aprobación | Aprobaciones al día | Condición para pasar al siguiente                                                      |
| ------------------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| 1 a 3                           | 25                  | rebotes de `email_log` por debajo del 4 % y quejas por debajo del 0,08 % en lo enviado |
| 4 a 7                           | 40                  | lo mismo, y el día no pasa de 63 envíos (70 % de 90)                                   |
| desde el 8                      | hasta 50, nunca más | lo mismo; si el día pasa del 70 % dos días seguidos, se vuelve a 25                    |

Las cifras de Resend para calentar empiezan en 150 el primer día (mapa 02 §4): este volumen nunca las alcanza, así que las tandas son el calentamiento. El riesgo real era el contrario: abrir de golpe, con mil registros que son mil correos y diez veces el tope del plan; con la aprobación, mil registros son mil filas `pending` y ningún correo hasta que el administrador decide. Si algún día hace falta más de 50 al día, la salida es el plan Pro (20 USD al mes, 50.000 al mes, sin tope diario) y `MAIL_DAILY_BUDGET` a 1.500 (DD-10 A).

### 9.5 La purga y los rebotes por registros inventados

Un registro con un correo inventado ya no manda nada al registrarse: espera en `pending` (§4.9), y solo rebota si un administrador lo aprueba; Resend castiga por encima del 4 % (H-07). Lo frenan la mano del administrador, L4 (20 registros al día por IP, §7.4), la medida de rebotes de `email_log` con su umbral (§19.4) y la purga diaria de `purgeAccounts(db, now)` (`packages/db/src/purge.ts`, D-34; I-27), que corre una vez al día (dónde, §15.4):

- `auth_limits` sin actividad en `AUTH_LIMITS_RETENTION_DAYS` (2) días;
- `email_log` de más de `EMAIL_LOG_RETENTION_DAYS` (90) días;
- `verifications` caducadas;
- con DD-17 A, las cuentas aprobadas y sin confirmar cuya aprobación (`approved_at`) tiene más de `PURGE_UNCONFIRMED_DAYS` (7) días, sin corredor ni equipo, y con ellas la contraseña de quien se registró con un correo ajeno (A2 más A10, §2.1). Las `pending` no se purgan: las decide el administrador (§4.9), y una petición que espera no ha recibido ningún enlace que caduque.

No hay tope diario de registros: sería un apagado del registro a disposición de cualquiera (seguridad).

### 9.6 Lo que haría falta si hubiera correo de notificación

Hoy no se hace nada de esto (D-35; D-00c). El día que hubiera un segundo flujo: un remitente en `notify.cyclingstar.app` con su DKIM y su return path; `List-Unsubscribe` y `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058) en el campo `headers` del envío, con una baja efectiva en 48 horas, que Gmail y Yahoo exigen a quien manda más de 5.000 al día; `mailer.ts` aceptando cabeceras (hoy no, l. 93 a 99); y **otro equipo de Resend**, porque la supresión es del equipo y una queja contra un aviso suprimiría la recuperación de esa persona (mapa 02 §3 y §4, deducido). Con el plan gratuito, otro dominio cuenta entre los tres que permite.

---

**Injertos aplicados.** I-13 (§9.4: el presupuesto, con DD-10 B), I-26 (§9.1: DKIM, `CAA` y `docs/ops.md`; el `rua` no, por DD-15 C), I-27 (§9.5).

**Objeciones resueltas.** O-04 (§9.4: los correos van dentro del presupuesto).

**Huecos rellenados.** H-07 (§9.5).

**Decisiones de esta sección.**

- **9-a**, DMARC se queda como está y no pasa a `quarantine`: sin informes (DD-15 C) no hay con qué decir que un mes fue limpio. Manda sobre D-32.
- **9-b**, plan gratuito con tandas de 25, 40 y como mucho 50 aprobaciones al día, con sus condiciones (DD-10 B), por el registro por aprobación de §4.9. Manda sobre D-34 (§22.5). Las cifras son estimadas: una cuenta aprobada gasta entre 1 y 2 correos.
- **9-c**, el `Notice` del correo que no llega dice `Only an administrator can change the email of an account.` en lugar de `Change your email.`
- **9-d**, la marca `email_undeliverable_at` se borra con un cambio de correo del administrador o con un `email.delivered` posterior.
- **9-e**, el webhook no guarda `svix-id`: un evento repetido no cambia nada porque `status` no retrocede.
- **9-f**, el webhook vive en su propio contexto de Fastify con su analizador de cuerpo crudo.
- **9-g**, las cuentas `pending` no se purgan; la purga de DD-17 cuenta los 7 días desde `approved_at`.

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

## 11. El contacto aparcado

El encargo pedía un canal de contacto y el dueño lo aparcó: «? De momento no lo pongas» (`00-encargo.md` l. 312, 19 de noviembre de 2026; D-00b). Esta sección no lo diseña como pieza: escribe el riesgo, lo que se quita de la web y lo que costaría el día que se quiera. Desde el 23 de noviembre el riesgo es mayor, porque el correo de una cuenta solo lo cambia un administrador (§5.5) y no hay por dónde pedírselo.

### 11.1 El riesgo

| Quién                                   | Qué le pasa sin contacto                                                                                                                                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quien pierde su buzón                   | pierde la cuenta: no puede recuperar la contraseña y no tiene a quién pedirla. `Account › Email` se lo dice antes de que pase (pantalla): `If you lose access to this email, you won't be able to recover your account.`                                       |
| Quien quiere cambiar de correo          | solo un administrador puede hacerlo (§5.5), y la web no dice dónde pedirlo, porque no hay dónde                                                                                                                                                                |
| Quien tecleó mal su fecha de nacimiento | no puede corregirla él: `PUT /api/me/birth-date` escribe una vez (409 `already_set`, §4.5). Puede corregirla un administrador desde el panel (§8.5), pero la web no dice dónde pedirlo, porque no hay dónde (I-20)                                             |
| Quien ve la cuenta de un menor          | no puede avisar (`agenda.md` l. 254 y 259); qué se hace con sus datos, a confirmar con un abogado (H-11, §21.3)                                                                                                                                                |
| Quien recibe un correo que no pidió     | no puede preguntar; `verify_signup` le dice que lo ignore, y la purga borra la cuenta a los 7 días de aprobada (§9.5)                                                                                                                                          |
| Quien encuentra un fallo de seguridad   | no tiene a quién decírselo: no hay `security.txt`                                                                                                                                                                                                              |
| Quien espera la aprobación              | no puede preguntar cuánto le queda; `CheckInbox` le dice que un administrador revisa las cuentas a mano (§4.9, §5.3)                                                                                                                                           |
| Quien está en la beta                   | tiene el grupo de WhatsApp «con el dueño dentro», el único canal de hecho ([DUEÑO 12]: `docs/agenda.md` l. 448 a 450, 14 de septiembre de 2026; `docs/encargos.md` l. 779 a 781). Quien se quede fuera de su cuenta y no esté en el grupo no tiene nada (H-13) |

### 11.2 Lo que se quita de la web

- `Ask and your account and rider data will be removed.` (`Privacy.tsx` l. 38): promete un canal que no existe, el borrado ya es de autoservicio y el corredor no se borra (mapa 03 §5). Lo quita el PR 3 con el texto de §10.1, que dice `We don't offer a contact channel yet.`: una frase verdadera no es una promesa.
- El mismo PR busca en `apps/web/src` otras promesas de contacto (`contact`, `support`, `email us`, `get in touch`, `ask`, `write to`, sin distinguir mayúsculas) y retira las que prometan una respuesta (I-20). El resultado de la búsqueda va en la descripción del PR.
- Ningún texto nuevo de E4 promete respuesta. Por eso `Account › Email` dice `Your email can only be changed by an administrator.` y no «ask an administrator», que es la frase de `twilightstruggle` (`ai/ui/src/online/profile.ts` l. 55) y allí tiene un canal detrás.

### 11.3 Lo que costaría el día que se quiera

Estimado, sin medir:

1. Un buzón: hoy el MX de `cyclingstar.app` apunta al Apache del alojamiento (`0 cyclingstar.app.`, mapa 02 §2) y no sé si hay buzón detrás. Un reenvío de `support@cyclingstar.app` al correo del dueño en ese alojamiento, o un MX nuevo: media hora de DNS.
2. Un enlace en el pie (`App.tsx` l. 393 a 418), en `Login`, en `Privacy` y en `Account › Email` (que pasaría a decir `Write to support@cyclingstar.app to change it.`), y `/.well-known/security.txt` con `Contact:` y `Expires:`: un PR de una hora.
3. El coste real es contestar: el tiempo del dueño, sin plazo prometido hasta que lo decida. Y el procedimiento para cambiar un correo sin entregar cuentas a quien se haga pasar por otro (el administrador engañado, §2.3): por ejemplo, contestar solo desde la dirección vieja.

---

**Injertos aplicados.** I-20 (§11.1 y §11.2).

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** H-11 (§11.1, con su destino en §21.3), H-13 (§11.1).

**Decisiones de esta sección.**

- **11-a**, el riesgo gana una fila, la del cambio de correo, que nace con `00-encargo.md` §9.3.
- **11-b**, `Account › Email` no dice «ask an administrator»; dice `Your email can only be changed by an administrator.`, que no promete un canal.
- **11-c**, Privacy dice `We don't offer a contact channel yet.`; se considera una frase verdadera y no una promesa (D-00b).
- **11-d**, la búsqueda de promesas añade `get in touch` y `write to` a la lista de I-20.

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
Shared computer? Forget this device
```

Cada fila es un `ActionRow` que abre `/account/<tarea>` (`AccountEmail`, `AccountPassword`, `AccountDevices`, `AccountData`, `AccountDelete`, `AccountNotifications`, `AccountAway`, `AccountSpoilers`, `AccountAppearance`), cada una con su `PageHeader` y `‹ Account` para volver. Los valores de la derecha salen de `GET /api/me/account` (nace en el PR 9 con `birthDateSet`, §4.5, y el PR 11 la completa): `{ ok: true, email, joinedAt, birthDateSet: boolean, passwordChangedAt: string | null, devices: number, emailUndeliverableAt: string | null }`. `Shared computer? Forget this device` es un `TextLink` bajo `Sign out` que quita la entrada de este navegador de la `cs_device` y sale (`POST /api/auth/devices/forget`, §6.5); al terminar, en `/login`, `Notice` `good` (pantalla) `Signed out. This browser no longer counts as one of your devices.` `passwordChangedAt` es `accounts.updated_at` de la fila `credential`; si `better-auth` no la toca al cambiar la contraseña (no lo he comprobado), la fila dice `Set`; `authFlow.test.ts` lo comprueba al cambiar la contraseña. Es el gemelo en la web de `password_changed`, como `Devices` lo es de `new_sign_in` (principio 2). Con `email_undeliverable_at`, el `Notice` `warn` de §9.3 va encima de todo.

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

| Estado y código                                                       | Texto (pantalla)                                                                                                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0, sin red                                                            | `Can't reach Cycling Star. Check your connection and try again.`                                                                                                      |
| 429 de Fastify (`demasiadas_peticiones`) o L4                         | `Too many attempts from this connection. Try again in <wait>.`                                                                                                        |
| 429 `ACCOUNT_LOCKED`                                                  | `Too many failed attempts on this account. Try again in 15 minutes, or reset your password.`, con `reset your password` como `TextLink` a `/forgot-password`          |
| 429 `PASSWORD_ATTEMPTS_LOCKED`                                        | `Too many wrong passwords. Try again in 15 minutes.`; con `signedOut: true`, a `/login` con `You were signed out after too many wrong passwords.`                     |
| 429 `EXPORT_LIMIT`                                                    | `You've downloaded your data 3 times today. Try again tomorrow.`                                                                                                      |
| 401 `INVALID_EMAIL_OR_PASSWORD`                                       | `Wrong email or password.` (hoy `Invalid email or password`, sin punto)                                                                                               |
| 400 `INVALID_PASSWORD`                                                | `That's not your current password.`                                                                                                                                   |
| 403 `EMAIL_NOT_VERIFIED`                                              | el `Notice` de §5.3                                                                                                                                                   |
| 403 `ACCOUNT_PENDING`                                                 | `Your account is waiting for approval` / `An administrator reviews new accounts by hand. When yours is approved, we'll email you a link to finish signing up.` (§4.9) |
| 400 `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`                         | `Use at least 8 characters.` / `Your password can be at most 128 characters.`                                                                                         |
| 400 `VALIDATION_ERROR` con `INVALID_BIRTH_DATE` o `UNDER_MINIMUM_AGE` | §4.8                                                                                                                                                                  |
| 400 `INVALID_TOKEN`, `TOKEN_EXPIRED`                                  | `This link has expired or has already been used.`                                                                                                                     |
| 403 `BIRTH_DATE_REQUIRED`                                             | ninguno: lleva a `/account/birth-date`                                                                                                                                |
| 503 `MAIL_BUDGET_EXHAUSTED`                                           | `We can't send emails right now. Try again tomorrow.`                                                                                                                 |
| cualquier otro                                                        | `Something went wrong. Try again in a minute.`                                                                                                                        |

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

Entran por el catálogo de E3, con su test por estado y su sitio en `/_ui` (`docs/visual.md` l. 1329 a 1333; D-56). La misma regla vale para las demás piezas nuevas de E4, cada una con un estado en `/_ui` como mínimo (12-h): `AwayBand` (§14.1, PR 13), `WelcomeBack` con y sin corredor (§14.5, PR 13) y los dos `Notice` del permiso de §13.3 (PR 14). `AccountNotifications` es una página y no una pieza del catálogo: sus ocho estados los fija su test (§17.1).

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
- **12-h**, `AwayBand`, `WelcomeBack` y los dos `Notice` del permiso entran en `/_ui` con un estado cada uno como mínimo.
- **12-i**, `Account` gana `Shared computer? Forget this device` bajo `Sign out` (§6.5).

## 13. Los avisos

Un aviso es una notificación del navegador o de la app, nunca un correo (D-00c): el dueño, el 19 de noviembre, «No, como mucho notificadores de browser y app» (`00-encargo.md` l. 313 a 315), y el 23, «Sin correo, solo notificación push» (l. 385 a 387). Hoy no existe ninguno: ni service worker, ni `Notification`, ni `PushManager` en `apps/web/src` (mapa 02 §7). La arquitectura es la de `twilightstruggle`, que el dueño puso de referencia (`00-encargo.md` l. 391 a 394): `web-push` con VAPID, apagado sin claves, enviado después del cambio y en segundo plano, una lista cerrada de servicios de push y un service worker sin caché (`ai/src/pvp/push.ts` l. 10 a 37; `ai/ui/public/sw.js`). Lo que cambia respecto a ella se dice en cada subsección. Desde el 23 de noviembre hay además tres avisos de seguridad, porque la seguridad ya no va por correo (§3, principio 2; §5.4; §7.5).

### 13.1 El catálogo

Nueve avisos. Los seis de juego se construyen solo con `PreStageInfo`, la lista de salida o datos de la cuenta (D-42); los tres de seguridad, con datos de la cuenta. Cada uno tiene su gemelo en la web, que es lo que ve quien no tiene avisos (principio 4). Textos (aviso), en inglés y enteros; `<rider>` es el nombre del corredor del jugador.

| Id                 | Disparador                                                                                                                            | Título / cuerpo (aviso)                                                                                                                                                                                                                                                                                            | Tope                                         | TTL  | `tag`            | `path`                               | De serie | Gemelo en la web                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ---- | ---------------- | ------------------------------------ | -------- | ------------------------------------------------------------------ |
| `stage_digest`     | a `STAGE_DIGEST_HOUR` (19) locales, etapas con su corredor en la salida que pasaron a velado desde el último resumen y siguen sin ver | con una: `stageReadyNotice` tal cual (`Stage 7 of Race France is ready to watch` / `187 km · mountain stage · your rider is on the start list`); con varias: `3 stages are ready to watch` / `Race France · your rider is on the start list` (con dos o más carreras: `2 races · your rider is on the start list`) | 1 por día local                              | 12 h | `digest`         | `/`                                  | sí       | `Ready to watch` de la portada (E2)                                |
| `stage_ready`      | cada etapa que pasa a velada de una carrera seguida (`race_watch.follow = 1`)                                                         | `stageReadyNotice` tal cual                                                                                                                                                                                                                                                                                        | 1 por carrera cada `STAGE_READY_EVERY_H` (6) | 6 h  | `stage-<raceId>` | `/world/races/<raceId>/stages/<day>` | no       | la misma fila de `Ready to watch`                                  |
| `plan_ending`      | al plan vivo le quedan `PLAN_ENDING_GAME_DAYS` (4) días de juego, un día real                                                         | `Your training plan ends tomorrow` / `After that your coach picks <rider>'s training.`                                                                                                                                                                                                                             | 1 por plan                                   | 12 h | `plan`           | `/me/training`                       | sí       | el aviso del plan de la portada (`PLAN_END_WARN_DAYS`, 7)          |
| `offer_received`   | el tick crea ofertas para su corredor libre                                                                                           | `New contract offers for <rider>` / `3 teams made an offer. Offers expire in about 5 days.` (con una: `One team made an offer. Offers expire in about 5 days.`)                                                                                                                                                    | 1 por día local                              | 12 h | `offers`         | `/me/contract`                       | sí       | `/me/contract` y `Welcome back` (§14.5)                            |
| `away_warning`     | 20 y 27 días reales de inactividad (§14.4), solo con la regla de E7 viva (PR 15)                                                      | `10 days left` / `If you don't visit by 19 Dec, your coach takes over <rider>. One visit is enough.` (a los 27: `3 days left`)                                                                                                                                                                                     | 2 por periodo de inactividad                 | 12 h | `away`           | `/`                                  | sí       | `Away` y `Welcome back` (§14.5)                                    |
| `away_over`        | llega `away_until`                                                                                                                    | `Welcome back` / `Your away time is over. Your notifications are on again.`                                                                                                                                                                                                                                        | 1 por ausencia                               | 12 h | `away`           | `/`                                  | sí       | `Welcome back`                                                     |
| `password_changed` | 200 de `reset-password` y de `change-password` (§5.4)                                                                                 | `Your password was changed` / `If it wasn't you, reset it now.`                                                                                                                                                                                                                                                    | ninguno: cada cambio es uno                  | 12 h | `password`       | `/forgot-password`                   | siempre  | la fila `Password` de `Account` (§12.1)                            |
| `new_sign_in`      | 200 de `sign-in/email` sin `cs_device` válida para ese correo (§7.5)                                                                  | `New sign-in to your account` / `Chrome on Android signed in just now. If it wasn't you, reset your password.` (con `deviceLabel` del agente, §6.4)                                                                                                                                                                | 1 por hora y cuenta (`NEW_SIGN_IN_EVERY_H`)  | 12 h | `signin`         | `/account/devices`                   | siempre  | la fila nueva de `Devices` (§12.2)                                 |
| `email_changed`    | un administrador va a cambiar el correo de la cuenta (`PATCH /api/admin/users/:id` con `email`, §5.5), antes de cambiarlo             | `Your account email was changed by an administrator` / `If you didn't ask for this, sign in and check Account.`                                                                                                                                                                                                    | ninguno: cada cambio es uno                  | 12 h | `email`          | `/account/email`                     | siempre  | `Account › Email` con el correo nuevo y `Recent changes` del panel |

`stage_digest` y no una por etapa: con cuatro días de juego por día real una vuelta da hasta cuatro «etapa lista» al día, ocho con dos carreras (mapa 02 §10, estimado), y Chrome retira el permiso a las webs no instaladas que avisan mucho y se visitan poco (mapa 02 §5). Cuenta solo las etapas veladas desde el último resumen, para no repetir cada tarde las mismas a quien no mira (13-c). Las etapas listas salen de `computeHorizon` e `isVeiled` (`packages/db/src/horizon.ts` l. 381 y 866), las mismas que pintan `Ready to watch` (`WatchBlocks.tsx` l. 40 a 42). `offer_received` es del mercado de hoy (`contracts.ts` l. 37, `OFFER_TTL_DAYS` 21, unos 5 días reales, X-20); la negociación entre personas de E9 entra por este mismo catálogo cuando exista (I-29).

Los tres de seguridad (13-a, que recoge la propuesta de §5 y §7, más `email_changed` de §5.5): no tienen interruptor (DD-16 A), no cuentan en `NOTICE_DAILY_CAP`, no esperan al silencio y salen también durante la ausencia, porque su valor es llegar a tiempo y son raros (como mucho uno por hora el de entrada nueva). Los textos son los que propuso §5; `password_changed` lleva a `/forgot-password` y no a `Devices` (13-b): a quien le han cambiado la contraseña se le han cerrado las sesiones (§5.4) y `Devices` le pediría entrar con una contraseña que ya no sabe.

```ts
// packages/shared/src/account/notices.ts
import type { PreStageInfo } from '../wire.js'

export const NOTICE_KINDS = [
  'stage_digest',
  'stage_ready',
  'plan_ending',
  'offer_received',
  'away_warning',
  'away_over',
  'password_changed',
  'new_sign_in',
  'email_changed',
] as const
export type NoticeKind = (typeof NOTICE_KINDS)[number]

export interface NoticeSpec {
  /** Se puede apagar en `Notifications` y con `Turn off these`. Los de seguridad, no. */
  readonly switchable: boolean
  /** Encendido sin que el jugador diga nada (DD-02 A). */
  readonly byDefault: boolean
  /** Cuenta en `NOTICE_DAILY_CAP`. */
  readonly capped: boolean
  /** Espera al final del silencio. */
  readonly quiet: boolean
  /** Sale con la ausencia viva. */
  readonly whileAway: boolean
  readonly ttlS: number
  readonly urgency: 'normal' | 'high'
  /** Rótulo de la fila de `Notifications` (pantalla). */
  readonly label: string
}

/** Los valores, en la tabla de §13.1 y en el párrafo que sigue al bloque. */
export declare const NOTICE_CATALOG: Readonly<Record<NoticeKind, NoticeSpec>>

/** Lo que viaja al service worker y a la app: sin nada más que esto. */
export interface NoticePayload {
  readonly kind: NoticeKind
  readonly title: string
  readonly body: string
  /** Ruta de la web; la app la traduce a la suya. */
  readonly path: string
  readonly tag: string
  /** Si el service worker ofrece `Turn off these` (`NOTICE_CATALOG[kind].switchable`). */
  readonly off: boolean
}

export interface ReadyStage {
  readonly info: PreStageInfo
  readonly raceId: string
  readonly ownRiderOnStartlist: boolean
}

export type NoticeInput =
  | { readonly kind: 'stage_digest'; readonly stages: readonly ReadyStage[] }
  | { readonly kind: 'stage_ready'; readonly stage: ReadyStage }
  | { readonly kind: 'plan_ending'; readonly riderName: string }
  | { readonly kind: 'offer_received'; readonly riderName: string; readonly offers: number }
  | {
      readonly kind: 'away_warning'
      readonly riderName: string
      readonly daysLeft: number
      readonly deadline: string
    }
  | { readonly kind: 'away_over' }
  | { readonly kind: 'password_changed' }
  | { readonly kind: 'new_sign_in'; readonly deviceLabel: string }
  | { readonly kind: 'email_changed' }

/** Pura: el único constructor de avisos. `NOTICE_DEFAULTS` son los `byDefault` de los apagables. */
export declare function noticePayload(input: NoticeInput): NoticePayload
export declare const NOTICE_DEFAULTS: Readonly<Partial<Record<NoticeKind, boolean>>>
```

`NOTICE_CATALOG`: `switchable` y `byDefault` como la columna «De serie» (los tres de seguridad, `switchable: false`); `capped` en todos salvo `away_warning` (D-43) y los tres de seguridad; `quiet` en todos salvo los tres de seguridad; `whileAway` solo en `away_over` y los tres de seguridad; `ttlS` 21.600 en `stage_ready` y 43.200 en el resto; `urgency` `high` en los de seguridad y `normal` en el resto; `label`, el texto de su fila en §13.4 (`Password changed`, `New sign-in` y `Email changed` para los tres que no se pintan como casilla). `deadline` llega ya escrito como `19 Dec` (el formato de fechas de §5.7), para que la función no lea relojes. `users.notice_prefs` guarda solo lo que el jugador cambió (`{ "stage_ready": true }`); `{}` vale `NOTICE_DEFAULTS`, y una clave de un aviso no apagable se ignora al leer y se rechaza al escribir.

### 13.2 Topes, silencio y zona horaria

- **Tope global**: `NOTICE_DAILY_CAP` (3) avisos por día local y usuario, contando solo los `capped`, es decir, sin `away_warning` ni los de seguridad (D-43). Un aviso que no cabe se apunta en `notice_log` y no sale: llegaría tarde y el siguiente barrido no debe mandarlo mañana (13-d).
- **Silencio**: de `NOTICE_QUIET_START_H` (22) a `NOTICE_QUIET_END_H` (8) en `users.time_zone`. Un aviso `quiet` que cae ahí no se apunta y sale en el primer barrido después de las 8, si su TTL y su disparador siguen en pie. Los de seguridad no esperan. Es decisión de la síntesis y §21.4 se la enseña al dueño (O-06).
- **La zona** llega del navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`) en el cuerpo de `POST /api/me/push-targets`, se valida contra `Intl.supportedValuesOf('timeZone')` y se escribe en `users.time_zone`; Privacy la nombra (§10.1; O-05). Sin zona, UTC.
- **TTL** por aviso (tabla de §13.1) y **`Topic`**: un aviso nuevo con el mismo `tag` sustituye al pendiente en el servicio de push. `Topic` admite 32 caracteres del alfabeto base64url (mapa 02 §8) y `stage-<raceId>` pasa de 32, así que `Topic` es el SHA-256 del `tag` en base64url, cortado a 32 (13-e).

### 13.3 El permiso y la baja de un toque

El permiso nunca se pide al cargar (D-44): Firefox desde la 72 y Safari solo lo conceden tras un toque (mapa 02 §5), y `twilightstruggle` hace lo mismo («Permission is only ever asked for on a click», `ai/ui/src/online/push.ts` l. 7). Se ofrece en los momentos de DD-03 A, con un `Notice` `info` que se cierra; cerrarlo escribe `cs.noticeAskedAt` y lo calla `NOTICE_ASK_SNOOZE_DAYS` (30) días (pantalla):

```
Tras crear el corredor, en la portada                                            (pantalla)
Get notified when your stages are ready?
One notification in the evening when stages with your rider are ready to watch, and a few
about your training plan and contract offers. Never more than 3 a day.
[Turn on]  [Not now]

Al seguir una carrera, en su página
Get a notification when each stage of this race is ready?
[Turn on]  [Not now]
```

`Turn on` en el segundo enciende también `stage_ready` (13-f): es lo que el jugador acaba de pedir. En un iPhone fuera de la pantalla de inicio, `Turn on` se sustituye por `See how`, que abre `Account › Notifications` (§13.4). En `Account` el botón está siempre.

**La baja de un toque**: cada aviso apagable lleva la acción `Turn off these` donde el navegador pinta acciones (Chrome, Edge, Firefox; `Notification.maxActions` mayor que 0), que el service worker convierte en `POST /api/me/notices/<kind>/off` sin abrir nada ni pedir contraseña. Donde no hay acciones (Safari), tocar el aviso abre su página con `?from=notice&kind=<kind>` y la página pinta arriba `Don't want these? Turn off "Stages ready"` / `Turn off` (pantalla, `Notice` `info`). Hecho: `Turned off. You can turn it on again in Account, Notifications.` (`Notice` `good`).

### 13.4 `Notifications` (pantalla, 360 px)

`AccountNotifications`, en `/account/notifications`. Qué puede el navegador se decide como en `twilightstruggle` (`pushSupport`, `ai/ui/src/online/push.ts` l. 47 a 55): un iPhone o iPad (`/iPad|iPhone|iPod/` en el agente, o `MacIntel` con más de un punto táctil) que no está en modo `standalone` es `ios-home`; sin `serviceWorker`, `PushManager` o `Notification`, `unsupported`; si no, `ok`.

```
‹ Account
Notifications

Panel · This browser
Chrome on Android · On
Signing out of this browser turns its notifications off.
[ Turn off on this browser ]

Panel · What we notify
[x] Stages ready (once a day, 19:00)
[ ] Every stage of races you follow
[x] Training plan ending
[x] Contract offers
[x] Your away time is over
Always on: a changed password, a new sign-in and a changed email.
Quiet hours 22:00 to 08:00 (Europe/Madrid). Notifications wait until morning.

Panel · Other devices
Firefox on Windows · since 12 Nov                    [ Remove ]
```

`Before your coach takes over` aparece en la lista con el PR 15. Cada `Checkbox` guarda al cambiar con `PUT /api/me/notices` y dice `Notification settings saved.`; si falla, vuelve atrás y dice `Couldn't save. Try again in a minute.` Los estados del panel `This browser`, enteros:

| Estado                                                  | Lo que pinta (pantalla)                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin claves VAPID en el servidor (`enabled: false`)      | `Notifications aren't available yet.` y nada más en toda la página                                                                                                                                                                                                                                         |
| `unsupported`                                           | `This browser can't show notifications.` / `Everything a notification would tell you is also on your Home page.`                                                                                                                                                                                           |
| `ios-home` (DD-04 y `00-encargo.md` §9.5, por el dueño) | `On iPhone and iPad, notifications only work from the Home Screen.` / `Tap Share, then Add to Home Screen. Open Cycling Star from there, log in, and turn notifications on in Account, Notifications. You need iOS 16.4 or later.` / `Everything a notification would tell you is also on your Home page.` |
| Sin decidir (`Notification.permission` es `default`)    | `Get notifications on this browser.` / `[Turn on]`                                                                                                                                                                                                                                                         |
| Bloqueado (`denied`)                                    | `Notifications are blocked for Cycling Star in this browser's settings. Allow them there, then come back.`                                                                                                                                                                                                 |
| Concedido sin suscripción aquí                          | `Notifications are off on this browser.` / `[Turn on]` (suscribe sin volver a pedir el permiso)                                                                                                                                                                                                            |
| Encendido                                               | el dibujo de arriba                                                                                                                                                                                                                                                                                        |
| Fallo al suscribir                                      | `Couldn't turn on notifications. Try again in a minute.`                                                                                                                                                                                                                                                   |

**El iPhone** (DD-04): el dueño, el 23 de noviembre, «si detecta que es un iPhone, que permita pero explique cómo hacerlo» (`00-encargo.md` l. 373 a 376), y ese mismo día, preguntado por el manifiesto, «ok» (§9.5, punto 2): **un manifiesto mínimo, como el de `twilightstruggle`, solo para que el iPhone reciba avisos desde iOS 16.4 con la web en la pantalla de inicio**. Es lo que hace `twilightstruggle`: `iosHint` (`ai/ui/src/online/push.ts` l. 229 a 231) dice iOS 16.4 porque `/play` enlaza un manifiesto (`<link rel="manifest" href="/play/manifest.webmanifest">`, `ai/ui/online/index.html` l. 11; `PLAY_MANIFEST`, `ai/src/app.ts` l. 71 a 85, servido en l. 243 con `application/manifest+json`). Sin manifiesto, lo añadido a la pantalla de inicio solo se abre como app en iOS 26 o más (mapa 02 §6, puntos 1 y 2), y esa era la opción del borrador que el dueño no eligió. El manifiesto y su frontera con D-00p están en §13.5 (13-g). Que el aviso llegue en un iPhone de verdad **no está comprobado en un aparato**: es la prueba del dueño (§19.3; H-09). Abierta desde la pantalla de inicio, la página es la normal. Nada fuera de `Notifications` y del `See how` de §13.3: ni `InstallHint` ni un aviso en la portada (I-21, en lo que el dueño no cambió; O-08). Lo que el iPhone no recibe lo tiene en la web: `Ready to watch`, el aviso del plan de la portada, `/me/contract` y `Welcome back`.

**Un aparato compartido** (D-49; I-25; O-19): `Sign out` borra antes el `push_target` de ese navegador (`DELETE /api/me/push-targets/:id` con `cs.pushTargetId`, §6.5); cerrar una sesión desde `Devices` borra los suyos; la caducidad de la sesión no los borra (la columna pasa a nula), porque el ausente que no entra es quien necesita `away_warning`. Si en ese navegador entra otra cuenta y enciende los avisos, la suscripción pasa a la cuenta nueva (§13.6).

### 13.5 `sw.js` y la frontera con D-00p

`apps/web/public/sw.js`, JavaScript plano sin importaciones, registrado con ámbito `/` solo al pulsar `Turn on` (`noticeAsk`, `apps/web/src/notifications/push.ts`). Tres oyentes y nada más (D-45):

- `push`: lee el JSON `NoticePayload` y llama a `showNotification(title, { body, tag, renotify: true, data: { path, kind }, actions })`, con `actions = [{ action: 'off', title: 'Turn off these' }]` si `off` y `Notification.maxActions > 0`. Sin icono propio: D-00p quitó los iconos y el navegador pone el suyo (13-h). Siempre pinta: no deja fuera un aviso por haber una pestaña visible, como sí hace `twilightstruggle` (`sw.js` l. 30 a 31), porque un push recibido y no pintado hace que Chrome pinte uno genérico y aquí ningún aviso es de algo que se esté mirando en ese instante (13-i).
- `notificationclick`: con `action === 'off'`, `fetch('/api/me/notices/<kind>/off', { method: 'POST', credentials: 'same-origin' })` y cierra. Si no, construye `new URL(path, self.location.origin)`; si su origen no es el propio, usa `/` (I-02: una clave VAPID filtrada no lleva al jugador a otra web); sin acciones, añade `?from=notice&kind=`; enfoca una ventana del propio origen ya abierta en esa ruta, navega otra del propio origen, o abre una nueva (como `sw.js` de `twilightstruggle`, l. 54 a 71).
- `pushsubscriptionchange`: vuelve a suscribir con la misma `applicationServerKey` y manda `POST /api/me/push-targets`; si la sesión ya no vale (401), se pierde y la fila vieja muere por 404 o 410 (§13.6).

Más `install` con `skipWaiting` y `activate` con `clients.claim`, como `twilightstruggle` (l. 16 a 17). **Sin `fetch`, sin Cache API y sin metas de Apple**: no guarda nada y no sirve nada sin red.

**El manifiesto mínimo** (`00-encargo.md` §9.5, punto 2). `apps/web/public/manifest.webmanifest`, enlazado desde `apps/web/index.html` con `<link rel="manifest" href="/manifest.webmanifest">`, con estas claves y ninguna más:

```json
{
  "name": "Cycling Star",
  "short_name": "Cycling Star",
  "id": "/",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#123a5c",
  "theme_color": "#123a5c"
}
```

El color es el de `theme-color` de hoy (`apps/web/index.html` l. 19). **Sin `icons`**: D-00p quitó los iconos, el iPhone hace el suyo con una captura de la página, y la instalación de Chrome pide un manifiesto con nombre e icono (mapa 02 §7), así que sin iconos Chrome no ofrece instalar; esto último no lo he comprobado en un Android de verdad y va a la prueba del dueño (§19.3). Lo sirve `@fastify/static` desde `public/` como el favicon; si su tipo sale `application/manifest+json`, no lo sé, y el test lo fija. La CSP no cambia: `default-src 'self'` cubre `manifest-src` (`app.ts` l. 178). Lo que D-00p quitó sigue quitado: ni funcionar sin red, ni caché, ni ofrecer instalar (ningún `beforeinstallprompt`, ningún `InstallHint`, ningún botón). `sw.test.ts` lo fija: ni `addEventListener('fetch'`, ni `caches`, ni `importScripts` en `sw.js`; `index.html` con un solo `rel="manifest"` y sin `apple-mobile-web-app-capable`; el manifiesto con exactamente esas ocho claves y sin `icons`. Cabe en la CSP de hoy sin cambios (`app.ts` l. 175 a 195; medido en Chromium, mapa 02 §7) y el servidor de estáticos ya lo sirve como `application/javascript` con `max-age=0` (`app.ts` l. 131 a 134). D-00p (`docs/visual.md` l. 2736) quitó la web instalable y su cáscara sin red; esto no es ninguna de las dos: un service worker que solo recibe avisos y un manifiesto que solo sirve para que el iPhone abra la web como app y así reciba avisos. La frase de `visual.md` l. 3656 («ni service worker») se corrige como frontera en `docs/cuenta.md` y se le pasa a W5 (§20.3).

### 13.6 El envío: `web-push`, VAPID, la SSRF y las suscripciones muertas

- **`web-push` 4.0.0** (ESM, sin tipos; `apps/api/src/push/web-push.d.ts` declara lo que se usa: `sendNotification`, `RequestOptions`, `PushSubscription`, `WebPushError` con `statusCode`; mapa 02 §8). `pnpm audit` de 4.0.0: sin avisos (medido por el mapa 02).
- **VAPID**: `VAPID_PUBLIC_KEY` (87 caracteres), `VAPID_PRIVATE_KEY` (43) y `VAPID_SUBJECT=https://www.cyclingstar.app`, en `loadEnv` y en `loadTickEnv` (D-46; D-47). **Apagado sin claves**, como `twilightstruggle` (`push.ts` l. 18 a 19): sin las tres no se envía nada, `GET /api/me/notices` dice `enabled: false` y nadie se suscribe. Cambiar la clave rompe todas las suscripciones (mapa 02 §7): se genera una vez (PR 17) y no se rota sin decirlo en `docs/ops.md`.
- **`isAllowedPushEndpoint(url)`** (`apps/api/src/push/endpoint.ts`; I-01; X-12; O-12): `web-push` abre TLS al host y puerto de la URL sea cual sea el esquema, y sus errores son un oráculo de puertos de la red privada de Railway (seguridad C2). Se acepta solo con `https:`, puerto vacío o `443`, sin usuario ni contraseña, como mucho 1.024 caracteres y con el host igual a uno de `PUSH_ALLOWED_HOSTS` o acabado en `.` y uno de ellos. La lista es la de `twilightstruggle` (`PUSH_HOSTS`, `ai/src/pvp/push.ts` l. 354 a 361): `googleapis.com`, `google.com`, `push.services.mozilla.com`, `notify.windows.com`, `push.apple.com` (13-j). Las claves, como allí (`validSubscription`, l. 364 a 375): `p256dh` y `auth` en base64url, de 200 y 100 caracteres como mucho. Se valida al guardar y otra vez al enviar, por las filas viejas.
- **El `Deliverer`** (`apps/api/src/push/deliver.ts`; D-50):

```ts
export type PushChannel = 'webpush' | 'fcm' | 'apns'
export type DeliveryResult = 'ok' | 'gone' | 'retry'
export interface DeliveryOptions {
  readonly ttlS: number
  readonly urgency: 'normal' | 'high'
  /** SHA-256 del `tag` en base64url, 32 caracteres. */
  readonly topic: string
}
export interface PushTargetRow {
  readonly id: string
  readonly channel: PushChannel
  readonly credential: unknown // se valida con el esquema de su canal antes de usarla
}
export interface Deliverer {
  readonly channel: PushChannel
  send(
    target: PushTargetRow,
    payload: NoticePayload,
    opts: DeliveryOptions,
  ): Promise<DeliveryResult>
}
```

`webPushDeliverer` llama a `sendNotification` con `timeout` de `PUSH_SEND_TIMEOUT_MS` (15.000, el de `twilightstruggle`, l. 165): 2xx es `ok`; 404 o 410 es `gone` (RFC 8030 §7.3); un endpoint que `isAllowedPushEndpoint` ya no acepta es `gone`; cualquier otro error es `retry` y se registra con el host y el estado, sin el endpoint ni el cuerpo. Con `ok`, `last_ok_at = now()` y `failures = 0`; con `gone`, la fila se borra; con `retry`, `failures + 1`, y al llegar a `PUSH_DEAD_AFTER_FAILS` (3) seguidos se borra. Ningún error vuelve al navegador y no hay aviso de prueba que salga de la API (I-01), a diferencia de `POST /push/test` de `twilightstruggle` (l. 393): sería un envío a voluntad del cliente.

- **`POST /api/me/push-targets`**: guarda por `endpoint_hash` (SHA-256 del endpoint o del token); si ya existe, la fila pasa a esta cuenta y a esta sesión. `PUSH_TARGETS_PER_USER` (10): el undécimo sustituye al de `last_ok_at` (o `created_at`) más viejo, como `MAX_DEVICES` de `twilightstruggle` (l. 54). El cuerpo:

```ts
// apps/api/src/routes/me.ts
const b64url = z.string().regex(/^[A-Za-z0-9_-]+=*$/)
const timeZone = z
  .string()
  .max(64)
  .refine((tz) => tz === 'UTC' || Intl.supportedValuesOf('timeZone').includes(tz))
export const pushTargetBodySchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('webpush'),
    endpoint: z.string().max(1024).refine(isAllowedPushEndpoint),
    keys: z.object({ p256dh: b64url.max(200), auth: b64url.max(100) }),
    timeZone,
  }),
  z.object({ channel: z.literal('fcm'), token: z.string().min(1).max(4096), timeZone }),
  z.object({
    channel: z.literal('apns'),
    token: z.string().regex(/^[0-9a-f]{64,200}$/),
    environment: z.enum(['production', 'sandbox']),
    timeZone,
  }),
])
// 200 { ok: true, id }; 400 VALIDATION_ERROR; 400 canal_no_disponible para fcm y apns hasta que haya app.
```

`GET /api/me/notices` responde `{ ok: true, enabled, publicKey, prefs, timeZone, targets: [{ id, label, createdAt, lastOkAt, current }] }`; `PUT /api/me/notices` recibe `Partial<Record<NoticeKind, boolean>>` solo con claves apagables. Las cuatro rutas de avisos quedan fuera de la puerta de la fecha (D-09).

### 13.7 El emisor y `notice_log`

**Los avisos de juego los manda el barrido** (D-47; X-04; O-11): `noticeSweep(db, now, deliver)` (`packages/db/src/notices.ts`) se llama al final de cada pasada de `apps/api/src/tick/main.ts` (el cron de cada 5 minutos, procese o no días; `main.ts` l. 9 a 20) y después de cada `runTick` de `web` (`apps/api/src/index.ts` l. 48, 56 y 90). Con `AUTO_TICK` encendido, que es el defecto (`env.ts` l. 84), los días los procesa `web` y el cron sale con cero días; el barrido no depende de quién los procese. Solo corre si están las tres variables VAPID. En el proceso `tick` se espera a que acabe antes de salir; en `web` va en segundo plano.

Por cada usuario con al menos un `push_target`: si está ausente (`isAway`, §14.4), solo los `whileAway`; si es hora de silencio, ninguno `quiet`; por cada aviso encendido cuyo disparador se cumple, calcula su `ref` (`stage_digest`: la fecha local; `stage_ready`: `<raceKey>:<stageDay>`; `plan_ending`: el id del plan; `offer_received`: la fecha local; `away_warning`: `<inactiveSince>:<20|27>`; `away_over`: `away_since`), comprueba el tope y hace `INSERT INTO notice_log (user_id, kind, ref) … ON CONFLICT DO NOTHING RETURNING`: **solo si la fila es nueva se envía**, a todos sus `push_targets`. Dos procesos a la vez no duplican porque la fila se escribe antes de enviar (`unique (user_id, kind, ref)`).

**Los de seguridad no esperan al barrido** (13-k): los dispara el proxy de auth al ver el 200 y salen en segundo plano por `mailQueue.track` (§5.6), que no es solo del correo y que el cierre ordenado espera, como `later` de `twilightstruggle` (`push.ts` l. 105 a 116):

- `password_changed` al recuperar: `DELETE FROM push_targets WHERE user_id = $1 RETURNING …` y se envía con esa copia en memoria (§5.4, 5-d): quien recupera no hereda las suscripciones de un intruso. Al cambiar la contraseña: las filas de las otras sesiones se leen antes de reenviar a `better-auth` y, con el 200, se borran y reciben el aviso; las de sesión nula (sesión caducada) lo reciben y se quedan; la de este navegador no lo recibe (13-l).
- `new_sign_in`: a todas las filas de la cuenta, con `ref` la hora UTC (`2026-11-23T18`), que hace de tope de una por hora en el mismo `INSERT … ON CONFLICT`.

`notice_log` se purga a los `NOTICE_LOG_RETENTION_DAYS` (90) días (§15.4): ninguna `ref` vive tanto (un plan, 28 días de juego; una ausencia, 28 reales).

### 13.8 Ningún aviso destripa

La regla de E2 (`docs/retransmision.md` §11.9, l. 7280 a 7282; D-42; D-48): el disparador no mira el resultado, ninguna palabra depende de lo que pasó y el canario renderiza el aviso. `stage_digest` y `stage_ready` salen de `stageReadyNotice` (`packages/shared/src/broadcast/pageTitle.ts` l. 71 a 83) y de contar etapas veladas, que no depende del resultado; `path` y `tag` salen del `raceId` de fuera, porque `PreStageInfo` no lo lleva (mapa 02 §10). Los demás usan el nombre del corredor, cifras de ofertas y fechas. El canario (`spoilerCanary.test.ts` l. 206) pasa de `stageReadyEmail` a `noticePayload` (X-18), y el PR 14 borra `stageReadyEmail` (`emails.ts` l. 153 a 170) con sus tres tests (`emails.test.ts` l. 81 a 121), en el mismo PR que mueve el canario para que no quede un momento sin él. El comentario que la nombra en `pageTitle.ts` l. 5 es de W5 (H-16): el PR 14 no toca `packages/shared/src/broadcast/` y la corrección va por escrito (§20.3).

### 13.9 El contrato para la app

La app no tiene tecnología ni fecha (D-00d). Lo que la deja enchufar sin rehacer nada (mapa 02 §9): `push_targets.channel` y `credential jsonb` (Web Push guarda `endpoint` y claves; FCM, un token; APNs, un token y su entorno); un `Deliverer` por canal y fichero (`fcmDeliverer`, `apnsDeliverer` el día que existan, con FCM HTTP v1 y una cuenta de servicio, y APNs con la membresía de pago de Apple, mapa 02 §9); la carga `NoticePayload` con `path` de la web, que la app traduce a su ruta; y `POST /api/me/push-targets` con el cuerpo discriminado de §13.6, que hoy responde 400 `canal_no_disponible` a `fcm` y `apns`. El catálogo, las preferencias, el tope, el silencio y `notice_log` no cambian con la app: un aviso es uno por usuario, llegue por los canales que llegue.

---

**Injertos aplicados.** I-01 (§13.6), I-02 (§13.5), I-18 (§13.1, al revés por el dueño: tres avisos de seguridad y ningún correo de seguridad, como §3), I-21 (§13.4: lo que el dueño no cambió, nada fuera de `Notifications`; el «sin instrucción» lo sustituyó el dueño por la explicación), I-25 (§13.4 y §13.7), I-29 (§13.1).

**Objeciones resueltas.** O-05 (§13.2: `time_zone` del navegador y nombrada en Privacy), O-06 (§13.2: el silencio va a §21.4), O-08 (§13.4: la explicación existe por decisión del dueño y dice iOS 16.4, con el manifiesto mínimo que el dueño aceptó el 23 de noviembre), O-11 (§13.7), O-12 (§13.6), O-19 (§13.4 y §13.5).

**Huecos rellenados.** H-09 (§13.4, escrito como no comprobado y llevado a la prueba del dueño, §19.3), H-16 (§13.8).

**Contradicciones.** X-04 (§13.7), X-12 (§13.6), X-18 (§13.8).

**Decisiones de esta sección.**

- **13-a**, tres avisos de seguridad, `password_changed`, `new_sign_in` y `email_changed`, sin interruptor, fuera del tope y del silencio y también durante la ausencia (propuesta de §5 y §7, por `00-encargo.md` §9.2, punto 9, y §9.3; `email_changed` por §5.5). Manda sobre D-42 («ninguno de seguridad») y sobre D-53 («callados salvo `away_over`»), §22.5.
- **13-b**, `password_changed` lleva a `/forgot-password` y no a `/account/devices`.
- **13-c**, `stage_digest` cuenta solo las etapas veladas desde el último resumen.
- **13-d**, un aviso que no cabe en el tope se apunta en `notice_log` y no sale nunca.
- **13-e**, `Topic` es el SHA-256 del `tag` en base64url, cortado a 32.
- **13-f**, `Turn on` al seguir una carrera enciende también `stage_ready`.
- **13-g**, un manifiesto mínimo sin iconos, como el de `twilightstruggle`, por el dueño (`00-encargo.md` §9.5, punto 2): la explicación del iPhone dice iOS 16.4 o más. Sin metas de Apple, sin caché, sin funcionar sin red y sin ofrecer instalar: lo demás de D-00p sigue en pie.
- **13-h**, el aviso sin icono propio.
- **13-i**, el service worker pinta siempre; sin comprobación de pestaña visible.
- **13-j**, `PUSH_ALLOWED_HOSTS` pasa a la lista de sufijos de `twilightstruggle` (incluye `google.com`, que según su comentario usan los Chrome nuevos; no lo he comprobado). Manda sobre la lista exacta que proponía el glosario de la síntesis y sobre I-01.
- **13-k**, los avisos de seguridad salen del proxy al ver el 200, en segundo plano por `mailQueue.track`, sin esperar al barrido; `email_changed` sale de la ruta del panel, antes de cambiar el correo.
- **13-l**, al cambiar la contraseña reciben el aviso las suscripciones de las otras sesiones (que se borran) y las de sesión nula (que se quedan); la del propio navegador, no.

## 14. El modo ausencia y la regla del mes

Con cuatro días de juego por día real, una semana fuera son 28 días de juego, y hoy nada distingue al que está de vacaciones del que se fue: el tick entrena, corre y cobra igual (mapa 03 §7) y no hay forma de decir «vuelvo el 3» (`00-encargo.md` §2.3, punto 4). El dueño aceptó la frontera el 19 de noviembre: el jugador lo declara con una fecha de vuelta, mientras dura decide el entrenador, se callan los avisos y no corre la regla del mes; lo que el mundo haga con una ausencia larga es de E7 (D-00e; «Ok», `00-encargo.md` l. 317 a 318 y 349 a 351). El 23 fijó el máximo: «ok 28 días reales» (l. 377).

### 14.1 `Away` (pantalla, 360 px; DD-05 A)

`AccountAway`, en `/account/away`, enlazada desde la fila `Away` de `Account` (§12.1) y desde `Welcome back`. Estado sin ausencia, para un corredor con contrato y plan vivo:

```
‹ Account
Away
Going on holiday? Tell us when you'll be back.

[ 1 week | 2 weeks | 4 weeks ]                       (Segmented, AWAY_SHORTCUT_DAYS)
Back on   [Day] [Month] [Year]                       (DateField)

While you're away
· Your plan runs until 25 Nov. After that your coach picks Luca Bianchi's training.
· Luca Bianchi races when his team picks him, with automatic orders.
· Contract offers expire after about 5 days. You can still answer them if you drop by.
· Notifications stay quiet, except a changed password or a new sign-in.
· Emails to reset your password still arrive.

[ Set away until 3 Dec ]
```

Las líneas se calculan en el servidor, sin tocar el motor, con lo que hay ese día (D-52), y cada una tiene su fuente:

| Línea (pantalla)                                                                            | Cuándo                               | De dónde                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Your plan runs until 25 Nov. After that your coach picks <rider>'s training.`              | plan vivo                            | el plan vale 28 días de juego desde `start_day` (`train.ts` l. 135 a 138); el día real es hoy más los días de juego que faltan entre 4 (estimado: el reloj real depende de `TICK_INTERVAL_MINUTES`) |
| `Your coach picks <rider>'s training while you're away.`                                    | sin plan vivo, en cualquier modo     | `trainingDay.ts` l. 117 a 136, con el cambio de §14.2 para `manual`                                                                                                                                 |
| `<rider> races when his team picks him, with automatic orders.`                             | con contrato                         | `calendarRun.ts` l. 538 a 545; órdenes automáticas, `stageRun.ts` l. 413 a 443 (mapa 03 §7)                                                                                                         |
| `As a free agent, <rider> only races your national championship and the races you entered.` | agente libre                         | `calendarRun.ts` l. 705 a 735 y 257 a 261                                                                                                                                                           |
| `Contract offers expire after about 5 days. You can still answer them if you drop by.`      | agente libre o contrato que vence    | `OFFER_TTL_DAYS` 21 de juego, 5,25 reales (`contracts.ts` l. 37; X-20)                                                                                                                              |
| `Your team keeps its natural calendar. Nobody signs riders or changes plans for you.`       | mánager de un equipo                 | `teamPlan.ts` l. 65 a 79 (mapa 03 §7)                                                                                                                                                               |
| `Notifications stay quiet, except a changed password or a new sign-in.`                     | siempre                              | §13.1 y 13-a                                                                                                                                                                                        |
| `Emails to reset your password still arrive.`                                               | siempre                              | §9; los dos correos no son de juego                                                                                                                                                                 |
| `The 30-day rule is paused: your coach won't take over for being away.`                     | solo con la regla de E7 viva (PR 15) | §14.4                                                                                                                                                                                               |

La línea de jugador §9.1 («You won't be able to answer them while away») era falsa: entrar no termina la ausencia y se puede contestar una oferta (14-a). Elegir un atajo rellena `Back on` con hoy más 7, 14 o 28 días; tocar la fecha deselecciona el atajo. Errores (pantalla), en el `DateField`: `Pick a later date.` (menos de `AWAY_MIN_HOURS`, 12) y `Up to 28 days. For longer, come back once and set it again.` (más de `AWAY_MAX_DAYS`, 28). Los atajos son **[sin evidencia]**: 7, 14 y 28 los propuso la síntesis por la semana, la quincena y el máximo.

Con la ausencia viva, la página cambia:

```
‹ Account
Away
You're away until 3 Dec.
Notifications stay quiet until then, except a changed password or a new sign-in.
[ Change date ]   [ End now ]
```

`Change date` vuelve al formulario con la fecha puesta; un `PUT` con otra fecha la sustituye y el máximo se cuenta desde ahora. Quien quiera más de 28 días tiene que volver y declararla otra vez, como dice el error: esa visita es lo que el dueño llama «entrar» (§14.4).

**La API**: `PUT /api/me/away` con `{ until }` (instante ISO con su desfase; la web manda las 00:00 locales del día elegido, así que la ausencia acaba a medianoche del jugador) y `DELETE /api/me/away`. `GET /api/me/away` da `{ ok: true, awaySince, awayUntil }` para `Away` y `AwayBand` (14-b).

```ts
// apps/api/src/routes/me.ts
export const awayBodySchema = z.object({ until: z.string().datetime({ offset: true }) })
// PUT: 400 VALIDATION_ERROR; 400 fecha_fuera_de_rango con { min, max } si until < now + AWAY_MIN_HOURS
// o until > now + AWAY_MAX_DAYS; 200 { ok: true, awaySince, awayUntil }. Si no había ausencia viva,
// away_since = now(); si la había, away_since se queda. DELETE: away_until = now() (away_since se queda,
// para Welcome back); 200 { ok: true }. 403 BIRTH_DATE_REQUIRED sin fecha (D-09). Sin ausencia viva, DELETE da 200.
```

### 14.2 Lo que cambia y lo que no mientras dura

| Cambia                                                                                                                                                  | No cambia                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Ningún aviso salvo `away_over` y los tres de seguridad (§13.1, 13-a)                                                                                    | Los dos correos de cuenta                                                                                  |
| La regla del mes no corre: E7 lee `inactiveSince` (§14.4)                                                                                               | El tick: entrena, corre con órdenes automáticas, cobra, envejece (mapa 03 §7, medido con 28 días de juego) |
| En `training_mode = 'manual'`, el día sin orden ni bloque se resuelve como `mixto`: plan de equipo si lo hay y, si no, el entrenador (I-16; X-05; O-02) | Se puede entrar y jugar; **entrar no termina la ausencia**                                                 |
| `AwayBand` bajo la cabecera en toda pantalla con sesión                                                                                                 | La sesión: 30 días renovables bastan para 28 de ausencia; no se alarga (D-17; O-06)                        |

**El cambio de `manual`**, sin subir `ENGINE_VERSION` (91, `packages/engine/src/constants.ts` l. 853): hoy, en `manual`, el hueco es `descanso_activo` (`packages/shared/src/trainingDay.ts` l. 132 a 135), y «mientras dura decide el entrenador» no se cumpliría. `TrainingDayContext` gana `ownerAway: boolean`, y la primera línea de `resolveTrainingDay` (l. 94) usa `const mode = ctx.mode === 'manual' && ctx.ownerAway ? 'mixto' : ctx.mode` en lugar de `ctx.mode`. `trainingDayContext` (`packages/db/src/train.ts` l. 183 a 201) lo rellena con `isAway` del dueño del corredor, leído en el mismo lote que los corredores (una unión más con `users` por día de juego, estimado despreciable). Es una regla del mundo y no del motor: el motor no ve `training_mode` (14-c). `trainingDayAway.test.ts` lo fija: el mismo corredor en `manual`, sin orden, da `descanso_activo` sin ausencia y la sesión del entrenador con ella; en `mixto` y `entrenador`, lo mismo con y sin ausencia.

Entrar no la termina porque quien abre la web en la playa para ver una etapa no quiere que se le enciendan los avisos. No hay tope de entradas ni de días jugados durante la ausencia.

### 14.3 Volver

- **A la fecha**: `away_until` llega y la ausencia acaba sola; nadie escribe nada. El barrido manda `away_over` (§13.7) al primer paso fuera del silencio (a las 00:00 locales cae en él, así que sale a las 8). `Welcome back` espera en la portada (§14.5).
- **`End now`**: `DELETE /api/me/away`. Desde `AwayBand` o desde `Away`, sin confirmación: se deshace declarándola otra vez. Al terminar, `Notice` `good`: `Welcome back. Your notifications are on again.` (pantalla).
- **`AwayBand`** (`apps/web/src/components/AwayBand.tsx`, DD-05 A): un `Notice` `info` bajo la cabecera, en toda pantalla con sesión mientras `awayUntil > now`, con `You're away until 3 Dec` / `End now` (pantalla). Lo pinta `Layout` con `GET /api/me/away`, pedido una vez por carga con la sesión. No se cierra: es la única señal de que los avisos están callados.

### 14.4 `inactiveSince`, la visita y los relojes de E7

```ts
// packages/db/src/inactivity.ts
/** El contrato con E7: desde cuándo cuenta la inactividad. Nula si no hay ni visita ni ausencia. */
export function inactiveSince(lastSeenAt: Date | null, awayUntil: Date | null): Date | null {
  if (lastSeenAt === null) return awayUntil
  if (awayUntil === null) return lastSeenAt
  return lastSeenAt > awayUntil ? lastSeenAt : awayUntil
}
export function isAway(user: { awayUntil: Date | null }, now: Date): boolean {
  return user.awayUntil !== null && user.awayUntil > now
}
```

Con una ausencia viva, `inactiveSince` está en el futuro y ningún reloj corre; al volver, cuenta desde `away_until`: **la ausencia congela, no rellena** (D-54; I-19). `inactivity.test.ts` fija sus cuatro casos (las dos nulas, una de cada, las dos con cada orden). «Login» en la regla del dueño es una visita: toda petición con sesión que pasa por `get-session` escribe `last_seen_at` como mucho una vez por hora (D-40; §10.6). Vale para cualquier reloj de inactividad, también el más corto del mánager (`agenda.md` §4.15.5, punto 4; H-15); cuánto mide cada uno es de E7. `users.last_seen_at` existe desde la 0048 (`schema.ts` l. 121 a 125) y tiene historial desde que E2 entró en producción.

### 14.5 `Welcome back` y la regla del mes en la web

`WelcomeBack` es un `Notice` `info` que se cierra, en `Home`, encima de `While you were away` de E2, sin duplicarlo (D-55):

```
Welcome back                                                                     (pantalla)
You were away 12 days (48 game days). Luca Bianchi trained on 41 of them and raced 3 stages.
2 contract offers expired. 1 is still open: answer by 29 Nov.
[ See your rider ]                                                       [ × ]
```

- **Cuándo**: tras una ausencia declarada que ha terminado, o tras `RETURN_NOTICE_AFTER_DAYS` (7) días reales o más sin visita. El problema: la visita de hoy pisa `last_seen_at` antes de que la portada pregunte. Por eso `touchLastSeen` (`horizon.ts` l. 585) escribe en el mismo `UPDATE` la columna nueva `users.welcome_back_from` con el `last_seen_at` viejo si este tiene más de 7 días, y terminar una ausencia (a la fecha, leído por el barrido, o con `End now`) la pone a `away_since` (14-d). `GET /api/me/welcome-back` la lee y cuenta; cerrar el `Notice` llama a `DELETE /api/me/welcome-back`, que la pone a nula.
- **Las cifras** salen de `rider_daily_log.activity` y de `offers` con su estado `expirada` desde `welcome_back_from` (`riderDailyLog`, `schema.ts` l. 1245; `offers`, l. 1129, con el estado `expirada` de l. 1095); quién decidió cada día no se guarda, así que no se dice. Sin corredor, solo `You were away 12 days.` Sin ofertas, sin la segunda línea. Con una sola oferta abierta: `1 is still open: answer by 29 Nov.`; con varias, `3 are still open. The first expires on 29 Nov.`
- **La regla del mes en la web**, para quien no tiene avisos (el iPhone fuera de la pantalla de inicio, quien dijo que no; D-00c, punto 5 de §9.1.3): en `Away`, la línea de §14.1; en `Away` sin ausencia, también `If you don't visit for 30 days, your coach takes over <rider>. Set an away date to pause this.`; y en `Welcome back`, si la visita anterior fue hace `MONTH_RULE_HINT_AFTER_DAYS` (14) días o más, `Next time, set an away date: after 30 days without a visit your coach takes over.` (pantalla). Las tres, solo con la regla de E7 viva (PR 15), y la cifra de 30 la pone E7.

### 14.6 La frontera con E7 y E9, y el silencio total

**E4 da**: `users.away_since` y `away_until`, la pantalla, el silencio de los avisos, `manual` como `mixto` mientras dura, `inactiveSince` e `isAway`, `away_warning` y las frases de la regla. **E7 decide**: la regla del mes (el plazo, qué es «pasar a bot», el contrato, la silla del mánager, G8) y qué hace el mundo con una ausencia larga o encadenada (D-54). **E9 decide** si una ausencia se ve desde fuera, porque es quien enseña a las personas entre sí (O-07); E4 no la enseña a nadie más que al propio jugador.

**El silencio total, escrito para el dueño y para E7** (H-14): quien no aceptó los avisos (o tiene un iPhone en una pestaña) y no vuelve no recibe **nada** antes de que actúe la regla del mes, porque el aviso por correo de `agenda.md` §4.15.5, punto 3, ya no existe (D-00c). Lo que se le enseña está en la web y solo lo ve quien vuelve. Es la consecuencia directa de «No, como mucho notificadores de browser y app» (`00-encargo.md` l. 313 a 315), y E7 tiene que pesarla al fijar el plazo y qué pasa al que vuelve el día 31 (§21.4).

---

**Injertos aplicados.** I-16 (§14.2), I-19 (§14.4).

**Objeciones resueltas.** O-02 (§14.2: `manual` como `mixto` y la línea de §14.1 verdadera para todos), O-07 (§14.6: E9), O-23 (§14.1: 28 días, por el dueño).

**Huecos rellenados.** H-14 (§14.6), H-15 (§14.4).

**Contradicciones.** X-05 (§14.2), X-20 (§14.1).

**Decisiones de esta sección.**

- **14-a**, la línea de las ofertas dice que se pueden contestar entrando; la de la base decía lo contrario.
- **14-b**, nueva `GET /api/me/away` para `Away` y `AwayBand`.
- **14-c**, `ownerAway` en `TrainingDayContext`, rellenado en `train.ts`; el motor no cambia.
- **14-d**, columna nueva `users.welcome_back_from` (en la 0056, §15) y rutas `GET` y `DELETE /api/me/welcome-back`: sin ella la visita de hoy borra la de antes y `Welcome back` no sabe cuánto faltó el jugador.
- **14-e**, `PUT /api/me/away` con ausencia viva cambia la fecha, cuenta el máximo desde ahora y conserva `away_since`; `DELETE` conserva `away_since`.
- **14-f**, los avisos de seguridad salen durante la ausencia (13-a); la línea `Notifications stay quiet` lo dice.

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

## 16. Constantes

La única tabla entera de constantes del documento. Las compartidas por la API y la web viven en `packages/shared/src/account/constants.ts` y `notices.ts`; las de límites, en `apps/api/src/security.ts`; las de la purga, en `packages/db/src/purge.ts` (D-02). Cada una con su valor, su intención y la decisión que la fija. Medida o estimada: casi ninguna se ha medido, y la columna «Por qué» dice de dónde sale cada cifra.

### 16.1 La tabla

**Edad, condiciones y sesiones** (`packages/shared/src/account/constants.ts`)

| Constante                | Valor                                          | Por qué                                                                                                                               | Decisión   |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `MIN_AGE_YEARS`          | 16                                             | el dueño, «Ok» (`00-encargo.md` l. 309 a 310); a confirmar con un abogado                                                             | D-00a      |
| `MIN_BIRTH_YEAR`         | 1900                                           | una fecha anterior es un error de teclado                                                                                             | D-06       |
| `UserStatus`             | `'pending' \| 'approved'`, defecto `'pending'` | el registro por aprobación, como `twilightstruggle` (`00-encargo.md` §9.5, punto 1)                                                   | §4.9; 4-i  |
| `TERMS_VERSION`          | `'2026-11-draft'`                              | volver a pedir la aceptación cuando cambie el texto                                                                                   | D-10       |
| `SESSION_EXPIRES_S`      | 2.592.000 (30 días)                            | volver de dos semanas fuera sin teclear la contraseña; cabe la ausencia máxima de 28 días                                             | D-17       |
| `SESSION_UPDATE_AGE_S`   | 86.400                                         | renovar una vez al día de uso, no en cada petición                                                                                    | D-17       |
| `SESSION_MAX_AGE_DAYS`   | 90                                             | una cookie robada no vive más de un trimestre aunque se use                                                                           | D-17; I-11 |
| `EMAIL_JWT_TTL_S`        | 86.400                                         | el enlace de confirmar se lee mañana                                                                                                  | D-11       |
| `RESET_TOKEN_TTL_S`      | 3.600                                          | la recuperación es corta; el token ya no pasa por logs ni por la URL                                                                  | D-11       |
| `LEGACY_LINK_GRACE_DAYS` | 7                                              | plazo para quitar el código de los enlaces viejos (5-f); el PR 19                                                                     | D-12       |
| `RESEND_COOLDOWN_S`      | 60                                             | la espera visible de `Send another link` (`ForgotPassword`) y `Send me a new link` (`VerifyEmail`); `CheckInbox` ya no reenvía (§4.9) | §5.3, §5.4 |
| `EXPORTS_PER_DAY`        | 3                                              | una exportación es una consulta grande; tres bastan a quien la quiere                                                                 | D-39       |

**Límites** (`apps/api/src/security.ts`, salvo `MAIL_DAILY_BUDGET`, que es variable de entorno en `apps/api/src/env.ts`)

| Constante                         | Valor                                  | Por qué                                                                                                                        | Decisión       |
| --------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `ACCOUNT_FAILS` (L1)              | 10 en 900 s; cierre de 900 s           | frena el relleno repartido entre IP (40 fallos y la buena entraba, mapa 01 §4.2); sin tope diario                              | D-24           |
| `DEVICE_FAILS` (L2)               | 10 en 900 s; 30 en 86.400 s            | el aparato conocido también tiene techo                                                                                        | D-24           |
| `SESSION_PASSWORD_FAILS` (L3)     | 5 en 900 s; 10 en 86.400 s, por sesión | con sesión robada no se prueba la contraseña a ciegas; al décimo se cierra esa sesión, y las otras del dueño siguen            | D-24; 7-k      |
| `ACCOUNT_PASSWORD_FAILS_DAY` (L3) | 30 en 86.400 s, por cuenta             | techo para quien reparte intentos entre sesiones                                                                               | 7-k            |
| `MAIL_ROUTES_PER_IP_DAY` (L4)     | 20                                     | las rutas que mandan correo, por IP                                                                                            | D-24           |
| `MAIL_PER_RECIPIENT_HOUR` (L5)    | 3                                      | un buzón ajeno no se inunda                                                                                                    | D-24           |
| `MAIL_DAILY_BUDGET` (L6)          | 90                                     | el plan gratuito de Resend da 100 al día y 3.000 al mes; 90 × 31 = 2.790 (calculado; DD-10 B)                                  | D-26; 7-f      |
| `MAIL_RESET_RESERVE`              | 30                                     | `verify_signup` para a los 60 del día; `reset_password` sigue hasta 90; cada destinatario la gasta una vez al día UTC (`rsv:`) | D-26; 7-f; 7-m |
| `DEVICE_COOKIE_DAYS`              | 180                                    | vida de `cs_device`; sobrevive a `Sign out`                                                                                    | D-23           |
| `DEVICE_COOKIE_MAX_ACCOUNTS`      | 5                                      | cuentas por navegador; la sexta saca a la más vieja (7-e)                                                                      | D-23           |
| `NEW_SIGN_IN_EVERY_H`             | 1                                      | el aviso `new_sign_in`, como mucho uno por hora y cuenta                                                                       | DD-16; 7-g     |
| `AUTH_ALLOWED_PATHS`              | las once de §8.1                       | lista blanca; `change-email` fuera                                                                                             | D-29; 8-a      |
| `CREDENTIAL_AUTH_PATHS`           | siete rutas                            | pierde `change-email` (§7.2)                                                                                                   | §7.2           |

**Correo y purga** (`apps/api/src/mailQueue.ts`; `packages/db/src/purge.ts`)

| Constante                    | Valor  | Por qué                                                                       | Decisión     |
| ---------------------------- | ------ | ----------------------------------------------------------------------------- | ------------ |
| `MAIL_SHUTDOWN_GRACE_MS`     | 10.000 | lo que `SIGTERM` espera a los correos y avisos en vuelo; **[sin evidencia]**  | D-15         |
| `AUTH_LIMITS_RETENTION_DAYS` | 2      | ninguna ventana pasa de 24 h                                                  | D-34         |
| `EMAIL_LOG_RETENTION_DAYS`   | 90     | los rebotes se miran por semanas (§19.4)                                      | D-34         |
| `NOTICE_LOG_RETENTION_DAYS`  | 90     | ninguna `ref` de aviso vive más de 28 días                                    | 15-e         |
| `PURGE_UNCONFIRMED_DAYS`     | 7      | una cuenta aprobada que no confirma en 7 días desde `approved_at` no se queda | DD-17 A; 9-g |

**Ausencia** (`packages/shared/src/account/constants.ts`)

| Constante                    | Valor         | Por qué                                                                     | Decisión |
| ---------------------------- | ------------- | --------------------------------------------------------------------------- | -------- |
| `AWAY_MAX_DAYS`              | 28            | el dueño, «ok 28 días reales» (`00-encargo.md` l. 377)                      | DD-12    |
| `AWAY_MIN_HOURS`             | 12            | menos no es una ausencia                                                    | D-52     |
| `AWAY_SHORTCUT_DAYS`         | `[7, 14, 28]` | una semana, dos y el máximo; **[sin evidencia]**                            | D-52     |
| `RETURN_NOTICE_AFTER_DAYS`   | 7             | `Welcome back` sin ausencia declarada: una semana real son 28 días de juego | D-55     |
| `MONTH_RULE_HINT_AFTER_DAYS` | 14            | la mitad del mes: quien tardó tanto lee la regla en `Welcome back`          | D-55     |

**Avisos** (`packages/shared/src/account/notices.ts`, salvo los de envío, en `apps/api/src/push/`)

| Constante                                     | Valor                                                                                                                              | Por qué                                                                                      | Decisión   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------- |
| `AWAY_WARNING_DAYS`                           | `[20, 27]`                                                                                                                         | dos avisos antes de los 30 de E7                                                             | D-42       |
| `NOTICE_DAILY_CAP`                            | 3, solo los `capped` (sin `away_warning` ni los de seguridad)                                                                      | Chrome retira el permiso a webs con muchos avisos y poca visita (mapa 02 §5)                 | D-43       |
| `NOTICE_QUIET_START_H` / `NOTICE_QUIET_END_H` | 22 / 8 locales                                                                                                                     | nada de madrugada; **[sin evidencia]**, se le enseña al dueño (§21.4)                        | D-43       |
| `STAGE_DIGEST_HOUR`                           | 19 local                                                                                                                           | una vez al día, por la tarde                                                                 | D-43       |
| `STAGE_READY_EVERY_H`                         | 6                                                                                                                                  | una carrera seguida no suena en cada etapa (hasta cuatro al día, mapa 02 §10)                | 13.1       |
| `PLAN_ENDING_GAME_DAYS`                       | 4                                                                                                                                  | un día real antes del fin del plan                                                           | 13.1       |
| `NOTICE_ASK_SNOOZE_DAYS`                      | 30                                                                                                                                 | el `Notice` del permiso cerrado no vuelve en un mes                                          | D-44       |
| `NOTICE_DEFAULTS`                             | `stage_digest`, `plan_ending`, `offer_received`, `away_warning`, `away_over` encendidos                                            | DD-02 A, «Esos avisos son pushup notification? Si es así, ok» (`00-encargo.md` l. 370 a 371) | DD-02      |
| `PUSH_TARGETS_PER_USER`                       | 10                                                                                                                                 | como `MAX_DEVICES` de `twilightstruggle` (`push.ts` l. 54); el undécimo saca al más viejo    | D-46       |
| `PUSH_DEAD_AFTER_FAILS`                       | 3                                                                                                                                  | tres fallos seguidos que no son 404 ni 410                                                   | D-46       |
| `PUSH_SEND_TIMEOUT_MS`                        | 15.000                                                                                                                             | el de `twilightstruggle` (`push.ts` l. 165)                                                  | 13.6       |
| `PUSH_ALLOWED_HOSTS`                          | `googleapis.com`, `google.com`, `push.services.mozilla.com`, `notify.windows.com`, `push.apple.com`, como host o sufijo tras punto | la lista de `twilightstruggle` (`push.ts` l. 354 a 361); cierra la SSRF                      | D-46; 13-j |
| TTL por aviso                                 | 21.600 s `stage_ready`; 43.200 s el resto                                                                                          | un aviso de etapa viejo no sirve; `web-push` pone cuatro semanas por defecto (mapa 02 §8)    | D-43       |

### 16.2 Las que no cambian

- Fastify por IP: 300 por minuto en todo, 60 por minuto en el resto de `/api/auth/*` y 10 cada 5 minutos en las de credenciales (`apps/api/src/security.ts` l. 10, 36, 43 y 54 a 68).
- Contraseña de 8 a 128 caracteres (`better-auth` por defecto; los textos, 4-e).
- `SPOILER.lastSeenEveryMin` 60: `touchLastSeen` escribe como mucho una vez por hora (`horizon.ts` l. 585).
- `OFFER_TTL_DAYS` 21 (`contracts.ts` l. 37) y el plan vivo de 28 días de juego (`train.ts` l. 135 a 138): E4 los lee, no los cambia.
- `PLAN_END_WARN_DAYS` 7 de la portada (`apps/web/src/domain/dashboard.ts` l. 67), el gemelo de `plan_ending`.
- `ENGINE_VERSION` 91 (`packages/engine/src/constants.ts` l. 853).

**Las que desaparecen** frente al glosario de las propuestas, por lo que decidió el dueño el 23 de noviembre: `HIBP_TIMEOUT_MS` (DD-11 C), `EMAIL_CHANGES_PER_DAY` y `UNDO_EMAIL_CHANGE_H` (sin cambio de correo de autoservicio, `00-encargo.md` l. 398 a 406), `SIGNUP_EXISTING_EVERY_H` y `CHANGE_TO_TAKEN_EVERY_H` (sin esos correos) y `MAIL_LOW_PRIORITY_CUTOFF` (sin correos de baja prioridad que cortar, 7-f). `MAIL_DAILY_BUDGET` pierde la cifra de 1.500 de Pro: volvería solo con DD-10 A.

---

**Injertos aplicados.** Ninguno asignado.

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.** Ninguna nueva: cada valor sale de la decisión de su fila, de L1 (`7-e`, `7-f`, `7-g`, `8-a`) o de §13 a §15.

## 17. Tests

Cada PR de §18 empieza por sus tests, rojos antes de su código. Los de la API corren contra la base real de PGlite, como `authFlow.test.ts`, salvo los de funciones puras; los de la web, con Testing Library como los de hoy. Las cifras de los de seguridad son las que midieron los jueces y los mapas, y el test las convierte en contrato. Fuera de la lista de tests de las propuestas, por lo que decidió el dueño el 23 de noviembre: `hibp.test.ts` (DD-11 C) y `emailChange.test.ts` (sin cambio de correo de autoservicio).

### 17.1 Los nuevos

**API y base de datos**

| Fichero                       | PR                           | Qué fija                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authFlow.test.ts` (ampliado) | 1, 3, 6, 8                   | el 429 de Fastify trae `message` y `retryAfterS`; recuperar cierra las dos sesiones abiertas (hoy siguen, mapa 01 §2); usar un enlace de recuperación mata a su gemelo; el de verificación abierto otra vez no abre sesión; cambiar la contraseña cierra las otras, sube `device_epoch` y reemite la `cs_device` propia; `passwordChangedAt` cambia; ningún cuerpo de las rutas de la lista blanca, tampoco el 200 de `sign-in/email`, contiene el valor de la cookie de sesión (§6.3); un pendiente con la contraseña buena recibe 403 `ACCOUNT_PENDING`                                                                                     |
| `enumTiming.test.ts`          | 3                            | con un `Mailer` de 250 ms, la mediana de 9 de cada rama (cuenta que existe y que no) de `sign-up/email` y `request-password-reset` difiere menos de 30 ms (§5.6). Medido hoy sin la opción: 5,6 frente a 255,6 ms (X-15). Y el cuerpo del 200 de `sign-up/email` es igual byte a byte para un correo nuevo y uno que existe: `{ "token": null, "user": null }` (§5.3)                                                                                                                                                                                                                                                                         |
| `mailQueue.test.ts`           | 3                            | `track` guarda la promesa y la suelta al resolverse; `drain` espera como mucho `MAIL_SHUTDOWN_GRACE_MS` y no lanza                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `clientIp.test.ts`            | 3                            | `X-Forwarded-For: 6.6.6.6, 203.0.113.7` da `203.0.113.7`; `basura` da la del socket y registra `xff_varias` una vez; tres entradas dan `request.ip` (la última) y registran `xff_varias`; dos IPv6 del mismo /64 caen en la misma clave de L4; `trustProxy: 1` no aparece en `app.ts`                                                                                                                                                                                                                                                                                                                                                         |
| `privacy.test.ts`             | 3, y cada PR que añade frase | cada frase de §10.1 que ya es verdad está; `not stored`, `Only a session cookie`, `Ask and` y `Change your email` no vuelven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `redact.test.ts`              | 4                            | ninguna línea de log tras abrir `verify-email?token=` o `reset-password/<token>` contiene el token, el JWT, `callbackURL` ni un `@`; la IP sí                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `authRoutes.test.ts`          | 3, 5, 19                     | **PR 3**: con `node:http`, `/api/auth/x/../sign-in/email`, `/api/auth/./sign-in/email` y `/api/auth/x/../request-password-reset`, y las mismas contra `change-password`, dan 404 (§7.2). **PR 5**: recorre todos los puntos de `auth.api` y exige 404 por HTTP a todo lo que no está en `AUTH_ALLOWED_PATHS` (con `/sign-in/email/`, `//sign-in/email` y `/Sign-in/email`), y 200 o el error esperado a las once; `/callback/x` da 404; `update-user` da 404. **PR 19**: `/reset-password/abc` da 404                                                                                                                                         |
| `signupApproval.test.ts`      | 5                            | los casos de §4.9: registro `pending` sin correo; ni `sign-in/email` ni `send-verification-email` mandan nada a una pendiente; aprobar manda un `verify_signup` y escribe `user.status`; rechazar borra y deja volver a registrarse; `ADMIN_EMAIL` entra aprobado; con el presupuesto gastado, aprobar da 503 y no cambia nada; las cuentas que existían al migrar quedan `approved`                                                                                                                                                                                                                                                          |
| `adminAudit.test.ts`          | 5                            | cada `PATCH` y `DELETE` del panel escribe una fila por campo con `{ field, from, to }`, y también premium, la lista de bloqueo, el tick y el avance (`actor` `'token'` con `ADMIN_TOKEN`); el `PATCH` sobre la cuenta raíz da 409 `es_el_admin_raiz` para `emailVerified`, `isAdmin`, `email` y `birthDate`; cambiar el correo encola `email_changed` y, con `signOutEverywhere`, cierra todas las sesiones; `ADMIN_EMAIL` como viejo o nuevo da 400 `admin_email_fijo`; un correo ocupado, 409 `correo_ocupado`; `PATCH /api/admin/teams/:id` con las reglas de `updateOwnedTeam`; `GET /api/admin/audit` pagina con `before` y corta en 500 |
| `accountLimit.test.ts`        | 6                            | **la ráfaga**: 40 peticiones a la vez contra un correo con la contraseña buena entre ellas dan 10 × 401 y 30 × 429, y la buena no entra (contando después entraba: `rafaga.json` y `reserva.json`); 11 fallos desde 11 IP dan `ACCOUNT_LOCKED` desde una IP nueva; con `cs_device` válida entra; un correo que no existe se cierra igual; recuperar pone el contador a cero; el contador sobrevive a rehacer la app; L3: diez contraseñas malas en una sesión cierran esa y no `change-password` en otra sesión de la misma cuenta, y el trigésimo primero del día en la cuenta da 429                                                        |
| `deviceCookie.test.ts`        | 6, 11                        | formato `v1.<hmac>.<nonce>.<firma>`; firma mala o `device_epoch` viejo no valen; borrar la cuenta y registrar otra con el mismo correo deja sin valor la entrada vieja (la firma lleva el id); con dos cuentas en la cookie, cerrar las otras sesiones de una deja intacta la entrada de la otra (PR 11); `Forget this device` quita solo la suya; la sexta cuenta saca a la más vieja; `Path=/api/auth`, `HttpOnly`, `SameSite=Lax`, `Secure` en https; sobrevive a `Sign out`; **la carrera tras recuperar**: con L1 cerrado por un tercero, recuperar da `cs_device` y el dueño entra a la primera                                         |
| `resendWebhook.test.ts`       | 7                            | firma mala, 401; un evento repetido, 200 sin cambiar nada; un `delivered` tardío no pisa un `bounced`; otra ruta de la API sigue recibiendo JSON analizado; cada evento cambia `status`, y los de rebote, queja y supresión ponen `email_undeliverable_at`                                                                                                                                                                                                                                                                                                                                                                                    |
| `mailBudget.test.ts`          | 7                            | a los 60 envíos del día UTC `send-verification-email` y la aprobación del panel dan 503 `MAIL_BUDGET_EXHAUSTED` y `sign-up/email` no; `request-password-reset` sigue hasta 90; un mismo destinatario saca de la reserva una sola recuperación al día; L5: el cuarto correo a un buzón en una hora no sale y la respuesta es idéntica byte a byte                                                                                                                                                                                                                                                                                              |
| `emailLinks.test.ts`          | 8                            | los dos correos llevan `/verify-email#token=` y `/reset-password#token=`, nunca la ruta de la API; el enlace viejo `?token=` sigue valiendo; el token de recuperación caduca a los 3.600 s                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `birthDate.test.ts` (shared)  | 9                            | 16 cumplidos hoy entra y mañana no, con `makeBirthDateSchema(now)`; 29 de febrero como 1 de marzo; 1899 y futura fuera                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `birthDate.test.ts` (API)     | 9                            | sin fecha, 400; menor con correo nuevo y con correo que existe, **el mismo 400** (X-09); `PUT /api/me/birth-date` escribe una vez (409 `already_set`) y no guarda a un menor; la puerta: recorre las rutas registradas (`onRoute`) y exige 403 `BIRTH_DATE_REQUIRED` en todo lo que no es `GET` bajo `/api/` salvo la lista de §4.5, también `POST /api/teams/take-over` y `PUT /api/my-orders`; `birthDate` no viaja en `get-session` (`returned: false`) y `GET /api/me/account` da `birthDateSet`; `image` rechazada; `name` es `'Player'`                                                                                                 |
| `devices.test.ts`             | 11                           | `GET /api/me/devices` sin token, IP ni agente crudo; id de 16 hex; cerrar una borra sus `push_targets`; la propia da 409 `usa_sign_out`; `POST /api/auth/devices/sign-out-others` sube `device_epoch`, borra las claves `pw:` de la cuenta, reemite la `cs_device` propia y devuelve `closed`                                                                                                                                                                                                                                                                                                                                                 |
| `deviceLabel.test.ts`         | 11                           | los doce agentes de §6.4; el iPad que se anuncia como Mac sale `Safari on Mac`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `deleteAccount.test.ts`       | 12                           | un fallo inyectado tras soltar el corredor no deja nada a medias; tras borrar, 0 filas del usuario en `users`, `sessions`, `accounts`, `race_watch`, `verifications`, `push_targets` y `notice_log`; `email_log.user_id` nulo; `admin_audit` sin `from` ni `to` en `user.email`; el equipo conserva el nombre                                                                                                                                                                                                                                                                                                                                 |
| `exportData.test.ts`          | 12                           | con contraseña (L3) y `EXPORTS_PER_DAY`; el JSON no lleva token, hash, IP, credencial de push, `isAdmin` ni `deviceEpoch`; el cuarto del día, 429 `EXPORT_LIMIT`; `notificationDevices` es `[]` con un `it.todo` hasta el PR 14                                                                                                                                                                                                                                                                                                                                                                                                               |
| `lastSeen.test.ts`            | 12                           | `get-session` escribe `last_seen_at` sin esperar y como mucho una vez por hora; `welcome_back_from` toma el valor viejo si tenía más de 7 días                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `purge.test.ts`               | 12                           | borra lo de cada plazo y nada más; la cuenta aprobada sin confirmar con `approved_at` de hace 8 días y sin corredor cae, la de 6 o con corredor no, y una `pending` de 30 días tampoco; corre en `runTick` solo si se procesaron días                                                                                                                                                                                                                                                                                                                                                                                                         |
| `inactivity.test.ts`          | 13                           | `inactiveSince` en sus cuatro casos; `isAway` en el borde exacto de `away_until`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `away.test.ts`                | 13                           | declarar; menos de 12 h y más de 28 días, 400 `fecha_fuera_de_rango`; entrar no la termina; cambiar la fecha conserva `away_since`; `End now`; el `CHECK` de pareja rechaza una sola columna                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `trainingDayAway.test.ts`     | 13                           | `manual` sin orden: `descanso_activo` sin ausencia y la sesión del entrenador con ella; `mixto` y `entrenador`, iguales con y sin ausencia; `ENGINE_VERSION` sigue en 91                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `notices.test.ts`             | 14                           | el tope de 3 con el cuarto apuntado y no enviado; el silencio con dos zonas (`Europe/Madrid` y `America/Los_Angeles`) y su salida a las 8; dos barridos a la vez sin duplicar; 404 y 410 borran; tres `retry` seguidos borran; con ausencia solo salen `away_over` y los de seguridad; `new_sign_in` dos veces en una hora sale una; recuperar manda `password_changed` y deja la cuenta sin `push_targets`                                                                                                                                                                                                                                   |
| `pushEndpoint.test.ts`        | 14                           | **la SSRF**: `http://localhost`, `https://postgres.railway.internal:5432/x`, `https://10.0.0.1/x`, `https://fcm.googleapis.com.evil.com/x`, `https://user:pw@fcm.googleapis.com/x` y `https://fcm.googleapis.com:8443/x` se rechazan al guardar y al enviar; los cinco servicios de `PUSH_ALLOWED_HOSTS` se aceptan                                                                                                                                                                                                                                                                                                                           |
| `sw.test.ts`                  | 14                           | `apps/web/public/sw.js` sin `addEventListener('fetch'`, `caches` ni `importScripts`; `notificationclick` a otro origen abre `/`; `index.html` con un solo `rel="manifest"` y sin `apple-mobile-web-app-capable`; `manifest.webmanifest` con las ocho claves de §13.5 y sin `icons`, servido como `application/manifest+json` (la frontera con D-00p, comprobada)                                                                                                                                                                                                                                                                              |

**Web**

| Fichero                     | PR     | Qué fija                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authErrors.test.ts`        | 1      | cada fila de la tabla de §12.3, con `retryAfterS` de 45 y 240                                                                                                                                                                                                                                                                                                                                                                                               |
| `Field.test.tsx` (`reveal`) | 1      | `Show` y `Hide` cambian el `type` y el rótulo accesible                                                                                                                                                                                                                                                                                                                                                                                                     |
| `DateField.test.tsx`        | 9      | tres campos con `bday-day`, `bday-month`, `bday-year`; no salta de campo solo; `toIsoDate` no valida (12-e)                                                                                                                                                                                                                                                                                                                                                 |
| Los de cada página tocada   | 1 a 14 | `Login`, `Register` y `CheckInbox`, `VerifyEmail`, `ForgotPassword`, `ResetPassword`, `Account` y cada subpágina, `Terms`, `Privacy`, `AwayBand`, `WelcomeBack`, `AccountNotifications` en sus ocho estados de §13.4 (con `navigator` simulado: iPhone en pestaña y en `standalone`), `Login` con `ACCOUNT_PENDING`, `CheckInbox` en su forma de petición recibida, `AdminPanel` con la cola de aprobación y `Team` con `Rename team` para un administrador |

### 17.2 Los que se re-sellan

| Test                                                   | Línea                      | Por qué                                                                                                                                               | PR    |
| ------------------------------------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `apps/api/src/authFlow.test.ts`                        | 72, 274, 368 y 423         | los registros llevan `birthDate`; los que leen el buzón justo tras la respuesta esperan a `mailQueue`, porque el correo ya no sale antes de responder | 3, 9  |
| `apps/api/src/adminPanel.test.ts`                      | 34                         | `birthDate` en el registro; el panel gana `email` y equipos                                                                                           | 5, 9  |
| `apps/api/src/__fixtures__/spoilerWorld.ts`            | 244                        | sus cuatro usuarios llevan `birthDate`, y con ellos las suites que lo usan                                                                            | 9     |
| `apps/web/src/domain/entryForms.test.ts`               | 16                         | el registro con tres campos de fecha                                                                                                                  | 9     |
| `apps/web/src/pages/Register.test.tsx`                 | 30                         | lo mismo                                                                                                                                              | 9     |
| `apps/api/src/emails.test.ts`                          | 7 y 81 a 121               | pierde los tres de `stageReadyEmail` y el de `changeEmailConfirmationEmail`; los dos que quedan, con el enlace de la página de botón                  | 8, 14 |
| `apps/api/src/spoilerCanary.test.ts`                   | 5 y 206                    | el canario renderiza `noticePayload` y no `stageReadyEmail` (X-18)                                                                                    | 14    |
| Los de `Account.tsx`                                   | todos                      | `Account` pasa a lista con subpáginas (DD-07 A)                                                                                                       | 5, 11 |
| `apps/api/src/authFlow.test.ts` y `adminPanel.test.ts` | los que registran y entran | desde el PR 5 una cuenta nueva queda `pending`: el arnés la aprueba (`POST /api/admin/users/:id/approve` o un `UPDATE` de prueba) antes de entrar     | 5     |
| `apps/web/e2e/world/build.mjs` (no es test)            | 138                        | registra cuentas: `birthDate`                                                                                                                         | 9     |

Ningún test de hoy prueba que recuperar **no** cierre sesiones (lista de `it` de `authFlow.test.ts` y `auth.test.ts`, incremental §15), así que el PR 3 no tiene que deshacer ninguno.

### 17.3 La prueba del teléfono

La de E3 (`docs/visual.md` §7; Chromium de `/opt/pw-browsers`, a 360 y 320 px, con el teclado simulado de mapa 05 §10) añade, además de lo que pide §12.6: `/account/notifications` en los estados `ok` (sin decidir y encendido), `denied` e `ios-home` (agente de iPhone simulado); `/account/away` sin ausencia y con ella, con `DateField` en error; `AwayBand` sobre la portada; `WelcomeBack` con y sin corredor; y `Don't want these?` de `?from=notice`. Comprueba que ningún botón queda bajo el teclado y que nada desborda a 320. Lo que no se puede simular (el permiso real, un aviso que llega, la pantalla de inicio de un iPhone) va a la prueba del dueño (§19.3).

---

**Injertos aplicados.** Ninguno asignado.

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.** Ninguna nueva. Los tests de las propuestas que salen (`hibp.test.ts`, `emailChange.test.ts`) salen por las decisiones del dueño del 23 de noviembre; los que entran nuevos están en la tabla de §17.1 con su PR.

## 18. El plan por PR, tests primero

Esta sección ordena en diecisiete PR todo lo que §4 a §17 piden construir. Para cada uno dice qué entra, qué tests se escriben antes que el código, de qué depende, qué migración lleva, cuánto cuesta, qué ve el dueño al acabarlo y cómo se deshace. No añade piezas: cada fichero, ruta, constante y test que nombra está en su sección. El modelo es `docs/retransmision.md` §17. Las líneas citadas son las de `2a29e6d`; si al implementar una se ha movido, manda el nombre del símbolo.

### 18.1 Reglas del plan

1. **Tests primero.** Cada PR empieza por los ficheros de test de su fila, con los casos de §17.1, y se cierra con `pnpm typecheck && pnpm test:rapido` en verde (`package.json` l. 12 y 21). Lo que aún no puede pasar se escribe como `it.todo` con la cifra en el nombre.
2. **Cada PR se despliega solo y con la cuenta de hoy** (D-58): ninguno deja a la cuenta del dueño sin poder entrar, y ninguno depende de otro sin fusionar salvo lo que dice su columna. Los costes son horas de un agente, **estimados** por esta síntesis; el total, unas 134 horas (D-58 decía 120 con el TOTP y las contraseñas filtradas, que salen; el cambio de correo de autoservicio también sale; `Account` en subpáginas y el panel suben, y la corrección añadió el registro por aprobación, los dos arreglos de producción y los frenos de la refutación).
3. **Migraciones** con `pnpm exec drizzle-kit generate --name <nombre>`, el `.sql`, la foto y `_journal.json` tal como salen, más los `UPDATE` a mano de la 0056 (§15.2). Nunca se revierten: deshacer un PR es revertir su código y dejar la tabla o las columnas, que nadie lee.
4. **Los números de PR son los que fijó la síntesis**, y los dos que el dueño retiró se quedan sin usar para no mover las referencias de §4 a §12 (18-a): el **10** (`filtradas`, DD-11 C, «no entraría ahí», `00-encargo.md` l. 383 a 384) y el **18** (`dos-factores`, DD-01 A, l. 360 a 369). Con ellos sale la `0059_dos_factores`. Se añade el **19** (`fin-enlaces-viejos`, 18-b).
5. **Lo que el jugador nota** se dice en cada fila. Todo lo demás se fusiona sin que nadie vea nada.
6. **Nada toca `packages/engine/`** ni `packages/shared/src/broadcast/` (W5); `ENGINE_VERSION` sigue en 91. El único cambio de reglas del mundo es `manual` como `mixto` durante la ausencia, en `packages/shared/src/trainingDay.ts` (PR 13), que no es motor.
7. **Variables nuevas**, en el PR que las lee y en `docs/ops.md` del PR 17: `MAIL_DAILY_BUDGET` y `RESEND_WEBHOOK_SECRET` (7), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (14). Sin ellas, cada pieza se apaga sola: sin secreto del webhook la ruta responde 404; sin VAPID no hay avisos y `Notifications` dice `Notifications aren't available yet.`

### 18.2 La tabla

| PR  | Nombre               | Qué entra (resumen)                                                                                                                                                                                                                                                                                                                                                                                                        | Tests primero                                                                                                                                   | Depende de                         | Migración | Coste | Lo que ve el dueño                                                                                                                                                 | Marcha atrás                                                                                                                                  |
| --- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pantallas`          | `authErrorText`, el 429 con `message` y `retryAfterS`, los finales con `Notice`, `VerifyEmail` con sesión, `CheckInbox` que sobrevive a recargar, `Field` `reveal`                                                                                                                                                                                                                                                         | `authErrors.test.ts`, `Field.test.tsx`, los de cada página, `authFlow.test.ts` (429)                                                            | nada                               | no        | 6 h   | un 429 dice cuánto esperar y no «contraseña mala»; cada acción acaba con una frase                                                                                 | revertir; nada guardado                                                                                                                       |
| 2   | `dependencias`       | `better-auth` 1.7.26 en API y web, `fastify` 5.12.8, `zod` 4.6.7 o más, `fast-uri` por `pnpm.overrides`                                                                                                                                                                                                                                                                                                                    | la suite de hoy (1.126, medido en mapa 01 §8) y uno que fija lo que 1.7 cambia                                                                  | nada                               | no        | 3 h   | nada; `pnpm audit` sin las altas de §3 del encargo                                                                                                                 | revertir el lock                                                                                                                              |
| 3   | `opciones`           | **el primer PR de seguridad**: los dos arreglos de producción (el cuerpo fijo del 200 del registro, §5.3, y la ruta normalizada antes de todo límite, §7.2; `00-encargo.md` §9.4); las opciones de `better-auth` de §8 y §6 que no piden tabla, `mailQueue`, el token fuera de todo JSON de `/api/auth/*`, `trustProxy` y `clientIp`, `Privacy.tsx` nueva con lo que ya es verdad                                          | `authFlow.test.ts`, `enumTiming.test.ts`, `authRoutes.test.ts` (las rutas con `..`), `mailQueue.test.ts`, `clientIp.test.ts`, `privacy.test.ts` | 2                                  | no        | 12 h  | recuperar cierra todas las sesiones; las sesiones duran 30 días; Privacy dice la verdad                                                                            | revertir; las sesiones vuelven a 7 días en su próxima renovación; los dos agujeros vuelven a abrirse                                          |
| 4   | `logs`               | `redactUrl` en `serializers.req`; la frase de los logs con `<N>`                                                                                                                                                                                                                                                                                                                                                           | `redact.test.ts`                                                                                                                                | 3                                  | no        | 2 h   | nada en la web; los logs de Railway sin enlaces                                                                                                                    | revertir                                                                                                                                      |
| 5   | `rutas`              | `AUTH_ALLOWED_PATHS` (once), `disabledPaths` y el `hooks.before` de las rutas con parámetros; el formulario de cambio de correo sale de `Account`; `admin_audit`; **el registro por aprobación** (§4.9: `users.status`, la cola, `approve` y `reject`); el panel cambia correo (con `Sign out everywhere`), fecha y nombre de equipo, también desde la página del equipo, protege la cuenta raíz y enseña `Recent changes` | `authRoutes.test.ts`, `signupApproval.test.ts`, `adminAudit.test.ts`, `adminPanel.test.ts`                                                      | 2                                  | **0055**  | 13 h  | en `/admin`, `Waiting for approval`, `Change email`, `Rename team` y `Recent changes`; en `Account`, el correo sin formulario; quien se registra espera aprobación | revertir el código; la tabla y las dos columnas se quedan, y con el código viejo nadie las lee (las cuentas `pending` entrarían al confirmar) |
| 6   | `limites`            | `auth_limits`, `reserveAttempt`, `clearAttempts`, L1 a L4 (L3 por sesión y por cuenta), `cs_device` con el id en la firma, `device_epoch` (también al cambiar la contraseña), el resto de `onPasswordReset`; la 0056 entera                                                                                                                                                                                                | `accountLimit.test.ts`, `deviceCookie.test.ts`, `authFlow.test.ts`                                                                              | 3, 5                               | **0056**  | 13 h  | nada si entra bien; tras 10 fallos desde un navegador nuevo, `Too many failed attempts on this account…`                                                           | revertir; columnas y tabla se quedan; los `UPDATE` no se deshacen (§19.1)                                                                     |
| 7   | `correo`             | `email_log`, `mailer.send` con `kind` y `userId`, el webhook de Resend en su contexto, `email_undeliverable_at` y su `Notice`, L5, el presupuesto L6 con la reserva una vez por destinatario y día                                                                                                                                                                                                                         | `resendWebhook.test.ts`, `mailBudget.test.ts`                                                                                                   | 6                                  | **0057**  | 6 h   | `Account` avisa si su correo rebota; con el día gastado, `We can't send emails right now. Try again tomorrow.`                                                     | revertir; sin `RESEND_WEBHOOK_SECRET` la ruta ya está apagada                                                                                 |
| 8   | `enlaces`            | la página de botón (`#token=`, `replaceState`), `POST /api/account/verify-email`, `RESET_TOKEN_TTL_S` y `EMAIL_JWT_TTL_S`, los dos correos nuevos, `changeEmailConfirmationEmail` fuera, el enlace viejo                                                                                                                                                                                                                   | `emailLinks.test.ts`, `emails.test.ts`, los de `VerifyEmail` y `ResetPassword`                                                                  | 3                                  | no        | 6 h   | los dos correos con su texto nuevo; el enlace abre una página con un botón                                                                                         | revertir; los enlaces nuevos en vuelo dejan de valer (`#token=` sin lector): una hora o un día                                                |
| 9   | `edad`               | `birthDateSchema`, `DateField`, `Register`, la pantalla del menor, la puerta de la fecha (global en la API), `GET /api/me/account` con `birthDateSet`, `PUT /api/me/birth-date`, `/terms`, el gancho de `name` y `locale`, `image` fuera                                                                                                                                                                                   | `birthDate.test.ts` (shared y API), `DateField.test.tsx`, `Register.test.tsx`, los re-sellados de §17.2                                         | 1, 6                               | no        | 11 h  | al entrar, `One more thing` y su fecha; el registro pide la fecha                                                                                                  | revertir; las fechas guardadas se quedan                                                                                                      |
| 11  | `account`            | `Account` como lista con sus subpáginas, `GET /api/me/account` completa, `Devices` con `GET` y `DELETE /api/me/devices`, `POST /api/auth/devices/sign-out-others` y `POST /api/auth/devices/forget`, `deviceLabel`                                                                                                                                                                                                         | `devices.test.ts`, `deviceLabel.test.ts`, `deviceCookie.test.ts` (dos cuentas), los de `Account` y cada subpágina                               | 1, 6, 9                            | no        | 13 h  | `Account` es una lista; `Devices` enseña dónde tiene sesión y la cierra                                                                                            | revertir a la página de hoy                                                                                                                   |
| 12  | `datos`              | `deleteAccount` en una transacción por `beforeDelete`, `POST /api/me/export` y `Your data`, `last_seen_at` en `get-session`, `welcome_back_from`, `purgeAccounts` en `runTick`                                                                                                                                                                                                                                             | `deleteAccount.test.ts`, `exportData.test.ts`, `lastSeen.test.ts`, `purge.test.ts`                                                              | 7, 11                              | no        | 10 h  | `Download my data` baja un JSON; borrar la cuenta no deja nada a medias                                                                                            | revertir; la purga ya hecha no se deshace                                                                                                     |
| 13  | `ausencia`           | `PUT`, `DELETE` y `GET /api/me/away`, `Away`, `AwayBand`, `manual` como `mixto`, `inactiveSince` e `isAway`, `WelcomeBack` y sus rutas                                                                                                                                                                                                                                                                                     | `inactivity.test.ts`, `away.test.ts`, `trainingDayAway.test.ts`, los de `Away`, `AwayBand` y `WelcomeBack`                                      | 12                                 | no        | 10 h  | `Away` en `Account`; la banda mientras dura; `Welcome back` al volver                                                                                              | revertir; las ausencias guardadas no hacen nada sin el código                                                                                 |
| 14  | `avisos`             | todo §13: catálogo, `sw.js`, el manifiesto mínimo, `push_targets`, `notice_log`, `Notifications`, el permiso, el iPhone con iOS 16.4, `noticeSweep`, los tres de seguridad, `stageReadyEmail` fuera con el canario movido                                                                                                                                                                                                  | `notices.test.ts`, `pushEndpoint.test.ts`, `sw.test.ts`, `spoilerCanary.test.ts`, los de `AccountNotifications`                                 | 11, 13                             | **0058**  | 19 h  | `Turn on` en su teléfono; un aviso de etapa a las 19:00; uno al recuperar la contraseña                                                                            | quitar las tres VAPID apaga todo sin desplegar; revertir deja `sw.js` registrado sin nadie que le mande (inofensivo)                          |
| 15  | `regla-del-mes`      | `away_warning` en el barrido y su casilla, las frases de la regla en `Away` y `WelcomeBack`, la cifra de E7                                                                                                                                                                                                                                                                                                                | `notices.test.ts` (los dos avisos y sus `ref`), los de `Away` y `WelcomeBack`                                                                   | 14 y E7                            | no        | 3 h   | el aviso de 20 y 27 días, si E7 ha puesto la regla                                                                                                                 | revertir                                                                                                                                      |
| 16  | `documentos`         | el texto de §20.2 en cada documento; `visual.md` después de W5                                                                                                                                                                                                                                                                                                                                                             | `prettier --check .`                                                                                                                            | 5, 8, 12, 14 (W5 para `visual.md`) | no        | 4 h   | los documentos dicen lo que hay                                                                                                                                    | revertir                                                                                                                                      |
| 17  | `operacion`          | `docs/ops.md`: el correo y el panel (l. 87 a 99 y 136 a 141), DNS corregido (l. 106 y 108), DKIM, `CAA`, VAPID, webhook, presupuesto, réplicas, logs de Railway, el segundo factor del buzón de `ADMIN_EMAIL`, las tandas de registro                                                                                                                                                                                      | ninguno: es texto                                                                                                                               | 7, 8, 14                           | no        | 2 h   | una lista de tareas suyas en `docs/ops.md`                                                                                                                         | revertir                                                                                                                                      |
| 19  | `fin-enlaces-viejos` | `GET reset-password/:token` y `GET verify-email` salen de la lista blanca (quedan nueve) y la web deja de leer `?token=`                                                                                                                                                                                                                                                                                                   | `authRoutes.test.ts`, `emailLinks.test.ts`                                                                                                      | 8 y `LEGACY_LINK_GRACE_DAYS`       | no        | 1 h   | nada                                                                                                                                                               | revertir                                                                                                                                      |

Total: 134 horas (6 + 3 + 12 + 2 + 13 + 13 + 6 + 6 + 11 + 13 + 10 + 10 + 19 + 3 + 4 + 2 + 1), estimado y sumado a mano.

### 18.3 Cada PR

**PR 1 · `pantallas`.** Va primero porque arregla lo que el jugador ya ve, sin migración ni dependencia. Entra `apps/web/src/domain/authErrors.ts` con `authErrorText` y la tabla de §12.3, usado en `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `VerifyEmail` y `Account`; el `errorResponseBuilder` de Fastify con `message` y `retryAfterS` (`app.ts` l. 213 a 217; D-25); los botones deshabilitados con cuenta atrás; los finales con `Notice` `good` y `role="status"` (principio 1); `VerifyEmail` que no pide entrar a quien ya tiene sesión; `CheckInbox` con `cs.pendingEmail`; `Field` con `reveal` y su sitio en `/_ui` (D-56). Tests primero: `authErrors.test.ts` con `retryAfterS` de 45 y 240; `Field.test.tsx`; el caso del 429 en `authFlow.test.ts`.

**PR 2 · `dependencias`.** Las subidas de D-28, medidas por el mapa 01 §8: compila y pasan los 1.126 tests. El test nuevo fija lo que 1.7 cambia en lo que usamos (el enlace de la dirección nueva sin sesión no abre sesión; con el cambio de correo fuera, basta con que `verify-email` abra sesión como hoy). `audit` de `cobertura.yml` (l. 182 a 192) pasa a bloquear después de W5, que toca el CI.

**PR 3 · `opciones`. El primer PR de seguridad.** Lleva los dos fallos que el refutador de código encontró en producción, porque el dueño no quiso un PR urgente aparte: «no, primero el plan de E4» (`00-encargo.md` §9.4, 23 de noviembre de 2026). Uno: el proxy sustituye el cuerpo de todo 200 de `sign-up/email` por `{ "token": null, "user": null }` (§5.3, 5-i). Dos: el `onRequest` de `/api/auth/*` da 404 a toda ruta que no sea igual a su forma normalizada o que lleve `//`, `/./`, `/../`, `%2e`, `%2f` o `%5c`, antes del límite y del proxy (§7.2, 7-j). Sus tests van primero: el cuerpo en `enumTiming.test.ts` y las tres variantes con `node:http` en `authRoutes.test.ts`. **Precondición (H-04):** antes de fusionar, el dueño ejecuta en la consola de Postgres de Railway la consulta de solo lectura de §6.2 y pega el resultado en el PR. Una IP pública suya confirma la lectura de `00-encargo.md` §2.2; vacío o una IP de Railway cambia D-21 y hay que mirarlo antes del PR 6. Si la consulta se retrasa, `trustProxy` y `clientIp` pasan al PR 6 y el PR 3 se fusiona sin ellos: los dos arreglos de producción no esperan (18-g). Entra en `auth.ts`: `revokeSessionsOnPasswordReset`, `onPasswordReset` (borrar los otros enlaces y apuntar `resetRequests`; poner L1 a cero y subir `device_epoch` llega con el PR 6), `verification.storeIdentifier: 'hashed'`, `advanced.backgroundTasks.handler = mailQueue.track` con `mailQueue.drain` en `SIGTERM`, `disableIpTracking`, `rateLimit: { enabled: false }`, `logger: { level: 'warn' }` (D-30), `session.expiresIn` y `updateAge` sin `cookieCache` y el techo de 90 días (§6.1). En el proxy, `get-session` sin `token`, `ipAddress` ni `userAgent`, y ningún JSON de `/api/auth/*` con `token` (§6.3, 6-f). En `app.ts`, `trustProxy: (addr, hop) => hop === 0` y `clientIp`. `Privacy.tsx` con el texto de §10.1 sin las frases que aún no son verdad y sin `Ask and…` (D-00b; §11.2: la búsqueda de otras promesas en `apps/web/src`). Lo que ve el jugador: quien recupera la contraseña cierra todas sus sesiones (lo buscado); nada más, porque los dos arreglos de producción no cambian ninguna pantalla.

**PR 4 · `logs`.** `apps/api/src/redact.ts` con `redactUrl` en `serializers.req` (D-37). **Precondición**: `<N>`, cuánto guarda Railway los logs, leído del panel de Railway; sin la cifra el PR no se fusiona (§10.1).

**PR 5 · `rutas` (0055).** La lista blanca en el proxy (`AUTH_ALLOWED_PATHS`, once rutas, 8-a), `disabledPaths` como complemento (D-29; X-14) y el `hooks.before` que cierra las rutas con parámetros (8-g). **El registro por aprobación** de §4.9 (`00-encargo.md` §9.5, punto 1): `users.status` y `approved_at` en la 0055 con el `UPDATE` que deja aprobadas las cuentas de hoy, el `additionalFields.status`, la función `sendVerificationEmail` que no manda nada a una pendiente, `ACCOUNT_PENDING` en el proxy, `CheckInbox` en su forma de petición recibida, `POST /api/admin/users/:id/approve` y `reject`, y `Waiting for approval` en el panel. Va aquí, y no con el PR 9, porque el registro está abierto hoy y la puerta tiene que llegar pronto; desde este PR, quien se registra espera. Como `change-email` da 404 desde aquí, el formulario `Email` de `Account.tsx` se sustituye en el mismo PR por `Your email can only be changed by an administrator.` (12-a), aunque `Account` siga siendo una página hasta el PR 11. El panel de §8.5: `PATCH /api/admin/users/:id` con `email`, `signOutEverywhere` y `birthDate` (este último guardado desde el PR 9, cuando existe la columna) y el 409 `es_el_admin_raiz`, `PATCH /api/admin/teams/:id`, `GET /api/admin/audit`, las filas de premium, lista de bloqueo, tick y avance, cada cambio con su fila de `admin_audit` en la misma transacción, y en `AdminPanel.tsx` `Waiting for approval`, `Change email`, `Change date of birth`, `Rename team` y `Recent changes`; `Rename team` también en `/world/teams/:id` para un administrador. El aviso `email_changed` llega con el PR 14; hasta entonces el cambio cierra sesiones si se marca la casilla y no avisa. Lo que ve el dueño: el panel como en `twilightstruggle` (`00-encargo.md` l. 360 a 369).

**PR 6 · `limites` (0056).** **Precondición (H-03):** el dueño mira en Railway cuántas réplicas tiene `web` y se escribe en `docs/ops.md`. Entra la 0056 entera (§15.2), `packages/db/src/authLimits.ts`, la reserva en el proxy antes de reenviar, `apps/api/src/deviceCookie.ts` con la clave HKDF (7-a) y el id de la cuenta en la firma (7-l), L1 a L4 con L3 por sesión y por cuenta (7-k) y los textos de 429 de §12.3, lo que faltaba de `onPasswordReset`, y el `device_epoch` que sube al cambiar la contraseña con la reemisión de la `cs_device` propia (5-j). La 0056 trae también las columnas que usarán los PR 9, 13 y 14 (15-b). Riesgo: los dos `UPDATE` (§19.1).

**PR 7 · `correo` (0057).** `email_log`, `mailer.send` que apunta `queued` antes de enviar y guarda `resend_id` (§9.2), `POST /api/webhooks/resend` con cuerpo crudo y `svix`, `email_undeliverable_at` con el `Notice` de 9-c, L5 sobre `recipient_hash`, `MAIL_DAILY_BUDGET` (90) y `MAIL_RESET_RESERVE` (30) con el 503 `MAIL_BUDGET_EXHAUSTED` (7-f) y la reserva una vez por destinatario y día (7-m); el webhook en su propio contexto de Fastify (9-f). Variables: `RESEND_WEBHOOK_SECRET`, `MAIL_DAILY_BUDGET`. Tarea del dueño, en el PR 17: dar de alta el webhook en Resend.

**PR 8 · `enlaces`.** La página de botón en `VerifyEmail` y `ResetPassword` (D-12; I-04), con `POST /api/account/verify-email` para que el token no viaje en una URL (5-h), `withCallbackURL` hacia `#token=`, los dos correos de §5.7 con su pie, `changeEmailConfirmationEmail` fuera con su test. `stageReadyEmail` **no** sale aquí: se queda hasta el PR 14, que mueve el canario. El PR 8 ya no lleva cambio de correo (§5.5).

**PR 9 · `edad`. Condición para empezar a aprobar cuentas**: este PR, la lista de §21.3 vista por un abogado (D-00a) y el plan gratuito por tandas (DD-10 B, «de momento nos quedamos en el gratis y abrimos registro por tandas pequeñas», `00-encargo.md` l. 378), con la aprobación del PR 5 como mecanismo (§4.9). Entra §4 entero: `packages/shared/src/account/birthDate.ts`, `DateField` y su sitio en `/_ui`, el campo en `Register`, la pantalla del menor con `cs.ageGate`, la puerta de la fecha en `ProtectedRoute.tsx` l. 11 y en la API como gancho global (4-g), `GET /api/me/account` con `birthDateSet` y `birthDate` con `returned: false` (4-f), `PUT /api/me/birth-date`, `Terms` en `/terms` con su enlace en el pie, `terms_version` y `terms_accepted_at`, `databaseHooks.user.create.before` (`name`, `locale`) y el rechazo de `image`. Re-sella lo de §15.5. Lo que ve el dueño: al primer paso tras desplegar, `One more thing` con su fecha (§19.1).

**PR 11 · `account`.** `Account` como lista (DD-07 A) con `AccountEmail`, `AccountPassword`, `AccountDevices`, `AccountSpoilers`, `AccountAppearance` y `AccountDelete` en `apps/web/src/pages/account/`; `AccountData` llega vacía de acción hasta el PR 12, y `AccountNotifications` y `AccountAway` con sus PR (la fila no aparece antes). `GET /api/me/account` completa (12-b), `GET /api/me/devices`, `DELETE /api/me/devices/:id`, `POST /api/auth/devices/sign-out-others` con la reemisión de `cs_device` y `POST /api/auth/devices/forget` con `Shared computer? Forget this device` (§6.4 y §6.5). Es el PR que reescribe `Account.tsx` (417 líneas, mapa 05) y sus tests: por eso cuesta 12 horas (O-22). Pasa la prueba del teléfono a 360 y 320 (§17.3).

**PR 12 · `datos`.** Depende del 11 y del 7, que crea `email_log` para `emails` de la exportación; `notificationDevices` es `[]` con un `it.todo` hasta el PR 14 (10-g). **Precondición:** el dueño comprueba si corre el cron de `scripts/backup.sh` (`docs/ops.md` l. 15 y 24); si no, la frase de las copias pasa a `Backups are not kept.` (§10.1). Entra `deleteAccount` en `packages/db/src/adminUsers.ts` por `user.deleteUser.beforeDelete` (D-38; el equipo conserva el nombre, 10-b), `POST /api/me/export` con L3 y `exp:` (D-39), el gancho `after` de `get-session` con `touchLastSeen` (D-40) que escribe también `welcome_back_from` (14-d), y `purgeAccounts` en `runTick` (15-c).

**PR 13 · `ausencia`.** §14 entero menos los avisos: las rutas, `AccountAway`, `AwayBand` en `Layout`, `ownerAway` en `trainingDay.ts` y `train.ts`, `packages/db/src/inactivity.ts`, `WelcomeBack` en `Home` con `GET` y `DELETE /api/me/welcome-back`. Sin avisos todavía, la línea `Notifications stay quiet…` no se pinta hasta el PR 14 (18-c).

**PR 14 · `avisos` (0058).** §13 entero, con el manifiesto mínimo de §13.5 (`00-encargo.md` §9.5, punto 2), la explicación del iPhone para iOS 16.4 y el aviso `email_changed` desde la ruta del panel. Variables: las tres VAPID, generadas una vez (`web-push generate-vapid-keys`; tarea del PR 17). Entra `packages/shared/src/account/notices.ts`, `apps/api/src/push/` (`endpoint.ts`, `deliver.ts`, `web-push.d.ts`), las rutas de `/api/me/push-targets` y `/api/me/notices`, `noticeSweep` en `tick/main.ts` y tras cada `runTick` de `index.ts`, los avisos de seguridad en el proxy (13-k, 13-l), `apps/web/public/sw.js`, `apps/web/src/notifications/push.ts`, `AccountNotifications`, los dos `Notice` de DD-03 A, `Don't want these?`, el `Sign out` que borra antes su suscripción, y la línea de la ausencia. Sale `stageReadyEmail` con sus tres tests y el canario pasa a `noticePayload` en el mismo commit (§13.8). Es el más grande; si hace falta partirlo, 14a lleva el servidor (tabla, envío, barrido, seguridad) sin interfaz y con las VAPID sin poner, y 14b la web y las variables (18-d).

**PR 15 · `regla-del-mes` (tras E7).** Solo cuando E7 haya fijado la regla y su plazo: `away_warning` con `AWAY_WARNING_DAYS` sobre `inactiveSince`, su casilla en `Notifications`, y las frases de §14.1 y §14.5 con la cifra que ponga E7. Si E7 cambia el plazo de 30, cambian `AWAY_WARNING_DAYS` y los textos.

**PR 16 · `documentos`.** El texto de §20.2, frase por frase (D-59; I-17; O-03). Depende de los PR 5, 8, 12 y 14, porque sus textos sustitutos afirman lo que esos PR hacen verdad (el cambio de correo por un administrador, los dos correos, la última visita en toda visita, el aviso por el navegador); si algún documento no puede esperar, su corrección va en el PR que la hace verdad (18-h). `docs/visual.md` l. 3616, 3623, 3656, 3658 y 3679 y el comentario de `pageTitle.ts` l. 5 esperan a W5 o se le pasan por escrito (§20.3).

**PR 17 · `operacion`.** Solo `docs/ops.md`: lo de §9.1 (l. 106 y 108 corregidas, DKIM de 2.048 si Resend deja, `CAA`), el alta del webhook de Resend y `RESEND_WEBHOOK_SECRET`, `MAIL_DAILY_BUDGET`, las VAPID y que no se rotan, las réplicas de `web`, cuánto guarda Railway los logs, la tarea del segundo factor en el buzón de `ADMIN_EMAIL` (§8.6), el ritmo de aprobaciones de 9-b, que las invitaciones salen del buzón del dueño y no de Resend (§4.9), y las dos entradas de §20.2 sobre `docs/ops.md` que no hace el PR 16.

**PR 19 · `fin-enlaces-viejos`.** Pasados `LEGACY_LINK_GRACE_DAYS` (7) desde el despliegue del PR 8, cuando ningún enlace viejo puede seguir vivo (los de recuperación duran una hora, los de verificación un día, 5-f): `GET reset-password/:token` y `GET verify-email` salen de `AUTH_ALLOWED_PATHS`, que queda en nueve, y la web deja de leer `?token=`; `/verify-email` no pasa a `disabledPaths`, porque la usa por dentro `POST /api/account/verify-email` (8-l).

### 18.4 El grafo y lo que ve el dueño primero

```
1 pantallas                          (sin dependencias: 1 y 2)
2 dependencias -> 3 opciones -> 4 logs
                 3 opciones -> 8 enlaces -> 19 fin-enlaces-viejos (a los 7 dias)
2 dependencias -> 5 rutas (0055) -> 6 limites (0056) -> 7 correo (0057) -> 17 operacion
3 opciones     -> 6 limites
1 y 6          -> 9 edad
1, 6 y 9       -> 11 account -> 12 datos -> 13 ausencia -> 14 avisos (0058) -> 15 regla-del-mes (E7)
7 correo       -> 12 datos
8 y 14         -> 17 operacion
5, 8, 12 y 14  -> 16 documentos
```

El orden de ejecución: 1 y 2 a la vez; 3; 4, 5 y 8; 6; 7 y 9; 11; 12; 13; 14; 16 y 17; 19 a la semana del 8; 15 con E7. El 3 cierra primero los dos agujeros que ya están en producción (`00-encargo.md` §9.4); del 3 al 8 se cierran el secuestro por recuperación, la fuerza bruta, los enlaces en logs y el correo como blanco (§2.2). **Lo primero que ve el dueño**: con el 1, un 429 que dice cuánto esperar; con el 3, que recuperar la contraseña le cierra las otras sesiones; con el 5, el panel nuevo con la cola de aprobación; con el 9, la puerta de su fecha de nacimiento. **El registro está abierto hoy** (`auth.ts` l. 142 sin `disableSignUp`); desde el PR 5 quien se registra espera en `pending`, y el dueño no aprueba a nadie antes del 9 y del abogado (D-58; §4.9).

---

**Injertos aplicados.** I-17 (§18.3, PR 16).

**Objeciones resueltas.** O-03 (§18.3, PR 16), O-22 (§18.2 y §18.3: el PR 11 costeado aparte, 12 horas).

**Huecos rellenados.** H-04 (§18.3, precondición del PR 3).

**Decisiones de esta sección.**

- **18-a**, los números de PR de la síntesis se conservan; el 10 y el 18 quedan sin usar.
- **18-b**, PR 19 nuevo para quitar los enlaces viejos a los 7 días del PR 8 (duda de §5).
- **18-c**, la línea de la ausencia sobre los avisos se pinta desde el PR 14.
- **18-d**, el PR 14 se puede partir en 14a (servidor) y 14b (web y variables).
- **18-e**, el formulario de cambio de correo sale de `Account` en el PR 5, con la lista blanca, y no en el 11.
- **18-f**, total de unas 134 horas, repartidas como en la tabla; ninguna cifra medida.
- **18-g**, el PR 3 es el primer PR de seguridad y lleva los dos arreglos de producción (`00-encargo.md` §9.4); si su precondición se retrasa, `trustProxy` y `clientIp` pasan al PR 6 y los arreglos no esperan.
- **18-h**, el PR 16 depende de los PR 5, 8, 12 y 14.
- **18-i**, el registro por aprobación entra en el PR 5, con la 0055.

## 19. Riesgos del despliegue y lo que se mide

Hoy hay pocas cuentas y la que importa es la del dueño (`00-encargo.md` §9.1, punto 1: «hoy solo la suya»). Los riesgos son sobre todo suyos y del orden de los PR; lo que se mide después sirve para el día que el registro se abra por tandas.

### 19.1 Con las cuentas de hoy, por PR

| PR  | Qué le pasa a una cuenta que ya existe                                                                                                                                                                                                                                         | Cómo se cubre                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | Sus sesiones de 7 días pasan a 30 en la primera petición con más de un día (`session.mjs` l. 205 a 210). Una sesión de más de 90 días se cierra en el acto: si el dueño tiene una, entra otra vez. Un enlace de recuperación en vuelo, en claro, sigue valiendo su hora (X-21) | se dice en la descripción del PR; nada que migrar                                                                                                                       |
| 3   | Recuperar la contraseña cierra **todas** sus sesiones, también la del teléfono                                                                                                                                                                                                 | es lo buscado (D-13); el final lo dice: `You have been signed out everywhere else.`                                                                                     |
| 3   | Los dos arreglos de producción: el 200 del registro trae un cuerpo fijo y una ruta con `..` da 404                                                                                                                                                                             | ninguna cuenta lo nota: la web solo lee `result.error` (`Register.tsx` l. 119 a 127) y ninguna pantalla pide rutas con `..`                                             |
| 5   | El formulario de cambio de correo desaparece de `Account`                                                                                                                                                                                                                      | lo cambia un administrador desde el panel (§8.5); el dueño es el administrador raíz y su correo no se cambia allí                                                       |
| 5   | La 0055 añade `users.status`: toda cuenta que exista al migrar, también las registradas hasta ese día con el registro abierto, queda `approved`; desde ahí, quien se registra queda `pending` y no recibe correo hasta que un administrador lo aprueba                         | el `UPDATE` a mano de la 0055 (§15.2); `signupApproval.test.ts` comprueba que una cuenta de antes entra igual; la cuenta de `ADMIN_EMAIL` entra aprobada siempre (§4.9) |
| 6   | La 0056 pone `name = 'Player'` a todas y vacía `sessions.ip_address`: **no se puede deshacer**. Nadie lee ninguna de las dos (mapa 03 §1; D-08)                                                                                                                                | la precondición del PR 3 ya leyó la IP (H-04); el nombre no se enseña en ninguna parte (D-08)                                                                           |
| 6   | El primer navegador sin `cs_device` (todos, el día del despliegue) cuenta en L1: diez fallos de la contraseña lo cierran 15 minutos                                                                                                                                            | la primera entrada buena da la cookie; recuperar la da siempre (D-23)                                                                                                   |
| 8   | Un enlace pedido antes del despliegue (`?token=`) llega a la web nueva                                                                                                                                                                                                         | la web lee `?token=` hasta el PR 19 (`LEGACY_LINK_GRACE_DAYS`)                                                                                                          |
| 9   | **La puerta de la fecha**: al primer paso tras desplegar, el dueño ve `One more thing` y no puede escribir en `/api/riders/*` ni `/api/me/*` hasta darla. Si escribiera una fecha de menos de 16 años, la API no la guarda y le ofrece borrar la cuenta (D-09)                 | la puerta no bloquea `Sign out`, `/privacy`, `/terms` ni `/account/delete`; el dueño lo prueba primero en local                                                         |
| 11  | `Account` cambia de forma                                                                                                                                                                                                                                                      | la prueba del teléfono (§17.3)                                                                                                                                          |
| 14  | Ningún aviso sale hasta que el jugador pulsa `Turn on`; nadie está suscrito el día del despliegue                                                                                                                                                                              | nada se rompe sin VAPID; los gemelos en la web ya están                                                                                                                 |

### 19.2 El despliegue

- **Límites en memoria**: cada despliegue vacía los de Fastify (10 intentos más por IP y ruta, `security.ts` l. 54 a 68); los de `auth_limits`, en Postgres, no (§7.2). `better-auth` deja de tener limitador propio en el PR 3.
- **Réplicas de `web`** (H-03): con más de una, la capa de Fastify es «por réplica» y el tick automático corre en cada una. `runTick` es idempotente (`index.ts` l. 40 a 41) y el barrido también, por `notice_log` (§13.7). El número lo mira el dueño antes del PR 6.
- **Correos y avisos en vuelo** (H-02): `SIGTERM` espera a `mailQueue.drain()` hasta `MAIL_SHUTDOWN_GRACE_MS` (10.000). Lo perdido se ve en `email_log` como `queued` que nunca pasó a `sent`. Un aviso de seguridad perdido no se reintenta: su gemelo está en la web. Que Railway dé 10 segundos tras `SIGTERM` antes de matar el proceso **no lo sé**.
- **El tope de Resend**: con el plan gratuito, 100 al día y 3.000 al mes (mapa 02 §3). El presupuesto se queda en 90 y para los registros a 60 (§7.6); los registros gastan correo solo al aprobarlos, al ritmo de 9-b. Un atacante ya no agota el día registrándose (§4.9); recuperando, la reserva de 30 aguanta hasta que reúna 30 cuentas confirmadas o 30 correos de jugadores distintos (§7.6, 7-m).
- **La cola de aprobación**: L4 deja crear 20 cuentas `pending` al día por IP (§7.4). Una inundación llena la cola del panel y no gasta correo; se rechazan una a una. Si pasara, un botón de rechazo en bloque es trabajo nuevo, que este diseño no hace.
- **Registros con correos inventados** (H-07): uno aprobado manda un `verify_signup` que rebota, y Resend castiga por encima del 4 %. Los frenan la mano del administrador (§4.9), L4, la purga de 7 días desde la aprobación (DD-17 A) y la medida de §19.4.
- **Railway y su cabecera**: que el borde reescribe `X-Forwarded-For` con una sola IP está medido a medias (`00-encargo.md` §2.2) y no escrito en su documentación. `clientIp` no depende de ello (§7.1) y `xff_varias` avisa si cambia.
- **VAPID**: cambiar la clave rompe todas las suscripciones (mapa 02 §7). Se genera una vez y se guarda en Railway.

### 19.3 La prueba del dueño

Lo que ningún agente ha podido comprobar y se prueba en su teléfono y en su buzón al cerrar cada PR que lo toca (como `docs/visual.md` §7.7):

1. **iPhone con iOS 16.4 o más, y con el manifiesto mínimo** (PR 14; H-09; `00-encargo.md` §9.5, punto 2): en Safari, `Account › Notifications` enseña la explicación de `ios-home`; añadir la web a la pantalla de inicio, abrirla desde allí (tiene que abrirse sin la barra de Safari), entrar y pulsar `Turn on`; recibir un aviso de verdad (un `password_changed` al cambiar la contraseña desde otro aparato es el más rápido). Si hay a mano un iPhone con iOS 17 o 18, mejor ese, porque es donde el manifiesto marca la diferencia. Mirar si esa app web tiene sus propias cookies: si pide entrar otra vez, **bajo ataque es un navegador nuevo** sin `cs_device` (L1 y `new_sign_in`, §7.5), y se escribe en `docs/ops.md`. En Android, comprobar que Chrome no ofrece instalar la web (el manifiesto no lleva iconos, §13.5). Si en el iPhone no llega ningún aviso, la explicación sería falsa: se le dice al dueño y, mientras decide, `ios-home` pinta (pantalla) `Notifications don't work on iPhone and iPad yet.` / `Everything a notification would tell you is also on your Home page.` (19-a).
2. **Un buzón con escáner de enlaces** (PR 8; H-08): mandar un `verify_signup` a una dirección de Outlook o de empresa con Safe Links y mirar si la cuenta se confirma sola. Si se confirma, la página de botón no basta y se dice.
3. **Registro y recuperación en su teléfono** (PR 8 y 9): con el teclado de verdad, `DateField`, `CheckInbox`, el enlace del correo y `ResetPassword`; que ningún botón quede bajo el teclado (§12.6).
4. **Un aviso en Android y en el escritorio** (PR 14): `Turn on`, el aviso de etapa a las 19:00 locales, `Turn off these` desde el propio aviso, y que `Sign out` lo apague.

### 19.4 Lo que se mide

D-60, con lo que cambió el dueño el 23 de noviembre: sin `hibp_caido` (DD-11 C) y con los avisos de seguridad. Lo mira el dueño con consultas de solo lectura en Railway; los umbrales son de esta síntesis y **estimados**.

| Qué                                                   | Con qué                                                                         | Umbral                             | Si se pasa                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| Cuentas aprobadas sin confirmar a las 24 h            | `users.email_verified`, `approved_at`                                           | más del 30 %                       | mirar si el correo llega (spam, rebotes) antes de la siguiente tanda        |
| La cola de aprobación                                 | `users.status = 'pending'`, `created_at`                                        | más de 100, o una de más de 7 días | aprobar o rechazar; si crece sola, buscar un relleno en los logs            |
| La reserva de recuperar                               | `email_log` con `kind = 'reset_password'` por encima de 60 en el día UTC        | más de 10 en un día                | alguien la está gastando: mirar los destinatarios por su `recipient_hash`   |
| Rebotes y quejas                                      | `email_log.status` en 7 días                                                    | 4 % y 0,08 %                       | parar las tandas; mirar los dominios de los rebotes                         |
| Envíos frente al presupuesto                          | `email_log` del día UTC                                                         | 70 % de `MAIL_DAILY_BUDGET`        | tandas más pequeñas o, si se repite, DD-10 A (Pro)                          |
| Bloqueos por cuenta                                   | `auth_limits` con `acct:` y `locked_until` en el día                            | más de 5 cuentas al día            | buscar un relleno de credenciales en los logs                               |
| `xff_varias`                                          | logs de Railway                                                                 | más de 0 en una semana             | Railway cambió su borde: revisar D-21                                       |
| Suscripciones perdidas                                | filas de `push_targets` borradas por 404, 410 o tres fallos, frente a las vivas | más del 20 % a la semana           | mirar si un navegador rechaza la clave o el formato                         |
| Avisos de seguridad                                   | `notice_log` con `password_changed`, `new_sign_in` y `email_changed`            | se mira, sin umbral                | muchos `new_sign_in` de una cuenta sin cambio de contraseña: alguien la usa |
| Cuentas sin fecha de nacimiento                       | `users.birth_date` nula                                                         | más de 0 a los 30 días del PR 9    | se le cuenta a E7 y al abogado (§21.3)                                      |
| Ausencias declaradas y terminadas antes de tiempo     | `away_since`, `away_until`                                                      | se mira, para E7                   | E7 fija la regla con ellas                                                  |
| Vueltas tras más de 20 días, con y sin `away_warning` | `last_seen_at`, `welcome_back_from`, `notice_log`                               | se mira, para E7 (PR 15)           | E7 pesa el silencio total (§14.6)                                           |

---

**Injertos aplicados.** Ninguno asignado.

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** H-02 (§19.2), H-03 (§19.2), H-07 (§19.2), H-08 (§19.3), H-09 (§19.3).

**Decisiones de esta sección.**

- **19-a**, si la prueba del iPhone, ya con el manifiesto que pidió el dueño, no recibe ningún aviso, se le dice al dueño y, mientras decide, `ios-home` pinta `Notifications don't work on iPhone and iPad yet.` / `Everything a notification would tell you is also on your Home page.`: una explicación que no funciona es una pantalla que miente. Es provisional y deshace DD-04 hasta que el dueño decida; no se elige en silencio.
- **19-c**, se miden la cola de aprobación y la reserva de recuperar (más de 10 en un día).
- **19-b**, `hibp_caido` sale de lo que se mide; entra el recuento de avisos de seguridad, sin umbral.

## 20. Fronteras y documentos que hay que corregir

### 20.1 Las fronteras

| Con                   | Es de E4                                                                                                                                                                                                                                         | No es de E4                                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2 · la retransmisión | cuándo, a quién, con qué tope y con qué baja sale el aviso de etapa; `stage_digest` y `stage_ready`; el canario mira `noticePayload`; `last_seen_at` en toda visita; la sesión de 30 días                                                        | el texto (`stageReadyNotice`), `Ready to watch`, `While you were away`, `Watch`, el velo                                                                                                                                                                                     |
| E7 · el gobierno      | `away_since`, `away_until`, `inactiveSince`, `isAway`, `manual` como `mixto` mientras dura, `away_warning` y las frases de la regla; el sitio del moderador en `admin_audit` y `GET /api/admin/audit`; `users.status` con `pending` y `approved` | la regla del mes y su plazo, qué es «pasar a bot», la silla del mánager, G8, la ausencia larga o encadenada, el papel de moderador, suspender una cuenta (el `disabled` de `twilightstruggle`), «una cuenta por persona» y cerrar la cuenta que rompe las condiciones (§4.6) |
| E8 · la economía      | nada: `premium` sigue en `users` y E4 no lo toca                                                                                                                                                                                                 | vender el premium                                                                                                                                                                                                                                                            |
| E9 · entre personas   | que un aviso nuevo entre por `NOTICE_CATALOG` con sus preferencias, su tope y su silencio                                                                                                                                                        | el chat, la negociación y sus avisos; si una ausencia se ve desde fuera (O-07)                                                                                                                                                                                               |
| E10 · el multiidioma  | `users.locale` de `Accept-Language` al registrarse; `users.time_zone` de los avisos; textos en inglés                                                                                                                                            | traducir la interfaz, los dos correos y los avisos                                                                                                                                                                                                                           |
| W5 · `Watch`          | nada de `packages/shared/src/broadcast/` ni de `docs/visual.md`: lo que haya que cambiar allí se le pasa por escrito (§20.3)                                                                                                                     | `Watch`, `pageTitle.ts`, `visual.md`, el CI                                                                                                                                                                                                                                  |
| La app                | `push_targets` con su canal, la carga con `path`, `POST /api/me/push-targets`, la misma cuenta y sus sesiones (§13.9)                                                                                                                            | construirla, su tecnología y su fecha (D-00d)                                                                                                                                                                                                                                |
| El motor              | nada: `ENGINE_VERSION` sigue en 91                                                                                                                                                                                                               | todo                                                                                                                                                                                                                                                                         |

### 20.2 Los documentos que hay que corregir (PR 16, salvo `docs/ops.md`, PR 17)

Cada frase que hoy declara un estado falso, con el texto que la **sustituye**, entero (D-59; I-17; O-03). Son cinco del correo de juego (X-17: el sexto, en `00-encargo.md` l. 202 y 206, ya está corregido), los de «no hay recuperación», los de «no hay última visita», los del aviso al teléfono «con la app» y los de `docs/ops.md` sobre el correo y el panel. Las líneas son las de hoy; si se han movido, manda la frase citada. El PR 16 depende de los PR 5, 8, 12 y 14 (18-h).

1. **`docs/agenda.md` l. 313 a 315**, «**avisar** (correo, y a medio plazo notificación web, con el flujo separado del transaccional según 3.2)». Sustituye: «**avisar** (por notificación del navegador y, cuando exista, de la app; nunca por correo, que se queda en lo transaccional de la cuenta, por decisión del dueño del 19 de noviembre de 2026: `docs/cuenta.md` §13)».
2. **`docs/agenda.md` l. 665 a 668**, «Un correo a los veinte días diciendo […] son el mismo correo.» Sustituye: «Un aviso del navegador o de la app a los veinte días diciendo «si no entras, tu corredor pasa a manos del entrenador el día tal» es el mejor recordatorio que este juego puede mandar: no es publicidad, es una consecuencia real y suya. Solo llega a quien aceptó los avisos; para el resto, la regla se enseña en la web (`docs/cuenta.md` §14.5), y quien no aceptó avisos ni vuelve no recibe nada antes de que actúe (§14.6). No hay correo de juego.»
3. **`docs/agenda.md` l. 615 a 616**, «**no hay ni un solo rastro de actividad**. Ni `last_seen`, ni `last_login`, ni nada equivalente en `users` ni en `riders`.» Sustituye: «Hasta E2 no había ni un solo rastro de actividad. Desde la migración 0048 existe `users.last_seen_at`, escrita como mucho una vez por hora, y desde E4 en toda visita con sesión (`docs/cuenta.md` §10.6).»
4. **`docs/agenda.md` l. 688 a 691**, «empezar a **registrar la última visita**. Hoy no existe […]». Sustituye: «**registrar la última visita**, que ya se hace: `users.last_seen_at` desde E2 (0048) y en toda visita desde E4. El historial empieza el día que E2 entró en producción y no se reconstruye hacia atrás.»
5. **`docs/encargos.md` l. 312 a 316**, «hoy una contraseña perdida es un corredor perdido […] el camino clásico para secuestrar una cuenta.» Sustituye: «cuando se escribió este encargo, una contraseña perdida era un corredor perdido. Hoy hay verificación obligatoria del correo, recuperación de la contraseña y solo dos correos de cuenta; el cambio de correo lo hace un administrador desde el panel y queda escrito (`docs/cuenta.md` §1, §5 y §8.5).»
6. **`docs/encargos.md` l. 439 a 441**, «No existe ni un solo rastro de actividad en la base de datos […] así que **el mundo no sabe quién lo ha abandonado**.» Sustituye: «Desde E2 existe `users.last_seen_at` y desde E4 se escribe en toda visita, así que el mundo ya sabe cuándo entró cada uno por última vez; lo que no sabe es qué hacer con el que no vuelve.»
7. **`docs/encargos.md` l. 446**, «que se **avise por correo antes** de que ocurra». Sustituye: «que se **avise antes** de que ocurra por notificación del navegador o de la app, nunca por correo (decisión del dueño del 19 de noviembre de 2026), y que quien no tenga avisos lo vea en la web al volver (`docs/cuenta.md` §14)».
8. **`docs/encargos.md` l. 773 a 775**, el punto «**Empezar a registrar la última visita** (`last_seen`). Hoy no existe […]». Sustituye: «**Registrar la última visita**: hecho (`users.last_seen_at`, E2; en toda visita, E4).»
9. **`docs/encargos.md` l. 776 a 778**, «porque hoy no hay recuperación de contraseña (E4)». Sustituye: «porque el correo va en el plan gratuito de Resend y las cuentas nuevas las aprueba un administrador por tandas pequeñas, y porque la edad mínima se confirma con un abogado antes de aprobar a nadie (`docs/cuenta.md` §4.9, §9.4 y §21.3)».
10. **`docs/epics.md` l. 603 a 610** (G11), «**Lo que hay hoy, y es un agujero de verdad.** […] el camino clásico para secuestrar una cuenta.» Sustituye: «**Lo que había antes de E4.** `better-auth` corría sin enviar un solo correo: nadie verificaba el correo, una contraseña perdida era una cuenta perdida y el cambio de correo se aplicaba sin confirmar. Hoy salen dos correos (confirmar el registro y recuperar la contraseña) y el cambio de correo lo hace un administrador (`docs/cuenta.md` §1).»
11. **`docs/captacion.md` l. 26 a 28**, «Hoy `better-auth` corre sin enviar un solo correo […] pierde su corredor y no hay nada que hacer.» Sustituye: «Hay verificación del correo y recuperación de la contraseña, pero el correo va en el plan gratuito de Resend (100 al día): quien se registra espera a que un administrador lo apruebe, y se aprueba por tandas pequeñas (`docs/cuenta.md` §4.9 y §9.4).»
12. **`docs/captacion.md` l. 214 a 216**, «hoy **no hay recuperación de contraseña**, así que con un grupo pequeño se resuelve a mano, pero conviene tener E4 antes de que sean cincuenta.» Sustituye: «la recuperación de la contraseña ya existe; lo que limita es el plan gratuito de correo, y por eso las aprobaciones van por tandas de 25 a 50 al día; las invitaciones las mando yo desde mi buzón (`docs/cuenta.md` §4.9 y §9.4).»
13. **`docs/captacion.md` l. 263 a 264**, «**No abrir el registro directo** hasta que exista recuperación de contraseña (E4).» Sustituye: «**El registro es por aprobación**: quien se registra espera a que un administrador lo apruebe, por tandas mientras el correo esté en el plan gratuito, y nadie se aprueba antes de confirmar la edad mínima con un abogado (`docs/cuenta.md` §4.9, §9.4 y §21.3).»
14. **`docs/retransmision.md` l. 12895**, la fila DD-10: en la segunda columna, «El aviso de «lista para ver»»; en la tercera, «por notificación del navegador y de la app con `stageReadyNotice`; ningún correo de juego (E4, `docs/cuenta.md` §13)»; en la cuarta, «quien acepta los avisos recibe uno al día como mucho; quien no, lo ve en `Ready to watch`»; en la quinta, «E4, PR 14»; en la sexta, «`stageReadyEmail` se borró con sus tests; el canario mira `noticePayload`».
15. **`docs/retransmision.md` l. 13004**, «**DD-10, el correo sin enviar.** […]». Sustituye: «**DD-10, el aviso de etapa lista.** E4 lo manda por notificación del navegador y de la app, nunca por correo (`docs/cuenta.md` §13.1); la decisión de enviar no mira el resultado (D-42) y el canario renderiza `noticePayload` (§13.8).»
16. **`docs/ops.md` l. 106 a 109**, los registros de Resend. Sustituye la lista por lo que dice el DNS de hoy (§9.1): `send.cyclingstar.app` y `rsend.cyclingstar.app` como `CNAME` hacia Resend, el `TXT` de DKIM en `resend._domainkey` y DMARC en `_dmarc` con `p=none`, puesto y sin informes (DD-15 C). Lo hace el PR 17 y no el 16, porque es operación (§18.3).
17. **`docs/ops.md` l. 87 a 99**, desde «La app manda tres correos, todos de better-auth» hasta «no el navegador.». Sustituye: «La app manda dos correos, los dos de better-auth: confirmar la dirección al terminar el registro y recuperar la contraseña. Salen por la API HTTP de Resend (`apps/api/src/mailer.ts`), sin SDK. **El registro es por aprobación**: quien se registra queda pendiente y no recibe nada hasta que un administrador lo aprueba en el panel; al aprobar sale el correo para confirmar la dirección, y abrirlo confirma y abre la sesión. **Confirmar el correo es obligatorio para entrar** (`requireEmailVerification`): quien intenta entrar con una cuenta aprobada sin haber confirmado recibe un 403 y, en ese momento, un enlace nuevo. Por eso, **sin Resend configurado nadie nuevo puede entrar**: en local, el enlace no sale y hay que marcar `users.email_verified` a mano. El jugador no cambia su correo: lo cambia un administrador desde el panel, sin mandar correo, y queda escrito (`docs/cuenta.md` §4.9, §5.5 y §8.5).» Lo hace el PR 17, que es operación, con los PR 5 y 8 ya fusionados.
18. **`docs/ops.md` l. 136 a 141**, desde «Desde **Account → Admin panel**» hasta «y borrar al raíz.». Sustituye: «Desde **Account → Admin panel** (el enlace sólo aparece a los admins): arriba, la cola de cuentas que esperan aprobación, con `Approve` y `Reject`; después, la lista de cuentas con buscador por correo; por cuenta, confirmar el correo a mano, dar o quitar premium, dar o quitar admin, cambiar el correo, cambiar la fecha de nacimiento, cambiar el nombre del equipo (también desde la página del equipo, para los equipos sin dueño) y borrarla (su corredor y su equipo pasan a NPC). Debajo, `Recent changes`: cada edición de un administrador queda en `admin_audit` con el valor viejo y el nuevo. La API impide quitarse el admin a uno mismo, borrarse desde el panel (eso se hace en Account, con contraseña), borrar al raíz, cambiarle el correo, la confirmación, el papel o la fecha, y dar a otra cuenta el correo de `ADMIN_EMAIL` (`docs/cuenta.md` §8.5).» PR 17.
19. **`docs/encargos.md` l. 252 a 254**, «no hay web instalable, porque habrá app, y el aviso al teléfono de E4 llegará con ella.» Sustituye: «no hay web instalable, porque habrá app. El aviso al teléfono de E4 llega ya por el navegador (en iPhone, con la web en la pantalla de inicio, gracias a un manifiesto mínimo que no la hace instalable) y llegará también por la app cuando exista (`docs/cuenta.md` §13).»
20. **`docs/encargos.md` l. 320 a 324**, «Dos decisiones de infraestructura van dentro y no se saltan: separar el correo TRANSACCIONAL del de NOTIFICACIÓN en subdominios distintos desde el primer día […]». Sustituye: «Dos decisiones de infraestructura iban dentro: separar el correo transaccional del de notificación y calentar el dominio. La primera ya no hace falta, porque no hay correo de notificación (decisión del dueño del 19 de noviembre de 2026); lo que haría falta el día que lo hubiera está en `docs/cuenta.md` §9.6. La segunda se hace con las tandas de aprobación (§9.4).»
21. **`docs/encargos.md` l. 326 a 328**, «la notificación no es solo correo, es también **aviso al teléfono**, que llegará con la app (el dueño retiró la web instalable de E3, D-00p de `docs/visual.md`)». Sustituye: «la notificación no es correo: es el **aviso del navegador**, que E4 manda también al teléfono (en iPhone, con la web en la pantalla de inicio), y el de la app cuando exista (`docs/cuenta.md` §13)».
22. **`docs/agenda.md` l. 155 a 156**, «Y sigue en pie lo único que de verdad importa aquí: **separar el correo transaccional del de notificación** desde el primer día, aunque al principio solo exista el primero.» Sustituye: «La separación del correo transaccional y el de notificación ya no es urgente: no habrá correo de notificación (decisión del dueño del 19 de noviembre de 2026). Lo que haría falta el día que lo hubiera, en `docs/cuenta.md` §9.6.»
23. **`docs/agenda.md` l. 567 a 568**, «El aviso al teléfono de E4 llegará con la app». Sustituye: «El aviso al teléfono de E4 llega por el navegador, también en iPhone con la web en la pantalla de inicio (`docs/cuenta.md` §13), y llegará por la app cuando exista».
24. **`docs/ops.md` l. 271 a 272**, «(la IP transitoria de geolocalización no se persiste; el correo se usa para la cuenta)». Sustituye: «(la IP no se guarda con la cuenta, sí en los logs de Railway durante `<N>` días; el correo solo sirve para confirmar el registro y recuperar la contraseña: `docs/cuenta.md` §10.1)».

### 20.3 Lo que se le pasa a W5 por escrito

W5 edita `packages/shared/src/broadcast/`, `docs/visual.md` y el CI (`00-encargo.md` l. 298 a 300), y E4 no los toca (H-16). Si W5 ha terminado cuando llegue el PR 16, lo aplica el 16; si no, se le pasa esto:

1. **`packages/shared/src/broadcast/pageTitle.ts` l. 5**, el comentario «y el correo de etapa lista (`stageReadyEmail`, 11-d)». Sustituye: «y el aviso de etapa lista (`noticePayload`, `docs/cuenta.md` §13.8)». Huérfano desde el PR 14.
2. **`docs/visual.md` l. 3623**, la fila E4 de la tabla de fronteras. En la segunda columna: «un service worker solo de avisos, sin `fetch` y sin caché, y un manifiesto mínimo sin iconos, que no hacen la web instalable (`docs/cuenta.md` §13.5); en iPhone, el aviso llega a quien añade la web a la pantalla de inicio con iOS 16.4 o más, y la web se lo explica». En la tercera: «la notificación de E4 es la del navegador y, cuando exista, la de la app; nunca el correo».
3. **`docs/visual.md` l. 3656**, «ni service worker». Sustituye: «ni service worker de caché o de instalación (E4 añade uno solo de avisos, sin `fetch` ni caché, y un manifiesto mínimo sin iconos para que el iPhone reciba avisos, que D-00p no prohíbe: `docs/cuenta.md` §13.5)».
4. **`docs/visual.md` l. 3616**, «el aviso al teléfono de E4 pasa a la app que hará el dueño». Sustituye: «el aviso al teléfono de E4 llega por el navegador, también en iPhone con la web en la pantalla de inicio (`docs/cuenta.md` §13), y por la app cuando exista».
5. **`docs/visual.md` l. 3658**, «**El aviso al teléfono** (E4): pasa a la app, porque en iPhone pedía la web añadida a la pantalla de inicio.» Sustituye: «**El aviso al teléfono** (E4): llega por el navegador; en iPhone, con la web añadida a la pantalla de inicio y un manifiesto mínimo que no la hace instalable (`docs/cuenta.md` §13.4 y §13.5). La app, cuando exista, es un canal más.»
6. **`docs/visual.md` l. 3679**, «(el aviso al teléfono de E4, a la app; la venta del premium, de E8)». Sustituye: «(el aviso al teléfono de E4, que E4 manda por el navegador y más tarde por la app; la venta del premium, de E8)».

---

**Injertos aplicados.** I-17 (§20.2).

**Objeciones resueltas.** O-03 (§20.2), O-07 (§20.1: E9).

**Huecos rellenados.** H-16 (§20.3, punto 1).

**Contradicciones.** X-17 (§20.2: quedan cinco del correo de juego).

**Decisiones de esta sección.**

- **20-a**, `docs/ops.md` (l. 87 a 99, 106 a 109 y 136 a 141) la corrige el PR 17 (`operacion`) y no el 16, porque es el documento de operación; el 17 va después de los PR que hacen verdad sus frases.
- **20-d**, entran en la lista las frases del aviso al teléfono «con la app» de `encargos.md`, `agenda.md` y `visual.md`, y la separación de flujos de `encargos.md` l. 320 a 324 y `agenda.md` l. 155 a 156 (mapa 04 §6.1 y §6.3).
- **20-b**, `captacion.md` l. 213 a 216 se cita desde l. 214, donde empieza la frase falsa.
- **20-c**, el moderador entra en la fila de E7: E4 deja su sitio en `admin_audit` y en `GET /api/admin/audit` (§8.5).

## 21. Decisiones del dueño

Las diecisiete `DD-nn` de `00-decisiones.md` están **contestadas**: seis preguntas el 19 de noviembre de 2026 (`00-encargo.md` §9.1, l. 304 a 353), diez el 23 (§9.2, l. 355 a 394), las dos que quedaban el mismo 23 (§9.3, l. 396 a 408), y otras tres ese día, ya con las refutaciones delante (§9.4 y §9.5, l. 410 a 430): los dos fallos de producción, las tandas y el iPhone. Se escriben como contestadas, con su cita textual y lo que deciden. Lo que de verdad queda abierto está en §21.4, y lo que pide un abogado, en §21.3. Una decisión contestada se puede cambiar: cada fila dice qué cambia y antes de qué PR hay que saberlo.

### 21.1 Las que se miraron en la página de opciones (DD-01 a DD-08)

| DD    | Qué                       | Respuesta (23 de noviembre de 2026; `00-encargo.md`)                                                              | Lo que queda decidido                                                                                                                                                                                                                                | Si cambiara                                                                                 | Antes del PR |
| ----- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------ |
| DD-01 | TOTP del panel            | «Ok. Mira como resolví eso en hereistand y en twikightstruggle.app y me gustaría que sea parecido» (l. 360 a 361) | **A, sin TOTP**, y el panel como `twilightstruggle` y `his`: raíz fijo por `ADMIN_EMAIL`, nadie se quita su papel, cada edición escrita con el valor viejo y el nuevo (§8.5)                                                                         | B sería el plugin `twoFactor` sin `sendOTP`, la 0059 y un PR más (§8.6); hoy no existe      | 5            |
| DD-02 | Avisos de serie           | «Esos avisos son pushup notification? Si es así, ok» (l. 370 a 371)                                               | **A, solo por push**: `stage_digest`, `plan_ending`, `offer_received`, `away_warning`, `away_over`; `stage_ready` apagado (§13.1)                                                                                                                    | B (solo los dos de la ausencia) o C (también `stage_ready`): una línea de `NOTICE_DEFAULTS` | 14           |
| DD-03 | Cuándo se pide el permiso | «ok» (l. 372)                                                                                                     | **A**: tras crear el corredor, al seguir una carrera y siempre en `Account` (§13.3)                                                                                                                                                                  | B (solo en `Account`) quita dos `Notice`; C añade la portada a la tercera visita            | 14           |
| DD-04 | El iPhone                 | «si detecta que es un iPhone, que permita pero explique cómo hacerlo» (l. 373 a 376)                              | **Se detecta el iPhone y se explica la pantalla de inicio**, como `twilightstruggle` (`ai/ui/src/online/push.ts` l. 47 a 55 y 229 a 231), **con un manifiesto mínimo** sin iconos para que valga desde iOS 16.4 («ok», §9.5, punto 2; §13.4 y §13.5) | sin manifiesto, solo iOS 26 o más; con iconos, la web sería instalable y chocaría con D-00p | 14           |
| DD-05 | Pantalla de ausencia      | por defecto: «ok pero cuando dices correo... Sin correo, solo notificación push» (l. 385 a 388)                   | **A**: atajos, fecha, líneas calculadas y `AwayBand` (§14.1)                                                                                                                                                                                         | B (solo la fecha) quita la tabla de líneas; C quita la banda                                | 13           |
| DD-06 | Pantalla de sesiones      | por defecto (l. 385)                                                                                              | **A**: lista sin IP (§6.4)                                                                                                                                                                                                                           | B volvería a guardar la IP y cambiaría Privacy; C, solo el número y el botón                | 11           |
| DD-07 | `Account`                 | por defecto (l. 385)                                                                                              | **A**: lista con subpáginas (§12.1)                                                                                                                                                                                                                  | B, una página con paneles (§12.1)                                                           | 11           |
| DD-08 | Presentación de Privacy   | por defecto (l. 385)                                                                                              | **A**: todo a la vista, por apartados (§10.1)                                                                                                                                                                                                        | B, tabla; C, resumen y detalle plegado                                                      | 3            |

### 21.2 Las demás (DD-09 a DD-17)

| DD    | Qué                          | Respuesta                                                                                                                         | Lo que queda decidido                                                                                                                                               | Si cambiara                                                                                 | Antes del PR |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------ |
| DD-09 | Qué se guarda de la fecha    | por defecto (l. 385)                                                                                                              | **A**: la fecha entera (§4.3)                                                                                                                                       | B, el año: otra columna y volver a preguntar si la edad mínima cambia                       | 9            |
| DD-10 | Plan de Resend               | «de momento nos quedamos en el gratis y abrimos registro por tandas pequeñas» (l. 378)                                            | **B**: plan gratuito, `MAIL_DAILY_BUDGET` 90, tandas (§9.4, 9-b); el mecanismo de las tandas es el registro por aprobación (§9.5, punto 1; §4.9)                    | A (Pro, 20 USD al mes): `MAIL_DAILY_BUDGET` sube; la aprobación sigue si el dueño la quiere | 5            |
| DD-11 | Contraseñas filtradas        | «no entraría ahí... Si alguien quiere usar una pass comprometida aqui pues allá el» (l. 383 a 384)                                | **C**: sin comprobación; el PR 10 no existe (§7.7)                                                                                                                  | A volvería a ser `hashPasswordWithHibp` y un PR de unas 2 horas                             | ninguno      |
| DD-12 | Ausencia máxima              | «ok 28 días reales» (l. 377)                                                                                                      | **28 días** (`AWAY_MAX_DAYS`)                                                                                                                                       | otra cifra es una constante; más de 30 pisa la regla del mes de E7                          | 13           |
| DD-13 | Condiciones de uso           | por defecto (l. 385)                                                                                                              | **A**: línea bajo el botón y versión guardada (§4.6); a confirmar con un abogado                                                                                    | B, casilla obligatoria                                                                      | 9            |
| DD-14 | Equipo de quien se borra     | «dejamos el que puso, pero un admin o moderador podria modificarlo siempre (especialmente si es algo inapropiado)» (l. 379 a 382) | **B y el panel**: el equipo conserva su nombre y un administrador lo cambia siempre con `PATCH /api/admin/teams/:id` (§8.5, §10.4); el moderador, cuando E7 lo cree | A, nombre generado al borrar                                                                | 5, 12        |
| DD-15 | Destino de DMARC             | «No sabia que se podia hacer eso... pero ok, de momento lo dejamos» (l. 407 a 408)                                                | **C**: sin informes; DMARC se queda en `p=none` (§9.1, 9-a)                                                                                                         | A o B: un `rua` y, con informes limpios, `quarantine`                                       | 17           |
| DD-16 | Aviso de entrada nueva       | «Sin correo, solo notificación push» (l. 385 a 388)                                                                               | **A por push**: `new_sign_in` siempre, uno por hora, sin interruptor (§7.5, §13.1)                                                                                  | B, con interruptor (una línea de `NOTICE_CATALOG`); C, sin aviso                            | 14           |
| DD-17 | Purgar cuentas sin confirmar | por defecto (l. 385)                                                                                                              | **A**: a los 7 días de aprobada, sin confirmar y sin corredor ni equipo (§15.4); las `pending` no se purgan (9-g)                                                   | B: sin purga; los registros inventados se quedan                                            | 12           |

Y dos que no eran `DD` y el dueño cerró el mismo día (§9.3, l. 398 a 406): **solo dos correos**, «Solo correo para forgot password y para acabar el registro (igual que en el de Twilight Stuggle)», y **sin cambio de correo de autoservicio**: lo hace un administrador desde el panel, «si, esta bien asi». Con ellas desaparecen ocho correos, el deshacer de 72 horas y `change-email` de la lista blanca (§5, §8.1).

Y las tres del final del 23 de noviembre (`00-encargo.md` §9.4 y §9.5), contestadas:

| Qué                                                                                                                                                                | Respuesta (23 de noviembre de 2026; `00-encargo.md`)             | Lo que queda decidido                                                                                                                                                                                                                                            | Antes del PR |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Los dos fallos que ya están en producción (el cuerpo del 200 del registro delata la cuenta; una ruta con `..` salta el límite estricto), ¿en un PR urgente aparte? | «no, primero el plan de E4» (§9.4, l. 410 a 416)                 | **Entran en el PR 3, el primer PR de seguridad del plan** (§5.3, §7.2, §18.3, 18-g); no hay PR urgente aparte                                                                                                                                                    | 3            |
| El registro por tandas, como en `twilightstruggle`                                                                                                                 | «Ok, si, de momento hagamos igual» (§9.5, punto 1, l. 420 a 425) | **Registro por aprobación**: quien se registra queda `pending`, un administrador aprueba desde el panel a su ritmo, y al aprobar sale `verify_signup`, que es el correo para terminar el registro; el administrador de `ADMIN_EMAIL` entra aprobado (§4.9, PR 5) | 5            |
| El iPhone: un manifiesto mínimo como el de `twilightstruggle`                                                                                                      | «ok» (§9.5, punto 2, l. 426 a 429)                               | **Manifiesto mínimo sin iconos**, solo para que el iPhone reciba avisos desde iOS 16.4 con la web en la pantalla de inicio; nada más de lo que quitó D-00p: ni sin red, ni caché, ni ofrecer instalar (§13.5)                                                    | 14           |
| Lo demás del refutador de cobertura                                                                                                                                | «Ok» (§9.5, punto 3, l. 430)                                     | lo arregla el corrector (`refutaciones/correcciones.json`)                                                                                                                                                                                                       | ninguno      |

### 21.3 La lista para el abogado (H-17)

Nada de esto se dictamina aquí. Va entera a un abogado antes de abrir el registro, es decir, antes de aprobar a nadie (§4.9; D-00a; `agenda.md` §3.7):

1. La edad mínima de 16 años, declarada con la fecha de nacimiento y sin comprobarla (§4).
2. La línea bajo el botón frente a una casilla (DD-13), y el texto de `/terms`, que está en borrador (§4.6); y si hacen falta las dos reglas que el borrador quitó por ser de E7, «una cuenta por persona» y cerrar la cuenta que rompe las condiciones.
3. El menor que ya está registrado y el que se descubre después: qué hacer con sus datos, y que sin canal de contacto nadie puede avisar de uno (§4.5; §11.1; H-11).
4. Que el equipo de quien borra su cuenta conserve el nombre que puso, que puede ser un dato personal (DD-14 B).
5. Un aviso de privacidad sin responsable ni contacto: «We don't offer a contact channel yet.» (§10.1, 11-c).
6. Los plazos: logs de Railway con la IP entera `<N>` días, copias de 14 días si el cron corre (§10.1), `email_log` 90 días.
7. La exportación en JSON como respuesta al derecho de acceso, y el borrado de autoservicio como respuesta al de supresión (§10.4 y §10.5).
8. Que un administrador cambie el correo de una cuenta sin avisar a ninguna de las dos direcciones (§8.5), y que eso quede escrito en `admin_audit` con el correo viejo y el nuevo hasta que la cuenta se borra.
9. La dirección del servicio de push y la zona horaria como datos personales (§10.1).
10. La base legal de todo lo anterior, que Privacy no nombra.
11. El registro por aprobación: que se borre sin aviso la petición rechazada (§4.9) y que un administrador pueda cambiar la fecha de nacimiento declarada (§8.5).

### 21.4 Lo que sigue abierto

Lo decidió la síntesis, no el dueño. Si no dice nada, se queda así.

1. **Las reglas de E7 que `/terms` no lleva** (§4.6): «una cuenta por persona» y que un administrador cierre una cuenta que rompe las condiciones. Nadie las ha decidido; las decide E7 con el dueño, y van también a la lista del abogado (§21.3, punto 2).
2. **Los avisos de seguridad fuera del tope, del silencio y de la ausencia** (13-a). Un cambio de contraseña a las 3 de la madrugada suena a las 3. Alternativa: que esperen al silencio como los demás. **Recomendación: que suenen**, porque solo suenan si alguien entró o cambió la contraseña. Antes del PR 14.
3. **El silencio de 22 a 8** y **el resumen a las 19** (D-43; O-06), en la hora del navegador. Cambiar las cifras es cambiar dos constantes.
4. **La sesión de 30 días renovables y su techo de 90** (D-17), frente a los 7 de hoy: más días, menos veces la contraseña en un sitio raro, y más vida para una cookie robada, que `Devices` deja cerrar.
5. **Los enlaces**: 24 horas el de confirmar y una hora el de recuperar (D-11).
6. **El ritmo de las tandas**: 25, 40 y como mucho 50 aprobaciones al día (9-b), estimadas con uno o dos correos por cuenta aprobada. El mecanismo lo decidió el dueño (§21.2); las cifras, la síntesis.
7. **La consecuencia para E7 de no mandar correo de juego** (H-14): quien no aceptó los avisos o tiene un iPhone en una pestaña, y no vuelve, no recibe nada antes de que actúe la regla del mes (§14.6). El dueño lo decidió («No, como mucho notificadores de browser y app», l. 313 a 315); lo que queda es que E7 lo pese al fijar el plazo y lo que pasa al que vuelve el día 31.

Y lo que el dueño mira en sus paneles, sin decidir nada: el resultado de la consulta de la precondición del PR 3, las réplicas de `web` (PR 6), cuánto guarda Railway los logs (PR 4), si corre el cron de copias (PR 12) y si Resend deja un DKIM de 2.048 (PR 17).

---

**Injertos aplicados.** I-21 (§21.1, DD-04: la explicación la pidió el dueño; lo que I-21 dejaba, nada fuera de `Notifications`, se queda).

**Objeciones resueltas.** O-06 (§21.4, puntos 3 y 4).

**Huecos rellenados.** H-11 (§21.3, punto 3), H-14 (§21.4, punto 7), H-17 (§21.3).

**Decisiones de esta sección.**

- **21-a**, las diecisiete `DD` se escriben como contestadas; DD-05 a DD-09, DD-13 y DD-17 por el «ok» al resto del punto 9 de §9.2, y DD-16 por push.
- **21-b**, la lista del abogado gana el cambio de correo por un administrador (punto 8) y pierde las contraseñas filtradas.
- **21-c**, §9.4 y §9.5 del encargo se escriben como contestadas, con su cita; el manifiesto sale de lo abierto (§21.4) porque el dueño lo decidió, y su sitio lo ocupan las reglas de E7 que `/terms` no lleva.

## 22. Apéndices

### 22.1 Los injertos y dónde cayeron

Los veintinueve de `juicios/veredicto.json`. Tres no se aplicaron porque el dueño decidió lo contrario después del veredicto (`00-encargo.md` §9.2 y §9.3, 23 de noviembre de 2026); uno se aplicó al revés. El ensamblador completa la tabla con lo que diga cada bloque de cierre.

| Id   | Qué                                                                   | Dónde                                                                            |
| ---- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| I-01 | la SSRF de los avisos: `isAllowedPushEndpoint` al guardar y al enviar | §13.6 (con la lista de `twilightstruggle`, 13-j)                                 |
| I-02 | `notificationclick` solo al propio origen                             | §13.5                                                                            |
| I-03 | un tercero nunca bloquea al dueño; recuperar da `cs_device`           | §5.4, §7.5                                                                       |
| I-04 | la página de botón y el token en el fragmento                         | §5.2                                                                             |
| I-05 | el panel raíz con correo fijo y `admin_audit`                         | §8.5, sin TOTP                                                                   |
| I-06 | la lista blanca con su test                                           | §8.1                                                                             |
| I-07 | las opciones medidas de `better-auth`                                 | §5.1, §5.4, §6.2, §7.2, §8.1                                                     |
| I-08 | `trustProxy` por función                                              | §7.1                                                                             |
| I-09 | la fecha validada antes de buscar el correo                           | §4.2                                                                             |
| I-10 | el borrado atómico                                                    | §10.4                                                                            |
| I-11 | el techo de 90 días y sin `cookieCache`                               | §6.1                                                                             |
| I-12 | la reserva antes de comprobar                                         | §7.3                                                                             |
| I-13 | topes por destinatario y presupuesto                                  | §7.4, §7.6, §9.4 (sin el corte al 70 %)                                          |
| I-14 | los correos nuevos de cuenta con sus topes                            | **no aplicado** (§9.3 del encargo); queda `new_sign_in` como aviso, §13.1        |
| I-15 | el cambio de correo con contraseña                                    | **no aplicado**: sin cambio de correo de autoservicio                            |
| I-16 | `manual` como `mixto` durante la ausencia                             | §14.2                                                                            |
| I-17 | el PR de documentos con su texto                                      | §18.3 (PR 16), §20.2                                                             |
| I-18 | «ninguno de seguridad va por aviso»                                   | **al revés**: §3 (principio 2) y §13.1, la seguridad va por push                 |
| I-19 | `inactiveSince` y la visita como «login»                              | §10.6, §14.4                                                                     |
| I-20 | retirar las promesas de contacto                                      | §11                                                                              |
| I-21 | el iPhone sin instrucción por defecto                                 | §13.4, sustituido por el dueño (DD-04); se queda «nada fuera de `Notifications`» |
| I-22 | la exportación                                                        | §10.5                                                                            |
| I-23 | contraseñas filtradas                                                 | **no aplicado** (DD-11 C)                                                        |
| I-24 | `get-session` sin token                                               | §6.3                                                                             |
| I-25 | `Sign out` y cerrar sesión borran la suscripción                      | §6.5, §13.4                                                                      |
| I-26 | DKIM, `CAA` y `docs/ops.md`                                           | §9.1, sin `rua` (DD-15 C)                                                        |
| I-27 | la purga y el calentamiento                                           | §9.5, §15.4                                                                      |
| I-28 | `name` y `image` en el registro                                       | §4.7                                                                             |
| I-29 | `offer_received`                                                      | §13.1                                                                            |

### 22.2 Las objeciones y lo desestimado

**Objeciones** (`O-nn` de `veredicto.json`), todas resueltas: O-01 §8.5 y §8.6 · O-02 §14.2 · O-03 §18.3 y §20.2 · O-04 §5.7, §7.4, §7.6 y §9.4 · O-05 §4.7, §10.1 y §13.2 · O-06 §6.1, §12.1, §13.2 y §21.4 · O-07 §14.6 y §20.1 · O-08 §13.4 · O-09 §5.1 · O-10 §6.1 · O-11 §13.7 · O-12 §13.6 · O-13 §7.1 · O-14 §7.3 · O-15 §7.3 y §7.5 · O-16 §5.4 y §7.5 · O-17 §5.5 (sin autoservicio no hay aprobación que pulsar) · O-18 §5.6 · O-19 §13.4 y §13.5 · O-20 §6.2 · O-21 §8.1 · O-22 §12.1 y §18.2 · O-23 §14.1 · O-24 §10.5 · O-25 §10.4.

**Lo desestimado por la síntesis**, con su razón:

| Propuesta                                               | Por qué no                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Un tope diario de registros                             | sería un apagado del registro a disposición de cualquiera (seguridad; §9.5)                                 |
| El limitador de `better-auth` con `storage: 'database'` | sigue viendo solo `<ip>\|<ruta>` y tiene la carrera de `GHSA-44jh-23m7-hpcf` (mapa 01 §8; §7.2)             |
| `cookieCache`                                           | una sesión cerrada seguiría valiendo hasta un minuto, también la que recuperar acaba de cerrar (X-13; §6.1) |
| Anular el enlace anterior al pedir otro                 | un tercero mataría el enlace del dueño pidiendo otro; los enlaces mueren cuando otro se usa (X-03; D-11)    |
| Guardar solo el año de nacimiento                       | DD-09 A: la fecha entera                                                                                    |
| 45 días de ausencia                                     | pasaba del «un mes» de la regla de E7 (O-23); el dueño dijo 28                                              |
| La puerta del menor en `localStorage`                   | sobreviviría a cerrar la pestaña en un aparato compartido; va en `sessionStorage` (seguridad O-12; D-04)    |
| `cs_viewer` como aparato conocido                       | es de E2, solo restringe y no está firmada por cuenta (X-07); el aparato es `cs_device` (D-23)              |
| Alargar la sesión durante la ausencia                   | 30 días renovables bastan para 28 de ausencia (O-06; D-17)                                                  |
| El aviso de prueba de `twilightstruggle`                | un envío a voluntad del cliente contra los servicios de push (I-01; §13.6)                                  |

**Lo que retiró el dueño el 23 de noviembre** (`00-encargo.md` §9.2 y §9.3): el TOTP del panel, la 0059 y el PR 18; la comprobación de contraseñas filtradas y el PR 10; el cambio de correo de autoservicio con su aprobación, su deshacer y sus dos páginas; ocho de los diez correos; Pro antes de abrir; los informes DMARC; el nombre generado para el equipo de quien se borra.

### 22.3 La cobertura del encargo

| Punto (`00-encargo.md` §1, §2, §3 y §9)                                                              | Secciones                                      |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1. El ciclo de la identidad (fecha, verificación, recuperación, cambios, borrado, sesiones, límites) | §4, §5, §6, §7, §10; el cambio de correo, §8.5 |
| 2. La seguridad (secuestro, enumeración, límites, tokens, correo como vía, dependencias, menores)    | §2, §5, §7, §8                                 |
| 3. Las notificaciones                                                                                | §13                                            |
| 4. El modo ausencia                                                                                  | §14                                            |
| 5. Subdominios y calentamiento                                                                       | §9.4 y §9.6                                    |
| 6. El contacto, aparcado                                                                             | §11                                            |
| 7. Lo legal (acceso, exportación, borrado, privacidad, menores)                                      | §10, §21.3                                     |
| §2 del encargo, el inventario                                                                        | §1                                             |
| §3, las dependencias con avisos                                                                      | §8.3; PR 2                                     |
| §9.1.1 a §9.1.6                                                                                      | §4; §11; §9, §13 y §14; §13.9; §14; §8.6       |
| §9.2 y §9.3 (23 de noviembre)                                                                        | §21.1 y §21.2; §5, §8.5, §9, §13.1, §13.4      |
| Lo que E2 y E3 dejaron (mapa 04 §7)                                                                  | §6.1, §13, §20                                 |
| Los documentos que hay que corregir (mapa 04 §6)                                                     | §20.2 y §20.3                                  |
| El plan por PR, tests primero; riesgos; lo que se mide                                               | §18; §19.1 y §19.2; §19.4                      |

### 22.4 Los alias

Los de las propuestas y los que añadió la redacción. Solo aquí; el resto del documento usa el nombre canónico.

| Alias                                                          | De dónde              | Nombre canónico                                                                                        |
| -------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `cs_known`                                                     | jugador               | `cs_device`                                                                                            |
| `auth_throttle`                                                | atacante              | `auth_limits`                                                                                          |
| `delivery_log`                                                 | atacante              | `email_log`                                                                                            |
| `push_subscriptions`                                           | atacante, incremental | `push_targets`                                                                                         |
| `notify_prefs`                                                 | incremental           | `notice_prefs`                                                                                         |
| `month_rule_warning`, `month_rule`                             | atacante, incremental | `away_warning`                                                                                         |
| `absence_ending`                                               | incremental           | `away_over`                                                                                            |
| `stage_ready_own`, `stage_ready_followed`                      | incremental           | `stage_digest`, `stage_ready`                                                                          |
| `Sessions` (panel)                                             | incremental           | `AccountDevices`                                                                                       |
| `DELETE /api/me`, `POST /api/me/delete`                        | atacante, incremental | `POST /api/auth/delete-user` con `beforeDelete`                                                        |
| `/confirm-age`                                                 | atacante              | `/account/birth-date`                                                                                  |
| `/confirm-email-change#t=`                                     | incremental           | ninguno: el cambio de correo es del panel                                                              |
| `E1` a `E7`                                                    | atacante              | `verify_signup` y `reset_password`; el resto, fuera                                                    |
| `stageReadyPush`                                               | incremental           | `noticePayload`                                                                                        |
| `ACCOUNT.*`, `PUSH.*`                                          | incremental           | las constantes de §16                                                                                  |
| `PUSH_HOSTS`, `MAX_DEVICES`, `later`                           | `twilightstruggle`    | `PUSH_ALLOWED_HOSTS`, `PUSH_TARGETS_PER_USER`, `mailQueue.track`                                       |
| `SESSION_DAYS`, `KNOWN_DEVICE_DAYS`, `AWAY_SESSION_GRACE_DAYS` | jugador §14           | `SESSION_EXPIRES_S`, `DEVICE_COOKIE_DAYS`; el tercero desaparece (D-17)                                |
| `UserStatus` de cuatro valores, `AI_ADMINS`, `PLAY_MANIFEST`   | `twilightstruggle`    | `UserStatus` de dos (`pending`, `approved`), `ADMIN_EMAIL`, `manifest.webmanifest` (§4.9, §8.5, §13.5) |

### 22.5 Las decisiones `D-nn` en una línea

El texto cita las decisiones de la síntesis por su número (`D-nn`). Esta es cada una de las citadas, con la sección que la desarrolla. Donde el dueño o la corrección la cambiaron, se dice: manda lo que dice la sección, no el título.

- **D-00a** · 16 años con fecha de nacimiento. §4.
- **D-00b** · Sin canal de contacto. §11.
- **D-00c** · Ningún correo de juego. §9, §13, §14.
- **D-00d** · La app sin tecnología ni fecha. §13.
- **D-00e** · El modo ausencia con la frontera propuesta. §14.
- **D-00f** · Solo correo y contraseña. §8.
- **D-00p** · La web instalable, retirada. `docs/visual.md` l. 2736, decisión de E3: sin manifiesto de instalación, sin caché y sin cáscara sin red. E4 añade un service worker solo de avisos y un manifiesto mínimo sin iconos, que no la contradicen (§13.5; `00-encargo.md` §9.5).
- **D-02** · Dónde vive cada cosa. §15, §16.
- **D-03** · Los principios. §3. Cambió: el dueño deshizo «la seguridad va por correo»: va por push (principio 2, 3-a).
- **D-04** · El campo y la puerta neutra. §4, §12.
- **D-05** · Qué se guarda (defecto de DD-09). §4.
- **D-06** · La validación en el servidor. §4.
- **D-07** · Lo de E10. §4.
- **D-08** · El nombre y la imagen. §4.
- **D-09** · Las cuentas que ya existen. §4. Cambió: la puerta de la API es global (4-g).
- **D-10** · Las condiciones (defecto de DD-13). §4.
- **D-11** · Los tokens. §5.
- **D-12** · Todo enlace pasa por una página de botón. §5. Cambió: el botón manda el token por `POST` (5-h).
- **D-13** · Recuperar. §5.
- **D-14** · El cambio de correo. §5. Cambió: retirado: el cambio de correo lo hace un administrador (§5.5, 5-b).
- **D-15** · La enumeración por tiempo y el cierre ordenado. §5.
- **D-16** · Los correos de cuenta. §5. Cambió: de diez correos a dos (§5.7, 5-a).
- **D-17** · Vida y caché. §6.
- **D-18** · La IP no se guarda. §6.
- **D-19** · Lo que llega a la web. §6. Cambió: el token sale de todo JSON de `/api/auth/*` (6-f).
- **D-20** · Cerrar sesiones. §6. Cambió: `Sign out everywhere else` vive en `POST /api/auth/devices/sign-out-others` (6-g).
- **D-21** · Qué IP vale. §7. Cambió: con más de dos entradas, `request.ip` (7-h).
- **D-22** · `auth_limits`. §7. Cambió: claves nuevas `pw:` por sesión, `pwu:` y `rsv:` (7-k, 7-m).
- **D-23** · `cs_device`. §7. Cambió: la firma lleva el id de la cuenta (7-l); `Forget this device` (6-h).
- **D-24** · Las cifras. §7. Cambió: L3 por sesión y con techo por cuenta (7-k).
- **D-25** · Lo que ve quien choca. §7, §12.
- **D-26** · El presupuesto. §7, §9. Cambió: plan gratuito (DD-10 B), sin la cifra de Pro; reserva una vez por destinatario y día (7-f, 7-m).
- **D-28** · Las subidas (PR 2). §8.
- **D-29** · La lista blanca. §8. Cambió: once rutas sin `change-email`, comparadas con la ruta normalizada; nueve desde el PR 19 (8-a, 7-j).
- **D-30** · El registro de `better-auth`. §8.
- **D-31** · El panel raíz. §8. Cambió: sin TOTP (DD-01 A); el raíz protegido también en el `PATCH` (8-b, 8-h).
- **D-32** · DNS. §9. Cambió: DMARC se queda en `p=none` sin informes (DD-15 C, 9-a).
- **D-33** · Saber qué pasó. §9.
- **D-34** · Plan, calentamiento y purga. §9. Cambió: plan gratuito y tandas por aprobación (DD-10 B; §4.9; 9-b).
- **D-35** · Subdominios, el día que haya otro flujo. §9.
- **D-36** · `Privacy.tsx`. §10.
- **D-37** · Los logs. §10.
- **D-38** · Borrar. §10. Cambió: el equipo conserva su nombre (DD-14 B, 10-b).
- **D-39** · Exportar. §10.
- **D-40** · `last_seen_at` en toda visita. §10.
- **D-42** · El catálogo. §13. Cambió: tres avisos de seguridad (13-a).
- **D-43** · Topes, silencio y zona. §13.
- **D-44** · El permiso y la baja. §13.
- **D-45** · El service worker y D-00p. §13. Cambió: con un manifiesto mínimo sin iconos (13-g).
- **D-46** · El envío y la SSRF. §13.
- **D-47** · El emisor. §13.
- **D-48** · Ningún aviso destripa. §13.
- **D-49** · Aparatos compartidos. §13.
- **D-50** · El contrato para la app. §13.
- **D-52** · Declarar. §14.
- **D-53** · Mientras dura. §14. Cambió: también salen los de seguridad (13-a).
- **D-54** · Inactividad y E7. §14.
- **D-55** · `Welcome back` y la regla en la web. §14.
- **D-56** · `Account` y las pantallas. §12.
- **D-57** · Las migraciones. §15.
- **D-58** · El plan. §18. Cambió: diecisiete PR y unas 134 horas (§18).
- **D-59** · Los documentos. §20.
- **D-60** · Lo que se mide. §19. Cambió: más la cola de aprobación y la reserva de recuperar (19-c).

---

**Injertos aplicados.** Ninguno asignado (22.1 los recoge todos).

**Objeciones resueltas.** Ninguna asignada (22.2 las recoge todas).

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.**

- **22-a**, la tabla de lo desestimado gana dos filas: alargar la sesión en ausencia y el aviso de prueba.
- **22-b**, los alias de `twilightstruggle` entran en 22.4.
- **22-c**, 22.5 da cada `D-nn` citada en una línea, porque `00-decisiones.md` no entra en `docs/cuenta.md`.

