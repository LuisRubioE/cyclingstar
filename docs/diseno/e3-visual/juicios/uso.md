# E3 · Juicio de uso: ejecutabilidad y experiencia en el teléfono

Juez: `uso`. Dos preguntas: ¿puede un agente sin nadie a quien preguntar implementar cada sección sin
decidir nada (cada componente con sus estados, cada token con su valor, cada pantalla con sus textos
en inglés, cada test con su umbral)?, y ¿se lee y se juega mejor en un teléfono de 360 px, con el
pulgar, letra legible, objetivos de 44 px, la respuesta arriba y con visión daltónica?

Leídos enteros `00-encargo.md`, `01-fase-propuestas.md`, `02-fase-juicios.md` y las cuatro propuestas
(`telefono.md` 698 l., `sistema.md` 696, `identidad.md` 675, `lectura.md` 698); de los mapas, los
resúmenes y el 05 entero; capturas de hoy 01, 09, 15 y 16 a 360 px. **Medido** en
`<scratchpad>/juez-uso/`: `medir-protos.mjs` y `dom.mjs` (los tres prototipos del cuadro en el Chromium
1194 de `/opt/pw-browsers` a 360 × 800 y 320 × 640, relación 2, táctil, con el axe-core 4.10.3 del mapa
05; `protos.json` y `*-pantalla1.png`) y `color.py`, `estado.py` y `oscuro.py` (WCAG 2.x y ΔE00 tras
Machado 2009, severidad 1, RGB lineal, colour-science 0.4.7; grises por luminancia). Cifra sin otra
marca, medida así.

## 1. Tabla cruzada

