import type { StageGate, StageReplay } from '@cyclingstar/shared'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { StageReportView } from '../pages/StageReplay'
import {
  DiagnosticStrip,
  type RevealActions,
  RevealConfirm,
  StageGateCard,
  TwoDeviceNotice,
} from './StageGate'

/**
 * EL RENDER DE LA PUERTA Y DE REVELAR SIN CASTIGO (E2, docs/retransmision.md §11.10 a §11.12, §11.15 y
 * §16.6; D-37, D-38, D-40, D-57, DD-17; paso 9a). Render estático, como los demás tests de la web: las
 * palabras de pantalla de la puerta (`This page shows the result of Stage 7. Watch it instead?`, `You
 * haven't watched stage 6 yet`), de la confirmación (`Show the result of Stage 7? You won't be able to
 * watch it without knowing.`, `Don't ask again`), del acta revelada (`Watch anyway`), de los dos
 * dispositivos (`You finished this stage on another device · Watch anyway · Show report`) y del modo
 * diagnóstico, que solo ve un administrador.
 */

function html(node: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}
/** El texto que se lee, sin etiquetas ni entidades de los apóstrofos. */
function text(node: ReactElement): string {
  return html(node)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
}

const actions: RevealActions = {
  reveal: async () => undefined,
  dontAskAgain: async () => undefined,
  askFirst: true,
}
const notSeen: StageGate = { k: 'not_seen' }
const previous: StageGate = { k: 'previous_unseen', firstUnseen: 6 }

function card(over: Partial<Parameters<typeof StageGateCard>[0]> = {}): ReactElement {
  return (
    <StageGateCard
      gate={notSeen}
      stageDay={7}
      place="result"
      raceId="race-france"
      watchOn
      watchable
      onWatch={() => undefined}
      actions={actions}
      signIn={false}
      diagHref={null}
      {...over}
    />
  )
}

describe('StageGateCard: la puerta (§11.10, §11.12)', () => {
  it('en lo que enseña el resultado: ver en lugar de leer, o revelar', () => {
    const t = text(card())
    expect(t).toContain('This page shows the result of Stage 7. Watch it instead?')
    expect(t).toContain('Watch')
    expect(t).toContain('Show result')
    expect(t).not.toContain('Diagnostic view')
  })

  it('sin Watch para la etapa (una crono sin línea), no ofrece verla', () => {
    const t = text(card({ watchable: false }))
    expect(t).toContain('This page shows the result of Stage 7.')
    expect(t).not.toContain('Watch it instead?')
    expect(t).toContain('Show result')
  })

  it('en Watch, con la anterior sin ver: verla o revelarla y seguir (§11.12)', () => {
    const markup = html(card({ gate: previous, place: 'watch' }))
    const t = text(card({ gate: previous, place: 'watch' }))
    expect(t).toContain("You haven't watched stage 6 yet")
    expect(t).toContain('Watch stage 6')
    expect(t).toContain('Show result of stage 6 and continue')
    expect(markup).toContain('href="/world/races/race-france/stages/6?tab=watch"')
  })

  it('en Watch, con la anterior sin ver, también Highlights of stage 6, que la abre en Highlights (§8.1; 10a)', () => {
    const markup = html(card({ gate: previous, place: 'watch' }))
    const t = text(card({ gate: previous, place: 'watch' }))
    expect(t).toMatch(/Watch stage 6 Highlights of stage 6 Show result of stage 6 and continue/)
    expect(markup).toContain(
      'href="/world/races/race-france/stages/6?tab=watch&amp;view=highlights"',
    )
    // sin Watch para quien mira, ni verla ni su resumen
    expect(text(card({ gate: previous, place: 'watch', watchOn: false }))).not.toContain(
      'Highlights',
    )
  })

  it('con la anterior sin ver, lo que enseña el resultado ofrece la anterior', () => {
    const t = text(card({ gate: { k: 'previous_unseen', firstUnseen: 4 } }))
    expect(t).toContain('This page shows the result of Stage 7. Watch it instead?')
    expect(t).toContain("You haven't watched stage 4 yet.")
    expect(t).toContain('Watch stage 4')
    expect(t).toContain('Show result')
  })

  it('el modo diagnóstico, solo para un administrador: el último y en pequeño (§11.15)', () => {
    const markup = html(card({ diagHref: '/world/races/race-france/stages/7?tab=report&diag=1' }))
    expect(markup).toContain('Diagnostic view')
    expect(markup).toContain('href="/world/races/race-france/stages/7?tab=report&amp;diag=1"')
    expect(markup.indexOf('Diagnostic view')).toBeGreaterThan(markup.indexOf('Show result'))
  })

  it('quien lee con cs_viewer sin sesión no puede revelar: Sign in to see results as you know them', () => {
    const t = text(card({ actions: null, signIn: true }))
    expect(t).toContain('Sign in to see results as you know them')
    expect(t).not.toContain('Show result')
  })
})

describe('revelar sin castigo (§11.11, DD-17)', () => {
  it('la confirmación: la pregunta, Don’t ask again y las dos salidas', () => {
    const t = text(
      <RevealConfirm
        stageDay={7}
        also={[]}
        busy={false}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    )
    expect(t).toContain(
      "Show the result of Stage 7? You won't be able to watch it without knowing.",
    )
    expect(t).toContain("Don't ask again")
    expect(t).toContain('Show result')
    expect(t).toContain('Cancel')
    expect(t).not.toContain('This also reveals')
  })

  it('si faltaban anteriores, lo dice antes de aceptar', () => {
    const t = text(
      <RevealConfirm
        stageDay={5}
        also={[3, 4]}
        busy={false}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    )
    expect(t).toContain('This also reveals stages 3 and 4.')
  })

  it('revelada, el acta deja verla igual: Watch anyway', () => {
    const data: StageReplay = {
      day: 7,
      name: 'Stage 7 · Summit finish',
      km: 187,
      run: true,
      altimetry: '<svg/>',
      results: [],
      chronicle: [],
    }
    expect(text(<StageReportView data={data} onWatchAnyway={() => undefined} />)).toContain(
      'Watch anyway',
    )
    expect(text(<StageReportView data={data} />)).not.toContain('Watch anyway')
  })
})

describe('dos dispositivos y el modo diagnóstico en pantalla (D-57, §11.15)', () => {
  it('la etapa vista en otro dispositivo: lo dice, sin saltar al acta', () => {
    const t = text(
      <TwoDeviceNotice onWatchAnyway={() => undefined} onShowReport={() => undefined} />,
    )
    expect(t).toMatch(/You finished this stage on another device · Watch anyway · Show report/)
  })

  it('la franja del modo diagnóstico', () => {
    expect(text(<DiagnosticStrip exitHref="/world/races/race-france/stages/7" />)).toContain(
      'Diagnostic view · not counted as watched',
    )
  })
})
