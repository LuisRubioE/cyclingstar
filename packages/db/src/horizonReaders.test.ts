import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript' // CJS con default: el paquete es ESM y esModuleInterop está activo
import { afterAll, describe, expect, it } from 'vitest'

/**
 * `Horizon` EN TODA LECTORA (docs/retransmision.md §10.6, punto 1; D-32, decisión 10-c; E2, paso 8a).
 *
 * Toda función exportada de `packages/db/src` que LEE una fuente de D-32 lleva `Horizon` de segundo
 * parámetro, obligatorio y sin defecto: así una llamada nueva no compila sin decidir qué horizonte
 * lleva (el del espectador, `worldHorizon` o `anonHorizon()`). Este test hace de la tabla de §10.6 una
 * regla, y la hace con el AST y el comprobador de tipos de TypeScript, no con texto: un método de un
 * objeto exportado (`palmaresTitleSource.titlesOn`) o una lectura nueva de `stage_timelines` pasaban
 * sin que nadie lo viera con el criterio de texto del prototipo (`l6/lecturas.mjs`).
 *
 * Qué mira, con su porqué:
 *  - Las funciones exportadas (también las de `export { f }`) y los métodos y funciones de los objetos
 *    exportados, con el cuerpo de las funciones NO exportadas del paquete a las que llaman, que es
 *    donde leen de verdad `predictStartlist` o `ensureRaceRosterFrozen`.
 *  - Las fuentes de D-32 enteras: las tablas `stage_results`, `race_gc`, `stage_team_results`,
 *    `stage_timelines`, `palmares`, `rider_points`, `news` y `transactions`, y las columnas
 *    `stage_snapshots.events` y `.radio`, `teams.budget`, `riders.season_points` y `.health` y
 *    `race_rosters.abandoned_day`. En Drizzle por el SÍMBOLO (el comprobador resuelve el
 *    identificador hasta su declaración en `schema.ts`, así que una variable local que se llame
 *    `news` no cuenta); en SQL crudo, por el texto de la plantilla.
 *  - Que LEA: la fuente aparece en una cadena que empieza por `select`, `selectDistinct`, una consulta
 *    relacional o un `execute` cuyo SQL empieza por `select` o `with`. Nombrarla en un `insert`, un
 *    `update` o un `delete` (su `set`, su `where`, su `returning`) es escribir el mundo, no leerlo
 *    para alguien, y no pide horizonte. Nombrarla suelta, fuera de toda cadena (un objeto de columnas
 *    que luego se pasa a `.select`), cuenta solo si la función consulta: un constructor de fragmentos
 *    como `gcOrderBy` no lee nada, y la que lo usa en su `select` ya nombra la tabla en su `from`.
 *  - El TIPO del segundo parámetro, que el comprobador resuelve también en un método tipado por el
 *    contexto (`ChampionTitleSource`).
 *
 * Las excepciones van escritas, por su nombre y con su motivo, y una que ya no haga falta también
 * falla: una fuente de títulos nueva, como la de E12 (§7.9), entra en rojo hasta que alguien decida su
 * horizonte. Fuera de este test quedan `apps/api` (que no lee las tablas sino por estas funciones) y
 * los tests y ficheros de ayuda de tests del paquete.
 */

const aquí = dirname(fileURLToPath(import.meta.url))

/** Las fuentes de D-32, punto 1, como las nombra Drizzle (`schema.ts`): tablas enteras y columnas. */
const TABLAS_FUENTE: ReadonlySet<string> = new Set([
  'stageResults',
  'raceGc',
  'stageTeamResults',
  'stageTimelines',
  'palmares',
  'riderPoints',
  'news',
  'transactions',
])
const COLUMNAS_FUENTE: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['stageSnapshots', new Set(['events', 'radio'])],
  ['teams', new Set(['budget'])],
  ['riders', new Set(['seasonPoints', 'health'])],
  ['raceRosters', new Set(['abandonedDay'])],
])
/** Las mismas en SQL crudo: las tablas por su nombre y las columnas junto a su tabla o solas si no se confunden. */
const TABLAS_SQL = [
  'stage_results',
  'race_gc',
  'stage_team_results',
  'stage_timelines',
  'palmares',
  'rider_points',
  'news',
  'transactions',
]
const COLUMNAS_SQL: readonly (readonly [string | null, readonly string[]])[] = [
  ['stage_snapshots', ['events', 'radio']],
  [null, ['budget', 'season_points', 'abandoned_day']],
  ['riders', ['health']],
]

