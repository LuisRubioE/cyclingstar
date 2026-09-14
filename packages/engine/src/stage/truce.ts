/**
 * LA CAÍDA COMO SUCESO SOCIAL (R12) Y EL HUNDIMIENTO COMO ESTADO OBSERVABLE (R13),
 * docs/tactica.md paso 12.
 *
 * Los dos racimos comparten una idea y por eso comparten fichero: **lo que pasa en la carretera y lo
 * que el pelotón HACE con lo que pasa son dos cosas distintas**. Hoy el motor tiene la primera —hay
 * caídas, hay montón, hay pájaras— y no tiene la segunda: nadie pide una tregua, nadie la niega,
 * nadie se aparta al ver sufrir a su jefe y el que tira hasta reventar no le pasa el relevo a nadie.
 *
 * R13 **no toca física**: toca lectura. La moneda ya está y está medida —la reserva, el cerillo en
 * segundos, el nivel erosionado, el P75 de la fracción fuerte—; lo que falta es que alguien la MIRE.
 */
import { STAGE } from '../constants.js'
import type { Phase } from './tactics.js'

/** Lo que el pelotón sabe cuando alguien pide una tregua. */
export interface TruceBid {
  phase: Phase
  kmToGo: number
  abanicoAbierto: boolean
  onClimb: boolean
  /** La reputación del que pide (R09). Sin memoria todavía, vale 0 = neutral. */
  goodwill: number
  /** Lo que el mejor situado de la general ganaría si se aprieta ahora, en segundos. */
  mejorGananciaS: number
}

/**
 * LA TREGUA SE PIDE, NO SE DISPARA (R12.2, S-237).
 *
 * «La tregua no la dispara el terreno: la pide alguien, y el pelotón la concede o la niega según
 * quién pida y cómo se portó antes». Las cinco puertas son las que un pelotón de verdad aplica: no
 * se para una carrera que ya se está decidiendo, ni a tres kilómetros de meta, ni en pleno abanico,
 * ni cuesta arriba, ni cuando hay alguien con una ganancia gorda sobre la mesa —eso es la emboscada,
 * y tiene su propia regla—.
 */
export type TruceVerdict =
  'concedida' | 'decisiva' | 'cerca' | 'abanico' | 'cuesta' | 'deuda' | 'emboscada'

/**
 * …Y CUANDO SE NIEGA, **SE DICE POR QUÉ**. No es telemetría de adorno: una tregua negada porque
 * quedaban veinte kilómetros y una negada porque el segundo de la general olió el minuto son dos
 * noticias distintas, y la crónica no puede contarlas igual.
 */
export function truceVerdict(b: TruceBid): TruceVerdict {
  if (b.phase === 'decisivo' || b.phase === 'desenlace') return 'decisiva'
  if (b.kmToGo <= STAGE.truce.minKmToGo) return 'cerca'
  if (b.abanicoAbierto) return 'abanico'
  if (b.onClimb) return 'cuesta'
  if (b.goodwill < 0) return 'deuda'
  if (b.mejorGananciaS >= STAGE.truce.ambushMinGainS) return 'emboscada'
  return 'concedida'
}

export function truceGranted(b: TruceBid): boolean {
  return truceVerdict(b) === 'concedida'
}

/**
 * LA EMBOSCADA (R12.3, S-195): negar la tregua **y apretar** es una decisión explícita de un equipo
 * con la general en juego y su hombre delante. Cuesta reputación y presupuesto, y por eso no pasa
 * todos los días — que es justo lo que la hace una noticia cuando pasa.
 */
export function ambushCommit(): number {
  return STAGE.truce.ambushCommit
}

/** Las cuatro ramas del rescate, cada una con su puerta y su número de hombres. */
export type RescueBranch = 'general' | 'etapa-percance' | 'cota-sprinter' | 'equipos' | null

export interface RescueBid {
  /** Segundos que el jefe lleva perdidos contra el grueso. */
  gapS: number
  /** Leales suyos vivos y en condiciones de bajar. */
  leales: number
  esGcLeader: boolean
  esCartaDeEtapa: boolean
  /** ¿Hubo percance o caída, o es un descuelgue a secas? */
  huboPercance: boolean
  /** ¿Es gran favorito del final de hoy? (`finishRank ≤ 0,15` del campo.) */
  granFavorito: boolean
  /** ¿Se ha descolgado EN UNA COTA, siendo velocista, en etapa que admite llegada agrupada? */
  cotaDeSprinter: boolean
  /** ¿Está vivo el motivo 'equipos' y el rescatado es el TERCER hombre? (R05.5) */
  tercerHombreDeEquipos: boolean
}

/**
 * EL RESCATE, **UNA SOLA FUNCIÓN** (R12.4, S-290/S-198/S-288/S-199).
 *
 * Y que sea una sola es el punto entero de la regla. El diseño tenía TRES puertas de rescate en tres
 * sitios —una que bajaba dos peones por cualquier percance, otra tres «con la puerta levantada» y una
 * tercera que prometía rescatar al tercer hombre sin que ninguna rama lo dejara pasar—, de modo que
 * el guardarraíl medido en su día (6,59 → 0,01 avisos de «el jefe se queda solo») quedaba abierto por
 * dos sitios que ni siquiera lo citaban.
 *
 * Si no se cumple NINGUNA de las cuatro, **no baja nadie**. Ésa es la parte que no se generaliza.
 */
