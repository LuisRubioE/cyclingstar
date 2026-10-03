import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { LOCK_CLASS, TICK_LOCK_KEY } from './locks.js'

/**
 * Clave del advisory lock de migración, en la CLASE `migration` (ver locks.ts): fija y compartida
 * por todos los servicios (web y tick), de modo que si arrancan a la vez, uno migra y el otro espera.
 * Al ir en su propia clase ya no puede colisionar con la clave del tick ni con el hash de una carrera.
 */
const MIGRATION_LOCK_KEY = 1

/**
 * Cuánto espera como mucho cada sentencia de una migración a que una tabla quede libre, una vez
 * tomado el candado del tick (docs/retransmision.md §13.1, regla 8; 13-k). Pasado ese tiempo la
 * migración falla y se deshace entera, y el servicio la reintenta al arrancar otra vez, en vez de
 * dejar en cola detrás de su `ALTER TABLE` toda lectura de esa tabla.
 */
const MIGRATION_LOCK_TIMEOUT = '10s'

/** Carpeta de migraciones generadas por drizzle-kit (packages/db/drizzle). */
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

/** Las fechas de las migraciones de una carpeta, de su `meta/_journal.json` (el `when` de cada entrada). */
function journalWhens(folder: string): number[] {
  const journal: unknown = JSON.parse(readFileSync(join(folder, 'meta', '_journal.json'), 'utf8'))
  const entries =
    typeof journal === 'object' && journal !== null && 'entries' in journal
      ? journal.entries
      : undefined
  if (!Array.isArray(entries)) throw new Error(`${folder}: _journal.json sin entries`)
  return entries.map((e: unknown) => {
    const when = typeof e === 'object' && e !== null && 'when' in e ? e.when : undefined
    if (typeof when !== 'number') throw new Error(`${folder}: una entrada del journal sin when`)
    return when
  })
}

/**
 * ¿Le queda a esta base alguna migración de `folder` por aplicar? Con la misma comparación que hace el
 * migrador de drizzle-orm 0.45 (`pg-core/dialect.js`, `migrate`): la fila más reciente de
 * `drizzle.__drizzle_migrations` por `created_at` contra el `when` de cada entrada del journal; sin la
 * tabla, o sin filas, están todas pendientes. Solo lee: no crea la tabla como hace el migrador.
 */
export async function hasPendingMigrations(
  client: postgres.Sql,
  folder: string = migrationsFolder,
): Promise<boolean> {
  const whens = journalWhens(folder)
  const [tabla] = await client<{ t: string | null }[]>`
    select to_regclass('drizzle.__drizzle_migrations')::text as t`
  if (tabla?.t == null) return whens.length > 0
  const [ultima] = await client<{ created_at: string | number | null }[]>`
    select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`
  if (ultima === undefined) return whens.length > 0
  const hecha = Number(ultima.created_at)
  return whens.some((when) => hecha < when)
}

/**
 * Aplica las migraciones pendientes al arrancar el servicio, antes de escuchar (SPEC 12).
 * Protegida con un advisory lock a nivel de sesión para que dos procesos no colisionen.
 *
 * …Y NUNCA A LA VEZ QUE UN DÍA DEL TICK (docs/retransmision.md §13.1, regla 8, y §17.1, regla 9;
 * decisiones 13-k y 17-w; E2, paso 1a). Drizzle aplica todas las pendientes en una transacción, y el
 * candado de migración es de otra clase que el del tick: un `ALTER TABLE` que espera a una tabla que
 * el tick tiene tomada deja en cola detrás de él toda lectura de esa tabla, y en `users`, que
 * better-auth lee en cada petición con sesión, eso es la web entera parada lo que quede del día.
 * Por eso, SOLO si hay migraciones pendientes, con la misma sesión y después del candado de
 * migración: toma el del tick, que espera a que acabe la ejecución en curso (y un tick que llegue
 * mientras tanto no hace nada, porque el suyo es `pg_try_advisory_lock`), y fija `lock_timeout`, para
 * que una tabla ocupada por otra cosa haga fallar la migración a los diez segundos en lugar de dejar
 * la cola detrás: el arranque falla y Railway lo reintenta. Sin pendientes, que es cada arranque salvo
 * el de un despliegue que trae una, no toma el candado del tick y no espera a nadie. Los dos procesos
 * toman los candados en el mismo orden, migración y después tick, así que no se bloquean entre sí.
 *
 * `folder` existe para el test del mundo vivo, que migra una copia de `drizzle/` con el journal
 * cortado y después la carpeta entera (§13.10, punto 2; 13-m).
 */
export async function runMigrations(
  databaseUrl: string,
  folder: string = migrationsFolder,
): Promise<void> {
  const client = postgres(databaseUrl, { max: 1 })
  try {
    await client`SELECT pg_advisory_lock(${LOCK_CLASS.migration}, ${MIGRATION_LOCK_KEY})`
    try {
      const pending = await hasPendingMigrations(client, folder)
      if (pending) {
        // Primero el candado (que espera al tick sin plazo) y después el plazo: `lock_timeout` también
        // corta la espera de un advisory lock.
        await client`SELECT pg_advisory_lock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY})`
        await client.unsafe(`SET lock_timeout = '${MIGRATION_LOCK_TIMEOUT}'`)
      }
      try {
        // La extensión citext debe existir antes de aplicar el esquema (users.email es citext).
        await client`CREATE EXTENSION IF NOT EXISTS citext`
        const db = drizzle(client)
        await migrate(db, { migrationsFolder: folder })
      } finally {
        if (pending) {
          await client`RESET lock_timeout`
          await client`SELECT pg_advisory_unlock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY})`
        }
      }
    } finally {
      await client`SELECT pg_advisory_unlock(${LOCK_CLASS.migration}, ${MIGRATION_LOCK_KEY})`
    }
  } finally {
    await client.end({ timeout: 5 })
  }
}
