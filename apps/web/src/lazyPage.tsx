import { type ComponentType, lazy } from 'react'

/**
 * LAS PÁGINAS, EN TROZOS CUYO FALLO SE PINTA EN SU SITIO (E3, docs/visual.md §12.1; PR 4, D-47 y 12-c).
 *
 * Cada página se carga con `React.lazy` (`App.tsx`), y un `import()` que falla (sin red, o tras un
 * despliegue, cuando el trozo viejo ya no existe) tiraba la web entera a la barrera raíz. Ahora el fallo
 * es un `ChunkLoadError`, que la barrera por ruta (`RouteBoundary`) pinta en su sitio, y lleva si falló
 * sin red: es lo que decide su tipo, `network` u `outdated`.
 *
 * Volver a llamar al `import()` no sirve en todos los navegadores: la norma HTML guardaba el fallo de
 * cada módulo hasta recargar la página, y dejó de hacerlo en julio de 2026 (whatwg/html#10327); Chromium
 * 141, el de la prueba, aún lo guarda, y ni vuelve a pedir el trozo. `React.lazy` también lo recuerda.
 * Por eso reintentar es recargar, que vale en todos.
 */

/** Un trozo de la web que no cargó: el `import()` de una página falló. */
export class ChunkLoadError extends Error {
  /** lo que lanzó el `import()` */
  readonly original: unknown
  /** falló sin red (`navigator.onLine` falso al fallar): la página necesita la red; si no, es vieja */
  readonly offline: boolean

  constructor(original: unknown, offline: boolean) {
    super('A part of the web did not load.')
    this.name = 'ChunkLoadError'
    this.original = original
    this.offline = offline
  }
}

type PageModule = { default: ComponentType }

/** La carga de una página, con su fallo tipado: si falla, un `ChunkLoadError` que dice si había red. */
export function pageLoader(load: () => Promise<PageModule>): () => Promise<PageModule> {
  return () =>
    load().catch((e: unknown) => {
      throw new ChunkLoadError(e, typeof navigator !== 'undefined' && !navigator.onLine)
    })
}

/** `React.lazy` para una página, con su fallo tipado. */
export function lazyPage(load: () => Promise<PageModule>): ComponentType {
  return lazy(pageLoader(load))
}
