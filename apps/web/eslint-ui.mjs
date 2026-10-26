/**
 * LAS DIEZ REGLAS DEL SISTEMA (E3, docs/visual.md §5.3; PR 8). Diez prohibiciones como selectores de
 * `no-restricted-syntax`, cada una con un mensaje que empieza por su número, para que los avisos se
 * cuenten por regla. `eslint.config.js` las pone en dos bloques: en `error` para todo
 * `apps/web/src/**` (salvo los tests y sus `__fixtures__`, `components/ui/**`, que es el sistema, y los
 * `*.generated.ts`) y, detrás, en `warn` para los ficheros de `UI_HEREDADOS`, que hoy ya tienen alguno:
 * un fichero nuevo nace en `error` y uno heredado avisa sin parar el CI. `heredados.test.ts` falla si uno
 * de la lista ya no tiene ningún aviso, así que la lista solo encoge; el paso 22 la vacía.
 *
 * Los mensajes van en inglés, como los del lint de hoy (5-e). En los selectores, `esquery` no admite una
 * `/` suelta dentro de una expresión regular: por eso va como `\x2F`.
 */

/**
 * LOS ARBITRARIOS QUE SE QUEDAN (§5.1, decisión 5-a): lo que ningún token puede expresar. Los leen la
 * regla `ui/7` y `vocabulario.test.ts`, que cuenta como deuda cualquier otro. Ningún otro: seis.
 */
export const ARBITRARY_ALLOWED = [
  { value: 'pt-[env(safe-area-inset-top)]', reason: 'el área segura, que ningún token expresa' },
  { value: 'pb-[env(safe-area-inset-bottom)]', reason: 'el área segura, que ningún token expresa' },
  { value: 'pb-[var(--fixed-bottom)]', reason: 'la suma medida de lo fijo, en `main` (§4.9)' },
  {
    value: 'bottom-[var(--action-bar-bottom)]',
    reason: 'el sitio de la ActionBar, sobre la BottomNav y el área segura (§4.9; Rcodigo-017)',
  },
  {
    value: '@max-[4.75rem]:',
    reason:
      'la consulta de contenedor de cada destino de BottomNav: el rótulo corto por debajo de 76 px (§6.3; Ruso-014)',
  },
  {
    value: '[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]',
    reason: 'la máscara del desvanecido de Tabs, mientras haya más pestañas (§4.4)',
  },
]

/** Una cadena, escapada para ir tal cual dentro de una expresión regular y sin `/` suelta (esquery). */
const literal = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('/', '\\x2F')

/** Los colores de la paleta de Tailwind, que el tema no declara (§3; `cyan`, sin paso, sí es un token). */
const PALETA =
  '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'

/** Las utilidades de color, con los lados del borde. */
const DE_COLOR =
  '(?:text|bg|border(?:-[xytrblse])?|ring|ring-offset|divide|from|to|via|fill|stroke|outline|decoration|placeholder|accent|caret|shadow)'

/** `ui/6`: una utilidad de color de la paleta con su paso (`text-slate-500`, `hover:bg-amber-50/50`). */
const COLOR = `(?:^|\\s|:)!?${DE_COLOR}-${PALETA}-\\d{2,3}`

/**
 * `ui/7`: una clase con un valor arbitrario, que no es de `ARBITRARY_ALLOWED`. Cuatro formas: un valor
 * (`text-[11px]`, `data-[state=open]:`), una propiedad (`[scrollbar-width:none]`), una variante
 * (`[&::-webkit-scrollbar]:hidden`) y el atajo de Tailwind 4 para una variable (`p-(--x)`, que es
 * `p-[var(--x)]`). Una clase está permitida si sus variantes son corrientes o la del contenedor permitida
 * y su utilidad es corriente o una de las permitidas, con cualquier variante delante (`sm:`).
 */
const VARIANTE = '[a-z0-9@*\\x2F-]+:'
const UTILIDAD = '!?-?[a-z0-9.%\\x2F-]+!?'
const VARIANTES_PERMITIDAS = ARBITRARY_ALLOWED.filter((a) => a.value.endsWith(':')).map((a) =>
  literal(a.value),
)
const UTILIDADES_PERMITIDAS = ARBITRARY_ALLOWED.filter((a) => !a.value.endsWith(':')).map(
  (a) => `!?${literal(a.value)}!?`,
)
const PERMITIDA = `(?:(?:${[VARIANTE, ...VARIANTES_PERMITIDAS].join('|')})*(?:${[...UTILIDADES_PERMITIDAS, UTILIDAD].join('|')}))`
const MARCA =
  '(?:[a-z0-9@]-\\[[^\\]\\s]+\\]|\\[[a-z-]+:[^\\]\\s]+\\]|\\[[&@][^\\]\\s]*\\]:|[a-z0-9]-\\(--[^)\\s]+\\))'
