# Mapa 02 · El correo y los avisos

Commit `2a29e6d` (el código no cambia hasta `5b0cc97`, que solo añade documentos de E4). **Leídos enteros** (líneas):
`apps/api/src/mailer.ts` 152, `emails.ts` 170, `packages/shared/src/broadcast/pageTitle.ts` 83, `apps/web/index.html` 37. **Por tramos**: `apps/api/src/app.ts` (l. 100 a 240 y 330 a 392), `auth.ts` (l. 120 a 165), `env.ts` (l. 20 a 95),
`spaShell.ts` (l. 40 a 105), `spoilerCanary.test.ts` (l. 28 a 40 y 196 a 210), `mailer.test.ts` y `emails.test.ts`
(sus `it`), `pageTitle.test.ts` (l. 68 a 100), `packages/shared/src/broadcast/wire.ts` (l. 270 a 290), `docs/ops.md`
(l. 85 a 125), `docs/visual.md` (las 78 líneas con D-00p, leídas en l. 15, 232, 234, 331, 1087, 1234 y 2736),
`docs/retransmision.md` (§11.9, l. 7230 a 7290), `docs/agenda.md` (§3.2, §4.3 y §4.15.1).

**Cómo se ha medido.** En `<scratchpad>/mapa02/` (se pierde con la sesión): el DNS por DNS sobre HTTPS
(`dns.google`, contrastado con `cloudflare-dns.com`; no hay `dig`); `estaticos.mjs` y `navegador.mjs` levantan el
`buildApp` compilado de `mapa01/clon` (sin tocarlo) con un `sw.js` propio y lo abren con el Chromium de
`/opt/pw-browsers`; `wp/` instala `web-push` 4.0.0 y `t-wp.mjs` cifra un aviso. Producción, solo GET. Fuentes web
consultadas el 19 de noviembre de 2026; «oficial» es el fabricante o el estándar, «terceros» todo lo demás.

## Resumen

1. **El DNS de correo está completo salvo los informes** (§2): DKIM `resend._domainkey` (RSA de 1.024 bits, medido),
   return path propio en `send.` y `rsend.` (dos CNAME a la infraestructura de Resend, no los `MX` y `TXT` que
   describe `docs/ops.md` l. 106) y DMARC `v=DMARC1; p=none;` **sin `rua`**: nadie recibe un solo informe de quién
   manda correo en nombre del dominio.
2. **El código no sabe nada de lo que pasa después de enviar** (§1, §3): `mailer.ts` no guarda el id que devuelve
   Resend, no hay webhook de rebote ni de queja (búsqueda de `webhook`, `bounce`, `svix` en `apps/api/src` y
   `packages/db/src`: nada) y la lista de supresión de Resend es **por equipo, no por dominio**: una queja en un
   correo futuro de notificación suprimiría también la recuperación de la contraseña de esa persona.
3. **Con el plan gratuito de Resend, el correo 101 de un día no sale** (§3, §4): 100 al día y 3.000 al mes
   (resend.com/pricing). Con `requireEmailVerification`, un registro sin correo es una cuenta que no entra. No sé qué
   plan tiene el dueño.
4. **En iPhone no hay aviso web en una pestaña, con ningún navegador** (§5, §6): caniuse marca iOS 16.4 a 27.2 como
   «Requires website to first be added to the Home Screen». Lo nuevo es que desde iOS 26 cualquier web añadida a la
   pantalla de inicio se abre como app **sin manifiesto** (WebKit, 15 de septiembre de 2025): el jugador puede hacerlo
   por su cuenta aunque la web no se lo ofrezca.
5. **El escritorio y Android reciben avisos sin instalar nada** (§5), con dos letras pequeñas: en el escritorio el
   navegador tiene que estar abierto (nota 2 de caniuse), y Chrome retira el permiso a webs no instaladas con poca
   visita y muchos avisos (blog de Chromium, 10 de octubre de 2025).
6. **Lo mínimo cabe en la CSP de hoy sin tocarla** (§7): un `sw.js` en la raíz de `apps/web/public/` se sirve como
   `application/javascript` y Chromium lo registra con la CSP real (medido). Hoy `/sw.js` en producción devuelve el
   `index.html` (200, `text/html`), que el navegador rechaza. Sin manifiesto y sin manejador `fetch`, Chrome no ofrece
   instalar: la frontera con D-00p es verificable.
