# Decisiones cerradas de `docs/visual.md` (E3 · El sistema visual)

Cada contradicción de hecho o de diseño entre las cuatro propuestas queda aquí cerrada con una decisión y su evidencia. Los redactores las escriben como hechos y NO las reabren; si una sección necesita decidir algo que aquí no está, lo decide en su bloque «Decisiones de esta sección» (`N-a`, `N-b`…) y lo anota. Los nombres son los de `00-glosario.md`.

Cómo leer cada entrada. **Decisión**: lo que el documento final dice. **Evidencia**: de dónde sale, con el identificador del juicio (`C1` a `C12` son las comprobaciones de `juicios/codigo.md` §2; «cobertura C1» a «C9» y «uso C1» a «C11», las de los otros dos jueces, en el orden de su `.json`), el injerto (`I-nn`), la objeción (`O-nn`), el hueco (`H-nn`) o la contradicción de hecho (`X-nn`) de `juicios/veredicto.json`, y las líneas de código. **Descartado**: qué se propuso y no entra, y por qué. **Sección**: dónde se escribe (`§N` de `00-esqueleto.md`). Las partes marcadas **Sin evidencia de los jueces** son decisiones que esta síntesis ha tomado sin que ningún juez las mida o las pida con mecanismo; el documento dice quién las mide y en qué paso.

**Árbol de referencia.** `58c14da` (`main`, 20-10-2026); hasta `e3e4010` solo cambian documentos (`git diff --stat 58c14da HEAD -- apps packages`, vacío). `ENGINE_VERSION` 91 (`packages/engine/src/constants.ts` l. 853), que E3 no sube. Última migración `0049_rastro_de_etapa` (`packages/db/drizzle/meta/_journal.json`, 50 entradas): la próxima libre es la `0050`. **Base**: `telefono`, elegida por los tres jueces (96,5 puntos de 120 sumados, frente a 87,5 de `sistema`, 86,5 de `lectura` y 71,5 de `identidad`; el cálculo, en `veredicto.json` → `ganadora`).

---

## 0. Lo que decidió el dueño el 21 de octubre de 2026 (manda sobre todo lo de abajo)

El dueño miró la página de opciones y decidió (cita textual en `00-encargo.md` §7.2). Donde una
decisión de abajo diga otra cosa, **manda esta sección**, y quien redacte una sección la aplica sin
reabrirla. Lo que el orquestador añade a la palabra del dueño va marcado como tal, para que el dueño
lo vea en §19 y lo pueda quitar.

### D-00a · La paleta y la letra: las de los tres jueces

DD-01 = A, «manager sobrio» (D-03), y DD-02 = A, la letra del sistema (D-05). Decididas por el dueño.

### D-00b · El maillot no se pinta nunca por debajo de 28 px (sustituye a D-21)

`KIT_MIN_PX` = 28, en toda la web, SVG incluido, y ningún componente acepta un tamaño menor (el tipo
lo impide). `KIT_PX` = `{ row: 28, card: 40, team: 48, page: 72, hero: 96 }`; el `strip` de 13 y el
`row` de 16 desaparecen. Todo lo que se mide del maillot (el vocabulario, lo reservado, las señales de
campeón, `kitDistance`, la tabla de choques) se mide a 28 px (`KIT_CHECK_SIZES` = `[28]`), en las
cuatro visiones y con los grises informados. **Consecuencias que el redactor de cada sección aplica**:
la fila de una tabla con maillot mide 44 px o más; `RiderLabel` lleva el maillot a 28; la clasificación
por equipos (D-29), a 28; el editor (D-25) enseña el maillot a 72 y a 28, no a 13 ni a 16; y **`Watch`
cambia en una pieza de E2** (sustituye a la parte de D-56 que dejaba la barra a 13 px): la barra de
grupos ya no pinta un maillot por corredor, pinta **un maillot de 28 px por equipo presente en el
grupo con su cuenta** (`×3`) y, aparte y delante, a cada corredor que lleva un maillot de líder o de
campeón; la lista de corredores del grupo, al tocarlo, como hoy. Se re-sellan los tests de E2 que
fijan el maillot por corredor (`GroupBar.test.tsx` y los que salgan), con la causa escrita.

### D-00c · La identidad del corredor: bandera, nombre y maillot, siempre juntos y en ese orden

`RiderLabel` (D-09) pinta, contiguos y en este orden, **la bandera del país del corredor, su nombre y
su maillot**; el dorsal, cuando el contexto lo tiene (`#214`), va delante de la bandera, y el equipo,
en el segundo renglón. El maillot es el que lleva ese día (`WornJerseyIcon`): el de líder, el de
campeón o la equipación. Ninguna otra pieza pone una bandera junto al maillot.

### D-00d · La señal de campeón: el nacional viste su bandera; el mundial, blanco con una estrella de arcoíris (sustituye a D-26; DD-03 decidida)

- **Nacional**: el maillot entero es la bandera del país, mangas incluidas, dibujada con la misma
  bandera que la web pinta junto al nombre (el sprite de D-49), escalada para cubrir el torso
  (conservando su proporción y centrada) y recortada por `TORSO`, con el filete y el cuello de
  siempre. **Sin bandera al lado** (se quita la de `Jersey.tsx` l. 165).
- **Mundial**: cuerpo blanco y, en el pecho, **una estrella de arcoíris**, la estrella del logotipo de
  Cycling Star (`apps/web/src/components/Logo.tsx`). Lo que añade el orquestador para que sea
  inconfundible y se aleje de la marca de la UCI, y que el dueño puede quitar: el arcoíris es el
  **espectro natural** (rojo, naranja, amarillo, verde, azul y violeta) en degradado continuo dentro
  de la estrella, **nunca los cinco colores de la UCI ni en bandas**; la estrella lleva un filo
  oscuro (`navy-dark`) para leerse sobre el blanco y en grises.
- **Lo que añade el orquestador, también a criterio del dueño**: una **estrella pequeña dorada con
  filo oscuro en el pecho del nacional**, para que la estrella sea la señal única de «campeón» en los
  dos casos y la bandera diga de dónde. Sin ella, un equipo cuyo maillot se parezca a una bandera se
  confundiría con su campeón, y habría que prohibir los maillots de equipo que reproducen banderas.
- **Lo reservado**: la estrella (ningún maillot de equipo, de líder ni de patrocinador la lleva) y el
  cuerpo blanco (el blanco solo es segundo color en los equipos).
- Ruta y crono, élite y sub-23 comparten dibujo y los separa el texto (`championTitleText`), como
  decía D-26. **Continental** (E12): provisional, la estrella en plata sobre blanco.
- **El coste que el dueño tiene que conocer** (§19): un maillot blanco con una estrella de arcoíris
  evoca a propósito «el arcoíris del campeón del mundo» que `SPEC.md` l. 874 prohíbe imitar, aunque
  no sea la marca (cinco bandas horizontales en ese orden). Mantenerla pide reescribir esa línea como
  «las cinco bandas de la UCI» y verificarla ante la EUIPO y la USPTO antes del lanzamiento. Su
  distancia a la marca y a las equipaciones, a 28 px, se mide en `champion.test.ts` y en la página de
  opciones; nada de esto es asesoramiento jurídico.
- La banda de honor de D-26 queda como alternativa descartada por el dueño, con sus cifras.

### D-00e · El vocabulario del maillot: quince colores, siete figuras y ningún maillot repetido (sustituye a D-20; DD-04 decidida)

- **Quince colores con nombre**: los doce de D-20 (telefono §6.1) más tres, elegidos y medidos por el
  redactor de §8 con `<scratchpad>/venv` para que el mínimo de ΔE00 entre pares sea el mayor posible
  en las tres dicromacias; el amarillo y el blanco siguen siendo solo de segundo color.
- **Siete figuras**: las seis de D-20 más `sash`, la diagonal, que vuelve porque ya no es la señal de
  campeón.
- **La regla de contraste** de D-20 se queda (`KIT_CONTRAST_MIN` = 20).
- **Nunca dos equipos con el mismo maillot**: un índice único sobre el maillot canónico en el mundo
  (todos los equipos, de NPC y de humanos), el reparto de los NPC y la traducción del mundo de hoy
  (DD-07) que nunca repiten, y el editor que responde `409 kit_ocupado` (`This kit is already worn by
Mistral Racing.`, pantalla).
- **Y además, distinguibles**: dos maillots distintos pueden verse iguales, así que se queda la regla
  de que dos equipos que coinciden en carrera quedan a `KIT_MIN_DISTANCE` = 10 o más en las cuatro
  visiones, ahora a 28 px.
- **Lo reservado**: el cuerpo amarillo (líder de la general), los lunares (montaña), la estrella y el
  cuerpo blanco (campeones).
- La puerta de D-20 cambia: `kits.test.ts` comprueba en el paso 16, a 28 px, que ninguna carrera de
  la temporada 0 tiene un par por debajo de 10; si alguna lo tiene, el PR lo dice y propone qué color
  o qué figura sobra.

## A. La base y dónde vive cada cosa

### D-01 · La base es `telefono`, y el documento es una fusión

**Decisión.** Todo token, componente y pantalla se especifica primero a 360 × 800 px (la referencia) y a 320 × 640 (el rescate, el ancho de WCAG 1.4.10); el escritorio es una ampliación declarada con `sm:` (640) y `lg:` (1.024). De la base entra su estructura entera (las dieciséis secciones de `01-fase-propuestas.md`), y de las otras tres lo que dice `veredicto.json` → `ganadora.fusion`: de `sistema`, el sistema que se hace cumplir (tema cerrado, deuda, reglas, `data-*`, `/_ui`, densidad por puntero, ámbito oscuro, tabla de choques, `colorMath.ts`, la cola larga); de `identidad`, los maillots (la banda de honor y sus variantes medidas, `team_kits`, la traducción por parecido, la regla de contraste, el veredicto con equipo y visión, el NPC que cede, el patrocinador con `set_by`, el material generable); de `lectura`, lo que hay debajo del examen (el desfase de semanas, el plan vivo, la resolución en el tipo, el glosario de pantalla, la fila propia, `↺ Back to Build`, la tira de siete días, la portada, la línea de estado, `TripRow`, la ficha).

**Evidencia.** Los tres juicios, §4; codigo §4: «con `sistema` de base habría que rehacer frontera, sin red y examen, que son lo que se ve y lo que rompe».

**Descartado.** `sistema` como base, que el juez de uso escogería «si el foco fuera solo el código» (uso §4).

**Sección.** §0, §20.

### D-02 · Dónde vive cada cosa

**Decisión.**

| Qué                                                                             | Dónde                                                                                                                             | Por qué                                                                                                                 |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| tokens de color, letra, radio, sombra, cortes y contenedor                      | `@theme` de `apps/web/src/index.css` (sin `inline`)                                                                               | Tailwind v4 crea las utilidades de ahí; sin `inline` los tokens son variables CSS y el ámbito oscuro puede redefinirlos |
| el catálogo de componentes                                                      | `apps/web/src/components/ui/`, un componente por fichero con su `.test.tsx`                                                       | una carpeta, una frontera para el lint                                                                                  |
| `WornJerseyIcon`                                                                | se queda en `apps/web/src/components/broadcast/WornJerseyIcon.tsx`                                                                | es el contrato de E2 y lo importan sus componentes                                                                      |
| constantes visuales de la web                                                   | `apps/web/src/components/ui/constants.ts`; las de red, `apps/web/src/net.ts`; las de la prueba, `apps/web/e2e/telefono.config.ts` | la prueba importa las de `ui/constants.ts` y no las copia                                                               |
| vocabulario y geometría del maillot, colores de líder y de campeón, `kitSchema` | `packages/shared/src/kit.ts`, en el barril                                                                                        | lo dibuja la web, lo valida la API y lo reparte `packages/db`                                                           |
| WCAG, Machado 2009, CIELAB y ΔE00                                               | `packages/shared/src/colorMath.ts`, fuera del barril (I-31)                                                                       | lo usan los tests y el servidor; en el barril viajaría a la web sin falta (H-03)                                        |
| distancia dibujada, tabla de choques, reparto, rivales de temporada             | `packages/db/src/kitDistance.ts`, `kitConflicts.generated.ts`, `kits.ts`, `seasonRivals.ts`                                       | solo servidor                                                                                                           |
| la precedencia del día                                                          | `packages/shared/src/trainingDay.ts` (`resolveTrainingDay`)                                                                       | la usan el tick (`packages/db`) y la vista previa (`apps/api`)                                                          |
| las palabras de pantalla                                                        | `apps/web/src/domain/words.ts`                                                                                                    | junto a `labels.ts` y `format.ts`, que ya pintan texto                                                                  |
| `PREVIEW_RACE_DAY_TSS` y su ventana                                             | `packages/engine/src/constants.ts` (D-37)                                                                                         | `Claude.md`: toda constante de juego                                                                                    |

**Evidencia.** telefono §3.4; sistema §3.5; identidad §6.2; I-31; O-09; H-03; mapa 01 §8 (el barril de `packages/shared` sin `sideEffects`).

**Sección.** §3, §15.

---

## B. Los fundamentos

### D-03 · La paleta: «manager sobrio» (el defecto de DD-01)