/** Las cadenas de Drizzle que leen y las que escriben, por el método con que empiezan. */
const CABEZA_LEE: ReadonlySet<string> = new Set([
  'select',
  'selectDistinct',
  'selectDistinctOn',
  'findMany',
  'findFirst',
])
const CABEZA_ESCRIBE: ReadonlySet<string> = new Set(['insert', 'update', 'delete'])

/** Una función que lee una fuente de D-32, con lo que lee y si su segundo parámetro es un `Horizon`. */
export interface Lectora {
  /** `fichero.ts:nombre`, o `fichero.ts:objeto.método` */
  readonly clave: string
  readonly fuentes: readonly string[]
  readonly conHorizonte: boolean
}

const palabra = (texto: string, w: string): boolean => new RegExp(`\\b${w}\\b`).test(texto)

/** El texto literal de una plantilla (sin lo interpolado), en minúsculas. */
function textoDePlantilla(n: ts.TemplateLiteral): string {
  if (ts.isNoSubstitutionTemplateLiteral(n)) return n.text.toLowerCase()
  return [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' ').toLowerCase()
}

/** Las fuentes que nombra un texto de SQL. */
function fuentesDeSql(texto: string): string[] {
  const out: string[] = []
  for (const t of TABLAS_SQL) if (palabra(texto, t)) out.push(t)
  for (const [tabla, cols] of COLUMNAS_SQL)
    if (tabla === null || palabra(texto, tabla))
      for (const c of cols) if (palabra(texto, c)) out.push(`${tabla ?? '·'}.${c}`)
  return out
}

/**
 * El método con que empieza la cadena de Drizzle de una llamada `x.a(…).b(…).c(…)`: el de la llamada
 * más interna cuyo objeto ya no es otra llamada (`a`). Para `db.query.tabla.findMany(…)`, `findMany`.
 */
function cabezaDeCadena(call: ts.CallExpression): ts.CallExpression {
  let c = call
  for (;;) {
    const callee = c.expression
    if (!ts.isPropertyAccessExpression(callee)) return c
    const objeto = callee.expression
    if (ts.isCallExpression(objeto) && ts.isPropertyAccessExpression(objeto.expression)) c = objeto
    else return c
  }
}

/** Si un `execute` lee: su SQL empieza por `select` o `with`. Sin plantilla a la vista, se supone que lee. */
function executeLee(call: ts.CallExpression): boolean {
  const arg = call.arguments[0]
  if (arg === undefined || !ts.isTaggedTemplateExpression(arg)) return true
  const sql = textoDePlantilla(arg.template).trim()
  return !/^(insert|update|delete)\b/.test(sql)
}

/** Dónde aparece una fuente: en una lectura, en una escritura, o suelta (sin cadena de Drizzle a la vista). */
type Uso = 'lee' | 'escribe' | 'suelto'

/**
 * Dónde aparece un nodo: sube por sus antecesores hasta la primera llamada de Drizzle de la que es
 * ARGUMENTO y mira con qué empieza su cadena. Sin cadena a la vista (un fragmento de `ORDER BY` o un
 * objeto de columnas que se pasa a `.select` más tarde), suelto.
 */
function usoDe(n: ts.Node): Uso {
  let hijo: ts.Node = n
  for (let p = n.parent; p !== undefined; hijo = p, p = p.parent) {
    if (!ts.isCallExpression(p) || hijo === p.expression) continue
    if (!ts.isPropertyAccessExpression(p.expression)) continue
    const cabeza = cabezaDeCadena(p)
    const metodo = (cabeza.expression as ts.PropertyAccessExpression).name.text
    if (CABEZA_ESCRIBE.has(metodo)) return 'escribe'
    if (CABEZA_LEE.has(metodo)) return 'lee'
    if (metodo === 'execute') return executeLee(cabeza) ? 'lee' : 'escribe'
    // .map, .filter, Promise.all…: no es Drizzle, se sigue subiendo
  }
  return 'suelto'
}

/** Si un cuerpo hace alguna consulta de lectura: una cadena que empieza por `select` o un `execute` que lee. */
function haceConsulta(cuerpo: ts.Node): boolean {
  let hay = false
  const visita = (n: ts.Node): void => {
    if (hay) return
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const metodo = n.expression.name.text
      if (CABEZA_LEE.has(metodo) || (metodo === 'execute' && executeLee(n))) hay = true
    }
    ts.forEachChild(n, visita)
  }
  visita(cuerpo)
  return hay
}

