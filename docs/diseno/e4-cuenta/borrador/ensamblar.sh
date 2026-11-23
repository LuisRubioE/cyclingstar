#!/usr/bin/env bash
# Ensambla el borrador de docs/cuenta.md: las secciones NN-*.md en orden numérico (§0 la primera si
# existe), sin los bloques «Propuesto para el glosario». Uso: ./ensamblar.sh [salida]
set -euo pipefail
cd "$(dirname "$0")"
out="${1:-cuenta-v0.md}"
: > "$out"
for f in $(ls [0-2][0-9]-*.md | grep -v '^00-' | sort); do
  awk '/^\*\*Propuesto para el glosario/{skip=1} /^\*\*(Injertos|Objeciones|Huecos|Decisiones)/{skip=0} !skip' "$f" >> "$out"
  printf '\n' >> "$out"
done
[ -f 00-cabecera.md ] && { cat 00-cabecera.md "$out" > "$out.tmp" && mv "$out.tmp" "$out"; }
wc -l "$out"
