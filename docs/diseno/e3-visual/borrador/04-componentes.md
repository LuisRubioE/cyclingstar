## 4. Los componentes y sus estados

El catálogo es cerrado (D-09): los componentes de esta sección, y ninguno más, en `apps/web/src/components/ui/`, un fichero por componente con su `.test.tsx`; una página solo los compone con utilidades de disposición, y un componente nuevo entra con un PR que lo añade a `ui/`, a `/_ui` y a sus tests (§5.5). Las medidas son a 360 px y en tokens de §3; lo que cambia desde 640 o con ratón lo dice cada fila. Aquí se escriben enteras las props de los diez componentes que usan las demás secciones; los maillots (`Kit`, `LeaderJersey`, `ChampionSash`, `WornJerseyIcon` y `KitPicker`) solo se listan en §4.11, porque su dibujo es de §8 y §9. Las cifras con (\*) las ha medido el redactor de §3 con su script (§3). Los tipos comunes viven en `apps/web/src/components/ui/types.ts`:

```ts
// apps/web/src/components/ui/types.ts
export type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info'
export type ColumnPriority = 'primary' | 'secondary' | 'optional'
/** Los valores de `data-state` (§G.4, más `veiled`, el de la RankTable velada). */
// prettier-ignore
export type UiState =
  | 'ready' | 'loading' | 'slow' | 'error' | 'empty' | 'offline' | 'disabled' | 'busy' | 'dirty'
  | 'saving' | 'saved' | 'failed' | 'open' | 'closed' | 'active' | 'inactive' | 'hidden' | 'veiled'
// prettier-ignore
export type IconName =
  | 'home' | 'rider' | 'team' | 'world' | 'news' | 'account' | 'travel' | 'race'
  | 'check' | 'warning' | 'error' | 'info' | 'offline' | 'retry' | 'close' | 'more'
  | 'chevron-left' | 'chevron-right' | 'chevron-down'
  | 'star-full' | 'star-half' | 'star-empty' | 'trend' | 'share'
/** Solo margen, ancho y sitio en la rejilla (D-10); vocabulario.test.ts comprueba sus clases (§5.2). */
export type Layout = string
```

### 4.1 Reglas comunes

- **El estado se ve en el marcado** (D-10; I-03): la raíz de cada componente lleva `data-ui="<Nombre>"`, `data-variant` y `data-state`, con los valores de §G.4 (`ready`, `loading`, `slow`, `error`, `empty`, `offline`, `disabled`, `busy`, `dirty`, `saving`, `saved`, `failed`, `open`, `closed`, `active`, `inactive`, `hidden`), más `veiled` (`UiState`). Los tests miran eso y el ARIA, nunca clases; los seis que hoy fijan clases se re-sellan contra `data-*` (`stageRoute.test.tsx` l. 19, `riderResults.test.ts` l. 112-119, `CueCard.test.tsx` l. 34, `GroupBar.test.tsx` l. 82 y 190, `PlayerControls.test.tsx` l. 145, `StageCards.test.tsx` l. 361).
- **Ningún `className` para lo suyo**: un componente no acepta clases para su color, letra, radio ni sombra, porque en Tailwind v4 dos clases de una familia las ordena la CSS emitida y no el orden escrito (la maqueta de `sistema` dejó así un `select` en 26 px). Acepta `layout` (margen, ancho y sitio en la rejilla), y nada más.
- **Foco**: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`, un anillo de 2 px a 2 px del borde (6,70:1 sobre `surface`; 10,57 en el ámbito oscuro). Ningún componente lo quita; hoy no hay ni un `focus-visible:` (mapa 01 §7).
- **Encima**: solo con `hover:`, que Tailwind v4 emite dentro de `@media (hover: hover)`: en el teléfono no existe. Cambia el fondo un paso (`accent` a `accent-strong`; `surface` a `surface-2`) y nunca enseña información que no esté ya.
- **Pulsado** (`active:`): el mismo paso que encima; nada se mueve ni cambia de tamaño.
- **Deshabilitado**: la única forma de deshabilitar es dar el porqué (`disabledReason`). El componente pone `aria-disabled="true"` (no `disabled`, para que se pueda enfocar y el lector diga el porqué), `data-state="disabled"`, `bg-disabled-bg` y `text-disabled-ink`, y pinta el porqué debajo en una línea `meta` `ink-2` enlazada con `aria-describedby`. Nunca en un `title` (regla `ui/4`, §5.3).
- **Ocupado**: `aria-busy="true"`, `data-state="busy"`, un indicador de 16 px con `animate-spin motion-reduce:animate-none` y el texto de ocupado (`Saving…`, pantalla); el texto en reposo se queda en la caja con `invisible`, para que el ancho no cambie.
- **Movimiento**: con `prefers-reduced-motion`, ni pulso, ni giro, ni transiciones (`motion-reduce:`).
- **Los tests del catálogo** pintan con `renderToStaticMarkup`, sin DOM, como los de hoy (mapa 01 §9): cada estado se pinta por sus props. La conducta que pide eventos se escribe en funciones puras que se prueban solas (`isKeyboardOpen`, §4.9), y el resto lo ven `/_ui` y la prueba del teléfono (§7).

### 4.2 `QueryView` y los estados de una consulta

`QueryView` (D-11; I-30) recibe la consulta de React Query y pinta, en el sitio del contenido, uno de seis estados. Ninguna página escribe `isPending &&` ni un `Loading…` (pantalla; regla `ui/5`), y las seis páginas que hoy pintan un fallo como vacío dejan de hacerlo (mapa 01 §4).

| `data-state` | Cuándo                                                                 | Lo que pinta                                                                                                    | Texto (pantalla)                                               | ARIA                                                   |
| ------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| `loading`    | la consulta carga                                                      | `Skeleton` con la forma de lo que viene, invisible hasta `LOADING_DELAY_MS` = 300 y visible con pulso desde ahí | ninguno a la vista                                             | `role="status"`, `Loading your training plan` (oculto) |
| `slow`       | carga desde hace `SLOW_HINT_MS` = 8.000                                | el `Skeleton` y debajo una línea `meta` `ink-2` con `Retry` (`Button` `quiet`, llama a `refetch`)               | `Still loading. Slow connection?` · `Retry`                    | la línea, en el mismo `status`                         |
| `offline`    | React Query la ha dejado en pausa por red (`fetchStatus === 'paused'`) | `OfflineState`: icono `offline` de 24 en `ink-3` y una línea `meta` `ink-2`; se rehace sola al volver la red    | `You're offline. This loads when you reconnect.`               | `role="status"`                                        |
| `error`      | la consulta falla                                                      | `ErrorState` del tipo que dé `errorKindOf` (abajo), con `refetch`                                               | `Couldn't load your training plan · Try again`                 | `role="alert"`                                         |
| `empty`      | llega e `isEmpty` dice que está vacía                                  | `EmptyState`: icono de 24 en `ink-3`, el texto en `meta` `ink-2` y una acción opcional; sin caja discontinua    | `No races in the next four weeks. This month is for building.` | ninguno                                                |
| `ready`      | llega con datos                                                        | los hijos                                                                                                       | (el contenido)                                                 | ninguno                                                |

