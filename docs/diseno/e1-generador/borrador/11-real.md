## 11. Lo real frente a lo generado

Esta sección fija la frontera que el resto del documento da por hecha: qué etapas del calendario son dato, cuáles son mitad dato y cuáles son obra del generador, cómo se marca cada una desde `buildRace` hasta la pantalla, y qué pruebas garantizan que la gramática no toca una sola etapa real. Es la respuesta a G5 («Hay que arreglar eso») y a G6 («para las que no se puedan nunca reproducir, el generador es una basura. Hay que arreglarlo, está pésimo»): lo que se puede reproducir se reproduce y no se toca; lo que no, se genera bien y se dice que es generado. Las cifras de población salen del mapa 02 §9 (inventario sobre `SEASON_CALENDAR`: 1.418 etapas en 842 carreras; 177 reales, 12,5 %; 226 con edición y sin rasgos, 15,9 %; 1.015 inventadas, 71,6 %, de las que 532 son nacionales) y del mapa 06 §1 (por rama de código: 532 nacionales, 325 de `stageMix`, 226 de edición sin rasgos, 177 con rasgos, 158 de un día de tabla).

### 11.1 La prioridad de `buildRace` no cambia; cada rama marca su origen

`buildRace` (`calendar.ts` l. 886-925) mira `RACE_EDITIONS[row.id]` antes que `row.stages` (l. 902-910), y dentro de `stagesFromEdition` (l. 216-227) cada etapa mira `STAGE_FEATURES[id][i]` antes que el generador (l. 225: `f ? featureSpec(...) : oneDaySpec(s.terrain, s.km, seed)`). Una carrera de un día de tabla mira `STAGE_FEATURES[row.id]?.[0]` (l. 916) y si no hay rasgos genera; una vuelta de tabla va a `stageMix` (l. 923); los 532 nacionales salen de `nationalChampionships` (l. 316-362) con `classic(220)`, `classic(180)`, `itt(38)` e `itt(30)`. Ese orden (edición real > rasgos reales > generado) se conserva letra por letra. Lo que cambia es que cada rama declara lo que es y que las dos ramas generadoras llaman a `generateStage` (sección 8) en vez de a `oneDaySpec` o a los ocho `xxxSegments`:

| Rama de `buildRace`                             | Hoy                                                                                                              | En E1                                                                                                                                                                                                                            | `routeSource` | Semilla de dibujo                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `stagesFromEdition` con `STAGE_FEATURES[id][i]` | `featureSpec` → `buildFeatureProfile`                                                                            | igual, sin tocar                                                                                                                                                                                                                 | `real`        | `${from}\|${to}\|${km}` (l. 224), sin `season`                                                 |
| `stagesFromEdition` sin rasgos para esa etapa   | `oneDaySpec(s.terrain, s.km, seed)` → plantilla de un día (Colombia e5 dibujada con `mountainOneDay`, sección 1) | `generateStage` con `role` derivado de `s.terrain` y esqueleto DE ETAPA (tabla `EditionTerrain → et_*` de la sección 5), `km` como contrato al 0,1, `geo = ZONAS[regionOf(id, i, country)]` con `RACE_REGION.stages` (sección 6) | `edicion`     | `editionKey = ${from}\|${to}\|${km}` bajo `raceId\|e{i}` (decisión 22); `season` solo en `dib` |
| un día de tabla con `STAGE_FEATURES[row.id][0]` | `featureSpec`                                                                                                    | igual, sin tocar                                                                                                                                                                                                                 | `real`        | `row.id`                                                                                       |
| un día de tabla sin rasgos                      | `oneDaySpec(terrain, km ?? 210, row.id)`                                                                         | `generateStage` con `role: 'un_dia'`, km por `ARCH.km.porClase` salvo `km` explícito en la fila (decisión 36)                                                                                                                    | `generado`    | `arch\|raceId`, `firma\|raceId`, `ed\|raceId\|season`                                          |
| vuelta de tabla                                 | `stageMix(row.stages, terrain, row.id)`                                                                          | `stageMix` con la misma firma delegando en `composeTour` (decisión 19)                                                                                                                                                           | `generado`    | ídem, por etapa                                                                                |
| `nationalChampionships`                         | `classic(220)` / `itt(38)`                                                                                       | `nc_ruta` y `nc_crono` con `zonaDe(code)` (decisión 15)                                                                                                                                                                          | `generado`    | `arch\|nc-xx-road` etc.                                                                        |

