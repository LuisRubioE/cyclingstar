/** Estrellas de media en media (SPEC 3.2). El jugador ve estrellas, nunca el número interno. */
export function StarRating({ value }: { value: number }) {
  const percent = (Math.min(5, Math.max(0, value)) / 5) * 100
  return (
    <span
      className="relative inline-block select-none leading-none"
      aria-label={`${value} of 5 stars`}
      title={`${value} / 5`}
    >
      <span className="text-slate-300">★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden text-amber-400"
        style={{ width: `${percent}%` }}
        aria-hidden
      >
        ★★★★★
      </span>
    </span>
  )
}