Esperar 300 ms antes de enseñar el esqueleto evita que parpadee: en caliente la web contesta de 1,07 a 1,18 s (telefono §8.2), y un esqueleto pintado desde el primer instante destellaría en cada respuesta rápida. El esqueleto ocupa desde el principio el alto final (invisible), así que la página no salta al llegar los datos. Toda petición se corta a los `REQUEST_TIMEOUT_MS` = 15.000 (`AbortSignal.timeout` en `api/request.ts`).

`ErrorState` tiene cuatro tipos, y `errorKindOf(error)` (en `ui/QueryView.tsx`) los saca de los errores que ya lanza la web (`api/request.ts` l. 19 y 61): `ContractError` es `outdated`; `ApiError` con `status` 404, `notFound`; con `status` 0 o cortada por tiempo, `network`; cualquier otra, `server`. Anatomía: icono `error` de 24 en `bad`, una frase en `body` 600 `ink`, el detalle en `meta` `ink-2` (en `server`, el código en `caption` `ink-3`: `Error 500`), y `Try again` (`Button` `secondary` con el icono `retry`); con la web instalada (`display-mode: standalone`), además `Reload app` (`Button` `quiet`), porque en iPhone no hay barra con recarga. Textos (pantalla): `server` y `network`, `Couldn't load <label> · Try again`; `outdated`, `This version is out of date · Reload`; `notFound`, el que dé la página (`This rider doesn't exist.`); y un trozo de JS que no llega sin red, `This page needs a connection the first time.` · `Try again` (D-47). Mientras reintenta, el botón está ocupado.

`Skeleton` tiene cuatro formas: `rows` (n filas, 5 por defecto, del alto de las que sustituye: 56 en una clasificación de corredores, 44 en una de equipos y 64 en una lista de `ActionRow`; con dos barras de 12 px de alto por fila), `panel` (una barra de título de 24 y tres líneas de 16), `stat` (un rótulo de 12 y una cifra de 40) y `header` (un `h1` de 32 y una línea de 20). Bloques `bg-surface-2` con `rounded-ui`, `animate-pulse motion-reduce:animate-none`.

```ts
// apps/web/src/components/ui/QueryView.tsx
import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'

export type SkeletonShape =
  | { readonly kind: 'rows'; readonly rows?: number; readonly rowHeight?: 44 | 56 | 64 }
  | { readonly kind: 'panel' }
  | { readonly kind: 'stat' }
  | { readonly kind: 'header' }

export type ErrorKind = 'network' | 'server' | 'outdated' | 'notFound'

export interface QueryViewProps<T> {
  /** La consulta tal cual: QueryView mira `status`, `fetchStatus`, `error` y llama a `refetch`. */
  readonly query: Pick<UseQueryResult<T>, 'data' | 'error' | 'status' | 'fetchStatus' | 'refetch'>
  /** Lo que carga, en minúscula y en una frase: `your training plan`. Va al lector y al error. */
  readonly label: string
  readonly isEmpty?: (data: T) => boolean
  readonly empty?: { readonly text: string; readonly action?: ReactNode }
  /** El texto de `notFound`; sin él, un 404 se pinta como `server`. */
  readonly notFound?: string
  readonly skeleton?: SkeletonShape
  /** Pone `data-answer` en lo que pinte, en cualquiera de los seis estados (§7.3). */
  readonly answer?: boolean
  readonly children: (data: T) => ReactNode
}
```

### 4.3 La acción

| Componente   | Anatomía y medidas                                                                                                                                                                                                                                                                                                            | Variantes                                                                                                                                                                                                              | Estados y su aspecto                                                                                                                                                                                                                                                                                 | Texto (pantalla)                                                                                         | Accesibilidad                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`     | `min-h-11` (44; 48 en la `ActionBar`), `px-4`, `rounded-ui`, `text-body` 600; icono de 20 a la izquierda con 8 de hueco; solo icono, 44 × 44                                                                                                                                                                                  | `primary` (`bg-accent text-on-accent`), `secondary` (`bg-surface`, borde `line-strong`, `text-ink`), `quiet` (`text-accent`, sin fondo), `danger` (`bg-bad text-white`); `size` `default` o `sm` (32 solo con `fine:`) | `ready`; encima y pulsado: `primary` a `accent-strong`, `secondary` y `quiet` a `bg-surface-2`, `danger` con `brightness-90`; foco; `disabled` con su porqué debajo; `busy` con el indicador y `busyLabel`                                                                                           | `Save plan` · `Enter race` · `Withdraw`; `Nothing to save yet. Change a day first.`                      | `<button type="button">` o `<Link>` con `to`; `aria-busy`; `aria-disabled` y `aria-describedby` al porqué; `ariaLabel` con el nombre entero en una fila  |
| `ActionBar`  | fija, a `bottom` 56 px más el área segura (sobre la `BottomNav`) y a 0 desde 640; `min-h-15` (60), `bg-surface`, `border-t border-line`, `shadow-bar`, `px-3`, ancho `max-w-page`; a la izquierda la consecuencia en `meta` `ink-2` en un renglón con `…`; a la derecha un `Button` `primary` de 48 con `data-primary-action` | ninguna                                                                                                                                                                                                                | `hidden` (sin cambios: no se pinta); `dirty`; `saving` (el botón ocupado, `Saving…`); `saved` (`Saved` con `check` en `good`, 2 s, y se oculta); `failed` (`Could not save. Try again.` en `bad` y el botón pasa a `Retry`); `offline` (el aviso en `ink-2` y el botón deshabilitado con ese porqué) | `2 changes · Race Var: Fine (was Loaded)`; `You're offline. Your changes stay here until you reconnect.` | `role="region"` con `aria-label="Unsaved changes"`; la consecuencia entera en `aria-describedby`; `saved` en `role="status"`, `failed` en `role="alert"` |
| `Segmented`  | de 2 a 4 opciones del mismo ancho a todo lo ancho, `min-h-11`, borde `line-strong` de 1 px, `rounded-ui`, separadores `line-strong`, `text-meta` 600                                                                                                                                                                          | ninguna                                                                                                                                                                                                                | cada opción `active` (`bg-accent text-on-accent`) o `inactive` (`bg-surface text-ink`); foco; la raíz `disabled` con su porqué                                                                                                                                                                       | `Coach decides` · `Mixed` · `I decide` (`PlanLadder.tsx` l. 50-54)                                       | `role="radiogroup"` con `aria-label`; cada opción `role="radio"` con `aria-checked`; flechas con índice móvil, como `Tabs`                               |
| `Field`      | rótulo encima en `meta` 600 `ink`, siempre visible; el control con `min-h-12` (48), `text-body`, `bg-surface`, borde `line-strong`, `rounded-ui`, `px-3`; ayuda o error debajo en `meta`; `Textarea` desde 96                                                                                                                 | `Input`, `Select` (nativo, con `chevron-down` de 20 a la derecha), `Textarea`                                                                                                                                          | `ready`; foco (el anillo); `error` (borde `bad`, el error en `bad` con el icono `error` de 16, `aria-invalid`); `disabled` (`disabled-bg`, `disabled-ink` y su porqué); con ratón, 40 de alto                                                                                                        | `Name` · `Must be 2 to 40 characters.`                                                                   | `<label for>`; `aria-describedby` a la ayuda y al error; nunca un campo sin rótulo (hoy cuatro, mapa 01 §7)                                              |
| `TextLink`   | en línea; subrayado siempre visible de 1 px a 2 px de la letra; en una frase, 24 px de objetivo con su espaciado (WCAG 2.5.8); en una fila, la celda entera (§4.5)                                                                                                                                                            | `default` (`text-accent`); `rider` (hereda el color, subrayado punteado `decoration-line-strong`, [DUEÑO 6])                                                                                                           | `ready`; encima, subrayado de 2 px; foco; visitado igual                                                                                                                                                                                                                                             | `Race Sardegna` · `José Quintáns`                                                                        | `<a>` o `<Link>`; nunca solo color                                                                                                                       |
| `InfoButton` | el icono `info` de 20 en un objetivo de 44 × 44 (`Button` `quiet`); despliega el porqué debajo de su línea, en el flujo, en una caja `bg-surface-2` `rounded-ui` `p-3` con `meta` `ink-2`; sin ventana                                                                                                                        | ninguna                                                                                                                                                                                                                | `closed`; `open`                                                                                                                                                                                                                                                                                     | `You don't train on travel days: 1 out, 1 back.`                                                         | `aria-expanded`, `aria-controls`; `label` obligatorio y concreto (`About travel days`)                                                                   |
| `Disclosure` | un `Button` `quiet` a todo lo ancho, de 44, con `chevron-down` que gira 180° al abrir; la región debajo                                                                                                                                                                                                                       | ninguna                                                                                                                                                                                                                | `closed`; `open`                                                                                                                                                                                                                                                                                     | `Show the 28 days` · `Hide the 28 days`                                                                  | `aria-expanded` y `aria-controls`; la región, `role="region"` con `aria-labelledby` al botón                                                             |

