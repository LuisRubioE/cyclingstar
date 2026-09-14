# Mapa 03: cómo el motor CONSUME un perfil (`packages/engine/src/stage/`)

Ficheros leídos enteros: `stage/types.ts` (486 l.), `stage/physics.ts` (807 l.), `stage/sample.ts` (154 l.), `stage/weather.ts` (112 l.), `db/raceRoutes.ts` (109 l.). De `stage/simulate.ts` (8.420 l.) se ha leído por grep todo lo que toca `block.*`, `blocks[*]`, `sampleProfile`, `banner`, `estrellas`, `viento`, `lluvia` y `calor`, más los tramos l. 425-540, 1140-1260, 1600-1720, 2390-2500, 2605-2665, 4735-4775, 5040-5130, 7085-7115, 7580-7620, 7825-7990. De `docs/motor.md` se han leído §3 (l. 84-122), §12 (l. 527-600), §19 (l. 1214-1318), §20 (l. 1320-1476) y V.3 (l. 1610-1616). De `packages/db` se han leído `schema.ts` l. 490-540 y 640-680, `stageRun.ts` l. 60-110, 140-175 y 385-520, `calendarRun.ts` l. 1592-1620. De las constantes, solo las perillas citadas, con su valor.

La pregunta del mapa es una sola: de todo lo que un autor de recorridos puede escribir en un `StageProfile`, ¿qué llega a la física y qué se queda en el camino? Y la respuesta corta es que el motor no ve el perfil: ve una lista de bloques de 100 m con cuatro campos, y todo lo demás lo deriva de esa lista.

---

## 0. Resumen

- El contrato de autoría son **cinco terrenos, tramos con pendiente, estrellas de pavés y banners** (`types.ts` l. 12-48). Nada más: no hay anchura de carretera, curvas, exposición al viento, altitud, temperatura por tramo ni tipo de asfalto distinto del pavés.
- `sampleProfile` (`sample.ts` l. 68-125) lo colapsa a `Block { g, tipo, estrellas, banner?, climbCategory? }` (`types.ts` l. 51-62), a razón de `round(km / 0.1)` bloques (`constants.ts` l. 1584: «Una etapa de 180 km son 1.800 bloques»). **El motor solo lee esos cinco campos.**
- Los cinco terrenos de autoría se reducen a **cuatro** físicos: `rompepiernas` pasa a `llano` con `g` fijo de 1,5 % (`sample.ts` l. 100-101 y `constants.ts` l. 1596), y si trae `tramos` **se ignoran**.
- Lo que de verdad cambia un resultado: la **pendiente** de cada bloque (velocidad, coste, rebufo, exponente de carga, peso MON/LLA, muro por COL), el **tipo** (selección, caídas, percances, abanico solo en llano, aproximación al pavés y a la cima), las **estrellas** del pavés (coste y descuelgue), la **posición de los banners** (puntos, coste de disputa y alivio del ritmo) y la **forma agregada** del recorrido (km de subida, demanda total, terreno del final), que se calcula una vez por etapa y mueve la táctica entera.
- El viento (§19) y el clima (§20) **no salen del perfil**: son un número por etapa sorteado de la semilla, y el clima además de `StageInput.lugar` (país y día). El perfil no tiene tramos expuestos; cualquier km de llano puede ser el del corte (`docs/motor.md` l. 1317-1318).
- Límites: no hay ninguno escrito ni sobre el número de segmentos ni sobre el de bloques. El coste es lineal en bloques × corredores; el comentario de `simulate.ts` l. 4757-4759 lo cifra en 176 corredores × 1.800 bloques y avisa de que dos evaluaciones de más por corredor y bloque costaron 715 s de batería (1.950 s → 2.665 s).
- El perfil de una etapa corrida vive **dos veces** en la base: congelado por carrera en `race_routes.profile` (`schema.ts` l. 507-527) y sellado dentro de `stage_snapshots.input` (`schema.ts` l. 655-663, `stageRun.ts` l. 496-503). Cambiar el generador solo mueve carreras futuras, con una excepción: las carreras creadas antes de la tabla y sin backfill caen al calendario (`calendarRun.ts` l. 1615).

---

## 1. El contrato de autoría (`types.ts` l. 11-48)

