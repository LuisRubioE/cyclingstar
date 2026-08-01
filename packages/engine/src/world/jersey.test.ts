import { describe, expect, it } from 'vitest'
import { renderJerseySvg } from './jersey.js'

describe('engine: maillot paramétrico (SPEC 7.1)', () => {
  it('es determinista para la misma semilla', () => {
    expect(renderJerseySvg('team-1')).toBe(renderJerseySvg('team-1'))
  })

  it('produce un SVG válido con silueta de maillot', () => {
    const svg = renderJerseySvg('team-1')
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('viewBox="0 0 100 120"')
    expect(svg).toContain('clip-path')
  })

  it('respeta el tamaño pedido', () => {
    const svg = renderJerseySvg('team-1', 48)
    expect(svg).toContain('width="48"')
  })

  it('semillas distintas dan maillots distintos', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) seen.add(renderJerseySvg(`team-${i}`))
    // No todos idénticos: hay variedad de color/patrón.
    expect(seen.size).toBeGreaterThan(20)
  })
})
