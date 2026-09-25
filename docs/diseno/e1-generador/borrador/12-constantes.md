## 12. Las constantes

La regla de la casa es una línea de `Claude.md` (l. 12): "Toda constante de juego vive en `packages/engine/src/constants.ts` con comentario de intención. Cambios de constantes se anotan en `docs/balance.md`". El generador de hoy la incumple por omisión: de todo `ROUTE` (`constants.ts` l. 1242-1337) solo cuatro claves entran en `profileGen.ts` (`queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`), y los rangos de longitud y pendiente de cotas, muros, bajadas y relleno están escritos en el cuerpo de las funciones (mapa 01 §3: *cambiar "una cota de media es de 3 a 7 km" es editar `profileGen.ts` l. 247*). Esta sección cierra eso: un bloque nuevo `ARCH` en `constants.ts`, junto a `ROUTE`, con los números de intención del generador, cada uno con valor, intención y en qué se apoya. Las tablas grandes (`ZONAS`, `TERRITORIOS`, `RACE_REGION`, `SKELETONS`, `TOUR_SKELETONS`) son datos, no perillas: viven en `routes/grammar/{geo,regions,skeletons,tour}.ts` y quien las usa las importa de su fichero (no existe `routes/grammar/index.ts`, sección 15 §15.1); `constants.ts` NO las reexporta (ni por valor ni por referencia), porque esos ficheros importan `ARCH` y una reexportación desde `constants.ts` cerraría un ciclo ESM (`constants.ts → grammar/*.ts → constants.ts`) en el que un lado lee `undefined` o salta la zona muerta temporal, y además arrastraría la gramática entera fuera del reloj de `arranque.test.ts` (sección 14 §14.4, que importa `constants.js` antes de arrancarlo). La regla de `Claude.md` se cumple con `ARCH` y con un comentario sobre el bloque que remite a esos cuatro ficheros como "datos de intención"; el test de 12.14 sella que `constants.ts` solo hace `import type` de `routes/grammar/`.

Sobre las líneas citadas: los mapas leyeron el HEAD `8585ca2` (mapa 01 l. 3) y `constants.ts` ha crecido 884 líneas desde entonces (914 añadidas y 30 borradas, las 944 que da `git diff --stat`; 17 subidas de versión, de v69 a v86); las líneas de `constants.ts` de esta sección son las del HEAD de la corrección (`e94959b`), y las de `profileGen.ts`, `stageKind.ts`, `finalKind.ts` y `classicRoutes.ts` se han comprobado contra ese mismo HEAD. Como `constants.ts` cambia con cada versión, el implementador localiza cada clave POR NOMBRE (todas son únicas en el fichero) y actualiza la cita en la nota de `balance.md`; la línea es una ayuda, el nombre es la referencia.

Convención de lectura: `[a; b]` es un rango cerrado en el que se sortea uniforme (`between(rand, a, b)`, `profileGen.ts` l. 47-49, que es semiabierto por arriba y se acepta así: el techo nunca sale); `[min, rango]` es la forma de `ROUTE.kmFlat` (l. 1331), mínimo más amplitud; una probabilidad se escribe `p`. Toda cifra medida dice de dónde sale: mapa 01 (generador), mapa 03 (motor), mapa 07 (ciclismo real), `juicios/motor.md` §1 (coste) o `propuestas/datos.md` §1.4 (las 177 etapas reales).

### 12.1 La forma del bloque `ARCH`

**Este bloque es la ÚNICA fuente de los valores de `ARCH`.** Cuando otra parte del documento escribe un rango o un valor de `ARCH` con una cifra distinta, manda la de este bloque, y el implementador copia a `constants.ts` las cifras de aquí y escribe los tests con ellas. Manda en particular sobre la tabla de §3.2 (columnas `km` y `g`), sobre las tablas de §4.2 y §4.3 y la regla 1 de `validateMotif` en §4.5, y sobre la tabla §B.3 del esqueleto, que fue el punto de partida y queda superada donde discrepa (por ejemplo, §B.3 escribía `cota.g` [4; 7], `puerto.g` [5; 9], `muro.km` [0,4; 3,0], `meta.altoLargo.g` [6; 9] y `bloques.gv.reina` [15, 20]; los valores vigentes son [4; 8), [5; 12], [0,4; 2,5], [6; 12] y ninguno, porque `reina` se retira, 12.8). La regla de lectura de la sección 3 ("si una sección y esta discrepan, manda esta") se refiere a NOMBRES y FIRMAS; sobre las cifras de `ARCH`, la propia sección 3 dice que "salen del bloque `ARCH`" y aquí se confirma: en números manda §12.1, y las tablas de §3.2, §4.2, §4.3 y §4.5 ya están escritas con estos valores. Las tablas 12.2 a 12.9 explican cada valor; si una fila de esas tablas y el bloque discreparan, también manda el bloque, y la discrepancia es un error de este documento que el test de 12.14 y los de §4.5 detectan porque leen `ARCH` y no literales. La única tabla de otra sección que se transcribe aquí celda a celda es la de `pesoPorClase` (§5.6), que es donde están las razones de cada celda; el literal `PESO_POR_CLASE` de abajo tiene sus mismas 32 filas y sus mismos valores.

Se escribe entero, `as const`, con el comentario de intención sobre cada clave (en el fichero real cada línea lleva el comentario que aquí va en las tablas 12.2 a 12.9; el bloque se muestra sin ellos para que se vea la forma). Los tipos `RaceClass` (`routes/uci.ts` l. 12: `'WT' | 'Pro' | '1' | '2' | 'NC'`), `Relieve`, `GeoSignature` (de cuyo campo `altitud`, `'mar' | 'colina' | 'media' | 'alta' | 'altiplano'`, sale el alias local `Altitud`, sección 3 §3.4), `StageRole` y `SkeletonId` son los de la sección 3; se importan SOLO como tipos (`import type` se borra al compilar y no crea ciclo).

```ts
// packages/engine/src/constants.ts (bloque nuevo, detrás de ROUTE)
// Las tablas de la gramática (ZONAS, TERRITORIOS, RACE_REGION, SKELETONS, TOUR_SKELETONS) son datos de
// intención y viven en routes/grammar/{geo,regions,skeletons,tour}.ts; aquí solo van las perillas.
import type { RaceClass } from './routes/uci.js'
import type { GeoSignature, Relieve } from './routes/grammar/geo.js'
import type { StageRole } from './routes/grammar/tour.js'
import type { SkeletonId } from './routes/grammar/skeletons.js'

type Altitud = GeoSignature['altitud']                  // local: la sección 3 no exporta un alias con nombre

type Rango = readonly [number, number]
type MinRango = readonly [number, number]                 // [mínimo, amplitud], como ROUTE.kmFlat
type PapelKm = 'llana' | 'media' | 'reina' | 'corta' | 'unDia'

/** Configuración de edición: es un TIPO ancho a propósito (activa: boolean), para que un test o el dueño
 *  puedan pasar `{ ...ARCH.edicion, activa: false }` a calendarForSeason(s, cfg) sin mutar ARCH (sección 10 §10.5).
 *  Es la ÚNICA definición del tipo: edition.ts (sección 10 §10.3) y los tipos de la sección 3 (§3.8) hacen
 *  `import type { EdicionCfg } from '../../constants.js'`; nadie lo deriva con `typeof ARCH.edicion`. */
export interface EdicionCfg {
  readonly baseSeason: 0   // BASE_SEASON (sección 10 §10.2): tipo literal 0, no es perilla y ninguna cfg de test la cambia
  activa: boolean
  nivel: 0 | 1 | 2
  kmJitter: number
  vueltasJitter: number
  motivoNuevo: number
}

/** Multiplicador por clase del peso de cada esqueleto (sección 5 §5.6, que da la razón de cada celda; 12.7).
 *  Tabla COMPLETA: 32 filas, una por SkeletonId, y las cinco clases en cada fila. El tipo sin Partial hace que
 *  `pnpm typecheck` falle si falta un esqueleto o una clase, y con `noUncheckedIndexedAccess` permite leer
 *  `ARCH.pesoPorClase[id][raceClass]` como `number` (candidatos, §5.7). No hay valor por defecto: 0 veta la clase. */
const PESO_POR_CLASE: Record<SkeletonId, Record<RaceClass, number>> = {
  //                     WT      Pro     '1'        '2'        NC
  ud_esprint:          { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  ud_esprint_capi:     { WT: 1, Pro: 1,   '1': 0.5,  '2': 0,    NC: 0 },
  ud_circuito:         { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  ud_muro_final:       { WT: 1, Pro: 1,   '1': 1,    '2': 0.5,  NC: 0 },
  ud_muros:            { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  ud_muros_adoquin:    { WT: 1, Pro: 1,   '1': 1,    '2': 0.5,  NC: 0 },
  ud_sterrato:         { WT: 1, Pro: 1,   '1': 0.5,  '2': 0.25, NC: 0 },
  ud_adoquin:          { WT: 1, Pro: 1,   '1': 0.5,  '2': 0,    NC: 0 },
  ud_adoquin_ligero:   { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  ud_montana:          { WT: 1, Pro: 1,   '1': 1,    '2': 0,    NC: 0 },
  ud_montana_media:    { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  ud_repecho:          { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  ud_montana_alto:     { WT: 0, Pro: 0,   '1': 0.02, '2': 0,    NC: 0 },
  ud_criterium:        { WT: 0, Pro: 0,   '1': 0,    '2': 0,    NC: 0 },
  nc_ruta:             { WT: 0, Pro: 0,   '1': 0,    '2': 0,    NC: 1 },
  nc_crono:            { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 1 },
  et_llana:            { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_llana_viento:     { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_media_valle:      { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_media_alto:       { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_media_muro:       { WT: 1, Pro: 1,   '1': 1,    '2': 0.7,  NC: 0 },
  et_media_tendida:    { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_reina_alto_largo: { WT: 1, Pro: 1,   '1': 0.7,  '2': 0.4,  NC: 0 },
  et_reina_alto_corto: { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_reina_cima_cerca: { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_reina_valle:      { WT: 1, Pro: 1,   '1': 1,    '2': 0.7,  NC: 0 },
  et_reina_encadenada: { WT: 1, Pro: 0.7, '1': 0.4,  '2': 0,    NC: 0 },
  et_montana_corta:    { WT: 1, Pro: 1,   '1': 0.7,  '2': 0.4,  NC: 0 },
  et_reina_blanda:     { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_crono:            { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_prologo:          { WT: 1, Pro: 1,   '1': 1,    '2': 1,    NC: 0 },
  et_cronoescalada:    { WT: 1, Pro: 0.7, '1': 0.4,  '2': 0,    NC: 0 },
}

export const ARCH = {
  motivo: {
    cota:     { km: [2.5, 8.0] as Rango, g: [4, 8] as Rango },
    puerto:   { km: [9.0, 25] as Rango, g: [5, 12] as Rango,
                rampaIrregular: { km: [0.3, 0.8] as Rango, g: [11, 13] as Rango } },
    muro:     { km: [0.4, 2.5] as Rango, g: [8, 16] as Rango, gMin: 8, gMax: 16 },
    cadena:   { hijos: [2, 8] as Rango, enlace: [1.5, 6] as Rango },
    sector:   { km: [0.3, 3.7] as Rango, estrellas: [1, 5] as Rango },
    racimo:   { sectores: [4, 10] as Rango, separacion: [2, 6] as Rango, km: [10, 60] as Rango },
    circuito: { kmVuelta: [1.5, 30] as Rango, vueltas: [2, 40] as Rango, maxHijosShare: 0.8 },
    tendida:  { km: [5, 30] as Rango, g: [1.5, 3.5] as Rango },
    descenso: { km: [2, 25] as Rango, g: [-8, -3] as Rango, kmPorDesnivel: { perdidaPorKm: 55, kmMin: 2, kmMax: 10 } },
    enlace:   { km: [1, 300] as Rango, ampMax: 2.4 },
    expuesto: { km: [5, 120] as Rango, amp: 0.5 },
  },
  meta: {
    repecho:       { km: [1, 2.9] as Rango, g: [5, 7] as Rango, gMin: 4, gMax: 7.9 },
    muro:          { km: [0.5, 2.2] as Rango, g: [8, 16] as Rango, aproxKm: 2, aproxAmp: 2.5, finishMuroMaxKm: 1.0 },
    altoCorto:     { km: [3, 7] as Rango, g: [6, 11] as Rango },
    altoLargo:     { km: [9, 22] as Rango, g: [6, 12] as Rango, gMaxSiMasDe17: 7 },
    cimaCerca:     { valle: [1.2, 4.3] as Rango },
    descensoMeta:  { valle: [5.7, 19.3] as Rango },
    valle:         { valle: [20.7, 45] as Rango },
    sectorMeta:    { aMeta: [1, 8] as Rango },
    unDiaUltimaCota: { km: [1.3, 4.2] as Rango, g: [7, 11] as Rango, aMeta: [3, 17] as Rango },
  },
  reina: {
    dPlusIncluyeRelleno: true,
    rellenoDplusPorKm: 5.5,
    escalaDificultades: [0.7, 1.4] as Rango,
    verdad: { puertoMetaMinKm: 9, dPlusMin: 3400 },
    subidaLejanaMin: 0.25,
    subidaLejanaKm: 30,
    blandaShare: { media: 0.25, montana: 0.25, alta: 0.10 } as Partial<Record<Relieve, number>>,
  },
  colocacion: { enlaceMinimo: 1.5, enlaceMinimoTotal: 0.12, bajadaTrasPuerto: [0.6, 0.9] as Rango, maxIntentos: 8 },
  veto: {
    margenClaseKm: 0.3, margenValleKm: 0.7, margenClaseMetros: 300,
    fallbackMaxShare: { calendario: 0, testPorEsqueleto: 0.005 }, intentosP95: 3,
    segmentoMinKm: 0.5, kmTolerancia: 0.05,
    pendientes: { gMax: 20, gMin: -14, subidaGMin: 1 },
    puertoLargoKm: 15,
    puertoDplusMax: { mar: 500, colina: 800, media: 1300, alta: 2100, altiplano: 1500 } as Record<Altitud, number>,
    llana: { dPlusMax: 1800, cotaKm: 2.5, cotaG: 5, ventanaKm: 15, rachaGMin: 3, rellanoKm: 0.5 },
    calendario: { muroMin: 0.01, puncheurMin: 0.08 },
  },
  pancarta: { cimaMinKm: 1.5 },
  edicion: { baseSeason: 0, activa: true, nivel: 1, kmJitter: 0.06, vueltasJitter: 0.5, motivoNuevo: 0.35 } as EdicionCfg,
  km: {
    porClase: { /* tabla 12.7 */ } as Record<Exclude<RaceClass, 'NC'>, Record<PapelKm, MinRango>> & { NC: { ruta: MinRango; rutaU23: MinRango; crono: MinRango; cronoU23: MinRango } },   // columnas de KmRole en NC (sección 7 §7.4)
    maxPorClase: { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 } as Record<RaceClass, number>,
  },
  pesoPorClase: PESO_POR_CLASE,                            // Record<SkeletonId, Record<RaceClass, number>>, 32 × 5, sin entradas ausentes
  pesosComposicion: { /* tabla 12.8 */ } as Record<Relieve, Partial<Record<StageRole, number>>>,
  bloques: { gv: { descansos: [9, 15] as Rango, primeraSemanaFinalesAlto: 1, maxAltaMontana: 7, minLlanasEntreBloques: 2 } },   // sin `reina`: la ventana es ventanaReina(n), sección 7 §7.2 (12.8)
  itinerario: { avance: 0.6, transicion: 0.4, cronoescaladaP: 0.08 },
  anticlon: { maxCorrelacion: 0.85 },
  arranque: { objetivoMs: 1500, techoMs: 2500, porTemporadaMs: 1000, maxTemporadasEnMemoria: 8 },
} as const
```

