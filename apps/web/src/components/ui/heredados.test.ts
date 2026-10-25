/// <reference types="node" />
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import { UI_HEREDADOS } from '../../../eslint-ui.mjs'

/**
 * LAS DIEZ REGLAS Y SUS HEREDADOS (E3, docs/visual.md §5.3; PR 8, decisión 5-c). `ui/1` a `ui/10` están en
 * `error` para todo fichero de la web y en `warn` para los de `UI_HEREDADOS`, que el día del PR 8 ya
 * tenían algún aviso. La lista solo encoge: este test falla si uno de ellos ya no tiene ninguno, para que
 * no quede un fichero limpio en `warn`, y el PR que lo limpia lo saca. El paso 22 la vacía.
 *
 * Corre ESLint con el `eslint.config.js` del repositorio, el mismo que `pnpm lint`, y prueba cada regla
 * contra una muestra que tiene que avisar y otra que no: un instrumento que deja de medir no puede dejar
 * la lista en verde (como las dos sondas de `vocabulario.test.ts`).
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

describe('UI_HEREDADOS', () => {
  it('está ordenada, sin repetidos, y cada fichero existe', () => {
    expect(UI_HEREDADOS).toEqual([...new Set(UI_HEREDADOS)].sort())
    expect(UI_HEREDADOS.filter((f) => !existsSync(join(RAIZ, f)))).toEqual([])
  })

  it('cada fichero tiene algún aviso ui/, en warn: el que ya no tiene ninguno sale de la lista', async () => {
    const resultados = UI_HEREDADOS.length === 0 ? [] : await eslint.lintFiles([...UI_HEREDADOS])
    const limpios = resultados
      .filter((r) => avisosUi(r).length === 0)
      .map((r) => r.filePath.slice(RAIZ.length + 1))
    expect(limpios).toEqual([])
    const enError = resultados.filter((r) => avisosUi(r).some((a) => a.severidad !== 1))
    expect(enError.map((r) => r.filePath)).toEqual([])
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