**Decisión.** Los tokens de telefono §3.1, con sus valores y su contraste medido (`paleta_final.py`): `canvas` `#eef2f6`; `surface` `#ffffff`; `surface-2` `#f5f7fa`; `line` `#d8dee6`; `line-strong` `#7b8794` (3,66 sobre `surface` y 3,25 sobre `canvas`); `ink` `#10202f` (16,54 y 14,70); `ink-2` `#435266` (7,96, 7,08 y 7,42 sobre `surface-2`); `ink-3` `#566579` (5,94, 5,28 y 5,54); `navy` `#123a5c` y `navy-dark` `#0b2740` (blanco encima 11,76 y 15,23); `cyan` `#1499bb` (3,33 sobre blanco: nunca texto); `accent` `#0b6e8a` (5,81 en los dos sentidos, 5,17 sobre `canvas`) y `accent-strong` `#085a71` (blanco encima 7,75); `gold` `#e0a106` (`ink` encima 7,30, sobre `navy-dark` 6,72) y `gold-ink` `#7a5000` (7,06); `good` `#167a3a` y `good-bg` `#e6f4ea` (5,41; 4,77); `warn` `#8f4e00` y `warn-bg` `#fff3d6` (6,45; 5,85); `bad` `#b42318` y `bad-bg` `#fdeceb` (6,57; 5,75); `info-bg` `#e3f2f7` (`accent` encima 5,07); `focus` `#1d4ed8` (6,70 y 5,96); `disabled-ink` `#6b7787` y `disabled-bg` `#e9edf2` (3,87, que WCAG exime). Se añaden: `white` `#ffffff` (texto sobre `navy`, `accent` y los tramos); `on-accent` `#ffffff` (texto del botón primario, que el ámbito oscuro redefine); `on-navy-2`, blanco al 80 % (8,15 sobre `navy`, telefono §5.2); `own` `#a87300` y `own-tint` `#fdf4dc` (la fila propia: barra 4,10 contra blanco, `ink` encima 16,26; lectura §3.1); y los cinco tramos de la llegada, `arrival-cooked` `#b42318`, `arrival-loaded` `#b45309`, `arrival-fine` `#566579`, `arrival-spoton` `#167a3a` y `arrival-rusty` `#1d5fa8` (blanco encima 6,57, 5,02, 5,94, 5,41 y 6,45). Sin degradados y sin barras de color a todo lo ancho. El `body` pasa de `#e8edf2` fuera del tema (`index.css` l. 15-17) a `bg-canvas`. `focus-dark` de telefono no es un token: es el valor de `focus` dentro del ámbito oscuro (D-04).

**Evidencia.** Los tres jueces (gusto, unanimidad); telefono §3.1; uso C5 (los tramos, reproducidos); lectura §3.1 (`own`); mapa 01 §2.3 (las barras de hoy, de 2,06 a 3,33).

**Descartado.** Las alternativas B, C y D de DD-01, que van a `opciones/index.html`.

**Sección.** §3.

### D-04 · Sin modo oscuro; un ámbito oscuro para lo que ya es oscuro

**Decisión.** E3 no hace un tema bajo `prefers-color-scheme` (DD-05). Hace el ámbito `[data-surface='dark']` de sistema §3.1 (I-10): un atributo que redefine tokens para que los mismos componentes sirvan sobre fondo oscuro. Lo llevan `AppHeader`, `BottomNav`, la capa fija, el rótulo (`CueCard`) con fondo oscuro, `WatchBlocks`, `PlayerControls`, `StagePreviewCards` y `StageClosingCards`. Valores, de la paleta C de telefono §15.1 (medidos por telefono): `surface` `#0b2740`; `surface-2` `#123a5c`; `ink` `#ffffff` (15,23 y 11,76); `ink-2` e `ink-3`, blanco al 75 % (9,10 sobre `#0b2740` y 7,36 sobre `#123a5c`); `accent` `#35bdda` (6,85, telefono §15.1); `on-accent` `#0b2740`; `focus` `#ffd166` (10,57 y 8,16); `gold` sin cambio (6,72). **Sin evidencia de los jueces**: `line` y `line-strong` dentro del ámbito; el redactor de §3 los mide con `<scratchpad>/venv` (umbral 3:1 de WCAG 1.4.11 para `line-strong`) y escribe el valor y la cifra. `tokens.test.ts` comprueba las parejas de los dos ámbitos.

**Evidencia.** I-codigo-10, I-uso-04; telefono §15.1 (paleta C); sistema §3.1 (25 parejas oscuras medidas con su paleta, el peor texto 5,57).

**Descartado.** Los nueve valores de sistema (`#7dd3fc`, `#e2e8f0`…), medidos sobre su `#0f172b` y con sus nombres; aquí manda la superficie `navy-dark` de la base.

**Sección.** §3, §14.

### D-05 · La letra: la del sistema (el defecto de DD-02)

**Decisión.** `--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif` (la pila de telefono con los dos respaldos de sistema §3.2, por los alfabetos de E10). Siete tamaños (telefono §3.2): `caption` 12/16 (400 y 600; en versales, 600 y +0,04 em), `meta` 14/20 (400), `row` 15/20 (600), `body` 16/24 (400), `title` 18/24 (600), `page` 24/32 (700) y `display` 32/40 (700). Pesos 400, 600 y 700: `font-medium` (243 apariciones) y `font-mono` (12) van a la deuda. `tabular-nums` en toda columna de cifras. Humanos en 600 y bots en cursiva (`RiderName.tsx` l. 19-20; [DUEÑO 24]). Mínimo 12 px en todo nodo de texto, SVG incluido; 16 px en todo campo. Si el dueño elige otra letra, se sirve desde `apps/web/public/fonts/` con `font-display: swap`, porque la CSP solo deja `font-src 'self' data:` (`app.ts` l. 183).

**Evidencia.** Los tres jueces (gusto); telefono §3.2; mapa 01 §2.2.

**Sección.** §3.

### D-06 · Espacio, rejilla y densidad por puntero

**Decisión.** Rejilla de 4 px (`--spacing: 0.25rem`) con los pasos de sistema §11 (`SPACING_STEPS`: 0, 0,5, 1, 1,5, 2, 2,5, 3, 4, 6, 8, 12 y 16); márgenes de 12 px a 360, 16 desde 640 y 24 desde 1.024 (`App.tsx` l. 158); solo dos cortes, `sm` (40rem) y `lg` (64rem): las 3 apariciones de `md:` y la de `xl:` van a la deuda; `max-w-page` 72rem y `max-w-form` 28rem. Alturas con el dedo (telefono §3.3): fila 48, fila con acción 64, campo 48, objetivo 44, cabecera 48, pestañas 44, barra inferior 56 más la muesca, barra de acción 60; relleno de panel 12, y 16 desde 640. Son alturas mínimas (`min-h-*`), nunca fijas (H-17). Con ratón (I-21), la variante `fine` (`@custom-variant fine (@media (pointer: fine))`): fila de tabla de 36 px y `Button` `size="sm"` de 32, que nunca se ve en un teléfono.

**Evidencia.** telefono §3.3; sistema §3.3 y §11; I-cobertura-13, I-uso-03; mapa 04 §2 (el público de Hattrick y PCM).

**Sección.** §3, §6.

### D-07 · Radios, sombras e iconos

**Decisión.** Un radio, `--radius-ui` de 8 px (`rounded-ui`), para panel, botón, campo y aviso; `rounded-full` (utilidad estática de v4) solo en `Chip` y en la pastilla de `BottomNav`. Los radios de hoy (`rounded-md`, `rounded-lg`, `rounded-2xl`…) no se redefinen: van a la deuda y desaparecen con el tema cerrado. Dos sombras: `shadow-card` (`0 1px 2px rgb(16 32 47 / 0.08)`) y `shadow-bar` (`0 -2px 8px rgb(0 0 0 / 0.12)`). **Iconos**: 24 propios en SVG sobre rejilla de 24 u, trazo de 2 u y `currentColor`, pintados a 16, 20 o 24 px, siempre con su texto al lado o con `aria-label`: `home`, `rider`, `team`, `world`, `news`, `account`, `travel`, `race`, `check`, `warning`, `error`, `info`, `offline`, `retry`, `close`, `chevron-left`, `chevron-right`, `chevron-down`, `star-full`, `star-half`, `star-empty`, `trend` (girado en pasos de 45° para los cinco niveles), `share` y `more`. Los emoji salen de la interfaz (`✈️`, `🚴`, `🏁`, `⚠`; mapa 01 §6); los de los logros son contenido y se quedan (`ranking.ts` l. 571-621).

**Evidencia.** telefono §3.3; sistema §3.4; lectura §3.3; [DUEÑO 5] (un glifo pequeño que se leía «Ill»).

**Sección.** §3.

### D-08 · El material generable es regla

**Decisión.** Los iconos de la interfaz, los de la web instalable, `og-default.png`, `NATIONAL_SASH`, la tabla de choques y el sprite de banderas con sus coordenadas salen de scripts del repositorio (`apps/web/scripts/`, `packages/shared/scripts/`, `packages/db/scripts/`). Cada fichero generado lleva en su cabecera la huella (SHA-256) de sus entradas, y un test regenera y compara. El PR que los introduce lleva en su descripción la hoja de contactos que revisa una persona. El presupuesto de dibujo a mano es cero.

**Evidencia.** I-23 (identidad, principio 9 y §6.7); `00-encargo.md` §1.8; `docs/agenda.md` §4.22.5.

**Sección.** §3, §12, §14, §17.

---

## C. Los componentes y el sistema que se hace cumplir

### D-09 · El catálogo cerrado

**Decisión.** Los componentes de `00-glosario.md` §G.3, y ninguno más, en `apps/web/src/components/ui/`. Una página solo los compone, con utilidades de disposición; un componente nuevo entra con un PR que lo añade a `ui/`, a `/_ui` y a sus tests. Además de los de telefono §4: `TextLink` y `Stat` (sistema §4), `Disclosure` (I-33), `TripRow` (I-34) y el `PageHeader` con su línea de estado (I-32). **La ficha de corredor** (I-17) es una composición fija en `RiderProfile.tsx`, no un componente: `RiderHeader`; la condición (forma en `StarRating`, fondo y frescura en `Meter`, cerillos como iconos de 2 a 5 según SPEC §4.1, la salud en `Chip`); los diez atributos en filas de 44 px con `StarRating` y, solo en la propia, la marca de cuatro pasos y la flecha; la frase del entrenador a la vista en «lo tuyo» (hoy una a la vez, mapa 02 §7); la ajena, sin lo privado (`docs/navegacion.md` §3.6). **`RiderLabel`** (I-18): bandera de 21 × 16, el dorsal cuando el contexto lo tiene (una carrera: `#214`), el nombre (humano 600, bot cursiva, subrayado punteado `line-strong`), el equipo en el segundo renglón en `meta` `ink-3` (y entre paréntesis en una frase, como en la crónica) y el maillot de 16 px; el nombre no se corta nunca, la fila crece ([DUEÑO 17], [DUEÑO 26]).

**Evidencia.** telefono §4; sistema §4; lectura §4.1; I-17, I-18, I-32, I-33, I-34; O-16, O-17.

**Sección.** §4.

### D-10 · Sin `className` para lo suyo, y el estado en `data-*`

**Decisión.** Ningún componente acepta `className` para su color, letra, radio o sombra: acepta `layout` (márgenes, ancho, colocación en rejilla) y nada más. Cada uno pone en su raíz `data-ui="<Nombre>"`, `data-variant` y `data-state` (los valores, §G.4), y los tests miran eso y el ARIA, nunca clases. Los seis tests que hoy fijan clases se re-sellan contra `data-*`: `stageRoute.test.tsx` l. 19, `riderResults.test.ts` l. 112-119 (`placeTone` devuelve un tono, no una clase), `CueCard.test.tsx` l. 34, `GroupBar.test.tsx` l. 82 y 190, `PlayerControls.test.tsx` l. 145 y `StageCards.test.tsx` l. 361. **`/_ui`**: una ruta de la web, sin enlace desde ningún sitio y con `noindex`, en su propio trozo, que pinta cada componente en cada estado con datos fijos y sin llamar a la API; es la primera página de la prueba del teléfono y donde el dueño mira el sistema en su teléfono.

**Evidencia.** I-03 (sistema §2.4, §4 y §12); la maqueta de sistema, donde dos clases de ancho en el mismo elemento dejaron un `select` en 26 px; mapa 01 §9.

**Sección.** §4, §5, §16.

### D-11 · Los estados de una consulta, en `QueryView`

**Decisión.** `QueryView` recibe la consulta, `isEmpty`, el vacío y el nombre de lo que carga, y pinta: `Skeleton` si carga, visible solo a partir de `LOADING_DELAY_MS` = 300 (I-30), y a los `SLOW_HINT_MS` = 8.000 la línea `Still loading. Slow connection?` con `Retry` (pantalla); `OfflineState` si React Query la ha dejado en pausa por falta de red (`fetchStatus === 'paused'`); `ErrorState` con `refetch` si falla; `EmptyState` si llega vacía; los hijos si está lista. Toda petición se corta a los `REQUEST_TIMEOUT_MS` = 15.000. Las seis páginas que hoy pintan un fallo como vacío dejan de hacerlo (mapa 01 §4). Ninguna página escribe `isPending &&`.

**Evidencia.** telefono §4 y §8.3; sistema §4 n.º 14 y 15; I-uso-14; mapa 05 §13.

**Descartado.** El aviso a los 10 s de identidad: manda la base, 8 s.

**Sección.** §4.

### D-12 · Lo fijo: orden, tope y teclado

**Decisión.** De abajo arriba: `BottomNav` (56 px más `env(safe-area-inset-bottom)`), `ActionBar` (60) sobre ella, `UpdateToast` (48) sobre la `ActionBar`; `OfflineBanner` (32) va bajo la cabecera, en el flujo y no fijo. Un solo aviso flotante a la vez: `UpdateToast` gana a `InstallHint`, que espera a la siguiente sesión. La consecuencia de la `ActionBar` va en un renglón con `…` y entera en `aria-describedby`. `main` lleva de relleno inferior la suma de las barras visibles (`--fixed-bottom`, que escribe el propio marco). **Sin evidencia de los jueces**: mientras el teclado virtual está abierto (`visualViewport.height < 0,75 × innerHeight`), la `ActionBar` y la `BottomNav` se esconden (H-16). En `Watch`, la `BottomNav` solo se esconde si E6 acepta `useHideBottomNav` (DD-13).

**Evidencia.** O-29 (uso, medido a 320: la consecuencia parte en dos renglones); H-uso-03.

**Sección.** §4, §6.

### D-13 · Ningún estado va solo en color

**Decisión.** `Chip` y `Notice` exigen en su tipo `tone` y texto, y cada tono lleva su icono: `good` `check`, `warn` `warning`, `bad` `error`, `info` `info` (`neutral` y `accent`, ninguno). El dinero va siempre con signo (`+80`, `−80`). La escala de llegada se lee por posición y por palabra. `tokens.test.ts` informa del ΔE00 entre los tonos de estado en las cuatro visiones (`good` y `bad`, 9,0 en deuteranopía, uso `estado.py`) sin hacerlo umbral, porque el mecanismo es la forma y el texto.

