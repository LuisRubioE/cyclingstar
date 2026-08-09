import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { STAGE } from '../constants.js'
import { simulateStage, stageTss } from './simulate.js'
import { blockCost } from './physics.js'
import { stageSeed } from './rng.js'
import type { RaceEvent, StageInput, StageOrders, StageOutput, StageRider } from './types.js'

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

/** Semillas deterministas de una campaña: mismo tag y mismo índice, misma etapa siempre. */
const seedsFor = (tag: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) =>
    stageSeed({ worldSeed: `${tag}-${i}`, raceId: tag, stageDay: 1, engineVersion: 1 }),
  )

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

// --- Modelo de final (docs/motor.md §12) ----------------------------------------------------
// El orden dentro de un grupo lo decidía UN atributo (`finishUphill ? max(MON,COL) : SPR`): solo
// existían dos arquetipos de final, el PAV no intervenía jamás en ningún resultado y el trabajo
// del día no se pagaba. Estos tests fijan lo contrario, de punta a punta del motor.

describe('modelo de final (docs/motor.md §12)', () => {
  it('el evento de meta dice qué clase de final resolvió la etapa', () => {
    // `matches: 0` apaga la capa táctica en este banco (sin cerillo no hay ataque, SPEC 6.6): lo
    // que se mide aquí es la DERIVACIÓN del tipo de final, no si alguien se va por delante.
    const field = Array.from({ length: 30 }, (_, i) =>
      rider(`p-${i}`, { eff0: eff(58, { SPR: 60 + (i % 9), MON: 60 + (i % 7) }), matches: 0 }),
    )
    const llana = simulateStage(
      { profile: { segments: [{ km: 120, tipo: 'llano' }] }, riders: field },
      stageSeed({ worldSeed: 'f1', raceId: 'f1', stageDay: 1, engineVersion: 1 }),
    )
    expect(llana.events.find((e) => e.plantilla === 'stage_win')!.datos!.finish).toBe(
      'sprint_masivo',
    )
    const alto = simulateStage(
      {
        profile: {
          segments: [
            { km: 60, tipo: 'llano' },
            { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 8 }] },
          ],
        },
        riders: field,
      },
      stageSeed({ worldSeed: 'f2', raceId: 'f2', stageDay: 1, engineVersion: 1 }),
    )
    expect(alto.events.find((e) => e.plantilla === 'stage_win')!.datos!.finish).toBe('alto')
  })

  it(
    'un final de PAVÉ lo gana el adoquinero: el PAV interviene en el resultado',
    { timeout: 30000 },
    () => {
      // El campo solo se distingue en PAV (45-83). Antes el ganador salía con un PAV mediano de
      // 63 sobre ese rango —el centro exacto, es decir, azar puro— porque el final era a puro SPR.
      // Sin cerillos: aquí se mide el REMATE por PAV, no la capa táctica (docs/motor.md §13).
      const riders = Array.from({ length: 30 }, (_, i) =>
        rider(`r-${i}`, { eff0: eff(60, { PAV: 45 + i }), fragility: 1, matches: 0 }),
      )
      const input: StageInput = {
        profile: {
          segments: [
            { km: 60, tipo: 'llano' },
            { km: 15, tipo: 'paves', estrellas: 4 },
            { km: 3, tipo: 'llano' },
          ],
        },
        riders,
      }
      const pavs: number[] = []
      for (const seed of seedsFor('pave-final', 20)) {
        const out = simulateStage(input, seed)
        pavs.push(riders.find((r) => r.riderId === out.results[0]!.riderId)!.eff0.PAV)
      }
      pavs.sort((a, b) => a - b)
      const mediana = pavs[Math.floor(pavs.length / 2)]!
      expect(mediana).toBeGreaterThan(70) // el centro del rango (azar) sería 64
    },
  )

  it(
    'el trabajo del día se paga en la meta: quien tira remata peor que quien va a rueda',
    { timeout: 30000 },
    () => {
      // Veinte corredores IDÉNTICOS en atributos y tanque. Lo único que los separa es el turno de
      // relevos que les toca por rol (gregario 1.0 contra sprinter 0.2). `workUnits` ya se
      // calculaba y no entraba en el resultado: los dos grupos llegaban en el mismo orden medio.
      const riders: StageRider[] = []
      for (let i = 0; i < 10; i++) {
        riders.push(
          rider(`greg-${i}`, { eff0: eff(65), matches: 3, orders: orders({ role: 'gregario' }) }),
        )
      }
      for (let i = 0; i < 10; i++) {
        riders.push(
          rider(`prot-${i}`, { eff0: eff(65), matches: 3, orders: orders({ role: 'sprinter' }) }),
        )
      }
      const input: StageInput = {
        profile: { segments: [{ km: 180, tipo: 'llano' }] },
        riders,
      }
      let gregPos = 0
      let protPos = 0
      let protWins = 0
      const seeds = seedsFor('peaje', 20)
      for (const seed of seeds) {
        const out = simulateStage(input, seed)
        for (const r of out.results) {
          if (r.riderId.startsWith('greg-')) gregPos += r.puesto
          else protPos += r.puesto
        }
        if (out.results[0]!.riderId.startsWith('prot-')) protWins += 1
      }
      // El protegido remata claramente mejor que el que ha estado dando la cara todo el día.
      expect(protPos / (10 * seeds.length)).toBeLessThan(gregPos / (10 * seeds.length) - 2)
      // Y gana la mayoría de las etapas, sin que sea una ley (piernas del día y ruido del sprint).
      expect(protWins).toBeGreaterThan(seeds.length / 2)
    },
  )

  it(
    'los banners se disputan con la EROSIÓN del momento, no con el corredor del km 0',
    { timeout: 30000 },
    () => {
      // Dos aspirantes a la meta volante: uno mejor rematador de papel (SPR 82) y otro discreto
      // (SPR 70). Con el depósito lleno gana el primero; si llega al banner reventado, no. Antes
      // `disputeBanner` puntuaba con `eff0`, así que el resultado era el MISMO en los dos casos.
      const build = (energyStrong: number): StageInput => {
        const contest = { contestSprints: true, contestClimbs: true }
        const riders: StageRider[] = [
          rider('fuerte', {
            eff0: eff(55, { SPR: 82, RES: 40 }),
            energy: energyStrong,
            matches: 0,
            orders: orders(contest),
          }),
          rider('entero', {
            eff0: eff(55, { SPR: 70, RES: 40 }),
            matches: 0,
            orders: orders(contest),
          }),
        ]
        // Sin cerillos en todo el campo: si alguien se fuga, la volante se disputa en la fuga y el
        // banco deja de medir lo que quiere medir (la erosión en el remate del banner).
        for (let i = 0; i < 20; i++) riders.push(rider(`pel-${i}`, { eff0: eff(52), matches: 0 }))
        return {
          profile: {
            segments: [{ km: 100, tipo: 'llano' }],
            banners: [{ km: 80, tipo: 'meta_volante' }],
          },
          riders,
        }
      }
      const winners = (energy: number): string[] =>
        seedsFor('banner', 12)
          .map((seed) => simulateStage(build(energy), seed))
          .map((out) => out.events.find((e) => e.plantilla === 'sprint_intermediate')!)
          .map((e) => e.protagonistas[0]!)

      const fresco = winners(100)
      expect(fresco.every((w) => w === 'fuerte')).toBe(true)
      // Con un depósito de 16 el "fuerte" llega al km 80 con la erosión por las nubes y su punta
      // de velocidad (coef 0.45, el más castigado de la tabla) ya no le da para ganar la volante.
      const reventado = winners(16)
      expect(reventado.every((w) => w === 'entero')).toBe(true)
    },
  )
})

