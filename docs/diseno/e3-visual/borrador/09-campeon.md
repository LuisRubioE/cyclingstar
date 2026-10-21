## 9. Los maillots (II): la señal de campeón, los líderes, el patrocinador y `WornJerseyIcon`

Esta sección dibuja lo que un maillot de equipo no puede llevar: la señal de campeón que eligió el dueño (D-00d, que sustituye a D-26; DD-03 decidida), entera y medida a 28 px, con lo que cuesta; su palabra juzgada variante a variante (D-27) y las alternativas que no eligió, con sus cifras; los tres de líder (D-28) y lo que sustituye al dorsal del equipo líder (D-29); lo que compra un patrocinador (D-30); y el único componente que elige el dibujo de un corredor, `WornJerseyIcon` (D-31). Todo a 28 px o más (D-00b). Lo que añade el orquestador a la palabra del dueño va marcado, para que él lo vea en §19 y lo pueda quitar. El vocabulario del equipo, `Kit` y `KitSurface` son de §8. Nada de lo que se dice de la marca de la UCI es asesoramiento jurídico.

### 9.1 La señal de campeón: el nacional viste su bandera; el mundial, la estrella

**La palabra del dueño** (`00-encargo.md` §7.2, en `bd74602`, 21 de octubre de 2026). Del nacional: «lo primero el maillot de pais debe por si mismo identificar el pais... o sea, diria que todo el maillot coloreado con los colores y forma de la bandera, no? Puedes hacerlo? Nada de tener que pegar despues la bandera...» (l. 264-266). Del mundial: «quizas una que tenga una estrella para que vaya con el logo de cyclingstar, tiene sentido... y quizas que la estrella sea de arco iris??? con el fondo blanco diria yo...» (l. 270-272). **El dibujo**, en `packages/shared/src/kit.ts` y en u:

```ts
// packages/shared/src/kit.ts: la estrella del logotipo (Logo.tsx l. 30-32) pasa aquí, y Logo.tsx la importa
export const LOGO_STAR =
  'M36 2 L39.2 9.2 L47 10 L41.2 15.3 L42.9 23 L36 19.1 L29.1 23 L30.8 15.3 L25 10 L32.8 9.2 Z'
/** El espectro natural, de rojo a violeta, en degradado continuo y en diagonal (lo añade el orquestador). */
export const CHAMPION_RAINBOW = [
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#5e35b1',
] as const
export const CHAMPION_STAR_EDGE = '#0b2740' // navy-dark (lo añade el orquestador)
export const CHAMPION_GOLD = '#e0a526' // la estrella del nacional (lo añade el orquestador)
export const CHAMPION_SILVER = '#c0c7d2' // la del continental, provisional (E12)
/** En u del viewBox de 48: ancho de la estrella, su centro y su filo. */
export const WORLD_STAR = { widthU: 18, cx: 24, cy: 28.5, edgeU: 1.5 } as const
export const NATIONAL_STAR = { widthU: 10, cx: 24, cy: 25, edgeU: 1 } as const
/** La caja de la bandera: el alto del torso (de y 8 a 42) a 4:3, centrada en x 24, mangas dentro. */
export const NATIONAL_FLAG_BOX = { x: 4 / 3, y: 8, width: 136 / 3, height: 34 } as const
/** `translate(cx cy) scale(widthU / 22) translate(-36 -12.5)`: la del logotipo mide 22 × 21 u. */
export declare function starTransform(star: typeof WORLD_STAR | typeof NATIONAL_STAR): string
```

`ChampionJersey` (`apps/web/src/components/ui/ChampionJersey.tsx`, props `{ title: ChampionTitle; size: KitSize; surface?: KitSurface }`; 9-g) pinta, de abajo arriba: `TORSO` en blanco; en el nacional, dentro del `clipPath` de `TORSO`, la celda de su país del sprite de banderas (D-49, §12.7), escalada para cubrir el torso conservando su proporción y centrada (9-f); el filete de los líderes, `rgba(0,0,0,0.35)` de 1,5 u (`Jersey.tsx` l. 113 y 162), o el claro de `surface="dark"` (§9.10); el cuello de siempre, `COLLAR` blanco al 85 %; y la estrella, `LOGO_STAR` colocada con `starTransform`, con su filo `CHAMPION_STAR_EDGE` de unión redonda (9-e). Es `role="img"`, con `aria-label` y `<title>` de `championTitleText` (`broadcast/names.ts` l. 153-170), y `data-ui="ChampionJersey"` con `data-variant` `world`, `national` o `continental`. La capa de la bandera es la única que no es un `path`:

```tsx
// la capa de la bandera, dentro del clipPath de TORSO; `cell`, la del país en flagSprite.generated.ts
const flag = (
  <svg
    {...NATIONAL_FLAG_BOX}
    viewBox={`${cell.x} ${cell.y} 64 48`}
    preserveAspectRatio="xMidYMid slice"
  >
    <image href={flagsUrl} width={sprite.width} height={sprite.height} />
  </svg>
)
```