| Tipo             | Campos                                                           | Qué es                                                                                                           | Dónde se consume                                  |
| ---------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `SegmentTerrain` | `'llano' \| 'rompepiernas' \| 'puerto' \| 'descenso' \| 'paves'` | El terreno «tal como lo escribe el autor» (l. 11)                                                                | `blockTerrain()` `sample.ts` l. 32-44             |
| `Ramp`           | `km`, `g` (%)                                                    | Un tramo a pendiente media                                                                                       | `gradientAt()` `sample.ts` l. 47-57               |
| `Segment`        | `km`, `tipo`, `tramos?`, `estrellas?`                            | Segmento de autoría; «si trae `tramos`, la pendiente se muestrea de ellos; si no, se deriva del tipo» (l. 33-36) | `sampleProfile()`                                 |
| `Banner`         | `km`, `tipo: 'meta_volante' \| 'cima'`, `cat?`                   | Punto puntuable; `cat` es la categoría REAL «si el recorrido la trae del dato oficial; si no, se deriva» (l. 29) | `sample.ts` l. 110-122                            |
| `StageProfile`   | `segments`, `banners?`                                           | El recorrido entero                                                                                              | `simulate.ts` l. 1218-1219, `timetrial.ts` l. 222 |

Lo que no está en el contrato, y por tanto no puede afectar a nada: altitud absoluta, anchura, curvas, exposición al viento, firme mojado por tramos, túneles, sterrato como categoría propia (Strade Bianche se codifica como `paves` con estrellas, `classicRoutes.ts` l. 594), tipo de etapa (`stage.kind` «el motor ni siquiera recibe», `simulate.ts` l. 1708).

### 1.1 Lo que el bloque conserva (`types.ts` l. 51-62)

```
Block { g: %, tipo: 'llano'|'subida'|'descenso'|'paves', estrellas: 0..n, banner?: BannerType, climbCategory?: ClimbCategory }
```

Cuatro campos físicos y dos de puntuación. Esto es TODO lo que `simulate.ts`, `physics.ts`, `crash.ts`, `hazard.ts`, `mishap.ts` y `finish.ts` saben del recorrido.

---

## 2. El muestreo: de segmentos a bloques (`sample.ts`)

`sampleProfile(profile, dx = 0.1)` (l. 68-125), en orden:

1. `n = Math.round(totalKm / dx)` (l. 70). Los km de cada segmento se suman con decimales, pero el número de bloques se redondea: un recorrido de 180,04 km son 1.800 bloques, uno de 180,06 son 1.801. Un segmento de 40 m puede no tener ningún bloque cuyo centro caiga dentro y desaparecer.
2. Cada bloque `i` se evalúa en su **punto medio** `(i + 0.5)·dx` (l. 97) y se localiza el segmento por fronteras acumuladas con un recorrido lineal (l. 80-93): O(segmentos) por bloque, O(n·segmentos) en total, una sola vez por etapa.
3. Terreno: `puerto → subida`, `descenso → descenso`, `paves → paves`, `llano` y `rompepiernas → llano` (l. 32-44).
4. Pendiente (l. 100-101): **si el segmento es `rompepiernas`, `g = STAGE.rollingGradient` (1,5) aunque traiga tramos**; en cualquier otro caso `gradientAt`, que recorre los tramos acumulando `km` y devuelve el `g` del primero cuya cota acumulada supera el punto (l. 50-54); «el último tramo cubre la cola del segmento» (l. 55-56). Si los tramos suman MÁS que el `km` del segmento, la cola de tramos nunca se muestrea; si suman menos, el último se estira. Sin tramos: `llano 0, rompepiernas 1.5, puerto 6, descenso -6, paves 0` (l. 18-24).
5. Estrellas: solo si el segmento es `paves`, `segment.estrellas ?? 0`; en cualquier otro terreno, 0 (l. 105).
6. Banners (l. 110-122): cada uno cae en `floor(km / dx)` acotado a `[0, n-1]` (l. 111), así que un banner más allá de la meta se pega al último bloque y uno en el km 0 al primero. La asignación es `block.banner = banner.tipo` (l. 114): **dos banners en el mismo bloque de 100 m se pisan, se queda el último de la lista**. Para una `cima`, `climbCategory = banner.cat ?? (segment.tramos ? deriveClimbCategory(segment.tramos) : null)` (l. 119-120): sin `cat` y sin tramos la cima queda con categoría `null`, y `climbTable()` (`simulate.ts` l. 7969-7976) la puntúa como **cat4** (1 punto).

`deriveClimbCategory` (l. 131-143): `score = Σ km·g²` sobre los tramos con `g > 2` (`climbScoreMinGradient`), umbrales `cat4 40 · cat3 120 · cat2 300 · cat1 600 · HC 1000` (`constants.ts` l. 3946-3947). El propio fichero avisa: «solo alimenta puntos y relato, nunca la física» (l. 129). Ojo: se deriva de los tramos del SEGMENTO que contiene el km de la cima, no del puerto entero si el puerto se escribió en varios segmentos.

