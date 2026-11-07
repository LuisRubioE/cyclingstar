import { BROADCAST } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { kmSeekOf } from '../../domain/broadcast/player'
import { KmBar, kmAtRatio, kmForKey, tapSeeks } from './KmBar'

/**
 * LA BARRA DE PROGRESO EN KM (docs/retransmision.md §8.5, D-20; W3, la revisión de `Watch` del dueño, su
 * punto 6). Sin DOM, como los mandos (§8.12): el marcado en estático, y su conducta (el km de un toque y
 * el de una tecla) en las funciones puras que la deciden. Lo que hace el reproductor con ese km lo prueba
 * `player.test.ts` (`kmSeekOf`, `kmSeekable`).
 */

const nada = () => undefined
const props = {
  lengthKm: 175.4,
  headKm: 84.6,
  reachedKm: 120.2,
  climbs: [
    { footKm: 30, topKm: 40 },
    { footKm: 150, topKm: 162.5 },
  ],
  sprintsKm: [90],
  enabled: true,
  onSeekKm: nada,
}
const pct = (km: number): string => `${(km / props.lengthKm) * 100}%`

describe('KmBar: el marcado', () => {
  it('un slider nombrado, de 0 a la longitud, con el km de la cabeza como valor y su texto', () => {
    const s = renderToStaticMarkup(<KmBar {...props} />)
    expect(s).toMatch(/^<div [^>]*role="slider"/)
    expect(s).toContain('aria-label="Stage progress"')
    expect(s).toContain('aria-valuemin="0"')
    expect(s).toContain('aria-valuemax="175"')
    expect(s).toContain('aria-valuenow="85"')
    expect(s).toContain('aria-valuetext="85 of 175 km"')
    expect(s).toContain('tabindex="0"')
    expect(s).not.toContain('aria-disabled')
    // 44 px de alto para el dedo (§4.1, la comprobación de los objetivos pequeños), y sin style (ui/9)
    expect(s).toMatch(/^<div [^>]*class="[^"]*\bh-11\b/)
    expect(s).not.toContain('style=')
  })

  it('pinta la cabeza y, más claro, lo alcanzado, en porcentaje de la longitud, y la cabeza encima', () => {
    const s = renderToStaticMarkup(<KmBar {...props} />)
    expect(s).toMatch(new RegExp(`<rect [^>]*data-fill="reached"[^>]*width="${pct(120.2)}"`))
    expect(s).toMatch(new RegExp(`<rect [^>]*data-fill="head"[^>]*width="${pct(84.6)}"`))
    expect(s).toMatch(new RegExp(`<circle [^>]*data-thumb="head"[^>]*cx="${pct(84.6)}"`))
    expect(s.indexOf('data-fill="reached"')).toBeLessThan(s.indexOf('data-fill="head"'))
    expect(s.indexOf('data-fill="head"')).toBeLessThan(s.indexOf('data-thumb="head"'))
  })

  it('lo alcanzado nunca se pinta por detrás de la cabeza, ni nada fuera de la etapa', () => {
    const s = renderToStaticMarkup(<KmBar {...props} headKm={200} reachedKm={10} />)
    expect(s).toMatch(/<rect [^>]*data-fill="head"[^>]*width="100%"/)
    expect(s).toMatch(/<rect [^>]*data-fill="reached"[^>]*width="100%"/)
    const t = renderToStaticMarkup(<KmBar {...props} headKm={-3} reachedKm={-3} />)
    expect(t).toContain('aria-valuenow="0"')
    expect(t).toMatch(/<rect [^>]*data-fill="head"[^>]*width="0%"/)
  })

  it('marcas solo del recorrido, los puertos de su pie a su cima y las volantes, y ninguna más (D-17, 8-j)', () => {
    const s = renderToStaticMarkup(<KmBar {...props} />)
    const marks = [...s.matchAll(/data-mark="([a-z]+)"/g)].map((m) => m[1])
    expect(marks).toEqual(['climb', 'climb', 'sprint'])
    expect(s).toMatch(
      new RegExp(
        `data-mark="climb"[^>]*x="${pct(30)}"[^>]*width="${pct(10)}"|x="${pct(30)}"[^>]*width="${pct(10)}"[^>]*data-mark="climb"`,
      ),
    )
    expect(s).toMatch(new RegExp(`<line [^>]*data-mark="sprint"[^>]*x1="${pct(90)}"`))
  })

  it('con describedBy, la leyenda que la explica (el cierre: «Watch again from any km»)', () => {
    expect(renderToStaticMarkup(<KmBar {...props} describedBy="w3-cierre" />)).toContain(
      'aria-describedby="w3-cierre"',
    )
    expect(renderToStaticMarkup(<KmBar {...props} />)).not.toContain('aria-describedby')
  })

  it('apagada: aria-disabled, y sigue en el tabulador para que el lector la encuentre', () => {
    const s = renderToStaticMarkup(<KmBar {...props} enabled={false} />)
    expect(s).toContain('aria-disabled="true"')
    expect(s).toContain('tabindex="0"')
  })
})

describe('KmBar: el km de un toque y el de una tecla', () => {
  it('tapSeeks: un toque salta solo encendida, con los mandos a la vista al tocar y con un puntero de verdad', () => {
    expect(tapSeeks(true, true, 1)).toBe(true)
    // con los mandos escondidos, el primer toque solo los enseña (8-p; la revisión de W3)
    expect(tapSeeks(true, false, 1)).toBe(false)
    // un clic sin puntero (detail 0: el del lector de pantalla o uno programado) no salta al centro
    expect(tapSeeks(true, true, 0)).toBe(false)
    expect(tapSeeks(false, true, 1)).toBe(false)
  })

  it('kmAtRatio: la proporción del ancho tocada, recortada a la etapa', () => {
    expect(kmAtRatio(0.5, 175)).toBe(87.5)
    expect(kmAtRatio(0, 175)).toBe(0)
    expect(kmAtRatio(-0.1, 175)).toBe(0)
    expect(kmAtRatio(1.2, 175)).toBe(175)
    expect(kmAtRatio(Number.NaN, 175)).toBeNull()
  })

  it('kmForKey: las flechas, seekStepKm atrás o adelante; Inicio, la salida; Fin, el último km; lo demás, nada', () => {
    const step = BROADCAST.seekStepKm
    expect(kmForKey('ArrowRight', 84.6, 175)).toBeCloseTo(84.6 + step, 9)
    expect(kmForKey('ArrowUp', 84.6, 175)).toBeCloseTo(84.6 + step, 9)
    expect(kmForKey('ArrowLeft', 84.6, 175)).toBeCloseTo(84.6 - step, 9)
    expect(kmForKey('ArrowDown', 84.6, 175)).toBeCloseTo(84.6 - step, 9)
    expect(kmForKey('ArrowLeft', 2, 175)).toBe(0)
    expect(kmForKey('Home', 84.6, 175)).toBe(0)
    expect(kmForKey('End', 84.6, 175)).toBe(174)
    expect(kmForKey(' ', 84.6, 175)).toBeNull()
    // Fin, con la cabeza ya en el último km o tras la meta, se queda donde está: nunca vuelve atrás
    expect(kmForKey('End', 174.8, 175.4)).toBe(174.8)
    expect(kmSeekOf(kmForKey('End', 174.8, 175.4)!, 174.8, 175.4)).toBeNull()
    expect(kmSeekOf(kmForKey('End', 175.4, 175.4)!, 175.4, 175.4)).toBeNull()
    expect(kmForKey('Enter', 84.6, 175)).toBeNull()
  })
})
