/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { HORIZON_KEYS, type SessionSeen, cacheOwnerChanged, horizonKey } from './queryClient'

/**
 * LAS CLAVES CON HORIZONTE (E2, docs/retransmision.md §10.9 y §14.11; D-35, I-32, 14-r; paso 9a).
 *
 * Toda consulta de una familia de `HORIZON_KEYS` depende de lo que ha visto quien mira: su clave lleva
 * el `rev` del horizonte como ÚLTIMO elemento, y la única forma de construirla es `horizonKey`. Olvidarlo
 * es el destripe por caché de X-16 (la ficha velada que la caché sigue sirviendo cuando la etapa ya se
 * vio, o la vista de una cuenta servida a la siguiente), así que este test recorre `apps/web/src` con el
 * AST de TypeScript y falla si un `queryKey` de esas familias no sale de `horizonKey`, directamente o a
 * través de la función que lo construye (`stageReplayKey`, `broadcastHeadKey`…), o si una de esas
 * consultas no lleva `enabled` atado al `rev`: mientras `['horizon']` no responde, `useHorizonRev()` da
 * `undefined` y la consulta espera, porque con un `rev` provisional saldría dos veces (regla 4 de §10.9;
 * Rcoste-018). Sin DOM no se pueden contar las peticiones de la primera carga (§18.5): estas dos
 * comprobaciones son las que hacen que cada consulta se pida una vez.
 *
 * Y `cacheOwnerChanged`, el criterio del vigilante de la caché (`<HorizonWatcher />`), con sus cinco
 * pasos. Empieza por la referencia a los tipos de Node porque lee los fuentes: `apps/web/tsconfig.json`
 * pone `"types": []`.
 */

const SRC = fileURLToPath(new URL('.', import.meta.url))
const FAMILIES: ReadonlySet<string> = new Set<string>(HORIZON_KEYS.map((k) => k[0]))

/** Los fuentes de la web, sin los tests. */
function sources(dir: string = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return sources(path)
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : []
  })
}

/** Lo que una clave dice de sí: de qué familia es y si sale de `horizonKey`. */
interface KeyShape {
  readonly family: string | null
  readonly viaHorizonKey: boolean
}

/** Quita lo que no cambia el valor: paréntesis, `as`, `satisfies` y `!`. */
function unwrap(e: ts.Expression): ts.Expression {
  let x = e
  for (;;) {
    if (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isSatisfiesExpression(x))
      x = x.expression
    else if (ts.isNonNullExpression(x)) x = x.expression
    else return x
  }
}

/** Las expresiones que devuelve cada función con nombre del programa (declaración o `const f = () =>`). */
function returnsByName(files: readonly ts.SourceFile[]): Map<string, ts.Expression[]> {
  const out = new Map<string, ts.Expression[]>()
  const add = (name: string, body: ts.ConciseBody | undefined): void => {
    if (body === undefined) return
    const list = out.get(name) ?? []
    if (!ts.isBlock(body)) list.push(body)
    else {
      const visit = (n: ts.Node): void => {
        if (ts.isReturnStatement(n) && n.expression !== undefined) list.push(n.expression)
        if (!ts.isFunctionLike(n)) ts.forEachChild(n, visit)
      }
      ts.forEachChild(body, visit)
    }
    out.set(name, list)
  }
  for (const f of files)
    ts.forEachChild(f, function walk(n: ts.Node): void {
      if (ts.isFunctionDeclaration(n) && n.name !== undefined) add(n.name.text, n.body)
      if (
        ts.isVariableDeclaration(n) &&
        ts.isIdentifier(n.name) &&
        n.initializer !== undefined &&
        (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
      )
        add(n.name.text, n.initializer.body)
      ts.forEachChild(n, walk)
    })
  return out
}

/** Los `const x = …` de un fichero, para seguir una clave guardada en una variable local. */
function constsOf(file: ts.SourceFile): Map<string, ts.Expression> {
  const out = new Map<string, ts.Expression>()
  const walk = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined)
      out.set(n.name.text, n.initializer)
    ts.forEachChild(n, walk)
  }
  walk(file)
  return out
}

