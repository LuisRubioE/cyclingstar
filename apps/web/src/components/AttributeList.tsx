import {
  ATTRIBUTES,
  ATTRIBUTE_DESCRIPTIONS,
  ATTRIBUTE_LABELS,
  type Attribute,
  SESSION_CATALOG,
  attrProgress,
  attrStars,
  sessionsForAttribute,
  trendArrow,
} from '@cyclingstar/shared'
import { useState } from 'react'
import { StarRating } from './StarRating'

/** What the coach thinks you can reach. Deliberately vague: it's an opinion, not your ceiling. */
export type CeilingOpinion = 'tres' | 'cuatro' | 'cinco'

const OPINION_TEXT: Record<CeilingOpinion, string> = {
  tres: "I don't see you going past 3★ here",
  cuatro: 'You could reach 4★ here',
  cinco: "There's 5★ material in this one",
}

/**
 * The extra layer that only YOUR OWN sheet gets (docs/entrenamiento.md §2.3): the progress mark
 * inside the band, the 28-day trend arrow and the coach's opinion. Other riders' profiles show
 * stars and nothing else — scouting someone else's potential isn't a thing you can do yet.
 */
export interface AttributeDetail {
  /** Δ over the last 28 days, per attribute. Missing means it didn't move. */
  trend?: Partial<Record<Attribute, number>>
  opinion?: Partial<Record<Attribute, CeilingOpinion>>
}

/**
 * Four segments under the stars: which quarter of its band the attribute sits in.
 *
 * Four and not a continuous bar, on purpose: a continuous bar over a 16-point band would resolve
 * the attribute to under half a point, which is more resolution than the half-stars themselves and
 * amounts to showing the internal number through the back door.
 */
function ProgressMark({ value }: { value: number }) {
  const filled = attrProgress(value)
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

function TrendArrow({ delta28 }: { delta28: number }) {
  const arrow = trendArrow(delta28)
  const tone =
    arrow === '↑' || arrow === '↗'
      ? 'text-emerald-500'
      : arrow === '↓' || arrow === '↘'
        ? 'text-rose-400'
        : 'text-slate-300'
  const words =
    arrow === '↑'
      ? 'Improving fast'
      : arrow === '↗'
        ? 'Improving'
        : arrow === '→'
          ? 'Steady'
          : arrow === '↘'
            ? 'Slipping'
            : 'Slipping fast'
  return (
    <span className={`text-xs ${tone}`} title={`${words} (last 28 days)`} aria-label={words}>
      {arrow}
    </span>
  )
}

/**
 * Attribute list with click-to-expand help (#8): tap an attribute to read what it is, what it's
 * for and which training sessions improve it. TAC also learns from racing.
 */
export function AttributeList({
  attributes,
  detail,
}: {
  attributes: Record<Attribute, number>
  detail?: AttributeDetail
}) {
  const [open, setOpen] = useState<Attribute | null>(null)

  return (
    <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
      {ATTRIBUTES.map((attr) => {
        const isOpen = open === attr
        const value = attributes[attr] ?? 0
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
                {detail && <TrendArrow delta28={detail.trend?.[attr] ?? 0} />}
                <span className="flex flex-col items-end gap-[3px]">
                  <StarRating value={attrStars(value)} />
                  {detail && <ProgressMark value={value} />}
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
                    {OPINION_TEXT[opinion]}
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
