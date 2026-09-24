/**
 * DIRECTORES BOT FALIBLES (docs/tactica.md R24).
 *
 * Es la capa que hace posible que dos equipos con los mismos vatios corran carreras distintas **sin
 * tocar la física**: mismos corredores, mismo viento, **distinto número en la pizarra**.
 *
 * Hoy el pelotón persigue sobre el hueco REAL, medido al centímetro y al instante. En carretera no
 * existe tal cosa: el coche recibe el tiempo con retraso, la pizarra va redondeada a cinco, diez o
 * quince segundos, y el director se equivoca. De ahí sale la frase que el catálogo pide y que el
 * motor no sabe producir: **«de vez en cuando la caza no llega por treinta segundos que nadie tenía
 * apuntados»**.
 *
 * Y es el racimo más peligroso del plan, porque desafina TODAS las cazas. Por eso va entero detrás
 * de su interruptor: apagado, el director ve el hueco exacto, que es el motor de siempre.
 */
import { STAGE } from '../constants.js'
import { seededRng } from '@cyclingstar/shared'
import { clamp } from '../random.js'

/**
 * LO BUENO QUE ES LA DIRECCIÓN DE UN EQUIPO, en [0,1]. Determinista por equipo y carrera: el mismo
 * equipo en la misma carrera ve igual de bien todo el día, que es lo que un director es.
 *
 * **La división no llega hasta aquí**, y hay que decirlo: el diseño pide una base por categoría
 * (WT 0,85 · PRS 0,65 · CON 0,50) y `StageInput` no trae la división de nadie —es dato del mundo, no
 * de la etapa—. Así que de momento la calidad sale de un dado por equipo y carrera con la media del
 * campo; el día que la división viaje en la entrada, esto se centra en su base y el dado se queda
 * como está. Queda escrito para que nadie lo lea como una decisión de diseño.
 */
export function dirQualityOf(teamId: string, seed: string): number {
  const rng = seededRng(`${seed}:dir:${teamId}`)
  // Un dado normal-ish sin tirar de la normal: la media de tres uniformes ya es bastante campana.
  const d = (rng() + rng() + rng()) / 3 - 0.5
  return clamp(STAGE.director.qualityBase + STAGE.director.qualitySd * d * 3.46, 0, 1)
}

/** Cuántos km de retraso lleva el número que el director maneja. */
export function infoLagKm(quality: number): number {
  return STAGE.director.lagBase + STAGE.director.lagQuality * (1 - clamp(quality, 0, 1))
}

/** A cuántos segundos redondea su pizarra. Una pizarra no tiene decimales. */
export function boardRound(quality: number): number {
  if (quality >= 0.8) return 5
  if (quality >= 0.6) return 10
  return 15
}

/** Y cuánto se equivoca además del redondeo. */
export function boardSd(quality: number): number {
  return STAGE.director.sdBase + STAGE.director.errorSlope * (1 - clamp(quality, 0, 1))
}

/**
 * EL NÚMERO DE LA PIZARRA: el hueco que este director **cree** que hay.
 *
 * Tres cosas, en este orden, y cada una es una de las maneras reales de equivocarse: el dato llega
 * viejo (`gapAtrasado`, que se lo da quien llama), se apunta redondeado, y encima se apunta mal.
 *
 * Nunca negativo: una pizarra no dice que la fuga va por detrás.
 */
export function believedGap(gapAtrasado: number, quality: number, ruido: number): number {
  const paso = boardRound(quality)
  const redondeado = Math.round(gapAtrasado / paso) * paso
  return Math.max(0, redondeado + ruido * boardSd(quality))
}

