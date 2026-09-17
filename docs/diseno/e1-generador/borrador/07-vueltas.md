## 7. Las vueltas por etapas: territorio, itinerario, papeles, km por clase

Hoy una vuelta generada es `stageMix(n, terrain, seedBase)` (`calendar.ts` l. 546-561): reduce el terreno de la fila a tres (`mixTerrain`, l. 416-420), sortea cinco papeles etapa a etapa (`mixRoles`, l. 457-519, con `pickRole` sobre `ROUTE.mixWeights`, l. 434-443) y da kilómetros sin mirar la clase (`mixKm`, l. 522-543). Pasan por ahí 72 de las 132 vueltas (hilly 37, mountain 19, flat 16; mapa 02 §1 y §4) y las 886 etapas de equipos que no son de edición se componen sin saber en qué país están (mapa 02 §6). Lo que este capítulo cambia es lo que hay ANTES del sorteo (un itinerario por el territorio del país), lo que hay DENTRO de cada papel (doce papeles indexados por el relieve de la meta, no tres terrenos) y lo que hay DESPUÉS (reglas de bloque como reparación determinista y kilómetros por clase y papel). Lo que NO cambia es el orden en que `mixRoles` decide y sus cuatro garantías, que son de dominio y que `calendar.test.ts` l. 176-266 sella.

### 7.1 El territorio y la ventana: `itinerarioDe`

`itinerarioDe` (`routes/grammar/tour.ts`) es la primera decisión de una vuelta generada y es identidad: se tira con `routeRng(\`arch|${raceId}\`)`, sin `season`, y por eso una carrera recorre siempre el mismo trozo de su país (decisión 20: los papeles no son edición). Lee `TERRITORIOS[country]`(sección 6: los 56 países con carreras de equipos, mapa 02 §10; los 77 restantes de`COUNTRIES`caen a un territorio`fallback`de una sola zona`generico`, contado en `geo.test.ts`).

```ts
// packages/engine/src/routes/grammar/tour.ts
export interface Itinerario {
  metas: GeoZone[] // zona de la meta de cada etapa; la salida de la i+1 es la meta de la i
  papeles: StageRole[]
  km: number[] // ya con ARCH.km.porClase, maxPorClase y ROUTE.lastStageKmFactor
  desde: GeoZone[] // desde[0] = metas[0]; desde[i] = metas[i-1]. desde[i] !== metas[i] es transición
  notas: string[] // reparaciones aplicadas («e5: reina → media_alto, ventana sin cordillera»)
}
export function itinerarioDe(
  raceId: string,
  country: string,
  n: number,
  terrain: RouteTerrain,
  raceClass: RaceClass,
  format: RaceFormat,
): Itinerario
```

Paso a paso, con el orden de consumo del RNG fijado (todo lo que sigue tira del mismo `rand` y en este orden, para que el test de determinismo de `calendar.test.ts` l. 237-246 sea reproducible):

