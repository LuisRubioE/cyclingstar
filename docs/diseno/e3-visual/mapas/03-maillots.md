# Mapa 03 · Los maillots

Commit `58c14da`. **Leídos enteros** (líneas): `apps/web/src/components/Jersey.tsx` 186, `visuals.ts`
83, `Flag.tsx` 39, `TeamManager.tsx` 114, `broadcast/WornJerseyIcon.tsx` 31, `pages/TeamIdentity.tsx`
200, `packages/db/src/titles.ts` 97, `packages/engine/src/world/jersey.ts` 56 y
`packages/shared/src/jerseys.ts` 439. **Por tramos**, con su línea: `packages/db` (`world.ts`,
`teamControl.ts`, `calendarRun.ts`, `cast.ts`, `tick.ts`, `schema.ts`), la API y el contrato, las
pantallas que pintan maillots y sus tests; `docs/retransmision.md` §7.1 a §7.4 y §7.9,
`docs/navegacion.md` §7.4, `docs/encargos.md` E3, E8, E9 y E12, `docs/epics.md` G2.7 y G2.8,
`docs/agenda.md` §4.16.1, `SPEC.md` §7.1 y §8, y la guía de maillots de la UCI 5.3 de `00-encargo.md`
§7.1 (`<scratchpad>/uci/norme.txt`). **Cómo se ha medido**: `mapas/03-maillots-medida.py` (con
`<scratchpad>/venv/bin/python -I -B`, 2,5 min), cuyo generador crea el mundo con el código del juego
(PGlite, `runTick` con `GENESIS_WORLD_SEED`, `cyclingstar-2`, motor v91, y `predictStartlist` en las
310 carreras de la temporada 0 que no son nacionales) y saca la equipación con el `jerseyStyle` de la
web, transpilado (el port del script coincide en 2.628 de 2.628 semillas). Color: Machado 2009,
severidad 1, en RGB lineal, y ΔE00 en CIELAB D65 (`colour-science` 0.4.7); grises, la luminancia. Los
dibujos (§3.2, §4.1, §5.2, §7): un rasterizador propio del SVG de `Jersey.tsx`, cotejado con Chromium
1194 (ΔE00 medio por píxel de 0,25 a 2,3 en los del juego). Cifra sin otra marca, medida así; px CSS a
densidad 1.

## Resumen

1. **La equipación no se guarda: se deriva** de una semilla y del orden de la paleta. Un color más en
   `JERSEY_COLORS` cambia la base de 102 de los 219 equipos y repinta también lo grabado (§2.3).
2. **La semilla es la identidad del equipo NPC**: cambiarla, como hace el selector de hoy, hace que el
   siguiente tick cree un clon con el mismo nombre y 12 corredores (§2.2). El servidor acepta como
   semilla cualquier texto de 1 a 120 caracteres (§2.1).
3. **Hay gemelos en visión normal**: 302 de 310 pelotones tienen un par de equipos con el mismo patrón
   y la base a menos de 10 (3,9 de media; 6,8 en deuteranopía, 18,8 en grises). En la paleta, 2 de 91
   pares bajan de 10 en visión normal, 12 en deuteranopía y 45 en grises (§3).
4. **En el teléfono, un maillot de 13 px es todo lo que identifica** a cada corredor de un grupo de
   cuatro a doce en `Watch` (§1.2); a ese tamaño una raya de `stripes` mide 0,81 px (§1.3).
5. **Los líderes comparten color y figura con las equipaciones**: el verde y el azul de líder están en
   `JERSEY_COLORS` y la banda es patrón de 44 equipos; a 13 px, 5 equipaciones dibujadas quedan a menos
   de 10 del verde en visión normal y 88 en grises (§4.1). El dorsal del equipo líder no se pinta (§4.2).
6. **El campeón solo se ve en `Watch`**, y no hay campeones hasta el primer nacional: la ruta de 111
   de 133 países es el día 179 (§5).
7. **El registro encontrado es el del logotipo de la UCI**, no el de las bandas solas: IR 1276964,
   clases 12, 25 y 41, en la UE, EE. UU. y otras 15 partes (§7.1). **Lo que separa una variante de
   bandas de las equipaciones es el fondo blanco**, que no lleva ningún equipo; a 13 px cada banda
   mide 0,54 px y en grises ningún orden de los cinco colores se separa 10 del de la UCI (§7.2, §7.3).

## §1. El dibujo de hoy

### §1.1 Las piezas