function shapeOf(
  expr: ts.Expression,
  fns: ReadonlyMap<string, ts.Expression[]>,
  locals: ReadonlyMap<string, ts.Expression>,
  depth = 0,
): KeyShape {
  const none: KeyShape = { family: null, viaHorizonKey: false }
  if (depth > 8) return none
  const e = unwrap(expr)
  if (ts.isArrayLiteralExpression(e)) {
    const first = e.elements[0]
    if (first === undefined) return none
    if (ts.isSpreadElement(first)) {
      return {
        family: shapeOf(first.expression, fns, locals, depth + 1).family,
        viaHorizonKey: false,
      }
    }
    const f = unwrap(first)
    return {
      family: ts.isStringLiteral(f) || ts.isNoSubstitutionTemplateLiteral(f) ? f.text : null,
      viaHorizonKey: false,
    }
  }
  if (ts.isCallExpression(e) && ts.isIdentifier(e.expression)) {
    const name = e.expression.text
    if (name === 'horizonKey') {
      const base = e.arguments[0]
      return {
        family: base === undefined ? null : shapeOf(base, fns, locals, depth + 1).family,
        viaHorizonKey: true,
      }
    }
    const returned = fns.get(name) ?? []
    const shapes = returned.map((r) => shapeOf(r, fns, new Map(), depth + 1))
    const family = shapes.find((s) => s.family !== null)?.family ?? null
    return { family, viaHorizonKey: shapes.length > 0 && shapes.every((s) => s.viaHorizonKey) }
  }
  if (ts.isIdentifier(e)) {
    const init = locals.get(e.text)
    return init === undefined ? none : shapeOf(init, fns, locals, depth + 1)
  }
  return none
}

/** Las consultas de un fichero: `useQuery({ … })`, `x.fetchQuery({ … })` y familia. */
interface QueryCall {
  readonly where: string
  readonly kind: 'hook' | 'imperative'
  readonly key: ts.Expression
  readonly enabled: ts.Expression | null
}

const HOOKS = new Set(['useQuery', 'useSuspenseQuery'])
const IMPERATIVE = new Set(['fetchQuery', 'prefetchQuery', 'ensureQueryData'])

function queriesOf(file: ts.SourceFile, root: string): QueryCall[] {
  const out: QueryCall[] = []
  const walk = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : null
      const kind =
        name !== null && HOOKS.has(name)
          ? 'hook'
          : name !== null && IMPERATIVE.has(name)
            ? 'imperative'
            : null
      const arg = n.arguments[0]
      if (kind !== null && arg !== undefined && ts.isObjectLiteralExpression(unwrap(arg))) {
        const obj = unwrap(arg) as ts.ObjectLiteralExpression
        const prop = (key: string): ts.Expression | null => {
          for (const p of obj.properties)
            if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === key)
              return p.initializer
          return null
        }
        const key = prop('queryKey')
        if (key !== null) {
          const { line } = file.getLineAndCharacterOfPosition(n.getStart(file))
          out.push({
            where: `${relative(root, file.fileName)}:${line + 1}`,
            kind,
            key,
            enabled: prop('enabled'),
          })
        }
      }
    }
    ts.forEachChild(n, walk)
  }
  walk(file)
  return out
}

