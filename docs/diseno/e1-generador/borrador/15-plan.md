## 15. El plan de implementación por pasos, tests primero

Doce pasos, del 0 al 11. Los pasos 1 a 7 añaden módulos bajo `packages/engine/src/routes/grammar/` sin un solo llamador en producción, así que no cambian el calendario que el juego corre; el paso 8 los conecta y es el único que sube `ENGINE_VERSION`; el 9 remide los bancos; el 10 lleva el origen y la temporada hasta la base y la pantalla; el 11 cierra la documentación. Los números de paso son nombres, no el orden de ejecución: el 7 (composición) se hace ANTES que el 6 (identidad y temporada), porque la temporada se construye con las vueltas ya compuestas (§15.14). El orden está pensado para que cada paso sea entregable y reversible por sí solo, y para que la remedición del paso 9 separe «forma nueva» de «fontanería nueva» (por eso existe el paso 1) y «forma nueva» de «geografía nueva» (por eso la galería se entrega al dueño, con los vetos completos y el calendario compuesto, antes de conectar nada).

### 15.1 Reglas comunes a todos los pasos

**Versión del código.** Las líneas que esta sección cita son las del árbol `8585ca2` que leyeron los mapas, con los desplazamientos de §0.1 para leerlas en el árbol vivo; donde una cita cambia de fichero o de número de forma que el desplazamiento no basta, se da también la línea viva, comprobada al corregir esta sección contra el código de HEAD `02b032d` (el árbol de trabajo solo añade documentos de diseño encima). Tres cifras NO se fijan en este documento porque dependen del día en que se implementa, y el implementador las lee al empezar el paso que las usa: `N`, la `ENGINE_VERSION` en producción al abrir el paso 8 (`constants.ts`, 86 en l. 809 del árbol vivo; 69 en l. 718 de `8585ca2`); el número de la nota de balance, que es `N + 1`; y el número de la migración, el siguiente libre de `packages/db/drizzle/meta/_journal.json` al abrir el paso 10 (hoy la última es `0040_ordenes_del_paso_17a.sql`, idx 40; en `8585ca2` era `0039_el_recorrido_es_del_mundo.sql`). Si al implementar una línea se ha movido, manda el nombre del símbolo; el paso 0 comprueba cada cita del documento con un script antes de escribir nada.

