/// <reference types="node" />
import { readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import * as eslintUi from '../../../eslint-ui.mjs'

/**
 * LAS DIEZ REGLAS, SIN HEREDADOS (E3, docs/visual.md §5.3; PR 8, decisión 5-c; paso 22). `ui/1` a `ui/10`
 * están en `error` para todo fichero de producción de la web. Del PR 8 al 21 iban en `warn` para los de la
 * lista `UI_HEREDADOS`, que el día del PR 8 ya tenían algún aviso, y la lista solo encogía; W4 se llevó el
 * último, y el paso 22 borró la lista y su bloque de `eslint.config.js`. Lo que se prueba ahora es que no
 * vuelven: con la configuración que resuelve ESLint para cada fichero real de `apps/web/src`, o las diez en
 * `error`, o ninguna, y ninguna solo en los tests, sus datos, `components/ui` y lo generado.
 *
 * Corre ESLint con el `eslint.config.js` del repositorio, el mismo que `pnpm lint`, y prueba cada regla
 * contra una muestra que tiene que avisar y otra que no: un instrumento que deja de medir no puede quedar
 * en verde (como las dos sondas de `vocabulario.test.ts`).
 */

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..')
const eslint = new ESLint({ cwd: RAIZ })

/** Los avisos `ui/` de un resultado, con su regla y su severidad. */
function avisosUi(r: ESLint.LintResult): { readonly regla: string; readonly severidad: number }[] {
  return r.messages
    .filter((m) => m.ruleId === 'no-restricted-syntax' && m.message.startsWith('ui/'))
    .map((m) => ({ regla: m.message.split(' ')[0] ?? '', severidad: m.severity }))
}

/** Las reglas que avisan en un fuente de prueba puesto en `ruta`. */
async function reglas(codigo: string, ruta = 'apps/web/src/pages/Sonda.tsx'): Promise<string[]> {
  const [r] = await eslint.lintText(codigo, { filePath: join(RAIZ, ruta) })
  return r === undefined ? [] : avisosUi(r).map((a) => a.regla)
}

/** Los `.ts` y `.tsx` de `apps/web/src`, con su ruta desde la raíz del repositorio. */
function ficheros(dir: string = join(RAIZ, 'apps', 'web', 'src')): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const ruta = join(dir, e.name)
      if (e.isDirectory()) return ficheros(ruta)
      return /\.tsx?$/.test(e.name) ? [relative(RAIZ, ruta)] : []
    })
    .sort()
}

/** Lo que las reglas no miran (`UI_IGNORES`, §5.3): los tests, sus datos, el sistema y lo generado. */
const fueraDeLasReglas = (f: string): boolean =>
  /\.test\.tsx?$/.test(f) ||
  f.split('/').includes('__fixtures__') ||
  f.startsWith('apps/web/src/components/ui/') ||
  f.endsWith('.generated.ts')

describe('sin heredados: las diez reglas, en error en toda la web (paso 22)', () => {
  it('eslint-ui.mjs ya no exporta UI_HEREDADOS: la lista se fue con su último fichero', () => {
    expect(Object.keys(eslintUi)).not.toContain('UI_HEREDADOS')
  })

  it('cada fichero de la web resuelve las diez en error, o ninguna si es de los que no miran', async () => {
    const enError: string[] = []
    const sinEllas: string[] = []
    const raros: string[] = []
    for (const f of ficheros()) {
      const config = (await eslint.calculateConfigForFile(join(RAIZ, f))) as {
        readonly rules?: Readonly<Record<string, readonly unknown[] | undefined>>
      }
      const regla = config.rules?.['no-restricted-syntax']
      if (regla === undefined) sinEllas.push(f)
      else if (
        regla[0] === 2 &&
        JSON.stringify(regla.slice(1)) === JSON.stringify(eslintUi.UI_RULES)
      )
        enError.push(f)
      else raros.push(f)
    }
    expect(raros).toEqual([])
    expect(enError.filter(fueraDeLasReglas)).toEqual([])
    expect(sinEllas.filter((f) => !fueraDeLasReglas(f))).toEqual([])
    // el instrumento mide: las páginas, las piezas y el dominio de la web están dentro
    expect(enError.length).toBeGreaterThan(100)
    expect(enError).toEqual(
      expect.arrayContaining(['apps/web/src/pages/Home.tsx', 'apps/web/src/App.tsx']),
    )
  })

  it('un fichero nuevo nace en error; components/ui, los tests, sus datos y lo generado no las llevan', async () => {
    const codigo = 'export const Sonda = () => <button type="button">Go</button>\n'
    const [nuevo] = await eslint.lintText(codigo, {
      filePath: join(RAIZ, 'apps/web/src/pages/Sonda.tsx'),
    })
    expect(nuevo === undefined ? [] : avisosUi(nuevo)).toEqual([{ regla: 'ui/1', severidad: 2 }])
    expect(await reglas(codigo, 'apps/web/src/components/ui/Sonda.tsx')).toEqual([])
    expect(await reglas(codigo, 'apps/web/src/pages/Sonda.test.tsx')).toEqual([])
    expect(await reglas(codigo, 'apps/web/src/pages/__fixtures__/Sonda.tsx')).toEqual([])
    expect(await reglas("export const C = '#1d4ed8'\n", 'apps/web/src/a.generated.ts')).toEqual([])
  })
})

