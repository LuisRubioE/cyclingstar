## 5. Los esqueletos por tipo y clase

### 5.1 Qué es un esqueleto y cómo se lee el catálogo

Un esqueleto es la arquitectura de una etapa antes del detalle: una lista de huecos (`Slot`) con motivo permitido, cardinalidad `n`, ventana de inicio y parámetros, más lo que la etapa PROMETE al resto del juego: el `kind` que `stageKindOf` tiene que devolver, el `finalKind` que `finalKindOf` tiene que devolver, una sola `meta`, un desnivel objetivo total y un rango bruto de kilómetros. Los tipos `Slot` y `Skeleton` son los de la sección 3 (El modelo de tipos) y no se repiten aquí; lo que esta sección escribe es el contenido de `SKELETONS` (`packages/engine/src/routes/grammar/skeletons.ts`), con sus pesos, sus plantillas canónicas, sus alternativas y la regla con la que se elige uno.

Cuatro reglas gobiernan todas las filas del catálogo, y cada una sale de una línea de código y no de un gusto:

1. **El `kind` declarado es el que `stageKindOf` devuelve** (`stageKind.ts` l. 72-97, mapa 01 §5.1), y V6 (sección 9) lo comprueba en cada intento. Las consecuencias sobre el catálogo son literales: cualquier segmento `puerto` excluye `llana` (l. 77-78: `climbs.length === 0` es la única puerta a `Flat`), así que un esqueleto `llana` solo lleva `enlace`, `expuesto` y `tendida` (tipada `llano`, sección 4); un segmento `paves` da `clasica / Cobbles` antes de mirar nada más (l. 75), así que todo esqueleto con `sector` lleva esa etiqueta aunque muera en un muro; una etapa que no muere arriba y cuya cota más larga mide ≤ `WALL_MAX_KM` 3 es `clasica / Classic` (l. 88), así que un esqueleto `media` sin final en alto necesita una cota de [3,3; 8,0] km (0,3 de `ARCH.veto.margenClaseKm` sobre 3 y 0,5 bajo `PASS_MIN_KM` 8,5); y una etapa cuya suma de metros de subida en segmentos `puerto` alcanza `QUEEN_MIN_CLIMB_METRES` 3.200 es `reina` aunque ninguna cota pase de 8,5 (l. 90), así que un esqueleto `media` mantiene sus dificultades por debajo de 2.900 m de subida (300 de margen) y lo hace la persecución del desnivel de la sección 8, que para `kind: 'media'` escala hacia abajo si `Σ km·g·10` de las dificultades supera 2.900.
2. **Una sola `meta` por esqueleto**, porque `Skeleton.meta: MetaKind` es un valor y no una lista, y porque `finalKind` y la etiqueta (`Summit finish` frente a `Mountains`, `Uphill finish` frente a `Hills`) dependen de si el último segmento es `puerto` (l. 85). Donde arquitectura §3.3 escribía «`esprint` o `repecho`» aquí se decide uno; `repecho` es una subida a la línea (tipada `puerto`, sección 4) y por tanto solo cabe en esqueletos `media / Uphill finish`.
3. **`dPlus` es total, relleno incluido** (`ARCH.reina.dPlusIncluyeRelleno`, decisión 9), estimado con `ARCH.reina.rellenoDplusPorKm` 5,5 m por km de `enlace` y verificado con `dPlusDe(profile)`. Por eso las cifras de las tablas son más bajas que los desniveles reales del mapa 07 en las carreras cuyo relieve real viene de bajadas onduladas y sectores en cuesta que el motor no ve: un `sector` se rinde como `paves` sin desnivel (arquitectura §3.1, l. 136) y una `tendida` suma en `dPlusDe` pero no en `climbMetres`.
4. **`km` es rango bruto**: el kilometraje real lo decide `kmDe` con `ARCH.km.porClase` (sección 7) para etapas de vuelta, y el sorteo `firma|raceId` sobre la fila `un día` de la misma tabla para carreras de un día sin `km` explícito (decisión 36); el esqueleto recorta ese sorteo a su rango (§5.7). Las 36 filas con `km` explícito y las 226 etapas de edición traen el `km` como contrato al 0,1 (V10).

Sobre el recuento: el índice y arquitectura §3.3 dicen «32 esqueletos (15 de un día, 17 de etapa)», pero la unión cerrada `SkeletonId` de la sección 3 tiene 15 identificadores `ud_*`/`nc_*` y 16 `et_*`, 31 en total. Este catálogo escribe los 31 de la unión y no inventa el que falta; el test de §5.9 sella que `Object.keys(SKELETONS)` es exactamente esa unión.

### 5.2 Los quince esqueletos de un día

Notación de la columna de motivos: `motivo×[min; max]@[a; b]` es un `Slot` con `n = [min, max]` y `ventana = [a, b]`; los parámetros entre paréntesis son `Slot.params`; `(firma)` es `Slot.firma: true`. Todo hueco con `n[0] = 0` es opcional y lo mueve la edición (`ARCH.edicion.motivoNuevo` 0,35). El `meta` no aparece como hueco: es el último motivo de todo esqueleto, siempre de firma, con el `MetaKind` de la columna «Meta». Los rangos que no se citan son los de `ARCH.motivo.*` recortados por la zona (sección 6).

