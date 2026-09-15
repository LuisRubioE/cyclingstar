# Propuesta E1 · La gramática de la carrera

Ángulo de esta propuesta: el generador como una **gramática de motivos y esqueletos**. La semilla elige la arquitectura (qué motivos, cuántos, en qué orden y dónde) y solo después el detalle (rampas, ondulación). La geografía entra como restricción sobre qué motivos existen en cada sitio y con qué parámetros. La identidad de una carrera es su esqueleto más sus motivos de firma, y la edición de cada temporada varía lo que no es firma.

Ficheros leídos para escribir esto: `packages/engine/src/routes/profileGen.ts` (514 l.), `stageKind.ts`, `finalKind.ts`, `calendar.ts` (l. 1-260, 370-565, 880-935), `editions.ts` (l. 1-60), `stage/types.ts` (l. 1-80), `stage/sample.ts` (l. 1-60), `stage/finish.ts` (l. 60-240 por grep), `constants.ts` (bloques `RELIEF` l. 1115-1134 y `ROUTE` l. 1151-1246, más las claves de final citadas), `sim/calendarQueens.ts` (l. 1-110), `routes/stageKind.test.ts`, `packages/db/src/raceRoutes.ts`, `schema.ts` (l. 500-526), `calendarRun.ts` (l. 783, 1588-1622), `world/climate.ts` (l. 1-110), `apps/api/src/routes/calendar.ts` (l. 85-105), `docs/agenda.md` §4.18, `docs/epics.md` G5-G6, y los siete mapas de `scratchpad/e1/mapas/`. Los números «medidos» son los del mapa 01 (1.500 etapas por forma) y del mapa 06 (calendario entero sobre `ENGINE_VERSION` 69).

---

## 1. Diagnóstico

### 1.1 Lo que el dueño ve es literal

Hay tres terrenos para componer una vuelta (`type MixTerrain = 'flat' | 'hilly' | 'mountain'`, `calendar.ts` l. 410, con el comentario «el resto se reduce a ellos» en l. 409) y seis formas de un día (`oneDaySpec`, l. 400-407). Detrás hay ocho funciones `xxxSegments` en `profileGen.ts`, y dos de ellas son la misma (`flatSegments` l. 236-240 e `ittSegments` l. 510-514 tienen el mismo cuerpo). Son siete moldes.

### 1.2 La semilla no decide nada de arquitectura

En cada molde, lo que **no** depende de la semilla es exactamente lo que define una carrera:

| Decisión                       | Dónde se fija                                                                                                                               | Cómo                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Número de dificultades         | `hillySegments` l. 245, `hillyUphillSegments` l. 271, `mountainSegments` l. 339, `mountainClassicSegments` l. 445, `classicSegments` l. 475 | Umbral de km (`km > 170 ? 3 : 2`, etc.). Medido: `hillySegments(170)` tiene 2 cotas y `hillySegments(171)` tiene 3                        |
| Orden de los elementos         | Los bucles `forEach` de cada función                                                                                                        | Siempre relleno, dificultad, (bajada), relleno. Nunca dos cotas encadenadas sin relleno, nunca un circuito, nunca un sector cerca de meta |
| Sectores de pavé               | `cobblesSegments` l. 495                                                                                                                    | `[3, 5, 4]` estrellas, fijo: tres sectores en ese orden, el último a ~40 km de meta                                                       |
| Dónde muere la etapa           | La forma de la función                                                                                                                      | `hilly` siempre a 26-68 km de la última cota; `classic` a 16 km o más; `hillyUphill` y `mountain alto` siempre en cima                    |
| Rangos de longitud y pendiente | Literales en el cuerpo (`between(rand, 3, 7)` l. 247, `between(rand, 1, 2.5)` l. 477, `between(rand, 9, 15)` l. 362)                        | No están en `ROUTE`: de las claves de `ROUTE` solo cuatro entran en `profileGen.ts` (mapa 01 §3)                                          |

Las únicas decisiones de forma sorteadas están en `mountainSegments`: el brazo de desnivel (l. 345) y el `finalKind` (l. 355). Todo lo demás que cambia entre dos etapas del mismo molde es detalle: cuánto mide cada rampa (`split`, l. 52-65), cuánto ondula el relleno (`rolling`, l. 100-122), y el ruido de ±1,2 puntos por rampa (`climb`, l. 78).

### 1.3 El generador no sabe dónde está

`buildRace` calcula el país en l. 889 (`row.country ?? RACE_COUNTRY[row.id]`) y lo copia al resultado (l. 898), pero las tres ramas que construyen etapas (l. 902-924) llaman a `stagesFromEdition(row.id, edition)`, `oneDaySpec(terrain, km, row.id)` y `stageMix(row.stages, row.terrain, row.id)`: kilómetros, terreno y una cadena. Los 532 campeonatos nacionales salen de `classic(220, id)` e `itt(38, id)` para los 133 países (l. 351-360): el de Bélgica y el de Colombia son la misma función con distinto hash.

### 1.4 Consecuencias medidas que este diseño tiene que resolver

1. **Cero muros en meta**: `FinishType` tiene `muro` (`finish.ts` l. 36, `STAGE.muroMaxKm` 1 y `muroMinGradient` 8, `constants.ts` l. 4462-4463) y ninguna de las 1.075 etapas en línea lo activa (balance v60 §12, mapa 05 §5). El generador no tiene un motivo «muro de meta».
2. **Dos generadores de reina y uno sin vigilar**: 52 reinas salen de `mountainSegments` y 51 de `mountainClassicSegments`, que no está en `stageKind.test.ts` (l. 2-10) y cuyo 14 % de salidas con los km de test se clasifica `media` (mapa 01 §2.6, mapa 06 §1).
3. **El caso v40**: `mountainSegments` daba a una carrera de un día un final en alto de 9-15 km (`profileGen.ts` l. 430-438). Se arregló con otro molde, no con una regla: nada impide hoy que otro molde produzca otra forma inexistente.
4. **Tres bordes sin holgura** (mapa 01 §9.4): 8,5 km entre `garantizaPuerto` (mide `segment.km`) y `climbSize` (suma tramos redondeados); cortes 5/20 de `FINAL_KIND_CUTS` contra los rangos 1,5-5 y 6-20 de `valleyKmFor` (l. 330-335); `CLIMB_MIN_KM` 1,5 contra muros de 1-2,5 km. Cada uno produce clasificaciones cruzadas en unas pocas semillas de cada 1.500.
5. **El relleno pesa**: una llana acumula 661-1.413 m solo con `rolling` (mapa 01 §1), y el objetivo de desnivel de la reina se persigue solo con los puertos (l. 373) mientras `calendarQueens.ts::desnivelDe` (l. 54-58) cuenta también el relleno.
6. **Ninguna temporada**: `SEASON_CALENDAR` es una constante de módulo; la carrera del año que viene es la misma que la de este, segmento a segmento. La base sí sabe de temporadas (`raceKey = ${race.id}:s${season}`, `calendarRun.ts` l. 783) y congela el recorrido el día de la etapa 1 (l. 1603), pero le pide al calendario el mismo perfil cada año.
7. **Kilometraje sin clase**: `ROUTE.kmFlat` [165, 30] y compañía (l. 1240-1243) no distinguen una .2 de una ProSeries; una .2 de 5 días sale con etapas de 165-195 km (mapa 07 §4.1).

---

## 2. Principios

1. **La arquitectura es lo que se sortea; el detalle es lo que se rellena.** Una semilla decide el esqueleto, los motivos, cuántos, dónde. Las rampas vienen después y son las de siempre (`climb`, `descent`, `rolling` se conservan).
2. **Cada motivo es un tipo con parámetros acotados, y los rangos viven en `constants.ts` con intención.** Ningún `between(rand, 3, 7)` en el cuerpo de una función.
3. **La geografía restringe, no decora.** Un país dice qué motivos existen allí y con qué parámetros; el esqueleto se elige entre los permitidos. Un veto geográfico se comprueba sobre el perfil final, no solo sobre la intención.
4. **Lo que se declara se garantiza.** Un esqueleto declara el `StageKind` que produce y el `FinalKind` (cuando aplica). El perfil final pasa por `stageKindOf` y `finalKindOf` y, si no coincide, se rehace con el siguiente intento (determinista) y, si se agotan, cae a una plantilla canónica marcada `degradado`. El calendario entero se sella con cero degradados.
5. **La identidad de una carrera es su esqueleto y su firma; la edición varía lo demás.** Temporada 0 es la canónica (lo que hoy exporta `SEASON_CALENDAR`); cada temporada deriva su edición de `raceId|season`.
6. **Lo real manda y se distingue.** Un recorrido con rasgos reales no pasa por la gramática. La etapa lleva `routeSource` desde el calendario y la interfaz lo enseña.
7. **Todo puro y determinista** con `routeRng` (FNV-1a + mulberry32, `profileGen.ts` l. 15-44) y subflujos nominales por decisión, como `stage/rng.ts`. Ni un `Math.random`.
8. **El motor no cambia.** El contrato sigue siendo `Segment { km, tipo, tramos?, estrellas? }` y `Banner` (`types.ts` l. 18-48). Lo que el motor no lee (exposición al viento, altitud) sale en metadatos aparte, no en el perfil.
9. **Medir antes de bandear.** Ninguna banda nueva nace en rojo (mapa 04 §5.3); las de geometría van al test rápido, las de simulación a `test:bancos`.

---

## 3. El modelo

### 3.1 Motivos

Un motivo es una pieza de carretera con significado ciclista. Trece tipos, en tres familias: enlaces, dificultades y finales.

```ts
// packages/engine/src/routes/grammar/motifs.ts

export type MotifKind =
  // Enlaces (carretera entre dificultades)
  | 'enlace' // llano ondulado; la amplitud la pone la geografía
  | 'expuesto' // llano abierto (costa, pólder, meseta); amplitud mínima
  | 'tendida' // subida larga y suave (1,5-3,5 %), tipada `llano` con tramos: desgasta, no selecciona
  | 'descenso' // bajada explícita, en rampas
  // Dificultades
  | 'cota' // 2,5-8 km al 4-7 %: la media montaña
  | 'puerto' // 8-25 km al 5-9 %: la alta montaña
  | 'muro' // 0,4-3 km al 8-16 %: Flandes, Ardenas, Toscana, País Vasco
  | 'cadena' // n cotas o muros encadenados con enlaces de 1-6 km, sin valle
  | 'sector' // pavé llano con estrellas
  | 'racimo' // n sectores en una ventana de 20-60 km
  | 'circuito' // una sub-secuencia de motivos repetida n veces
  // Final (siempre el último motivo del esqueleto)
  | 'meta'

export type MetaKind =
  | 'esprint' // llano o falso llano: sprint masivo
  | 'repecho' // 1-3 km al 4-7 % que muere en meta: puncheur
  | 'muro_meta' // 0,5-1,0 km al 9-16 % en meta: `FinishType` muro (Huy, San Luca)
  | 'alto_corto' // 3-7 km al 6-11 % en meta: Planche, Xorret, Arrate
  | 'alto_largo' // 8-22 km al 6-9 % en meta: Alpe, Beille, Angliru
  | 'cima_cerca' // última cota corona a 1-5 km, bajada o falso llano hasta meta
  | 'descenso_meta' // corona a 5-20 km con bajada larga y 0-3 km de llano
  | 'valle' // corona a 20-45 km y llano hasta meta
  | 'sector_meta' // último sector de pavé a 1-8 km de meta

/** Parámetros de un motivo instanciado. Todo en km y %, redondeado a 0,1. */
export interface Motif {
  kind: MotifKind
  /** Longitud total del motivo en km (para `circuito`, la de una vuelta). */
  km: number
  /** Solo dificultades y `tendida`: pendiente media en %. */
  g?: number
  /** Solo `cota`, `puerto`, `muro`: forma interna de las rampas. */
  forma?: 'regular' | 'progresiva' | 'irregular'
  /** Solo `muro` y `sector`: el muro va adoquinado (sigue siendo `puerto`, regla de la casa). */
  adoquin?: boolean
  /** Solo `sector`: estrellas 1-5. */
  estrellas?: number
  /** Solo `cadena`, `racimo`: los hijos, en orden. */
  hijos?: Motif[]
  /** Solo `circuito`: cuántas vueltas y los hijos de una vuelta. */
  vueltas?: number
  /** Solo `meta`. */
  meta?: MetaKind
  /** Solo `meta` con cota: km de la cota final y su pendiente. */
  cotaFinal?: { km: number; g: number }
  /** ¿Es motivo de FIRMA de la carrera? (no cambia entre ediciones) */
  firma?: boolean
  /** Nombre legible para la ficha («Muro de 1,2 km al 11 %», «Circuito de 14 km × 9»). */
  nombre?: string
}
```

