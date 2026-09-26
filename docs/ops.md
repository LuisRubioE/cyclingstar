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

| Variable                | Uso                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Conexión a Postgres (obligatoria).                                                                        |
| `WORLD_SEED`            | Semilla del mundo; fija la generación reproducible (SPEC 10).                                             |
| `TICK_INTERVAL_MINUTES` | Minutos reales por día de juego (por defecto 360 = 6 h). Bajarlo acelera el mundo para la alfa (Paso 43). |
| `ADMIN_TOKEN`           | Protege `POST /admin/tick`, `POST /admin/advance` y la lista de bloqueo de nombres (`/admin/names`).      |
| `SESSION_SECRET`        | Secreto de firma de sesiones de better-auth (mínimo 32 caracteres).                                       |
| `APP_URL`               | URL pública **canónica**: `baseURL` de better-auth, origen de confianza y raíz de los enlaces del correo. |
| `EXTRA_TRUSTED_ORIGINS` | Orígenes de confianza extra, separados por comas. Opcional.                                               |
| `ADMIN_EMAIL`           | Correo del administrador raíz. Opcional; esa cuenta, con el correo confirmado, entra en `/admin`.         |
| `RESEND_API_KEY`        | Clave de Resend. Opcional; sin ella la app arranca y NO manda correo (lo deja dicho en el log).           |
| `MAIL_FROM`             | Remitente: `Cycling Star <no-reply@cyclingstar.app>`. Va en pareja con `RESEND_API_KEY`.                  |

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
- Cron del tick: invoca el avance del mundo según `TICK_INTERVAL_MINUTES`.
- Las migraciones son aditivas (Drizzle) y se aplican solas al arrancar; no hay pasos manuales.

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