| #   | Ítem                                      | telefono                                                                                         | sistema                                                                                                      | identidad                                                                                 | lectura                                                                                 |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | La respuesta en la primera pantalla       | `data-answer` a 520 px o menos (§5.3 n.º 7); su prototipo, 152 (medido)                          | «el primer `Panel` a menos de 400 px» (§5 n.º 6): mide un marco, no la respuesta                             | sin métrica                                                                               | `data-answer` a 600 px o menos en ocho páginas (§5.4 n.º 4); su prototipo, 228 (medido) |
| 2   | La acción bajo el pulgar                  | `ActionBar` fija con la consecuencia (`Race Var: Fine (was Loaded)`), a 687 de 800 (medido)      | `Save day edits` al final: abierta, la página mide 4.999 px (medido)                                         | nada en el cuadro; `Save kit` en el editor                                                | `SaveBar` con efecto y `Discard` (§4.1), sin prototipo                                  |
| 3   | Dónde corre la prueba del teléfono        | CI en cada PR, unas 35 pantallas, trinquete `telefono-baseline.json`                             | CI sobre `/_ui`; las 45 pantallas, solo cada noche                                                           | CI con la etiqueta `visual` y cada noche                                                  | a mano antes de fusionar, unos 20 min (§12)                                             |
| 4   | Anchos                                    | 360 × 800 y 320 × 640                                                                            | 360 × 800 y 390 × 844; sin 320                                                                               | solo 360 × 800                                                                            | 360 × 800 y 390 × 844; sin 320                                                          |
| 5   | Objetivos táctiles                        | 44 × 44, o 24 en enlace dentro de frase; su prototipo tiene 4 enlaces de 20 px de alto           | ningún control bajo 44; maqueta, 0 de 48 (medido)                                                            | el 95 % a 44 y el 100 % a 24: tolera uno de cada veinte                                   | 44 × 44; en una fila, el objetivo es la fila                                            |
| 6   | Rendimiento                               | primera pintura ≤ 3,0 s; lista ≤ 5,0 en frío y ≤ 2,0 en caliente (Slow 4G, CPU ×4); hoja ≤ 15 KB | 4,5 s en frío y 2,5 con SW, «estimados, se fijan en el paso 18»                                              | 2,5 s con Fast 4G, que hoy ya se cumple (1,64 a 2,10 s, mapa 05 §12)                      | 2,5 s con Fast 4G y 5,0 con Slow 4G; CSS ≤ 15 KB                                        |
| 7   | Letra y campos                            | 12 px, SVG incluido; campos 16                                                                   | 12 px en `main`; campos 16                                                                                   | 12 px, barra inferior incluida; rótulos en Barlow con `swap`                              | 12 px, SVG incluido; campos 16                                                          |
| 8   | Tablas anchas                             | las quince, en diez filas con destino y número de filas (§5.1)                                   | seis filas con `priority` para nueve tablas; las otras seis, sin escribir                                    | solo el calendario; salón de la fama y nación siguen desplazándose de lado                | por familias: `DataTable`, `RowList`, o desplazamiento con primera columna fija         |
| 9   | Tu fila en una tabla de 140               | no sale si pasas del 20                                                                          | resaltada, no anclada                                                                                        | no                                                                                        | anclada tras `…`, barra `own` y `aria-current`                                          |
| 10  | Barra inferior                            | icono de 24 y rótulo de 12; `Dashboard` cabe a 320 con 1 px por lado (medido, con Inter)         | «ningún rótulo se corta»; rótulos cortos como decisión con E6                                                | 12 px y `--nav-h`                                                                         | activo en barra de 3 px, rótulo 12/600; en su prototipo, vacía                          |
| 11  | Estados de consulta                       | `QueryView`; esqueleto y `Still loading. Slow connection?` a 8 s; versión vieja                  | `QueryView`; esqueleto a los 300 ms, para no parpadear                                                       | aviso a 10 s; `ErrorState` con código                                                     | cuatro estados; `OfflineState` por `fetchStatus`                                        |
| 12  | Sin red con la sesión abierta             | tres estados de sesión: evita el `Log in` que midió (comprobación 6)                             | no lo trata                                                                                                  | no lo trata                                                                               | promete `You're offline.` al recargar: falso sin tocar `ProtectedRoute`                 |
| 13  | Escala de llegada                         | solo el tramo activo pintado, palabra dentro y ejes; texto a 5,02:1 o más (medido)               | las cinco celdas pintadas: la respuesta es un contorno de 2 px y `▲ you`; la maqueta pone `Best` bajo `Fine` | invertida (`Rusty` a la izquierda); los tramos apagados, sin aspecto                      | barras de 10 px y la activa de 14, palabra debajo; activa a 3,62:1 o más (medido)       |
| 14  | El cuadro rehecho, prototipo              | entero, con pestañas, barra de acción y barra inferior; 1.277 px (medido)                        | 1.709 px plegada, sin pestañas ni barra inferior (medido)                                                    | no hay                                                                                    | solo la primera pantalla (871 px); `select-name` 2 y una celda que se sale (medido)     |
| 15  | Paleta del maillot en las cuatro visiones | 12 colores, todo par a 12,3 o más en las dicromacias (medido)                                    | 10, a 11,7 o más (medido)                                                                                    | 14: `royal` y `violet` a 2,7 y 3,0 (medido); lo salva la regla por maillot                | 15: `rosa` y `gris` a 1,6 en deuteranopía (medido); lo salva el veto por diseño         |
| 16  | Tamaño mínimo del maillot                 | 16 px; la barra de grupos sube de 13                                                             | 13 px                                                                                                        | 13 px a densidad 1 y 2, y 28                                                              | 13 px                                                                                   |
| 17  | Reparto contra gemelos                    | por rivales en carrera: 0 de 310 carreras con un par bajo 10, a 13 y 16 px                       | relleno por vecinos: 0 de 310 a 13 px                                                                        | por vecinos y con continuidad: 0 de 310; en grises, 3,86 pares por carrera                | por ámbito (WT con PT, continentales por continente); sobre las 310, sin medir          |
| 18  | Editor del maillot en el teléfono         | 72 px y sus 8 rivales a 16; muestras de 44 con nombre, tachadas con su porqué; `Save kit` fijo   | 13, 28 y 96 px junto a la próxima carrera; `Save changes` deshabilitado con motivo                           | 96 px y 13, 16 y 28 sobre claro y oscuro; veredicto con equipo y visión                   | 13, 28 y 72 px y su ámbito a 13; tres errores escritos                                  |
| 19  | Lo que impide reinventar                  | una regla de ESLint descrita en una frase (§4, §12)                                              | tema cerrado (2.457 apariciones medidas), `deuda.json`, diez reglas (1.417 avisos medidos)                   | ninguna                                                                                   | `noRawPalette`, con una lista que solo encoge                                           |
| 20  | Plan                                      | 18 pasos, unos 22 PR, S/M/L y dependencias                                                       | 18 pasos, unos 37 PR, con el test de cada uno                                                                | 11 pasos, unos 15 PR; todas las páginas en 3 PR; el arnés en el paso 11 «desde el paso 1» | 15 PR, S/M/L; los tres primeros no cambian nada visible                                 |