`Disclosure` (I-33) es para lo plegado que no es el porqué de una línea: el día a día del cuadro, que el dueño quiere debajo de la escalera ([DUEÑO 11]); `InfoButton` sustituye a los 23 `title` que el dedo no abre. Un `Chip` no se pulsa nunca: lo que se conmuta es un `Segmented`.

```ts
// apps/web/src/components/ui/Button.tsx y ui/ActionBar.tsx
export interface ButtonProps {
  readonly variant?: 'primary' | 'secondary' | 'quiet' | 'danger' // por defecto 'secondary'
  /** 'sm' pinta 32 px solo con `fine:`; con el dedo sigue en 44. */
  readonly size?: 'default' | 'sm'
  readonly children: string
  readonly icon?: IconName
  readonly busy?: boolean
  readonly busyLabel?: string // `Saving…`; por defecto, el mismo texto
  /** Si está, el botón está deshabilitado y lo dice debajo; no hay otra forma de deshabilitarlo. */
  readonly disabledReason?: string
  readonly ariaLabel?: string // el nombre entero cuando el texto es corto: `Add Race Ardèche`
  readonly type?: 'button' | 'submit'
  readonly onClick?: () => void
  readonly to?: string // enlace con aspecto de botón
  readonly layout?: Layout
}

export type ActionBarStatus = 'idle' | 'saving' | 'saved' | 'failed'

export interface ActionBarProps {
  /** Cambios sin guardar; con 0 y `idle` la barra no se pinta. */
  readonly changes: number
  /** Lo que cambia al guardar, sin el recuento: `Race Var: Fine (was Loaded)`. */
  readonly consequence: string
  readonly actionLabel: string // `Save plan`, `Save kit`, `Save orders`
  readonly status: ActionBarStatus
  readonly onSave: () => void
  readonly disabledReason?: string
}
```

La `ActionBar` lee la red con `useOnline()` (de `apps/web/src/net.ts`) y pasa sola a `offline`; las mutaciones esperan en memoria y no se reintentan solas.

### 4.4 La estructura

| Componente   | Anatomía y medidas                                                                                                                                                                                                                                                          | Variantes                                                                                                                                                                                                                      | Estados y su aspecto                                                                                                                                          | Texto (pantalla)                                                                                                                                  | Accesibilidad                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Panel`      | `bg-surface`, `border border-line`, `rounded-ui`, `shadow-card`; título `h2` en `text-title` `ink` en una línea de 44 con una acción opcional de 44 a la derecha; relleno 12, y 16 desde 640; sin `overflow-hidden` (hoy `Panel.tsx` l. 22 recorta)                         | `default`; `bleed`, sin relleno lateral en el cuerpo, para tablas                                                                                                                                                              | `ready`; lo de dentro lo pinta su `QueryView`                                                                                                                 | `Your month` · `How you'll arrive`                                                                                                                | `<section aria-labelledby>` con su `h2`                                                                                      |
| `PageHeader` | la vuelta (en pantallas de segundo nivel): `chevron-left` y el nombre del padre en `meta` `accent`, 44 de alto; el `h1` en `text-page` `ink` sobre `canvas`; debajo, **la línea de estado** en `meta` `ink-2` (I-32); una acción opcional                                   | ninguna                                                                                                                                                                                                                        | `ready`; `loading` (la línea de estado en `Skeleton` de 20 px); sin línea de estado                                                                           | `Training` · `Mixed · your plan runs Day 51 to Day 78`; `Race Valencia`                                                                           | un `h1` por página; la línea de estado es un `<p>`, no una región viva                                                       |
| `Tabs`       | carril de `min-h-11` que se desplaza de lado sin barra visible, con un desvanecido de 24 px en el borde mientras haya más; la activa se centra al entrar (`scrollIntoView({ inline: 'center' })`); `text-meta` 600, `px-3`                                                  | `nav`, bajo la cabecera en `bg-navy-dark` y en el ámbito oscuro (activa `white` con subrayado `gold` de 3 px; inactivas `on-navy-2`); `page`, en el contenido (activa `ink` con subrayado `accent` de 3 px; inactivas `ink-2`) | cada pestaña `active` o `inactive`; foco                                                                                                                      | `Profile · Training · Race orders · My races`; `Watch · Report · Classifications`                                                                 | el patrón de `Tabs.tsx` l. 153-222 (`tablist`, `tab`, `aria-selected`, flechas); la `nav`, enlaces con `aria-current="page"` |
| `AppHeader`  | 48 más `env(safe-area-inset-top)` arriba, `bg-navy`, en el ámbito oscuro; el logotipo de 28 y `Cycling Star` en `text-title` 700 `white` (por debajo de 340 px, solo el logotipo); el reloj del mundo en `meta` `on-navy-2`; `Account` como icono en 44 × 44                | `signed-in`, `signed-out` (`Log in` en `quiet` y `Sign up` en `bg-gold text-ink`, 7,30) y `unknown` (sin red: pinta la del jugador, D-47)                                                                                      | `ready`                                                                                                                                                       | `Day 50 · S1 · 4h 56m`; `Log in` · `Sign up`                                                                                                      | `<header>`; el logotipo, enlace con `aria-label="Cycling Star home"`; el reloj, con su frase entera en `aria-label`          |
| `BottomNav`  | fija abajo, `bg-navy-dark`, en el ámbito oscuro, `border-t border-line`, `shadow-bar`; 56 más `env(safe-area-inset-bottom)`; de 3 a 5 destinos del mismo ancho, cada uno con su icono de 24 en una pastilla de 56 × 28 (`rounded-full`) y su rótulo en `caption` 600 debajo | ninguna; desde 640 no se pinta (`sm:hidden`)                                                                                                                                                                                   | cada destino `active` (pastilla `bg-surface-2` del ámbito, icono y rótulo `white`) o `inactive` (`on-navy-2`); la raíz `hidden` con el teclado abierto (§4.9) | `Dashboard` · `My Rider` · `My Team` · `World` · `News`; por debajo de 340 px, si hace falta, `Home` · `Rider` · `Team` · `World` · `News` (§6.3) | `<nav aria-label="Sections">`; `aria-current="page"`; cada destino, 56 de alto                                               |
| `Stat`       | el rótulo en `caption` 600 versales (`tracking-caps`) `ink-3`; la cifra en `text-display` con `tabular-nums` `ink`; con tono `good` o `bad` si es dinero con signo; el cero, sin signo y en `ink` (hoy `−0` en rosa, captura 03)                                            | ninguna                                                                                                                                                                                                                        | `ready`; `loading` (`Skeleton` `stat`)                                                                                                                        | `Balance` · `6,173,210`; `Weekly net` · `+780`                                                                                                    | `<dl>` con `<dt>` y `<dd>` (hoy fallan `dlitem` y `definition-list` en las fichas, mapa 05 §11)                              |

