import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactElement, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Race } from '../pages/Race'
import { StageReplay } from '../pages/StageReplay'
import { healthWith, horizonWith, raceViewWith } from '../pages/__fixtures__/world'
import { raceViewKey } from './race'
import { diagOf, fetchCalendarStage, stageReplayKey } from './results'

/**
 * EL MODO DIAGNÓSTICO, DE LA PÁGINA A LA FICHA (docs/retransmision.md §11.15 y §14.11; D-40, decisión
 * 14-s; E2, paso 7b). Entre el 7b y el 9a el dueño, con `SPOILER_MODE=admins`, ve pestañas vacías en
 * toda etapa que no ha visto; con `?diag=1` en la URL de la página, la web lo reenvía a la ruta de etapa
 * y la API le da la etapa entera sin gastarla. `fetchCalendarStage` lo pide solo cuando se le pasa, y
 * las dos páginas que piden la ficha (`StageReplay.tsx` y las pestañas de una carrera de un día de
 * `Race.tsx`) lo leen de su URL y lo ponen en la clave, para que una respuesta del modo diagnóstico no
 * sirva nunca la vista normal ni al revés.
 *
 * Re-sellado en el 9a (§10.9, §14.11): la clave lleva además el `rev` del horizonte al final
 * (`horizonKey`) y la consulta espera a tenerlo; la meta de `Watch` y revelar ya no invalidan la ficha
 * por su prefijo (`stageReplayPrefix` se va), sino que cambian el `rev`, y con él la clave. Las páginas se
 * renderizan con `['horizon']` ya en la caché.
 */

/** Una etapa sin correr, la ficha mínima que acepta `stageReplaySchema`. */
const notRun = { day: 7, name: 'Stage 7', km: 180, run: false, altimetry: '<svg/>' }

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// La ficha de una carrera de un día terminada va diferida (`lazy`, `OneDayRace.tsx`, 9b): un primer render
// la pide y, ya cargada, los de los tests la pintan con sus consultas.
beforeAll(async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } })
  client.setQueryData(['health'], healthWith('off', 'on', 100))
  client.setQueryData(['horizon'], horizonWith({ rev: '9.1' }))
  client.setQueryData(raceViewKey('race-sanremo', false, '9.1'), raceViewWith(1))
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        MemoryRouter,
        { initialEntries: ['/world/races/race-sanremo'] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: '/world/races/:raceId', element: createElement(Race) }),
        ),
      ),
    ),
  )
  await import('../pages/OneDayRace')
  await new Promise((resolve) => setTimeout(resolve, 0))
})