## 2. Comprobaciones

| #   | Afirmación (propuesta)                                                                                                                                                                               | Resultado                                 | Evidencia                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | «la respuesta a 152 px, ninguna falta y la acción a 687 px de 800» (telefono §7.1, §5.3)                                                                                                             | a medias                                  | Reproducido: `data-answer` a 152, `data-primary-action` a 687, alto 1.277 (1.349 a 320), letra mínima 12, 0 campos bajo 16, sin desborde a 360 ni a 320, 0 nodos de axe. Pero sus cuatro enlaces de nombre miden de 185 a 208 × 20 px: pasan solo por el espaciado de 2.5.8, que su §5.2 reserva al enlace dentro de una frase                                                                            |
| 2   | «1.709 px plegada y 4.999 con los 28 días abiertos, el pronóstico a 200 px, 0 de 48 controles bajo 44 y 0 fallos de axe» (sistema §7.2)                                                              | a medias                                  | 1.709, 4.999, 0 de 11 y 0 de 48 y 0 de axe, reproducidos. La primera carrera sale a 260 px y la maqueta no tiene pestañas de nivel 2 ni barra inferior (ningún elemento fijo). Y pinta `Best` entre 163 y 188 px, bajo `Fine` (de 150 a 210), no bajo `Spot on` como dice su §4 n.º 21 (`dom.mjs`)                                                                                                        |
| 3   | «la primera llegada ocupa de 228 a 367 px; ningún texto baja de 12 px; sin desborde» (lectura §7.2)                                                                                                  | a medias                                  | 228 a 367, 12 px y 360 de `scrollWidth`, reproducidos. axe da `select-name` en 2 nodos, que su criterio 3 (§5.4) pide a cero, y la celda `53 ✈ back` mide 40 px con 45 de contenido; el prototipo acaba a 871 px                                                                                                                                                                                          |
| 4   | 12 colores, «ningún par baja de 15,9 en visión normal ni de 12,3 en las dicromacias» (telefono §6.1), frente a «con doce familias el mínimo cae a 5,7: doce tonos no caben separados» (sistema §6.1) | telefono cierta; sistema falsa como regla | 15,9 (navy y purple); 12,3 (green y red en protanopía y deuteranopía; orange y pink en tritanopía); 12 pares bajo 10 en grises. Lo de sistema vale solo para su docena con lima y marrón. Las paletas de 14 (identidad) y 15 (lectura) bajan a 2,7 y 1,6 (`color.py`)                                                                                                                                     |
| 5   | Los contrastes y ΔE00 de las cuatro escalas de llegada (telefono §3.1, sistema §4 n.º 21, identidad §3.1, lectura §3.1)                                                                              | cierta en las cuatro                      | Texto en el tramo: telefono de 5,02 a 6,57; sistema de 5,32 a 14,60; identidad de 5,95 a 10,10. Peor par: sistema 10,6 en tritanopía y 6,9 en grises; identidad, vecinos a 12,6 o más en las cinco vistas; telefono, `Cooked` y `Loaded` a 6,3 en deuteranopía; lectura, activo contra apagado de 3,62 a 5,18:1 y 32,0 o más. El activo de telefono queda a 38 o más del tramo apagado en toda visión     |
| 6   | Sin red, el jugador con sesión ve `Log in` por `ProtectedRoute.tsx` l. 12-13, y `HorizonWatcher.tsx` l. 33 vacía la caché (telefono §1.6, §8.3)                                                      | cierta y a medias                         | `ProtectedRoute.tsx` l. 12-13: `if (!data)` lleva a `/login`; su captura `pwa/out/sinred-recargar-propuesta.png` enseña `Log in` con la barra del visitante. La caché solo se vacía si cambia una sesión ya resuelta (`cacheOwnerChanged`, `queryClient.ts` l. 165-167), no en una recarga en frío. Por eso lectura §8.3 («recargar sirve el armazón con `You're offline.`») es falsa sin tocar la guarda |
| 7   | «doce maillots ocupan 216 de los 336 px de la fila» (telefono §6.6)                                                                                                                                  | a medias                                  | La línea lleva `gap-x-2` y `pl-7` (`GroupBar.tsx` l. 235): 12 × 16 + 11 × 8 = 280 px; caben en los 308 útiles a 360 y parten en dos renglones a 320 (268)                                                                                                                                                                                                                                                 |
| 8   | La vista previa indexa las semanas desde mañana y el tick desde el día del guardado (lectura §1.5)                                                                                                   | cierta                                    | `apps/api/src/routes/riders.ts` l. 453 (`blocks[Math.floor(i / 7)]`, con `i` desde mañana); `packages/db/src/train.ts` l. 216 cuenta las semanas desde `fila.startDay`; y `PUT /plan` fija `startDay` en mañana (`riders.ts` l. 413). telefono no lo arregla                                                                                                                                              |

