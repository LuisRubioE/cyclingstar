// El motor es puro y no toca disco (eslint.config.js); este test sí, porque su trabajo es LEER los
// fuentes de grammar/ como texto. Un test no lo importa nadie, así que no rompe la pureza del motor.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { readdirSync, readFileSync } from 'node:fs'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { join } from 'node:path'
import ts from 'typescript' // CJS con default: el paquete es ESM ("type": "module") y esModuleInterop está activo
import { describe, expect, it, vi } from 'vitest'

/**
 * EL ARRANQUE DEL CALENDARIO (docs/generador.md §3.8 y §14.4).
 *
 * Paso 1: nace con el `it` de importaciones. `calendar.ts` importará todos los `grammar/*.ts` y
 * evalúa `SEASON_CALENDAR` al cargar, así que un fuente de `grammar/` que importara un VALOR de
 * `calendar.ts` cerraría un ciclo de carga que arranca con `ReferenceError`. Solo vale la sentencia
 * `import type` entera, que `verbatimModuleSyntax` borra al compilar. El paso 5 añade el `it` de
 * `stage/` (el tercero) y el 8 los de coste.
 */

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
