## 7. Las vueltas por etapas: territorio, itinerario, papeles, km por clase

Hoy una vuelta generada es `stageMix(n, terrain, seedBase)` (`calendar.ts` l. 560-572): reduce el terreno de la fila a tres (`mixTerrain`, l. 430-434), sortea cinco papeles etapa a etapa (`mixRoles`, l. 471-533, con `pickRole` sobre `ROUTE.mixWeights`, l. 447-456) y da kilómetros sin mirar la clase (`mixKm`, l. 536-554). Pasan por ahí 72 de las 132 vueltas (hilly 37, mountain 19, flat 16; mapa 02 §1 y §4), y las 503 etapas de equipos que no son de edición (325 de las 72 vueltas compuestas por `stageMix` más las 178 carreras de un día de tabla) se componen sin saber en qué país están (mapa 02 §6); las otras 383 etapas de equipos son de edición y llevan ciudades reales (`editions.ts`; el mapa 02 §7 escribe 384, pero su propio desglose, hilly 163, flat 95, mountain 95, itt 26, cobbles 4, y el calendario cargado suman 383). Lo que este capítulo cambia es lo que hay ANTES del sorteo (un itinerario por el territorio del país, anclado en la zona curada de la carrera), lo que hay DENTRO de cada papel (doce papeles indexados por el relieve de la meta, no tres terrenos) y lo que hay DESPUÉS (reglas de bloque como reparación determinista y kilómetros por clase y papel). Lo que NO cambia es el orden en que `mixRoles` decide y sus cuatro garantías, que son de dominio y que `calendar.test.ts` l. 168-266 sella.

Las líneas de código de esta sección están comprobadas contra el árbol vivo en el momento de la corrección (`git rev-parse HEAD` 8553486, cuyo `packages/engine` es byte a byte el de 2900895; la cabecera del documento fija el HEAD contra el que se cita el conjunto). Los mapas leyeron 8585ca2 y sus números de línea, cuarenta commits atrás, no valen ya para `calendar.ts` ni para `constants.ts`.

### 7.1 El territorio y la ventana: `itinerarioDe`

`itinerarioDe` (`routes/grammar/tour.ts`) es la primera decisión de una vuelta generada y es identidad: se tira con `routeRng(\`arch|${raceId}\`)`, sin `season`, y por eso una carrera recorre siempre el mismo trozo de su país (decisión 20: los papeles no son edición). Lee `TERRITORIOS[country]` (sección 6: los 56 países con carreras de equipos, mapa 02 §10; los países restantes de `COUNTRIES` caen a un territorio `fallback` de una sola zona `generico`, contado en `geo.test.ts`) y `RACE_REGION[raceId]` (sección 6, §3.5: la zona curada a mano de cada una de las 310 carreras de equipos, decisión 14).

```ts
// packages/engine/src/routes/grammar/tour.ts
export interface Itinerario {
  metas: GeoZone[]      // zona de la meta de cada etapa; la salida de la i+1 es la meta de la i
  papeles: StageRole[]
  km: number[]          // ya con ARCH.km.porClase, maxPorClase y ROUTE.lastStageKmFactor
  desde: GeoZone[]      // desde[0] = metas[0]; desde[i] = metas[i-1]. desde[i] !== metas[i] es transición
  notas: string[]       // reparaciones aplicadas («e5: reina → media_alto, ventana sin cordillera»)
}
export function itinerarioDe(raceId: string, country: string | null, n: number, terrain: RouteTerrain,
  raceClass: RaceClass, format: RaceFormat): Itinerario
```

Paso a paso, con el orden de consumo del RNG fijado (todo lo que sigue tira del mismo `rand` y en este orden, para que el test de determinismo de `calendar.test.ts` l. 237-246 sea reproducible):