Tres consecuencias que el implementador tiene que respetar:

1. **`real` es una propiedad de la etapa, no de la carrera.** `STAGE_FEATURES` se indexa por id de carrera con un array por etapa y `null` donde no hay rasgos (`stageFeatures.ts` l. 10 y 15; `scripts/inventario-recorridos.mjs` l. 43-49 lo recuerda porque el inventario mintió una vez por indexar mal). El Guangxi solo carga el final de la e5 (mapa 02 §9): su e5 es `real` y sus otras cuatro son `edicion`. Nada de esto se redondea hacia arriba.
2. **Por carrera, el origen es un agregado con tres valores**: `real` si todas sus etapas son `real`, `generado` si ninguna lo es y ninguna es `edicion`, y `mixto` en cualquier otro caso. `mixto` es un valor de `CalendarRace.routeSource`, nunca de `CalendarStage.routeSource` (el tipo de etapa es `'real' | 'edicion' | 'generado'`, `generate.ts`, sección 3). Con ello el 🟡 del inventario tiene nombre en el código, y `race-france` (20 de 21 reales) sale `mixto`, igual que Guangxi.
3. **Las poblaciones no cambian en E1.** Como la prioridad no cambia y E1 no carga dato, el recuento por `routeSource` sobre `calendarForSeason(BASE_SEASON)` tiene que dar exactamente 177 / 226 / 1.015 por etapa, y `routeCensus` (sección 13) lo sella como banda de identidad con esas tres cifras. Solo E12 las mueve, cargando rasgos que conviertan `edicion` en `real`.

```ts
// routes/grammar/generate.ts (ya en §B.2; se repite lo que esta sección usa)
export type RouteSource = 'real' | 'edicion' | 'generado' // por ETAPA
export type RaceRouteSource = 'real' | 'mixto' | 'generado' // por CARRERA, agregado en buildRace
export function raceRouteSourceOf(
  stages: readonly { routeSource: RouteSource }[],
): RaceRouteSource {
  if (stages.every((s) => s.routeSource === 'real')) return 'real'
  if (stages.every((s) => s.routeSource === 'generado')) return 'generado'
  return 'mixto'
}
```

Una etapa `edicion` recibe la variación de edición solo en el dibujo (`season` entra en `dib`, no en `mot` ni en `pos`; sección 10): la arquitectura de una etapa con ciudades reales es la de la edición 0 para no alejarla más del dato que sí tiene. Una etapa `real` no recibe ninguna: `stagesForSeason(id, s)` devuelve el mismo perfil para todo `s`.

### 11.2 `featureProfile.ts` no se toca en E1, y la deuda que eso deja

`buildFeatureProfile(totalKm, features, seed, terrain?)` (`featureProfile.ts` l. 362-375) es el constructor de las 177 etapas reales y E1 no lo modifica (decisión 27). Lo que hace, según el mapa 01 §6: con `elevation` de dos o más muestras integra un segmento por par de muestras sin azar alguno (camino A, l. 317-350); sin `elevation` reconstruye por puertos publicados con `climbRamps` 30/40/30 y rellena los huecos con `rollingFill(gap, `${seed}:roll${idx}`, amplitud)` (camino B, l. 391-435), donde la amplitud sale de `RELIEF.rollingAmplitude[terrain]` (l. 25-26) y la semilla solo pinta la carretera anónima entre dificultades; en los dos caminos `normalizeTotal` (l. 179-188) cuadra el total estirando o encogiendo el ÚLTIMO segmento, que es lo que `profileGen.ts::normalize` dejó de hacer en la v64. `applyCobbles` (l. 231-289) superpone los sectores reales sin tocar la pendiente.

