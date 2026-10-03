import { type ChampionTitle, DAYS_PER_SEASON } from '@cyclingstar/shared'
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { palmares } from './schema.js'

/**
 * LOS TÍTULOS DE CAMPEÓN (docs/retransmision.md §7.4). Nace en el paso 1a de E2 solo con `Queryable`,
 * que las lecturas de clasificación de `results.ts` y las noticias usan desde entonces (§12.8, 17-z);
 * el paso 5 lo completa con `ChampionTitleSource`, la interfaz que E2 deja a E12 (§7.9), y
 * `palmaresTitleSource`, el proveedor provisional que deriva los campeones nacionales de `palmares`.
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

/**
 * DE DÓNDE SALEN LOS CAMPEONES (D-25, §7.9): los títulos VIGENTES el día de juego absoluto `gameDay`,
 * por `riderId`, con `validFromDay < gameDay ≤ validToDay` (7-c). La cota inferior estricta deja al tick
 * pedirlos UNA vez por día y pasarlos a todas sus etapas, se corran en el orden que se corran. Recibe
 * primero el manejador de base, porque el tick la llama dentro de su transacción (7-k); E12 implementa
 * la misma firma con su tabla de títulos.
 */
export interface ChampionTitleSource {
  titlesOn(
    q: Queryable,
    worldId: string,
    gameDay: number,
  ): Promise<ReadonlyMap<string, readonly ChampionTitle[]>>
}

/**
 * La misma expresión que el SQL de abajo, y nunca `LIKE 'nc-%-road'`, que casa con `nc-it-u23-road`:
 * el país en minúsculas, la categoría sub-23 opcional y la disciplina.
 */
const NC = /^nc-([a-z]{2})-(u23-)?(road|itt)$/

/**
 * EL PROVEEDOR PROVISIONAL (D-25): el ganador de la última edición de cada campeonato nacional, que
 * `stageRun.ts` apunta en `palmares` con `kind = 'gc'`, el id de la carrera sin temporada y el día de
 * juego de su única etapa. Un título vale un año: la fecha de un nacional no depende de la temporada,
 * así que la edición siguiente cae exactamente `DAYS_PER_SEASON` días después; si no deja ganador, el
 * título caduca. Sin Mundial ni continentales, que no existen en el calendario: `scope` es siempre
 * `national` y `provisional` verdadero hasta E12. Un mundo reiniciado no tiene campeones hasta que se
 * corren sus nacionales (§7.4). Una consulta por día, que sirve `palmares_race_idx (world_id, race_id)`.
 */
export const palmaresTitleSource: ChampionTitleSource = {
  async titlesOn(q, worldId, gameDay) {
    const rows = await q
      .selectDistinctOn([palmares.raceId], {
        raceId: palmares.raceId,
        riderId: palmares.riderId,
        season: palmares.season,
        gameDay: palmares.gameDay,
      })
      .from(palmares)
      .where(
        and(
          eq(palmares.worldId, worldId),
          eq(palmares.kind, 'gc'),
          sql`(${palmares.raceId} ~ '^nc-[a-z]{2}-(road|itt)$' or ${palmares.raceId} ~ '^nc-[a-z]{2}-u23-(road|itt)$')`,
          // ganado ANTES de hoy…
          lt(palmares.gameDay, gameDay),
          // …y no caducado: un año
          gte(sql`${palmares.gameDay} + ${DAYS_PER_SEASON}`, gameDay),
        ),
      )
      .orderBy(palmares.raceId, desc(palmares.gameDay))
    const out = new Map<string, ChampionTitle[]>()
    for (const r of rows) {
      const m = NC.exec(r.raceId)
      if (m === null) continue
      const title: ChampionTitle = {
        scope: 'national',
        country: m[1]!.toUpperCase(),
        discipline: m[3] === 'itt' ? 'itt' : 'road',
        category: m[2] !== undefined ? 'u23' : 'elite',
        season: r.season,
        validFromDay: r.gameDay,
        validToDay: r.gameDay + DAYS_PER_SEASON,
        // La etapa única del campeonato: si está velada para el espectador, el título no viaja (B13).
        source: { raceKey: `${r.raceId}:s${r.season}`, stageDay: 1 },
        provisional: true,
      }
      out.set(r.riderId, [...(out.get(r.riderId) ?? []), title])
    }
    return out
  },
}