Restricciones de tipo (se comprueban en `validateMotif`, test unitario por motivo):

| Motivo     | `km`                          | `g`                      | Rinde a `Segment[]` como                                                                                                                     |
| ---------- | ----------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `enlace`   | 1-60                          | (amplitud por geografía) | `rolling(rand, km, bumpy)` con `amp` de la geografía, `rompepiernas` con p según geografía                                                   |
| `expuesto` | 5-60                          | amp ≤ 1,2                | `rolling` con amp fija 1,0 y p(rompepiernas) 0                                                                                               |
| `tendida`  | 5-30                          | 1,5-3,5                  | UN segmento `llano` con 2-4 tramos a `g ± 0,7`. Tipado `llano` a propósito: no suma a `kmSubida` (mapa 03 §4.1), pero cuesta y frena por `g` |
| `descenso` | 2-25                          | −8 a −3                  | `descent(rand, km,                                                                                                                           | g   | )`  |
| `cota`     | 2,5-8                         | 4-7                      | `climb(rand, km, g)`                                                                                                                         |
| `puerto`   | 8-25                          | 5-9                      | `climb(rand, km, g)`; con `forma: 'irregular'` se añade una rampa al 11-13 % de 0,3-0,8 km (SPEC §6.17: el puerto irregular abre más brecha) |
| `muro`     | 0,4-3                         | 8-16                     | `climb(rand, km, g)` con `n = 2` rampas; si `adoquin`, sigue siendo `puerto` (regla 5 de `fuentes-recorridos.md`)                            |
| `cadena`   | Σ hijos + enlaces 1-6 km      |                          | hijos intercalados con `rolling` corto                                                                                                       |
| `sector`   | 0,3-3,7                       | 0                        | `{ km, tipo: 'paves', estrellas }` (como `cobblesSegments` l. 503)                                                                           |
| `racimo`   | 20-60                         |                          | sectores separados por `rolling` de 2-6 km, amp 0,7                                                                                          |
| `circuito` | 8-30 por vuelta, 3-18 vueltas |                          | los hijos rendidos `vueltas` veces con la MISMA semilla de detalle (la vuelta se parece a sí misma)                                          |
| `meta`     | ver §3.2                      |                          | ver §3.2                                                                                                                                     |

### 3.2 El motivo `meta` y el modelo de final del motor

Cada `MetaKind` está definido por lo que `deriveFinishTerrain` (`finish.ts` l. 71-135) y `finishType` (l. 142-188) van a leer, y por lo que `finalKindOf` (`finalKind.ts` l. 78-85) va a decir. Las constantes citadas son de `constants.ts`.

| `MetaKind`      | Cómo se rinde (últimos km)                                                                                      | `finishType` esperado                      | `finalKindOf`                     | Regla que lo garantiza                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `esprint`       | `enlace` o `expuesto` con amp ≤ 1,5 en los últimos 5 km                                                         | `sprint_*`                                 | `null` o el que dé la última cota | media de g en los últimos 5 km (`finishWindowKm` l. 3971) < 2                                                                                                                    |
| `repecho`       | `climb(1-3 km, 4-7 %)` como último segmento, tipo `puerto`                                                      | `puncheur`                                 | `alto` (0 km tras la cima)        | cota < `finishAltoMinKm` 3 (l. 3989) o g < `finishAltoMinGradient` 4 (l. 4007)                                                                                                   |
| `muro_meta`     | 2 km de `enlace` con amp ≤ 2,5 (para que ningún bloque ≥ 3 % se pegue a la racha) + `climb(0,5-1,0 km, 9-16 %)` | `muro`                                     | `alto`                            | `climbKm ≤ muroMaxKm` 1 y `climbGradient ≥ muroMinGradient` 8 (l. 4462-4463); el enlace previo evita que `finishClimbGapBlocks` 5 (l. 3980) una la racha con un repecho anterior |
| `alto_corto`    | `climb(3-7 km, 6-11 %)` último                                                                                  | `alto`                                     | `alto`                            | ≥ 3 km y ≥ 4 %                                                                                                                                                                   |
| `alto_largo`    | `climb(8-22 km, 6-9 %)` último                                                                                  | `alto`                                     | `alto`                            | idem; y `stageKindOf` reina por `PASS_MIN_KM` 8,5                                                                                                                                |
| `cima_cerca`    | cota o puerto + `descent(1-4 km)` + `rolling(0-1,5 km)`                                                         | `descenso` o `puncheur` según lo que quede | `cima_cerca`                      | valle total en [1,0; 4,5] (holgura de 0,5 con el corte 5 de `FINAL_KIND_CUTS` l. 30)                                                                                             |
| `descenso_meta` | cota o puerto + `descent(4-12 km)` + `rolling(0-8 km)`                                                          | `descenso` o `sprint_reducido`             | `valle_corto`                     | valle en [6; 19] (holgura con los cortes 5 y 20)                                                                                                                                 |
| `valle`         | cota o puerto + `descent(4-10)` + `rolling(12-40)`                                                              | `sprint_*`                                 | `valle_largo`                     | valle en [21; 45]                                                                                                                                                                |
| `sector_meta`   | `sector` de 1-2,5 km + `rolling(1-8 km)`                                                                        | `pave`                                     | `null`                            | fracción de pavé en los últimos 30 km (`finishPaveKm` l. 4024) > 0                                                                                                               |

Las holguras (0,5 km a cada lado de los cortes 5 y 20) cierran el segundo de los tres bordes del diagnóstico. El primero (8,5 km) se cierra porque el motivo `puerto` nace con `km ≥ 9,0` y la `cota` con `km ≤ 8,0`, y porque `normalize` deja de tocar los motivos (§4.6). El tercero (`CLIMB_MIN_KM` 1,5) deja de importar porque el generador emite él mismo la pancarta `cima` de cada muro y `lastClimbKm` mira primero las pancartas (`finalKind.ts` l. 47-48).

### 3.3 Esqueletos

Un esqueleto es una secuencia de huecos con cardinalidad, ventana de posición (fracción de la etapa) y motivo permitido. Declara el `StageKind` que produce y el `FinalKind` si es de montaña.

```ts
// packages/engine/src/routes/grammar/skeletons.ts

export interface Slot {
  motif: MotifKind
  /** Cuántas instancias: [min, max]. 0 permite que el hueco no exista en una edición. */
  n: [number, number]
  /** Ventana de posición del INICIO del motivo, como fracción de la etapa [0, 1]. */
  ventana: [number, number]
  /** Sobrescribe los rangos por defecto del motivo (dentro de lo que la geografía permita). */
  params?: Partial<Pick<Motif, 'km' | 'g' | 'forma' | 'adoquin' | 'estrellas' | 'vueltas'>> & {
    kmRango?: [number, number]
    gRango?: [number, number]
  }
  /** Este hueco es de firma: sus parámetros se fijan una vez por carrera. */
  firma?: boolean
}

export interface Skeleton {
  id: SkeletonId
  /** Qué produce, y es lo que `stageKindOf` tiene que devolver. */
  kind: StageKind
  label: string
  /** Solo montaña y media: la cubeta que `finalKindOf` tiene que devolver. */
  finalKind?: FinalKind
  meta: MetaKind
  slots: Slot[]
  /** Desnivel objetivo TOTAL (relleno incluido), en metros, como rango. */
  dPlus: [number, number]
  /** Km admisibles. */
  km: [number, number]
  /** Necesita que la geografía permita esto (si no, el esqueleto no está disponible allí). */
  requiere?: Partial<GeoSignature>
}
```

Catálogo propuesto (32 esqueletos). Las columnas de motivos dicen `motivo×n@ventana`.

**Un día** (`format: 'un-dia'` y campeonatos):

| Id                  | kind / label            | Motivos                                                                                              | Meta                                                               | D+ (m)      | Km      | Referencia real (mapa 07)                                                                |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------- | ------- | ---------------------------------------------------------------------------------------- |
| `ud_esprint`        | llana / Flat            | `expuesto`×1-2@[0,1; 0,8], `cota`×0-1@[0,3; 0,7]                                                     | `esprint`                                                          | 400-1.400   | 150-240 | Brugge-De Panne, Scheldeprijs                                                            |
| `ud_esprint_capi`   | llana / Flat            | `enlace`, `cota`×2-3@[0,7; 0,95] con g 3,5-5 y km 2,5-5,5                                            | `esprint` (última cota a 5-8 km)                                   | 1.200-2.200 | 200-295 | Sanremo (Cipressa, Poggio)                                                               |
| `ud_circuito`       | media / Hills           | `enlace`×0-1@[0; 0,3], `circuito`×1 (vuelta 10-18 km con `muro`×1-2 o `cota`×1)                      | `repecho` o `esprint`                                              | 2.000-4.500 | 140-275 | Québec, Montréal, Japan Cup, Mundial                                                     |
| `ud_muro_final`     | media / Uphill finish   | `enlace`, `cota`×1-3, `circuito`×0-1 (que pase por el muro)                                          | `muro_meta`                                                        | 1.500-3.000 | 190-215 | Flèche, Emilia, Nokere                                                                   |
| `ud_muros`          | clasica / Classic       | `enlace`@[0; 0,45], `cadena`×2-4@[0,45; 0,97] con 3-8 muros cada una                                 | `esprint` o `repecho` (último muro a 1-15 km)                      | 1.500-3.500 | 180-275 | Ronde, Omloop, E3, Amstel, Brabantse                                                     |
| `ud_muros_adoquin`  | clasica / Classic       | como `ud_muros` con `adoquin: true` en el 40-70 % de los muros y `sector`×2-7                        | `esprint`                                                          | 1.500-2.500 | 180-275 | Ronde, Omloop (requiere `adoquin ≥ 2`)                                                   |
| `ud_sterrato`       | clasica / Classic       | `enlace`, `racimo`×2-3 de sectores 3-11 km, `muro`×1-3                                               | `muro_meta`                                                        | 2.500-3.800 | 180-215 | Strade Bianche (requiere `sterrato`)                                                     |
| `ud_adoquin`        | clasica / Cobbles       | `expuesto`@[0; 0,35], `racimo`×3-6@[0,35; 0,97] con 15-30 sectores en total, 3 de 5★                 | `sector_meta`                                                      | 600-1.200   | 200-260 | Roubaix (requiere `adoquin ≥ 2`)                                                         |
| `ud_adoquin_ligero` | clasica / Cobbles       | `enlace`, `racimo`×2-3 con 8-14 sectores, `muro`×0-3                                                 | `esprint` o `sector_meta`                                          | 800-1.800   | 180-215 | Denain, Le Samyn, Tro Bro Léon                                                           |
| `ud_montana`        | reina / Mountains       | `enlace`@[0; 0,4], `puerto`×2-3@[0,4; 0,85], `cota`×1-2@[0,8; 0,97]                                  | `descenso_meta` o `cima_cerca` (última cota 1,3-4,2 km, a 3-17 km) | 3.400-4.900 | 200-260 | Lombardía, Lieja, San Sebastián                                                          |
| `ud_montana_media`  | media / Hills           | `enlace`, `cota`×3-5@[0,3; 0,95], `muro`×0-2                                                         | `descenso_meta` o `repecho`                                        | 2.500-3.400 | 180-215 | Piemonte, Agostoni, Laigueglia                                                           |
| `ud_montana_alto`   | reina / Summit finish   | `enlace`@[0; 0,6], `puerto`×0-1, `alto_largo`                                                        | `alto_largo`                                                       | 2.500-3.800 | 150-185 | Ventoux Dénivelé, Mercan'Tour. **Rareza**: peso ≤ 0,02 y solo con `finalesAlto: 'largo'` |
| `ud_criterium`      | llana / Flat            | `circuito`×1 (vuelta 1,5-3 km × 20-40)                                                               | `esprint`                                                          | 0-300       | 45-100  | Critériums. Solo si el dueño lo pide (§14)                                               |
| `nc_ruta`           | media / Hills o clasica | `circuito`×1 (vuelta 10-20 km × 8-16) con los motivos que la geografía dé (`muro`, `cota`, `sector`) | `repecho`, `esprint` o `muro_meta`                                 | 2.000-4.000 | 180-260 | Campeonatos nacionales (siempre circuito)                                                |
| `nc_crono`          | cri / ITT               | `enlace`@[0; 1], `cota`×0-1                                                                          | `esprint`                                                          | 100-500     | 25-45   | Crono nacional                                                                           |

**Etapa de vuelta** (`format` `una-semana` y `gran-vuelta` generada):