## 3. Puntuaciones

| Propuesta | Cobertura | Coherencia | Ejecutabilidad | Experiencia |
| --------- | --------- | ---------- | -------------- | ----------- |
| telefono  | 8         | 7          | 8              | 9           |
| sistema   | 7         | 9          | 8              | 6           |
| lectura   | 8         | 8          | 6              | 7           |
| identidad | 6         | 7          | 5              | 5           |

**telefono.** La única que diseña desde el pulgar y lo hace cumplir: nueve comprobaciones a 360 y 320
con umbral, valor de hoy y del prototipo, en el CI de cada PR y con trinquete; su prototipo da lo que
dice (comprobación 1). Solo ella vio el `Log in` sin red (comprobación 6) y su paleta del maillot es la
única con todo par a 12,3 o más en las dicromacias. Pierde por la prueba sin mundo, sin lista de
pantallas ni respuesta por pantalla, por el tema sin cerrar y por la barra de grupos mal contada.

**sistema.** El sistema que obliga el compilador: tema cerrado medido sobre 146 fuentes, deuda por
fichero, diez reglas medidas, `data-state` para los tests y 37 PR con su test; sus cifras de color se
reproducen exactas. En el teléfono, floja: la puerta de cada PR mira `/_ui` y no las pantallas, sin
320, rendimiento por fijar, el guardado al final de 4.999 px, los cinco tramos pintados, y sin la carga
del día de carrera la llegada a la segunda carrera del mes cuenta la primera como descanso.

**lectura.** La mejor lectura: preguntas y capas, glosario cerrado, fila propia anclada, `↺ Back to
Build`, línea de estado, resolución en el tipo y el desfase de semanas (comprobación 8). Pero su
criterio corre a mano, su prototipo falla su `select-name` y desborda una celda, su `SegmentMeter` mide
10 × 3 px, su reparto por ámbito no está medido y su recarga sin red da `Log in`.