1. **Ventana.** `T = TERRITORIOS[country]`, `L = T.ruta.length`, `w = min(n, L)`. Los arranques candidatos `s ∈ [0, L)` definen ventanas circulares `ruta[s..s+w-1 mod L]`. Si `terrain === 'mountain'` y `T.cordillera !== null`, solo valen los arranques cuya ventana contiene la cordillera; si `terrain ∈ {flat, cobbles, itt}` y existe algún arranque cuya ventana la excluye, solo valen esos; en cualquier otro caso valen todos. Una tirada elige el arranque con probabilidad proporcional a `ruta[s].peso` (es el único uso del peso en composición; `zonaDe` lo usa para un día). El terreno de la fila es aquí SESGO: pide la cordillera o la evita, pero no la inventa (decisión 18).
2. **Metas.** `metas[0] = ventana[0]`; para `i = 1..n-1`, si el cursor no está al final de la ventana y `rand() < ARCH.itinerario.avance` (0,6), avanza; si no, se queda. Una tirada por etapa, siempre (también cuando el cursor ya no puede avanzar: así el número de tiradas depende solo de `n`). Quedarse es lo que hace los bloques: dos etapas seguidas con meta en `alpes` son un bloque de montaña por construcción, no por una regla de reparación (mapa 07 §2.1 regla 4). Con `w = 1` (AD, AE, DK: territorios de una zona) todas las metas son la misma y la vuelta es entera de esa zona.
3. **Papeles** (§7.3): `mixRoles` conservado, con el sorteo de las de en medio sobre `ARCH.pesosComposicion[ZONAS[metas[i]].relieve]`, más las dos tiradas nuevas (prólogo, cronoescalada).
4. **La reina en la cordillera.** Un papel de reina (`reina_alto`, `reina_valle`, `reina_encadenada`, `montana_corta`) solo se admite en una etapa cuya meta sea `T.cordillera` o una zona con `relieve ∈ {montana, alta}`. La tabla de pesos ya lo garantiza para las de en medio (las filas `llano` y `ondulado` tienen 0 en las cuatro), así que la regla solo actúa sobre la reina que pone el paso 2 de `mixRoles` (última etapa decisiva con `lastSummitShare`) y sobre la que las garantías o los bloques desplacen: se intercambia con la etapa admisible más tardía que no sea la primera ni una crono; si no hay ninguna, se degrada a `media_alto` y se anota en `notas`. Consecuencia sellada en `tour.test.ts`: cero reinas en BE, NL, DK, AE, AU (todos con `cordillera: null`, decisión 13 y D8), con la vuelta belga cerrándose con `media_alto` sobre un berg como hace el Benelux Tour (mapa 07 §2.2).
5. **Reparación de bloques** (§7.2) y **segunda pasada de garantías**: las cuatro garantías de `mixRoles` se extraen a una función pura `garantias(roles, terrain, n)` (el cuerpo de l. 486-517 sin tocar) y se vuelven a aplicar después de los bloques, porque una reparación que degrada `reina_alto → media` puede dejar la vuelta sin final en alto y la garantía de fondo es la que manda («ninguna vuelta se queda sin crono ni final en alto», `calendar.test.ts` l. 200-209). `garantias` solo endurece y solo por la cola, así que no rompe `reinaTarde` ni `descansos`; el test lo comprueba de todos modos.
6. **Kilómetros** (§7.4): `km[i] = kmDe(papeles[i], raceClass, i === n-1, rand)`.
7. **Transición.** `desde[i] = metas[i-1]`. Cuando `desde[i] !== metas[i]`, `generateStage` recibe `desde` en `StageRequest` y dibuja el primer `ARCH.itinerario.transicion` (0,4) de la etapa con la `amplitud` de `desde` y sin sus dificultades, y el 0,6 restante con la firma de la meta (sección 8): Meseta → Cantábrico es 70 km de páramo y 100 de sierra. Con `desde === metas[i]` la etapa es entera de la zona.

Lo que `itinerarioDe` NO hace: no elige esqueleto de etapa (eso es `generateStage` con `arch|raceId|{i}`, sección 8), no mira `season` (sección 10) y no llama a nada de `stage/` (decisión 4).

### 7.2 Los cuatro esqueletos de composición y sus reglas de bloque

`TOUR_SKELETONS` es un catálogo de cuatro entradas elegidas sin dado por `n` y clase. La frontera entre `vu_corta` y `vu_semana` en `n = 5` la decide la clase (arquitectura §7.2: «.2 y .1 de 3 a 5», «Pro y WT de 5 a 8»); `vu_corta` baja a `n = 2` porque el calendario tiene una vuelta de dos etapas (mapa 02 §2). `vu_gran_vuelta` no sirve hoy a ninguna carrera (las tres de 21 son de edición, mapa 06 §1.2) y existe para E12; las cinco vueltas generadas de 9 a 11 etapas (mapa 02 §2: 9 (2), 10 (2), 11 (1)) van por `vu_larga`.

| Id               | `n`      | Se elige cuando                    | `primera`                        | `ultima`                                                       | Reglas de bloque                                                                                                                   |
| ---------------- | -------- | ---------------------------------- | -------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `vu_corta`       | [2; 5]   | `n ≤ 4`, o `n = 5` con clase .1/.2 | `{ llana: 1 }`                   | `'ROUTE.lastDecisiveChance'`                                   | `maxCronos` 1, `maxFinalesAlto` (≤ 1 reina)                                                                                        |
| `vu_semana`      | [5; 8]   | `n = 5` con WT/Pro, o `n ∈ [6; 8]` | `{ llana: 0,75; prologo: 0,25 }` | `'ROUTE.lastDecisiveChance'`                                   | `reinaTarde` (reina en las tres últimas), `maxFinalesAlto` (≤ 3, ≤ 2 seguidos), `maxCronos` 2                                      |
| `vu_larga`       | [9; 14]  | `n ∈ [9; 14]`                      | `{ llana: 0,75; prologo: 0,25 }` | `'ROUTE.lastDecisiveChance'`                                   | `reinaTarde` (último tercio), `bloqueMontana` (bloques de 2 o 3 seguidas), `llanasEntreBloques` (≥ 2), `maxCronos` 2               |
| `vu_gran_vuelta` | [15; 21] | `n ≥ 15`                           | `{ llana: 0,7; prologo: 0,3 }`   | `{ llana: 0,85; cri: 0,15 }` (Tour 2024, mapa 07 §2.1 regla 3) | `descansos`, `reinaTarde` ([15; 20]), `bloqueMontana`, `llanasEntreBloques`, `maxFinalesAlto` (≤ 7 de alta montaña), `maxCronos` 3 |

