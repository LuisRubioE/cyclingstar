/**
 * Abandonos automáticos (docs/motor.md §15 y §VI.3). Se prueban las reglas PURAS: cuándo un
 * corredor colapsa, qué corte de tiempo dibuja un recorrido, cómo se aplica ese corte contra el
 * GRUPO y cómo actúan las dos salvaguardas contra la hemorragia.
 */
import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  applyTimeCut,
  collapseLambda,
  elevationGainPerKm,
  injuryEndsRace,
  shouldCollapse,
  timeCutFraction,
} from './abandon.js'
import { sampleProfile } from './sample.js'

const collapsing = {
  bonkKm: STAGE.collapseSustainedKm,
  kmToGo: STAGE.collapseMinKmToGo + 1,
  inFrontGroup: false,
  lostFraction: STAGE.collapseMinLostFraction,
  hurt: false,
  groupSize: 30,
}

/** El corredor en apuros (v20): tocado y solo, sin necesidad de llevar la pájara encima. */
const inTrouble = { ...collapsing, bonkKm: 0, hurt: true, groupSize: 1 }

describe('colapso', () => {
  it('se retira quien lleva kilómetros vacío, lejos de meta, descolgado y camino del corte', () => {
    expect(shouldCollapse(collapsing)).toBe(true)
  })

  it('no se retira el que va en el grupo de cabeza, por vacío que esté', () => {
    // Es la condición que impide la masacre: en la etapa reina de una gran vuelta el pelotón ENTERO
    // cruza la meta con el tanque a cero (docs/balance.md, «la reina real de tercera semana»).
    expect(shouldCollapse({ ...collapsing, inFrontGroup: true })).toBe(false)
  })

  it('no se retira nadie cerca de meta: se llega como sea', () => {
    expect(shouldCollapse({ ...collapsing, kmToGo: STAGE.collapseMinKmToGo - 1 })).toBe(false)
  })

  it('no basta rozar el cero un momento: hay que arrastrarse', () => {
    expect(shouldCollapse({ ...collapsing, bonkKm: STAGE.collapseSustainedKm - 0.5 })).toBe(false)
  })

  it('no se retira el que va vacío pero todavía en la carrera', () => {
    expect(shouldCollapse({ ...collapsing, lostFraction: 0 })).toBe(false)
  })

  it('cuanto más lleva arrastrándose, más probable es que se baje', () => {
    const poco = collapseLambda(collapsing)
    const mucho = collapseLambda({ ...collapsing, bonkKm: collapsing.bonkKm + 40 })
    expect(poco).toBeCloseTo(STAGE.lambdaCollapse, 6)
    expect(mucho).toBeGreaterThan(poco)
  })
})

/**
 * EL CORREDOR EN APUROS (v20, docs/motor.md §VI.3). La vía de arriba —la pájara sostenida— está
 * medida y es INALCANZABLE en una gran vuelta: el `bonkKm` máximo de un descolgado a más de 30 km de
 * meta es 0,0, así que la tercera causa de §VI.3 aportaba el 0 % de los abandonos. Ésta es la que
 * ocurre en carretera: el que se ha caído fuerte y se ha quedado solo.
 */
describe('el corredor en apuros (v20)', () => {
  it('el que va tocado y SOLO se baja de la bici sin necesidad de llevar la pájara', () => {
    expect(shouldCollapse(inTrouble)).toBe(true)
  })

  it('…pero si va en un autobús, llega: para eso existe el grupeto', () => {
    const bus = { ...inTrouble, groupSize: STAGE.collapseHurtMaxGroup + 1 }
    expect(shouldCollapse(bus)).toBe(false)
  })

  it('…y el que va solo pero ENTERO, también llega', () => {
    expect(shouldCollapse({ ...inTrouble, hurt: false })).toBe(false)
  })

  it('el herido respeta las mismas salvaguardas que la otra vía', () => {
    // Las tres que impiden la hemorragia: en el grupo de cabeza no se baja nadie, cerca de meta se
    // llega como sea, y el que todavía está en la carrera no abandona.
    expect(shouldCollapse({ ...inTrouble, inFrontGroup: true })).toBe(false)
    expect(shouldCollapse({ ...inTrouble, kmToGo: STAGE.collapseMinKmToGo - 1 })).toBe(false)
    expect(shouldCollapse({ ...inTrouble, lostFraction: 0 })).toBe(false)
  })

  it('su intensidad no crece con los km: la caída ya ocurrió', () => {
    expect(collapseLambda(inTrouble)).toBeCloseTo(STAGE.lambdaCollapseHurt, 6)
    expect(collapseLambda({ ...inTrouble, kmToGo: 120 })).toBeCloseTo(STAGE.lambdaCollapseHurt, 6)
    // Y el que cumple las DOS vías se lleva la mayor de las dos, no la suma.
    const ambas = collapseLambda({ ...inTrouble, bonkKm: STAGE.collapseSustainedKm + 200 })
    expect(ambas).toBeGreaterThan(STAGE.lambdaCollapseHurt)
  })
})