Tres reglas sobre el bloque. Primera: ningún fichero de `routes/grammar/` lleva un número de intención que no esté aquí; `motifs.ts`, `place.ts`, `render.ts`, `veto.ts`, `edition.ts` y `tour.ts` importan `ARCH` y no escriben literales (el test de la sección 15, paso 3, hace `grep -n '[0-9]\.[0-9]' routes/grammar/*.ts` y exige que cada número que aparezca sea un índice, un `0.1` de redondeo o esté en un fichero de datos). Segunda: `ARCH` no contiene ningún umbral que el motor o el clasificador ya tengan; donde el generador necesita el mismo número que `routes/` o `STAGE`, lo importa (`ARCH.pancarta.cimaMinKm` se declara igual a `CLIMB_MIN_KM`, `ARCH.reina.subidaLejanaKm` igual a `STAGE.climbRaceKmToGo`, `ARCH.motivo.muro.km[1]` igual a `STAGE.wallMaxKm` y `ARCH.motivo.muro.gMin` igual a `STAGE.wallMinGradient`, y el test de 12.14 lo comprueba para que no se separen en silencio). Tercera: la dependencia va en un solo sentido, `routes/grammar/* → constants.ts`; `constants.ts` no importa valores de `routes/grammar/` (solo `import type`) ni reexporta nada de allí, y 12.14 lo sella leyendo el fuente.

### 12.2 `ARCH.motivo`: los rangos de cada motivo

| Constante | Valor | Intención | En qué se apoya |
| --- | --- | --- | --- |
| `motivo.cota.km` | [2,5; 8,0] | Cota de media montaña. El techo 8,0 deja 0,5 km al umbral `PASS_MIN_KM` 8,5 con el que `stageKindOf` llama reina a una etapa (`stageKind.ts` l. 62, l. 90); el suelo 2,5 es el techo del muro (`STAGE.wallMaxKm`), así que una subida es muro o cota y nunca las dos cosas | hoy [3; 7] (`profileGen.ts` l. 247); Jaizkibel 7,9 y Arrate 5 (mapa 07 §3, fila 3.8); medido: la cota más larga de `hillyUphill` llega hoy a 8,5 y 2 de 1.500 salen reina (mapa 01 §2.3 y §5.1) |
| `motivo.cota.g` | [4; 8] (8 excluido: `between` es semiabierto) | La pendiente media de una cota. El techo es `STAGE.wallMinGradient` 8 (`constants.ts` l. 1685): al 8 % o más una subida se lee como muro, y por eso `muro.g` empieza donde `cota.g` termina. No es una regla del motor: el motor pone COL en todo bloque de subida con `g ≥ wallMinGradient` sin mirar la longitud (`riderPerfil`, `stage/simulate.ts` l. 471), de modo que un tramo de una cota al 7,5 % que `climb` suba por encima del 8 % corre con COL igual que un muro, y `isWall` (`stage/sample.ts` l. 146-154) está exportada pero ningún código del motor la llama (solo `sample.test.ts` l. 90-92). Es la frontera con la que un aficionado, `stageKindOf` (que no lee la pendiente para `kind`, `stageKind.ts` l. 60-64) y esta gramática separan cota y muro. Con techo 7, como estaba en §B.3, desaparecían las cotas al 7-8 % que firman `cantabrico` y `ardenas` (Arrate 5 × 7,4, mapa 07 §3 fila 3.8) y toda cota de media tenía una sola pendiente posible; `GeoSignature.cota.g` estrecha por zona (sección 6) | hoy [4,5; 6,5] (l. 248); mapa 07 §3 filas 3.2 y 3.8 |
| `motivo.puerto.km` | [9,0; 25] | Puerto de alta montaña. Suelo 9,0 (0,5 sobre 8,5) para que un puerto sea reina por construcción y no por redondeo; techo 25 (Croix de Fer 29 es rareza). El hueco [8,0; 9,0] se asume: ninguna dificultad generada mide entre 8,0 y 9,0 km, y Ghisallo (8,6) sale como 9,0. Es un sacrificio documentado, no un defecto (sección 17, riesgo 6) | hoy intermedios [6; 11] y final [9; 15] con `escala` hasta 1,8 (l. 359-362, l. 374), lo que da cotas de 8,4 a 26,7 km (mapa 01 §2.5); el suelo 8,6 de `garantizaPuerto` (l. 387) tenía 0,1 de holgura y falla 1 de 1.500 por la diferencia entre `segment.km` y Σ tramos (mapa 01 §5.1) |
| `motivo.puerto.g` | [5; 12] | Rango GLOBAL de pendiente media de un puerto; el que manda es `GeoSignature.puerto.g` de la zona (sección 6), que solo puede estrechar. El techo es 12 y no 9 porque una intersección nunca ensancha: con 9 ningún puerto generado superaba el 9 % en ninguna zona, y quedaban fuera el Angliru (12,5 km × 9,8), el Zoncolan (10,1 × 11,9) y el Mortirolo, que son la firma de `cantabrico` y `dolomitas` (mapa 07 §3 filas 3.7 y 3.8): la reina cantábrica y la alpina compartían techo de pendiente, que es "siempre los mismos modelos". Nada del motor lo impide (V15 acota tramos a g ≤ 20; `climb` reparte rampas) y `ARCH.veto.puertoDplusMax` acota el producto km × g por altitud (Angliru 1.225 m ≤ `media` 1.300) | mapa 07 §4.3 (Galibier 5,1, Alpe 8,1, Loze 6, Angliru 9,8); la sección 6 tiene que subir el techo de `cantabrico` y `dolomitas` a 12 (hoy 9) conservando sus suelos |
| `motivo.puerto.rampaIrregular` | { km: [0,3; 0,8], g: [11; 13] } | La rampa que abre brecha en un puerto `forma: 'irregular'`: SPEC §6.17 promete que el irregular abre ≥ 1,5× la brecha del regular; a ≥ 8 % el motor usa COL (`wallMinGradient` 8) | mapa 05 §1.4 (SPEC §6.17); hoy el ruido de `climb` es ±1,2 sobre la media (l. 78), sin rampa marcada |
| `motivo.muro.km` | [0,4; 2,5] | Muro: techo 2,5 = `STAGE.wallMaxKm` (`constants.ts` l. 1684), que es la longitud máxima de un muro según SPEC 6.4 tal como la codifica `isWall` (`stage/sample.ts` l. 146-154: subida total ≤ 2,5 km con algún tramo ≥ 8 %). `isWall` no tiene llamadores en el motor (el COL lo decide `riderPerfil` bloque a bloque con `g ≥ 8`, `stage/simulate.ts` l. 471), así que el 2,5 no cambia la física: fija qué llama muro la gramática con la misma vara que la SPEC; suelo 0,4 = `STAGE.finishClimbMinKm` (l. 4452), por debajo el motor no lo lee como cota. §B.3 ponía el techo en `WALL_MAX_KM` 3 (`stageKind.ts` l. 60, frontera clásica/media) y eso dejaba la franja [2,5; 3,0] con dos lecturas (muro para el clasificador, no muro para SPEC 6.4 y `isWall`); se cierra con el umbral de `STAGE`, que es el más estrecho, y `meta.muro.km` [0,5; 2,2] queda dentro. Sacrificio: un muro vasco de 3 a 4 km al 12 % (mapa 07 fila 3.8) no existe en la gramática, ni como muro (> 2,5) ni como cota (g ≥ 8); se anota en la sección 17 | Kwaremont 2,2, Paterberg 0,36 (mapa 07 §1.3); hoy [1; 2,5] (l. 477) |
| `motivo.muro.g` / `.gMin` | [8; 16] / 8 | Pendiente media del muro y suelo de cada rampa: 8 = `STAGE.wallMinGradient` (l. 1685), 16 = Sormano 15,8. `gMin` es el recorte de rampas de `climb(rand, len, avg, { gMin, gMax })` en un muro (sección 4 §4.2): ningún tramo baja del 8 %, así el motor ve COL en todo el muro | Koppenberg 11,6 (mapa 07 §1.3); hoy [8; 12] (l. 478) |
| `motivo.muro.gMax` | 16 | Tope de rampa DENTRO de un muro: `climb(rand, len, avg, { gMax })` recorta cada tramo. Hoy `climb` (l. 72-82) suma `prog·1,6 + U(−1,2; 1,2)` sin tope y saca rampas del 14,8 % en muros al 12 (mapa 01 §2.4); lo real es 15-26 % en puntas de 100 m que un tramo de 0,5 km no debe promediar | mapa 01 §2.4 |
| `motivo.cadena.hijos` / `.enlace` | [2; 8] / [1,5; 6] km | Una `cadena` son de 2 a 8 cotas o muros seguidos sin valle, y entre cada dos hay exactamente una separación (`Motif.separaciones`, no un hijo `enlace`) de [1,5; 6] km (Ronde: de 16 a 19 cotas en 2 a 4 cadenas; Amstel: de 33 a 34). El suelo 1,5 es `colocacion.enlaceMinimo`: es la única forma de que dos dificultades se acerquen a 1,5 km, y aun así no se tocan. La sección 8 usa este nombre (`cadena.enlace`) para la separación de los hijos, no `cadena.separacion` | sección 4 §4.2 y §4.5 (arquitectura §3.1 y §3.3); mapa 07 §1.3 y §1.6 |
| `motivo.sector.km` | [0,3; 3,7] | Longitud de sector de adoquín | Roubaix 0,3-3,7 (mapa 07 §1.4); hoy [2; 4] (l. 496) |
| `motivo.sector.estrellas` | [1; 5] | Dureza del sector; `paves` con `estrellas` es lo que el motor lee (`sample.ts`, mapa 03 §3) | hoy `[3, 5, 4]` fijos (l. 495) |
| `motivo.racimo.sectores` | [4; 10] | Sectores por racimo | Roubaix: 29-31 sectores en 3-6 racimos (mapa 07 §1.4) |
| `motivo.racimo.km` | [10; 60] | Longitud de un racimo, `Σ sectores + Σ separaciones`, que `validateMotif` comprueba (sección 4 §4.5 regla 1). Suelo 10 por Denain y Tro Bro Léon, racimos de 4 sectores cortos de 10 a 22 km; los de Roubaix miden de 26 a 40 km | sección 5 §5.4; mapa 07 §1.4 |
| `motivo.racimo.separacion` | [2; 6] km | Asfalto entre sectores del mismo racimo: impide reagrupar; por debajo de 2 el motor los vería como uno | mapa 07 §1.4 |
| `motivo.circuito.kmVuelta` / `.vueltas` | [1,5; 30] / [2; 40] | El rango ANCHO de una vuelta de circuito y de su número de vueltas, del critérium (2,5 km × 22) a las dos vueltas de la Flèche y las 17 de Montréal; cada esqueleto lo estrecha con `Slot.params.kmRango` y `.vueltasRango` (sección 5). El rendido usa la MISMA semilla de detalle por vuelta (sección 8) | sección 4 §4.2; Québec 12,6, Montréal 17-18, Great Ocean 4, Mundial 12-27 (mapa 07 §1.1 y §1.7) |
| `motivo.circuito.maxHijosShare` | 0,8 | Fracción máxima de la vuelta que ocupan sus dificultades (enlaces aparte); por encima el circuito no cabe y `validateMotif` lo rechaza. Se recalibra en el paso 3 si un circuito real no cabe | sección 4 §4.5 (juicio de esa sección) |
| `motivo.tendida.km` / `.g` | [5; 30] / [1,5; 3,5] | Falso llano largo tipado `llano` con tramos: desgasta, no selecciona y no suma `kmSubida`, porque el motor cuenta por tipo (mapa 03 §4.1) y `gradientAt` (`stage/sample.ts` l. 47-56) lee la pendiente del tramo | Sanremo (Turchino), Almería (mapa 07 §1.5) |
| `motivo.descenso.km` / `.g` | [2; 25] / [−8; −3] | La bajada DECLARADA en el esqueleto (la del Poggio, la de Civiglio), distinta de la canónica que el rendido añade tras cada puerto. Pendiente: hoy `descent` (l. 85-93) no baja de −2 y usa 5 o 6 de media (l. 257, l. 396) | sección 4 §4.2; `MAX_DESCENT_GRADIENT` 12 de `featureProfile.ts` l. 142 (mapa 01 §6) es el tope duro |
| `motivo.descenso.kmPorDesnivel` | { perdidaPorKm: 55, kmMin: 2, kmMax: 10 } | LONGITUD de la bajada canónica tras un puerto o una cota que no sea de meta: `clamp(len·g·10/55, 2, 10)` km, es decir, lo subido se pierde a 55 m por km y lo que no cabe en 10 km se queda arriba (Galibier a Lautaret). Es la regla que hoy solo tiene `mountainClassicSegments` (l. 467) con otro techo (`0,6·runIn`); la pendiente de esa bajada la fija `colocacion.bajadaTrasPuerto` (12.5) | `profileGen.ts` l. 467; sección 8 §8.6 punto 1 |
| `motivo.enlace.km` | [1; 300] | Un enlace (relleno) mide entre 1 y 300 km; por debajo de 1 no hay enlace (dos dificultades se tocan: `colocacion.enlaceMinimo`), y el techo es el de una etapa entera porque la aproximación de una clásica es UN solo motivo (sección 4 §4.2: los 96 km de Roubaix hasta Troisvilles, una llana de 215 km) | hoy `rolling` trocea en `U(3; 6)` km (l. 102) |
| `motivo.enlace.ampMax` | 2,4 | El relleno nunca alcanza el 3 % que `finish.ts` lee como cota (`STAGE.finishClimbMinGradient` 3, l. 4446): así un enlace no fabrica un final de escaladores. Hoy `rolling` "bumpy" llega a 3,2 (l. 105) | `constants.ts` l. 4446; `GeoSignature.amplitud` es el valor por zona y este es su tope (`geo.test.ts`, sección 6) |
| `motivo.expuesto.km` / `.amp` | [5; 120] / 0,5 | Pólder, desierto, meseta: llano abierto de amplitud FIJA y baja. La amplitud efectiva es `min(ARCH.motivo.expuesto.amp, geo.amplitud)`: un `expuesto` nunca ondula más que el `enlace` de la zona que lo rodea (`flandes` 0,55, `golfo` 0,4, sección 6). A 0,5 el relleno rinde del orden de 1,5 m/km, unos 300 m de D+ en 200 km, que es Brugge-De Panne; con el 1,0 de §B.3 habría rendido el doble (el `rolling` de hoy da de 5,1 a 6,6 m/km a amplitud 1,8, mapa 01 §1, y el D+ crece con la amplitud) y el "llano abierto" habría sido el tramo más rompepiernas de una etapa flamenca. La cifra se recalibra en el paso 3 con `dPlusDe` sobre 300 enlaces, como `reina.rellenoDplusPorKm`. Techo 120 km: Roubaix hasta Troisvilles son 96. El motor no lo distingue de `enlace` (decisión 17) | mapa 07 §1.5 y §3 fila 3.1; sección 4 §4.2 |

