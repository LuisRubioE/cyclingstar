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
import { type StageKind, type StageProfile, stageKindOf } from '@cyclingstar/engine'

/** Lo que el calendario de HOY dice de esta etapa. */
export interface StageSpecHead {
  name: string
  kind: StageKind
  timeTrial: boolean
  km: number
}

/** Lo que se corrió, sacado del snapshot. */
export interface RacedStage {
  profile: StageProfile
  timeTrial: boolean
  km: number
}

export interface StageHead {
  name: string
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
    return { name: spec.name, kind: spec.kind, timeTrial: raced.timeTrial, km: raced.km, staleSpec }
  }
  const shape = stageKindOf(raced.profile, raced.timeTrial)
  return {
    // El nombre se rehace con el mismo patrón que el calendario (`Stage N · etiqueta`): el número de
    // etapa no cambia nunca —es su sitio en la carrera— y la etiqueta la pone el recorrido corrido.
    name: `Stage ${day} · ${shape.label}`,
    kind: shape.kind,
    timeTrial: raced.timeTrial,
    km: raced.km,
    staleSpec,
  }
}
