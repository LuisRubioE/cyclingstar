import { describe, expect, it } from 'vitest'
import { PALETA, campo, pieza, pintaEn, respuestas } from './__fixtures__/markup'
import { CreateRider } from './CreateRider'

/**
 * LA CREACIÓN DEL CORREDOR CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en
 * `PageHeader`; el `Panel` que contesta a la 34 (§7.3), con el país, la vocación, la nacionalidad y el nombre;
 * y la línea `Your country: …` del dueño (DD-18), como ayuda del país en `meta` `ink-2`.
 */

const pinta = (initial?: NonNullable<Parameters<typeof CreateRider>[0]>['initial']) =>
  pintaEn('/create', <CreateRider {...(initial === undefined ? {} : { initial })} />)

const detectado = { country: 'ES', geo: 'cf-ipcountry ES', name: 'Pablo Ruiz' } as const

describe('la creación del corredor (§17.21; PR 21j)', () => {
  it('la cabecera, un PageHeader con su línea, en el ancho de los formularios', () => {
    const html = pinta()
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(html).toMatch(/<h1[^>]*>Create your rider<\/h1>/)
    expect(html).toContain('Your vocation shapes your talent')
  })

  it('mientras se busca el país: una sola respuesta, su Panel, que lo dice en su región de estado', () => {
    const html = pinta()
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(
      /<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="Create your rider"/,
    )
    expect(html).toMatch(/<p role="status"[^>]*>Detecting your country…<\/p>/)
    expect(html).not.toContain('data-ui="Field"')
  })

  it('sin detectarlo: un Notice warn y el país en un Field select, por su nombre y sin emoji, con la línea del dueño de ayuda', () => {
    const html = pinta({ country: '', geo: 'no header; ipapi.co timed out' })
    const aviso = pieza(html, 'Notice', 'Pick your country to carry on.')
    expect(aviso).toMatch(/data-variant="warn"/)
    // el apóstrofo, como lo escribe React en estático
    expect(aviso).toContain('We couldn&#x27;t work out where you&#x27;re riding from.')
    const pais = campo(html, 'create-country')
    expect(pais).toMatch(/<label for="create-country"[^>]*>Country<\/label>/)
    expect(pais).toContain('<option value="" selected="">Choose your country…</option>')
    expect(pais).toContain('<option value="ES">Spain</option>')
    expect(pais).toMatch(
      /<p [^>]*class="text-meta text-ink-2"[^>]*>Your country: not detected · no header; ipapi\.co timed out<\/p>/,
    )
    expect(pais).not.toMatch(/\p{Regional_Indicator}/u)
    expect(html).not.toContain('create-vocation')
  })

  it('detectado: la vocación en un Field select; la nacionalidad, con su bandera y la línea del dueño; y el nombre, con Regenerate', () => {
    const html = pinta(detectado)
    const vocacion = campo(html, 'create-vocation')
    expect(vocacion).toMatch(/>Vocation<\/label>/)
    expect(vocacion).toContain('<option value="escalada" selected="">Climber</option>')
    expect(vocacion).toContain('<option value="fondo">All-rounder</option>')
    expect(html).toMatch(
      /<dt[^>]*>Nationality<\/dt><dd[^>]*><span aria-hidden="true"><span data-ui="Flag"[^>]*><\/span><\/span>Spain/,
    )
    expect(html).toContain('from your location')
    expect(html).toMatch(/class="text-meta text-ink-2">Your country: ES · cf-ipcountry ES</)
    expect(html).toMatch(/<dt[^>]*>Name<\/dt><dd[^>]*><span[^>]*>Pablo Ruiz<\/span>/)
    expect(pieza(html, 'Button', 'Regenerate')).toMatch(/data-variant="secondary"/)
    expect(html).not.toContain('create-country')
  })

  it('crearlo, un Button primary; sin nombre todavía, deshabilitado con su porqué', () => {
    expect(pieza(pinta(detectado), 'Button', 'Create rider')).toMatch(
      /^<button [^>]*data-variant="primary" data-state="ready"/,
    )
    const sinNombre = pieza(pinta({ ...detectado, name: '' }), 'Button', 'Create rider')
    expect(sinNombre).toMatch(/data-state="disabled"/)
    expect(sinNombre).toContain('Waiting for a name. Regenerate if it does not come.')
  })

  it('el fallo del servidor, en role="alert"', () => {
    expect(pinta({ ...detectado, error: 'Something went wrong.' })).toMatch(
      /<p role="alert"[^>]*>Something went wrong\.<\/p>/,
    )
  })

  it('ningún select ni botón a mano, y ninguna clase de la paleta', () => {
    const html = pinta(detectado) + pinta({ country: '', geo: '' })
    expect(html.match(/<select/g)?.length).toBe(html.match(/data-variant="select"/g)?.length)
    expect(html.match(/<button/g)?.length).toBe(html.match(/data-ui="Button"/g)?.length)
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('font-mono')
  })
})