### 12.3 `ARCH.meta`: los nueve finales

Todas las cifras de valle llevan 0,7 km de holgura sobre los cortes 0,5 / 5 / 20 de `FINAL_KIND_CUTS` (`finalKind.ts` l. 30). La razón es medida: los rangos de `valleyKmFor` (`profileGen.ts` l. 330-335) están alineados con los cortes SIN holgura y `normalize` estira un valle de 20 a 20,3, con lo que 4 de 6.000 reinas forzadas cambian de cubeta (mapa 01 §2.5). El 0,7 y no 0,5 es porque `emitirPancartas` (sección 8 §8.10) escribe el km de la pancarta `cima` al entero, `Math.round(cum)`, exactamente como hoy `auto()` (mapa 01 §5.2), y `lastClimbKm` (`finalKind.ts` l. 46-57) lee pancartas: ese redondeo puede desplazar hasta 0,5 km la distancia medida; 0,2 más cubre el residuo de `normalizeEnlaces` (sección 8 §8.8). Si la sección 8 pasara la pancarta al 0,1, la holgura necesaria bajaría a 0,2 y `veto.margenValleKm` con ella; hoy no lo hace.

| Constante | Valor | Intención | En qué se apoya |
| --- | --- | --- | --- |
| `meta.repecho` | { km: [1; 2,9], g: [5; 7], gMin: 4, gMax: 7,9 } | Cota corta y suave en meta: `finishType` la lee `puncheur`, nunca `alto`, porque queda bajo `STAGE.finishAltoMinKm` 3 (l. 4458); `gMax` 7,9 deja toda rampa bajo `wallMinGradient` 8 para que ningún repecho se lea como muro (sección 4 §4.5, con test de igualdad) | `constants.ts` l. 4458; Cauberg 1,2 km al 5,8 % (mapa 07 §1.3) |
| `meta.muro` | { km: [0,5; 2,2], g: [8; 16], aproxKm: 2, aproxAmp: 2,5, finishMuroMaxKm: 1,0 } | Muro de meta. Con ≤ 1,0 km `finishType` dice `muro` (`STAGE.muroMaxKm` 1, l. 5346; `muroMinGradient` 8, l. 5347); por encima de 1,0 y hasta 2,2 dice `puncheur`, y la tabla de `MetaKind` de la sección 4 lo declara así (Huy 1,3 y San Luca 2,1 son `puncheur` en el motor y "es correcto", `finish.ts` l. 147-148). `aproxKm` 2 a amplitud ≤ 2,5 es la aproximación diseñada contra `deriveFinishTerrain`: `finishClimbGapBlocks` 5 (l. 4449) tolera 500 m de rellano dentro de una cota, y un enlace ondulado pegado al muro lo fundiría con él o lo partiría; a 2,5 % ningún bloque de la aproximación llega al 3 % que cuenta como subida | `constants.ts` l. 4446-4449, l. 5346-5347; mapa 07 §1.2 (Huy 1,3 al 9,6, San Luca 2,1 al 10,8); `routeCensus` mide `muro` ≥ 1 % y `puncheur` ≥ 8 % del calendario (V11, V16) |
| `meta.altoCorto` | { km: [3; 7], g: [6; 11] } | Final en alto corto: `alto` para `finalKindOf` (0 km tras la cota) y para `finishType` (≥ `finishAltoMinKm` 3); ≤ 7 para no rozar la puerta de reina | Planche 5,9 × 8,5, Xorret 3,9 × 11,4, Tre Cime 7,2 (mapa 07 §4.3); hoy `hillyUphill` [4; 7,5] al [5; 7,5] (l. 280-283) |
| `meta.altoLargo` | { km: [9; 22], g: [6; 12], gMaxSiMasDe17: 7 } | Final en alto de reina: el 70-80 % de los finales en alto de gran vuelta miden 8-22 km al 6,5-9 %; por encima de 17 km la pendiente media se recorta a 7 (Loze 28,1 × 6, Bondone 21,4 × 6,7: los largos son suaves). Suelo 9 por `PASS_MIN_KM` con 0,5 de holgura. El techo 12 es global como el de `motivo.puerto.g` y por la misma razón (Angliru, Zoncolan); la zona estrecha | mapa 07 §4.3; hoy [9; 15] al [7,5; 9,5] (l. 362-363) |
| `meta.cimaCerca.valle` | [1,2; 4,3] | Se corona y se baja a meta: `cima_cerca` de `finalKindOf` (0,5 < tras ≤ 5) | hoy [1,5; 5] (l. 332); 1 de 1.500 cruzaba a `valle_corto` (mapa 01 §2.5) |
| `meta.descensoMeta.valle` | [5,7; 19,3] | `valle_corto` (5 < tras ≤ 20) | hoy [6; 20] (l. 333); 3 de 1.500 cruzaban a `valle_largo` |
| `meta.valle.valle` | [20,7; 45] | `valle_largo` (> 20) | hoy [22; 45] (l. 334) |
| `meta.sectorMeta.aMeta` | [1; 8] | Último sector de adoquín a [1; 8] km de meta; hoy cae a ~40 km porque `split` reparte el relleno en cuatro (mapa 01 §2.7) | Carrefour de l'Arbre a 17, Roubaix (velódromo) a 1,1 (mapa 07 §1.4) |
| `meta.unDiaUltimaCota` | { km: [1,3; 4,2], g: [7; 11], aMeta: [3; 17] } | El caso v40 escrito en positivo: en una carrera de un día la última COTA mide [1,3; 4,2] km y corona a [3; 17] km de meta. Si la etapa muere arriba no es esta constante sino `meta.muro` ([0,5; 2,2] km) o, como rareza, `ud_montana_alto` (decisión 5). Es el rango que V5 hace cumplir (sección 9). Como referencia, no como rango: la fila real de `datos.md` §1.4 da p10 / p50 / p90 de 0,5 / 1,0 / 2,1 km para la última cota de un día y 0 / 7,8 / 20,8 km a meta, porque mezcla muros de meta y cotas | mapa 07 §4.3 (Roche-aux-Faucons 1,3 a 13,5; Civiglio 4,2; Colle Aperto 1,2 a 3); hoy `mountainClassicSegments` [4; 8] al [7,5; 10] con run-in [13; 22] (l. 452-454) |

### 12.4 `ARCH.reina`: el desnivel, la verdad y la cola baja

