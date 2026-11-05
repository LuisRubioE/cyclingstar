import type { AdminWhoami, BlockedName, WorldHealth } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminNames } from './AdminNames'

/**
 * LA BASE DE NOMBRES CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21d), en estático con la
 * caché ya llena: la cabecera en `PageHeader`, con su vuelta de 44 al panel en lugar de la `←`; los campos,
 * `Field` con su rótulo a la vista, dentro de su `form`; los botones, `Button`; la salud del mundo en `Stat`,
 * y cada tick con su `Chip` `OK` o `Failed` en lugar del `✓` y el `✗` (3-d); y cada bloque en su `Panel`.
 */

const health: WorldHealth = {
  currentDay: 50,
  season: 0,
  worldCreatedAt: null,
  riders: { active: 3902, human: 3, bots: 3899, retired: 120, freeAgents: 410 },
  teams: { total: 219, human: 1, wt: 18, prs: 30, con: 171 },
  users: 5,
  recentTicks: [
    {
      startedAt: '2026-10-30T06:00:00Z',
      daysProcessed: 1,
      durationMs: 5400,
      ok: true,
      notes: null,
    },
    {
      startedAt: '2026-10-30T00:00:00Z',
      daysProcessed: 1,
      durationMs: 300,
      ok: false,
      notes: 'timeout',
    },
  ],
}

const blocked = (value: string, kind: 'team' | 'rider' = 'team'): BlockedName => ({
  id: value,
  kind,
  value,
  note: null,
  createdAt: '2026-10-01T00:00:00Z',
})

function page({
  session = true,
  teams = [blocked('UAE Team Emirates')],
  riders = [],
}: { session?: boolean; teams?: BlockedName[]; riders?: BlockedName[] } = {}): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const whoami: AdminWhoami = { ok: true, via: 'session', userId: 'u1' }
  client.setQueryData(['admin-whoami'], session ? whoami : null)
  client.setQueryData(['admin-health'], health)
  client.setQueryData(['blocklist', 'team'], teams)
  client.setQueryData(['blocklist', 'rider'], riders)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/names']}>
        <AdminNames />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El `Panel` del catálogo que lleva ese título, entero. */
const panel = (markup: string, title: string): string =>
  new RegExp(
    `<section data-ui="Panel"[^>]*>(?:(?!</section>)[\\s\\S])*?>${title}</h2>[\\s\\S]*?</section>`,
  ).exec(markup)?.[0] ?? ''

describe('la base de nombres con el sistema (§17.21; PR 21d)', () => {
  it('sin sesión de admin: el token en un Field con su rótulo a la vista, en su form, y Unlock, un Button que envía', () => {
    const markup = page({ session: false })
    expect(markup).toMatch(
      /<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>Admin — blocked names<\/h1>/,
    )
    expect(markup).toMatch(/<form[^>]*>[\s\S]*data-ui="Field"[\s\S]*<\/form>/)
    expect(markup).toMatch(/<label[^>]*for="admin-token"[^>]*>Admin token<\/label>/)
    expect(markup).not.toContain('sr-only">Admin token')
    expect(markup).toMatch(/<input[^>]*id="admin-token"[^>]*type="password"/)
    expect(markup).toMatch(/<button type="submit"[^>]*data-ui="Button"[\s\S]*?Unlock/)
  })

  it('con sesión: el PageHeader con su línea de estado y la vuelta de 44 al panel, sin la flecha de texto', () => {
    const markup = page()
    expect(markup).toMatch(/<h1[^>]*>Blocked names<\/h1>/)
    expect(markup).toContain('Names here are never generated')
    const back = /<a[^>]*href="\/admin"[^>]*>[\s\S]*?<\/a>/.exec(markup)?.[0] ?? ''
    expect(back).toContain('data-variant="chevron-left"')
    expect(back).toContain('min-h-11')
    expect(markup).not.toContain('←')
  })

  it('la salud del mundo, en su Panel, con sus cifras en Stat, en un renglón que parte', () => {
    const world = panel(page(), 'World health')
    expect(world).toMatch(/<div class="flex flex-wrap gap-x-6 gap-y-3[^"]*"><dl data-ui="Stat"/)
    expect(world).toMatch(/<dt[^>]*>Active riders<\/dt><dd[^>]*>3,902<\/dd>/)
    expect(world).toMatch(/<dt[^>]*>WT \/ PRS \/ CON<\/dt><dd[^>]*>18\/30\/171<\/dd>/)
  })

  it('cada tick, con su Chip: OK en good y Failed en bad, y sin el ✓ ni el ✗ (3-d)', () => {
    const ticks = panel(page(), 'Recent ticks')
    expect(ticks).toMatch(/data-ui="Chip" data-variant="good"[\s\S]*?>OK</)
    expect(ticks).toMatch(/data-ui="Chip" data-variant="bad"[\s\S]*?>Failed</)
    expect(ticks).not.toMatch(/[✓✗]/)
  })

  it('cada lista de bloqueo, en su Panel: el nombre nuevo en un Field con su ejemplo, Add, y cada nombre con su Remove', () => {
    const teams = panel(page(), 'Real team names')
    expect(teams).toMatch(/<form[^>]*>[\s\S]*data-ui="Field"[\s\S]*<\/form>/)
    expect(teams).toContain('e.g. UAE Team Emirates, Jumbo-Visma')
    expect(teams).toMatch(/<button type="submit"[^>]*data-ui="Button"[\s\S]*?Add/)
    expect(teams).toMatch(/<button[^>]*aria-label="Remove UAE Team Emirates"/)
    expect(panel(page(), 'Real riders &amp; famous people')).toContain('Nothing blocked yet.')
  })

  it('las cuentas premium, en su Panel: el correo en un Field con su rótulo, y Grant y Remove, Buttons', () => {
    const premium = panel(page(), 'Premium accounts')
    expect(premium).toMatch(/<input[^>]*type="email"/)
    expect(premium).toMatch(/data-ui="Button" data-variant="primary"[\s\S]*?Grant/)
    expect(premium).toMatch(/data-ui="Button" data-variant="secondary"[\s\S]*?Remove/)
  })

  it('ningún botón ni campo a mano: todos del catálogo', () => {
    const markup = page()
    const botones = markup.match(/<button\b[^>]*>/g) ?? []
    expect(botones.length).toBeGreaterThan(0)
    for (const b of botones)
      expect(b, b).toMatch(/data-ui="(Button|InfoButton|Disclosure)"|aria-controls/)
  })
})