| Id                    | kind / label                      | Motivos                                                                                                           | Meta                                          | D+ (m)      | Km (× factor de clase)                                                  |
| --------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| `et_llana`            | llana / Flat                      | `enlace`, `cota`×0-2@[0,2; 0,7] (cat 4/3)                                                                         | `esprint`                                     | 500-1.500   | 150-230                                                                 |
| `et_llana_viento`     | llana / Flat                      | `expuesto`×2-3@[0,3; 0,95]                                                                                        | `esprint`                                     | 300-900     | 150-210 (requiere `viento ≥ 2`)                                         |
| `et_media_valle`      | media / Hills                     | `enlace`, `cota`×2-4@[0,25; 0,85], `muro`×0-2                                                                     | `valle` o `descenso_meta` (última a 10-40 km) | 2.000-3.200 | 150-200                                                                 |
| `et_media_alto`       | media / Uphill finish             | `enlace`, `cota`×1-2@[0,3; 0,8], `alto_corto`                                                                     | `alto_corto` (3-7 km, ≤ 8,0 km siempre)       | 2.000-3.200 | 140-190                                                                 |
| `et_media_muro`       | media / Uphill finish             | `enlace`, `cadena`×1-2 de muros@[0,5; 0,95]                                                                       | `muro_meta` o `repecho`                       | 1.800-3.000 | 150-200                                                                 |
| `et_media_tendida`    | media / Hills                     | `enlace`, `tendida`×1-2, `cota`×1-2                                                                               | `esprint` o `repecho`                         | 1.500-2.500 | 150-200 (meseta, altiplano)                                             |
| `et_reina_alto_largo` | reina / Summit finish             | `enlace`@[0; 0,35], `puerto`×2-3@[0,3; 0,85] con `descenso` tras cada uno, `alto_largo`                           | `alto_largo`                                  | 3.500-5.500 | 120-200                                                                 |
| `et_reina_alto_corto` | reina / Summit finish             | `enlace`, `puerto`×2-3@[0,3; 0,85], `alto_corto` (8-12 %)                                                         | `alto_corto`                                  | 3.200-5.000 | 130-190                                                                 |
| `et_reina_cima_cerca` | reina / Mountains                 | `enlace`, `puerto`×2-3, último `puerto` + `cima_cerca`                                                            | `cima_cerca`                                  | 3.200-5.000 | 140-200                                                                 |
| `et_reina_valle`      | reina / Mountains                 | `enlace`, `puerto`×3-4@[0,2; 0,8], `descenso`, `valle`                                                            | `valle` o `descenso_meta`                     | 3.200-5.000 | 150-210                                                                 |
| `et_reina_encadenada` | reina / Summit finish o Mountains | `puerto`×3-5 desde [0,05] sin `enlace` > 6 km entre ellos (Dolomitas, Pirineos), meta `alto_corto` o `cima_cerca` | según meta                                    | 4.000-5.500 | 120-160                                                                 |
| `et_montana_corta`    | reina / Summit finish             | `puerto`×2 + `alto_largo`, sin enlace > 8 km                                                                      | `alto_largo`                                  | 3.000-4.200 | 110-140                                                                 |
| `et_reina_blanda`     | reina / Summit finish             | `enlace`@[0; 0,6], `cota`×1-2, `alto_largo` (9-12 km al 6-7 %)                                                    | `alto_largo`                                  | 1.500-2.500 | 140-180 (la cola baja que `calendarQueens.test.ts` exige, mapa 06 §6.3) |
| `et_crono`            | cri / ITT                         | `enlace`, `cota`×0-1 (≤ 3 km al 3-5 %)                                                                            | `esprint`                                     | 50-400      | 8-45                                                                    |
| `et_prologo`          | cri / ITT                         | `enlace`                                                                                                          | `esprint`                                     | 0-100       | 3-8                                                                     |
| `et_cronoescalada`    | cri / ITT                         | `enlace`×0-1@[0; 0,4], `alto_largo` o `alto_corto`                                                                | `alto_*`                                      | 500-1.200   | 8-25 (decisión del dueño, §14)                                          |

Las vueltas de una semana y las .2 reciben los mismos esqueletos de etapa con los rangos de km multiplicados por el factor de clase (§8, `ARCH.kmFactorPorClase`).

### 3.4 Esqueletos de composición (vueltas)

La composición de una vuelta también es una gramática, sobre papeles (`MixRole` de hoy, `calendar.ts` l. 413, ampliado):

```ts
export type StageRole =
  | 'llana'
  | 'llana_viento'
  | 'media'
  | 'media_alto'
  | 'media_muro'
  | 'reina_alto'
  | 'reina_valle'
  | 'reina_encadenada'
  | 'montana_corta'
  | 'cri'
  | 'prologo'
  | 'cronoescalada'

export interface TourSkeleton {
  id: TourSkeletonId
  /** Para cuántas etapas vale. */
  n: [number, number]
  /** Reglas de bloque (ver §7). */
  bloques: BlockRule[]
  /** Papel de la primera y de la última etapa, o sorteo con pesos. */
  primera: StageRole | Weighted<StageRole>
  ultima: StageRole | Weighted<StageRole>
  /** Pesos de las de en medio, por terreno dominante de la geografía. */
  pesos: Record<'llano' | 'ondulado' | 'media' | 'montana' | 'alta', Weighted<StageRole>>
}
```

### 3.5 Geografía

```ts
// packages/engine/src/routes/grammar/geo.ts

export type GeoZone =
  | 'flandes'
  | 'ardenas'
  | 'bretana'
  | 'francia_norte'
  | 'macizo_central'
  | 'alpes'
  | 'pirineos'
  | 'provenza'
  | 'italia_norte'
  | 'italia_centro'
  | 'dolomitas'
  | 'italia_sur'
  | 'cantabrico'
  | 'meseta'
  | 'andalucia'
  | 'levante'
  | 'portugal'
  | 'centroeuropa'
  | 'escandinavia'
  | 'britanicas'
  | 'balcanes'
  | 'anatolia'
  | 'andes'
  | 'cono_sur'
  | 'norteamerica'
  | 'australia'
  | 'asia_oriental'
  | 'golfo'
  | 'africa_llana'
  | 'generico'

export interface GeoSignature {
  zona: GeoZone
  /** Techo del relieve: qué esqueletos están disponibles. */
  relieve: 'llano' | 'ondulado' | 'media' | 'montana' | 'alta'
  /** Rango de los puertos largos (km y %). `null` si no hay puertos en la zona. */
  puerto: { km: [number, number]; g: [number, number]; forma: Motif['forma'] } | null
  cota: { km: [number, number]; g: [number, number] }
  muro: { km: [number, number]; g: [number, number]; adoquin: boolean } | null
  /** 0 ninguno · 1 urbano puntual · 2 sectores · 3 masivo (Flandes, Roubaix). */
  adoquin: 0 | 1 | 2 | 3
  sterrato: boolean
  /** 0 nada · 1 moderado · 2 fuerte · 3 decisivo (pólder, desierto, meseta). */
  viento: 0 | 1 | 2 | 3
  altitud: 'mar' | 'colina' | 'media' | 'alta' | 'altiplano'
  /** Amplitud del relleno entre dificultades (como `RELIEF.rollingAmplitude`, l. 1124-1131). */
  amplitud: number
  /** Qué finales en alto existen aquí. */
  finalesAlto: 'ninguno' | 'corto' | 'largo'
  /** Pesos de esqueleto de un día y de etapa, sobre los del catálogo (multiplican). */
  pesos: Partial<Record<SkeletonId, number>>
}
```

País a zona: una tabla `PAIS_ZONA` como la de `climate.ts` l. 66 (que ya cubre todos los países del calendario y cae a `templado`). Aquí cae a `generico` (ondulado, cotas 3-6 km, sin adoquín, sin sterrato, viento 1). Para los tres países que son varias geografías (FR, IT, ES: 125 de 310 carreras), la fila de la carrera admite `geo?: GeoZone` (`RaceRow`, l. 381-397, junto a `country`), y si falta se sortea con `geo|${raceId}` entre las zonas del país con pesos por clase. Ver §5.

### 3.6 Lo que sale del generador

```ts
export interface GeneratedStage {
  profile: StageProfile // segments + banners, lo que el motor consume
  kind: StageKind // = stageKindOf(profile).kind, garantizado
  label: string
  timeTrial?: boolean
  arch: {
    skeleton: SkeletonId
    geo: GeoZone
    motivos: Motif[] // instancia final, con `firma` y `nombre`
    finalKind: FinalKind | null // = finalKindOf(profile)
    dPlus: number // medido como `calendarQueens.ts::desnivelDe`
    intentos: number // cuántos intentos costó pasar los vetos
    degradado: boolean // cayó a la plantilla canónica
  }
  routeSource: 'generado'
}
```

`CalendarStage` (`calendar.ts` l. 42-46) gana `routeSource: 'real' | 'edicion' | 'generado'` y `arch?`. `real` = rasgos en `STAGE_FEATURES`; `edicion` = ciudades y km reales, relieve generado (hoy «sin validar» en el inventario); `generado` = todo inventado. `freezeRaceRoute` (`db/raceRoutes.ts` l. 48-51) deja de escribir `'generado'` a ciegas y copia `stage.routeSource`.

### 3.7 Cómo encaja con `Segment` y `Ramp`

Nada nuevo en `types.ts`. Cada motivo rinde uno o varios `Segment` con `tramos` de `Ramp` usando las primitivas de `profileGen.ts` que ya existen (`climb` l. 72-82, `descent` l. 85-93, `rolling` l. 100-122), que se exportan y se parametrizan (amplitud y p(rompepiernas) como argumentos en vez de `bumpy`). Las pancartas las emite el generador: una `cima` al final de cada `cota`, `puerto` y `muro` (como hace `auto()`, `calendar.ts` l. 93-102, que se conserva para los reales), y ninguna `meta_volante` (la regla de la casa de l. 89-91 se mantiene salvo decisión del dueño, §14).

---

## 4. El algoritmo

Función de entrada:

```ts
export function generateStage(req: StageRequest): GeneratedStage

export interface StageRequest {
  raceId: string
  stageIndex: number // 1-based; 1 para un día
  season: number // 0 = edición canónica
  km: number // objetivo; se respeta al 0,1 (contrato con editions.ts)
  role: StageRole | 'un_dia' // del esqueleto de composición o de la fila
  terrain: RouteTerrain // lo que la fila declara hoy; sesga los pesos
  geo: GeoSignature
  raceClass: RaceClass
  format: RaceFormat
  fixed?: { skeleton?: SkeletonId; finalKind?: FinalKind; dPlus?: number } // para bancos
}
```

Cada decisión usa su subflujo: `routeRng(`${ns}|${raceId}|${stageIndex}|...`)`. Un subflujo por decisión evita el defecto de hoy en `mountainSegments` (l. 316-317: «una tirada más y todos los perfiles cambian»): añadir una tirada a un subflujo no mueve los demás.

### 4.1 Paso 1 · Identidad de la carrera (una vez por carrera, subflujo `arch`)

`rngArch = routeRng(`arch|${raceId}`)`. Se elige el esqueleto **de la carrera** (un día) o el esqueleto de composición (vuelta):

1. Candidatos = esqueletos cuyo `kind` cuadra con `role`/`terrain` de la fila y cuyo `requiere` lo cumple `geo`.
2. Peso de cada candidato = peso base del catálogo × `geo.pesos[id]` × peso por clase (`ARCH.pesoPorClase`, §8: `ud_adoquin` pesa 0 en .2 fuera de Bélgica y Francia, `ud_montana_alto` pesa 0,02 en .1 y 0 en el resto).
3. Sorteo con pesos, una tirada. Si el candidato sorteado tiene peso 0 (no debería), el primero con peso > 0.

Resultado: `skeleton` fijo para siempre para esa carrera.

### 4.2 Paso 2 · Firma (una vez por carrera, subflujo `firma`)

`rngFirma = routeRng(`firma|${raceId}`)`. Para cada hueco con `firma: true` (en el catálogo: la meta siempre, el circuito si lo hay, el racimo de 5★ en `ud_adoquin`, el último `puerto` en `et_reina_*` cuando la carrera es de una semana), se instancian los parámetros (`km`, `g`, `forma`, `vueltas`, `estrellas`) dentro de los rangos del hueco recortados por la geografía. Se guardan como `Motif[]` con `firma: true` y `nombre`.

### 4.3 Paso 3 · Edición (una vez por carrera y temporada, subflujo `ed`)

`rngEd = routeRng(`ed|${raceId}|${season}`)`. Con `season === 0` no se tira ningún dado: los huecos no firma toman la mediana de su cardinalidad y el km es el de la fila. Con `season > 0`:

1. `km = round(kmFila × U(1 − ARCH.edicion.kmJitter, 1 + kmJitter))`, salvo etapas de edición real (`editions.ts`), donde el km es contrato con `calendar.test.ts` l. 162-174 y no se toca.
2. Para cada hueco no firma: `n = entero en [min, max]` uniforme.
3. Para `circuito` firma: `vueltas ± 1` con p `ARCH.edicion.vueltasJitter`.
4. Con p `ARCH.edicion.motivoNuevo`, un hueco opcional (`n[0] === 0`) que estaba a 0 pasa a 1, o al revés.