- **Nacional**: el maillot entero es la bandera, mangas incluidas; como la caja es 4:3, igual que la celda, la bandera entra entera de alto y `TORSO` le recorta los lados (se ven 34 de sus 45,3 u de ancho, el 75 %). Encima, la estrella pequeña dorada, `NATIONAL_STAR` en `CHAMPION_GOLD`, **lo que añade el orquestador** para que la estrella sea la señal de «campeón» en los dos casos y la bandera diga de dónde. **Sin bandera al lado**: se borra la de `Jersey.tsx` l. 165, y ninguna pieza pone una bandera junto al maillot salvo `RiderLabel`, que pinta la del corredor delante de su nombre (D-00c). `Champion of Italy` (pantalla).
- **Mundial** (lo correrá E12): el cuerpo blanco y la estrella del logotipo de 18 u en el pecho, rellena con `CHAMPION_RAINBOW` en un `linearGradient` de (0, 0) a (1, 1) con seis paradas iguales; el espectro natural, en degradado continuo y en diagonal, y el filo `navy-dark` de 1,5 u son **lo que añade el orquestador** para alejarla de la marca: nunca los cinco colores de la UCI ni en bandas. `World champion` (pantalla).
- **Continental** (E12): el cuerpo blanco y la estrella del mundial en `CHAMPION_SILVER`, provisional hasta que E12 decida los continentes; `Continental champion` (pantalla), el texto provisional de `names.ts` l. 163.

**Lo reservado** (D-00d): la estrella y el cuerpo blanco, que ningún maillot de equipo, de líder ni de patrocinador lleva; se cumple por construcción, porque ninguna figura tiene estrella y el blanco solo es segundo color (§8.1). **Ruta y crono, élite y sub-23 comparten el dibujo** y los separa el texto (`Time trial champion of Italy`, `U23 champion of Italy`, pantalla), porque `wearableTitles` solo deja llevar los títulos de la disciplina y la categoría del día (`jerseys.ts` l. 270-275; cobertura C1; X-17). El filo da 15,23:1 contra el blanco (`<scratchpad>/redactor-L2/contraste.py`, WCAG 2.x), y es lo que deja leer la estrella dorada, que sola daría 2,19:1, y la parada amarilla del arcoíris, `#fdd835`, que daría 1,40:1, sobre el blanco y en grises. **Cómo se ve**, en píxeles (px = u × tamaño / 48):

| Pieza                                              | 28 px | 40 px | 48 px | 72 px | 96 px |
| -------------------------------------------------- | ----- | ----- | ----- | ----- | ----- |
| la estrella del mundial, 18 u de ancho             | 10,5  | 15,0  | 18,0  | 27,0  | 36,0  |
| su filo, 1,5 u                                     | 0,88  | 1,25  | 1,50  | 2,25  | 3,00  |
| la estrella del nacional, 10 u                     | 5,83  | 8,33  | 10,0  | 15,0  | 20,0  |
| su filo, 1 u                                       | 0,58  | 0,83  | 1,00  | 1,50  | 2,00  |
| la bandera que se ve, 34 u de ancho                | 19,8  | 28,3  | 34,0  | 51,0  | 68,0  |
| la celda de 64 × 48 del sprite, a escala, en px/px | 0,41  | 0,59  | 0,71  | 1,06  | 1,42  |

La última fila es por píxel CSS: en un teléfono de densidad 3 la celda ya se amplía 1,24 veces a 28 px y 1,77 a 40, así que los escudos se verán blandos (calculado, sin mirar en un aparato; la duda 5).

### 9.2 Lo que cuesta: la marca de la UCI

La marca es `five horizontal stripes composed of colours blue, red, black, yellow and green (in this order)` sobre blanco, registrada a nombre de la UCI y `a unique identifier of the UCI World Championships and of the UCI alone`; la guía 5.3 regula también la vertical y la diagonal y fija el orden (`No other order will be approved`), y la UCI cobra licencia y la retira (`00-encargo.md` §7.1). El registro encontrado es el del logotipo, la registración internacional 1276964 de la OMPI, con los cinco colores reivindicados y las clases 12, 25 y 41; el de las bandas solas no se ha encontrado (mapa 03 §7.1). **El coste que el dueño tiene que conocer** (D-00d; §19): el maillot blanco con una estrella de arcoíris no tiene la estructura de la marca (ni cinco bandas, ni sus colores, ni su orden), pero evoca a propósito «el arcoíris del campeón del mundo» que `SPEC.md` l. 874 prohíbe imitar; mantenerla pide reescribir esa línea como «las cinco bandas de la UCI» y verificarla ante la EUIPO y la USPTO antes del lanzamiento, que es tarea del dueño y no un PR de E3 (D-59, §18).

**Las distancias, a 28 px** (medido aquí: `medir28.py`, con el rasterizador de `opciones/medidas.py`, Chromium 141.0.7390.37; la marca es la V0 del mapa 03 §7.2, cinco bandas de 2 u sobre blanco; la equipación es la permitida más cercana de §8.1, en cada vista):

| Señal                                      | A la marca: normal, protanopía, deuteranopía, tritanopía y grises | Equipación más cercana, en las mismas cinco                                                                                   | Líder más cercano, en las cuatro |
| ------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| el mundial                                 | 12,7; 11,6; 11,7; 12,1; 9,2                                       | 14,6 `sides.taupe.white`; 12,2 `yoke.teal.white`; 11,3 `sides.pink.white`; 14,5 `sides.taupe.white`; 9,4 `sides.orange.white` | 25,9                             |
| el continental                             | 13,0; 12,4; 12,4; 11,7; 8,3                                       | 12,8; 11,3; 10,4; 14,0; 8,6                                                                                                   | 25,6                             |
| el nacional más cercano a la marca, Chipre | 14,2; 13,7; 13,0; 12,9; 7,8                                       | (§9.6)                                                                                                                        | (§9.6)                           |
| Italia                                     | 23,4; 20,5; 19,1; 21,9; 15,6                                      | 23,4; 18,3; 16,8; 22,3; 14,8                                                                                                  | 19,2                             |
| España                                     | 42,3; 42,0; 36,4; 40,6; 29,6                                      | 18,4; 13,0; 10,6; 12,4; 9,1                                                                                                   | 20,0                             |