describe('dureza del recorrido y corte de tiempo', () => {
  it('una llana no acumula desnivel y una reina sí', () => {
    const llana = elevationGainPerKm(sampleProfile({ segments: [{ km: 100, tipo: 'llano' }] }))
    const reina = elevationGainPerKm(
      sampleProfile({
        segments: [
          { km: 85, tipo: 'llano' },
          { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
        ],
      }),
    )
    expect(llana).toBeCloseTo(0, 3)
    // 15 km al 8 % son 1.200 m en 100 km de etapa.
    expect(reina).toBeCloseTo(12, 1)
  })

  it('el corte va del 8% en llana al 18% en la reina, y no se pasa de ahí', () => {
    expect(timeCutFraction(0)).toBeCloseTo(STAGE.timeCutFlat, 6)
    expect(timeCutFraction(STAGE.timeCutHardnessGainPerKm)).toBeCloseTo(STAGE.timeCutQueen, 6)
    expect(timeCutFraction(1000)).toBeCloseTo(STAGE.timeCutQueen, 6)
    expect(timeCutFraction(11)).toBeGreaterThan(STAGE.timeCutFlat)
    expect(timeCutFraction(11)).toBeLessThan(STAGE.timeCutQueen)
  })
})

describe('el corte se aplica CONTRA EL GRUPO, con sus salvaguardas', () => {
  const groups = [
    { size: 100, timeS: 10000 },
    { size: 40, timeS: 10500 },
    { size: 4, timeS: 12000 },
    { size: 2, timeS: 13000 },
  ]

  it('no elimina a nadie si todos llegan dentro del límite', () => {
    const out = applyTimeCut(groups, 20000, 10)
    expect(out).toEqual({ eliminated: [], readmitted: [] })
  })

  it('elimina los grupos que llegan fuera, empezando por el más lento', () => {
    const out = applyTimeCut(groups, 11000, 10)
    expect(out.eliminated).toEqual([2, 3])
    expect(out.readmitted).toEqual([])
  })

  it('el grupo entero cae o se salva junto: no hay corredor suelto eliminado', () => {
    // El grupo 1 son 40 corredores a 10.500 s. Con el límite en 10.400 caen los 40 o ninguno.
    const out = applyTimeCut(groups, 10400, 100)
    expect(out.eliminated).toEqual([1, 2, 3])
  })

  it('lo que no cabe en el tope se READMITE con penalización, no se elimina', () => {
    // Tope de 5: caben los 2 del último grupo y los 4 del anterior serían 6. El de 4 no cabe.
    const out = applyTimeCut(groups, 11000, 5)
    expect(out.eliminated).toEqual([3])
    expect(out.readmitted).toEqual([2])
  })

  it('un grupo NUMEROSO fuera de control se readmite entero (la regla real)', () => {
    const out = applyTimeCut(groups, 10400, 6)
    // Los 2 más lentos y los 4 siguientes caben en el tope de 6; los 40 del grupo 1, no.
    expect(out.eliminated).toEqual([2, 3])
    expect(out.readmitted).toEqual([1])
  })

  it('con el tope agotado no se elimina a nadie más', () => {
    const out = applyTimeCut(groups, 11000, 0)
    expect(out.eliminated).toEqual([])
    expect(out.readmitted).toEqual([2, 3])
  })
})

describe('la lesión que saca de la vuelta', () => {
  it('una lesión (leve o grave) te saca; un rasguño, no', () => {
    expect(injuryEndsRace('major', 30)).toBe(true)
    expect(injuryEndsRace('minor', 6)).toBe(true)
    expect(injuryEndsRace('scratches', 4)).toBe(false)
    expect(injuryEndsRace('none', 0)).toBe(false)
  })

  it('…pero una baja larga saca igual, sea cual sea la etiqueta', () => {
    expect(injuryEndsRace('scratches', STAGE.abandonInjuryDays)).toBe(true)
  })
})