### 4.4 Paso 4 · Instanciación de motivos (subflujo `mot|i`)

Para cada hueco `i` y cada instancia `j`: `rng = routeRng(`mot|${raceId}|${stageIndex}|${season}|${i}|${j}`)`. Se sortean `km`, `g`, `forma` dentro de la intersección del rango del motivo, del `params` del hueco y de `geo`. Si la intersección es vacía, manda `geo` (un `puerto` en Flandes no existe: el hueco se degrada a `cota` o `muro` según `geo.relieve`, y se anota en `arch.motivos[i].nombre`).

Persecución del desnivel: se calcula `dPlusMotivos = Σ km·g·10` de las dificultades y se compara con `skeleton.dPlus` **descontando el relleno estimado** (`ARCH.rellenoDplusPorKm × kmEnlaces`, medido hoy en 661-1.413 m por llana, o sea 4-7 m/km; se pone 5,5 y se recalibra en el paso 3 del plan). Si `dPlusMotivos` queda fuera, se escala la **longitud** de las dificultades no firma (como hoy l. 366-374, factor en [0,7; 1,4], más estrecho que el [0,55; 1,8] actual porque ahora los rangos ya son geográficos). Nunca se escala la firma ni la meta.

### 4.5 Paso 5 · Colocación (subflujo `pos`)

`rngPos = routeRng(`pos|${raceId}|${stageIndex}|${season}`)`.

1. `kmDificultades = Σ km de motivos no enlace`, incluidas bajadas obligatorias (cada `puerto` y cada `cota` de un esqueleto `et_*` lleva `descenso` de `ARCH.bajadaTrasPuerto` = 0,6-0,9 × km del puerto, salvo que sea el de meta).
2. `kmEnlaces = km − kmDificultades`. Si `kmEnlaces < ARCH.enlaceMinimoTotal × km` (0,12), se recorta el motivo no firma más largo hasta cumplir; si sigue sin caber, veto V10 (§9) y siguiente intento.
3. Cada dificultad tiene una ventana `[a, b]` de fracción de etapa. Se ordenan por `a`. Se asigna el inicio de cada una: `inicio_i = km × U(a_i, b_i)` recortado para que `inicio_i ≥ fin_{i−1} + ARCH.enlaceMinimo` (1,5 km). El motivo `meta` empieza en `km − km_meta` siempre.
4. Los huecos entre dificultades son `enlace` (o `expuesto` si la geografía tiene `viento ≥ 2` y el esqueleto lo pide, o `tendida` si el esqueleto lo pone). Cada hueco de menos de 0,5 km se elimina (mismo umbral que `rolling`, l. 101).

Un `circuito` se coloca como una dificultad de `vueltas × kmVuelta` km, y sus hijos se colocan dentro de la vuelta con el mismo procedimiento y la ventana relativa a la vuelta.

### 4.6 Paso 6 · Rendido (subflujo `dib|i`)

Cada motivo se rinde a `Segment[]` con `routeRng(`dib|${raceId}|${stageIndex}|${season}|${i}`)` y las primitivas exportadas. En un `circuito`, las `vueltas` copias de cada hijo usan la **misma** semilla `dib|…|${i}|hijo${h}`: la vuelta 7 tiene las mismas rampas que la 1 (es lo que hace reconocible un circuito).

Cuadrar los km: `normalizeEnlaces(segments, km)` reparte la diferencia **solo entre los segmentos de enlace** (`llano`/`rompepiernas` fuera de motivos de firma), proporcionalmente y reescalando sus tramos; las dificultades, las bajadas y la meta no se tocan. Sustituye a `normalize` (l. 141-177) y a `garantizaPuerto` (l. 192-233) para los perfiles de la gramática: si los enlaces no pueden absorber la diferencia (< 0,5 km cada uno), veto V10. El residuo de redondeo va al enlace más largo, como hoy (l. 155-175). `normalize` se conserva para `featureProfile` (`normalizeTotal`, mapa 01 §6) y no se toca.

Pancartas: `cima` al km acumulado (redondeado, como `auto()` l. 98) al final de cada `cota`, `puerto`, `muro`; en un `circuito`, una por vuelta.

### 4.7 Paso 7 · Verificación y vetos

Sobre el `StageProfile` final se calculan `stageKindOf(profile, timeTrial)`, `finalKindOf(profile)`, `finishType(deriveFinishTerrain(sampleProfile(profile)), 176)` (el tamaño de grupo solo cambia `sprint_masivo`/`sprint_reducido`, `finish.ts` l. 142), `dPlus` con `desnivelDe`, y las reglas de §9. Si alguna falla: `intento += 1` y se repite desde el paso 4 con las semillas `…|i${intento}` (los subflujos `mot`, `pos`, `dib` llevan el intento; `arch`, `firma` y `ed` no, porque son identidad). Tope `ARCH.maxIntentos` = 8. Si se agotan: se instancia la **plantilla canónica** del esqueleto (`Skeleton.canonico: Motif[]`, una instancia fija escrita a mano por esqueleto, que pasa los vetos por construcción) con `degradado: true`. Un test sobre el calendario entero exige `degradado === false` en las 1.418 etapas y `intentos ≤ 3` en el p95.

### 4.8 Coste

Todo es geometría: por etapa, instanciar ≤ 12 motivos, colocar, rendir ≤ 80 segmentos, y un `sampleProfile` por intento (≤ 2.600 bloques). Hoy `SEASON_CALENDAR` se construye al cargar el módulo con 1.418 perfiles; la gramática añade por etapa un muestreo y dos lecturas, o sea del orden de 3-5 ms por etapa en el peor caso y bajo el segundo para el calendario entero. Si molestara al arranque de `apps/api`, el calendario puede construirse perezoso por carrera (`raceStages(raceId)` memoizado); no es parte de este diseño.

---

## 5. La geografía

### 5.1 Las zonas y sus firmas

Las 29 zonas de `GeoZone` (§3.5) condensan las 25 firmas del mapa 07 §3. Valores propuestos para las que más pesan en el calendario (FR 57, BE 42, IT 40, ES 28, NL 14, TR 11, PT 9, PL 8 carreras, mapa 02 §10); el resto en el fichero de datos con el mismo formato.

| Zona                                             | relieve              | puerto (km × %)           | cota (km × %) | muro (km × %, adoquín)      | adoquín | sterrato    | viento | altitud   | amplitud | finalesAlto          |
| ------------------------------------------------ | -------------------- | ------------------------- | ------------- | --------------------------- | ------- | ----------- | ------ | --------- | -------- | -------------------- |
| `flandes` (BE, NL)                               | ondulado             | null                      | 1,5-3 × 4-6   | 0,4-2,2 × 5-13, sí          | 3       | no          | 3      | mar       | 0,55     | ninguno              |
| `ardenas` (BE sur, LU)                           | media                | null                      | 2-4,5 × 6-9   | 0,8-2 × 8-12, no            | 1       | no          | 1      | colina    | 0,85     | corto (muro)         |
| `bretana` (FR oeste)                             | ondulado             | null                      | 1-3 × 5-8     | 0,5-2 × 5-8, no             | 1       | sí (tierra) | 3      | colina    | 0,7      | ninguno              |
| `francia_norte`                                  | llano                | null                      | 1-2,5 × 4-6   | 0,5-1,5 × 6-10, sí          | 2       | no          | 2      | mar       | 0,55     | ninguno              |
| `macizo_central`                                 | montana              | 5-17 × 6-8, irregular     | 3-6 × 5-7     | 1-2 × 8-12, no              | 0       | no          | 1      | media     | 1,0      | corto y largo        |
| `alpes` (FR, IT, CH, AT)                         | alta                 | 12-25 × 5,5-8,5, regular  | 4-8 × 5-7     | null                        | 0       | no          | 0      | alta      | 1,15     | largo                |
| `pirineos` (FR, ES, AD)                          | alta                 | 10-17 × 7-8,5, regular    | 4-8 × 6-8     | null                        | 0       | no          | 0      | alta      | 1,15     | largo                |
| `provenza`                                       | montana              | 15-22 × 6,5-7,5           | 3-8 × 5-8     | 1-2 × 7-9, no               | 0       | no          | 3      | media     | 0,9      | largo (raro)         |
| `italia_norte`                                   | montana              | 8-13 × 6-8, irregular     | 4-8 × 6-9     | 1-2 × 10-16, no             | 0       | no          | 0      | media     | 1,0      | corto                |
| `italia_centro`                                  | media                | 5-8 × 5-7                 | 2-6 × 6-9     | 0,5-2,1 × 9-14, no          | 0       | sí          | 1      | colina    | 0,9      | corto (muro)         |
| `dolomitas`                                      | alta                 | 7-14 × 7,5-10, progresiva | 4-8 × 6-8     | null                        | 0       | no          | 0      | alta      | 1,15     | corto y largo        |
| `cantabrico` (ES norte)                          | montana              | 5-15 × 7-10, irregular    | 3-8 × 6-9     | 1-4 × 10-15, no             | 0       | no          | 1      | media     | 1,1      | corto y largo        |
| `meseta` (ES centro, Aragón)                     | ondulado             | 6-10 × 4-6                | 3-8 × 4-6     | null                        | 0       | no          | 3      | altiplano | 0,6      | corto                |
| `andalucia`                                      | montana              | 7-20 × 6-8                | 4-8 × 5-7     | 1-2 × 8-11, no              | 0       | no          | 2      | alta      | 0,9      | largo                |
| `levante`                                        | media                | 9-22 × 5-7                | 3-6 × 6-9     | 1-4 × 10-12, no             | 0       | no          | 1      | media     | 0,9      | corto                |
| `portugal`                                       | media                | 8-20 × 5-7                | 3-8 × 6-7     | 1-2,6 × 8-10, no            | 1       | no          | 2      | media     | 0,9      | corto                |
| `centroeuropa` (DE, PL, CZ, SK, HU, SI, AT bajo) | media                | 8-12 × 4-8                | 2-6 × 5-7     | 1-2 × 8-10, no              | 1       | no          | 1      | colina    | 0,85     | corto                |
| `escandinavia` (DK, NO, SE, FI)                  | ondulado (NO: media) | NO: 3-10 × 6-9            | 0,3-1 × 5-8   | 0,5-1 × 6-8, no             | 1       | no          | 3      | mar       | 0,6      | ninguno (NO: corto)  |
| `britanicas` (GB, IE)                            | media                | 6-9 × 6-7                 | 1-4 × 7-10    | 0,25-1 × 10-17, sí (urbano) | 1       | no          | 3      | colina    | 0,9      | corto                |
| `balcanes` (HR, BA, RS, RO, BG, GR, AL, XK)      | montana              | 10-23 × 5-7               | 3-8 × 5-7     | null                        | 0       | no          | 2      | media     | 0,9      | corto y largo        |
| `anatolia` (TR, CY, AZ)                          | montana              | 15-21 × 6-7               | 3-8 × 5-7     | null                        | 0       | no          | 2      | media     | 0,8      | largo                |
| `andes` (CO, EC, VE)                             | alta                 | 15-30 × 4-7               | 5-10 × 5-7    | null                        | 0       | no          | 0      | altiplano | 1,0      | largo                |
| `cono_sur` (AR, CL)                              | llano                | 20-30 × 5-6               | 3-6 × 4-6     | null                        | 0       | no          | 3      | media     | 0,6      | largo (1 por vuelta) |
| `norteamerica` (US, CA)                          | media                | 10-30 × 4-9               | 2-6 × 6-10    | 0,4-1,8 × 8-10, no          | 0       | no          | 2      | media     | 0,9      | corto                |
| `australia` (AU, NZ)                             | ondulado             | null                      | 1,5-3 × 7-9   | 0,5-1,1 × 9-11, no          | 0       | no          | 3      | colina    | 0,7      | corto                |
| `asia_oriental` (JP, CN, TW, KR, TH, MY, IN)     | media                | 5-20 × 6-9                | 1-5 × 6-8     | null                        | 0       | no          | 1      | colina    | 0,8      | corto                |
| `golfo` (AE, SA, OM, QA)                         | llano                | 10-20 × 5-7 (1 jebel)     | 1-3 × 6-8     | null                        | 0       | no          | 3      | mar       | 0,4      | largo (1 por vuelta) |
| `africa_llana` (BJ, BF, CM, DZ, MA, MU, RW)      | ondulado (RW: media) | RW: 5-10 × 5-7            | 1-4 × 4-7     | null                        | 0       | no          | 2      | colina    | 0,7      | corto                |
| `generico`                                       | ondulado             | null                      | 2-6 × 4-7     | 1-2 × 8-10, no              | 0       | no          | 1      | colina    | 0,85     | corto                |

