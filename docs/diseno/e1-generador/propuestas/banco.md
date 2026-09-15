# Propuesta E1: el generador como instrumento de calibración

Propuesta independiente para `docs/generador.md`. Ángulo: se diseña de atrás hacia delante. Primero qué distribuciones de etapa y de carrera necesita el banco para calibrar el motor contra la realidad; después el generador como la máquina que produce exactamente esas distribuciones de forma determinista y verificable; y por último el plan para que el banco mida el calendario que el juego corre de verdad y no escenarios canónicos.

Leído para escribirla: los siete mapas de `scratchpad/e1/mapas/` (01 generador, 02 calendario, 03 motor, 04 banco, 05 docs, 06 tests, 07 ciclismo real) y, en el código, `packages/engine/src/routes/profileGen.ts` entero, `stageKind.ts`, `finalKind.ts`, `calendar.ts` (l. 1-260, 380-565, 886-929), `stage/types.ts` (l. 1-62), `stage/sample.ts` (l. 1-60, 125-154), `stage/finish.ts` (l. 60-195), `stage/rng.ts`, `sim/targets.ts` (l. 1-110, 640-735), `sim/calendarQueens.ts`, `sim/realQueens.ts` (l. 1-60), `sim/smallTours.ts` (l. 55-105), `sim/world.ts` (l. 160-190), `constants.ts` (bloques `RELIEF` y `ROUTE`, l. 1110-1246; `ENGINE_VERSION` l. 718; `muroMaxKm` l. 4462), `packages/db/src/raceRoutes.ts` (l. 1-60), `schema.ts` (l. 500-527), `calendarRun.ts` (l. 1590-1620), `apps/api/src/routes/calendar.ts` (l. 85-105), `apps/api/src/stageHistory.ts` (l. 60-95), `docs/agenda.md` §4.18, `docs/epics.md` G5-G6, `docs/encargos.md` E1 y `docs/balance.md` v60 §1b (l. 11678-11765). Los números marcados «medido» son los de los mapas (1.500 etapas por forma en el 01; 1.418 etapas del calendario en el 02 y 06; 157 reinas en el 04 y 06).

---

## 1. Diagnóstico: qué falla hoy

### 1.1 Los tres hallazgos, confirmados en el código

1. **Tres modelos para vueltas, seis para un día.** `calendar.ts` l. 409-410: `type MixTerrain = 'flat' | 'hilly' | 'mountain'` con el comentario «los tres terrenos que sabe componer una vuelta por etapas (el resto se reduce a ellos)»; `mixTerrain()` (l. 416-420) funde `classic` en `hilly` y `cobbles` e `itt` en `flat`. `oneDaySpec()` (l. 400-407) es un `switch` de seis ramas. Cada rama es UNA función de `profileGen.ts` con un esqueleto fijo: el número de dificultades lo pone el kilometraje por umbral (`km > 170 ? 3 : 2` en `hillySegments` l. 245, `km > 165 ? 3 : 2` en `mountainSegments` l. 339, `km > 200 ? 5 : 4` en `classicSegments` l. 475, `[3, 5, 4]` literal en `cobblesSegments` l. 495). Medido (mapa 01 §4): `hillySegments(170, 'x')` tiene 2 puertos y `hillySegments(171, 'x')` tiene 3, con cualquier semilla.
2. **El azar mueve el detalle, no la arquitectura.** En las ocho funciones la semilla decide longitudes y pendientes dentro de rangos literales (`between(rand, 3, 7)`, `between(rand, 4.5, 6.5)`), las proporciones de `split()` (l. 52-65, cada trozo entre 0,54 y 1,86 veces la media) y la ondulación de `rolling()` (l. 100-122). Las únicas dos decisiones de forma sorteadas del generador entero están en `mountainSegments`: el brazo de desnivel (l. 347) y el `finalKind` (l. 356). Ni una en las otras siete formas.
3. **Ciego a la geografía.** `buildRace()` (l. 886-929) calcula `country` en l. 889 y lo copia al objeto; a las tres ramas de construcción les pasa `row.stages`, `row.terrain`, `row.km` y `row.id`. Ninguna firma de `profileGen.ts` ni `oneDaySpec`, `featureSpec`, `stageMix`, `stagesFromEdition` recibe país. `nationalChampionships()` (l. 316-367) construye 532 campeonatos de 133 países con `classic(220, id)` e `itt(38, id)`: el de Ruanda y el de Bélgica salen de la misma función.

### 1.2 Lo que añade el ángulo de la calibración

El problema no es solo que las carreras se parezcan. Es que **las distribuciones del calendario no las ha decidido nadie**: son consecuencias de literales dentro de funciones, y por eso nadie puede afirmar contra qué se calibra el motor.

- **Dos generadores de reina, y solo uno vigilado.** De las 157 reinas del calendario, 52 salen de `mountainSegments` (con sorteo de desnivel y `queenFinalMix`), 51 de `mountainClassicSegments` (ediciones sin rasgos y un día) y 54 de rasgos reales (mapa 06 §1). `mountainClassicSegments` no está en `stageKind.test.ts` (l. 1-11) y el 14 % de sus salidas con los km de test se clasifica `media/Hills` (mapa 01 §2.6). Desnivel mediano por origen: 2.898 m, 1.734 m y 1.854 m. El «mix de finales del calendario» que `balance.md` v60 §1b compara con `queenFinalMix` ± 0,08 mezcla tres generadores y por eso no cuadra (dos cubetas fuera).
- **Una etapa de vuelta dibujada con una plantilla de un día.** `stagesFromEdition()` (l. 216-231) llama a `oneDaySpec(s.terrain, s.km, seed)` para toda etapa de edición sin rasgos: una reina de `race-colombia` (vuelta de 9 etapas) sale de `mountainOneDay`, o sea de `mountainClassicSegments`, con la etiqueta `Mountains`. `realQueens.ts` l. 46-49 describe Colombia e5 como «el último puerto a 62 km de meta y 47 km rodadores»; medido hoy: 18 km tras la cota (mapa 06 §3.2). La lista cerrada conserva el nombre y no la forma.
- **La etiqueta se escribe a mano y el recorrido dice otra cosa.** `TERRAIN_KIND` (l. 183-190) y los constructores `flat/hilly/mountain/...` (l. 108-172) ponen `kind` y `label` por terreno; `stageKindOf` (`stageKind.ts` l. 71-98) lo lee del relieve. Medido: 72 etapas del calendario cuyo `stageKindOf` no coincide con su `kind` declarado (mapa 06 §2.1), y `apps/api/src/stageHistory.test.ts` l. 199 sella en 49 las etiquetas que hay que corregir.
- **Formas que el calendario no produce nunca.** 0 de 1.075 etapas en línea tipan `muro` (`balance.md` v60 §12): `classicSegments` reparte los muros con `split(fill, nWalls + 1)` (l. 479) y el último cae a 1/5 del relleno de la meta, 16 a 184 km (medido). El final `muro` de `finish.ts` l. 180-188 exige `climbKm <= 1` (`STAGE.muroMaxKm`, constants l. 4462), `g >= 8` y cima a `finishSummitKm`. No hay circuitos, no hay muros adoquinados, no hay sector de pavé a menos de 40 km de meta (mapa 01 §2.7), no hay prólogo, no hay cronoescalada (`ittSegments === flatSegments`, `stageKind.test.ts` l. 33-34).
- **Kilometrajes ciegos a la clase.** 142 de 178 carreras de un día miden 210 km clavados (`row.km ?? 210`, l. 917); `ROUTE.kmFlat` a `kmSummit` (constants l. 1240-1243) dan 145-195 km a una .2 igual que a una WT. Una .2 de 5 etapas de 165-195 km sería la más larga de Europa (mapa 07 §4.1).
- **El relleno pesa y nadie lo cuenta.** Una llana de 130-215 km acumula 661-1.413 m solo de `rolling` (mapa 01 §1); la reina persigue su objetivo de desnivel solo con los puertos (`dPlusBase`, l. 377) mientras `calendarQueens.ts::desnivelDe` (l. 55-59) suma también el relleno. La banda `<1500` de `BANDAS_DESNIVEL` se lee sobre una medida y el objetivo se persigue sobre otra.

### 1.3 Por qué esto es un problema de calibración y no de estética

`docs/epics.md` E3 pasos 3-4: la banda `mountain.breakawayWinPct` 25-45 estuvo cinco versiones en verde sobre `reina-150` (135 km de llano y 15 km al 8 %, `scenarios.ts` l. 332-336) mientras las reinas reales daban 3,3 % y la gira 0 %; el paso 7 corrigió que el calendario entero da 18,1 % porque el generador hace montaña MÁS BLANDA (mediana 2.023 m contra 3.500-5.000 reales). `targets.ts` l. 79-84 reetiquetó la banda vieja como «control de forma». El mapa 04 §3.3 cuenta seis repeticiones del mismo patrón (v15, v17, v19, v23, v40, v44) y en cuatro el defecto era del perfil.

Consecuencia directa para el diseño: **17 de las 32 bandas de `TARGETS` se miden sobre perfiles generados** (mapa 04 §2), y cuando el generador cambió en la v64 (`ENGINE_VERSION` 63 → 64) «todos los perfiles de montaña del calendario» cambiaron sin remedición anotada de `realQueens`, `grandTour` ni `smallTours` (mapa 04 §3.4). El banco mide motor y generador a la vez y no tiene forma de separarlos. Ese es el hueco que este diseño cierra: el generador tiene que producir distribuciones **declaradas** (constantes con intención y banda), **verificables sin simular** (geometría, coste cero, en cada push) y **estratificables** (por clase, formato, región y arquitectura), para que cada banda de simulación diga sobre qué población se mide.

---

## 2. Principios

1. **Las distribuciones se deciden, no se heredan.** Todo estadístico poblacional del calendario generado (reparto de arquetipos por clase, desnivel por formato, longitud del puerto final, densidad de adoquín, mix de finales) es una constante con intención en `constants.ts` y una banda geométrica que un test rápido comprueba sobre el calendario entero.
2. **Arquitectura primero, relieve después.** Cada etapa nace como un `RouteBrief` (esqueleto de motivos con posiciones) y solo después se dibuja en `Segment[]`. El banco, la interfaz y la identidad de la carrera hablan del brief; el motor solo ve los segmentos.
3. **El mundo tiene sitios.** El país (y donde hace falta la región) entra como una `GeoSignature` que restringe (qué no puede salir) y pondera (qué es probable).
4. **Una carrera es la misma carrera.** Su identidad es determinista desde `raceId`; la temporada solo mueve lo que un organizador mueve entre ediciones.
5. **Lo real manda y lo generado se declara.** Rasgos reales > edición real (ciudades, km, terreno) > generado. El origen viaja en el `StageSpec`, en `race_routes.route_source` y en la API.
6. **Nada sale que no exista.** Los vetos son una función pura sobre el brief, con test, y se aplican antes de dibujar.
7. **Determinismo con subflujos nominales**, igual que `stage/rng.ts` l. 26-35: cada decisión tira de su propio flujo, y refactorizar una no mueve las demás.
8. **El banco mide por frecuencia lo que el juego corre y por forma lo que quiere vigilar**, y las dos cosas salen del mismo censo geométrico.
9. **Ninguna banda nace en roja y ningún cambio de generador sin medida pareada pre-registrada**: la dirección esperada de cada banda se escribe en `balance.md` antes de correr.
10. **El motor no cambia.** Se respetan `stageKind.ts` (8,5 km, 3.200 m, 3 km), `finalKind.ts` (0,5 / 5 / 20 km) y `finish.ts` (`finishAltoMinKm` 3, `muroMaxKm` 1, `muroMinGradient` 8). Las tres excepciones argumentadas están en §9.4.

---

## 3. El modelo

### 3.1 La firma geográfica

