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
      champions: {},
      results: [],
    }
    expect(text(<StageReportView data={data} onWatchAnyway={() => undefined} />)).toContain(
      'Watch anyway',
    )
    expect(text(<StageReportView data={data} />)).not.toContain('Watch anyway')
  })

  // W4: el porqué de los maillots del orden de llegada, que vivía en la crónica (`On the road today`),
  // pasa al título del resultado, y solo cuando en la carretera había maillots (no en la etapa 1).
  it('el título del resultado explica sus maillots de la carretera, solo si los había (W4)', () => {
    const base: StageReplay = {
      day: 7,
      name: 'Stage 7 · Summit finish',
      km: 187,
      run: true,
      altimetry: '<svg/>',
      champions: {},
      results: [
        {
          riderId: 'r1',
          name: 'Corredor r1',
          country: 'ES',
          dnf: false,
          reason: null,
          teamId: 'team-r1',
          teamName: 'Equipo r1',
          isBot: true,
          puesto: 1,
          tiempoS: 3601,
          bonificacionS: 0,
          puntosVolante: 0,
          puntosMontana: 0,
        },
      ],
    }
    const leaders = (gc: string | null) => ({
      onRoad: { gc, points: null, kom: null, team: null },
      afterStage: { gc: null, points: null, kom: null, team: null },
    })
    const con = html(<StageReportView data={{ ...base, leaders: leaders('r1') }} />)
    expect(con).toContain('About the jerseys on the road')
    expect(con).toContain('the standings after it are in')
    for (const data of [base, { ...base, leaders: leaders(null) }])
      expect(html(<StageReportView data={data} />)).not.toContain('About the jerseys on the road')
  })

  // Re-sellado en W4 (la revisión de `Watch` del dueño; D-16 revocada): sin la crónica, la fila de saltos
  // pierde `Chronicle`, y solo sale si hay adónde saltar fuera del resultado, las clasificaciones.
  it('el acta, con su fila de saltos: Result y Classifications, sin Chronicle desde W4 (E3, §14.6; 14-c)', () => {
    const data: StageReplay = {
      day: 7,
      name: 'Stage 7 · Summit finish',
      km: 187,
      run: true,
      altimetry: '<svg/>',
      champions: {},
      results: [],
    }
    const markup = html(
      <StageReportView
        data={data}
        classificationsHref="/world/races/race-france/stages/7?tab=classifications"
      />,
    )
    const jumps = [...markup.matchAll(/data-ui="TextLink"[^>]*href="([^"]+)"[^>]*>([^<]+)</g)].map(
      (m) => [m[1], m[2]],
    )
    expect(jumps).toEqual([
      ['/#stage-result', 'Result'],
      ['/world/races/race-france/stages/7?tab=classifications', 'Classifications'],
    ])
    expect(markup).toContain('id="stage-result"')
    expect(markup).not.toContain('stage-chronicle')
    expect(markup).not.toContain('Chronicle')
    // sin la pestaña de clasificaciones no hay adónde saltar: ni la fila
    const solo = html(<StageReportView data={data} />)
    expect(solo).not.toContain('>Classifications<')
    expect(solo).not.toContain('Report sections')
    // y un salto no pierde la pestaña ni la búsqueda de la página
    const inTab = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/world/races/race-france/stages/7?tab=report']}>
        <StageReportView
          data={data}
          classificationsHref="/world/races/race-france/stages/7?tab=classifications"
        />
      </MemoryRouter>,
    )
    expect(inTab).toContain('href="/world/races/race-france/stages/7?tab=report#stage-result"')
  })
})

describe('dos dispositivos y el modo diagnóstico en pantalla (D-57, §11.15)', () => {
  it('la etapa vista en otro dispositivo: lo dice, sin saltar al acta', () => {
    const t = text(
      <TwoDeviceNotice onWatchAnyway={() => undefined} onShowReport={() => undefined} />,
    )
    // RE-SELLADO EN EL PR 20 (E3, docs/visual.md §14.6): el aviso es un `Notice` con su título en su
    // renglón, así que el `·` de detrás del título se va; los textos son los mismos
    expect(t).toMatch(/You finished this stage on another device Watch anyway · Show report/)
  })

  it('la franja del modo diagnóstico', () => {
    expect(text(<DiagnosticStrip exitHref="/world/races/race-france/stages/7" />)).toContain(
      'Diagnostic view · not counted as watched',
    )
  })
})

/**
 * LA PUERTA CON EL CATÁLOGO (E3, docs/visual.md §14.6; Rcobertura-038; PR 20): la tarjeta, la confirmación,
 * los dos dispositivos y el modo diagnóstico toman el aspecto de `Notice` y de `Button`, sin cambiar su
 * lógica ni sus textos, y con sus papeles de hoy (la región, el diálogo, `status` y `note`).
 */
describe('la puerta con el catálogo (§14.6)', () => {
  /** Los botones del catálogo, con su variante y su texto. */
  const buttons = (markup: string): string[][] =>
    [
      ...markup.matchAll(/data-ui="Button" data-variant="(\w+)"[^>]*>([\s\S]*?)<\/(?:a|button)>/g),
    ].map((m) => [
      m[1]!,
      m[2]!
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    ])

  it('la tarjeta: un Notice en su región, con Watch primary y Show result secondary', () => {
    const markup = html(card())
    expect(markup).toMatch(/<div[^>]*role="region"[^>]*aria-label="Not watched yet"/)
    expect(markup).toContain('data-ui="Notice"')
    expect(buttons(markup)).toEqual([
      ['primary', 'Watch'],
      ['secondary', 'Show result'],
    ])
  })

  it('la confirmación: un Notice en su diálogo; Show result primary y Cancel secondary', () => {
    const markup = html(
      <RevealConfirm
        stageDay={7}
        also={[]}
        busy={false}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    )
    expect(markup).toMatch(/^<div[^>]*role="dialog"[^>]*aria-label="Show the result"/)
    expect(markup).toContain('data-ui="Notice"')
    expect(buttons(markup)).toEqual([
      ['primary', 'Show result'],
      ['secondary', 'Cancel'],
    ])
  })

  it('dos dispositivos: un Notice info que se anuncia, con sus dos salidas en quiet', () => {
    const markup = html(
      <TwoDeviceNotice onWatchAnyway={() => undefined} onShowReport={() => undefined} />,
    )
    expect(markup).toMatch(/data-ui="Notice" data-variant="info"[^>]*role="status"/)
    expect(buttons(markup)).toEqual([
      ['quiet', 'Watch anyway'],
      ['quiet', 'Show report'],
    ])
  })

  it('el modo diagnóstico: un Notice warn, con Exit, encima de las pestañas', () => {
    const markup = html(<DiagnosticStrip exitHref="/world/races/race-france/stages/7" />)
    expect(markup).toMatch(/data-ui="Notice" data-variant="warn"[^>]*role="note"/)
    expect(markup).toContain('href="/world/races/race-france/stages/7"')
    expect(buttons(markup)).toEqual([['quiet', 'Exit']])
  })
})
