## 15. El plan de implementación por pasos, tests primero

Doce pasos, del 0 al 11. Los pasos 1 a 7 añaden módulos bajo `packages/engine/src/routes/grammar/` sin un solo llamador en producción, así que no cambian el calendario que el juego corre; el paso 8 los conecta y es el único que sube `ENGINE_VERSION`; el 9 remide los bancos; el 10 lleva el origen y la temporada hasta la base y la pantalla; el 11 cierra la documentación. El orden está pensado para que cada paso sea entregable y reversible por sí solo, y para que la remedición del paso 9 separe «forma nueva» de «fontanería nueva» (por eso existe el paso 1) y «forma nueva» de «geografía nueva» (por eso la galería del paso 4 se entrega antes de conectar nada).

### 15.1 Reglas comunes a todos los pasos

1. **Tests primero.** Cada paso empieza escribiendo el fichero de test con las aserciones que abajo se listan, y se cierra con `pnpm typecheck && pnpm test` en verde (`Claude.md` § Tests, vía mapa 06 §0). Lo que hoy no puede pasar se escribe igual y se marca `it.todo` con la cifra medida en el nombre; encenderlo es un cambio de una línea y deja rastro en el diff.
2. **Un solo salto de `ENGINE_VERSION`**, en el paso 8: 69 → 70 (`constants.ts` l. 718, `index.test.ts` l. 381), o el siguiente número libre si al empezar producción ya ha pasado de 69. Los pasos 1 a 7 no cambian un byte de `SEASON_CALENDAR` y lo demuestra `routes/golden.test.ts` (paso 1); un paso que lo rompa antes del 8 está mal hecho y se para. Es la regla de `Claude.md` § Código («todo cambio de comportamiento del motor incrementa `engine_version`») aplicada al revés: sin cambio de conducta, sin salto.
3. **Presupuesto de reloj ≥ 4× lo que cuesta en CI** para todo test que simule (`invariants.test.ts` l. 297-298, `coherence.test.ts` l. 100-104, mapa 06 §0). Los tests de la gramática son de geometría y no simulan; el único que muestrea perfiles es `motifs.test.ts` (paso 3) y se le pone reloj propio.
4. **Los bancos corren en cada push que toque `packages/engine/`** (`ci.yml` l. 112, mapa 06 §0). Como los pasos 1 a 7 no cambian perfiles, los bancos siguen en verde sin remedir; el paso 8 los pone en rojo a propósito y el 9 los re-sella. Ningún paso intermedio remide nada.
5. **`backfillRaceRoutes` antes del paso 8** en cualquier mundo vivo (`db/raceRoutes.ts` l. 86-91: «se corre con el generador ACTUAL a propósito»; decisión 45). El mundo se reinicia antes del lanzamiento, así que en la práctica es una línea en `docs/ops.md`; pero si un mundo de pruebas sobrevive, se corre.
6. **Nada de `Math.random` ni `Date.now`** (`Claude.md` § Código). Todo dado sale de `routeRng(seed)(subflujo)` con los subflujos nominales cerrados de la sección 8; un subflujo nuevo se declara en la lista de `edition.ts` antes de usarse.
7. **Una nota de `docs/balance.md`**: «v61 · El generador es una gramática», con §0 (línea base, paso 0), §1 (el cambio, paso 8), §2 (remedición, paso 9) y §3 (base y pantalla, paso 10). Hoy la última nota es la v60 (su última subsección es «v60 §18»); si al implementar ya existe una v61, toma el siguiente número libre y el documento lo dice así.
8. **Toda constante nueva va en `ARCH` con su comentario de intención** (sección 12) y todo literal que se retire de `profileGen.ts` se cita con su valor de hoy en la nota de balance. Los literales de los ocho generadores viejos no se mueven a `ARCH` en ningún paso intermedio (los valores de `ARCH` son los nuevos y el golden exige los viejos): se van con el fichero en el paso 8.
9. **Un paso, un PR.** Los pasos 2 y 3, 6 y 7, y 9 y 10 pueden ir en paralelo porque no comparten ficheros (§15.14); ninguno se junta con el 8.

La tabla resume el plan; cada paso se detalla después.

| Paso | Qué                                       | Ficheros nuevos o tocados                                                                                                                                                                | ¿Cambia `SEASON_CALENDAR`? | Versión | Sesiones                               | Riesgo                             |
| ---- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------- | -------------------------------------- | ---------------------------------- |
| 0    | Línea base y medida                       | `sim/routeCensus.ts`, `sim/routeCensus.test.ts`, `grammar/calendario.test.ts` (con `it.todo`), `scripts/medir-real.mjs`, `scripts/medir-arranque.mjs`                                    | no                         | no      | 1                                      | ninguno                            |
| 1    | Congelar y extraer primitivas             | `routes/golden.test.ts`, `routes/realFingerprint.test.ts`, `profileGen.ts` (primitivas), `grammar/motifs.ts` y `grammar/skeletons.ts` (solo tipos), `grammar/legacy.ts`                  | no (byte a byte)           | no      | 2                                      | bajo                               |
| 2    | Geografía                                 | `grammar/geo.ts`, `grammar/regions.ts`, sus tests                                                                                                                                        | no                         | no      | 2 + 1 de contenido                     | medio (dato opinable)              |
| 3    | Motivos                                   | `grammar/motifs.ts` (catálogo y `renderMotif`), `constants.ts::ARCH.motivo/meta`, `motifs.test.ts`                                                                                       | no                         | no      | 2                                      | medio (muro en meta)               |
| 4    | Esqueletos, colocación, rendido y galería | `grammar/skeletons.ts`, `grammar/place.ts`, `grammar/render.ts`, `grammar/geometry.ts`, `scripts/galeria-recorridos.mjs`, tests                                                          | no                         | no      | 3                                      | medio                              |
| 5    | Vetos y `generateStage`                   | `grammar/veto.ts`, `grammar/generate.ts`, tests                                                                                                                                          | no                         | no      | 2                                      | bajo                               |
| 6    | Identidad y temporada                     | `grammar/edition.ts`, `edition.test.ts`                                                                                                                                                  | no                         | no      | 1                                      | bajo                               |
| 7    | Composición                               | `grammar/tour.ts`, `tour.test.ts`                                                                                                                                                        | no                         | no      | 2                                      | medio-bajo                         |
| 8    | El cambio de calendario                   | `routes/calendar.ts`, `stageKind.ts`, `constants.ts`, `apps/api/src/stageHistory.ts`, `sim/legacy/profileGenLegacy.ts`, tests re-sellados                                                | **sí**                     | 69 → 70 | 2                                      | alto (única tanda que rompe tests) |
| 9    | Remedición de bancos                      | `sim/frozenSkeletons.ts`, `sim/targets.ts`, `sim/scenarios.ts`, bancos                                                                                                                   | no (ya cambió)             | no      | 2 humanas + 4 h de máquina (techo 8 h) | medio (coste)                      |
| 10   | Base, API y web                           | migración `00NN_race_routes_kind.sql`, `db/raceRoutes.ts`, `calendarRun.ts`, `callups.ts`, `raceContext.ts`, `apps/api/src/routes/calendar.ts`, web, `scripts/inventario-recorridos.mjs` | no                         | no      | 2                                      | bajo                               |
| 11   | Documentación                             | `docs/generador.md`, `docs/balance.md`, `docs/motor.md`, `SPEC.md`, `stageKind.ts` l. 44-58, `calendar.ts` l. 2                                                                          | no                         | no      | 1                                      | ninguno                            |

### 15.2 Paso 0 · Línea base y medida (sin cambio de conducta, sin versión)

Es el paso que hace posible el protocolo «mejor y no solo distinto» de la sección 13: sin una foto del calendario de hoy no hay dirección pre-registrada ni tabla pareada.

**Tests primero.**