`primera` se tira solo si `n ≥ ROUTE.ittWeekStages` (6): es la tirada nueva del prólogo (decisión 42, D3), y `roles[0]` puede ser por primera vez una crono (`mixRoles` no la toca: bucles desde 1, l. 483 y 493). `ultima` con el valor `'ROUTE.lastDecisiveChance'` significa «el paso 2 de `mixRoles` tal cual» (`lastDecisiveChance` × `grandTourLastDecisiveFactor` si `n ≥ 15`, `lastSummitShare`); la reina de ese paso es `reina_alto` sin tirada extra, porque «acaba arriba» es exactamente lo que `lastSummitShare` decide. En `vu_gran_vuelta` el paso 2 se sustituye por una sola tirada sobre `ultima` (`cri` con 0,15, si no `llana`): una gran vuelta se cierra con el paseo o, por excepción anunciada, con una crono, y nunca arriba (así `grandTourLastDecisiveFactor` 0,4 deja de intervenir en lo generado y se conserva solo por las tres reales y por los lectores que lo citan).

Las reglas se aplican como **reparación determinista después del sorteo**, recorriendo de atrás hacia delante como ya hacen las garantías (l. 488-517), y cada una cambia el papel del hueco que rompe la regla por el más cercano en la escalera `reina_* → media_alto → media → llana`, nunca al revés (una reparación jamás endurece: endurecer es cosa de `garantias`). Ninguna toca `roles[0]` ni una crono. Escritas una a una:

```ts
export interface BlockRule {
  id:
    | 'reinaTarde'
    | 'bloqueMontana'
    | 'llanasEntreBloques'
    | 'maxCronos'
    | 'maxFinalesAlto'
    | 'descansos'
  aplica: (n: number) => boolean
  repara: (roles: StageRole[], zonas: GeoZone[]) => StageRole[] // pura; devuelve copia
}
const esReina = (r: StageRole) =>
  r === 'reina_alto' || r === 'reina_valle' || r === 'reina_encadenada' || r === 'montana_corta'
const acabaArriba = (r: StageRole) =>
  r === 'media_alto' || r === 'reina_alto' || r === 'reina_encadenada' || r === 'montana_corta'
const esMontana = (r: StageRole) => esReina(r) || r === 'media_alto'
const esCrono = (r: StageRole) => r === 'cri' || r === 'prologo' || r === 'cronoescalada'
const admiteReina = (z: GeoZone, cordillera: GeoZone | null) =>
  z === cordillera || ZONAS[z].relieve === 'montana' || ZONAS[z].relieve === 'alta'
```

