/// <reference types="node" />
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { __unstable__loadDesignSystem } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'
import { ARBITRARY_ALLOWED } from '../../../eslint-ui.mjs'

/**
 * LA DEUDA, FICHERO A FICHERO (E3, docs/visual.md §5.1 y §5.2; PR 8, I-01). Carga dos sistemas de diseño
 * de Tailwind con `__unstable__loadDesignSystem`: el de `index.css` tal como está y el cerrado, el mismo
 * con las 17 líneas del cierre y sin los `brand-*` heredados, que es lo que hará el paso 22 (decisión 5-b:
 * la deuda es la que ese cierre va a exigir). Saca las clases de cada fichero de producción de
 * `apps/web/src` (sin tests ni `__fixtures__`) con el `Scanner` de `@tailwindcss/oxide`, el del plugin de
 * Vite, y cuenta por fichero, entre las clases que resuelven con el abierto:
 *
 * 1. `tema`: las que no resuelven con el cerrado.
 * 2. `arbitrarios`: las que llevan un valor arbitrario y no son de `ARBITRARY_ALLOWED`.
 * 3. `espaciado`: las de relleno, margen y hueco con un paso que no está en `SPACING_STEPS` (5-d).
 * 4. `layout`: las de una prop `layout` que no son de margen, ancho, alto o sitio en la rejilla (4-a).
 *
 * Falla si una cifra de un fichero sube sobre la de `deuda.json`, si un fichero que no está tiene alguna,
 * y si una baja sin apuntarlo: la bajada se escribe en el PR que la consigue, con
 * `VOCABULARIO_DEUDA=escribe pnpm vitest run apps/web/src/components/ui/vocabulario.test.ts`. Dos sondas
 * lo paran si el instrumento deja de medir, porque la API es inestable (sistema §14) y Tailwind va a la
 * versión exacta. Desde el paso 22, con el tema cerrado y sin `deuda.json`, exige cero.
 */

const UI = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(UI, '..', '..')
const RAIZ = resolve(SRC, '..', '..', '..')
const DEUDA = join(UI, 'deuda.json')
const VERSION = (
  createRequire(import.meta.url)('tailwindcss/package.json') as { readonly version: string }
).version

/** Las 17 líneas del cierre (§5.1). */
const CIERRE = [
  'color',
  'font',
  'font-weight',
  'text',
  'tracking',
  'leading',
  'radius',
  'shadow',
  'inset-shadow',
  'drop-shadow',
  'text-shadow',
  'blur',
  'perspective',
  'aspect',
  'animate',
  'breakpoint',
  'container',
].map((espacio) => `--${espacio}-*: initial;`)

/** Los pasos de espaciado (§3.5): de 0 a 64 px. */
const SPACING_STEPS = new Set(['0', '0.5', '1', '1.5', '2', '2.5', '3', '4', '6', '8', '12', '16'])

/** Relleno, margen y hueco, con sus ejes, los lógicos y sus negativos; los tamaños quedan libres (5-d). */
const ESPACIADO =
  /^-?(?:pbs|pbe|px|py|pt|pr|pb|pl|ps|pe|p|mbs|mbe|mx|my|mt|mr|mb|ml|ms|me|m|gap-x|gap-y|gap|space-x|space-y)-(.+)$/

/**
 * Lo que admite una prop `layout` (4-a): margen, ancho (con lo que lo da en una fila flexible: `basis`,
 * `grow`, `shrink` y `flex-1`, `-auto`, `-initial` o `-none`), alto y el sitio en la rejilla.
 */
const LAYOUT =
  /^-?(?:(?:m|mx|my|mt|mr|mb|ml|ms|me|mbs|mbe|w|min-w|max-w|h|min-h|max-h|size|basis|col|row|self|justify-self|place-self|order)-.+|flex-(?:\d+|auto|initial|none)|(?:grow|shrink)(?:-\d+)?)$/

const PERMITIDAS_VARIANTES = new Set(
  ARBITRARY_ALLOWED.filter((a) => a.value.endsWith(':')).map((a) => a.value.slice(0, -1)),
)
const PERMITIDAS_UTILIDADES = new Set(
  ARBITRARY_ALLOWED.filter((a) => !a.value.endsWith(':')).map((a) => a.value),
)

