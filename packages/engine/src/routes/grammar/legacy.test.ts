import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import { cuantilesDe, raceDePrueba, routeCensus, type RouteStats } from '../../sim/routeCensus.js'
import type { Segment, StageProfile } from '../../stage/types.js'
import {
  classicSegments,
  cobblesSegments,
  flatSegments,
  hillySegments,
  hillyUphillSegments,
  ittSegments,
  mountainClassicSegments,
  mountainSegments,
  routeRng,
} from '../profileGen.js'
import { ZONAS, type GeoSignature } from './geo.js'
import { colocarLegado, LEGACY, legacyMotivos, type LegacyId } from './legacy.js'
import type { Motif } from './motifs.js'
import { emitirPancartas, renderSkeleton } from './render.js'

/**
 * I-42: LA GRAMÁTICA EXPRESA LAS FORMAS DE HOY ANTES DE SUSTITUIRLAS (docs/generador.md §15.3).
 *
 * Para cada uno de los ocho generadores viejos, 60 semillas × los km de `stageKind.test.ts`: la lista
 * de motivos del builder legado tiene el MISMO número y orden de dificultades (`puerto`, `paves`) que
 * los segmentos de la función vieja, en 300 de 300. En el paso 4 este fichero gana la tabla pareada
 * (`colocarLegado` + `renderSkeleton` contra los viejos, medidos con `routeCensus`): la fontanería
 * nueva reproduce la forma vieja dentro del ruido (I-16, I-42), de modo que lo que cambie en el paso
 * 8 será forma y no fontanería. Su salida es el apéndice «tabla pareada de los legado» de la nota de
 * balance (vN §0).
 */

const SEEDS = 60
const seeds = (n: number): string[] => Array.from({ length: n }, (_, i) => `semilla-${i}`)
const KM_ROAD = [130, 155, 175, 195, 215] // los mismos de stageKind.test.ts

const VIEJO: Record<LegacyId, (km: number, seed: string) => Segment[]> = {
  lg_flat: flatSegments,
  lg_hilly: hillySegments,
  lg_hilly_uphill: hillyUphillSegments,
  lg_mountain: (km, seed) => mountainSegments(km, seed),
  lg_mountain_classic: mountainClassicSegments,
  lg_classic: classicSegments,
  lg_cobbles: cobblesSegments,
  lg_itt: ittSegments,
}
const IDS = Object.keys(VIEJO) as LegacyId[]

/** Las dificultades de un perfil viejo, en orden: sus segmentos `puerto` y `paves`. */
const dificultadesViejas = (segs: readonly Segment[]): string[] =>
  segs.filter((s) => s.tipo === 'puerto' || s.tipo === 'paves').map((s) => s.tipo)

/** Lo mismo leído de los motivos: cota, puerto y muro rinden `puerto`; sector, `paves`; la meta con cota, su `puerto`. */
function dificultadesLegado(motivos: readonly Motif[]): string[] {
  return motivos.flatMap((m): string[] => {
    if (m.kind === 'cota' || m.kind === 'puerto' || m.kind === 'muro') return ['puerto']
    if (m.kind === 'sector') return ['paves']
    if (m.kind === 'meta' && m.cotaFinal) return ['puerto']
    return []
  })
}

