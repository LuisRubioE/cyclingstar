import { Navigate } from 'react-router-dom'
import { SpoilerSettings, useSpoilerProtection } from '../../components/SpoilerSettings'
import { AccountSubpage } from './AccountSubpage'

/**
 * `Account › Spoiler protection` (docs/cuenta.md §12.2): el panel de E2, movido sin cambiar un texto. Es el
 * destino de `Manage` en los avisos de los agregados. Sin el velo para quien mira no hay nada que elegir, la
 * fila no sale en la lista y la página vuelve a `Account`.
 */
export function AccountSpoilers() {
  if (useSpoilerProtection().kind === 'off') return <Navigate to="/account" replace />
  return (
    <AccountSubpage title="Spoiler protection">
      <SpoilerSettings />
    </AccountSubpage>
  )
}