1. **Ventana, sin dado.** `T = TERRITORIOS[country ?? '']` (`FALLBACK` si no hay fila), `L = T.ruta.length`, `w = min(n, L)`. El ancla es la zona curada de la carrera: `metas[0] = RACE_REGION[raceId]?.default ?? T.ruta[0].zona`, y `s` es su índice en `T.ruta` (si `default` no pertenece a la ruta, cae a `T.ruta[0]` y `regions.test.ts` lo caza: sección 3, §3.5). Hay dos ventanas candidatas de `w` zonas, la que avanza por la ruta, `ruta[s], ruta[s+1 mod L], …`, y la que retrocede, `ruta[s], ruta[s−1 mod L], …`. El terreno de la fila elige entre las dos: si `terrain === 'mountain'` y `T.cordillera !== null`, se toma la primera de las dos que contenga la cordillera; si `terrain ∈ {flat, cobbles, itt}`, la primera que la excluya; en cualquier otro caso, o si ninguna cumple, la que avanza. Con `w = L` (AD, AE, DK y todo territorio de una zona, pero también ES con `n ≥ 5`) las dos ventanas son la ruta entera y no hay nada que elegir. Aquí no se tira ningún dado: la decisión 14 retira todo sorteo de zona, y una vuelta curada como cantábrica (`race-asturias`, sección 6) arranca en `cantabrico` en todos los mundos; el terreno de la fila es SESGO (elige el sentido, pide la cordillera o la evita) pero no inventa geografía ni desancla la carrera (decisión 18 bajo la decisión 14). El `peso` de `Territorio.ruta` deja de usarse en composición y lo lee solo `zonaDe` (sección 6 §6.3 lo escribe al revés y la pasada de coherencia lo corrige). Si algún día `RACE_REGION[raceId].stages` está curado para una vuelta compuesta, esas etapas toman su zona del dato y la ventana se calcula igual para las demás; hoy solo las 60 ediciones lo tienen y no pasan por aquí (§7.6).
2. **Metas.** `metas[0]` es el ancla; para `i = 1..n-1`, si el cursor no está al final de la ventana y `rand() < ARCH.itinerario.avance` (0,6), avanza; si no, se queda. Una tirada por etapa, siempre (también cuando el cursor ya no puede avanzar: así el número de tiradas es exactamente `n − 1` y depende solo de `n`). Quedarse es lo que hace los bloques: dos etapas seguidas con meta en `alpes` son un bloque de montaña por construcción, no por una regla de reparación (mapa 07 §2.1 regla 4). Con `w = 1` (AD, AE, DK: territorios de una zona) todas las metas son la misma y la vuelta es entera de esa zona.
3. **Papeles** (§7.3): `mixRoles` conservado, con el sorteo de las de en medio sobre `ARCH.pesosComposicion[ZONAS[metas[i]].relieve]`, más las dos tiradas nuevas (prólogo, cronoescalada).
4. **La reina en la cordillera.** Un papel de reina (`reina_alto`, `reina_valle`, `reina_encadenada`, `montana_corta`) solo se admite en una etapa cuya meta sea `T.cordillera` o una zona con `relieve ∈ {montana, alta}` (`admiteReina`, §7.2). La tabla de pesos ya lo garantiza para las de en medio (las filas `llano` y `ondulado` tienen 0 en las cuatro), así que la regla solo actúa sobre la reina que pone el paso 2 de `mixRoles` (última etapa decisiva con `lastSummitShare`) y sobre la que las garantías o los bloques desplacen: se intercambia con la etapa admisible más tardía que no sea la primera ni una crono; si no hay ninguna, se degrada a `media_alto` y se anota en `notas`. **Excepción declarada, la de la sección 6 §6.2 (`cono_sur`)**: si `T.cordillera === null` y `ZONAS[metas[i]].finalesAlto === 'largo'` y `ZONAS[metas[i]].puerto !== null`, se admite como máximo UNA reina por vuelta, siempre `reina_alto`, que `generateStage` sirve con `et_reina_blanda` porque es el único esqueleto `reina` cuyo `requiere` no exige `relieve` (sección 5 §5.7; exige `cota` no nula, que la sección 5 pide a la 6 para `cono_sur`); la segunda reina que el sorteo ponga en esas zonas se degrada a `media_alto`. Hoy solo AR y CL (`cono_sur`) abren esa puerta; para `golfo` la cierra D8 (`finalesAlto: 'corto'`, `puerto: null`), y `flandes`, `ardenas`, `escandinavia` y `australia` tienen `finalesAlto` `ninguno` o `corto`. Consecuencia sellada en `tour.test.ts`: cero reinas en BE, NL, DK, AE, AU (todos con `cordillera: null` y sin zona de `finalesAlto: 'largo'`, decisión 13 y D8), con la vuelta belga cerrándose con `media_alto` sobre un berg como hace el Benelux Tour (mapa 07 §2.2), y en AR y CL a lo sumo una reina por vuelta, `reina_alto`. La sección 5 justifica `et_reina_blanda` con Jebel Hafeet: el ejemplo tiene que ser Fóia (Algarve), porque en `golfo` D8 la cierra; la pasada de coherencia lo cambia allí.
5. **Reparación de bloques** (§7.2), **segunda pasada de «la reina en la cordillera»** y **segunda pasada de garantías**: las cuatro garantías de `mixRoles` se extraen a una función pura `garantias(roles, terrain, n, zonas)` (el cuerpo de l. 502-531 conservado, con una diferencia dicha en §7.3: el hueco que pasa a «morir arriba» se elige entre los que su zona admite) y se vuelven a aplicar después de los bloques, porque una reparación que degrada `reina_alto → media` puede dejar la vuelta sin final en alto y la garantía de fondo es la que manda («ninguna vuelta se queda sin crono ni final en alto», `calendar.test.ts` l. 200-209). `garantias` solo endurece y solo por la cola, así que no rompe `reinaTarde` ni `descansos`; el test lo comprueba de todos modos.
6. **Kilómetros** (§7.4): `km[i] = kmDe(papeles[i], raceClass, n, i === n-1, rand)`.
7. **Transición.** `desde[i] = metas[i-1]`. Cuando `desde[i] !== metas[i]`, `generateStage` recibe `desde` en `StageRequest` y dibuja el primer `ARCH.itinerario.transicion` (0,4) de la etapa con la `amplitud` de `desde` y sin sus dificultades, y el 0,6 restante con la firma de la meta (sección 8): Meseta → Cantábrico es 70 km de páramo y 100 de sierra. Con `desde === metas[i]` la etapa es entera de la zona.

Lo que `itinerarioDe` NO hace: no elige esqueleto de etapa (eso es `generateStage` con `arch|raceId|{i}`, sección 8), no mira `season` (sección 10) y no llama a nada de `stage/` (decisión 4).

### 7.2 Los cuatro esqueletos de composición y sus reglas de bloque

`TOUR_SKELETONS` es un catálogo de cuatro entradas elegidas sin dado por `n` y clase. La frontera entre `vu_corta` y `vu_semana` en `n = 5` la decide la clase (arquitectura §7.2: «.2 y .1 de 3 a 5», «Pro y WT de 5 a 8»); `vu_corta` baja a `n = 2` porque el calendario tiene una vuelta de dos etapas (mapa 02 §2). **Este documento aparta §D.7 del esqueleto («`vu_gran_vuelta` para 9-21») y lo dice**: las vueltas de 9 a 14 van por `vu_larga` y `vu_gran_vuelta` empieza en 15, porque `descansos` (tras la 9 y la 15), «reina en la tercera semana» y `primeraSemanaFinalesAlto` no tienen sentido con 9 etapas, y porque `ROUTE.grandTourStages` 15 y `ittSecondStages` 15 ya parten el dominio ahí. La pasada de coherencia lo propaga a §B.2, §D.7, a V14 de la sección 9 («`vu_gran_vuelta` con n de 9 a 21» pasa a «de 15 a 21») y al paso 7 del plan. Consecuencia que el dueño tiene que saber: `vu_gran_vuelta` no sirve hoy a ninguna carrera (las tres de 21 son de edición, mapa 06 §1.2) y `vu_larga` sirve a una sola vuelta generada (`race-colombia-tour`, 9 etapas, .2); las otras cuatro de 9 a 11 del calendario (`race-colombia` 9, `race-tachira` 10, `race-guatemala` 10, `race-portugal` 11, contadas sobre `SEASON_CALENDAR`) son ediciones y no se componen. `vu_gran_vuelta` se sella solo con `itinerarioDe(…, n ∈ [15; 21], …)` sintético en `tour.test.ts` y no toca el calendario hasta E12; las reglas `descansos`, `reinaTarde` de gran vuelta, `maxAltaMontana` y `primeraSemanaFinalesAlto` no producen hoy ninguna etapa distinta en el calendario que el dueño ve, y se escriben igual porque son la mitad del coste de E12 y porque el banco `grandTour` (sección 13) las necesita para medir composiciones de 21 etapas.

| Id | `n` | Se elige cuando | `primera` | `ultima` | Reglas de bloque |
| --- | --- | --- | --- | --- | --- |
| `vu_corta` | [2; 5] | `n ≤ 4`, o `n = 5` con clase .1/.2 | `{ llana: 1 }` | `'ROUTE.lastDecisiveChance'` | `maxCronos` 1, `maxFinalesAlto` (≤ 1 reina) |
| `vu_semana` | [5; 8] | `n = 5` con WT/Pro, o `n ∈ [6; 8]` | `{ llana: 0,75; prologo: 0,25 }` | `'ROUTE.lastDecisiveChance'` | `reinaTarde` (reina en las tres últimas), `maxFinalesAlto` (≤ 3, ≤ 2 seguidos), `maxCronos` 2 |
| `vu_larga` | [9; 14] | `n ∈ [9; 14]` | `{ llana: 0,75; prologo: 0,25 }` | `'ROUTE.lastDecisiveChance'` | `reinaTarde` (último tercio), `bloqueMontana` (bloques de 2 o 3 seguidas), `llanasEntreBloques` (≥ 2), `maxCronos` 2 |
| `vu_gran_vuelta` | [15; 21] | `n ≥ 15` | `{ llana: 0,7; prologo: 0,3 }` | `{ llana: 0,85; cri: 0,15 }` (Tour 2024, mapa 07 §2.1 regla 3) | `descansos`, `reinaTarde` (`ventanaReina(n)`, [15; 20] con n = 21), `bloqueMontana`, `llanasEntreBloques`, `maxFinalesAlto` (≤ 7 de alta montaña), `maxCronos` 3 |

