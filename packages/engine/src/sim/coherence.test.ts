/**
 * LA RED QUE IMPIDE QUE LA CRÓNICA VUELVA A CONTRADECIRSE (v25).
 *
 * El dueño leyó el diario de Race Jaén, contó doce defectos de coherencia, y la cuenta sobre el
 * mundo entero dijo que no eran de esa carrera: 1079 contradicciones en las 73 etapas con crónica
 * del día de juego 47. Esto es lo que hace que no dependa de que alguien lea un diario y se dé
 * cuenta: la auditoría de `sim/coherence.ts` corriendo sobre los escenarios del banco y muchas
 * semillas, con las CINCO invariantes que Race Jaén rompía.
 *
 * Se mide sobre los eventos CRUDOS del motor y no sobre la crónica de `apps/api`, y es a propósito:
 * lo que se vigila aquí es el contrato del MOTOR. Que la capa de narración sepa apañar un evento
 * incoherente no es excusa para emitirlo —los eventos se congelan en `stage_runs.events` y viven
 * para siempre—. La crónica tiene sus propios tests al lado de su código.
 */
import { describe, expect, it } from 'vitest'
import { simulateStage } from '../stage/simulate.js'
import type { RaceEvent } from '../stage/types.js'
import { type AuditEntry, type DefectKey, auditStage } from './coherence.js'
import {
  type Scenario,
  campaignSeeds,
  flatScenario,
  longClassicScenario,
  queenScenario,
  realRaceScenario,
} from './scenarios.js'

/**
 * Los eventos crudos, en el orden en el que el lector los va a leer: por kilómetro, y dentro del
 * kilómetro por reloj de carrera. Es la MISMA regla de `apps/api/src/chronicle.ts` (v21) reducida a
 * lo que la auditoría necesita; lo que no se replica aquí son las pasadas de narración, porque
 * justamente lo que se quiere vigilar es lo que el motor emite sin que nadie se lo arregle.
 */
function rawChronicle(events: readonly RaceEvent[]): AuditEntry[] {
  return (
    events
      .filter((e) => e.datos?.narra !== 0)
      // …y la única regla de narración que sí se replica: en el kilómetro cero no hay frase de ataque
      // (v21, y por eso `tacticMinAttackKm` = 1). Un movimiento cuya salida el lector no llega a leer
      // tampoco le debe un desenlace, y contarlo aquí sería medir una línea que no existe.
      .filter((e) => !(e.plantilla === 'attack_go' && e.km < 1))
      .map((e) => ({
        km: Math.round(e.km),
        plantilla: e.plantilla,
        riders: e.protagonistas,
        datos: e.datos ?? {},
        tS: e.tS,
      }))
      .sort((a, b) => a.km - b.km || a.tS - b.tS)
      .map(({ km, plantilla, riders, datos }) => ({ km, plantilla, riders, datos }))
  )
}

/**
 * LAS CINCO INVARIANTES DE COHERENCIA, con la clave del medidor que las vigila. Son exactamente las
 * que Race Jaén rompía, y por eso son éstas y no otras:
 *
 * 1. Todo el que aparece en un parte de cabeza ha entrado antes por un evento que lo explique, y
 *    todo el que sale, sale por otro (`frenteSinExplicar`).
 * 2. La captura de la fuga solo nombra a quien estaba delante en el último parte (`cazadaFantasma`).
 * 3. Un movimiento que se abre se cierra (`ataqueSinCerrar`).
 * 4. El liderato de una clasificación no se gana dos veces seguidas (`montanaDosVeces`).
 * 5. Ningún grupo perseguidor de tamaño 1 mientras el pelotón está tirando (`perseguidorDeUno`).
 */
const INVARIANTS: readonly DefectKey[] = [
  'frenteSinExplicar',
  'cazadaFantasma',
  'ataqueSinCerrar',
  'montanaDosVeces',
  'perseguidorDeUno',
]

/**
 * Cuántas contradicciones se toleran POR ETAPA, por invariante. CERO en cuatro de las cinco.
 *
 * En la del arco del ataque, dos, y el motivo está medido y escrito en docs/balance.md «v25»: un
 * evento nombra a TRES protagonistas como mucho, y cuando un intento de cinco se funde con los de
 * delante los tres nombres del desenlace pueden no ser los tres de la salida. El arco existe —la
 * frase de cierre está ahí—, pero el medidor, que solo mira nombres, no puede coserlo. Bajarlo a
 * cero exige que la salida y el desenlace nombren a la misma gente, que es otra tanda.
 *
 * El listón está donde está el motor de hoy: si sube, algo se ha roto.
 */
