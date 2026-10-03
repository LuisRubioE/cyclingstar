import { ATTRIBUTES, type Attribute, type CeilingOpinion, seededRng } from '@cyclingstar/shared'
import { TRAINING } from './constants.js'
import { kDim } from './progression.js'
import { normal } from './random.js'

export type { CeilingOpinion }

/**
 * LO QUE EL ENTRENADOR DICE DE TI, SIN ENSEÑAR UN SOLO NÚMERO (docs/entrenamiento.md §2.3, SPEC 5.6).
 *
 * El problema que resuelve está escrito en las dos quejas opuestas del dueño: enseñar el techo mata
 * la exploración —si sabes desde el día uno que tu tope de montaña es 71, ya no hay nada que
 * descubrir—, y no enseñar nada deja «no sé si mejoro». La salida es una OPINIÓN.
 *
 * Todo lo de aquí es PURO y devuelve CÓDIGOS, no texto: la UI va en inglés y vive en `apps/web`, y
 * un motor que devolviera frases inglesas obligaría a traducir en el sitio equivocado.
 */

/**
 * EL ENTRENADOR YA NO HABLA EN ESTRELLAS (docs/agenda.md §4.20, octubre de 2026).
 *
 * Antes decía «no veo más allá de 3★ aquí» o «hay madera de 5★»: el techo de cada atributo pasado
 * por ruido y cuantizado a tres cajones. El dueño creó un velocista y el entrenador le dijo que no
 * pasaría de tres estrellas en NADA, ni en el esprint, y que donde tenía cinco era en la táctica. Un
 * jugador así cierra la pestaña o se abre cuentas hasta que le salga uno mejor. Y como el código
 * cruzaba la API, cualquiera lo leía en la pestaña de red aunque la pantalla lo callara.
 *
 * Lo que dice ahora cumple las cuatro condiciones de la agenda:
 *
 * 1. **Es RELATIVA**: ordena los diez techos del propio corredor y habla del PUESTO de cada uno
 *    (dónde está su mejor sitio, dónde el montón, dónde lo flojo). Sumar la misma cantidad a todos
 *    los techos no cambia ni una opinión, así que no dice a qué nivel se llega y dos cuentas no se
 *    pueden comparar.
 * 2. **Se AFINA con el tiempo**: la lectura depende de cuánto tiempo lleva el entrenador viéndote
 *    correr, que para un jugador es la edad (todos entran a los 18). Al principio solo se atreve con
 *    un «parece que hay algo aquí» y un «es pronto» para todo lo demás; después dice arriba, medio y
 *    abajo con reservas; y a partir de los 23 habla claro.
 * 3. **Puede EQUIVOCARSE**: no ordena los techos de verdad sino los techos más un error propio de
 *    cada atributo, sembrado por corredor y FIJO de por vida, que se va encogiendo con la edad. Es
 *    fijo a propósito: un entrenador que se equivoca sobre tu montaña se equivoca en el mismo sentido
 *    el año siguiente, solo que menos, y un día rectifica. Si se resorteara cada temporada, la
 *    opinión bailaría sin que el corredor hubiera cambiado y no se podría creer.
 * 4. **La API no manda lo que la pantalla no enseña**: los códigos (`CEILING_OPINIONS` en
 *    packages/shared) son exactamente las frases de la pantalla, y ninguno nombra un nivel.
 */

/** Las tres lecturas del entrenador, de la más borrosa a la más segura. */
export type CoachReading = 'primera' | 'formandose' | 'clara'

/**
 * Las edades que cambian de lectura. 18 y 19 son la primera: según la convención de temporadas con
 * que se mire, un jugador recién creado tiene una u otra, y en las dos su primer año tiene que ser el
 * de «es pronto». A los 23 habla claro, que es la edad a la que la agenda dice «cuánto cree que vas a
 * dar»: un sub-23 que termina la categoría ya ha enseñado lo que es.
 */
export const OPINION_AGE_FORMANDOSE = 20
export const OPINION_AGE_CLARA = 23