7. **Enviar cuesta cero en dinero** (§8): FCM figura como «No-cost», Apple no pide cuenta de desarrollador para el
   aviso web y Mozilla no pide cuenta. La librería obvia, `web-push`, sacó la 4.0.0 el 6 de noviembre de 2026 tras
   casi tres años sin versión, solo ESM y sin tipos propios.
8. **`stageReadyNotice` ya es el aviso; le faltan el enlace y la etiqueta** (§10): da título y cuerpo, pero
   `PreStageInfo` no lleva la carrera como clave, así que la URL y la etiqueta para agrupar avisos tienen que venir de
   fuera, como hoy el `url` de `stageReadyEmail`.

## §1. El correo de hoy, en el código

**`mailer.ts`.** Una petición `POST https://api.resend.com/emails` sin SDK (l. 45 y 87 a 101) con cinco campos:
`from`, `to` (uno), `subject`, `text`, `html` (l. 93 a 99). Sin `reply_to`, sin `headers`, sin `tags`, sin clave de
idempotencia. Corte a 10 s (`TIMEOUT_MS`, l. 51 y 100). `send` nunca lanza: un rechazo registra `correo rechazado por
Resend` con el código y 300 caracteres del cuerpo (l. 102 a 108); un fallo de red, `fallo al enviar el correo` (l. 112
a 114); el éxito, `correo enviado` (l. 110), **sin leer la respuesta**, así que el `id` que devuelve Resend se pierde
y un evento posterior (rebote, queja) no se puede casar con un envío. El buzón va enmascarado (`maskEmail`, l. 65 a
69). Sin `RESEND_API_KEY` ni `MAIL_FROM`, `createNullMailer` registra `correo NO enviado` (l. 124 a 135); con una sola
de las dos, la API no arranca (`env.ts` l. 86 a 93). `auth.ts` espera a `send` dentro de la petición (l. 126 a 128,
136 a 139, 157 a 160), que es la diferencia de tiempo del mapa 01 §5.

**`emails.ts`**: cuatro plantillas puras sobre un `layout` común (l. 36 a 57): una tabla, estilos en línea, sin
imágenes externas, botón y enlace copiable. El pie de l. 54 dice `Cycling Star` seguido de una raya y `a fictional
cycling-manager game.` en todos los correos.

| Plantilla (línea)                       | Asunto (correo)                                      | Se envía                                                                 | Dice la caducidad                    |
| --------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| `resetPasswordEmail` (l. 66)            | `Reset your Cycling Star password`                   | Sí, `sendResetPassword` (`auth.ts` l. 126 a 128)                         | `expires in one hour`                |
| `verifyEmailEmail` (l. 92)              | `Confirm your Cycling Star email`                    | Sí, registro, entrada sin confirmar y dirección nueva (`auth.ts` l. 136) | `expires in one hour`                |
| `changeEmailConfirmationEmail` (l. 118) | `Confirm the new email of your Cycling Star account` | Sí, a la dirección vieja (`auth.ts` l. 157 a 160)                        | No (el JWT dura 3.600 s, mapa 01 §2) |
| `stageReadyEmail` (l. 153)              | el `subject` de `stageReadyNotice`                   | **No**: nadie la llama salvo sus tests (búsqueda en `apps` y `packages`) | No aplica                            |

Tests: `mailer.test.ts` (11 `it`: la petición, que no lanza, el enmascarado, el aborto, la elección del mailer) y
`emails.test.ts` (enlace en las dos versiones, nada externo, escapado, la caducidad del de recuperación, y tres de
`stageReadyEmail`, l. 81 a 121). Ninguno mira cabeceras de lista ni `reply_to`, porque no existen.

## §2. El DNS de `cyclingstar.app`, registro a registro

Consultado el 19 de noviembre de 2026 por `dns.google` (y `_dmarc` y `send.` también por `cloudflare-dns.com`,
iguales). Servidores de nombres `ns1` y `ns2.sistelcoin.com`; serie del SOA `2026092312` (el SOA lleva como contacto
un buzón personal del dueño, que no copio aquí).