```ts
// routes/geo.ts
export type GeoKey =
  | 'flandes' // pólder, bergs de 0,3-2,2 km, adoquín masivo, viento
  | 'ardenas' // cotas 1-4,5 km × 6-11 %, sin adoquín llano
  | 'norte-fr' // Roubaix, Denain, Bretaña: adoquín y tierra, viento
  | 'prealpes-it' // Lombardía, Piamonte, Véneto: 4-13 km × 6-8 % con muros al 15 %+
  | 'italia-centro' // Toscana, Marcas, Emilia: muros urbanos, sterrato
  | 'alpes' // 12-25 km × 6-9 %, cimas 1.800-2.800 m
  | 'pirineos' // 10-17 km × 7-8,5 %, sin valle largo
  | 'dolomitas' // 7-14 km × 7,5-12 %
  | 'cantabrico' // 5-15 km × 7-10 % con rampas al 20 %+, muros vascos
  | 'meseta' // llano y páramo, viento, 3-8 km × 4-6 %
  | 'mediterraneo' // Levante, Andalucía, Provenza, Baleares: 3-20 km secos, Ventoux
  | 'macizo-central' // media montaña volcánica, Vosgos, Jura
  | 'europa-central' // Mittelgebirge 2-12 km, Alpes austriacos y eslovenos
  | 'atlantico-norte' // Bretaña, Normandía, RU, Irlanda, Escandinavia: côtes cortas, viento
  | 'balcanes' // sierras 10-25 km al 6 %, calor
  | 'andes' // altiplano, puertos 15-80 km × 4-7 %
  | 'desierto' // Golfo, Arabia, San Juan: llano absoluto + 1-2 jebel
  | 'colinas-oceania' // Adelaida, Victoria: 1,5-3 km × 7-9 %
  | 'asia-tropical' // Guangxi, Hainan, Malasia: llano + un puerto largo
  | 'norteamerica' // costas, Rocosas, critérium
  | 'generico' // fallback: media montaña suave sin adoquín ni altitud

export interface GeoSignature {
  key: GeoKey
  /** Puertos: longitud y pendiente que existen aquí. `null` = no hay puertos de verdad. */
  puerto: { kmMin: number; kmMax: number; gMin: number; gMax: number } | null
  /** Muros (≤ 3 km): longitud y pendiente. `null` = no hay muros. */
  muro: { kmMin: number; kmMax: number; gMin: number; gMax: number } | null
  /** Adoquín: sectores por carrera de un día y km totales. `null` = prohibido. */
  adoquin: { sectoresMin: number; sectoresMax: number; kmMin: number; kmMax: number } | null
  /** Tierra/sterrato: idem, se dibuja como `paves` de 2-3 estrellas. */
  sterrato: { sectoresMin: number; sectoresMax: number; kmMin: number; kmMax: number } | null
  /** ¿Puede un muro ir adoquinado? (Kwaremont, Koppenberg). */
  muroAdoquinado: boolean
  /** Altitud máxima de cima en metros: solo informativa (§13), y veto para `reina_alto` largo. */
  cimaMaxM: number
  /** Exposición al viento 0..1: solo informativa hoy (§13). */
  viento: number
  /** Amplitud del relleno entre dificultades, como `RELIEF.rollingAmplitude`. */
  amplitud: number
  /** Pesos de arquetipo por PAPEL: qué es probable aquí. Un peso 0 es un veto. */
  pesos: Partial<Record<Papel, Partial<Record<ArchetypeId, number>>>>
}

/** País ISO alpha-2 -> firma por defecto. Cubre las 133 entradas de `COUNTRIES` (test). */
export const COUNTRY_GEO: Record<string, GeoKey>
/** Carrera -> firma, cuando el país no basta (FR, ES, IT, BE tienen 3-5 firmas cada uno). */
export const RACE_GEO: Record<string, GeoKey>
```

`geoFor(request)` resuelve `RACE_GEO[raceId] ?? COUNTRY_GEO[country] ?? 'generico'`. Para las 532 .NC vale `COUNTRY_GEO`; para FR (57 carreras), BE (42), IT (40) y ES (28) el país es ambiguo y `RACE_GEO` es obligatorio (test: toda carrera de esos cuatro países tiene entrada). Las 133 entradas de `COUNTRY_GEO` se escriben una vez a partir de la tabla del mapa 07 §3; `world/climate.ts::PAIS_ZONA` (l. 63) ya hace lo mismo para el clima y sirve de modelo.

### 3.2 Los motivos y el brief

```ts
// routes/brief.ts
export type Motif =
  | { tipo: 'llano'; km: number } // rodador, amplitud baja
  | { tipo: 'ondulado'; km: number; amplitud: number } // rompepiernas (ver §13.2)
  | { tipo: 'puerto'; km: number; g: number; forma: 'regular' | 'irregular' | 'final_duro' }
  | { tipo: 'muro'; km: number; g: number; adoquin: boolean } // ≤ 3 km, ≥ 8 %
  | { tipo: 'descenso'; km: number; g: number } // g negativa, ≥ 2 en valor absoluto
  | { tipo: 'sector'; km: number; estrellas: 1 | 2 | 3 | 4 | 5; firme: 'adoquin' | 'tierra' }
  | { tipo: 'circuito'; vueltas: number; motivos: Motif[] } // se desenrolla al dibujar

export type Papel =
  | 'llana'
  | 'media'
  | 'media-alto'
  | 'media-muro'
  | 'reina'
  | 'reina-valle'
  | 'reina-corta'
  | 'cri'
  | 'prologo'
  | 'cronoescalada'
  | 'un-dia' // el papel de toda carrera de un día: el arquetipo lo decide la firma

export type ArchetypeId =
  // un día
  | 'sprint_llano'
  | 'sprint_con_cota'
  | 'circuito_cotas'
  | 'muros_encadenados'
  | 'adoquin_denso'
  | 'montana_un_dia'
  | 'muro_final'
  | 'montana_final_largo_raro'
  // etapa de vuelta
  | 'etapa_llana'
  | 'etapa_media_valle'
  | 'etapa_media_alto'
  | 'etapa_media_muro'
  | 'etapa_reina_alto'
  | 'etapa_reina_valle'
  | 'etapa_reina_corta'
  | 'cri_llana'
  | 'cri_prologo'
  | 'cri_escalada'

export type FinalBrief = 'sprint' | 'muro' | 'alto' | 'cima_cerca' | 'valle_corto' | 'valle_largo'

export interface RouteBrief {
  arquetipo: ArchetypeId
  firma: GeoKey
  km: number
  motivos: Motif[] // en orden, suman `km` (los circuitos ya desenrollados en `render`)
  final: FinalBrief // lo que `finalKindOf` / `finishType` deben leer después
  kindEsperado: StageKind // lo que `stageKindOf` debe devolver después
  /** Una línea para la ficha: «Clásica de muros · 14 cotas · última a 9 km». */
  resumen: string
  /** Solo informativo hoy: no llega al motor (§13). */
  altitudBaseM: number
  viento: number
}

export interface RouteRequest {
  raceId: string
  stageIndex: number // 1-based; 1 en un día
  season: number // 1 en SEASON_CALENDAR
  papel: Papel
  km?: number // fijo si viene de una edición o de la fila; si no, por clase (§7.3)
  country: string
  raceClass: RaceClass // 'WT' | 'Pro' | '1' | '2' | 'NC'
  format: RaceFormat
  terrainHint?: EditionTerrain // solo para etapas de edición sin rasgos: restringe el arquetipo
}
```

### 3.3 Cómo encaja con `Segment` y `Ramp`

El contrato del motor no cambia (`stage/types.ts` l. 11-48: `Segment { km, tipo, tramos?, estrellas? }`, `Ramp { km, g }`). `render(brief, seed)` traduce motivo a motivo:

| Motivo     | Segmentos que produce                                                                                                                                                                         | Por qué así                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `llano`    | `rolling(rand, km, false)` de hoy (`profileGen.ts` l. 100-122), amplitud `firma.amplitud · 0,55`                                                                                              | el relleno existente vale; se le da amplitud por firma, que es la perilla que `balance.md` «engine 3→4» dejó anotada                                         |
| `ondulado` | `rolling` con amplitud `firma.amplitud`, **todo `llano` con tramos**, nunca `rompepiernas`                                                                                                    | `sample.ts` l. 100-101 fija `g = 1,5` a un `rompepiernas` e ignora sus tramos; escribirlo sería perder la ondulación (mapa 03 §2.4)                          |
| `puerto`   | un `puerto` con `climb(rand, km, g)` (l. 72-82); `forma: 'irregular'` sube el ruido de ±1,2 a ±2,5; `final_duro` pone el último 25 % a `g + 3`                                                | SPEC §6.17 exige que un puerto irregular abra brecha ≥ 1,5× (mapa 05 §1.4): hoy ningún generador produce «irregular» a propósito                             |
| `muro`     | un `puerto` de `km` ≤ 3 con 2-3 tramos a `g ≥ 8`; si `adoquin`, sigue siendo `puerto` (regla 5 de `fuentes-recorridos.md`: un muro adoquinado va como puerto por el terreno único por bloque) | `stageKindOf` llama `clasica` a lo que solo tiene cotas ≤ 3 km (`WALL_MAX_KM`, l. 60); `finish.ts` l. 180-188 tipa `muro` si `climbKm ≤ 1` y `g ≥ 8` en meta |
| `descenso` | `descent(rand, km, g)` (l. 85-93)                                                                                                                                                             | igual que hoy; solo selecciona con `g ≤ −4` (mapa 03 §4.2)                                                                                                   |
| `sector`   | `{ km, tipo: 'paves', estrellas }` sin tramos                                                                                                                                                 | como `cobblesSegments` l. 502; `tierra` se dibuja `paves` 2-3★ (Strade en `classicRoutes.ts` l. 594 ya lo hace)                                              |
| `circuito` | `vueltas` copias de sus motivos, la última cortada si la meta no cae en el cierre                                                                                                             | el motor no tiene noción de vuelta; solo importa la repetición de la cota                                                                                    |

Después de `render`: `normalize()` (l. 141-177, se conserva tal cual), las guardas de §4.5 y `auto()` (`calendar.ts` l. 93-102) para las pancartas de cima. Un `muro` recibe pancarta igual que un puerto, así que `lastClimbKm` (`finalKind.ts` l. 46-57) lo ve aunque mida menos de `CLIMB_MIN_KM` (1,5), y el borde de 12/1.500 clásicas «sin última cota» del mapa 01 §2.4 desaparece.

### 3.4 Lo que gana `StageSpec`

```ts
export interface StageSpec {
  kind: StageKind
  label: string
  profile: StageProfile
  timeTrial?: boolean
  /** De dónde sale el relieve. `race_routes.route_source` y la API lo copian (§10). */
  source: 'real' | 'edicion' | 'generado'
  /** Solo si `source !== 'real'`: la arquitectura decidida antes de dibujar. */
  brief?: RouteBrief
}
```

`kind` y `label` dejan de escribirse a mano: `kind = stageKindOf(profile, timeTrial).kind` y `label = stageKindOf(...).label`, comprobados contra `brief.kindEsperado` (R28.1(b), que `balance.md` v60 §1b dejó a medias). Con eso el sello de 49 de `stageHistory.test.ts` l. 199 debe bajar a 0 para las generadas, y lo que quede son las reales (donde el relieve manda sobre la fila).

---

## 4. El algoritmo

Todo determinista, puro, sin `Date.now` ni `Math.random`. Semilla base de etapa: `${raceId}|${season}|${stageIndex}`. Cada decisión pide su subflujo con `routeRng(`${base}::${nombre}`)`, calcado de `stageRng` (`stage/rng.ts` l. 32-35). Lista cerrada de subflujos: `identidad`, `edicion`, `arquetipo`, `esqueleto`, `motivos`, `relieve`, `rampas`, `reintento-N`.

