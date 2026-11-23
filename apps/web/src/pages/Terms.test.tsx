import { describe, expect, it } from 'vitest'
import { PALETA, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { Terms } from './Terms'

/** LAS CONDICIONES (docs/cuenta.md §4.6; PR 9 de E4): el borrador de §4.6, entero y sin más. */

const html = pintaEn('/terms', <Terms />)
const texto = html
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;|&apos;/g, "'")
  .replace(/\s+/g, ' ')

describe('Terms (§4.6)', () => {
  it('la cabecera dice que es un borrador', () => {
    expect(titulo(html)).toBe('Terms')
    expect(texto).toContain('These terms are a draft and will be reviewed before public launch.')
  })

  it('cada parte en su Panel, la primera la respuesta, y ninguna clase de la paleta', () => {
    const titulos = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    expect(titulos).toEqual([
      'Who can play',
      'A game',
      'Your rider and your team',
      'Your account',
      'Emails',
    ])
    expect(respuestas(html)).toBe(1)
    expect(pieza(html, 'Panel', 'Who can play')).toContain('data-answer=""')
    expect(html).not.toMatch(PALETA)
  })

  it.each([
    'Cycling Star is for people aged 16 or over.',
    'Riders, teams and races are fictional.',
    'If you delete your account or stop playing, your rider and your team stay in the world, run by the game. Your team keeps the name you gave it. An administrator can rename any team.',
    'New accounts are approved by an administrator before they can play. An administrator can change the email and the date of birth of an account. Every change an administrator makes is recorded.',
    'We only email you to confirm your address and to reset your password.',
  ])('dice: %s', (frase) => {
    expect(texto).toContain(frase)
  })

  it('no dice lo que nadie ha decidido (E7)', () => {
    expect(texto).not.toMatch(/One account per person/i)
    expect(texto).not.toMatch(/close an account/i)
  })
})