interface Cuenta {
  readonly tema: number
  readonly arbitrarios: number
  readonly espaciado: number
  readonly layout: number
}
interface Deuda {
  readonly tailwindcss: string
  readonly total: Cuenta
  /** Ruta desde la raíz del repositorio; un fichero sin deuda no aparece. */
  readonly ficheros: Readonly<Record<string, Cuenta>>
}
const CONTADORES = ['tema', 'arbitrarios', 'espaciado', 'layout'] as const
const CERO: Cuenta = { tema: 0, arbitrarios: 0, espaciado: 0, layout: 0 }

type Sistema = Awaited<ReturnType<typeof __unstable__loadDesignSystem>>

/** Los fuentes de producción de la web: sin tests, sin `__fixtures__` y sin declaraciones. */
function fuentes(dir: string = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const ruta = join(dir, e.name)
      if (e.isDirectory()) return e.name === '__fixtures__' ? [] : fuentes(ruta)
      return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')
        ? [ruta]
        : []
    })
    .sort()
}

/** `index.css` con el tema cerrado: las 17 líneas al abrir `@theme` y sin los `brand-*` (§5.1). */
function cerrar(css: string): string {
  if (css.split('@theme {').length !== 2) throw new Error('index.css: no hay un solo bloque @theme')
  return css
    .replace('@theme {', `@theme {\n  ${CIERRE.join('\n  ')}`)
    .replace(/^\s*--color-brand-[\w-]+\s*:[^;]*;\n/gm, '')
}

/** Las partes de una clase: las variantes y la utilidad, cortando por los `:` de fuera de corchetes. */
function partes(clase: string): string[] {
  const fuera: string[] = []
  let hondo = 0
  let parte = ''
  for (const c of clase) {
    if (c === '[' || c === '(') hondo++
    else if (c === ']' || c === ')') hondo--
    if (c === ':' && hondo === 0) {
      fuera.push(parte)
      parte = ''
    } else parte += c
  }
  return [...fuera, parte]
}

