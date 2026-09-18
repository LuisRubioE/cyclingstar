## 13. El banco: invariantes, censo, calendarQueens, «mejor y no solo distinto», remedición

El banco es la parte del diseño que decide si el generador nuevo se queda. La regla que lo gobierna la escribió el propio repositorio en `targets.ts` l. 213-215 y l. 375-379: «lo que no se mide sobre carreras reales, no se mide», y la historia que la sostiene está reconstruida en el mapa 04 §3: seis veces (v15, v17, v19, v23, v40, v44) un banco canónico en verde certificó algo que producción no hacía, y cuatro de las seis eran defectos del PERFIL sobre el que se medía, no del motor. La consecuencia para E1 es doble. Primera: el generador es la ENTRADA de 17 de las 32 bandas de `TARGETS` (mapa 04 §2, resumen numérico), así que cambiarlo mueve esas 17 tanto si alguien lo decide como si no; y las 15 restantes, que no ven el generador, siguen en verde con cualquier calendario y por eso no dicen nada del juego. Segunda: un generador «distinto» se distingue de uno «mejor» solo si la comparación está pre-registrada, pareada y medida sobre las mismas etapas, porque las listas cerradas por nombre (`REAL_QUEENS`, `SMALL_TOURS`, `REAL_TIME_TRIALS`) conservan el nombre y no la forma (mapa 04 §3.3), y la muestra de `calendarQueens` se recalcula sola (`calendarQueens.ts` l. 22-27) y cambia de composición con cualquier generador (juez del motor, riesgo 5).

Esta sección fija, en este orden: lo que no se mueve (13.1); lo que se mueve a propósito y con qué causa escrita (13.2); el censo geométrico `routeCensus` y sus bandas `ROUTE_CENSUS_TARGETS` (13.3); la muestra estratificada de `calendarQueens` con `reina-175-4800` (13.4); las tres reinas congeladas como esqueleto y las tres generadas nuevas (13.5); el protocolo «mejor y no solo distinto» con la tabla pareada como condición de borrado (13.6); y la remedición con dueño, orden, horas y techo (13.7). Las cifras de coste salen del juez del motor (`juicios/motor.md` §1, script `juicios/coste-motor.mjs`), los relojes del mapa 06 §3.2 y las medidas de hoy del mapa 06 §1 y del mapa 04 §3.4.

### 13.1 Lo que no se mueve y no debe moverse

Es la red que dice que el rediseño no ha roto lo que no pretendía tocar (mapa 06 §5). Si alguna de estas piezas se mueve al cambiar `routes/`, hay un acoplamiento que no debería existir y el cambio se para antes de seguir (regla 3 del mapa 04 §5.3).

| Pieza                                                                                                                                                             | Por qué no ve el generador                                                                                                                                                          | Fuente              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Las 15 bandas canónicas: `flat.*` (3), `phases.*` (3), `mountain.*` (2), `timeTrial.*` (2), `erosion.flatFresh` y `.queenFresh`, `chronicle.*` (3)                | Se miden sobre `llana-180`, `reina-150`, `cri-40` y el perfil de la llana: literales de `sim/scenarios.ts` l. 209-213, 332-336, 471                                                 | mapa 04 §1.1 y §4.1 |
| Las cuatro huellas selladas: `stage/attribution.test.ts` (`llana-180`, `reina-150`), `stage/timetrial.test.ts` (`cri-40`), `sim/raceRadio.test.ts`                | Construyen la etapa a mano; la huella se mueve solo si se toca el motor                                                                                                             | mapa 06 §3.3        |
| Los invariantes SPEC 6.17 sintéticos de `invariants.test.ts` l. 128-212 (llano, fases, montaña, crono), desgaste sintético, voz de equipo, pavés, cierre, inercia | Perfiles literales                                                                                                                                                                  | mapa 06 §3.2        |
| `grandTour` (`abandonPct` [12; 20], `queenLastGroupPct` [8; 14], `oneGroupPct` 0, `abandonCauses.*`)                                                              | 20 de las 21 etapas de `race-france` son de rasgos reales; solo la e21 llana se genera, y cambia de detalle, no de forma (`et_llana`)                                               | mapa 06 §1 y §3.2   |
| `erosion.longClassicFresh` (Flandes), `.hardestClassicFresh` (Lombardía), `.queenThirdWeek` (Francia e18)                                                         | Rasgos reales por `featureProfile.ts`, que E1 no toca (decisión 27, sección 11)                                                                                                     | mapa 04 §2          |
| Tests de perfiles reales: `routes/featureProfile.test.ts`, `routes/classicRoutes.test.ts`, Giro e9 (`italy9SummitFinishes`), las 18 de un día WT de la saturación | Idem                                                                                                                                                                                | mapa 06 §5          |
| `routes/finalKind.test.ts`                                                                                                                                        | Los cortes 0,5 / 5 / 20 km son la vara con la que se mide el generador; la gramática se diseña con holgura 0,7 sobre ellos (`ARCH.meta.*.valle`, sección 4) y no los mueve          | mapa 06 §2.3        |
| `db/recorridoDelMundo.test.ts`                                                                                                                                    | Auto-consistente: compara el congelado contra el calendario del mismo proceso; es la garantía de que el generador nuevo solo alcanza carreras futuras (`docs/balance.md` «v60 §1a») | mapa 06 §3.5        |
| `routes/altimetry.test.ts`, `schedule.test.ts`, `uci.test.ts`, `raceRoutes.test.ts`                                                                               | Datos de tabla; `raceRoutes.test.ts` sigue verde porque `n` viene de la fila (decisión 44)                                                                                          | mapa 06 §5          |
| `db/abandon.test.ts`, `gcOrder`, `stageRun`, `teamPlan`, `locks`, `calendarConcurrency`, `world/*.test.ts`                                                        | Perfiles reales o literales, o solo estructura                                                                                                                                      | mapa 06 §3.5        |

Dos matices que la tabla no puede decir sola. El primero: las 15 canónicas son útiles como CONTROL DE FORMA (la misma etapa antes y después de un cambio del motor) y el riesgo no es que fallen, sino que se lean como certificación, que es lo que pasó con `mountain.breakawayWinPct` durante cinco versiones (mapa 04 §3.2); por eso 13.4 les cambia el rótulo del informe. El segundo: `calendar.test.ts` l. 184-246 (garantías de `mixRoles`) sigue verde SOLO porque `stageMix` conserva firma y `composeTour` conserva las cuatro garantías como reglas (decisiones 18 y 19, sección 7); las dos tiradas nuevas de prólogo y cronoescalada (decisión 42) desplazan las composiciones de las 72 vueltas y por eso `smallTours` está en 13.2 y no aquí.

### 13.2 Lo que se mueve a propósito y cómo se re-sella

«Re-sellar» significa lo que ya hace el repositorio: mover el número o la lista con la causa escrita en el propio test, como `stageHistory.test.ts` l. 185-190 («eran 30 hasta la v64… y suben porque el generador de recorridos cambió») o las huellas de `attribution.test.ts` l. 320-355 («RESELLADA EN LA v49»). Lo que no vale es lo que pasó tras la v64: `realQueens`, `grandTour` y `smallTours` cambiaron de perfil, siguieron en verde y nadie anotó una remedición por etapa (mapa 04 §3.4). Cada fila de esta tabla tiene un paso del plan (sección 15) y una nota en `docs/balance.md` «v61».

