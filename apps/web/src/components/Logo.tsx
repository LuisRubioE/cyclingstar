import { LOGO_STAR } from '@cyclingstar/shared'

/**
 * Emblema de Cycling Star (#1): una bicicleta estilizada con una estrella. SVG puro, escalable. Con
 * `decorative`, no se lee: va dentro de un enlace que ya lleva el nombre (la cabecera; E3, PR 11). La
 * estrella es `LOGO_STAR` de `kit.ts`, la misma que lleva en el pecho el maillot del campeón del mundo
 * (E3, docs/visual.md §9.1; PR 17a).
 */
export function Logo({
  size = 40,
  className,
  decorative = false,
}: {
  size?: number
  className?: string
  decorative?: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 60"
      fill="none"
      className={className}
      {...(decorative
        ? { 'aria-hidden': true, focusable: false }
        : { role: 'img', 'aria-label': 'Cycling Star' })}
    >
      {/* Ruedas */}
      <circle cx="17" cy="43" r="12" stroke="#4f46e5" strokeWidth="3" />
      <circle cx="55" cy="43" r="12" stroke="#4f46e5" strokeWidth="3" />
      <circle cx="17" cy="43" r="1.6" fill="#4f46e5" />
      <circle cx="55" cy="43" r="1.6" fill="#4f46e5" />
      {/* Cuadro: pedalier (36,43), sillín (28,24), potencia (46,24) */}
      <path
        d="M17 43 L36 43 L28 24 L46 24 L55 43 M36 43 L46 24 M28 24 L34 22"
        stroke="#4f46e5"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Manillar y sillín */}
      <path d="M44 24 L50 22" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
      <path d="M25 23 L31 23" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
      {/* Estrella */}
      <path d={LOGO_STAR} fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  )
}