**identidad.** La mejor en maillots y campeón: medidos a 13 px con densidad 1 y 2, en grises, con
continuidad y con un veredicto que nombra equipo y visión. Lo demás, delgado: §5 es un párrafo con un
umbral de rendimiento que hoy ya se cumple y objetivos al 95 %; el cuadro son tres líneas sin
prototipo; los estados de los componentes, escuetos; todas las páginas migran en 3 PR.

## 4. Ganadora: `telefono`

Es la única que convierte «se juega bien en un teléfono» en una prueba que falla, y la única cuya
pantalla rehecha se ve entera con barra de acción y barra inferior (`juez-uso/telefono-360-pantalla1.png`:
la carrera y su tramo a 180 px, la acción a 687, nada bajo 12 px a 320). Encontró el `Log in` sin red
que las otras tres repetirían; su paleta del maillot separa color a color para un daltónico, dibujada
para 16 px; y su regla de la app nativa se cumple dentro de E3 con su sensor (§8.5), donde las otras
dependen de una analítica que no existe (`docs/encargos.md` l. 741-742). Lo que le falta (un sistema que
se haga cumplir solo, la lectura de las tablas, la frontera por tipo) lo traen `sistema` y `lectura` sin
tocar su estructura. `sistema` sería la base si el foco fuera solo el código.

## 5. Injertos

