# Mapa 02: el CALENDARIO y la identidad de las carreras (`packages/engine/src/routes/`)

Ficheros leídos enteros: `calendar.ts` (3.648 l., de las que unas 2.700 son tablas de datos), `editions.ts` (730 l.), `schedule.ts` (52 l.), `raceRoutes.ts` (1.175 l.), `classicRoutes.ts` (745 l.) y `uci.ts` (58 l.). Para las cifras se han parseado las tres tablas de `calendar.ts` y `RACE_EDITIONS` con un script propio (`scratchpad/e1/count.mjs`) y se han contrastado con `docs/inventario-recorridos.md` (generado por `scripts/inventario-recorridos.mjs`) y con `routes/calendar.test.ts`. Donde se cita una línea es de la versión actual del repositorio.

---

## 0. Resumen de la arquitectura

El calendario es UNA lista ordenada por día de arranque, `SEASON_CALENDAR` (calendar.ts l. 3643-3648), construida en el arranque del módulo a partir de cuatro fuentes:

```
WT_TABLE (33 filas)  ─┐
PRO_TABLE (61 filas)  ├─ buildRace(row)  ──►  CalendarRace            (calendar.ts l. 886-929)
CON_TABLE (213 filas) ┘        │
                               ├─ si RACE_EDITIONS[id] existe → stagesFromEdition (etapas reales, l. 216-231)
                               ├─ si no y stages ≤ 1        → oneDaySpec / featureSpec (l. 400-408, 196-214)
                               └─ si no                     → stageMix (vuelta compuesta, l. 546-561)
tres editionGrandTour(...)                                    (l. 233-253, 1231-1236)
COUNTRIES (133) × nationalChampionships → 532 .NC             (l. 316-367)
```

Todo es puro y determinista: la misma carrera compone siempre las mismas etapas y dibuja siempre el mismo perfil, porque cada sorteo va sembrado con el id de la carrera (`routeRng` en `profileGen.ts` l. 30-45, mulberry32 sobre FNV-1a). No hay estado, no hay temporada, no hay país en ninguna semilla.

Cifras medidas sobre la versión actual (script propio, coinciden con `inventario-recorridos.md` l. 20 y l. 28-36): **842 carreras** y **1.418 etapas**. De ellas, 310 carreras son de equipos (WT, Pro, .1, .2) con 886 etapas, y 532 son campeonatos nacionales de un día.

El comentario de cabecera de `calendar.ts` (l. 2) sigue diciendo «28 carreras»: está desactualizado en un orden de magnitud y conviene no fiarse de él.

---

## 1. `CalendarRace`: lo que es una carrera (calendar.ts l. 48-79)

