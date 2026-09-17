## 12. Las constantes

Esta sección es la lista única de números del generador nuevo: qué constante existe, cuánto vale, para qué sirve y en qué medida o umbral se apoya. Regla de la casa (mapa 01 §3): hoy solo cuatro claves de `ROUTE` entran en `profileGen.ts` (`queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`) y todo lo demás (longitud de una cota, pendiente de un muro, km de valle) está escrito en el cuerpo de las funciones: cambiar «una cota de media es de 3 a 7 km» es editar `profileGen.ts` l. 247. El diseño lo invierte: todo número de intención vive en el bloque `ARCH` de `packages/engine/src/constants.ts`, con comentario de intención por clave como el de `ROUTE`, y ninguna función de `routes/grammar/*` lleva un rango literal. Las tablas grandes (`ZONAS`, `TERRITORIOS`, `RACE_REGION`, `SKELETONS`, `TOUR_SKELETONS`) son datos, no intención: viven en `routes/grammar/{geo,regions,skeletons,tour}.ts` con `as const` y `constants.ts` las reexporta por referencia, para que la regla «toda constante vive en `constants.ts`» se cumpla sin meter 29 firmas y 32 esqueletos en un fichero que ya tiene más de 4.400 líneas.

### 12.1 La forma del bloque

```ts
// packages/engine/src/constants.ts (bloque nuevo, junto a ROUTE)
export const ARCH = {
  motivo: {
    cota: { km: [2.5, 8.0], g: [4, 7] },
    puerto: { km: [9.0, 25], g: [5, 9], rampaIrregular: { km: [0.3, 0.8], g: [11, 13] } },
    muro: { km: [0.4, 3.0], g: [8, 16], gMax: 16 },
    sector: { km: [0.3, 3.7], estrellas: [1, 5] },
    racimo: { sectores: [4, 10], separacion: [2, 6] },
    circuito: { kmVuelta: [8, 30], vueltas: [3, 18] },
    tendida: { km: [5, 30], g: [1.5, 3.5] },
    descenso: { g: [-8, -3], kmPorDesnivel: { perdidaPorKm: 55, kmMin: 2, kmMax: 10 } },
    enlace: { km: [1, 60], ampMax: 2.4 },
    expuesto: { amp: 1.0 },
  },
  meta: {
    repecho: { km: [1, 2.9], g: [4, 7] },
    muro: { km: [0.5, 2.2], g: [8, 16], aproxKm: 2, aproxAmp: 2.5, finishMuroMaxKm: 1.0 },
    altoCorto: { km: [3, 7], g: [6, 11] },
    altoLargo: { km: [9, 22], g: [6, 9], gMaxSiMasDe17: 7 },
    cimaCerca: { valle: [1.2, 4.3] },
    descensoMeta: { valle: [5.7, 19.3] },
    valle: { valle: [20.7, 45] },
    sectorMeta: { aMeta: [1, 8] },
    unDiaUltimaCota: { km: [1.3, 4.2], g: [7, 11], aMeta: [3, 17] },
  },
  reina: {
    dPlusIncluyeRelleno: true,
    rellenoDplusPorKm: 5.5,
    escalaDificultades: [0.7, 1.4],
    verdad: { puertoMetaMinKm: 9, dPlusMin: 3400 },
    subidaLejanaMin: 0.25,
    subidaLejanaKm: 30, // = STAGE.climbRaceKmToGo
    blandaShare: { media: 0.25, montana: 0.25, alta: 0.1 },
  },
  colocacion: {
    enlaceMinimo: 1.5,
    enlaceMinimoTotal: 0.12,
    bajadaTrasPuerto: [0.6, 0.9],
    maxIntentos: 8,
  },
  veto: {
    margenClaseKm: 0.3,
    margenValleKm: 0.7,
    fallbackMaxShare: { calendario: 0, testPorEsqueleto: 0.005 },
    intentosP95: 3,
  },
  pancarta: { cimaMinKm: 1.5 }, // = CLIMB_MIN_KM
  edicion: { activa: true, nivel: 1, kmJitter: 0.06, vueltasJitter: 0.5, motivoNuevo: 0.35 },
  km: {
    porClase: {/* tabla de 12.2.8 */},
    maxPorClase: { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 },
  },
  pesoPorClase: {/* tabla de 12.2.9 */},
  pesosComposicion: {/* tabla de 12.2.10 */},
  bloques: {
    gv: {
      descansos: [9, 15],
      reina: [15, 20],
      primeraSemanaFinalesAlto: 1,
      maxAltaMontana: 7,
      minLlanasEntreBloques: 2,
    },
  },
  itinerario: { avance: 0.6, transicion: 0.4 },
  anticlon: { maxCorrelacion: 0.85 }, // provisional: se calibra en el paso 9
  arranque: { objetivoMs: 1500, techoMs: 2500, porTemporadaMs: 1000 },
} as const
```

Todo rango es `[min, max]` inclusive y se muestrea con `between` (`profileGen.ts` l. 47-49, que es `[min, max)`; la diferencia no importa a un décimo). Las pendientes van en %, las distancias en km, el desnivel en metros. Ningún valor de `ARCH` lo lee el motor de etapa: `stage/*` sigue leyendo `STAGE`, y `ARCH` solo lo leen `routes/grammar/*`, `routeCensus` y los tests (decisión 4 de la sección 2, Principios).

### 12.2 La tabla, por bloque

Cuatro columnas, como en el resto de documentos del repositorio: nombre, valor, intención y apoyo (umbral del código, medida de un mapa o ejemplo real del mapa 07). Donde el valor de hoy existe se cita al lado, para que el implementador vea qué mueve.

#### 12.2.1 `ARCH.motivo`: lo que mide cada dificultad