`primera` se tira solo si `n ≥ ROUTE.ittWeekStages` (6): es la tirada nueva del prólogo (decisión 42, D3), y `roles[0]` puede ser por primera vez una crono (`mixRoles` no la toca: la crono del paso 1 cae en índice ≥ 1, l. 480, y el bucle del paso 3 va desde 1, l. 497). `ultima` con el valor `'ROUTE.lastDecisiveChance'` significa «el paso 2 de `mixRoles` tal cual» (`lastDecisiveChance` × `grandTourLastDecisiveFactor` si `n ≥ 15`, `lastSummitShare`); la reina de ese paso es `reina_alto` sin tirada extra, porque «acaba arriba» es exactamente lo que `lastSummitShare` decide. En `vu_gran_vuelta` el paso 2 se sustituye por una sola tirada sobre `ultima` (`cri` con 0,15, si no `llana`): una gran vuelta se cierra con el paseo o, por excepción anunciada, con una crono, y nunca arriba (así `grandTourLastDecisiveFactor` 0,4 deja de intervenir en lo generado y se conserva solo por las tres reales y por los lectores que lo citan).

Las reglas se aplican como **reparación determinista después del sorteo**, recorriendo de atrás hacia delante como ya hacen las garantías (l. 502-531), y cada una cambia el papel del hueco que rompe la regla por el más cercano en la escalera `reina_* → media_alto → media → llana`, nunca al revés (una reparación jamás endurece: endurecer es cosa de `garantias`). Ninguna toca `roles[0]` ni la última etapa cuando la decidió `ultima` con pesos propios (`vu_gran_vuelta`); solo `maxCronos` toca una crono. Escritas una a una:

```ts
export interface BlockRule {
  id: 'reinaTarde' | 'bloqueMontana' | 'llanasEntreBloques' | 'maxCronos' | 'maxFinalesAlto' | 'descansos'
  aplica: (n: number) => boolean
  repara: (roles: StageRole[], zonas: GeoZone[]) => StageRole[]   // pura; devuelve copia
}
const esReina = (r: StageRole) => r === 'reina_alto' || r === 'reina_valle' || r === 'reina_encadenada' || r === 'montana_corta'
const acabaArriba = (r: StageRole) => r === 'media_alto' || r === 'reina_alto' || r === 'reina_encadenada' || r === 'montana_corta'
const esMontana = (r: StageRole) => esReina(r) || r === 'media_alto'
const esCrono = (r: StageRole) => r === 'cri' || r === 'prologo' || r === 'cronoescalada'
const esLlana = (r: StageRole) => r === 'llana' || r === 'llana_viento'
const admiteReina = (z: GeoZone, cordillera: GeoZone | null) =>
  z === cordillera || ZONAS[z].relieve === 'montana' || ZONAS[z].relieve === 'alta'
const admiteReinaBlanda = (z: GeoZone, cordillera: GeoZone | null) =>            // la excepción de §7.1 paso 4
  cordillera === null && ZONAS[z].finalesAlto === 'largo' && ZONAS[z].puerto !== null
const admiteFinalAlto = (z: GeoZone) => ZONAS[z].cota !== null && ZONAS[z].finalesAlto !== 'ninguno'   // lo que et_media_alto exige (sección 5)
const admiteMuro = (z: GeoZone) => ZONAS[z].muro !== null                                            // lo que et_media_muro exige
/** Ventana 0-based de la reina en vu_gran_vuelta: [14; 19] con n = 21 (la [15; 20] 1-based del mapa 07 §2.1 regla 2). */
export const ventanaReina = (n: number): [number, number] =>
  [Math.max(ARCH.bloques.gv.descansos[0], Math.floor((2 * n) / 3)), n - 2]
```

- **`reinaTarde`.** Ventana admisible de la reina (índices 0-based): `vu_semana` `[n-3, n-1]`; `vu_larga` `[floor(2n/3), n-1]`; `vu_gran_vuelta` `ventanaReina(n)`, que da `[14; 19]` con n = 21, `[10; 14]` con n = 16 y `[10; 13]` con n = 15 (la ventana nunca incluye la última, que `ultima` reserva al paseo o a la crono, y nunca empieza antes del primer descanso, que `descansos` prohíbe a la reina). La constante `ARCH.bloques.gv.reina` [15; 20] de la sección 12 desaparece del literal: es el valor derivado para n = 21 y no cabe en una constante lo que depende de `n`; la sección 12 y V14 (sección 9) lo escriben como `ventanaReina(n)`. Toda reina fuera de la ventana se intercambia con el hueco admisible más tardío dentro de ella (`admiteReina(zonas[j])` o, en la excepción de §7.1 paso 4, `admiteReinaBlanda`, no crono, no `roles[0]`) que no sea ya reina; si no hay hueco, se degrada a `media_alto`. Es la regla que convierte «la reina cae en la tercera semana» (mapa 07 §2.1 regla 2: Plateau de Beille e15, Loze e17, Tre Cime e19) en propiedad estructural.
- **`bloqueMontana`.** (a) Una racha de más de 3 etapas de montaña seguidas (`esMontana`) se corta: de la cuarta en adelante, `reina_* → media_alto → media`. (b) Dos etapas de montaña separadas por exactamente una que no lo es forman bloque: con `i` el índice de la separadora, la separadora se intercambia con la montaña anterior (`i−1`) si la zona de DESTINO de la montaña la admite, es decir `admiteReina(zonas[i], cordillera)` cuando esa montaña es reina y `admiteFinalAlto(zonas[i])` cuando es `media_alto` (la zona `zonas[i−1]` donde estaba ya la admitía por construcción, y comprobarla no dice nada); si no, se deja (una .1 que cruza dos sierras con un valle entre medias existe). Mapa 07 §2.1 regla 4: Pirineos e14 y e15, Alpes e17 a e20.
- **`llanasEntreBloques`.** Entre dos bloques de montaña hay al menos `ARCH.bloques.gv.minLlanasEntreBloques` (2) etapas que no lo son; si hay una sola, se resuelve por (b) de arriba. Nada más: la racha máxima de llanas no es cosa de esta regla (endurecería), es la quinta garantía de `garantias` (§7.3).
- **`maxCronos`.** `vu_corta` 1 (V13; mapa 07 §2.3: «con 3 etapas nunca hay dos cronos»), `vu_semana` y `vu_larga` 2 (prólogo más crono: Romandía, Suiza), `vu_gran_vuelta` 3. La crono sobrante pasa a `llana`, de atrás hacia delante entre las cronos INTERIORES (`1 ≤ i ≤ n−2`): ni el prólogo de `roles[0]` ni la crono final que `ultima` acaba de decidir en `vu_gran_vuelta` se tocan, porque son las dos decisiones de esqueleto y borrar primero lo último decidido sería absurdo. En `vu_gran_vuelta` el peor caso es prólogo (0,3) más las dos de `ittSecondStages` (paso 1 de `mixRoles`, l. 478-485, siempre que n ≥ 15) más la crono de `ultima` (0,15): cuatro, y la que se retira es la crono tardía del paso 1, quedando prólogo, crono temprana y crono final. En `vu_corta` no puede dispararse por construcción (`n ≤ 5 < 6`: sin prólogo; `n < 15`: sin segunda crono) y el test lo sella como invariante.
- **`maxFinalesAlto`.** `vu_corta`: ≤ 1 reina. `vu_semana`: ≤ 3 etapas `acabaArriba` y ≤ 2 seguidas (mapa 07 §2.2: «1 o 2 finales en alto» en una semana; Catalunya e3 y e4 son el máximo). `vu_gran_vuelta`: ≤ `ARCH.bloques.gv.maxAltaMontana` (7) etapas `esReina` (la Vuelta con 8 a 10 finales en alto es el techo real y se queda fuera a propósito: la Vuelta es real). El sobrante, de atrás hacia delante y sin tocar la última, pasa a `media`.
- **`descansos`.** Solo `vu_gran_vuelta`. Primera semana = etapas `1..ARCH.bloques.gv.descansos[0]` (9): ninguna reina y a lo sumo `primeraSemanaFinalesAlto` (1) etapa `acabaArriba` (Galibier 2024 e4, Tagliacozzo 2025 e7: una, no dos). La reina de la primera semana la mueve `reinaTarde`; el segundo final en alto pasa a `media`. La regla es la misma que da los descansos: `descansosDe(n) = n >= ROUTE.grandTourStages ? ARCH.bloques.gv.descansos.filter((d) => d < n) : []`, que `buildRace` escribe en `restAfter` (hoy solo lo rellenan las ediciones, mapa 02 §1; ninguna vuelta generada de hoy lo gana porque ninguna llega a 15).