### 5.2 Cómo entra

1. **Disponibilidad**: `Skeleton.requiere` contra `GeoSignature`. `ud_adoquin` y `ud_muros_adoquin` requieren `adoquin ≥ 2`; `ud_sterrato` requiere `sterrato`; `et_reina_*` y `ud_montana` requieren `puerto !== null`; `et_llana_viento` requiere `viento ≥ 2`; `et_media_tendida` requiere `altitud ∈ {altiplano, media}` o `relieve === 'ondulado'`; `alto_largo` requiere `finalesAlto === 'largo'`.
2. **Rangos**: cada motivo instanciado toma la intersección del rango del catálogo con el de la zona (§4.4).
3. **Pesos**: `geo.pesos` multiplica los pesos del catálogo (§4.1): en `flandes`, `ud_muros_adoquin` ×3 y `ud_circuito` ×0,5; en `andes`, `et_reina_valle` ×2 y `et_reina_alto_largo` ×1,5.
4. **Relleno**: `amplitud` sustituye al `bumpy` binario de `rolling` (l. 105) y a `RELIEF.rollingAmplitude` por terreno (l. 1124-1131) para los perfiles de la gramática. `featureProfile` sigue usando `RELIEF`.
5. **Vetos** (§9, V1-V4): comprobados sobre el perfil final, no solo sobre la intención.

### 5.3 Lo que la geografía cambia en el país que ya existe

- `RaceRow` gana `geo?: GeoZone` (junto a `country`, l. 389-390). Para las 213 filas continentales que no declaran ni `country`, se rellena `geo` en `RACE_COUNTRY` ampliado a `RACE_PLACE: Record<string, { country: string; geo?: GeoZone }>` (una edición de datos, no de código).
- Los 133 campeonatos: `geo = zonaDe(code)`; `nc_ruta` compone el circuito con lo que dé la zona (muros adoquinados en BE, cotas de 5 km en CO, llano expuesto en DK). Es la promesa de `motor.md` §V.3 («un nacional belga es llano y de adoquines; uno colombiano, de montaña», mapa 05 §2) hecha función.
- `terrain` de la fila se conserva como **sesgo** (`terrain: 'mountain'` sube el peso de `ud_montana` ×4), no como orden: si la geografía no tiene puertos, un `terrain: 'mountain'` en Dinamarca da `ud_circuito` con muros y se anota en `arch`. Hoy hay 20 filas `cobbles` y todas caen en zonas con adoquín (mapa 07 §3, comprobado una a una), así que ningún dato existente choca.

---

## 6. La identidad entre ediciones

### 6.1 Qué es la identidad

De una carrera generada, es **fijo para siempre** (subflujos `arch` y `firma`, sin `season`):

- el esqueleto (o el de composición);
- la zona geográfica;
- los motivos de firma con sus parámetros: la meta (el muro de Huy mide siempre 1,3 km al 9,6 %), el circuito (Québec siempre 12,6 km), el racimo de 5★, el último puerto de una vuelta de una semana;
- en una vuelta: el papel de la última etapa y de la primera, y la crono si la tiene (posición y km ± 10 %).

Es **de la edición** (subflujo `ed|raceId|season`, y todos los `mot`, `pos`, `dib` llevan `season`):

- cuántos motivos no firma y dónde caen;
- el km total (± `kmJitter` 6 %) salvo en ediciones reales;
- las vueltas del circuito ± 1;
- el dibujo de todo lo que no es firma (rampas, ondulación);
- en una vuelta: los papeles de las etapas de en medio (con las garantías de §7), y el relieve de todas ellas.

### 6.2 La temporada 0

`SEASON_CALENDAR` sigue siendo la constante de módulo que hoy exportan `calendar.ts` l. 3643 y `index.ts` l. 83, construida con `season: 0`. Es la edición canónica: lo que ven los tests de `routes/`, los bancos y `apps/api` cuando no hay mundo. Con `season === 0` el paso 3 no tira dados, así que es tan determinista y estable como hoy.

### 6.3 La API de temporada

```ts
// routes/calendar.ts
export function raceForSeason(raceId: string, season: number): CalendarRace // memoizada por (id, season)
export function stagesForSeason(raceId: string, season: number): CalendarStage[]
```

Las carreras con `RACE_EDITIONS` y rasgos reales devuelven lo mismo en todas las temporadas (una edición real es un año concreto y el juego la repite, como hoy; cambiar eso es E12). Las de `editions.ts` sin rasgos (`routeSource: 'edicion'`) conservan ciudades y km y varían solo el dibujo (`season` entra en `dib`, no en `mot` ni `pos`: la arquitectura de una etapa «sin validar» es la de la edición 0, y la temporada solo la redibuja, para no alejarla más del dato que tiene).

En la base: `freezeRaceRoute(db, worldId, raceKey, raceId)` (`db/raceRoutes.ts` l. 35-55) recibe `season` (que `calendarRun.ts` ya tiene en l. 1603, dentro de `raceKey`) y congela `stagesForSeason(raceId, season)`. La tabla `race_routes` (schema l. 512-526) no cambia de forma: ya es por `raceKey`, o sea por temporada. `route_source` pasa a copiarse de la etapa. `recorridoDelMundo.test.ts` sigue auto-consistente (compara con el calendario del mismo proceso) y gana un caso: dos temporadas de la misma carrera congelan perfiles distintos con el mismo esqueleto.

`apps/api/src/routes/calendar.ts` l. 97 (`run?.profile ?? stage.profile`) pasa a `run?.profile ?? frozen?.profile ?? stagesForSeason(...)`: la ficha de una etapa no corrida enseña la edición de la temporada del mundo, no la canónica.

### 6.4 Variación deliberada y no aleatoria

La variación entre ediciones está acotada por constantes (`ARCH.edicion`, §8) y por la firma. Test de identidad (plan, paso 6): para cada carrera generada, temporadas 1-5 contra la 0: mismo esqueleto, misma zona, mismos motivos de firma con los mismos parámetros, `finalKindOf` igual salvo en `ud_montana` y `et_reina_valle` (donde la cubeta puede moverse dentro de `{descenso_meta, cima_cerca}` y `{valle, descenso_meta}` respectivamente), km dentro de ± 6 %, y al menos un motivo no firma distinto en posición o número en 4 de las 5 temporadas.

---

## 7. Vueltas por etapas

### 7.1 Lo que se conserva de `mixRoles`

Las cuatro garantías de `mixRoles` (`calendar.ts` l. 457-519) son de dominio y siguen: crono según `ROUTE.itt*`, última decisiva o de trámite, mínimo de selectivas, al menos un final en alto en vueltas de 4+, y la garantía de fondo (nadie sin crono ni final en alto). `calendar.test.ts` l. 184-246 sigue en verde sin tocarlo. Lo que cambia es lo que hay **dentro** de cada papel y **entre** papeles.

### 7.2 Esqueletos de composición

Cuatro esqueletos de vuelta, elegidos por `n` y por `format`/clase (subflujo `arch`):

| Id                                | n     | Reglas de bloque                                                                                                                                                                                                   | Primera                                   | Última                                |
| --------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------- |
| `vu_corta` (.2 y .1 de 3-5)       | 3-5   | ≤ 1 reina; ≤ 1 crono, el día 1 o el último; ninguna etapa > `kmMax` de clase                                                                                                                                       | `llana` 0,6 / `prologo` 0,2 / `media` 0,2 | según `ROUTE.lastDecisiveChance`      |
| `vu_semana` (Pro y WT de 5-8)     | 5-8   | reina en [n−3, n−1]; ≤ 2 finales en alto seguidos; ≤ 3 finales en alto; crono 8-35 km o prólogo 3-8                                                                                                                | `llana` 0,5 / `prologo` 0,3 / `media` 0,2 | según `ROUTE`                         |
| `vu_larga` (9-14)                 | 9-14  | bloques de montaña de 2-3 seguidas; ≥ 2 llanas entre bloques; reina en el último tercio                                                                                                                            | `llana` 0,6 / `prologo` 0,4               | según `ROUTE`                         |
| `vu_gran_vuelta` (15-21 generada) | 15-21 | descansos tras 9 y 15; reina en [15, 20]; primera semana con ≤ 1 final en alto y ninguna reina; ≤ 7 de alta montaña; ≥ 2 llanas entre bloques; nunca 8 llanas seguidas; segunda crono como hoy (`ittSecondStages`) | `llana` 0,5 / `prologo` 0,3 / `cri` 0,2   | `llana` 0,85 / `cri` 0,15 (Tour 2024) |

Hoy solo tres vueltas tienen 21 etapas y son reales; `vu_gran_vuelta` existe para las vueltas generadas de 9-11 etapas (5 en el calendario, mapa 02 §2) y para cuando E12 añada más.

Las reglas de bloque se aplican como **reparación determinista** después del sorteo con pesos (como hacen hoy las garantías, l. 488-517): se recorre de atrás hacia delante y se cambia el papel del hueco que rompe la regla por el papel más cercano que la cumpla (`reina_alto` → `media_alto` → `media` → `llana`). Test: 120 semillas × cada `n` × cada zona, cero violaciones de bloque.

### 7.3 Papeles nuevos y pesos

`mixWeights` (l. 1224-1228) se amplía a los 12 papeles y se indexa por el `relieve` de la zona, no por `MixTerrain`:

| relieve  | llana | llana_viento      | media | media_alto | media_muro | reina_alto | reina_valle | reina_encadenada | montana_corta |
| -------- | ----- | ----------------- | ----- | ---------- | ---------- | ---------- | ----------- | ---------------- | ------------- |
| llano    | 0,50  | 0,25 (viento ≥ 2) | 0,15  | 0,07       | 0,03       | 0          | 0           | 0                | 0             |
| ondulado | 0,40  | 0,10              | 0,25  | 0,15       | 0,10       | 0          | 0           | 0                | 0             |
| media    | 0,28  | 0,04              | 0,28  | 0,18       | 0,10       | 0,06       | 0,04        | 0                | 0,02          |
| montana  | 0,20  | 0,02              | 0,22  | 0,14       | 0,05       | 0,16       | 0,12        | 0,04             | 0,05          |
| alta     | 0,16  | 0                 | 0,18  | 0,10       | 0,02       | 0,22       | 0,14        | 0,10             | 0,08          |

El 40 % de reinas de `mixWeights.mountain` (hoy) baja a 26-54 % repartido en cuatro formas de reina en `montana`/`alta`, que con las reglas de bloque da 4-6 de alta montaña en una vuelta generada de 21 (mapa 07 §2.1: Tour y Giro llevan 4-6 con final en alto).

### 7.4 Kilómetros por clase

`mixKm` (l. 522-540) pasa a `kmDe(role, raceClass, format, last)`: el rango del esqueleto de etapa (§3.3) × `ARCH.kmFactorPorClase` (WT 1,0; Pro 0,92; .1 0,85; .2 0,75; NC 1,0 sobre su propio rango) con techo `ARCH.kmMaxPorClase` (.2 180 km, .1 200, Pro 240, WT 260 en un día). La última etapa × `ROUTE.lastStageKmFactor` como hoy.

### 7.5 La reina sigue siendo la que `calendarQueens` necesita

`et_reina_blanda` existe con peso propio (0,25 de las reinas en `media`/`montana`, 0,10 en `alta`) para que la cubeta < 1.500 m de `BANDAS_DESNIVEL` (`calendarQueens.ts` l. 90-95) no se vacíe: es la cola baja que hoy sostiene `queenLowDplusRange` (l. 1170) y que el mapa 06 §6.3 pide que se decida en el diseño y no en el test. Se decide aquí: la reina blanda es un final en alto largo con poco antes, que existe (Vuelta de una semana con un solo puerto), y su desnivel objetivo es 1.500-2.500 m **con relleno**. La distribución del calendario deja de ser un 60/40 sobre dos rangos y pasa a ser la suma de las cinco formas de reina con sus pesos; se mide en el paso 9 del plan y se le pone banda después.

---

## 8. Constantes

Bloque nuevo `ARCH` en `constants.ts`, junto a `ROUTE`. Los rangos de motivo que hoy son literales en `profileGen.ts` pasan aquí. Las tablas grandes (zonas, catálogo de esqueletos) van en `routes/grammar/geo.ts` y `skeletons.ts` como datos con comentario, y `ARCH` guarda solo los números de intención.

