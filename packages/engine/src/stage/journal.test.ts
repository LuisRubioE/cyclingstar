/**
 * LO QUE EL JOURNAL CUENTA DE LA CARRERA (v13, docs/motor.md §16, docs/balance.md «v13»).
 *
 * El dueño leyó los journals de producción y señaló cuatro cosas; midiéndolos salieron además seis
 * defectos concretos. Los que son del MOTOR —no de la redacción— se sellan aquí:
 *
 * - **B3** un corredor que se dejó ir no puede volver a dejarse ir (medido: 29,6% de los descuelgues
 *   narrados eran repeticiones del mismo corredor).
 * - **B4** «el pelotón concede» no se emite en el km 10, cuando el pelotón sencillamente aún no ha
 *   empezado a trabajar (medido: 54% de las concesiones caían antes del km 25).
 * - **B5** el liderato de la montaña solo se canta si el ganador está ESTRICTAMENTE por delante
 *   (medido: 25% de los lideratos cantados eran empates).
 * - **A2** el parte de «quién tira» dice PARA QUIÉN se tira.
 * - **B6** y sale también en las carreras donde no cuaja ninguna fuga.
 */
import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { STAGE } from '../constants.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { autoStageOrders } from '../world/autoOrders.js'
import { stageSeed } from './rng.js'
import { pullReason, simulateStage } from './simulate.js'
import type { StageInput, StageOrders, StageOutput, StageRider } from './types.js'

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

function orders(o: Partial<StageOrders>): StageOrders {
  return { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false, ...o }
}

function rider(id: string, over: Partial<StageRider> = {}): StageRider {
  return {
    riderId: id,
    eff0: eff(55),
    energy: 100,
    matches: 4,
    tsb: 0,
    orders: orders({}),
    gcDeficitSeconds: 0,
    ...over,
  }
}

/**
 * El campo con el que se mide: catorce equipos de ocho con los roles que reparte `autoStageOrders`,
 * que es exactamente lo que hace el juego con el pelotón NPC (jefe de filas, tren en el llano,
 * baroudeur a la fuga y dos gregarios). Los atributos se derivan del índice para que sea
 * determinista sin RNG. El depósito arranca mermado (70) porque la regla 8 —el agotado se deja ir—
 * solo existe cuando hay agotados: con el tanque lleno no se descuelga nadie y no habría nada que
 * comprobar.
 */
const ATTRS: readonly Attribute[] = [
  'RES',
  'REC',
  'LLA',
  'MON',
  'COL',
  'CRI',
  'SPR',
  'DES',
  'PAV',
  'TAC',
]

function teamField(energy = 70): StageRider[] {
  const riders: StageRider[] = []
  const auto: { riderId: string; attrs: Record<Attribute, number>; teamId: string }[] = []
  for (let t = 0; t < 14; t++) {
    for (let k = 0; k < 8; k++) {
      const id = `r-${t}-${k}`
      const attrs = eff(50)
      for (const a of ATTRS) attrs[a] = 42 + ((t * 7 + k * 13 + a.length * 5) % 34)
      if (k === 0) attrs.SPR = 82
      if (k === 1) {
        attrs.MON = 80
        attrs.COL = 76
      }
      if (k === 2) attrs.TAC = 76
      riders.push(rider(id, { eff0: attrs, energy }))
      auto.push({ riderId: id, attrs, teamId: `t-${t}` })
    }
  }
  const plan = autoStageOrders(auto, { kind: 'reina', timeTrial: false })
  return riders.map((r) => ({ ...r, orders: plan.get(r.riderId) ?? r.orders }))
}

/** Una carrera REAL y dura del calendario: puertos que disputar y un final que administrar. */
function hardRaceInput(raceId = 'race-tramuntana'): StageInput {
  const stage = SEASON_CALENDAR.find((r) => r.id === raceId)?.stages[0]
  if (!stage) throw new Error(`no existe ${raceId}`)
  return { profile: stage.profile, riders: teamField() }
}

const TOTAL_KM = 210