- `sim/routeCensus.test.ts` (unidad del censo, corre con `test:bancos` porque `test:rapido` excluye `packages/engine/src/sim/**`, `package.json` l. 20): un perfil literal de 3 segmentos (`llano` 100 km, `puerto` 12 km al 7 % con pancarta `cima`, `llano` 8 km) da `nPuertos 1`, `longestClimbKm 12`, `lastClimbKm 12`, `kmAfterLastClimb 8`, `finalKind 'valle_corto'`, `dPlus 840`; un perfil sin puertos da `lastClimbKm null` y no 0 (misma regla que `finalKind.test.ts` l. 61-70); `aggregate` por `kind` sobre tres filas devuelve recuentos y cuantiles correctos; `routeCensus()` sobre las 1.418 etapas de hoy termina por debajo de 2 s (medido 0,57 s por el juez del motor §1 con `coste-motor.mjs`: es la única llamada a `sampleProfile` que el diseño admite, y va aquí).
- `routes/grammar/calendario.test.ts` (corre en `test:rapido`): TODAS las bandas de `ROUTE_CENSUS_TARGETS` de la sección 13 escritas ya; las que hoy pasan, verdes (km de edición exactos, ningún segmento < 0,5 km salvo los 3 de 1.500 documentados, `kind` declarado coincide con `stageKindOf` en 1.346 de 1.418); las que hoy fallan, `it.todo` con la cifra medida en el nombre: `it.todo('finales muro ≥ 1 % (hoy 0 de 1.075)')`, `it.todo('subida fuera de 30 km: ninguna reina en 0 % (hoy N)')`, `it.todo('última cota de un día ≤ 4,2 km a [3; 17] en el 98 % (hoy N %)')`, `it.todo('p90 de km en .2 ≤ 170 (hoy 195)')`, `it.todo('ud_adoquin con [15; 30] sectores (hoy 3)')`, `it.todo('esqueletos distintos por clase (hoy 7 formas)')`. El N de cada nombre lo rellena el implementador con la salida del censo, no con la previsión de este documento.

```ts
// routes/grammar/calendario.test.ts (forma en el paso 0; en el paso 8 todos los `it.todo` pasan a `it`)
const filas = routeCensus() // SEASON_CALENDAR, 1.418 filas
const enLinea = filas.filter((r) => r.routeSource !== 'real' && !r.timeTrial)
it('los km de las etapas de edición cuadran al redondeo (verde hoy)', () => {
  for (const [id, ed] of Object.entries(RACE_EDITIONS))
    filas
      .filter((r) => r.raceId === id)
      .forEach((r) => expect(Math.round(r.km)).toBe(ed.stages[r.stageIndex - 1].km))
})
it.todo('finales muro ≥ 1 % de las etapas en línea generadas (hoy 0 de 1.075)')
it.todo('reinas con 0 % de subida a más de 30 km de meta: ninguna (hoy N de 157)')
it.todo('p90 de km en carreras .2 ≤ 170 (hoy 195)')
```

La regla de nombres: cada `it.todo` lleva la banda y la cifra de hoy entre paréntesis, de modo que el diff del paso 8 enseñe qué se encendió y desde dónde.

**Código.** `sim/routeCensus.ts` con la interfaz de la sección 3 (`RouteStats`, `routeCensus`, `aggregate`, `ROUTE_CENSUS_TARGETS`); `routes/grammar/geometry.ts` con `dPlusDe` (integración de tramos con g > 0) y `profileCorrelation` (correlación de los vectores g por km), que el censo necesita ya; `scripts/medir-real.mjs` movido desde `scratchpad/e1/medir-real.mjs` sin cambiar su salida (p10/p50/p90 de las 177 etapas reales por rasgo, `propuestas/datos.md` §1.4); `scripts/medir-arranque.mjs`, que mide en un proceso nuevo la carga de `packages/engine/dist/routes/calendar.js` y, cuando exista, `calendarForSeason(1)`.

**Entregable.** Tabla «v61 §0 · línea base del generador» en `docs/balance.md`: cada banda de realismo y variedad con su valor de hoy y su estado (verde / rojo), la tabla de `medir-real.mjs`, y la medida de arranque: la referencia del juez del motor §1 es 578 ms la carga, 46.354 segmentos (32,7 por etapa) y 0,40 ms por etapa una pasada de `sampleProfile` más lecturas; el implementador sustituye estas cifras por las suyas, en su máquina, con tres corridas y la mediana. Y la dirección pre-registrada de cada banda de simulación (decisión 30), escrita ANTES de tocar código.

**Qué cambia de conducta.** Nada. **Coste.** 1 sesión. **Riesgo.** Ninguno.

### 15.3 Paso 1 · Congelar lo de hoy y extraer primitivas (sin cambio de conducta, sin versión)

**Tests primero.**

- `routes/golden.test.ts`: una huella FNV-1a de 32 bits de `JSON.stringify(stage.profile)` por cada una de las 1.418 etapas de `SEASON_CALENDAR`, sellada en un fichero `golden.json` al lado del test y exigida igual. Se escribe y se sella ANTES de tocar `profileGen.ts`. Vive hasta el paso 8.
- `routes/realFingerprint.test.ts`: la misma huella para las 177 etapas con rasgos (`STAGE_FEATURES`) y para las 3 grandes vueltas enteras (`race-france`, `race-italy`, `race-spain`: 63 etapas, de las que 62 reales y la e21 de Francia generada, mapa 06 §1), sellada en `realFingerprint.json`. Este test SOBREVIVE al paso 8 y a todo lo que venga: es la garantía de que lo real no se toca (decisión 28). La e21 de Francia se sella aparte, con su propia clave, porque es la única de las 63 que el paso 8 cambia a propósito, y el test lo dice en el nombre.

```ts
// routes/realFingerprint.test.ts (forma)
function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}
it('las 177 etapas con rasgos y las 3 grandes vueltas no cambian ni un byte', () => {
  for (const [clave, huella] of Object.entries(sellado)) {
    const stage = etapaPorClave(clave) // `${raceId}|${index}`
    expect(fnv1a(JSON.stringify(stage.profile)), clave).toBe(huella)
  }
})
it.todo('race-france e21 (llana generada) cambia en el paso 8 y se re-sella con la causa')
```

```ts
// routes/golden.test.ts (se borra en el paso 8; sus huellas pasan a sim/legacy/golden.test.ts)
import sellado from './golden.json' // { "race-x|1": 3735928559, ... } 1.418 entradas
it('las 1.418 etapas de SEASON_CALENDAR no cambian ni un byte hasta el paso 8', () => {
  let n = 0
  for (const race of SEASON_CALENDAR)
    for (const st of race.stages) {
      expect(fnv1a(JSON.stringify(st.profile)), `${race.id}|${st.index}`).toBe(
        sellado[`${race.id}|${st.index}`],
      )
      n++
    }
  expect(n).toBe(1418)
})
```

- `grammar/legacy.test.ts`: los ocho builders legado producen, para 60 semillas × `KM_ROAD = [130, 155, 175, 195, 215]` (los mismos de `stageKind.test.ts` l. 28), una lista de motivos con el MISMO número y orden de dificultades (`puerto`, `paves`) que los segmentos de la función vieja correspondiente, en 300 de 300 por builder. Es el test de I-42: prueba que la gramática puede expresar las formas de hoy antes de sustituirlas.
- `stageKind.test.ts` sin tocar sigue verde (los ocho `xxxSegments` se conservan hasta el paso 8).

**Código.**