| Pieza                           | Dónde                                               | Qué dibuja                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TORSO`                         | `Jersey.tsx` l. 10-11                               | la silueta única, en un `viewBox` de 48 unidades (u): hombros, mangas y cuerpo (x 14 a 34, y 18 a 40)                                                                                                                                                                                                                                            |
| `Jersey`                        | l. 17-54                                            | torso en `base` con filete `rgba(0,0,0,0.18)` de 1 u (l. 29); en `secondary`, `band` (6 u, l. 30), `stripes` (tres de 3 u, l. 31-37), `panels` (dos laterales de 6 u, l. 38-43) o `shoulders` (las mangas, l. 44-49), y `solid` sin nada; cuello `accent` al 85 % (l. 51); `aria-label="Team jersey"` igual para todos, sin `<title>` (l. 24-25) |
| `jerseyStyle`                   | `visuals.ts` l. 71-83                               | base y secundario de los 14 `JERSEY_COLORS` (l. 34-49) con un solo re-sorteo si coinciden (l. 77), acento siempre `#ffffff` (l. 78), patrón de los 5 `JERSEY_PATTERNS` (l. 55); FNV-1a y xorshift32 (l. 8-27); memo por semilla (l. 68)                                                                                                          |
| `LEADER_JERSEY`, `LeaderJersey` | `Jersey.tsx` l. 73-77 y 92-119                      | amarillo `#facc15` liso; verde `#16a34a` con banda `#bbf7d0` de 7 u; azul `#2563eb` con cinco lunares blancos de radio 3,4 u (l. 80-86); filete al 0,35 de 1,5 u; `aria-label` y `<title>` de `JERSEY_LABEL` (`jerseys.ts` l. 145-149)                                                                                                           |
| `ChampionMark` y `Flag`         | l. 121-168; `Flag.tsx` l. 8-39                      | torso `#f1f5f9` y estrella `#1e293b` (l. 162-163); fuera del SVG, la bandera a `max(8, round(0,6 × size))` px de alto (l. 165; el ancho, 4:3, `Flag.tsx` l. 6), ninguna en el del mundo (l. 141); `data-champion-mark` (l. 151)                                                                                                                  |
| `RiderJersey`, `WornJerseyIcon` | l. 175-186; `broadcast/WornJerseyIcon.tsx` l. 12-31 | el `LeaderJersey` de una fila a 15 px, solo líderes; y el único que elige dibujo por `WornJersey`: líder, campeón (con `championTitleText`) o equipación, y sin equipo un hueco (l. 28-29)                                                                                                                                                       |
| `renderJerseySvg`               | `packages/engine/src/world/jersey.ts` l. 8-56       | otro maillot, de 10 colores y 4 patrones, que solo usan su test y la exportación (`packages/engine/src/index.ts` l. 153)                                                                                                                                                                                                                         |

Discrepancias: `docs/retransmision.md` §7.9 deja el contrato `WornJerseyIcon({ worn, team })`, en su
l. 5210, y el código recibe `{ card, size }` (l. 12-18); `TeamIdentity.tsx` l. 178-181 promete la
equipación en `start lists, results and the peloton` (pantalla), y en los resultados no sale (§1.2);
`SKIN_TONES` (`visuals.ts` l. 52) no lo usa nadie. Tests que fijan el dibujo: `leaderJerseys.test.tsx`
l. 28-88 (`aria-label`, `<title>`, el `<rect` del verde, el `<circle` del azul, ningún `Leading
team`), `CueCard.test.tsx` l. 113-130 y `GroupBar.test.tsx` l. 369 y 503-506; el resto, mapa 01 §9.

### §1.2 Dónde se pinta y a qué tamaño

| px      | Equipación (`Jersey`)                                                                                                                                                                           | Líder                                                                                                                                                   | Campeón                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 12      |                                                                                                                                                                                                 | `CueCard.tsx` l. 90 (filas del cuadro)                                                                                                                  |                             |
| 13      | `GroupBar.tsx` l. 242 (línea de un grupo de 4 a 12), `CueCard.tsx` l. 84 y 122, `TimeTrialBoard.tsx` l. 86                                                                                      | los mismos, por `WornJerseyIcon`; `ChronicleSentence.tsx` l. 25 y `VoiceTicker.tsx` l. 78                                                               | los mismos; bandera de 8 px |
| 14      | `GroupBar.tsx` l. 204 (grupo de hasta tres) y `CueCard.tsx` l. 61 (la fuga)                                                                                                                     | `GroupBar.tsx` l. 113, `StageStory.tsx` l. 103, `RaceRadioPanel.tsx` l. 210                                                                             | los mismos; bandera de 8 px |
| 15      |                                                                                                                                                                                                 | `RiderJersey` en `Race.tsx` l. 220 y 256, `StageReplay.tsx` l. 101 y 147, `stageView.tsx` l. 98, `StageStory.tsx` l. 141; `StageCards.tsx` l. 110 y 292 |                             |
| 16      | `Race.tsx` l. 162 (inscritos previstos) y `CueCard.tsx` l. 116 (rótulo)                                                                                                                         | rótulo                                                                                                                                                  | rótulo; bandera de 10 px    |
| 18 a 96 | `Race.tsx` l. 139 (18, escuadra congelada), `Teams.tsx` l. 33 (26), `TeamManager.tsx` l. 93 (34), `TeamSquad.tsx` l. 207 (40), `Team.tsx` l. 87 (44), `TeamIdentity.tsx` l. 139 y 177 (72 y 96) |                                                                                                                                                         |                             |

