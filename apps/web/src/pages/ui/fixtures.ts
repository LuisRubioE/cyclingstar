/**
 * LOS DATOS FIJOS DE `/_ui` (E3, docs/visual.md §5.4; PR 9a, D-10): los casos difíciles, medidos, para
 * que cada estado se vea en lo peor que le va a tocar y sin llamar a la API. El 9b añade los suyos (el
 * nombre de corredor más largo del mundo de prueba, 28 caracteres; el título más largo, de 59; la
 * clasificación de 140 filas con la fila propia en el puesto 34) y el 10, una consulta en cada uno de
 * sus seis estados.
 */

/** Una consecuencia de la `ActionBar` que a 320 px pide tres renglones y corta en dos (§4.3). */
export const LONG_CONSEQUENCE =
  'Race Sardegna: Fine (was Loaded) · Race Var: Spot on (was Fine) · 2 travel days (1 out, 1 back)'

/** La de cada día: `Race Var: Fine (was Loaded)`. */
export const SHORT_CONSEQUENCE = 'Race Var: Fine (was Loaded)'

/** Lo que se vio por última vez, para `OfflineBanner`: las 14:02 en la hora de la prueba (Madrid). */
export const SEEN_AT = Date.UTC(2026, 9, 25, 13, 2)

/** Muchas pestañas: el carril se desplaza y se desvanece por la derecha (§4.4). */
export const MANY_TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'training', label: 'Training' },
  { key: 'orders', label: 'Race orders' },
  { key: 'races', label: 'My races' },
  { key: 'contract', label: 'Contract' },
  { key: 'finances', label: 'Finances' },
] as const

/** El modo del plan, en un `Segmented` de tres (`PlanLadder.tsx` l. 50-54). */
export const PLAN_MODES = [
  { key: 'coach', label: 'Coach decides' },
  { key: 'mixed', label: 'Mixed' },
  { key: 'me', label: 'I decide' },
] as const