/** Lo que falla en un conjunto de fuentes, como `fichero:línea · motivo`; y cuántas consultas con horizonte hay. */
function problemsOf(
  files: readonly { readonly path: string; readonly text: string }[],
  root: string,
): { problems: string[]; horizonQueries: string[] } {
  const parsed = files.map((f) =>
    ts.createSourceFile(
      f.path,
      f.text,
      ts.ScriptTarget.Latest,
      true,
      f.path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  )
  const fns = returnsByName(parsed)
  const problems: string[] = []
  const horizonQueries: string[] = []
  for (const file of parsed) {
    const locals = constsOf(file)
    for (const q of queriesOf(file, root)) {
      const shape = shapeOf(q.key, fns, locals)
      if (shape.family === null || !FAMILIES.has(shape.family)) continue
      horizonQueries.push(q.where)
      if (!shape.viaHorizonKey)
        problems.push(`${q.where} · la clave de '${shape.family}' no sale de horizonKey`)
      if (q.kind === 'hook' && (q.enabled === null || !/\brev\b/.test(q.enabled.getText(file))))
        problems.push(`${q.where} · la consulta de '${shape.family}' no lleva enabled atado al rev`)
    }
  }
  return { problems, horizonQueries }
}

describe('las claves con horizonte (§10.9, 14-r)', () => {
  const files = sources().map((path) => ({ path, text: readFileSync(path, 'utf8') }))

  it('HORIZON_KEYS son las familias de las rutas de etapa (9a); el mundo entra en el 9b', () => {
    expect([...FAMILIES].sort()).toEqual(['broadcast-head', 'stage-replay', 'stage-report'])
  })

  it('horizonKey pone el rev como último elemento, y la clave cambia con él', () => {
    expect(horizonKey(['stage-replay', 'race-france', 7, false], '9.3')).toEqual([
      'stage-replay',
      'race-france',
      7,
      false,
      '9.3',
    ])
    expect(horizonKey(['stage-replay', 'race-france', 7, false], '9.4')).not.toEqual(
      horizonKey(['stage-replay', 'race-france', 7, false], '9.3'),
    )
  })

  it('todo queryKey de esas familias sale de horizonKey, y toda consulta suya espera al rev', () => {
    const { problems } = problemsOf(files, SRC)
    expect(problems).toEqual([])
  })

  it('no es vacío: la página de etapa, su acta y las de la carrera de un día tienen consultas con horizonte', () => {
    const { horizonQueries } = problemsOf(files, SRC)
    const where = horizonQueries.map((w) => w.split(':')[0])
    for (const page of ['pages/StageReplay.tsx', 'pages/StageReport.tsx', 'pages/Race.tsx'])
      expect(where, page).toContain(page)
    expect(horizonQueries.length).toBeGreaterThanOrEqual(5)
  })

  it('caza lo que tiene que cazar: una clave a mano, una función que no usa horizonKey y una consulta sin enabled', () => {
    const bad = [
      {
        path: `${SRC}fake/Bad.tsx`,
        text: [
          "const a = useQuery({ queryKey: ['stage-replay', raceId, day], queryFn: f, enabled: rev !== undefined })",
          "function badKey(raceId: string) { return ['broadcast-head', raceId] }",
          'const b = useQuery({ queryKey: badKey(raceId), queryFn: f, enabled: rev !== undefined })',
          "const c = useQuery({ queryKey: horizonKey(['stage-report', raceId], rev), queryFn: f })",
          "const d = useQuery({ queryKey: ['news'], queryFn: f })",
        ].join('\n'),
      },
    ]
    const { problems, horizonQueries } = problemsOf(bad, SRC)
    expect(horizonQueries).toHaveLength(3)
    expect(problems).toEqual([
      "fake/Bad.tsx:1 · la clave de 'stage-replay' no sale de horizonKey",
      "fake/Bad.tsx:3 · la clave de 'broadcast-head' no sale de horizonKey",
      "fake/Bad.tsx:4 · la consulta de 'stage-report' no lleva enabled atado al rev",
    ])
  })
})

describe('cacheOwnerChanged: cuándo el vigilante vacía la caché (regla 4 de §10.9, 14-r)', () => {
  const pending: SessionSeen = { resolved: false, userId: null }
  const anon: SessionSeen = { resolved: true, userId: null }
  const ana: SessionSeen = { resolved: true, userId: 'ana' }
  const bea: SessionSeen = { resolved: true, userId: 'bea' }

  it('de pendiente a un id y de pendiente a nada, no: es la carga de la página', () => {
    expect(cacheOwnerChanged(pending, ana)).toBe(false)
    expect(cacheOwnerChanged(pending, anon)).toBe(false)
  })

  it('de un id a otro, de un id a nada y de nada a un id, sí: ha cambiado de quién es la caché', () => {
    expect(cacheOwnerChanged(ana, bea)).toBe(true)
    expect(cacheOwnerChanged(ana, anon)).toBe(true)
    expect(cacheOwnerChanged(anon, ana)).toBe(true)
  })

  it('el mismo dueño, o un paso por pendiente, no cambian nada', () => {
    expect(cacheOwnerChanged(ana, ana)).toBe(false)
    expect(cacheOwnerChanged(anon, anon)).toBe(false)
    expect(cacheOwnerChanged(ana, pending)).toBe(false)
  })
})
