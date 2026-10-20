# Mapa 01 · La web por dentro (`apps/web/src/`)

Commit `58c14da` (la copia de trabajo, `0d80526`, solo añade documentos). **Leídos enteros**
(líneas): `index.html` 19, `package.json` 33, `vite.config.ts` 20, `favicon.svg` 5, `index.css` 17,
`main.tsx` 32, `App.tsx` 365, `Home.tsx` 403, `Training.tsx` 334, `Race.tsx` 928, `MyRaces.tsx` 550,
`PlanLadder.tsx` 263, `Tabs.tsx` 282, `Header.tsx` 185, `BottomNav.tsx` 72, las primitivas de §3.1
salvo `Jersey` y `StageGate`, y `TeamClassTable`, `TeamFeed` y `domain/format.ts`. **Por tramos**,
con la línea citada: el resto de `pages/` y `components/`, `queryClient.ts`, `api/request.ts`,
`visuals.ts`, los 65 ficheros de test, `docs/navegacion.md` §5 y §7.3, y el `theme.css` de
`tailwindcss` 4.3.3 y la CSS compilada del clon.

**Cómo se ha medido.** Scripts propios en `<scratchpad>/mapa01/` (se pierden con la sesión) que
recorren el AST con TypeScript 5.9.3: cada cadena literal de los 147 ficheros de producción (sin
`.test.*` ni `__fixtures__`), partida por espacios y clasificada por familia de Tailwind; la unidad es
la **aparición en el código**, no el elemento pintado. Botones, tablas, campos y encabezados salen del
árbol JSX con las ramas de cada ternario resueltas; los contrastes, de `contrast.py` (OKLCH a sRGB,
razón WCAG 2.x, cotejado con `colour-science`); el peso, de `vite build` en el clon. Toda cifra sin
otra marca es medida así.

## Resumen

1. **Dos sistemas visuales y medio** (§3.2): el «manager» del `@theme` (`SectionBar` dorada y `Panel`
   cian: 18 páginas, 63 paneles), una tarjeta blanca `rounded-2xl` definida 7 veces como constante y
   25 a mano (carrera, etapa, acta, cuenta, acceso) y la capa oscura de `Watch`. La acción, en índigo
   (138 apariciones, fuera de la marca) o en cian (58).
2. **No hay botón** (§3.3): 146 botones dan 109 combinaciones de clases y 92 aspectos, con seis
   rellenos de acción (tres en `/me/training`); 128 miden menos de 44 px de alto (estimado).
3. **La marca no pasa el contraste** (§2.3): blanco sobre la cabecera de `Panel`, de 3,33 a 2,22, y
   sobre `SectionBar`, de 2,57 a 2,06; `slate-400` (204 apariciones), 2,63 sobre blanco. AA pide 4,5.
4. **Los estados están sin diseñar** (§4): 44 `Loading…` iguales, 26 «Could not load…» sin reintento,
   y en seis páginas un fallo de la consulta de partida se pinta como el estado vacío.
5. **«Top 20 + Show all» en 7 de 15 tablas** (§5): el ranking pinta hasta 100 filas y la nación todas;
   ninguna fija la primera columna y 4 viven en un `Panel` con `overflow-hidden` sin desplazamiento.
6. **El 91 % de la CSS comprimida son banderas** (§8): `flag-icons` entero (271, en dos proporciones)
   para 133 países, en la hoja que bloquea la primera pintura; el arranque, 251 KB con gzip.
7. **Foco y semántica, a medias** (§7): cero `focus-visible:`, foco dibujado solo en campos, los 7
   `aria-live` en `Watch`, pestañas reinventadas sin ARIA y explicaciones que solo viven en un `title`.
8. **Seis colores y nada más** (§2): sin tokens de letra, espaciado, radio ni sombra, sin modo oscuro
   ni fuente; los hexadecimales a mano son de Tailwind v3 y las clases pintan la v4. Para re-sellar,
   17 tests de marcado (151 casos), 6 con clases literales (§9).

## §1. Rutas, páginas y tamaño

`App.tsx` declara 55 `<Route>` (l. 162-339): 33 con página y la de `*` (`NotFound`, l. 128-145), 12
tras `Private` (`ProtectedRoute.tsx` l. 9-14: `Loading…` y, sin sesión, `/login`), y 21 redirecciones
viejas (`Legacy`, l. 96-103 y 303-337). Cada página es un `React.lazy` (l. 32-80) bajo un `Suspense`
con `Loading…` (l. 159); la de etapa se pide al cargar si la URL es de etapa (l. 88-90). Marco: hueco
de la barra inferior (l. 154), `main` `max-w-6xl px-3 py-5 sm:px-4` (l. 158), pie (l. 343-361). Tamaño
(`wc -l`): `pages/` 35 ficheros y 10.457 l.; `components/` 53 y 5.953 (25 se montan desde un solo
fichero); `domain/` 23 y 4.502, más `domain/broadcast/` 6 y 3.399; `api/` 24 y 1.746; tests 15.760.

