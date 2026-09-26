import type { CalendarStage, GeneratedStage, StageKind, StageProfile } from '@cyclingstar/engine'
import { RACE_EDITIONS, hashInt, raceForSeason, stagesForSeason } from '@cyclingstar/engine'
import { and, asc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { raceRoutes } from './schema.js'

/**
 * La base o una transacción: estas funciones se llaman DENTRO de la transacción del tick, y
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
 *
 * Desde la v87 cada temporada tiene su edición (docs/generador.md sección 10): lo que se congela es
 * la edición de la temporada de la `raceKey`, y con el perfil viaja lo que la ficha dice de él.
 */

/**
 * De dónde sale el recorrido de una etapa, copiado del calendario (`StageSpec.routeSource`, v87):
 * rasgos reales, edición real sin rasgos (ciudades y km reales, relieve de la gramática) o inventado.
 * La columna es `text`, así que el tercer valor no pide migración (docs/generador.md §3.11). Es una
 * unión propia y no la del motor para que la base no cambie de vocabulario sin que se note: el
 * `satisfies` de `freezeRaceRoute` las compara.
 */
export type RouteSource = 'real' | 'edicion' | 'generado'

/**
 * UNA ETAPA TAL COMO LA TIENE EL MUNDO (docs/generador.md §3.11 y §10.7): el perfil congelado y lo
 * que la ficha dice de él. `arch` es `null` en las etapas `real` y en las filas congeladas antes de
 * que existiera la columna.
 */
export interface FrozenStage {
  stageDay: number
  profile: StageProfile
  kind: StageKind
  label: string
  timeTrial: boolean
  routeSource: RouteSource
  arch: GeneratedStage['arch'] | null
}

/**
 * La temporada del sufijo `:s{n}` de una `raceKey` (`${raceId}:s${season}`, `calendarRun.ts`); 0
 * si no lo lleva. Es la única fuente de temporada de un backfill, que solo recibe claves.
 */
export function seasonOfRaceKey(raceKey: string): number {
  const m = /:s(\d+)$/.exec(raceKey)
  return m ? Number(m[1]) : 0
}

/**
 * JSON con las claves ordenadas. JSONB de Postgres normaliza el orden de las claves (`{g, km}`
 * vuelve como `{km, g}`), así que dos perfiles iguales solo se comparan bien en esta forma; el orden
 * de los ARRAYS sí se conserva, y es el que el motor lee.
 */
export function canonico(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonico).join(',')}]`
  if (x !== null && typeof x === 'object') {
    const e = Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1))
    return `{${e.map(([k, v]) => `${JSON.stringify(k)}:${canonico(v)}`).join(',')}}`
  }
  return JSON.stringify(x)
}

/** La huella de un perfil en forma canónica: la que compara `reclassifyRouteSource`. */
export const huellaCanonica = (p: StageProfile): number => hashInt(canonico(p.segments))

/** Una etapa del calendario de una temporada, vista como si estuviera congelada. */
function comoCongelada(stage: CalendarStage, stageDay: number): FrozenStage {
  return {
    stageDay,
    profile: stage.profile,
    kind: stage.kind,
    label: stage.label,
    timeTrial: stage.timeTrial ?? false,
    routeSource: stage.routeSource,
    arch: stage.arch ?? null,
  }
}

/**
 * Congela el recorrido de una carrera EN LA TEMPORADA QUE TOCA. **Idempotente**: si ya está escrito
 * no se toca, porque reescribirlo sería justamente el defecto que esta tabla existe para impedir.
 *
 * El recorrido sale de `stagesForSeason(raceId, season)` y nunca de `SEASON_CALENDAR` (decisión 23):
 * desde la v87 cada temporada tiene su edición, y congelar la 0 en un mundo de la temporada 3 sería
 * correr el mismo recorrido cada año. Con el perfil viajan `kind`, `label`, `time_trial`, el origen
 * y la ficha del generador (`arch`), para que lo que la pantalla cuenta de la etapa sea lo que se
 * corrió aunque el generador cambie después. Un `raceId` que no está en el calendario lanza
 * (`raceForSeason`): una `raceKey` huérfana es un error de datos, no un caso.
 */
export async function freezeRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<void> {
  const race = raceForSeason(raceId, season)
  const filas = race.stages.map((stage, i) => ({
    worldId,
    raceKey,
    stageDay: i + 1,
    profile: stage.profile,
    routeSource: stage.routeSource satisfies RouteSource,
    kind: stage.kind,
    label: stage.label,
    timeTrial: stage.timeTrial ?? false,
    arch: stage.arch ?? null,
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
 * LAS ETAPAS DE UNA CARRERA TAL COMO LAS TIENE EL MUNDO (decisión 23; docs/generador.md §10.7).
 *
 * Las filas congeladas, ordenadas por `stage_day`. Si la carrera aún no se ha congelado (se congela
 * el día de su etapa 1, y la convocatoria y la web la leen antes), las de
 * `stagesForSeason(raceId, season)`: ese fallback no es un resto de compatibilidad, es lo que
 * garantiza que se convoca para el recorrido que luego se corre, porque `stagesForSeason` es puro y
 * `freezeRaceRoute` congela esa misma temporada. Una fila congelada antes de las columnas `kind`,
 * `label` y `time_trial` las completa desde la misma temporada; su `arch` se queda en `null`.
 */
export async function raceStagesForWorld(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<FrozenStage[]> {
  const filas = await db
    .select()
    .from(raceRoutes)
    .where(and(eq(raceRoutes.worldId, worldId), eq(raceRoutes.raceKey, raceKey)))
    .orderBy(asc(raceRoutes.stageDay))
  if (filas.length === 0)
    return stagesForSeason(raceId, season).map((st, i) => comoCongelada(st, i + 1))
  let calendario: CalendarStage[] | null = null
  const delCalendario = (stageDay: number): CalendarStage | undefined => {
    calendario ??= stagesForSeason(raceId, season)
    return calendario[stageDay - 1]
  }
  return filas.map((f) => {
    const hueco = f.kind === null || f.label === null || f.timeTrial === null
    const st = hueco ? delCalendario(f.stageDay) : undefined
    return {
      stageDay: f.stageDay,
      profile: f.profile,
      kind: f.kind ?? st?.kind ?? 'llana',
      label: f.label ?? st?.label ?? '',
      timeTrial: f.timeTrial ?? st?.timeTrial ?? false,
      routeSource: f.routeSource as RouteSource,
      arch: f.arch ?? null,
    }
  })
}

/**
 * BACKFILL: congela el recorrido de las carreras que se le pasen, cada una en la temporada de su
 * `raceKey`.
 *
 * Es la mitad que hace posible desplegar la tabla sin romper nada. Un mundo en marcha tiene carreras
 * creadas y a medio correr; sin backfill, esas carreras leerían `null` y caerían al calendario, y el
 * día que cambie el generador se les movería el recorrido a mitad de vuelta. Solo se le pasan las
 * carreras ya empezadas o convocadas (docs/generador.md §15.1 regla 5).
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
    await freezeRaceRoute(db, worldId, raceKey, raceId, seasonOfRaceKey(raceKey))
    escritas += 1
  }
  return escritas
}

/**
 * RECLASIFICA EL ORIGEN de las filas ya congeladas de un mundo (docs/generador.md §11.4), una vez,
 * tras el backfill. Antes de la v87 `freezeRaceRoute` escribía `'generado'` a ciegas, así que un
 * mundo vivo tendría el Tour congelado como generado y la ficha diría «Generated route» debajo de un
 * recorrido real. Solo toca `route_source`:
 *
 * - `real` si la huella canónica del perfil congelado es la de la etapa real del calendario (los
 *   rasgos reales no cambian entre temporadas ni con el generador);
 * - `edicion` si la carrera está en `RACE_EDITIONS` (ciudades y km eran reales también con el
 *   generador viejo);
 * - `generado` en lo demás.
 *
 * `kind`, `label`, `time_trial` y `arch` NO se rellenan hacia atrás: los de hoy describirían el
 * generador nuevo y no el perfil congelado. Idempotente: la segunda pasada no cambia ninguna fila.
 * Devuelve la cuenta por valor, que se anota en `docs/ops.md` el día que se corre.
 */
export async function reclassifyRouteSource(
  db: Conn,
  worldId: string,
): Promise<Record<RouteSource, number>> {
  const cuenta: Record<RouteSource, number> = { real: 0, edicion: 0, generado: 0 }
  const filas = await db.select().from(raceRoutes).where(eq(raceRoutes.worldId, worldId))
  for (const fila of filas) {
    const raceId = fila.raceKey.split(':')[0] ?? ''
    let st: CalendarStage | undefined
    try {
      st = stagesForSeason(raceId, seasonOfRaceKey(fila.raceKey))[fila.stageDay - 1]
    } catch {
      st = undefined // una carrera que ya no está en el calendario no puede ser `real`
    }
    const nuevo: RouteSource =
      st?.routeSource === 'real' && huellaCanonica(fila.profile) === huellaCanonica(st.profile)
        ? 'real'
        : RACE_EDITIONS[raceId]
          ? 'edicion'
          : 'generado'
    cuenta[nuevo] += 1
    if (nuevo !== fila.routeSource)
      await db
        .update(raceRoutes)
        .set({ routeSource: nuevo })
        .where(
          and(
            eq(raceRoutes.worldId, worldId),
            eq(raceRoutes.raceKey, fila.raceKey),
            eq(raceRoutes.stageDay, fila.stageDay),
          ),
        )
  }
  return cuenta
}
