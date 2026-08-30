/**
 * EL CLIMA DE UN SITIO Y DE UNA FECHA (v42, docs/motor.md §20).
 *
 * El sorteo del clima de una etapa (`stage/simulate.ts`) necesita saber CON QUÉ PROBABILIDAD llueve
 * hoy aquí, y eso no es un número del juego: es geografía y calendario. El dueño lo dijo en una
 * línea —«el clima debería depender del país y del GD»— y tiene toda la razón, porque sin esto
 * llueve igual en Flandes en marzo que en Almería en agosto, que es justo lo contrario de la
 * variedad que un EPIC del clima tiene que dar.
 *
 * El modelo es deliberadamente pequeño y legible: cada país cae en una ZONA climática, y cada zona
 * dice dos cosas —cómo es su mitad fría del año y cómo es su mitad cálida—, con el paso de una a
 * otra por un coseno. Sin tablas mensuales, sin datos meteorológicos reales y sin más precisión de
 * la que el juego puede usar.
 *
 * LO QUE SE SABE QUE ES GRUESO, y queda escrito para que nadie lo confunda con precisión: el país es
 * la única granularidad que hay, y hay países que no caben en una zona —Francia va del Canal al
 * Mediterráneo, Italia de los Alpes a Sicilia—. Para ésos existe `templado`, que es exactamente
 * eso: el promedio de un país que es dos climas. Cuando el calendario sepa la REGIÓN de cada
 * carrera, esto se afina sin tocar nada más.
 */

/** Cómo es una zona climática en su mitad fría y en su mitad cálida del año. */
interface Zona {
  /** Probabilidad de que un día de carrera amanezca con lluvia, en la mitad FRÍA del año. */
  lluviaFria: number
  /** …y en la mitad CÁLIDA. En el Mediterráneo la diferencia es enorme; en el Atlántico, poca. */
  lluviaCalida: number
  /** Temperatura media de la mitad fría, en grados. */
  tempFria: number
  /** …y de la mitad cálida. */
  tempCalida: number
  /** Hemisferio sur: las dos mitades del año van al revés. */
  sur?: boolean
}

const ZONAS = {
  /**
   * El norte marítimo: llueve todo el año y nunca hace calor de verdad. Es el clima de las clásicas
   * —Flandes, Roubaix, Lieja— y la razón de que la primavera del norte se corra con lluvia.
   */
  atlantico: { lluviaFria: 0.38, lluviaCalida: 0.26, tempFria: 6, tempCalida: 19 },
  /** Tierra adentro: inviernos secos y fríos, veranos calurosos con tormenta. */
  continental: { lluviaFria: 0.3, lluviaCalida: 0.22, tempFria: 2, tempCalida: 21 },
  /** El sur: el verano no llueve —de verdad no llueve— y aprieta el calor. */
  mediterraneo: { lluviaFria: 0.28, lluviaCalida: 0.07, tempFria: 11, tempCalida: 27 },
  /** La montaña: húmeda todo el año, con la tormenta de tarde en verano, y siempre fresca. */
  alpino: { lluviaFria: 0.35, lluviaCalida: 0.31, tempFria: 1, tempCalida: 17 },
  /** El norte frío: como el atlántico pero sin verano. */
  nordico: { lluviaFria: 0.34, lluviaCalida: 0.28, tempFria: -2, tempCalida: 17 },
  /** El desierto: no llueve y hace un calor que decide carreras. */
  desertico: { lluviaFria: 0.03, lluviaCalida: 0.01, tempFria: 20, tempCalida: 36 },
  /** El trópico: llueve mucho y siempre, y la temperatura casi no tiene estaciones. */
  tropical: { lluviaFria: 0.34, lluviaCalida: 0.36, tempFria: 22, tempCalida: 26 },
  /** El país que es dos climas: Francia, Italia, Estados Unidos. Ver la nota de arriba. */
  templado: { lluviaFria: 0.32, lluviaCalida: 0.17, tempFria: 8, tempCalida: 23 },
  /** Hemisferio sur, clima seco: enero es verano. */
  austral: { lluviaFria: 0.24, lluviaCalida: 0.15, tempFria: 12, tempCalida: 26, sur: true },
} satisfies Record<string, Zona>

type NombreZona = keyof typeof ZONAS

