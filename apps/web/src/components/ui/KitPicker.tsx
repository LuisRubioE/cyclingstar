import {
  type BibStyle,
  KIT_COLORS,
  KIT_FIGURES,
  KIT_PX,
  type KitBlockedWhy,
  type KitCode,
  type KitColorName,
  type KitView,
  bibStylesFor,
  parseKit,
} from '@cyclingstar/shared'
import { type ReactNode, useId, useState } from 'react'
import {
  type CheckState,
  type KitDraft,
  type PickerState,
  SWATCH_REASON,
  type Swatch,
  type SwatchBlock,
  baseSwatches,
  draftCode,
  draftKit,
  secondarySwatches,
  verdictLine,
  withBase,
  withFigure,
  withSecondary,
} from '../../domain/kitPicker'
import {
  BIB_STYLE_LABEL,
  KIT_COLOR_LABEL,
  KIT_FIGURE_LABEL,
  bibWords,
  kitWords,
} from '../../domain/labels'
import { buttonClass } from './Button'
import { Chip } from './Chip'
import { ICONS } from './icons'
import { Kit } from './Kit'
import { KitShowcase } from './KitShowcase'
import { KIT_INK, KIT_WHITE } from './kitText'
import { Notice } from './Notice'
import { SkeletonBar } from './Skeleton'
import { FOCUS, withLayout } from './styles'
import type { WornTeam } from './TeamJersey'
import type { Layout } from './types'

/**
 * EL EDITOR DEL MAILLOT (E3, docs/visual.md §8.7; PR 18b; D-25, 8-u, D-00h, D-00k). El maillot del
 * borrador a 160 con sus tres vistas (`KitShowcase`), en palabras con su culote, el veredicto, en carrera a
 * 28 sobre claro y sobre oscuro, y debajo lo que se elige: las siete figuras en losetas de 72 con un `Kit`
 * de 40, las trece bases y los quince segundos colores en muestras de 44 con su nombre, y los culotes que
 * valen con ese maillot. La raíz es la respuesta de la pantalla 16 (`data-answer`, §7.3).
 *
 * La elegida lleva un anillo de 3 px en `ink` a 2 px de su borde y el `check` de 16 en su esquina, en
 * `white` con filo de 1 px en `kit-ink`; la que no se puede elegir con la figura y la base de ese momento,
 * una diagonal igual, y su porqué sale debajo al tocarla, nunca en un `title`. Ya cambiado el maillot esta
 * temporada, las losetas y las muestras se quedan quietas con su porqué; el culote no, porque no cuenta
 * (D-00k). Lo que se elige y el veredicto los lleva la página, que guarda todo con un solo botón (8-h).
 *
 * `readonly`, para quien mira sin ser el dueño: la vista y la carrera, nada que tocar.
 */

export interface KitPickerEditProps {
  readonly mode: 'edit'
  readonly teamName: string
  readonly draft: KitDraft
  readonly onDraft: (draft: KitDraft) => void
  /** el culote que se enseña y se guarda: `bibFor` del borrador y el elegido */
  readonly bib: BibStyle
  readonly onBib: (bib: BibStyle) => void
  /** lo que no se puede elegir, con su porqué (`options` de `GET /api/teams/me/kit`) */
  readonly blocked: ReadonlyMap<KitCode, KitBlockedWhy>
  /** si el borrador es el programado, su texto (`scheduledText`) */
  readonly scheduled: string | null
  readonly state: PickerState
  readonly check: CheckState
  readonly onRetry: () => void
  /** sin cambios que le queden esta temporada (D-00k): el porqué (`lockedText`) */
  readonly lockedReason: string | null
  readonly layout?: Layout
}

export interface KitPickerReadonlyProps {
  readonly mode: 'readonly'
  readonly team: WornTeam
  readonly bib: BibStyle
  readonly layout?: Layout
}

export type KitPickerProps = KitPickerEditProps | KitPickerReadonlyProps

/** Lo que lee quien no es el dueño (pantalla). */
export const READONLY_TEXT = "Only the team's manager can change the kit."
/** El fallo del veredicto (pantalla). */
export const CHECK_FAILED = "Couldn't check this kit."

/** El anillo de la elegida (8-u): 3 px en `ink`, a 2 px del borde, sobre `surface`. */
const RING = 'ring-3 ring-ink ring-offset-2 ring-offset-surface'

/** El `check` de la elegida, de 16, en su esquina de arriba a la derecha: `white` con filo de 1 px en `kit-ink`. */
function Check() {
  return (
    <svg
      data-check=""
      aria-hidden="true"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-0.5 top-0.5"
    >
      <g stroke={KIT_INK} strokeWidth={6}>
        {ICONS.check}
      </g>
      <g stroke={KIT_WHITE} strokeWidth={3}>
        {ICONS.check}
      </g>
    </svg>
  )
}

