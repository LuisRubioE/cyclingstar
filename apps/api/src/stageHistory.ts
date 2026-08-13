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
  type Segment,
  type StageKind,
  type StageProfile,
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
 * Una carrera que viene de una edición real (`RACE_EDITIONS`) saca su etiqueta del terreno de la
 * edición —`mountain` → «Summit finish», `hilly` → «Hills»—, y eso describe la CLASE de etapa, no
 * dónde está la línea. Visto en producción, Race Andalucía e2: ficha «Stage 2 · Summit finish»,
 * cat1 a 79 km de meta, un repecho de tercera en la línea y sprint masivo de 113 sobre 118, ganado
 * por un velocista puro (SPR 89). No es un fallo de simulación —esa etapa la gana un rápido en la
 * carretera de verdad—: es la ficha, que promete un final en alto que no existe. Y no es cosmético,
 * porque con esa etiqueta se decide a quién se manda y si se gasta al escalador.
 *
 * Aquí solo se decide EL FINAL. La familia de la etapa (`kind`: reina o media, el color y lo que el
 * motor usa para las órdenes automáticas) la sigue declarando la edición, que para eso está
 * verificada; lo único que se corrige es la mitad de la etiqueta que habla de la meta.
 */
const SUMMIT_FINISH = { reina: 'Summit finish', media: 'Uphill finish' } as const
const NO_SUMMIT_FINISH = { reina: 'Mountains', media: 'Hills' } as const

/**
 * CUÁNTA CARRETERA TRAS LA ÚLTIMA CIMA deja de ser un final en alto, y no es un número de gusto:
 * sale de correr las etapas del calendario y mirar quién gana (`docs` de esta tanda).
 *
 * No puede ser cero. Los perfiles construidos con los rasgos REALES de la etapa colocan cada puerto
 * en su kilómetro de coronación, así que un final en alto de verdad suele quedar con una cola de
 * redondeo detrás —Race France e15, el Plateau de Solaison, deja 0,1 km— y el test ingenuo de «el
 * último segmento es un puerto» lo degradaría. Y no puede ser grande: por encima de 5 km la etapa
 * deja de comportarse como un final en alto.
 *
 * Medido sobre las 19 etapas del calendario que anuncian final en alto con carretera detrás, 4
 * corridas cada una, contra un control de 24 finales en alto de verdad (mediana 1 juntos en meta,
 * 14 % de victorias de un velocista):
 *
 * ```
 *   cola ≤ 5 km   mediana 3 juntos en meta   velocista gana el 15 %   ← indistinguible del control
 *   cola > 5 km   mediana 17 juntos en meta  velocista gana el 46 %
 * ```
 */
const SUMMIT_RUN_IN_KM = 5

/** Kilómetros de carretera tras la última cima; `Infinity` si la etapa no tiene ni un puerto. */
function runInAfterLastClimb(segments: readonly Segment[]): number {
  let last = -1
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i]?.tipo === 'puerto') {
      last = i
      break
    }
  }
  if (last < 0) return Number.POSITIVE_INFINITY
  let km = 0
  for (let i = last + 1; i < segments.length; i++) km += segments[i]?.km ?? 0
  return km
}

/**
 * La ficha de una etapa del CALENDARIO, con la etiqueta del final puesta por el recorrido.
 *
 * Es el mismo criterio que ya aplicaba `stageHead` a una etapa CORRIDA —la etiqueta tiene que
 * describir el recorrido que va debajo, no un rótulo heredado— movido a donde nace la ficha, que es
 * lo que faltaba. El nombre se rehace con el patrón del calendario (`Stage N · etiqueta`) para que
 * nombre y etiqueta no puedan discrepar nunca.
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
  if (base.timeTrial || !summit) return { ...base, name: stage.name, label: stage.label }
  const label =
    runInAfterLastClimb(stage.profile.segments) <= SUMMIT_RUN_IN_KM
      ? summit
      : NO_SUMMIT_FINISH[stage.kind as keyof typeof NO_SUMMIT_FINISH]
  // El nombre se rehace SOLO si es el que compone el calendario a partir de la etiqueta
  // (`Stage N · etiqueta`). Una carrera con nombre propio —un campeonato nacional, un monumento—
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
