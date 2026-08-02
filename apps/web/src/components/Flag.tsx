import { COUNTRIES } from '@cyclingstar/shared'

/**
 * Bandera como imagen (SVG local, vía flag-icons) en lugar de emoji: los emoji de bandera no se
 * renderizan en Windows ni en muchos navegadores de escritorio (muestran las letras del país).
 * `size` es la altura en px (el ancho sale 4:3). Sin país válido, cae a una bandera blanca neutra.
 */
export function Flag({
  code,
  size = 20,
  className = '',
}: {
  code: string | null | undefined
  size?: number
  className?: string
}) {
  const cc = code?.trim().toLowerCase()
  const known = cc ? COUNTRIES.some((c) => c.code === cc.toUpperCase()) : false
  const label = code
    ? (COUNTRIES.find((c) => c.code === code.toUpperCase())?.name ?? code)
    : undefined

  if (!cc || !known) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
        🏳️
      </span>
    )
  }
  return (
    <span
      className={`fi fi-${cc} ${className}`}
      style={{ fontSize: size, borderRadius: 2, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
      role="img"
      aria-label={label}
      title={label}
    />
  )
}
