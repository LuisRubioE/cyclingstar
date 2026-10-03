/**
 * LAS ETAPAS CONGELADAS DE LA RETRANSMISIÓN (docs/retransmision.md §16.2; decisiones 16-a y 17-u).
 *
 * Seis etapas que no dependen de la versión del motor y miden `packages/shared` y la API: cinco en
 * línea y una crono, con la semilla 0 y el campo del banco. Las escribe `scripts/broadcast-fixtures.mjs`
 * desde un mundo de PGlite con ids uuid, en dos veces: la primera mitad en el paso 2 (los sucesos, la
 * radio completa del colector y el acta, más `manifest.json`), la segunda en el 5 (la línea grabada y
 * lo que espera I1). Regenerarlas es un PR propio, nunca el efecto de una subida de versión del motor.
 *
 * Lo leído se valida con Zod, como todo borde de entrada. `loadTimeline` (la línea del adaptador hasta
 * el 6a, la grabada después) llega en el 3a, y `seedFixtureWorld`, en el 6a (§17.20).
 */
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { type RaceRadio, type StoredRaceRadio, radioForStorage } from '@cyclingstar/engine'
import {
  type ChronicleEntry,
  chronicleEntrySchema,
  pullMotiveSchema,
  radioGroupKindSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'
import { type ChronicleEvent, type ChronicleNames, chronicleNames } from '../../chronicle.js'

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
      files: z.object({ events: fileSchema, acta: fileSchema, radio: fileSchema.optional() }),
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
