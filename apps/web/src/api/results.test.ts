import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactElement, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OneDayRadio, OneDayStory } from '../pages/Race'
import { StageReplay } from '../pages/StageReplay'
import { diagOf, fetchCalendarStage, stageReplayKey } from './results'

/**
 * EL MODO DIAGNÓSTICO, DE LA PÁGINA A LA FICHA (docs/retransmision.md §11.15 y §14.11; D-40, decisión
 * 14-s; E2, paso 7b). Entre el 7b y el 9a el dueño, con `SPOILER_MODE=admins`, ve pestañas vacías en
 * toda etapa que no ha visto; con `?diag=1` en la URL de la página, la web lo reenvía a la ruta de etapa
 * y la API le da la etapa entera sin gastarla. `fetchCalendarStage` lo pide solo cuando se le pasa, y
 * las dos páginas que piden la ficha (`StageReplay.tsx` y las pestañas de una carrera de un día de
 * `Race.tsx`) lo leen de su URL y lo ponen en la clave, para que una respuesta del modo diagnóstico no
 * sirva nunca la vista normal ni al revés.
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

  it('solo diag=1 activa el modo, como en la API; la clave lleva diag al final', () => {
    expect(diagOf(new URLSearchParams('diag=1'))).toBe(true)
    expect(diagOf(new URLSearchParams('tab=radio&diag=1'))).toBe(true)
    for (const q of ['', 'diag=0', 'diag=true', 'diag='])
      expect(diagOf(new URLSearchParams(q)), q).toBe(false)
    expect(stageReplayKey('race-france', 7, true)).toEqual(['stage-replay', 'race-france', 7, true])
    expect(stageReplayKey('race-france', 7, false)).not.toEqual(
      stageReplayKey('race-france', 7, true),
    )
  })

  /**
   * Las páginas, con un render estático y una caché nueva: las consultas que monta cada una quedan en
   * ella con su clave, y su `queryFn` es la que pide la ficha (nada se pide durante el render).
   */
  async function queriesOf(
    url: string,
    path: string,
    element: ReactElement,
  ): Promise<{ keys: unknown[][]; urls: string[] }> {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
    }
  }

  it('StageReplay.tsx pone diag en la clave y lo reenvía; sin él, la ficha de siempre', async () => {
    const path = '/world/races/:raceId/stages/:day'
    const page = createElement(StageReplay)
    const withDiag = await queriesOf('/world/races/race-france/stages/7?diag=1', path, page)
    expect(withDiag.keys).toEqual([['stage-replay', 'race-france', 7, true]])
    expect(withDiag.urls).toEqual(['/api/races/race-france/stages/7?diag=1'])
    const plain = await queriesOf('/world/races/race-france/stages/7?tab=radio', path, page)
    expect(plain.keys).toEqual([['stage-replay', 'race-france', 7, false]])
    expect(plain.urls).toEqual(['/api/races/race-france/stages/7'])
  })

  it('Race.tsx, en las pestañas Story y Race Radio de una carrera de un día, igual', async () => {
    const path = '/world/races/:raceId'
    for (const tab of [
      createElement(OneDayStory, { raceId: 'race-sanremo', onFullResult: () => {} }),
      createElement(OneDayRadio, { raceId: 'race-sanremo' }),
    ]) {
      const withDiag = await queriesOf('/world/races/race-sanremo?diag=1', path, tab)
      expect(withDiag.keys).toEqual([['stage-replay', 'race-sanremo', 1, true]])
      expect(withDiag.urls).toEqual(['/api/races/race-sanremo/stages/1?diag=1'])
      const plain = await queriesOf('/world/races/race-sanremo', path, tab)
      expect(plain.keys).toEqual([['stage-replay', 'race-sanremo', 1, false]])
      expect(plain.urls).toEqual(['/api/races/race-sanremo/stages/1'])
    }
  })
})