describe('los ocho builders legado reproducen la forma de los generadores viejos', () => {
  it.each(IDS)(
    '%s: mismo número y orden de dificultades que la función vieja, 300 de 300',
    (id) => {
      let iguales = 0
      const fallos: string[] = []
      for (const km of KM_ROAD)
        for (const seed of seeds(SEEDS)) {
          const viejo = dificultadesViejas(VIEJO[id](km, seed))
          const nuevo = dificultadesLegado(legacyMotivos(id, km, seed))
          if (JSON.stringify(viejo) === JSON.stringify(nuevo)) iguales++
          else fallos.push(`${km} ${seed}: ${viejo.join(',')} ≠ ${nuevo.join(',')}`)
        }
      expect(fallos.slice(0, 5)).toEqual([])
      expect(iguales).toBe(300)
    },
  )

  it('las dificultades del legado son las que el viejo sorteó, a su km antes de normalize', () => {
    // `normalize` reescala todo por km / Σ y echa el residuo del redondeo al segmento más largo (que
    // a veces es una cota), y `garantizaPuerto` recorta o alarga el puerto más largo: medido, ninguna
    // dificultad se separa más de 1,7 km de la sorteada. En la clásica y el pavé el relleno cuadra
    // exacto (fill = km − Σ dificultades) y el km es el mismo al 0,1.
    const kmDif = (motivos: readonly Motif[]): number[] =>
      motivos.flatMap((m) =>
        m.kind === 'meta'
          ? m.cotaFinal
            ? [m.cotaFinal.km]
            : []
          : m.kind === 'enlace' || m.kind === 'descenso'
            ? []
            : [m.km],
      )
    for (const id of IDS)
      for (const km of KM_ROAD)
        for (const seed of seeds(SEEDS)) {
          const viejo = VIEJO[id](km, seed).filter((s) => s.tipo === 'puerto' || s.tipo === 'paves')
          const nuevo = kmDif(legacyMotivos(id, km, seed))
          const tope = id === 'lg_classic' || id === 'lg_cobbles' ? 0.05 : 2
          viejo.forEach((s, j) =>
            expect(Math.abs(s.km - nuevo[j]!), `${id} ${km} ${seed} #${j}`).toBeLessThanOrEqual(
              tope,
            ),
          )
        }
  })

  it('la meta es siempre el último motivo y el único', () => {
    for (const id of IDS)
      for (const km of KM_ROAD)
        for (const seed of seeds(10)) {
          const m = legacyMotivos(id, km, seed)
          expect(m.at(-1)!.kind).toBe('meta')
          expect(m.filter((x) => x.kind === 'meta').length).toBe(1)
        }
  })

  it('lg_itt es lg_flat, como ittSegments === flatSegments', () => {
    for (const km of KM_ROAD)
      for (const seed of seeds(10))
        expect(legacyMotivos('lg_itt', km, seed)).toEqual(legacyMotivos('lg_flat', km, seed))
    expect(LEGACY.lg_itt.timeTrial).toBe(true)
    expect(LEGACY.lg_itt.kind).toBe('cri')
  })

  it('cada LegacySkeleton lleva su id y su canónico, y la cardinalidad de sus huecos cubre la del canónico', () => {
    for (const id of IDS) {
      const sk = LEGACY[id]
      expect(sk.id).toBe(id)
      for (const slot of sk.slots) {
        const n = sk.canonico.filter(
          (m) => m.kind === slot.motif || (slot.motif === 'puerto' && m.kind === 'cota'),
        ).length
        expect(n, `${id} ${slot.motif}`).toBeGreaterThanOrEqual(slot.n[0])
        expect(n, `${id} ${slot.motif}`).toBeLessThanOrEqual(slot.n[1])
      }
      // la reina y la clásica de montaña sortean su final; el resto lo tiene fijo
      if (id !== 'lg_mountain' && id !== 'lg_mountain_classic')
        expect(sk.canonico.at(-1)!.meta, id).toBe(sk.meta)
    }
  })

  it('colocarLegado acumula los km en orden, sin huecos, y marca la meta', () => {
    const motivos = legacyMotivos('lg_mountain', 195, 'semilla-7')
    const p = colocarLegado(motivos)
    expect(p.length).toBe(motivos.length)
    expect(p[0]!.inicioKm).toBe(0)
    p.forEach((x, i) => {
      expect(x.motif).toBe(motivos[i])
      expect(x.slot).toBe(i === p.length - 1 ? 'meta' : i)
      if (i > 0) expect(x.inicioKm).toBeCloseTo(p[i - 1]!.finKm, 5)
      expect(x.finKm - x.inicioKm).toBeCloseTo(x.motif.km, 5)
    })
  })
})

// ---------------------------------------------------------------------------------------------------
// La tabla pareada (paso 4, §15.6): 300 perfiles por pareja (60 semillas × los 5 km de KM_ROAD).
// ---------------------------------------------------------------------------------------------------

/** `calendar.ts::auto` (privada): una cima al final de cada `puerto`, al km redondeado. Así llegan los viejos al calendario. */
function auto(segments: Segment[]): StageProfile {
  const banners: { km: number; tipo: 'cima' }[] = []
  let cum = 0
  for (const s of segments) {
    cum += s.km
    if (s.tipo === 'puerto') banners.push({ km: Math.round(cum), tipo: 'cima' })
  }
  return { segments, banners: banners.sort((a, b) => a.km - b.km) }
}

