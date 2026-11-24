/**
 * LAS FECHAS DE LA CUENTA (docs/cuenta.md §12.1 y §12.2; 12-g): `Joined 12 Nov 2026` en la cabecera de
 * `Account`, `Changed 12 Nov` en la fila de la contraseña y, en `Devices`, la última actividad relativa hasta
 * 7 días (`Active now`, `Active 2 days ago`) y absoluta después, con el año si no es el actual. Los meses,
 * escritos aquí: `toLocaleDateString` da `Sept` o `Sep` según la versión de ICU.
 */
const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `12 Nov`, o `12 Nov 2025` si no es del año de `now`; `withYear` lo pone siempre. */
export function shortDate(iso: string, now: Date, withYear = false): string {
  const d = new Date(iso)
  const base = `${d.getDate()} ${MESES[d.getMonth()]}`
  return withYear || d.getFullYear() !== now.getFullYear() ? `${base} ${d.getFullYear()}` : base
}

const HORA_MS = 3_600_000
const DIA_MS = 24 * HORA_MS

/** `Active now`, `Active 3 hours ago`, `Active 2 days ago` hasta 7 días, y `Active 20 Oct` después. */
export function activeText(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime()
  if (ms < HORA_MS) return 'Active now'
  if (ms < DIA_MS) {
    const h = Math.floor(ms / HORA_MS)
    return `Active ${h} ${h === 1 ? 'hour' : 'hours'} ago`
  }
  const dias = Math.floor(ms / DIA_MS)
  if (dias <= 7) return `Active ${dias} ${dias === 1 ? 'day' : 'days'} ago`
  return `Active ${shortDate(iso, now)}`
}

/** La segunda línea de una fila de `Devices`: `Active now · Signed in 12 Nov`. La propia está activa ahora. */
export function deviceMeta(
  row: { readonly current: boolean; readonly createdAt: string; readonly lastActiveAt: string },
  now: Date,
): string {
  const activo = row.current ? 'Active now' : activeText(row.lastActiveAt, now)
  return `${activo} · Signed in ${shortDate(row.createdAt, now)}`
}

/** `You're signed in on 3 devices.`, o `You're only signed in here.` con una sola (§12.2). */
export function devicesStatus(count: number): string {
  return count <= 1 ? "You're only signed in here." : `You're signed in on ${count} devices.`
}

/** `Signed out of 2 other devices.` (§12.2; 6-c), con el número que devuelve la API. */
export function othersText(closed: number): string {
  return `${closed} other ${closed === 1 ? 'device' : 'devices'}`
}