| #   | Test o banda                                                                                                                                    | Qué le pasa                                                                                                                                                                                                                                  | Qué se hace, con la causa que se escribe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Paso |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `index.test.ts` l. 381 (`ENGINE_VERSION` 69)                                                                                                    | Sube UNA vez                                                                                                                                                                                                                                 | 69 → 70 (o el siguiente libre en producción); causa: «el calendario generado cambia de forma: gramática de motivos»                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 8    |
| 2   | `routes/stageKind.test.ts` (109 l.)                                                                                                             | Los ocho `xxxSegments` desaparecen; hoy 8 funciones × 60 semillas × `KM_ROAD` [130, 155, 175, 195, 215] = 300 perfiles por generador, y `mountainClassicSegments` no está (mapa 06 §2.1, §6.1)                                               | Se reescribe por esqueleto: cada `SkeletonId` × 5 km de su rango × 60 semillas × zonas compatibles (todas las que cumplen `requiere`, con tope de 4 por esqueleto elegidas en orden de `GeoZone`, más `generico` si aplica), con `generateStage({ fixed: { skeleton } })`; asegura `stageKindOf(profile).kind === Skeleton.kind` y `finalKindOf(profile) === Skeleton.finalKind` en el 100 %, `intentos` p95 ≤ `ARCH.veto.intentosP95` 3, `degradado` ≤ `ARCH.veto.fallbackMaxShare.testPorEsqueleto` 0,005; `ud_montana` (el sucesor de `mountainClassicSegments`) por fin dentro; la crono se sella como «`et_crono` sin `timeTrial` es `llana`; `et_cronoescalada` sin `timeTrial` es `media`» (decisión 42); el comentario de umbrales de `stageKind.ts` l. 44-58 se reescribe con la tabla medida por el censo | 8    |
| 3   | `routes/calendar.test.ts` l. 162-174 (km exactos de las 60 ediciones)                                                                           | Contrato con `editions.ts`: `Math.round(Σ km) === edition.stages[i].km`                                                                                                                                                                      | Sigue verde por V10 (`normalizeEnlaces` cuadra al 0,1 solo con los enlaces) y porque `StageRequest.km` es contrato en las etapas `edicion` (sección 8); se añade la aserción `routeSource === 'edicion'` en esas 226 etapas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 8    |
| 4   | `routes/calendar.test.ts` l. 269-277 (`Uphill finish` acaba en `puerto`)                                                                        | `race-sharjah` con n 5 `flat`                                                                                                                                                                                                                | Sigue verde por construcción de `MetaKind` (`alto_corto` y `alto_largo` terminan en `puerto`); se generaliza a «toda etapa con `Skeleton.meta ∈ {alto_corto, alto_largo, muro_meta}` termina en `puerto`» sobre `calendarForSeason(0)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 8    |
| 5   | `apps/api/src/stageHistory.test.ts` l. 199 (`cambian === 49`)                                                                                   | Cambia la cifra; hoy hay dos reglas de etiqueta (`stageKind.ts` l. 84 contra `stageHistory.ts` l. 73-88, juez del motor riesgo 2)                                                                                                            | Primero se unifica la regla (`SUMMIT_RUN_IN_KM` 5 en `stageKindOf`, decisión 23) y `stageHistory.ts` deja de reetiquetar; DESPUÉS se mide y se re-sella con objetivo escrito en el test: «solo etapas reales cuya etiqueta declarada difiere; generadas = 0» y la cifra medida al lado. La mitad que vigila (`spec.kind === stage.kind`) debe dar cero, porque `kind = stageKindOf(profile).kind` en toda etapa generada (V6)                                                                                                                                                                                                                                                                                                                                                                                       | 8    |
| 6   | `sim/calendarQueens.test.ts` (71 l.)                                                                                                            | Cambia la muestra (25 de las 27 no reales se redibujan) y el reparto de desnivel                                                                                                                                                             | Se remide con 12 semillas fuera de CI ANTES de tocar nada; muestra estratificada por `finalKind` × cubeta (13.4); las cuatro aserciones se conservan; la banda [6; 30] se mantiene como vigilancia hasta la remedición (D6, valor por defecto, sección 18); el comentario de `targets.ts` l. 88 que aún cita «mediana de 2.023» se sustituye por la mediana medida por el censo                                                                                                                                                                                                                                                                                                                                                                                                                                     | 9    |
| 7   | `sim/invariants.test.ts` «cola en las reinas REALES» l. 770-844                                                                                 | Colombia e5, Guatemala e9 y Tachira e6 son generadas y su `why` ya no describe el perfil (Colombia: «47 km rodadores» contra 18 km medidos, mapa 06 §3.2)                                                                                    | Las tres se congelan como `Skeleton` literal en `sim/frozenSkeletons.ts` y se renderizan con `renderSkeleton` (13.5); `why` reescrito; `lastGroupPct` [7; 14] y `worstStagePct` ≤ 18 se remiden con 6 semillas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 9    |
| 8   | `sim/invariants.test.ts` «carreras PEQUEÑAS» l. 855-955                                                                                         | 7 de las 10 carreras son generadas; cambian composición (prólogo, km por clase) y relieve                                                                                                                                                    | Las nueve bandas de `smallTours` se remiden pareadas (13.6) con dirección pre-registrada; `media.stages > 40` (l. 915) se recuenta porque cuenta etapas por `kind`; el informe separa la parte de composición (pares de llegadas agrupadas) de la de motor, como la propia banda reconoce (`targets.ts` l. 574-577)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 9    |
| 9   | `sim/invariants.test.ts` «ninguna carrera de un día satura» l. 511-552                                                                          | El conjunto de las 8 más duras se elige por `costBase` integrado (l. 486-499); hoy son `race-ses-salines`, `race-mercantour`, `race-jura` y cinco `nc-*-road` (mapa 06 §3.2), así que el generador elige el banco                            | Se remide sobre las 8 que salgan del calendario nuevo (los 532 nacionales ganan geografía, decisión 15, y cambian cuáles entran); criterio conservado (vaciado ≤ 0,96, pájaras ≤ 14 %); previsión: 0 de 8, porque V5 impide la forma que saturaba (final en alto de 14 km en un día, `docs/balance.md` v40 §1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 9    |
| 10  | `sim/invariants.test.ts` «cola de una CONTRARRELOJ real» l. 222-273                                                                             | 3 de las 5 cronos son generadas (colombia e3, `nc-co-itt`, `race-chrono`); hoy `ittSegments === flatSegments`                                                                                                                                | Se remide `tailPct` [8; 15] y `worstStagePct` ≤ 17; previsión: sin cambio (≤ +0,5 puntos), porque `et_crono` y `nc_crono` siguen llanas; prólogo y cronoescalada no entran en la lista cerrada (D3 no la toca)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 9    |
| 11  | `sim/coherence.test.ts` «Race Jaén» l. 120-125 (40 semillas, `reloj(300)`) y `stage/journal.test.ts` `race-tramuntana` l. 104-108 (12 semillas) | Otro relieve (Jaén pasa de `hillySegments` a `ud_muros` o `ud_montana_media` según `RACE_REGION`; Tramuntana de `mountainClassicSegments` a `ud_montana` en `levante`)                                                                       | Se re-corren; el listón de cero contradicciones se mantiene; si aflora una, es del motor y se arregla, nunca se afloja (mapa 06 §4.10)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 9    |
| 12  | `sim/world.test.ts` y `RACE_DAY_TSS`                                                                                                            | `world.ts` l. 169-193 calcula `CALENDARIO` al cargar desde `SEASON_CALENDAR` leyendo `st.kind`; con `kind` leído del perfil, algunas `media` de Flandes pasan a `clasica` (`RACE_DAY_TSS.clasica` 160 frente a `media` 145, ingeniero §11.2) | Fila propia: en el paso 8 se mide el reparto de `kind` por clase ANTES y DESPUÉS (tabla del censo, `aggregate(rows, r => r.kind)`) y se anota; si una banda de población se mueve, se atribuye al reparto y se decide con el dueño; no se toca `RACE_DAY_TSS` en E1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 8    |
| 13  | `routes/golden.test.ts` (1.418 huellas, paso 1)                                                                                                 | Deja de ser verdad en el paso 8                                                                                                                                                                                                              | Se mueve con la copia legado a `sim/legacy/golden.test.ts` para verificar `legacyCalendar()` (13.6) y se borra con ella al cerrar el paso 9                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 8, 9 |
| 14  | `routes/realFingerprint.test.ts` (177 + 3 grandes vueltas)                                                                                      | Debe seguir idéntico                                                                                                                                                                                                                         | Se comprueba tras el paso 8 y sobrevive (decisión 28, sección 11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 8    |

### 13.3 `routeCensus`: el censo geométrico en cada push

#### 13.3.1 Qué es y por qué cabe en `test:rapido`

Hoy nadie sabe cuántos finales `muro`, `alto` o `puncheur` produce el calendario sin correr a mano `docs/balance.md` v60 §12; `queenGeometry()` (`calendarQueens.ts` l. 170-198) calcula el reparto de `finalKind` de las 157 reinas pero no tiene test y solo lo lee `climberWinRate.ts` (mapa 06 §6.2). El censo es esa lectura extendida a las 1.418 etapas, con banda, y en cada push. Cabe en `test:rapido` porque es geometría: el juez del motor midió una pasada de `sampleProfile` + `finishType(deriveFinishTerrain)` + `stageKindOf` + `finalKindOf` sobre las 1.418 etapas en 569 ms, 0,40 ms por etapa, sobre 46.354 segmentos (`juicios/motor.md` §1, `coste-motor.mjs`, node 22.22). Esa es la cifra de «0,57 s medidos» de la decisión 31. Con perfiles de hasta 80 segmentos (sección 14) el coste sube en proporción a los segmentos y sigue muy por debajo de los 30 s de suelo de `vitest.config.ts` l. 8.

`routeCensus` es el ÚNICO sitio de `routes/` y `sim/` donde el generador se mira con los ojos del motor: `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` (`finish.ts` l. 71 y 142) se calcula aquí, con `groupSize` 50, y solo aquí. `verify` no lo llama nunca (decisión 4): una recalibración de `STAGE.finish*` mueve el censo y no redibuja un solo perfil. V11 (muro en meta existe) y V16 (el final declarado según el motor) son por eso vetos de calendario, medidos aquí y sin reintento (decisión 24).

#### 13.3.2 Interfaz

```ts
// packages/engine/src/sim/routeCensus.ts
export interface RouteStats {
  raceId: string
  stageIndex: number
  raceClass: RaceClass
  format: RaceFormat
  country: string
  zona: GeoZone | null
  skeleton: SkeletonId | null
  routeSource: RouteSource
  kind: StageKind
  label: string
  finalKind: FinalKind | null
  finishType: FinishType // finishType(deriveFinishTerrain(sampleProfile(profile)), 50): aquí sí
  km: number
  dPlus: number
  dPlusBloques: number // dPlusDe y calendarQueens::desnivelDe, para ver el delta
  nPuertos: number
  nMuros: number
  longestClimbKm: number
  lastClimbKm: number | null
  lastClimbG: number | null
  kmAfterLastClimb: number | null
  climbKmOutsideLast30: number
  kmSubidaShare: number
  breakAppealEstimado: number
  pavesKm: number
  nSectores: number
  estrellas5: number
  maxG: number
  huella: number[] // g por km
  intentos: number
  degradado: boolean
}

