import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { startStateOf } from './cards.js'
import { decodeTimeline } from './codec.js'
import { visibilityOf } from './cut.js'
import { type Instant, type InstantContext, instantAt, photoBlocksOf } from './instant.js'
import { mainGapText, shownGroupsOf, toGoText } from './screenWords.js'
import type { StageTimeline } from './timeline.js'

/**
 * LA CABEZA DE LA PANTALLA (E2, docs/retransmision.md §4.5, §6.2 y D-04, D-17; paso 10a): lo que lee la
 * capa fija del instante. Tres defectos que el 10a cierra, cada uno con su caso, sobre las cinco etapas
 * congeladas en línea con el contexto con que pinta la web (`StageWatch.tsx`):
 *
 * - (a) la capa fija volvía atrás en km a meta cuando el grupo de cabeza moría y su sucesor aún no
 *   tenía marca: en `race-colombia` e5, a 25, 21 y 18 km de meta, de 1,6 a 4,0 km durante 7,4 s de
 *   carrera (nota 4 del 10b, preparación). Ahora la cabeza retenida (`heldLeadOf`) la tiene donde
 *   murió hasta que un grupo vivo pasa de ahí.
 * - (b) del 0,1 al 0,3 % del tiempo el grupo 1 del instante va vacío: la barra no lo pinta
 *   (`shownGroupsOf`), pero la capa fija leía de él. Ahora lee de la fila 1.
 * - (c) la capa fija medía la diferencia principal contra el grupo 1 y la barra, contra la cabeza del
 *   km (la menor marca vista allí): con una fuga recién cazada, `+0:38 on the second group` en la capa y
 *   `+0:47` en su fila (del 1,3 al 9,9 % de los segundos; en Chromium, `+0:09 on the bunch` y `s.t.`,
 *   la nota 4 del 6b). Ahora las dos son la misma resta, contra la cabeza de la pantalla.
 */

const ROAD = [
  'race-france-e7',
  'race-france-e18',
  'race-france-e20',
  'race-flanders-e1',
  'race-colombia-e5',
] as const

function frozen(name: (typeof ROAD)[number]): StageTimeline {
  const url = new URL(
    `../../../../apps/api/src/__fixtures__/broadcast/${name}.timeline.gz`,
    import.meta.url,
  )
  return decodeTimeline(JSON.parse(gunzipSync(readFileSync(url)).toString('utf8')))
}

/** El contexto con que pinta la web (`StageWatch.tsx`) sobre la cabecera que arma la ruta. */
function ctxOf(tl: StageTimeline): InstantContext {
  return {
    own: new Set(),
    start: startStateOf(tl.cast, tl.riderIds.length),
    photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
  }
}

/** Cada segundo de carrera de una etapa, de la salida a la meta. */
function everySecond(tl: StageTimeline, ctx: InstantContext): Instant[] {
  const out: Instant[] = []
  for (let s = 0; s <= Math.ceil(tl.finish.finishS); s++) out.push(instantAt(tl, s, ctx))
  return out
}

const STAGES = ROAD.map((name) => {
  const tl = frozen(name)
  const ctx = ctxOf(tl)
  return { name, tl, ctx, seconds: everySecond(tl, ctx) }
})

/**
 * Las muertes del grupo de cabeza con los suyos en carrera: la fila 1 de la barra justo antes de que se
 * vea su muerte, con un sucesor (o el de su sucesor) que no abandona.
 */
function leadDeathsOf(tl: StageTimeline, ctx: InstantContext): { g: number; ds: number }[] {
  const vis = visibilityOf(tl)
  const out: { g: number; ds: number }[] = []
  tl.groups.forEach((entry, g) => {
    const ds = vis.groupDiedDs[g]
    if (ds === null || ds === undefined || entry.successor === null) return
    const before = instantAt(tl, (ds - 1) / 10, ctx)
    if (shownGroupsOf(before)[0]?.g === g) out.push({ g, ds })
  })
  return out
}