| Nombre y tipo                              | Valor medido                                                                                                                        | Lectura                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cyclingstar.app` A                        | `138.201.228.184` (TTL 3.600)                                                                                                       | Un Apache que responde `301` a `https://www.cyclingstar.app/` (GET de hoy, `Server: Apache`). Sin AAAA, sin CAA, sin HTTPS                                 |
| `www.cyclingstar.app` CNAME                | `4tiehri7.up.railway.app.`                                                                                                          | La web y la API en Railway. **Un solo origen** para los avisos: `https://www.cyclingstar.app`                                                              |
| `cyclingstar.app` MX                       | `0 cyclingstar.app.`                                                                                                                | El correo que entra (por ejemplo, una respuesta a `no-reply@`) va al mismo Apache de `138.201.228.184`. No sé si hay buzón detrás                          |
| `cyclingstar.app` TXT (SPF)                | `v=spf1 +a +mx +ip4:138.201.228.184 ~all`                                                                                           | Autoriza solo al alojamiento. No incluye a Resend y no hace falta: Resend usa su propio return path (abajo)                                                |
| `resend._domainkey` TXT (DKIM)             | `p=MIGfMA0…` sin `v=` ni `k=`                                                                                                       | RSA de **1.024 bits** (decodificado con `crypto.createPublicKey`). Google pide 1.024 o más y recomienda 2.048 (support.google.com/a/answer/81126, oficial) |
| `send.cyclingstar.app` CNAME               | `send.forge.rmta.net.` → MX `10 feedback.forge.rmta.net.`, TXT `v=spf1 ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24 ~all` | Return path de Resend («By default, Resend uses the `send` subdomain», resend.com/docs/dashboard/domains/custom-return-path, oficial)                      |
| `rsend.cyclingstar.app` CNAME              | `rsend-euw1.forge.rmta.net.` → MX `10 feedback-smtp.eu-west-1.amazonses.com.`, TXT `v=spf1 include:amazonses.com ~all`              | El «`r`-prefixed sibling» de la misma página: la variante CNAME usa dos nombres. `euw1` sugiere la región de Irlanda (deducido del nombre)                 |
| `_dmarc.cyclingstar.app` TXT               | `v=DMARC1; p=none;`                                                                                                                 | Política de solo mirar, **sin `rua` ni `ruf`**: no llega ningún informe. Sin `sp`, los subdominios heredan `p=none`                                        |
| `_dmarc.send`, `default._bimi`, `_mta-sts` | NXDOMAIN                                                                                                                            | No existen                                                                                                                                                 |

**La alineación** (deducida de los registros, no de una cabecera recibida): DKIM firma con `d=cyclingstar.app` (el
selector cuelga del dominio raíz), alineado con el remitente `no-reply@cyclingstar.app` (`docs/ops.md` l. 104 y 113);
el return path vive en `send.` o `rsend.`, que alinea en modo relajado. Pasa DMARC por las dos vías. No sé cuál de los
dos nombres usa cada envío: lo diría la cabecera `Return-Path` de un correo recibido, y no he provocado ninguno.

**`docs/ops.md` está desfasado** en un punto: dice `MX` y `TXT` de SPF en `send.cyclingstar.app` (l. 106) y hoy es un
CNAME (que no admite otros registros en el mismo nombre), más `rsend.`, que no nombra. Dice que el DMARC es opcional
(l. 108) y está puesto.

## §3. Lo que falta en el correo transaccional

| Pieza                                    | Hoy                                                                                                                                                                                                                                                                                                       | Prueba                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Informes DMARC                           | No: sin `rua`                                                                                                                                                                                                                                                                                             | §2                                                                    |
| Endurecer DMARC (`quarantine`, `reject`) | No: `p=none`. Con `p=none` basta incluso para quien manda más de 5.000 al día a Gmail («The enforcement policy may be set to none», support.google.com/a/answer/81126, oficial)                                                                                                                           | §2                                                                    |
| Return path propio                       | **Sí**: `send.` y `rsend.`                                                                                                                                                                                                                                                                                | §2. G11 lo daba por pendiente (`00-encargo.md` l. 135)                |
| Webhook de rebotes y quejas              | No hay ruta ni tabla                                                                                                                                                                                                                                                                                      | Búsqueda de §Resumen 2                                                |
| El id de cada envío                      | Se pierde (`mailer.ts` l. 110)                                                                                                                                                                                                                                                                            | §1                                                                    |
| Supresión                                | La hace Resend sola: rebote duro o queja, y la dirección se salta en **todos los dominios y subdominios del equipo**, transaccional incluido («Suppressions apply to your entire team», resend.com/docs/dashboard/emails/email-suppressions, oficial). Gmail puede no avisar de las quejas (misma página) | Nadie en la app lo sabe: el correo «sale» (`true`) y no llega         |
| Techo de envío                           | Plan gratuito: 100 al día, 3.000 al mes, 3 dominios, 1 webhook. Pro: 20 USD al mes, 50.000, sin tope diario, 10 dominios, 5 webhooks (resend.com/pricing, oficial)                                                                                                                                        | No sé qué plan hay. No sé qué código devuelve Resend al pasar el tope |
| Calentamiento                            | Ninguno escrito                                                                                                                                                                                                                                                                                           | §4                                                                    |