/** La declaración de `schema.ts` de un identificador, si la tiene: su nombre exportado. */
function nombreEnSchema(checker: ts.TypeChecker, id: ts.Identifier): string | null {
  let s = checker.getSymbolAtLocation(id)
  if (s === undefined) return null
  if (s.flags & ts.SymbolFlags.Alias) s = checker.getAliasedSymbol(s)
  const decl = s.declarations?.[0]
  if (decl === undefined || basename(decl.getSourceFile().fileName) !== 'schema.ts') return null
  return s.name
}

/** Lo que un cuerpo nombra de las fuentes, por su uso, sin entrar en sus ayudantes. */
function fuentesNombradas(
  checker: ts.TypeChecker,
  cuerpo: ts.Node,
): { readonly lee: readonly string[]; readonly suelto: readonly string[] } {
  const lee = new Set<string>()
  const suelto = new Set<string>()
  const apunta = (fuente: string, n: ts.Node): void => {
    const uso = usoDe(n)
    if (uso === 'lee') lee.add(fuente)
    else if (uso === 'suelto') suelto.add(fuente)
  }
  const visita = (n: ts.Node): void => {
    if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression)) {
      const tabla = nombreEnSchema(checker, n.expression)
      const cols = tabla === null ? undefined : COLUMNAS_FUENTE.get(tabla)
      if (cols?.has(n.name.text) === true) apunta(`${tabla}.${n.name.text}`, n)
    }
    if (ts.isIdentifier(n) && TABLAS_FUENTE.has(n.text)) {
      const nombre = nombreEnSchema(checker, n)
      if (nombre !== null && TABLAS_FUENTE.has(nombre)) apunta(nombre, n)
    }
    if (ts.isTaggedTemplateExpression(n))
      for (const f of fuentesDeSql(textoDePlantilla(n.template))) apunta(f, n)
    ts.forEachChild(n, visita)
  }
  visita(cuerpo)
  return { lee: [...lee], suelto: [...suelto] }
}

type Funcion = ts.FunctionLikeDeclaration & { body: ts.Node }

/** Las funciones NO exportadas del paquete a las que llama un cuerpo, resueltas por el comprobador. */
function ayudantesLlamados(
  checker: ts.TypeChecker,
  cuerpo: ts.Node,
  esDelPaquete: (f: ts.SourceFile) => boolean,
  exportadas: ReadonlySet<ts.Node>,
): Funcion[] {
  const out: Funcion[] = []
  const visita = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      let s = checker.getSymbolAtLocation(n.expression)
      if (s !== undefined && s.flags & ts.SymbolFlags.Alias) s = checker.getAliasedSymbol(s)
      for (const d of s?.declarations ?? []) {
        if (!esDelPaquete(d.getSourceFile()) || exportadas.has(d)) continue
        const f = funcionDe(d)
        if (f !== null) out.push(f)
      }
    }
    ts.forEachChild(n, visita)
  }
  visita(cuerpo)
  return out
}

/** La función de una declaración: la propia, o la flecha o expresión con que se inicializa. */
function funcionDe(d: ts.Node): Funcion | null {
  if (ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d))
    return d.body === undefined ? null : (d as Funcion)
  if (
    (ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d)) &&
    d.initializer !== undefined &&
    (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))
  )
    return d.initializer as Funcion
  return null
}

/** Si el segundo parámetro de una función es, por su TIPO, el `Horizon` de `horizon.ts`. */
function segundoEsHorizonte(checker: ts.TypeChecker, f: Funcion): boolean {
  const firma = checker.getSignatureFromDeclaration(f)
  const segundo = firma?.parameters[1]
  if (segundo === undefined) return false
  const tipo = checker.getTypeOfSymbolAtLocation(segundo, f)
  const s = tipo.aliasSymbol ?? tipo.getSymbol()
  const decl = s?.declarations?.[0]
  return (
    s?.name === 'Horizon' &&
    decl !== undefined &&
    basename(decl.getSourceFile().fileName) === 'horizon.ts'
  )
}