/**
 * País (ISO alpha-2) -> zona. Están todos los que aparecen hoy en el calendario; lo que no esté cae
 * en `templado`, que es la respuesta honesta para un sitio del que no se sabe nada.
 */
const PAIS_ZONA: Record<string, NombreZona> = {
  // El norte marítimo
  BE: 'atlantico',
  NL: 'atlantico',
  GB: 'atlantico',
  IE: 'atlantico',
  LU: 'atlantico',
  DK: 'atlantico',
  // Tierra adentro
  DE: 'continental',
  PL: 'continental',
  CZ: 'continental',
  SK: 'continental',
  HU: 'continental',
  RO: 'continental',
  BG: 'continental',
  RS: 'continental',
  BA: 'continental',
  HR: 'continental',
  SI: 'continental',
  XK: 'continental',
  AL: 'continental',
  EE: 'continental',
  LT: 'continental',
  AZ: 'continental',
  // El sur
  ES: 'mediterraneo',
  PT: 'mediterraneo',
  GR: 'mediterraneo',
  CY: 'mediterraneo',
  TR: 'mediterraneo',
  MA: 'mediterraneo',
  DZ: 'mediterraneo',
  // La montaña
  CH: 'alpino',
  AT: 'alpino',
  AD: 'alpino',
  // El norte frío
  NO: 'nordico',
  SE: 'nordico',
  FI: 'nordico',
  // El desierto
  AE: 'desertico',
  SA: 'desertico',
  OM: 'desertico',
  // El trópico
  RW: 'tropical',
  BF: 'tropical',
  BJ: 'tropical',
  CM: 'tropical',
  MY: 'tropical',
  TH: 'tropical',
  IN: 'tropical',
  CO: 'tropical',
  EC: 'tropical',
  VE: 'tropical',
  GT: 'tropical',
  MU: 'tropical',
  NC: 'tropical',
  TW: 'tropical',
  // Los que son dos climas
  FR: 'templado',
  IT: 'templado',
  US: 'templado',
  CA: 'templado',
  JP: 'templado',
  KR: 'templado',
  CN: 'templado',
  // Hemisferio sur
  AU: 'austral',
} as const

/** El clima que le toca a una carrera: con qué probabilidad llueve y cuánto calor hace. */
export interface Clima {
  /** Probabilidad de que el día amanezca con lluvia, en [0,1]. */
  pLluvia: number
  /** Temperatura media del día, en grados. */
  temperatura: number
}

/** Día del año en que aprieta el verano en el hemisferio norte (≈ 19 de julio). */
const PICO_VERANO = 200
const DIAS = 365

/**
 * EL CLIMA DE NINGUNA PARTE, que es el que se usa cuando una etapa no dice dónde ni cuándo se corre
 * —los escenarios sintéticos del banco, un campo de pruebas—. Es la MEDIA ANUAL del sitio templado,
 * y está escrito aparte porque la alternativa obvia (`climateOf(undefined, 0)`) no es neutra: el día
 * 0 es pleno invierno, así que un escenario sin sitio se corría siempre a 8° y en enero.
 */
export const CLIMA_REFERENCIA: Clima = {
  pLluvia: (ZONAS.templado.lluviaFria + ZONAS.templado.lluviaCalida) / 2,
  temperatura: (ZONAS.templado.tempFria + ZONAS.templado.tempCalida) / 2,
}

/**
 * El clima de un país en un día del año. `dia` es el día de la temporada, que en este juego ES el
 * día del año (`doy` en el calendario), y por tanto el GD del reloj del mundo.
 */
export function climateOf(pais: string | undefined, dia: number): Clima {
  const zona: Zona = ZONAS[(pais && PAIS_ZONA[pais]) || 'templado']
  // 1 en pleno verano, −1 en pleno invierno. En el hemisferio sur, al revés.
  const pico = zona.sur === true ? PICO_VERANO - DIAS / 2 : PICO_VERANO
  const verano = Math.cos((2 * Math.PI * (dia - pico)) / DIAS)
  // De la mitad fría a la cálida, con el coseno como paso: `verano` = 1 da la cálida entera.
  const mezcla = (frio: number, calido: number): number =>
    frio + (calido - frio) * ((verano + 1) / 2)
  return {
    pLluvia: mezcla(zona.lluviaFria, zona.lluviaCalida),
    temperatura: mezcla(zona.tempFria, zona.tempCalida),
  }
}
