## 11. Lo real frente a lo generado

El calendario de hoy tiene tres poblaciones y solo una la produce `profileGen.ts` entera. Medido sobre las 1.418 etapas de `SEASON_CALENDAR` (mapa 02 §9, `inventario-recorridos.md` l. 22-36): 177 etapas (12,5 %) tienen rasgos reales en `STAGE_FEATURES` y su relieve lo construye `featureProfile.ts`; 226 (15,9 %) pertenecen a una de las 60 ediciones de `RACE_EDITIONS` pero no tienen rasgos para esa etapa, así que tienen ciudades y kilómetros reales y relieve generado; y 1.015 (71,6 %) son enteramente obra del generador, de las cuales 532 son campeonatos nacionales. La gramática de motivos sustituye al generador en las dos últimas poblaciones y no toca la primera. Esta sección fija cómo se marca cada población, cómo se demuestra que lo real no se ha movido, cómo viaja la marca hasta la pantalla y cómo se reconcilia el `kind` entre el código, el congelado y la ficha.

Las líneas de código que cita esta sección están contadas sobre el HEAD `8553486` (el código es idéntico en `e94959b`, el HEAD del día de esta corrección: los commits posteriores solo tocan `docs/`), no sobre el `8585ca2` de los mapas: `calendar.ts` ganó 14 líneas desde entonces (`doubleAfter`, l. 79-92) y `calendarRun.ts` 28 (+2 hasta l. 1087 y +27 desde l. 1561, sección 0 §0.1), así que las citas de los mapas para esos dos ficheros no valen aquí. Quien implemente recita cada línea sobre su propio HEAD antes de tocarla; los nombres de función son la referencia estable, la línea es una ayuda.

### 11.1 La prioridad de `buildRace` no cambia; cada rama marca su origen

`buildRace` (`calendar.ts` l. 900-939) mira `RACE_EDITIONS[row.id]` antes que `row.stages` y `row.terrain` (l. 916-924), y dentro de `stagesFromEdition` (l. 230-240) mira `STAGE_FEATURES[id][i]` antes que el generador (l. 237: `f ? featureSpec(...) : oneDaySpec(...)`). Para una carrera de un día de tabla, `STAGE_FEATURES[row.id]?.[0]` decide entre `featureSpec` y `oneDaySpec` (l. 930-931). Ese orden (edición real > rasgos reales > generado) se conserva tal cual; lo que cambia es que cada rama declara de dónde viene y a qué gramática va:

| Rama de `buildRace`                                                             | Condición                                        | `routeSource` de la etapa | Quién dibuja                                                                                                                                                                                                                                                                                                                | Esqueleto                                                                                                                                                                                                                  | Semilla de dibujo                                                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `featureSpec` (l. 210-223), en edición o en un día                              | `STAGE_FEATURES[id][i]` existe                   | `real`                    | `buildFeatureProfile` (`featureProfile.ts` l. 362-375), sin cambios                                                                                                                                                                                                                                                         | ninguno; `arch` es `undefined`                                                                                                                                                                                             | `${from}\|${to}\|${km}` o `row.id`, como hoy; `season` no entra                                                        |
| `stagesFromEdition` sin rasgos (l. 237, rama `oneDaySpec`)                      | edición en `RACE_EDITIONS`, `features?.[i]` nulo | `edicion`                 | `generateStage` con `km` de la edición como contrato: hoy al kilómetro entero (`calendar.test.ts` l. 140-152, `expect(Math.round(km)).toBe(edition.stages[i].km)`), y desde el paso 8 al 0,1 (`toBeCloseTo(edition.stages[i].km, 1)`), porque `normalizeEnlaces` cuadra al 0,1 y las reales ya cuadran por `normalizeTotal` | uno de ETAPA por `EditionTerrain`: `flat → et_llana`, `hilly → et_media_*`, `mountain → et_reina_*`, `itt → et_crono`; `cobbles → ud_adoquin_ligero` (única excepción, tres etapas, abajo; tabla completa en la sección 5) | `${raceId}\|e${i}\|${editionKey}` con `editionKey = ${from}\|${to}\|${km}`; `season` solo en `dib` (decisión de abajo) |
| un día de tabla sin rasgos (l. 925-933)                                         | sin edición, `row.stages ≤ 1`, sin rasgos        | `generado`                | `generateStage` con `role: 'un_dia'` y `km` de `ARCH.km.porClase` salvo fila con `km` explícito (`row.km ?? 210`, l. 929)                                                                                                                                                                                                   | los 16 de un día por `regionOf(raceId, 1, country)`                                                                                                                                                                        | `arch\|raceId\|1`, `firma\|raceId\|1`, `ed\|raceId\|1\|season`                                                         |
| vuelta de tabla (l. 934-938)                                                    | sin edición, `row.stages ≥ 2`                    | `generado`                | `composeTour` y `generateStage` por etapa                                                                                                                                                                                                                                                                                   | los 16 de etapa por `itinerarioDe`                                                                                                                                                                                         | ídem, por etapa                                                                                                        |
| `nationalChampionships` (l. 330-376; `flatMap` sobre `COUNTRIES` en l. 379-381) | los 532 `.NC`                                    | `generado`                | `generateStage` con `nc_ruta` o `nc_crono` y `zonaDe(code)`                                                                                                                                                                                                                                                                 | `nc_ruta`, `nc_crono`                                                                                                                                                                                                      | ídem                                                                                                                   |

Dos consecuencias que hoy no se cumplen y a partir del paso 8 sí. La primera: una etapa de edición sin rasgos ya no pasa por `oneDaySpec` (l. 414-422) ni por `mountainOneDay` (l. 157-166), que es la causa del defecto de Colombia e5 (una reina de vuelta dibujada con plantilla de un día, con 18 km tras la cota contra los "47 km rodadores" que declara el `why` de `REAL_QUEENS`, mapa 06 §1 y §6.1); recibe un esqueleto de etapa y la zona por etapa de `RACE_REGION[raceId].stages[i]` (sección 6). La segunda: dos etapas de carreras distintas con la misma salida, meta y distancia ya no dibujan lo mismo, porque la semilla lleva el `raceId` delante (mapa 02 §7 documenta la colisión de hoy con `${from}|${to}|${km}` a secas).

La excepción del adoquín, con su cifra: `EditionTerrain` admite `cobbles` (`editions.ts` l. 10) y el catálogo de la sección 5 no tiene ningún esqueleto de ETAPA adoquinado (los 16 `et_*` son llana, media, reina y cronos). Hay cuatro etapas de edición con `terrain: 'cobbles'` (`editions.ts` l. 86 `race-spain` e6, l. 217 `race-belgium` e5, l. 225 `race-benelux` e3, l. 415 `race-hauts-de-france` e3); la de `race-spain` tiene rasgos (`stageFeatures.ts` l. 1739, las 21 de España son `real`) y las otras tres no (`race-belgium`, `race-benelux` y `race-hauts-de-france` no tienen clave en `stageFeatures.ts` ni en `classicRoutes.ts`). Esas tres etapas `edicion` llevan `ud_adoquin_ligero` por la fila `cobbles` de `POR_TERRENO_EDICION` (sección 5 §5.8: `{ ids: ['ud_adoquin_ligero'], papel: 'llana' }`, sin `fixed`, que es solo de bancos, §3.7), porque una etapa de adoquín con racimos de sectores y esprint es exactamente esa forma y añadir un `et_adoquin` al catálogo sería un esqueleto para tres etapas. La regla I-9 ("una etapa de edición nunca lleva esqueleto de un día") se escribe con esa excepción y la cifra 3 sellada en `grammar/calendario.test.ts` (§11.4); si alguna vez una edición nueva trae más `cobbles`, el test lo cuenta y obliga a decidir.

