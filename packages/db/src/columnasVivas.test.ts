import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * UNA COLUMNA QUE NADIE ESCRIBE NO ES UN CRITERIO, ES UN CERO (v55).
 *
 * Esta prueba nace de encontrar el mismo defecto dos veces por casualidad, con dos días de
 * diferencia y buscando otra cosa. `riders.fame` decidía los ascensos y descensos entre divisiones,
 * los anuncios de retirada, la selección de escuadra y el orden de los agentes libres… y es un
 * `real DEFAULT 0` que **no se escribe en ninguna parte del repositorio**. Todo el mundo empataba a
 * cero, así que quien decidía de verdad era el desempate. Medido: el equipo con 900 puntos descendía
 * de WorldTour y el de 5 se quedaba.
 *
 * NINGUNA PRUEBA PODÍA CAZARLO, y ése es el punto. Un valor por defecto que nadie mueve no rompe
 * nada: hace que todo EMPATE. El código corre, la consulta devuelve filas, el orden sale, y el
 * criterio simplemente no discrimina. Por eso hace falta una alarma ESTÁTICA y no de comportamiento.
 *
 * QUÉ VIGILA: toda columna numérica con un valor por defecto —la forma exacta del defecto: nace con
 * un número y espera que alguien lo mueva— tiene que escribirse en algún sitio de `packages/db` o
 * `apps/api`. Si no, o se alimenta o se pone en la lista de abajo diciendo por qué.
 *
 * QUÉ **NO** VIGILA, para que nadie se fíe de más: solo mira columnas con default numérico, y solo
 * si se ESCRIBEN, no si se escriben BIEN. Una columna alimentada con basura pasa en verde.
 */

const aquí = dirname(fileURLToPath(import.meta.url))

/**
 * Las que se sabe que están muertas, con su porqué. Vaciar esta lista no es el objetivo: el objetivo
 * es que nadie AÑADA una sin darse cuenta. Quitar una de aquí solo se hace alimentándola.
 */
const MUERTAS_CONOCIDAS: Record<string, string> = {
  fame: `Prestigio de carrera. Nunca se ha escrito (migración 0002). Decidía cuatro cosas y ya no
    decide ninguna (v55): ascensos y descensos, anuncios de retirada, escuadra y orden de agentes
    libres usan ahora \`seasonPoints\` o el palmarés. La columna se queda porque «fama» puede ser un
    concepto que el juego quiera —distinto de los puntos de una temporada— y eso lo decide el dueño.`,
  teamTrust: `Confianza del corredor con su equipo. Nunca se ha escrito (migración 0002), así que
    todos valen 50. La usa \`selectSquad\` con peso 0,4 sobre 4,0, o sea que aporta un 5 % CONSTANTE
    a todo el mundo y no ordena nada: la dimensión está diseñada y no existe. Alimentarla es trabajo
    de G2 (gestión humana de un equipo): la confianza sube y baja con convocatorias, resultados,
    renovaciones y promesas cumplidas, y eso hay que diseñarlo, no inventarlo aquí.`,
}

/**
 * LAS COLUMNAS QUE SE VIGILAN (docs/retransmision.md §13.7, decisión 13-a; E2, paso 1a): sangradas con
 * dos o cuatro espacios —las de `users` van con dos— y de tipo `real`, `integer`, `smallint` o
 * `doublePrecision`. Hasta el 1a eran solo cuatro espacios y sin `smallint`: sobre el esquema de hoy
 * la ampliación añade `worlds.repairVersion`, que se escribe, y desde la 0048 alcanza a
 * `race_watch.follow`, `known_through` y `users.horizon_rev`.
 */
const COLUMNA_CON_DEFECTO =
  /^ {2,4}(\w+): (?:real|integer|smallint|doublePrecision)\('([\w_]+)'\)([^\n]*\.default\(\s*-?\d[\d._]*\s*\)[^\n]*)$/gm

/**
 * LAS COLUMNAS DE E2 QUE SOLO SE DAN POR ESCRITAS COMO CLAVE DE UN `.set(` O UN `.values(` (13-a,
 * Rcodigo-011). La regla de siempre cuenta cualquier línea con `campo:`, y E2 escribe con esos
 * nombres cuatro cosas que no escriben ninguna columna: `Horizon.knownThrough` y el `knownThrough:
 * new Map()` de `worldHorizon` (horizon.ts), `WatchRow.follow` y el parámetro de `setFollow`
 * (watch.ts) y el `horizonRev` que devuelve `recordProgress`. Las que aún no están en `schema.ts` no
 * se miran: entran con su migración (prize con la 0049; las otras tres con la 0048).
 */