La línea de estado del `PageHeader` (I-32) es lo permanente de la página, como la capa fija de la televisión: el modo y el estado del plan se leen sin bajar; lo eventual va en `Notice` (§4.7). El reloj del mundo, que hoy no sale en el teléfono (`Header.tsx` l. 122, `hidden md:block`; mapa 04, contradicción 5), va siempre (8,15:1).

```ts
// apps/web/src/components/ui/Panel.tsx
export interface PanelProps {
  readonly title?: string // sin título, el panel no lleva `h2` y necesita `ariaLabel`
  readonly ariaLabel?: string
  readonly action?: ReactNode // un `Button` `quiet` o un `TextLink`, de 44
  readonly variant?: 'default' | 'bleed'
  readonly answer?: boolean // `data-answer` (§7.3)
  readonly children: ReactNode
  readonly layout?: Layout
}
```

### 4.5 Tablas y filas

**`RankTable`** sustituye a las diez tablas de clasificación (D-16). A 360 px es una `<table>` de filas de `min-h-11` (44) con 4 px arriba y abajo: una fila con maillot nunca mide menos de 44 (D-00b), y la de un corredor, con el maillot de 28 en el primer renglón y el equipo en el segundo, mide 56; solo una tabla sin maillot (los movimientos) baja a 36 con `fine:`. Lleva el puesto en 24 px (`meta` `tabular-nums` `ink-3`, a la derecha); la celda de identidad, con el primer renglón (`RiderLabel`, o el nombre del equipo seguido de su `Kit` de 28) y el segundo; y el valor (`row` `tabular-nums`, a la derecha, con 12 px de margen a la izquierda siempre, porque hoy el equipo toca los puntos en `Rankings.tsx` l. 39 y 49: `Northwind Cycling Team178`, pantalla). La cabecera, una fila de 32 px en `caption` 600 versales `ink-3` con `scope="col"`. Las columnas declaran su `priority`: las `primary` son columna siempre; las `secondary` se pintan en el segundo renglón de la identidad por debajo de 640 y como columna desde 640; las `optional`, en el segundo renglón por debajo de 1.024 y como columna desde 1.024. El segundo renglón une sus valores con `·` en `meta` `ink-3` y parte de línea si no cabe; solo el nombre del equipo se corta, con `…` y `data-clip-ok`. Lo que cada tabla pone en cada prioridad, en §6.1.

- **Las 20 y `Show all`**: pinta `TOP_ROWS` = 20 filas y debajo `ShowAllButton` (`ShowAll.tsx` l. 10-33) a todo lo ancho, de 44: `Show all 140` y `Show top 20` (pantalla).
- **La fila propia** (I-26): si `isOwn` da una fila más allá de la 20, tras las 20 va una fila `…` de 24 px (`aria-hidden`) y después la propia. La propia, dentro o fuera de las 20, lleva una barra `border-own` de 3 px a la izquierda (4,10:1 contra blanco), fondo `bg-own-tint`, el nombre en 600 y `aria-current="true"`.
- **El enlace del nombre** (O-28; X-18): es la celda de identidad entera, en bloque y con `min-h-11` (44), un enlace por fila; el prototipo de telefono medía 20 px de alto (uso C1), y la prueba del teléfono cuenta los enlaces de tabla como controles, no como enlaces de frase (§7.1).
- **Estados**: `ready`; `veiled` (una fila a todo lo ancho, en `meta` `ink-2` con el icono `warning` en `warn`, y `Watch` como `TextLink`: `Hidden until you watch stage 3 · Watch`, pantalla); cargando, vacío (`No riders have finished yet.`, pantalla) y error, los de su `QueryView`, con `Skeleton` `rows`.
- **Accesibilidad**: `<table>` con su `<caption>` (oculto a la vista: `General classification after stage 3`), `<th scope="col">`, la fila propia con `aria-current`. Las diferencias de tiempo, siempre con `formatTime` (D-15).

```ts
// apps/web/src/components/ui/RankTable.tsx
export interface RankTableColumn<Row> {
  readonly key: string
  readonly header: string // `Time`, `Pts`, `Team`
  readonly priority: ColumnPriority
  readonly numeric?: boolean // a la derecha y con `tabular-nums`
  readonly render: (row: Row) => ReactNode
}

export interface RankTableProps<Row> {
  readonly caption: string
  readonly rows: readonly Row[]
  readonly rowKey: (row: Row) => string
  /** El puesto; null en un DNF o un equipo fuera, que van al final sin número. Sin `rank`, la
   *  tabla no tiene columna de puesto (los movimientos y la plantilla, §6.1). */
  readonly rank?: (row: Row) => number | null
  /** El primer renglón de la identidad: `RiderLabel`, o el equipo con su `Kit`. */
  readonly identity: (row: Row) => ReactNode
  readonly href: (row: Row) => string // la celda de identidad entera enlaza aquí
  readonly columns: readonly RankTableColumn<Row>[]
  readonly isOwn?: (row: Row) => boolean
  /** Las filas que hay en total, para `Show all 140`; por defecto `rows.length`. */
  readonly total?: number
  /** El velo de E2: la etapa que hay que ver y el enlace a `Watch`. */
  readonly veil?: { readonly stage: number; readonly to: string } | null
  readonly answer?: boolean
  readonly layout?: Layout
}
```

**`ActionRow`** sustituye a las filas de `TeamCalendar` y de `MyRaces`: `min-h-16` (64; 48 con `fine:`), dos renglones y un botón. El primero, `row` `ink` (la carrera) con su clase en `caption` 600 `ink-3` (`.WT`, `.Pro`); el segundo, `meta` `ink-2` (`Day 59 · FR · Travel 336 · 2 days out, 2 back`, pantalla), que parte de línea si no cabe. A la derecha, un `Button` (`secondary` por defecto) de 44 de alto y 72 de ancho mínimo. Estados: `ready`; `busy` (el botón ocupado); `disabled` (el porqué en un tercer renglón `meta` `ink-2`, enlazado al botón: `Not enough money for the trip`, pantalla); hecha, un `Chip` `good` en lugar del botón (`Called up`). Va en un `<ul>`, cada fila es un `<li>`, y el botón lleva el nombre entero (`aria-label="Add Race Ardèche"`). Las fechas, con `formatGameDay` (§4.10).

