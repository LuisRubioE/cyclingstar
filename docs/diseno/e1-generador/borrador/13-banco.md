## 13. El banco: invariantes, censo, calendarQueens, «mejor y no solo distinto», remedición

El banco de este repositorio tiene escrita su propia lección y esta sección la aplica al generador: «lo que no se mide sobre carreras reales, no se mide» (`sim/targets.ts` l. 182 y 491, vía mapa 04 §3.3). Seis veces (v15, v17, v19, v23, v40, v44) un banco canónico en verde certificó algo que producción no hacía, y en cuatro de las seis el defecto era del PERFIL sobre el que se medía y no del motor (mapa 04 §3.3). La v60 §1b repitió el patrón por omisión: `mountainSegments` cambió el reparto de finales de las 157 reinas (`alto` 56,7 % → 38,2 %) y `realQueens`, `grandTour` y `smallTours` siguieron en verde sin una remedición anotada (mapa 04 §3.4). Un generador que cambia de forma cambia 1.241 de las 1.418 etapas (todo lo que no es `real`, mapa 06 §1), así que esta sección fija cuatro cosas: qué no puede moverse, qué se mueve a propósito y cómo se re-sella, cómo se mide en segundos lo que hoy nadie sabe sin correr `balance.md` v60 §12 a mano, y qué hace falta para decir «mejor» y no solo «distinto».

Dos avisos de lectura que valen para toda la sección. El primero: las rutas y líneas se citan contra HEAD `2900895` (24-09-2026); el esqueleto y los mapas leyeron `8585ca2` (14-09-2026), y entre los dos árboles el motor pasó de `ENGINE_VERSION` 69 a 86 (`constants.ts` l. 809; `index.test.ts` l. 459), `sim/invariants.test.ts` se partió en seis ficheros (commits `d5ebc04` y `4d53bd7`, 21-09-2026; `balance.md` «v83 (3)», l. 16017) y la reina canónica del banco dejó de ser `reina-150` (commit `18f6ad7`, 16-09-2026; `balance.md` v73, l. 13987). El paso 0 del plan vuelve a anclar cada cita contra el HEAD de partida antes de escribir nada (§13.6, punto 1). El segundo: la nota de `docs/balance.md` que el esqueleto llama «v61 · El generador es una gramática» se escribe como «vN · El generador es una gramática», con N igual al `ENGINE_VERSION` que sube en el paso 8, porque la v61 ya existe (`balance.md` l. 11171) y la última nota es la v86 (l. 16332): hoy N sería 87. Sus subsecciones son las que fija la sección 15: §0 (línea base, paso 0), §1 (el cambio, paso 8), §2 (remedición, paso 9) y §3 (base y pantalla, paso 10). En lo que sigue se escribe «vN §0», «vN §2» y «la nota».

### 13.1 Lo que no se mueve y no debe moverse

Son la red que dice que el rediseño no ha tocado el motor. Ninguno de estos tests lee `profileGen.ts` ni `calendar.ts` en su parte generada, y por eso su verde no dice nada del generador y su rojo lo dice todo (mapa 04 §4.1 y §5.3 regla 3; mapa 06 §5).

Primero, el re-anclaje contra HEAD de lo que el esqueleto y los mapas llaman «canónico», porque el repositorio lo movió después de leerse:

| Escenario | Hoy (HEAD `2900895`) | Qué era en `8585ca2` | Huella sellada |
| --- | --- | --- | --- |
| `llana-180` | `flatScenario()`, `sim/scenarios.ts` l. 166-236, 180 km de `llano` | igual | `stage/attribution.test.ts` l. 505-514 (`llana-180-0`, `llana-180-1`) |
| `reina-canonica` | `queenScenario()`, l. 303-373: `REINA_CANONICA_PROFILE` (l. 380-436), 158 km, 2.933 m, dos puertos (13 km al 7 % medio con cima en el km 63; 12 km al 7,5 % con remate al 9 % en meta) y final en alto; «paso 21, decisión 5 del dueño» (l. 331-333) | `reina-150`: 135 km de `llano` y un puerto de 15 km al 8 %, 1.200 m | `attribution.test.ts` l. 505-514 (`reina-canonica-0`, `reina-canonica-1`) |
| `media-150` | `mediaScenario()`, l. 440-466: «LA QUE ERA `reina-150`, con su nombre de verdad» (l. 440-447); mismo campo que la reina canónica; hoy no la corre ningún banco ni `pnpm sim` (ninguna importación fuera de `scenarios.ts`) | era `reina-150` | ninguna: «su huella sellada se retira en vez de re-sellarse» (l. 446-447) |
| `cri-40` | `timeTrialScenario()`, l. 583-597 | igual | `stage/timetrial.test.ts` l. 83-88 (`cri-40-0`, `cri-40-1`) |
| `reina-canonica-s3` | `queenThirdWeekScenario()`, l. 472-480, informativa en `cli.ts` l. 147-157 | `reina-150-s3` | ninguna |
| radio | `sim/raceRadio.test.ts` l. 749-764: `queenScenario()` con la etiqueta `raceId: 'reina-150'` en la semilla (l. 752, un texto, no el escenario) y la aserción «la etapa sale idéntica con radio y sin radio» | igual | igualdad con y sin radio, no un literal |

El paso 0 lee esa tabla del código y la copia en «vN §0»; las «cuatro huellas» de los mapas son hoy las cuatro de `attribution.test.ts` (dos de `llana-180`, dos de `reina-canonica`) más las dos de `timetrial.test.ts`, y el test de la radio compara dos corridas del mismo proceso.

| Qué | Dónde | Por qué no ve el generador |
| --- | --- | --- |
| Las 15 bandas canónicas: `flat.*` (3), `phases.*` (3), `mountain.*` (2), `timeTrial.*` (2), `erosion.flatFresh` y `.queenFresh`, `chronicle.*` (3) | llano y fases en `sim/invariantsLlano.test.ts` l. 43-97 (300 semillas) y l. 98-131 (120); montaña en `sim/invariants.test.ts` l. 47-95 (`queenScenario()`, 120 semillas, l. 48-49) y crono en l. 97-116; erosión en `sim/invariantsDesgaste.test.ts` l. 152-157 (`flatFresh` y `queenFresh`, 60 semillas, 900 s cada uno); voz en `sim/invariantsClasicas.test.ts` l. 188-240 | corren `llana-180`, `reina-canonica` y `cri-40`, perfiles LITERALES de `sim/scenarios.ts` (tabla de arriba; mapa 04 §1.1) |
| Las seis huellas selladas dígito a dígito y la igualdad de la radio | `stage/attribution.test.ts` l. 505-527, `stage/timetrial.test.ts` l. 83-104, `sim/raceRadio.test.ts` l. 749-764 | los mismos escenarios literales (mapa 06 §3.3) |
| Los invariantes SPEC 6.17 sintéticos: llano, fases, montaña, crono, desgaste, voz, pavés, cierre, inercia | los de arriba más `sim/invariants.test.ts` l. 171-233 (pavés), l. 234-253 (cierre) y l. 254-263 (inercia) | perfiles literales o un bloque de 60 km con 30 de `paves` |
| `grandTour.*` y `abandonCauses.*` (12 vueltas de `race-france`) | `sim/invariantsAbandonos.test.ts` l. 27-195 (reloj 5.400 s en l. 75; cola de reina 900 s en l. 115; causas l. 128-190) | 20 de 21 etapas con rasgos reales; solo la e21 llana es generada y cambia de detalle, no de forma (mapa 06 §1 y §3.2) |
| Los perfiles reales | `routes/featureProfile.test.ts`, `routes/classicRoutes.test.ts`, `erosion.longClassicFresh` (Flandes), `.hardestClassicFresh` (Lombardía, `invariantsClasicas.test.ts` l. 134-141), `.queenThirdWeek` (Francia e18), las de un día WT de la saturación (`invariantsClasicas.test.ts` l. 101-103), Giro e9 (`invariantsAbandonos.test.ts` l. 245) | `featureProfile.ts` no se toca en E1 (decisión 27, sección 11) y la huella FNV de las 177 + 3 lo sella (decisión 28) |
| `routes/finalKind.test.ts` | cortes 0,5 / 5 / 20 km (l. 92-100) | es la vara con la que se miden las reinas; `ARCH.meta.*` se diseña con holgura 0,7 sobre esos cortes (sección 4) precisamente para no tocarla |
| `db/recorridoDelMundo.test.ts` | l. 55-63 | auto-consistente: compara el congelado con el calendario del mismo proceso; es la garantía de que el generador nuevo solo alcanza carreras futuras (mapa 06 §3.5) |
| `routes/altimetry.test.ts`, `schedule.test.ts`, `uci.test.ts`, `routes/raceRoutes.test.ts`, `db/abandon`, `gcOrder`, `stageRun`, `teamPlan`, `locks`, `calendarConcurrency`, `world/*.test.ts` | mapa 06 §2.5 y §3.5 | datos de tablas, `TEST_TOUR` a mano o `kind` literal; `routes/raceRoutes.test.ts` solo mira el número de etapas, que sigue viniendo de la fila (decisión 44) |

