// El motor es puro y no toca disco (eslint.config.js); este test sí, porque su trabajo es LEER los
// fuentes de grammar/ como texto. Un test no lo importa nadie, así que no rompe la pureza del motor.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { readdirSync, readFileSync } from 'node:fs'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { join } from 'node:path'
import ts from 'typescript' // CJS con default: el paquete es ESM ("type": "module") y esModuleInterop está activo
import { describe, expect, it, vi } from 'vitest'
import { ARCH } from '../constants.js' // no importa ningún valor: se evalúa antes del reloj y no cuenta
import type { CalendarRace } from './calendar.js' // solo tipo: se borra al compilar y no evalúa calendar.ts antes del reloj

/**
 * EL ARRANQUE DEL CALENDARIO (docs/generador.md §3.8 y §14.4).
 *
 * Paso 1: nace con el `it` de importaciones. `calendar.ts` importa todos los `grammar/*.ts` y
 * evalúa `SEASON_CALENDAR` al cargar, así que un fuente de `grammar/` que importara un VALOR de
 * `calendar.ts` cerraría un ciclo de carga que arranca con `ReferenceError`. Solo vale la sentencia
 * `import type` entera, que `verbatimModuleSyntax` borra al compilar. El paso 5 añade el `it` de
 * `stage/` (el tercero) y el 8 los de coste, que van PRIMERO en el fichero: el `it` de importaciones
 * carga los módulos de `grammar/`, y la carga de `calendar.js` tiene que medirse con el registro
 * limpio (vitest aísla cada fichero, así que ningún otro test la ha pagado ya).
 */

/** Instrumentación de la cobertura: de ×1,75 a ×2,02 medida test a test (`vitest.config.ts`). */
// eslint-disable-next-line no-restricted-globals -- un test lee el nombre del script de pnpm, no el motor
const K = process.env.npm_lifecycle_event === 'test:coverage' ? 2 : 1

describe('routes/arranque: el calendario se construye dentro de ARCH.arranque', () => {
  it('la temporada 0 (SEASON_CALENDAR) cuesta menos que el techo, y avisa por encima del objetivo', async () => {
    const t0 = performance.now()
    const { SEASON_CALENDAR } = await import('./calendar.js')
    const ms = performance.now() - t0
    expect(SEASON_CALENDAR).toHaveLength(842)
    if (ms > ARCH.arranque.objetivoMs * K)
      console.warn(`arranque ${ms.toFixed(0)} ms > objetivo ${ARCH.arranque.objetivoMs}`)
    expect(ms).toBeLessThanOrEqual(ARCH.arranque.techoMs * K)
  })

  it('una temporada adicional cuesta ≤ porTemporadaMs, la segunda lectura devuelve la misma referencia y la 0 nunca se expulsa', async () => {
    const { calendarForSeason, SEASON_CALENDAR } = await import('./calendar.js') // §3.11: viven en calendar.ts
    const cals: CalendarRace[][] = []
    const costes = [1, 2, 3].map((s) => {
      const t = performance.now()
      cals.push(calendarForSeason(s))
      return performance.now() - t
    })
    const mediana = [...costes].sort((a, b) => a - b)[1]
    expect(mediana).toBeLessThanOrEqual(ARCH.arranque.porTemporadaMs * K)
    const t = performance.now()
    const otraVez = calendarForSeason(2)
    expect(performance.now() - t).toBeLessThan(5) // memoizada: no se reconstruye
    expect(otraVez).toBe(calendarForSeason(2)) // misma referencia, no copia
    for (let s = 4; s <= ARCH.arranque.maxTemporadasEnMemoria + 1; s++) calendarForSeason(s) // 9 temporadas distintas de 0
    expect(calendarForSeason(0)).toBe(SEASON_CALENDAR) // BASE_SEASON está fuera del tope (§14.5 punto 2)
    expect(calendarForSeason(1)).not.toBe(cals[0]) // la 1, la menos leída, sí se expulsó y se reconstruyó
    expect(calendarForSeason(1)).toEqual(cals[0]) // con el mismo contenido: calendarForSeason es pura
  })
})