`isWall` (l. 146-154) existe y se exporta (`index.ts` l. 20) pero **`simulate.ts` no lo llama**: el muro se decide bloque a bloque por `block.g >= wallMinGradient` (8 %) en `riderPerfil` (`simulate.ts` l. 434), sin mirar la longitud total de la subida. Un puerto de 15 km al 9 % se sube entero con COL en vez de MON.

---

## 3. Qué lee la física de cada bloque (`physics.ts`)

| Función                                       | Lee                                    | Qué hace con ello                                                                                     | Líneas  |
| --------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------- |
| `climbWeight(g)`                              | `g`                                    | `w = clamp((g − 2) / 6, 0.15, 1)`: cuánto pesa MON frente a LLA                                       | 20-22   |
| `blockPerfil(eff, block, useCol)`             | `tipo`, `g`                            | subida: `w·MON(o COL) + (1−w)·LLA`; llano: LLA; pavés: `0.6·PAV + 0.4·LLA`; descenso: DES             | 28-42   |
| `vRef(g, tipo)`                               | `g`, `tipo`                            | subida hiperbólica `A/(g+k)` acotada; llano 42 km/h; pavés 38; descenso 55                            | 53-68   |
| `loadExponent(block)`                         | `tipo`, `g`                            | 0,39 fuera de subida; en subida sube hacia 1,0 con `g / p75ClimbFullGradient`                         | 102-106 |
| `relayPaceEdge(block, n)`                     | vía `draftMax`                         | lo que vale relevarse, a precio de rebufo del terreno                                                 | 139-143 |
| `targetSpeed(block, p75, c, n)`               | todo lo anterior                       | `vRef · (relPower · relayPaceEdge)^exp · rhythm(c)`                                                   | 181-190 |
| `accLimit(g, opts)`                           | `g`                                    | con `g <= −2` (`accGravGradient`) «la gravedad regala» aceleración                                    | 212-218 |
| `costBase(block)`                             | `tipo`, `g`, `estrellas`               | pavés: `0.55 + 0.06·estrellas`; `g <= −3`: suelo 0,10; entre −3 y 0: lerp; `g >= 0`: `0.24 + 0.135·g` | 239-249 |
| `draftMax(block)`                             | `tipo`, `g`                            | llano 0,42; descenso 0,25; pavés 0,18; subida `clamp(base − slope·g, min, 0.42)`                      | 252-267 |
| `droppedCommit(...)`                          | vía `draftMax`                         | el grupeto se resigna «a precio de rebufo»: en rampa no hay rueda                                     | 312-377 |
| `blockCost(block, c, pulling, n, dx, arropo)` | `costBase`, `draftMax`, `loadExponent` | el gasto del depósito por bloque                                                                      | 579-653 |
| `rhythmCostExponent(block)`                   | `loadExponent`                         | inverso de la ley: 2,56 en llano, 1 en rampa                                                          | 574-577 |

Todo lo que la física sabe del recorrido entra por `g`, `tipo` y `estrellas`. Ni `banner` ni `climbCategory` tocan una velocidad o un coste (lo dice `sample.ts` l. 3-4 y se confirma: `grep climbCategory physics.ts` = 0).

Consecuencia práctica para un diseñador: **la misma subida escrita como un tramo de 10 km al 6 % o como diez tramos de 1 km al 6 % da bloques idénticos**; lo que cambia el resultado es la distribución de `g` por bloque, no cómo se agrupe en tramos. Y un tramo de 300 m al 12 % dentro de un puerto al 5 % sí se nota: tres bloques con `vRef` más bajo, exponente más alto, `useCol` activo y `draftMax` menor.

---

## 4. Qué lee `simulate.ts` del bloque, y dónde

### 4.1 Antes del bucle (una vez por etapa)

