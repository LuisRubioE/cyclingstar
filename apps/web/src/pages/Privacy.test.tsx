import { describe, expect, it } from 'vitest'
import { PALETA, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { PRIVACY_UPDATED, Privacy } from './Privacy'

/**
 * LA PRIVACIDAD CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en `PageHeader` y
 * cada parte en su `Panel`, el primero la respuesta (§7.3).
 */

const html = pintaEn('/privacy', <Privacy />)

/** El texto de la página sin etiquetas ni saltos, como lo lee alguien. */
const texto = html
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;|&apos;/g, "'")
  .replace(/\s+/g, ' ')

describe('la privacidad (§17.21; PR 21j)', () => {
  it('la cabecera, un PageHeader con lo que es el proyecto, y el único h1', () => {
    expect(titulo(html)).toBe('Privacy')
    expect(texto).toContain(
      `Last updated ${PRIVACY_UPDATED}. Cycling Star is a personal, non-commercial project run by one person.`,
    )
  })

  it('cada parte en su Panel con su título, y el primero, la respuesta', () => {
    const titulos = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    expect(titulos).toEqual([
      'What we keep about you',
      'Your IP address',
      'Cookies and storage',
      'Who else handles your data',
      'Your data, your choice',
    ])
    expect(respuestas(html)).toBe(1)
    expect(pieza(html, 'Panel', 'What we keep about you')).toContain('data-answer=""')
  })

  it('el aviso del final, en meta, y ninguna clase de la paleta', () => {
    expect(html).toMatch(
      /<p class="text-meta text-ink-2">We don.{1,6}t offer a contact channel yet\.<\/p>/,
    )
    expect(html).toMatch(
      /<p class="text-meta text-ink-2">This notice will be reviewed against applicable law before public launch\.<\/p>/,
    )
    expect(html).not.toMatch(PALETA)
  })
})

/**
 * LAS FRASES DE §10.1 QUE YA SON VERDAD, Y LAS RETIRADAS (docs/cuenta.md §10.2, §11.2; D-36). Cada PR
 * de E4 que haga verdad otra frase la añade aquí; las retiradas no vuelven.
 */
describe('la privacidad de E4: lo que dice y lo que ya no', () => {
  const FRASES = [
    "Your email address, and your password stored as a one-way hash (we can't read it).",
    "Your rider, your team and everything you do in the game: training, plans, the races you follow and how far you've watched them, and your settings.",
    "For each device you're signed in on: the browser and system it reported, and when you signed in and last used it.",
    'When you create a rider we may ask a public service (ipinfo.io, ipwho.is or ipapi.co) for your country to pre-select a flag; our server keeps the answer in memory for a few hours.',
    'Our hosting provider keeps server logs with your full IP address for 7 days, to investigate attacks.',
    'Links from our emails are removed from our server logs.',
    'A session cookie keeps you signed in: 30 days, renewed while you play, never more than 90.',
    'A viewer cookie keeps results hidden until you watch them: 90 days.',
    'Your browser also stores your theme and a few display choices.',
    'No third-party tracking or advertising cookies.',
    'Railway hosts the game, its database and its logs.',
    'Delete your account: Account, Delete account.',
    'Your rider and your team stay in the world, run by the game, and your team keeps its name.',
    'Backups are not kept.',
    "We don't offer a contact channel yet.",
  ]
  it.each(FRASES)('dice: %s', (frase) => {
    expect(texto).toContain(frase)
  })

  const RETIRADAS = [
    /\bAsk\b/,
    /will be removed/i,
    /encrypted password/i,
    /Backups (roll|keep)/i,
    /your IP address is not stored/i,
  ]
  it.each(RETIRADAS)('no dice: %s', (patron) => {
    expect(texto).not.toMatch(patron)
  })
})