El mundial queda tan cerca de la marca como el `ChampionMark` de hoy (12,2 a 13 px, re-medido por el juez de cobertura, `juez-cobertura/medida.py`; X-16) y mucho más que la banda de honor que el dueño descartó (45,7 y 37,6 en grises a 13 px): para la distancia dibujada los dos son «un maillot blanco con color en el pecho», que es también lo que es la marca. Lo que la separa es lo que la distancia no mide: una estrella y no bandas, el espectro y no los cinco colores, sin negro y en diagonal. Las nacionales quedan a 14,2 o más en visión normal, y la más cercana es la de cuerpo blanco (O-14).

### 9.3 La palabra del dueño, variante a variante

El 20 de octubre de 2026 el dueño ofreció cambiar el arcoíris ([DUEÑO 2]): «una cosa, lo del arco iris, si esta registrado y tiene que ser diferente... igual puede ser un maillot arco iris diferente... con diferentes colores, diferente orden, diferente disposicion, incluso verticales en vez de horizontales... o que el resto en vez de ser blanco sea de otro color, no se, creatividad por favor» (`00-encargo.md` l. 221-224, conversación de diseño de E3); el 21 eligió la estrella (§9.1). Cada variante, con los cuatro criterios de `00-encargo.md` §7.1 y las cifras de las propuestas y del mapa 03 a 13 y 16 px (D-27; I-13), y la elegida, medida a 28 px. «A la marca» es la distancia dibujada a la marca, en visión normal y en grises; «equipación» es la más cercana del vocabulario de cada propuesta en las cuatro visiones:

| Variante                                                                     | 1. A la marca de la UCI                                                                                  | 2. Forma                                                       | 3. Equipación más cercana, y cuántas por debajo de 10      | 4. Reservable               | Veredicto                       |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------- | ------------------------------- |
| otros colores: cinco bandas de 2 u sobre blanco                              | es la estructura de la marca; 9,4 y 1,4 a 16 px (telefono), 8,7 y 1,5 a 13 (identidad V4)                | bandas de 0,67 px a 16, que el navegador mezcla (mapa 03 §7.3) | 14,7, 12,9, 13,8 y 14,8; ninguna (telefono)                | sí                          | fuera: más cerca que otro orden |
| otro orden                                                                   | la guía fija el orden y el público no lo nota (inrng, 2011); 14,1 y 5,3 (telefono), 14,9 y 5,3 (V1)      | ídem                                                           | 16,2, 13,8, 13,5 y 15,0; ninguna                           | sí                          | fuera                           |
| en vertical o en diagonal                                                    | la guía regula las dos; 22,5 y 14,7 (telefono), 14,4 y 8,4 (V2 y V3); en vertical, invertir es un espejo | ídem                                                           | 15,1, 11,8, 10,9 y 12,1; ninguna                           | sí                          | fuera                           |
| otro fondo: navy                                                             | los colores de la UCI en su orden siguen siendo la marca; 40,7 y 39,5                                    | «azul con algo en el pecho»                                    | 13,8, 8,4, 6,0 y 11,8: 4 en protanopía y 5 en deuteranopía | choca                       | fuera                           |
| otro fondo: oro                                                              | ídem; 22,7 y 12,5                                                                                        | ídem                                                           | 17,8, 8,7, 7,7 y 14,5: 1 y 4; a 17,9 del amarillo de líder | choca                       | fuera                           |
| espectro continuo en banda horizontal, sobre noche (V7)                      | ni cinco bandas, ni sus colores, ni blanco, pero «el arcoíris en el pecho»; 58,9 y 51,3                  | banda horizontal: la de `band` y la del verde                  | 16,8, 15,1 y 6,8 en grises: 12 (identidad)                 | no                          | fuera                           |
| el espectro de siete paradas en la diagonal, sobre noche (identidad C)       | no es la marca, pero evoca «el arcoíris del campeón del mundo» (`SPEC.md` l. 874); 48,7 y 38,2           | la de la banda de honor                                        | 24,9, 20,8 y 14,1 en grises: ninguna                       | sí, diagonal                | alternativa C, descartada       |
| **la elegida**: el espectro en la estrella del logotipo, sobre blanco (§9.1) | no es la marca, pero la evoca igual; 12,7 y 9,2 a 28 px (§9.2)                                           | «blanco con una estrella en el pecho», la del logotipo         | 14,6, 12,2, 11,3 y 14,5 a 28 px: ninguna, por la reserva   | sí: la estrella y el blanco | **la del dueño (D-00d)**        |