| Nombre                     | Valor                                     | Intención                                                                                                                                                                                                                                                    | En qué se apoya                                                                                                                    |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `cota.km`                  | [2,5; 8,0]                                | cota de media montaña; el techo 8,0 deja 0,5 km a `PASS_MIN_KM` 8,5 para que ninguna media cruce a reina por el redondeo de tramos                                                                                                                           | `stageKind.ts` l. 62; borde medido: 3 de 1.500 clasificaciones cruzadas en 8,5 (mapa 01 §5.1); hoy [3; 7] (`profileGen.ts` l. 247) |
| `cota.g`                   | [4; 7]                                    |                                                                                                                                                                                                                                                              | hoy [4,5; 6,5] (l. 248); Jaizkibel 7,9 km al 5,6 %, Arrate 5 km al 7,4 % (mapa 07 §3.8)                                            |
| `puerto.km`                | [9,0; 25]                                 | puerto de alta montaña; suelo 9,0 (0,5 sobre 8,5); techo 25 porque Croix de Fer 29 y Loze 28,1 son rarezas                                                                                                                                                   | hoy intermedios [6; 11] y final [9; 15] con escala hasta 1,8, es decir hasta 26,7 km medidos (l. 358-363, 374; mapa 01 §2.5)       |
| `puerto.g`                 | [5; 9]                                    |                                                                                                                                                                                                                                                              | Galibier 5,1; Angliru 9,8 se recorta por la zona (`ZONAS.cantabrico.puerto.g`)                                                     |
| `puerto.rampaIrregular`    | { km: [0,3; 0,8], g: [11; 13] }           | la rampa que abre brecha en un puerto `irregular`; SPEC §6.17 promete brecha ≥ 1,5× la del regular y a ≥ 8 % el motor cambia a COL                                                                                                                           | `STAGE.wallMinGradient` 8 (`constants.ts` l. 1594)                                                                                 |
| `muro.km`                  | [0,4; 3,0]                                | un muro es corto; el techo ES `WALL_MAX_KM`                                                                                                                                                                                                                  | `stageKind.ts` l. 60; Kwaremont 2,2, Paterberg 0,36 (mapa 07 §3.1); hoy [1; 2,5] (l. 477)                                          |
| `muro.g`                   | [8; 16]                                   |                                                                                                                                                                                                                                                              | Koppenberg 11,6, Sormano 15,8; hoy [8; 12] (l. 478)                                                                                |
| `muro.gMax`                | 16                                        | tope de rampa dentro de un muro para `climb(rand, len, avg, { gMax })`; el `climb` de hoy no tiene tope y las medidas dan puntas de 14,8 % en clásicas (mapa 01 §2.4); las puntas reales de 20 a 26 % son de 100 m y un tramo de 0,5 km no debe promediarlas | mapa 01 §2.4; decisión 11                                                                                                          |
| `sector.km`                | [0,3; 3,7]                                | longitud de un sector de adoquín                                                                                                                                                                                                                             | Roubaix, 29 a 31 sectores de 0,3 a 3,7 km (mapa 07 §1.4); hoy [2; 4] (l. 497)                                                      |
| `sector.estrellas`         | [1; 5]                                    |                                                                                                                                                                                                                                                              | hoy `[3, 5, 4]` fijo (l. 496)                                                                                                      |
| `racimo.sectores`          | [4; 10]                                   | sectores por racimo                                                                                                                                                                                                                                          | Roubaix: 3 a 6 racimos (mapa 07 §1.4)                                                                                              |
| `racimo.separacion`        | [2; 6] km                                 | asfalto entre sectores: impide reagrupar                                                                                                                                                                                                                     | mapa 07 §1.4                                                                                                                       |
| `circuito.kmVuelta`        | [8; 30]                                   |                                                                                                                                                                                                                                                              | Québec 12,6, Montréal 17 a 18, Mundial 12 a 27 (mapa 07 §1.1)                                                                      |
| `circuito.vueltas`         | [3; 18]                                   |                                                                                                                                                                                                                                                              | Great Ocean 4, Montréal 17 a 18                                                                                                    |
| `tendida.km` / `tendida.g` | [5; 30] / [1,5; 3,5]                      | falso llano largo; tipada `llano` con tramos: desgasta, no selecciona, y no suma `kmSubida` porque el motor cuenta por tipo                                                                                                                                  | `sample.ts` l. 32-44; mapa 03 §4.1                                                                                                 |
| `descenso.g`               | [−8; −3]                                  |                                                                                                                                                                                                                                                              | hoy `−max(2, avg ± 1,5)` con avg 5 o 6 (l. 90, 257, 396)                                                                           |
| `descenso.kmPorDesnivel`   | { perdidaPorKm: 55, kmMin: 2, kmMax: 10 } | bajada canónica tras un puerto: `clamp(len·g·10/55, 2, 10)` km                                                                                                                                                                                               | la regla de `mountainClassicSegments` l. 467, hoy solo en un día; decisión 11                                                      |
| `enlace.km`                | [1; 60]                                   | un enlace nunca es un décimo (V10 exige segmentos ≥ 0,5 km) ni media etapa                                                                                                                                                                                   |                                                                                                                                    |
| `enlace.ampMax`            | 2,4                                       | el relleno nunca alcanza el 3 % que `finish.ts` funde en una racha ascendente; la `amp` 3,2 de hoy (l. 105) sí lo alcanza y por eso un muro de meta podía tipar `puncheur` o `alto`                                                                          | `STAGE.finishClimbMinGradient` 3 (l. 3977); juez del motor §1                                                                      |
| `expuesto.amp`             | 1,0                                       | pólder, desierto, meseta: el llano abierto; da los 300 m de D+ de Brugge-De Panne                                                                                                                                                                            | `GeoSignature.amplitud` [0,4; 0,9] en pólder (decisión 12)                                                                         |

El hueco entre 8,0 y 9,0 km es deliberado y se asume: ninguna dificultad generada mide entre 8,0 y 9,0 km, porque ahí está la puerta de `stageKindOf` y las 1 + 2 clasificaciones cruzadas del borde (mapa 01 §5.1) nacen de que `garantizaPuerto` fija `segment.km` y `climbSize` suma tramos redondeados. Ghisallo (8,6 km al 6,2 %, mapa 07 §3.3) sale como `puerto` de 9,0. Es un sacrificio de una décima de realismo a cambio de cero cruces, y va en la sección 17, Riesgos.

