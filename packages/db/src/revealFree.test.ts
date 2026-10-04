import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript' // CJS con default: el paquete es ESM y esModuleInterop está activo
import { describe, expect, it } from 'vitest'

/**
 * B20 · REVELAR SIN CASTIGO (docs/retransmision.md §16.4; D-38, I-35; paso 7a).
 *
 * Lo visto es del espectador y de nadie más: ningún premio, logro, moral ni dinero puede depender de
 * si alguien vio una etapa, la reveló o la dejó caducar, porque entonces revelar castigaría y mirar
 * premiaría. La forma de asegurarlo es que nadie LEA `race_watch` fuera de los ficheros que calculan
 * el horizonte y escriben lo visto: este test lee con el AST de TypeScript todos los ficheros de
 * `packages/db/src` y `packages/engine/src` y falla si alguno de fuera de la lista nombra `raceWatch`
 * (la tabla de Drizzle) o `race_watch` (en una cadena o una plantilla de SQL). Los comentarios no
 * cuentan: hablar de la tabla no es leerla.
 *
 * La lista es literal y cerrada (Rcodigo-093): una regla como «cualquier fichero que se llame reset»
 * abriría justo el agujero que esto cierra. El reinicio del mundo que borra la tabla no tiene código
 * (es un procedimiento de `docs/ops.md`, §13.9); si algún día lo tiene, su fichero entra aquí en el
 * mismo PR y con su motivo. Y la lista no envejece: cada fichero de ella tiene que nombrarla.
 */

const aquí = dirname(fileURLToPath(import.meta.url))
const raíz = join(aquí, '..', '..', '..')

/** Los únicos ficheros que pueden nombrar lo visto, con su motivo. Los `*.test.ts` también pueden. */
const PERMITIDOS: ReadonlyMap<string, string> = new Map([
  ['packages/db/src/schema.ts', 'define la tabla (la 0048)'],
  ['packages/db/src/horizon.ts', 'lee lo conocido para calcular el horizonte (§10.6)'],
  ['packages/db/src/watch.ts', 'las cuatro escrituras de lo visto y sus lecturas (§10.3)'],
])

function ficherosTs(dir: string, out: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    if (nombre === 'node_modules' || nombre === 'dist') continue
    const p = join(dir, nombre)
    if (statSync(p).isDirectory()) ficherosTs(p, out)
    else if (nombre.endsWith('.ts') && !nombre.endsWith('.d.ts')) out.push(p)
  }
  return out
}

/** Lo que un fichero nombra de lo visto, en código: el identificador o el nombre de la tabla en un texto. */
function nombraLoVisto(fuente: string, fichero: string): string[] {
  const sf = ts.createSourceFile(fichero, fuente, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
  const vistos: string[] = []
  const visita = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && n.text === 'raceWatch') vistos.push('raceWatch')
    if (
      (ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n)) &&
      n.text.includes('race_watch')
    )
      vistos.push('race_watch')
    ts.forEachChild(n, visita)
  }
  visita(sf)
  return vistos
}

describe('B20 · revelar sin castigo: nadie fuera de la lista lee lo visto (D-38)', () => {
  const ficheros = [
    ...ficherosTs(join(raíz, 'packages', 'db', 'src')),
    ...ficherosTs(join(raíz, 'packages', 'engine', 'src')),
  ].map((f) => ({ ruta: relative(raíz, f).split('\\').join('/'), fuente: readFileSync(f, 'utf8') }))

  it('lee los dos paquetes enteros (si la cuenta se queda corta, el test no vigila nada)', () => {
    expect(ficheros.length).toBeGreaterThan(300)
    expect(ficheros.some((f) => f.ruta === 'packages/engine/src/constants.ts')).toBe(true)
  })

  it('ningún fichero de fuera de la lista nombra raceWatch ni race_watch', () => {
    const fuera = ficheros
      .filter((f) => !PERMITIDOS.has(f.ruta) && !f.ruta.endsWith('.test.ts'))
      .filter((f) => nombraLoVisto(f.fuente, f.ruta).length > 0)
      .map((f) => f.ruta)
    expect(fuera).toEqual([])
  })

  it('cada fichero de la lista la nombra de verdad: una entrada que sobra se quita', () => {
    for (const [ruta] of PERMITIDOS) {
      const f = ficheros.find((x) => x.ruta === ruta)
      expect(f, ruta).toBeDefined()
      expect(nombraLoVisto(f!.fuente, ruta).length, ruta).toBeGreaterThan(0)
    }
  })

  it('el criterio ve el identificador y el SQL, y no los comentarios', () => {
    expect(nombraLoVisto('const a = raceWatch.userId', 'x.ts')).toEqual(['raceWatch'])
    expect(
      nombraLoVisto('db.execute(sql`select * from race_watch where x = ${1}`)', 'x.ts'),
    ).toEqual(['race_watch'])
    expect(nombraLoVisto("const t = 'race_watch'", 'x.ts')).toEqual(['race_watch'])
    expect(
      nombraLoVisto('// race_watch y raceWatch, en un comentario\nconst a = 1', 'x.ts'),
    ).toEqual([])
  })
})
