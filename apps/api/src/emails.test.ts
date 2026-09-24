import { describe, expect, it } from 'vitest'
import {
  changeEmailConfirmationEmail,
  escapeHtml,
  resetPasswordEmail,
  verifyEmailEmail,
} from './emails.js'

const URL_RESET =
  'https://www.cyclingstar.app/api/auth/reset-password/tok?callbackURL=%2Freset-password'

describe('escapeHtml', () => {
  it('neutraliza las cinco que rompen el marcado', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })
})

describe('plantillas de correo', () => {
  const todas = [
    ['recuperar contraseña', resetPasswordEmail(URL_RESET)],
    ['verificar correo', verifyEmailEmail(URL_RESET)],
    ['confirmar cambio', changeEmailConfirmationEmail(URL_RESET, 'nuevo@example.com')],
  ] as const

  for (const [nombre, mail] of todas) {
    describe(nombre, () => {
      /*
        El enlace es el correo: un mensaje sin él es un mensaje inútil, y el fallo se vería en el
        buzón de un usuario, no aquí. Se comprueba en las DOS versiones porque quien lee el texto
        plano no tiene botón donde pinchar.
      */
      it('lleva el enlace en el HTML y en el texto plano', () => {
        expect(mail.text).toContain(URL_RESET)
        expect(mail.html).toContain(escapeHtml(URL_RESET))
      })

      it('tiene asunto y las dos versiones con cuerpo', () => {
        expect(mail.subject.length).toBeGreaterThan(10)
        expect(mail.text.length).toBeGreaterThan(40)
        expect(mail.html).toContain('<!doctype html>')
      })

      /* Una imagen remota la bloquean los clientes de correo y delata cuándo se abre el mensaje. */
      it('no carga nada de fuera', () => {
        expect(mail.html).not.toContain('<img')
        expect(mail.html).not.toContain('<script')
      })
    })
  }

  it('el aviso de cambio nombra la dirección de destino, que es lo que permite frenarlo', () => {
    const mail = changeEmailConfirmationEmail(URL_RESET, 'nuevo@example.com')
    expect(mail.text).toContain('nuevo@example.com')
    expect(mail.html).toContain('nuevo@example.com')
  })

  /*
    El correo nuevo es texto de usuario y se incrusta en el HTML: sin escapar, una dirección con
    marcado dentro rompe (o secuestra) el mensaje que lee la víctima de un cambio no pedido.
  */
  it('escapa el correo nuevo antes de meterlo en el HTML', () => {
    const mail = changeEmailConfirmationEmail(URL_RESET, '"><script>alert(1)</script>@x.com')
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })

  it('el de recuperación dice que el enlace caduca, para que nadie crea que la app está rota', () => {
    expect(resetPasswordEmail(URL_RESET).text).toContain('expires in one hour')
  })
})
