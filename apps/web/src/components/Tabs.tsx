import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tabId } from './ui/Tabs'

/** el `id` de cada pestaña, uno para las dos: `ui/Tabs.tsx` y su panel de aquí (`ui/Tabs.test.tsx` lo comprueba) */
export { tabId }

/**
 * LO QUE QUEDA DE LAS PESTAÑAS DE ANTES (docs/navegacion.md §3, §7): el panel que gobierna una tira de
 * pestañas y la pestaña en la query. La tira es desde el PR 11 de E3 la de `ui/Tabs.tsx`; su versión de
 * aquí, con la paleta y sus tres variantes, se fue en el 21m, cuando ya no la usaba nadie (E3,
 * docs/visual.md §17.21). El `id` de cada pestaña, el de `ui/Tabs.tsx` (`tabId`).
 */

/**
 * Panel gobernado por una tira de `Tabs`. Es SIEMPRE el mismo elemento (cambia su contenido, no su
 * identidad), así que el `aria-controls` de las pestañas nunca apunta a un nodo que no existe; lo
 * que cambia es a qué pestaña dice pertenecer, vía `aria-labelledby`.
 */
export function TabPanel({
  panelId,
  active,
  children,
  className = 'space-y-4',
}: {
  /** El mismo `panelId` que se le pasó a `Tabs`. */
  panelId: string
  /** Clave de la pestaña activa: la que etiqueta el panel. */
  active: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId(panelId, active)}
      tabIndex={-1}
      className={className}
    >
      {children}
    </div>
  )
}

/**
 * Guarda la pestaña activa en la query (`?tab=`), para que un enlace a una pestaña concreta
 * funcione y para no ensuciar el historial (se navega con `replace`).
 *
 * El valor de la URL se valida contra `options`: si no encaja, se usa `fallback`. Así la pestaña por
 * defecto puede depender del estado (p. ej. `Classifications` en una carrera ya corrida y `Route` en
 * una por correr) sin escribir nada en la URL hasta que el jugador toca una pestaña.
 */
export function useTabParam<K extends string>(
  options: readonly K[],
  fallback: K,
  param = 'tab',
): [K, (key: K) => void] {
  const [search, setSearch] = useSearchParams()
  const raw = search.get(param)
  const current = options.find((o) => o === raw) ?? fallback

  const setTab = useCallback(
    (key: K) => {
      const next = new URLSearchParams(search)
      next.set(param, key)
      setSearch(next, { replace: true })
    },
    [search, setSearch, param],
  )

  return [current, setTab]
}
