import type { AdminUser, AdminWhoami } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminPanel, Borrado, UserCard } from './AdminPanel'
import { PALETA, campo, cuantas, estado, pieza, pintaEn, titulo } from './__fixtures__/markup'

/**
 * EL PANEL DE ADMINISTRACIÓN CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21m), en estático
 * con la caché ya llena: la cabecera en `PageHeader`, con el enlace a la base de nombres en un `TextLink`; la
 * búsqueda, un `Field` con su rótulo a la vista; cada cuenta en su `Panel`, con sus chapas en `Chip` y sus
 * acciones en `Button`; y lo que no se puede (el raíz, uno mismo), deshabilitado con su porqué debajo y no
 * en un `title` (§4.1, regla `ui/4`).
 */

const SESION: AdminWhoami = { ok: true, via: 'session', userId: 'u-me' }

const ALTA = '2026-10-01T12:00:00Z'

const cuenta = (c: Partial<AdminUser> & Pick<AdminUser, 'id' | 'email'>): AdminUser => ({
  emailVerified: true,
  isAdmin: false,
  isRootAdmin: false,
  premium: false,
  createdAt: ALTA,
  rider: null,
  team: null,
  ...c,
})

/** Yo (admin por la columna), el raíz (`ADMIN_EMAIL`), una cuenta sin confirmar con premium, corredor y equipo, y una sin nada. */
const CUENTAS: readonly AdminUser[] = [
  cuenta({ id: 'u-me', email: 'me@cyclingstar.test', isAdmin: true }),
  cuenta({ id: 'u-root', email: 'root@cyclingstar.test', isRootAdmin: true }),
  cuenta({
    id: 'u-ana',
    email: 'ana@example.com',
    emailVerified: false,
    premium: true,
    rider: { id: 'r1', name: 'Ana Ruiz' },
    team: { id: 't1', name: 'Mistral Racing' },
  }),
  cuenta({ id: 'u-bo', email: 'bo@example.com' }),
]