1. **Tests primero.** Cada paso empieza escribiendo el fichero de test con las aserciones que abajo se listan, y se cierra con `pnpm typecheck && pnpm test` en verde (`Claude.md` § Tests, vía mapa 06 §0). Lo que hoy no puede pasar se escribe igual y se marca `it.todo` con la cifra medida en el nombre; encenderlo es un cambio de una línea y deja rastro en el diff.
2. **Un solo salto de `ENGINE_VERSION`**, en el paso 8: de `N` a `N + 1`, con `N` leído en `constants.ts` al abrir ese paso (desde el árbol vivo, 86 → 87). El test de `index.test.ts` (l. 459 en el árbol vivo, `expect(ENGINE_VERSION).toBe(86)`) se reescribe con la cifra literal `N + 1` de ese día, nunca con un número copiado de este documento. Los pasos 1 a 7 no cambian un byte de `SEASON_CALENDAR` y lo demuestra `routes/golden.test.ts` (paso 1); un paso que lo rompa antes del 8 está mal hecho y se para. Es la regla de `Claude.md` § Código («todo cambio de comportamiento del motor incrementa `engine_version`») aplicada al revés: sin cambio de conducta, sin salto.
3. **Presupuesto de reloj ≥ 4× lo que cuesta en CI** para todo test que simule o muestree (la regla está escrita en `coherence.test.ts` l. 95 e `invariantsDesgaste.test.ts` l. 116-125 del árbol vivo, mapa 06 §0). Los tests de la gramática son de geometría y no simulan, pero tres muestrean perfiles con `sampleProfile` y llevan reloj propio: `motifs.test.ts` (paso 3), `grammar/calendario.test.ts` (vía `routeCensus`, cuyo `finishType` pasa por `sampleProfile` en las 1.418 etapas: 0,57 s medidos por el juez del motor §1) y `sim/routeCensus.test.ts`. Y los barridos de `generateStage` tienen tamaño fijado: en `test:rapido` 20 semillas × 3 zonas × 5 km por esqueleto (unas 9.600 generaciones, objetivo < 20 s medido en el paso 5, dentro del suelo de 30 s de `vitest.config.ts`); la malla completa (60 semillas × 5 km × todas las zonas compatibles, de 77.000 a 115.000 generaciones según la sección 13) va a `sim/stageKind.completo.test.ts`, con el reloj que el paso 5 mida multiplicado por 4.
4. **Los bancos corren en cada push que toque `packages/engine/`** (la puerta «¿Ha cambiado el motor?» de `.github/workflows/ci.yml`, l. 175 del árbol vivo), pero SOLO los ficheros de la matriz de l. 150-171 (`invariants*`, `coherence`, `calendarQueens`, `world`, `raceRadio`), no todo `sim/`; y `test:rapido` excluye `packages/engine/src/sim/**` (`package.json` raíz l. 20). Por eso todo test nuevo bajo `sim/` se añade a la entrada «mundo y radio» de la matriz (l. 166-170) en el mismo paso que lo crea; si no, en un push no lo corre nadie y solo lo ve el nocturno (`cobertura.yml` l. 64, `pnpm test:coverage`). Como los pasos 1 a 7 no cambian perfiles, los bancos siguen en verde sin remedir; el paso 8 los pone en rojo a propósito y el 9 los re-sella. Ningún paso intermedio remide nada.
5. **`backfillRaceRoutes` antes del paso 8** en cualquier mundo vivo (`packages/db/src/raceRoutes.ts` l. 80-108 del árbol vivo: «se corre con el generador ACTUAL a propósito»; decisión 45), y SOLO con las `raceKey` de las carreras de la temporada en curso que ya han empezado o ya están convocadas (`startDay ≤ díaDeTemporada + CALLUP_LEAD_DAYS`, 5 en `packages/db/src/callups.ts` l. 26), porque esas ya tienen una convocatoria o una etapa corrida con el recorrido viejo. La función no tiene llamador en producción (solo `recorridoDelMundo.test.ts` l. 90-102) y congela lo que se le pase: si se le pasaran todas, el mundo conservaría el calendario viejo entero hasta la temporada siguiente y el dueño no vería E1 en él. Las carreras no empezadas se congelan solas con el generador nuevo el día de su etapa 1 (`calendarRun.ts` l. 1630 del árbol vivo, `if (idx === 1) await freezeRaceRoute(...)`). El mundo se reinicia antes del lanzamiento, así que en la práctica es una línea en `docs/ops.md`; pero si un mundo de pruebas sobrevive, se corre así.
6. **Nada de `Math.random` ni `Date.now`** (`Claude.md` § Código). Todo dado sale de `routeRng(`${subflujo}|${clave}`)` (`profileGen.ts` l. 30: `routeRng(seed: string): () => number`, un mulberry32 por cadena; no admite un segundo nivel de llamada) con los subflujos nominales cerrados de §3.8 y la sección 8 (`arch`, `firma`, `ed`, `mot`, `pos`, `dib`); los motivos reciben la fábrica `RngFactory = (sub) => routeRng(`${semilla}|${sub}`)` de §3.4. Un subflujo nuevo se declara en la lista de `edition.ts` antes de usarse.
7. **Una nota de `docs/balance.md`**, al final del fichero: «vN · El generador es una gramática», con `vN = N + 1` (la versión que estrena el paso 8; v87 desde el árbol vivo, cuya última nota es «## v86», l. 16332). No puede llamarse v61: la v61 existe como versión del motor (`balance.md` l. 11171 y 11241). Sus apartados son estos, y las demás secciones los citan con este número:

   | Apartado | Qué | Paso |
   | --- | --- | --- |
   | vN §0 | Línea base: censo de hoy, `medir-real.mjs`, arranque, huellas canónicas vivas, dirección pre-registrada, resultado de la comprobación de citas | 0 |
   | vN §1 | El cambio de calendario: bandas antes y después, constantes retiradas y añadidas, `stageHistory` re-sellado, tabla `kind × raceClass` | 8 |
   | vN §2 | Remedición pareada y previsiones fallidas | 9 |
   | vN §3 | Base, API y pantalla | 10 |
   | vN §4 | Galería: revisiones del dueño (resumen de `docs/galeria-revision.json`), datos editados por cada respuesta | 5, 6 y 7 |
   | vN §5 | Respuestas del dueño a las decisiones de la sección 18 | cuando contesta |
   | vN §6 | Deudas con nombre (sección 17) | 11 |

   La nota se escribe por apartados a medida que avanzan los pasos, aunque su número `N + 1` solo se confirma en el paso 8; hasta entonces se encabeza «vN (pendiente del paso 8)».
8. **Toda constante nueva va en `ARCH` con su comentario de intención** (sección 12) y todo literal que se retire de `profileGen.ts` se cita con su valor de hoy en la nota de balance. Los literales de los ocho generadores viejos no se mueven a `ARCH` en ningún paso intermedio (los valores de `ARCH` son los nuevos y el golden exige los viejos): se van con el fichero en el paso 8.
9. **Un paso, un PR.** Solo los pasos 9 y 10 van en paralelo (§15.14); la curación de `RACE_REGION` puede adelantarse como contenido. Ninguno se junta con el 8. `constants.ts` lo tocan los pasos 3 a 8 (cada uno su bloque de `ARCH`), así que un paso no se abre hasta que el anterior está fusionado.

La tabla resume el plan en orden de ejecución; cada paso se detalla después.

| Paso | Qué | Ficheros nuevos o tocados | ¿Cambia `SEASON_CALENDAR`? | Versión | Sesiones | Riesgo |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Línea base y medida | `sim/routeCensus.ts`, `sim/routeCensus.test.ts`, `grammar/geometry.ts` (lo que el censo usa), `grammar/calendario.test.ts` (con `it.todo`), `scripts/medir-real.mjs`, `scripts/medir-arranque.mjs`, `scripts/comprobar-citas.mjs`, `.github/workflows/ci.yml` | no | no | 1 | ninguno |
| 1 | Congelar y extraer primitivas | `routes/golden.test.ts` y `golden.sealed.ts`, `routes/realFingerprint.test.ts` y `realFingerprint.sealed.ts`, `profileGen.ts` (primitivas), los tipos de `grammar/` (sección 3), `grammar/legacy.ts` | no (byte a byte) | no | 2 | bajo |
| 2 | Geografía | `grammar/geo.ts`, `grammar/regions.ts`, sus tests | no | no | 2 + 1 de contenido | medio (dato opinable) |
| 3 | Motivos | `grammar/motifs.ts` (catálogo y `renderMotif`), `constants.ts::ARCH.motivo/meta`, `motifs.test.ts` | no | no | 2 | medio (muro en meta) |
| 4 | Esqueletos, colocación y rendido | `grammar/skeletons.ts`, `grammar/place.ts`, `grammar/render.ts`, `grammar/geometry.ts` completo, tests | no | no | 3 | medio |
| 5 | Vetos, `generateStage`, `kmDe` y galería | `grammar/veto.ts`, `grammar/generate.ts`, `grammar/tour.ts` (solo `kmDe`), `ARCH.veto`, `ARCH.km`, `sim/stageKind.completo.test.ts`, `scripts/galeria-recorridos.mjs`, tests | no | no | 3 | bajo |
| 7 | Composición | `grammar/tour.ts` completo, `tour.test.ts` | no | no | 2 | medio-bajo |
| 6 | Identidad y temporada | `grammar/edition.ts`, `calendar.ts` (`calendarForSeason`, `raceForSeason`, `stagesForSeason` sin llamadores), `edition.test.ts`, página `calendario.html` de la galería | no | no | 1 | bajo |
| 8 | El cambio de calendario | `routes/calendar.ts`, `stageKind.ts`, `constants.ts`, `apps/api/src/stageHistory.ts`, `sim/legacy/profileGenLegacy.ts`, `sim/legacy/golden.test.ts`, `packages/db/src/raceRoutes.ts` (tipo), tests re-sellados | **sí** | `N` → `N + 1` | 2 | alto (única tanda que rompe tests) |
| 9 | Remedición de bancos | `sim/frozenSkeletons.ts`, `sim/preRegistro.ts`, `sim/pareado.ts`, `sim/saturation.ts`, parámetro `calendar` en los bancos, `sim/targets.ts`, `ci.yml` | no (ya cambió) | no | 2 humanas + 1 de fontanería del pareado, ≈ 3 h de máquina (presupuesto 4 h, techo 8 h) | medio (coste) |
| 10 | Base, API y web | `packages/db/src/schema.ts` y la migración que genera `db:generate`, `packages/db/src/raceRoutes.ts`, `calendarRun.ts`, `callups.ts`, `raceContext.ts`, `packages/shared/src/contracts.ts`, `apps/api/src/routes/calendar.ts`, web, `scripts/inventario-recorridos.mjs` | no | no | 2 | bajo |
| 11 | Documentación | `docs/generador.md`, `docs/balance.md`, `docs/motor.md`, `SPEC.md`, `docs/ops.md`, `stageKind.ts` l. 44-58, `calendar.ts` l. 2 | no | no | 1 | ninguno |

### 15.2 Paso 0 · Línea base y medida (sin cambio de conducta, sin versión)

Es el paso que hace posible el protocolo «mejor y no solo distinto» de la sección 13: sin una foto del calendario de hoy no hay dirección pre-registrada ni tabla pareada.

**Tests primero.**

- `sim/routeCensus.test.ts` (unidad del censo; corre con `test:bancos` porque `test:rapido` excluye `packages/engine/src/sim/**`, y se añade en este paso a la entrada «mundo y radio» de la matriz de `ci.yml`, regla 4): un perfil literal de 3 segmentos (`llano` 100 km, `puerto` 12 km al 7 % con pancarta `cima`, `llano` 8 km) da `nPuertos 1`, `longestClimbKm 12`, `lastClimbKm 12`, `kmAfterLastClimb 8`, `finalKind 'valle_corto'`, `dPlus 840`; un perfil sin puertos da `lastClimbKm null` y no 0 (misma regla que `finalKind.test.ts` l. 61-70); `aggregate` por `kind` sobre tres filas devuelve recuentos y cuantiles correctos; `routeCensus()` sobre las 1.418 etapas de hoy termina por debajo de 2 s (medido 0,57 s por el juez del motor §1 con `coste-motor.mjs`).
- `routes/grammar/calendario.test.ts` (corre en `test:rapido` y muestrea vía `routeCensus`, regla 3): TODAS las bandas de `ROUTE_CENSUS_TARGETS` de la sección 13 escritas ya; las que hoy pasan, verdes (km de edición exactos, ningún segmento < 0,5 km, `kind` declarado coincide con `stageKindOf` en 1.346 de 1.418); los 3 de 1.500 perfiles cuya clasificación cruza el borde de 8,5 km (`segment.km` redondeado contra la suma de tramos, `mountain 175 semilla-167`, mapa 01 §5.1) quedan documentados en la banda de V6 y no en la de segmentos cortos. Las que hoy fallan, `it.todo` con la cifra medida en el nombre: `it.todo('finales muro ≥ 1 % (hoy 0 de 1.075)')`, `it.todo('subida fuera de 30 km: ninguna reina en 0 % (hoy N)')`, `it.todo('última cota ≤ 4,2 km a meta en el 100 % de ud_montana, ud_montana_media y ud_esprint_capi (hoy N %)')` (la banda de la sección 13, que deja fuera `ud_montana_alto` por D1), `it.todo('p90 de km de las etapas de vuelta .2 ≤ 155 y p50 de los un día .2 en [150; 170] (hoy el p90 de .2 es 195)')`, `it.todo('ud_adoquin con [15; 30] sectores (hoy 3)')`, `it.todo('esqueletos distintos por clase (hoy 7 formas)')`. El N de cada nombre lo rellena el implementador con la salida del censo, no con la previsión de este documento.

```ts
// routes/grammar/calendario.test.ts (forma en el paso 0; en el paso 8 todos los `it.todo` pasan a `it`)
const filas = routeCensus()                                   // SEASON_CALENDAR, 1.418 filas
const enLinea = filas.filter(r => r.routeSource !== 'real' && r.kind !== 'cri')   // RouteStats no lleva timeTrial (§3.10): la crono es kind 'cri'
it('los km de las etapas de edición cuadran al redondeo (verde hoy)', () => {
  for (const [id, ed] of Object.entries(RACE_EDITIONS))
    filas.filter(r => r.raceId === id).forEach(r => expect(Math.round(r.km)).toBe(ed.stages[r.stageIndex - 1].km))
})
it.todo('finales muro ≥ 1 % de las etapas en línea generadas (hoy 0 de 1.075)')
it.todo('reinas con 0 % de subida a más de 30 km de meta: ninguna (hoy N de 157)')
it.todo('p90 de km de las etapas de vuelta .2 ≤ 155 y p50 de los un día .2 en [150; 170] (hoy el p90 de .2 es 195)')
```

La regla de nombres: cada `it.todo` lleva la banda y la cifra de hoy entre paréntesis, de modo que el diff del paso 8 enseñe qué se encendió y desde dónde.

**Código.**

- `sim/routeCensus.ts` con la interfaz de §3.10 (`RouteStats`, `routeCensus`, `aggregate`, `entropiaBits`) y `ROUTE_CENSUS_TARGETS` de la sección 13; `routes/grammar/geometry.ts` con `dPlusDe` (integración de tramos con g > 0) y `profileCorrelation` (correlación de los vectores g por km), que el censo necesita ya.
- `scripts/medir-real.mjs` movido desde `scratchpad/e1/medir-real.mjs` sin cambiar su salida (p10/p50/p90 de las 177 etapas reales por rasgo, `propuestas/datos.md` §1.4); `scripts/medir-arranque.mjs` con el procedimiento de §14.3 (proceso hijo por medida, mediana de cinco).
- `scripts/comprobar-citas.mjs`: recorre `docs/generador.md` (o el borrador mientras no esté cerrado), extrae cada pareja «fichero, línea, símbolo citado» y comprueba con `grep -n` que el símbolo está en esa línea del árbol del día; imprime las que se han movido con su línea nueva. El resultado va a «vN §0» y el implementador corrige las citas del documento antes de seguir.
- `.github/workflows/ci.yml`: `packages/engine/src/sim/routeCensus.test.ts` añadido a la entrada «mundo y radio» de la matriz (l. 166-170).

**Entregable.** Tabla «vN §0 · línea base del generador» en `docs/balance.md`: cada banda de realismo y variedad con su valor de hoy y su estado (verde / rojo), la tabla de `medir-real.mjs`, y la medida de arranque: la referencia del juez del motor §1 es 578 ms la carga, 46.354 segmentos (32,7 por etapa) y 0,40 ms por etapa una pasada de `sampleProfile` más lecturas; el implementador sustituye estas cifras por las suyas, en su máquina, con la mediana de §14.3. La lista de huellas canónicas que siguen selladas en el árbol del día, leída del código y no de este documento (en el árbol vivo: dos de `llana-180` y dos de `reina-canonica` en `stage/attribution.test.ts` l. 505-527, dos de `cri-40` en `stage/timetrial.test.ts` l. 83-104, y la igualdad con y sin radio de `sim/raceRadio.test.ts` l. 749-764; tabla de la sección 13). Y la dirección pre-registrada de cada banda de simulación (decisión 30), escrita ANTES de tocar código.

**Qué cambia de conducta.** Nada. **Coste.** 1 sesión. **Riesgo.** Ninguno.

### 15.3 Paso 1 · Congelar lo de hoy y extraer primitivas (sin cambio de conducta, sin versión)

**Tests primero.**

- `routes/golden.test.ts`: una huella `hashInt(JSON.stringify(stage.profile))` por cada una de las 1.418 etapas de `SEASON_CALENDAR`, sellada en `routes/golden.sealed.ts` (`export const GOLDEN: Record<string, number> = {…}`, 1.418 entradas con clave `${raceId}:${index}`) y exigida igual. El sello es un literal TypeScript generado por script y pegado, no un `.json`: `tsconfig.base.json` no activa `resolveJsonModule` y usa `module: NodeNext` con `verbatimModuleSyntax`, `packages/engine/tsconfig.json` compila `src` entero con los tests, y un `import` de `.json` rompería `pnpm typecheck`, que es la condición de cierre de todo paso (regla 1). Se escribe y se sella ANTES de tocar `profileGen.ts`. Vive hasta el paso 8.
- `routes/realFingerprint.test.ts` con `routes/realFingerprint.sealed.ts`, exactamente como los define la sección 11 (§11.2, decisión 28): las 177 etapas con rasgos de `STAGE_FEATURES`, una a una (km al 0,1, número de segmentos y huella), y la ESTRUCTURA de las tres grandes vueltas (`kind`, `timeTrial`, `km`, `restAfter` de las 21 etapas) con huella de perfil en sus etapas reales. Las 62 etapas reales de `race-france`, `race-italy` y `race-spain` ya están entre las 177 (`STAGE_FEATURES` tiene esas tres claves, `stageFeatures.ts` l. 19, 1072 y 1739), así que no se suman aparte; la e21 de Francia, única `edicion` de las 63, sella su estructura (llana, 130 km) con `huella: null`, porque su perfil cambia en el paso 8 al pasar por `et_llana`. Este test SOBREVIVE al paso 8 y a todo lo que venga: es la garantía de que lo real no se toca.

```ts
// routes/golden.test.ts (se borra en el paso 8; sus huellas pasan a sim/legacy/golden.test.ts)
import { describe, expect, it } from 'vitest'
import { SEASON_CALENDAR } from './calendar.js'
import { hashInt } from './profileGen.js'                        // exportada en este mismo paso
import { GOLDEN } from './golden.sealed.js'                      // literal TypeScript, 1.418 entradas
describe('el calendario de hoy no se mueve hasta el paso 8', () => {
  it('las 1.418 etapas de SEASON_CALENDAR no cambian ni un byte', () => {
    let n = 0
    for (const race of SEASON_CALENDAR) for (const st of race.stages) {
      const clave = `${race.id}:${st.index}`
      expect(hashInt(JSON.stringify(st.profile)), clave).toBe(GOLDEN[clave]); n++
    }
    expect(n).toBe(1418)
  })
})
```

- `grammar/legacy.test.ts`: los ocho builders legado producen, para 60 semillas × `KM_ROAD = [130, 155, 175, 195, 215]` (los mismos de `stageKind.test.ts` l. 28), una lista de motivos con el MISMO número y orden de dificultades (`puerto`, `paves`) que los segmentos de la función vieja correspondiente, en 300 de 300 por builder. Es el test de I-42: prueba que la gramática puede expresar las formas de hoy antes de sustituirlas.
- `stageKind.test.ts` sin tocar sigue verde (los ocho `xxxSegments` se conservan hasta el paso 8).

**Código.**

- `profileGen.ts` exporta `hashInt`, `routeRng`, `between`, `split`, `climb(rand, len, avg, { gMax })`, `descent`, `rolling(rand, km, amp, pRompepiernas = 0)`; hoy solo `routeRng` (l. 30) y los ocho `xxxSegments` son `export`, y `hashInt` (l. 15), `between` (l. 47), `split` (l. 52), `climb` (l. 72), `descent` (l. 85) y `rolling(rand, km, bumpy = false)` (l. 100) son privadas. `gMax` por defecto `Infinity`, y `amp` y `pRompepiernas` con los valores de hoy (1,8 / 3,2 y 0 / 0,35, `arquitectura.md` §12 paso 1) en las llamadas de los ocho generadores viejos, de modo que el golden no se mueve. Los ocho `xxxSegments`, `normalize` y `garantizaPuerto` siguen en el fichero, con sus literales, hasta el paso 8.
- Los TIPOS de la sección 3 de todos los ficheros de `grammar/` que los declaran, sin catálogo ni lógica: `motifs.ts` (`MotifKind`, `MetaKind`, `Motif`, `RngFactory`), `skeletons.ts` (`Slot`, `Skeleton`, `SkeletonId`, `SKELETON_IDS`), `geo.ts` (`GeoZone`, `Relieve`, `GeoSignature`, `Territorio`), `tour.ts` (`StageRole`, `Itinerario`, `RouteContext`, `TourSkeletonId`), `generate.ts` (`StageRequest`, `GeneratedStage`). Así ningún paso posterior necesita un fichero de otro paso para compilar sus firmas.
- `grammar/legacy.ts`: los ocho builders legado (`lg_flat`, `lg_hilly`, `lg_hilly_uphill`, `lg_mountain`, `lg_mountain_classic`, `lg_classic`, `lg_cobbles`, `lg_itt`, con `ittSegments === flatSegments` como hoy, mapa 01 §2.1) escritos como `Skeleton` con los rangos de hoy (mapa 01 §8) y una función `legacyMotivos(id, km, seed): Motif[]` que replica la decisión de cardinalidad por umbral de km y el orden fijo de cada generador viejo. Se borra en el paso 8.

**Qué cambia de conducta.** Nada; el golden lo demuestra byte a byte. **Qué se re-sella.** Nada. **Coste.** 2 sesiones. **Riesgo.** Bajo. La tabla pareada «igual dentro del ruido» de los legado contra los viejos se completa en el paso 4, cuando exista `renderSkeleton` (§15.6).

### 15.4 Paso 2 · Geografía (sin llamadores)

**Tests primero.** `grammar/geo.test.ts` y `grammar/regions.test.ts`, todos de consistencia interna porque la tabla es juicio (decisión 16); la forma exacta de cada aserción es la de la sección 6 (§6.8):

| Aserción | Sobre |
| --- | --- |
| Cada miembro de la unión `GeoZone` tiene fila en `ZONAS` (el tipo `Record<GeoZone, GeoSignature>` lo exige; el número de filas es el de la sección 6, que manda); en toda fila `min ≤ max` en todo rango | `ZONAS` |
| `puerto.km[0] ≥ 9` (o `puerto === null`); `cota.km[1] ≤ 8` (o `null`); `muro.km[1] ≤ 3` (o `null`); `adoquin ≥ 2` ⇒ `muro` no es `null` y `muro.adoquin` puede ser `true`; `amplitud ≤ ARCH.motivo.enlace.ampMax` (2,4); `relieve ∈ {montana, alta}` ⇒ `puerto !== null` | `ZONAS` |
| Los 56 países con carreras de equipos (lista literal en el test, sacada de `RACE_COUNTRY` y de las filas) tienen fila explícita en `TERRITORIOS` sin `fallback`. El resto de `COUNTRIES` cae a `FALLBACK` y el test imprime cuántos y cuáles SIN banda: la cifra no va en ninguna aserción, se calcula (`COUNTRIES.filter(c => territorioDe(c.code) === FALLBACK).length`), porque es un hecho de contenido (69 con las 64 filas explícitas de la sección 6: 56 obligatorias más 8 voluntarias) | `TERRITORIOS` |
| `cordillera`, si no es `null`, está en `ruta` y `ZONAS[cordillera].relieve ∈ {montana, alta}`; `cordillera === null` exactamente en la lista literal de la decisión 13 (BE, NL, DK, AE, AU y los que la sección 6 cierre) | `TERRITORIOS` |
| Las 20 filas `terrain: 'cobbles'` del calendario (mapa 07 §3) caen, vía `regionOf`, en una zona con `adoquin ≥ 2` | `RACE_REGION` + `ZONAS` |
| `RACE_REGION` tiene entrada para las 310 carreras de equipos (`SEASON_CALENDAR` sin los 532 `.NC`) y `stages` para las 60 carreras de `RACE_EDITIONS`; ninguna carrera de equipos cae a `zonaDe(country)` (el test intercepta `zonaDe` y cuenta 0 llamadas fuera de `.NC`) | `RACE_REGION` |
| Los 20 ejemplos obligados de la sección 6 (`race-liege` → `ardenas`, `race-lombardy` → `italia_norte`, `race-france` e6 → `pirineos`...) como aserciones literales | `RACE_REGION` |

**Código.** `grammar/geo.ts` (`ZONAS`, `TERRITORIOS`, `FALLBACK`, `territorioDe`, `zonaDe`, `admite`, `degradar`) y `grammar/regions.ts` (`RACE_REGION`, `regionOf`) con el contenido de la sección 6. La curación de `RACE_REGION` es una tarde de contenido con `raceRoutes.ts` abierto, y cuenta como sesión aparte; puede adelantarse desde el paso 0 porque es dato.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones más 1 de contenido. **Riesgo.** Medio, y es de dato, no de código: una zona mal puesta produce carreras plausibles en el sitio equivocado. Lo mitiga la galería (pasos 5 a 7) y la corrección como dato (sección 16).

### 15.5 Paso 3 · Motivos (sin llamadores; después del 2)

El paso 3 necesita `ZONAS` del paso 2: `renderMotif(m, rng, geo)` recibe la firma de la zona (§3.4) y sus tests dibujan en zonas con nombre (`ZONAS.ardenas`, `ZONAS.flandes`, sección 4), y la recalibración de abajo lee `ZONAS[*].amplitud`.

**Tests primero.** `grammar/motifs.test.ts`, el de la sección 4 (§4.7) tal cual, con reloj propio de 120 s porque llama a `sampleProfile` (regla 3). Lo que el plan le exige:

- Por cada uno de los 12 `MotifKind` y cada uno de los 9 `MetaKind`, 300 instancias con la fábrica `rngDe(`test|${kind}|${i}`)`: parámetros dentro del rango de `ARCH.motivo.*` / `ARCH.meta.*`; `validateMotif` acepta; `renderMotif` devuelve `Segment[]` con `Σ km` igual al `km` del motivo al 0,1 y, en todo `puerto`, `segment.km === Σ tramos.km` al 0,01 (guarda de I-8); ningún tramo con g > 20 ni < −14; nunca sale `rompepiernas` (decisión 2).
- `tendida` y `expuesto` se rinden `llano` con tramos (el motor no los cuenta en `kmSubida`, mapa 03 §4.1).
- `muro` adoquinado se rinde `puerto` con `pave: true` en sus tramos; `sector` con `firme: 'tierra'` se rinde `paves` de 2 o 3 estrellas.
- `circuito` con `vueltas: 9` rinde 9 veces el MISMO `Segment[]` de la vuelta (igualdad profunda), con la semilla de detalle `dib|…|hijo{h}` compartida.
- **El test de la ejecutabilidad, riesgo 7**: `muro_meta` con `cotaFinal.km ≤ ARCH.meta.muro.finishMuroMaxKm` (1,0) detrás de un `enlace` de 60 km, rendido, muestreado con `sampleProfile` y leído con `finishType(deriveFinishTerrain(...), 50)`, da `'muro'` en 300 de 300; por encima de 1,0 km da lo que la sección 4 declara (`'puncheur'`); `repecho` → `'puncheur'`; `alto_corto` y `alto_largo` → `'alto'`; `sector_meta` → `'pave'`. Si el 300 de 300 falla, se ajusta `ARCH.meta.muro.aproxKm` (2 → 3) antes que cualquier otra cosa, y se anota; el diseño lo prevé porque `deriveFinishTerrain` (`finish.ts` l. 94-123) funde rachas con `finishClimbGapBlocks` 5 y comprueba `alto` antes que `muro` (l. 165-189, juez del motor §1).

```ts
// grammar/motifs.test.ts (el caso del muro, como lo escribe la sección 4)
const rngDe = (seed: string): RngFactory => (sub) => routeRng(`${seed}|${sub}`)   // routeRng devuelve () => number: la fábrica mete el subflujo en la cadena
const ft = (segs: Segment[]) => finishType(deriveFinishTerrain(sampleProfile({ segments: segs })), 50)
it('un muro de meta de hasta 1,0 km lo lee el motor como muro en 300 de 300', () => {
  for (let i = 0; i < 300; i++) {
    const r = routeRng(`test|muro_meta|${i}|sorteo`)
    const km = 0.5 + Math.round(r() * 5) / 10, g = 8 + Math.round(r() * 80) / 10
    const meta = { kind: 'meta', meta: 'muro_meta', km: km + ARCH.meta.muro.aproxKm, cotaFinal: { km, g } } as const
    const segs = [...renderMotif({ kind: 'enlace', km: 60 }, rngDe(`test|muro_meta|${i}|enlace`), ZONAS.ardenas),
                  ...renderMotif(meta, rngDe(`test|muro_meta|${i}|meta`), ZONAS.ardenas)]
    expect(ft(segs), `muro ${km} km al ${g} %`).toBe('muro')
  }
})
```

**Código.** `grammar/motifs.ts` completo (`validateMotif`, `renderMotif`, instanciación por rangos de `ARCH`); `constants.ts` gana `ARCH.motivo` y `ARCH.meta` con los valores de la sección 12. Recalibración de `ARCH.reina.rellenoDplusPorKm` (5,5 m/km de partida): se rinden 1.000 `enlace` con la `amplitud` de cada zona de `ZONAS`, se mide `dPlusDe` por km, y el valor que queda es la mediana redondeada al 0,5; se anota en el comentario de la constante con la cifra medida.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones. **Riesgo.** Medio: el muro en meta exige precisión de bloque de 100 m y nadie lo ha probado contra el motor; por eso el test va antes que el catálogo de esqueletos, y su fallo tiene ya una respuesta escrita.

### 15.6 Paso 4 · Esqueletos, colocación y rendido (sin llamadores)

Es el paso más largo de código. Aún no existen `veto.ts` ni `generateStage` (paso 5), así que sus tests prueban lo que este paso crea (catálogo, colocación, rendido) con la vara que ya existe: `stageKindOf`, `finalKindOf`, `admite` y la geometría. Ningún test de este paso importa `veto.ts`.

**Tests primero.**

- `grammar/skeletons.test.ts`: catálogo bien formado, comparado SIEMPRE contra la lista literal `SKELETON_IDS` de la unión y nunca contra un número escrito en el test (`expect(Object.keys(SKELETONS).sort()).toEqual([...SKELETON_IDS].sort())`). La unión de §3.3 tiene 32 (16 de un día, con el `ud_repecho` de la sección 5, y 16 de etapa), y el test no depende de la cifra. Además: ventanas ordenadas y dentro de [0; 1]; el slot `meta` es el último y único; `requiere` solo cita claves de `GeoSignature`; `dPlus[0] ≤ dPlus[1]`; `km` dentro de `ARCH.km.maxPorClase` para alguna clase; `pesoBase > 0` salvo `ud_criterium`, que es 0 por D5. La plantilla `canonico` de cada esqueleto, rendida en su zona de referencia (`ZONA_DE_REFERENCIA` de la sección 5), da `stageKindOf(profile, sk.timeTrial ?? false).kind === sk.kind` y `finalKindOf(profile) === sk.finalKind` donde lo declara, en todos los de `SKELETON_IDS`; su `Σ km` cae en `sk.km` y su `dPlusDe` en `sk.dPlus`. Las aserciones de §5.9 que llaman a `generateStage` o a `verify` se escriben aquí como `it.todo` y se encienden en el paso 5.
- `grammar/place.test.ts`: colocación por ventanas sobre 1.000 esqueletos instanciados: ningún motivo empieza fuera de su ventana; dos dificultades consecutivas distan ≥ `ARCH.colocacion.enlaceMinimo` (1,5 km) salvo dentro de `cadena`; la bajada tras un `puerto` mide [0,6; 0,9] × su km; `Σ enlaces ≥ ARCH.colocacion.enlaceMinimoTotal` (12 %) o `colocar` devuelve `null` y no se rinde.
- `grammar/render.test.ts`: `normalizeEnlaces` cuadra `Σ km` al 0,1 tocando solo enlaces y deja el residuo en el más largo; `garantizaClase` mueve el motivo que decide al borde con 0,3 / 0,7 km compensando en el enlace más largo y conserva `segment.km === Σ tramos`; «toda cota de una clásica mide ≤ 2,9 km»; `emitirPancartas` pone `cima` en todo `puerto` ≥ 1,5 km y SIEMPRE en el último `puerto` de la etapa (un `muro_meta` de 0,8 km lleva pancarta y `lastClimbKm` lo ve, decisión 25); un circuito de 9 vueltas con una cota de 2 km lleva 9 pancartas y con un muro de 1,1 km lleva 1 (la de meta).
- `grammar/legacy.test.ts` gana la tabla pareada: los ocho legado rendidos con `renderSkeleton` contra los ocho `xxxSegments`, 300 perfiles por pareja, medidos con `routeCensus`: `nPuertos` idéntico en distribución, y `|Δ p50|` de `dPlus`, `longestClimbKm` y `kmAfterLastClimb` menor que la desviación típica entre semillas de la pareja vieja. Es «igual dentro del ruido» (I-16, I-42): la fontanería nueva reproduce la forma vieja y, por tanto, lo que cambie en el paso 8 será forma y no fontanería.

La plantilla canónica es la secuencia entera de la etapa, enlaces incluidos y en orden, así que se coloca por acumulación sin dados y sin `colocar`. Cada fichero de test que la rinde (este y `veto.test.ts`, que la llama en §9.3 y §9.4 como `renderCanonico('ud_montana', ZONAS.italia_norte)` y `renderCanonico('et_reina_alto_largo', ZONAS.pirineos)`) lleva su propia copia de este auxiliar, con UNA sola firma, `(id: SkeletonId, geo: GeoSignature)`, igual en los dos. La colocación es la de la plantilla degradada de `generateStage` (sección 8, §8.11, `canonica`), copiada regla a regla para que el test rinda lo mismo que produce el reintento agotado: un `enlace` o `expuesto` suma su km y no se coloca (es un hueco, que rinde `renderSkeleton`); un `descenso` se cuelga como `bajada` del `Placed` anterior y suma su km; cualquier otro motivo da un `Placed` con `slot: 'meta'` si es la meta y, si no, `k`, el índice corrido de dificultad (un `number`, como pide `Placed.slot: number | 'meta'` de §3.9, que solo sirve de token del subflujo `dib`). El `slotDe` de §5.9 no sirve aquí: devuelve un `Slot` o `null` y no el `number | 'meta'` del tipo. La firma de `renderSkeleton` es la de §3.9 y §8.7, `(colocados, km, geo, rng: RngFactory, desde?)`; la canónica no tiene zona de origen y `desde` se omite.

```ts
// auxiliar local de skeletons.test.ts y veto.test.ts (misma copia en los dos)
import { SKELETONS, type SkeletonId } from './skeletons.js'
import { renderSkeleton, garantizaClase, emitirPancartas } from './render.js'
import type { Placed } from './place.js'
import type { GeoSignature } from './geo.js'
import type { StageProfile } from '../../stage/types.js'
import { routeRng } from '../profileGen.js'

function renderCanonico(id: SkeletonId, geo: GeoSignature): StageProfile {
  const sk = SKELETONS[id]
  const colocados: Placed[] = []
  let cum = 0
  let k = 0                                                     // índice corrido de dificultad
  for (const motif of sk.canonico) {
    const kmTotal = motif.km * (motif.vueltas ?? 1)             // en `circuito`, km es el de una vuelta
    if (motif.kind === 'enlace' || motif.kind === 'expuesto') { cum += kmTotal; continue }
    if (motif.kind === 'descenso' && colocados.length > 0) {
      colocados[colocados.length - 1].bajada = motif; cum += kmTotal; continue
    }
    colocados.push({ motif, slot: motif.kind === 'meta' ? 'meta' : k++, inicioKm: cum, finKm: cum + kmTotal })
    cum += kmTotal
  }
  const segs = renderSkeleton(colocados, cum, geo, (token) => routeRng(`canonico|${id}|dib|${token}`))
  const g = garantizaClase(segs, sk, colocados)
  if (!g) throw new Error(`${id}: garantizaClase devuelve null sobre la canónica (fallo de catálogo)`)
  return { segments: g.segs, banners: emitirPancartas(g.segs, colocados) }
}
```

`routeRng` devuelve `() => number` (`profileGen.ts` l. 30), así que la fábrica mete el token en la cadena y nunca se escribe `routeRng(x)(y)`. `normalizeEnlaces` no se llama: el km que se pasa es `cum`, la suma de la propia plantilla, y cuadrar contra sí misma no mueve nada. Donde la sección 5 (§5.9) escribe `renderSkeleton(sk.canonico, req)` o `renderSkeleton(alt, {...})` en `skeletons.test.ts`, el implementador escribe `renderCanonico(sk.id, req.geo)`; para una alternativa, que no es un `SkeletonId`, el mismo cuerpo recorre `alt.canonico` en vez de `sk.canonico` (un segundo auxiliar `renderPlantilla(sk, plantilla, geo)` del que `renderCanonico` es el caso `plantilla = sk.canonico`, si hace falta en el fichero).

**Código.** `grammar/skeletons.ts` (las filas de la sección 5 con sus `canonico` y `alternativas`), `grammar/place.ts` (`colocar`), `grammar/render.ts` (`renderSkeleton`, `normalizeEnlaces`, `garantizaClase`, `emitirPancartas`), `grammar/geometry.ts` completo (`describeProfile`, `kmSubidaShare`, `climbKmOutsideLast30`, `subidaLejanaShare`), `constants.ts::ARCH.colocacion`, `ARCH.pancarta`, `ARCH.reina`, `ARCH.pesoPorClase`.

**Entregable.** Para el implementador, no para el dueño: la tabla pareada de los legado en «vN §0» (apéndice de la línea base). La galería no puede existir todavía, porque dibuja con `generateStage` y toma el km de `kmDe` (§16.1 y §16.2), que son del paso 5.

**Qué cambia de conducta.** Nada. **Coste.** 3 sesiones (las plantillas canónicas se escriben a mano). **Riesgo.** Medio: los reintentos en esqueletos de borde; la respuesta ya decidida es estrechar rangos, nunca subir `maxIntentos` (riesgo 9 de la sección 17). La cota de acierto al primer intento se mide en el paso 5, que es donde existe el reintento.

### 15.7 Paso 5 · Vetos, `generateStage` completa, `kmDe` y la galería (sin llamadores)

**Tests primero.** `grammar/veto.test.ts`, `grammar/generate.test.ts` y las aserciones de `skeletons.test.ts` que el paso 4 dejó en `it.todo`:

- Por cada veto de V1 a V10 y V15: un perfil o esqueleto literal que lo dispara y otro que no, con el `detalle` esperado (sección 9). V11 a V14 y V16 no se prueban aquí (son de calendario o de vuelta: `calendario.test.ts` en el paso 8 y `tour.test.ts` en el 7).
- `verify` es pura de `routes/` (decisión 4): el test de fichero entero de §14.4 (`routes/arranque.test.ts`, tercer `it`) recorre `grammar/*.ts` y exige que ninguno tenga un `import` con valor de `stage/` ni llame a `sampleProfile`, `deriveFinishTerrain`, `finishType` o `costBase`. `import type { StageProfile } from '../../stage/types.js'` SÍ está permitido, y es obligatorio en `generate.ts` y `veto.ts` porque `StageProfile` solo existe en `stage/types.ts` (l. 46; `routes/finalKind.ts` l. 1 lo importa igual). La expresión es la de §14.4: `/^import (?!type )[^\n]*from '[^']*\/stage\//m`. Se escribe en este paso aunque el fichero `arranque.test.ts` nazca aquí con ese único `it` y gane los de arranque en el paso 8.
- **El caso v40 con nombre** («una carrera de un día no muere en un puerto de 14 km»), en dos versiones. Con esqueleto fijado: 2.000 `generateStage` de `ud_montana` en `alpes` con `raceClass '1'` y `fixed.skeleton`: 0 con última cota > 4,2 km, 0 con `finalKindOf === 'alto'`, 100 % con la última cota coronando a [3; 17] km de meta (`ARCH.meta.unDiaUltimaCota`). Y sin `fixed`, que es lo que el dueño denunció (lo que el calendario le da a una carrera de un día de montaña): 2.000 peticiones `role: 'un_dia'`, `terrain: 'mountain'`, `raceClass` alternando '1' y '2' y `geo` recorriendo las zonas con `finalesAlto: 'largo'`; en .2, 0 con última cota > 4,2 km; en .1, toda etapa con última cota > 4,2 km tiene `arch.skeleton === 'ud_montana_alto'` (la rareza de D1, peso 0,02 solo en .1) y el test imprime cuántas salieron.
- **La lección de `reina-150` como regla**, con el perfil literal de la sección 9 (§9.4): el escenario que fue `reina-150` y hoy se llama `media-150` (`mediaScenario()`, `sim/scenarios.ts` l. 440-466 del árbol vivo: «LA QUE ERA `reina-150`, con su nombre de verdad»; 135 km de `llano` y un `puerto` de 15 km al 8 %) no pasa V8 como `et_reina_alto_largo`. Ya no es un escenario canónico (su huella sellada se retiró, l. 446-447), y el test copia el perfil literal en vez de importarlo de `sim/`.

```ts
// grammar/veto.test.ts (sección 9, §9.4)
it('reina-150 (hoy media-150) expresada como esqueleto no pasa verify (V8b)', () => {
  const reina150: StageProfile = { segments: [{ km: 135, tipo: 'llano' }, { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] }],
    banners: [{ km: 150, tipo: 'cima' }] }                        // sim/scenarios.ts, mediaScenario (antes reina-150)
  const sk = SKELETONS.et_reina_alto_largo
  expect(stageKindOf(reina150, false).kind).toBe('reina')          // el clasificador la deja pasar: 15 ≥ 8,5
  expect(subidaLejanaShare(reina150)).toBe(0)
  expect(V8(reina150, sk, reqReina(150), [], 150)).toEqual({ id: 'V8', detalle: expect.stringContaining('lejana 0 %') })
})
```

- `generate.test.ts`: determinismo (`generateStage(req)` dos veces, igualdad profunda); independencia de subflujos (cambiar `season` no cambia `arch.skeleton` ni los motivos con `firma: true`; cambiar `km` no cambia el esqueleto); `fixed.skeleton` se respeta (bancos y galería); `arch.frase` no está vacía y cita el esqueleto y la meta. Y el barrido de `test:rapido` de la regla 3 (por esqueleto, 20 semillas × 3 zonas de `TRES_ZONAS(sk)` × 5 km: 300 generaciones por esqueleto): V6 y V7 en el 100 % (`stageKindOf(...).kind === sk.kind`, `finalKindOf === sk.finalKind`), `intentos` p95 ≤ 3 y `degradado` ≤ 0,5 % (`ARCH.veto.fallbackMaxShare.testPorEsqueleto`), con el registro de qué veto disparó cada reintento impreso al final (es lo que dice qué rango estrechar). La cota que hace alcanzable el p95: el PRIMER intento pasa en ≥ 70 % por esqueleto (con acierto ≥ 0,7 por intento, necesitar más de tres tiene probabilidad 0,3³ = 2,7 %, por debajo del 5 %); un esqueleto por debajo estrecha sus rangos antes de seguir.
- `sim/stageKind.completo.test.ts` (nuevo, `test:bancos`, añadido a la matriz de `ci.yml`, regla 4): la malla completa, 60 semillas × 5 km × todas las zonas que `admite`, con las mismas aserciones de V6 y V7. El implementador mide su reloj en este paso, lo escribe en `balance.md` y le pone `{ timeout: 4 × medido }`.
- `grammar/tour.test.ts` (solo la parte de km, el resto en el paso 7): `kmDe` dentro de `ARCH.km.porClase` para cada (clase, papel); ninguna etapa > `ARCH.km.maxPorClase`.

**Código.** `grammar/veto.ts` (V1 a V16 como predicados, `verify`), `grammar/generate.ts` (`generateStage` con los siete pasos de la sección 8 y el reintento sobre `mot`, `pos`, `dib`), `constants.ts::ARCH.veto`; `kmDe` en `grammar/tour.ts` (donde §3.6 la declara) con `ARCH.km`, adelantada del paso 7 porque la galería la necesita; y `scripts/galeria-recorridos.mjs` (sección 16), que lee del `dist` como `scripts/inventario-recorridos.mjs` y genera `docs/galeria-recorridos/` (índice, una página por zona, `nacionales.html`, `adoquin.html`).

**Entregable al dueño (primera mirada).** La galería, con el criterio de lectura de la decisión 41 (tres preguntas por perfil) y los vetos completos: su índice lista en la cabecera los vetos activos, leídos de `veto.ts`. Sus correcciones son datos (`ZONAS`, `RACE_REGION`, `pesoPorClase`), se aplican como dice §16.6 y se resumen en «vN §4» con `docs/galeria-revision.json` versionado. Todavía no es la revisión que abre el paso 8: falta ver qué recibe cada carrera y cómo se compone cada vuelta (pasos 7 y 6).

**Qué cambia de conducta.** Nada. **Coste.** 3 sesiones (2 de vetos y generación, 1 de galería). **Riesgo.** Bajo: los vetos son predicados y los tests son literales.

### 15.8 Paso 7 · Composición (sin llamadores; antes que el 6)

**Tests primero.** `grammar/tour.test.ts`:

- Las seis garantías de `calendar.test.ts` l. 176-236 (crono en vuelta de 5, l. 176; crono siempre en llana de 4+, l. 181; «cinco llanas no son cinco sprints», l. 190; nadie sin crono ni final en alto, l. 200; primera etapa llana o prólogo, l. 211; última decisiva o paseo, l. 223) reescritas contra `composeTour` con tres territorios (BE, ES, CO) y 120 semillas. La de l. 211 se escribe ya con la regla nueva: la primera etapa es llana o, en vueltas de `n ≥ ROUTE.ittWeekStages` (6, `constants.ts` l. 1284 del árbol vivo), `prologo` con `timeTrial` (decisión 42, D3). `calendar.test.ts` NO se toca en este paso (sigue probando `stageMix`, que hasta el paso 8 es la vieja).
- Reglas de bloque V13 y V14 sobre 120 semillas × n ∈ [3; 21] × 5 relieves: `vu_corta` ≤ 1 crono; `vu_semana` ≤ 3 finales en alto y ≤ 2 seguidos; `vu_gran_vuelta` de 21 con descansos en [9; 15], reina en [15; 20], ≤ 1 final en alto en la primera semana, ≤ 7 etapas de alta montaña, ≥ 2 llanas entre bloques (`ARCH.bloques.gv`).
- Km por clase: una .2 de 5 etapas nunca supera 180 km; `lastStageKmFactor` conservado (la parte de `kmDe` ya está desde el paso 5).
- Itinerario: ventana contigua de `TERRITORIOS[country].ruta`; `reina` solo con meta en `cordillera` o zona `montana`/`alta`; **«una vuelta belga no tiene reina»**: 120 vueltas de n ∈ [4; 8] con `country 'BE'` → 0 papeles `reina_*`, y lo mismo para NL, DK, AE, AU (decisión 13, D8); cuando `terrain: 'mountain'` pide reina y no hay cordillera, el papel se degrada a `media_alto` y `Itinerario.notas` lo anota.

```ts
it('una vuelta belga no tiene reina, y una colombiana con terreno de montaña sí', () => {
  for (let i = 0; i < 120; i++) {
    const n = 4 + (i % 5)                                   // 4 a 8 etapas: formato 'una-semana' (RaceFormat, calendar.ts l. 31)
    const be = itinerarioDe(`vu-be-${i}`, 'BE', n, 'mountain', '1', 'una-semana')
    expect(be.papeles.filter(p => p.startsWith('reina')).length, `BE ${i}`).toBe(0)
    const co = itinerarioDe(`vu-co-${i}`, 'CO', n, 'mountain', '1', 'una-semana')
    expect(co.papeles.some(p => p.startsWith('reina')), `CO ${i}`).toBe(true)
    expect(co.metas[co.papeles.findIndex(p => p.startsWith('reina'))]).toBe(TERRITORIOS.CO.cordillera)
  }
})
```

- Prólogo con p 0,25 en etapa 1 de vueltas ≥ 6 y cronoescalada con p 0,08 con `cordillera` (D3), medidos sobre 1.000 vueltas con ± 0,05.
- `n` se conserva siempre (para `raceRoutes.test.ts`, decisión 44).

**Código.** `grammar/tour.ts` completo (`TOUR_SKELETONS`, `BlockRule` como reparación determinista de atrás hacia delante, `itinerarioDe`, `composeTour`), `constants.ts::ARCH.pesosComposicion`, `ARCH.bloques`, `ARCH.itinerario`. `stageMix` NO delega todavía: la delegación es del paso 8, porque cualquier tirada añadida a `mixRoles` desplaza las composiciones de las 72 vueltas (juez del motor §1) y eso es cambio de conducta.

**Entregable al dueño.** La galería regenerada con las vueltas compuestas: `calendario.html` nace en el paso 6 con ellas dentro; hasta entonces el implementador revisa el `Itinerario.notas` de las 72 vueltas impreso por el test.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones. **Riesgo.** Medio-bajo; las garantías de `mixRoles` se conservan como reglas y las de bloque se aplican después.

### 15.9 Paso 6 · Identidad y temporada (sin llamadores; después del 7)

Va después del 7 porque construir «por la ruta nueva» las 72 vueltas y las 60 ediciones de `calendarForSeason(s)` exige `itinerarioDe` y `composeTour` para los papeles y los km de cada etapa; sin ellos el test de identidad («mismo número de etapas», «mismo `kind`») no tiene qué comparar.

**Tests primero.** `grammar/edition.test.ts`:

- `calendarForSeason(s)` es determinista y memoizada: dos llamadas con el mismo `s` devuelven la MISMA referencia; `raceForSeason(id, s)` idem por (id, s). Las tres funciones viven en `calendar.ts` (§3.11: `edition.ts` no importa `calendar.ts`, y así no hay ciclo), se añaden en este paso sin llamadores y no tocan `SEASON_CALENDAR`, que sigue siendo la vieja hasta el paso 8.
- Para toda carrera generada del catálogo, temporadas 1 a 5 contra la 0: mismo `arch.skeleton`, misma `arch.geo`, mismos motivos con `firma: true` y mismos parámetros, mismo `kind`, mismo `timeTrial`, mismo número de etapas (decisión 20); `finalKindOf` igual salvo en `ud_montana` y `et_reina_valle` (cubeta móvil dentro de `{descenso_meta, cima_cerca}` y `{valle, descenso_meta}`, `arquitectura.md` §6.4); km dentro de ± 6 % (`ARCH.edicion.kmJitter`) y exacto en etapas `edicion` (el km es contrato); al menos un motivo no firma distinto en posición o número en 4 de las 5 temporadas; `profileCorrelation` entre ediciones consecutivas en [0,55; 0,9] y entre carreras distintas del mismo esqueleto < 0,6.
- Las etapas `real` son idénticas en toda temporada (huella igual); las `edicion` conservan km y esqueleto y solo cambian el dibujo (`season` entra solo en `dib`).
- Con `ARCH.edicion.activa = false` las cinco temporadas son idénticas a la 0; en un esqueleto con `alternativas` (nivel efectivo 2 con `nivel` 1 o 2) la temporada `s` usa la opción `(hashInt(`alt|${raceId}`) + s) % n` y tira la firma dentro de sus rangos; con `nivel = 0`, la canónica (§10.3).
- La semilla de edición separada (decisión 22): dos carreras con la misma salida, meta y km en `editions.ts` no dibujan lo mismo (`raceId` entra en `raceId|e{i}|{editionKey}`).
- `it.todo('SEASON_CALENDAR es calendarForSeason(BASE_SEASON) por referencia')`: se enciende en el paso 8.

```ts
// grammar/edition.test.ts (forma del test de identidad)
for (const race of calendarForSeason(0).filter(r => r.routeSource !== 'real')) {
  const base = race.stages
  let temporadasConDiferencia = 0
  for (let s = 1; s <= 5; s++) {
    const ed = stagesForSeason(race.id, s)
    expect(ed.length).toBe(base.length)
    ed.forEach((st, i) => {
      const b = base[i]
      expect(st.kind).toBe(b.kind); expect(st.timeTrial).toBe(b.timeTrial)
      expect(st.arch.skeleton).toBe(b.arch.skeleton); expect(st.arch.geo).toBe(b.arch.geo)
      expect(firmaDe(st.arch.motivos)).toEqual(firmaDe(b.arch.motivos))       // motivos con firma: true, con parámetros
      if (st.routeSource === 'edicion') expect(profileKm(st.profile)).toBeCloseTo(profileKm(b.profile), 1)
      else expect(Math.abs(profileKm(st.profile) / profileKm(b.profile) - 1)).toBeLessThanOrEqual(ARCH.edicion.kmJitter)
      const c = profileCorrelation(st.profile, b.profile)
      expect(c).toBeGreaterThanOrEqual(0.55); expect(c).toBeLessThanOrEqual(0.9)
    })
    if (ed.some((st, i) => diffMotivos(base[i].arch.motivos, st.arch.motivos).length > 0)) temporadasConDiferencia++
  }
  expect(temporadasConDiferencia, race.id).toBeGreaterThanOrEqual(4)
}
```
- Coste medido y sellado con holgura: construir las temporadas 1 a 5 cuesta ≤ 5 × `ARCH.arranque.porTemporadaMs` (5 s); el test imprime la cifra.

**Código.** `grammar/edition.ts` (`BASE_SEASON`, `EditionPlan`, `opcionDe`, `planDeEdicion`, `claveEtapa`, `seasonDe`, `semillaDe` con la lista cerrada de subflujos, `diffMotivos` para `cambiosRespectoAnterior`), en `calendar.ts` `calendarForSeason`, `raceForSeason` y `stagesForSeason` (§3.11), `constants.ts::ARCH.edicion`. Y en `scripts/galeria-recorridos.mjs` la página `calendario.html`: cada una de las 842 carreras de `calendarForSeason(0)` con sus etapas (esqueleto, zona, `kind`, km, `arch.frase`, las notas del `Itinerario` en las vueltas y la altimetría), 1.418 perfiles, del orden de 3,1 MB por la medida de §16.3 sobre las mismas 1.418 etapas; la sección 16 la incorpora a su tabla de ficheros.

**Entregable al dueño (la revisión que abre el paso 8).** La galería completa regenerada: páginas por zona con los vetos completos (paso 5), `nacionales.html`, `adoquin.html` y `calendario.html` (qué recibe cada carrera y cómo se compone cada vuelta). Después del paso 8 cada corrección de `ZONAS` mueve las 1.418 etapas y la tabla pareada del 9, así que lo que el dueño no vea aquí lo paga en el 9 o en producción.

**Qué cambia de conducta.** Nada. **Coste.** 1 sesión. **Riesgo.** Bajo, es aditivo.

### 15.10 Paso 8 · El cambio de calendario (`ENGINE_VERSION` `N` → `N + 1`)

La única tanda que rompe tests sellados, y por eso se hace en un solo PR con los tests ya escritos. Antes de empezar: `backfillRaceRoutes` en cualquier mundo vivo, con las `raceKey` de la regla 5; la galería del paso 6 revisada por el dueño, sus ediciones de datos aplicadas y `test:rapido` en verde.

**Tests primero (en este orden).**

1. `index.test.ts` (l. 459 en el árbol vivo): `expect(ENGINE_VERSION).toBe(<N + 1>)`, con la cifra literal leída ese día (87 si el paso empieza desde el árbol vivo, donde `N` es 86).
2. Borrar `routes/golden.test.ts` y `golden.sealed.ts`; sus 1.418 huellas se mueven a `sim/legacy/golden.test.ts` (añadido a la matriz de `ci.yml`, regla 4), que exige que `legacyCalendar()` (abajo) las reproduzca: es la prueba de que la copia legado es el generador viejo y no otra cosa. Se borra con el directorio al final del paso 9.
3. `routes/realFingerprint.test.ts` sigue verde sin tocar: las 177 etapas con rasgos (que incluyen las 62 reales de las tres grandes vueltas) con su huella, y la estructura de las tres vueltas; la e21 de Francia no tenía huella de perfil (`huella: null`, sección 11) y su estructura (llana, 130 km) sigue igual.
4. `routes/stageKind.test.ts` reescrito por esqueleto, en el tamaño de `test:rapido` de la regla 3 (la malla completa ya está en `sim/stageKind.completo.test.ts` desde el paso 5): `stageKindOf(profile, timeTrial).kind === sk.kind` y, donde lo declara, `finalKindOf === sk.finalKind`, en el 100 %; `ud_montana` y `et_reina_*` por fin dentro (hoy `mountainClassicSegments` dibuja 51 reinas y nadie lo sella, mapa 06 §6.1); se conserva el caso «un recorrido sin segmentos es una llana» (l. 104-106); el caso «una crono es una crono aunque su perfil sea el de una llana» (l. 32-43) se re-sella como «una crono llana sin `timeTrial` es llana; una cronoescalada sin `timeTrial` es media» (decisión 42); y las dos etiquetas de reina (`Summit finish`, `Mountains`) tienen que aparecer (l. 87-91).
5. `apps/api/src/stageHistory.test.ts` l. 206 (`expect(cambian).toBe(49)`): `cambian` se re-sella con la cifra que mida el paso y la causa en el comentario de l. 193-204, que se reescribe, con el objetivo escrito: «solo etapas reales cuya etiqueta declarada difiere del recorrido; generadas = 0», porque `kind` y `label` de toda etapa generada salen de `stageKindOf` (decisión 23, I-44). El test gana la aserción `generadasQueCambian === 0`.
6. `routes/calendar.test.ts` (idéntico en `8585ca2` y en el árbol vivo): l. 92-108 (cada etapa con segmentos de km positivos), l. 140-152 (las carreras con recorrido real no pasan por la mezcla: km de la edición) y l. 257-266 (una etapa con final en alto termina en `puerto`) en verde sin tocar; de las seis garantías de `stageMix` (l. 176-236), cinco en verde con `stageMix` delegando en `composeTour`, y la de l. 211-221 («la primera etapa es siempre llana y nunca es la crono») RE-SELLADA con su causa: con la decisión 42 y D3, `prologo` va en `roles[0]` con p 0,25 en vueltas de `n ≥ ROUTE.ittWeekStages` (6), así que la regla pasa a «la primera etapa es llana o prólogo: `timeTrial` solo si `label === 'Prologue'` y `n ≥ 6`»; l. 237-247 (determinismo: la misma carrera compone siempre la misma vuelta) y l. 248-256 (`race-sharjah` tiene crono y final en alto) en verde; gana «`kind` de toda etapa generada es `stageKindOf(profile).kind`» y «`routeSource` de toda etapa es uno de los tres valores y las de `STAGE_FEATURES` son `real`».
7. `grammar/calendario.test.ts` entero: todos los `it.todo` del paso 0 encendidos; ninguna banda puede quedar en `todo` (`ARCH.veto.fallbackMaxShare.calendario` es 0; V12 con el 0,85 provisional hasta el paso 9).
8. `grammar/edition.test.ts`: el `it.todo` de la referencia encendido (`expect(SEASON_CALENDAR).toBe(calendarForSeason(BASE_SEASON))`).
9. `routes/arranque.test.ts` gana los dos `it` de arranque de §14.4, que es donde está escrito el test entero: carga de `SEASON_CALENDAR` ≤ `ARCH.arranque.techoMs` 2.500 (fallo) con aviso por encima de `objetivoMs` 1.500, y una temporada adicional ≤ `porTemporadaMs` 1.000 con la memoización y la expulsión comprobadas. La medida es válida porque el fichero solo importa de forma estática `../constants.js` (que no importa nada: `constants.ts` no tiene ni un `import`) y carga `./calendar.js` con `import()` dinámico DESPUÉS de `t0`; vitest aísla cada fichero de test en su propio contexto de módulos (`isolate` por defecto en `vitest.config.ts`), así que ningún otro test ha cargado ya el calendario. El fichero NO importa `grammar/edition.js` ni `calendar.js` en su cabecera; si lo hiciera, el módulo estaría evaluado antes del reloj y la medida sería ≈ 0 ms. La medida de referencia se toma además con `scripts/medir-arranque.mjs` en procesos hijos (§14.3) y va a la nota de balance junto a la línea base del paso 0 (578 ms de referencia).
10. `routes/raceRoutes.test.ts`, `recorridoDelMundo.test.ts`, `finalKind.test.ts`, `featureProfile.test.ts`, `classicRoutes.test.ts`, `altimetry.test.ts`, `schedule.test.ts`, `uci.test.ts`: en verde sin tocar (mapa 06 §5).

El primer `it` de arranque es de máquina y por eso el techo es 2.500 y no 1.500: el objetivo avisa, el techo falla. Si el techo se supera, la decisión ya está tomada (decisión 35): el calendario se construye perezoso por carrera (`calendarForSeason` devuelve las filas y `raceForSeason` genera al primer acceso, §14.6), y el test se conserva tal cual.

**Código.**

- `routes/calendar.ts`: `buildRace`, `stagesFromEdition` (rama sin rasgos, con esqueleto de etapa según la tabla `EditionTerrain → et_*` de la sección 5) y `nationalChampionships` (`nc_ruta`, `nc_crono` con `zonaDe(code)`) llaman a `generateStage`; `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva firma y delega en `composeTour`; `CalendarStage` gana `routeSource` y `arch`; `CalendarRace` gana `routeSource` agregado (`real` / `mixto` / `generado`); `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)`; `auto()` queda solo para lo real y lo generado lleva las pancartas de `emitirPancartas`; `MixTerrain` y `oneDaySpec` desaparecen; el comentario de l. 2 («28 carreras») se corrige. Y exporta, sin cambio de conducta, lo que el calendario legado necesita para no copiar las tablas: `RACE_TABLES = { WT_TABLE, PRO_TABLE, CON_TABLE }`, `RACE_COUNTRY`, `NATIONAL_CHAMPIONSHIPS`, `auto` y `editionGrandTour` (sección 13, §13.6 punto 3).
- `routes/profileGen.ts` queda con las primitivas; los ocho `xxxSegments`, `normalize` y `garantizaPuerto` se mueven a `sim/legacy/profileGenLegacy.ts` junto con copias de `oneDaySpec`, `stageMix` viejo (`mixRoles`, `mixKm`) y la rama vieja de `buildRace` como `legacyCalendar(): CalendarRace[]`; ese fichero existe solo hasta el final del paso 9 (decisión 29). Es UN fichero, como fija la sección 13 (§13.6 punto 3); §3.10 nombra además un `sim/legacy/calendarLegacy.ts` que la pasada de coherencia retira. `grammar/legacy.ts` se borra.
- `routes/stageKind.ts`: `SUMMIT_RUN_IN_KM = 5` exportada; `label` `Summit finish` por `kmAfterLastClimb(profile) <= SUMMIT_RUN_IN_KM`; `kind` no cambia de regla; etiquetas nuevas `Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic` (decisión 38); comentario de umbrales l. 44-58 reescrito con la tabla medida por esqueleto.
- `apps/api/src/stageHistory.ts`: `calendarStageSpec` usa `stageKindOf(...).label` y deja su regla propia (l. 73-88).
- `constants.ts`: `ENGINE_VERSION = <N + 1>`; se retiran `ROUTE.queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`, `mixWeights`, `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit`, `grandTourLastDecisiveFactor` (sin lector, sección 12 §12.10); se conservan `ROUTE.itt*`, `lastDecisiveChance`, `grandTourStages`, `lastSummitShare`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor` y todo `RELIEF`. `ARCH.arranque` y `ARCH.anticlon` entran aquí.
- `packages/db/src/raceRoutes.ts`: `RouteSource` pasa a tres valores (la columna `route_source` es `text`, `schema.ts` l. 541 del árbol vivo, l. 523 en `8585ca2`: sin migración por el tipo) y `freezeRaceRoute` copia `routeSource` del calendario. El resto de la base va en el paso 10.

