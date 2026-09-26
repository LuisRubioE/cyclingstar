// El motor es puro y no toca disco (eslint.config.js); este test sí, porque dos de sus aserciones son
// DATO leído del fuente de calendar.ts como texto (el grep de `terrain: 'cobbles'` y `RACE_COUNTRY`,
// que no se exporta). Un test no lo importa nadie, así que no rompe la pureza del motor.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { readFileSync } from 'node:fs'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RACE_EDITIONS } from '../editions.js'
import { RACE_ROUTES } from '../raceRoutes.js'
import { TERRITORIOS, ZONAS, zonaDe } from './geo.js'
import { COBBLES_IDS, RACE_REGION, regionOf } from './regions.js'
// No importa SEASON_CALENDAR: cargar el calendario entero (578 ms, sección 14) no hace falta para probar una tabla por id.

/**
 * RACE_REGION CUBRE LAS 310 CARRERAS DE EQUIPOS (docs/generador.md §6.8, paso 2 del plan, §15.4).
 *
 * La forma es la de §6.8, con `?.` donde `noUncheckedIndexedAccess` lo pide, y dos añadidos: (d) lee
 * el DATO del grep sobre `calendar.ts` en vez de fiarse de la lista, y (g) es la regla de §3.5 y §7.1
 * paso 1 (el `default` de una vuelta compuesta está en la ruta de su país, o `itinerarioDe` lo
 * ignoraría y anclaría la ventana en la primera zona).
 */

const CALENDAR_TS = readFileSync(join(import.meta.dirname, '..', 'calendar.ts'), 'utf8')