- `profileGen.ts` exporta `hashInt`, `routeRng`, `between`, `split`, `climb(rand, len, avg, { gMax })`, `descent`, `rolling(rand, km, amp, pRompepiernas = 0)`; `gMax` por defecto `Infinity` y `amp` y `pRompepiernas` por defecto con los valores de hoy (1,8 / 3,2 y 0 / 0,35, `arquitectura.md` §12 paso 1) en las llamadas de los ocho generadores viejos, de modo que el golden no se mueve. Los ocho `xxxSegments`, `normalize` y `garantizaPuerto` siguen en el fichero, con sus literales, hasta el paso 8.
- `grammar/motifs.ts` y `grammar/skeletons.ts` solo con los TIPOS de la sección 3 (`MotifKind`, `MetaKind`, `Motif`, `Slot`, `Skeleton`, `SkeletonId`); sin catálogo ni lógica.
- `grammar/legacy.ts`: los ocho builders legado (`lg_flat`, `lg_hilly`, `lg_hilly_uphill`, `lg_mountain`, `lg_mountain_classic`, `lg_classic`, `lg_cobbles`, `lg_itt`, con `ittSegments === flatSegments` como hoy, mapa 01 §2.1) escritos como `Skeleton` con los rangos de hoy (mapa 01 §8) y una función `legacyMotivos(id, km, seed): Motif[]` que replica la decisión de cardinalidad por umbral de km y el orden fijo de cada generador viejo. Se borra en el paso 8.

**Qué cambia de conducta.** Nada; el golden lo demuestra byte a byte. **Qué se re-sella.** Nada. **Coste.** 2 sesiones. **Riesgo.** Bajo. La tabla pareada «igual dentro del ruido» de los legado contra los viejos se completa en el paso 4, cuando exista `renderSkeleton` (§15.6).

### 15.4 Paso 2 · Geografía (sin llamadores)

**Tests primero.** `grammar/geo.test.ts` y `grammar/regions.test.ts`, todos de consistencia interna porque la tabla es juicio (decisión 16):

| Aserción                                                                                                                                                                                                                                                                   | Sobre                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Las 29 claves de `GeoZone` tienen fila en `ZONAS`; en toda fila `min ≤ max` en todo rango                                                                                                                                                                                  | `ZONAS`                 |
| `puerto.km[0] ≥ 9` (o `puerto === null`); `cota.km[1] ≤ 8` (o `null`); `muro.km[1] ≤ 3` (o `null`); `adoquin ≥ 2` ⇒ `muro` no es `null` y `muro.adoquin` puede ser `true`; `amplitud ≤ ARCH.motivo.enlace.ampMax` (2,4); `relieve ∈ {montana, alta}` ⇒ `puerto !== null`   | `ZONAS`                 |
| `TERRITORIOS` tiene las 56 claves de países con carreras de equipos (lista literal en el test, sacada de `RACE_COUNTRY` y de las filas) sin `fallback`; los 77 restantes de `COUNTRIES` resuelven con `fallback: true` y el test imprime la lista de los 77                | `TERRITORIOS`           |
| `cordillera`, si no es `null`, está en `ruta` y `ZONAS[cordillera].relieve ∈ {montana, alta}`; `cordillera === null` exactamente en la lista literal de la decisión 13 (BE, NL, DK, AE, AU y los que la sección 6 cierre)                                                  | `TERRITORIOS`           |
| Las 20 filas `terrain: 'cobbles'` del calendario (mapa 07 §3) caen, vía `regionOf`, en una zona con `adoquin ≥ 2`                                                                                                                                                          | `RACE_REGION` + `ZONAS` |
| `RACE_REGION` tiene entrada para las 310 carreras de equipos (`SEASON_CALENDAR` sin los 532 `.NC`) y `stages` para las 60 carreras de `RACE_EDITIONS`; ninguna carrera de equipos cae a `zonaDe(country)` (el test intercepta `zonaDe` y cuenta 0 llamadas fuera de `.NC`) | `RACE_REGION`           |
| Los 20 ejemplos obligados de la sección 6 (`race-liege` → `ardenas`, `race-lombardy` → `italia_norte`, `race-france` e6 → `pirineos`...) como aserciones literales                                                                                                         | `RACE_REGION`           |

**Código.** `grammar/geo.ts` (`ZONAS`, `TERRITORIOS`, `zonaDe`, `admite`, `degradar`) y `grammar/regions.ts` (`RACE_REGION`, `regionOf`) con el contenido de la sección 6. La curación de `RACE_REGION` es una tarde de contenido con `raceRoutes.ts` abierto, y cuenta como sesión aparte.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones más 1 de contenido. **Riesgo.** Medio, y es de dato, no de código: una zona mal puesta produce carreras plausibles en el sitio equivocado. Lo mitiga la galería del paso 4 y la corrección como dato (sección 16).

### 15.5 Paso 3 · Motivos (sin llamadores)

**Tests primero.** `grammar/motifs.test.ts`, con reloj propio de 120 s porque es el único test de la gramática que llama a `sampleProfile`:

- Por cada uno de los 12 `MotifKind` y cada uno de los 9 `MetaKind`, 300 instancias con `routeRng('motifs-test-' + i)`: parámetros dentro del rango de `ARCH.motivo.*` / `ARCH.meta.*`; `validateMotif` acepta; `renderMotif` devuelve `Segment[]` con `Σ km` igual al `km` del motivo al 0,1 y, en todo `puerto`, `segment.km === Σ tramos.km` al 0,01 (guarda de I-8); ningún tramo con g > 20 ni < −14; nunca sale `rompepiernas` (decisión 2).
- `tendida` y `expuesto` se rinden `llano` con tramos (el motor no los cuenta en `kmSubida`, mapa 03 §4.1).
- `muro` adoquinado se rinde `puerto` con `pave: true` en sus tramos; `sector` con `firme: 'tierra'` se rinde `paves` de 2 o 3 estrellas.
- `circuito` con `vueltas: 9` rinde 9 veces el MISMO `Segment[]` de la vuelta (igualdad profunda), con la semilla de detalle `dib|…|hijo{h}` compartida.
- **El test de la ejecutabilidad, riesgo 7**: `muro_meta` con `km ≤ 1,0` y sus 2 km de aproximación a amplitud ≤ 2,5, rendido, muestreado con `sampleProfile` y leído con `finishType(deriveFinishTerrain(...), 50)`, da `'muro'` en 300 de 300; con `km ∈ (1,0; 2,2]` da `'puncheur'` en 300 de 300; `repecho` → `'puncheur'`; `alto_corto` y `alto_largo` → `'alto'`; `sector_meta` → `'pave'`. Si el 300 de 300 falla, se ajusta `ARCH.meta.muro.aproxKm` (2 → 3) antes que cualquier otra cosa, y se anota; el diseño lo prevé porque `deriveFinishTerrain` (`finish.ts` l. 94-123) funde rachas con `finishClimbGapBlocks` 5 y comprueba `alto` antes que `muro` (l. 165-189, juez del motor §1).

```ts
it('un muro de meta de hasta 1,0 km lo lee el motor como muro en 300 de 300', () => {
  let muros = 0
  for (let i = 0; i < 300; i++) {
    const rand = routeRng(`muro-${i}`)('mot')
    const m = instanciaMeta('muro_meta', rand, { kmMax: 1.0 })
    const profile = {
      segments: [
        ...aproximacion(rand, ARCH.meta.muro.aproxKm, ARCH.meta.muro.aproxAmp),
        ...renderMotif(m, rand),
      ],
    }
    if (finishType(deriveFinishTerrain(sampleProfile(profile)), 50) === 'muro') muros++
  }
  expect(muros).toBe(300)
})
```

**Código.** `grammar/motifs.ts` completo (`validateMotif`, `renderMotif`, instanciación por rangos de `ARCH`); `constants.ts` gana `ARCH.motivo` y `ARCH.meta` con los valores de la sección 12. Recalibración de `ARCH.reina.rellenoDplusPorKm` (5,5 m/km de partida): se rinden 1.000 `enlace` con la `amplitud` de cada zona, se mide `dPlusDe` por km, y el valor que queda es la mediana redondeada al 0,5; se anota en el comentario de la constante con la cifra medida.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones. **Riesgo.** Medio: el muro en meta exige precisión de bloque de 100 m y nadie lo ha probado contra el motor; por eso el test va antes que el catálogo de esqueletos, y su fallo tiene ya una respuesta escrita.