| Cálculo                   | Fuente                                                                                                                                                                                                                                                                   | Efecto                                                                                                                                                                   | Líneas     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `blocks`, `totalKm`, `n`  | `sampleProfile`, `stageLengthKm`                                                                                                                                                                                                                                         | el reloj de la etapa                                                                                                                                                     | 1218-1220  |
| `kmToNextPaves[i]`        | `tipo === 'paves'`, pasada hacia atrás                                                                                                                                                                                                                                   | el pelotón no rueda a tempo en la aproximación a un sector (`pavesApproachKm` = 2)                                                                                       | 1628-1636  |
| `kmToNextSummit[i]`       | «una cima es el último bloque de subida de una racha»                                                                                                                                                                                                                    | aproximación a un puerto (guarda de `aproximacion`)                                                                                                                      | 1642-1650  |
| `finishTerrain`           | `deriveFinishTerrain(blocks)` (`finish.ts` l. 71-135): media de `g` en los últimos 5 km, última cota de los últimos 15 km con tolerancia de 5 bloques de respiro y mínimo de 0,4 km y 3 %, fracción de descenso de los últimos 3 km, fracción de pavés de los últimos 30 | el TIPO de final (`alto`, `puncheur`, `descenso`, `pave`, `sprint_*`, `solitario`) que decide los pesos del remate, si el pelotón puede llegar junto y el plan de equipo | 1655, 1661 |
| `demandaDelDia`           | `Σ costBase(b)·dx`                                                                                                                                                                                                                                                       | dosificación: por encima de `pacingReferenceDemand` (75) el pelotón sale más frío                                                                                        | 1690-1695  |
| `kmSubida`, `breakAppeal` | `Σ [tipo === 'subida']·dx`; `clamp(4·kmSubida/total + 0.35·[final en alto], 0, 1)`                                                                                                                                                                                       | cuánto merece la fuga, tamaño de la fuga                                                                                                                                 | 1696-1702  |
| `gcTerrain`               | `kmSubida/total >= 0.05`                                                                                                                                                                                                                                                 | ¿se juega la general hoy?                                                                                                                                                | 1710       |
| `shortMountain`           | `total < 145 && kmSubida/total > 0.5`                                                                                                                                                                                                                                    | suprime las fases `fuga` y `control`                                                                                                                                     | 1716-1719  |

Nótese que `kmSubida` cuenta **bloques de tipo `subida`**, no pendiente: un `rompepiernas` al 1,5 % o un `llano` con tramos al 4 % no cuentan como subida por muchos metros que ganen. Al revés, un `puerto` escrito con tramos al 1 % sí cuenta. **El tipo del segmento pesa en la táctica aunque la pendiente diga otra cosa.**

### 4.2 Dentro del bucle (`for i in 0..n`, l. 2395)

| Lectura                                          | Efecto                                                                                                                                                                                                         | Líneas                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `block.tipo === 'descenso'` al entrar            | marca `descentStartKm`; la bajada selecciona solo en su primer km (`descentSelectKm` = 1), o entera si la meta está a ≤ 25 km (`placement.descentFinalKmToGo`)                                                 | 2427-2428, 5083-5089              |
| `isFinal = n − i <= 20`                          | últimos 2 km: aceleración de sprint, caídas del embudo                                                                                                                                                         | 2429                              |
| `onClimb`, `onPaves`, `onRough`                  | terreno «del que no se vuelve»: sin reenganche mientras dure; el llano con viento también                                                                                                                      | 2477-2496                         |
| `raceThisClimb = totalKm − km <= 30`             | solo el puerto a ≤ 30 km de meta se sube «de verdad»; el resto a tempo (`climbTempoFraction` 0,5 vs `climbPaceFraction` 0,12)                                                                                  | 2497                              |
| entrada a pavés (`blocks[i−1].tipo !== 'paves'`) | peaje de colocación al entrar al sector                                                                                                                                                                        | 2611                              |
| entrada a descenso final                         | el equipo coloca a su jefe para bajar                                                                                                                                                                          | 2651-2655                         |
| `block.tipo === 'llano'`                         | único terreno donde existe el abanico (`enFila`, `gutterShelter`, `windRaceCommit`) y el acordeón                                                                                                              | 1215, 3898, 4191, 4340-4408       |
| `riderPerfil(m, block)`                          | perfil efectivo por bloque, muro con COL si `g >= 8`                                                                                                                                                           | 425-448                           |
| `selectionFactor(block, lluvia)`                 | subida 1 (deriva integrada, no dado); pavés `0.6·estrellas/3·(1 + 0.5·lluvia)`; descenso `0.08·(1 + lluvia)` si `g <= −4`, si no 0; **llano 0 siempre**                                                        | 474-518                           |
| deriva en subida                                 | `targetSpeed` del hombre contra la del grupo, mismo turno; se suelta al acumular `driftDropGapSeconds` = 20 s                                                                                                  | 5094-5130                         |
| `blockCost(block, …)·(1 + 0.08·calor)`           | gasto del depósito                                                                                                                                                                                             | 4745-4749                         |
| `crashLambda(block, isFinal, lluvia)`            | pavés 0,0025/km, descenso 0,0018, final 0,0008, resto 0,00005, ×(1 + 0,8·lluvia)                                                                                                                               | `crash.ts` l. 25-36               |
| `mishapLambda(terreno, lluvia, placement)`       | pinchazo/avería: `terrainFactor` llano 1, subida 1,2, descenso 1,5, **pavés 20**                                                                                                                               | 7094-7108, `constants.ts` l. 4389 |
| `block.banner === 'meta_volante'`                | solo el grupo de cabeza esprinta; puntúan los que tienen `contestSprints`; cuesta `bannerCost` = 2 a cada contendiente; `lastBannerKm` abre 5 km de alivio (`reliefKm`, `reliefDamp` 0,85, `reliefLambda` 1,8) | 7590-7597, 7825-7860, 1479-1484   |
| `block.banner === 'cima'`                        | puntúan por orden de coronación en TODA la carrera los que tienen `contestClimbs`; tabla por `climbCategory` (HC 20-15-12-10-8-6-4-2 … cat4 1)                                                                 | 7598-7607, 7923-7935, 7969-7976   |