| Ruta                                                                          | Página (líneas)                                               | Componentes de `components/` que monta                                                               | Trozo (KB / gzip)                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `/`                                                                           | `Home` (403)                                                  | `Panel`, `SectionBar`, `InfoRow`, `WatchBlocks`, `LastRaceReady`, `StarRating`, `WorldClock`, `Logo` | 18,43 / 5,88                                        |
| `/news`                                                                       | `News` (263)                                                  | `Panel`, `Flag`, `StageReadyLine`, `StageGate`                                                       | 5,35 / 2,19                                         |
| `/me/profile`, `/world/riders/:id`                                            | `RiderProfile` (536)                                          | 14: `AttributeList`, `BlockReport`, `Badges`, `FormChart`, `LastRaceReport`, `RaceResults`…          | 24,75 / 7,76                                        |
| `/me/training`                                                                | `Training` (334)                                              | `Panel`, `PlanLadder` (263)                                                                          | 13,91 / 4,59                                        |
| `/me/orders`, `/me/races`                                                     | `RaceOrders` (752), `MyRaces` (550)                           | `Panel`, `StageRoute`, `OrdersGate`; `Tabs`, `ShowAll`, `Flag`                                       | 17,89 / 5,83; 13,68 / 3,74                          |
| `/me/contract`, `/me/finances`                                                | `Market` (173), `Finances` (150)                              | `Panel`, `Flag`, `TeamLink`, `VeilNotice`                                                            | 4,60 / 1,81; 4,42 / 1,73                            |
| `/team/squad`, `/team/calendar`, `/team/identity`                             | `TeamSquad` (241), `TeamCalendar` (427), `TeamIdentity` (200) | `Panel`, `Jersey`, `AttributeList`, `RaceResults`, `TeamManager`, `TeamFeed`                         | 6,51 / 2,30; 11,16 / 3,42; 5,04 / 2,12              |
| `/world/races`                                                                | `RacesIndex` (415)                                            | `Panel`, `Tabs`, `Flag`, `StageRoute`                                                                | 11,17 / 3,94                                        |
| `/world/races/:raceId`                                                        | `Race` (928) y, en un día terminado, `OneDayRace` (254)       | `Tabs`, `TeamClassTable`, `ShowAll`, `Jersey`, `RiderName`, `StageGate`                              | 21,92 / 6,50 y 3,57 / 1,71                          |
| `/world/races/:raceId/stages/:day`                                            | `StageReplay` (658), `StageWatch` (1.144), `stageView` (424)  | los 10 de `broadcast/`, `StageStory`, `RaceRadioPanel`, `PaintedRaceRadio`, `ShareStage`, `Tabs`     | 11,56 / 4,06; 95,43 / 30,97; 9,02 / 3,40            |
| `…/stages/:day/report`                                                        | `StageReport` (141)                                           | `ShareStage`, `StageGate`, `stageView`                                                               | 3,12 / 1,44                                         |
| `/world/teams`, `/world/teams/:id`, `/world/nations`, `/world/nations/:code`  | `Teams` (72), `Team` (174), `Countries` (80), `Country` (100) | `Panel`, `Flag`, `Jersey`, `TeamFeed`, `TeamManager`, `RiderName`, `VeilNotice`                      | 2,01 / 1,00; 4,80 / 2,09; 3,81 / 1,50; 3,06 / 1,15  |
| `/world/rankings`, `/world/hall-of-fame`                                      | `Rankings` (171), `HallOfFame` (150)                          | `Panel`, `RiderName`, `TeamLink`, `VeilNotice`                                                       | 4,50 / 1,77; 4,41 / 1,40                            |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | 89, 123, 72, 85 y 60                                          | `TextField`, salvo `VerifyEmail`                                                                     | de 1,79 / 0,69 a 3,15 / 1,20                        |
| `/account`, `/create`, `/how-to-play`, `/privacy`                             | 353, 189, 77 y 48                                             | `SpoilerSettings` en la primera, `StarRating` en la tercera                                          | 10,38 / 3,03; 4,10 / 1,52; 3,11 / 1,19; 1,87 / 0,79 |
| `/admin`, `/admin/names`                                                      | `AdminPanel` (255), `AdminNames` (366)                        | ninguno                                                                                              | 6,12 / 2,19; 8,86 / 2,61                            |

## §2. El sistema de hoy, contado

### §2.1 La base: Tailwind v4 y su `@theme`

Tailwind 4.3.3 por `@tailwindcss/vite` (`package.json` l. 26 y 30; `vite.config.ts` l. 6), sin
`tailwind.config` ni `postcss.config` (`find`). `index.css` importa Tailwind (l. 1), define en
`@theme` seis colores y nada más (l. 5-12: `brand-navy` `#123a5c`, `brand-navy-dark` `#0b2740`,
`brand-cyan` `#1499bb`, `brand-cyan-light` `#35bdda`, `brand-gold` `#d99400`, `brand-gold-light`
`#eaa90c`) y pone `#e8edf2` al `body` fuera del tema (l. 15-17). El resto es el tema por defecto de
v4: paleta en OKLCH (servida como `oklch(…)`, sin respaldo hexadecimal), espaciado de 0,25rem, cortes
de 40, 48, 64, 80 y 96 rem (`theme.css` l. 325-331), radios y sombras; los `hover:` salen dentro de
`@media (hover:hover)`. Solo 66 de las 6.244 apariciones llevan punto de corte (`sm:` 50, `lg:` 12,
`md:` 3, `xl:` 1), en 30 ficheros: la base sin prefijo es la del teléfono.

### §2.2 Las familias de clases

6.244 apariciones y 468 clases distintas (410 sin variantes); `Race.tsx` lleva 406 y `MyRaces.tsx` 310.

| Familia                                                                | Apariciones | Distintos                              | Los más usados                                                                                                                                                                                                                                                                                                                                                                                                            | Raros (1 o 2 apariciones)                                                                                                                                                                                                               |
| ---------------------------------------------------------------------- | ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color (`text-`, `bg-`, `border-`, `ring-`, `divide-`, `from-`, `to-`…) | 1.650       | 144 clases, 76 tonos y pasos, 20 tonos | `text-slate-500` 229, `text-slate-400` 204, `text-slate-700` 88, `text-slate-600` 80, `text-white` 74, `bg-white` 73, `text-slate-800` 61, `border-slate-200` 53, `text-red-600` 52, `border-slate-300` 43, `bg-slate-50` 36, `text-brand-cyan` 34, `border-slate-100` 30, `bg-slate-100` 27, `bg-indigo-500` 23, `text-indigo-600` 22, `bg-indigo-600` 21, `text-slate-900` 21, `bg-slate-200` 18, `text-emerald-600` 18 | 70 de las 144 clases; 28 tonos y pasos, con una sola aparición `cyan-50`, `cyan-700`, `emerald-100`, `emerald-300`, `indigo-400`, `rose-200`, `rose-300`, `rose-400`, `sky-50`, `sky-200`, `sky-600`, `violet-500` y `brand-gold-light` |
| Tamaño de letra                                                        | 710         | 9                                      | `text-sm` 371, `text-xs` 260, `text-2xl` 22, `text-[11px]` 20, `text-lg` 13, `text-xl` 10, `text-[10px]` 7, `text-base` 5                                                                                                                                                                                                                                                                                                 | `text-3xl` (`RaceRadioPanel.tsx` l. 379, `Finances.tsx` l. 111)                                                                                                                                                                         |
| Peso                                                                   | 443         | 5                                      | `font-medium` 243, `font-semibold` 112, `font-bold` 54, `font-normal` 22, `font-mono` 12                                                                                                                                                                                                                                                                                                                                  | ninguno                                                                                                                                                                                                                                 |
| Radio                                                                  | 236         | 7                                      | `rounded-lg` 81, `rounded-2xl` 42, `rounded-md` 41, `rounded-full` 32, `rounded-xl` 23, `rounded` 14                                                                                                                                                                                                                                                                                                                      | ninguno (el menos usado, `rounded-sm`, 3)                                                                                                                                                                                               |
| Sombra                                                                 | 44          | 3                                      | `shadow-sm` 42                                                                                                                                                                                                                                                                                                                                                                                                            | `shadow-md` (`Header.tsx` l. 110), `shadow-[0_-2px_8px_rgba(0,0,0,0.25)]` (`BottomNav.tsx` l. 44)                                                                                                                                       |
| Relleno                                                                | 645         | 47                                     | `py-2` 115, `px-3` 101, `px-4` 60, `py-1.5` 60, `py-1` 48, `px-2` 43, `py-0.5` 24, `py-2.5` 22, `p-0` 16, `p-5` 16, `p-6` 16, `px-2.5` 13, `p-3` 12, `p-4` 11                                                                                                                                                                                                                                                             | 22, p. ej. `pl-24` (`Training.tsx` l. 283 y 290), `py-16` (`ErrorBoundary.tsx` l. 38), `px-5` (`Team.tsx` l. 169)                                                                                                                       |
| Hueco (`gap-*`)                                                        | 265         | 18                                     | `gap-2` 80, `gap-3` 62, `gap-1` 35, `gap-1.5` 20, `gap-y-1` 15, `gap-x-3` 13, `gap-4` 10                                                                                                                                                                                                                                                                                                                                  | `gap-5`, `gap-8`, `gap-x-8`, `gap-y-2`, `gap-[2px]` y `gap-[3px]` (`AttributeList.tsx` l. 42 y 114)                                                                                                                                     |
| Ancho máximo                                                           | 25          | 7                                      | `max-w-sm` 7, `max-w-6xl` 5 (el marco), `max-w-md` 5, `max-w-xl` 4                                                                                                                                                                                                                                                                                                                                                        | `max-w-2xl`, `max-w-lg`, `max-w-[11rem]` (`RaceRadioPanel.tsx` l. 233)                                                                                                                                                                  |
| Interletraje y cifras                                                  | 67 y 98     | 2 y 1                                  | `tracking-wide` 43, `tracking-tight` 24; `tabular-nums` en 31 ficheros                                                                                                                                                                                                                                                                                                                                                    | ninguno                                                                                                                                                                                                                                 |

