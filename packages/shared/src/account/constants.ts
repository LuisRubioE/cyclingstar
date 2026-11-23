/**
 * Las constantes de la cuenta que comparten la API y la web (docs/cuenta.md §16.1). Las de la sesión
 * (§6.1; D-17; I-11) y las de los enlaces de correo (§5.1; PR 8); las demás llegan con el PR que las usa.
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
 * Vida del enlace de confirmar el correo (docs/cuenta.md §5.1; D-11): 24 horas, porque el correo del
 * registro se lee al día siguiente. Es la `exp` del JWT de better-auth (`emailVerification.expiresIn`).
 */
export const EMAIL_JWT_TTL_S = 24 * 60 * 60

/**
 * Vida del enlace de recuperar la contraseña (§5.1; D-11): una hora, porque quien recupera está delante
 * esperándolo; no baja de ahí porque el token ya no pasa por la URL ni por los logs.
 */
export const RESET_TOKEN_TTL_S = 60 * 60

/**
 * Los enlaces viejos (`/api/auth/verify-email?token=`, `/api/auth/reset-password/:token` y `?token=` en
 * las dos páginas) siguen valiendo estos días desde el despliegue del PR 8 de E4 (§5.2; D-12; 5-f). No es
 * la vida de ningún enlace, que ya caducó: es el plazo para quitar su código, que quita el PR 19.
 */
export const LEGACY_LINK_GRACE_DAYS = 7

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