**Los webhooks de Resend, si se montan** (resend.com/docs/dashboard/webhooks/event-types y
`…/verify-webhooks-requests`, oficiales): eventos `email.sent`, `email.delivered`, `email.delivery_delayed`,
`email.bounced` (rechazo permanente), `email.complained` (marcado como spam), `email.failed`, `email.suppressed`, más
`suppression.added` y `suppression.removed`. Firmados con las cabeceras `svix-id`, `svix-timestamp` y
`svix-signature`, verificables con el cuerpo **crudo** (el SDK de Resend o la librería `svix`); los reintentos repiten
`svix-id`. Pedirían una ruta pública nueva en la API, fuera del límite de credenciales, y leer el cuerpo sin el parser
JSON de Fastify.

## §4. Resend, los subdominios y el volumen de este juego

- **Subdominios**: «We recommend sending your emails from one or more subdomains», para aislar la reputación
  (resend.com/docs/dashboard/domains/introduction, oficial). Hoy se envía desde el dominio raíz por decisión de
  `docs/ops.md` l. 103 a 105. La separación por flujo de `agenda.md` §3.2 sería un segundo dominio en Resend (por
  ejemplo `notify.cyclingstar.app`) con su DKIM y su return path propios y su remitente; **no separaría las
  supresiones** (§3), que son del equipo. Si se quisiera aislar también eso, haría falta otro equipo de Resend
  (deducido de la misma página; no comprobado).
- **Calentamiento** (resend.com/docs/knowledge-base/warming-up, oficial, sin fecha): de 150 correos el día 1 a 2.000
  el día 7, con topes por hora desde el día 4 (50, 75, 100, 150); rebotes por debajo del 4 % y spam por debajo del
  0,08 %; «these numbers are meant as a baseline». Nada específico para quien manda poco. Google pide a todo remitente
  SPF o DKIM, PTR, TLS y spam por debajo del 0,3 % (support.google.com/a/answer/81126).
- **El volumen de este juego** (estimado): hoy hay una cuenta (`00-encargo.md` l. 309 y 310). Cada registro cuesta un
  correo, y uno más cada entrada sin confirmar, cada recuperación y cada cambio de correo (dos). Sin correo de juego
  (§9.1), el volumen diario es del orden de los registros del día, muy por debajo de los 150 del día 1 de Resend: el
  calendario de Resend es un techo que no se alcanza. El riesgo real es el contrario, un lanzamiento de golpe: mil
  registros en un día son mil correos, diez veces el tope del plan gratuito y siete veces el día 1 de la tabla.
