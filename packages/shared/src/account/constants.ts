/**
 * Las constantes de la cuenta que comparten la API y la web (docs/cuenta.md §16.1). Por ahora solo
 * las de la sesión (§6.1; D-17; I-11); las demás llegan con el PR que las usa.
 */

/** Vida de una sesión: 30 días, renovados con el uso. */
export const SESSION_EXPIRES_S = 30 * 24 * 60 * 60

/** Cada cuánto se renueva: una vez al día de uso, no en cada petición. */
export const SESSION_UPDATE_AGE_S = 24 * 60 * 60

/**
 * El techo desde que se abrió la sesión: una cookie robada no vive más de un trimestre aunque se use
 * cada día. better-auth no tiene esta opción; la aplican los dos sitios que leen la sesión.
 */
export const SESSION_MAX_AGE_DAYS = 90
