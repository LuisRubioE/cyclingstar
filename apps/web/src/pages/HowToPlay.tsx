import { Link } from 'react-router-dom'
import { StarRating } from '../components/StarRating'

/** Onboarding (Paso 41): explica estrellas, cerillos y forma en tres tarjetas, para que un recién
 * llegado cree su ciclista y deje órdenes sin ayuda. */
export function HowToPlay() {
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">How to play</h1>
        <p className="mt-1 text-sm text-slate-500">
          You are one professional cyclist, from age 18 to retirement. Train, race, sign contracts,
          build a palmarès. Three ideas are all you need to start.
        </p>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-3">
          <StarRating value={3.5} />
          <h2 className="text-base font-semibold text-slate-800">Stars — how good you are</h2>
        </div>
        <p className="text-sm text-slate-600">
          Every ability (climbing, sprinting, time-trialling…) is shown in stars, never raw numbers.
          More stars means more potential in that terrain. You never see the exact value — scouting
          and racing reveal it over time. Young riders have room to grow; veterans are already made.
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-3">
          <span className="text-xl" aria-hidden>
            🔥🔥🔥
          </span>
          <h2 className="text-base font-semibold text-slate-800">
            Matches — your efforts in a race
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          In a race you have a limited number of "matches" to burn: each attack, each surge to hold
          a wheel, each dig on a climb spends one. Burn them wisely — light one too early and you
          have nothing left for the finish. Your orders tell the auto-pilot how aggressively to
          race.
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-3">
          <span className="text-xl" aria-hidden>
            📈
          </span>
          <h2 className="text-base font-semibold text-slate-800">Form — training vs. freshness</h2>
        </div>
        <p className="text-sm text-slate-600">
          Training hard builds fitness but leaves you tired — you improve yet race worse in the
          short term. Easing off before a goal keeps the fitness but sheds the fatigue, putting you
          in the sweet spot of freshness. Peaking for the right race is a skill: queue your training
          and watch the form chart on your profile.
        </p>
      </article>

      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          to="/create"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Create your rider
        </Link>
        <Link
          to="/training"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Set training orders
        </Link>
      </div>
    </section>
  )
}