/**
 * La zona con que se rinden los legado: la firma genérica con la amplitud del relleno viejo, 1,8 en
 * las formas llanas y 3,2 en las `bumpy` (media, reina y clásicas), topada a `ARCH.motivo.enlace.ampMax`
 * 2,4, que es lo más que la gramática ondula un enlace (y sin `rompepiernas`, decisión 2).
 */
const PLANAS: readonly LegacyId[] = ['lg_flat', 'lg_itt', 'lg_cobbles']
const geoLegado = (id: LegacyId): GeoSignature => ({
  ...ZONAS.generico,
  amplitud: Math.min(ARCH.motivo.enlace.ampMax, PLANAS.includes(id) ? 1.8 : 3.2),
})

/** Una fila del censo para un perfil suelto (una carrera de prueba de una etapa). */
const fila = (profile: StageProfile, id: LegacyId): RouteStats =>
  routeCensus([raceDePrueba(profile, LEGACY[id].kind)])[0]!

function nuevoDe(id: LegacyId, km: number, seed: string): StageProfile {
  const motivos = legacyMotivos(id, km, seed)
  const colocados = colocarLegado(motivos)
  const total = Math.round(motivos.reduce((a, m) => a + m.km, 0) * 10) / 10
  const segs = renderSkeleton(colocados, total, geoLegado(id), (token) =>
    routeRng(`legado|${id}|${km}|${seed}|dib|${token}`),
  )
  return { segments: segs, banners: emitirPancartas(segs, colocados) }
}

const p50 = (xs: readonly number[]): number => cuantilesDe(xs)?.p50 ?? 0
const sd = (xs: readonly number[]): number => {
  if (xs.length < 2) return 0
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}
const histograma = (xs: readonly number[]): Record<number, number> =>
  xs.reduce<Record<number, number>>((h, x) => ({ ...h, [x]: (h[x] ?? 0) + 1 }), {})
const r1 = (x: number): number => Math.round(x * 10) / 10

/** Reloj propio (regla 3 de §15.1): la tabla muestrea 4.800 perfiles con `routeCensus`; medido 1,3 s en local (unos 0,15 s por pareja). */
const RELOJ = { timeout: 60_000 }

describe('tabla pareada: los legado rendidos con renderSkeleton contra los ocho xxxSegments (paso 4)', () => {
  const tabla: string[] = []
  it.each(IDS)(
    '%s: nPuertos idéntico en distribución y |Δ p50| de dPlus, longestClimbKm y kmAfterLastClimb bajo la σ vieja',
    (id) => {
      const viejas: RouteStats[] = []
      const nuevas: RouteStats[] = []
      for (const km of KM_ROAD)
        for (const seed of seeds(SEEDS)) {
          viejas.push(fila(auto(VIEJO[id](km, seed)), id))
          nuevas.push(fila(nuevoDe(id, km, seed), id))
        }
      expect(viejas).toHaveLength(300)
      // nPuertos: la misma distribución (el legado sortea las mismas subidas que el viejo).
      expect(histograma(nuevas.map((r) => r.nPuertos))).toEqual(
        histograma(viejas.map((r) => r.nPuertos)),
      )
      const columnas = ['dPlus', 'longestClimbKm', 'kmAfterLastClimb'] as const
      const celdas: string[] = []
      for (const col of columnas) {
        const v = viejas.flatMap((r) => (r[col] === null ? [] : [r[col]]))
        const n = nuevas.flatMap((r) => (r[col] === null ? [] : [r[col]]))
        expect(n.length, `${id} ${col}: filas con valor`).toBe(v.length)
        const delta = Math.abs(p50(n) - p50(v))
        const sigma = sd(v)
        celdas.push(`${col} ${r1(p50(v))} → ${r1(p50(n))} (|Δ| ${r1(delta)}, σ ${r1(sigma)})`)
        if (sigma === 0) expect(delta, `${id} ${col}`).toBe(0)
        else
          expect(delta, `${id} ${col}: |Δ p50| ${r1(delta)} ≥ σ ${r1(sigma)}`).toBeLessThan(sigma)
      }
      tabla.push(`${id}: ${celdas.join(' · ')}`)
      if (tabla.length === IDS.length) console.info(`[legado] tabla pareada\n${tabla.join('\n')}`)
    },
    RELOJ.timeout,
  )
})
