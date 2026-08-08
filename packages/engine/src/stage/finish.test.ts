import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { STAGE } from '../constants.js'
import {
  deriveFinishTerrain,
  finishScore,
  finishType,
  isSprintFinish,
  isUphillFinish,
} from './finish.js'
import { sampleProfile } from './sample.js'
import type { FinishType } from './finish.js'
import type { Segment, StageProfile } from './types.js'

/** Deriva el tipo de final de un recorrido para un grupo de `size` corredores. */
function typeOf(segments: Segment[], size = 40): FinishType {
  const profile: StageProfile = { segments }
  return finishType(deriveFinishTerrain(sampleProfile(profile)), size)
}

function eff(
  base: number,
  over: Partial<Record<Attribute, number>> = {},
): Record<Attribute, number> {
  return {
    RES: base,
    REC: base,
    LLA: base,
    MON: base,
    COL: base,
    CRI: base,
    SPR: base,
    DES: base,
    PAV: base,
    TAC: base,
    ...over,
  }
}

describe('tipo de final derivado del recorrido (docs/motor.md §12)', () => {
  it('una etapa llana de principio a fin es un sprint masivo', () => {
    expect(typeOf([{ km: 120, tipo: 'llano' }])).toBe('sprint_masivo')
  })

  it('UNA RAMPA DE 200 M antes de meta NO convierte una llana en llegada de escaladores', () => {
    // El defecto exacto de docs/motor.md §4: `finishUphill` era "algún bloque de los últimos 2 km
    // sube", así que 200 metros al 6% pasaban la meta entera a decidirse por MON/COL.
    const conRampa = typeOf([
      { km: 119.8, tipo: 'llano' },
      { km: 0.2, tipo: 'puerto', tramos: [{ km: 0.2, g: 6 }] },
    ])
    expect(conRampa).toBe('sprint_masivo')
    // Y tampoco un repecho algo mayor pero corto: hasta `finishClimbMinKm` no hay cota que valga.
    expect(
      typeOf([
        { km: 119.7, tipo: 'llano' },
        { km: 0.3, tipo: 'puerto', tramos: [{ km: 0.3, g: 8 }] },
      ]),
    ).toBe('sprint_masivo')
  })

  it('un tramo de rompepiernas hasta la meta tampoco es un final de puncheur', () => {
    // Los rompepiernas ruedan a g = 1.5 fijo y los recorridos reconstruidos ondulan siempre: si el
    // umbral del arrastre bajara de eso, media llanura del calendario sería final de puncheur.
    expect(
      typeOf([
        { km: 100, tipo: 'llano' },
        { km: 20, tipo: 'rompepiernas' },
      ]),
    ).toBe('sprint_masivo')
  })

  it('un puerto largo que muere en la meta es un final en alto', () => {
    expect(
      typeOf([
        { km: 135, tipo: 'llano' },
        { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
      ]),
    ).toBe('alto')
  })

  it('un MURO corto que muere en la meta es de puncheur, no de escalador', () => {
    // Un muro de 1,3 km al 10% (tipo Mur de Huy) lo gana un puncheur, no un escalador de vuelta.
    expect(
      typeOf([
        { km: 148.7, tipo: 'llano' },
        { km: 1.3, tipo: 'puerto', tramos: [{ km: 1.3, g: 10 }] },
      ]),
    ).toBe('puncheur')
  })

  it('una cota dura que corona a 3 km de meta es de puncheur; a 12 km ya no', () => {
    const cerca = typeOf([
      { km: 100, tipo: 'llano' },
      { km: 2, tipo: 'puerto', tramos: [{ km: 2, g: 8 }] },
      { km: 3, tipo: 'llano' },
    ])
    expect(cerca).toBe('puncheur')
    const lejos = typeOf([
      { km: 100, tipo: 'llano' },
      { km: 2, tipo: 'puerto', tramos: [{ km: 2, g: 8 }] },
      { km: 12, tipo: 'llano' },
    ])
    expect(lejos).toBe('sprint_masivo')
  })

  it('una llegada que arrastra hacia arriba sin cota clara es de puncheur', () => {
    expect(
      typeOf([
        { km: 100, tipo: 'llano' },
        { km: 6, tipo: 'llano', tramos: [{ km: 6, g: 2.8 }] },
      ]),
    ).toBe('puncheur')
  })

  it('bajar hasta la meta tras coronar es un final de descenso', () => {
    expect(
      typeOf([
        { km: 100, tipo: 'llano' },
        { km: 3, tipo: 'puerto', tramos: [{ km: 3, g: 7 }] },
        { km: 8, tipo: 'descenso', tramos: [{ km: 8, g: -7 }] },
      ]),
    ).toBe('descenso')
  })

  it('un final con adoquín en los últimos kilómetros es un final de pavé', () => {
    expect(
      typeOf([
        { km: 200, tipo: 'llano' },
        { km: 12, tipo: 'paves', estrellas: 4 },
        { km: 6, tipo: 'llano' },
      ]),
    ).toBe('pave')
  })

  it('el TAMAÑO del grupo separa el sprint masivo del esprint de grupo reducido', () => {
    const llana: Segment[] = [{ km: 120, tipo: 'llano' }]
    expect(typeOf(llana, 40)).toBe('sprint_masivo')
    expect(typeOf(llana, STAGE.finishBunchMinRiders)).toBe('sprint_masivo')
    expect(typeOf(llana, STAGE.finishBunchMinRiders - 1)).toBe('sprint_reducido')
    expect(typeOf(llana, 4)).toBe('sprint_reducido')
    expect(typeOf(llana, 1)).toBe('solitario')
  })

  it('la última cota es la ÚLTIMA, aunque antes haya otra más dura', () => {
    const t = deriveFinishTerrain(
      sampleProfile({
        segments: [
          { km: 100, tipo: 'llano' },
          { km: 6, tipo: 'puerto', tramos: [{ km: 6, g: 9 }] }, // dura, pero lejos
          { km: 4, tipo: 'llano' },
          { km: 1, tipo: 'puerto', tramos: [{ km: 1, g: 5 }] }, // la que corona en meta
        ],
      }),
    )
    expect(t.climbKm).toBeCloseTo(1, 1)
    expect(t.climbKmToFinish).toBeLessThanOrEqual(STAGE.finishSummitKm)
  })

  it('una etapa sin bloques no revienta la derivación', () => {
    const t = deriveFinishTerrain([])
    expect(t.climbKm).toBe(0)
    expect(finishType(t, 40)).toBe('sprint_masivo')
  })
})

describe('puntuación compuesta por tipo de final (docs/motor.md §12)', () => {
  it('los pesos de cada tipo de final suman 1', () => {
    for (const [type, weights] of Object.entries(STAGE.finishWeights)) {
      const total = Object.values(weights as Record<string, number>).reduce((a, b) => a + b, 0)
      expect(total, `pesos de ${type}`).toBeCloseTo(1, 6)
    }
  })

  it('un corredor medio puntúa como su nivel: la escala no depende del tipo de final', () => {
    for (const type of Object.keys(STAGE.finishWeights) as FinishType[]) {
      expect(finishScore(eff(60), type)).toBeCloseTo(60, 6)
    }
  })

  it('cada final premia a su especialista', () => {
    const sprinter = eff(50, { SPR: 85 })
    const puncheur = eff(50, { COL: 85 })
    const escalador = eff(50, { MON: 85 })
    const adoquinero = eff(50, { PAV: 85 })
    const bajador = eff(50, { DES: 85 })
    const tactico = eff(50, { TAC: 85 })

    expect(finishScore(sprinter, 'sprint_masivo')).toBeGreaterThan(
      finishScore(puncheur, 'sprint_masivo'),
    )
    expect(finishScore(puncheur, 'puncheur')).toBeGreaterThan(finishScore(sprinter, 'puncheur'))
    expect(finishScore(escalador, 'alto')).toBeGreaterThan(finishScore(puncheur, 'alto'))
    // El PAV, que no intervenía JAMÁS en ningún resultado, decide el final de adoquín.
    expect(finishScore(adoquinero, 'pave')).toBeGreaterThan(finishScore(sprinter, 'pave'))
    expect(finishScore(bajador, 'descenso')).toBeGreaterThan(finishScore(sprinter, 'descenso'))
    // Y la táctica pesa más en un grupo reducido que en una llegada masiva.
    expect(finishScore(tactico, 'sprint_reducido')).toBeGreaterThan(
      finishScore(tactico, 'sprint_masivo'),
    )
  })

  it('ningún final se decide por un solo atributo', () => {
    // La razón de ser del cambio: antes el orden dentro del grupo era `finishUphill ? MON/COL : SPR`.
    for (const type of Object.keys(STAGE.finishWeights) as FinishType[]) {
      const weights = Object.values(STAGE.finishWeights[type] as Record<string, number>)
      expect(weights.length, `${type} mezcla atributos`).toBeGreaterThanOrEqual(3)
      expect(Math.max(...weights), `${type} no depende de uno solo`).toBeLessThanOrEqual(0.8)
    }
  })

  it('solo los finales al sprint justifican un tren de lanzadores', () => {
    expect(isSprintFinish('sprint_masivo')).toBe(true)
    expect(isSprintFinish('sprint_reducido')).toBe(true)
    expect(isSprintFinish('alto')).toBe(false)
    expect(isSprintFinish('puncheur')).toBe(false)
  })

  it('llegar por adoquín o cuesta abajo sigue siendo llegar al sprint, para la crónica', () => {
    expect(isUphillFinish('alto')).toBe(true)
    expect(isUphillFinish('puncheur')).toBe(true)
    expect(isUphillFinish('pave')).toBe(false)
    expect(isUphillFinish('descenso')).toBe(false)
    expect(isUphillFinish('sprint_masivo')).toBe(false)
  })
})
