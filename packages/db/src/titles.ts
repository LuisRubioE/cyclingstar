import type { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'

/**
 * LOS TÍTULOS DE CAMPEÓN (docs/retransmision.md §7.4). Nace en el paso 1a de E2 solo con `Queryable`,
 * que las lecturas de clasificación de `results.ts` y las noticias usan desde entonces (§12.8, 17-z);
 * el paso 5 lo completa con `ChampionTitleSource` y `palmaresTitleSource`.
 */

type Db = ReturnType<typeof drizzle>
/**
 * La transacción del tick, el mismo alias que `stageRun.ts`. El diseño la escribía sobre
 * `Database['transaction']`, la del esquema tipado, y la del tick no le es asignable (su `query` no
 * conoce las tablas); ésta acepta las dos, porque la del esquema tipado sí le es asignable a ésta.
 */
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Lo que puede leer y escribir: la base de las rutas o la transacción del día del tick. */
export type Queryable = Database | Tx
