# Propuesta E3 · Identidad: cada cosa con su forma, y la forma medida en cinco visiones

Commit `58c14da`. Lente: los maillots y la identidad (`01-fase-propuestas.md`). Base de hechos: los cinco
mapas; donde cito una línea la he leído. **Código leído para esta lente**, entero: `Jersey.tsx` (186 l.),
`visuals.ts` (83), `broadcast/WornJerseyIcon.tsx` (31), `TeamManager.tsx` (114), `TeamClassTable.tsx`,
`packages/shared/src/jerseys.ts` (439), `apps/web/src/index.css` e `index.html`; por tramos,
`TeamIdentity.tsx` l. 95-200, `GroupBar.tsx` l. 195-249, `CueCard.tsx` l. 30-130, `routes/teams.ts`
l. 1-60, `teamControl.ts` l. 150-192, `schema.ts` l. 255-279, `world.ts` l. 450-475, `app.ts` l. 126-144,
`spaShell.ts` l. 1-130, `leaderJerseys.test.tsx` l. 78-89, `docs/retransmision.md` §7.9, `docs/agenda.md`
§4.16.1, `docs/encargos.md` E3, E8 y E12, `docs/navegacion.md` §7.4. Capturas miradas a 360 y 1.280 px:
01, 05, 06, 08, 09, 12, 15, 16, 23 y 24.

**Cómo se ha medido.** Scripts en `<scratchpad>/propuesta-identidad/` (se pierden con la sesión): `geo.py`
(cada dibujo en el `viewBox` de 48 u de `TORSO`), `render.mjs` (Chromium 1194 de `/opt/pw-browsers` por
Playwright: el SVG pintado a su tamaño en píxeles de dispositivo, 13 px a densidad 1 y 2, 16, 28 y 72),
`medida.py` y `de00.py` (Machado 2009, severidad 1, en RGB lineal; grises por luminancia; ΔE00 por píxel
pesada por la cobertura del torso, el método del mapa 03; mi ΔE00 vectorizada coincide con la de
colour-science 0.4.7 en 200.000 pares), y `exp1` a `exp12` (cada cifra de abajo dice de cuál sale). El
mundo es el del mapa 03 (`mundo03.json`: 219 equipos y las 310 carreras de `predictStartlist`). **Cotejo
con el mapa 03**: V0 frente a la equipación más cercana a 13 px, 29,3 y 11,6 (normal y grises) aquí y
28,3 y 11,9 allí; `ChampionMark` a 12,5 y 8,2 de V0 aquí, 12,2 y 8,0 allí; pares dibujados por debajo
de 10 en Race France hoy, 6, 16, 30, 12 y 102 aquí y 6, 17, 31, 14 y 108 allí. «Distancia» es siempre esa
media de ΔE00 de dos maillots dibujados al mismo tamaño. Nada de lo que digo de marcas es asesoramiento
jurídico.

## 0. Resumen

**La idea central: en Cycling Star cada identidad tiene una forma que solo es suya, y que sea
distinguible no se revisa al final, lo exige el servidor con una función medida.** Tres familias de
forma, sin solapes: **la diagonal es del campeón** (y de nadie más), **los lunares son de la montaña**, y
los equipos visten **seis figuras de dos tonos** (`plain`, `band`, `yoke`, `sleeves`, `stripe`,
`halves`) que no llevan ni diagonales ni lunares. La función `kitDistance` (la distancia de arriba, en
las cinco vistas, a 13 px con densidad 1 y 2 y a 28 px) vive en `packages/db` y la usan el generador de
los NPC, el editor del mánager, la validación de `PUT /api/teams/me/kit` y un banco del CI.

1. **La señal de campeón es la banda de honor**: una banda diagonal de 10 u de la hombrera izquierda a la
   cadera derecha. El del mundo, **oro `#e0a526` sobre noche `#14213d`**; el nacional, las tres franjas de
   su bandera sobre papel `#f6f3ea`, con filo noche de 2,4 u, como una banda presidencial. Ningún
   elemento de la marca de la UCI (ni cinco bandas, ni sus colores, ni el blanco), y se reconoce como
   forma a 13 px: medido frente al vocabulario propuesto, la del mundo queda a 24,5 del maillot más
   cercano en visión normal y a 15,8 en grises sin que ninguno baje de 10; la del orden invertido del
   dueño queda a 5,3 de la de la UCI en grises. Las variantes del dueño se miden y se juzgan una a una
   (§6.5); la más fuerte, un espectro continuo en esa misma diagonal sobre noche, va como alternativa C.
2. **El maillot de equipo se guarda, no se sortea**: tabla `team_kits` con su historia; la semilla queda
   como identidad del NPC y nadie la vuelve a escribir (mapa 03 §2.2). Colores por nombre, no por índice.
3. **14 colores, 6 figuras, regla de contraste y reparto por vecinos de carrera**: en las 310 carreras,
   **ninguna** tiene un par de maillots a menos de 10 en visión normal, protanopía, deuteranopía ni
   tritanopía, a 13, 16 y 28 px (hoy, 303, 310, 310 y 310). En grises la media baja de 103,7 pares por
   carrera a 3,9. Un solo par de maillots repetido en todo el mundo, y nunca en la misma carrera (hoy,
   88 equipos en 34 grupos).
4. **El editor** elige figura y dos colores y recibe el veredicto de la misma función, con nombre de
   equipo y de visión. **El patrocinador** compra zonas del mismo vocabulario y pasa la misma función.
5. **El dorsal no vuelve como dibujo** ([DUEÑO 5], «Ill»): la tabla por equipos pinta el maillot de cada
   equipo, que hoy es solo una bandera, y el equipo líder lleva la palabra `Leader`.
6. **La interfaz hereda la identidad**: noche y oro son la marca; todo texto medido a 4,5:1 o más.

Lo que se distingue de lo obvio: lo obvio es elegir una paleta más bonita y pasar un simulador de
daltonismo al final, y para el campeón, el arcoíris en otro orden. Aquí el daltonismo es un umbral que el
servidor aplica, y el orden de las bandas se descarta porque, medido, no da distancia. Lo que deja: en
grises (acromatopsia, muy rara) quedan 3,9 pares por carrera; el Mundial y los continentales son de E12;
el precio del patrocinio, de E8; la verificación de marcas ante EUIPO y USPTO, del lanzamiento.

## 1. Diagnóstico

No repito los mapas; apunto a ellos. **Del maillot**: la equipación se deriva de la semilla y del orden de
la paleta (`visuals.ts` l. 29-31 y 71-83; un color más repinta 102 equipos, mapa 03 §2.3); cambiar la
semilla clona el equipo (mapa 03 §2.2); hay gemelos en 302 de 310 pelotones en visión normal (§3.2); a 13
px una raya de `stripes` mide 0,81 px (§1.3); los líderes comparten color y figura con las equipaciones
(§4.1); el campeón solo existe en `Watch` y es «blanco con algo oscuro en el pecho» (§5.2 y §7.3). **De
las pantallas**: la clasificación por equipos pinta banderas y no maillots (`TeamClassTable.tsx` l. 35):
en la captura 06 a 360 px, `Aurore Équipe`, `Mistral Racing` y `Mistral Équipe` son tres banderas de
Francia seguidas. `/team/identity` (captura 16) ofrece 12 sorteos de 34 px sin nombre (`aria-label="Choose
jersey"` en los doce, `TeamManager.tsx` l. 91), guarda en índigo fuera de la marca (l. 104-111) y promete
que el maillot sale en `start lists, results and the peloton` (`TeamIdentity.tsx` l. 178-181), y en los
resultados no sale. Todos los maillots de equipo dicen `Team jersey` al lector de pantalla
(`Jersey.tsx` l. 25). **Del sistema** (mapas 01, 02 y 05, que la propuesta también resuelve): la marca no
pasa el contraste (blanco sobre el dorado de `SectionBar`, de 2,06 a 2,57; mapa 01 §2.3), dos sistemas y
medio, 146 botones con 92 aspectos (§3.3), estados sin diseñar (§4), las banderas son el 91 % de la CSS
(§8), no hay web instalable (mapa 05 §14), y el cuadro de entrenamiento falla como cuenta el mapa 02.

## 2. Principios

1. **Una forma por identidad, reservada.** Consecuencia: las diagonales solo las lleva un campeón, los
   lunares solo la montaña; el vocabulario de equipo no las contiene y el servidor rechaza lo que se les
   acerque.
2. **Distinguible es una función, no una revisión.** Consecuencia: `kitDistance` y `KIT_MIN_DISTANCE`
   (10) en código, con el mismo número en el generador, el editor, la API y el banco.
3. **Se diseña al tamaño más pequeño al que se ve: 13 px en el teléfono.** Consecuencia: ningún rasgo de
   figura por debajo de 8 u (2,2 px a 13 px); nada de texto en un maillot por debajo de 64 px.
