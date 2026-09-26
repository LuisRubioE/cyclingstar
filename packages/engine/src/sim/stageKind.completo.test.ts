import { afterAll, describe, expect, it } from 'vitest'
import { ARCH } from '../constants.js'
import {
  esqueletoDeCarrera,
  generateStage,
  type GeneratedStage,
  type StageRequest,
} from '../routes/grammar/generate.js'
import { ZONAS, admite, type GeoZone } from '../routes/grammar/geo.js'
import {
  SKELETONS,
  skeletonFor,
  type Skeleton,
  type SkeletonId,
} from '../routes/grammar/skeletons.js'
import type { StageRole } from '../routes/grammar/tour.js'

/**
 * LA MALLA COMPLETA DE `generateStage` (docs/generador.md §5.9 y §15.7, paso 5).
 *
 * 60 semillas × 5 km × TODAS las zonas que `admite` cada esqueleto, con las aserciones del barrido de
 * `test:rapido` de `generate.test.ts` y `skeletons.test.ts`: V6 (`kind`) y V7 (`finalKind`) en el
 * 100 %, `intentos` p95 ≤ `ARCH.veto.intentosP95` y `degradado` ≤ `fallbackMaxShare.testPorEsqueleto`.
 * Corre con `test:bancos` y en la entrada «mundo y radio» de la matriz de `ci.yml`, porque
 * `test:rapido` excluye `packages/engine/src/sim/**`. No simula nada: es geometría.
 *
 * Reloj (regla 3 de §15.1: ≥ 4× lo que cuesta): medido en el paso 5, 194.400 generaciones en 34,5 s
 * en local (el `it` más caro, `nc_ruta` en todas sus zonas, 3,2 s); el `timeout` de cada `it` es
 * 4 × el fichero entero medido, 140 s, para que ni el runner lento ni la cobertura lo tiren
 * (docs/balance.md vN §0, «Coste de los barridos de `generateStage`»).
 */

const TIMEOUT_MS = 140_000 // 4 × 34,5 s medidos, redondeado arriba

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
const terrenoDe = (sk: Skeleton): StageRequest['terrain'] =>
  sk.label === 'Cobbles'
    ? 'cobbles'
    : (
        {
          llana: 'flat',
          media: 'hilly',
          clasica: 'classic',
          reina: 'mountain',
          cri: 'itt',
        } as const
      )[sk.kind]
function requestDe(sk: Skeleton, zona: GeoZone, km: number, seed: string): StageRequest {
  const etapa = sk.id.startsWith('et_')
  return {
    raceId: seed,
    stageIndex: 1,
    season: 0,
    km,
    role: etapa ? PAPEL[sk.id]! : 'un_dia',
    terrain: terrenoDe(sk),
    geo: ZONAS[zona],
    raceClass: sk.id === 'nc_ruta' ? 'NC' : 'WT',
    format: etapa ? 'una-semana' : 'un-dia',
    routeSource: 'generado',
    fixed: { skeleton: sk.id },
  }
}
const semillas = (n: number): string[] => Array.from({ length: n }, (_, i) => `t${i}`)
const CINCO_KM = (sk: Skeleton): number[] =>
  [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((sk.km[0] + f * (sk.km[1] - sk.km[0])) * 10) / 10)
const p95 = (xs: number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1]!

const reloj = { ms: 0, n: 0, degradadas: 0, reintentos: 0 }
afterAll(() => {
  if (reloj.n > 0)
    console.info(
      `[stageKind.completo] ${reloj.n} generaciones en ${(reloj.ms / 1000).toFixed(1)} s; ` +
        `degradadas ${reloj.degradadas}, con reintento ${reloj.reintentos}`,
    )
})

describe('malla completa: 60 semillas × 5 km × toda zona admitida (V6 y V7)', () => {
  it.each(Object.values(SKELETONS))(
    '$id',
    (sk) => {
      const t0 = performance.now()
      const salidas: GeneratedStage[] = []
      for (const zona of Object.keys(ZONAS) as GeoZone[]) {
        if (!admite(sk.requiere, ZONAS[zona])) continue
        const skz = skeletonFor(sk.id, ZONAS[zona]) // nc_ruta es clasica donde la cota no llega a 3,3 km
        for (const km of CINCO_KM(sk))
          for (const s of semillas(60)) {
            const req = requestDe(sk, zona, km, s)
            const g = generateStage(req)
            if (g.kind !== skz.kind) expect(g.kind, `${sk.id} ${zona} ${km} ${s}`).toBe(skz.kind) // V6
            const fk = esqueletoDeCarrera(skz, req).finalKind // el final de esta carrera (paso 9)
            if (fk && g.arch.finalKind !== fk)
              expect(g.arch.finalKind, `${sk.id} ${zona} ${km} ${s}`).toBe(fk) // V7
            salidas.push(g)
          }
      }
      reloj.ms += performance.now() - t0
      reloj.n += salidas.length
      const degradadas = salidas.filter((g) => g.arch.degradado).length
      reloj.degradadas += degradadas
      reloj.reintentos += salidas.filter((g) => g.arch.intentos > 1).length
      expect(salidas.length).toBeGreaterThan(0)
      expect(degradadas / salidas.length).toBeLessThanOrEqual(
        ARCH.veto.fallbackMaxShare.testPorEsqueleto,
      )
      expect(p95(salidas.map((g) => g.arch.intentos))).toBeLessThanOrEqual(ARCH.veto.intentosP95)
    },
    TIMEOUT_MS,
  )
})
