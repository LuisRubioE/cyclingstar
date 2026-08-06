import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { STAGE } from '../constants.js'
import { simulateStage, stageTss } from './simulate.js'
import { blockCost } from './physics.js'
import { stageSeed } from './rng.js'
import type { StageInput, StageOrders, StageRider } from './types.js'

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

const orders = (o: Partial<StageOrders>): StageOrders => ({
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
  ...o,
})

function rider(id: string, over: Partial<StageRider>): StageRider {
  return {
    riderId: id,
    eff0: eff(50),
    energy: 100,
    matches: 4,
    tsb: 0,
    orders: orders({}),
    gcDeficitSeconds: 0,
    ...over,
  }
}

/** Una etapa llana de 100 km con una meta volante, un puñado de sprinters y candidatos a fuga. */
function flatStageInput(): StageInput {
  const riders: StageRider[] = []
  // 3 sprinters de nivel.
  for (let i = 0; i < 3; i++) {
    riders.push(
      rider(`spr-${i}`, {
        eff0: eff(55, { SPR: 85, LLA: 70 }),
        orders: orders({ role: 'sprinter', contestSprints: true }),
      }),
    )
  }
  // 4 cazaetapas combativos.
  for (let i = 0; i < 4; i++) {
    riders.push(
      rider(`brk-${i}`, {
        eff0: eff(55, { TAC: 62, LLA: 72 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
  }
  // Relleno del pelotón.
  for (let i = 0; i < 33; i++) {
    riders.push(rider(`pel-${i}`, { eff0: eff(48 + (i % 7)) }))
  }
  return {
    profile: {
      segments: [{ km: 100, tipo: 'llano' }],
      banners: [{ km: 50, tipo: 'meta_volante' }],
    },
    riders,
  }
}

describe('simulateStage — etapa llana (Paso 24)', () => {
  const seed = stageSeed({ worldSeed: 'w', raceId: 'vuelta-test', stageDay: 1, engineVersion: 1 })
  const out = simulateStage(flatStageInput(), seed)

  it('produce una crónica coherente de principio a fin', () => {
    const tipos = out.events.map((e) => e.tipo)
    expect(tipos).toContain('fuga_formada')
    expect(tipos).toContain('meta') // se declara un ganador de etapa
    // Los eventos están ordenados cronológicamente.
    for (let i = 1; i < out.events.length; i++) {
      expect(out.events[i]!.tS).toBeGreaterThanOrEqual(out.events[i - 1]!.tS)
    }
  })

  it('clasifica a los 40 corredores con puestos únicos de 1 a 40', () => {
    expect(out.results).toHaveLength(40)
    const puestos = out.results.map((r) => r.puesto).sort((a, b) => a - b)
    expect(puestos).toEqual(Array.from({ length: 40 }, (_, i) => i + 1))
    // El primero llega antes que el último.
    expect(out.results[0]!.tiempoS).toBeLessThanOrEqual(out.results[39]!.tiempoS)
  })

  it('reparte bonificaciones 10/6/4 a los tres primeros', () => {
    expect(out.results[0]!.bonificacionS).toBe(10)
    expect(out.results[1]!.bonificacionS).toBe(6)
    expect(out.results[2]!.bonificacionS).toBe(4)
    expect(out.results[3]!.bonificacionS).toBe(0)
  })

  it('la meta volante reparte puntos', () => {
    const totalVolante = out.results.reduce((sum, r) => sum + r.puntosVolante, 0)
    expect(totalVolante).toBeGreaterThan(0)
  })

  it('registra el gasto (workUnits) de cada corredor', () => {
    expect(out.workUnits.size).toBe(40)
    for (const units of out.workUnits.values()) expect(units).toBeGreaterThan(0)
  })

  it('es determinista: la misma semilla da el mismo ganador', () => {
    const again = simulateStage(flatStageInput(), seed)
    expect(again.results[0]!.riderId).toBe(out.results[0]!.riderId)
  })
})

// --- Invariantes estructurales del motor (SPEC 6.15, 6.16) ---------------------------------
// La garantía central del motor: con la MISMA semilla, la salida COMPLETA es idéntica bit a bit,
// y sea cual sea el terreno la clasificación es única y completa y no hay magnitudes imposibles.
// Comprobar solo `results[0].riderId` dejaba pasar cualquier no-determinismo en eventos, tiempos,
// gasto o incidentes; por eso aquí se compara el StageOutput entero.

/** Los cuatro terrenos del motor, cada uno con un campo de corredores adecuado. */
function terrainCases(): { name: string; input: StageInput }[] {
  const climbers = (): StageRider[] => {
    const riders: StageRider[] = []
    for (let i = 0; i < 4; i++) {
      riders.push(
        rider(`gc-${i}`, {
          eff0: eff(60, { MON: 82 + i, COL: 78, LLA: 64 }),
          orders: orders({ role: 'lider', contestClimbs: true }),
        }),
      )
    }
    for (let i = 0; i < 5; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(56, { MON: 70 + (i % 4), COL: 68, LLA: 66, TAC: 60 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestClimbs: true }),
        }),
      )
    }
    for (let i = 0; i < 21; i++) {
      riders.push(rider(`pel-${i}`, { eff0: eff(55, { MON: 54 + (i % 10), LLA: 60 }) }))
    }
    return riders
  }
  const rouleurs = (pav: number): StageRider[] =>
    Array.from({ length: 30 }, (_, i) =>
      rider(`r-${i}`, {
        eff0: eff(56, { PAV: pav + (i % 9), LLA: 60 + (i % 7), CRI: 62 + (i % 8) }),
      }),
    )

  return [
    { name: 'llano', input: flatStageInput() },
    {
      name: 'montaña',
      input: {
        profile: {
          segments: [
            { km: 60, tipo: 'llano' },
            { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 8 }] },
          ],
          banners: [{ km: 72, tipo: 'cima' }],
        },
        riders: climbers(),
      },
    },
    {
      name: 'CRI',
      input: {
        profile: { segments: [{ km: 30, tipo: 'llano' }] },
        riders: rouleurs(52),
        timeTrial: true,
      },
    },
    {
      name: 'pavés',
      input: {
        profile: {
          segments: [
            { km: 15, tipo: 'llano' },
            { km: 25, tipo: 'paves', estrellas: 4 },
            { km: 10, tipo: 'llano' },
          ],
        },
        riders: rouleurs(50),
      },
    },
  ]
}