4. **El maillot es un dato; la semilla, una identidad.** Consecuencia: `team_kits` con historia; ni el
   editor ni el patrocinador tocan `jersey_seed`.
5. **Los colores se nombran, no se cuentan.** Consecuencia: añadir un color no repinta nada guardado.
6. **La identidad del juego es la de su campeón.** Consecuencia: noche y oro son los tokens de marca.
7. **Ningún glifo pequeño que se lea como letras.** Consecuencia: ni dorsal de tres barras ni números
   en iconos; la información pequeña va en palabras o en formas sin trazos finos.
8. **Lo que compra un patrocinador es una zona del mismo vocabulario.** Consecuencia: ningún contrato
   rompe la distinción ni compra una forma reservada.
9. **El material generable se genera con un script y lo revisa una persona.** Consecuencia: los colores
   nacionales, las tablas de cobertura, los iconos y la imagen de compartir salen de scripts en el
   repositorio, nunca a mano.

## 3. Los fundamentos

### 3.1 La paleta

Los tokens van en el `@theme` de `apps/web/src/index.css` (Tailwind v4 crea `bg-night`, `text-ink-3`…)
y sustituyen a los seis `brand-*` (l. 5-12) y al fondo del `body` (l. 15-17). Razón WCAG 2.x medida
(`exp7_tokens.py`); el texto normal pide 4,5 y el gráfico 3.

| Token                     | Hex                               | Uso                                          | Contraste medido                                                   |
| ------------------------- | --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `night`                   | `#14213d`                         | cabecera, barra inferior, superficies de TV  | blanco encima 15,97; `on-night-2` `#b9c4d6` 9,07                   |
| `night-2`                 | `#2b3a55`                         | rótulo de clase 1, superficie oscura segunda | blanco encima 11,42                                                |
| `navy`                    | `#123a5c`                         | botón principal                              | blanco encima 11,76; sobre `page` 10,38                            |
| `gold-soft`               | `#f3dfa6`                         | relleno de los puertos del perfil            | `night` encima 12,11                                               |
| `gold`                    | `#e0a526`                         | barra de título, ganador, campeón, `own`     | `night` encima 7,29; nunca texto sobre blanco (2,19)               |
| `page` / `surface`        | `#eef1f5` / `#ffffff`             | fondo / paneles                              | (fondos)                                                           |
| `paper`                   | `#f6f3ea`                         | campo del campeón nacional                   | `ink` encima 14,77                                                 |
| `ink` / `ink-2` / `ink-3` | `#16202f` / `#3f4b5e` / `#566173` | texto, secundario, rótulos                   | sobre blanco 16,38 / 8,83 / 6,26; sobre `page` 14,46 / 7,79 / 5,53 |
| `line` / `line-strong`    | `#d6dce4` / `#7b8596`             | separadores / borde de campo                 | decorativo / 3,72 (gráfico)                                        |
| `link` = `focus`          | `#1c5aa6`                         | enlaces y anillo de foco                     | 6,86 sobre blanco, 6,05 sobre `page`                               |
| `success` (`-bg`)         | `#1d7a3a` (`#e6f3ea`)             | estado bueno                                 | 5,39 sobre blanco, 4,71 sobre su fondo                             |
| `warning` (`-bg`)         | `#8a4b00` (`#fdf0d9`)             | aviso, velo                                  | 6,80 / 6,04                                                        |
| `danger` (`-bg`)          | `#b3261e` (`#fbe8e6`)             | error; fondo del rótulo de clase 3           | 6,54 / 5,54; blanco encima 6,54                                    |

Lo que reemplaza: `slate-400` (2,63 sobre blanco, 2.096 nodos de axe a 360 px, mapa 05 §11) pasa a
`ink-3`; el cian de los botones (3,33) a `navy`; el índigo de 138 apariciones (mapa 01 §2.2), a `navy` o
`link`. **Modo oscuro: no en E3**. Duplica cada estado de cada componente y nadie lo ha pedido (mapa 04
§2); `Watch` ya usa superficies oscuras, que pasan a los tokens `night` y `night-2` `#2b3a55`. Los
tokens son semánticos, así que un tema oscuro posterior solo redefine valores.

**La escala de llegada** (§7) tiene colores propios, ordenados en claridad para que también se lea en
grises (`exp7b_escala.py`): `Rusty` `#3d5a80`, `Spot on` `#4fb06d`, `Fine` `#c3ccd8`, `Loaded`
`#d98a2b`, `Cooked` `#9e2a2b`. Entre tramos vecinos, ΔE00 de 12,6 o más en las cinco vistas (el peor,
`Spot on` y `Fine` en grises); texto blanco en los extremos (7,06 y 7,45) y `ink` en los otros (6,06;
10,10; 5,95). Los colores del maillot y del campeón no van en CSS: van en `packages/shared/src/kit.ts`,
porque los valida el servidor (§6).

### 3.2 La tipografía

**Texto**: la pila del sistema que ya sirve Tailwind (`theme.css` l. 2-4), 0 bytes. **Rótulo**:
Barlow Semi Condensed 600, SIL OFL, servida desde `apps/web/public/fonts/` (latina woff2: **22.984 bytes**,
medidos el 20-10-2026 en `fonts.gstatic.com`), `font-display: swap`, con `unicode-range` y la latin-ext
aparte para los nombres de 133 países. Se usa solo en títulos de página, cifras de la capa fija de TV,
barras de título y el nombre del patrocinador en el maillot grande: es la letra de la retransmisión.

Escala (px / interlineado): 12/16 (mínimo absoluto: nada por debajo, también la barra inferior, hoy 11
px en `BottomNav.tsx` l. 54, y las cotas de 8 px del perfil de `Watch`, mapa 05 §2), 13/18, 14/20 (texto
de tabla), 16/24 (cuerpo y **todo campo**, para que Safari no amplíe), 18/24, 22/28 (título de página, de
rótulo), 28/32 (cifra de la capa fija). Pesos 400, 600 y 700. `tabular-nums` en toda columna de tiempo,
puntos o posición (utilidad `num`).

### 3.3 Espaciado, rejilla, densidad, radios, sombras e iconos

Base 4 px (la de Tailwind). Margen lateral 12 px en el teléfono y 16 desde `sm` (hoy `px-3 sm:px-4`,
`App.tsx` l. 158); ancho máximo `max-w-6xl` (72 rem). Dos densidades: **cómoda** en el teléfono (fila
tocable de 44 px) y **compacta** en tablas de escritorio (32 px). Radios: 4 (chip), 8 (botón y campo), 12
(panel). Una sombra, `shadow-panel`: `0 1px 2px rgb(0 0 0 / 0.06)` más el borde `line`. **Iconos**: un
juego propio en SVG sobre rejilla de 24, trazo de 2 px, generado y revisado (principio 9), que sustituye a
los emoji (`✈`, `🚴`, `🏆`, `🏁`, `🏠`; mapa 01 §6), siempre con texto al lado o `aria-label`. **Banderas**:
las 133 del juego, 4:3, como ficheros en `public/flags/` pintados con `<img>`, fuera de la hoja que
bloquea la primera pintura: la CSS pasa de 94,29 KB con gzip a unos 8,5 (estimado con el mapa 01 §8).

## 4. Los componentes y sus estados

Catálogo cerrado en `apps/web/src/components/ui/`. Estados comunes: **encima** solo bajo
`@media (hover:hover)` (lo de v4); **foco** `focus-visible:` con anillo de 2 px `focus` y separación de
2 px, en todo lo pulsable (hoy hay cero, mapa 01 §7); **pulsado** un paso más oscuro; **deshabilitado**
`surface` con `ink-3` y borde `line`, y el porqué en una línea de 13 px debajo, nunca en un `title`.

