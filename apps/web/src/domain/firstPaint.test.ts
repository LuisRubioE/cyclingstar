/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { stageHeadQuery } from '../pages/stageView'
import { isStagePagePath } from './firstPaint'

/**
 * LA PRIMERA PINTURA DE `Watch` (E2, paso 10b, los arreglos; docs/retransmision.md §18.5, D-56: ≤ 2 s con
 * «Fast 4G» y la CPU a ×4). Lo que acorta la cadena de la primera carga sin cambiar lo que se pinta ni lo
 * que se pide con `Watch` apagado: `/health` sale con el HTML, los ficheros de la página de etapa salen al
 * evaluar la web y no al primer render, y la cabecera sale a la vez que la ficha de la etapa.
 */

describe('isStagePagePath · la página de etapa, por su URL', () => {
  it('la etapa, también la ruta vieja y con la barra final', () => {
    for (const p of [
      '/world/races/race-colombia/stages/5',
      '/world/races/race-france/stages/18/',
      '/races/race-france/stages/7',
    ])
      expect(isStagePagePath(p), p).toBe(true)
  })

  it('ni su acta, ni la carrera, ni otra página', () => {
    for (const p of [
      '/world/races/race-france/stages/18/report',
      '/world/races/race-france',
      '/world/races',
      '/',
      '/me/profile',
      '/world/races/race-france/stages/',
    ])
      expect(isStagePagePath(p), p).toBe(false)
  })
})

describe('stageHeadQuery · la cabecera de `Watch`, a la vez que la ficha', () => {
  const run = { run: true, race: { stageCount: 21 } }
  const oneDayRun = { run: true, race: { stageCount: 1 } }

  it('con `Watch` apagado para quien mira, nada: ni se pide ni se quiere (como antes)', () => {
    for (const data of [undefined, run, { run: false, race: { stageCount: 21 } }])
      expect(stageHeadQuery({ watchOn: false, enabled: true, oneDay: false, data })).toEqual({
        wants: false,
        fetch: false,
      })
  })

  it('mientras la ficha no ha llegado se pide ya, sin quererla todavía: la decide la ficha', () => {
    expect(
      stageHeadQuery({ watchOn: true, enabled: true, oneDay: false, data: undefined }),
    ).toEqual({ wants: false, fetch: true })
  })

  it('sin pedir la ficha (`enabled` en falso), tampoco la cabecera', () => {
    expect(
      stageHeadQuery({ watchOn: true, enabled: false, oneDay: false, data: undefined }),
    ).toEqual({ wants: false, fetch: false })
  })

  it('con la ficha: una etapa corrida de una carrera por etapas, sí; sin correr, no', () => {
    expect(stageHeadQuery({ watchOn: true, enabled: true, oneDay: false, data: run })).toEqual({
      wants: true,
      fetch: true,
    })
    expect(
      stageHeadQuery({
        watchOn: true,
        enabled: true,
        oneDay: false,
        data: { run: false, race: { stageCount: 21 } },
      }),
    ).toEqual({ wants: false, fetch: false })
  })

  it('una carrera de un día: en la página de etapa, no (redirige a su ficha); en su ficha, sí', () => {
    expect(
      stageHeadQuery({ watchOn: true, enabled: true, oneDay: false, data: oneDayRun }),
    ).toEqual({ wants: false, fetch: false })
    expect(stageHeadQuery({ watchOn: true, enabled: true, oneDay: true, data: oneDayRun })).toEqual(
      {
        wants: true,
        fetch: true,
      },
    )
  })
})

describe('index.html · `/health` sale con el HTML', () => {
  it('lo precarga como `fetch`, con el modo de credenciales del `fetch` de la web (crossorigin anónimo)', () => {
    const html = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8')
    const link = /<link\b[^>]*\brel="preload"[^>]*\bhref="\/health"[^>]*>/.exec(html)?.[0]
    expect(link).toBeDefined()
    expect(link).toMatch(/\bas="fetch"/)
    // `fetch` sin `credentials` es same-origin: la precarga casa con `crossorigin` anónimo, no con use-credentials
    expect(link).toMatch(/\bcrossorigin(?:="anonymous")?(?=[\s/>])/)
    // antes que el módulo de la web, para que salga con el HTML y no detrás de los ficheros JS
    expect(html.indexOf(link!)).toBeLessThan(html.indexOf('<script type="module"'))
  })
})
