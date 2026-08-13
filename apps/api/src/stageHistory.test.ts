import { SEASON_CALENDAR, type CalendarStage, type StageProfile } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import { calendarStageSpec, stageHead } from './stageHistory.js'

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

/** Una etapa de calendario de mentira, con el perfil que se le dé. */
function fichaDe(
  index: number,
  kind: CalendarStage['kind'],
  label: string,
  profile: StageProfile,
): CalendarStage {
  return { index, kind, label, name: `Stage ${index} · ${label}`, profile }
}

const puerto = (km: number, g: number) =>
  ({ km, tipo: 'puerto', tramos: [{ km, g }] }) as StageProfile['segments'][number]
const llano = (km: number) =>
  ({ km, tipo: 'llano', tramos: [{ km, g: 0.5 }] }) as StageProfile['segments'][number]
const bajada = (km: number) => ({ km, tipo: 'descenso' }) as StageProfile['segments'][number]

/**
 * EL CASO DE PRODUCCIÓN: Race Andalucía e2 se anunciaba «Stage 2 · Summit finish» sobre un recorrido
 * cuya última cima está a 80 km de meta, y acabó en sprint masivo de 113 sobre 118 ganado por un
 * velocista puro. La etiqueta del final la tiene que decidir el recorrido.
 */
describe('api: la etiqueta del final la pone el recorrido, no el terreno declarado', () => {
  it('«Summit finish» sobre una etapa que baja 80 km hasta la meta pasa a «Mountains»', () => {
    const perfil: StageProfile = {
      segments: [llano(40), puerto(11.5, 6.4), bajada(20), llano(60)],
    }
    const spec = calendarStageSpec(fichaDe(2, 'reina', 'Summit finish', perfil), 142)
    expect(spec.label).toBe('Mountains')
    expect(spec.name).toBe('Stage 2 · Mountains')
    // La FAMILIA no se toca: sigue siendo una etapa reina, y es lo que el motor usa para las
    // órdenes automáticas. Lo único que se corrige es la mitad de la etiqueta que habla de la meta.
    expect(spec.kind).toBe('reina')
  })

  it('«Hills» sobre una etapa que muere en un puerto pasa a «Uphill finish»', () => {
    // Race Arctic e3/e4: su edición las declara `hilly` y mueren en un HC de 3,5 km al 11,8 %.
    const perfil: StageProfile = { segments: [llano(143.5), puerto(3.5, 11.8)] }
    const spec = calendarStageSpec(fichaDe(3, 'media', 'Hills', perfil), 147)
    expect(spec.label).toBe('Uphill finish')
    expect(spec.kind).toBe('media')
  })

  it('una cola de redondeo tras la cima NO degrada un final en alto de verdad', () => {
    // Race France e15 (Plateau de Solaison): el constructor de perfiles reales coloca cada puerto en
    // su km de coronación, así que un final en alto legítimo queda con 0,1 km de llano detrás. El
    // test ingenuo de «el último segmento es un puerto» lo llamaría «Mountains».
    const perfil: StageProfile = { segments: [llano(177.2), puerto(6.7, 8.3), llano(0.1)] }
    const spec = calendarStageSpec(fichaDe(15, 'reina', 'Summit finish', perfil), 184)
    expect(spec.label).toBe('Summit finish')
  })

  it('lo que no promete nada sobre la meta se queda como está', () => {
    for (const [kind, label] of [
      ['llana', 'Flat'],
      ['clasica', 'Cobbles'],
    ] as const) {
      const perfil: StageProfile = { segments: [llano(100), puerto(5, 7)] }
      const spec = calendarStageSpec(fichaDe(1, kind, label, perfil), 105)
      expect(spec.label).toBe(label)
      expect(spec.name).toBe(`Stage 1 · ${label}`)
    }
    const crono: CalendarStage = {
      ...fichaDe(1, 'cri', 'ITT', { segments: [llano(20)] }),
      timeTrial: true,
    }
    expect(calendarStageSpec(crono, 20).label).toBe('ITT')
  })

  it('sobre el calendario entero solo cambia la etiqueta, nunca el tipo de etapa', () => {
    // El tipo alimenta las órdenes automáticas del motor y el banco de simulación: si se moviera,
    // se estaría cambiando cómo se corre la carrera y no cómo se anuncia.
    let cambian = 0
    for (const race of SEASON_CALENDAR) {
      for (const stage of race.stages) {
        const spec = calendarStageSpec(stage, 0)
        expect(spec.kind).toBe(stage.kind)
        expect(spec.timeTrial).toBe(stage.timeTrial ?? false)
        // Y el nombre no puede contradecir a la etiqueta… salvo en las carreras con nombre propio
        // (campeonatos nacionales), que no llevan la etiqueta en el nombre y no se renombran.
        const conNombrePropio = stage.name !== `Stage ${stage.index} · ${stage.label}`
        expect(spec.name).toBe(
          conNombrePropio ? stage.name : `Stage ${stage.index} · ${spec.label}`,
        )
        if (spec.label !== stage.label) cambian++
      }
    }
    // Medido: 30 de 1.418 etapas (14 dejan de anunciar final en alto, 16 pasan a anunciarlo). Es un
    // arreglo acotado, no un cambio de producto; si esta cifra se dispara, algo se ha movido debajo.
    expect(cambian).toBe(30)
  })
})