| Componente                                                           | Sustituye                               | Anatomía y medidas                                                                                                                                                                             | Estados propios                                                | Texto de ejemplo (pantalla)                             | Accesibilidad                                                      |
| -------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| `Button` (`primary`, `secondary`, `ghost`, `danger`)                 | los 92 aspectos de botón (mapa 01 §3.3) | alto 44 (teléfono) o 36 (compacto), relleno 16, radio 8, 14/600; `primary` `navy` y blanco                                                                                                     | encima `#0e2e4a`; cargando, icono de 16 px y verbo en gerundio | `Save kit`, `Saving…`                                   | `aria-busy` al cargar; `disabled` con `aria-describedby` al porqué |
| `Link`                                                               | 4 aspectos de enlace                    | `link`, subrayado siempre visible a 3 px; el corredor conserva el punteado de `RiderName`                                                                                                      | visitado igual                                                 | `Race Sardegna`                                         | el enlace se ve sin ratón ([DUEÑO 6])                              |
| `Panel`                                                              | `Panel` cian y la tarjeta `rounded-2xl` | `surface`, radio 12, `shadow-panel`; cabecera 16/600 `ink`, relleno 16                                                                                                                         | vacío y error como cuerpo                                      | `The team`                                              | `h2`                                                               |
| `PageTitle`                                                          | `SectionBar` (2,06 a 2,57:1)            | barra `gold` alta 48, texto 22/600 de rótulo en `night` (7,29)                                                                                                                                 | ninguno                                                        | `Identity · Noord Cycling`                              | `h1` único                                                         |
| `Tabs`                                                               | las 3 copias a mano                     | `Tabs.tsx` de hoy (l. 153-222); pestaña alta 44, activa con raya de 3 px `navy`                                                                                                                | foco con flechas                                               | `Classifications`                                       | `tablist`, `tab`, `aria-selected`                                  |
| `Chip`                                                               | 15 formas en 23 `<span>`                | alto 24, relleno 8, radio 12, 12/600; tonos neutro, `success`, `warning`, `danger`, `gold`                                                                                                     | ninguno                                                        | `Leader`, `Niggle`                                      | texto, nunca solo color                                            |
| `Notice` (`info`, `warning`, `danger`, `veil`)                       | 8 avisos ámbar                          | borde izquierdo 4, fondo del tono, icono 16 y 14/20                                                                                                                                            | cerrable si es informativo                                     | `Results from 3 stages you haven't watched are hidden.` | `role="note"`; `danger`, `role="alert"`                            |
| `DataTable`                                                          | 15 tablas (mapa 01 §5)                  | puesto 28 a la derecha, identidad (el maillot que lleva a 16, de líder o de equipo; bandera 16×12; nombre y equipo debajo en `ink-3` 12/16), valor a la derecha `num`; top 20 y `Show all 140` | ancha: primera columna fija y sombra de desplazamiento         | `+0:01:08`                                              | `caption`, `scope` en cabecera                                     |
| `EmptyState`                                                         | 9 cajas discontinuas                    | borde 1 discontinuo `line-strong`, relleno 24, título 16/600, texto 14, una acción                                                                                                             | ninguno                                                        | `No races on your programme yet.` · `Find a race`       | región con título                                                  |
| `Loading`                                                            | 44 `Loading…`                           | esqueleto con la forma del contenido, `#e3e8ef`, pulso que respeta `prefers-reduced-motion`; a los 10 s, aviso                                                                                 | lento                                                          | `Still loading. Check your connection.`                 | `role="status"` con `Loading the race` oculto                      |
| `ErrorState`                                                         | 26 «Could not load…» sin reintento      | icono 20, frase, `Retry` (`secondary`), código pequeño                                                                                                                                         | reintentando                                                   | `Couldn't load the race.` · `Retry`                     | `role="alert"`                                                     |
| `Field` (`input`, `select`)                                          | 42 campos, 23 combinaciones             | alto 44, texto 16, borde `line-strong`, etiqueta 14/600 encima                                                                                                                                 | error: borde `danger` y frase 13 debajo                        | `The name must be 2 to 40 characters.`                  | `label`, `aria-invalid`, `aria-describedby`                        |
| `Scale5`                                                             | las 5 chapas de `ARRIVAL_LABEL`         | cinco tramos iguales de 28 de alto con su palabra a 12/16; el del corredor relleno con su color y un triángulo SVG encima; extremos `Too fresh` y `Too tired`                                  | sin dato: los cinco en contorno                                | `Race Sardegna · you'll start Loaded`                   | `role="img"` con la frase entera                                   |
| `LevelBar`                                                           | barras continuas                        | 4 pasos, nunca continua (`entrenamiento.md` l. 333-340), alto 8                                                                                                                                | ninguno                                                        | `Freshness: good`                                       | texto equivalente                                                  |
| `Toast`                                                              | nada                                    | abajo, 16 por encima de la barra inferior, 14/20                                                                                                                                               | se va a los 6 s salvo el de versión nueva                      | `A new version is ready.` · `Reload`                    | `role="status"`                                                    |
| `Kit`, `LeaderJersey`, `ChampionSash`, `WornJerseyIcon`, `KitPicker` | `Jersey`, `ChampionMark`                | §6                                                                                                                                                                                             | §6                                                             | §6                                                      | §6                                                                 |

## 5. El teléfono

**Las tablas anchas** (mapa 05 §5): el calendario del equipo, la única rota (460 px en 336, sin `Add` ni
`Drop` a la vista), pasa a una lista de tarjetas por carrera con `Add` y `Drop` de 44 px; el ranking de
nación y el salón de la fama conservan su desplazamiento, con primera columna fija y una sombra de 12 px
en el borde que dice que sigue; las clasificaciones se quedan en cuatro columnas, con el maillot del equipo
de 16 px delante del nombre (§6.4). **Navegación**: E6 decide los destinos; E3 pinta la barra inferior con
etiquetas de 12 px que no se cortan (hoy `Dashb…`, `My Ri…`, `BottomNav.tsx` l. 59), icono de 24 y alto
56 más `env(safe-area-inset-bottom)`, y reserva `--nav-h` para que nada quede debajo (hoy tapa el
comentario de `Watch`, mapa 05 §6). **Objetivos**: 44 × 44 en toda acción principal, y 24 × 24 como
mínimo absoluto (WCAG 2.5.8) en los secundarios en línea. **Letra**: 12 px o más en `main`.

**El criterio de aceptación**, un test de Playwright (`apps/web/e2e/telefono.spec.ts`) sobre el banco de
capturas del mapa 05, las 45 pantallas a 360 × 800 con densidad 2, en el CI con la etiqueta `visual` y
cada noche (unos 6 min, estimado): ningún documento más ancho que la ventana; ninguna tabla más ancha que
su caja sin desplazamiento propio; 0 nodos de contraste de axe-core; ningún carácter de `main` por debajo
de 12 px; el 95 % de los objetivos de `main` con 44 px en su lado menor y el 100 % con 24 × 24; ninguna
acción principal tapada por la barra inferior; y «lista» (el `main` sin carga) en 2,5 s con `Fast 4G` y CPU
× 4 en la portada, el plan y `Watch` (hoy, de 1,64 a 2,10 s, mapa 05 §12). Una pantalla que falla cualquiera
no está terminada.

## 6. Los maillots

### 6.1 El vocabulario del maillot de equipo

Todo en el `viewBox` de 48 de `TORSO` (`Jersey.tsx` l. 10-11), con cada región recortada por el propio
torso (`clipPath`, id de `useId` sin los dos puntos). **Seis figuras**, rasgo mínimo 8 u:

| Figura    | Región en el secundario                                                    | A 13 px                   |
| --------- | -------------------------------------------------------------------------- | ------------------------- |
| `plain`   | ninguna (el cuello va en el secundario)                                    | un color                  |
| `band`    | `<rect x="0" y="24" width="48" height="8"/>`                               | banda de 2,2 px           |
| `yoke`    | `<rect x="0" y="0" width="48" height="25"/>`: hombros, mangas y pecho alto | dos pisos                 |
| `sleeves` | `M16 8 L10 12 L7 20 L12 23 L14 18 Z` y su espejo                           | hombros de otro color     |
| `stripe`  | `<rect x="20" y="0" width="8" height="48"/>`                               | franja vertical de 2,2 px |
| `halves`  | `<rect x="24" y="0" width="24" height="48"/>`                              | mitad izquierda y derecha |

Cuello (`M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z`) en el secundario y opaco; filete del torso
`rgba(0,0,0,0.3)` de `clamp(1, 26 / tamaño, 2)` u (unos 0,5 px a cualquier tamaño) y, sobre superficie
oscura, `rgba(255,255,255,0.6)` (6,55:1 sobre `night`; sin él, un maillot negro queda a 0,1 de
`#0f172b` en grises, `exp10_alternativas.py`). `halves(A, B)` y `halves(B, A)` son espejo: cuentan como
el mismo y la distancia toma el mínimo con el espejo. **Fuera del vocabulario, a propósito**: diagonales,
lunares, emblemas y rayas de menos de 8 u (las `stripes` de 3 u de hoy).

**Los 14 colores, por nombre**: `white` `#ffffff`, `black` `#16181d`, `yellow` `#ffd60a`, `sky`
`#8fd0f5`, `silver` `#c8ced7`, `red` `#d7261e`, `royal` `#2a5bd7`, `green` `#2f9e44`, `orange`
`#f26b0f`, `violet` `#7e44d0`, `navy` `#1f3a93`, `maroon` `#7a1426`, `forest` `#1d6b35`, `teal`
`#00897b`. Curados por tramos de claridad: el punto más lejano en las cuatro visiones de color expulsa el
rojo (`exp2_paleta.py`), y un juego de ciclismo sin rojo no sirve; la separación se busca en el maillot
entero, no color a color. Hoy, 45 de los 91 pares de `JERSEY_COLORS` bajan de 10 en grises (mapa 03 §3.1).