### 15.6 Paso 4 · Esqueletos, colocación, rendido y la galería (sin llamadores)

Es el paso más largo de código y el primero que el dueño ve.

**Tests primero.**

- `grammar/skeletons.test.ts`: catálogo bien formado (32 `SkeletonId`, 15 de un día y 17 de etapa; ventanas ordenadas y dentro de [0; 1]; el slot `meta` es el último y único; `requiere` solo cita claves de `GeoSignature`; `dPlus[0] ≤ dPlus[1]`; `km` dentro de `ARCH.km.maxPorClase` para alguna clase; `pesoBase > 0` salvo `ud_criterium`, que es 0 por D5). La plantilla `canonico` de cada esqueleto, rendida, da `stageKindOf(profile, timeTrial).kind === sk.kind` y `finalKindOf(profile) === sk.finalKind` donde lo declara: 32 de 32. Y por cada esqueleto × `KM_ROAD` (5 km) × 60 semillas × sus zonas compatibles (las que `admite`), el PRIMER rendido cumple V6 y V7 en ≥ 70 % de los casos; es la cota que hace alcanzable el `intentos` p95 ≤ 3 del paso 5 (con acierto ≥ 0,7 por intento, la probabilidad de necesitar más de tres es 0,3³ = 2,7 %, por debajo del 5 %). Un esqueleto por debajo del 70 % estrecha sus rangos antes de seguir (`ARCH.veto.intentosP95`).
- `grammar/place.test.ts`: colocación por ventanas sobre 1.000 esqueletos instanciados: ningún motivo empieza fuera de su ventana; dos dificultades consecutivas distan ≥ `ARCH.colocacion.enlaceMinimo` (1,5 km) salvo dentro de `cadena`; la bajada tras un `puerto` mide [0,6; 0,9] × su km; `Σ enlaces ≥ ARCH.colocacion.enlaceMinimoTotal` (12 %) o el intento se declara inviable y no se rinde.
- `grammar/render.test.ts`: `normalizeEnlaces` cuadra `Σ km` al 0,1 tocando solo enlaces y deja el residuo en el más largo; `garantizaClase` mueve el motivo que decide al borde con 0,3 / 0,7 km compensando en el enlace más largo y conserva `segment.km === Σ tramos`; «toda cota de una clásica mide ≤ 2,9 km»; `emitirPancartas` pone `cima` en todo `puerto` ≥ 1,5 km y SIEMPRE en el último `puerto` de la etapa (un `muro_meta` de 0,8 km lleva pancarta y `lastClimbKm` lo ve, decisión 25); un circuito de 9 vueltas con una cota de 2 km lleva 9 pancartas y con un muro de 1,1 km lleva 1 (la de meta).
- `grammar/legacy.test.ts` gana la tabla pareada: los ocho legado rendidos con `renderSkeleton` contra los ocho `xxxSegments`, 300 perfiles por pareja, medidos con `routeCensus`: `nPuertos` idéntico en distribución, y `|Δ p50|` de `dPlus`, `longestClimbKm` y `kmAfterLastClimb` menor que la desviación típica entre semillas de la pareja vieja. Es «igual dentro del ruido» (I-16, I-42): la fontanería nueva reproduce la forma vieja y, por tanto, lo que cambie en el paso 8 será forma y no fontanería.

**Código.** `grammar/skeletons.ts` (las 32 filas de la sección 5 con sus `canonico` y `alternativas`), `grammar/place.ts`, `grammar/render.ts` (`renderSkeleton`, `normalizeEnlaces`, `garantizaClase`, `emitirPancartas`), `grammar/geometry.ts` completo (`describeProfile`, `kmSubidaShare`), `constants.ts::ARCH.colocacion`, `ARCH.pancarta`, `ARCH.reina`, `ARCH.pesoPorClase`; y `scripts/galeria-recorridos.mjs` (sección 16), que genera `docs/galeria-recorridos/` con 5 perfiles por zona × esqueleto compatible y los 4 nacionales de cada uno de los 133 países.

**Entregable al dueño.** La galería, con el criterio de lectura de la decisión 41 (tres preguntas por perfil). Se entrega aquí y no después del paso 8 para que sus correcciones (que son datos: `ZONAS`, `RACE_REGION`, `pesoPorClase`) entren antes de cambiar el calendario. Se regenera en cada paso siguiente.

**Qué cambia de conducta.** Nada. **Coste.** 3 sesiones (las 32 plantillas canónicas se escriben a mano). **Riesgo.** Medio: los reintentos en esqueletos de borde; la respuesta ya decidida es estrechar rangos, nunca subir `maxIntentos` (riesgo 9 de la sección 17).

### 15.7 Paso 5 · Vetos y `generateStage` completa (sin llamadores)

**Tests primero.** `grammar/veto.test.ts` y `grammar/generate.test.ts`:

- Por cada veto de V1 a V10 y V15: un perfil o esqueleto literal que lo dispara y otro que no, con el `detalle` esperado. V11 a V14 y V16 no se prueban aquí (son de calendario o de vuelta: `calendario.test.ts` en el paso 8 y `tour.test.ts` en el 7).
- `verify` es pura de `routes/`: el test comprueba por `import` que `veto.ts` no importa nada de `stage/` (`sampleProfile`, `finishType`, `costBase`), leyendo el fichero fuente con `fs` y buscando la cadena `from '../../stage`; es la decisión 4 sellada como test y no como comentario.
- **El caso v40 con nombre** («una carrera de un día no muere en un puerto de 14 km»): 2.000 `generateStage` de `ud_montana` en `alpes` con `raceClass '1'`: 0 con última cota > 4,2 km, 0 con `finalKindOf === 'alto'`, 100 % con la última cota coronando a [3; 17] km de meta.
- **La lección de `reina-150` como regla**: el escenario canónico `reina-150` (`sim/scenarios.ts`, 135 km llanos y 15 km al 8 %, mapa 06 §3.2) expresado como esqueleto `et_reina_alto_largo` no pasa `verify`: devuelve `{ id: 'V8', detalle: 'subida a más de 30 km de meta: 0 % (< 25 %)' }`.

```ts
it('reina-150 expresada como esqueleto no pasa verify (V8b)', () => {
  const motivos: Motif[] = [
    { kind: 'enlace', km: 135 },
    { kind: 'meta', km: 15, meta: 'alto_largo', cotaFinal: { km: 15, g: 8 } },
  ]
  const profile = renderSkeleton(
    SKELETONS.et_reina_alto_largo,
    motivos,
    routeRng('reina-150')('dib'),
  )
  const veto = verify(profile, SKELETONS.et_reina_alto_largo, peticionReina('alpes'), motivos)
  expect(veto?.id).toBe('V8')
})
```

- `generate.test.ts`: determinismo (`generateStage(req)` dos veces, igualdad profunda); independencia de subflujos (cambiar `season` no cambia `arch.skeleton` ni los motivos con `firma: true`; cambiar `km` no cambia el esqueleto); `intentos` p95 ≤ 3 y `degradado` en ≤ 0,5 % (`ARCH.veto.fallbackMaxShare.testPorEsqueleto`) sobre 300 semillas × cada esqueleto × cada zona compatible, con el registro de qué veto disparó cada reintento impreso al final del test (es lo que dice qué rango estrechar); `fixed.skeleton` se respeta (bancos); `arch.frase` no está vacía y cita el esqueleto y la meta.