Y una decisión sobre qué mueve la temporada en las 226 `edicion`: SOLO el dibujo (`dib`). El jitter de km está excluido por la decisión 22; `motivoNuevo` y `vueltasJitter` se excluyen aquí con su razón, y la sección 10 ya lo construye así (`ed|${raceId}|e${i}|${editionKey}|0`, sin `season`, y `cambiosRespectoAnterior = []` para toda `edicion`): lo único real de esas etapas son las ciudades y la distancia; anunciar "una cota más" entre las mismas ciudades sería prometer un dato que no existe, y E12 va a sustituir ese relieve por el real (§11.7, regla 5), así que no merece identidad de edición. Es, en efecto, azar en el detalle y no en la arquitectura, pero en una población cuya arquitectura no es nuestra: la etapa es la misma etapa, con la misma forma, y solo se redibuja.

La regla de `fuentes-recorridos.md` manda sobre la gramática: una carrera con rasgos PARCIALES sigue exactamente como hoy. El Guangxi solo carga el final de la etapa 5 (`classicRoutes.ts` l. 288-302, mapa 02 §9): esa etapa es `real` y las otras cinco son `edicion`; `race-france` es `real` en 20 etapas y `edicion` en la e21 (mapa 06 §1). La gramática no inventa nada sobre una etapa con dato, y no lee `STAGE_FEATURES` para nada que no sea decidir la rama.

Por carrera, el origen se agrega con tres valores, y `mixto` es SOLO de carrera, nunca de etapa (la propuesta que lo usaba por etapa queda traducida así):

```ts
// packages/engine/src/routes/grammar/generate.ts
export type RouteSource = 'real' | 'edicion' | 'generado' // por etapa
export type RaceRouteSource = 'real' | 'mixto' | 'generado' // por carrera, agregado

export function raceRouteSourceOf(
  stages: readonly { routeSource: RouteSource }[],
): RaceRouteSource {
  const set = new Set(stages.map((s) => s.routeSource)) // la misma de §3.11: una carrera toda `edicion` es `mixto`
  if (set.size === 1 && set.has('real')) return 'real'
  if (set.size === 1 && set.has('generado')) return 'generado'
  return 'mixto'
}
```

`StageSpec` (y con él `CalendarStage`) gana `routeSource: RouteSource` y `arch?: GeneratedStage['arch']` (`undefined` en las `real`, §3.11); `CalendarRace` gana `routeSource: RaceRouteSource` calculado con `raceRouteSourceOf` en `buildRace`. Con el calendario de hoy, medido por script en el paso 0 y sellado en `grammar/calendario.test.ts`: 177 / 226 / 1.015 por etapa, y por carrera 842, con 41 que tienen alguna etapa `real` (las 15 clásicas de `CLASSIC_FEATURES`, las cinco cargadas directamente en `stageFeatures.ts` y las 21 con edición y rasgos, mapa 02 §9) más las 39 de `RACE_EDITIONS` sin ninguna fila en `STAGE_FEATURES`, que son `mixto` por la regla de §3.11 (toda `edicion`). El reparto exacto entre `real` y `mixto` de esas 41 lo imprime el test y no se escribe aquí de memoria: depende de qué vueltas tienen rasgos en TODAS sus etapas (Italia y España 21 de 21, Francia 20 de 21, mapa 06 §1).

### 11.2 `featureProfile.ts` no se toca en E1, y la deuda de los dos rellenos

Decisión 27: ninguna línea de `featureProfile.ts`, `classicRoutes.ts`, `stageFeatures.ts` ni `editions.ts` cambia en E1. La razón no es pereza sino que las 177 etapas reales son la vara del banco: sobre ellas están medidas `erosion.longClassicFresh` (Flandes) y `erosion.hardestClassicFresh` (Lombardía), `realQueenThirdWeek` (Francia e18), `italy9SummitFinishes`, las 18 de un día WT de la saturación y las siete reinas de `race-france` que mide `grandTour` (mapa 06 §5), y `routes/featureProfile.test.ts` y `classicRoutes.test.ts` (mapa 06 §2.4) sellan su construcción segmento a segmento. Cualquier cambio en cómo se rellena la carretera anónima entre dos puertos publicados mueve esas bandas sin que el generador haya cambiado, y este documento se compromete a que "si se mueven, el rediseño ha tocado el motor y no el generador" (mapa 06 §5).

El coste de no tocarlo es tener dos rellenos distintos para dos poblaciones del mismo calendario (riesgo 9 de cobertura), y se escribe con sus números para que nadie lo descubra después:

|                           | Etapas reales (177)                                                                                                                                                                          | Etapas generadas y de edición (1.241)                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Función de relleno        | `rollingFill(gap, seed, amplitud)` (`featureProfile.ts` l. 158-176): tramos de `1,4 + U·2,2` km a `±(0,4 + U·2,4)·amplitud` %, signo al 50 % (mapa 01 §6)                                    | motivo `enlace` rendido con `rolling(rand, km, amp, 0)` y `amp = GeoSignature.amplitud` (sección 4)                                                  |
| De dónde sale la amplitud | `RELIEF.rollingAmplitude` por TERRENO: flat 0,55, itt 0,55, cobbles 0,7, hilly 0,85, classic 1,0, mountain 1,15 (`constants.ts` l. 1215-1222, mapa 01 §3)                                    | `ZONAS[zona].amplitud` por ZONA, con tope `ARCH.motivo.enlace.ampMax` 2,4 (sección 6)                                                                |
| Cuadre de la distancia    | `normalizeTotal` (l. 179-188) estira o encoge el ÚLTIMO segmento, que es relleno de cola salvo en final en alto, donde es el puerto (lo que `profileGen::normalize` dejó de hacer en la v64) | `normalizeEnlaces` reparte solo entre enlaces, residuo al enlace más largo, y `garantizaClase` con la guarda `segment.km === Σ tramos` (decisión 10) |
| Bajadas                   | `descentSegment` (l. 145) de `min(0,65·hueco, max(1, prevGainM/55))` km al 85 % de lo subido, topada a −12 % (`MAX_DESCENT_GRADIENT`, l. 142)                                                | motivo `descenso` con `ARCH.motivo.descenso.kmPorDesnivel` `clamp(len·g·10/55, 2, 10)` y `g` en [−8; −3]                                             |
| Quién decide la clase     | nadie: `stageKindOf` sobre un perfil real usa la red de 3.200 m (`stageKind.ts` l. 56-58 y l. 90) y la etiqueta es la declarada por `TERRAIN_KIND` (`calendar.ts` l. 197-204)                | V6 y V7: `stageKindOf(profile).kind === Skeleton.kind` por construcción o reintento                                                                  |