| Id                  | kind / label                                                          | finalKind                             | Motivos                                                                                                                                                                                                                                 | Meta                                                                                                     | D+ total (m)   | Km bruto                                | `requiere`                       | pesoBase                                                                    | Referencia real (mapa 07)                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ud_esprint`        | llana / Flat                                                          | (ninguno)                             | `expuesto`×[1; 2]@[0,1; 0,8]; `tendida`×[0; 1]@[0,3; 0,7] (km [5; 10], g [1,5; 3])                                                                                                                                                      | `esprint`                                                                                                | [400; 1.500]   | [150; 240]                              |                                  | 30                                                                          | Brugge-De Panne, Scheldeprijs (§1.5). La «cota testimonial» es `tendida` y no `cota`: un `puerto` la sacaría de `llana` (regla 1)                                                           |
| `ud_esprint_capi`   | media / Hills                                                         | `valle_corto`                         | `cota`×[2; 3]@[0,7; 0,95] (km [3,3; 5,6], g [4; 5]; la última km [3,3; 4,2])                                                                                                                                                            | `esprint` a [5; 8] km de la última cota                                                                  | [1.200; 2.300] | [230; 295]                              | `cota`                           | 6                                                                           | Sanremo (§1.5). `stageKindOf` la llama `media` porque Poggio y Cipressa pasan de 3 km (banco §9.4.1): se declara así y no se toca el clasificador (decisión 26)                             |
| `ud_circuito`       | clasica / Classic                                                     | `cima_cerca`                          | `enlace`×[0; 1]@[0; 0,3]; `circuito`×1@[0,3; 1] (firma; vuelta [10; 18] km × [6; 16]) con hijos `muro`×[1; 2] (km [0,4; 2,5], g [8; 12])                                                                                                | `esprint` a [1; 4] km del último muro                                                                    | [1.800; 4.000] | [140; 275]                              | `muro`                           | 20                                                                          | Québec, Montréal, Japan Cup (§1.1). Todas sus cotas miden ≤ 2,5 km, luego `Classic` por la regla 1; Frankfurt con Feldberg es `ud_montana_media`                                            |
| `ud_muro_final`     | media / Uphill finish                                                 | `alto`                                | `cota`×[1; 3]@[0,3; 0,8] (km [2,5; 6]); `circuito`×[0; 1]@[0,55; 1] (vuelta [9; 30] × [2; 3]) que pasa por el muro                                                                                                                      | `muro_meta` (firma; km [0,5; 2,2], g [8; 16])                                                            | [1.500; 3.000] | [180; 215]                              | `muro`                           | 10                                                                          | Flèche (Huy ×3), Emilia (San Luca ×5), Nokere (§1.2). Muro > 1,0 km tipa `puncheur` (decisión 7)                                                                                            |
| `ud_muros`          | clasica / Classic                                                     | (varía: `cima_cerca` o `valle_corto`) | `enlace`@[0; 0,45]; `cadena`×[2; 4]@[0,45; 0,97], cada una con `muro`×[3; 8] (km [0,4; 2,5], g [8; 13]) y enlaces internos ≤ 5 km                                                                                                       | `esprint` a [1; 15] km del último muro                                                                   | [1.500; 3.500] | [180; 275]                              | `muro`                           | 25                                                                          | Ronde, Omloop, E3, Amstel, Brabantse (§1.3): 12 a 20 muros, los tres últimos en los últimos 30 km                                                                                           |
| `ud_muros_adoquin`  | clasica / Cobbles                                                     | (varía)                               | como `ud_muros` con `adoquin: true` en el 40 % a 70 % de los muros; `sector`×[2; 7]@[0,3; 0,9] (km [1; 2,5], ★[2; 3])                                                                                                                   | `esprint` a [1; 15] km                                                                                   | [1.500; 2.800] | [180; 275]                              | `adoquin ≥ 2`, `muro`            | 12                                                                          | Ronde, Omloop con sus sectores llanos (§1.3). Etiqueta `Cobbles` por la regla 1                                                                                                             |
| `ud_sterrato`       | clasica / Cobbles                                                     | `alto`                                | `cota`×[2; 4]@[0,15; 0,9] (km [2,5; 5], g [5; 7]); `racimo`×[2; 3]@[0,25; 0,9] de `sector` firme `tierra` (km [1; 3,7], ★[2; 3], separación [2; 5]); `muro`×[1; 3]@[0,5; 0,95] (km [0,4; 2], g [10; 16])                                | `muro_meta` (km [0,5; 1,0], g [12; 16])                                                                  | [1.600; 2.800] | [180; 215]                              | `sterrato`, `muro`               | 8                                                                           | Strade Bianche (§1.3). Monte Sante Marie (11,5 km) se escribe como tres sectores de 3,7 separados por 2 km; el desnivel real de 3.000 m no sale porque el sterrato es `paves` sin pendiente |
| `ud_adoquin`        | clasica / Cobbles                                                     | (ninguno)                             | `expuesto`@[0; 0,35]; `racimo`×[3; 6]@[0,35; 0,97] con [15; 30] sectores en total (km [0,3; 3,7], ★[1; 5]) y exactamente 3 de 5★ (firma)                                                                                                | `sector_meta` (sector [1; 2,5] km + [1; 8] km)                                                           | [600; 1.200]   | [200; 260]                              | `adoquin ≥ 2`                    | 10                                                                          | Roubaix (§1.4): 29 a 31 sectores, 54 a 57 km, Arenberg, Mons-en-Pévèle, Carrefour de l'Arbre                                                                                                |
| `ud_adoquin_ligero` | clasica / Cobbles                                                     | (varía)                               | `racimo`×[2; 3]@[0,3; 0,95] con [8; 14] sectores (km [0,8; 2,2], ★[2; 3]); `muro`×[0; 3]@[0,5; 0,97] (km [0,4; 1,5], g [8; 12])                                                                                                         | `esprint` a [2; 8] km                                                                                    | [800; 1.800]   | [170; 215]                              | `adoquin ≥ 1`                    | 8                                                                           | Denain, Le Samyn, Tro Bro Léon (§1.4)                                                                                                                                                       |
| `ud_montana`        | reina / Mountains                                                     | `valle_corto`                         | `enlace`@[0; 0,4]; `puerto`×[2; 3]@[0,4; 0,85] (el más largo, firma); `cota`×[1; 2]@[0,8; 0,97] (km [2,5; 4,2], g [6; 10])                                                                                                              | `descenso_meta` con `cotaFinal` de `ARCH.meta.unDiaUltimaCota` (km [1,3; 4,2], g [7; 11]) a [5,7; 17] km | [3.000; 4.600] | [200; 260]                              | `puerto`                         | 12                                                                          | Lombardía, Lieja, San Sebastián (§1.6, §4.3): es el caso v40 en positivo (V5)                                                                                                               |
| `ud_montana_media`  | media / Hills                                                         | `valle_corto`                         | `cota`×[3; 5]@[0,3; 0,95] (la primera km [3,3; 8,0]); `muro`×[0; 2]@[0,4; 0,9]                                                                                                                                                          | `descenso_meta` con `cotaFinal` (km [2,5; 4,2], g [6; 9]) a [5,7; 17] km                                 | [2.000; 3.200] | [170; 215]                              | `cota` con `cota.km[1] ≥ 3,3`    | 12                                                                          | Piemonte, Agostoni, Laigueglia, Frankfurt (§1.6, §1.1)                                                                                                                                      |
| `ud_montana_alto`   | reina / Summit finish                                                 | `alto`                                | `enlace`@[0; 0,6]; `puerto`×[0; 1]@[0,3; 0,6]                                                                                                                                                                                           | `alto_largo` (firma; km [13; 22], g [6; 7])                                                              | [2.500; 3.800] | [150; 185]                              | `puerto`, `finalesAlto: 'largo'` | 60 (× 0,02 por clase, §5.6)                                                 | Ventoux Dénivelé, Mercan'Tour (§1.2): tres carreras sobre doscientas. Rareza (decisión 37, D1)                                                                                              |
| `ud_criterium`      | llana / Flat                                                          | (ninguno)                             | `circuito`×1 (firma; vuelta [1,5; 3] km × [20; 40], hijos solo `enlace`; los `params` del hueco sobrescriben `ARCH.motivo.circuito`)                                                                                                    | `esprint`                                                                                                | [0; 300]       | [45; 100]                               |                                  | 1 (× 0 en todas las clases hasta D5)                                        | Critériums (§1.7): «fiesta y no carrera puntuable»                                                                                                                                          |
| `nc_ruta`           | media / Hills; en zonas sin `cota` ≥ 3,3 km, clasica / Classic (§5.7) | `cima_cerca`                          | `enlace`×[0; 1]@[0; 0,25]; `circuito`×1@[0,25; 1] (firma; vuelta [10; 20] × [8; 16]) con hijos `cota`×[0; 1] (km [3,3; 6], solo si la zona la admite), `muro`×[0; 2] (solo si `muro !== null`), `sector`×[0; 2] (solo si `adoquin ≥ 2`) | `esprint` a [1,2; 4,3] km del último paso                                                                | [1.800; 3.900] | [180; 240] (`ARCH.km.porClase.NC.ruta`) |                                  | 1 (único candidato de la ruta nacional)                                     | Campeonatos nacionales (mapa 07 §4.1, «siempre circuito»); la promesa de `motor.md` §V.3                                                                                                    |
| `nc_crono`          | cri / ITT                                                             | (ninguno)                             | `enlace`@[0; 1]; `cota`×[0; 1]@[0,3; 0,7] (km [2,5; 3], g [4; 5])                                                                                                                                                                       | `esprint`                                                                                                | [100; 500]     | [25; 45]                                |                                  | 1 (único candidato de la crono nacional y de la única fila `itt` de un día) | Crono nacional; Chrono des Nations                                                                                                                                                          |

Tres decisiones de esta tabla se apartan de arquitectura §3.3 y se dicen con su razón: `ud_esprint_capi` es `media` y `ud_circuito` es `clasica` (regla 1 de §5.1: con V6 como ley, el catálogo se pliega a `stageKindOf` y no al revés); `ud_muros_adoquin` y `ud_sterrato` llevan `Cobbles` (l. 75). Ninguna cambia el `kind` que el jugador ve respecto de lo que el clasificador diría de la misma etapa hoy.

### 5.3 Los dieciséis esqueletos de etapa

Las etapas de vuelta se piden por `StageRole` (sección 7) y no por terreno; la columna «Papel» dice qué papeles pueden pedir cada esqueleto. `Km bruto` es el rango de plausibilidad; el kilometraje lo pone `ARCH.km.porClase` (sección 7) y la etapa cabe por `normalizeEnlaces` (V10).

| Id                    | kind / label          | finalKind     | Papel                                                    | Motivos                                                                              | Meta                                                                           | D+ total (m)   | Km bruto   | `requiere`                                                         | pesoBase                           | Referencia                                                                                                                                         |
| --------------------- | --------------------- | ------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------- | ---------- | ------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `et_llana`            | llana / Flat          | (ninguno)     | `llana`                                                  | `tendida`×[0; 2]@[0,2; 0,7] (km [5; 12], g [1,5; 3])                                 | `esprint`                                                                      | [500; 1.500]   | [110; 230] |                                                                    | 30                                 | Llana de gran vuelta (§2.1): cat 4/3 como `tendida`, no como `cota` (regla 1)                                                                      |
| `et_llana_viento`     | llana / Flat          | (ninguno)     | `llana_viento`                                           | `expuesto`×[2; 3]@[0,3; 0,95]                                                        | `esprint`                                                                      | [300; 900]     | [110; 210] | `viento ≥ 2`                                                       | 12                                 | Pólder, desierto (§1.5, §2.2 UAE). El abanico sigue en `rng('viento')` (decisión 17)                                                               |
| `et_media_valle`      | media / Hills         | `valle_largo` | `media`                                                  | `cota`×[2; 4]@[0,25; 0,8] (la primera km [3,3; 8,0]); `muro`×[0; 2]@[0,4; 0,85]      | `valle` con `cotaFinal` (km [2,5; 8], g [4; 7]) a [20,7; 45] km                | [1.600; 3.200] | [120; 200] | `cota` con `cota.km[1] ≥ 3,3`                                      | 25                                 | Media montaña de fuga (§2.1): última a 20 a 40 km, como `hillySegments` hoy (mapa 01 §8: «tras última cota» de 26 a 68 km)                         |
| `et_media_alto`       | media / Uphill finish | `alto`        | `media_alto`                                             | `cota`×[1; 2]@[0,3; 0,8] (km [3,3; 8,0])                                             | `alto_corto` (firma; km [3; 7], g [6; 11])                                     | [1.600; 3.200] | [110; 190] | `cota`, `finalesAlto ≠ 'ninguno'`                                  | 20                                 | Arrate, Planche, Xorret, Willunga (§2.2, §4.3)                                                                                                     |
| `et_media_muro`       | media / Uphill finish | `alto`        | `media_muro`                                             | `cadena`×[1; 2]@[0,5; 0,95], cada una con `muro`×[3; 6] (km [0,4; 2], g [8; 14])     | `muro_meta` (firma; km [0,5; 2,2], g [8; 16])                                  | [1.500; 3.000] | [120; 200] | `muro`                                                             | 12                                 | Tirreno (Sant'Elpidio), Benelux (Muur), Itzulia (§2.2)                                                                                             |
| `et_media_tendida`    | media / Hills         | `valle_largo` | `media`                                                  | `tendida`×[1; 2]@[0,1; 0,6] (km [10; 30]); `cota`×[1; 2]@[0,4; 0,75] (km [3,3; 8,0]) | `valle` con `cotaFinal` (km [2,5; 6], g [4; 6]) a [20,7; 45] km                | [1.500; 2.500] | [120; 200] | `cota` y (`altitud ∈ {altiplano, media}` o `relieve = 'ondulado'`) | 8                                  | Meseta, altiplano andino, Anatolia (mapa 07 §3)                                                                                                    |
| `et_reina_alto_largo` | reina / Summit finish | `alto`        | `reina_alto`                                             | `enlace`@[0; 0,35]; `puerto`×[2; 3]@[0,3; 0,85], cada uno con `descenso` canónico    | `alto_largo` (firma; km [9; 22], g [6; 9], g ≤ 7 si > 17)                      | [3.500; 5.500] | [110; 200] | `puerto`, `finalesAlto: 'largo'`                                   | 20                                 | Alpe d'Huez, Beille, Angliru, Lagos (§4.3): el 70 % a 80 % de los finales en alto de gran vuelta                                                   |
| `et_reina_alto_corto` | reina / Summit finish | `alto`        | `reina_alto`                                             | `puerto`×[2; 3]@[0,3; 0,85] (al menos dos ≥ 9 km, por V8a)                           | `alto_corto` (firma; km [4; 7], g [8; 11])                                     | [2.600; 4.800] | [110; 190] | `puerto`, `finalesAlto ≠ 'ninguno'`                                | 12                                 | Planche, Xorret, Tre Cime por el último tramo (§4.3)                                                                                               |
| `et_reina_cima_cerca` | reina / Mountains     | `cima_cerca`  | `reina_valle`                                            | `puerto`×[2; 3]@[0,25; 0,8]                                                          | `cima_cerca` con `cotaFinal` puerto (km [9; 16], g [6; 9]) a [1,2; 4,3] km     | [3.000; 4.800] | [120; 200] | `puerto`                                                           | 10                                 | Livigno 2024, Tour e19 2024 Isola por la bajada corta (§2.1)                                                                                       |
| `et_reina_valle`      | reina / Mountains     | `valle_corto` | `reina_valle`                                            | `puerto`×[3; 4]@[0,2; 0,8], cada uno con `descenso`                                  | `descenso_meta` con `cotaFinal` puerto (km [9; 17], g [6; 9]) a [5,7; 19,3] km | [3.200; 5.000] | [130; 210] | `puerto`                                                           | 10                                 | «Montaña sin final en alto» (§2.1): 1 a 3 por gran vuelta                                                                                          |
| `et_reina_encadenada` | reina / Summit finish | `alto`        | `reina_encadenada`                                       | `puerto`×[3; 5]@[0,05; 0,85] con enlaces ≤ 6 km entre ellos                          | `alto_corto` (firma; km [4; 7], g [8; 11])                                     | [3.800; 5.500] | [110; 160] | `puerto`, `relieve: 'alta'`                                        | 6                                  | Dolomitas (Tre Cime), Pirineos encadenados (§2.1 regla 4)                                                                                          |
| `et_montana_corta`    | reina / Summit finish | `alto`        | `montana_corta`                                          | `puerto`×2@[0,08; 0,7] con enlaces ≤ 8 km entre puertos                              | `alto_largo` (firma; km [9; 22], g [6; 9])                                     | [3.000; 4.200] | [100; 140] | `puerto`, `finalesAlto: 'largo'`                                   | 6                                  | Montaña corta de Vuelta y Tour desde 2018 (§2.1 regla 5)                                                                                           |
| `et_reina_blanda`     | reina / Summit finish | `alto`        | cualquier `reina_*` (por `ARCH.reina.blandaShare`, §5.7) | `enlace`@[0; 0,6]; `cota`×[1; 2]@[0,15; 0,6] (km [5; 8], g [4; 7])                   | `alto_largo` (firma; km [9; 12], g [6; 7])                                     | [1.500; 2.500] | [130; 180] | `puerto`, `finalesAlto: 'largo'`                                   | 1 (no entra en el sorteo por peso) | Vuelta de una semana con un solo puerto (Fóia, Jebel Hafeet): la cola baja que `calendarQueens.test.ts` l. 62-63 exige, decidida aquí (decisión 8) |
| `et_crono`            | cri / ITT             | (ninguno)     | `cri`                                                    | `cota`×[0; 1]@[0,3; 0,7] (km [2,5; 3], g [4; 5])                                     | `esprint`                                                                      | [50; 400]      | [8; 45]    |                                                                    | 1                                  | CRI de 14 a 26 km (`ROUTE.itt*`) y de 30 a 35 (Dauphiné)                                                                                           |
| `et_prologo`          | cri / ITT             | (ninguno)     | `prologo`                                                | (solo `enlace`)                                                                      | `esprint`                                                                      | [0; 100]       | [3; 8]     |                                                                    | 1                                  | Romandía, Dauphiné, Suiza (§2.2); D3                                                                                                               |
| `et_cronoescalada`    | cri / ITT             | `alto`        | `cronoescalada`                                          | `enlace`×[0; 1]@[0; 0,4] (km [3; 10])                                                | `alto_largo` (firma; km [9; 15], g [6; 9])                                     | [500; 1.200]   | [12; 25]   | `puerto`, `finalesAlto: 'largo'`                                   | 1                                  | Peyragudes (Tour 2025 e13, 11 km); D3                                                                                                              |

`et_reina_blanda`, con los huecos exactos de la decisión 8: `enlace` en [0; 0,6]; `cota`×[1; 2] en [0,15; 0,6] de [5; 8] km; meta `alto_largo` de [9; 12] km al [6; 7] %; D+ total [1.500; 2.500] con relleno. Es `reina` por `PASS_MIN_KM` (el final mide ≥ 9), cumple V8b (≥ 25 % de la subida a más de 30 km de meta: sus cotas están en [0,15; 0,6]) y está exenta de V8a. El 60/40 de `ROUTE.queenHighDplusShare` y `queenLowDplusRange` se retiran (sección 12): la cola baja de desnivel ya no la sostiene un test sino este esqueleto con su cuota.

Los esqueletos `reina` de vuelta cumplen V8a por construcción: `et_reina_alto_largo`, `et_montana_corta` y `et_cronoescalada` con puerto de meta ≥ 9 km; `et_reina_alto_corto`, `et_reina_encadenada`, `et_reina_cima_cerca` y `et_reina_valle` con al menos dos puertos ≥ 9 km (la `cotaFinal` de `cima_cerca` y `descenso_meta` es uno de ellos). Los seis esqueletos `media` mantienen la cota más larga ≤ 8,0 km y la suma de subida ≤ 2.900 m (regla 1 de §5.1). Los `llana` cumplen V9 porque no llevan ningún `puerto`.

### 5.4 Las plantillas canónicas

`Skeleton.canonico` es un `Motif[]` literal, uno por esqueleto, que pasa todos los vetos por construcción: es lo que `generateStage` devuelve con `degradado: true` cuando agota `ARCH.colocacion.maxIntentos` 8 (sección 8), lo que la galería pinta primero (sección 16) y lo que `skeletons.test.ts` verifica con `verify` y `stageKindOf` sin RNG (§5.9). Los kilómetros suman exactamente la cifra del comentario, cada `descenso` mide `clamp(len·g·10/55, 2, 10)` redondeado al 0,1 (`ARCH.motivo.descenso.kmPorDesnivel`), y las `cotaFinal` respetan las holguras de 0,7 km sobre los cortes 5 y 20 de `FINAL_KIND_CUTS` (decisión 10). Los constructores `E`, `X`, `T`, `C`, `P`, `M`, `D`, `S`, `CAD`, `RAC`, `K` y `META` son funciones de una línea que devuelven un objeto `Motif` y existen solo para que el fichero quepa en una pantalla; el implementador puede inlinear los objetos.

```ts
// packages/engine/src/routes/grammar/skeletons.ts (fragmento: constructores y plantillas canónicas)
const E = (km: number): Motif => ({ kind: 'enlace', km })
const X = (km: number): Motif => ({ kind: 'expuesto', km })
const T = (km: number, g: number): Motif => ({ kind: 'tendida', km, g })
const C = (km: number, g: number): Motif => ({ kind: 'cota', km, g })
const P = (km: number, g: number, firma = false): Motif => ({
  kind: 'puerto',
  km,
  g,
  forma: 'regular',
  firma,
})
const M = (km: number, g: number, adoquin = false): Motif => ({ kind: 'muro', km, g, adoquin })
const D = (km: number): Motif => ({ kind: 'descenso', km, g: -5 })
const S = (
  km: number,
  estrellas: number,
  firme: 'adoquin' | 'tierra' = 'adoquin',
  firma = false,
): Motif => ({ kind: 'sector', km, estrellas, firme, firma })
const CAD = (hijos: Motif[]): Motif => ({
  kind: 'cadena',
  km: hijos.reduce((a, h) => a + h.km, 0),
  hijos,
})
const RAC = (hijos: Motif[]): Motif => ({
  kind: 'racimo',
  km: hijos.reduce((a, h) => a + h.km, 0),
  hijos,
})
const K = (kmVuelta: number, vueltas: number, hijos: Motif[]): Motif => ({
  kind: 'circuito',
  km: kmVuelta,
  vueltas,
  hijos,
  firma: true,
})
/** `km` del meta: en `cima_cerca`, `descenso_meta` y `valle` es `cotaFinal.km` + valle tras la cota; en `muro_meta` es `ARCH.meta.muro.aproxKm` 2 + `cotaFinal.km` (la aproximación va ANTES y la cota muere en la línea); en `alto_*` es `cotaFinal.km`; en `esprint` el llano final; en `sector_meta` sector + llano. */
const META = (meta: MetaKind, km: number, cotaFinal?: { km: number; g: number }): Motif => ({
  kind: 'meta',
  meta,
  km,
  cotaFinal,
  firma: true,
})