/**
 * EL ERROR DEL ENTRENADOR, que encoge con la edad (en puntos de techo, sobre el error unitario fijo
 * de cada atributo).
 *
 * Arranca en 9 a los 19, que es del orden de lo que se separan entre sí los techos de un mismo
 * corredor (`CREATION.ceilingSd`): en su primera lectura acierta su mejor sitio unas siete veces de
 * cada diez y se equivoca de verdad el resto. Baja lineal hasta 1,5 a los 27, la edad a la que la
 * agenda dice «ya lo sabe», y de ahí no baja más: nadie sabe del todo lo que otro tiene dentro, y
 * dos techos casi iguales pueden seguir leyéndose al revés.
 *
 * Estas constantes viven aquí y no en `constants.ts` por lo mismo que `COACH_NOTE`: no mueven una
 * sola simulación, solo lo que el entrenador le dice al jugador.
 */
export const OPINION_SD_INICIAL = 9
export const OPINION_SD_FINAL = 1.5
export const OPINION_AGE_INICIAL = 19
export const OPINION_AGE_SABE = 27

/**
 * CUÁNTOS ATRIBUTOS CAEN EN CADA FRASE, por puesto dentro del corredor (0 es su mejor techo).
 *
 * Son puestos y no distancias a propósito: «tu esprint está doce puntos por encima de tu media»
 * parece relativo, pero la media de los techos es parecida en todos los corredores, así que la
 * distancia acaba diciendo el nivel absoluto por la puerta de atrás. El puesto no: todo corredor
 * tiene exactamente un «lo tuyo», dos «fuerte» y tres «flojo».
 */
export const OPINION_RANKS = {
  /** En la lectura que se forma, cuántos de arriba reciben «apunta». */
  arribaFormandose: 2,
  /** En la lectura clara, cuántos reciben «fuerte» además del mejor, que es «lo tuyo». */
  fuertesClara: 2,
  /** Cuántos de abajo reciben la frase floja, en las dos lecturas que la tienen. */
  abajo: 3,
} as const

export function coachReading(age: number): CoachReading {
  if (age >= OPINION_AGE_CLARA) return 'clara'
  if (age >= OPINION_AGE_FORMANDOSE) return 'formandose'
  return 'primera'
}

/** El tamaño del error del entrenador a esta edad (ver `OPINION_SD_INICIAL`). */
export function opinionSd(age: number): number {
  const t = (age - OPINION_AGE_INICIAL) / (OPINION_AGE_SABE - OPINION_AGE_INICIAL)
  const f = Math.min(1, Math.max(0, t))
  return OPINION_SD_INICIAL + (OPINION_SD_FINAL - OPINION_SD_INICIAL) * f
}

/**
 * LA OPINIÓN DE LOS DIEZ ATRIBUTOS A LA VEZ. Tiene que ser de los diez juntos porque es relativa:
 * la de uno solo no existe sin los otros nueve.
 *
 * `seed` identifica al corredor y NO lleva la temporada: el error de cada atributo es suyo de por
 * vida (ver arriba), y lo que cambia con los años es su tamaño. La opinión es estable dentro de la
 * temporada porque la edad lo es.
 */
export function ceilingOpinions(
  ceilings: Record<Attribute, number>,
  age: number,
  seed: string,
): Record<Attribute, CeilingOpinion> {
  const sd = opinionSd(age)
  const visto = ATTRIBUTES.map((attr, i) => ({
    attr,
    i,
    valor: ceilings[attr] + sd * normal(seededRng(`${seed}:${attr}`), 0, 1),
  }))
  // De mayor a menor; a igualdad manda el orden de `ATTRIBUTES`, para que sea determinista.
  visto.sort((a, b) => b.valor - a.valor || a.i - b.i)

  const lectura = coachReading(age)
  const n = visto.length
  const out = {} as Record<Attribute, CeilingOpinion>
  visto.forEach(({ attr }, puesto) => {
    const abajo = puesto >= n - OPINION_RANKS.abajo
    if (lectura === 'primera') {
      out[attr] = puesto === 0 ? 'asoma' : 'pronto'
    } else if (lectura === 'formandose') {
      out[attr] = puesto < OPINION_RANKS.arribaFormandose ? 'apunta' : abajo ? 'no_parece' : 'quiza'
    } else {
      out[attr] =
        puesto === 0
          ? 'lo_tuyo'
          : puesto <= OPINION_RANKS.fuertesClara
            ? 'fuerte'
            : abajo
              ? 'flojo'
              : 'normal'
    }
  })
  return out
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
