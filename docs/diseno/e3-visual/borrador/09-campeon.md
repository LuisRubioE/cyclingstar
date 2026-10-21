## 9. Los maillots (II): la señal de campeón, los líderes, el patrocinador y `WornJerseyIcon`

Esta sección dibuja lo que un maillot de equipo no puede llevar: la señal de campeón por defecto, entera (D-26), con la palabra del dueño juzgada variante a variante (D-27); los tres de líder (D-28) y lo que sustituye al dorsal del equipo líder (D-29); lo que compra un patrocinador (D-30); y el único componente que elige el dibujo de un corredor, `WornJerseyIcon` (D-31). Las alternativas de la señal van a `opciones/index.html` y aquí solo se nombran con sus cifras (§9.4); la decisión es del dueño (DD-03, §19). El vocabulario del equipo, `Kit` y `KitSurface` son de §8. Nada de lo que se dice de la marca de la UCI es asesoramiento jurídico.

### 9.1 La banda de honor

**El dibujo** (D-26, I-12; el de identidad §6.5). Una banda de 10 u del hombro izquierdo a la cadera derecha, con su línea central de (10, 10) a (38, 42), recortada por `TORSO`, que ningún otro maillot puede llevar (§8.1). En `packages/shared/src/kit.ts`, en u:

```ts
export const SASH_PATH = 'M13.76 6.71 L41.76 38.71 L34.24 45.29 L6.24 13.29 Z'
/** Las tres franjas paralelas de la nacional, de 10/3 u, de la de arriba a la de abajo. */
export const SASH_STRIPES = [
  'M13.76 6.71 L41.76 38.71 L39.25 40.9 L11.25 8.9 Z',
  'M11.25 8.9 L39.25 40.9 L36.75 43.1 L8.75 11.1 Z',
  'M8.75 11.1 L36.75 43.1 L34.24 45.29 L6.24 13.29 Z',
] as const
export const CHAMPION_NIGHT = '#14213d'
export const CHAMPION_GOLD = '#e0a526'
export const CHAMPION_PAPER = '#f6f3ea'
export const CHAMPION_SILVER = '#c0c7d2'
export const NATIONAL_SASH_EDGE_U = 2.4
```

`ChampionSash` (`apps/web/src/components/ui/ChampionSash.tsx`, props `{ title: ChampionTitle; size: KitSize; surface?: KitSurface }`) pinta, de abajo arriba: el torso en su campo; dentro del `clipPath` de `TORSO`, la banda; el filete de los líderes, `rgba(0,0,0,0.35)` de 1,5 u (`Jersey.tsx` l. 113), o el claro de `surface="dark"` (§9.10); y el cuello de `COLLAR`. Es `role="img"`, con `aria-label` y `<title>` de `championTitleText` (`broadcast/names.ts` l. 153-170), y `data-ui="ChampionSash"` con `data-variant` `world`, `national` o `continental`. Los tres:

- **Mundial** (lo correrá E12): campo `CHAMPION_NIGHT`, banda y cuello `CHAMPION_GOLD` (7,29:1 contra la noche), sin bandera; `World champion` (pantalla).
- **Nacional**: campo `CHAMPION_PAPER`; la banda partida en las tres `SASH_STRIPES` con los colores de su bandera (`NATIONAL_SASH`, §9.5); un filo `CHAMPION_NIGHT` de `NATIONAL_SASH_EDGE_U` = 2,4 u, que es el trazo de `SASH_PATH` sin relleno (14,40:1 contra el papel); el cuello del color de la primera franja; y la bandera al lado, como hoy (`Jersey.tsx` l. 165: alto de `max(8, round(0,6 × tamaño))` px, del sprite, §4.6), porque 26 países salen con una banda de un color con blanco en medio (identidad §6.5); `Champion of Italy` (pantalla). El papel queda a 1,11:1 de `surface` y a 1,01 de `canvas`, así que sobre claro el torso se lee por su filete y lo que se ve es la banda, como hoy con la estrella (mapa 03 §5.2).
- **Continental** (E12): banda y cuello `CHAMPION_SILVER` sobre noche (9,39:1), provisional hasta que E12 decida los continentes; `Continental champion` (pantalla), el texto provisional de `names.ts` l. 163.

