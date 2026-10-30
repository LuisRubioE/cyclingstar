import { describe, expect, it } from 'vitest'
import { PALETA, campo, cuantas, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { CreateRider } from './CreateRider'

/**
 * LA CREACIÓN DEL CORREDOR CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en
 * `PageHeader`; el `Panel` que contesta a la 34 (§7.3), con el país, la vocación, la nacionalidad y el nombre;
 * y la línea `Your country: …` del dueño (DD-18), como ayuda del país en `meta` `ink-2`.
 */

const pinta = (initial?: NonNullable<Parameters<typeof CreateRider>[0]>['initial']) =>
  pintaEn('/create', <CreateRider {...(initial === undefined ? {} : { initial })} />)

// lo que dice `fetchGeoCountry` (`api/rider.ts`), que sin detectar ya lleva su `·` dentro
const detectado = { country: 'ES', geo: 'cf-ipcountry=ES → ES', name: 'Pablo Ruiz' } as const
const SIN_DETECTAR = 'server: no geo headers · ip lookup: no country'

describe('la creación del corredor (§17.21; PR 21j)', () => {
  it('la cabecera, un PageHeader con su línea y el único h1, en el ancho de los formularios', () => {
    const html = pinta()
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(titulo(html)).toBe('Create your rider')
    expect(html).toContain('Your vocation shapes your talent')
  })

  it('mientras se busca el país: una sola respuesta, su Panel, y lo dice su región de estado, que está desde el principio', () => {
    const html = pinta()
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(/<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="Your rider"/)
    expect(html).toMatch(
      /<p role="status" class="text-meta text-ink-2">Detecting your country…<\/p>/,
    )
    expect(html).not.toContain('data-ui="Field"')
  })

  it('sin detectarlo: lo dice la región, al lector; un Notice warn; y el país en un Field select, por su nombre, en orden y sin emoji, con la línea del dueño de ayuda', () => {
    const html = pinta({ country: '', geo: SIN_DETECTAR })
    expect(html).toMatch(
      /<p role="status" class="sr-only">Country not detected\. Pick it below\.<\/p>/,
    )
    const aviso = pieza(html, 'Notice', 'Pick your country to carry on.')
    expect(aviso).toMatch(/data-variant="warn"/)
    // el apóstrofo, como lo escribe React en estático
    expect(aviso).toContain('We couldn&#x27;t work out where you&#x27;re riding from.')
    const pais = campo(html, 'create-country')
    expect(pais).toMatch(/<label for="create-country"[^>]*>Country<\/label>/)
    expect(pais).toContain('<option value="" selected="">Choose your country…</option>')
    expect(pais).toContain('<option value="ES">Spain</option>')
    const nombres = [...pais.matchAll(/<option value="[A-Z]{2}">([^<]+)<\/option>/g)].map(
      (m) => m[1] ?? '',
    )
    expect(nombres.length).toBeGreaterThan(100)
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b)))
    expect(pais).toMatch(
      /<p id="[^"]+" class="text-meta text-ink-2">Your country: not detected \(server: no geo headers · ip lookup: no country\)<\/p>/,
    )
    expect(pais).not.toMatch(/\p{Regional_Indicator}/u)
    expect(html).not.toContain('create-vocation')
  })

  it('detectado: lo dice la región, al lector; la vocación en un Field select; la nacionalidad, con su bandera para el ojo y la línea del dueño; y el nombre, con Regenerate', () => {
    const html = pinta(detectado)
    expect(html).toMatch(/<p role="status" class="sr-only">Country detected: Spain\.<\/p>/)
    const vocacion = campo(html, 'create-vocation')
    expect(vocacion).toMatch(/>Vocation<\/label>/)
    expect(vocacion).toContain('<option value="escalada" selected="">Climber</option>')
    expect(vocacion).toContain('<option value="fondo">All-rounder</option>')
    expect(html).toMatch(
      /<dt[^>]*>Nationality<\/dt><dd[^>]*><span aria-hidden="true"><span data-ui="Flag"[^>]*aria-label="Spain"[^>]*><\/span><\/span>Spain<span[^>]*>from your location<\/span>/,
    )
    expect(html).toContain('>Your country: ES (cf-ipcountry=ES → ES)</dd>')
    expect(html).toMatch(/<dt[^>]*>Name<\/dt><dd[^>]*><span[^>]*>Pablo Ruiz<\/span>/)
    expect(pieza(html, 'Button', 'Regenerate')).toMatch(/data-variant="secondary"/)
    expect(html).not.toContain('create-country')
  })

  it('elegido a mano: elegido por ti, y no de tu ubicación, y la región sin anunciar una detección que no hubo', () => {
    const html = pinta({ ...detectado, geo: SIN_DETECTAR, elegido: true })
    expect(html).toMatch(/Spain<span[^>]*>chosen by you<\/span>/)
    expect(html).not.toContain('from your location')
    expect(html).toMatch(/<p role="status" class="sr-only"><\/p>/)
  })

  it('crearlo, un Button primary; sin nombre todavía, los puntos y el botón deshabilitado con su porqué', () => {
    expect(pieza(pinta(detectado), 'Button', 'Create rider')).toMatch(
      /^<button [^>]*data-variant="primary" data-state="ready"/,
    )
    const sinNombre = pinta({ ...detectado, name: '' })
    expect(sinNombre).toMatch(/<dt[^>]*>Name<\/dt><dd[^>]*><span[^>]*>…<\/span>/)
    const boton = pieza(sinNombre, 'Button', 'Create rider')
    expect(boton).toMatch(/data-state="disabled"/)
    expect(boton).toContain('Waiting for a name. Regenerate if it does not come.')
  })

  it('el fallo del servidor, en role="alert", y sin fallo, ninguno', () => {
    expect(pinta({ ...detectado, error: 'Something went wrong.' })).toMatch(
      /<p role="alert"[^>]*>Something went wrong\.<\/p>/,
    )
    expect(pinta(detectado)).not.toContain('role="alert"')
  })

  it('ningún select ni botón a mano, y ninguna clase de la paleta', () => {
    const html = pinta(detectado) + pinta({ country: '', geo: '' })
    expect(cuantas(html, /<select/)).toBe(2)
    expect(cuantas(html, /<select/)).toBe(cuantas(html, /data-variant="select"/))
    expect(cuantas(html, /<button/)).toBeGreaterThan(0)
    expect(cuantas(html, /<button/)).toBe(cuantas(html, /data-ui="Button"/))
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('font-mono')
  })
})
