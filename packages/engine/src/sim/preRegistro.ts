/**
 * LA DIRECCIÓN PRE-REGISTRADA DE CADA BANDA DE SIMULACIÓN (docs/generador.md §13.6 punto 2; paso 9 de
 * §15.11). Escrita en `docs/balance.md` «v87 §0» ANTES de tocar el generador (decisión 30) y copiada
 * aquí tal cual, para que `pnpm sim:pareado` imprima la columna «previsto» y lea «cumple» contra ella.
 *
 * Una remedición que contradice la dirección es una «previsión fallida»: se anota en «v87 §2» con la
 * cifra y la causa, y la banda NO se mueve hasta que el dueño decide (§13.7). Una que va en la
 * dirección prevista se re-sella en `targets.ts` con su comentario.
 */

export type Direccion = 'sube' | 'baja' | 'igual' | 'igual_ruido'

export interface PreRegistro {
  banda: string
  direccion: Direccion
  porQue: string
  /** Intervalo previsto; `sobre` dice si acota el valor nuevo o la diferencia pareada. */
  previsto?: [number, number]
  sobre?: 'nuevo' | 'delta'
  /** «baja o igual» de la tabla de §13.6: también cumple si la diferencia es ruido. */
  oIgual?: true
  /** Por qué no entra en el pareado, si no entra (se remide en el banco de CI). */
  noPareado?: string
}

/**
 * Las claves de `TARGETS` que leen perfiles generados por el calendario (§13.6 punto 2, contadas sobre
 * `targets.ts`): son 20. Toda entrada tiene fila en `PRE_REGISTRO` (lo sella `preRegistro.test.ts`).
 */
export const BANDAS_SOBRE_GENERADO: readonly string[] = [
  'timeTrials.tailPct',
  'timeTrials.worstStagePct',
  'grandTour.abandonPct',
  'grandTour.queenLastGroupPct',
  'abandonCauses.crashPct',
  'abandonCauses.illnessPct',
  'abandonCauses.outOfTimePct',
  'abandonCauses.outOfTimePerTour',
  'smallTours.bestSprinterWinPct',
  'smallTours.sweepPct',
  'smallTours.flatWinnerGroupPct',
  'smallTours.mediaGroups',
  'smallTours.mediaOneGroupPct',
  'smallTours.flatMoveWorstMarginS',
  'smallTours.photoRepeatTopFive',
  'smallTours.worstRacePhotoRepeat',
  'smallTours.sameWinnerPairPct',
  'realQueens.lastGroupPct',
  'realQueens.worstStagePct',
  'calendarQueens.breakawayWinPct',
]

const ESTRELLA = '20 de 21 etapas reales; si se mueven, hay acoplamiento (regla 3)'
const GRAN_VUELTA =
  'se remide en invariantsAbandonos (12 vueltas de race-france): cinco horas de reloj por generador no caben en el techo de 8 h'

/**
 * La tabla de §13.6, en el orden de la tabla de remedición de §15.11 (por coste creciente): reinas
 * reales, cronos, `calendarQueens`, saturación, `smallTours`, coherencia y mundo; y detrás las que no
 * se parean (gran vuelta y erosión sobre perfiles reales, iguales por construcción).
 */
