#!/usr/bin/env bash
# Respaldo de la base de datos (SPEC 12, Paso 42). Vuelca un dump comprimido con marca de tiempo.
# Uso:  DATABASE_URL=postgres://... scripts/backup.sh [directorio_destino]
# Cron sugerido (nocturno):  0 3 * * *  DATABASE_URL=... /app/scripts/backup.sh /backups
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL no está definida}"
DEST="${1:-./backups}"
mkdir -p "$DEST"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$DEST/cyclingstar-$STAMP.dump"

# Formato custom (-Fc): comprimido y restaurable con pg_restore.
pg_dump "$DATABASE_URL" -Fc -f "$OUT"
echo "backup escrito: $OUT ($(du -h "$OUT" | cut -f1))"

# Retención: conserva los últimos 14 dumps.
ls -1t "$DEST"/cyclingstar-*.dump 2>/dev/null | tail -n +15 | xargs -r rm --
