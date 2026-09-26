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
 * determinista —desde el paso 9 de E1, estratificado por tipo de final y banda de desnivel (§13.4)—,
 * de modo que la composición sale de un criterio escrito y no de una elección.
 *
 * Puro y determinista: todo sale de `seededRng` y de `stageSeed`, como el resto de la batería.
 */
import { type CalendarRace, SEASON_CALENDAR } from '../routes/calendar.js'
import { type FinalKind, finalKindOf, kmAfterLastClimb } from '../routes/finalKind.js'
import type { RouteSource } from '../routes/grammar/generate.js'
import { dPlusDe } from '../routes/grammar/geometry.js'
import type { SkeletonId } from '../routes/grammar/skeletons.js'
import { STAGE } from '../constants.js'
import { sampleProfile } from '../stage/sample.js'
import { simulateStage } from '../stage/simulate.js'
import { realQueenSetup } from './realQueens.js'

/** Una etapa del calendario con lo único que aquí importa de ella: cuánto sube y cómo acaba. */
export interface CalendarQueen {
  raceId: string
  stageIndex: number
  /**
   * Desnivel positivo acumulado TOTAL, relleno incluido (`dPlusDe`, paso 9, §13.4 punto 2): el que
   * `Skeleton.dPlus` persigue. Hasta la v87 era `desnivelDe`, los bloques `subida`, que son los
   * puertos solos; una misma etapa sube de cubeta lo que pese su relleno (unos 500 a 1.400 m).
   */
  dPlus: number
  /** Los puertos solos (la cuenta de antes, `RouteStats.dPlusBloques`): se imprime al lado. */
  dPlusBloques: number
  /** Km de valle entre la última cota y la meta (`null` si no hay cota: entonces no es reina). */
  kmTrasUltimaCota: number | null
  /** La cubeta de §7.5: `alto` · `cima_cerca` · `valle_corto` · `valle_largo`. */
  finalKind: FinalKind | null
  /** El esqueleto que la dibuja (`null` en las reales) y su origen: sobre qué habla el número. */
  skeleton: SkeletonId | null
  routeSource: RouteSource
}

/**
 * Cuántas etapas corre la muestra (§13.4 punto 1). Hasta el paso 9 era una de cada seis sobre la
 * distribución ordenada, ~27 de 157; ahora es proporcional por estrato y ronda las 30.
 */
const MUESTRA_OBJETIVO = 30

/** El desnivel de los bloques `subida` de un perfil: los puertos solos (`dPlusBloques`). */
function desnivelDe(profile: Parameters<typeof sampleProfile>[0]): number {
  return sampleProfile(profile)
    .filter((b) => b.tipo === 'subida')
    .reduce((acc, b) => acc + (b.g / 100) * STAGE.dx * 1000, 0)
}

/** Todas las etapas reina del calendario, ordenadas de menos a más desnivel. */
export function allCalendarQueens(calendar: CalendarRace[] = SEASON_CALENDAR): CalendarQueen[] {
  const filas: CalendarQueen[] = []
  for (const race of calendar) {
    race.stages.forEach((stage, i) => {
      if (stage.kind !== 'reina' || stage.timeTrial === true) return
      filas.push({
        raceId: race.id,
        stageIndex: i + 1,
        dPlus: dPlusDe(stage.profile),
        dPlusBloques: desnivelDe(stage.profile),
        // La GEOMETRÍA cuesta ≈ 0 —recorrer segmentos, no simular—, así que se calcula sobre todas y
        // no sobre la muestra. Lo caro es el win-rate, no esto.
        kmTrasUltimaCota: kmAfterLastClimb(stage.profile),
        finalKind: finalKindOf(stage.profile),
        skeleton: stage.arch?.skeleton ?? null,
        routeSource: stage.routeSource,
      })
    })
  }
  return filas.sort((a, b) => a.dPlus - b.dPlus || (a.raceId < b.raceId ? -1 : 1))
}

/** Las bandas de desnivel con las que se lee el resultado, porque la dependencia es enorme. */
export const BANDAS_DESNIVEL = [
  { nombre: '<1500', min: 0, max: 1500 },
  { nombre: '1500-2500', min: 1500, max: 2500 },
  { nombre: '2500-3500', min: 2500, max: 3500 },
  { nombre: '>3500', min: 3500, max: Number.POSITIVE_INFINITY },
] as const

