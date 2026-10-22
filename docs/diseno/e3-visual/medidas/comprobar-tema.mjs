/* global process, console */
/**
 * E3, redactor L1: ¿el @theme de §3 compila con Tailwind 4.3.3, abierto y cerrado, y resuelve lo que
 * dice? Usa __unstable__loadDesignSystem de @tailwindcss/node, como propuesta-sistema/tw/cierre.mjs.
 * Uso: node comprobar-tema.mjs <clon> <tema.css> <tema-cerrado.css>
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const [, , root, abiertoPath, cerradoPath] = process.argv
const pnpm = join(root, 'node_modules/.pnpm')
const tw = await import(
  join(pnpm, '@tailwindcss+node@4.3.3/node_modules/@tailwindcss/node/dist/index.mjs')
)
const base = join(root, 'apps/web/src')
const ds = {
  abierto: await tw.__unstable__loadDesignSystem(readFileSync(abiertoPath, 'utf8'), { base }),
  cerrado: await tw.__unstable__loadDesignSystem(readFileSync(cerradoPath, 'utf8'), { base }),
}
const deben = [
  'bg-canvas',
  'bg-surface',
  'text-ink-2',
  'text-on-navy-2',
  'border-line-strong',
  'bg-arrival-spoton',
  'text-caption',
  'text-meta',
  'text-row',
  'text-body',
  'text-title',
  'text-page',
  'text-display',
  'tracking-caps',
  'font-normal',
  'font-semibold',
  'font-bold',
  'rounded-ui',
  'rounded-full',
  'shadow-card',
  'shadow-bar',
  'max-w-page',
  'max-w-form',
  'sm:px-4',
  'lg:px-6',
  'fine:h-9',
  'fine:min-h-9',
  'animate-pulse',
  'animate-spin',
  'motion-reduce:animate-none',
  'outline-focus',
  'focus-visible:outline-2',
  'focus-visible:outline-offset-2',
  'tabular-nums',
  'bg-transparent',
  'text-white',
  'bg-white',
  'p-3',
  'gap-2',
  'min-h-11',
  'min-h-12',
  '@container',
  '@max-[21.25rem]:hidden',
]
const noCerrado = [
  'bg-indigo-600',
  'text-slate-400',
  'text-sm',
  'text-xs',
  'rounded-md',
  'rounded-2xl',
  'shadow-sm',
  'font-medium',
  'font-mono',
  'md:block',
  'xl:grid-cols-3',
  'max-w-6xl',
  'leading-tight',
  'tracking-wide',
  'bg-brand-cyan',
  'ring-black/5',
]
const siempre = ['text-[11px]', 'p-5', 'pb-[env(safe-area-inset-bottom)]', 'w-[21px]']
function res(nombre, lista) {
  const out = ds[nombre].candidatesToCss(lista)
  return Object.fromEntries(lista.map((c, i) => [c, out[i] != null]))
}
for (const [titulo, lista, quiero] of [
  ['deben resolver en los dos', deben, true],
  ['no resuelven cerrado', noCerrado, false],
  ['arbitrarios y pasos libres', siempre, true],
]) {
  const a = res('abierto', lista)
  const c = res('cerrado', lista)
  const mal = lista.filter((x) =>
    titulo.startsWith('no') ? c[x] !== quiero || !a[x] : a[x] !== quiero || c[x] !== quiero,
  )
  console.log(
    `${titulo}: ${lista.length} clases; fallan ${mal.length}${mal.length ? ': ' + mal.join(', ') : ''}`,
  )
}
const css = ds.cerrado.candidatesToCss(['text-row', 'fine:h-9', 'tracking-caps'])
console.log(css.join('\n'))
