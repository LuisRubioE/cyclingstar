import {
  type Eff,
  eff0,
  fitnessFactor,
  formStars,
  freshnessBar,
  matchCount,
} from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  type AttributeStars,
  type FormPoint,
  type HealthState,
  type OwnAttribute,
  type StageEffortView,
  type StageOrder,
  TREND_ARROW_CODE,
  type TrendCode,
  attrProgress,
  attrStars,
  formStarsScale,
  loadLevelOf,
  trendArrow,
} from '@cyclingstar/shared'

/**
 * LA FORMA DE PANTALLA, EN LA API (E3, docs/visual.md §13.5 y §13.7; D-53, D-55; PR 19b). Lo que la web
 * calculaba con los números internos, las estrellas y la marca de cada atributo, las dos barras del diario
 * y los cerillos del día, se calcula aquí con las funciones del motor, y la respuesta lleva solo su forma:
 * medias estrellas, la marca de cuarto de banda, barras enteras de 0 a 100, la carga en palabras y la flecha
 * en su código. Un número interno no cruza (§13.1).
 */

/** Los diez atributos de cualquier corredor, en medias estrellas (`attrStars`): nada más para un ajeno. */
export function attributeStars(
  attrs: Readonly<Record<Attribute, number>>,
): Record<Attribute, AttributeStars> {
  return Object.fromEntries(ATTRIBUTES.map((a) => [a, { stars: attrStars(attrs[a]) }])) as Record<
    Attribute,
    AttributeStars
  >
}

/** Los del corredor propio: sus estrellas y la marca de cuarto de banda (`attrProgress`; 13-b). */
export function ownAttributes(
  attrs: Readonly<Record<Attribute, number>>,
): Record<Attribute, OwnAttribute> {
  return Object.fromEntries(
    ATTRIBUTES.map((a) => [a, { stars: attrStars(attrs[a]), mark: attrProgress(attrs[a]) }]),
  ) as Record<Attribute, OwnAttribute>
}

/** El fondo en una barra de 0 a 100: el `fitnessFactor` del motor, que ya acota. */
const fitnessOf = (ctl: number): number => Math.round(100 * fitnessFactor(ctl))
/** La frescura en una barra de 0 a 100: la `freshnessBar` del motor, entera. */
const freshnessOf = (tsb: number): number => Math.round(freshnessBar(tsb))

/** Una fila del diario (`getDailyLog`), con las ciudades de la etapa si fue de carrera. */
export interface DiaryRow {
  readonly gameDay: number
  readonly ctl: number
  readonly atl: number
  readonly tsb: number
  readonly tss: number
  readonly activity: string
  readonly parte: StageEffortView | null
  readonly from?: string
  readonly to?: string
}

/**
 * Un día del diario en su forma de pantalla (§4.8, §10.7): el fondo y la frescura en barras enteras, lo
 * que hacía `conditionBars` en la web, y la carga en palabras (`loadLevelOf`). El ctl, la atl, el tsb y el
 * TSS se quedan aquí.
 */
export function conditionDay(row: DiaryRow): FormPoint {
  return {
    gameDay: row.gameDay,
    fitness: fitnessOf(row.ctl),
    freshness: freshnessOf(row.tsb),
    load: loadLevelOf(row.tss),
    activity: row.activity,
    parte: row.parte,
    ...(row.from === undefined ? {} : { from: row.from }),
    ...(row.to === undefined ? {} : { to: row.to }),
  }
}

/** La condición de hoy, la del panel `Condition`. */
export interface ConditionToday {
  readonly stars: number
  readonly freshness: number
  /** null sin la salud o sin la moral: la ficha dice `—` */
  readonly matches: number | null
}

/**
 * La condición de hoy, del último día del diario: la forma en medias estrellas (`formStars`), la frescura en
 * barra y los cerillos del día, la MISMA cuenta que hará la etapa (SPEC 6.6) sobre los atributos efectivos
 * de hoy, con la forma, la salud y la moral. Era la cuenta que hacía la web con los atributos con decimales.
 */
export function conditionToday(
  day: { readonly ctl: number; readonly tsb: number },
  health: HealthState | null,
  morale: number | null,
  attrs: Readonly<Record<Attribute, number>>,
): ConditionToday {
  const matches =
    health === null || morale === null
      ? null
      : matchCount(
          Object.fromEntries(
            ATTRIBUTES.map((a) => [a, eff0(attrs[a], day.ctl, day.tsb, health, morale)]),
          ) as Eff,
          day.tsb,
        )
  return { stars: formStars(day.ctl, day.tsb), freshness: freshnessOf(day.tsb), matches }
}

/** La flecha de 28 días, en su código (13-a): el Δ28 se queda aquí. */
export const trendCode = (delta28: number): TrendCode => TREND_ARROW_CODE[trendArrow(delta28)]

/**
 * La moral en medias estrellas (DD-12, §13.7), con la escala de la forma (`formStarsScale`, SPEC §3.2): es
 * una magnitud de 0 a 100 sin umbrales de dominio, como la forma, y su suelo de media estrella dice
 * «siempre hay algo».
 */
export const moraleStars = (morale: number): number => formStarsScale(morale)

/**
 * Una orden en su forma de pantalla (19c): sin el disparo `attack`, el único que nombra a un corredor. La web
 * no lo ofrece y lo pinta como «ninguno», así que sale como `null`.
 */
export function orderView(order: StageOrder): StageOrder {
  return order.triggerOn?.at === 'attack' ? { ...order, triggerOn: null } : order
}