La razón de no tocarlo es doble y está medida. Primero, es el 12,5 % del calendario que ya está bien y sobre el que se han calibrado bandas del motor: `erosion.longClassicFresh` (Flandes) y `erosion.hardestClassicFresh` (Lombardía), `realQueenThirdWeek` (Francia e18), `italy9SummitFinishes` (Giro e9) y las 18 de un día WT de la saturación (mapa 06 §5) corren perfiles que salen de aquí; cambiar el relleno los remide todos. Segundo, tiene sus propios tests (`featureProfile.test.ts`, 207 l.; `classicRoutes.test.ts`, 229 l.; mapa 06 §2.4), que no importan `profileGen` y no se ponen rojos con el rediseño: son la prueba de que el constructor real y el generador son dos módulos y no uno.

La deuda queda anotada con lo que movería resolverla, para la sección 17 (riesgo 7): tras E1 el calendario tiene **dos rellenos** para dos poblaciones. Las 177 etapas `real` llevan `rollingFill` con `RELIEF.rollingAmplitude` por terreno de la edición (tramos de `1,4 + U·2,2` km a `±(0,4 + U·2,4)·amplitud` %, mapa 01 §6) y `normalizeTotal` al último segmento; las 1.241 restantes llevan el motivo `enlace` con `GeoSignature.amplitud` por zona (tope `ARCH.motivo.enlace.ampMax` 2,4, sección 4) y `normalizeEnlaces` con residuo al enlace más largo (decisión 10). En una carrera `mixto` los dos conviven etapa a etapa (Guangxi e5 contra sus e1-e4). Unificarlos es un paso propio posterior a E1 que (a) sustituye `rollingFill` por `enlace` con la `amplitud` de `regionOf(id, i, country)`, (b) sustituye `normalizeTotal` por el cuadre solo sobre relleno, (c) re-sella la huella de 11.3 con causa escrita y (d) remide `erosion.longClassicFresh` y `hardestClassicFresh` pareadas. Ni se hace ni se prepara en E1; se escribe aquí para que nadie lo haga por accidente al «limpiar».

### 11.3 La huella FNV de lo real (decisión 28)

Lo real manda y se comprueba por test, no por confianza. `routes/realFingerprint.test.ts` se escribe y se sella en el paso 1 del plan (sección 15), ANTES de tocar `calendar.ts`, y sobrevive al paso 8 y a todo lo que venga después; a diferencia de `routes/golden.test.ts` (las 1.418 huellas del calendario de hoy, que se sella en el paso 1 para probar que los builders legado reproducen lo de hoy y se BORRA en el paso 8, cuando el calendario cambia a propósito). La huella usa `hashInt` de `profileGen.ts` l. 15-22 (FNV-1a sobre cadena; es una de las primitivas que `profileGen.ts` conserva exportadas, §B.1) sobre `JSON.stringify(profile)` con `segments` y `banners` en su orden. Sin dependencias nuevas y sin `crypto`.

Qué se sella, en dos capas:

1. **177 huellas de etapa**, una por cada etapa con rasgos: la carrera, el índice y `hashInt(JSON.stringify(stage.profile))`, en `routes/realFingerprint.fixture.ts` como literal generado una vez (el fichero lleva cabecera con la fecha, el `ENGINE_VERSION` 69 y la orden para regenerarlo, `pnpm --filter @cyclingstar/engine exec vitest run realFingerprint -u` no vale: se regenera con un script explícito para que nadie lo re-selle sin querer con `-u`).
2. **3 huellas de gran vuelta entera**, una por `race-italy`, `race-spain` y `race-france`: hash de la secuencia `[index, km al 0,1, kind, timeTrial, routeSource, huellaDePerfilSiReal]` de sus 21 etapas más `restAfter`. En Italia y España las 21 son `real` (mapa 06 §1) y la huella de carrera cubre los 21 perfiles; en Francia la e21 es `edicion` (mapa 06 §1: «la e21, llana, se genera») y entra en la huella por estructura (km, `kind`, `timeTrial`, `routeSource`) y no por perfil, porque la gramática la redibuja a propósito. Así «entera» significa lo que puede significar sin contradecir 11.1: número y orden de etapas, papeles, cronos, descansos, km y los 20 perfiles reales.

