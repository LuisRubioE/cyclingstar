/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  arrowSchema,
  barSchema,
  loadLevelSchema,
  markSchema,
  starsSchema,
} from '@cyclingstar/shared'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { productionDeps, registryOf } from './__fixtures__/productionRegistry.js'
import {
  FRONTERA_SIN_USO,
  FRONTERA_SIN_USO_MAX,
  type FronteraBreak,
  INTERNAL_NUMBER_NAMES,
  fieldMatches,
} from './frontera.js'
import { ADMIN_VEIL, type RouteEntry } from './spoiler.js'

/**
 * NINGÚN CAMPO SIN LECTOR, NINGÚN NÚMERO INTERNO (E3, docs/visual.md §13.2, punto 3; D-54; PR 19a y 19b).
 *
 * Recorre los esquemas de respuesta del registro hoja por hoja (con `[]` por cada array y `.*` por cada
 * registro) y falla si una hoja se llama como un número interno (`INTERNAL_NUMBER_NAMES`), si es un
 * número dentro de un `attributes` sin su forma de pantalla (`FORMAS`) o si nadie la lee en `apps/web/src`. La lectura se busca con el AST de
 * TypeScript, como `noEngine.test.ts`: el nombre de la hoja tiene que salir en algún fuente de la web como
 * acceso a propiedad (`r.points`), como desestructuración (`{ points }`) o como clave literal
 * (`r['points']`). Es una comprobación por nombre, gruesa a propósito (no distingue dos `name`), y por eso
 * los nombres prohibidos se miran aparte. Lo que no cumple va en `FRONTERA_SIN_USO`, y el test también
 * falla si una excepción ya no hace falta, para que la lista no guarde muertos.
 *
 * Una hoja rompe una cosa, la peor: un número interno, antes que una resolución de más, antes que un
 * campo sin lector. Las rutas de administración (`ADMIN_VEIL`) no se recorren: las lee el panel o la radio,
 * tras el token, y la regla es la de lo que una pantalla enseña a quien la pide (§13.1).
 */

/**
 * Lo que ejecuta la web: sus fuentes y los de `packages/shared`, que empaqueta y llama (el texto de las
 * noticias, los nombres y el ritmo de la retransmisión leen ahí sus campos).
 */
const WEB = [
  fileURLToPath(new URL('../../web/src', import.meta.url)),
  fileURLToPath(new URL('../../../packages/shared/src', import.meta.url)),
]

/** Los fuentes de una carpeta, sin los tests. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return sources(path)
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : []
  })
}

/**
 * Los nombres que la web lee: accesos a propiedad, desestructuraciones y claves literales, la de un
 * `r['points']` y la de una tabla de columnas, `{ key: 'relevo' }`, que se lee después con `r[c.key]`.
 */
function webReads(): ReadonlySet<string> {
  const out = new Set<string>()
  for (const path of WEB.flatMap((d) => sources(d))) {
    const f = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
    const visit = (n: ts.Node): void => {
      if (ts.isPropertyAccessExpression(n)) out.add(n.name.text)
      else if (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression))
        out.add(n.argumentExpression.text)
      else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent)) {
        const key = n.propertyName ?? n.name
        if (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) out.add(key.text)
      } else if (
        ts.isPropertyAssignment(n) &&
        ts.isIdentifier(n.name) &&
        n.name.text === 'key' &&
        ts.isStringLiteralLike(n.initializer)
      )
        out.add(n.initializer.text)
      ts.forEachChild(n, visit)
    }
    visit(f)
  }
  return out
}

/** Una hoja de un esquema: su camino, el nombre de su campo, si es un número y su esquema, ya abierto. */
interface Leaf {
  readonly path: string
  readonly name: string
  readonly number: boolean
  readonly schema: z.ZodType
}

/**
 * Las formas de pantalla de un número (§13.2, punto 2): las estrellas, la barra, la marca y la carga en
 * palabras. Un número declarado con una de ellas ya cruza en su forma, aunque vaya dentro de un `attributes`
 * (los de la ficha, desde el 19b); se reconocen por identidad, así que hay que usarlas tal cual.
 */
const FORMAS: ReadonlySet<z.ZodType> = new Set([
  starsSchema,
  barSchema,
  markSchema,
  loadLevelSchema,
])

