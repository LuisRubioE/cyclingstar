import { describe, expect, it } from 'vitest'
import type { Segment } from '../../stage/types.js'
import {
  classicSegments,
  cobblesSegments,
  flatSegments,
  hillySegments,
  hillyUphillSegments,
  ittSegments,
  mountainClassicSegments,
  mountainSegments,
} from '../profileGen.js'
import { colocarLegado, LEGACY, legacyMotivos, type LegacyId } from './legacy.js'
import type { Motif } from './motifs.js'

/**
 * I-42: LA GRAMÁTICA EXPRESA LAS FORMAS DE HOY ANTES DE SUSTITUIRLAS (docs/generador.md §15.3).
 *
 * Para cada uno de los ocho generadores viejos, 60 semillas × los km de `stageKind.test.ts`: la lista
 * de motivos del builder legado tiene el MISMO número y orden de dificultades (`puerto`, `paves`) que
 * los segmentos de la función vieja, en 300 de 300. En el paso 4 este fichero gana la tabla pareada
 * (`colocarLegado` + `renderSkeleton` contra los viejos, medidos con `routeCensus`).
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
