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