export const CANONICO: Record<SkeletonId, Motif[]> = {
  // ---- un día (15) ----
  ud_esprint: [E(40), X(50), E(20), T(6, 2.5), E(50), X(30), META('esprint', 4)], // 200 km
  ud_esprint_capi: [E(259.1), C(5.6, 4.1), D(4.2), E(12), C(3.7, 4), D(2.7), META('esprint', 2.7)], // 290 km; Poggio corona a 5,4
  ud_circuito: [
    E(5),
    K(12, 16, [E(5.4), M(0.4, 10), E(4.2), M(1.0, 8), E(1.0)]),
    META('esprint', 3),
  ], // 200 km; último muro a 4
  ud_muro_final: [
    E(108.3),
    C(4, 6),
    D(4.4),
    E(20),
    K(30, 2, [E(12), M(1.3, 9.6), E(8), C(3.5, 6), D(3.8), E(1.4)]),
    META('muro_meta', 3.3, { km: 1.3, g: 9.6 }),
  ], // 200 km; Huy ×3
  ud_muros: [
    E(132.4),
    CAD([M(1.0, 9), E(3), M(0.6, 11), E(4), M(2.2, 8), E(3), M(0.5, 12), E(5), M(0.8, 9)]),
    E(25),
    CAD([
      M(1.2, 10),
      E(2.5),
      M(0.4, 14),
      E(3),
      M(1.5, 9),
      E(4),
      M(0.9, 11),
      E(2),
      M(2.0, 8),
      E(3.5),
      M(0.7, 12),
    ]),
    E(20),
    CAD([M(1.1, 10), E(3), M(0.6, 13), E(2.5), M(2.2, 8), E(4), M(0.4, 13), E(3), M(1.0, 9)]),
    META('esprint', 13),
  ], // 250 km; 16 muros, último a 13
  ud_muros_adoquin: [
    E(132.7),
    S(1.5, 3),
    E(12),
    S(2.0, 3),
    E(20),
    CAD([
      M(2.2, 8, true),
      E(3),
      M(0.4, 13, true),
      E(4),
      M(0.6, 12, true),
      E(3.5),
      M(1.0, 9),
      E(4),
      M(0.5, 10),
    ]),
    E(18),
    S(1.2, 2),
    E(15),
    CAD([
      M(1.0, 9, true),
      E(3),
      M(0.8, 10),
      E(5),
      M(2.2, 8, true),
      E(3),
      M(0.4, 13, true),
      E(4),
      M(1.0, 8),
    ]),
    META('esprint', 13),
  ], // 255 km
  ud_sterrato: [
    E(67.4),
    C(4, 6),
    D(4.4),
    RAC([
      S(2.1, 3, 'tierra'),
      E(3),
      S(3.5, 3, 'tierra'),
      E(4),
      S(1.8, 2, 'tierra'),
      E(3),
      S(2.6, 3, 'tierra'),
    ]),
    E(15),
    C(3.5, 6),
    D(3.8),
    E(6),
    RAC([
      S(3.7, 3, 'tierra'),
      E(2),
      S(3.7, 3, 'tierra'),
      E(2),
      S(3.0, 3, 'tierra'),
      E(5),
      S(2.4, 2, 'tierra'),
      E(4),
      S(3.2, 3, 'tierra'),
    ]),
    E(10),
    C(5, 5.5),
    D(5),
    E(5),
    M(0.8, 12),
    E(6),
    RAC([
      S(2.5, 3, 'tierra'),
      E(3),
      S(1.1, 2, 'tierra'),
      E(4),
      S(3.0, 3, 'tierra'),
      E(2.5),
      S(1.5, 2, 'tierra'),
    ]),
    E(8),
    META('muro_meta', 2.5, { km: 0.5, g: 16 }),
  ], // 213 km; Santa Caterina
  ud_adoquin: [
    X(79.2),
    E(36),
    RAC([
      S(2.2, 3),
      E(4),
      S(2.4, 2),
      E(3),
      S(2.3, 5, 'adoquin', true),
      E(5),
      S(2.0, 2),
      E(4),
      S(3.0, 4),
      E(3),
      S(2.0, 2),
    ]),
    E(20),
    RAC([
      S(2.5, 3),
      E(3),
      S(1.8, 3),
      E(2),
      S(3.0, 5, 'adoquin', true),
      E(4),
      S(1.7, 2),
      E(3),
      S(2.4, 3),
      E(4),
      S(1.5, 2),
      E(3),
      S(2.7, 4),
    ]),
    E(24),
    RAC([
      S(1.4, 3),
      E(3),
      S(2.0, 3),
      E(4),
      S(1.9, 2),
      E(3),
      S(2.1, 5, 'adoquin', true),
      E(4),
      S(1.8, 3),
      E(5),
      S(1.0, 2),
    ]),
    META('sector_meta', 2.1),
  ], // 258 km; 20 sectores, 40,7 km
  ud_adoquin_ligero: [
    E(73.5),
    RAC([S(1.2, 2), E(3), S(0.8, 2), E(4), S(1.5, 3), E(3), S(1.0, 2)]),
    E(20),
    M(0.6, 9),
    E(15),
    RAC([S(1.8, 3), E(3), S(1.0, 2), E(4), S(2.2, 3), E(3), S(0.9, 2), E(4), S(1.4, 3)]),
    E(22),
    RAC([S(1.5, 3), E(3), S(1.1, 2), E(2.5), S(0.8, 2), E(3), S(1.3, 3)]),
    E(6),
    M(0.9, 10),
    E(4),
    META('esprint', 4),
  ], // 195 km; último muro a 8
  ud_montana: [
    E(93.2),
    P(9.0, 6.2),
    D(10),
    E(20),
    P(13, 6.6, true),
    D(10),
    E(25),
    C(4, 8),
    D(5.8),
    E(30),
    C(4.2, 9.7),
    D(7.4),
    E(5),
    META('descenso_meta', 8.4, { km: 2.7, g: 7.2 }),
  ], // 245 km; Como: Ghisallo (8,6 → 9,0), Sormano, Civiglio, San Fermo a 5,7
  ud_montana_media: [
    E(80.5),
    C(6, 6),
    D(6.5),
    E(20),
    C(4.5, 6.5),
    D(5.3),
    E(18),
    M(1.2, 10),
    E(12),
    C(5, 6),
    D(5.5),
    E(15),
    META('descenso_meta', 15.5, { km: 3.5, g: 8 }),
  ], // 195 km
  ud_montana_alto: [E(99.7), P(9, 6), D(9.8), E(30), META('alto_largo', 21.5, { km: 21.5, g: 7 })], // 170 km; Ventoux por Bédoin
  ud_criterium: [K(2.5, 22, [E(2.5)]), META('esprint', 5)], // 60 km
  nc_ruta: [
    E(15.5),
    K(16, 12, [E(2.5), C(3.5, 5), D(3.2), E(4.7), M(0.6, 8), E(1.5)]),
    META('esprint', 2.5),
  ], // 210 km; media: 2.676 m de subida < 2.900
  nc_crono: [E(20), C(2.5, 4), D(2), E(7.5), META('esprint', 3)], // 35 km
  // ---- etapa (16) ----
  et_llana: [E(60), T(8, 2.5), E(40), T(6, 2), E(62), META('esprint', 4)], // 180 km
  et_llana_viento: [E(50), X(40), E(15), X(35), E(10), X(17), META('esprint', 3)], // 170 km
  et_media_valle: [
    E(72),
    C(5, 6),
    D(5.5),
    E(20),
    C(7, 5.5),
    D(7),
    E(18),
    M(1.5, 9),
    E(10),
    META('valle', 29, { km: 4, g: 6.5 }),
  ], // 175 km; última a 25
  et_media_alto: [
    E(53.5),
    C(6, 5),
    D(5.5),
    E(44.5),
    C(8, 6),
    D(8.7),
    E(26.8),
    META('alto_corto', 7, { km: 7, g: 7 }),
  ], // 160 km; plantilla 4 del mapa 07 §5
  et_media_muro: [
    E(108.7),
    CAD([M(1.0, 10), E(3), M(0.7, 12), E(4), M(1.8, 8), E(3.5), M(0.5, 13)]),
    E(20),
    CAD([M(1.2, 9), E(3), M(0.6, 14), E(4.5), M(1.5, 9)]),
    E(8),
    META('muro_meta', 3.0, { km: 1.0, g: 12 }),
  ], // 165 km; muro de meta 1,0 → `muro`
  et_media_tendida: [
    E(47.5),
    T(20, 2.5),
    E(25),
    C(5, 5),
    D(4.5),
    E(20),
    T(12, 3),
    E(8),
    META('valle', 28, { km: 4, g: 5 }),
  ], // 170 km
  et_reina_alto_largo: [
    E(40),
    P(12, 7),
    D(10),
    E(28),
    P(17, 7.3),
    D(10),
    E(10),
    P(10, 7.8),
    D(10),
    E(12.2),
    META('alto_largo', 15.8, { km: 15.8, g: 7.9 }),
  ], // 175 km; plantilla 3 (Pirineos, 4.800 m)
  et_reina_alto_corto: [
    E(79.1),
    P(11, 7),
    D(10),
    E(20),
    P(14, 6.5),
    D(10),
    E(15),
    META('alto_corto', 5.9, { km: 5.9, g: 8.5 }),
  ], // 165 km; Planche
  et_reina_cima_cerca: [
    E(75),
    P(10, 7),
    D(10),
    E(22),
    P(13, 6.8),
    D(10),
    E(15),
    META('cima_cerca', 15, { km: 12, g: 7.5 }),
  ], // 170 km; cima a 3
  et_reina_valle: [
    E(57),
    P(9, 6.5),
    D(10),
    E(15),
    P(12, 7),
    D(10),
    E(15),
    P(10, 7.5),
    D(10),
    E(12),
    META('descenso_meta', 25, { km: 11, g: 7 }),
  ], // 185 km; cima a 14
  et_reina_encadenada: [
    E(18),
    P(14, 7.5),
    D(10),
    E(6),
    P(12, 8),
    D(10),
    E(6),
    P(16, 7),
    D(10),
    E(6),
    P(11, 8),
    D(10),
    E(4),
    META('alto_corto', 7, { km: 7, g: 8.5 }),
  ], // 140 km; Dolomitas
  et_montana_corta: [
    E(20),
    P(16, 7),
    D(10),
    E(8),
    P(20, 6.5),
    D(10),
    E(8),
    META('alto_largo', 18, { km: 18, g: 7 }),
  ], // 110 km
  et_reina_blanda: [
    E(72.4),
    C(6, 5.5),
    D(6),
    E(30),
    C(7, 6),
    D(7.6),
    E(20),
    META('alto_largo', 11, { km: 11, g: 6.5 }),
  ], // 160 km; 2.138 m con relleno
  et_crono: [E(15), C(2.5, 4), D(2), E(5.5), META('esprint', 3)], // 28 km
  et_prologo: [E(4), META('esprint', 2)], // 6 km
  et_cronoescalada: [E(7), META('alto_largo', 11, { km: 11, g: 7.5 })], // 18 km
}

