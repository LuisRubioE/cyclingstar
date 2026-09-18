## 13. El banco: invariantes, censo, calendarQueens, «mejor y no solo distinto», remedición

El banco de este repositorio tiene escrita su propia lección y esta sección la aplica al generador: «lo que no se mide sobre carreras reales, no se mide» (`targets.ts` l. 213-215 y 375-379, vía mapa 04 §3.3). Seis veces (v15, v17, v19, v23, v40, v44) un banco canónico en verde certificó algo que producción no hacía, y en cuatro de las seis el defecto era del PERFIL sobre el que se medía y no del motor (mapa 04 §3.3). La v60 §1b repitió el patrón por omisión: `mountainSegments` cambió el reparto de finales de las 157 reinas (`alto` 56,7 % → 38,2 %) y `realQueens`, `grandTour` y `smallTours` siguieron en verde sin una remedición anotada (mapa 04 §3.4). Un generador que cambia de forma cambia 1.241 de las 1.418 etapas (todo lo que no es `real`, mapa 06 §1), así que esta sección fija cuatro cosas: qué no puede moverse, qué se mueve a propósito y cómo se re-sella, cómo se mide en segundos lo que hoy nadie sabe sin correr `balance.md` v60 §12 a mano, y qué hace falta para decir «mejor» y no solo «distinto».

### 13.1 Lo que no se mueve y no debe moverse

Son la red que dice que el rediseño no ha tocado el motor. Ninguno de estos tests lee `profileGen.ts` ni `calendar.ts` en su parte generada, y por eso su verde no dice nada del generador y su rojo lo dice todo (mapa 04 §4.1 y §5.3 regla 3; mapa 06 §5).

| Qué                                                                                                                                                                                     | Dónde                                                                                                                                                                                                                     | Por qué no ve el generador                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las 15 bandas canónicas: `flat.*` (3), `phases.*` (3), `mountain.*` (2), `timeTrial.*` (2), `erosion.flatFresh` y `.queenFresh`, `chronicle.*` (3)                                      | `sim/invariants.test.ts` l. 128-212, 275-459 (los sintéticos), 555-607                                                                                                                                                    | corren `llana-180`, `reina-150`, `cri-40`, perfiles LITERALES de `sim/scenarios.ts` l. 166-236, 303-348, 461-475 (mapa 04 §1.1)                                   |
| Las cuatro huellas selladas dígito a dígito                                                                                                                                             | `stage/attribution.test.ts` l. 24-38 y 159, `stage/timetrial.test.ts`, `sim/raceRadio.test.ts` l. 404                                                                                                                     | los mismos escenarios literales (mapa 06 §3.3)                                                                                                                    |
| Los invariantes SPEC 6.17 sintéticos: llano, fases, montaña, crono, desgaste, voz, pavés, cierre, inercia                                                                               | `sim/invariants.test.ts` l. 128-212, 555-607, 957-1049                                                                                                                                                                    | perfiles literales o un bloque de 60 km con 30 de `paves`                                                                                                         |
| `grandTour.*` y `abandonCauses.*` (12 vueltas de `race-france`)                                                                                                                         | `sim/invariants.test.ts` l. 609-758                                                                                                                                                                                       | 20 de 21 etapas con rasgos reales; solo la e21 llana es generada y cambia de detalle, no de forma (mapa 06 §1 y §3.2)                                             |
| Los perfiles reales                                                                                                                                                                     | `routes/featureProfile.test.ts`, `routes/classicRoutes.test.ts`, `erosion.longClassicFresh` (Flandes), `.hardestClassicFresh` (Lombardía), `.queenThirdWeek` (Francia e18), las 18 de un día WT de la saturación, Giro e9 | `featureProfile.ts` no se toca en E1 (decisión 27, sección 11) y la huella FNV de las 177 + 3 lo sella (decisión 28)                                              |
| `routes/finalKind.test.ts`                                                                                                                                                              | cortes 0,5 / 5 / 20 km (l. 92-100)                                                                                                                                                                                        | es la vara con la que se miden las reinas; `ARCH.meta.*` se diseña con holgura 0,7 sobre esos cortes (sección 4) precisamente para no tocarla                     |
| `db/recorridoDelMundo.test.ts`                                                                                                                                                          | l. 55-63                                                                                                                                                                                                                  | auto-consistente: compara el congelado con el calendario del mismo proceso; es la garantía de que el generador nuevo solo alcanza carreras futuras (mapa 06 §3.5) |
| `routes/altimetry.test.ts`, `schedule.test.ts`, `uci.test.ts`, `raceRoutes.test.ts`, `db/abandon`, `gcOrder`, `stageRun`, `teamPlan`, `locks`, `calendarConcurrency`, `world/*.test.ts` | mapa 06 §2.5 y §3.5                                                                                                                                                                                                       | datos de tablas, `TEST_TOUR` a mano o `kind` literal; `raceRoutes.test.ts` solo mira el número de etapas, que sigue viniendo de la fila (decisión 44)             |

Regla operativa, que es la condición (c) del protocolo de §13.6: si alguna de estas cifras se mueve un dígito en un cambio de `routes/`, el cambio ha tocado el motor (por ejemplo `sample.ts`, `finish.ts` o `physics.ts`) y se para; no se mezcla en la misma tanda. Dos aclaraciones sobre `mountain.*`: (1) `TARGETS.mountain.breakawayWinPct` [25; 45] y `.top10GapSeconds` [40; 300] no se mueven ni se retiran, porque la banda SPEC §6.17 es del dueño (sección 17, punto 15) y porque `reina-150` con 1.200 m es un control de forma útil («en un final en alto de manual, ¿la fuga tiene opción?», `targets.ts` l. 722-725); (2) lo que cambia es el rótulo del informe de `pnpm sim` (`sim/cli.ts`), que pasa a `forma.reinaCanonica.*`, y el comentario de `targets.ts` l. 88 que aún cita «una mediana de 2.023» (cifra del generador de la v63, mapa 04 §3.4) se sustituye por la cifra del paso 9. La clave `mountain` en `targets.ts` se conserva para no mover `invariants.test.ts` l. 188-200.

### 13.2 Lo que se mueve a propósito y cómo se re-sella

«Re-sellar» aquí es lo que hace el repositorio: mover la cifra o la lista con la causa escrita en el propio test (como `stageHistory.test.ts` l. 185-190 o las huellas de `attribution.test.ts` l. 320-355) y con la medida antes/después en la nota «v61 · El generador es una gramática» de `docs/balance.md`. Un cambio declarado, atribuido y anotado; nunca un re-sellado para tapar. La tabla completa la de arquitectura §11.2 con lo que el mapa 06 §4 exige y con los pasos de la sección 15.