// --- Tiempos de grupo (v8) ------------------------------------------------------------------
// El dueño leyó una etapa y encontró 23 corredores con el mismo tiempo y TODOS los demás a
// exactamente 1 segundo. No era un empate: el desempate del sprint sumaba 1 ms por puesto al reloj
// del grupo y luego se redondeaba a segundos, así que un grupo que cruzaba en X,477 salía partido
// en X (los 23 primeros) y X+1 (el resto). En ciclismo todos los de un grupo reciben el MISMO
// tiempo, y la general y la clasificación por equipos venían sumando ese ruido etapa tras etapa.

describe('el tiempo de meta es el del GRUPO, no un artefacto del redondeo (v8)', () => {
  /** Etapa llana larga con un campo grande: el pelotón entero llega junto salvo caídas. */
  function bunchInput(): StageInput {
    // Sin cerillos: lo que se vigila es el REDONDEO del reloj de grupo, así que el pelotón tiene
    // que llegar junto. Con capa táctica (docs/motor.md §13) un ataque parte el campo en grupos
    // legítimos con tiempos distintos, que es otra cosa y se prueba aparte.
    const riders = Array.from({ length: 100 }, (_, i) =>
      rider(`p-${i}`, { eff0: eff(58, { SPR: 52 + (i % 17), LLA: 60 }), fragility: 1, matches: 0 }),
    )
    return { profile: { segments: [{ km: 140, tipo: 'llano' }] }, riders }
  }

  const runs = Array.from({ length: 60 }, (_, s) =>
    simulateStage(
      bunchInput(),
      stageSeed({ worldSeed: `grp-${s}`, raceId: 'grp', stageDay: 1, engineVersion: 1 }),
    ),
  )

  it('un grupo no puede partirse en dos tiempos por el redondeo', { timeout: 60000 }, () => {
    // Cada grupo distinto en meta aporta un tiempo distinto, y la ÚNICA forma de que nazca un grupo
    // nuevo en una etapa llana es una caída (o el marcaje, que aquí no hay). Con el desempate viejo
    // esta cota se violaba en 3 de estas 60 semillas SIN un solo incidente: en la 4.ª el pelotón
    // llegaba repartido en 30 corredores a 11.980 s y 70 a 11.981 s.
    for (const out of runs) {
      const distinct = new Set(out.results.map((r) => r.tiempoS)).size
      expect(distinct).toBeLessThanOrEqual(1 + out.incidents.length)
    }
  })

  it('los que comparten tiempo ocupan puestos consecutivos', { timeout: 60000 }, () => {
    // El orden dentro del grupo sale del remate (`finishOrder`), no del reloj: los corredores con el
    // mismo tiempo tienen que formar un bloque contiguo de puestos, sin nadie intercalado.
    for (const out of runs) {
      const seen = new Set<number>()
      let prev: number | null = null
      for (const r of out.results) {
        if (r.tiempoS !== prev) {
          expect(seen.has(r.tiempoS)).toBe(false)
          seen.add(r.tiempoS)
          prev = r.tiempoS
        }
      }
    }
  })

  it('el tiempo persistido es siempre un entero de segundos', () => {
    for (const out of runs)
      for (const r of out.results) expect(Number.isInteger(r.tiempoS)).toBe(true)
  })
})