El fondo es blanco casi siempre (`StageWatch.tsx` l. 255 y 295); `CueCard` pinta el suyo por clase,
`bg-red-700`, `bg-slate-900` o `bg-slate-700` (l. 36-43). **La equipación no sale** en ninguna tabla de
resultados ni en la clasificación por equipos, que pone la bandera (`TeamClassTable.tsx` l. 18-57;
`capturas/06-race-vuelta-teams-360.png`), **y el campeón no sale fuera de `Watch`** (grep de
`ChampionMark` en `apps/web/src`). **En el teléfono**, la línea de un grupo de cuatro a doce sale bajo
la fila 1 y las del espectador (`GroupBar.tsx` l. 135) y sin nombres (`hidden sm:inline`, l. 243).

### §1.3 Lo que mide cada trazo (cálculo: px = unidades × tamaño / 48)

| Elemento                                  | 12 px       | 13 px       | 16 px       | 28 px       | 72 px       |
| ----------------------------------------- | ----------- | ----------- | ----------- | ----------- | ----------- |
| banda de equipo o panel (6 u)             | 1,50        | 1,63        | 2,00        | 3,50        | 9,00        |
| raya de `stripes` (3 u)                   | 0,75        | 0,81        | 1,00        | 1,75        | 4,50        |
| banda del verde (7 u)                     | 1,75        | 1,90        | 2,33        | 4,08        | 10,50       |
| lunar del azul (6,8 u de diámetro)        | 1,70        | 1,84        | 2,27        | 3,97        | 10,20       |
| estrella del campeón (16,8 u de ancho)    | 4,20        | 4,55        | 5,60        | 9,80        | 25,20       |
| filete de equipo (1 u) y de líder (1,5 u) | 0,25 y 0,38 | 0,27 y 0,41 | 0,33 y 0,50 | 0,58 y 0,88 | 1,50 y 2,25 |
| banda de las variantes de §7 (2 u)        | 0,50        | 0,54        | 0,67        | 1,17        | 3,00        |

## §2. La semilla

### §2.1 Qué se guarda, cómo nace y cómo se cambia

`teams.jersey_seed` es `text` no nulo, sin unicidad (`packages/db/src/schema.ts` l. 268 y 278). La
génesis le da `<worldSeed>:team:<división>:<i>:jersey` (`world.ts` l. 398 y 419), que es también la
semilla del nombre (`makeLangTeamName`, l. 423). Un mundo nace con 219 equipos, 18 WT, 16 PRS y 185
CON (`TEAM_DIST`, l. 46-131), y 3.900 corredores (l. 153); `SPEC.md` l. 854 dice «18 World Tour, 15
Pro Series y 24 Continental». `TeamManager.tsx` ofrece al dueño (`TeamIdentity.tsx` l. 187) la
semilla actual y 11 candidatas `<team.id>:jersey:<i>` (l. 21-26), con 11,4 combinaciones de base y
patrón distintas de media (mínimo 8). `PUT /api/teams/me` acepta como `jerseySeed` cualquier texto de
1 a 120 caracteres (`apps/api/src/routes/teams.ts` l. 19-27) y `updateOwnedTeam` lo guarda sin más
(`teamControl.ts` l. 182-186): las candidatas las impone la pantalla. Una semilla mala devuelve
`nombre_invalido` (l. 184), que la web enseña como el error de longitud del nombre (`TeamManager.tsx`
l. 9). La semilla viaja en `startlistTeamSchema`, `teamListItemSchema` y `teamDetailSchema`
(`contracts.ts` l. 665, 692 y 718) y en el reparto de `Watch` (`broadcast/wire.ts` l. 354): texto
libre que llega a todos.