```ts
// packages/engine/src/routes/realFingerprint.test.ts (paso 1; sobrevive al paso 8)
import { hashInt } from './profileGen.js'
import { STAGE_FEATURES } from './stageFeatures.js'
import { calendarForSeason, BASE_SEASON } from './grammar/edition.js'
import { REAL_STAGES, GRAND_TOURS } from './realFingerprint.fixture.js' // 177 + 3 literales

const huella = (p: unknown) => hashInt(JSON.stringify(p))

describe('lo real no se toca', () => {
  const cal = calendarForSeason(BASE_SEASON)
  it('las 177 etapas con rasgos tienen la huella sellada, y solo ellas son `real`', () => {
    const reales = cal.flatMap((r) =>
      r.stages
        .filter((s) => s.routeSource === 'real')
        .map((s) => [r.id, s.index, huella(s.profile)] as const),
    )
    expect(reales.length).toBe(177)
    for (const [id, i, h] of reales) expect(h, `${id} e${i}`).toBe(REAL_STAGES[`${id}|${i}`])
    // ninguna etapa marcada `real` carece de rasgos, y ninguna con rasgos deja de ser `real`
    for (const r of cal)
      for (const s of r.stages)
        expect(s.routeSource === 'real').toBe(Boolean(STAGE_FEATURES[r.id]?.[s.index - 1]))
  })
  it('las tres grandes vueltas conservan estructura y perfiles reales', () => {
    for (const id of ['race-italy', 'race-spain', 'race-france']) {
      const race = cal.find((r) => r.id === id)!
      const firma = race.stages.map((s) => [
        s.index,
        Math.round(stageKm(s.profile.segments) * 10) / 10,
        s.kind,
        s.timeTrial ?? false,
        s.routeSource,
        s.routeSource === 'real' ? huella(s.profile) : 'edicion',
      ])
      expect(huella([firma, race.restAfter ?? []])).toBe(GRAND_TOURS[id])
    }
  })
  it('una etapa real no depende de la temporada', () => {
    for (const season of [1, 2, 3])
      for (const r of calendarForSeason(season))
        for (const s of r.stages)
          if (s.routeSource === 'real')
            expect(huella(s.profile)).toBe(REAL_STAGES[`${r.id}|${s.index}`])
  })
})
```

En el paso 1 el test corre contra el calendario de hoy (`calendarForSeason` aún no existe: el test importa `SEASON_CALENDAR` y se cambia el import en el paso 6 sin tocar las huellas). En el paso 8, con `buildRace` llamando a `generateStage`, sigue en verde por construcción: la rama `featureSpec` no se ha tocado. Si alguna vez se pone rojo, la regla es la de `docs/entrenamiento.md` §0: se re-sella solo con la causa nombrada en el propio fichero y la nota en `docs/balance.md`; la única causa legítima prevista es la unificación de rellenos de 11.2 o una carga nueva de E12 (que añade filas al fixture, no las cambia).

### 11.4 `routeSource` hasta la pantalla

El origen viaja sin traducciones intermedias por cuatro capas, y en cada una tiene el mismo nombre:

**Motor.** `StageSpec` y `CalendarStage` (`calendar.ts` l. 33-46) ganan `routeSource: RouteSource` y `arch?: GeneratedStage['arch']` (sección 3); `featureSpec` (l. 196-209) escribe `routeSource: 'real'` y no lleva `arch`; las dos ramas generadoras copian `routeSource` y `arch` de `GeneratedStage`. `CalendarRace` gana `routeSource: RaceRouteSource` calculado con `raceRouteSourceOf` al construir la carrera.

**Base.** `packages/db/src/raceRoutes.ts` l. 29 cambia `RouteSource = 'real' | 'generado'` por el tipo de tres valores importado del motor, y `freezeRaceRoute(db, worldId, raceKey, raceId, season)` (l. 35-55, con `season` nuevo; sección 10) escribe `routeSource: stage.routeSource` en lugar del literal `'generado'` que el propio comentario de l. 48-51 declara provisional. La columna `race_routes.route_source` es `text` con default `'generado'` (`schema.ts` l. 523), así que los tres valores no exigen migración (hecho del juez del motor, §1); la migración `00NN_race_routes_kind.sql` de la sección 10 es por `kind`, `label` y `time_trial`, no por esto. `backfillRaceRoutes` (l. 91-109) se corre antes del paso 8 en cualquier mundo vivo (decisión 45) y, como congela «con el generador ACTUAL a propósito» (l. 88-89), escribe `'generado'` en todas sus filas: es correcto, porque esas carreras se corren con el perfil viejo y no hay etapa `real` mal marcada que importe hasta que el mundo se reinicie (`docs/ops.md`).