/** `nc_ruta` en zonas sin cota ≥ 3,3 km (§5.7): mismo esqueleto con `kind: 'clasica'`, `label: 'Classic'`, `finalKind` sin declarar. */
export const NC_RUTA_CLASICA: Motif[] = [
  E(11),
  K(14, 14, [E(4), M(1.0, 9, true), E(5.5), M(0.5, 12), E(3.0)]),
  META('esprint', 3),
] // 210 km
```

Comprobaciones hechas a mano sobre estas plantillas, que el test de §5.9 repite: `ud_montana` tiene su cota más larga en 13 km (`reina`), no muere arriba (`Mountains`), su última cota mide 2,7 km y corona a 5,7 (V5, `valle_corto`); `nc_ruta` suma 2.676 m de subida en segmentos `puerto` (12 vueltas × 223 m), por debajo de 3.200 con 500 de margen, y su último muro corona a 4,0 km (`cima_cerca`, 1,0 de holgura sobre el corte 5); `et_media_alto` tiene su cota más larga en 8,0 (0,5 bajo `PASS_MIN_KM`) y 1.270 m de subida; `et_reina_alto_largo` acumula 4.109 m en puertos más 496 de relleno estimado (4.605 total, contra 4.800 de la plantilla 3 del mapa 07 §5) y tiene 39 de sus 54,8 km de subida a más de 30 km de meta (V8b); `et_reina_blanda` da 2.138 m con relleno, dentro de [1.500; 2.500]. Las concesiones al hueco [8,0; 9,0] se anotan en la propia línea (Ghisallo 8,6 → 9,0; Colle Aperto a 3 km → 5,7 en la alternativa de Bérgamo, porque `ARCH.meta.descensoMeta.valle` empieza en 5,7).

### 5.5 Alternativas declaradas (rotación de nivel 2)

`Skeleton.alternativas?: Motif[][]` es la rotación DECLARADA de `ARCH.edicion.nivel` 2 (decisión 22): la edición elige `[canonico, ...alternativas][season % (1 + alternativas.length)]` como instancia de partida y sobre ella aplica el jitter de nivel 1. Toda alternativa conserva `kind`, `label`, `meta` y `finalKind` del esqueleto (son identidad, decisión 20) y solo cambia los motivos no firma y los parámetros de la meta dentro del rango del `MetaKind`; `skeletons.test.ts` lo sella. Con el valor por defecto de D7 (`nivel` 1) las alternativas no rotan: existen, se validan y la galería las pinta, pero el calendario usa el `canonico`. Se declaran dos:

```ts
SKELETONS.ud_montana.alternativas = [
  // Bérgamo: Roncola, Valcava, Ganda; Colle Aperto (1,2 km al 7 %) a 5,7 km (real 3, subido al suelo de descensoMeta.valle)
  [
    E(115.8),
    P(9.4, 6.6),
    D(10),
    E(20),
    P(11.6, 8, true),
    D(10),
    E(20),
    P(9.2, 7.3),
    D(10),
    E(10),
    C(3.0, 7.5),
    D(4.1),
    E(10),
    META('descenso_meta', 6.9, { km: 1.2, g: 7 }),
  ], // 250 km
]
SKELETONS.et_reina_alto_largo.alternativas = [
  // Angliru: 12,5 km al 9 % (real 9,8; techo ARCH.meta.altoLargo.g)
  [
    E(40),
    P(12, 7),
    D(10),
    E(28),
    P(14, 7),
    D(10),
    E(22.5),
    P(10, 7.5),
    D(10),
    E(6.0),
    META('alto_largo', 12.5, { km: 12.5, g: 9 }),
  ], // 175 km
  // Lagos de Covadonga: 12,2 km al 7,2 %
  [
    E(40),
    P(12, 7),
    D(10),
    E(28),
    P(14, 7),
    D(10),
    E(22.5),
    P(10, 7.5),
    D(10),
    E(6.3),
    META('alto_largo', 12.2, { km: 12.2, g: 7.2 }),
  ], // 175 km
]
```

Los 29 esqueletos restantes no declaran alternativas: su variación entre ediciones es la de nivel 1 (motivos no firma, km ± 6 %, vueltas ± 1, motivo opcional y dibujo), que la sección 10 escribe.

### 5.6 Pesos: base, sesgo de terreno, clase y zona

El peso de un candidato es el producto de cuatro factores, y cada factor vive en un sitio distinto para que se pueda editar como dato:

`peso(id) = SKELETONS[id].pesoBase × SESGO_TERRENO[terrain][id] × ARCH.pesoPorClase[id][raceClass] × (geo.pesos[id] ?? 1)`

- **`pesoBase`** (columnas de §5.2 y §5.3): enteros, tomados de las columnas de pesos de banco §5.2 (`muros_encadenados` 0,55 en `flandes`, `montana_un_dia` 0,6 en `alpes`, `circuito_cotas` 0,3 a 0,6 donde no hay puertos) y de geografía §4.6 y §8 (`montana × un_dia × WT`: 0,9 / 0,08 / 0,02), normalizados a que el esqueleto más común de cada familia valga entre 20 y 30 y el raro entre 6 y 12. Son un juicio, como la tabla geográfica (decisión 16), y la galería (sección 16) es el instrumento para corregirlos.
- **`SESGO_TERRENO`**: la traducción de `RaceRow.terrain` (seis valores, `featureProfile.ts` l. 21; reparto de las 178 carreras de un día de tabla: hilly 83, flat 60, cobbles 19, mountain 10, classic 5, itt 1, mapa 02 §1) a candidatos de un día. Es sesgo y nunca orden (decisión de la sección 3): dice qué esqueletos entran en el sorteo y con qué multiplicador, y si la zona no admite ninguno (`requiere`), se baja un escalón. Solo aplica a `role: 'un_dia'`; las etapas de vuelta entran por `StageRole` (tabla de §5.7).

| `terrain`  | Candidatos (multiplicador)                                                                                          | Escalón si ninguno cabe en la zona                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `flat`     | `ud_esprint` ×1, `ud_esprint_capi` ×1, `ud_adoquin_ligero` ×0,5                                                     | (siempre cabe `ud_esprint`)                                                                                                   |
| `hilly`    | `ud_muros` ×1, `ud_circuito` ×1, `ud_muro_final` ×1, `ud_montana_media` ×1, `ud_muros_adoquin` ×1, `ud_sterrato` ×1 | `flat`                                                                                                                        |
| `classic`  | `ud_muros` ×1, `ud_muros_adoquin` ×1, `ud_circuito` ×0,5, `ud_muro_final` ×1, `ud_sterrato` ×1                      | `hilly`                                                                                                                       |
| `cobbles`  | `ud_adoquin` ×1, `ud_adoquin_ligero` ×1, `ud_muros_adoquin` ×1                                                      | `classic` (las 20 filas `cobbles` están en zonas con `adoquin ≥ 1`, mapa 07 §3: el escalón no se usa hoy y el test lo cuenta) |
| `mountain` | `ud_montana` ×4, `ud_montana_media` ×1, `ud_montana_alto` ×1, `ud_circuito` ×0,25                                   | `hilly` (un `mountain` en Dinamarca da `ud_circuito` con muros y se anota en `arch.frase`)                                    |
| `itt`      | `nc_crono` ×1                                                                                                       | (siempre cabe)                                                                                                                |

- **`ARCH.pesoPorClase`**: la tabla entera, esqueleto × clase (`RaceClass` de `uci.ts` l. 12: `WT`, `Pro`, `1`, `2`, `NC`). Un 0 es un veto de clase; los decimales son rarezas. `ud_montana_alto` vale 60 × 0,02 = 1,2 frente a 48 + 12 + 5 de sus compañeros de terreno `mountain` en .1, o sea el 1,8 % de esos sorteos, y con 10 filas `mountain` en todo el calendario lo esperado es que no aparezca ninguna: existe para la galería y para D1. Las columnas `NC` son 0 salvo `nc_ruta` y `nc_crono`, que son 0 fuera de `NC`: los 532 nacionales (mapa 02 §3) solo pueden salir de esos dos y ninguna carrera de equipos puede salir de ellos.

| Esqueleto                                                                                                                                                                       | WT  | Pro | .1   | .2   | NC  | Razón                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | ---- | ---- | --- | ---------------------------------------------------------------- |
| `ud_esprint`, `ud_circuito`, `ud_muros`, `ud_adoquin_ligero`, `ud_montana_media`                                                                                                | 1   | 1   | 1    | 1    | 0   | existen en todas las clases (mapa 07 §4.1)                       |
| `ud_esprint_capi`                                                                                                                                                               | 1   | 1   | 0,5  | 0,25 | 0   | Sanremo es de 290 km; una .2 no                                  |
| `ud_muro_final`, `ud_muros_adoquin`, `ud_montana`                                                                                                                               | 1   | 1   | 1    | 0,5  | 0   | en .2 la mitad de frecuentes: 140 a 180 km                       |
| `ud_sterrato`                                                                                                                                                                   | 1   | 1   | 0,5  | 0,25 | 0   | tres carreras reales                                             |
| `ud_adoquin`                                                                                                                                                                    | 1   | 1   | 0,5  | 0,5  | 0   | en .2 solo con `adoquin ≥ 2`, que ya exige `requiere` (§B.3)     |
| `ud_montana_alto`                                                                                                                                                               | 0   | 0   | 0,02 | 0    | 0   | decisión 37 y D1                                                 |
| `ud_criterium`                                                                                                                                                                  | 0   | 0   | 0    | 0    | 0   | D5 (peso 0 hasta decisión del dueño)                             |
| `nc_ruta`, `nc_crono`                                                                                                                                                           | 0   | 0   | 0    | 0    | 1   | solo campeonatos                                                 |
| `et_llana`, `et_llana_viento`, `et_media_valle`, `et_media_alto`, `et_media_tendida`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_blanda`, `et_crono`, `et_prologo` | 1   | 1   | 1    | 1    | 0   |                                                                  |
| `et_media_muro`, `et_reina_valle`                                                                                                                                               | 1   | 1   | 1    | 0,7  | 0   |                                                                  |
| `et_reina_alto_largo`, `et_montana_corta`                                                                                                                                       | 1   | 1   | 0,7  | 0,4  | 0   | los finales de 15 a 22 km son de gran vuelta y WT (mapa 07 §4.3) |
| `et_reina_encadenada`, `et_cronoescalada`                                                                                                                                       | 1   | 0,7 | 0,4  | 0    | 0   | Dolomitas y Peyragudes no bajan de Pro                           |

