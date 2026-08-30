/**
 * EL TIEMPO QUE VA A HACER, Y EL QUE DICEN QUE VA A HACER (v42, docs/motor.md §20).
 *
 * El clima de una etapa se sorteaba dentro de `simulateStage` y se quedaba ahí, así que solo existía
 * cuando la etapa ya se había corrido. Y el dueño pidió la otra mitad al delegar el EPIC:
 *
 * > «estaría bien también que pueda existir para los ciclistas y managers una PREVISIÓN del clima…
 * > que además puede cambiar, y con eso tomar diferentes decisiones».
 *
 * Para que exista una previsión, el tiempo de una etapa tiene que poder consultarse ANTES de
 * correrla. Y puede, porque nunca dependió de la carrera: sale de la semilla de la etapa y del sitio
 * y la fecha, y las dos cosas se conocen el día que se publica el calendario. Así que el sorteo vive
 * aquí, `simulateStage` lo llama, y cualquiera puede preguntarle al mismo subflujo qué va a pasar.
 *
 * LO QUE HACE HONESTA A UNA PREVISIÓN es que sea la verdad DESENFOCADA hacia la climatología, y no
 * la verdad con ruido encima. A cinco días vista, un parte no es «va a llover un 60 % ± algo»: es
 * «en Flandes en abril llueve un tercio de los días», que es lo que se sabe sin mirar el cielo. A un
 * día, ya es casi el cielo. Por eso la previsión mezcla el valor REAL con la media del sitio y la
 * fecha, con un peso que se cierra según se acerca el día.
 */
import { STAGE } from '../constants.js'
import { climateOf } from '../world/climate.js'
import { clamp } from '../random.js'
import { stageRng } from './rng.js'

/** Dónde y cuándo se corre una etapa: lo único que el clima necesita saber de ella. */
export interface WeatherPlace {
  pais?: string
  /** Día del año (1-365), que en este juego es el día de la temporada y el GD del reloj. */
  dia: number
}

/** El tiempo de una etapa. */
export interface StageWeather {
  /** Cuánto llueve, en [0,1]. 0 es un día seco, que es la mayoría. */
  lluvia: number
  /** Cuánto aprieta el calor, en [0,1]. 0 por debajo de `heatFromC`. */
  calor: number
  /** La temperatura del día, en grados. */
  grados: number
}

/** Cuánto calor «cuenta» a esta temperatura: 0 hasta `heatFromC`, 1 en `heatFullC`. */
function calorDe(grados: number): number {
  return clamp((grados - STAGE.heatFromC) / (STAGE.heatFullC - STAGE.heatFromC), 0, 1)
}

/**
 * EL TIEMPO QUE VA A HACER de verdad. Determinista por (semilla, sitio, fecha) y sin efectos: es la
 * misma cuenta que hacía `simulateStage` y con el mismo subflujo nominal (`clima`, SPEC 6.1), así
 * que sacarla aquí no mueve un solo dígito de ninguna etapa.
 *
 * Sin `lugar` —los escenarios sintéticos del banco, un campo de pruebas— sale el clima de referencia
 * de un sitio templado, que es el comportamiento anterior a que el clima supiera de geografía.
 */
export function stageWeather(seed: string, lugar?: WeatherPlace): StageWeather {
  const rng = stageRng(seed)('clima')
  const clima = climateOf(lugar?.pais, lugar?.dia ?? 0)
  const pLluvia = lugar ? clima.pLluvia : STAGE.rainDayProb
  // El listón NO es una constante sino una consecuencia: se pide la probabilidad local de día
  // lluvioso y se deriva el umbral. Ver `rainDayProb`.
  const umbral = Math.pow(1 - pLluvia, STAGE.rainDayShape)
  const bruta = Math.pow(rng(), STAGE.rainDayShape)
  const lluvia = bruta < umbral ? 0 : (bruta - umbral) / (1 - umbral)
  // El sorteo del calor va DESPUÉS del de la lluvia y no al revés: así el día seco de antes de que
  // existiera el calor sale dígito a dígito, porque el dado de la lluvia es el mismo.
  const grados = clima.temperatura + STAGE.heatDaySpreadC * (2 * rng() - 1)
  return { lluvia, calor: calorDe(grados), grados }
}

/** Un parte meteorológico: lo que se anuncia, con lo fiable que es. */
export interface WeatherForecast extends StageWeather {
  /**
   * Cuánto se parece este parte al tiempo de verdad, en [0,1]. 1 el mismo día —ya no es previsión,
   * es mirar por la ventana— y bajando según se mira más lejos. Va en el parte a propósito: un
   * manager que decide con una previsión tiene derecho a saber cuánto se puede fiar de ella.
   */
  fiabilidad: number
}

/**
 * LO QUE DICEN QUE VA A HACER, a `diasVista` de la etapa.
 *
 * Es la verdad DESENFOCADA hacia la climatología del sitio y la fecha, no la verdad con ruido: a
 * cinco días lo que se anuncia es prácticamente «lo normal aquí en esta época», y a un día es casi
 * el cielo. Esa es la diferencia entre una previsión y un dado, y es la que hace que el parte CAMBIE
 * según se acerca el día —que es lo que el dueño pidió— sin que cambie nunca el tiempo real.
 *
 * El desenfoque no es aleatorio: es determinista por (semilla, días vista), así que consultar el
 * parte dos veces el mismo día da lo mismo, y consultarlo al día siguiente da algo más cercano a la
 * verdad. Un parte que bailara en cada recarga no sería una previsión, sería ruido.
 */
export function weatherForecast(
  seed: string,
  lugar: WeatherPlace | undefined,
  diasVista: number,
): WeatherForecast {
  const real = stageWeather(seed, lugar)
  const dias = Math.max(0, Math.round(diasVista))
  if (dias === 0) return { ...real, fiabilidad: 1 }
  const clima = climateOf(lugar?.pais, lugar?.dia ?? 0)
  // Cuánto se ve: 1 el mismo día y cayendo con los días, hasta el suelo de «solo sé la climatología».
  const fiabilidad = clamp(1 - dias / STAGE.forecastHorizonDays, STAGE.forecastFloor, 1)
  const pLluvia = lugar ? clima.pLluvia : STAGE.rainDayProb
  // La climatología, dicha en las mismas unidades que el tiempo real: «llueve tanto por ciento de
  // los días» y «hace la media de la estación».
  const lluvia = clamp(fiabilidad * real.lluvia + (1 - fiabilidad) * pLluvia, 0, 1)
  const grados = fiabilidad * real.grados + (1 - fiabilidad) * clima.temperatura
  return { lluvia, calor: calorDe(grados), grados, fiabilidad }
}