- **`List-Unsubscribe`, por si algún día hay correo de notificación**
  (resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails, oficial): se pasa en el campo `headers`
  del envío; para correo masivo, una URL y `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058), que acepta
  `POST` y responde 200 o 202 en blanco, con la baja efectiva en 48 horas. Gmail y Yahoo lo exigen a quien manda más
  de 5.000 al día desde febrero de 2024. Hoy `mailer.ts` no admite cabeceras (l. 93 a 99).

## §5. El aviso del navegador en noviembre de 2026

Fuente principal: caniuse, `push-api.json` de `main` (descargado el 19 de noviembre de 2026; versión más alta listada:
Chrome 160, Firefox 163, Safari 27.3, iOS Safari 27.2). Notas citadas por número.

| Plataforma                                 | Chrome                                                                                                                                                                         | Firefox                    | Edge                                                                                                           | Safari                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Escritorio                                 | Sí desde 50 (nota 2: el navegador abierto)                                                                                                                                     | Sí desde 44 (nota 2)       | Sí desde 17 (nota 2)                                                                                           | Parcial (`a`) de 16.1 a 17.x y completo desde 18.0, solo macOS 13 o más (notas 5 y 6), sin instalar |
| Android                                    | Sí (157 `y`), sin instalar                                                                                                                                                     | Sí (160 `y`), sin instalar | **No lo sé**: caniuse no lo lista; un hilo de Microsoft Q&A de febrero de 2026 cuenta que no llegan (terceros) | No existe                                                                                           |
| iPhone y iPad, en una pestaña              | **No** (es WebKit)                                                                                                                                                             | **No** (es WebKit)         | **No** (es WebKit)                                                                                             | **No**: 16.4 a 27.2, nota 7, «Requires website to first be added to the Home Screen»                |
| iPhone y iPad, desde la pantalla de inicio | Sí desde iOS 16.4: Chrome, Edge y Firefox pueden añadir a la pantalla de inicio y la app resultante es WebKit con APNs (webkit.org/blog/13878, 16 de febrero de 2023, oficial) | igual                      | igual                                                                                                          | Sí desde iOS 16.4 (misma fuente)                                                                    |

- **El permiso, con un gesto**: Firefox desde la 72 y Safari solo conceden el permiso pedido en respuesta a un toque
  (developer.mozilla.org, «Using the Notifications API», oficial; webkit.org/blog/13878 para iOS). Chrome y Firefox
  exigen HTTPS (misma página de MDN); producción lo es (HSTS de 180 días, `app.ts` l. 194, y la cabecera medida hoy).
- **Chrome retira el permiso** a webs con poca interacción y muchos avisos, en Android y escritorio, y avisa al
  usuario; **no a las apps web instaladas** (blog.google/chromium/automatic-notification-permission, 10 de octubre de
  2025, oficial). Una web sin instalar está expuesta; no se publica el umbral.
- **Safari tiene un formato declarativo** (Declarative Web Push, webkit.org/blog/16535, 27 de marzo de 2025, oficial):
  un JSON con `"web_push": 8030`, `notification.title` y `notification.navigate` que se pinta sin service worker en
  iOS 18.4 y macOS 15.5; los navegadores que no lo entienden lo reciben como un aviso normal que el service worker
  lee. No he comprobado si Chrome o Firefox lo han adoptado.

## §6. ¿Puede un jugador de iPhone recibir hoy un aviso de una web que no está en su pantalla de inicio?

**No.** Ni en Safari ni en Chrome, Firefox o Edge para iOS, que usan WebKit: caniuse lo marca así de iOS 16.4 a 27.2
(nota 7), WebKit lo escribió así al estrenarlo (blog 13878: «A web app that has been added to the Home Screen can
request permission») y una guía de terceros añade que en una pestaña `Notification` ni existe
(progressivewebapps.com/background/ios-web-push, sin fecha propia; cuenta Safari 27.0, del 14 de septiembre de 2026,
sin cambios de avisos). No he podido probarlo en un iPhone.

**Lo que cambió con iOS 26** (webkit.org/blog/17333, 15 de septiembre de 2025, oficial): «By default, every website
added to the Home Screen opens as a web app» y «there are now zero requirements for “installability” in Safari». El
usuario puede desactivar `Open as Web App` al añadirla y queda un marcador sin avisos (guía de terceros citada).
Consecuencias, sin proponer:

1. En iOS 26 o más, un jugador que añada `www.cyclingstar.app` a su pantalla de inicio **por su cuenta** tendría una
   app web capaz de recibir avisos si la web tiene un service worker y le pide el permiso desde dentro de esa app. No
   hace falta manifiesto, ni metas de Apple, ni que la web lo ofrezca. Probable por las dos fuentes; **no comprobado**
   en un aparato.
2. En iOS 16.4 a 18, sin manifiesto con `display` `standalone` o `fullscreen` ni la meta
   `apple-mobile-web-app-capable` (hoy no hay ninguno de los dos, `apps/web/index.html`), lo añadido se abre en Safari
   como marcador y **no recibe avisos** (guía de terceros; WebKit 13878 describe el manifiesto como lo que convierte
   la web en app).
3. No sé qué parte de los jugadores tiene iOS 26 o más. D-00p dice que el aviso en iPhone «pasa a la app»
   (`docs/visual.md` l. 2736); el caso 1 es una puerta que existe sin que nadie la abra.

## §7. Lo mínimo para recibir avisos sin volver a ser instalable

| Pieza                       | Qué pide                                                                                                                                                                                                                                                        | Estado hoy y prueba                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service worker              | Un fichero en el mismo origen con dos oyentes, `push` (pintar con `showNotification`) y `notificationclick` (abrir la URL). Sin `fetch`, sin Cache API                                                                                                          | No existe (`apps/web/public/` tiene `favicon.svg`, `og-default.png` y `assets/theme-12588923.js`). **Medido** con `estaticos.mjs`: un `sw.js` en la raíz de la web se sirve 200, `application/javascript`, `public, max-age=0` (lo de `app.ts` l. 131 a 134). Otro nombre que no exista cae en el fallback de la SPA: 200 `text/html` (`app.ts` l. 381) |
| Ámbito                      | En la raíz, ámbito `/` sin la cabecera `Service-Worker-Allowed`                                                                                                                                                                                                 | Medido en Chromium: `scope` `http://localhost:4782/`                                                                                                                                                                                                                                                                                                    |
| CSP (`app.ts` l. 175 a 195) | Registrar un worker cae en `worker-src`, que no está, y por la cadena de respaldo de CSP 3 en `script-src 'self'`. La suscripción la hace el navegador con su servicio de push, no la página: no toca `connect-src`. Mandar la suscripción a `/api` es `'self'` | **Cabe sin cambios**. Medido con `navegador.mjs`: con la CSP real de `buildApp`, Chromium registra `/sw.js` y `pushManager` existe; `Notification.permission` es `default`. Registrar un nombre inexistente falla con `unsupported MIME type ('text/html')`. Firefox y Safari, no medidos                                                               |
| Manifiesto                  | Ninguno en Chrome, Firefox, Edge ni Safari de escritorio y Android (§5). En iOS 26 tampoco (§6)                                                                                                                                                                 | No existe y no hace falta                                                                                                                                                                                                                                                                                                                               |
| VAPID                       | Un par P-256: la pública va a la web (`applicationServerKey`), la privada a una variable secreta de Railway; un `subject` `mailto:` o `https:` (RFC 8292)                                                                                                       | **Medido** con `web-push` 4.0.0: pública de 87 caracteres y privada de 43 (base64url). Cambiar la clave rompe las suscripciones: `subscribe` con otra `applicationServerKey` da `InvalidStateError` (w3.org/TR/push-api, borrador del 16 de noviembre de 2026, paso 11.6.3)                                                                             |
| Permiso                     | `Notification.requestPermission()` desde un toque (§5)                                                                                                                                                                                                          | No hay ningún `serviceWorker`, `Notification` ni `PushManager` en `apps/web/src` (búsqueda)                                                                                                                                                                                                                                                             |
| Guardar la suscripción      | `endpoint` (una URL del servicio de push del navegador), `keys.p256dh` y `keys.auth`, por usuario y por aparato                                                                                                                                                 | No hay tabla. Al borrar la cuenta tendría que caer en cascada como `race_watch` (`schema.ts` l. 941). Si el `endpoint` es un dato personal que nombrar en `Privacy.tsx` es del mapa 03 y, en lo legal, a confirmar con un abogado                                                                                                                       |