interface Def {
  readonly type: string
  readonly shape?: Readonly<Record<string, z.ZodType>>
  readonly element?: z.ZodType
  readonly innerType?: z.ZodType
  readonly valueType?: z.ZodType
  readonly options?: readonly z.ZodType[]
  readonly items?: readonly z.ZodType[]
  readonly left?: z.ZodType
  readonly right?: z.ZodType
  readonly out?: z.ZodType
  readonly getter?: () => z.ZodType
}
const defOf = (s: z.ZodType): Def => (s as unknown as { _zod: { def: Def } })._zod.def

/** Las hojas de un esquema, sin repetir: lo que envuelve se abre y las uniones se recorren todas. */
function leavesOf(schema: z.ZodType, path = '', name = '', depth = 0): Leaf[] {
  if (depth > 40) throw new Error(`esquema demasiado hondo en ${path}`)
  const d = defOf(schema)
  const next = (s: z.ZodType, p: string, n: string) => leavesOf(s, p, n, depth + 1)
  switch (d.type) {
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'catch':
    case 'readonly':
    case 'nonoptional':
      return next(d.innerType!, path, name)
    case 'lazy':
      return next(d.getter!(), path, name)
    case 'pipe':
      return next(d.out!, path, name)
    case 'object':
      return Object.entries(d.shape!).flatMap(([k, v]) =>
        next(v, path === '' ? k : `${path}.${k}`, k),
      )
    case 'array':
      return next(d.element!, `${path}[]`, name)
    case 'record':
      return next(d.valueType!, `${path}.*`, name)
    case 'tuple':
      return d.items!.flatMap((it) => next(it, `${path}[]`, name))
    case 'union':
      return uniq(d.options!.flatMap((o) => next(o, path, name)))
    case 'intersection':
      return uniq([...next(d.left!, path, name), ...next(d.right!, path, name)])
    default:
      return [{ path, name, number: d.type === 'number' || d.type === 'bigint', schema }]
  }
}
const uniq = (leaves: readonly Leaf[]): Leaf[] => [
  ...new Map(leaves.map((l) => [`${l.path} ${l.number}`, l])).values(),
]

/** Lo que rompe una hoja, el peor; null si nada. */
function breaksOf(leaf: Leaf, reads: ReadonlySet<string>): FronteraBreak | null {
  if ((INTERNAL_NUMBER_NAMES as readonly string[]).includes(leaf.name)) return 'numero_interno'
  if (leaf.number && !FORMAS.has(leaf.schema) && leaf.path.split(/\.|\[\]/).includes('attributes'))
    return 'resolucion'
  if (leaf.name !== '' && !reads.has(leaf.name)) return 'sin_lector'
  return null
}

/** Una falta: la ruta, la hoja y lo que rompe. */
interface Falta {
  readonly route: string
  readonly field: string
  readonly breaks: FronteraBreak
}

/** Las rutas que se recorren: las del registro con esquema, sin las de administración. */
const recorridas = (entries: Iterable<RouteEntry>): RouteEntry[] =>
  [...entries].filter((e) => e.method !== 'HEAD' && e.response !== null && e.veil !== ADMIN_VEIL)

/** Las faltas de todas las rutas recorridas, en todos sus códigos. */
function faltasDe(entries: readonly RouteEntry[], reads: ReadonlySet<string>): Falta[] {
  return entries.flatMap((e) =>
    Object.values(e.response ?? {}).flatMap((schema) =>
      leavesOf(schema).flatMap((leaf) => {
        const breaks = breaksOf(leaf, reads)
        return breaks === null ? [] : [{ route: `${e.method} ${e.url}`, field: leaf.path, breaks }]
      }),
    ),
  )
}

const cubierta = (f: Falta) =>
  FRONTERA_SIN_USO.some(
    (x) =>
      x.breaks === f.breaks &&
      x.routes.includes(f.route) &&
      x.fields.some((p) => fieldMatches(f.field, p)),
  )

// La sonda: un día con su `tsb`, unos atributos con decimales y un campo que la web no lee; y unos atributos
// en su forma, que no rompen nada aunque sean números dentro de un `attributes` (19b).
const sondaSchema = z.object({
  id: z.string(),
  days: z.array(z.object({ gameDay: z.number().int(), tsb: z.number() })),
  rider: z.object({
    id: z.string(),
    attributes: z.record(z.string(), z.number()),
    nickname: z.string().nullable(),
  }),
  mine: z.object({
    attributes: z.record(z.string(), z.object({ stars: starsSchema, mark: markSchema })),
  }),
})