Orden de aplicación en `composeTour`: `mixRoles` (1-4) → prólogo → cronoescalada → reina en la cordillera → `descansos` → `reinaTarde` → `bloqueMontana` → `llanasEntreBloques` → `maxFinalesAlto` → `maxCronos` → reina en la cordillera (segunda pasada: un intercambio de bloque puede haber dejado una reina en una meta que no la admite) → `garantias`. Test: 120 semillas × cada `n` de [2; 21] × un territorio por relieve (BE llano, `generico` ondulado, GB media, ES montaña, CO alta), cero violaciones de bloque tras la pasada, cero reinas fuera de una meta admisible, y las cinco garantías en verde tras la pasada (V13 y V14 de la sección 9 son estas mismas comprobaciones sobre el calendario entero).

### 7.3 Lo que se conserva de `mixRoles`, las dos tiradas nuevas y `ARCH.pesosComposicion`

Se conserva, línea por línea y con sus constantes: el paso 1 (crono según `ROUTE.ittMinStages` 3, `ittAlwaysFlatStages` 4, `ittChanceShort` 0,6, `ittChanceWeek` 0,9, `ittEarlierChance` 0,35, `ittSecondStages` 15 y `ittSecondPosition` 0,35; `constants.ts` l. 1280-1294; los km de crono `ittKmMin` 14, `ittKmRange` 12, `ittLongStages` 10, `ittLongKmMin` 26 y `ittLongKmRange` 18 en l. 1296-1300), el paso 2 (`lastDecisiveChance` {0,3; 0,55; 0,85}, `grandTourStages` 15, `grandTourLastDecisiveFactor` 0,4, `lastSummitShare` {0; 0,35; 0,8}; l. 1306-1311), el paso 4 entero (`selectiveMinFraction` {0,35; 0,55; 0,7}, `uphillFinishMinStages` 4, l. 1323-1326, y la garantía de fondo). Las tres claves `flat | hilly | mountain` de esas tablas sobreviven como índice, calculado por `mixTerrain(terrain)` (l. 430-434) desde el terreno de la fila: el tipo `MixTerrain` (l. 424) deja de ser el modelo de composición (ya no decide qué son las de en medio) y queda como `keyof typeof ROUTE.lastDecisiveChance`. Que la crono y la última etapa se decidan por el terreno PEDIDO y no por el relieve de la ventana es deliberado: «una vuelta llana de 4+ lleva siempre crono» es la voluntad del organizador de `race-sharjah` (`calendar.test.ts` l. 181-188 y l. 248-255), y la geografía no tiene por qué saberla; lo que la geografía sí veta es la reina (§7.1 paso 4).

`garantias(roles, terrain, n, zonas)` es el paso 4 (l. 502-531) como función pura, con dos cambios que hay que escribir: (a) donde hoy `uphillTarget()` (l. 517-518) toma «la más tardía de las que ya tienen puertos, si no el último hueco» para ponerla a `media-alto`, ahora recorre los mismos huecos en el mismo orden pero salta los que su zona no admite: el hueco recibe `media_alto` si `admiteFinalAlto(zonas[i])`, si no `media_muro` si `admiteMuro(zonas[i])` (un `Wall finish` también reparte tiempos y es lo que el Benelux Tour hace en el Muur), y si ninguna zona de la vuelta admite ninguno de los dos, la garantía la cumple la crono, que en `flat` de 4+ existe siempre (l. 476), y se anota en `notas` («sin final en alto posible en golfo: la general es la crono»). Sin este filtro la garantía se cumpliría sobre el PAPEL y no sobre la ETIQUETA: `generateStage` degrada por geografía (`reina_* → media_alto → media → llana`, sección 8 §8.2) cuando la zona no admite el esqueleto, y `calendar.test.ts` l. 172-173 mira `label === 'Uphill finish' || 'Summit finish'` sobre el perfil rendido, no el papel; un `media_alto` en `flandes` (`cota: null`, `finalesAlto: 'ninguno'`, sección 6) habría bajado a `media` y la promesa no habría llegado a la etiqueta. (b) Se añade una **quinta garantía**, por la cola como las otras: ninguna racha de 8 papeles `esLlana` seguidos (mapa 07 §2.1 regla 4: «nunca hay ocho llanas seguidas»); el octavo pasa a `media`. Es garantía y no regla de bloque porque endurece, y las reglas de bloque no endurecen (§7.2). Hoy con `selectiveMinFraction.flat` 0,35 una racha de 8 llanas necesita `n ≥ 13`, así que solo `vu_larga` y `vu_gran_vuelta` la ven dispararse.

