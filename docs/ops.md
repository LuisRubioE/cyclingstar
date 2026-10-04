# Operación (SPEC 12, Paso 42)

Runbook de operación de Cycling Star. Cubre respaldos, restauración (probada), variables de
entorno, despliegue y las tareas manuales pendientes (legal, monitorización).

## Respaldos de Postgres

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

| Variable                | Uso                                                                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Conexión a Postgres (obligatoria).                                                                                                                                                                                                                  |
| `WORLD_SEED`            | Semilla del mundo; fija la generación reproducible (SPEC 10).                                                                                                                                                                                       |
| `TICK_INTERVAL_MINUTES` | Minutos reales por día de juego (por defecto 360 = 6 h). Bajarlo acelera el mundo para la alfa (Paso 43).                                                                                                                                           |
| `ADMIN_TOKEN`           | Protege `POST /admin/tick`, `POST /admin/advance` y la lista de bloqueo de nombres (`/admin/names`).                                                                                                                                                |
| `SESSION_SECRET`        | Secreto de firma de sesiones de better-auth (mínimo 32 caracteres).                                                                                                                                                                                 |
| `APP_URL`               | URL pública **canónica**: `baseURL` de better-auth, origen de confianza y raíz de los enlaces del correo.                                                                                                                                           |
| `EXTRA_TRUSTED_ORIGINS` | Orígenes de confianza extra, separados por comas. Opcional.                                                                                                                                                                                         |
| `ADMIN_EMAIL`           | Correo del administrador raíz. Opcional; esa cuenta, con el correo confirmado, entra en `/admin`.                                                                                                                                                   |
| `RESEND_API_KEY`        | Clave de Resend. Opcional; sin ella la app arranca y NO manda correo (lo deja dicho en el log).                                                                                                                                                     |
| `MAIL_FROM`             | Remitente: `Cycling Star <no-reply@cyclingstar.app>`. Va en pareja con `RESEND_API_KEY`.                                                                                                                                                            |
| `BROADCAST_WATCH`       | La retransmisión de E2 (`docs/retransmision.md` §14.6): `off` (por defecto; las rutas de `…/broadcast` dan 404 `broadcast_off`), `admins` (solo los administradores con sesión) u `on` (todos). Un valor fuera de la lista hace fallar el arranque. |
| `TIMELINE_RECORD`       | Que el tick grabe la línea de cada etapa en `stage_timelines` (E2): `on` (por defecto) u `off`, el freno. En `web` y en `tick`, que corren el tick los dos (ver «Migración 0047»). Un valor fuera de la lista hace fallar el arranque.              |
| `AUTO_TICK`             | Solo `web`: con `on` (por defecto) avanza el mundo en su proceso, como siempre; con `off`, lo deja al servicio `tick` (ver «Despliegue (Railway)»). Un valor fuera de la lista hace fallar el arranque.                                             |

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

La app manda tres correos, todos de better-auth: recuperar contraseña, verificar la dirección y
confirmar un cambio de correo. Salen por la API HTTP de Resend (`apps/api/src/mailer.ts`), sin SDK.

**Confirmar el correo es obligatorio para entrar** (`requireEmailVerification`). El registro no
abre sesión: manda el enlace, y abrirlo confirma la dirección y abre la sesión. Quien intenta entrar
sin haber confirmado recibe un 403 y, en ese momento, un enlace nuevo. Las cuentas anteriores a
este cambio conservan la sesión que tuvieran; al volver a entrar se les pide confirmar. Por eso,
**sin Resend configurado nadie nuevo puede entrar**: en local, el enlace no sale y hay que marcar
`users.email_verified` a mano.

El cambio de correo siempre verifica la dirección nueva antes de aplicarse; si la actual ya estaba
confirmada, antes se pide aprobarlo desde ella. A dónde vuelve cada enlace lo fija el servidor
(`withCallbackURL` en `apps/api/src/auth.ts`), no el navegador.

Puesta en marcha, una sola vez:

1. **Resend → Domains → Add domain**: `cyclingstar.app` (el dominio raíz, no el `www`; el remitente
   será `no-reply@cyclingstar.app` y el correo se manda desde el dominio, no desde el subdominio de
   la web).
2. Copiar los registros que da Resend al DNS del dominio y esperar a que los marque verificados:
   - `MX` y `TXT` de **SPF** en el subdominio de envío (`send.cyclingstar.app`),
   - `TXT` de **DKIM** (`resend._domainkey`),
   - opcionalmente el `TXT` de **DMARC** (`_dmarc`), recomendado: `v=DMARC1; p=none;`.
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

## Panel de administración (`/admin`)

Entra quien tenga sesión y sea administrador, sin token:

- **El administrador raíz**: la cuenta cuyo correo **confirmado** coincide con `ADMIN_EMAIL`. Es cómo
  entra el primero. Se evalúa en cada petición (no se copia a la base): cambiar la variable cambia
  quién es el raíz. Sin confirmar el correo no es admin, así que registrarse con el correo del dueño
  no da nada.
- **Los que el panel haga admin** (columna `users.is_admin`).

Desde **Account → Admin panel** (el enlace sólo aparece a los admins): lista de cuentas con buscador
por correo; por cuenta, confirmar el correo a mano, dar o quitar premium, dar o quitar admin, y
borrarla (su corredor y su equipo pasan a NPC). La API impide quitarse el admin a uno mismo,
borrarse desde el panel (eso se hace en Account, con contraseña) y borrar al raíz.

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
  `tick` (`railway.tick.json`, cada 6 h): vale con `TICK_INTERVAL_MINUTES` de 360; con días más
  cortos hay que acortar el cron o dejar `on`. `POST /admin/tick` y `/admin/advance` funcionan igual.
- Cron del tick: invoca el avance del mundo según `TICK_INTERVAL_MINUTES`.
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

## Tareas manuales pendientes (requieren cuentas/gestiones externas)

- **Verificación de marcas** — comprobar en TMview (EUIPO) y USPTO el nombre comercial
  «Cycling Star» y los nombres «Race + Geografía» del calendario antes del lanzamiento (SPEC 8).
  La marca protegida es el nombre comercial, no la geografía ni el formato; no imitar logotipos,
  tipografías ni identidades visuales reales.
- **Aviso de privacidad** — publicado en `/privacy` (la IP transitoria de geolocalización no se
  persiste; el correo se usa para la cuenta). Revisar con la legislación aplicable antes del
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