- **`reinaTarde`.** Ventana admisible de la reina (índices 0-based): `vu_semana` `[n-3, n-1]`; `vu_larga` `[floor(2n/3), n-1]`; `vu_gran_vuelta` `[14, 19] ∩ [0, n-1]` (`ARCH.bloques.gv.reina` [15; 20] en 1-based). Toda reina fuera de la ventana se intercambia con el hueco admisible más tardío dentro de ella (`admiteReina(zonas[j])`, no crono, no `roles[0]`) que no sea ya reina; si no hay hueco, se degrada a `media_alto`. Es la regla que convierte «la reina cae en la tercera semana» (mapa 07 §2.1 regla 2: Plateau de Beille e15, Loze e17, Tre Cime e19) en propiedad estructural.
- **`bloqueMontana`.** (a) Una racha de más de 3 etapas de montaña seguidas (`esMontana`) se corta: de la cuarta en adelante, `reina_* → media_alto → media`. (b) Dos etapas de montaña separadas por exactamente una que no lo es forman bloque: la separadora se intercambia con la montaña anterior si `admiteReina(zonas[i-1])` lo permite; si no, se deja (una .1 que cruza dos sierras con un valle entre medias existe). Mapa 07 §2.1 regla 4: Pirineos e14 y e15, Alpes e17 a e20.
- **`llanasEntreBloques`.** Entre dos bloques de montaña hay al menos `ARCH.bloques.gv.minLlanasEntreBloques` (2) etapas que no lo son; si hay una sola, se resuelve por (b) de arriba. Y nunca 8 llanas seguidas (`!isSelective`): la octava pasa a `media`.
- **`maxCronos`.** `vu_corta` 1 (V13; mapa 07 §2.3: «con 3 etapas nunca hay dos cronos»), `vu_semana` y `vu_larga` 2 (prólogo más crono: Romandía, Suiza), `vu_gran_vuelta` 3 (prólogo más las dos de `ittSecondStages`). La crono sobrante, de atrás hacia delante, pasa a `llana`. En `vu_corta` no puede dispararse por construcción (`n ≤ 5 < 6`: sin prólogo; `n < 15`: sin segunda crono) y el test lo sella como invariante.
- **`maxFinalesAlto`.** `vu_corta`: ≤ 1 reina. `vu_semana`: ≤ 3 etapas `acabaArriba` y ≤ 2 seguidas (mapa 07 §2.2: «1 o 2 finales en alto» en una semana; Catalunya e3 y e4 son el máximo). `vu_gran_vuelta`: ≤ `ARCH.bloques.gv.maxAltaMontana` (7) etapas `esReina` (la Vuelta con 8 a 10 finales en alto es el techo real y se queda fuera a propósito: la Vuelta es real). El sobrante, de atrás hacia delante y sin tocar la última, pasa a `media`.
- **`descansos`.** Solo `vu_gran_vuelta`. Primera semana = etapas `1..ARCH.bloques.gv.descansos[0]` (9): ninguna reina y a lo sumo `primeraSemanaFinalesAlto` (1) etapa `acabaArriba` (Galibier 2024 e4, Tagliacozzo 2025 e7: una, no dos). La reina de la primera semana la mueve `reinaTarde`; el segundo final en alto pasa a `media`. La regla es la misma que da los descansos: `descansosDe(n) = n >= ROUTE.grandTourStages ? ARCH.bloques.gv.descansos.filter((d) => d < n) : []`, que `buildRace` escribe en `restAfter` (hoy solo lo rellenan las ediciones, mapa 02 §1; ninguna vuelta generada de hoy lo gana porque ninguna llega a 15).

Orden de aplicación en `composeTour`: `mixRoles` (1-4) → prólogo → cronoescalada → reina en la cordillera → `descansos` → `reinaTarde` → `bloqueMontana` → `llanasEntreBloques` → `maxFinalesAlto` → `maxCronos` → `garantias`. Test: 120 semillas × cada `n` de [2; 21] × un territorio por relieve (BE llano, `generico` ondulado, PT media, ES montaña, CO alta), cero violaciones de bloque tras la pasada, y las cuatro garantías en verde tras la pasada (V13 y V14 de la sección 9 son estas mismas comprobaciones sobre el calendario entero).

### 7.3 Lo que se conserva de `mixRoles`, las dos tiradas nuevas y `ARCH.pesosComposicion`

Se conserva, línea por línea y con sus constantes: el paso 1 (crono según `ROUTE.ittMinStages` 3, `ittAlwaysFlatStages` 4, `ittChanceShort` 0,6, `ittChanceWeek` 0,9, `ittEarlierChance` 0,35, `ittSecondStages` 15 y `ittSecondPosition` 0,35; `constants.ts` l. 1189-1201), el paso 2 (`lastDecisiveChance` {0,3; 0,55; 0,85}, `grandTourStages` 15, `grandTourLastDecisiveFactor` 0,4, `lastSummitShare` {0; 0,35; 0,8}), el paso 4 entero (`selectiveMinFraction` {0,35; 0,55; 0,7}, `uphillFinishMinStages` 4 y la garantía de fondo). Las tres claves `flat | hilly | mountain` de esas tablas sobreviven como índice, calculado por `mixTerrain(terrain)` (l. 416-420) desde el terreno de la fila: el tipo `MixTerrain` deja de ser el modelo de composición (ya no decide qué son las de en medio) y queda como `keyof typeof ROUTE.lastDecisiveChance`. Que la crono y la última etapa se decidan por el terreno PEDIDO y no por el relieve de la ventana es deliberado: «una vuelta llana de 4+ lleva siempre crono» es la voluntad del organizador de `race-sharjah` (`calendar.test.ts` l. 181-188 y l. 248-255), y la geografía no tiene por qué saberla; lo que la geografía sí veta es la reina (§7.1 paso 4).

