import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { broadcastHeadKey } from '../api/broadcast'
import { broadcastHeadWith, healthWith, horizonWith } from '../pages/__fixtures__/world'
import { OrdersGate } from './OrdersGate'

/**
 * LAS ÓRDENES DE LA N+1 (E2, docs/retransmision.md §11.12, punto 3; D-37, DD-09; paso 9b). La N+1 sale con
 * la general de tras la N, así que la página de órdenes de una carrera con una etapa corrida y sin ver abre
 * con un aviso de tres salidas, ninguna obligatoria: verla (con los minutos de `playbackEstimateS`, §8.2),
 * revelarla, o dar las órdenes igual. Quien tiene prisa ordena sin saber; nadie queda bloqueado (§2.11).
 */

const REV = '200.2'

function gate(watch: 'on' | 'off', estimateS = 540): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith(watch, 'on'))
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(['horizon'], horizonWith({ rev: REV }))
  client.setQueryData(
    broadcastHeadKey('race-france', 6, undefined, false, REV),
    broadcastHeadWith('race-france', 6, { estimateS }),
  )
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OrdersGate raceKey="race-france:s0" stageDay={6} onGiveOrders={() => undefined} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('la puerta de las órdenes (§11.12, DD-09)', () => {
  it('Stage 6 is waiting for you · Watch (about 9 min) · Show result · Give orders anyway', () => {
    const markup = gate('on')
    expect(markup).toContain('Stage 6 is waiting for you')
    expect(markup).toContain('Watch (about 9 min)')
    expect(markup).toContain('href="/world/races/race-france/stages/6"')
    expect(markup).toContain('Show result')
    expect(markup).toContain('Give orders anyway')
  })

  it('los minutos son los del recorrido (playbackEstimateS), redondeados; al menos uno', () => {
    expect(gate('on', 13 * 60 + 20)).toContain('Watch (about 13 min)')
    expect(gate('on', 10)).toContain('Watch (about 1 min)')
  })

  it('sin Watch para quien mira, la etapa sin minutos: abre en su página con la puerta', () => {
    const markup = gate('off')
    expect(markup).toContain('Stage 6 is waiting for you')
    expect(markup).not.toContain('about 9 min')
    expect(markup).not.toContain('>Watch<')
    expect(markup).toContain('Open stage')
    expect(markup).toContain('href="/world/races/race-france/stages/6"')
    expect(markup).toContain('Give orders anyway')
  })
})