describe('web: la ficha de una etapa con ?diag=1 (14-s)', () => {
  it('fetchCalendarStage pide la ruta de etapa con ?diag=1 cuando se le pasa diag, y sin él cuando no', async () => {
    const fetchMock = vi.fn<(path: string) => Promise<Response>>(async () => response(notRun))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchCalendarStage('race-france', 7)).resolves.toEqual(notRun)
    await fetchCalendarStage('race-france', 7, { diag: false })
    await fetchCalendarStage('race-france', 7, { diag: true })
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/races/race-france/stages/7',
      '/api/races/race-france/stages/7',
      '/api/races/race-france/stages/7?diag=1',
    ])
  })

  it('solo diag=1 activa el modo, como en la API; la clave lleva diag y, desde el 9a, el rev al final', () => {
    expect(diagOf(new URLSearchParams('diag=1'))).toBe(true)
    expect(diagOf(new URLSearchParams('tab=radio&diag=1'))).toBe(true)
    for (const q of ['', 'diag=0', 'diag=true', 'diag='])
      expect(diagOf(new URLSearchParams(q)), q).toBe(false)
    expect(stageReplayKey('race-france', 7, true, '9.1')).toEqual([
      'stage-replay',
      'race-france',
      7,
      true,
      '9.1',
    ])
    expect(stageReplayKey('race-france', 7, false, '9.1')).not.toEqual(
      stageReplayKey('race-france', 7, true, '9.1'),
    )
  })

  it('9a: tras la meta o al revelar cambia el rev, y la ficha velada no se sirve con la clave nueva', () => {
    const client = new QueryClient()
    client.setQueryData(stageReplayKey('race-france', 7, false, '9.1'), notRun)
    expect(client.getQueryData(stageReplayKey('race-france', 7, false, '9.2'))).toBeUndefined()
    expect(client.getQueryData(stageReplayKey('race-france', 7, false, '9.1'))).toEqual(notRun)
  })

  /**
   * Las páginas, con un render estático y una caché nueva: las consultas que monta cada una quedan en
   * ella con su clave, y su `queryFn` es la que pide la ficha (nada se pide durante el render).
   */
  async function queriesOf(
    url: string,
    path: string,
    element: ReactElement,
  ): Promise<{ keys: unknown[][]; urls: string[]; enabled: unknown[] }> {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['horizon'], horizonWith({ rev: '9.1' }))
    // Re-sellado en el 9b: el `rev` sale del horizonte solo con SPOILER_MODE encendido, que dice /health
    // (con él apagado es `'world'` sin pedir nada); sin /health en la caché, las consultas esperan.
    client.setQueryData(['health'], healthWith('off', 'on', 100))
    // la ficha de una carrera de un día terminada (9b), con y sin `?diag=1`
    for (const diag of [false, true])
      client.setQueryData(raceViewKey('race-sanremo', diag, '9.1'), raceViewWith(1))
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          MemoryRouter,
          { initialEntries: [url] },
          createElement(Routes, null, createElement(Route, { path, element })),
        ),
      ),
    )
    const queries = client
      .getQueryCache()
      .findAll({ queryKey: ['stage-replay'] })
      .filter((q) => q.options.queryFn !== undefined)
    const fetchMock = vi.fn<(path: string) => Promise<Response>>(async () => response(notRun))
    vi.stubGlobal('fetch', fetchMock)
    for (const q of queries) {
      const fn = q.options.queryFn as (ctx: unknown) => Promise<unknown>
      await fn({ queryKey: q.queryKey, signal: new AbortController().signal, meta: undefined })
    }
    return {
      keys: queries.map((q) => [...q.queryKey]),
      urls: fetchMock.mock.calls.map((c) => c[0]),
      // si la página la deja pedir: una consulta desactivada también queda en la caché con su clave
      enabled: queries.map((q) => (q.options as { enabled?: unknown }).enabled),
    }
  }

  it('StageReplay.tsx pone diag en la clave y lo reenvía; sin él, la ficha de siempre', async () => {
    const path = '/world/races/:raceId/stages/:day'
    const page = createElement(StageReplay)
    const withDiag = await queriesOf('/world/races/race-france/stages/7?diag=1', path, page)
    expect(withDiag.keys).toEqual([['stage-replay', 'race-france', 7, true, '9.1']])
    expect(withDiag.urls).toEqual(['/api/races/race-france/stages/7?diag=1'])
    const plain = await queriesOf('/world/races/race-france/stages/7?tab=radio', path, page)
    expect(plain.keys).toEqual([['stage-replay', 'race-france', 7, false, '9.1']])
    expect(plain.urls).toEqual(['/api/races/race-france/stages/7'])
  })

  // Re-sellado en el 9b: las pestañas de una carrera de un día ya no son `OneDayStory` y `OneDayRadio` sino la
  // ficha entera (`OneDaySections`), que pide la ruta de su etapa al abrir una de las dos con `Watch`
  // apagado, y con él encendido, al abrirse (§11.17). `?tab=story` es el acta, `report` (D-48).
  it('Race.tsx, en las pestañas Story (report) y Race Radio de una carrera de un día, igual', async () => {
    const path = '/world/races/:raceId'
    const page = createElement(Race)
    for (const tab of ['story', 'radio']) {
      const withDiag = await queriesOf(`/world/races/race-sanremo?tab=${tab}&diag=1`, path, page)
      expect(withDiag.keys).toEqual([['stage-replay', 'race-sanremo', 1, true, '9.1']])
      expect(withDiag.urls).toEqual(['/api/races/race-sanremo/stages/1?diag=1'])
      const plain = await queriesOf(`/world/races/race-sanremo?tab=${tab}`, path, page)
      expect(plain.keys).toEqual([['stage-replay', 'race-sanremo', 1, false, '9.1']])
      expect(plain.urls).toEqual(['/api/races/race-sanremo/stages/1'])
    }
  })

  it('9b: con Watch apagado, la ficha de una carrera de un día en Result no pide la ruta de su etapa (como hoy)', async () => {
    const plain = await queriesOf(
      '/world/races/race-sanremo',
      '/world/races/:raceId',
      createElement(Race),
    )
    expect(plain.enabled).toEqual([false])
    const story = await queriesOf(
      '/world/races/race-sanremo?tab=story',
      '/world/races/:raceId',
      createElement(Race),
    )
    expect(story.enabled).toEqual([true])
  })
})