/** Cuantiles de una columna numérica y recuento de una columna categórica, por grupo. */
export interface Summary {
  n: number
  cuantiles: Partial<
    Record<keyof RouteStats, { p10: number; p50: number; p90: number; min: number; max: number }>
  >
  cuenta: Partial<Record<keyof RouteStats, Record<string, number>>> // p. ej. cuenta.finalKind.alto = 61
}

export function routeCensus(calendar: CalendarRace[] = calendarForSeason(BASE_SEASON)): RouteStats[]
export function aggregate(
  rows: RouteStats[],
  by: (r: RouteStats) => string,
): Record<string, Summary>
```

Cada campo tiene una razón medible. `zona` y `skeleton` son `null` en las 177 etapas `real`, que el censo cuenta pero no bandea (su forma es dato). `dPlus` es `dPlusDe(profile)` (integración de tramos con g > 0, `geometry.ts`) y `dPlusBloques` es la suma por bloques de `sampleProfile` que `calendarQueens.ts` l. 55-59 (`desnivelDe`) usa hoy; los dos se imprimen y la diferencia se vigila (< 5 %, decisión 9) porque el objetivo `Skeleton.dPlus` se persigue con el primero y `calendarQueens` estratifica con el segundo. `climbKmOutsideLast30` es la variable que separó la canónica (0 %) de las reales (6 % a 38 %) en `docs/balance.md` v43 §7 y sostiene V8b. `kmSubidaShare` y `breakAppealEstimado` (la regla de `simulate.ts` l. 1696-1710 aplicada a los km de `subida`, mapa 03 §4.1) son la banda informativa de circuitos y muros de la decisión 25. `huella` (pendiente media por km) es lo que V12 correlaciona. `intentos` y `degradado` son el contador de fallback de la sección 9.

#### 13.3.3 `ROUTE_CENSUS_TARGETS`: bandas de realismo

```ts
export type CensusPoblacion =
  | 'todo'
  | 'generado'
  | 'unDia'
  | 'reinas'
  | 'reinasGeneradas'
  | 'lineaGenerada'
  | `esqueleto:${SkeletonId}`
  | `clase:${RaceClass}`
  | `formato:${RaceFormat}`