Además: `space-y-*` 120, `uppercase` 40, `leading-*` 6, 47 valores arbitrarios (18 distintos),
`hover:` 181, `disabled:` 43, `focus:` 43, `dark:` 0. Por tono: `slate` 953, `white` 195, `indigo` 138,
`amber` 81, `red` 77, `brand-cyan` 58; los seis tokens de la marca suman 86 (5 %). El 40 % de los
tamaños de letra (287 de 710) son de 12 px o menos, y 34 de los 42 campos llevan `text-sm` (14 px), por debajo
de los 16 px con que Safari de iPhone no amplía al enfocar (conocido, no comprobado aquí).

### §2.3 Los colores de texto y su contraste

Hexadecimal de v4 desde `theme.css` y razón medida con `contrast.py`. El texto de 14 px seminegrita y
el de 18 px negrita no son «grandes» para WCAG: piden 4,5.

| Color (apariciones)                                              | Hex en v4                       | Fondo                                    | Razón                        | Dónde                                                                                               |
| ---------------------------------------------------------------- | ------------------------------- | ---------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `slate-900` (21, texto base), `slate-700` (88), `slate-600` (80) | `#0f172b`, `#314158`, `#45556c` | blanco                                   | 17,84; 10,34; 7,56           | `App.tsx` l. 154                                                                                    |
| `slate-500` (229)                                                | `#62748e`                       | blanco; `slate-50`; `body` `#e8edf2`     | 4,77; 4,55; **4,05**         | el `Loading…` va sobre el `body` (`App.tsx` l. 159)                                                 |
| `slate-400` (204)                                                | `#90a1b9`                       | blanco; `body`                           | **2,63**; **2,23**           | rótulos, vacíos y el pie (`App.tsx` l. 343)                                                         |
| `slate-300` (14)                                                 | `#cad5e2`                       | blanco                                   | **1,48**                     | filas DNF (`Race.tsx` l. 213)                                                                       |
| `red-600` (52)                                                   | `#e7000b`                       | blanco; `body`                           | 4,76; **4,05**               | los errores (§4)                                                                                    |
| `brand-cyan` (34); `emerald-600` (18)                            | `#1499bb`; `#009966`            | blanco                                   | **3,33**; **3,67**           | enlaces y veredictos (`Home.tsx` l. 229); `Saved.` (`Training.tsx` l. 326)                          |
| `amber-500`                                                      | `#fe9a00`                       | blanco                                   | **2,15**                     | DNF, OUT y el oro (`Race.tsx` l. 226; `TeamClassTable.tsx` l. 41; `riderResults.ts` l. 66)          |
| blanco                                                           |                                 | de `brand-cyan` a `brand-cyan-light`     | **3,33 a 2,22**              | cabecera de `Panel` (`Panel.tsx` l. 25-26)                                                          |
| blanco                                                           |                                 | de `brand-gold-light` a `brand-gold`     | **2,06 a 2,57**              | `SectionBar` (`Panel.tsx` l. 38-39)                                                                 |
| blanco; `white/70`; logotipo `#4f46e5`                           |                                 | `brand-navy`; `brand-navy-dark`; los dos | 11,76; 8,11; **1,87 a 2,42** | cabecera y barra inferior; el logotipo en la cabecera (`Header.tsx` l. 110-117), gráfico que pide 3 |

### §2.4 Los colores escritos a mano

En cadenas de `.ts` y `.tsx`: 52 apariciones de 34 valores en 6 ficheros, 31 hexadecimales y 3 `rgba`.
De los 31, **25 son la paleta de Tailwind v3** (el `slate-400` de v3 es `#94a3b8`; el de las clases,
`#90a1b9`), 5 son tonos de piel y uno es el blanco.

| Fichero y líneas                                                     | Valores                                                                                        | Qué pintan                                        |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `components/visuals.ts` l. 34-48, 52, 78                             | los 14 de `JERSEY_COLORS` (tonos 600 y 500 de v3), los 5 de `SKIN_TONES` (sin uso) y `#ffffff` | el maillot procedural (mapa 03)                   |
| `components/Jersey.tsx` l. 29, 74-76, 113, 162-163; `Flag.tsx` l. 33 | `#facc15`, `#16a34a`, `#bbf7d0`, `#2563eb`, `#ffffff`, `#f1f5f9`, `#1e293b` y tres `rgba`      | líderes, `ChampionMark` y el filete de la bandera |
| `components/Logo.tsx` l. 14-33                                       | `#4f46e5` siete veces y `#f59e0b` dos                                                          | el logotipo (§6)                                  |
| `components/FormChart.tsx` l. 64-80                                  | `#e2e8f0`, `#94a3b8`, `#4f46e5`, `#10b981`                                                     | rejilla, rótulos y líneas de la gráfica de forma  |
| `components/broadcast/ProfileStrip.tsx` l. 63-139                    | `#e2e8f0`, `#fcd34d`, `#92400e`, `#059669`, `#06b6d4`, `#4f46e5`, `#475569`                    | la tira del perfil de `Watch`                     |