### §2.2 Cambiarla clona el equipo (medido)

`seedWorld` corre en cada tick (`tick.ts` l. 265) y reconoce los equipos existentes por su
`jersey_seed` (`world.ts` l. 460-468), y `teamIndexFromSeed` saca de ella el índice del equipo para
`reconcileTeams` y `clusterTeamNationalities` (l. 542-545, 574, 594, 598 y 785). La prueba: al equipo
CON 0 (`Menghu Cycling`) se le pone dueño y la semilla `<id>:jersey:3`, lo que escribe
`updateOwnedTeam` con la cuarta candidata, y se pasa un tick: el mundo pasa de 219 equipos y 3.900
corredores a 220 y 3.912, con un NPC nuevo, también `Menghu Cycling`, con la semilla vieja y 12
corredores. Ningún test lo cubre (grep de `jerseySeed` en los tests de `packages/db`).

### §2.3 La paleta y la semilla van atadas

`pickFrom` toma `floor(r × longitud)` (`visuals.ts` l. 29-31). Un color más al final de
`JERSEY_COLORS` cambia la base de 102 de los 219 equipos y el aspecto de 163; un patrón más, el patrón
de 106; un color menos, la base de 105. E2 graba la semilla y no los colores (`CastTeam.jerseySeed`,
`cast.ts` l. 146-154; `docs/retransmision.md` l. 4868): un cambio de paleta repinta también el pasado.

## §3. La distinguibilidad, medida

### §3.1 La paleta: los 91 pares de los 14 colores

| Vista        | < 10 | < 20 | Pares por debajo de 10 (ΔE00), con los nombres de `visuals.ts` l. 35-48                                                                                                                                  |
| ------------ | ---- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| normal       | 2    | 10   | violet/indigo 6,5; rose/red 9,2                                                                                                                                                                          |
| protanopía   | 6    | 24   | violet/indigo 1,3; amber/lime 4,8; blue/violet 5,1; blue/indigo 5,8; green/lime 6,1; green/amber 8,9                                                                                                     |
| deuteranopía | 12   | 28   | blue/violet 0,5; orange/lime 2,7; rose/green 3,2; violet/indigo 3,5; blue/indigo 3,9; rose/red 5,5; lime/red 6,3; green/red 7,9; orange/red 8,0; rose/lime 8,4; green/lime 8,4; cyan/sky 9,7             |
| tritanopía   | 13   | 28   | rose/red 1,9; cyan/teal 3,4; green/teal 4,2; rose/orange 5,4; pink/orange 6,5; green/cyan 6,6; orange/red 7,2; rose/pink 7,7; blue/indigo 8,2; green/lime 8,4; cyan/sky 8,4; pink/red 9,1; teal/lime 9,4 |
| grises       | 45   | 72   | de cyan/teal 0,5, rose/pink 0,6 y rose/red 0,8 a rose/green 9,8                                                                                                                                          |

El comentario «vivos y con buen contraste» (l. 33) vale para la visión normal. Son hexadecimales de
Tailwind v3 (mapa 01 §2.4).

### §3.2 El mundo y los pelotones

Patrones: `stripes` 50, `panels` 45, `band` 44, `solid` 43 y `shoulders` 37; bases, de 23 equipos
(`blue`) a 9 (`red`). Se usan 67 de las 70 combinaciones de base y patrón, y 208 de los 219 equipos
comparten la suya; 88 tienen un gemelo exacto (base, patrón y, si se pinta, secundario), en 34 grupos.
Dos sacan el secundario igual a la base tras el único re-sorteo (`visuals.ts` l. 77). Par
indistinguible, con la definición del encargo: mismo patrón y ΔE00 de la base por debajo de 10. Los
pelotones tienen de 7 a 22 equipos (mediana 20; las .WT, de 20 a 22, `calendarRun.ts` l. 422-423).

| Vista        | Carreras con algún par (de 310) | Pares por carrera: media; mediana; máximo | Race France (21 equipos): pares y equipos afectados |
| ------------ | ------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| normal       | 302                             | 3,9; 4; 11                                | 5 y 7                                               |
| protanopía   | 307                             | 4,9; 5; 12                                | 8 y 8                                               |
| deuteranopía | 307                             | 6,8; 7; 13                                | 12 y 12                                             |
| tritanopía   | 310                             | 8,5; 9; 15                                | 9 y 12                                              |
| grises       | 310                             | 18,8; 18; 34                              | 18 y 14                                             |