```ts
// apps/web/src/components/ui/ActionRow.tsx
export interface ActionRowProps {
  readonly title: ReactNode // `Race Ardèche` y su clase
  readonly meta: ReactNode // el segundo renglón
  readonly href?: string // el primer renglón enlaza a la carrera
  readonly action?: {
    readonly label: string // `Add`
    readonly ariaLabel: string // `Add Race Ardèche`
    readonly onClick: () => void
    readonly variant?: 'primary' | 'secondary' | 'danger'
    readonly busy?: boolean
    readonly disabledReason?: string
  }
  /** Lo ya hecho, en lugar del botón: `{ text: 'Called up', tone: 'good' }`. */
  readonly done?: { readonly text: string; readonly tone: Tone }
  readonly layout?: Layout
}
```

**`TripRow`** (I-34) pinta el viaje como un bloque (D-43): una cabecera de 48 en `bg-info-bg` con el icono `travel` de 20 en `accent`, la carrera en `row` y lo demás en `meta` `ink-2` (`Trip to Race Sardegna (IT) · Days 55 to 61 · 7 days off training`, pantalla), y debajo, en filas, la ida, los días de carrera, los descansos (que se editan) y la vuelta, cada uno con su origen (§10.5); todo el bloque con un borde izquierdo de 4 px en `accent` y `rounded-ui`. Estados: `ready`; `active`, mientras el viaje está en curso (la cabecera añade `Now`, pantalla). Es un `<li>` con `aria-labelledby` a su cabecera y los días en una lista dentro.

### 4.6 La identidad

**`RiderLabel`** (I-18; O-17) es la identidad mínima de un corredor en cualquier lista: «Cada vez que menciones un ciclista, pon su dorsal, su equipo entre paréntesis y su bandera» (`docs/balance.md` l. 1842, v13; [DUEÑO 26]). El dueño fijó el orden el 21 de octubre de 2026: que «siempre van juntos» la bandera del país, el nombre y el maillot, en ese orden (`00-encargo.md` §7.2, l. 265-266; D-00c). **Primer renglón**, contiguos y en este orden: el dorsal cuando el contexto lo tiene (una carrera: `#214`, en `meta` `tabular-nums` `ink-2`), la `Flag` del país del corredor a 21 × 16, el nombre en `row` (humano en 600, bot en cursiva con 400, [DUEÑO 24]) como `TextLink` `rider` a su ficha, y el maillot que lleva ese día a 28 px, `KIT_PX.row` (`WornJerseyIcon`: el de líder, el de campeón o la equipación), centrado en el renglón. **Segundo renglón**: el equipo en `meta` `ink-3`, cortado con `…` y `data-clip-ok` si no cabe (el maillot lleva su nombre en el `aria-label`). **El nombre no se corta nunca**: la fila crece, y si el nombre parte de línea, el maillot va pegado a su última palabra ([DUEÑO 17], §6.4). En una frase (`inline`), todo en un renglón, como la crónica: `#214`, la bandera, `José Quintáns`, el maillot y `(Mistral Racing)`. `RiderLabel` no recibe tamaño: pinta siempre 28, y ninguna otra pieza pone una bandera junto a un maillot (D-00c). Sin estados propios (`ready`).

```ts
// apps/web/src/components/ui/RiderLabel.tsx
import type { KitCode, WornJersey } from '@cyclingstar/shared' // KitCode, de §8

export interface RiderLabelProps {
  readonly rider: {
    readonly id: string
    readonly name: string // como está guardado
    readonly human: boolean // 600; un bot, cursiva
    readonly country: string | null // ISO 3166-1 alfa-2
  }
  readonly bib?: number | null // solo donde el contexto lo tiene
  readonly team?: { readonly name: string; readonly kit: KitCode } | null
  readonly worn?: WornJersey // el maillot que lleva ese día (§9.10); sin él, el del equipo
  // sin `size`: el maillot va siempre a KIT_PX.row = 28 (D-00b)
  readonly link?: boolean // por defecto true; false dentro de una celda que ya enlaza
  readonly inline?: boolean
}
```

| Componente    | Anatomía y medidas                                                                                                                                                                                                  | Estados                                                       | Texto (pantalla)                                                        | Accesibilidad                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `RiderHeader` | el maillot de 40 (`KIT_PX.card`); el nombre en `text-page` como `h1`; un `Chip` de jugador y otro de salud; el papel y el país en `meta` `ink-2`                                                                    | `ready`; `loading` (`Skeleton` `header`); `error`; `notFound` | `José Quintáns · Player · Climber · Spain`; `This rider doesn't exist.` | `h1` con el nombre                                                     |
| `Flag`        | la bandera del sprite (D-49, §12.7) a 21 × 16 en una fila, o a la altura que se pida (12, 16 o 24), con un filete `line` de 1 px; junto a un maillot solo en `RiderLabel` (D-00c)                                   | `ready`; `empty`, sin país: un hueco de su ancho (hoy `🏳️`)   | ninguno                                                                 | `role="img"` con el nombre del país en `aria-label` (`Spain`)          |
| `StarRating`  | medias estrellas en SVG con `star-full`, `star-half` y `star-empty`, a 16 en una fila y a 20 en la ficha; las llenas, relleno `gold` con contorno `gold-ink` (7,06); las vacías, solo contorno `line-strong` (3,66) | `ready`                                                       | ninguno a la vista                                                      | `role="img"` con `aria-label="3.5 of 5 stars"`                         |
| `Icon`        | uno de los 24 de §3.7, a 16, 20 o 24, en `currentColor`                                                                                                                                                             | `ready`                                                       | ninguno                                                                 | con `label`, `role="img"` y `aria-label`; sin él, `aria-hidden="true"` |

**La ficha de corredor** (I-17; O-16) no es un componente: es una composición fija de `apps/web/src/pages/RiderProfile.tsx` (hoy 536 líneas), en este orden. (1) `RiderHeader`. (2) `Panel` `Condition`, con `data-answer` en la ficha propia: la forma en `StarRating`; el fondo y la frescura en `Meter` con la palabra de `conditionLabel` (`apps/web/src/domain/condition.ts` l. 49-53), en minúscula tras los dos puntos como en G.12: `Fitness: good`, `Freshness: low` (pantalla); los cerillos del día, de 2 a 5 según SPEC §6.6, dibujados uno a uno en un `Meter` de cinco segmentos con `3 of 5` (pantalla), como ya hace `MatchRow` (l. 155-180); y la salud en `Chip`. (3) `Panel` `Attributes`, con `data-answer` en la ajena: los diez atributos en filas de 44 con su `StarRating` y, solo en la propia, la marca de cuatro pasos (`Meter`, hoy `ProgressMark`, `AttributeList.tsx` l. 39-51) y la flecha (`trend`). (4) La frase del entrenador a la vista junto al atributo de techo más alto, el de la opinión `lo_tuyo` de `ceilingOpinions` (`packages/engine/src/coachView.ts` l. 115-150), que dice `This is your thing: your biggest potential is here.` (pantalla; `apps/web/src/domain/coachOpinion.ts` l. 19); hoy se lee una a la vez (mapa 02 §7). (5) El palmarés y los resultados en `RankTable`. La ficha ajena es la misma sin lo privado: sin condición, sin marca, sin flecha y sin frase (`docs/navegacion.md` §3.6).

### 4.7 Los avisos

