import {
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  type Attribute,
  type CoachBlock,
  INTENSITIES,
  INTENSITY_LABELS,
  type Intensity,
  type PlanPreviewDay,
  type TrainingMode,
  seasonPosition,
} from '@cyclingstar/shared'
import { Fragment, type ReactNode, useId } from 'react'
import {
  type PlanCalendar,
  type PlanDraft,
  RULE_INFO,
  RULE_INTRO,
  afterStripLabel,
  afterTitle,
  monthLoad,
  ruleLine,
  ruleSpoken,
  weekStripLabel,
  weekTitle,
} from '../domain/trainingPlan'
import { BLOCK_WORD, LOAD_WORD, MODE_WORD } from '../domain/words'
import { WeekStrip } from './WeekStrip'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { Icon } from './ui/Icon'
import { InfoButton } from './ui/InfoButton'
import { Meter } from './ui/Meter'
import { Segmented } from './ui/Segmented'
import { Skeleton } from './ui/Skeleton'

/**
 * EL PLAN, UN NIVEL MÁS ARRIBA (docs/entrenamiento.md §5.3; E3, docs/visual.md §10.5 a §10.8; PR 14). El
 * cuerpo del `Panel` `Your month`: quién decide (`Segmented`), la regla de un día en una línea con su
 * `InfoButton`, y las semanas del plan vivo con sus días, cada una con el `select` de su bloque, su porqué y
 * su tira; el énfasis y la intensidad; la carga del mes en palabras, y empezar el plan de cero mañana. En
 * `Coach decides`, las semanas siguen a la vista (lo que hará el entrenador) sin nada que elegir.
 *
 * No guarda: cada cambio sube a la página, que lo cuenta en su única `ActionBar` (§10.9).
 */

export const MODES: readonly TrainingMode[] = ['entrenador', 'mixto', 'manual']
const BLOCKS: readonly CoachBlock[] = [
  'base',
  'construccion',
  'especifico',
  'afinado',
  'recuperacion',
]

/** Para qué es cada bloque: no es decoración, es la razón para elegir uno y no otro. */
const BLOCK_WHY: Readonly<Record<CoachBlock, string>> = {
  base: 'Builds fitness without digging a hole. Pre-season, back from injury, a down week.',
  construccion: 'Where attributes actually move. Leaves you tired: that is the point.',
  especifico: 'Sharpens what your goal race asks for, plus tactics.',
  afinado: 'Sheds fatigue so you arrive at the race fresh. Lightest week before a goal.',
  recuperacion: 'After a stage race. Rebuilds recovery and keeps you off the physio table.',
}

/** La semana sin bloque: en `Mixed` decide el equipo o el entrenador; en `I decide`, nadie, y es descanso. */
const SIN_BLOQUE = {
  mixto: {
    option: 'Leave it to the coach',
    why: 'Your coach picks this week, or your team plan if your team has one.',
  },
  manual: { option: 'No block: rest', why: 'Days you leave empty are rest.' },
} as const

/** La regla de un día (§10.5): los pasos con `chevron-right` entre ellos, y la frase entera para el lector. */
export function RuleText({ mode }: { readonly mode: TrainingMode }) {
  const rule = ruleLine(mode)
  return (
    <p className="min-w-0 flex-1 text-meta text-ink-2">
      <span className="sr-only">{ruleSpoken(rule)}</span>
      <span aria-hidden="true">
        {`${RULE_INTRO} `}
        {rule.steps.map((step, i) => (
          <Fragment key={step}>
            {i > 0 && (
              <span className="inline-flex px-0.5 align-middle">
                <Icon name="chevron-right" size={16} />
              </span>
            )}
            {step}
          </Fragment>
        ))}
        {`.${rule.note === null ? '' : ` ${rule.note}`}`}
      </span>
    </p>
  )
}

/** La regla con su porqué plegado, que es de E6 hasta que diga dónde vive el largo (§10.10). */
export function RuleLine({ mode }: { readonly mode: TrainingMode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1">
      <RuleText mode={mode} />
      <InfoButton label="About what wins on a day">{RULE_INFO}</InfoButton>
    </div>
  )
}

function Semana({
  title,
  stripLabel,
  days,
  direction,
  firstColumn,
  select,
}: {
  readonly title: string
  readonly stripLabel: string
  readonly days: readonly PlanPreviewDay[] | null
  readonly direction: ReadonlyMap<number, 'out' | 'back'>
  readonly firstColumn: number
  readonly select?: (titleId: string) => ReactNode
}) {
  const titleId = useId()
  return (
    <li className="grid gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id={titleId} className="text-row text-ink">
          {title}
        </h3>
        {select?.(titleId)}
      </div>
      {days === null ? (
        <Skeleton shape={{ kind: 'rows', rows: 1, rowHeight: 64 }} />
      ) : (
        <WeekStrip label={stripLabel} days={days} direction={direction} firstColumn={firstColumn} />
      )}
    </li>
  )
}