Fuera de las cadenas: `index.css` l. 6-11 y 16, `favicon.svg` l. 2 y 4, y la sombra de `BottomNav.tsx`
l. 44. Hay 8 `style={{…}}`: 4 anchos en porcentaje (`StarRating.tsx` l. 11, `Home.tsx` l. 357,
`RiderProfile.tsx` l. 136, `RaceEffortLog.tsx` l. 82), 2 en `Flag` (l. 25 y 31) y 2 en `Watch`.

### §2.5 Letra y modo oscuro

**No se carga ninguna fuente** (ni `@font-face` ni enlace en `index.html`): la pila del sistema de v4,
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto…` (`theme.css` l. 2-4), a 16 px e interlineado
1,5. **No hay modo oscuro**: cero `dark:`, ni `prefers-color-scheme`, `color-scheme` o `theme-color`;
lo oscuro son superficies sueltas (cabecera, barra inferior y `bg-slate-900` de `Watch`).

## §3. Las primitivas y lo que cada página reinventa

### §3.1 Las primitivas que existen

| Primitiva                                                                 | Dónde                                                                  | Qué hace                                                                                                                                                                                      | Usos JSX / ficheros                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `Panel` e `InfoRow`                                                       | `Panel.tsx` l. 7-33 y 46-53                                            | tarjeta `rounded-md bg-white shadow-sm ring-1 ring-black/5` con `overflow-hidden` (l. 22) y cabecera degradada cian con `h2` blanco `text-sm font-semibold` (l. 25-26); fila etiqueta y valor | 63 / 21 (56 con título); 20 / 4       |
| `SectionBar`                                                              | `Panel.tsx` l. 36-43                                                   | barra dorada degradada con el `h1`, `text-lg font-bold`                                                                                                                                       | 25 / 18                               |
| `Tabs`, `TabPanel`, `NavTabs`, `useTabParam`                              | `Tabs.tsx` l. 153-222, 229-253, 95-123, 263-282                        | pestañas con el patrón ARIA, cuatro variantes (`header`, `page`, `underline`, `pill`, l. 36-62), carril desplazable con la barra oculta (l. 32-33)                                            | 8 / 5; 6 / 4; 1 (`Header.tsx` l. 175) |
| `ShowAllButton`, `TOP_ROWS`                                               | `ShowAll.tsx` l. 10-33                                                 | `Show all N` y `Show top 20`, con `aria-expanded`                                                                                                                                             | 7 / 5                                 |
| `TextField`                                                               | `TextField.tsx` l. 6-31                                                | etiqueta y campo con anillo índigo al enfocar                                                                                                                                                 | 7 / 4 (solo el acceso)                |
| `StarRating`; `Badges`                                                    | `StarRating.tsx` l. 2-20; `Badges.tsx` l. 6-28                         | cinco `★` con relleno ámbar por ancho; logros en chips ámbar con el emoji de la base                                                                                                          | 4 / 4; 1 / 1                          |
| `Flag`                                                                    | `Flag.tsx` l. 8-39                                                     | `flag-icons` a la altura dada, `role="img"`, `🏳️` sin país                                                                                                                                    | 48 / 26                               |
| `Jersey`, `LeaderJersey`, `ChampionMark`, `RiderJersey`, `WornJerseyIcon` | `Jersey.tsx` l. 17, 92, 135, 175; `broadcast/WornJerseyIcon.tsx` l. 12 | los maillots en SVG (mapa 03)                                                                                                                                                                 | 10/8, 10/9, 1/1, 6/4, 6/3             |
| `RiderName`, `RIDER_LINK_CLASS`                                           | `RiderName.tsx` l. 15-41                                               | enlace con subrayado punteado; humanos en negrita, NPC en cursiva                                                                                                                             | 17 / 9; la clase, en 3 ficheros       |
| `TeamLink`; `StageRoute`                                                  | `TeamLink.tsx` l. 8-26; `StageRoute.tsx` l. 10-22                      | enlace con solo `hover:underline`; «origen → destino»                                                                                                                                         | 9 / 6; 11 / 10                        |
| `VeilNotice`                                                              | `VeilNotice.tsx` l. 19-55                                              | el aviso ámbar del velo, `role="note"`                                                                                                                                                        | 9 / 9                                 |
| `StageGateCard`, `RevealConfirm`, `DiagnosticStrip`, `TwoDeviceNotice`    | `StageGate.tsx`                                                        | la puerta, la confirmación (`role="dialog"` en línea, l. 59-62), la franja ámbar fija (l. 249-259)                                                                                            | 3/3, 4/4, 5/5, 2/2                    |
| `ErrorBoundary`; `Logo`                                                   | `ErrorBoundary.tsx` l. 17-66; `Logo.tsx` l. 2-39                       | una barrera, en la raíz (`main.tsx` l. 22-30); la bici en SVG                                                                                                                                 | 1 / 1; 3 / 2                          |

**No existen** en `components/` (ni fichero ni export): botón, tarjeta fuera de `Panel`, chip, aviso,
estado vacío, indicador de carga o esqueleto, selector, tabla, ventana modal, globo de ayuda ni icono.

### §3.2 Lo que se reinventa

| Patrón                                                                                 | Copias                                                                                                                          | Dónde                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tarjeta `rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`, rival de `Panel` | constante `card` en 7 ficheros (25 usos; la de `StageWatch.tsx` l. 255 con `p-3`) y 25 copias a mano                            | `Race.tsx` l. 71, `StageReplay.tsx` l. 52, `OneDayRace.tsx` l. 28, `stageView.tsx` l. 37, `StageGate.tsx` l. 21, `StageStory.tsx` l. 33; acceso, `Account`, `HowToPlay`                            |
| Rótulo `text-xs font-semibold uppercase tracking-wide text-slate-400`                  | constante `head` en 5 ficheros (15 usos) y 22 copias con variantes de peso y margen                                             | `Race.tsx` l. 72, `StageReplay.tsx` l. 53, `OneDayRace.tsx` l. 29, `stageView.tsx` l. 38, `StageStory.tsx` l. 34                                                                                   |
| Título de página                                                                       | `SectionBar` en 18 ficheros; `h1 text-2xl font-bold tracking-tight` en 13 páginas, `NotFound` y `ErrorBoundary`; `text-xl` en 3 | `Race.tsx` l. 792; `StageReplay.tsx` l. 487; `StageReport.tsx` l. 99; `AdminPanel.tsx` l. 49                                                                                                       |
| Caja vacía discontinua                                                                 | 9 copias en 8 ficheros (7 `rounded-md`, 2 `rounded-2xl`)                                                                        | `MyRaces.tsx` l. 37-43 (local), `News.tsx` l. 225, `Finances.tsx` l. 123, `Market.tsx` l. 156…                                                                                                     |
| Aviso ámbar                                                                            | 8 formas                                                                                                                        | `VeilNotice.tsx` l. 28-31, copiado en `Home.tsx` l. 91-94 y `Race.tsx` l. 850-853; `Login.tsx` l. 56; `CreateRider.tsx` l. 107; `Account.tsx` l. 41; `Training.tsx` l. 205; `StageGate.tsx` l. 252 |
| Distintivo de salud                                                                    | 3 copias de la paleta                                                                                                           | `domain/health.ts` l. 23-43, `Team.tsx` l. 23-27, `TeamSquad.tsx` l. 36-40                                                                                                                         |
| Pestañas                                                                               | `Tabs` 8 veces; a mano en 3 sitios                                                                                              | `Rankings.tsx` l. 134-148 (sin `role`), `PlanLadder.tsx` l. 127-143 (sin `aria-pressed`), `PlayerControls.tsx` (con él); `RacesIndex.tsx` l. 345-356 usa `Tabs` como filtro, sin panel             |
| Tablas de clasificación                                                                | `GcTable` y `PointsTable`, dos veces                                                                                            | `Race.tsx` l. 199-269 y `StageReplay.tsx` l. 69-159                                                                                                                                                |
| Tiempo y dinero                                                                        | dos formatos de cada                                                                                                            | `formatTime` (`domain/format.ts` l. 4-11: `+0:12`) frente a `fmtTime` (`Race.tsx` l. 60-69: `+0:00:12`); `money` (`format.ts` l. 14-17) y su copia (`Market.tsx` l. 15)                            |
| «Show all»                                                                             | 3 versiones                                                                                                                     | `ShowAllButton`; `RaceResults.tsx` l. 128-137 (`Show last N`); `TeamCalendar.tsx` l. 225 y 380-387 (10 filas, `Show fewer`)                                                                        |
| Chips                                                                                  | al menos 15 formas en 23 `<span>`                                                                                               | `rounded-full px-2 py-0.5 text-xs` (6), `rounded px-1.5 py-0.5 text-[10px]` (4)…                                                                                                                   |
| Campos                                                                                 | 42 con 23 combinaciones; `TextField` solo en el acceso                                                                          | 10 `<select>` iguales en `RaceOrders.tsx`; `PlanLadder.tsx` l. 155, 177 y 194 sin estilo de foco                                                                                                   |
| Enlaces                                                                                | 4 aspectos                                                                                                                      | `RIDER_LINK_CLASS`; `TeamLink`; `text-brand-cyan hover:underline` (`MyRaces.tsx` l. 176); `text-indigo-600` (`TeamSquad.tsx` l. 184)                                                               |

### §3.3 Los botones

111 `<button>` y 35 enlaces con aspecto de botón (relleno horizontal, fondo o borde, y radio) dan
**109 combinaciones de clases** (79 de una sola vez) y **92 aspectos** sin márgenes, anchos ni
estados. Ocho estilos locales: `primary` y `secondary` de `StageGate.tsx` l. 22-25 (copiados en
`OrdersGate.tsx` l. 9-12), `ShareStage.tsx` l. 47, `WatchBlocks.tsx` l. 119, `PlayerControls.tsx` l.
57, `RaceRadioPanel.tsx` l. 361 y `StageReplay.tsx` l. 432. Radios: `rounded-lg` 88, `rounded-md` 29,
ninguno 24. Alto **estimado** (interlineado, dos rellenos y el borde): moda de 32 px, y 18 de 146
llegan a 44 (la barra inferior da 56, `BottomNav.tsx` l. 54).

| Relleno de la acción (texto blanco)                  | Botones  | Dónde                                                                                                                                                                       |
| ---------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg-indigo-600`                                      | 20       | acceso, `Account`, `CreateRider`, `TeamManager`, `TeamCalendar.tsx` l. 105, `Training.tsx` l. 318 (`Save day edits`), `ErrorBoundary`                                       |
| `bg-brand-cyan`                                      | 12       | `Home`, `WatchBlocks`, `MyRaces.tsx` l. 271, `PlanLadder.tsx` l. 206 (`Save plan`), `RiderProfile.tsx` l. 394                                                               |
| `bg-slate-900`                                       | 11       | `StageGate`, `OrdersGate`, `stageView.tsx` l. 163, `PlayerControls`, `StageCards`                                                                                           |
| `bg-brand-navy`; `bg-slate-800`; `bg-brand-gold`     | 5; 1; 1  | `NotFound` (`App.tsx` l. 136), `VerifyEmail.tsx` l. 45 y 49, la pestaña activa; `Training.tsx` l. 163 (`Publish my plan as the team plan`); `Sign up` (`Header.tsx` l. 141) |
| peligro: `bg-red-600`, `bg-rose-600`, `bg-amber-600` | 2, 1 y 1 | `Account.tsx` l. 272 y 49, `AdminPanel.tsx` l. 234, `MyRaces.tsx` l. 146                                                                                                    |