const TOLERANCE: Partial<Record<DefectKey, number>> = { ataqueSinCerrar: 2 }

/** Una campaña de cuarenta etapas tarda lo que tarda: son cuarenta carreras enteras simuladas. */
const TIMEOUT_MS = 120_000

/** Corre un escenario con N semillas y devuelve, por invariante, el PEOR resultado de una etapa. */
function worstPerStage(scenario: Scenario, seeds: readonly string[]): Record<string, number> {
  const worst: Record<string, number> = {}
  for (const d of INVARIANTS) worst[d] = 0
  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    const { counts } = auditStage(rawChronicle(out.events))
    for (const d of INVARIANTS) worst[d] = Math.max(worst[d] ?? 0, counts[d])
  }
  return worst
}

describe('coherencia de la crónica (docs/motor.md §16, v25)', () => {
  // Las cuatro formas de etapa que producen relato: la llana donde la fuga es lo único que pasa, la
  // reina donde la carrera se parte, y dos carreras REALES del calendario, que es donde salieron los
  // doce defectos. La crono no entra: no tiene grupos ni movimientos que contradecir.
  const banco: readonly { name: string; scenario: Scenario; seeds: number }[] = [
    { name: 'llana-180', scenario: flatScenario(), seeds: 40 },
    { name: 'reina-150', scenario: queenScenario(), seeds: 40 },
    { name: 'clásica larga (Flandes)', scenario: longClassicScenario(), seeds: 20 },
    { name: 'Race Jaén', scenario: realRaceScenario('race-jaen'), seeds: 40 },
  ]

  for (const caso of banco) {
    it(
      `${caso.name}: ninguna etapa se contradice a sí misma`,
      () => {
        const worst = worstPerStage(caso.scenario, campaignSeeds(caso.name, caso.seeds))
        for (const d of INVARIANTS) {
          expect(`${d}=${worst[d]}`).toBe(`${d}=${Math.min(worst[d] ?? 0, TOLERANCE[d] ?? 0)}`)
        }
      },
      TIMEOUT_MS,
    )
  }

  it(
    'la fuga del día no es el grupo que va delante: la captura nombra a los de delante',
    () => {
      // El caso literal del encargo. Se busca una semilla en la que el grupo de cabeza CAMBIE de gente
      // entre que la fuga se forma y la cazan, y se comprueba que la captura no arrastra la lista
      // congelada del kilómetro en que salió.
      let comprobadas = 0
      const casos = [realRaceScenario('race-jaen'), longClassicScenario(), queenScenario()]
      for (const [i, caso] of casos.entries())
        for (const seed of campaignSeeds(`cazada-${i}`, 30)) {
          const out = simulateStage(caso.input, seed)
          const formed = out.events.find((e) => e.plantilla === 'breakaway_formed')
          const caught = out.events.find((e) => e.plantilla === 'breakaway_caught')
          if (!formed || !caught) continue
          const mismos =
            formed.protagonistas.length === caught.protagonistas.length &&
            formed.protagonistas.every((id) => caught.protagonistas.includes(id))
          if (mismos) continue
          comprobadas += 1
          // Si la lista cambió, el evento tiene que decir de cuántos salió y cuántos quedaban.
          expect(Number(caught.datos?.size ?? 0)).toBe(caught.protagonistas.length)
          expect(Number(caught.datos?.deLos ?? 0)).toBe(formed.protagonistas.length)
        }
      // Y que el caso EXISTE de verdad en el banco: si no se diera nunca, esta prueba no estaría
      // comprobando nada. Es el caso del encargo —la fuga cambia de gente por el camino— y sale.
      expect(comprobadas).toBeGreaterThan(0)
    },
    TIMEOUT_MS,
  )

  it(
    'el boquete se mide contra el grueso de la carrera, nunca contra un corredor suelto',
    () => {
      // Invariante 5, mirado de frente y sobre la etapa del encargo: ningún parte de ventaja se da
      // contra un grupo de uno mientras hay un pelotón detrás.
      let partes = 0
      for (const seed of campaignSeeds('boquete', 60)) {
        const out = simulateStage(realRaceScenario('race-jaen').input, seed)
        for (const e of out.events) {
          if (e.plantilla !== 'time_gap') continue
          partes += 1
          const chase = Number(e.datos?.chaseSize ?? 0)
          expect(`km ${Math.round(e.km)} chaseSize=${chase}`).not.toBe(
            `km ${Math.round(e.km)} chaseSize=1`,
          )
        }
      }
      expect(partes).toBeGreaterThan(0)
    },
    TIMEOUT_MS,
  )
})