**Regla de contraste**: base y secundario a ΔE00 de 20 o más en las cinco vistas, para que la figura se
vea también en grises. **Cuántos dan**: 6 figuras con 14 colores son 1.092; pasan el contraste **614**; y
quedan a 10 o más de lo reservado (los tres líderes, la banda del mundo y las 133 nacionales) en las cinco
vistas, a 13 px con densidad 1 y 2, **443** (`exp6_final.py`: 104 `plain`, 62 `band`, 86 `yoke`, 61
`sleeves`, 83 `stripe`, 47 `halves`). Caben juntos, todos con todos a 10 o más, 78 en las cuatro visiones
de color y 29 contando grises: no alcanza para 219 equipos todos con todos, y no hace falta, porque basta
con separar a cada equipo de los que corren con él.

**El reparto** (`assignKit` en `packages/db`): cada equipo, en orden estable (división, semilla), recorre
una lista sorteada con su semilla y estratificada por color base (un maillot de cada base por ronda), y
toma el primero que queda a 10 o más de todo equipo con el que comparte alguna carrera de la temporada
(los pelotones de `predictStartlist`; un PRS coincide con hasta 201 equipos) en las cuatro visiones de
color y a los tres pintados; prefiere además el que pasa en grises y el que no lleva nadie más. Medido en
las 310 carreras (`exp6_final.py`):

| Tamaño    | Carreras con algún par por debajo de 10, hoy (normal, prot., deut., trit., grises) | Con la propuesta | Pares por carrera en grises, hoy y propuesta |
| --------- | ---------------------------------------------------------------------------------- | ---------------- | -------------------------------------------- |
| 13 px, ×1 | 303, 310, 310, 310, 310                                                            | 0, 0, 0, 0, 296  | 103,68 y 3,86                                |
| 13 px, ×2 | 303, 310, 310, 310, 310                                                            | 0, 0, 0, 0, 243  | 99,29 y 2,74                                 |
| 16 px, ×1 | 303, 310, 310, 310, 310                                                            | 0, 0, 0, 0, 276  | 103,33 y 3,14                                |
| 28 px, ×1 | 303, 310, 310, 310, 310                                                            | 0, 0, 0, 0, 271  | 97,68 y 2,70                                 |

En Race France, 210 pares: hoy 6, 16, 30, 12 y 102 por debajo de 10; con la propuesta 0, 0, 0, 0 y 3.
Mirado en píxeles (`hojas/peloton-rf.png`), cada equipo conserva su figura en deuteranopía y en grises.

**La migración, con continuidad**: el mundo de hoy no se sortea de nuevo, se traduce. Cada equipo prueba
los 443 en orden de parecido con su equipación de hoy (dibujada a 28 px) y toma el primero que pasa
(`exp8_continuidad.py`): 63 equipos conservan su color base (ΔE00 menor de 15) y 105 lo conservan en algún
sitio del maillot, frente a 15 y 40 con el sorteo; sigue sin un solo par por debajo de 10 en color a 13 y 28
px, en grises sube a 5,27 pares por carrera a 13 px, y dos equipos que nunca coinciden comparten maillot.
Los equipos nuevos (génesis y `seedWorld`, `world.ts` l. 459) toman la lista sorteada.

### 6.2 La función, el dato y el contrato

`packages/shared/src/kit.ts` (puro, en el barril): `KIT_FIGURES`, `KIT_COLORS` (nombre a hexadecimal),
`interface Kit { figure; base; secondary; chest?: SponsorMark }`, su esquema Zod `.strict()`, y el código
compacto `band.white.red` (`kitCode`, `parseKit`). `packages/db/src/kitDistance.ts` (solo servidor, para
no cargar la web): la distancia de cada figura se calcula con **tablas de cobertura** por píxel
(fracción de fondo, base, secundario y filete) a 13 px con densidad 1 (89 píxeles útiles), 13 con
densidad 2 (290) y 28 (334), medidos con `exp12_pix28.py`, generadas por `scripts/kit-coverage.mjs` con
Chromium en `kitCoverage.generated.ts`, que guarda además la huella de la geometría de `kit.ts`; la mezcla
es en sRGB codificado, como compone el navegador, y después Machado 2009 y ΔE00, el mínimo de las cinco
vistas y de los tres pintados. Son 3.565 ΔE00 por par, unos 0,2 ms en Node (estimado).

**El dato**: migración de drizzle-kit `team_kits (team_id, valid_from_day, kit text, set_by enum
('system','manager','sponsor','moderator'), sponsor_deal_id null, created_at)`, clave `(team_id,
valid_from_day)`; `kitOn(teamId, day)` devuelve el vigente. El tick llama a `ensureKits` (idempotente,
como `seedWorld`): el primer tick tras el despliegue traduce el mundo y luego solo actúa con equipos
nuevos. `PUT /api/teams/me` deja de aceptar `jerseySeed` (`routes/teams.ts` l. 23); `updateOwnedTeam`
pierde esa rama (`teamControl.ts` l. 182-186), y el clon del mapa 03 §2.2 deja de ser posible. **El
contrato**: `kit` (el código) se suma a `startlistTeamSchema`, `teamListItemSchema` y `teamDetailSchema`
(`contracts.ts` l. 665, 692 y 718), a la fila de la clasificación por equipos y a `RiderCard.team`
(`broadcast/wire.ts` l. 354); `serveCast` (`broadcastSource.ts` l. 1370) lo resuelve con
`kitOn(teamId, díaDeLaEtapa)`, así que una
etapa vieja enseña el maillot de aquel día (O-07 de E2) y la semilla grabada en `CastTeam` (`cast.ts`
l. 146-154) sigue valiendo para lo grabado antes.

### 6.3 El editor

En `/team/identity`, `KitPicker` sustituye a las doce semillas (`TeamManager.tsx` l. 23-26). A 360 px, de
arriba abajo: la vista previa a 96 px y, a su lado, el mismo maillot a 13, 16 y 28 px sobre blanco y sobre
`night` (`How it looks in a race` (pantalla)); **figura**, seis botones de 48 × 48 con la figura dibujada y
su nombre (`Plain`, `Band`, `Yoke`, `Sleeves`, `Stripe`, `Halves`); **color base**, 14 muestras de 44 × 44
con su nombre debajo (`Maroon`…); **segundo color**, las mismas con las que no pasan el contraste
deshabilitadas y su porqué; el veredicto; y `Save kit` (`primary`). El veredicto lo da el servidor
(`POST /api/teams/me/kit/check`, con 300 ms de espera tras el último toque): la web no carga las tablas.

| Estado o código | Aspecto                                      | Texto (pantalla)                                                                                     |
| --------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| pasa            | `Notice` `info` con marca                    | `Distinct from every team in your races.`                                                            |
| `kit_parecido`  | `Notice` `warning`, `Save kit` deshabilitado | `Too close to Mistral Racing for colour-blind viewers (deuteranopia). Try another colour or figure.` |
| `kit_reservado` | ídem                                         | `Too close to the Mountains leader jersey. Leader and champion designs are reserved.`                |
| `kit_contraste` | la muestra deshabilitada                     | `Too alike: the pattern would disappear in greyscale.`                                               |
| `kit_espera`    | `Save kit` deshabilitado                     | `You changed your kit on day 50. Next change from day 78.`                                           |
| guardado        | `Toast`                                      | `New kit from tomorrow (day 51).`                                                                    |
| sin red, error  | `ErrorState`                                 | `Couldn't check this kit.` · `Retry`                                                                 |

**La validación en el servidor** (`PUT /api/teams/me/kit`, cuerpo `{ kit }` estricto): el esquema; la
regla de contraste; la distancia a lo reservado; la distancia a los equipos con los que corre en la
temporada, en las cuatro visiones de color; y la espera de `KIT_CHANGE_COOLDOWN_DAYS` (28) salvo el primer
cambio tras tomar el equipo. Vale desde el día siguiente, para que una etapa en curso no cambie de maillot.
**Si choca con un NPC, el NPC cede** (§15): se le traduce de nuevo esa noche y su ficha dice `New kit for
Mistral Racing` (pantalla). Sin esa regla un equipo PRS elegiría entre 31 maillots (mediana; 13 el
peor), un WT entre 137 y un CON entre 208 (`exp9_editor.py`); con ella, entre los 443 menos lo que lleven
los equipos humanos. **Para E9**: el vocabulario es cerrado (sin texto libre ni imagen), así que la
superficie de moderación es pequeña; E3 le deja la historia de `team_kits`, `revertKit(teamId, motivo)`
con `set_by: 'moderator'`, y el sitio de una denuncia; la política es suya.

### 6.4 Los maillots de líder y el dorsal

