import type { AdminWhoami, Health, HorizonSummary } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Account, DeleteAccount } from './Account'
import { healthWith, horizonWith } from './__fixtures__/world'

/**
 * LA CUENTA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21f), en estático con la caché ya
 * llena y la sesión de better-auth sustituida: la cabecera en `PageHeader`; la protección de resultados, el
 * `Panel` que contesta a la 28 (§7.3), con sus dos elecciones en `Segmented` en lugar de los radios y la
 * casilla; el aviso del correo sin confirmar, un `Notice`; cada formulario en su `Panel`, con sus `Field` a
 * la vista y en 16 px y sus `Button`; y borrar la cuenta, en dos pasos.
 */

const sesion = vi.hoisted(() => ({
  user: { id: 'u1', email: 'luis@example.com', emailVerified: true } as {
    id: string
    email: string
    emailVerified: boolean
  } | null,
}))

vi.mock('../auth/client', () => ({
  authClient: {
    useSession: () => ({ data: sesion.user ? { user: sesion.user } : null, isPending: false }),
  },
}))

beforeEach(() => {
  sesion.user = { id: 'u1', email: 'luis@example.com', emailVerified: true }
})

function page({
  veil = true,
  horizon = {},
  admin = false,
  horizonLoading = false,
}: {
  veil?: boolean
  horizon?: Partial<HorizonSummary>
  admin?: boolean
  /** el horizonte, sin llegar todavía: su consulta, en espera */
  horizonLoading?: boolean
} = {}): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const health: Health = healthWith('on', veil ? 'on' : 'off')
  client.setQueryData(['health'], health)
  if (!horizonLoading) client.setQueryData(['horizon'], horizonWith(horizon))
  client.setQueryData(
    ['admin-whoami'],
    admin ? ({ ok: true, via: 'session', userId: 'u1' } as AdminWhoami) : null,
  )
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/account']}>
        <Account />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El `Panel` del catálogo que lleva ese título, entero. */
const panel = (markup: string, title: string): string =>
  new RegExp(
    `<section data-ui="Panel"[^>]*>(?:(?!</section>)[\\s\\S])*?>${title}</h2>[\\s\\S]*?</section>`,
  ).exec(markup)?.[0] ?? ''

/** Cuántos elementos dicen ser la respuesta de la pantalla (§7.3): uno, y no más. */
const respuestas = (markup: string): number => markup.match(/data-answer=""/g)?.length ?? 0

/** Las opciones de un `Segmented`, por su nombre, como `texto:estado`. */
const opciones = (markup: string, label: string): string[] => {
  const grupo =
    new RegExp(`<div role="radiogroup" aria-label="${label}"[\\s\\S]*?</div>`).exec(markup)?.[0] ??
    ''
  return [...grupo.matchAll(/aria-checked="(true|false)"[^>]*>([^<]+)<\/button>/g)].map(
    (m) => `${m[2]}:${m[1] === 'true' ? 'on' : 'off'}`,
  )
}

