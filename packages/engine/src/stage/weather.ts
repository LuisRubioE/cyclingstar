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
import { CLIMA_REFERENCIA, climateOf } from '../world/climate.js'
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
 * Sin `lugar` —los escenarios sintéticos del banco, un campo de pruebas— sale el clima de REFERENCIA
 * (`CLIMA_REFERENCIA`): la media anual de un sitio templado, con la frecuencia de lluvia de la v41.
 * No vale `climateOf(undefined, 0)`, que parece lo mismo y no lo es: el día 0 es pleno invierno, así
 * que una etapa sin sitio se corría a 8° y en enero.
 */
export function stageWeather(seed: string, lugar?: WeatherPlace): StageWeather {
  const rng = stageRng(seed)('clima')
  const clima = lugar ? climateOf(lugar.pais, lugar.dia) : CLIMA_REFERENCIA
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
  const clima = lugar ? climateOf(lugar.pais, lugar.dia) : CLIMA_REFERENCIA
  // Cuánto se ve: 1 el mismo día y cayendo con los días, hasta el suelo de «solo sé la climatología».
  const fiabilidad = clamp(1 - dias / STAGE.forecastHorizonDays, STAGE.forecastFloor, 1)
  const pLluvia = lugar ? clima.pLluvia : STAGE.rainDayProb
  // La climatología, dicha en las mismas unidades que el tiempo real: «llueve tanto por ciento de
  // los días» y «hace la media de la estación».
  const lluvia = clamp(fiabilidad * real.lluvia + (1 - fiabilidad) * pLluvia, 0, 1)
  const grados = fiabilidad * real.grados + (1 - fiabilidad) * clima.temperatura
  return { lluvia, calor: calorDe(grados), grados, fiabilidad }
}

// --- R14 · METEOROLOGÍA CON PREVISIÓN (docs/tactica.md paso 20) -----------------------------------

/**
 * EL PARTE POR SEGMENTOS, que es lo que convierte «el tiempo del día» en «el tiempo de este
 * kilómetro». Hasta la v69 el clima de una etapa era un número por etapa: llovía igual en el km 5 y
 * en el 175, y el viento soplaba de la misma forma durante 180 km. Las dos cosas son falsas y las
 * dos se notan justo donde una etapa se decide.
 */
export interface WeatherSegment {
  /** Desde qué kilómetro rige este trozo del parte. */
  fromKm: number
  lluvia: number
  calor: number
  /** Cuánto aprieta el frío, en [0,1]. 0 por encima de `coldFromC`. */
  frio: number
  /** DE DÓNDE sopla, en vueltas [0,1): 0 es el norte y 0,25 el este. */
  windDir: number
  windKmh: number
}

/** El parte completo de una etapa, con lo fiable que es. */
export interface WeatherPlan {
  /** [0,1]: baja si el parte es de hace días. Es `fiabilidad` de `weatherForecast`, con su nombre. */
  reliability: number
  segments: WeatherSegment[]
}

/** El tiempo AQUÍ Y AHORA: lo que el motor consume bloque a bloque. */
export interface WeatherNow {
  lluvia: number
  calor: number
  frio: number
  /** Cuánto pega de lado, en [0,1]: la componente que rompe una carrera. */
  vientoLateral: number
  /** Cuánto pega de cara, en [−1,1]: +1 de cara pleno, −1 de cola pleno. */
  vientoFrontal: number
  abanicoAbierto: boolean
}

/** El material que un equipo elige antes de salir (R14.4). */
export type StageMaterial = 'lenticular' | 'presion_baja' | 'desarrollo_corto'

/** Cuánto frío «cuenta» a esta temperatura: 0 por encima de `coldFromC`, 1 en `coldFullC`. */
export function frioDe(grados: number): number {
  return clamp((STAGE.coldFromC - grados) / (STAGE.coldFromC - STAGE.coldFullC), 0, 1)
}

