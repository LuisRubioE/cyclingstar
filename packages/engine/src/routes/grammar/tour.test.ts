import { describe, expect, it } from 'vitest'
import { ARCH, ROUTE } from '../../constants.js'
import { routeRng } from '../profileGen.js'
import type { RaceClass } from '../uci.js'
import { SKELETONS } from './skeletons.js'
import { kmDe, type KmRole, type StageRole } from './tour.js'

/**
 * LA VUELTA POR ETAPAS (docs/generador.md sección 7). Paso 5: solo la parte de km (`kmDe`, §7.4),
 * adelantada del paso 7 porque la galería la necesita (§15.7); el resto del fichero llega con
 * `composeTour` en el paso 7.
 */

const semillas = (n: number): string[] => Array.from({ length: n }, (_, i) => `t${i}`)
const CLASES_DE_EQUIPOS: Exclude<RaceClass, 'NC'>[] = ['WT', 'Pro', '1', '2']
/** Las columnas de `ARCH.km.porClase` de cada papel de vuelta (§12.7). */
const COLUMNA: Partial<Record<KmRole, 'llana' | 'media' | 'reina' | 'corta' | 'unDia'>> = {
  llana: 'llana',
  llana_viento: 'llana',
  media: 'media',
  media_alto: 'media',
  media_muro: 'media',
  reina_alto: 'reina',
  reina_valle: 'reina',
  reina_encadenada: 'reina',
  montana_corta: 'corta',
  un_dia: 'unDia',
}

describe('kmDe (§7.4)', () => {
  it('cae dentro de ARCH.km.porClase para cada (clase, papel), sin última etapa', () => {
    for (const clase of CLASES_DE_EQUIPOS)
      for (const [role, col] of Object.entries(COLUMNA) as [KmRole, string][]) {
        const [min, rango] = ARCH.km.porClase[clase][col as 'llana']
        for (const s of semillas(120)) {
          const km = kmDe(role, clase, 5, false, routeRng(s))
          expect(km, `${clase} ${role}`).toBeGreaterThanOrEqual(Math.round(min))
          expect(km, `${clase} ${role}`).toBeLessThanOrEqual(Math.round(min + rango))
        }
      }
  })
  it('ninguna etapa pasa de ARCH.km.maxPorClase, con última etapa o sin ella', () => {
    const roles: KmRole[] = [
      ...(Object.keys(COLUMNA) as KmRole[]),
      'cri',
      'prologo',
      'cronoescalada',
    ]
    for (const clase of CLASES_DE_EQUIPOS)
      for (const role of roles)
        for (const n of [1, 5, 10, 21])
          for (const s of semillas(40))
            for (const last of [false, true])
              expect(kmDe(role, clase, n, last, routeRng(`${s}|${n}`))).toBeLessThanOrEqual(
                ARCH.km.maxPorClase[clase],
              )
  })
  it('km por clase: ninguna etapa .2 supera min + rango de su columna (155 reina, 150 llana y media, 120 corta) ni 180; p90 de las etapas .2 ≤ 155', () => {
    const kms: number[] = []
    const papeles: StageRole[] = [
      'llana',
      'media',
      'media_alto',
      'reina_alto',
      'reina_valle',
      'montana_corta',
    ]
    for (const n of [3, 5, 8])
      for (const s of semillas(120))
        for (const role of papeles) {
          const km = kmDe(role, '2', n, false, routeRng(`${s}|${n}|${role}`))
          const [min, rango] = ARCH.km.porClase['2'][COLUMNA[role] as 'llana']
          expect(km).toBeLessThanOrEqual(min + rango)
          expect(km).toBeLessThanOrEqual(ARCH.km.maxPorClase['2'])
          kms.push(km)
        }
    kms.sort((a, b) => a - b)
    expect(kms[Math.floor(kms.length * 0.9)]!).toBeLessThanOrEqual(155)
  })
  it('la crono nacional distingue élite y sub-23, y la de vuelta larga usa el rango largo', () => {
    for (const s of semillas(120)) {
      const r = routeRng(s)
      expect(kmDe('cri', 'NC', 1, false, r)).toBeGreaterThanOrEqual(35)
      expect(kmDe('cri_u23', 'NC', 1, false, r)).toBeLessThanOrEqual(35)
      expect(kmDe('cri', 'WT', 10, false, r)).toBeGreaterThanOrEqual(ROUTE.ittLongKmMin)
      expect(kmDe('cri', 'WT', 5, false, r)).toBeLessThanOrEqual(ROUTE.ittKmMin + ROUTE.ittKmRange)
    }
  })
  it('los nacionales de ruta leen su columna, y prólogo y cronoescalada miden lo de su esqueleto', () => {
    for (const s of semillas(120)) {
      const ruta = kmDe('un_dia', 'NC', 1, false, routeRng(s))
      expect(ruta).toBeGreaterThanOrEqual(180)
      expect(ruta).toBeLessThanOrEqual(240)
      const u23 = kmDe('un_dia_u23', 'NC', 1, false, routeRng(s))
      expect(u23).toBeGreaterThanOrEqual(140)
      expect(u23).toBeLessThanOrEqual(180)
      const pro = kmDe('prologo', 'WT', 7, false, routeRng(s))
      expect(pro).toBeGreaterThanOrEqual(SKELETONS.et_prologo.km[0])
      expect(pro).toBeLessThanOrEqual(SKELETONS.et_prologo.km[1])
      const ce = kmDe('cronoescalada', 'Pro', 7, true, routeRng(s)) // la crono no se acorta en la última
      expect(ce).toBeGreaterThanOrEqual(SKELETONS.et_cronoescalada.km[0])
      expect(ce).toBeLessThanOrEqual(SKELETONS.et_cronoescalada.km[1])
    }
  })
  it('la última etapa de una vuelta mide × lastStageKmFactor; un papel sub-23 fuera de NC, o uno de vuelta en NC, lanza', () => {
    const a = kmDe('llana', 'WT', 7, false, routeRng('ultima'))
    const b = kmDe('llana', 'WT', 7, true, routeRng('ultima'))
    expect(b).toBeLessThan(a)
    expect(Math.abs(b - a * ROUTE.lastStageKmFactor)).toBeLessThanOrEqual(1)
    expect(() => kmDe('un_dia_u23', 'WT', 1, false, routeRng('x'))).toThrow(/campeonatos/)
    expect(() => kmDe('reina_alto', 'NC', 1, false, routeRng('x'))).toThrow(/nacional/)
  })
  it('una tirada: el mismo rand da el mismo km', () => {
    expect(kmDe('media', 'Pro', 6, false, routeRng('una'))).toBe(
      kmDe('media', 'Pro', 6, false, routeRng('una')),
    )
  })
})
