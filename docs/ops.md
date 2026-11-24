# Operación (SPEC 12, Paso 42)

Runbook de operación de Cycling Star. Cubre respaldos, restauración (probada), variables de
entorno, despliegue y las tareas manuales pendientes (legal, monitorización).

## Tras desplegar E4: lo que tiene que hacer el dueño

Una sola vez y en este orden. Nada de esto está en el código: son tus paneles de Railway y de Resend,
el DNS del dominio y tu buzón.

1. **Las claves de los avisos.** En tu ordenador, dentro del repositorio, ejecuta una vez
   `pnpm --filter @cyclingstar/api exec web-push generate-vapid-keys`. Salen dos claves. Ponlas en
   Railway, en los servicios `web` y `tick`: `VAPID_PUBLIC_KEY` (la pública), `VAPID_PRIVATE_KEY` (la
   privada) y `VAPID_SUBJECT=https://www.cyclingstar.app`. Guárdalas en tu gestor de contraseñas y
   **no las cambies nunca**: con claves nuevas, dejan de llegar todos los avisos que la gente ya
   aceptó (ver «Los avisos del navegador»).
2. **El webhook de Resend.** Dalo de alta como dice «El webhook de Resend» y pon su secreto en
   `RESEND_WEBHOOK_SECRET`, solo en `web`. Con él, el juego sabe qué correos rebotan.
3. **El presupuesto de correo.** No pongas `MAIL_DAILY_BUDGET`: sin ella vale 90 al día, lo que cabe
   en el plan gratuito de Resend. Solo se toca si pasas al plan Pro (entonces, 1.500).
4. **El DNS.** Mira si Resend deja una clave DKIM de 2.048 bits y, si deja, cámbiala; y añade el
   registro `CAA` (ver «Tareas del DNS»).
5. **Tu buzón.** Activa el segundo factor en el buzón de `ADMIN_EMAIL`: quien entre en él puede
   recuperar tu contraseña y tiene el panel de administración.
6. **Aprueba por tandas.** En **Account → Admin panel**, `Waiting for approval`: 25 al día los tres
   primeros días, 40 hasta el séptimo y 50 como mucho después (ver «El ritmo de las aprobaciones»).
   Las invitaciones de la lista de espera las mandas tú desde tu buzón, no Resend.
7. **Pruébalo.** Pide una cuenta con un correo tuyo que no sea el de `ADMIN_EMAIL`, apruébala, abre
   el enlace que llega y, ya dentro, en **Account → Notifications**, pulsa `Turn on`.

Y dos cosas que no tienes que hacer, pero conviene saber: no hay copias de seguridad de la base (el
plan Hobby de Railway no las da, así que lo que se borra se borra), y Railway guarda los logs 7 días.

## Respaldos de Postgres

**Hoy no hay copias de seguridad.** El plan Hobby de Railway no las incluye y el cron de abajo no
está puesto (el dueño, el 23 de noviembre de 2026: `docs/diseno/e4-cuenta/00-encargo.md` §9.6). Lo
que se borra se borra, y `Privacy` lo dice (`Backups are not kept.`). Lo que sigue es cómo se
harían el día que se quieran.

Dos capas, según el plan de Railway:

1. **Respaldos gestionados de Railway** si el plan los incluye (recomendado activarlos).
2. **`pg_dump` programado** como red de seguridad, independientemente del plan.

### Script de respaldo

`scripts/backup.sh` vuelca un dump comprimido (`-Fc`) con marca de tiempo y conserva los últimos 14.

```sh
DATABASE_URL=postgres://… scripts/backup.sh /backups
```

Cron nocturno sugerido (03:00 UTC):

```
0 3 * * *  DATABASE_URL=… /app/scripts/backup.sh /backups
```

### Restauración — **procedimiento probado**

`scripts/restore.sh` recrea el esquema y los datos desde un dump. **Sobrescribe** la base actual.

```sh
DATABASE_URL=postgres://… scripts/restore.sh /backups/cyclingstar-YYYYMMDD-HHMMSS.dump
```

Prueba de restauración realizada (Paso 42): respaldo de un mundo poblado → borrado total de la
base → restauración → los recuentos coinciden exactamente (riders=1600, palmares=44,
stage_results=2313). El dump usa formato custom, así que `pg_restore --clean --if-exists` deja la
base idéntica; el script crea la extensión `citext` antes de restaurar (la usa `users.email`).

> Conviene repetir esta prueba tras cada cambio de esquema mayor y guardar la fecha de la última
> restauración verificada.

## Variables de entorno

| Variable                | Uso                                                                                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Conexión a Postgres (obligatoria).                                                                                                                                                                                                                                                                 |
| `WORLD_SEED`            | Semilla del mundo; fija la generación reproducible (SPEC 10).                                                                                                                                                                                                                                      |
| `TICK_INTERVAL_MINUTES` | Minutos reales por día de juego (por defecto 360 = 6 h). Bajarlo acelera el mundo para la alfa (Paso 43).                                                                                                                                                                                          |
| `ADMIN_TOKEN`           | Protege `POST /admin/tick`, `POST /admin/advance` y la lista de bloqueo de nombres (`/admin/names`).                                                                                                                                                                                               |
| `SESSION_SECRET`        | Secreto de firma de sesiones de better-auth (mínimo 32 caracteres).                                                                                                                                                                                                                                |
| `APP_URL`               | URL pública **canónica**: `baseURL` de better-auth, origen de confianza y raíz de los enlaces del correo.                                                                                                                                                                                          |
| `EXTRA_TRUSTED_ORIGINS` | Orígenes de confianza extra, separados por comas. Opcional.                                                                                                                                                                                                                                        |
| `ADMIN_EMAIL`           | Correo del administrador raíz. Opcional; esa cuenta, con el correo confirmado, entra en `/admin`.                                                                                                                                                                                                  |
| `RESEND_API_KEY`        | Clave de Resend. Opcional; sin ella la app arranca y NO manda correo (lo deja dicho en el log).                                                                                                                                                                                                    |
| `MAIL_FROM`             | Remitente: `Cycling Star <no-reply@cyclingstar.app>`. Va en pareja con `RESEND_API_KEY`.                                                                                                                                                                                                           |
| `RESEND_WEBHOOK_SECRET` | Solo `web`, opcional: el secreto `whsec_…` del webhook de Resend (`docs/cuenta.md` §9.2). Sin él, `POST /api/webhooks/resend` no se monta (404) y `email_log` no sabe de rebotes ni quejas. Se da de alta en Resend con el PR 17 de E4.                                                            |
| `MAIL_DAILY_BUDGET`     | Solo `web`: correos del día UTC (por defecto 90, el plan gratuito de Resend da 100; mínimo 31). `verify_signup` para 30 antes (`MAIL_RESET_RESERVE`); con el día gastado, 503 `MAIL_BUDGET_EXHAUSTED` (`docs/cuenta.md` §7.6). Con el plan Pro, 1.500.                                             |
| `VAPID_PUBLIC_KEY`      | `web` y `tick`, opcional: la clave pública VAPID de los avisos del navegador (`docs/cuenta.md` §13.6), 87 caracteres en base64url. Va con las otras dos: sin las tres no se envía nada y la web oculta los avisos; con una o dos, no arranca.                                                      |
| `VAPID_PRIVATE_KEY`     | `web` y `tick`, opcional: la clave privada VAPID (43 caracteres). Se generan las dos UNA vez (`pnpm --filter @cyclingstar/api exec web-push generate-vapid-keys`, PR 17) y no se rotan sin decirlo aquí: cambiarlas rompe todas las suscripciones. Quitar las tres apaga los avisos sin desplegar. |
| `VAPID_SUBJECT`         | `web` y `tick`, opcional: el contacto VAPID, `https://www.cyclingstar.app` (o un `mailto:`).                                                                                                                                                                                                       |
| `BROADCAST_WATCH`       | La retransmisión de E2 (`docs/retransmision.md` §14.6): `off` (por defecto; las rutas de `…/broadcast` dan 404 `broadcast_off`), `admins` (solo los administradores con sesión) u `on` (todos). Un valor fuera de la lista hace fallar el arranque.                                                |
| `TIMELINE_RECORD`       | Que el tick grabe la línea de cada etapa en `stage_timelines` (E2): `on` (por defecto) u `off`, el freno. En `web` y en `tick`, que corren el tick los dos (ver «Migración 0047»). Un valor fuera de la lista hace fallar el arranque.                                                             |
| `AUTO_TICK`             | Solo `web`: con `on` (por defecto) avanza el mundo en su proceso, como siempre; con `off`, lo deja al servicio `tick` (ver «Despliegue (Railway)»). Un valor fuera de la lista hace fallar el arranque.                                                                                            |
| `SPOILER_MODE`          | Solo `web`: el horizonte de E2 (`docs/retransmision.md` §10.13): `off` (por defecto), `admins` (los administradores viven el velo) u `on` (todos). El freno sin desplegar si algo destripa (ver «Migración 0048»). Un valor fuera de la lista hace fallar el arranque.                             |
| `PROGRESS_MIN_DELTA_S`  | Solo `web`, opcional: segundos de carrera que tiene que crecer lo alcanzado para escribirlo en `race_watch` (por defecto 60). Subirlo frena las escrituras sin desplegar (ver «Migración 0048»).                                                                                                   |