Las señales propias que se midieron sin depender de bandas (identidad §6.5, `exp1_senal.py` y `exp11_candidatas.py`, a 13 px; la marca en visión normal y en grises): la estrella de hoy, `ChampionMark` (12,5 y 8,2), la corona de cumbres (51,0 y 45,0, que se lee como la montaña), los meridianos (48,0 y 43,4, una mancha), la estrella grande del logotipo (49,0 y 41,7, un bulto a 13 px), el galón en V (47,6 y 39,7) y la banda de honor (44,3 y 35,5; el juez, 45,7 y 37,6). A 28 px, que es el mínimo desde D-00b, la estrella deja de ser un bulto: la del mundial mide 10,5 px. Las tres franjas de 7 u navy, cian y oro sobre blanco de telefono (23,0 y 14,6 a 16 px) se descartaron por su medida, el «blanco con franjas en el pecho» de la estructura de la marca, y no por el SPEC (O-15).

### 9.4 Las alternativas que el dueño no eligió

`opciones/index.html` las pintó a 13, 16, 28 y 72 px, sobre blanco y en un pelotón, con su simulación de daltonismo, y el dueño eligió mirándolas (`00-encargo.md` §7.2). Quedan con sus cifras, de `juicios/veredicto.json` → `gusto` (DD-03) y de las propuestas citadas, por si §19 las vuelve a abrir:

| Opción | Nombre                                    | Origen                                           | Valores y cifras                                                                                                                                                                                                                                         |
| ------ | ----------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | la banda de honor (el defecto de D-26)    | identidad A                                      | `SASH_PATH`, la diagonal de 10 u que hoy es la figura `sash`; mundial `#14213d` con banda y cuello `#e0a526`; nacional sobre `#f6f3ea` con tres franjas de su bandera y filo de 2,4 u; a 45,7 de la marca (37,6 en grises) a 13 px, Italia a 22,6 (15,7) |
| B      | la estrella dorada sobre marino           | sistema S1                                       | torso `#14284b`, estrella `#f0b323` de radio 9,5 u y 3,9 en (24, 29), canesú dorado la mundial; a 50,3 de la marca; todos los nacionales visten igual                                                                                                    |
| C      | el arcoíris diferente, en la diagonal     | identidad C                                      | la banda de A con siete paradas (`#e53935`, `#fb8c00`, `#fdd835`, `#43a047`, `#1e88e5`, `#5e35b1`, `#d81b60`) sobre noche; 48,7 (38,2 en grises); el mismo coste de `SPEC.md` l. 874                                                                     |
| D      | la estrella sobre blanco                  | telefono A y lectura (a)                         | el `ChampionMark` que el dueño ya había visto, estrella navy de 13 u y 6,2 en (24, 28,5); a 15,1 de la marca y 9,2 en grises a 13 px                                                                                                                     |
| E      | las otras señales con bandas              | telefono C, sistema D1, lectura (b), identidad B | tres franjas navy, cian y oro sobre blanco (23,0); tres bandas sobre marino (42,3); tres arcos sobre `#0b2740` (54,9); el galón `M7 9 L24 25 L41 9 L41 20 L24 36 L7 20 Z` (47,6)                                                                         |
| V      | las variantes literales del 20 de octubre | `00-encargo.md` §7.1                             | las de la tabla de §9.3: ninguna pasa los cuatro criterios                                                                                                                                                                                               |

### 9.5 La bandera del nacional, del sprite

Con D-00d no hay colores de banda que generar: el nacional lleva la misma bandera que la web pinta junto al nombre, la celda de 64 × 48 del sprite (D-49, §12.7), y `NATIONAL_SASH`, su generador y sus sobrescrituras desaparecen; Corea sale con su taegeuk y sus trigramas, porque sale su bandera. **Para medir**, `packages/db` no puede decodificar el WebP de la web, así que `apps/web/scripts/flag-sprite.mjs` escribe también las 133 celdas a 32 × 24 en RGB, que basta para 28 px (la caja de la bandera mide 26,4 px de ancho): `packages/db/src/flagCells.generated.bin`, 306.432 bytes (133 × 32 × 24 × 3), y `flagCells.generated.ts`, con el orden de los países y la huella SHA-256 de `flag-icons` y del script. `drawnDistance` (§8.4) muestrea esas celdas para la capa de la bandera, y su huella entra en `KIT_GEOMETRY_HASH`. **Cómo se revisa**: con `--hoja`, el script escribe una hoja con los 133 nacionales y el mundial a 72 y a 28 px, que el PR del paso 17 adjunta y el revisor mira entera. Dos países de bandera igual en `flag-icons` 7.5, Indonesia y Mónaco (dos bandas, roja y blanca), visten igual, y los separa el texto.

### 9.6 La 7-h de E2, contestada