Lo que cambia dentro del paso 3: `pickRole` sortea con una sola tirada por etapa, como hoy, pero sobre los nueve papeles en línea y con la fila de `ARCH.pesosComposicion` del relieve de la meta de ESA etapa (`ZONAS[metas[i]].relieve`), no con `ROUTE.mixWeights[terrain]` (l. 1224-1228, que se retira en el paso 8). La tabla es la de arquitectura §7.3 (las filas suman 1,00):

| relieve  | llana | llana_viento | media | media_alto | media_muro | reina_alto | reina_valle | reina_encadenada | montana_corta |
| -------- | ----- | ------------ | ----- | ---------- | ---------- | ---------- | ----------- | ---------------- | ------------- |
| llano    | 0,50  | 0,25         | 0,15  | 0,07       | 0,03       | 0          | 0           | 0                | 0             |
| ondulado | 0,40  | 0,10         | 0,25  | 0,15       | 0,10       | 0          | 0           | 0                | 0             |
| media    | 0,28  | 0,04         | 0,28  | 0,18       | 0,10       | 0,06       | 0,04        | 0                | 0,02          |
| montana  | 0,20  | 0,02         | 0,22  | 0,14       | 0,05       | 0,16       | 0,12        | 0,04             | 0,05          |
| alta     | 0,16  | 0            | 0,18  | 0,10       | 0,02       | 0,22       | 0,14        | 0,10             | 0,08          |

Dos ajustes de lectura: `llana_viento` solo existe si `ZONAS[meta].viento ≥ 2`; si no, su peso se suma a `llana` (el papel promete «llano abierto» en la ficha, nunca abanicos: decisión 17). Y los 0,12 de reina de la fila `media` solo sobreviven cuando la meta es la cordillera del país (PT, balcanes, `britanicas` no: su cordillera es `null`); en cualquier otra zona `media` la regla de §7.1 paso 4 los degrada a `media_alto`, que es la lectura correcta de «reina en media montaña»: un final en alto de 3 a 7 km.

Las dos tiradas nuevas, en este orden y después del paso 4 de `mixRoles`:

1. **Prólogo**: si `n ≥ ROUTE.ittWeekStages` (6) y `rand() < TOUR_SKELETONS[id].primera.prologo` (0,25; D3), `roles[0] = 'prologo'`. Coexiste con la crono del paso 1 (Romandía: prólogo de 3 a 5 km más CRI de 15 a 20; Suiza: crono el día 1 y el último; mapa 07 §2.2). Su kilometraje lo da el rango `km` del esqueleto `et_prologo` (sección 5; V13 exige [3; 8]).
2. **Cronoescalada**: si `T.cordillera !== null`, hay una `cri` en `i ≥ 1` y `admiteReina(metas[i])`, con `rand() < ARCH.itinerario.cronoescalada` (0,08; D3) esa `cri` pasa a `cronoescalada` (Peyragudes, Tour 2025 e13; mapa 07 §2.1). Sigue siendo `timeTrial: true` (`stageKind.test.ts` re-sellado: «una cronoescalada sin `timeTrial` es media», decisión 42), así que cuenta para «lleva crono» en las garantías.

Advertencia que hay que escribir y no esconder (juez del motor §1, l. 44): `mixRoles` tira de UN `rand` secuencial, y las tiradas de ventana y metas van delante de él, la del prólogo y la cronoescalada detrás, y la semilla pasa de `mix|${seedBase}|${n}|${terrain}` a `arch|${raceId}`. Las 72 composiciones de hoy cambian TODAS, no solo las que ganan un prólogo. No hay forma de conservarlas (los pesos cambian igualmente) y no se intenta: `smallTours` (10 carreras, 7 generadas, `sim/smallTours.ts` l. 61-102; mapa 04 §2) se remide pareado en el paso 9 con la banda `photoRepeatTopFive` como la más expuesta, porque «la COMPOSICIÓN de `stageMix` entra en la banda» (mapa 04 §2, `targets.ts` l. 574-577), y el reloj es 3.900 s (mapa 06 §3.2). Consecuencia sobre lo que sella `calendar.test.ts`: las garantías de l. 176-209 y l. 223-266 siguen verdes sin tocar una aserción; UNA se re-sella con causa escrita: «la primera etapa es siempre llana y nunca es la crono» (l. 211-221) pasa a «la primera etapa es llana o prólogo de ≤ 8 km, nunca un final en alto ni una crono en línea», porque el prólogo en `roles[0]` es la decisión 42.

