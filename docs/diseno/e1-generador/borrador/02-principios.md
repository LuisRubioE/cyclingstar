## 2. Principios

Diez reglas. Las nueve primeras son las de la propuesta ganadora (`arquitectura.md` §2) reescritas con las decisiones cerradas de la síntesis; la décima la impusieron los tres jueces (riesgo 2 de cobertura, 7 del motor, 1 de ejecutabilidad). Cada principio lleva tres cosas: lo que dice, con qué línea del código de hoy choca (la sección 1 «Diagnóstico medido» tiene la cifra completa; aquí solo la referencia), y qué lo hace cumplir en el diseño (tipo, constante, veto o test, con la sección que lo desarrolla). No son aspiraciones: cuando un principio y una línea del plan se contradigan, manda el principio y la línea se reescribe.

### 2.1 La arquitectura se sortea; el detalle se rellena

Una semilla decide primero QUÉ etapa es (esqueleto, motivos, cuántos, en qué ventana de la etapa empieza cada uno) y solo después CÓMO se dibuja (longitud exacta de cada rampa, ondulación del enlace, ruido de pendiente). Las dos decisiones viven en subflujos distintos (`arch|raceId` y `mot|…` para la arquitectura; `dib|…` para el dibujo, sección 8) y las primitivas de dibujo se conservan tal cual: `climb`, `descent`, `rolling` y `split` de `profileGen.ts` siguen siendo las que rinden cada motivo (sección 4).

Hoy es al revés. El mapa 01 §4 lo mide: la semilla mueve únicamente el detalle; el número de dificultades lo fija el kilometraje por umbral (`hillySegments(170, 'x')` tiene 2 cotas y `hillySegments(171, 'x')` tiene 3), el orden lo fija el `forEach` de cada molde (siempre relleno, dificultad, bajada, relleno) y las únicas dos decisiones de forma sorteadas de todo el generador son el brazo de desnivel y el `finalKind` de `mountainSegments` (l. 345 y l. 355, `arquitectura.md` §1.2). De ahí «siempre son los mismos tres o cuatro modelos» (agenda §4.18). En el diseño la variedad no la da el ruido de las rampas sino el catálogo: 12 `MotifKind`, 9 `MetaKind`, 32 `SkeletonId` y 4 `TourSkeletonId` (sección 3), y el sorteo de esqueleto es una elección ponderada `pesoBase × geo.pesos × ARCH.pesoPorClase` (sección 5). `skeletons.test.ts` sella que sobre 300 semillas por clase y zona ningún esqueleto admitido sale a 0 ni ninguno pasa del 60 % (sección 13, banda de variedad).

### 2.2 Cada motivo es un tipo con parámetros acotados, y los rangos viven en `ARCH` con intención

Un motivo es un valor del tipo `Motif` (`motifs.ts`, sección 3) con `kind`, `km`, `g`, `forma` y, según el tipo, `adoquin`, `firme`, `estrellas`, `hijos`, `vueltas`, `meta` o `cotaFinal`; `validateMotif` rechaza cualquier combinación fuera de rango antes de rendir. Todo rango numérico de forma está en el bloque `ARCH` de `constants.ts` (sección 12, tabla completa en §B.3 del esqueleto) con valor e intención al lado: `ARCH.motivo.cota.km` [2,5; 8,0] al [4; 7] % («media montaña; techo 8,0 deja 0,5 a `PASS_MIN_KM` 8,5»), `ARCH.motivo.puerto.km` [9,0; 25], `ARCH.motivo.muro.km` [0,4; 3,0] con `gMax` 16, y así las 40 filas. La regla de revisión es mecánica: en `packages/engine/src/routes/grammar/` ningún `between(rand, a, b)` lleva literales; recibe un rango de `ARCH` o la intersección de ese rango con el de `GeoSignature`.

Hoy los rangos son literales en el cuerpo de las funciones (`between(rand, 3, 7)` en `profileGen.ts` l. 247, `between(rand, 1, 2.5)` l. 477, `between(rand, 9, 15)` l. 362, `arquitectura.md` §1.2) y de las claves de `ROUTE` solo cuatro entran en `profileGen.ts` (mapa 01 §3 y §9.2): `ROUTE.kmFlat`, `queenDplusRange` y compañía describen el generador pero no lo gobiernan. La sección 12 lista qué literales migran (l. 247-248, 276-283, 358-363, 451-454, 477-478, 496) con su valor de hoy al lado y qué claves de `ROUTE` se retiran porque `ARCH` las sustituye. `motifs.test.ts` recorre cada `MotifKind` con 300 semillas y comprueba que el rendido cae dentro del rango declarado (sección 15, paso 3).

