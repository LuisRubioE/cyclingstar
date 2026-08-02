/** Aviso de privacidad (SPEC 12, Paso 42). Texto informativo; revisar con la ley aplicable antes
 * del lanzamiento público. */
export function Privacy() {
  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Privacy</h1>
      <p className="text-sm text-slate-600">
        Cycling Star is a personal, non-commercial project. We keep data collection to the minimum
        needed to run the game.
      </p>

      <div className="space-y-3 text-sm text-slate-600">
        <div>
          <h2 className="font-semibold text-slate-800">What we store</h2>
          <p>
            Your email address and an encrypted password (for your account), and your in-game data
            (your rider, training orders, results). That's it.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Your IP address</h2>
          <p>
            When you create a rider we may look up your country from your IP to pre-select a flag.
            The lookup is transient — your IP address is not stored.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Cookies</h2>
          <p>Only a session cookie to keep you logged in. No third-party tracking or ad cookies.</p>
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Deleting your data</h2>
          <p>
            Ask and your account and rider data will be removed. Backups roll off on their retention
            window.
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        This notice is informational and will be reviewed against applicable law before public
        launch.
      </p>
    </section>
  )
}
