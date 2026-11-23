import type { AdminAuditEntryView, AdminUser, AdminWhoami } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/request'
import { RenameTeam } from '../components/RenameTeam'
import { adminErrorMessage } from '../domain/adminErrors'
import { AdminPanel, Borrado, PendingRow, UserCard, auditLine, panelDate } from './AdminPanel'
import {
  PALETA,
  campo,
  cuantas,
  elementoEn,
  estado,
  pieza,
  pintaEn,
  titulo,
} from './__fixtures__/markup'

/**
 * EL PANEL DE ADMINISTRACIÓN CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21m), en estático
 * con la caché ya llena: la cabecera en `PageHeader`, con el enlace a la base de nombres en un `TextLink`; la
 * búsqueda, un `Field` con su rótulo a la vista; las cuentas, en un solo `Panel`, cada una un `li` de su lista,
 * con sus chapas en `Chip` y sus acciones en `Button`, con la cuenta en su nombre; y lo que no se puede (el
 * raíz, uno mismo), deshabilitado con su porqué debajo y no en un `title` (§4.1, regla `ui/4`).
 */

const SESION: AdminWhoami = { ok: true, via: 'session', userId: 'u-me' }

const ALTA = '2026-10-01T12:00:00Z'

const cuenta = (c: Partial<AdminUser> & Pick<AdminUser, 'id' | 'email'>): AdminUser => ({
  emailVerified: true,
  isAdmin: false,
  isRootAdmin: false,
  premium: false,
  status: 'approved',
  createdAt: ALTA,
  rider: null,
  team: null,
  ...c,
})

/**
 * Yo (admin por la columna), el raíz (`ADMIN_EMAIL`), una cuenta sin confirmar con premium, corredor y equipo,
 * una sin nada y otro admin, que no es ni yo ni el raíz.
 */
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
  cuenta({ id: 'u-cris', email: 'cris@example.com', isAdmin: true }),
]

/** La cola de aprobación (§4.9): dos peticiones, la más vieja primero. */
const COLA: readonly AdminUser[] = [
  cuenta({
    id: 'p1',
    email: 'eva@example.com',
    status: 'pending',
    emailVerified: false,
    createdAt: '2026-11-19T10:00:00Z',
  }),
  cuenta({
    id: 'p2',
    email: 'fer@example.com',
    status: 'pending',
    emailVerified: false,
    createdAt: '2026-11-20T10:00:00Z',
  }),
]

const fila = (
  e: Partial<AdminAuditEntryView> & Pick<AdminAuditEntryView, 'action' | 'detail'>,
): AdminAuditEntryView => ({
  id: `a-${e.action}`,
  at: '2026-11-19T18:42:00',
  actor: 'u-me',
  actorEmail: 'me@cyclingstar.test',
  targetUserId: 'u-ana',
  ...e,
})

/** `Recent changes`: un cambio de correo y una aprobación. */
const REGISTRO: readonly AdminAuditEntryView[] = [
  fila({
    action: 'user.email',
    detail: { field: 'email', from: 'old@example.com', to: 'new@example.com' },
  }),
  fila({ action: 'user.status', detail: { field: 'status', from: 'pending', to: 'approved' } }),
]

