import { describe, expect, it } from 'vitest'
import { stageRouteText } from './stageRoute.js'

describe('shared: el de dónde a dónde de una etapa', () => {
  it('salida y llegada con flecha; una sola ciudad si coinciden', () => {
    expect(stageRouteText('Tarragona', 'Barcelona')).toBe('Tarragona → Barcelona')
    expect(stageRouteText('Barcelona', 'Barcelona')).toBe('Barcelona')
  })

  it('sin alguna de las dos ciudades no dice nada', () => {
    expect(stageRouteText(null, 'Barcelona')).toBeNull()
    expect(stageRouteText('Tarragona', undefined)).toBeNull()
    expect(stageRouteText('', '')).toBeNull()
  })
})