const ESCRITURA_DRIZZLE: readonly string[] = ['prize', 'follow', 'knownThrough', 'horizonRev']

function ficherosTs(dir: string, out: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    const p = join(dir, nombre)
    if (nombre === 'node_modules' || nombre === 'dist') continue
    if (statSync(p).isDirectory()) {
      ficherosTs(p, out)
      continue
    }
    if (!nombre.endsWith('.ts') && !nombre.endsWith('.tsx')) continue
    if (nombre.includes('.test.') || nombre === 'schema.ts') continue
    out.push(p)
  }
  return out
}

/** Las columnas numéricas con defecto de un `schema.ts`, por su nombre de campo. */
function columnasConDefecto(schema: string): string[] {
  return [...schema.matchAll(COLUMNA_CON_DEFECTO)].map((m) => m[1]!)
}

/** La regla de siempre: alguna línea con `campo:` que no sea `campo: x.campo` ni un tipo. */
function escritaEnAlgunaLínea(campo: string, líneas: readonly string[]): boolean {
  return líneas.some((t) => {
    // Propiedad abreviada dentro de un objeto: `facilities,` sí escribe.
    if (new RegExp(`^${campo},$`).test(t)) return true
    if (!new RegExp(`\\b${campo}\\s*:`).test(t)) return false
    // Referirse a la COLUMNA de drizzle no es escribirla: `fame: riders.fame`.
    if (new RegExp(`\\b${campo}\\s*:\\s*\\w+\\.${campo}\\b`).test(t)) return false
    // Ni declarar un tipo: `fame: number` en una interfaz no escribe nada.
    if (new RegExp(`\\b${campo}\\s*:\\s*(number|string|boolean)\\b`).test(t)) return false
    return true
  })
}