| Campo                   | Tipo                            | Qué es                                                                                                                                                                                                                                        | De dónde sale                                                                               |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `id`                    | string                          | clave estable (`race-flanders`, `nc-es-road`). Es la SEMILLA de todo lo generado                                                                                                                                                              | fila de tabla o `nc-<cc>-<prueba>`                                                          |
| `name`                  | string                          | nombre neutro por geografía («Race Flanders», «Spain Road Championship»); la marca real solo aparece en `classicRoutes.ts::RouteSource.race`                                                                                                  | fila                                                                                        |
| `level`                 | `'WT' \| 'PRS' \| 'CON'`        | nivel de inscripción                                                                                                                                                                                                                          | derivado de `raceClass` en `buildRace` l. 888: WT→WT, Pro→PRS, resto→CON. Los .NC son `CON` |
| `raceClass`             | `RaceClass` (uci.ts l. 12)      | `.WT/.Pro/.1/.2/.NC`: prestigio y baremo de puntos                                                                                                                                                                                            | fila; `NC` en los campeonatos                                                               |
| `format`                | `gran-vuelta/una-semana/un-dia` | formato. `gran-vuelta` solo lo ponen las tres `editionGrandTour`; cualquier otra carrera por etapas, tenga 2 u 11 etapas, es `una-semana` (l. 906, 926)                                                                                       | `buildRace`                                                                                 |
| `startDay`              | number                          | día del año en que arranca (temporada = año no bisiesto, `doy` l. 373-375). El test exige 5..315 y orden creciente (calendar.test.ts l. 62-70). Medido: la primera carrera de tabla arranca el 9 de enero y la última el 30 de octubre        | `doy(row.m, row.d)`                                                                         |
| `openTo`                | `Division[]`                    | divisiones que pueden inscribirse. `enrollmentFor` (l. 82-86): WT→`['WT','PRS']`, PRS→`['WT','PRS','CON']`, CON→`['PRS','CON']`. **Vacío en los .NC**: pelotón individual                                                                     | `enrollmentFor(level)` o `[]`                                                               |
| `region?`               | `Continent`                     | solo en las continentales (.1/.2): preferencia a equipos del continente, unas plazas de wildcard fuera. Sin región = carrera global. Lo consume `selectFieldTeams` en `packages/db/src/calendarRun.ts` l. 284-300                             | fila (`region`)                                                                             |
| `championshipCountry?`  | ISO alpha-2                     | si está, la carrera es un campeonato nacional: el pelotón lo forman los mejores corredores de ese país, sin equipos. Lo lee `calendarRun.ts` l. 230-262 (filtra `riders.country`, cupo `NATIONAL_FIELD_CAP`, humanos del país siempre dentro) | `nationalChampionships`                                                                     |
| `championshipCategory?` | `'elite' \| 'u23'`              | el sub-23 filtra por edad `20 - birthSeason + season <= 23` (calendarRun.ts l. 248-249)                                                                                                                                                       | idem                                                                                        |
| `country?`              | ISO alpha-2                     | **país donde se disputa**: «base del sistema de viajes» (l. 69-72). Abstraído a UN país por carrera aunque el Tour 2026 salga de Barcelona y el Giro de Bulgaria                                                                              | `row.country ?? RACE_COUNTRY[row.id]` (l. 889); en los .NC es el propio código              |
| `stages`                | `CalendarStage[]`               | las etapas, cada una con `kind`, `label`, `profile` (segmentos + banners), `timeTrial?`, `index` y `name`                                                                                                                                     | ver §3, §4, §5                                                                              |
| `restAfter?`            | `number[]`                      | etapas tras las que hay descanso. Solo lo rellenan las ediciones: Tour `[9,15]`, Giro `[3,9,15]`, Vuelta `[9,15]`, Race Portugal `[6]`; las otras 56 ediciones llevan `[]` (editions.ts l. 27, 53, 79, 105)                                   | `edition.restAfter`                                                                         |

### Sobre `country`, que es lo que más importa a un diseñador

- Está declarado opcional en el tipo, pero `calendar.test.ts` l. 197-201 exige que **todas** las 842 carreras lo lleven y cumplan `^[A-Z]{2}$`. Medido: 0 carreras sin país.
- Las 213 filas continentales NO lo llevan en la fila (0 de 213 tienen `country` en `CON_TABLE`; la propiedad existe en `RaceRow` l. 388 pero nadie la usa): todas caen al mapa `RACE_COUNTRY` (l. 566-884), que tiene una entrada por cada una de las 310 carreras de equipos.
- El país llega, dentro del motor, solo a **tres sitios**, y los tres son el mismo dato: `stagePlace()` (schedule.ts l. 27-32) lo convierte en `{ pais, dia }` para el clima (`stage/weather.ts` l. 60 y 103: `climateOf(lugar.pais, lugar.dia)`), y `sim/scenarios.ts` l. 410 y `sim/grandTour.ts` l. 298 hacen la misma conversión a mano para los bancos. Fuera del motor lo lee `packages/db/src/riderSchedule.ts` (l. 124, 163, 223) para los días de viaje del corredor, y `calendarRun.ts` como `homeCountry` para poner primero a los equipos del país.
- **El país NO entra en ningún generador de recorrido.** Ver §6, donde se demuestra con las firmas.

### Terreno (`terrain`) y kilómetros (`km`) de la fila