| Id       | De        | Sección          | Qué                                                                                                                                                                                                                                            | Porqué                                                                                                                                                                                                       |
| -------- | --------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I-uso-01 | sistema   | §2, §3, §12      | El tema cerrado (`--color-*: initial` y las demás familias), `vocabulario.test.ts` con `deuda.json` por fichero y las reglas `ui/1` a `ui/10` con su lista de heredados                                                                        | telefono §3.4 («lo que no es token no tiene clase») es falso en Tailwind v4 con el tema por defecto abierto: 2.457 apariciones solo resuelven por él (sistema §0) y su línea base no las cuenta              |
| I-uso-02 | sistema   | §4, §12          | `data-ui`, `data-variant` y `data-state` en cada componente, los tests sobre eso, y `/_ui` con cada estado y datos fijos como primera página de `telefono.spec.ts`                                                                             | telefono re-sella seis tests de clases (§12) sin decir qué sellan después, y `/_ui` es donde el dueño mira el sistema en su teléfono (sistema §14)                                                           |
| I-uso-03 | sistema   | §3.3             | La densidad por puntero, `@custom-variant fine (@media (pointer: fine))`: fila de 36 y botón de 32 con ratón                                                                                                                                   | telefono fija 48 y 44 también en escritorio, y el público de Hattrick y PCM lee tablas densas (mapa 04 §2)                                                                                                   |
| I-uso-04 | sistema   | §3.1             | El ámbito oscuro `[data-surface='dark']` con sus nueve tokens y sus 25 parejas medidas                                                                                                                                                         | telefono §10 pasa los botones de `WatchBlocks` y `PlayerControls` a `Button` sobre `navy-dark` sin variante oscura                                                                                           |
| I-uso-05 | identidad | §6.1, §6.7       | El filete claro `rgba(255,255,255,0.6)` sobre superficie oscura y el parámetro `surface` de `WornJerseyIcon`                                                                                                                                   | el `navy` `#172a5b` de telefono sobre su `navy-dark` `#0b2740` (el rótulo de clase 2, `CueCard.tsx` l. 42) queda a 6,9 de ΔE00 en visión normal, 3,8 en tritanopía y 2,3 en grises (`oscuro.py`)             |
| I-uso-06 | identidad | §6.1, §6.3, §15  | La regla de contraste base y segundo color (`KIT_CONTRAST_MIN` = 20), el veredicto con equipo y visión (`Too close to Mistral Racing for colour-blind viewers (deuteranopia). Try another colour or figure.`, pantalla) y que el NPC ceda (D7) | telefono deja 12,9 pares por carrera en grises a 13 px frente a 3,86, y con 28 rivales un maillot al azar choca con probabilidad 0,51 (telefono §6.3): el mánager necesita saber con quién y tener sitio     |
| I-uso-07 | lectura   | §4.1             | La fila propia anclada tras `…` en toda tabla con top 20: barra `own` `#a87300` de 3 px (4,10:1), fondo `#fdf4dc`, nombre en 600 y `aria-current`                                                                                              | con el `RankTable` de telefono el corredor del jugador en el puesto 34 no sale, y `Show all 140` son unos 6.720 px de filas de 48 (estimado)                                                                 |
| I-uso-08 | lectura   | §4.2             | El glosario cerrado (`Day 56 · in 6 days`, `+0:40`, `Race Var .1 · one day`, `travel out` y `travel back`, los siete orígenes, las cargas `Rest` a `Very hard`, `6,173,210`) en `apps/web/src/design/words.ts`                                 | telefono fija `Day N` y `formatTime` pero deja la carga y los orígenes repartidos por §7.4, sin lista cerrada                                                                                                |
| I-uso-09 | lectura   | §7.4             | `↺ Back to Build` en un día editado: borra la orden y devuelve el día a su bloque                                                                                                                                                              | telefono enseña el origen del día pero no da vuelta desde `Your edit`                                                                                                                                        |
| I-uso-10 | lectura   | §1.5, §7.5 n.º 3 | Indexar la semana de la vista previa por `plan.startDay` y que `PUT /plan` conserve el `startDay` del plan vivo                                                                                                                                | desde el segundo día tras guardar, las semanas que telefono pinta con `plan.startDay` (§7.4) y la escala que proyecta desde mañana no hablan de los mismos días (comprobación 8)                             |
| I-uso-11 | lectura   | §7.3             | La tira de siete días por semana (carrera, viaje, entrenamiento con su carga), no pulsable y con su resumen en texto (`1 training day`, pantalla)                                                                                              | se ve sin abrir nada que la semana 1 apenas entrena; con una palabra por celda (`Out`, `Back`, `Race`), porque `53 ✈ back` se sale a 360 (comprobación 3), y el `Meter` de 8 px de telefono en vez de 10 × 3 |
| I-uso-12 | lectura   | §9 n.º 3         | La resolución en el tipo: estrellas `z.number().multipleOf(0.5).min(0).max(5)`, barras `z.number().int().min(0).max(100)`, tramos y flechas enumerados                                                                                         | el `frontera.test.ts` de telefono caza los números internos por el nombre del campo, y un campo renombrado con decimales pasa                                                                                |
| I-uso-13 | lectura   | §8.3             | La hora de los datos en el aviso sin red (`You're offline. Showing what you saw at 14:02.`, pantalla), de `dataUpdatedAt`                                                                                                                      | en el teléfono no se distingue una general de esta mañana de una de ayer                                                                                                                                     |
| I-uso-14 | sistema   | §4 n.º 15, §11   | El esqueleto visible a los 300 ms (`LOADING_DELAY_MS`)                                                                                                                                                                                         | telefono lo pinta «desde el principio» (§8.3); en caliente la web responde en 1,07 a 1,18 s (telefono §8.2) y parpadearía en cada respuesta rápida                                                           |

## 6. Objeciones a la ganadora

1. **O-uso-01 · §5.3, el mundo de la prueba.** «Génesis y tres días» con «las cuatro cuentas del mapa
   05» no da las pantallas medidas: el mapa 05 pidió 50 días (849 s) y cuatro escrituras con SQL
   (correo confirmado, dinero, contrato y `premium`, mapa 05 §1). Faltan semilla, días, cuentas, SQL y
   si el mundo se guarda o se genera en cada pasada.
2. **O-uso-02 · §5.3, sin lista de pantallas ni respuesta por pantalla.** Faltan las «unas 35», el
   elemento con `data-answer` de cada una y cuáles son «de herramienta» (n.º 9): hace falta la tabla
   ruta, cuenta, elemento y herramienta (lectura §5.4 n.º 4 da ocho páginas).