/**
 * LA FUERZA DEL VIENTO DEL DÍA, consultable antes de correr la etapa.
 *
 * Es **el mismo primer dígito** del subflujo `viento` que `simulateStage` lleva consumiendo desde la
 * v41, con la misma cuenta: por eso sacarlo aquí no desplaza nada. Lo que cambia en el paso 20 no es
 * el sorteo, es qué se hace con él: hasta hoy este número ERA el viento lateral de toda la etapa, y
 * ahora es el MÓDULO del vector —cuánto sopla—, y el lateral sale de él contra el rumbo del bloque.
 */
export function stageWindStrength(seed: string): number {
  const rng = stageRng(seed)('viento')
  const bruto = Math.pow(rng(), STAGE.windDayShape)
  return bruto < STAGE.windMin ? 0 : (bruto - STAGE.windMin) / (1 - STAGE.windMin)
}

/**
 * EL RUMBO DE LA CARRETERA, tramo a tramo, en vueltas [0,1).
 *
 * **Suposición declarada, no dato.** El recorrido de este juego no tiene geometría: `StageProfile`
 * son kilómetros, pendiente y terreno, y en todo el repositorio no hay un solo rumbo. Pero «la
 * carretera gira» es la mitad de R14 —sin ella el abanico no se cierra nunca y el viento de cara es
 * el mismo durante 180 km—, así que el rumbo se genera determinista por semilla de etapa: se parte
 * de un rumbo cualquiera y cada `roadTurnKm` la carretera gira hasta `roadTurnDeg` a un lado o al
 * otro. No es un bandazo por bloque, que sería ruido; es una carretera.
 *
 * Subflujo NOMINAL propio (`rumbo`, SPEC 6.1): con el interruptor apagado no se tira ni una vez y la
 * etapa sale dígito a dígito como en la v69.
 */
export function roadBearings(seed: string, totalKm: number): number[] {
  const rng = stageRng(seed)('rumbo')
  const tramos = Math.max(1, Math.ceil(totalKm / STAGE.weather.roadTurnKm))
  const out: number[] = []
  // EL RUMBO GENERAL DEL DÍA: una etapa va de una ciudad a otra, y ése es el rumbo que manda.
  const general = rng()
  const tope = STAGE.weather.roadWanderDeg / 360
  let desvio = 0
  for (let i = 0; i < tramos; i++) {
    out.push((general + desvio + 1) % 1)
    /**
     * Y LA CARRETERA VUELVE. Esto era un paseo aleatorio y estaba mal, con la medida delante: con un
     * rumbo que se va donde quiera, **todos** los abanicos acaban cerrándose —medido, `echelonClosedPct`
     * 100 % contra una banda de 30-70—, porque en 180 km de deriva libre siempre aparecen dos
     * kilómetros al abrigo. Una etapa no deriva: sale de un sitio, va a otro y serpentea alrededor de
     * esa línea. Con el desvío acotado a `roadWanderDeg` y tirando de vuelta al rumbo general, un día
     * de viento CRUZADO lo es de principio a fin —y el abanico aguanta hasta meta, que es lo que pasa
     * en Holanda— y uno de viento oblicuo se abre y se cierra, que es lo que pasa en todas partes.
     */
    desvio = Math.max(
      -tope,
      Math.min(
        tope,
        STAGE.weather.roadMeanRevert * desvio + (STAGE.weather.roadTurnDeg / 360) * (2 * rng() - 1),
      ),
    )
  }
  return out
}

/** El rumbo en el kilómetro `km`. Fuera del recorrido vale el del último tramo. */
export function bearingAt(rumbos: number[], km: number): number {
  if (rumbos.length === 0) return 0
  const i = Math.min(rumbos.length - 1, Math.max(0, Math.floor(km / STAGE.weather.roadTurnKm)))
  return rumbos[i]!
}