/** El texto entre los paréntesis de cada `.set(` y cada `.values(` de un fichero, equilibrados. */
function argumentosDeEscritura(fuente: string): string[] {
  const out: string[] = []
  for (const m of fuente.matchAll(/\.(?:set|values)\(/g)) {
    const desde = m.index + m[0].length
    let nivel = 1
    let i = desde
    for (; i < fuente.length && nivel > 0; i++) {
      if (fuente[i] === '(') nivel++
      else if (fuente[i] === ')') nivel--
    }
    out.push(fuente.slice(desde, i - 1))
  }
  return out
}

/** La segunda regla: el campo como clave (o abreviatura) del objeto de un `.set(` o un `.values(`. */
function escritaPorDrizzle(campo: string, fuentes: readonly string[]): boolean {
  const clave = new RegExp(`[{,]\\s*${campo}\\s*[:,}]`)
  return fuentes.some((f) => argumentosDeEscritura(f).some((a) => clave.test(a)))
}

/** Las columnas con defecto de `schema` que nadie escribe en `fuentes` (el texto de cada fichero). */
function columnasMuertas(schema: string, fuentes: readonly string[]): string[] {
  const líneas = fuentes.flatMap((f) => f.split('\n').map((l) => l.trim()))
  return [...new Set(columnasConDefecto(schema))].filter((campo) =>
    ESCRITURA_DRIZZLE.includes(campo)
      ? !escritaPorDrizzle(campo, fuentes)
      : !escritaEnAlgunaLínea(campo, líneas),
  )
}

describe('db: ninguna columna nace con un número y se queda ahí', () => {
  it('toda columna numérica con valor por defecto se escribe en alguna parte', () => {
    const schema = readFileSync(join(aquí, 'schema.ts'), 'utf8')
    const columnas = columnasConDefecto(schema)
    // Si esto se queda a cero, el escáner ha dejado de encontrar columnas y la prueba no vigila nada.
    expect(`columnas encontradas: ${columnas.length > 10}`).toBe('columnas encontradas: true')
    // La ampliación de 13-a: dos espacios de sangría y `smallint`.
    expect(columnas).toContain('repairVersion')
    // Y desde la 0049 (paso 8a) vigila `stage_team_results.prize`, que solo cuenta como escrita por el
    // `.set({ prize: … })` de `creditTeam` (`economy.ts`), en el mismo PR que la migración (§13.7).
    expect(columnas).toContain('prize')

    const raíz = join(aquí, '..', '..', '..')
    const fuentes = [
      ...ficherosTs(join(raíz, 'packages', 'db', 'src')),
      ...ficherosTs(join(raíz, 'apps', 'api', 'src')),
    ].map((f) => readFileSync(f, 'utf8'))
    const muertas = columnasMuertas(schema, fuentes)

    const inesperadas = muertas.filter((c) => MUERTAS_CONOCIDAS[c] === undefined)
    expect(`columnas muertas nuevas: ${inesperadas.join(', ') || 'ninguna'}`).toBe(
      'columnas muertas nuevas: ninguna',
    )

    // …y al revés: si una conocida ya se alimenta, que se quite de la lista y de aquí.
    const resucitadas = Object.keys(MUERTAS_CONOCIDAS).filter((c) => !muertas.includes(c))
    expect(`conocidas que ya se escriben: ${resucitadas.join(', ') || 'ninguna'}`).toBe(
      'conocidas que ya se escriben: ninguna',
    )
  })

  /**
   * LAS CUATRO DE E2 CON SOLO SUS DECLARACIONES SALEN MUERTAS (docs/retransmision.md §13.7). Un
   * `schema.ts` con las cuatro columnas tal como las escriben la 0048 y la 0049, y un `horizon.ts` y
   * un `watch.ts` de mentira que solo declaran lo que §4.10 y §10.3 declaran con esos nombres: con la
   * regla de siempre tres de las cuatro saldrían escritas sin que nadie las escriba; con la segunda,
   * las cuatro salen muertas hasta que llega su `.set({ … })`.
   */
  it('las cuatro columnas de E2 solo cuentan como escritas en un .set( o un .values(', () => {
    const schema = [
      "export const users = pgTable('users', {",
      "  id: text('id').primaryKey(),",
      "  horizonRev: integer('horizon_rev').notNull().default(0),",
      '})',
      'export const raceWatch = pgTable(',
      "  'race_watch',",
      '  {',
      "    follow: smallint('follow').notNull().default(0),",
      "    knownThrough: smallint('known_through').notNull().default(0),",
      '  },',
      ')',
      'export const stageTeamResults = pgTable(',
      "  'stage_team_results',",
      '  {',
      "    prize: integer('prize').notNull().default(0),",
      '  },',
      ')',
    ].join('\n')
    const horizon = [
      'export interface Horizon {',
      '  readonly knownThrough: ReadonlyMap<string, number>',
      '}',
      'export const worldHorizon: Horizon = {',
      '  knownThrough: new Map(),',
      '}',
    ].join('\n')
    const watch = [
      'export interface WatchRow {',
      '  follow: -1 | 0 | 1',
      '  knownThrough: number',
      '}',
      'export async function setFollow(db: Database, follow: -1 | 0 | 1): Promise<void> {',
      '  await db.select({ prize: stageTeamResults.prize, tiempo: sql<number>`0` }).from(stageTeamResults)',
      '}',
      'export function recordProgress(rev: number): { horizonRev: number } {',
      '  return {',
      '    horizonRev: rev + 1,',
      '  }',
      '}',
    ].join('\n')
    const cuatro = ['follow', 'horizonRev', 'knownThrough', 'prize']

    expect(columnasConDefecto(schema).sort()).toEqual(cuatro)
    expect(columnasMuertas(schema, [horizon, watch]).sort()).toEqual(cuatro)
    // Con la regla de siempre, las tres de la 0048 se daban por escritas sin escritor.
    const líneas = [horizon, watch].flatMap((f) => f.split('\n').map((l) => l.trim()))
    expect(cuatro.filter((c) => escritaEnAlgunaLínea(c, líneas))).toEqual([
      'follow',
      'horizonRev',
      'knownThrough',
    ])

    // Y con sus escritores (§10.3 y §13.5), vivas.
    const escritores = [
      'export async function setFollow(db: Database, f: -1 | 0 | 1, through: number) {',
      '  await db.update(raceWatch).set({ follow: f, knownThrough: through })',
      '  await db',
      '    .update(users)',
      '    .set({',
      '      horizonRev: sql`${users.horizonRev} + 1`,',
      '    })',
      '}',
      'async function creditTeam(tx: Tx, amount: number) {',
      '  await tx.update(stageTeamResults).set({ prize: sql`${stageTeamResults.prize} + ${amount}` })',
      '}',
    ].join('\n')
    expect(columnasMuertas(schema, [horizon, watch, escritores])).toEqual([])
  })
})