Esta tabla nombraba `BETTER_AUTH_SECRET` y `WORLD_SEED`, que el código NO lee: el secreto se llama
`SESSION_SECRET` (`apps/api/src/env.ts`) y la semilla del mundo está fijada en el código
(`'cyclingstar'`), no en el entorno. La lista de arriba es la que valida Zod al arrancar.

## Cambiar de dominio

`APP_URL` es la variable de la que cuelga TODO lo que depende del host: el `baseURL` de better-auth,
la lista de orígenes de confianza, el flag `secure` de la cookie de sesión y la raíz de los enlaces
que se mandan por correo. Al estrenar `www.cyclingstar.app` el login se cayó entero con «Invalid
origin» porque la variable seguía nombrando el dominio de Railway.

El orden, entonces:

1. Añadir el dominio en Railway (servicio `web`) y apuntar el DNS.
2. Comprobar cuál es el **canónico**: si el ápice redirige al `www` —que es el caso—, el canónico es
   `https://www.cyclingstar.app`.
3. Poner `APP_URL` a ese, **sin barra final**, y redesplegar.
4. Si el dominio viejo tiene que seguir funcionando un tiempo, añadirlo a `EXTRA_TRUSTED_ORIGINS`.

La pareja con y sin `www` se acepta sola (`trustedOriginsFor`), así que el paso 4 sólo hace falta
para dominios de verdad distintos.

## Correo transaccional (Resend)

La app manda dos correos, los dos de better-auth: confirmar la dirección al terminar el registro y
recuperar la contraseña. Salen por la API HTTP de Resend (`apps/api/src/mailer.ts`), sin SDK. Ningún
correo de juego: los avisos van por el navegador (ver «Los avisos del navegador»).

**El registro es por aprobación**: quien se registra queda pendiente y no recibe nada hasta que un
administrador lo aprueba en el panel; al aprobar sale el correo para confirmar la dirección, y
abrirlo confirma y abre la sesión. **Confirmar el correo es obligatorio para entrar**
(`requireEmailVerification`): quien intenta entrar con una cuenta aprobada sin haber confirmado
recibe un 403 y, en ese momento, un enlace nuevo. Por eso, **sin Resend configurado nadie nuevo
puede entrar**: en local, el enlace no sale y hay que marcar `users.email_verified` a mano. El
jugador no cambia su correo: lo cambia un administrador desde el panel, sin mandar correo, y queda
escrito (`docs/cuenta.md` §4.9, §5.5 y §8.5).

Las invitaciones de la lista de espera no son un tercer correo: las manda el dueño a mano desde su
buzón, fuera de Resend (`docs/cuenta.md` §4.9).

Puesta en marcha, una sola vez:

1. **Resend → Domains → Add domain**: `cyclingstar.app` (el dominio raíz, no el `www`; el remitente
   será `no-reply@cyclingstar.app` y el correo se manda desde el dominio, no desde el subdominio de
   la web).
2. Copiar los registros que da Resend al DNS del dominio y esperar a que los marque verificados.
   Lo que hay puesto hoy (consultado el 19 de noviembre de 2026, `docs/cuenta.md` §9.1):
   - el return path de Resend en dos `CNAME` hacia Resend: `send.cyclingstar.app` y
     `rsend.cyclingstar.app`,
   - el `TXT` de **DKIM** en `resend._domainkey` (una clave RSA de 1.024 bits; ver «Tareas del DNS»),
   - el `TXT` de **DMARC** en `_dmarc`, `v=DMARC1; p=none;`, puesto y sin informes (sin `rua` ni
     `ruf`), por decisión del dueño (DD-15 C).

   El SPF del dominio raíz es solo para el alojamiento; Resend no lo necesita.

3. **Resend → API Keys → Create**, permiso de sólo envío.
4. En Railway, servicio `web`: `RESEND_API_KEY=re_…` y
   `MAIL_FROM=Cycling Star <no-reply@cyclingstar.app>`. El servicio `tick` NO las necesita: no manda
   correo.

Comprobaciones:

- Las dos variables van EN PAREJA: con una sola, la app **no arranca** (lo dice `env.ts`). Es
  deliberado: media configuración es un despliegue que cree que manda correo y no manda ninguno.
- Sin ninguna de las dos la app arranca igual y cada correo deja una línea
  `correo NO enviado: falta RESEND_API_KEY/MAIL_FROM` en el log. Es el modo de desarrollo local.
- Los enlaces de los correos se construyen sobre `APP_URL`. Si `APP_URL` no es el dominio público
  real, los enlaces llegan apuntando al sitio equivocado.
