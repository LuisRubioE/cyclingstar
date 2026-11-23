import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'

/**
 * LAS CONDICIONES (docs/cuenta.md §4.6; DD-13 A, D-10; PR 9 de E4). Un borrador, sin dictamen legal: el dueño no
 * tiene abogado (`00-encargo.md` §9.6), y la cabecera lo dice. Quien se registra las acepta con la línea bajo
 * `Create account`, sin casilla, y la cuenta guarda la versión (`TERMS_VERSION`) y la hora. Como `Privacy`:
 * la cabecera en `PageHeader` y cada parte en su `Panel`, el primero la respuesta.
 *
 * Fuera, a propósito: «One account per person» y que un administrador «can close an account that breaks these
 * terms», que nadie ha decidido y son de E7 (§21.3, punto 2).
 */
export function Terms() {
  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader
        title="Terms"
        status="These terms are a draft and will be reviewed before public launch."
      />
      <Panel title="Who can play" answer>
        <p className="text-body text-ink-2">Cycling Star is for people aged 16 or over.</p>
      </Panel>
      <Panel title="A game">
        <p className="text-body text-ink-2">Riders, teams and races are fictional.</p>
      </Panel>
      <Panel title="Your rider and your team">
        <p className="text-body text-ink-2">
          If you delete your account or stop playing, your rider and your team stay in the world,
          run by the game. Your team keeps the name you gave it. An administrator can rename any
          team.
        </p>
      </Panel>
      <Panel title="Your account">
        <p className="text-body text-ink-2">
          New accounts are approved by an administrator before they can play. An administrator can
          change the email and the date of birth of an account. Every change an administrator makes
          is recorded.
        </p>
      </Panel>
      <Panel title="Emails">
        <p className="text-body text-ink-2">
          We only email you to confirm your address and to reset your password.
        </p>
      </Panel>
    </section>
  )
}