### 2.3 La geografía restringe, no decora; `null` significa «aquí no existe»

El país entra como `GeoSignature` (sección 6): para cada `GeoZone` dice qué existe (`puerto`, `cota`, `muro` con sus rangos), qué no existe (`null`), cuánto adoquín y sterrato hay, cómo ondula el enlace (`amplitud`) y qué esqueletos son probables (`pesos`). El `terrain` de la fila deja de ser identidad y pasa a ser petición: `StageRequest.terrain` es «sesgo, nunca orden» (§B.2). Si el sitio no puede dar lo que la fila pide, se degrada de forma escrita, contada y siempre hacia abajo:

```ts
// packages/engine/src/routes/grammar/geo.ts
/** Un esqueleto cabe en una zona si todo lo que `requiere` existe (ningún campo pedido es `null`). */
export function admite(geo: GeoSignature, sk: Skeleton): boolean
/** Siempre hacia abajo: alta → montana → media → ondulado → llano; `llano` se queda en `llano`. Nunca hacia arriba: un país llano no gana puertos. */
export function degradar(relieve: Relieve): Relieve
```

`Territorio.cordillera: null` es la misma idea a escala de vuelta: «una vuelta belga no tiene reina» no es un peso 0 en una tabla sino una propiedad del sitio que el dueño lee en una fila y que `tour.test.ts` sella («0 reinas en BE, NL, DK, AE, AU», decisión D8 con valor por defecto «se acepta», sección 18). Los vetos V1 a V4 (sección 9) comprueban la geografía sobre el perfil final, no solo sobre la intención. Y la zona no se sortea nunca: `RACE_REGION` está curada a mano para las 310 carreras de equipos y por etapa para las 60 ediciones, `regions.test.ts` prohíbe que una carrera de equipos caiga a `zonaDe(country)` (sección 6); solo los 532 nacionales pasan por el país.

Hoy `buildRace` calcula el país en `calendar.ts` l. 889 (`row.country ?? RACE_COUNTRY[row.id]`), lo copia al resultado y no lo pasa a ninguna de las tres ramas que construyen etapas (mapa 02 §6); los 532 nacionales salen de `classic(220, id)` e `itt(38, id)` para los 133 países (l. 351-360, `arquitectura.md` §1.3): el belga y el colombiano son la misma función con distinto hash. La tabla `ZONAS` es juicio, no dato (decisión 16), y por eso este principio no se sostiene solo: se apoya en el 2.10.

### 2.4 Lo que se declara se garantiza

Un `Skeleton` declara el `StageKind` que produce (`Skeleton.kind`) y, en reinas y medias, el `FinalKind` (`Skeleton.finalKind`). El perfil rendido pasa por `stageKindOf` y `finalKindOf` de `routes/` y, si no coincide, se rehace con el siguiente intento (V6 y V7, sección 9): el reintento solo cambia los subflujos `mot`, `pos` y `dib` con sufijo `i{intento}`, nunca la identidad. El tope es `ARCH.colocacion.maxIntentos` 8; agotado, se rinde la plantilla `canonico` del esqueleto (un `Motif[]` literal escrito a mano que pasa todos los vetos por construcción, sección 5) y la etapa sale con `arch.degradado: true`. Las cifras que cierran el principio: `ARCH.veto.fallbackMaxShare` {calendario: 0, testPorEsqueleto: 0,005} (cero degradados en las 1.418 etapas de `SEASON_CALENDAR`, ≤ 0,5 % en 300 semillas × zona) y `ARCH.veto.intentosP95` 3 (si el p95 de `arch.intentos` lo supera en el paso 4, se estrechan rangos antes que subir el tope). Y el `kind` de toda etapa generada es `stageKindOf(profile, timeTrial).kind`, nunca una etiqueta heredada del papel (decisión 23).