| Nombre                              | Valor                                                                                                             | Intención                                                                                | En qué se apoya                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ARCH.motivo.cota.km`               | [2,5; 8,0]                                                                                                        | Una cota de media montaña; el techo 8,0 deja 0,5 km al umbral `PASS_MIN_KM` 8,5          | `stageKind.ts` l. 62; hoy 3-7 (`profileGen.ts` l. 247)                                                                      |
| `ARCH.motivo.cota.g`                | [4; 7]                                                                                                            |                                                                                          | hoy 4,5-6,5 (l. 248); Jaizkibel 5,6, Arrate 7,4 (mapa 07 §3)                                                                |
| `ARCH.motivo.puerto.km`             | [9,0; 25]                                                                                                         | Puerto de alta montaña; suelo 9,0 (0,5 sobre 8,5); techo 25 (Croix de Fer 29 es rareza)  | hoy 6-11 intermedios y 9-15 final con escala hasta 1,8 (l. 359-363, 374)                                                    |
| `ARCH.motivo.puerto.g`              | [5; 9]                                                                                                            |                                                                                          | Galibier 5,1, Angliru 9,8 (recortado por zona)                                                                              |
| `ARCH.motivo.puerto.rampaIrregular` | { km: [0,3; 0,8], g: [11; 13] }                                                                                   | La rampa que abre brecha (SPEC §6.17: irregular ≥ 1,5× regular)                          | `wallMinGradient` 8 (l. 1594): a ≥ 8 el motor usa COL                                                                       |
| `ARCH.motivo.muro.km`               | [0,4; 3,0]                                                                                                        | Muro; techo 3 = `WALL_MAX_KM`                                                            | `stageKind.ts` l. 60; Kwaremont 2,2, Paterberg 0,36                                                                         |
| `ARCH.motivo.muro.g`                | [8; 16]                                                                                                           |                                                                                          | Koppenberg 11,6, Sormano 15,8                                                                                               |
| `ARCH.motivo.sector.km`             | [0,3; 3,7]                                                                                                        |                                                                                          | Roubaix 0,3-3,7 (mapa 07 §1.4)                                                                                              |
| `ARCH.motivo.racimo.sectores`       | [4; 10]                                                                                                           | Sectores por racimo                                                                      | Roubaix: 29-31 en 3-6 racimos                                                                                               |
| `ARCH.motivo.racimo.separacion`     | [2; 6] km                                                                                                         | Asfalto entre sectores: impide reagrupar                                                 | mapa 07 §1.4                                                                                                                |
| `ARCH.motivo.circuito.kmVuelta`     | [8; 30]                                                                                                           |                                                                                          | Québec 12,6, Mundial 12-27                                                                                                  |
| `ARCH.motivo.circuito.vueltas`      | [3; 18]                                                                                                           |                                                                                          | Montréal 17-18, Great Ocean 4                                                                                               |
| `ARCH.motivo.tendida.g`             | [1,5; 3,5]                                                                                                        | Tipada `llano`: desgasta y no selecciona                                                 | `sample.ts` l. 32-44; `kmSubida` cuenta por tipo (mapa 03 §4.1)                                                             |
| `ARCH.motivo.descenso.g`            | [−8; −3]                                                                                                          |                                                                                          | hoy −2 mínimo (l. 90) y 5-6 medio                                                                                           |
| `ARCH.meta.muro`                    | { km: [0,5; 1,0], g: [9; 16], aproxAmp: 2,5, aproxKm: 2 }                                                         | Muro de meta que `finishType` lea como `muro`                                            | `muroMaxKm` 1, `muroMinGradient` 8 (l. 4462-4463), `finishClimbMinGradient` 3 (l. 3977), `finishClimbGapBlocks` 5 (l. 3980) |
| `ARCH.meta.repecho`                 | { km: [1; 2,9], g: [4; 7] }                                                                                       | Puncheur: por debajo de `finishAltoMinKm` 3                                              | l. 3989                                                                                                                     |
| `ARCH.meta.altoCorto`               | { km: [3; 7], g: [6; 11] }                                                                                        | Planche 5,9 × 8,5; Xorret 3,9 × 11,4                                                     | mapa 07 §4.3                                                                                                                |
| `ARCH.meta.altoLargo`               | { km: [9; 22], g: [6; 9] }                                                                                        | El 70-80 % de finales en alto de gran vuelta; suelo 9 por `PASS_MIN_KM`                  | mapa 07 §4.3; hoy 8,6 (l. 387)                                                                                              |
| `ARCH.meta.cimaCerca.valle`         | [1,0; 4,5]                                                                                                        | Holgura de 0,5 con el corte 5                                                            | `FINAL_KIND_CUTS` l. 30; hoy 1,5-5 (l. 332)                                                                                 |
| `ARCH.meta.descensoMeta.valle`      | [6; 19]                                                                                                           | Holgura con 5 y 20                                                                       | hoy 6-20 (l. 333)                                                                                                           |
| `ARCH.meta.valle.valle`             | [21; 45]                                                                                                          |                                                                                          | hoy 22-45 (l. 334)                                                                                                          |
| `ARCH.meta.unDiaUltimaCota`         | { km: [1,3; 4,2], g: [7; 11], aMeta: [3; 17] }                                                                    | La regla del caso v40, en números                                                        | mapa 07 §1.6 y §4.3                                                                                                         |
| `ARCH.rellenoDplusPorKm`            | 5,5 m/km                                                                                                          | Estimación del D+ del relleno para perseguir el objetivo total                           | medido 661-1.413 m en llanas de 130-215 km (mapa 01 §1)                                                                     |
| `ARCH.escalaDificultades`           | [0,7; 1,4]                                                                                                        | Cuánto se alargan o acortan las dificultades no firma para cuadrar D+                    | hoy [0,55; 1,8] (l. 374)                                                                                                    |
| `ARCH.enlaceMinimo`                 | 1,5 km                                                                                                            | Dos dificultades nunca se tocan (salvo `cadena`)                                         | `finishClimbGapBlocks` 5 = 0,5 km; margen ×3                                                                                |
| `ARCH.enlaceMinimoTotal`            | 0,12                                                                                                              | Fracción mínima de la etapa que es enlace                                                | hoy 0,15 en reina (l. 390)                                                                                                  |
| `ARCH.bajadaTrasPuerto`             | [0,6; 0,9] × km del puerto                                                                                        | Lo que se baja de lo que se subió                                                        | `featureProfile` baja el 85 % (mapa 01 §6)                                                                                  |
| `ARCH.maxIntentos`                  | 8                                                                                                                 | Reintentos antes de la plantilla canónica                                                | p95 medido en el paso 4 del plan; se recorta si sobra                                                                       |
| `ARCH.edicion.kmJitter`             | 0,06                                                                                                              | Variación de km entre ediciones                                                          | Sanremo 289-294, Ronde 268-273 (± 1-2 %); Amstel 250-256; se deja más ancho para carreras inventadas                        |
| `ARCH.edicion.vueltasJitter`        | 0,5                                                                                                               | p de que el circuito cambie ± 1 vuelta                                                   | Montréal 17-18                                                                                                              |
| `ARCH.edicion.motivoNuevo`          | 0,35                                                                                                              | p de que un hueco opcional aparezca o desaparezca                                        | juicio: una carrera cambia una cosa al año                                                                                  |
| `ARCH.kmFactorPorClase`             | { WT: 1,0; Pro: 0,92; '1': 0,85; '2': 0,75; NC: 1,0 }                                                             | Etapas más cortas cuanto más baja la clase                                               | mapa 07 §4.1 (.2: 100-160 km por etapa)                                                                                     |
| `ARCH.kmMaxPorClase`                | { WT: 260; Pro: 240; '1': 200; '2': 180; NC: 260 }                                                                | Techo UCI aproximado                                                                     | mapa 07 §4.1 y §4.4 regla 8 (cifras a confirmar, anotado en el propio comentario)                                           |
| `ARCH.pesoPorClase`                 | tabla esqueleto × clase                                                                                           | `ud_montana_alto` 0,02 en .1, 0 en el resto; `ud_adoquin` 0 en .2 fuera de `adoquin ≥ 2` | mapa 07 §1.2 (tres carreras sobre doscientas)                                                                               |
| `ARCH.reinaBlandaShare`             | { media: 0,25; montana: 0,25; alta: 0,10 }                                                                        | La cola baja de desnivel, decidida en el diseño                                          | §7.5; `calendarQueens.test.ts` l. 62-63                                                                                     |
| `ARCH.pesosComposicion`             | tabla de §7.3                                                                                                     |                                                                                          | `ROUTE.mixWeights` l. 1224-1228                                                                                             |
| `ARCH.bloques.gv`                   | { descansos: [9, 15], reina: [15, 20], primeraSemanaFinalesAlto: 1, maxAltaMontana: 7, minLlanasEntreBloques: 2 } | Reglas de gran vuelta                                                                    | mapa 07 §2.1 reglas 1-4                                                                                                     |

`ROUTE.queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange` y `queenFinalMix` (l. 1167-1185) se retiran con el generador viejo (paso 8); su papel lo cumplen las formas de reina y sus pesos. `queenFinalMix` como **medida** (el reparto de `finalKindOf` sobre las 157 reinas) se conserva como banda de `queenGeometry`, no como parámetro. Los `ROUTE.itt*`, `lastDecisiveChance`, `lastSummitShare`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor` se conservan tal cual. `kmFlat`/`kmHilly`/`kmUphill`/`kmSummit` se retiran a favor de los rangos de esqueleto × clase.

---

## 9. Reglas de veto y plausibilidad

Se comprueban en el paso 7 del algoritmo sobre el perfil final, con las funciones del motor (`stageKindOf`, `finalKindOf`, `deriveFinishTerrain` + `finishType`, `sampleProfile`, `desnivelDe`). Cada veto es un predicado puro con nombre, y un test por veto con un perfil literal que lo dispara y otro que no. Sobre el calendario entero (temporadas 0-3) se exige cero violaciones de V1-V12 y cero `degradado`.

| Veto                        | Regla                                                                                                                                                                                                                 | El caso que impide                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **V1 geografía: puerto**    | Ningún `puerto` (segmento `puerto` con `climbSize(s).km ≥ 8,5`) donde `geo.puerto === null`                                                                                                                           | Un puerto de 12 km en Flandes, Dinamarca, el Golfo llano, Australia                                                         |
| **V2 geografía: adoquín**   | Ningún `paves` donde `geo.adoquin < 2`; ningún muro `adoquin: true` donde `adoquin === 0`                                                                                                                             | Roubaix en Colombia (mapa 07 §4.4 regla 3)                                                                                  |
| **V3 geografía: sterrato**  | `ud_sterrato` solo con `geo.sterrato`                                                                                                                                                                                 | Strade en Flandes (regla 4)                                                                                                 |
| **V4 geografía: altitud**   | `alto_largo` solo con `finalesAlto === 'largo'`; ningún `puerto` ≥ 15 km fuera de `altitud ∈ {alta, altiplano, media}`                                                                                                | Cima a 2.500 m en Bélgica (regla 5)                                                                                         |
| **V5 el caso v40**          | En `format === 'un-dia'` (y en `nc_*`), la última cota (`lastClimbKm` con pancartas) mide ≤ 4,2 km salvo `ud_montana_alto`; y si muere en meta (`finalKindOf === 'alto'`) mide ≤ 2,1 km (muro) o es `ud_montana_alto` | Race Jura: final en alto de 14 km en una carrera de un día (`profileGen.ts` l. 430-438; epics G6). Regla 1 del mapa 07 §4.4 |
| **V6 reina es reina**       | Todo esqueleto `kind: 'reina'` da `stageKindOf(...).kind === 'reina'`; y a la inversa, `media` da `media`, `clasica` da `clasica`, `llana` da `llana`                                                                 | El 14 % de `mountainClassicSegments` clasificado `media` (mapa 01 §2.6); las 2 de 1.500 de `hillyUphill` clasificadas reina |
| **V7 el final declarado**   | `finalKindOf(profile) === skeleton.finalKind` cuando está declarado; `finishType(...)` ∈ lo que `MetaKind` promete (§3.2)                                                                                             | Un `muro_meta` que sale `puncheur`; un `cima_cerca` que sale `valle_corto` por 0,3 km                                       |
| **V8 reina de verdad**      | Un esqueleto `et_reina_*` (no `blanda`) tiene `puerto` ≥ 9 km en meta, o dos puertos ≥ 9 km, o D+ ≥ 3.400 m                                                                                                           | «Etapa reina con puerto final de menos de 8 km al 6 % y sin otro puerto HC antes: eso es media montaña» (regla 2)           |
| **V9 llana es llana**       | `kind: 'llana'` con D+ ≤ 1.800 m y sin cota ≥ 2,5 km a ≥ 5 % en los últimos 15 km                                                                                                                                     | Regla 10: una llana de 2.500 m es media                                                                                     |
| **V10 cabe**                | Enlaces ≥ `enlaceMinimoTotal` × km y cada enlace ≥ 0,5 km tras cuadrar; ningún segmento con `km < 0,5`; suma de km = objetivo al 0,1                                                                                  | Segmentos a cero (`calendar.test.ts` l. 108-121); km de las ediciones (l. 162-174)                                          |
| **V11 muro en meta existe** | Sobre el calendario (no por etapa): al menos 1 % de las etapas en línea generadas tipa `muro` y al menos 8 % `puncheur`                                                                                               | Hoy 0 de 1.075 (balance v60 §12)                                                                                            |
| **V12 no se repite**        | Sobre el calendario: dos etapas del mismo esqueleto y zona con km ± 10 % tienen correlación de `g` por km < 0,9 (vector de `sampleProfile` remuestreado a 1 km)                                                       | Dos «clásicas» que son la misma desplazada (agenda §4.18 hallazgo 2)                                                        |
| **V13 clase**               | `km ≤ kmMaxPorClase[raceClass]`; en `vu_corta` ≤ 1 crono; en `vu_semana` ≤ 3 finales en alto y ≤ 2 seguidos                                                                                                           | Reglas 7 y 8 del mapa 07 §4.4                                                                                               |
| **V14 gran vuelta**         | Las de `ARCH.bloques.gv`                                                                                                                                                                                              | Regla 6                                                                                                                     |
| **V15 pendientes**          | Ningún tramo con `g > 20` ni `g < −14`; ningún bloque de `subida` con `g < 1`                                                                                                                                         | Salidas del ruido de `climb` (l. 78 con `Math.max(1, …)` ya lo garantiza por abajo)                                         |