const seeds = Array.from({ length: 12 }, (_, i) =>
  stageSeed({ worldSeed: `journal-${i}`, raceId: 'journal', stageDay: 1, engineVersion: 1 }),
)
const runs: StageOutput[] = seeds.map((s) => simulateStage(hardRaceInput(), s))
const eventsOf = (plantilla: string) =>
  runs.flatMap((r) => r.events.filter((e) => e.plantilla === plantilla))

describe('B3 · un corredor solo se deja ir UNA vez', () => {
  it('ningún `rider_sits_up` repite protagonista dentro de la misma etapa', () => {
    for (const out of runs) {
      const who = out.events
        .filter((e) => e.plantilla === 'rider_sits_up')
        .map((e) => e.protagonistas[0]!)
      expect(new Set(who).size).toBe(who.length)
    }
  })

  it('y el descuelgue sigue existiendo: no se ha arreglado apagándolo', () => {
    expect(eventsOf('rider_sits_up').length).toBeGreaterThan(0)
  })
})

describe('B4 · conceder es una decisión, no el arranque de la carrera', () => {
  it('nunca se concede antes de haber tenido ocasión de perseguir', () => {
    for (const e of eventsOf('peloton_concedes')) {
      expect(e.km).toBeGreaterThanOrEqual(TOTAL_KM * STAGE.concedeMinRouteFrac * 0.95)
    }
  })
})