const FUENTES_GRAMMAR = readdirSync(join(import.meta.dirname, 'grammar')).filter(
  (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
)

/** Lee las sentencias (no las líneas: un `import {` puede ocupar varias) y busca un valor de `../calendar.js`. */
function importaValorDeCalendar(fichero: string, src: string): boolean {
  return ts.createSourceFile(fichero, src, ts.ScriptTarget.Latest).statements.some((st) => {
    if (!ts.isImportDeclaration(st) && !ts.isExportDeclaration(st)) return false
    if (
      !st.moduleSpecifier ||
      !ts.isStringLiteral(st.moduleSpecifier) ||
      st.moduleSpecifier.text !== '../calendar.js'
    )
      return false
    const soloTipo = ts.isImportDeclaration(st)
      ? st.importClause?.isTypeOnly === true
      : st.isTypeOnly
    return !soloTipo // `import '../calendar.js'`, `import { type X }` y `export * from` cuentan como valor
  })
}

describe('routes/arranque: el calendario se construye sin ciclos de carga', () => {
  it('el analizador distingue `import type` entero de las formas que cargan el módulo', () => {
    const d = "from '../calendar.js'"
    expect(importaValorDeCalendar('a.ts', `import type { StageSpec } ${d}`)).toBe(false)
    expect(importaValorDeCalendar('a.ts', `import type {\n  A,\n  B,\n} ${d}`)).toBe(false)
    expect(importaValorDeCalendar('a.ts', `export type { StageSpec } ${d}`)).toBe(false)
    expect(importaValorDeCalendar('a.ts', `import { type StageSpec } ${d}`)).toBe(true)
    expect(importaValorDeCalendar('a.ts', `import {\n  SEASON_CALENDAR,\n} ${d}`)).toBe(true)
    expect(importaValorDeCalendar('a.ts', `import '../calendar.js'`)).toBe(true)
    expect(importaValorDeCalendar('a.ts', `export * ${d}`)).toBe(true)
  })

  it('ningún fuente de grammar/ importa un valor de calendar.ts, y cada uno carga el primero', async () => {
    expect(FUENTES_GRAMMAR.length).toBeGreaterThan(0)
    for (const f of FUENTES_GRAMMAR) {
      expect(
        importaValorDeCalendar(f, readFileSync(join(import.meta.dirname, 'grammar', f), 'utf8')),
        f,
      ).toBe(false)
    }
    for (const f of FUENTES_GRAMMAR) {
      vi.resetModules() // registro vacío: `f` es de verdad el primer módulo que se evalúa
      // `@vite-ignore`: la ruta es de verdad variable (vite no puede convertirla en un glob de `.js`
      // porque los fuentes son `.ts`) y se resuelve en tiempo de ejecución, `.js` → `.ts`.
      const ruta = `./grammar/${f.replace(/\.ts$/, '.js')}`
      await expect(import(/* @vite-ignore */ ruta), f).resolves.toBeDefined()
    }
  })

  it('grammar/ no importa nada de stage/ ni llama a sampleProfile, deriveFinishTerrain, finishType o costBase', () => {
    // Paso 5 (§14.4): los vetos son puros (decisión 4). Se buscan llamadas sobre el fuente SIN
    // comentarios, porque las palabras prohibidas sí salen en comentarios obligatorios (la cabecera de
    // `veto.ts`); `import type` de stage/types.js sí vale (se borra al compilar).
    const dir = join(import.meta.dirname, 'grammar')
    const sinComentarios = (s: string): string => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    for (const f of FUENTES_GRAMMAR) {
      const src = readFileSync(join(dir, f), 'utf8')
      expect(src, f).not.toMatch(/^import (?!type )[^\n]*from '[^']*\/stage\//m)
      expect(sinComentarios(src), f).not.toMatch(
        /\b(sampleProfile|deriveFinishTerrain|finishType|costBase)\s*\(/,
      )
    }
  })
})