**La consecuencia sobre el 40 % de reinas de hoy**, con aritmética y no con medida (la medida la da `routeCensus` en el paso 7): hoy una vuelta `mountain` de 7 etapas espera 5 × 0,40 = 2,0 reinas en medio más 0,85 × 0,8 = 0,68 en la última, 2,7 de 7 (38 %), todas `mountainSegments` (mapa 07 §2.1: «dobla lo real»). Con la tabla, solo las etapas con meta en zona `montana`/`alta` pueden ser reina (0,37 y 0,54 de masa respectivamente), y en una ventana española de 4 zonas (meseta, cantábrico, pirineos, levante; geografía §5.2 traducida en la sección 6) eso son 2 o 3 de las 5 de en medio: 0,9 a 1,6 reinas, más la última si su meta admite. Resultado esperado: de 1,5 a 2,3 reinas por vuelta de 7 (del 21 al 33 %), repartidas en cuatro formas, y el resto de la dureza como `media_alto` y `media_muro`. Banda de arquitectura §11.3 que lo vigila: «≥ 9 papeles de etapa distintos en vueltas» sobre el calendario (sección 13).

### 7.4 Kilómetros por clase y papel: `kmDe`

`mixKm` (l. 522-543) da de 145 a 195 km a cualquier clase: una .2 de cinco etapas sale con etapas de 165 a 195 km, «la vuelta .2 más larga de Europa» (mapa 07 §4.1), y las 142 carreras de un día sin `km` miden 210 exactos (`row.km ?? 210`, l. 917; mapa 02 §1). `kmDe` lo sustituye con `ARCH.km.porClase` como TABLA por clase y papel, no como factor (decisión 36, banco §7.3: un factor 0,75 sobre el rango WT de un día da [150; 195] para una .2, por encima de los 180 del mapa 07 §4.1):

```ts
export function kmDe(
  role: StageRole | 'un_dia' | 'un_dia_u23',
  raceClass: RaceClass,
  last: boolean,
  rand: () => number,
): number
// ARCH.km.porClase[raceClass][columna(role)] = [min, rango]; km = min + rand() * rango
// columna: llana|llana_viento → 'llana'; media|media_alto|media_muro → 'media';
//          reina_alto|reina_valle|reina_encadenada → 'reina'; montana_corta → 'corta';
//          cri → ROUTE.itt* como hoy (n ≥ ittLongStages 10: [26; 44], si no [14; 26]); prologo y cronoescalada →
//          SKELETONS.et_prologo.km y SKELETONS.et_cronoescalada.km (sección 5)
// last && !esCrono(role) → × ROUTE.lastStageKmFactor 0,85; después min(km, ARCH.km.maxPorClase[raceClass]); Math.round
```

| Clase | llana     | media     | reina     | corta     | un día                           | Fuente                                                                              |
| ----- | --------- | --------- | --------- | --------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| WT    | [160, 30] | [150, 30] | [140, 40] | [120, 20] | [200, 60]                        | mapa 07 §4.1: una semana de 140 a 170 por etapa; un día de 175 a 295 (mediana ~230) |
| Pro   | [150, 30] | [140, 30] | [140, 35] | [120, 20] | [180, 50]                        | Pro y .1 por etapas de 130 a 170; un día de 170 a 240                               |
| .1    | [140, 30] | [135, 30] | [135, 35] | [115, 20] | [170, 40]                        | ídem, techo UCI 200 «a confirmar»                                                   |
| .2    | [110, 40] | [110, 40] | [115, 40] | [100, 20] | [140, 40]                        | .2 por etapas de 100 a 160; un día de 140 a 180                                     |
| NC    |           |           |           |           | ruta [180, 60]; sub-23 [140, 40] | nacional de 180 a 260 en circuito; sub-23 de 120 a 180                              |