**Evidencia.** O-31 (uso); H-18.

**Sección.** §3, §4.

### D-14 · El sistema se hace cumplir: el tema cerrado al final, una deuda que solo baja y diez reglas

**Decisión.** Tres piezas (I-01, O-06). (1) **El tema se cierra en el último paso** (paso 22) con `--color-*: initial` y lo mismo en letra, tamaño, radio, sombra, corte y contenedor: medido por sistema con el compilador de Tailwind 4.3.3 sobre las fuentes de producción, dejan de resolver 2.457 de 6.322 apariciones (176 clases distintas); los valores arbitrarios (`text-[11px]`, `p-5`) siguen resolviendo con el tema cerrado (codigo C4) y van a una lista con su motivo. Hasta ese paso, todo lo de hoy sigue resolviendo. (2) **`vocabulario.test.ts`**, con `__unstable__loadDesignSystem` de `tailwindcss` a versión exacta en `apps/web/package.json`, cuenta por fichero las apariciones que resuelven con el tema por defecto y no con el cerrado y falla si la de un fichero sube sobre `deuda.json`; dos sondas (`bg-surface` existe; `bg-indigo-600` no existe con el cierre inyectado) hacen fallar el test si el instrumento deja de medir. (3) **Las reglas `ui/1` a `ui/10`** (botón, tabla, campo, `title` sin texto visible, estado a mano, paleta de Tailwind, arbitrario, hexadecimal, `style`, emoji) corren sobre `apps/web/src/**` salvo `components/ui/` y los ficheros generados, no solo sobre `pages/`; nacen en `warn` con la lista de heredados (83 ficheros y 1.417 avisos, medido por sistema) en el paso 8 y pasan a `error` en el 22. El lint ya corre sobre `.tsx` en el CI (codigo C6), así que no piden otro trabajo. El recuento de apariciones de `deuda.json` es el de sistema, 6.322, que ve también los `.ts` (X-22).

**Evidencia.** sistema §0, §2, §12 y §13; codigo C4 y C6; I-01; O-06; X-11, X-12, X-22.

**Sección.** §5, §16, §17.

### D-15 · Una palabra por cosa

**Decisión.** El glosario de pantalla de lectura §4.2 en `apps/web/src/domain/words.ts`, con su columna «Nunca» (I-19): un día, `Day 56`, `Day 56 · in 6 days`, `Days 56 to 60`, `Day 12 · Season 2` (nunca `GD 56` ni el día absoluto); una diferencia, `+0:40`, `+12:05`, `+1:02:10`, `s.t.`, con `formatTime` (`format.ts` l. 4-11) en todo el juego (nunca `+0:00:20`); una carrera, `Race Var .1 · one day`, y en una frase `Race Var` (nunca `the Race Var`, `dashboard.ts` l. 68); el viaje, `travel out`, `travel back`, `2 travel days (1 out, 1 back)` (nunca `1d`); el origen de un día, los siete de §G.12; la carga, `Rest`, `Easy`, `Steady`, `Hard`, `Very hard` (nunca `105 TSS`); el dinero, `6,173,210` y `−80` con `money` (`format.ts` l. 14-17; nunca `17214`). Los componentes imponen las palabras: `RankTable` llama a `formatTime`, `ActionRow` y `TripRow` a `formatGameDay`.

**Evidencia.** I-19 (lectura §4.2); mapa 02 §6 (tres numeraciones del día).

**Sección.** §4.

---

## D. El teléfono

### D-16 · Las tablas anchas: una fila, dos renglones, una acción

**Decisión.** La tabla de telefono §5.1, tabla por tabla, con `RankTable` y `ActionRow`: ninguna tabla se desplaza de lado ni recorta; `Top 20` y `Show all N` en todas (`TOP_ROWS` = 20; hoy lo cumplen 7 de 15). **La fila propia** (I-26): si el corredor del jugador o su equipo no está en las 20 primeras, su fila va anclada tras una fila `…`, con barra `own` de 3 px, fondo `own-tint`, nombre en 600 y `aria-current="true"`. **El enlace del nombre** es la celda de identidad entera, en bloque y con 44 px de alto (O-28); la prueba cuenta los enlaces de tabla como controles. **El escritorio** (O-33): cada columna declara `priority` (`primary`, `secondary`, `optional`); desde 640 vuelven a columna las `secondary` y desde 1.024 las `optional`, y §6 escribe por tabla cuáles son.

**Evidencia.** telefono §5.1; sistema §4 n.º 10; lectura §4.1; uso C1; I-26; O-28, O-33.

**Descartado.** El desplazamiento lateral con la primera columna fija en el salón de la fama y la nación (identidad §5, lectura §5.1): la base lo prohíbe y las dos caben en dos renglones (telefono §5.1).

**Sección.** §4, §6.

### D-17 · Navegación, dedo y letra

**Decisión.** `AppHeader` de 48 px con el logotipo, el reloj del mundo en `meta` `on-navy-2` (`Day 50 · S1 · 4h 56m`, pantalla, que hoy no sale en el teléfono, `Header.tsx` l. 122) y `Account` en 44 px, con `env(safe-area-inset-top)` de relleno. `Tabs` de 44 con un desvanecido de 24 px mientras haya más y la activa centrada al entrar. `BottomNav` con icono de 24 en una pastilla de 56 × 28 y el rótulo en `caption` 600 debajo, con los mismos rótulos que en escritorio (`Dashboard`, `My Rider`, `My Team`, `World`, `News`; `docs/navegacion.md` l. 266-267). **Sin evidencia de los jueces** (O-30): si la comprobación 2 de la prueba encuentra un rótulo cortado a 320 con la letra del CI, por debajo de 340 px los rótulos pasan a `Home`, `Rider`, `Team`, `World` y `News` (una consulta de contenedor), y la decisión se comparte con E6. Objetivos de 44 × 44, o de 24 con 24 libres en un enlace dentro de una frase (WCAG 2.5.8); letra de 12 px como mínimo, también en SVG, y 16 en los campos; el nombre de un corredor no se corta nunca, el de un equipo en el segundo renglón sí, con `…` y `data-clip-ok` (el maillot lleva el nombre en su `aria-label`), y una cifra o un botón nunca. Nada solo en `:hover` o en `title` (`InfoButton`); ningún gesto de deslizar; un enlace de vuelta en toda pantalla de segundo nivel, porque instalada en iPhone no hay barra del navegador.

**Evidencia.** telefono §5.2; mapa 04, contradicciones 5 y 6; O-30 (uso: medido con Inter, no con la letra del sistema).

**Sección.** §6.

### D-18 · El criterio de aceptación: la prueba del teléfono

**Decisión.** `apps/web/e2e/telefono.spec.ts`, con Playwright 1.56.1 y axe-core 4.10.3 como `devDependencies` de versión exacta en `apps/web/package.json` y Chromium en la caché del CI (O-11, X-09). Las nueve comprobaciones de telefono §5.3, a 360 × 800 y a 320 × 640, con tacto y relación de píxeles 2: (1) reflujo (`scrollWidth` igual al ancho); (2) recortes (texto que no cabe en un `overflow` oculto o con `ellipsis` y sin `data-clip-ok`): 0; (3) letra de todo nodo de texto visible, SVG incluido, de 12 px o más; (4) letra de `input`, `select` y `textarea` de 16 px o más; (5) objetivos de 44 × 44 o la excepción de 2.5.8, con los enlaces de tabla contados como controles; (6) axe-core con `color-contrast`, `target-size`, `select-name`, `button-name`, `link-name`, `label`, `dlitem` y `definition-list`: 0 nodos; (7) el borde superior de `[data-answer]` a 520 px o menos a 360 × 800; (8) con cambios sin guardar, `[data-primary-action]` a la vista y en el 40 % de abajo, al principio y al final del desplazamiento; (9) alto en el estado inicial de 3.200 px o menos en las pantallas de herramienta. **Dónde** (I-04 adaptado): sobre `/_ui` y sobre las 45 pantallas de `TELEFONO_PANTALLAS` (O-27: ruta, cuenta, elemento con `data-answer`, si es de herramienta), en cada PR que toca `apps/web`, `apps/api` o `packages/db`; el rendimiento, cada noche (D-50). **El mundo** (O-26, H-15, X-23): `apps/web/e2e/world/build.mjs`, el port de `capturas/mundo.mjs` (PGlite, génesis con `GENESIS_WORLD_SEED`, 50 días con `timelineRecord: 'on'`, 849 s medidos por el mapa 05 §1, y las cuatro escrituras con SQL de ese mapa: correo confirmado, 400 de dinero, el contrato del corredor del mánager y `premium`), con las cuatro cuentas (el jugador agente libre con plan de bloques y cuatro carreras, el mánager de un WorldTour, el visitante y la cuenta sin corredor). **Sin evidencia de los jueces**: el mundo se guarda como un archivo de su directorio de datos en la caché del CI, con clave la huella de `packages/db/drizzle/`, `packages/engine/src/` y el propio script; si la clave cambia, se reconstruye (unos 15 minutos, estimado con el mapa 05); el paso 2 mide su tamaño y su tiempo de restauración. **El trinquete**: `telefono-baseline.json` guarda las faltas de cada pantalla y comprobación de hoy; el CI falla si una sube, y **E3 está terminado cuando el fichero está a cero**.

**Evidencia.** telefono §5.3; sistema §5 y §12; codigo C11, O-codigo-11; uso O-01, O-02, O-13; H-uso-01; mapa 05 §1 y §2.

**Descartado.** La prueba a mano antes de fusionar (lectura §5.4), que no se hace cumplir; las pantallas solo cada noche (I-codigo-04), que deja el trinquete sin poder parar un PR; «génesis y tres días» (telefono §5.3), que no da las pantallas medidas (X-23).

**Sección.** §7, §16, §17.

### D-19 · Lo que la prueba no ve, y quién lo mira

**Decisión.** (1) **La prueba del dueño en su teléfono** (la decisión 6 de E2, `implementacion.md` l. 17) con las diez tareas a una mano de telefono §5.3 (entrar, ver su llegada, cambiar un bloque, poner órdenes, inscribirse, ver una etapa, abrir la general y una ficha, cambiar el maillot, instalar, abrir sin red), y una undécima con VoiceOver o TalkBack si el dueño los usa (H-19): es la puerta del paso de cierre (24) y no bloquea los demás (DD-20). (2) **La letra ampliada** (H-17): una pasada nocturna con la letra raíz al doble, solo con las comprobaciones 1 y 2, que informa y no bloquea. (3) **En horizontal** (H-16): una pasada nocturna a 800 × 360 con la comprobación 1, que informa; el manifiesto no fija `orientation`. (4) WebKit, San Francisco y Roboto, `100dvh` y el área segura en un aparato (H-13) no se miden en el CI: los cubre la prueba del dueño y §18 los deja como riesgo.

**Evidencia.** H-cobertura-09; H-uso-02, H-uso-03, H-uso-04 y H-uso-06; telefono §5.3.

**Sección.** §7, §18.

---

## E. Los maillots

### D-20 · El vocabulario del maillot del equipo (el defecto de DD-04)

**Decisión.** **Doce colores con nombre** (telefono §6.1): de base, `black` `#1b1d21`, `navy` `#172a5b`, `blue` `#0f6de9`, `sky` `#4cc3ff`, `teal` `#0f9e8f`, `green` `#236102`, `orange` `#f48d32`, `red` `#c62639`, `pink` `#f7418a` y `purple` `#4e2cae`; solo de segundo color, `yellow` `#ffd60a` y `white` `#ffffff`. Ningún par baja de 15,9 de ΔE00 en visión normal ni de 12,3 en las tres dicromacias (medido por telefono y re-medido por cobertura C6 y uso C4; X-02). **Seis figuras** (las de telefono sin `Sash`, porque la diagonal es del campeón, D-26), con 6 u como trazo mínimo (1,6 px a 13 y 2 px a 16): `plain` (nada), `band` (banda de pecho de y 23 a 33), `hoops` (dos aros, de y 17 a 24 y de 30 a 37), `halves` (la mitad derecha, de x 24 a 48, con su manga), `yoke` (hombros, mangas y pecho alto, hasta y 19) y `sides` (costados y mangas, de x 0 a 21 y de 27 a 48). **La regla de contraste** (I-25): base y segundo color a `KIT_CONTRAST_MIN` = 20 de ΔE00 o más en las cinco vistas (las cuatro y los grises), para que la figura se vea en grises. **Lo reservado**: el cuerpo amarillo (líder de la general), los lunares (montaña), la diagonal (el campeón) y todo maillot que a 13 o a 16 px quede a menos de 10 de una señal reservada en alguna de las cuatro visiones. **Cuántos**: 10 lisos y 5 × 10 × 11 con figura, 560 combinaciones antes de reserva y contraste; lo permitido y las carreras están sin medir con seis figuras (O-25). **La puerta**: la página de opciones lo mide ahora y `kits.test.ts` lo repite en el paso 16; si alguna de las 310 carreras de la temporada 0 tiene un par por debajo de 10 en alguna de las cuatro visiones a 13 o a 16 px, el defecto pasa a la alternativa B de DD-04 (identidad A: 14 colores y seis figuras, 443 permitidos, medido con la diagonal reservada) y el PR lo dice.

**Evidencia.** telefono §6.1 y §6.2; identidad §6.1; cobertura C6; uso C4 y §8 (su defecto es este); X-02; O-25.

**Descartado.** Los diez colores y siete figuras de sistema (el defecto del juez de código): llevan `sash` y habría que volver a medirlos igual; van a la página como alternativa C. Los quince colores de lectura: `rosa` y `gris` a 1,6 en deuteranopía (uso C4).

**Sección.** §8.

### D-21 · El tamaño mínimo es 13 px: `Watch` no cambia

**Decisión.** `KIT_MIN_PX` = 13, el tamaño de `GroupBar.tsx` l. 242, `CueCard` y `TimeTrialBoard`, que no cambia: E3 no mueve el diseño de E2. `KIT_PX` = `{ strip: 13, row: 16, card: 28, team: 40, page: 72, hero: 96 }`. Todo lo que se mide del maillot (el vocabulario, lo reservado, la señal) se mide a 13 y a 16 px (`KIT_CHECK_SIZES`); telefono ya midió su vocabulario a 13 px (0 carreras en las cuatro visiones, telefono §6.2).