/** Las funciones exportadas de un fichero, con su clave: las declaradas con `export` y las de `export { … }`. */
function exportadasDe(
  checker: ts.TypeChecker,
  sf: ts.SourceFile,
): { readonly clave: string; readonly decl: ts.Node; readonly f: Funcion }[] {
  const fichero = basename(sf.fileName)
  const out: { clave: string; decl: ts.Node; f: Funcion }[] = []
  const exportado = (n: ts.Node): boolean =>
    ts.canHaveModifiers(n) &&
    (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  const metodosDe = (nombre: string, obj: ts.ObjectLiteralExpression): void => {
    for (const p of obj.properties) {
      const f = funcionDe(p)
      if (f !== null && p.name !== undefined && ts.isIdentifier(p.name))
        out.push({ clave: `${fichero}:${nombre}.${p.name.text}`, decl: p, f })
    }
  }
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && exportado(st) && st.name !== undefined && st.body)
      out.push({ clave: `${fichero}:${st.name.text}`, decl: st, f: st as Funcion })
    if (ts.isVariableStatement(st) && exportado(st))
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue
        const f = funcionDe(d)
        if (f !== null) out.push({ clave: `${fichero}:${d.name.text}`, decl: d, f })
        else if (d.initializer !== undefined && ts.isObjectLiteralExpression(d.initializer))
          metodosDe(d.name.text, d.initializer)
      }
    if (ts.isExportDeclaration(st) && st.moduleSpecifier === undefined && st.exportClause)
      if (ts.isNamedExports(st.exportClause))
        for (const e of st.exportClause.elements) {
          const s = checker.getExportSpecifierLocalTargetSymbol(e)
          for (const d of s?.declarations ?? []) {
            const f = funcionDe(d)
            if (f !== null) out.push({ clave: `${fichero}:${e.name.text}`, decl: d, f })
          }
        }
  }
  return out
}

/** EL CRITERIO: las lectoras de un programa, mirando solo los ficheros que `esDelPaquete` acepta. */
export function lectorasDe(
  program: ts.Program,
  esDelPaquete: (f: ts.SourceFile) => boolean,
): Lectora[] {
  const checker = program.getTypeChecker()
  const ficheros = program.getSourceFiles().filter(esDelPaquete)
  const todas = ficheros.flatMap((sf) => exportadasDe(checker, sf))
  const exportadas = new Set<ts.Node>(todas.flatMap((x) => [x.decl, x.f]))
  const out: Lectora[] = []
  for (const { clave, f } of todas) {
    // Lo que nombra en una lectura cuenta siempre; lo suelto (un fragmento, un objeto de columnas),
    // solo si la función, o un ayudante suyo, consulta: un constructor de `ORDER BY` no lee nada.
    const lee = new Set<string>()
    const suelto = new Set<string>()
    let consulta = false
    const vistas = new Set<ts.Node>()
    const pendientes: Funcion[] = [f]
    for (let g = pendientes.pop(); g !== undefined; g = pendientes.pop()) {
      if (vistas.has(g)) continue
      vistas.add(g)
      const n = fuentesNombradas(checker, g.body)
      for (const s of n.lee) lee.add(s)
      for (const s of n.suelto) suelto.add(s)
      consulta ||= haceConsulta(g.body)
      pendientes.push(...ayudantesLlamados(checker, g.body, esDelPaquete, exportadas))
    }
    const fuentes = new Set([...lee, ...(consulta ? suelto : [])])
    if (fuentes.size > 0)
      out.push({
        clave,
        fuentes: [...fuentes].sort(),
        conHorizonte: segundoEsHorizonte(checker, f),
      })
  }
  return out.sort((a, b) => a.clave.localeCompare(b.clave))
}

/**
 * LAS EXCEPCIONES, por su nombre y con su motivo (§10.6, decisión 10-c). Cada una tiene que seguir
 * leyendo una fuente y seguir sin `Horizon`: si no, sobra y se quita.
 */