Viven en `RaceRow` (l. 381-398), no en `CalendarRace`: una vez construida la carrera, el terreno «dominante» ya no existe como dato, solo queda en el `kind`/`label` de cada etapa. `terrain` es `RouteTerrain` (featureProfile.ts l. 21): `flat | hilly | mountain | cobbles | classic | itt`. Reparto medido de las 178 carreras de un día de tabla: hilly 83, flat 60, cobbles 19, mountain 10, classic 5, itt 1. De las 72 vueltas compuestas por `stageMix` (sin edición): hilly 37, mountain 19, flat 16. Solo 36 de las 178 carreras de un día declaran `km`; las otras 142 miden **210 km exactos** (`row.km ?? 210`, l. 917). Ojo: `terrain` ausente cae a `'flat'` (l. 916 y 928).

---

## 2. Las clases (`uci.ts`)

| Clase | `level` | prestigio | puntos al ganador (etapas / un día) | cuántas carreras |
| ----- | ------- | --------: | ----------------------------------: | ---------------: |
| .WT   | WT      |       100 |                           500 / 500 |               36 |
| .Pro  | PRS     |        50 |                           200 / 200 |               61 |
| .1    | CON     |        25 |                           125 / 125 |              101 |
| .2    | CON     |        12 |                             80 / 80 |              112 |
| .NC   | CON     |        40 |                           100 / 100 |              532 |

`RACE_CLASS_INFO` (uci.ts l. 31-37). Dos cosas que no son obvias: el .NC pesa más que un .1 (40 frente a 25) aunque su nivel de inscripción sea `CON`; y la curva por posición (`POSITION_FRACTION`, l. 44-48, 40 puestos, 2.º al 70 %, 3.º al 52 %) es la misma para todas las clases y formatos, solo cambia el tope del ganador. `racePoints(cls, position, stageRace)` (l. 51-55) es lo único que calcula.

Por formato (medido): 3 grandes vueltas, 129 «una-semana» (WT 15, Pro 27, .1 35, .2 52) y 178 de un día de tabla (WT 18, Pro 34, .1 66, .2 60), más las 532 .NC. Distribución de etapas de las 132 vueltas: 1 etapa (3, ver §4.3), 2 (1), 3 (15), 4 (30), 5 (49), 6 (11), 7 (5), 8 (10), 9 (2), 10 (2), 11 (1), 21 (3).

---

## 3. Los campeonatos nacionales (calendar.ts l. 255-367)

`COUNTRIES` (`packages/shared/src/countries.ts`, 133 países) × `nationalChampionships(code, name)` = 532 carreras, exactamente 4 por país (calendar.test.ts l. 9-16 y l. 47-60): `nc-xx-itt` (38 km, `itt`), `nc-xx-u23-itt` (30 km), `nc-xx-u23-road` (180 km, `classic`) y `nc-xx-road` (220 km, `classic`). Todas iguales salvo la semilla: el perfil de la ruta de España y el de la de Ruanda salen del mismo constructor `classic(220, id)` con distinto id. **Ningún campeonato tiene recorrido real** (inventario: NC 532 etapas, 532 inventadas).

Fechas: la ruta Elite cae el 28 de junio (`NATIONALS_ROAD_DAY`, l. 263) salvo 22 países con fecha propia en `NATIONALS_ROAD_OVERRIDE` (l. 270-293: Australia 11 ene, Colombia 8 feb, Malasia 13 sep…). La semana se reparte con uno de tres patrones elegidos por `ncHash(code) % 3` (l. 322-331): crono Elite miércoles o jueves, crono sub-23 jueves, ruta sub-23 sábado o domingo. Es determinista por código de país, no por temporada.

---

## 4. Cómo se compone una vuelta por etapas generada: `stageMix` (l. 410-561)

Solo pasa por aquí una carrera **sin edición** y con `stages > 1`: 72 de las 132 vueltas (`buildRace` l. 926-929). Firma: `stageMix(n: number, terrain: Terrain, seedBase: string): StageSpec[]`, con `seedBase = row.id`.

### 4.1 Reducción del terreno

`mixTerrain` (l. 416-420) reduce los seis terrenos a tres `MixTerrain`: `mountain`→mountain, `hilly` y `classic`→hilly, todo lo demás (`flat`, `cobbles`, `itt`)→flat. Una vuelta «de adoquines» no existe como tal: se compone como llana.

