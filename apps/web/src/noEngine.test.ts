/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * LA WEB NO CARGA EL MOTOR (E2, paso 10b, los arreglos; docs/retransmision.md §18.5, D-56).
 *
 * `@cyclingstar/engine` no declara `sideEffects`, así que el empaquetador no puede quitar lo que una
 * página no usa: importar de él una constante cargaba el motor entero (354 kB, el calendario generado al
 * cargar), y la página de etapa pasaba una sola tarea de 2,6 s con la CPU a ×4 antes de pintar `Watch`.
 * Lo que la web necesita del motor vive copiado en `packages/shared` (`engineCopies.ts`), atado por
 * `apps/api/src/engineCopies.test.ts`. Este test recorre `apps/web/src` con el AST de TypeScript y falla
 * si un fuente que no es un test importa el motor, de forma estática, reexportándolo o con `import()`.
 * Los tests sí pueden: comprueban la web contra el motor y no van al navegador.
 */

const SRC = fileURLToPath(new URL('.', import.meta.url))

/** Los fuentes de la web, sin los tests. */
function sources(dir: string = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return sources(path)
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : []
  })
}

/** Los módulos que importa un fuente: `import`, `export … from` e `import()`. */
function importsOf(path: string): string[] {
  const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
  const out: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      out.push(node.moduleSpecifier.text)
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteralLike(node.arguments[0])
    )
      out.push(node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return out
}

describe('la web no carga el motor', () => {
  it('ningún fuente de apps/web/src que no sea un test importa @cyclingstar/engine', () => {
    const files = sources()
    // no vacía: recorre la web entera, y en ella están los tres que lo importaban antes de los arreglos
    expect(files.length).toBeGreaterThan(100)
    for (const known of ['domain/stageJournal.ts', 'domain/condition.ts', 'pages/RiderProfile.tsx'])
      expect(files.map((f) => relative(SRC, f))).toContain(known)
    const offenders = files.flatMap((f) =>
      importsOf(f)
        .filter((m) => m === '@cyclingstar/engine' || m.startsWith('@cyclingstar/engine/'))
        .map((m) => `${relative(SRC, f)}: ${m}`),
    )
    expect(offenders).toEqual([])
  })
})