/** La página en `/admin`, con el acceso y las cuentas en la caché, cargando o con un fallo. */
function pinta(
  acceso: AdminWhoami | null | 'cargando' = SESION,
  cuentas: readonly AdminUser[] | 'cargando' | 'falla' = CUENTAS,
): string {
  // sin reintentar al montar, para que una consulta que falla se pinte con su fallo (como `playerPages.test.tsx`)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  })
  if (acceso !== 'cargando') client.setQueryData(['admin-whoami'], acceso)
  if (cuentas === 'falla')
    client
      .getQueryCache()
      .build(client, { queryKey: ['admin-users', ''] })
      .setState({ status: 'error', error: new Error('500'), fetchStatus: 'idle' })
  else if (cuentas !== 'cargando') client.setQueryData(['admin-users', ''], cuentas)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin']}>
        <AdminPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El `Panel` de una cuenta, por su correo. */
const tarjeta = (markup: string, correo: string): string => pieza(markup, 'Panel', correo)

/** ¿Lleva una `Chip` de ese tono con ese texto, y solo ese? */
const chip = (markup: string, tono: string, texto: string): boolean =>
  new RegExp(
    `data-ui="Chip" data-variant="${tono}"[^>]*>(?:<svg(?:(?!</svg>)[\\s\\S])*</svg>)?${texto}</span>`,
  ).test(markup)

/** El enlace a esa ruta, entero. */
const enlace = (markup: string, href: string): string =>
  new RegExp(`<a[^>]*href="${href}"[^>]*>[^<]*</a>`).exec(markup)?.[0] ?? ''

/** El `data-state` de la raíz de un componente del catálogo. */
const estadoDe = (html: string): string | null =>
  /^<[a-z]+\b[^>]*?\sdata-ui="[^"]+"[^>]*?\sdata-state="([^"]+)"/.exec(html)?.[1] ?? null

/** Lo que se lee, sin etiquetas. */
const texto = (markup: string): string => markup.replace(/<[^>]+>/g, '')

const borrado = (props: Partial<Parameters<typeof Borrado>[0]> = {}): string =>
  renderToStaticMarkup(
    <Borrado
      confirming={false}
      busy={false}
      onAsk={() => undefined}
      onCancel={() => undefined}
      onConfirm={() => undefined}
      {...props}
    />,
  )

describe('el panel de administración con el sistema (§17.21; PR 21m)', () => {
  it('cargando el acceso: el esqueleto de QueryView, como hoy', () => {
    const markup = pinta('cargando')
    expect(markup).toMatch(/^<div data-ui="QueryView" data-state="loading" role="status">/)
    expect(markup).toContain('Loading your admin access')
  })

  it('sin sesión de admin, o con el token: No access, el único h1, en su PageHeader, con su porqué', () => {
    for (const acceso of [null, { ok: true, via: 'token', userId: null } as const]) {
      const markup = pinta(acceso)
      expect(titulo(markup)).toBe('No access')
      expect(markup).toMatch(
        /<header data-ui="PageHeader"[\s\S]*?<p[^>]*>This page is for administrators only\.<\/p>/,
      )
      expect(markup).not.toContain('me@cyclingstar.test')
    }
  })

  it('con sesión: la cabecera en PageHeader, con su línea de estado y la base de nombres en un TextLink', () => {
    const markup = pinta()
    expect(titulo(markup)).toBe('Admin')
    expect(markup).toMatch(
      /<header data-ui="PageHeader"[\s\S]*?<p[^>]*>Accounts, newest first\.<\/p>[\s\S]*?<\/header>/,
    )
    const nombres = enlace(markup, '/admin/names')
    expect(nombres).toContain('data-ui="TextLink"')
    expect(nombres).toContain('>Blocked names &amp; world health →</a>')
    expect(pieza(markup, 'PageHeader', 'Blocked names')).toContain(nombres)
  })

  it('la búsqueda por correo: un Field de tipo search con su rótulo a la vista', () => {
    const busca = campo(pinta(), 'admin-search')
    expect(estado(busca)).toBe('ready')
    expect(busca).toMatch(/<label for="admin-search"[^>]*>Search by email<\/label>/)
    expect(busca).not.toContain('sr-only')
    expect(busca).toMatch(/<input[^>]*type="search"/)
    expect(busca).toContain('placeholder="Search by email…"')
  })

  it('cada cuenta en su Panel, en la lista, con su correo y sus chapas en Chip', () => {
    const markup = pinta()
    expect(markup).toMatch(/<ul[^>]*><li[^>]*><section data-ui="Panel"/)
    for (const u of CUENTAS) {
      expect(tarjeta(markup, u.email), u.email).toMatch(/^<section data-ui="Panel"/)
      expect(tarjeta(markup, u.email)).toContain(`>${u.email}</span>`)
    }
    const yo = tarjeta(markup, 'me@cyclingstar.test')
    expect(chip(yo, 'neutral', 'you')).toBe(true)
    expect(chip(yo, 'good', 'confirmed')).toBe(true)
    expect(chip(yo, 'accent', 'admin')).toBe(true)
    const raiz = tarjeta(markup, 'root@cyclingstar.test')
    expect(chip(raiz, 'accent', 'root admin')).toBe(true)
    expect(chip(raiz, 'accent', 'admin')).toBe(false)
    expect(chip(raiz, 'neutral', 'you')).toBe(false)
    const ana = tarjeta(markup, 'ana@example.com')
    expect(chip(ana, 'warn', 'not confirmed')).toBe(true)
    expect(chip(ana, 'good', 'confirmed')).toBe(false)
    expect(chip(ana, 'accent', 'premium')).toBe(true)
    expect(cuantas(tarjeta(markup, 'bo@example.com'), /data-ui="Chip"/)).toBe(1)
  })

  it('la línea de cada cuenta: el alta, el corredor y el equipo con su TextLink en la frase, o no rider', () => {
    const markup = pinta()
    const fecha = new Date(ALTA).toLocaleDateString()
    const ana = tarjeta(markup, 'ana@example.com')
    expect(texto(ana)).toContain(`Joined ${fecha} · Ana Ruiz · manages Mistral Racing`)
    const corredor = enlace(ana, '/world/riders/r1')
    expect(corredor).toContain('data-ui="TextLink"')
    expect(corredor).toContain('data-inline-link=""')
    expect(corredor).toContain('>Ana Ruiz</a>')
    const equipo = enlace(ana, '/world/teams/t1')
    expect(equipo).toContain('data-ui="TextLink"')
    expect(equipo).toContain('data-inline-link=""')
    expect(equipo).toContain('>Mistral Racing</a>')
    const bo = tarjeta(markup, 'bo@example.com')
    expect(texto(bo)).toContain(`Joined ${fecha} · no rider`)
    expect(bo).not.toContain('manages')
  })

  it('las acciones, Buttons del catálogo: Confirm email sin confirmar, Grant o Remove premium, Make o Remove admin y Delete…', () => {
    const markup = pinta()
    const ana = tarjeta(markup, 'ana@example.com')
    for (const accion of ['Confirm email', 'Remove premium', 'Make admin', 'Delete…']) {
      const boton = pieza(ana, 'Button', accion)
      expect(boton, accion).toMatch(/^<button type="button" data-ui="Button"/)
      expect(estadoDe(boton), accion).toBe('ready')
    }
    const bo = tarjeta(markup, 'bo@example.com')
    expect(bo).not.toContain('Confirm email')
    expect(estadoDe(pieza(bo, 'Button', 'Grant premium'))).toBe('ready')
    expect(estadoDe(pieza(bo, 'Button', 'Make admin'))).toBe('ready')
    expect(estadoDe(pieza(tarjeta(markup, 'me@cyclingstar.test'), 'Button', 'Grant premium'))).toBe(
      'ready',
    )
  })

  it('lo que no se puede, deshabilitado con su porqué a la vista y sin title: el raíz y uno mismo', () => {
    const markup = pinta()
    const porque = (correo: string, accion: string, razon: string) => {
      const boton = pieza(tarjeta(markup, correo), 'Button', accion)
      expect(estadoDe(boton), `${correo} ${accion}`).toBe('disabled')
      expect(boton).toContain('aria-disabled="true"')
      expect(boton).toContain(`>${razon}</span>`)
    }
    porque('root@cyclingstar.test', 'Remove admin', 'Root admin (ADMIN_EMAIL)')
    porque(
      'root@cyclingstar.test',
      'Delete…',
      'That is the root admin (ADMIN_EMAIL): it cannot be deleted from here.',
    )
    porque('me@cyclingstar.test', 'Remove admin', 'You cannot remove your own admin rights')
    porque('me@cyclingstar.test', 'Delete…', 'Delete your own account from Account settings.')
    expect(markup).not.toMatch(/\stitle="/)
  })

  it('borrar pregunta antes: Delete… abre la pregunta, con Delete en danger, ocupado mientras borra, y Cancel en quiet', () => {
    expect(borrado()).toMatch(
      /^<button type="button" data-ui="Button" data-variant="secondary" data-state="ready"[\s\S]*?Delete…/,
    )
    const pregunta = borrado({ confirming: true })
    expect(pregunta).toContain('Delete this account? The rider and team stay, run by the game.')
    expect(pieza(pregunta, 'Button', '>Delete<')).toContain('data-variant="danger"')
    expect(pieza(pregunta, 'Button', '>Cancel<')).toContain('data-variant="quiet"')
    expect(pregunta).not.toContain('Delete…')
    const ocupado = pieza(borrado({ confirming: true, busy: true }), 'Button', '>Delete<')
    expect(estadoDe(ocupado)).toBe('busy')
    expect(ocupado).toContain('aria-busy="true"')
    expect(estadoDe(borrado({ disabledReason: 'Not this one.' }))).toBe('disabled')
  })

  it('los estados de la lista, con QueryView: cargando, vacía con su porqué y con un fallo, bajo la cabecera y la búsqueda', () => {
    const cargando = pinta(SESION, 'cargando')
    expect(cargando).toMatch(/data-ui="QueryView" data-state="loading"/)
    expect(cargando).toContain('Loading accounts')
    const vacia = pinta(SESION, [])
    expect(vacia).toMatch(/data-ui="EmptyState"[\s\S]*?No accounts match\./)
    const fallo = pinta(SESION, 'falla')
    expect(fallo).toMatch(/data-ui="ErrorState"[\s\S]*?Couldn&#x27;t load accounts/)
    for (const s of [cargando, vacia, fallo]) {
      expect(titulo(s)).toBe('Admin')
      expect(campo(s, 'admin-search')).not.toBe('')
    }
  })

  it('sin la paleta en el marcado, y ningún botón ni campo a mano: todos del catálogo', () => {
    const markup = pinta()
    for (const s of [markup, pinta(null), pinta(SESION, []), borrado({ confirming: true })])
      expect(s).not.toMatch(PALETA)
    expect(cuantas(markup, /<button\b/)).toBeGreaterThan(0)
    expect(cuantas(markup, /<button\b/)).toBe(cuantas(markup, /data-ui="Button"/))
    expect(cuantas(markup, /<input\b/)).toBe(cuantas(markup, /data-ui="Field"/))
  })
})

describe('el fallo de una acción (PR 21m)', () => {
  it('se dice en role="alert", en el texto de los fallos, y solo cuando lo hay', () => {
    const una = cuenta({ id: 'u1', email: 'ana@example.com' })
    const con = pintaEn(
      '/admin',
      <UserCard user={una} isMe={false} initialError="Could not save." />,
    )
    expect(con).toMatch(/<p role="alert" class="[^"]*text-bad[^"]*">Could not save\.<\/p>/)
    expect(pintaEn('/admin', <UserCard user={una} isMe={false} />)).not.toContain('role="alert"')
  })
})