### 4.2 Los papeles (`MixRole`, l. 413) y el orden en que se deciden (`mixRoles`, l. 457-519)

Cinco papeles: `llana`, `media`, `media-alto` (media montaña que muere arriba), `reina`, `cri`. El comentario de l. 445-455 explica el orden «como lo decide un organizador»:

1. **La crono.** Requiere `n >= ROUTE.ittMinStages` (3). La lleva SIEMPRE una vuelta llana de 4+ etapas (`ittAlwaysFlatStages`), y si no, con probabilidad 0,6 (3-5 etapas) o 0,9 (6+). Cae en la penúltima etapa, o en la antepenúltima con probabilidad 0,35. A partir de 15 etapas hay una segunda crono en la posición `round(0.35·n)`. Constantes en `constants.ts::ROUTE` l. 1190-1210.
2. **La última etapa.** Decisiva (acaba arriba) con probabilidad `lastDecisiveChance` = flat 0,3 / hilly 0,55 / mountain 0,85, multiplicada por 0,4 si `n >= 15`. Si es decisiva, es `reina` con `lastSummitShare` (flat 0, hilly 0,35, mountain 0,8) y si no `media-alto`.
3. **Las de en medio**, sorteadas con `pickRole` sobre `ROUTE.mixWeights` [llana, media, media-alto, reina]: flat `[0.58, 0.27, 0.10, 0.05]`, hilly `[0.30, 0.36, 0.19, 0.15]`, mountain `[0.16, 0.26, 0.18, 0.40]`.
4. **Las garantías.** Mínimo de etapas selectivas `ceil(selectiveMinFraction[terrain] · n)` (0,35 / 0,55 / 0,7), endureciendo huecos de atrás hacia delante y tocando la última solo si no queda otro; al menos un final en alto si `n >= 4` (`uphillFinishMinStages`); y la garantía de fondo (l. 511-517): ninguna vuelta se queda sin crono ni final en alto.

La primera etapa es siempre `llana` (nunca se toca: los `slots` van de `n-2` a 1, l. 493). `calendar.test.ts` l. 214-266 comprueba estas garantías con 120 semillas.

### 4.3 Kilómetros y constructores

`mixKm` (l. 522-543): crono 14+12·u km (26+18·u si `n >= 10`); llana 165+30·u, media 160+30·u, media-alto 150+30·u, reina 145+35·u; la última etapa se multiplica por 0,85. Después `stageMix` (l. 549-560) traduce papel a constructor: `cri`→`itt`, `reina`→`mountain` (final en alto, `mountainSegments`), `media-alto`→`hillyUphill`, `media`→`hilly`, `llana`→`flat`, cada uno con semilla `${row.id}|${i}`.

Una consecuencia curiosa: las tres ediciones de un día de `editions.ts` (`race-bruges`, `race-copenhagen`, `race-brittany`, l. 718-729) entran por la rama de edición (l. 899-906) y salen con `format: 'una-semana'` y una sola etapa. Son las tres vueltas «de 1 etapa» de la distribución del §2. El inventario y el resto del código las tratan bien porque miran `stages.length`, pero el `format` miente.

---

## 5. La carrera de un día: `oneDaySpec` y `featureSpec` (l. 196-214, 400-408)

`oneDaySpec(terrain, km, seed)` es un `switch` por terreno hacia los constructores de l. 108-172: `cobbles`→`cobbles` (kind `clasica`, «Cobbles»), `classic`→`classic` (`clasica`, «Classic»), `mountain`→`mountainOneDay` (`reina`, «Mountains», corona antes de meta, v40), `hilly`→`hilly` (`media`, «Hills»), `itt`→`itt` (`cri`), resto→`flat`. La semilla es `row.id` para una carrera de un día de tabla y `${from}|${to}|${km}` para una etapa de edición (l. 224).

Si `STAGE_FEATURES[row.id]?.[0]` existe, se usa `featureSpec(terrain, km, features, seed)` (l. 196-214): mismo `kind`/`label` por `TERRAIN_KIND` (l. 183-190) pero el perfil lo construye `buildFeatureProfile(km, features, seed, terrain)` con los puertos y sectores reales. Aquí el terreno solo regula la amplitud del ondulado entre dificultades (featureProfile.ts l. 359-360).