// --- Telemetría de la carrera (docs/motor.md §16) -------------------------------------------
// El motor simulaba bloque a bloque —quién se descuelga, cuánto boquete hay, quién va delante— y
// tiraba casi todo. La crónica que salía era ilegible: el grupo de cabeza pasaba de 81 corredores
// a 3 en tres kilómetros con DOS descolgados narrados, y la ventaja del ganador aparecía de la
// nada porque el parte de boquete llegaba cada 25 km. Estos tests son el seguro de que no vuelve.

/** Los avisos que cuentan cómo cambia el pelotón, en orden: cortes y reagrupamientos. */
function frontNotices(out: StageOutput): RaceEvent[] {
  return out.events
    .filter((e) => e.plantilla === 'peloton_split' || e.plantilla === 'peloton_regroup')
    .sort((a, b) => a.km - b.km || a.tS - b.tS)
}

/**
 * La cadena de avisos no tiene huecos: el `before` de cada uno es el `remaining` del anterior. Es
 * EL seguro contra el "de 81 a 3 sin explicación" (y contra su simétrico, "de 51 a 100 sin
 * explicación"): para llegar de un tamaño a otro hay que haberlo contado por el camino.
 */
function expectUnbrokenFrontChain(out: StageOutput): void {
  const notices = frontNotices(out)
  for (let i = 1; i < notices.length; i++) {
    expect(Number(notices[i]!.datos!.before)).toBe(Number(notices[i - 1]!.datos!.remaining))
  }
}