```ts
export function stageFor(req: RouteRequest): StageSpec {
  const firma = geoFor(req)                                      // §5, sin azar
  const identidad = raceIdentity(req.raceId, firma, req)         // §6, subflujo `identidad` sobre raceId SOLO
  const edicion = editionOf(identidad, req.season)               // §6, subflujo `edicion`
  for (let intento = 0; intento < GEN.maxIntentos; intento++) {
    const rng = subflows(`${req.raceId}|${req.season}|${req.stageIndex}::reintento-${intento}`)
    const arquetipo = pickArchetype(firma, req.papel, edicion, rng('arquetipo'))   // 4.1
    const brief = buildBrief(arquetipo, firma, req, edicion, rng('esqueleto'), rng('motivos')) // 4.2
    const vetos = vetoesOf(brief, req)                                              // 4.3, §9
    if (vetos.length > 0) continue
    const segments = guard(normalize(render(brief, rng('relieve'), rng('rampas')), brief.km), brief) // 4.4, 4.5
    const profile = auto(segments)
    const shape = stageKindOf(profile, brief.kindEsperado === 'cri')
    if (shape.kind !== brief.kindEsperado) continue
    if (!finalMatches(profile, brief.final)) continue
    return { kind: shape.kind, label: shape.label, profile, timeTrial: ..., source: 'generado', brief }
  }
  return stageFor({ ...req, papel: fallbackPapel(req.papel) })   // 4.6
}
```

### 4.1 Elegir el arquetipo (subflujo `arquetipo`)

`pickArchetype` toma `firma.pesos[papel]` (tabla §5.2), quita los que la identidad de la carrera no admite (§6: una carrera «es» de uno o dos arquetipos) y sortea proporcionalmente. Un peso ausente vale 0 y es un veto. Para `papel: 'un-dia'` el arquetipo es la identidad de la carrera y no se sortea por edición.

### 4.2 Construir el esqueleto (subflujos `esqueleto` y `motivos`)

Cada arquetipo es una función `skeleton(firma, km, rngE, rngM): Motif[]` que decide (a) cuántas dificultades y de qué tipo, (b) en qué km del recorrido caen, expresado como fracciones de la distancia, (c) los parámetros de cada una muestreados en la INTERSECCIÓN del rango del arquetipo y del rango de la firma. Las decisiones de forma van en `rngE`; los parámetros en `rngM`. Así una firma que cambie sus rangos no rebaraja la forma de todas sus etapas. Rejilla de posición: los huecos se reparten con `split()` como hoy, pero con pesos por hueco declarados en el esqueleto (por ejemplo `muros_encadenados` concentra el 70 % de las cotas en el último 45 % de la carrera; `montana_un_dia` deja el primer 40 % sin puerto).

Esqueletos, con los rangos (todo en `GEN`, §8):

| Arquetipo                  | Dificultades                                                                                                                                                       | Dónde                                                    | Final                                                                       | `kindEsperado`                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| `sprint_llano`             | 0-2 cotas de 1-3 km al 3-5 % antes del 60 %                                                                                                                        | libre                                                    | `sprint`                                                                    | `llana`                                                 |
| `sprint_con_cota`          | 1-2 puertos suaves de 3-6 km al 3,5-4,5 % con cima a 5-25 km (Poggio, Cipressa), 0-3 capi de 1-2 km                                                                | último tercio                                            | `sprint` (`finalKindOf` = `cima_cerca`/`valle_corto`, pero `kind` llana no) | `media` (3-6 km > `WALL_MAX_KM`); ver §9.4              |
| `circuito_cotas`           | tramo lineal del 20-40 % + circuito de 10-16 km × 6-16 vueltas con 1-2 cotas de 0,4-2 km al 6-11 %                                                                 | circuito al final                                        | `sprint` o `muro` si la cota cierra a ≤ 1 km                                | `clasica` (todas ≤ 3 km)                                |
| `muros_encadenados`        | 10-20 muros de 0,3-2,2 km al 5-13 % (adoquinados con p 0,4 si `muroAdoquinado`), 0-8 sectores llanos de 0,5-2,5 km                                                 | 70 % en el último 45 %                                   | `sprint` con última cota a 1-15 km                                          | `clasica`                                               |
| `adoquin_denso`            | 12-30 sectores de 0,3-3,7 km (1-5★, 2-3 de 5★), sin puerto                                                                                                         | del 35 % en adelante, separación 2-8 km, último a 1-8 km | `sprint`                                                                    | `clasica` (Cobbles)                                     |
| `montana_un_dia`           | 3-6 puertos de 4-13 km al 5,5-8 % en el último 55 %, último de 1,3-8 km al 7-11 % con cima a 3-25 km, p 0,4 de cota de remate de 1-3 km al 6-8 % dentro del run-in | primer 40 % sin puerto                                   | `cima_cerca` / `valle_corto` / `valle_largo`                                | `reina` (por ≥ 3.200 m o puerto ≥ 8,5) o `media` (§9.4) |
| `muro_final`               | como `muros_encadenados` o `montana_un_dia` suave + muro final de 0,5-2,2 km al 8-12 % en meta (Huy, San Luca, Superga es 4,9 y va a `media-alto`)                 | idem                                                     | `muro` (≤ 1 km) o `alto` corto (1-2,2 km, tipa `puncheur` en `finish.ts`)   | `media` (Uphill finish)                                 |
| `montana_final_largo_raro` | como `montana_un_dia` + final en puerto de 12-22 km al 6-8 %                                                                                                       |                                                          | `alto`                                                                      | `reina`                                                 |
| `etapa_llana`              | 0-2 cotas de 1-4 km al 3-6 %                                                                                                                                       | libre, ninguna en los últimos 25 km                      | `sprint`                                                                    | `llana` o `media`                                       |
| `etapa_media_valle`        | 2-5 puertos de 3-8 km al 4,5-7 %, último a 10-40 km                                                                                                                | repartidos                                               | `valle_corto` / `valle_largo`                                               | `media`                                                 |
| `etapa_media_alto`         | 1-3 intermedios como arriba + final de 3-8 km al 5-10 % (Arrate, Planche, Willunga)                                                                                |                                                          | `alto`                                                                      | `media` (final ≤ 8,4 km)                                |
| `etapa_media_muro`         | 1-3 intermedios + muro final de 0,5-3 km al 8-12 %                                                                                                                 |                                                          | `muro` o `alto` corto                                                       | `media`                                                 |
| `etapa_reina_alto`         | 2-4 puertos de 6-15 km + final de 8,6-22 km al 6-9 % (≤ 22 km solo con `g` ≤ 7)                                                                                    | ≥ 40 % de km de subida fuera de los últimos 30 km        | `alto`                                                                      | `reina`                                                 |
| `etapa_reina_valle`        | 3-5 puertos de 6-17 km, último de 8,6-17 km al 6,5-9 % con cima a 1,5-45 km                                                                                        |                                                          | `cima_cerca` / `valle_corto` / `valle_largo` (reparto `GEN.reinaValleMix`)  | `reina`                                                 |
| `etapa_reina_corta`        | 120-140 km, 2-3 puertos de 8,6-16 km desde el km 10, sin llano de más de 12 km                                                                                     |                                                          | `alto` (p 0,7) o `cima_cerca`                                               | `reina`                                                 |
| `cri_llana`                | 14-44 km, 0-1 repecho de 0,5-1,5 km al 3-5 %                                                                                                                       |                                                          | `sprint`                                                                    | `cri`                                                   |
| `cri_prologo`              | 3-8 km, todo `llano`                                                                                                                                               | solo etapa 1                                             | `sprint`                                                                    | `cri`                                                   |
| `cri_escalada`             | 8-20 km, los últimos 5-12 son un puerto al 6-9 %                                                                                                                   |                                                          | `alto`                                                                      | `cri`                                                   |

### 4.3 Vetar antes de dibujar

`vetoesOf(brief, req): Veto[]` es pura y devuelve la lista de reglas de §9 que el brief incumple. Se prueba con briefs literales, sin RNG. Un brief vetado no se corrige: se reintenta con el siguiente subflujo `reintento-N` (mismo arquetipo si la firma lo admite; a partir del tercer reintento el sorteo de arquetipo se repite). `GEN.maxIntentos = 8` y la tasa de reintento por (arquetipo, firma) se mide en el censo (§11.1): si supera el 20 % la combinación está mal parametrizada y el test rápido lo dice.

### 4.4 Dibujar (subflujos `relieve` y `rampas`)

`render` recorre `motivos` en orden. `relieve` alimenta `rolling` (chunks, amplitud, signo); `rampas` alimenta `climb`/`descent` (`split` de rampas y ruido). Un circuito se desenrolla ANTES de tirar dados, y sus vueltas comparten motivos pero no ruido de rampa: la misma cota doce veces con el mismo `g` medio y rampas ligeramente distintas, como se ve en un perfil real trazado a mano.

### 4.5 Guardas posteriores a `normalize()`

Se conservan `normalize()` (proporcional, residuo al segmento más largo) y `garantizaPuerto()` (`profileGen.ts` l. 192-233), pero parametrizadas por el brief y no por la función:

- `kindEsperado: 'reina'` con `final: 'alto'` → puerto final ≥ 8,6 (como hoy, l. 413).
- `kindEsperado: 'media'` con `final: 'alto'` → puerto más largo ≤ 8,4 (como hoy, l. 310).
- `kindEsperado: 'clasica'` → toda cota ≤ 2,9 km (**nuevo**: hoy `classicSegments` no lo garantiza y `normalize` puede estirar un muro de 2,5 a 3,1).
- `final ∈ {cima_cerca, valle_corto, valle_largo}` → el valle tras la última cota se recorta o alarga a la cubeta pedida con holgura de 0,3 km respecto a los cortes 0,5 / 5 / 20 de `FINAL_KIND_CUTS` (**nuevo**: cierra las 4 de 6.000 cubetas cruzadas del mapa 01 §2.5).
- Con `garantizaPuerto` la suma de tramos y el `km` del segmento pueden diferir 0,1-0,2 (mapa 01 §5.1); la guarda nueva iguala el `km` del segmento a la suma de sus tramos redondeada, y `climbSize()` (`stageKind.ts` l. 36-42) y `garantizaPuerto` dejan de medir cosas distintas.

Tras las guardas se comprueba `stageKindOf` y `finalKindOf` contra el brief. Si no cuadran, reintento. Medido hoy: 1-3 de 1.500 cruces por forma (mapa 01 §5.1); con la holgura y la guarda de tramos el objetivo es 0 de 1.500 en el test de §12 paso 4.

### 4.6 Fallback

Si los 8 intentos fallan, el papel se degrada por una tabla fija (`reina-valle → reina → media-alto → media → llana`, `un-dia → sprint_llano`) y se registra en el brief (`resumen` termina en «(fallback)»). El censo cuenta fallbacks y el test rápido exige 0 sobre el calendario: un fallback es un defecto de parametrización, no un resultado aceptable.

---

## 5. La geografía

### 5.1 Cómo entra el país

`buildRace()` ya tiene `country` en l. 889; pasa a formar parte de `RouteRequest` junto con `raceClass` y `format`. `nationalChampionships(code, name)` (l. 316) ya recibe el código: sus cuatro `StageSpec` pasan por `stageFor` con `papel: 'un-dia'` (ruta) y `'cri'` (crono) y `country: code`. `stagesFromEdition` pasa `country` y `terrainHint: s.terrain` para que el arquetipo respete el terreno verificado de la edición (`EditionTerrain`, `editions.ts` l. 10) pero lo dibuje con la firma del país y con un arquetipo DE ETAPA (`etapa_*`), no de un día.

### 5.2 Las firmas, en números

Los rangos salen del mapa 07 §3 (25 filas, aquí fundidas en 20 claves más `generico`). Solo se listan las columnas que el generador consume; `cimaMaxM` y `viento` se guardan en el brief y no llegan al motor (§13).

