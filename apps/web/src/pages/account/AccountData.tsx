import { Panel } from '../../components/ui/Panel'
import { AccountSubpage } from './AccountSubpage'

/**
 * `Account › Your data` (docs/cuenta.md §12.2): llega sin acción. La contraseña y `Download my data` llegan
 * con el PR 12, con `POST /api/me/export` (§10.5); hasta entonces la página dice qué será y nada más.
 */
export function AccountData() {
  return (
    <AccountSubpage title="Your data">
      <Panel ariaLabel="Your data" answer>
        <p className="text-meta text-ink-2">
          Download a copy of everything we keep about you, as a JSON file.
        </p>
      </Panel>
    </AccountSubpage>
  )
}
