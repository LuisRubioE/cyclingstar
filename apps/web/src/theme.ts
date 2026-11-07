import type { Theme } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getTheme, putTheme } from './api/theme'
import { useSessionState } from './auth/useSessionState'

/**
 * EL MODO DEL JUGADOR (E3, docs/visual.md §3.3, D-00i; paso 23). Claro por defecto, y oscuro si el jugador
 * lo elige en `/account`, donde se aplica al momento. Se guarda en la cuenta (`GET` y `PUT /api/me/theme`),
 * para que siga al jugador de un aparato a otro, y en el aparato (`cs-theme`), para que
 * `public/theme.js` lo pinte antes de la primera pintura. La regla: sin sesión vale lo del aparato; con
 * sesión manda la cuenta, y al llegar se escriben los dos. No sigue a `prefers-color-scheme`. Los maillots
 * no lo leen: su filete es un token que el modo redefine (§9.10).
 */

/** La clave del modo en `localStorage`, la misma que lee `public/theme.js`. */
export const THEME_STORAGE_KEY = 'cs-theme'
/** La consulta del modo de la cuenta. */
export const THEME_QUERY_KEY = ['theme'] as const

/** Lo que se toca de `<html>`: su `data-theme`. */
interface Raiz {
  readonly dataset: DOMStringMap
}

/** Lo del aparato: `dark` si lo dice; sin nada, con otra cosa o con un almacenamiento que falla, `light`. */
export function storedTheme(storage: Pick<Storage, 'getItem'> | null): Theme {
  try {
    return storage?.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** La regla (D-00i): con sesión manda la cuenta; sin ella, o mientras no llega, lo del aparato. */
export function themeOf(account: Theme | null, stored: Theme): Theme {
  return account ?? stored
}

/**
 * Pinta el modo: `data-theme="dark"` en `<html>`, o nada con el claro, y lo guarda en el aparato. Sin
 * aparato (`null`, el de `/_ui`), no escribe la preferencia; con uno que falla, se pinta igual.
 */
export function applyTheme(
  theme: Theme,
  root: Raiz,
  storage: Pick<Storage, 'setItem'> | null,
): void {
  if (theme === 'dark') root.dataset.theme = 'dark'
  else delete root.dataset.theme
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // sin almacenamiento, vale para esta página y la cuenta lo recuerda
  }
}

/** `?theme=dark` o `light` en `/_ui`, que lo fija para la página (5-h); sin él, o con otra cosa, null. */
export function themeFromSearch(search: string): Theme | null {
  const theme = new URLSearchParams(search).get('theme')
  return theme === 'dark' || theme === 'light' ? theme : null
}

/** El `localStorage` del navegador, o null: en una ventana privada o bloqueado, leerlo puede lanzar. */
function aparato(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** El modo de la cuenta, una vez por carga y con sesión; o el que se acaba de elegir. */
function useAccountTheme(): Theme | null {
  const { signedIn } = useSessionState()
  const query = useQuery({
    queryKey: THEME_QUERY_KEY,
    queryFn: getTheme,
    enabled: signedIn,
    staleTime: Number.POSITIVE_INFINITY,
  })
  return query.data?.theme ?? null
}

/**
 * En el marco de la web: al llegar la cuenta, si dice otra cosa que el aparato, manda la cuenta y se
 * escriben los dos. Lo nota sobre todo un aparato nuevo, una vez.
 */
export function useThemeSync(): void {
  const account = useAccountTheme()
  useEffect(() => {
    if (account === null) return
    const almacen = aparato()
    const root = document.documentElement
    if (
      storedTheme(almacen) !== account ||
      (root.dataset.theme === 'dark') !== (account === 'dark')
    )
      applyTheme(account, root, almacen)
  }, [account])
}

/** El componente del marco que lo hace: no pinta nada. */
export function ThemeSync(): null {
  useThemeSync()
  return null
}

/** Para `Appearance`, en `/account`: el modo de ahora y su cambio, que se ve al momento y se guarda. */
export function useTheme(): {
  readonly theme: Theme
  readonly setTheme: (theme: Theme) => void
  readonly saveFailed: boolean
} {
  const { signedIn } = useSessionState()
  const account = useAccountTheme()
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: putTheme,
    // si la cuenta no lo guarda, vuelve a mandar lo que dice ella
    onError: () => void queryClient.invalidateQueries({ queryKey: THEME_QUERY_KEY }),
  })
  const setTheme = (theme: Theme): void => {
    applyTheme(theme, document.documentElement, aparato())
    queryClient.setQueryData(THEME_QUERY_KEY, { theme })
    if (signedIn) save.mutate(theme)
  }
  return { theme: themeOf(account, storedTheme(aparato())), setTheme, saveFailed: save.isError }
}