## §4. Los estados, página por página

**Carga**: 44 `Loading…` (42 `text-slate-500` sobre el fondo), sin esqueleto ni indicador (cero
`animate-`). **Error**: 26 «Could not load…» o «Could not reach…» (46 «Could not…»), un `text-red-600`
suelto sin reintento; solo reintentan `Try again` (`ErrorBoundary`) y `Retry` (`Watch`). React Query
reintenta una vez a los 500 ms (`queryClient.ts` l. 383-384) y el manejador global solo lleva el 401 a
`/login` (l. 371-373 y 390-391); un fallo de consulta no llega a `ErrorBoundary`, que atrapa los de
pintado y sustituye la aplicación entera, cabecera incluida (`main.tsx` l. 22-30). **Vacío**: texto
`slate-400`, texto `slate-500`, caja discontinua o nada. **Deshabilitado**: `disabled:opacity-60` 21,
`-50` 13, `-40` 4, `cursor-not-allowed` 2; el porqué, si se dice, en un `title`.

| Página                                         | Carga                                                           | Error                                                                  | Vacío                                                                                                      | Deshabilitado y avisos                                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Home`                                         | l. 400; `Checking…` l. 29                                       | l. 30; si falla `/api/riders/me`, `NewPlayerHome` (l. 401)             | `No training data yet.` l. 364                                                                             | `CookieReaderNotice` l. 87-100; tonos de `ActionRow` l. 145-149                                              |
| `Training`                                     | l. 123                                                          | l. 124; guardar l. 315                                                 | los días sin plan no se pintan (l. 237)                                                                    | l. 267-271 y 321-322; día de carrera ámbar l. 203-212 y de viaje azul l. 220-233                             |
| `PlanLadder`                                   | ninguna (l. 83, 97 y 227 no pintan nada mientras llegan)        | solo al guardar (l. 217); si falla la vista previa, nada               | l. 235-238                                                                                                 | l. 209-210; etiquetas de llegada l. 63-69                                                                    |
| `MyRaces`                                      | l. 77, 303, 394 (si falla el corredor, `Loading…` para siempre) | l. 78, 187, 304, 375, 395                                              | `Empty`, l. 86-89, 336, 396                                                                                | l. 149, 265, 274 (el porqué en `title`, l. 275)                                                              |
| `RaceOrders`                                   | l. 356, 427                                                     | l. 428, 430                                                            | l. 357-369, también si falla `upcoming`                                                                    | l. 380-383; consejos `⚠` e `ℹ`, l. 708-723                                                                   |
| `RiderProfile`                                 | l. 388, 404                                                     | l. 405-406                                                             | `No rider yet` l. 389-401, también si falla `mine`; paneles sin datos que desaparecen (l. 306, 503, 526)   | salud y edad con `title` (l. 63-80, 432-435); `VeilNotice` l. 424                                            |
| `Race`                                         | l. 760; `Suspense` l. 905                                       | l. 761; seguir l. 695                                                  | siete textos `slate-400` (l. 124, 494, 514, 520, 526, 535, 548)                                            | l. 690 y 867; velo l. 849-860; `DiagnosticStrip` l. 902                                                      |
| `StageReplay`                                  | seis esperas (arriba)                                           | l. 348, 414                                                            | l. 207, 213, 219, 589, 644                                                                                 | anterior y siguiente como `<span>` con `opacity-40` (l. 459, 468); `TwoDeviceNotice` l. 523-531              |
| `Watch`                                        | `Loading` en `role="status"` (`PlayerControls.tsx` l. 187-188)  | `Connection lost · Retry` (l. 189-197)                                 | `Nothing to tell yet.` (`StageCards.tsx` l. 162)                                                           | mandos l. 161 y 257; `ClockNotice`                                                                           |
| `StageReport`; `OneDayRace`                    | l. 106-107; l. 107, 145, 199                                    | l. 124-125; l. 139-143                                                 | l. 120-122; l. 240-243                                                                                     | la puerta (`StageGateCard`)                                                                                  |
| `News`; `RacesIndex`; `Rankings`; `HallOfFame` | l. 160; l. 314; l. 130 y 163-164; l. 56                         | l. 161; l. 315; l. 131; l. 57                                          | cajas discontinuas (l. 224-229; l. 363-365); l. 21-26; l. 83-88                                            | filtro sin opciones (`News.tsx` l. 50); `VeilNotice`                                                         |
| `Teams`; `Countries`; `Country`; `Team`        | l. 59; l. 49; l. 23; l. 59                                      | l. 60; l. 50; l. 24; l. 60 y 115-116                                   | sin texto en las dos primeras (`Teams.tsx` l. 22); l. 43-44; noticias que no se pintan (`Team.tsx` l. 153) | `Team.tsx` l. 110-111; `VeilNotice`                                                                          |
| `TeamSquad`; `TeamIdentity`                    | l. 61, 173, 193; l. 106, 123                                    | l. 62-63 y 194; l. 124                                                 | agente libre en caja discontinua (l. 177-189; l. 108-118), también si falla el resumen                     | `VeilNotice` (`TeamSquad.tsx` l. 203)                                                                        |
| `TeamCalendar`                                 | l. 316, 406                                                     | l. 317-318; el cambio del plan falla en silencio (l. 212)              | l. 191-194, 346-348 y 410-420, esta también si falla `plan`                                                | l. 107-111; viaje caro en rosa con `✈` y `title` (l. 81-95)                                                  |
| `Finances`; `Market`                           | l. 99; l. 123                                                   | l. 100; l. 124                                                         | caja `rounded-2xl`, l. 122-126 y 155-158                                                                   | `Market.tsx` l. 93 y 100                                                                                     |
| acceso, `Account`, `CreateRider`               | el texto del botón (`Logging in…`, `Creating…`, `Saving…`)      | `text-sm text-red-600` con el mensaje del servidor (`Login.tsx` l. 54) |                                                                                                            | `disabled:opacity-50`; cajas ámbar (`Login.tsx` l. 56-63, `CreateRider.tsx` l. 106-107, `Account.tsx` l. 41) |

## §5. Las tablas

15 `<table>`; ninguna fija la primera columna (el único `sticky` es `StageGate.tsx` l. 252). Nueve
no tienen fila de cabecera (son listas con `<caption className="sr-only">`), y cuatro van en un `Panel`
que recorta lo que no quepa (`overflow-hidden`, `Panel.tsx` l. 22) sin `overflow-x-auto` dentro. La
regla de `docs/navegacion.md` §7.3 (l. 449-451), «top 20 visible + Show all», se cumple en 7.

| Tabla                                                                | Columnas                                                                      | Cabecera                     | `overflow-x-auto`       | Top 20 + Show all                          | Filas que puede tener                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- | ----------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| general, y puntos y montaña, de la carrera (`Race.tsx` l. 205 y 246) | 4 (puesto, bandera, corredor, con su equipo en la general, y tiempo o puntos) | no                           | no                      | sí                                         | la carrera entera                                               |
| general y puntos de la etapa (`StageReplay.tsx` l. 83 y 137)         | 4 y 4                                                                         | no                           | no                      | sí                                         | la carrera entera                                               |
| llegada (`stageView.tsx` l. 88)                                      | 4                                                                             | no                           | no                      | sí, con los DNF siempre a la vista (l. 85) | la carrera entera                                               |
| equipos (`TeamClassTable.tsx` l. 24)                                 | 4                                                                             | no                           | no                      | sí                                         | los equipos de la carrera                                       |
| resultados propios (`MyRaces.tsx` l. 404)                            | 3 (carrera, resultado, puesto)                                                | sí, con `scope`              | sí                      | sí                                         | todas las corridas                                              |
| programa e inscribibles (`MyRaces.tsx` l. 98 y 340)                  | 4 y 4                                                                         | sí                           | sí                      | no                                         | las próximas; las continentales abiertas                        |
| ranking (`Rankings.tsx` l. 29)                                       | 4                                                                             | no                           | no, en `Panel p-0`      | **no**                                     | 100 (`packages/db/src/ranking.ts` l. 279)                       |
| salón de la fama (`HallOfFame.tsx` l. 92)                            | 7                                                                             | sí                           | sí, con `min-w-[520px]` | **no**                                     | 40 (`apps/api/src/routes/rankings.ts` l. 79)                    |
| nación (`Country.tsx` l. 48)                                         | 5                                                                             | sí                           | sí                      | **no**                                     | todo el país, sin tope (`packages/db/src/browse.ts` l. 257-295) |
| movimientos (`Finances.tsx` l. 129)                                  | 4                                                                             | no                           | no, en `Panel p-0`      | **no**                                     | 60 (`packages/db/src/economy.ts` l. 257)                        |
| plantilla (`Team.tsx` l. 123)                                        | 4                                                                             | no                           | no, en `Panel p-0`      | no                                         | la plantilla                                                    |
| plan del mánager (`TeamCalendar.tsx` l. 197)                         | 5 (día, carrera, dónde, viaje, plan)                                          | sí, sin `scope` ni `caption` | no, en `Panel p-0`      | no                                         | lo que queda de temporada                                       |

Hacen de tabla sin serlo las listas de `RacesIndex`, `News`, `RaceResults` y `TeamCalendar`. En las
clasificaciones el equipo va en la celda del nombre (`Race.tsx` l. 219-223) y la fila crece hacia abajo.

## §6. Iconos, banderas y logotipo

- **No hay librería de iconos** (`package.json` l. 13-23). SVG a mano: `Logo.tsx` l. 4-37, los
  maillots (`Jersey.tsx` l. 20, 104 y 153), `FormChart.tsx` l. 56 y `ProfileStrip.tsx` l. 130; la
  altimetría llega de la API y se inyecta (`Race.tsx` l. 352-357, `StageReplay.tsx` l. 637-642,
  `RaceOrders.tsx` l. 478-482).
- **Unicode y emoji**, con la fuente del sistema: `→` 21 y `←` 6; `★` `☆`; `▲` `▼` `↑` `↓` `↗` `↘`
  `ⓘ`; `▶` `◀` `⏵` `⌂` `❚` `⋯` (radio y mandos); `🏆` (`RacesIndex.tsx` l. 126 y 223), `✈` y `🚴`
  (`Training.tsx` l. 227 y 210), `🏁` (`LastRaceReport.tsx` l. 102), `🏠` (`Finances.tsx` l. 39), `🌧`
  `🌦` `☀` y `⚠` `ℹ` (`RaceOrders.tsx` l. 244 y 718); los logros traen el suyo de la base
  (`packages/db/src/ranking.ts` l. 571-621).
- **Banderas**: `flag-icons` 7.5.0 (`package.json` l. 18), CSS entera (`main.tsx` l. 9), `fi fi-xx` en
  4:3 (`Flag.tsx` l. 30-37) a once alturas: 16 px (19 veces), 14 (13), 12 (5) y otras.
- **Logotipo**: bici y estrella en `#4f46e5` y `#f59e0b`, índigo y ámbar de v3 y no de la marca
  (`Logo.tsx` l. 14-33), a 30 px en la cabecera (`Header.tsx` l. 117) y a 80 y 96 en `Home` (l. 107 y
  60); el nombre se esconde por debajo de 640 px (`Header.tsx` l. 118). `favicon.svg` es otro dibujo
  con los mismos colores (l. 2-4).