export interface CensusTarget {
  id: string
  label: string
  poblacion: CensusPoblacion
  medida: (rows: RouteStats[]) => number // un número por banda; la estratificación va dentro
  min?: number
  max?: number
  hoy: number | null // medido en el paso 0 con el generador viejo; null = no aplica hoy
  modo: 'dura' | 'informativa' // informativa: se imprime, no falla
  fuente: string // «mapa 07 §4.3», «balance v43 §7»...
}
export const ROUTE_CENSUS_TARGETS: readonly CensusTarget[]
```

La columna «hoy (medido)» la rellena el paso 0 (sección 15) con el generador viejo y `scripts/medir-real.mjs` (decisión 40) da la referencia real donde hay ≥ 3 fuentes. Ninguna banda nace en rojo: en el paso 0 las que hoy fallan están `it.todo` con su cifra; en el paso 8 pasan a `it` y tienen que estar en verde. Las bandas se leen sobre `calendarForSeason(0)`; el test las repite sobre las temporadas 1 y 2 para las de identidad y variedad (coste: dos cargas más, sección 14).

| id                 | Métrica                                                                        | Población                                     | Banda                                               | Hoy (medido)                                                   | Fuente                                  |
| ------------------ | ------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| `vetos`            | V1 a V10 y V15: violaciones; `degradado`; `intentos` p95                       | generado                                      | 0; 0 (`ARCH.veto.fallbackMaxShare.calendario`); ≤ 3 | n/a                                                            | sección 9                               |
| `cruces`           | `stageKindOf(profile).kind === kind` y `finalKindOf === Skeleton.finalKind`    | generado                                      | 100 %                                               | 72 discrepancias de `kind` sobre 1.418                         | juez motor §1                           |
| `unDiaUltimaCota`  | última cota ≤ 4,2 km que corona a [3; 17] km                                   | un día generado (menos `ud_montana_alto`)     | ≥ 98 %                                              | cota más larga 6,6 a 12,2 km; cima a 12,8 a 22,8 km            | mapa 07 §1.6, §4.3; mapa 01 §2.6        |
| `unDiaAltoLargo`   | un día con `finalKind` `alto` en puerto > 6 km                                 | un día generado                               | ≤ 2 % (solo `ud_montana_alto`, peso 0,02 en .1)     | 0 % tras v40; 9 de un día por `mountainClassicSegments`        | v40; decisión 37                        |
| `reinaDplusGV`     | D+ p50 de reinas generadas por formato                                         | `formato:gran-vuelta` generadas               | p50 ≥ 3.000                                         | no hay gran vuelta generada hoy                                | mapa 04 §5.1                            |
| `reinaDplusSemana` | idem                                                                           | `formato:una-semana`                          | p50 ≥ 2.400; p10 ≥ 1.500                            | 2.898 (`mountainSegments`) / 1.734 (`mountainClassicSegments`) | mapa 06 §1                              |
| `reinaColaBaja`    | reinas con D+ < 1.500                                                          | reinasGeneradas                               | ≥ 5 %                                               | 32 de 157 (20,4 %)                                             | mapa 06 §1; decisión 8                  |
| `reinaFuera30`     | `climbKmOutsideLast30 / kmSubida`                                              | reinasGeneradas                               | ninguna en 0 %; p10 ≥ 5 %                           | canónica 0 %; reales 6 % a 38 %                                | balance v43 §7                          |
| `reinaFinalKind`   | reparto de `finalKindOf`                                                       | reinas (157)                                  | cada cubeta ≥ 5 %; `alto` en [0,35; 0,55]           | 38,2 / 8,9 / 42,0 / 10,8                                       | v60 §1b; mapa 06 §1                     |
| `reinaPuertoFinal` | longitud del puerto de meta en `alto`                                          | reinasGeneradas con `alto`                    | p10 a p90 en [9; 22]                                | 8,4 a 26,7                                                     | mapa 01 §2.5; `ARCH.meta.altoLargo`     |
| `muroMeta`         | `finishType === 'muro'`                                                        | lineaGenerada                                 | ≥ 1 % (V11)                                         | 0 de 1.075                                                     | v60 §12; juez motor §1                  |
| `puncheurMeta`     | `finishType === 'puncheur'`                                                    | lineaGenerada                                 | ≥ 8 % (V11)                                         | 51 de 1.075 (4,7 %)                                            | juez motor §1                           |
| `finalSegunMotor`  | `finishType ∈` lo que `Skeleton.meta` promete (tabla de `MetaKind`, sección 4) | generado                                      | 100 % (V16)                                         | n/a                                                            | decisión 24                             |
| `murosPorClasica`  | nº de cotas en `ud_muros`                                                      | `esqueleto:ud_muros`                          | p10 a p90 en [10; 20]                               | 4 a 5 (`classicSegments`)                                      | mapa 07 §1.3                            |
| `adoquin`          | sectores y km de pavé en `ud_adoquin`; último sector a meta                    | `esqueleto:ud_adoquin`                        | [15; 30] sectores; [40; 60] km; último a [1; 8] km  | 3 sectores, ~40 km                                             | mapa 07 §1.4                            |
| `llanaDplus`       | D+ de `et_llana` y `ud_esprint`                                                | esqueletos llanos                             | p90 ≤ 1.500 (V9 ≤ 1.800 por etapa)                  | 661 a 1.413                                                    | mapa 01 §1                              |
| `kmClase2`         | km de las .2 generadas                                                         | `clase:2`                                     | p90 ≤ 170; ninguna > `ARCH.km.maxPorClase['2']` 180 | 145 a 195                                                      | mapa 07 §4.1                            |
| `kmClase`          | ninguna etapa > `ARCH.km.maxPorClase[clase]`                                   | generado                                      | 0                                                   | 142 carreras de un día a 210                                   | decisión 36                             |
| `kmSubidaShare`    | km de `subida` / km, por esqueleto                                             | `esqueleto:ud_circuito`, `esqueleto:ud_muros` | ≤ 0,20 y ≤ 0,15 (informativa)                       | n/a                                                            | decisión 25                             |
| `dPlusDelta`       | `                                                                              | dPlus − dPlusBloques                          | / dPlusBloques`                                     | generado                                                       | p90 < 5 % (informativa hasta el paso 3) | n/a | decisión 9 |

Bandas de variedad, en el mismo fichero y con el mismo tipo (contra «siempre son los mismos tres o cuatro modelos», agenda §4.18):

| id                    | Métrica                                                                                                                                        | Población                                                      | Banda                                                                                                                                          | Hoy (medido)                                           | Fuente                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `esqueletosPorClase`  | `SkeletonId` distintos                                                                                                                         | un día WT y Pro; un día .1 y .2; `nc_ruta`; papeles en vueltas | ≥ 8; ≥ 10; ≥ 6 (por zona); ≥ 9 `StageRole`                                                                                                     | 6 formas de un día; 3 terrenos                         | arquitectura §11.3           |
| `entropiaZona`        | Shannon de esqueleto dentro de cada zona con ≥ 8 carreras                                                                                      | generado                                                       | ≥ 1,5 bits                                                                                                                                     | n/a                                                    | arquitectura §11.3           |
| `anticlon`            | correlación de `huella` entre pares del mismo esqueleto y km ± 10 % (circuitos excluidos del par)                                              | generado                                                       | mediana < 0,8; máximo < `ARCH.anticlon.maxCorrelacion` (0,85 provisional, calibrado en el paso 9 sobre pares reales de la misma familia, I-12) | n/a                                                    | mapa 04 §5.2; V12            |
| `primerPuerto`        | km del primer puerto / km total en reinas                                                                                                      | reinasGeneradas                                                | p10 < 0,25 y p90 > 0,55                                                                                                                        | `split` lo pone siempre en el mismo sitio (mapa 01 §4) | banco §11.3                  |
| `secuencias5`         | frecuencia de cada secuencia de `StageRole` en vueltas de 5                                                                                    | vueltas generadas                                              | ninguna > 20 %                                                                                                                                 | 7 % (datos §11.4)                                      | mapa 04 §5.2                 |
| `entropiaFinalVuelta` | vueltas con ≥ 3 reinas y todas `alto`                                                                                                          | vueltas generadas                                              | 0                                                                                                                                              | `race-france` lo era antes de los rasgos               | mapa 04 §5.2                 |
| `identidad`           | temporadas 1 a 5 contra 0: mismo esqueleto, firma igual, km ± 6 %, ≥ 1 diferencia no firma en 4 de 5; correlación entre ediciones consecutivas | generado                                                       | 100 %; [0,55; 0,9]                                                                                                                             | no hay temporadas                                      | sección 10                   |
| `nacionales`          | esqueletos distintos entre los 133 `nc-*-road`; BE/NL con adoquín; CO/EC con cota ≥ 5 km; DK/AE con `expuesto`                                 | `nc_ruta`                                                      | ≥ 5; ≥ 60 %; 100 %; 100 %                                                                                                                      | 133 `classic(220)` iguales                             | `motor.md` §V.3; decisión 15 |
| `fallbackTerritorio`  | etapas de carreras de equipos en zona `generico` por fallback                                                                                  | generado                                                       | 0 (los 532 nacionales sí pueden)                                                                                                               | n/a                                                    | decisión 13                  |

Test de ejemplo, `sim/routeCensus.test.ts` (corre en `test:rapido` porque `vitest.config.ts` excluye `sim/**` solo de… no: el fichero vive en `sim/` y `test:rapido` excluye `packages/engine/src/sim/**`, mapa 06 §0; por eso el test que lo corre en cada push es `routes/grammar/calendario.test.ts`, y `sim/routeCensus.test.ts` prueba solo la aritmética de `aggregate` sobre filas literales):

```ts
// packages/engine/src/routes/grammar/calendario.test.ts
import { describe, expect, it } from 'vitest'
import { routeCensus, aggregate, ROUTE_CENSUS_TARGETS } from '../../sim/routeCensus.js'
import { calendarForSeason, BASE_SEASON } from './edition.js'

const rows = routeCensus(calendarForSeason(BASE_SEASON))
const poblacion = (p: CensusPoblacion) =>
  rows.filter(/* por routeSource, format, raceClass, skeleton */)