---

## 6. Demostración: el país no llega al generador

Firmas leídas, en orden de llamada:

```ts
// calendar.ts
function buildRace(row: RaceRow): CalendarRace // l. 886
function oneDaySpec(terrain: Terrain, km: number, seed: string): StageSpec // l. 400
function featureSpec(terrain: Terrain, km: number, features: StageFeatures, seed: string): StageSpec // l. 196
export function stageMix(n: number, terrain: Terrain, seedBase: string): StageSpec[] // l. 546
function mixRoles(n: number, terrain: MixTerrain, rand: () => number): MixRole[] // l. 457
function stagesFromEdition(id: string, edition: RaceEdition): CalendarStage[] // l. 216
// profileGen.ts
export function routeRng(seed: string): () => number // l. 30
export function flatSegments(km: number, seed: string): Segment[] // l. 236
export function hillySegments(km: number, seed: string): Segment[] // l. 243
export function hillyUphillSegments(km: number, seed: string): Segment[] // l. 269
export function mountainSegments(km: number, seed: string, opts: MountainOptions = {}): Segment[] // l. 337
export function mountainClassicSegments(km: number, seed: string): Segment[] // l. 443
export function classicSegments(km: number, seed: string): Segment[] // l. 473
export function cobblesSegments(km: number, seed: string): Segment[] // l. 493
export function ittSegments(km: number, seed: string): Segment[] // l. 510
// featureProfile.ts
export function buildFeatureProfile(
  totalKm: number,
  features: StageFeatures,
  seed: string,
  terrain?: RouteTerrain,
): StageProfile // l. 362
```

Ninguna recibe `country`, `region` ni nada geográfico: entran kilómetros, terreno (uno de seis valores) y una semilla de texto. En `buildRace` el país se calcula en l. 889 y se copia a `common` (l. 898), y de ahí solo va al objeto resultado; las tres ramas de construcción de etapas (l. 899-929) le pasan al generador `row.stages`, `row.terrain`, `row.km` y `row.id`. La semilla es el id, y el id es un nombre (`race-flanders`), no un país: dos carreras belgas y una francesa con el mismo terreno se distinguen solo por el hash de su id. Además, `RaceEdition` y `EditionStage` (editions.ts l. 10-22) tampoco llevan país: `from`, `to`, `km`, `terrain`.

Para el diseñador: hoy **la geografía no tiene ninguna influencia en el relieve, el firme, el kilometraje ni la composición de una vuelta**. Una `.2` de Benín y una `.2` de Bélgica con `terrain: 'flat'` y 5 etapas se componen con las mismas proporciones y kilometrajes. Lo único que el país cambia es el clima (`stagePlace` → `climateOf`) y los viajes.

---

## 7. `editions.ts`: recorridos reales, sin temporada

`RACE_EDITIONS: Record<string, RaceEdition>` (editions.ts l. 25) tiene **60 entradas**: 3 grandes vueltas, 54 vueltas de una semana y 3 clásicas de un día (§4.3). Cada `EditionStage` es `{ from, to, km, terrain }` con `EditionTerrain = flat | hilly | mountain | itt | cobbles` (l. 10, sin `classic`). Suma 384 etapas: hilly 163, flat 95, mountain 95, itt 26, cobbles 4. Cabecera (l. 1-9): «NO editar a mano: se regenera de los datos verificados» y «una sola fuente para que no se desincronicen» el perfil (calendar) y el de dónde a dónde (raceRoutes).

**¿Cambia el recorrido por temporada?** No. Es un mapa constante: no hay año ni temporada en la clave ni en el valor, y `stagesFromEdition` (calendar.ts l. 216-231) genera el perfil con semilla `${from}|${to}|${km}` (l. 224), estable para siempre. Cada edición es la de UN año concreto (Tour/Giro/Vuelta 2026 según l. 2-3; el Arctic Race y la Deutschland Tour se «actualizaron de 2025 a 2026» según classicRoutes.ts l. 320-330 y 338-348; el Guangxi es de 2025). El juego repite esa edición temporada tras temporada.