Regla operativa, que es la condición (c) del protocolo de §13.6: si alguna de estas cifras se mueve un dígito en un cambio de `routes/`, el cambio ha tocado el motor (por ejemplo `sample.ts`, `finish.ts` o `physics.ts`) y se para; no se mezcla en la misma tanda. Dos aclaraciones sobre `mountain.*`, reescritas contra HEAD: (1) `TARGETS.mountain.breakawayWinPct` es hoy [15; 40] con el rótulo «Gana la fuga (reina canónica, final en alto)» (`targets.ts` l. 107-112) y `.top10GapSeconds` [40; 300] (l. 143); las dos se miden sobre `reina-canonica` (158 km, 2.933 m) y no se mueven ni se retiran, porque la banda SPEC §6.17 es del dueño (sección 17, punto 15). La banda [25; 45] de los mapas «se declara INVÁLIDA» en el propio fichero (l. 93-105, «RE-ANCLADA EN EL PASO 21», decisión 23 del dueño aceptada el 10-09-2026): se midió sobre la caricatura, y una banda medida sobre una caricatura describe la caricatura. Es la misma lección que este documento convierte en V8 (sección 9), resuelta por el dueño una semana antes para el escenario canónico; lo que E1 añade encima es V8b para el calendario ENTERO (las 103 reinas generadas, no una), y por eso el test con nombre de la decisión 6 pasa a llamarse «`media-150` expresada como esqueleto no pasa `verify`» y gana el espejo «`reina-canonica` expresada como esqueleto SÍ pasa V8a y V8b» (su primer puerto de 13 km corona en el km 63 de 158, a 95 km de meta: 13 de 25 km de subida lejos, 0,52 ≥ 0,25; y su puerto de meta mide 12 ≥ 9). (2) No se renombra nada: el rótulo del informe ya dice «reina canónica» y la clave `mountain` se conserva para no mover `invariants.test.ts` l. 47-95; la parte de la decisión 32 que pedía `forma.reinaCanonica.*` queda sin objeto (nota para el esqueleto §C.32 y §E.1 I-7, I-34). Lo único que se toca en `targets.ts` es el comentario de l. 88, que aún cita «una mediana de 2.023» (cifra del generador de la v63, mapa 04 §3.4) y se sustituye por la cifra del paso 9.

### 13.2 Lo que se mueve a propósito y cómo se re-sella

«Re-sellar» aquí es lo que hace el repositorio: mover la cifra o la lista con la causa escrita en el propio test (como `stageHistory.test.ts` l. 178-206 o las huellas de `attribution.test.ts` l. 505-514) y con la medida antes/después en la nota «vN · El generador es una gramática» de `docs/balance.md` (N = `ENGINE_VERSION` tras el paso 8; hoy 87). Un cambio declarado, atribuido y anotado; nunca un re-sellado para tapar. La tabla completa la de arquitectura §11.2 con lo que el mapa 06 §4 exige y con los pasos de la sección 15.

| # | Test o banda | Qué le pasa | Qué se hace | Paso |
| --- | --- | --- | --- | --- |
| 1 | `index.test.ts` l. 459 (`ENGINE_VERSION` 86; `constants.ts` l. 809) | sube UNA vez | al siguiente número libre en producción (87 si nadie lo ha movido); ninguna otra subida en E1 (decisión 3) | 8 |
| 2 | `routes/stageKind.test.ts` (109 l.; 8 generadores × `KM_ROAD` (l. 28) × 60 semillas (l. 21), mapa 06 §2.1) | los ocho `xxxSegments` desaparecen | se reescribe por esqueleto y en DOS tamaños, como fija la sección 5 (§5.9): en `test:rapido`, cada uno de los 32 `SkeletonId` × 3 zonas (`TRES_ZONAS(sk)`) × 5 km de `Skeleton.km` × 20 semillas, unas 9.600 generaciones sin `sampleProfile` (< 20 s, medido en el paso 4); en `sim/stageKind.completo.test.ts` (`test:bancos` y nocturno), 60 semillas × 5 km × todas las zonas compatibles (`requiere` satisfecho), que con 8 a 12 zonas por esqueleto son de 77.000 a 115.000 generaciones y se miden en el paso 4 (fila nueva en la tabla de §14.5). En los dos: `stageKindOf(profile, timeTrial).kind === Skeleton.kind` y, si hay `finalKind`, `finalKindOf(profile) === Skeleton.finalKind`, en el 100 % (V6, V7). `ud_montana` entra por fin (hoy `mountainClassicSegments` dibuja 51 de 157 reinas sin que nadie lo selle, mapa 06 §6.1). Las reinas siguen exigiendo las dos etiquetas `Summit finish` y `Mountains` (l. 87-91). El comentario de umbrales de `stageKind.ts` l. 44-58 se reescribe con la tabla medida (hoy dice «10.800 etapas de cada generador» y reinas hasta 26,7 km, mapa 01 §9.6) | 8 |
| 3 | `routes/calendar.test.ts` l. 140-152 (km de las 60 ediciones al km entero: `expect(Math.round(km)).toBe(edition.stages[i]!.km)`, l. 149) | debe seguir verde | V10 (Σ km al 0,1, sección 9) y `normalizeEnlaces` (sección 8) lo garantizan con margen: el contrato del test es al entero y el del generador al 0,1; el test gana la aserción `routeSource === 'edicion'` en esas etapas | 8 |
| 4 | `routes/calendar.test.ts` l. 257-265 («una etapa con final en alto termina cuesta arriba de verdad», `expect(last.tipo).toBe('puerto')` l. 264) | debe seguir verde | `et_media_alto`, `et_reina_alto_corto` y `et_reina_alto_largo` terminan en `puerto` por construcción de `MetaKind` (sección 4); se generaliza a «toda etapa cuyo esqueleto tiene `meta ∈ {alto_corto, alto_largo, muro_meta}` acaba en `puerto`» sobre `calendarForSeason(0)` entero | 8 |
| 5 | `routes/calendar.test.ts` l. 92-108 (todo segmento con km > 0, banners dentro) y l. 168-266 (`stageMix`: garantías l. 176-209 y 223-246, primera etapa l. 211-221, `race-sharjah` l. 248-255) | siguen verdes | `stageMix` conserva firma (decisión 19); las garantías pasan a `tour.test.ts` sin cambiar (sección 7); el test de la primera etapa (l. 211-221) se re-sella en el paso 7 por el prólogo (decisión 42) | 7, 8 |
| 6 | `apps/api/src/stageHistory.test.ts` l. 178-206 (`cambian === 49`, l. 206) | la cifra cambia | se re-sella con objetivo escrito: «solo etapas reales cuya etiqueta declarada difiere; generadas = 0», porque `kind` y `label` de toda etapa generada salen de `stageKindOf` (V6) y `stageHistory.ts` deja de reetiquetar con su propia regla (decisión 23). La mitad que vigila (`spec.kind === stage.kind`) da cero por construcción | 8 y 10 |
| 7 | `sim/calendarQueens.test.ts` (71 l.) | cambia la muestra y el desnivel de 103 de las 157 reinas (las 54 reales no) | §13.4: muestra estratificada, 12 semillas fuera de CI antes de tocar nada, D6 con la cifra delante y ANTES del paso 9 | 9 |
| 8 | `sim/invariantsPequenas.test.ts` l. 28-128 (`smallTours`, 9 bandas, 7 de 10 carreras generadas; 8 corridas l. 40; reloj 3.900 s l. 64) | cambia composición y relieve | remedir pareado (§13.6) con dirección pre-registrada; `media.stages > 40` (l. 88) se recuenta porque cuenta etapas por `kind` y depende de `ARCH.pesosComposicion` | 9 |
| 9 | `sim/invariantsAbandonos.test.ts` l. 197-262 (`realQueens`, 6 semillas l. 199, reloj 900 s l. 208) | 3 de 9 son generadas y su `why` ya no describe el perfil (Colombia e5: «47 km rodadores» contra 18 medidos, mapa 06 §3.2) | §13.5: `frozenSkeletons`; se remiden `lastGroupPct` y `worstStagePct` con 6 semillas | 9 |
| 10 | `sim/invariantsClasicas.test.ts` l. 94-186 (saturación; las 8 más exigentes fuera del WT en `oneDayHardest`, l. 119-132, con `demandaDe` sobre `costBase`; reloj 1.800 s l. 144; 3 semillas y 12 al saltar l. 176-180) | el generador elige qué ocho entran; hoy son `race-ses-salines`, `race-mercantour`, `race-jura` y cinco `nc-*-road` | se remide con el conjunto nuevo (los 532 nacionales pasan a `nc_ruta`, decisión 15); criterio intacto: vaciado ≤ `SATURATION_DEPLETION` 0,96 (l. 56) y pájaras ≤ `SATURATION_BONK_PCT` 14 (l. 86); previsión 0 de 8, porque V5 impide la forma que saturaba (Jura «al 82 % del campo con el tanque a cero», l. 108-110) | 9 |
| 11 | `sim/invariants.test.ts` l. 118-169 (`timeTrials`, 6 semillas l. 120, relojes 300 s; 3 de 5 cronos de `REAL_TIME_TRIALS` generadas, `timeTrials.ts` l. 54-80) | `et_crono` admite `cota` ≤ 3 km al [3; 5] % (sección 5); `et_prologo` y `et_cronoescalada` entran (D3) | se remiden `tailPct` y `worstStagePct`; previsión +0,5 puntos como mucho en `tailPct` | 9 |
| 12 | `sim/coherence.test.ts` l. 130-135 (tabla `banco`: Race Jaén con 40 semillas, l. 134) y `stage/journal.test.ts` l. 105 y 113-116 (Tramuntana, 12 semillas) | otro relieve bajo un listón de cero | se re-corren; una contradicción que aflore es del motor y se arregla, el cero no se afloja | 9 |
| 13 | `sim/world.test.ts` y `RACE_DAY_TSS` (`world.ts` l. 169-193 lee `st.kind` al cargar el módulo) | el reparto de `kind` cambia (BE, NL, DK, AE, AU sin reina por `cordillera: null`; medias flamencas a `clasica`; nacionales por circuito) | fila propia de la nota: se mide el reparto de `kind` por división ANTES (paso 0, con el calendario de hoy) y DESPUÉS (paso 8) y se imprime la carga media por corredor con `RACE_DAY_TSS`; si una banda de población se mueve, se anota con la causa; no se toca ninguna banda de `world` en E1 | 0 y 8 |
| 14 | `routes/golden.test.ts` (1.418 huellas FNV) | existe solo entre los pasos 1 y 8 | se borra en el paso 8; `routes/realFingerprint.test.ts` (177 + 3) sobrevive y tiene que estar verde antes y después (decisión 28) | 1 y 8 |
| 15 | `db/recorridoDelMundo.test.ts` | auto-consistente | gana «dos temporadas, dos recorridos, un esqueleto» con `ARCH.edicion.activa` y el mismo perfil con `activa = false` (decisión 44); `RouteSource` de tres valores en la columna `text` de `schema.ts` l. 541 | 10 |