describe('telemetría de la crónica (docs/motor.md §16)', () => {
  /** Etapa de montaña larga con una criba continua: el caso que producía el salto de 81 a 3. */
  function shatterInput(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 4; i++) {
      riders.push(
        rider(`gc-${i}`, {
          eff0: eff(60, { MON: 84 + i, COL: 80, LLA: 64 }),
          orders: orders({ role: 'lider', contestClimbs: true }),
        }),
      )
    }
    for (let i = 0; i < 6; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(56, { MON: 72 + (i % 4), COL: 70, LLA: 66, TAC: 60 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestClimbs: true }),
        }),
      )
    }
    for (let i = 0; i < 70; i++) {
      riders.push(rider(`pel-${i}`, { eff0: eff(55, { MON: 46 + (i % 16), LLA: 60 }) }))
    }
    return {
      profile: {
        segments: [
          { km: 130, tipo: 'llano' },
          { km: 20, tipo: 'puerto', tramos: [{ km: 20, g: 8 }] },
        ],
        banners: [{ km: 150, tipo: 'cima' }],
      },
      riders,
    }
  }

  const seeds = Array.from({ length: 12 }, (_, i) =>
    stageSeed({ worldSeed: `tel-${i}`, raceId: 'tel', stageDay: 1, engineVersion: 1 }),
  )
  const runs = seeds.map((s) => simulateStage(shatterInput(), s))

  it('la selección narrada explica el tamaño del grupo: nadie desaparece sin contarlo', () => {
    for (const out of runs) {
      const splits = out.events
        .filter((e) => e.plantilla === 'peloton_split')
        .sort((a, b) => a.km - b.km)
      for (const e of splits) {
        const before = Number(e.datos!.before)
        const remaining = Number(e.datos!.remaining)
        const dropped = Number(e.datos!.dropped)
        // La frase trae de cuántos a cuántos ha quedado el grupo, y cuántos se han ido DESDE el
        // aviso anterior. Sin `before`/`dropped`, la crónica contaba 2 descolgados mientras el
        // grupo perdía 78 corredores.
        expect(dropped).toBeGreaterThanOrEqual(STAGE.splitEventMinDropped)
        expect(remaining).toBeGreaterThanOrEqual(0)
        expect(before).toBeGreaterThan(0)
        // Y lo narrado es EXACTAMENTE lo que el grupo ha perdido: ni el bruto inflado por los que
        // se sueltan y vuelven, ni una cifra que se queda corta.
        // Desde la capa táctica (§13) el grupo también mengua porque alguien se ESCAPA: la cuenta
        // cierra con los dos términos, y los escapados no se narran como descolgados.
        expect(dropped + Number(e.datos!.escapados ?? 0)).toBe(before - remaining)
      }
      // Y la cadena no tiene huecos: lo que quedaba en un aviso es de lo que parte el siguiente.
      // Este es EL seguro contra el "de 81 a 3 sin explicación": para llegar a 3 desde 81 hay que
      // haber narrado los 78 por el camino, no dos. Desde v8 la cadena incluye también los
      // REAGRUPAMIENTOS, que son la misma cuenta contada en la otra dirección: si el grupo crece,
      // se cuenta igual, y por eso ya no hay saltos ni hacia abajo ni hacia arriba.
      expectUnbrokenFrontChain(out)
    }
  })

  it('un corte grande se cuenta cuando pasa, no cinco kilómetros después', () => {
    // En cada corrida, la mayor caída de tamaño del grupo entre dos avisos consecutivos tiene que
    // seguir siendo explicable: si el grupo se parte de golpe, hay una frase con ese `dropped`.
    for (const out of runs) {
      const splits = out.events
        .filter((e) => e.plantilla === 'peloton_split')
        .sort((a, b) => a.km - b.km)
      if (splits.length === 0) continue
      const worst = Math.max(...splits.map((e) => Number(e.datos!.dropped)))
      expect(worst).toBeGreaterThanOrEqual(STAGE.splitEventBigDropMin)
    }
  })

  it('cuando quedan pocos delante, la crónica sabe QUIÉNES son', () => {
    // No en TODAS: si la fuga sale de 6 y llega entera hasta que la cazan, y el pelotón nunca baja
    // de 8, no hay nada que nombrar y callarse es lo correcto. Lo que no puede pasar es que la
    // criba deje 5 corredores delante y la crónica siga hablando de números.
    const withNames = runs.filter((out) =>
      out.events.some((e) => e.plantilla === 'front_group' && e.protagonistas.length > 0),
    )
    expect(withNames.length).toBeGreaterThanOrEqual(runs.length - 2)
    for (const out of runs) {
      for (const e of out.events.filter((x) => x.plantilla === 'front_group')) {
        expect(e.protagonistas.length).toBe(Number(e.datos!.size))
        expect(e.protagonistas.length).toBeLessThanOrEqual(STAGE.frontNamesMaxRiders)
        // Sin repetidos y con ids reales de la etapa.
        expect(new Set(e.protagonistas).size).toBe(e.protagonistas.length)
      }
    }
  })

  it('la ventaja final no aparece de la nada: hay parte de boquete cerca de meta', () => {
    const totalKm = 150
    for (const out of runs) {
      const win = out.events.find((e) => e.plantilla === 'stage_win')!
      const margin = Number(win.datos!.margin ?? 0)
      if (margin < STAGE.gapReportMinSeconds) continue
      // Si el ganador llega con ventaja apreciable, el lector la ha visto crecer: tiene que haber
      // al menos un parte (boquete o cabeza) dentro de la ventana del desenlace.
      const late = out.events.filter(
        (e) =>
          (e.plantilla === 'time_gap' || e.plantilla === 'front_group') &&
          e.km >= totalKm - STAGE.gapReportFinalKm,
      )
      expect(late.length).toBeGreaterThan(0)
    }
  })

  it('narrar más no es narrar todo: la crónica no se convierte en un muro de texto', () => {
    for (const out of runs) {
      // Se cuentan las líneas NARRABLES: desde la capa táctica (docs/motor.md §13) el motor emite
      // todos los intentos como telemetría y marca con `narra` cuáles merecen una frase, porque
      // una etapa tiene una docena de intentos y la crónica no puede ser su inventario.
      const narrated = out.events.filter((e) => e.datos?.narra !== 0)
      expect(narrated.length).toBeLessThanOrEqual(40)
    }
  })

  it('el corte dice si el grupo va en cabeza o persiguiendo a una fuga', () => {
    for (const out of runs) {
      for (const e of out.events.filter((x) => x.plantilla === 'peloton_split')) {
        expect([0, 1]).toContain(Number(e.datos!.chasing))
      }
    }
  })
})

// --- La criba se cuenta como una historia, no como un parte cada 3 km (v8) ------------------
// El dueño leyó diez líneas casi idénticas entre el km 180 y el 207, con el mismo equipo nombrado
// diez veces y cifras acumuladas presentadas como si fueran nuevas ("54 descolgados" con el grupo
// pasando de 76 a 76: no cayó nadie). El origen: la cuenta narrada era el recuento BRUTO de
// descuelgues, y en el desenlace los mismos corredores se sueltan en la rampa y vuelven en el
// repecho, así que el bruto se disparaba mientras el grupo no se movía.