## §7. La accesibilidad de hoy

| Qué                          | Cuánto                                         | Dónde y cómo                                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `aria-*`                     | 98                                             | `aria-label` 44, `aria-hidden` 28, `aria-expanded` 9, `aria-live` 7 (todos en `broadcast/`), `aria-pressed` 4 (`PlayerControls`), `aria-current` 2 (las dos barras), `aria-selected`, `aria-controls` y `aria-labelledby` 1 (`Tabs`); cero `aria-describedby` y `aria-invalid` |
| `role`                       | 33                                             | `img` 11 (banderas, maillots, logotipo, gráfica, altimetrías), `status` 6, `note` 4, `group` 4, `region` 3, `dialog` 2 (en línea, sin gestión de foco), `tablist`, `tab` y `tabpanel` 1                                                                                        |
| Foco visible                 | 43 `focus:` en 11 ficheros; 0 `focus-visible:` | solo campos (`focus:border-indigo-500` 14, `focus:ring-2` 12); 15 de los 42 campos (los de `RaceOrders.tsx`, clase de l. 258, y el filtro de `News.tsx` l. 24) quitan el contorno y solo cambian el color del borde; botones y enlaces, con el contorno del navegador          |
| Teclado                      |                                                | `Tabs` con índice móvil y flechas (l. 172-210); sin enlace de salto ni foco gestionado al navegar                                                                                                                                                                              |
| Nombres                      | 4 campos sin etiqueta ni `aria-label`          | `PlanLadder.tsx` l. 155, `RoleEditor.tsx` l. 60, `AdminNames.tsx` l. 167 y 324; los botones `−5` y `+5` (`RaceRadioPanel.tsx` l. 399 y 408)                                                                                                                                    |
| Texto alternativo            | sin `<img>`                                    | 17 `sr-only`, 12 de ellos los `caption` de §5; `Flag` dice el país (l. 34-36)                                                                                                                                                                                                  |
| `title`                      | 23                                             | explicaciones que el teléfono no enseña: `MyRaces.tsx` l. 166 y 275, `Race.tsx` l. 873, `Market.tsx` l. 59 y 80, `StageStory.tsx` l. 98, `TeamClassTable.tsx` l. 41                                                                                                            |
| Encabezados                  | un `h1` por página                             | `SectionBar` o `h1` propio; `Panel` da `h2`; `Watch` y `OneDayRace` cuelgan del `h1` de su página; `Home.tsx` l. 136 salta de `h1` a `h3`                                                                                                                                      |
| Idioma, regiones, movimiento |                                                | `lang="en"` (`index.html` l. 2); `header`, `main`, `footer` y 4 `nav` con nombre; `prefers-reduced-motion` solo en `StageWatch.tsx` l. 382-387                                                                                                                                 |

