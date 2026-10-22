/* global process, console */
/**
 * E3, corrector L1: ¿resuelven con el @theme de §3.9 cerrado (Tailwind 4.3.3) las clases nuevas que
 * piden las correcciones? Uso: node clases.mjs <clon> <tema-cerrado.css>
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const [, , root, cerradoPath] = process.argv
const tw = await import(
  join(
    root,
    'node_modules/.pnpm/@tailwindcss+node@4.3.3/node_modules/@tailwindcss/node/dist/index.mjs',
  )
)
const ds = await tw.__unstable__loadDesignSystem(readFileSync(cerradoPath, 'utf8'), {
  base: join(root, 'apps/web/src'),
})
const clases = [
  'line-clamp-2',
  'leading-4',
  'leading-5',
  'whitespace-normal',
  'whitespace-nowrap',
  'text-center',
  'overflow-hidden',
  '@container',
  '@max-[4.75rem]:hidden',
  '@max-[4.75rem]:inline',
  'bottom-[var(--action-bar-bottom)]',
  'pb-[var(--fixed-bottom)]',
  'sm:inline',
  'sm:hidden',
  'min-h-16',
  'min-w-11',
  'block',
  'text-navy-dark',
  'bg-gold',
  'brightness-90',
  'transform-gpu',
  'text-on-bad',
  'text-on-arrival',
  'bg-bad',
  'px-2',
  'grid-cols-5',
  'dark:bg-surface',
]
const css = ds.candidatesToCss(clases)
clases.forEach((c, i) =>
  console.log(
    `${css[i] == null ? 'NO  ' : 'sí  '} ${c}${css[i] ? '  ' + css[i].replace(/\s+/g, ' ').slice(0, 110) : ''}`,
  ),
)
