/**
 * EL BANCO DE LA MONTAÑA QUE DE VERDAD SE CORRE (v44).
 *
 * LA LECCIÓN QUE LO TRAJO, y costó tres afirmaciones mías equivocadas. Investigando por qué «la fuga
 * no gana nunca una etapa de montaña» medí el 0 % una y otra vez, y era falso: la fuga gana el
 * **18,1 %** de las etapas de montaña del calendario. Lo que pasaba es que los dos bancos que usé
 * miden etapas reina elegidas por su **FORMA**, no por su **FRECUENCIA**:
 *
 * - `grandTour` corre las siete reinas de UNA carrera, `race-france`, cuya etapa 20 resulta ser la
 *   más dura de todo el calendario (3.965 m).
 * - `realQueens` elige nueve etapas a mano por forma —finales en alto, finales rodados, el caso de
 *   una regresión— y por construcción está sesgado a lo duro.
 *
 * Los dos son bancos BUENOS y siguen siendo necesarios: contestan «¿se porta bien el motor en cada
 * forma de etapa reina?», que es una pregunta de cobertura. Lo que ninguno contesta es «¿qué le pasa
 * al JUGADOR a lo largo de una temporada?», y ésa depende de con qué frecuencia aparece cada dureza.
 *
 * Y la diferencia no es un matiz: la dependencia del desnivel es brutal —43,8 % de fugas ganadoras
 * por debajo de 1.500 m y 1,6 % por encima de 2.500—, así que decir «la fuga gana X en montaña» sin
 * decir sobre qué desnivel no significa nada.
 *
 * POR QUÉ ESTE BANCO SÍ SE RECALCULA SOLO, al contrario que `realQueens`. Aquél lleva una lista
 * CERRADA a propósito, para que tocar un recorrido no cambie el contenido del banco y se pueda
 * comparar entre versiones. Aquí es al revés y a propósito: la pregunta es «¿qué trae el calendario
 * de HOY?», así que si el calendario cambia, la respuesta debe cambiar. El muestreo es sistemático y
 * determinista —ordenar por desnivel y tomar una de cada `PASO`—, de modo que la composición sale de
 * un criterio escrito y no de una elección.
 *
 * Puro y determinista: todo sale de `seededRng` y de `stageSeed`, como el resto de la batería.
 */
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { STAGE } from '../constants.js'
import { sampleProfile } from '../stage/sample.js'
import { simulateStage } from '../stage/simulate.js'
import { realQueenSetup } from './realQueens.js'

/** Una etapa del calendario con lo único que aquí importa de ella: cuánto sube. */
export interface CalendarQueen {
  raceId: string
  stageIndex: number
  /** Desnivel positivo acumulado, en metros. */
  dPlus: number
}

/** Una de cada seis sobre la distribución ordenada: ~27 etapas de las ~157 que hay. */
const PASO = 6

/** El desnivel positivo de un perfil, sumando pendiente por metro de bloque de subida. */
function desnivelDe(profile: Parameters<typeof sampleProfile>[0]): number {
  return sampleProfile(profile)
    .filter((b) => b.tipo === 'subida')
    .reduce((acc, b) => acc + (b.g / 100) * STAGE.dx * 1000, 0)
}

/** Todas las etapas reina del calendario, ordenadas de menos a más desnivel. */
export function allCalendarQueens(): CalendarQueen[] {
  const filas: CalendarQueen[] = []
  for (const race of SEASON_CALENDAR) {
    race.stages.forEach((stage, i) => {
      if (stage.kind !== 'reina' || stage.timeTrial === true) return
      filas.push({ raceId: race.id, stageIndex: i + 1, dPlus: desnivelDe(stage.profile) })
    })
  }
  return filas.sort((a, b) => a.dPlus - b.dPlus || (a.raceId < b.raceId ? -1 : 1))
}

/**
 * La muestra SISTEMÁTICA: una de cada `PASO` sobre la lista ordenada por desnivel. No es una muestra
 * al azar —no hay dado aquí— sino la rejilla que conserva la forma de la distribución con la
 * vigésima parte del coste.
 */
export function calendarQueenSample(): CalendarQueen[] {
  return allCalendarQueens().filter((_, i) => i % PASO === 0)
}

/** Las bandas de desnivel con las que se lee el resultado, porque la dependencia es enorme. */
export const BANDAS_DESNIVEL = [
  { nombre: '<1500', min: 0, max: 1500 },
  { nombre: '1500-2500', min: 1500, max: 2500 },
  { nombre: '2500-3500', min: 2500, max: 3500 },
  { nombre: '>3500', min: 3500, max: Number.POSITIVE_INFINITY },
] as const

export interface CalendarQueenStats {
  runsPerStage: number
  stages: number
  races: number
  /** % de etapas ganadas DESDE LA CARRETERA sobre la muestra entera. */
  wonFromMovePct: number
  /** Lo mismo, por banda de desnivel: es como hay que leerlo. */
  porBanda: { nombre: string; stages: number; races: number; wonFromMovePct: number }[]
  /** Desnivel de la muestra, para que se vea sobre qué montaña habla el número. */
  dPlus: { min: number; mediana: number; max: number }
}

/** Corre la muestra entera: cada etapa con N semillas deterministas. */
export function analyzeCalendarQueens(runsPerStage: number): CalendarQueenStats {
  const muestra = calendarQueenSample()
  const cuenta = new Map<string, { stages: number; races: number; wins: number }>()
  for (const b of BANDAS_DESNIVEL) cuenta.set(b.nombre, { stages: 0, races: 0, wins: 0 })
  let races = 0
  let wins = 0
  for (const q of muestra) {
    let w = 0
    for (let i = 0; i < runsPerStage; i++) {
      const { input, seed } = realQueenSetup(
        { raceId: q.raceId, stageIndex: q.stageIndex, why: '' },
        i,
      )
      if (simulateStage(input, seed).events.find((e) => e.tipo === 'meta')?.datos?.fuga === 1)
        w += 1
    }
    races += runsPerStage
    wins += w
    const banda = BANDAS_DESNIVEL.find((b) => q.dPlus >= b.min && q.dPlus < b.max)!
    const acc = cuenta.get(banda.nombre)!
    acc.stages += 1
    acc.races += runsPerStage
    acc.wins += w
  }
  const orden = muestra.map((q) => q.dPlus).sort((a, b) => a - b)
  return {
    runsPerStage,
    stages: muestra.length,
    races,
    wonFromMovePct: races === 0 ? 0 : (100 * wins) / races,
    porBanda: BANDAS_DESNIVEL.map((b) => {
      const acc = cuenta.get(b.nombre)!
      return {
        nombre: b.nombre,
        stages: acc.stages,
        races: acc.races,
        wonFromMovePct: acc.races === 0 ? 0 : (100 * acc.wins) / acc.races,
      }
    }),
    dPlus: {
      min: orden[0] ?? 0,
      mediana: orden[Math.floor(orden.length / 2)] ?? 0,
      max: orden[orden.length - 1] ?? 0,
    },
  }
}