**Evidencia.** O-12 (codigo O-12, cobertura O-09, uso O-06); X-19 (uso C7: doce maillots de 16 px son 280 px con el hueco y el relleno y parten en dos renglones a 320).

**Descartado.** `KIT_MIN_PX` = 16 de telefono §6.6.

**Sección.** §8, §14.

### D-22 · El maillot es un dato con historia: `team_kits`

**Decisión.** Migración de drizzle-kit `0052_equipaciones` (la `0050` es la del paso 1, D-32, y la `0051`, la de los planes solapados, D-39): tabla `team_kits` con `team_id` (`uuid`, referencia a `teams.id` con `on delete cascade`), `valid_from_day` (`integer`), `kit` (`text`, el código `figura.base.segundo`, `plain.red` en los lisos), `set_by` (enum `kit_set_by`: `system`, `manager`, `sponsor`, `moderator`), `sponsor_deal_id` (`text`, nula) y `created_at` (`timestamptz`, `now()`), con clave primaria (`team_id`, `valid_from_day`). `kitOn(tx, teamId, day)` devuelve la fila de mayor `valid_from_day` que no pase de `day`. `ensureKits(tx, worldId)` es un paso idempotente del tick tras `seedWorld` (`tick.ts` l. 265), como `backfillRosters` (l. 283): el primer tick tras el despliegue traduce el mundo (D-23) y después solo actúa con equipos nuevos y con NPC que choquen. Un maillot nuevo vale desde el día siguiente (`valid_from_day = currentDay + 1`). Ninguna columna `NOT NULL` en `teams` (O-01, X-08). `teams.jersey_seed` sigue siendo la identidad del NPC y no se vuelve a escribir. **Los contratos ganan `kit`** (I-06): `startlistTeamSchema`, `teamListItemSchema` y `teamDetailSchema` (`contracts.ts` l. 665, 692 y 718), la fila de la clasificación por equipos, `RiderCard.team` (`broadcast/wire.ts` l. 354) y `CastTeam.kit` (`cast.ts` l. 151-154), resuelto en `serveCast` con `kitOn(teamId, díaDeLaEtapa)`. `jerseySeed` sale de esos contratos en el PR 19c (H-02).

**Evidencia.** identidad §6.2; codigo C9, I-codigo-05 e I-codigo-06; cobertura I-03; X-08.

**Descartado.** `teams.kit` `jsonb` no nulo (telefono §6.3), `teams.jersey_design` (sistema §6.2) y `teams.jersey` (lectura §6.2): sin historia, el patrocinio que acaba y la reversión de E9 no tienen sitio.

**Sección.** §8.

### D-23 · La traducción del mundo de hoy, y el pasado intacto

**Decisión.** La primera pasada de `ensureKits` recorre los equipos de más a menos rivales de temporada; cada uno prueba los maillots permitidos en orden de distancia dibujada a 28 px a su aspecto de hoy (`jerseyStyle` de la semilla de dibujo, `coalesce(jersey_style_seed, jersey_seed)`) y toma el primero que queda a `KIT_MIN_DISTANCE` o más de sus rivales en las cuatro visiones y de lo reservado. Con el vocabulario de identidad, así conservan su color base 63 equipos, frente a 15 con un sorteo (identidad `exp8_continuidad.py`); con el de D-20, `kits.test.ts` lo mide y lo escribe. Los equipos que nacen después (génesis y `seedWorld`) toman el maillot libre más lejano de sus rivales. **El pasado no se repinta** (O-21): lo grabado antes del paso 16 se dibuja con `legacyJerseyStyle(seed)`, el `jerseyStyle` de hoy congelado (`visuals.ts` l. 71-83), con la semilla que guardó el reparto (`cast.ts` l. 146-154). Cada equipo cuyo maillot cambia recibe una noticia: `Mistral Racing has a new kit` (pantalla). Si el dueño no quiere el cambio, DD-07.

**Evidencia.** I-15 (identidad §6.1; sistema §6.2); O-21; docs/retransmision.md l. 4868.

**Descartado.** Repintar «también en las etapas grabadas» (telefono §15, decisión 7).

**Sección.** §8.

### D-24 · La distancia, la tabla de choques y los rivales de temporada

**Decisión.** (1) **`kitDistance(a, b, size)`**: la media por píxel de ΔE00 entre los dos maillots rasterizados al mismo tamaño, el método del mapa 03 portado a TypeScript desde `mapas/03-maillots-medida.py` (supermuestreo por píxel de las regiones del `viewBox` de 48 u, mezcla en sRGB codificado como compone el navegador, Machado 2009 con severidad 1 en RGB lineal y CIEDE2000 en CIELAB D65 de `colorMath.ts`, I-31), el mínimo de las cuatro visiones; los grises se informan. Un test compara 50 pares fijos con el script de Python a 0,5 o menos. (2) **La tabla de choques** (I-07): `packages/db/src/kitConflicts.generated.ts` guarda, para cada maillot permitido, los maillots y las señales reservadas que le quedan a menos de `KIT_MIN_DISTANCE` a 13 o a 16 px; la genera `packages/db/scripts/kit-conflicts.ts` y lleva la huella de la geometría de `kit.ts`, así que una figura retocada sin regenerar hace caer el test; `checkKit` la consulta y nunca rasteriza en una petición. (3) **Los rivales de temporada** (H-01; **sin evidencia de los jueces**): `seasonRivals(tx, worldId, season)` construye, sin correr carreras, el campo de cada carrera de la temporada con la misma selección determinista que usa el tick (`calendarRun.ts` l. 400-455: `selectFieldTeams` con sus plazas y la rotación por temporada, y `ownedTeamAttendance` con `team_race_plan`), extraída a una función pura `fieldTeamsFor`; dos equipos son rivales si comparten al menos una carrera. Se calcula al pedir y no se guarda; su coste no está medido y el paso 16 lo mide en PGlite. (4) Si un mánager añade una carrera y su maillot choca con un NPC nuevo, el NPC cede esa noche (DD-08); dos humanos que chocan no se fuerzan, y el banco nocturno los cuenta.

**Evidencia.** identidad §6.2; sistema §3.5 y §6.3; codigo H-01 e I-07; mapa 03 §3; `calendarRun.ts` l. 400-455, leído por el arquitecto (la selección del campo es determinista por carrera y temporada).

**Descartado.** Validar por ámbito (división y continente, lectura §6.2): no separa a quien coincide fuera de él (codigo, fila 16; cobertura, fila 5).

**Sección.** §8.

### D-25 · El editor

**Decisión.** `/team/identity`, a 360 px: el maillot a 72 px (`data-answer`) y, al lado, a 13 y a 16 px sobre `surface` y sobre `navy-dark`, junto a sus ocho rivales más frecuentes y a las señales reservadas; las seis figuras en losetas de 72 con su nombre (`Plain`, `Chest band`, `Hoops`, `Halves`, `Yoke`, `Sides`, pantalla); los colores en muestras de 44 con su nombre, tachadas con su porqué las que chocarían (`Too close to the yellow jersey`, pantalla); el veredicto del servidor, `POST /api/teams/me/kit/check` a los 300 ms del último toque, con equipo y visión (I-25: `Too close to Mistral Racing for colour-blind viewers (deuteranopia). Try another colour or figure.`, pantalla); y `Save kit` en la `ActionBar`. `PUT /api/teams/me/kit` con cuerpo `{ kit }` y `kitSchema` `.strict()` (un objeto sin anidados, así que `.strict()` basta), y estos códigos: 400 `kit_igual`, 400 `kit_contraste`, 409 `kit_reservado`, 409 `kit_se_confunde`, 429 `kit_reciente` (`KIT_CHANGE_COOLDOWN_DAYS`, DD-09; el primer cambio tras tomar el equipo, libre). Vale desde el día siguiente. `PUT /api/teams/me` deja de aceptar `jerseySeed` en el PR 18a (`routes/teams.ts` l. 23; `teamControl.ts` l. 182-186) y las doce candidatas desaparecen (`TeamManager.tsx` l. 21-26). **Para E9**: la historia de `team_kits`, `revertKit(tx, teamId, reason)` con `set_by` `moderator` y `POST /api/admin/teams/:id/kit/revert`; el flujo de denuncia es de E9.

**Evidencia.** telefono §6.3; identidad §6.3; sistema §6.3; I-25; O-19.

**Sección.** §8.

### D-26 · La señal de campeón: la banda de honor (el defecto de DD-03)

**Decisión.** El dibujo de identidad §6.5 (I-12), recortado por `TORSO` y con filete `rgba(0,0,0,0.35)` de 1,5 u: `SASH_PATH` = `M13.76 6.71 L41.76 38.71 L34.24 45.29 L6.24 13.29 Z`, una banda de 10 u del hombro izquierdo a la cadera derecha. **Mundial**: campo `#14213d` (`CHAMPION_NIGHT`), banda y cuello `#e0a526` (`CHAMPION_GOLD`), sin bandera. **Nacional**: campo `#f6f3ea` (`CHAMPION_PAPER`); la banda partida en tres franjas paralelas de 10/3 u (`SASH_STRIPES`) con los colores de su bandera (`NATIONAL_SASH`, generado y revisado, con `NATIONAL_SASH_OVERRIDES` para los errores conocidos como Corea); filo `#14213d` de 2,4 u (`NATIONAL_SASH_EDGE_U`); cuello del color de la primera franja; y la bandera al lado, como hoy (`Jersey.tsx` l. 165), porque 26 países salen con una banda de un color con blanco en medio. **Continental** (E12): banda `#c0c7d2` (`CHAMPION_SILVER`) sobre noche, provisional. Ruta y crono, élite y sub-23 comparten dibujo y los separa el texto (`championTitleText`: `Time trial champion of Italy`, `U23 champion of Italy`, pantalla), porque `wearableTitles` solo deja llevar los de la disciplina y la categoría del día (`jerseys.ts` l. 270-275; cobertura C1; X-17). **Reservada**: ningún maillot de equipo, de líder ni de patrocinador lleva diagonal. **Medido por el juez de cobertura** (X-16) a 13 px: la mundial a 45,7 de la marca de la UCI (37,6 en grises), la nacional de Italia a 22,6 (15,7) y la de España a 26,0 (18,1); frente al vocabulario de identidad, la mundial a 24,5 en visión normal y 15,8 en grises (identidad). Frente al vocabulario de D-20 está sin medir: lo mide `champion.test.ts` (las 134 señales a 10 o más de todo maillot permitido y de los líderes, en las cinco vistas, a 13 y a 16 px). **La 7-h de E2** (H-09): con el filo de 2,4 u, a densidad 2 las 133 nacionales quedan a 14,0 o más de todo maillot y a 14,2 de los líderes en las cinco vistas (identidad `exp5b_nacional.py`); a densidad 1, frente a los líderes, lo mide `champion.test.ts`.

**Evidencia.** identidad §6.5; cobertura C1, C7 e I-01; uso, gusto; O-14; X-16, X-17.

**Descartado.** La estrella dorada sobre marino de sistema (S1, el defecto del juez de código): a 50,3 de la marca y más barata, pero a 13 px su estrella es una mancha de 4,9 × 4,7 px (identidad §6.5, candidata F) y todos los campeones nacionales visten igual; va a la página como alternativa B. La estrella sobre blanco de telefono y lectura: a 15,1 de la marca y 9,2 en grises a 13 px, el «blanco con algo en el pecho» (O-14); va como alternativa D.

**Sección.** §9.

### D-27 · La palabra del dueño, variante a variante

**Decisión.** §9 juzga cada variante de `00-encargo.md` §7.1 con sus cuatro criterios (la distancia a la marca de la UCI con los hechos de §7.1, la forma a 16, 28 y 72 px, el daltonismo medido y la reserva), con las cifras de las propuestas y del mapa 03, sin medir de nuevo: **otros colores** (cinco bandas de 2 u sobre blanco): 9,4 de la marca y 1,4 en grises a 16 px (telefono), 8,7 y 1,5 a 13 px (identidad V4), bandas de 0,67 px a 16; fuera, es la estructura de la marca. **Otro orden**: 14,1 y 5,3 (telefono), 14,9 y 5,3 (identidad V1); la guía de la UCI fija el orden (`No other order will be approved`) y el público no lo nota (inrng, 2011); fuera. **En vertical o en diagonal**: 22,5 y 14,7 (telefono), 14,4 y 8,4 (identidad V2 y V3); la guía regula las dos disposiciones; fuera. **Otro fondo en lugar del blanco**: sobre navy, 40,7 y 39,5 de la marca pero choca con 4 maillots en protanopía y 5 en deuteranopía (telefono); sobre oro, 22,7 y 12,5 y a 17,9 del amarillo; los colores de la UCI en su orden siguen siendo la marca registrada (identidad V5 y V6; sistema D3); fuera. **La más fuerte del dueño** (I-13), que cambia colores, orden, disposición y fondo a la vez: el espectro continuo de siete paradas a lo largo de la diagonal reservada, sobre noche (identidad C): 48,7 de la marca y 38,2 en grises; el maillot más cercano a 24,9, 20,8 y 14,1, ninguno por debajo de 10; pasa los cuatro criterios y va como alternativa C de DD-03, con su coste escrito: evoca «el arcoíris del campeón del mundo» que SPEC.md l. 874 prohíbe imitar, así que elegirla pide reescribir esa línea como «las cinco bandas de la UCI» y verificar ante la EUIPO y la USPTO. **La C de telefono** (tres franjas de 7 u navy, cian y oro sobre blanco, 23,0 de la marca) se presenta como señal propia con bandas y no como la variante más fuerte del dueño, porque conserva el blanco y la horizontal, los dos rasgos que él ofreció cambiar; se descarta por su medida (el «blanco con franjas en el pecho» de la estructura de la marca a 13 px), no por el SPEC (O-15). Las señales propias que no dependen de bandas (`00-encargo.md` §7.1, punto 2): la banda de honor (el defecto), las dos estrellas y el galón.