**Los tres de líder se quedan como los pidió el dueño** ([DUEÑO 1]): amarillo liso `#facc15`, verde
`#16a34a` con banda `#bbf7d0` de 7 u, azul `#2563eb` con cinco lunares blancos de 3,4 u
(`Jersey.tsx` l. 73-86), con su `aria-label` y `<title>` de `JERSEY_LABEL` (`jerseys.ts` l. 145-149). Lo
que cambia es lo de alrededor: ningún maillot de equipo puede quedar a menos de 10 de ellos en ninguna
vista (es parte de los 443); medido contra el mundo repartido, el más cercano queda a 10,2 en grises y
13,5 en visión normal a 13 px (hoy, 6,2 del verde en normal y 88 equipaciones por debajo de 10 en grises,
mapa 03 §4.1). El filete pasa a la regla de grosor de §6.1 y a la clara sobre `night`. **En las tablas**,
el hueco del maillot (hoy `RiderJersey`, solo líderes, `Jersey.tsx` l. 175-186) lleva el que el corredor
lleva según la regla de cada tabla (`docs/navegacion.md` §7.4): el de líder si lo tiene, y si no la
equipación de su equipo. Así se cumple lo que promete `/team/identity` y el equipo se reconoce sin leer su
nombre en `ink-3`.

**El dorsal del equipo líder no vuelve como dibujo.** El dueño lo mandó quitar porque a 15 px se leía
«Ill» ([DUEÑO 5]) y el test sella su ausencia (`leaderJerseys.test.tsx` l. 81-88). En su lugar: la tabla
por equipos pinta el maillot de cada equipo a 16 px delante del nombre (hoy solo la bandera,
`TeamClassTable.tsx` l. 35), y en la tabla de una etapa, donde la fila 1 no es quien lleva los dorsales,
el equipo de `leaders.team` (`jerseys.ts` l. 128-130) lleva el `Chip` `Leader` (pantalla). En `Watch`,
nada. E3 corrige la contradicción en los documentos: `docs/navegacion.md` l. 462-466, 492-495 y 501-504 y las
cinco líneas de `docs/retransmision.md` que lo dan por pintado (mapa 04, contradicción 1).

### 6.5 La señal de campeón

Las variantes del dueño (`00-encargo.md` §7.1), las ideas del orquestador y las mías, con los cuatro
criterios. «A V0»: distancia a la marca de la UCI dibujada a 13 px (`exp1_senal.py`); «Vocabulario»: el
maillot más cercano de los 614 a 13 px en normal, la peor dicromacia y grises, y cuántos bajan de 10 en
grises (`exp11_candidatas.py`); «Reservada»: si ningún equipo ni líder comparte la figura.

| Candidata                                             | Distancia a la marca (hechos de §7.1 y mapa 03 §7)                                        | A V0 (normal; grises)   | Vocabulario                                | Reservada                      | Veredicto                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------ | ------------------------------ | --------------------------------------------- |
| V1 otro orden                                         | las cinco bandas y sus colores; la guía fija el orden (`No other order will be approved`) | 14,9; 5,3               | 10,4; 6,4; 2,3 (49)                        | no, banda                      | fuera: es la marca, y el orden no se ve       |
| V2 y V3 verticales                                    | la guía regula la vertical; en vertical, invertir es un espejo                            | 14,4; 8,4               | 11,3; 8,2; 4,9 (33)                        | no, franja                     | fuera                                         |
| V4 otros colores (los cinco de `index.css` l. 6-11)   | cinco bandas iguales sobre blanco: la estructura de la marca                              | 8,7; 1,5                | 9,3; 7,8; 5,0 (38)                         | no                             | fuera: más cerca de V0 que el orden invertido |
| V5 y V6 otro fondo (`#1e293b`, `#d99400`)             | la marca entera en otra tela                                                              | 50,0; 49,6 y 26,4; 16,0 | 14,7; 10,6; 6,1 (47) y 20,1; 6,6; 4,9 (54) | no                             | fuera                                         |
| V7 espectro continuo en banda horizontal, sobre noche | ni cinco bandas ni sus colores ni blanco, pero «el arcoíris en el pecho»                  | 58,9; 51,3              | 16,8; 15,1; 6,8 (12)                       | no, banda                      | fuera; su versión diagonal es la C            |
| CM, la estrella de hoy                                | lejos                                                                                     | 12,5; 8,2               | 10,1; 8,1; 7,2 (35)                        | sí                             | sustituida                                    |
| **A banda de honor**                                  | ningún elemento de la marca                                                               | 44,3; 35,5              | 24,5; 22,5; 15,8 (0)                       | sí, diagonal                   | **por defecto**                               |
| B galón en V                                          | ninguno                                                                                   | 47,6; 39,7              | 18,4; 16,8; 10,7 (0)                       | sí, diagonal                   | alternativa                                   |
| C espectro en la banda diagonal                       | no es la marca, pero evoca el arcoíris del campeón, que SPEC §8 (l. 874) prohíbe imitar   | 48,7; 38,2              | 24,9; 20,8; 14,1 (0)                       | sí, diagonal                   | alternativa, la del dueño                     |
| D corona de cumbres (perfil de tres puertos)          | ninguno; pero corona de puertos se lee `King of the Mountains`, la montaña                | 51,0; 45,0              | 12,5; 11,1; 6,8 (19)                       | a medias: banda con picos      | fuera                                         |
| E meridianos                                          | ninguno                                                                                   | 48,0; 43,4              | 16,2; 12,4; 7,1 (52)                       | sí, pero a 13 px es una mancha | fuera                                         |
| F estrella grande (la del logotipo)                   | ninguno                                                                                   | 49,0; 41,7              | 15,8; 14,4; 9,7 (5)                        | sí                             | fuera: a 13 px, mancha                        |

Las cifras confirman al mapa 03 §7.3 por otro camino: el orden y la disposición de cinco bandas no dan
distancia ni a los ojos (V1 a 5,3 de V0 en grises) ni a la marca; lo que da distancia es **otra forma**. Y
de las formas, solo la diagonal sobrevive a 13 px y densidad 1 (miradas en píxeles, `hojas/pix-13-1.png`):
la banda se lee como una raya cruzada, el galón como una V, la corona y la estrella ya son bultos. La
nacional confirma la elección: con la banda, Italia queda a 19,4, 16,1 y 13,5 del vocabulario y ninguno
baja de 10 en grises; con el galón, a 16,9, 12,3 y 9,1, y 47 bajan.

**El dibujo** (todo recortado por `TORSO`, filete `rgba(0,0,0,0.35)` de 1,5 u como los de líder):

- `SASH`, la banda: línea central de (10, 10) a (38, 42), 10 u de ancho:
  `M13.76 6.71 L41.76 38.71 L34.24 45.29 L6.24 13.29 Z`.
- **Del mundo**: campo `night` `#14213d`, banda `gold` `#e0a526`, cuello `gold`. `aria-label` y
  `<title>`: `World champion` o `World time trial champion` (`championTitleText`,
  `broadcast/names.ts` l. 153).
- **Nacional**: campo `paper` `#f6f3ea`; la banda partida en tres franjas paralelas de 10/3 u
  (`M13.76 6.71 L41.76 38.71 L39.25 40.90 L11.25 8.90 Z`, `M11.25 8.90 L39.25 40.90 L36.75 43.10 L8.75 11.10 Z`,
  `M8.75 11.10 L36.75 43.10 L34.24 45.29 L6.24 13.29 Z`) con los colores de la bandera; filo `night` de
  2,4 u en el contorno de la banda; cuello del color de la primera franja; y la bandera a su lado, como
  hace hoy `ChampionMark` (`Jersey.tsx` l. 165), porque 26 países salen con banda de un color con blanco
  en medio (Dinamarca, Suiza, Polonia, Austria, Canadá, Japón…). El filo de 2,4 u se eligió midiendo
  (`exp5b_nacional.py`): con el de 1,2 u, 720 pares banda y maillot bajaban de 10 en grises a 13 px; con
  2,4, 42 a densidad 1 y **ninguno a densidad 2**, donde las 133 quedan a 14,0 o más de todo maillot y a
  14,2 de los líderes en las cinco vistas; con campo noche chocaba con la del mundo (6,2 en grises).
- **Los colores nacionales** son material generado (`exp4_banderas.py` y `banda_nacional.py`): cada SVG
  de `flag-icons` pintado a 160 px, sus colores agrupados en CIELAB, los de más del 10 % del área (y el
  emblema si solo queda uno), los tres mayores en orden de lectura, y el claro en medio si alguno de fuera
  se confunde con el papel. De las 133: 30 banderas de dos colores, 55 de tres y 48 de cuatro o más. Sale
  bien Italia `#009246`, `#fdfdfd`, `#ce2b37`; España `#aa161b`, `#f1bf00`, `#aa161b`. Sale mal Corea
  (negro y blanco: pesan más los trigramas). Por eso la tabla `NATIONAL_SASH` se revisa en la página de
  opciones antes de entrar y no se edita a mano.
