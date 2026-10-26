#!/usr/bin/env node
/**
 * EL COLOR DE LAS DOS LETRAS DEL CAMPEÓN NACIONAL (E3, docs/visual.md §9.5; PR 17a; 9-i). Desde 72 px,
 * `ChampionJersey` pinta el código del país en el pecho, en blanco o en `navy-dark`, el de más contraste
 * con el campo de su bandera bajo la caja, con un filo del otro color. Ese campo lo midió el diseño con
 * Chromium sobre el SVG entero (`docs/diseno/e3-visual/medidas/medir-nacional2.py`), y es el mismo que
 * enseñó la hoja de revisión del 16a: 79 en blanco y 54 en `navy-dark`. Esto lo copia a
 * `src/components/ui/flagInk.generated.ts`, con la huella de la medida; `generados.test.ts` mira que
 * está al día. Sin Chromium y sin `shared` compilado:
 *
 *   node apps/web/scripts/flag-ink.mjs
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MEDIDA = join(
  WEB,
  '..',
  '..',
  'docs',
  'diseno',
  'e3-visual',
  'medidas',
  'medir-nacional2.json',
)
const OUT = join(WEB, 'src', 'components', 'ui', 'flagInk.generated.ts')
const INK = { '#ffffff': 'white', '#0b2740': 'navy-dark' }

const raw = readFileSync(MEDIDA)
const paises = JSON.parse(raw.toString('utf8')).paises
const filas = Object.keys(paises)
  .sort()
  .map((code) => {
    const relleno = paises[code]?.letras?.relleno
    const ink = INK[relleno]
    if (ink === undefined) throw new Error(`flag-ink: ${code} no tiene el color de sus letras`)
    return `  ${code}: '${ink}',`
  })

writeFileSync(
  OUT,
  `/**
 * GENERADO por \`apps/web/scripts/flag-ink.mjs\`: no se edita a mano (E3, docs/visual.md §9.5; PR 17a).
 * El color de las dos letras de cada campeón nacional, el de más contraste con el campo de su bandera
 * bajo la caja, de \`docs/diseno/e3-visual/medidas/medir-nacional2.json\`; el filo, del otro.
 * \`src/components/ui/generados.test.ts\` mira que está al día.
 */

export const FLAG_INK_SHA256 = '${createHash('sha256').update(raw).digest('hex')}'

export const FLAG_INK: Readonly<Record<string, 'white' | 'navy-dark'>> = {
${filas.join('\n')}
}
`,
)
console.log(`flag-ink: ${filas.length} países en ${OUT}`)
