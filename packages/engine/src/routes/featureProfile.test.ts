import { describe, expect, it } from 'vitest'
import { sampleProfile, stageLengthKm } from '../stage/sample.js'
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
    const elevAtKm = (target: number): number => {
      let e = 100
      let c = 0
      for (const s of profile.segments) {
        const g = s.tramos?.[0]?.g ?? 0
        if (c + s.km >= target) return e + g * (target - c) * 10
        e += g * s.km * 10
        c += s.km
      }
      return e
    }
    expect(elevAtKm(20)).toBeCloseTo(900, -1) // cima ~900 m
    expect(elevAtKm(40)).toBeCloseTo(300, -1) // meta ~300 m
  })

  it('el tramo de subida hasta la cima tiene la pendiente real (800 m en 10 km = 8%)', () => {
    // El segmento que corona en km 20 sube 800 m en 10 km.
    const climbSeg = profile.segments.find(
      (s) => s.tipo === 'puerto' && (s.tramos?.[0]?.g ?? 0) > 5,
    )
    expect(climbSeg).toBeDefined()
    expect(climbSeg!.tramos![0]!.g).toBeCloseTo(8, 0)
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