### 4.3 Lo que la simulación NO lee del perfil

- **La longitud de un tramo o de un segmento como tal.** Solo existe a través de cuántos bloques produce.
- **El tipo `rompepiernas`.** Muere en el muestreo. Un autor que quiera «piernas rotas» de verdad tiene que escribir `llano` o `puerto` con tramos.
- **Los tramos de un `rompepiernas`.** Ignorados (`sample.ts` l. 100-101).
- **`Banner.cat`** fuera de la tabla de puntos: no cambia velocidad, selección ni táctica.
- **`isWall`**: no se llama.
- **La pendiente del llano para seleccionar**: `selectionFactor('llano')` = 0 con cualquier `g` (l. 517).
- **La pendiente de un descenso suave**: si `g > −4` no selecciona ni con lluvia (l. 494-496); el coste sigue bajando por `costBase` hasta el suelo en −3.
- **Exposición al viento, anchura, curvas**: no existen. §19.5: «Tampoco hay tramos expuestos en el perfil: cualquier kilómetro de llano puede ser el del corte, cuando en carretera el viento pega donde no hay setos» (`docs/motor.md` l. 1317-1318).
- **`stage.kind`** del calendario: no llega al motor (`simulate.ts` l. 1708). Solo lo usa `apps/api/src/stageHistory.ts` para etiquetar la ficha (l. 70-88, `runInAfterLastClimb` mira segmentos `puerto`).

---

## 5. Viento y clima: propiedades de la ETAPA, no del perfil

### 5.1 Viento (`docs/motor.md` §19, `simulate.ts` l. 1148-1200)

- Un número por etapa: `vientoBruto = rng('viento')^2.2`, y por debajo de `windMin` = 0,87 el día es normal (l. 1157-1160; `constants.ts` l. 3593, 3617). Medido: «6 de cada 100 llanas tienen viento de lado y 4 de cada 100 acaban partidas» (§19.1).
- `cabenEnFila = round(150 · (12/150)^lateral)` (l. 1168-1170): la capacidad de la carretera, de 150 a 12 hombres.
- Solo muerde en `block.tipo === 'llano'` (l. 1215, 2496, 3898, 4340-4408, 5325-5348). En subida, pavés y descenso el viento no existe. **Un perfil sin `llano` no puede tener abanicos**, y un perfil con 180 km de `llano` puede tenerlos en cualquier km.
- El corte (`echelon_split`) se sortea por km; el perfil no dice dónde. La previsión del §20.5 «anuncia lluvia y temperatura, no viento» (l. 1316).

### 5.2 Clima (`docs/motor.md` §20, `stage/weather.ts`)

- `stageWeather(seed, input.lugar)` (`weather.ts` l. 58-71): `lluvia` y `calor` en [0,1], derivados de `climateOf(pais, dia)` (nueve zonas, coseno anual) o de `CLIMA_REFERENCIA` si no hay `lugar`. `lugar` es `StageInput.lugar = { pais?, dia }` (`types.ts` l. 222-227), no parte del perfil.
- La lluvia escala lo que YA selecciona: pavés ×(1 + 0,5·lluvia), descenso ×(1 + lluvia), caídas ×(1 + 0,8·lluvia), percances (`rainGain` 0,6). «Un llano mojado sigue sin seleccionar» (§20.2).
- El calor multiplica el coste ×(1 + 0,08·calor) (l. 4747) y nada más: «no selecciona: DESGASTA» (§20.4).
- Ambos son constantes durante la etapa (§20.8). El perfil no puede decir «este puerto está a 2.000 m y hace frío»: no hay altitud.
- Producción no pasaba `lugar` hasta la v43 (§20.6): las etapas corridas antes tienen sellado el clima de referencia en su `StageInput`.

