import { COUNTRIES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import {
  FALLBACK,
  TERRITORIOS,
  ZONAS,
  admite,
  conFirmeDeZona,
  degradar,
  degradarMotivo,
  firmeDe,
  territorioDe,
  zonaDe,
} from './geo.js'
import type { Motif } from './motifs.js'
import type { Requiere } from './skeletons.js'

/**
 * LA GEOGRAFÍA NO SE CONTRADICE (docs/generador.md §6.8, paso 2 del plan, §15.4).
 *
 * Los tests son de consistencia interna porque la tabla es juicio (decisión 16): no prueban que la
 * geografía sea verdad, sino que cabe en `ARCH`, que no se contradice y que ningún veto V1 a V4 puede
 * dispararse por culpa de la tabla. La forma es la de §6.8, con tres cambios que obliga el árbol:
 *  - `Rango` es `readonly` porque los rangos de `ARCH` lo son (`as const`);
 *  - con `noUncheckedIndexedAccess`, `TERRITORIOS.XX` se lee con `?.` (es `Record<string, …>`);
 *  - lo que lee `SKELETONS`, `candidatos`, `skeletonFor`, `ESCALON_ROLE` (paso 4), `validateMotif` y
 *    `ARCH.meta` (paso 3) se escribe `it.todo` hasta que esos pasos lo enciendan (regla 1 de §15.1).
 *    Mientras, `admite` se prueba con los `Requiere` literales de la columna `requiere` de §5.2 y
 *    §5.3 (solo los de los ejemplos de (g)), y `firmeDe`/`conFirmeDeZona` con plantillas literales.
 */

type Rango = readonly [number, number]
const dentro = (r: Rango, de: Rango) => r[0] <= r[1] && r[0] >= de[0] && r[1] <= de[1]
const PAISES_CON_EQUIPOS = [
  'FR',
  'BE',
  'IT',
  'ES',
  'NL',
  'TR',
  'PT',
  'PL',
  'DE',
  'CN',
  'SI',
  'GR',
  'AU',
  'DK',
  'NO',
  'CZ',
  'HR',
  'JP',
  'CH',
  'CA',
  'US',
  'AT',
  'RO',
  'AE',
  'OM',
  'GB',
  'LU',
  'RS',
  'LT',
  'VE',
  'CO',
  'SA',
  'HU',
  'MY',
  'CY',
  'BA',
  'AZ',
  'AL',
  'EE',
  'AD',
  'BG',
  'XK',
  'SK',
  'IN',
  'TW',
  'TH',
  'KR',
  'RW',
  'DZ',
  'BJ',
  'MU',
  'CM',
  'MA',
  'BF',
  'GT',
  'EC',
] // mapa 02 §10
/** Los 30 países sin reina (decisión 13 y D8, lista completa de §6.3 y §18.9): 12 filas de TERRITORIOS. */
const SIN_CORDILLERA = [
  'BE',
  'NL',
  'LU',
  'DE',
  'HU',
  'DK',
  'EE',
  'LT',
  'SE',
  'FI',
  'LV',
  'NO',
  'GB',
  'IE',
  'AR',
  'CL',
  'AU',
  'NZ',
  'KR',
  'TH',
  'IN',
  'AE',
  'SA',
  'OM',
  'QA',
  'BJ',
  'BF',
  'CM',
  'MU',
  'DZ',
]

/**
 * `requiere` de los esqueletos que cita (g), copiado de la columna de §5.2 y §5.3 SOLO para probar
 * `admite` antes de que exista `SKELETONS` (paso 4); el paso 4 borra esta tabla y (g) pasa a leer
 * `SKELETONS.id.requiere`, que es la única lista del documento.
 */
const REQ: Record<string, Requiere | Requiere[]> = {
  et_reina_alto_largo: { puerto: true, relieve: 'montana', finalesAlto: 'largo' },
  ud_montana: { puerto: true, cota: true, relieve: 'montana' },
  ud_sterrato: { sterrato: true, muro: true, cota: true },
  et_media_valle: { cota: true, cotaKmMin: 3.3 },
  et_reina_encadenada: { puerto: true, relieve: 'alta' },
  ud_esprint_capi: { cota: true, cotaKmMin: 3.3 },
  ud_adoquin_ligero: [{ adoquin: 2 }, { sterrato: true }],
  ud_adoquin: { adoquin: 2 },
  et_llana_viento: { viento: 2 },
  et_reina_blanda: { puerto: true, cota: true, finalesAlto: 'largo' },
  et_media_alto: { cota: true, cotaKmMin: 3.3, finalesAlto: 'corto' },
  ud_muros_adoquin: { adoquin: 2, muro: { adoquin: true } },
  ud_circuito: [{ muro: true }, { cota: true, cotaCortaMax: 2.9 }],
  et_media_tendida: [
    { cota: true, cotaKmMin: 3.3, altitud: 'altiplano' },
    { cota: true, cotaKmMin: 3.3, altitud: 'media' },
    { cota: true, cotaKmMin: 3.3, relieve: 'ondulado' },
  ],
}
const req = (id: string): Requiere | Requiere[] => {
  const r = REQ[id]
  if (r === undefined) throw new Error(`sin requiere literal para ${id}`)
  return r
}
/** Todos los motivos de una plantilla, hijos de compuestos y de sector_meta incluidos. */
const planos = (ms: readonly Motif[]): Motif[] => ms.flatMap((m) => [m, ...planos(m.hijos ?? [])])

describe('grammar/geo: ZONAS cabe en ARCH y no se contradice', () => {
  it('(a) tiene 31 filas y cada rango está dentro del rango del motivo', () => {
    expect(Object.keys(ZONAS)).toHaveLength(31)
    for (const [nombre, z] of Object.entries(ZONAS)) {
      expect(z.zona, nombre).toBe(nombre)
      if (z.puerto) {
        expect(dentro(z.puerto.km, ARCH.motivo.puerto.km), `${nombre} puerto.km`).toBe(true)
        expect(dentro(z.puerto.g, ARCH.motivo.puerto.g), `${nombre} puerto.g`).toBe(true)
      }
      if (z.cota) {
        expect(dentro(z.cota.km, ARCH.motivo.cota.km), `${nombre} cota.km`).toBe(true)
        expect(dentro(z.cota.g, ARCH.motivo.cota.g), `${nombre} cota.g`).toBe(true)
      }
      if (z.muro) {
        expect(dentro(z.muro.km, ARCH.motivo.muro.km), `${nombre} muro.km`).toBe(true)
        expect(dentro(z.muro.g, ARCH.motivo.muro.g), `${nombre} muro.g`).toBe(true)
      }
      expect(z.amplitud).toBeLessThanOrEqual(ARCH.motivo.enlace.ampMax) // 2,4
    }
  })
  it('(b) los bordes con nombre: puerto ≥ 9, cota ≤ 8, muro ≤ 2,5', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.puerto) expect(z.puerto.km[0]).toBeGreaterThanOrEqual(9)
      if (z.cota) expect(z.cota.km[1]).toBeLessThanOrEqual(8)
      if (z.muro) expect(z.muro.km[1]).toBeLessThanOrEqual(ARCH.motivo.muro.km[1]) // 2,5 = STAGE.wallMaxKm (sección 12)
    }
  })
  it('(c) adoquín y sterrato son coherentes con el muro y con V2', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.muro?.adoquin) expect(z.adoquin).toBeGreaterThanOrEqual(2) // un muro adoquinado solo donde hay sectores (§6.2): V2 no puede dispararse
      if (z.adoquin === 0) expect(z.muro?.adoquin ?? false).toBe(false)
    }
  })
  it('(d) V4 no puede dispararse desde la tabla: puerto ≥ 15 km solo con altitud media/alta/altiplano; largo exige puerto', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.puerto && z.puerto.km[1] >= 15)
        expect(['media', 'alta', 'altiplano']).toContain(z.altitud)
      if (z.finalesAlto === 'largo') expect(z.puerto).not.toBeNull()
      if (z.finalesAlto === 'ninguno') expect(['llano', 'ondulado']).toContain(z.relieve)
      if (z.puerto && z.relieve !== 'montana' && z.relieve !== 'alta')
        expect(z.finalesAlto).toBe('largo') // puerto sin relieve de montaña: solo lo usan et_reina_blanda y ud_montana_alto (§6.2)
    }
  })
  it('(e) cordillera está en la ruta y es montana o alta con puerto', () => {
    for (const [cc, t] of Object.entries(TERRITORIOS)) {
      expect(t.ruta.length, cc).toBeGreaterThan(0)
      if (t.cordillera) {
        expect(t.ruta.map((r) => r.zona)).toContain(t.cordillera)
        expect(['montana', 'alta']).toContain(ZONAS[t.cordillera].relieve)
        expect(ZONAS[t.cordillera].puerto).not.toBeNull()
      }
      expect(t.fallback ?? false).toBe(false) // nada explícito lleva la marca
    }
    expect(Object.keys(TERRITORIOS)).toHaveLength(64)
    expect(TERRITORIOS.AR?.cordillera).toBeNull()
    expect(TERRITORIOS.BE?.cordillera).toBeNull()
    expect(TERRITORIOS.PL?.cordillera).toBe('centroeuropa')
    expect(TERRITORIOS.MY?.cordillera).toBe('montana_sur')
    // §15.4: `cordillera === null` exactamente en la lista de la decisión 13 cerrada por la sección 6.
    const sinCordillera = Object.entries(TERRITORIOS)
      .filter(([, t]) => t.cordillera === null)
      .map(([cc]) => cc)
    expect(sinCordillera.sort()).toEqual([...SIN_CORDILLERA].sort())
  })
  it('(f) los 56 países con equipos tienen territorio; el resto cae a FALLBACK y se cuenta', () => {
    expect(new Set(PAISES_CON_EQUIPOS).size).toBe(56)
    for (const cc of PAISES_CON_EQUIPOS) expect(territorioDe(cc).fallback ?? false, cc).toBe(false)
    const codigos = COUNTRIES.map((c) => c.code)
    for (const cc of Object.keys(TERRITORIOS)) expect(codigos, cc).toContain(cc) // ninguna fila huérfana
    const enFallback = codigos.filter((cc) => territorioDe(cc) === FALLBACK)
    console.info(`[geo] países en FALLBACK: ${enFallback.length} (${enFallback.join(' ')})`) // hoy 69, sin banda
    for (const c of COUNTRIES) expect(Object.keys(ZONAS)).toContain(zonaDe(c.code))
    expect(territorioDe(null)).toBe(FALLBACK)
    expect(territorioDe('ZW')).toBe(FALLBACK)
  })
  it('(g) ejemplos que fijan la semántica de zonaDe y admite (con los requiere literales de §5.2 y §5.3)', () => {
    expect(zonaDe('BE')).toBe('flandes')
    expect(zonaDe('CO')).toBe('andes')
    expect(zonaDe('ZW')).toBe('generico')
    expect(zonaDe('FR')).toBe('bretana') // empate a 3: la primera de la ruta (§6.3)
    expect(zonaDe('ES')).toBe('cantabrico')
    expect(zonaDe('AT')).toBe('alpes')
    expect(zonaDe(null)).toBe('generico')
    expect(admite(req('et_reina_alto_largo'), ZONAS.alpes)).toBe(true)
    expect(admite(req('et_reina_alto_largo'), ZONAS.flandes)).toBe(false) // puerto null
    expect(admite(req('et_reina_alto_largo'), ZONAS.levante)).toBe(false) // finalesAlto corto
    expect(admite(req('ud_montana'), ZONAS.levante)).toBe(true) // puerto y relieve montana (Sa Calobra)
    expect(admite(req('ud_montana'), ZONAS.ardenas)).toBe(false) // puerto null
    expect(admite(req('ud_sterrato'), ZONAS.flandes)).toBe(false)
    expect(admite(req('et_media_valle'), ZONAS.bretana)).toBe(false) // cotaKmMin 3,3 > 3,0
    expect(admite(req('et_reina_encadenada'), ZONAS.cantabrico)).toBe(false) // relieve montana < alta
    expect(admite(req('ud_esprint_capi'), ZONAS.italia_norte)).toBe(true)
    expect(admite(req('ud_adoquin_ligero'), ZONAS.italia_norte)).toBe(true) // por { sterrato: true }: sectores de tierra (Veneto Classic)
    expect(admite(req('ud_adoquin'), ZONAS.italia_norte)).toBe(false) // adoquin 1 < 2
    expect(admite(req('ud_adoquin_ligero'), ZONAS.ardenas)).toBe(false) // adoquin 1 y sin sterrato: el 1 es metadato
    expect(admite(req('et_llana_viento'), ZONAS.andes)).toBe(false) // viento 0 < 2
    expect(admite(req('et_reina_blanda'), ZONAS.cono_sur)).toBe(true)
    expect(admite(req('et_reina_blanda'), ZONAS.golfo)).toBe(false) // finalesAlto corto (D8)
    expect(admite(req('et_media_alto'), ZONAS.golfo)).toBe(true) // race-sharjah: final en alto
    // Los campos que los ejemplos de §6.8 no tocan, uno a uno (§6.5 punto 1).
    expect(admite(undefined, ZONAS.golfo)).toBe(true) // requiere ausente siempre cabe
    expect(admite({}, ZONAS.golfo)).toBe(true) // un campo ausente no exige nada
    expect(admite(req('ud_muros_adoquin'), ZONAS.flandes)).toBe(true)
    expect(admite(req('ud_muros_adoquin'), ZONAS.francia_norte)).toBe(true)
    expect(admite({ muro: { adoquin: true } }, ZONAS.ardenas)).toBe(false) // muro sin adoquín
    expect(admite(req('ud_circuito'), ZONAS.golfo)).toBe(true) // sin muro, por la cota corta (2,5 ≤ 2,9)
    expect(admite(req('ud_circuito'), ZONAS.alpes)).toBe(false) // sin muro y cota desde 4 km
    expect(admite(req('et_media_tendida'), ZONAS.andes)).toBe(true) // altitud altiplano
    expect(admite(req('et_media_tendida'), ZONAS.macizo_central)).toBe(true) // altitud media
    expect(admite(req('et_media_tendida'), ZONAS.australia)).toBe(true) // relieve ondulado ≥ ondulado
    expect(admite(req('et_media_tendida'), ZONAS.bretana)).toBe(false) // cotaKmMin en las tres alternativas
    expect(admite({ relieve: 'media' }, ZONAS.ardenas)).toBe(true) // mínimo, no igualdad
    expect(admite({ relieve: 'media' }, ZONAS.flandes)).toBe(false)
    expect(admite({ finalesAlto: 'corto' }, ZONAS.alpes)).toBe(true) // largo cumple corto
    expect(admite({ finalesAlto: 'corto' }, ZONAS.flandes)).toBe(false)
    expect(admite({ adoquin: 3 }, ZONAS.francia_norte)).toBe(false)
    expect(admite({ altitud: 'media' }, ZONAS.alpes)).toBe(false) // igualdad
  })
  it.todo(
    '(g) los mismos ejemplos leídos de SKELETONS.id.requiere, y la meta de et_reina_blanda dentro del puerto de cono_sur y de andes (paso 4)',
  )
  it('degradar baja un escalón y nunca sube; degradarMotivo cae por la cadena de §8.5', () => {
    expect(degradar('alta')).toBe('montana')
    expect(degradar('montana')).toBe('media')
    expect(degradar('media')).toBe('ondulado')
    expect(degradar('ondulado')).toBe('llano')
    expect(degradar('llano')).toBe('llano')
    expect(degradarMotivo('puerto', ZONAS.alpes)).toBe('puerto')
    expect(degradarMotivo('puerto', ZONAS.ardenas)).toBe('cota')
    expect(degradarMotivo('puerto', ZONAS.flandes)).toBe('muro')
    expect(degradarMotivo('cota', ZONAS.flandes)).toBe('muro')
    expect(degradarMotivo('muro', ZONAS.alpes)).toBe('cota') // los muros de ud_circuito son cotas donde muro es null
    expect(degradarMotivo('muro', ZONAS.golfo)).toBe('cota')
    expect(degradarMotivo('sector', ZONAS.ardenas)).toBe('enlace') // ni adoquín ≥ 2 ni sterrato
    expect(degradarMotivo('racimo', ZONAS.italia_centro)).toBe('racimo') // tierra
    expect(degradarMotivo('circuito', ZONAS.golfo)).toBe('circuito') // degrada a sus hijos
    expect(degradarMotivo('tendida', ZONAS.flandes)).toBe('tendida')
    for (const z of Object.values(ZONAS))
      for (const k of ['puerto', 'cota', 'muro'] as const) {
        const d = degradarMotivo(k, z)
        expect(d === 'enlace' || z[d as 'puerto' | 'cota' | 'muro'] !== null).toBe(true) // nunca a un motivo que no existe
      }
  })
  it.todo(
    '(h) todo esqueleto admitido se puede dibujar en la zona y todo papel tiene salida (paso 4: SKELETONS, candidatos, skeletonFor, ESCALON_ROLE; ARCH.meta del paso 3)',
  )
  it('(i) firmeDe y conFirmeDeZona sobre plantillas literales', () => {
    expect(firmeDe(ZONAS.francia_norte)).toBe('adoquin')
    expect(firmeDe(ZONAS.flandes)).toBe('adoquin')
    expect(firmeDe(ZONAS.italia_norte)).toBe('tierra')
    expect(firmeDe(ZONAS.britanicas)).toBe('tierra') // Veneto Classic, Rutland-Melton
    expect(firmeDe(ZONAS.ardenas)).toBeNull() // adoquin 1 y sin sterrato: el 1 es metadato
    // Una plantilla con sectores a tres profundidades: suelto (firme por defecto, adoquín), dentro de
    // un racimo y dentro de un circuito; y uno de tierra explícito.
    const plantilla: Motif[] = [
      { kind: 'enlace', km: 40 },
      { kind: 'sector', km: 1.5, estrellas: 3 },
      {
        kind: 'racimo',
        km: 12,
        hijos: [
          { kind: 'sector', km: 2, estrellas: 4, firme: 'adoquin' },
          { kind: 'sector', km: 1, estrellas: 2, firme: 'tierra' },
        ],
        separaciones: [9],
      },
      {
        kind: 'circuito',
        km: 10,
        vueltas: 3,
        hijos: [{ kind: 'sector', km: 0.8, estrellas: 2, adoquin: true }],
        separaciones: [4],
      },
      { kind: 'meta', km: 0, meta: 'esprint' },
    ]
    const copia = structuredClone(plantilla)
    const sectores = (z: keyof typeof ZONAS) =>
      planos(conFirmeDeZona(plantilla, ZONAS[z]))
        .filter((m) => m.kind === 'sector')
        .map((m) => m.firme ?? 'adoquin')
    expect(sectores('italia_norte')).toEqual(['tierra', 'tierra', 'tierra', 'tierra']) // Veneto Classic
    expect(sectores('flandes')).toEqual(['adoquin', 'adoquin', 'adoquin', 'adoquin'])
    expect(sectores('ardenas')).toEqual(['adoquin', 'adoquin', 'tierra', 'adoquin']) // sin firme posible: se deja (V2/V3)
    const veneto = planos(conFirmeDeZona(plantilla, ZONAS.italia_norte))
    expect(veneto.filter((m) => m.kind === 'sector' && m.adoquin === true)).toHaveLength(0) // el campo adoquin acompaña al firme
    expect(plantilla).toEqual(copia) // pura: no toca la entrada
    expect(conFirmeDeZona(plantilla, ZONAS.italia_norte)[2]?.hijos).not.toBe(plantilla[2]?.hijos)
  })
  it.todo(
    '(i) ningún sector de una plantilla canónica ni de sus alternativas cae en V2 o V3 en una zona que admite su esqueleto (paso 4: SKELETONS; validateMotif del paso 3)',
  )
})