La decisión 7-h de E2 ([DOC 41]; `docs/retransmision.md` l. 5229) descartó para el campeón provisional «el maillot del equipo con una banda de bandera, que en gris se confunde con el verde». El nacional de D-00d no es el maillot del equipo: es la bandera entera con la estrella, y se mide a 28 px (`medir28.json`; H-09). **Frente a los líderes**, ninguno de los 133 baja de 11,6 en las cuatro visiones (San Vicente y las Granadinas, el más cercano); en grises no está medido. **Frente a las equipaciones**, 17 nacionales tienen alguna de las 536 a menos de 10 en alguna visión (Portugal, Polonia, Kazajistán, Lituania, Bielorrusia, Bulgaria, China, Marruecos, Argelia, Vietnam, Azerbaiyán, Kirguistán, Baréin, Burkina Faso, Omán, Montenegro y Macao), con 21 maillots, y el peor es Marruecos frente a `plain.red`: 6,3 en visión normal, 4,7 en protanopía, 4,3 en deuteranopía y en tritanopía y 3,1 en grises. La tabla de choques los reserva (§8.1 y §8.4), así que tras la reserva ningún nacional queda a menos de 10 de un maillot permitido en las cuatro visiones; sin la estrella del pecho habría más, y no está medido cuántos. **Lo que mide `packages/db/src/champion.test.ts`** (9-h), antes del paso 17: las 138 señales a 10 o más de todo maillot permitido y de los tres líderes en las cuatro visiones a 28 px, con los grises escritos; las señales entre sí (el mundial frente a los nacionales de cuerpo blanco, como Japón o Chipre, y los nacionales entre sí), con la lista de los pares por debajo de 10, que hoy se sabe que incluye a Indonesia y Mónaco; y la distancia del mundial, del continental y de cada nacional a la marca, que no puede bajar de la medida aquí (12,7 el mundial en visión normal).

### 9.7 Los líderes

`LeaderJersey` (`apps/web/src/components/ui/LeaderJersey.tsx`) redibuja los tres que pidió el dueño ([DUEÑO 1]: «poner un maillot amarillo en todas las clasificaciones… y uno verde al que vaya primero por puntos… y uno azul al que vaya primero en la montaña», `docs/navegacion.md` l. 455-459, agosto de 2026), con sus colores y las marcas de telefono §6.5 (D-28), en `LEADER_JERSEY` de `kit.ts`:

| Maillot (pantalla) | Base      | Marca, en u                                                                          | La marca a 28 px               | Contraste de la marca           |
| ------------------ | --------- | ------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------- |
| `Race leader`      | `#facc15` | ninguna, liso                                                                        | (el cuerpo)                    | (no tiene)                      |
| `Points leader`    | `#16a34a` | banda **blanca** de y 23 a 33, la región de `band` (hoy `#bbf7d0` de 7 u)            | 5,83 px (hoy 4,08)             | 3,30:1 (hoy 2,72, mapa 03 §4.1) |
| `Mountains leader` | `#2563eb` | cinco lunares blancos de radio 4 u en los centros de `Jersey.tsx` l. 80-86 (hoy 3,4) | 4,67 px de diámetro (hoy 3,97) | 5,17:1                          |

```ts
// packages/shared/src/kit.ts (la banda usa la región de `band`; los lunares, los centros de hoy)
export const LEADER_DOTS = [
  [19, 22],
  [29, 22],
  [24, 29],
  [19, 36],
  [29, 36],
] as const
export const LEADER_JERSEY = {
  gc: { base: '#facc15', mark: null },
  points: { base: '#16a34a', mark: { kind: 'band', fill: '#ffffff' } },
  kom: { base: '#2563eb', mark: { kind: 'dots', fill: '#ffffff', radiusU: 4 } },
} as const satisfies Record<JerseyKind, { readonly base: string; readonly mark: object | null }>
```

**Medidos a 28 px** (`medir28.json`): entre sí no bajan de 19,8 en las cuatro visiones (en grises, 13,3 a 16 px, telefono); el maillot permitido más cercano queda, del amarillo, a 13,7, 10,8, 11,9 y 11,8 (5,3 en grises, `plain.sky`); del verde, a 14,9, 14,1, 11,0 y 10,5 (3,4 en grises, `band.pink.yellow`); y del azul, a 16,8, 13,1, 14,4 y 13,8 (11,0 en grises). Están a 10 o más en las cuatro porque lo que queda más cerca está reservado (§8.1): la banda del verde es también la figura `band`, y lo reservado es quedar a menos de 10 de él. El filete es el de hoy, `rgba(0,0,0,0.35)` de 1,5 u, o el claro sobre oscuro (§9.10); `role="img"`, con `aria-label` y `<title>` de `JERSEY_LABEL` (`jerseys.ts` l. 145-149). El 3,30 del blanco sobre verde lo da `contraste.py`; el 5,17 de los lunares es del mapa 03. `leaderJerseys.test.tsx` l. 28-88 se re-sella con la banda de 10 u y los lunares de 4.

### 9.8 El dorsal del equipo líder

No vuelve como dibujo (D-29, DD-06). El dueño lo mandó quitar porque en su teléfono se leía «Ill» ([DUEÑO 5]: el commit `994b83c`, del 13 de agosto de 2026, cuenta que el dueño lo vio junto a «Welle Team» y «pregunto que significaba «Ill»», y `6e1b758`, del 15, que «El dueño pide quitarlo, y esta vez es quitarlo de verdad»; mapa 04). En su lugar, la clasificación por equipos pinta el maillot de cada equipo con `Kit` a 28 px delante del nombre, donde hoy va la bandera (`TeamClassTable.tsx` l. 35; identidad §6.4), en filas de 44 px o más (D-00b), y `TeamClassTable` gana la prop `leaderTeamId: string | null`: en la tabla de una etapa, donde la fila 1 es el ganador del día y no el líder (`StageReplay.tsx` l. 230 y 236; `Race.tsx` l. 531; X-14), el equipo de `leaders.team` (`jerseys.ts` l. 128-130) lleva el `Chip` `neutral` `Leads overall` (pantalla); en la acumulada, la fila 1 ya lo es y no lleva nada más. `leaderJerseys.test.tsx` l. 81-88 sigue sellando la ausencia del dorsal, y `stageTables.test.tsx` sigue pasando con el maillot en cada fila, porque cuenta por etiqueta exacta y toma el primer enlace de la fila (l. 35-36 y 43-48; X-13, codigo C10). Los documentos que lo dan por pintado se corrigen en el paso 24 (D-58): `docs/navegacion.md` l. 462-466, 492-495 y 501-504 y cinco líneas de `docs/retransmision.md`.