**Evidencia.** telefono §6.4; identidad §6.5; sistema §15.3; lectura §15.3; mapa 03 §7.2 y §7.3; I-13; O-15.

**Sección.** §9, §19.

### D-28 · Los líderes

**Decisión.** Los tres que nombró el dueño ([DUEÑO 1]), con sus colores, y las marcas de telefono §6.5: general `#facc15` liso; puntos `#16a34a` con banda **blanca** de 10 u (hoy `#bbf7d0` de 7 u, a 2,72:1 de su base); montaña `#2563eb` con cinco lunares blancos de 4 u de radio (hoy 3,4). Entre sí no bajan de 18,8 en las cuatro visiones ni de 13,3 en grises (telefono). Sus figuras quedan reservadas por distancia (D-20): la banda del verde es también una figura de equipo (`band`), así que lo que se reserva es quedar a menos de 10 de él. `leaderJerseys.test.tsx` se re-sella con la banda de 10 u y los lunares de 4.

**Evidencia.** telefono §6.5; mapa 03 §4.1; cobertura, tabla, fila 10.

**Descartado.** El verde `#15803d` y el azul `#1d4ed8` de sistema §6.5, que oscurecen sin decirlo los colores que nombró el dueño (cobertura); la banda de 7 u en `#bbf7d0` de identidad §6.4, que a 13 px mide 1,9 px y contrasta 2,72:1.

**Sección.** §9.

### D-29 · El dorsal del equipo líder

**Decisión.** No vuelve como dibujo ([DUEÑO 5]: el dueño lo mandó quitar porque en su teléfono se leía «Ill»; DD-06). La clasificación por equipos pinta el maillot de cada equipo a 16 px delante del nombre (hoy una bandera, `TeamClassTable.tsx` l. 35; identidad §6.4), y en la de la etapa, donde la fila 1 es el ganador del día y no el líder (X-14), el equipo de `leaders.team` (`jerseys.ts` l. 128-130) lleva el `Chip` `Leads overall` (pantalla). `leaderJerseys.test.tsx` l. 81-88 sigue sellando la ausencia, y `stageTables.test.tsx` sigue pasando con el maillot en cada fila (codigo C10; X-13). Los documentos que lo dan por pintado se corrigen en el paso 24 (D-58).

**Evidencia.** telefono §6.5; identidad §6.4; cobertura C4; codigo C10; mapa 04, contradicción 1.

**Descartado.** `Leader` de identidad: en la tabla de la etapa se confunde con el líder del día.

**Sección.** §9.

### D-30 · Lo que compra el patrocinador (para E8)

**Decisión.** Dos cosas, dentro del vocabulario (O-24). (1) **Un color**, de base o de segundo, de los doce: su marca va al más cercano en ΔE00 y el maillot que resulta tiene que pasar `checkKit`; si no pasa, la pantalla de E8 ofrece el más cercano que pasa. (2) **Su nombre** en la zona del pecho (la banda o la zona del segundo color), solo desde `KIT_SPONSOR_TEXT_MIN_PX` = 72 px (X-24; **sin evidencia de los jueces**, por cálculo): la letra mínima de 12 px vale también en SVG, y a 72 px una unidad mide 1,5 px, así que una letra de 8 u mide 12 px y cabe en la banda de pecho de 10 u; a menos tamaño, el nombre va en `aria-label` y en `<title>`. El nombre sale de una lista cerrada de patrocinadores generados (DD-19), nunca texto libre, y hace de «logotipo» en la mecánica del dueño (`docs/encargos.md` l. 463-465). Nadie compra una figura, un color reservado ni la diagonal. La fila de `team_kits` lleva `set_by` `sponsor` y `sponsor_deal_id`, y al acabar el contrato vuelve el maillot anterior. E3 da `KitZone`, `SponsorOffer` y `applySponsor(kit, offer)` en `packages/shared/src/kit.ts` y la validación en `packages/db`; precios, exclusividad por categoría (`docs/epics.md` G2.8) y lo que pierde el equipo son de E8.

**Evidencia.** telefono §6.6; identidad §6.6; I-14; O-24; X-24.

**Descartado.** El nombre desde 40 px (telefono), 64 (identidad) o 28 (sistema y lectura): dibujarían letras de 3,5 a 9 px; comprar la figura (identidad §6.6), que el dueño no nombra.

**Sección.** §9.

### D-31 · `WornJerseyIcon`

**Decisión.** `WornJerseyIcon({ worn, team, size, surface })`: la firma de E2 (`docs/retransmision.md` l. 5210) más `size` (`KitSize`) y `surface` (`'light'` por defecto, o `'dark'`), con `team: { name: string; kit: KitCode } | null`, en lugar del `{ card, size }` de hoy (`WornJerseyIcon.tsx` l. 12-18; X-25). Sigue siendo el único sitio que elige dibujo y texto por `WornJersey`: líder, `LeaderJersey` con `JERSEY_LABEL`; campeón, `ChampionSash` con `championTitleText`; equipo, `Kit` con `aria-label` `Mistral Racing kit` (hoy `Team jersey` en todos, `Jersey.tsx` l. 25); sin equipo, el hueco (l. 28-29). Con `surface="dark"` el filete del maillot pasa a `rgba(255,255,255,0.6)` (I-24; 6,55:1 sobre noche): sin él, el `navy` `#172a5b` sobre `navy-dark` queda a 6,9 en visión normal, 3,8 en tritanopía y 2,3 en grises (uso, `oscuro.py`).

**Evidencia.** telefono §6.6; sistema §6.6; lectura §6.6; identidad §6.7; I-24; X-25.

**Descartado.** `{ card, size, surface }` de identidad y corregir la firma de E2.

**Sección.** §9.

### D-32 · El clon: el primer PR del plan

**Decisión.** El paso 1, independiente de todo y pequeño (H-21; **sin evidencia de los jueces** en su diseño). (1) Migración de drizzle-kit `0050_semilla_del_dibujo`: `teams.jersey_style_seed` `text`, nula. (2) `updateOwnedTeam` escribe la semilla elegida en `jersey_style_seed` y nunca en `jersey_seed` (`teamControl.ts` l. 182-186). (3) Todo lo que dibuja lee `coalesce(jersey_style_seed, jersey_seed)` y lo sirve con el nombre de hoy, `jerseySeed`: los tres contratos de equipo (`contracts.ts` l. 665, 692 y 718), el reparto (`cast.ts` l. 146-154) y el rótulo (`broadcast/wire.ts` l. 354); ningún contrato cambia y la web tampoco. (4) `teamIndexFromSeed` (`world.ts` l. 542-545) devuelve `null` para una semilla que no es de la génesis, y `reconcileTeams` ni poda ni renombra esos equipos (hoy l. 574, 594 y 598 les darían el índice 0 de su división, con su país, si pierden el dueño). (5) Una consulta de solo lectura en la descripción del PR lista los equipos con dueño y semilla cambiada y los NPC creados después de la génesis en su misma división: los clones que ya haya en producción. Qué se hace con ellos lo decide el dueño (DD-17); por defecto se quedan. Tests primero, en `packages/db/src/jerseyClone.test.ts` (PGlite): la reproducción del mapa 03 §2.2 (dueño, candidata 3, un tick: siguen 219 equipos y 3.900 corredores, y el dibujo es el elegido) y el equipo con la semilla cambiada que pierde su dueño. `jersey_style_seed` muere en el PR 19c (`0053_sin_semilla_del_dibujo`), junto con el campo `jerseySeed` de los contratos que la leen, cuando la traducción de D-23 ya ha corrido en producción.

**Evidencia.** mapa 03 §2.2 (medido: de 219 equipos y 3.900 corredores a 220 y 3.912); `world.ts` l. 459-468 y 542-545; `teamControl.ts` l. 182-186; `routes/teams.ts` l. 19-27; `01-fase-propuestas.md`, cambio 3.

**Sección.** §8, §17, §19.

---

## F. El examen práctico

### D-33 · Lo que E3 arregla debajo, y lo que deja

**Decisión.** E3 arregla en `apps/api`, `packages/db` y `packages/shared`, sin cambiar la conducta del motor y sin subir `ENGINE_VERSION`: una llegada por carrera (D-34); una vista previa que proyecta el plan vivo con la carga de carrera, el viaje, el primer día, el modo, las órdenes y el plan de equipo (D-35, D-36); una sola función de precedencia para el tick y la pantalla (D-38); un solo plan vivo (D-39); el TSS fuera de la pantalla y de la API (D-41); y la portada que habla del plan (D-43). Lo único que toca `packages/engine/` es una constante que el motor no lee (D-37). **Deja escrito en §11, para su línea**: que el entrenador no mire el calendario (`daysToNextRace: null`, `train.ts` l. 256), que es conducta del tick y cambia lo que se entrena; los cortes y las palabras de `arrivalLabel` (`projection.ts` l. 75-81; DD-10); `sinRitmo`, el rango de ganancia y el objetivo D1 (`docs/entrenamiento.md` l. 1119-1148); el `0 race days` de `getBlockReport` (la decisión 24 del dueño de E2, `docs/retransmision.md` §20.2); y la pantalla de órdenes ([DUEÑO 18], H-08), que E3 pasa al catálogo y cuyo «qué pesa cada orden» es de la línea de táctica.

**Evidencia.** mapa 02 §1 a §6; `01-fase-propuestas.md`, cambio 1; los cuatro §7.

**Sección.** §11.

### D-34 · Una llegada por carrera, la de su salida

**Decisión.** `POST /api/riders/me/plan/preview` devuelve `races[]` de `PlanPreviewRace` (`raceKey`, `raceId`, `name`, `country`, `raceClass`, `stageCount`, `startDay`, `endDay`, `ongoing`, `arrival`, `travelOut`, `travelBack`) y `days[]` de `PlanPreviewDay` (`gameDay`, `kind`, `source`, `session`, `intensity`, `load`, `raceKey`), cada objeto `.strict()`, sin `tsb`, `ctl`, `atl`, `tss` ni `totalTss`. `arrival` es el código del amanecer de la primera etapa en el horizonte, la única llegada de fiar (mapa 02 §3); una carrera en curso trae `ongoing: true` y `arrival: null` y se pinta `Racing now · stage 3 of 5` (pantalla), sin escala. `getRiderRaceDays` devuelve objetos con la carrera, como ya hace `getRiderTravelDays` (`riderSchedule.ts` l. 37-70 y 175-226); `raceId` deja de ir a `null` (`riders.ts` l. 477).

**Evidencia.** telefono §7.2; lectura §7.5 (el esquema); sistema §7.1, punto 3; mapa 02 §3 y §5.

**Sección.** §10, §11.

### D-35 · La vista previa proyecta el plan vivo

**Decisión.** (I-08, O-10, X-05.) El cuerpo de la vista previa gana `edits` (las órdenes del día sin guardar) junto a los bloques; la vista previa lee el modo, las órdenes guardadas y el plan de equipo (en `mixto`) e indexa las semanas por el `startDay` del plan vivo, no desde mañana (hoy `riders.ts` l. 453 frente a `train.ts` l. 216). `PUT /api/riders/me/plan` conserva el `startDay` del plan vivo (hoy fuerza mañana, l. 413) y, con `startFresh: true` (el botón `Start a new plan tomorrow`, pantalla), empieza uno nuevo mañana. Tras el plan vivo, `After your plan · Days 79 to 83 · Coach` (pantalla). En `entrenador`, la vista previa llama a `coachPlan` cada día con el TSB proyectado y la salud y la tensión de hoy (lectura §7.5, punto 2).

**Evidencia.** lectura §1.5 y §7.5; codigo C5; cobertura C2; uso C8.

**Descartado.** «En modo entrenador no hay pronóstico» (sistema §7.1) y «semanas `base`» (telefono §7.4): `coachPlan` ya está en `packages/shared` y da lo que hará el tick con sus frenos.

**Sección.** §10, §11.

### D-36 · La carga de un día de carrera, el viaje y el primer día

**Decisión.** (X-06, H-20.) La carga de un día de carrera es la mediana de los últimos `PREVIEW_RACE_DAY_SAMPLE` = 10 días de carrera del corredor en `rider_daily_log`; si no tiene, la mediana de los días de carrera del mundo en los últimos `PREVIEW_WORLD_WINDOW_DAYS` = 28; si tampoco hay, `PREVIEW_RACE_DAY_TSS` = 150 (estimado; una etapa medida cargó 252,8, mapa 02 §3). La curva se compone día a día con `applyDailyLoad`, que el motor ya exporta (`packages/engine/src/index.ts` l. 365) y `packages/db` ya usa (`stageRun.ts` l. 13), y no con `projectLoad`, que solo acepta sesiones del catálogo (`projection.ts` l. 40-48; codigo C8). Los días de viaje cuentan 15 TSS (`viaje`, `train.ts` l. 200-203; `shared/training.ts` l. 153), con `getRiderTravelDays`. El primer día parte del TSB del último diario, no de 0 (`riders.ts` l. 475-476). **Sin evidencia de los jueces**: un test sobre el mundo de los bancos compara la llegada proyectada a la salida de cada carrera con la que sale del diario real, escribe el acuerdo y fija un trinquete en el valor medido.

**Evidencia.** telefono §7.2; lectura §7.5; identidad §7; codigo C8; mapa 02 §3.

**Sección.** §11, §16.

### D-37 · `PREVIEW_RACE_DAY_TSS` vive en el motor

**Decisión.** (O-09, aceptada entera.) `PREVIEW_RACE_DAY_TSS`, `PREVIEW_RACE_DAY_SAMPLE` y `PREVIEW_WORLD_WINDOW_DAYS` van en `packages/engine/src/constants.ts` con su comentario de intención y su línea en `docs/balance.md` (`Claude.md`: «toda constante de juego vive en packages/engine/src/constants.ts»), sin subir `ENGINE_VERSION`, porque el motor no las lee. El PR que las añade corre los ocho tramos de bancos, que el CI lanza cuando el diff toca `packages/engine/` (`.github/workflows/ci.yml` l. 189; unos 73 minutos, `docs/retransmision.md` §17.1, regla 4).

**Evidencia.** O-09 (codigo); `Claude.md`.