const ARBITRARIO = `(?:^|\\s)(?!${PERMITIDA}(?:\\s|$))\\S*?${MARCA}`

/** `ui/8`: un literal que es un color hexadecimal entero (`#rgb`, `#rrggbb`, `#rrggbbaa`). */
const HEX = '^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$'

/**
 * `ui/10` (5-f): un emoji o un glifo de los que §3.7 sustituye por un icono: `ℹ`, `ⓘ`, `▲`, `▼`, las
 * flechas salvo la `→` de `StageRoute` (U+2192), `↺`, `‹`, `›`, `⋯` y el `▶︎` de `PLAY_GLYPH` (U+25B6 con
 * el selector de texto U+FE0E). El `▶` y el `◀` solos se quedan: son texto en los ejes de `Scale5`
 * (D-00n) y en `RaceRadioPanel.tsx`.
 */
const GLIFO =
  '[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2139}\\u{2190}\\u{2191}\\u{2193}\\u{2196}-\\u{2199}\\u{21BA}\\u{2039}\\u{203A}\\u{22EF}\\u{24D8}\\u{25B2}\\u{25BC}]|\\u{25B6}\\u{FE0E}'

/** `ui/5`: los estados hechos a mano (pantalla). */
const ESTADO = 'Loading…|Could not load|Could not reach'

const MENSAJES = {
  1: 'ui/1 button: use <Button> from components/ui',
  2: 'ui/2 table: use <RankTable> from components/ui',
  3: 'ui/3 field: use <Field> from components/ui',
  4: 'ui/4 title: nothing lives only in a title; use <InfoButton>',
  5: 'ui/5 hand-made state: use <QueryView>',
  6: 'ui/6 Tailwind palette colour: use a token',
  7: 'ui/7 arbitrary value: use a token, or add it to ARBITRARY_ALLOWED with its reason',
  8: 'ui/8 hex colour: use a token',
  9: 'ui/9 inline style',
  10: 'ui/10 emoji or glyph in the interface: use <Icon>',
}

/** Las diez reglas, para `'no-restricted-syntax': [severidad, ...UI_RULES]`. */
export const UI_RULES = [
  { selector: "JSXOpeningElement[name.name='button']", message: MENSAJES[1] },
  { selector: "JSXOpeningElement[name.name='table']", message: MENSAJES[2] },
  {
    selector: 'JSXOpeningElement[name.name=/^(input|select|textarea)$/]',
    message: MENSAJES[3],
  },
  {
    selector: "JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name='title']",
    message: MENSAJES[4],
  },
  { selector: `JSXText[value=/${ESTADO}/]`, message: MENSAJES[5] },
  // El mensaje de un `ApiError` (`api/*.ts`, `errorMessage`) no es un estado de pantalla: lo pinta
  // `ErrorState`, que dice lo suyo. Sin él, la regla daría 116 avisos en lugar de los 70 de §17.10.
  {
    selector: `Literal[value=/^(${ESTADO})/]:not(Property[key.name='errorMessage'] > Literal)`,
    message: MENSAJES[5],
  },
  {
    selector: `TemplateElement[value.cooked=/^(${ESTADO})/]:not(Property[key.name='errorMessage'] > TemplateLiteral > TemplateElement)`,
    message: MENSAJES[5],
  },
  { selector: `Literal[value=/${COLOR}/]`, message: MENSAJES[6] },
  { selector: `TemplateElement[value.cooked=/${COLOR}/]`, message: MENSAJES[6] },
  { selector: `Literal[value=/${ARBITRARIO}/]`, message: MENSAJES[7] },
  { selector: `TemplateElement[value.cooked=/${ARBITRARIO}/]`, message: MENSAJES[7] },
  { selector: `Literal[value=/${HEX}/]`, message: MENSAJES[8] },
  { selector: "JSXAttribute[name.name='style']", message: MENSAJES[9] },
  { selector: `JSXText[value=/${GLIFO}/u]`, message: MENSAJES[10] },
  { selector: `Literal[value=/${GLIFO}/u]`, message: MENSAJES[10] },
  { selector: `TemplateElement[value.cooked=/${GLIFO}/u]`, message: MENSAJES[10] },
]

/** Dónde corren las reglas (§5.3). */
export const UI_FILES = ['apps/web/src/**/*.{ts,tsx}']
export const UI_IGNORES = [
  '**/*.test.{ts,tsx}',
  '**/__fixtures__/**',
  'apps/web/src/components/ui/**',
  '**/*.generated.ts',
]

/**
 * LOS HEREDADOS: los ficheros que el día del PR 8 ya tenían algún aviso `ui/`, en `warn` hasta que su PR
 * los limpia (paso 21 y los de cada componente). La lista solo encoge (`heredados.test.ts`).
 */
