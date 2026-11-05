/**
 * LA IMAGEN DE COMPARTIR (E3, docs/visual.md §14.7; D-56, I-23, D-08; PR 20): `public/og-default.png`, de
 * 1.200 × 630, lo que se ve al compartir el enlace de una etapa. Fondo `navy`; el logotipo de `Logo.tsx`,
 * el de verdad y sin redibujarlo (no tiene dueño, mapa 04, contradicción 12), con su trazo en blanco y su
 * estrella en `gold`; y `Cycling Star` en blanco (11,76:1 sobre `navy`).
 *
 * El logotipo se pinta con React en el servidor de Vite (`ssrLoadModule`), así que un cambio de `Logo.tsx`
 * sale aquí sin tocar este fichero. Desde el PR 21n sus dos colores son dos tokens (`logo` y `logo-star`) y
 * sus marcas llevan sus clases (`stroke-logo`, `fill-logo`, `fill-logo-star`, `stroke-logo-star`): el guion
 * las colorea con los del ámbito oscuro de `packages/shared/tokens.json`, el mismo de la cabecera, y falla si
 * ya no las encuentra.
 * La compone el Chromium de Playwright, con la letra de la prueba del teléfono (`e2e/fonts.conf`, DejaVu
 * Sans), y apunta dos huellas en `huellas.json`: la de la imagen y la de sus fuentes (este guion, el
 * `Logo.tsx`, `LOGO_STAR` y los dos colores del logotipo en el ámbito oscuro de hoy). `generados.test.ts` las mira; con `--check` solo se recalcula la de las
 * fuentes, sin pintar nada, y sale con 1 si no es la apuntada.
 *
 *   FONTCONFIG_FILE=apps/web/e2e/fonts.conf node apps/web/scripts/og-image.mjs
 *   node apps/web/scripts/og-image.mjs --check
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOGO_STAR } from '@cyclingstar/shared'

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(WEB, 'public', 'og-default.png')
const LOGO = join(WEB, 'src', 'components', 'Logo.tsx')
const TOKENS = join(WEB, '..', '..', 'packages', 'shared', 'tokens.json')
const HUELLAS = join(WEB, 'scripts', 'huellas.json')

/** Lo que se pinta: el tamaño, el fondo y el color del nombre (§3.1), y el nombre. */
const OG = {
  width: 1200,
  height: 630,
  navy: '#123a5c',
  white: '#ffffff',
  name: 'Cycling Star',
}
/**
 * Los dos colores del logotipo en el ámbito oscuro (`logo`, el trazo de la bicicleta, y `logo-star`, la
 * estrella), los de la cabecera, y la propiedad que cada una de sus clases pinta con uno de ellos.
 */
const AMBITO = JSON.parse(readFileSync(TOKENS, 'utf8')).darkScope.color
const LOGO_COLORS = { stroke: AMBITO.logo, star: AMBITO['logo-star'] }
// sin ellos, o con algo que no es un color literal, la hoja diría `stroke: undefined` y la bicicleta saldría
// invisible sin que fallara nada: falla aquí, también con `--check` (revisión del 21n)
for (const [what, color] of Object.entries(LOGO_COLORS))
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) {
    console.error(
      `og-image: el ${what} del logotipo en el ámbito oscuro de tokens.json no es un color: ${color}`,
    )
    process.exit(1)
  }
const LOGO_CLASSES = {
  'stroke-logo': ['stroke', LOGO_COLORS.stroke],
  'fill-logo': ['fill', LOGO_COLORS.stroke],
  'fill-logo-star': ['fill', LOGO_COLORS.star],
  'stroke-logo-star': ['stroke', LOGO_COLORS.star],
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex')

/** La huella de lo que hace la imagen: este guion, el logotipo, su estrella y sus dos colores. */
function sourcesSha256() {
  return createHash('sha256')
    .update(readFileSync(fileURLToPath(import.meta.url)))
    .update('\n')
    .update(readFileSync(LOGO))
    .update('\n')
    .update(LOGO_STAR)
    .update('\n')
    .update(`${LOGO_COLORS.stroke} ${LOGO_COLORS.star}`)
    .digest('hex')
}

function readHuellas() {
  try {
    return JSON.parse(readFileSync(HUELLAS, 'utf8'))
  } catch {
    return {}
  }
}

if (process.argv.includes('--check')) {
  const apuntada = readHuellas()['public/og-default.png:fuentes']
  if (apuntada !== sourcesSha256()) {
    console.error(
      'og-default.png no se hizo con el Logo.tsx, la estrella o este guion de hoy: node apps/web/scripts/og-image.mjs',
    )
    process.exit(1)
  }
  process.exit(0)
}

/** El `Logo` de verdad, pintado por React en el servidor de Vite, con las clases de sus dos colores. */
async function logoSvg(size) {
  const { createServer } = await import('vite')
  const server = await createServer({
    root: WEB,
    logLevel: 'error',
    server: { middlewareMode: true },
    appType: 'custom',
  })
  try {
    const { Logo } = await server.ssrLoadModule('/src/components/Logo.tsx')
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const svg = renderToStaticMarkup(createElement(Logo, { size, decorative: true }))
    const usadas = new Set([...svg.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)))
    for (const clase of Object.keys(LOGO_CLASSES))
      if (!usadas.has(clase)) throw new Error(`og-image: Logo.tsx ya no lleva la clase ${clase}`)
    // aquí no hay Tailwind: una clase que no sea de las cuatro saldría sin color (revisión del 21n)
    for (const clase of usadas)
      if (!(clase in LOGO_CLASSES))
        throw new Error(`og-image: Logo.tsx lleva ${clase}, que la imagen no colorea`)
    return svg
  } finally {
    await server.close()
  }
}

const svg = await logoSvg(260)
const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; }
  body {
    width: ${OG.width}px; height: ${OG.height}px; background: ${OG.navy};
    display: flex; align-items: center; justify-content: center; gap: 56px;
    font-family: 'DejaVu Sans', sans-serif;
  }
  span { color: ${OG.white}; font-size: 104px; font-weight: 700; letter-spacing: -1px; }
${Object.entries(LOGO_CLASSES)
  .map(([clase, [prop, color]]) => `  .${clase} { ${prop}: ${color}; }`)
  .join('\n')}
</style></head>
<body>${svg}<span>${OG.name}</span></body></html>`

const { chromium } = await import('@playwright/test')
const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: OG.width, height: OG.height },
    deviceScaleFactor: 1,
  })
  await page.setContent(html)
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, ...OG } })
  writeFileSync(OUT, png)
  const huellas = readHuellas()
  huellas['public/og-default.png'] = sha256(png)
  huellas['public/og-default.png:fuentes'] = sourcesSha256()
  writeFileSync(HUELLAS, `${JSON.stringify(huellas, null, 2)}\n`)
  console.log(`og-default.png: ${png.length} bytes, ${sha256(png)}`)
} finally {
  await browser.close()
}