```tsx
// apps/web/src/components/ui/ChampionSash.tsx
import * as K from '@cyclingstar/shared'
import { memo, useId } from 'react'
import { Flag } from './Flag'
import type { KitSurface } from './Kit'

export interface ChampionSashProps {
  readonly title: K.ChampionTitle
  readonly size: K.KitSize
  readonly surface?: KitSurface
}

export const ChampionSash = memo(function ChampionSash(p: ChampionSashProps) {
  const { title, size, surface } = p
  const clip = `sash${useId().replaceAll(':', '')}`
  const label = K.championTitleText('en', title, K.COUNTRY_NAMES)
  const flag = title.scope === 'national' ? title.country : null
  const stripes = flag === null ? null : K.nationalSashOf(flag)
  const sash = title.scope === 'world' ? K.CHAMPION_GOLD : K.CHAMPION_SILVER
  const filet = surface === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.35)'
  const edge = { fill: 'none', stroke: K.CHAMPION_NIGHT, strokeWidth: K.NATIONAL_SASH_EDGE_U }
  return (
    <span data-ui="ChampionSash" data-variant={title.scope} className="inline-flex gap-0.5">
      <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={label}>
        <title>{label}</title>
        <clipPath id={clip}>
          <path d={K.TORSO} />
        </clipPath>
        <path d={K.TORSO} fill={stripes === null ? K.CHAMPION_NIGHT : K.CHAMPION_PAPER} />
        <g clipPath={`url(#${clip})`}>
          {stripes === null && <path d={K.SASH_PATH} fill={sash} />}
          {stripes?.map((c, i) => (
            <path key={i} d={K.SASH_STRIPES[i]} fill={c} />
          ))}
          {stripes !== null && <path d={K.SASH_PATH} {...edge} />}
        </g>
        <path d={K.TORSO} fill="none" stroke={filet} strokeWidth="1.5" />
        <path d={K.COLLAR} fill={stripes?.[0] ?? sash} />
      </svg>
      {flag !== null && <Flag code={flag} size={Math.max(8, Math.round(size * 0.6))} />}
    </span>
  )
})
```

Las razones de contraste de esta lista son de un cálculo de esta sección (`<scratchpad>/redactor-L2/contraste.py`, WCAG 2.x); ninguna fuente las daba. **Ruta y crono, élite y sub-23 comparten el dibujo** y los separa el texto (`Time trial champion of Italy`, `U23 champion of Italy`, pantalla), porque `wearableTitles` solo deja llevar los títulos de la disciplina y la categoría del día (`jerseys.ts` l. 270-275; cobertura C1; X-17), así que en una etapa nunca coinciden dos que haya que separar por la forma. **Cómo se ve**, en píxeles (px = u × tamaño / 48; identidad §6.5):

| Pieza                                     | 13 px | 16 px | 28 px | 72 px |
| ----------------------------------------- | ----- | ----- | ----- | ----- |
| la banda, 10 u                            | 2,71  | 3,33  | 5,83  | 15,0  |
| cada franja nacional, 10/3 u              | 0,90  | 1,11  | 1,94  | 5,00  |
| el filo nacional, 2,4 u (la mitad, fuera) | 0,65  | 0,80  | 1,40  | 3,60  |
| la bandera de al lado, de alto            | 8     | 10    | 17    | 43    |

A 13 px la mundial es una raya dorada en diagonal de 2,7 px sobre un maillot oscuro y la nacional una raya de color con filo oscuro sobre uno claro; desde 28 px se leen las tres franjas. Es la única forma de las candidatas que se reconoce a 13 px con densidad 1, mirada en píxeles (`hojas/pix-13-1.png` de identidad): el galón se lee como una V, y la corona y la estrella ya son bultos.

### 9.2 Por qué no es el arcoíris

La marca es `five horizontal stripes composed of colours blue, red, black, yellow and green (in this order)` sobre blanco, registrada a nombre de la UCI y `a unique identifier of the UCI World Championships and of the UCI alone`; la guía 5.3 regula también la vertical y la diagonal y fija el orden (`No other order will be approved`), y la UCI cobra licencia y la retira (`00-encargo.md` §7.1). El registro encontrado es el del logotipo, la registración internacional 1276964 de la OMPI, con los cinco colores reivindicados y las clases 12, 25 y 41; el de las bandas solas no se ha encontrado (mapa 03 §7.1). La banda de honor no tiene ninguno de los elementos de la marca: es una sola franja, en diagonal, sin sus cinco colores, y el campeón del mundo es el único que no viste blanco.

**Las distancias**, re-medidas por el juez de cobertura con el rasterizador del mapa 03 recortado al torso (`juez-cobertura/medida.py`; X-16), que son las que mandan: a 13 px, la mundial queda a 45,7 de ΔE00 dibujado de la marca (37,6 en grises), la nacional de Italia a 22,6 (15,7) y la de España a 26,0 (18,1), frente a 15,1 y 9,2 de la estrella sobre blanco y a 12,2 del `ChampionMark` de hoy (O-14). La página de opciones, que pinta con Chromium a 13 px y densidad 1, da 46,3 y 37,9 para la mundial, 21,4 y 14,2 para Italia, 24,9 y 16,8 para España y 25,6 y 17,7 para Bélgica (`opciones/index.html`, `campeon.disenos`), del mismo orden. Frente a los maillots: la mundial queda a 24,5 en visión normal y 15,8 en grises del vocabulario de identidad (identidad §6.5); frente al de D-20, `champion.test.ts` (§9.6). `SPEC.md` §8 (l. 874) pide verificar contra la EUIPO y la USPTO antes del lanzamiento; es una tarea del dueño, no un PR de E3 (D-59, §18).

### 9.3 La palabra del dueño, variante a variante

El dueño, el 20 de octubre de 2026 ([DUEÑO 2]): «una cosa, lo del arco iris, si esta registrado y tiene que ser diferente... igual puede ser un maillot arco iris diferente... con diferentes colores, diferente orden, diferente disposicion, incluso verticales en vez de horizontales... o que el resto en vez de ser blanco sea de otro color, no se, creatividad por favor» (`docs/diseno/e3-visual/00-encargo.md` l. 221-224, conversación de diseño de E3). Cada variante, con los cuatro criterios de `00-encargo.md` §7.1 y las cifras de las propuestas y del mapa 03, sin medir de nuevo (D-27; I-13). «A la marca» es la distancia dibujada a la marca, en visión normal y en grises; «equipación» es la más cercana del vocabulario de cada propuesta en las cuatro visiones:

| Variante                                                                                  | 1. A la marca de la UCI                                                                                  | 2. Forma                                                       | 3. Equipación más cercana, y cuántas por debajo de 10      | 4. Reservable | Veredicto                         |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- | ------------- | --------------------------------- |
| otros colores: cinco bandas de 2 u sobre blanco                                           | es la estructura de la marca; 9,4 y 1,4 a 16 px (telefono), 8,7 y 1,5 a 13 (identidad V4)                | bandas de 0,67 px a 16, que el navegador mezcla (mapa 03 §7.3) | 14,7, 12,9, 13,8 y 14,8; ninguna (telefono)                | sí            | fuera: más cerca que otro orden   |
| otro orden                                                                                | la guía fija el orden y el público no lo nota (inrng, 2011); 14,1 y 5,3 (telefono), 14,9 y 5,3 (V1)      | ídem                                                           | 16,2, 13,8, 13,5 y 15,0; ninguna                           | sí            | fuera                             |
| en vertical o en diagonal                                                                 | la guía regula las dos; 22,5 y 14,7 (telefono), 14,4 y 8,4 (V2 y V3); en vertical, invertir es un espejo | ídem                                                           | 15,1, 11,8, 10,9 y 12,1; ninguna                           | sí            | fuera                             |
| otro fondo: navy                                                                          | los colores de la UCI en su orden siguen siendo la marca; 40,7 y 39,5                                    | «azul con algo en el pecho»                                    | 13,8, 8,4, 6,0 y 11,8: 4 en protanopía y 5 en deuteranopía | choca         | fuera                             |
| otro fondo: oro                                                                           | ídem; 22,7 y 12,5                                                                                        | ídem                                                           | 17,8, 8,7, 7,7 y 14,5: 1 y 4; a 17,9 del amarillo de líder | choca         | fuera                             |
| espectro continuo en banda horizontal, sobre noche (V7)                                   | ni cinco bandas, ni sus colores, ni blanco, pero «el arcoíris en el pecho»; 58,9 y 51,3                  | banda horizontal: la de `band` y la del verde                  | 16,8, 15,1 y 6,8 en grises: 12 (identidad)                 | no            | fuera; su diagonal es la de abajo |
| **la más fuerte**: el espectro de siete paradas en la diagonal, sobre noche (identidad C) | no es la marca, pero evoca «el arcoíris del campeón del mundo» (`SPEC.md` l. 874); 48,7 y 38,2           | la de la banda de honor                                        | 24,9, 20,8 y 14,1 en grises: ninguna                       | sí, diagonal  | **alternativa C de DD-03**        |

Las señales propias que se midieron y se dejan, con el mismo método (identidad §6.5, `exp1_senal.py` y `exp11_candidatas.py`, a 13 px; la columna 3 es el vocabulario de identidad en visión normal, la peor dicromacia y grises, con cuántas bajan de 10 en grises):

| Señal propia                                 | 1. A la marca                      | 2. Forma a 13 px                                     | 3. Equipación más cercana | Veredicto             |
| -------------------------------------------- | ---------------------------------- | ---------------------------------------------------- | ------------------------- | --------------------- |
| la estrella de hoy (`ChampionMark`)          | 12,5 y 8,2                         | «blanco con algo oscuro en el pecho» (mapa 03)       | 10,1, 8,1 y 7,2 (35)      | sustituida            |
| corona de cumbres, el perfil de tres puertos | 51,0 y 45,0                        | se lee `King of the Mountains`, la de la montaña     | 12,5, 11,1 y 6,8 (19)     | fuera                 |
| meridianos                                   | 48,0 y 43,4                        | una mancha                                           | 16,2, 12,4 y 7,1 (52)     | fuera                 |
| la estrella grande del logotipo              | 49,0 y 41,7                        | un bulto                                             | 15,8, 14,4 y 9,7 (5)      | fuera                 |
| el galón en V                                | 47,6 y 39,7                        | una V; con la nacional de Italia, 47 bajan en grises | 18,4, 16,8 y 10,7 (0)     | alternativa, en la E  |
| **la banda de honor**                        | 44,3 y 35,5 (el juez, 45,7 y 37,6) | una raya cruzada, la única que sobrevive             | 24,5, 22,5 y 15,8 (0)     | **por defecto, la A** |

La variante más fuerte del dueño cambia a la vez lo que él ofreció cambiar (colores, orden, disposición y fondo) y pasa los cuatro criterios, con su coste escrito: elegirla pide reescribir `SPEC.md` l. 874 como «las cinco bandas de la UCI» y verificarla ante la EUIPO y la USPTO (I-13). **Las señales propias** que pide `00-encargo.md` §7.1 (punto 2), sin depender de bandas de colores: la banda de honor (A, la de §9.1), las dos estrellas (B y D) y el galón (en E). Las tres franjas de 7 u navy, cian y oro sobre blanco de telefono (23,0 y 14,6 de la marca a 16 px) se presentan como señal propia con bandas y no como la variante más fuerte del dueño, porque conservan el blanco y la horizontal, los dos rasgos que él ofreció cambiar; se descartan por su medida, el «blanco con franjas en el pecho» de la estructura de la marca a 13 px, y no por el SPEC (O-15).

### 9.4 Las alternativas que van a la página de opciones

`opciones/index.html` las pinta a 13, 16, 28 y 72 px sobre blanco y a 13 px dentro de un pelotón, con su simulación de daltonismo; el documento implementa la A. Las cifras, de `juicios/veredicto.json` → `gusto` (DD-03) y de las propuestas citadas:

| Opción | Nombre                            | Origen                                           | Valores y cifras                                                                                                                                                                                                                                  |
| ------ | --------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | la banda de honor (por defecto)   | identidad A                                      | §9.1; la mundial a 45,7 de la marca (37,6 en grises) a 13 px, Italia a 22,6 (15,7)                                                                                                                                                                |
| B      | la estrella dorada sobre marino   | sistema S1                                       | torso `#14284b`, estrella `#f0b323` de radio 9,5 u y 3,9 en (24, 29), canesú dorado la mundial; a 50,3 de la marca; a 13 px la estrella mide 4,9 × 4,7 px y todos los nacionales visten igual; `Sash` vuelve al vocabulario                       |
| C      | el arcoíris diferente del dueño   | identidad C                                      | la banda de A con un degradado de siete paradas iguales (`#e53935`, `#fb8c00`, `#fdd835`, `#43a047`, `#1e88e5`, `#5e35b1`, `#d81b60`) sobre noche y cuello blanco; 48,7 (38,2 en grises); reescribir `SPEC.md` l. 874 y verificar                 |
| D      | la estrella sobre blanco          | telefono A y lectura (a)                         | el `ChampionMark` que el dueño ya ha visto: cuerpo `#ffffff` reservado, estrella navy de 13 u y 6,2 en (24, 28,5); la mundial `#e0a106` con borde navy; a 15,1 de la marca y 9,2 en grises a 13 px                                                |
| E      | las otras señales con bandas      | telefono C, sistema D1, lectura (b), identidad B | tres franjas navy, cian y oro sobre blanco (23,0); tres bandas `#1499bb`, `#f0b323` y blanco sobre marino (42,3); tres arcos sobre `#0b2740` (54,9, con un diseño a 9,8 en tritanopía); el galón `M7 9 L24 25 L41 9 L41 20 L24 36 L7 20 Z` (47,6) |
| V      | las variantes literales del dueño | `00-encargo.md` §7.1                             | las de la tabla de §9.3, con su columna de distancia a la marca: ninguna pasa los cuatro criterios                                                                                                                                                |