export function rescueBranch(b: RescueBid): RescueBranch {
  if (b.leales < 1) return null
  if (b.esGcLeader && b.gapS >= STAGE.regroupGapSeconds) return 'general'
  if (
    b.esCartaDeEtapa &&
    b.huboPercance &&
    b.granFavorito &&
    b.gapS <= STAGE.helpBackStageGapSeconds
  ) {
    return 'etapa-percance'
  }
  // La COTA es la causa, así que aquí no hace falta percance: al velocista lo descuelga el puerto.
  if (b.cotaDeSprinter && b.gapS <= STAGE.truce.sprinterClimbRescueGapS) return 'cota-sprinter'
  if (b.tercerHombreDeEquipos && b.gapS <= STAGE.truce.teamsRescueMaxGapS) return 'equipos'
  return null
}

/**
 * CUÁNTOS BAJAN. Uno por cada `rescuePerManS` de hueco, **todos menos uno**: siempre queda un hombre
 * delante sosteniendo la carrera del equipo, porque vaciar el pelotón para ir a por el jefe es
 * exactamente lo que ningún director hace.
 */
export function rescueMen(branch: Exclude<RescueBranch, null>, b: RescueBid): number {
  if (branch === 'equipos') return Math.min(1, b.leales)
  if (branch === 'cota-sprinter') return Math.min(STAGE.truce.approachHelpers, b.leales)
  const porElHueco = Math.ceil(b.gapS / STAGE.truce.rescuePerManS)
  return Math.max(1, Math.min(porElHueco, Math.max(1, b.leales - 1)))
}

/**
 * LA REGLA DE LOS 3 KM (R12.5, S-374): el que se cae o pincha dentro de los últimos kilómetros toma
 * el tiempo del grupo en el que iba. **En meta en alto y en crono no**, y eso no es una excepción
 * caprichosa: ahí la carrera se está decidiendo en ese mismo metro y cada uno se come el suyo.
 *
 * `threeKmRuleKm` es un dato del recorrido y no una constante —el jurado la declara a 4 o 5 km en
 * finales llanos peligrosos—, así que entra por argumento con su valor por defecto.
 */
export function threeKmRule(
  kmToGo: number,
  finishType: string,
  ruleKm: number = STAGE.truce.threeKmRuleKm,
): boolean {
  if (kmToGo > ruleKm) return false
  return finishType !== 'alto' && finishType !== 'solitario' && finishType !== 'crono'
}

/**
 * EL TAPÓN (R12.6, S-251/S-466): una caída en un sitio estrecho no reparte por piernas, **reparte
 * por dónde entraste**. Los de detrás del caído, hasta un cuarto del grupo, se quedan sin sitio por
 * donde pasar y pierden medio minuto o ponen pie a tierra.
 *
 * Depende de R15 y por eso no existía: hasta el paso 14 el motor no sabía por dónde iba nadie.
 */
export function taponVictim(placement: number, placeDelCaido: number): boolean {
  return placement >= placeDelCaido && placement <= placeDelCaido + STAGE.truce.taponShare
}

/** Lo que pierde el atrapado en el tapón, entre 30 y 60 s según lo cerrado que le pille. */
export function taponLossS(placement: number, placeDelCaido: number): number {
  const dentro = Math.max(0, Math.min(1, (placement - placeDelCaido) / STAGE.truce.taponShare))
  // Cuanto MÁS cerca del montón, peor: el que va justo detrás se lo come entero.
  return (
    STAGE.truce.taponLossMaxS - (STAGE.truce.taponLossMaxS - STAGE.truce.taponLossMinS) * dentro
  )
}

/**
 * EL GREGARIO SE APARTA AL VER (R13.2, S-259/S-288): un leal que ve a su carta **derivando** sale del
 * turno YA, sin esperar a que se abra el hueco de veintidós segundos.
 *
 * Es un disparador **adicional** al hueco, no una rebaja de ese umbral: bajarlo es un paso aparte con
 * su propia huella y su propio margen. Esta regla lo habilita; no lo hace.
 */
export function mateSeesTrouble(driftSdeSuCarta: number): boolean {
  return driftSdeSuCarta >= STAGE.truce.mateWatchDriftS
}

/**
 * LA PÁJARA DEL QUE TIRA (R13.3, S-206): «cuando el hombre que tiraba se apaga, el relevo pasa al
 * siguiente del equipo y se nota». Hoy el que tira tira hasta el final aunque no le quede nada.
 */
export function pullerCollapsed(energy: number, energy0: number): boolean {
  if (energy0 <= 0) return true
  return energy / energy0 < STAGE.truce.pullerCollapseFraction
}

/**
 * COMER (R13.4, S-147/S-226): pasar de una hora larga sin comer multiplica el dado de la pájara. Es
 * la causa de pájara que el motor no tenía —hoy uno revienta solo por gastar— y la que de verdad
 * explica la mitad de las pájaras de una etapa larga.
 */
export function feedStarveFactor(kmSinceFeed: number): number {
  return kmSinceFeed > STAGE.truce.feedMaxKm ? STAGE.truce.feedStarveGain : 1
}