Lo que cambia dentro del paso 3: `pickRole` sortea con una sola tirada por etapa, como hoy, pero sobre los nueve papeles en línea y con la fila de `ARCH.pesosComposicion` del relieve de la meta de ESA etapa (`ZONAS[metas[i]].relieve`), no con `ROUTE.mixWeights[terrain]` (l. 1315-1319, que se retira en el paso 8). La tabla es la de arquitectura §7.3 (las filas suman 1,00):

| relieve | llana | llana_viento | media | media_alto | media_muro | reina_alto | reina_valle | reina_encadenada | montana_corta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| llano | 0,50 | 0,25 | 0,15 | 0,07 | 0,03 | 0 | 0 | 0 | 0 |
| ondulado | 0,40 | 0,10 | 0,25 | 0,15 | 0,10 | 0 | 0 | 0 | 0 |
| media | 0,28 | 0,04 | 0,28 | 0,18 | 0,10 | 0,06 | 0,04 | 0 | 0,02 |
| montana | 0,20 | 0,02 | 0,22 | 0,14 | 0,05 | 0,16 | 0,12 | 0,04 | 0,05 |
| alta | 0,16 | 0 | 0,18 | 0,10 | 0,02 | 0,22 | 0,14 | 0,10 | 0,08 |

Dos ajustes de lectura: `llana_viento` solo existe si `ZONAS[meta].viento ≥ 2`; si no, su peso se suma a `llana` (el papel promete «llano abierto» en la ficha, nunca abanicos: decisión 17). Y los 0,12 de reina de la fila `media` (`ardenas`, `italia_centro`, `levante`, `britanicas`) solo sobreviven cuando la meta es la cordillera del país o una zona `montana`/`alta`, lo que en una zona de relieve `media` solo ocurre si ella misma es la cordillera; en `britanicas` (GB e IE, `cordillera: null`, relieve `media`, sección 6 §6.3) se degradan siempre, y en `ardenas` (BE, LU) también. PT y los Balcanes no son el caso: `portugal` y `balcanes` son zonas `montana` con cordillera propia (sección 6: la Torre es la reina de la Volta), y allí la reina es legítima. En cualquier otra zona `media` la regla de §7.1 paso 4 los degrada a `media_alto`, que es la lectura correcta de «reina en media montaña»: un final en alto de 3 a 7 km.

Las dos tiradas nuevas, en este orden y después del paso 4 de `mixRoles`:

1. **Prólogo**: si `n ≥ ROUTE.ittWeekStages` (6) y `rand() < TOUR_SKELETONS[id].primera.prologo` (0,25; 0,3 en `vu_gran_vuelta`; D3), `roles[0] = 'prologo'`. Coexiste con la crono del paso 1 (Romandía: prólogo de 3 a 5 km más CRI de 15 a 20; Suiza: crono el día 1 y el último; mapa 07 §2.2). Su kilometraje lo da el rango `km` del esqueleto `et_prologo` (sección 5; V13 exige [3; 8]). La p del prólogo vive SOLO en `TOUR_SKELETONS[id].primera.prologo` (no cabe en un escalar: vale 0,3 en gran vuelta); el `ARCH.itinerario.prologoP` del literal de la sección 12 sobra y la pasada de coherencia lo quita, remitiendo la fila de D3 a `TOUR_SKELETONS`.
2. **Cronoescalada**: si `T.cordillera !== null`, hay una `cri` en `i ≥ 1` y `admiteReina(metas[i])`, con `rand() < ARCH.itinerario.cronoescaladaP` (0,08; D3) esa `cri` pasa a `cronoescalada` (Peyragudes, Tour 2025 e13; mapa 07 §2.1). Sigue siendo `timeTrial: true` (`stageKind.test.ts` re-sellado: «una cronoescalada sin `timeTrial` es media», decisión 42), así que cuenta para «lleva crono» en las garantías. El nombre canónico de la constante es `cronoescaladaP`, el de la sección 12 y la 18.

Advertencia que hay que escribir y no esconder (juez del motor §1, l. 44): `mixRoles` tira de UN `rand` secuencial, y las `n − 1` tiradas de metas van delante de él, la del prólogo y la cronoescalada detrás, y la semilla pasa de `mix|${seedBase}|${n}|${terrain}` a `arch|${raceId}`. Las 72 composiciones de hoy cambian TODAS, no solo las que ganan un prólogo. No hay forma de conservarlas (los pesos cambian igualmente) y no se intenta: `smallTours` (10 carreras: 6 generadas, que son las 4 vueltas `race-sharjah`, `race-besseges`, `race-provence` y `race-victoria` más `race-almeria` y `race-tramuntana` de un día, y 4 de edición, `race-arabia`, `race-oman`, `race-down-under` y `race-colombia`, que están en `RACE_EDITIONS`; `sim/smallTours.ts` l. 63-104 contra `editions.ts`; mapa 04 §2) se remide pareado en el paso 9 con la banda `photoRepeatTopFive` como la más expuesta, porque «la COMPOSICIÓN de `stageMix` entra en la banda» (mapa 04 §2, `targets.ts` l. 574-577), y el reloj es 3.900 s (mapa 06 §3.2). Consecuencia sobre lo que sella `calendar.test.ts`: las garantías de l. 176-209 y l. 223-265 siguen verdes sin tocar una aserción (con `DEFAULT_ROUTE_CONTEXT` el territorio es `FALLBACK`, cuya zona `generico` admite `media_alto`, así que la etiqueta llega: §7.5); UNA se re-sella con causa escrita: «la primera etapa es siempre llana y nunca es la crono» (l. 211-221) pasa a «la primera etapa es llana o prólogo de ≤ 8 km, nunca un final en alto ni una crono en línea», porque el prólogo en `roles[0]` es la decisión 42.

**La consecuencia sobre el 40 % de reinas de hoy**, con aritmética y no con medida (la medida la da `routeCensus` en el paso 7): hoy una vuelta `mountain` de 7 etapas espera 5 × 0,40 = 2,0 reinas en medio más 0,85 × 0,8 = 0,68 en la última, 2,7 de 7 (38 %), todas `mountainSegments` (mapa 07 §2.1: «dobla lo real»). Con la tabla, solo las etapas con meta en zona `montana`/`alta` pueden ser reina (0,37 y 0,54 de masa respectivamente), y en una ventana española de 4 zonas (meseta, cantábrico, pirineos, levante; geografía §5.2 traducida en la sección 6) eso son 2 o 3 de las 5 de en medio: 0,9 a 1,6 reinas, más la última si su meta admite. Resultado esperado: de 1,5 a 2,3 reinas por vuelta de 7 (del 21 al 33 %), repartidas en cuatro formas, y el resto de la dureza como `media_alto` y `media_muro`. Banda de arquitectura §11.3 que lo vigila: «≥ 9 papeles de etapa distintos en vueltas» sobre el calendario (sección 13).