| Constante | Valor | Intención | En qué se apoya |
| --- | --- | --- | --- |
| `reina.dPlusIncluyeRelleno` | `true` | `Skeleton.dPlus` es el desnivel TOTAL, relleno incluido, medido con `dPlusDe(profile)` (Σ `climbMetres` de todos los segmentos), que es la cifra `metres` que `stageKindOf` compara con 3.200 (`stageKind.ts` l. 80-90). `calendarQueens::desnivelDe` (l. 54-58) NO mide eso: suma bloques `subida`, y `blockTerrain` (`sample.ts` l. 32-44) solo da `subida` a los segmentos `puerto`, así que mide los puertos solos, igual que el objetivo de hoy (`dPlusOf`, `profileGen.ts` l. 325; `dPlusBase` l. 373). El relleno añade de media 1.017 m sobre 2.840 en una reina de 175 km: por eso `CalendarQueen.dPlus` pasa a `dPlusDe` en el paso 9 y las cubetas de `BANDAS_DESNIVEL` cambian de población (sección 13 §13.4 punto 2; sección 8 §8.5) | mapa 01 §1 y §2.5; el censo imprime `dPlus` y `dPlusBloques`, cuya diferencia es el relleno y no un error (fila informativa `dplus.relleno`, sección 13) |
| `reina.rellenoDplusPorKm` | 5,5 m/km | Estimación del D+ del relleno para cuadrar el objetivo sin llamar a `sampleProfile`: a 5,5 m/km, 100 km de enlace son 550 m. Es el centro de lo medido (661 a 1.413 m en llanas de 130 a 215 km, es decir, 5,1 a 6,6 m/km) y se recalibra en el paso 3 del plan con `dPlusDe` sobre 300 enlaces por zona | mapa 01 §1; con `amplitud` por zona el valor real varía y por eso la verificación final es `dPlusDe(profile)` y no la estimación |
| `reina.escalaDificultades` | [0,7; 1,4] | Cuánto se alargan o acortan las dificultades no firma para cuadrar el desnivel. Hoy [0,55; 1,8] (l. 374), y con 1,8 un final de 15 km llega a 27 (mapa 01 §2.5); con 0,55 un puerto de 9 se quedaba en 5 y la reina dejaba de serlo (l. 380-386). A [0,7; 1,4] ningún puerto sale del rango de `motivo.puerto` si entró en él | `profileGen.ts` l. 374, l. 387 |
| `reina.verdad` | { puertoMetaMinKm: 9, dPlusMin: 3400 } | V8a: una reina lo es por un puerto ≥ 9 km en meta, o dos puertos ≥ 9 km, o D+ ≥ 3.400 m (200 sobre `QUEEN_MIN_CLIMB_METRES` 3.200, `stageKind.ts` l. 64). No aplica a `et_reina_blanda` | sección 9; `epics.md` E3 (`reina-150`: *media montaña con la etiqueta cambiada*) |
| `reina.subidaLejanaMin` | 0,25 | V8b: al menos el 25 % de los km de subida a más de `subidaLejanaKm` de meta. Es la variable que separó `reina-150` de las reales: 0 % contra 6-38 % (mapa 04 §3.2), con la fuga ganando el 27-30 % en el banco y el 3,3 % en las reinas de verdad (mapa 04 §3.3). Aplica a TODA reina, blanda incluida | mapa 04 §3.2-3.3 |
| `reina.subidaLejanaKm` | 30 (= `STAGE.climbRaceKmToGo`, `constants.ts` l. 3820) | Los 30 km son los del motor: solo se ataca un puerto si quedan ≤ 30 km o es final en alto (mapa 03 §4.2). Una subida a más de 30 km se sube a tempo y desgasta sin seleccionar, que es lo que le faltaba a `reina-150`. Se declara como referencia al motor y el test de §12.14 falla si se separan | `constants.ts` l. 3820; mapa 03 §4.2 |
| `reina.blandaShare` | { media: 0,25; montana: 0,25; alta: 0,10 } | Probabilidad, por cada etapa cuyo papel empieza por `reina_` (o cuya edición real es `mountain`), de que el esqueleto sea `et_reina_blanda` (D+ [1.500; 2.500] con relleno) en lugar del que tocara por peso, según el `Relieve` de la zona de meta. Regla implementable, la de la sección 5 §5.7 (regla 1): en `elegirEsqueleto`, ANTES del sorteo por pesos y con el mismo `rng` del subflujo `arch` de la etapa (sección 8 §8.2), `rand() < blandaShare[geo.relieve]` decide; en `llano` y `ondulado` no hay entrada (no hay reina) y la cuota es 0. Excepción: con `req.format === 'gran-vuelta'` no se tira ni se consume tirada (sus reinas van por peso: las cuatro formas ya dan la variedad, y la reina de la tercera semana tiene que ser de verdad). Es una probabilidad por etapa y no una cuota por vuelta: una `vu_corta` con una sola reina en relieve `media` la tiene blanda con p 0,25, sin redondeo ni estado entre etapas. La regla, con la excepción, está escrita con las mismas condiciones en la sección 5 (§5.7 regla 1), en la sección 7 (§7.2, párrafo de `ultima`) y en la sección 8 (§8.2 punto 3, `req.format !== 'gran-vuelta'`). Es la cola baja de desnivel que `calendarQueens.test.ts` l. 60-64 exige (`facil.races > 0` l. 60, `dura.races > 0` l. 61 y "la banda de <1.500 m NO se queda vacía", `stats.dPlus.min < 1500` l. 64; comentario de `constants.ts` l. 1243-1257), decidida en el diseño y no en el test, como pide el mapa 06 §6.3. Sustituye al 60/40 de `ROUTE.queenHighDplusShare` | `calendarQueens.ts` l. 90-95 (`BANDAS_DESNIVEL`); mapa 06 §6.3; sección 5 §5.7 y su test "la reina blanda sale con la cuota"; D6 (sección 18) vigila la cubeta tras el paso 9 |

### 12.5 `ARCH.colocacion`, `ARCH.veto` y `ARCH.pancarta`

| Constante | Valor | Intención | En qué se apoya |
| --- | --- | --- | --- |
| `colocacion.enlaceMinimo` | 1,5 km | Dos dificultades nunca se tocan salvo dentro de una `cadena`: `finishClimbGapBlocks` 5 son 0,5 km de rellano tolerado dentro de una cota, y con menos de 1,5 el motor fundiría dos muros en uno; margen ×3 | `constants.ts` l. 4449; Vieux Quaremont (cima 225,7) y Paterberg (227,4), 1,7 km entre cimas, es el par más pegado del corpus (`classicRoutes.ts` l. 453-454) |
| `colocacion.enlaceMinimoTotal` | 0,12 | Fracción mínima de la etapa que es enlace; si las dificultades no dejan el 12 %, V10 ("cabe") rechaza. Hoy 0,15 en reina (l. 390) y 0,35 / 0,3 / 0,5 en las demás formas (mapa 01 §2) | `profileGen.ts` l. 390; Catalunya e4 real, 38 de los últimos 50 km en puerto, es el extremo (`realQueens.ts`) |
| `colocacion.bajadaTrasPuerto` | [0,6; 0,9] | FRACCIÓN del desnivel del puerto que la bajada canónica devuelve, sorteada en `pos`; fija la PENDIENTE, no la longitud: con la longitud `kmBaj` de `motivo.descenso.kmPorDesnivel`, `g = −clamp(f·len·g / kmBaj, 3, 6,5)`, y el techo 6,5 existe porque `descent` (l. 85-93) añade `U(−1,5; 1,5)` sobre la media (l. 90), de modo que ninguna rampa cruza el −8 de `motivo.descenso.g`. Cuando el clamp de longitud actúa (10 km), la bajada devuelve menos de `f` y el resto se queda arriba. Es la regla de la sección 8 §8.6 punto 1; `featureProfile.ts` baja el 85 % de lo subido en lo real (mapa 01 §6) | sección 8 §8.6; mapa 01 §6 |
| `colocacion.maxIntentos` | 8 | Reintentos (`mot`, `pos`, `dib` con `i{intento}`) antes de caer a la plantilla canónica con `degradado: true`. Se mide el p95 en el paso 5 (el primero con `generateStage` y reintento) y, si sobra, se recorta | coste: 8 renderizados de geometría pura, sin `sampleProfile` (sección 14) |
| `veto.margenClaseKm` | 0,3 | `garantizaClase` lleva el puerto que decide a 8,5 + 0,3 (reina) o 8,5 − 0,3 (media) compensando en el enlace más largo. El 0,3 cubre la diferencia entre `segment.km` y Σ tramos redondeados a 0,1 (hasta 0,2 medidos: `mountain 175 semilla-167` con segmento 8,6 y tramos 8,4) | mapa 01 §5.1: 3 de 1.500 clasificaciones cruzadas en el borde de 8,5 |
| `veto.margenValleKm` | 0,7 | La misma red sobre los cortes 5 y 20 de `FINAL_KIND_CUTS` cuando `garantizaClase` recorta un valle; es la holgura de 12.3 hecha regla | mapa 01 §2.5 (4 de 6.000) |
| `veto.margenClaseMetros` | 300 | La red de `QUEEN_MIN_CLIMB_METRES` 3.200 (`stageKind.ts` l. 64) vista desde una media: si en un esqueleto `kind: 'media'` la suma `Σ km·g·10` de las dificultades supera 3.200 − 300 = 2.900 m, la persecución del desnivel (sección 8 §8.5) escala HACIA ABAJO, para que una media no salga reina por desnivel. 2.900 es el techo de `Skeleton.dPlus` de todos los esqueletos `media` del catálogo (sección 5 §5.2 y §5.3) y el margen es el mismo 200-300 que `reina.verdad.dPlusMin` deja por arriba | sección 5 §5.1; `stageKind.ts` l. 56-58 y l. 90 |
| `veto.fallbackMaxShare` | { calendario: 0, testPorEsqueleto: 0,005 } | Cero etapas degradadas en las 1.418 del calendario (un fallback es un defecto de rango, no una salida válida) y ≤ 0,5 % en el test de 300 semillas × zona compatible por esqueleto | criterio de diseño; `routeCensus` cuenta `degradado` |
| `veto.intentosP95` | 3 | Si el p95 de `intentos` por esqueleto supera 3 en el paso 5, se estrechan los rangos del esqueleto antes que subir `maxIntentos`: un esqueleto que necesita más de tres intentos está mal acotado | sección 17, riesgo 9 |
| `veto.segmentoMinKm` | 0,5 | V10: ningún segmento por debajo salvo dos excepciones (sección 9 §9.2, `cortoAdmitido`): el `puerto` de UNA rampa con `km ≥ motivo.muro.km[0]` 0,4 (el muro corto de §4.2) y el `paves` con `km ≥ motivo.sector.km[0]` 0,3. Fuera de ellas es el suelo que `split` impone a cada trozo (`profileGen.ts` l. 52-65, `Math.max(0.5, …)` l. 58) y el umbral con que `rolling` descarta huecos (l. 101). El test de hoy (`calendar.test.ts` l. 92-108) solo exige `seg.km > 0` | sección 9 §9.1 |
| `veto.kmTolerancia` | 0,05 | V10: `|Σ km − kmObjetivo| ≤ 0,05`, o sea igualdad al 0,1. Más fina que el contrato de hoy, que es al entero (`calendar.test.ts` l. 148-149); el 0,1 lo sella `calendario.test.ts` | sección 9 §9.1 (ingeniero §4.5) |
| `veto.pendientes` | { gMax: 20, gMin: −14, subidaGMin: 1 } | V15: ningún tramo con `g > 20` ni `g < −14`; ningún segmento `puerto` con un tramo bajo el 1 %. Son salidas del ruido de `climb` (`Math.max(1, …)` en l. 78 ya lo garantiza por abajo; `muro.gMax` 16 deja margen por arriba) | mapa 01 §2.4; sección 9 |
| `veto.puertoLargoKm` | 15 | V4(b): un `puerto` de 15 km o más solo existe con `geo.altitud ∈ {media, alta, altiplano}` | mapa 07 §4.4 regla 5; sección 9 |
| `veto.puertoDplusMax` | { mar: 500, colina: 800, media: 1.300, alta: 2.100, altiplano: 1.500 } | V4(c): techo de desnivel de UN puerto por altitud de la zona, integrado por tramos (`climbMetres`), porque una intersección de rangos acota `km` y `g` por separado y nunca su producto (Angliru 12,5 × 9,8 = 1.225 en `media`; Alpe 13,8 × 8,1 = 1.118; Loze 28,1 × 6 = 1.686 en `alta`). La sección 8 §8.5 sortea `g` DESPUÉS de `km` con este techo, así V4(c) no dispara en el calendario | mapa 07 §4.2-4.3; sección 9 §9.1 (decisión de esa sección) |
| `veto.llana` | { dPlusMax: 1.800, cotaKm: 2,5, cotaG: 5, ventanaKm: 15, rachaGMin: 3, rellanoKm: 0,5 } | V9: una llana tiene `dPlusDe ≤ 1.800` y ninguna racha de ≥ 2,5 km a ≥ 5 % de media que termine en los últimos 15 km. Racha (`rachasDeSubida`, sección 9 §9.2): tramos consecutivos, cruzando segmentos, con `g ≥ rachaGMin` 3 (= `STAGE.finishClimbMinGradient`), con rellanos de `≤ rellanoKm` 0,5 km (= `finishClimbGapBlocks` 5 × `dx` 0,1) absorbidos; `veto.test.ts` sella las dos igualdades y `ventanaKm === STAGE.finishClimbSearchKm` (una llana de 2.500 m es media; hoy el relleno solo ya da de 661 a 1.413 m) | mapa 07 §4.4 regla 10; mapa 01 §1; sección 9 |
| `veto.calendario` | { muroMin: 0,01, puncheurMin: 0,08 } | V11 sobre las etapas en línea generadas del calendario: `finishType` `muro` ≥ 1 % y `puncheur` ≥ 8 % (hoy 0 de 1.075 tipan `muro`, balance v60 §12). Se mide en `routeCensus`, nunca por intento | decisión 7; sección 9 y 13 |
| `pancarta.cimaMinKm` | 1,5 (= `CLIMB_MIN_KM`, `finalKind.ts` l. 33) | `emitirPancartas` pone `cima` al final de todo `puerto` ≥ 1,5 km, SIEMPRE en el último `puerto` de la etapa (así `lastClimbKm` ve el muro de meta, mapa 01 §5.2) y, dentro de un `circuito`, UNA sola por cota del circuito ≥ 1,5 km, en su último paso (no una por paso: 17 pasos por Camillien-Houde serían 17 pancartas, 34 de depósito y 85 km de alivio; sección 8 §8.10). `routeCensus` imprime `nPancartas` con la banda informativa ≤ 6 en un día. Un muro de 400 m no es un GPM: no puntúa ni cuenta para `finalKindOf` | `finalKind.ts` l. 33, l. 46-57; sección 8 §8.10 |

