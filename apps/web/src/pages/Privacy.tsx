import type { ReactNode } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'

/** La fecha del último PR que cambió este texto (docs/cuenta.md §10.1, `<date>`). */
export const PRIVACY_UPDATED = 'November 23, 2026'

/** Una lista del aviso: cada punto, un párrafo del cuerpo. */
function Puntos({ children }: { children: ReactNode }) {
  return <ul className="text-body text-ink-2 grid list-disc gap-1 pl-5">{children}</ul>
}

/**
 * Aviso de privacidad (SPEC 12, Paso 42; desde E4, docs/cuenta.md §10.1). Con el sistema desde el 21j
 * (E3, docs/visual.md §17.21): la cabecera en `PageHeader` y cada parte en su `Panel`, el primero la
 * respuesta (§7.3).
 *
 * El PR 3 de E4 pone el texto de §10.1 SOLO con las frases que ya son verdad (§10.2): cada PR
 * siguiente añade la suya. Se retira `Ask and your account and rider data will be removed.`, que
 * prometía un canal que no existe (§11.2; D-00b), y no hay copias de seguridad (plan Hobby), así que
 * la frase de las copias es `Backups are not kept.`
 */
export function Privacy() {
  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader
        title="Privacy"
        status={`Last updated ${PRIVACY_UPDATED}. Cycling Star is a personal, non-commercial project run by one person.`}
      />

      <Panel title="What we keep about you" answer>
        <Puntos>
          <li>
            Your email address, and your password stored as a one-way hash (we can&apos;t read it).
          </li>
          <li>
            Your rider, your team and everything you do in the game: training, plans, the races you
            follow and how far you&apos;ve watched them, and your settings.
          </li>
          <li>
            For each device you&apos;re signed in on: the browser and system it reported, and when
            you signed in and last used it.
          </li>
        </Puntos>
      </Panel>
      <Panel title="Your IP address">
        <p className="text-body text-ink-2">
          When you create a rider we may ask a public service (ipinfo.io, ipwho.is or ipapi.co) for
          your country to pre-select a flag; our server keeps the answer in memory for a few hours.
        </p>
      </Panel>
      <Panel title="Cookies and storage">
        <Puntos>
          <li>
            A session cookie keeps you signed in: 30 days, renewed while you play, never more than
            90.
          </li>
          <li>A viewer cookie keeps results hidden until you watch them: 90 days.</li>
          <li>Your browser also stores your theme and a few display choices.</li>
        </Puntos>
        <p className="text-body text-ink-2">No third-party tracking or advertising cookies.</p>
      </Panel>
      <Panel title="Who else handles your data">
        <p className="text-body text-ink-2">
          Railway hosts the game, its database and its logs. Resend delivers our emails.
        </p>
      </Panel>
      <Panel title="Your data, your choice">
        <Puntos>
          <li>
            Delete your account: Account, Delete account. Your email, password, sessions, devices
            and settings are deleted at once. Your rider and your team stay in the world, run by the
            game, and your team keeps its name. Backups are not kept.
          </li>
        </Puntos>
      </Panel>

      <p className="text-meta text-ink-2">We don&apos;t offer a contact channel yet.</p>
      <p className="text-meta text-ink-2">
        This notice will be reviewed against applicable law before public launch.
      </p>
    </section>
  )
}
