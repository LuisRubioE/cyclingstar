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
| `ADMIN_TOKEN`           | Protege `POST /admin/tick` y `POST /admin/advance`.                                                       |
| `BETTER_AUTH_SECRET`    | Secreto de sesión de better-auth.                                                                         |

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