**Descartado.** `packages/shared/src/training.ts` (telefono §11).

**Sección.** §11, §15.

### D-38 · La precedencia, una sola función

**Decisión.** `resolveTrainingDay(ctx: TrainingDayContext): ResolvedTrainingDay`, pura, en `packages/shared/src/trainingDay.ts`: la cadena de `train.ts` l. 195-272 escrita una vez (carrera, viaje, modo `entrenador`, orden, bloque, plan de equipo solo en `mixto`, entrenador y el hueco de `manual`). El tick la llama sin cambiar de conducta: un test diferencial compara día a día, durante 28 días, lo que elige con lo que elegía en dos mundos (el de los bancos y el de la prueba del teléfono), y si cambia una sola elección el PR no entra. `GET /api/riders/me/orders` gana `days[]` (28 días) con `gameDay`, `session`, `intensity`, `source`, `block` y `raceKey`. La web borra `defaultCoachPlan` (`trainingPlan.ts` l. 37), que coincide con el bloque en 88 de 350 casos (mapa 02 §1). Los códigos de `source` van en castellano, como el resto del contrato del entrenamiento (`carrera`, `viaje`, `orden`, `bloque`, `equipo`, `entrenador`, `descanso`); la pantalla, en inglés (§G.12).

**Evidencia.** telefono §7.4; sistema §7.1, punto 2; lectura §7.5, punto 1; mapa 02 §2 y §5.

**Descartado.** Los códigos en inglés de telefono (`race`, `edit`…) y de lectura (`order`, `empty`…): el contrato ya habla en castellano (`fundido`, `mixto`, `descanso_activo`).

**Sección.** §11.

### D-39 · Un solo plan vivo

**Decisión.** (H-04.) `PUT /api/riders/me/plan` borra en la misma transacción todo plan del corredor cuya ventana de 28 días pise la nueva; `getPlanForDay` (`db/training.ts` l. 233-261, hoy `.limit(1)` sin orden) y el tick (`train.ts` l. 136-140, hoy la última fila de un `Map`) toman el de `start_day` mayor. Una migración de datos de drizzle-kit (`generate --custom`), la `0051_un_plan_vivo`, borra los solapes que ya hay y conserva el de `start_day` mayor, el que leerá la regla nueva. Caso nuevo en `planPorBloques.test.ts`: guardar el día 100 y el 110 deja una sola fila, leída igual por la pantalla y por el tick. Consecuencia, escrita en §11: un corredor con planes solapados en producción pasa a entrenar desde ese día el más reciente (hoy el orden no lo fija el SQL, mapa 02 §2).

**Evidencia.** telefono §7.4; sistema §7.1, punto 1; lectura §7.5, punto 3; mapa 02 §2 (medido con `planes.mjs`); codigo H-04.

**Sección.** §11.

### D-40 · La pantalla del cuadro

**Decisión.** La de telefono §7.1 a 360 px, con las piezas de lectura, en cuatro capas y solo con componentes del catálogo. (1) `PageHeader` `Training` con la línea de estado (I-32): `Mixed · your plan runs Day 51 to Day 78` (pantalla). (2) `Panel` `How you'll arrive` (`data-answer`): una tarjeta por carrera (nombre, salida `Day 52 · in 2 days`, etapas y viaje) con su `Scale5`; tres a la vista y el resto tras `Show all 5 races`; debajo, `Only the start is forecast: later stages depend on how you race them.` (pantalla). (3) `Panel` `Your month`: `Segmented` con los modos de hoy (`Coach decides`, `Mixed`, `I decide`, `PlanLadder.tsx` l. 50-54); la línea de la precedencia del modo; las semanas del plan vivo con sus días (`Week 1 · Days 51 to 57`) y su bloque; bajo cada semana, la tira de siete días (I-28: una palabra por celda, `Race`, `Out`, `Back`, y el entrenamiento con su `Meter` de cuatro segmentos de 8 px; no se pulsa) y su resumen (`1 training day`, pantalla). (4) `Panel` `Edit day by day`, plegado con `Disclosure` (`Show the 28 days`, [DUEÑO 11]): los viajes en `TripRow`, cada día con su origen en un borde izquierdo de 4 px y un `Chip`; un día `Your edit` lleva `↺ Back to Build` (I-27), que borra la orden; en `entrenador`, los días en solo lectura con `Notice` `Coach mode: nothing you set here is used. Switch to Mixed to edit.` (pantalla); en `manual`, los huecos dicen `Rest (I decide)`. (5) Un solo guardado para bloques y días (lectura, decisión 7): la `ActionBar` con su consecuencia, `Race Var: Fine (was Loaded)` (pantalla), y `Save plan`; por debajo llama a `PUT /plan` y luego a `PUT /orders` y da un solo resultado. Medido en el prototipo de telefono (uso C1): la respuesta a 152 px y la acción a 687 de 800; los cuatro enlaces de nombre de 20 px de alto no se repiten (D-16).

**Evidencia.** telefono §7.1 a §7.4; lectura §7.2 a §7.4; uso C1 a C3; I-27, I-28, I-32; X-18.

**Sección.** §10.

### D-41 · La carga en palabras, y el TSS fuera

**Decisión.** (DD-11.) La carga de una sesión se dice en cinco palabras, `Rest`, `Easy`, `Steady`, `Hard` y `Very hard`, con los cortes `LOAD_STEPS_TSS` = 0, 25, 80 y 110 sobre el catálogo (`shared/training.ts` l. 53-154; lectura §11); §10 escribe la tabla de qué sesión cae en qué palabra. La carga del mes va en `Meter` (`Load this month: hard`, pantalla). `1300 TSS over four weeks` (`PlanLadder.tsx` l. 233) y `105 TSS` (`Training.tsx` l. 279-281) desaparecen, y el TSS deja la API (D-55). La vista previa manda `load` de 0 a 4, nunca TSS.

**Evidencia.** telefono §7.4; lectura §4.2 y decisión 8; [DUEÑO 8]; SPEC §14 («estrellas y cerillos deben bastar»).

**Sección.** §10.

### D-42 · La escala de cinco tramos

**Decisión.** (O-32, X-20.) `Scale5`: cinco tramos iguales de 36 px de alto en el ancho del panel, en este orden por TSB, de cansado a fresco: `Cooked`, `Loaded`, `Fine`, `Spot on`, `Rusty`. Los inactivos en `surface-2` con borde `line-strong` y `caption` `ink-2`; el activo, relleno de su `arrival-*` con `caption` 700 en blanco; los ejes `◀ Too tired` y `Too fresh ▶` (pantalla). Debajo, la instrucción fija del tramo (la tabla de telefono §7.3, entera en §10). Marca el tramo, no un punto dentro de él: un punto pediría el TSB, que no cruza (mapa 04, tensión 23). Sin dato, ningún tramo encendido y `Not enough data yet` (pantalla). Las palabras y los cortes de hoy se quedan (DD-10).

**Evidencia.** telefono §4 y §7.3; uso C5 (contrastes de 5,02 a 6,57 reproducidos); X-20; O-32.

**Descartado.** La instrucción que nombra la semana del prototipo (`Make week 1 lighter to arrive Fine.`): pediría una regla y un campo de la API que nadie ha diseñado. Los cinco tramos pintados de sistema, con `Best` bajo `Fine` en su maqueta (uso C2). La escala invertida de identidad (`Rusty` a la izquierda).

**Sección.** §10.

### D-43 · El viaje y la portada

**Decisión.** (I-20, I-34, O-22.) El viaje es un bloque, `TripRow`: `Trip to Race Sardegna (IT) · Days 55 to 61 · 7 days off training` (pantalla), que agrupa ida, etapas, descansos (editables) y vuelta. `On your programme` (`MyRaces.tsx` l. 96-182) gana la línea del viaje con el icono `travel`: `Day 51 out, Day 53 back · paid 48` (pantalla). La portada dice `You travel to Race Var tomorrow` y `Your plan ends on Day 78` con `Plan the next weeks` (pantalla), y `Your training queue is empty` (`dashboard.ts` l. 82) deja de salir a quien tiene sus bloques (l. 77-91). Una numeración, `Day N` (fuera `GD`, `MyRaces.tsx` l. 205 y 230), con `in N days` a siete o menos. Un icono de viaje en lugar de los dos `✈` (`Training.tsx` l. 227, `TeamCalendar.tsx` l. 94). El porqué del viaje caro, en un `InfoButton` y no en un `title` (`TeamCalendar.tsx` l. 89-96).

**Evidencia.** telefono §7.5; lectura §7.6 y §7.5, punto 4; mapa 02 §6; mapa 05 §3 y §4.

**Sección.** §11.

### D-44 · La frescura y la moral, sin cifra

**Decisión.** La frescura en `Meter` con su palabra (`conditionLabel`, `condition.ts` l. 48-55), sin `16 / 100` (`Home.tsx` l. 354; MVP l. 114; mapa 04, contradicción 3). La moral, según DD-12: por defecto en medias estrellas (`StarRating`), lo que pide SPEC §3.3 l. 85 («en estrellas o iconos»), en lugar del porcentaje de hoy (`RiderProfile.tsx` l. 273, `Home.tsx` l. 307).

**Evidencia.** O-20; sistema §4 (las escalas); mapa 02 §8.

**Sección.** §13, §19.

---

## G. La web instalable

### D-45 · El manifiesto, los iconos y las metas

**Decisión.** `apps/web/public/manifest.webmanifest`, con los valores de telefono §8.1: `id` `"/"`, `start_url` `"/?source=pwa"`, `scope` `"/"`, `name` y `short_name` `"Cycling Star"`, `description` `"A cycling manager you play from your phone between race days."` (pantalla), `display` `"standalone"`, `display_override` `["standalone", "minimal-ui"]`, `theme_color` `"#123a5c"`, `background_color` `"#eef2f6"`, `lang` `"en"`, `dir` `"ltr"`, `categories` `["games", "sports"]`, `icons` de 192 y 512 `any` y de 512 `maskable` con el dibujo en el 70 % central, y `shortcuts` `Training` (`/me/training?source=pwa-shortcut`) y `Races` (`/world/races`) con icono de 96. En `index.html`: el enlace al manifiesto, `theme-color`, `apple-touch-icon` de 180, `apple-mobile-web-app-title` y `viewport-fit=cover`; `apple-mobile-web-app-status-bar-style` es `default` (O-02, X-10), y la cabecera reserva `env(safe-area-inset-top)` en el paso 11. Los iconos salen del logotipo (`Logo.tsx`), recoloreado en `navy` y `gold` y revisado a 16, 48 y 180 px: el logotipo no tiene dueño (mapa 04, contradicción 12) y E3 recolorea, no redibuja.

**Evidencia.** telefono §8.1; codigo C12; mapa 05 §14.

**Descartado.** `black-translucent` (telefono §8.1).

**Sección.** §12.

### D-46 · El service worker

**Decisión.** (I-11, O-13.) Escrito a mano, sin Workbox: `apps/web/sw/sw.js` (unas 120 líneas, estimado) con la decisión de cada petición en una función pura, `decide(request)`, en `apps/web/sw/decide.js`, que se prueba sola. Un plugin de Vite escribe `dist/sw.js` con la lista de precarga sacada de `dist/.vite/manifest.json` (`vite.config.ts` l. 11): `index.html`, la entrada, su CSS, los trozos de los cinco destinos de la `BottomNav`, el manifiesto, los iconos y el sprite de banderas (unos 220 KB con gzip, estimado por sistema; tope `PRECACHE_MAX_GZ` = 250 KB); con `Save-Data`, solo la cáscara. `/assets/*`, primero la caché (llevan huella y la API ya los sirve un año inmutables, `app.ts` l. 125-144). La navegación, primero la red, con `NAV_TIMEOUT_MS` = 3.000 y la cáscara guardada si no contesta (medido por telefono en caliente: la cáscara de la caché retrasa `Watch`, primera pintura 1,47 s y lista 3,24 frente a 1,20 y 1,67, porque pierde las precargas del HTML de etapa; primero la red, 1,08 y 1,50). **Nunca** intercepta `/api/*`, `/health` ni `/api/auth/*`, sin `respondWith`, porque `index.html` precarga `/health` (l. 13) y el HTML de etapa precarga la API (`app.ts` l. 371), y la API de E2 responde según lo que ha visto cada jugador. Nunca persiste la caché de React Query. `/sw.js` se sirve sin caché.

**Evidencia.** telefono §8.2; sistema §8; lectura §8.2; codigo I-codigo-11 y O-codigo-13.

**Descartado.** Precargar los 80 ficheros, unos 320 KB (telefono §8.2).

**Sección.** §12.

### D-47 · Sin red

**Decisión.** (X-03, X-04, I-29.) **La sesión tiene tres estados** (`SessionState`: `signed-in`, `signed-out`, `unknown`): un fallo de red en la petición de sesión es `unknown`, `ProtectedRoute` (l. 12-13) no lleva a `/login` y la cabecera pinta la del jugador con la marca `cs:signed-in` en `localStorage`, sin nada de la cuenta. `HorizonWatcher` no se toca: solo vacía la caché si cambia una sesión ya resuelta (`cacheOwnerChanged`, `queryClient.ts` l. 165-167), y gana un test de que `unknown` no la vacía nunca. **`OfflineBanner`** (`navigator.onLine` y el `onlineManager` de React Query) bajo la cabecera: `You're offline. Showing what you saw at 14:02.` (pantalla), con la hora de `dataUpdatedAt` de la consulta principal de la página. Lo pausado pinta `OfflineState` y se rehace al volver (`refetchOnReconnect`, `queryClient.ts` l. 386); vuelve la red, `Back online` (pantalla) 2 s. Las mutaciones esperan en la `ActionBar`, en memoria: `You're offline. Your changes stay here until you reconnect.` (pantalla). Un trozo que falla pinta su `ErrorState` en su sitio, con la cabecera y la barra, no la barrera raíz que sustituye la web entera (`main.tsx` l. 22-30): `This page needs a connection the first time.` · `Try again` (pantalla).

**Evidencia.** telefono §8.3; codigo C3; cobertura C3; uso C6 y la comprobación de `HorizonWatcher`; lectura §8.3; mapa 05 §13.