describe('el censo del calendario que el juego corre (E1 §13.3)', () => {
  it('recorre las 1.418 etapas en menos de 3 s', () => {
    const t0 = performance.now()
    routeCensus(calendarForSeason(BASE_SEASON))
    expect(performance.now() - t0).toBeLessThan(3000) // medido 569 ms hoy, juez motor §1
  })
  for (const t of ROUTE_CENSUS_TARGETS.filter((t) => t.modo === 'dura')) {
    it(`${t.id}: ${t.label} (hoy ${t.hoy ?? 'n/a'}, ${t.fuente})`, () => {
      const v = t.medida(poblacion(t.poblacion))
      if (t.min !== undefined) expect(v).toBeGreaterThanOrEqual(t.min)
      if (t.max !== undefined) expect(v).toBeLessThanOrEqual(t.max)
    })
  }
  it('ningún final generado contradice lo que su MetaKind promete al motor (V16)', () => {
    const malos = poblacion('generado').filter(
      (r) => !FINISH_POR_META[metaDe(r)].includes(r.finishType),
    )
    expect(malos.map((r) => `${r.raceId}#${r.stageIndex} ${r.skeleton} → ${r.finishType}`)).toEqual(
      [],
    )
  })
  it('el desnivel integrado por tramos y el de bloques se parecen (decisión 9)', () => {
    const delta = poblacion('generado').map(
      (r) => Math.abs(r.dPlus - r.dPlusBloques) / r.dPlusBloques,
    )
    expect(cuantil(delta, 0.9)).toBeLessThan(0.05)
  })
})
```

El paso 0 escribe este mismo fichero contra el calendario de hoy con `it.todo` en las filas cuya columna «hoy» está fuera de banda (previsión, de la tabla: `cruces`, `unDiaUltimaCota`, `reinaFuera30`, `muroMeta`, `puncheurMeta`, `murosPorClasica`, `adoquin`, `kmClase2`, `kmClase`, `esqueletosPorClase`, `primerPuerto`, `nacionales`) y su cifra en el nombre del test; esa lista de rojos es la línea base de 13.6.

### 13.4 `calendarQueens` estratificada, `reina-175-4800` y `forma.reinaCanonica.*`

Hoy `allCalendarQueens()` (`calendarQueens.ts` l. 52-71) toma toda etapa `reina` no crono, la ordena por `desnivelDe` y `calendarQueenSample()` coge una de cada `PASO = 6` (l. 46): 157 reinas, muestra de 27, de las que 11 son reales, 5 de edición sin rasgos, 2 de un día y 9 de `stageMix` (mapa 06 §3.1). El test afirma cuatro cosas (l. 26-31, 62-68): más de 100 reinas y más de 15 en la muestra; la rejilla toca los dos extremos; `facil.races > 0` y `dura.races > 0` en `<1500` y `2500-3500` con `facil.wonFromMovePct > dura.wonFromMovePct + 10` («el desnivel decide»: 43,8 % contra 1,6 % al escribirlo); y `wonFromMovePct ∈ [6; 30]` (`TARGETS.calendarQueens.breakawayWinPct`, `targets.ts` l. 727-734), que es VIGILANCIA por decisión del dueño («está bien así» sobre el 18,1 %) y cuyo ancho son 3σ con 108 carreras (σ ≈ 3,7). Dos cosas cambian con el generador nuevo: 25 de las 27 etapas no reales cambian de perfil, y la muestra cambia de composición. Y una tercera que el mapa 06 §6.3 señala: el 60/40 de `ROUTE.queenHighDplusShare` existe porque este test exige la cola baja; en E1 la cola baja la decide el diseño (`et_reina_blanda` con `ARCH.reina.blandaShare`, decisión 8) y el 60/40 se retira.

Decisión 32, escrita como código:

```ts
// packages/engine/src/sim/calendarQueens.ts (cambios)
export const BANDAS_DESNIVEL = [/* sin cambios: <1500, 1500-2500, 2500-3500, >3500 */] as const
const FINAL_KINDS: FinalKind[] = ['alto', 'cima_cerca', 'valle_corto', 'valle_largo']
/** Tamaño objetivo de la muestra; PASO se deriva de él y no al revés. */
export const MUESTRA_OBJETIVO = 30

export interface CalendarQueen { /* sin cambios */ + routeSource: RouteSource; skeleton: SkeletonId | null }

/**
 * Muestra ESTRATIFICADA por (finalKind × cubeta de desnivel): dentro de cada estrato no vacío, ordenado
 * por dPlus, se toma una de cada PASO = max(1, round(total / MUESTRA_OBJETIVO)) empezando por la primera,
 * así ningún estrato poblado queda sin representante. Sigue siendo una rejilla escrita, sin dado.
 */
export function calendarQueenSample(): CalendarQueen[]

