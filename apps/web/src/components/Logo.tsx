/** Emblema de Cycling Star (#1): una bicicleta estilizada con una estrella. SVG puro, escalable. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 60"
      fill="none"
      className={className}
      role="img"
      aria-label="Cycling Star"
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
      <path
        d="M36 2 L39.2 9.2 L47 10 L41.2 15.3 L42.9 23 L36 19.1 L29.1 23 L30.8 15.3 L25 10 L32.8 9.2 Z"
        fill="#f59e0b"
        stroke="#f59e0b"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}
