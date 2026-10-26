import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../Logo'
import { Button } from './Button'
import { FOCUS } from './styles'

/**
 * LA CABECERA (E3, docs/visual.md §4.4 y §6.3; PR 11, D-17). Una banda de 48 más el área segura de arriba,
 * en `navy` y en el ámbito oscuro, que no es fija: se va con el desplazamiento (§4.9). A la izquierda el
 * logotipo de 28 en un enlace de 44 × 44 a la portada (`Cycling Star home`), con `Cycling Star` al lado
 * solo desde 640, porque a 360 no cabe con el reloj (Ruso-006); en medio el reloj del mundo en `meta`
 * `on-navy-2` (8,15:1), que no se corta, con su frase entera para el lector; y a la derecha `Account`, un
 * botón de solo icono de 44. Sin sesión, `Log in` y `Sign up`, y el reloj solo desde 640: los tres no
 * caben a 336 (4-k). Sin saber la sesión, sin red y con la marca de este navegador, la del jugador (D-47).
 * Debajo, lo que le da el marco: el nivel 1 de la navegación (`sections`), que solo pinta desde 640 porque
 * por debajo lo lleva la `BottomNav`, y las pestañas del nivel 2.
 *
 * Hoy el reloj solo salía desde 768 (`Header.tsx` l. 122): en el teléfono no se veía.
 */

export type AppHeaderState = 'signed-in' | 'signed-out' | 'unknown'

export interface AppHeaderProps {
  readonly state: AppHeaderState
  /** el reloj del mundo (`worldClock` de `domain/words.ts`); null hasta que llega `/health` */
  readonly clock: { readonly text: string; readonly label: string } | null
  /** el nivel 1 de la navegación, que la cabecera pinta solo desde 640: por debajo, la `BottomNav` */
  readonly sections?: ReactNode
  /** lo que va bajo la banda y el nivel 1: las pestañas del nivel 2 */
  readonly children?: ReactNode
}

/**
 * `Sign up`, en `gold` con `navy-dark` (6,72:1, el par de la pastilla activa de la `BottomNav`): en el ámbito
 * oscuro `ink` es blanco, y el blanco sobre `gold` da 2,27.
 */
const SIGN_UP = `inline-flex min-h-11 shrink-0 items-center rounded-ui bg-gold px-3 text-meta font-semibold text-navy-dark ${FOCUS}`

export function AppHeader({ state, clock, sections, children }: AppHeaderProps) {
  const jugador = state !== 'signed-out'
  return (
    <header
      data-ui="AppHeader"
      data-state={state}
      data-surface="dark"
      className="bg-navy pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto flex h-12 max-w-page items-center gap-2 px-3">
        <Link
          to="/"
          aria-label="Cycling Star home"
          className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-ui ${FOCUS}`}
        >
          <Logo size={28} decorative />
          <span data-from="640" className="hidden text-title font-bold text-white sm:inline">
            Cycling Star
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          {clock !== null && (
            <span
              role="timer"
              aria-label={clock.label}
              {...(jugador ? {} : { 'data-from': '640' })}
              className={`text-meta whitespace-nowrap text-on-navy-2${jugador ? '' : ' hidden sm:inline'}`}
            >
              {clock.text}
            </span>
          )}
        </div>
        {jugador ? (
          <Button to="/account" icon="account" ariaLabel="Account" variant="quiet" />
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Button to="/login" variant="quiet">
              Log in
            </Button>
            <Link to="/register" className={SIGN_UP}>
              Sign up
            </Link>
          </div>
        )}
      </div>
      {sections !== undefined && (
        <div data-from="640" className="hidden sm:block">
          {sections}
        </div>
      )}
      {children}
    </header>
  )
}
