import type { CeilingOpinion } from '@cyclingstar/shared'

/**
 * LO QUE EL ENTRENADOR DICE DE CADA ATRIBUTO, EN LA LENGUA DE LA PANTALLA (docs/agenda.md §4.20).
 *
 * Ninguna frase habla de estrellas ni de números: dicen dónde tiene el corredor más margen y dónde
 * menos, y con cuánta seguridad. Van agrupadas por la lectura del motor (`coachReading`): la primera
 * es vaga a propósito, la segunda se moja con reservas y la tercera habla claro.
 */
export const COACH_OPINION_TEXT: Record<CeilingOpinion, string> = {
  // Primera lectura: el chaval recién llegado.
  pronto: 'Too early to say. I need to see you race more.',
  asoma: 'There seems to be something here. Too early to be sure, though.',
  // La lectura se forma.
  apunta: "I think there's real room for you to grow here.",
  quiza: 'Some room here, more or less. Hard to tell yet.',
  no_parece: "I don't see this becoming your strength, but I could be wrong.",
  // Lectura clara.
  lo_tuyo: 'This is your thing: your biggest potential is here.',
  fuerte: 'Strong potential here, one of your best.',
  normal: 'More or less in line with the rest of you.',
  flojo: 'Not where your future is. Your room is elsewhere.',
}