### 9.9 Lo que compra el patrocinador

Para E8, que vende sitio en la camiseta («Que pueda pagar por imponer su color o por llevar su logotipo en el sitio bueno», `docs/encargos.md` l. 463-465; [DUEÑO 4]), E3 da el vocabulario y sus reglas (D-30, I-14, O-24), y nada más:

```ts
// packages/shared/src/kit.ts
export type KitZone = 'base' | 'secondary' | 'chest'
export interface SponsorOffer {
  readonly zone: KitZone
  /** 'base' o 'secondary': el color del vocabulario más cercano al de su marca */
  readonly color?: KitColorName
  /** 'chest': el patrocinador de la lista cerrada (DD-19) */
  readonly sponsorId?: string
}
/** El maillot con la oferta puesta; lanza si la zona no existe en ese maillot ('secondary' en un 'plain'). */
export declare function applySponsor(kit: Kit, offer: SponsorOffer): Kit
/** El color de KIT_COLORS (de KIT_BASES para la base) a menor ΔE00 en visión normal. */
export declare function nearestKitColor(hex: string, zone: 'base' | 'secondary'): KitColorName
```

**Un color**, de base o de segundo, de los quince: el de su marca va al más cercano y el maillot que resulta tiene que pasar `checkKit`, también `kit_ocupado`; si no pasa, la pantalla de E8 ofrece el más cercano que pasa. `chest` no cambia el `Kit`: el nombre viaja aparte. **Su nombre**, en el pecho, solo desde `KIT_SPONSOR_TEXT_MIN_PX` = 72 px (X-24, por cálculo; sin evidencia de los jueces): la letra mínima de 12 px vale también en SVG, y a 72 px una unidad mide 1,5 px, así que una letra de 8 u mide 12 px y cabe en una banda de 10 u; por debajo, el nombre va en `aria-label` y en `<title>`. El pecho mide 20 u de ancho (x de 14 a 34, `TORSO`), 30 px a 72; con un avance de unos 0,65 em por mayúscula a 600 (estimado, sin medir con la letra del sistema) caben tres letras con 1 u de margen, así que cada patrocinador de la lista lleva, además de su nombre, una **marca de pecho de dos o tres mayúsculas**, que es la que se pinta y hace de «logotipo» (9-a). A 72 px o más, el pecho de y 23 a 33 se pinta de un solo color, el segundo en `band` y la base en las demás figuras, y la marca va encima, centrada en (24, 28) en `caption` 600, en blanco o en `ink` `#10202f` según cuál contraste más: las peores de los quince son `pink` con `ink` y `blue` con blanco, 4,79:1 (`contraste.py`; 9-b, 9-c). La lista es cerrada y generada (DD-19), sin texto libre que moderar. Nadie compra una figura, un color reservado, la estrella ni el cuerpo blanco. La fila de `team_kits` lleva `set_by = 'sponsor'` y `sponsor_deal_id`, y al acabar el contrato una fila `system` devuelve el maillot anterior si sigue libre, o el libre más cercano de `ensureKits` si no. `Kit` gana la prop `chest?: { mark: string; name: string }` para que E8 la llene cuando exista. El reparto:

| Qué                  | Lo da E3                                                 | Lo decide E8                                                                                |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| qué se puede comprar | `KitZone`: un color de base, un segundo color o el pecho | qué zonas se venden y a quién                                                               |
| el color             | `nearestKitColor`, `applySponsor` y `checkKit`           | el precio, y qué pasa si no pasa `checkKit`                                                 |
| el nombre            | la marca de pecho desde 72 px, su sitio y su color       | la lista cerrada de patrocinadores (DD-19)                                                  |
| cuánto dura          | la fila `sponsor` de `team_kits` y la vuelta al anterior | el contrato, la exclusividad por categoría (`docs/epics.md` G2.8) y lo que pierde el equipo |

Un ejemplo: Noord Cycling lleva `hoops.navy.yellow` y firma con un patrocinador de rojo `#d0021b` en el segundo color; `nearestKitColor('#d0021b', 'secondary')` da `red`, `applySponsor` da `hoops.navy.red`, y si `checkKit` dice `kit_ocupado` o `kit_se_confunde`, E8 ofrece el siguiente más cercano que pase.

### 9.10 `WornJerseyIcon`

Sigue en `apps/web/src/components/broadcast/WornJerseyIcon.tsx` y sigue siendo **el único sitio de la web que elige dibujo y texto por `WornJersey`** (D-31). Su firma pasa del `{ card, size }` de hoy (l. 12-18) a la del contrato de E2 (`docs/retransmision.md` l. 5210) más el tamaño y la superficie (X-25):

