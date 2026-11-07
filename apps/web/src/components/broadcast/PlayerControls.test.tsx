import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CLOCK_JUMP_LABEL,
  type ControlsState,
  type JumpOption,
  PlayerControls,
  PlayerSheet,
  ROAD_JUMP_LABEL,
} from './PlayerControls'

/**
 * LOS MANDOS A 360 PX (docs/retransmision.md §8.5, §8.12, 8-o y 8-p; paso 10a), en estático con
 * `renderToStaticMarkup`, sin un DOM de mentira (§8.12). «A 360 px» es lo que se ve por debajo de `sm`
 * (640 px): lo que lleva la clase `hidden` (o va dentro de algo que la lleva) no se ve, y las clases `sm:`
 * no cuentan. Que nada se salga de la fila a 360 px de verdad no lo ve un render estático: es del paso 10
 * a mano (§18.5).
 */

/**
 * Los botones del HTML, por orden, con su nombre y si se ven a 360 px (ni él ni ninguno de sus padres lleva
 * `hidden`). RE-SELLADO EN EL PR 20 (E3, docs/visual.md §14.6 y §16.3): el nombre era el texto, `❚❚`, `▶︎`
 * y `⋯`; desde que son los iconos `pause`, `play` y `more`, que `ui/10` pide en lugar de los glifos, un
 * botón sin texto se nombra por su `aria-label`, que es lo que lee el lector.
 */
function buttonsOf(markup: string): { text: string; mobile: boolean; attrs: string }[] {
  const out: { text: string; mobile: boolean; attrs: string }[] = []
  const stack: boolean[] = []
  const tag = /<(\/?)([a-z]+)([^>]*?)(\/?)>/g
  let m: RegExpExecArray | null
  let open: { attrs: string; from: number; hidden: boolean } | null = null
  while ((m = tag.exec(markup)) !== null) {
    const [whole, closing, name, attrs = '', selfClosing] = m
    if (closing === '/') {
      stack.pop()
      if (name === 'button' && open !== null) {
        out.push({
          text:
            markup
              .slice(open.from, m.index)
              .replace(/<[^>]+>/g, '')
              .trim() ||
            (/ aria-label="([^"]*)"/.exec(open.attrs)?.[1] ?? ''),
          mobile: !open.hidden,
          attrs: open.attrs,
        })
        open = null
      }
      continue
    }
    const cls = / class="([^"]*)"/.exec(attrs)?.[1]?.split(/\s+/) ?? []
    const hidden = (stack.at(-1) ?? false) || cls.includes('hidden')
    if (selfClosing === '/') continue
    stack.push(hidden)
    if (name === 'button') open = { attrs, from: m.index + whole.length, hidden }
  }
  return out
}

/**
 * Apagado, como todo `Button` del catálogo: `aria-disabled`, nunca `disabled`, con su porqué (§4.1); en la barra,
 * solo para el lector (`reasonHidden`, PR 21n).
 */
const disabled = (attrs: string): boolean => / aria-disabled="true"/.test(attrs)

/** El porqué de un mando apagado: el texto que nombra su `aria-describedby`, y si se ve (`hidden`, revisión del 21n). */
function porque(markup: string, attrs: string): { texto: string; oculto: boolean } | null {
  const id = / aria-describedby="([^"]+)"/.exec(attrs)?.[1]
  if (id === undefined) return null
  const m = new RegExp(`<span id="${id}"( hidden="")?(?: class="[^"]*")?>([^<]*)</span>`).exec(
    markup,
  )
  return m === null ? null : { texto: m[2] ?? '', oculto: m[1] !== undefined }
}

const mobileRow = (markup: string): string[] =>
  buttonsOf(markup)
    .filter((b) => b.mobile)
    .map((b) => b.text)

const PLAYING: ControlsState = {
  phase: 'playing',
  view: 'watch',
  speed: 1,
  nextAction: false,
  lastKm: false,
  notice: null,
  hidden: false,
}

const ROAD: readonly JumpOption[] = [
  { id: 'back5', label: ROAD_JUMP_LABEL.back5, enabled: true },
  { id: 'fwd5', label: ROAD_JUMP_LABEL.fwd5, enabled: true },
  { id: 'nextClimb', label: ROAD_JUMP_LABEL.nextClimb, enabled: false },
  { id: 'final20', label: ROAD_JUMP_LABEL.final20, enabled: true },
  { id: 'lastKm', label: ROAD_JUMP_LABEL.lastKm, enabled: true },
]

const noop = (): void => {}