- Un envío fallido NUNCA rompe la petición del usuario: se registra y se sigue. Buscar en el log
  `correo rechazado por Resend` (trae el código y el motivo) o `fallo al enviar el correo`.
- El log lleva el buzón oculto (`l***@example.com`), nunca la dirección entera.

### El webhook de Resend

Cada envío queda en `email_log` con su estado; el webhook le dice al juego si el correo llegó, rebotó
o acabó en spam (`docs/cuenta.md` §9.2). Con un rebote o una queja, `Account` avisa al jugador de
que su correo no recibe. El plan gratuito permite un webhook, y basta. Alta, una sola vez:

1. **Resend → Webhooks → Add Webhook.**
2. URL: `https://www.cyclingstar.app/api/webhooks/resend` (el `APP_URL` de producción más
   `/api/webhooks/resend`).
3. Eventos: `email.delivered`, `email.bounced`, `email.complained`, `email.suppressed` y
   `email.failed`. Los demás no hacen nada.
4. Guardar y copiar el secreto de firma, que empieza por `whsec_`.
5. En Railway, servicio `web`: `RESEND_WEBHOOK_SECRET=whsec_…`. El servicio `tick` no lo necesita.
6. Comprobar en Resend, en la página del webhook, que el siguiente correo que salga deja una entrega
   con respuesta 200. Un 401 es un secreto equivocado; un 404, que la variable no está puesta (sin
   ella la ruta no existe).

Si algún día se rota el secreto en Resend, se cambia la variable a la vez: con el viejo, cada evento
da 401 y `email_log` deja de saber de rebotes.

### El presupuesto del día y el ritmo de las aprobaciones

`MAIL_DAILY_BUDGET` (por defecto 90) es el tope de correos del día UTC. El plan gratuito de Resend
da 100 al día y 3.000 al mes, y 90 por 31 días son 2.790. Los últimos 30 de cada día quedan para
recuperar contraseñas: a partir de 60, aprobar una cuenta da 503 `MAIL_BUDGET_EXHAUSTED` y no
cambia nada, y se vuelve a intentar al día siguiente (`docs/cuenta.md` §7.6). Solo se cambia con el
plan Pro (20 USD al mes, sin tope diario): entonces, 1.500.

Cada aprobación gasta un correo, y otro si la persona pide un enlace nuevo: entre 1 y 2 por cuenta.
Las tandas son además el calentamiento del dominio (`docs/cuenta.md` §9.4):

| Día desde la primera aprobación | Aprobaciones al día | Para pasar al siguiente                                                  |
| ------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| 1 a 3                           | 25                  | rebotes en `email_log` por debajo del 4 % y quejas por debajo del 0,08 % |
| 4 a 7                           | 40                  | lo mismo, y el día no pasa de 63 envíos (el 70 % de 90)                  |
| desde el 8                      | hasta 50, nunca más | lo mismo; si el día pasa del 70 % dos días seguidos, se vuelve a 25      |

### Tareas del DNS

- **DKIM de 2.048 bits.** La clave de hoy es de 1.024. Google pide 1.024 o más y recomienda 2.048. Si
  el panel de Resend deja elegir la longitud al regenerarla, pasar a 2.048 y cambiar el `TXT` de
  `resend._domainkey`; si no deja, se queda y se apunta aquí.
- **`CAA`.** Hoy no hay, así que cualquier autoridad puede emitir un certificado para el dominio.
  Añadir `cyclingstar.app CAA 0 issue "letsencrypt.org"` y uno igual por cada otra autoridad que
  firme hoy los certificados de `www.cyclingstar.app` y de `cyclingstar.app` (se ve en el candado
  del navegador). Mirarlo antes: un `CAA` sin la autoridad de Railway impide renovar el certificado
  de la web.
- **DMARC con informes**, si algún día se quieren: añadir `rua=mailto:<buzón>` al `TXT` de `_dmarc`.
  Sin informes nadie sabe si un tercero manda correo en nombre de `cyclingstar.app`.

## Los avisos del navegador

E4 avisa por notificación del navegador, nunca por correo (`docs/cuenta.md` §13). Los mandan `web`
y `tick` con `web-push` y las tres variables VAPID. Sin las tres no sale nada, `Account` no enseña
`Notifications` y nadie se suscribe; con una o dos, el servicio no arranca. Quitar las tres apaga
los avisos sin desplegar.

Las claves se generan **una sola vez**:

```sh
pnpm --filter @cyclingstar/api exec web-push generate-vapid-keys
```

**No se rotan.** Cada suscripción del navegador va atada a la clave pública con que se hizo: con
claves nuevas, todas las suscripciones dejan de valer y cada jugador tiene que volver a pulsar
`Turn on`. Si una clave se filtra y hay que cambiarla, se apunta aquí con la fecha.

## Panel de administración (`/admin`)

Entra quien tenga sesión y sea administrador, sin token:

- **El administrador raíz**: la cuenta cuyo correo **confirmado** coincide con `ADMIN_EMAIL`. Es cómo
  entra el primero. Se evalúa en cada petición (no se copia a la base): cambiar la variable cambia
  quién es el raíz. Sin confirmar el correo no es admin, así que registrarse con el correo del dueño
  no da nada.
- **Los que el panel haga admin** (columna `users.is_admin`).

Desde **Account → Admin panel** (el enlace sólo aparece a los admins): arriba, la cola de cuentas
que esperan aprobación, con `Approve` y `Reject`; después, la lista de cuentas con buscador por
correo; por cuenta, confirmar el correo a mano, dar o quitar premium, dar o quitar admin, cambiar el
correo, cambiar la fecha de nacimiento, cambiar el nombre del equipo (también desde la página del
equipo, para los equipos sin dueño) y borrarla (su corredor y su equipo pasan a NPC). Debajo,
`Recent changes`: cada edición de un administrador queda en `admin_audit` con el valor viejo y el
nuevo. La API impide quitarse el admin a uno mismo, borrarse desde el panel (eso se hace en Account,
con contraseña), borrar al raíz, cambiarle el correo, la confirmación, el papel o la fecha, y dar a
otra cuenta el correo de `ADMIN_EMAIL` (`docs/cuenta.md` §8.5).

**El panel no tiene segundo factor** (`docs/cuenta.md` §8.6): quien tenga el buzón de `ADMIN_EMAIL`
puede recuperar la contraseña del raíz y tiene el panel. Lo que lo frena es el segundo factor del
propio buzón. **Tarea del dueño:** tenerlo activado en ese buzón (y en el de cualquier otra cuenta
que el panel haga admin).

El `ADMIN_TOKEN` sigue valiendo para todas las rutas de admin: es la puerta de las máquinas (cron,
scripts). Un token presente y equivocado se rechaza aunque la sesión sea de admin.

## Lista de bloqueo de nombres (admin)

