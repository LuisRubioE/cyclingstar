import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { StageHead } from './StageHead'

/**
 * LA CABEZA DE LA ETAPA (E3, docs/visual.md §14.2; telefono §10; Ruso-035; PR 20): una fila de 44 con la
 * carrera y las dos flechas, `Button` `quiet` de solo icono que dejan su hueco en la primera y la última
 * etapa para que la carrera no se mueva; el `h1` en `title` con `share` de 44 a su lado; y la ruta debajo,
 * en `meta` `ink-2`, que no va en el `h1`.
 */
const html = (over: Partial<Parameters<typeof StageHead>[0]> = {}): string =>
  renderToStaticMarkup(
    <MemoryRouter>
      <StageHead
        raceId="race-valencia"
        race={{ name: 'Race Valencia', country: 'ES' }}
        day={3}
        stageCount={5}
        stageHref={(d) => `/world/races/race-valencia/stages/${d}?tab=watch`}
        title="Stage 3 · Summit finish"
        from="Orihuela"
        to="San Vicente del Raspeig"
        km={158}
        run
        share={<button type="button">share</button>}
        {...over}
      />
    </MemoryRouter>,
  )

describe('StageHead · la cabeza de la etapa (§14.2)', () => {
  it('la fila de 44: las dos flechas con su nombre y la carrera, un enlace a su ficha', () => {
    const markup = html()
    expect(markup).toMatch(
      /href="\/world\/races\/race-valencia\/stages\/2\?tab=watch"[^>]*aria-label="Previous stage"|aria-label="Previous stage"[^>]*href="\/world\/races\/race-valencia\/stages\/2\?tab=watch"/,
    )
    expect(markup).toMatch(/aria-label="Next stage"/)
    expect(markup).toContain('data-variant="chevron-left"')
    expect(markup).toContain('data-variant="chevron-right"')
    expect(markup).toMatch(
      /data-ui="TextLink"[^>]*href="\/world\/races\/race-valencia"|href="\/world\/races\/race-valencia"[^>]*data-ui="TextLink"/,
    )
    expect(markup).toContain('Stage 3 of 5')
  })

  it('en la primera y en la última, la flecha que sobra no se pinta y deja su hueco', () => {
    const first = html({ day: 1 })
    expect(first).not.toContain('Previous stage')
    expect(first).toContain('Next stage')
    expect(first).toMatch(/<span aria-hidden="true" class="[^"]*h-11 w-11/)
    const last = html({ day: 5 })
    expect(last).toContain('Previous stage')
    expect(last).not.toContain('Next stage')
  })

  it('el h1 es el nombre de la etapa, sin la ruta; la ruta va debajo con sus km', () => {
    const markup = html()
    expect(markup).toMatch(/<h1[^>]*>Stage 3 · Summit finish<\/h1>/)
    const route = markup.slice(markup.indexOf('</h1>'))
    expect(route).toContain('Orihuela → San Vicente del Raspeig')
    expect(route).toContain('158 km')
    expect(html({ run: false })).toContain('158 km · not raced yet')
  })

  it('el botón de compartir va junto al h1, y sin él no queda hueco', () => {
    const markup = html()
    expect(markup.indexOf('</h1>')).toBeLessThan(markup.indexOf('>share<'))
    expect(html({ share: null })).not.toContain('>share<')
  })
})