**Qué cambia de conducta.** Las 1.241 etapas no reales (532 nacionales, 325 de `stageMix`, 226 de edición sin rasgos, 158 de un día: mapa 06 §1) cambian de perfil; las 177 reales no. El reparto de `kind` por clase cambia (Bélgica sin reina, nacionales por circuito): el paso imprime en la nota de balance la tabla `kind × raceClass` antes y después (`routeCensus` con `aggregate`), que es la medida previa que el riesgo 9 de la ejecutabilidad pide para `world.test.ts` y `RACE_DAY_TSS` antes de mover nada.

**Qué se re-sella y por qué.** Los puntos 1, 4, 5 y 6 (este con la garantía de l. 211-221) con la causa escrita en el propio test, como hace `stageHistory.test.ts` l. 193-204. Los bancos se ponen en rojo aquí a propósito y se re-sellan en el paso 9; el PR del paso 8 los deja en rojo con una nota de que el 9 los cierra, y el CI del push corre los de la matriz igual (regla 4).

**Entregable.** `docs/balance.md` «vN §1 · El cambio de calendario», donde `vN` queda confirmado como `N + 1`: la tabla de `calendario.test.ts` antes (paso 0) y después, las constantes retiradas y añadidas con valor de hoy al lado, la cifra re-sellada de `stageHistory` y la tabla `kind × raceClass`; la galería regenerada. Y la advertencia para quien mire un mundo: E1 se ve en un mundo creado después de este paso, o en las carreras que no estaban empezadas ni convocadas cuando se corrió el backfill (regla 5); las ya congeladas conservan el perfil viejo hasta la temporada siguiente, y las de temporada ≥ 1 salen del generador nuevo por `freezeRaceRoute(..., season)` (paso 10).

