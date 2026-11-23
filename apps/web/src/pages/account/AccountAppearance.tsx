import { Panel } from '../../components/ui/Panel'
import { Segmented } from '../../components/ui/Segmented'
import { useTheme } from '../../theme'
import { AccountSubpage } from './AccountSubpage'

/** Los dos modos, en pantalla (E3, docs/visual.md §3.3, D-00i). */
const MODOS = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
] as const

/**
 * `Account › Appearance` (docs/cuenta.md §12.2): el panel de E3, movido sin cambiar un texto. Claro u oscuro,
 * que se ve al momento y se guarda en la cuenta para que siga al jugador a otro aparato. No depende del velo.
 */
export function AccountAppearance() {
  const { theme, setTheme, saveFailed } = useTheme()
  return (
    <AccountSubpage title="Appearance">
      <Panel title="Appearance" answer>
        <div className="grid gap-1">
          <Segmented label="Appearance" options={MODOS} value={theme} onChange={setTheme} />
          {saveFailed && (
            <p role="alert" className="text-meta text-bad">
              Could not save your appearance.
            </p>
          )}
        </div>
      </Panel>
    </AccountSubpage>
  )
}
