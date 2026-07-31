/**
 * Cabecera del layout. Cascarón del Paso 8: nombre del juego y huecos para la fecha
 * del mundo, el dinero y la frescura, que se rellenarán cuando existan (Pasos 12+).
 */
export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <span className="text-lg font-semibold tracking-tight">Cycling Star</span>
        <nav className="flex items-center gap-4 text-sm text-slate-500">
          {/* Huecos futuros: fecha del mundo · dinero · frescura */}
          <span aria-hidden>—</span>
        </nav>
      </div>
    </header>
  )
}
