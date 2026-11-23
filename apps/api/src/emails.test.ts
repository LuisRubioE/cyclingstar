import type { PreStageInfo } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { escapeHtml, resetPasswordEmail, stageReadyEmail, verifyEmailEmail } from './emails.js'

const LINK_VERIFY = 'https://www.cyclingstar.app/verify-email#token=eyJ.abc.def'
const LINK_RESET = 'https://www.cyclingstar.app/reset-password#token=Ab3dEf6hIj9kLm2nOp5qRs8t'

/** El pie de los dos correos de cuenta, sin raya (docs/cuenta.md §5.7). */
const PIE = [
  'Cycling Star · a fictional cycling-manager game.',
  'This is an account email. Cycling Star never sends newsletters or game emails.',
]

describe('escapeHtml', () => {
  it('neutraliza las cinco que rompen el marcado', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })
})

/**
 * LOS DOS CORREOS, ENTEROS (docs/cuenta.md §5.7; PR 8): el asunto y el texto plano, tal cual, y en el
 * HTML el título, el botón con el `accent` de la web y el mismo pie.
 */
describe('los dos correos de cuenta, con su texto exacto', () => {
  it('verify_signup', () => {
    const mail = verifyEmailEmail(LINK_VERIFY)
    expect(mail.subject).toBe('Confirm your Cycling Star email')
    expect(mail.text.split('\n')).toEqual([
      'Your Cycling Star account has been approved. Confirm this address to finish creating it.',
      '',
      'Open this link and tap the button (it expires in 24 hours):',
      LINK_VERIFY,
      '',
      'If you did not ask for an account, ignore this email and nothing will happen.',
      '',
      ...PIE,
    ])
    expect(mail.html).toContain('>Confirm your email</h1>')
    expect(mail.html).toContain('>Confirm my email</a>')
  })

  it('reset_password', () => {
    const mail = resetPasswordEmail(LINK_RESET)
    expect(mail.subject).toBe('Reset your Cycling Star password')
    expect(mail.text.split('\n')).toEqual([
      'Someone asked to reset the password of your Cycling Star account.',
      '',
      'Open this link to choose a new one (it expires in one hour):',
      LINK_RESET,
      '',
      'Saving a new password signs you out on every device.',
      'If it was not you, ignore this email: your password stays as it is.',
      '',
      ...PIE,
    ])
    expect(mail.html).toContain('>Reset your password</h1>')
    expect(mail.html).toContain('>Choose a new password</a>')
  })

  for (const [nombre, mail, link] of [
    ['verify_signup', verifyEmailEmail(LINK_VERIFY), LINK_VERIFY],
    ['reset_password', resetPasswordEmail(LINK_RESET), LINK_RESET],
  ] as const) {
    describe(nombre, () => {
      /* Quien lee el texto plano no tiene botón: el enlace va en las dos versiones. */
      it('lleva el enlace en el HTML y en el texto plano', () => {
        expect(mail.text).toContain(link)
        expect(mail.html).toContain(`href="${escapeHtml(link)}"`)
      })

      it('el pie, sin raya, y el botón con el accent de la web, no el índigo de antes', () => {
        for (const linea of PIE) expect(mail.html).toContain(linea)
        expect(mail.html).not.toContain('—')
        expect(mail.html).toContain('background:#0b6e8a')
        expect(mail.html).not.toContain('#4f46e5')
      })

      /* Una imagen remota la bloquean los clientes de correo y delata cuándo se abre el mensaje. */
      it('no carga nada de fuera', () => {
        expect(mail.html).toContain('<!doctype html>')
        expect(mail.html).not.toContain('<img')
        expect(mail.html).not.toContain('<script')
      })
    })
  }
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