## §8. El peso

`vite build` (1,3 s): 79 trozos de JS (913 KB), una CSS y 142 SVG; `index.html` arranca 9 y la CSS:

| Trozo del arranque                                                | KB        | gzip      | Qué lleva (bytes atribuidos con el mapa de fuente)                                                                                                                                                       |
| ----------------------------------------------------------------- | --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.css`                                                       | 466,44    | 94,29     | 421 KB son reglas `.fi-*`: 271 banderas en 4:3 y en 1:1 (542 imágenes, 400 dentro como `data:` y 142 aparte); las 1:1 (`.fis`, 212 KB) no se usan; sin banderas, 45,6 KB y 8,5 con gzip (gzip -9 propio) |
| `index.js`, la entrada                                            | 210,07    | 66,07     | `react-dom` 178 KB (86 %); `App.tsx` 11, `Header` 3, `Tabs` 2,4                                                                                                                                          |
| `request.js`                                                      | 145,41    | 45,98     | `zod` 71 KB y `packages/shared` 69, de los que 42 son diez módulos `broadcast/*` de `Watch`                                                                                                              |
| `client.js`                                                       | 28,25     | 10,66     | `better-auth` y su `fetch`                                                                                                                                                                               |
| `useQuery`, `queryClient`, `hooks`, `lib`, `react`, `jsx-runtime` | 93,45     | 33,91     | React Query, `react-router` (38 KB), `react`                                                                                                                                                             |
| **Total**                                                         | **943,6** | **250,9** | antes del trozo de la página                                                                                                                                                                             |

Encima, con gzip (gzip de Vite): `Home` 12,0 KB (263 en total), `Training` 6,7 (258), `Race` 16,4
(267), `RiderProfile` 32,4 (283: arrastra los 38 KB de `ChronicleSentence`) y la etapa 60,7 (312, con
`StageWatch`). Podría no estar en el arranque: las banderas que el juego no usa (133 países en
`packages/shared/src/countries.ts`) y las 1:1; y los `broadcast/*`, que entran por el barril
(`packages/shared/src/index.ts` l. 12) de un paquete sin `sideEffects`, aunque `contracts.ts` solo
importa tipos de ellos (l. 18). La web no puede importar el motor (`noEngine.test.ts` l. 8-17).

## §9. Los tests que fijan el marcado

Vitest sin DOM (`vitest.config.ts` no declara `environment`): 17 ficheros pintan con
`renderToStaticMarkup` y buscan cadenas, 151 casos `it` (con `grep`). Sin regresión visual ni `axe`.

| Test (casos)                                                                                      | Qué fija                                                                                                                   | Líneas                    |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `components/stageRoute.test.tsx` (2)                                                              | **clase literal**: `<span class="text-slate-500">Barcelona</span>`                                                         | l. 19                     |
| `domain/riderResults.test.ts` (12)                                                                | **clases** de `placeTone`: `text-amber-500`, `text-slate-700`, `text-slate-500`, `text-slate-400`                          | l. 112-119                |
| `components/broadcast/CueCard.test.tsx` (8)                                                       | **clase** `bg-red-700`; `aria-live`, `aria-label` de campeón y líderes, cinco `<li>`, `data-*`                             | l. 17-160                 |
| `components/broadcast/GroupBar.test.tsx` (27)                                                     | **clases** `uppercase` y `hidden sm:inline` junto al texto; `data-group-row`, `data-mobile`, `data-cursor`, `data-pulling` | l. 39-433                 |
| `components/broadcast/PlayerControls.test.tsx` (7)                                                | **clases** `hidden` y `opacity-0 focus-within:opacity-100`; `aria-pressed`, `aria-expanded`, `role="status"`               | l. 45-182                 |
| `components/broadcast/StageCards.test.tsx` (20)                                                   | **clase** `<li class="flex gap-2 font-semibold"` tres veces; `aria-label`, `aria-live`, `data-preview-card`                | l. 231-441                |
| `pages/stageTables.test.tsx` (20)                                                                 | qué fila lleva qué maillot (parte por `<tr` y cuenta `aria-label`); `aria-selected` en `Report` o `Story`                  | l. 36-331                 |
| `pages/raceCard.test.tsx` (10)                                                                    | los textos de `role="tab"` y la pestaña activa; `3 stages ready to watch`                                                  | l. 80-203                 |
| `components/leaderJerseys.test.tsx` (7)                                                           | `aria-label` y `<title>` de los líderes; el maillot fuera del enlace                                                       | l. 29-87                  |
| `stageStoryJerseys` (1), `TimeTrialBoard` (2), `VoiceTicker` (7)                                  | estructura: `<li` del podio con su `aria-label`, tres `<li`, el `<ol`                                                      | l. 54-55; l. 69; l. 76-79 |
| `StageGate`, `WatchBlocks`, `OrdersGate`, `FixedOverlay`, `lastRaceReport`, `pages/newsFeed` (40) | textos de pantalla: 32, 24, 13, 24, 12 y 9 aserciones                                                                      |                           |

Fijan textos y no marcado `labels.test.ts` (13), `nav.test.ts` (9), `raceTabs.test.ts` (35),
`pageTitle.test.ts` (4) y `stageJournal.test.ts` (149): solo caen si E3 cambia palabras.

## Lo que este mapa no ha podido comprobar

- **Nada se ha medido en un navegador**: los altos de botón son aritmética de clases y el recorte de
  las tablas en `Panel`, lectura de la CSS (las medidas son del mapa 05); los degradados, en sus bordes.
- **Si los `broadcast/*` del arranque se ejecutan** o solo viajan en el barril, y **qué pasa si falla
  la descarga de un trozo** sin red: cae en la barrera raíz y no sé si `Try again` lo recupera.
- **Los chips son una cota inferior** (no se resuelven las clases que llegan por propiedad, como
  `STATUS_BADGE` de `Race.tsx` l. 564-568), y el recuento de clases pudo colar alguna cadena ajena.
- **No he leído enteras** `Account`, `CreateRider`, `RacesIndex`, `News`, `TeamCalendar`,
  `RiderProfile`, `StageWatch` ni las de administración: sus estados salen de la búsqueda y de los
  tramos citados. Tampoco he visto cómo salen los emoji en cada sistema.
