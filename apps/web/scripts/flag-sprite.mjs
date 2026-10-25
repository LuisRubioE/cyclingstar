#!/usr/bin/env node
/**
 * EL SPRITE DE LAS BANDERAS (E3, docs/visual.md §12.2; PR 6, D-49). Las banderas de `flag-icons` eran el
 * 91 % de la hoja que bloquea la primera pintura (94,3 KB con gzip). Esto pinta las 133 del juego
 * (`COUNTRIES`), de sus SVG 4x3, en un sprite WebP de 64 × 48 por bandera (el triple de 21 × 16), y
 * escribe:
 *
 * - `src/assets/flags.webp`, que Vite sirve con huella en `assets/`;
 * - `src/components/ui/flagSprite.generated.ts`, con la celda de cada país y las huellas;
 * - `src/assets/flags/<país>.svg`, la copia de sus SVG, que `ChampionJersey` pinta desde 72 px (§9.5).
 *
 * Pinta con el Chromium de Playwright, que ya está para la prueba del teléfono, y codifica con su WebP:
 * la calidad 0,8 da unos 47 KB, y el tope de `peso.test.mjs` es 60.
 *
 * EL ANILLO. Sin nada más, al escalar se colaba en el borde la bandera vecina: el WebP con pérdida
 * suaviza los bordes de sus bloques, que son los de las celdas, y Chromium ajusta a píxeles de pantalla
 * la posición y el tamaño del fondo. Medido con un sprite de colores planos, hacía falta enseñar cada
 * celda 1,5 píxeles por dentro. Huecos entre celdas no: hasta uno de un píxel costaba 10 KB, porque
 * descuadra las celdas de los macrobloques de 16. Así que cada bandera se pinta a 60 × 44 en el centro
 * de su celda y los 2 píxeles de alrededor repiten su borde (`margin`): `Flag` enseña solo esos 60 × 44,
 * entera y en 4:3, y lo que se cuele es su propio color.
 *
 * No corre en el CI; `src/generados.test.ts` mira que lo escrito está al día. Con `shared` compilado
 * (`pnpm build`):
 *
 *   node apps/web/scripts/flag-sprite.mjs
 */

/* global document, Image -- el pintor corre dentro de Chromium (page.evaluate) */

import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COUNTRIES } from '@cyclingstar/shared'
import { chromium } from '@playwright/test'

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FLAG_ICONS = join(WEB, 'node_modules', 'flag-icons')
const ASSETS = join(WEB, 'src', 'assets')
const GENERATED = join(WEB, 'src', 'components', 'ui', 'flagSprite.generated.ts')

/** Doce columnas: 133 banderas en un sprite de 768 × 576. */
const COLS = 12
const WIDTH = 64
const HEIGHT = 48
/** el anillo que repite el borde de cada bandera, dentro de su celda */
const MARGIN = 2
const QUALITY = 0.8

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const codes = COUNTRIES.map((c) => c.code).sort()
const rows = Math.ceil(codes.length / COLS)
const fuente = (code) => readFileSync(join(FLAG_ICONS, 'flags', '4x3', `${code.toLowerCase()}.svg`))
const version = JSON.parse(readFileSync(join(FLAG_ICONS, 'package.json'), 'utf8')).version

// La huella de lo que hace el sprite: los parámetros, los países y sus SVG, en orden. `generados.test.ts`
// la calcula igual.
const origen = createHash('sha256').update(
  JSON.stringify({
    flagIcons: version,
    cols: COLS,
    width: WIDTH,
    height: HEIGHT,
    margin: MARGIN,
    quality: QUALITY,
    codes,
  }),
)
for (const code of codes) origen.update(`\n${code}\n`).update(fuente(code))
const sourceSha256 = origen.digest('hex')