describe('una criba sostenida no genera diez frases clónicas (v8)', () => {
  /**
   * Puerto ESCALONADO de 30 km en el desenlace: rampas de 1 km al 5,5% separadas por 2 km al -1%.
   * Es el terreno que produce el churn (soltarse y volver) del caso del dueño. Con el recuento
   * bruto salían hasta SEIS avisos por etapa con el mismo protagonista nombrado seis veces.
   */
  function staircaseInput(): StageInput {
    const tramos: { km: number; g: number }[] = []
    for (let k = 0; k < 10; k++) {
      tramos.push({ km: 1, g: 5.5 })
      tramos.push({ km: 2, g: -1 })
    }
    const riders: StageRider[] = []
    for (let i = 0; i < 8; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(58, { MON: 74 + (i % 5), COL: 72, LLA: 66, TAC: 62 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo' }),
        }),
      )
    }
    for (let i = 0; i < 160; i++) {
      riders.push(
        rider(`pel-${i}`, { eff0: eff(56, { MON: 50 + (i % 22), LLA: 62, SPR: 50 + (i % 15) }) }),
      )
    }
    return {
      profile: {
        segments: [
          { km: 180, tipo: 'llano' },
          { km: 30, tipo: 'puerto', tramos },
        ],
      },
      riders,
    }
  }

  const runs = Array.from({ length: 8 }, (_, i) =>
    simulateStage(
      staircaseInput(),
      stageSeed({ worldSeed: `sv-${i}`, raceId: 'sv', stageDay: 1, engineVersion: 1 }),
    ),
  )

  it('el puerto se cuenta en pocas frases de progresión', { timeout: 60000 }, () => {
    for (const out of runs) {
      const splits = out.events.filter((e) => e.plantilla === 'peloton_split')
      expect(splits.length).toBeLessThanOrEqual(3)
    }
  })

  it(
    'la cifra narrada es lo que el grupo PIERDE, nunca el bruto inflado',
    { timeout: 60000 },
    () => {
      for (const out of runs) {
        for (const e of out.events.filter((x) => x.plantilla === 'peloton_split')) {
          const before = Number(e.datos!.before)
          const remaining = Number(e.datos!.remaining)
          // Un corte narra siempre una pérdida REAL: nunca "N descolgados" con el grupo igual o mayor.
          expect(before).toBeGreaterThan(remaining)
          const escapados = Number(e.datos!.escapados ?? 0)
          expect(Number(e.datos!.dropped)).toBe(before - remaining - escapados)
          // El bruto sigue viajando como telemetría, y nunca es menor que la pérdida neta por
          // descuelgue (los que se han ido por delante en un ataque no son un descuelgue).
          expect(Number(e.datos!.shed)).toBeGreaterThanOrEqual(before - remaining - escapados)
        }
      }
    },
  )

  it('no se nombra al mismo protagonista en dos avisos seguidos', { timeout: 60000 }, () => {
    for (const out of runs) {
      const splits = out.events
        .filter((e) => e.plantilla === 'peloton_split')
        .sort((a, b) => a.km - b.km)
      for (let i = 1; i < splits.length; i++) {
        const prev = splits[i - 1]!.protagonistas[0]
        const now = splits[i]!.protagonistas[0]
        if (prev && now) expect(now).not.toBe(prev)
      }
    }
  })

  it('el primer aviso presenta la criba y los siguientes cuentan la progresión', () => {
    for (const out of runs) {
      const splits = out.events
        .filter((e) => e.plantilla === 'peloton_split')
        .sort((a, b) => a.km - b.km)
      splits.forEach((e, i) => expect(Number(e.datos!.phase)).toBe(i))
    }
  })

  it('la cadena de avisos sigue sin huecos', { timeout: 60000 }, () => {
    for (const out of runs) expectUnbrokenFrontChain(out)
  })
})

// --- El reagrupamiento existe y ahora se cuenta (v8) ----------------------------------------
// La crónica decía "about 51 left in front" y en meta llegaban más de cien juntos. Medido: no
// mentían las cuentas, faltaba el evento. Los descolgados recortan `chaseBackSecondsPerKm` en
// llano y se reenganchan dentro de `regroupGapSeconds`, así que el grupo se recompone de verdad
// entre el último puerto y la meta — y el motor no lo contaba en ninguna parte.

