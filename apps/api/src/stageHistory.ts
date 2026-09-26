/**
 * CÓMO SE DESCRIBE UNA ETAPA YA CORRIDA.
 *
 * El perfil de una etapa no vive en ninguna tabla: el calendario entero se RECALCULA desde el
 * código del motor en cada petición. Mientras el generador de recorridos no cambia da igual, pero
 * en cuanto cambia —otra mezcla de etapas, una carrera que pasa de perfil inventado a perfil real—
 * reescribe hacia atrás la ficha de carreras YA CORRIDAS: la página anuncia un recorrido que nadie
 * corrió encima de unos resultados que sí son de verdad.
 *
 * Visto en producción (GD 46): Race Sharjah etapa 4 se mostraba como «Stage 4 · ITT, 15 km» con la
 * crónica de los 170 km de carretera que se corrieron —fuga, dos cimas, sprint masivo— y un ganador
 * a 3,5 km/h; y Race Great Ocean etapa 1 decía 188 km sobre los 210 que se corrieron. Dos cambios
 * distintos, tres etapas de 81 afectadas.
 *
 * El recorrido que SÍ se corrió está congelado en `stage_snapshots.input`, al lado de la crónica,
 * que ya se leía de ahí exactamente por esta razón. Aquí se decide qué contar de cada sitio.
 */
import {
  type CalendarStage,
  type StageKind,
  type StageProfile,
  SUMMIT_RUN_IN_KM,
  runInAfterLastClimb,
  stageKindOf,
} from '@cyclingstar/engine'

/** Lo que el calendario de HOY dice de esta etapa. */
export interface StageSpecHead {
  name: string
  /** La etiqueta corta del calendario: «Flat», «Hills», «Summit finish», «ITT»… */
  label: string
  kind: StageKind
  timeTrial: boolean
  km: number
}

/**
 * DÓNDE ESTÁ LA META, dicho por el RECORRIDO y no por el terreno declarado.
 *
 * Una carrera con recorrido real (`STAGE_FEATURES`) saca su etiqueta del terreno de la edición
 * (`mountain` → «Summit finish», `hilly` → «Hills»), y eso describe la CLASE de etapa, no dónde está
 * la línea. Visto en producción, Race Andalucía e2: ficha «Stage 2 · Summit finish», cat1 a 79 km de
 * meta, un repecho de tercera en la línea y sprint masivo de 113 sobre 118, ganado por un velocista
 * puro (SPR 89). No es un fallo de simulación (esa etapa la gana un rápido en la carretera de
 * verdad): es la ficha, que promete un final en alto que no existe. Y no es cosmético, porque con esa
 * etiqueta se decide a quién se manda y si se gasta al escalador.
 *
 * Aquí solo se decide EL FINAL. La familia de la etapa (`kind`: reina o media, el color y lo que el
 * motor usa para las órdenes automáticas) la sigue declarando la edición, que para eso está
 * verificada; lo único que se corrige es la mitad de la etiqueta que habla de la meta, entre las DOS
 * etiquetas de ese `kind`.
 */
const SUMMIT_FINISH = { reina: 'Summit finish', media: 'Uphill finish' } as const
const NO_SUMMIT_FINISH = { reina: 'Mountains', media: 'Hills' } as const

/**
 * La ficha de una etapa del CALENDARIO, con la etiqueta del final puesta por el recorrido.
 *
 * Desde la v87 la etiqueta nace UNA vez (docs/generador.md §11.5 regla 3, decisión 23). Una etapa
 * generada o de edición (`routeSource !== 'real'`) ya trae la de `labelDe`, que sale del propio
 * perfil con la misma regla que aquí, y se devuelve tal cual. Una etapa `real` trae la del terreno de
 * su edición, y si es `reina` o `media` se elige entre las dos etiquetas de ESE `kind` con
 * `runInAfterLastClimb(segments) <= SUMMIT_RUN_IN_KM`, la regla del clasificador (`stageKind.ts`);
 * nunca se le pone la etiqueta de otro `kind`. El nombre se rehace con el patrón del calendario
 * (`Stage N · etiqueta`) para que nombre y etiqueta no puedan discrepar nunca.
 *
 * Las cronos, las llanas y las clásicas no pasan por aquí: su etiqueta no promete nada sobre la
 * meta, así que no hay nada que corregir.
 */
export function calendarStageSpec(stage: CalendarStage, km: number): StageSpecHead {
  const base = {
    kind: stage.kind,
    timeTrial: stage.timeTrial ?? false,
    km,
  }
  const summit = SUMMIT_FINISH[stage.kind as keyof typeof SUMMIT_FINISH]
  if (stage.routeSource !== 'real' || base.timeTrial || !summit)
    return { ...base, name: stage.name, label: stage.label }
  const label =
    runInAfterLastClimb(stage.profile.segments) <= SUMMIT_RUN_IN_KM
      ? summit
      : NO_SUMMIT_FINISH[stage.kind as keyof typeof NO_SUMMIT_FINISH]
  // El nombre se rehace SOLO si es el que compone el calendario a partir de la etiqueta
  // (`Stage N · etiqueta`). Una carrera con nombre propio (un campeonato nacional, un monumento)
  // se llama como se llama, y renombrarla sería peor mentira que la que se está arreglando.
  const generated = stage.name === `Stage ${stage.index} · ${stage.label}`
  return { ...base, name: generated ? `Stage ${stage.index} · ${label}` : stage.name, label }
}

/** Lo que se corrió, sacado del snapshot. */
export interface RacedStage {
  profile: StageProfile
  timeTrial: boolean
  km: number
}

export interface StageHead {
  name: string
  /** La etiqueta corta, coherente SIEMPRE con el nombre y el tipo que van a su lado. */
  label: string
  kind: StageKind
  timeTrial: boolean
  km: number
  /** true si la ficha del calendario ya no describe la etapa que se corrió. */
  staleSpec: boolean
}

/**
 * Un kilómetro de diferencia entre la ficha y lo corrido no es un cambio de recorrido: es el
 * redondeo de la etiqueta de kilómetros. Más que eso, la ficha habla de otra etapa.
 */
const KM_TOLERANCE = 1

/**
 * La cabecera de una etapa corrida: kilómetros y crono SIEMPRE de lo que se corrió; nombre y tipo
 * de la ficha del calendario MIENTRAS siga describiéndola —para las ediciones reales su terreno
 * sabe más que cualquier clasificador— y, cuando ya no, deducidos del propio recorrido.
 */
export function stageHead(day: number, spec: StageSpecHead, raced: RacedStage): StageHead {
  const staleSpec =
    raced.timeTrial !== spec.timeTrial || Math.abs(raced.km - spec.km) > KM_TOLERANCE
  if (!staleSpec) {
    return {
      name: spec.name,
      label: spec.label,
      kind: spec.kind,
      timeTrial: raced.timeTrial,
      km: raced.km,
      staleSpec,
    }
  }
  const shape = stageKindOf(raced.profile, raced.timeTrial)
  return {
    // El nombre se rehace con el mismo patrón que el calendario (`Stage N · etiqueta`): el número de
    // etapa no cambia nunca —es su sitio en la carrera— y la etiqueta la pone el recorrido corrido.
    name: `Stage ${day} · ${shape.label}`,
    label: shape.label,
    kind: shape.kind,
    timeTrial: raced.timeTrial,
    km: raced.km,
    staleSpec,
  }
}