**Código.** `grammar/veto.ts` (V1 a V16 como predicados, `verify`), `grammar/generate.ts` (`generateStage` con los siete pasos de la sección 8 y el reintento sobre `mot`, `pos`, `dib`), `constants.ts::ARCH.veto`.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones. **Riesgo.** Bajo: los vetos son predicados y los tests son literales.

### 15.8 Paso 6 · Identidad y temporada (sin llamadores)

**Tests primero.** `grammar/edition.test.ts`:

- `calendarForSeason(s)` es determinista y memoizada: dos llamadas con el mismo `s` devuelven la MISMA referencia; `raceForSeason(id, s)` idem por (id, s).
- Para toda carrera generada del catálogo (`raceForSeason` construye por la ruta nueva aunque `SEASON_CALENDAR` siga siendo la vieja hasta el paso 8), temporadas 1 a 5 contra la 0: mismo `arch.skeleton`, misma `arch.geo`, mismos motivos con `firma: true` y mismos parámetros, mismo `kind`, mismo `timeTrial`, mismo número de etapas (decisión 20); `finalKindOf` igual salvo en `ud_montana` y `et_reina_valle` (cubeta móvil dentro de `{descenso_meta, cima_cerca}` y `{valle, descenso_meta}`, `arquitectura.md` §6.4); km dentro de ± 6 % (`ARCH.edicion.kmJitter`) y exacto en etapas `edicion` (el km es contrato); al menos un motivo no firma distinto en posición o número en 4 de las 5 temporadas; `profileCorrelation` entre ediciones consecutivas en [0,55; 0,9] y entre carreras distintas del mismo esqueleto < 0,6.
- Las etapas `real` son idénticas en toda temporada (huella igual); las `edicion` conservan km y esqueleto y solo cambian el dibujo (`season` entra solo en `dib`).
- Con `ARCH.edicion.activa = false` las cinco temporadas son idénticas a la 0; con `nivel = 2` en un esqueleto con `alternativas`, la temporada `s` usa `alternativas[s % n]`.
- La semilla de edición separada (decisión 22): dos carreras con la misma salida, meta y km en `editions.ts` no dibujan lo mismo (`raceId` entra en `raceId|e{i}|{editionKey}`).
- `it.todo('SEASON_CALENDAR es calendarForSeason(BASE_SEASON) por referencia')`: se enciende en el paso 8.

```ts
// grammar/edition.test.ts (forma del test de identidad)
for (const race of calendarForSeason(0).filter((r) => r.routeSource !== 'real')) {
  const base = race.stages
  let temporadasConDiferencia = 0
  for (let s = 1; s <= 5; s++) {
    const ed = stagesForSeason(race.id, s)
    expect(ed.length).toBe(base.length)
    ed.forEach((st, i) => {
      const b = base[i]
      expect(st.kind).toBe(b.kind)
      expect(st.timeTrial).toBe(b.timeTrial)
      expect(st.arch.skeleton).toBe(b.arch.skeleton)
      expect(st.arch.geo).toBe(b.arch.geo)
      expect(firmaDe(st.arch.motivos)).toEqual(firmaDe(b.arch.motivos)) // motivos con firma: true, con parámetros
      if (st.routeSource === 'edicion')
        expect(profileKm(st.profile)).toBeCloseTo(profileKm(b.profile), 1)
      else
        expect(Math.abs(profileKm(st.profile) / profileKm(b.profile) - 1)).toBeLessThanOrEqual(
          ARCH.edicion.kmJitter,
        )
      const c = profileCorrelation(st.profile, b.profile)
      expect(c).toBeGreaterThanOrEqual(0.55)
      expect(c).toBeLessThanOrEqual(0.9)
    })
    if (ed.some((st, i) => diffMotivos(base[i].arch.motivos, st.arch.motivos).length > 0))
      temporadasConDiferencia++
  }
  expect(temporadasConDiferencia, race.id).toBeGreaterThanOrEqual(4)
}
```

- Coste medido y sellado con holgura: construir las temporadas 1 a 5 cuesta ≤ 5 × `ARCH.arranque.porTemporadaMs` (5 s); el test imprime la cifra.

**Código.** `grammar/edition.ts` (`BASE_SEASON`, `calendarForSeason`, `raceForSeason`, `stagesForSeason`, la lista cerrada de subflujos, `diffMotivos` para `cambiosRespectoAnterior`), `constants.ts::ARCH.edicion`.

**Qué cambia de conducta.** Nada. **Coste.** 1 sesión. **Riesgo.** Bajo, es aditivo.

### 15.9 Paso 7 · Composición (sin llamadores)

**Tests primero.** `grammar/tour.test.ts`:

- Las seis garantías de `calendar.test.ts` l. 184-246 (crono en vuelta de 5, crono siempre en llana de 4+, «cinco llanas no son cinco sprints», nadie sin crono ni final en alto, primera etapa llana o prólogo, última decisiva o paseo) reescritas contra `composeTour` con tres territorios (BE, ES, CO) y 120 semillas; `calendar.test.ts` l. 184-246 NO se toca (sigue probando `stageMix`, que hasta el paso 8 es la vieja).
- Reglas de bloque V13 y V14 sobre 120 semillas × n ∈ [3; 21] × 5 relieves: `vu_corta` ≤ 1 crono; `vu_semana` ≤ 3 finales en alto y ≤ 2 seguidos; `vu_gran_vuelta` de 21 con descansos en [9; 15], reina en [15; 20], ≤ 1 final en alto en la primera semana, ≤ 7 etapas de alta montaña, ≥ 2 llanas entre bloques (`ARCH.bloques.gv`).
- Km por clase: `kmDe` dentro de `ARCH.km.porClase` para cada (clase, papel); ninguna etapa > `ARCH.km.maxPorClase`; una .2 de 5 etapas nunca supera 180 km; `lastStageKmFactor` conservado.
- Itinerario: ventana contigua de `TERRITORIOS[country].ruta`; `reina` solo con meta en `cordillera` o zona `montana`/`alta`; **«una vuelta belga no tiene reina»**: 120 vueltas de n ∈ [4; 8] con `country 'BE'` → 0 papeles `reina_*`, y lo mismo para NL, DK, AE, AU (decisión 13, D8); cuando `terrain: 'mountain'` pide reina y no hay cordillera, el papel se degrada a `media_alto` y `Itinerario` lo anota.

```ts
it('una vuelta belga no tiene reina, y una colombiana con terreno de montaña sí', () => {
  for (let i = 0; i < 120; i++) {
    const n = 4 + (i % 5)
    const be = itinerarioDe(`vu-be-${i}`, 'BE', n, 'mountain', '1', 'stage')
    expect(be.papeles.filter((p) => p.startsWith('reina')).length, `BE ${i}`).toBe(0)
    const co = itinerarioDe(`vu-co-${i}`, 'CO', n, 'mountain', '1', 'stage')
    expect(
      co.papeles.some((p) => p.startsWith('reina')),
      `CO ${i}`,
    ).toBe(true)
    expect(co.metas[co.papeles.findIndex((p) => p.startsWith('reina'))]).toBe(
      TERRITORIOS.CO.cordillera,
    )
  }
})
```

- Prólogo con p 0,25 en etapa 1 de vueltas ≥ 6 y cronoescalada con p 0,08 con `cordillera` (D3), medidos sobre 1.000 vueltas con ± 0,05.
- `n` se conserva siempre (para `raceRoutes.test.ts`, decisión 44).

**Código.** `grammar/tour.ts` (`TOUR_SKELETONS`, `BlockRule` como reparación determinista de atrás hacia delante, `itinerarioDe`, `composeTour`, `kmDe`), `constants.ts::ARCH.pesosComposicion`, `ARCH.bloques`, `ARCH.itinerario`, `ARCH.km`. `stageMix` NO delega todavía: la delegación es del paso 8, porque cualquier tirada añadida a `mixRoles` desplaza las composiciones de las 72 vueltas (juez del motor §1) y eso es cambio de conducta.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones. **Riesgo.** Medio-bajo; las cuatro garantías de `mixRoles` se conservan como reglas y las de bloque se aplican después.

