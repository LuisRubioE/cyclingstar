import { describe, expect, it } from 'vitest'
import { sampleProfile, stageLengthKm } from '../stage/sample.js'
import type { Segment, StageProfile } from '../stage/types.js'
import { buildFeatureProfile } from './featureProfile.js'

describe('routes: perfil a partir de rasgos reales (puertos y sprints reales)', () => {
  const features = {
    climbs: [
      { name: 'A', summitKm: 18, lengthKm: 2.3, avgGradient: 6.5, category: 'cat3' as const },
      { name: 'B', summitKm: 86.5, lengthKm: 2.6, avgGradient: 6.9 },
    ],
    sprints: [{ name: 'S', km: 48 }],
  }
  const profile = buildFeatureProfile(133, features, 'seed')

  it('la etapa mide exactamente la distancia real', () => {
    expect(stageLengthKm(profile)).toBeCloseTo(133, 1)
  })

  it('coloca una cima en el km real de cada puerto y un sprint en el de cada meta volante', () => {
    const cimas = profile.banners!.filter((b) => b.tipo === 'cima').map((b) => b.km)
    expect(cimas).toEqual([18, 87]) // 86.5 se redondea a 87
    const sprints = profile.banners!.filter((b) => b.tipo === 'meta_volante').map((b) => b.km)
    expect(sprints).toEqual([48])
  })

  it('respeta la categoría oficial si se da, y la deriva del relieve si no', () => {
    const byKm = new Map(profile.banners!.map((b) => [b.km, b.cat]))
    expect(byKm.get(18)).toBe('cat3') // oficial
    // B no trae categoría: se deriva de 2.6 km al 6.9% (score ~124 -> cat3).
    expect(byKm.get(87)).toBe('cat3')
  })

  it('cada puerto es un segmento de subida con su desnivel real (longitud x pendiente)', () => {
    const puertos = profile.segments.filter((s) => s.tipo === 'puerto')
    expect(puertos).toHaveLength(2)
    const first = puertos[0]!
    const rise = first.tramos!.reduce((acc, r) => acc + r.km * r.g, 0)
    expect(rise).toBeCloseTo(2.3 * 6.5, 0) // ~15 m·%: el desnivel coincide con el real
  })

  it('sin rasgos no falla: devuelve un perfil llano de la distancia pedida', () => {
    const flat = buildFeatureProfile(100, {}, 'seed')
    expect(stageLengthKm(flat)).toBeCloseTo(100, 1)
    expect(flat.banners).toEqual([])
  })
})

/** Altitud en `target` km integrando todos los tramos del perfil desde `startM`. */
function elevAt(profile: StageProfile, startM: number, target: number): number {
  let e = startM
  let c = 0
  for (const s of profile.segments) {
    const ramps = s.tramos ?? [{ km: s.km, g: 0 }]
    for (const r of ramps) {
      if (c + r.km >= target) return e + r.g * (target - c) * 10
      e += r.g * r.km * 10
      c += r.km
    }
  }
  return e
}

/** Pendiente media de un segmento, ponderada por km. */
function meanGradient(s: Segment): number {
  const ramps = s.tramos ?? []
  const km = ramps.reduce((acc, r) => acc + r.km, 0)
  return ramps.reduce((acc, r) => acc + r.km * r.g, 0) / km
}

describe('routes: trazado a partir de la ALTITUD REAL muestreada', () => {
  // Perfil real: sube de 100 m a 900 m (cima, km 20) y baja a 300 m en meta (km 40).
  const features = {
    climbs: [
      { name: 'Alto', summitKm: 20, lengthKm: 10, avgGradient: 8, category: 'cat1' as const },
    ],
    sprints: [{ name: 'Meta volante', km: 30 }],
    elevation: [
      { km: 0, elevM: 100 },
      { km: 10, elevM: 100 },
      { km: 20, elevM: 900 },
      { km: 40, elevM: 300 },
    ],
  }
  const profile = buildFeatureProfile(40, features, 'seed')

  it('mide exactamente la distancia real', () => {
    expect(stageLengthKm(profile)).toBeCloseTo(40, 1)
  })

  it('integra la pendiente entre muestras: el desnivel reproduce las altitudes reales', () => {
    // Reconstruye la altitud integrando los tramos y compárala con las muestras.
    // Integra TODOS los tramos de cada segmento (un puerto listado lleva tres, `climbRamps`).
    expect(elevAt(profile, 100, 20)).toBeCloseTo(900, -1) // cima ~900 m
    expect(elevAt(profile, 100, 40)).toBeCloseTo(300, -1) // meta ~300 m
  })

  it('el tramo de subida hasta la cima tiene la pendiente real (800 m en 10 km = 8%)', () => {
    // El segmento que corona en km 20 sube 800 m en 10 km.
    const climbSeg = profile.segments.find((s) => s.tipo === 'puerto')
    expect(climbSeg).toBeDefined()
    expect(climbSeg!.km).toBeCloseTo(10, 1)
    expect(meanGradient(climbSeg!)).toBeCloseTo(8, 1)
  })

  it('mantiene los banners: cima (categoría oficial) y meta volante en su km real', () => {
    const cima = profile.banners!.find((b) => b.tipo === 'cima')
    expect(cima).toMatchObject({ km: 20, cat: 'cat1' })
    const sprint = profile.banners!.find((b) => b.tipo === 'meta_volante')
    expect(sprint?.km).toBe(30)
  })

  it('el descenso tras la cima es terreno de bajada', () => {
    const descentSeg = profile.segments.find((s) => s.tipo === 'descenso')
    expect(descentSeg).toBeDefined()
    expect(descentSeg!.tramos![0]!.g).toBeLessThan(0)
  })
})

