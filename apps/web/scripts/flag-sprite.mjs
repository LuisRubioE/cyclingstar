#!/usr/bin/env node
/**
 * EL SPRITE DE LAS BANDERAS (E3, docs/visual.md §12.2; PR 6, D-49). Las banderas de `flag-icons` eran el
 * 91 % de la hoja que bloquea la primera pintura (94,3 KB con gzip). Esto pinta las 133 del juego
 * (`COUNTRIES`), de sus SVG 4x3, en un sprite WebP de 64 × 48 por bandera (el triple de 21 × 16), y
 * escribe:
 *
 * - `src/assets/flags.webp`, que Vite sirve con huella en `assets/`;
 * - `src/components/ui/flagSprite.generated.ts`, con la celda de cada país y las huellas;
 * - `src/assets/flags/<país>.svg`, la copia de sus SVG, que `ChampionJersey` pinta desde 72 px (§9.5);
 * - y, desde el PR 16a, las celdas para medir (§9.5): `packages/db` no decodifica el WebP, así que cada
 *   bandera va también a 32 × 24 en RGB, que basta para el maillot de 28 px (la caja de la bandera mide
 *   26,4 px de ancho), en `packages/db/src/flagCells.generated.bin`, y `flagCells.generated.ts` dice el
 *   orden de los países y las huellas. La distancia dibujada (`kitDistance.ts`) las muestrea.
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
 * No corre en el CI; `src/components/ui/generados.test.ts` mira que lo escrito está al día. Con `shared`
 * compilado (`pnpm build`):
 *
 *   node apps/web/scripts/flag-sprite.mjs
 *
 * Con `--hoja <datos.json> <hoja.html>` no genera nada y escribe la hoja de revisión de los maillots de
 * campeón (§9.5; D-00f), con los datos de `KIT_HOJA=<datos.json> pnpm exec vitest run
 * packages/db/src/champion.test.ts` (`flag-sheet.mjs`).
 */

/* global document, Image -- el pintor corre dentro de Chromium (page.evaluate) */

import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COUNTRIES } from '@cyclingstar/shared'
import { chromium } from '@playwright/test'

const SCRIPT = fileURLToPath(import.meta.url)
const WEB = resolve(dirname(SCRIPT), '..')
const FLAG_ICONS = join(WEB, 'node_modules', 'flag-icons')
const ASSETS = join(WEB, 'src', 'assets')
const GENERATED = join(WEB, 'src', 'components', 'ui', 'flagSprite.generated.ts')
/** Las celdas para medir, junto a quien las mide (§9.5). */
const DB_SRC = join(WEB, '..', '..', 'packages', 'db', 'src')
const CELLS_BIN = join(DB_SRC, 'flagCells.generated.bin')
const CELLS_TS = join(DB_SRC, 'flagCells.generated.ts')
/** Las huellas de lo generado que no tiene cabecera donde escribirla (§16.2; 16-e). */
const HUELLAS = join(WEB, 'scripts', 'huellas.json')

/** Doce columnas: 133 banderas en un sprite de 768 × 576. */
const COLS = 12
const WIDTH = 64
const HEIGHT = 48
/** el anillo que repite el borde de cada bandera, dentro de su celda */
const MARGIN = 2
const QUALITY = 0.8
/** Las celdas para medir: 32 × 24 en RGB, sobre blanco y sin anillo. */
const CELL_WIDTH = 32
const CELL_HEIGHT = 24

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const codes = COUNTRIES.map((c) => c.code).sort()
const rows = Math.ceil(codes.length / COLS)
const fuente = (code) => readFileSync(join(FLAG_ICONS, 'flags', '4x3', `${code.toLowerCase()}.svg`))
const version = JSON.parse(readFileSync(join(FLAG_ICONS, 'package.json'), 'utf8')).version

const hoja = process.argv.indexOf('--hoja')
if (hoja >= 0) {
  const { writeSheet } = await import('./flag-sheet.mjs')
  const out = process.argv[hoja + 2]
  const { bytes, twins } = writeSheet(process.argv[hoja + 1], out, {
    flagIcons: FLAG_ICONS,
    repo: join(WEB, '..', '..'),
  })
  console.log(`la hoja de revisión, ${(bytes / 1000).toFixed(0)} KB, con ${twins} parejas: ${out}`)
  process.exit(0)
}

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