### 13.3 `routeCensus`: el censo geométrico que cabe en cada push

Lo que hoy nadie sabe sin correr `balance.md` v60 §12 a mano (cuántos `muro`, `puncheur`, `alto` y `pave` produce el calendario, con qué desnivel, con cuánta subida lejos de meta) pasa a medirse en segundos. Medido por el juez del motor con `juicios/coste-motor.mjs` sobre el `dist` de `ENGINE_VERSION` 69: una pasada de `sampleProfile` + `finishType(deriveFinishTerrain)` + `stageKindOf` + `finalKindOf` sobre las 1.418 etapas cuesta 569 ms, 0,40 ms por etapa (`juicios/motor.md` §1); es el 0,57 s que se cita en todo el documento y por eso el censo corre en cada push.

```ts
// packages/engine/src/sim/routeCensus.ts   (la forma es la de la sección 3; aquí se añaden p95 y firmaMotivos)
export interface RouteStats {
  raceId: string; stageIndex: number; raceClass: RaceClass; format: RaceFormat; country: string
  zona: GeoZone | null; skeleton: SkeletonId | null; routeSource: RouteSource
  kind: StageKind; label: string; finalKind: FinalKind | null
  finishType: FinishType                       // finishType(deriveFinishTerrain(sampleProfile(profile)), 50): aquí sí
  km: number; dPlus: number; dPlusBloques: number   // dPlusDe y calendarQueens::desnivelDe, para ver el delta
  nPuertos: number; nMuros: number; longestClimbKm: number
  lastClimbKm: number | null; lastClimbG: number | null; kmAfterLastClimb: number | null
  climbKmOutsideLast30: number; kmSubidaShare: number; breakAppealEstimado: number
  pavesKm: number; nSectores: number; estrellas5: number
  maxG: number; huella: number[]               // g por km
  intentos: number; degradado: boolean
  garantiasClase: number                       // 0 a 4 (sección 8, §8.8); 0 en las `real`
  firmaMotivos: string | null                  // MotifKind presentes en arch.motivos (hijos aplanados), sin repetir, ordenados, unidos por '+'; null en las `real`
}
type NumericKey = { [K in keyof RouteStats]: RouteStats[K] extends number ? K : never }[keyof RouteStats]
type CatKey = 'kind' | 'finalKind' | 'finishType' | 'skeleton' | 'zona' | 'routeSource' | 'firmaMotivos'

export interface Cuantiles { n: number; min: number; p10: number; p50: number; p90: number; p95: number; max: number; media: number }
export interface Summary {
  n: number
  num: Partial<Record<NumericKey, Cuantiles>>                   // solo las columnas numéricas (el tipo lo impide en el resto)
  cat: Partial<Record<CatKey, Record<string, number>>>         // fracción [0; 1] por valor
}
export function routeCensus(calendar: CalendarRace[] = SEASON_CALENDAR): RouteStats[]
export function aggregate(rows: RouteStats[], by: (r: RouteStats) => string): Record<string, Summary>
export function entropiaBits(reparto: Record<string, number>): number     // Shannon en bits sobre fracciones
export function correlacion(a: number[], b: number[]): number             // Pearson sobre `huella`, remuestreada a la más corta
export function raceDePrueba(profile: StageProfile, kind: StageKind = 'reina'): CalendarRace   // una carrera de una etapa, routeSource 'generado', arch null: para los tests del censo
```

Los cuantiles se calculan todos igual (orden ascendente e índice `floor(n · p)`), y `p95` entra porque `ARCH.veto.intentosP95` (§12.5) es un p95 y no se puede afirmar con un tipo que solo tiene p90. `Cuantiles` y `firmaMotivos` cambian el §B.2 del esqueleto y la sección 3, que copian esta forma (nota para la pasada de coherencia).

Cómo se calcula cada campo, para que no haya dos censos:

- `finishType`: `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` (`stage/finish.ts` l. 71 y 142, vía `juicios/motor.md` §1), con `groupSize` 50 aquí y solo aquí. Es la única llamada a `sampleProfile` de todo E1 fuera del motor: `verify` no lo usa (decisión 4) y por eso una recalibración de `STAGE.finish*` mueve el censo y no los perfiles. `sampleProfile` lee la pendiente del tramo con `gradientAt` (`stage/sample.ts` l. 47-58) y colapsa `rompepiernas` a `STAGE.rollingGradient` (l. 101).
- `dPlus`: `dPlusDe(profile)` de `routes/grammar/geometry.ts` (integración de tramos con g > 0, decisión 9). `dPlusBloques`: la cuenta de `calendarQueens.ts` l. 54-58 (`sampleProfile`, bloques `subida`, `g/100 · STAGE.dx · 1000`). El censo imprime el delta y `calendario.test.ts` exige p90 de |`dPlus − dPlusBloques`| / `dPlusBloques` < 0,05 sobre las reinas: es la comprobación de que `Skeleton.dPlus` persigue lo que `desnivelDe` mide.
- `kmSubidaShare`: km de bloques `subida` sobre el total, la misma cuenta que `simulate.ts` l. 2165 (`kmSubida = blocks.reduce((acc, b) => acc + (b.tipo === 'subida' ? STAGE.dx : 0), 0)`; mapa 03 §4.1). `breakAppealEstimado`: `clamp(STAGE.breakAppealClimbWeight · kmSubidaShare + (finishType ∈ {alto, muro, puncheur} ? STAGE.breakAppealUphillBonus : 0), 0, 1)`, la regla de `simulate.ts` l. 2167-2170 reproducida con las constantes de `STAGE` (hoy 4 y 0,35, mapa 03 §4.1). Se declara «estimado» porque `isUphillFinish` (`finish.ts` l. 239-241: `alto`, `puncheur`, `muro`) es del motor y aquí se aproxima por `finishType`.
- `climbKmOutsideLast30`: km de bloques `subida` con `kmToGo > STAGE.climbRaceKmToGo` (30, `constants.ts` l. 3820): la variable que separó `reina-150` (0 %, hoy `media-150`) de las nueve reales (del 6 al 38 %) en `balance.md` v43 §7 (mapa 04 §3.2).
- `nPuertos`: segmentos `puerto` con `climbSize ≥ CLIMB_MIN_KM` 1,5; `nMuros`: segmentos `puerto` con km ≤ `WALL_MAX_KM` 3 y g ≥ 8; `longestClimbKm`: `climbSize` del mayor (`stageKind.ts` l. 36-42); `lastClimbKm`, `lastClimbG`, `kmAfterLastClimb`: de `routes/finalKind.ts`, con la pancarta si la hay (por eso `emitirPancartas` pone SIEMPRE `cima` en el último `puerto`, decisión 25).
- `huella`: g medio por km entero (vector de `round(km)` posiciones) sobre los bloques de `sampleProfile`, que ya está calculado para `finishType`. Sirve a V12 y a las bandas de variedad.
- `zona`, `skeleton`, `intentos`, `degradado`, `garantiasClase`, `firmaMotivos`: de `GeneratedStage.arch`; `null` y 0 en las etapas `real`. `firmaMotivos` aplana `hijos` (como `motivosPlanos` en la sección 5) y no cuenta `enlace` ni `meta`: para `nc_ruta` en `flandes` es `circuito+muro`, en `andes` `circuito+cota`, en `golfo` `circuito+expuesto`.

Dónde corre: `routes/grammar/calendario.test.ts` importa `routeCensus` y afirma `ROUTE_CENSUS_TARGETS` sobre `calendarForSeason(0)`, y los cero degradados sobre las temporadas 0 a 3 (las que §14.5 presupuesta: 2,5 + 3 s de tope); está bajo `routes/`, así que entra en `test:rapido` (`package.json` l. 20 excluye solo `packages/engine/src/sim/**`) y corre en cada push. `sim/routeCensus.test.ts` comprueba el censo mismo sobre perfiles literales y su determinismo sobre las temporadas 0 a 3 (abajo) y corre con `test:bancos` (l. 21) y en el nocturno. `pnpm sim` (l. 14) imprime `aggregate(routeCensus(), r => r.skeleton ?? 'real')` al principio del informe, antes de simular nada.

#### `ROUTE_CENSUS_TARGETS`: las bandas de realismo y de variedad

```ts
export interface CensusTarget {
  id: string                                  // una fila por MEDIDA: 'vetos.degradado', 'esqueletos.clase.udWTPro', …
  label: string
  poblacion: (r: RouteStats) => boolean       // subconjunto sobre el que se mide
  medida: (rows: RouteStats[]) => number      // UN número; una banda con dos medidas son dos filas
  min?: number; max?: number
  hoy: number | null                          // columna «hoy (medido)» del paso 0; null si la población no existía
  fuente: string                              // mapa, propuesta o juicio de donde sale la banda
  estado: 'sellada' | 'informativa'           // informativa = se imprime, no afirma
  nMin: number                                // población mínima para afirmar; por debajo se imprime «n insuficiente»
}
export const ROUTE_CENSUS_TARGETS: readonly CensusTarget[]
export const CENSUS_N_MIN = 10
```

