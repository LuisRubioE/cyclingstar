import {
  type Database,
  type Horizon,
  type WorldRef,
  stageGameDay,
  titlesSeenOn,
} from '@cyclingstar/db'
import {
  type ChampionTitle,
  type WornInput,
  highestTitle,
  wearableTitles,
} from '@cyclingstar/shared'

/**
 * EL MAILLOT DE CAMPEÓN EN LAS TABLAS Y EN LA FICHA (E3, docs/visual.md §8.5 y §6.1; 4-l, PR 17a). La
 * ficha de carrera y la de la etapa llevan, una vez por respuesta y junto a sus `leaders`, el título que
 * lleva cada corredor de sus tablas el día de la tabla (`champions`); la ficha del corredor, su título
 * vigente de mayor alcance (`champion`). Los dos salen de `titlesSeenOn`, sin los títulos de un
 * campeonato velado para quien mira (B13).
 */

/** El día de una tabla: la etapa que enseña, si es crono y la categoría de la carrera. */
export interface TableDay {
  readonly raceKey: string
  readonly stageDay: number
  readonly timeTrial: boolean
  /** la de la carrera, `championshipCategory ?? 'elite'` */
  readonly category: 'elite' | 'u23'
}

/**
 * LOS CAMPEONES DE UNA TABLA (`championsSchema`): el título que lleva el día de la etapa `day` cada
 * corredor de `riderIds` que tenga uno, con las entradas del reparto grabado (`buildTimelineCast`,
 * cast.ts): los títulos vigentes el día de juego de la etapa (`stageGameDay`), la disciplina de la etapa,
 * la categoría de la carrera y la regla de `wearableTitles`. Sin corredores, sin consulta.
 */
export async function tableChampions(
  db: Database,
  h: Horizon,
  worldId: string,
  day: TableDay,
  riderIds: Iterable<string>,
): Promise<Record<string, ChampionTitle>> {
  const ids = new Set(riderIds)
  if (ids.size === 0) return {}
  const input: Pick<WornInput, 'titles' | 'discipline' | 'category'> = {
    titles: await titlesSeenOn(db, h, worldId, stageGameDay(day.raceKey, day.stageDay)),
    discipline: day.timeTrial ? 'itt' : 'road',
    category: day.category,
  }
  const out: Record<string, ChampionTitle> = {}
  for (const riderId of ids) {
    const title = wearableTitles(input, riderId)[0]
    if (title !== undefined) out[riderId] = title
  }
  return out
}

/**
 * EL TÍTULO DE LA FICHA (`publicRiderDetailSchema.champion`): de los vigentes hoy, el día de juego del
 * mundo, el de mayor alcance (`highestTitle`); null sin ninguno.
 */
export async function riderChampion(
  db: Database,
  h: Horizon,
  world: WorldRef,
  riderId: string,
): Promise<ChampionTitle | null> {
  const titles = await titlesSeenOn(db, h, world.worldId, world.currentDay)
  return highestTitle(titles.get(riderId) ?? [])
}