const EXCEPCIONES: ReadonlyMap<string, string> = new Map([
  // Los orquestadores del tick: calculan el mundo, no lo leen para un espectador; cuando llaman a una
  // lectora de la tabla le pasan `worldHorizon`. Son los que nombra §10.6 y el AST encuentra leyendo.
  [
    'stageRun.ts:runOneStage',
    'el tick: corre la etapa y escribe su resultado, la general y el resto',
  ],
  [
    'calendarRun.ts:runCalendarDay',
    'el tick: el día del calendario (listas, etapas, puntos y reparaciones del mundo)',
  ],
  [
    'calendarRun.ts:recomputeWorldRanking',
    'el tick y la administración: rehacen el ranking del mundo con todas las etapas',
  ],
  ['callups.ts:runCallups', 'el tick: las convocatorias, con los puntos del mundo al día'],
  ['contracts.ts:runMarket', 'el tick: el mercado, con los presupuestos del mundo al día'],
  ['rollover.ts:runRollover', 'el tick: el cambio de temporada, con el palmarés y los puntos'],
  // Las dos lecturas de E2 que corren al grabar, en el tick, con la firma que fijó la síntesis (§21.6
  // F.2): guardan la procedencia que el velo degrada al servir (`veilCast`, B13, §10.10).
  [
    'cast.ts:buildTimelineCast',
    'el tick: el reparto congelado de la línea, con su procedencia; el velo lo degrada al servir (B13)',
  ],
  [
    'titles.ts:palmaresTitleSource.titlesOn',
    'el tick: los títulos de campeón del día para el reparto; el velo los degrada al servir (B13)',
  ],
  // Dos escrituras del mánager que leen el presupuesto sin devolverlo: la ruta responde `{ ok }`.
  ['teamPlan.ts:draftRace', 'escribe el calendario del equipo; lee el presupuesto sin devolverlo'],
  [
    'teamPlan.ts:undraftRace',
    'escribe el calendario del equipo; lee el presupuesto sin devolverlo',
  ],
])

/** El programa de `packages/db`, con su `tsconfig.json`, sin los tests (que no exportan lectoras). */
function programaDelPaquete(): ts.Program {
  const raiz = join(aquí, '..')
  const config = ts.readConfigFile(join(raiz, 'tsconfig.json'), (p) => ts.sys.readFile(p))
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, raiz)
  const fuentes = parsed.fileNames.filter((f) => !f.endsWith('.test.ts'))
  return ts.createProgram({ rootNames: fuentes, options: { ...parsed.options, noEmit: true } })
}

/** Lo que no es código de producción del paquete aunque viva en `src`: ayudas de tests y bancos. */
const NO_ES_PRODUCCION = new Set(['testDb.ts', 'timelineTestWorld.ts', 'timelineCollectorBench.ts'])

describe('Horizon en toda lectora de packages/db (§10.6, 10-c)', () => {
  const srcDir = aquí
  const programa = programaDelPaquete()
  const lectoras = lectorasDe(
    programa,
    (f) =>
      dirname(f.fileName) === srcDir &&
      !f.fileName.endsWith('.test.ts') &&
      !NO_ES_PRODUCCION.has(basename(f.fileName)),
  )
  const porClave = new Map(lectoras.map((l) => [l.clave, l]))

  it('mira el paquete entero: ve las lectoras de §10.6 y las dos formas que el criterio de texto no veía', () => {
    expect(lectoras.length).toBeGreaterThan(40)
    // un método de un objeto exportado, tipado por el contexto (§7.4)
    expect(porClave.get('titles.ts:palmaresTitleSource.titlesOn')?.fuentes).toContain('palmares')
    // una lectura de stage_timelines
    expect(porClave.get('timelines.ts:readStageTimeline')?.fuentes).toContain('stageTimelines')
    // y las de siempre
    expect(porClave.get('results.ts:getRaceGc')?.fuentes).toContain('raceGc')
    expect(porClave.get('news.ts:getGlobalNews')?.fuentes).toContain('news')
  })

  it('toda función exportada que lee una fuente de D-32 lleva Horizon de segundo parámetro, salvo las excepciones escritas', () => {
    const sinHorizonte = lectoras
      .filter((l) => !l.conHorizonte && !EXCEPCIONES.has(l.clave))
      .map((l) => `${l.clave} (${l.fuentes.join(', ')})`)
    expect(sinHorizonte).toEqual([])
  })

  it('cada excepción sigue haciendo falta: lee una fuente y no lleva Horizon (si no, se quita)', () => {
    const sobran = [...EXCEPCIONES.keys()].filter((k) => {
      const l = porClave.get(k)
      return l === undefined || l.conHorizonte
    })
    expect(sobran).toEqual([])
    for (const [clave, motivo] of EXCEPCIONES) expect(motivo.trim(), clave).not.toBe('')
  })
})