---

## 6. ¿Qué propiedades cambian de verdad el resultado?

Ordenadas por cuánto mueven, según las medidas citadas en el código y en `docs/motor.md`:

| Propiedad del perfil                             | Mecanismo                                                                                                           | Evidencia medida                                                                                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pendiente de los últimos 15 km** (última cota) | `deriveFinishTerrain` decide el tipo de final, los pesos del remate y si hay llegada agrupada (`admitsBunchFinish`) | Québec: 1 km al 3 % en meta pasó de dejar «el 1 % del pelotón en el tiempo del ganador y el décimo a 6:23» a `puncheur` con sprint (§12.5); una racha < 400 m ya no convierte una llana en final de escaladores (§12.1) |
| **Km de tipo `subida` sobre el total**           | `breakAppeal`, `gcTerrain`, `shortMountain`, `selectionFactor` 1 con deriva                                         | fuga de 3 en todos los terrenos → 15-50 en montaña (l. 1670-1680); `gcTerrainClimbShare` 0,05                                                                                                                           |
| **Puerto a ≤ 30 km de meta** (`climbRaceKmToGo`) | se sube a `climbPaceFraction` 0,12 y a tope; el resto a tempo 0,5                                                   | sin esto «ciclos de 170 → 15 → 173 corredores» en perfiles reales (l. 2462-2476)                                                                                                                                        |
| **Pendiente por bloque** en subida               | `vRef` hiperbólica, exponente hacia 1, `draftMax` mínimo, `useCol` si ≥ 8 %                                         | «los mismos diez puntos de perfil valen 0,4 s/km en el llano y 28 s/km en una rampa al 9 %» (l. 442-443)                                                                                                                |
| **Estrellas del pavés**                          | `costBase` y `selectionFactor` lineales en estrellas; `mishap` ×20                                                  | «un 5★ rompe casi el doble que un 3★» (l. 486); con lluvia parte el grupo                                                                                                                                               |
| **Demanda total** `Σ costBase·dx`                | dosificación de salida                                                                                              | Lombardía 102,2 · Strade 98,7 contra la llana 43,2 (l. 1686-1688); por encima de 75 se dosifica                                                                                                                         |
| **Descensos con `g <= −4`**                      | selección en el primer km, o entera a ≤ 25 km de meta; caídas ×36 sobre el llano                                    | Giro e17: 164 → 78 en 5 km de bajada antes de la v57 (l. 5062-5066)                                                                                                                                                     |
| **Posición de banners**                          | puntos, 2 de depósito por disputa, 5 km de alivio tras cada uno                                                     | «con tres sprints intermedios eso vaciaba medio depósito» antes del arreglo (l. 7850-7853)                                                                                                                              |
| **Longitud total**                               | número de bloques, `isFinal`, `lateAttackKm`, fases, demanda                                                        | directa                                                                                                                                                                                                                 |
| **Existencia de `llano`**                        | único terreno del abanico y del acordeón                                                                            | sin llano no hay viento que valga                                                                                                                                                                                       |

Y lo que **no** cambia nada: el nombre o número de segmentos, cómo se troceen los tramos, `Banner.cat` fuera de la tabla de puntos, `estrellas` fuera de `paves`, tramos de un `rompepiernas`, cualquier pendiente positiva escrita en un segmento `llano` a efectos de `kmSubida` (sí cambia velocidad y coste, no la táctica).

---

## 7. Límites de rendimiento

No hay ningún tope escrito: `grep -rn "segments.length >\|MAX_SEGMENTS\|maxSegments"` en `packages/engine/src/routes`, `packages/db/src` y `apps` no devuelve ninguna guarda; `sampleProfile` no valida `km <= 0`, tramos vacíos ni banners fuera de rango (los acota, l. 111).

Lo que se sabe del coste:

