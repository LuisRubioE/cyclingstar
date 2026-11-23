import { z } from 'zod'

/**
 * EL MODO AUSENCIA (docs/cuenta.md §14; PR 13 de E4). El jugador declara una fecha de vuelta; mientras dura
 * decide el entrenador (`manual` como `mixto`, §14.2), y entrar no la termina. Aquí, lo que comparten la API
 * y la web: las constantes de §16, los cuerpos y respuestas de `/api/me/away` y `/api/me/welcome-back`, y
 * las frases de las dos pantallas, escritas una vez sobre los datos que calcula el servidor (D-52).
 */

/** La ausencia más larga, en días reales: «ok 28 días reales» (DD-12; `00-encargo.md` §9.2). */
export const AWAY_MAX_DAYS = 28

/** Menos no es una ausencia (D-52): la vuelta, como pronto, dentro de 12 horas. */
export const AWAY_MIN_HOURS = 12

/** Los atajos de `Away`: una semana, dos y el máximo. **[sin evidencia]** (D-52). */
export const AWAY_SHORTCUT_DAYS = [7, 14, 28] as const

/**
 * Días de juego por día real, ESTIMADOS (§14.1): el reloj real lo pone `TICK_INTERVAL_MINUTES` (360 por
 * defecto, cuatro días de juego al día). Sirve para decir fechas reales aproximadas, nunca para el tick.
 */
export const GAME_DAYS_PER_REAL_DAY_ESTIMATE = 4

/** Lo que vive una oferta de contrato en días de juego (`OFFER_TTL_DAYS` de `contracts.ts`; X-20). */
export const OFFER_TTL_GAME_DAYS = 21

/** `PUT /api/me/away` (§14.1): la vuelta, un instante ISO con su desfase (las 00:00 locales del día). */
export const awayBodySchema = z.object({ until: z.string().datetime({ offset: true }) }).strict()

/**
 * Lo que las líneas de `Away` necesitan saber del jugador ese día (§14.1, la tabla): su corredor, si tiene
 * plan vivo y hasta cuándo (estimado en días reales), si es agente libre o su contrato vence, y si dirige
 * un equipo. Sin tocar el motor.
 */
export const awayFactsSchema = z.object({
  rider: z
    .object({
      name: z.string(),
      gender: z.enum(['M', 'F']),
      /** el último día del plan vivo, en tiempo real estimado; null sin plan vivo o en `entrenador` */
      planEndsAt: z.string().datetime().nullable(),
      freeAgent: z.boolean(),
      /** su contrato acaba esta temporada: le llegan ofertas */
      contractEnding: z.boolean(),
    })
    .nullable(),
  managesTeam: z.boolean(),
})
export type AwayFacts = z.infer<typeof awayFactsSchema>

/**
 * `GET`, `PUT /api/me/away` (§14.1; 14-b): la ausencia viva, o las dos a null sin ella, y los datos de las
 * líneas. `PUT` devuelve lo mismo.
 */
export const awayResponseSchema = z.object({
  ok: z.literal(true),
  awaySince: z.string().datetime().nullable(),
  awayUntil: z.string().datetime().nullable(),
  facts: awayFactsSchema,
})
export type AwayResponse = z.infer<typeof awayResponseSchema>

/** El 400 de `PUT /api/me/away` con la vuelta fuera de su ventana: la ventana, para el mensaje. */
export const awayRangeErrorSchema = z.object({
  ok: z.literal(false),
  error: z.literal('fecha_fuera_de_rango'),
  min: z.string().datetime(),
  max: z.string().datetime(),
})

/** `Welcome back` (§14.5): desde cuándo faltó y lo que pasó mientras. */
export const welcomeBackSchema = z.object({
  from: z.string().datetime(),
  /** días reales */
  days: z.number().int().nonnegative(),
  /** días de juego, estimados con `GAME_DAYS_PER_REAL_DAY_ESTIMATE` */
  gameDays: z.number().int().nonnegative(),
  rider: z
    .object({
      id: z.string(),
      name: z.string(),
      /** días de esos con una sesión de entrenamiento en `rider_daily_log` (ni carrera ni viaje) */
      trainedDays: z.number().int().nonnegative(),
      /** etapas corridas */
      stages: z.number().int().nonnegative(),
    })
    .nullable(),
  offers: z.object({
    expired: z.number().int().nonnegative(),
    open: z.number().int().nonnegative(),
    /** cuándo caduca la primera abierta, en tiempo real estimado */
    firstExpiresAt: z.string().datetime().nullable(),
  }),
})
export type WelcomeBack = z.infer<typeof welcomeBackSchema>