Nombres de equipos reales y de ciclistas / personas famosas reales que no deben usarse en el juego.
Se gestionan desde la página **`/admin/names`** (enlazada desde el panel): un admin con sesión entra
directo; sin sesión, se pega el `ADMIN_TOKEN` para desbloquearla. Ahí se añade o quita nombres en dos listas (equipos y personas). Un nombre bloqueado
nunca se genera, y cualquiera que ya exista se renombra automáticamente en el siguiente _tick_ del
mundo (la reparación es idempotente). La comparación ignora mayúsculas y espacios sobrantes.

## Despliegue (Railway)

- Servicio web: `node apps/api/dist/index.js` (aplica migraciones al arrancar con advisory lock).
  También avanza el mundo en su proceso (`autoTick`), salvo con `AUTO_TICK=off`, que se pone cuando
  el servicio `tick` está en marcha: mientras simula una etapa grande, la web no contesta durante
  segundos (`docs/retransmision.md` 18-k). Con `off`, el mundo avanza solo cuando corre el cron de
  `tick` (`railway.tick.json`, cada 5 minutos). **Antes de ponerlo**, en Railway: que exista el
  servicio `tick` (sin él, el mundo se para), que su último despliegue sea el mismo commit que el de
  `web` y que tenga su mismo `TICK_INTERVAL_MINUTES` (con el cron de antes, a horas fijas, el sondeo
  de `web` llegaba siempre antes, así que un `tick` atrasado o roto no se notaba). Después, que el
  día siguiente llegue a su hora (la cuenta atrás de la cabecera) y que el panel de administración
  muestre su fila en `tick_log`. `POST /admin/tick` y `/admin/advance` funcionan igual.
- Cron del tick: cada 5 minutos avanza los días vencidos según `TICK_INTERVAL_MINUTES`, como el
  sondeo del auto-tick. Sondea en lugar de esperar a la hora del día nuevo porque esa hora no es
  fija: sale de `worlds.created_at` (la hora en que nació el mundo, re-anclada tras cada avance
  manual) y no de las horas del reloj. Con el cron de antes (`0 */6 * * *`) y `AUTO_TICK=off`, cada
  día llegaría con el desfase entre las dos: 4 h 41 min en el mundo del 2 de octubre de 2026, nacido
  a las 07:18:31 UTC, con la cabecera en `next update in moments` todo ese rato. Cada pasada sin días
  pendientes deja su fila `sin días pendientes` en `tick_log`, como el auto-tick, y es un arranque
  corto del contenedor, que Railway cobra por uso: si pesa en la factura, `*/15 * * * *` también
  vale (el día llega hasta un cuarto de hora tarde). Railway no baja de 5 minutos ni garantiza el
  minuto exacto.
- Réplicas de `web`: 1 (`railway.json` no fija `numReplicas`, y el plan Hobby da una; H-03, E4 PR 6). Con más de una, los límites por cuenta, aparato, sesión e IP de correo (`auth_limits`, en Postgres) siguen valiendo; los de Fastify, en memoria, pasan a ser «por réplica».
- Las migraciones son aditivas (Drizzle) y se aplican solas al arrancar; no hay pasos manuales. La
  excepción es la 0044, que reinicia el mundo (ver «Migración 0044» más abajo). La 0045 borra los
  datos de la vuelta de prueba (ver «Migración 0045»).

## Cambio de calendario de la v87: congelar antes de desplegar (generador E1, paso 8)

La v87 cambia el recorrido de las 1.241 etapas no reales del calendario (`docs/generador.md` §15.10;
`docs/balance.md`, v87 §1). Un recorrido se congela en `race_routes` el día de la etapa 1 de su carrera
(`calendarRun.ts`, `freezeRaceRoute`), así que en un mundo vivo las carreras que ya han empezado o ya
tienen convocatoria llevan el recorrido VIEJO y no pueden cambiarlo a mitad. Por eso, en cualquier
mundo vivo y **antes de desplegar la v87** (`docs/generador.md` §15.1 regla 5, decisión 45):

1. Con el código de la **v86** todavía desplegado, calcula el día del mundo: `gameDay` del mundo,
   `season = floor(gameDay / 364)` y `díaDeTemporada = gameDay % 364` (`SEASON_DAYS`, `calendarRun.ts`).
2. Elige SOLO las carreras de la temporada en curso que ya han empezado o ya están convocadas:
   `startDay ≤ díaDeTemporada + 5` (`CALLUP_LEAD_DAYS`, `packages/db/src/callups.ts`), campeonatos
   nacionales incluidos. Su `raceKey` es `${race.id}:s${season}`.
3. Llama a `backfillRaceRoutes(db, worldId, raceKeys)` (`packages/db/src/raceRoutes.ts`) con esa
   lista y con el generador ACTUAL (v86): congela lo que esas carreras ya tienen. Es idempotente (no
   pisa una carrera ya congelada). NO le pases todas las carreras: congelaría el calendario viejo
   entero hasta la temporada siguiente y el mundo no vería el generador nuevo.
4. Despliega la v87. Las carreras no empezadas se congelan solas con el generador nuevo el día de su
   etapa 1.
5. Con la v87 ya desplegada, llama una vez a `reclassifyRouteSource(db, worldId)`
   (`packages/db/src/raceRoutes.ts`): antes de la v87 `freezeRaceRoute` escribía `'generado'` en
   toda fila, y la ficha diría «Generated route» debajo de un recorrido real. Solo reescribe
   `route_source`, devuelve la cuenta por origen y es idempotente.

Las dos funciones no tienen llamador en producción: se corren a mano (una consola con
`@cyclingstar/db` contra la base del mundo). Ninguna se ha corrido todavía en ningún mundo. **El
mundo de producción se reinicia antes del lanzamiento**, así que en la práctica este procedimiento
solo aplica a un mundo de pruebas que sobreviva al despliegue; en uno creado después de la v87 no
hace falta nada.

Qué ve un mundo que sobrevive. Para ver E1 hace falta un mundo creado después de la v87, o mirar
las carreras que no estaban empezadas ni convocadas al correr el backfill: las ya congeladas
conservan el perfil viejo hasta la temporada siguiente. Desde la temporada 1 cada carrera se
congela con su edición de esa temporada (`freezeRaceRoute(..., season)`), así que todo el
recorrido no real sale ya de la gramática.

La v88 cambia el perfil de cinco reinas de la temporada 0 (`docs/balance.md`, v88). En un mundo que
ya corre la v87 valen los pasos 1 a 4 con el código de la v87 desplegado y la v88 en lugar de la
v87 en el paso 4; el paso 5 no hace falta otra vez.

## Transición E1 en el tick: las carreras de los próximos 10 días conservan el recorrido viejo

Desde el despliegue de la v87/v88 toda carrera no congelada se lee (y se correrá) con el generador
nuevo, también las de la semana siguiente, que ya pueden estar convocadas y vistas con el recorrido
viejo. El primer tick tras desplegar este cambio lo corrige solo, antes de procesar ningún día
(`congelarTransicionE1`, `packages/db/src/transicionE1.ts`, llamada al principio de `runTick`):