| Componente      | Anatomía y medidas                                                                                                                                                                                                                                                                        | Estados                                       | Texto (pantalla)                                                                                                                      | Accesibilidad                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Notice`        | borde izquierdo de 4 px en el color del tono, fondo del tono, `rounded-ui`, `p-3`; el icono del tono de 20; el título en `body` 600 `ink` (de 14,42 a 15,00); el texto en `meta` `ink-2` (de 6,94 a 7,22); una acción `quiet` al final; cerrar (`close`, 44 × 44) solo en `info` y `good` | `ready`; tonos `info`, `good`, `warn` y `bad` | `Results from 3 stages you haven't watched are hidden · Manage`; `Coach mode: nothing you set here is used. Switch to Mixed to edit.` | `role` según su papel: `note` (fijo), `status` (llega después), `alert` (tras una acción fallida) |
| `Chip`          | `min-h-6` (24), `px-2`, `rounded-full`, `text-caption` 600, el icono del tono de 16 delante; los colores, los del tono (§3.2); nunca se pulsa                                                                                                                                             | `ready`                                       | `Leads overall` · `Called up` · `Home race` · `Your edit`                                                                             | texto siempre; un `<span>`                                                                        |
| `OfflineBanner` | una franja de 32 px bajo la cabecera, en el flujo y no fija, `bg-warn-bg`, el icono `offline` de 16 en `warn` y el texto en `meta` `ink`; al volver la red, `bg-good-bg` con `check` durante 2 s                                                                                          | `offline`; `ready` (vuelve la red); `hidden`  | `You're offline. Showing what you saw at 14:02.`; `Back online`                                                                       | `role="status"`                                                                                   |
| `UpdateToast`   | 48 de alto, sobre la `ActionBar` (o sobre la `BottomNav` si no hay barra), `bg-navy-dark` en el ámbito oscuro, `rounded-ui`, `shadow-bar`, el texto en `meta` `white` y `Reload` como `Button` `quiet`                                                                                    | `hidden`; `ready`; `busy` (recargando)        | `A new version is ready · Reload`                                                                                                     | `role="status"`; nunca sale con `Watch` en marcha (D-48)                                          |
| `InstallHint`   | el mismo sitio y la misma forma que `UpdateToast`; en iPhone, el icono `share` y el texto; en Android, `Install app` (`Button` `primary`); cerrar con `close`                                                                                                                             | `hidden`; `ready`                             | `Add Cycling Star to your Home Screen: tap Share, then Add to Home Screen`; `Install app`                                             | `role="status"`; sale tras `INSTALL_HINT_AFTER_SESSIONS` = 3 sesiones (D-51)                      |

**Lo real y lo generado** (H-14; D-59): `Chip` `neutral` con los tres textos con que E1 ya distingue el recorrido (`docs/balance.md` l. 17430), `Real route (source cited)`, `Real towns and distance, generated terrain` y `Generated route` (pantalla). E3 da la forma; E12 decide dónde se usa. **El sitio de los avisos de página**: bajo el `PageHeader` caben como mucho dos `Notice`; un tercero va bajo la respuesta, para que `data-answer` siga en los primeros 520 px (decisión 4-e).

```ts
// apps/web/src/components/ui/Notice.tsx y ui/Chip.tsx
export interface NoticeProps {
  readonly tone: Exclude<Tone, 'neutral' | 'accent'> // 'info' | 'good' | 'warn' | 'bad'
  readonly title: string // obligatorio (D-13)
  readonly children?: ReactNode // el texto
  readonly role?: 'note' | 'status' | 'alert' // por defecto 'note'
  readonly action?: { readonly label: string; readonly to?: string; readonly onClick?: () => void }
  readonly onDismiss?: () => void // solo con tone 'info' o 'good'
}

export interface ChipProps {
  readonly tone: Tone // el icono sale del tono: good check, warn warning, bad error, info info
  readonly children: string // obligatorio; un texto vacío falla en el test del componente
}
```

### 4.8 Las escalas

**`Scale5`** (D-42; X-20) es la escala de cinco tramos de la llegada: cinco tramos iguales de `min-h-9` (36) en el ancho del panel, con 4 px de hueco y `rounded-ui`, en el orden de `ARRIVAL_ORDER` (`fundido`, `cargado`, `bien`, `perfecto`, `oxidado`: `Cooked`, `Loaded`, `Fine`, `Spot on`, `Rusty`). Los inactivos, `bg-surface-2` con borde `line-strong` y la palabra en `caption` `ink-2`; el activo, relleno de su `arrival-*` con la palabra en `caption` 700 `white` (de 5,02 a 6,57). Debajo, los ejes en `caption` `ink-3`: `◀ Too tired` a la izquierda y `Too fresh ▶` a la derecha (pantalla). Marca el tramo, nunca un punto dentro de él. A 320 px cada tramo mide unos 52 px y la palabra más larga, `Spot on`, cabe (estimado; lo mide la comprobación 2). Estados: `ready` (un tramo activo); `empty` (ninguno, y `Not enough data yet` debajo en `meta` `ink-2`); `inactive` (la carrera ya ha empezado: ninguno, y `Racing now · stage 3 of 5`). Es `role="img"` con `aria-label="Race Var: you'll arrive Loaded, 2 of 5, from too tired to too fresh"` (pantalla). La instrucción de cada tramo la escribe §10.4.

```ts
// apps/web/src/components/ui/Scale5.tsx
import type { ArrivalLabel } from '@cyclingstar/shared' // contracts.ts l. 220-221

export const ARRIVAL_ORDER = ['fundido', 'cargado', 'bien', 'perfecto', 'oxidado'] as const

export interface Scale5Props {
  readonly value: ArrivalLabel | null // null: `Not enough data yet`
  readonly racing?: { readonly stage: number; readonly stages: number } // `Racing now · stage 3 of 5`
  readonly race: string // el nombre de la carrera, para el `aria-label`
  readonly layout?: Layout
}
```

**`Meter`** sustituye a las barras con cifra (`Freshness 16 / 100`, `Home.tsx` l. 354), a `ProgressMark` y al TSS: cuatro segmentos de 8 px de alto con 4 de hueco y `rounded-full`, los llenos en `accent` (4,29:1 contra el vacío y 5,81 contra blanco, \*) y los vacíos en `line`; a su lado, la palabra en `meta` (`Freshness: low`, `Load this month: hard`, pantalla). Nunca la cifra. Con `steps={5}` sirve a los cerillos, con `3 of 5` (decisión 4-c). Estados: `ready`; `empty`, sin dato (los segmentos vacíos y `No data yet`, pantalla). Es `role="meter"` con `aria-valuemin`, `aria-valuemax`, `aria-valuenow` y `aria-valuetext` en palabras (`low`).

### 4.9 Lo fijo

D-12; O-29. De abajo arriba, a 360 × 800:

| Pieza                         | Alto                                 | Dónde                                                       | Cuándo se esconde                                                                  |
| ----------------------------- | ------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `BottomNav`                   | 56 más `env(safe-area-inset-bottom)` | fija abajo, solo por debajo de 640                          | con el teclado abierto; en `Watch`, solo si E6 acepta `useHideBottomNav` (DD-13)   |
| `ActionBar`                   | 60                                   | fija sobre la `BottomNav` (abajo del todo desde 640)        | sin cambios; con el teclado abierto                                                |
| `UpdateToast` o `InstallHint` | 48                                   | fijo sobre la `ActionBar` o, sin ella, sobre la `BottomNav` | uno solo a la vez: `UpdateToast` gana e `InstallHint` espera a la siguiente sesión |
| `OfflineBanner`               | 32                                   | bajo la cabecera, en el flujo, no fijo                      | con red                                                                            |