Regla de nacimiento (mapa 04 §5.3 regla 4): ninguna banda nace en rojo. En el paso 0 se escriben todas con `hoy` medido sobre el calendario del `ENGINE_VERSION` de partida (hoy 86; el juez midió sobre 69); las que están rojas hoy van en `it.todo` con la cifra en el nombre del test («hoy 0 de 1.075») y pasan a `it` en el paso 8; las que no tienen población hoy (`zona`, `skeleton`, identidad) tienen `hoy: null` y se afirman desde el paso 8. `estado: 'informativa'` se convierte en `'sellada'` solo cuando la cifra tenga dueño y sigma conocida, en el paso 9 o después. Las referencias reales (columna «real») salen de `scripts/medir-real.mjs` sobre las 177 etapas con rasgos (`datos.md` §1.4, decisión 40) donde hay ≥ 3 fuentes, y del mapa 07 §4 donde no las hay; el generador no lee ese fichero, solo el test. En la tabla, una celda con varias medidas son varias filas de `ROUTE_CENSUS_TARGETS` con el id compuesto que se indica; el bucle de `calendario.test.ts` (§13.8) afirma una por una.

Realismo (población: `routeSource !== 'real'` salvo donde se dice):

| id (una fila por medida) | Métrica | Población | Banda | Hoy (medido) | Real / fuente |
| --- | --- | --- | --- | --- | --- |
| `vetos.v1a10`, `vetos.degradado`, `vetos.intentosP95` | violaciones de V1-V10 y V15; etapas con `degradado`; p95 de `intentos` | todo generado | 0; 0 (`ARCH.veto.fallbackMaxShare.calendario` 0); ≤ `ARCH.veto.intentosP95` 3 | n/a (no hay vetos) | sección 9; §12.5 |
| `cruces.kind`, `cruces.finalKind` | `stageKindOf(profile).kind === kind`; `finalKindOf(profile) === arch.finalKind` | todo generado | 100 %; 100 % | 72 discrepancias de `kind` sobre 1.418 (`juicios/motor.md` §1); de 1 a 3 de 1.500 por forma (mapa 01 §5.1) | V6, V7 |
| `esqueletos.clase.udWTPro`, `.ud12`, `.papeles` | esqueletos distintos por clase y formato | un día WT/Pro; un día .1/.2; papeles en vueltas | ≥ 8; ≥ 10; ≥ 9 | 6 moldes de un día y 3 terrenos (mapa 01 §2.1) | «siempre son los mismos tres o cuatro modelos» (agenda §4.18); arquitectura §11.3. Los nacionales NO entran aquí: por la decisión 15 y `ARCH.pesoPorClase` (§12.7) los 133 en ruta llevan un solo `SkeletonId`, `nc_ruta`, y su variedad se mide en las filas `nacionales.*` |
| `esqueletos.entropia` | entropía de esqueleto por zona con ≥ 8 carreras | por `zona` | ≥ 1,5 bits | null (no hay zona) | arquitectura §11.3 |
| `finales.reparto.alto`, `.cimaCerca`, `.valleCorto`, `.valleLargo` | fracción de cada `finalKindOf` sobre las reinas generadas | `kind === 'reina'` y `routeSource !== 'real'` (las 103 de hoy; NO las 54 reales, para que una carga de E12 no ponga roja una banda del generador) | `alto` en [0,45; 0,70]; las otras tres ≥ 0,05 cada una | 38,2 / 8,9 / 42,0 / 10,8 sobre las 157 (mapa 06 §1; el paso 0 lo recuenta sobre las 103) | real: 37 / 4 / 6 / 7 de 54 (`datos.md` §1.4: 69 % `alto`); Vuelta 8 a 10 finales en alto de 21 (mapa 07 §2.1). Con los pesos de la sección 5 (`alto_largo` 20, `alto_corto` 12, `cima_cerca` 10, `valle` 10, `montana_corta` 6, más la blanda, que es `alto`) sale ≈ 0,6. El 0,45 ± 0,08 de `queenFinalMix` (tactica R28.2) era gusto del banco y se retira con la constante (§12.10); si el dueño quiere menos finales en alto que la Vuelta, es una decisión suya y no una banda de realismo |
| `reina.dplus.semana`, `.granVuelta`, `.blanda` | p50 de `dPlus` de reina por formato; población de la cubeta [1.500; 2.500) | reinas generadas por `format`; la tercera sobre todas las generadas | una semana p50 ≥ 2.400; gran vuelta generada p50 ≥ 3.000 (n = 0 en E1: «n insuficiente» hasta E12); cubeta [1.500; 2.500) ≥ 15 % del total generado y D+ mínimo de las generadas < 1.700 | 2.898 (`mountainSegments`) y 1.734 (`mountainClassicSegments`); 76 de 157 en [1.500; 2.500) y 32 de 157 < 1.500 (mapa 06 §1) | mapa 04 §5.1; mapa 07 §4.1. La cubeta < 1.500 se DESPUEBLA de generadas en el paso 8 por diseño: `et_reina_blanda` tiene D+ total [1.500; 2.500] (decisión 8; medida 2.138 en la sección 5) y `ROUTE.queenLowDplusRange` {1.200; 2.500} (`constants.ts` l. 1261), que hoy pone 32 reinas bajo 1.500, se retira (§12.10). Una banda sobre `< 1.500` nacería roja, así que no se escribe; lo que queda bajo 1.500 son reales, y el censo lo imprime |
| `reina.subidaLejana.cero`, `.p10` | `climbKmOutsideLast30` / km de subida | reinas generadas | ninguna en 0 %; p10 ≥ 0,05 | `media-150` (la antigua `reina-150`) 0 %; reales del 6 al 38 % (v43 §7); generadas: paso 0 | V8b; `banco.md` §11.2 |
| `reina.puertoFinal.p50` | `lastClimbKm` de las reinas `alto` (el informe imprime p10 / p50 / p90) | reinas generadas con `finalKind === 'alto'` | informativa | [8,4; 26,7] (mapa 01 §2.5) | real 3,3 / 9,7 / 17,1 (`datos.md` §1.4) |
| `finales.muro`, `finales.puncheur` | fracción de `finishType === 'muro'`; de `=== 'puncheur'` | etapas en línea generadas | ≥ 0,01; ≥ 0,08 | `muro` 0 de 1.075, `puncheur` 51 (4,7 %), `alto` 111 (`juicios/motor.md` §1; v60 §12) | V11, V16; decisión 7 |
| `unDia.ultimaCota.km`, `.aMeta` | `lastClimbKm ≤ 4,2`; `kmAfterLastClimb ∈ [3; 21]` | un día generado con `arch.skeleton ∈ {ud_montana, ud_montana_media, ud_esprint_capi}` (los que V5 acota con cota y valle); quedan FUERA `ud_muro_final` (meta `muro_meta`, `kmAfterLastClimb` 0 por definición, §12.3; su banda es `finales.muro`), `ud_muros` y `ud_muros_adoquin` (fila siguiente) y `ud_montana_alto` (rareza, D1) | 100 %; ≥ 98 % (21 cubre el p90 real 20,8) | muro de [1; 2,5] km a ≥ 16 km (`classicSegments`); puerto de [4; 8] km a [13; 22] (`mountainClassicSegments`) (`datos.md` §1.4) | V5; mapa 07 §4.3; real 0,5 / 1,0 / 2,1 km y 0 / 7,8 / 20,8 km a meta (el p10 real 0 lo cubre `ud_muro_final`) |
| `unDia.murosMeta` | `kmAfterLastClimb ∈ [1; 15]` | `ud_muros` y `ud_muros_adoquin` | 100 % | n/a | sección 5: `esprint` a [1,2; 15] km del último muro (Roubaix con cota a 1,1 km, Ronde con el Paterberg a 13) |
| `unDia.finalLargo` | un día con `finishType === 'alto'` y `lastClimbKm > 6` | un día generado | ≤ 2 % | 0 % tras v40 (pero 9 de un día son `mountainClassicSegments`, mapa 06 §1) | mapa 07 §4.4 regla 1; D1 |
| `muros.cotas.p10`, `.p90` | `nMuros` en `ud_muros` y `ud_muros_adoquin` | esos esqueletos | p10 ≥ 10; p90 ≤ 20 | 4 o 5 (mapa 07 §1.3 contra `classicSegments`) | real un día 4 / 11 / 34 cotas (`datos.md` §1.4) |
| `adoquin.sectores`, `adoquin.km`, `adoquin.ultimo` | `nSectores`; `pavesKm`; km del último sector a meta | `ud_adoquin` | [15; 30]; [40; 60] km; [1; 8] km (las tres como p10-p90) | 3 sectores, ~40 km (mapa 07 §1.4) | Roubaix 31 / 54,8 km; real 5, 6, 8, 9, 15, 31 sectores |
| `llana.dplus` | p90 de `dPlus` | `kind === 'llana'` generadas | ≤ 1.500 | [661; 1.413] (mapa 01 §1) | V9 (≤ 1.800 duro) |
| `km.clase.p90dos`, `km.clase.max` | p90 de km en .2; etapas por encima de `ARCH.km.maxPorClase` | por `raceClass` | ≤ 170; 0 | [145; 195] en cualquier clase (mapa 07 §4.1) | decisión 36; D9 |
| `dplus.delta` | p90 de |`dPlus − dPlusBloques`| / `dPlusBloques` | reinas generadas | < 0,05 | n/a | decisión 9 |
| `nacionales.zona`, `nacionales.firmas`, `nacionales.adoquin`, `nacionales.cota`, `nacionales.expuesto` | entropía de `zona` entre los 133 `nc-*-road` (`zonaDe(code)`; los 77 países sin tabla caen a `generico`, decisión 13); firmas distintas de `firmaMotivos` entre esos 133; BE/NL con `sector` o `muro` adoquinado; CO/EC con cota ≥ 5 km; DK/AE con `expuesto` | `nc_ruta` | ≥ 2,5 bits; ≥ 5; ≥ 60 %; 100 %; 100 % | todos por `classic(220)` (mapa 06 §1: 532 por `oneDaySpec`, `calendar.ts` l. 414) | decisión 15; `motor.md` §V.3. La variedad de los nacionales no está en el `SkeletonId` (es uno solo) sino en los motivos que la zona mete en el circuito y en el país; por eso se mide la forma y no el molde |
| `tactica.kmSubida.circuito`, `.muros` | `kmSubidaShare` por esqueleto (`breakAppealEstimado` se imprime al lado) | `ud_circuito`; `ud_muros` | informativa: ≤ 0,20; ≤ 0,15 | n/a | decisión 25; `juicios/motor.md` §5 riesgo 4 |
| `identidad.firma`, `identidad.correlacion` | mismo esqueleto, firma igual, km ± 6 %, ≥ 1 diferencia no firma en 4 de 5 temporadas; correlación entre ediciones consecutivas en [0,55; 0,9] | generadas, temporadas 1 a 5 contra 0 | informativa (el test vive en `edition.test.ts`, sección 10; el censo solo imprime) | null | decisiones 20 y 22 |

