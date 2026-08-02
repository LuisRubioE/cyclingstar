import {
  ATTRIBUTES,
  ATTRIBUTE_DESCRIPTIONS,
  ATTRIBUTE_LABELS,
  type Attribute,
  SESSION_CATALOG,
  sessionsForAttribute,
  stars,
} from '@cyclingstar/shared'
import { useState } from 'react'
import { StarRating } from './StarRating'

/**
 * Attribute list with click-to-expand help (#8): tap an attribute to read what it is, what it's
 * for and which training sessions improve it. TAC also learns from racing.
 */
export function AttributeList({ attributes }: { attributes: Record<Attribute, number> }) {
  const [open, setOpen] = useState<Attribute | null>(null)

  return (
    <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
      {ATTRIBUTES.map((attr) => {
        const isOpen = open === attr
        const trainedBy = sessionsForAttribute(attr).map((s) => SESSION_CATALOG[s].label)
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
              <dd>
                <StarRating value={stars(attributes[attr] ?? 0)} />
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
              </div>
            )}
          </div>
        )
      })}
    </dl>
  )
}