/** La tachadura (8-u): una diagonal de 2 px en `white` con filo de 1 px en `kit-ink`. */
function Strike() {
  return (
    <svg
      data-strike=""
      aria-hidden="true"
      viewBox="0 0 44 44"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <line x1="6" y1="38" x2="38" y2="6" stroke={KIT_INK} strokeWidth={4} strokeLinecap="round" />
      <line
        x1="6"
        y1="38"
        x2="38"
        y2="6"
        stroke={KIT_WHITE}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Un grupo de lo que se elige, con su título. */
function Group({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="grid gap-2">
      <h3 id={id} className="text-body font-semibold text-ink">
        {title}
      </h3>
      {children}
    </div>
  )
}

/** Lo que tiene cada botón que se elige: qué es, si es el elegido y si se puede tocar. */
function pickAttrs(
  kind: 'figure' | 'base' | 'secondary' | 'bib',
  value: string,
  selected: boolean,
  off: boolean,
) {
  return {
    type: 'button' as const,
    'data-pick': kind,
    'data-value': value,
    'data-state': selected ? 'active' : 'inactive',
    'aria-pressed': selected,
    ...(off ? { 'aria-disabled': true as const } : {}),
  }
}

/** Una muestra de 44 con su nombre en `caption`, y su borde `line-strong` (la `white` sobre `surface`). */
function SwatchButton({
  kind,
  swatch,
  locked,
  onPick,
  onBlocked,
}: {
  readonly kind: 'base' | 'secondary'
  readonly swatch: Swatch
  readonly locked: boolean
  readonly onPick: (color: KitColorName) => void
  readonly onBlocked: (why: SwatchBlock) => void
}) {
  const { color, selected, blocked } = swatch
  return (
    <button
      {...pickAttrs(kind, color, selected, locked || blocked !== null)}
      {...(blocked === null ? {} : { 'data-blocked': blocked })}
      onClick={() => {
        if (locked || selected) return
        if (blocked === null) onPick(color)
        else onBlocked(blocked)
      }}
      className={`flex w-14 flex-col items-center gap-1 rounded-ui ${FOCUS}`}
    >
      <span
        className={`relative inline-flex size-11 overflow-hidden rounded-ui border border-line-strong${selected ? ` ${RING}` : ''}`}
      >
        <svg aria-hidden="true" className="absolute inset-0 size-full">
          <rect width="100%" height="100%" fill={KIT_COLORS[color]} />
        </svg>
        {blocked !== null && <Strike />}
        {selected && <Check />}
      </span>
      <span className="text-caption text-ink-2">{KIT_COLOR_LABEL[color]}</span>
    </button>
  )
}

/**
 * Las muestras de la base o del segundo color, y el porqué de la última tachada que se tocó, debajo en
 * `meta`: un `status`, que se oye al tocarla.
 */
export function SwatchGroup({
  kind,
  title,
  swatches,
  locked,
  shown,
  onPick,
  onBlocked,
}: {
  readonly kind: 'base' | 'secondary'
  readonly title: string
  readonly swatches: readonly Swatch[]
  readonly locked: boolean
  readonly shown: SwatchBlock | null
  readonly onPick: (color: KitColorName) => void
  readonly onBlocked: (why: SwatchBlock) => void
}) {
  return (
    <Group title={title}>
      <div className="flex flex-wrap gap-1">
        {swatches.map((w) => (
          <SwatchButton
            key={w.color}
            kind={kind}
            swatch={w}
            locked={locked}
            onPick={onPick}
            onBlocked={onBlocked}
          />
        ))}
      </div>
      <p role="status" className="text-meta text-ink-2">
        {shown === null ? '' : SWATCH_REASON[shown]}
      </p>
    </Group>
  )
}

/** El maillot en carrera, a 28, sobre claro y sobre oscuro (§8.7): solo para la vista. */
function InARace({ code, teamName }: { readonly code: KitCode; readonly teamName: string }) {
  return (
    <div
      data-race=""
      aria-hidden="true"
      className="flex flex-wrap items-center gap-3 text-meta text-ink-2"
    >
      <span>In a race:</span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex rounded-ui bg-white p-1">
          <Kit code={code} teamName={teamName} size={KIT_PX.row} surface="light" />
        </span>
        on light
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex rounded-ui bg-navy-dark p-1">
          <Kit code={code} teamName={teamName} size={KIT_PX.row} surface="dark" />
        </span>
        on dark
      </span>
    </div>
  )
}

/**
 * La línea del veredicto: el porqué del bloqueo, el fallo con `Retry`, el esqueleto o el veredicto. Sola,
 * en `/_ui`, con cada estado de la tabla.
 */
export function KitVerdictLine({
  state,
  check,
  lockedReason,
  onRetry,
}: Pick<KitPickerEditProps, 'state' | 'check' | 'lockedReason' | 'onRetry'>) {
  if (lockedReason !== null) return <Notice tone="info" title={lockedReason} />
  if (check.status === 'error')
    return (
      <Notice
        tone="bad"
        role="alert"
        title={CHECK_FAILED}
        action={{ label: 'Retry', onClick: onRetry }}
      />
    )
  if (state === 'busy' || check.status === 'busy') return <SkeletonBar size="line" />
  if (check.status === 'idle') return null
  const v = verdictLine(check.verdict)
  return <Notice tone={v.tone} role="status" title={v.text} />
}

function Editor(props: KitPickerEditProps) {
  const { teamName, draft, onDraft, bib, onBib, blocked, scheduled, state, lockedReason, layout } =
    props
  const [view, setView] = useState<KitView>('front')
  const [shown, setShown] = useState<{
    readonly kind: 'base' | 'secondary'
    readonly why: SwatchBlock
  } | null>(null)
  const locked = lockedReason !== null
  const kit = draftKit(draft)
  const code = draftCode(draft)
  const pick = (next: KitDraft) => {
    setShown(null)
    if (view === 'bib') setView('front')
    onDraft(next)
  }

  return (
    <div
      data-ui="KitPicker"
      data-variant="edit"
      data-state={state}
      data-answer=""
      className={withLayout('grid gap-4', layout)}
    >
      <div className="grid gap-2">
        <KitShowcase
          team={{ name: teamName, kit: code }}
          bib={bib}
          view={view}
          onViewChange={setView}
        />
        <p className="text-meta text-ink-2">
          {kitWords(kit)} · {bibWords(kit, bib)}
        </p>
        {scheduled !== null && (
          <span>
            <Chip tone="neutral">{scheduled}</Chip>
          </span>
        )}
        <KitVerdictLine {...props} />
        <InARace code={code} teamName={teamName} />
      </div>

      <Group title="Figure">
        <div className="flex flex-wrap gap-3">
          {KIT_FIGURES.map((f) => {
            const selected = f === draft.figure
            return (
              <button
                key={f}
                {...pickAttrs('figure', f, selected, locked)}
                onClick={locked || selected ? undefined : () => pick(withFigure(draft, f))}
                className={`relative flex min-h-18 w-18 flex-col items-center justify-center gap-0.5 rounded-ui border border-line bg-surface${selected ? ` ${RING}` : ''} ${FOCUS}`}
              >
                <span aria-hidden="true" className="inline-flex">
                  <Kit
                    code={draftCode(withFigure(draft, f))}
                    teamName={teamName}
                    size={KIT_PX.card}
                  />
                </span>
                <span className="text-caption text-ink">{KIT_FIGURE_LABEL[f]}</span>
                {selected && <Check />}
              </button>
            )
          })}
        </div>
      </Group>

      <SwatchGroup
        kind="base"
        title="Main colour"
        swatches={baseSwatches(draft, blocked)}
        locked={locked}
        shown={shown?.kind === 'base' ? shown.why : null}
        onPick={(color) => {
          if (color !== 'yellow' && color !== 'white') pick(withBase(draft, color))
        }}
        onBlocked={(why) => setShown({ kind: 'base', why })}
      />
      {draft.figure !== 'plain' && (
        <SwatchGroup
          kind="secondary"
          title="Second colour"
          swatches={secondarySwatches(draft, blocked)}
          locked={locked}
          shown={shown?.kind === 'secondary' ? shown.why : null}
          onPick={(color) => pick(withSecondary(draft, color))}
          onBlocked={(why) => setShown({ kind: 'secondary', why })}
        />
      )}

      <Group title="Shorts">
        <div className="grid grid-cols-2 gap-2">
          {bibStylesFor(kit).map((b) => {
            const selected = b === bib
            return (
              <button
                key={b}
                {...pickAttrs('bib', b, selected, false)}
                onClick={
                  selected
                    ? undefined
                    : () => {
                        onBib(b)
                        setView('bib')
                      }
                }
                className={`${buttonClass({ variant: 'secondary', size: 'default', iconOnly: false, disabled: false })} text-center${selected ? ` ${RING}` : ''}`}
              >
                {BIB_STYLE_LABEL[b]}
                {selected && <Check />}
              </button>
            )
          })}
        </div>
      </Group>
    </div>
  )
}

function Readonly({ team, bib, layout }: KitPickerReadonlyProps) {
  const kit = 'kit' in team ? parseKit(team.kit) : null
  return (
    <div
      data-ui="KitPicker"
      data-variant="readonly"
      data-state="readonly"
      data-answer=""
      className={withLayout('grid gap-2', layout)}
    >
      <KitShowcase team={team} bib={bib} />
      {kit !== null && (
        <p className="text-meta text-ink-2">
          {kitWords(kit)} · {bibWords(kit, bib)}
        </p>
      )}
      {'kit' in team && <InARace code={team.kit} teamName={team.name} />}
      <p className="text-meta text-ink-2">{READONLY_TEXT}</p>
    </div>
  )
}

export function KitPicker(props: KitPickerProps) {
  return props.mode === 'readonly' ? <Readonly {...props} /> : <Editor {...props} />
}
