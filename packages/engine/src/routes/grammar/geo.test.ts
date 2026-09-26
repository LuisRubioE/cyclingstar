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
  type GeoSignature,
} from './geo.js'
import { validateMotif, type Motif } from './motifs.js'
import {
  ESCALON_ROLE,
  SKELETONS,
  candidatos,
  skeletonFor,
  type Skeleton,
  type Slot,
} from './skeletons.js'
import type { StageRole } from './tour.js'

/**
 * LA GEOGRAFÍA NO SE CONTRADICE (docs/generador.md §6.8, paso 2 del plan, §15.4).
 *
 * Los tests son de consistencia interna porque la tabla es juicio (decisión 16): no prueban que la
 * geografía sea verdad, sino que cabe en `ARCH`, que no se contradice y que ningún veto V1 a V4 puede
 * dispararse por culpa de la tabla. La forma es la de §6.8, con tres cambios que obliga el árbol:
 *  - `Rango` es `readonly` porque los rangos de `ARCH` lo son (`as const`);
 *  - con `noUncheckedIndexedAccess`, `TERRITORIOS.XX` se lee con `?.` (es `Record<string, …>`);
 *  - (g), (h) e (i) leen `SKELETONS`, `candidatos`, `skeletonFor` y `ESCALON_ROLE` desde el paso 4,
 *    que borró la tabla provisional de `Requiere` literales con que el paso 2 probaba `admite`: la
 *    columna `requiere` de §5.2 y §5.3 vive solo en `SKELETONS`.
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

/** Todos los motivos de una plantilla, hijos de compuestos y de sector_meta incluidos. */
const planos = (ms: readonly Motif[]): Motif[] => ms.flatMap((m) => [m, ...planos(m.hijos ?? [])])
const interseca = (a: Rango, b: Rango) => Math.max(a[0], b[0]) <= Math.min(a[1], b[1])
type MotivoZona = 'puerto' | 'cota' | 'muro'
const esMotivoZona = (m: string): m is MotivoZona => m === 'puerto' || m === 'cota' || m === 'muro'
const zonaDeMotivo = (z: GeoSignature, m: MotivoZona) => z[m] // { km, g, ... } o null
/** Rango propio de la meta (§6.5 punto 3): cotaFinal del esqueleto si la declara; si no, ARCH.meta con las claves de la sección 12. */
const rangoMeta = (s: Skeleton): Rango | undefined =>
  s.metaParams?.cotaFinal?.km ??
  (s.meta === 'alto_largo'
    ? ARCH.meta.altoLargo.km
    : s.meta === 'alto_corto'
      ? ARCH.meta.altoCorto.km
      : s.meta === 'muro_meta'
        ? ARCH.meta.muro.km
        : undefined)
/** Motivo de la zona contra el que se compara la meta (§6.5 punto 3); null = no se compara. */
const motivoDeMeta = (s: Skeleton, z: GeoSignature): MotivoZona | null => {
  if (s.meta === 'alto_largo') return 'puerto'
  if (s.meta === 'alto_corto') return z.cota ? 'cota' : 'puerto'
  if (s.meta === 'muro_meta') return 'muro'
  if (!s.id.startsWith('et_')) return null // un día: cotaFinal de ARCH.meta.unDiaUltimaCota (§5.1 regla 2)
  if (s.meta === 'cima_cerca' || s.meta === 'descenso_meta' || s.meta === 'valle') {
    const m = [...s.slots].reverse().find((sl) => sl.n[0] >= 1 && esMotivoZona(sl.motif))?.motif
    return m && esMotivoZona(m) ? m : null
  }
  return null
}
/** Huecos obligatorios a cualquier profundidad (un hijo cuenta si él y todos sus padres tienen n[0] ≥ 1); `hijo` marca los de dentro de un compuesto. */
const obligatorios = (ss: Slot[], hijo = false): { sl: Slot; hijo: boolean }[] =>
  ss
    .filter((sl) => sl.n[0] >= 1)
    .flatMap((sl) => [{ sl, hijo }, ...obligatorios(sl.hijos ?? [], true)])
