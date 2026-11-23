## 19. Riesgos del despliegue y lo que se mide

Hoy hay pocas cuentas y la que importa es la del dueño (`00-encargo.md` §9.1, punto 1: «hoy solo la suya»). Los riesgos son sobre todo suyos y del orden de los PR; lo que se mide después sirve para el día que el registro se abra por tandas.

### 19.1 Con las cuentas de hoy, por PR

| PR  | Qué le pasa a una cuenta que ya existe                                                                                                                                                                                                                                         | Cómo se cubre                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 3   | Sus sesiones de 7 días pasan a 30 en la primera petición con más de un día (`session.mjs` l. 205 a 210). Una sesión de más de 90 días se cierra en el acto: si el dueño tiene una, entra otra vez. Un enlace de recuperación en vuelo, en claro, sigue valiendo su hora (X-21) | se dice en la descripción del PR; nada que migrar                                                                 |
| 3   | Recuperar la contraseña cierra **todas** sus sesiones, también la del teléfono                                                                                                                                                                                                 | es lo buscado (D-13); el final lo dice: `You have been signed out everywhere else.`                               |
| 5   | El formulario de cambio de correo desaparece de `Account`                                                                                                                                                                                                                      | lo cambia un administrador desde el panel (§8.5); el dueño es el administrador raíz y su correo no se cambia allí |
| 6   | La 0056 pone `name = 'Player'` a todas y vacía `sessions.ip_address`: **no se puede deshacer**. Nadie lee ninguna de las dos (mapa 03 §1; D-08)                                                                                                                                | la precondición del PR 3 ya leyó la IP (H-04); el nombre no se enseña en ninguna parte (D-08)                     |
| 6   | El primer navegador sin `cs_device` (todos, el día del despliegue) cuenta en L1: diez fallos de la contraseña lo cierran 15 minutos                                                                                                                                            | la primera entrada buena da la cookie; recuperar la da siempre (D-23)                                             |
| 8   | Un enlace pedido antes del despliegue (`?token=`) llega a la web nueva                                                                                                                                                                                                         | la web lee `?token=` hasta el PR 19 (`LEGACY_LINK_GRACE_DAYS`)                                                    |
| 9   | **La puerta de la fecha**: al primer paso tras desplegar, el dueño ve `One more thing` y no puede escribir en `/api/riders/*` ni `/api/me/*` hasta darla. Si escribiera una fecha de menos de 16 años, la API no la guarda y le ofrece borrar la cuenta (D-09)                 | la puerta no bloquea `Sign out`, `/privacy`, `/terms` ni `/account/delete`; el dueño lo prueba primero en local   |
| 11  | `Account` cambia de forma                                                                                                                                                                                                                                                      | la prueba del teléfono (§17.3)                                                                                    |
| 14  | Ningún aviso sale hasta que el jugador pulsa `Turn on`; nadie está suscrito el día del despliegue                                                                                                                                                                              | nada se rompe sin VAPID; los gemelos en la web ya están                                                           |

### 19.2 El despliegue

- **Límites en memoria**: cada despliegue vacía los de Fastify (10 intentos más por IP y ruta, `security.ts` l. 54 a 68); los de `auth_limits`, en Postgres, no (§7.2). `better-auth` deja de tener limitador propio en el PR 3.
- **Réplicas de `web`** (H-03): con más de una, la capa de Fastify es «por réplica» y el tick automático corre en cada una. `runTick` es idempotente (`index.ts` l. 40 a 41) y el barrido también, por `notice_log` (§13.7). El número lo mira el dueño antes del PR 6.
- **Correos y avisos en vuelo** (H-02): `SIGTERM` espera a `mailQueue.drain()` hasta `MAIL_SHUTDOWN_GRACE_MS` (10.000). Lo perdido se ve en `email_log` como `queued` que nunca pasó a `sent`. Un aviso de seguridad perdido no se reintenta: su gemelo está en la web. Que Railway dé 10 segundos tras `SIGTERM` antes de matar el proceso **no lo sé**.
- **El tope de Resend**: con el plan gratuito, 100 al día y 3.000 al mes (mapa 02 §3). El presupuesto se queda en 90 y para los registros a 60 (§7.6); el registro se abre por tandas (9-b). Un atacante con cinco IP puede agotar los registros de un día; las 30 de reserva siguen sirviendo a quien recupera (§7.6).
- **Registros con correos inventados** (H-07): cada uno manda un `verify_signup` que rebota y Resend castiga por encima del 4 %. Los frenan L4, la purga de 7 días (DD-17 A) y la medida de §19.4.
- **Railway y su cabecera**: que el borde reescribe `X-Forwarded-For` con una sola IP está medido a medias (`00-encargo.md` §2.2) y no escrito en su documentación. `clientIp` no depende de ello (§7.1) y `xff_varias` avisa si cambia.
- **VAPID**: cambiar la clave rompe todas las suscripciones (mapa 02 §7). Se genera una vez y se guarda en Railway.