La garantía necesita holgura, porque los clasificadores de `routes/` tienen bordes duros y hoy nadie los respeta: 8,5 km entre `garantizaPuerto` (mide `segment.km`) y `climbSize` (suma tramos redondeados) cruzan 3 de 1.500 clasificaciones; los cortes 5 y 20 de `FINAL_KIND_CUTS` contra los rangos de `valleyKmFor` cruzan 4 de 6.000; `CLIMB_MIN_KM` 1,5 contra muros de 1 a 2,5 km deja 12 de 1.500 clásicas sin «última cota» (mapa 01 §9.4). Por eso `puerto` empieza en 9,0 y `cota` acaba en 8,0 (0,5 a cada lado de 8,5), los valles de `cima_cerca`, `descenso_meta` y `valle` llevan 0,7 de margen sobre 5 y 20 (`ARCH.veto.margenValleKm`), y `emitirPancartas` pone `cima` siempre en el último `puerto` para que `lastClimbKm` lo vea (sección 4 y sección 8). Lo que hoy viola el principio con más ruido: `mountainClassicSegments` no está en `stageKind.test.ts` y el 14 % de sus salidas se clasifica `media` mientras el calendario las etiqueta reina (mapa 01 §9.5); son 72 discrepancias entre `kind` declarado y leído, con un 49 sellado en `stageHistory.test.ts` l. 199 (sección 1 y sección 11). `skeletons.test.ts` sella cada esqueleto × 5 kilometrajes × 60 semillas × zonas compatibles con V6 y V7 en verde (sección 15, paso 4).

### 2.5 Identidad por carrera, edición por temporada; la temporada 0 tira sus propios dados

Una carrera es la misma carrera. Su identidad sale de `raceId` sin `season` (subflujos `arch|raceId` y `firma|raceId`): esqueleto, zona, motivos de firma con sus parámetros, papeles de cada etapa, qué etapas son crono y cuántas hay (decisión 20). La edición sale de `ed|raceId|season` y toca una lista cerrada: motivos no firma, km ± `ARCH.edicion.kmJitter` 0,06 (nunca en etapas de edición real, donde el km es contrato), vueltas ± 1, un motivo opcional con p `ARCH.edicion.motivoNuevo` 0,35, y el dibujo. Nunca el `kind`, el `timeTrial` ni el número de etapas: eso lo sella `edition.test.ts` (sección 10), porque cuatro lectores fuera de `race_routes` leen el `kind` del código (`calendarRun.ts` l. 516 y 1614, `callups.ts` l. 98, `raceContext.ts` l. 56-59; riesgo 1 del juez del motor) y la sección 10 los lleva al congelado.

`BASE_SEASON = 0` es la que la base ya usa (`season = floor(gameDay / SEASON_DAYS)`, `calendarRun.ts` l. 135) y `SEASON_CALENDAR = calendarForSeason(0)`. La temporada 0 no es «la mediana de las cardinalidades» ni un caso especial: tira sus dados con `ed|raceId|0` como cualquier otra (decisión 21). El interruptor `ARCH.edicion.activa` y el `nivel` (0 fija, 1 jitter, 2 rotación declarada por `Skeleton.alternativas` elegida por `season % n`) son decisión del dueño D7; se implementa activa con nivel 1, y nivel 2 donde el esqueleto declare alternativas (sección 18). Hoy no hay temporada: `SEASON_CALENDAR` es una constante de módulo (`calendar.ts` l. 3643, mapa 02 §11) y la base, que sí sabe de temporadas (`raceKey = ${race.id}:s${season}`, `calendarRun.ts` l. 783), le pide al calendario el mismo perfil cada año (`arquitectura.md` §1.4.6).

### 2.6 Lo real manda y se distingue hasta la pantalla

La prioridad de `buildRace` no cambia: rasgos reales (`featureSpec`) > edición real sin rasgos (`stagesFromEdition`) > generado (tabla y nacionales). Un recorrido con rasgos no pasa por la gramática y `featureProfile.ts` no se toca en E1 (decisión 27, con la deuda de los dos rellenos anotada en la sección 11). Antes de tocar `calendar.ts`, `realFingerprint.test.ts` sella la huella FNV de las 177 etapas con rasgos y de las 3 grandes vueltas enteras, y sobrevive al paso 8 (decisión 28). El origen viaja: `routeSource` con tres valores por etapa (`'real' | 'edicion' | 'generado'`) desde `CalendarStage` hasta `race_routes.route_source`, la API y la web, con `mixto` como agregado de carrera, y la ficha lo dice con tres textos distintos («Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado», decisión 39). Para lo generado, la ficha añade la frase de arquitectura y «Edición N» (D10, valor por defecto: siempre; sección 18).

