import { describe, expect, it } from 'vitest'
import type { StageKind } from '../contracts.js'
import { mulberry32 } from '../rng.js'
import { type PageKind, STAGE_KIND_WORDS, pageTitle, stageReadyNotice } from './pageTitle.js'
import type { PreStageInfo } from './wire.js'

/**
 * EL TÍTULO DE LA PESTAÑA Y EL AVISO DE «ETAPA LISTA» (E2, docs/retransmision.md §11.8, §11.9 y
 * §11.19; D-42, I-27; paso 9a). Los títulos de la tabla de §11.8 para cada `PageKind`, con la carrera de
 * un día y sin etapa; `stageReadyNotice` con y sin la lista de salida; y que en sus salidas no hay más
 * palabras que las de `STAGE_KIND_WORDS`, el nombre de la carrera, los números y las fijas: por tipo no
 * cabe un resultado, y este test vigila que tampoco quepa por texto.
 */

const p7: PreStageInfo = {
  raceName: 'Race France',
  season: 0,
  stageDay: 7,
  stageCount: 21,
  km: 187.4,
  label: 'Summit finish',
  stageKind: 'reina',
}
const sanremo: PreStageInfo = {
  raceName: 'Race Sanremo',
  season: 2,
  stageDay: 1,
  stageCount: 1,
  km: 289.6,
  label: 'Classic',
  stageKind: 'clasica',
}

describe('pageTitle: los títulos de la tabla de §11.8', () => {
  it('la etapa, en Watch y en Report, con la etapa conocida o no: el mismo título (sup. X6)', () => {
    expect(pageTitle('en', p7, 'watch')).toBe('Stage 7 · Race France · Cycling Star')
    expect(pageTitle('en', p7, 'report')).toBe('Stage 7 report · Race France · Cycling Star')
  })

  it('una carrera de un día no tiene «Stage 1»', () => {
    expect(pageTitle('en', sanremo, 'watch')).toBe('Race Sanremo · Cycling Star')
    expect(pageTitle('en', sanremo, 'report')).toBe('Race Sanremo report · Cycling Star')
  })

  it('la ficha de carrera, con la información de su etapa 1 (11-c)', () => {
    expect(pageTitle('en', { ...p7, stageDay: 1 }, 'race')).toBe('Race France · Cycling Star')
    expect(pageTitle('en', sanremo, 'race')).toBe('Race Sanremo · Cycling Star')
  })

  it('las páginas sin etapa llevan un nombre fijo; la portada y el resto, solo el de la app', () => {
    expect(pageTitle('en', null, 'rider')).toBe('Rider · Cycling Star')
    expect(pageTitle('en', null, 'team')).toBe('Team · Cycling Star')
    expect(pageTitle('en', null, 'news')).toBe('News · Cycling Star')
    expect(pageTitle('en', null, 'rankings')).toBe('Rankings · Cycling Star')
    expect(pageTitle('en', null, 'home')).toBe('Cycling Star')
    expect(pageTitle('en', null, 'other')).toBe('Cycling Star')
  })

  it('una página de etapa o de carrera sin información aún (cargando) lleva solo el de la app', () => {
    for (const page of ['watch', 'report', 'race'] as const)
      expect(pageTitle('en', null, page)).toBe('Cycling Star')
  })

  it('una página sin etapa no mira la información aunque se la pasen', () => {
    for (const page of ['rider', 'team', 'news', 'rankings', 'home', 'other'] as const)
      expect(pageTitle('en', p7, page)).toBe(pageTitle('en', null, page))
  })
})

describe('stageReadyNotice: el aviso de etapa lista (§11.9)', () => {
  it('asunto y primera línea, con el corredor propio en la lista de salida', () => {
    expect(stageReadyNotice('en', p7, true)).toEqual({
      subject: 'Stage 7 of Race France is ready to watch',
      text: '187 km · mountain stage · your rider is on the start list',
    })
  })

  it('sin él, la línea se queda en el recorrido', () => {
    expect(stageReadyNotice('en', p7, false)).toEqual({
      subject: 'Stage 7 of Race France is ready to watch',
      text: '187 km · mountain stage',
    })
  })

  it('una carrera de un día se nombra sin etapa', () => {
    expect(stageReadyNotice('en', sanremo, false)).toEqual({
      subject: 'Race Sanremo is ready to watch',
      text: '290 km · one-day race',
    })
  })

  it('cada tipo de etapa tiene sus palabras, que salen del recorrido', () => {
    expect(Object.keys(STAGE_KIND_WORDS).sort()).toEqual(
      ['clasica', 'cri', 'llana', 'media', 'reina'].sort(),
    )
    for (const kind of Object.keys(STAGE_KIND_WORDS) as StageKind[])
      expect(stageReadyNotice('en', { ...p7, stageKind: kind }, false).text).toBe(
        `187 km · ${STAGE_KIND_WORDS[kind]}`,
      )
  })
})

/** Las palabras fijas de las dos funciones: lo único que pueden decir además del recorrido. */
const FIXED = new Set([
  'Stage',
  'report',
  'Cycling',
  'Star',
  'Rider',
  'Team',
  'News',
  'Rankings',
  'of',
  'is',
  'ready',
  'to',
  'watch',
  'km',
  'your',
  'rider',
  'on',
  'the',
  'start',
  'list',
])
const KIND_WORDS = new Set(Object.values(STAGE_KIND_WORDS).flatMap((w) => w.split(' ')))
const RACE_NAMES = ['Race France', 'Race Sanremo', 'Race Flanders', 'Race Lombardy', 'Race Italy']
const PAGES: readonly PageKind[] = [
  'watch',
  'report',
  'race',
  'rider',
  'team',
  'news',
  'rankings',
  'home',
  'other',
]

describe('lo que pueden decir: el recorrido, la carrera, los números y las fijas', () => {
  it('en 500 etapas al azar (semilla fija), ninguna otra palabra; ni la etiqueta ni la temporada', () => {
    const rnd = mulberry32(0x9a)
    const kinds = Object.keys(STAGE_KIND_WORDS) as StageKind[]
    for (let i = 0; i < 500; i++) {
      const raceName = RACE_NAMES[Math.floor(rnd() * RACE_NAMES.length)]!
      const stageCount = rnd() < 0.3 ? 1 : 1 + Math.floor(rnd() * 21)
      const p: PreStageInfo = {
        raceName,
        season: Math.floor(rnd() * 9),
        stageDay: 1 + Math.floor(rnd() * stageCount),
        stageCount,
        km: 5 + rnd() * 300,
        // una etiqueta con palabras que no pueden salir: el título y el aviso no la leen
        label: 'Zzlabel Qqfinish',
        stageKind: kinds[Math.floor(rnd() * kinds.length)]!,
      }
      const allowed = new Set([...FIXED, ...KIND_WORDS, ...raceName.split(' ')])
      const notice = stageReadyNotice('en', p, rnd() < 0.5)
      const outputs = [notice.subject, notice.text, ...PAGES.map((pg) => pageTitle('en', p, pg))]
      for (const out of outputs) {
        expect(out).not.toMatch(/Zzlabel|Qqfinish/)
        for (const word of out.split(/[\s·]+/).filter((w) => w !== ''))
          expect(allowed.has(word) || /^\d+$/.test(word), `${word} en «${out}»`).toBe(true)
      }
    }
  })
})