describe.each(terrainCases())('invariantes del motor — $name', ({ name, input }) => {
  const seed = stageSeed({ worldSeed: 'inv', raceId: name, stageDay: 1, engineVersion: 1 })
  const out = simulateStage(input, seed)
  const n = input.riders.length

  it('es determinista: la MISMA semilla da el StageOutput COMPLETO idéntico', () => {
    const again = simulateStage(input, seed)
    // Compara events + results + workUnits + incidents + engineVersion de una vez: cualquier
    // no-determinismo en tiempos, crónica, gasto o incidentes hace fallar este test.
    expect(again).toEqual(out)
  })

  it('clasifica a todos exactamente una vez, con puestos 1..N sin huecos', () => {
    expect(out.results).toHaveLength(n)
    expect(out.results.map((r) => r.puesto)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    const ids = out.results.map((r) => r.riderId)
    expect(new Set(ids).size).toBe(n)
    expect([...ids].sort()).toEqual(input.riders.map((r) => r.riderId).sort())
    for (const r of out.results) expect(r.estado).toBe('finish')
  })

  it('los tiempos son finitos, positivos y no decrecen con el puesto', () => {
    let prev = -Infinity
    for (const r of out.results) {
      expect(Number.isFinite(r.tiempoS)).toBe(true)
      expect(Number.isInteger(r.tiempoS)).toBe(true)
      expect(r.tiempoS).toBeGreaterThan(0)
      expect(r.tiempoS).toBeGreaterThanOrEqual(prev)
      prev = r.tiempoS
    }
  })

  it('el gasto (work) es finito y nunca negativo, y hay uno por corredor', () => {
    expect(out.workUnits.size).toBe(n)
    for (const [id, units] of out.workUnits) {
      expect(Number.isFinite(units), `work de ${id}`).toBe(true)
      expect(units, `work de ${id}`).toBeGreaterThanOrEqual(0)
      expect(stageTss(units)).toBeGreaterThanOrEqual(0)
    }
  })

  it('la crónica avanza en el tiempo y los incidentes son coherentes', () => {
    for (let i = 1; i < out.events.length; i++) {
      expect(out.events[i]!.tS).toBeGreaterThanOrEqual(out.events[i - 1]!.tS)
      expect(out.events[i]!.km).toBeGreaterThanOrEqual(0)
    }
    for (const inc of out.incidents) {
      expect(out.workUnits.has(inc.riderId)).toBe(true)
      expect(inc.perdidaS).toBeGreaterThanOrEqual(0)
      expect(inc.diasBaja).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(inc.diasBaja)).toBe(true)
      expect(inc.km).toBeGreaterThanOrEqual(0)
    }
  })

  it('los puntos de volante y montaña nunca son negativos', () => {
    for (const r of out.results) {
      expect(r.puntosVolante).toBeGreaterThanOrEqual(0)
      expect(r.puntosMontana).toBeGreaterThanOrEqual(0)
      expect(r.bonificacionS).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('energía nunca negativa (SPEC 6.5, 6.7)', () => {
  // El tanque se vacía con `energy = max(0, energy - coste)`, así que basta con garantizar que
  // NINGÚN coste de bloque es negativo (un coste negativo rellenaría el tanque y rompería la
  // erosión). Se barre toda la rejilla de terreno, compromiso y abrigo que usa el motor.
  it('el coste de un bloque nunca es negativo, en ningún terreno ni abrigo', () => {
    const shelters = [STAGE.shelterAlone, STAGE.shelterRelay, STAGE.shelterProtected, 1]
    for (const tipo of ['llano', 'subida', 'descenso', 'paves'] as const) {
      for (let g = -15; g <= 20; g++) {
        for (const estrellas of [0, 1, 2, 3, 4, 5]) {
          for (let c = 0; c <= 1.0001; c += 0.1) {
            for (const shelter of shelters) {
              const cost = blockCost({ tipo, g, estrellas }, c, shelter)
              expect(Number.isFinite(cost)).toBe(true)
              expect(cost).toBeGreaterThanOrEqual(0)
            }
          }
        }
      }
    }
  })

  // Una etapa brutal para un campo flojo: casi todos acaban con el tanque a cero. Aun así el
  // resultado debe seguir siendo una clasificación completa, finita y con gasto no negativo.
  it('una etapa que vacía el tanque sigue dando una clasificación completa y finita', () => {
    const riders = Array.from({ length: 24 }, (_, i) =>
      rider(`w-${i}`, { eff0: eff(34 + (i % 5)), energy: 12, matches: 0 }),
    )
    const seed = stageSeed({ worldSeed: 'bonk', raceId: 'bonk', stageDay: 1, engineVersion: 1 })
    const out = simulateStage(
      {
        profile: {
          segments: [
            { km: 40, tipo: 'puerto', tramos: [{ km: 40, g: 9 }] },
            { km: 20, tipo: 'paves', estrellas: 5 },
          ],
        },
        riders,
      },
      seed,
    )
    expect(out.results).toHaveLength(riders.length)
    expect(out.results.map((r) => r.puesto)).toEqual(
      Array.from({ length: riders.length }, (_, i) => i + 1),
    )
    for (const r of out.results) expect(Number.isFinite(r.tiempoS)).toBe(true)
    for (const units of out.workUnits.values()) {
      expect(Number.isFinite(units)).toBe(true)
      expect(units).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('trabajo de equipo (SPEC 6.18)', () => {
  // Dos sprinters idénticos; solo uno lleva un tren de dos lanzadores que le lanzan en meta.
  function leadOutInput(): StageInput {
    const riders: StageRider[] = []
    for (const id of ['spr-train', 'spr-alone']) {
      riders.push(
        rider(id, {
          eff0: eff(55, { SPR: 82, LLA: 70 }),
          orders: orders({ role: 'sprinter', contestSprints: false }),
        }),
      )
    }
    // Dos lanzadores para spr-train (buen llano para no descolgarse del grupo de meta).
    for (let i = 0; i < 2; i++) {
      riders.push(
        rider(`lead-${i}`, {
          eff0: eff(58, { LLA: 74 }),
          orders: orders({ role: 'lanzador', targetRiderId: 'spr-train' }),
        }),
      )
    }
    for (let i = 0; i < 36; i++) riders.push(rider(`pel-${i}`, { eff0: eff(50 + (i % 6)) }))
    return { profile: { segments: [{ km: 100, tipo: 'llano' }] }, riders }
  }

  it(
    'un sprinter con tren de lanzadores gana la llegada masiva más que uno idéntico sin tren',
    { timeout: 30000 },
    () => {
      let train = 0
      let alone = 0
      for (let s = 0; s < 60; s++) {
        const seed = stageSeed({
          worldSeed: `lo-${s}`,
          raceId: 'lo',
          stageDay: 1,
          engineVersion: 1,
        })
        const out = simulateStage(leadOutInput(), seed)
        const posTrain = out.results.find((r) => r.riderId === 'spr-train')!.puesto
        const posAlone = out.results.find((r) => r.riderId === 'spr-alone')!.puesto
        if (posTrain < posAlone) train++
        else alone++
      }
      // El tren no es garantía (piernas del día, ruido del sprint) pero inclina claramente la balanza.
      expect(train).toBeGreaterThan(alone)
      expect(train).toBeGreaterThanOrEqual(38) // ≳63% de las etapas
    },
  )

  // Dos líderes idénticos; solo uno lleva tres gregarios que le arropan en el pelotón.
  function domestiqueInput(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 3; i++) {
      riders.push(
        rider(`greg-${i}`, { orders: orders({ role: 'gregario', targetRiderId: 'cap-a' }) }),
      )
    }
    for (let i = 0; i < 34; i++) riders.push(rider(`pel-${i}`, { eff0: eff(50 + (i % 6)) }))
    // Los dos capitanes al final del campo: quedan fuera de la fracción que releva (25%), así ambos
    // van protegidos y la única diferencia es la protección extra de los gregarios de cap-a.
    for (const id of ['cap-a', 'cap-b']) {
      riders.push(rider(id, { eff0: eff(62, { LLA: 66 }), orders: orders({ role: 'lider' }) }))
    }
    return { profile: { segments: [{ km: 120, tipo: 'llano' }] }, riders }
  }

  it('un líder arropado por gregarios gasta menos energía que uno idéntico sin equipo', () => {
    const seed = stageSeed({ worldSeed: 'dom', raceId: 'dom', stageDay: 1, engineVersion: 1 })
    const out = simulateStage(domestiqueInput(), seed)
    const workA = out.workUnits.get('cap-a')!
    const workB = out.workUnits.get('cap-b')!
    expect(workA).toBeLessThan(workB)
  })

  // Un escalador fuerte (objetivo) y dos escaladores medianos idénticos; solo uno (mark) marca al fuerte.
  function markInput(): StageInput {
    const riders: StageRider[] = [
      rider('target', { eff0: eff(58, { MON: 82, COL: 78 }), orders: orders({ role: 'lider' }) }),
      rider('mark', {
        eff0: eff(58, { MON: 74, COL: 72 }),
        orders: orders({ role: 'marcador', targetRiderId: 'target' }),
      }),
      rider('free', { eff0: eff(58, { MON: 74, COL: 72 }) }),
    ]
    for (let i = 0; i < 30; i++)
      riders.push(rider(`pel-${i}`, { eff0: eff(54, { MON: 52 + (i % 8) }) }))
    return {
      profile: {
        segments: [
          { km: 120, tipo: 'llano' },
          { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 8 }] },
        ],
        banners: [{ km: 132, tipo: 'cima' }],
      },
      riders,
    }
  }

  it(
    'un marcador se pega a su objetivo en la subida más que un igual que no marca',
    { timeout: 30000 },
    () => {
      let markWith = 0
      let freeWith = 0
      for (let s = 0; s < 60; s++) {
        const seed = stageSeed({
          worldSeed: `mk-${s}`,
          raceId: 'mk',
          stageDay: 1,
          engineVersion: 1,
        })
        const out = simulateStage(markInput(), seed)
        const t = out.results.find((r) => r.riderId === 'target')!.tiempoS
        const mk = out.results.find((r) => r.riderId === 'mark')!.tiempoS
        const fr = out.results.find((r) => r.riderId === 'free')!.tiempoS
        // "Con el objetivo" = a menos de 5 s de su tiempo en meta.
        if (Math.abs(mk - t) <= 5) markWith++
        if (Math.abs(fr - t) <= 5) freeWith++
      }
      // Marcar debe hacer que se quede con el objetivo más a menudo que el corredor idéntico que no marca.
      expect(markWith).toBeGreaterThan(freeWith)
    },
  )
})