export const PRE_REGISTRO: readonly PreRegistro[] = [
  {
    banda: 'realQueens.lastGroupPct',
    direccion: 'igual_ruido',
    porQue: 'las tres generadas están congeladas por forma (§13.5); solo cambia el dibujo',
  },
  {
    banda: 'realQueens.worstStagePct',
    direccion: 'igual_ruido',
    porQue: 'las tres generadas están congeladas por forma (§13.5); solo cambia el dibujo',
  },
  {
    banda: 'timeTrials.tailPct',
    direccion: 'sube',
    porQue: 'et_crono con cota de hasta 3 km (sección 5); D3 mete prólogo y cronoescalada',
    previsto: [0, 0.5],
    sobre: 'delta',
  },
  {
    banda: 'timeTrials.worstStagePct',
    direccion: 'igual',
    porQue: 'la cota de et_crono no mueve la peor crono',
  },
  {
    banda: 'calendarQueens.breakawayWinPct',
    direccion: 'baja',
    porQue:
      'sin reinas generadas bajo 1.500 m, la muestra queda casi sin la cubeta que gana la fuga (43,8 %); D6: [6; 30] se mantiene como vigilancia',
    previsto: [5, 10],
    sobre: 'nuevo',
  },
  {
    banda: 'calendarQueens.porCubeta',
    direccion: 'igual',
    porQue: 'monótona decreciente con el desnivel: es física del motor (1 = monótona)',
  },
  {
    banda: 'saturacion.ochoMasDuras',
    direccion: 'igual',
    porQue:
      'V5 impide el final de 9 a 15 km que saturaba; el conjunto cambia (nacionales por circuito) y se lista',
    previsto: [0, 0],
    sobre: 'nuevo',
  },
  {
    banda: 'smallTours.mediaGroups',
    direccion: 'sube',
    porQue: 'cotas más cerca de meta en et_media_* (real de 0 a 59 km contra 26 a 68 en la v86)',
  },
  {
    banda: 'smallTours.mediaOneGroupPct',
    direccion: 'baja',
    porQue: 'la misma razón; en la v86 el campo entero llegaba junto en el 23 %',
  },
  {
    banda: 'smallTours.flatWinnerGroupPct',
    direccion: 'igual',
    porQue: 'et_llana sigue entera con V9',
  },
  {
    banda: 'smallTours.photoRepeatTopFive',
    direccion: 'baja',
    oIgual: true,
    porQue: 'menos llanas seguidas por ARCH.pesosComposicion y ARCH.bloques',
  },
  {
    banda: 'smallTours.worstRacePhotoRepeat',
    direccion: 'baja',
    oIgual: true,
    porQue: 'menos llanas seguidas por ARCH.pesosComposicion y ARCH.bloques',
  },
  {
    banda: 'smallTours.sameWinnerPairPct',
    direccion: 'baja',
    oIgual: true,
    porQue: 'menos llanas seguidas por ARCH.pesosComposicion y ARCH.bloques',
  },
  {
    banda: 'smallTours.bestSprinterWinPct',
    direccion: 'igual',
    porQue: 'depende del campo y del motor, no de la forma de la llana',
  },
  {
    banda: 'smallTours.sweepPct',
    direccion: 'igual',
    porQue: 'depende del campo y del motor, no de la forma de la llana',
  },
  {
    banda: 'smallTours.flatMoveWorstMarginS',
    direccion: 'igual',
    porQue: 'depende del campo y del motor, no de la forma de la llana',
  },
  {
    banda: 'coherencia.jaen',
    direccion: 'igual',
    porQue: 'listón de cero: una contradicción que aflore es del motor y se arregla',
    previsto: [0, 0],
    sobre: 'nuevo',
  },
  {
    banda: 'world.repartoKind',
    direccion: 'igual',
    porQue: 'se anota, sin previsión numérica: ninguna banda de población se toca en E1',
    noPareado: 'se lee en world.test.ts (25 temporadas) contra la tabla kind × raceClass de v87 §1',
  },
  { banda: 'grandTour.abandonPct', direccion: 'igual', porQue: ESTRELLA, noPareado: GRAN_VUELTA },
  {
    banda: 'grandTour.queenLastGroupPct',
    direccion: 'igual',
    porQue: ESTRELLA,
    noPareado: GRAN_VUELTA,
  },
  { banda: 'abandonCauses.crashPct', direccion: 'igual', porQue: ESTRELLA, noPareado: GRAN_VUELTA },
  {
    banda: 'abandonCauses.illnessPct',
    direccion: 'igual',
    porQue: ESTRELLA,
    noPareado: GRAN_VUELTA,
  },
  {
    banda: 'abandonCauses.outOfTimePct',
    direccion: 'igual',
    porQue: ESTRELLA,
    noPareado: GRAN_VUELTA,
  },
  {
    banda: 'abandonCauses.outOfTimePerTour',
    direccion: 'igual',
    porQue: ESTRELLA,
    noPareado: GRAN_VUELTA,
  },
  {
    banda: 'erosion.longClassicFresh',
    direccion: 'igual',
    porQue: 'perfil real (Flandes)',
    noPareado: 'perfil real: igual por construcción (invariantsClasicas)',
  },
  {
    banda: 'erosion.hardestClassicFresh',
    direccion: 'igual',
    porQue: 'perfil real (Lombardía)',
    noPareado: 'perfil real: igual por construcción (invariantsClasicas)',
  },
  {
    banda: 'erosion.queenThirdWeek',
    direccion: 'igual',
    porQue: 'perfil real (Francia e18)',
    noPareado: 'perfil real: igual por construcción (invariantsDesgaste)',
  },
]