Unificar los dos rellenos es un paso propio POSTERIOR a E1 y se anota como riesgo 7 en la sección 17. Lo que ese paso movería, para que se presupueste con la cifra delante: la huella de las 177 (§11.3, que habría que re-sellar entera con causa), `erosion.longClassicFresh` y `erosion.hardestClassicFresh` (el relleno de Flandes y Lombardía cambia de amplitud y por tanto el desgaste), `realQueenThirdWeek`, y la comparación de desnivel de `classicRoutes.test.ts` (entre 4 y 30 m/km). El único punto de contacto que E1 sí abre es de lectura: `routeCensus` (sección 13) mide a las 177 reales las mismas columnas que a las generadas (`dPlus`, `lastClimbKm`, `kmAfterLastClimb`, `finishType`, y `kindLeido`, §11.6), para que la tabla p10/p50/p90 de `scripts/medir-real.mjs` (decisión 40) y la del censo hablen el mismo idioma. La columna `kmAfterLastClimb` del censo es la de `finalKind.ts` l. 65-69 (lee pancartas `cima` y devuelve `null` sin cota), la misma que usa `finalKindOf`; no es la regla de la etiqueta (§11.5, regla 2), y las dos conviven a propósito.

### 11.3 La huella FNV: lo real se sella antes de tocar `calendar.ts` y se comprueba después

Decisión 28. Antes de que ningún paso modifique `calendar.ts` (es decir, en el paso 1, antes de reducir `profileGen.ts`), se escribe `packages/engine/src/routes/realFingerprint.test.ts` con dos sellos:

1. **Las 177 etapas con rasgos**, una a una: `raceId`, `index`, `km` al 0,1, número de segmentos y un hash FNV-1a del JSON canónico de `profile.segments`. El hash es `hashInt` de `profileGen.ts` l. 15-22 (FNV-1a de una cadena, mapa 01 §1), que HOY es privada (l. 15 es `function hashInt(s: string)` sin `export`; solo `routeRng` l. 30 y los ocho `xxxSegments` se exportan, y `packages/engine/src/index.ts` tampoco la reexporta): el paso 1 la exporta junto con `between`, `split`, `climb`, `descent` y `rolling` (sección 15, paso 1, "Código"), en el mismo cambio en que se escribe este test, y el paso 8 solo las conserva exportadas al retirar los ocho `xxxSegments`. La función es `huellaFNV(profile) = hashInt(JSON.stringify(profile.segments))`, exportada desde `profileGen.ts` junto a `hashInt` (sección 3, §3.12) y no desde este test, porque `edition.test.ts` y `frozenSkeletons.test.ts` también la usan. La entrada es `JSON.stringify(segments)` con las claves en el orden en que `featureProfile.ts` las escribe, sin reordenar (así el sello detecta hasta un cambio de orden de claves; para comparar con el congelado `jsonb` de `race_routes`, que sí reordena claves, se usa la huella canónica de §11.4, no esta).
2. **Las tres grandes vueltas enteras** (`race-france`, `race-italy`, `race-spain`): estructura de las 21 etapas (`kind`, `label`, `timeTrial`, `km`, `restAfter`) y la huella de perfil de cada etapa `real`. La e21 de `race-france` es `edicion` (mapa 06 §1): su ESTRUCTURA se sella y su perfil no, porque cambia en el paso 8 al pasar por `et_llana`. Con el sello del paso 8 (§11.4) se comprueba que sigue siendo `llana` y de 130 km (`editions.ts`, Thoiry a París); lo que dibuje dentro es asunto de la gramática.

El fichero de huellas es un literal TypeScript generado por script y pegado (no un fichero regenerable que el test lea, porque entonces regenerarlo taparía el fallo): `routes/realFingerprint.sealed.ts`, 177 filas de etapa y tres bloques de 21 (con `huella: null` en la e21 de Francia). El test corre en `test:rapido` (coste: una carga de `SEASON_CALENDAR`, 578 ms medidos por el juez del motor §1, más 239 hashes), sobrevive al paso 8 y sigue para siempre; es el test que permite decir "lo real no se ha movido" sin leer 177 perfiles a mano.

```ts
// packages/engine/src/routes/realFingerprint.test.ts (paso 1; sobrevive al paso 8)
import { describe, expect, it } from 'vitest' // vitest.config.ts no activa `globals`
import { SEASON_CALENDAR } from './calendar.js'
import { profileKm } from './finalKind.js' // l. 60-63: Σ s.km
import { huellaFNV } from './profileGen.js' // exportada en este mismo paso (§3.12): FNV-1a de JSON.stringify(profile.segments)
import { STAGE_FEATURES } from './stageFeatures.js' // Record<string, (StageFeatures | null)[]>, l. 15
import { GRANDES_VUELTAS, SELLADAS } from './realFingerprint.sealed.js'

describe('lo real no se mueve', () => {
  it('las 177 etapas con rasgos tienen la huella sellada', () => {
    const vistas: string[] = []
    for (const race of SEASON_CALENDAR) {
      for (const stage of race.stages) {
        const hit = STAGE_FEATURES[race.id]?.[stage.index - 1] // un día: índice 0; edición: índice i
        if (!hit) continue
        const key = `${race.id}:${stage.index}`
        vistas.push(key)
        const s = SELLADAS[key]
        expect(s, key).toBeDefined()
        expect(stage.profile.segments.length, key).toBe(s!.nSegmentos)
        expect(profileKm(stage.profile), key).toBeCloseTo(s!.km, 1)
        expect(huellaFNV(stage.profile), key).toBe(s!.huella)
      }
    }
    expect(vistas.length).toBe(177)
  })
  it('las tres grandes vueltas conservan estructura, y perfil en sus etapas reales', () => {
    for (const [id, gv] of Object.entries(GRANDES_VUELTAS)) {
      const race = SEASON_CALENDAR.find((r) => r.id === id)!
      expect(race.stages.length).toBe(21)
      expect(race.restAfter).toEqual(gv.restAfter)
      race.stages.forEach((st, i) => {
        const e = gv.etapas[i]!
        expect([st.kind, st.label, st.timeTrial ?? false, profileKm(st.profile)]).toEqual([
          e.kind,
          e.label,
          e.timeTrial,
          e.km,
        ])
        if (e.huella !== null) expect(huellaFNV(st.profile), `${id}:${i + 1}`).toBe(e.huella)
      })
    }
  })
})
```

Aparte y con vida corta, `routes/golden.test.ts` sella en el paso 1 las 1.418 huellas del calendario entero (`GOLDEN` de `routes/golden.sealed.ts`, incluidas las generadas por los builders legado de `grammar/legacy.ts`); en el paso 8, con la misma cirugía que retira los ocho `xxxSegments`, sus huellas pasan con `git mv` a `sim/legacy/golden.test.ts` y `sim/legacy/golden.sealed.ts`, que exigen que `legacyCalendar()` las reproduzca, y se borran con `sim/legacy/` al cerrar el paso 9 (§3.12, §15.10): su función es demostrar que el paso 1 (extraer primitivas y mover los builders) no cambia un solo segmento, y a partir del paso 8 ya no tiene nada que sellar. Que las 177 reales no dependan de la temporada se sella en `grammar/edition.test.ts` (sección 10): para `season` en [0; 5], `huellaFNV(stagesForSeason(id, season)[i].profile)` es idéntica en toda etapa con `routeSource === 'real'`.

### 11.4 `routeSource` viaja hasta la pantalla: base, API, web e inventario