### 12.6 `ARCH.edicion`: lo que mueve una temporada

Los valores por defecto son los de la decisión D7 del dueño (sección 18): activa, nivel 1. El bloque se declara con el tipo ancho `EdicionCfg` (12.1) y no con el literal que `as const` inferiría, porque con `activa: true` literal no habría forma tipada de apagarlo: el interruptor se usa pasando OTRA configuración, `calendarForSeason(season, cfg: EdicionCfg = ARCH.edicion)` (sección 10 §10.5), nunca mutando `ARCH`. La memoización de `calendarForSeason` está indexada por la REFERENCIA de `cfg` y por temporada (`Map<EdicionCfg, Map<number, CalendarRace[]>>`, sección 10 §10.5), de modo que un test con `{ ...ARCH.edicion, activa: false }` tiene su propio mapa y no ensucia el de producción; no hace falta un `resetSeasonCache()` (la sección 10 §10.9, en la nota de su test "con activa = false toda temporada es la 0, sin mutar ARCH", lo dice igual: ni `withArch` ni vaciado; la sección 13, fila 15 de §13.2, y la 14, §14.5, usan el mismo mecanismo). El tope `ARCH.arranque.maxTemporadasEnMemoria` (12.9) se aplica solo al mapa de `ARCH.edicion`, que es el de producción (sección 3 §3.8, sección 14 §14.5). La sección 10 (§10.3) y la sección 3 (§3.8) importan `EdicionCfg` de `constants.ts` con `import type` y no lo derivan con `typeof ARCH.edicion`; `baseSeason` va dentro porque `BASE_SEASON = ARCH.edicion.baseSeason` (sección 10 §10.2, sección 3 §3.8).

| Constante | Valor | Intención | En qué se apoya |
| --- | --- | --- | --- |
| `edicion.baseSeason` | 0 | La temporada con que nace un mundo: `calendarRun.ts` l. 135 hace `season = Math.floor(gameDay / SEASON_DAYS)` y el primer año es la 0. No es perilla (tipo literal `0` en `EdicionCfg`): vive aquí para que `edition.ts` la reexporte como `BASE_SEASON` sin que `constants.ts` importe valores de `routes/grammar/` | sección 10 §10.2; decisión 21 |
| `edicion.activa` | `true` | Interruptor: con una `cfg` con `activa: false`, `calendarForSeason(s, cfg)` devuelve para toda `s` la misma referencia que para `BASE_SEASON` 0 (calendario fijo). Existe para el banco y para el dueño, no para producción | sección 10 §10.5 y su test "con activa = false toda temporada es la 0, sin mutar ARCH" |
| `edicion.nivel` | 1 | 0 fija; 1 jitter acotado (por defecto); 2 rotación declarada. El nivel efectivo de una etapa es `cfg.nivel === 0 ? 0 : (sk.alternativas ? 2 : cfg.nivel)`: con el 1 por defecto los dos esqueletos con `Skeleton.alternativas` (Como/Bérgamo, canónica/Angliru/Lagos) ROTAN, con la opción `(hashInt(`alt|${raceId}`) + season) % n` por carrera, y la firma se tira dentro de los rangos de la opción; poner 2 no cambia nada en los demás | sección 10 (§10.3); D7 |
| `edicion.kmJitter` | 0,06 | ± 6 % de km entre ediciones para carreras generadas: `km = round1(kmBase × U(0,94; 1,06))` y después `min(km, ARCH.km.maxPorClase[raceClass])` (sección 10 §10.3 nivel 1 (a); sección 8 §8.4 paso 1). El recorte va ANTES de V13, así V13 ("`km ≤ maxPorClase`", veto de calendario sin reintento) no puede dispararse por el jitter en una fila cuyo `min + rango` toca el techo (WT un día 260, .2 un día 180). NUNCA en etapas de edición real (el km es contrato: hoy al entero, `calendar.test.ts` l. 140-152; al 0,1 en `calendario.test.ts`) ni en circuitos de firma. Lo real se mueve ± 1-2 % (Sanremo 289-294, Ronde 268-273) y hasta 7 km en Slovenia (mapa 05 §6); se deja más ancho para carreras inventadas | mapa 07 §1.6; mapa 05 §6; sección 10 §10.3 |
| `edicion.vueltasJitter` | 0,5 | p de que un `circuito` cambie ± 1 vuelta | Montréal 17-18 (mapa 07 §1.1) |
| `edicion.motivoNuevo` | 0,35 | p de que un hueco opcional (`Slot.n[0] === 0`) esté AUSENTE en una edición; si no lo está, `n` entero uniforme en [1; n[1]]. Cada hueco opcional tira por su cuenta en cada temporada, la 0 incluida, sin estado previo (sección 8 §8.4 punto 2; sección 10 §10.3 nivel 1 b) | juicio: una carrera cambia una cosa al año (Lombardía 3 de 4 ediciones con cota de remate, mapa 07 §1.6) |

### 12.7 `ARCH.km` y `ARCH.pesoPorClase`: la clase manda

`ARCH.km.porClase` es una tabla `[min, rango]` por clase y papel, no un factor sobre un rango único: un factor 0,75 sobre `kmFlat` [165, 30] daría [124; 146] en una .2 y lo real es 100-160 con etapas de 100 (mapa 07 §4.1 y §2.3). Es la tabla de banco §7.3, tomada del mapa 07 §4.1. El papel se reduce a cinco columnas: `llana` (`llana`, `llana_viento`), `media` (`media`, `media_alto`, `media_muro`), `reina` (`reina_alto`, `reina_valle`, `reina_encadenada`), `corta` (`montana_corta`) y `unDia`; `cri` sigue con `ROUTE.itt*`. `prologo` y `cronoescalada` no tienen columna: su longitud es del esqueleto y no de la clase, y `kmDe` (sección 7 §7.4) lee `SKELETONS.et_prologo.km` ([3; 8]) y `SKELETONS.et_cronoescalada.km` ([12; 25], sección 5 §5.3) POR PAPEL, sin necesitar el esqueleto elegido, porque cada uno de esos dos papeles tiene exactamente un esqueleto en el catálogo (`tour.ts` importa `SKELETONS` de `grammar/skeletons.ts`; no hay ciclo). La última etapa sigue × `ROUTE.lastStageKmFactor` 0,85 (l. 1336), y tras ella `min(km, maxPorClase)` y `Math.round` (sección 7 §7.4).

| Clase | `llana` | `media` | `reina` | `corta` | `unDia` |
| --- | --- | --- | --- | --- | --- |
| WT | [160, 30] | [150, 30] | [140, 40] | [120, 20] | [200, 60] |
| Pro | [150, 30] | [140, 30] | [140, 35] | [120, 20] | [180, 50] |
| .1 | [140, 30] | [135, 30] | [135, 35] | [115, 20] | [160, 40] |
| .2 | [110, 40] | [110, 40] | [115, 40] | [100, 20] | [140, 40] |
| NC | `ruta` [180, 60] · `rutaU23` [140, 40] · `crono` [35, 10] · `cronoU23` [25, 10] (`championshipCategory` de `calendar.ts` l. 70 elige el `KmRole`: `un_dia`, `un_dia_u23`, `cri`, `cri_u23`) | | | | |

La fila `.1` un día es [160, 40] y no el [170, 40] de §B.3: con 170 el máximo era 210, por encima del techo 200 de la clase, y el test de 12.14 ("`min + rango ≤ maxPorClase`") fallaba en su primera ejecución con los propios valores del documento. 200 es la cifra del mapa 07 §4.1 ("techo UCI 200 para .1") y el techo se conserva; el mínimo baja 10 km. Con eso las cinco columnas de las cuatro clases caben: WT un día 260 y .2 un día 180 tocan justo el techo (y el jitter se recorta, 12.6); Pro un día 230 ≤ 240.

Consecuencias que el censo mide: las 142 carreras de un día con el 210 por defecto de `RaceRow` (`row.km ?? 210`, `calendar.ts` l. 915 en `8585ca2`, l. 929 en `a69b503`, mapa 02) pasan a sortear su km con `firma|raceId` dentro de la fila `unDia` de su clase desde la temporada 0, y las 36 filas con `km` explícito lo conservan (Sanremo 288, `calendar.ts` l. 1016, va por fila). En las ETAPAS DE VUELTA de una .2 desaparecen las de 165 a 195 km (hoy `kmFlat` no distingue clase, l. 1331): sus columnas terminan en 150, 150, 155 y 120, y con el `kmJitter` de 12.6 (que la sección 8 §8.4 paso 1 aplica a toda etapa generada, la temporada 0 incluida) el máximo es 155 × 1,06 = 164,3. Un día .2 llega a 180 por diseño. Por eso la banda `km.clase` de `ROUTE_CENSUS_TARGETS` (sección 13 §13.3) va en filas separadas y no en una, y sus cifras se han calculado con el jitter y el `min(km, 180)`, no sobre la tabla desnuda (simulación de 400.000 sorteos de `min(180, round1(round(U(min; min + rango)) × U(0,94; 1,06)))`): "etapas de vuelta .2: p90 ≤ 155" (p90 teórico 146,8 en las columnas `llana` y `media`, 151,9 en `reina`, 119,5 en `corta`; el p90 de una mezcla nunca supera el mayor de los p90 de sus partes, así que la banda se cumple con cualquier proporción de papeles, y 3 km de margen cubren el ruido de muestreo de cientos de etapas); "un día .2: p50 en [150; 170]" (p50 teórico ~160; el p90 teórico es 177,4, pegado al techo, y una banda de p90 ahí o sería tautológica o nacería roja por ruido con unas decenas de carreras); y `km.clase.max` "0 etapas por encima de `maxPorClase`", que el recorte garantiza. El `tour.test.ts` de la sección 7 (§7.4) comprueba lo mismo antes del jitter sobre `kmDe`: p90 de las etapas .2 ≤ 155 (el p90 de `reina` .2 sin jitter es 151). Un "p90 de toda la clase .2 ≤ 170" habría dependido de cuántas .2 son de un día frente a etapas de vuelta, que nadie ha contado, y podía nacer rojo por aritmética; no se usa en ninguna sección.