#### 12.2.2 `ARCH.meta`: cómo muere la etapa

| Nombre               | Valor                                                                           | Intención                                                                                                                                                                                                                                                                                          | En qué se apoya                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `repecho`            | { km: [1; 2,9], g: [4; 7] }                                                     | final de puncheur que el motor lee como `puncheur`: por debajo de `finishAltoMinKm` 3                                                                                                                                                                                                              | `constants.ts` l. 3989                                                                                                      |
| `muro`               | { km: [0,5; 2,2], g: [8; 16], aproxKm: 2, aproxAmp: 2,5, finishMuroMaxKm: 1,0 } | muro de meta; hasta 1,0 km `finishType` dice `muro` (`muroMaxKm` 1, l. 4462) y de 1,0 a 2,2 dice `puncheur`, y la tabla de `MetaKind` de la sección 4 lo declara así; `aproxKm` 2 a amplitud ≤ 2,5 en los 2 km previos para que `finishClimbGapBlocks` 5 (l. 3980) no funda el relleno con el muro | Huy 1,3 km al 9,6 %, San Luca 2,1 al 10,8 % (mapa 07 §1.2); hoy `finishType` da `muro` 0 veces en 1.418 (juez del motor §1) |
| `altoCorto`          | { km: [3; 7], g: [6; 11] }                                                      | final en alto corto; techo 7 y no 8 por la puerta de 8,5 con el margen de clase                                                                                                                                                                                                                    | Planche 5,9 × 8,5, Xorret 3,9 × 11,4 (mapa 07 §4.3); hoy `hillyUphill` [4; 7,5] × [5; 7,5] (l. 280-281)                     |
| `altoLargo`          | { km: [9; 22], g: [6; 9], gMaxSiMasDe17: 7 }                                    | el 70 a 80 % de los finales en alto de gran vuelta; por encima de 17 km la media no pasa del 7 % (Loze 28,1 × 6, Bondone 21,4 × 6,7)                                                                                                                                                               | mapa 07 §4.3; hoy [9; 15] × [7,5; 9,5] con suelo 8,6 (l. 359-360, 387)                                                      |
| `cimaCerca.valle`    | [1,2; 4,3]                                                                      | holgura 0,7 sobre los cortes 0,5 y 5 de `FINAL_KIND_CUTS`                                                                                                                                                                                                                                          | hoy [1,5; 5] (l. 332): 1 de 1.500 cae a `valle_corto` (mapa 01 §2.5)                                                        |
| `descensoMeta.valle` | [5,7; 19,3]                                                                     | holgura 0,7 sobre 5 y 20                                                                                                                                                                                                                                                                           | hoy [6; 20] (l. 333): 3 de 1.500 caen a `valle_largo` porque `normalize` estira un valle de 20 a 20,3                       |
| `valle.valle`        | [20,7; 45]                                                                      | holgura 0,7 sobre 20                                                                                                                                                                                                                                                                               | hoy [22; 45] (l. 334)                                                                                                       |
| `sectorMeta.aMeta`   | [1; 8]                                                                          | último sector a esta distancia de meta                                                                                                                                                                                                                                                             | Carrefour de l'Arbre a 17, Roubaix a 1,1 (mapa 07 §1.4); hoy el último sector cae a unos 40 km (mapa 01 §2.7)               |
| `unDiaUltimaCota`    | { km: [1,3; 4,2], g: [7; 11], aMeta: [3; 17] }                                  | el caso v40 escrito en positivo: en el WorldTour de un día la última subida mide de 0,4 a 4,2 km y corona de 0 a 17 km de meta                                                                                                                                                                     | mapa 07 §4.3; hoy [4; 8] × [7,5; 10] con run-in [13; 22] (l. 451-453)                                                       |

Por qué 0,7 de holgura y no 0,5 ni 0,3: `normalize` estira hasta un 2 % (un valle de 20 pasa a 20,3, mapa 01 §2.5) y `auto` redondea el km de la pancarta al entero (`calendar.ts` l. 93-102), así que un valle puede moverse hasta 0,5 km entre lo dibujado y lo leído; 0,7 cubre las dos cosas con margen. Es I-43 del juez de ejecutabilidad y es la misma cifra que `ARCH.veto.margenValleKm`.

#### 12.2.3 `ARCH.reina`: el desnivel y la verdad de una reina

| Nombre                | Valor                                      | Intención                                                                                                                                                                                                                                                           | En qué se apoya                                                                       |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `dPlusIncluyeRelleno` | true                                       | `Skeleton.dPlus` es el objetivo TOTAL, porque `calendarQueens::desnivelDe` (l. 55-59) mide bloques `subida` muestreados, relleno incluido; el generador de hoy persigue el objetivo solo con los puertos y el relleno añade de media 1.017 m en una reina de 175 km | mapa 01 §1 y §2.5; decisión 9                                                         |
| `rellenoDplusPorKm`   | 5,5 m/km                                   | estimación del D+ del relleno sin llamar a `sampleProfile`: 661 a 1.413 m en llanas de 130 a 215 km da de 5,1 a 6,6 m/km                                                                                                                                            | mapa 01 §1; se recalibra en el paso 3 con `dPlusDe` sobre 300 semillas                |
| `escalaDificultades`  | [0,7; 1,4]                                 | cuánto se alargan las dificultades no firma para cuadrar D+; fuera de ahí la etapa ya no se parece a la que sorteó                                                                                                                                                  | hoy [0,55; 1,8] (l. 374), que lleva un final de 15 km a 27                            |
| `verdad`              | { puertoMetaMinKm: 9, dPlusMin: 3400 }     | V8a: puerto ≥ 9 km en meta, o dos puertos ≥ 9 km, o D+ ≥ 3.400 con relleno; no aplica a `et_reina_blanda`                                                                                                                                                           | mapa 07 §4.4 regla 2; 3.400 son 200 m sobre `QUEEN_MIN_CLIMB_METRES` 3.200            |
| `subidaLejanaMin`     | 0,25                                       | V8b: al menos el 25 % de los km de subida a más de `subidaLejanaKm` de meta                                                                                                                                                                                         | `reina-150` tiene 0 % y las nueve reales de 6 a 38 % (mapa 04 §3.2)                   |
| `subidaLejanaKm`      | 30                                         | la ventana del descuelgue: `STAGE.climbRaceKmToGo`                                                                                                                                                                                                                  | `constants.ts` l. 3521                                                                |
| `blandaShare`         | { media: 0,25; montana: 0,25; alta: 0,10 } | fracción de reinas que son `et_reina_blanda`, la cola baja de desnivel decidida en el diseño y no por el 60/40                                                                                                                                                      | `calendarQueens.test.ts` l. 62-63 exige que la cubeta < 1.500 no se vacíe; decisión 8 |