/**
 * LOS PUERTOS LISTADOS MANDAN SOBRE LAS MUESTRAS GRUESAS (v90). Es el caso del Aramón Valdelinares de
 * la Vuelta: dos muestras a 13,6 km dejaban el final en alto (8,3 km al 6,5 %) en un falso llano al
 * 2,9 % tipado llano.
 */
describe('routes: un puerto listado entre dos muestras gruesas no se aplana (v90)', () => {
  const elevation = [
    { km: 0, elevM: 250 },
    { km: 136.3, elevM: 1561 },
    { km: 150, elevM: 1961 },
  ]
  const climbs = [{ name: 'Valdelinares', summitKm: 150, lengthKm: 8.3, avgGradient: 6.5 }]
  const profile = buildFeatureProfile(150, { climbs, elevation }, 'seed')
  const blocks = sampleProfile(profile)

  it('el final en alto es un puerto con su longitud y su pendiente media listadas', () => {
    const last = profile.segments[profile.segments.length - 1]!
    expect(last.tipo).toBe('puerto')
    expect(last.km).toBeCloseTo(8.3, 2)
    expect(meanGradient(last)).toBeCloseTo(6.5, 1)
    // Los últimos 83 bloques son subida, y antes no lo eran.
    expect(blocks.slice(-83).every((b) => b.tipo === 'subida')).toBe(true)
  })

  it('la distancia y la altitud de meta no se mueven: el enlace absorbe la diferencia', () => {
    expect(stageLengthKm(profile)).toBeCloseTo(150, 1)
    // La pendiente de cada tramo se redondea a la décima: en el enlace de 141,7 km eso son hasta
    // 70 m de deriva, la misma que el trazado de muestras ya tenía.
    expect(Math.abs(elevAt(profile, 250, 150) - 1961)).toBeLessThan(80)
  })

  it('sin puertos listados el trazado es exactamente el de las muestras', () => {
    const solo = buildFeatureProfile(150, { elevation }, 'seed')
    expect(solo.segments.map((s) => [s.km, s.tipo, s.tramos?.[0]?.g])).toEqual([
      [136.3, 'llano', 1],
      [13.7, 'llano', 2.9],
    ])
  })

  it('un puerto listado al 3 % o menos es relleno de la fuente y se deja a las muestras', () => {
    const relleno = [{ name: 'Willunga', summitKm: 150, lengthKm: 26, avgGradient: 3 }]
    const p = buildFeatureProfile(150, { climbs: relleno, elevation }, 'seed')
    expect(p.segments).toEqual(buildFeatureProfile(150, { elevation }, 'seed').segments)
  })

  it('un pie por debajo de la muestra más baja de la etapa acorta el puerto, no lo hunde', () => {
    // 91 km al 3,5 % desde 710 m son 3.185 m de desnivel: el pie quedaría a 2.475 m bajo el mar.
    const lucena = [{ name: 'Lucena', summitKm: 140, lengthKm: 91, avgGradient: 3.5 }]
    const elev = [
      { km: 0, elevM: 415 },
      { km: 50, elevM: 230 },
      { km: 140, elevM: 710 },
    ]
    const p = buildFeatureProfile(140, { climbs: lucena, elevation: elev }, 'seed')
    const puerto = p.segments.find((s) => s.tipo === 'puerto')!
    expect(puerto.km).toBeCloseTo((710 - 230) / 35, 1)
    expect(meanGradient(puerto)).toBeCloseTo(3.5, 1)
  })

  it('una muestra desalineada con el pie de un puerto se retira en vez de dar un muro', () => {
    // La muestra del km 60,2 pone 884 m; el pie del puerto listado queda a 498 m en el km 61,5:
    // enlazarlos sería bajar 386 m en 1,3 km, un −29,7 %.
    const elev = [
      { km: 0, elevM: 226 },
      { km: 43.9, elevM: 1192 },
      { km: 60.2, elevM: 884 },
      { km: 68.3, elevM: 496 },
      { km: 71.3, elevM: 959 },
      { km: 80, elevM: 600 },
    ]
    const page = [{ name: 'Col du Page', summitKm: 71.3, lengthKm: 9.8, avgGradient: 4.7 }]
    const p = buildFeatureProfile(80, { climbs: page, elevation: elev }, 'seed')
    const maxG = Math.max(...p.segments.flatMap((s) => (s.tramos ?? []).map((r) => Math.abs(r.g))))
    expect(maxG).toBeLessThanOrEqual(12)
    expect(Math.abs(elevAt(p, 226, 71.3) - 959)).toBeLessThan(20) // redondeo a la décima
  })
})