`ARCH.km.maxPorClase` = { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 } (D9: se codifican las cifras del mapa 07 §4.1 con «a confirmar» en el comentario de la constante). El techo solo recorta lo GENERADO: las 36 filas con `km` explícito mandan sobre la tabla (Sanremo 294 va por `km` de fila, l. 1038-1101) y las ediciones reales llevan su km como contrato (`calendar.test.ts` l. 140-152). En un día, `buildRace` hace `km = row.km ?? kmDe('un_dia', row.raceClass, false, routeRng(\`firma|${row.id}\`))`: el 210 desaparece desde la temporada 0 y el kilometraje es firma (estable entre ediciones salvo el jitter ± 6 % de `ARCH.edicion.kmJitter`, sección 10). Los cuatro nacionales por país (`nc-xx-road`220,`nc-xx-u23-road`180,`nc-xx-itt`38,`nc-xx-u23-itt`30 hoy, mapa 02 §3) pasan a`kmDe('un_dia', 'NC', …)`= [180; 240],`kmDe('un_dia_u23', 'NC', …)`= [140; 180], y las cronos a`kmDe('cri', 'NC', …)`con el rango largo [26; 44] para la élite y el corto [14; 26] para la sub-23, sembradas con`firma|nc-xx-…`. `raceRoutes.test.ts`no cambia porque`n` sigue viniendo de la fila (decisión 44).

Bandas de calendario que esto sostiene (sección 13, `ROUTE_CENSUS_TARGETS`): p90 de km de las etapas .2 ≤ 170; ninguna etapa generada por encima de `maxPorClase`; y en `tour.test.ts`, 120 semillas × clase × `n ∈ {3, 5, 8}`: todo `km[i]` dentro de `[min·0,85; min + rango]` de su columna.

### 7.5 `composeTour`, `stageMix` con firma conservada y lo que ve `buildRace`

```ts
export interface RouteContext {
  // lo que hoy stageMix no sabe
  raceId?: string
  country: string | null // null → TERRITORIOS fallback (zona `generico`)
  raceClass: RaceClass
  format: RaceFormat
  season: number
}
export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  country: null,
  raceClass: '2',
  format: 'una-semana',
  season: BASE_SEASON,
}

export function composeTour(
  raceId: string,
  n: number,
  terrain: RouteTerrain,
  ctx: RouteContext,
): StageSpec[]
// 1. sk = tourSkeletonDe(n, ctx.raceClass)          (sin dado)
// 2. it = itinerarioDe(raceId, ctx.country ?? '', n, terrain, ctx.raceClass, ctx.format)
// 3. it.papeles.map((role, i) => generateStage({ raceId, stageIndex: i + 1, season: ctx.season, km: it.km[i], role,
//      terrain, geo: ZONAS[it.metas[i]], desde: it.desde[i] !== it.metas[i] ? it.desde[i] : undefined,
//      raceClass: ctx.raceClass, format: ctx.format, routeSource: 'generado' }))
//    → { kind, label, profile, timeTrial, routeSource, arch } (StageSpec gana routeSource y arch; stagesFrom los conserva)

export function stageMix(
  n: number,
  terrain: RouteTerrain,
  seedBase: string,
  ctx: RouteContext = DEFAULT_ROUTE_CONTEXT,
): StageSpec[] {
  return composeTour(seedBase, n, terrain, ctx)
}
```

`stageMix` conserva la firma con el cuarto parámetro por defecto (decisión 19, I-17) para que `calendar.test.ts` l. 168-266 y `stageKind.test.ts` compilen en todos los pasos del plan; con `DEFAULT_ROUTE_CONTEXT` el territorio es el `fallback` (`generico`, ondulado, `cordillera: null`), y por eso `stageMix(5, 'mountain', seed)` sigue cerrando arriba en más de la mitad de las semillas (`lastDecisiveChance.mountain` 0,85 × `lastSummitShare` 0,8 da `reina_alto`, que §7.1 paso 4 degrada a `media_alto`: sigue siendo `Uphill finish`, que es lo que `calendar.test.ts` l. 223-235 mira). `buildRace` (l. 926-929) pasa a `stagesFrom(composeTour(row.id, row.stages, row.terrain ?? 'flat', { raceId: row.id, country, raceClass: row.raceClass, format: 'una-semana', season }))` con `restAfter: descansosDe(row.stages)`, y `calendarForSeason` es quien aporta `season` (sección 10). Los papeles, `timeTrial` y `n` son identidad (decisión 20): `edition.test.ts` sella que `itinerarioDe` no lee `season` y que temporadas 0 a 5 devuelven los mismos `papeles` y `metas`.