- congela con el recorrido del generador viejo (`legacyCalendar()`: perfil, `kind`, `label`,
  `time_trial` y `route_source`; `arch` nulo) toda carrera NO congelada cuya etapa 1 cae en los días
  de juego `[díaActual, díaActual + 10]`, cada una con la `raceKey` de su temporada (la ventana
  puede cruzar de temporada);
- no toca ninguna carrera ya congelada (las empezadas conservan la suya);
- corre UNA vez por mundo: deja la marca `worlds.e1_transicion_hasta` (migración
  `0042_transicion_e1`) con el último día de la ventana, y con la marca puesta no hace nada. Un
  mundo nuevo nace con -1 y no congela nada.

Va en su propia transacción: si falla, se registra en consola y en las notas de `tick_log` y el
tick sigue; sin la marca, el próximo tick lo reintenta. Si corre bien, `tick_log.notes` dice cuántas
carreras congeló y en qué ventana. No hay pasos manuales. Es TEMPORAL: cuando se borre
`packages/engine/src/sim/legacy/` ya habrá corrido, y la operación y la exportación de
`legacyCalendar` se borran con él.

## Galería de recorridos (generador E1)

Páginas estáticas con los perfiles que dibuja el generador, zona por zona y carrera por carrera,
para revisarlos a ojo (`docs/generador.md` sección 16). No se versiona: se regenera cuando se quiere
mirar.

```bash
npx tsc -b packages/shared packages/engine      # el script lee los dist
node scripts/galeria-recorridos.mjs             # escribe docs/galeria-recorridos/
node scripts/galeria-recorridos.mjs --comprobar # lo mismo y sus cinco comprobaciones (sale 1 si falla alguna)
```

Se abre `docs/galeria-recorridos/index.html` en el navegador; desde ahí se llega a las 37 páginas
(unos 25 MB). `--comprobar` compara las etapas del calendario con `docs/galeria-sello-paso6.json`,
que sí se versiona; `--sellar` lo reescribe y solo se usa en un cambio que mueve perfiles a
propósito, con la causa en la nota de balance.

## Monitorización

- **Sentry (plan gratuito)** — _pendiente de configurar_: crear proyecto, añadir DSN como variable
  de entorno e inicializarlo en el arranque de la API. Capturar errores del tick y de la API.
- `tick_log` en la base registra cada avance del mundo (días procesados, duración, ok) para auditoría.
- `/health` expone estado del servidor, versión del motor, día de juego y si las migraciones se aplicaron.
- **Los logs de Railway** se guardan 7 días (plan Hobby): lo que pasó antes no se puede mirar. Llevan
  la IP entera de cada petición, y `Privacy` lo dice.

## Tareas manuales pendientes (requieren cuentas/gestiones externas)

- **Verificación de marcas** — comprobar en TMview (EUIPO) y USPTO el nombre comercial
  «Cycling Star» y los nombres «Race + Geografía» del calendario antes del lanzamiento (SPEC 8).
  La marca protegida es el nombre comercial, no la geografía ni el formato; no imitar logotipos,
  tipografías ni identidades visuales reales.
- **Aviso de privacidad**: publicado en `/privacy` (la IP no se guarda con la cuenta, sí en los
  logs de Railway durante 7 días; el correo solo sirve para confirmar el registro y recuperar la
  contraseña: `docs/cuenta.md` §10.1). Revisar con la legislación aplicable antes del
  lanzamiento público.
- **Sentry** — ver arriba.

## Migración 0043: topes del arquetipo en el mundo vivo

Se aplica sola con el `migrate.mjs` del tick. Baja a 83 el techo y el atributo de los físicos que el arquetipo de cada BOT penaliza (offset ≤ −14 en `ARCHETYPE_CEILING_OFFSETS`, sin TAC). No toca a los corredores con `user_id`. Es de un solo sentido: los valores anteriores no se guardan, así que si hiciera falta deshacerla habría que restaurar la copia de seguridad previa (`scripts/backup.sh`). El porqué, en `docs/balance.md`.

## Migración 0044: reinicio del mundo con copia dentro de la base

Decisión del dueño (02/10/2026): el mundo de producción se borra entero y empieza uno nuevo con la génesis v2 (semilla `cyclingstar-2`, motor v90). Como nadie tiene acceso externo a la base de producción, la copia de seguridad la hace la propia migración, dentro de la base y antes de borrar. Borra datos a propósito, pero se aplica sola al arrancar, como todas, y no hay pasos manuales para el despliegue. El SQL y su cabecera están en `packages/db/drizzle/0044_reinicio_del_mundo.sql`; el test que la prueba entera (copia, borrado, génesis y restauración) es `packages/db/src/reinicioDelMundo.test.ts`.

### Qué hace

Todo en la transacción del migrador de Drizzle, que aplica las migraciones pendientes en una sola transacción. Si algo falla, la base queda exactamente como estaba y el servicio no arranca (Railway lo reintenta).

1. Toma el candado del tick en su versión de transacción: espera a que termine un tick en curso del servicio viejo y no deja empezar otro hasta el final.
2. Bloquea las 29 tablas del mundo (ACCESS EXCLUSIVE), para que nadie escriba entre la copia y el borrado.
3. Crea el esquema `respaldo_mundo_1` con una copia de cada una (solo datos: sin índices ni claves) y la tabla `respaldo_mundo_1.leeme`, con una fila: cuándo, motor 90, el motivo, el id del mundo, su semilla y su día de juego. El esquema se crea sin `IF NOT EXISTS`: si ya existiera, la migración falla sin tocar nada.
4. Vacía las 29 tablas con un único `TRUNCATE`.

Se copian y se vacían: `worlds`, `game_state`, `tick_log`, `teams`, `riders`, `rider_attrs`, `rider_hidden`, `rider_attr_log`, `rider_daily_log`, `rider_points`, `rider_race_prefs`, `training_plans`, `training_orders`, `team_training_orders`, `race_routes`, `race_rosters`, `race_entries`, `race_callups`, `team_race_plan`, `stage_orders`, `stage_results`, `race_gc`, `stage_team_results`, `stage_snapshots`, `palmares`, `news`, `transactions`, `contracts` y `offers`. Incluye los equipos con dueño y los corredores de los jugadores.

Se conservan: `users`, `accounts`, `sessions` y `verifications` (cuentas, credenciales y sesiones abiertas; también `premium` e `is_admin`) y `blocked_names` (la lista de bloqueo de los admins, que vale para cualquier mundo). La contabilidad de Drizzle vive en el esquema `drizzle` y no se toca.

### Después de la migración