**Coste.** 2 sesiones. **Riesgo.** Alto por concentración, bajo por sorpresa: todo lo que rompe está listado y los tests están escritos desde los pasos 0 a 7.

### 15.11 Paso 9 · Remedición de bancos (`test:bancos`, pareado)

Sigue la decisión 34 y la sección 13 (§13.6 y §13.7) al pie de la letra: dueño operativo el implementador, dueño de cada banda el dueño del repositorio, que decide con la cifra delante; orden por coste creciente; todo pareado viejo contra nuevo con `engineVersion` fijo en la semilla y 12 semillas (`realQueens.ts` l. 179-182, mapa 04 §5.3); presupuesto 4 h de máquina y 2 sesiones humanas, techo 8 h; y una sesión más de fontanería para que el pareado sea posible.

**Tests primero.**

- `sim/frozenSkeletons.test.ts` (añadido a la matriz de `ci.yml`, regla 4), con los tipos de §3.10 y §13.5: para cada una de las tres `FROZEN_QUEENS` (Colombia e5, Guatemala e9, Tachira e6), con `profile = frozenProfile(q)`, `stageKindOf(profile, false).kind === 'reina'`, `finalKindOf(profile) === q.skeleton.finalKind`, `|dPlusDe(profile) − centro de q.skeleton.dPlus| ≤ 10 %`, `Σ km` al 0,1 de `q.km`, `verify(profile, q.skeleton, frozenRequest(q), q.motivos) === null` y `hashInt(JSON.stringify(profile)) === q.huellaFNV`, para que la lista de `REAL_QUEENS` sea cerrada por forma (decisión 33).
- `sim/preRegistro.test.ts` (añadido a la matriz): toda entrada de `BANDAS_SOBRE_GENERADO` tiene fila en `PRE_REGISTRO`, y cada `GENERATED_QUEENS` conserva el `finalKind` y el `skeleton` anotados (§13.6).
- `sim/calendarQueens.test.ts`: muestra estratificada por `finalKind` × cubeta de desnivel con `PASO` ajustado a ~30 etapas y reloj `{ timeout: 4_000_000 }` (hoy 3.600.000 en l. 55; la aritmética de §13.4 da 3.716 s por la regla ×4); `facil.races > 0` y `dura.races > 0` sostenidos por `et_reina_blanda`; `facil.wonFromMovePct > dura.wonFromMovePct + 10` se espera que siga porque es física y no forma; la banda `breakawayWinPct` [6; 30] se mantiene como vigilancia hasta que la remedición diga otra cosa (D6); `reina-175-4800` impresa sin banda; `mountain.*` renombrada `forma.reinaCanonica.*` en el informe.
- Ninguna banda nueva nace en rojo (mapa 04 §5.3 regla 4).