| `GeoKey`          | `puerto` km × g        | `muro` km × g  | `adoquin` (sectores / km) | `sterrato`              | `muroAdoquinado` | `cimaMaxM`          | `viento` | `amplitud` | Arquetipos de un día (pesos)                                                           |
| ----------------- | ---------------------- | -------------- | ------------------------- | ----------------------- | ---------------- | ------------------- | -------- | ---------- | -------------------------------------------------------------------------------------- |
| `flandes`         | null                   | 0,3-2,2 × 5-13 | 5-12 / 5-25               | null                    | sí               | 150                 | 0,9      | 0,55       | muros_encadenados 0,55 · sprint_llano 0,25 · adoquin_denso 0,1 · circuito_cotas 0,1    |
| `ardenas`         | 1-4,5 × 6-11           | 0,5-2 × 8-13   | 0-2 / 0-2                 | null                    | no               | 700                 | 0,4      | 0,85       | muros_encadenados 0,45 · muro_final 0,25 · montana_un_dia 0,2 · circuito_cotas 0,1     |
| `norte-fr`        | null                   | 0,3-1,5 × 5-10 | 10-30 / 15-55             | 5-30 / 10-30 (Bretaña)  | sí               | 300                 | 0,9      | 0,55       | adoquin_denso 0,5 · sprint_llano 0,3 · muros_encadenados 0,2                           |
| `prealpes-it`     | 4-13 × 6-8             | 1-2,5 × 10-16  | null                      | null                    | no               | 1.400               | 0,2      | 1,0        | montana_un_dia 0,55 · muro_final 0,2 · circuito_cotas 0,15 · sprint_con_cota 0,1       |
| `italia-centro`   | 1-6 × 6-12             | 0,5-2,5 × 8-16 | null                      | 8-15 / 30-70 (Toscana)  | no               | 1.700               | 0,4      | 1,0        | muros_encadenados 0,35 · muro_final 0,25 · circuito_cotas 0,2 · sprint_llano 0,2       |
| `alpes`           | 12-25 × 6-9            | null           | null                      | null                    | no               | 2.800               | 0,2      | 1,15       | montana_un_dia 0,6 · montana_final_largo_raro 0,1 · circuito_cotas 0,3                 |
| `pirineos`        | 10-17 × 7-8,5          | null           | null                      | null                    | no               | 2.400               | 0,2      | 1,15       | montana_un_dia 0,8 · circuito_cotas 0,2                                                |
| `dolomitas`       | 7-14 × 7,5-12          | null           | null                      | null                    | no               | 2.300               | 0,1      | 1,15       | montana_un_dia 0,8 · circuito_cotas 0,2                                                |
| `cantabrico`      | 5-15 × 7-10            | 1-4 × 10-15    | null                      | null                    | no               | 1.800               | 0,5      | 1,0        | montana_un_dia 0,45 · muro_final 0,25 · circuito_cotas 0,3                             |
| `meseta`          | 3-8 × 4-6              | null           | null                      | null                    | no               | 2.250               | 0,9      | 0,7        | sprint_llano 0,6 · sprint_con_cota 0,2 · circuito_cotas 0,2                            |
| `mediterraneo`    | 3-20 × 6-8             | 1-4 × 8-12     | null                      | null                    | no               | 2.500               | 0,6      | 0,85       | sprint_con_cota 0,3 · montana_un_dia 0,3 · circuito_cotas 0,2 · sprint_llano 0,2       |
| `macizo-central`  | 5-17 × 6-10            | 1-2 × 8-12     | null                      | null                    | no               | 1.900               | 0,4      | 1,0        | montana_un_dia 0,45 · muro_final 0,2 · circuito_cotas 0,35                             |
| `europa-central`  | 2-12 × 4-10            | 0,5-2 × 8-12   | 0-2 / 0-2 (urbano)        | null                    | no               | 1.600 (2.670 en AT) | 0,4      | 0,85       | circuito_cotas 0,35 · muros_encadenados 0,25 · sprint_llano 0,25 · montana_un_dia 0,15 |
| `atlantico-norte` | 1-9 × 6-10             | 0,3-2 × 6-12   | 0-2 / 0-1 (urbano)        | 10-30 / 15-30 (Bretaña) | sí               | 650 (1.200 NO)      | 0,9      | 0,85       | circuito_cotas 0,4 · muros_encadenados 0,3 · sprint_llano 0,3                          |
| `balcanes`        | 10-25 × 5-7            | null           | null                      | null                    | no               | 2.100               | 0,5      | 0,85       | sprint_con_cota 0,4 · montana_un_dia 0,3 · sprint_llano 0,3                            |
| `andes`           | 15-40 × 4-7            | null           | null                      | null                    | no               | 3.700               | 0,2      | 1,15       | montana_un_dia 0,6 · circuito_cotas 0,4                                                |
| `desierto`        | 5-20 × 5-8 (1-2 jebel) | 1-3 × 6-8      | null                      | null                    | no               | 1.900               | 0,9      | 0,55       | sprint_llano 0,7 · sprint_con_cota 0,3                                                 |
| `colinas-oceania` | 1,5-3 × 7-9            | 1-2,5 × 7-11   | null                      | null                    | no               | 1.600               | 0,7      | 0,85       | circuito_cotas 0,6 · sprint_llano 0,4                                                  |
| `asia-tropical`   | 5-20 × 6-9 (uno)       | null           | null                      | null                    | no               | 1.900               | 0,3      | 0,7        | sprint_llano 0,6 · sprint_con_cota 0,4                                                 |
| `norteamerica`    | 5-30 × 4-9             | 0,5-2 × 8-11   | null                      | null                    | no               | 3.700               | 0,6      | 0,85       | circuito_cotas 0,5 · montana_un_dia 0,2 · sprint_llano 0,3                             |
| `generico`        | 3-10 × 5-8             | 0,5-2 × 8-11   | null                      | null                    | no               | 1.500               | 0,4      | 0,85       | circuito_cotas 0,4 · sprint_llano 0,3 · muros_encadenados 0,3                          |

Los pesos por papel de etapa (`etapa_*`) se derivan con la misma tabla: `etapa_reina_*` solo donde `puerto.kmMax ≥ 8,6`; `etapa_media_muro` solo donde `muro !== null`; `etapa_llana` en todas. Un `terrain: 'mountain'` en `flandes` (no existe en el calendario hoy) sería un veto V3 de §9 y caería a `hilly`.

### 5.3 Lo que la geografía decide de la COMPOSICIÓN

`tourCharacter(firma, terrain)` (§7.1) reduce la firma a un carácter de vuelta. Y `kmByClass` (§7.3) no es geográfico: es de clase. La única influencia de la firma en los km es `andes` (+10 % de duración de puerto, cero km de llano a nivel del mar) y `desierto` (una sola dificultad por vuelta).

### 5.4 Comprobación de que el mundo está bien puesto

Test rápido sobre `SEASON_CALENDAR`: (a) toda carrera resuelve una firma distinta de `generico` salvo las que una lista `GEO_GENERICO_OK` admite explícitamente; (b) ningún `sector` de firme `adoquin` fuera de las firmas con `adoquin !== null` (mapa 07 §3 verificó una a una las 20 filas `cobbles` actuales: todas en BE, norte de FR, RU y Véneto, así que el mundo actual ya cumple y el test lo sella); (c) ningún `montana_final_largo_raro` fuera de `alpes`, `mediterraneo` (Ventoux), `pirineos`.

---

## 6. La identidad entre ediciones

### 6.1 Qué es la identidad de una carrera

`raceIdentity(raceId, firma, req)` se siembra SOLO con `raceId` (subflujo `identidad`) y decide lo que un organizador no cambia de un año a otro:

```ts
export interface RaceIdentity {
  arquetipos: ArchetypeId[] // 1 (un día) o el conjunto admitido por etapa (vuelta)
  firma: GeoKey
  /** Un día: el rasgo que la hace reconocible (el muro final, el sector de 5★ a 17 km, el circuito). */
  rasgoFijo: Motif | null
  /** Vuelta: la plantilla de composición (§7.2) y qué etapa es la reina. */
  plantilla?: TourTemplate
  /** Variantes de final entre las que la edición elige (Lombardía por Como o por Bérgamo). */
  variantes: FinalBrief[] // 1-3
  kmBase: number
}
```

### 6.2 Qué mueve la edición

`editionOf(identidad, season)` se siembra con `${raceId}|${season}` (subflujo `edicion`) y solo puede: (a) mover `km` en ±`GEN.edicionKmJitter` (0,04); (b) elegir una de `variantes`; (c) en una vuelta, permutar el orden de las etapas de en medio dentro de su bloque (§7.2) y cambiar el arquetipo de UNA etapa de en medio por otro del conjunto de la identidad; (d) sortear de nuevo relieve y rampas (subflujos `relieve` y `rampas` llevan `season` en la base). Lo que NUNCA mueve: firma, arquetipo del un día, `rasgoFijo`, número de etapas, existencia y posición de la crono, y el papel de la primera y la última etapa.

La temporada 1 reproduce hoy: `SEASON_CALENDAR` pasa a ser `calendarFor(1)`, y `calendarRun.ts` (que ya lleva `season`, l. 1608) llama a `calendarFor(season)` para las carreras cuyo `race_routes` no está congelado. Como el recorrido se congela el día de la etapa 1 (`raceRoutes.ts` l. 35-52, idempotente), una carrera en curso nunca cambia de edición a mitad. La API de la ficha (`apps/api/src/routes/calendar.ts` l. 97, `run?.profile ?? stage.profile`) debe leer `race_routes` antes que el código, o pasará lo que el mapa 03 §9.4 avisa: la altimetría de una etapa no corrida mostraría la edición del código y no la congelada.

### 6.3 Cómo se comprueba la identidad

Test rápido: para cada carrera generada, `calendarFor(1)` y `calendarFor(2)` dan (a) el mismo arquetipo y firma; (b) índice de Jaccard ≥ 0,6 sobre el multiconjunto de tipos de motivo (`puerto`, `muro`, `sector`...); (c) perfiles no idénticos (al menos un segmento distinto); (d) en vueltas, la misma etapa es crono y el mismo `papel` en la primera y la última. Y para `season` fija, `stageFor` es idempotente (dos llamadas, mismo objeto).

---

## 7. Vueltas por etapas

### 7.1 Carácter en vez de `MixTerrain`

`type TourCharacter = 'llana_viento' | 'clasicas' | 'media' | 'montana' | 'mixta'`, derivado de `(firma, terrain)`: `flandes/norte-fr/desierto/meseta + flat` → `llana_viento`; `flandes/ardenas/italia-centro + hilly|classic` → `clasicas`; `alpes/pirineos/dolomitas/cantabrico/andes + mountain` → `montana`; el resto de `hilly` → `media`; `mountain` en firma sin `puerto ≥ 8,6` → `media` (veto V3). Las 72 vueltas generadas de hoy (hilly 37, mountain 19, flat 16, mapa 02 §1) se reclasifican con esa tabla y el test rápido lista el resultado.

### 7.2 Plantillas de composición

`TourTemplate` es una lista de `Papel` por etapa más bloques. Reglas fijas (mapa 07 §2.1-2.3), todas vetos de §9 o garantías conservadas de `mixRoles` (`calendar.ts` l. 457-519):