### 7.4 Kilómetros por clase y papel: `kmDe`

`mixKm` (l. 536-554) da de 145 a 195 km a cualquier clase: una .2 de cinco etapas sale con etapas de 165 a 195 km, «la vuelta .2 más larga de Europa» (mapa 07 §4.1), y las 142 carreras de un día sin `km` miden 210 exactos (`row.km ?? 210`, l. 929; mapa 02 §1). `kmDe` lo sustituye con `ARCH.km.porClase` como TABLA por clase y papel, no como factor (decisión 36, banco §7.3: un factor 0,75 sobre el rango WT de un día da [150; 195] para una .2, por encima de los 180 del mapa 07 §4.1):

```ts
export type KmRole = StageRole | 'un_dia' | 'un_dia_u23' | 'cri_u23'    // los tres extra solo los usan buildRace y nationalChampionships
export function kmDe(role: KmRole, raceClass: RaceClass, n: number, last: boolean, rand: () => number): number
// n = número de etapas de la vuelta (1 en un día y en los nacionales de ruta; los nacionales de crono pasan 1 también:
//     su rango no depende de n, ver abajo). Es lo que mixKm(role, n, last, rand) recibe hoy (l. 536-543) y kmDe conserva.
// ARCH.km.porClase[raceClass][columna(role)] = [min, rango]; km = min + rand() * rango
// columna, clases WT/Pro/.1/.2: llana|llana_viento → 'llana'; media|media_alto|media_muro → 'media';
//          reina_alto|reina_valle|reina_encadenada → 'reina'; montana_corta → 'corta'; un_dia → 'unDia'
//          cri → ROUTE.itt* como hoy: n >= ROUTE.ittLongStages (10) ? [ittLongKmMin 26, ittLongKmRange 18] : [ittKmMin 14, ittKmRange 12]
//          prologo y cronoescalada → SKELETONS.et_prologo.km y SKELETONS.et_cronoescalada.km (sección 5)
// columna, clase NC: un_dia → 'ruta'; un_dia_u23 → 'rutaU23'; cri → 'crono'; cri_u23 → 'cronoU23' (los cuatro nacionales)
// un_dia_u23 y cri_u23 con raceClass !== 'NC', o un papel de vuelta con raceClass === 'NC', lanzan: no existe esa carrera
// last && !esCrono(role) → × ROUTE.lastStageKmFactor 0,85; después min(km, ARCH.km.maxPorClase[raceClass]); Math.round
```

| Clase | llana | media | reina | corta | un día | Fuente |
| --- | --- | --- | --- | --- | --- | --- |
| WT | [160, 30] | [150, 30] | [140, 40] | [120, 20] | [200, 60] | mapa 07 §4.1: una semana de 140 a 170 por etapa; un día de 175 a 295 (mediana ~230) |
| Pro | [150, 30] | [140, 30] | [140, 35] | [120, 20] | [180, 50] | Pro y .1 por etapas de 130 a 170; un día de 170 a 240 |
| .1 | [140, 30] | [135, 30] | [135, 35] | [115, 20] | [170, 40] | ídem, techo UCI 200 «a confirmar» |
| .2 | [110, 40] | [110, 40] | [115, 40] | [100, 20] | [140, 40] | .2 por etapas de 100 a 160; un día de 140 a 180 |
| NC | | | | | `ruta` [180, 60]; `rutaU23` [140, 40]; `crono` [35, 10]; `cronoU23` [25, 10] | nacional de 180 a 260 en circuito; sub-23 de 120 a 180; cronos nacionales de 38 y 30 km hoy (`calendar.ts` l. 365-366), dentro de `nc_crono.km` [25; 45] (sección 5) |

Las dos columnas de crono nacional existen porque `kmDe` no tiene otra forma de distinguir la élite de la sub-23 (`nc-xx-itt` 38 km, `nc-xx-u23-itt` 30 km hoy): `n` es 1 en las dos y el rango de `ROUTE.itt*` es el de una crono de vuelta (14 a 26 km en vueltas cortas), no el de un campeonato. `nc_crono.km` [25; 45] de la sección 5 las contiene a las dos, y la acotación de §8.4 paso 1 a `[sk.km[0]; …]` no aplasta nada.

`ARCH.km.maxPorClase` = { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 } (D9: se codifican las cifras del mapa 07 §4.1 con «a confirmar» en el comentario de la constante). El techo solo recorta lo GENERADO: las 36 filas con `km` explícito mandan sobre la tabla (Sanremo 288 y Flandes 278,2 van por `km` de fila, `calendar.ts` l. 1010-1016 y l. 1064-1070, las dos por encima del techo WT 260; §B.3 del esqueleto escribe «Sanremo 294» y la pasada de coherencia pone 288) y las ediciones reales llevan su km como contrato (`calendar.test.ts` l. 140-152). En un día, `buildRace` hace `km = row.km ?? kmDe('un_dia', row.raceClass, 1, false, routeRng(\`firma|${row.id}|km\`))`: el 210 desaparece desde la temporada 0 y el kilometraje es firma (estable entre ediciones salvo el jitter ± 6 % de `ARCH.edicion.kmJitter`, sección 10). La semilla lleva el sufijo `|km` y no es `firma|${row.id}` a secas porque `routeRng` (`profileGen.ts` l. 30-44) es mulberry32 sobre el hash de la cadena y dos llamadas con la misma cadena dan la MISMA secuencia desde el principio: con `firma|${raceId}`, que es la que §8.3 abre para instanciar los `Slot.firma` de la misma carrera, la primera tirada del km sería numéricamente la primera tirada de la firma (el km del muro de meta, por ejemplo) y las 142 carreras de un día tendrían el km y el primer parámetro de la meta perfectamente correlacionados. `firma|${raceId}|km` es un subflujo propio, sin `season`, y entra en la lista cerrada de §8.1 y en la tabla de §10.4 (fila «Firma»: «`km` base con `firma|raceId|km`»). Los cuatro nacionales por país (`nc-xx-road` 220, `nc-xx-u23-road` 180, `nc-xx-itt` 38, `nc-xx-u23-itt` 30 hoy, `calendar.ts` l. 365-374, mapa 02 §3) pasan a `kmDe('un_dia', 'NC', 1, …)` = [180; 240], `kmDe('un_dia_u23', 'NC', 1, …)` = [140; 180], `kmDe('cri', 'NC', 1, …)` = [35; 45] y `kmDe('cri_u23', 'NC', 1, …)` = [25; 35], sembradas con `firma|nc-xx-…|km`. `raceRoutes.test.ts` no cambia porque `n` sigue viniendo de la fila (decisión 44). La firma de `kmDe` en §B.2 del esqueleto y en la sección 3 (`kmDe(role: StageRole | 'un_dia' | 'un_dia_u23', raceClass, last, rand)`) es la anterior a esta corrección: la canónica es la de aquí, con `n` y `cri_u23`, y la pasada de coherencia la propaga a §B.2, a la sección 3 y al literal `ARCH.km.porClase.NC` de la sección 12, que gana `crono` y `cronoU23`.