`AppHeader` no es fija: se va con el desplazamiento, así que con todo a la vista quedan 800 − 56 − 60 = 684 px de contenido. El marco escribe en `main` la variable `--fixed-bottom` (la suma de lo fijo visible) y `main` la lleva de relleno inferior, para que nada quede debajo de una barra. La consecuencia de la `ActionBar` va en un renglón con `…` y entera en `aria-describedby` (a 320 px partía en dos, uso). **El teclado** (H-16; sin evidencia de los jueces): mientras `isKeyboardOpen(visualViewport.height, innerHeight)` sea cierto, es decir, el alto visible baje de 0,75 veces el de la ventana, la `ActionBar` y la `BottomNav` pasan a `hidden`. La función es pura, vive en `apps/web/src/components/ui/keyboard.ts` y la prueba `ActionBar.test.tsx` con alturas simuladas; en un aparato la mira la prueba del dueño (§7.7).

### 4.10 El vocabulario de pantalla

Una palabra por cosa (D-15; I-19), en `apps/web/src/domain/words.ts`, junto a `labels.ts` y `format.ts`. Los componentes la imponen: `RankTable` llama a `formatTime` (`format.ts` l. 4-11), y `ActionRow` y `TripRow` a `formatGameDay(day, today)`, que da `Day 56` (pantalla) y, a siete días o menos, `Day 56 · in 6 days`.

| Cosa                | Se escribe (pantalla)                                                                                       | Nunca                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| un día              | `Day 56`; `Day 56 · in 6 days`; `Days 56 to 60`; `Day 12 · Season 2`                                        | `GD 56`; el día absoluto                    |
| una diferencia      | `+0:40`, `+12:05`, `+1:02:10`, `s.t.`, con `formatTime`                                                     | `+0:00:20` (`fmtTime`, `Race.tsx` l. 60-69) |
| una carrera         | `Race Var .1 · one day`; en una frase, `Race Var`                                                           | `the Race Var` (`dashboard.ts` l. 68)       |
| el viaje            | `travel out`, `travel back`, `2 travel days (1 out, 1 back)`                                                | `1d`                                        |
| el origen de un día | `Race`, `Travel`, `Your edit`, `Build · week 1`, `Team plan`, `Coach decides on the day`, `Rest (I decide)` | nada sin origen                             |
| la carga            | `Rest`, `Easy`, `Steady`, `Hard`, `Very hard`                                                               | `105 TSS`                                   |
| el dinero           | `6,173,210`, `+80`, `−80`, con `money` (`format.ts` l. 14-17)                                               | `17214` (`TeamCalendar.tsx` l. 150)         |

### 4.11 Qué sustituye cada uno

| Componente                                                           | Fichero                                   | Sustituye (la línea de hoy)                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                             | `ui/Button.tsx`                           | 111 `<button>` y 35 enlaces con 92 aspectos y seis rellenos (mapa 01 §3.3); los estilos locales de `StageGate.tsx` l. 22-25 y `OrdersGate.tsx` l. 9-12                       |
| `TextLink`                                                           | `ui/TextLink.tsx`                         | `RIDER_LINK_CLASS` (`RiderName.tsx` l. 15-16), `TeamLink` (`TeamLink.tsx` l. 8-26) y dos aspectos más (`MyRaces.tsx` l. 176, `TeamSquad.tsx` l. 184)                         |
| `ActionBar`                                                          | `ui/ActionBar.tsx`                        | `Save day edits` (pantalla; `Training.tsx` l. 324) y `Save plan` (`PlanLadder.tsx` l. 206)                                                                                   |
| `Segmented`                                                          | `ui/Segmented.tsx`                        | los botones de modo sin `aria-pressed` (`PlanLadder.tsx` l. 127-143); las pestañas a mano de `Rankings.tsx` l. 134-148                                                       |
| `Field`                                                              | `ui/Field.tsx`                            | 42 campos con 23 combinaciones; `TextField` (`TextField.tsx` l. 6-31)                                                                                                        |
| `InfoButton`                                                         | `ui/InfoButton.tsx`                       | los 23 `title` (p. ej. `MyRaces.tsx` l. 166 y 275, `TeamCalendar.tsx` l. 89-96)                                                                                              |
| `Disclosure`                                                         | `ui/Disclosure.tsx`                       | `Show the 28 days` (`Training.tsx` l. 181-190)                                                                                                                               |
| `Panel`                                                              | `ui/Panel.tsx`                            | `Panel` cian (`Panel.tsx` l. 7-33), `InfoRow` (l. 46-53) y la constante `card` (`Race.tsx` l. 71, en siete ficheros)                                                         |
| `PageHeader`                                                         | `ui/PageHeader.tsx`                       | `SectionBar` (`Panel.tsx` l. 36-43, en 18 ficheros) y 13 `h1` a mano                                                                                                         |
| `Tabs`                                                               | `ui/Tabs.tsx`                             | `Tabs`, `TabPanel`, `NavTabs` y `useTabParam` (`Tabs.tsx` l. 95-282) y sus cuatro variantes (l. 36-62)                                                                       |
| `AppHeader`, `BottomNav`                                             | `ui/AppHeader.tsx`, `ui/BottomNav.tsx`    | `Header.tsx` (l. 89-185) y `WorldClock.tsx`; `BottomNav.tsx` (l. 23-72)                                                                                                      |
| `Stat`                                                               | `ui/Stat.tsx`                             | los paneles que hacen de cifra (`MyRaces`, `TeamCalendar`; captura 15)                                                                                                       |
| `RankTable`                                                          | `ui/RankTable.tsx`                        | `GcTable` y `PointsTable` (`Race.tsx` l. 199 y 241; `StageReplay.tsx` l. 69 y 124), `TeamClassTable`, `Rankings`, `HallOfFame`, `Country`, `Finances`, `Team`                |
| `ShowAll`                                                            | `components/ShowAll.tsx` (se queda)       | nada: `RankTable` lo usa dentro; fuera `Show last N` de `RaceResults.tsx` l. 128-137 y las 10 filas de `TeamCalendar.tsx` l. 225                                             |
| `ActionRow`, `TripRow`                                               | `ui/ActionRow.tsx`, `ui/TripRow.tsx`      | las filas de `TeamCalendar` y `MyRaces`; las filas azules de viaje (`Training.tsx` l. 215-234)                                                                               |
| `RiderLabel`, `RiderHeader`                                          | `ui/RiderLabel.tsx`, `ui/RiderHeader.tsx` | `RiderName` (`RiderName.tsx` l. 15-41, en 17 sitios), `Flag` y el equipo en texto; la cabecera de `RiderProfile.tsx`                                                         |
| `Flag`                                                               | `ui/Flag.tsx`                             | `Flag.tsx` (l. 8-39) con `flag-icons` entero en la hoja (`main.tsx` l. 9)                                                                                                    |
| `StarRating`, `Icon`                                                 | `ui/StarRating.tsx`, `ui/icons.tsx`       | `StarRating.tsx` (l. 2-20, `★` con relleno por ancho); los emoji y glifos de §3.7                                                                                            |
| `Notice`, `Chip`                                                     | `ui/Notice.tsx`, `ui/Chip.tsx`            | `VeilNotice` (`VeilNotice.tsx` l. 19-55) y las ocho formas de aviso ámbar; las quince formas de chip en 23 `<span>`                                                          |
| `Skeleton`, `ErrorState`, `EmptyState`, `OfflineState`, `QueryView`  | `ui/*.tsx`                                | 44 `Loading…` (`App.tsx` l. 159), 26 «Could not load…», nueve cajas discontinuas (`MyRaces.tsx` l. 37-43) y el `Loading…` sin fin sin red                                    |
| `OfflineBanner`, `UpdateToast`, `InstallHint`                        | `ui/*.tsx`                                | nada                                                                                                                                                                         |
| `Scale5`, `Meter`                                                    | `ui/Scale5.tsx`, `ui/Meter.tsx`           | `ARRIVAL_LABEL` (`PlanLadder.tsx` l. 63-69); `ProgressMark` (`AttributeList.tsx` l. 39-51), la barra de `Home.tsx` l. 354 y `MatchRow`                                       |
| `Kit`, `LeaderJersey`, `ChampionSash`, `WornJerseyIcon`, `KitPicker` | §8 y §9                                   | `Jersey`, `LeaderJersey`, `ChampionMark` y `RiderJersey` (`Jersey.tsx` l. 17, 92, 135 y 175); `WornJerseyIcon.tsx` l. 12-18; las doce semillas de `TeamManager.tsx` l. 21-26 |