function controls(
  state: Partial<ControlsState> = {},
  canShowResult = true,
  bar: ReactElement | null = null,
): string {
  const el: ReactElement = (
    <PlayerControls
      state={{ ...PLAYING, ...state }}
      jumps={ROAD}
      canShowResult={canShowResult}
      bar={bar}
      closingCaptionId="w3-cierre"
      onPlay={noop}
      onPause={noop}
      onSpeed={noop}
      onNextAction={noop}
      onJump={noop}
      onView={noop}
      onShowResult={noop}
      onRetry={noop}
    />
  )
  return renderToStaticMarkup(el)
}

describe('PlayerControls a 360 px (8-p, §8.12)', () => {
  it('la fila lleva Pause, ×1, Next action y More, por ese orden; las cuatro velocidades son de escritorio', () => {
    const markup = controls()
    expect(mobileRow(markup)).toEqual(['Pause', '×1', 'Next action', 'More'])
    // en escritorio, las cuatro a la vista (y el botón que pasa de una a otra, no)
    const desktop = buttonsOf(markup).filter((b) => !b.mobile)
    expect(desktop.map((b) => b.text)).toEqual(['×½', '×1', '×2', '×4'])
    // la hoja de ⋯ está cerrada: ni saltos ni Show result en la fila
    expect(markup).not.toContain('Final 20 km')
    expect(markup).not.toContain('Show result')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('en el digest, solo Pause y Show results (§8.1); sin sesión, solo Pause', () => {
    expect(mobileRow(controls({ view: 'digest' }))).toEqual(['Pause', 'Show results'])
    expect(buttonsOf(controls({ view: 'digest' })).map((b) => b.text)).toEqual([
      'Pause',
      'Show results',
    ])
    expect(buttonsOf(controls({ view: 'digest' }, false)).map((b) => b.text)).toEqual(['Pause'])
  })

  it('en pausa, Play; Next action encendido va marcado, y en el último km no se puede encender (8-o)', () => {
    expect(mobileRow(controls({ phase: 'paused' }))[0]).toBe('Play')
    const on = buttonsOf(controls({ nextAction: true })).find((b) => b.text === 'Next action')!
    expect(on.attrs).toContain('aria-pressed="true"')
    expect(disabled(on.attrs)).toBe(false)
    const last = buttonsOf(controls({ lastKm: true })).find((b) => b.text === 'Next action')!
    expect(disabled(last.attrs)).toBe(true)
  })

  it('Connection lost · Retry (D-57) y Loading, en role="status"', () => {
    const offline = controls({ phase: 'paused', notice: 'offline' })
    expect(offline).toMatch(
      /role="status">Connection lost · <button[^>]*>[\s\S]*?Retry[\s\S]*?<\/button>/,
    )
    expect(mobileRow(offline)).toContain('Retry')
    expect(controls({ phase: 'waiting', notice: 'loading' })).toContain(
      'role="status">Loading</span>',
    )
  })

  it('escondidos, con opacidad: siguen en el árbol de accesibilidad y el foco dentro los enseña (8-p)', () => {
    // RE-SELLADO EN EL PR 20 (E3, §16.3): miraba las clases de la opacidad; los mandos dicen su estado en
    // `data-state`, y lo de dentro, los iconos, va `aria-hidden` sin esconder ningún botón
    const markup = controls({ hidden: true })
    expect(markup).toMatch(/^<div[^>]*data-state="hidden"/)
    expect(controls()).toMatch(/^<div[^>]*data-state="shown"/)
    expect(markup).not.toMatch(/<(?:button|div)[^>]*aria-hidden/)
    expect(mobileRow(markup)).toHaveLength(4)
  })

  it('en el ámbito oscuro, con los iconos pause, play y more, sin un glifo, y ningún primary (E3, §14.6)', () => {
    const playing = controls()
    expect(playing).toMatch(/^<div[^>]*data-surface="dark"/)
    expect(playing).toContain('data-variant="pause"')
    expect(playing).toContain('data-variant="more"')
    expect(controls({ phase: 'paused' })).toContain('data-variant="play"')
    expect(playing).not.toMatch(/[▶❚⋯]/)
    // el primary de Watch es el de la previa o el del cierre: los mandos no llevan ninguno
    expect(playing).not.toContain('data-variant="primary"')
  })

  // los 44 de cada mando los da el `Button` del catálogo, que es lo que exige el test de abajo, y los mide la
  // comprobación 5 de la prueba del teléfono (D-10): el test que los miraba por su clase ya no miraba nada

  it('cada mando, un Button del catálogo, ninguno a mano (ui/1; PR 21n): los que se conmutan, More y Next action', () => {
    for (const s of [
      controls(),
      controls({ nextAction: true, speed: 2 }),
      controls({ lastKm: true }),
    ]) {
      expect((s.match(/data-ui="Button"/g) ?? []).length).toBe((s.match(/<button\b/g) ?? []).length)
      expect(s).toMatch(/data-ui="Button" data-variant="control"/)
    }
    const more = buttonsOf(controls()).find((b) => b.text === 'More')!
    expect(more.attrs).toContain('aria-expanded="false"')
    expect(more.attrs).toContain('aria-controls="player-sheet"')
  })

  it('Next action, apagado en el último km con su porqué solo para el lector, que la fila no parte (PR 21n)', () => {
    const s = controls({ lastKm: true })
    const next = buttonsOf(s).find((b) => b.text === 'Next action')!
    expect(disabled(next.attrs)).toBe(true)
    expect(porque(s, next.attrs)).toEqual({ texto: 'Already in the last kilometre.', oculto: true })
  })

  it('el encendido no lleva el fondo ni la tinta del apagado: de dos clases del mismo estado, gana la que la hoja pone después', () => {
    // con `hover:bg-surface-2` y `hover:bg-accent-strong` a la vez, Tailwind ordena la hoja y no el atributo:
    // al pasar el ratón por un mando encendido salía la tinta del encendido sobre el fondo del apagado
    const all = buttonsOf(controls({ nextAction: true, speed: 2 }))
    const on = all.filter((b) => b.attrs.includes('aria-pressed="true"'))
    const off = all.filter((b) => b.attrs.includes('aria-pressed="false"'))
    expect(on.length).toBeGreaterThan(1)
    expect(off.length).toBeGreaterThan(1)
    for (const b of on) {
      expect(b.attrs, b.text).toMatch(/ hover:bg-accent-strong/)
      expect(b.attrs, b.text).not.toMatch(/ hover:bg-surface-2/)
      expect(b.attrs, b.text).not.toMatch(/ text-ink[\s"]/)
    }
    for (const b of off) {
      expect(b.attrs, b.text).toMatch(/ hover:bg-surface-2/)
      expect(b.attrs, b.text).not.toMatch(/ bg-accent[\s"]/)
    }
  })
})

// Hasta W2a, `Commentary` era un mando de esta fila, que se esconde a los 3 s sin tocar (8-p), y el dueño no
// veía «lo de atrás»: va bajo la línea de la voz (`VoiceTicker.test.tsx`), y la fila del teléfono se queda en
// cuatro.
describe('la barra de progreso en km, bajo la fila (W3; §8.5, 8-p)', () => {
  const bar = <div data-bar="km" />

  it('va bajo la fila de los mandos, dentro de lo que se esconde con ellos', () => {
    const s = controls({}, true, bar)
    expect(s).toContain('data-bar="km"')
    expect(s.indexOf('data-bar="km"')).toBeGreaterThan(s.indexOf('aria-label="More"'))
    const escondidos = controls({ hidden: true }, true, bar)
    expect(escondidos).toMatch(/^<div [^>]*data-state="hidden"[^>]*>[\s\S]*data-bar="km"/)
  })

  it('en el digest, nunca: sus mandos son la pausa y Show results (§8.1)', () => {
    expect(controls({ view: 'digest' }, true, bar)).not.toContain('data-bar')
  })

  it('en el cierre, la leyenda y la barra, sin la fila: volver a ver es lo único que queda', () => {
    const s = controls({ phase: 'closing' }, true, bar)
    expect(s).toMatch(/<p id="w3-cierre"[^>]*>Watch again from any km<\/p>/)
    expect(s.indexOf('id="w3-cierre"')).toBeLessThan(s.indexOf('data-bar="km"'))
    expect(buttonsOf(s)).toEqual([])
    // y fuera del cierre, ni la leyenda
    expect(controls({}, true, bar)).not.toContain('Watch again')
  })

  it('sin barra (la crono), la fila de siempre', () => {
    expect(controls({}, true, null)).not.toContain('data-bar')
    expect(mobileRow(controls({}, true, null))).toEqual(mobileRow(controls({}, true, bar)))
  })
})

describe('Commentary ya no va en los mandos (W2a)', () => {
  it('ni en la fila, en ninguna fase, ni en la hoja de ⋯', () => {
    for (const phase of ['playing', 'paused', 'waiting'] as const)
      expect(controls({ phase })).not.toContain('Commentary')
    const sheet = renderToStaticMarkup(
      <PlayerSheet
        view="watch"
        jumps={ROAD}
        canShowResult
        onJump={noop}
        onView={noop}
        onShowResult={noop}
      />,
    )
    expect(sheet).toContain('Final 20 km')
    expect(sheet).not.toContain('Commentary')
  })
})

describe('la hoja de ⋯ (8-p): los saltos, el modo y Show result', () => {
  function sheet(jumps: readonly JumpOption[], view: 'watch' | 'highlights' = 'watch'): string {
    return renderToStaticMarkup(
      <PlayerSheet
        view={view}
        jumps={jumps}
        canShowResult
        onJump={noop}
        onView={noop}
        onShowResult={noop}
      />,
    )
  }

  it('los saltos de recorrido, apagado el que no lleva a ningún sitio, el conmutador y Show result', () => {
    const markup = sheet(ROAD, 'highlights')
    const buttons = buttonsOf(markup)
    expect(buttons.map((b) => b.text)).toEqual([
      '−5 km',
      '+5 km',
      'Next climb',
      'Final 20 km',
      'Last km',
      'Watch',
      'Highlights',
      'Show result',
    ])
    expect(buttons.every((b) => b.mobile)).toBe(true)
    expect(disabled(buttons.find((b) => b.text === 'Next climb')!.attrs)).toBe(true)
    expect(disabled(buttons.find((b) => b.text === 'Final 20 km')!.attrs)).toBe(false)
    // el apagado, con su porqué solo para el lector; ninguno a mano (ui/1; PR 21n)
    expect(porque(markup, buttons.find((b) => b.text === 'Next climb')!.attrs)).toEqual({
      texto: 'Nothing to skip to from here.',
      oculto: true,
    })
    expect(porque(markup, buttons.find((b) => b.text === 'Final 20 km')!.attrs)).toBeNull()
    expect((markup.match(/data-ui="Button"/g) ?? []).length).toBe(
      (markup.match(/<button\b/g) ?? []).length,
    )
    expect(buttons.find((b) => b.text === 'Highlights')!.attrs).toContain('aria-pressed="true"')
    expect(buttons.find((b) => b.text === 'Watch')!.attrs).toContain('aria-pressed="false"')
  })

  it('los saltos son Button secondary, que se ven como botones en la hoja (revisión del 21n)', () => {
    const buttons = buttonsOf(sheet(ROAD))
    for (const t of ['−5 km', '+5 km', 'Next climb', 'Final 20 km', 'Last km'])
      expect(buttons.find((b) => b.text === t)!.attrs, t).toContain('data-variant="secondary"')
  })

  it('el porqué de un salto apagado dice su causa: saltando, en la previa, en el último km o sin destino', () => {
    const jumps: JumpOption[] = [
      { id: 'back5', label: ROAD_JUMP_LABEL.back5, enabled: false, why: 'notYet' },
      { id: 'fwd5', label: ROAD_JUMP_LABEL.fwd5, enabled: false, why: 'busy' },
      { id: 'nextClimb', label: ROAD_JUMP_LABEL.nextClimb, enabled: false, why: 'none' },
      { id: 'final20', label: ROAD_JUMP_LABEL.final20, enabled: false, why: 'lastKm' },
      { id: 'lastKm', label: ROAD_JUMP_LABEL.lastKm, enabled: false },
    ]
    const markup = sheet(jumps)
    const de = (t: string) =>
      porque(markup, buttonsOf(markup).find((b) => b.text === t)!.attrs)?.texto
    expect(de('−5 km')).toBe('Nothing to go back to yet.')
    expect(de('+5 km')).toBe('Already skipping.')
    expect(de('Next climb')).toBe('Nothing to skip to from here.')
    expect(de('Final 20 km')).toBe('Already in the last kilometre.')
    // sin causa, la de siempre
    expect(de('Last km')).toBe('Nothing to skip to from here.')
  })

  it('en la crono, los saltos de reloj (9-g): −10 min, +10 min, Last 20 starters y Last starter', () => {
    const clock: JumpOption[] = (['back10', 'fwd10', 'last20', 'lastStarter'] as const).map(
      (id) => ({ id, label: CLOCK_JUMP_LABEL[id], enabled: id !== 'back10' }),
    )
    const buttons = buttonsOf(sheet(clock))
    expect(buttons.slice(0, 4).map((b) => b.text)).toEqual([
      '−10 min',
      '+10 min',
      'Last 20 starters',
      'Last starter',
    ])
    expect(disabled(buttons[0]!.attrs)).toBe(true)
    expect(disabled(buttons[1]!.attrs)).toBe(false)
    expect(buttons.some((b) => /km/.test(b.text))).toBe(false)
  })
})
