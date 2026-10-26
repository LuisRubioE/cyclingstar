import type { TrainingMode } from './contracts.js'
import type { Attribute, RiderArchetype } from './rider.js'
import {
  type CoachBlock,
  type CoachContext,
  type Intensity,
  type Session,
  type TrainingChoice,
  blockWeek,
  coachPlan,
} from './training.js'

/**
 * QUIÉN DECIDE EL DÍA DE ENTRENAMIENTO (E3, docs/visual.md §11.4; D-38; PR 13a). La precedencia del tick
 * (`packages/db/src/train.ts`), escrita una vez y pura, para que el tick, la vista previa y `GET /orders`
 * digan lo mismo: hasta aquí vivía dentro del tick, y la pantalla inventaba los días por su cuenta.
 *
 * El orden, el de siempre: la carrera; el viaje (`viaje`, `normal`); en `entrenador`, el entrenador y nada
 * más; la orden del día; el bloque de esa semana del plan vivo, si no es `null`; el plan de equipo, solo en
 * `mixto`; y el entrenador, salvo en `manual`, donde el hueco es `descanso_activo`.
 */

/** Los siete orígenes de un día, en el orden en que se miran. */
export const TRAINING_DAY_SOURCES = [
  'carrera',
  'viaje',
  'orden',
  'bloque',
  'equipo',
  'entrenador',
  'descanso',
] as const
export type TrainingDaySource = (typeof TRAINING_DAY_SOURCES)[number]

type Blocks = readonly [CoachBlock | null, CoachBlock | null, CoachBlock | null, CoachBlock | null]

export interface TrainingDayContext {
  readonly gameDay: number
  readonly mode: TrainingMode
  readonly archetype: RiderArchetype
  /** corre ese día: no entrena (el tick se salta antes a quien ha corrido) */
  readonly race: { readonly raceKey: string } | null
  /** de viaje, de ida o de vuelta; la carrera le gana */
  readonly travel: { readonly raceKey: string; readonly direction: 'out' | 'back' } | null
  /** la orden del día: la guardada en el tick, la de la pantalla en la vista previa */
  readonly order: TrainingChoice | null
  /** el plan vivo (§11.5) */
  readonly plan: {
    readonly startDay: number
    readonly blocks: Blocks
    readonly focusAttr: Attribute | null
    readonly intensity: Intensity | null
  } | null
  readonly teamPlan: TrainingChoice | null
  /** lo que mira el entrenador ese día; la vista previa le pondrá el TSB proyectado (13b) */
  readonly coach: CoachContext
}

export interface ResolvedTrainingDay {
  /** null solo en la carrera, que no entrena */
  readonly session: Session | null
  readonly intensity: Intensity | null
  readonly source: TrainingDaySource
  /** el bloque del plan vivo que decide el día, con su semana de la 1 a la 4 */
  readonly block: { readonly code: CoachBlock; readonly week: 1 | 2 | 3 | 4 } | null
  /** la carrera del día o del viaje */
  readonly raceKey: string | null
}

/** El bloque de la semana del plan vivo, si ese día cae dentro de sus 28 y la semana no es `null`. */
function bloqueDeLaSemana(
  ctx: TrainingDayContext,
): { readonly code: CoachBlock; readonly week: 1 | 2 | 3 | 4 } | null {
  if (ctx.plan === null) return null
  const semana = Math.floor((ctx.gameDay - ctx.plan.startDay) / 7)
  if (semana < 0 || semana > 3) return null
  const code = ctx.plan.blocks[semana] ?? null
  return code === null ? null : { code, week: (semana + 1) as 1 | 2 | 3 | 4 }
}

const elige = (
  choice: TrainingChoice,
  source: TrainingDaySource,
  block: ResolvedTrainingDay['block'] = null,
): ResolvedTrainingDay => ({
  session: choice.session,
  intensity: choice.intensity,
  source,
  block,
  raceKey: null,
})

/** LA PRECEDENCIA (D-38), la de `train.ts` escrita una vez. */
export function resolveTrainingDay(ctx: TrainingDayContext): ResolvedTrainingDay {
  if (ctx.race !== null) {
    return {
      session: null,
      intensity: null,
      source: 'carrera',
      block: null,
      raceKey: ctx.race.raceKey,
    }
  }
  // De viaje, el día es el viaje, gane quien gane lo demás: cuesta el día de trabajo, y el Banister
  // hace su cuenta con su carga (`SESSION_CATALOG.viaje`).
  if (ctx.travel !== null) {
    return {
      session: 'viaje',
      intensity: 'normal',
      source: 'viaje',
      block: null,
      raceKey: ctx.travel.raceKey,
    }
  }
  // `entrenador` gana a lo demás a propósito: quien lo elige dice «decide tú cada día», y el entrenador
  // decide con el TSB de hoy, mejor información que la foto que el jugador vio al guardar.
  if (ctx.mode === 'entrenador') return elige(coachPlan(ctx.coach), 'entrenador')
  if (ctx.order !== null) return elige(ctx.order, 'orden')
  // Un bloque a `null` no es «sin decidir»: es «esa semana decide el entrenador» (o, en `manual`, nadie).
  const bloque = bloqueDeLaSemana(ctx)
  if (bloque !== null && ctx.plan !== null) {
    const choice = blockWeek(
      bloque.code,
      ctx.archetype,
      ctx.gameDay,
      ctx.plan.focusAttr,
      ctx.plan.intensity ?? 'normal',
    )
    return elige(choice, 'bloque', bloque)
  }
  if (ctx.mode === 'mixto' && ctx.teamPlan !== null) return elige(ctx.teamPlan, 'equipo')
  // En `manual`, lo que el jugador no escribe no se entrena: descanso activo, no el entrenador.
  if (ctx.mode === 'manual') {
    return elige({ session: 'descanso_activo', intensity: 'normal' }, 'descanso')
  }
  return elige(coachPlan(ctx.coach), 'entrenador')
}