- **`geo.pesos`** (`GeoSignature.pesos`, sección 6): multiplicador por zona con 1 por defecto; los valores decididos son `flandes` {`ud_muros_adoquin`: 3, `ud_circuito`: 0,5}, `andes` {`et_reina_valle`: 2, `et_reina_alto_largo`: 1,5}, `italia_centro` {`ud_sterrato`: 2}, `francia_norte` {`ud_adoquin`: 2} (arquitectura §5.2 más dos filas que los pesos base solos no sostienen: sin ellas Strade saldría en Bretaña tanto como en Toscana).

### 5.7 Cómo se elige un esqueleto (subflujo `arch|raceId`)

Una sola tirada por carrera de un día y una por etapa de vuelta, todas sobre el mismo flujo `routeRng('arch|' + raceId)` consumido en orden de `stageIndex`, sin `season` (decisión 22): el esqueleto es identidad. El sorteo es proporcional a `peso(id)` de §5.6 sobre los candidatos, y los candidatos salen de esta función pura, que vive en `skeletons.ts` junto al catálogo:

```ts
export function candidatos(
  req: Pick<StageRequest, 'role' | 'terrain' | 'geo' | 'raceClass' | 'format' | 'km'>,
): { id: SkeletonId; peso: number }[] {
  const porPapel: Record<StageRole, SkeletonId[]> = {
    llana: ['et_llana'],
    llana_viento: ['et_llana_viento'],
    media: ['et_media_valle', 'et_media_tendida'],
    media_alto: ['et_media_alto'],
    media_muro: ['et_media_muro'],
    reina_alto: ['et_reina_alto_largo', 'et_reina_alto_corto'],
    reina_valle: ['et_reina_valle', 'et_reina_cima_cerca'],
    reina_encadenada: ['et_reina_encadenada'],
    montana_corta: ['et_montana_corta'],
    cri: ['et_crono'],
    prologo: ['et_prologo'],
    cronoescalada: ['et_cronoescalada'],
  }
  const escalon: Partial<Record<StageRole, StageRole>> = {
    llana_viento: 'llana',
    media_muro: 'media_alto',
    media_alto: 'media',
    reina_encadenada: 'reina_alto',
    montana_corta: 'reina_alto',
    reina_valle: 'reina_alto',
    reina_alto: 'media_alto',
    cronoescalada: 'cri',
  }
  const cabe = (id: SkeletonId) =>
    admite(req.geo, SKELETONS[id].requiere) && ARCH.pesoPorClase[id][req.raceClass] > 0
  if (req.role === 'un_dia') {
    let terrain: RouteTerrain = req.terrain
    for (;;) {
      const set = SESGO_TERRENO[terrain]
      const out = (Object.keys(set) as SkeletonId[])
        .filter(cabe)
        .map((id) => ({ id, peso: peso(id, terrain, req) }))
      if (out.length > 0) return out
      terrain = ESCALON_TERRENO[terrain] // cobbles → classic → hilly → flat; mountain → hilly; flat e itt no bajan
    }
  }
  let role = req.role
  for (;;) {
    const out = porPapel[role].filter(cabe).map((id) => ({ id, peso: peso(id, null, req) }))
    if (out.length > 0) return out
    role = escalon[role] ?? 'llana' // `llana` siempre cabe
  }
}
```

