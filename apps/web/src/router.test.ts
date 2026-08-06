/**
 * El enrutador es UN SOLO módulo.
 *
 * `react-router-dom` no publica la versión 8 (su última es 7.18.2) y el parche del CSRF en modo RSC
 * (GHSA-qwww-vcr4-c8h2, ALTA) solo existe en `react-router` 8.3.0, donde el paquete DOM desaparece y
 * todo se unifica. Por eso `apps/web/package.json` declara `react-router` y aliasa
 * `react-router-dom: npm:react-router@^8.3.0`.
 *
 * El peligro de un alias así es acabar con DOS copias del paquete y, con ellas, dos contextos de
 * router: los `Link` de una no verían el `BrowserRouter` de la otra y la navegación reventaría en
 * tiempo de ejecución, no al compilar. Esta prueba lo impide: si algún día las dos entradas dejaran
 * de resolver al mismo módulo, falla aquí y no en producción.
 */

import { describe, expect, it } from 'vitest'
import * as bare from 'react-router'
import * as aliased from 'react-router-dom'

describe('react-router', () => {
  it('el alias react-router-dom resuelve al mismo módulo que react-router', () => {
    const bareExports = bare as unknown as Record<string, unknown>
    const aliasedExports = aliased as unknown as Record<string, unknown>
    // Comparar TODOS los exports (no solo un par) atrapa también una copia parcial.
    for (const name of Object.keys(bareExports)) {
      expect(aliasedExports[name]).toBe(bareExports[name])
    }
  })

  it('trae la versión con el CSRF de modo RSC ya parcheado', async () => {
    const pkg: { name: string; version: string } = await import(
      'react-router-dom/package.json',
      { with: { type: 'json' } }
    ).then((m: { default: { name: string; version: string } }) => m.default)
    expect(pkg.name).toBe('react-router')
    const [major, minor] = pkg.version.split('.').map(Number)
    expect((major ?? 0) > 8 || ((major ?? 0) === 8 && (minor ?? 0) >= 3)).toBe(true)
  })
})
