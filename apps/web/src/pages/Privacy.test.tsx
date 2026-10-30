import { describe, expect, it } from 'vitest'
import { PALETA, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { Privacy } from './Privacy'

/**
 * LA PRIVACIDAD CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en `PageHeader` y
 * cada parte en su `Panel`, el primero la respuesta (§7.3).
 */

const html = pintaEn('/privacy', <Privacy />)

describe('la privacidad (§17.21; PR 21j)', () => {
  it('la cabecera, un PageHeader con lo que es el proyecto, y el único h1', () => {
    expect(titulo(html)).toBe('Privacy')
    expect(html).toContain('Cycling Star is a personal, non-commercial project.')
  })

  it('cada parte en su Panel con su título, y el primero, la respuesta', () => {
    const titulos = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    expect(titulos).toEqual(['What we store', 'Your IP address', 'Cookies', 'Deleting your data'])
    expect(respuestas(html)).toBe(1)
    expect(pieza(html, 'Panel', 'What we store')).toContain('data-answer=""')
    expect(pieza(html, 'Panel', 'Cookies')).toContain(
      'Only a session cookie to keep you logged in. No third-party tracking or ad cookies.',
    )
  })

  it('el aviso del final, en meta, y ninguna clase de la paleta', () => {
    expect(html).toMatch(
      /<p class="text-meta text-ink-2">This notice is informational and will be reviewed against applicable law before public launch\.<\/p>/,
    )
    expect(html).not.toMatch(PALETA)
  })
})