Tres reglas completan la elección:

1. **La reina blanda no compite por peso.** Si `role` empieza por `reina_` y `SKELETONS.et_reina_blanda` cabe en la zona, ANTES del sorteo por pesos se tira `rand() < ARCH.reina.blandaShare[geo.relieve]` (media 0,25; montana 0,25; alta 0,10; 0 en llano y ondulado, donde no hay reina) y si sale, el esqueleto es `et_reina_blanda`. Así la cuota es exactamente la de la decisión 8 y no depende de cuántos compañeros tenga el papel.
2. **`nc_ruta` decide su `kind` por la zona.** `skeletonFor(id, geo)` devuelve `SKELETONS[id]` salvo para `nc_ruta`, donde si `geo.cota === null || geo.cota.km[1] < 3.3` devuelve una copia con `kind: 'clasica'`, `label: 'Classic'`, `finalKind` sin declarar, el hueco `cota` con `n: [0, 0]` y `canonico: NC_RUTA_CLASICA`. Es la única excepción a «un `kind` por esqueleto» y existe porque los 133 campeonatos comparten un solo identificador para el circuito nacional: un nacional belga sale `Classic` con muros adoquinados y uno colombiano `Hills` con una cota de 5 km, que es la promesa de `motor.md` §V.3.
3. **El kilometraje se recorta al esqueleto.** Para `role: 'un_dia'` sin `km` de fila, `firma|raceId` sortea `kmClase = U(min, min + rango)` sobre la fila `un día` de `ARCH.km.porClase[raceClass]` (WT [200; 260], Pro [180; 230], .1 [170; 210], .2 [140; 180], NC ruta [180; 240], NC sub-23 [140; 180]) y la etapa mide `clamp(kmClase, sk.km[0], min(sk.km[1], ARCH.km.maxPorClase[raceClass]))`; si el recorte deja el rango vacío (una `ud_montana` de [200; 260] en una .2 de [140; 180]), manda el extremo más cercano del esqueleto (180 → 200) y `arch.frase` lo dice. Para etapas de vuelta el `km` viene hecho de `kmDe` (sección 7) y el esqueleto lo acepta tal cual: sus rangos brutos cubren todas las bandas de clase de sus papeles.