describe('la cabeza de la pantalla (10a): lo que lee la capa fija del instante', () => {
  it('(a) la capa fija no vuelve atrás cuando el grupo de cabeza muere con los suyos en carrera', () => {
    let deaths = 0
    for (const { name, tl, ctx } of STAGES) {
      for (const { g, ds } of leadDeathsOf(tl, ctx)) {
        deaths++
        // décima a décima, del segundo antes de verse su muerte a 30 s después
        let min = instantAt(tl, (ds - 10) / 10, ctx).toGoKm
        for (let d = ds - 9; d <= ds + 300; d++) {
          const now = instantAt(tl, d / 10, ctx).toGoKm
          expect(
            now,
            `${name}: ${tl.groups[g]!.id} muere en ${ds / 10} s, a ${d / 10} s`,
          ).toBeLessThanOrEqual(min + 1e-9)
          min = Math.min(min, now)
        }
      }
    }
    // no vacío: las cinco tienen fugas cazadas, y Colombia e5 los tres cambios de etiqueta
    expect(deaths).toBeGreaterThan(20)
  })

  it('(a) en race-colombia e5, a 25, 21 y 18 km de meta, la capa fija sigue diciendo lo mismo mientras la cabeza cambia de etiqueta', () => {
    const { tl, ctx } = STAGES.find((x) => x.name === 'race-colombia-e5')!
    const relabels = leadDeathsOf(tl, ctx).filter(
      ({ g }) => tl.groups[tl.groups[g]!.successor!]!.bornB === tl.groups[g]!.diedB! + 1,
    )
    const toGoBefore = (ds: number): number => instantAt(tl, (ds - 1) / 10, ctx).toGoKm
    const late = relabels.filter(({ ds }) => toGoBefore(ds) > 15 && toGoBefore(ds) < 30)
    expect(late.map(({ ds }) => Math.round(toGoBefore(ds)))).toEqual([25, 21, 18])
    for (const { ds } of late) {
      const before = instantAt(tl, (ds - 1) / 10, ctx)
      // los 7,4 s en que el sucesor aún no tiene marca, y uno más
      for (let d = ds; d <= ds + 85; d++) {
        const now = instantAt(tl, d / 10, ctx)
        const at = `${d / 10} s`
        expect(now.toGoKm, at).toBeLessThanOrEqual(before.toGoKm + 1e-9)
        expect(now.toGoKm, at).toBeGreaterThan(before.toGoKm - 0.5)
        expect(now.mainGap?.behind, at).toBe(before.mainGap?.behind)
        expect(mainGapText(now.mainGap!.gapS), at).toBe(mainGapText(before.mainGap!.gapS))
      }
    }
  })

  it('(a) segundo a segundo, en las cinco: lo poco que aún vuelve atrás es de la extrapolación de un grupo de una sola marca (3-a), menos de 50 m', () => {
    for (const { name, tl, seconds } of STAGES) {
      let min = tl.lengthKm
      let worst = 0
      for (const i of seconds) {
        worst = Math.max(worst, i.toGoKm - min)
        min = Math.min(min, i.toGoKm)
      }
      expect(worst, name).toBeLessThan(0.05)
    }
  })

  it('(b) con el grupo 1 del instante vacío, la capa fija lee de la fila 1 de la barra', () => {
    let empty = 0
    for (const { name, tl, seconds } of STAGES)
      for (const i of seconds) {
        const first = i.groups[0]
        if (first === undefined || first.size > 0) continue
        empty++
        const row1 = shownGroupsOf(i)[0]!
        const at = `${name} ${i.t} s`
        expect(i.mainGap?.ahead, at).not.toBe(first.g)
        // los km a meta son los de la fila 1, o los de la cabeza retenida, que va por delante
        expect(i.headKm, at).toBeGreaterThanOrEqual(row1.km - 1e-9)
        if (i.mainGap !== null && i.mainGap.ahead === row1.g)
          expect(toGoText(i.toGoKm, i.lapsToGo), at).toBe(
            toGoText(Math.max(0, tl.lengthKm - row1.km), i.lapsToGo),
          )
      }
    // no vacío: del 0,1 al 0,3 % de los segundos de las cinco
    expect(empty).toBeGreaterThan(50)
  })

  it('(c) la diferencia principal de la capa fija es la fila de su referencia en la barra, segundo a segundo', () => {
    let checks = 0
    for (const { name, seconds } of STAGES)
      for (const i of seconds) {
        const gap = i.mainGap
        if (gap === null) continue
        const row = shownGroupsOf(i).find((g) => g.g === gap.behind)
        const at = `${name} ${i.t} s`
        expect(row, at).toBeDefined()
        expect(mainGapText(row!.gap.toHeadS), at).toBe(mainGapText(gap.gapS))
        checks++
      }
    // antes del 10a no lo cumplían del 1,3 al 9,9 % de estos segundos
    expect(checks).toBeGreaterThan(90_000)
  })
})