Si el dueño elige otra, cambian `kit.ts` (la geometría y los colores de la señal, y con B la figura `Sash` vuelve al vocabulario de los equipos), `ChampionSash` y `champion.test.ts`, y se regenera la tabla de choques; antes del paso 17 (DD-03).

### 9.5 `NATIONAL_SASH`

Los colores de las 133 bandas nacionales son material generado (D-08, I-23): `packages/shared/src/nationalSash.generated.ts` exporta `NATIONAL_SASH: Readonly<Record<string, readonly [string, string, string]>>`, por código ISO-2 en mayúsculas, como `riders.country`. **Cómo se genera** (el método de identidad, `exp4_banderas.py` y `banda_nacional.py`): `apps/web/scripts/national-sash.mjs` pinta con el Chromium de Playwright cada bandera de `flag-icons` 7.5 (4:3) a 160 px, agrupa sus colores en CIELAB con `deltaE00` de `colorMath.ts` (de `packages/shared/dist`), se queda con los que cubren más del 10 % del área (y con el del emblema si solo queda uno), toma los tres mayores en orden de lectura y pone el claro en medio si alguno de los de fuera queda a menos de 10 del papel en alguna visión. De las 133 salen 30 banderas de dos colores, 55 de tres y 48 de cuatro o más; salen bien Italia (`#009246`, `#fdfdfd`, `#ce2b37`) y España (`#aa161b`, `#f1bf00`, `#aa161b`), y mal Corea, en negro y blanco, porque pesan más los trigramas (identidad §6.5). **La cabecera** lleva la huella de la versión de `flag-icons` y del propio script, y `nationalSash.test.ts` falla si no casan o si alguna entrada no tiene tres hexadecimales. **Cómo se revisa**: el script, con `--hoja`, escribe una hoja con las 133 a 72 px y a 13 px, que el PR del paso 17 adjunta y el revisor mira entera; lo que esté mal va a `NATIONAL_SASH_OVERRIDES` (`packages/shared/src/nationalSashOverrides.ts`), cada entrada con su porqué, y el generado no se edita a mano. La primera: `KR: ['#cd2e3a', '#ffffff', '#0047a0']`, el rojo y el azul del taegeuk con el blanco en medio. `nationalSashOf(country)` devuelve la sobrescritura si la hay y si no el generado:

```ts
// packages/shared/src/nationalSashOverrides.ts (revisado a mano; cada entrada con su porqué)
export const NATIONAL_SASH_OVERRIDES: Readonly<Record<string, readonly [string, string, string]>> =
  {
    // el generador da negro y blanco porque pesan más los trigramas: el rojo y el azul del taegeuk
    KR: ['#cd2e3a', '#ffffff', '#0047a0'],
  }
// packages/shared/src/kit.ts
export declare function nationalSashOf(country: string): readonly [string, string, string]
```

Un país sin entrada en ninguna de las dos (no debería haberlo: `nationalSash.test.ts` exige las 133 de `COUNTRIES`) pinta las tres franjas en `CHAMPION_SILVER`.

### 9.6 La 7-h de E2, contestada

La decisión 7-h de E2 ([DOC 41]; `docs/retransmision.md` l. 5229) descartó para el campeón provisional «el maillot del equipo con una banda de bandera, que en gris se confunde con el verde». La banda de honor no cae en ese defecto por tres cosas, medidas (H-09): (1) **la forma es otra y está reservada**: la banda del verde y la figura `band` son horizontales, y ningún maillot de equipo ni de líder lleva diagonal; (2) **el campo es papel**, que no lleva ningún equipo (el blanco y el amarillo solo son segundo color); y (3) **el filo de noche de 2,4 u**, elegido midiendo (identidad `exp5b_nacional.py`): con uno de 1,2 u, 720 pares de banda y maillot bajaban de 10 en grises a 13 px; con el de 2,4, quedan 42 a densidad 1 y ninguno a densidad 2, donde las 133 nacionales quedan a 14,0 o más de todo maillot y a 14,2 de los líderes en las cinco vistas, con el vocabulario de identidad. La página de opciones lo confirma frente al vocabulario de telefono aun con `Sash` dentro, que solo puede acercarla: a 13 px y densidad 1, Italia queda a 22,9 en visión normal, 15,4 en la peor dicromacia y 12,1 en grises; España a 24,5, 16,7 y 12,1; Bélgica a 26,1, 18,5 y 13,4 (`campeon.disenos`, a falta del filete de §8.3). Y explica por qué la diagonal sale del vocabulario de los equipos: en esa misma medida, la mundial queda a 10,5 en visión normal y 2,1 en grises de un maillot de telefono con figura `Sash`. **Lo que falta**, que mide `packages/shared/src/champion.test.ts` antes del paso 17: las 134 señales (133 nacionales y la mundial) a 10 o más de todo maillot permitido de D-20 y de los tres líderes, en las cinco vistas, a 13 y a 16 px, también a densidad 1 frente a los líderes.