- El servicio web lanza un tick nada más arrancar y el servicio tick hace lo mismo tras `migrate.mjs`. Con `game_state` vacío, `ensureGenesis` crea el mundo nuevo (semilla `cyclingstar-2`, ya reparado y con `e1_transicion_hasta` = -1, así que ni las reparaciones de mundos viejos ni la transición E1 hacen nada) y `seedWorld` siembra equipos y corredores. Entre el final de la migración y el final de esa génesis, la API responde como en una base nueva: sin mundo (`mundo_no_inicializado` al crear ciclista, listas vacías) y luego con un mundo sin equipos durante la siembra. Son segundos.
- **Los jugadores tienen que crear un ciclista nuevo.** Siguen dados de alta y con la sesión abierta; al entrar, la web les ve sin ciclista y les lleva a `/create`, que es el camino de siempre de un jugador nuevo. Un jugador premium que había tomado un equipo bot tiene que volver a tomarlo. El genoma del ciclista nuevo se siembra con la semilla del mundo nuevo, así que no repite el del anterior.
- Si el despliegue ocurre con un tick a medio procesar en el servicio viejo, la migración espera a que termine. Si el servicio viejo choca con ella por los bloqueos de las tablas, Postgres aborta a uno de los dos: si es la migración, no ha pasado nada y Railway reintenta el arranque.

### Espacio en disco

La copia es una segunda copia de los datos del mundo 1. Durante la migración la base llega a tener el mundo dos veces (más el WAL de la copia). Al terminar, el `TRUNCATE` libera las tablas originales, de modo que queda la copia (más o menos lo que pesaban los datos del mundo 1, sin índices) más el mundo nuevo, que empieza pequeño y crece. Cuando el mundo nuevo llegue al tamaño del viejo, la base ocupará del orden del doble de lo que ocupaba el mundo 1, hasta que se borre la copia. Lo que pesa la copia se ve con:

```sql
SELECT pg_size_pretty(sum(pg_total_relation_size(c.oid)))
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'respaldo_mundo_1' AND c.relkind = 'r';
```

Los dumps de `scripts/backup.sh` incluyen también el esquema `respaldo_mundo_1`.

### Restaurar el mundo 1

Nunca SQL a mano en producción: se hace con una migración custom (`pnpm exec drizzle-kit generate --custom --name=restaurar_mundo_1` dentro de `packages/db`) con este contenido. Vacía el mundo nuevo y vuelve a meter el viejo; los jugadores que hubieran creado un ciclista en el mundo nuevo lo pierden y recuperan el del mundo 1. Antes de reinsertar pone a NULL el usuario de los corredores y equipos cuyo usuario se haya borrado después del reinicio, porque si no la clave foránea rompería la restauración.

```sql
UPDATE respaldo_mundo_1.riders SET user_id = NULL
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
UPDATE respaldo_mundo_1.teams SET owner_user_id = NULL
  WHERE owner_user_id IS NOT NULL AND owner_user_id NOT IN (SELECT id FROM public.users);
TRUNCATE TABLE worlds, game_state, tick_log, teams, riders, rider_attrs, rider_hidden,
  rider_attr_log, rider_daily_log, rider_points, rider_race_prefs, training_plans,
  training_orders, team_training_orders, race_routes, race_rosters, race_entries, race_callups,
  team_race_plan, stage_orders, stage_results, race_gc, stage_team_results, stage_snapshots,
  palmares, news, transactions, contracts, offers CASCADE;
TRUNCATE TABLE stage_timelines, race_watch;
INSERT INTO public.worlds SELECT * FROM respaldo_mundo_1.worlds;
INSERT INTO public.game_state SELECT * FROM respaldo_mundo_1.game_state;
INSERT INTO public.tick_log SELECT * FROM respaldo_mundo_1.tick_log;
INSERT INTO public.teams SELECT * FROM respaldo_mundo_1.teams;
INSERT INTO public.riders SELECT * FROM respaldo_mundo_1.riders;
-- y una línea igual por cada una de las otras 24 tablas, en el orden de la lista del TRUNCATE.
```

Tal cual (con las 29 líneas) lo corre el test de la 0044 y deja el mundo 1 idéntico. Dos condiciones: `SELECT *` solo vale mientras ninguna migración posterior haya cambiado las columnas de esas tablas (si alguna lo hizo, se escriben las columnas a mano), y el código desplegado tiene que entender el mundo 1, que corría con el motor v90.

El segundo `TRUNCATE` es de la 0047 (E2, paso 5) y de la 0048 (paso 7a): `stage_timelines` no tiene copia, porque el mundo 1 no grabó ninguna línea (sus etapas se retransmiten con el adaptador), y sin él se quedarían las líneas del mundo nuevo con las mismas claves que las etapas del viejo (ver «Migración 0047»); `race_watch` tampoco, porque el mundo 1 no guardaba lo visto, y lo que los jugadores vieron en el mundo nuevo no vale para el viejo (el `TRUNCATE … CASCADE` de la primera línea ya la vaciaría, porque cuelga de `worlds`, pero se nombra a la vista). Después, el servicio `web` se reinicia, cosa que ya hace el despliegue de la migración.

### Borrar la copia

Cuando el dueño dé el mundo nuevo por bueno, otra migración custom con `DROP SCHEMA respaldo_mundo_1 CASCADE;` libera el espacio. Hasta entonces no estorba: ningún código la lee.

## Migración 0045: sin vuelta de prueba

Decisión del dueño (02/10/2026): la vuelta de prueba del MVP (clave `test-tour`) desaparece del juego. El tick ya no la corre (`race.ts` y `npc.ts` de packages/db se borraron) y la API ya no sirve `/api/races/test-tour*`. La migración `0045_sin_vuelta_de_prueba.sql` limpia lo que el mundo nuevo llegó a escribir en su GD1: rosters, órdenes, resultados, general, clasificación por equipos, snapshots y palmarés con `race_id = 'test-tour'`; sus puntos de ranking (descontados también de `season_points` si son de la temporada en curso); los premios del corredor con nota «Test tour · …» (descontados de `riders.money`); el parte diario `carrera:test-tour:eN`, y los titulares que nombran la vuelta. El premio de equipo no deja rastro por carrera y se queda en el presupuesto. La fisiología de esos días tampoco se toca. Lo comprueba `sinVueltaDePrueba.test.ts`.

Si algún día se restaura el mundo 1 desde `respaldo_mundo_1`, sus filas de la vuelta de prueba vuelven con él: la migración de restauración puede repetir las sentencias de la 0045 al final.

## Migración 0047: la línea temporal de cada etapa (E2)

La `0047_linea_temporal` solo añade: la tabla `stage_timelines`, una fila por etapa corrida con su línea temporal comprimida (`body`, gzip en `bytea`), y su índice por `game_day`. Se aplica sola al arrancar, como todas, y todavía nadie la lee: servir la línea grabada llega con el paso 6a de E2 (`docs/retransmision.md` §17.9); hasta entonces la retransmisión sale del adaptador, como antes.

