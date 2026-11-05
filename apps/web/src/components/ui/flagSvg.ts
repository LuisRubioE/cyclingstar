import { useEffect, useSyncExternalStore } from 'react'

/**
 * EL SVG DE UNA BANDERA, A LA CARTA (E3, docs/visual.md §9.5; PR 17a; 9-j). Desde 72 px el campeón
 * nacional viste el SVG 4x3 de su país que copió el PR 6 (`assets/flags/`), y por debajo la celda del
 * sprite. Cada SVG es un trozo aparte (`import.meta.glob` sin `eager`): se pide solo cuando se pinta
 * uno, y hasta que llega se ve la celda. La mediana pesa 0,4 KB con gzip y el mayor, Serbia, 48,8.
 */

const LOADERS = import.meta.glob<string>('../../assets/flags/*.svg', {
  query: '?url',
  import: 'default',
})

/** ISO-2 en mayúsculas → su cargador. */
const BY_CODE: ReadonlyMap<string, () => Promise<string>> = new Map(
  Object.entries(LOADERS).map(([path, load]) => [
    (/([a-z]{2})\.svg$/.exec(path)?.[1] ?? '').toUpperCase(),
    load,
  ]),
)

const urls = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()
const listeners = new Set<() => void>()

/** Pide el SVG de un país (una vez) y avisa a quien lo espera; null si el país no tiene. */
export function loadFlagSvg(code: string): Promise<string | null> {
  const hit = urls.get(code)
  if (hit !== undefined) return Promise.resolve(hit)
  const inFlight = pending.get(code)
  if (inFlight !== undefined) return inFlight
  const load = BY_CODE.get(code)
  if (load === undefined) return Promise.resolve(null)
  const p = load().then(
    (url) => {
      urls.set(code, url)
      pending.delete(code)
      for (const notify of listeners) notify()
      return url
    },
    () => {
      pending.delete(code)
      return null
    },
  )
  pending.set(code, p)
  return p
}

const subscribe = (notify: () => void) => {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

/** La URL del SVG de un país si ya llegó; si se quiere y no ha llegado, la pide. */
export function useFlagSvg(code: string, wanted: boolean): string | null {
  const read = () => urls.get(code) ?? null
  const url = useSyncExternalStore(subscribe, read, read)
  useEffect(() => {
    if (wanted && url === null) void loadFlagSvg(code)
  }, [code, wanted, url])
  return wanted ? url : null
}