### 9.7 Los líderes

`LeaderJersey` (`apps/web/src/components/ui/LeaderJersey.tsx`) redibuja los tres que pidió el dueño ([DUEÑO 1]: «poner un maillot amarillo en todas las clasificaciones… y uno verde al que vaya primero por puntos… y uno azul al que vaya primero en la montaña», `docs/navegacion.md` l. 455-459, agosto de 2026), con sus colores y las marcas de telefono §6.5 (D-28), en `LEADER_JERSEY` de `kit.ts`:

| Maillot (pantalla) | Base      | Marca, en u                                                                          | La marca a 13 px               | Contraste de la marca           |
| ------------------ | --------- | ------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------- |
| `Race leader`      | `#facc15` | ninguna, liso                                                                        | (el cuerpo)                    | (no tiene)                      |
| `Points leader`    | `#16a34a` | banda **blanca** de y 23 a 33, la región de `band` (hoy `#bbf7d0` de 7 u)            | 2,71 px (hoy 1,90)             | 3,30:1 (hoy 2,72, mapa 03 §4.1) |
| `Mountains leader` | `#2563eb` | cinco lunares blancos de radio 4 u en los centros de `Jersey.tsx` l. 80-86 (hoy 3,4) | 2,17 px de diámetro (hoy 1,84) | 5,17:1                          |

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

