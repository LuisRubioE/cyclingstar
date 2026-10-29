import {
  type BibStyle,
  KIT_PX,
  type KitBigSize,
  type KitCode,
  type KitView,
} from '@cyclingstar/shared'
import { type ReactNode, useId, useState } from 'react'
import { Kit } from './Kit'
import type { KitSponsors } from './kitText'
import { LegacyJersey } from './LegacyJersey'
import { Sheet } from './Sheet'
import { FOCUS, withLayout } from './styles'
import { Tabs, tabId } from './Tabs'
import type { WornTeam } from './TeamJersey'
import type { Layout } from './types'

/**
 * EL MAILLOT EN GRANDE (E3, docs/visual.md §4.4 y §8.10; PR 17c; 8-w). Las tres vistas en `Tabs` `page`,
 * `Front`, `Back` y `Shorts`, sobre un `Kit` de 160 con su `view`; el maillot es un `button` que abre la
 * `Sheet` con el mismo a 320 y las mismas pestañas. Lo que va a la derecha del maillot (en la ficha del
 * equipo, los puntos, el presupuesto y el maillot en palabras) lo pone quien lo pinta. La espalda del
 * equipo lleva su sitio del dorsal libre, sin número (§8.10). Sin maillot guardado, `hidden`: el dibujo
 * de antes de la traducción (`LegacyJersey`), solo por delante y sin pestañas.
 */

export interface KitShowcaseProps {
  /** el equipo y su maillot, o la semilla de su dibujo de antes (§8.6) */
  readonly team: WornTeam
  readonly bib: BibStyle
  readonly sponsors?: KitSponsors
  /** lo que va a la derecha del maillot, en `meta` `ink-2` */
  readonly children?: ReactNode
  readonly layout?: Layout
}

/** Las tres vistas (pantalla). */
export const KIT_VIEW_TABS = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'bib', label: 'Shorts' },
] as const satisfies readonly { readonly key: KitView; readonly label: string }[]

export const SHOW_FULL_SCREEN = 'Show the kit full screen'

/** El `Kit` de una vista a uno de los dos tamaños grandes. */
export function BigKit({
  code,
  teamName,
  view,
  size,
  bib,
  sponsors,
}: {
  readonly code: KitCode
  readonly teamName: string
  readonly view: KitView
  readonly size: KitBigSize
  readonly bib: BibStyle
  readonly sponsors: KitSponsors | undefined
}) {
  const extra = sponsors === undefined ? {} : { sponsors }
  if (view === 'back')
    return <Kit code={code} teamName={teamName} view="back" size={size} {...extra} />
  if (view === 'bib')
    return <Kit code={code} teamName={teamName} view="bib" size={size} bib={bib} {...extra} />
  return <Kit code={code} teamName={teamName} size={size} {...extra} />
}

/**
 * La hoja del maillot a 320, con las mismas pestañas que la vista de 160 y la misma vista elegida: lo que
 * abre `KitShowcase` al tocar el maillot.
 */
export function KitSheet({
  code,
  teamName,
  bib,
  sponsors,
  view,
  onView,
  open,
  onClose,
}: {
  readonly code: KitCode
  readonly teamName: string
  readonly bib: BibStyle
  readonly sponsors: KitSponsors | undefined
  readonly view: KitView
  readonly onView: (view: KitView) => void
  readonly open: boolean
  readonly onClose: () => void
}) {
  const panelId = useId()
  return (
    <Sheet open={open} title={`${teamName} kit`} onClose={onClose}>
      <Tabs
        label="Kit views"
        options={KIT_VIEW_TABS}
        value={view}
        onChange={onView}
        panelId={panelId}
        layout="mx-3"
      />
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(panelId, view)}
        className="flex justify-center pt-3"
      >
        <BigKit
          code={code}
          teamName={teamName}
          view={view}
          size={KIT_PX.poster}
          bib={bib}
          sponsors={sponsors}
        />
      </div>
    </Sheet>
  )
}

export function KitShowcase({ team, bib, sponsors, children, layout }: KitShowcaseProps) {
  const [view, setView] = useState<KitView>('front')
  const [full, setFull] = useState(false)
  const panelId = useId()
  const aside =
    children === undefined ? null : (
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-meta text-ink-2">{children}</div>
    )

  if (!('kit' in team))
    return (
      <div
        data-ui="KitShowcase"
        data-variant="default"
        data-state="hidden"
        className={withLayout('flex items-start gap-3', layout)}
      >
        <LegacyJersey seed={team.legacySeed} size={KIT_PX.showcase} team={team.name} />
        {aside}
      </div>
    )

  return (
    <div
      data-ui="KitShowcase"
      data-variant="default"
      data-state="ready"
      className={withLayout('flex flex-col gap-2', layout)}
    >
      <Tabs
        label="Kit views"
        options={KIT_VIEW_TABS}
        value={view}
        onChange={setView}
        panelId={panelId}
      />
      <div className="flex items-start gap-3">
        <div id={panelId} role="tabpanel" aria-labelledby={tabId(panelId, view)}>
          <button
            type="button"
            aria-label={SHOW_FULL_SCREEN}
            onClick={() => setFull(true)}
            className={`block rounded-ui ${FOCUS}`}
          >
            <BigKit
              code={team.kit}
              teamName={team.name}
              view={view}
              size={KIT_PX.showcase}
              bib={bib}
              sponsors={sponsors}
            />
          </button>
        </div>
        {aside}
      </div>
      <KitSheet
        code={team.kit}
        teamName={team.name}
        bib={bib}
        sponsors={sponsors}
        view={view}
        onView={setView}
        open={full}
        onClose={() => setFull(false)}
      />
    </div>
  )
}