3. **O-uso-03 · §3.4 y §12, nada impide reinventar.** Con el tema por defecto abierto la frase es falsa,
   y la regla de ESLint no tiene reglas ni lista de heredados. Se resuelve con I-uso-01.
4. **O-uso-04 · §4 `RankTable`, el enlace del nombre.** Dice que ocupa la celda de 44 px y en su
   prototipo mide 20 de alto (comprobación 1): el enlace es la celda entera, en bloque y con 44 px de
   alto, y la prueba cuenta los enlaces de tabla como controles, no como enlaces de frase.
5. **O-uso-05 · §4, lo fijo sin orden ni tope.** Barra de acción de 60, barra inferior de 56 más la
   muesca, `UpdateToast` de 48 y `OfflineBanner` de 32; a 320 la consecuencia parte en dos renglones
   (medido). Faltan un solo aviso a la vez, la consecuencia en un renglón con `…` y entera en
   `aria-describedby`, y la barra escondida mientras el teclado está abierto.
6. **O-uso-06 · §6.6 y §10, el maillot de 16 px en la barra de grupos.** A 320 la fila parte en dos
   (comprobación 7) y §10 fija filas de 36: o el hueco baja a 4 px bajo 360 o la fila crece, con E2.
7. **O-uso-07 · §7.2, la vista previa desfasada** (comprobación 8): la escala y las semanas pintadas no
   hablan de los mismos días. Se resuelve con I-uso-10.
8. **O-uso-08 · §5.2, los rótulos de la barra inferior.** `Dashboard` a 12/600 mide 62 px en la celda
   de 64 a 320, medido con Inter (su §14) y no con San Francisco ni Roboto. Falta el plan B si la
   comprobación 2 falla: los rótulos de sistema §15 (`Home`, `Rider`, `Team`) o solo icono bajo 340 px.
9. **O-uso-09 · §3.1, «ningún estado va solo en color» sin mecanismo.** `good` y `bad` quedan a 9,0 de
   ΔE00 en deuteranopía y a 1,21 de luminancia (`estado.py`): `Chip` y `Notice` exigen texto en el tipo
   e icono por tono (`check`, `warning`, `error`), y el dinero lleva siempre su signo.
10. **O-uso-10 · §7.1 frente a §7.3, dos instrucciones.** El prototipo nombra la semana (`You'll start
tired. Make week 1 lighter to arrive Fine.`) y §7.3 da una fija: si manda la primera, faltan la
    regla y el campo de la API; si la segunda, el prototipo no es la pantalla.
11. **O-uso-11 · §4, el escritorio sin columnas.** «Desde 640 el renglón 2 vuelve a columnas» no dice
    cuáles en cada tabla de §5.1; falta el `priority` por columna de sistema §4 n.º 10.
12. **O-uso-12 · §6.4, la estrella sobre blanco.** A 16 px queda a 16,6 de la marca de la UCI y a 10,5
    en grises (su tabla), «blanco con algo en el pecho» (mapa 03 §7.2), frente a 34,4 a 50,1 de los
    cuerpos oscuros (sistema §6.4, identidad §6.5). Es gusto (§8): va al dueño con esas cifras.
13. **O-uso-13 · §13, falta un paso 0** con el mundo de prueba y la tabla de pantallas, de los que
    depende el paso 1, con su coste (el mundo del mapa 05 tarda 15 min, `capturas/README.md`).

## 7. Lo que ninguna resuelve

1. **H-uso-01 · El mundo de prueba reproducible** del criterio del teléfono: «génesis y tres días»,
   «por construir», «el banco de capturas» o «el mundo de 50 días guardado»; ninguna lo escribe.