#### 12.2.4 `ARCH.colocacion`, `ARCH.veto`, `ARCH.pancarta`

| Nombre                         | Valor                                      | Intención                                                                                                                                                                                 | En qué se apoya                                                            |
| ------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `colocacion.enlaceMinimo`      | 1,5 km                                     | dos dificultades nunca se tocan salvo dentro de `cadena`; ×3 sobre los 0,5 km de `finishClimbGapBlocks`                                                                                   | `constants.ts` l. 3980                                                     |
| `colocacion.enlaceMinimoTotal` | 0,12                                       | fracción mínima de la etapa que es enlace                                                                                                                                                 | hoy 0,15 en reina (l. 390), 0,2 en un día (l. 456), 0,35 en media (l. 251) |
| `colocacion.bajadaTrasPuerto`  | [0,6; 0,9] × km del puerto                 | lo que se baja de lo que se subió                                                                                                                                                         | `featureProfile.ts` baja el 85 % (mapa 01 §6)                              |
| `colocacion.maxIntentos`       | 8                                          | reintentos antes de rendir `Skeleton.canonico`                                                                                                                                            | p95 medido en el paso 4; ver `veto.intentosP95`                            |
| `veto.margenClaseKm`           | 0,3                                        | `garantizaClase` lleva el puerto más largo a 8,5 ± 0,3 y no a 8,5                                                                                                                         | el borde de 8,5 con `segment.km` contra tramos (mapa 01 §5.1)              |
| `veto.margenValleKm`           | 0,7                                        | holgura sobre los cortes 5 y 20 al recortar un valle                                                                                                                                      | como 12.2.2                                                                |
| `veto.fallbackMaxShare`        | { calendario: 0, testPorEsqueleto: 0,005 } | cero etapas degradadas en las 1.418 del calendario (un degradado es defecto y `routeCensus` lo cuenta); en el test de 300 semillas × zona × esqueleto se tolera el 0,5 %                  | I-43; `GeneratedStage.arch.degradado`                                      |
| `veto.intentosP95`             | 3                                          | si el p95 de `arch.intentos` supera 3 en el paso 4, se estrechan rangos de `Slot` antes que subir `maxIntentos`                                                                           | coste: cada intento es geometría pura sin `sampleProfile` (decisión 4)     |
| `pancarta.cimaMinKm`           | 1,5                                        | pancarta `cima` en todo `puerto` con `climbSize ≥ 1,5` y SIEMPRE en el último `puerto` de la etapa, para que `lastClimbKm` vea el muro de meta; los muros de circuito < 1,5 km no puntúan | `CLIMB_MIN_KM` (`finalKind.ts` l. 33); decisión 25                         |

#### 12.2.5 `ARCH.edicion`

| Nombre          | Valor | Intención                                                                                                                                              | En qué se apoya                                                                                                |
| --------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `activa`        | true  | interruptor: en `false`, `calendarForSeason(s)` devuelve el calendario de `BASE_SEASON` para toda `s`                                                  | decisión 21; D7 (sección 18)                                                                                   |
| `nivel`         | 1     | 0 fija; 1 jitter acotado; 2 rotación declarada por `Skeleton.alternativas` con `season % n`; nivel 2 se aplica donde el esqueleto declare alternativas | decisión 22; D7                                                                                                |
| `kmJitter`      | 0,06  | ± 6 % de km entre ediciones; no aplica a etapas de edición real, cuyo `km` es contrato al 0,1 (`calendar.test.ts` l. 162-174)                          | Sanremo 289 a 294 y Ronde 268 a 273 son ± 1 a 2 %; Slovenia hasta 7 km; se deja ancho para carreras inventadas |
| `vueltasJitter` | 0,5   | p de que un `circuito` cambie ± 1 vuelta                                                                                                               | Montréal 17 a 18                                                                                               |
| `motivoNuevo`   | 0,35  | p de que un hueco opcional (`Slot.n[0] = 0`) aparezca o desaparezca                                                                                    | juicio: una carrera cambia una cosa al año                                                                     |

#### 12.2.6 `ARCH.km`: kilómetros por clase y papel

`porClase` es una tabla `[min, rango]` por `RaceClass` × papel agregado, no un factor: el mapa 07 §4.1 da rangos por clase, no proporciones, y `kmFlat [165, 30]` a `kmSummit [145, 35]` de hoy (`constants.ts` l. 1240-1243) daban de 145 a 195 km sin distinguir clase, con lo que una .2 de 5 etapas salía como la vuelta .2 más larga de Europa. Los papeles se agregan así: `llana` cubre `llana` y `llana_viento`; `media` cubre `media`, `media_alto` y `media_muro`; `reina` cubre `reina_alto`, `reina_valle` y `reina_encadenada`; `corta` es `montana_corta`; `un_dia` es el papel de las carreras de un día. `cri`, `prologo` y `cronoescalada` no leen esta tabla: `cri` sigue con `ROUTE.ittKmMin` 14 + `ittKmRange` 12 (26 + 18 en vueltas ≥ 10 etapas) y `prologo` y `cronoescalada` con los rangos de la sección 7, Las vueltas por etapas.