describe('las diez reglas, contra sus muestras', () => {
  const casos: readonly (readonly [regla: string, avisa: string, calla: string])[] = [
    ['ui/1', '<button type="button">Go</button>', '<Button>Go</Button>'],
    ['ui/2', '<table />', '<RankTable />'],
    ['ui/3', '<><input /><select /><textarea /></>', '<Field />'],
    ['ui/4', '<span title="Form">F</span>', '<InfoButton title="Form" />'],
    ['ui/5', '<p>Loading…</p>', '<p>Loaded</p>'],
    [
      'ui/6',
      '<p className="text-slate-500 border-l-rose-500" />',
      '<p className="text-ink-2 bg-cyan" />',
    ],
    [
      'ui/7',
      '<p className="text-[11px] [&::-webkit-scrollbar]:hidden" />',
      '<main className="pb-[var(--fixed-bottom)] sm:pb-[env(safe-area-inset-bottom)]" />',
    ],
    ['ui/8', '<Kit color="#1d4ed8" />', '<Rank text="#12" />'],
    ['ui/9', '<div style={{ width: 1 }} />', '<div data-style="x" />'],
    ['ui/10', '<span>🏆 ⓘ ▲ ↺ ‹ ⋯</span>', '<span>Gandia → Alcoi · ◀ Too much training ▶</span>'],
  ]

  it.each(casos)('%s avisa en su muestra y calla en la otra', async (regla, avisa, calla) => {
    const avisos = await reglas(`export const A = () => ${avisa}\n`)
    expect(avisos.length).toBeGreaterThan(0)
    expect(new Set(avisos)).toEqual(new Set([regla]))
    expect(await reglas(`export const A = () => ${calla}\n`)).toEqual([])
  })

  it('ui/5: el mensaje de un ApiError no es un estado de pantalla', async () => {
    expect(await reglas("const t = 'Could not load the race.'\n", 'apps/web/src/api/x.ts')).toEqual(
      ['ui/5'],
    )
    const api = "request('/x', s, { errorMessage: 'Could not load the race.' })\n"
    expect(await reglas(api, 'apps/web/src/api/x.ts')).toEqual([])
    const plantilla = 'request(`/x/${id}`, s, { errorMessage: `Could not load ${id}.` })\n'
    expect(await reglas(plantilla, 'apps/web/src/api/x.ts')).toEqual([])
  })

  it('ui/10: el ▶︎ de PLAY_GLYPH y los glifos de una plantilla caen; el ▶ solo, no', async () => {
    expect(await reglas("export const PLAY_GLYPH = '▶︎'\n", 'apps/web/src/a.ts')).toEqual(['ui/10'])
    expect(await reglas('export const f = (n: number) => `▲${n}`\n', 'apps/web/src/a.ts')).toEqual([
      'ui/10',
    ])
    expect(await reglas("export const t = 'km ▶'\n", 'apps/web/src/a.ts')).toEqual([])
  })
})
