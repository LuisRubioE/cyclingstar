import {
  ATTRIBUTES,
  ATTRIBUTE_DESCRIPTIONS,
  ATTRIBUTE_LABELS,
  type Attribute,
  type CeilingOpinion,
  SESSION_CATALOG,
  type TrendCode,
  sessionsForAttribute,
} from '@cyclingstar/shared'
import { useState } from 'react'
import { COACH_OPINION_TEXT } from '../domain/coachOpinion'
import { TREND_WORD } from '../domain/words'
import { StarRating } from './StarRating'
import { Icon } from './ui/Icon'

/**
 * The extra layer that only YOUR OWN sheet gets (docs/entrenamiento.md §2.3): the progress mark
 * inside the band, the 28-day trend arrow and the coach's opinion. Other riders' profiles show
 * stars and nothing else — scouting someone else's potential isn't a thing you can do yet.
 */
export interface AttributeDetail {
  /**
   * The 28-day arrow per attribute, as the code `GET /trend` sends (E3, 13-a): the Δ it comes from stays on
   * the server. Missing means it didn't move.
   */
  trend?: Partial<Record<Attribute, TrendCode>>
  /**
   * What the coach makes of each attribute: RELATIVE to the rest of this rider, and vaguer the less
   * he knows him (docs/agenda.md §4.20). Never a level, never stars.
   */
  opinion?: Partial<Record<Attribute, CeilingOpinion>>
}

/**
 * Four segments under the stars: which quarter of its band the attribute sits in, as the API sends it
 * (`mark`, 0 to 3; E3, 13-b).
 *
 * Four and not a continuous bar, on purpose: a continuous bar over a 16-point band would resolve
 * the attribute to under half a point, which is more resolution than the half-stars themselves and
 * amounts to showing the internal number through the back door.
 */
function ProgressMark({ mark }: { mark: number }) {
  const filled = mark
  return (
    <span className="flex gap-[2px]" aria-label={`${filled + 1} of 4 through this band`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-[3px] w-2.5 rounded-full ${i <= filled ? 'bg-amber-400' : 'bg-slate-200'}`}
        />
      ))}
    </span>
  )
}

/** How far the `trend` icon turns for each code: up, up the diagonal, flat, down the diagonal, down. */
const TREND_TURN: Readonly<Record<TrendCode, -90 | -45 | 0 | 45 | 90>> = {
  sube_mucho: -90,
  sube: -45,
  igual: 0,
  baja: 45,
  baja_mucho: 90,
}

/** The 28-day arrow: the `trend` icon turned for its code, with its words (E3, 13-a). */
function TrendArrow({ code }: { code: TrendCode }) {
  const tone =
    code === 'sube_mucho' || code === 'sube'
      ? 'text-emerald-500'
      : code === 'baja_mucho' || code === 'baja'
        ? 'text-rose-400'
        : 'text-slate-300'
  const words = TREND_WORD[code]
  return (
    <span className={tone} title={`${words} (last 28 days)`}>
      <Icon name="trend" size={16} turn={TREND_TURN[code]} label={words} />
    </span>
  )
}

/**
 * Attribute list with click-to-expand help (#8): tap an attribute to read what it is, what it's
 * for and which training sessions improve it. TAC also learns from racing. The stars, and the mark of
 * your own rider, come from the API already in their screen form (E3, §13.5): the value they come from
 * never reaches the browser.
 */
export function AttributeList({
  attributes,
  detail,
}: {
  attributes: Readonly<Record<Attribute, { readonly stars: number; readonly mark?: number }>>
  detail?: AttributeDetail
}) {
  const [open, setOpen] = useState<Attribute | null>(null)

  return (
    <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
      {ATTRIBUTES.map((attr) => {
        const isOpen = open === attr
        const { stars, mark } = attributes[attr]
        const trainedBy = sessionsForAttribute(attr).map((s) => SESSION_CATALOG[s].label)
        const opinion = detail?.opinion?.[attr]
        return (
          <div key={attr} className="sm:contents">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : attr)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 rounded-lg py-2 text-left transition hover:bg-slate-50"
            >
              <dt className="flex items-center gap-1.5 text-sm text-slate-600">
                {ATTRIBUTE_LABELS[attr]}
                <span className="text-xs text-slate-300" aria-hidden>
                  {isOpen ? '▲' : 'ⓘ'}
                </span>
              </dt>
              <dd className="flex items-center gap-2">
                {detail && <TrendArrow code={detail.trend?.[attr] ?? 'igual'} />}
                <span className="flex flex-col items-end gap-[3px]">
                  <StarRating value={stars} />
                  {detail && mark !== undefined && <ProgressMark mark={mark} />}
                </span>
              </dd>
            </button>
            {isOpen && (
              <div className="mb-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 sm:col-span-2">
                <p>{ATTRIBUTE_DESCRIPTIONS[attr]}</p>
                <p className="mt-2 text-slate-500">
                  <span className="font-medium text-slate-600">Improve with: </span>
                  {trainedBy.length > 0 ? trainedBy.join(', ') : 'racing experience'}
                  {attr === 'TAC' && trainedBy.length > 0 && ', and racing'}
                </p>
                {opinion && (
                  <p className="mt-2 italic text-slate-500">
                    <span className="not-italic font-medium text-slate-600">Coach: </span>
                    {COACH_OPINION_TEXT[opinion]}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </dl>
  )
}