**¿Cómo se siembra?** Dos capas: la composición NO se sortea (las etapas son las de la edición, con su terreno y km), y el dibujo sí, por etapa, con semilla `salida|meta|km`. Dos etapas de carreras distintas con la misma salida, meta y distancia dibujarían el mismo relieve. Si la etapa tiene rasgos en `STAGE_FEATURES[id][i]`, el relieve sale de `buildFeatureProfile` con esos rasgos (puertos en su km real) y la semilla solo rellena el ondulado entre ellos.

**La edición manda sobre la fila.** `buildRace` mira `RACE_EDITIONS[row.id]` ANTES que `row.stages` y `row.terrain` (l. 899-906), y `editionGrandTour` ni siquiera tiene fila. Medido: en 10 carreras la fila y la edición no coinciden en número de etapas, y el juego usa la edición: `race-down-under` fila 6 / edición 5, `race-switzerland` 8 / 5, `race-loire` 4 / 5, `race-britain` 5 / 6, `race-galicia` 4 / 5, `race-asturias` 3 / 4, `race-portugal` 10 / 11, `race-tachira` 9 / 10, `race-colombia` 6 / 9, `race-guatemala` 5 / 10. El `terrain` de esas filas es ruido. `calendar.test.ts` l. 203-215 vigila que los km por etapa de cada edición sean exactamente los del perfil.

**`restAfter`** solo lo llevan cuatro ediciones (§1). `schedule.ts` los usa para el calendario (`stageDayOfSeason`, l. 8-12) pero `stagePlace` (l. 27-32) los ignora a propósito para el clima, y lo deja anotado (l. 20-25).

---

## 8. `raceRoutes.ts` y `classicRoutes.ts`: ciudades y procedencia

`RACE_ROUTES: Record<string, [string, string][]>` (raceRoutes.ts l. 11) da salida y meta por etapa para **las 310 carreras de equipos** (medido: 310 claves, 0 carreras de tabla sin ruta, 0 rutas huérfanas). Los .NC no tienen. Es un dato de presentación: `raceRoute(id)` y `stageEndpoints(id, i)` (l. 1162-1175) solo los leen consumidores externos; nada del motor lo usa para simular. Para las 60 carreras con edición las ciudades salen de la edición (cabecera l. 6-7); para las otras 250, de «recorridos reales por región» sin fuente citada ni terreno asociado: la carrera tiene ciudades reales y relieve inventado.

`classicRoutes.ts` es la **procedencia**. `CLASSIC_ROUTE_SOURCES` (l. 52) tiene 15 entradas con `race` (el nombre real), `edition`, `distanceKm`, `wikipedia`/`official`/`wikidata`, `retrieved` y `notes`; `STAGE_ROUTE_SOURCES` (l. 271) tiene 5 (Rhône-Alpes, Guangxi, Omán, Arctic, Germany); `CLASSIC_FEATURES` (l. 399) contiene los rasgos de las mismas 15 clásicas, y `stageFeatures.ts` l. 18 los mezcla en `STAGE_FEATURES`. Reglas de la casa (l. 15-22): edición más reciente con tabla publicada, distancia y tablas de la misma edición, un muro adoquinado va como puerto, nada se rellena a ojo. Las notas documentan la deuda de dato (Omán: «la mitad de la carrera» sin cotas antes del final; Germany: «la mitad del kilometraje»).

---

## 9. Real, sin validar, inventado: el recuento

Definición del inventario (`scripts/inventario-recorridos.mjs` l. 50-55): una etapa es **Real** si tiene rasgos en `STAGE_FEATURES`, **Sin validar** si su carrera tiene edición (ciudades y km reales, relieve generado) e **Inventada** si no. Por etapas (`inventario-recorridos.md` l. 22-36):

