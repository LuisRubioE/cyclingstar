import type { StageProfile } from '@cyclingstar/engine'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { raceRoutes } from './schema.js'

/**
 * La base o una transacción: estas tres funciones se llaman DENTRO de la transacción del tick, y
 * `Database` a secas no admite una transacción con `exactOptionalPropertyTypes`. Es el mismo alias
 * que `calendarRun.ts` y `stageRun.ts` definen para lo mismo.
 */
type Db = ReturnType<typeof drizzle>
type Conn = Database | Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * EL RECORRIDO ES DEL MUNDO, NO DEL CÓDIGO (docs/tactica.md paso 1a).
 *
 * Hasta aquí el perfil de cada etapa salía de `SEASON_CALENDAR` **en el momento de correrla**. Eso
 * funcionaba mientras el generador de recorridos no cambiara nunca, y el paso 1b lo cambia entero.
 * La consecuencia, que nadie había escrito: las carreras YA CORRIDAS cambiarían de recorrido
 * retroactivamente —la crónica de hace tres temporadas hablaría de un puerto que ya no está— y
 * `checkReplay` dejaría de reproducir sus snapshots sin que nadie hubiera tocado un snapshot.
 *
 * Con el recorrido congelado el día que la carrera se crea, tocar el generador cambia las carreras
 * FUTURAS. Que es lo que tiene que pasar.
 */

export type RouteSource = 'real' | 'generado'

/**
 * Congela el recorrido de una carrera. **Idempotente**: si ya está escrito no se toca, porque
 * reescribirlo sería justamente el defecto que esta tabla existe para impedir.
 */
export async function freezeRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
): Promise<void> {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race) return
  const filas = race.stages.map((stage, i) => ({
    worldId,
    raceKey,
    stageDay: i + 1,
    profile: stage.profile as StageProfile,
    // El calendario no declara todavía de dónde viene cada recorrido: `routeSource` nace en el 1b
    // con el campo que lo dice. Hasta entonces todo entra como `generado`, que es lo honesto —hay
    // seis carreras con datos reales y no hay forma de distinguirlas sin el campo—.
    routeSource: 'generado' as const,
  }))
  if (filas.length === 0) return
  await db.insert(raceRoutes).values(filas).onConflictDoNothing()
}

/**
 * El recorrido de una etapa. `null` si la carrera se creó antes de que esta tabla existiera: el
 * llamante cae entonces al calendario, que es exactamente lo que hacía antes.
 */
export async function getRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  stageDay: number,
): Promise<StageProfile | null> {
  const filas = await db
    .select({ profile: raceRoutes.profile })
    .from(raceRoutes)
    .where(
      and(
        eq(raceRoutes.worldId, worldId),
        eq(raceRoutes.raceKey, raceKey),
        eq(raceRoutes.stageDay, stageDay),
      ),
    )
    .limit(1)
  return filas[0]?.profile ?? null
}

/**
 * BACKFILL: congela el recorrido de todas las carreras de un mundo con el generador de HOY.
 *
 * Es la mitad que hace posible desplegar esto sin romper nada. Un mundo en marcha tiene carreras
 * creadas y a medio correr; sin backfill, esas carreras leerían `null` y caerían al calendario, y
 * el día que el 1b cambie el generador se les movería el recorrido a mitad de vuelta.
 *
 * Se corre con el generador ACTUAL a propósito: lo que se congela es el recorrido que esas carreras
 * ya tienen, no uno nuevo.
 */
export async function backfillRaceRoutes(
  db: Conn,
  worldId: string,
  raceKeys: readonly string[],
): Promise<number> {
  let escritas = 0
  for (const raceKey of raceKeys) {
    const raceId = raceKey.split(':')[0]
    if (raceId === undefined) continue
    const antes = await db
      .select({ stageDay: raceRoutes.stageDay })
      .from(raceRoutes)
      .where(and(eq(raceRoutes.worldId, worldId), eq(raceRoutes.raceKey, raceKey)))
    if (antes.length > 0) continue
    await freezeRaceRoute(db, worldId, raceKey, raceId)
    escritas += 1
  }
  return escritas
}