const conArbitrario = (s: string): boolean => /[[(]/.test(s)
const sinImportante = (s: string): string => s.replace(/^!|!$/g, '')

/** Un valor arbitrario que no está permitido (Tailwind 4 escribe también `p-(--x)` por `p-[var(--x)]`). */
function arbitrario(clase: string): boolean {
  const p = partes(clase)
  const utilidad = sinImportante(p.at(-1) ?? '')
  const variantes = p.slice(0, -1)
  return (
    variantes.some((v) => conArbitrario(v) && !PERMITIDAS_VARIANTES.has(v)) ||
    (conArbitrario(utilidad) && !PERMITIDAS_UTILIDADES.has(utilidad))
  )
}

/** Relleno, margen o hueco con un paso fuera de `SPACING_STEPS` (`auto` y lo arbitrario no son pasos). */
function espaciado(clase: string): boolean {
  const valor = ESPACIADO.exec(sinImportante(partes(clase).at(-1) ?? ''))?.[1]
  return valor !== undefined && /^(?:\d+(?:\.\d+)?|px)$/.test(valor) && !SPACING_STEPS.has(valor)
}

/** Una clase de una prop `layout` que no es de margen, ancho, alto ni sitio en la rejilla. */
function fueraDeLayout(clase: string): boolean {
  return !LAYOUT.test(sinImportante(partes(clase).at(-1) ?? ''))
}

/** Las clases de las props `layout` de un fuente: todos los textos fijos de su valor. */
function clasesDeLayout(ruta: string, texto: string): string[] {
  if (!ruta.endsWith('.tsx') || !texto.includes('layout')) return []
  const fichero = ts.createSourceFile(ruta, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const fuera: string[] = []
  const textos = (nodo: ts.Node): void => {
    if (ts.isStringLiteralLike(nodo) || ts.isTemplateLiteralToken(nodo))
      fuera.push(...nodo.text.split(/\s+/).filter(Boolean))
    ts.forEachChild(nodo, textos)
  }
  const visita = (nodo: ts.Node): void => {
    if (ts.isJsxAttribute(nodo) && nodo.name.getText(fichero) === 'layout' && nodo.initializer)
      textos(nodo.initializer)
    ts.forEachChild(nodo, visita)
  }
  visita(fichero)
  return fuera
}

/** La deuda de hoy, medida. */
function medir(abierto: Sistema, cerrado: Sistema): Deuda {
  const escaner = new Scanner({ sources: [] })
  const porFichero = fuentes().map((ruta) => {
    const texto = readFileSync(ruta, 'utf8')
    const extension = ruta.slice(ruta.lastIndexOf('.') + 1)
    const clases = escaner
      .getCandidatesWithPositions({ content: texto, extension })
      .map((c) => c.candidate)
    return { ruta, texto, clases }
  })
  const todas = [...new Set(porFichero.flatMap((f) => f.clases))]
  const resuelve = (sistema: Sistema): Set<string> => {
    const css = sistema.candidatesToCss(todas)
    return new Set(todas.filter((_, i) => css[i] != null))
  }
  const enUso = resuelve(abierto)
  const enCerrado = resuelve(cerrado)

  const ficheros: Record<string, Cuenta> = {}
  const total = { ...CERO }
  for (const { ruta, texto, clases } of porFichero) {
    const usadas = clases.filter((c) => enUso.has(c))
    const cuenta: Cuenta = {
      tema: usadas.filter((c) => !enCerrado.has(c)).length,
      arbitrarios: usadas.filter(arbitrario).length,
      espaciado: usadas.filter(espaciado).length,
      layout: clasesDeLayout(ruta, texto).filter(fueraDeLayout).length,
    }
    for (const k of CONTADORES) total[k] += cuenta[k]
    if (CONTADORES.some((k) => cuenta[k] > 0)) ficheros[relative(RAIZ, ruta)] = cuenta
  }
  return { tailwindcss: VERSION, total, ficheros }
}

/** Lo que separa la medida de lo apuntado, en frases. */
function diferencias(medida: Deuda, apuntada: Deuda): string[] {
  const fuera: string[] = []
  if (apuntada.tailwindcss !== medida.tailwindcss)
    fuera.push(
      `deuda.json se midió con Tailwind ${apuntada.tailwindcss} y está la ${medida.tailwindcss}: la API es inestable, vuelve a medir`,
    )
  const rutas = new Set([...Object.keys(medida.ficheros), ...Object.keys(apuntada.ficheros)])
  for (const ruta of [...rutas].sort()) {
    const m = medida.ficheros[ruta] ?? CERO
    const a = apuntada.ficheros[ruta]
    if (a === undefined) {
      fuera.push(`${ruta}: no está en deuda.json y tiene ${JSON.stringify(m)}`)
      continue
    }
    if (CONTADORES.every((k) => a[k] === 0))
      fuera.push(`${ruta}: un fichero sin deuda no aparece en deuda.json`)
    for (const k of CONTADORES) {
      if (m[k] > a[k]) fuera.push(`${ruta}: ${k} sube de ${a[k]} a ${m[k]}`)
      if (m[k] < a[k]) fuera.push(`${ruta}: ${k} baja de ${a[k]} a ${m[k]}, y no está apuntado`)
    }
  }
  for (const k of CONTADORES)
    if (medida.total[k] !== apuntada.total[k])
      fuera.push(`total: ${k} es ${medida.total[k]} y deuda.json dice ${apuntada.total[k]}`)
  return fuera
}

let abierto: Sistema
let cerrado: Sistema

beforeAll(async () => {
  const css = readFileSync(join(SRC, 'index.css'), 'utf8')
  abierto = await __unstable__loadDesignSystem(css, { base: SRC })
  cerrado = await __unstable__loadDesignSystem(cerrar(css), { base: SRC })
})

describe('el instrumento mide (§5.2): si deja de medir, falla', () => {
  it('Tailwind va a la versión exacta 4.3.3: la API es inestable', () => {
    expect(VERSION).toBe('4.3.3')
    const web = JSON.parse(readFileSync(join(SRC, '..', 'package.json'), 'utf8')) as {
      readonly devDependencies: Readonly<Record<string, string>>
    }
    for (const p of ['tailwindcss', '@tailwindcss/vite', '@tailwindcss/node', '@tailwindcss/oxide'])
      expect(web.devDependencies[p], p).toBe('4.3.3')
  })

  it('la primera sonda: bg-surface resuelve con los dos sistemas', () => {
    expect(abierto.candidatesToCss(['bg-surface'])[0]).toMatch(/background-color/)
    expect(cerrado.candidatesToCss(['bg-surface'])[0]).toMatch(/background-color/)
  })

  it('la segunda: bg-indigo-600 resuelve con el abierto y no con el cerrado', () => {
    expect(abierto.candidatesToCss(['bg-indigo-600'])[0]).toMatch(/background-color/)
    expect(cerrado.candidatesToCss(['bg-indigo-600'])[0]).toBeNull()
  })

  it('el escáner ve las clases de un fuente', () => {
    const clases = new Scanner({ sources: [] })
      .getCandidatesWithPositions({
        content: '<p className="p-5 bg-indigo-600 text-[11px]" layout="mt-4">',
        extension: 'tsx',
      })
      .map((c) => c.candidate)
    expect(clases).toEqual(expect.arrayContaining(['p-5', 'bg-indigo-600', 'text-[11px]']))
  })
})

describe('los contadores', () => {
  it('un arbitrario de ARBITRARY_ALLOWED no cuenta, delante de cualquier variante; los demás, sí', () => {
    for (const permitido of [
      'pb-[env(safe-area-inset-bottom)]',
      'sm:pb-[var(--fixed-bottom)]',
      '@max-[4.75rem]:hidden',
      '[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]',
    ])
      expect(arbitrario(permitido), permitido).toBe(false)
    for (const deuda of [
      'text-[11px]',
      '@max-[4.75rem]:text-[11px]',
      '[&::-webkit-scrollbar]:hidden',
      '[scrollbar-width:none]',
      'p-(--x)',
    ])
      expect(arbitrario(deuda), deuda).toBe(true)
    expect(ARBITRARY_ALLOWED).toHaveLength(6)
  })

  it('el espaciado cuenta el paso fuera de SPACING_STEPS en relleno, margen y hueco, y no los tamaños', () => {
    for (const fuera of ['p-5', 'sm:pl-7', '-mt-5', 'gap-x-5', 'space-y-10', 'm-px', 'pbs-5'])
      expect(espaciado(fuera), fuera).toBe(true)
    for (const dentro of [
      'p-4',
      'mx-auto',
      'gap-1.5',
      'min-h-11',
      'w-5',
      'pb-[env(x)]',
      'space-x-reverse',
    ])
      expect(espaciado(dentro), dentro).toBe(false)
  })

  it('layout admite margen, ancho, alto y sitio en la rejilla, y nada más', () => {
    for (const dentro of [
      'mt-4',
      'sm:col-span-2',
      'w-full',
      'max-w-form',
      'min-h-11',
      'shrink-0',
      'self-start',
    ])
      expect(fueraDeLayout(dentro), dentro).toBe(false)
    for (const fuera of ['bg-surface', 'text-ink', 'p-4', 'rounded-ui', 'shadow-card', 'flex-col'])
      expect(fueraDeLayout(fuera), fuera).toBe(true)
  })

  it('el cierre activa las 17 líneas y quita los heredados', () => {
    const css = readFileSync(join(SRC, 'index.css'), 'utf8')
    const c = cerrar(css)
    expect(c).not.toMatch(/--color-brand-/)
    // al abrir el bloque, y no en el comentario que las lleva hasta el paso 22
    expect(c).toContain(`@theme {\n  ${CIERRE.join('\n  ')}\n`)
  })
})

describe('la deuda solo baja (§5.2)', () => {
  it('ninguna cifra sube sobre deuda.json, ningún fichero nuevo tiene deuda y lo que baja se apunta', () => {
    const medida = medir(abierto, cerrado)
    if (process.env.VOCABULARIO_DEUDA === 'escribe') {
      writeFileSync(DEUDA, `${JSON.stringify(medida, null, 2)}\n`)
      return
    }
    // sin deuda.json (desde el paso 22), cero en todo
    const apuntada: Deuda = existsSync(DEUDA)
      ? (JSON.parse(readFileSync(DEUDA, 'utf8')) as Deuda)
      : { tailwindcss: VERSION, total: CERO, ficheros: {} }
    expect(diferencias(medida, apuntada)).toEqual([])
  })
})
