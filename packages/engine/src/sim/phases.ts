/**
 * BANCO DE LAS FASES (R19, docs/tactica.md paso 5). Mide las cuatro estadísticas con las que el
 * diseño define «hecho» para este racimo, y todas cuentan lo mismo: **si la carrera sigue viva
 * después del primer cuarto de hora**.
 *
 * El defecto que R19 viene a matar está medido con nombre y apellidos en el propio código que
 * sustituye: Race Almeria e1, «cuatro intentos hasta el km 19 y ni uno más en los 190 restantes».
 * Un contador de tres grupos vivos puesto por encima de toda la capa táctica apagaba la etapa
 * entera en cuanto la carretera se poblaba.
 */
import { STAGE } from '../constants.js'
import { simulateStage } from '../stage/simulate.js'
import type { Scenario } from './scenarios.js'

export interface PhaseStats {
  runs: number
  /** Intentos de movimiento por etapa. */
  attemptsPerStage: number
  /** …y cuántos de ellos caen DESPUÉS del km 100, que es donde el motor se quedaba mudo. */
  attemptsAfterKm100: number
  /** % de capturas seguidas de un contraataque dentro de los 3 km siguientes. */
  counterAfterCatchPct: number
  /** % de etapas ganadas por un movimiento nacido dentro de la ventana del flyer. */
  flyerWinPct: number
  /** Capturas contadas, para saber sobre cuántas se calcula el contraataque. */
  captures: number
  /**
   * EL KM EN QUE NACE LA FUGA DEL DÍA, mediana (R03, paso 6). Es **el guardarraíl de que la rampa de
   * arranque sigue viva**: la aduana nueva podría tirarla por el camino sin que ninguna banda de hoy
   * se enterase, y entonces la fuga del día volvería a concederse en el kilómetro 1 —la regresión que
   * la v39 arregló con el dueño delante («en el 99 % de los casos en el km 1 ataca alguien»)—.
   */
  breakBirthKm: number
  /** Veces que la aduana cambia de opinión sobre un movimiento ya nacido, por etapa (R03.3). */
  customsRevisionsPerStage: number
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0
  const orden = [...valores].sort((a, b) => a - b)
  const mid = Math.floor(orden.length / 2)
  return orden.length % 2 === 0 ? (orden[mid - 1]! + orden[mid]!) / 2 : orden[mid]!
}

/** Corre la campaña y agrega los estadísticos de R19. */
export function analyzePhases(scenario: Scenario, seeds: string[]): PhaseStats {
  const totalKm = scenario.input.profile.segments.reduce((s, seg) => s + seg.km, 0)
  let attempts = 0
  let attemptsLate = 0
  let captures = 0
  let counters = 0
  let flyerWins = 0
  let revisiones = 0
  const nacimientos: number[] = []

  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    const intentos = out.events.filter((e) => e.tipo === 'intento')
    attempts += intentos.length
    attemptsLate += intentos.filter((e) => e.km >= 100).length
    for (const caza of out.events.filter((e) => e.tipo === 'fuga_cazada')) {
      captures += 1
      // La ventana entera de R19.5: `capturaKm` + `contraataqueKm`. No se cuenta el intento del
      // mismo bloque de la captura hacia atrás, porque lo que se mide es la REACCIÓN.
      const ventana = STAGE.phases.capturaKm + STAGE.phases.contraataqueKm
      if (intentos.some((e) => e.km > caza.km && e.km - caza.km <= ventana)) counters += 1
    }
    /**
     * EL FLYER GANADOR. Se cuenta por el kilómetro en que NACIÓ el movimiento —dentro de la ventana
     * de R19.6— y no por quién lo dio: un flyer es un movimiento tardío que llega, y el motor lo
     * marca en el `attack_go` con su `toGo`. Si la etapa la gana un escapado y el último intento
     * nació ahí dentro, ese intento es el que la ganó.
     */
    const ganaFuga = out.events.find((e) => e.tipo === 'meta')?.datos?.fuga === 1
    if (ganaFuga && intentos.some((e) => totalKm - e.km <= STAGE.tacticNoAttackKm)) flyerWins += 1
    const nace = out.events.find((e) => e.tipo === 'fuga_formada')
    if (nace) nacimientos.push(nace.km)
    revisiones += out.customsRevisions
  }

  const runs = seeds.length
  return {
    runs,
    attemptsPerStage: attempts / runs,
    attemptsAfterKm100: attemptsLate / runs,
    counterAfterCatchPct: captures === 0 ? 0 : (100 * counters) / captures,
    flyerWinPct: (100 * flyerWins) / runs,
    captures,
    breakBirthKm: mediana(nacimientos),
    customsRevisionsPerStage: revisiones / runs,
  }
}