/**
 * LAS DOS COMPONENTES DEL VIENTO contra el rumbo del bloque (R14.1).
 *
 * `lateral = fuerza·|sin Δ|` y `frontal = fuerza·cos Δ`, con Δ el ángulo entre de dónde sopla y
 * hacia dónde se va. El lateral es el que rompe la carrera —obliga a buscar rebufo en diagonal y ahí
 * la carretera se acaba—; el frontal frena o empuja a todos por igual, y es el que toca la LEY.
 */
export function windComponents(
  fuerza: number,
  windDir: number,
  rumbo: number,
): { lateral: number; frontal: number } {
  const d = 2 * Math.PI * (windDir - rumbo)
  return { lateral: fuerza * Math.abs(Math.sin(d)), frontal: fuerza * Math.cos(d) }
}

/**
 * EL PARTE DE UNA ETAPA, por segmentos y consultable antes de correrla.
 *
 * La fuerza del viento entra como argumento y no se sortea aquí a propósito: `simulateStage` ya la
 * consume del subflujo `viento` en su sitio de siempre, y volver a tirarla dentro la desplazaría.
 * Quien quiera el parte sin correr la etapa tiene `stageWindStrength(seed)`, que da el mismo dígito.
 *
 * Todo lo demás —de dónde sopla, cómo rola y a qué kilómetro entra el agua— sale del subflujo
 * NOMINAL `parte`, nuevo y propio, así que añadirlo no mueve la secuencia de nadie.
 */
export function weatherPlan(
  seed: string,
  lugar: WeatherPlace | undefined,
  totalKm: number,
  fuerzaViento: number,
  diasVista = 0,
): WeatherPlan {
  const rng = stageRng(seed)('parte')
  const dia = stageWeather(seed, lugar)
  const frio = frioDe(dia.grados)
  // DE DÓNDE SOPLA hoy, y cómo rola a lo largo del día: el viento no gira como la carretera, rola.
  let windDir = rng()
  // …Y CUÁNDO ENTRA EL AGUA (R14.2). Un día de lluvia no siempre amanece lloviendo.
  const tarde = dia.lluvia > 0 && rng() < STAGE.weather.rainLateProb
  const kmLluvia = tarde
    ? totalKm *
      (STAGE.weather.rainFromFrac + (STAGE.weather.rainToFrac - STAGE.weather.rainFromFrac) * rng())
    : 0
  const n = Math.max(1, Math.ceil(totalKm / STAGE.weather.segmentKm))
  const segments: WeatherSegment[] = []
  for (let i = 0; i < n; i++) {
    const fromKm = i * STAGE.weather.segmentKm
    segments.push({
      fromKm,
      lluvia: fromKm + STAGE.weather.segmentKm <= kmLluvia ? 0 : dia.lluvia,
      calor: dia.calor,
      frio,
      windDir,
      windKmh: STAGE.weather.windFullKmh * fuerzaViento,
    })
    windDir = (windDir + (STAGE.weather.windVeerDeg / 360) * (2 * rng() - 1) + 1) % 1
  }
  const dias = Math.max(0, Math.round(diasVista))
  const reliability =
    dias === 0 ? 1 : clamp(1 - dias / STAGE.forecastHorizonDays, STAGE.forecastFloor, 1)
  return { reliability, segments }
}

/** El segmento del parte que rige en el kilómetro `km`. */
export function weatherAt(plan: WeatherPlan, km: number): WeatherSegment {
  const i = Math.min(
    plan.segments.length - 1,
    Math.max(0, Math.floor(km / STAGE.weather.segmentKm)),
  )
  return plan.segments[i]!
}

/** El tiempo aquí y ahora: el parte de este kilómetro, resuelto contra el rumbo de este kilómetro. */
export function weatherNow(
  plan: WeatherPlan,
  rumbos: number[],
  km: number,
  abanicoAbierto: boolean,
): WeatherNow {
  const s = weatherAt(plan, km)
  const { lateral, frontal } = windComponents(
    s.windKmh / STAGE.weather.windFullKmh,
    s.windDir,
    bearingAt(rumbos, km),
  )
  return {
    lluvia: s.lluvia,
    calor: s.calor,
    frio: s.frio,
    vientoLateral: lateral,
    vientoFrontal: frontal,
    abanicoAbierto,
  }
}

