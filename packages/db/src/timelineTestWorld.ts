/**
 * UN MUNDO PEQUEÑO PARA GRABAR ETAPAS EN LOS TESTS (E2, docs/retransmision.md §17.8; paso 5): lo
 * comparten `timelines.test.ts`, `cast.test.ts`, `stageRun.test.ts` y `calendarRun.test.ts`, que corren
 * etapas con `runOneStage` y la grabación encendida sobre PGlite. No es código de producción: nadie lo
 * exporta por el índice, como `timelineCollectorBench.ts` del 4b.
 *
 * Los ids son fijos y crecientes con el dorsal (la forma de `idDe` de `stageRun.test.ts`): el motor
 * desempata por id, así que con uuid sorteados la misma semilla podía contar otra carrera.
 */
import type { TourStage } from '@cyclingstar/engine'
import { ATTRIBUTES } from '@cyclingstar/shared'
import { raceRosters, riderAttrs, riderHidden, riders, teams, worlds } from './schema.js'
import type { StageRunSpec } from './stageRun.js'
import type { TestDb } from './testDb.js'

/** Un id de corredor fijo: el dorsal i + 1 lleva el `idDe(i + 1)`. */
export const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
/** Un id de equipo fijo, del 1001 en adelante, como los fixtures (`scripts/broadcast-fixtures.mjs`). */
export const teamIdDe = (k: number): string => idDe(1001 + k)

export interface TestWorld {
  readonly worldId: string
  readonly worldSeed: string
  readonly teamIds: readonly string[]
  /** por dorsal: el de dorsal 1 primero */
  readonly riderIds: readonly string[]
}

/**
 * Un mundo con `teams` equipos de `perTeam` corredores (del país `country`), con atributos distintos
 * por corredor para que la carrera tenga jerarquía y techos altos para que el aprendizaje escriba. Los
 * dorsales van por equipo: los del equipo k son del 10·(k+1)+1 en adelante, como el banco.
 */
export async function seedTestWorld(
  t: TestDb,
  opts: {
    worldSeed: string
    teams?: number
    perTeam?: number
    country?: string
    /** lo que cambia del corredor i (desde 0): la edad o los puntos de temporada, o sin equipo */
    rider?: (i: number) => {
      readonly birthSeason?: number
      readonly seasonPoints?: number
      readonly withoutTeam?: boolean
    }
  },
): Promise<TestWorld> {
  const nTeams = opts.teams ?? 4
  const perTeam = opts.perTeam ?? 10
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: opts.worldSeed, engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = world!.id
  const teamIds = Array.from({ length: nTeams }, (_, k) => teamIdDe(k))
  await t.db.insert(teams).values(
    teamIds.map((id, k) => ({
      id,
      worldId,
      name: `Equipo ${k + 1}`,
      division: 'WT' as const,
      philosophy: 'general' as const,
      jerseySeed: `equipacion-${k + 1}`,
      country: opts.country ?? 'ES',
    })),
  )
  const n = nTeams * perTeam
  const riderIds = Array.from({ length: n }, (_, i) => idDe(i + 1))
  await t.db.insert(riders).values(
    riderIds.map((id, i) => {
      const o = opts.rider?.(i) ?? {}
      return {
        id,
        worldId,
        teamId: o.withoutTeam === true ? null : teamIds[Math.floor(i / perTeam)]!,
        name: `Corredor ${i + 1}`,
        country: opts.country ?? 'ES',
        gender: 'M' as const,
        birthSeason: o.birthSeason ?? -25,
        archetype: 'fondo' as const,
        faceSeed: `cara-${i + 1}`,
        ctl: 60,
        atl: 40,
        seasonPoints: o.seasonPoints ?? 0,
      }
    }),
  )
  await t.db
    .insert(riderAttrs)
    .values(
      riderIds.flatMap((id, i) =>
        ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 + (i % 20) })),
      ),
    )
  await t.db.insert(riderHidden).values(
    riderIds.map((id) => ({
      riderId: id,
      talent: 1,
      ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])),
      fragility: 0.1,
      peakAge: 28,
      declineAge: 33,
    })),
  )
  return { worldId, worldSeed: opts.worldSeed, teamIds, riderIds }
}

/** Inscribe a todos los corredores del mundo en `raceKey`, con su dorsal (el orden de entrada al motor). */
export async function enrollAll(t: TestDb, w: TestWorld, raceKey: string): Promise<void> {
  await t.db
    .insert(raceRosters)
    .values(w.riderIds.map((riderId, i) => ({ raceId: raceKey, riderId, bib: i + 1 })))
    .onConflictDoNothing()
}

/** El `StageRunSpec` de la etapa `stageDay` de una vuelta de prueba (`race-<algo>:s0`) con una etapa de `TEST_TOUR`. */
export function stageSpecOf(
  raceKey: string,
  stageDay: number,
  stage: TourStage,
  isFinal: boolean,
): StageRunSpec {
  return {
    raceKey,
    raceId: raceKey.split(':')[0]!,
    raceName: 'Carrera de pruebas',
    level: 'WT',
    raceClass: 'WT',
    season: 0,
    stageDay,
    kind: stage.kind,
    profile: stage.profile,
    timeTrial: stage.timeTrial === true,
    isFinal,
  }
}