Variedad (todas sobre lo generado; mapa 04 §5.2, arquitectura §11.3, `banco.md` §11.3):

| id | Métrica | Banda | Hoy (medido) |
| --- | --- | --- | --- |
| `variedad.correlacion.mediana`, `.max` | Pearson de `huella` entre pares del mismo esqueleto y km ± 10 % (200 pares deterministas por esqueleto, `routeRng('censo|' + id)`); circuitos excluidos del par | mediana < 0,8; máximo < `ARCH.anticlon.maxCorrelacion` (0,85 provisional, calibrado en el paso 9 sobre Ronde/E3, Amstel/Brabant, Lombardía/Lieja) | > 0,8 esperado en `hilly` porque el esqueleto es único (geografia §11.3); se mide en el paso 0 por molde |
| `variedad.primerPuerto.p10`, `.p90` | km del primer `puerto` / km total, en reinas | p10 < 0,25; p90 > 0,55 | `split` lo pone siempre en el mismo sitio (mapa 01 §4) |
| `variedad.dplusCubetaAlta` | σ de `dPlus` en [2.600; 4.600] | > 500 m | la uniforme en logaritmo de la v64 lo da (mapa 04 §5.2) |
| `variedad.secuencias` | frecuencia máxima de una secuencia de papeles en vueltas de 5 | ≤ 25 % | 7 % (`datos.md` §11.4) |
| `variedad.finalesPorVuelta` | vueltas con ≥ 3 reinas y todas `alto` | 0 | `race-france` lo era (mapa 04 §5.2) |
| `variedad.kmUnDia` | σ de km de un día por clase en .1 y .2 | > 15 km | 0 (el 210 fijo, decisión 36) |

### 13.4 `calendarQueens` estratificada y el control de tamaño de reina

Hoy `calendarQueenSample()` ordena las 157 reinas por `desnivelDe` y toma una de cada `PASO = 6` (`calendarQueens.ts` l. 51, 85-87): 27 etapas, de las que 11 son reales, 5 de edición generada, 2 de un día y 9 de `stageMix` (mapa 06 §3.1). El test corre 4 semillas con reloj 3.600 s (`calendarQueens.test.ts` l. 53-57) y afirma cinco cosas (l. 58-68): las cubetas `<1500` y `2500-3500` pobladas, `facil > dura + 10`, min < 1.500 y max > 2.500, y `wonFromMovePct ∈ [6; 30]` (`targets.ts` l. 806-812). Tres problemas medidos: la banda `<1500` la sostiene hoy un test y no el diseño (mapa 06 §6.3), la muestra cambia de composición con cualquier generador (qué 27 etapas: `juicios/motor.md` §5 riesgo 5), y la banda global se traga la pendiente por cubeta que el propio test ya afirma (mapa 04 §4.3 punto 2). Se decide (decisión 32, en su primera parte; las otras dos quedan sin objeto, puntos 6 y 7):

1. **Muestra estratificada por `finalKind` × `BANDAS_DESNIVEL`** (4 × 4 = 16 estratos, `calendarQueens.ts` l. 90-95), con cuota proporcional y mínimo 1 por estrato no vacío, y `MUESTRA_OBJETIVO = 30`. Dentro de cada estrato se ordena por `dPlus` y se toman SIEMPRE el índice 0 y el último (así la aserción de extremos, `calendarQueens.test.ts` l. 30-31, sigue valiendo: el mínimo y el máximo globales son el primero y el último de su estrato) y el resto por rejilla `i % paso === 0` con `paso = ceil(n_estrato / cuota)`. Sin dado: la composición sale de un criterio escrito, como hoy (l. 22-27). `calendarQueens.ts` exporta `estratos(todas: CalendarQueen[]): Estrato[]` con `Estrato { finalKind: FinalKind; banda: (typeof BANDAS_DESNIVEL)[number]['nombre']; n: number; contiene(q: CalendarQueen): boolean }`, que es lo que la muestra y el test usan.
2. **`CalendarQueen` gana `skeleton: SkeletonId | null` y `routeSource`**, para que el informe diga por forma y por origen sobre qué habla el número.
3. **`CalendarQueenStats` gana `porFinalKind`** (misma forma que `porBanda`) y `porEstrato` (16 filas); ambos se imprimen y no tienen banda hasta tener σ (informativos en el paso 9).
4. **Las aserciones y la cubeta baja.** Se conservan las cinco de hoy con dos re-sellados escritos y una decisión adelantada. El hecho es este: `et_reina_blanda` tiene D+ total [1.500; 2.500] (decisión 8; §12.4 `ARCH.reina.blandaShare` {media 0,25; montana 0,25; alta 0,10}; medida 2.138 en la sección 5), y la cubeta `<1500` de hoy (32 de 157) la puebla `ROUTE.queenLowDplusRange` {1.200; 2.500} (`constants.ts` l. 1261), que se retira. Así que en el paso 8 ninguna reina GENERADA cae por debajo de 1.500 por construcción, y prometer lo contrario en un test sería la regla de nacimiento en rojo. Bajar el suelo de la blanda no lo arreglaría: con sus motivos mínimos (una cota de 5 km al 4 % y un `alto_largo` de 9 km al 6 %, 740 m) y el relleno estimado de 5,5 m/km sobre 130 km de enlaces (`ARCH.reina.rellenoDplusPorKm`, decisión 9), el D+ más bajo que la gramática dibuja anda por 1.400, y un suelo escrito en 1.100 sería una promesa que la aritmética no cumple. Por eso: (a) `facil.races > 0` se re-sella como «la cubeta más baja POBLADA de `BANDAS_DESNIVEL` (≥ 3 etapas en la muestra) tiene carreras», con la cubeta escrita en el mensaje: hoy `<1500`, tras el paso 8 previsiblemente `1500-2500`; `dura` es `>3500` si tiene ≥ 3 etapas y si no `2500-3500`; `facil > dura + 10` se espera que siga, porque es física del motor (43,8 / 13,7 / 1,6 / 0 medido por cubeta, `calendarQueens.test.ts` l. 33-38), no forma; (b) `stats.dPlus.min < 1500` (l. 66) se re-sella a `< 1700` con la causa «decisión 8: la reina blanda empieza en 1.500» y `max > 2500` no cambia; (c) la cubeta `[1.500; 2.500)` la sostiene el diseño y el test lo afirma (§13.8: ≥ 3 etapas en la muestra y al menos una `et_reina_blanda`). Lo que NO se decide aquí es qué dos cubetas compara el test a partir del paso 9 (`<2000` contra `>3000`, o las de hoy) ni qué pasa con la banda [6; 30]: es D6, y se decide ANTES del paso 9 con la cifra de §13.6 delante (nota para la sección 18 y el esqueleto §C.2: el valor por defecto de D6 cambia de «la cubeta baja la sostiene `et_reina_blanda`» a lo que dice el pre-registro).
5. **Reloj**: con la aritmética hecha como en `calendarQueens.test.ts` l. 40-52: 126 s libre y 370 cargada por 27 etapas × 4 semillas; con 30 etapas, 140 y 411; con el factor 2,26 del nocturno, 929 s; ×4 (regla de la casa, l. 46-47; `invariantsDesgaste.test.ts` l. 116-125; `coherence.test.ts` l. 93-100) = 3.716. Reloj nuevo: `{ timeout: 4_000_000 }`, y el comentario se reescribe con estas cifras. Es UNA cifra para todo el documento: la decisión 34 del esqueleto y la sección 15 dicen «3.600 s con 4» y se alinean a 4.000 (nota para la pasada de coherencia); con 12 semillas fuera de CI son de 7 a 21 min (140 × 3 = 420 s libre; 411 × 3 = 1.233 s cargada).
6. **`reina-175-4800` se retira antes de nacer.** El esqueleto (decisión 32) pedía un escenario canónico nuevo con la plantilla 3 del mapa 07 §5 (175 km, 4.800 m) como «control de forma con el tamaño de una reina de verdad». Ese control ya existe y se llama `reina-canonica` (§13.1), y ese tamaño la casa lo midió y lo descartó: el barrido de `scenarios.ts` l. 336-347 da, para 2.933 / 3.339 / 3.742 / 4.101 m, fuga 25,8 / 20,8 / 4,2 / 0,0 %, erosión 0,566 / 0,733 / 0,882 / 0,920 y pájaras 0,3 / 1,3 / 11,3 / 51,2 %, «a partir de 3.300 la etapa deja de tener carrera», con el aval de la v15 («el modelo dejaba de discriminar», `targets.ts` vía l. 348-352). Un escenario de motor de 4.800 m estaría en la zona saturada, su cifra no diría nada del generador y costaría lo que `reina-canonica` en cada `pnpm sim`. La plantilla 3 sigue donde sirve: como `canonico` de `et_reina_alto_largo` (sección 5, 4.605 m medidos) en el censo, en la galería y en el test de V8 de la sección 9 (cuyo comentario debe decir «canónico de `et_reina_alto_largo`, sección 5» y no «reina-175-4800, sección 13»: nota para la coherencia). Lo que sí mide el generador a ese tamaño es la fila `reina.dplus.*` del censo y las reinas `>3500` de `porEstrato`.
7. **`mountain.*` no se renombra** (§13.1, aclaración 2).

