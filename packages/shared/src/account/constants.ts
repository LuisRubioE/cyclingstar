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

/**
 * El estado de una cuenta en el registro por aprobación (docs/cuenta.md §4.9): `pending` hasta que un
 * administrador la aprueba. De los cuatro de `twilightstruggle` E4 usa dos: rechazar borra la petición
 * y suspender es moderación (E7).
 */
export const USER_STATUSES = ['pending', 'approved'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

/**
 * Lo que guarda cada fila de `admin_audit` (docs/cuenta.md §8.5; 8-d): una por campo cambiado, con el
 * valor de antes y el de después; para un equipo, también su id. `from` y `to` son nulos donde no hay
 * valor (una fila nueva de la lista de bloqueo, el tick) o donde no se guarda (el correo de una cuenta
 * borrada, §10.4).
 */
export interface AdminAuditDetail {
  readonly field: string
  readonly from: string | number | boolean | null
  readonly to: string | number | boolean | null
  readonly teamId?: string
}
