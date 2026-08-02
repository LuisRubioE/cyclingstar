#!/usr/bin/env bash
# Restauración de la base de datos desde un dump (SPEC 12, Paso 42).
# Uso:  DATABASE_URL=postgres://... scripts/restore.sh <archivo.dump>
# El destino se recrea limpio (--clean --if-exists). ¡Sobrescribe los datos actuales!
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL no está definida}"
DUMP="${1:?falta el archivo de dump}"
[ -f "$DUMP" ] || { echo "no existe: $DUMP" >&2; exit 1; }

# citext debe existir antes de restaurar el esquema (users.email es citext).
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS citext;'

# --clean --if-exists deja la base como el dump; --no-owner evita fallos por roles ausentes.
pg_restore --clean --if-exists --no-owner --no-acl -d "$DATABASE_URL" "$DUMP"
echo "restauración completa desde $DUMP"
