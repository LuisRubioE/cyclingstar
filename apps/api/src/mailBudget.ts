import {
  type Database,
  type EmailKind,
  type MailBudgetRule,
  dailyCapFor,
  emailsToday,
  queueEmail,
  settleEmail,
} from '@cyclingstar/db'
import { limitKeys } from './limitKeys.js'
import type { MailJournal } from './mailer.js'
import {
  MAIL_DAILY_BUDGET_DEFAULT,
  MAIL_PER_RECIPIENT_HOUR,
  MAIL_RESERVE_PER_RECIPIENT,
  MAIL_RESET_RESERVE,
} from './security.js'

/**
 * EL PRESUPUESTO DE CORREO (L6) Y L5, SOBRE `email_log` (docs/cuenta.md §7.4 y §7.6; 7-f, 7-m).
 *
 * Dos sitios lo miran. El envío (`createMailJournal`): ningún correo sale si su buzón ya recibió tres en la
 * última hora o si el día UTC no le deja hueco, y la respuesta de la ruta no cambia. Y las puertas
 * (`mailBudgetOpen`): con el día gastado, `send-verification-email`, `request-password-reset` y la
 * aprobación del panel dan 503 `MAIL_BUDGET_EXHAUSTED` antes de hacer nada. Es un estado global, el mismo
 * para cualquier correo: no delata cuentas.
 */

/** El 503 de las rutas de `/api/auth` (§7.6 y §12.3): sin espera, porque mañana no es un número fijo. */
export const MAIL_BUDGET_EXHAUSTED_BODY = JSON.stringify({
  code: 'MAIL_BUDGET_EXHAUSTED',
  message: "We can't send emails right now. Try again tomorrow.",
})

/** Las cifras con un `MAIL_DAILY_BUDGET` dado. */
export function mailBudgetRule(dailyBudget: number = MAIL_DAILY_BUDGET_DEFAULT): MailBudgetRule {
  return {
    dailyBudget,
    resetReserve: MAIL_RESET_RESERVE,
    perRecipientHour: MAIL_PER_RECIPIENT_HOUR,
    reservePerRecipient: MAIL_RESERVE_PER_RECIPIENT,
  }
}

/** Si al día UTC le queda hueco para un correo de ese `kind` (60 para `verify_signup`, 90 para recuperar). */
export async function mailBudgetOpen(
  db: Database,
  kind: EmailKind,
  dailyBudget: number = MAIL_DAILY_BUDGET_DEFAULT,
  now: Date = new Date(),
): Promise<boolean> {
  return (await emailsToday(db, now)) < dailyCapFor(kind, dailyBudget, MAIL_RESET_RESERVE)
}

/** El `MailJournal` de `email_log`: L5, el presupuesto y la reserva por destinatario, y lo que dijo Resend. */
export function createMailJournal(
  db: Database,
  opts: { secret: string; dailyBudget?: number; now?: () => Date },
): MailJournal {
  const keys = limitKeys(opts.secret)
  const rule = mailBudgetRule(opts.dailyBudget)
  const now = opts.now ?? (() => new Date())
  return {
    async open(mail) {
      const r = await queueEmail(
        db,
        {
          kind: mail.kind,
          recipientHash: keys.rcpt(mail.to),
          userId: mail.userId,
          reserveKey: keys.rsv(mail.to),
        },
        rule,
        now(),
      )
      return r.ok ? r.id : null
    },
    async settle(id, outcome) {
      await settleEmail(db, id, outcome, now())
    },
  }
}