Entre sí no bajan de 18,8 en las cuatro visiones ni de 13,3 en grises (telefono). El filete es el de hoy, `rgba(0,0,0,0.35)` de 1,5 u, o el claro sobre oscuro (§9.10); `role="img"`, con `aria-label` y `<title>` de `JERSEY_LABEL` (`jerseys.ts` l. 145-149). Sus figuras quedan reservadas por distancia (D-20): la banda del verde es también la figura `band`, así que lo reservado es quedar a menos de 10 de él, y eso lo dice la tabla de choques. El 3,30 del blanco sobre verde lo da `contraste.py`; el 5,17 de los lunares es del mapa 03. `leaderJerseys.test.tsx` l. 28-88 se re-sella con la banda de 10 u y los lunares de 4.

### 9.8 El dorsal del equipo líder

No vuelve como dibujo (D-29, DD-06). El dueño lo mandó quitar porque en su teléfono se leía «Ill» ([DUEÑO 5]: el commit `994b83c`, del 13 de agosto de 2026, cuenta que el dueño lo vio junto a «Welle Team» y «pregunto que significaba «Ill»», y `6e1b758`, del 15, que «El dueño pide quitarlo, y esta vez es quitarlo de verdad»; mapa 04). En su lugar, la clasificación por equipos pinta el maillot de cada equipo con `Kit` a 16 px delante del nombre, donde hoy va la bandera (`TeamClassTable.tsx` l. 35; identidad §6.4), y `TeamClassTable` gana la prop `leaderTeamId: string | null`: en la tabla de una etapa, donde la fila 1 es el ganador del día y no el líder (`StageReplay.tsx` l. 230 y 236; `Race.tsx` l. 531; X-14), el equipo de `leaders.team` (`jerseys.ts` l. 128-130) lleva el `Chip` `neutral` `Leads overall` (pantalla); en la acumulada, la fila 1 ya lo es y no lleva nada más. `leaderJerseys.test.tsx` l. 81-88 sigue sellando la ausencia del dorsal, y `stageTables.test.tsx` sigue pasando con el maillot en cada fila, porque cuenta por etiqueta exacta y toma el primer enlace de la fila (l. 35-36 y 43-48; X-13, codigo C10). Los documentos que lo dan por pintado se corrigen en el paso 24 (D-58): `docs/navegacion.md` l. 462-466, 492-495 y 501-504 y cinco líneas de `docs/retransmision.md`.

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

