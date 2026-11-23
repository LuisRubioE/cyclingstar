import { ApiError } from '../api/request'

/**
 * LOS FALLOS DEL PANEL, POR SU CÓDIGO (docs/cuenta.md §8.5). Los textos de la tabla del panel y los de
 * antes del PR 5 (quitarse el admin, borrarse, una cuenta que ya no está). `es_el_admin_raiz` dice una
 * cosa al borrar y otra al cambiar: el borrado lleva su propio porqué.
 */
export const DELETE_YOURSELF = 'Delete your own account from Account settings.'
export const DELETE_ROOT = 'That is the root admin (ADMIN_EMAIL): it cannot be deleted from here.'

const POR_CODIGO: Readonly<Record<string, string>> = {
  no_puedes_quitarte_admin: 'You cannot remove your own admin rights.',
  borra_tu_cuenta_desde_ajustes: DELETE_YOURSELF,
  es_el_admin_raiz: "The fixed administrator's account can't be changed here.",
  no_encontrado: 'That account no longer exists.',
  admin_email_fijo:
    "The email of a fixed administrator (ADMIN_EMAIL) can't be changed or given here.",
  correo_ocupado: 'Another account already uses this email.',
  nombre_repetido: 'That team name is taken in this world.',
  nombre_bloqueado: "That team name isn't allowed.",
  nombre_invalido: "That team name isn't allowed.",
  no_pendiente: 'This request was already decided.',
  MAIL_BUDGET_EXHAUSTED: "Today's email budget is used up. Approve again tomorrow.",
}

export function adminErrorMessage(err: unknown, accion?: 'delete'): string {
  const code = err instanceof ApiError ? err.code : null
  if (accion === 'delete' && code === 'es_el_admin_raiz') return DELETE_ROOT
  const texto = code !== null ? POR_CODIGO[code] : undefined
  if (texto !== undefined) return texto
  return err instanceof Error ? err.message : 'Something went wrong.'
}