```ts
import type { KitCode, KitSize, WornJersey } from '@cyclingstar/shared'
import type { KitSurface } from '../ui/Kit'

/** El equipo del corredor ese día: su KitCode, o la semilla grabada si la etapa es anterior a la traducción (§8.6). */
export type WornTeam =
  | { readonly name: string; readonly kit: KitCode }
  | { readonly name: string; readonly legacySeed: string }
export interface WornJerseyIconProps {
  readonly worn: WornJersey
  readonly team: WornTeam | null
  readonly size: KitSize // 28 o más (D-00b)
  /** 'dark' en el ámbito oscuro: el filete pasa a rgba(255,255,255,0.6) */
  readonly surface?: KitSurface
}
```

Quién dibuja qué: `leader`, `LeaderJersey` con `JERSEY_LABEL`, `Race leader` (pantalla); `champion`, `ChampionJersey` con `championTitleText`, `Champion of Italy`; `team`, `Kit` con `Mistral Racing kit` (hoy `Team jersey` para todos, `Jersey.tsx` l. 25), o `LegacyJersey` con el mismo texto si llega `legacySeed`; sin equipo, el hueco de hoy, del ancho del tamaño y `aria-hidden` (l. 28-29). `wornTeamOf(card: RiderCard): WornTeam | null` traduce `RiderCard.team` (§8.5). En `RiderLabel` es el maillot que va tras el nombre (D-00c). **La superficie** (I-24): con `surface="dark"` el filete de los cuatro dibujos pasa a `rgba(255,255,255,0.6)`, 6,55:1 sobre la noche (identidad §6.1); sin él, el `navy` `#172a5b` sobre `navy-dark` `#0b2740` queda a 6,9 de ΔE00 en visión normal, 3,8 en tritanopía y 2,3 en grises (juez de uso, `oscuro.py`). `CueCard` se la pasa siempre, porque sus fondos son `bad`, `navy-dark` e `ink-2` (D-56, §14.5); la capa fija y lo que vaya en el ámbito oscuro, también. Los sitios de hoy, todos a 28 px (D-00b; cómo cabe cada línea de E2, §14):

| Sitio                                                                                                                                                    | Hoy                                         | Con E3                                                                         | `surface`            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------- |
| `GroupBar.tsx` l. 204 y 242                                                                                                                              | `WornJerseyIcon` de 14 (el defecto) y de 13 | un `Kit` por equipo con su cuenta, y `WornJerseyIcon` para líderes y campeones | la de su fondo (§14) |
| `TimeTrialBoard.tsx` l. 86; `CueCard.tsx` l. 61, 84 y 116                                                                                                | `WornJerseyIcon` de 13; de 14, 13 y 16      | `WornJerseyIcon`                                                               | `dark` en `CueCard`  |
| `CueCard.tsx` l. 122, el equipo del rótulo                                                                                                               | `Jersey` de 13 por la semilla               | `Kit` o `LegacyJersey`, por `wornTeamOf`                                       | `dark`               |
| `GroupBar.tsx` l. 113, `StageStory.tsx` l. 103, `RaceRadioPanel.tsx` l. 210, `ChronicleSentence.tsx` l. 25, `VoiceTicker.tsx` l. 78, `CueCard.tsx` l. 90 | `LeaderJersey` de 12 a 14                   | `LeaderJersey`                                                                 | `dark` en `CueCard`  |
| `StageCards.tsx` l. 110 y 292; `RiderJersey` en las tablas (§8.3)                                                                                        | `LeaderJersey` de 15                        | `LeaderJersey`, en filas de 44                                                 | `light`              |

`docs/retransmision.md` l. 5210 gana `size` y `surface` en el paso 24 (D-58).

---

**Injertos aplicados.** I-12 (§9.4: la banda de honor, con su dibujo y sus cifras, como la alternativa que el dueño descartó; D-00d), I-13 (§9.3: la tabla de variantes con los cuatro criterios, el espectro en la diagonal como alternativa C y la elegida medida a 28 px), I-14 (§9.9: el patrocinio con `set_by` y la vuelta al maillot anterior), I-24 (§9.10: `surface` y el filete claro; la geometría, §8.3).

**Objeciones resueltas.** O-14 (§9.2: la objeción era que el blanco con estrella se acerca a la marca; el dueño lo eligió, y su distancia, 12,7 y 9,2 en grises a 28 px, queda escrita como su coste), O-15 (§9.3: la C de telefono, descartada por su medida y no por el SPEC), O-24 (§9.9: el nombre de una lista cerrada y solo desde 72 px).

**Huecos rellenados.** H-09 (§9.6: por qué el nacional no cae en el defecto de la 7-h, con su medida a 28 px, y lo que mide `champion.test.ts`). Contradicciones de hecho escritas: X-13 (§9.8), X-14 (§9.8), X-16 (§9.2: mandan las distancias del juez para lo medido a 13 px; lo elegido se mide aquí a 28), X-17 (§9.1), X-24 (§9.9: 72 px por cálculo) y X-25 (§9.10).

**Decisiones de esta sección.**

