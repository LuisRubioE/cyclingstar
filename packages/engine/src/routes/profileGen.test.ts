import { describe, expect, it } from 'vitest'
import type { Ramp, Segment } from '../stage/types.js'
import { between, climb, rolling, routeRng, split } from './profileGen.js'

/**
 * LAS DOS PRIMITIVAS QUE CAMBIAN DE FIRMA EN EL PASO 1 (docs/generador.md §8.7 y §8.14).
 *
 * `rolling(rand, km, bumpy)` pasa a `rolling(rand, km, amp, pRompepiernas)` y `climb` gana
 * `opts { gMin, gMax }`. Los ocho generadores viejos las siguen llamando y `golden.test.ts` exige que
 * el calendario no cambie ni un byte; aquí se comprueba la primitiva sola, tirada a tirada, contra
 * una copia literal de su cuerpo en `8585ca2`.
 */

// --- Copia literal de profileGen.ts en 8585ca2 (l. 72-82 y l. 100-122), con `between` y `split` de hoy. ---
function climbViejo(rand: () => number, len: number, avg: number): Segment {
  const n = Math.max(2, Math.round(len / 2.2))
  const lens = split(rand, len, n)
  const tramos: Ramp[] = lens.map((km, i) => {
    const prog = (i / Math.max(1, n - 1) - 0.5) * 2 // -1..+1
    const g = Math.max(1, avg + prog * 1.6 + between(rand, -1.2, 1.2))
    return { km, g: Math.round(g * 10) / 10 }
  })
  return { km: Math.round(len * 10) / 10, tipo: 'puerto', tramos }
}

function rollingViejo(rand: () => number, km: number, bumpy = false): Segment[] {
  if (km <= 0.5) return []
  const chunk = between(rand, 3, 6)
  const n = Math.max(1, Math.round(km / chunk))
  const lens = split(rand, km, n)
  const amp = bumpy ? 3.2 : 1.8
  return lens.map((segKm, i): Segment => {
    const half = Math.round((segKm / 2) * 10) / 10
    const rest = Math.round((segKm - half) * 10) / 10
    const g = between(rand, 0.8, amp) * (i % 2 === 0 ? 1 : -1)
    const gg = Math.round(g * 10) / 10
    const tramos: Ramp[] =
      rest > 0.1
        ? [
            { km: half, g: gg },
            { km: rest, g: -Math.round(gg * between(rand, 0.6, 1) * 10) / 10 },
          ]
        : [{ km: segKm, g: gg }]
    const tipo: Segment['tipo'] = bumpy && rand() < 0.35 ? 'rompepiernas' : 'llano'
    return { km: Math.round(segKm * 10) / 10, tipo, tramos }
  })
}

const semillas = (n: number): string[] => Array.from({ length: n }, (_, i) => `t${i}`)
const KMS = [0.6, 3, 7.4, 12, 25, 48, 130, 215]
const rampas = (s: Segment): number[] => (s.tramos ?? []).map((t) => t.g)