2. **H-uso-02 · La letra y el motor de un teléfono de verdad**: todo es Chromium de Linux; nadie mide
   con San Francisco o Roboto, ni WebKit con barras fijas, `100dvh` y `env(safe-area-inset-*)`.
3. **H-uso-03 · El teclado virtual con barras fijas y el teléfono en horizontal**: a 800 × 360 las dos
   barras dejan unos 244 px (estimado), y ningún manifiesto fija `orientation`.
4. **H-uso-04 · La letra ampliada** (WCAG 1.4.4 al 200 %, la escala de Android): ninguna repite la
   prueba con texto grande, y hay altos fijos de 36, 40 y 60 px.
5. **H-uso-05 · Los tonos de estado entre sí**: nadie los mide en las cuatro visiones; verde y rojo
   bajan de 10 en deuteranopía en telefono (9,0) e identidad (8,1), y axe no exige texto ni icono.
6. **H-uso-06 · El lector de pantalla en un teléfono** (VoiceOver, TalkBack): los `role="img"` de escala
   y maillot y los `aria-live` de `Watch` solo se miran en el marcado.
7. **H-uso-07 · La carga del día de carrera**: «estimada» en tres (150 TSS o la mediana del diario) y
   sin arreglar en sistema; nadie la contrasta (una etapa cargó 252,8, mapa 02 §3).

## 8. Las decisiones de gusto

- **Paleta.** A la página: el «manager sobrio» de telefono A (igual a lectura a: cabecera `#123a5c`,
  acento `#0b6e8a`, oro `#e0a106`, tarjetas blancas sobre `#eef2f6`, sin barras de color); el PR #105
  liso de sistema A (igual a telefono B, lectura b e identidad B: `Panel` `#006e8c` con blanco a 5,82,
  barra `#d99400` con `ink` a 6,95); y «noche y oro» de identidad A (`#14213d`, `#e0a526`). **Por
  defecto, telefono A**: las barras cuestan 36 px por panel y 48 por página (telefono §3.1), y la
  primera carrera sale a 180 px en su prototipo, con pestañas, frente a 260 en la maqueta de sistema.
- **Tipografía.** A la página: la del sistema (0 KB), la del sistema con Barlow Semi Condensed 600 en
  títulos y cifras (identidad A, 22.984 bytes el latín) e Inter variable (de 47,1 a 48,3 KB). **Por
  defecto, la del sistema**: la primera pintura ya llega a 3,2 s con Slow 4G (mapa 05 §12), toda letra
  propia añade espera o cambio de letra, y la del sistema trae los alfabetos de E10.
- **Señal de campeón.** A la página: la banda de honor de identidad A (oro `#e0a526` sobre noche
  `#14213d` la mundial; la bandera en tres franjas sobre papel `#f6f3ea` con filo de 2,4 u la nacional),
  la estrella sobre blanco de telefono A y lectura a, la estrella `#f0b323` sobre `#14284b` de sistema
  S1, y la variante del dueño que aguanta el teléfono, el espectro en la banda (identidad C), con las
  cinco literales y su distancia (telefono §6.4). **Por defecto, la banda de honor**: a 13 px con
  densidad 1 solo la diagonal sigue siendo forma (identidad §6.5, `hojas/pix-13-1.png`) y la mundial
  queda a 44,3 de la marca frente a 11,2 a 16,6 de las estrellas sobre blanco (lectura §6.4, telefono
  §6.4). Cuesta quitar `Sash` del vocabulario de equipo y medir la nacional contra la marca.
- **Vocabulario del maillot.** A la página: 12 colores y 7 figuras de telefono A (651, para 16 px), 14
  y 6 con regla de contraste de identidad A (443; 3,86 pares por carrera en grises) y 10 y 7 de sistema
  A (610), la más fácil de recordar. **Por defecto, telefono A sin `Sash` y con la regla de contraste de
  identidad**, que mide la página: la única paleta en que dos colores cualesquiera se separan 12,3 o
  más para un daltónico (comprobación 4), ofrecidos por nombre.