/** `RACE_COUNTRY` de calendar.ts (privado): id → ISO alpha-2, leído del fuente. */
const RACE_COUNTRY: Record<string, string> = (() => {
  const cuerpo = /const RACE_COUNTRY[^{]*\{([\s\S]*?)\n\}/.exec(CALENDAR_TS)?.[1] ?? ''
  return Object.fromEntries(
    [...cuerpo.matchAll(/'([^']+)':\s*'([A-Z]{2})'/g)].map((m) => [m[1] ?? '', m[2] ?? '']),
  )
})()

/** Los ids de las filas con `terrain: 'cobbles'` en las tablas de calendar.ts (el grep del DATO, §6.1). */
const COBBLES_GREP: string[] = [
  ...CALENDAR_TS.matchAll(/\{\s*\n\s*id: '([^']+)',[^{}]*?terrain: 'cobbles'/g),
].map((m) => m[1] ?? '')

describe('grammar/regions: RACE_REGION cubre las 310 carreras de equipos y ninguna cae al país', () => {
  it('(a) las claves son exactamente las de RACE_ROUTES', () => {
    expect(Object.keys(RACE_ROUTES)).toHaveLength(310)
    expect(Object.keys(RACE_REGION).sort()).toEqual(Object.keys(RACE_ROUTES).sort()) // 310
  })
  it('(b) ninguna carrera de equipos pasa por zonaDe(country); solo los .NC', () => {
    for (const id of Object.keys(RACE_ROUTES))
      expect(regionOf(id, 1, null)).toBe(RACE_REGION[id]?.stages?.[1] ?? RACE_REGION[id]?.default)
    expect(Object.keys(RACE_REGION).some((id) => id.startsWith('nc-'))).toBe(false)
    expect(regionOf('nc-be-road', 1, 'BE')).toBe(zonaDe('BE'))
    for (const r of Object.values(RACE_REGION)) expect(Object.keys(ZONAS)).toContain(r.default)
  })
  it('(c) stages solo en las 60 ediciones, con índice 1-based dentro de n y zona distinta de default; skeleton solo en un día', () => {
    expect(Object.keys(RACE_EDITIONS)).toHaveLength(60)
    for (const [id, r] of Object.entries(RACE_REGION)) {
      if (r.skeleton) {
        expect(RACE_EDITIONS[id], id).toBeUndefined()
        expect(RACE_ROUTES[id], id).toHaveLength(1)
      }
      if (!r.stages) continue
      expect(RACE_EDITIONS[id], id).toBeDefined()
      for (const [i, zona] of Object.entries(r.stages)) {
        expect(Number(i)).toBeGreaterThanOrEqual(1)
        expect(Number(i)).toBeLessThanOrEqual(RACE_EDITIONS[id]?.stages.length ?? 0)
        expect(zona, `${id} e${i}`).not.toBe(r.default)
      }
    }
    expect(regionOf('race-france', 6, 'FR')).toBe('pirineos')
    expect(regionOf('race-france', 19, 'FR')).toBe('alpes')
    expect(regionOf('race-france', 7, 'FR')).toBe('francia_norte')
    expect(regionOf('race-italy', 1, 'IT')).toBe('balcanes')
    expect(regionOf('race-colombia', 1, 'CO')).toBe('generico')
    expect(regionOf('race-colombia', 5, 'CO')).toBe('andes')
  })
  it('(d) las filas cobbles caen en zonas con adoquín o tierra (DATO: grep "terrain: \'cobbles\'" sobre calendar.ts)', () => {
    expect(COBBLES_IDS).toHaveLength(20)
    expect([...COBBLES_IDS].sort()).toEqual([...COBBLES_GREP].sort()) // la lista es el grep, no un juicio
    const COBBLES = COBBLES_IDS.filter((id) => id !== 'race-leon')
    expect(COBBLES).toHaveLength(19)
    for (const id of COBBLES) {
      const z = ZONAS[regionOf(id, 1, null)]
      expect(z.adoquin >= 2 || z.sterrato, id).toBe(true) // algún candidato cobbles cabe (§5.2); race-rutland, race-tours y race-veneto-classic por tierra (sterrato)
    }
    // La vigésima, race-leon, es un conflicto de dato (§6.1): país ES y ciudades León con terrain cobbles. Manda el dato.
    expect(RACE_REGION['race-leon']).toEqual({ default: 'meseta', duda: true })
  })
  it('(e) los ejemplos obligados', () => {
    const esperado: Record<string, string> = {
      'race-liege': 'ardenas',
      'race-walloon-wall': 'ardenas',
      'race-huy': 'ardenas',
      'race-lombardy': 'italia_norte',
      'race-jura': 'macizo_central',
      'race-tramuntana': 'levante',
      'race-roubaix': 'francia_norte',
      'race-white-roads': 'italia_centro',
      'race-tours': 'bretana',
      'race-colombia': 'andes',
      'race-emirates': 'golfo',
      'race-down-under': 'australia',
      'race-langkawi': 'montana_sur',
      'race-mercantour': 'alpes',
      // El resto de la tabla de §6.4.
      'race-flanders': 'flandes',
      'race-amstel': 'flandes',
      'race-sanremo': 'italia_norte',
      'race-abruzzo': 'italia_sur',
      'race-alpes-maritimes': 'provenza',
      'race-bretagne': 'bretana',
      'race-basque-country': 'cantabrico',
      'race-asturias': 'cantabrico',
      'race-andalusia': 'andalucia',
      'race-castilla-leon': 'meseta',
      'race-quebec': 'norteamerica',
      'race-montreal': 'norteamerica',
      'race-leon': 'meseta',
    }
    for (const [id, zona] of Object.entries(esperado))
      expect(RACE_REGION[id]?.default, id).toBe(zona)
    expect(RACE_REGION['race-mercantour']?.skeleton).toBe('ud_montana_alto')
    expect(RACE_REGION['race-huy']?.skeleton).toBe('ud_muro_final')
    // La forma por etapa de race-france (§6.4), entera.
    expect(RACE_REGION['race-france']).toEqual({
      default: 'francia_norte',
      stages: {
        1: 'levante',
        2: 'levante',
        3: 'pirineos',
        4: 'pirineos',
        6: 'pirineos',
        9: 'macizo_central',
        10: 'macizo_central',
        13: 'macizo_central',
        14: 'macizo_central',
        15: 'alpes',
        16: 'alpes',
        17: 'alpes',
        18: 'alpes',
        19: 'alpes',
        20: 'alpes',
      },
    })
    expect(RACE_REGION['race-italy']?.default).toBe('italia_sur')
    expect([2, 3].map((i) => regionOf('race-italy', i, 'IT'))).toEqual(['balcanes', 'balcanes'])
  })
  it('(f) las dudas de curación se imprimen y no vetan', () => {
    const dudas = Object.entries(RACE_REGION)
      .filter(([, r]) => r.duda)
      .map(([id]) => id)
    console.info(`[regions] DUDA: ${dudas.length} carreras (${dudas.join(' ')})`) // objetivo sin banda: 0, salvo race-leon mientras el dato no cambie
    expect(dudas.length).toBeLessThanOrEqual(20) // condición de cierre del paso 2 (§6.4)
    for (const id of dudas) expect(RACE_EDITIONS[id], id).toBeUndefined() // ninguna en las 60 ediciones
  })
  it('(g) una vuelta compuesta ancla en su territorio: su default está en la ruta de su país (§3.5, §7.1 paso 1)', () => {
    expect(Object.keys(RACE_COUNTRY)).toHaveLength(310)
    expect(new Set(Object.values(RACE_COUNTRY)).size).toBe(56)
    for (const cc of new Set(Object.values(RACE_COUNTRY))) expect(TERRITORIOS[cc], cc).toBeDefined() // los 56 países con equipos tienen fila explícita
    const compuestas = Object.keys(RACE_ROUTES).filter(
      (id) => (RACE_ROUTES[id]?.length ?? 0) > 1 && RACE_EDITIONS[id] === undefined,
    )
    expect(compuestas.length).toBeGreaterThan(0)
    for (const id of compuestas) {
      const ruta = TERRITORIOS[RACE_COUNTRY[id] ?? '']?.ruta.map((r) => r.zona) ?? []
      expect(ruta, `${id} (${RACE_COUNTRY[id]})`).toContain(RACE_REGION[id]?.default)
    }
  })
})