**Producción hoy**: `GET https://www.cyclingstar.app/sw.js` devuelve 200, `text/html; charset=utf-8`, `no-cache`, con
el `index.html` (medido): no hay service worker y un registro fallaría por el tipo. La CSP servida es la de `app.ts`
más los defectos de helmet (`script-src-attr 'none'`, `upgrade-insecure-requests`); no hay cabecera
`Permissions-Policy`, así que nada bloquea el permiso.

**La frontera con D-00p.** D-00p (`docs/visual.md` l. 2736) retiró «el manifiesto, los iconos de pantalla de inicio,
las metas de Apple, el service worker, el aviso de instalar, la versión nueva por service worker» y el medidor de la
app nativa; `UpdateToast`, `InstallHint` y `Reload app` salieron con él (l. 1087 y 1234). El service worker que quitó
era el de la cáscara sin red: l. 234 y 331 dicen que «sin service worker no hay cáscara guardada». Uno solo de avisos
**no cambia ninguna de esas frases** si no tiene manejador `fetch` ni caché. Y no hace la web instalable en Chrome: la
instalación pide un manifiesto con nombre e icono, y el aviso de instalar además un `fetch`
(developer.chrome.com/blog/update-install-criteria, oficial, sin fecha). Lo que sí choca es la letra: «E3 no hace
[...] el service worker» y «el aviso al teléfono en iPhone [...] pasa a la app». La decisión de §9.1 del brief («como
mucho notificadores de browser y app») es posterior y del dueño. La regla de E2 ya lo previó: el service worker «no
guarda ninguna respuesta de una ruta `horizon` o `watch`» y usa `stageReadyNotice` y nada más (`docs/retransmision.md`
l. 7284, `sup. T6`).