/** ¿Este lateral ya no da cuneta? Es la puerta con la que un abanico empieza a cerrarse (R14.1). */
export function belowEchelonThreshold(lateral: number): boolean {
  return lateral < STAGE.weather.echelonCloseThreshold
}

/**
 * EL ABANICO SE CIERRA (R14.1, S-324). No por una curva: por `echelonCloseKm` seguidos de carretera
 * al abrigo. A partir de ahí `abanicoAbierto` vuelve a ser falso y los cortados PUEDEN volver —no
 * vuelven por decreto: vuelven si cierran el hueco, que es lo que hace la fila entera rodando—.
 */
export function echelonCloses(kmSeguidosFlojos: number): boolean {
  return kmSeguidosFlojos >= STAGE.weather.echelonCloseKm
}

/**
 * EMPIEZA A LLOVER Y EL EQUIPO DEL MAILLOT SUBE A TODOS SUS HOMBRES (R14.2, S-204). No es un consejo:
 * es el objetivo de colocación de todo el equipo, y se paga mañana (`rainBudgetGain`).
 */
export function rainPlaceTarget(
  objetivo: number,
  lluvia: number,
  defiendeGeneral: boolean,
): number {
  if (!defiendeGeneral || lluvia <= 0) return objetivo
  return Math.min(objetivo, STAGE.weather.rainPlaceTarget)
}

/** Lo que le cuesta mañana al equipo que hoy se pasó la etapa entera delante bajo el agua. */
export function rainBudgetGain(subioAlFrente: boolean): number {
  return subioAlFrente ? STAGE.weather.rainCostGain : 1
}

/**
 * CÓMO BAJA CADA UNO UN PUERTO MOJADO (R14.5). El que lleva la general con colchón baja protegido y
 * cede a propósito; el que necesita ganar baja a tumba abierta y no cede nada. Multiplica lo que el
 * descenso cuesta en segundos, no abre un dado nuevo.
 */
export function descentRisk(tieneColchon: boolean, necesitaGanar: boolean): number {
  if (necesitaGanar) return STAGE.weather.descentRiskMustWin
  return tieneColchon ? STAGE.weather.descentRiskCushion : 1
}

/** EL CALOR ENCARECE EL CIERRE (R14.6): el `roadPrice` de la subasta del frente, que nadie pasaba. */
export function heatRoadPrice(calor: number): number {
  return 1 + (STAGE.weather.calorGain - 1) * clamp(calor, 0, 1)
}

/**
 * EL MATERIAL DEL DÍA (R14.4), en puntos de perfil y con la penalización SIMÉTRICA.
 *
 * Tres opciones y tres días: lenticular con viento, presión baja en el pavé, desarrollo corto en la
 * reina. Acertar da `materialPerfilPoints` en el terreno que corresponda; fallar el parte los quita.
 * Que sea simétrico es lo que convierte la elección en una apuesta —si acertar regalara y fallar
 * fuera neutro, todos elegirían siempre y no habría nada que decidir—.
 */
export function materialPerfilBonus(
  material: StageMaterial | undefined,
  terreno: 'llano' | 'subida' | 'descenso' | 'paves',
  vientoLateral: number,
  lluvia: number,
  climbKm: number,
): number {
  if (material === undefined) return 0
  const p = STAGE.weather.materialPerfilPoints
  switch (material) {
    case 'lenticular':
      if (terreno !== 'llano') return 0
      return vientoLateral >= STAGE.weather.materialWindMin ? p : -p
    case 'presion_baja':
      if (terreno !== 'paves') return 0
      return lluvia >= STAGE.weather.materialRainMin ? p : -p
    case 'desarrollo_corto':
      if (terreno !== 'subida') return 0
      return climbKm >= STAGE.weather.materialClimbKmMin ? p : -p
  }
}
