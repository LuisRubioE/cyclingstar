import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'

/** Aviso de privacidad (SPEC 12, Paso 42). Texto informativo; revisar con la ley aplicable antes
 * del lanzamiento público.
 *
 * Con el sistema desde el 21j (E3, docs/visual.md §17.21): la cabecera en `PageHeader` y cada parte en su
 * `Panel`, el primero la respuesta (§7.3). */
export function Privacy() {
  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader
        title="Privacy"
        status="Cycling Star is a personal, non-commercial project. We keep data collection to the minimum needed to run the game."
      />

      <Panel title="What we store" answer>
        <p className="text-body text-ink-2">
          Your email address and an encrypted password (for your account), and your in-game data
          (your rider, training orders, results). That&apos;s it.
        </p>
      </Panel>
      <Panel title="Your IP address">
        <p className="text-body text-ink-2">
          When you create a rider we may look up your country from your IP to pre-select a flag. Our
          server asks a public IP-to-country service (ipapi.co, ipinfo.io or ipwho.is) for the
          two-letter country code. The lookup is transient — your IP address is not stored, and the
          country we guess is always yours to change.
        </p>
      </Panel>
      <Panel title="Cookies">
        <p className="text-body text-ink-2">
          Only a session cookie to keep you logged in. No third-party tracking or ad cookies.
        </p>
      </Panel>
      <Panel title="Deleting your data">
        <p className="text-body text-ink-2">
          Ask and your account and rider data will be removed. Backups roll off on their retention
          window.
        </p>
      </Panel>

      <p className="text-meta text-ink-2">
        This notice is informational and will be reviewed against applicable law before public
        launch.
      </p>
    </section>
  )
}