### 15.10 Paso 8 · El cambio de calendario (`ENGINE_VERSION` 69 → 70)

La única tanda que rompe tests sellados, y por eso se hace en un solo PR con los tests ya escritos. Antes de empezar: `backfillRaceRoutes` en cualquier mundo vivo (regla 5) y la galería revisada por el dueño al menos una vez.

**Tests primero (en este orden).**

1. `index.test.ts` l. 381: `expect(ENGINE_VERSION).toBe(70)`.
2. Borrar `routes/golden.test.ts`; sus 1.418 huellas se mueven a `sim/legacy/golden.test.ts`, que exige que `legacyCalendar()` (abajo) las reproduzca: es la prueba de que la copia legado es el generador viejo y no otra cosa. Se borra con el directorio al final del paso 9.
3. `routes/realFingerprint.test.ts` sigue verde para las 177 + 62; la e21 de Francia se re-sella con la causa escrita («llana generada: pasa de `flatSegments` a `et_llana`»).
4. `routes/stageKind.test.ts` reescrito por esqueleto: cada `SkeletonId` × `KM_ROAD` × 60 semillas × sus zonas compatibles → `stageKindOf(profile, timeTrial).kind === sk.kind` y, donde lo declara, `finalKindOf === sk.finalKind`, en el 100 %; `ud_montana` y `et_reina_*` por fin dentro (hoy `mountainClassicSegments` dibuja 51 reinas y nadie lo sella, mapa 06 §6.1); se conserva el caso «un recorrido sin segmentos es una llana» (l. 104-106); el caso «una crono es una crono aunque su perfil sea el de una llana» (l. 32-43) se re-sella como «una crono llana sin `timeTrial` es llana; una cronoescalada sin `timeTrial` es media» (decisión 42); y las dos etiquetas de reina (`Summit finish`, `Mountains`) tienen que aparecer (l. 87-91).
5. `apps/api/src/stageHistory.test.ts` l. 199: `cambian` se re-sella con la cifra nueva y la causa en el comentario, con el objetivo escrito: «solo etapas reales cuya etiqueta declarada difiere del recorrido; generadas = 0», porque `kind` y `label` de toda etapa generada salen de `stageKindOf` (decisión 23, I-44). El test gana la aserción `generadasQueCambian === 0`.
6. `routes/calendar.test.ts`: l. 108-121 (segmentos > 0 y pancartas dentro), l. 162-174 (km de edición exactos al redondeo) y l. 269-277 (`Uphill finish` acaba en `puerto`) en verde sin tocar; l. 184-246 en verde con `stageMix` delegando en `composeTour`; l. 248-258 (dos carreras distintas no componen la misma vuelta) en verde; gana «`kind` de toda etapa generada es `stageKindOf(profile).kind`» y «`routeSource` de toda etapa es uno de los tres valores y las de `STAGE_FEATURES` son `real`».
7. `grammar/calendario.test.ts` entero: todos los `it.todo` del paso 0 encendidos; ninguna banda puede quedar en `todo` (`ARCH.veto.fallbackMaxShare.calendario` es 0; V12 con el 0,85 provisional hasta el paso 9).
8. `grammar/edition.test.ts`: el `it.todo` de la referencia encendido (`expect(SEASON_CALENDAR).toBe(calendarForSeason(BASE_SEASON))`).
9. `routes/arranque.test.ts`: carga del módulo con `SEASON_CALENDAR` ≤ `ARCH.arranque.objetivoMs` 1.500 (aviso) y ≤ `techoMs` 2.500 (fallo); `calendarForSeason(1)` ≤ 1.000 ms; `generateStage` no llama a `sampleProfile` (mismo truco de `import` que en V16). La medida real se toma con `scripts/medir-arranque.mjs` en tres corridas y va a la nota de balance junto a la línea base del paso 0 (578 ms de referencia).
10. `routes/raceRoutes.test.ts`, `recorridoDelMundo.test.ts`, `finalKind.test.ts`, `featureProfile.test.ts`, `classicRoutes.test.ts`, `altimetry.test.ts`, `schedule.test.ts`, `uci.test.ts`: en verde sin tocar (mapa 06 §5).

```ts
// routes/arranque.test.ts
it('cargar el calendario de la temporada 0 cabe en el objetivo y nunca supera el techo', async () => {
  const t0 = performance.now()
  await import('./calendar.js') // primera carga del módulo en este worker
  const ms = performance.now() - t0
  console.log(
    `arranque SEASON_CALENDAR: ${ms.toFixed(0)} ms (objetivo ${ARCH.arranque.objetivoMs}, techo ${ARCH.arranque.techoMs})`,
  )
  if (ms > ARCH.arranque.objetivoMs)
    console.warn('por encima del objetivo: revisar rangos antes que subir maxIntentos')
  expect(ms).toBeLessThanOrEqual(ARCH.arranque.techoMs)
})
it('una temporada adicional cuesta menos de un segundo', () => {
  const t0 = performance.now()
  calendarForSeason(1)
  expect(performance.now() - t0).toBeLessThanOrEqual(ARCH.arranque.porTemporadaMs)
})
it('generateStage no toca el muestreador del motor', () => {
  const fuente = readFileSync(new URL('./grammar/generate.ts', import.meta.url), 'utf8')
  expect(fuente).not.toMatch(/from '\.\.\/\.\.\/stage/)
})
```

El primer test es de máquina y por eso el techo es 2.500 y no 1.500: el objetivo avisa, el techo falla. Si el techo se supera, la decisión ya está tomada (decisión 35): el calendario se construye perezoso por carrera (`calendarForSeason` devuelve las filas y `raceForSeason` genera al primer acceso), y el test se conserva tal cual.

**Código.**

- `routes/calendar.ts`: `buildRace`, `stagesFromEdition` (rama sin rasgos, con esqueleto de etapa según la tabla `EditionTerrain → et_*` de la sección 5) y `nationalChampionships` (`nc_ruta`, `nc_crono` con `zonaDe(code)`) llaman a `generateStage`; `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva firma y delega en `composeTour`; `CalendarStage` gana `routeSource` y `arch`; `CalendarRace` gana `routeSource` agregado (`real` / `mixto` / `generado`); `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)`; `auto()` queda solo para lo real y lo generado lleva las pancartas de `emitirPancartas`; `MixTerrain` y `oneDaySpec` desaparecen; el comentario de l. 2 («28 carreras») se corrige.
- `routes/profileGen.ts` queda con las primitivas; los ocho `xxxSegments`, `normalize` y `garantizaPuerto` se mueven a `sim/legacy/profileGenLegacy.ts` junto con copias de `oneDaySpec`, `stageMix` viejo (`mixRoles`, `mixKm`) y la rama vieja de `buildRace` como `legacyCalendar(): CalendarRace[]`; ese fichero existe solo hasta el final del paso 9 (decisión 29). `grammar/legacy.ts` se borra.
- `routes/stageKind.ts`: `SUMMIT_RUN_IN_KM = 5` exportada; `label` `Summit finish` por `kmAfterLastClimb(profile) <= SUMMIT_RUN_IN_KM`; `kind` no cambia de regla; etiquetas nuevas `Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic` (decisión 38); comentario de umbrales l. 44-58 reescrito con la tabla medida por esqueleto.
- `apps/api/src/stageHistory.ts`: `calendarStageSpec` usa `stageKindOf(...).label` y deja su regla propia (l. 73-88).
- `constants.ts`: `ENGINE_VERSION = 70`; se retiran `ROUTE.queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`, `mixWeights`, `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit`; se conservan `ROUTE.itt*`, `lastDecisiveChance`, `grandTourStages`, `grandTourLastDecisiveFactor`, `lastSummitShare`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor` y todo `RELIEF`. `ARCH.arranque` y `ARCH.anticlon` entran aquí.
- `packages/db/src/raceRoutes.ts`: `RouteSource` pasa a tres valores (columna `text`, `schema.ts` l. 523: sin migración por el tipo) y `freezeRaceRoute` copia `routeSource` del calendario. El resto de la base va en el paso 10.