Desde este despliegue, con `TIMELINE_RECORD=on` (el defecto), el tick graba la línea de cada etapa que corre, dentro de la transacción del día y con un solo `INSERT` al final del día. Grabar no cambia ninguna carrera: el tick deja las mismas filas con `on`, con `off` y con el código de antes de la 0047 (B15, `scripts/bench-tick.mjs`). Y nunca para el tick: si grabar una etapa falla, la etapa se queda con una lápida (una fila con `format` 0 y el motivo, sin línea) y el día sigue; si falla el `INSERT` del día, todas sus etapas se quedan con lápida y el día se confirma igual. Lo que no se graba no se rellena después: esas etapas se retransmitirán con el adaptador, desde lo que guardó `stage_snapshots`.

**Coste** (B15, `scripts/bench-tick.mjs`, sobre PGlite y el mundo de la génesis): el día 179 (114 nacionales en línea) tarda de 5 a 7 s más con la grabación, del 8 al 11 %, y el 176 (82 cronos nacionales), de 0,3 a 1 s más, del 2 al 7 %; el umbral de `docs/retransmision.md` 16-l (más de un 25 % y más de 15 s a la vez) queda lejos. En disco, unos 3 KB por crono nacional y 16 KB por nacional en línea (medianas de B15), y de 14 a 52 KB por etapa de vuelta grande o clásica; el diseño estima del orden de 36 MB por temporada, como cota superior (`docs/retransmision.md` §5.7).

**El freno**: `TIMELINE_RECORD=off` en Railway, en `web` y en `tick`, sin desplegar.

### Qué mirar

En `tick_log.notes`, que el panel de administración enseña, cada tick que corre etapas apunta `timeline: N grabadas, M sin línea` y detrás una nota por problema (como mucho 20, y `… y N más`):

- `timeline error: <carrera> e<etapa> <motivo>`: esa etapa se quedó sin línea, con lápida. Con el motivo `ya tenía fila`, la etapa ya tenía una fila con esa clave y no se escribió la nueva: el síntoma de un reinicio que no vació `stage_timelines` (abajo).
- `timeline error: el INSERT del día falló (N etapas): <motivo>`: todo el día sin línea, con lápidas. Si detrás viene `las lápidas del día tampoco se escribieron`, esas etapas no tienen fila ninguna, y se retransmiten igual con el adaptador.
- `timeline I1: <carrera> e<etapa> km <k>` o `timeline I5: <carrera> e<etapa> rider <id>`: la autocomprobación vio que la línea no reproduce la carrera corrida (I1 en línea, I5 en crono), y la etapa se quedó sin línea, con lápida. Es un fallo del grabador, no del tick: hay que mirarlo, pero la carrera es buena.
- `timeline size: <carrera> e<etapa> <bytes>`: una línea por encima del tope de aviso (96 KB en línea, 48 KB en crono). Se graba igual.

### Lo que un reinicio hace con la línea

`stage_timelines` va por la clave de la carrera y la etapa (`race-france:s0`, 3), sin el mundo, igual que `stage_snapshots`, y se escribe sin pisar (`ON CONFLICT DO NOTHING`). Un reinicio que no la vacíe deja las líneas del mundo viejo con las claves que el mundo nuevo va a usar: el mundo nuevo no puede grabar las suyas (`ya tenía fila`) y, desde el paso 6a, se serviría la línea del viejo. Por eso todo reinicio del mundo:

1. **Vacía `stage_timelines` con `stage_snapshots`.** Un reinicio como la 0044 la copia y la vacía con las demás tablas del mundo; la restauración del mundo 1 la vacía sin más (arriba, «Restaurar el mundo 1»). La 0044 ya aplicada no la nombra porque es anterior a ella.
2. **Borra `race_watch` entera** (la 0048, paso 7a de E2; ver «Migración 0048»). Es lo que cada jugador ha visto de cada carrera, y lo visto en el mundo viejo no es lo visto en el nuevo. Lleva el mundo en la clave, así que olvidarla no destripa nada (las filas viejas no casan con el mundo nuevo y solo ocupan sitio), y cuelga de `worlds` con borrado en cascada: un reinicio que borre la fila de `worlds`, o que la vacíe con `TRUNCATE … CASCADE` como la 0044, la vacía solo. Aun así se nombra a la vista, como en la restauración del mundo 1 (arriba): `TRUNCATE TABLE stage_timelines, race_watch;`. Las columnas nuevas de `users` (`spoiler_scope`, `reveal_confirm`, `horizon_rev`, `last_seen_at`) se quedan con las cuentas: son preferencias de la persona, no del mundo.
3. **Después, reinicia el servicio `web`.** Guarda líneas en memoria por carrera y etapa, sin el mundo: la LRU del adaptador desde el paso 3a de E2 y, desde el 6a, la de las líneas grabadas. Y desde el 7a, el memo del horizonte, el mapa de la última etapa corrida de cada carrera (los dos van por el día de juego) y la memoria de lo alcanzado. Un proceso que sobreviva al reinicio serviría datos del mundo viejo. Si el reinicio va en una migración, el despliegue ya reinicia `web`; si se hace de otra forma, hay que reiniciarlo a mano.
4. **Las noticias, y lo que queda pendiente para después.** Las del mundo viejo se van con él (un reinicio como la 0044 copia y vacía `news`) o, si se quedan, el feed las filtra por su `world_id`; las del mundo nuevo nacen con sus datos (`payload` y `seed`, la 0046), que es lo que deja redactarlas al leer. `news.text` se sigue escribiendo y mandando por compatibilidad hasta una versión de web después del reinicio (`docs/retransmision.md` §12.8 y §17.15): entonces, un PR mínimo deja de escribirlo y de mandarlo, con una web desplegada antes que lo lea como opcional (hoy `newsItemSchema.text` es obligatorio).

Releído en el paso 12 de E2 contra el procedimiento entero del diseño (`docs/retransmision.md` §13.9, 17-y): lo de los pasos 5 y 7a estaba entero; el paso 12 añade el punto 4.

## Migración 0048: lo visto y el horizonte (E2)

La `0048_lo_visto` solo añade: el enum `spoiler_scope`, cuatro columnas de `users` (`spoiler_scope`, por defecto `guarded`; `horizon_rev`, 0; `last_seen_at`, null; `reveal_confirm`, `true`), la tabla `race_watch` (lo que cada jugador ha visto de cada carrera, una fila por jugador, mundo y carrera, con tres restricciones que guardan sus invariantes) y el índice `race_rosters_rider_idx`. Las columnas nuevas llevan un defecto constante o null, así que no reescriben `users`; el índice recorre `race_rosters` una vez (del orden de 0,1 a 0,25 s con un año de listas de salida, `docs/retransmision.md` §13.1).

Se aplica sola al arrancar, como todas, y **nunca a la vez que un día del tick**: con migraciones pendientes, `runMigrations` toma primero el candado del tick (espera a que acabe el día en curso) y fija `lock_timeout` de 10 s, así que su `ALTER TABLE users` no deja en cola las lecturas de `users` que better-auth hace en cada petición con sesión. Si una tabla sigue ocupada, el arranque falla y Railway lo reintenta (regla 9 de §17.1 del diseño).

