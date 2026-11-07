/// <reference types="node" />
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import type { Theme } from '@cyclingstar/shared'
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import {
  THEME_QUERY_KEY,
  THEME_STORAGE_KEY,
  applyTheme,
  storedTheme,
  syncTheme,
  themeChooser,
  themeFromSearch,
  themeOf,
} from './theme'

/**
 * EL MODO DEL JUGADOR (E3, docs/visual.md §3.3, D-00i; paso 23). Claro por defecto y oscuro en `/account`,
 * guardado en la cuenta para que siga al jugador de un aparato a otro y en `localStorage` (`cs-theme`) para
 * pintarlo antes de la primera pintura, con el guion de `public/assets/theme-<huella>.js`. La regla, en
 * funciones sin React: sin sesión vale lo del aparato; con sesión manda la cuenta y se escriben los dos;
 * un `localStorage` que falla da el claro; y elegir en `Appearance` se ve al momento, no lo deshace una
 * consulta en vuelo y se guarda en orden. No sigue a `prefers-color-scheme`.
 */

/** El guion de antes de la primera pintura: uno, con la huella de su contenido en el nombre. */
const ASSETS = new URL('../public/assets/', import.meta.url)
const GUIONES = readdirSync(ASSETS).filter((f) => /^theme-.*\.js$/.test(f))
const GUION = GUIONES[0] ?? 'theme-?.js'
const CODIGO = GUIONES.length === 1 ? readFileSync(new URL(GUION, ASSETS), 'utf8') : ''

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
  it('la clave del aparato es cs-theme, la misma que lee el guion', () => {
    expect(THEME_STORAGE_KEY).toBe('cs-theme')
    expect(CODIGO).toContain(`'${THEME_STORAGE_KEY}'`)
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

describe('al llegar la cuenta (ThemeSync)', () => {
  it('sin cuenta, nada; si dice otra cosa que el aparato o que <html>, manda ella y escribe los dos', () => {
    const html = raiz()
    const aparato = almacen({ 'cs-theme': 'light' })
    expect(syncTheme(null, html, aparato)).toBe(false)
    expect(html.dataset.theme).toBeUndefined()
    expect(syncTheme('dark', html, aparato)).toBe(true)
    expect(html.dataset.theme).toBe('dark')
    expect(aparato.datos.get('cs-theme')).toBe('dark')
    // ya igual: no escribe
    expect(syncTheme('dark', html, aparato)).toBe(false)
    // <html> distinto del aparato (otra pestaña lo cambió): manda la cuenta
    delete html.dataset.theme
    expect(syncTheme('dark', html, aparato)).toBe(true)
    expect(html.dataset.theme).toBe('dark')
  })
})

/** Una promesa que se resuelve o se rechaza desde fuera. */
function diferida<T>() {
  let resolver!: (v: T) => void
  let rechazar!: (e: unknown) => void
  const promesa = new Promise<T>((ok, ko) => {
    resolver = ok
    rechazar = ko
  })
  return { promesa, resolver, rechazar }
}

/** Un elector con sus dobles: el cliente de consultas de verdad, el `PUT` y lo que avisa. */
function elector(put: (t: Theme) => Promise<unknown>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const html = raiz()
  const aparato = almacen()
  const avisos: boolean[] = []
  const errores: unknown[] = []
  const elegir = themeChooser({
    queryClient,
    root: () => html,
    storage: () => aparato,
    put,
    onSaved: (fallo) => avisos.push(fallo),
    onError: (e) => errores.push(e),
  })
  return { queryClient, html, aparato, avisos, errores, elegir }
}

const espera = async () => {
  for (let i = 0; i < 5; i++) await new Promise((ok) => setTimeout(ok, 0))
}

describe('elegir en Appearance (useTheme)', () => {
  it('se ve al momento: <html>, el aparato y la consulta de la cuenta', () => {
    const e = elector(async () => ({ theme: 'dark' }))
    e.elegir('dark', false)
    expect(e.html.dataset.theme).toBe('dark')
    expect(e.aparato.datos.get('cs-theme')).toBe('dark')
    expect(e.queryClient.getQueryData(THEME_QUERY_KEY)).toEqual({ theme: 'dark' })
  })

  it('una consulta de la cuenta en vuelo, que leyó lo de antes, no deshace la elección', async () => {
    const e = elector(async () => ({ theme: 'dark' }))
    const lectura = diferida<{ theme: Theme }>()
    void e.queryClient.fetchQuery({ queryKey: THEME_QUERY_KEY, queryFn: () => lectura.promesa })
    e.elegir('dark', true)
    lectura.resolver({ theme: 'light' })
    await espera()
    expect(e.queryClient.getQueryData(THEME_QUERY_KEY)).toEqual({ theme: 'dark' })
  })

  it('sin sesión no guarda en la cuenta; con ella, los PUT van en orden y la cuenta se queda con el último', async () => {
    const pedidos: { theme: Theme; fin: ReturnType<typeof diferida<unknown>> }[] = []
    const e = elector((theme) => {
      const fin = diferida<unknown>()
      pedidos.push({ theme, fin })
      return fin.promesa
    })
    e.elegir('dark', false)
    await espera()
    expect(pedidos).toEqual([])
    e.elegir('dark', true)
    e.elegir('light', true)
    await espera()
    // el segundo no sale hasta que vuelve el primero
    expect(pedidos.map((x) => x.theme)).toEqual(['dark'])
    pedidos[0]!.fin.resolver({ theme: 'dark' })
    await espera()
    expect(pedidos.map((x) => x.theme)).toEqual(['dark', 'light'])
    pedidos[1]!.fin.resolver({ theme: 'light' })
    await espera()
    expect(e.avisos.at(-1)).toBe(false)
  })

  it('avisa solo si falla el último: uno viejo que falla no avisa ni pide la cuenta, que desharía el nuevo', async () => {
    let n = 0
    const e = elector(async () => {
      n++
      if (n === 1) throw new Error('red')
      return { theme: 'light' }
    })
    const invalidar = vi.spyOn(e.queryClient, 'invalidateQueries')
    e.elegir('dark', true)
    e.elegir('light', true)
    await espera()
    expect(e.avisos).not.toContain(true)
    expect(invalidar).not.toHaveBeenCalled()
    expect(e.queryClient.getQueryData(THEME_QUERY_KEY)).toEqual({ theme: 'light' })
  })

  it('si falla el último: lo dice, pasa el error al manejador global (un 401 lleva a /login) y pide la cuenta otra vez', async () => {
    const error = new Error('401')
    const e = elector(async () => {
      throw error
    })
    const invalidar = vi.spyOn(e.queryClient, 'invalidateQueries')
    e.elegir('dark', true)
    await espera()
    expect(e.avisos.at(-1)).toBe(true)
    expect(e.errores).toEqual([error])
    expect(invalidar).toHaveBeenCalledWith({ queryKey: THEME_QUERY_KEY })
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

describe('el guion de antes de la primera pintura (3-h)', () => {
  const codigo = CODIGO

  it('es uno, en assets/, con la huella de su contenido: se sirve inmutable y no se revalida en cada carga', () => {
    expect(GUIONES).toHaveLength(1)
    const huella = createHash('sha256').update(CODIGO).digest('hex').slice(0, 8)
    expect(GUION).toBe(`theme-${huella}.js`)
  })

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
    const guion = head.indexOf(`<script src="/assets/${GUION}"></script>`)
    expect(guion).toBeGreaterThan(-1)
    // ni async, ni defer, ni módulo: tiene que correr antes de pintar
    expect(head).not.toMatch(/<script[^>]*theme-[^>]*(async|defer|type="module")/)
    // antes de la hoja de estilos y del guion de la app, que Vite pone detrás de lo que hay en <head>
    expect(head.slice(0, guion)).not.toMatch(/<link rel="stylesheet"|<script/)
  })
})
