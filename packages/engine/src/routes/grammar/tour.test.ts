import { afterAll, describe, expect, it } from 'vitest'
import { ARCH, ROUTE } from '../../constants.js'
import { RACE_ROWS, SEASON_CALENDAR, type StageSpec } from '../calendar.js'
import { RACE_EDITIONS } from '../editions.js'
import type { RouteTerrain } from '../featureProfile.js'
import { routeRng } from '../profileGen.js'
import type { RaceClass } from '../uci.js'
import { TERRITORIOS, ZONAS, territorioDe } from './geo.js'
import { RACE_REGION } from './regions.js'
import { SKELETONS } from './skeletons.js'
import {
  DEFAULT_ROUTE_CONTEXT,
  TOUR_SKELETONS,
  acabaArriba,
  admiteReina,
  composeTour,
  descansosDe,
  esCrono,
  esLlana,
  esReina,
  garantias,
  itinerarioDe,
  kmDe,
  tourSkeletonDe,
  ventanaReina,
  type KmRole,
  type RouteContext,
  type StageRole,
} from './tour.js'
import { V13, V14 } from './veto.js'

/**
 * LA VUELTA POR ETAPAS (docs/generador.md sección 7 y §7.7; paso 7 del plan, §15.8). La parte de km
 * (`kmDe`, §7.4) llegó en el paso 5 porque la galería la necesitaba; el resto, con `composeTour`: el
 * itinerario (ventana, metas, papeles, reina en la cordillera), las reglas de bloque con V13 y V14, las
 * dos tiradas nuevas (prólogo y cronoescalada) y las seis garantías de `calendar.test.ts` reescritas
 * contra `composeTour` en tres territorios. `calendar.test.ts` no se toca: sigue probando `stageMix`,
 * que hasta el paso 8 es la vieja.
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

// ---------------------------------------------------------------------------------------------------
// El itinerario (§7.1 a §7.3): papeles sin dibujar, barato; 120 semillas como `calendar.test.ts`.
// ---------------------------------------------------------------------------------------------------

const SEMILLAS = semillas(120).map((s) => `tour-${s}`)
/**
 * Un territorio por relieve (§7.2): XX cae a FALLBACK (`generico`); GB es `britanicas`, sin cordillera.
 * El relieve `llano` es AE (`golfo`) y no BE, como escribía §7.7: en `ZONAS` `flandes` es `ondulado` y
 * `ardenas` `media` (BE se prueba aparte, sin reina y con sus garantías dibujadas).
 */
const PAISES: Record<string, { relieve: string; terrain: RouteTerrain }> = {
  AE: { relieve: 'llano', terrain: 'flat' },
  XX: { relieve: 'ondulado', terrain: 'hilly' },
  GB: { relieve: 'media', terrain: 'hilly' },
  ES: { relieve: 'montana', terrain: 'mountain' },
  CO: { relieve: 'alta', terrain: 'mountain' },
}
const TODAS_LAS_N = Array.from({ length: 20 }, (_, i) => i + 2) // de 2 a 21
const claseDe = (n: number): RaceClass => (n >= 15 ? 'WT' : n >= 6 ? 'Pro' : '2')
const formatoDe = (n: number): 'gran-vuelta' | 'una-semana' =>
  n >= ROUTE.grandTourStages ? 'gran-vuelta' : 'una-semana'

