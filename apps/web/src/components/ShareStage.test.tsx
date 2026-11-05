import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ShareStage, ShareStageIcon } from './ShareStage'

/**
 * COMPARTIR UNA ETAPA (E2, docs/retransmision.md §11.10; D-36, DD-12), con el catálogo desde el PR 20 (E3,
 * docs/visual.md §14.2): en la cabeza de la etapa, `Share to watch` es un `Button` `quiet` de solo icono,
 * de 44, con su texto en `ariaLabel`; donde no hay cabeza (el acta, la carrera de un día y `Report`), los
 * dos botones con su texto, y `Share the report` solo para quien conoce la etapa.
 */
const html = (node: React.ReactElement): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('ShareStage · compartir (§14.2)', () => {
  it('en la cabeza: el icono share, de 44, que se llama Share to watch', () => {
    const markup = html(<ShareStageIcon raceId="race-france" day={3} />)
    const buttons = [...markup.matchAll(/<button[^>]*>/g)].map((m) => m[0])
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toContain('data-ui="Button"')
    expect(buttons[0]).toContain('data-variant="quiet"')
    expect(buttons[0]).toContain('aria-label="Share to watch"')
    expect(markup).toContain('data-variant="share"')
  })

  it('con su texto: Share to watch siempre, y Share the report solo a quien conoce la etapa', () => {
    const names = (markup: string): string[] =>
      [...markup.matchAll(/<button[^>]*data-ui="Button"[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
        m[1]!.replace(/<[^>]+>/g, '').trim(),
      )
    expect(names(html(<ShareStage raceId="race-france" day={3} report={false} />))).toEqual([
      'Share to watch',
    ])
    expect(names(html(<ShareStage raceId="race-france" day={3} report />))).toEqual([
      'Share to watch',
      'Share the report',
    ])
    expect(names(html(<ShareStage raceId="race-france" day={3} report watch={false} />))).toEqual([
      'Share the report',
    ])
  })
})
