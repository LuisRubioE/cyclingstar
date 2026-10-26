import { type RefCallback, useCallback, useRef } from 'react'

/**
 * LO FIJO DE ABAJO (E3, docs/visual.md §4.9; PR 11, Ruso-010). La `BottomNav` y la `ActionBar` se apuntan
 * con `useFixedPiece`, y de sus altos medidos (con un `ResizeObserver`, no con las cifras de §4.9, que son
 * mínimas y crecen con la letra al doble) el marco escribe en el documento dos variables:
 * `--action-bar-bottom`, el sitio de la `ActionBar`, encima de la `BottomNav`; y `--fixed-bottom`, la suma,
 * el relleno de abajo del marco, para que nada quede debajo de una barra. Desde 640, o con el teclado
 * abierto, la `BottomNav` no se pinta y mide 0. En `/_ui` no se apunta nada: sus barras van en su marco.
 */

export type FixedPiece = 'nav' | 'bar'

/** Las dos variables, de los altos medidos: hacia arriba, para que nada quede debajo por medio píxel. */
export function fixedBottomVars(altos: { readonly nav: number; readonly bar: number }): {
  readonly '--action-bar-bottom': string
  readonly '--fixed-bottom': string
} {
  return {
    '--action-bar-bottom': `${Math.ceil(altos.nav)}px`,
    '--fixed-bottom': `${Math.ceil(altos.nav + altos.bar)}px`,
  }
}

const altos: Record<FixedPiece, number> = { nav: 0, bar: 0 }

function escribe(): void {
  const estilo = document.documentElement.style
  for (const [variable, valor] of Object.entries(fixedBottomVars(altos)))
    estilo.setProperty(variable, valor)
}

/**
 * El `ref` de la raíz de una pieza fija: la mide al montarse, antes de pintar, y cada vez que cambia su
 * caja entera (`border-box`, con el relleno del área segura y el filete); al desmontarse, vuelve a 0.
 */
export function useFixedPiece(pieza: FixedPiece): RefCallback<HTMLElement> {
  const observador = useRef<ResizeObserver | null>(null)
  return useCallback(
    (el: HTMLElement | null) => {
      observador.current?.disconnect()
      observador.current = null
      const mide = () => {
        altos[pieza] = el === null ? 0 : el.getBoundingClientRect().height
        escribe()
      }
      mide()
      if (el === null || typeof ResizeObserver === 'undefined') return
      observador.current = new ResizeObserver(mide)
      observador.current.observe(el, { box: 'border-box' })
    },
    [pieza],
  )
}
