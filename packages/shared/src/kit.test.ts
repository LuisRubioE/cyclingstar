import { describe, expect, it } from 'vitest'
import { KIT_MIN_PX, KIT_PX } from './kit.js'

describe('shared: el tamaño del maillot (E3, §8.3; D-00b)', () => {
  it('ningún tamaño con nombre baja de KIT_MIN_PX, que es el de la fila', () => {
    expect(KIT_MIN_PX).toBe(28)
    expect(KIT_PX.row).toBe(KIT_MIN_PX)
    for (const px of Object.values(KIT_PX)) expect(px).toBeGreaterThanOrEqual(KIT_MIN_PX)
  })

  it('los tamaños van de menor a mayor: fila, tarjeta, equipo, página y cabecera', () => {
    expect(Object.values(KIT_PX)).toEqual([28, 40, 48, 72, 96])
  })
})
