import { describe, expect, it } from 'vitest'
import { bottomBarLinks, sectionLinks, sectionOf } from './nav'

/**
 * Nivel 1 de la navegación: qué destinos existen según la sesión y el equipo, y qué sección abre
 * cada URL. Lo mismo alimenta la fila de la cabecera (escritorio) y la barra inferior (móvil, §5),
 * así que se prueba una vez y las dos quedan cubiertas.
 */

const labels = (links: { label: string }[]) => links.map((l) => l.label)

describe('destinos del nivel 1', () => {
  it('sin sesión solo hay mundo, ayuda y noticias', () => {
    const estado = { signedIn: false, hasTeam: false }
    expect(labels(sectionLinks(estado))).toEqual(['World'])
    expect(labels(bottomBarLinks(estado))).toEqual(['World', 'How to play', 'News'])
  })

  it('con sesión y sin equipo, `My Team` no aparece', () => {
    const estado = { signedIn: true, hasTeam: false }
    expect(labels(sectionLinks(estado))).toEqual(['Dashboard', 'My Rider', 'World'])
    expect(labels(bottomBarLinks(estado))).toEqual(['Dashboard', 'My Rider', 'World', 'News'])
  })

  it('perteneciendo a un equipo salen los cuatro destinos', () => {
    const estado = { signedIn: true, hasTeam: true }
    expect(labels(sectionLinks(estado))).toEqual(['Dashboard', 'My Rider', 'My Team', 'World'])
    expect(labels(bottomBarLinks(estado))).toEqual([
      'Dashboard',
      'My Rider',
      'My Team',
      'World',
      'News',
    ])
  })

  it('con sesión no se ofrece "How to play" en la barra inferior', () => {
    expect(labels(bottomBarLinks({ signedIn: true, hasTeam: true }))).not.toContain('How to play')
  })

  it('la barra inferior lleva los MISMOS destinos que el nivel 1 de la cabecera', () => {
    for (const estado of [
      { signedIn: false, hasTeam: false },
      { signedIn: true, hasTeam: false },
      { signedIn: true, hasTeam: true },
    ]) {
      // Las secciones van primero y en el mismo orden; la barra solo añade lo de la derecha.
      const secciones = labels(sectionLinks(estado))
      expect(labels(bottomBarLinks(estado)).slice(0, secciones.length)).toEqual(secciones)
    }
  })

  it('nunca hay más de cinco destinos: caben en un teléfono', () => {
    expect(bottomBarLinks({ signedIn: true, hasTeam: true })).toHaveLength(5)
  })
})

describe('sección abierta según la URL', () => {
  it('deduce la sección del prefijo de la ruta', () => {
    expect(sectionOf('/')).toBe('dashboard')
    expect(sectionOf('/me/profile')).toBe('me')
    expect(sectionOf('/me/races')).toBe('me')
    expect(sectionOf('/team/squad')).toBe('team')
    expect(sectionOf('/world/races/race-france')).toBe('world')
    expect(sectionOf('/news')).toBe('news')
    expect(sectionOf('/how-to-play')).toBe('help')
  })

  it('las páginas sueltas no marcan ninguna sección', () => {
    expect(sectionOf('/login')).toBeNull()
    expect(sectionOf('/privacy')).toBeNull()
    expect(sectionOf('/account')).toBeNull()
  })

  it('cada destino del nivel 1 marca su propia sección al abrirlo', () => {
    for (const link of bottomBarLinks({ signedIn: true, hasTeam: true })) {
      expect(sectionOf(link.to)).toBe(link.section)
    }
    for (const link of bottomBarLinks({ signedIn: false, hasTeam: false })) {
      expect(sectionOf(link.to)).toBe(link.section)
    }
  })
})
