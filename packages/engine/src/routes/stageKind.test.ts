import { describe, expect, it } from 'vitest'
import type { Segment, StageProfile } from '../stage/types.js'
import { finalKindOf } from './finalKind.js'
import { generateStage, type GeneratedStage, type StageRequest } from './grammar/generate.js'
import { ZONAS, admite, type GeoZone } from './grammar/geo.js'
import { SKELETONS, skeletonFor, type Skeleton, type SkeletonId } from './grammar/skeletons.js'
import type { StageRole } from './grammar/tour.js'
import { SUMMIT_RUN_IN_KM, runInAfterLastClimb, stageKindOf } from './stageKind.js'

/**
 * LA VARA DEL CLASIFICADOR, CONTRA LO QUE EL CALENDARIO DIBUJA (docs/generador.md §15.10, test 4).
 *
 * Hasta la v86 este test comprobaba `stageKindOf` contra los ocho generadores viejos de
 * `profileGen.ts`, que se fueron a `sim/legacy/` con el cambio de calendario. RE-SELLADO en la v87 por
 * esa causa: ahora se comprueba contra los 32 esqueletos de la gramática, que son lo que el calendario
 * dibuja. Cada esqueleto promete un `kind` y, donde lo declara, un `finalKind`, y el clasificador
 * tiene que devolver eso mismo en el 100 % del barrido de `test:rapido` (regla 3 de §15.1: 20
 * semillas × 3 zonas × 5 km por esqueleto; la malla entera está en `sim/stageKind.completo.test.ts`).
 * `ud_montana` y los `et_reina_*` entran por fin: hasta la v86 las reinas de un día que dibujaba
 * `mountainClassicSegments` no las sellaba nadie (mapa 06 §6.1).
 *
 * Los umbrales NO se recalibran (decisión 26): lo generado se acota con holgura para caber en ellos.
 */

/** El papel con que se pide cada esqueleto de etapa: el primero de su columna «Papel» (§5.3). */
const PAPEL: Partial<Record<SkeletonId, StageRole>> = {
  et_llana: 'llana',
  et_llana_viento: 'llana_viento',
  et_media_valle: 'media',
  et_media_tendida: 'media',
  et_media_alto: 'media_alto',
  et_media_muro: 'media_muro',
  et_reina_alto_largo: 'reina_alto',
  et_reina_alto_corto: 'reina_alto',
  et_reina_valle: 'reina_valle',
  et_reina_cima_cerca: 'reina_valle',
  et_reina_encadenada: 'reina_encadenada',
  et_montana_corta: 'montana_corta',
  et_reina_blanda: 'reina_alto',
  et_crono: 'cri',
  et_prologo: 'prologo',
  et_cronoescalada: 'cronoescalada',
}
const TERRENO: Record<Skeleton['kind'], StageRequest['terrain']> = {
  llana: 'flat',
  media: 'hilly',
  clasica: 'classic',
  reina: 'mountain',
  cri: 'itt',
}
function requestDe(sk: Skeleton, zona: GeoZone, km: number, seed: string): StageRequest {
  const etapa = sk.id.startsWith('et_')
  return {
    raceId: seed,
    stageIndex: 1,
    season: 0,
    km,
    role: etapa ? PAPEL[sk.id]! : 'un_dia',
    terrain: sk.label === 'Cobbles' ? 'cobbles' : TERRENO[sk.kind],
    geo: ZONAS[zona],
    raceClass: sk.id === 'nc_ruta' ? 'NC' : 'WT',
    format: etapa ? 'una-semana' : 'un-dia',
    routeSource: 'generado',
    fixed: { skeleton: sk.id },
  }
}
/** Las tres primeras zonas, en el orden de `ZONAS`, que admiten el esqueleto. */
const TRES_ZONAS = (sk: Skeleton): GeoZone[] =>
  (Object.keys(ZONAS) as GeoZone[]).filter((z) => admite(sk.requiere, ZONAS[z])).slice(0, 3)
/** Los extremos de `sk.km` y tres intermedios. */
const CINCO_KM = (sk: Skeleton): number[] =>
  [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((sk.km[0] + f * (sk.km[1] - sk.km[0])) * 10) / 10)
const semillas = (n: number): string[] => Array.from({ length: n }, (_, i) => `semilla-${i}`)

/** Un tramo `llano`, uno `puerto` y uno `descenso`, con sus rampas (sin rampas no suben). */
const llano = (km: number): Segment => ({ km, tipo: 'llano', tramos: [{ km, g: 0.5 }] })
const puerto = (km: number, g: number): Segment => ({ km, tipo: 'puerto', tramos: [{ km, g }] })
const bajada = (km: number): Segment => ({ km, tipo: 'descenso', tramos: [{ km, g: -5 }] })
const perfil = (...segments: Segment[]): StageProfile => ({ segments })

