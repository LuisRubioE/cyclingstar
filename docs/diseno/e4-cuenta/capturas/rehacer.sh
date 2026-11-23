#!/usr/bin/env bash
# E4, mapa 05: rehace las capturas de este directorio.
#   1. Dos `servir.mjs` con un mundo recién nacido de PGlite: uno sin NODE_ENV (puerto 3005) y otro con
#      NODE_ENV=production (3006), para ver las dos capas de límites (mapa 01 §4).
#   2. `recorridos.mjs` contra los dos (unos 9 minutos en esta máquina: el 429 de Fastify y los
#      correos se esperan de verdad).
#   3. `optimizar.py` (paleta de 128 colores) y la copia de las PNG y de `medidas.json` y `correos.json`.
# `produccion.mjs` NO se corre aquí: una sola captura de producción, y solo con GET (00-encargo.md §7).
#
# Uso: rehacer.sh <carpeta-de-trabajo> <clon-compilado>   (el clon, con `pnpm install && pnpm build`)
set -euo pipefail
W="${1:?carpeta de trabajo}"
R="${2:?clon compilado del repositorio}"
C="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$W"
pkill -f "servir.mjs --root" || true
sleep 2
rm -rf "${W:?}/png" "${W:?}/dev" "${W:?}/prod" "${W:?}/opt"
mkdir -p "$W/dev" "$W/prod"
(nohup node "$C/servir.mjs" --root "$R" --out "$W/dev" --port 3005 > "$W/dev/servir.log" 2>&1 &)
(NODE_ENV=production nohup node "$C/servir.mjs" --root "$R" --out "$W/prod" --port 3006 > "$W/prod/servir.log" 2>&1 &)
for _ in $(seq 1 90); do
  grep -q listening "$W/dev/servir.log" && grep -q listening "$W/prod/servir.log" && break
  sleep 2
done
node "$C/recorridos.mjs" --base http://localhost:3005 --mundo "$W/dev" --prod http://localhost:3006 --out "$W/png" 2> "$W/recorridos.log"
pkill -f "servir.mjs --root" || true
python3 -I "$C/optimizar.py" "$W/png" "$W/opt"
cp "$W"/opt/*.png "$C/"
cp "$W/png/medidas.json" "$W/png/correos.json" "$C/"