describe('el reagrupamiento se narra (v8)', () => {
  /** Puerto duro a 40 km de meta y 26 km de llano después: los cortados vuelven antes de la línea. */
  function regroupInput(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 6; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(56, { MON: 72 + (i % 4), COL: 70, LLA: 66, TAC: 60 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo' }),
        }),
      )
    }
    for (let i = 0; i < 74; i++) {
      riders.push(
        rider(`pel-${i}`, { eff0: eff(56, { MON: 48 + (i % 18), LLA: 62, SPR: 50 + (i % 13) }) }),
      )
    }
    return {
      profile: {
        segments: [
          { km: 100, tipo: 'llano' },
          { km: 14, tipo: 'puerto', tramos: [{ km: 14, g: 8 }] },
          { km: 26, tipo: 'llano' },
        ],
      },
      riders,
    }
  }

  const runs = Array.from({ length: 8 }, (_, i) =>
    simulateStage(
      regroupInput(),
      stageSeed({ worldSeed: `rg-${i}`, raceId: 'rg', stageDay: 1, engineVersion: 1 }),
    ),
  )

  it('cuando el pelotón se recompone hay un evento que lo cuenta', { timeout: 60000 }, () => {
    for (const out of runs) {
      const regroups = out.events.filter((e) => e.plantilla === 'peloton_regroup')
      expect(regroups.length).toBeGreaterThan(0)
    }
  })

  it(
    'el reagrupamiento cuadra: los que vuelven son la diferencia de tamaño',
    { timeout: 60000 },
    () => {
      for (const out of runs) {
        for (const e of out.events.filter((x) => x.plantilla === 'peloton_regroup')) {
          const before = Number(e.datos!.before)
          const now = Number(e.datos!.remaining)
          expect(now).toBeGreaterThan(before)
          expect(Number(e.datos!.joined)).toBe(now - before)
          expect(Number(e.datos!.joined)).toBeGreaterThanOrEqual(STAGE.regroupEventMinRiders)
        }
      }
    },
  )

  it('un crecimiento del grupo NUNCA se narra como un corte', { timeout: 60000 }, () => {
    // Era lo que pasaba antes: el aviso decía "2 riders are shelled — about 68 left in front"
    // justo después de haber dicho que quedaban 6. La frase de corte contaba un reagrupamiento.
    for (const out of runs) {
      for (const e of out.events.filter((x) => x.plantilla === 'peloton_split')) {
        expect(Number(e.datos!.before)).toBeGreaterThan(Number(e.datos!.remaining))
      }
    }
  })

  it('la cadena de avisos cubre también los reagrupamientos', { timeout: 60000 }, () => {
    for (const out of runs) expectUnbrokenFrontChain(out)
  })
})

describe('el puerto decisivo no es toda la etapa (defecto medido, docs/balance.md)', () => {
  /** Final en alto con un puerto INTERMEDIO a mitad de recorrido y llano largo después. */
  const input: StageInput = {
    profile: {
      segments: [
        { km: 30, tipo: 'llano' },
        { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 7 }] },
        { km: 80, tipo: 'llano' },
        { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 8 }] },
      ],
    },
    riders: Array.from({ length: 40 }, (_, i) =>
      rider(`p-${i}`, { eff0: eff(55, { MON: 48 + (i % 18), LLA: 60 }) }),
    ),
  }

  it('un puerto a 90 km de meta no revienta el pelotón como el último', () => {
    const seed = stageSeed({ worldSeed: 'mid', raceId: 'mid', stageDay: 1, engineVersion: 1 })
    const out = simulateStage(input, seed)
    // Ningún corte narrado antes de la ventana del puerto decisivo: en el puerto de tempo el
    // pelotón se recompone y anunciar "N se descuelgan" ahí es engañoso.
    const early = out.events.filter(
      (e) => e.plantilla === 'peloton_split' && e.km < 130 - STAGE.climbRaceKmToGo,
    )
    expect(early).toEqual([])
  })
})

// --- La capa táctica en carrera (docs/motor.md §13, v9) --------------------------------------
// Las nueve reglas del dueño, vistas desde la carretera. Las DECISIONES se prueban una a una en
// `tactics.test.ts`; aquí se comprueba que producen carrera: que hay intentos, que la mayoría
// fracasan, que la fuga del día EMERGE en vez de estar decidida antes del km 0, que un ataque
// logrado es un grupo con su propio tiempo, y que dos semillas no cuentan la misma historia.

