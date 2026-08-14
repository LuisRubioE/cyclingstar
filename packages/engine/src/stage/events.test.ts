import { describe, expect, it } from 'vitest'
import { announceRebels } from './events.js'
import type { RaceEvent } from './types.js'

const ev = (km: number, plantilla: string, protagonistas: string[]): RaceEvent => ({
  km,
  tS: km * 100,
  tipo: 'x',
  plantilla,
  protagonistas,
})

/**
 * EL QUE CORRE POR SU CUENTA SE ANUNCIA DONDE HACE ALGO (v31). La v15 lo anunciaba en el km 0, antes
 * de que la carrera empezara: «Team orders are one thing — 175 Rui Correia is racing his own race
 * today». El dueño lo llamó «tontería absurda y que no se entiende», y tenía dos motivos: en el km 0
 * no ha pasado nada, y la frase no decía qué hacía distinto.
 */
describe('announceRebels: la desobediencia se cuenta donde se ve', () => {
  it('sin rebeldes no toca nada', () => {
    const evs = [ev(10, 'attack_go', ['a'])]
    expect(announceRebels(evs, new Set())).toEqual(evs)
  })

  it('el rebelde que no aparece en toda la etapa NO tiene línea', () => {
    // Una desobediencia sin consecuencia no es noticia: es el caso normal, y es el que llenaba el
    // km 0 de líneas que no llevaban a ninguna parte.
    const evs = [ev(10, 'attack_go', ['otro'])]
    const out = announceRebels(evs, new Set(['rebelde']))
    expect(out.some((e) => e.plantilla === 'rider_defies_team')).toBe(false)
  })

  it('se anuncia justo ANTES de su primera aparición, y en ese kilómetro', () => {
    const evs = [ev(5, 'peloton_pull', ['otro']), ev(40, 'attack_go', ['rebelde'])]
    const out = announceRebels(evs, new Set(['rebelde']))
    expect(out.map((e) => e.plantilla)).toEqual(['peloton_pull', 'rider_defies_team', 'attack_go'])
    expect(out[1]!.km).toBe(40)
    expect(out[1]!.tS).toBe(4000)
    expect(out[1]!.datos?.doing).toBe('ataca')
  })

  it('una sola vez: la segunda aparición ya no lo repite', () => {
    const evs = [ev(40, 'attack_go', ['r']), ev(80, 'peloton_pull', ['r'])]
    const out = announceRebels(evs, new Set(['r']))
    expect(out.filter((e) => e.plantilla === 'rider_defies_team')).toHaveLength(1)
  })

  it('la frase se cuelga de lo que está haciendo: atacar, tirar o simplemente salir nombrado', () => {
    const doing = (plantilla: string): unknown =>
      announceRebels([ev(20, plantilla, ['r'])], new Set(['r']))[0]!.datos?.doing
    expect(doing('attack_go')).toBe('ataca')
    expect(doing('bridge_made')).toBe('ataca')
    expect(doing('peloton_pull')).toBe('tira')
    expect(doing('chase_work')).toBe('tira')
    expect(doing('rider_bonks')).toBe('aparece')
  })

  it('con dos rebeldes, cada uno se anuncia en SU momento', () => {
    const evs = [ev(10, 'attack_go', ['a']), ev(90, 'peloton_pull', ['b'])]
    const out = announceRebels(evs, new Set(['a', 'b']))
    const lineas = out.filter((e) => e.plantilla === 'rider_defies_team')
    expect(lineas.map((l) => [l.km, l.protagonistas[0]])).toEqual([
      [10, 'a'],
      [90, 'b'],
    ])
  })
})