const FINAL_KINDS: FinalKind[] = ['alto', 'cima_cerca', 'valle_corto', 'valle_largo']

/** Un estrato de la muestra: `finalKind` × banda de desnivel (§13.4 punto 1). */
export interface Estrato {
  finalKind: FinalKind
  banda: (typeof BANDAS_DESNIVEL)[number]['nombre']
  n: number
  contiene(q: CalendarQueen): boolean
}

/** Los 16 estratos (4 finales × 4 bandas) con cuántas reinas tiene cada uno. */
export function estratos(todas: CalendarQueen[]): Estrato[] {
  return FINAL_KINDS.flatMap((finalKind) =>
    BANDAS_DESNIVEL.map((b) => {
      const contiene = (q: CalendarQueen): boolean =>
        q.finalKind === finalKind && q.dPlus >= b.min && q.dPlus < b.max
      return { finalKind, banda: b.nombre, n: todas.filter(contiene).length, contiene }
    }),
  )
}

/**
 * La muestra ESTRATIFICADA por `finalKind` × banda de desnivel (§13.4 punto 1, paso 9): cuota
 * proporcional con mínimo 1 por estrato no vacío y ~30 en total (el último de cada estrato, que entra
 * siempre, se descuenta del reparto); dentro de cada estrato, ordenado por
 * desnivel, SIEMPRE el primero y el último (así el mínimo y el máximo globales entran) y el resto por
 * rejilla, `i % paso === 0` con `paso = ceil(n / cuota)`. Sin dado: la composición sale de un criterio
 * escrito, como la rejilla de una de cada seis que sustituye, que cambiaba de composición con
 * cualquier generador.
 */
export function calendarQueenSample(todas: CalendarQueen[] = allCalendarQueens()): CalendarQueen[] {
  const total = todas.length
  const poblados = estratos(todas).filter((e) => e.n > 0)
  // El último de cada estrato entra aparte de la rejilla: se descuenta del objetivo para que la muestra
  // quede en ~30 y no en 30 más uno por estrato.
  const reparto = Math.max(poblados.length, MUESTRA_OBJETIVO - poblados.length)
  const muestra: CalendarQueen[] = []
  for (const e of poblados) {
    const suyas = todas.filter((q) => e.contiene(q)) // ya ordenadas por dPlus
    const cuota = Math.max(1, Math.round((reparto * e.n) / total))
    const paso = Math.ceil(e.n / cuota)
    suyas.forEach((q, i) => {
      if (i === 0 || i === e.n - 1 || i % paso === 0) muestra.push(q)
    })
  }
  return muestra.sort((a, b) => a.dPlus - b.dPlus || (a.raceId < b.raceId ? -1 : 1))
}

/** Una fila del informe: cuántas etapas, cuántas carreras y qué % ganó la fuga. */
export interface FilaDeFuga {
  nombre: string
  stages: number
  races: number
  wonFromMovePct: number
}

export interface CalendarQueenStats {
  runsPerStage: number
  stages: number
  races: number
  /** % de etapas ganadas DESDE LA CARRETERA sobre la muestra entera. */
  wonFromMovePct: number
  /** Lo mismo, por banda de desnivel: es como hay que leerlo. */
  porBanda: FilaDeFuga[]
  /** Por `finalKind` y por estrato (paso 9): informativos, sin banda hasta tener σ (§13.7). */
  porFinalKind: FilaDeFuga[]
  porEstrato: FilaDeFuga[]
  /** Desnivel de la muestra, para que se vea sobre qué montaña habla el número. */
  dPlus: { min: number; mediana: number; max: number }
}