// La de las celdas para medir: sus medidas, los países, sus SVG y este script, que las pinta.
const origenCeldas = createHash('sha256').update(
  JSON.stringify({ flagIcons: version, width: CELL_WIDTH, height: CELL_HEIGHT, codes }),
)
for (const code of codes) origenCeldas.update(`\n${code}\n`).update(fuente(code))
origenCeldas.update('\nflag-sprite.mjs\n').update(readFileSync(SCRIPT))
const cellsSourceSha256 = origenCeldas.digest('hex')

const browser = await chromium.launch()
let webp
let cells
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

  // Las celdas para medir: cada bandera entera en su lienzo de 32 × 24, sobre blanco, en RGB.
  const celdas = await page.evaluate(
    async ({ svgs, width, height }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      const out = []
      for (const svg of svgs) {
        const img = new Image()
        img.src = `data:image/svg+xml;base64,${svg}`
        await img.decode()
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        const rgba = ctx.getImageData(0, 0, width, height).data
        let rgb = ''
        for (let k = 0; k < rgba.length; k += 4)
          rgb += String.fromCharCode(rgba[k], rgba[k + 1], rgba[k + 2])
        out.push(btoa(rgb))
      }
      return out
    },
    {
      svgs: codes.map((code) => fuente(code).toString('base64')),
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
    },
  )
  cells = Buffer.concat(celdas.map((b64) => Buffer.from(b64, 'base64')))
  if (cells.length !== codes.length * CELL_WIDTH * CELL_HEIGHT * 3)
    throw new Error(`las celdas para medir miden ${cells.length} bytes`)
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
 * \`src/components/ui/generados.test.ts\` mira que está al día.
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
} as const

/** La celda de cada país en el sprite: columna y fila. */
export const FLAG_CELLS: Readonly<Record<string, readonly [number, number]>> = {
${celdas}
}
`,
)

// La huella de la copia de los SVG, que no tiene cabecera: en `huellas.json`, con las demás.
let huellas = {}
try {
  huellas = JSON.parse(readFileSync(HUELLAS, 'utf8'))
} catch {
  // la primera vez
}
huellas['src/assets/flags'] = copias.digest('hex')
writeFileSync(HUELLAS, `${JSON.stringify(huellas, null, 2)}\n`)

writeFileSync(CELLS_BIN, cells)
writeFileSync(
  CELLS_TS,
  `/**
 * GENERADO por \`apps/web/scripts/flag-sprite.mjs\`: no se edita a mano (E3, docs/visual.md §9.5; PR 16a).
 * Las ${codes.length} banderas del juego (\`COUNTRIES\`), de \`flag-icons\` ${version}, a ${CELL_WIDTH} × ${CELL_HEIGHT} en RGB y en este orden,
 * en \`flagCells.generated.bin\`: las muestrea la distancia dibujada del maillot nacional (\`kitDistance.ts\`).
 * \`apps/web/src/components/ui/generados.test.ts\` mira que está al día.
 */

export const FLAG_CELL_PIXELS = {
  /** cada celda, en píxeles */
  width: ${CELL_WIDTH},
  height: ${CELL_HEIGHT},
  /** los países, en el orden de sus celdas en el .bin */
  codes: [${codes.map((c) => `'${c}'`).join(', ')}],
  /** el sha256 de \`flagCells.generated.bin\` */
  sha256: '${sha256(cells)}',
  /** el sha256 de lo que lo hace: las medidas, los países, sus SVG y el script, en orden */
  sourceSha256: '${cellsSourceSha256}',
} as const
`,
)

console.log(
  `${codes.length} banderas en ${COLS} × ${rows}: flags.webp, ${(webp.length / 1000).toFixed(1)} KB; ` +
    `${codes.length} SVG copiados; ${GENERATED.slice(WEB.length + 1)}; ` +
    `las celdas para medir, ${cells.length} bytes`,
)