1. Etapa 1: `llana`, o `prologo` con p `GEN.prologoChance[format]` (0,25 en una semana de ≥ 5 etapas, 0 en .2 de ≤ 4).
2. Crono: se conservan `ittMinStages` 3, `ittAlwaysFlatStages` 4, `ittChanceShort` 0,6, `ittChanceWeek` 0,9 y su posición (penúltima o antepenúltima, `ittEarlierChance`). Nueva: `cronoescalada` con p 0,08 en carácter `montana` (Peyragudes, Tour 2025 e13). Máximo una crono en .2 de ≤ 5 etapas (V11).
3. Última etapa: se conserva `lastDecisiveChance` por carácter y `lastSummitShare`.
4. Las de en medio: pesos `GEN.mixWeights[character]` sobre `[llana, media, media-alto, media-muro, reina, reina-valle]` (seis papeles, no cuatro). Propuesta: `llana_viento` [0,60 0,25 0,08 0,05 0,02 0], `clasicas` [0,30 0,35 0,10 0,20 0,05 0], `media` [0,30 0,36 0,17 0,05 0,07 0,05], `montana` [0,15 0,25 0,15 0,05 0,22 0,18], `mixta` [0,30 0,30 0,15 0,05 0,12 0,08]. Con `montana` el 40 % de reinas de hoy (`ROUTE.mixWeights.mountain[3]`) baja al 40 % repartido entre `alto` y `valle`, así que el número de reinas no cambia y sí su forma.
5. Garantías conservadas: `selectiveMinFraction`, `uphillFinishMinStages` 4, «nadie sin crono ni final en alto» (l. 511-517). `calendar.test.ts` l. 184-246 sigue en verde con las mismas aserciones.
6. **Bloques (nuevo)**: en vueltas de ≥ 6 etapas la reina no cae antes del 50 % de la vuelta (V12), dos reinas van seguidas o separadas por una sola etapa (bloque), y nunca hay tres llanas seguidas fuera de `llana_viento`.
7. Tope de finales en alto por vuelta de una semana: 3 (V13).
8. Gran vuelta generada (no existe hoy: las tres son de edición, mapa 06 §1.2, pero E12 puede añadir una): descansos tras 9 y 15, reina entre 15 y 20, ≤ 7 etapas de alta montaña, crono de ≥ 8 km fuera de la etapa 1, última llana salvo p 0,1 de crono.

### 7.3 Kilómetros por clase, no por papel solo

`GEN.kmByClass` (mapa 07 §4.1), como `[min, rango]` por papel y por clase:

| Clase | llana     | media / media-alto / media-muro | reina / reina-valle | reina-corta | un día                           |
| ----- | --------- | ------------------------------- | ------------------- | ----------- | -------------------------------- |
| WT    | [160, 30] | [150, 30]                       | [140, 40]           | [120, 20]   | [200, 60]                        |
| Pro   | [150, 30] | [140, 30]                       | [140, 35]           | [120, 20]   | [180, 50]                        |
| .1    | [140, 30] | [135, 30]                       | [135, 35]           | [115, 20]   | [170, 40]                        |
| .2    | [110, 40] | [110, 40]                       | [115, 40]           | [100, 20]   | [140, 40]                        |
| NC    |           |                                 |                     |             | ruta [180, 60], sub-23 [140, 40] |

Se conserva `lastStageKmFactor` 0,85 y las cronos (`ittKm*`) tal cual. Una fila con `km` explícito (36 de 178 un día) manda sobre la tabla; las 142 con `210` por defecto pasan a la tabla y el test de `raceRoutes.test.ts` (número de etapas) no se ve afectado.

---

## 8. Constantes

Bloque nuevo `GEN` en `constants.ts`, con comentario de intención por clave como el de `ROUTE`. Las claves de `ROUTE` que se conservan se citan; las que este diseño sustituye se marcan.

| Nombre                           | Valor propuesto                                                                                                        | Intención                                                                                                                                                             | En qué se apoya                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `GEN.maxIntentos`                | 8                                                                                                                      | Reintentos de brief antes del fallback; un fallback es defecto y el censo lo cuenta                                                                                   | §4.6                                                                       |
| `GEN.edicionKmJitter`            | 0,04                                                                                                                   | Cuánto mueve la edición los km; ±4 % es lo que se ve entre ediciones (Lombardía 238-255)                                                                              | mapa 07 §1.6                                                               |
| `GEN.oneDaySummitMaxKm`          | 6                                                                                                                      | Un día no muere en un puerto de más de 6 km: el caso v40                                                                                                              | `balance.md` v40 §1; mapa 07 §4.3                                          |
| `GEN.oneDayLongSummitShare`      | 0,02                                                                                                                   | Cuota de `montana_final_largo_raro` en el calendario de un día: «tres carreras sobre doscientas»                                                                      | mapa 07 §1.2                                                               |
| `GEN.oneDayLastClimb`            | km [1,3; 8], g [7; 11], cima a [3; 25] km                                                                              | La última subida de una clásica de montaña; hoy `mountainClassicSegments` da 4-8 km y 13-22 km de run-in                                                              | mapa 07 §1.6 y §4.3; sustituye los literales de `profileGen.ts` l. 451-453 |
| `GEN.oneDayRemateChance`         | 0,4                                                                                                                    | Cota de remate de 1-3 km dentro del run-in (San Fermo, Colle Aperto)                                                                                                  | mapa 07 §1.6                                                               |
| `GEN.wall`                       | km [0,3; 3], g [8; 13]                                                                                                 | Un muro; `WALL_MAX_KM` 3 de `stageKind.ts` es el techo y `muroMaxKm` 1 de `finish.ts` el corte de `muro`                                                              | `stageKind.ts` l. 60; `constants.ts` l. 4462                               |
| `GEN.wallsPerClassic`            | [10, 20]                                                                                                               | Muros por clásica de muros; hoy 4-5 (`classicSegments` l. 475), un tercio de la densidad real                                                                         | mapa 07 §1.3                                                               |
| `GEN.wallsLateShare`             | 0,7                                                                                                                    | Fracción de muros en el último 45 % del recorrido                                                                                                                     | mapa 07 §4.2                                                               |
| `GEN.cobbles`                    | sectores [12, 30], km [15, 55], estrellas5 [2, 3], último a [1, 8] km                                                  | Adoquín por densidad; hoy 3 sectores fijos y el último a 40 km                                                                                                        | mapa 07 §1.4; `profileGen.ts` l. 495                                       |
| `GEN.cobblesSectorKm`            | [0,3; 3,7]                                                                                                             | Longitud de sector                                                                                                                                                    | mapa 07 §1.4                                                               |
| `GEN.circuit`                    | vuelta [10, 16] km, vueltas [6, 16], lineal [0,2; 0,4]                                                                 | Clásica de circuito                                                                                                                                                   | mapa 07 §1.1                                                               |
| `GEN.queenFinal`                 | km [8,6; 22], g [6; 9]; g ≤ 7 si km > 17                                                                               | Puerto final de reina de gran vuelta y una semana; hoy 9-15 al 7,5-9,5 (l. 359-360)                                                                                   | mapa 07 §4.3                                                               |
| `GEN.queenShortFinal`            | km [4; 8], g [8; 12]                                                                                                   | Final en alto corto de reina (Planche, Xorret): va a `etapa_media_alto` con `g` alto porque `stageKindOf` lo llama media; ver §9.4                                    | mapa 07 §4.3                                                               |
| `GEN.queenMids`                  | n [2, 4], km [6, 17], g [5,5; 8]                                                                                       | Puertos intermedios de reina                                                                                                                                          | mapa 07 §4.2                                                               |
| `GEN.queenClimbOutsideLast30Min` | 0,25                                                                                                                   | Fracción mínima de km de subida a más de 30 km de meta en una reina: la variable que separó `reina-150` de las reales (0 % contra 6-38 %)                             | `balance.md` v43 §7; mapa 04 §3.2                                          |
| `GEN.queenDplusByFormat`         | gran-vuelta {3.200, 5.200}, una-semana {2.400, 4.200}, .2 {2.000, 3.500}, un-dia {3.000, 4.900}; muestreo log-uniforme | Sustituye `ROUTE.queenDplusRange` + `queenHighDplusShare` + `queenLowDplusRange`; la cola baja deja de ser un artefacto del 60/40 y pasa a ser la de las clases bajas | `balance.md` v60 §1b; mapa 06 §6.3                                         |
| `GEN.queenDplusIncludesFill`     | true                                                                                                                   | El objetivo se persigue sobre puertos MÁS relleno, que es lo que `calendarQueens::desnivelDe` mide                                                                    | mapa 01 §2.5                                                               |
| `GEN.reinaValleMix`              | cima_cerca 0,35 · valle_corto 0,45 · valle_largo 0,20                                                                  | Reparto de valles para `etapa_reina_valle`; con `etapa_reina_alto` aparte, `ROUTE.queenFinalMix` se retira y el mix del calendario sale de los pesos de composición   | `constants.ts` l. 1185; mapa 06 §6.2                                       |
| `GEN.valleyMargin`               | 0,3 km                                                                                                                 | Holgura de las cubetas de `FINAL_KIND_CUTS` al dibujar el valle                                                                                                       | mapa 01 §2.5                                                               |
| `GEN.mediaFinal`                 | km [3; 8,4], g [5; 10]                                                                                                 | Final en alto de media montaña; hoy 4-7,5 al 5-7,5 (l. 282-283)                                                                                                       | mapa 07 §2.2                                                               |
| `GEN.flatDplusMax`               | 1.500 m                                                                                                                | Una llana no acumula más; hoy el relleno solo da 661-1.413                                                                                                            | mapa 07 §4.4 regla 10; mapa 01 §1                                          |
| `GEN.kmByClass`                  | tabla §7.3                                                                                                             | Kilometraje por clase y papel; sustituye `ROUTE.kmFlat..kmSummit`                                                                                                     | mapa 07 §4.1                                                               |
| `GEN.stageMaxKm`                 | .2 180, .1 200, Pro 240, WT 280 (Sanremo 294 va por `km` de fila)                                                      | Techos UCI por clase                                                                                                                                                  | mapa 07 §4.1                                                               |
| `GEN.mixWeights`                 | tabla §7.2                                                                                                             | Pesos por carácter, seis papeles                                                                                                                                      | `ROUTE.mixWeights` l. 1224-1228                                            |
| `GEN.prologoChance`              | una-semana 0,25, .2 0                                                                                                  | Prólogo de 3-8 km en etapa 1                                                                                                                                          | mapa 07 §2.2                                                               |
| `GEN.cronoescaladaChance`        | 0,08 (carácter `montana`)                                                                                              | Existe y es rara                                                                                                                                                      | mapa 07 §2.1                                                               |
| `GEN.uphillFinishMaxWeek`        | 3                                                                                                                      | Tope de finales en alto en una semana                                                                                                                                 | mapa 07 §4.4 regla 7                                                       |
| `GEN.queenMinPosition`           | 0,5                                                                                                                    | La reina no antes de la mitad de una vuelta de ≥ 6                                                                                                                    | mapa 07 §2.1 regla 2                                                       |
| `GEN.rollingAmplitudeByGeo`      | columna `amplitud` de §5.2                                                                                             | La perilla que faltaba desde «engine 3→4»                                                                                                                             | `RELIEF.rollingAmplitude` l. 1123-1130                                     |
| `GEN.irregularNoise`             | ±2,5 (regular ±1,2)                                                                                                    | Puerto irregular; SPEC §6.17 promete brecha ≥ 1,5×                                                                                                                    | mapa 05 §1.4                                                               |