const browser = await chromium.launch()
let webp
try {
  const page = await browser.newPage()
  const dataUrl = await page.evaluate(
    async ({ svgs, cols, rows, width, height, margin, quality }) => {
      const canvas = document.createElement('canvas')
      canvas.width = cols * width
      canvas.height = rows * height
      const ctx = canvas.getContext('2d')
      // opaco: las celdas que sobran, en blanco, y el WebP no lleva canal alfa (un KB menos)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const m = margin
      const [w, h] = [width - 2 * m, height - 2 * m]
      for (const [i, svg] of svgs.entries()) {
        const img = new Image()
        img.src = `data:image/svg+xml;base64,${svg}`
        await img.decode()
        const x = (i % cols) * width
        const y = Math.floor(i / cols) * height
        // la bandera, en el centro; luego su borde, repetido hacia fuera: los lados y arriba y abajo
        ctx.drawImage(img, x + m, y + m, w, h)
        ctx.drawImage(canvas, x + m, y + m, 1, h, x, y + m, m, h)
        ctx.drawImage(canvas, x + m + w - 1, y + m, 1, h, x + m + w, y + m, m, h)
        ctx.drawImage(canvas, x, y + m, width, 1, x, y, width, m)
        ctx.drawImage(canvas, x, y + m + h - 1, width, 1, x, y + m + h, width, m)
      }
      return canvas.toDataURL('image/webp', quality)
    },
    {
      svgs: codes.map((code) => fuente(code).toString('base64')),
      cols: COLS,
      rows,
      width: WIDTH,
      height: HEIGHT,
      margin: MARGIN,
      quality: QUALITY,
    },
  )
  if (!dataUrl.startsWith('data:image/webp;base64,'))
    throw new Error('Chromium no ha codificado el sprite en WebP')
  webp = Buffer.from(dataUrl.slice('data:image/webp;base64,'.length), 'base64')
} finally {
  await browser.close()
}

mkdirSync(ASSETS, { recursive: true })
writeFileSync(join(ASSETS, 'flags.webp'), webp)

// La copia de los SVG: la carpeta entera de nuevo, para que no quede ninguno de un país que ya no está.
const flags = join(ASSETS, 'flags')
rmSync(flags, { recursive: true, force: true })
mkdirSync(flags)
const copias = createHash('sha256')
for (const code of codes) {
  const nombre = `${code.toLowerCase()}.svg`
  copyFileSync(join(FLAG_ICONS, 'flags', '4x3', nombre), join(flags, nombre))
  copias.update(`\n${code}\n`).update(fuente(code))
}

const celdas = codes
  .map((code, i) => `  ${code}: [${i % COLS}, ${Math.floor(i / COLS)}],`)
  .join('\n')
writeFileSync(
  GENERATED,
  `/**
 * GENERADO por \`apps/web/scripts/flag-sprite.mjs\`: no se edita a mano (E3, docs/visual.md §12.2; PR 6).
 * Las ${codes.length} banderas del juego (\`COUNTRIES\`), de \`flag-icons\` ${version}, en \`src/assets/flags.webp\`;
 * \`src/generados.test.ts\` mira que está al día.
 */

export const FLAG_SPRITE = {
  /** columnas y filas del sprite */
  cols: ${COLS},
  rows: ${rows},
  /** cada celda, en píxeles del sprite */
  width: ${WIDTH},
  height: ${HEIGHT},
  /** el anillo de cada celda que repite el borde de su bandera: \`Flag\` enseña lo de dentro */
  margin: ${MARGIN},
  /** la calidad del WebP */
  quality: ${QUALITY},
  /** el sha256 de \`src/assets/flags.webp\` */
  sha256: '${sha256(webp)}',
  /** el sha256 de lo que lo hace: los parámetros, los países y sus SVG, en orden */
  sourceSha256: '${sourceSha256}',
  /** el sha256 de la copia de los SVG en \`src/assets/flags/\`, en orden */
  svgSha256: '${copias.digest('hex')}',
} as const

/** La celda de cada país en el sprite: columna y fila. */
export const FLAG_CELLS: Readonly<Record<string, readonly [number, number]>> = {
${celdas}
}
`,
)

console.log(
  `${codes.length} banderas en ${COLS} × ${rows}: flags.webp, ${(webp.length / 1000).toFixed(1)} KB; ` +
    `${codes.length} SVG copiados; ${GENERATED.slice(WEB.length + 1)}`,
)