**Qué cambia de conducta.** Las 1.241 etapas no reales (532 nacionales, 325 de `stageMix`, 226 de edición sin rasgos, 158 de un día: mapa 06 §1) cambian de perfil; las 177 reales no. El reparto de `kind` por clase cambia (Bélgica sin reina, nacionales por circuito): el paso imprime en la nota de balance la tabla `kind × raceClass` antes y después (`routeCensus` con `aggregate`), que es la medida previa que el riesgo 9 de la ejecutabilidad pide para `world.test.ts` y `RACE_DAY_TSS` antes de mover nada.

**Qué se re-sella y por qué.** Los cinco puntos de arriba (1, 3, 4, 5, 6) con la causa escrita en el propio test, como hace `stageHistory.test.ts` l. 185-190. Los bancos (`test:bancos`) se ponen en rojo aquí a propósito y se re-sellan en el paso 9; el PR del paso 8 los deja en rojo con una nota de que el 9 los cierra, y el CI del push los corre igual (regla 4).

**Entregable.** `docs/balance.md` «v61 §1 · El cambio de calendario»: la tabla de `calendario.test.ts` antes (paso 0) y después, las constantes retiradas y añadidas con valor de hoy al lado, la cifra re-sellada de `stageHistory` y la tabla `kind × raceClass`; la galería regenerada.

**Coste.** 2 sesiones. **Riesgo.** Alto por concentración, bajo por sorpresa: todo lo que rompe está listado y los tests están escritos desde los pasos 0 a 7.

### 15.11 Paso 9 · Remedición de bancos (`test:bancos`, pareado)

Sigue la decisión 34 al pie de la letra: dueño operativo el implementador, dueño de cada banda el dueño del repositorio, que decide con la cifra delante; orden por coste creciente; todo pareado viejo contra nuevo con `engineVersion` fijo en la semilla y 12 semillas (`realQueens.ts` l. 179-182, mapa 04 §5.3); presupuesto 4 h de máquina y 2 sesiones humanas, techo 8 h.

**Tests primero.**

- `sim/frozenSkeletons.test.ts`: los tres esqueletos literales (Colombia e5, Guatemala e9, Tachira e6) rendidos con `renderSkeleton` dan el `kind` y el `finalKind` que su `why` reescrito describe; su huella se sella en el propio test para que la lista de `REAL_QUEENS` sea cerrada por forma (decisión 33).
- `sim/calendarQueens.test.ts`: muestra estratificada por `finalKind` × cubeta de desnivel con `PASO` ajustado a ~30 etapas; `facil.races > 0` y `dura.races > 0` (l. 62-63) sostenidos por `et_reina_blanda`; `facil.wonFromMovePct > dura.wonFromMovePct + 10` (l. 64) se espera que siga porque es física y no forma; la banda `breakawayWinPct` [6; 30] se mantiene como vigilancia hasta que la remedición diga otra cosa (D6); `reina-175-4800` impresa sin banda; `mountain.*` renombrada `forma.reinaCanonica.*` en el informe.
- Ninguna banda nueva nace en rojo (mapa 04 §5.3 regla 4).

```ts
// sim/frozenSkeletons.test.ts
for (const q of FROZEN_SKELETONS) {
  // colombia-e5, guatemala-e9, tachira-e6
  it(`${q.id}: el esqueleto congelado rinde lo que su why describe`, () => {
    const profile = renderSkeleton(q.skeleton, q.skeleton.canonico, routeRng(q.id)('dib'))
    expect(stageKindOf(profile, false).kind).toBe(q.skeleton.kind)
    expect(finalKindOf(profile)).toBe(q.skeleton.finalKind)
    expect(kmAfterLastClimb(profile)).toBeCloseTo(q.kmTrasUltimaCota, 0) // el `why` cita esta cifra
    expect(fnv1a(JSON.stringify(profile))).toBe(q.huella) // cerrada por forma
  })
}
```

**Orden de remedición**, con el coste que el mapa 06 §3.1 y §3.2 da para el reloj de hoy y el ×2 del pareado:

| Orden | Banco                                                                | Semillas       | Reloj hoy                                  | Coste real estimado (×2)  | Dirección pre-registrada en el paso 0                                                                                                |
| ----- | -------------------------------------------------------------------- | -------------- | ------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `routeCensus` (geometría)                                            | n/a            | segundos                                   | segundos                  | rojo → verde en las bandas listadas en v61 §0; ninguna verde → rojo                                                                  |
| 2     | `stageKind` por esqueleto                                            | 60 × 5 × zonas | minutos                                    | minutos                   | 100 % por construcción                                                                                                               |
| 3     | `realQueens` (`invariants.test.ts` l. 770-844) con `frozenSkeletons` | 6              | 900 s                                      | ~8 min                    | `lastGroupPct` y `worstStagePct` sin moverse en las 6 reales; las 3 congeladas se remiden y su `why` se reescribe                    |
| 4     | `timeTrials` (l. 222-273)                                            | 12             | por test                                   | ~10 min                   | `tailPct` +0,5 puntos como mucho por `et_crono` con cota ≤ 3 km; D3 puede dejar prólogo y cronoescalada a 0                          |
| 5     | `calendarQueens`                                                     | 12             | 3.600 s con 4 (126 s libre, 370 s cargada) | ~6 a 19 min por generador | fuga por cubeta monótona decreciente (43,8 / 13,7 / 1,6 / 0 hoy); total remedido                                                     |
| 6     | Saturación de las 8 más duras (l. 511-552)                           | 12             | 1.800 s                                    | ~30 min                   | 0 de 8 saturan; V5 impide la forma que saturaba (Jura «82 % con el tanque a cero», l. 474-479)                                       |
| 7     | `smallTours` (l. 855-955)                                            | 12             | 3.900 s con 8                              | ~25 min                   | foto de meta explicada por pares de agrupadas; `distinctWinnerPct` no baja; `media.stages > 40` (l. 915) recontado                   |
| 8     | `coherence.test.ts` Jaén y `journal.test.ts` Tramuntana              | 40 / 12        | `reloj(300)` / por test                    | ~5 min                    | cero contradicciones; lo que aflore es del motor y se arregla, no se afloja                                                          |
| 9     | `world.test.ts`                                                      | 25 temporadas  | por test                                   | ~10 min                   | las bandas de población se leen contra la tabla `kind × raceClass` del paso 8; si una se mueve por el reparto, se anota con la causa |

Total estimado por debajo de 2 h de máquina en máquina libre, con margen hasta las 4 h presupuestadas si va cargada; el techo de 8 h es el punto en el que se para y se entrega lo medido.

**Código.**