Bandas de calendario que esto sostiene (sección 13, `ROUTE_CENSUS_TARGETS`): p90 de km de las etapas .2 ≤ 170; ninguna etapa generada por encima de `maxPorClase`; y en `tour.test.ts`, 120 semillas × clase × `n ∈ {3, 5, 8}`: todo `km[i]` dentro de `[min·0,85; min + rango]` de su columna (155 en la reina .2, 150 en llana y media .2, 120 en corta .2).

### 7.5 `composeTour`, `stageMix` con firma conservada y lo que ve `buildRace`

```ts
export interface RouteContext {          // lo que hoy stageMix no sabe
  raceId?: string                        // si falta, stageMix usa seedBase como raceId (y RACE_REGION no lo conoce: ancla en ruta[0])
  country: string | null                 // null → TERRITORIOS fallback (zona `generico`)
  raceClass: RaceClass
  format: RaceFormat
  season: number
}
export const DEFAULT_ROUTE_CONTEXT: RouteContext = { country: null, raceClass: '2', format: 'una-semana', season: BASE_SEASON }

export function composeTour(raceId: string, n: number, terrain: RouteTerrain, ctx: RouteContext): StageSpec[]
// 1. sk = tourSkeletonDe(n, ctx.raceClass)          (sin dado)
// 2. it = itinerarioDe(raceId, ctx.country, n, terrain, ctx.raceClass, ctx.format)
// 3. it.papeles.map((role, i) => generateStage({ raceId, stageIndex: i + 1, season: ctx.season, km: it.km[i], role,
//      terrain, geo: ZONAS[it.metas[i]], desde: it.desde[i] !== it.metas[i] ? it.desde[i] : undefined,
//      raceClass: ctx.raceClass, format: ctx.format, routeSource: 'generado' }))
//    → { kind, label, profile, timeTrial, routeSource, arch } (StageSpec gana routeSource y arch; stagesFrom los conserva)

export function stageMix(n: number, terrain: RouteTerrain, seedBase: string,
  ctx: RouteContext = DEFAULT_ROUTE_CONTEXT): StageSpec[] { return composeTour(ctx.raceId ?? seedBase, n, terrain, ctx) }
```

Las tres formas (`composeTour(raceId, n, terrain, ctx)`, `RouteContext` con `raceId?` y `country: string | null`, `Itinerario` con `notas`) son las de la sección 3 §3.6, que es el modelo; esta sección las repite tal cual y no añade `routeSource` a `RouteContext` porque `composeTour` solo produce `'generado'` (la edición no pasa por aquí, §7.6). `stageMix` conserva la firma con el cuarto parámetro por defecto (decisión 19, I-17) para que `calendar.test.ts` l. 168-266 y `stageKind.test.ts` compilen en todos los pasos del plan; con `DEFAULT_ROUTE_CONTEXT` el territorio es el `FALLBACK` (`generico`, ondulado, `cordillera: null`, con `cota` no nula y `finalesAlto: 'corto'`), y por eso `stageMix(5, 'mountain', seed)` sigue cerrando arriba en más de la mitad de las semillas (`lastDecisiveChance.mountain` 0,85 × `lastSummitShare` 0,8 da `reina_alto`, que §7.1 paso 4 degrada a `media_alto`; `generico` admite `et_media_alto`, así que la etiqueta rendida es `Uphill finish`, que es lo que `calendar.test.ts` l. 223-235 mira). `buildRace` (l. 900-939; la rama de `stageMix` en l. 934-938, con la llamada en l. 937) pasa a `stagesFrom(composeTour(row.id, row.stages, row.terrain ?? 'flat', { raceId: row.id, country, raceClass: row.raceClass, format: 'una-semana', season }))` con `restAfter: descansosDe(row.stages)`, y `calendarForSeason` es quien aporta `season` (sección 10). Los papeles, `timeTrial` y `n` son identidad (decisión 20): `edition.test.ts` sella que `itinerarioDe` no lee `season` y que temporadas 0 a 5 devuelven los mismos `papeles` y `metas`.