describe('rolling', () => {
  it('con pRompepiernas 0 no consume la tirada del tipo: la corriente queda donde la deja la versión de hoy con bumpy false', () => {
    for (const seed of semillas(100))
      for (const km of KMS) {
        const a = routeRng(seed)
        const b = routeRng(seed)
        rolling(a, km, 1.8, 0)
        rollingViejo(b, km, false)
        expect(a(), `${seed} ${km}`).toBe(b())
      }
  })

  it('rolling(r, km, 1.8, 0) y rolling(r, km, 3.2, 0.35) reproducen tirada a tirada los números del rolling de 8585ca2 con bumpy false y true', () => {
    for (const seed of semillas(200))
      for (const km of KMS) {
        const [a, b] = [routeRng(seed), routeRng(seed)]
        expect(rolling(a, km, 1.8, 0), `${seed} ${km} llano`).toEqual(rollingViejo(b, km, false))
        expect(a()).toBe(b())
        const [c, d] = [routeRng(seed), routeRng(seed)]
        expect(rolling(c, km, 3.2, 0.35), `${seed} ${km} bumpy`).toEqual(rollingViejo(d, km, true))
        expect(c()).toBe(d())
      }
  })

  it('con amp 0,4 (pólder) todo |g| de primer tramo cae en [0,2; 0,4]; con amp 1,8 sigue arrancando en 0,8', () => {
    for (const seed of semillas(200)) {
      for (const s of rolling(routeRng(seed), 120, 0.4, 0)) {
        const g = Math.abs(s.tramos![0]!.g)
        expect(g).toBeGreaterThanOrEqual(0.2)
        expect(g).toBeLessThanOrEqual(0.4)
      }
      for (const s of rolling(routeRng(seed), 120, 1.8, 0)) {
        const g = Math.abs(s.tramos![0]!.g)
        expect(g).toBeGreaterThanOrEqual(0.8)
        expect(g).toBeLessThanOrEqual(1.8)
      }
    }
  })

  it('km 0,5 devuelve [] y km 0,6 devuelve al menos un segmento', () => {
    for (const seed of semillas(50)) {
      expect(rolling(routeRng(seed), 0.5, 1.8, 0)).toEqual([])
      expect(rolling(routeRng(seed), 0.6, 1.8, 0).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('con pRompepiernas 0 nunca emite rompepiernas', () => {
    for (const seed of semillas(100))
      for (const s of rolling(routeRng(seed), 200, 3.2, 0)) expect(s.tipo).toBe('llano')
  })
})

describe('climb', () => {
  it('sin opts reproduce tirada a tirada los tramos del climb de 8585ca2 en 300 semillas × len [0,5; 25] × avg [3; 12]', () => {
    const LENS = [0.5, 1, 2.5, 4.4, 8.6, 12, 17.3, 25]
    const AVGS = [3, 5.5, 8, 10, 12]
    for (const seed of semillas(300))
      for (const len of LENS)
        for (const avg of AVGS) {
          const [a, b] = [routeRng(seed), routeRng(seed)]
          expect(climb(a, len, avg), `${seed} ${len} ${avg}`).toEqual(climbViejo(b, len, avg))
          expect(a()).toBe(b())
        }
  })

  it('sin opts y con { gMin: 8, gMax: 16 } consume las mismas tiradas: tras la llamada, el siguiente rand() coincide', () => {
    for (const seed of semillas(300))
      for (const len of [0.7, 1.4, 2.5, 6]) {
        const [a, b] = [routeRng(seed), routeRng(seed)]
        climb(a, len, 11)
        climb(b, len, 11, { gMin: 8, gMax: 16 })
        expect(a(), `${seed} ${len}`).toBe(b())
      }
  })

  it('con { gMin: 8, gMax: 16 } toda rampa cae en [8; 16] y con { gMin: 4, gMax: 7.9 } en [4; 7,9], en 1.000 semillas', () => {
    for (const seed of semillas(1000)) {
      const r = routeRng(seed)
      for (const g of rampas(climb(r, 1 + r() * 1.5, 8 + r() * 8, { gMin: 8, gMax: 16 }))) {
        expect(g).toBeGreaterThanOrEqual(8)
        expect(g).toBeLessThanOrEqual(16)
      }
      for (const g of rampas(climb(r, 1 + r() * 1.9, 5 + r() * 2, { gMin: 4, gMax: 7.9 }))) {
        expect(g).toBeGreaterThanOrEqual(4)
        expect(g).toBeLessThanOrEqual(7.9)
      }
    }
  })

  it('el suelo 1 va antes del recorte: con avg 0,5 y sin opts ninguna rampa baja de 1,0; con { gMin: 4 } ninguna baja de 4,0', () => {
    for (const seed of semillas(300)) {
      for (const g of rampas(climb(routeRng(seed), 6, 0.5))) expect(g).toBeGreaterThanOrEqual(1)
      for (const g of rampas(climb(routeRng(seed), 6, 0.5, { gMin: 4 })))
        expect(g).toBeGreaterThanOrEqual(4)
    }
  })

  // Lee ARCH.motivo.muro (paso 2) y ARCH.meta.repecho (paso 3): se enciende en el paso 3 (§15.1 regla 1).
  it.todo(
    'muro.gMin < muro.gMax, repecho.gMin < repecho.gMax y los cuatro son múltiplos de 0,1 (Math.round(x * 10) === x * 10)',
  )
})