**API.** `apps/api/src/routes/calendar.ts` l. 91-105 (`planFrom`) añade por etapa `routeSource`, `arch` (solo `frase`, `skeleton`, `geo`, `finalKind`, `dPlus` y `metadatos`; nunca `motivos` enteros, que son detalle de motor), `edicion` (`season + 1`) y `cambiosRespectoAnterior` (lista de `Motif.nombre` no firma que difieren de la temporada anterior, `diffMotivos(prev, actual)`, decisión 39); por carrera, `routeSource` agregado. La altimetría de una etapa no corrida pasa de `run?.profile ?? stage.profile` (l. 98) a `run?.profile ?? frozen?.profile ?? stagesForSeason(race.id, season)[i].profile`, para que la ficha enseñe el perfil que el mundo va a correr y no la canónica (mapa 03 §9 punto 4 lo señalaba como lectura del código sin comprobar; aquí se cierra).

```ts
// apps/api: forma de la etapa en /api/calendar/:raceId (lo que se añade; el resto no cambia)
interface StagePlanView {
  index: number
  name: string
  label: string
  kind: StageKind
  km: number
  timeTrial: boolean
  from: string | null
  to: string | null
  altimetry: string
  routeSource: 'real' | 'edicion' | 'generado'
  fuente?: string // solo `real`: `race` + `edition` de CLASSIC_ROUTE_SOURCES / STAGE_ROUTE_SOURCES
  arch?: {
    frase: string
    skeleton: SkeletonId
    geo: GeoZone
    finalKind: FinalKind | null
    dPlus: number
    metadatos: { viento: 0 | 1 | 2 | 3; altitud: GeoSignature['altitud'] }
  } // solo `edicion` y `generado`
  edicion?: number // season + 1; solo `generado` (una `edicion` real no cambia de arquitectura)
  cambiosRespectoAnterior?: string[] // solo `generado` y season > 0
}
```

**Web.** `apps/web/src/pages/Race.tsx`, `StageLine` (l. 236-260) y `RouteTab` (l. 268-290), pintan bajo la altimetría una marca de tres textos fijos, que son los de `docs/inventario-recorridos.md` traducidos al jugador: `real` → «Recorrido real» más la fuente (`CLASSIC_ROUTE_SOURCES` y `STAGE_ROUTE_SOURCES` de `classicRoutes.ts` l. 52 y 271 ya llevan `race`, `edition` y `wikipedia`/`official`); `edicion` → «Ciudades y distancia reales, relieve generado»; `generado` → «Recorrido generado». Para `edicion` y `generado` se añade la frase de arquitectura (`arch.frase`, por ejemplo «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro») y, para `generado`, «Edición N» con `cambiosRespectoAnterior` cuando no está vacío. Es el valor por defecto de D10 (frase y edición siempre en la ficha; sección 18). El texto de `metadatos` no promete lo que el motor no hace (decisión 17): `viento ≥ 2` se escribe «llano abierto», nunca «abanicos», y `altitud: 'alta'` se escribe «etapa de altitud» sin efecto en la carrera.

**Inventario.** `scripts/inventario-recorridos.mjs` l. 50-55 sustituye `provenance(race, index)` (que deduce por `STAGE_FEATURES` y `RACE_EDITIONS`) por `stage.routeSource`, conserva las tres marcas ✅ / 🟡 / 🔴 con el mismo texto de cabecera y añade dos columnas para las no reales, `zona` (`arch.geo`) y `esqueleto` (`arch.skeleton`). `docs/inventario-recorridos.md` se regenera en el paso 10 y su cabecera tiene que seguir diciendo 177 / 226 / 1.015: una sola fuente de verdad para la distinción, que era lo que ese documento no podía ser mientras la deducía por su cuenta.