Se conservan sin tocar: `ROUTE.itt*` (crono), `ROUTE.lastDecisiveChance`, `grandTourStages`, `grandTourLastDecisiveFactor`, `lastSummitShare`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor`, todo `RELIEF` (es de `featureProfile.ts`). Se retiran: `queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`, `mixWeights`, `kmFlat..kmSummit` (con la nota en `balance.md` de qué los sustituye).

---

## 9. Reglas de veto y plausibilidad

`vetoesOf(brief, req)` devuelve identificadores. Cada uno es una función pura de una línea con test literal.

### 9.1 Vetos de etapa (sobre el brief)

| Id  | Regla                                                                                                                                                        | Fuente                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| V1  | Un día (`format: 'un-dia'` o `papel: 'un-dia'`) con final `alto` en un `puerto` > `GEN.oneDaySummitMaxKm` (6 km), salvo arquetipo `montana_final_largo_raro` | v40; mapa 07 §4.3                                    |
| V2  | `montana_final_largo_raro` fuera de `alpes`, `pirineos`, `mediterraneo`                                                                                      | mapa 07 §1.2                                         |
| V3  | Cualquier `puerto` con `km > firma.puerto.kmMax` o `g` fuera de `[gMin, gMax]`; cualquier `puerto` en firma con `puerto: null`                               | mapa 07 §3                                           |
| V4  | `sector` de firme `adoquin` en firma con `adoquin: null`; `tierra` con `sterrato: null`                                                                      | mapa 07 §3 consecuencia 1 y 2                        |
| V5  | `muro.adoquin` en firma sin `muroAdoquinado`                                                                                                                 | idem                                                 |
| V6  | Reina (`kindEsperado: 'reina'`) con puerto final `< 8,6 km` sin otro puerto de ≥ 8,6 ni ≥ 3.200 m de subida                                                  | `stageKind.ts` l. 61-63; mapa 07 §4.4 regla 2        |
| V7  | `etapa_llana` con desnivel estimado (puertos + relleno a `amplitud`) > `GEN.flatDplusMax`                                                                    | mapa 07 §4.4 regla 10                                |
| V8  | Reina con menos de `GEN.queenClimbOutsideLast30Min` de su subida a más de 30 km de meta                                                                      | `balance.md` v43 §7                                  |
| V9  | Final `muro` cuyo muro mide > 1 km o < 8 % (no tiparía `muro` en `finish.ts`)                                                                                | `constants.ts` l. 4462-4463                          |
| V10 | Circuito con más de 2 cotas por vuelta o vuelta < 8 km con cota > 2 km                                                                                       | mapa 07 §1.1                                         |
| V14 | Etapa de `.2` de más de 180 km; de `.1` de más de 200                                                                                                        | mapa 07 §4.1                                         |
| V15 | Un puerto final de más de 17 km con `g > 7`                                                                                                                  | mapa 07 §4.3 «siempre con pendiente inferior al 7 %» |
| V16 | `sector` en los primeros `0,35 · km` de un `adoquin_denso`                                                                                                   | mapa 07 §1.4 «no sectores en los primeros 90 km»     |

### 9.2 Vetos de composición (sobre la plantilla)

| Id  | Regla                                                                                                | Fuente                      |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------- |
| V11 | Dos cronos en una vuelta de ≤ 5 etapas; crono < 8 km fuera de la etapa 1                             | mapa 07 §2.3 y §4.4 regla 6 |
| V12 | Reina antes del `GEN.queenMinPosition` en vueltas de ≥ 6                                             | mapa 07 §2.1 regla 2        |
| V13 | Más de `GEN.uphillFinishMaxWeek` finales en alto en una semana; más de 7 alta montaña en gran vuelta | mapa 07 §4.4 reglas 6-7     |
| V17 | Tres llanas seguidas fuera de `llana_viento`; siete etapas de montaña seguidas                       | mapa 07 §2.1 regla 4        |
| V18 | Se conservan las garantías de `mixRoles`: crono o final en alto, primera llana o prólogo             | `calendar.ts` l. 511-517    |

### 9.3 El caso v40, recorrido paso a paso

Petición: `race-jura`, un día, FR, `RACE_GEO['race-jura'] = 'macizo-central'`, `papel: 'un-dia'`, 210 km. Con el generador de hoy `mountainOneDay` → `mountainClassicSegments` y antes de la v40 → `mountainSegments` con final en alto de 9-15 km. Con este diseño: `pesos['un-dia']` de `macizo-central` no incluye `montana_final_largo_raro`, así que un final `alto` de 14 km no puede ni sortearse; si un esqueleto lo produjera por error de parametrización, V1 lo vetaría y el reintento entraría. La etapa sale como `montana_un_dia`: 3-6 puertos de 5-17 km al 6-10 % (firma), último de 1,3-8 km al 7-11 % con cima a 3-25 km, `final: 'valle_corto'`, `kindEsperado: 'reina'` si suma ≥ 3.200 m o `media` si no, y el saturómetro de `invariants.test.ts` (l. 461-553, «las 8 más exigentes») la mide con `finishType` = `puncheur` o `sprint_*` en vez de `alto`.

### 9.4 Tres excepciones al principio 10, argumentadas

1. **`sprint_con_cota` clasifica `media`.** Sanremo con Poggio (3,7 km) y Cipressa (5,6 km) tiene cotas > `WALL_MAX_KM` y `stageKindOf` la llama `media/Hills` aunque sea llana de esprint. No se toca el clasificador (es el sello de `stageHistory`); el brief declara `kindEsperado: 'media'` y el `label` que ve el jugador sale de `brief.resumen` («Sprint con cota final»). Decisión del dueño §14.5 si prefiere un `label` nuevo en `TERRAIN_KIND`.
2. **`montana_un_dia` puede clasificar `media`.** Lombardía suma 4.400-4.900 m (`reina` por la red de 3.200 m); Lieja 4.000-4.500 con puertos de ≤ 4,5 km (`reina` por metros); una Emilia de 3.000 m sin puerto ≥ 8,5 sale `media`. Es correcto: el clasificador está pensado para eso (`stageKind.ts` l. 56-58, la red de metros existe «para los recorridos REALES»). La etiqueta del calendario deja de ser `reina` fija y pasa a lo que el relieve diga, que es lo que R28.1(b) pedía. El 14 % de `mountainClassicSegments` que hoy se clasifica `media` deja de ser un fallo silencioso y pasa a ser una decisión con brief.
3. **`etapa_media_alto` con `g` hasta 10-12 %.** Planche des Belles Filles (5,9 km al 8,5 %) y Xorret de Catí (3,9 al 11,4 %) son finales de gran vuelta que `stageKindOf` llama `media` (< 8,5 km). Van a `etapa_media_alto` con `GEN.mediaFinal.g` hasta 10 y a `GEN.queenShortFinal` cuando el papel es `reina` y la firma es `cantabrico`/`macizo-central`/`dolomitas`: entonces el brief lleva un puerto intermedio de ≥ 8,6 km para que la etapa siga siendo reina por el clasificador. No se mueve `PASS_MIN_KM`.

---

## 10. Lo real frente a lo generado

### 10.1 Prioridad

1. **Rasgos reales** (`STAGE_FEATURES`, `CLASSIC_FEATURES`): `featureSpec` como hoy, `source: 'real'`, sin brief. La geografía no toca nada aquí salvo la amplitud del relleno, que ya viene de `RELIEF.rollingAmplitude` por terreno (`featureProfile.ts` l. 359-360); se deja así para no mover 177 etapas reales.
2. **Edición sin rasgos** (`RACE_EDITIONS`, 226 etapas): `source: 'edicion'`, `km` y `terrainHint` de la edición, arquetipo de ETAPA elegido por firma y papel derivado del terreno (`flat → llana`, `hilly → media | media-alto | media-muro`, `mountain → reina | reina-valle`, `itt → cri`, `cobbles → llana con sectores`), brief presente. Con esto Colombia e5, Guatemala e9 y Tachira e6 de `REAL_QUEENS` pasan a ser reinas de etapa y no clásicas de un día.
3. **Generado**: todo lo demás, `source: 'generado'`.

### 10.2 Distinción en el sistema

- `race_routes.route_source` (`schema.ts` l. 523) se rellena desde `stage.source` en `freezeRaceRoute` (`raceRoutes.ts` l. 48-51 lo espera: «`routeSource` nace en el 1b con el campo que lo dice»). Regla: `real` → `'real'`, `edicion` y `generado` → `'generado'` (la columna es binaria); el matiz `edicion` viaja en la API.
- La API de calendario (`apps/api/src/routes/calendar.ts` l. 91-105) devuelve por etapa `source` y, si hay brief, `brief.resumen` y `brief.arquetipo`. La ficha de etapa (`stageHistory.ts`) hace lo mismo desde el snapshot.
- Interfaz: una etapa `real` muestra «Recorrido real» y la fuente de `classicRoutes.ts::RouteSource`; una `edicion` muestra «Ciudades y distancia reales, relieve generado»; una `generado` muestra «Recorrido generado» y el `resumen`. Es la promesa de E12 (`encargos.md` l. 605-608) resuelta desde el dato y no desde un texto.
- `scripts/inventario-recorridos.mjs` deja de deducir la marca por presencia en tablas y lee `source`, así que el documento y la interfaz no pueden discrepar.

---

## 11. El banco

### 11.1 El censo geométrico (nuevo, coste cero, en cada push)

`sim/routeCensus.ts`, puro, sin simular:

```ts
export interface RouteStats {
  raceId: string
  stageIndex: number
  raceClass: RaceClass
  format: RaceFormat
  firma: GeoKey | null
  arquetipo: ArchetypeId | null
  source: StageSpec['source']
  kind: StageKind
  finalKind: FinalKind | null
  finishType: FinishType // finishType con groupSize 50
  km: number
  dPlus: number // dPlus como calendarQueens::desnivelDe
  nPuertos: number
  nMuros: number
  longestClimbKm: number
  lastClimbKm: number
  lastClimbG: number
  kmAfterLastClimb: number | null
  climbKmOutsideLast30: number // km de `subida` con kmToGo > 30
  pavesKm: number
  nSectores: number
  estrellas5: number
  maxG: number
  huella: number[] // g por km (para correlación)
  intentos: number
  fallback: boolean
}
export function routeCensus(calendar = SEASON_CALENDAR): RouteStats[]
export function aggregate(rows: RouteStats[], by: (r) => string): Record<string, Summary>
```

`finishType` se calcula con `deriveFinishTerrain(sampleProfile(profile))` y `finishType(t, 50)` (`finish.ts` l. 71, 142), que es lo que el motor lee de verdad; así el censo puede decir cuántos `muro`, `puncheur`, `alto`, `pave` produce el calendario, que hoy nadie sabe sin correr `balance.md` v60 §12 a mano.

### 11.2 Bandas de realismo (`ROUTE_CENSUS_TARGETS`, test rápido)

Se leen sobre el calendario entero (1.418 etapas) o sobre el subconjunto generado (`source !== 'real'`), según se indique. Salen del mapa 07 §4 y del mapa 04 §5.1. Ninguna nace en rojo: se mide primero (paso 8 de §12), y se pone banda donde la cifra tenga dueño.

| Métrica                                            | Población                                    | Banda propuesta                                                                                           | Hoy (medido)                                                  | Fuente                     |
| -------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------- |
| Un día con final `alto` en puerto > 6 km           | un día generado                              | ≤ 2 %                                                                                                     | 0 % tras v40 (pero 9 de un día son `mountainClassicSegments`) | v40; mapa 07 §4.3          |
| Última subida de `montana_un_dia`: km              | idem                                         | p10-p90 en [1,3; 8]                                                                                       | 6,6-12,2 (cota más larga)                                     | mapa 07 §1.6               |
| Cima de la última subida a meta, un día de montaña | idem                                         | p10-p90 en [3; 25]                                                                                        | 12,8-22,8                                                     | mapa 01 §2.6               |
| Reina de una semana: dPlus                         | `etapa_reina_*` generadas, format una-semana | p50 en [2.600; 3.600], p10 ≥ 1.800                                                                        | mediana 2.898 (mountainSegments) / 1.734 (mountainClassic)    | mapa 06 §1                 |
| Reina: km de subida fuera de los últimos 30 km     | reinas generadas                             | ninguna en 0 %; p50 en [15; 40] %                                                                         | canónica 0 %, reales 6-38 %                                   | `balance.md` v43 §7        |
| Reina `alto`: longitud del puerto final            | idem                                         | p10-p90 en [8,6; 20]                                                                                      | 8,4-26,7 (cota más larga, incluye intermedios)                | mapa 01 §2.5; mapa 07 §4.3 |
| Mix de `finalKind` de las reinas                   | 157 reinas, todas                            | alto 0,35-0,50 · cima_cerca 0,10-0,25 · valle_corto 0,25-0,40 · valle_largo 0,05-0,15                     | 38,2 / 8,9 / 42,0 / 10,8                                      | v60 §1b                    |
| Finales `muro` (`finishType`)                      | calendario en línea                          | ≥ 15 etapas (1,4 %)                                                                                       | 0 de 1.075                                                    | v60 §12                    |
| Clásica de muros: nº de cotas                      | `muros_encadenados`                          | p10-p90 en [10; 20]                                                                                       | 4-5                                                           | mapa 07 §1.3               |
| Adoquín: sectores y km                             | `adoquin_denso`                              | sectores [12; 30], km [15; 55], último a ≤ 8 km                                                           | 3 sectores, ~40 km                                            | mapa 07 §1.4               |
| Llana: dPlus                                       | `etapa_llana` + `sprint_llano`               | p90 ≤ 1.500 m                                                                                             | 661-1.413                                                     | mapa 01 §1                 |
| Etapa de .2: km                                    | .2 generadas                                 | p90 ≤ 170, max ≤ 180                                                                                      | 145-195                                                       | mapa 07 §4.1               |
| Saturación de erosión                              | 8 más exigentes no WT                        | 0 de 8 saturan (banco existente, `invariants.test.ts` l. 461-553)                                         | 0                                                             | v40                        |
| Reintentos y fallbacks                             | todo generado                                | reintentos/etapa p90 ≤ 2; fallbacks = 0                                                                   | n/a                                                           | §4.6                       |
| Cruces de clasificación                            | todo generado                                | `stageKindOf(profile).kind === brief.kindEsperado` en el 100 %; `finalKindOf === brief.final` en el 100 % | 1-3 de 1.500 por forma                                        | mapa 01 §5.1               |

### 11.3 Bandas de variedad (test rápido)

| Métrica                                            | Cómo                                                 | Banda                                                                                                | Por qué                                                                         |
| -------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Arquetipos distintos por (clase, papel)            | recuento sobre `RouteStats.arquetipo`                | ≥ 4 en cada celda con ≥ 20 etapas                                                                    | «tres o cuatro modelos» es la queja                                             |
| Entropía de arquetipo por firma                    | Shannon normalizada                                  | ≥ 0,6 en firmas con ≥ 10 carreras                                                                    | que la geografía no sea otro molde único                                        |
| Correlación de huellas del mismo `kind` y km ±10 % | Pearson sobre `huella`, pares al azar (determinista) | mediana < 0,7; p90 < 0,9                                                                             | mapa 04 §5.2 pedía < 0,8; los circuitos correlacionan más y se excluyen del par |
| Posición del primer puerto en reinas               | km del primero / km total                            | p10 < 0,25 y p90 > 0,55                                                                              | hoy `split` lo pone siempre alrededor del mismo sitio                           |
| Secuencias de papeles en vueltas de 5              | frecuencia de cada secuencia                         | ninguna > 20 %                                                                                       | mapa 04 §5.2                                                                    |
| Entropía de `finalKind` en vueltas con ≥ 2 reinas  | Shannon                                              | ninguna vuelta con todas `alto` si tiene ≥ 3 reinas                                                  | mapa 04 §5.2                                                                    |
| Identidad entre ediciones                          | §6.3                                                 | Jaccard ≥ 0,6 y perfiles no idénticos                                                                | §6                                                                              |
| Nacionales                                         | arquetipos distintos entre los 133 `nc-*-road`       | ≥ 5 arquetipos; BE/NL/norte-FR con `muros_encadenados` o `adoquin_denso`; CO/EC con `montana_un_dia` | `motor.md` §V.3                                                                 |

### 11.4 Bandas de simulación: qué cambia, qué se mueve a propósito

Del mapa 04 §4 y del mapa 06 §4, con el tratamiento decidido:

| Banda                                                               | Qué le pasa                                                             | Tratamiento                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mountain.*` sobre `reina-150`                                      | no se mueve (canónica)                                                  | se renombra `forma.reinaCanonica.*` en el informe (la clave `mountain` engaña); se añade `reina-175-4800` canónica (plantilla 3 del mapa 07 §5: 45: 12 km 7 %; 95: 17 km 7,3 %; 130: 10 km 7,8 %; 159-175: 15,8 km 7,9 %) SIN banda, impresa en `pnpm sim`                                                                                                                                        |
| `calendarQueens.breakawayWinPct` 6-30                               | cambia la muestra (27 de 157) y 25 perfiles                             | se remide con 12 semillas fuera de CI antes de tocar el test; se estratifica: la banda global se conserva como vigilancia y se añaden `porFinalKind` (alto, cima_cerca, valle) y `porDplus` (las cuatro `BANDAS_DESNIVEL`) medidas y sin banda hasta tener σ. La muestra pasa a ser **estratificada por (finalKind × banda de desnivel)** y no solo por desnivel, `PASO` ajustado para ~30 etapas |
| `calendarQueens.test.ts` «`facil > dura + 10`»                      | la cola baja ya no la sostiene el 60/40 sino las clases .2 y una semana | se conserva la aserción; si la banda `<1500` queda con < 3 etapas en la muestra, la aserción pasa a compararse `<2000` contra `>3000` (decisión §14.3)                                                                                                                                                                                                                                            |
| `realQueens` (Colombia e5, Guatemala e9, Tachira e6)                | son de edición: pasan a `etapa_reina_*` con brief                       | la lista se cierra POR BRIEF: las tres entradas guardan un `RouteBrief` literal en `realQueens.ts` y se renderizan con `render(brief, seed)`, así el `why` vuelve a ser verdad y el banco es comparable entre versiones aunque el sorteo cambie. Se remiden `lastGroupPct` y `worstStagePct`                                                                                                      |
| `grandTour.*`                                                       | 20 de 21 reales; e21 generada como `etapa_llana`                        | no se mueve; si se mueve, el acoplamiento es un defecto (mapa 04 §5.3 regla 3)                                                                                                                                                                                                                                                                                                                    |
| `erosion.longClassicFresh`, `hardestClassicFresh`, `queenThirdWeek` | reales                                                                  | no se mueven                                                                                                                                                                                                                                                                                                                                                                                      |
| `smallTours.*` (9 bandas, 7 de 10 carreras generadas)               | cambia composición y relieve                                            | se remide pareado (misma `worldSeed`); la dirección esperada se escribe antes: `mediaGroups` sube (cotas más cerca de meta), `flatWinnerGroupPct` se mantiene, `photoRepeat*` baja o se mantiene por menos llanas seguidas (V17); las carreras conservan su nombre y ganan `brief`                                                                                                                |
| Saturación «8 más exigentes»                                        | cambian cuáles son                                                      | se remide; objetivo 0 de 8                                                                                                                                                                                                                                                                                                                                                                        |
| `timeTrials.*` (3 de 5 generadas)                                   | `cri_llana` es `flatSegments` con 0-1 repecho                           | dirección esperada: sin cambio; `cri_escalada` no entra en el banco hasta tener carrera con nombre                                                                                                                                                                                                                                                                                                |
| `stageHistory.test.ts` `cambian === 49`                             | baja                                                                    | se re-sella con la cifra nueva y la causa («el kind ya sale del recorrido»); objetivo ≤ 10, todas reales                                                                                                                                                                                                                                                                                          |
| `coherence.test.ts` Race Jaén, `journal.test.ts` Tramuntana         | otro relieve                                                            | listón cero se mantiene; lo que aflore es del motor                                                                                                                                                                                                                                                                                                                                               |
| `world.test.ts`                                                     | lee `kind` por etapa                                                    | remide `RACE_DAY_TSS` implícito; sin banda nueva                                                                                                                                                                                                                                                                                                                                                  |