export interface CalendarQueenStats {
  /* sin cambios */
  porFinalKind: { kind: FinalKind; stages: number; races: number; wonFromMovePct: number }[]   // impreso, sin banda
  porEstrato: { kind: FinalKind; banda: string; stages: number; wonFromMovePct: number }[]      // impreso, sin banda
}
```

El test conserva sus cuatro aserciones con una lectura nueva del comentario: `facil.races > 0` lo sostiene `et_reina_blanda` por diseño, no un 40 % dirigido; `facil > dura + 10` se espera que siga porque es física del motor (cuánto puerto tiene la etapa, epics E3 paso 4) y no forma; y la banda global [6; 30] se conserva como vigilancia hasta la remedición del paso 9 (D6, sección 18: si la cubeta `<1500` queda con menos de 3 etapas en la muestra estratificada, la comparación pasa a `<2000` contra `>3000`; con `blandaShare` 0,25 en media y montaña no debería ocurrir, y el censo lo dice antes de correr nada con `reinaColaBaja`). Con 4 semillas en CI el reloj sigue en 3.600 s (test l. 58: 126 s en máquina libre y 370 cargada para 27 × 4). Las cubetas por `finalKind` y por estrato se imprimen desde el primer día y reciben banda cuando tengan σ conocida y dueño (regla 4 del mapa 04 §5.3).

Test de ejemplo añadido a `sim/calendarQueens.test.ts`:

```ts
it('la muestra estratificada representa cada forma poblada del calendario', () => {
  const todas = allCalendarQueens()
  const muestra = calendarQueenSample()
  expect(muestra.length).toBeGreaterThanOrEqual(24)
  expect(muestra.length).toBeLessThanOrEqual(40)
  for (const kind of FINAL_KINDS)
    for (const b of BANDAS_DESNIVEL) {
      const pobl = todas.filter((q) => q.finalKind === kind && q.dPlus >= b.min && q.dPlus < b.max)
      if (pobl.length > 0)
        expect(
          muestra.some((q) => q.finalKind === kind && q.dPlus >= b.min && q.dPlus < b.max),
        ).toBe(true)
    }
  // Y la cola baja existe por diseño (ARCH.reina.blandaShare), no por un 40 % dirigido
  expect(todas.filter((q) => q.dPlus < 1500).length / todas.length).toBeGreaterThanOrEqual(0.05)
})
```

`reina-175-4800` entra en `sim/scenarios.ts` como escenario canónico impreso en `pnpm sim` SIN banda, con el mismo campo que `reina-150` (4 líderes MON 84 a 87, 6 baroudeurs, 3 sprinters, 163 relleno, `scenarios.ts` l. 332-336): es la plantilla 3 del mapa 07 §5, 175 km y 4.800 m, puertos en el km 45 (12 km al 7 %), 95 (17 km al 7,3 %), 130 (10 km al 7,8 %) y 159 a 175 (15,8 km al 7,9 %), meta `cima`. Sirve para lo que `reina-150` no puede: una reina de gran vuelta de manual, con el 71 % de la subida fuera de los últimos 30 km. No mueve ninguna huella (es nueva) y no recibe banda en E1: se imprime, se anota su cifra en `balance.md` «v61 §0» con el generador viejo (no depende de él) y se sella cuando tenga σ, que es lo que el mapa 04 §5.3 regla 4 exige. `mountain.breakawayWinPct` [25; 45] y `mountain.top10GapSeconds` [40; 300] no se mueven (no ven el generador) pero cambian de rótulo en el informe de `cli.ts`: `forma.reinaCanonica.breakawayWinPct` y `forma.reinaCanonica.top10GapSeconds`, con el texto «control de forma sobre `reina-150` (1.200 m); la montaña del calendario está en `calendarQueens`». La clave `mountain` de `TARGETS` no se renombra en E1 (renombrarla toca `invariants.test.ts` y `cli.ts` sin cambiar ninguna medida); lo que se corrige es la lectura, que es lo que falló.

### 13.5 `frozenSkeletons` y `GENERATED_QUEENS`

`REAL_QUEENS` (`realQueens.ts` l. 46-92) es una lista cerrada «para que tocar un recorrido no cambie el contenido del banco y se pueda comparar entre versiones» (l. 42-44). Tres de sus nueve perfiles los dibuja hoy `mountainClassicSegments` por `stagesFromEdition` → `oneDaySpec` (Colombia e5 232 km, Guatemala e9 200 km, Tachira e6 166 km; mapa 06 §3.2), y el `why` de Colombia («el último puerto a 62 km de meta y 47 km rodadores») describe un perfil que ya no corre (18 km tras la cota, `valle_corto`). El juez del motor (riesgo 8) puso las dos salidas malas: congelar `Segment[]` literales es un museo del generador viejo; cerrar por brief resorteado pierde la comparabilidad. La decisión 33 toma la tercera: cerrar por FORMA con el renderizador nuevo.

```ts
// packages/engine/src/sim/frozenSkeletons.ts
/**
 * Las tres reinas generadas de REAL_QUEENS, escritas como Skeleton literal: kind, finalKind, meta, slots
 * y un `canonico: Motif[]` fijo que pasa los vetos por construcción. El perfil sale de
 * renderSkeleton(canonico, routeRng(`frozen|${clave}`)) y no cambia mientras no cambien el esqueleto
 * literal ni el renderizador; si cambia el renderizador, cambia con causa y ENGINE_VERSION, que es lo que
 * el banco quiere ver.
 */
export const FROZEN_QUEENS: Record<
  'race-colombia:5' | 'race-guatemala:9' | 'race-tachira:6',
  Skeleton
>
export function frozenProfile(clave: keyof typeof FROZEN_QUEENS): StageProfile