Desde este despliegue, quien tiene `Watch` (con `BROADCAST_WATCH`) escribe lo que ve: el reproductor informa de lo alcanzado (`POST /api/me/watch/…`) y la meta escribe la letra de la etapa (`POST …/broadcast/finish`). Se escribe con cualquier valor de `SPOILER_MODE`: lo visto tiene que estar ahí cuando el velo se encienda. Nadie más lee `race_watch` (ningún premio, logro ni dinero depende de lo visto; lo vigila `revealFree.test.ts`).

**Las dos variables nuevas** (solo `web`):

- `SPOILER_MODE`: `off` (por defecto; nadie tiene horizonte y todo se sirve como hasta ahora), `admins` (los administradores viven el velo: desde el paso 7 de E2) u `on` (todos, al cerrar el paso 10). En el 7a el horizonte todavía no recorta ninguna respuesta: lo calcula, lo memoriza y lo usa la puerta del progreso; las rutas lo aplican del 7b al 8b. **El freno**: `SPOILER_MODE=off` en Railway, sin desplegar, si algo destripa o el horizonte se nota lento (B14 mide un p95 de 5 ms en el CI; la medida desde `web` contra una copia de producción está pendiente, DD-21).
- `PROGRESS_MIN_DELTA_S`: opcional. Los segundos de carrera que tiene que crecer lo alcanzado para escribirlo (por defecto 60). Si las escrituras de `race_watch` pesan, se sube sin desplegar: el espectador no lo nota, porque el tope de los tramos lee la memoria del proceso y no lo escrito.

**La cookie `cs_viewer`.** A quien entra con sesión en una ruta con horizonte se le pone, como mucho una vez al día, una cookie `HttpOnly` firmada con `SESSION_SECRET` que solo restringe: si vuelve con la sesión caducada (siete días), las páginas públicas le velan lo que no ha visto en vez de contarle quién ganó. Ninguna ruta privada se abre con ella y ninguna escritura la acepta. `POST /api/auth/sign-out` y `delete-user` la borran. Cambiar `SESSION_SECRET` las invalida todas (y las sesiones también): sin más efecto que volver a ver resultados hasta entrar.

**Lo que guarda en memoria el proceso `web`**: el horizonte de cada espectador (60 s, por día de juego y `horizon_rev`), la última etapa corrida de cada carrera (una vez por día de juego), el usuario de cada cookie de sesión (60 s; una sesión cerrada en otro sitio sigue valiendo hasta 60 s para leer con horizonte o informar de lo alcanzado) y lo último informado de lo alcanzado (se escribe al cambiar de etapa, en la meta, cada 60 s de carrera y 15 de pared, y al barrerse tras 60 s sin informes). Reiniciar `web` lo vacía sin perder nada que importe: lo alcanzado no escrito son, como mucho, unos segundos de carrera, y el reproductor lo vuelve a informar.

### Qué mirar

- En el log de `web`, `touchLastSeen` con un error: la escritura de `users.last_seen_at` falló (se lanza sin esperar y nunca tumba el proceso). Y `race_watch: lo alcanzado no se escribió al barrer`: una escritura de lo alcanzado que el barrido lanzó sin esperar y falló; el siguiente informe del espectador la repite.
- Con `SPOILER_MODE=admins`, el dueño, en `GET /api/me/horizon`, lo que tiene por ver.

## Dependencias: la subida de seguridad (22/11/2026)

La auditoría de la noche (`cobertura.yml`, `pnpm audit`) marcaba 59 avisos: 1 crítico, 24 altos, 26 moderados y 8 bajos. Se subieron:

- `better-auth`, de 1.6.25 a 1.7.27, en la API y en la web: el crítico (GHSA-965c-763c-88jm) y dos altos, de OAuth, el enlace mágico y el acceso por dispositivo, que la API no usa (solo correo y contraseña). Los nombres de las cookies de sesión no cambian (`better-auth.session_token`, `session_data` y `dont_remember`), así que nadie pierde la sesión al desplegar; y las tablas tampoco: los flujos de la cuenta pasan sobre PGlite con las migraciones de siempre.
- `fastify`, de 5.11.2 a 5.12.8, y `@fastify/static`, de 10.1.2 a 10.1.12 (por su `glob`); por debajo, `fast-uri` (3.1.9 y 4.2.3) e `ip-address` (10.7.6, el de `@fastify/rate-limit`).
- `zod`, de 4.4.3 a 4.6.7 (el catálogo de `pnpm-workspace.yaml`).
- De desarrollo: `vite` a 8.3.8 y `vitest` a 4.1.12, y por debajo `brace-expansion`, `js-yaml` y `source-map-js`.

Quedan 3 avisos, todos de herramientas de desarrollo: `esbuild` 0.18 (su servidor de desarrollo, que solo arranca `drizzle-kit`, al que también tira `better-auth`), `minimatch` 10 (de `typescript-eslint`) y `zod` 4.4.3 (de `eslint-plugin-react-hooks`). Ninguno llega a lo que sirve la API ni a la web construida.

Dos topes cambian con la subida, por decisión del dueño. El del JS de arranque de la web (`ENTRY_JS_MAX_GZ`, `apps/web/scripts/peso.test.mjs`) pasa de 160 a 165 KB con gzip: zod 4.6 añade 7,3 KB a `request.js`, y el arranque pasa de 152,9 a 161,0 KB. Y el de la anotación de la voz en frío (B8, `apps/api/src/voicePrefix.test.ts`) pasa de 10 a 15 ms de mediana: la misma versión daba de 6,8 a 10,9 ms entre tandas, y el tope caía dentro del ruido de la medida.

## La IP del límite de peticiones, detrás de Railway (comprobado el 22/11/2026)

La API arranca con `trustProxy: true` (`apps/api/src/app.ts`), así que la IP de cada petición, la clave de los límites de `apps/api/src/security.ts` (entre ellos el de las contraseñas, 10 intentos cada 5 minutos), es la primera de `X-Forwarded-For`. Si el proxy de Railway la dejara pasar tal cual, quien la falseara esquivaría el límite. Comprobado desde fuera, solo con GET sobre `/api/teams`: con un `X-Forwarded-For` inventado y fijo, el contador `x-ratelimit-remaining` no empieza en 299 ni baja de uno en uno, sino que sigue a las IP reales de quien pregunta. El borde de Railway (`server: railway-hikari`, sin CDN delante) reescribe la cabecera, y la IP falsa no llega a ser la clave. No hace falta cambiar nada; si algún día se pone otro proxy o una CDN delante, hay que volver a comprobarlo, y entonces `trustProxy` debería contar los saltos de confianza en lugar de fiarse de todos.

Desde E4 (PR 6) los límites no leen `request.ip` a pelo sino `clientIp` (`apps/api/src/clientIp.ts`), que comprueba que sea una IP (si no, usa la del socket y apunta `xff_varias` en el log, como mucho una vez por hora), y una IPv6 cuenta por su /64. `trustProxy` sigue en `true`.