### 11.5 Cómo se comprueba que el nuevo es MEJOR y no solo distinto

Protocolo, en este orden y anotado en `balance.md` antes de correr nada:

1. **Línea base**: con el generador viejo se corre `routeCensus` y se guarda la tabla de §11.2 y §11.3 en `balance.md` (paso 0 de §12). Se listan las bandas de §11.2 que están en rojo hoy (previsión: un día última subida, mix de finales de un día, muros por clásica, adoquín, `muro`, .2 km, subida fuera de 30 km).
2. **Pre-registro**: para cada banda de simulación de §11.4 se escribe la dirección esperada (sube / baja / no se mueve) y por qué.
3. **Pareado**: mismo `worldSeed`, mismo campo (`buildField`), misma semilla de etapa con `engineVersion` fijo en la semilla (como `realQueens.ts` l. 179-182), viejo contra nuevo, 12 semillas. La diferencia por semilla es la medida.
4. **Cuatro condiciones, todas necesarias**: (a) toda banda de realismo roja en la línea base pasa a verde y ninguna verde pasa a roja; (b) todas las de variedad en verde; (c) las canónicas (`llana-180`, `reina-150`, `cri-40`, huellas selladas) no se mueven ni un dígito; (d) las de simulación se mueven en la dirección pre-registrada o, si no, se explica con medida por qué la previsión era mala, y no se ajusta la banda para que cuadre.
5. **Dos lecturas de las listas cerradas**: por nombre (¿qué le pasó a `race-colombia` e5?) y por forma (¿qué les pasa a las reinas `alto` de 3.500-4.500 m?), como pide el mapa 04 §5.3.

Si (a)-(d) se cumplen, el generador es mejor. Si solo se cumple (b), es distinto. Si falla (c), ha tocado el motor y no el generador, y no se mezcla en la misma tanda.

---

## 12. Plan de implementación

Cada paso: tests primero, `pnpm typecheck && pnpm test` en verde antes de cerrar. `ENGINE_VERSION` sube UNA vez, en el paso 7, que es el único que cambia perfiles corridos; los pasos 1-6 añaden módulos sin un solo llamador en producción («cero cambios de conducta», como `balance.md` v60 §2). Presupuesto de tests ≥ 4× el coste en CI (`invariants.test.ts` l. 297-298).

**Paso 0. Línea base y sello.** Escribir `sim/routeCensus.ts` (§11.1) contra el calendario de HOY y `routes/routeCensus.test.ts` con las métricas impresas (sin banda). Anotar la tabla en `balance.md` «vN §0 · línea base del generador». Comprobar que `pnpm test:rapido` la corre en < 5 s (es geometría de 1.418 perfiles). Sin `ENGINE_VERSION`.

**Paso 1. Geografía.** `routes/geo.ts` con `GeoKey`, `GEO_SIGNATURES` (§5.2), `COUNTRY_GEO` (133 entradas), `RACE_GEO` (FR, BE, IT, ES obligatorias: ~167 carreras) y `geoFor`. Tests: toda entrada de `COUNTRIES` resuelve; toda carrera de `SEASON_CALENDAR` resuelve; las 20 `cobbles` caen en firma con adoquín; ninguna .NC de `andes` sin `puerto`. Sin llamadores.

**Paso 2. Brief y vetos.** `routes/brief.ts` con los tipos de §3.2 y `vetoesOf` (§9). Tests con briefs literales: las cinco plantillas del mapa 07 §5 pasan sin veto (Lombardía, Ronde, Pirineos, una semana, Roubaix); el caso v40 (un día con `alto` de 14 km) dispara V1; un `sector` en `pirineos` dispara V4; una reina con 0 % de subida fuera de 30 km dispara V8 (`reina-150` expresada como brief no pasa: es la prueba de que el veto encarna la lección de E3).