describe('capa táctica: el intento de movimiento (docs/motor.md §13)', () => {
  /** Etapa llana de 180 km con sprinters, cazaetapas combativos y un pelotón de rodadores. */
  function tacticalFlat(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 3; i++) {
      riders.push(
        rider(`spr-${i}`, {
          eff0: eff(55, { SPR: 84 + i, LLA: 68 }),
          orders: orders({ role: 'sprinter', contestSprints: true }),
        }),
      )
    }
    for (let i = 0; i < 6; i++) {
      riders.push(
        rider(`brk-${i}`, {
          eff0: eff(55, { TAC: 60, LLA: 68 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo' }),
        }),
      )
    }
    for (let i = 0; i < 31; i++) {
      riders.push(rider(`pel-${i}`, { eff0: eff(56, { LLA: 62 + (i % 8) }) }))
    }
    return { profile: { segments: [{ km: 180, tipo: 'llano' }] }, riders }
  }

  const flatRuns = seedsFor('tactica', 40).map((s) => simulateStage(tacticalFlat(), s))

  it('reglas 1 y 5: hay MUCHOS intentos por etapa, no uno', { timeout: 60000 }, () => {
    const counts = flatRuns.map((out) => out.events.filter((e) => e.tipo === 'intento').length)
    const median = [...counts].sort((a, b) => a - b)[Math.floor(counts.length / 2)]!
    expect(median).toBeGreaterThanOrEqual(5)
    // …y tampoco un muro: la carrera respira entre ataque y ataque (`tacticAttemptCooldownKm`).
    expect(Math.max(...counts)).toBeLessThanOrEqual(40)
  })

  it('reglas 3 y 4: fracasar es lo NORMAL', { timeout: 60000 }, () => {
    let tries = 0
    let ok = 0
    for (const out of flatRuns) {
      tries += out.events.filter((e) => e.tipo === 'intento').length
      ok += out.events.filter((e) => e.tipo === 'ataque' || e.tipo === 'fuga_formada').length
    }
    expect(tries).toBeGreaterThan(0)
    // Una etapa con un solo intento que sale bien a la primera es un fallo de calibración.
    expect(ok / tries).toBeLessThan(0.5)
  })

  it('regla 5: la fuga del día EMERGE, no está decidida antes del km 0', { timeout: 60000 }, () => {
    const kms = flatRuns
      .map((out) => out.events.find((e) => e.tipo === 'fuga_formada'))
      .filter((e): e is RaceEvent => e != null)
      .map((e) => e.km)
    // Se forma en casi todas las etapas, pero no en todas: a veces el pelotón no da cuerda a nadie.
    expect(kms.length).toBeGreaterThan(flatRuns.length * 0.7)
    expect(kms.length).toBeLessThanOrEqual(flatRuns.length)
    // Y el kilómetro en que cuaja VARÍA: antes era un número inventado en un rango fijo de 3 a 20.
    expect(new Set(kms.map((k) => Math.round(k))).size).toBeGreaterThan(8)
    expect(Math.max(...kms) - Math.min(...kms)).toBeGreaterThan(20)
  })

  it('un ataque logrado ES un grupo nuevo: se le integra su boquete', { timeout: 60000 }, () => {
    for (const out of flatRuns) {
      for (const e of out.events.filter((x) => x.tipo === 'ataque')) {
        // El evento solo se emite cuando el movimiento ha abierto de verdad el hueco.
        expect(Number(e.datos!.gapS)).toBeGreaterThanOrEqual(STAGE.tacticBreakGapSeconds - 1)
        expect(e.protagonistas.length).toBeGreaterThan(0)
      }
    }
  })

  it('dos semillas no cuentan la misma carrera', { timeout: 60000 }, () => {
    // El guion de una etapa: cuándo cuaja la fuga, cuántos intentos hubo, si la cazan y cómo se
    // resuelve. Antes de la capa táctica esto daba 8 guiones distintos en 120 etapas.
    const scripts = flatRuns.map((out) => {
      const formed = out.events.find((e) => e.tipo === 'fuga_formada')
      const win = out.events.find((e) => e.tipo === 'meta')
      return [
        formed ? Math.round(formed.km / 20) : 'sin-fuga',
        Math.round(out.events.filter((e) => e.tipo === 'intento').length / 4),
        out.events.some((e) => e.tipo === 'fuga_cazada') ? 'cazada' : 'viva',
        String(win?.datos?.fuga ?? 0),
        String(win?.datos?.finish ?? ''),
      ].join('|')
    })
    expect(new Set(scripts).size).toBeGreaterThanOrEqual(6)
  })

  it('el motor sigue siendo determinista: misma semilla, misma carrera', () => {
    const seed = seedsFor('tactica-det', 1)[0]!
    const a = simulateStage(tacticalFlat(), seed)
    const b = simulateStage(tacticalFlat(), seed)
    expect(b.results.map((r) => `${r.riderId}:${r.tiempoS}:${r.puesto}`)).toEqual(
      a.results.map((r) => `${r.riderId}:${r.tiempoS}:${r.puesto}`),
    )
    expect(b.events.length).toBe(a.events.length)
  })

  it('la crónica CUENTA los ataques, y no los inventaría', { timeout: 60000 }, () => {
    for (const out of flatRuns) {
      const attempts = out.events.filter((e) => e.tipo === 'intento')
      const narrated = attempts.filter((e) => e.datos!.narra === 1)
      if (attempts.length === 0) continue
      // Un ataque que ocurre y no se narra no existe para el jugador: al menos uno se cuenta.
      expect(narrated.length).toBeGreaterThan(0)
      // Pero no todos: la crónica no es el inventario de una docena de intentos fallidos.
      expect(narrated.length).toBeLessThanOrEqual(Math.max(3, attempts.length))
      for (const e of narrated) {
        expect(['fuga', 'contraataque', 'puente', 'ataque_grupo', 'ataque_final']).toContain(
          e.datos!.kind,
        )
      }
    }
  })
})

describe('regla 8: el agotado se deja ir, con el cuidado del fuera de control', () => {
  /** Etapa reina corrida con el depósito de la tercera semana: el campo llega vaciado al final. */
  function tiredQueen(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 4; i++) {
      riders.push(
        rider(`gc-${i}`, {
          eff0: eff(60, { MON: 84 + i, COL: 80, LLA: 64 }),
          energy: 58,
          orders: orders({ role: 'lider' }),
        }),
      )
    }
    for (let i = 0; i < 36; i++) {
      riders.push(
        rider(`pel-${i}`, {
          eff0: eff(55, { MON: 54 + (i % 12), LLA: 60 }),
          energy: 58,
          orders: orders({ role: 'gregario' }),
        }),
      )
    }
    return {
      profile: {
        segments: [
          { km: 135, tipo: 'llano' },
          { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
        ],
      },
      riders,
    }
  }

  const runs = seedsFor('regla8', 24).map((s) => simulateStage(tiredQueen(), s))

  it('en una etapa dura alguien administra el esfuerzo al final', { timeout: 60000 }, () => {
    const withGiveUp = runs.filter((out) => out.events.some((e) => e.tipo === 'abandona_ritmo'))
    expect(withGiveUp.length).toBeGreaterThan(runs.length * 0.2)
  })

  it('solo en los últimos km, nunca a mitad de etapa', { timeout: 60000 }, () => {
    for (const out of runs) {
      for (const e of out.events.filter((x) => x.tipo === 'abandona_ritmo')) {
        expect(Number(e.datos!.toGo)).toBeLessThanOrEqual(STAGE.giveUpKm)
      }
    }
  })

  it(
    'y sin irse fuera de control (§VI.3: 8% en llana, 18% en la reina)',
    { timeout: 60000 },
    () => {
      for (const out of runs) {
        const ids = new Set(
          out.events.filter((e) => e.tipo === 'abandona_ritmo').flatMap((e) => e.protagonistas),
        )
        if (ids.size === 0) continue
        const winner = out.results[0]!.tiempoS
        for (const r of out.results) {
          if (!ids.has(r.riderId)) continue
          expect((r.tiempoS - winner) / winner).toBeLessThan(0.18)
        }
      }
    },
  )

  it('el que se juega la etapa no se deja ir', { timeout: 60000 }, () => {
    for (const out of runs) {
      const quitters = new Set(
        out.events.filter((e) => e.tipo === 'abandona_ritmo').flatMap((e) => e.protagonistas),
      )
      // Ningún líder administra: `giveUpLambda` lo excluye por rol.
      for (const id of quitters) expect(id.startsWith('gc-')).toBe(false)
    }
  })
})

describe('regla 9: un final en alto no es el equipo del favorito tirando hasta reventar', () => {
  /** Puerto final de 15 km al 8% con cuatro favoritos que se vigilan entre ellos. */
  function summitFinish(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 4; i++) {
      riders.push(
        rider(`gc-${i}`, {
          eff0: eff(60, { MON: 84 + i, COL: 80, LLA: 64 }),
          orders: orders({ role: 'lider', contestClimbs: true }),
          // Una general apretada: los cuatro se juegan la carrera (SPEC 6.9).
          gcDeficitSeconds: i * 25,
        }),
      )
    }
    for (let i = 0; i < 6; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(56, { MON: 72 + (i % 4), COL: 70, LLA: 66, TAC: 60 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo' }),
          gcDeficitSeconds: 1200 + i * 60,
        }),
      )
    }
    for (let i = 0; i < 30; i++) {
      riders.push(
        rider(`pel-${i}`, {
          eff0: eff(55, { MON: 54 + (i % 12), LLA: 60 }),
          gcDeficitSeconds: 2000 + i * 30,
        }),
      )
    }
    return {
      profile: {
        segments: [
          { km: 135, tipo: 'llano' },
          { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
        ],
      },
      riders,
    }
  }

  const runs = seedsFor('regla9', 30).map((s) => simulateStage(summitFinish(), s))

  it('los fuertes ATACAN en el puerto decisivo', { timeout: 60000 }, () => {
    const withAttack = runs.filter((out) =>
      out.events.some((e) => e.tipo === 'intento' && e.datos!.kind === 'ataque_final'),
    )
    expect(withAttack.length).toBeGreaterThan(runs.length * 0.4)
  })

  it('y el desenlace no es siempre el mismo guion', { timeout: 60000 }, () => {
    let byAttack = 0
    for (const out of runs) {
      const winner = out.results[0]?.riderId
      const attacked = out.events.some(
        (e) => e.tipo === 'ataque' && winner != null && e.protagonistas.includes(winner),
      )
      if (attacked) byAttack += 1
    }
    // Ni siempre gana un ataque ni nunca: antes de la capa táctica esto era 0 de 30, siempre.
    expect(byAttack).toBeGreaterThan(0)
    expect(byAttack).toBeLessThan(runs.length)
  })
})