Hoy `RouteSource` tiene dos valores (`db/raceRoutes.ts` l. 29) y `freezeRaceRoute` escribe `'generado'` a mano para todo (l. 49-52, con el comentario que lo reconoce: «no hay forma de distinguirlas sin el campo»). El inventario cuenta 1.241 de 1.418 etapas no reales (87,5 %, mapa 05 §3), y `motor.md` §10 sigue vivo: «perfiles generados que nunca se han validado contra nada». Este principio no arregla eso (E12 carga dato real, sección 17); arregla que el jugador no pueda saber cuál es cuál.

### 2.7 Puro y determinista, con un subflujo nominal por decisión

Todo azar sale de `routeRng` (FNV-1a + mulberry32, `profileGen.ts` l. 15-44), que se conserva, y cada decisión tira de su propio flujo, como `stage/rng.ts` l. 26-29 (`stageRng(seed)(subflow)`). La lista es cerrada (sección 8): `arch|raceId` y `firma|raceId` (identidad, sin `season`); `ed|raceId|season` (edición); `mot|raceId|i|season|slot|j|i{intento}` (instanciación); `pos|raceId|i|season|i{intento}` (colocación); `dib|raceId|i|season|slot|i{intento}` (dibujo). Las etapas de edición real usan `raceId|e{i}|{from}|{to}|{km}` en lugar de `raceId|i` (decisión 22), para que dos carreras con la misma salida, meta y km ya no dibujen lo mismo. Ni `Math.random` ni `Date.now`: `grep -rn 'Math.random' packages/engine/src/routes` devuelve 0 líneas hoy y sigue devolviendo 0 (regla del plan, sección 15). `generate.test.ts` sella que la misma `StageRequest` produce el mismo `GeneratedStage` bit a bit y que cambiar `season` no mueve `arch.skeleton`.

```ts
// packages/engine/src/routes/grammar/generate.test.ts
it('la misma petición produce el mismo perfil, y la temporada no mueve la identidad', () => {
  const req = peticion('race-jura', { season: 0 }) // helper del test: StageRequest completa desde raceId
  expect(generateStage(req)).toEqual(generateStage(req)) // bit a bit, sin tolerancia
  const t3 = generateStage({ ...req, season: 3 })
  expect(t3.arch.skeleton).toBe(generateStage(req).arch.skeleton)
  expect(t3.arch.motivos.filter((m) => m.firma)).toEqual(
    generateStage(req).arch.motivos.filter((m) => m.firma),
  )
})
```

La razón de tanto nombre está escrita en el propio generador: «una tirada más de `routeRng` por reina, así que todos los perfiles de montaña del calendario cambian» (`profileGen.ts` l. 316-317, la lección de la v64), y un kilómetro de diferencia redibuja el detalle entero porque `rolling` recalcula `n` con la misma corriente (mapa 01 §4). Con subflujos por decisión, añadir una tirada al esqueleto no redibuja el relleno y cambiar la amplitud del relleno no mueve un puerto.

### 2.8 El motor no cambia y los vetos solo leen `routes/`

El contrato es `Segment { km, tipo, tramos?, estrellas? }`, `Ramp { km, g }` y `Banner { km, tipo, cat? }` de `stage/types.ts` l. 12-48, intactos; `sample.ts`, `physics.ts` y `simulate.ts` no se tocan. La gramática produce lo que el motor sabe leer y nada más: nunca emite `rompepiernas` (`sample.ts` l. 100-101 lo colapsa a g 1,5 e ignora los tramos), `tendida` y `expuesto` se tipan `llano` con tramos, el `muro` adoquinado sigue siendo `puerto` y el `sector` de tierra es `paves` de 2 a 3 estrellas (sección 4). Lo que el motor no lee no se finge: `viento` y `altitud` de `GeoSignature` viajan en `arch.metadatos` y en la ficha con texto que no promete («llano abierto», nunca «abanicos»), porque el abanico sigue saliendo de `rng('viento')` sobre cualquier km de `llano` (mapa 03 §5.1, decisión 17).