```ts
// sim/frozenSkeletons.test.ts
for (const q of FROZEN_QUEENS) {                             // colombia-e5, guatemala-e9, tachira-e6
  it(`${q.raceId} e${q.stageIndex}: el esqueleto congelado rinde lo que su why describe`, () => {
    const profile = frozenProfile(q)                         // dibujo con q.seedDibujo, sin routeRng de dos niveles
    expect(stageKindOf(profile, false).kind).toBe('reina')
    expect(finalKindOf(profile)).toBe(q.skeleton.finalKind)
    expect(profileKm(profile)).toBeCloseTo(q.km, 1)
    expect(verify(profile, q.skeleton, frozenRequest(q), q.motivos)).toBeNull()
    expect(hashInt(JSON.stringify(profile))).toBe(q.huellaFNV)          // cerrada por forma
  })
}
```

**Orden de remedición**, con la tabla de §13.7 (una sola cifra para todo el documento; las líneas son las del árbol vivo, donde `sim/invariants.test.ts` se partió en seis ficheros en la v83, y los bancos corren en la matriz de ocho tramos de `ci.yml` l. 150-171):

| Orden | Banco | Semillas | Reloj del test | Coste real por generador | Dirección pre-registrada en el paso 0 |
| --- | --- | --- | --- | --- | --- |
| 1 | `routeCensus` (geometría) | n/a | `test:rapido` | 0,57 s | rojo → verde en las bandas listadas en vN §0; ninguna verde → rojo |
| 2 | `stageKind.test.ts` por esqueleto y `sim/stageKind.completo.test.ts` | 20 × 3 zonas × 5 km; 60 × 5 km × zonas | 30 s por `it`; el completo, 4 × lo medido en el paso 5 | < 20 s; minutos | 100 % por construcción |
| 3 | `realQueens` sobre `FROZEN_QUEENS` y `GENERATED_QUEENS` | 6 | 900 s (`invariantsAbandonos.test.ts` l. 208, `describe` en l. 197-215) | ~4 min | `lastGroupPct` y `worstStagePct` sin moverse en las 6 reales; las 3 congeladas se remiden y su `why` se reescribe |
| 4 | `timeTrials` (`invariants.test.ts` l. 118-137) | 6 | 300 s | ~3 min | `tailPct` +0,5 puntos como mucho por `et_crono` con cota ≤ 3 km; D3 puede dejar prólogo y cronoescalada a 0 |
| 5 | `calendarQueens` estratificada (`calendarQueens.test.ts` l. 55) | 12 | 4.000.000 ms tras este paso (3.600.000 hoy) | 7 a 21 min | fuga por cubeta monótona decreciente (43,8 / 13,7 / 1,6 / 0 hoy); total remedido |
| 6 | Saturación de las 8 más duras (`invariantsClasicas.test.ts` l. 144; la cita de Jura, «82 % del campo con el tanque a cero», en l. 109-110) | 12 | 1.800 s con 3 | ~30 min | 0 de 8 saturan; V5 impide la forma que saturaba |
| 7 | `smallTours` (`invariantsPequenas.test.ts` l. 64; `media.stages > 40` en l. 88) | 12 | 3.900 s con 8 | ~25 min | foto de meta explicada por pares de agrupadas; `distinctWinnerPct` no baja; `media.stages` recontado |
| 8 | `coherence.test.ts` Jaén y `journal.test.ts` Tramuntana | 40 / 12 | `coherence.test.ts` l. 134 (300 s de coste CI anotado) / por test | ~5 min | cero contradicciones; lo que aflore es del motor y se arregla, no se afloja |
| 9 | `world.test.ts` | 25 temporadas | por test | ~10 min | las bandas de población se leen contra la tabla `kind × raceClass` del paso 8; si una se mueve por el reparto, se anota con la causa |

