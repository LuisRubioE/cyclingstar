import type { MailMessage } from './mailer.js'

/**
 * Los tres correos que manda la app. Son PLANTILLAS PURAS: reciben un enlace y devuelven
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
}): string {
  const url = escapeHtml(opts.cta.url)
  return [
    '<!doctype html>',
    '<html lang="en"><body style="margin:0;padding:24px;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0f172a">',
    '<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">',
    '<tr><td style="padding:32px">',
    `<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${escapeHtml(opts.title)}</h1>`,
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155">${opts.body}</p>`,
    `<p style="margin:0 0 20px"><a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600">${escapeHtml(opts.cta.label)}</a></p>`,
    `<p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:#64748b">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${url}</span></p>`,
    `<p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8">${escapeHtml(opts.footer)}</p>`,
    '</td></tr></table>',
    `<p style="max-width:520px;margin:16px auto 0;font-size:11px;color:#94a3b8;text-align:center">${APP_NAME} — a fictional cycling-manager game.</p>`,
    '</body></html>',
  ].join('')
}

/** El cuerpo de un correo sin destinatario: lo pone quien lo envía. */
export type MailBody = Omit<MailMessage, 'to'>

/**
 * Recuperar la contraseña. El enlace caduca en una hora (el defecto de better-auth) y se dice,
 * porque si no el usuario que lo abre al día siguiente cree que la app está rota.
 */
export function resetPasswordEmail(url: string): MailBody {
  return {
    subject: `Reset your ${APP_NAME} password`,
    text: [
      `Someone asked to reset the password of your ${APP_NAME} account.`,
      '',
      'Open this link to choose a new one (it expires in one hour):',
      url,
      '',
      'If it was not you, ignore this email: your password stays as it is.',
    ].join('\n'),
    html: layout({
      title: 'Reset your password',
      body: `Someone asked to reset the password of your ${escapeHtml(APP_NAME)} account. The link below expires in one hour.`,
      cta: { label: 'Choose a new password', url },
      footer: 'If it was not you, ignore this email: your password stays as it is.',
    }),
  }
}

/**
 * Verificar la dirección. Se manda al registrarse, al intentar entrar sin haber confirmado y al
 * cambiar de correo (a la dirección NUEVA). Confirmar ya no es opcional: sin ello no se entra, y
 * en el cambio de correo el enlace es lo que APLICA el cambio. Por eso el texto dice «para usarla
 * en tu cuenta» y no sólo «verificar».
 */
export function verifyEmailEmail(url: string): MailBody {
  return {
    subject: `Confirm your ${APP_NAME} email`,
    text: [
      `Confirm this address to use it with your ${APP_NAME} account.`,
      'You need to do it before you can log in with it.',
      '',
      'Open this link (it expires in one hour):',
      url,
      '',
      'If you did not ask for this, ignore this email.',
    ].join('\n'),
    html: layout({
      title: 'Confirm your email',
      body: `Confirm this address to use it with your ${escapeHtml(APP_NAME)} account. You need to do it before you can log in with it. The link below expires in one hour.`,
      cta: { label: 'Confirm my email', url },
      footer: 'If you did not ask for this, ignore this email.',
    }),
  }
}

/**
 * Confirmar un cambio de correo. Este va a la dirección ACTUAL (la ya verificada), no a la nueva:
 * es el aviso que permite frenar a quien haya entrado en una sesión ajena, así que nombra la
 * dirección de destino.
 */
export function changeEmailConfirmationEmail(url: string, newEmail: string): MailBody {
  return {
    subject: `Confirm the new email of your ${APP_NAME} account`,
    text: [
      `Someone asked to move your ${APP_NAME} account to ${newEmail}.`,
      '',
      'Open this link to approve the change:',
      url,
      '',
      'If it was not you, ignore this email and change your password: your address stays as it is.',
    ].join('\n'),
    html: layout({
      title: 'Confirm your new email',
      body: `Someone asked to move your ${escapeHtml(APP_NAME)} account to <strong>${escapeHtml(newEmail)}</strong>.`,
      cta: { label: 'Approve the change', url },
      footer:
        'If it was not you, ignore this email and change your password: your address stays as it is.',
    }),
  }
}
