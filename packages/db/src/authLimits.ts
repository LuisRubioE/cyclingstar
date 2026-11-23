import { eq, inArray, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { authLimits, users } from './schema.js'

/**
 * LOS LÍMITES DE INTENTO, EN POSTGRES (docs/cuenta.md §7.3; D-22; H-01; O-14). Sobreviven al despliegue,
 * no dependen de las réplicas de `web` y ven la cuenta. Se reserva ANTES de comprobar la contraseña: el
 * juez de código midió una ráfaga de 40 a la vez con un límite de 10, y contando después pasaban 39;
 * reservando antes, 10 pasan y 30 dan 429.
 */
export interface AttemptRule {
  /** Ventana corta, en segundos, y su máximo. */
  windowS: number
  max: number
  /** Máximo en 24 horas, o null si no hay. */
  dayMax: number | null
  /** Cuánto queda cerrado al pasarse, en segundos (como poco; ver `reserveAttempt`). */
  lockS: number
}

export type AttemptResult =
  | { allowed: true; count: number; dayCount: number }
  | { allowed: false; retryAfterS: number; byDay: boolean }

/**
 * Suma un intento a `key` salvo que esté cerrada, y lo niega si con él se pasa de la regla. Un intento
 * negado no suma (7-d): mientras la clave está cerrada, el `CASE` deja los contadores como estaban.
 *
 * El cierre dura `lockS` desde ahora o, si es más tarde, hasta que acaba la ventana que se pasó: así la
 * espera que se dice (`retryAfterS`) es la de verdad también cuando la ventana es más larga que el cierre
 * (L4, 20 al día; el tope diario de L2 y L3). Con L1 (10 en 900 s, cierre de 900 s) es lo mismo que
 * `now + lockS`.
 */
export async function reserveAttempt(
  db: Database,
  key: string,
  rule: AttemptRule,
  now: Date,
): Promise<AttemptResult> {
  const ahora = now.toISOString()
  const filas = await db.execute<{
    count: number
    day_count: number
    window_end_ms: number
    day_end_ms: number
    locked_ms: number | null
  }>(sql`
    INSERT INTO auth_limits AS a (key, window_start, count, day_start, day_count, locked_until)
    VALUES (${key}, ${ahora}::timestamptz, 1, ${ahora}::timestamptz, 1, NULL)
    ON CONFLICT (key) DO UPDATE SET
      window_start = CASE WHEN a.locked_until > ${ahora}::timestamptz THEN a.window_start
                          WHEN a.window_start <= ${ahora}::timestamptz - make_interval(secs => ${rule.windowS}) THEN ${ahora}::timestamptz
                          ELSE a.window_start END,
      count        = CASE WHEN a.locked_until > ${ahora}::timestamptz THEN a.count
                          WHEN a.window_start <= ${ahora}::timestamptz - make_interval(secs => ${rule.windowS}) THEN 1
                          ELSE a.count + 1 END,
      day_start    = CASE WHEN a.locked_until > ${ahora}::timestamptz THEN a.day_start
                          WHEN a.day_start <= ${ahora}::timestamptz - interval '1 day' THEN ${ahora}::timestamptz
                          ELSE a.day_start END,
      day_count    = CASE WHEN a.locked_until > ${ahora}::timestamptz THEN a.day_count
                          WHEN a.day_start <= ${ahora}::timestamptz - interval '1 day' THEN 1
                          ELSE a.day_count + 1 END
    RETURNING count, day_count,
      (extract(epoch from window_start + make_interval(secs => ${rule.windowS})) * 1000)::float8 AS window_end_ms,
      (extract(epoch from day_start + interval '1 day') * 1000)::float8 AS day_end_ms,
      (extract(epoch from locked_until) * 1000)::float8 AS locked_ms
  `)
  const fila = [...filas][0]
  if (fila === undefined) throw new Error('reserveAttempt: sin fila')
  const t = now.getTime()
  const espera = (hasta: number): number => Math.max(1, Math.ceil((hasta - t) / 1000))
  const lockedMs = fila.locked_ms === null ? null : Number(fila.locked_ms)
  if (lockedMs !== null && lockedMs > t) {
    return { allowed: false, retryAfterS: espera(lockedMs), byDay: false }
  }
  const count = Number(fila.count)
  const dayCount = Number(fila.day_count)
  const porVentana = count > rule.max
  const porDia = rule.dayMax !== null && dayCount > rule.dayMax
  if (!porVentana && !porDia) return { allowed: true, count, dayCount }

  let hasta = t + rule.lockS * 1000
  if (porVentana) hasta = Math.max(hasta, Number(fila.window_end_ms))
  if (porDia) hasta = Math.max(hasta, Number(fila.day_end_ms))
  await db.execute(sql`
    UPDATE auth_limits SET locked_until = ${new Date(hasta).toISOString()}::timestamptz
    WHERE key = ${key} AND (locked_until IS NULL OR locked_until <= ${ahora}::timestamptz)
  `)
  return { allowed: false, retryAfterS: espera(hasta), byDay: porDia }
}

/** Borra los contadores de esas claves (al 200, al recuperar). */
export async function clearAttempts(db: Database, keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return
  await db.delete(authLimits).where(inArray(authLimits.key, [...keys]))
}

/** La cuenta que tiene ese correo y su `device_epoch`, lo que firma `cs_device` (§7.5; 7-l). */
export async function deviceOwnerByEmail(
  db: Database,
  email: string,
): Promise<{ id: string; email: string; deviceEpoch: number } | null> {
  const [fila] = await db
    .select({ id: users.id, email: users.email, deviceEpoch: users.deviceEpoch })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)
  return fila ?? null
}

/**
 * Sube `device_epoch`: todas las `cs_device` de esa cuenta dejan de valer (§5.4; 5-j). Devuelve el nuevo,
 * o null si la cuenta ya no existe.
 */
export async function bumpDeviceEpoch(db: Database, userId: string): Promise<number | null> {
  const [fila] = await db
    .update(users)
    .set({ deviceEpoch: sql`${users.deviceEpoch} + 1` })
    .where(eq(users.id, userId))
    .returning({ deviceEpoch: users.deviceEpoch })
  return fila?.deviceEpoch ?? null
}
