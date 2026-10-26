import { useSyncExternalStore } from 'react'

/**
 * EL TECLADO DEL TELÉFONO (E3, docs/visual.md §4.9; PR 9a, H-16). Mientras está abierto, la `ActionBar` y
 * la `BottomNav` se esconden: lo fijo no puede comerse lo poco que queda a la vista. Abierto es que el
 * alto visible (`visualViewport.height`) baje de tres cuartos del de la ventana (`innerHeight`). La regla
 * es pura y se prueba sola, con alturas simuladas (`ActionBar.test.tsx`); en un aparato la mira el dueño
 * (§7.7, la tarea 8).
 */

/** Por debajo de esta parte de la ventana, lo visible es lo que deja el teclado. */
export const KEYBOARD_RATIO = 0.75

export function isKeyboardOpen(visibleHeight: number, windowHeight: number): boolean {
  return windowHeight > 0 && visibleHeight < KEYBOARD_RATIO * windowHeight
}

function subscribe(onChange: () => void): () => void {
  const vv = typeof window === 'undefined' ? null : window.visualViewport
  if (vv === null) return () => {}
  vv.addEventListener('resize', onChange)
  return () => vv.removeEventListener('resize', onChange)
}

function snapshot(): boolean {
  const vv = window.visualViewport
  return vv !== null && isKeyboardOpen(vv.height, window.innerHeight)
}

/** Si el teclado está abierto ahora; sin `visualViewport` (o en el servidor), nunca. */
export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