**Un color**, de base o de segundo, de los doce: el de su marca va al más cercano y el maillot que resulta tiene que pasar `checkKit`; si no pasa, la pantalla de E8 ofrece el más cercano que pasa. `chest` no cambia el `Kit`: el nombre viaja aparte. **Su nombre**, en el pecho, solo desde `KIT_SPONSOR_TEXT_MIN_PX` = 72 px (X-24, por cálculo; sin evidencia de los jueces): la letra mínima de 12 px vale también en SVG, y a 72 px una unidad mide 1,5 px, así que una letra de 8 u mide 12 px y cabe en una banda de 10 u; por debajo, el nombre va en `aria-label` y en `<title>`. El pecho mide 20 u de ancho (x de 14 a 34, `TORSO`), 30 px a 72; con un avance de unos 0,65 em por mayúscula a 600 (estimado, sin medir con la letra del sistema) caben tres letras con 1 u de margen, así que cada patrocinador de la lista lleva, además de su nombre, una **marca de pecho de dos o tres mayúsculas**, que es la que se pinta y hace de «logotipo» (9-a). A 72 px o más, el pecho de y 23 a 33 se pinta de un solo color, el segundo en `band` y la base en las demás figuras, y la marca va encima, centrada en (24, 28) en `caption` 600, en blanco o en `CHAMPION_NIGHT` según cuál contraste más: la peor de las doce es `pink` con noche, 4,62:1 (`contraste.py`; 9-b). La lista es cerrada y generada (DD-19), sin texto libre que moderar. Nadie compra una figura, un color reservado ni la diagonal. La fila de `team_kits` lleva `set_by = 'sponsor'` y `sponsor_deal_id`, y al acabar el contrato una fila `system` devuelve el maillot anterior. `Kit` gana la prop `chest?: { mark: string; name: string }` para que E8 la llene cuando exista. El reparto:

| Qué                  | Lo da E3                                                 | Lo decide E8                                                                                |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| qué se puede comprar | `KitZone`: un color de base, un segundo color o el pecho | qué zonas se venden y a quién                                                               |
| el color             | `nearestKitColor`, `applySponsor` y `checkKit`           | el precio, y qué pasa si no pasa `checkKit`                                                 |
| el nombre            | la marca de pecho desde 72 px, su sitio y su color       | la lista cerrada de patrocinadores (DD-19)                                                  |
| cuánto dura          | la fila `sponsor` de `team_kits` y la vuelta al anterior | el contrato, la exclusividad por categoría (`docs/epics.md` G2.8) y lo que pierde el equipo |

Un ejemplo: Noord Cycling lleva `hoops.navy.yellow` y firma con un patrocinador de rojo `#d0021b` en el segundo color; `nearestKitColor('#d0021b', 'secondary')` da `red`, `applySponsor` da `hoops.navy.red`, y si `checkKit` dice `kit_se_confunde` con un rival, E8 ofrece el siguiente más cercano que pase.

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
  readonly size: KitSize
  /** 'dark' en el ámbito oscuro: el filete pasa a rgba(255,255,255,0.6) */
  readonly surface?: KitSurface
}
```

Quién dibuja qué: `leader`, `LeaderJersey` con `JERSEY_LABEL`, `Race leader` (pantalla); `champion`, `ChampionSash` con `championTitleText`, `Champion of Italy`; `team`, `Kit` con `Mistral Racing kit` (hoy `Team jersey` para todos, `Jersey.tsx` l. 25), o `LegacyJersey` con el mismo texto si llega `legacySeed`; sin equipo, el hueco de hoy, del ancho del tamaño y `aria-hidden` (l. 28-29). `wornTeamOf(card: RiderCard): WornTeam | null` traduce `RiderCard.team` (§8.5). **La superficie** (I-24): con `surface="dark"` el filete de los cuatro dibujos pasa a `rgba(255,255,255,0.6)`, 6,55:1 sobre la noche (identidad §6.1); sin él, el `navy` `#172a5b` sobre `navy-dark` `#0b2740` queda a 6,9 de ΔE00 en visión normal, 3,8 en tritanopía y 2,3 en grises (juez de uso, `oscuro.py`). `CueCard` se la pasa siempre, porque sus fondos son `bad`, `navy-dark` e `ink-2` (D-56, §14.5); la capa fija y lo que vaya en el ámbito oscuro, también. Los sitios de hoy y su tamaño (8-c):

