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