Lo que se retira de `ROUTE` con el generador viejo (paso 8): `mixWeights` (l. 1315-1319), `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit` (l. 1331-1334). Lo que se conserva tal cual: todo `itt*`, `lastDecisiveChance`, `grandTourStages`, `grandTourLastDecisiveFactor`, `lastSummitShare`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor` (l. 1336; sección 12).

### 7.6 Las etapas de edición no pasan por aquí

Las 60 entradas de `RACE_EDITIONS` (3 grandes vueltas, 54 vueltas de una semana y 3 clásicas de un día; `editions.ts` l. 25, mapa 02 §7) conservan composición real: número de etapas, km, terreno por etapa y `restAfter`. Ni `itinerarioDe` ni `composeTour` las tocan: `stagesFromEdition` (`calendar.ts` l. 230-241) deriva el papel del `EditionTerrain` (`'flat' | 'hilly' | 'mountain' | 'itt' | 'cobbles'`, `editions.ts` l. 10) de cada etapa y llama a `generateStage` con `routeSource: 'edicion'`, `km` como contrato al 0,1 y la zona de `regionOf(raceId, i, country)` por etapa (`race-france` e6 → `pirineos`; sección 6 y sección 11). Las cinco filas, cerradas:

| `EditionTerrain` | `role` de la `StageRequest` | Esqueleto | Nota |
| --- | --- | --- | --- |
| `mountain` | `reina_alto` | un `et_reina_*` por sorteo `arch` (sección 5 §5.7), con la forma que decida el esqueleto | si la zona no admite reina se degrada por geografía y se anota (Muur del Benelux en `flandes`: `et_media_muro`, sección 5) |
| `hilly` | `media` | `et_media_*` | |
| `flat` | `llana` | `et_llana` (`et_llana_viento` si `viento ≥ 2`) | |
| `itt` | `cri` | `et_prologo` si `km ≤ 8`, si no `et_crono`; nunca `et_cronoescalada` | el `km` es contrato y la edición no declara final en alto |
| `cobbles` | `llana` | `ud_adoquin_ligero`, fijado con `fixed.skeleton` | las 4 etapas `cobbles` de edición (`editions.ts` l. 86, 217, 225, 415: Castelló, Hoeilaart, Geraardsbergen, Wallers-Arenberg) son la ÚNICA excepción a I-9 («etapas de edición reciben esqueletos DE ETAPA»), declarada aquí, en la sección 5 §5.8 y en la sección 11: no existe `et_adoquin` en el catálogo de 32, `StageRole` no tiene papel de adoquín, y un adoquín de etapa real es exactamente un Denain. Sigue siendo `routeSource: 'edicion'` con `km` como contrato; `skeletons.test.ts` (sección 5 §5.9) sella que ninguna etapa `edicion` recibe un `ud_*` salvo estas, y `calendario.test.ts` que las 4 rinden segmentos `paves` |

El papel de una etapa de edición es también identidad: lo fija el dato, no un dado.

### 7.7 Tests de `tour.test.ts` (paso 7 del plan, antes del código)

```ts
describe('grammar/tour: composición como itinerario', () => {
  const seeds = Array.from({ length: 120 }, (_, i) => `tour-${i}`)
  const PAISES = { BE: 'llano', XX: 'ondulado', GB: 'media', ES: 'montana', CO: 'alta' }   // XX = fallback; GB: britanicas, cordillera null

  it('las cinco garantías siguen tras bloques y reparación', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 11, 15, 21]) for (const cc of Object.keys(PAISES)) for (const s of seeds) {
      const it = itinerarioDe(s, cc, n, 'flat', '2', 'una-semana')
      expect(it.papeles.some((r) => esCrono(r) || acabaArriba(r) || r === 'media_muro')).toBe(true)   // garantía de fondo
      if (n >= 4) expect(it.papeles.some(esCrono)).toBe(true)                      // llana de 4+ lleva crono
      expect(it.papeles[0] === 'llana' || it.papeles[0] === 'prologo').toBe(true)  // re-sellado: prólogo permitido
      it.papeles.forEach((_, i) => expect(it.papeles.slice(i, i + 8).every(esLlana) && i + 8 <= n).toBe(false))   // nunca 8 llanas
    }
  })
  it('ninguna reina en un país sin cordillera ni zona de finales largos (BE, NL, DK, AE, AU)', () => {
    for (const cc of ['BE', 'NL', 'DK', 'AE', 'AU']) for (const n of [4, 6, 8]) for (const s of seeds) {
      const it = itinerarioDe(s, cc, n, 'mountain', 'Pro', 'una-semana')
      expect(it.papeles.filter(esReina)).toHaveLength(0)
    }
  })
  it('AR y CL: como máximo una reina por vuelta, siempre reina_alto (et_reina_blanda)', () => {
    for (const cc of ['AR', 'CL']) for (const n of [5, 8]) for (const s of seeds) {
      const reinas = itinerarioDe(s, cc, n, 'mountain', '2', 'una-semana').papeles.filter(esReina)
      expect(reinas.length).toBeLessThanOrEqual(1); reinas.forEach((r) => expect(r).toBe('reina_alto'))
    }
  })
  it('la reina cae en una meta de cordillera o de zona montana/alta, y tarde', () => {
    for (const s of seeds) {
      const it = itinerarioDe(s, 'ES', 7, 'mountain', 'WT', 'una-semana')
      it.papeles.forEach((r, i) => { if (esReina(r)) { expect(admiteReina(it.metas[i], 'pirineos')).toBe(true); expect(i).toBeGreaterThanOrEqual(4) } })
    }
  })
  it('gran vuelta generada: descansos tras 9 y 15, reina en ventanaReina(n), ≤ 1 final en alto en la primera semana, ≤ 7 de alta montaña, ≤ 3 cronos', () => {
    expect(descansosDe(21)).toEqual([9, 15]); expect(descansosDe(15)).toEqual([9]); expect(descansosDe(11)).toEqual([])
    expect(ventanaReina(21)).toEqual([14, 19]); expect(ventanaReina(16)).toEqual([10, 14]); expect(ventanaReina(15)).toEqual([10, 13])
    for (const n of [15, 16, 21]) { let conReina = 0
      for (const s of seeds) { const it = itinerarioDe(s, 'ES', n, 'mountain', 'WT', 'gran-vuelta')
        it.papeles.forEach((r, i) => { if (esReina(r)) expect(i >= ventanaReina(n)[0] && i <= ventanaReina(n)[1]).toBe(true) })
        expect(it.papeles.filter(esCrono).length).toBeLessThanOrEqual(3)
        if (it.papeles.some(esReina)) conReina++ /* y las demás aserciones de §7.2 */ }
      expect(conReina).toBeGreaterThan(seeds.length / 2) }                         // n = 15 y 16 no se quedan sin reina por construcción
  })
  it('vu_corta lleva como mucho una crono y una reina; el prólogo solo aparece con n ≥ 6', () => { /* n 2..5 × 120 semillas */ })
  it('km por clase: ninguna etapa .2 supera min + rango de su columna (155 reina, 150 llana y media, 120 corta) ni 180; p90 de .2 ≤ 170', () => { /* kmDe × 120 semillas × n ∈ {3, 5, 8} */ })
  it('la crono nacional distingue élite y sub-23, y la de vuelta larga usa el rango largo', () => {
    for (const s of seeds) { const r = routeRng(s)
      expect(kmDe('cri', 'NC', 1, false, r)).toBeGreaterThanOrEqual(35); expect(kmDe('cri_u23', 'NC', 1, false, r)).toBeLessThanOrEqual(35)
      expect(kmDe('cri', 'WT', 10, false, r)).toBeGreaterThanOrEqual(26); expect(kmDe('cri', 'WT', 5, false, r)).toBeLessThanOrEqual(26) }
  })
  it('el itinerario es identidad: no lee season, arranca en la zona curada y avanza por una ventana contigua de la ruta', () => {
    for (const race of SEASON_CALENDAR.filter((r) => !r.championshipCountry && !RACE_EDITIONS[r.id] && r.stages.length > 1)) {   // las 72
      const it = itinerarioDe(race.id, race.country!, race.stages.length, terrainDe(race.id), race.raceClass, 'una-semana')
      expect(it.metas[0]).toBe(RACE_REGION[race.id].default)                                     // decisión 14: sin sorteo de zona
    }
    const it = itinerarioDe('race-x', 'ES', 6, 'hilly', '1', 'una-semana')                         // sin RACE_REGION: ancla en ruta[0]
    const ruta = TERRITORIOS.ES.ruta.map((z) => z.zona), L = ruta.length
    expect(it.metas[0]).toBe(ruta[0])
    it.metas.forEach((z, i) => { if (i > 0) { const k = ruta.indexOf(it.metas[i - 1]); expect([ruta[k], ruta[(k + 1) % L], ruta[(k - 1 + L) % L]]).toContain(z) } })
    expect(it.notas.every((n) => typeof n === 'string')).toBe(true)
  })
})
```

Con eso, «Bélgica sin reina», «la reina en los Pirineos y tarde», «Asturias arranca en el Cantábrico en todos los mundos», «una .2 de 100 a 155 km por etapa» y «los descansos de una gran vuelta generada» dejan de ser intenciones y son aserciones que corren en `test:rapido` antes de que exista una línea de `composeTour`.