- 9-a. El pecho de 20 u solo admite tres letras de 12 px a 72 px (cálculo de §9.9), así que lo que se pinta es una marca de pecho de dos o tres mayúsculas que trae cada patrocinador de la lista cerrada, y el nombre entero va en el `aria-label`. Descartado: el nombre entero, que a 72 px no cabe, y bajar la letra de 12 px.
- 9-b. A 72 px o más el pecho de y 23 a 33 se pinta de un solo color bajo la marca, porque en `hoops`, `halves`, `sides` y `sash` cruza dos colores y la marca no tendría un contraste fijo. Descartado: vender el pecho solo en `plain` y `band`.
- 9-c. La marca de pecho va en blanco o en `ink`, y la peor de los quince queda a 4,79:1. Descartado: `navy-dark`, con el que `pink` baja a 4,41:1.
- 9-d. `WornJerseyIconProps.team` es una unión con `legacySeed` para lo grabado antes de la traducción, que §G.5 no recoge (la duda 1).
- 9-e. La estrella del mundial mide 18 u y va en (24, 28,5), en el pecho de 20 u con 1 u de margen; la del nacional, 10 u en (24, 25), para dejar ver la bandera. El degradado va en diagonal, de arriba a la izquierda a abajo a la derecha. Descartado: el degradado vertical, cuyos colores se apilarían en franjas horizontales como las de la marca.
- 9-f. La caja de la bandera es el alto del torso a 4:3, la proporción de la celda del sprite, centrada: la bandera se ve entera de alto y recortada de lados. Descartado: pintar el SVG de `flag-icons`, que D-49 saca de la web.
- 9-g. El componente se llama `ChampionJersey` y no `ChampionSash`: ya no lleva banda y `sash` es ahora una figura de equipo (§8.1). Ver la duda 2.
- 9-h. `champion.test.ts` va en `packages/db`, junto al rasterizador (§8.4), y no en `packages/shared`. Ver la duda 4.

**Propuesto para el glosario.** `ChampionJersey` (en lugar de `ChampionSash`, 9-g), con `data-variant` `world`, `national` o `continental`; `LOGO_STAR` (la estrella del logotipo, que pasa de `Logo.tsx` a `kit.ts`); `CHAMPION_RAINBOW`, `CHAMPION_STAR_EDGE`, `WORLD_STAR`, `NATIONAL_STAR`, `NATIONAL_FLAG_BOX` y `starTransform` (en `kit.ts`); `packages/db/src/flagCells.generated.bin` y `flagCells.generated.ts` (las celdas de las banderas para medir, que escribe `flag-sprite.mjs`, con su `--hoja` de campeones); `packages/db/src/champion.test.ts` (las 138 señales a 28 px, y su distancia a la marca, que no baja); `nearestKitColor(hex, zone)` (en `kit.ts`); `WornTeam` y `wornTeamOf(card)` (en `broadcast/WornJerseyIcon.tsx`); la prop `leaderTeamId` de `TeamClassTable`; la prop `chest` de `Kit`, con la marca de pecho de dos o tres mayúsculas de cada patrocinador; y los textos (pantalla) `World champion`, `Continental champion` y `U23 champion of Italy`. Salen del glosario, por D-00d: «la banda de honor» y «la banda nacional, el papel, el filo», `SASH_PATH` (hoy la región de `sash` en `KIT_FIGURE_PATHS`), `SASH_STRIPES`, `CHAMPION_NIGHT`, `CHAMPION_PAPER`, `NATIONAL_SASH_EDGE_U`, `NATIONAL_SASH`, `NATIONAL_SASH_OVERRIDES`, `nationalSashOf` y `apps/web/scripts/national-sash.mjs`.

**Dudas para el ensamblador.**

1. §G.5 da `WornJerseyIconProps` con `team: { name: string; kit: KitCode } | null`; esta sección le añade el miembro `{ name, legacySeed }` (9-d) porque D-23 dibuja lo grabado antes con su semilla. Es la misma duda que la 1 de §8.
2. El glosario (l. 188 y 468) y el lote L1 (§2.7 y la tabla de §4, `04-componentes.md` l. 359) llaman `ChampionSash` al componente; aquí es `ChampionJersey` (9-g), y el ensamblador debería dejar uno.
3. §3.8 del lote L1 (`03-fundamentos.md` l. 135) cuenta `NATIONAL_SASH` entre el material generado; con D-00d no existe, y lo generado del campeón son `flagCells` y su hoja (§9.5).
4. §G.10 pone `champion.test.ts` en `packages/shared`, pero mide con `drawnDistance`, que está en `packages/db` (§8.4), y `db` depende de `shared` y no al revés (9-h).
5. El sprite de D-49 tiene 64 × 48 por bandera, el triple de 21 × 16; en el maillot de 28 px o más de un teléfono de densidad 3 se amplía (1,24 veces a 28, 1,77 a 40). Si la hoja del paso 17 enseña los escudos blandos, el sprite tendría que crecer, y `FLAG_SPRITE_MAX` (60 KB) con él; está sin mirar en un aparato.
6. Para §19, lo que añade el orquestador y el dueño puede quitar: el espectro de seis paradas en diagonal, el filo `navy-dark` y la estrella dorada del nacional. Lo que se sabe de quitarlas: sin el filo, la estrella dorada queda a 2,19:1 del blanco y la parada amarilla del arcoíris a 1,40:1; sin la estrella del nacional, más maillots de equipo quedarían reservados por parecerse a una bandera (los 21 de hoy, con ella; la duda 3 de §8).
7. D-27 y la tabla de DD-03 dan 9,4 y 1,4 a 16 px para «otros colores»; la página de opciones midió V4 a 13 px en 8,7 de visión normal y 1,5 en grises, que es lo que dice identidad. No se contradicen (son tamaños distintos), pero §19 debería citar los dos con su tamaño.
