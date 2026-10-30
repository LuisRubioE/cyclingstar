import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

/**
 * LO QUE LEEN LOS TESTS DE LAS PÁGINAS EN SU MARCADO (E3, PR 21j): la página pintada en estático en su ruta, y
 * de ella un elemento entero, el `Field` de un control o lo que la pantalla contesta (§7.3).
 */

/** La página pintada en estático, en su ruta (con su `?`, si lo lleva). */
export function pintaEn(path: string, page: ReactElement): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El elemento entero que abre en `inicio`, con lo que lleva dentro: cuenta las aperturas y los cierres de su etiqueta. */
export function elementoEn(markup: string, inicio: number): string {
  const tag = /^<([a-z][a-z0-9]*)/.exec(markup.slice(inicio))?.[1]
  if (tag === undefined) return ''
  const re = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'g')
  re.lastIndex = inicio
  let abiertas = 0
  for (let m = re.exec(markup); m !== null; m = re.exec(markup)) {
    if (m[1] === '/') abiertas -= 1
    else if (m[2] !== '/') abiertas += 1
    if (abiertas === 0) return markup.slice(inicio, m.index + m[0].length)
  }
  return markup.slice(inicio)
}

/** El `Field` del control con ese id, entero: su rótulo, su control, su ayuda y su error. */
export function campo(markup: string, id: string): string {
  const control = markup.indexOf(` id="${id}"`)
  if (control < 0) return ''
  const inicio = markup.lastIndexOf('<div data-ui="Field"', control)
  const entero = inicio < 0 ? '' : elementoEn(markup, inicio)
  // el `Field` de antes del control, si el control no es suyo, no vale
  return entero.includes(` id="${id}"`) ? entero : ''
}

/** El estado del `Field` mismo, y no el de lo que lleva dentro (el icono de su error tiene el suyo). */
export const estado = (field: string): string | null =>
  /^<div data-ui="Field"[^>]*data-state="([^"]+)"/.exec(field)?.[1] ?? null

/**
 * El componente del catálogo (`data-ui`) más cercano que lleva dentro este texto, entero; si el texto sale más de
 * una vez (el título y el botón que dicen `Log in`), el de la primera vez que está dentro de uno.
 */
export function pieza(markup: string, ui: string, texto: string): string {
  for (let donde = markup.indexOf(texto); donde >= 0; donde = markup.indexOf(texto, donde + 1))
    for (let i = markup.lastIndexOf(`data-ui="${ui}"`, donde); i >= 0;) {
      const inicio = markup.lastIndexOf('<', i)
      const entero = elementoEn(markup, inicio)
      if (inicio + entero.length > donde) return entero
      i = markup.lastIndexOf(`data-ui="${ui}"`, inicio - 1)
    }
  return ''
}

/** Cuántas cosas contestan la pantalla (§7.3): ha de ser una. */
export const respuestas = (markup: string): number => markup.match(/data-answer=""/g)?.length ?? 0

/** Cuántas veces sale algo en el marcado: 0 si ninguna, para comparar dos cuentas sin que valgan dos nadas. */
export const cuantas = (markup: string, re: RegExp): number =>
  markup.match(new RegExp(re.source, 'g'))?.length ?? 0

/** El `h1` de la página, que ha de ser uno, dentro de su `PageHeader`. */
export const titulo = (markup: string): string | null =>
  cuantas(markup, /<h1[\s>]/) === 1
    ? (/<header data-ui="PageHeader"(?:(?!<\/header>)[\s\S])*?<h1[^>]*>([^<]*)<\/h1>/.exec(
        markup,
      )?.[1] ?? null)
    : null

/** Las clases de antes: los colores de la paleta de Tailwind y la marca de antes, que el sistema cambia por sus tokens (§3). */
export const PALETA =
  /\b(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d|brand-)/