En visión normal, los cinco pares de Race France son la misma base con el mismo patrón: `Noord
Cycling`, `Al Bahr Velo` y `Pfeil Velo` (ámbar con rayas), `Northwind Cycling Team` y `Sommet Vélo`
(naranja con rayas), `Noord Wielrennen` y `Mistral Racing` (pizarra liso). 220 de las 310 carreras
tienen algún par de maillots idénticos del todo. Con el dibujo entero (todos los colores y el patrón, a
13 px), Race France tiene por debajo de 10 6 de sus 210 pares en visión normal, 17 en protanopía, 31
en deuteranopía, 14 en tritanopía y 108 en grises.

### §3.3 Los fondos

Contra el blanco y el `body` (`#e8edf2`, `index.css` l. 15-17) ningún color de equipo baja de 10 (el
peor, `amber` en grises: 18,1 y 14,4). En `Watch`, `slate` queda a 6,3 de `bg-slate-900` (`#0f172b`
en Tailwind 4.3.3) y a 7,8 de `bg-slate-700` (`#314158`); sobre el `bg-red-700` (`#c10007`) de
`CueCard`, `red` queda a 7,7, y en grises bajan de 10 seis de los 14 colores (`indigo`, a 0,5). El
filete que los separaría mide 0,27 px a 13 px (§1.3).

## §4. Los líderes y el dorsal

### §4.1 El trío, sus marcas y las equipaciones

| Vista        | amarillo y verde | amarillo y azul | verde y azul | banda y verde | lunar y azul |
| ------------ | ---------------- | --------------- | ------------ | ------------- | ------------ |
| normal       | 38,1             | 73,9            | 56,0         | 27,1          | 49,4         |
| protanopía   | 17,9             | 70,1            | 57,9         | 26,1          | 44,8         |
| deuteranopía | 25,5             | 75,9            | 55,5         | 27,5          | 49,5         |
| tritanopía   | 49,1             | 53,5            | 18,0         | 25,0          | 40,9         |
| grises       | 19,0             | 31,0            | 12,6         | 24,3          | 40,3         |

Contraste WCAG de la marca contra su base: banda 2,72, lunares 5,17. El trío se separa entre sí; el
choque es con las equipaciones: el verde y el azul de líder son `green` y `blue` de `JERSEY_COLORS`
(`Jersey.tsx` l. 75-76; `visuals.ts` l. 36-37), con 19 y 23 equipos de esa base. Con la definición de
§3.2 (mundo y Race France): con banda y base a menos de 10 del verde, 4 y 1 en visión normal, 12 y 2
en deuteranopía, 27 y 3 en grises; lisos a menos de 10 del amarillo, 0 en visión normal y 2 y 0 en
deuteranopía y en grises; con la base a menos de 10 del azul, 23 y 2, 52 y 3, y 125 y 6 (lunares no
lleva ningún equipo). Dibujados a 13 px, la equipación más cercana y cuántas bajan de 10:

| Líder a 13 px  | normal               | deuteranopía             | grises                 |
| -------------- | -------------------- | ------------------------ | ---------------------- |
| amarillo, liso | 13,1 (amber liso); 0 | 5,8 (amber liso); 6      | 6,4 (amber liso); 8    |
| verde, banda   | 6,2 (green liso); 5  | 5,9 (green, hombros); 18 | 5,2 (lime, banda); 88  |
| azul, lunares  | 12,1 (blue liso); 0  | 11,1 (blue, rayas); 0    | 9,2 (blue, paneles); 7 |

### §4.2 El dorsal del equipo líder

`docs/navegacion.md` §7.4 dice que el equipo líder lleva dorsal amarillo, dibujado en la tabla por
equipos con el `aria-label` «Leading team» (l. 462-466, 490-494 y 501-504). La API lo calcula
(`leadingTeam`, `jerseys.ts` l. 128-130; `apps/api/src/routes/calendar.ts` l. 222, `stageReplay.ts` l.
299, `broadcastSource.ts` l. 1259) y lo manda (`raceLeadersSchema.team`, `contracts.ts` l. 479-480);
la web no lo pinta (grep de `Leading team` y `leaders.team`), `TeamClassTable` no recibe los líderes
(l. 18) y `leaderJerseys.test.tsx` l. 81-88 sella la ausencia («el equipo líder ya no lleva dorsal»).
`docs/retransmision.md` lo dice bien en l. 457 y mal en l. 4831 y 4869 («sigue en la tabla por
equipos»). Por qué se quitó, no lo sé: no está en el código, ni en `docs/`, ni en los 55 commits.

## §5. Los títulos de campeón