- **Disciplina y categoría**: el mismo dibujo; cambia el texto. `wearableTitles` solo deja llevar los
  títulos de la disciplina y la categoría del día (`jerseys.ts` l. 271-275), así que en una etapa nunca
  coinciden un campeón de crono y uno de línea, ni uno sub-23 en una élite. **Continental** (E12): banda
  plata `#c0c7d2` sobre noche, como valor provisional. **Excampeón del mundo** (cuando E12 dé el dato):
  cuello oro y un trazo oro de 1,5 u en el borde de cada manga (`M7 20 L12 23` y su espejo) sobre el
  maillot de su equipo, y solo a 28 px o más.

**Cómo se ve**: a 13 px es una raya dorada en diagonal de 2,7 px sobre un maillot oscuro, o una raya de
color con filo oscuro sobre uno claro; a 16 px, 3,3 px; a 28 px, la banda de 5,8 px deja ver las tres
franjas de 1,9 px; a 72 px, 15 px de banda, franjas de 5 px y el filo de 3,6. Medido contra el mundo
repartido, la del mundo queda a 24,5 de normal y 15,8 de grises a 13 px; las nacionales, a 10,9 o más en
grises con densidad 1 y 16,4 con densidad 2.

**Por qué no es el arcoíris ni se le parece**: la marca es `five horizontal stripes composed of colours
blue, red, black, yellow and green (in this order)` sobre blanco (guía 5.3; `00-encargo.md` §7.1), y el
registro encontrado es el del logotipo (IR 1276964, clases 12, 25 y 41; mapa 03 §7.1). La banda no tiene
ninguno de esos elementos: una sola franja, diagonal, sin sus cinco colores, y el campeón del mundo es el
único que no viste blanco. No he comprobado el registro de las bandas solas ni las bases de la EUIPO y la
USPTO; SPEC §8 ya pide verificarlo antes del lanzamiento. No es asesoramiento jurídico.

### 6.6 Lo que compra el patrocinador (para E8)

Cuatro zonas del mismo vocabulario: **`base`** (impone el color de fondo), **`secondary`** (impone el
color de la figura), **`figure`** (impone la figura) y **`chest`** (su nombre en el pecho, en la letra de
rótulo a 600, mayúsculas, 10 caracteres como mucho, alto 4,2 u, centrado entre y 24 y 32, en blanco o
`night` según el contraste mayor con lo que tenga debajo, y solo a 64 px o más). Reglas: el color sale de
los 14; el maillot resultante pasa `kitDistance` contra sus vecinos y lo reservado, y si no pasa el
contrato no se puede firmar con ese color (la pantalla de E8 ofrece el más cercano que pasa); nadie compra
una forma ni un color reservado; una marca por zona; el nombre sale de la lista cerrada de patrocinadores
generados, nunca texto libre; y `team_kits` guarda la fila con `set_by: 'sponsor'`, que vuelve a la
anterior al acabar el contrato. E3 da `type KitZone`, `applySponsor(kit, oferta): Kit` en `shared` y la
validación en `db`; E8 decide el precio, la exclusividad por categoría (G2.8) y lo que pierde el equipo.

### 6.7 El contrato `WornJerseyIcon` y el material generable

`WornJerseyIcon({ card, size, surface = 'light' })`: la firma del código (`WornJerseyIcon.tsx` l. 12-31) más
`surface`; `docs/retransmision.md` l. 5210 escribe `{ worn, team }` y se corrige (mapa 03 §1.1). Sigue
siendo el único sitio que elige dibujo por `WornJersey` (`jerseys.ts` l. 183-194): `leader`,
`LeaderJersey`; `champion`, `ChampionSash` con `championTitleText`; `team`, `Kit` con `card.team.kit` y
`aria-label` `Mistral Racing kit` (hoy `Team jersey` para todos); sin equipo, el hueco (l. 28-29).
`CueCard` (fondo oscuro) le pasa `surface="dark"`. **Generado y revisado**: las tablas de cobertura, la
tabla nacional, el juego de iconos, los iconos de la web instalable y la imagen de compartir (§8, §10); los
scripts viven en `scripts/` con su test de huella. El presupuesto de dibujo a mano es cero.

## 7. El examen práctico

Con los componentes de §4 y nada más. **Defecto 1, la lista de llegadas**: una fila por **carrera**,
con su nombre, y la llegada de su primera etapa, la única de fiar (mapa 02 §3):

```text
Race Var · day 52 · one day               [ Rusty | Spot on | Fine | Loaded▲ | Cooked ]
Race Sardegna · days 56 to 60 · 5 stages  [ Rusty | Spot on | Fine | Loaded▲ | Cooked ]
Arrival at the start. Later stages depend on how you race.
```

(pantalla). **Defecto 2**: `Scale5` con los extremos `Too fresh` y `Too tired`; el triángulo marca el
tramo, no una posición dentro, porque una posición exige el TSB y el TSB no cruza (§9; mapa 04, tensión
23). **Defecto 3**: arriba, bajo los modos, `Who decides each day: race, travel, your day edit, your
block, team plan, coach.` (`mixto`), `Your coach decides every day. Blocks and edits are kept but not
used.` (`entrenador`) o `Only your blocks and edits. Empty days are active recovery.` (`manual`), con la
misma línea repetida en la cabecera de `Edit day by day`, para que quien baja la vea. Cada día lleva un
`Chip` con su origen: `Race · Race Sardegna, stage 2 of 5`, `Travel · to Race Var (FR)`, `Your edit`,
`Block · Build`, `Team plan`, `Coach`, `Rest`; en modo `entrenador` el editor queda de solo lectura (hoy se
guarda para nada, `Training.tsx` l. 317-325). **El viaje**: la ida, la carrera y la vuelta van unidas por un
carril de 3 px `link` a la izquierda con la cabecera `Trip to Race Sardegna (IT) · days 55 to 61`; `On your
programme` gana la columna `Travel` con `travelDaysLabel` (`labels.ts` l. 157-161); `GD 52`
(`MyRaces.tsx` l. 205 y 230) pasa a `Day 52`, la numeración de todo el juego.

**Lo que cambia en la API y en `packages/db`, no en el motor**: `arrivals` por carrera,
`{ raceId, raceName, firstDay, lastDay, stageCount, label }`, sin `tsb` (`riders.ts` l. 470-478;
`contracts.ts` l. 223-235); la vista previa carga cada día de carrera con la media de TSS de las etapas del
propio corredor en su diario, o 150 si no tiene (estimado; hoy 25 de descanso, l. 449-451); `GET /orders`
devuelve por día `{ session, intensity, source, race?, travel? }` desde una función pura con la cadena de
`train.ts` (l. 195-272) que usen el tick y la pantalla, y `defaultCoachPlan` sale de la web
(`trainingPlan.ts` l. 28-45; `entrenamiento.md` l. 1287-1291); `raceDays` pasan a objetos como
`travelDays` (`contracts.ts` l. 380-401); y `PUT /plan` sustituye todo plan que se solape (mapa 02 §2). Ninguno
sube `ENGINE_VERSION`. Lo que queda para otra línea: que el entrenador lea el calendario (mapa 02 §2,
escalón 6), que es del motor.

## 8. La web instalable

**El manifiesto** `apps/web/public/manifest.webmanifest`: `"id": "/"`, `"name": "Cycling Star"`,
`"short_name": "Cycling Star"`, `"description": "Race one rider through a living cycling season."`,
`"start_url": "/?source=pwa"`, `"scope": "/"`, `"display": "standalone"`, `"background_color":
"#14213d"`, `"theme_color": "#14213d"`, `"lang": "en"`, `"categories": ["games", "sports"]`, e
`"icons"`: 192 y 512 `any` y 512 `maskable`. En `index.html`: `<link rel="manifest">`, `<meta
name="theme-color" content="#14213d">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">`
y `<meta name="apple-mobile-web-app-title" content="Cycling Star">`. **Los iconos**: la bicicleta y la
estrella del logotipo (`Logo.tsx`, hoy índigo y ámbar de v3) en `gold` y blanco sobre `night`, generados
con Chromium a 192, 512 y 180; la versión `maskable` con el dibujo dentro del 80 % central. `favicon.svg`
pasa a los mismos colores.