describe('la cuenta con el sistema (§17.21; PR 21f)', () => {
  it('la cabecera, un PageHeader con su línea de estado, en el ancho de los formularios', () => {
    const markup = page()
    expect(markup).toMatch(
      /<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>Account settings<\/h1>/,
    )
    expect(markup).toContain('>Manage your login details.</p>')
    expect(markup).toMatch(/^<section class="[^"]*max-w-form/)
  })

  it('una sola respuesta, la protección de resultados, con su ancla para Manage', () => {
    const markup = page()
    expect(respuestas(markup)).toBe(1)
    expect(markup).toMatch(/<div id="spoilers"><section data-ui="Panel"[^>]*data-answer=""/)
    expect(panel(markup, 'Spoiler protection')).toContain('data-answer=""')
  })

  it('sin velo para quien mira, sin la protección, y la respuesta es el correo', () => {
    const markup = page({ veil: false })
    expect(markup).not.toContain('Spoiler protection')
    expect(respuestas(markup)).toBe(1)
    expect(panel(markup, 'Email')).toContain('data-answer=""')
  })

  it('con velo, mientras llega el horizonte, la protección ya contesta, con su espera dentro, y no salta al llegar (la revisión del 21f)', () => {
    const markup = page({ horizonLoading: true })
    expect(respuestas(markup)).toBe(1)
    const spoilers = panel(markup, 'Spoiler protection')
    expect(spoilers).toContain('data-answer=""')
    expect(spoilers).toMatch(/data-ui="QueryView" data-state="loading"/)
    expect(spoilers).toContain('Loading your spoiler settings')
    expect(panel(markup, 'Email')).not.toContain('data-answer')
  })

  it('sin correo todavía, sin su Panel: contesta la contraseña sin velo, y la protección con él (la revisión del 21f)', () => {
    sesion.user = null
    const sinVelo = page({ veil: false })
    expect(sinVelo).not.toContain('>Email</h2>')
    expect(respuestas(sinVelo)).toBe(1)
    expect(panel(sinVelo, 'Password')).toContain('data-answer=""')
    const conVelo = page()
    expect(respuestas(conVelo)).toBe(1)
    expect(panel(conVelo, 'Spoiler protection')).toContain('data-answer=""')
  })

  it('cada alcance, marcado el suyo y con su pista: el de por defecto y el que no protege nada (la revisión del 21f)', () => {
    const guarded = page({ horizon: { scope: 'guarded' } })
    expect(opciones(guarded, 'Races to protect')).toEqual([
      'Yours and the big ones:on',
      'Only yours:off',
      'Nothing:off',
    ])
    expect(panel(guarded, 'Spoiler protection')).toMatch(
      /<p[^>]*>Your rider’s and your team’s races, the ones you follow, the three grand tours and the five monuments\.<\/p>/,
    )
    const off = page({ horizon: { scope: 'off' } })
    expect(opciones(off, 'Races to protect')).toEqual([
      'Yours and the big ones:off',
      'Only yours:off',
      'Nothing:on',
    ])
    expect(panel(off, 'Spoiler protection')).toMatch(
      /<p[^>]*>Results show as soon as each stage is raced\.<\/p>/,
    )
  })

  it('las tres pistas, juntas tras un InfoButton, para compararlas sin guardar ninguna (la revisión del 21f)', () => {
    const spoilers = panel(page({ horizon: { scope: 'own_only' } }), 'Spoiler protection')
    const info =
      /<span data-ui="InfoButton"[\s\S]*?aria-label="About the three options"[\s\S]*?<\/span><\/span>/.exec(
        spoilers,
      )?.[0] ?? ''
    expect(info).not.toBe('')
    for (const texto of [
      'Yours and the big ones',
      'the three grand tours and the five monuments',
      'Only yours',
      'and the ones you follow.',
      'Nothing',
      'Results show as soon as each stage is raced.',
    ])
      expect(info, texto).toContain(texto)
  })

  it('qué se protege, un Segmented en lugar de los radios, con la pista de la elegida a la vista', () => {
    const markup = page({ horizon: { scope: 'own_only' } })
    expect(opciones(markup, 'Races to protect')).toEqual([
      'Yours and the big ones:off',
      'Only yours:on',
      'Nothing:off',
    ])
    const spoilers = panel(markup, 'Spoiler protection')
    // la pista a la vista, la de la elegida: las tres juntas van tras el InfoButton
    expect(spoilers).toMatch(
      /<p[^>]*>Your rider’s and your team’s races, and the ones you follow\.<\/p>/,
    )
    expect(spoilers).not.toMatch(/<p[^>]*>[^<]*the three grand tours/)
    expect(markup).not.toMatch(/type="(radio|checkbox)"/)
  })

  it('preguntar antes de enseñar un resultado, otro Segmented, con su frase a la vista', () => {
    const si = page({ horizon: { revealConfirm: true } })
    expect(panel(si, 'Spoiler protection')).toMatch(/>Ask before showing a result</)
    expect(opciones(si, 'Ask before showing a result')).toEqual(['Yes:on', 'No:off'])
    expect(
      opciones(page({ horizon: { revealConfirm: false } }), 'Ask before showing a result'),
    ).toEqual(['Yes:off', 'No:on'])
  })

  it('el correo, en su Panel: con quién entro, un Field con su rótulo y su autocompletado, y Update email, que envía', () => {
    const email = panel(page(), 'Email')
    expect(email).toContain('luis@example.com')
    expect(email).toMatch(/<form[^>]*>[\s\S]*data-ui="Field"[\s\S]*<\/form>/)
    expect(email).toMatch(/<label for="new-email"[^>]*>New email<\/label>/)
    expect(email).toMatch(/<input id="new-email"[^>]*type="email"[^>]*autoComplete="email"/)
    // el botón, dentro de su form: fuera, no enviaría nada (la revisión del 21f)
    expect(email).toMatch(
      /<form[^>]*>(?:(?!<\/form>)[\s\S])*<button type="submit" data-ui="Button" data-variant="primary"(?:(?!<\/form>)[\s\S])*?Update email/,
    )
    // lo que conteste el servidor, en su región de estado, que está desde el principio, vacía: insertada ya
    // llena, el lector no siempre la lee (la revisión del 21f)
    expect(email).toMatch(/<p role="status" class="[^"]*"><\/p>/)
    // vacía, fuera de la vista pero en el lector: `hidden` la sacaría también de él (la revisión del 21j)
    expect(email).toMatch(/<p role="status" class="[^"]*empty:sr-only[^"]*"><\/p>/)
  })

  it('la contraseña, en su Panel: los tres campos con su rótulo y su autocompletado, y Update password', () => {
    const password = panel(page(), 'Password')
    for (const [id, label, auto] of [
      ['cur-pw', 'Current password', 'current-password'],
      ['new-pw', 'New password', 'new-password'],
      ['confirm-pw', 'Confirm new password', 'new-password'],
    ] as const) {
      expect(password).toMatch(new RegExp(`<label for="${id}"[^>]*>${label}</label>`))
      expect(password).toMatch(
        new RegExp(`<input id="${id}"[^>]*type="password"[^>]*autoComplete="${auto}"`),
      )
    }
    expect(password).toMatch(
      /<form[^>]*>(?:(?!<\/form>)[\s\S])*<button type="submit" data-ui="Button" data-variant="primary"(?:(?!<\/form>)[\s\S])*?Update password/,
    )
  })

  it('el correo sin confirmar, un Notice warn con su acción, y confirmado, nada', () => {
    sesion.user = { id: 'u1', email: 'luis@example.com', emailVerified: false }
    const markup = page()
    expect(markup).toMatch(
      /data-ui="Notice" data-variant="warn"[\s\S]*?>Your email is not confirmed<[\s\S]*?Send me a confirmation link/,
    )
    sesion.user = { id: 'u1', email: 'luis@example.com', emailVerified: true }
    expect(page()).not.toContain('Your email is not confirmed')
  })

  it('el panel de administración, un enlace de 44 sin la flecha, y solo con sesión de admin', () => {
    const markup = page({ admin: true })
    const enlace = /<a ([^>]*)>Admin panel<\/a>/.exec(markup)?.[1] ?? ''
    expect(enlace).toContain('href="/admin"')
    expect(enlace).toContain('data-ui="TextLink"')
    expect(enlace).toContain('min-h-11')
    expect(markup).not.toContain('→')
    expect(page()).not.toContain('Admin panel')
  })

  it('salir, un Button secundario', () => {
    expect(page()).toMatch(
      /<button type="button" data-ui="Button" data-variant="secondary"[\s\S]*?>Sign out</,
    )
  })

  it('borrar la cuenta, en su Panel y en dos pasos: primero Delete my account…', () => {
    const borrar = panel(page(), 'Delete account')
    expect(borrar).toContain('This cannot be undone.')
    expect(borrar).toMatch(/data-ui="Button"[\s\S]*?Delete my account…/)
    expect(borrar).not.toContain('delete-pw')
  })

  it('ningún botón ni campo a mano: todos del catálogo', () => {
    sesion.user = { id: 'u1', email: 'luis@example.com', emailVerified: false }
    const markup = page({ admin: true })
    const botones = markup.match(/<button\b[^>]*>/g) ?? []
    expect(botones.length).toBeGreaterThan(0)
    // el del InfoButton lleva su data-ui en su raíz, y se le reconoce por lo que gobierna (como en el 21d)
    for (const b of botones) expect(b, b).toMatch(/data-ui="Button"|role="radio"|aria-controls=/)
    expect(markup).not.toMatch(/<input(?![^>]*class="w-full rounded-ui)/)
  })
})

describe('borrar la cuenta, abierto (§17.21; PR 21f)', () => {
  const abierto = () =>
    renderToStaticMarkup(
      <MemoryRouter>
        <DeleteAccount defaultOpen />
      </MemoryRouter>,
    )

  it('la contraseña en su Field, y Delete my account for good en danger, que envía, con Cancel al lado', () => {
    const markup = abierto()
    expect(markup).toMatch(/<form[^>]*>[\s\S]*data-ui="Field"[\s\S]*<\/form>/)
    expect(markup).toMatch(/<label for="delete-pw"[^>]*>Password<\/label>/)
    expect(markup).toMatch(
      /<input id="delete-pw"[^>]*type="password"[^>]*autoComplete="current-password"/,
    )
    expect(markup).toMatch(
      /<form[^>]*>(?:(?!<\/form>)[\s\S])*<button type="submit" data-ui="Button" data-variant="danger"(?:(?!<\/form>)[\s\S])*?Delete my account for good/,
    )
    expect(markup).toMatch(
      /<button type="button" data-ui="Button" data-variant="quiet"[\s\S]*?>Cancel</,
    )
  })
})