### §5.1 El dato, la regla y el calendario

`ChampionTitle` (`jerseys.ts` l. 162-180), `WornJersey` (l. 183-194) y `Distinction` (l. 197-217).
`wearableTitles` se queda con los títulos de la disciplina (`road` o `itt`) y la categoría (`elite` o
`u23`) del día (l. 271-275; las del día salen de `ctx.timeTrial` y `championshipCategory`, `cast.ts`
l. 214-217); al líder verdadero no se le salta y el campeón sin maillot de líder lleva el de mayor
alcance (l. 300-328). La fuente, `palmaresTitleSource` (`titles.ts` l. 55-97): el ganador de la última
edición de cada `nc-<cc>-[u23-]<road|itt>`, vigente si `validFromDay < día ≤ validFromDay + 364`,
siempre `national` y `provisional`. Los textos, `championTitleText` (`broadcast/names.ts` l. 153-170):
`Champion of Italy`, `Time trial champion of Italy`, `U23 champion of Italy` (pantalla). Medido en
`SEASON_CALENDAR`: 532 nacionales, cuatro por país en 133 países (el `calendar.ts` del motor,
`packages/engine/src/routes/calendar.ts` l. 3786-3789); la ruta élite de 111 países es el día 179
(`NATIONALS_ROAD_DAY`, l. 217), 17 la corren antes (Australia, el 11) y 5 después (Malasia, el 256)
por `NATIONALS_ROAD_OVERRIDE` (l. 224), y la crono élite de 111, los días 175 y 176. Coincide con `docs/retransmision.md` l. 4959-4967: sin campeones hasta el primer
nacional, y el Giro de la temporada 0 (días 128 a 151) sin campeón de Italia. `SPEC.md` l. 879 dice
«campeonatos nacionales el mismo día mundial (día 155)».

### §5.2 El campeón en pantalla y lo que no existe

Solo en `Watch` (§1.2). El torso `#f1f5f9` queda a 3,2 del blanco y a 1,8 del `body` (2,1 y 1,7 en
grises): sobre blanco su silueta es el filete de 0,41 px a 13 px y lo que se ve es la estrella, a unos
74 del torso en las cinco vistas, con el `#1e293b` del `slate` de `JERSEY_COLORS`. Dibujado, ninguna
equipación baja de 10 en ninguna vista (la más cercana, 25,6 en visión normal y 13,1 en grises), y
ninguna lleva estrella. La estrella es el emblema del juego: el logotipo es una bicicleta con una
estrella `#f59e0b` (`Logo.tsx` l. 1 y 29-35). No hay Mundial en `SEASON_CALENDAR`. Hay una `Race
Continental Championship` (`race-euro-champs`, en el mismo `calendar.ts`, l. 2974-2982: clase .1, de
un día, el 277, con 21 equipos previstos) que no da título, porque `palmaresTitleSource` solo lee
`nc-` (`titles.ts`, en sus l. 44 y 69); `docs/retransmision.md` l. 4967 dice que los continentales
«no existen en el calendario».

## §6. Lo que piden los demás encargos

- **E8, el patrocinador**: «Que pueda pagar por imponer su color o por llevar su logotipo en el sitio
  bueno convierte la identidad visual del equipo en una decisión económica con coste real»; «El
  vocabulario visual que hace eso posible lo define E3» (`docs/encargos.md` l. 463-469). G2.8: «el
  equipo vende la camiseta y el material con EXCLUSIVIDAD POR CATEGORÍA» (`docs/epics.md` l. 480-482).
  Hoy el patrocinio es un ingreso fijo por división (`SPONSOR_INCOME_PER_WEEK`, `economy.ts` l. 133),
  sin nombre, color ni logotipo.
- **E9, la moderación**: la agenda le asigna «quién puede tocarlo y con qué moderación, porque un
  maillot es contenido de usuario como un nombre» (`docs/agenda.md` l. 727-728), y el encargo E9 no lo
  recoge (`docs/encargos.md` l. 490-541). Se moderan los nombres (`SPEC.md` l. 853; `name_status`,
  `schema.ts` l. 260); el maillot no tiene estado ni denuncia, y su semilla es texto libre (§2.1).
- **E12**: la tabla de títulos detrás de `ChampionTitleSource` con `provisional: false`, el Mundial, los
  continentales y la siembra al crear el mundo (`docs/retransmision.md` l. 5203 y 5208).