const entries = recorridas((await registryOf(productionDeps(false))).values())
const faltas = faltasDe(entries, webReads())
/** Las hojas numéricas de cada ruta, para las excepciones de resolución. */
const numericas = entries.flatMap((e) =>
  Object.values(e.response ?? {}).flatMap((schema) =>
    leavesOf(schema)
      .filter((l) => l.number)
      .map((l) => ({ route: `${e.method} ${e.url}`, field: l.path })),
  ),
)

describe('la frontera, hoja por hoja (§13.2, punto 3; PR 19a)', () => {
  it('recorre las rutas del jugador: todas, menos las de better-auth y las de administración', () => {
    expect(entries.length).toBeGreaterThan(60)
    expect(entries.some((e) => e.url.startsWith('/api/admin'))).toBe(false)
  })

  it('ninguna hoja rompe la frontera fuera de FRONTERA_SIN_USO', () => {
    expect(faltas.filter((f) => !cubierta(f))).toEqual([])
  })

  it('FRONTERA_SIN_USO no guarda muertos: cada excepción, en cada ruta y cada hoja, sigue haciendo falta', () => {
    // Una de resolución que no es un `attributes` (la flecha, la moral) no la caza la comprobación por
    // nombre: sigue viva mientras su hoja sea un número, y muere cuando cruza con su forma (19b).
    const viva = (route: string, field: string, breaks: FronteraBreak) =>
      faltas.some(
        (f) => f.route === route && f.breaks === breaks && fieldMatches(f.field, field),
      ) ||
      (breaks === 'resolucion' &&
        numericas.some((l) => l.route === route && fieldMatches(l.field, field)))
    const muertas = FRONTERA_SIN_USO.flatMap((x) =>
      x.routes.flatMap((route) =>
        x.fields
          .filter((field) => !viva(route, field, x.breaks))
          .map((field) => ({ route, field, breaks: x.breaks })),
      ),
    )
    expect(muertas).toEqual([])
  })

  it('la lista solo encoge: su largo es FRONTERA_SIN_USO_MAX, que cada PR que la vacía baja (13-e)', () => {
    expect(FRONTERA_SIN_USO.length).toBe(FRONTERA_SIN_USO_MAX)
    for (const x of FRONTERA_SIN_USO) expect(x.why.trim().length).toBeGreaterThan(5)
  })

  it('la comprobación caza lo que tiene que cazar (sondas)', () => {
    const reads = new Set(['days', 'gameDay', 'id', 'mine', 'stars', 'mark'])
    const sonda: RouteEntry = {
      method: 'GET',
      url: '/api/sonda',
      policy: 'safe',
      veil: { by: ['N'] },
      origin: 'app',
      responseCheck: 'runtime',
      response: { 200: sondaSchema },
    }
    expect(faltasDe([sonda], reads)).toEqual([
      { route: 'GET /api/sonda', field: 'days[].tsb', breaks: 'numero_interno' },
      { route: 'GET /api/sonda', field: 'rider.attributes.*', breaks: 'resolucion' },
      { route: 'GET /api/sonda', field: 'rider.nickname', breaks: 'sin_lector' },
    ])
  })

  it('lo que el 19b pasa a su forma cruza con su esquema de forma, y un ajeno no lleva la marca (§13.5)', () => {
    const hojas = (route: string): Leaf[] => {
      const e = entries.find((x) => `${x.method} ${x.url}` === route)
      return Object.values(e?.response ?? {}).flatMap((s) => leavesOf(s))
    }
    const forma = (route: string, field: string) =>
      hojas(route).find((l) => l.path === field)?.schema ?? null
    const FORMA_19B: readonly (readonly [string, string, z.ZodType])[] = [
      ['GET /api/riders/me', 'rider.attributes.*.stars', starsSchema],
      ['GET /api/riders/me', 'rider.attributes.*.mark', markSchema],
      ['GET /api/riders/:id', 'rider.attributes.*.stars', starsSchema],
      ['GET /api/riders/me/form', 'log[].fitness', barSchema],
      ['GET /api/riders/me/form', 'log[].freshness', barSchema],
      ['GET /api/riders/me/form', 'log[].load', loadLevelSchema],
      ['GET /api/riders/me/form', 'form.stars', starsSchema],
      ['GET /api/riders/me/form', 'form.freshness', barSchema],
      ['GET /api/riders/me/trend', 'trend[].arrow', arrowSchema],
      ['GET /api/riders/me/summary', 'summary.moraleStars', starsSchema],
    ]
    for (const [route, field, schema] of FORMA_19B)
      expect(forma(route, field) === schema, `${route} ${field}`).toBe(true)
    // «nada más para un ajeno»: de un corredor cualquiera, solo sus estrellas
    expect(
      hojas('GET /api/riders/:id')
        .filter((l) => l.path.startsWith('rider.attributes'))
        .map((l) => l.path),
    ).toEqual(['rider.attributes.*.stars'])
  })

  it('lo que el 19c saca ya no está en su esquema, tampoco lo que la comprobación por nombre daba por leído (§13.5)', () => {
    const hojas = (route: string): string[] => {
      const e = entries.find((x) => `${x.method} ${x.url}` === route)
      return Object.values(e?.response ?? {}).flatMap((s) => leavesOf(s).map((l) => l.path))
    }
    const FUERA_19C: readonly (readonly [string, string])[] = [
      // `season` se lee en otros sitios, así que el nombre no la cazaba
      ['GET /api/riders/me/coach-view', 'coachView.season'],
      ['GET /api/riders/me/coach-view', 'coachView.facilities'],
      ['GET /api/riders/me/summary', 'summary.fame'],
      ['GET /api/riders/:id', 'rider.fame'],
      ['GET /api/riders/me', 'rider.birthSeason'],
      ['GET /api/riders/me/plan', 'plan.goalRaceId'],
      ['GET /api/names/generate', 'firstName'],
      ['GET /api/my-orders', 'orders[].triggerOn.byRiderId'],
      ['GET /api/me/horizon', 'ready[].expiresOnDay'],
      ['GET /api/races/:raceId/stages/:day/broadcast', 'startState.racingAtStart'],
      ['GET /api/races/:raceId/stages/:day/broadcast', 'weather.spans[].windDir'],
      ['GET /api/calendar/:raceId', 'stages[].arch.geo'],
    ]
    for (const [route, field] of FUERA_19C) {
      expect(hojas(route).length, route).toBeGreaterThan(0)
      expect(hojas(route), `${route} ${field}`).not.toContain(field)
    }
  })

  it('lo que el 19d saca, lo último que pedía la web de ayer, ya no está en su esquema (§13.5; D-50)', () => {
    const hojas = (route: string): string[] => {
      const e = entries.find((x) => `${x.method} ${x.url}` === route)
      return Object.values(e?.response ?? {}).flatMap((s) => leavesOf(s).map((l) => l.path))
    }
    const FUERA_19D: readonly (readonly [string, string])[] = [
      ['GET /api/riders/:id', 'rider.champion.validToDay'],
      ['GET /api/races/:raceId/stages/:day', 'champions.*.provisional'],
      ['GET /api/races/:raceId/stages/:day', 'teamStage[].sumaPuestos'],
      ['GET /api/races/:raceId/stages/:day/broadcast', 'cast[].worn.title.provisional'],
      ['GET /api/races/:raceId/stages/:day/report', 'teamGc[].sumaPuestos'],
      ['GET /api/news', 'news[].payload.fromTeamId'],
      ['GET /api/teams/:id/news', 'news[].payload.prevHealth'],
      ['GET /api/riders/me/last-race', 'report.bonusS'],
    ]
    for (const [route, field] of FUERA_19D) {
      expect(hojas(route).length, route).toBeGreaterThan(0)
      expect(hojas(route), `${route} ${field}`).not.toContain(field)
    }
  })

  it('la semilla del maillot ya no cruza: los de estado llevan su maillot, y el rótulo, la de lo grabado antes de la traducción (§8.5, 8-f; 19e)', () => {
    const hojas = (route: string): string[] => {
      const e = entries.find((x) => `${x.method} ${x.url}` === route)
      return Object.values(e?.response ?? {}).flatMap((s) => leavesOf(s).map((l) => l.path))
    }
    const FUERA_19E: readonly (readonly [string, string])[] = [
      ['GET /api/teams', 'teams[].jerseySeed'],
      ['GET /api/teams/:id', 'team.jerseySeed'],
      ['GET /api/calendar/:raceId/startlist', 'teams[].jerseySeed'],
      ['GET /api/races/:raceId/stages/:day/broadcast', 'cast[].team.jerseySeed'],
    ]
    for (const [route, field] of FUERA_19E) {
      expect(hojas(route).length, route).toBeGreaterThan(0)
      expect(hojas(route), `${route} ${field}`).not.toContain(field)
    }
    expect(hojas('GET /api/teams')).toContain('teams[].kit')
    expect(hojas('GET /api/races/:raceId/stages/:day/broadcast')).toContain(
      'cast[].team.legacySeed',
    )
  })
})