export interface PlanLadderProps {
  readonly draft: PlanDraft
  readonly calendar: PlanCalendar
  /** los 28 días de la vista previa, con lo tocado encima; null mientras llega */
  readonly days: readonly PlanPreviewDay[] | null
  readonly direction: ReadonlyMap<number, 'out' | 'back'>
  /** hay un plan vivo empezado antes de mañana */
  readonly canStartFresh: boolean
  /** el día en que empezó el plan vivo, para volver a él tras empezar de cero sin guardar */
  readonly livePlanStart: number | null
  readonly onMode: (mode: TrainingMode) => void
  readonly onBlock: (index: number, block: CoachBlock | null) => void
  readonly onFocus: (attr: Attribute | null) => void
  readonly onIntensity: (intensity: Intensity) => void
  readonly onStartFresh: () => void
  /** deshace `Start a new plan tomorrow` sin guardar */
  readonly onKeepPlan: () => void
}

export function PlanLadder({
  draft,
  calendar,
  days,
  direction,
  canStartFresh,
  livePlanStart,
  onMode,
  onBlock,
  onFocus,
  onIntensity,
  onStartFresh,
  onKeepPlan,
}: PlanLadderProps) {
  const focusId = useId()
  const intensityId = useId()
  const elige = draft.mode !== 'entrenador'
  const sinBloque = SIN_BLOQUE[draft.mode === 'manual' ? 'manual' : 'mixto']
  const deLosDias = (gameDays: readonly number[]) =>
    days === null ? null : days.filter((d) => gameDays.includes(d.gameDay))
  const carga = days === null ? null : monthLoad(days)

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <Segmented
          label="Who decides your training"
          options={MODES.map((m) => ({ key: m, label: MODE_WORD[m] }))}
          value={draft.mode}
          onChange={onMode}
        />
        <RuleLine mode={draft.mode} />
      </div>

      <ol className="grid gap-4">
        {calendar.weeks.map((w) => {
          const block = draft.blocks[w.index] ?? null
          const title = weekTitle(w)
          return (
            <Semana
              key={w.index}
              title={title}
              stripLabel={weekStripLabel(w)}
              days={deLosDias(w.days)}
              direction={direction}
              firstColumn={(w.days[0] ?? w.firstDay) - w.firstDay}
              {...(elige
                ? {
                    select: (titleId: string) => (
                      <Field
                        kind="select"
                        id={`${titleId}-block`}
                        label={title}
                        labelledBy={titleId}
                        value={block ?? ''}
                        onChange={(v) => onBlock(w.index, v === '' ? null : (v as CoachBlock))}
                        options={[
                          { value: '', label: sinBloque.option },
                          ...BLOCKS.map((b) => ({ value: b, label: BLOCK_WORD[b] })),
                        ]}
                        help={block === null ? sinBloque.why : BLOCK_WHY[block]}
                        layout="min-w-0 flex-1 basis-48"
                      />
                    ),
                  }
                : {})}
            />
          )
        })}
        {calendar.after !== null && (
          <Semana
            title={afterTitle(calendar.after, draft.mode)}
            stripLabel={afterStripLabel(calendar.after)}
            days={deLosDias(calendar.after.days)}
            direction={direction}
            firstColumn={0}
          />
        )}
      </ol>

      {elige && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Field
            kind="select"
            id={focusId}
            label="Emphasis"
            inline
            value={draft.focusAttr ?? ''}
            onChange={(v) => onFocus(v === '' ? null : (v as Attribute))}
            options={[
              { value: '', label: 'My strength' },
              ...ATTRIBUTES.map((a) => ({ value: a, label: ATTRIBUTE_LABELS[a] })),
            ]}
            layout="min-w-0 flex-1 basis-56"
          />
          <Field
            kind="select"
            id={intensityId}
            label="Intensity"
            inline
            value={draft.intensity ?? 'normal'}
            onChange={(v) => onIntensity(v as Intensity)}
            options={INTENSITIES.map((i) => ({ value: i, label: INTENSITY_LABELS[i] }))}
            layout="min-w-0 flex-1 basis-56"
          />
        </div>
      )}

      <Meter
        label="Load this month"
        value={carga}
        {...(carga === null ? {} : { valueText: LOAD_WORD[carga].toLowerCase() })}
      />

      {elige && canStartFresh && !draft.startFresh && (
        <Button variant="quiet" onClick={onStartFresh} layout="-ml-4 self-start">
          Start a new plan tomorrow
        </Button>
      )}
      {/* Empezar de cero se deshace como cualquier otro cambio sin guardar. */}
      {elige && draft.startFresh && livePlanStart !== null && (
        <Button variant="quiet" onClick={onKeepPlan} layout="-ml-4 self-start">
          {`Keep your plan from Day ${seasonPosition(livePlanStart).dayOfSeason}`}
        </Button>
      )}
    </div>
  )
}