**El service worker** `public/sw.js`, escrito a mano (unas 80 líneas, sin Workbox): al instalar guarda el
`index.html` y los ficheros de arranque que lista un `sw-assets.json` que escribe el build; `/assets/*`,
primero la caché (llevan huella y la API ya los sirve un año como inmutables, `app.ts` l. 135-144);
`/fonts`, `/flags` e `/icons`, caché y revalidación; las navegaciones, primero la red con 3 s de espera y,
sin red, el `index.html` guardado. **`/api/*` nunca se guarda**: E2 sirve según lo que ha visto cada
jugador (`spoiler.ts` l. 63-88), y una respuesta guardada podría destripar a otro jugador del mismo
aparato o enseñar un estado viejo como actual. **Sin red**: `Notice` fijo arriba, `You're offline. You can
browse what's already loaded.` (pantalla); las acciones, deshabilitadas con `Needs a connection`; el
`Loading…` sin fin del mapa 05 §13 se cambia por ese aviso (con `onlineManager` de React Query); y el trozo
de una página no visitada deja de tumbar la web entera (`main.tsx` l. 22-30): `This page isn't available
offline yet.` · `Retry`. **Versión nueva**: el SW nuevo espera; `Toast` `A new version is ready.` ·
`Reload`, que manda `SKIP_WAITING` y recarga; nunca a mitad de `Watch`. **iPhone**: desde iOS 26 se abre
como app sin manifiesto (mapa 05 §14); con él y el `apple-touch-icon` tiene su icono; el aviso de E4 exige
estar en la pantalla de inicio. **La medida que revisa la app nativa**: la analítica (`docs/encargos.md`
l. 741-742) cuenta sesiones por `display-mode` y por ancho; si a los 90 días con 50 jugadores activos por
semana el teléfono es la mitad de las sesiones o más y las instaladas no llegan al 20 % de ellas, o si el
criterio de §5 falla en dos versiones seguidas, se reabre la decisión.

## 9. La regla de la frontera

**La regla**: ninguna respuesta de la API lleva un campo que la web no pinte o que no esté en
`FRONTIER_EXCEPTIONS` con su motivo, y ningún valor interno de SPEC §3.2 a §3.4 sale de la API, ni
redondeado. **El mecanismo**, cuatro piezas: (1) cada ruta declara `data: 'public' | 'owner' |
'derived'` junto a `spoiler`, y el servidor no arranca sin ella (el modelo de `spoiler.ts` l. 155-183); (2)
en los tests de la API, cada respuesta se valida con la versión `.strict()` de su esquema (hoy _strip_,
`contracts.ts` l. 9-11), lo que caza las seis claves de más de `teams/:id/news`; (3) un test estático en
`apps/web` (como `columnasVivas.test.ts` l. 6-24): todo campo de un esquema de respuesta se lee en
`apps/web/src` o está en la lista; (4) el canario de B1a (`spoilerCanary.test.ts` l. 20-51) planta testigos
también en `rider_attrs` y en el diario y barre además los POST de vista previa (hoy solo las GET,
`spoilerWorld.ts` l. 334). **Lo que se arregla del inventario** (mapa 02 §8): `attributes` de `/api/riders/:id`
y `/me` pasan a `{ stars, mark? }` calculados en el servidor con `attrStars` (`rider.ts` l. 218-240), y
los cerillos de la ficha también (`RiderProfile.tsx` l. 213-225); la vista previa pierde `arrivals[].tsb`
y `ctl`, `atl` y `tsb` de `days[]`; `/me/form` pierde `log[].atl` y manda las barras ya en sus cuatro
pasos; `delta28`, el nivel de la flecha; `raceId` se llena. Encaja con E2: el mismo registro y el mismo
barrido que ya cortan el destripe.

## 10. Lo que E2 dejó a E3

Cambia el aspecto, no los datos ni el orden (que son de E2, `docs/retransmision.md` §6 y §7.1). **Capa
fija**: `night`, 40 px de alto, km a meta en la letra de rótulo a 22 px `num`. **Perfil**: los puertos en
oro claro `#f3dfa6` y las cotas en un círculo de 16 px con 12 px de letra (hoy 8 px). **Barra de grupos**:
filas de 32, la palabra del grupo en versales por CSS como fija su test, y los maillots de 13 px del
vocabulario nuevo: en el teléfono, donde la línea de un grupo de 4 a 12 no lleva nombres
(`GroupBar.tsx` l. 243), el maillot es lo único que identifica, y por eso la medida de §6.1 es a 13 px.
**Rótulo** (`CueCard.tsx` l. 36-43): clase 3 en `danger`, clase 2 en `night`, el resto en `night-2`, con
`surface="dark"`; dos renglones a 360 px. **Previa, cierre, `Highlights` y el `digest`**: los componentes de
§4. **`Report`**: `DataTable`. **La imagen de compartir** (`spaShell.ts`, `og:` en l. 130; E2 dejó «imagen
genérica hasta que E3 decida otra»): `og-default.png` de 1.200 × 630, noche con la banda de oro, el
logotipo y `Cycling Star`, generada con Chromium. La barra inferior que tapa el comentario la esconde E6
(`useHideBottomNav`); E3 le da `--nav-h`.

## 11. Constantes y tokens

| Nombre                                                                 | Valor                                                  | Intención                                                                 | Dónde                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------- |
| `KIT_MIN_DISTANCE`                                                     | 10                                                     | distancia dibujada mínima entre maillots que coinciden y con lo reservado | `packages/shared/src/kit.ts`                    |
| `KIT_CONTRAST_MIN`                                                     | 20                                                     | ΔE00 base y secundario en las cinco vistas: la figura se ve en grises     | ídem                                            |
| `KIT_CHECK_RENDERS`                                                    | 13 px ×1, 13 px ×2, 28 px                              | tamaños de la distancia: escritorio (×1), teléfono (×2) y ficha (28)      | `packages/db/src/kitDistance.ts`                |
| `KIT_MIN_FEATURE_U`                                                    | 8                                                      | rasgo mínimo de una figura (2,2 px a 13 px)                               | `kit.ts`, con test                              |
| `KIT_FIGURES`                                                          | `plain`, `band`, `yoke`, `sleeves`, `stripe`, `halves` | el vocabulario, sin diagonales ni lunares                                 | `kit.ts`                                        |
| `KIT_COLORS`                                                           | los 14 de §6.1, por nombre                             | la paleta, sin depender del orden                                         | `kit.ts`                                        |
| `KIT_CHANGE_COOLDOWN_DAYS`                                             | 28                                                     | días de juego entre dos cambios: identidad estable                        | `kit.ts`                                        |
| `KIT_TEXT_MIN_PX`                                                      | 64                                                     | por debajo, ningún texto en un maillot                                    | `kit.ts`                                        |
| `CHAMPION_NIGHT`, `CHAMPION_GOLD`, `CHAMPION_PAPER`, `CHAMPION_SILVER` | `#14213d`, `#e0a526`, `#f6f3ea`, `#c0c7d2`             | la señal                                                                  | `kit.ts`                                        |
| `SASH_PATH` y `SASH_STRIPES`                                           | los de §6.5                                            | la banda y sus franjas                                                    | `kit.ts`                                        |
| `NATIONAL_SASH_EDGE_U`                                                 | 2,4                                                    | filo de la banda nacional                                                 | `kit.ts`                                        |
| `NATIONAL_SASH`                                                        | 133 entradas generadas                                 | colores de cada banda nacional                                            | `packages/shared/src/nationalSash.generated.ts` |
| `--color-*`                                                            | los de §3.1                                            | la paleta de la interfaz                                                  | `@theme` de `index.css`                         |
| `--font-display`, `--text-*`                                           | §3.2                                                   | letra de rótulo y escala                                                  | `@theme`                                        |
| `--radius-chip` / `-control` / `-panel`                                | 4 / 8 / 12 px                                          | radios                                                                    | `@theme`                                        |
| `--nav-h`, `--tap-min`                                                 | 56 px, 44 px                                           | hueco de la barra inferior, objetivo mínimo                               | `@theme`                                        |
| `ARRIVAL_SCALE`                                                        | los cinco de §3.1                                      | colores de `Scale5`                                                       | `apps/web/src/components/ui/Scale5.tsx`         |

## 12. Tests y bancos

**Antes que su código**: (1) `kit.test.ts`: ninguna figura tiene un rasgo de menos de 8 u; ninguna es
diagonal ni de lunares; añadir un color a `KIT_COLORS` no cambia ningún `kitCode` guardado; el esquema
rechaza nombres de color inventados. (2) `kitDistance.test.ts`: 50 pares fijos dan la cifra del script
de Python a 0,5 o menos (el fichero de referencia lo genera `exp6_final.py`); la huella de la geometría
coincide con la de las tablas de cobertura. (3) `kitWorld.bench.ts` (cada noche, unos 5 min estimado): génesis,
`ensureKits`, `predictStartlist` de la temporada, y 0 pares por debajo de 10 en las cuatro visiones de
color a los tres pintados, y en grises 6 pares por carrera de media como mucho (hoy, con la propuesta,
3,86). (4) `champion.test.ts`: las 134 bandas a 10 o más de los 443 permitidos y de los líderes en las
cinco vistas. (5) `contrast.test.ts`: cada pareja de §3.1 con su umbral, leyendo el `@theme`. (6) El de
§5, en el CI con la etiqueta `visual`. (7) Presupuesto de peso: CSS de arranque 20 KB con gzip como mucho,
entrada de JS 70 KB. **Se re-sellan** (mapa 01 §9): `stageRoute.test.tsx` l. 19, `riderResults.test.ts`
l. 112-119, `CueCard.test.tsx` (`bg-red-700`), `GroupBar.test.tsx` y `PlayerControls.test.tsx` por sus
clases; `leaderJerseys.test.tsx` se conserva entero (el dibujo de líder no cambia) y gana el caso de la
palabra `Leader`; `stageTables.test.tsx` cuenta por etiqueta (l. 36 y 46) y debería seguir pasando con
los maillots de equipo en las filas; los que buscan `Team jersey` pasan a `{team} kit`.