/** Corre la muestra entera: cada etapa con N semillas deterministas. */
export function analyzeCalendarQueens(
  runsPerStage: number,
  calendar: CalendarRace[] = SEASON_CALENDAR,
): CalendarQueenStats {
  const todas = allCalendarQueens(calendar)
  const muestra = calendarQueenSample(todas)
  const cuenta = new Map<string, { stages: number; races: number; wins: number }>()
  const suma = (clave: string, w: number): void => {
    const acc = cuenta.get(clave) ?? { stages: 0, races: 0, wins: 0 }
    acc.stages += 1
    acc.races += runsPerStage
    acc.wins += w
    cuenta.set(clave, acc)
  }
  let races = 0
  let wins = 0
  for (const q of muestra) {
    let w = 0
    for (let i = 0; i < runsPerStage; i++) {
      const { input, seed } = realQueenSetup(
        { raceId: q.raceId, stageIndex: q.stageIndex, why: '' },
        i,
        calendar,
        false, // la etapa que trae el calendario, no la congelada del banco de reinas reales
      )
      if (simulateStage(input, seed).events.find((e) => e.tipo === 'meta')?.datos?.fuga === 1)
        w += 1
    }
    races += runsPerStage
    wins += w
    const banda = BANDAS_DESNIVEL.find((b) => q.dPlus >= b.min && q.dPlus < b.max)!
    suma(`banda|${banda.nombre}`, w)
    suma(`final|${q.finalKind ?? 'sin_cota'}`, w)
    suma(`estrato|${q.finalKind ?? 'sin_cota'} × ${banda.nombre}`, w)
  }
  const fila = (clave: string, nombre: string): FilaDeFuga => {
    const acc = cuenta.get(clave) ?? { stages: 0, races: 0, wins: 0 }
    return {
      nombre,
      stages: acc.stages,
      races: acc.races,
      wonFromMovePct: acc.races === 0 ? 0 : (100 * acc.wins) / acc.races,
    }
  }
  const orden = muestra.map((q) => q.dPlus).sort((a, b) => a - b)
  return {
    runsPerStage,
    stages: muestra.length,
    races,
    wonFromMovePct: races === 0 ? 0 : (100 * wins) / races,
    porBanda: BANDAS_DESNIVEL.map((b) => fila(`banda|${b.nombre}`, b.nombre)),
    porFinalKind: FINAL_KINDS.map((k) => fila(`final|${k}`, k)),
    porEstrato: estratos(todas)
      .filter((e) => e.n > 0)
      .map((e) => fila(`estrato|${e.finalKind} × ${e.banda}`, `${e.finalKind} × ${e.banda}`)),
    dPlus: {
      min: orden[0] ?? 0,
      mediana: orden[Math.floor(orden.length / 2)] ?? 0,
      max: orden[orden.length - 1] ?? 0,
    },
  }
}

/**
 * EL REPARTO DE TIPOS DE FINAL DEL CALENDARIO (docs/tactica.md §7.5, paso 0).
 *
 * **Sobre las ~157 a propósito, no sobre la muestra de 27.** Es geometría del perfil y no
 * simulación: recorrer segmentos cuesta lo que cuesta leerlos. Sobre la muestra sistemática, el
 * error típico de una proporción de 0,45 con n = 27 es ≈ 0,096 —**mayor que la tolerancia entera de
 * ±0,08** con la que `queenFinalKindMix` quiere compararse—, así que medirlo ahí no vigilaría: sortearía.
 */
export interface QueenGeometry {
  stages: number
  /** Cuántas de las reinas caen en cada cubeta, y su porcentaje. */
  mix: { kind: FinalKind; stages: number; pct: number }[]
  /** Las que NO tienen cota ninguna: una «reina» sin puerto es un dato del generador, no una etapa. */
  sinCota: number
  /** Km tras la última cota: mediana y p90, que son las dos cifras con banda en §7.5. */
  kmTras: { mediana: number; p90: number; max: number }
}

function cuantil(xs: number[], q: number): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const i = Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))
  return s[i]!
}

export function queenGeometry(queens: CalendarQueen[] = allCalendarQueens()): QueenGeometry {
  const conCota = queens.filter((q) => q.finalKind !== null)
  const kms = conCota.map((q) => q.kmTrasUltimaCota!)
  return {
    stages: queens.length,
    mix: FINAL_KINDS.map((kind) => {
      const n = queens.filter((q) => q.finalKind === kind).length
      return { kind, stages: n, pct: queens.length === 0 ? 0 : (100 * n) / queens.length }
    }),
    sinCota: queens.length - conCota.length,
    kmTras: {
      mediana: cuantil(kms, 0.5),
      p90: cuantil(kms, 0.9),
      max: kms.length === 0 ? 0 : Math.max(...kms),
    },
  }
}