`ARCH.km.maxPorClase` es `{ WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 }`: el techo que V13 comprueba, y al que `kmDe` y el jitter de edición recortan antes (12.6). Son las cifras del mapa 07 §4.1 ("techo UCI 280 salvo excepciones como Sanremo" para WT, "200 para .1, 240 para Pro; cifra a confirmar") y del §2.3 ("máximo de una en torno a 200 km" en .2); WT se pone a 260 y no a 280 porque la única de un día generada por encima de 260 sería una rareza sin nombre (las reales por encima van por `km` de fila). Es la decisión D9 del dueño (sección 18): se codifican estas y el comentario del bloque dice "a confirmar con el art. 2.6 del reglamento UCI".

`ARCH.pesoPorClase` es el tercer factor de la fórmula única del peso de un esqueleto, `pesoBase × SESGO_TERRENO × ARCH.pesoPorClase[id][raceClass] × (geo.pesos[id] ?? 1)` (sección 5 §5.6), en la elección `arch|raceId|i`. Su tipo es `Record<SkeletonId, Record<RaceClass, number>>`, sin `Partial`: las 32 filas y las cinco clases de cada fila están escritas (el literal `PESO_POR_CLASE` de 12.1), no hay entradas ausentes ni valor por defecto, y un 0 es un veto de clase. Tiene que ser así por tres lectores. `candidatos` (sección 5 §5.7) filtra con `ARCH.pesoPorClase[id][req.raceClass] > 0` y multiplica por la misma celda: con `Partial` y `noUncheckedIndexedAccess` esa lectura es `number | undefined` y no compila. El test de §5.9 exige que cada esqueleto tenga exactamente las cinco claves de `RACE_CLASSES`. Y `nc_crono` tiene que valer 1 en las cinco clases, porque es el único candidato de la fila `itt` de `SESGO_TERRENO` (§5.6) y de las cronos de un día de equipos como `race-chrono`: un 0 en WT, Pro, .1 o .2 dejaría esas carreras sin candidato y las mandaría a la plantilla canónica en todos sus intentos.

La tabla, con la razón de cada celda, es la de la sección 5 §5.6 y es la ÚNICA: esta sección no tiene tabla propia de `pesoPorClase`, y el literal de 12.1 la transcribe celda a celda (en el mismo orden que la unión `SkeletonId`, §3.3). Las celdas que son decisiones de diseño y no se recalibran con la galería: `ud_montana_alto` 0,02 solo en .1 (decisión 37 y D1 del dueño, que puede ponerlo a 0), `ud_criterium` 0 en todas (D5), `nc_ruta` 1 solo en NC, `nc_crono` 1 en todas, y toda columna NC a 0 salvo esas dos. El resto (los 0,5, 0,25, 0,7 y 0,4) son juicio y los corrige la galería (sección 16) como dato, en §5.6 y en el literal a la vez.

### 12.8 `ARCH.pesosComposicion`, `ARCH.bloques` y `ARCH.itinerario`: la vuelta

`ARCH.pesosComposicion` sustituye a `ROUTE.mixWeights` (l. 1315-1319: cuatro papeles por `MixTerrain`) por nueve papeles indexados por el `Relieve` de la zona de meta de cada etapa (tabla de arquitectura §7.3). `cri`, `prologo` y `cronoescalada` no están en la tabla: la crono la siguen decidiendo `ROUTE.itt*`, el prólogo `TOUR_SKELETONS[id].primera.prologo` y la cronoescalada `ARCH.itinerario.cronoescaladaP`. Cuando la zona tiene `viento < 2`, el peso de `llana_viento` se suma al de `llana`.

| `Relieve` | `llana` | `llana_viento` | `media` | `media_alto` | `media_muro` | `reina_alto` | `reina_valle` | `reina_encadenada` | `montana_corta` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `llano` | 0,50 | 0,25 | 0,15 | 0,07 | 0,03 | 0 | 0 | 0 | 0 |
| `ondulado` | 0,40 | 0,10 | 0,25 | 0,15 | 0,10 | 0 | 0 | 0 | 0 |
| `media` | 0,28 | 0,04 | 0,28 | 0,18 | 0,10 | 0,06 | 0,04 | 0 | 0,02 |
| `montana` | 0,20 | 0,02 | 0,22 | 0,14 | 0,05 | 0,16 | 0,12 | 0,04 | 0,05 |
| `alta` | 0,16 | 0 | 0,18 | 0,10 | 0,02 | 0,22 | 0,14 | 0,10 | 0,08 |

Lo que cambia respecto de hoy y el censo mide: `mixWeights.mountain` da un 40 % de reinas (l. 1318) y una vuelta de 21 generada en `montana`/`alta` pasa a 4-6 etapas de alta montaña repartidas en cuatro formas, que es lo que llevan Tour y Giro (mapa 07 §2.1). Las cuatro garantías de `mixRoles` (`calendar.ts` l. 457 y siguientes en `8585ca2`, l. 471 en `a69b503`: crono, última decisiva, `selectiveMinFraction`, `uphillFinishMinStages`) siguen leyendo `ROUTE` y se aplican encima (sección 7).

| Constante | Valor | Intención | En qué se apoya |
| --- | --- | --- | --- |
| `bloques.gv.descansos` | [9, 15] | Descansos tras las etapas 9 y 15 de una gran vuelta generada | mapa 07 §2.1 reglas 1-4 |
| `bloques.gv.primeraSemanaFinalesAlto` | 1 | ≤ 1 final en alto y ninguna reina en la primera semana | mapa 07 §2.1 |
| `bloques.gv.maxAltaMontana` | 7 | Tope de etapas de alta montaña | Tour y Giro 4-6 con final en alto (mapa 07 §2.1) |
| `bloques.gv.minLlanasEntreBloques` | 2 | Entre dos bloques de montaña van al menos dos llanas | mapa 07 §2.1 |
| (ventana de la reina: `ventanaReina(n)`) | con n = 21, índices 0-based [14; 19], es decir, etapas 15 a 20 | NO es una clave de `ARCH`. `bloques.gv.reina` [15, 20] de §B.3 se retira: dependía de `n` y una constante solo valía para n = 21. La ventana la calcula `ventanaReina(n) = [max(ARCH.bloques.gv.descansos[0], floor(2n/3)), n − 2]` (sección 7 §7.2, `tour.ts`), que lee `descansos` y ninguna otra perilla; la usan `reinaTarde` (§7.2) y V14 (sección 9 §9.2), y su test es el de `tour.test.ts` (`ventanaReina(21)` = [14, 19], `ventanaReina(16)` = [10, 14], `ventanaReina(15)` = [10, 13]). Una clave sin lector incumpliría la regla de la casa por la que 12.10 retira `grandTourLastDecisiveFactor` | mapa 07 §2.1 regla 2 (Plateau de Beille e15, Loze e17, Tre Cime e19) |
| `itinerario.avance` | 0,6 | p de avanzar a la zona siguiente de `TERRITORIOS[country].ruta` en cada etapa; el 0,4 de quedarse es lo que forma bloques de montaña en la misma cordillera | sección 7; mapa 07 §2.1 |
| `itinerario.transicion` | 0,4 | Fracción inicial de una etapa de transición que se dibuja con la `amplitud` de la zona `desde`; el 60 % restante con la de la zona de meta | sección 7 |
| (prólogo: `TOUR_SKELETONS[id].primera.prologo`) | 0,25 en `vu_semana` y `vu_larga`; 0,3 en `vu_gran_vuelta` | p de prólogo en la etapa 1 de vueltas ≥ `ROUTE.ittWeekStages` 6 (`et_prologo`, [3; 8] km). No es una clave de `ARCH` porque tiene dos valores según el esqueleto de composición: vive en `TOUR_SKELETONS` (sección 7 §7.2, dato) y aquí solo se registra; §B.3 no la listaba. D3 del dueño puede ponerla a 0 | mapa 07 §2.2 (Romandía, Dauphiné, Suiza; prólogo de 3-8 km); decisión 42 |
| `itinerario.cronoescaladaP` | 0,08 | p de que la `cri` de una vuelta con `cordillera` pase a `cronoescalada` (sección 7 §7.3); D3. Es el único nombre: la sección 7 y la 18 lo usan así | mapa 07 §2.1 (existe y es rara: Peyragudes 2025) |

### 12.9 `ARCH.anticlon` y `ARCH.arranque`

| Constante | Valor | Intención | En qué se apoya |
| --- | --- | --- | --- |
| `anticlon.maxCorrelacion` | 0,85 (provisional; se calibra en el paso 9) | V12: dos etapas generadas del mismo esqueleto en carreras distintas no correlacionan (huella `g` por km de `RouteStats.huella`) por encima de esto. Es el ÚNICO tope del máximo: la banda `variedad.correlacion` del censo (sección 13 §13.3) afirma "máximo ≤ `ARCH.anticlon.maxCorrelacion` y mediana < 0,8", sin un segundo número (el 0,9 de arquitectura §9 queda sustituido por el tope calibrado, sección 9 §9.5). El valor definitivo es el p90 de `profileCorrelation` sobre pares de etapas REALES de carreras distintas con mismo `kind`, mismo `finalKind` y km ± 10 %, medidos con `scripts/medir-real.mjs`; los tres pares que §B.3 nombraba (Ronde/E3, Amstel/Brabant, Lombardía/Lieja) no existen en `STAGE_FEATURES` (sección 9 §9.5), y si hay menos de 30 pares, 0,85 se queda escrito como provisional | sección 9 §9.5 y 13 §13.3; `propuestas/datos.md` §1.4 |
| `arranque.objetivoMs` | 1.500 | Carga de `SEASON_CALENDAR` (módulo `routes/calendar.js`) medida por `scripts/medir-arranque.mjs` y exigida por `routes/arranque.test.ts`. Hoy 578 ms (`juicios/motor.md` §1); la gramática añade ≤ 12 motivos y hasta 8 intentos por etapa sin `sampleProfile` (0,40 ms por etapa era una pasada de `sampleProfile` más lecturas, así que el techo deja margen ×2,6 sobre hoy) | `juicios/motor.md` §1; sección 14 |
| `arranque.techoMs` | 2.500 | Si se supera, el calendario se construye perezoso por carrera (decisión tomada, no condicional) | sección 14 |
| `arranque.porTemporadaMs` | 1.000 | Coste máximo de una temporada adicional (`calendarForSeason(s)` memoizada por `Map`) | sección 14 |
| `arranque.maxTemporadasEnMemoria` | 8 | Cuántas temporadas distintas de `BASE_SEASON` guarda a la vez el `Map` de producción de `calendarForSeason` (la 0 nunca se expulsa y no cuenta); al pasar del tope se expulsa la de último acceso más antiguo (LRU) y, si se vuelve a pedir, se reconstruye por ≤ `porTemporadaMs`. Decide cuánta memoria paga el proceso de `apps/api`, que no se reinicia por cambio de temporada (`calendarRun.ts` l. 135 en `8585ca2`, 137 en `a69b503`), en un mundo de ocho años: un `Map` sin tope acumula una temporada por año de mundo (`juicios/ejecutabilidad.md` §5 riesgo 3). El 8 se revisa con los MB de heap por temporada que imprime `scripts/medir-arranque.mjs` ("vN §1") | sección 14 §14.5; `juicios/ejecutabilidad.md` §5 riesgo 3 |

### 12.10 Lo que se retira de `ROUTE` y qué lo sustituye

Se retira en el paso 8 del plan, en el mismo cambio que borra los ocho `xxxSegments`, y con la nota "vN · El generador es una gramática" de `docs/balance.md`, con N igual al `ENGINE_VERSION` que resulta del paso 8 (sección 0 §0.1). El esqueleto la llamaba con el número 61, que no sirve: ya existe una v61 (la tabla de `balance.md` l. 11171 y l. 11241 la citan, l. 11337 es la v62 y la última nota es la v86, l. 16332), la nota toma el siguiente número libre, que es el mismo al que sube `ENGINE_VERSION` (12.13): "v87 · El generador es una gramática" si nadie ha movido la versión al empezar el paso 8; todas las referencias "vN §n" de este documento se leen con ese número. La tabla "constantes retiradas y sus sustitutas" va en su §1, con el valor de hoy al lado, como pide `Claude.md` l. 12. Las claves se citan por nombre; sus líneas en `constants.ts` al corregir son `queenDplusRange` 1258, `queenHighDplusShare` 1260, `queenLowDplusRange` 1261, `queenFinalMix` 1276, `grandTourLastDecisiveFactor` 1308, `mixWeights` 1315-1319, `kmFlat..kmSummit` 1331-1334.