describe('grammar/tour: el itinerario (§7.1 a §7.3)', () => {
  it('las cinco garantías siguen tras bloques y reparación', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 11, 15, 21])
      for (const cc of Object.keys(PAISES))
        for (const s of SEMILLAS) {
          const it = itinerarioDe(s, cc, n, 'flat', '2', formatoDe(n))
          const p = it.papeles
          expect(
            p.some((r) => esCrono(r) || acabaArriba(r) || r === 'media_muro'),
            `${cc} ${n} ${s}`,
          ).toBe(true) // la de fondo
          if (n >= ROUTE.ittAlwaysFlatStages) expect(p.some(esCrono)).toBe(true) // llana de 4+ con crono
          expect(p[0] === 'llana' || p[0] === 'prologo').toBe(true) // re-sellado: prólogo permitido
          for (let i = 0; i + ARCH.bloques.llanasSeguidasMax < n; i++)
            expect(p.slice(i, i + ARCH.bloques.llanasSeguidasMax + 1).every(esLlana)).toBe(false) // nunca 8 llanas
        }
  })
  it('garantias solo endurece y no toca la primera ni las cronos', () => {
    const r: StageRole[] = ['llana', 'llana', 'cri', 'llana', 'llana']
    const z = Array.from({ length: 5 }, () => 'generico' as const)
    const g = garantias(r, 'flat', 5, z)
    expect(g[0]).toBe('llana')
    expect(g[2]).toBe('cri')
    expect(g.filter((x) => !esLlana(x) && !esCrono(x)).length).toBeGreaterThanOrEqual(2)
    expect(g.some(acabaArriba)).toBe(true)
    // Sin ninguna zona que admita un final en alto (flandes), la garantía la cumple el muro.
    const fl = garantias(['llana', 'llana', 'llana', 'llana'], 'hilly', 4, [
      'flandes',
      'flandes',
      'flandes',
      'flandes',
    ])
    expect(fl).toContain('media_muro')
    expect(fl.some(acabaArriba)).toBe(false)
  })
  it('una vuelta belga no tiene reina, y una colombiana con terreno de montaña sí', () => {
    for (let i = 0; i < 120; i++) {
      const n = 4 + (i % 5) // 4 a 8 etapas
      const be = itinerarioDe(`vu-be-${i}`, 'BE', n, 'mountain', '1', 'una-semana')
      expect(be.papeles.filter(esReina).length, `BE ${i}`).toBe(0)
      const co = itinerarioDe(`vu-co-${i}`, 'CO', n, 'mountain', '1', 'una-semana')
      expect(co.papeles.some(esReina), `CO ${i}`).toBe(true)
      expect(co.metas[co.papeles.findIndex(esReina)]).toBe(TERRITORIOS.CO!.cordillera)
    }
  })
  it('ninguna reina en un país sin cordillera (BE, NL, DK, AE, AU y, por §6.3 y D8, DE, HU, KR, TH, IN)', () => {
    for (const cc of ['BE', 'NL', 'DK', 'AE', 'AU', 'DE', 'HU', 'KR', 'TH', 'IN'])
      for (const n of [4, 6, 8, 21])
        for (const s of SEMILLAS) {
          const it = itinerarioDe(s, cc, n, 'mountain', 'Pro', formatoDe(n))
          expect(it.papeles.filter(esReina), `${cc} ${n} ${s}`).toHaveLength(0)
        }
  })
  it('AR y CL: como máximo una reina por vuelta, siempre reina_alto (et_reina_blanda); ninguna en gran vuelta', () => {
    let conReina = 0
    for (const cc of ['AR', 'CL'])
      for (const n of [5, 8])
        for (const s of SEMILLAS) {
          const reinas = itinerarioDe(s, cc, n, 'mountain', '2', 'una-semana').papeles.filter(
            esReina,
          )
          expect(reinas.length).toBeLessThanOrEqual(1)
          reinas.forEach((r) => expect(r).toBe('reina_alto'))
          conReina += reinas.length
        }
    expect(conReina).toBeGreaterThan(0) // la excepción existe
    for (const s of SEMILLAS)
      expect(
        itinerarioDe(s, 'AR', 21, 'mountain', 'WT', 'gran-vuelta').papeles.filter(esReina),
      ).toHaveLength(0)
  })
  it('la reina cae en una meta de cordillera o de zona montana/alta, y tarde', () => {
    for (const s of SEMILLAS) {
      const it = itinerarioDe(s, 'ES', 7, 'mountain', 'WT', 'una-semana')
      it.papeles.forEach((r, i) => {
        if (esReina(r)) {
          expect(admiteReina(it.metas[i]!, 'pirineos')).toBe(true)
          expect(i).toBeGreaterThanOrEqual(4)
        }
      })
    }
  })
  it('gran vuelta generada: descansos tras 9 y 15, reina en ventanaReina(n), ≤ 1 final en alto en la primera semana, ≤ 7 de alta montaña, ≤ 3 cronos', () => {
    expect(descansosDe(21)).toEqual([9, 15])
    expect(descansosDe(15)).toEqual([9])
    expect(descansosDe(11)).toEqual([])
    expect(ventanaReina(21)).toEqual([14, 19])
    expect(ventanaReina(16)).toEqual([10, 14])
    expect(ventanaReina(15)).toEqual([10, 13])
    for (const n of [15, 16, 21]) {
      let conReina = 0
      for (const s of SEMILLAS) {
        const it = itinerarioDe(s, 'ES', n, 'mountain', 'WT', 'gran-vuelta')
        const [a, b] = ventanaReina(n)
        it.papeles.forEach((r, i) => {
          if (esReina(r)) expect(i >= a && i <= b, `${n} ${s} e${i + 1}`).toBe(true)
        })
        expect(it.papeles.filter(esCrono).length).toBeLessThanOrEqual(3)
        expect(
          it.papeles.slice(0, ARCH.bloques.gv.descansos[0]).filter(acabaArriba).length,
        ).toBeLessThanOrEqual(ARCH.bloques.gv.primeraSemanaFinalesAlto)
        expect(it.papeles.filter(esReina).length).toBeLessThanOrEqual(
          ARCH.bloques.gv.maxAltaMontana,
        )
        expect(V14(it.papeles, n), `${n} ${s}`).toBeNull()
        if (it.papeles.some(esReina)) conReina++
      }
      expect(conReina).toBeGreaterThan(SEMILLAS.length / 2) // n = 15 y 16 no se quedan sin reina por construcción
    }
  })
  it('vu_corta lleva como mucho una crono y una reina; el prólogo solo aparece con n ≥ 6', () => {
    for (const n of [2, 3, 4, 5])
      for (const cc of Object.keys(PAISES))
        for (const s of SEMILLAS) {
          const it = itinerarioDe(s, cc, n, PAISES[cc]!.terrain, '2', 'una-semana')
          expect(tourSkeletonDe(n, '2').id).toBe('vu_corta')
          expect(it.papeles.filter(esCrono).length).toBeLessThanOrEqual(1)
          expect(it.papeles.filter(esReina).length).toBeLessThanOrEqual(1)
          expect(it.papeles).not.toContain('prologo')
        }
  })
  it('V13 y V14: cero violaciones tras reparar, 120 semillas × n de 2 a 21 × cinco relieves', () => {
    let vueltas = 0
    for (const n of TODAS_LAS_N)
      for (const [cc, { terrain }] of Object.entries(PAISES))
        for (const s of SEMILLAS) {
          const clase = claseDe(n)
          const it = itinerarioDe(s, cc, n, terrain, clase, formatoDe(n))
          expect(it.papeles).toHaveLength(n) // n se conserva siempre (decisión 44)
          expect(it.km).toHaveLength(n)
          expect(
            V13(it.papeles, it.km, clase, tourSkeletonDe(n, clase).id),
            `${cc} ${n} ${s}`,
          ).toBeNull()
          expect(V14(it.papeles, n), `${cc} ${n} ${s}`).toBeNull()
          vueltas++
        }
    expect(vueltas).toBe(20 * 5 * 120)
  })
  it('V13 y V14 literales: uno que dispara y uno que no', () => {
    const semana: StageRole[] = ['prologo', 'llana', 'media', 'cri', 'media_alto', 'reina_alto']
    expect(V13(semana, [6, 160, 150, 20, 150, 140], 'WT', 'vu_semana')).toBeNull()
    expect(V13(semana, [20, 160, 150, 20, 150, 140], 'WT', 'vu_semana')?.id).toBe('V13') // un prólogo de 20 km
    expect(V13(semana, [6, 190, 150, 20, 150, 140], '2', 'vu_semana')?.detalle).toMatch(/180/) // techo de la .2
    expect(V13(['llana', 'cri', 'cri'], [150, 20, 20], '2', 'vu_corta')?.detalle).toMatch(/cronos/)
    const tres: StageRole[] = ['llana', 'llana', 'media_alto', 'media_alto', 'reina_alto', 'llana']
    expect(V13(tres, [150, 150, 150, 150, 140, 150], 'WT', 'vu_semana')?.detalle).toMatch(
      /seguidos/,
    )
    const gv: StageRole[] = Array.from({ length: 21 }, () => 'llana')
    gv[16] = 'reina_alto'
    expect(V14(gv, 21)).toBeNull()
    expect(V14(gv, 14)).toBeNull() // fuera de gran vuelta no dice nada
    const temprana = [...gv]
    temprana[4] = 'reina_valle'
    expect(V14(temprana, 21)?.detalle).toMatch(/fuera de las etapas 15 a 20/)
    const pegadas = [...gv]
    pegadas[18] = 'media_alto'
    expect(V14(pegadas, 21)?.detalle).toMatch(/solo 1 etapa/)
    const semanaDura = [...gv]
    semanaDura[2] = 'media_alto'
    semanaDura[6] = 'media_alto'
    expect(V14(semanaDura, 21)?.detalle).toMatch(/primer descanso/)
  })
  it('los esqueletos de composición: la frontera de 5 la decide la clase; de 9 a 14 vu_larga; desde 15 vu_gran_vuelta', () => {
    expect(tourSkeletonDe(4, 'WT').id).toBe('vu_corta')
    expect(tourSkeletonDe(5, '1').id).toBe('vu_corta')
    expect(tourSkeletonDe(5, 'Pro').id).toBe('vu_semana')
    expect(tourSkeletonDe(8, '2').id).toBe('vu_semana')
    expect(tourSkeletonDe(9, 'WT').id).toBe('vu_larga')
    expect(tourSkeletonDe(14, 'WT').id).toBe('vu_larga')
    expect(tourSkeletonDe(15, '2').id).toBe('vu_gran_vuelta')
    for (const sk of Object.values(TOUR_SKELETONS)) expect(sk.pesos).toBe(ARCH.pesosComposicion)
  })
  it('prólogo con p 0,25 en vueltas de una semana (0,3 en gran vuelta) y cronoescalada con p 0,08, sobre 1.000 vueltas ± 0,05', () => {
    const mil = Array.from({ length: 1000 }, (_, i) => `pro-${i}`)
    const prologos = (n: number, f: 'una-semana' | 'gran-vuelta'): number =>
      mil.filter((s) => itinerarioDe(s, 'ES', n, 'hilly', 'WT', f).papeles[0] === 'prologo')
        .length / mil.length
    expect(
      Math.abs(prologos(7, 'una-semana') - TOUR_SKELETONS.vu_semana.primera.prologo!),
    ).toBeLessThan(0.05)
    expect(
      Math.abs(prologos(21, 'gran-vuelta') - TOUR_SKELETONS.vu_gran_vuelta.primera.prologo!),
    ).toBeLessThan(0.05)
    expect(
      mil.every((s) => itinerarioDe(s, 'ES', 5, 'hilly', '2', 'una-semana').papeles[0] === 'llana'),
    ).toBe(true)
    // La cronoescalada: entre las vueltas con una crono de meta admisible para una reina.
    let elegibles = 0
    let subidas = 0
    for (const s of mil) {
      const it = itinerarioDe(s, 'ES', 7, 'mountain', 'WT', 'una-semana')
      const i = it.papeles.findIndex((r, k) => k >= 1 && (r === 'cri' || r === 'cronoescalada'))
      if (i < 0 || !admiteReina(it.metas[i]!, TERRITORIOS.ES!.cordillera)) continue
      elegibles++
      if (it.papeles[i] === 'cronoescalada') subidas++
    }
    expect(elegibles).toBeGreaterThan(200)
    expect(Math.abs(subidas / elegibles - ARCH.itinerario.cronoescaladaP)).toBeLessThan(0.05)
    // Sin cordillera no hay cronoescalada.
    for (const s of SEMILLAS)
      expect(itinerarioDe(s, 'BE', 7, 'mountain', 'WT', 'una-semana').papeles).not.toContain(
        'cronoescalada',
      )
  })
  it('km por clase: una .2 de 5 etapas nunca pasa de 180 y la última mide × lastStageKmFactor', () => {
    for (const s of SEMILLAS) {
      const it = itinerarioDe(s, 'ES', 5, 'mountain', '2', 'una-semana')
      it.km.forEach((k) => expect(k).toBeLessThanOrEqual(ARCH.km.maxPorClase['2']))
      const ultima = it.papeles.at(-1)!
      if (!esCrono(ultima)) {
        const col =
          ultima === 'llana' || ultima === 'llana_viento'
            ? 'llana'
            : ultima === 'montana_corta'
              ? 'corta'
              : ultima.startsWith('reina')
                ? 'reina'
                : 'media'
        const [min, rango] = ARCH.km.porClase['2'][col]
        expect(it.km.at(-1)!).toBeGreaterThanOrEqual(Math.floor(min * ROUTE.lastStageKmFactor))
        expect(it.km.at(-1)!).toBeLessThanOrEqual(
          Math.ceil((min + rango) * ROUTE.lastStageKmFactor),
        )
      }
    }
  })
  it('el itinerario es identidad: arranca en la zona curada y avanza por una ventana contigua de la ruta', () => {
    const vueltas = RACE_ROWS.filter((r) => (r.stages ?? 1) > 1 && !RACE_EDITIONS[r.id])
    expect(vueltas).toHaveLength(72)
    for (const row of vueltas) {
      const race = SEASON_CALENDAR.find((r) => r.id === row.id)!
      const it = itinerarioDe(
        row.id,
        race.country ?? null,
        row.stages!,
        row.terrain ?? 'flat',
        row.raceClass,
        'una-semana',
      )
      expect(it.metas[0], row.id).toBe(RACE_REGION[row.id]!.default) // decisión 14: sin sorteo de zona
      expect(it).toEqual(
        itinerarioDe(
          row.id,
          race.country ?? null,
          row.stages!,
          row.terrain ?? 'flat',
          row.raceClass,
          'una-semana',
        ),
      )
    }
    const it = itinerarioDe('race-x', 'ES', 6, 'hilly', '1', 'una-semana') // sin RACE_REGION: ancla en ruta[0]
    const ruta = TERRITORIOS.ES!.ruta.map((z) => z.zona)
    const L = ruta.length
    expect(it.metas[0]).toBe(ruta[0])
    it.metas.forEach((z, i) => {
      if (i > 0) {
        const k = ruta.indexOf(it.metas[i - 1]!)
        expect([ruta[k], ruta[(k + 1) % L], ruta[(k - 1 + L) % L]]).toContain(z)
      }
      expect(it.desde[i]).toBe(i === 0 ? z : it.metas[i - 1])
    })
    expect(it.notas.every((n) => typeof n === 'string')).toBe(true)
    // Un terreno de montaña pide la ventana con la cordillera; uno llano, la que la evita.
    // ES desde `cantabrico` con dos etapas: hacia delante `meseta`, hacia atrás `pirineos` (la cordillera).
    for (const s of SEMILLAS) {
      const m = itinerarioDe(s, 'ES', 2, 'mountain', 'WT', 'una-semana')
      const f = itinerarioDe(s, 'ES', 2, 'flat', 'WT', 'una-semana')
      expect(m.metas.every((z) => z === 'cantabrico' || z === 'pirineos')).toBe(true)
      expect(f.metas.every((z) => z === 'cantabrico' || z === 'meseta')).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------------------------------
// composeTour (§7.5): la vuelta dibujada. Las seis garantías de `calendar.test.ts` (l. 176-235)
// reescritas contra `composeTour` en BE, ES y CO con 120 semillas; la de la primera etapa, con la regla
// nueva (llana o prólogo, decisión 42).
// ---------------------------------------------------------------------------------------------------

const RELOJ = { timeout: 120_000 }
const TRES = ['BE', 'ES', 'CO'] as const
const memo = new Map<string, StageSpec[]>()
const reloj = { ms: 0, etapas: 0 }
/** `composeTour` memorizado entre los `it`: las seis garantías comparten vueltas. */
function vuelta(cc: string, n: number, terrain: RouteTerrain, seed: string): StageSpec[] {
  const clave = `${cc}|${n}|${terrain}|${seed}`
  const hecha = memo.get(clave)
  if (hecha) return hecha
  const ctx: RouteContext = { ...DEFAULT_ROUTE_CONTEXT, country: cc, format: formatoDe(n) }
  const t0 = performance.now()
  const v = composeTour(`${seed}-${cc}`, n, terrain, ctx)
  reloj.ms += performance.now() - t0
  reloj.etapas += v.length
  memo.set(clave, v)
  return v
}
const isItt = (s: StageSpec): boolean => s.timeTrial === true
/** Lo que reparte tiempos sin crono: un final en alto o, donde la zona no lo admite, un muro (§7.3). */
const decide = (s: StageSpec): boolean =>
  s.label === 'Uphill finish' || s.label === 'Summit finish' || s.label === 'Wall finish'
const isClimbing = (s: StageSpec): boolean => !isItt(s) && s.label !== 'Flat'
afterAll(() => {
  if (reloj.etapas === 0) return
  const todas = [...memo.values()].flat()
  const degradadas = todas.filter((s) => s.arch!.degradado).length
  const conReintento = todas.filter((s) => s.arch!.rechazos.length > 0).length
  console.info(
    `[tour] composeTour: ${memo.size} vueltas, ${reloj.etapas} etapas en ${(reloj.ms / 1000).toFixed(1)} s; ${degradadas} degradadas, ${conReintento} con reintento`,
  )
})

describe('grammar/tour: composeTour y las garantías de calendar.test.ts', () => {
  it('una vuelta de 5 etapas PUEDE llevar crono', RELOJ, () => {
    for (const cc of TRES)
      expect(SEMILLAS.filter((s) => vuelta(cc, 5, 'hilly', s).some(isItt)).length).toBeGreaterThan(
        0,
      )
  })
  it('una vuelta LLANA de 4+ etapas lleva SIEMPRE crono', RELOJ, () => {
    for (const cc of TRES)
      for (const n of [4, 5, 6, 7, 21])
        for (const s of SEMILLAS)
          expect(vuelta(cc, n, 'flat', s).some(isItt), `${cc} ${n} ${s}`).toBe(true)
  })
  it('cinco etapas llanas NO son cinco finales al sprint', RELOJ, () => {
    for (const cc of TRES)
      for (const s of SEMILLAS) {
        const mix = vuelta(cc, 5, 'flat', s)
        expect(mix.filter(isClimbing).length, `${cc} ${s}`).toBeGreaterThanOrEqual(2)
        expect(mix.some(decide), `${cc} ${s}`).toBe(true)
      }
  })
  it('ninguna vuelta generada se queda sin crono NI final que reparta tiempos', RELOJ, () => {
    for (const cc of TRES)
      for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 21])
        for (const terrain of ['flat', 'hilly', 'mountain'] as const)
          for (const s of SEMILLAS)
            expect(
              vuelta(cc, n, terrain, s).some((x) => isItt(x) || decide(x)),
              `${cc} ${n} ${terrain} ${s}`,
            ).toBe(true)
  })
  it(
    'la primera etapa es llana o prólogo de ≤ 8 km, nunca un final en alto ni una crono en línea',
    RELOJ,
    () => {
      for (const cc of TRES)
        for (const n of [3, 5, 7, 21])
          for (const terrain of ['flat', 'hilly', 'mountain'] as const)
            for (const s of SEMILLAS) {
              const first = vuelta(cc, n, terrain, s)[0]!
              if (first.timeTrial) {
                expect(first.label).toBe('Prologue')
                expect(first.arch!.skeleton).toBe('et_prologo')
              } else expect(first.label, `${cc} ${n} ${terrain} ${s}`).toBe('Flat')
            }
    },
  )
  it('la última etapa PUEDE ser decisiva, y también el paseo al sprint', RELOJ, () => {
    for (const cc of TRES) {
      const flatLast = SEMILLAS.map((s) => vuelta(cc, 5, 'flat', s).at(-1)!)
      expect(flatLast.filter((s) => s.label === 'Flat').length).toBeGreaterThan(0)
      expect(flatLast.filter(decide).length).toBeGreaterThan(0)
    }
    for (const cc of ['ES', 'CO'] as const) {
      const mtnLast = SEMILLAS.map((s) => vuelta(cc, 5, 'mountain', s).at(-1)!)
      expect(mtnLast.filter(decide).length).toBeGreaterThan(SEMILLAS.length / 2)
    }
  })
  it('es determinista, el origen es generado y la ficha dice la zona de la meta del itinerario', () => {
    const a = composeTour('race-x', 7, 'hilly', { ...DEFAULT_ROUTE_CONTEXT, country: 'ES' })
    expect(composeTour('race-x', 7, 'hilly', { ...DEFAULT_ROUTE_CONTEXT, country: 'ES' })).toEqual(
      a,
    )
    const c = composeTour('race-y', 7, 'hilly', { ...DEFAULT_ROUTE_CONTEXT, country: 'ES' })
    expect(a.map((s) => s.label)).not.toEqual(c.map((s) => s.label))
    const it = itinerarioDe('race-x', 'ES', 7, 'hilly', '2', 'una-semana')
    a.forEach((s, i) => {
      expect(s.routeSource).toBe('generado')
      expect(s.arch!.geo).toBe(it.metas[i])
    })
    // El contexto por defecto es FALLBACK: `generico`, y la vuelta sigue cerrando.
    const d = composeTour('mix-x', 5, 'mountain', DEFAULT_ROUTE_CONTEXT)
    expect(d.every((s) => s.arch!.geo === 'generico')).toBe(true)
    // `edicion` viaja a cada StageRequest: con activa false, la temporada 3 es la 0.
    const apagada = { ...ARCH.edicion, activa: false }
    const t0 = composeTour('race-x', 5, 'hilly', {
      ...DEFAULT_ROUTE_CONTEXT,
      country: 'ES',
      edicion: apagada,
    })
    const t3 = composeTour('race-x', 5, 'hilly', {
      ...DEFAULT_ROUTE_CONTEXT,
      country: 'ES',
      season: 3,
      edicion: apagada,
    })
    expect(t3).toEqual(t0)
  })
  it(
    'las 72 vueltas generadas del calendario: compuestas con su país y su clase, V13 y V14 en verde, sin geo genérica donde el país tiene territorio',
    RELOJ,
    () => {
      const vueltas = RACE_ROWS.filter((r) => (r.stages ?? 1) > 1 && !RACE_EDITIONS[r.id])
      const t0 = performance.now()
      const lineas: string[] = []
      let etapas = 0
      let degradadas = 0
      for (const row of vueltas) {
        const race = SEASON_CALENDAR.find((r) => r.id === row.id)!
        const country = race.country ?? null
        const n = row.stages!
        const terrain = row.terrain ?? 'flat'
        const specs = composeTour(row.id, n, terrain, {
          raceId: row.id,
          country,
          raceClass: row.raceClass,
          format: 'una-semana',
          season: 0,
        })
        const it = itinerarioDe(row.id, country, n, terrain, row.raceClass, 'una-semana')
        expect(specs).toHaveLength(n)
        expect(
          V13(it.papeles, it.km, row.raceClass, tourSkeletonDe(n, row.raceClass).id),
          row.id,
        ).toBeNull()
        expect(V14(it.papeles, n), row.id).toBeNull()
        for (const s of specs) {
          expect(s.routeSource).toBe('generado')
          if (!territorioDe(country).fallback) expect(s.arch!.geo, row.id).not.toBe('generico')
          if (s.arch!.degradado) degradadas++
        }
        expect(
          specs.some((s) => isItt(s) || decide(s)),
          row.id,
        ).toBe(true)
        etapas += n
        lineas.push(
          `  ${row.id} (${country ?? '?'}, ${row.raceClass}, ${n}): ${it.papeles.join(' ')}${it.notas.length ? ` | ${it.notas.join('; ')}` : ''}`,
        )
      }
      const ms = performance.now() - t0
      expect(degradadas).toBe(0) // fallbackMaxShare.calendario
      console.info(
        `[tour] las 72 vueltas del calendario: ${etapas} etapas en ${(ms / 1000).toFixed(2)} s, 0 degradadas; papeles y notas:\n${lineas.join('\n')}`,
      )
    },
  )
})

// Tras las garantías dibujadas: las vueltas compuestas caen a la plantilla canónica como mucho en la
// cuota del barrido por esqueleto (`fallbackMaxShare.testPorEsqueleto`); en el calendario, 0 (arriba).
it('las vueltas compuestas por las garantías no pasan de la cuota de degradadas', () => {
  const todas = [...memo.values()].flat()
  expect(todas.length).toBeGreaterThan(0)
  expect(todas.filter((s) => s.arch!.degradado).length / todas.length).toBeLessThanOrEqual(
    ARCH.veto.fallbackMaxShare.testPorEsqueleto,
  )
})

// La zona de cada relieve de PAISES es la que dice su nombre (el test de arriba depende de ello).
it('PAISES cubre los cinco relieves', () => {
  for (const [cc, { relieve }] of Object.entries(PAISES))
    expect(
      territorioDe(cc).ruta.some((z) => ZONAS[z.zona].relieve === relieve),
      cc,
    ).toBe(true)
})