describe('B5 · el liderato de la montaña, solo si es de verdad', () => {
  it('nunca hay dos coronaciones seguidas cantando el liderato con los mismos puntos', () => {
    for (const out of runs) {
      const koms = out.events.filter((e) => e.plantilla === 'climb_kom' && e.datos?.leads === 1)
      // Con la misma puntuación no puede liderar más de uno: si dos cimas dan los mismos puntos,
      // el segundo en coronarlas empata y no lidera. Lo que se comprueba es que el liderato cantado
      // pertenece siempre a corredores DISTINTOS y creciente en puntos acumulados.
      const acumulado = new Map<string, number>()
      for (const e of out.events.filter((x) => x.plantilla === 'climb_kom')) {
        const id = e.protagonistas[0]!
        acumulado.set(id, (acumulado.get(id) ?? 0) + Number(e.datos?.points ?? 0))
        if (e.datos?.leads !== 1) continue
        const mios = acumulado.get(id)!
        for (const [otro, pts] of acumulado) {
          if (otro !== id) expect(pts).toBeLessThan(mios)
        }
      }
      expect(koms.length).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('A2 · el parte de relevos dice para quién se trabaja', () => {
  it('cada `peloton_pull` trae su motivo', () => {
    const pulls = eventsOf('peloton_pull')
    expect(pulls.length).toBeGreaterThan(0)
    for (const e of pulls) {
      expect(['gregarios', 'tren', 'equipo', 'alianza', 'libre']).toContain(
        String(e.datos!.forKind),
      )
      // Y si hay un jefe de filas, viaja su id: la crónica lo resuelve a nombre, dorsal y bandera.
      if (e.datos!.forKind !== 'libre' && e.datos!.forKind !== 'alianza') {
        expect(typeof e.datos!.forId).toBe('string')
      }
    }
  })

  it('con un campo de equipos, casi nadie tira sin tener para quién', () => {
    const pulls = eventsOf('peloton_pull')
    const libres = pulls.filter((e) => e.datos!.forKind === 'libre').length
    // El «desgastarse a lo wey» del dueño, vigilado con un número y no con un comentario. Medido en
    // la v13: 1,9% de las menciones en el banco de carreras reales con un campo variado, y hasta un
    // 26% en un campo plano como este, donde nadie destaca y el `relayDutyByRole.libre` = 0,6 («sin
    // órdenes concretas: colabora lo normal») basta para meter a un suelto en el turno. Es la
    // conducta MODELADA, no un descuido; el listón vigila que no se dispare.
    //
    // LA MEDIDA SE PARTE EN DOS EN LA v26, y el reparto entre las dos mitades es la razón. El total
    // de este banco pasó a 35,6 % (36 de 101) contra un listón del 35 %, y midiéndolo salieron tres
    // cosas:
    //
    // 1. **No es ruido de muestra**: con 60 semillas en vez de 12 sale 35,8 % (180 de 503).
    // 2. **No es el reparto del trabajo corredor a corredor de la v26.** Ablacionado —devolviendo a
    //    `pullWindow` el `frontEffort` de GRUPO de la v25 y dejando el resto igual— sale **38,0 %**:
    //    la medida nueva lo baja, no lo sube.
    // 3. **Es DÓNDE se tira, y es lo que la tanda ha arreglado.** Los partes «libre» viven todos en
    //    la parte alta de la etapa: **11,7 % antes de los tres cuartos del recorrido y 70,7 % después**
    //    (12,2 % y 69,2 % con 60 semillas). Con la montaña partiendo el pelotón de verdad —el objeto
    //    entero de la v26—, al frente de una reina no quedan equipos: quedan jefes de filas,
    //    baroudeurs y sueltos, y sus gregarios están ya por detrás. Que nadie tire «para alguien» ahí
    //    no es desgastarse a lo wey: es que no queda nadie para quien tirar. (Lo que sí se queda
    //    corto es la ETIQUETA —`pullReason` no tiene una casilla para «tira para sí mismo»—, y eso es
    //    un cambio de contrato del evento, no de este banco.)
    //
    // Así que el listón se pone DONDE de verdad mide lo que dice medir —mientras hay equipos al
    // frente— y queda mucho más apretado que el 35 % de antes; y el total se vigila aparte, solo
    // contra una desbandada.
    const early = pulls.filter((e) => e.km < TOTAL_KM * 0.75)
    const libresEarly = early.filter((e) => e.datos!.forKind === 'libre').length
    expect(libresEarly / early.length).toBeLessThan(0.2)
    expect(libres / pulls.length).toBeLessThan(0.4)
  })

  it('el motivo se deduce solo de las órdenes, sin azar', () => {
    const worksFor = new Map<string, { targetId: string; role: 'gregario' | 'lanzador' }>([
      ['g1', { targetId: 'jefe', role: 'gregario' }],
      ['g2', { targetId: 'jefe', role: 'gregario' }],
      ['l1', { targetId: 'jefe', role: 'lanzador' }],
      ['g3', { targetId: 'otro', role: 'gregario' }],
    ])
    expect(pullReason(['g1', 'g2'], worksFor)).toEqual({
      kind: 'gregarios',
      targetId: 'jefe',
      leaders: 1,
    })
    expect(pullReason(['l1'], worksFor)).toEqual({ kind: 'tren', targetId: 'jefe', leaders: 1 })
    expect(pullReason(['g1', 'l1'], worksFor)).toEqual({
      kind: 'equipo',
      targetId: 'jefe',
      leaders: 1,
    })
    expect(pullReason(['g1', 'g3'], worksFor)).toEqual({ kind: 'alianza', leaders: 2 })
    expect(pullReason(['nadie'], worksFor)).toEqual({ kind: 'libre', leaders: 0 })
  })
})

describe('B6 · una carrera sin fuga también se cuenta', () => {
  it('el parte de relevos no depende de que cuaje la fuga del día', () => {
    // Un campo entero de reservones sin baroudeurs: nadie ataca, así que no hay fuga del día. Antes
    // de la v13 eso dejaba la etapa entera sin un solo parte de «quién tira».
    const riders = teamField().map((r) =>
      r.orders.role === 'cazaetapas' || r.orders.mentality !== 'reservon'
        ? { ...r, orders: orders({ role: 'gregario', targetRiderId: 'r-0-1' }) }
        : r,
    )
    const out = simulateStage(
      { profile: { segments: [{ km: 200, tipo: 'llano' }] }, riders },
      stageSeed({ worldSeed: 'sin-fuga', raceId: 'x', stageDay: 1, engineVersion: 1 }),
    )
    const pulls = out.events.filter((e) => e.plantilla === 'peloton_pull')
    expect(pulls.length).toBeGreaterThan(0)
    // Pero nunca en el arranque: mientras el pelotón va en bloque, «quién tira» no significa nada.
    // O bien la fuga ya está en carretera, o bien se ha hecho un cuarto del recorrido.
    const formed = out.events.find((e) => e.plantilla === 'breakaway_formed')
    for (const e of pulls) {
      const conFuga = formed != null && e.km >= formed.km
      expect(conFuga || e.km >= 200 * STAGE.pullNoBreakRouteFrac).toBe(true)
    }
  })
})