- `dx` es una constante fija de 0,1 km (`constants.ts` l. 1584) y la doctrina es de invariancia de resolución: el azar entra por `λ` (eventos/km) con `p = 1 − exp(−λ·dx)` (l. 1578) y las aceleraciones en km/h por segundo (`physics.ts` l. 221-223). Pero hay perillas contadas EN BLOQUES: `finalBlocks` 20 (l. 3961), `finishClimbGapBlocks` 5 (l. 3980), `coopReviewBlocks` 20 (l. 2276). Cambiar `dx` cambiaría esas ventanas en km. El comentario de `coopReviewBlocks` dice «Con `dx` = 50 m, veinte bloques son ese kilómetro» (l. 2273-2274), pero `dx` es 100 m: son dos km. Es una discrepancia entre comentario y valor, no un defecto del perfil.
- El bucle es O(bloques × corredores) con varias pasadas por bloque: `simulate.ts` l. 4757-4759, «este bucle corre para cada corredor en cada uno de los mil ochocientos bloques de una etapa. Preguntarlo también para el que va a rueda costaría trescientas mil llamadas por etapa», y el precedente medido, «el régimen de remate de la v39, que se fue de 1.950 s a 2.665 s de batería por dos evaluaciones de más».
- La sonda de la radio (una foto por km) «cuesta CERO (−1 % sobre una etapa reina de 176 corredores, dentro del ruido)» (`stageRun.ts` l. 429-431).
- Memoria por bloque: dos `Float64Array(n)` (l. 1628, 1642) y el array de `Block`. Para 300 km, 3.000 bloques: despreciable.
- Un perfil muy largo escala linealmente; un perfil con muchos segmentos solo encarece el muestreo, que es O(n·segmentos) y una vez. La contrarreloj (`timetrial.ts` l. 222, 257-273) muestrea igual y recorre los bloques por corredor sin grupos.

No se ha podido medir aquí (el repositorio no tiene `node_modules` instalado y no se debía tocar); los números anteriores son los que el código cita.

---

## 8. Dónde vive el perfil de una etapa corrida

Hay tres copias con tres papeles:

| Sitio                                                  | Qué guarda                                                                                                                                                                                         | Cuándo se escribe                                                                                                                 | Quién lo lee                                                                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `SEASON_CALENDAR[*].stages[*].profile` (código)        | el perfil generado al cargar el módulo (`routes/calendar.ts`, `routeRng` l. 547; `profileGen.ts` l. 30)                                                                                            | en cada arranque del proceso                                                                                                      | `freezeRaceRoute` y el fallback                                                                                                 |
| `race_routes.profile` JSONB (`schema.ts` l. 507-527)   | «exactamente el `StageProfile` que el motor recibe» (l. 509), clave `(world_id, race_key, stage_day)`, `route_source` `real`/`generado` (hoy todo entra como `generado`, `raceRoutes.ts` l. 48-51) | **el día de la etapa 1** de cada carrera, `calendarRun.ts` l. 1603; idempotente por `onConflictDoNothing` (`raceRoutes.ts` l. 54) | `getRaceRoute` l. 1604 → `profile: congelado ?? stage.profile` l. 1615                                                          |
| `stage_snapshots.input` JSONB (`schema.ts` l. 655-663) | el `StageInput` COMPLETO: `profile`, `riders` con eff0 ya con el día y el maillot aplicados, `lugar`, `race`, más `seed` y `engine_version`; y aparte `events` y `radio` congelados                | al correr la etapa, `stageRun.ts` l. 496-521, `onConflictDoNothing`                                                               | `apps/api/src/routes/admin.ts` l. 151 (`checkReplay`), `calendar.ts` l. 97 (`run?.profile ?? stage.profile` para la altimetría) |

La semilla es `${worldSeed}|${raceId}|${stageDay}|v${engineVersion}` (`stage/rng.ts` l. 22-24): **el perfil no entra en la semilla**. Dos perfiles distintos con la misma semilla tiran los mismos dados en los mismos subflujos; lo que cambia es contra qué se tiran.

`checkReplay(snapshotEngineVersion)` (`sim/raceRadio.ts` l. 49-55) solo compara `engineVersion === ENGINE_VERSION` (hoy 69, `constants.ts` l. 718). No compara el perfil: da por hecho que el `input` sellado es el que se corrió, que es verdad porque se guarda el objeto que se pasó a `simulateStage`.

---

## 9. ¿Qué pasa si el generador cambia después de sellar?

Casos, del más seguro al más frágil:

