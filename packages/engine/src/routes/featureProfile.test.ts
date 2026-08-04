import { describe, expect, it } from 'vitest'
import { stageLengthKm } from '../stage/sample.js'
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
