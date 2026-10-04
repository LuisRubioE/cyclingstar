/**
 * LAS ETAPAS CONGELADAS DE LA RETRANSMISIÓN (docs/retransmision.md §16.2; decisiones 16-a y 17-u).
 *
 * Seis etapas que no dependen de la versión del motor y miden `packages/shared` y la API: cinco en
 * línea y una crono, con la semilla 0 y el campo del banco. Las escribe `scripts/broadcast-fixtures.mjs`
 * desde un mundo de PGlite con ids uuid, en dos veces: la primera mitad en el paso 2 (los sucesos, la
 * radio completa del colector y el acta, más `manifest.json`), la segunda en el 5 (la línea grabada y
 * lo que espera I1). Regenerarlas es un PR propio, nunca el efecto de una subida de versión del motor.
 *
 * Lo leído se valida con Zod, como todo borde de entrada. La segunda mitad llega en el 5:
 * `loadTimelineBody` (el `stage_timelines.body` tal cual, para B6) y `loadInvariants` (lo que esperan I1
 * o I5). Desde el 6a, `loadTimeline` es la línea grabada (`<etapa>.timeline.gz`, decodificada como la
 * lee `readStageTimeline`), la que miden B9, B17, I2 y B2; la del adaptador de la radio, que era
 * `loadTimeline` del 3a al 5, sigue como `loadAdaptedTimeline` para B22. Y `seedFixtureWorld` siembra
 * una congelada en una base de PGlite para servirla por las rutas (B6 de lo servido; B3 en el 6b y B13
 * en el 7b, §17.20).
 */
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  type Database,
  gameState,
  riders,
  stageSnapshots,
  teams,
  worlds,
  writeStageTimelineRows,
} from '@cyclingstar/db'
import {
  type RaceRadio,
  SEASON_CALENDAR,
  type StageProfile,
  type StoredRaceRadio,
  radioForStorage,
  stageDayOfSeason,
  stageLengthKm,
  stagesForSeason,
} from '@cyclingstar/engine'
import {
  type ChronicleEntry,
  JERSEY_PRIORITY,
  NO_LEADERS,
  type RaceLeaders,
  type StageTimeline,
  TEMPLATE_REV,
  chronicleEntrySchema,
  decodeTimeline,
  pullMotiveSchema,
  radioGroupKindSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'
import {
  adaptRadioStage,
  profileStripOf,
  provisionalCast,
  stageWeatherOf,
} from '../../broadcastSource.js'
import {
  type ChronicleEvent,
  type ChronicleNames,
  chronicleNames,
  storedRaceRadioSchema,
} from '../../chronicle.js'

/** Las seis etapas congeladas (16-a). */
export const FIXTURES = [
  'race-france-e7',
  'race-france-e16',
  'race-france-e18',
  'race-france-e20',
  'race-flanders-e1',
  'race-colombia-e5',
] as const
export type FixtureName = (typeof FIXTURES)[number]

/** Las cinco en línea: las de B19, las únicas con radio (la crono ignora la sonda). */
export const ROAD_FIXTURES = [
  'race-france-e7',
  'race-france-e18',
  'race-france-e20',
  'race-flanders-e1',
  'race-colombia-e5',
] as const satisfies readonly FixtureName[]
export type RoadFixtureName = (typeof ROAD_FIXTURES)[number]

const fileSchema = z.object({ file: z.string(), bytes: z.number().int(), sha256: z.string() })

const manifestSchema = z.object({
  generatedBy: z.string(),
  engineVersion: z.number().int(),
  seed: z.number().int(),
  field: z.string(),
  /** Por carrera: cada uuid con su dorsal, país, equipo y nombre de prueba (`Rider 012`). */
  races: z.record(
    z.string(),
    z.object({
      worldSeed: z.string(),
      teams: z.record(
        z.string(),
        z.object({ name: z.string(), country: z.string(), jerseySeed: z.string() }),
      ),
      riders: z.record(
        z.string(),
        z.object({
          bib: z.number().int(),
          country: z.string(),
          team: z.string(),
          name: z.string(),
        }),
      ),
    }),
  ),
  /** Por etapa, lo que el adaptador lee de su snapshot y la lista con que `stageRun.ts` adelgazó la radio. */
  stages: z.record(
    z.string(),
    z.object({
      raceId: z.string(),
      day: z.number().int(),
      raceKey: z.string(),
      timeTrial: z.boolean(),
      /** stageLengthKm(input.profile) */
      lengthKm: z.number(),
      /** el tiempo del ganador en stage_results */
      winnerS: z.number(),
      /** stage_snapshots.input.riders[].riderId, en su orden: el RiderIx */
      riderIds: z.array(z.string()),
      /** la lista de seguimiento y los maillots de `radioForStorage` en stageRun.ts */
      watch: z.array(z.string()),
      priority: z.array(z.string()),
      /** los nacionales que el script escribió en palmares antes de la etapa (paso 5): un `from` de campeón */
      champions: z
        .array(z.object({ riderId: z.string(), raceId: z.string(), gameDay: z.number().int() }))
        .default([]),
      files: z.object({
        events: fileSchema,
        acta: fileSchema,
        radio: fileSchema.optional(),
        /** paso 5: `stage_timelines.body` y lo que esperan los invariantes */
        timeline: fileSchema.optional(),
        i1: fileSchema.optional(),
      }),
    }),
  ),
})
export type FixtureManifest = z.infer<typeof manifestSchema>
export type FixtureStage = FixtureManifest['stages'][string]

/** `stage_snapshots.events`: el `RaceEvent` del motor tal como lo congela stageRun.ts. */
const eventSchema = z.object({
  km: z.number(),
  tS: z.number(),
  tipo: z.string(),
  plantilla: z.string(),
  protagonistas: z.array(z.string()),
  datos: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
})

/** La radio COMPLETA del colector (`RaceRadio`, raceRadio.ts): la que stageRun.ts adelgaza al guardar. */
const radioSchema = z.object({
  starters: z.number(),
  kms: z.array(
    z.object({
      km: z.number(),
      groups: z.array(
        z.object({
          id: z.string(),
          kind: radioGroupKindSchema,
          position: z.number(),
          size: z.number(),
          riderIds: z.array(z.string()),
          riderTs: z.array(z.number()),
          tS: z.number(),
          gapS: z.number(),
          energyPct: z.number(),
          pulling: z.array(
            z.object({
              riderId: z.string(),
              pullWindow: z.number(),
              motivo: pullMotiveSchema.nullable(),
              para: z.string().nullable(),
            }),
          ),
          mishap: z
            .object({ tipo: z.enum(['caida', 'pinchazo', 'averia']), lostS: z.number() })
            .nullable(),
        }),
      ),
      racing: z.number(),
      gone: z.number(),
      mainId: z.string().nullable(),
      stopped: z.array(z.string()),
    }),
  ),
})

const read = (file: string): Buffer => readFileSync(new URL(file, import.meta.url))
const readGzJson = (file: string): unknown => JSON.parse(gunzipSync(read(file)).toString('utf8'))

let manifest: FixtureManifest | null = null
/** El manifiesto de las seis, validado. */
export function fixtureManifest(): FixtureManifest {
  manifest ??= manifestSchema.parse(JSON.parse(read('manifest.json').toString('utf8')))
  return manifest
}

/** La entrada del manifiesto de una etapa. */
export function fixtureStage(name: FixtureName): FixtureStage {
  const stage = fixtureManifest().stages[name]
  if (stage === undefined) throw new Error(`${name} no está en manifest.json`)
  return stage
}

/** `stage_snapshots.events` de la etapa, en su orden: el índice es el `source` de la línea (§4.2). */
export function loadEvents(name: FixtureName): ChronicleEvent[] {
  return z
    .array(eventSchema)
    .parse(readGzJson(fixtureStage(name).files.events.file))
    .map(({ datos, ...e }) => (datos === undefined ? e : { ...e, datos }))
}

const radios = new Map<RoadFixtureName, RaceRadio>()
/** La radio completa del colector de una etapa en línea (para B16 y B22, y para la guardada). */
export function loadRadio(name: RoadFixtureName): RaceRadio {
  let radio = radios.get(name)
  if (radio === undefined) {
    const file = fixtureStage(name).files.radio?.file
    if (file === undefined) throw new Error(`${name} no tiene radio`)
    radio = radioSchema.parse(readGzJson(file))
    radios.set(name, radio)
  }
  return radio
}

/**
 * `stage_snapshots.radio` de la etapa: la radio completa adelgazada con la misma lista de seguimiento
 * y los mismos maillots que stageRun.ts (el script comprueba, al escribir, que da lo guardado).
 */
export function loadStoredRadio(name: RoadFixtureName): StoredRaceRadio {
  const stage = fixtureStage(name)
  return radioForStorage(loadRadio(name), new Set(stage.watch), stage.priority)
}

/** Las `ChronicleEntry` del acta, las que sirve hoy la ruta de etapa (para B4 y B5 en la web). */
export function loadActa(name: FixtureName): ChronicleEntry[] {
  return z.array(chronicleEntrySchema).parse(readGzJson(fixtureStage(name).files.acta.file))
}

/** Los nombres de prueba de la carrera de la etapa, como los resolvería la ruta (sin maillots). */
export function fixtureNames(name: FixtureName): ChronicleNames {
  const race = fixtureManifest().races[fixtureStage(name).raceId]
  if (race === undefined) throw new Error(`la carrera de ${name} no está en manifest.json`)
  return chronicleNames(
    Object.entries(race.riders).map(([riderId, r]) => ({
      riderId,
      name: r.name,
      bib: r.bib,
      country: r.country,
      teamName: race.teams[r.team]?.name ?? null,
    })),
  )
}

/**
 * Los tiempos de llegada de una etapa en línea, del reloj de cada corredor en la última foto de la
 * radio completa, que es la de la meta: las congeladas no guardan el resultado, y la línea los pide
 * para su `FinishRecord` (que ningún test de la rápida lee: la meta nunca va en un tramo).
 */
export function fixtureFinishTimes(name: RoadFixtureName): ReadonlyMap<string, number> {
  const last = loadRadio(name).kms.at(-1)
  const out = new Map<string, number>()
  for (const g of last?.groups ?? []) g.riderIds.forEach((id, j) => out.set(id, g.riderTs[j] ?? 0))
  return out
}

/**
 * Los maillots con que se salió, de `priority` del manifiesto: la lista con que stageRun.ts pone
 * delante en la radio los tres maillots, en el orden de `JERSEY_PRIORITY` (`[gc, points, kom]` sin
 * los vacíos). Con menos de tres no se puede saber cuál es cuál, y la etapa sale sin maillots: en las
 * congeladas, solo la `race-flanders` e1, que es una carrera de un día.
 */
function fixtureLeaders(stage: FixtureStage): RaceLeaders {
  if (stage.priority.length !== JERSEY_PRIORITY.length) return NO_LEADERS
  const [gc, points, kom] = stage.priority
  return { gc: gc ?? null, points: points ?? null, kom: kom ?? null, team: null }
}

/**
 * El recorrido que corrió una congelada: el de la temporada 0 del calendario, que es el que congeló su
 * mundo (se comprueba que mide lo mismo).
 */
function fixtureProfile(name: FixtureName): StageProfile {
  const stage = fixtureStage(name)
  const profile = stagesForSeason(stage.raceId, 0)[stage.day - 1]?.profile
  if (profile === undefined || Math.abs(stageLengthKm(profile) - stage.lengthKm) > 1e-6)
    throw new Error(`${name}: el recorrido de la temporada 0 no es el que corrió la congelada`)
  return profile
}

const adaptedLines = new Map<RoadFixtureName, StageTimeline>()
/**
 * LA LÍNEA DEL ADAPTADOR DE LA RADIO de una congelada en línea (§3.8), la que era `loadTimeline` del 3a
 * al 5 y desde el 6a mide B22 contra la grabada: se construye, como `timelineForStage` sin fila, desde
 * `<etapa>.radio.json.gz` (adelgazada como la guardó stageRun.ts) y `.events.json.gz`, con el recorrido
 * de la temporada 0 del calendario y el reparto provisional de los corredores del manifiesto. Lo que el
 * mundo de las congeladas no guardó en el manifiesto va degradado y dicho: lo nombrable desde la salida
 * son los tres maillots (la general de salida no está), nadie lleva un maillot delegado, el tiempo es
 * de prueba (la semilla de la etapa no está) y todos son `M`, como el campo del banco.
 */
export function loadAdaptedTimeline(name: RoadFixtureName): StageTimeline {
  const hit = adaptedLines.get(name)
  if (hit !== undefined) return hit
  const stage = fixtureStage(name)
  const race = fixtureManifest().races[stage.raceId]
  if (race === undefined) throw new Error(`la carrera de ${name} no está en manifest.json`)
  const profile = fixtureProfile(name)
  const leaders = fixtureLeaders(stage)
  const from = stage.day > 1 ? { raceKey: stage.raceKey, stageDay: stage.day - 1 } : null
  const entries = stage.riderIds.map((riderId) => {
    const r = race.riders[riderId]
    return { riderId, bib: r?.bib ?? null, teamId: r?.team ?? null, gcRank: null, gcDeficitS: null }
  })
  const tl = adaptRadioStage({
    radio: storedRaceRadioSchema.parse(loadStoredRadio(name)),
    events: loadEvents(name),
    riderIds: stage.riderIds,
    lengthKm: stage.lengthKm,
    winnerS: stage.winnerS,
    engineVersion: fixtureManifest().engineVersion,
    finishTimes: fixtureFinishTimes(name),
    nameableAlways: new Set(stage.priority),
    profile: profileStripOf(profile),
    weather: stageWeatherOf(`${stage.raceKey}|${stage.day}`, undefined, stage.lengthKm),
    cast: provisionalCast(
      entries,
      {
        riders: new Map(
          Object.entries(race.riders).map(([id, r]) => [
            id,
            { name: r.name, country: r.country, gender: 'M' as const },
          ]),
        ),
        teams: new Map(
          Object.entries(race.teams).map(([id, t]) => [
            id,
            { name: t.name, jerseySeed: t.jerseySeed },
          ]),
        ),
      },
      { leaders, delegated: new Set() },
      from,
    ),
  })
  if (tl === null) throw new Error(`${name}: el adaptador no puede estimar el reloj`)
  adaptedLines.set(name, tl)
  return tl
}

// ----------------------------------------------------------------------- la segunda mitad (paso 5)

/**
 * `stage_timelines.body` de la etapa, tal cual: el gzip 9 del JSON de `StoredTimelineV1`, con el
 * reparto que `buildTimelineCast` congeló sobre la N − 1 (§16.2, 17-u). Es lo que pesa B6.
 */
export function loadTimelineBody(name: FixtureName): Buffer {
  const file = fixtureStage(name).files.timeline?.file
  if (file === undefined) throw new Error(`${name} no tiene línea grabada`)
  return read(file)
}

const timelines = new Map<FixtureName, StageTimeline>()
/**
 * LA LÍNEA DE UNA ETAPA CONGELADA (§16.4, §17.6): desde el 6a, la grabada, `<etapa>.timeline.gz`
 * descomprimido y pasado por `decodeTimeline` (el esquema de §4.3), igual que `readStageTimeline`
 * (§5.6). Del 3a al 5 era la del adaptador, que sigue en `loadAdaptedTimeline`.
 */
export function loadTimeline(name: FixtureName): StageTimeline {
  let tl = timelines.get(name)
  if (tl === undefined) {
    tl = decodeTimeline(JSON.parse(gunzipSync(loadTimelineBody(name)).toString('utf8')))
    timelines.set(name, tl)
  }
  return tl
}

/** Lo que deja sembrado `seedFixtureWorld`: el mundo de la carrera y la etapa, como la piden las rutas. */
export interface SeededFixture {
  readonly worldId: string
  readonly raceId: string
  readonly raceKey: string
  readonly day: number
}

/** El día de juego en que se corrió: el de la temporada 0 del calendario, como lo corrió su mundo. */
const gameDayOf = (stage: FixtureStage): number => {
  const race = SEASON_CALENDAR.find((r) => r.id === stage.raceId)
  if (race === undefined) throw new Error(`${stage.raceId} no está en el calendario`)
  return stageDayOfSeason(race, stage.day)
}

/**
 * SIEMBRA UNA CONGELADA EN UNA BASE (§16.2, §17.9; 17-u), para servirla por las rutas de verdad: el
 * mundo de su carrera la primera vez (la fila de `worlds` con la semilla del manifiesto, `game_state`
 * en la temporada 0 y después de todas sus carreras, como lo dejó el script, y los equipos y los
 * corredores del manifiesto con sus uuid y sus nombres de prueba), y después la etapa: la fila de
 * `stage_timelines` con el `.timeline.gz` tal cual y la de `stage_snapshots` con los sucesos, la radio
 * guardada (en línea) y una entrada con el recorrido corrido y la salida del manifiesto.
 *
 * Lo que el manifiesto no guarda va con un valor de prueba, dicho: la división, la filosofía, el
 * arquetipo y la edad (que ni la línea ni las rutas de la retransmisión leen), la semilla de la etapa y
 * la revisión de plantillas (`TEMPLATE_REV`). Una base tiene un solo mundo (`getCurrentWorld`) y los
 * uuid se repiten entre carreras (el script los numera desde 1 en cada una), así que una base siembra
 * etapas de una sola carrera: la de otra es un error, no se pisa nada en silencio.
 */
export async function seedFixtureWorld(
  t: { readonly db: Database },
  name: FixtureName,
): Promise<SeededFixture> {
  const manifest = fixtureManifest()
  const stage = fixtureStage(name)
  const race = manifest.races[stage.raceId]
  if (race === undefined) throw new Error(`la carrera de ${name} no está en manifest.json`)
  const there = await t.db.select({ id: worlds.id, seed: worlds.worldSeed }).from(worlds)
  let worldId = there.find((w) => w.seed === race.worldSeed)?.id
  if (worldId === undefined && there.length > 0)
    throw new Error(`${name}: la base ya tiene el mundo de otra carrera (${there[0]!.seed})`)
  if (worldId === undefined) {
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: race.worldSeed, engineVersion: manifest.engineVersion })
      .returning({ id: worlds.id })
    worldId = world!.id
    await t.db.insert(gameState).values({ worldId, currentDay: 360, lastProcessedDay: 360 })
    await t.db.insert(teams).values(
      Object.entries(race.teams).map(([id, tm]) => ({
        id,
        worldId: worldId!,
        name: tm.name,
        division: 'WT' as const,
        philosophy: 'general' as const,
        jerseySeed: tm.jerseySeed,
        country: tm.country,
      })),
    )
    await t.db.insert(riders).values(
      Object.entries(race.riders).map(([id, r]) => ({
        id,
        worldId: worldId!,
        teamId: r.team,
        name: r.name,
        country: r.country,
        gender: 'M' as const,
        birthSeason: -27,
        archetype: 'fondo' as const,
        faceSeed: `${id}:cara`,
      })),
    )
  }
  const body = loadTimelineBody(name)
  const tl = loadTimeline(name)
  const missed = await writeStageTimelineRows(t.db, [
    {
      raceId: stage.raceKey,
      stageDay: stage.day,
      gameDay: gameDayOf(stage),
      format: tl.format,
      engineVersion: tl.engineVersion,
      tplRev: TEMPLATE_REV,
      finishS: Math.ceil(tl.finish.finishS),
      bytes: body.length,
      body,
    },
  ])
  if (missed.length > 0) throw new Error(`${name}: la etapa ya estaba sembrada`)
  await t.db.insert(stageSnapshots).values({
    raceId: stage.raceKey,
    stageDay: stage.day,
    seed: `fixture:${name}`,
    engineVersion: manifest.engineVersion,
    input: {
      profile: fixtureProfile(name),
      timeTrial: stage.timeTrial,
      riders: stage.riderIds.map((riderId) => ({
        riderId,
        teamId: race.riders[riderId]?.team ?? null,
        bib: race.riders[riderId]?.bib ?? null,
      })),
    },
    events: loadEvents(name),
    radio: stage.timeTrial ? null : loadStoredRadio(name as RoadFixtureName),
  })
  return { worldId, raceId: stage.raceId, raceKey: stage.raceKey, day: stage.day }
}