describe('routes: sectores de PAVÉ reales -> segmentos paves con sus estrellas', () => {
  const cobbles = [
    { name: 'Troisvilles', startKm: 20, lengthKm: 2.2, stars: 3 },
    { name: 'Arenberg', startKm: 60.5, lengthKm: 2.3, stars: 5 },
  ]
  const profile = buildFeatureProfile(100, { cobbles }, 'seed')

  it('no cambia la distancia de la etapa', () => {
    expect(stageLengthKm(profile)).toBeCloseTo(100, 1)
  })

  it('cada sector es pavé con su dureza y su longitud reales', () => {
    const paves = profile.segments.filter((s) => s.tipo === 'paves')
    // Un sector puede caer a caballo de dos segmentos del relieve: lo que importa es su km y dureza.
    expect([...new Set(paves.map((s) => s.estrellas))].sort()).toEqual([3, 5])
    const km = (stars: number): number =>
      paves.filter((s) => s.estrellas === stars).reduce((acc, s) => acc + s.km, 0)
    expect(km(3)).toBeCloseTo(2.2, 1)
    expect(km(5)).toBeCloseTo(2.3, 1)
  })

  it('el pavé cae en su kilómetro real al muestrear a bloques de 100 m', () => {
    const blocks = sampleProfile(profile)
    const kmDe = (i: number): number => (i + 0.5) / 10
    const enPave = blocks.map((b, i) => ({ km: kmDe(i), b })).filter((x) => x.b.tipo === 'paves')
    expect(enPave[0]!.km).toBeCloseTo(20, 0)
    expect(enPave[0]!.b.estrellas).toBe(3)
    const cinco = enPave.filter((x) => x.b.estrellas === 5)
    expect(cinco[0]!.km).toBeCloseTo(60.5, 0)
    expect(cinco).toHaveLength(23) // 2,3 km = 23 bloques de 100 m
    // Fuera del pavé no se cobra dureza alguna.
    expect(blocks.filter((b) => b.tipo !== 'paves').every((b) => b.estrellas === 0)).toBe(true)
  })

  it('el adoquín marca el firme pero NO toca el relieve (mismo desnivel con y sin él)', () => {
    const gain = (p: ReturnType<typeof buildFeatureProfile>): number =>
      p.segments.reduce(
        (acc, s) => acc + (s.tramos ?? []).reduce((a, r) => a + (r.g > 0 ? r.km * r.g * 10 : 0), 0),
        0,
      )
    expect(gain(profile)).toBeCloseTo(gain(buildFeatureProfile(100, {}, 'seed')), 0)
  })

  it('dos sectores que se pisan (defecto de la fuente) no se solapan en el recorrido', () => {
    // La tabla italiana de Paris-Roubaix da dos sectores encabalgados: el segundo se recorta.
    const p = buildFeatureProfile(
      50,
      {
        cobbles: [
          { name: 'A', startKm: 10, lengthKm: 3, stars: 3 },
          { name: 'B', startKm: 11.5, lengthKm: 3, stars: 4 },
        ],
      },
      'seed',
    )
    const paves = p.segments.filter((s) => s.tipo === 'paves')
    // A entero (3 km) + lo que queda de B (13 -> 14,5): 4,5 km de adoquín, sin contar dos veces.
    expect(paves.reduce((acc, s) => acc + s.km, 0)).toBeCloseTo(4.5, 1)
    expect(stageLengthKm(p)).toBeCloseTo(50, 1)
  })

  it('un sector dentro de un puerto sigue siendo puerto (el muro adoquinado ya es subida)', () => {
    // Trazado con un repecho exacto entre los km 10 y 12; el sector de adoquín cubre justo el repecho.
    const p = buildFeatureProfile(
      20,
      {
        elevation: [
          { km: 0, elevM: 0 },
          { km: 10, elevM: 0 },
          { km: 12, elevM: 200 },
          { km: 20, elevM: 100 },
        ],
        cobbles: [{ name: 'Muro (adoquín)', startKm: 10, lengthKm: 2, stars: 4 }],
      },
      'seed',
    )
    expect(p.segments.some((s) => s.tipo === 'paves')).toBe(false)
    expect(p.segments.filter((s) => s.tipo === 'puerto')).toHaveLength(1)
  })

  it('convive con la altitud real muestreada: el pavé se superpone al trazado', () => {
    const p = buildFeatureProfile(
      40,
      {
        elevation: [
          { km: 0, elevM: 20 },
          { km: 20, elevM: 60 },
          { km: 40, elevM: 30 },
        ],
        cobbles: [{ name: 'Sector', startKm: 10, lengthKm: 2, stars: 2 }],
      },
      'seed',
    )
    const paves = p.segments.filter((s) => s.tipo === 'paves')
    expect(paves).toHaveLength(1)
    expect(paves[0]!.km).toBeCloseTo(2, 1)
    expect(paves[0]!.tramos![0]!.g).toBeCloseTo(0.2, 1) // conserva la pendiente del trazado
    expect(stageLengthKm(p)).toBeCloseTo(40, 1)
  })
})