/**
 * EL CRITERIO, SOBRE UN PAQUETE DE MENTIRA. Un `schema.ts`, un `horizon.ts` y un módulo con cada
 * forma que importa: lo que el criterio tiene que ver (un método de un objeto exportado, una lectura
 * de `stage_timelines`, una lectura dentro de un ayudante no exportado, SQL crudo, un objeto de
 * columnas que se consulta después) y lo que no (una escritura, también en SQL crudo, una variable
 * local que se llama como una tabla, una columna que no es fuente, un fragmento que no consulta).
 */
describe('el criterio de las lectoras (10-c), sobre un paquete de mentira', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lectoras-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))
  writeFileSync(
    join(dir, 'schema.ts'),
    [
      'export const news = { id: 1, gameDay: 2 }',
      'export const stageTimelines = { raceId: 1, body: 2 }',
      'export const palmares = { id: 1 }',
      'export const teams = { id: 1, budget: 2, name: 3 }',
      'export const riders = { id: 1, name: 2 }',
    ].join('\n'),
  )
  writeFileSync(
    join(dir, 'horizon.ts'),
    'export interface Horizon { readonly veil: readonly string[] }\n',
  )
  writeFileSync(
    join(dir, 'mod.ts'),
    [
      "import type { Horizon } from './horizon.js'",
      "import { news, palmares, riders, stageTimelines, teams } from './schema.js'",
      'declare const sql: (s: TemplateStringsArray, ...v: unknown[]) => string',
      'interface Q { select(x?: unknown): Q; from(x: unknown): Q; where(x: unknown): Q; insert(x: unknown): Q; update(x: unknown): Q; set(x: unknown): Q; values(x: unknown): Q; execute(x: unknown): Q }',
      'interface Fuente { titlesOn(q: Q, h: Horizon): unknown }',
      'export function leeNoticias(q: Q, h: Horizon) { return q.select().from(news) }',
      'export function leeSinHorizonte(q: Q, day: number) { return q.select().from(news).where(day) }',
      'export function leeLinea(q: Q) { return q.select({ b: stageTimelines.body }).from(stageTimelines) }',
      'export const fuente: Fuente = { titlesOn(q, h) { return q.select().from(palmares).where(h) } }',
      'function ayudante(q: Q) { return q.select({ b: teams.budget }).from(teams) }',
      'export function porAyudante(q: Q) { return ayudante(q) }',
      'export function crudo(q: Q) { return q.execute(sql`select count(*) from rider_points`) }',
      'export function escribe(q: Q) { q.insert(news).values({ id: 1 }); return q.update(teams).set({ budget: sql`${teams.budget} + 1` }) }',
      'export function escribeCrudo(q: Q) { return q.execute(sql`update riders set season_points = 0`) }',
      'export function local(q: Q) { const news = [1]; return q.select({ n: riders.name }).from(riders).where(news) }',
      'export function nombre(q: Q) { return q.select({ n: teams.name }).from(teams) }',
      'export function fragmento() { return [teams.budget] }',
      'export function conObjeto(q: Q) { const cols = { b: teams.budget }; return q.select(cols).from(teams) }',
    ].join('\n'),
  )
  const programa = ts.createProgram({
    rootNames: [join(dir, 'mod.ts')],
    options: { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022 },
  })
  const lectoras = lectorasDe(programa, (f) => dirname(f.fileName) === dir)

  it('ve las siete lectoras y solo esas, con lo que leen y si llevan Horizon', () => {
    expect(lectoras).toEqual([
      { clave: 'mod.ts:conObjeto', fuentes: ['teams.budget'], conHorizonte: false },
      { clave: 'mod.ts:crudo', fuentes: ['rider_points'], conHorizonte: false },
      { clave: 'mod.ts:fuente.titlesOn', fuentes: ['palmares'], conHorizonte: true },
      { clave: 'mod.ts:leeLinea', fuentes: ['stageTimelines'], conHorizonte: false },
      { clave: 'mod.ts:leeNoticias', fuentes: ['news'], conHorizonte: true },
      { clave: 'mod.ts:leeSinHorizonte', fuentes: ['news'], conHorizonte: false },
      { clave: 'mod.ts:porAyudante', fuentes: ['teams.budget'], conHorizonte: false },
    ])
  })

  it('lee los ficheros del paquete de verdad (si no hubiera ninguno, el primer bloque no miraría nada)', () => {
    expect(readdirSync(aquí).filter((f) => f.endsWith('.ts')).length).toBeGreaterThan(50)
  })
})