Lo que se retira de `ROUTE` con el generador viejo (paso 8): `mixWeights`, `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit` (l. 1224-1243). Lo que se conserva tal cual: todo `itt*`, `lastDecisiveChance`, `grandTourStages`, `grandTourLastDecisiveFactor`, `lastSummitShare`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor` (sección 12).

### 7.6 Las etapas de edición no pasan por aquí

Las 57 vueltas con `RACE_EDITIONS` y las 3 grandes vueltas conservan composición real: número de etapas, km, terreno por etapa y `restAfter` (`editions.ts`, mapa 02 §7). Ni `itinerarioDe` ni `composeTour` las tocan: `stagesFromEdition` deriva el papel del `EditionTerrain` de cada etapa (`mountain → reina_alto` con la forma que decida el esqueleto, `hilly → media`, `flat → llana`, `itt → cri`) y llama a `generateStage` con `routeSource: 'edicion'`, `km` como contrato al 0,1 y la zona de `regionOf(raceId, i, country)` por etapa (`race-france` e6 → `pirineos`; sección 6 y sección 11). El papel de una etapa de edición es también identidad: lo fija el dato, no un dado.

### 7.7 Tests de `tour.test.ts` (paso 7 del plan, antes del código)

```ts
describe('grammar/tour: composición como itinerario', () => {
  const seeds = Array.from({ length: 120 }, (_, i) => `tour-${i}`)
  const PAISES = { BE: 'llano', XX: 'ondulado', PT: 'media', ES: 'montana', CO: 'alta' } // XX = fallback

  it('las cuatro garantías de mixRoles siguen tras bloques y reparación', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 11, 15, 21])
      for (const cc of Object.keys(PAISES))
        for (const s of seeds) {
          const it = itinerarioDe(s, cc, n, 'flat', '2', 'una-semana')
          expect(it.papeles.some((r) => esCrono(r) || acabaArriba(r))).toBe(true) // garantía de fondo
          if (n >= 4) expect(it.papeles.some(esCrono)).toBe(true) // llana de 4+ lleva crono
          expect(it.papeles[0] === 'llana' || it.papeles[0] === 'prologo').toBe(true) // re-sellado: prólogo permitido
        }
  })
  it('ninguna reina en un país sin cordillera (BE, NL, DK, AE, AU)', () => {
    for (const cc of ['BE', 'NL', 'DK', 'AE', 'AU'])
      for (const n of [4, 6, 8])
        for (const s of seeds) {
          const it = itinerarioDe(s, cc, n, 'mountain', 'Pro', 'una-semana')
          expect(it.papeles.filter(esReina)).toHaveLength(0)
        }
  })
  it('la reina cae en una meta de cordillera o de zona montana/alta, y tarde', () => {
    for (const s of seeds) {
      const it = itinerarioDe(s, 'ES', 7, 'mountain', 'WT', 'una-semana')
      it.papeles.forEach((r, i) => {
        if (esReina(r)) {
          expect(admiteReina(it.metas[i], 'pirineos')).toBe(true)
          expect(i).toBeGreaterThanOrEqual(4)
        }
      })
    }
  })
  it('gran vuelta generada: descansos tras 9 y 15, reina en [15; 20], ≤ 1 final en alto en la primera semana, ≤ 7 de alta montaña, nunca 8 llanas seguidas', () => {
    expect(descansosDe(21)).toEqual([9, 15])
    expect(descansosDe(15)).toEqual([9])
    expect(descansosDe(11)).toEqual([])
    for (const s of seeds) {
      const it = itinerarioDe(s, 'FR', 21, 'mountain', 'WT', 'gran-vuelta') /* aserciones de §7.2 */
    }
  })
  it('vu_corta lleva como mucho una crono y una reina; el prólogo solo aparece con n ≥ 6', () => {
    /* n 2..5 × 120 semillas */
  })
  it('km por clase: una .2 de 5 etapas no pasa de 150 km por etapa ni de 180 en ninguna; p90 de .2 ≤ 170', () => {
    /* kmDe × 120 semillas */
  })
  it('el itinerario es identidad: no lee season y avanza por una ventana contigua de la ruta', () => {
    const it = itinerarioDe('race-x', 'ES', 6, 'hilly', '1', 'una-semana')
    const ruta = TERRITORIOS.ES.ruta.map((z) => z.zona)
    it.metas.forEach((z, i) => {
      if (i > 0)
        expect([
          it.metas[i - 1],
          ruta[(ruta.indexOf(it.metas[i - 1]) + 1) % ruta.length],
        ]).toContain(z)
    })
    expect(it.notas.every((n) => typeof n === 'string')).toBe(true)
  })
})
```

Con eso, «Bélgica sin reina», «la reina en los Pirineos y tarde», «una .2 de 100 a 150 km por etapa» y «los descansos de una gran vuelta generada» dejan de ser intenciones y son aserciones que corren en `test:rapido` antes de que exista una línea de `composeTour`.
