import { describe, expect, it } from 'vitest'
import { deviceLabel } from './deviceLabel.js'

/**
 * EL NOMBRE DE UN APARATO (docs/cuenta.md §6.4; 6-d): los doce agentes de la tabla, con el orden de las
 * comprobaciones fijado: `Edg/` antes que `Chrome/`; `SamsungBrowser/`, `CriOS/` y `FxiOS/` antes que
 * `Safari`; `iPad` antes que `Mac`. Un iPad que se anuncia como `Macintosh` sale `Safari on Mac`.
 */
const CASOS: readonly (readonly [string, string])[] = [
  [
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    'Chrome on Android',
  ],
  [
    'Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
    'Samsung Internet on Android',
  ],
  [
    'Mozilla/5.0 (Linux; Android 15; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0',
    'Firefox on Android',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
    'Safari on iPhone',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
    'Chrome on iPhone',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/133.0 Mobile/15E148 Safari/605.1.15',
    'Firefox on iPhone',
  ],
  [
    'Mozilla/5.0 (iPad; CPU OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
    'Safari on iPad',
  ],
  [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Edge on Windows',
  ],
  [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Firefox on Windows',
  ],
  [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Chrome on Mac',
  ],
  [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15',
    'Safari on Mac',
  ],
  ['curl/8.5.0', 'Unknown browser'],
]

describe('deviceLabel (§6.4; 6-d)', () => {
  it.each(CASOS)('%s', (agente, nombre) => {
    expect(deviceLabel(agente)).toBe(nombre)
  })

  it('sin agente, o vacío, Unknown browser', () => {
    expect(deviceLabel('')).toBe('Unknown browser')
    expect(deviceLabel(null)).toBe('Unknown browser')
    expect(deviceLabel(undefined)).toBe('Unknown browser')
  })

  it('el iPad que se anuncia como Mac sale Safari on Mac, y se acepta', () => {
    expect(
      deviceLabel(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari on Mac')
  })

  it('nunca pasa de 60 caracteres ni devuelve el agente crudo', () => {
    const raro = `Mozilla/5.0 (X11; Linux x86_64) ${'x'.repeat(500)}`
    expect(deviceLabel(raro).length).toBeLessThanOrEqual(60)
    expect(deviceLabel(raro)).not.toContain('Mozilla')
  })
})