// packages/engine/src/sim/realQueens.ts (cambios)
export interface RealQueen {
  raceId: string
  stageIndex: number
  why: string
  frozen?: keyof typeof FROZEN_QUEENS
}
// findStage(raceId, stageIndex): si la entrada tiene `frozen`, el perfil es frozenProfile(frozen); si no, el del calendario
```

Los tres esqueletos literales se escriben en el paso 9 a partir de la forma que el `why` PROMETE, no de la que el generador viejo dibujó: Colombia e5 como `et_reina_valle` de 232 km con el último puerto coronando a 62 km y 47 km de `enlace` hasta meta (`valle_largo`), porque esa es la regresión de la v16 que la entrada existe para cubrir; Guatemala e9 como `et_reina_alto_largo` de 200 km y D+ 4.075 en `andes` con campo continental; Tachira e6 como `et_reina_alto_corto` de 166 km. El `why` de cada una se reescribe describiendo el esqueleto (motivos, km, D+, `finalKind`). `REAL_QUEENS` sigue con 9 entradas. `sim/frozenSkeletons.test.ts` sella que `finalKindOf(frozenProfile(k)) === FROZEN_QUEENS[k].finalKind`, `stageKindOf(...).kind === 'reina'`, `verify(...) === null` y la huella FNV del perfil rendido (re-sellable con causa); y para las nueve entradas, que el `why` sigue describiendo el perfil, que es el test que el mapa 04 §4.3 punto 3 echaba en falta:

```ts
// packages/engine/src/sim/frozenSkeletons.test.ts
it('cada entrada de REAL_QUEENS sigue siendo la forma que su why promete', () => {
  for (const q of REAL_QUEENS) {
    const { stage } = findStage(q.raceId, q.stageIndex)
    const fk = finalKindOf(stage.profile)
    expect(fk, `${q.raceId} e${q.stageIndex}: ${q.why.slice(0, 60)}`).toBe(
      FORMA_DECLARADA[`${q.raceId}:${q.stageIndex}`],
    )
  }
})
it('las tres congeladas no cambian mientras no cambie el renderizador', () => {
  expect(fnv(frozenProfile('race-colombia:5'))).toBe(
    0x0000_0000 /* sellado en el paso 9, con causa */,
  )
})
```

`GENERATED_QUEENS` es la contrapartida: tres reinas del calendario NUEVO elegidas por forma, una `alto`, una `cima_cerca` y una `valle_largo`, corridas con `realQueenSetup` y 6 semillas e impresas en `pnpm sim` sin banda. Se eligen una vez, en el paso 9, con una regla escrita (para cada `finalKind`, la reina con `routeSource !== 'real'` de mayor `dPlus` en su cubeta, desempate por `raceId`), y después se escriben POR NOMBRE en `realQueens.ts` con su `why` medido, así la lista es cerrada y el test anterior las cubre también. Su función es que el banco por forma mida también lo que el generador nuevo produce, y no solo lo que producía el viejo; reciben banda cuando tengan σ y dueño, no en E1.

### 13.6 El protocolo «mejor y no solo distinto» y la tabla pareada como condición de borrado

Dos ejes que no se pueden confundir porque en v60 §1b ya chocaron: realismo (¿se parece el calendario a lo que se corre?) y variedad (¿dos etapas del mismo tipo se distinguen?). Y un tercero que los dos anteriores no ven: las bandas de simulación, que cambian con el generador tanto si es mejor como si es peor. El protocolo (decisión 30) se escribe en `docs/balance.md` «v61» ANTES de correr nada, en este orden:

1. **Línea base (paso 0).** Con el generador viejo se corre `routeCensus` y se guarda la tabla entera de 13.3.3 (realismo y variedad) con la columna «hoy»; se lista qué bandas están en rojo (previsión al final de 13.3.3). Se mide `scripts/medir-arranque.mjs` (sección 14) y se imprimen `reina-175-4800` y `medianLeadGroupRiders` sin banda. Nada de esto cambia conducta ni versión.
2. **Pre-registro.** Para cada banda de simulación de la tabla siguiente se escribe la dirección esperada y la razón, con la cifra de hoy al lado. Es la parte que convierte «se movió» en «se movió como la carretera dice».
3. **Pareado.** Mismo `worldSeed`, mismo campo (`buildField(worldSeed, race.level)`, `realQueens.ts` l. 109-113), misma semilla de etapa con `engineVersion: 1` fijo en `stageSeed` (l. 179-182: «el objetivo mide el comportamiento del motor, no los dados»), generador viejo contra nuevo, 12 semillas. La diferencia por semilla es la medida; la mediana agrupada baila en huecos de la nube (v49, `targets.ts` l. 108-131) y por eso no se compara sola.
4. **Cuatro condiciones, todas necesarias.** (a) Toda banda de realismo roja en la línea base pasa a verde y ninguna verde pasa a roja. (b) Todas las de variedad en verde. (c) Las canónicas de 13.1 no se mueven ni un dígito: `llana-180`, `reina-150`, `cri-40`, `chronicle`, las cuatro huellas. (d) Las de simulación se mueven en la dirección pre-registrada o, si no, se explica con medida por qué la previsión era mala, y NO se ajusta la banda para que cuadre (regla «previsión fallida», 13.7). Si (a) a (d) se cumplen, el generador es mejor; si solo (b), es distinto; si falla (c), ha tocado el motor y no el generador y no se mezcla en la misma tanda.
5. **Doble lectura de las listas cerradas.** Por nombre (¿qué le pasó a `race-colombia` e5?) y por forma (¿qué les pasa a las reinas `alto` de 3.500 a 4.500 m?). Si solo se lee por nombre, un cambio de forma se confunde con un cambio de motor (mapa 04 §5.3 regla 2). Sobre `calendarQueens` el pareado por nombre no es posible (la muestra cambia de composición): ahí se compara por estrato, y por nombre solo sobre `REAL_QUEENS` con `frozenSkeletons` y sobre `SMALL_TOURS`.

Pre-registro, con la dirección y su razón (de mapa 04 §4.2 y banco §11.4; la cifra de hoy se rellena en el paso 0 desde `balance.md`):

| Banda                                                                                                   | Hoy                                                | Dirección prevista                                                                                     | Razón                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calendarQueens.breakawayWinPct` [6; 30]                                                                | 18,1 % (v44; remedir en el paso 0 con 12 semillas) | Baja, dentro de banda                                                                                  | Las reinas generadas ganan D+ (p50 de una semana ≥ 2.400 contra 2.898/1.734) y subida lejana (V8b); la cola baja sigue poblada (`et_reina_blanda`) |
| `calendarQueens` por cubeta                                                                             | 43,8 / 13,7 / 1,6 / 0                              | Monótona decreciente; la cubeta `<1500` baja hacia [25; 40]                                            | Las blandas ahora tienen subida fuera de 30 km, que da opción al pelotón de controlar                                                              |
| `realQueens.lastGroupPct` [7; 14]                                                                       | mediana de 54 corridas                             | No se mueve más que el ruido: 6 reales intactas; las 3 congeladas por forma                            | El pareado por nombre es exacto sobre las 9                                                                                                        |
| `realQueens.worstStagePct` ≤ 18                                                                         | rhone-alpes e8 en 17,57                            | No se mueve (es real)                                                                                  | idem                                                                                                                                               |
| `grandTour.*` y `abandonCauses.*`                                                                       | en banda                                           | No se mueven                                                                                           | 20 de 21 reales; si se mueven, acoplamiento                                                                                                        |
| `smallTours.mediaGroups` [3; 8]                                                                         | en banda                                           | Sube                                                                                                   | Las cotas de `et_media_*` caen más cerca de meta (ventanas de `MetaKind`), parten más                                                              |
| `smallTours.mediaOneGroupPct` [0; 20]                                                                   | en banda                                           | Baja                                                                                                   | Misma razón                                                                                                                                        |
| `smallTours.flatWinnerGroupPct` [85; 100]                                                               | en banda                                           | Se mantiene                                                                                            | `et_llana` sigue sin cota decisiva (V9)                                                                                                            |
| `smallTours.bestSprinterWinPct` [25; 60], `sweepPct` [0; 30]                                            | en banda                                           | Se mantienen                                                                                           | Depende del campo, no del trazado (mapa 04 §2)                                                                                                     |
| `smallTours.photoRepeatTopFive` [1; 3,6], `worstRacePhotoRepeat` [0; 4,1], `sameWinnerPairPct` [15; 55] | en banda                                           | Bajan o se mantienen                                                                                   | Menos llanas seguidas por `ARCH.pesosComposicion` y prólogo; la parte de composición se imprime aparte                                             |
| `smallTours.flatMoveWorstMarginS` [0; 900]                                                              | en banda                                           | Se mantiene                                                                                            | Sin cambio en la física de la fuga llana                                                                                                           |
| Ley de velocidad (llana > media > reina; llana ≤ 48, reina ≥ 32 km/h)                                   | en banda                                           | Se mantiene                                                                                            | Los km por clase bajan en .2, la velocidad no depende del km                                                                                       |
| `timeTrials.tailPct` [8; 15], `worstStagePct` ≤ 17                                                      | en banda                                           | Sin cambio (≤ +0,5 puntos)                                                                             | `et_crono` y `nc_crono` siguen llanas; +12 km = +0,7 puntos (`targets.ts` l. 158-161)                                                              |
| Saturación de las 8 más duras                                                                           | 0 de 8                                             | 0 de 8                                                                                                 | V5 impide el final en alto largo en un día; las 8 pueden ser otras                                                                                 |
| `distinctWinnerPct` de `winShare` (sin banda)                                                           | impreso                                            | No baja                                                                                                | Si un generador nuevo baja la variedad de ganadores, ha empeorado (mapa 04 §5.2)                                                                   |
| Quién gana por esqueleto (nueva, informativa)                                                           | n/a                                                | `ud_muros` clasicómano, `ud_adoquin` rodador de pavé, `et_media_muro` puncheur, `et_reina_*` escalador | Es el criterio de «mejor» por el lado del juego (arquitectura §11.4); sin banda en E1                                                              |
| `world.test.ts` bandas de población                                                                     | en banda                                           | Se mantienen; el reparto de `kind` por clase se anota antes y después                                  | Fila 12 de 13.2                                                                                                                                    |

