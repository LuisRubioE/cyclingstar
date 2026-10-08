import type { PreStageInfo } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  changeEmailConfirmationEmail,
  escapeHtml,
  resetPasswordEmail,
  stageReadyEmail,
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

/**
 * «ETAPA LISTA PARA VER» (E2, docs/retransmision.md §11.9 y §11.19; D-42, DD-10, 11-d; paso 9a). La
 * plantilla y su test son de E2; el envío es de E4 y sigue apagado (nadie la llama todavía). Asunto,
 * primera línea, botón y pie, y que no lleve el resultado: solo recibe la `PreStageInfo` y si el
 * corredor propio está en la LISTA DE SALIDA, así que por tipo no cabe; el canario de B1a lo mira con el
 * ganador de verdad (`spoilerCanary.test.ts`).
 */
describe('stageReadyEmail', () => {
  const p7: PreStageInfo = {
    raceName: 'Race France',
    season: 0,
    stageDay: 7,
    stageCount: 21,
    km: 187.4,
    label: 'Summit finish',
    stageKind: 'reina',
  }
  const WATCH_URL = 'https://www.cyclingstar.app/world/races/race-france/stages/7'
  const mail = stageReadyEmail('en', p7, true, WATCH_URL)

  it('asunto, primera línea, botón y pie, como dice §11.9', () => {
    expect(mail.subject).toBe('Stage 7 of Race France is ready to watch')
    expect(mail.text.split('\n')).toEqual([
      '187 km · mountain stage · your rider is on the start list',
      '',
      'Watch it here:',
      WATCH_URL,
      '',
      'Results stay hidden until you watch the stage.',
    ])
    expect(mail.html).toContain('>Watch</a>')
    expect(mail.html).toContain(`href="${escapeHtml(WATCH_URL)}"`)
    expect(mail.html).toContain('Results stay hidden until you watch the stage.')
    expect(mail.html).toContain('<!doctype html>')
    expect(mail.html).not.toContain('<img')
  })

  it('sin el corredor propio en la lista de salida, la línea se queda en el recorrido', () => {
    expect(stageReadyEmail('en', p7, false, WATCH_URL).text.split('\n')[0]).toBe(
      '187 km · mountain stage',
    )
  })

  it('no lleva más que el recorrido: ni la etiqueta del final ni ningún adjetivo de lo que pasó', () => {
    for (const part of [mail.subject, mail.text, mail.html])
      expect(part).not.toMatch(/Summit finish|dramatic|quiet|historic|won|winner/i)
  })
})