Hoy `race_routes.route_source` recibe `'generado'` fijo (`db/raceRoutes.ts` l. 48-51: "el calendario no declara todavía de dónde viene cada recorrido"), el tipo `RouteSource` de l. 29 tiene dos valores, y la columna es `text` con default (`schema.ts` l. 541). Por eso los tres valores NO exigen migración por el tipo: se cambia el tipo TypeScript y el valor escrito. Lo que sí trae migración son las columnas `kind`, `label`, `time_trial` y `arch` de la decisión 23 (todas nullable, porque las filas congeladas antes del paso 10 no las tienen; `arch` como `jsonb`, sección 3 §3.11 y sección 10), que viajan en la misma fila: se añaden a `raceRoutes` en `packages/db/src/schema.ts` l. 530-544 y la migración se GENERA con `pnpm --filter db db:generate` (`drizzle-kit generate`, `packages/db/package.json` l. 21; `db:migrate` en l. 22) en `packages/db/drizzle/` (hoy la última es `0040_ordenes_del_paso_17a.sql`; la nueva es `00NN_race_routes_kind.sql`, con `NN` el siguiente número libre, hoy `0041`, y el nombre fijado con `--name race_routes_kind` como en §15.12, con su snapshot en `drizzle/meta/` y su entrada en `drizzle/meta/_journal.json`), porque `Claude.md` l. 14 manda "Migraciones solo con drizzle-kit; nunca SQL manual en producción". El directorio `packages/db/migrations/` de §B.1 no existe.

```ts
// packages/db/src/raceRoutes.ts (paso 10)
import { RACE_EDITIONS, hashInt, raceForSeason, stagesForSeason } from '@cyclingstar/engine'
export type RouteSource = 'real' | 'edicion' | 'generado' // mismo tipo que grammar/generate.ts, reexportado

/** La temporada del sufijo `:s{n}` del raceKey (`calendarRun.ts` l. 144, 785, 1585); 0 si no lo lleva. */
export function seasonOfRaceKey(raceKey: string): number {
  return Number(raceKey.split(':s')[1] ?? 0)
}

export async function freezeRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<void> {
  const race = raceForSeason(raceId, season) // nunca SEASON_CALENDAR (decisión 23); lanza
  // Error('carrera desconocida') si el id no existe (sección 10):
  // un raceKey huérfano es un error de datos, no un caso
  const filas = race.stages.map((stage, i) => ({
    worldId,
    raceKey,
    stageDay: i + 1,
    profile: stage.profile,
    routeSource: stage.routeSource, // 'real' | 'edicion' | 'generado'
    kind: stage.kind,
    label: stage.label,
    timeTrial: stage.timeTrial ?? false,
    arch: stage.arch ?? null, // null en las `real` (FrozenStage, sección 10)
  }))
  if (filas.length === 0) return
  await db.insert(raceRoutes).values(filas).onConflictDoNothing()
}
```

`freezeRaceRoute` sigue siendo idempotente (`onConflictDoNothing`, l. 54). Las tres llamadas que existen pasan `season` así: `calendarRun.ts` l. 1630 (`freezeRaceRoute(tx, worldId, raceKey, race.id)`) añade la `season` que ya tiene en ámbito (l. 1585 compone `${race.id}:s${season}` con ella); `backfillRaceRoutes` (l. 91-109, llamada en l. 105) añade `seasonOfRaceKey(raceKey)`, porque la única fuente de temporada de un backfill es el propio `raceKey`; y `recorridoDelMundo.test.ts` l. 57 y 69 pasan `0` explícito (sus claves son `${race.id}:s0`). El backfill se corre ANTES del paso 8 en todo mundo vivo con la firma de HOY (decisión 45), porque congela "con el generador ACTUAL a propósito" (l. 88-89) y una vuelta creada antes de la tabla y no rellenada cambiaría de recorrido a mitad (mapa 03 §9, caso 3); la firma nueva no lo toca hasta el paso 10.

Lo que el backfill deja escrito no es honesto y hay que decirlo con las palabras del propio fichero: se escribía `'generado'` "porque hay seis carreras con datos reales y no hay forma de distinguirlas sin el campo" (l. 48-50). Un mundo vivo tiene, por tanto, el Tour, el Giro y la Vuelta congelados como `'generado'`, y la web de abajo diría "Recorrido generado" debajo de ellos: lo contrario de "lo real manda y se ve". Por eso el paso 10 trae, junto al tipo nuevo, una reclasificación de datos que se corre una vez por mundo y que solo toca `route_source`. Se exporta igual que `backfillRaceRoutes` (`packages/db/src/index.ts` l. 203, que es solo la exportación: hoy `backfillRaceRoutes` no tiene ningún llamante en producción, lo invoca únicamente `recorridoDelMundo.test.ts` l. 90-102) y se corre desde el mismo procedimiento de `docs/ops.md` con el que la sección 15 (regla 5) corre el backfill, con un script de una línea sobre `dist` que llame a las dos en ese orden:

```ts
// packages/db/src/raceRoutes.ts (paso 10)
/** Igual que `canonico()` de recorridoDelMundo.test.ts l. 28-34 (claves ordenadas): el jsonb no conserva el orden. */
export function canonico(x: unknown): string {
  /* se mueve aquí desde el test, que pasa a importarla */
}
export const huellaCanonica = (p: StageProfile) => hashInt(canonico(p.segments))

export async function reclassifyRouteSource(
  db: Conn,
  worldId: string,
): Promise<Record<RouteSource, number>> {
  const cuenta = { real: 0, edicion: 0, generado: 0 }
  const filas = await db.select().from(raceRoutes).where(eq(raceRoutes.worldId, worldId))
  for (const fila of filas) {
    const raceId = fila.raceKey.split(':')[0]!
    const st = stagesForSeason(raceId, seasonOfRaceKey(fila.raceKey))[fila.stageDay - 1]
    const nuevo: RouteSource =
      st?.routeSource === 'real' && huellaCanonica(fila.profile) === huellaCanonica(st.profile)
        ? 'real'
        : RACE_EDITIONS[raceId]
          ? 'edicion'
          : 'generado'
    cuenta[nuevo] += 1
    if (nuevo !== fila.routeSource)
      await db
        .update(raceRoutes)
        .set({ routeSource: nuevo })
        .where(
          and(
            eq(raceRoutes.worldId, worldId),
            eq(raceRoutes.raceKey, fila.raceKey),
            eq(raceRoutes.stageDay, fila.stageDay),
          ),
        ) // la clave primaria (schema.ts l. 543)
  }
  return cuenta
}
```

La regla es la de §11.1 aplicada al pasado: una fila es `real` solo si su perfil es, byte a byte en forma canónica, el que hoy produce `featureProfile.ts` (que no cambia, decisión 27, así que la huella coincide para toda etapa congelada después de cargar sus rasgos); una fila de una carrera con `RACE_EDITIONS` cuyo perfil no coincide es `edicion` (sus ciudades y km eran reales también cuando la congeló el generador viejo: el test l. 140-153 lo garantizaba al km); el resto queda `generado`. Las columnas `kind`, `label`, `time_trial` y `arch` NO se rellenan hacia atrás (para una fila vieja el `kind` de `stagesForSeason` describiría el generador nuevo y no el perfil congelado, y el `arch` no existía): los lectores de §11.5 caen a `stagesForSeason` cuando son `null`. La cuenta que devuelve se anota en `docs/ops.md` el día que se corra, y es idempotente: correrla dos veces cambia 0 filas la segunda.

De ahí hacia fuera, cuatro lectores y un texto por valor:

| Dónde                                                    | Qué expone                                                                                                                                                                                                                                                                                                                                                                                                                | Regla                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/routes/calendar.ts` l. 91-109 (`planFrom`) | por etapa: `routeSource`, `arch.frase`, `arch.skeleton`, `arch.geo`, `arch.metadatos`, `edicion` (= `season + 1`) y `cambiosRespectoAnterior: string[]` = `diffMotivos(prevArch.motivos, arch.motivos)` (sección 10 §10.8, decisión 39: los motivos no firma que difieren de la temporada anterior, una frase por diferencia; `[]` en `real`, en toda `edicion` y en la temporada 0); por carrera: `routeSource` agregado | la altimetría de una etapa NO corrida lee `run?.profile ?? frozen?.profile ?? stagesForSeason(raceId, season)[i - 1].profile`, con `frozen` de `raceStagesForWorld` (función NUEVA del paso 10, definida en la sección 10: `raceStagesForWorld(db, worldId, raceKey, raceId, season)`; hoy solo existe `getRaceRoute(db, worldId, raceKey, stageDay)` por etapa, `raceRoutes.ts` l. 61), nunca `stage.profile` de `SEASON_CALENDAR` a secas (hoy l. 97 enseña el perfil del código, que puede no ser el congelado si el generador cambió en medio, mapa 03 §9 caso 4) |
| `apps/web/src/pages/Race.tsx`                            | una marca por etapa y una por carrera                                                                                                                                                                                                                                                                                                                                                                                     | tres textos exactos: `real` → "Recorrido real (fuente citada)", con la fuente de `classicRoutes.ts` cuando la hay; `edicion` → "Ciudades y distancia reales, relieve generado"; `generado` → "Recorrido generado". La carrera `mixto` dice "Recorrido parcialmente real: N de M etapas"                                                                                                                                                                                                                                                                               |
| ficha de una etapa `edicion` o `generado`                | la frase de arquitectura y "Edición N"                                                                                                                                                                                                                                                                                                                                                                                    | D10 con su valor por defecto (sección 18): siempre, no como opción; `real` no lleva frase ni edición (no varía)                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `scripts/inventario-recorridos.mjs`                      | ✅ / 🟡 / 🔴                                                                                                                                                                                                                                                                                                                                                                                                              | `provenance()` (l. 50-55) deja de deducir con `STAGE_FEATURES` y `RACE_EDITIONS` y lee `stage.routeSource`; el mapa es `real → ✅ Real`, `edicion → 🟡 Sin validar`, `generado → 🔴 Inventado`, y el script imprime además `arch.skeleton` y `arch.geo` en las no reales                                                                                                                                                                                                                                                                                              |

El texto de la ficha no promete lo que el motor no hace (decisión 17): `arch.metadatos = { viento, altitud }` (§B.2) son metadatos y no física, y el texto que sale de cada uno es este y no otro, en una tabla `TEXTO_METADATO` de `apps/api` que la web no reinterpreta:

| Metadato  | Valor                    | Texto de ficha       | Por qué así                                                                                                                             |
| --------- | ------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `viento`  | 0, 1                     | nada                 | no hay nada que anunciar                                                                                                                |
| `viento`  | 2, 3                     | "llano abierto"      | describe la carretera; el abanico sigue saliendo de `streams('viento')` en cualquier km de `llano` (mapa 03 §5.1) y no de este metadato |
| `altitud` | `mar`, `colina`, `media` | nada                 |                                                                                                                                         |
| `altitud` | `alta`, `altiplano`      | "puertos de altitud" | describe los puertos, no el aire: no hay altitud en `Segment` y el motor no simula el oxígeno (riesgo 1 de la sección 17)               |

Un test de `apps/api` (`routes/calendar.test.ts`) recorre las respuestas de las 1.418 etapas de la temporada 0 y afirma que ninguna `frase` ni texto de ficha contiene "abanico", "oxígeno", "hipoxia" ni "falta de aire", y que los únicos textos derivados de `metadatos` son los dos literales de la tabla. Y el inventario regenerado sobre la temporada 0 tiene que dar 177 / 226 / 1.015: es una aserción de `grammar/calendario.test.ts` en el paso 8, no una lectura.

```ts
// packages/engine/src/routes/grammar/calendario.test.ts (paso 8), extracto
import { describe, expect, it } from 'vitest'
import { calendarForSeason, BASE_SEASON } from './edition.js'
import { raceRouteSourceOf } from './generate.js'