Suma por generador ≈ 85 min; con el pareado (×2) ≈ 3 h, dentro de las 4 h presupuestadas; el techo de 8 h es el punto en el que se para y se entrega lo medido, cortando la tabla de abajo arriba como dice §13.7.

**Código.**

- La fontanería del pareado (§13.6 punto 3): cada función de banco gana un último parámetro `calendar: CalendarRace[] = SEASON_CALENDAR` (`analyzeCalendarQueens(runs, calendar?)`, `realQueens.ts::findStage(raceId, i, calendar?)` exportada, las de `smallTours.ts` y `timeTrials.ts`); la selección de las 8 más duras, hoy inline en `invariantsClasicas.test.ts` l. 119-132, se extrae a `sim/saturation.ts::hardestOneDay(calendar, n = 8)`; `sim/pareado.ts` con el script `pnpm sim:pareado [semillas=12]` en el `package.json` raíz, que corre cada banco con `SEASON_CALENDAR` y con `legacyCalendar()` y escribe la tabla `banda | viejo | nuevo | Δ mediana | previsto | cumple`; `sim/preRegistro.ts` con `PRE_REGISTRO` y `BANDAS_SOBRE_GENERADO`. Los tests existentes no cambian porque el valor por defecto es el de hoy.
- `sim/frozenSkeletons.ts` con `FROZEN_QUEENS` (los tres literales), `frozenProfile`, `frozenRequest` y `REAL_QUEENS` leyéndolos (sigue con 9 entradas); `GENERATED_QUEENS` con 3 del calendario nuevo elegidas por forma (una `alto`, una `cima_cerca`, una `valle_largo`), impresas sin banda.
- `sim/targets.ts`: cada cifra remedida con su comentario nuevo; el comentario que cita la mediana de desnivel de una reina del calendario (2.023 m) se sustituye por la cifra nueva; `calendarQueens.breakawayWinPct` queda en [6; 30] salvo decisión del dueño (D6).
- `ARCH.anticlon.maxCorrelacion`: se calibra con `scripts/medir-real.mjs` como p90 de la correlación entre pares reales de la misma familia (Ronde/E3, Amstel/Brabant, Lombardía/Lieja); el 0,85 provisional se sustituye y `calendario.test.ts` se re-sella con la cifra.
- `.github/workflows/ci.yml`: `sim/frozenSkeletons.test.ts` y `sim/preRegistro.test.ts` en la entrada «mundo y radio»; al borrar `sim/legacy/`, se quita `sim/legacy/golden.test.ts` de la misma entrada.
- **La tabla pareada como condición de borrado** (decisión 29): se borra `sim/legacy/` (`profileGenLegacy.ts` y `golden.test.ts`) en el mismo cambio que cierra «vN §2», y solo si las cuatro condiciones de la decisión 30 se cumplen: (a) realismo rojo → verde sin verde → rojo; (b) variedad en verde; (c) las huellas canónicas que el paso 0 copió en «vN §0» sin moverse un dígito (en el árbol vivo: las dos de `llana-180` y las dos de `reina-canonica`, que es `queenScenario()`, en `stage/attribution.test.ts` l. 505-527; las dos de `cri-40` en `stage/timetrial.test.ts` l. 83-104; la igualdad con y sin radio de `sim/raceRadio.test.ts` l. 749-764; y las bandas canónicas de `chronicle`); `media-150`, la antigua `reina-150`, NO está en la lista porque su huella se retiró en el paso 21 del motor (`scenarios.ts` l. 446-447); (d) simulación en la dirección prevista o explicación medida sin ajustar la banda. Si falla (c), el cambio ha tocado el motor y se para. Un resultado que contradiga la previsión se anota como «previsión fallida» en «vN §2» y NO mueve la banda hasta decisión del dueño.