V1-V10 y V15 son por etapa y disparan reintento; V11-V14 son de calendario o de vuelta y se comprueban en tests (V13-V14 además se reparan en la composición, §7.2).

El caso v40 en la práctica: `ud_montana` en `alpes` con `terrain: 'mountain'`. El esqueleto pone `puerto`×2-3 en [0,4; 0,85] (12-25 km cada uno en `alpes`), `cota`×1-2 en [0,8; 0,97] y meta `descenso_meta` con `unDiaUltimaCota` 1,3-4,2 km a 3-17 km. V5 comprueba que la última cota mide ≤ 4,2 y que no muere en meta; V6 que `stageKindOf` diga `reina` (por el `puerto` ≥ 9 km); V7 que `finalKindOf` sea `valle_corto` o `cima_cerca`. Lo que el generador viejo hacía (final en alto de 9-15 km en un día) está prohibido por V5 en cualquier esqueleto de un día salvo `ud_montana_alto`, cuyo peso es 0,02 y solo en `.1` con `finalesAlto: 'largo'`.

---

## 10. Lo real frente a lo generado

### 10.1 Prioridad

Sin cambios en el orden de `buildRace` (l. 902-924): edición real primero, luego rasgos reales, luego generador. Lo que cambia:

1. `featureSpec` (l. 196-209) marca `routeSource: 'real'`; `stagesFromEdition` marca `'edicion'` en las etapas sin rasgos (l. 223) y las pasa por la gramática con `geo` de la carrera y `role` derivado de `s.terrain` (`flat` → `et_llana`, `hilly` → `et_media_*`, `mountain` → `et_reina_*`, `itt` → `et_crono`, `cobbles` → `ud_adoquin_ligero`), con el km de la edición como contrato.
2. Un día de tabla sin rasgos: gramática con `routeSource: 'generado'`.
3. `nationalChampionships` (l. 316-362): `nc_ruta` y `nc_crono` con la zona del país.

`fuentes-recorridos.md` sigue mandando: la gramática no inventa nada sobre una carrera con dato. Una carrera con rasgos parciales (Guangxi solo carga el final de la e5, mapa 02 §9) sigue como hoy: la etapa con rasgos es `real` y las demás `edicion`.

### 10.2 Distinción en la interfaz

- `CalendarStage.routeSource` llega a la API en la ficha de carrera (`apps/api/src/routes/calendar.ts` l. 91-105 ya monta `planFrom` con `kind`, `label`, `km`; añade `routeSource` y `arch?.motivos` en texto).
- La web enseña una marca por etapa con tres estados y texto explícito: «Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado». Es la promesa de E12 («cómo se distingue en la interfaz lo real de lo generado, que es una promesa al jugador y no un detalle», mapa 05 §8) resuelta desde el dato del calendario, y `inventario-recorridos.md` deja de ser la única fuente de esa distinción.
- Para las generadas, la ficha añade la **frase de arquitectura** a partir de `arch.motivos[*].nombre`: «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro». Es lo que hace reconocible una carrera sin mapa.
- `race_routes.route_source` (schema l. 523) recibe el valor real en vez de `'generado'` fijo.

---

## 11. El banco

### 11.1 Lo que no se mueve y no debe moverse

Las 15 bandas sobre `llana-180`, `reina-150`, `cri-40` y `chronicle` (mapa 04 §4.1), las cuatro huellas selladas (`attribution`, `timetrial`, `raceRadio`, escenarios literales), los invariantes 6.17 sintéticos, `grandTour` (20 de 21 reales), los tests de perfiles reales, `finalKind.test.ts` (los cortes 0,5/5/20 se conservan; §3.2 se diseña con holgura sobre ellos) y `recorridoDelMundo.test.ts`. Si alguna se mueve, el cambio ha tocado el motor y no el generador (mapa 04 §5.3 regla 3).

### 11.2 Lo que se mueve a propósito y cómo se re-sella