| clase | etapas |         real |  sin validar |      inventado |
| ----- | -----: | -----------: | -----------: | -------------: |
| WT    |    161 |          139 |           22 |              0 |
| Pro   |    174 |           29 |          110 |             35 |
| .1    |    230 |            4 |           49 |            177 |
| .2    |    321 |            5 |           45 |            271 |
| NC    |    532 |            0 |            0 |            532 |
| total |  1.418 | 177 (12,5 %) | 226 (15,9 %) | 1.015 (71,6 %) |

Por carreras (medido, a partir de qué carreras aparecen en `STAGE_FEATURES` y en `RACE_EDITIONS`):

| clase | carreras | con algún rasgo real | con edición y sin rasgos | ni edición ni rasgos |
| ----- | -------: | -------------------: | -----------------------: | -------------------: |
| WT    |       36 |                   31 |                        5 |                    0 |
| Pro   |       61 |                    8 |                       20 |                   33 |
| .1    |      101 |   1 (`race-galicia`) |                        7 |                   93 |
| .2    |      112 |      1 (`race-pune`) |                        7 |                  104 |
| NC    |      532 |                    0 |                        0 |                  532 |

Las 41 carreras con rasgos reales: 20 clásicas sin edición (las 15 de `CLASSIC_FEATURES` más `race-sanremo`, `race-wevelgem`, `race-san-sebastian`, `race-laigueglia`, `race-brabant`, cargadas directamente en `stageFeatures.ts`) y 21 con edición (las 3 grandes vueltas y 18 vueltas). «Con algún rasgo» no es «entera»: el Guangxi solo carga el final de la etapa 5 (classicRoutes.ts l. 297-301), y muchas vueltas tienen etapas `null`. Los 5 WT con edición y sin rasgos son `race-bruges`, `race-copenhagen`, `race-brittany` (las tres clásicas «sin validar» de editions.ts l. 709-716), `race-poland` y `race-benelux`.

Lectura para el diseño: el WorldTour está prácticamente entero con relieve real (139 de 161 etapas), la ProSeries tiene ciudades reales pero relieve generado en dos de cada tres etapas, y el circuito continental y los nacionales son casi enteramente obra del generador. Cualquier regla que se apoye en «el recorrido de esta carrera» solo es fiel en el nivel alto.

---

## 10. Países del calendario

56 países distintos en las 310 carreras de equipos (más los 133 de los campeonatos, que por construcción cubren `COUNTRIES` entero). Recuento medido, con desglose por clase (WT / Pro / .1 / .2):

