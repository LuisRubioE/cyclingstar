/* global process, console */
/**
 * E3, propuesta `sistema`: ¿qué deja de existir con el tema cerrado, fichero a fichero?
 *
 * 1. Saca los candidatos de clase de cada fichero de producción de apps/web/src (sin tests ni
 *    __fixtures__) con el escáner de Tailwind 4.3.3 (`@tailwindcss/oxide`, el mismo que usa el
 *    plugin de Vite).
 * 2. Carga dos sistemas de diseño con `__unstable__loadDesignSystem` de `@tailwindcss/node`: el de
 *    hoy (apps/web/src/index.css) y el cerrado (cerrado.css).
 * 3. Un candidato es una CLASE EN USO si resuelve con el de hoy; es DEUDA si resuelve hoy y no con el
 *    cerrado. Cuenta apariciones (posiciones) por fichero y por familia.
 *
 * Uso: node cierre.mjs <clon> <cerrado.css>     (solo lee el clon)
 */
import { createRequire } from 'node:module'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const [, , root, cerradoPath] = process.argv
const pnpm = join(root, 'node_modules/.pnpm')
const require = createRequire(import.meta.url)
const { Scanner } = require(
  join(pnpm, '@tailwindcss+oxide@4.3.3/node_modules/@tailwindcss/oxide/index.js'),
)
const tw = await import(
  join(pnpm, '@tailwindcss+node@4.3.3/node_modules/@tailwindcss/node/dist/index.mjs')
)

const webSrc = join(root, 'apps/web/src')
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === '__fixtures__') continue
      out.push(...walk(p))
    } else if (/\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts'))
      out.push(p)
  }
  return out
}
const files = walk(webSrc)

const hoyCss = readFileSync(join(webSrc, 'index.css'), 'utf8')
const cerradoCss = readFileSync(cerradoPath, 'utf8')
const dsHoy = await tw.__unstable__loadDesignSystem(hoyCss, { base: webSrc })
const dsCerrado = await tw.__unstable__loadDesignSystem(cerradoCss, { base: webSrc })

const scanner = new Scanner({ sources: [] })
const perFile = []
const allCands = new Set()
const raw = []
for (const f of files) {
  const content = readFileSync(f, 'utf8')
  const ext = f.split('.').pop()
  const found = scanner.getCandidatesWithPositions({ content, extension: ext })
  raw.push({ f, found })
  for (const { candidate } of found) allCands.add(candidate)
}
const list = [...allCands]
const hoyOut = dsHoy.candidatesToCss(list)
const cerOut = dsCerrado.candidatesToCss(list)
const validHoy = new Set(list.filter((_, i) => hoyOut[i] != null))
const validCer = new Set(list.filter((_, i) => cerOut[i] != null))

function family(c) {
  const base = c.replace(/^([a-z-]+:)+/, '').replace(/^-/, '')
  if (/\[/.test(base)) return 'arbitrario'
  if (
    /^(text|bg|border|ring|divide|from|to|via|fill|stroke|outline|decoration|accent|placeholder|caret|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|brand)/.test(
      base,
    )
  )
    return 'color'
  if (/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/.test(base)) return 'tamaño de letra'
  if (/^font-(thin|light|normal|medium|semibold|bold|extrabold|black|sans|mono|serif)$/.test(base))
    return 'peso o familia'
  if (/^rounded/.test(base)) return 'radio'
  if (/^shadow/.test(base)) return 'sombra'
  if (/^(tracking|leading)-/.test(base)) return 'interletraje e interlineado'
  if (/^max-w-/.test(base)) return 'ancho máximo'
  if (/^(sm|md|lg|xl):/.test(c)) return 'corte'
  return 'otra'
}

let totalUse = 0
let totalDebt = 0
const famDebt = {}
for (const { f, found } of raw) {
  let use = 0
  let debt = 0
  const debtSet = {}
  for (const { candidate } of found) {
    if (!validHoy.has(candidate)) continue
    use++
    if (!validCer.has(candidate)) {
      debt++
      const fam = family(candidate)
      famDebt[fam] = (famDebt[fam] ?? 0) + 1
      debtSet[candidate] = (debtSet[candidate] ?? 0) + 1
    }
  }
  totalUse += use
  totalDebt += debt
  perFile.push({
    file: relative(webSrc, f),
    use,
    debt,
    top: Object.entries(debtSet)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
  })
}
perFile.sort((a, b) => b.debt - a.debt)
console.log(`ficheros de producción: ${files.length}`)
console.log(
  `apariciones de clases en uso (resuelven hoy): ${totalUse}; clases distintas en uso: ${validHoy.size}`,
)
console.log(
  `apariciones que dejan de resolver con el tema cerrado: ${totalDebt} (${((100 * totalDebt) / totalUse).toFixed(1)} %)`,
)
console.log(
  `clases distintas que dejan de resolver: ${[...validHoy].filter((c) => !validCer.has(c)).length}`,
)
console.log(
  'por familia:',
  JSON.stringify(Object.fromEntries(Object.entries(famDebt).sort((a, b) => b[1] - a[1]))),
)
console.log('\nlos 40 ficheros con más deuda:')
for (const p of perFile.slice(0, 40))
  console.log(
    `  ${p.debt.toString().padStart(4)} de ${p.use.toString().padStart(4)}  ${p.file}   ${p.top.map(([c, n]) => `${c}×${n}`).join(' ')}`,
  )
const sinDeuda = perFile.filter((p) => p.debt === 0 && p.use > 0).length
console.log(`\nficheros con clases y sin deuda: ${sinDeuda}`)
// comprobaciones del mecanismo
const probes = [
  'bg-indigo-600',
  'text-slate-400',
  'text-[11px]',
  'shadow-md',
  'rounded-2xl',
  'bg-surface',
  'text-ink-muted',
  'text-label',
  'shadow-panel',
  'rounded-md',
  'bg-transparent',
  'border-transparent',
  'text-current',
  'rounded-full',
  'ring-focus',
  'bg-ink/5',
  'sm:grid-cols-2',
  'md:grid-cols-2',
  'lg:grid-cols-4',
  'max-w-page',
  'max-w-6xl',
  'font-semibold',
  'tabular-nums',
  'animate-pulse',
  'p-7',
  'gap-1.5',
]
const pc = dsCerrado.candidatesToCss(probes)
console.log('\nsondas con el tema cerrado:')
probes.forEach((p, i) =>
  console.log(
    `  ${p.padEnd(20)} ${pc[i] == null ? 'NO EXISTE' : pc[i].replace(/\s+/g, ' ').slice(0, 110)}`,
  ),
)
