import { describe, expect, it } from 'vitest'
import { deriveClimbCategory } from '../stage/sample.js'
import { elevationProfile, renderAltimetrySvg } from './altimetry.js'
import { TEST_TOUR } from './testTour.js'

describe('altimetría (Paso 28)', () => {
  it('integra la elevación de las pendientes de los tramos', () => {
    const points = elevationProfile({
      segments: [
        { km: 10, tipo: 'llano' },
        { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 6 }] }, // +600 m
        { km: 10, tipo: 'descenso', tramos: [{ km: 10, g: -5 }] }, // -500 m
      ],
    })
    expect(points[0]).toEqual({ km: 0, elevM: 0 })
    const top = points.find((p) => p.km === 20)
    expect(top?.elevM).toBeCloseTo(600) // 6% · 10 km · 10 = 600 m
    const end = points[points.length - 1]
    expect(end?.km).toBe(30)
    expect(end?.elevM).toBeCloseTo(100) // 600 - 500
  })

  it('renderiza las cinco altimetrías de la vuelta de prueba', () => {
    expect(TEST_TOUR).toHaveLength(5)
    for (const stage of TEST_TOUR) {
      const svg = renderAltimetrySvg(stage.profile, { title: stage.name })
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg).toContain('</svg>')
      expect(svg).toContain('<polyline')
      expect(svg).toContain(stage.name)
    }
  })

  it('deriva sola la categoría de cada cima de la vuelta de prueba', () => {
    const reina = TEST_TOUR.find((s) => s.kind === 'reina')!
    // El puerto final de 18 km al 8% es HC (18·64 = 1152 >= 1000).
    const finalClimb = reina.profile.segments.find((s) => s.tipo === 'puerto' && s.km === 18)!
    expect(deriveClimbCategory(finalClimb.tramos!)).toBe('HC')
    // La media montaña tiene una cat2 (10 km al 6%) y una cat3 (8 km al 6%).
    const media = TEST_TOUR.find((s) => s.kind === 'media')!
    const puertos = media.profile.segments.filter((s) => s.tipo === 'puerto')
    expect(deriveClimbCategory(puertos[0]!.tramos!)).toBe('cat2')
    expect(deriveClimbCategory(puertos[1]!.tramos!)).toBe('cat3')
  })

  it('el SVG etiqueta cada banner con su categoría derivada (los banners coronan el puerto)', () => {
    const reina = renderAltimetrySvg(TEST_TOUR.find((s) => s.kind === 'reina')!.profile)
    expect(reina).toContain('>HC<')
    expect(reina).toContain('>Cat 2<')
    const media = renderAltimetrySvg(TEST_TOUR.find((s) => s.kind === 'media')!.profile)
    expect(media).toContain('>Cat 2<')
    expect(media).toContain('>Cat 3<') // el banner cae en la cima, no en el llano
    expect(media).toContain('>Sprint<') // meta volante = sprint intermedio (etiqueta en inglés)
  })
})