| País | total |  WT | Pro |  .1 |  .2 |     | País | total |  WT | Pro |  .1 |  .2 |
| ---- | ----: | --: | --: | --: | --: | --- | ---- | ----: | --: | --: | --: | --: |
| FR   |    57 |   5 |  11 |  26 |  15 |     | LU   |     2 |   0 |   1 |   1 |   0 |
| BE   |    42 |   9 |  10 |  12 |  11 |     | RS   |     2 |   0 |   0 |   0 |   2 |
| IT   |    40 |   5 |  11 |  14 |  10 |     | LT   |     2 |   0 |   0 |   0 |   2 |
| ES   |    28 |   4 |   6 |  16 |   2 |     | VE   |     2 |   0 |   0 |   0 |   2 |
| NL   |    14 |   1 |   0 |   6 |   7 |     | CO   |     2 |   0 |   0 |   1 |   1 |
| TR   |    11 |   0 |   1 |   2 |   8 |     | SA   |     1 |   0 |   1 |   0 |   0 |
| PT   |     9 |   0 |   2 |   4 |   3 |     | HU   |     1 |   0 |   1 |   0 |   0 |
| PL   |     8 |   1 |   0 |   0 |   7 |     | MY   |     1 |   0 |   1 |   0 |   0 |
| DE   |     6 |   2 |   2 |   1 |   1 |     | CY   |     1 |   0 |   0 |   0 |   1 |
| CN   |     5 |   1 |   2 |   1 |   1 |     | BA   |     1 |   0 |   0 |   0 |   1 |
| SI   |     5 |   0 |   1 |   1 |   3 |     | AZ   |     1 |   0 |   0 |   1 |   0 |
| GR   |     5 |   0 |   0 |   2 |   3 |     | AL   |     1 |   0 |   0 |   0 |   1 |
| AU   |     4 |   2 |   1 |   1 |   0 |     | EE   |     1 |   0 |   0 |   1 |   0 |
| DK   |     4 |   1 |   1 |   0 |   2 |     | AD   |     1 |   0 |   0 |   1 |   0 |
| NO   |     4 |   0 |   2 |   0 |   2 |     | BG   |     1 |   0 |   0 |   0 |   1 |
| CZ   |     4 |   0 |   1 |   0 |   3 |     | XK   |     1 |   0 |   0 |   0 |   1 |
| HR   |     4 |   0 |   1 |   0 |   3 |     | SK   |     1 |   0 |   0 |   1 |   0 |
| JP   |     4 |   0 |   1 |   1 |   2 |     | IN   |     1 |   0 |   0 |   0 |   1 |
| CH   |     3 |   2 |   0 |   1 |   0 |     | TW   |     1 |   0 |   0 |   1 |   0 |
| CA   |     3 |   2 |   0 |   0 |   1 |     | TH   |     1 |   0 |   0 |   1 |   0 |
| US   |     3 |   0 |   1 |   1 |   1 |     | KR   |     1 |   0 |   0 |   1 |   0 |
| AT   |     3 |   0 |   0 |   1 |   2 |     | RW   |     1 |   0 |   0 |   1 |   0 |
| RO   |     3 |   0 |   0 |   1 |   2 |     | DZ   |     1 |   0 |   0 |   0 |   1 |
| AE   |     2 |   1 |   0 |   0 |   1 |     | BJ   |     1 |   0 |   0 |   0 |   1 |
| OM   |     2 |   0 |   2 |   0 |   0 |     | MU   |     1 |   0 |   0 |   0 |   1 |
| GB   |     2 |   0 |   1 |   0 |   1 |     | CM   |     1 |   0 |   0 |   0 |   1 |
|      |       |     |     |     |     |     | MA   |     1 |   0 |   0 |   0 |   1 |
|      |       |     |     |     |     |     | BF   |     1 |   0 |   0 |   0 |   1 |
|      |       |     |     |     |     |     | GT   |     1 |   0 |   0 |   0 |   1 |
|      |       |     |     |     |     |     | EC   |     1 |   0 |   0 |   0 |   1 |

Francia, Bélgica, Italia y España suman 167 de 310 carreras (54 %); Europa entera, 186 de las 213 continentales. Por `region` (solo .1/.2): Europe 186, Asia 10, America 9, Africa 7, Oceania 1. Las 97 carreras WT y Pro no llevan región (globales).

---

## 11. Lo que el calendario NO sabe (huecos que verá un diseñador)

- **No hay temporada**: `SEASON_CALENDAR` es una constante de módulo. Ni fechas, ni recorridos, ni número de etapas cambian de un año a otro; no existe la noción de «edición N» de una carrera del juego.
- **No hay país en el generador** (§6): ni relieve, ni firme, ni kilometraje, ni composición dependen de dónde se corre. Tampoco hay altitud de referencia, viento dominante ni tipo de carretera por país.
- **Terreno de seis valores y de tres para componer**: la única identidad «de perfil» de una carrera inventada es su `terrain` de fila más un hash del id. `cobbles` e `itt` se componen como `flat` cuando son vueltas (§4.1).
- **Un país por carrera**: un Tour que sale de Barcelona lleva `FR` en todas las etapas (clima y viajes de Cataluña se calculan como Francia).
- **`km` por defecto**: 142 de 178 carreras de un día miden 210 km clavados.
- **`format` de las tres clásicas con edición** dice `una-semana` (§4.3).
- **Diez filas con `stages` distinto de su edición** (§7): el dato de la fila es letra muerta y confunde a quien lea la tabla.
- **Los banners** solo son cimas de puerto (`auto`, l. 93-105): no hay metas volantes en nada generado, y solo las hay reales donde la fuente las publica.
- **Las ciudades de las 250 carreras sin edición** (`raceRoutes.ts`) no tienen fuente citada y no se cruzan con nada: ni con el terreno ni con el país (nadie comprueba que Roubaix esté en `FR`).