Test de base (`db/raceRoutes.test.ts`, paso 10): congelar `race-france` y comprobar que las filas 1 a 20 llevan `route_source = 'real'` y la 21 `'edicion'`; congelar una .2 generada y comprobar `'generado'` en todas; congelar la misma carrera en dos temporadas y comprobar dos perfiles distintos con el mismo `kind` por etapa (`recorridoDelMundo.test.ts` gana este caso, decisión 44).

### 11.5 Kind coherente entre código, congelado y ficha (decisión 23)

Hoy conviven dos reglas de etiqueta y ninguna coincide con el `kind` de la mitad del calendario. `stageKindOf` (`stageKind.ts` l. 84) decide `Summit finish` por «el último segmento es `puerto`»; `apps/api/src/stageHistory.ts` l. 73-88 decide por `runInAfterLastClimb(segments) <= SUMMIT_RUN_IN_KM` con `SUMMIT_RUN_IN_KM = 5`, medido sobre 19 etapas y un control de 24 (comentario l. 64-71: cola ≤ 5 km indistinguible de un final en alto de verdad, mediana 3 juntos en meta y 15 % de victorias de velocista; cola > 5 km, mediana 17 y 46 %). Una `reina` con meta `cima_cerca` (valle de [1,2; 4,3] km, sección 4) sale `Mountains` de la primera y `Summit finish` de la segunda, y cuenta en el 49 de `stageHistory.test.ts` l. 199 aunque su `kind` sea impecable (juez del motor, §5 riesgo 2). Además, `kind` y `profile` se leen del código y no del congelado en cuatro sitios: `calendarRun.ts` l. 1614 (`kind: stage.kind` junto a `profile: congelado ?? stage.profile`, l. 1615), `calendarRun.ts` l. 516 y `db/callups.ts` l. 98 (`raceVocationFit(race.stages.map(s => s.kind))`) y `raceContext.ts::terrenoRestante` (l. 56-59, llamada en l. 127, sobre `race.stages[*].profile`). Con temporadas, esos cuatro verían la temporada 0.

Lo que se implementa:

1. **Una sola regla de etiqueta, en `routes/`.** `stageKind.ts` exporta `SUMMIT_RUN_IN_KM = 5` y `kmAfterLastClimb(profile): number` (suma de `km` de los segmentos posteriores al último `puerto`; `Infinity` sin puerto: la misma función que `stageHistory.ts` l. 75-86, movida). `stageKindOf` conserva intacta la regla de `kind` (l. 84 sigue decidiendo `clasica` frente a `media`/`reina` con «último segmento `puerto`», `WALL_MAX_KM` 3, `PASS_MIN_KM` 8,5 y `QUEEN_MIN_CLIMB_METRES` 3.200) y cambia SOLO la elección de etiqueta dentro de `reina` y `media`: `Summit finish` / `Uphill finish` si `kmAfterLastClimb(profile) <= SUMMIT_RUN_IN_KM`, `Mountains` / `Hills` si no. Se exporta también `stageLabelOf(kind, profile, timeTrial)` con esa regla, de modo que `stageKindOf(p, tt).label === stageLabelOf(stageKindOf(p, tt).kind, p, tt)` siempre. Las etiquetas nuevas de la decisión 38 (`Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic`) se deciden en la misma función por rasgos legibles del perfil; su regla la escribe la sección 5 junto al catálogo.
2. **`stageHistory.ts` deja de tener regla propia.** `calendarStageSpec` (l. 101-109) pasa a `label = stageLabelOf(stage.kind, stage.profile, stage.timeTrial ?? false)` y conserva solo la recomposición del nombre (`Stage N · etiqueta`, salvo nombre propio). `SUMMIT_FINISH`, `NO_SUMMIT_FINISH`, `SUMMIT_RUN_IN_KM` y `runInAfterLastClimb` se borran del fichero; el comentario medido de l. 60-71 se traslada a `stageKind.ts` junto a la constante, porque es su justificación.
3. **Toda etapa generada lleva `kind = stageKindOf(profile, timeTrial).kind` y `label = stageKindOf(...).label`** (V6, decisión 24), así que para ella `calendarStageSpec` no cambia nada. Una etapa `real` conserva `kind` de `TERRAIN_KIND[terrain]` (`calendar.ts` l. 183-190, el terreno verificado de la edición) y su `label` declarada en `CalendarStage`; la API la corrige con la regla única. Es la misma división que hoy (`stageHistory.ts` l. 47-49: «la familia la sigue declarando la edición»), con la regla en un solo sitio.
4. **El 49 se re-sella con objetivo escrito.** `stageHistory.test.ts` l. 175-200 sigue afirmando en las 1.418 que `spec.kind === stage.kind` y `spec.timeTrial === stage.timeTrial` (la mitad que vigila de verdad, mapa 06 §3.4) y parte el contador en dos: `cambianGeneradas` (etapas con `routeSource !== 'real'`) tiene que ser **0** por construcción, y `cambianReales` se sella con la cifra que salga en el paso 8 y la causa escrita: «solo etapas reales cuya etiqueta declarada por el terreno de la edición difiere de la regla de `SUMMIT_RUN_IN_KM`; las generadas no pueden contar porque su etiqueta ya sale de `stageKindOf`». La cifra no se predice: los 49 de hoy mezclan generadas (que desaparecen) y reales medidas con la regla de 5 km (que se quedan), y las 226 de edición cambian de perfil.
5. **Los cuatro lectores leen el congelado.** `race_routes` gana `kind`, `label`, `time_trial` (migración de la sección 10); `raceStagesForWorld(db, worldId, raceKey)` devuelve las filas congeladas y, si no hay fila, `stagesForSeason(raceId, season)`; `calendarRun.ts` l. 1614-1615, l. 516, `db/callups.ts` l. 98 y `raceContext.ts` l. 127 leen `kind`, `timeTrial` y `profile` de ahí y nunca de `SEASON_CALENDAR`. Con la decisión 20 (la edición no mueve `kind`, `timeTrial` ni `n`) el congelado y el calendario de la temporada coinciden en `kind` siempre; la lectura del congelado cubre el caso que sí importa, un mundo que corre la temporada 3 con un proceso que arrancó en la 0.