El resultado de este paso es `arch.skeleton` de `GeneratedStage`, fijo para siempre para esa carrera y etapa, y con él la `frase` de arquitectura empieza a escribirse (sección 8): «Clásica de muros en Flandes: 16 muros en tres cadenas, el último a 13 km».

### 5.8 Qué esqueleto recibe cada etapa de edición sin rasgos

Las 226 etapas de edición sin rasgos reales (mapa 02 §9: 22 WT, 110 Pro, 49 .1, 45 .2) pasan hoy por `stagesFromEdition → oneDaySpec → mountainOneDay` (`calendar.ts` l. 216-227 y 143-152) y salen dibujadas con la plantilla de un día: Colombia e5 de `REAL_QUEENS` es una clásica de montaña disfrazada de reina de vuelta (sección 1). Con la gramática reciben SIEMPRE un esqueleto de etapa, por `EditionTerrain` (`editions.ts` l. 10: cinco valores, sin `classic`), con `routeSource: 'edicion'`, `km` como contrato y zona de `RACE_REGION[raceId].stages[i]` (sección 6):

| `EditionTerrain` | Papel equivalente                                                  | Esqueletos candidatos (sorteo de §5.7 con la zona de la etapa)                                                                                                  | Nota                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flat`           | `llana`                                                            | `et_llana`; `et_llana_viento` si `viento ≥ 2` (sorteo con pesos 30 y 12)                                                                                        |                                                                                                                                                                                 |
| `hilly`          | `media` (con `media_alto` y `media_muro` como candidatos añadidos) | `et_media_valle` 25, `et_media_alto` 20, `et_media_muro` 12, `et_media_tendida` 8, filtrados por `requiere`                                                     | el papel de edición no distingue «acaba arriba»: se sortea, y el esqueleto queda fijo (identidad)                                                                               |
| `mountain`       | `reina_alto` ∪ `reina_valle` (más `et_reina_blanda` por cuota)     | `et_reina_alto_largo` 20, `et_reina_alto_corto` 12, `et_reina_cima_cerca` 10, `et_reina_valle` 10, `et_montana_corta` 6 si `km ≤ 140`; blanda con `blandaShare` | si la zona tiene `puerto === null` (una etapa `mountain` en `flandes`), cae a `et_media_alto` y se anota como degradación de geografía, nunca a `ud_montana`                    |
| `itt`            | `cri`; `prologo` si `km ≤ 8`                                       | `et_crono`; `et_prologo`                                                                                                                                        | nunca `et_cronoescalada`: el `km` es contrato y la edición no declara final en alto                                                                                             |
| `cobbles`        | (un día)                                                           | `ud_adoquin_ligero`                                                                                                                                             | las 4 etapas `cobbles` de edición (mapa 02 §7) son la única excepción a «esqueleto de etapa», porque no existe `et_adoquin` y el adoquín de etapa real es exactamente un Denain |

El reparto por terreno de las 226 no está medido en los mapas (mapa 02 §7 da el de las 384 etapas de edición: hilly 163, flat 95, mountain 95, itt 26, cobbles 4); `routeCensus` lo imprime en el paso 0 (sección 13) y `skeletons.test.ts` sella que ninguna etapa `edicion` recibe un `ud_*` salvo `cobbles → ud_adoquin_ligero`.

### 5.9 Tests de `grammar/skeletons.test.ts` (paso 4 del plan)

Se escriben antes que el catálogo y fallan hasta que existe. Corren en `test:rapido`; la parte de 60 semillas tarda segundos (≤ 12 motivos y ≤ 80 segmentos por etapa, sin `sampleProfile`, sección 14). `SKELETON_IDS` es la lista literal de la unión `SkeletonId`; `ZONA_DE_REFERENCIA` es una tabla del test con la zona de la columna «Referencia real» de cada esqueleto; `requestDePrueba`, `requestDe`, `requestDeFila`, `casos`, `semillas` y `p95` son auxiliares del propio fichero de test (construyen un `StageRequest` completo, con `fixed.skeleton` donde se indica), y `RACE_ROWS` es la tabla de `calendar.ts` l. 381-398 exportada para tests.

```ts
describe('catálogo', () => {
  it('tiene exactamente los identificadores de SkeletonId', () => {
    expect(Object.keys(SKELETONS).sort()).toEqual([...SKELETON_IDS].sort()) // 15 ud_/nc_ + 16 et_ = 31
  })
  it.each(Object.values(SKELETONS))('$id está bien formado', (sk) => {
    for (const s of sk.slots) {
      expect(s.n[0]).toBeLessThanOrEqual(s.n[1])
      expect(s.ventana[0]).toBeLessThanOrEqual(s.ventana[1])
      expect(s.ventana[0]).toBeGreaterThanOrEqual(0)
      expect(s.ventana[1]).toBeLessThanOrEqual(1)
    }
    expect(sk.dPlus[0]).toBeLessThan(sk.dPlus[1])
    expect(sk.km[0]).toBeLessThan(sk.km[1])
    expect(sk.pesoBase).toBeGreaterThan(0)
    if (sk.kind === 'llana')
      expect(sk.slots.every((s) => ['enlace', 'expuesto', 'tendida'].includes(s.motif))).toBe(true)
    if (sk.kind === 'media') expect(sk.dPlus[1]).toBeLessThanOrEqual(3200)
    expect(Object.keys(ARCH.pesoPorClase[sk.id])).toEqual(['WT', 'Pro', '1', '2', 'NC'])
  })
})