it('el origen de cada etapa es el de su rama, y el recuento es el del inventario', () => {
  const cuenta = { real: 0, edicion: 0, generado: 0 }
  let adoquinDeEdicion = 0
  for (const race of calendarForSeason(BASE_SEASON)) {
    for (const st of race.stages) {
      cuenta[st.routeSource]++
      if (st.routeSource === 'real') expect(st.arch).toBeUndefined()
      else expect(st.arch?.skeleton).toBeDefined()
      if (st.routeSource === 'edicion') {
        // I-9: una etapa de edición lleva esqueleto de ETAPA, salvo las de terreno `cobbles`, que llevan
        // `ud_adoquin_ligero` porque no existe forma de etapa adoquinada (§11.1)
        const esUnDia = st.arch!.skeleton.startsWith('ud_')
        expect(esUnDia).toBe(st.arch!.skeleton === 'ud_adoquin_ligero')
        if (esUnDia) adoquinDeEdicion++
      }
    }
    expect(race.routeSource).toBe(raceRouteSourceOf(race.stages))
  }
  expect(cuenta).toEqual({ real: 177, edicion: 226, generado: 1015 })
  expect(adoquinDeEdicion).toBe(3) // race-belgium e5, race-benelux e3, race-hauts-de-france e3
})
```

### 11.5 Un `kind` y una etiqueta coherentes entre código, congelado y ficha

Hoy hay tres sitios que pueden discrepar sobre lo que es una etapa. (a) `SEASON_CALENDAR` declara `kind` y `label` por la rama (`TERRAIN_KIND` para reales y ediciones, el constructor para generadas), y `stageKindOf(profile)` no coincide en 72 etapas (juez motor §1, mapa 06 §2.1: `race-colombia e2` declarada `reina` y leída `media`). (b) `calendarRun.ts` l. 1641 pasa `kind: stage.kind` del código junto al perfil congelado (l. 1642, `profile: congelado ?? stage.profile`), `packages/db/src/callups.ts` l. 98 y `calendarRun.ts` l. 518 leen `raceVocationFit(race.stages.map((s) => s.kind))` de `SEASON_CALENDAR`, y `raceContext.ts::terrenoRestante` (definida en l. 56, llamada en l. 127) integra los km de subida que quedan sobre `stage.profile` del código, no del congelado (juez motor §5 riesgo 1). (c) `apps/api/src/stageHistory.ts::calendarStageSpec` (l. 101-118) corrige la etiqueta de `reina` y `media` con su propia regla, `runInAfterLastClimb(segments) <= SUMMIT_RUN_IN_KM` (l. 73 y l. 76-88: 5 km de carretera tras el último segmento `puerto`, de cualquier longitud, `Infinity` sin puertos), mientras `stageKindOf` decide `Summit finish` por "el último segmento es `puerto`" (`stageKind.ts` l. 84): son dos reglas distintas, y una `reina` `cima_cerca` con [0,5; 5] km de valle es `Mountains` para una y `Summit finish` para la otra, así que cuenta en el 49 de `stageHistory.test.ts` l. 206 aunque `kind` se lea del perfil (juez motor §5 riesgo 2).

Decisión 23, en cuatro reglas:

1. **`kind` de toda etapa generada o de edición es `stageKindOf(profile, timeTrial).kind`**, garantizado por V6 en `verify` (reintento y, si se agota `ARCH.colocacion.maxIntentos` 8, plantilla canónica, que pasa V6 por construcción). El `kind` deja de ser una declaración del constructor y pasa a ser una lectura del perfil; en lo `real` sigue siendo el de `TERRAIN_KIND`, y la discrepancia que eso deja se mide (§11.6).
2. **Una sola regla para `Summit finish`, y dos variables donde hoy hay una.** `runInAfterLastClimb(segments)` se MUEVE tal cual de `stageHistory.ts` l. 76-88 a `stageKind.ts` con ese nombre (segmentos puros, cualquier `puerto`, `Infinity` sin puertos), junto a `SUMMIT_RUN_IN_KM = 5` exportada y con la medida de `stageHistory.ts` l. 54-72 delante (cola ≤ 5 km: mediana 3 juntos en meta, velocista 15 %, indistinguible del control; cola > 5 km: 17 juntos y 46 %); `stageHistory.ts` las importa de `@cyclingstar/engine` (reexportadas en `packages/engine/src/index.ts` junto a `stageKindOf`, l. 89). Dentro de `stageKindOf` el booleano `summitFinish` de l. 84 hace hoy DOS cosas: decide la rama `clasica` (l. 88, `if (!summitFinish && longest <= WALL_MAX_KM)`) y decide la etiqueta (l. 91-97). Se parte en dos, porque sustituirlo por la regla de 5 km cambiaría el `kind` de una clásica de muros cuyo último muro corona a 4 km de meta (pasaría de `clasica` a `media`, en reales y generadas, contra la decisión 26):

   ```ts
   // packages/engine/src/routes/stageKind.ts (paso 8)
   export const SUMMIT_RUN_IN_KM = 5
   export function runInAfterLastClimb(segments: readonly Segment[]): number {
     /* el cuerpo de stageHistory.ts l. 76-88, sin cambios */
   }
   // dentro de stageKindOf, en lugar de l. 84:
   const meteEnAlto = segments[segments.length - 1]?.tipo === 'puerto' // decide SOLO la rama clasica (l. 88), como hoy
   const cimaCerca = runInAfterLastClimb(segments) <= SUMMIT_RUN_IN_KM // decide SOLO la etiqueta (l. 91-97)
   if (!meteEnAlto && longest <= WALL_MAX_KM) return { kind: 'clasica', label: 'Classic' }
   if (longest >= PASS_MIN_KM || metres >= QUEEN_MIN_CLIMB_METRES)
     return cimaCerca
       ? { kind: 'reina', label: 'Summit finish' }
       : { kind: 'reina', label: 'Mountains' }
   return cimaCerca ? { kind: 'media', label: 'Uphill finish' } : { kind: 'media', label: 'Hills' }
   ```

   `kind` NO cambia de regla: 8,5 / 3.200 / 3 siguen donde están (decisión 26), y `meteEnAlto` implica `cimaCerca` (cola 0), así que ninguna etapa que hoy es `Summit finish` deja de serlo. La otra función con nombre parecido, `kmAfterLastClimb(profile): number | null` de `finalKind.ts` l. 65-69, NO cambia y no se usa para la etiqueta: lee primero las pancartas `cima` (`lastClimbKm`, l. 46-57; `auto()` las redondea al km entero, `calendar.ts` l. 107-116) y solo sin pancartas cae al último `puerto` de ≥ `CLIMB_MIN_KM` 1,5, y devuelve `null` sin cota. Conviven porque miden cosas distintas: la etiqueta mira el último segmento que sube (un muro de meta de 1,2 km sin pancarta es "final en alto" para la ficha, y así lo corre el motor), y la cubeta de `finalKindOf` mira el GPM anunciado (decisión 25: `emitirPancartas` pone `cima` en el último `puerto`, y esa pancarta redondeada puede desplazar hasta 0,5 km la cola medida, que `margenValleKm` 0,7 cubre). `stageKind.test.ts` se reescribe en el mismo paso 8 (sus generadores desaparecen) con perfiles literales: un perfil que acaba en `puerto` de 1 km con 2 km de llano detrás sigue siendo `clasica / Classic`; una reina con 3 km de valle tras el último puerto es `Summit finish` y con 6 km `Mountains`; una media con 4 km de valle es `Uphill finish`; y la plantilla canónica de `ud_muros` con 300 semillas sigue `clasica` (V6 lo garantiza, el test lo mide).

3. **La etiqueta nace una sola vez y `calendarStageSpec` deja de reetiquetar por su cuenta.** Un solo mecanismo, que las secciones 3, 5, 8, 9 y 14 repiten: `generateStage` calcula `label = labelDe(sk, profile, timeTrial)` DESPUÉS de que V6 haya igualado el `kind`, donde

   ```ts
   // packages/engine/src/routes/grammar/generate.ts
   /** Las cinco etiquetas de la decisión 38, que `stageKindOf` no puede deducir de un perfil. */
   export const ETIQUETAS_DE_ESQUELETO: ReadonlySet<string> = new Set([
     'Circuit',
     'Wall finish',
     'Prologue',
     'Hill climb',
     'Mountains classic',
   ])
   export function labelDe(sk: Skeleton, profile: StageProfile, timeTrial: boolean): string {
     return ETIQUETAS_DE_ESQUELETO.has(sk.label) ? sk.label : stageKindOf(profile, timeTrial).label
   }
   ```

   Es decir: las cinco etiquetas nuevas las pone el esqueleto (solo él puede saber que hay un circuito), y las ocho de `stageKindOf` las dicta el perfil con la regla 2. Para toda instancia válida del catálogo las dos cosas coinciden, y no por casualidad: los esqueletos con etiqueta de las ocho llevan la meta a más de 0,7 km de los 5 km por el lado que su etiqueta dice (`et_reina_cima_cerca`, `Summit finish`, corona a [1,2; 4,3] km; `et_reina_valle`, `Mountains`, a [5,7; 19,3]; `ud_esprint_capi`, `Hills`, a [5,7; 8]; sección 5), y `ud_montana` (`aMeta` [3; 17]) lleva `Mountains classic`, una de las cinco, así que su etiqueta no depende de dónde caiga la cota. `labelDe` existe para que esa coincidencia sea CALCULADA y no confiada: si un jitter de edición o una plantilla degradada dejara una cota a 5,5 km de meta, la ficha diría `Mountains` y el motor correría eso mismo, en vez de heredar un `Summit finish` de catálogo. `Skeleton.label` sigue siendo la etiqueta del catálogo y `skeletons.test.ts` sella su compatibilidad: para los esqueletos con etiqueta de las ocho, `stageKindOf(canonico, timeTrial).label === sk.label` (y lo mismo en cada alternativa); para los de las cinco, solo `kind`. Ninguna etapa generada puede tener una etiqueta que contradiga su `kind`, porque las cinco nuevas están casadas con un `kind` en el catálogo y las ocho salen del propio clasificador. `stageKindOf` no aprende ninguna etiqueta (decisión 26). Las secciones 3 (§3.3 y `GeneratedStage.label`), 5 (`Skeleton.label`), 8 (§8.13) y 14 (§14.6) escriben hoy "`label = sk.label` puesta tras V6"; con el catálogo de la sección 5 eso da el mismo resultado que `labelDe` en todas las instancias, pero el mecanismo es este, y esas cuatro secciones lo citan como `labelDe(sk, profile, timeTrial)` (la coincidencia sellada en `skeletons.test.ts` es lo que permite a §14.6 seguir tratando `label` como perezosa sin coste: el getter llama a `labelDe` sobre el perfil ya dibujado). Con eso `calendarStageSpec` queda así: para una etapa con `routeSource !== 'real'` devuelve `stage.label` tal cual (ya es la de `labelDe`, congelada en `race_routes.label`); para una `real` hace lo que hace hoy y ni una cosa más: si `stage.kind ∉ {reina, media}` (`SUMMIT_FINISH`, l. 51) devuelve `stage.label`, y si está, elige entre las DOS etiquetas del `kind` declarado con la regla importada (`runInAfterLastClimb(profile.segments) <= SUMMIT_RUN_IN_KM ? SUMMIT_FINISH[kind] : NO_SUMMIT_FINISH[kind]`). Nunca aplica a una real la etiqueta de OTRO `kind` (una `mountain` de edición que `stageKindOf` lee `media`, 11 de 54 en §11.6, seguiría diciendo `reina / Hills`, que es la contradicción que el test de abajo vigila; y una llana real con una cota corta pasaría a `Classic` cambiando lo que el jugador ve en carreras reales que el dueño pidió respetar).

4. **Los cuatro lectores leen el congelado**: `calendarRun.ts` l. 1641-1642 pasa `kind: congelado?.kind ?? stage.kind`, `timeTrial: congelado?.timeTrial ?? stage.timeTrial` y `profile: congelado?.profile ?? stage.profile` con `stage` de `stagesForSeason(race.id, season)`; `packages/db/src/callups.ts` l. 98, `calendarRun.ts` l. 518 y `raceContext.ts` l. 127 reciben las etapas de `raceStagesForWorld(db, worldId, raceKey, raceId, season)` (nueva, sección 10) y solo si no hay fila, o la fila no tiene `kind` (congelada antes del paso 10), caen a `stagesForSeason(raceId, season)`, nunca a `SEASON_CALENDAR` a secas. `sim/world.ts` l. 169-193, que calcula `CALENDARIO` al cargar el módulo leyendo `st.kind`, se queda como está (es un banco de población, no un mundo vivo) y su reparto se mide antes y después del paso 8 (riesgo 9 de ejecutabilidad, sección 13).

El 49 se re-sella con objetivo escrito. Hoy `expect(cambian).toBe(49)` (`stageHistory.test.ts` l. 206) cuenta etapas de cualquier origen cuya etiqueta corregida difiere de la declarada, "eran 30 hasta la v64" (comentario l. 193-205). Con las reglas 2 y 3, en las 1.241 no reales la cifra es 0 por construcción (la etiqueta ya salió de la misma regla), y el test lo afirma por separado; en las 177 reales queda la cifra que dé la regla única sobre las etiquetas declaradas por `TERRAIN_KIND` (que llama `Summit finish` a TODA etapa `mountain` de edición, `calendar.ts` l. 200, tenga o no carretera detrás). Esa cifra se mide en el paso 8, se escribe en el test con su causa ("solo etapas reales cuya etiqueta declarada por el terreno de la edición difiere de la que dice su recorrido; generadas = 0") y se anota en `balance.md` "vN §1". No se promete que baje de un número concreto porque ninguna previsión sobre ella era fiable con dos reglas (juez motor §5 riesgo 2); lo que se promete es que a partir de ahí SOLO puede moverla un cambio de dato real.

```ts
// apps/api/src/stageHistory.test.ts l. 175-207 re-sellado (paso 8)
import { describe, expect, it } from 'vitest'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { calendarStageSpec } from './stageHistory.js'