/** Un grupo de lo que espera I1: [id, reloj en Ds, kind, tamaño, hueco en centésimas, RiderIx ordenados]. */
const i1GroupSchema = z.tuple([
  z.string(),
  z.number().int(),
  radioGroupKindSchema,
  z.number().int(),
  z.number().int(),
  z.array(z.number().int()),
])
/** Lo que esperan los invariantes de una congelada (`scripts/broadcast-fixtures.mjs`, §16.2). */
const invariantsSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('road'),
    /** por bloque de foto: [b, racing, gone, el pelotón, grupos] de `radioKmFrom` de la foto del MOTOR */
    blocks: z.array(
      z.tuple([
        z.number().int(),
        z.number().int(),
        z.number().int(),
        z.string().nullable(),
        z.array(i1GroupSchema),
      ]),
    ),
  }),
  z.object({
    kind: z.literal('tt'),
    /** por RiderIx: la salida del plan (`timeTrialStartOrder`) y 10 · tiempoS de results */
    startDs: z.array(z.number().int()),
    finishDs: z.array(z.number().int()),
  }),
])
export type FixtureInvariants = z.infer<typeof invariantsSchema>

/** Lo que esperan I1 (en línea) o I5 (en crono) de la línea grabada de una congelada. */
export function loadInvariants(name: FixtureName): FixtureInvariants {
  const file = fixtureStage(name).files.i1?.file
  if (file === undefined) throw new Error(`${name} no tiene lo que esperan los invariantes`)
  return invariantsSchema.parse(readGzJson(file))
}
