import type { StageProfile } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import { stageHead } from './stageHistory.js'

/**
 * Los dos casos de producción del GD 46, reproducidos con recorridos generados igual que los suyos.
 *
 * Race Sharjah e4: la ficha de hoy dice «Stage 4 · ITT, 15 km» porque la mezcla de etapas cambió
 * DESPUÉS de correrla; lo que se corrió fueron 170 km de carretera que acabaron al sprint.
 * Race Great Ocean e1: 188 km en la ficha —perfil inventado— contra los 210 km del recorrido real
 * que se le cargó después.
 */

const KM_CORRIDOS = 170

/** Recorrido rodado: ondula y no sube nada, que es lo que dibujan una llana y una crono. */
function rodado(km: number): StageProfile {
  return { segments: [{ km, tipo: 'llano', tramos: [{ km, g: 1.2 }] }] }
}

/** Recorrido de reina: aproximación y un puerto de verdad con meta en su cima. */
function conPuertoFinal(km: number): StageProfile {
  return {
    segments: [
      { km: km - 12, tipo: 'llano', tramos: [{ km: km - 12, g: 0.8 }] },
      { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 8 }] },
    ],
  }
}

const carretera = rodado(KM_CORRIDOS)
const crono = rodado(15)

describe('api: una etapa corrida se describe con el recorrido que se corrió', () => {
  it('la crono de 15 km que en realidad fueron 170 km de carretera', () => {
    const head = stageHead(
      4,
      { name: 'Stage 4 · ITT', label: 'ITT', kind: 'cri', timeTrial: true, km: 15 },
      { profile: carretera, timeTrial: false, km: KM_CORRIDOS },
    )
    expect(head.staleSpec).toBe(true)
    expect(head.km).toBe(KM_CORRIDOS)
    expect(head.timeTrial).toBe(false)
    expect(head.kind).toBe('llana')
    // El número de etapa no cambia —es su sitio en la carrera—, la etiqueta sí.
    expect(head.name).toBe('Stage 4 · Flat')
    // Y la etiqueta corta va con ellos: la web la pinta al lado del tipo y del nombre, así que si se
    // quedara con el «ITT» de la ficha volvería a contradecirlos, que es el defecto de partida.
    expect(head.label).toBe('Flat')
  })

  it('los 188 km de la ficha contra los 210 que se corrieron', () => {
    const real = conPuertoFinal(210)
    const head = stageHead(
      1,
      { name: 'Stage 1 · Hills', label: 'Hills', kind: 'media', timeTrial: false, km: 188 },
      { profile: real, timeTrial: false, km: 210 },
    )
    expect(head.staleSpec).toBe(true)
    expect(head.km).toBe(210)
    expect(head.kind).toBe('reina')
    expect(head.label).toBe('Summit finish')
  })

  it('cuando la ficha SIGUE describiendo la etapa, manda la ficha', () => {
    // Es el caso normal, el de 78 de las 81 etapas del GD 46: el nombre y el tipo del calendario se
    // respetan tal cual, porque para una edición real su terreno sabe más que ningún clasificador.
    const perfil = conPuertoFinal(200)
    const head = stageHead(
      3,
      { name: 'Stage 3 · Cobbles', label: 'Cobbles', kind: 'clasica', timeTrial: false, km: 200 },
      { profile: perfil, timeTrial: false, km: 200 },
    )
    expect(head.staleSpec).toBe(false)
    expect(head.name).toBe('Stage 3 · Cobbles')
    expect(head.kind).toBe('clasica')
    // Ni siquiera se le pregunta al clasificador: con la ficha vigente, «Cobbles» es lo que hay,
    // aunque este perfil de prueba sea el de una reina.
    expect(head.label).toBe('Cobbles')
  })

  it('un kilómetro de diferencia es redondeo, no un recorrido distinto', () => {
    const perfil = rodado(181)
    const head = stageHead(
      2,
      { name: 'Stage 2 · Flat', label: 'Flat', kind: 'llana', timeTrial: false, km: 180 },
      { profile: perfil, timeTrial: false, km: 181 },
    )
    expect(head.staleSpec).toBe(false)
    expect(head.name).toBe('Stage 2 · Flat')
    // Los kilómetros son SIEMPRE los corridos, aunque la ficha valga para todo lo demás.
    expect(head.km).toBe(181)
  })

  it('una crono que sigue siendo crono no se toca', () => {
    const head = stageHead(
      2,
      { name: 'Stage 2 · ITT', label: 'ITT', kind: 'cri', timeTrial: true, km: 15 },
      { profile: crono, timeTrial: true, km: 15 },
    )
    expect(head.staleSpec).toBe(false)
    expect(head.kind).toBe('cri')
    expect(head.timeTrial).toBe(true)
  })
})
