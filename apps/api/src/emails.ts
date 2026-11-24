import type { MailMessage } from './mailer.js'

/**
 * Los dos correos de cuenta que manda la app (docs/cuenta.md §5.7). El de «etapa lista» de E2 salió con el
 * PR 14 de E4: es un aviso del navegador (`noticePayload`, §13.8), nunca un correo (D-00c). Son PLANTILLAS PURAS: reciben un enlace y devuelven
 * asunto, texto y HTML. Ni red, ni entorno, ni reloj — así se pueden probar enteras.
 *
 * Van en inglés porque la web está en inglés; el comentario es castellano, como el resto del
 * código. Cada correo lleva SIEMPRE las dos versiones: el texto plano no es un adorno, es lo que
 * leen los clientes que no pintan HTML y lo que distingue un correo transaccional legítimo de uno
 * que acaba en spam.
 */

/** Nombre del juego tal y como aparece en los asuntos y en la firma. */
const APP_NAME = 'Cycling Star'

/**
 * Escapa el texto que se incrusta en el HTML. El correo nuevo del usuario ES texto de usuario:
 * sin esto, una dirección con `<` rompería el mensaje (y en un cliente que ejecute HTML, más).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Maquetación común: tabla de una columna, estilos EN LÍNEA y nada de imágenes externas. Los
 * clientes de correo no cargan hojas de estilo ni entienden flexbox, y las imágenes remotas se
 * bloquean por defecto.
 */
function layout(opts: {
  title: string
  body: string
  cta: { label: string; url: string }
  footer: string
  /** Las líneas de debajo de la tarjeta; por defecto, la de antes. */
  pie?: readonly string[]
  /** El color del botón; por defecto, el índigo de antes. */
  accent?: string
}): string {
  const url = escapeHtml(opts.cta.url)
  const pie = opts.pie ?? [`${APP_NAME} — a fictional cycling-manager game.`]
  const accent = opts.accent ?? '#4f46e5'
  return [
    '<!doctype html>',
    '<html lang="en"><body style="margin:0;padding:24px;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0f172a">',
    '<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">',
    '<tr><td style="padding:32px">',
    `<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${escapeHtml(opts.title)}</h1>`,
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155">${opts.body}</p>`,
    `<p style="margin:0 0 20px"><a href="${url}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600">${escapeHtml(opts.cta.label)}</a></p>`,
    `<p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:#64748b">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${url}</span></p>`,
    `<p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8">${escapeHtml(opts.footer)}</p>`,
    '</td></tr></table>',
    `<p style="max-width:520px;margin:16px auto 0;font-size:11px;color:#94a3b8;text-align:center">${pie.map(escapeHtml).join('<br>')}</p>`,
    '</body></html>',
  ].join('')
}

/** El cuerpo de un correo sin destinatario: lo pone quien lo envía. */
export type MailBody = Omit<MailMessage, 'to'>

/**
 * El pie de los dos correos de cuenta, sin raya (docs/cuenta.md §5.7): qué es el juego y que no manda
 * más que esto. Va al final del texto plano y debajo de la tarjeta en el HTML.
 */
const PIE_CUENTA = [
  `${APP_NAME} · a fictional cycling-manager game.`,
  `This is an account email. ${APP_NAME} never sends newsletters or game emails.`,
] as const

/** El `accent` de la web (`--color-accent`, tema claro), y no el índigo de antes (mapa 05 §9). */
const ACCENT = '#0b6e8a'

/**
 * `reset_password` (§5.7). El enlace lleva a la página de botón con el token en el fragmento
 * (`/reset-password#token=`, §5.2): nada cambia hasta que se guarda la contraseña nueva. Caduca en una
 * hora (`RESET_TOKEN_TTL_S`) y se dice, porque si no quien lo abre al día siguiente cree que la app
 * está rota.
 */
export function resetPasswordEmail(link: string): MailBody {
  const aviso = 'Saving a new password signs you out on every device.'
  const siNo = 'If it was not you, ignore this email: your password stays as it is.'
  return {
    subject: `Reset your ${APP_NAME} password`,
    text: [
      `Someone asked to reset the password of your ${APP_NAME} account.`,
      '',
      'Open this link to choose a new one (it expires in one hour):',
      link,
      '',
      aviso,
      siNo,
      '',
      ...PIE_CUENTA,
    ].join('\n'),
    html: layout({
      title: 'Reset your password',
      body: `Someone asked to reset the password of your ${escapeHtml(APP_NAME)} account. Open this link to choose a new one (it expires in one hour).`,
      cta: { label: 'Choose a new password', url: link },
      footer: `${aviso} ${siNo}`,
      pie: PIE_CUENTA,
      accent: ACCENT,
    }),
  }
}

/**
 * `verify_signup` (§5.7). Sale cuando la cuenta ya está aprobada (§4.9): al aprobarla un administrador,
 * al pedir otro enlace y al entrar sin confirmar. El enlace lleva a la página de botón
 * (`/verify-email#token=`, §5.2): abrirlo no confirma nada, lo hace el botón. Caduca en 24 horas
 * (`EMAIL_JWT_TTL_S`).
 */
export function verifyEmailEmail(link: string): MailBody {
  const siNo = 'If you did not ask for an account, ignore this email and nothing will happen.'
  return {
    subject: `Confirm your ${APP_NAME} email`,
    text: [
      `Your ${APP_NAME} account has been approved. Confirm this address to finish creating it.`,
      '',
      'Open this link and tap the button (it expires in 24 hours):',
      link,
      '',
      siNo,
      '',
      ...PIE_CUENTA,
    ].join('\n'),
    html: layout({
      title: 'Confirm your email',
      body: `Your ${escapeHtml(APP_NAME)} account has been approved. Confirm this address to finish creating it. Open this link and tap the button (it expires in 24 hours).`,
      cta: { label: 'Confirm my email', url: link },
      footer: siNo,
      pie: PIE_CUENTA,
      accent: ACCENT,
    }),
  }
}