- `sim/frozenSkeletons.ts` con los tres `Skeleton` literales y `REAL_QUEENS` leyéndolos (sigue con 9 entradas); `GENERATED_QUEENS` con 3 del calendario nuevo elegidas por forma (una `alto`, una `cima_cerca`, una `valle_largo`), impresas sin banda.
- `sim/targets.ts`: cada cifra remedida con su comentario nuevo; el comentario de l. 88 («una etapa reina del calendario tiene una mediana de 2.023») se sustituye por la cifra nueva; `calendarQueens.breakawayWinPct` queda en [6; 30] salvo decisión del dueño (D6).
- `ARCH.anticlon.maxCorrelacion`: se calibra con `scripts/medir-real.mjs` como p90 de la correlación entre pares reales de la misma familia (Ronde/E3, Amstel/Brabant, Lombardía/Lieja); el 0,85 provisional se sustituye y `calendario.test.ts` se re-sella con la cifra.
- **La tabla pareada como condición de borrado** (decisión 29): se borra `sim/legacy/` (`profileGenLegacy.ts` y `golden.test.ts`) en el mismo cambio que cierra «v61 §2», y solo si las cuatro condiciones de la decisión 30 se cumplen: (a) realismo rojo → verde sin verde → rojo; (b) variedad en verde; (c) canónicas (`llana-180`, `reina-150`, `cri-40`, `chronicle`, las cuatro huellas de `attribution`, `timetrial` y `raceRadio`) sin moverse un dígito; (d) simulación en la dirección prevista o explicación medida sin ajustar la banda. Si falla (c), el cambio ha tocado el motor y se para. Un resultado que contradiga la previsión se anota como «previsión fallida» en la nota y NO mueve la banda hasta decisión del dueño.

**Entregable.** «v61 §2 · Remedición»: la tabla pareada viejo/nuevo de las nueve filas, las dos lecturas de las listas cerradas (por nombre y por forma), y la lista de decisiones abiertas para el dueño con la cifra delante (D2 con la tabla del censo de las 27 de 113, D6).

**Coste.** 2 sesiones humanas, 4 h de máquina, techo 8 h. **Riesgo.** Medio, y es de coste: por eso el orden es por coste creciente y el techo existe.

### 15.12 Paso 10 · Base, API y web (en paralelo con el 9)

**Tests primero.**

- `packages/db/src/recorridoDelMundo.test.ts` gana «dos temporadas, dos recorridos, un esqueleto»: `freezeRaceRoute` con `season 0` y `season 1` de la misma carrera escribe dos filas con perfiles distintos y el mismo `arch.skeleton`; sigue auto-consistente en lo demás (decisión 44); congela `kind`, `label`, `time_trial` y `route_source` y los lee de vuelta.
- Test de `packages/db` para los cuatro lectores: `calendarRun.ts` l. 516 y l. 1603-1616, `world/callups.ts` l. 98 y `raceContext.ts` l. 56-59 y 127 leen `kind`, `timeTrial` y `profile` de `raceStagesForWorld` y, si no hay fila, de `calendarForSeason(season)`; el test intercepta `SEASON_CALENDAR` y comprueba 0 lecturas directas desde esos cuatro sitios (decisión 23).
- Test de API (`apps/api`): una etapa real devuelve `routeSource: 'real'`; ninguna generada devuelve `arch.frase` vacía; la ficha de una etapa no corrida lee `run?.profile ?? frozen?.profile ?? stagesForSeason(...)`; `edicion` y `cambiosRespectoAnterior` presentes para `season ≥ 1`.
- `apps/web/src/api/contracts.test.ts` con el contrato nuevo (`routeSource`, `arch.frase`, `edicion`, `cambiosRespectoAnterior`).

```ts
// packages/db/src/recorridoDelMundo.test.ts (caso nuevo)
it('dos temporadas, dos recorridos, un esqueleto', async () => {
  const race = calendarForSeason(0).find(
    (r) => r.stages.length >= 3 && r.routeSource === 'generado',
  )!
  await freezeRaceRoute(db, worldId, `${race.id}:s0`, race.id, 0)
  await freezeRaceRoute(db, worldId, `${race.id}:s1`, race.id, 1)
  const [s0, s1] = await Promise.all(
    [0, 1].map((s) => raceStagesForWorld(db, worldId, `${race.id}:s${s}`)),
  )
  expect(s0.map((x) => x.kind)).toEqual(s1.map((x) => x.kind))
  expect(s0.map((x) => x.timeTrial)).toEqual(s1.map((x) => x.timeTrial))
  expect(s0.map((x) => x.arch.skeleton)).toEqual(s1.map((x) => x.arch.skeleton))
  expect(s0.some((x, i) => JSON.stringify(x.profile) !== JSON.stringify(s1[i].profile))).toBe(true)
  expect(s0[0].routeSource).toBe('generado')
  expect(s0[0].label).toBeTruthy()
})
```

**Código.** Migración `00NN_race_routes_kind.sql` (columnas `kind`, `label`, `time_trial` en `race_routes`; NN = siguiente libre, hoy la última es `0039_el_recorrido_es_del_mundo.sql`; el directorio real de drizzle es `packages/db/drizzle/`); `freezeRaceRoute(db, worldId, raceKey, raceId, season)` escribiendo `kind`, `label`, `time_trial`, `route_source`; los cuatro lectores; `apps/api/src/routes/calendar.ts` l. 91-105 exponiendo `routeSource`, `arch.frase`, `edicion`, `cambiosRespectoAnterior`; la web con las tres marcas («Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado»), la frase de arquitectura y «Edición N» (D10); `scripts/inventario-recorridos.mjs` leyendo `routeSource` y regenerando `docs/inventario-recorridos.md`.

**Qué cambia de conducta.** Del motor, nada (no sube versión). De la base, qué recorrido congela un mundo en temporada ≥ 1: es lo que la temporada existe para hacer.

**Coste.** 2 sesiones. **Riesgo.** Bajo.

### 15.13 Paso 11 · Documentación

`docs/generador.md` (este documento cerrado con las tablas medidas de los pasos 0, 8 y 9 en lugar de las previstas); `docs/balance.md` v61 con sus cuatro subsecciones; `docs/motor.md` §V.3 (la promesa de los nacionales por zona, cumplida) y §10 (cifras); `SPEC.md` §6.2 una línea («los perfiles sin dato los escribe una gramática de motivos, ver `docs/generador.md`»); `stageKind.ts` l. 44-58 ya reescrito en el paso 8, se revisa; `docs/ops.md` con la nota de `backfillRaceRoutes`; `docs/galeria-recorridos/` regenerada por última vez. Coste: 1 sesión. Riesgo: ninguno.

### 15.14 Orden de dependencias y paralelismo

```
0 → 1 → { 2 ∥ 3 } → 4 → 5 → { 6 ∥ 7 } → 8 → { 9 ∥ 10 } → 11
```

- 2 y 3 en paralelo: `geo.ts`/`regions.ts` y `motifs.ts` no comparten ficheros; el 4 necesita los dos (la galería es zona × esqueleto).
- 6 y 7 en paralelo: `edition.ts` y `tour.ts` no comparten ficheros; los dos dependen del 5 (`generateStage`).
- 9 y 10 en paralelo: los bancos no tocan `packages/db` ni `apps/`; el 11 cierra cuando los dos han terminado.
- El 8 nunca se junta con nada, ni se parte: es la tanda con la versión.
- Contenido que no es código y puede adelantarse desde el paso 0: la curación de `RACE_REGION` (sección 6), las 32 plantillas canónicas (sección 5) y la dirección pre-registrada de cada banda (sección 13).

### 15.15 Coste total estimado

En sesiones de trabajo (estimación de este documento, no medida): 0 → 1; 1 → 2; 2 → 2 + 1 de contenido; 3 → 2; 4 → 3; 5 → 2; 6 → 1; 7 → 2; 8 → 2; 9 → 2 humanas más 4 h de máquina (techo 8 h); 10 → 2; 11 → 1. Total: 22 sesiones de código y 1 de contenido, con un solo salto de versión, ninguna reescritura de fichero existente salvo `profileGen.ts` (que se reduce a primitivas) y `calendar.ts` (que cambia sus tres llamadores y conserva la firma de `stageMix`), y una sola migración. Frente a los seis saltos de `ingeniero.md` §12 (12 a 15 sesiones, cada uno con su remedición de bancos), este plan paga la remedición una vez y gasta esas sesiones de más en tests, galería y contenido, que es donde el diagnóstico de la sección 1 dice que estaba el agujero.
