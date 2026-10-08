/**
 * EL TÍTULO DE LA PESTAÑA DEL NAVEGADOR (E2, docs/retransmision.md §11.8; D-42, I-27, 11-c; paso 9a).
 *
 * `usePageTitle` es el ÚNICO escritor de `document.title` en la web (`pageTitle.test.ts` falla si otro
 * fichero lo escribe), y solo acepta la información de una etapa sin desenlace (`PageTitleInfo`) y un
 * `PageKind`: por tipo no cabe el nombre de un corredor ni un puesto. El título sale de `pageTitle`, el
 * mismo que inyecta el fallback de la SPA antes del JavaScript (`apps/api/src/spaShell.ts`), así que es el
 * mismo antes y después (11-c). No lleva el progreso ni cambia con la pestaña: el historial lo guarda.
 */
import { type PageKind, type PageTitleInfo, type StageReplay, pageTitle } from '@cyclingstar/shared'
import { useEffect } from 'react'

/** EL ÚNICO escritor de document.title. */
export function usePageTitle(p: PageTitleInfo | null, page: PageKind): void {
  const title = pageTitle('en', p, page)
  useEffect(() => {
    document.title = title
  }, [title])
}

/**
 * Lo que el título sabe de una etapa, de su ficha: la carrera, el día y cuántas etapas tiene. Nada más,
 * aunque la ficha traiga el resultado entero; null mientras no llega.
 */
export function stageTitleInfo(data: StageReplay | undefined): PageTitleInfo | null {
  if (data?.race === undefined) return null
  return { raceName: data.race.name, stageDay: data.day, stageCount: data.race.stageCount }
}

/**
 * EL TÍTULO DE LAS PÁGINAS SIN ETAPA, por su ruta (§11.8): corredor, equipo, noticias y rankings llevan
 * su nombre fijo; la portada y el resto, el de la app. Las de una carrera, una etapa y su acta se titulan
 * solas con su información (null aquí), y las rutas viejas que redirigen, también.
 */
export function pageKindOfPath(pathname: string): PageKind | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (/^\/(?:world\/)?races\/[^/]+(?:\/stages\/[^/]+(?:\/report)?)?$/.test(path)) return null
  if (path === '/') return 'home'
  if (path === '/news') return 'news'
  if (path === '/world/rankings') return 'rankings'
  if (path === '/me/profile' || /^\/world\/riders\/[^/]+$/.test(path)) return 'rider'
  if (/^\/world\/teams\/[^/]+$/.test(path) || /^\/team\//.test(path)) return 'team'
  return 'other'
}