describe('routes: qué clase de etapa dibuja un recorrido', () => {
  const vistas = new Map<string, Set<string>>() // kind → etiquetas vistas en el barrido
  it.each(Object.values(SKELETONS))('$id: kind y finalKind del esqueleto en el 100 %', (sk) => {
    let n = 0
    for (const zona of TRES_ZONAS(sk)) {
      const skz = skeletonFor(sk.id, ZONAS[zona]) // nc_ruta es clasica donde la cota no llega a 3,3 km
      for (const km of CINCO_KM(sk))
        for (const s of semillas(20)) {
          const g: GeneratedStage = generateStage(requestDe(sk, zona, km, s))
          const leido = stageKindOf(g.profile, g.timeTrial)
          expect(leido.kind, `${sk.id} ${zona} ${km} ${s}`).toBe(skz.kind)
          if (skz.finalKind)
            expect(finalKindOf(g.profile), `${sk.id} ${zona} ${km} ${s}`).toBe(skz.finalKind)
          vistas.set(leido.kind, (vistas.get(leido.kind) ?? new Set()).add(leido.label))
          n++
        }
    }
    expect(n).toBeGreaterThan(0)
  })

  it('las dos etiquetas de reina aparecen en el barrido: «Summit finish» y «Mountains»', () => {
    // Si solo saliera una, la regla de los 5 km no estaría separando nada en lo que el calendario
    // dibuja (hasta la v86 lo separaba el sorteo de `queenFinalMix`).
    expect([...(vistas.get('reina') ?? [])].sort()).toEqual(
      expect.arrayContaining(['Mountains', 'Summit finish']),
    )
  })

  it('una crono llana sin timeTrial es llana; una cronoescalada sin timeTrial es reina', () => {
    // RE-SELLADO (decisión 42). `timeTrial` es un dato de entrada y no algo que se lea del relieve:
    // una crono llana corrida en grupo es una llana. La cronoescalada lleva su puerto de meta de
    // [9; 15] km (V8a), así que en grupo el clasificador la lee reina y no media, como decía §7.1: un
    // puerto de 9 km es alta montaña para `PASS_MIN_KM` 8,5. Con `timeTrial` las dos son `cri`.
    let llanas = 0
    for (const km of CINCO_KM(SKELETONS.et_crono))
      for (const s of semillas(20)) {
        const g = generateStage(requestDe(SKELETONS.et_crono, 'generico', km, s))
        expect(stageKindOf(g.profile, true).kind).toBe('cri')
        // Una `et_crono` puede llevar una cota corta (entonces, en grupo, es una clásica de muros):
        // la que no sube nada es una llana.
        if (g.profile.segments.some((x) => x.tipo === 'puerto')) continue
        expect(stageKindOf(g.profile, false).kind, `${km} ${s}`).toBe('llana')
        llanas++
      }
    expect(llanas).toBeGreaterThan(0)
    for (const km of CINCO_KM(SKELETONS.et_cronoescalada))
      for (const s of semillas(20)) {
        const g = generateStage(requestDe(SKELETONS.et_cronoescalada, 'pirineos', km, s))
        expect(stageKindOf(g.profile, true).kind).toBe('cri')
        expect(stageKindOf(g.profile, false), `${km} ${s}`).toEqual({
          kind: 'reina',
          label: 'Summit finish',
        })
      }
  })

  it('la etiqueta del final la decide la última cima a ≤ SUMMIT_RUN_IN_KM de meta (§11.5 regla 2)', () => {
    expect(SUMMIT_RUN_IN_KM).toBe(5)
    // Una reina con 3 km de valle tras el último puerto corona cerca: «Summit finish»; con 6, no.
    const reina3 = perfil(llano(120), puerto(12, 7), bajada(3))
    const reina6 = perfil(llano(120), puerto(12, 7), bajada(3), llano(3))
    expect(runInAfterLastClimb(reina3.segments)).toBe(3)
    expect(stageKindOf(reina3, false)).toEqual({ kind: 'reina', label: 'Summit finish' })
    expect(stageKindOf(reina6, false)).toEqual({ kind: 'reina', label: 'Mountains' })
    // Una media con 4 km de valle es «Uphill finish».
    expect(stageKindOf(perfil(llano(140), puerto(5, 6), llano(4)), false)).toEqual({
      kind: 'media',
      label: 'Uphill finish',
    })
    // `meteEnAlto` sigue decidiendo la clásica: un muro de 1 km con 2 km de llano detrás no muere
    // arriba, así que es una clásica de muros aunque la cima esté a menos de 5 km.
    expect(stageKindOf(perfil(llano(150), puerto(1, 10), llano(2)), false)).toEqual({
      kind: 'clasica',
      label: 'Classic',
    })
    expect(runInAfterLastClimb([llano(100)])).toBe(Number.POSITIVE_INFINITY)
  })

  it('ud_muros en 300 semillas sigue siendo clásica: ningún último muro la vuelve media (V6)', () => {
    const sk = SKELETONS.ud_muros
    const zona = TRES_ZONAS(sk)[0]!
    for (const s of semillas(300)) {
      const g = generateStage(requestDe(sk, zona, 180, s))
      expect(stageKindOf(g.profile, false), s).toEqual({ kind: 'clasica', label: 'Classic' })
    }
  })

  it('un recorrido sin segmentos no revienta: es una llana', () => {
    expect(stageKindOf({ segments: [] }, false)).toEqual({ kind: 'llana', label: 'Flat' })
  })
})