- **E2 a E3** (`docs/retransmision.md` l. 5204-5210): la señal de campeón «que no sea el arcoíris y se
  distinga por forma», los líderes definitivos, el editor con «un vocabulario legible a tamaño
  pequeño» y la señal del Mundial, con `aria-label`, `<title>` y `WornJerseyIcon`; la 7-h (l. 5229)
  descartó la banda con la bandera porque «en gris se confunde con el verde».
- **`SPEC.md`** §8, literal: «Prohibido imitar logotipos, tipografías o identidades visuales de las
  carreras reales (el amarillo con serifa característica, el rosa de la corsa, el arcoíris del campeón
  del mundo). Verificar cada nombre final contra EUIPO y USPTO antes del lanzamiento.» (l. 874). Y
  §7.1: quien funda un equipo «elige nombre, colores y patrón de maillot (SVG paramétrico)» (l. 852).

## §7. La marca de la UCI y las variantes del dueño

### §7.1 Lo que este mapa añade a `00-encargo.md` §7.1

- **La guía da los colores**: «The UCI Rainbow Stripes colours are the UCI logo colours» (p. 10), y su
  p. 5 los da en RGB: Blue 0 120 200, Red 200 20 60, Black 0 0 0, Yellow 250 225 0, Green 50 180 50
  (los hexadecimales del script son su conversión directa), con CMYK, Pantone (3005, 186, Black 6, 114
  y 361) y RAL; ante la duda manda el CMYK (p. 4). Las bandas tienen el mismo ancho y no admiten texto
  (p. 10); el maillot de campeón del mundo es blanco, «No other fabric color is allowed except white»
  (p. 21 y 22). En cuatro disciplinas de montaña y BMX, el campeón nacional puede llevar la bandera en
  la manga izquierda (p. 109).