| #   | Test o banda                                                                                                               | Qué le pasa                                                                                                                              | Qué se hace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Paso   |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | `index.test.ts` l. 381 (`ENGINE_VERSION` 69)                                                                               | sube UNA vez                                                                                                                             | al siguiente número libre en producción; ninguna otra subida en E1 (decisión 3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 8      |
| 2   | `routes/stageKind.test.ts` (109 l.; 8 generadores × 300 perfiles, mapa 06 §2.1)                                            | los ocho `xxxSegments` desaparecen                                                                                                       | se reescribe por esqueleto: cada uno de los 32 `SkeletonId` × 5 km de su `Skeleton.km` × 60 semillas × todas las zonas compatibles (`requiere` satisfecho) → `stageKindOf(profile, timeTrial).kind === Skeleton.kind` y, si hay `finalKind`, `finalKindOf(profile) === Skeleton.finalKind`, en el 100 % (V6, V7). `ud_montana` entra por fin (hoy `mountainClassicSegments` dibuja 51 de 157 reinas sin que nadie lo selle, mapa 06 §6.1). Las reinas siguen exigiendo las dos etiquetas `Summit finish` y `Mountains` (l. 87-91). El comentario de umbrales de `stageKind.ts` l. 44-58 se reescribe con la tabla medida (hoy dice «10.800 etapas de cada generador» y reinas hasta 26,7 km, mapa 01 §9.6) | 8      |
| 3   | `routes/calendar.test.ts` l. 162-174 (km de las 60 ediciones al 0,1)                                                       | debe seguir verde                                                                                                                        | V10 y `normalizeEnlaces` lo garantizan (sección 8); el test gana la aserción `routeSource === 'edicion'` en esas etapas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 8      |
| 4   | `routes/calendar.test.ts` l. 269-277 (`Uphill finish` acaba en `puerto`)                                                   | debe seguir verde                                                                                                                        | `et_media_alto`, `et_reina_alto_corto` y `et_reina_alto_largo` terminan en `puerto` por construcción de `MetaKind` (sección 4); se generaliza a «toda etapa cuyo esqueleto tiene `meta ∈ {alto_corto, alto_largo, muro_meta}` acaba en `puerto`» sobre `calendarForSeason(0)` entero                                                                                                                                                                                                                                                                                                                                                                                                                       | 8      |
| 5   | `routes/calendar.test.ts` l. 108-121 (todo segmento con km > 0, banners dentro) y l. 184-246 (garantías de `mixRoles`)     | siguen verdes                                                                                                                            | `stageMix` conserva firma (decisión 19); las garantías pasan a `tour.test.ts` sin cambiar (sección 7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 7, 8   |
| 6   | `apps/api/src/stageHistory.test.ts` l. 199 (`cambian === 49`)                                                              | la cifra cambia                                                                                                                          | se re-sella con objetivo escrito: «solo etapas reales cuya etiqueta declarada difiere; generadas = 0», porque `kind` y `label` de toda etapa generada salen de `stageKindOf` (V6) y `stageHistory.ts` deja de reetiquetar con su propia regla (decisión 23). La mitad que vigila (`spec.kind === stage.kind`) da cero por construcción                                                                                                                                                                                                                                                                                                                                                                     | 8 y 10 |
| 7   | `sim/calendarQueens.test.ts` (71 l.)                                                                                       | cambia la muestra y el desnivel de 103 de las 157 reinas (las 54 reales no)                                                              | §13.4: muestra estratificada, 12 semillas fuera de CI antes de tocar nada, D6 con la cifra delante                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 9      |
| 8   | `sim/invariants.test.ts` l. 855-955 (`smallTours`, 9 bandas, 7 de 10 carreras generadas)                                   | cambia composición y relieve                                                                                                             | remedir pareado (§13.6) con dirección pre-registrada; `media.stages > 40` (l. 915) se recuenta porque cuenta etapas por `kind` y depende de `ARCH.pesosComposicion`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 9      |
| 9   | `sim/invariants.test.ts` l. 770-844 (`realQueens`)                                                                         | 3 de 9 son generadas y su `why` ya no describe el perfil (Colombia e5: «47 km rodadores» contra 18 medidos, mapa 06 §3.2)                | §13.5: `frozenSkeletons`; se remiden `lastGroupPct` y `worstStagePct` con 6 semillas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 9      |
| 10  | `sim/invariants.test.ts` l. 461-553 (saturación; las 8 más exigentes fuera del WT, l. 486-499)                             | el generador elige qué ocho entran; hoy son `race-ses-salines`, `race-mercantour`, `race-jura` y cinco `nc-*-road`                       | se remide con el conjunto nuevo (los 532 nacionales pasan a `nc_ruta`, decisión 15); criterio intacto: vaciado ≤ 0,96 y pájaras ≤ 14 %; previsión 0 de 8, porque V5 impide la forma que saturaba (Jura «al 82 % con el tanque a cero», `invariants.test.ts` l. 474-479)                                                                                                                                                                                                                                                                                                                                                                                                                                    | 9      |
| 11  | `sim/invariants.test.ts` l. 222-273 (`timeTrials`, 3 de 5 cronos generadas)                                                | `et_crono` admite `cota` ≤ 3 km al [3; 5] % (sección 5); `et_prologo` y `et_cronoescalada` entran (D3)                                   | se remiden `tailPct` y `worstStagePct`; previsión +0,5 puntos como mucho en `tailPct`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 9      |
| 12  | `sim/coherence.test.ts` l. 120-125 (Race Jaén, 40 semillas) y `stage/journal.test.ts` l. 104-108 (Tramuntana, 12 semillas) | otro relieve bajo un listón de cero                                                                                                      | se re-corren; una contradicción que aflore es del motor y se arregla, el cero no se afloja                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 9      |
| 13  | `sim/world.test.ts` y `RACE_DAY_TSS` (`world.ts` l. 169-193 lee `st.kind` al cargar el módulo)                             | el reparto de `kind` cambia (BE, NL, DK, AE, AU sin reina por `cordillera: null`; medias flamencas a `clasica`; nacionales por circuito) | fila propia de la nota: se mide el reparto de `kind` por división ANTES (paso 0, con el calendario de hoy) y DESPUÉS (paso 8) y se imprime la carga media por corredor con `RACE_DAY_TSS`; si una banda de población se mueve, se anota con la causa; no se toca ninguna banda de `world` en E1                                                                                                                                                                                                                                                                                                                                                                                                            | 0 y 8  |
| 14  | `routes/golden.test.ts` (1.418 huellas FNV)                                                                                | existe solo entre los pasos 1 y 8                                                                                                        | se borra en el paso 8; `routes/realFingerprint.test.ts` (177 + 3) sobrevive y tiene que estar verde antes y después (decisión 28)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 1 y 8  |
| 15  | `db/recorridoDelMundo.test.ts`                                                                                             | auto-consistente                                                                                                                         | gana «dos temporadas, dos recorridos, un esqueleto» con `ARCH.edicion.activa` y el mismo perfil con `activa = false` (decisión 44)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 10     |

### 13.3 `routeCensus`: el censo geométrico que cabe en cada push

Lo que hoy nadie sabe sin correr `balance.md` v60 §12 a mano (cuántos `muro`, `puncheur`, `alto` y `pave` produce el calendario, con qué desnivel, con cuánta subida lejos de meta) pasa a medirse en segundos. Medido por el juez del motor con `juicios/coste-motor.mjs` sobre el `dist` de `ENGINE_VERSION` 69: una pasada de `sampleProfile` + `finishType(deriveFinishTerrain)` + `stageKindOf` + `finalKindOf` sobre las 1.418 etapas cuesta 569 ms, 0,40 ms por etapa (`juicios/motor.md` §1); es el 0,57 s que se cita en todo el documento y por eso el censo corre en cada push.

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
export function routeCensus(calendar: CalendarRace[] = SEASON_CALENDAR): RouteStats[]

export interface Cuantiles {
  n: number
  min: number
  p10: number
  p50: number
  p90: number
  max: number
  media: number
}
export interface Summary {
  n: number
  num: Partial<Record<keyof RouteStats, Cuantiles>> // solo los campos numéricos
  cat: Partial<
    Record<
      'kind' | 'finalKind' | 'finishType' | 'skeleton' | 'zona' | 'routeSource',
      Record<string, number>
    >
  > // fracción [0; 1]
}
export function aggregate(
  rows: RouteStats[],
  by: (r: RouteStats) => string,
): Record<string, Summary>
export function entropiaBits(reparto: Record<string, number>): number // Shannon en bits sobre fracciones
export function correlacion(a: number[], b: number[]): number // Pearson sobre `huella`, remuestreada a la más corta
```

Cómo se calcula cada campo, para que no haya dos censos:

- `finishType`: `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` (`stage/finish.ts` l. 94-123 y 165-189, vía `juicios/motor.md` §1), con `groupSize` 50 aquí y solo aquí. Es la única llamada a `sampleProfile` de todo E1 fuera del motor: `verify` no lo usa (decisión 4) y por eso una recalibración de `STAGE.finish*` mueve el censo y no los perfiles.
- `dPlus`: `dPlusDe(profile)` de `routes/grammar/geometry.ts` (integración de tramos con g > 0, decisión 9). `dPlusBloques`: la cuenta de `calendarQueens.ts` l. 54-58 (`sampleProfile`, bloques `subida`, `g/100 · STAGE.dx · 1000`). El censo imprime el delta y `calendario.test.ts` exige p90 de |`dPlus − dPlusBloques`| / `dPlusBloques` < 0,05 sobre las reinas: es la comprobación de que `Skeleton.dPlus` persigue lo que `desnivelDe` mide.
- `kmSubidaShare`: km de bloques `subida` sobre el total, la misma cuenta que `simulate.ts` l. 1696-1697 (mapa 03 §4.1). `breakAppealEstimado`: `clamp(STAGE.breakAppealClimbWeight · kmSubidaShare + (finishType ∈ {alto, muro, puncheur} ? STAGE.breakAppealUphillBonus : 0), 0, 1)`, la regla de `simulate.ts` l. 1698-1702 reproducida con las constantes de `STAGE` (hoy 4 y 0,35, mapa 03 §4.1). Se declara «estimado» porque `isUphillFinish` es del motor y aquí se aproxima por `finishType`.
- `climbKmOutsideLast30`: km de bloques `subida` con `kmToGo > STAGE.climbRaceKmToGo` (30, `constants.ts` l. 3521): la variable que separó `reina-150` (0 %) de las nueve reales (del 6 al 38 %) en `balance.md` v43 §7 (mapa 04 §3.2).
- `nPuertos`: segmentos `puerto` con `climbSize ≥ CLIMB_MIN_KM` 1,5; `nMuros`: segmentos `puerto` con km ≤ `WALL_MAX_KM` 3 y g ≥ 8; `longestClimbKm`: `climbSize` del mayor (`stageKind.ts` l. 36-42); `lastClimbKm`, `lastClimbG`, `kmAfterLastClimb`: de `routes/finalKind.ts`, con la pancarta si la hay (por eso `emitirPancartas` pone SIEMPRE `cima` en el último `puerto`, decisión 25).
- `huella`: g medio por km entero (vector de `round(km)` posiciones) sobre los bloques de `sampleProfile`, que ya está calculado para `finishType`. Sirve a V12 y a las bandas de variedad.
- `zona`, `skeleton`, `intentos`, `degradado`: de `GeneratedStage.arch`; `null` y 0 en las etapas `real`.

Dónde corre: `routes/grammar/calendario.test.ts` importa `routeCensus` y afirma `ROUTE_CENSUS_TARGETS` sobre `calendarForSeason(0)`; está bajo `routes/`, así que entra en `test:rapido` (`package.json` l. 20 excluye solo `packages/engine/src/sim/**`) y corre en cada push. `sim/routeCensus.test.ts` comprueba el censo mismo sobre perfiles literales (abajo) y corre con `test:bancos` y en el nocturno. `pnpm sim` imprime `aggregate(routeCensus(), r => r.skeleton ?? 'real')` al principio del informe, antes de simular nada.

#### `ROUTE_CENSUS_TARGETS`: las bandas de realismo y de variedad

```ts
export interface CensusTarget {
  id: string
  label: string
  poblacion: (r: RouteStats) => boolean // subconjunto sobre el que se mide
  medida: (rows: RouteStats[]) => number
  min?: number
  max?: number
  hoy: number | null // columna «hoy (medido)» del paso 0; null si la población no existía
  fuente: string // mapa, propuesta o juicio de donde sale la banda
  estado: 'sellada' | 'informativa' // informativa = se imprime, no afirma
  nMin: number // población mínima para afirmar; por debajo se imprime «n insuficiente»
}
export const ROUTE_CENSUS_TARGETS: readonly CensusTarget[]
export const CENSUS_N_MIN = 10
```

Regla de nacimiento (mapa 04 §5.3 regla 4): ninguna banda nace en rojo. En el paso 0 se escriben todas con `hoy` medido sobre el calendario de `ENGINE_VERSION` 69; las que están rojas hoy van en `it.todo` con la cifra en el nombre del test («hoy 0 de 1.075») y pasan a `it` en el paso 8; las que no tienen población hoy (`zona`, `skeleton`, identidad) tienen `hoy: null` y se afirman desde el paso 8. `estado: 'informativa'` se convierte en `'sellada'` solo cuando la cifra tenga dueño y sigma conocida, en el paso 9 o después. Las referencias reales (columna «real») salen de `scripts/medir-real.mjs` sobre las 177 etapas con rasgos (`datos.md` §1.4, decisión 40) donde hay ≥ 3 fuentes, y del mapa 07 §4 donde no las hay; el generador no lee ese fichero, solo el test.

Realismo (población: `routeSource !== 'real'` salvo donde se dice):

| id                    | Métrica                                                                                                                                       | Población                                                                                            | Banda                                                                                                                                  | Hoy (medido)                                                                                                                    | Real / fuente                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `vetos`               | violaciones de V1-V10 y V15; `degradado`; p95 de `intentos`                                                                                   | todo generado                                                                                        | 0; 0 (`ARCH.veto.fallbackMaxShare.calendario` 0); ≤ 3                                                                                  | n/a (no hay vetos)                                                                                                              | sección 9                                                                            |
| `cruces`              | `stageKindOf(profile).kind === kind` y `finalKindOf(profile) === arch.finalKind`                                                              | todo generado                                                                                        | 100 %                                                                                                                                  | 72 discrepancias de `kind` sobre 1.418 (`juicios/motor.md` §1); de 1 a 3 de 1.500 por forma (mapa 01 §5.1)                      | V6, V7                                                                               |
| `esqueletos.clase`    | esqueletos distintos por clase y formato                                                                                                      | un día WT/Pro; un día .1/.2; NC ruta; papeles en vueltas                                             | ≥ 8; ≥ 10; ≥ 6; ≥ 9                                                                                                                    | 6 moldes de un día y 3 terrenos (mapa 01 §2.1)                                                                                  | «siempre son los mismos tres o cuatro modelos» (agenda §4.18); arquitectura §11.3    |
| `esqueletos.entropia` | entropía de esqueleto por zona con ≥ 8 carreras                                                                                               | por `zona`                                                                                           | ≥ 1,5 bits                                                                                                                             | null (no hay zona)                                                                                                              | arquitectura §11.3                                                                   |
| `finales.reparto`     | reparto de `finalKindOf` sobre las reinas, con cada cubeta ≥ 5 % y `alto` en [0,35; 0,55]                                                     | `kind === 'reina'`, las 157 (reales incluidas, como `queenGeometry`, `calendarQueens.ts` l. 158-163) | sí                                                                                                                                     | 38,2 / 8,9 / 42,0 / 10,8 (mapa 06 §1)                                                                                           | real: 37 / 4 / 6 / 7 de 54 (`datos.md` §1.4); `queenFinalMix` ± 0,08 (tactica R28.2) |
| `reina.dplus.formato` | p50 de `dPlus` de reina por formato; cubeta < 1.500 poblada                                                                                   | reinas generadas por `format`                                                                        | una semana p50 ≥ 2.400; gran vuelta generada p50 ≥ 3.000 (n = 0 en E1: se imprime «n insuficiente» hasta E12); < 1.500 ≥ 5 % del total | 2.898 (`mountainSegments`) y 1.734 (`mountainClassicSegments`); 32 de 157 < 1.500 (mapa 06 §1)                                  | mapa 04 §5.1; mapa 07 §4.1                                                           |
| `reina.subidaLejana`  | `climbKmOutsideLast30` / km de subida                                                                                                         | reinas generadas                                                                                     | ninguna en 0 %; p10 ≥ 0,05                                                                                                             | `reina-150` 0 %; reales del 6 al 38 % (v43 §7); generadas: paso 0                                                               | V8b; `banco.md` §11.2                                                                |
| `reina.puertoFinal`   | `lastClimbKm` de las reinas `alto`                                                                                                            | reinas generadas con `finalKind === 'alto'`                                                          | informativa: p10 / p50 / p90                                                                                                           | [8,4; 26,7] (mapa 01 §2.5)                                                                                                      | real 3,3 / 9,7 / 17,1 (`datos.md` §1.4)                                              |
| `finales.muro`        | fracción de `finishType === 'muro'` y `=== 'puncheur'`                                                                                        | etapas en línea generadas                                                                            | `muro` ≥ 0,01; `puncheur` ≥ 0,08                                                                                                       | `muro` 0 de 1.075, `puncheur` 51 (4,7 %), `alto` 111 (`juicios/motor.md` §1; v60 §12)                                           | V11, V16; decisión 7                                                                 |
| `unDia.ultimaCota`    | `lastClimbKm ≤ 4,2` y `kmAfterLastClimb ∈ [3; 17]`                                                                                            | un día generado, `kind !== 'llana'`                                                                  | ≥ 98 % (el resto es `ud_montana_alto`)                                                                                                 | muro de [1; 2,5] km a ≥ 16 km (`classicSegments`); puerto de [4; 8] km a [13; 22] (`mountainClassicSegments`) (`datos.md` §1.4) | V5; mapa 07 §4.3; real 0,5 / 1,0 / 2,1 km y 0 / 7,8 / 20,8 km a meta                 |
| `unDia.finalLargo`    | un día con `finishType === 'alto'` y `lastClimbKm > 6`                                                                                        | un día generado                                                                                      | ≤ 2 %                                                                                                                                  | 0 % tras v40 (pero 9 de un día son `mountainClassicSegments`, mapa 06 §1)                                                       | mapa 07 §4.4 regla 1; D1                                                             |
| `muros.cotas`         | `nMuros` en `ud_muros` y `ud_muros_adoquin`                                                                                                   | esos esqueletos                                                                                      | p10-p90 en [10; 20]                                                                                                                    | 4 o 5 (mapa 07 §1.3 contra `classicSegments`)                                                                                   | real un día 4 / 11 / 34 cotas (`datos.md` §1.4)                                      |
| `adoquin.sectores`    | `nSectores`, `pavesKm`, último sector a meta                                                                                                  | `ud_adoquin`                                                                                         | [15; 30]; [40; 60] km; último a [1; 8] km                                                                                              | 3 sectores, ~40 km (mapa 07 §1.4)                                                                                               | Roubaix 31 / 54,8 km; real 5, 6, 8, 9, 15, 31 sectores                               |
| `llana.dplus`         | p90 de `dPlus`                                                                                                                                | `kind === 'llana'` generadas                                                                         | ≤ 1.500                                                                                                                                | [661; 1.413] (mapa 01 §1)                                                                                                       | V9 (≤ 1.800 duro)                                                                    |
| `km.clase`            | p90 de km en .2; ninguna > `ARCH.km.maxPorClase`                                                                                              | por `raceClass`                                                                                      | ≤ 170; 0                                                                                                                               | [145; 195] en cualquier clase (mapa 07 §4.1)                                                                                    | decisión 36; D9                                                                      |
| `dplus.delta`         | p90 de                                                                                                                                        | `dPlus − dPlusBloques`                                                                               | / `dPlusBloques`                                                                                                                       | reinas generadas                                                                                                                | < 0,05                                                                               | n/a | decisión 9 |
| `nacionales`          | esqueletos distintos entre los 133 `nc-*-road`; BE/NL con adoquín; CO/EC con cota ≥ 5 km; DK/AE con `expuesto`                                | `nc_ruta`                                                                                            | ≥ 5; ≥ 60 %; 100 %; 100 %                                                                                                              | todos por `classic(220)` (mapa 06 §1: 532 por `oneDaySpec`)                                                                     | decisión 15; `motor.md` §V.3                                                         |
| `tactica.kmSubida`    | `kmSubidaShare` y `breakAppealEstimado` por esqueleto                                                                                         | por `skeleton`                                                                                       | informativa; `ud_circuito` ≤ 0,20 y `ud_muros` ≤ 0,15 en `kmSubidaShare`                                                               | n/a                                                                                                                             | decisión 25; `juicios/motor.md` §5 riesgo 4                                          |
| `identidad`           | mismo esqueleto, firma igual, km ± 6 %, ≥ 1 diferencia no firma en 4 de 5 temporadas; correlación entre ediciones consecutivas en [0,55; 0,9] | generadas, temporadas 1 a 5 contra 0                                                                 | sí (el test vive en `edition.test.ts`, sección 10; el censo solo imprime)                                                              | null                                                                                                                            | decisiones 20 y 22                                                                   |

Variedad (todas sobre lo generado; mapa 04 §5.2, arquitectura §11.3, `banco.md` §11.3):

| id                          | Métrica                                                                                                                  | Banda                                  | Hoy (medido)                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variedad.correlacion`      | Pearson de `huella` entre pares del mismo esqueleto y km ± 10 % (200 pares deterministas por esqueleto, `routeRng('censo | ' + id)`); circuitos excluidos del par | mediana < 0,8; máximo < `ARCH.anticlon.maxCorrelacion` (0,85 provisional, calibrado en el paso 9 sobre Ronde/E3, Amstel/Brabant, Lombardía/Lieja) | > 0,8 esperado en `hilly` porque el esqueleto es único (geografia §11.3); se mide en el paso 0 por molde |
| `variedad.primerPuerto`     | km del primer `puerto` / km total, en reinas                                                                             | p10 < 0,25 y p90 > 0,55                | `split` lo pone siempre en el mismo sitio (mapa 01 §4)                                                                                            |
| `variedad.dplusCubetaAlta`  | σ de `dPlus` en [2.600; 4.600]                                                                                           | > 500 m                                | la uniforme en logaritmo de la v64 lo da (mapa 04 §5.2)                                                                                           |
| `variedad.secuencias`       | frecuencia de cada secuencia de papeles en vueltas de 5                                                                  | ninguna > 25 %                         | 7 % (`datos.md` §11.4)                                                                                                                            |
| `variedad.finalesPorVuelta` | entropía de `finalKind` en vueltas con ≥ 3 reinas                                                                        | ninguna con todas `alto`               | `race-france` lo era (mapa 04 §5.2)                                                                                                               |
| `variedad.kmUnDia`          | σ de km de un día por clase en .1 y .2                                                                                   | > 15 km                                | 0 (el 210 fijo, decisión 36)                                                                                                                      |

### 13.4 `calendarQueens` estratificada, `reina-175-4800` y `forma.reinaCanonica.*`

Hoy `calendarQueenSample()` ordena las 157 reinas por `desnivelDe` y toma una de cada `PASO = 6` (`calendarQueens.ts` l. 51, 85-87): 27 etapas, de las que 11 son reales, 5 de edición generada, 2 de un día y 9 de `stageMix` (mapa 06 §3.1). El test corre 4 semillas con reloj 3.600 s (`calendarQueens.test.ts` l. 55-57) y afirma cinco cosas (l. 60-68): las cubetas `<1500` y `2500-3500` pobladas, `facil > dura + 10`, min < 1.500 y max > 2.500, y `wonFromMovePct ∈ [6; 30]`. Tres problemas medidos: la banda `<1500` la sostiene hoy un test y no el diseño (mapa 06 §6.3), la muestra cambia de composición con cualquier generador (qué 27 etapas: `juicios/motor.md` §5 riesgo 5), y la banda global se traga la pendiente por cubeta que el propio test ya afirma (mapa 04 §4.3 punto 2). Se decide (decisión 32):

1. **Muestra estratificada por `finalKind` × `BANDAS_DESNIVEL`** (4 × 4 = 16 estratos, `calendarQueens.ts` l. 90-95), con cuota proporcional y mínimo 1 por estrato no vacío, y `MUESTRA_OBJETIVO = 30`. Dentro de cada estrato se ordena por `dPlus` y se toman SIEMPRE el índice 0 y el último (así la aserción de extremos l. 30-31 sigue valiendo: el mínimo y el máximo globales son el primero y el último de su estrato) y el resto por rejilla `i % paso === 0` con `paso = ceil(n_estrato / cuota)`. Sin dado: la composición sale de un criterio escrito, como hoy (l. 22-27).
2. **`CalendarQueen` gana `skeleton: SkeletonId | null` y `routeSource`**, para que el informe diga por forma y por origen sobre qué habla el número.
3. **`CalendarQueenStats` gana `porFinalKind`** (misma forma que `porBanda`) y `porEstrato` (16 filas); ambos se imprimen y no tienen banda hasta tener σ (informativos en el paso 9).
4. **Las aserciones**: se conservan las cinco de hoy. `facil.races > 0` la sostiene `et_reina_blanda` con `ARCH.reina.blandaShare` {media 0,25; montana 0,25; alta 0,10} (decisión 8), no un 40 % dirigido; si aun así el estrato `<1500` queda con menos de 3 etapas en la muestra, el test FALLA con el mensaje «cubeta < 1.500 despoblada: decisión D6» y no se cambia solo a comparar `<2000` contra `>3000`: esa alternativa es del dueño (sección 18, D6; valor por defecto: mantener `<1500` contra `2500-3500` y [6; 30] como vigilancia hasta la remedición del paso 9). `facil > dura + 10` se espera que siga: es física del motor (43,8 % contra 1,6 % medido, l. 35-38), no forma.
5. **Reloj**: con la aritmética hecha como en l. 40-52: 126 s libre y 370 cargada por 27 etapas × 4 semillas; con 30 etapas, 140 y 411; con el factor 2,26 del nocturno, 929 s; ×4 (regla de la casa, `invariants.test.ts` l. 297-298) = 3.716. Reloj nuevo: `{ timeout: 4_000_000 }`, y el comentario se reescribe con estas cifras.
6. **`reina-175-4800`**: escenario canónico nuevo en `sim/scenarios.ts`, perfil literal de la plantilla 3 del mapa 07 §5 (175 km, 4.800 m: puerto de 12 km al 7 % en el km 45, 17 km al 7,3 % en el 95, 10 km al 7,8 % en el 130, final de 15,8 km al 7,9 % del 159 al 175, meta `cima`), mismo campo que `reina-150` (`scenarios.ts` l. 332-336 para el perfil; 4 líderes MON 84-87, 6 baroudeurs, 3 sprinters, 163 relleno). Se imprime en `pnpm sim` (`cli.ts`, junto a `reina-150-s3`, l. 150-157) con `breakawayWinPct`, `top10GapSeconds` y la cola del último, SIN banda: es el control de forma con el tamaño de una reina de verdad, y la banda se le pondrá cuando la cifra tenga dueño.
7. **`forma.reinaCanonica.*`**: rótulo del informe para `TARGETS.mountain.*` (§13.1); la clave no cambia.

`queenGeometry()` (`calendarQueens.ts` l. 184-200) gana test por primera vez (mapa 06 §6.2): la fila `finales.reparto` de `ROUTE_CENSUS_TARGETS` es la misma cuenta sobre las 157, no sobre la muestra, por la razón escrita en l. 160-163 (error típico 0,096 con n = 27, mayor que la tolerancia ± 0,08).

### 13.5 `frozenSkeletons` y `GENERATED_QUEENS`

`REAL_QUEENS` es una lista cerrada a propósito (`realQueens.ts` l. 41-45) y tres de sus nueve entradas las dibuja el generador: `race-colombia` e5 (232 km, hoy `valle_corto` con 18 km tras la cota, medido), `race-guatemala` e9 (200 km) y `race-tachira` e6 (166 km, `valle_largo`, 21 km) (mapa 06 §3.2). Su `why` describe perfiles que ya no corren («el último puerto a 62 km de meta y 47 km rodadores», l. 50). Las dos salidas fáciles están descartadas con razón (`juicios/motor.md` §5 riesgo 8): congelar `Segment[]` convierte el banco en museo del generador viejo; cerrar «por brief» y resortear pierde la comparabilidad hacia atrás. Se decide (decisión 33): las tres se congelan como `Skeleton` literal en `sim/frozenSkeletons.ts` y se renderizan con `renderSkeleton` (sección 8), con `why` reescrito para describir el esqueleto.

```ts
// packages/engine/src/sim/frozenSkeletons.ts
export interface FrozenQueen {
  raceId: string
  stageIndex: number // la entrada de REAL_QUEENS a la que sustituye
  skeleton: Skeleton // literal: `id` de los 32, `canonico` propio, sin `alternativas`
  motivos: Motif[] // la instancia fija (posiciones incluidas: colocación ya hecha)
  km: number // 232, 200, 166
  geo: GeoZone // `andes` las tres
  seedDibujo: string // `frozen|race-colombia|5`: solo alimenta `dib`
  huellaFNV: number // del perfil rendido; se re-sella con causa si `renderSkeleton` cambia
  why: string
}
export const FROZEN_QUEENS: readonly FrozenQueen[] // exactamente 3
export function frozenProfile(q: FrozenQueen): StageProfile
```

Reglas: (1) `motivos` se escriben en el paso 9 leyendo el perfil de HOY con `describeProfile` (sección 8): cada segmento `puerto` con `climbSize ≥ 1,5` pasa a un `Motif` `puerto` o `cota` con su km, su g medio y su posición, y el resto a `enlace`; así la forma que el banco comparaba se conserva, dibujada por el código nuevo. (2) `realQueens.ts::findStage(raceId, stageIndex)` devuelve `frozenProfile` cuando la pareja está en `FROZEN_QUEENS` y, si no, la etapa del calendario; `REAL_QUEENS` sigue con 9 entradas y `realQueens.lastGroupPct` [7; 14] y `worstStagePct` ≤ 18 se remiden con 6 semillas en el paso 9. (3) `sim/frozenSkeletons.test.ts`: para cada una, `stageKindOf(frozenProfile(q)).kind === 'reina'`, `finalKindOf === skeleton.finalKind`, `|dPlusDe − skeleton.dPlus objetivo| ≤ 10 %`, `Σ km` al 0,1, `verify(...) === null`, y `fnv(profile) === huellaFNV`. (4) La huella se re-sella solo con causa escrita en el test (un cambio de `renderSkeleton`), nunca para tapar.

`GENERATED_QUEENS` (aparte, también 3): las reinas del calendario nuevo elegidas por forma, una `alto`, una `cima_cerca`, una `valle_largo`, entre las generadas (`routeSource !== 'real'`) de `vu_semana` y `vu_corta`; criterio determinista: en cada `finalKind`, la de `dPlus` más cercano al p50 de su cubeta, y a igualdad el `raceId` menor. Se cierran por nombre en el paso 9 con `skeleton` y `finalKind` anotados, se corren con 6 semillas y se IMPRIMEN sin banda (cola del último por `finalKind`, previsión `alto > cima_cerca > valle_corto > valle_largo` de la tabla v19, `targets.ts` l. 615-628). Un test barato afirma que cada entrada sigue teniendo el `finalKind` y el `skeleton` anotados: si un cambio los mueve, la entrada se vuelve a elegir con causa.

### 13.6 El protocolo «mejor y no solo distinto»

Dos ejes que chocan y no se confunden (mapa 04 §5): realismo (¿se parece el calendario a lo que se corre?) y variedad (¿dos etapas del mismo tipo se distinguen?). Un generador «distinto» mueve bandas; uno «mejor» las mueve en la dirección que la carretera dice, sin tocar lo que no puede tocar. El protocolo se anota en `docs/balance.md` ANTES de correr nada (decisión 30), en este orden:

1. **Línea base (paso 0)**: `routeCensus` sobre el calendario de `ENGINE_VERSION` 69, tabla de §13.3 con la columna «hoy» en «v61 §0», y la lista de bandas rojas hoy. Previsión escrita: `esqueletos.clase`, `unDia.ultimaCota`, `finales.muro`, `muros.cotas`, `adoquin.sectores`, `km.clase`, `reina.subidaLejana` (en parte), `variedad.correlacion`, `variedad.primerPuerto` y `variedad.kmUnDia`. Para las bandas de simulación, la línea base es la cifra del último CI en verde con sus semillas de hoy (4 / 6 / 8 / 3 / 12) y la de `balance.md`; la medida con 12 semillas del generador viejo se hace en el paso 9, en la misma sesión y la misma máquina que la del nuevo (todo ×2, decisión 34).
2. **Pre-registro**: `sim/preRegistro.ts` exporta `PRE_REGISTRO: readonly { banda: string; direccion: 'sube' | 'baja' | 'igual' | 'igual_ruido'; porQue: string }[]`, un test comprueba que toda banda de `TARGETS` que lee perfiles generados (mapa 04 §2, las 17) tiene entrada, y `pnpm sim:pareado` imprime la columna «previsto». La tabla, decidida:

| Banda                                                                        | Dirección                                                                                      | Por qué                                                                                                                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calendarQueens.breakawayWinPct` global                                      | baja                                                                                           | p50 de desnivel sube con V8a mientras `<1500` se queda en ~10 % por `et_reina_blanda`; la banda [6; 30] se conserva como vigilancia (D6)                                    |
| `calendarQueens` por cubeta                                                  | igual (monótona decreciente)                                                                   | 43,8 / 13,7 / 1,6 / 0 hoy (epics l. 226-233): es física del motor                                                                                                           |
| `realQueens.lastGroupPct`, `worstStagePct`                                   | igual_ruido                                                                                    | las tres generadas están congeladas por forma (§13.5); solo cambia el dibujo                                                                                                |
| `grandTour.*`, `abandonCauses.*`                                             | igual                                                                                          | 20 de 21 reales; si se mueven, acoplamiento (regla 3)                                                                                                                       |
| `erosion.longClassicFresh`, `.hardestClassicFresh`, `.queenThirdWeek`        | igual                                                                                          | reales                                                                                                                                                                      |
| `smallTours.mediaGroups`                                                     | sube                                                                                           | cotas más cerca de meta (`et_media_*`: última cota a 0-59 km real contra 26-68 hoy, `datos.md` §1.4)                                                                        |
| `smallTours.mediaOneGroupPct`                                                | baja                                                                                           | misma razón; hoy el campo entero llega junto en el 23 % (mapa 04 §4.2)                                                                                                      |
| `smallTours.flatWinnerGroupPct`                                              | igual                                                                                          | `et_llana` sigue entera con V9                                                                                                                                              |
| `smallTours.photoRepeatTopFive`, `worstRacePhotoRepeat`, `sameWinnerPairPct` | baja o igual                                                                                   | menos llanas seguidas por `ARCH.pesosComposicion` y `ARCH.bloques`; la parte de composición (pares de agrupadas) se imprime aparte de la de motor (`targets.ts` l. 574-577) |
| `smallTours.bestSprinterWinPct`, `sweepPct`, `flatMoveWorstMarginS`          | igual                                                                                          | dependen del campo y del motor, no de la forma de la llana                                                                                                                  |
| saturación de las 8 más duras                                                | igual (0 de 8)                                                                                 | V5 impide el final de 9-15 km; el conjunto cambia (nacionales por circuito) y se lista                                                                                      |
| `timeTrials.tailPct`                                                         | sube ≤ 0,5 puntos                                                                              | `et_crono` con `cota` ≤ 3 km; `worstStagePct` igual                                                                                                                         |
| `stageHistory` `cambian`                                                     | baja a solo reales                                                                             | decisión 23                                                                                                                                                                 |
| Jaén, Tramuntana                                                             | igual (0)                                                                                      | listón de cero                                                                                                                                                              |
| `world` (reparto de `kind`)                                                  | se anota, sin previsión numérica                                                               | ninguna banda de población se toca en E1                                                                                                                                    |
| `medianLeadGroupRiders` (sin banda)                                          | se imprime por `finalKind`                                                                     | deuda de `targets.ts` l. 597-618                                                                                                                                            |
| quién gana por esqueleto (nueva, informativa)                                | `ud_muros` clasicómano, `ud_adoquin` rodador, `et_media_muro` puncheur, `et_reina_*` escalador | arquitectura §11.4; es el «mejor» por el lado del juego                                                                                                                     |

3. **Pareado**: mismo `worldSeed`, mismo campo (`buildField(worldSeed, level)`, `realQueens.ts` l. 109-113), misma semilla de etapa con `engineVersion: 1` fijo (`realQueens.ts` l. 179-182), generador viejo contra nuevo, 12 semillas. La medida es la diferencia por semilla: mediana de las diferencias pareadas y signo, como hizo la v49 con la brecha 1.º-10.º (`targets.ts` l. 108-131). El generador viejo vive SOLO durante el paso 9 en `sim/legacy/profileGenLegacy.ts` (los ocho `xxxSegments`, `normalize`, `garantizaPuerto`) y `sim/legacy/calendarLegacy.ts` (`oneDaySpec`, `stageMix`, `mixRoles` y el cableado de `buildRace` de hoy, produciendo `CalendarRace[]`), y los dos ficheros se borran en el mismo cambio que cierra «v61 §9» (decisión 29). Para que el pareado sea posible, cada función de banco gana un último parámetro `calendar: CalendarRace[] = SEASON_CALENDAR` (`analyzeCalendarQueens(runs, calendar?)`, `findStage(raceId, i, calendar?)`, las de `smallTours.ts`, `timeTrials.ts`, y la selección de las 8 más duras, hoy inline en `invariants.test.ts` l. 486-499, extraída a `sim/saturation.ts::hardestOneDay(calendar, n = 8)`); los tests no cambian porque el valor por defecto es el de hoy. `sim/pareado.ts` (script `pnpm sim:pareado [semillas=12]` en `package.json`, junto a l. 14-16) corre cada banco dos veces y escribe la tabla `banda | viejo | nuevo | Δ mediana | previsto | cumple`.
4. **Cuatro condiciones, todas necesarias**: (a) toda banda de realismo roja en la línea base pasa a verde y ninguna verde pasa a roja; (b) todas las de variedad en verde; (c) las canónicas de §13.1 (`llana-180`, `reina-150`, `cri-40`, `chronicle`, las cuatro huellas) no se mueven ni un dígito; (d) las de simulación se mueven en la dirección pre-registrada, o se explica con medida por qué la previsión era mala, y no se ajusta la banda para que cuadre. Si (a) a (d) se cumplen, el generador es mejor. Si solo se cumple (b), es distinto. Si falla (c), ha tocado el motor y no se mezcla en la misma tanda.
5. **Doble lectura de las listas cerradas** (mapa 04 §5.3 regla 2): por nombre (¿qué le pasó a `race-colombia` e5?) y por forma (¿qué les pasa a las reinas `alto` de [3.500; 4.500] m?). Una lista cerrada conserva el nombre y no la forma (mapa 04 §3.3); leerla solo por nombre confunde un cambio de forma con uno de motor.

La tabla pareada es la CONDICIÓN para borrar el generador viejo (decisión 29): sin tabla en «v61 §9», `sim/legacy/` no se borra y el paso 9 no está cerrado.

### 13.7 La remedición: dueño, orden, horas y techo

Dos dueños (decisión 34): el dueño operativo, que corre las horas, es el implementador del paso 9; el dueño de cada banda es el dueño del repositorio, que decide con la cifra delante y no antes. Orden por coste creciente, todo ×2 (viejo y nuevo), con los relojes de los tests y el coste real medido o escalado del que tienen:

| Orden | Banco                                                   | Semillas          | Coste real (por generador)                                | Reloj del test                      | Paso  |
| ----- | ------------------------------------------------------- | ----------------- | --------------------------------------------------------- | ----------------------------------- | ----- |
| 1     | `routeCensus` (§13.3)                                   | n/a               | 0,57 s (`juicios/motor.md` §1)                            | `test:rapido`                       | 0 y 8 |
| 2     | `stageKind.test.ts` por esqueleto                       | 60 × 5 km × zonas | minutos (9.600 perfiles por zona, sin simular)            | 30 s por `it`                       | 8     |
| 3     | `realQueens` sobre `FROZEN_QUEENS` y `GENERATED_QUEENS` | 6                 | ~4 min                                                    | 900 s (`invariants.test.ts` l. 697) | 9     |
| 4     | `timeTrials`                                            | 6                 | ~3 min                                                    | 300 s (l. 234-261)                  | 9     |
| 5     | `calendarQueens` estratificada                          | 12                | 6 a 19 min (140 s libre y 411 cargada con 4 semillas, ×3) | 4.000 s con 4 (§13.4)               | 9     |
| 6     | saturación de las 8 más duras                           | 12                | ~30 min (1.800 s de reloj con 3, l. 511)                  | 1.800 s con 3                       | 9     |
| 7     | `smallTours`                                            | 12                | ~25 min (3.900 s de reloj con 8, l. 891)                  | 3.900 s con 8                       | 9     |
| 8     | Jaén (40 semillas) y Tramuntana (12)                    | 40 / 12           | ~5 min                                                    | 300 s                               | 9     |

Suma por generador ≈ 85 min; ×2 ≈ 3 h. Presupuesto: 4 h de máquina y 2 sesiones humanas (una para correr y anotar, otra para leer con el dueño); techo 8 h. Si se supera el techo se corta por el orden de la tabla, de abajo arriba (`smallTours` y saturación son lo primero que se sacrifica), y lo no remedido con 12 semillas queda anotado en «v61 §9» como «remedido con las semillas de CI (8 / 3), no con 12», con la banda tal cual.

Regla «previsión fallida»: un resultado que contradice la dirección pre-registrada se anota en `docs/balance.md` «v61 §9» con este formato: banda, previsto, medido (viejo, nuevo, Δ mediana pareada, n semillas), causa que se ve en los datos (por forma y por nombre), y la frase «previsión fallida». La banda NO se mueve: sigue con su valor y su rótulo hasta que el dueño decida con la cifra delante (sección 18), y si eso deja un test rojo, el test se marca `it.skip` con la referencia a la entrada de la nota, nunca se ensancha la banda. Las bandas que nacen en esta remedición (`porFinalKind`, `porEstrato`, `GENERATED_QUEENS`, quién gana por esqueleto, `medianLeadGroupRiders` por final) se quedan `informativa` hasta tener σ conocida: en `calendarQueens` con 108 carreras σ ≈ 3,7 puntos (`targets.ts` l. 718-719), así que un estrato de 2 etapas × 12 semillas = 24 carreras no puede sellar nada, y eso se escribe en el informe junto al número.

### 13.8 Tests de la sección

Tests primero, como todo el plan (sección 15). Los que corren en cada push son los de `routes/grammar/calendario.test.ts`; los de `sim/` corren con `test:bancos` y en el nocturno.

```ts
// packages/engine/src/routes/grammar/calendario.test.ts (test:rapido)
import {
  routeCensus,
  aggregate,
  ROUTE_CENSUS_TARGETS,
  CENSUS_N_MIN,
} from '../../sim/routeCensus.js'
import { calendarForSeason, BASE_SEASON } from './edition.js'

const rows = routeCensus(calendarForSeason(BASE_SEASON))

describe('el censo del calendario que el juego corre', () => {
  for (const t of ROUTE_CENSUS_TARGETS) {
    const pob = rows.filter(t.poblacion)
    const nombre = `${t.id}: ${t.label} (hoy ${t.hoy ?? 'sin población'})`
    if (t.estado === 'informativa') {
      it.skip(nombre, () => {})
      continue
    } // se imprime en pnpm sim, no afirma
    it(nombre, () => {
      if (pob.length < Math.max(t.nMin, CENSUS_N_MIN)) return // «n insuficiente»: se imprime, no falla
      const v = t.medida(pob)
      if (t.min !== undefined) expect(v).toBeGreaterThanOrEqual(t.min)
      if (t.max !== undefined) expect(v).toBeLessThanOrEqual(t.max)
    })
  }
  it('ninguna etapa generada llega degradada y el p95 de intentos es ≤ 3', () => {
    const gen = rows.filter((r) => r.routeSource !== 'real')
    expect(gen.filter((r) => r.degradado).length).toBe(0)
    expect(aggregate(gen, () => 'todo').todo!.num.intentos!.p90).toBeLessThanOrEqual(3)
  })
  it('el desnivel por tramos y por bloques cuentan lo mismo dentro del 5 % en las reinas', () => {
    const reinas = rows.filter((r) => r.kind === 'reina' && r.routeSource !== 'real')
    const deltas = reinas
      .map((r) => Math.abs(r.dPlus - r.dPlusBloques) / r.dPlusBloques)
      .sort((a, b) => a - b)
    expect(deltas[Math.floor(deltas.length * 0.9)]).toBeLessThan(0.05)
  })
})
```

```ts
// packages/engine/src/sim/routeCensus.test.ts (test:bancos)
it('finishType se mide como lo lee el motor: un muro_meta de 1,0 km al 12 % con 2 km de aproximación a amplitud 2,5 tipa muro', () => {
  const profile = renderSkeleton(/* ud_muro_final canónico, sección 8 */)
  const [r] = routeCensus([raceDePrueba(profile)])
  expect(r.finishType).toBe('muro')
  expect(r.lastClimbKm).toBeCloseTo(1.0, 1)
})
it('climbKmOutsideLast30 separa reina-150 de una reina de verdad', () => {
  expect(routeCensus([raceDePrueba(queenScenario().input.profile)])[0].climbKmOutsideLast30).toBe(0)
  expect(
    routeCensus([raceDePrueba(frozenProfile(FROZEN_QUEENS[0]))])[0].climbKmOutsideLast30,
  ).toBeGreaterThan(0)
})
it('el censo es determinista y cabe en un push', () => {
  const t0 = performance.now()
  const a = routeCensus()
  const b = routeCensus()
  expect(a).toEqual(b)
  expect(performance.now() - t0).toBeLessThan(10_000) // 2 × 0,57 s medidos; techo holgado para CI cargado
})
```

```ts
// packages/engine/src/sim/calendarQueens.test.ts (añadido a las cinco aserciones de hoy)
it('la muestra estratificada cubre los 16 estratos poblados y conserva los extremos', () => {
  const todas = allCalendarQueens()
  const muestra = calendarQueenSample(todas)
  expect(muestra.length).toBeGreaterThanOrEqual(25)
  expect(muestra.length).toBeLessThanOrEqual(34)
  expect(muestra[0]!.dPlus).toBeLessThanOrEqual(todas[5]!.dPlus)
  expect(muestra.at(-1)!.dPlus).toBeGreaterThanOrEqual(todas.at(-6)!.dPlus)
  for (const e of estratos(todas))
    if (e.n > 0) expect(muestra.some((q) => e.contiene(q))).toBe(true)
})
it('la cubeta < 1.500 la sostiene el diseño, no el test', () => {
  const facil = calendarQueenSample().filter((q) => q.dPlus < 1500)
  expect(facil.length, 'cubeta < 1.500 despoblada: decisión D6, sección 18').toBeGreaterThanOrEqual(
    3,
  )
  expect(facil.some((q) => q.skeleton === 'et_reina_blanda')).toBe(true)
})
```

```ts
// packages/engine/src/sim/preRegistro.test.ts
it('toda banda que lee perfiles generados tiene dirección pre-registrada', () => {
  for (const banda of BANDAS_SOBRE_GENERADO)
    // las 17 del mapa 04 §2, escritas como lista
    expect(
      PRE_REGISTRO.find((p) => p.banda === banda),
      banda,
    ).toBeDefined()
})
it('GENERATED_QUEENS siguen teniendo la forma con la que se eligieron', () => {
  for (const q of GENERATED_QUEENS) {
    const { stage } = findStage(q.raceId, q.stageIndex)
    expect(finalKindOf(stage.profile)).toBe(q.finalKind)
    expect(stage.arch?.skeleton).toBe(q.skeleton)
  }
})
```