| Sitio                                                                                                                                                    | Hoy                                         | Con E3                                         | `surface`            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- | -------------------- |
| `GroupBar.tsx` l. 204 y 242; `TimeTrialBoard.tsx` l. 86                                                                                                  | `WornJerseyIcon` de 14 (el defecto) y de 13 | `WornJerseyIcon` de 13                         | la de su fondo (§14) |
| `CueCard.tsx` l. 61, 84 y 116                                                                                                                            | `WornJerseyIcon` de 14, 13 y 16             | de 13, 13 y 16                                 | `dark`               |
| `CueCard.tsx` l. 122, el equipo del rótulo                                                                                                               | `Jersey` de 13 por la semilla               | `Kit` o `LegacyJersey` de 13, por `wornTeamOf` | `dark`               |
| `GroupBar.tsx` l. 113, `StageStory.tsx` l. 103, `RaceRadioPanel.tsx` l. 210, `ChronicleSentence.tsx` l. 25, `VoiceTicker.tsx` l. 78, `CueCard.tsx` l. 90 | `LeaderJersey` de 12 a 14                   | `LeaderJersey` de 13                           | `dark` en `CueCard`  |
| `StageCards.tsx` l. 110 y 292; `RiderJersey` en las tablas (§8.3)                                                                                        | `LeaderJersey` de 15                        | `LeaderJersey` de 16                           | `light`              | `docs/retransmision.md` l. 5210 gana `size` y `surface` en el paso 24 (D-58). |

---

**Injertos aplicados.** I-12 (§9.1: la banda de honor por defecto, con su dibujo entero), I-13 (§9.3: la tabla de variantes con los cuatro criterios y el espectro en la diagonal como alternativa C; §9.4), I-14 (§9.9: el patrocinio con `set_by` y la vuelta al maillot anterior), I-24 (§9.10: `surface` y el filete claro; la geometría, §8.3).

**Objeciones resueltas.** O-14 (§9.1 y §9.2: la señal por defecto deja el blanco; la estrella sobre blanco es la D, con sus cifras), O-15 (§9.3: la C de telefono, descartada por su medida y no por el SPEC; la más fuerte del dueño es la de identidad), O-24 (§9.9: el nombre de una lista cerrada y solo desde 72 px).

**Huecos rellenados.** H-09 (§9.6: por qué la banda nacional no cae en el defecto de la 7-h, con su medida, y lo que mide `champion.test.ts`). Contradicciones de hecho escritas: X-13 (§9.8), X-14 (§9.8), X-16 (§9.2: mandan las distancias del juez), X-17 (§9.1), X-24 (§9.9: 72 px por cálculo) y X-25 (§9.10).

**Decisiones de esta sección.**

- 9-a. El pecho de 20 u solo admite tres letras de 12 px a 72 px (cálculo de arriba), así que lo que se pinta es una marca de pecho de dos o tres mayúsculas que trae cada patrocinador de la lista cerrada, y el nombre entero va en el `aria-label`. Descartado: el nombre entero, que a 72 px no cabe, y bajar la letra de 12 px.
- 9-b. A 72 px o más el pecho de y 23 a 33 se pinta de un solo color bajo la marca, porque en `hoops`, `halves` y `sides` cruza dos colores y la marca no tendría un contraste fijo. Descartado: vender el pecho solo en `plain` y `band`.
- 9-c. La continental lleva cuello plata, como su banda; E12 lo cambia con lo demás.
- 9-d. `WornJerseyIconProps.team` es una unión con `legacySeed` para lo grabado antes de la traducción, que §G.5 no recoge (ver la duda).

**Propuesto para el glosario.** `nationalSashOf(country)` (la sobrescritura o el generado, en `kit.ts`); `apps/web/scripts/national-sash.mjs` (el generador de `NATIONAL_SASH`, con `--hoja`); `packages/shared/src/nationalSash.test.ts` (la huella y las tres franjas de cada país); `nearestKitColor(hex, zone)` (en `kit.ts`); `WornTeam` y `wornTeamOf(card)` (en `broadcast/WornJerseyIcon.tsx`); la prop `leaderTeamId` de `TeamClassTable`; la prop `chest` de `Kit`, con la marca de pecho de dos o tres mayúsculas de cada patrocinador; y los textos (pantalla) `World champion`, `Continental champion` y `U23 champion of Italy`.

**Dudas para el ensamblador.**

1. §G.5 da `WornJerseyIconProps` con `team: { name: string; kit: KitCode } | null`; esta sección le añade el miembro `{ name, legacySeed }` (9-d) porque D-23 dibuja lo grabado antes con su semilla. Es la misma duda que la 1 de §8.
2. D-27 y la tabla de DD-03 dan 9,4 y 1,4 a 16 px para «otros colores»; la página de opciones mide V4 a 13 px en 8,7 de visión normal y 1,5 en grises, que es lo que dice identidad. No se contradicen (son tamaños distintos), pero §19.4 debería citar los dos con su tamaño.