## §8. La librería de envío y el coste

| Paquete                       | Última versión (npm, 19 de noviembre de 2026)                                  | Dependencias                                                                    | Notas                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web-push` (`web-push-libs`)  | **4.0.0, 6 de noviembre de 2026**; la anterior, 3.6.7, del 16 de enero de 2024 | `jws`, `asn1.js`, `http_ece` 1.2.1, `https-proxy-agent`; Node 16 o más; MPL-2.0 | 14,7 millones de descargas la semana del 11 al 17 de noviembre (api.npmjs.org). **Solo ESM** con exportaciones con nombre (`import * as webpush`; el README sigue con `require`). Sin tipos: `@types/web-push` va por 3.6.4 (22 de octubre de 2024). `pnpm audit` de 4.0.0 y de 3.6.7: «No known vulnerabilities found» (medido) |
| `@block65/webcrypto-web-push` | 2.0.0, 3 de septiembre de 2026                                                 | una; Node 22 o más; MIT                                                         | WebCrypto, sin dependencias criptográficas propias                                                                                                                                                                                                                                                                               |
| `@pushforge/builder`          | 2.0.5, 23 de abril de 2026                                                     | ninguna; Node 20 o más; MIT                                                     | Seis versiones en 2026                                                                                                                                                                                                                                                                                                           |

La API es ESM (`apps/api/package.json` l. 5) y Node 22 (`package.json` l. 7 y 8), así que las tres caben. No he
consultado la base de avisos de GitHub (la API de avisos está cerrada en esta sesión): «sin avisos» es lo que dice
`pnpm audit`.

**Un envío medido** (`t-wp.mjs`, sin red): título y cuerpo de `stageReadyNotice` con una URL, 180 bytes de JSON, salen
en 283 bytes cifrados `aes128gcm` con las cabeceras `TTL`, `Urgency`, `Topic`, `Authorization` (VAPID) y
`Content-Encoding`. El servicio de push no ve el texto (RFC 8030 §8.1). Por defecto `web-push` pone un TTL de cuatro
semanas (`web-push-lib.js` l. 10 y 11); `Topic` hace que un aviso sustituya al anterior con la misma etiqueta (RFC
8030 §5.4; como mucho 32 caracteres, README). Mozilla corta el cuerpo en unos 4 KB (autopush, documentación HTTP,
oficial). Una suscripción caducada responde **404** (RFC 8030 §7.3) y hay que borrarla; también se ve 410 en la
práctica (no comprobado).

**El coste**: FCM (el servicio de Chrome; el de Edge no lo he comprobado) figura como «No-cost»
(firebase.google.com/pricing, oficial); Apple: «You do not need to be a member of the Apple Developer Program» y usa
APNs (webkit.org/blog/13878; los servidores tienen que poder llegar a `*.push.apple.com`); Mozilla no pide cuenta y no
he encontrado página de precios. El coste real es una petición HTTPS por aparato y aviso desde la API (estimado:
despreciable a este volumen) y la variable secreta de VAPID.

## §9. Lo que pediría una app futura (sin suponer tecnología)

- **Android nativo**: FCM con la API HTTP v1, con tokens OAuth 2.0 de una cuenta de servicio; las API antiguas con
  clave de servidor se apagan desde el 22 de julio de 2024 (firebase.google.com/docs/cloud-messaging/migrate-v1,
  oficial, citada por buscador; la URL directa dio 404 hoy). Gratis, como en §8.
- **iPhone nativo**: APNs con su token de aparato y una clave o certificado de Apple, que pide la membresía de pago
  del programa de desarrolladores («advanced app capabilities [...] require membership»,
  developer.apple.com/support/compare-memberships, oficial). La cuota no la he confirmado hoy en una página oficial.
  Qué responde APNs a un token muerto no lo he podido leer en la documentación.
- **Lo que no estorba hoy** (hechos, no propuesta): las tres vías dan un identificador distinto por aparato (Web Push:
  `endpoint` y dos claves; FCM: un token; APNs: un token y su entorno), las tres lo invalidan por su cuenta (§8) y las
  tres llevan título, cuerpo y un destino al tocar. El texto ya es común (`stageReadyNotice`, §10); el destino en la
  web es una URL y en una app será una ruta suya. Un almacén que guarde «usuario, canal, aparato, credencial» y un
  registro de envíos por aviso sirve a las tres; uno que guarde solo `endpoint` no.

## §10. `stageReadyNotice` y `stageReadyEmail`

- **`stageReadyNotice('en', p, ownRiderOnStartlist)`** (`pageTitle.ts` l. 71 a 83) devuelve `{ subject, text }`:
  `Stage 7 of Race France is ready to watch` y `187 km · mountain stage · your rider is on the start list`
  (`pageTitle.test.ts` l. 72 a 75). Pura, sin red, y la usan ya `spaShell.ts` l. 99 (la descripción `og:`) y
  `stageReadyEmail`. Su entrada, `PreStageInfo` (`wire.ts` l. 280 a 288), tiene `raceName`, `season`, `stageDay`,
  `stageCount`, `km`, `label` y `stageKind`; **no lleva el identificador de la carrera**. La construye
  `preStageInfoFor(db, raceId, day, season)` (`spaShell.ts` l. 46).
- **`stageReadyEmail`** (`emails.ts` l. 153 a 170) envuelve el aviso en un correo con el pie `Results stay hidden
until you watch the stage.` y un botón `Watch` al `url` que recibe. Con §9.1 no se envía nunca; **su único uso fuera
  de su test es el canario** (`spoilerCanary.test.ts` l. 206), que comprueba que el nombre del ganador no está en el
  correo. Si se borra, el canario tiene que mirar lo que lo sustituya.
- **Lo que el aviso necesitaría y no da `stageReadyNotice`**: (1) la URL de la etapa,
  `/world/races/:raceId/stages/:day` (`docs/retransmision.md` l. 7278 y la tabla de §11.10), que pide el `raceId` de
  fuera; (2) una etiqueta para agrupar (`tag` en `showNotification`, `Topic` en el envío, 32 caracteres como mucho)
  que tampoco sale de `PreStageInfo`; (3) qué hacer con el pie de la promesa, que no tiene sitio en un aviso de dos
  líneas; (4) el `locale`, hoy el literal `'en'` (12-q). Las tres reglas de §11.9 (l. 7280 a 7282) siguen valiendo: el
  disparador no mira el resultado, ninguna palabra depende de lo que pasó y el canario renderiza el aviso.
- **La frecuencia, estimada**: con cuatro días de juego por día real (`00-encargo.md` l. 31), una vuelta de etapas da
  hasta cuatro «etapa lista» al día por carrera en guardia; con dos carreras a la vez, ocho. Es el número que tendría
  que acotar el tope de avisos, y Chrome castiga los muchos avisos con poca visita (§5).

## Lo que este mapa no ha podido comprobar

1. **Nada en un iPhone ni en un Android de verdad**: ni el aviso desde la pantalla de inicio sin manifiesto en iOS 26
   (§6), ni Edge en Android (§5), ni Firefox y Safari con nuestra CSP (§7). Tampoco una suscripción real:
   `pushManager.subscribe` habla con FCM, y no lo he intentado.
2. **El plan de Resend y su conducta al pasar el tope**, la región del dominio y qué return path usa cada correo: lo
   diría el panel de Resend o la cabecera de un correo recibido, y no he provocado ninguno (§2, §3).
3. **Si hay un buzón detrás del MX** de `cyclingstar.app` (el Apache de `138.201.228.184`): no he abierto el puerto 25.
4. **Los avisos de seguridad de las librerías de push en la base de GitHub**: la API de avisos está cerrada en esta
   sesión; solo `pnpm audit`.
5. **Qué responden FCM y APNs a un token muerto** en su documentación oficial: no la he podido leer hoy.
6. **El valor de `MAIL_FROM` en Railway**: tomo el de `docs/ops.md` l. 113.
