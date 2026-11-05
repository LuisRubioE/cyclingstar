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

/** El atributo `disabled` (no la clase `disabled:`). */
const disabled = (attrs: string): boolean => / disabled=""/.test(attrs)

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

function controls(state: Partial<ControlsState> = {}, canShowResult = true): string {
  const el: ReactElement = (
    <PlayerControls
      state={{ ...PLAYING, ...state }}
      commentaryOpen={false}
      jumps={ROAD}
      canShowResult={canShowResult}
      onPlay={noop}
      onPause={noop}
      onSpeed={noop}
      onNextAction={noop}
      onCommentary={noop}
      onJump={noop}
      onView={noop}
      onShowResult={noop}
      onRetry={noop}
    />
  )
  return renderToStaticMarkup(el)
}

describe('PlayerControls a 360 px (8-p, §8.12)', () => {
  it('la fila lleva Pause, ×1, Next action, Commentary y More, por ese orden; las cuatro velocidades son de escritorio', () => {
    const markup = controls()
    expect(mobileRow(markup)).toEqual(['Pause', '×1', 'Next action', 'Commentary', 'More'])
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
    expect(mobileRow(markup)).toHaveLength(5)
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

  it('cada mando, de 44 como mínimo: los del catálogo y los que se conmutan (comprobación 5)', () => {
    for (const b of buttonsOf(controls())) {
      if (b.attrs.includes('data-ui="Button"')) continue
      expect(b.attrs, b.text).toMatch(/min-h-11/)
      expect(b.attrs, b.text).toMatch(/min-w-11/)
    }
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
    expect(buttons.find((b) => b.text === 'Highlights')!.attrs).toContain('aria-pressed="true"')
    expect(buttons.find((b) => b.text === 'Watch')!.attrs).toContain('aria-pressed="false"')
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
