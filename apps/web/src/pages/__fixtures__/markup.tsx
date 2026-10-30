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
  const tag = /^<([a-z]+)/.exec(markup.slice(inicio))?.[1]
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
  return inicio < 0 ? '' : elementoEn(markup, inicio)
}

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

/** Las clases de antes: los colores de la paleta de Tailwind, que el sistema cambia por sus tokens (§3). */
export const PALETA =
  /\b(?:slate|gray|zinc|indigo|blue|sky|cyan|emerald|green|amber|yellow|orange|red|rose)-\d/
