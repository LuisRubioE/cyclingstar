import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamManager, teamEditError } from './TeamManager'

/**
 * EL NOMBRE Y EL PAÍS DEL EQUIPO (SPEC 7; E3, docs/visual.md §8.7; PR 18b, 8-h): los dos `Field` de 48,
 * sin botón propio, porque los guarda la `ActionBar` de `/team/identity` con el maillot.
 */

const nada = () => undefined

describe('TeamManager', () => {
  it('los dos campos, sin botón', () => {
    const s = renderToStaticMarkup(
      <TeamManager name="Noord Cycling" country="NL" onName={nada} onCountry={nada} error={null} />,
    )
    expect(s.match(/data-ui="Field"/g)).toHaveLength(2)
    expect(s).toMatch(/<label[^>]*>Name<\/label>/)
    expect(s).toMatch(/<label[^>]*>Country<\/label>/)
    expect(s).toContain('value="Noord Cycling"')
    expect(s).toMatch(/<option value="NL" selected="">Netherlands<\/option>/)
    expect(s).not.toContain('<button')
  })

  it('el error del servidor, en su campo', () => {
    const s = renderToStaticMarkup(
      <TeamManager
        name="Mistral Racing"
        country="FR"
        onName={nada}
        onCountry={nada}
        error="nombre_repetido"
      />,
    )
    expect(s).toContain('Another team already uses that name.')
    expect(s).toContain('aria-invalid="true"')
    expect(teamEditError('pais_desconocido')).toEqual({
      field: 'country',
      text: 'Pick a country from the list.',
    })
    expect(teamEditError('sin_equipo')).toEqual({
      field: null,
      text: 'You do not manage a team.',
    })
    expect(teamEditError('otra_cosa')).toEqual({ field: null, text: 'Could not save changes.' })
  })
})