`queenGeometry()` (`calendarQueens.ts` l. 184-200) gana test por primera vez (mapa 06 §6.2): las filas `finales.reparto.*` de `ROUTE_CENSUS_TARGETS` son la misma cuenta sobre las generadas enteras, no sobre la muestra, por la razón escrita en l. 160-163 (error típico 0,096 con n = 27, mayor que la tolerancia ± 0,08); `queenGeometry` sigue contando las 157 (reales incluidas, l. 184) y el informe imprime las dos cifras.

### 13.5 `frozenSkeletons` y `GENERATED_QUEENS`

`REAL_QUEENS` es una lista cerrada a propósito (`realQueens.ts` l. 46-93, nueve entradas) y tres de sus nueve entradas las dibuja el generador: `race-colombia` e5 (232 km, hoy `valle_corto` con 18 km tras la cota, medido), `race-guatemala` e9 (200 km) y `race-tachira` e6 (166 km, `valle_largo`, 21 km) (mapa 06 §3.2). Su `why` describe perfiles que ya no corren («el último puerto a 62 km de meta y 47 km rodadores», l. 50). Las dos salidas fáciles están descartadas con razón (`juicios/motor.md` §5 riesgo 8): congelar `Segment[]` convierte el banco en museo del generador viejo; cerrar «por brief» y resortear pierde la comparabilidad hacia atrás. Se decide (decisión 33): las tres se congelan como `Skeleton` literal en `sim/frozenSkeletons.ts` y se renderizan con `renderSkeleton` (sección 8), con `why` reescrito para describir el esqueleto.

```ts
// packages/engine/src/sim/frozenSkeletons.ts
export interface FrozenQueen {
  raceId: string; stageIndex: number           // la entrada de REAL_QUEENS a la que sustituye
  skeleton: Skeleton                           // literal: `id` de los 32, `canonico` propio, sin `alternativas`
  motivos: Motif[]                             // la instancia fija (posiciones incluidas: colocación ya hecha)
  km: number                                   // 232, 200, 166
  geo: GeoZone                                 // `andes` las tres (regla 1)
  role: StageRole; raceClass: RaceClass; format: RaceFormat   // lo que `verify` necesita en el StageRequest (regla 3)
  seedDibujo: string                           // `frozen|race-colombia|5`: solo alimenta `dib`
  huellaFNV: number                            // del perfil rendido; se re-sella con causa si `renderSkeleton` cambia
  why: string                                  // empieza por «CONGELADA POR FORMA (E1, decisión 33; sustituir por dato real en E12): …»
}
export const FROZEN_QUEENS: readonly FrozenQueen[]   // exactamente 3
export function frozenProfile(q: FrozenQueen): StageProfile
export function frozenRequest(q: FrozenQueen): StageRequest
// = { raceId: q.raceId, stageIndex: q.stageIndex, season: BASE_SEASON, km: q.km, role: q.role, terrain: 'mountain',
//     geo: ZONAS[q.geo], raceClass: q.raceClass, format: q.format, routeSource: 'generado', fixed: { skeleton: q.skeleton.id } }
```

Reglas: (1) `motivos` se escriben en el paso 9 leyendo el perfil de HOY con `describeProfile` (sección 8): cada segmento `puerto` con `climbSize ≥ 1,5` pasa a un `Motif` `puerto` o `cota` con su km, su g medio y su posición, y el resto a `enlace`; así la forma que el banco comparaba se conserva, dibujada por el código nuevo. `geo` es `andes` en las tres porque la tabla de territorios de la sección 6 asigna CO, VE y GT a `andes`; para Guatemala es la firma más parecida y no la geografía (Centroamérica no tiene zona propia en `GeoZone`), y el `why` de esa entrada lo dice con esas palabras. (2) `realQueens.ts::findStage(raceId, stageIndex, calendar = SEASON_CALENDAR)` se exporta (hoy es local, l. 160-166) y devuelve `frozenProfile` cuando la pareja está en `FROZEN_QUEENS` y, si no, la etapa del calendario; `REAL_QUEENS` sigue con 9 entradas y `realQueens.lastGroupPct` [7; 14] y `worstStagePct` ≤ 18 (`targets.ts` l. 766-784) se remiden con 6 semillas en el paso 9 (`invariantsAbandonos.test.ts` l. 199). (3) `sim/frozenSkeletons.test.ts`: para cada `q`, con `profile = frozenProfile(q)`, `stageKindOf(profile, false).kind === 'reina'`, `finalKindOf(profile) === q.skeleton.finalKind`, `|dPlusDe(profile) − centro de q.skeleton.dPlus| ≤ 10 %`, `Σ km` al 0,1 de `q.km`, `verify(profile, q.skeleton, frozenRequest(q), q.motivos) === null`, y `fnv(profile) === q.huellaFNV`. (4) La huella se re-sella solo con causa escrita en el test (un cambio de `renderSkeleton`), nunca para tapar. (5) Deuda con nombre: un banco que se llama «reinas reales» corre tres etapas inventadas, y lo dice él mismo: `pnpm sim` (`cli.ts` l. 220-226) imprime junto a cada una de las tres «congelada por forma, sustituir por dato real en E12», y la sección 17 la lista como deuda que E12 cierra cargando esas tres etapas con dato real y borrando `FROZEN_QUEENS`.

`GENERATED_QUEENS` (aparte, también 3): las reinas del calendario nuevo elegidas por forma, una `alto`, una `cima_cerca`, una `valle_largo`, entre las generadas (`routeSource !== 'real'`) de `vu_semana` y `vu_corta`; criterio determinista: en cada `finalKind`, la de `dPlus` más cercano al p50 de su cubeta, y a igualdad el `raceId` menor. Se cierran por nombre en el paso 9 con `skeleton` y `finalKind` anotados, se corren con 6 semillas y se IMPRIMEN sin banda (cola del último por `finalKind`, previsión `alto > cima_cerca > valle_corto > valle_largo` de la tabla v19, `targets.ts` l. 731-765). Un test barato afirma que cada entrada sigue teniendo el `finalKind` y el `skeleton` anotados: si un cambio los mueve, la entrada se vuelve a elegir con causa.

### 13.6 El protocolo «mejor y no solo distinto»

Dos ejes que chocan y no se confunden (mapa 04 §5): realismo (¿se parece el calendario a lo que se corre?) y variedad (¿dos etapas del mismo tipo se distinguen?). Un generador «distinto» mueve bandas; uno «mejor» las mueve en la dirección que la carretera dice, sin tocar lo que no puede tocar. El protocolo se anota en `docs/balance.md` ANTES de correr nada (decisión 30), en este orden:

1. **Línea base (paso 0)**: re-anclaje contra el HEAD de partida (la tabla de §13.1 leída del código, `ENGINE_VERSION`, la lista de huellas selladas de `attribution.test.ts` l. 505-514 y `timetrial.test.ts` l. 83-88, y las líneas de esta sección corregidas si el árbol se movió), `routeCensus` sobre ese calendario, tabla de §13.3 con la columna «hoy» en «vN §0», y la lista de bandas rojas hoy. Previsión escrita: `esqueletos.clase.*`, `unDia.ultimaCota.*`, `finales.muro`, `finales.puncheur`, `muros.cotas.*`, `adoquin.*`, `km.clase.*`, `reina.subidaLejana.*` (en parte), `variedad.correlacion.*`, `variedad.primerPuerto.*` y `variedad.kmUnDia`. Para las bandas de simulación, la línea base es la cifra del último CI en verde con sus semillas de hoy (4 / 6 / 8 / 3 / 12) y la de `balance.md`; la medida con 12 semillas del generador viejo se hace en el paso 9, en la misma sesión y la misma máquina que la del nuevo (todo ×2, decisión 34).
2. **Pre-registro**: `sim/preRegistro.ts` exporta `PRE_REGISTRO: readonly { banda: string; direccion: 'sube' | 'baja' | 'igual' | 'igual_ruido'; porQue: string; previsto?: [number, number] }[]` y `BANDAS_SOBRE_GENERADO: readonly string[]`, la lista LITERAL de las claves de `TARGETS` que leen perfiles generados por el calendario (mapa 04 §2, contadas aquí sobre `targets.ts` HEAD): `timeTrials.tailPct`, `timeTrials.worstStagePct`, `grandTour.abandonPct`, `grandTour.queenLastGroupPct`, `abandonCauses.crashPct`, `abandonCauses.illnessPct`, `abandonCauses.outOfTimePct`, `abandonCauses.outOfTimePerTour`, `smallTours.bestSprinterWinPct`, `smallTours.sweepPct`, `smallTours.flatWinnerGroupPct`, `smallTours.mediaGroups`, `smallTours.mediaOneGroupPct`, `smallTours.flatMoveWorstMarginS`, `smallTours.photoRepeatTopFive`, `smallTours.worstRacePhotoRepeat`, `smallTours.sameWinnerPairPct`, `realQueens.lastGroupPct`, `realQueens.worstStagePct`, `calendarQueens.breakawayWinPct`: son 20 (el mapa 04 §2 decía 17 sobre `8585ca2`; `abandonCauses` tiene cuatro claves y no tres, `targets.ts` l. 410-480). Las `erosion.*` sobre perfiles reales no están en la lista (son «igual» por construcción) y aun así llevan fila. Un test comprueba que toda entrada de `BANDAS_SOBRE_GENERADO` tiene fila en `PRE_REGISTRO`, y `pnpm sim:pareado` imprime la columna «previsto». La tabla, decidida:

| Banda | Dirección | Por qué |
| --- | --- | --- |
| `calendarQueens.breakawayWinPct` global | baja, a [5; 10] % desde el 18,1 medido | la cifra, con la pendiente por cubeta que el test ya afirma (43,8 / 13,7 / 1,6 / 0 %, `calendarQueens.test.ts` l. 33-38; epics E3) y la muestra proporcional de §13.4: tras el paso 8 las generadas no caen bajo 1.500 (punto 4), las blandas ponen del orden del 20-25 % de las generadas en [1.500; 2.500) y V8a empuja el resto a ≥ 2.500, así que la muestra queda aproximadamente 0-10 % en `<1500` (solo reales), 30-40 % en `1500-2500`, 35 % en `2500-3500` y 20 % en `>3500`: 0,05 × 43,8 + 0,35 × 13,7 + 0,35 × 1,6 + 0,20 × 0 ≈ 7 %, con horquilla [5; 10] según cuántas reales caigan bajo 1.500. El suelo 6 de la banda [6; 30] queda DENTRO de la horquilla: por eso D6 se decide ANTES del paso 9 y no después, con dos valores explícitos, recentrar la banda a [2; 12] (pre-registrado aquí, no ajustado después) o subir `ARCH.reina.blandaShare` para conservar el 18 %; el que se implementa si el dueño no contesta es el primero, porque es el que respeta «está bien así» sobre lo medido y no sobre un número inventado |
| `calendarQueens` por cubeta | igual (monótona decreciente) | es física del motor |
| `realQueens.lastGroupPct`, `worstStagePct` | igual_ruido | las tres generadas están congeladas por forma (§13.5); solo cambia el dibujo |
| `grandTour.*`, `abandonCauses.*` | igual | 20 de 21 reales; si se mueven, acoplamiento (regla 3) |
| `erosion.longClassicFresh`, `.hardestClassicFresh`, `.queenThirdWeek` | igual | reales |
| `smallTours.mediaGroups` | sube | cotas más cerca de meta (`et_media_*`: última cota a 0-59 km real contra 26-68 hoy, `datos.md` §1.4) |
| `smallTours.mediaOneGroupPct` | baja | misma razón; hoy el campo entero llega junto en el 23 % (mapa 04 §4.2) |
| `smallTours.flatWinnerGroupPct` | igual | `et_llana` sigue entera con V9 |
| `smallTours.photoRepeatTopFive`, `worstRacePhotoRepeat`, `sameWinnerPairPct` | baja o igual | menos llanas seguidas por `ARCH.pesosComposicion` y `ARCH.bloques`; la parte de composición (pares de agrupadas) se imprime aparte de la de motor (`targets.ts` l. 647-730) |
| `smallTours.bestSprinterWinPct`, `sweepPct`, `flatMoveWorstMarginS` | igual | dependen del campo y del motor, no de la forma de la llana |
| saturación de las 8 más duras | igual (0 de 8) | V5 impide el final de 9-15 km; el conjunto cambia (nacionales por circuito) y se lista |
| `timeTrials.tailPct` | sube ≤ 0,5 puntos | `et_crono` con `cota` ≤ 3 km; `worstStagePct` igual |
| `stageHistory` `cambian` | baja a solo reales | decisión 23 |
| Jaén, Tramuntana | igual (0) | listón de cero |
| `world` (reparto de `kind`) | se anota, sin previsión numérica | ninguna banda de población se toca en E1 |
| `medianLeadGroupRiders` (sin banda) | se imprime por `finalKind` | deuda de `targets.ts` l. 695-711 |
| quién gana por esqueleto (nueva, informativa) | `ud_muros` clasicómano, `ud_adoquin` rodador, `et_media_muro` puncheur, `et_reina_*` escalador | arquitectura §11.4; es el «mejor» por el lado del juego |

3. **Pareado**: mismo `worldSeed`, mismo campo (`buildField(worldSeed, level)`, `realQueens.ts` l. 125-157, sobre `fieldFor(level)` l. 109), misma semilla de etapa con `engineVersion: 1` fijo (`realQueens.ts` l. 179-182 y 243-249), generador viejo contra nuevo, 12 semillas. La medida es la diferencia por semilla: mediana de las diferencias pareadas y signo, como hizo la v49 con la brecha 1.º-10.º (`targets.ts` l. 114-143). El generador viejo vive SOLO durante el paso 9 en UN fichero, `sim/legacy/profileGenLegacy.ts` (§B.1; sección 15, paso 8): los ocho `xxxSegments`, `normalize` y `garantizaPuerto`, más copias de `oneDaySpec` (`calendar.ts` l. 414), del `stageMix` viejo (`mixRoles` l. 471, `mixKm` l. 536) y de la rama vieja de `buildRace` (l. 900) como `legacyCalendar(): CalendarRace[]`. Para que ese fichero pueda construir el calendario viejo sin copiar 2.700 líneas de tablas, `calendar.ts` exporta en el paso 8, sin cambio de conducta, `RACE_TABLES = { WT_TABLE, PRO_TABLE, CON_TABLE }` (l. 945, 1256, 1629), `RACE_COUNTRY` (l. 580), `NATIONAL_CHAMPIONSHIPS` (l. 379), `auto` (l. 107) y `editionGrandTour` (l. 247), y `legacyCalendar` los consume. El fichero se borra en el mismo cambio que cierra «vN §2» (decisión 29). Para que el pareado sea posible, cada función de banco gana un último parámetro `calendar: CalendarRace[] = SEASON_CALENDAR` (`analyzeCalendarQueens(runs, calendar?)`, `findStage(raceId, i, calendar?)` exportada, las de `smallTours.ts` y `timeTrials.ts`, y la selección de las 8 más duras, hoy inline en `invariantsClasicas.test.ts` l. 119-132 (`demandaDe` con `costBase` y `oneDayHardest`), extraída a `sim/saturation.ts::hardestOneDay(calendar, n = 8)`); los tests no cambian porque el valor por defecto es el de hoy. `sim/pareado.ts` (script `pnpm sim:pareado [semillas=12]` en `package.json`, junto a l. 14-16) corre cada banco dos veces y escribe la tabla `banda | viejo | nuevo | Δ mediana | previsto | cumple`. Los cuatro ficheros nuevos de este punto (`sim/preRegistro.ts`, `sim/pareado.ts`, `sim/saturation.ts` y el script) no están en §B.1: la pasada de coherencia los añade al glosario y al paso 9 de la sección 15 (`saturation.ts` ya figura en el bloque de tipos de la sección 3).
4. **Cuatro condiciones, todas necesarias**: (a) toda banda de realismo roja en la línea base pasa a verde y ninguna verde pasa a roja; (b) todas las de variedad en verde; (c) las canónicas de §13.1 no se mueven ni un dígito: `llana-180`, `reina-canonica`, `cri-40`, `chronicle`, las cuatro huellas de `attribution.test.ts` (l. 505-514), las dos de `timetrial.test.ts` (l. 83-88) y la igualdad de `raceRadio.test.ts` (l. 749-764), leídas del HEAD de partida en el paso 0; (d) las de simulación se mueven en la dirección pre-registrada, o se explica con medida por qué la previsión era mala, y no se ajusta la banda para que cuadre. Si (a) a (d) se cumplen, el generador es mejor. Si solo se cumple (b), es distinto. Si falla (c), ha tocado el motor y no se mezcla en la misma tanda.
5. **Doble lectura de las listas cerradas** (mapa 04 §5.3 regla 2): por nombre (¿qué le pasó a `race-colombia` e5?) y por forma (¿qué les pasa a las reinas `alto` de [3.500; 4.500] m?). Una lista cerrada conserva el nombre y no la forma (mapa 04 §3.3); leerla solo por nombre confunde un cambio de forma con uno de motor.

La tabla pareada es la CONDICIÓN para borrar el generador viejo (decisión 29): sin tabla en «vN §2», `sim/legacy/` no se borra y el paso 9 no está cerrado.

### 13.7 La remedición: dueño, orden, horas y techo

Dos dueños (decisión 34): el dueño operativo, que corre las horas, es el implementador del paso 9; el dueño de cada banda es el dueño del repositorio, que decide con la cifra delante y no antes. Orden por coste creciente, todo ×2 (viejo y nuevo), con los relojes de los tests (HEAD `2900895`) y el coste real medido o escalado del que tienen:

| Orden | Banco | Semillas | Coste real (por generador) | Reloj del test | Paso |
| --- | --- | --- | --- | --- | --- |
| 1 | `routeCensus` (§13.3) | n/a | 0,57 s (`juicios/motor.md` §1) | `test:rapido` | 0 y 8 |
| 2 | `stageKind.test.ts` por esqueleto (rápido) y `sim/stageKind.completo.test.ts` | 20 × 3 zonas × 5 km; 60 × 5 km × zonas | < 20 s; minutos (77.000 a 115.000 generaciones, sin simular; se mide en el paso 4) | 30 s por `it`; el completo con reloj medido ×4 | 8 |
| 3 | `realQueens` sobre `FROZEN_QUEENS` y `GENERATED_QUEENS` | 6 | ~4 min | 900 s (`invariantsAbandonos.test.ts` l. 208) | 9 |
| 4 | `timeTrials` | 6 | ~3 min | 300 s (`invariants.test.ts` l. 130-157) | 9 |
| 5 | `calendarQueens` estratificada | 12 | 7 a 21 min (140 s libre y 411 cargada con 4 semillas, ×3) | 4.000 s con 4 (§13.4) | 9 |
| 6 | saturación de las 8 más duras | 12 | ~30 min (1.800 s de reloj con 3, `invariantsClasicas.test.ts` l. 144) | 1.800 s con 3 | 9 |
| 7 | `smallTours` | 12 | ~25 min (3.900 s de reloj con 8, `invariantsPequenas.test.ts` l. 64) | 3.900 s con 8 | 9 |
| 8 | Jaén (40 semillas) y Tramuntana (12) | 40 / 12 | ~5 min | `coherence.test.ts` l. 134 (300 s de coste CI anotado) y `journal.test.ts` | 9 |