const PAPELES = Object.keys(ESCALON_ROLE) as StageRole[] // los 12 de StageRole

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
  it('(g) ejemplos que fijan la semántica de zonaDe y admite, leídos de SKELETONS.id.requiere', () => {
    expect(zonaDe('BE')).toBe('flandes')
    expect(zonaDe('CO')).toBe('andes')
    expect(zonaDe('ZW')).toBe('generico')
    expect(zonaDe('FR')).toBe('bretana') // empate a 3: la primera de la ruta (§6.3)
    expect(zonaDe('ES')).toBe('cantabrico')
    expect(zonaDe('AT')).toBe('alpes')
    expect(zonaDe(null)).toBe('generico')
    expect(admite(SKELETONS.et_reina_alto_largo.requiere, ZONAS.alpes)).toBe(true)
    expect(admite(SKELETONS.et_reina_alto_largo.requiere, ZONAS.flandes)).toBe(false) // puerto null
    expect(admite(SKELETONS.et_reina_alto_largo.requiere, ZONAS.levante)).toBe(false) // finalesAlto corto
    expect(admite(SKELETONS.ud_montana.requiere, ZONAS.levante)).toBe(true) // puerto y relieve montana (Sa Calobra)
    expect(admite(SKELETONS.ud_montana.requiere, ZONAS.ardenas)).toBe(false) // puerto null
    expect(admite(SKELETONS.ud_sterrato.requiere, ZONAS.flandes)).toBe(false)
    expect(admite(SKELETONS.et_media_valle.requiere, ZONAS.bretana)).toBe(false) // cotaKmMin 3,3 > 3,0
    expect(admite(SKELETONS.et_reina_encadenada.requiere, ZONAS.cantabrico)).toBe(false) // relieve montana < alta
    expect(admite(SKELETONS.ud_esprint_capi.requiere, ZONAS.italia_norte)).toBe(true)
    expect(admite(SKELETONS.ud_adoquin_ligero.requiere, ZONAS.italia_norte)).toBe(true) // por { sterrato: true }: sectores de tierra (Veneto Classic)
    expect(admite(SKELETONS.ud_adoquin.requiere, ZONAS.italia_norte)).toBe(false) // adoquin 1 < 2
    expect(admite(SKELETONS.ud_adoquin_ligero.requiere, ZONAS.ardenas)).toBe(false) // adoquin 1 y sin sterrato: el 1 es metadato
    expect(admite(SKELETONS.et_llana_viento.requiere, ZONAS.andes)).toBe(false) // viento 0 < 2
    expect(admite(SKELETONS.et_reina_blanda.requiere, ZONAS.cono_sur)).toBe(true)
    expect(interseca(rangoMeta(SKELETONS.et_reina_blanda)!, ZONAS.cono_sur.puerto!.km)).toBe(true)
    expect(interseca(rangoMeta(SKELETONS.et_reina_blanda)!, ZONAS.andes.puerto!.km)).toBe(true) // suelo 11 (§6.2)
    expect(admite(SKELETONS.et_reina_blanda.requiere, ZONAS.golfo)).toBe(false) // finalesAlto corto (D8)
    expect(admite(SKELETONS.et_media_alto.requiere, ZONAS.golfo)).toBe(true) // race-sharjah: final en alto
    // Los campos que los ejemplos de §6.8 no tocan, uno a uno (§6.5 punto 1).
    expect(admite(undefined, ZONAS.golfo)).toBe(true) // requiere ausente siempre cabe
    expect(admite({}, ZONAS.golfo)).toBe(true) // un campo ausente no exige nada
    expect(admite(SKELETONS.ud_muros_adoquin.requiere, ZONAS.flandes)).toBe(true)
    expect(admite(SKELETONS.ud_muros_adoquin.requiere, ZONAS.francia_norte)).toBe(true)
    expect(admite({ muro: { adoquin: true } }, ZONAS.ardenas)).toBe(false) // muro sin adoquín
    expect(admite(SKELETONS.ud_circuito.requiere, ZONAS.golfo)).toBe(true) // sin muro, por la cota corta (2,5 ≤ 2,9)
    expect(admite(SKELETONS.ud_circuito.requiere, ZONAS.alpes)).toBe(false) // sin muro y cota desde 4 km
    expect(admite(SKELETONS.et_media_tendida.requiere, ZONAS.andes)).toBe(true) // altitud altiplano
    expect(admite(SKELETONS.et_media_tendida.requiere, ZONAS.macizo_central)).toBe(true) // altitud media
    expect(admite(SKELETONS.et_media_tendida.requiere, ZONAS.australia)).toBe(true) // relieve ondulado ≥ ondulado
    expect(admite(SKELETONS.et_media_tendida.requiere, ZONAS.bretana)).toBe(false) // cotaKmMin en las tres alternativas
    expect(admite({ relieve: 'media' }, ZONAS.ardenas)).toBe(true) // mínimo, no igualdad
    expect(admite({ relieve: 'media' }, ZONAS.flandes)).toBe(false)
    expect(admite({ finalesAlto: 'corto' }, ZONAS.alpes)).toBe(true) // largo cumple corto
    expect(admite({ finalesAlto: 'corto' }, ZONAS.flandes)).toBe(false)
    expect(admite({ adoquin: 3 }, ZONAS.francia_norte)).toBe(false)
    expect(admite({ altitud: 'media' }, ZONAS.alpes)).toBe(false) // igualdad
  })
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
  it('(h) todo esqueleto admitido se puede dibujar en la zona y todo papel tiene salida', () => {
    const todos = Object.values(SKELETONS)
    let gVacios = 0
    for (const [nombre, z] of Object.entries(ZONAS)) {
      const admitidos = todos.filter((s) => admite(s.requiere, z))
      const ids = admitidos.map((s) => s.id)
      expect(ids).toContain('ud_esprint')
      expect(ids).toContain('et_llana')
      expect(ids).toContain('et_crono')
      expect(ids.some((id) => id.startsWith('et_media_'))).toBe(true) // hilly de edición nunca degrada a llana (§5.8)
      for (const id of Object.keys(z.pesos))
        expect(ids, `${nombre}: peso sobre ${id}`).toContain(id) // ningún peso sobre un esqueleto no admitido (§6.2)
      for (const s of admitidos) {
        const sk = skeletonFor(s.id, z) // nc_ruta clásica deja su cota en n = [0, 0] (§5.7 regla 2)
        for (const { sl, hijo } of obligatorios(sk.slots)) {
          // huecos obligatorios, hijos de compuestos incluidos
          if (!esMotivoZona(sl.motif)) continue
          const m = hijo ? degradarMotivo(sl.motif, z) : sl.motif // un hijo degrada (§8.5: los muros de ud_circuito son cotas donde muro es null)
          expect(esMotivoZona(m), `${nombre} × ${s.id}: hijo ${sl.motif} sin motivo`).toBe(true)
          if (!esMotivoZona(m)) continue
          const zm = zonaDeMotivo(z, m)
          expect(zm, `${nombre} × ${s.id}: hueco ${m} sin motivo`).not.toBeNull()
          if (zm && sl.params?.kmRango)
            expect(
              interseca(zm.km, sl.params.kmRango),
              `${nombre} × ${s.id}: km vacío en ${m}`,
            ).toBe(true)
          if (zm && sl.params?.gRango && !interseca(zm.g, sl.params.gRango)) gVacios++ // manda el g del esqueleto (§6.5 punto 3): se cuenta, no falla
        }
        const m = motivoDeMeta(s, z),
          r = rangoMeta(s)
        if (m && r) {
          const zm = zonaDeMotivo(z, m)
          expect(zm, `${nombre} × ${s.id}: meta sin ${m}`).not.toBeNull()
          if (zm) expect(interseca(zm.km, r), `${nombre} × ${s.id}: meta vacía`).toBe(true)
        }
        if (
          obligatorios(sk.slots).some(({ sl }) => sl.motif === 'sector' || sl.motif === 'racimo') ||
          s.meta === 'sector_meta'
        )
          expect(firmeDe(z), `${nombre} × ${s.id}: sector sin firme posible`).not.toBeNull() // V2 y V3 (§6.5 punto 5)
      }
      const salidas: string[] = []
      for (const role of PAPELES) {
        const out = candidatos({
          role,
          terrain: 'hilly',
          geo: z,
          raceClass: 'WT',
          format: 'una-semana',
          km: 160,
          routeSource: 'generado',
        })
        expect(out.length).toBeGreaterThan(0) // con la degradación de ESCALON_ROLE (§5.7)
        if (role === 'llana' || role === 'cri' || role === 'prologo')
          expect(out.map((c) => c.id)).toEqual([
            role === 'llana' ? 'et_llana' : role === 'cri' ? 'et_crono' : 'et_prologo',
          ]) // no degradan
        salidas.push(`${role} → ${out.map((c) => c.id).join(' ')}`)
      }
      console.info(`[geo] ${nombre}: ${salidas.join('; ')}`) // la galería y la sección 18 leen las degradaciones de aquí
    }
    console.info(
      `[geo] pares (zona, hueco) con g vacío, resueltos con el g del esqueleto: ${gVacios}`,
    ) // sin banda
  })
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
  it('(i) ningún sector de una plantilla canónica ni de sus alternativas cae en V2 o V3 en una zona que admite su esqueleto', () => {
    for (const z of Object.values(ZONAS)) {
      for (const s of Object.values(SKELETONS).filter((sk) => admite(sk.requiere, z))) {
        for (const plantilla of [s.canonico, ...(s.alternativas ?? []).map((a) => a.canonico)]) {
          for (const m of planos(conFirmeDeZona(plantilla, z)).filter((x) => x.kind === 'sector'))
            expect(validateMotif(m, z), `${z.zona} × ${s.id}: sector ${m.firme}`).toBeNull() // regla 4 de §4.5 = V2 y V3
        }
      }
    }
    const veneto = planos(
      conFirmeDeZona(SKELETONS.ud_adoquin_ligero.canonico, ZONAS.italia_norte),
    ).filter((x) => x.kind === 'sector')
    expect(veneto.length).toBeGreaterThan(0)
    expect(veneto.every((m) => m.firme === 'tierra')).toBe(true)
  })
})