/** La página en `/admin`, con el acceso y las cuentas en la caché, cargando o con un fallo. */
function pinta(
  acceso: AdminWhoami | null | 'cargando' = SESION,
  cuentas: readonly AdminUser[] | 'cargando' | 'falla' = CUENTAS,
  cola: readonly AdminUser[] = COLA,
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
  client.setQueryData(['admin-pending'], cola)
  client.setQueryData(['admin-audit'], REGISTRO)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin']}>
        <AdminPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El `li` de una cuenta, entero, por su correo. */
const tarjeta = (markup: string, correo: string): string => {
  const donde = markup.indexOf(`>${correo}</span>`)
  return donde < 0 ? '' : elementoEn(markup, markup.lastIndexOf('<li class="', donde))
}

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
      email="ana@example.com"
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

  it('las cuentas, en un solo Panel: cada una, un li de su lista, con su correo y sus chapas en Chip', () => {
    const markup = pinta()
    // la cola, las cuentas y el registro: tres `Panel`, y las cuentas en uno solo
    expect(cuantas(markup, /data-ui="Panel"/)).toBe(3)
    const lista = pieza(markup, 'Panel', 'aria-label="Accounts"')
    expect(lista).toMatch(/^<section data-ui="Panel"[^>]*aria-label="Accounts"/)
    expect(lista).toMatch(/<ul class="divide-y divide-line">(?:<li class="[^"]*">)/)
    expect(cuantas(lista, /<li\b/)).toBe(CUENTAS.length)
    for (const u of CUENTAS) {
      expect(tarjeta(lista, u.email), u.email).toMatch(/^<li class="[^"]*">/)
      expect(tarjeta(lista, u.email)).not.toContain('data-ui="Panel"')
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
    expect(chip(tarjeta(markup, 'cris@example.com'), 'accent', 'admin')).toBe(true)
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

  it('lo que no se puede, deshabilitado con su porqué a la vista y sin title: el raíz y uno mismo, y otro admin no', () => {
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
    // un admin que no es uno mismo ni el raíz se puede quitar y borrar: listo, sin porqué
    const otro = tarjeta(markup, 'cris@example.com')
    for (const accion of ['Remove admin', 'Delete…']) {
      const boton = pieza(otro, 'Button', accion)
      expect(estadoDe(boton), accion).toBe('ready')
      expect(boton).not.toContain('aria-disabled')
    }
    expect(markup).not.toMatch(/\stitle="/)
  })

  it('los botones de cada cuenta, con la cuenta en su nombre, que empieza por lo que dice el botón (WCAG 2.5.3)', () => {
    const markup = pinta()
    const nombre = (correo: string, accion: string): string | null =>
      /\saria-label="([^"]+)"/.exec(pieza(tarjeta(markup, correo), 'Button', accion))?.[1] ?? null
    expect(nombre('ana@example.com', 'Confirm email')).toBe('Confirm email for ana@example.com')
    expect(nombre('ana@example.com', 'Remove premium')).toBe('Remove premium from ana@example.com')
    expect(nombre('bo@example.com', 'Grant premium')).toBe('Grant premium to bo@example.com')
    expect(nombre('bo@example.com', 'Make admin')).toBe('Make admin: bo@example.com')
    expect(nombre('cris@example.com', 'Remove admin')).toBe('Remove admin from cris@example.com')
    expect(nombre('bo@example.com', 'Delete…')).toBe('Delete bo@example.com…')
    // también los deshabilitados, y la pregunta de borrar
    expect(nombre('root@cyclingstar.test', 'Remove admin')).toBe(
      'Remove admin from root@cyclingstar.test',
    )
    const pregunta = borrado({ confirming: true })
    expect(pregunta).toContain('aria-label="Delete ana@example.com"')
    expect(pregunta).toContain('aria-label="Cancel deleting ana@example.com"')
    // cada nombre empieza por el texto del botón, sin sus puntos suspensivos
    const botones = [
      ...`${markup}${pregunta}`.matchAll(
        /<button\b[^>]*\saria-label="([^"]+)"[^>]*><span[^>]*>([^<]+)<\/span>/g,
      ),
    ]
    expect(botones.length).toBe(cuantas(markup, /<button\b/) + 2)
    for (const [, n = '', visible = ''] of botones)
      expect(n.startsWith(visible.replace(/…$/, '')), `${visible} → ${n}`).toBe(true)
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

/**
 * EL PANEL DE E4 (docs/cuenta.md §8.5; PR 5): la cola de aprobación arriba, `Change email` y `Rename team` en
 * cada cuenta, y `Recent changes` debajo de la lista; con los textos de la tabla del panel.
 */
describe('el panel de E4: la cola, el correo, el equipo y el registro (PR 5)', () => {
  it('abre con Waiting for approval (n), de la más vieja a la más nueva, con Requested y Approve y Reject…', () => {
    const markup = pinta()
    const cola = pieza(markup, 'Panel', 'Waiting for approval')
    expect(texto(cola)).toContain('Waiting for approval (2)')
    expect(markup.indexOf('Waiting for approval')).toBeLessThan(
      markup.indexOf('aria-label="Accounts"'),
    )
    expect(texto(cola).indexOf('eva@example.com')).toBeLessThan(
      texto(cola).indexOf('fer@example.com'),
    )
    expect(texto(cola)).toContain(`Requested ${panelDate('2026-11-19T10:00:00Z')}`)
    expect(panelDate('2026-11-19T10:00:00Z')).toBe('19 Nov 2026')
    expect(cola).toContain('aria-label="Approve eva@example.com"')
    expect(cola).toContain('aria-label="Reject eva@example.com…"')
    const vacia = pinta(SESION, CUENTAS, [])
    expect(texto(pieza(vacia, 'Panel', 'Waiting for approval'))).toContain(
      'Waiting for approval (0)',
    )
    expect(vacia).toContain('Nobody is waiting.')
  })

  it('rechazar pregunta antes, con su frase, y un fallo se dice con el texto de la tabla', () => {
    const pregunta = pintaEn('/admin', <PendingRow user={COLA[0]!} initialConfirm />)
    expect(texto(pregunta)).toContain(
      'Reject eva@example.com? The request is deleted and nothing is sent.',
    )
    expect(pieza(pregunta, 'Button', '>Reject<')).toContain('data-variant="danger"')
    const fallo = pintaEn(
      '/admin',
      <PendingRow
        user={COLA[0]!}
        initialError={adminErrorMessage(new ApiError('x', 409, 'no_pendiente'))}
      />,
    )
    expect(fallo).toMatch(/role="alert"[^>]*>This request was already decided\.</)
  })

  it('cada cuenta tiene Change email, Change date of birth (PR 9) y Rename team si tiene equipo', () => {
    const markup = pinta()
    const ana = tarjeta(markup, 'ana@example.com')
    expect(ana).toContain('aria-label="Change email for ana@example.com"')
    expect(ana).toContain('aria-label="Rename team Mistral Racing"')
    const bo = tarjeta(markup, 'bo@example.com')
    expect(bo).toContain('aria-label="Change email for bo@example.com"')
    expect(bo).not.toContain('Rename team')
    expect(ana).toContain('aria-label="Change date of birth for ana@example.com"')
    expect(bo).toContain('aria-label="Change date of birth for bo@example.com"')
  })

  it('Change date of birth: DateField vacío (nadie enseña la que había), Save y Cancel; los fallos, con su texto', () => {
    const una = cuenta({ id: 'u1', email: 'ana@example.com' })
    const form = pintaEn('/admin', <UserCard user={una} isMe={false} initialBirthDate />)
    const fecha = pieza(form, 'DateField', 'Date of birth')
    expect(fecha).toContain('id="birth-date-ana@example.com-day"')
    expect(fecha.match(/value=""/g)).toHaveLength(3)
    expect(pieza(form, 'Button', '>Save<')).toContain('type="submit"')
    expect(form).toContain('aria-label="Cancel changing the date of birth of ana@example.com"')
    expect(form).not.toContain('aria-label="Change date of birth for ana@example.com"')
    const error = (code: string) => adminErrorMessage(new ApiError('x', 400, code))
    expect(error('UNDER_MINIMUM_AGE')).toBe('Cycling Star is for people aged 16 or over.')
    expect(error('INVALID_BIRTH_DATE')).toBe('Enter a real date of birth.')
  })

  it('Change email: New email, Sign out everywhere encendida, Save y Cancel; y la pregunta antes de cambiar', () => {
    const una = cuenta({ id: 'u1', email: 'ana@example.com' })
    const form = pintaEn(
      '/admin',
      <UserCard user={una} isMe={false} initialEmail={{ value: '', confirm: false }} />,
    )
    expect(form).toMatch(/<label for="new-email-ana@example.com"[^>]*>New email<\/label>/)
    expect(form).toMatch(/data-ui="Checkbox"[^>]*data-state="active"[\s\S]*?Sign out everywhere/)
    expect(pieza(form, 'Button', '>Save<')).toContain('type="submit"')
    expect(form).toContain('>Cancel<')
    const pregunta = pintaEn(
      '/admin',
      <UserCard
        user={una}
        isMe={false}
        initialEmail={{ value: ' New@Example.com ', confirm: true }}
      />,
    )
    expect(texto(pregunta)).toContain(
      'Change ana@example.com to new@example.com? No email is sent to either address.',
    )
  })

  it('Rename team, abierto: Team name, Save y Cancel; los nombres que no valen, con su texto', () => {
    const abierto = pintaEn(
      '/admin',
      <RenameTeam
        teamId="t1"
        teamName="Mistral Racing"
        initialOpen
        initialError="That team name is taken in this world."
      />,
    )
    expect(abierto).toMatch(/<label for="rename-team-t1"[^>]*>Team name<\/label>/)
    expect(abierto).toContain('value="Mistral Racing"')
    expect(abierto).toContain('That team name is taken in this world.')
    const error = (code: string) => adminErrorMessage(new ApiError('x', 400, code))
    expect(error('nombre_repetido')).toBe('That team name is taken in this world.')
    expect(error('nombre_bloqueado')).toBe("That team name isn't allowed.")
    expect(error('admin_email_fijo')).toBe(
      "The email of a fixed administrator (ADMIN_EMAIL) can't be changed or given here.",
    )
    expect(error('correo_ocupado')).toBe('Another account already uses this email.')
    expect(error('es_el_admin_raiz')).toBe(
      "The fixed administrator's account can't be changed here.",
    )
    expect(adminErrorMessage(new ApiError('x', 409, 'es_el_admin_raiz'), 'delete')).toBe(
      'That is the root admin (ADMIN_EMAIL): it cannot be deleted from here.',
    )
  })

  it('Recent changes, debajo de la lista: fecha y hora · quién · campo · antes → después', () => {
    const markup = pinta()
    expect(markup.indexOf('aria-label="Accounts"')).toBeLessThan(markup.indexOf('Recent changes'))
    expect(texto(pieza(markup, 'Panel', 'Recent changes'))).toContain(
      '19 Nov 2026, 18:42 · me@cyclingstar.test · email · old@example.com → new@example.com',
    )
    expect(
      auditLine(
        fila({ action: 'user.birth_date', detail: { field: 'birthDate', from: null, to: null } }),
      ),
    ).toBe('19 Nov 2026, 18:42 · me@cyclingstar.test · date of birth · changed')
    expect(
      auditLine(
        fila({
          action: 'world.tick',
          actor: 'token',
          actorEmail: null,
          detail: { field: 'days', from: null, to: 1 },
        }),
      ),
    ).toBe('19 Nov 2026, 18:42 · token · tick · 1 day')
  })
})
