/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type StageReplay, pageTitle } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { pageKindOfPath, stageTitleInfo } from './pageTitle'

/**
 * EL TÍTULO DE LA PESTAÑA EN LA WEB (E2, docs/retransmision.md §11.8 y §11.19; D-42, I-27; paso 9a).
 * `domain/pageTitle.ts` es el único fichero de `apps/web/src` que escribe `document.title`, y el título
 * de una etapa velada no lleva el nombre del ganador canario: el título solo recibe la carrera, el día y
 * cuántas etapas tiene, aunque la ficha traiga el resultado entero. Lee los fuentes con `readdirSync` y
 * `readFileSync`, así que empieza por la referencia a los tipos de Node (`apps/web/tsconfig.json` pone
 * `"types": []`).
 */

const SRC = fileURLToPath(new URL('..', import.meta.url))

function sources(dir: string = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return sources(path)
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : []
  })
}

const WINNER = 'Canary Wyner'

/** La ficha entera de una etapa, con el ganador canario en el resultado, la crónica y la general. */
const full: StageReplay = {
  day: 7,
  name: 'Stage 7 · Summit finish',
  km: 187,
  run: true,
  race: { id: 'race-france', name: 'Race France', country: 'FR', stageCount: 21 },
  kind: 'reina',
  altimetry: '<svg/>',
  results: [
    {
      riderId: 'r1',
      name: WINNER,
      country: 'ES',
      dnf: false,
      reason: null,
      teamId: 't1',
      teamName: 'Team One',
      isBot: true,
      puesto: 1,
      tiempoS: 18000,
      bonificacionS: 10,
      puntosVolante: 0,
      puntosMontana: 0,
    },
  ],
  chronicle: [],
  gc: [
    {
      riderId: 'r1',
      name: WINNER,
      country: 'ES',
      teamId: 't1',
      teamName: 'Team One',
      isBot: true,
      tiempoTotalS: 90000,
    },
  ],
}
/** Lo que sirve la ruta de etapa con la etapa en el velo: la ficha sin resultado (14-e). */
const veiled: StageReplay = {
  day: 7,
  name: 'Stage 7 · Summit finish',
  km: 187,
  run: true,
  race: { id: 'race-france', name: 'Race France', country: 'FR', stageCount: 21 },
  altimetry: '<svg/>',
  watch: { known: false, reachedS: null, gate: { k: 'not_seen' }, seen: false },
}

describe('el título de la pestaña en la web (§11.8)', () => {
  it('domain/pageTitle.ts es el único fichero de apps/web/src que escribe document.title', () => {
    const writers = sources()
      .filter((path) => /document\.title\s*=(?!=)/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path))
    expect(writers).toEqual(['domain/pageTitle.ts'])
  })

  it('el título de una etapa velada no lleva el nombre del ganador canario, ni con la ficha entera', () => {
    for (const data of [veiled, full])
      for (const page of ['watch', 'report', 'race'] as const) {
        const title = pageTitle('en', stageTitleInfo(data), page)
        expect(title).not.toContain(WINNER)
        expect(title).not.toContain('Canary')
      }
    expect(pageTitle('en', stageTitleInfo(full), 'watch')).toBe(
      'Stage 7 · Race France · Cycling Star',
    )
    // con o sin resultado, el mismo título: el historial guarda títulos (sup. X6)
    expect(stageTitleInfo(full)).toEqual(stageTitleInfo(veiled))
  })

  it('sin ficha todavía, el de la app', () => {
    expect(stageTitleInfo(undefined)).toBeNull()
    expect(pageTitle('en', stageTitleInfo(undefined), 'watch')).toBe('Cycling Star')
  })

  it('las páginas sin etapa se titulan por su ruta; las de carrera, etapa y acta, solas', () => {
    expect(pageKindOfPath('/')).toBe('home')
    expect(pageKindOfPath('/news')).toBe('news')
    expect(pageKindOfPath('/world/rankings')).toBe('rankings')
    expect(pageKindOfPath('/world/riders/abc')).toBe('rider')
    expect(pageKindOfPath('/me/profile')).toBe('rider')
    expect(pageKindOfPath('/world/teams/abc')).toBe('team')
    expect(pageKindOfPath('/team/squad')).toBe('team')
    expect(pageKindOfPath('/world/teams')).toBe('other')
    expect(pageKindOfPath('/me/training')).toBe('other')
    for (const path of [
      '/world/races/race-france',
      '/world/races/race-france/',
      '/world/races/race-france/stages/7',
      '/world/races/race-france/stages/7/report',
      '/races/race-france/stages/7',
    ])
      expect(pageKindOfPath(path), path).toBeNull()
    expect(pageKindOfPath('/world/races')).toBe('other')
  })
})
