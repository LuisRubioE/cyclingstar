import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { inChunks, valuesList } from './batch.js'

describe('db: ayudantes de escritura en lote', () => {
  it('trocea respetando el orden y sin perder ni repetir filas', async () => {
    const seen: number[][] = []
    await inChunks([1, 2, 3, 4, 5], 2, async (c) => {
      seen.push(c)
    })
    expect(seen).toEqual([[1, 2], [3, 4], [5]])
  })

  it('con la lista vacía no ejecuta nada (no manda un VALUES vacío a Postgres)', async () => {
    let calls = 0
    await inChunks([], 10, async () => {
      calls++
    })
    expect(calls).toBe(0)
  })

  it('solo la primera fila del VALUES lleva los casts de tipo, y todo va parametrizado', () => {
    const query = new PgDialect().sqlToQuery(
      valuesList(
        [
          ['a', 1],
          ['b', 2],
        ],
        ['uuid', 'integer'],
      ),
    )
    // Postgres deduce el tipo de la columna por la PRIMERA fila: los casts van solo ahí.
    expect(query.sql).toBe('(values ($1::uuid, $2::integer), ($3, $4))')
    // Ningún valor se interpola en el texto: todos viajan como parámetros.
    expect(query.params).toEqual(['a', 1, 'b', 2])
  })

  it('un tipo que falte no rompe la consulta (cae a text)', () => {
    const query = new PgDialect().sqlToQuery(valuesList([['x']], []))
    expect(query.sql).toBe('(values ($1::text))')
  })
})