| Test / banda                                                                                            | Qué pasa                                                                                                | Qué se hace                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/stageKind.test.ts`                                                                              | Los ocho generadores desaparecen                                                                        | Se reescribe por esqueleto: cada `SkeletonId` × 5 km × 60 semillas × 4 zonas compatibles → `stageKindOf` = `skeleton.kind`, `finalKindOf` = `skeleton.finalKind`. Y el comentario de umbrales de `stageKind.ts` l. 44-58 se remide (hoy desfasado: reinas hasta 26,7 km, mapa 01 §9.6) |
| `routes/calendar.test.ts` l. 162-174 (km de ediciones) y l. 269-277 (`Uphill finish` acaba en `puerto`) | Deben seguir en verde                                                                                   | V10 garantiza el km; `et_media_alto` y `et_reina_alto_*` terminan en `puerto` por construcción de `MetaKind`                                                                                                                                                                           |
| `apps/api/src/stageHistory.test.ts` l. 199 (`cambian === 49`)                                           | Cambia la cifra                                                                                         | Se re-sella con la nueva cifra y la causa (como hizo la v64); la mitad que vigila (`kind` no cambia) debería dar **cero** discrepancias, porque `kind` ahora se deriva de `stageKindOf` (V6)                                                                                           |
| `sim/calendarQueens.test.ts`                                                                            | Cambia la muestra (25 de 27 no reales) y el reparto de desnivel                                         | Se remide con 12 semillas antes de tocar la banda; `facil.races > 0` lo sostiene `et_reina_blanda`; `facil > dura + 10` se espera que siga (es física, no forma); la banda 6-30 se recentra con medida y con el dueño (era «está bien así» sobre 18,1)                                 |
| `sim/invariants.test.ts` «carreras PEQUEÑAS»                                                            | 7 de 10 carreras generadas cambian                                                                      | Remedir las 9 bandas de `smallTours` pareadas viejo/nuevo; `media.stages > 40` depende de los papeles y se recuenta                                                                                                                                                                    |
| «cola en las reinas REALES» (`realQueens`)                                                              | Colombia e5, Guatemala e9 y Tachira e6 son generadas y su `why` ya no describe el perfil (mapa 06 §3.2) | Las tres se **congelan como perfiles literales** en `realQueens.ts` (copiados del calendario de hoy con un comentario de origen) para que la lista cerrada sea cerrada por forma; o se sustituyen por tres reales si E12 las trae                                                      |
| «ninguna carrera de un día satura» (las 8 más duras)                                                    | El conjunto se elige por demanda y el generador lo elige                                                | Se remide; se espera que las 8 sigan por debajo de 0,92 porque V5 impide la forma que saturaba                                                                                                                                                                                         |
| «cola de una CONTRARRELOJ real»                                                                         | 3 de 5 cronos generadas                                                                                 | `et_crono` admite `cota` ≤ 3 km al 3-5 %: se remide `tailPct` (esperado +0,5 puntos como mucho)                                                                                                                                                                                        |
| `coherence.test.ts` Jaén y `journal.test.ts` Tramuntana                                                 | Otro relieve                                                                                            | Se re-corre; si aflora una contradicción es del motor y se arregla, no se afloja el cero                                                                                                                                                                                               |
| `index.test.ts` `ENGINE_VERSION`                                                                        | 69 → 70                                                                                                 | En el paso 8 del plan                                                                                                                                                                                                                                                                  |
| `raceRoutes.test.ts` (nº de etapas = `RACE_ROUTES`)                                                     | Solo si cambia `n`                                                                                      | No cambia: `n` sigue viniendo de la fila                                                                                                                                                                                                                                               |

### 11.3 Bandas nuevas de geometría (test rápido, coste ≈ 0)

`routes/grammar/calendario.test.ts`, sobre las 1.418 etapas de la temporada 0 y las 1-3:

| Métrica                                                    | Criterio                                                                                       | Por qué                                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Vetos V1-V10, V15                                          | 0 violaciones; 0 `degradado`; p95 `intentos` ≤ 3                                               | §9                                                                                                             |
| Esqueletos distintos por clase y formato                   | ≥ 8 en un día WT/Pro, ≥ 10 en .1/.2 de un día, ≥ 6 en NC ruta, ≥ 9 papeles de etapa en vueltas | Contra «tres o cuatro modelos» (agenda §4.18)                                                                  |
| Entropía de esqueleto dentro de cada zona con ≥ 8 carreras | ≥ 1,5 bits                                                                                     | Que Francia no sean 57 iguales                                                                                 |
| Correlación media entre pares del mismo esqueleto (V12)    | mediana < 0,8, máximo < 0,9                                                                    | mapa 04 §5.2                                                                                                   |
| Reparto de `finalKindOf` sobre las reinas                  | cada cubeta ≥ 5 %; `alto` en [0,35; 0,55]                                                      | `queenFinalMix` como medida, ± 0,08 (tactica R28.2)                                                            |
| D+ de reina por formato                                    | p50 gran vuelta (generada) ≥ 3.000; p50 una semana ≥ 2.400; cubeta < 1.500 poblada (≥ 5 %)     | mapa 04 §5.1; compatibiliza lo que v60 §1b declaró incompatible, porque la cola baja es una forma y no un 40 % |
| Subida fuera de los últimos 30 km en reinas                | ninguna en 0 %; p10 ≥ 5 %                                                                      | la variable que separó canónica de reales (balance v43 §7)                                                     |
| Finales `muro` y `puncheur` (V11)                          | ≥ 1 % y ≥ 8 % de las etapas en línea generadas                                                 | balance v60 §12                                                                                                |
| Última cota en un día                                      | km ≤ 4,2 y 3-17 km a meta en el 98 % (resto `ud_montana_alto`)                                 | mapa 07 §4.3                                                                                                   |
| Km por clase                                               | p90 de .2 ≤ 170; ninguna > `kmMaxPorClase`                                                     | mapa 07 §4.1                                                                                                   |
| Sectores de pavé en `ud_adoquin`                           | 15-30 sectores, 40-60 km, último a 1-8 km                                                      | Roubaix; hoy 3 sectores                                                                                        |
| Identidad entre ediciones (§6.4)                           | mismo esqueleto, firma igual, km ± 6 %, ≥ 1 diferencia no firma en 4 de 5 temporadas           | §6                                                                                                             |
| Geografía de campeonatos                                   | BE/NL con adoquín en ≥ 60 %; CO/EC con cota ≥ 5 km en 100 %; DK/AE con `expuesto`              | motor.md §V.3                                                                                                  |

### 11.4 Bandas de simulación (pareadas, `test:bancos`)

Se corren con el generador viejo y el nuevo sobre la misma `worldSeed` y campo, como pide el mapa 04 §5.3:

- `calendarQueens` por cubeta de desnivel: monótona decreciente (43,8 / 13,7 / 1,6 / 0 hoy); total remedido y recentrado.
- Cola de la reina por `finalKindOf` sobre muestra sistemática (no solo `realQueens`): orden `alto > cima_cerca > valle_corto > valle_largo`, ninguna > 18 %.
- `smallTours` foto de meta: la parte que se mueve se explica por pares de agrupadas (composición) y no por el motor.
- Ganadores distintos por vuelta (`distinctWinnerPct`): no baja.
- Erosión de las 8 más duras: 0 saturan.
- Nueva, informativa antes de bandear: **quién gana por esqueleto** (vocación del ganador por `SkeletonId`): `ud_muros` lo gana un clasicómano, `ud_adoquin` un rodador de pavé, `et_media_muro` un puncheur. Es el criterio de «mejor y no solo distinto» por el lado del juego.

---

## 12. Plan de implementación

Cada paso: tests primero, luego código, `pnpm typecheck && pnpm test` en verde antes de cerrar. Un solo salto de `ENGINE_VERSION` (paso 8), porque hasta ahí el calendario no cambia de conducta.

**Paso 1 · Congelar lo de hoy y extraer primitivas** (sin cambio de conducta)

- Test: `routes/golden.test.ts` guarda un hash FNV por etapa de las 1.418 (`JSON.stringify(profile)`) y exige igualdad. Se escribe antes de tocar nada.
- Código: exportar `climb`, `descent`, `rolling`, `split`, `between` de `profileGen.ts`; `rolling` gana parámetros `amp` y `pRompepiernas` con los valores de hoy por defecto (1,8/3,2 y 0/0,35). Mover los literales de rango a `ARCH.motivo.*` **manteniendo los valores actuales** en los ocho generadores viejos. El golden no se mueve. Sin `ENGINE_VERSION`.

**Paso 2 · Geografía**

- Tests: `grammar/geo.test.ts`: todo país de `COUNTRIES` y todo `RACE_COUNTRY` resuelve a una zona; cada zona cumple sus invariantes (`puerto.km[0] ≥ 9`, `cota.km[1] ≤ 8`, `muro.km[1] ≤ 3`, `adoquin ≥ 2` ⇒ `muro.adoquin` posible); las 20 filas `terrain: 'cobbles'` de hoy caen en zonas con `adoquin ≥ 2`.
- Código: `grammar/geo.ts` (tipos de §3.5, `ZONAS`, `PAIS_ZONA`, `zonaDe(country, geo?)`), `RaceRow.geo?`, `RACE_PLACE`.

**Paso 3 · Motivos**

- Tests: `grammar/motifs.test.ts`: por motivo, 300 instancias → rangos, `validateMotif`, rendido a `Segment[]` con suma de km exacta y tramos coherentes; `muro_meta` rendido y muestreado → `finishType(...) === 'muro'` en 300 de 300; `repecho` → `puncheur`; `alto_corto`/`alto_largo` → `alto`; `sector_meta` → `pave`; `tendida` no cuenta en `kmSubida` (bloques tipo `llano`); `circuito` repite rampas vuelta a vuelta.
- Código: `grammar/motifs.ts` (tipos, rangos desde `ARCH`, `renderMotif`). Recalibrar `ARCH.rellenoDplusPorKm` midiendo el relleno de 1.000 enlaces.

**Paso 4 · Esqueletos y colocación**

- Tests: `grammar/skeletons.test.ts`: catálogo bien formado (ventanas ordenadas, `meta` último, `requiere` consistente); por esqueleto × 5 km × 60 semillas × sus zonas compatibles: `stageKindOf` y `finalKindOf` como declara (V6, V7); `intentos` p95 ≤ 3; plantilla canónica de cada esqueleto pasa todos los vetos.
- Código: `grammar/skeletons.ts` (catálogo, plantillas canónicas), `grammar/place.ts` (§4.5), `grammar/normalizeEnlaces`.

**Paso 5 · Vetos**

- Tests: `grammar/veto.test.ts`: un perfil literal que dispara y otro que no por cada V1-V10 y V15; el caso v40 como test con nombre («una carrera de un día no muere en un puerto de 14 km»): 2.000 instancias de `ud_montana` en `alpes` → 0 con última cota > 4,2 km, 0 con `finalKindOf === 'alto'`.
- Código: `grammar/veto.ts`, `generateStage` completa (§4).

**Paso 6 · Identidad y temporada**

- Tests: `grammar/edition.test.ts` (§6.4); `season 0` reproduce byte a byte la salida de `generateStage` sin `ed`; `stagesForSeason(id, 0)` === `SEASON_CALENDAR` para toda carrera.
- Código: subflujos `arch`/`firma`/`ed`, `raceForSeason`, `stagesForSeason` memoizadas.

**Paso 7 · Composición**

- Tests: `calendar.test.ts` (las garantías actuales, l. 184-246, sin tocar) + `grammar/tour.test.ts`: reglas de bloque (V13, V14) sobre 120 semillas × n ∈ [3, 21] × 5 relieves; km por clase; `vu_corta` ≤ 1 crono; una gran vuelta generada de 21 con descansos y reina en [15, 20].
- Código: `grammar/tour.ts` (`TourSkeleton`, reparación de bloques), `kmDe`, `ARCH.pesosComposicion`.

**Paso 8 · El cambio de calendario** (`ENGINE_VERSION` 69 → 70)

- Tests primero: borrar `golden.test.ts`; reescribir `stageKind.test.ts` por esqueleto; `stageHistory.test.ts` re-sellado con la cifra nueva y su causa; `calendar.test.ts` l. 108-121, 162-174, 269-277 en verde; `calendario.test.ts` de §11.3 entero.
- Código: `buildRace`, `stagesFromEdition`, `nationalChampionships` llaman a `generateStage`; `CalendarStage.routeSource` y `arch`; retirar los ocho `xxxSegments` y `garantizaPuerto`; retirar `ROUTE.queen*` y `ROUTE.km*`; subir `ENGINE_VERSION`; actualizar el comentario de umbrales de `stageKind.ts`.
- `docs/balance.md`: nota «v61 §1 · El generador es una gramática» con la tabla antes/después de §11.3 medida sobre el calendario, las constantes nuevas y las retiradas, y la cifra re-sellada de `stageHistory`.

**Paso 9 · Remedición de bancos** (`test:bancos`)

- Congelar Colombia e5, Guatemala e9 y Tachira e6 como literales en `realQueens.ts`; remedir `calendarQueens` (12 semillas), `smallTours`, saturación, cronos, Jaén, Tramuntana, todo pareado; anotar cada cifra en `targets.ts` (y quitar la «mediana de 2.023» de l. 79-84) y en `balance.md` v61 §2. Recentrar solo con medida y con el dueño donde la banda era suya (§14).

**Paso 10 · Base y API**

- Tests: `recorridoDelMundo.test.ts` gana «dos temporadas, dos recorridos, un esqueleto»; `route_source` copiado; API expone `routeSource` y la frase de arquitectura.
- Código: `freezeRaceRoute(db, worldId, raceKey, raceId, season)`; `calendarRun.ts` l. 1603 pasa `season`; `apps/api/src/routes/calendar.ts` l. 97 lee la temporada del mundo; web: marca de origen y frase.

**Paso 11 · Documentación**

- `docs/generador.md` (este documento adaptado a lo implementado), SPEC §6.2 gana una línea («los perfiles sin dato los escribe una gramática de motivos, ver generador.md»), `motor.md` §10 actualiza las cifras, `inventario-recorridos.md` se regenera con `routeSource`.

Coste estimado: pasos 1-7 son código puro con tests de geometría (rápidos); el 8 es el único que rompe tests existentes y se hace en una sola tanda; el 9 es el caro (los bancos, 1-2 h de CI por corrida pareada). No hay migración de datos porque el mundo se reinicia; `backfillRaceRoutes` (`db/raceRoutes.ts` l. 91-109) sigue existiendo por si un mundo de pruebas sobrevive, y se corre **antes** del paso 8 como pide su comentario (l. 88-89).

---

## 13. Riesgos y lo que sacrifica

1. **Más azar de forma, más varianza en los bancos.** Un banco que hoy corre `race-sharjah` con 5 etapas conocidas pasa a correr un Sharjah con esqueleto `vu_corta` y motivos sorteados. Las listas cerradas por nombre (`smallTours`, `timeTrials`) pierden estabilidad de forma; el mapa 04 §3.3 ya avisa de que «conservan el nombre pero no la forma». Mitigación: el banco puede fijar `fixed.skeleton` y `season: 0`; y `realQueens` se congela como literales.
2. **La clasificación posterior (V6) puede costar reintentos** en esqueletos de borde (`et_media_alto` con cota de 7,9 km). Si el p95 de `intentos` supera 3 en el paso 4, se estrecha el rango (`cota.km[1]` a 7,5) antes que subir `maxIntentos`.
3. **La tabla geográfica es juicio, no dato.** Los rangos de §5.1 vienen del mapa 07, que se declara «orientativo». Un país mal puesto produce carreras raras en un sitio. Mitigación: los vetos V1-V4 impiden lo imposible; lo improbable se corrige editando datos, no código. Y `generico` es honesto para los 100 países de los que no se sabe nada.
4. **La geografía por país sigue siendo gruesa** para FR, IT, ES. `RaceRow.geo` la afina fila a fila, pero son 125 filas que alguien tiene que rellenar; hasta entonces se sortea entre las zonas del país.
5. **`tendida` como `llano`**: una subida de 20 km al 2,5 % no cuenta como `subida` para `breakAppeal` ni `gcTerrain` (mapa 03 §4.1). Es la decisión honesta con el motor de hoy, pero una vuelta de altiplano queda menos «de montaña» de lo que es. Si el motor gana tipado por pendiente (tactica R28.1(c)), la tendida se retipa sin tocar la gramática.
6. **El viento no se coloca**: `expuesto` se rinde como `llano` y el abanico puede caer en cualquier km (mapa 03 §5.1). El motivo existe en `arch` para que un motor futuro lea `arch.motivos` y sitúe el abanico; hoy no cambia nada en carrera. Se dice para que nadie crea que sí.
7. **Metas volantes**: siguen sin existir en lo generado (regla de la casa, `calendar.ts` l. 89-91). Un circuito real las tiene; se deja al dueño (§14).
8. **Lo que se retira**: los ocho generadores, `garantizaPuerto`, el 60/40 de desnivel, `queenFinalMix` como parámetro, `kmFlat`/`kmHilly`/`kmUphill`/`kmSummit`. Y la cifra 49 de `stageHistory.test.ts`. Todo con nota en `balance.md`.
9. **Coste de arranque**: 1.418 etapas con muestreo y vetos al cargar el módulo. Estimado < 1 s; si molesta, calendario perezoso por carrera (§4.8).
10. **Lo que NO resuelve**: no añade recorridos reales (E12); no valida contra fuentes externas (PCS vetado, mapa 05 §6); no cambia el motor (`rompepiernas` sigue muriendo en el muestreo, no hay altitud ni exposición); no reescribe el SPEC §6.17 (la banda 25-45 sobre `reina-150` es decisión del dueño, mapa 05 §11.1).

---

## 14. Decisiones que son del dueño

1. **`ud_montana_alto` (Ventoux, Mercan'Tour)**: ¿existe en el juego como rareza (peso 0,02 en .1) o no existe? El mapa 07 §1.2 cuenta tres carreras sobre doscientas.
2. **Cronoescalada y prólogo** (`et_cronoescalada`, `et_prologo`): ¿entran? Hoy `ittSegments` es una llana (`stageKind.ts` l. 66-69) y el banco de cronos está anclado en llano; una cronoescalada mueve `timeTrials.tailPct`.
3. **Critérium** (`ud_criterium`): ¿existe como carrera del calendario (con puntos) o no? El mapa 07 §1.7 aconseja tratarlo «como fiesta y no como carrera puntuable».
4. **Metas volantes generadas**: ¿se fabrican en circuitos y vueltas (una por vuelta, dos por etapa), o se mantiene la regla de no inventarlas? Cada una cuesta 2 de depósito y abre 5 km de alivio (mapa 03 §10.8): no es solo puntos.
5. **La banda de la fuga en montaña**: el 18,1 % era «está bien así» sobre el generador viejo. Con el nuevo el reparto de desnivel cambia (más reinas de 3.000+, cola baja como forma). ¿Se recentra `calendarQueens.breakawayWinPct` con la medida nueva, o se mantiene 6-30 como vigilancia?
6. **Variación entre ediciones para las vueltas de una semana**: ¿solo cambian las etapas de en medio (propuesto) o también puede cambiar la meta de la última etapa? En la realidad Paris-Nice acaba siempre en Niza; el Tour cambia todo.
7. **La firma de una .2**: ¿merece la pena que una .2 de Benín tenga identidad entre ediciones, o basta con que sea distinta cada año? Propuesto: identidad para todas (cuesta lo mismo), pero es una decisión de qué se le promete al jugador.
8. **`RaceRow.geo` para Francia, Italia y España**: ¿se rellena a mano en las 125 filas (una tarde de datos) o se acepta el sorteo por país hasta E12?
9. **`route_source` en la interfaz**: los tres textos propuestos en §10.2, y si la frase de arquitectura se enseña siempre o solo en la ficha de la etapa.
10. **`kmMaxPorClase`**: las cifras UCI del mapa 07 §4.1 vienen «a confirmar»; el dueño decide si se codifican con esos números o se dejan más holgadas hasta confirmarlas.