La segunda mitad la impuso el juez del motor (riesgo 3) y es la que ninguna propuesta tenía entera: un veto que llame por intento a `finishType(deriveFinishTerrain(sampleProfile(…)))` o a `costBase` hace que una recalibración de `STAGE.finish*` o de `physics.ts` redibuje perfiles generados sin que `routes/` haya cambiado, y el repositorio ya vivió el acoplamiento contrario. Por eso:

```ts
// packages/engine/src/routes/grammar/veto.ts
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
): Veto | null
// Solo lee routes/ (stageKindOf, finalKindOf, climbSize, dPlusDe) y la geometría del esqueleto.
// NUNCA sampleProfile, finishType ni costBase: eso se mide en sim/routeCensus.ts (V16) y en motifs.test.ts.
```

`grammar/veto.ts` no importa nada de `packages/engine/src/stage/` salvo los tipos, y `veto.test.ts` lo demuestra con un perfil que dispara y otro que no por cada veto sin instanciar el muestreador:

````ts
// packages/engine/src/routes/grammar/veto.test.ts
it('verify no toca el motor: sampleProfile no se llama en ningún intento', async () => {
  const sample = await import('../../stage/sample.js')
  const spy = vi.spyOn(sample, 'sampleProfile')
  for (const seed of semillas(300)) generateStage(peticion('race-jura', { season: seed }))
  expect(spy).not.toHaveBeenCalled()
})
``` `finishType` se mide en `routeCensus` con `groupSize` 50, ahí y solo ahí (V16, sección 9 y sección 13), y si una banda de final falla se ajustan rangos de `ARCH.meta`, no se reintenta. Consecuencia útil: recalibrar `finish.ts` no cambia una sola huella de recorrido.

### 2.9 Medir antes de bandear, y «mejor y no solo distinto»

Ninguna banda nueva nace en rojo (regla 4 de mapa 04 §5.3): primero se mide con el generador de hoy (paso 0, `routeCensus` contra `SEASON_CALENDAR` con las bandas que fallan en `it.todo` y tabla en `balance.md` «v61 §0»), después se escribe la banda con la columna «hoy (medido)» al lado (`ROUTE_CENSUS_TARGETS`, sección 13). Lo geométrico va a `test:rapido`: `routeCensus` cuesta 0,57 s sobre las 1.418 etapas (juez del motor §1, `coste-motor.mjs`) y corre en cada push; lo simulado va a `test:bancos` y se compara pareado, con `engineVersion` fijo en la semilla y 12 semillas, viejo contra nuevo (decisión 30). «Mejor» tiene cuatro condiciones necesarias: realismo rojo→verde sin ningún verde→rojo; variedad en verde; las canónicas sin moverse un dígito; simulación en la dirección pre-registrada en `balance.md` antes de correr, o explicación medida sin ajustar la banda. Las listas cerradas se leen dos veces, por nombre y por forma. La tabla pareada es la condición para borrar `sim/legacy/profileGenLegacy.ts` (decisión 29), y la remedición tiene dueño, orden por coste creciente, 4 h de máquina, 2 sesiones y techo de 8 h (decisión 34); un resultado que contradiga la previsión se anota como «previsión fallida» y no mueve la banda hasta decisión del dueño.

Hoy lo contrario es la norma: el mapa 04 §3.3 cuenta seis repeticiones del mismo patrón, un banco canónico en verde certificando algo falso, con `reina-150` como caso mayor (fuga del 27 al 30 % sobre un perfil que no es una reina, contra 3,3 % en las reales y el 18,1 % que el dueño aceptó con «está bien así»; sección 1). Por eso V8b (≥ 25 % de la subida a más de 30 km de meta) es veto y no banda, y el test se llama «`reina-150` expresada como esqueleto no pasa `verify`» (sección 9).

### 2.10 El dueño ve antes de aceptar

La tabla geográfica es juicio: dato son solo las 20 filas `terrain: 'cobbles'`, las ciudades de `raceRoutes.ts` y las 177 etapas reales (decisión 16), y la validación externa es imposible (PCS y Overpass vetados, `fuentes-recorridos.md`). Ninguna propuesta daba un instrumento para que el dueño viera lo que iba a aceptar (riesgo 2 de cobertura). El diseño lo da: `scripts/galeria-recorridos.mjs` genera `docs/galeria-recorridos/`, una página por zona con 5 perfiles por (zona × esqueleto compatible) rendidos con `renderAltimetrySvg`, más los 4 nacionales de cada uno de los 133 países, con la frase de arquitectura, `kind`, `finalKind`, D+ y el `finishType` del censo debajo de cada uno (sección 16). Se genera en el paso 4 y se entrega ANTES del paso 8; el dueño la lee con tres preguntas por perfil (¿existe en ese sitio?, ¿existe en esa clase?, ¿la reconocería un aficionado?) y cada respuesta negativa se corrige editando `ZONAS`, `RACE_REGION` o `ARCH.pesoPorClase`, que son datos, nunca código. La misma frase de arquitectura que el dueño ve en la galería es la que ve el jugador en la ficha (D10, sección 18): lo que se enseña es lo que se generó.

### 2.11 Los diez principios en una tabla

| # | Principio | Lo viola hoy (sección 1) | Lo hace cumplir | Test que lo sella |
| --- | --- | --- | --- | --- |
| 1 | La arquitectura se sortea, el detalle se rellena | número de dificultades por umbral de km, orden fijo por molde, dos sorteos de forma en todo el generador (mapa 01 §4) | `SKELETONS` (32), `arch|raceId`, `mot`/`pos`/`dib` separados (secciones 5 y 8) | `skeletons.test.ts`: ninguno a 0 ni > 60 % por clase y zona |
| 2 | Cada motivo es un tipo con rangos en `ARCH` | literales en `profileGen.ts` l. 247, 362, 477; cuatro claves de `ROUTE` en uso (mapa 01 §3) | `Motif`, `validateMotif`, bloque `ARCH` (secciones 3, 4, 12) | `motifs.test.ts`: 300 semillas por motivo dentro de rango |
| 3 | La geografía restringe; `null` es «no existe» | país calculado en l. 889 y no pasado; nacionales por hash (mapa 02 §6) | `GeoSignature`, `admite`/`degradar`, `RACE_REGION`, V1 a V4 (sección 6) | `geo.test.ts`, `regions.test.ts` (0 equipos al país), `tour.test.ts` (0 reinas sin cordillera) |
| 4 | Lo que se declara se garantiza | 14 % de `mountainClassicSegments` en `media`; 72 discrepancias y el 49 sellado | `Skeleton.kind/finalKind`, V6, V7, reintento, `canonico`, `fallbackMaxShare` (sección 9) | `skeletons.test.ts` por esqueleto × 5 km × 60 semillas; `calendario.test.ts` degradados = 0 |
| 5 | Identidad por carrera, edición por temporada | `SEASON_CALENDAR` constante; la base pide el mismo perfil cada año | `calendarForSeason`, `BASE_SEASON` 0 con dados, lista cerrada de edición (sección 10) | `edition.test.ts`: `stagesForSeason(id, 0) === SEASON_CALENDAR`; `kind`, `timeTrial`, `n` invariables |
| 6 | Lo real manda y se distingue | `RouteSource` de dos valores, `'generado'` a mano (`raceRoutes.ts` l. 29, 49-52) | prioridad intacta, huella FNV, `routeSource` de tres valores hasta la web (sección 11) | `realFingerprint.test.ts` (177 + 3) antes y después |
| 7 | Puro y determinista con subflujos nominales | una corriente por etapa: una tirada más mueve todo (`profileGen.ts` l. 316-317) | lista cerrada de subflujos, reintento solo en `mot`/`pos`/`dib` (sección 8) | `generate.test.ts`: misma petición, mismo perfil; grep `Math.random` = 0 |
| 8 | El motor no cambia; vetos solo de `routes/` | propuestas con `finishType` por intento (juez motor, riesgo 3) | `verify` sin `stage/`, V16 en `routeCensus`, metadatos de viento y altitud (secciones 9 y 13) | `veto.test.ts` sin instanciar `sampleProfile`; huellas del motor intactas |
| 9 | Medir antes de bandear; mejor y no solo distinto | seis repeticiones del patrón `reina-150` (mapa 04 §3.3) | paso 0, `ROUTE_CENSUS_TARGETS` con «hoy», protocolo pareado, tabla como condición (sección 13) | `routeCensus.test.ts` en `test:rapido` (0,57 s) |
| 10 | El dueño ve antes de aceptar | ningún instrumento; tabla geográfica sin validación posible | galería en el paso 4, correcciones como dato, frase en la ficha (sección 16) | entrega de `docs/galeria-recorridos/` antes del paso 8 (no es un test: es una condición del plan) |
````