Los cinco del maillot reciben su tamaño como `KitSize` (§8), que es `28 | 40 | 48 | 72 | 96` (`KIT_PX` = `{ row: 28, card: 40, team: 48, page: 72, hero: 96 }`, D-00b): un maillot de menos de 28 px no compila, y la comprobación 10 de la prueba del teléfono (§7.1) lo vigila en la pantalla, SVG incluido.

---

**Injertos aplicados.** I-03 (§4.1: `data-ui`, `data-variant` y `data-state`, sin `className`, los seis re-sellos; `/_ui` en §5.4). I-17 (§4.6: la ficha de corredor como composición). I-18 (§4.6: el dorsal y el equipo en `RiderLabel`). I-19 (§4.10: el glosario de pantalla con su columna «Nunca», en `words.ts`). I-26 (§4.5: la fila propia anclada tras `…`; su uso por tabla, §6.2). I-30 (§4.2: el esqueleto a los 300 ms). I-32 (§4.4: la línea de estado del `PageHeader`). I-33 (§4.3: `Disclosure`). I-34 (§4.5: `TripRow`; su pantalla, §11.6).

**Objeciones resueltas.** O-16 (§4.6: la ficha de corredor). O-17 (§4.6: `RiderLabel` con dorsal y equipo). O-28 (§4.5: el enlace del nombre es la celda entera, de 44). O-29 (§4.9: el orden de lo fijo, un aviso flotante a la vez, la consecuencia en un renglón y el teclado). O-31 (§4.7: `Notice` y `Chip` exigen tono y texto en su tipo, con el icono del tono; los tonos, §3.2).

**Huecos rellenados.** H-14 (§4.7: el `Chip` de lo real y lo generado, con los tres textos de E1).

**Decisiones de esta sección.**

- **4-a**, `layout` es un `string` con solo utilidades de margen, ancho y colocación, y lo hace cumplir `vocabulario.test.ts` (§5.2), porque ninguna de las diez reglas de lint lo mira. Descartado: un tipo con prefijos de clase, que TypeScript no comprueba dentro de una cadena con espacios.
- **4-b**, la única forma de deshabilitar es `disabledReason`, con `aria-disabled` y no `disabled`, para que el control se pueda enfocar y el lector diga el porqué.
- **4-c**, los cerillos se dibujan en un `Meter` de cinco segmentos (`steps={5}`), como ya hace `MatchRow`, y no con un icono: D-07 cierra el juego de iconos en 24 y no hay icono de cerillo.
- **4-d**, las estrellas llenas son `gold` con contorno `gold-ink`: el `gold` solo queda a 2,27:1 contra blanco (\*), por debajo del 3:1 que WCAG 1.4.11 pide a un gráfico, y el contorno da 7,06. Descartado: un token `star` nuevo.
- **4-e**, como mucho dos `Notice` sobre la respuesta; el resto, debajo.
- **4-f**, `AppHeader` no es fija, para que lo fijo no pase de 116 px a 360 × 800; `Cycling Star` se esconde por debajo de 340 px y queda el logotipo.
- **4-g**, `ErrorState` saca su tipo de los errores que ya lanza la web (`ContractError`, `ApiError` con su `status`), con `errorKindOf`; ningún error nuevo en `api/request.ts`.
- **4-h**, el `danger` encima y pulsado usa `brightness-90` en lugar de un token más; el blanco encima pasa de 6,57 a unos 7,6 (estimado: los canales sRGB por 0,9).
- **4-i**, la identidad de un equipo en una tabla es su nombre seguido de su maillot de 28, el mismo orden que el corredor de `RiderLabel` (D-00c), y sin bandera al lado.
- **4-j**, la fila de `RankTable` es de 44 px como mínimo y de 56 con dos renglones, porque el maillot de 28 (D-00b) va en el primer renglón; la fila de 36 con ratón de D-06 queda para las tablas sin maillot. Escribe D-00b y D-00c como hechos.

**Propuesto para el glosario.**

- `KitSize` = `28 | 40 | 48 | 72 | 96` y `KIT_PX` = `{ row: 28, card: 40, team: 48, page: 72, hero: 96 }`, en lugar de los de §G.5 y §G.6 (D-00b); y la descripción de `RiderLabel` en §G.3: el dorsal, la bandera, el nombre y el maillot de 28, contiguos, y el equipo debajo (D-00c).
- `rowHeight` de `SkeletonShape` (44, 56 o 64): el alto de las filas que sustituye.
- `veiled`: un `data-state` más, el de la `RankTable` velada por E2 (`Hidden until you watch stage 3 · Watch`); `ui/RankTable.tsx`.
- `Layout`, `IconName`, `SkeletonShape`, `ErrorKind`: los tipos comunes del catálogo; `apps/web/src/components/ui/types.ts` y `ui/QueryView.tsx`.
- `errorKindOf`: de un error de la consulta a su tipo de `ErrorState`; `ui/QueryView.tsx`.
- `isKeyboardOpen`: el teclado abierto por el alto visible (0,75 veces el de la ventana); `apps/web/src/components/ui/keyboard.ts`.
- `useOnline`: si hay red (`navigator.onLine` y sus eventos), para la `ActionBar` y `OfflineBanner`; `apps/web/src/net.ts`.
- `formatGameDay`: `Day 56` y `Day 56 · in 6 days`; `apps/web/src/domain/words.ts`.
- Textos de pantalla: `You're offline. This loads when you reconnect.` (`OfflineState`); `Now` (`TripRow` en curso); `No data yet` (`Meter` vacío); `Error 500` (el código de `ErrorState` `server`).

**Dudas para el ensamblador.**

- D-09 pone los cerillos «según SPEC §4.1», y su regla está en SPEC §6.6 (`SPEC.md` l. 402-410: `cerillos = 2 + …`, de 2 a 5); §4.6 cita la §6.6.
- §G.4 da `Tone` con `accent` e `info`, y §3.2 los pinta distintos: `accent` relleno de `accent` con `on-accent`, e `info` en `accent` sobre `info-bg`. Si §9 o §10 usan `Chip` `accent` para `Your edit`, es el relleno; `Called up`, `good`.
