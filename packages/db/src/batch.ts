import { type SQL, sql } from 'drizzle-orm'

/**
 * Utilidades para escribir en LOTE en vez de fila a fila.
 *
 * Una etapa de gran vuelta tiene 176 corredores y el bucle antiguo hacía un insert/update por
 * corredor (y otro por atributo): ~700-900 idas y vueltas al servidor por etapa, ×21 etapas, todo
 * dentro de la transacción del día. Con `UPDATE ... FROM (VALUES ...)` y los inserts troceados eso
 * baja a un puñado de sentencias, con EXACTAMENTE la misma semántica (los valores se calculan igual
 * en TypeScript; solo cambia cómo se mandan).
 */

/** Un valor que puede ir en una lista VALUES (se manda siempre como parámetro, nunca interpolado). */
export type BatchValue = string | number | boolean | null

/**
 * Tope de filas por sentencia. Postgres admite 65.535 parámetros por consulta; con lotes de 500
 * filas y hasta 8 columnas vamos muy holgados y el plan sigue siendo pequeño.
 */
export const BATCH_ROWS = 500

/** Trocea `rows` y ejecuta `run` con cada lote (en serie, para no abrir consultas en paralelo). */
export async function inChunks<T>(
  rows: readonly T[],
  size: number,
  run: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await run(rows.slice(i, i + size))
  }
}

/**
 * Construye una lista `(VALUES (…), (…))` con los tipos indicados. La PRIMERA fila lleva los casts
 * explícitos (`$1::uuid`) porque Postgres deduce el tipo de toda la columna de ella; el resto van
 * como parámetros pelados. `types` debe tener un tipo por columna.
 */
export function valuesList(rows: readonly BatchValue[][], types: readonly string[]): SQL {
  const rowSql = rows.map(
    (row, i) =>
      sql`(${sql.join(
        row.map((cell, j) =>
          i === 0 ? sql`${cell}::${sql.raw(types[j] ?? 'text')}` : sql`${cell}`,
        ),
        sql`, `,
      )})`,
  )
  return sql`(values ${sql.join(rowSql, sql`, `)})`
}
