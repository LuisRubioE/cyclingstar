/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY, applyTheme, storedTheme, themeFromSearch, themeOf } from './theme'

/**
 * EL MODO DEL JUGADOR (E3, docs/visual.md §3.3, D-00i; paso 23). Claro por defecto y oscuro en `/account`,
 * guardado en la cuenta para que siga al jugador de un aparato a otro y en `localStorage` (`cs-theme`) para
 * pintarlo antes de la primera pintura, con `public/theme.js`. La regla de `useTheme`, en funciones puras:
 * sin sesión vale lo del aparato; con sesión manda la cuenta y se escriben los dos; un `localStorage` que
 * falla da el claro. No sigue a `prefers-color-scheme`.
 */

/** Un `localStorage` de mentira: lo que guarda, o uno que lanza en todo. */
function almacen(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial))
  return {
    datos,
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
  }
}
const roto = {
  getItem: (): string | null => {
    throw new Error('SecurityError')
  },
  setItem: (): void => {
    throw new Error('QuotaExceededError')
  },
}

/** Un `<html>` de mentira: solo su `dataset`. */
const raiz = (theme?: string) =>
  ({ dataset: theme === undefined ? {} : { theme } }) as {
    dataset: DOMStringMap
  }

describe('la regla del modo (useTheme; D-00i)', () => {
  it('la clave del aparato es cs-theme, la misma que lee theme.js', () => {
    expect(THEME_STORAGE_KEY).toBe('cs-theme')
    expect(readFileSync(new URL('../public/theme.js', import.meta.url), 'utf8')).toContain(
      `'${THEME_STORAGE_KEY}'`,
    )
  })

  it('lo del aparato: dark si lo dice; nada, otra cosa o un almacenamiento que falla, light', () => {
    expect(storedTheme(almacen({ 'cs-theme': 'dark' }))).toBe('dark')
    expect(storedTheme(almacen({ 'cs-theme': 'light' }))).toBe('light')
    expect(storedTheme(almacen())).toBe('light')
    expect(storedTheme(almacen({ 'cs-theme': 'sepia' }))).toBe('light')
    expect(storedTheme(roto)).toBe('light')
    expect(storedTheme(null)).toBe('light')
  })

  it('sin sesión vale lo del aparato; con sesión manda la cuenta', () => {
    expect(themeOf(null, 'dark')).toBe('dark')
    expect(themeOf(null, 'light')).toBe('light')
    expect(themeOf('light', 'dark')).toBe('light')
    expect(themeOf('dark', 'light')).toBe('dark')
  })

  it('pintarlo escribe los dos: data-theme en <html>, solo con dark, y cs-theme en el aparato', () => {
    const html = raiz()
    const aparato = almacen()
    applyTheme('dark', html, aparato)
    expect(html.dataset.theme).toBe('dark')
    expect(aparato.datos.get('cs-theme')).toBe('dark')
    applyTheme('light', html, aparato)
    expect(html.dataset.theme).toBeUndefined()
    expect(aparato.datos.get('cs-theme')).toBe('light')
  })

  it('con un almacenamiento que falla, se pinta igual y no lanza', () => {
    const html = raiz()
    expect(() => applyTheme('dark', html, roto)).not.toThrow()
    expect(html.dataset.theme).toBe('dark')
    expect(() => applyTheme('light', html, null)).not.toThrow()
    expect(html.dataset.theme).toBeUndefined()
  })
})

describe('/_ui en los dos modos (§5.4; 5-h)', () => {
  it('?theme=dark o light lo fija para la página; sin él, o con otra cosa, nada', () => {
    expect(themeFromSearch('?theme=dark')).toBe('dark')
    expect(themeFromSearch('?theme=light')).toBe('light')
    expect(themeFromSearch('?state=empty&theme=dark')).toBe('dark')
    expect(themeFromSearch('')).toBeNull()
    expect(themeFromSearch('?theme=sepia')).toBeNull()
  })

  it('pintarlo sin aparato (el de /_ui) no escribe la preferencia', () => {
    const html = raiz()
    const aparato = almacen({ 'cs-theme': 'light' })
    applyTheme('dark', html, null)
    expect(html.dataset.theme).toBe('dark')
    expect(aparato.datos.get('cs-theme')).toBe('light')
  })
})

describe('theme.js, antes de la primera pintura (3-h)', () => {
  const codigo = readFileSync(new URL('../public/theme.js', import.meta.url), 'utf8')

  /** Corre theme.js con un `localStorage` y un `<html>` de mentira, y da el `data-theme` que deja. */
  const corre = (localStorage: unknown): string | undefined => {
    const html = raiz()
    runInNewContext(codigo, { localStorage, document: { documentElement: html } })
    return html.dataset.theme
  }

  it('con cs-theme en dark, data-theme="dark"; con light, nada, otra cosa o sin almacenamiento, nada', () => {
    expect(corre(almacen({ 'cs-theme': 'dark' }))).toBe('dark')
    expect(corre(almacen({ 'cs-theme': 'light' }))).toBeUndefined()
    expect(corre(almacen())).toBeUndefined()
    expect(corre(almacen({ 'cs-theme': 'sepia' }))).toBeUndefined()
    expect(corre(roto)).toBeUndefined()
  })

  it('no lee prefers-color-scheme (D-00i)', () => {
    expect(codigo).not.toMatch(/prefers-color-scheme|matchMedia/)
  })

  it('index.html lo carga en <head>, clásico, antes que todo lo demás: sin destello', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    const head = html.slice(0, html.indexOf('</head>'))
    const guion = head.indexOf('<script src="/theme.js"></script>')
    expect(guion).toBeGreaterThan(-1)
    // ni async, ni defer, ni módulo: tiene que correr antes de pintar
    expect(head).not.toMatch(/<script[^>]*theme\.js[^>]*(async|defer|type="module")/)
    // antes de la hoja de estilos y del guion de la app, que Vite pone detrás de lo que hay en <head>
    expect(head.slice(0, guion)).not.toMatch(/<link rel="stylesheet"|<script/)
  })
})