describe('plantilla canónica', () => {
  it.each(Object.values(SKELETONS))(
    '$id: pasa los vetos y da su kind y su finalKind sin RNG',
    (sk) => {
      const geo = ZONAS[ZONA_DE_REFERENCIA[sk.id]] // alpes para ud_montana, flandes para ud_muros_adoquin, italia_centro para ud_sterrato...
      const req = requestDePrueba(sk, geo) // km = Σ canonico, raceClass WT (NC para nc_*), format según el id
      const profile = renderSkeleton(sk.canonico, req)
      expect(Math.abs(profileKm(profile) - req.km)).toBeLessThan(0.05)
      expect(verify(profile, sk, req, sk.canonico)).toBeNull()
      expect(stageKindOf(profile, sk.kind === 'cri')).toEqual({ kind: sk.kind, label: sk.label })
      if (sk.finalKind) expect(finalKindOf(profile)).toBe(sk.finalKind)
      for (const alt of sk.alternativas ?? []) {
        const p2 = renderSkeleton(alt, {
          ...req,
          km: alt.reduce((a, m) => a + m.km * (m.vueltas ?? 1), 0),
        })
        expect(verify(p2, sk, req, alt)).toBeNull()
        expect(stageKindOf(p2, sk.kind === 'cri').kind).toBe(sk.kind)
        if (sk.finalKind) expect(finalKindOf(p2)).toBe(sk.finalKind)
      }
    },
  )
  it('nc_ruta en flandes es clasica / Classic con NC_RUTA_CLASICA', () => {
    const sk = skeletonFor('nc_ruta', ZONAS.flandes)
    expect(sk.kind).toBe('clasica')
    expect(sk.canonico).toBe(NC_RUTA_CLASICA)
    expect(
      stageKindOf(renderSkeleton(sk.canonico, requestDePrueba(sk, ZONAS.flandes)), false).label,
    ).toBe('Classic')
  })
})

describe('esqueleto × km × semillas × zonas compatibles (V6 y V7)', () => {
  // 5 km por esqueleto (los extremos y tres intermedios de sk.km), 60 semillas, todas las zonas donde admite(geo, requiere)
  it.each(casos())('$id en $zona con $km km', ({ sk, zona, km }) => {
    const salidas = semillas(60).map((s) =>
      generateStage(requestDe(sk, zona, km, s, { fixed: { skeleton: sk.id } })),
    )
    const degradadas = salidas.filter((g) => g.arch.degradado).length
    expect(degradadas / 60).toBeLessThanOrEqual(ARCH.veto.fallbackMaxShare.testPorEsqueleto) // 0,005 → 0 de 60
    expect(p95(salidas.map((g) => g.arch.intentos))).toBeLessThanOrEqual(ARCH.veto.intentosP95) // 3
    for (const g of salidas) {
      expect(g.kind).toBe(sk.kind)
      expect(g.label).toBe(sk.label) // V6
      if (sk.finalKind) expect(g.arch.finalKind).toBe(sk.finalKind) // V7
      expect(g.arch.dPlus).toBeGreaterThanOrEqual(sk.dPlus[0] * 0.9)
      expect(g.arch.dPlus).toBeLessThanOrEqual(sk.dPlus[1] * 1.1)
    }
  })
})

describe('candidatos y pesos', () => {
  it('nunca devuelve vacío para ninguna (terrain, zona, clase) del calendario', () => {
    for (const row of RACE_ROWS)
      for (const cls of RACE_CLASSES)
        expect(candidatos(requestDeFila(row, cls)).length).toBeGreaterThan(0)
  })
  it('mountain en una zona sin puerto baja a hilly y nunca da ud_montana', () => {
    const ids = candidatos({
      role: 'un_dia',
      terrain: 'mountain',
      geo: ZONAS.flandes,
      raceClass: 'Pro',
      format: 'un-dia',
      km: 200,
    }).map((c) => c.id)
    expect(ids).not.toContain('ud_montana')
    expect(ids).toContain('ud_muros')
  })
  it('ud_montana_alto pesa 60 × 0,02 y solo en .1', () => {
    expect(ARCH.pesoPorClase.ud_montana_alto).toEqual({ WT: 0, Pro: 0, '1': 0.02, '2': 0, NC: 0 })
  })
  it('las 20 filas cobbles no usan el escalón classic', () => {
    for (const row of RACE_ROWS.filter((r) => r.terrain === 'cobbles'))
      expect(candidatos(requestDeFila(row, row.class)).map((c) => c.id)).toContain(
        'ud_adoquin_ligero',
      )
  })
  it('un nacional solo sale de nc_ruta o nc_crono, y ninguna carrera de equipos sale de ellos', () => {
    for (const code of Object.keys(COUNTRIES)) {
      const ids = candidatos({
        role: 'un_dia',
        terrain: 'hilly',
        geo: ZONAS[zonaDe(code)],
        raceClass: 'NC',
        format: 'un-dia',
        km: 210,
      }).map((c) => c.id)
      expect(ids).toEqual(['nc_ruta'])
    }
    for (const cls of ['WT', 'Pro', '1', '2'] as const)
      expect(
        candidatos({
          role: 'un_dia',
          terrain: 'hilly',
          geo: ZONAS.ardenas,
          raceClass: cls,
          format: 'un-dia',
          km: 200,
        }).map((c) => c.id),
      ).not.toContain('nc_ruta')
  })
  it('la reina blanda sale con la cuota de ARCH.reina.blandaShare', () => {
    const n = 4000
    const blandas = semillas(n).filter(
      (s) =>
        generateStage(
          requestDe(SKELETONS.et_reina_alto_largo, 'pirineos', 160, s, { role: 'reina_alto' }),
        ).arch.skeleton === 'et_reina_blanda',
    ).length
    expect(blandas / n).toBeGreaterThan(0.07)
    expect(blandas / n).toBeLessThan(0.13) // alta: 0,10
  })
})

describe('etapas de edición', () => {
  it('reciben esqueletos de etapa, salvo cobbles → ud_adoquin_ligero', () => {
    for (const [id, ed] of Object.entries(RACE_EDITIONS))
      ed.stages.forEach((st, i) => {
        if (STAGE_FEATURES[id]?.[i]) return
        const g = stagesForSeason(id, BASE_SEASON)[i]
        expect(g.routeSource).toBe('edicion')
        if (st.terrain === 'cobbles') expect(g.arch.skeleton).toBe('ud_adoquin_ligero')
        else expect(g.arch.skeleton.startsWith('et_')).toBe(true)
        expect(Math.abs(profileKm(g.profile) - st.km)).toBeLessThan(0.05) // calendar.test.ts l. 162-174
      })
  })
  it('Colombia e5 de REAL_QUEENS ya no es una clásica de montaña', () => {
    const g = stagesForSeason('race-colombia', BASE_SEASON)[4]
    expect(g.arch.skeleton).toMatch(/^et_reina_/)
    expect(g.kind).toBe('reina')
  })
})
```

Lo que estos tests NO miden, a propósito: `finishType` (V16, solo en `routeCensus`, decisión 4), el reparto real de esqueletos en el calendario (bandas de variedad de la sección 13: ≥ 8 esqueletos distintos por clase en WT, entropía ≥ 1,5 bits por zona) y la plausibilidad de los pesos a ojo del dueño (galería, sección 16).