| Clase | llana     | media     | reina     | corta     | un_dia                           |
| ----- | --------- | --------- | --------- | --------- | -------------------------------- |
| WT    | [160, 30] | [150, 30] | [140, 40] | [120, 20] | [200, 60]                        |
| Pro   | [150, 30] | [140, 30] | [140, 35] | [120, 20] | [180, 50]                        |
| 1     | [140, 30] | [135, 30] | [135, 35] | [115, 20] | [170, 40]                        |
| 2     | [110, 40] | [110, 40] | [115, 40] | [100, 20] | [140, 40]                        |
| NC    |           |           |           |           | ruta [180, 60]; sub-23 [140, 40] |

Apoyo: mapa 07 §4.1 (WT gran vuelta 150 a 175 km por etapa; Pro y .1 por etapas 130 a 170; .2 por etapas 100 a 160; .2 un día 140 a 180; nacionales 180 a 260 en circuito). La última etapa sigue con `ROUTE.lastStageKmFactor` 0,85. Una fila con `km` explícito (36 de 178 carreras de un día) manda sobre la tabla; las 142 que hoy llevan el 210 por defecto pasan a la tabla desde la temporada 0 con la tirada `firma|raceId` (decisión 36).

`maxPorClase` { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 } es el techo de V13; Sanremo 294 va por `km` de fila y no se recorta. Las cifras UCI llevan «a confirmar» en el comentario de la constante (mapa 07 §4.1 lo dice así de .1 y Pro) y son la decisión D9 de la sección 18: se codifican las del mapa 07 salvo que el dueño traiga otras.

#### 12.2.7 `ARCH.pesoPorClase` y `ARCH.pesosComposicion`