### 19.3 La prueba del dueño

Lo que ningún agente ha podido comprobar y se prueba en su teléfono y en su buzón al cerrar cada PR que lo toca (como `docs/visual.md` §7.7):

1. **iPhone con iOS 26** (PR 14; H-09): en Safari, `Account › Notifications` enseña la explicación de `ios-home`; añadir la web a la pantalla de inicio, abrirla desde allí, entrar y pulsar `Turn on`; recibir un aviso de verdad (un `password_changed` al cambiar la contraseña desde otro aparato es el más rápido). Mirar si esa app web tiene sus propias cookies: si pide entrar otra vez, **bajo ataque es un navegador nuevo** sin `cs_device` (L1 y `new_sign_in`, §7.5), y se escribe en `docs/ops.md`. Si no llega ningún aviso, la explicación sería falsa: se le dice al dueño y, mientras decide, `ios-home` pinta la frase de DD-04 A (`Notifications aren't available on iPhone yet…`).
2. **Un buzón con escáner de enlaces** (PR 8; H-08): mandar un `verify_signup` a una dirección de Outlook o de empresa con Safe Links y mirar si la cuenta se confirma sola. Si se confirma, la página de botón no basta y se dice.
3. **Registro y recuperación en su teléfono** (PR 8 y 9): con el teclado de verdad, `DateField`, `CheckInbox`, el enlace del correo y `ResetPassword`; que ningún botón quede bajo el teclado (§12.6).
4. **Un aviso en Android y en el escritorio** (PR 14): `Turn on`, el aviso de etapa a las 19:00 locales, `Turn off these` desde el propio aviso, y que `Sign out` lo apague.

### 19.4 Lo que se mide

D-60, con lo que cambió el dueño el 23 de noviembre: sin `hibp_caido` (DD-11 C) y con los avisos de seguridad. Lo mira el dueño con consultas de solo lectura en Railway; los umbrales son de esta síntesis y **estimados**.

| Qué                                                   | Con qué                                                                         | Umbral                          | Si se pasa                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| Registros sin confirmar a las 24 h                    | `users.email_verified`, `created_at`                                            | más del 30 %                    | mirar si el correo llega (spam, rebotes) antes de la siguiente tanda        |
| Rebotes y quejas                                      | `email_log.status` en 7 días                                                    | 4 % y 0,08 %                    | parar las tandas; mirar los dominios de los rebotes                         |
| Envíos frente al presupuesto                          | `email_log` del día UTC                                                         | 70 % de `MAIL_DAILY_BUDGET`     | tandas más pequeñas o, si se repite, DD-10 A (Pro)                          |
| Bloqueos por cuenta                                   | `auth_limits` con `acct:` y `locked_until` en el día                            | más de 5 cuentas al día         | buscar un relleno de credenciales en los logs                               |
| `xff_varias`                                          | logs de Railway                                                                 | más de 0 en una semana          | Railway cambió su borde: revisar D-21                                       |
| Suscripciones perdidas                                | filas de `push_targets` borradas por 404, 410 o tres fallos, frente a las vivas | más del 20 % a la semana        | mirar si un navegador rechaza la clave o el formato                         |
| Avisos de seguridad                                   | `notice_log` con `password_changed` y `new_sign_in`                             | se mira, sin umbral             | muchos `new_sign_in` de una cuenta sin cambio de contraseña: alguien la usa |
| Cuentas sin fecha de nacimiento                       | `users.birth_date` nula                                                         | más de 0 a los 30 días del PR 9 | se le cuenta a E7 y al abogado (§21.3)                                      |
| Ausencias declaradas y terminadas antes de tiempo     | `away_since`, `away_until`                                                      | se mira, para E7                | E7 fija la regla con ellas                                                  |
| Vueltas tras más de 20 días, con y sin `away_warning` | `last_seen_at`, `welcome_back_from`, `notice_log`                               | se mira, para E7 (PR 15)        | E7 pesa el silencio total (§14.6)                                           |

---

**Injertos aplicados.** Ninguno asignado.

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** H-02 (§19.2), H-03 (§19.2), H-07 (§19.2), H-08 (§19.3), H-09 (§19.3).

**Decisiones de esta sección.**

- **19-a**, si la prueba del iPhone no recibe ningún aviso, se le dice al dueño y, mientras decide, `ios-home` pinta la frase de DD-04 A: una explicación que no funciona es una pantalla que miente.
- **19-b**, `hibp_caido` sale de lo que se mide; entra el recuento de avisos de seguridad, sin umbral.
