/**
 * LA FICHA DE UNA ETAPA DEL CALENDARIO, TAL COMO LA TIENE EL MUNDO (docs/generador.md §10.7, §10.8
 * y §11.4; decisión 39 y D10 con su valor por defecto).
 *
 * Desde la v87 cada temporada tiene su edición: el recorrido de una carrera generada cambia de un año
 * a otro y conserva su arquitectura. Lo que la pantalla enseña de cada etapa sale, por este orden,
 * de lo que se corrió (el snapshot), de lo que el mundo congeló (`race_routes`) y, para una carrera
 * que aún no se ha congelado, de la edición de la temporada del mundo (`stagesForSeason`); nunca de
 * `SEASON_CALENDAR` a secas, que es la temporada 0.
 *
 * Con el recorrido viajan su ORIGEN (real, ciudades y distancia reales con relieve generado, o
 * generado), la frase de arquitectura, la edición y lo que cambió respecto de la anterior.
 */
import type { FrozenStage } from '@cyclingstar/db'
import {
  BASE_SEASON,
  type CalendarStage,
  type DiffInput,
  type GeneratedStage,
  type GeoZone,
  type RaceRouteSource,
  type RouteSource,
  SKELETONS,
  type SkeletonId,
  type StageProfile,
  diffMotivos,
  opcionDe,
  renderAltimetrySvg,
  stagesForSeason,
} from '@cyclingstar/engine'
import { type RacedStage, calendarStageSpec, stageHead } from './stageHistory.js'

/** Kilómetros de una etapa a partir de su perfil, redondeados como los enseña la ficha. */
export const stageKm = (segments: readonly { km: number }[]): number =>
  Math.round(segments.reduce((sum, s) => sum + s.km, 0))

/** Lo que gana cada etapa de la ficha de carrera (§3.11). */
export interface StageCardRoute {
  routeSource: RouteSource
  /** `season + 1`: el primer año de un mundo es la edición 1. */
  edicion: number
  /** La ficha del generador; `null` en las etapas `real`, que no la tienen. */
  arch: { frase: string; skeleton: SkeletonId; geo: GeoZone } | null
  /** `diffMotivos(anterior, actual)`; vacío en `real`, en `edicion`, en la temporada base y si nada cambió. */
  cambiosRespectoAnterior: string[]
}

type Arch = GeneratedStage['arch']

/** Una etapa del calendario de una temporada vista como congelada: lo que el mundo corre si aún no la congeló. */
export function frozenFromCalendar(stage: CalendarStage): FrozenStage {
  return {
    stageDay: stage.index,
    profile: stage.profile,
    kind: stage.kind,
    label: stage.label,
    timeTrial: stage.timeTrial ?? false,
    routeSource: stage.routeSource,
    arch: stage.arch ?? null,
  }
}

/**
 * La ficha del generador de una etapa: la congelada y, solo si la fila es anterior a la columna, la
 * de la edición de su temporada (§3.11: `frozen.arch ?? stagesForSeason(raceId, season)[i − 1].arch`).
 * Una etapa `real` no tiene.
 */
function archDe(raceId: string, season: number, st: FrozenStage): Arch | null {
  if (st.routeSource === 'real') return null
  return st.arch ?? stagesForSeason(raceId, season)[st.stageDay - 1]?.arch ?? null
}

/** El nombre de la opción de nivel 2 de una temporada ("Bérgamo"); sin nombre en la canónica. */
function nombreDeOpcion(arch: Arch, raceId: string, season: number): string | undefined {
  const sk = SKELETONS[arch.skeleton]
  const opcion = opcionDe(sk, raceId, season)
  return opcion > 0 ? sk.alternativas?.[opcion - 1]?.nombre : undefined
}

function vistaDe(profile: StageProfile, arch: Arch, raceId: string, season: number): DiffInput {
  const opcion = nombreDeOpcion(arch, raceId, season)
  return {
    km: profile.segments.reduce((a, s) => a + s.km, 0),
    motivos: arch.motivos,
    ...(opcion !== undefined ? { opcion } : {}),
  }
}

