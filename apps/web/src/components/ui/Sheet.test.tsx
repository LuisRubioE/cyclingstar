import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Sheet, isSheetEntry, sheetEntry, sheetReaction } from './Sheet'

/**
 * `Sheet` (E3, docs/visual.md §4.4 y §8.10; PR 17c; 8-w): el diálogo a pantalla completa. Sin DOM: el
 * marcado de sus dos estados, y su conducta (la entrada de historial, `close`, `Escape` y el «atrás») en
 * las funciones puras que la deciden. El foco y el `<dialog>` modal los ve `/_ui` en un navegador.
 */

const nada = () => undefined

describe('Sheet: el marcado', () => {
  it('abierta: un dialog modal nombrado por su título, con close de 44 × 44', () => {
    const s = renderToStaticMarkup(
      <Sheet open title="Mistral Racing kit" onClose={nada}>
        <p>Dentro</p>
      </Sheet>,
    )
    expect(s).toMatch(
      /^<dialog data-ui="Sheet" data-variant="default" data-state="open" aria-modal="true" aria-labelledby="([^"]+)"/,
    )
    const id = /aria-labelledby="([^"]+)"/.exec(s)?.[1]
    expect(s).toContain(`<h2 id="${id}"`)
    expect(s).toMatch(/<h2 [^>]*>Mistral Racing kit<\/h2>/)
    // la cabecera, primero: su close es lo primero que enfoca el diálogo
    expect(s.indexOf('<header')).toBeLessThan(s.indexOf('aria-label="Close"'))
    expect(s.indexOf('aria-label="Close"')).toBeLessThan(s.indexOf('<p>Dentro</p>'))
    expect(s).toMatch(/<button[^>]*aria-label="Close"/)
  })

  it('cerrada, no se pinta', () => {
    expect(
      renderToStaticMarkup(
        <Sheet open={false} title="x" onClose={nada}>
          <p>Dentro</p>
        </Sheet>,
      ),
    ).toBe('')
  })
})

describe('Sheet: la entrada de historial', () => {
  it('guarda el estado del router intacto, con su id', () => {
    const router = { usr: null, key: 'abc', idx: 3 }
    const e = sheetEntry(router, 'r1')
    expect(e).toMatchObject(router)
    expect(isSheetEntry(e, 'r1')).toBe(true)
    expect(isSheetEntry(e, 'r2')).toBe(false)
    expect(isSheetEntry(router, 'r1')).toBe(false)
    expect(isSheetEntry(null, 'r1')).toBe(false)
    expect(sheetEntry(null, 'r1')).toEqual({ cyclingstarSheet: 'r1' })
  })
})

describe('Sheet: close, Escape y el «atrás» (8-w)', () => {
  it('close y Escape vuelven atrás si su entrada sigue arriba, y el «atrás» avisa', () => {
    expect(sheetReaction('close', true)).toBe('historyBack')
    expect(sheetReaction('escape', true)).toBe('historyBack')
    expect(sheetReaction('back', false)).toBe('notify')
  })

  it('sin su entrada, close y Escape avisan ya', () => {
    expect(sheetReaction('close', false)).toBe('notify')
    expect(sheetReaction('escape', false)).toBe('notify')
  })

  it('un «atrás» que deja su entrada arriba no la cierra', () => {
    expect(sheetReaction('back', true)).toBe('none')
  })

  it('si quien la pinta la quita, la entrada se va sin avisar', () => {
    expect(sheetReaction('gone', true)).toBe('historyBack')
    expect(sheetReaction('gone', false)).toBe('none')
  })
})