`pesoPorClase` es `Partial<Record<SkeletonId, Partial<Record<RaceClass, number>>>>` con 1 por defecto: solo se escriben las excepciones, y el peso final de un esqueleto es `pesoBase × ZONAS[zona].pesos[id] × pesoPorClase[id][clase]`. Las excepciones decididas: `ud_montana_alto` 0,02 en `1` y 0 en el resto (la rareza de Ventoux y Mercan'Tour, «tres carreras sobre unas doscientas», mapa 07 §1.2; D1 de la sección 18); `ud_adoquin` 0 en `2` salvo `adoquin ≥ 2` en la firma de la zona; `ud_criterium` 0 en todas (D5); `nc_ruta` y `nc_crono` solo en `NC`. El catálogo completo con `pesoBase` va en la sección 5, Los esqueletos.

`pesosComposicion` sustituye a `ROUTE.mixWeights` (l. 1224-1228, tres terrenos × cuatro papeles) por `Relieve` × `StageRole`, con nueve papeles sorteados; `cri`, `prologo` y `cronoescalada` no se sortean por peso sino que los colocan las reglas `itt*` de `mixRoles` y las p 0,25 y 0,08 de la decisión 42:

| relieve  | llana | llana_viento                                    | media | media_alto | media_muro | reina_alto | reina_valle | reina_encadenada | montana_corta |
| -------- | ----- | ----------------------------------------------- | ----- | ---------- | ---------- | ---------- | ----------- | ---------------- | ------------- |
| llano    | 0,50  | 0,25 (solo `viento ≥ 2`; si no, suma a `llana`) | 0,15  | 0,07       | 0,03       | 0          | 0           | 0                | 0             |
| ondulado | 0,40  | 0,10                                            | 0,25  | 0,15       | 0,10       | 0          | 0           | 0                | 0             |
| media    | 0,28  | 0,04                                            | 0,28  | 0,18       | 0,10       | 0,06       | 0,04        | 0                | 0,02          |
| montana  | 0,20  | 0,02                                            | 0,22  | 0,14       | 0,05       | 0,16       | 0,12        | 0,04             | 0,05          |
| alta     | 0,16  | 0                                               | 0,18  | 0,10       | 0,02       | 0,22       | 0,14        | 0,10             | 0,08          |

Apoyo: arquitectura §7.3. El 40 % de reinas de `mixWeights.mountain` baja a un 26 a 54 % repartido en cuatro formas de reina en `montana` y `alta`, que con `ARCH.bloques.gv` da de 4 a 6 etapas de alta montaña en una vuelta de 21 (Tour y Giro llevan 4 a 6 con final en alto, mapa 07 §2.1). Dentro de `reina_alto`, la fracción `blandaShare` va a `et_reina_blanda`.

#### 12.2.8 `ARCH.bloques`, `ARCH.itinerario`, `ARCH.anticlon`, `ARCH.arranque`

| Nombre                    | Valor                                                                                                             | Intención                                                                                                                                                                                                                                                | En qué se apoya                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `bloques.gv`              | { descansos: [9, 15], reina: [15, 20], primeraSemanaFinalesAlto: 1, maxAltaMontana: 7, minLlanasEntreBloques: 2 } | reglas de gran vuelta que V14 exige: descanso tras la 9 y la 15, reina entre la 15 y la 20, un solo final en alto en la primera semana, no más de 7 de alta montaña, dos llanas entre bloques                                                            | mapa 07 §2.1 reglas 1 a 4 y §4.4 regla 6        |
| `itinerario.avance`       | 0,6                                                                                                               | p de avanzar a la zona siguiente de `TERRITORIOS[country].ruta`; el 0,4 restante se queda y hace bloque                                                                                                                                                  | decisión 18                                     |
| `itinerario.transicion`   | 0,4                                                                                                               | fracción inicial de una etapa de transición dibujada con la `amplitud` de `desde`                                                                                                                                                                        | decisión 18                                     |
| `anticlon.maxCorrelacion` | 0,85 provisional                                                                                                  | V12: ninguna etapa generada correlaciona más que esto con otra del mismo esqueleto y zona; se calibra en el paso 9 con el p90 de pares reales de la misma familia (Ronde y E3, Amstel y Brabant, Lombardía y Lieja) medidos con `scripts/medir-real.mjs` | I-12, I-39; decisión 40                         |
| `arranque`                | { objetivoMs: 1500, techoMs: 2500, porTemporadaMs: 1000 }                                                         | lo que `routes/arranque.test.ts` exige tras el paso 8; hoy la carga de `routes/calendar.js` cuesta 578 ms (juez del motor §1, `juicios/coste-motor.mjs`); si se supera el techo, calendario perezoso por carrera                                         | decisión 35; sección 14, Rendimiento y arranque |

### 12.3 Lo que se retira de `ROUTE` y qué lo sustituye

Se retiran en el paso 8, en el mismo cambio que borra los ocho `xxxSegments`, y la nota «v61 · El generador es una gramática» de `docs/balance.md` lleva esta tabla con el valor de hoy al lado:

| Clave de `ROUTE` (línea)                                   | Valor de hoy                                                                              | Lo sustituye                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queenDplusRange` (l. 1167)                                | { 2600, 4600 } en logaritmo                                                               | `Skeleton.dPlus` por esqueleto de reina, relleno incluido                                                                                                                                                                                                                    |
| `queenHighDplusShare` (l. 1169)                            | 0,6                                                                                       | `ARCH.reina.blandaShare`: la cola baja es `et_reina_blanda` con peso, no un dado                                                                                                                                                                                             |
| `queenLowDplusRange` (l. 1170)                             | { 1200, 2500 }                                                                            | `Skeleton.dPlus` de `et_reina_blanda` [1.500; 2.500]                                                                                                                                                                                                                         |
| `queenFinalMix` (l. 1185)                                  | alto 0,45 · cima_cerca 0,20 · valle_corto 0,25 · valle_largo 0,10                         | `pesosComposicion` (`reina_alto` contra `reina_valle`) y los pesos de `et_reina_cima_cerca`, `et_reina_valle`; como MEDIDA (el reparto de `finalKindOf` sobre las reinas, hoy 44 / 15,7 / 29 / 11,3 %, mapa 01 §2.5) sobrevive como fila de `routeCensus`, no como parámetro |
| `mixWeights` (l. 1224-1228)                                | flat [0,58 0,27 0,10 0,05] · hilly [0,30 0,36 0,19 0,15] · mountain [0,16 0,26 0,18 0,40] | `ARCH.pesosComposicion` por `Relieve`                                                                                                                                                                                                                                        |
| `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit` (l. 1240-1243) | [165, 30], [160, 30], [150, 30], [145, 35]                                                | `ARCH.km.porClase`                                                                                                                                                                                                                                                           |

El comentario de `ROUTE` l. 1152-1166 sobre el 60/40 («el 60 / 40 no es un adorno») se conserva en la nota de `balance.md` como historia y desaparece del código: la afirmación que protegía (la cubeta < 1.500 m no se vacía) la sostiene ahora `blandaShare`, y así la decide el diseño y no `calendarQueens.test.ts` (mapa 06 §6.3).

### 12.4 Lo que se conserva de `ROUTE` y todo `RELIEF`

Sin tocar: `ROUTE.ittMinStages` 3, `ittChanceShort` 0,6, `ittChanceWeek` 0,9, `ittWeekStages` 6, `ittAlwaysFlatStages` 4, `ittEarlierChance` 0,35, `ittSecondStages` 15, `ittSecondPosition` 0,35, `ittKmMin` 14, `ittKmRange` 12, `ittLongStages` 10, `ittLongKmMin` 26, `ittLongKmRange` 18; `lastDecisiveChance` { flat 0,3, hilly 0,55, mountain 0,85 }, `grandTourStages` 15, `grandTourLastDecisiveFactor` 0,4, `lastSummitShare` { 0, 0,35, 0,8 }; `selectiveMinFraction` { 0,35, 0,55, 0,7 }, `uphillFinishMinStages` 4; `lastStageKmFactor` 0,85. Son composición del calendario (mapa 01 §3: «el resto es composición»), las lee `mixRoles` (`calendar.ts` l. 457-519), cuyas cuatro garantías se conservan como reglas (decisión 18), y `TourSkeleton.ultima` puede valer literalmente `'ROUTE.lastDecisiveChance'` para no duplicar el número. Las claves de `lastDecisiveChance`, `lastSummitShare` y `selectiveMinFraction` siguen indexadas por `RouteTerrain` (`flat`, `hilly`, `mountain`) porque `terrain` sigue siendo el sesgo de la fila.

`RELIEF` entero (`constants.ts` l. 1115-1134: `rollingMinGradient` 0,4, `rollingGradientRange` 2,4, `rollingMinKm` 1,4, `rollingKmRange` 2,2, `rollingAmplitude` { flat 0,55, itt 0,55, cobbles 0,7, hilly 0,85, classic 1,0, mountain 1,15 }, `rollingAmplitudeDefault` 1,0) se conserva sin un dígito de cambio porque es de `featureProfile.ts` y `featureProfile.ts` no se toca en E1 (decisión 27): sobre él está sellada la huella FNV de las 177 etapas reales y medidas las bandas `erosion.*`. El generador nuevo no lo lee: la ondulación de un enlace generado sale de `GeoSignature.amplitud` con techo `ARCH.motivo.enlace.ampMax`. Que existan dos rellenos con dos escalas de amplitud es el precio de no mover lo real, y la unificación es un paso posterior a E1 (sección 17).

### 12.5 Los literales de `profileGen.ts` que migran

Cada literal del cuerpo de las funciones de hoy, con su línea, su valor y la constante que lo absorbe. Los ocho `xxxSegments` se borran en el paso 8, así que estos literales dejan de existir; la tabla sirve para que quien lea el diff sepa qué número se convirtió en qué.

| Línea                   | Literal de hoy                                               | Constante nueva                                                           | Valor nuevo                                                          |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 90                      | `descent`: `−max(2, avg ± 1,5)`                              | `ARCH.motivo.descenso.g`                                                  | [−8; −3]                                                             |
| 102                     | `rolling`: trozo `U(3, 6)` km                                | se queda en la primitiva `rolling`                                        | sin cambio: es el grano del relleno, no intención                    |
| 105                     | `rolling`: `amp` 1,8 llano, 3,2 «bumpy»                      | `GeoSignature.amplitud` con techo `ARCH.motivo.enlace.ampMax`             | zona [0,4; 2,4]; nunca 3,2                                           |
| 121                     | `rompepiernas` con p 0,35 en bumpy                           | `rolling(rand, km, amp, pRompepiernas = 0)`                               | 0: nunca se emite (decisión 2)                                       |
| 245, 271, 339, 445, 475 | `nClimbs = km > 170 ? 3 : 2` y variantes por umbral de km    | `Slot.n` por esqueleto                                                    | cardinalidad sorteada, no por umbral (mapa 01 §4)                    |
| 247-248                 | cota [3; 7] km × [4,5; 6,5] %                                | `ARCH.motivo.cota`                                                        | [2,5; 8,0] × [4; 7]                                                  |
| 251                     | `fill = max(0,35·km, …)`                                     | `ARCH.colocacion.enlaceMinimoTotal`                                       | 0,12                                                                 |
| 257, 396                | bajadas de [3; 5] y [5; 8] km al 5 y 6 %                     | `ARCH.motivo.descenso.kmPorDesnivel` y `ARCH.colocacion.bajadaTrasPuerto` | `clamp(len·g·10/55, 2, 10)`; [0,6; 0,9] × km                         |
| 276-283                 | final [4; 7,5] km × [5; 7,5] %, y el comentario del 7,5      | `ARCH.meta.altoCorto` y `ARCH.veto.margenClaseKm`                         | [3; 7] × [6; 11]; 0,3                                                |
| 295                     | `garantizaPuerto(…, null, 8.4)`                              | `garantizaClase` con `margenClaseKm`                                      | 8,5 − 0,3                                                            |
| 332-334                 | valles [1,5; 5], [6; 20], [22; 45]                           | `ARCH.meta.cimaCerca.valle`, `descensoMeta.valle`, `valle.valle`          | [1,2; 4,3], [5,7; 19,3], [20,7; 45]                                  |
| 358-363                 | intermedios [6; 11] × [5,5; 7,5]; final [9; 15] × [7,5; 9,5] | `ARCH.motivo.cota` / `.puerto`; `ARCH.meta.altoLargo`                     | cota hasta 8,0, puerto desde 9,0; [9; 22] × [6; 9]                   |
| 374                     | `escala ∈ [0,55; 1,8]`                                       | `ARCH.reina.escalaDificultades`                                           | [0,7; 1,4]                                                           |
| 387                     | `max(8.6, finalLen · escala)`                                | `ARCH.motivo.puerto.km[0]` y `garantizaClase`                             | 9,0 y 8,5 + 0,3                                                      |
| 390                     | `fill = max(0,15·km, …)`                                     | `ARCH.colocacion.enlaceMinimoTotal`                                       | 0,12                                                                 |
| 451-454                 | último puerto [4; 8] × [7,5; 10], run-in [13; 22]            | `ARCH.meta.unDiaUltimaCota`                                               | [1,3; 4,2] × [7; 11], a meta [3; 17]                                 |
| 467                     | `bajada = min(0,6·runIn, max(2, len·g·10/55))`               | `ARCH.motivo.descenso.kmPorDesnivel`                                      | { 55, 2, 10 }                                                        |
| 477-478                 | muros [1; 2,5] × [8; 12], 4 o 5 por etapa                    | `ARCH.motivo.muro`; `Slot.n` de `ud_muros`                                | [0,4; 3,0] × [8; 16], `gMax` 16; de 10 a 20                          |
| 496-497                 | sectores `[3, 5, 4]` estrellas de [2; 4] km                  | `ARCH.motivo.sector`, `.racimo`, `ARCH.meta.sectorMeta`                   | [0,3; 3,7] km, [1; 5] estrellas, racimos de [4; 10], último a [1; 8] |

Las primitivas que sobreviven en `profileGen.ts` (`hashInt`, `routeRng`, `between`, `split`, `climb` con `gMax`, `descent`, `rolling` con `amp` numérica) no llevan literal de intención: `split` conserva sus pesos `U(0,7; 1,3)` y el mínimo de 0,5 km por trozo (l. 52-65), y `climb` conserva las rampas de 2,2 km y el ruido ± 1,2 (l. 72-82), porque son la textura del dibujo y ninguna propuesta pidió moverlos; si en el paso 3 el censo enseña que hacen falta, se promocionan a `ARCH.motivo` con su medida.

### 12.6 Lo que NO cambia y por qué

| Constante                                                                                                                                                | Valor                                       | Dónde                  | Por qué no se toca                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FINAL_KIND_CUTS`                                                                                                                                        | { alto: 0,5, cimaCerca: 5, valleCorto: 20 } | `finalKind.ts` l. 30   | es la vara con que `calendarQueens` lee las reinas; los valles de `ARCH.meta` se acotan con 0,7 de holgura para caer dentro                             |
| `CLIMB_MIN_KM`                                                                                                                                           | 1,5                                         | `finalKind.ts` l. 33   | puerta de «esto es un puerto»; `ARCH.pancarta.cimaMinKm` la iguala en vez de duplicarla                                                                 |
| `WALL_MAX_KM`                                                                                                                                            | 3                                           | `stageKind.ts` l. 60   | `ARCH.motivo.muro.km[1]` es exactamente 3,0                                                                                                             |
| `PASS_MIN_KM`                                                                                                                                            | 8,5                                         | `stageKind.ts` l. 62   | la puerta de reina; `cota` hasta 8,0 y `puerto` desde 9,0 la rodean                                                                                     |
| `QUEEN_MIN_CLIMB_METRES`                                                                                                                                 | 3.200                                       | `stageKind.ts` l. 64   | red para lo real; V8a exige 3.400 con relleno para no rozarla                                                                                           |
| `STAGE.dx`                                                                                                                                               | 0,1 km                                      | `constants.ts` l. 1584 | paso de integración del motor; nada del generador lo lee                                                                                                |
| `STAGE.wallMaxKm` / `wallMinGradient`                                                                                                                    | 2,5 / 8                                     | l. 1593-1594           | ley de velocidad: a ≥ 8 % el atributo es COL; `muro.g[0]` 8 lo respeta                                                                                  |
| `STAGE.finishWindowKm`, `finishClimbSearchKm`, `finishClimbMinGradient`, `finishClimbGapBlocks`, `finishClimbMinKm`, `finishSummitKm`, `finishAltoMinKm` | 5, 15, 3, 5, 0,4, 0,6, 3                    | l. 3971-3989           | `finishType` y `deriveFinishTerrain`; el generador se acota para que lean lo que `MetaKind` promete (V16 en `routeCensus`), nunca al revés (decisión 4) |
| `STAGE.muroMaxKm` / `muroMinGradient`                                                                                                                    | 1 / 8                                       | l. 4462-4463           | corte de `muro` en `finish.ts`; `ARCH.meta.muro.finishMuroMaxKm` lo iguala y declara `puncheur` por encima                                              |
| `STAGE.climbRaceKmToGo`                                                                                                                                  | 30                                          | l. 3521                | ventana del descuelgue; `ARCH.reina.subidaLejanaKm` la iguala                                                                                           |
| `RELIEF.*`                                                                                                                                               | ver 12.4                                    | l. 1115-1134           | `featureProfile.ts` no se toca (decisión 27)                                                                                                            |
| `ENGINE_VERSION`                                                                                                                                         | 69                                          | l. 718                 | sube UNA vez, en el paso 8, al siguiente número libre en producción (sección 15, El plan)                                                               |

La razón común: son la vara con que el banco lee las reinas (`calendarQueens`, `realQueens`) y con que `stageHistory.ts` reetiqueta etapas corridas (mapa 06 §2.3 y §5). Recalibrar `stageKindOf` a la realidad (27 de 113 reinas y medias reales mal clasificadas, datos §1.5) es la decisión D2 de la sección 18 y se abre tras el paso 8 con la tabla del censo; el generador nuevo se calibra para caer dentro de los umbrales de hoy con holgura, y eso es V6 y V7. La única novedad en `stageKind.ts` es `SUMMIT_RUN_IN_KM = 5` exportada (decisión 23): no es un umbral nuevo sino el de `apps/api/src/stageHistory.ts` l. 73 movido a su sitio.

### 12.7 Tests de coherencia de `ARCH`

Van en `grammar/motifs.test.ts` y corren en `test:rapido`. Sellan que los números de intención rodean los umbrales de `routes/` y no los tocan, para que una edición futura de `ARCH` no reabra el borde de 8,5 sin que un test lo diga:

```ts
import { ARCH, STAGE } from '../../constants'
import { FINAL_KIND_CUTS, CLIMB_MIN_KM } from '../finalKind'
import { PASS_MIN_KM, WALL_MAX_KM } from '../stageKind' // exportadas en el paso 2

describe('ARCH rodea los umbrales de routes/ y no los toca', () => {
  it('cota y puerto dejan 0,5 km a cada lado de PASS_MIN_KM', () => {
    expect(ARCH.motivo.cota.km[1]).toBe(PASS_MIN_KM - 0.5)
    expect(ARCH.motivo.puerto.km[0]).toBe(PASS_MIN_KM + 0.5)
    expect(ARCH.meta.altoLargo.km[0]).toBeGreaterThanOrEqual(ARCH.motivo.puerto.km[0])
    expect(ARCH.meta.altoCorto.km[1] + ARCH.veto.margenClaseKm).toBeLessThan(PASS_MIN_KM)
  })
  it('muro, repecho y muro de meta caen donde el motor los lee', () => {
    expect(ARCH.motivo.muro.km[1]).toBe(WALL_MAX_KM)
    expect(ARCH.meta.repecho.km[1]).toBeLessThan(STAGE.finishAltoMinKm)
    expect(ARCH.meta.muro.finishMuroMaxKm).toBe(STAGE.muroMaxKm)
    expect(ARCH.meta.muro.g[0]).toBe(STAGE.muroMinGradient)
    expect(ARCH.meta.muro.aproxAmp).toBeLessThan(STAGE.finishClimbMinGradient)
    expect(ARCH.motivo.enlace.ampMax).toBeLessThan(STAGE.finishClimbMinGradient)
  })
  it('los valles llevan 0,7 de holgura sobre FINAL_KIND_CUTS', () => {
    const m = ARCH.veto.margenValleKm
    expect(ARCH.meta.cimaCerca.valle).toEqual([
      FINAL_KIND_CUTS.alto + m,
      FINAL_KIND_CUTS.cimaCerca - m,
    ])
    expect(ARCH.meta.descensoMeta.valle).toEqual([
      FINAL_KIND_CUTS.cimaCerca + m,
      FINAL_KIND_CUTS.valleCorto - m,
    ])
    expect(ARCH.meta.valle.valle[0]).toBe(FINAL_KIND_CUTS.valleCorto + m)
  })
  it('las igualdades declaradas son igualdades', () => {
    expect(ARCH.pancarta.cimaMinKm).toBe(CLIMB_MIN_KM)
    expect(ARCH.reina.subidaLejanaKm).toBe(STAGE.climbRaceKmToGo)
    expect(ARCH.reina.verdad.dPlusMin).toBeGreaterThan(3200)
  })
  it('las tablas por clase están completas y los pesos de composición suman 1', () => {
    for (const clase of ['WT', 'Pro', '1', '2'] as const)
      for (const papel of ['llana', 'media', 'reina', 'corta', 'un_dia'] as const)
        expect(ARCH.km.porClase[clase][papel]).toHaveLength(2)
    for (const fila of Object.values(ARCH.pesosComposicion))
      expect(Object.values(fila).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
  })
})
```

El test de que `ROUTE` ya no tiene las seis claves retiradas es de compilación: en el paso 8 se borran del objeto `as const` y cualquier lector que quede (`grep -rn 'queenDplusRange\|queenHighDplusShare\|queenLowDplusRange\|queenFinalMix\|mixWeights\|kmFlat\|kmHilly\|kmUphill\|kmSummit' packages apps`) rompe `tsc`; el criterio del paso es que ese grep devuelva cero líneas fuera de `docs/`.
