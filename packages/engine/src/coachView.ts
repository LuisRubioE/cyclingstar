import type { Attribute } from '@cyclingstar/shared'
import { TRAINING } from './constants.js'
import { kDim } from './progression.js'
import { normal, type Rng } from './random.js'

/**
 * LO QUE EL ENTRENADOR DICE DE TI, SIN ENSEÑAR UN SOLO NÚMERO (docs/entrenamiento.md §2.3, SPEC 5.6).
 *
 * El problema que resuelve está escrito en las dos quejas opuestas del dueño: enseñar el techo mata
 * la exploración —si sabes desde el día uno que tu tope de montaña es 71, ya no hay nada que
 * descubrir—, y no enseñar nada deja «no sé si mejoro». La salida es una OPINIÓN: el techo pasado
 * por ruido y cuantizado a tres frases.
 *
 * Todo lo de aquí es PURO y devuelve CÓDIGOS, no texto: la UI va en inglés y vive en `apps/web`, y
 * un motor que devolviera frases inglesas obligaría a traducir en el sitio equivocado.
 */

/** Las tres frases del ojeador, por el techo que él CREE ver. */
export type CeilingOpinion = 'tres' | 'cuatro' | 'cinco'

/**
 * El ruido es la opinión. Con σ = 6 un techo de 80 se ve como 4★ casi siempre y como 5★ de vez en
 * cuando, que es exactamente lo que hace un ojeador con un chaval de veinte años.
 *
 * A partir de los 24 baja a σ = 3: el entrenador ya te ha visto correr cuatro temporadas y se
 * equivoca menos. No baja a cero nunca —nadie sabe del todo lo que otro tiene dentro— y por eso la
 * opinión puede cambiar de una temporada a la siguiente aunque el techo sea el mismo.
 */
export const OPINION_SD_JOVEN = 6
export const OPINION_SD_VETERANO = 3
export const OPINION_AGE_EXPERTO = 24

export function ceilingOpinion(ceiling: number, age: number, rng: Rng): CeilingOpinion {
  const sd = age >= OPINION_AGE_EXPERTO ? OPINION_SD_VETERANO : OPINION_SD_JOVEN
  const visto = ceiling + normal(rng, 0, sd)
  if (visto >= 84) return 'cinco'
  if (visto >= 67) return 'cuatro'
  return 'tres'
}

/**
 * LAS FRASES POR REGLA: los ocultos contados sin enseñarlos (docs/entrenamiento.md §2.3).
 *
 * Es el «descubrimiento del talento» del SPEC 5.6. Ninguna de las cinco dice un número; todas dicen
 * algo que el jugador puede USAR —afinar más corto, cuidado con las semanas fuertes, el margen está
 * en otro sitio—, que es la diferencia entre información y decoración.
 */
export type CoachNote = 'progresa_rapido' | 'recupera_rapido' | 'fragil' | 'declive' | 'techo_cerca'

export interface CoachNotesInput {
  age: number
  declineAge: number
  talent: number
  fragility: number
  /** REC del corredor: el que recupera rápido puede afinar en menos días. */
  rec: number
  /** Atributo de la carta del arquetipo y su techo: de ahí sale si queda margen donde importa. */
  carta: Attribute
  attributes: Record<Attribute, number>
  ceilings: Record<Attribute, number>
}

/** Umbrales de las frases. Están aquí y no en `constants.ts` porque no mueven una sola simulación. */
export const COACH_NOTE = {
  talentoAlto: 65,
  edadJoven: 23,
  recRapido: 70,
  fragilAlta: 1.3,
  /** `kDim` por debajo de esto es «ya casi no queda de dónde sacar» en ese atributo. */
  margenAgotado: 0.15,
} as const

export function coachNotes(input: CoachNotesInput): CoachNote[] {
  const notas: CoachNote[] = []
  if (input.talent > COACH_NOTE.talentoAlto && input.age <= COACH_NOTE.edadJoven) {
    notas.push('progresa_rapido')
  }
  if (input.rec >= COACH_NOTE.recRapido) notas.push('recupera_rapido')
  if (input.fragility > COACH_NOTE.fragilAlta) notas.push('fragil')
  if (input.age >= input.declineAge) notas.push('declive')
  const k = kDim(input.attributes[input.carta], input.ceilings[input.carta])
  if (k < COACH_NOTE.margenAgotado) notas.push('techo_cerca')
  return notas
}

/**
 * ¿ESTÁ EN DECLIVE? Es la etiqueta que va junto a la edad en la ficha, y la única de todo este
 * fichero que NO necesita un oculto: `declineAge` decide, y ya se le está diciendo en una frase.
 */
export function isDeclining(age: number, declineAge: number): boolean {
  return age >= declineAge
}

/** El gimnasio del equipo traducido a lo poco que el jugador necesita saber: mejor, normal o peor. */
export function facilitiesTier(kInst: number): 'bajo' | 'normal' | 'alto' {
  const medio = (TRAINING.kInstMin + TRAINING.kInstMax) / 2
  const cuarto = (TRAINING.kInstMax - TRAINING.kInstMin) / 4
  if (kInst < medio - cuarto) return 'bajo'
  if (kInst > medio + cuarto) return 'alto'
  return 'normal'
}