export const UI_HEREDADOS = [
  'apps/web/src/App.tsx',
  'apps/web/src/components/AttributeList.tsx',
  'apps/web/src/components/Badges.tsx',
  'apps/web/src/components/BlockReport.tsx',
  'apps/web/src/components/ErrorBoundary.tsx',
  'apps/web/src/components/Flag.tsx',
  'apps/web/src/components/FormChart.tsx',
  'apps/web/src/components/Jersey.tsx',
  'apps/web/src/components/LastRaceReady.tsx',
  'apps/web/src/components/LastRaceReport.tsx',
  'apps/web/src/components/Logo.tsx',
  'apps/web/src/components/OrdersGate.tsx',
  'apps/web/src/components/PaintedRaceRadio.tsx',
  'apps/web/src/components/Panel.tsx',
  'apps/web/src/components/PlanLadder.tsx',
  'apps/web/src/components/RaceEffortLog.tsx',
  'apps/web/src/components/RaceRadioPanel.tsx',
  'apps/web/src/components/RaceResults.tsx',
  'apps/web/src/components/RiderName.tsx',
  'apps/web/src/components/RoleEditor.tsx',
  'apps/web/src/components/ShareStage.tsx',
  'apps/web/src/components/ShowAll.tsx',
  'apps/web/src/components/SpoilerSettings.tsx',
  'apps/web/src/components/StageGate.tsx',
  'apps/web/src/components/StageReadyLine.tsx',
  'apps/web/src/components/StageRoute.tsx',
  'apps/web/src/components/StageStory.tsx',
  'apps/web/src/components/StarRating.tsx',
  'apps/web/src/components/Tabs.tsx',
  'apps/web/src/components/TeamClassTable.tsx',
  'apps/web/src/components/TeamFeed.tsx',
  'apps/web/src/components/TeamManager.tsx',
  'apps/web/src/components/TextField.tsx',
  'apps/web/src/components/VeilNotice.tsx',
  'apps/web/src/components/WatchBlocks.tsx',
  'apps/web/src/components/WorldClock.tsx',
  'apps/web/src/components/broadcast/ClockNotice.tsx',
  'apps/web/src/components/broadcast/CueCard.tsx',
  'apps/web/src/components/broadcast/FixedOverlay.tsx',
  'apps/web/src/components/broadcast/GroupBar.tsx',
  'apps/web/src/components/broadcast/PlayerControls.tsx',
  'apps/web/src/components/broadcast/ProfileStrip.tsx',
  'apps/web/src/components/broadcast/StageCards.tsx',
  'apps/web/src/components/broadcast/TimeTrialBoard.tsx',
  'apps/web/src/components/broadcast/VoiceTicker.tsx',
  'apps/web/src/components/broadcast/WornJerseyIcon.tsx',
  'apps/web/src/domain/broadcast/montage.ts',
  'apps/web/src/domain/broadcast/screen.ts',
  'apps/web/src/domain/health.ts',
  'apps/web/src/domain/riderResults.ts',
  'apps/web/src/pages/Account.tsx',
  'apps/web/src/pages/AdminNames.tsx',
  'apps/web/src/pages/AdminPanel.tsx',
  'apps/web/src/pages/Countries.tsx',
  'apps/web/src/pages/Country.tsx',
  'apps/web/src/pages/CreateRider.tsx',
  'apps/web/src/pages/Finances.tsx',
  'apps/web/src/pages/ForgotPassword.tsx',
  'apps/web/src/pages/HallOfFame.tsx',
  'apps/web/src/pages/Home.tsx',
  'apps/web/src/pages/HowToPlay.tsx',
  'apps/web/src/pages/Login.tsx',
  'apps/web/src/pages/Market.tsx',
  'apps/web/src/pages/MyRaces.tsx',
  'apps/web/src/pages/News.tsx',
  'apps/web/src/pages/OneDayRace.tsx',
  'apps/web/src/pages/Privacy.tsx',
  'apps/web/src/pages/Race.tsx',
  'apps/web/src/pages/RaceOrders.tsx',
  'apps/web/src/pages/RacesIndex.tsx',
  'apps/web/src/pages/Rankings.tsx',
  'apps/web/src/pages/Register.tsx',
  'apps/web/src/pages/ResetPassword.tsx',
  'apps/web/src/pages/RiderProfile.tsx',
  'apps/web/src/pages/StageReplay.tsx',
  'apps/web/src/pages/StageReport.tsx',
  'apps/web/src/pages/StageWatch.tsx',
  'apps/web/src/pages/Team.tsx',
  'apps/web/src/pages/TeamCalendar.tsx',
  'apps/web/src/pages/TeamIdentity.tsx',
  'apps/web/src/pages/TeamSquad.tsx',
  'apps/web/src/pages/Teams.tsx',
  'apps/web/src/pages/Training.tsx',
  'apps/web/src/pages/VerifyEmail.tsx',
  'apps/web/src/pages/stageView.tsx',
]
