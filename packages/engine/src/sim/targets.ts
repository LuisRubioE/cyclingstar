/**
 * Rangos objetivo del balance (SPEC 6.17): FUENTE ÚNICA DE VERDAD.
 *
 * Antes vivían duplicados —y divergentes— en `sim/cli.ts` y en `sim/invariants.test.ts`: el CLI
 * exigía fuga en llano 2-8% y en montaña 25-45%, el test aceptaba 2-12% y 25-55%, de modo que CI
 * pasaba en verde mientras `pnpm sim` salía en rojo (docs/motor.md §3-bis-h). Ahora los dos leen
 * de aquí: si un rango cambia, cambia para ambos a la vez y no puede volver a divergir.
 *
 * Cada rango lleva su razón. Todo movimiento se anota en docs/balance.md con la medición.
 */

export interface Target {
  /** Etiqueta para el informe de consola. */
  label: string
  min: number
  max: number
  /** Sufijo de unidad en el informe ('%', 's', '' …). */
  unit: string
}

export const TARGETS = {
  /** Etapa llana canónica (`llana-180`). */
  flat: {
    // La fuga es minoría en llano: casi todas se cazan, pero las que se entienden aguantan.
    breakawayWinPct: { label: 'Gana la fuga', min: 2, max: 8, unit: '%' },
    // Con 3 sprinters de nivel, el mejor gana bastantes pero no siempre (piernas del día, tren).
    bestSprinterWinPct: { label: 'Gana el mejor sprinter', min: 30, max: 45, unit: '%' },
    // La caza se cierra dentro de los últimos 25 km, no a 60 ni en el último km.
    catchKmToFinish: { label: 'Captura mediana (km a meta)', min: 8, max: 25, unit: '' },
  },
  /** Etapa reina canónica (`reina-150`). */
  mountain: {
    // En montaña la fuga vive mucho más: el pelotón controla la general, no persigue la etapa.
    breakawayWinPct: { label: 'Gana la fuga (montaña)', min: 25, max: 45, unit: '%' },
    // Brecha 1º-10º del día. Rango en SEGUNDOS, así que depende de cuánto dura el puerto: al
    // corregir la VAM (de 1.940 a 1.560 m/h) el puerto final pasó de 33 a 46 minutos y la MISMA
    // selección relativa (~9% del tiempo de subida) pasó de 171 s a 250 s. Por eso el techo sube
    // de 240 a 300 s: no es que la montaña seleccione más, es que ahora se sube al ritmo real.
    top10GapSeconds: { label: 'Brecha 1º-10º (s)', min: 60, max: 300, unit: '' },
  },
  /** Contrarreloj canónica (`cri-40`). */
  timeTrial: {
    p90MinusP10Seconds: { label: 'Brecha p90-p10 (s)', min: 120, max: 240, unit: '' },
    specialistWinPct: { label: 'Gana un especialista', min: 90, max: 100, unit: '%' },
  },
  /** Erosión al final de etapa (docs/motor.md §VI.1): la tabla de objetivos del Cambio 0. */
  erosion: {
    // Una llana rodada en pelotón no debe erosionar al corredor fresco (mediana del campo).
    flatFresh: { label: 'Erosión mediana, llana en fresco', min: 0, max: 0.02, unit: '' },
    // Una etapa reina sí: el último puerto se paga.
    queenFresh: { label: 'Erosión mediana, reina en fresco', min: 0.2, max: 0.5, unit: '' },
    // Y en la tercera semana de una gran vuelta, con el depósito ya mermado, se paga mucho más.
    queenThirdWeek: { label: 'Erosión mediana, reina 3.ª semana', min: 0.6, max: 0.85, unit: '' },
  },
} as const satisfies Record<string, Record<string, Target>>