Suma por generador ≈ 85 min; ×2 ≈ 3 h. Presupuesto: 4 h de máquina y 2 sesiones humanas (una para correr y anotar, otra para leer con el dueño); techo 8 h. Si se supera el techo se corta por el orden de la tabla, de abajo arriba (`smallTours` y saturación son lo primero que se sacrifica), y lo no remedido con 12 semillas queda anotado en «vN §2» como «remedido con las semillas de CI (8 / 3), no con 12», con la banda tal cual.

Regla «previsión fallida»: un resultado que contradice la dirección pre-registrada se anota en `docs/balance.md` «vN §2» con este formato: banda, previsto, medido (viejo, nuevo, Δ mediana pareada, n semillas), causa que se ve en los datos (por forma y por nombre), y la frase «previsión fallida». La banda NO se mueve: sigue con su valor y su rótulo hasta que el dueño decida con la cifra delante (sección 18), y si eso deja un test rojo, el test se marca `it.skip` con la referencia a la entrada de la nota, nunca se ensancha la banda. Las bandas que nacen en esta remedición (`porFinalKind`, `porEstrato`, `GENERATED_QUEENS`, quién gana por esqueleto, `medianLeadGroupRiders` por final) se quedan `informativa` hasta tener σ conocida: en `calendarQueens` con 108 carreras σ ≈ 3,7 puntos (`targets.ts` l. 797-798), así que un estrato de 2 etapas × 12 semillas = 24 carreras no puede sellar nada, y eso se escribe en el informe junto al número.

### 13.8 Tests de la sección

Tests primero, como todo el plan (sección 15). Los que corren en cada push son los de `routes/grammar/calendario.test.ts`; los de `sim/` corren con `test:bancos` y en el nocturno. Todos los bloques importan `describe`, `it` y `expect` de `vitest`.

```ts
// packages/engine/src/routes/grammar/calendario.test.ts (test:rapido)
import { describe, it, expect } from 'vitest'
import { routeCensus, aggregate, ROUTE_CENSUS_TARGETS, CENSUS_N_MIN } from '../../sim/routeCensus.js'
import { ARCH } from '../../constants.js'
import { calendarForSeason, BASE_SEASON } from './edition.js'

const rows = routeCensus(calendarForSeason(BASE_SEASON))

describe('el censo del calendario que el juego corre', () => {
  for (const t of ROUTE_CENSUS_TARGETS) {
    const pob = rows.filter(t.poblacion)
    const nombre = `${t.id}: ${t.label} (hoy ${t.hoy ?? 'sin población'})`
    if (t.estado === 'informativa') { it.skip(nombre, () => {}); continue }   // se imprime en pnpm sim, no afirma
    it(nombre, () => {
      if (pob.length < Math.max(t.nMin, CENSUS_N_MIN)) return                 // «n insuficiente»: se imprime, no falla
      const v = t.medida(pob)
      if (t.min !== undefined) expect(v).toBeGreaterThanOrEqual(t.min)
      if (t.max !== undefined) expect(v).toBeLessThanOrEqual(t.max)
    })
  }
  it('ninguna etapa generada llega degradada en las temporadas 0 a 3 y el p95 de intentos es ≤ ARCH.veto.intentosP95', () => {
    for (const s of [0, 1, 2, 3]) {                                            // las cuatro que §14.5 presupuesta (2,5 + 3 s de tope)
      const gen = routeCensus(calendarForSeason(s)).filter((r) => r.routeSource !== 'real')
      expect(gen.filter((r) => r.degradado).length, `temporada ${s}`).toBe(0)
      expect(aggregate(gen, () => 'todo').todo!.num.intentos!.p95, `temporada ${s}`).toBeLessThanOrEqual(ARCH.veto.intentosP95)
    }
  })
  it('el desnivel por tramos y por bloques cuentan lo mismo dentro del 5 % en las reinas', () => {
    const reinas = rows.filter((r) => r.kind === 'reina' && r.routeSource !== 'real')
    const deltas = reinas.map((r) => Math.abs(r.dPlus - r.dPlusBloques) / r.dPlusBloques).sort((a, b) => a - b)
    expect(deltas[Math.floor(deltas.length * 0.9)]).toBeLessThan(0.05)
  })
  it('el censo de la temporada 0 cabe en un push', () => {
    const t0 = performance.now()
    routeCensus(calendarForSeason(BASE_SEASON))
    expect(performance.now() - t0).toBeLessThan(5_000)       // 0,57 s medidos; techo holgado para CI cargado
  })
})
```

```ts
// packages/engine/src/sim/routeCensus.test.ts (test:bancos)
import { describe, it, expect } from 'vitest'
import { routeCensus, raceDePrueba } from './routeCensus.js'
import { mediaScenario, queenScenario } from './scenarios.js'
import { FROZEN_QUEENS, frozenProfile } from './frozenSkeletons.js'
import { renderSkeleton } from '../routes/grammar/render.js'
import { SKELETONS } from '../routes/grammar/skeletons.js'
import { calendarForSeason } from '../routes/grammar/edition.js'

describe('el censo mide como lee el motor', () => {
  it('finishType se mide como lo lee el motor: un muro_meta de 1,0 km al 12 % con 2 km de aproximación a amplitud 2,5 tipa muro', () => {
    const profile = renderSkeleton(SKELETONS.ud_muro_final.canonico, /* requestDePrueba(ud_muro_final, ZONAS.ardenas), sección 5 */)
    const [r] = routeCensus([raceDePrueba(profile, 'media')])
    expect(r.finishType).toBe('muro')
    expect(r.lastClimbKm).toBeCloseTo(1.0, 1)
  })
  it('climbKmOutsideLast30 separa media-150 (la antigua reina-150) de una reina de verdad', () => {
    expect(routeCensus([raceDePrueba(mediaScenario().input.profile)])[0]!.climbKmOutsideLast30).toBe(0)            // 135 km llanos y el puerto en meta
    expect(routeCensus([raceDePrueba(queenScenario().input.profile)])[0]!.climbKmOutsideLast30).toBeGreaterThan(0)  // reina-canonica: 13 km de puerto que coronan en el km 63 de 158
    expect(routeCensus([raceDePrueba(frozenProfile(FROZEN_QUEENS[0]!))])[0]!.climbKmOutsideLast30).toBeGreaterThan(0)
  })
  it('el censo es determinista en las temporadas 0 a 3', () => {
    for (const s of [0, 1, 2, 3]) {                          // 4 censos de 0,57 s, los que §14.5 presupuesta
      const cal = calendarForSeason(s)
      expect(routeCensus(cal)).toEqual(routeCensus(cal))
    }
  })
})
```

```ts
// packages/engine/src/sim/calendarQueens.test.ts (añadido a las cinco aserciones de hoy, con los re-sellados de §13.4 punto 4)
import { describe, it, expect } from 'vitest'
import { allCalendarQueens, calendarQueenSample, estratos, BANDAS_DESNIVEL } from './calendarQueens.js'

it('la muestra estratificada cubre los 16 estratos poblados y conserva los extremos', () => {
  const todas = allCalendarQueens(); const muestra = calendarQueenSample(todas)
  expect(muestra.length).toBeGreaterThanOrEqual(25)
  expect(muestra.length).toBeLessThanOrEqual(34)
  expect(muestra[0]!.dPlus).toBeLessThanOrEqual(todas[5]!.dPlus)
  expect(muestra.at(-1)!.dPlus).toBeGreaterThanOrEqual(todas.at(-6)!.dPlus)
  for (const e of estratos(todas)) if (e.n > 0) expect(muestra.some((q) => e.contiene(q)), `${e.finalKind} × ${e.banda}`).toBe(true)
})
it('la cubeta [1.500; 2.500) la sostiene el diseño, no el test (decisión 8)', () => {
  const muestra = calendarQueenSample()
  const blandas = muestra.filter((q) => q.dPlus >= 1500 && q.dPlus < 2500)
  expect(blandas.length, 'cubeta [1.500; 2.500) despoblada').toBeGreaterThanOrEqual(3)
  expect(blandas.some((q) => q.skeleton === 'et_reina_blanda')).toBe(true)
  expect(Math.min(...muestra.map((q) => q.dPlus))).toBeLessThan(1700)       // re-sellado desde < 1500: la reina blanda empieza en 1.500
})
// En el test de las 4 semillas (l. 53-71 hoy), `facil` pasa a ser la cubeta más baja de BANDAS_DESNIVEL con ≥ 3 etapas
// en la muestra y `dura` la `>3500` si tiene ≥ 3 (si no, `2500-3500`); el mensaje del expect nombra las dos cubetas.
// Qué dos cubetas se comparan a partir del paso 9 es D6 (sección 18), decidida ANTES del paso 9 con la cifra de §13.6.
```

```ts
// packages/engine/src/sim/preRegistro.test.ts (test:bancos)
import { describe, it, expect } from 'vitest'
import { PRE_REGISTRO, BANDAS_SOBRE_GENERADO } from './preRegistro.js'
import { GENERATED_QUEENS } from './frozenSkeletons.js'
import { findStage } from './realQueens.js'
import { finalKindOf } from '../routes/finalKind.js'

it('toda banda que lee perfiles generados tiene dirección pre-registrada', () => {
  expect(BANDAS_SOBRE_GENERADO).toHaveLength(20)             // la lista literal de §13.6 punto 2
  for (const banda of BANDAS_SOBRE_GENERADO)
    expect(PRE_REGISTRO.find((p) => p.banda === banda), banda).toBeDefined()
})
it('GENERATED_QUEENS siguen teniendo la forma con la que se eligieron', () => {
  for (const q of GENERATED_QUEENS) {
    const { stage } = findStage(q.raceId, q.stageIndex)
    expect(finalKindOf(stage.profile)).toBe(q.finalKind)
    expect(stage.arch?.skeleton).toBe(q.skeleton)
  }
})
```