**Entregable.** «vN §2 · Remedición»: la tabla pareada viejo/nuevo de las nueve filas, las previsiones fallidas, las dos lecturas de las listas cerradas (por nombre y por forma), y la lista de decisiones abiertas para el dueño con la cifra delante (D2 con la tabla del censo de las 27 de 113, D6).

**Coste.** 2 sesiones humanas más 1 de fontanería del pareado; ≈ 3 h de máquina, presupuesto 4 h, techo 8 h. **Riesgo.** Medio, y es de coste: por eso el orden es por coste creciente y el techo existe.

### 15.12 Paso 10 · Base, API y web (en paralelo con el 9)

Las firmas son las de §3.11, que manda: `freezeRaceRoute(db, worldId, raceKey, raceId, season)` (hoy `freezeRaceRoute(db, worldId, raceKey, raceId)`, `packages/db/src/raceRoutes.ts` l. 35-40, llamada desde `calendarRun.ts` l. 1630 y desde `backfillRaceRoutes` l. 105 del árbol vivo); el lector nuevo `raceStagesForWorld(db, worldId, raceKey, raceId, season): Promise<FrozenStage[]>`, en `raceRoutes.ts` junto a `getRaceRoute` (que hoy devuelve solo `profile`, l. 61-80), con las filas congeladas ordenadas por `stage_day` y, si no hay ninguna, `stagesForSeason(raceId, season)` proyectado a `FrozenStage`; y `arch` SÍ se congela, como `jsonb` nullable en la misma fila (§3.11 lo decide y lo razona).