**Sección.** §12.

### D-48 · La versión nueva

**Decisión.** El service worker nuevo espera y la web enseña `UpdateToast`, `A new version is ready · Reload` (pantalla), con `registration.waiting`; al tocarlo, `SKIP_WAITING` y recarga en `controllerchange`; nunca recarga sola ni con `Watch` en marcha; si nadie lo toca, entra al cerrar las pestañas. `/health` devuelve `webBuild` (la huella de `index.html`) y la web lo mira como mucho cada `UPDATE_CHECK_MIN_MS` = 1.800.000; una respuesta que no pasa su esquema pinta `This version is out of date · Reload` (pantalla).

**Evidencia.** telefono §8.4; sistema §8; identidad §8.

**Sección.** §12.

### D-49 · Las banderas en un sprite que entra por Vite

**Decisión.** (O-08, X-07.) Las 133 banderas del juego en un sprite WebP de 64 × 48 por bandera (el triple de 21 × 16), unos 47 KB (telefono), importado desde `apps/web/src/assets/flags.webp` para que Vite le ponga huella en `assets/`; sus coordenadas, en `flagSprite.generated.ts`, salen de `apps/web/scripts/flag-sprite.mjs` con test de huella. `flag-icons` sale de `main.tsx` l. 9. Medido por telefono (Slow 4G, CPU ×4, mediana de cinco): la hoja que bloquea pasa de 92,4 a 9,2 KB con gzip y la primera pintura de 3,20 a 2,93 s.

**Evidencia.** telefono §8.3; codigo C7.

**Descartado.** Los ficheros de `public/flags/` (identidad §3.3, lectura §5.3): en la raíz salen con `max-age=0` (`app.ts` l. 131-133) y cada revalidación gasta el cupo de 300 por minuto e IP (`security.ts` l. 10). Los 133 SVG en una hoja: 327 KB.

**Sección.** §12.

### D-50 · El peso y su presupuesto

**Decisión.** `apps/web/scripts/peso.test.mjs` mide tras `vite build`, con zlib de Node a nivel 9 (X-26): la hoja que bloquea, `CSS_BLOCKING_MAX_GZ` = 15 KB (hoy 94,3 con el gzip de Vite y 92,4 por la red, la misma hoja con dos compresores); el JS del arranque, `ENTRY_JS_MAX_GZ` = 160 KB (hoy unos 157: 250,9 de arranque menos 94,3 de CSS, mapa 01 §8); la precarga, `PRECACHE_MAX_GZ` = 250 KB; el sprite, `FLAG_SPRITE_MAX` = 60 KB. **Sin evidencia de los jueces** (H-03): `packages/shared` gana `"sideEffects": false` en el paso 6 solo si `peso.test.mjs` enseña que `request.js` suelta los 42 KB de `broadcast/*` y `pnpm test` sigue en verde; si no, queda anotado en §12. **Cada noche**, `rendimiento.spec.ts` con Slow 4G, CPU ×4 y la mediana de cinco: primera pintura en frío de 3,0 s o menos (hoy de 3,16 a 3,23; con el sprite, 2,93), lista en frío de 5,0 o menos (hoy de 4,7 a 5,8) y en caliente de 2,0, o 3,0 en el entrenamiento.

**Evidencia.** telefono §5.3 y §8.3; mapa 01 §8; mapa 05 §12; codigo, fila 5 (el presupuesto de 255 KB de sistema deja crecer el JS); H-03.

**Sección.** §7, §12.

### D-51 · Instalar en iPhone y en Android

**Decisión.** (DD-15.) **iPhone**, sin `beforeinstallprompt`: `InstallHint` dice `Add Cycling Star to your Home Screen: tap Share, then Add to Home Screen` (pantalla) tras la tercera sesión (`INSTALL_HINT_AFTER_SESSIONS` = 3, contadas en `localStorage`) o cuando E4 pida avisos, nunca en la primera visita; desde iOS 26 la web añadida se abre como app aunque no haya manifiesto, y los avisos siguen pidiendo que esté añadida (mapa 05 §14). Instalada no hay barra con recarga: `ErrorState` añade `Reload app` (pantalla). **Android**: la web guarda `beforeinstallprompt` y ofrece `Install app` (pantalla) en `/account` y una vez en la portada tras ver una etapa.

**Evidencia.** telefono §8.4; lectura §8.3; mapa 05 §14.

**Sección.** §12.

### D-52 · La prueba que revisa la app nativa

**Decisión.** (DD-14.) El sensor mínimo, propio y sin datos personales: `POST /api/telemetry/vitals` una vez por sesión con `device` (`phone`, `tablet` o `desktop`, por `pointer: coarse` y el ancho), `standalone`, `os`, `route`, `readyMs` e `inpMs` donde se mida; se agrega por día en `telemetry_vitals_daily`, sin IP ni cuenta. La regla (telefono §8.5): si en una semana el 50 % o más de los jugadores activos entra desde un teléfono, la app nativa se revisa cuando, cuatro semanas seguidas, el p75 de «lista» en teléfono pasa de 4 s o el de INP de 300 ms; o cuando menos del 20 % de ellos la tiene instalada tres meses después de `InstallHint`; o cuando E4 mide que en iPhone menos del 30 % de los instalados acepta avisos o que falla más del 10 %. La tarea de analítica (`docs/encargos.md` l. 741-742) no existe: esto no la sustituye.

**Evidencia.** telefono §8.5; cobertura, fila 4; mapa 04, contradicción 18.

**Sección.** §12.

---

## H. La regla de la frontera

### D-53 · La regla

**Decisión.** Se escribe así, en §13 y en la cabecera de `packages/shared/src/contracts.ts`: «Toda respuesta de la API es un subconjunto de lo que una pantalla enseña a quien la pide, en su forma de pantalla. Un número interno (un atributo con decimales, CTL, ATL, TSB, TSS, un techo, el talento, la fragilidad, la moral exacta) no cruza nunca; cruza su estrella, su tramo, su palabra, su barra de 0 a 100 o su flecha. Las excepciones van en una lista con su motivo y su PR de salida, y la lista solo encoge.»

**Evidencia.** telefono §9; lectura §9; sistema §9; `docs/encargos.md` l. 254-257.

**Sección.** §13.

### D-54 · El mecanismo

**Decisión.** Cuatro piezas (I-09, O-03, O-04, O-05). (1) **El serializador**: cada ruta del jugador declara `schema.response[200]` con su esquema de `contracts.ts`, y el serializador de `fastify-type-provider-zod` que ya monta la API (`app.ts` l. 162-163) quita lo no declarado, también anidado (medido por el juez de código, C1; X-21). El registro de E2 (`registerSpoilerGuard`, `spoiler.ts` l. 155-183) gana `response` obligatorio: el servidor no arranca si una ruta no lo declara. (2) **La resolución en el tipo**: estrellas `z.number().multipleOf(0.5).min(0).max(5)`, barras `z.number().int().min(0).max(100)`, tramos y flechas como `z.enum`: un `63.4172` no pasa el contrato. (3) **`apps/api/src/frontera.test.ts`**: falla si un campo de un esquema de respuesta se llama como un número interno (`ctl`, `atl`, `tsb`, `tss`, `ceiling`, `talent`, `fragility`) o es un `attributes` de números, y exige con el AST de TypeScript, como `noEngine.test.ts` l. 8-17, que cada campo se lea en `apps/web/src` o esté en `FRONTERA_SIN_USO` con su motivo. (4) **El canario de B1a** (`spoilerCanary.test.ts` l. 20-51) gana testigos en `rider_attrs` (63,4172), en el diario (`ctl` 61,98765) y en la moral (57,31415), y barre también las POST de lectura en una lista cerrada (hoy la vista previa), nunca todas, que ejecutarían mutaciones. **El riesgo del 500** (O-03): una respuesta que no casa con su esquema da 500 (medido con un `Date` en un `z.string()`), así que cada ruta entra con un test que serializa su respuesta real del mundo de los bancos. **Sin evidencia de los jueces**: las rutas de la retransmisión (de 0,87 a 3,8 MB, `app.ts` l. 194-196) van las últimas, tras medir cuánto añade la serialización; si pasa de 20 ms de p95 (presupuesto estimado), se quedan con la comprobación de los tests y sin la de tiempo de ejecución. **`.strict()` no es el mecanismo**: en Zod 4.4.3 solo mira la raíz (X-01). El paso son tres PR: 19a (el mecanismo con la lista de hoy), 19b (atributos y condición) y 19c (el resto y `jerseySeed`).

**Evidencia.** telefono §9; lectura §9; codigo C1, C2 y O-codigo-03 a O-codigo-05; X-01, X-21.

**Descartado.** `exposes: 'public' | 'owner'` (telefono §9, punto 4), que no comprueba nada y toca las 92 rutas y la tabla literal del registro (`spoilerRegistry.test.ts` l. 31); `data: 'public' | 'owner' | 'derived'` (identidad §9), por lo mismo; `.strict()` en los tests (sistema, identidad y lectura).

**Sección.** §13.

### D-55 · El inventario de hoy, arreglado

**Decisión.** La tabla de telefono §9 con la de lectura §9: `GET /api/riders/:id`, `attributes` con decimales → `{ stars }` en medias estrellas (`rider.ts` l. 218-240), nada más para un ajeno; `GET /api/riders/me` → `{ stars, mark }` (de 0 a 3, `AttributeList.tsx` l. 33-38) y los cerillos contados por la API (`matches`; `RiderProfile.tsx` l. 213-225 deja de calcularlos); la vista previa, sin `tsb`, `ctl`, `atl` ni `tss` (D-34); `GET /api/riders/me/form`, `log[]` → `{ gameDay, fitness, freshness }` enteros de 0 a 100 (`conditionBars` pasa al servidor, `condition.ts` l. 35-42); `GET /api/riders/me/trend`, `delta28` → `arrow` (cinco códigos); `GET /api/riders/me/summary`, la moral según DD-12; `coach-view`, fuera `facilities` y `season`, que no se pintan; `fame` fuera de las cuatro rutas, porque vale siempre 0; `plan.goalRaceId` fuera hasta que tenga control; `plan.startDay` y `upcoming-races.startGameDay` se quedan, porque ahora se pintan; las seis claves de más de `GET /api/teams/:id/news` las quita el serializador; y `jerseySeed` sale de los tres contratos de equipo y de `RiderCard.team` en el 19c (H-02).

**Evidencia.** mapa 02 §8; telefono §9; lectura §9; sistema §9.

**Sección.** §13.

---

## I. Lo que E2 dejó a E3

### D-56 · `Watch` se viste, no se rediseña

**Decisión.** (O-18, H-05, H-07, H-11, X-15.) Se quedan la disposición, el orden, los textos, el ritmo, los `aria-live` y la puerta del velo de E2. Cambia el aspecto (telefono §10 y sistema §10): la cabeza de la etapa en una fila de 44 px (`‹ Race Valencia · Stage 3 of 5 ›`, pantalla), el `h1` en `title` con la ruta y `Share to watch` como icono `share` (la televisión empieza hacia los 228 px y no a los 328, estimado por telefono); la capa fija en el ámbito oscuro, con los km en `display` blanco (15,23), la diferencia en `row` y la flecha en `gold` (6,72). **El resumen accesible de la capa fija** (H-05): el `<button>` de `FixedOverlay.tsx` (l. 38-71) gana un `aria-label` con la frase de `docs/retransmision.md` §18.8, `54.3 km to go, lead group 5 riders, bunch at 2 minutes 14` (pantalla), y su segunda línea en palabras (l. 12500), recalculado cuando cambia el km y no en cada fotograma; `aria-live` sigue en `off`: se lee al enfocarlo o tocarlo. La barra de grupos con los maillots a 13 px (D-21), el rótulo del grupo en `caption` 600 en versales (el test de SPEC §6.15 se queda) y filas de 36; el perfil, con cotas de 12 px y sus hexadecimales de v3 (`ProfileStrip.tsx` l. 63-139) en tokens; el rótulo, con los fondos de `CueCard` (`bg-red-700`, `bg-slate-900`, `bg-slate-700`, l. 36-43) en `bad`, `navy-dark` e `ink-2` y el maillot por `WornJerseyIcon` con `surface="dark"`. **El título más largo** (H-07), `U23 time trial champion of Saint Vincent and the Grenadines` (59 caracteres, [DOC 40]), tiene su caso en `CueCard.test.tsx` y su estado en `/_ui`: dos renglones a 320 y a 360 px. La previa y el cierre (`StagePreviewCards`, `StageClosingCards`), `Highlights` y el `digest` pasan al catálogo en el ámbito oscuro, con un solo `primary` por carrera (hoy Race Jaén lleva dos, captura 17). `Report` (11.502 px) abre con el resultado (20 y `Show all`) y una fila de saltos a sus partes antes de la crónica, que no se recorta. **Sin evidencia de los jueces**: la edad no entra en el rótulo (H-11, la 7-l de E2): el rótulo tiene dos renglones a 360 px y la edad no ayuda a entender la carrera en ese momento. La imagen de compartir, `og-default.png` de 1.200 × 630, en `navy` con el logotipo en `gold` y `Cycling Star`, generada (D-08). E3 propone a E6 `useHideBottomNav` (DD-13) y le da `--fixed-bottom`.

**Evidencia.** telefono §10; sistema §10; lectura §10; identidad §10; cobertura C5; docs/retransmision.md l. 12490-12500 y 5233.

**Sección.** §14.

---

## J. El plan y los documentos

### D-57 · El plan