it('sobre el calendario entero solo cambia la etiqueta, nunca el tipo de etapa', () => {
  let cambianReales = 0
  let cambianGeneradas = 0
  for (const race of SEASON_CALENDAR) {
    for (const stage of race.stages) {
      const spec = calendarStageSpec(stage, 0)
      expect(spec.kind).toBe(stage.kind)
      expect(spec.timeTrial).toBe(stage.timeTrial ?? false)
      if (spec.label === stage.label) continue
      if (stage.routeSource === 'real') cambianReales++
      else cambianGeneradas++
    }
  }
  expect(cambianGeneradas).toBe(0) // regla 3: la etiqueta generada ya es la del perfil
  expect(cambianReales).toBe(0) // cifra medida en el paso 8 y escrita aquí con su causa (balance.md vN §1);
  // el 0 es un marcador de redacción, no una previsión
})
```

Y en `packages/db`, un test nuevo en `recorridoDelMundo.test.ts` ("dos temporadas, dos recorridos, un esqueleto", decisión 44) más el sello de que `raceStagesForWorld` devuelve `kind`, `label` y `timeTrial` iguales a los de `stagesForSeason(raceId, season)` el día que se congeló, y que `terrenoRestante` sobre el congelado y sobre `calendarForSeason(season)` da los mismos `climbKm` mientras nadie cambie el generador entre medias.

### 11.6 `stageKindOf` no se recalibra en E1, y qué ve el jugador mientras tanto

Decisión 26. Los umbrales de `stageKindOf` (`PASS_MIN_KM` 8,5, `QUEEN_MIN_CLIMB_METRES` 3.200, `WALL_MAX_KM` 3) están calibrados "contra los propios generadores" (`stageKind.ts` l. 44-58; `stageKind.test.ts` l. 12-19, mapa 06 §2.1) y son la vara de todo el banco: `calendarQueens` muestrea por `kind === 'reina'`, `smallTours` y `world.test.ts` reparten por `kind`. Medido sobre las etapas reales (datos §1.5): `stageKindOf` llama `media` a 11 de las 54 reinas reales y `reina` a 16 de las 59 medias reales (27 de 113), y de 22 llanas reales con cota llama `clasica` a 7 y `reina` a 3. No es un defecto del clasificador (hace lo que promete) sino la prueba de que las familias del generador viejo y las de la carretera no coinciden. Recalibrarlo en E1 obligaría a remedir todo el banco dos veces (una por la vara, otra por el generador) y a atribuir cada movimiento a dos causas a la vez, que es justo lo que la lección de E3 prohíbe (mapa 04 §3). Por eso E1 hace lo contrario: lo generado se ACOTA con holgura para caber en la vara (V6 y V7 con `ARCH.veto.margenClaseKm` 0,3 y `margenValleKm` 0,7; `cota` hasta 8,0 y `puerto` desde 9,0 para no pisar 8,5), y lo real sigue con su discrepancia medida. Las únicas modificaciones de `stageKind.ts` son la de la etiqueta `Summit finish` (§11.5, regla 2: dos variables, `runInAfterLastClimb` y `SUMMIT_RUN_IN_KM`) y los `export` de `climbMetres` y `climbSize` para V6 (sección 9); ninguna toca `kind`.

Lo que eso significa en pantalla hasta que el dueño decida D2 (con la tabla del censo delante, tras el paso 8; sección 18): la ficha enseña dos criterios según el origen, y se dice así. Una etapa `real` lleva el `kind` de su terreno de edición y, si es `reina` o `media`, la etiqueta que su recorrido dicta entre las dos de ese `kind`; una `generado` o `edicion` lleva el `kind` que su recorrido dicta y una etiqueta coherente por construcción. Tres casos que van a verse y que son CORRECTOS con esta vara:

- Una Lieja generada sale `media / Hills`, no `reina`. En `ardenas` (`puerto: null` en la tabla de zonas de la sección 6) `ud_montana` no es admisible (el test de la sección 6 sella `admite(SKELETONS.ud_montana.requiere, ZONAS.ardenas)` en `false`), así que la clásica de montaña de la zona es `ud_montana_media` (`media / Hills` en la fila `ud_montana_media` del catálogo de la sección 5, §5.2: `cota`×[3; 5] con la primera de km [3,3; 8,0], `cotaFinal` de km [2,5; 4,2] a [5,7; 17] km de meta, desnivel [2.000; 2.900] m). En `ardenas` la fila de zona de la sección 6 acota el sorteo de cotas a km [2,5; 4,5] (los rangos numéricos de la zona acotan el sorteo, no la plantilla, sección 5 §5.4), de modo que la primera cota queda en [3,3; 4,5] km (la intersección de [3,3; 8,0] con [2,5; 4,5]; `cotaKmMin` 3,3), las intermedias en [2,5; 4,5] y la `cotaFinal` en [2,5; 4,2] km, tal como la fija el esqueleto. Ninguna cota llega a 8,5 (ni siquiera el techo del esqueleto, 8,0, fuera de la zona) y el desnivel del esqueleto ([2.000; 2.900] m) no llega a 3.200, así que `stageKindOf` no puede decir `reina`, y no debe, porque el clasificador de hoy llama `media` a la Lieja REAL (una de las 11 de 54). La etiqueta sale de la regla única de §11.5: `Hills` no es una de las cinco de `ETIQUETAS_DE_ESQUELETO`, de modo que `labelDe` la toma de `stageKindOf`, y con la última cota a más de `SUMMIT_RUN_IN_KM` 5 km de meta la etiqueta es `Hills`. Nunca puede salir `media / Mountains classic`: `Mountains classic` es la etiqueta de `ud_montana`, que es `reina`, y una `media` con ella rompería la garantía de la regla 3 de que las cinco etiquetas nuevas están casadas con un `kind`. (El índice §D del esqueleto y las secciones 17 y 19 escriben este ejemplo como `media / Mountains classic`; deben decir `media / Hills`.)
- Un Sanremo generado (`ud_esprint_capi`, Poggio de 3,7 km y Cipressa de 5,6 en su plantilla canónica, sección 5) sale `media / Hills`, como fija el catálogo: sus dos cotas superan `WALL_MAX_KM` 3 (banco §9.4.1), su valle de meta es de [5,7; 8] km y V6 lo garantiza. El clasificador de hoy llama `Hills` al Sanremo real por su Poggio (cobertura §5 riesgo 5), y la ficha lo dirá así hasta D2; el Sanremo real no pasa por la gramática (`routeSource: 'real'`, `stageFeatures.ts` l. 5587).
- Una reina `cima_cerca` con 3 km de valle (`et_reina_cima_cerca`, cota final a [1,2; 4,3] km) sale `reina / Summit finish` en la ficha Y en `stageHistory`, que es la corrección de §11.5 (regla 2 en el clasificador, regla 3 en `labelDe` y en `calendarStageSpec`); hoy `stageKindOf` diría `Mountains` (el último segmento no es `puerto`) y `calendarStageSpec` `Summit finish`.

Para que la tabla que la sección 18 pone delante del dueño en D2 exista de verdad y no como estimación, `RouteStats` (sección 13, §B.2) gana un campo: `kindLeido: StageKind` = `stageKindOf(profile, timeTrial).kind`, junto al `kind` que ya tiene (el declarado: `TERRAIN_KIND` en las `real`, `Skeleton.kind` en el resto). Con él, `routeCensus` imprime desde el paso 0 una banda `real.cruces` con `estado: 'informativa'`: la matriz `kind` × `kindLeido` (5 × 5) sobre `routeSource === 'real'`, por `raceClass` y por `finalKind`; y la banda `cruces` de las generadas (§13.3) afirma `kind === kindLeido` en el 100 % desde el paso 8, que es V6 medido en frío. Esa matriz, y no una estimación, es lo que decide D2. Si D2 se decide a favor, la recalibración es un cambio propio con su remedición pareada (sección 13) y su nota en `balance.md`, nunca un ajuste dentro de E1.

### 11.7 La doctrina de `fuentes-recorridos.md`, heredada entera

La definición operativa de "real" no la escribe este documento; la hereda de `docs/fuentes-recorridos.md` (mapa 05 §6) y la aplica a la gramática con estas consecuencias:

1. **Nada se inventa sobre una carrera con dato.** Un puerto solo se anota con km de cima, longitud y pendiente, y si falta uno se descarta (l. 28-31); un muro adoquinado va como `puerto` y no como `paves` (regla 5, por el terreno único por bloque de `sample.ts`); un final en alto se ancla al km entero (regla 10, medido en Arctic Race e3). La gramática nunca completa una etapa `real` con un motivo, ni le añade un sector, ni le mueve una cima: `generateStage` no recibe etapas con rasgos, y la rama de `buildRace` lo garantiza antes de llamarla.
2. **La marca verde tiene que significar algo.** AlUla no se carga aunque tenga sprints con km exacto, y el Tour de Pologne con tres puertos de diez "se queda en 🟡, que es la verdad". La correspondencia `real → ✅`, `edicion → 🟡`, `generado → 🔴` de §11.4 conserva ese significado: una etapa `edicion` de la gramática es tan 🟡 como lo era con `oneDaySpec`, aunque ahora el relieve sea plausible para su zona; plausible no es verificado.
3. **PCS y Overpass están vetados** (`robots.txt`, `Disallow: /api/`), lo que cierra la validación externa que `motor.md` §V.3 prometía. Por eso la tabla geográfica es juicio (decisión 16), la galería de la sección 16 es el instrumento de validación, y `scripts/medir-real.mjs` (decisión 40) lee SOLO lo publicado en `STAGE_FEATURES`: da p10/p50/p90 de las 177 para las bandas de `routeCensus` donde haya ≥ 3 fuentes y para calibrar `ARCH.anticlon.maxCorrelacion` (V12, sección 9), y el generador no depende de ningún fichero regenerable. Una etapa real sin `climbs` no aporta bandas de puertos aunque tenga `elevation`.
4. **Copiar no es aprender.** V12 mide la correlación de `huella` (g por km, eje normalizado desde meta) de cada etapa generada contra las reales de su familia y exige que sea menor que el p90 de los pares reales de la misma familia (Ronde y E3, Amstel y Brabant, Lombardía y Lieja): "tan parecido como dos carreras reales distintas, no más". Los nombres no existen: las ciudades vienen de `raceRoutes.ts` (310 carreras de equipos, sin fuente para 250 de ellas, mapa 02 §8) y el nombre de la carrera es "Race + Geografía" (`calendar.ts` l. 2-7).
5. **Medir es parte de cargar** (paso 7 del procedimiento de `fuentes-recorridos.md`: "Cargar un recorrido no es rellenar una tabla: es cambiar la carrera"). La misma regla vale al revés: sustituir el relieve generado de una etapa `edicion` por uno real es trabajo de E12, y cuando ocurra la etapa cambia de rama, de marca y de huella, y `realFingerprint.sealed.ts` gana una fila con su causa. E1 deja el sitio hecho: `routeSource` con tres valores, `freezeRaceRoute` con `season`, la reclasificación por huella de §11.4 y una regla de etiqueta única, para que E12 solo tenga que cargar dato y pintar.

Lo que E1 no hace con lo real, dicho para que no se busque aquí: no carga ninguna etapa nueva (las 22 WT "INTENTADO Y BLOQUEADO" de Pologne, Benelux, Guangxi, Bruges, Copenhague, Bretaña, el Rhône-Alpes y la e21 del Tour siguen en 🟡), no corrige las deudas de dato con nombre (Montréal con dos de cuatro cotas por vuelta, Strade sin Santa Caterina, Slovenia con distancias desviadas hasta 7 km) y no unifica los dos rellenos. Todo eso está en la sección 17 con su coste.