/** `GET /api/me/welcome-back` (14-d): null si no hay nada que decir. */
export const welcomeBackResponseSchema = z.object({
  ok: z.literal(true),
  welcomeBack: welcomeBackSchema.nullable(),
})
export type WelcomeBackResponse = z.infer<typeof welcomeBackResponseSchema>

const DIA_MS = 86_400_000

/** La ventana de la vuelta desde `now` (§14.1): `[now + AWAY_MIN_HOURS, now + AWAY_MAX_DAYS]`. */
export function awayWindow(now: Date): { readonly min: Date; readonly max: Date } {
  return {
    min: new Date(now.getTime() + AWAY_MIN_HOURS * 3_600_000),
    max: new Date(now.getTime() + AWAY_MAX_DAYS * DIA_MS),
  }
}

/** El instante real estimado de un día de juego, contado desde hoy (`currentDay` es ahora). */
export function gameDayToReal(gameDay: number, currentDay: number, now: Date): Date {
  return new Date(
    now.getTime() + ((gameDay - currentDay) / GAME_DAYS_PER_REAL_DAY_ESTIMATE) * DIA_MS,
  )
}

const posesivo = (gender: 'M' | 'F'): string => (gender === 'F' ? 'her' : 'his')
const objeto = (gender: 'M' | 'F'): string => (gender === 'F' ? 'her' : 'him')

/**
 * LAS LÍNEAS DE `While you're away` (§14.1, la tabla), en su orden y con los textos del diseño. `fecha`
 * escribe `25 Nov`. `Notifications stay quiet…` no sale hasta el PR 14 (18-c), ni la de la regla del mes
 * hasta el 15.
 */
export function awayLines(f: AwayFacts, fecha: (iso: string) => string): string[] {
  const lineas: string[] = []
  const r = f.rider
  if (r !== null) {
    lineas.push(
      r.planEndsAt !== null
        ? `Your plan runs until ${fecha(r.planEndsAt)}. After that your coach picks ${r.name}'s training.`
        : `Your coach picks ${r.name}'s training while you're away.`,
    )
    lineas.push(
      r.freeAgent
        ? `As a free agent, ${r.name} only races your national championship and the races you entered.`
        : `${r.name} races when ${posesivo(r.gender)} team picks ${objeto(r.gender)}, with automatic orders.`,
    )
    if (r.freeAgent || r.contractEnding)
      lineas.push(
        'Contract offers expire after about 5 days. You can still answer them if you drop by.',
      )
  }
  if (f.managesTeam)
    lineas.push(
      'Your team keeps its natural calendar. Nobody signs riders or changes plans for you.',
    )
  lineas.push('Emails to reset your password still arrive.')
  return lineas
}

const dias = (n: number, palabra: string): string => `${n} ${palabra}${n === 1 ? '' : 's'}`

/**
 * LAS FRASES DE `Welcome back` (§14.5). Sin corredor, solo los días; sin ofertas, sin la segunda línea.
 * Con 0 etapas corridas, la primera acaba en el entrenamiento; con ofertas abiertas y ninguna caducada, la
 * segunda dice `contract offer` en la abierta (el diseño no dibuja esos dos casos).
 */
export function welcomeBackLines(w: WelcomeBack, fecha: (iso: string) => string): string[] {
  const lineas: string[] = []
  if (w.rider === null) lineas.push(`You were away ${dias(w.days, 'day')}.`)
  else {
    const carreras = w.rider.stages > 0 ? ` and raced ${dias(w.rider.stages, 'stage')}` : ''
    lineas.push(
      `You were away ${dias(w.days, 'day')} (${dias(w.gameDays, 'game day')}). ${w.rider.name} trained on ${w.rider.trainedDays} of them${carreras}.`,
    )
    const { expired, open, firstExpiresAt } = w.offers
    const partes: string[] = []
    if (expired > 0) partes.push(`${dias(expired, 'contract offer')} expired.`)
    if (open > 0 && firstExpiresAt !== null) {
      const sujeto = expired > 0 ? '' : ` contract ${open === 1 ? 'offer' : 'offers'}`
      partes.push(
        open === 1
          ? `1${sujeto} is still open: answer by ${fecha(firstExpiresAt)}.`
          : `${open}${sujeto} are still open. The first expires on ${fecha(firstExpiresAt)}.`,
      )
    }
    if (partes.length > 0) lineas.push(partes.join(' '))
  }
  return lineas
}
