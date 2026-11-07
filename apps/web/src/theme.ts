import type { Theme } from '@cyclingstar/shared'
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getTheme, putTheme } from './api/theme'
import { useSessionState } from './auth/useSessionState'
import { handleGlobalError } from './queryClient'

/**
 * EL MODO DEL JUGADOR (E3, docs/visual.md §3.3, D-00i; paso 23). Claro por defecto, y oscuro si el jugador
 * lo elige en `/account`, donde se aplica al momento. Se guarda en la cuenta (`GET` y `PUT /api/me/theme`),
 * para que siga al jugador de un aparato a otro, y en el aparato (`cs-theme`), para que el guion de
 * `public/assets/theme-<huella>.js` lo pinte antes de la primera pintura. La regla: sin sesión vale lo del
 * aparato; con sesión manda la cuenta, y al llegar se escriben los dos. No sigue a `prefers-color-scheme`.
 * Los maillots no lo leen: su filete es un token que el modo redefine (§9.10).
 */

/** La clave del modo en `localStorage`, la misma que lee el guion de `<head>`. */
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

/**
 * Lo que hace `ThemeSync` al llegar la cuenta: si dice otra cosa que el aparato o que `<html>`, manda ella
 * y se escriben los dos. Da si escribió.
 */
export function syncTheme(
  account: Theme | null,
  root: Raiz,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
): boolean {
  if (account === null) return false
  if (storedTheme(storage) === account && (root.dataset.theme === 'dark') === (account === 'dark'))
    return false
  applyTheme(account, root, storage)
  return true
}

/**
 * Elegir en `Appearance` (la revisión del paso 23): se ve al momento; una consulta de la cuenta en vuelo,
 * que leyó lo de antes, no lo deshace; con sesión se guarda en la cuenta, un `PUT` tras otro, para que se
 * quede con la última elección; y avisa solo si falla la última, con el error al manejador global (un 401
 * lleva a `/login`, como las demás escrituras) y la cuenta pedida otra vez.
 */
export function themeChooser(deps: {
  readonly queryClient: QueryClient
  readonly root: () => Raiz
  readonly storage: () => Pick<Storage, 'getItem' | 'setItem'> | null
  readonly put: (theme: Theme) => Promise<unknown>
  readonly onSaved: (failed: boolean) => void
  readonly onError: (error: unknown) => void
}): (theme: Theme, save: boolean) => void {
  let cola: Promise<unknown> = Promise.resolve()
  let ultima = 0
  return (theme, save) => {
    applyTheme(theme, deps.root(), deps.storage())
    void deps.queryClient.cancelQueries({ queryKey: THEME_QUERY_KEY })
    deps.queryClient.setQueryData(THEME_QUERY_KEY, { theme })
    if (!save) return
    const esta = ++ultima
    deps.onSaved(false)
    cola = cola
      .then(() => deps.put(theme))
      .then(
        () => {
          if (esta === ultima) deps.onSaved(false)
        },
        (error: unknown) => {
          deps.onError(error)
          if (esta !== ultima) return
          deps.onSaved(true)
          void deps.queryClient.invalidateQueries({ queryKey: THEME_QUERY_KEY })
        },
      )
  }
}

/** El `localStorage` del navegador, o null: en una ventana privada o bloqueado, leerlo puede lanzar. */
function aparato(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * El modo de la cuenta, una vez por carga y con sesión de verdad (`state`, no `signedIn`: la regla de
 * `useSessionState`); o el que se acaba de elegir.
 */
function useAccountTheme(): Theme | null {
  const { state } = useSessionState()
  const query = useQuery({
    queryKey: THEME_QUERY_KEY,
    queryFn: getTheme,
    enabled: state === 'signed-in',
    staleTime: Number.POSITIVE_INFINITY,
  })
  return query.data?.theme ?? null
}

/**
 * En el marco de la web: al llegar la cuenta, si dice otra cosa que el aparato, manda la cuenta (lo nota
 * sobre todo un aparato nuevo, una vez); y lo que elige otra pestaña, esta lo sigue (`storage` solo llega a
 * las demás).
 */
export function useThemeSync(): void {
  const account = useAccountTheme()
  const queryClient = useQueryClient()
  useEffect(() => {
    syncTheme(account, document.documentElement, aparato())
  }, [account])
  useEffect(() => {
    const otra = (e: StorageEvent): void => {
      if (e.key !== THEME_STORAGE_KEY) return
      const theme: Theme = e.newValue === 'dark' ? 'dark' : 'light'
      applyTheme(theme, document.documentElement, null)
      queryClient.setQueryData(THEME_QUERY_KEY, { theme })
    }
    window.addEventListener('storage', otra)
    return () => window.removeEventListener('storage', otra)
  }, [queryClient])
}

/** El componente del marco que lo hace: no pinta nada. */
export function ThemeSync(): null {
  useThemeSync()
  return null
}

/**
 * Para `Appearance`, en `/account`: el modo de ahora y su cambio, que se ve al momento y se guarda. Sin
 * `useMutation`: `ThemeSync` va en el arranque, y este módulo con él.
 */
export function useTheme(): {
  readonly theme: Theme
  readonly setTheme: (theme: Theme) => void
  readonly saveFailed: boolean
} {
  const { state } = useSessionState()
  const account = useAccountTheme()
  const queryClient = useQueryClient()
  const [saveFailed, setSaveFailed] = useState(false)
  const [elegir] = useState(() =>
    themeChooser({
      queryClient,
      root: () => document.documentElement,
      storage: aparato,
      put: putTheme,
      onSaved: setSaveFailed,
      onError: handleGlobalError,
    }),
  )
  return {
    theme: themeOf(account, storedTheme(aparato())),
    setTheme: (theme) => elegir(theme, state === 'signed-in'),
    saveFailed,
  }
}