```ts
// apps/api/src/stageHistory.test.ts l. 175-200, re-sellado en el paso 8
let cambianReales = 0,
  cambianGeneradas = 0
for (const race of calendarForSeason(BASE_SEASON))
  for (const stage of race.stages) {
    const spec = calendarStageSpec(stage, 0)
    expect(spec.kind).toBe(stage.kind) // el TIPO no se mueve: alimenta órdenes y banco
    expect(spec.timeTrial).toBe(stage.timeTrial ?? false)
    if (spec.label !== stage.label)
      stage.routeSource === 'real' ? cambianReales++ : cambianGeneradas++
  }
expect(cambianGeneradas).toBe(0) // su etiqueta ya sale de stageKindOf (V6): no hay nada que corregir
expect(cambianReales).toBe(NN) // medido en el paso 8; solo reales, etiqueta del terreno frente a SUMMIT_RUN_IN_KM
```

### 11.6 `stageKindOf` no se recalibra en E1: qué verá el jugador mientras tanto

Los umbrales de `stageKind.ts` (8,5 km de cota más larga, 3.200 m como red para lo real, 3 km de muro) están calibrados contra los ocho generadores de hoy (comentario l. 44-58, «10.800 etapas de cada generador») y no contra la carretera: medido sobre las 177 reales, `stageKindOf` llama `media` a 11 de las 54 reinas reales y `reina` a 16 de las 59 medias reales (27 de 113), y `clasica` a 7 y `reina` a 3 de las 22 llanas reales con cota (`propuestas/datos.md` §1.5). E1 no los mueve (decisión 26): son la vara de `stageKind.test.ts`, de `calendarQueens` y de `world.ts::CALENDARIO`, y moverlos obligaría a remedir todo el banco a la vez que el generador, que es justo lo que el protocolo pareado de la sección 13 no permite. Lo generado se acota con holgura para caber en la vara (puerto ≥ 9,0 y cota ≤ 8,0 en vez de 8,5; `margenClaseKm` 0,3; V6 y V7 con reintento) y lo real sigue con su discrepancia medida. Es la decisión D2 del dueño (sección 18), que se abre tras el paso 8 con la tabla de `routeCensus` por `routeSource` (`kind` declarado contra `stageKindOf(profile).kind` para las 177 reales, con la cifra de 27 actualizada), no antes.