- **El registro encontrado** (20 de octubre de 2026): la registración internacional **1276964** de la
  OMPI (<https://www3.wipo.int/madrid/monitor/en/showData.jsp?ID=ROM.1276964>), de 7 de octubre de
  2015, de la UCI, con base en la marca suiza 674453. Es el logotipo, las letras UCI con cinco bandas a
  su izquierda, figurativa y con los cinco colores reivindicados; clases de Niza 12 (bicicletas y
  accesorios), 25 (calzado y ropa, en particular de ciclismo) y 41 (organización de competiciones,
  películas, edición). Designada por el Protocolo en Australia, la Unión Europea, India, Japón, Corea,
  Noruega, Nueva Zelanda, Filipinas y Estados Unidos, y por el artículo 9sexies en China, Egipto, Corea
  del Norte, Mónaco, Serbia, Rusia, Ucrania y Vietnam; renovada hasta 2035. En Estados Unidos es el
  registro 4986012, con la 12 cancelada (<https://tsdr.uspto.gov/statusview/sn79177774>).
- **No encontrado**: el registro de las cinco bandas solas, que la guía dice registradas (p. 4); la
  búsqueda web no da otro número y la EUIPO (eSearch, TMview) carga con JavaScript y no se ha podido
  leer. Un blog de 2011 cita a la UCI: «The UCI has registered the colours
  blue/red/black/yellow/green/white ('rainbow stripes') as a trademark», con el blanco
  (<https://inrng.com/2011/06/rainbow-jersey-uci-trademark/>); es fuente secundaria.

### §7.2 Las variantes, dibujadas y medidas

Cada variante es la silueta de hoy (`TORSO`, filete de líder) con cinco bandas de 2 u, horizontales en
el pecho (x 14 a 34, y 22 a 32) o verticales en el centro (x 19 a 29, y 18 a 40): V0, la de la UCI
(blanco, horizontales, su orden); V1, el orden invertido; V2 y V3, en vertical, en su orden e
invertidas; V4, otra paleta, los cinco colores de marca del `@theme` (`index.css` l. 6-11); V5 y V6,
los colores de la UCI sobre `#1e293b` y sobre el dorado de marca `#d99400`; CM, el `ChampionMark`;
para medir, no propuestas. **Figura**: equipos cuyo patrón dibuja lo mismo en la misma zona (bandas
horizontales, `band` y `stripes`; verticales, `panels`). **Dibujo < 10**: equipaciones del mundo y de
Race France a menos de 10 de la variante dibujada a 13 px.

| Variante | A V0 a 13 px: normal y grises | A V0 a 72 px | Figura: mundo y Race France | Dibujo < 10: normal; peor daltonismo; grises | Equipación más cercana a 13 px: normal y grises | Líder más cercano a 13 px: normal y grises |
| -------- | ----------------------------- | ------------ | --------------------------- | -------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| V0       | 0 y 0                         | 0            | 94 y 14                     | 0; 0; 0                                      | 28,3 y 11,9                                     | 31,2 y 12,6                                |
| V1       | 15,0 y 5,6                    | 11,6         | 94 y 14                     | 0; 0; 0                                      | 26,9 y 11,8                                     | 32,3 y 13,0                                |
| V2 y V3  | 17,2 y 11,5                   | 18,7         | 45 y 2                      | 0; 0; 0                                      | 30,1 y 14,3                                     | 30,8 y 12,7                                |
| V4       | 8,1 y 3,1                     | 9,9          | 94 y 14                     | 0; 0; 0                                      | 26,4 y 13,1                                     | 30,9 y 12,4                                |
| V5       | 44,0 y 43,6                   | 47,1         | 94 y 14                     | 0; 8 y 3 (tritanopía); 12 y 4                | 10,4 y 4,2                                      | 35,7 y 25,2                                |
| V6       | 23,0 y 13,8                   | 23,0         | 94 y 14                     | 0; 7 y 1 (protanopía); 98 y 11               | 15,3 y 3,6                                      | 20,8 y 10,6                                |
| CM       | 12,2 y 8,0                    | 13,6         | 0 y 0                       | 0; 0; 0                                      | 25,6 y 13,1                                     | 29,0 y 10,4                                |

Por debajo de 20 a 13 px (mundo y Race France): en visión normal, ninguna con V0 a V4 y CM, 17 y 4 con
V5 y 10 y 0 con V6; en grises, 46 y 5 (V0 y V1), 78 y 8 (V2), 42 y 5 (V4), 114 y 9 (V5), 202 y 17 (V6)
y 49 y 5 (CM). A 16, 28 y 72 px, del mismo orden (salida del script, §7).

### §7.3 Lo que dicen las cifras

1. Ninguna equipación es blanca (el blanco es solo el cuello, `visuals.ts` l. 78): por eso ninguna
   variante sobre blanco baja de 20 en color contra ellas, a ningún tamaño. Con otro fondo llegan los
   choques: sobre `#1e293b`, con las equipaciones `slate`; sobre el dorado, en grises, con 11 de los 21
   equipos de Race France.
2. A 13 y 16 px cada banda mide 0,54 y 0,67 px y el navegador las mezcla. De los 119 órdenes distintos
   del de la UCI, a 13 px el más cercano queda a 1,0 en visión normal y la mediana a 10,2 (0,4 y 8,1
   en deuteranopía); en grises ninguno pasa de 6,7 a 13 px ni de 9,8 a 72 px. El color medio de la
   franja es el mismo en cualquier orden: son las mismas cinco áreas.
3. En vertical, invertir el orden es un espejo: V2 y V3 quedan a la misma distancia de cualquier
   maillot simétrico, y lo son todos los de hoy. La guía ya regula la vertical (p. 10).
4. A 13 px, otra paleta sobre blanco (V4) queda más cerca de V0 (8,1) que el orden invertido (15,0), y
   el `ChampionMark` de hoy a 12,2: a ese tamaño se lee «blanco con algo oscuro en el pecho». Es
   distancia visual, no jurídica.

## §8. Lo que este mapa no ha podido comprobar

- **El mundo de producción**: su semilla está en `worlds.world_seed` y no la sé; las cifras son de un
  mundo nuevo con `cyclingstar-2` (`tick.ts` l. 70), el de un reinicio. Si allí algún mánager ha
  cambiado ya de maillot, y si hay clones como el de §2.2, no lo sé.
- **Los pelotones** son la previsión del día 0 (`predictStartlist`): equipos, no corredores. Los
  nacionales (hasta 40 de un país, `calendarRun.ts` l. 218 y 226-264) mezclan equipos (los 199
  italianos con equipo están en 32) y no se han medido como pelotón.
- **La percepción**: ΔE00 < 10 es el umbral del encargo, no un experimento con personas; la distancia
  dibujada es una media por píxel, no cómo lee el ojo una forma; Machado con severidad 1 aproxima la
  dicromacia. El rasterizador se cotejó con Chromium (hasta 4,8 de media en las bandas de 0,54 px), no
  con Safari ni Firefox; a densidad 2, un maillot de 14 px se dibuja con 28 píxeles (columna de 28 px).
- **La marca**: el registro de las bandas solas, la EUIPO y la USPTO por titular, y si alguna marca de
  la UCI cubre juegos (las clases encontradas son 12, 25 y 41). No es asesoramiento jurídico.
- **Por qué se quitó el dorsal** del equipo líder (§4.2).