## 13. Plan por pasos, tests primero

Cada paso deja el juego desplegable y mejor; los costes son estimados.

1. **Tokens y letra** (1 PR): `@theme` nuevo, la letra de rótulo, `PageTitle` y `Panel` con contraste;
   `contrast.test.ts` primero. Depende de nada.
2. **El vocabulario** (1 PR): `kit.ts`, `kitDistance.ts`, las tablas generadas y sus tests (1 y 2 de §12).
3. **El dato** (1 PR): migración `team_kits`, `assignKit`, `ensureKits` en el tick con la traducción con
   continuidad, y el banco 3. Tras 2.
4. **El dibujo en todas partes** (1 PR): `kit` en los contratos y en `serveCast`, `Kit`, `WornJerseyIcon`
   con `surface`, la tabla por equipos con maillots y `Leader`; re-sellado. Tras 3.
5. **El campeón** (1 PR): `ChampionSash`, `NATIONAL_SASH` revisada en la página de opciones,
   `champion.test.ts`; `ChampionMark` se borra. Tras 4.
6. **El editor** (2 PR): API (`kit/check`, `kit`, espera, el NPC que cede, la interfaz de E9) y después la
   pantalla. Tras 4.
7. **El catálogo y la migración de páginas** (3 PR): `ui/` con sus estados, y las páginas por lotes (los
   146 botones, 63 paneles, 44 cargas y 26 errores del mapa 01). Tras 1, en paralelo con 2 a 6.
8. **El examen** (2 PR): API y `packages/db` (§7), después la pantalla con `Scale5` y los chips. Tras 7.
9. **La frontera** (1 PR): las cuatro piezas de §9. Puede ir tras 8.
10. **La web instalable** (1 PR): manifiesto, iconos, SW, aviso sin red, versión nueva y banderas fuera
    de la CSS. Tras 1.
11. **El criterio del teléfono en el CI** (1 PR): el arnés va primero, como test en rojo, desde el paso 1.

Unos 15 PR. El jugador ve el cambio de maillots en el paso 4, de golpe y por la noche, con una noticia en
cada equipo cuyo maillot cambie: `Mistral Racing has a new kit` (pantalla).

## 14. Riesgos y fronteras

**E2**: el contrato del rótulo gana `team.kit`; las etapas grabadas antes del paso 4 resuelven la semilla
(no se rompe nada). **E4**: el aviso al teléfono necesita el SW de §8. **E6**: dónde viven la explicación
de la precedencia y la barra inferior; E3 da su aspecto. **E8**: las zonas y la validación de §6.6; si el
patrocinador acaba comprando casi siempre el color base, la identidad de los equipos se volverá
inestable, y eso se mide en el banco. **E9**: la historia, `revertKit` y el vocabulario cerrado. **E10**: los
textos de §6.3 crecen al traducirse (no sé cuánto); la letra de rótulo no cubre el chino y cae a la del
sistema. **E12**: el Mundial y los continentales (la plata es provisional) y el dato de excampeón.
**Riesgos propios**: que al dueño no le guste `halves` o el reparto de bases (35 negros y 35 blancos de
219 con el sorteo; 34 y 21 con la continuidad): la página de opciones lo enseña y la figura se puede
quitar (quedan 396 permitidos, por recuento; el reparto sin ella no está medido); que la acromatopsia
siga con 3,9 pares por carrera; que la tabla nacional tenga errores como el de Corea; que la banda de
honor choque con alguna marca no buscada (no es asesoramiento jurídico); y el coste de traducir los 219
maillots en el primer tick (unos 90 s en Node, estimado). **Lo que no he podido comprobar**: un teléfono
de verdad, Safari y Firefox (todo es Chromium); la percepción con personas (ΔE00 por debajo de 10 es el
umbral del encargo, no un experimento); el mundo de producción, cuya semilla no sé (mapa 03 §8), y
pelotones de temporadas siguientes; el registro de las cinco bandas de la UCI y las bases de la EUIPO y
la USPTO; y el peso real de las tablas de cobertura en `packages/db`.

## 15. Decisiones que son del dueño

**D1 · La paleta de la interfaz** (gusto; página de opciones).

- **A, por defecto: noche y oro**, los tokens de §3.1. Porque la marca es la del campeón y todo pasa AA.
- **B: el estilo «manager» de hoy, corregido** (el del PR #105): cabecera `#123a5c` con blanco (11,76),
  paneles y botones `#0e6e8c` con blanco (5,79), barras doradas `#d99400` con `#14213d` (6,23), enlaces
  `#0e6e8c` (4,91 sobre `#e8edf2`). Conserva lo conocido; dos acentos que compiten.
- **C: retransmisión**: cabecera `#111827` (17,74), un solo acento rojo `#c8102e` en botones y reglas
  (5,88), fondo `#f4f4f5`, texto tenue `#52525b` (7,03). Más sobria; se aleja del público de Hattrick.

**D2 · La tipografía** (gusto). **A, por defecto**: sistema más Barlow Semi Condensed 600 en rótulos,
22.984 bytes. **B**: solo sistema, 0 bytes, y cada aparato con su letra. **C**: Inter variable de 400 a 700
para todo, 48.256 bytes, igual en todos los aparatos.

**D3 · La señal de campeón** (gusto). La página pinta las seis variantes del dueño (V1 a V7) junto a
estas, con la columna de distancia a la marca de §6.5.

- **A, por defecto: la banda de honor**, oro `#e0a526` sobre noche `#14213d` para el mundo y la bandera
  sobre papel `#f6f3ea` con filo `#14213d` de 2,4 u para el nacional, con el dibujo de §6.5.
- **B: el galón**, `M7 9 L24 25 L41 9 L41 20 L24 36 L7 20 Z` con los mismos colores; nacional, tres
  galones anidados de 11/3 u. A 13 px se lee como V; la nacional queda peor en grises (47 maillots por
  debajo de 10).
- **C: «un arcoíris diferente», la del dueño en su forma más fuerte**: la banda de A con un degradado
  continuo a lo largo de ella (`#e53935`, `#fb8c00`, `#fdd835`, `#43a047`, `#1e88e5`, `#5e35b1`,
  `#d81b60` en siete paradas iguales) sobre noche y cuello blanco. Otros colores, otro orden (continuo),
  otra disposición (una diagonal) y otro fondo: mide casi como A (24,9 y 14,1). Lo que cuesta: se lee
  como «el arcoíris del campeón», que SPEC §8 prohíbe imitar por su nombre; elegirla pide cambiar esa
  línea del SPEC por «las cinco bandas de la UCI», y la verificación de marcas pesa más.

**D4 · El vocabulario del maillot** (gusto). Las mismas seis figuras; cambia la paleta.

- **A, por defecto: 14 colores** (§6.1): 443 maillots permitidos; grises, 3,86 pares por carrera a 13 px.
- **B: 12**, sin `teal` ni `silver`: 326 maillots; grises, 6,63.
- **C: 10**, sin `teal`, `silver`, `violet` ni `forest`: 232; grises, 6,80. En color, las tres dejan 0.

**Las demás, con su valor por defecto**: **D5, el dorsal**: no vuelve como dibujo; maillot por equipo y
`Leader` (§6.4). Si se elige que vuelva, un rectángulo amarillo de 10 × 8 px sin trazos dentro y solo a 16
px o más. **D6, la espera entre cambios de maillot**: 28 días de juego; 7 hace la identidad volátil, una
temporada la congela. **D7, el NPC cede ante un humano**: sí; si no, un equipo PRS elige entre unos 31.
**D8, cuándo cambian los maillots**: ahora, con continuidad (63 conservan su color base); la otra opción es
esperar al reinicio del mundo. **D9, el excampeón**: con E12, el cuello y las mangas de oro a 28 px o más.
**D10, la bandera junto a la banda nacional**: sí, porque 26 países tienen bandas casi iguales. **D11,
el modo oscuro**: no en E3.