**Decisión.** Veinticuatro pasos y unos 40 PR (estimado), en el orden de `00-glosario.md` §G.11. El **paso 1** es el arreglo del clon (D-32), independiente y pequeño. El **paso 2** pone la prueba del teléfono en rojo con su mundo, su tabla de pantallas y su línea base, sin cambiar la web. Después, lo barato que más pesa en el teléfono (pasos 3 a 6: instalable, sin red, service worker y peso), los tokens y las reglas (7 y 8), el catálogo, los estados, el marco y las tablas (9 a 12), el examen (13 a 15), los maillots (16 a 18), la frontera en tres PR (19), `Watch` (20), **la cola larga por deuda** en diez PR (21: `Race` 166, `MyRaces` 98, `TeamCalendar` 93, `AdminNames` 92, `RacesIndex` 83, `Account` 81, `RaceOrders` 75, `Home` 70, `TeamSquad` 68 y el resto; I-02), el tema cerrado (22), el sensor (23) y los documentos y el cierre (24). Cada PR escribe sus tests antes que su código, deja el juego desplegable y mejor que antes, dice lo que ve el dueño al acabarlo y con qué se revierte. Tamaños como en E2: S hasta 300 líneas de diff, M hasta 800, L más. E3 está terminado cuando `telefono-baseline.json` está a cero, `deuda.json` ha desaparecido y la prueba del dueño en su teléfono ha pasado.

**Evidencia.** telefono §13; sistema §13; lectura §13; identidad §13; codigo O-07; uso O-13.

**Sección.** §17.

### D-58 · Los documentos que E3 corrige

**Decisión.** (H-12.) En el paso 24: `docs/navegacion.md` §7.4 (l. 462-466, 492-495 y 501-504: el dorsal); `docs/retransmision.md` l. 4869, 12493, 12884, 13055 y 13440 (el dorsal), l. 5210 (la firma de `WornJerseyIcon` gana `size` y `surface`) y §18.8 (el resumen, ya escrito); `SPEC.md` §3.2 l. 74-75 y 78 (la escala de estrellas: media estrella cada diez puntos, `rider.ts` l. 218-240; mapa 04, contradicción 2); `SPEC.md` l. 852 (el fundador elige «nombre, colores y patrón»: ahora con el editor); `SPEC.md` l. 874 solo si el dueño elige la C de DD-03; `docs/entrenamiento.md` l. 1697 («todas implementadas») y l. 1093-1099 si DD-10 cambia; y `docs/balance.md`, con la línea de `PREVIEW_RACE_DAY_TSS` (en el PR 13b) y las decisiones cerradas.

**Evidencia.** cobertura H-08; mapa 04 §9.

**Sección.** §17.

### D-59 · Lo real y lo generado, los lunares y la verificación de la marca

**Decisión.** (H-14, H-10.) `Chip` `neutral` para los tres textos con que E1 ya distingue lo real de lo generado (`Real route (source cited)`, `Real towns and distance, generated terrain`, `Generated route`, `docs/balance.md` l. 17430): E3 da la forma y E12 decide dónde se usa. La verificación de la señal de campeón, de los lunares de la montaña y de los nombres ante la EUIPO y la USPTO no es un PR de E3: es la tarea que SPEC §8 (l. 874) pone antes del lanzamiento, con el dueño de responsable; §18 la deja escrita con la lista de lo que hay que verificar.

**Evidencia.** cobertura H-06 y H-10; mapa 04, contradicciones 14 y 15.

**Sección.** §4, §18.

---

## DD. Decisiones que son del dueño

Cada una con el valor por defecto, que es el que se implementa, su porqué, lo que cambia si el dueño elige otra cosa y antes de qué paso hace falta la respuesta. Las cuatro de gusto (DD-01 a DD-04) **se deciden mirando `opciones/index.html`**, la página que pinta cada alternativa lado a lado con su simulación de daltonismo y sus medidas; este fichero escribe el defecto y la página las alternativas. El documento las recoge en §19.

| #     | Qué se decide                                                                                                                                                                                                                                                                     | Por defecto (se implementa) y por qué                                                                                                                                                        | Si elige otra cosa                                                                                                                                                                                                                                                                                             | Antes del paso |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| DD-01 | **Decidida por el dueño el 21/10/2026: A** (D-00a). La paleta (gusto, `opciones/index.html`)                                                                                                                                                                                      | A, «manager sobrio» (D-03): conserva el navy, el cian y el oro del PR #105, quita las barras que fallan el contraste y devuelve 36 px por panel y 48 por página al teléfono; los tres jueces | B (las barras de hoy, lisas y accesibles), C («noche y oro», que fija la marca del juego, de D20) o D (retransmisión): cambian seis tokens del `@theme` y ningún componente; con B, vuelven 36 px por panel y 48 por página                                                                                    | 7              |
| DD-02 | **Decidida por el dueño el 21/10/2026: A** (D-00a). La tipografía (gusto, `opciones/index.html`)                                                                                                                                                                                  | A, la del sistema (D-05): 0 KB, sin salto de letra con Slow 4G y con los alfabetos de E10; los tres jueces                                                                                   | B, Inter variable (de 47,1 a 48,3 KB el latín y de 83,1 a 85 el extendido); C, la del sistema con Barlow Semi Condensed 600 en títulos y cifras (22.984 bytes): una carga desde `public/fonts/` con `swap`, un salto de letra en la primera visita y más peso en el presupuesto                                | 7              |
| DD-03 | **Decidida por el dueño el 21/10/2026** (D-00d): el nacional viste su bandera y el mundial es blanco con una estrella de arcoíris; queda abierto lo que añade el orquestador (la estrella del nacional y el espectro natural). La señal de campeón (gusto, `opciones/index.html`) | A, la banda de honor (D-26): la que más recoge de la palabra del dueño sin acercarse a la marca (45,7 la mundial a 13 px) y la única forma que sobrevive a 13 px; dos jueces de tres         | B, la estrella dorada sobre marino (50,3; la estrella, una mancha a 13 px; `Sash` vuelve al vocabulario); C, su arcoíris diferente en la diagonal (reescribir SPEC.md l. 874 y verificar la marca); D, la estrella sobre blanco (9,2 en grises a 13 px); cambian `kit.ts`, `ChampionSash` y `champion.test.ts` | 17             |
| DD-04 | **Decidida por el dueño el 21/10/2026** (D-00e): quince colores y siete figuras, sin repetir nunca. El vocabulario del maillot (gusto, `opciones/index.html`)                                                                                                                     | A, doce colores y seis figuras con la regla de contraste (D-20): la única paleta separada color a color para un daltónico, compatible con la banda y con Watch a 13 px; con su puerta medida | B, identidad A (14 colores, 443 permitidos, medido con la diagonal reservada), o C, sistema sin `sash` (10 colores, sin medir con seis figuras): cambian `KIT_COLORS` y `KIT_FIGURES` y se regenera la tabla de choques; si el dueño elige B o C con la banda, la puerta de `kits.test.ts` se aplica igual     | 16             |
| DD-05 | Un modo oscuro para todo el juego                                                                                                                                                                                                                                                 | No en E3 (D-04): duplica los estados de todos los componentes y nadie lo ha pedido (mapa 04 §2); queda el ámbito oscuro para `Watch`, la cabecera y la barra                                 | Un PR de tokens bajo `prefers-color-scheme` con la paleta C de telefono y sus parejas en `tokens.test.ts`, después del paso 22                                                                                                                                                                                 | ninguno        |
| DD-06 | El dorsal del equipo líder                                                                                                                                                                                                                                                        | No vuelve como dibujo (D-29): el dueño lo mandó quitar porque se leía «Ill»; el maillot de cada equipo en la tabla y `Leads overall` en la de la etapa                                       | Vuelve como `Chip` amarillo con su número (`#214`) donde ya se ve el dorsal, nunca como glifo; se re-sella `leaderJerseys.test.tsx` l. 81-88                                                                                                                                                                   | 17             |
| DD-07 | Traducir una vez los maillots de los 219 equipos                                                                                                                                                                                                                                  | Sí, con continuidad (D-23): es lo que compra la separación medida; el pasado conserva su aspecto con `legacyJerseyStyle` y cada equipo recibe una noticia                                    | Sin traducir, los gemelos siguen (303 de 310 carreras con un par por debajo de 10 en visión normal, telefono §1, punto 7) y el validador solo protege a los humanos; o esperar al reinicio del mundo                                                                                                           | 16             |
| DD-08 | Si el maillot de un humano choca con un NPC, el NPC cede                                                                                                                                                                                                                          | Sí (D-24): sin la regla, un equipo PRS elige entre unos 31 maillots (identidad, medido)                                                                                                      | Humanos y NPC chocan igual: el editor tacha más colores y el mánager tiene menos sitio                                                                                                                                                                                                                         | 18             |
| DD-09 | La espera entre dos cambios de maillot                                                                                                                                                                                                                                            | 28 días de juego, una semana real, con el primer cambio tras tomar el equipo libre (D-25): la afición aprende el maillot de un equipo                                                        | 14 (telefono) deja dos cambios por semana real; 7 (lectura), casi uno por día real; una temporada lo congela; cambia `KIT_CHANGE_COOLDOWN_DAYS`                                                                                                                                                                | 18             |
| DD-10 | Las palabras y los cortes de la llegada                                                                                                                                                                                                                                           | Los de hoy (`Rusty`, `Spot on`, `Fine`, `Loaded`, `Cooked`, en +25, +5, −10 y −30), con su escala y su instrucción (D-42): faltaba la escala, no las palabras, y el motor no se toca         | Los del diseño, `Stale`, `Peaking`, `Fresh`, `Loaded`, `Buried`, en +18, +5, −10 y −35 (`docs/entrenamiento.md` l. 1093-1099): se toca `arrivalLabel`, que vive en el motor, y `projection.test.ts` l. 154-170                                                                                                 | 14             |
| DD-11 | El TSS fuera de la pantalla y de la API                                                                                                                                                                                                                                           | Sí (D-41): la carga en cinco palabras ([DUEÑO 8], «eso no aporta, ni se entiende», de otra cifra sin escala)                                                                                 | El TSS vuelve en `meta` en el día a día, y entonces puede viajar en la vista previa y en `days[]`                                                                                                                                                                                                              | 13             |
| DD-12 | La moral                                                                                                                                                                                                                                                                          | En medias estrellas (D-44): lo que pide SPEC §3.3 l. 85, «en estrellas o iconos», con el componente de los atributos                                                                         | En cinco palabras con icono (telefono §9), o el porcentaje de hoy (`Morale 60%`), que viaja con decimales y rompe la frontera                                                                                                                                                                                  | 19             |
| DD-13 | Esconder la barra inferior en `Watch` mientras corre la carrera                                                                                                                                                                                                                   | Sí, propuesto a E6 (`useHideBottomNav`, `docs/retransmision.md` §18.6): sin él, la barra tapa el comentario (captura 09)                                                                     | La barra se queda y `Watch` reserva `--fixed-bottom` bajo el comentario                                                                                                                                                                                                                                        | 20             |
| DD-14 | La regla que revisa la app nativa, con su sensor                                                                                                                                                                                                                                  | Sí, con los umbrales de D-52: la decisión de §4.15.1 de la agenda lleva una prueba y no hay analítica que la dé                                                                              | Esperar a la tarea de analítica (D11 de la agenda), que deja la decisión sin prueba; u otros umbrales                                                                                                                                                                                                          | 23             |
| DD-15 | Cuándo se ofrece instalar                                                                                                                                                                                                                                                         | Tras la tercera sesión o cuando E4 pida avisos, nunca en la primera visita (D-51)                                                                                                            | En la primera visita, el aviso compite con entender el juego; nunca, el jugador de iPhone no sabe que puede (Safari no lo dice)                                                                                                                                                                                | 5              |
| DD-16 | Playwright en el CI                                                                                                                                                                                                                                                               | Sí, con unos 5 a 7 minutos más por PR que toca la web, la API o `packages/db` (estimado por telefono) y 150 MB de Chromium en la caché (D-18)                                                | Sin él, la aceptación del teléfono deja de ser automática y vuelve a ser a mano (lectura §5.4)                                                                                                                                                                                                                 | 2              |
| DD-17 | Los clones que ya haya en producción                                                                                                                                                                                                                                              | Se quedan (D-32): son equipos NPC de pleno derecho, con corredores, contratos y resultados; la consulta del paso 1 dice cuántos hay                                                          | Borrarlos pasa sus corredores a agentes libres y arrastra contratos y ofertas (`onDelete cascade`), como la poda de `reconcileTeams`; se haría con una migración de datos tras ver la consulta                                                                                                                 | después del 1  |
| DD-18 | La línea `Your country: …` de la creación del corredor                                                                                                                                                                                                                            | Se queda como texto de ayuda del campo del país, en `meta` `ink-2` ([DUEÑO 19]: la pidió el dueño «mientras se depura», `CreateRider.tsx` l. 29)                                             | Se quita en el PR de la cola larga que pasa `CreateRider` al catálogo                                                                                                                                                                                                                                          | 21             |
| DD-19 | El nombre del patrocinador sale de una lista cerrada                                                                                                                                                                                                                              | Sí (D-30): sin texto libre no hay nada que moderar en el maillot, y el nombre hace de logotipo                                                                                               | Texto libre de hasta 12 caracteres, moderado por E9 con el `name_status` de los nombres (`schema.ts` l. 260); lo decide el dueño con E8 y E9                                                                                                                                                                   | E8             |
| DD-20 | La prueba del dueño en su teléfono como puerta del cierre                                                                                                                                                                                                                         | Sí (D-19): diez tareas a una mano; todo lo demás está medido en Chromium de Linux                                                                                                            | E3 se cierra con el trinquete a cero y sin la prueba: lo que no ve Chromium (WebKit, la letra del sistema, el área segura) queda sin comprobar                                                                                                                                                                 | 24             |

---

## Lo que esta síntesis no ha podido comprobar

1. **El vocabulario de D-20 con seis figuras**, la banda frente a ese vocabulario y la traducción con él: ninguna propuesta los midió así. Los mide la página de opciones y los repiten `kits.test.ts` y `champion.test.ts`, con la puerta de D-20.
2. **El coste de `seasonRivals`** (D-24) y **el tamaño y la restauración del mundo en la caché del CI** (D-18): estimados; los miden los pasos 16 y 2.
3. **Los valores de `line` y `line-strong` en el ámbito oscuro** (D-04): los mide el redactor de §3.
4. **Si hay clones en producción** (D-32): no hay acceso a la base de producción desde aquí; lo dice la consulta del paso 1.
5. **La serialización de las rutas de la retransmisión** (D-54): sin medir; la mide el PR 19a antes de declararlas.
6. **Nada de lo que dicen las propuestas sobre un teléfono de verdad**: todo es Chromium de Linux sin cabeza (D-19).
