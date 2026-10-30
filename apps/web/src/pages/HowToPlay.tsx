import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { StarRating } from '../components/ui/StarRating'

/** Onboarding (Paso 41): explica estrellas, cerillos y forma en tres tarjetas, para que un recién
 * llegado cree su ciclista y deje órdenes sin ayuda.
 *
 * Con el sistema desde el 21j (E3, docs/visual.md §17.21): la cabecera en `PageHeader`; cada idea en su
 * `Panel`, el primero la respuesta de la 33 (§7.3), con las estrellas del catálogo y sin los emoji de los
 * cerillos y de la forma (3-d: «nada en `HowToPlay`»); y las dos salidas en `Button`. */
export function HowToPlay() {
  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader
        title="How to play"
        status="You are one professional cyclist, from age 18 to retirement. Train, race, sign contracts, build a palmarès. Three ideas are all you need to start."
      />

      <Panel title="Stars — how good you are" answer>
        <div className="grid gap-2">
          <StarRating value={3.5} size={20} />
          <p className="text-body text-ink-2">
            Every ability (climbing, sprinting, time-trialling…) is shown in stars, never raw
            numbers. More stars means more potential in that terrain. You never see the exact value
            — scouting and racing reveal it over time. Young riders have room to grow; veterans are
            already made.
          </p>
        </div>
      </Panel>

      <Panel title="Matches — your efforts in a race">
        <p className="text-body text-ink-2">
          In a race you have a limited number of &quot;matches&quot; to burn: each attack, each
          surge to hold a wheel, each dig on a climb spends one. Burn them wisely — light one too
          early and you have nothing left for the finish. Your orders tell the auto-pilot how
          aggressively to race.
        </p>
      </Panel>

      <Panel title="Form — training vs. freshness">
        <p className="text-body text-ink-2">
          Training hard builds fitness but leaves you tired — you improve yet race worse in the
          short term. Easing off before a goal keeps the fitness but sheds the fatigue, putting you
          in the sweet spot of freshness. Peaking for the right race is a skill: queue your training
          and watch the form chart on your profile.
        </p>
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Button to="/create" variant="primary">
          Create your rider
        </Button>
        <Button to="/me/training">Set training orders</Button>
      </div>
    </section>
  )
}