1. **Etapa ya corrida.** Su `stage_snapshots.input.profile` no se toca; `events` y `radio` están congelados «así siempre cuadra con el resultado guardado aunque cambie el motor» (`schema.ts` l. 660-661). Un replay solo es fiel si además `engine_version` coincide (`checkReplay`). El resultado, la general y la crónica no cambian.
2. **Carrera creada con `race_routes` ya escrita.** Todas sus etapas futuras leen la fila congelada (`calendarRun.ts` l. 1604-1615). El generador nuevo no la alcanza: «Cambiar el generador cambia las carreras FUTURAS, que es lo que tiene que pasar» (`schema.ts` l. 506-507).
3. **Carrera creada ANTES de que existiera la tabla y sin `backfillRaceRoutes`.** `getRaceRoute` devuelve `null` y la etapa corre con `stage.profile` del calendario del código (`calendarRun.ts` l. 1615). Si el generador cambió entre la etapa 3 y la 4, **la vuelta cambia de recorrido a mitad** y la crónica de la etapa 3 habla de un puerto que el generador ya no pone ahí. Es justo el defecto que la tabla existe para impedir (`raceRoutes.ts` l. 19-23 y 82-89). El backfill «se corre con el generador ACTUAL a propósito» (l. 88-89), así que hay que ejecutarlo ANTES de cambiar el generador.
4. **La ficha del calendario en la API.** `apps/api/src/routes/calendar.ts` l. 97 dibuja la altimetría con `run?.profile ?? stage.profile`: para etapas no corridas enseña el perfil del CÓDIGO de hoy, que puede no ser el que `race_routes` tiene congelado si el generador cambió en medio. Es una lectura del código, no una medida; conviene que quien toque el generador lo compruebe.
5. **`route_source`.** Hoy todo se congela como `generado` (`raceRoutes.ts` l. 48-51) porque el calendario no declara aún el origen; el campo existe para que el paso 1b marque `real` y una futura regeneración pueda saltarse los reales.

La regla que se deduce: **el sello de una etapa es el `StageInput` y la versión del motor, y el sello de una carrera es `race_routes`**. El generador es libre de cambiar entre carreras; lo único que no puede hacer nadie es reescribir esas dos tablas.

---

## 10. Hechos que un diseñador de perfiles debe tener delante

1. Escribe `puerto` para todo lo que quieras que cuente como subida en la táctica; un `llano` con tramos al 5 % sube igual de despacio pero no suma a `kmSubida` ni a `breakAppeal` (`simulate.ts` l. 1696).
2. No uses `rompepiernas` esperando que respete tramos: `g` = 1,5 fijo (`sample.ts` l. 100-101). Y a la táctica le parece llano.
3. Solo el último puerto a ≤ 30 km de meta se sube a tope (`climbRaceKmToGo`, l. 2497); los de antes se suben a tempo. Un perfil con la cota grande a 60 km de meta no rompe la carrera por la cota, y sí la puede romper la deriva acumulada si el ritmo de tempo aún deja a gente atrás.
4. Una racha de subida cuenta como «última cota» si mide ≥ 400 m y sus bloques van al ≥ 3 % (`finish.ts` l. 102, 110; `constants.ts` l. 3977, 3983); un respiro de hasta 5 bloques (500 m) no la parte (l. 116). Un final en `alto` necesita cota ≥ 3 km que muera en meta o últimos 3 km al ≥ 5 % (`docs/motor.md` §12.1).
5. Los descensos solo seleccionan con `g <= −4` (`constants.ts` l. 2784) y solo su primer km, salvo a ≤ 25 km de meta. Un descenso al −3 % es coste barato y nada más.
6. Las estrellas solo valen en `paves`; fuera de ahí se ponen a 0 (`sample.ts` l. 105). La referencia es 3★ (`dropPavesStarsReference`); 5★ casi dobla la selección.
7. Dos banners a menos de 100 m se pisan (`sample.ts` l. 114). Una cima sin `cat` y sin tramos en su segmento puntúa como cat4 (l. 119-120; `simulate.ts` l. 7975).
8. Cada banner cuesta 2 de depósito a quien lo disputa y abre 5 km de alivio del ritmo (`constants.ts` l. 3944, 4131-4134): muchas metas volantes seguidas cambian el ritmo del día, no solo los puntos.
9. El viento solo existe en `llano` y no se puede colocar; el clima sale de `lugar`, no del perfil. Si quieres «una clásica de viento», escribe llano; si quieres «un puerto con frío», hoy no se puede.
10. La longitud del perfil se redondea a bloques de 100 m (`sample.ts` l. 70); los km con más de un decimal se pierden.
11. El perfil no entra en la semilla (`rng.ts` l. 22-24): cambiar un tramo no «rebaraja» la etapa, cambia cómo se juegan los mismos dados.
12. Si se va a tocar el generador, primero `backfillRaceRoutes` sobre los mundos vivos (`raceRoutes.ts` l. 91-109); después, subir `ENGINE_VERSION` no hace falta por el perfil (el perfil no es el motor), pero la altimetría de la API para etapas no corridas leerá el código nuevo (`calendar.ts` l. 97).