**Paso 3. Render.** `routes/relief.ts` (mueve `rolling`, `climb`, `descent`, `split`, `normalize`, `garantizaPuerto` desde `profileGen.ts` sin cambiar una línea; `profileGen.ts` los importa de ahí) y `routes/render.ts` con `render`, `guard`, `finalMatches`. Tests: km exactos al décimo para 1.000 briefs sintéticos; muro → `puerto` ≤ 3 km con `g ≥ 8`; circuito de 12 vueltas → 12 pancartas `cima`; `stageKindOf` y `finalKindOf` cuadran con el brief en el 100 % de 1.000 briefs válidos; suma de tramos = `km` del segmento en todo puerto.

**Paso 4. Arquetipos.** `routes/archetypes.ts` con los 18 esqueletos de §4.2 y `pickArchetype`. Test calcado de `stageKind.test.ts` (300 semillas × 5 km por arquetipo, `KM_ROAD` por clase): cada arquetipo devuelve su `kindEsperado` y su cubeta de `finalKind` en el 100 %, reintentos p90 ≤ 2, fallbacks 0. Test de rangos: última subida de `montana_un_dia` en [1,3; 8] km y cima a [3; 25]; `adoquin_denso` 12-30 sectores; `muros_encadenados` 10-20 muros con 70 % en el último 45 %. `finishType` con `groupSize` 50: `muro_final` da `muro` cuando el muro ≤ 1 km y `puncheur` si no.

**Paso 5. Composición.** `routes/compose.ts` con `TourCharacter`, `TourTemplate`, `composeTour(n, character, raceClass, format, identidad, rng)` y `GEN.kmByClass`. Tests: los seis casos de `calendar.test.ts` l. 184-246 reescritos contra `composeTour` (crono en 5, crono siempre en llana de 4+, «cinco llanas no son cinco sprints», nadie sin crono ni final en alto, primera llana o prólogo, última decisiva o paseo) más V11-V13, V17 sobre 120 semillas × n ∈ {3..11} × 5 caracteres; `.2` nunca > 180 km.

**Paso 6. Identidad y temporada.** `routes/identity.ts` con `raceIdentity`, `editionOf`, y `calendarFor(season)`. Tests de §6.3. `SEASON_CALENDAR = calendarFor(1)` se define pero aún sin cambiar `buildRace` (sigue el viejo).

**Paso 7. Cableado y subida de versión.** `buildRace`, `nationalChampionships`, `stagesFromEdition` pasan a `stageFor(RouteRequest)`; `oneDaySpec`, `stageMix`, `mixRoles`, `mixKm` y las ocho `xxxSegments` se retiran de los llamadores (se dejan exportadas un paso más para la comparación pareada, marcadas `@deprecated`). `StageSpec.source` y `brief`. `freezeRaceRoute` escribe `routeSource` desde `source`. `ENGINE_VERSION` 69 → 70 (o el que toque en producción). Re-sellar con causa escrita: `index.test.ts` (versión), `stageKind.test.ts` (los generadores viejos se sustituyen por `render` de cada arquetipo; se añade el sucesor de `mountainClassicSegments`), `calendar.test.ts` l. 162-174 (km de ediciones, debe seguir exacto) y l. 269-277 (la `Uphill finish` acaba en `puerto`), `stageHistory.test.ts` l. 199 (cifra nueva y causa), `raceRoutes.test.ts` (si alguna vuelta cambia de `n`: no debe). `recorridoDelMundo.test.ts` no se toca y debe seguir verde. Nota en `balance.md` con la tabla de §11.2 antes/después.

**Paso 8. El banco.** (a) Bandas de §11.2 y §11.3 en `ROUTE_CENSUS_TARGETS` y `routeCensus.test.ts`, solo las que la línea base más el paso 7 permitan poner en verde; el resto impresas. (b) `calendarQueens`: muestra estratificada, remedición con 12 semillas fuera de CI, tabla en `balance.md`, banda global conservada o recentrada por decisión del dueño (§14.3), `porFinalKind` y `porDplus` impresas. (c) `realQueens`: las tres entradas de edición pasan a brief literal; remedición pareada. (d) `smallTours` y saturación: remedición pareada con dirección pre-registrada. (e) `targets.ts`: `mountain.*` renombrada en el informe, comentario l. 79-84 actualizado (aún cita 2.023 m). (f) `reina-175-4800` en `scenarios.ts`, impresa sin banda.

**Paso 9. API e interfaz.** `apps/api/src/routes/calendar.ts` y `stageHistory.ts` exponen `source`, `brief.arquetipo`, `brief.resumen`; la ficha lee `race_routes` antes que el código para etapas no corridas (mapa 03 §9.4). La web muestra las tres frases de §10.2. `scripts/inventario-recorridos.mjs` lee `source`. Test de API: una etapa real devuelve `source: 'real'` y ninguna generada devuelve brief vacío.

**Paso 10. Retirada.** Borrar `profileGen.ts` (sus piezas viven en `relief.ts`), `oneDaySpec`, `stageMix`, `MixTerrain`, `ROUTE.queen*`, `ROUTE.mixWeights`, `ROUTE.km*`. Sin cambio de conducta (ningún llamador): `ENGINE_VERSION` no sube. `docs/generador.md` se cierra con la tabla final del censo y `docs/motor.md` §V.3 y §10 se actualizan (mapa 05 §2).

Orden de dependencias: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Los pasos 1-6 pueden ir en paralelo dos a dos (1 con 2, 3 con 5) porque no comparten ficheros. Antes del paso 7 en un mundo vivo: `backfillRaceRoutes` (`raceRoutes.ts` l. 91-109, «se corre con el generador ACTUAL a propósito»); como el mundo se reinicia antes del lanzamiento, basta con anotarlo en `docs/ops.md`.

---

## 13. Riesgos y lo que se sacrifica

1. **Viento y altitud no llegan al motor.** El brief lleva `viento` y `altitudBaseM` y el motor no los lee: el viento es un número por etapa desde la semilla (`simulate.ts` l. 1148-1200, mapa 03 §5.1) y no hay altitud en `Segment`. Una clásica de `flandes` con `viento: 0,9` tiene hoy la misma probabilidad de abanico que una de `prealpes-it`. Se deja escrito como la entrada de un cambio de motor futuro (`windMin` por firma), fuera de E1. Sacrificio consciente: la geografía cambia el relieve y el firme, no el aire.
2. **`rompepiernas` muere en el muestreo.** `sample.ts` l. 100-101 lo convierte en `llano` con `g = 1,5` fijo. Por eso el motivo `ondulado` se dibuja como `llano` con tramos: la física ve la ondulación, la táctica (`kmSubida` cuenta solo `subida`, `simulate.ts` l. 1696) no. Un muro va como `puerto` y sí cuenta.
3. **Los rangos de realismo son del mapa 07, escrito de memoria.** El propio mapa lo advierte («orientativos, rangos, no ediciones»). Las bandas de §11.2 se ponen anchas y se declaran de dónde salen; la doctrina de `fuentes-recorridos.md` (nada se inventa) se respeta porque aquí no se carga dato real: se parametriza un generador. Si el dueño quiere referencias con fuente, es un trabajo de E12 (§14.1).
4. **`RACE_GEO` es contenido.** ~167 carreras de FR, BE, IT, ES necesitan firma a mano; las ciudades de `raceRoutes.ts` (sin fuente para 250 carreras, mapa 02 §8) ayudan pero no bastan. Riesgo: firmas mal puestas. Mitigación: el test de §5.4 y una revisión del dueño de la lista, que cabe en una tarde.
5. **Coste de simulación.** Perfiles con más segmentos (un `adoquin_denso` de 30 sectores o un circuito de 16 vueltas) solo encarecen `sampleProfile`, O(n·segmentos) una vez por etapa (mapa 03 §7). Un `muros_encadenados` de 20 muros pone más bloques de `subida` y más `useCol`: coste por bloque igual. La batería sube por las remediciones del paso 8, no por el generador.
6. **Las listas cerradas cambian de contenido aunque no de nombre.** `smallTours` conserva sus 10 carreras y todas cambian de relieve. Se acepta y se documenta por brief; la alternativa (congelar sus perfiles viejos como literales) haría del banco un museo del generador que se retira.
7. **La cola baja de reinas.** Hoy la sostiene el 60/40 (mapa 06 §6.3); con `queenDplusByFormat` la sostienen las clases .2 y una semana. Si el calendario tiene pocas reinas de .2 (hoy 52 de `stageMix` en 72 vueltas), la banda `<1500` puede quedar con 2-3 etapas y la aserción `facil > dura + 10` con muestra insuficiente. Decisión §14.3.
8. **Cronoescalada rompe un sello.** `stageKind.test.ts` l. 32-43 afirma que el perfil de una crono sin `timeTrial` es una llana. Con `cri_escalada` deja de ser cierto. Se re-sella: «una crono llana sin `timeTrial` es llana; una cronoescalada sin `timeTrial` es media».
9. **Las tres grandes vueltas no cambian**: son de edición con rasgos (mapa 06 §1.2). El generador nuevo no mejora el Tour; mejora las 1.241 etapas no reales. Es lo que E1 pide y lo que E12 completa.
10. **Tiempo.** Diez pasos, seis módulos nuevos, ~60 tests. Es «grande» como dice `encargos.md`; lo que lo hace tratable es que hasta el paso 7 nada cambia en producción.

---

## 14. Decisiones que son del dueño

1. **Referencia de realismo.** ¿Vale el mapa 07 (memoria del calendario 2015-2026, rangos anchos) como referencia para las bandas de §11.2, o se quiere una pasada de dato con fuente antes de fijarlas? Lo segundo retrasa E1 y choca con el veto a PCS (`fuentes-recorridos.md`).
2. **`montana_final_largo_raro`.** ¿2 % del calendario de un día (Ventoux, Mercan'Tour) o 0 %? Con 0 % V1 es absoluto y el arquetipo se borra.
3. **La banda `calendarQueens` 6-30 y la cola baja.** Tras la remedición del paso 8: ¿se recentra, se conserva como vigilancia, o se parte por `finalKind`? Y si la banda `<1500` se despuebla, ¿se acepta comparar `<2000` contra `>3000`? El «está bien así» de la v44 se midió sobre el generador viejo.
4. **`reina-150`.** ¿Sigue como control de forma con nombre `forma.*`, o se sustituye por `reina-175-4800` cuando ésta tenga sigma? Retirarla mueve las huellas selladas de `attribution.test.ts`; mantenerla cuesta que alguien la vuelva a leer como «montaña».
5. **Etiquetas nuevas en la ficha.** `sprint_con_cota` clasifica `media`; ¿se añade un `label` «Sprint con cota» a `TERRAIN_KIND`, o el jugador ve «Hills» y el `resumen` del brief? Toca `stageHistory.ts`.
6. **Ediciones que varían.** ¿Se activa `editionOf` (la carrera cambia ±4 % de km y de variante de final cada temporada) o `season` queda fijo en 1 hasta E12? Con identidad activa hay que decidir también si la interfaz anuncia «edición N».
7. **Nacionales con geografía.** ¿El campeonato de Bélgica pasa a `muros_encadenados` con adoquín y el de Colombia a `montana_un_dia`, o los 532 siguen siendo `classic(220)` uniformes? `motor.md` §V.3 lo pedía; cambia 532 etapas y el banco de saturación (5 de las 8 más duras son hoy `nc-*-road`).
8. **Kilómetros por clase.** La tabla de §7.3 acorta las .2 a 110-160 km y alarga las WT de un día a 200-260. Cambia la carga de `world.ts` (`RACE_DAY_TSS` por `kind`, no por km, así que poco) y la duración de las etapas para el jugador.
9. **`RACE_GEO`.** ¿Quién pone la firma de las ~167 carreras de FR, BE, IT, ES: el implementador con las ciudades de `raceRoutes.ts` y revisión del dueño, o el dueño de entrada?
10. **Interfaz de lo generado.** ¿«Recorrido generado» a secas, o el `resumen` completo («Clásica de muros · 14 cotas · última a 9 km · adoquín 12 km»)? Lo segundo enseña la arquitectura y es lo que hace reconocible una carrera un año después.