/**
 * Lo que la ficha dice del origen y de la edición de una etapa (§10.8). `anterior` es la misma etapa
 * en la temporada anterior, tal como la tiene el mundo (congelada si se corrió, la edición si no);
 * `null` en la temporada base.
 */
export function stageCardRoute(
  raceId: string,
  season: number,
  actual: FrozenStage,
  anterior: FrozenStage | null,
): StageCardRoute {
  const arch = archDe(raceId, season, actual)
  const archPrev = anterior ? archDe(raceId, season - 1, anterior) : null
  // Solo lo generado anuncia cambios: una etapa de edición redibuja el relieve entre las mismas
  // ciudades y no afirma nada nuevo (§10.8), y lo real no varía.
  const cambios =
    actual.routeSource === 'generado' &&
    season > BASE_SEASON &&
    anterior !== null &&
    arch !== null &&
    archPrev !== null
      ? diffMotivos(
          vistaDe(anterior.profile, archPrev, raceId, season - 1),
          vistaDe(actual.profile, arch, raceId, season),
        )
      : []
  return {
    routeSource: actual.routeSource,
    edicion: season + 1,
    arch: arch ? { frase: arch.frase, skeleton: arch.skeleton, geo: arch.geo } : null,
    cambiosRespectoAnterior: cambios,
  }
}

/**
 * La etapa de la temporada con lo que el mundo congeló encima: tipo, etiqueta, crono, perfil y
 * origen del congelado; número y nombre de la temporada. El nombre se rehace si es el que compone el
 * calendario (`Stage N · etiqueta`), para que nombre y etiqueta no puedan discrepar.
 */
export function congeladaComoEtapa(deLaTemporada: CalendarStage, st: FrozenStage): CalendarStage {
  const compuesto = deLaTemporada.name === `Stage ${deLaTemporada.index} · ${deLaTemporada.label}`
  return {
    ...deLaTemporada,
    name: compuesto ? `Stage ${deLaTemporada.index} · ${st.label}` : deLaTemporada.name,
    kind: st.kind,
    label: st.label,
    timeTrial: st.timeTrial,
    profile: st.profile,
    routeSource: st.routeSource,
  }
}

/** Una entrada del plan de etapas de la ficha de carrera (`/api/calendar/:raceId`). */
export interface StagePlanEntry extends StageCardRoute {
  index: number
  name: string
  label: string
  kind: string
  km: number
  timeTrial: boolean
  from: string | null
  to: string | null
  altimetry: string
}

/**
 * El plan de UNA etapa. El perfil es `run?.profile ?? frozen.profile` (§10.7): lo corrido manda, y
 * `frozen` ya es el congelado o, si la carrera no se ha congelado, la edición de la temporada.
 */
export function stagePlanEntry(args: {
  raceId: string
  season: number
  deLaTemporada: CalendarStage
  frozen: FrozenStage
  anterior: FrozenStage | null
  run: RacedStage | undefined
  ends: { from: string; to: string } | null
}): StagePlanEntry {
  const { raceId, season, deLaTemporada, frozen, anterior, run, ends } = args
  const stage = congeladaComoEtapa(deLaTemporada, frozen)
  const spec = calendarStageSpec(stage, stageKm(frozen.profile.segments))
  const head = run ? stageHead(stage.index, spec, run) : { ...spec, staleSpec: false }
  return {
    index: stage.index,
    name: head.name,
    label: head.label,
    kind: head.kind,
    km: head.km,
    timeTrial: head.timeTrial,
    from: ends?.from ?? null,
    to: ends?.to ?? null,
    altimetry: renderAltimetrySvg(run?.profile ?? frozen.profile),
    ...stageCardRoute(raceId, season, frozen, anterior),
  }
}

/**
 * El origen de una carrera, agregado de sus etapas con la regla de `raceRouteSourceOf` (§3.11): real
 * si todas lo son, generado si todas lo son, mixto en cualquier otro caso (también toda `edicion`).
 */
export function raceRouteSource(stages: readonly { routeSource: RouteSource }[]): RaceRouteSource {
  const set = new Set(stages.map((s) => s.routeSource))
  if (set.size === 1 && set.has('real')) return 'real'
  if (set.size === 1 && set.has('generado')) return 'generado'
  return 'mixto'
}