**Tests primero.**

- `packages/db/src/recorridoDelMundo.test.ts` gana «dos temporadas, dos recorridos, un esqueleto»: `freezeRaceRoute` con `season 0` y `season 1` de la misma carrera escribe dos juegos de filas con perfiles distintos y el mismo `arch.skeleton`; sigue auto-consistente en lo demás (decisión 44); congela `kind`, `label`, `time_trial`, `route_source` y `arch` y los lee de vuelta.
- Test de `packages/db` para los lectores de la decisión 23, con la lista de §10.7: `calendarRun.ts` l. 518 (`raceVocationFit`) y l. 1630-1644 (el `StageInput`: `kind`, `profile`, `timeTrial`, `stage` e `isFinal`), `packages/db/src/callups.ts` l. 98 (`raceVocationFit`, dentro del bucle de l. 97) y `packages/db/src/raceContext.ts` l. 114-127 (`SEASON_CALENDAR.find` en l. 114 y `terrenoRestante` en l. 127, sobre `profile` y `timeTrial`); líneas del árbol vivo, 516 y 1603-1616 en `8585ca2`. El test NO cuenta lecturas de `SEASON_CALENDAR`: esos ficheros lo recorren legítimamente para ids, días, formato y número de etapas, que son identidad (decisión 20; `calendarRun.ts` l. 140, 525, 1095, 1123, 1265, 1311, 1343, 1426, 1441, 1543 y 1566; `callups.ts` l. 80, 244 y 266). Lo que comprueba es que `kind`, `timeTrial` y `profile` vienen del congelado: congela una carrera con `freezeRaceRoute(..., season 1)`, cuyo `kind` y `profile` difieren a propósito de los de la temporada 0, y afirma que `raceVocationFit` en los dos sitios, el `StageInput` que escribe `calendarRun.ts` y `terrenoRestante` reciben los valores congelados; sin fila, los de `stagesForSeason(raceId, season)` y nunca los de `SEASON_CALENDAR`.
- Test de API (`apps/api`): una etapa real devuelve `routeSource: 'real'`; ninguna generada devuelve `arch.frase` vacía; la ficha de una etapa no corrida lee `run?.profile ?? frozen?.profile ?? stagesForSeason(...)` y `frozen.arch ?? stagesForSeason(raceId, season)[i - 1].arch`; `edicion` y `cambiosRespectoAnterior` presentes para `season ≥ 1`.
- `apps/web/src/api/contracts.test.ts` con el contrato nuevo (`routeSource`, `arch.frase`, `edicion`, `cambiosRespectoAnterior`).

```ts
// packages/db/src/recorridoDelMundo.test.ts (caso nuevo)
it('dos temporadas, dos recorridos, un esqueleto', async () => {
  const race = calendarForSeason(0).find(r => r.stages.length >= 3 && r.routeSource === 'generado')!
  await freezeRaceRoute(db, worldId, `${race.id}:s0`, race.id, 0)
  await freezeRaceRoute(db, worldId, `${race.id}:s1`, race.id, 1)
  const [s0, s1] = await Promise.all([0, 1].map(s => raceStagesForWorld(db, worldId, `${race.id}:s${s}`, race.id, s)))
  expect(s0.map(x => x.kind)).toEqual(s1.map(x => x.kind))
  expect(s0.map(x => x.timeTrial)).toEqual(s1.map(x => x.timeTrial))
  expect(s0.map(x => x.arch?.skeleton)).toEqual(s1.map(x => x.arch?.skeleton))    // arch congelado (jsonb, §3.11)
  expect(s0.every(x => x.arch !== null)).toBe(true)                                 // filas nuevas: arch escrito
  expect(s0.some((x, i) => JSON.stringify(x.profile) !== JSON.stringify(s1[i].profile))).toBe(true)
  expect(s0[0].routeSource).toBe('generado'); expect(s0[0].label).toBeTruthy()
})
```

**Código.**

- La migración, por el procedimiento de la casa y nunca a mano: se añaden a la tabla `raceRoutes` de `packages/db/src/schema.ts` (junto a `routeSource`, l. 541 del árbol vivo) las columnas de §3.11, todas nullable para las filas ya congeladas: `kind: text('kind')`, `label: text('label')`, `timeTrial: boolean('time_trial')`, `arch: jsonb('arch').$type<GeneratedStage['arch']>()`; y se corre `pnpm --filter @cyclingstar/db db:generate --name race_routes_kind` (`drizzle-kit generate`, `packages/db/package.json` l. 21), que escribe `packages/db/drizzle/00NN_race_routes_kind.sql`, `drizzle/meta/00NN_snapshot.json` y la entrada en `drizzle/meta/_journal.json`, con `NN` el siguiente libre (0041 desde el árbol vivo, donde la última es `0040_ordenes_del_paso_17a.sql`). Un `.sql` escrito a mano no tiene snapshot ni entrada en el journal y `db:migrate` no lo aplica. El nombre con `--name` sigue la convención de las migraciones existentes (`0039_el_recorrido_es_del_mundo`, `0040_ordenes_del_paso_17a`).
- `freezeRaceRoute(db, worldId, raceKey, raceId, season)` escribiendo `kind`, `label`, `time_trial`, `route_source` y `arch` desde `stagesForSeason(raceId, season)`, y sus dos llamadores (`calendarRun.ts` l. 1630 con el `season` de la `raceKey`, `calendarRun.ts` l. 785: `${race.id}:s${season}`; `backfillRaceRoutes`, que saca `season` de la `raceKey`); `raceStagesForWorld`; los lectores de la lista de arriba; `packages/shared/src/contracts.ts` (el esquema zod de etapa gana `routeSource`, `edicion`, `arch` y `cambiosRespectoAnterior`); `apps/api/src/stageHistory.ts::StageSpecHead` gana `routeSource`; `apps/api/src/routes/calendar.ts` l. 91-105 exponiendo `routeSource`, `arch.frase`, `edicion`, `cambiosRespectoAnterior`; la web con las tres marcas («Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado»), la frase de arquitectura y «Edición N» (D10); `scripts/inventario-recorridos.mjs` leyendo `routeSource` y regenerando `docs/inventario-recorridos.md`.

**Qué cambia de conducta.** Del motor, nada (no sube versión). De la base, qué recorrido congela un mundo en temporada ≥ 1: es lo que la temporada existe para hacer.

**Entregable.** «vN §3 · Base y pantalla».

**Coste.** 2 sesiones. **Riesgo.** Bajo.

### 15.13 Paso 11 · Documentación

`docs/generador.md` (este documento cerrado con las tablas medidas de los pasos 0, 8 y 9 en lugar de las previstas); `docs/balance.md` «vN» con sus apartados de la regla 7 y «vN §6» con las deudas de la sección 17; `docs/motor.md` §V.3 (la promesa de los nacionales por zona, cumplida) y §10 (cifras); `SPEC.md` §6.2 una línea («los perfiles sin dato los escribe una gramática de motivos, ver `docs/generador.md`»); `stageKind.ts` l. 44-58 ya reescrito en el paso 8, se revisa; `docs/ops.md` con la nota de `backfillRaceRoutes`: qué `raceKey` se le pasan (regla 5) y que para ver E1 hace falta un mundo creado después del paso 8 o carreras aún no empezadas ni convocadas, porque las ya congeladas conservan el perfil viejo hasta la temporada siguiente; `docs/galeria-recorridos/` regenerada por última vez. Coste: 1 sesión. Riesgo: ninguno.

### 15.14 Orden de dependencias y paralelismo

```
0 → 1 → 2 → 3 → 4 → 5 → 7 → 6 → 8 → { 9 ∥ 10 } → 11
```

- 3 después de 2: `renderMotif(m, rng, geo)` recibe una `GeoSignature`, los tests de motivos dibujan en `ZONAS` con nombre y la recalibración de `rellenoDplusPorKm` lee `ZONAS[*].amplitud`. Lo único que puede ir en paralelo con el 3 es la curación de `RACE_REGION` (contenido de `regions.ts`), que el 3 no usa.
- 7 antes que 6: `calendarForSeason(s)` compone las vueltas con `itinerarioDe` y `composeTour`; sin el 7, el test de identidad del 6 no tiene vueltas que comparar.
- `constants.ts` lo tocan los pasos 3 a 8 (cada uno su bloque de `ARCH`: `motivo` y `meta` en el 3; `colocacion`, `pancarta`, `reina`, `pesoPorClase` en el 4; `veto` y `km` en el 5; `pesosComposicion`, `bloques`, `itinerario` en el 7; `edicion` en el 6; `arranque`, `anticlon` y la versión en el 8): por eso ninguno de esos pasos va en paralelo con otro.
- 9 y 10 en paralelo: los bancos no tocan `packages/db` ni `apps/`, y el 10 no toca `sim/`; el 11 cierra cuando los dos han terminado.
- El 8 nunca se junta con nada, ni se parte: es la tanda con la versión.
- Contenido que no es código y puede adelantarse desde el paso 0: la curación de `RACE_REGION` (sección 6), las plantillas canónicas (sección 5) y la dirección pre-registrada de cada banda (sección 13).

### 15.15 Coste total estimado

En sesiones de trabajo (estimación de este documento, no medida), en orden de ejecución: 0 → 1; 1 → 2; 2 → 2 + 1 de contenido; 3 → 2; 4 → 3; 5 → 3; 7 → 2; 6 → 1; 8 → 2; 9 → 2 humanas más 1 de fontanería y ≈ 3 h de máquina (presupuesto 4 h, techo 8 h); 10 → 2; 11 → 1. Total: 24 sesiones de código y 1 de contenido, con un solo salto de versión y una sola migración.

Los ficheros EXISTENTES que cambian, para que nadie los descubra a mitad de camino: `routes/profileGen.ts` (se reduce a primitivas exportadas), `routes/calendar.ts` (sus tres llamadores, `calendarForSeason`, `SEASON_CALENDAR` y los `export` de tablas para el legado; conserva la firma de `stageMix`), `routes/stageKind.ts` (exportaciones, `SUMMIT_RUN_IN_KM`, etiquetas nuevas, comentario de umbrales), `routes/stageKind.test.ts` (reescrito por esqueleto), `routes/calendar.test.ts` (l. 211-221 re-sellada), `constants.ts` (`ARCH`, versión, `ROUTE` retirado), `index.test.ts` (versión), `apps/api/src/stageHistory.ts` y su test, `packages/db/src/schema.ts`, `packages/db/src/raceRoutes.ts` (tipo, `freezeRaceRoute` con `season`, `raceStagesForWorld`), `packages/db/src/calendarRun.ts`, `packages/db/src/callups.ts`, `packages/db/src/raceContext.ts`, `packages/db/src/recorridoDelMundo.test.ts`, `packages/shared/src/contracts.ts`, `apps/api/src/routes/calendar.ts`, la web, `scripts/inventario-recorridos.mjs`, `.github/workflows/ci.yml`, el `package.json` raíz (`sim:pareado`), y los bancos de `sim/` (`calendarQueens.ts` y su test, `realQueens.ts`, `smallTours.ts`, `timeTrials.ts`, `invariantsClasicas.test.ts`, `targets.ts`), que ganan el parámetro `calendar` con el valor por defecto de hoy. Frente a los seis saltos de `ingeniero.md` §12 (12 a 15 sesiones, cada uno con su remedición de bancos), este plan paga la remedición una vez y gasta esas sesiones de más en tests, galería y contenido, que es donde el diagnóstico de la sección 1 dice que estaba el agujero.