**La tabla pareada como condición de borrado (decisión 29).** El generador viejo no se borra en el paso 8: en ese paso `profileGen.ts` queda reducido a primitivas (sección 15) y los ocho `xxxSegments`, `normalize`, `garantizaPuerto`, `oneDaySpec` y el `stageMix` viejo se copian, sin cambiar una línea, a `packages/engine/src/sim/legacy/profileGenLegacy.ts`, que exporta además `legacyCalendar(): CalendarRace[]` (el `buildRace` de la v69 sobre las mismas filas de `raceRoutes.ts` y `editions.ts`). `routes/golden.test.ts` se muda con él a `sim/legacy/golden.test.ts` y comprueba que `legacyCalendar()` reproduce las 1.418 huellas del paso 1: es la prueba de que lo que se compara es el generador viejo y no una copia rota. El pareado lo corre `sim/legacy/pareado.test.ts`, que no entra en CI (`describe.skipIf(!process.env.PAREADO)`), corre las filas de la tabla anterior viejo contra nuevo sobre `legacyCalendar()` y `calendarForSeason(0)` con `PAREADO_SEMILLAS` (12 por defecto) e imprime la tabla `generador: viejo | nuevo | Δ por semilla (mediana, p10, p90)`. Esa tabla va a `docs/balance.md` «v61» entera, como hizo la v49 con la brecha 1.º a 10.º, y SOLO cuando está escrita y las cuatro condiciones leídas se borra `sim/legacy/` completo (los tres ficheros) en el mismo cambio que cierra la nota. Un generador viejo que sobreviva a esa nota es un segundo generador en el repositorio, y eso es justo lo que la sección 1 diagnostica.

### 13.7 La remedición: dueño, orden, horas y techo

El juez del motor (riesgo 5) y los de cobertura (riesgo 8) y ejecutabilidad (riesgo 8) dijeron lo mismo: ninguna propuesta puso reloj ni dueño a la remedición, y cada push a `packages/engine/` ya corre `test:bancos` (`ci.yml` l. 112: `calendarQueens` 126 a 370 s, `smallTours` reloj 3.900 s, `grandTour` 5.400 s). La decisión 34 lo cierra así.

**Dos dueños, con nombre de papel.** El dueño OPERATIVO es el implementador del paso 9: corre, tabula, escribe la nota y no decide ninguna banda. El dueño de cada BANDA es el dueño del repositorio: decide con la cifra delante, como hizo en v38 (`flat.breakawayWinPct`), v44 («está bien así») y v40 (techo de 15 min). Ninguna banda se mueve sin las dos firmas: la cifra del primero y la decisión del segundo, anotadas en `balance.md`.

**Orden por coste creciente**, de modo que lo barato descarte antes de pagar lo caro, y cada tanda cerrada antes de abrir la siguiente:

| Orden | Banco                                                                        | Semillas                                           | Coste real estimado (por generador)                              | Reloj del test                      | Qué decide                                            |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| 1     | `routeCensus` (13.3)                                                         | n/a                                                | segundos (569 ms medidos hoy por pasada)                         | `test:rapido`                       | Condiciones (a) y (b); si fallan, no se sigue         |
| 2     | `stageKind.test.ts` por esqueleto                                            | 60 × 5 km × ≤ 4 zonas × 32 = ≤ 38.400 generaciones | minutos (sin `sampleProfile`)                                    | `test:rapido`                       | Cruces de clase; `intentos` p95                       |
| 3     | `realQueens` con `frozenSkeletons` y `GENERATED_QUEENS`                      | 6                                                  | ~4 min (54 + 18 corridas)                                        | 900 s (`invariants.test.ts` l. 697) | Condición (d) por nombre y por forma                  |
| 4     | `timeTrials`                                                                 | 6                                                  | ~2 min (30 cronos)                                               | 300 s (l. 234-261)                  | Condición (d)                                         |
| 5     | `calendarQueens` estratificada                                               | 12                                                 | ~6 a 19 min (126 a 370 s por 27 × 4, escalado ×3 y a ~30 etapas) | 3.600 s con 4 semillas en CI        | D6; condición (d) por estrato                         |
| 6     | Saturación de las 8 más duras                                                | 12                                                 | ~30 min (96 clásicas largas con campo uniforme)                  | 1.800 s con 3 semillas (l. 511)     | Condición (d); techo 0,92                             |
| 7     | `smallTours`                                                                 | 12                                                 | ~25 min (10 carreras enteras)                                    | 3.900 s con 8 semillas (l. 891)     | Condición (d), nueve bandas, composición contra motor |
| 8     | Jaén (`coherence.test.ts`, 40 semillas) y Tramuntana (`journal.test.ts`, 12) | 40 / 12                                            | ~5 min                                                           | 300 s / 30 s de suelo               | Listón cero; lo que aflore es del motor               |

Todo ×2 (viejo y nuevo). Suma estimada: ~1 h 25 min por generador, ~2 h 50 min en total de máquina, en máquina libre; cargada, el factor medido en el nocturno es 2,26 (`calendarQueens.test.ts` l. 47-49). **Presupuesto: 4 h de máquina y 2 sesiones humanas** (una para correr y tabular, otra para leer con el dueño de las bandas); **techo: 8 h de máquina**. Si el techo se supera, se para, se anota lo corrido y se reduce el número de semillas de los bancos 6 y 7 a 8 (nunca por debajo de las del CI), no se recorta el orden. Los relojes de los tests no cambian en E1: siguen valiendo la regla «presupuesto ≥ 4× lo que cuesta en CI» (`invariants.test.ts` l. 297-298).

**La regla «previsión fallida».** Un resultado que contradice la dirección pre-registrada de 13.6 se anota en `balance.md` «v61» como «previsión fallida» con la medida pareada, la previsión y la razón que se encuentre, y NO mueve la banda: la banda se queda como estaba (en verde o en rojo) hasta que el dueño del repositorio decida con la cifra delante. Si la banda queda en rojo, el paso 9 no se cierra y el generador viejo no se borra. Es la misma regla que el repositorio ya se aplicó en la v44: el 18,1 % contradecía cinco versiones de 27 a 30 % y la respuesta no fue ajustar `mountain.breakawayWinPct`, sino una banda nueva medida sobre lo que el juego corre. Lo contrario (recentrar para que cuadre) es lo que el protocolo existe para impedir, y por eso está escrito antes de correr nada.

Lo que sale de esta sección y va a otras: la lista de rojos de la línea base y la tabla pareada a la nota «v61» (sección 15, pasos 0 y 9); D6 con su cifra a la sección 18; el coste de arranque a la sección 14; y `frozenSkeletons` como riesgo 8 de la sección 17 (más varianza en los bancos, contenida con `fixed.skeleton` y listas cerradas por forma).