Consecuencia visible, dicha sin rodeos: hasta D2 la ficha aplica dos criterios según el origen (juez de ejecutabilidad, §5 riesgo 6). Una Lieja generada (`ud_montana_media` en `ardenas`, sección 5) tiene cotas de [2,5; 8,0] km y D+ por debajo de 3.200 m por construcción: sale `kind: 'media'` con etiqueta `Mountains classic` y el punto de color de media, y es CORRECTO respecto de la vara. Una Lieja real, cargada con sus cotas y su desnivel, puede caer en `reina` por la red de 3.200 m aunque ninguna cota pase de 8,5 km; hoy ya ocurre con 16 medias reales, y el `kind` que el motor usa para las órdenes automáticas es el declarado por la edición, no ese. El jugador ve, por tanto, generadas siempre coherentes (etiqueta, color y `finalKind` los garantizan V6 y V7) y reales con el `kind` de su edición verificada y la etiqueta corregida por la regla de 5 km. La marca de origen de 11.4 es lo que hace honesta esa diferencia: al lado de «Recorrido real» el jugador sabe que lo que ve es la carretera, y al lado de «Recorrido generado» sabe que lo que ve es una regla.

### 11.7 La doctrina heredada de `fuentes-recorridos.md`

Todo lo anterior descansa sobre la definición operativa de «real» que `docs/fuentes-recorridos.md` fija y que el mapa 05 §6 resume; E1 la hereda sin enmendarla:

- **Nada se inventa sobre una carrera con dato.** Un puerto solo se anota con km de cima, longitud y pendiente, y si falta uno se descarta (l. 28-31; regla 3 de las once, l. 132-200; `classicRoutes.ts` l. 15-22). La gramática no lee ni escribe `STAGE_FEATURES`, `RACE_EDITIONS`, `classicRoutes.ts` ni `editions.ts`; ninguna de sus tablas (`ZONAS`, `RACE_REGION`, `SKELETONS`) alcanza a una etapa `real`, y 11.3 lo prueba.
- **La marca verde tiene que significar algo.** AlUla no se cargó con sprints exactos y sin cotas porque «subiría el marcador sin subir la verdad», y la Pologne con tres puertos de diez se quedó en 🟡 (mapa 05 §6 punto 2). Por eso `real` es por etapa y no se agrega hacia arriba (11.1), y por eso el 🟡 se llama `edicion` en el código y en la pantalla dice «relieve generado» con la frase de arquitectura al lado: el jugador no puede confundir Colombia e5 dibujada en `andes` con Colombia e5 medida.
- **Inventar un paisaje solo cabe bajo la marca 🟡.** `RACE_REGION.stages` (sección 6) le asigna a cada etapa `edicion` una zona; es juicio del contenido, no dato, y no choca con la doctrina porque nunca se presenta como dato: la ficha dice «relieve generado». Lo que la doctrina prohíbe es rellenar a ojo lo que se presenta como real, y eso no ocurre en ningún camino de 11.1.
- **PCS y Overpass están vetados** (`robots.txt`; mapa 05 §6 punto 4), así que la validación externa de forma no existe. La vara de lo generado son las 177 reales medidas con `scripts/medir-real.mjs` (instrumento, nunca fuente: decisión 40) y la galería del dueño (sección 16). `scripts/medir-real.mjs` lee solo lo publicado: una etapa real sin `climbs` no aporta bandas de puertos aunque tenga `elevation`.
- **Cargar es cambiar la carrera** (paso 7 del procedimiento de carga: Lieja pasó de ganarla un velocista 4 de 12 a un clasicómano 10 de 12). Convertir una `edicion` en `real` es trabajo de E12 y se hace con medida; E1 deja preparado el sitio: `routeSource` cambia solo, la huella de 11.3 gana una fila y `routeCensus` mueve el recuento 177 / 226 / 1.015 con causa. Lo que E1 no hace (no carga dato, no crea el Mundial ni grandes vueltas generadas) está en la sección 17, punto 15.