/**
 * LO QUE UN CORREDOR VE DEL ESTADO DE OTRO (R24.5): su depósito, leído **con error**.
 *
 * El ruido depende del que mira, no del mirado: un corredor con TAC 90 lee casi bien y uno con TAC
 * 40 se equivoca el doble. De aquí salen los falsos positivos Y los falsos negativos, y las dos
 * cosas son virtud: media carrera se juega desde el coche mirando caras.
 *
 * El disimulo del que sufre se aplicará como **ensanchamiento del ruido y no como sesgo** cuando
 * R24.5 se complete: un sesgo de un solo signo produce falsos negativos sistemáticos y apagaría
 * precisamente R13.1 sobre la clase de corredor a la que apunta.
 */
export function signalSd(tacObservador: number): number {
  return Math.max(0.05, STAGE.director.signalSdBase - STAGE.director.signalSdPerTac * tacObservador)
}

export function readState(fraccionReal: number, tacObservador: number, ruido: number): number {
  return clamp(fraccionReal + ruido * signalSd(tacObservador), 0, 1)
}

/**
 * OLER LA SANGRE (R13.1, el contrario nº 9 del catálogo): **el día que el maillot cede, sus rivales
 * atacan más**. Hoy atacan menos, porque el mecanismo que existe es «ciego a la identidad del que
 * flaquea» —lo dice su propia regla— y vive solo en el ataque final.
 *
 * Devuelve el multiplicador del apetito: 1 si no se le ve sangre, y hasta 1 + `bloodGain` cuanto
 * peor se le lea EN COMPARACIÓN CON UNO MISMO. Como el que lee es falible, esto se dispara a veces
 * sin motivo y a veces no se dispara habiéndolo: es la mitad de la carrera que se juega mirando
 * caras.
 *
 * ---
 *
 * **LA COMPARACIÓN ES RELATIVA DESDE LA v80, Y NO ES UN REFINAMIENTO: LA ABSOLUTA NO PODÍA
 * DISPARARSE.** El listón era `bloodThreshold` = 0,45 contra la lectura cruda, y medido (60
 * semillas por recorrido, capa apagada) el depósito del maillot al pie del puerto decisivo vale
 * **p05 0,510 · mediana 0,553** en la reina canónica y **p05 0,426 · mediana 0,479** en una reina
 * real de tercera semana: el listón estaba **por debajo del percentil 5** en dos de los tres
 * recorridos. Lo que disparaba la regla no era el estado del líder sino el ERROR DE LECTURA, y se
 * notaba: con la capa encendida cambiaba el ganador en el **57 %** de las etapas sin mover ni un
 * agregado de forma medible (Δ de 0,3σ y 0,6σ, pareado por semilla). La firma de un dado.
 *
 * Subir el listón no era la salida —0,553 contra 0,479 según el recorrido, porque depende de cuánta
 * carretera haya antes del último puerto— y la medida lo confirmó: **lo invariante al recorrido es
 * la DIFERENCIA**. Medida contra el propio depósito del que mira, su mediana vale 0,051 · 0,045 ·
 * 0,054 en los tres recorridos, contra 0,557 · 0,557 · 0,478 de la absoluta.
 *
 * Y la referencia es **el que mira**, no la mediana del pelotón, también por medida: las dos son
 * igual de invariantes en el centro, pero contra uno mismo la dispersión es **el triple** (IQR
 * 0,084-0,115 contra 0,028-0,055) porque es POR OBSERVADOR. El mismo día, unos rivales le ven
 * sangre y otros no —que es literalmente lo que la regla dice querer—, mientras que una mediana del
 * pelotón emite un veredicto único y todos opinan igual.
 *
 * `propia` es EXACTA a propósito: `SelfView` lo es (§3.1) y al rival se le lee con error (R24.5).
 * La regla que sale de ahí es la que un corredor piensa de verdad: **«hoy no es mejor que yo»**.
 */
export function bloodFactor(lectura: number, propia: number): number {
  const delta = lectura - propia
  const m = STAGE.director.bloodMargin
  if (delta > m) return 1
  return 1 + STAGE.director.bloodGain * clamp((m - delta) / STAGE.director.bloodSpan, 0, 1)
}