| Clave de `ROUTE` | Valor de hoy | Quién la usaba | La sustituye |
| --- | --- | --- | --- |
| `queenDplusRange` | {2.600, 4.600} en log | `mountainSegments` (brazo alto) | `Skeleton.dPlus` por esqueleto de reina (sección 5), total con relleno (`ARCH.reina.dPlusIncluyeRelleno`) |
| `queenHighDplusShare` | 0,6 | idem | `ARCH.reina.blandaShare` por `Relieve` |
| `queenLowDplusRange` | {1.200, 2.500} lineal | idem | `et_reina_blanda` con D+ [1.500; 2.500] |
| `queenFinalMix` | alto 0,45 · cima_cerca 0,20 · valle_corto 0,25 · valle_largo 0,10 | `sampleFinalKind` | El reparto de `finalKindOf` deja de ser parámetro y pasa a ser CONSECUENCIA de los pesos de los cuatro esqueletos de reina (`et_reina_alto_largo`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_valle`); como MEDIDA sobrevive en `ROUTE_CENSUS_TARGETS` (cada cubeta ≥ 5 %, `alto` en [0,35; 0,55], sección 13) |
| `mixWeights` | flat [0,58 0,27 0,10 0,05] · hilly [0,30 0,36 0,19 0,15] · mountain [0,16 0,26 0,18 0,40] | `mixRoles` | `ARCH.pesosComposicion` (12.8) |
| `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit` | [165, 30], [160, 30], [150, 30], [145, 35] | `mixKm` | `ARCH.km.porClase` (12.7) |
| `grandTourLastDecisiveFactor` | 0,4 | el paso 2 de `mixRoles` (`calendar.ts` l. 476 en `8585ca2`, l. 490 en `a69b503`: `const factor = n >= ROUTE.grandTourStages ? ROUTE.grandTourLastDecisiveFactor : 1`) | `TOUR_SKELETONS.vu_gran_vuelta.ultima` = { llana 0,85; cri 0,15 } (sección 7 §7.2): en una vuelta de 15 o más etapas el paso 2 se sustituye por esa tirada, y el paso 2 de `mixRoles` solo corre en `vu_corta`, `vu_semana` y `vu_larga`, todas con `n ≤ 14`, donde el factor valía 1; las tres grandes vueltas reales no pasan por `mixRoles`. La constante se queda sin lector y una constante viva sin uso incumple `Claude.md` l. 12, así que se retira con nota en `balance.md` (vN §1, tabla de retiradas, valor de hoy 0,4). §B.1 la listaba entre lo conservado; se corrige aquí y la sección 7 (§7.2, §7.3 y §7.5) y la 15 (paso 8) lo dicen igual. `grandTourStages` 15 NO se retira: tiene lectores nuevos (12.11). Ningún test de `calendar.test.ts` cita el factor (la única mención de gran vuelta, l. 70-72, es por `format`) |

El comentario de `ROUTE` l. 1243-1257 (el 60/40 "no es un adorno" porque `calendarQueens.test.ts` afirma que la banda de < 1.500 m no se queda vacía) se traslada, reescrito, al comentario de `ARCH.reina.blandaShare`: la cola baja sigue existiendo, pero la decide una forma de reina con peso y no una tirada.

### 12.11 Lo que se conserva de `ROUTE` y todo `RELIEF`

Se conservan tal cual, con su línea y su lector: `ittMinStages` 3, `ittChanceShort` 0,6, `ittChanceWeek` 0,9, `ittWeekStages` 6, `ittAlwaysFlatStages` 4, `ittEarlierChance` 0,35, `ittSecondStages` 15, `ittSecondPosition` 0,35 (l. 1280-1294, `mixRoles`); `ittKmMin` 14, `ittKmRange` 12, `ittLongStages` 10, `ittLongKmMin` 26, `ittLongKmRange` 18 (l. 1296-1300, `mixKm`, que pasa a `kmDe` para `cri`); `lastDecisiveChance` {0,3; 0,55; 0,85} y `lastSummitShare` {0; 0,35; 0,8} (l. 1306 y l. 1311, última etapa de `vu_corta`, `vu_semana` y `vu_larga`); `grandTourStages` 15 (l. 1307), que deja de leerlo `mixRoles` y pasa a leerlo `tour.ts` en dos sitios: la frontera `vu_larga` / `vu_gran_vuelta` (una vuelta de `n ≥ grandTourStages` es `vu_gran_vuelta`) y `descansosDe(n) = n >= ROUTE.grandTourStages ? ARCH.bloques.gv.descansos.filter((d) => d < n) : []` (sección 7 §7.2); `selectiveMinFraction` {0,35; 0,55; 0,7} y `uphillFinishMinStages` 4 (l. 1323-1326, garantías); `lastStageKmFactor` 0,85 (l. 1336). Son composición del calendario, no perfil (mapa 01 §3), y `composeTour` los lee por el mismo nombre para que `calendar.test.ts` l. 168-266 siga en verde sin re-sellar (sección 7). Las claves de `lastDecisiveChance` y `lastSummitShare` siguen indexadas por `MixTerrain` (`flat`/`hilly`/`mountain`), que en E1 sobrevive solo como el `terrain` de la fila de la carrera (`RouteTerrain` de `featureProfile.ts` l. 21) y se usa como sesgo, nunca como orden (sección 3).

`RELIEF` entero (l. 1206-1225: `rollingMinGradient` 0,4, `rollingGradientRange` 2,4, `rollingMinKm` 1,4, `rollingKmRange` 2,2, `rollingAmplitude` por terreno de 0,55 a 1,15 y `rollingAmplitudeDefault` 1,0) no se toca porque es de `featureProfile.ts` y solo de él: es el relleno de las 177 etapas reales con rasgos, calibrado contra el desnivel publicado (Roubaix ~1.450, Ronde ~2.500, Lombardía ~4.400, Sanremo ~2.000; comentario l. 1195-1205) y sellado por la huella FNV de `realFingerprint.test.ts` (sección 11). Que existan dos rellenos (`rollingFill` con `RELIEF` para lo real, `enlace` con `GeoSignature.amplitud` para lo generado) es una deuda declarada en la sección 17 (riesgo 7), no un descuido: unificarlos movería `erosion.longClassicFresh` y `hardestClassicFresh`, que se midieron sobre esos perfiles.

### 12.12 Los literales de `profileGen.ts` que migran

Cada literal del cuerpo de las funciones, con su valor de hoy, la constante que lo recoge y si el valor cambia. Las funciones desaparecen en el paso 8; hasta entonces viven en `routes/grammar/legacy.ts` con estos mismos literales, para que la tabla pareada del paso 1 dé "igual dentro del ruido" (sección 15).

| Línea | Literal de hoy | Función | Constante nueva | Cambia |
| --- | --- | --- | --- | --- |
| 78 | `prog·1,6 + U(−1,2; 1,2)`, sin tope | `climb` | `motivo.muro.gMin` 8 y `.gMax` 16 (solo se pasan en muros; en puertos `climb` sigue sin tope y V15 acota todo tramo a g ≤ 20) | sí: tope |
| 90 | `−max(2, avg ± 1,5)` | `descent` | `motivo.descenso.g` [−8; −3] | sí: suelo −3 |
| 102, 105 | trozo `U(3; 6)`; `amp` 1,8 llano / 3,2 bumpy | `rolling` | `GeoSignature.amplitud` con tope `motivo.enlace.ampMax` 2,4; `rolling(rand, km, amp, pRompepiernas = 0)` | sí: 3,2 → ≤ 2,4 |
| 119 | `rompepiernas` con p 0,35 en bumpy | `rolling` | ninguna: nunca se emite (`sample.ts` l. 101 lo colapsa a `STAGE.rollingGradient` 1,5 e ignora tramos, mapa 03) | sí: 0 |
| 247-248 | cota [3; 7] al [4,5; 6,5] | `hillySegments` | `motivo.cota.km` [2,5; 8,0] / `.g` [4; 8] | sí |
| 257 | bajada `U(3; 5)` al 5 | `hillySegments` | `motivo.descenso.kmPorDesnivel` + `colocacion.bajadaTrasPuerto` | sí |
| 280-283 | final [4; 7,5] al [5; 7,5]; tope 8,4 | `hillyUphillSegments` | `meta.altoCorto` [3; 7] al [6; 11]; `veto.margenClaseKm` 0,3 | sí |
| 330-335 | valles [1,5; 5], [6; 20], [22; 45] | `valleyKmFor` | `meta.cimaCerca` [1,2; 4,3], `meta.descensoMeta` [5,7; 19,3], `meta.valle` [20,7; 45] | sí: holgura 0,7 |
| 359-363 | intermedios [6; 11] al [5,5; 7,5]; final [9; 15] al [7,5; 9,5] | `mountainSegments` | `motivo.puerto` [9; 25] al [5; 12] (por zona); `meta.altoLargo` [9; 22] al [6; 12] | sí |
| 374 | `escala` en [0,55; 1,8] | `mountainSegments` | `reina.escalaDificultades` [0,7; 1,4] | sí |
| 387 | `max(8,6, finalLen·escala)` | `mountainSegments` | `motivo.puerto.km[0]` 9,0 | sí: 8,6 → 9,0 |
| 390 | `fill = max(0,15·km, …)` | `mountainSegments` | `colocacion.enlaceMinimoTotal` 0,12 | sí |
| 396, 407 | bajadas `U(5; 8)` y `U(4; 10)` al 6 | `mountainSegments` | `motivo.descenso.kmPorDesnivel` {55, 2, 10} | sí |
| 452-454 | final [4; 8] al [7,5; 10]; run-in [13; 22] | `mountainClassicSegments` | `meta.unDiaUltimaCota` [1,3; 4,2] al [7; 11] a [3; 17] | sí: el caso v40 |
| 467 | `min(0,6·runIn, max(2, len·g·10/55))` | `mountainClassicSegments` | `motivo.descenso.kmPorDesnivel` {55, 2, 10} | sí: la regla de 55 m por km se conserva, pero el tope pasa de `0,6·runIn` (de 7,8 a 13,2 km) a `kmMax` 10 fijo, y la pendiente deja de ser el 6 fijo de l. 468 para salir de `bajadaTrasPuerto` |
| 477-478 | muro [1; 2,5] al [8; 12]; `nWalls = km > 200 ? 5 : 4` (l. 475) | `classicSegments` | `motivo.muro` [0,4; 2,5] al [8; 16]; el número lo pone `Slot.n` del esqueleto ([10; 20] en `ud_muros`, sección 5) | sí |
| 495-496 | `[3, 5, 4]` estrellas; sector `U(2; 4)` | `cobblesSegments` | `motivo.sector.estrellas` [1; 5], `.km` [0,3; 3,7]; el número lo pone `Slot.n` | sí |
| 245, 271, 339, 445, 475 | `n = km > 170 ? 3 : 2` y variantes | todas | ninguna: la cardinalidad es `Slot.n` sorteada en `EditionPlan.n` con `ed|raceId|i|season` (secciones 8 y 10); es el hallazgo central del mapa 01 §4 (arquitectura fija por umbral de km) | sí |

### 12.13 Lo que NO cambia y por qué

| Constante | Valor | Dónde | Por qué no se mueve en E1 |
| --- | --- | --- | --- |
| `FINAL_KIND_CUTS` | { alto: 0,5, cimaCerca: 5, valleCorto: 20 } | `finalKind.ts` l. 30 | Es la vara con que `calendarQueens.ts` l. 73 lee las ~157 reinas y con que `queenGeometry()` mide el reparto; el generador se calibra para caer dentro con 0,7 de holgura (12.3) |
| `CLIMB_MIN_KM` | 1,5 | `finalKind.ts` l. 33 | Define qué puerto cuenta para `lastClimbKm`; `ARCH.pancarta.cimaMinKm` lo referencia |
| `WALL_MAX_KM` | 3 | `stageKind.ts` l. 60 | Frontera clásica/media del clasificador; `ARCH.motivo.muro.km[1]` 2,5 queda por debajo (referencia `STAGE.wallMaxKm`, que es el umbral estrecho del motor) y 12.14 lo comprueba |
| `PASS_MIN_KM` | 8,5 | `stageKind.ts` l. 62 | Frontera media/reina; el generador la rodea con 8,0 y 9,0. Recalibrar `stageKindOf` a la realidad (27 de 113 reinas y medias reales mal clasificadas, `propuestas/datos.md` §1.5) es la decisión D2 del dueño y se abre tras el paso 8 con la tabla del censo (sección 11) |
| `QUEEN_MIN_CLIMB_METRES` | 3.200 | `stageKind.ts` l. 64 | Red para recorridos reales; `ARCH.reina.verdad.dPlusMin` va 200 por encima y `ARCH.veto.margenClaseMetros` 300 por debajo |
| `SUMMIT_RUN_IN_KM` | 5 (nueva, exportada) | `stageKind.ts` | `stageKind.ts` recibe DOS cambios en E1 y ninguno mueve `kind`: en el paso 0, exportar `PASS_MIN_KM`, `WALL_MAX_KM` y `QUEEN_MIN_CLIMB_METRES` (hoy `const` sin `export`, l. 60-64; sin efecto en conducta, para el test de coherencia de 12.14); en el paso 8, `SUMMIT_RUN_IN_KM` y la etiqueta `Summit finish` decidida por `runInAfterLastClimb ≤ 5`, la regla que `stageHistory.ts` ya aplicaba (sección 11 §11.6, decisión 23). La decisión 26 ("la única modificación es la de la etiqueta") se lee así: la única que cambia conducta |
| `STAGE.finish*` | `finishWindowKm` 5, `finishClimbSearchKm` 15, `finishClimbMinGradient` 3, `finishClimbGapBlocks` 5, `finishClimbMinKm` 0,4, `finishSummitKm` 0,6, `finishAltoMinKm` 3 | `constants.ts` l. 4440-4458 | Son del motor (`finish.ts`), calibrados en la línea del motor con los bancos de `targets.ts`; los vetos no los leen (decisión 4: `verify` solo lee `routes/`) y el generador se diseña contra ellos (`meta.muro.aproxKm`, `enlace.ampMax`) en vez de moverlos |
| `STAGE.muroMaxKm` / `muroMinGradient` | 1 / 8 | `constants.ts` l. 5346-5347 | Corte de `finishType` `muro`; `ARCH.meta.muro.finishMuroMaxKm` 1,0 lo referencia y por encima se declara `puncheur` |
| `STAGE.wallMaxKm` / `wallMinGradient` | 2,5 / 8 | `constants.ts` l. 1684-1685 | `wallMinGradient` es el umbral de COL frente a MON por bloque (`riderPerfil`, `stage/simulate.ts` l. 471); `wallMaxKm` es la longitud máxima de un muro de SPEC 6.4 y solo lo lee `isWall` (`stage/sample.ts` l. 146-154, exportada y sin llamadores fuera de `sample.test.ts`); `ARCH.motivo.muro.km[1]` 2,5, `.gMin` 8 y `.g[0]` 8 los referencian, y `ARCH.motivo.cota.g[1]` 8 se apoya en el segundo |
| `STAGE.dx` | 0,1 | `constants.ts` l. 1675 | Paso de integración: el generador redondea todo km a 0,1 por esto (`split`, `climb`, `descent`, `profileGen.ts` l. 52-93) |
| `STAGE.climbRaceKmToGo` | 30 | `constants.ts` l. 3820 | Ventana de ataque del motor; `ARCH.reina.subidaLejanaKm` lo referencia |
| `ENGINE_VERSION` | de N a N + 1, UNA sola vez | `constants.ts` l. 809 (`export const ENGINE_VERSION = 86 as const`); sello en `index.test.ts` l. 459 (`expect(ENGINE_VERSION).toBe(86)`) | N es el valor en producción al empezar el paso 8: 86 al corregir este documento (los mapas leyeron 69, y entre medias hubo 17 subidas, de v70 "la carretera gira" a v86). Ninguna sección escribe la cifra de llegada como número fijo, porque "69 → 70" o cualquier otra pareja literal apuntaría a versiones ya usadas; la nota de `balance.md` toma "v(N + 1)" (12.10) |

La razón común: todas son la vara con que el banco lee las reinas, con que `stageHistory.ts` reetiqueta etapas corridas y con que el motor decide el final (mapa 06 §2.3 y §5). Un generador nuevo que las moviera para caber dentro sería un generador calibrado contra sí mismo, que es exactamente el defecto del actual (`stageKind.ts` l. 44-58 justifica sus umbrales con 10.800 etapas del generador viejo). Lo generado se acota con holgura; lo real sigue con la discrepancia medida hasta D2.

### 12.14 El test de coherencia de `ARCH`

Vive en `grammar/motifs.test.ts` (bloque "`ARCH` es coherente con `routes/` y `STAGE`") y corre en `test:rapido`; falla si alguien separa una referencia de su fuente, abre un rango por encima de un umbral del clasificador o del motor, o vuelve a cerrar el ciclo de importación. El fichero es `packages/engine/src/routes/grammar/motifs.test.ts` (el mismo de §4.5, cuyos `import` se juntan con estos en una sola cabecera), así que las rutas parten de `routes/grammar/`: `../../constants.js` es `src/constants.ts`, `../finalKind.js` y `../stageKind.js` están en `routes/`, y `./skeletons.js` es vecino. Todo `import` relativo lleva `.js` (sección 15 §15.1, regla 10; sin extensión, `pnpm typecheck` da TS2835 con `module: NodeNext`). La única ruta sin `.js` es la de `readFileSync(new URL('../../constants.ts', import.meta.url))`, que no es un `import` sino la lectura del fuente, y por eso nombra el `.ts`:

El bloque de abajo es la forma FINAL del `describe`, la del paso 7. Como sus claves entran en `ARCH` del paso 2 al 7, se escribe por pasos con la tabla "El test de coherencia de `ARCH` se escribe por pasos" de la sección 15 (§15.1): nace en el paso 3 con cuatro `it` (cota y puerto, muro, valles, importaciones de `constants.ts`) y tres `it.todo`, y se encienden el de las referencias en el paso 4 (con la línea de `blandaShare` sacada del último `it`), el de km, `fallbackMaxShare` y `puertoDplusMax` en el paso 5, y el de `pesosComposicion` en el paso 7; cada `import` entra con el `it` que lo usa.

```ts
import { readFileSync } from 'node:fs'
import { ARCH, STAGE } from '../../constants.js'
import { FINAL_KIND_CUTS, CLIMB_MIN_KM } from '../finalKind.js'
import { PASS_MIN_KM, WALL_MAX_KM, QUEEN_MIN_CLIMB_METRES } from '../stageKind.js'   // exportadas en el paso 0
import { SKELETONS } from './skeletons.js'

describe('ARCH es coherente con routes/ y STAGE', () => {
  it('cota y puerto rodean PASS_MIN_KM con margenClaseKm', () => {
    expect(ARCH.motivo.cota.km[1] + ARCH.veto.margenClaseKm).toBeLessThanOrEqual(PASS_MIN_KM)
    expect(ARCH.motivo.puerto.km[0] - ARCH.veto.margenClaseKm).toBeGreaterThanOrEqual(PASS_MIN_KM)
    expect(ARCH.meta.altoLargo.km[0]).toBe(ARCH.motivo.puerto.km[0])
    expect(ARCH.meta.altoCorto.km[1] + ARCH.veto.margenClaseKm).toBeLessThanOrEqual(PASS_MIN_KM)
  })
  it('muro, cota y repecho respetan los umbrales del clasificador y del motor', () => {
    expect(ARCH.motivo.muro.km[1]).toBe(STAGE.wallMaxKm)                 // 2,5: longitud máxima de muro de SPEC 6.4 (isWall)
    expect(ARCH.motivo.muro.km[1]).toBeLessThanOrEqual(WALL_MAX_KM)       // 3: la frontera clásica/media queda por encima
    expect(ARCH.motivo.muro.km[1]).toBeLessThanOrEqual(WALL_MAX_KM - 0.1) // 2,9: la regla 3 de garantizaClase (§8.9) nunca recorta un muro
    expect(ARCH.motivo.muro.km[0]).toBe(STAGE.finishClimbMinKm)
    expect(ARCH.motivo.muro.g[0]).toBe(STAGE.wallMinGradient)
    expect(ARCH.motivo.muro.gMin).toBe(STAGE.wallMinGradient)
    expect(ARCH.motivo.cota.g[1]).toBeLessThanOrEqual(STAGE.wallMinGradient)   // 8: una cota nunca se lee como muro
    expect(ARCH.motivo.cota.km[0]).toBe(ARCH.motivo.muro.km[1])                // muro o cota, nunca las dos
    expect(ARCH.meta.muro.km[1]).toBeLessThanOrEqual(ARCH.motivo.muro.km[1])
    expect(ARCH.meta.muro.finishMuroMaxKm).toBe(STAGE.muroMaxKm)
    expect(ARCH.meta.repecho.km[1]).toBeLessThan(STAGE.finishAltoMinKm)
    expect(ARCH.meta.repecho.gMax).toBeLessThan(STAGE.wallMinGradient)
    expect(ARCH.meta.muro.aproxAmp).toBeLessThan(STAGE.finishClimbMinGradient)
    expect(ARCH.motivo.enlace.ampMax).toBeLessThan(STAGE.finishClimbMinGradient)
    expect(ARCH.motivo.expuesto.amp).toBeLessThan(ARCH.motivo.enlace.ampMax)
  })
  it('los valles llevan margenValleKm sobre FINAL_KIND_CUTS', () => {
    const m = ARCH.veto.margenValleKm
    expect(ARCH.meta.cimaCerca.valle[0]).toBeGreaterThanOrEqual(FINAL_KIND_CUTS.alto + m)
    expect(ARCH.meta.cimaCerca.valle[1]).toBeLessThanOrEqual(FINAL_KIND_CUTS.cimaCerca - m)
    expect(ARCH.meta.descensoMeta.valle[0]).toBeGreaterThanOrEqual(FINAL_KIND_CUTS.cimaCerca + m)
    expect(ARCH.meta.descensoMeta.valle[1]).toBeLessThanOrEqual(FINAL_KIND_CUTS.valleCorto - m)
    expect(ARCH.meta.valle.valle[0]).toBeGreaterThanOrEqual(FINAL_KIND_CUTS.valleCorto + m)
  })
  it('las referencias al motor y al clasificador no se separan de su fuente', () => {
    expect(ARCH.pancarta.cimaMinKm).toBe(CLIMB_MIN_KM)
    expect(ARCH.reina.subidaLejanaKm).toBe(STAGE.climbRaceKmToGo)
    expect(ARCH.reina.verdad.dPlusMin).toBeGreaterThan(QUEEN_MIN_CLIMB_METRES)
    const techoMedia = QUEEN_MIN_CLIMB_METRES - ARCH.veto.margenClaseMetros            // 2.900
    for (const sk of Object.values(SKELETONS)) if (sk.kind === 'media') expect(sk.dPlus[1]).toBeLessThanOrEqual(techoMedia)
  })
  it('las tablas están bien formadas', () => {
    for (const fila of Object.values(ARCH.pesosComposicion)) {
      const suma = Object.values(fila).reduce((a, b) => a + b, 0)
      expect(Math.abs(suma - 1)).toBeLessThan(1e-9)
    }
    // min + rango ≤ techo: el jitter de edición (× 1,06) se recorta a maxPorClase ANTES de V13 (12.6), por eso
    // aquí no hace falta holgura sobre el techo; lo que sí falla es una fila que lo supere sin jitter (.1 un día a 170).
    for (const clase of ['WT', 'Pro', '1', '2'] as const)
      for (const [, [min, rango]] of Object.entries(ARCH.km.porClase[clase]))
        expect(min + rango).toBeLessThanOrEqual(ARCH.km.maxPorClase[clase])
    expect(ARCH.reina.blandaShare.alta).toBeLessThan(ARCH.reina.blandaShare.montana!)
    expect(ARCH.veto.fallbackMaxShare.calendario).toBe(0)
    expect(ARCH.veto.puertoDplusMax.alta).toBeGreaterThanOrEqual(ARCH.motivo.puerto.km[1] * ARCH.meta.altoLargo.gMaxSiMasDe17 * 10)  // 25 km al 7 % caben en `alta`
  })
  it('constants.ts no importa valores de routes/grammar/ (solo tipos) ni reexporta sus tablas', () => {
    const src = readFileSync(new URL('../../constants.ts', import.meta.url), 'utf8')
    const deGrammar = src.match(/^(import|export) .* from '\.\/routes\/grammar\/.*'$/gm) ?? []
    for (const linea of deGrammar) expect(linea.startsWith('import type ')).toBe(true)
  })
})
```

Lo que este test no cubre a propósito: que los rangos sean REALISTAS. Eso lo hacen `routeCensus` y sus bandas con columna "hoy (medido)" (sección 13) y la galería (sección 16); una constante puede ser coherente con el clasificador y seguir produciendo etapas que no existen, y por eso ninguna cifra de `ARCH` se da por buena hasta que el censo del paso 8 la mide.
