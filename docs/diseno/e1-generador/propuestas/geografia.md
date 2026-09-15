# Propuesta E1 · «El mundo tiene sitios»: un generador de recorridos que traza carreras por una geografía sintética

Propuesta independiente para `docs/generador.md`. Ángulo: primero un MODELO GEOGRÁFICO por país y región (qué relieve hay, cómo son sus puertos, si hay adoquín, sterrato, viento, altitud, costa, meseta, y sobre todo qué NO existe allí), y después el generador como un TRAZADO de la carrera a través de esa geografía: la salida, la meta, los kilómetros y el terreno que se cruza por el camino salen del sitio. Lo que sigue está escrito contra el código de hoy (`ENGINE_VERSION` 69, `constants.ts` l. 718) y contra los siete mapas de `scratchpad/e1/mapas/`; donde se afirma algo de una función es porque se ha leído, y se cita ruta y línea.

Regla de estilo heredada del repositorio: toda constante nueva lleva comentario de intención en `packages/engine/src/constants.ts`, todo cambio de conducta sube `ENGINE_VERSION`, y los tests van primero.

---

## 1. Diagnóstico: qué falla hoy, con citas

### 1.1 El generador no sabe dónde está

La carrera tiene país. `CalendarRace.country` existe (`routes/calendar.ts` l. 71-75), `buildRace` lo calcula en l. 889 (`row.country ?? RACE_COUNTRY[row.id]`) y lo copia al resultado en l. 898, y `calendar.test.ts` l. 197-201 exige que las 842 carreras lo lleven. Pero las tres ramas que construyen etapas (l. 899-929) llaman a `stagesFromEdition(row.id, edition)`, `oneDaySpec(terrain, km, row.id)` y `stageMix(row.stages, row.terrain ?? 'flat', row.id)`: **ninguna recibe el país**. Y las ocho funciones de `profileGen.ts` firman `xxxSegments(km, seed)` (l. 236, 243, 269, 337, 443, 473, 493, 510). El único consumidor geográfico del país dentro del motor es el clima: `stagePlace` (`routes/schedule.ts` l. 26-31) lo convierte en `{ pais, dia }` y `world/climate.ts::climateOf` (l. 165) lo lleva a una de nueve zonas (`PAIS_ZONA`, l. 66-136).

Consecuencia literal: `race-sharjah` (AE, llano de desierto) y `race-malopolska` (PL, 3 etapas, `hilly`) se componen con `mixRoles` sobre los mismos pesos, y una `.2` de Colombia y una `.2` de los Países Bajos con `terrain: 'hilly'` dibujan sus cotas con `hillySegments`, o sea `U(3, 7)` km al `U(4,5; 6,5)` % (`profileGen.ts` l. 247-248), que no es ni una cota andina (15-30 km al 4-7 %, mapa 07 §3.20) ni un berg limburgués (0,3-2,2 km al 5-13 %, §3.1).

### 1.2 Los moldes son ocho y las decisiones de forma son dos

Mapa 01 §4 lo mide: la arquitectura la fijan **el nombre de la función y el kilometraje**, y la semilla mueve detalle. Concretamente:

- Número de dificultades por umbral de km y no por semilla: `hillySegments` l. 245 (`km > 170 ? 3 : 2`), `hillyUphillSegments` l. 271, `mountainSegments` l. 339 y `mountainClassicSegments` l. 445 (`km > 165 ? 3 : 2`), `classicSegments` l. 475 (`km > 200 ? 5 : 4`), `cobblesSegments` l. 495 (`[3, 5, 4]` estrellas, siempre tres sectores).
- Orden fijo: relleno, dificultad, bajada, relleno. Tras la última cota de una `hilly` van siempre 26-68 km de relleno (medido, mapa 01 §2.2), así que `finalKindOf` da `valle_largo` en las 1.500. El último muro de una `classic` cae a 16-184 km de meta (§2.4). El último sector de `cobbles` a unos 40 km (§2.7).
- Las dos únicas decisiones de forma sorteadas viven en `mountainSegments`: el brazo de desnivel (l. 345) y `finalKind` (l. 355).
- Los rangos de longitud y pendiente están escritos en el cuerpo de las funciones y no en `ROUTE`: de las 24 claves de `ROUTE` (`constants.ts` l. 1151-1246) solo cuatro entran en `profileGen.ts` (mapa 01 §3).

Y para componer una vuelta, `type MixTerrain = 'flat' | 'hilly' | 'mountain'` (`calendar.ts` l. 409-410) con `mixTerrain` reduciendo `classic` a `hilly` y `cobbles` e `itt` a `flat` (l. 416-420). Lo que el dueño llama «tres o cuatro modelos» son exactamente tres moldes de composición y ocho de dibujo.

### 1.3 Lo que no existe en la carretera y el generador produce, y al revés

Del mapa 07 confrontado con `profileGen.ts`:

| Lo real                                                                                                                       | Lo generado                                                                                                                       | Dónde                                |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Clásica flamenca: 12-34 cotas de 0,3-2,5 km, muchas adoquinadas, sectores llanos entre ellas (§1.3)                           | 4-5 muros de 1-2,5 km al 8-12 %, sin adoquín, sobre relleno                                                                       | `classicSegments` l. 475-489         |
| Roubaix: 29-31 sectores, 54-57 km de adoquín, último sector a 1 km (§1.4)                                                     | 3 sectores de 2-4 km, último a ~40 km                                                                                             | `cobblesSegments` l. 495-506         |
| Un día de montaña: última subida 0,4-4,2 km, corona a 0-17 km; el puerto largo a 30-100 km (§1.6, §4.3)                       | último puerto 4-8 km al 7,5-10 % y run-in 13-22 km; sin la cota de remate a 3-6 km                                                | `mountainClassicSegments` l. 452-454 |
| Circuito con vueltas (Québec, Montréal, Mundial, casi todos los nacionales, §1.1)                                             | no existe ninguna arquitectura de circuito                                                                                        | ninguna función                      |
| Muro en meta (Huy, San Luca, Nokere)                                                                                          | 0 de 1.075 etapas tipan `muro` (balance v60 §12, mapa 05 §5)                                                                      | ninguna función                      |
| Gran vuelta: reina en la etapa 15-20, bloques de 2-3 de montaña, descansos tras la 9 y la 15 (§2.1)                           | los papeles se sortean etapa a etapa con `pickRole` (l. 433-442); solo las tres reales se salvan porque vienen de `RACE_EDITIONS` | `mixRoles` l. 483-486                |
| .2 por etapas: 100-160 km (§2.3, §4.1)                                                                                        | `kmFlat [165, 30]`, `kmSummit [145, 35]` sin distinguir clase (`constants.ts` l. 1240-1243)                                       | `mixKm` l. 522-540                   |
| El altiplano colombiano no tiene llano a nivel del mar; Flandes no tiene puerto de 3 km; Bélgica no tiene cima a 2.000 m (§3) | cualquier función en cualquier país                                                                                               | todas                                |

### 1.4 Por qué esto es infraestructura y no estética

`docs/agenda.md` §4.18 y `docs/epics.md` E3 pasos 3 y 4: la banda `mountain.breakawayWinPct` 25-45 % se certificó cinco versiones sobre `reina-150` (1.200 m, «media montaña con la etiqueta cambiada»), y sobre las reinas reales daba 3,3 %. Mapa 04 §3.3 cuenta el mismo patrón seis veces (v15, v17, v19, v23, v40, v44): cuatro de los seis eran defectos del perfil sobre el que se medía. Cada perfil falso del calendario es una calibración falsa que habrá que rehacer. Y el caso v40 (`docs/balance.md` l. 8102-8125): una carrera de UN DÍA de montaña con final en alto de 9-15 km, «algo que no existe en el calendario real», dejó al 82 % del pelotón con el tanque a cero. Ese defecto es el mismo que este diseño quiere hacer imposible por construcción: un generador que sepa que en el calendario de un día no hay finales en puerto largo, y que en Bélgica no hay puertos.

### 1.5 Lo que ya está bien y se conserva

`climb` (l. 72-82), `descent` (l. 85-93) y `rolling` (l. 100-122) dibujan bien un puerto, una bajada y un llano ondulado; `normalize` (l. 141-177) cuadra los km sin deformar; `stageKindOf` (`stageKind.ts` l. 71-98) y `finalKindOf` (`finalKind.ts` l. 78-85) leen el recorrido y son la vara del banco; `race_routes` congela el recorrido por mundo y temporada (`db/raceRoutes.ts` l. 17-27, `schema.ts` l. 507-527); `featureProfile.ts` reconstruye lo real con dato. Nada de eso se tira: se reordena debajo de una capa que hoy no existe.

---

## 2. Principios

1. **La geografía manda sobre el terreno.** El `terrain` de la fila deja de ser la identidad de la carrera y pasa a ser una PETICIÓN («quiero una carrera de montaña aquí»); el sitio dice si eso existe y cómo es. Si el sitio no lo puede dar, se degrada de forma escrita y medible, nunca en silencio.
2. **La arquitectura es una decisión sorteada, no una función.** Una gramática de motivos (cota, muro, puerto, puerto largo, bajada, valle, sector, sterrato, circuito, llano, ondulado) y un catálogo de arquitecturas con pesos por sitio, clase y papel. La semilla elige la arquitectura; después elige el detalle.
3. **Cada decisión en su propio subflujo del RNG.** La v64 aprendió que «una tirada más de `routeRng` por reina» cambia «todos los perfiles de montaña del calendario» (`profileGen.ts` l. 316-317). Con un subflujo por decisión (`geo`, `arq`, `esqueleto`, `dibujo`, `variacion`) añadir una tirada en uno no mueve los demás.
4. **Lo que no existe no sale.** Vetos de plausibilidad como función pura sobre el perfil ya dibujado, con el caso v40 como primer veto, y un fallback determinista y contado.
5. **Lo real manda y se ve.** `STAGE_FEATURES` y `RACE_EDITIONS` siguen por delante; cada etapa declara su origen y ese origen llega a `race_routes.route_source`, a la API y a la web.
6. **La misma carrera se parece a sí misma.** Una firma por carrera (sitio, arquitectura, cotas emblemáticas) que no depende de la temporada, y una variación por temporada acotada y deliberada.
7. **Determinista, puro, reproducible.** FNV-1a + mulberry32 como hoy (`profileGen.ts` l. 15-44). Ni `Date.now` ni `Math.random`. El mismo `(raceId, season)` da siempre el mismo calendario.
8. **El motor no cambia.** Se produce `StageProfile` con `Segment { km, tipo, tramos?, estrellas? }` y `Ramp { km, g }` (`stage/types.ts` l. 18-48). No se toca `sample.ts`, `physics.ts` ni `simulate.ts`. Lo que el motor no lee (altitud, viento por tramo) se guarda como metadato del calendario y no como perfil.
9. **Medido antes que creído.** Ninguna banda nueva nace en rojo; todo lo geométrico va al test rápido; lo simulado se compara pareado (viejo contra nuevo) antes de borrar el generador viejo.

---

## 3. El modelo

### 3.1 Los paisajes: la unidad geográfica

Un **paisaje** es un tipo de terreno con parámetros numéricos: es la abstracción mínima que separa un berg de un puerto alpino. Cierra en un enum para que el catálogo sea revisable y testeable. Fichero nuevo `packages/engine/src/routes/geo.ts`.

```ts
/** Familia de relieve: decide qué papeles de etapa puede dar un sitio. */
export type Relieve = 'llano' | 'ondulado' | 'media' | 'montana' | 'alta'

export type Paisaje =
  // Norte marítimo
  | 'polder'
  | 'bergs'
  | 'ardenas'
  | 'llanura_norte'
  | 'costa_atlantica'
  // Francia interior y montañas
  | 'macizo_medio'
  | 'jura_vosgos'
  | 'alpes'
  | 'pirineos'
  | 'provenza'
  // Italia
  | 'prealpes'
  | 'dolomitas'
  | 'llanura_padana'
  | 'colinas_toscanas'
  | 'apeninos'
  // Iberia
  | 'cantabrico'
  | 'meseta'
  | 'sierra_mediterranea'
  | 'serrania_lusa'
  // Europa central y norte
  | 'mittelgebirge'
  | 'llano_nordico'
  | 'fiordos'
  | 'colinas_britanicas'
  | 'sierra_balcanica'
  // América
  | 'altiplano_andino'
  | 'cordillera_andina'
  | 'desierto_andino'
  | 'rocosas'
  | 'llanura_americana'
  // Resto del mundo
  | 'colinas_australes'
  | 'llanura_tropical'
  | 'desierto_golfo'
  | 'altiplano_asiatico'
  // Sin dato: lo honesto es decirlo
  | 'generico_llano'
  | 'generico_ondulado'
  | 'generico_montana'

/** Rango cerrado [min, max] del que se sortea con `between`. */
export type Rango = readonly [number, number]

export interface PaisajeSpec {
  relieve: Relieve
  /** Amplitud del relleno entre dificultades, en %. Hoy es 1,8 o 3,2 literal (`rolling`, profileGen.ts l. 105). */
  ondulacion: Rango
  /** Cota de 1,5-5 km (cuenta como `puerto` para `kmSubida`). null si el sitio no tiene. */
  cota: { km: Rango; g: Rango } | null
  /** Muro de 0,3-2,5 km al 8 % o más. `adoquin` es la probabilidad de que sea adoquinado. */
  muro: { km: Rango; g: Rango; adoquin: number } | null
  /** Puerto de 5-15 km. */
  puerto: { km: Rango; g: Rango } | null
  /** Puerto largo de 15-30 km. */
  puertoLargo: { km: Rango; g: Rango } | null
  /** Sectores de adoquín llano: km de adoquín por cada 100 km de carrera, longitud y estrellas. */
  adoquin: { kmPor100: Rango; sectorKm: Rango; estrellas: Rango } | null
  /** Sectores de tierra (sterrato, ribinoù, chemins): mismas cuentas, se emiten como `paves`. */
  sterrato: { kmPor100: Rango; sectorKm: Rango; estrellas: Rango } | null
  /** Probabilidad de encadenar dos puertos sin valle (Pirineos, Dolomitas altos; 0 en polder). */
  encadenado: number
  /** Altitud de la base y de la cima más alta posible, en m. Solo veto y relato: el motor no lee altitud. */
  altitudM: { base: number; cimaMax: number }
  /** Exposición al viento 0..2. Sin consumidor en el motor hoy (mapa 03 §5.1); se guarda para E2. */
  viento: 0 | 1 | 2
  /** ¿Costa? Solo relato y elección de arquitectura (`llana_costa`). */
  costa: boolean
}

export const PAISAJES: Record<Paisaje, PaisajeSpec>
```

Los valores del catálogo van en §5 (tabla completa). La regla de lectura: **`null` significa «aquí no existe»**, y los vetos de §9 lo hacen cumplir.

### 3.2 El territorio: un país como lista ordenada de paisajes

```ts
export interface Territorio {
  /** Paisajes del país en un ORDEN que es una ruta plausible por él (una vuelta recorre una ventana contigua). */
  ruta: readonly { paisaje: Paisaje; peso: number }[]
  /** El paisaje donde caería la etapa reina, o null si el país no tiene montaña de reina. */
  cordillera: Paisaje | null
  /** true si el país no está en la tabla y se le ha dado un territorio genérico. */
  fallback?: boolean
}

export const TERRITORIOS: Record<string, Territorio> // ISO alpha-2 -> territorio

/** El territorio de un país; si no está en la tabla, uno genérico marcado como `fallback`. Puro. */
export function territorioDe(country: string | undefined): Territorio
```

Ejemplos concretos (los 56 países con carreras de equipos van completos en el paso 1 de §12; aquí, cuatro para fijar la forma):

```ts
FR: {
  ruta: [
    { paisaje: 'llanura_norte', peso: 3 }, { paisaje: 'costa_atlantica', peso: 3 },
    { paisaje: 'macizo_medio', peso: 2 }, { paisaje: 'pirineos', peso: 2 },
    { paisaje: 'provenza', peso: 2 }, { paisaje: 'alpes', peso: 3 }, { paisaje: 'jura_vosgos', peso: 2 },
  ],
  cordillera: 'alpes',
},
BE: {
  ruta: [{ paisaje: 'polder', peso: 3 }, { paisaje: 'bergs', peso: 4 }, { paisaje: 'ardenas', peso: 3 }],
  cordillera: null,
},
CO: {
  ruta: [{ paisaje: 'llanura_tropical', peso: 1 }, { paisaje: 'altiplano_andino', peso: 3 }, { paisaje: 'cordillera_andina', peso: 3 }],
  cordillera: 'cordillera_andina',
},
AE: { ruta: [{ paisaje: 'desierto_golfo', peso: 1 }], cordillera: null },
```

Una fila del calendario puede AFINAR el sitio cuando se sabe (el Jura de `race-jura`, el Ventoux de una `.1` provenzal): `RaceRow` gana `paisaje?: Paisaje` (`calendar.ts` l. 381-397, junto a `country?`). Sin él manda el territorio del país. Esta es la respuesta a la nota de `climate.ts` l. 15-19 («cuando el calendario sepa la REGIÓN de cada carrera, esto se afina sin tocar nada más»): la región es el paisaje, y el clima puede leerlo después sin que E1 lo toque.

### 3.3 La gramática de motivos

```ts
/** Un motivo es una pieza de carretera con sentido para un aficionado. Se dibuja a `Segment[]`. */
export type Motivo =
  | { t: 'llano'; km: number }
  | { t: 'ondulado'; km: number; amp: number }
  | { t: 'cota'; km: number; g: number }
  | { t: 'muro'; km: number; g: number; adoquin: boolean }
  | { t: 'puerto'; km: number; g: number; forma: 'regular' | 'irregular' | 'final_duro' }
  | { t: 'bajada'; km: number; g: number }
  | { t: 'sector'; km: number; estrellas: number }
  | { t: 'circuito'; vueltas: number; vuelta: Motivo[] }

/** El motivo dibujado: qué segmentos produce. `muro` y `cota` son `puerto` para el motor (kmSubida cuenta por tipo, mapa 03 §4.1). */
export function dibujar(m: Motivo, rand: () => number): Segment[]
```

Traducción a `Segment` (todo lo que el motor consume, `stage/types.ts` l. 37-42):

| Motivo     | `tipo`      | `tramos`                                                                                                                                                             | Nota                                                                                                |
| ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `llano`    | `llano`     | `rolling(rand, km, amp ≤ 1,2)`                                                                                                                                       | como hoy `flatSegments`                                                                             |
| `ondulado` | `llano`     | `rolling` con `amp` del paisaje; **nunca `rompepiernas`**, que muere en `sample.ts` l. 100-101 (g fijo 1,5 e ignora tramos)                                          | sustituye el `p = 0,35` de `rolling` l. 119                                                         |
| `cota`     | `puerto`    | `climb(rand, km, g)` (l. 72-82)                                                                                                                                      | la cota cuenta como subida para la táctica, que es lo que se quiere                                 |
| `muro`     | `puerto`    | `climb` con 1-2 rampas y `g ≥ 8` garantizado en la última; si `adoquin`, sigue siendo `puerto` (regla de `featureProfile.ts` l. 55-56: un muro adoquinado es puerto) | un muro ≤ 1 km al ≥ 8 % en meta tipa `muro` en `finish.ts` l. 181-188                               |
| `puerto`   | `puerto`    | `climb`; `forma: 'final_duro'` añade una rampa final al 10-12 % (Tre Cime, Fedaia); `'irregular'` añade un rellano al 1-2 % en el tercio central                     | lo que pide SPEC §6.17 sobre puertos irregulares                                                    |
| `bajada`   | `descenso`  | `descent` (l. 85-93)                                                                                                                                                 | pendiente `≤ −4` en el primer km si se quiere que seleccione (`constants.ts` l. 2784, mapa 03 §4.2) |
| `sector`   | `paves`     | sin tramos, `estrellas`                                                                                                                                              | como hoy `cobblesSegments` l. 503                                                                   |
| `circuito` | (expansión) | se dibuja `vuelta` una vez con `rand` y se REPITE `vueltas` veces el mismo `Segment[]`                                                                               | la repetición literal es la identidad del circuito: la misma cota se sube N veces                   |

### 3.4 La arquitectura y el esqueleto

```ts
export type Arquitectura =
  // Un día
  | 'llana_costa' // llano puro con viento; sin cota
  | 'semiclasica_cota_lejana' // llano + 1-2 cotas testimoniales a 20-40 km (Sanremo, Almería)
  | 'circuito_urbano' // 1-3 km × 30-60 vueltas, 60-100 km (critérium)
  | 'circuito_cotas' // 8-25 km × 4-14 vueltas con 1-2 cotas/muros por vuelta (Québec, nacionales)
  | 'punto_a_punto_muro' // lineal, meta en un muro de 0,3-2,5 km (Huy, Emilia, Nokere)
  | 'muros_encadenados' // 8-20 cotas/muros en los últimos 100-130 km, algunos adoquinados
  | 'sectores' // adoquín por densidad, último sector a 1-8 km
  | 'sterrato' // tierra por densidad + muro urbano final
  | 'montana_un_dia' // puerto largo a 30-100 km, últimos muros 1,3-4 km coronando a 3-17 km
  | 'final_alto_largo_un_dia' // RAREZA (Ventoux, Mercan'Tour): peso ≤ 0,02 y solo con `puertoLargo`
  // Etapas
  | 'llana_transicion' // llano/ondulado del paisaje, 0-1 cota lejana
  | 'media_lejana' // 2-5 cotas, la última a 10-40 km
  | 'media_cerca' // 2-5 cotas, la última a 1-8 km (puncheur)
  | 'media_alto' // cotas + final en cota de 3-8 km
  | 'reina_alto' // 2-4 puertos, meta en puerto de 8-22 km
  | 'reina_alto_corto' // 2-4 puertos, meta en puerto de 4-7 km al 8-12 %
  | 'reina_encadenada' // puertos sin valle, cima a 1,5-5 km (cima_cerca)
  | 'reina_valle' // último puerto a 6-45 km con bajada y valle
  // Contrarreloj
  | 'prologo'
  | 'cri_llana'
  | 'cri_rompepiernas'
  | 'cronoescalada'

/** Un hueco del esqueleto: qué motivo y dónde cae, medido desde META (lo que decide la carrera). */
export interface Hueco {
  motivo: Motivo['t'] | 'circuito'
  /** Km a meta de la CIMA o del final del motivo, sorteado dentro del rango. null = relleno entre huecos. */
  aMeta: Rango | null
  /** Rangos del motivo, ya restringidos por el paisaje (intersección de la arquitectura y del sitio). */
  km: Rango
  g?: Rango
}

export interface Esqueleto {
  arquitectura: Arquitectura
  huecos: Hueco[] // ordenados de salida a meta
  circuito?: { vueltas: Rango; kmVuelta: Rango }
}
```

La arquitectura fija la CUENTA y la POSICIÓN (cuántos motivos y a cuántos km de meta); el paisaje fija el TAMAÑO (longitud y pendiente de cada motivo, si hay adoquín); la semilla elige dentro de ambos. Ese reparto en tres capas es lo que hoy no existe: en `mountainSegments` la cuenta la fija el km (l. 339), la posición la fija `split` (l. 391) y el tamaño lo fija el literal (l. 358-363).

### 3.5 El contexto que entra al generador

```ts
export type Papel =
  'un_dia' | 'llana' | 'media' | 'media-alto' | 'reina' | 'cri' | 'nacional_ruta' | 'nacional_cri'
export type Clase = RaceClass // 'WT' | 'Pro' | '1' | '2' | 'NC' (routes/uci.ts l. 12)
export type Origen = 'real' | 'edicion' | 'generado' // las tres marcas del inventario (scripts/inventario-recorridos.mjs l. 50-57)

export interface ContextoEtapa {
  raceId: string
  season: number // la temporada del mundo (`${race.id}:s${season}`, db/calendarRun.ts l. 783)
  stageIndex: number // 1-based
  nStages: number
  country: string
  desde: Paisaje // paisaje donde empieza (el de la meta anterior en una vuelta)
  hasta: Paisaje // paisaje donde acaba
  clase: Clase
  formato: RaceFormat
  papel: Papel
  km: number
  /** Petición de la fila: sesga la arquitectura, no la impone. */
  terrenoPedido?: RouteTerrain
  /** Solo ediciones: ciudades reales (semilla de dibujo estable e identidad de relato). */
  from?: string
  to?: string
}

export interface StageSpec {
  // routes/calendar.ts l. 34-40, ampliado
  kind: StageKind
  label: string
  profile: StageProfile
  timeTrial?: boolean
  origen: Origen // NUEVO
  paisaje?: Paisaje // NUEVO: solo si origen !== 'real'
  arquitectura?: Arquitectura // NUEVO: solo si origen === 'generado' | 'edicion'
}
```

`StageSpec.origen` es lo que `db/raceRoutes.ts` l. 48-51 espera («`routeSource` nace en el 1b con el campo que lo dice»): `real` → `'real'`, los otros dos → `'generado'` en `race_routes.route_source` (`schema.ts` l. 522-524), y los tres valores completos en la API.

---

## 4. El algoritmo, paso a paso

Función de entrada, pura: `trazarEtapa(ctx: ContextoEtapa): StageSpec` en `routes/trazado.ts`. Los subflujos del RNG se nombran con `routeRng(cadena)` (`profileGen.ts` l. 30-32) y **cada decisión usa el suyo**; la tabla dice qué cadena y qué depende de la temporada:

| Paso | Decisión                                                                                                        | Subflujo (`routeRng(...)`)   | Depende de `season` |
| ---- | --------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------- |
| 1    | Paisaje de la carrera (si la fila no lo fija): sorteo ponderado sobre `territorio.ruta`                         | `${raceId}                   | geo`                | no    |
| 2    | Arquitectura: sorteo ponderado sobre `PESOS_ARQ[relieve][papel][clase]` restringido a las que el paisaje admite | `${raceId}                   | e${i}               | arq`  | no (es firma) |
| 3    | Esqueleto: cuántos huecos, `aMeta` de cada uno, tamaños base                                                    | `${raceId}                   | e${i}               | esq`  | no (es firma) |
| 4    | Variación de edición: ±km, desplazamiento de huecos, motivo opcional dentro/fuera                               | `${raceId}                   | s${season}          | e${i} | var`          | **sí**      |
| 5    | Dibujo: rampas, ondulación, longitudes exactas vía `split`, estrellas exactas                                   | `${raceId}                   | s${season}          | e${i} | dibujo        | ${intento}` | **sí** |
| 6    | Reintento tras veto: `intento` 0..4, después fallback                                                           | (el mismo con `intento` + 1) | sí                  |

Para una etapa de edición (`stagesFromEdition`), los pasos 2-3 usan `${raceId}|${from}|${to}|arq` y `...|esq` en vez de `e${i}`: así una etapa real conserva su firma aunque la edición cambie de orden, que es lo que hoy consigue la semilla `${from}|${to}|${km}` (`calendar.ts` l. 221).

### 4.1 Paso 1: el sitio

```
territorio = territorioDe(ctx.country)
paisaje = ctx.hasta ?? filaPaisaje ?? sorteoPonderado(territorio.ruta, rng(`${raceId}|geo`))
spec = PAISAJES[paisaje]
```

Si `territorio.fallback`, se anota en `StageSpec.paisaje = 'generico_*'` y el test de calendario cuenta cuántas carreras de equipos caen ahí (objetivo: 0; los 133 países de campeonatos pueden caer y se lista).

### 4.2 Paso 2: la arquitectura

```
familia = familiaDe(ctx.papel, ctx.terrenoPedido)          // llana | media | montana | muros | adoquin | cri
candidatas = ARQUITECTURAS[familia].filter(a => admite(spec, a))
if (candidatas vacía) { familia = degradar(familia, spec.relieve); candidatas = ...; anota degradado }
arquitectura = sorteoPonderado(candidatas con PESOS_ARQ[spec.relieve][ctx.papel][ctx.clase], rng(`${raceId}|e${i}|arq`))
```

`admite(spec, a)`: `sectores` exige `spec.adoquin`; `sterrato` exige `spec.sterrato`; `reina_*` exige `spec.puerto` y `spec.relieve ∈ {montana, alta}`; `final_alto_largo_un_dia` exige `spec.puertoLargo` y clase `1` o `Pro`; `muros_encadenados` y `punto_a_punto_muro` exigen `spec.muro`; `circuito_cotas` exige `spec.cota` o `spec.muro`; `llana_costa` exige `spec.costa`. `degradar`: `montana → media → ondulado → llana`, siempre hacia abajo; nunca hacia arriba (un país llano no gana puertos).

### 4.3 Paso 3: el esqueleto

Cada arquitectura tiene una plantilla (§4.6) que dice: huecos con `aMeta` como rango, cuenta como rango, y qué rango de tamaño pide. El esqueleto se instancia intersectando el rango de la plantilla con el del paisaje: `km: [max(minA, minP), min(maxA, maxP)]`; si la intersección es vacía, el hueco se elimina (ese motivo no cabe aquí) y si era obligatorio, `admite` ya lo habría vetado.

Colocación: se sortea `aMeta` de cada hueco de META hacia SALIDA en orden decreciente estricto (si dos huecos colisionan, el segundo se empuja 1 km más lejos); lo que queda entre huecos es relleno `ondulado` con la amplitud del paisaje, o `llano` en `desde` si es una etapa de transición entre dos paisajes (el primer 40 % del km usa `PAISAJES[desde].ondulacion`, el resto `PAISAJES[hasta]`).

### 4.4 Paso 4: la variación de edición (§6)

Sobre el esqueleto instanciado: `km_total *= 1 + U(−0,08; 0,08)`, redondeado; cada `aMeta` se desplaza `U(−3; 3)` km sin cambiar el orden; un hueco marcado `opcional` en la plantilla entra con p = 0,5. Los huecos marcados `firma` no se mueven más de 1 km ni cambian de tamaño. Con `season` fijo la variación es una función determinista de `(raceId, season)`.

### 4.5 Paso 5: el dibujo

De salida a meta, `dibujar(motivo, randDibujo)` produce `Segment[]`; `normalize(segs, km)` cuadra al décimo (l. 141-177, sin cambios); `auto(segments)` pone las pancartas, con un cambio: **solo se marca `cima` en un `puerto` de ≥ `CLIMB_MIN_KM` (1,5, `finalKind.ts` l. 33) o con `deriveClimbCategory` ≠ null** (`sample.ts` l. 131-143). Hoy `auto` marca una cima en cada `puerto` (`calendar.ts` l. 98), y con 16 muros de 0,5 km eso serían 16 pancartas cat4 que ninguna Ronde tiene. `lastClimbKm` sigue funcionando: si no hay pancartas cae al último `puerto` ≥ 1,5 km (`finalKind.ts` l. 50-56).

### 4.6 Las plantillas (posición y cuenta)

Números en km a meta salvo que se diga; los tamaños los recorta el paisaje. Fuentes: mapa 07 §1, §2 y §4.3.

| Arquitectura              | Huecos (de meta a salida)                                                                                                                                                      | Km total por defecto (clase WT / Pro-.1 / .2) |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `llana_costa`             | ninguno; `ondulado` con amp ≤ 1,0                                                                                                                                              | 200-240 / 170-210 / 140-180                   |
| `semiclasica_cota_lejana` | `cota` a [18, 40]; opcional segunda `cota` a [40, 70]                                                                                                                          | ídem                                          |
| `circuito_urbano`         | `circuito` 1-3 km × 30-60 vueltas, sin cota                                                                                                                                    | 60-100                                        |
| `circuito_cotas`          | tramo lineal 0-40 % + `circuito` [8, 25] km × [4, 14] vueltas con 1-2 `cota`/`muro`; meta a [0,5; 4] de la última cota                                                         | 180-270 (NC 200-240)                          |
| `punto_a_punto_muro`      | `muro` a 0 (firma); 2-5 `cota`/`muro` a [8, 60]; en clase WT/Pro el mismo muro también a [28, 34] y [58, 66] (Huy ×3)                                                          | 190-210 / 170-200 / 140-170                   |
| `muros_encadenados`       | 8-20 `muro`/`cota` entre [3, 130], densidad creciente hacia meta; 0-7 `sector` intercalados si `adoquin`; último muro a [3, 15] (firma: los dos últimos)                       | 200-275 / 180-210 / 150-180                   |
| `sectores`                | 12-30 `sector` entre [1, 160], ninguno antes del 35 % de la carrera; tres de [4, 5] estrellas a [15, 20], [45, 50] y [90, 100] (firma)                                         | 240-260 / 190-215 / 160-190                   |
| `sterrato`                | 8-15 `sector` (tierra) entre [1, 150], 40-70 km de tierra en total; `muro` urbano a [0,3; 1]                                                                                   | 200-215 / 170-200 / 150-180                   |
| `montana_un_dia`          | `muro`/`cota` [1,3; 4,2] km al [7, 11] % a [3, 17]; opcional segunda a [4, 8] (p 0,4, San Fermo); `puerto` [8, 13] km a [30, 100] (firma); 1-3 `puerto`/`cota` entre [17, 130] | 230-255 / 190-215 / 160-190                   |
| `final_alto_largo_un_dia` | `puertoLargo` a 0 (firma); 0-2 `puerto` antes; peso ≤ 0,02                                                                                                                     | 150-180                                       |
| `llana_transicion`        | `ondulado` del paisaje; opcional `cota` a [40, 90] (p 0,4)                                                                                                                     | por clase, §8                                 |
| `media_lejana`            | 2-5 `cota`/`puerto` (≤ 8 km), última a [10, 40]; `bajada` tras cada una                                                                                                        | ídem                                          |
| `media_cerca`             | 2-5 `cota`/`muro`, última a [1, 8]; opcional `muro` a [0,3; 1] (p 0,15, muro en meta)                                                                                          | ídem                                          |
| `media_alto`              | `cota` [3, 8] km a 0 (firma); 1-3 `cota` antes                                                                                                                                 | ídem                                          |
| `reina_alto`              | `puerto` [8, 22] km al [6,5; 9] % a 0 (firma); 2-3 `puerto` a [25, 120]; `encadenado` decide si el penúltimo va sin valle                                                      | ídem                                          |
| `reina_alto_corto`        | `puerto` [4, 7] km al [8, 12] % a 0; 2-3 `puerto` ≥ 8 km antes (garantía de reina por el intermedio)                                                                           | ídem                                          |
| `reina_encadenada`        | último `puerto` ≥ 9 km a [1,5; 5]; 1-2 `puerto` sin valle antes                                                                                                                | ídem                                          |
| `reina_valle`             | último `puerto` ≥ 9 km a [6, 45] (según `queenFinalMix`: `valle_corto` [6, 20], `valle_largo` [22, 45]); `bajada` de [4, 10] y `llano`                                         | ídem                                          |
| `prologo`                 | `llano`, 3-8 km                                                                                                                                                                | 3-8                                           |
| `cri_llana`               | `llano` amp ≤ 1,0                                                                                                                                                              | 8-44 según `ROUTE.itt*`                       |
| `cri_rompepiernas`        | `ondulado` amp del paisaje + 1-2 `cota` [1,5; 3]                                                                                                                               | 14-35                                         |
| `cronoescalada`           | `puerto` [8, 15] km a 0; 3-8 km llanos de aproximación                                                                                                                         | 12-25                                         |

Los `aMeta` de las reinas están alineados con `FINAL_KIND_CUTS` (`finalKind.ts` l. 30: 0,5 / 5 / 20) **con holgura**: `reina_encadenada` sortea en [1,5; 4,5] y `reina_valle` corto en [6,5; 19,5] y largo en [22, 45], para que `normalize` (que estira hasta un 2 %) no cruce la cubeta, que es el borde sin holgura que mapa 01 §2.5 mide en 4 de 6.000.

### 4.7 Paso 6: vetos y reintento

```
for intento in 0..4:
  profile = dibujar(esqueleto, rng(`...|dibujo|${intento}`))
  fallos = vetos(profile, ctx, spec)                      // §9
  if (fallos.length === 0) return spec con profile
arquitectura = ARQ_SEGURA[familia]                          // llana_transicion | media_lejana | reina_valle | sectores | muros_encadenados
profile = dibujar(esqueleto(arquitectura segura), rng(`...|dibujo|fallback`))
anota fallback en StageSpec.arquitectura y en el contador
```

El contador de fallbacks del calendario se sella en test a 0 (§12, paso 4). La razón de reintentar con `dibujo` y no con `esq`: el esqueleto es firma y no debe cambiar por un veto de detalle; si el propio esqueleto es inviable (los rangos del paisaje no caben en el km), `esqueletoDe` ya lo habrá reducido en el paso 3.

---

## 5. La geografía: cómo entra el país

### 5.1 El catálogo de paisajes (valores propuestos)

Todos los rangos son `[min, max]`; longitudes en km, pendientes en %. Fuente de cada fila: mapa 07 §3 (número de fila entre paréntesis). `cimaMax` es la altitud máxima de una cima en ese paisaje; `base` la altitud típica de salida.

| Paisaje (fila mapa 07)             | relieve  | ondulación | cota km × g          | muro km × g (adoq.)         | puerto km × g       | puertoLargo km × g    | adoquín kmPor100 / sector / ★  | sterrato                      | encad. | base / cimaMax | viento | costa |
| ---------------------------------- | -------- | ---------- | -------------------- | --------------------------- | ------------------- | --------------------- | ------------------------------ | ----------------------------- | ------ | -------------- | ------ | ----- |
| `polder` (3.1)                     | llano    | [0,4; 0,9] | null                 | [0,3; 1,0] × [5, 8] (0,5)   | null                | null                  | [4, 12] / [0,5; 2,5] / [2, 4]  | null                          | 0      | 5 / 60         | 2      | sí    |
| `bergs` (3.1)                      | ondulado | [0,8; 1,6] | [1,5; 2,2] × [4, 6]  | [0,3; 1,2] × [7, 13] (0,6)  | null                | null                  | [3, 10] / [0,5; 2,5] / [2, 5]  | null                          | 0      | 20 / 150       | 1      | no    |
| `ardenas` (3.2)                    | media    | [1,2; 2,4] | [1,5; 4,5] × [6, 11] | [0,5; 1,5] × [8, 13] (0,05) | null                | null                  | null                           | null                          | 0      | 150 / 700      | 1      | no    |
| `llanura_norte` (3.1, 1.4)         | llano    | [0,4; 1,0] | [1,5; 2,0] × [4, 6]  | [0,3; 1,0] × [5, 9] (0,4)   | null                | null                  | [10, 22] / [0,3; 3,7] / [1, 5] | null                          | 0      | 30 / 200       | 2      | no    |
| `costa_atlantica` (3.13)           | ondulado | [1,0; 2,0] | [1,5; 2,5] × [5, 8]  | [0,5; 2,0] × [6, 9] (0,1)   | null                | null                  | null                           | [8, 15] / [0,5; 2] / [2, 4]   | 0      | 30 / 400       | 2      | sí    |
| `macizo_medio` (3.14)              | montana  | [1,6; 2,8] | [2, 5] × [5, 8]      | [1, 2] × [8, 12] (0)        | [5, 13] × [6, 8,5]  | null                  | null                           | null                          | 0,2    | 500 / 1.900    | 1      | no    |
| `jura_vosgos` (3.14)               | montana  | [1,6; 2,6] | [2, 5] × [5, 8]      | [1, 2,5] × [8, 12] (0)      | [5, 17] × [6, 9]    | null                  | null                           | null                          | 0,2    | 400 / 1.700    | 1      | no    |
| `alpes` (3.5)                      | alta     | [1,4; 2,4] | [2, 5] × [4, 7]      | null                        | [8, 15] × [6,5; 9]  | [15, 28] × [5, 8]     | null                           | null                          | 0,25   | 600 / 2.800    | 0      | no    |
| `pirineos` (3.6)                   | alta     | [1,4; 2,4] | [2, 5] × [5, 7]      | null                        | [8, 15] × [7, 8,5]  | [15, 17] × [7, 8]     | null                           | null                          | 0,6    | 400 / 2.400    | 0      | no    |
| `provenza` (3.15)                  | media    | [1,0; 2,2] | [1,5; 4] × [5, 8]    | [1, 2] × [7, 10] (0)        | [8, 15] × [6, 7,5]  | [15, 22] × [7, 7,5]   | null                           | null                          | 0,1    | 100 / 1.900    | 2      | sí    |
| `prealpes` (3.3)                   | montana  | [1,6; 2,8] | [2, 5] × [5, 8]      | [1, 2] × [10, 16] (0)       | [4, 13] × [6, 8]    | null                  | null                           | null                          | 0,3    | 200 / 1.400    | 0      | no    |
| `dolomitas` (3.7)                  | alta     | [1,4; 2,4] | [2, 5] × [5, 8]      | null                        | [7, 14] × [7,5; 12] | [14, 25] × [5,5; 7,5] | null                           | null                          | 0,6    | 700 / 2.300    | 0      | no    |
| `llanura_padana` (3.3)             | llano    | [0,3; 0,8] | [1,5; 2] × [4, 5]    | null                        | null                | null                  | null                           | null                          | 0      | 50 / 200       | 1      | no    |
| `colinas_toscanas` (3.4)           | ondulado | [1,4; 2,6] | [1,5; 4] × [6, 10]   | [0,5; 2,1] × [8, 16] (0)    | [5, 8] × [5, 6]     | null                  | null                           | [25, 35] / [1, 11,5] / [2, 5] | 0      | 200 / 800      | 1      | no    |
| `apeninos` (3.4)                   | montana  | [1,6; 2,8] | [2, 5] × [5, 8]      | [1, 2,5] × [8, 14] (0)      | [6, 13] × [6, 8]    | [13, 20] × [5, 7]     | null                           | null                          | 0,3    | 300 / 2.100    | 1      | no    |
| `cantabrico` (3.8)                 | montana  | [1,8; 3,0] | [1,5; 4] × [7, 12]   | [1, 3] × [10, 15] (0)       | [5, 15] × [7, 10]   | [15, 17] × [6, 7]     | null                           | null                          | 0,5    | 100 / 1.800    | 1      | sí    |
| `meseta` (3.9)                     | llano    | [0,5; 1,2] | [1,5; 3] × [4, 6]    | null                        | [3, 10] × [4, 6]    | null                  | null                           | null                          | 0      | 700 / 2.250    | 2      | no    |
| `sierra_mediterranea` (3.10, 3.11) | montana  | [1,2; 2,4] | [1,5; 4] × [6, 11]   | [1, 2,5] × [10, 13] (0)     | [7, 15] × [6, 8]    | [15, 22] × [6, 8]     | null                           | null                          | 0,2    | 100 / 2.500    | 1      | sí    |
| `serrania_lusa` (3.12)             | montana  | [1,4; 2,6] | [1,5; 4] × [6, 10]   | [1, 2,6] × [8, 10] (0,05)   | [6, 12] × [6, 8]    | [15, 30] × [5, 6]     | null                           | null                          | 0,2    | 100 / 2.000    | 1      | sí    |
| `mittelgebirge` (3.16)             | media    | [1,2; 2,4] | [2, 5] × [5, 8]      | [1, 2,2] × [8, 12] (0,05)   | [8, 12] × [4, 8]    | null                  | null                           | null                          | 0,1    | 300 / 1.600    | 1      | no    |
| `llano_nordico` (3.17)             | llano    | [0,4; 1,0] | [1,5; 2] × [5, 8]    | [0,3; 1] × [5, 8] (0,15)    | null                | null                  | null                           | null                          | 0      | 10 / 170       | 2      | sí    |
| `fiordos` (3.17)                   | montana  | [1,4; 2,6] | [2, 5] × [5, 8]      | null                        | [3, 10] × [6, 9]    | null                  | null                           | null                          | 0,2    | 10 / 1.200     | 2      | sí    |
| `colinas_britanicas` (3.18)        | media    | [1,4; 2,8] | [1,5; 4,5] × [6, 10] | [0,25; 2] × [10, 20] (0,2)  | [4, 9] × [6, 8]     | null                  | null                           | null                          | 0,1    | 50 / 650       | 2      | sí    |
| `sierra_balcanica` (3.19)          | montana  | [1,2; 2,4] | [2, 5] × [5, 8]      | null                        | [8, 15] × [6, 7]    | [15, 25] × [5,5; 6,5] | null                           | null                          | 0,2    | 100 / 2.100    | 1      | sí    |
| `altiplano_andino` (3.20)          | ondulado | [1,0; 2,2] | [3, 5] × [4, 6]      | null                        | [8, 15] × [4, 6]    | null                  | null                           | null                          | 0,1    | 2.500 / 3.200  | 0      | no    |
| `cordillera_andina` (3.20)         | alta     | [1,4; 2,6] | [3, 5] × [4, 7]      | null                        | [10, 15] × [5, 7]   | [15, 30] × [4, 6]     | null                           | null                          | 0,4    | 1.500 / 3.700  | 0      | no    |
| `desierto_andino` (3.21)           | llano    | [0,3; 0,9] | null                 | null                        | null                | [15, 30] × [4, 6]     | null                           | null                          | 0      | 600 / 2.600    | 2      | no    |
| `rocosas` (3.22)                   | alta     | [1,2; 2,4] | [2, 5] × [4, 7]      | null                        | [8, 15] × [5, 9]    | [15, 30] × [4, 6]     | null                           | null                          | 0,3    | 1.500 / 3.700  | 2      | no    |
| `llanura_americana` (3.22)         | llano    | [0,3; 0,9] | [1,5; 2,5] × [4, 7]  | [0,5; 1,5] × [8, 12] (0)    | null                | null                  | null                           | null                          | 0      | 100 / 400      | 2      | sí    |
| `colinas_australes` (3.23)         | media    | [1,0; 2,2] | [1,5; 3] × [6, 9]    | [1, 2,5] × [8, 11] (0)      | [3, 10] × [4, 7,5]  | null                  | null                           | null                          | 0,1    | 50 / 1.600     | 2      | sí    |
| `llanura_tropical` (3.24, 3.25)    | llano    | [0,3; 0,9] | [1,5; 3] × [5, 8]    | null                        | [5, 10] × [6, 8]    | null                  | null                           | null                          | 0      | 20 / 1.000     | 1      | sí    |
| `desierto_golfo` (3.25)            | llano    | [0,2; 0,6] | [1, 3] × [6, 8]      | null                        | [10, 12] × [6, 7]   | [15, 20] × [5, 6]     | null                           | null                          | 0      | 10 / 1.900     | 2      | sí    |
| `altiplano_asiatico` (3.24)        | ondulado | [0,8; 1,8] | [3, 5] × [3, 5]      | null                        | null                | [20, 40] × [3, 4]     | null                           | null                          | 0,1    | 3.000 / 3.800  | 1      | no    |
| `generico_llano`                   | llano    | [0,5; 1,2] | [1,5; 2,5] × [4, 6]  | null                        | null                | null                  | null                           | null                          | 0      | 100 / 500      | 1      | no    |
| `generico_ondulado`                | ondulado | [1,0; 2,2] | [1,5; 4] × [5, 8]    | [1, 2] × [8, 11] (0)        | [4, 8] × [5, 7]     | null                  | null                           | null                          | 0,1    | 200 / 1.200    | 1      | no    |
| `generico_montana`                 | montana  | [1,4; 2,6] | [2, 5] × [5, 8]      | null                        | [6, 13] × [6, 8]    | null                  | null                           | null                          | 0,2    | 400 / 2.000    | 0      | no    |

Notas de intención que van al comentario de `constants.ts`:

- La ondulación del `polder` (0,4-0,9) es un cuarto de la de hoy (1,8 en `rolling` l. 105): una llana de 180 km hoy acumula 661-1.413 m solo de relleno (mapa 01 §1), y Brugge-De Panne acumula unos 300. Con esto una llana belga baja a 300-700 m y la del Macizo Central (que en la realidad suma 2.500-3.500 m, §3.14) sube por la cota del paisaje, no por el relleno.
- `cimaMax` no llega al motor (no hay altitud en `Segment`); sirve al veto V5 y a la ficha («cima a 2.100 m»).
- `viento` no llega al motor: `simulate.ts` sortea el viento por etapa (mapa 03 §5.1). Se guarda para que E2 (retransmisión) o una versión futura del viento por tramo lo lean sin volver a inventar la tabla.

### 5.2 Los territorios: los 56 países con carreras de equipos, explícitos

Regla: **cada país con carrera de equipos** (los 56 de mapa 02 §10) lleva territorio escrito; los 77 restantes de `COUNTRIES` (`packages/shared/src/countries.ts`, 133 en total) pueden caer a `fallback`. Reparto propuesto (abreviado; el paso 1 de §12 lo escribe entero):

| Países                                          | ruta (orden de recorrido)                                                            | cordillera                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| FR                                              | llanura_norte, costa_atlantica, macizo_medio, pirineos, provenza, alpes, jura_vosgos | alpes                                                                   |
| BE                                              | polder, bergs, ardenas                                                               | null                                                                    |
| NL                                              | polder, bergs (Limburgo, peso 1)                                                     | null                                                                    |
| LU                                              | ardenas                                                                              | null                                                                    |
| IT                                              | llanura_padana, prealpes, dolomitas, colinas_toscanas, apeninos                      | dolomitas                                                               |
| ES                                              | meseta, cantabrico, pirineos, sierra_mediterranea                                    | pirineos                                                                |
| AD                                              | pirineos                                                                             | pirineos                                                                |
| PT                                              | serrania_lusa, costa_atlantica (peso 1)                                              | serrania_lusa                                                           |
| DE, CZ, SK, HU, PL (sur), AT (norte), SI (este) | mittelgebirge, llanura_norte (peso 1)                                                | mittelgebirge (AT y SI: alpes)                                          |
| AT, SI, CH                                      | alpes, mittelgebirge                                                                 | alpes                                                                   |
| DK                                              | llano_nordico                                                                        | null                                                                    |
| NO, SE, FI                                      | fiordos (NO) / llano_nordico                                                         | fiordos (solo NO)                                                       |
| GB, IE                                          | colinas_britanicas, llanura_norte (peso 1)                                           | null                                                                    |
| HR, BA, RS, RO, BG, AL, XK, GR, TR, CY          | sierra_balcanica, llanura_norte (peso 1)                                             | sierra_balcanica                                                        |
| EE, LT                                          | llano_nordico                                                                        | null                                                                    |
| CO, EC, VE, GT                                  | llanura_tropical (peso 1), altiplano_andino, cordillera_andina                       | cordillera_andina                                                       |
| AR, CL                                          | desierto_andino, llanura_americana                                                   | desierto_andino (solo `puertoLargo`)                                    |
| US, CA                                          | llanura_americana, rocosas (US), colinas_britanicas como sustituto de Québec (CA)    | rocosas (solo US)                                                       |
| AU, NZ                                          | colinas_australes                                                                    | null                                                                    |
| JP, KR, TW                                      | llanura_tropical, colinas_australes como colinas templadas (JP)                      | null                                                                    |
| CN                                              | llanura_tropical, altiplano_asiatico                                                 | altiplano_asiatico                                                      |
| AE, SA, OM, QA                                  | desierto_golfo                                                                       | null (el «jebel» sale como `puerto` de `desierto_golfo`, no como reina) |
| MY, TH, IN, RW, BF, BJ, CM, MU, MA, DZ, AZ      | llanura_tropical / generico_ondulado (RW: generico_montana)                          | null                                                                    |

Dos consecuencias que valen la pena decir: una vuelta belga **no tiene reina** (`cordillera: null`), su etapa decisiva es `media_alto` sobre un berg o `media_cerca` con muro, que es lo que hace el Benelux Tour (mapa 07 §2.2); y una vuelta colombiana no tiene etapa `llana_costa`, salvo la caribeña con peso 1.

### 5.3 Cómo se pasa el país al generador

`buildRace` (`calendar.ts` l. 886-929) construye un `ContextoCarrera` y lo pasa a las tres ramas:

```ts
interface ContextoCarrera {
  raceId: string
  season: number
  country: string
  clase: Clase
  formato: RaceFormat
  paisajeFila?: Paisaje
  terrenoPedido?: RouteTerrain
  nStages: number
  km?: number
}
// firmas nuevas
function oneDaySpec(ctx: ContextoCarrera): StageSpec // antes (terrain, km, seed), l. 400
function stagesFromEdition(ctx: ContextoCarrera, edition: RaceEdition): CalendarStage[] // antes (id, edition), l. 216
export function stageMix(ctx: ContextoCarrera): StageSpec[] // antes (n, terrain, seedBase), l. 546
function nationalChampionships(code: string, name: string, season: number): CalendarRace[] // l. 316
```

`featureSpec` (l. 196-209) no cambia de firma: lo real no depende del sitio. `country` viene de `row.country ?? RACE_COUNTRY[row.id]` como hoy; `paisajeFila` de `row.paisaje`; para las ediciones, `stagesFromEdition` construye un `ContextoEtapa` por etapa con `desde`/`hasta` sacados del itinerario (§7) del país, no de las ciudades (no hay tabla ciudad → paisaje y no se inventa).

### 5.4 Países sin datos

`territorioDe(code)` devuelve `{ ruta: [generico_ondulado 0,6, generico_llano 0,3, generico_montana 0,1], cordillera: 'generico_montana', fallback: true }`. Es deliberadamente mediocre: un país del que no se sabe nada produce una carrera del montón, y la marca `fallback` la hace visible (test que lista los países en fallback con carrera de equipos, objetivo 0; y otro que imprime cuántos campeonatos nacionales caen ahí, sin banda). La alternativa de deducir el relieve del `PAIS_ZONA` del clima se descarta: `tropical` junta a Colombia y a Benín (`climate.ts` l. 112-125), y eso es precisamente lo que no hay que hacer.

---

## 6. La identidad entre ediciones

### 6.1 Lo que hoy existe y lo que falta

Hoy no hay temporada en el calendario: `SEASON_CALENDAR` es una constante de módulo (`calendar.ts` l. 3643-3648) y ni `RACE_EDITIONS` (`editions.ts` l. 25) ni las semillas llevan año (mapa 02 §7 y §11). La base sí sabe de temporadas: `raceKey = \`${race.id}:s${season}\`` (`db/calendarRun.ts`l. 783) y`race_routes`congela por`raceKey` (`schema.ts` l. 515-519). Así que la identidad entre ediciones necesita una cosa nueva en el motor (un calendario por temporada) y ninguna en la base.

### 6.2 La firma y la variación

```ts
/** Lo que NO cambia de un año a otro: es la carrera. */
export interface Firma {
  paisaje: Paisaje
  arquitectura: Arquitectura
  /** Motivos marcados `firma` en la plantilla, ya instanciados: la cota emblemática con su km × g. */
  emblemas: { motivo: Motivo; aMeta: number; nombre: string }[]
  circuito?: { kmVuelta: number; vueltas: number }
}
export function firmaDe(ctx: ContextoEtapa): Firma // solo subflujos `geo`, `arq`, `esq`

/** Lo que SÍ cambia: km ±8 %, posición ±3 km de los motivos no emblema, motivos opcionales, dibujo. */
export function variar(firma: Firma, esqueleto: Esqueleto, season: number): Esqueleto // subflujo `var`
```

Los emblemas reciben nombre determinista para el relato («Côte de {ciudad}», «Muro de {ciudad}», «Alto de {ciudad}») a partir de `RACE_ROUTES[id]` (`routes/raceRoutes.ts`, ciudades por etapa para las 310 de equipos) cuando existe, y del nombre de la carrera si no. El nombre es presentación y no entra en la semilla.

Para una vuelta por etapas, la firma es de la carrera y no de cada etapa: ventana del territorio (§7.1), número de etapas, si lleva crono y la arquitectura de la etapa emblema (la reina si hay `cordillera`, la `media_alto` si no). Las etapas de en medio se recomponen cada temporada con `mixRoles` y sus garantías (§7.2), como una Paris-Nice que cambia sus llanas y conserva la Colmiane.

### 6.3 El calendario por temporada

```ts
/** El calendario de una temporada. Memoizado por `season`; puro. */
export function calendarForSeason(season: number): CalendarRace[]
/** El calendario de referencia (la temporada con que arranca un mundo): lo que hoy se llama SEASON_CALENDAR. */
export const SEASON_CALENDAR: CalendarRace[] = calendarForSeason(BASE_SEASON)
```

`freezeRaceRoute` (`db/raceRoutes.ts` l. 35-55) pasa a buscar la carrera en `calendarForSeason(season)`, con `season` sacado del `raceKey` que ya recibe; `calendarRun.ts` l. 1604-1615 no cambia (lee lo congelado). Todo lo demás que lee `SEASON_CALENDAR` (bancos, tests, API para etapas no corridas) sigue leyendo la temporada base, que es la que los tests sellan. Coste: una temporada nueva se genera una vez por proceso (1.418 etapas; el generador de hoy tarda decenas de milisegundos en total, y con cinco reintentos como techo no pasa de unos cientos).

### 6.4 Lo que es variación deliberada y lo que no

Deliberado, y por eso escrito en `ROUTE.edicion`: km ±8 %, desplazamientos ±3 km, opcionales al 50 %, y el redibujo de rampas. No deliberado y prohibido: cambiar de paisaje, de arquitectura, quitar un emblema, mover una reina a otra etapa que no sea de las dos últimas terceras partes, cambiar el número de etapas. El test de identidad (§12 paso 5) compara `firmaDe` para 20 temporadas y exige igualdad exacta, y compara perfiles de temporadas consecutivas exigiendo correlación de `g` por km ≥ 0,6 (mismo esqueleto) pero no igualdad (hay variación).

Con `season` fijo todo es determinista; con el dueño decidiendo que no quiere variación (§14, decisión 2), `ROUTE.edicion.activa = false` deja `variar` como identidad y el calendario es idéntico cada año, como hoy.

---

## 7. Vueltas por etapas: la composición como itinerario

### 7.1 La vuelta recorre el país

```ts
export interface Itinerario {
  /** Paisaje de la meta de cada etapa; la salida de la i+1 es la meta de la i. */
  metas: Paisaje[]
  papeles: Papel[]
  km: number[]
}
export function itinerarioDe(ctx: ContextoCarrera): Itinerario
```

Algoritmo, determinista con `rng(\`${raceId}|itin\`)` (firma) y `rng(\`${raceId}|s${season}|itin\`)` (variación):

1. **Ventana del territorio.** Se elige una ventana contigua de `territorio.ruta` de longitud `min(n, ruta.length)` (con `n` etapas), circular. Si `terrenoPedido === 'mountain'` y hay `cordillera`, la ventana incluye la cordillera; si `'flat'`, la excluye si hay otra opción. Cada etapa recibe una `meta` avanzando por la ventana con probabilidad `ROUTE.itinerario.avance` (0,6) y quedándose en el mismo paisaje si no (dos etapas seguidas en los Alpes son un bloque, mapa 07 §2.1 regla 4).
2. **Papeles por `mixRoles`, alimentado por el relieve de la ventana.** `mixRoles(n, terreno, rand)` (`calendar.ts` l. 457-519) se conserva entero con sus cuatro pasos y garantías, con dos cambios: (a) `terreno` no sale de `mixTerrain(row.terrain)` sino del relieve máximo de la ventana (`alta`/`montana` → `mountain`, `media`/`ondulado` → `hilly`, `llano` → `flat`); (b) `reina` solo puede asignarse a una etapa cuya `meta` sea la `cordillera` o un paisaje `alta`/`montana`; si el sorteo la pide en otra etapa, se intercambia con la etapa de montaña más tardía; si no hay ninguna, se degrada a `media-alto` y se anota. Con eso «la reina cae en la cordillera del país» es una propiedad estructural y no un peso.
3. **Restricciones de arquitectura de gran vuelta** (solo si `n >= ROUTE.grandTourStages`, 15; hoy ninguna vuelta generada las alcanza, pero E12 puede crearlas): reina en las etapas `[0,7·n, 0,95·n]`, primera semana con como mucho un `reina`, descansos tras la 9 y la 15 en `restAfter`, última etapa `llana` (factor 0,4 de `ROUTE.grandTourLastDecisiveFactor`, l. 1217, se conserva).
4. **Kilómetros por clase** (§8): `mixKm` pasa a leer `ROUTE.kmPorClase[clase][papel]` en vez de `kmFlat/kmHilly/kmUphill/kmSummit` (l. 1240-1243), con `lastStageKmFactor` 0,85 igual. Una `.2` de 5 etapas deja de medir 165-195 km por etapa (mapa 07 §4.1 lo cifra como «la vuelta .2 más larga de Europa»).
5. **Crono**: las reglas de `ROUTE.itt*` (l. 1189-1209) se conservan; se añade `prologo` (3-8 km) con p 0,25 en la etapa 1 de vueltas de ≥ 6 etapas (Romandía, Dauphiné, Suiza), y `cronoescalada` con p 0,1 en la posición de la crono de una vuelta con `cordillera` (Tour 2025 e13, mapa 07 §2.1). El test «una vuelta llana de 4+ lleva crono» sigue verde.

### 7.2 Lo que se conserva de `calendar.test.ts` y lo que se re-sella

Las garantías de `mixRoles` (crono posible en 5, siempre en llana de 4+, cinco llanas no son cinco sprints, nadie sin crono ni final en alto, primera llana, última decisiva o paseo; `calendar.test.ts` l. 184-246) se conservan tal cual sobre la firma nueva `stageMix(ctx)`: el test construye un `ctx` de prueba con `country` de tres tipos (BE llano, ES media/alta, CO alta) en vez de los tres `terrain`. Se re-sellan: «km exactos de las ediciones» (l. 162-174, sigue exigiendo `Math.round(suma) === edition.km`, y `normalize` lo garantiza) y «Uphill finish acaba en `puerto`» (l. 269-277, ahora sobre `media_alto`, que por plantilla muere en cota).

### 7.3 Etapa de transición entre dos paisajes

`trazarEtapa` con `desde !== hasta` dibuja el primer 40 % con la ondulación de `desde` y sin sus dificultades, y el 60 % restante con `hasta`. Una Meseta → Cantábrico es 70 km de páramo y 100 de sierra, que es lo que la Vuelta hace al entrar en Asturias. Con `desde === hasta` la etapa es entera del paisaje.

---

## 8. Constantes

Todas en `packages/engine/src/constants.ts`, en dos bloques nuevos (`GEO` para paisajes y territorios, que por tamaño vive en `routes/geo.ts` con `as const` y se reexporta desde `constants.ts` para que la regla «toda constante vive en constants.ts» se cumpla por referencia) y ampliaciones de `ROUTE`. Se retiran de `ROUTE`: `queenHighDplusShare`, `queenLowDplusRange`, `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit` (sustituidas). Se conservan: `queenFinalMix`, `itt*`, `lastDecisiveChance`, `grandTourStages`, `grandTourLastDecisiveFactor`, `lastSummitShare`, `mixWeights`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor`.

| Nombre                         | Valor propuesto                                                                                                                                                                                                                                                                                                                             | Intención                                                                                        | En qué se apoya                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `ROUTE.kmPorClase`             | WT: llana [160, 45], media [150, 45], media-alto [140, 45], reina [130, 60], un_dia [200, 60]; Pro y 1: llana [140, 40], media [135, 40], media-alto [130, 40], reina [120, 55], un_dia [170, 50]; 2: llana [110, 45], media [105, 45], media-alto [100, 45], reina [100, 50], un_dia [140, 40]; NC: nacional_ruta [190, 50], u23 [150, 30] | una .2 no mide lo que una WT; la ficha `km` de la fila manda si existe                           | mapa 07 §4.1                       |
| `ROUTE.pesosArquitectura`      | tabla por `relieve × papel × clase` (§4.6); ejemplo `montana × un_dia × WT`: montana_un_dia 0,9, circuito_cotas 0,08, final_alto_largo 0,02                                                                                                                                                                                                 | la arquitectura es la decisión sorteada                                                          | mapa 07 §1 y §4.3                  |
| `ROUTE.unDiaFinalAltoLargoMax` | 0,02                                                                                                                                                                                                                                                                                                                                        | la rareza de Ventoux: tres carreras entre doscientas                                             | mapa 07 §1.2                       |
| `ROUTE.circuito`               | `kmVuelta [8, 25]`, `vueltas [4, 14]`, `urbanoKmVuelta [1, 3]`, `urbanoVueltas [30, 60]`                                                                                                                                                                                                                                                    | circuitos de nacionales, Mundial, Québec                                                         | mapa 07 §1.1, §1.7                 |
| `ROUTE.reinaFinal`             | alto: km [8, 22] g [6,5; 9]; altoCorto: km [4, 7] g [8, 12]; `altoCortoShare` 0,25                                                                                                                                                                                                                                                          | 70-80 % de finales en alto de gran vuelta son 8-22 km; el resto 4-7 al 8-12                      | mapa 07 §4.3                       |
| `ROUTE.reinaValle`             | `cimaCerca [1,5; 4,5]`, `corto [6,5; 19,5]`, `largo [22, 45]`                                                                                                                                                                                                                                                                               | los rangos de hoy (`valleyKmFor`, profileGen.ts l. 330-335) con holgura contra `FINAL_KIND_CUTS` | mapa 01 §2.5 (4 de 6.000 cruzadas) |
| `ROUTE.queenDplusPorClase`     | WT [2.600, 4.600], Pro y 1 [2.200, 4.000], 2 [1.400, 3.200], log-uniforme; un_dia montaña WT [3.500, 4.900], Pro y 1 [2.500, 3.800], 2 [1.800, 3.000]                                                                                                                                                                                       | sustituye el 60/40 (`queenHighDplusShare`) por clase: la cola baja la ponen las .2, no un dado   | mapa 07 §4.1; mapa 06 §6 punto 3   |
| `ROUTE.mediaCotas`             | `n [2, 5]`, `ultimaAMetaLejana [10, 40]`, `ultimaAMetaCerca [1, 8]`                                                                                                                                                                                                                                                                         | media que muere abajo pero no a 68 km (hoy 26-68, mapa 01 §2.2)                                  | mapa 07 §4.2                       |
| `ROUTE.murosEncadenados`       | `n [8, 20]` (WT [14, 20]), `ventanaKm [3, 130]`, `sectoresLlanos [0, 7]`, `ultimoAMeta [3, 15]`                                                                                                                                                                                                                                             | densidad de Flandes, Amstel, Brabante                                                            | mapa 07 §1.3                       |
| `ROUTE.sectores`               | `n [12, 30]` (WT [24, 30]), `primerSectorFraccion 0,35`, `cincoEstrellasAMeta [[15, 20], [45, 50], [90, 100]]`, `ultimoAMeta [1, 8]`                                                                                                                                                                                                        | Roubaix y sus imitaciones                                                                        | mapa 07 §1.4                       |
| `ROUTE.montanaUnDia`           | `ultimaCota km [1,3; 4,2] g [7, 11] aMeta [3, 17]`, `remateExtra p 0,4 aMeta [4, 8]`, `puertoLargoAMeta [30, 100]`                                                                                                                                                                                                                          | el caso v40 escrito en positivo                                                                  | mapa 07 §1.6, §4.3                 |
| `ROUTE.edicion`                | `activa true`, `kmPct 0,08`, `desplazamientoKm 3`, `opcionalP 0,5`, `emblemaKmMax 1`                                                                                                                                                                                                                                                        | variación deliberada, no aleatoria                                                               | §6                                 |
| `ROUTE.itinerario`             | `avance 0,6`, `reinaVentanaGranVuelta [0,7; 0,95]`, `prologoP 0,25`, `cronoescaladaP 0,1`                                                                                                                                                                                                                                                   | bloques de montaña, reina tarde                                                                  | mapa 07 §2.1                       |
| `ROUTE.trazado`                | `reintentos 5`                                                                                                                                                                                                                                                                                                                              | veto con reintento acotado y fallback contado                                                    | §4.7                               |
| `ROUTE.pancartaCimaMinKm`      | 1,5 (= `CLIMB_MIN_KM`)                                                                                                                                                                                                                                                                                                                      | un muro de 400 m no es un GPM                                                                    | `finalKind.ts` l. 33               |
| `VETO.unDiaFinalKmMax`         | 6                                                                                                                                                                                                                                                                                                                                           | V1: caso v40                                                                                     | mapa 07 §4.4 regla 1               |
| `VETO.reinaPuertoMinKm`        | 9,0                                                                                                                                                                                                                                                                                                                                         | holgura de 0,5 sobre `PASS_MIN_KM` 8,5                                                           | `stageKind.ts` l. 62; mapa 01 §5.1 |
| `VETO.reinaMetrosMin`          | 3.300 (solo si el puerto más largo < 9)                                                                                                                                                                                                                                                                                                     | holgura sobre `QUEEN_MIN_CLIMB_METRES` 3.200                                                     | `stageKind.ts` l. 64               |
| `VETO.mediaPuertoMaxKm`        | 8,0                                                                                                                                                                                                                                                                                                                                         | holgura de 0,5 bajo 8,5                                                                          | ídem                               |
| `VETO.mediaMetrosMax`          | 3.000                                                                                                                                                                                                                                                                                                                                       | una media no cruza la red de 3.200                                                               | ídem                               |
| `VETO.llanaDplusMax`           | 1.500                                                                                                                                                                                                                                                                                                                                       | una llana con más es media (regla 10 del mapa 07 §4.4)                                           | mapa 07                            |
| `VETO.etapa2KmMax`             | 180                                                                                                                                                                                                                                                                                                                                         | reglamento .2                                                                                    | mapa 07 §2.3                       |
| `VETO.puertosPorEtapaMax`      | 6                                                                                                                                                                                                                                                                                                                                           | ni una reina real pasa de 5 puntuables grandes                                                   | mapa 07 §4.2                       |
| `VETO.muroFinalMaxKm`          | 1,0 (= `STAGE.muroMaxKm`, constants.ts l. 4462)                                                                                                                                                                                                                                                                                             | para que `punto_a_punto_muro` con `aMeta 0` tipe `muro` cuando quiera                            | `finish.ts` l. 181-188             |

---

## 9. Reglas de veto y plausibilidad

`vetos(profile, ctx, spec): Veto[]` en `routes/vetos.ts`, pura, sobre el `StageProfile` dibujado y el contexto. Devuelve la lista de fallos con código, para el test y para el log. Orden de comprobación fijo.

| Código | Regla                                                                                                                 | Cómo se mide sobre `Segment[]`                                                                    | Caso que lo motiva                                                                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| V1     | **Una carrera de un día no acaba en un puerto de más de 6 km**, salvo `final_alto_largo_un_dia`                       | `ctx.formato === 'un-dia'` y último segmento `puerto` con `climbSize().km > VETO.unDiaFinalKmMax` | v40: Race Jura, final en alto de 14 km, 82 % del pelotón a cero (`profileGen.ts` l. 427-441; `docs/balance.md` l. 8102-8125) |
| V2     | Una `reina` tiene puerto ≥ 9,0 km o ≥ 3.300 m; y si `reina_alto`, el puerto final mide 8-22 km                        | `climbSize` sobre `puerto`, `climbMetres` acumulado (`stageKind.ts` l. 27-42)                     | mapa 01 §5.1: 3 de 1.500 cruzadas en el borde 8,5                                                                            |
| V3     | Una `media` tiene puerto más largo ≤ 8,0 km y < 3.000 m                                                               | ídem                                                                                              | mapa 01 §2.3: 2 de 1.500 medias clasificadas reina                                                                           |
| V4     | `paves` solo si `spec.adoquin` o `spec.sterrato` no es null                                                           | `segments.some(paves)`                                                                            | mapa 07 §3 consecuencias 1 y 2; las 20 filas `cobbles` ya caen bien                                                          |
| V5     | La cima más alta no supera `spec.altitudM.cimaMax`: `base + max(subida acumulada desde el último descenso) ≤ cimaMax` | integración de `g·km·10` por tramo (como `altimetry.ts::elevationProfile`)                        | mapa 07 §3 consecuencia 3: ni Bélgica a 2.000 m ni Colombia al nivel del mar                                                 |
| V6     | Una `llana` no tiene `puerto` y su D+ ≤ 1.500 m                                                                       | `climbMetres` total                                                                               | mapa 07 §4.4 regla 10                                                                                                        |
| V7     | Clase `2`: etapa ≤ 180 km; `un-dia` ≤ 200 salvo WT                                                                    | `profileKm`                                                                                       | mapa 07 §2.3, §4.1                                                                                                           |
| V8     | Como mucho 6 `puerto` ≥ 1,5 km                                                                                        | recuento                                                                                          | mapa 07 §4.2                                                                                                                 |
| V9     | `stageKindOf(profile, timeTrial).kind === kind pedido`                                                                | la función real (`stageKind.ts` l. 71-98)                                                         | es lo que `stageKind.test.ts` sella por generador; ahora lo sella el propio generador                                        |
| V10    | Si el papel es `reina`, `finalKindOf(profile)` coincide con la cubeta de la arquitectura                              | `finalKind.ts` l. 78-85                                                                           | los cortes 0,5/5/20 sin holgura (mapa 01 §2.5)                                                                               |
| V11    | Todo segmento ≥ 0,5 km; suma de `tramos` = `km` ± 0,1; ningún `g` fuera de [−14, 25]; ningún `rompepiernas`           | recorrido                                                                                         | `calendar.test.ts` l. 108-121; `sample.ts` l. 100-101                                                                        |
| V12    | Si la arquitectura termina en muro (`aMeta 0`), el último `puerto` mide ≤ 1,0 km al ≥ 8 %                             | `climbSize`                                                                                       | v60 §12: 0 de 1.075 tipan `muro` (`finish.ts` l. 181-188)                                                                    |
| V13    | Una `cri` no lleva `paves` y solo `cronoescalada` lleva `puerto` ≥ 8 km                                               | recorrido                                                                                         | `stageKind.test.ts` l. 32-43 (crono = llana en relieve, salvo cronoescalada)                                                 |
| V14    | Un `circuito` tiene `vueltas · kmVuelta ≤ 0,9 · km` (queda tramo lineal o de aproximación)                            | del esqueleto                                                                                     | mapa 07 §1.1                                                                                                                 |

Regla de conducta ante un veto: reintento con otro `dibujo` (hasta `ROUTE.trazado.reintentos`), después fallback a la arquitectura segura de la familia, y el fallback se cuenta. `stageKind.test.ts` deja de ser «cada generador cae en su clase» y pasa a ser «`trazarEtapa` cae en su clase y con 0 fallbacks», sobre las mismas 300 semillas × 5 km por papel y por paisaje de cada relieve (§12 paso 4).

Lo que **no** se veta porque el motor no lo ve: altitud como frío (no existe), viento por tramo (no existe), anchura de carretera (no existe). Se quedan como metadatos (`PaisajeSpec.viento`, `altitudM`) y no como reglas.

---

## 10. Lo real frente a lo generado

### 10.1 Prioridad, sin cambios en el orden

`buildRace` sigue mirando `RACE_EDITIONS` antes que la fila (l. 899-906) y `STAGE_FEATURES` antes que el generador (l. 913-914 y l. 222-223 de `stagesFromEdition`). Lo que cambia:

- **Real** (`STAGE_FEATURES`): `featureSpec` sin cambios; `origen: 'real'`; sin `paisaje` ni `arquitectura`.
- **Edición** (`RACE_EDITIONS` sin rasgos): ciudades y km reales; el relieve lo traza `trazarEtapa` con el país y el itinerario de la edición (la `meta` de cada etapa se asigna avanzando por la ventana del territorio, con el `terrain` de la edición como `terrenoPedido`); `origen: 'edicion'`. Es el 15,9 % del calendario (226 etapas) y es donde el país más cambia el resultado: Colombia e5 deja de dibujarse con los rangos de Lombardía.
- **Generado** (sin edición): `origen: 'generado'`.

### 10.2 El origen viaja hasta la pantalla

1. `StageSpec.origen` → `CalendarStage` (`calendar.ts` l. 42-46).
2. `freezeRaceRoute` escribe `routeSource: stage.origen === 'real' ? 'real' : 'generado'` (`db/raceRoutes.ts` l. 43-52; el tipo `RouteSource` de l. 29 no cambia).
3. La API de la ficha (`apps/api/src/routes/calendar.ts` l. 90-108, `planFrom`) devuelve `origen`, `paisaje` y `arquitectura` por etapa junto a `altimetry`.
4. La web muestra tres marcas (las del inventario, `scripts/inventario-recorridos.mjs` l. 57): «Recorrido real», «Ciudades reales, relieve generado» e «Recorrido generado», y bajo la altimetría de una etapa generada el sitio y la arquitectura en palabras («Bergs flamencos · clásica de muros encadenados», «Pirineos · etapa reina con final en alto»). Es la promesa que `docs/encargos.md` E12 pide («cómo se distingue en la interfaz lo real de lo generado, que es una promesa al jugador y no un detalle»), y este diseño la deja resuelta desde el motor para que E12 solo tenga que pintarla.
5. `scripts/inventario-recorridos.mjs` lee `stage.origen` en vez de deducir por `RACE_EDITIONS` (l. 54), y añade una columna «paisaje» para las no reales.

### 10.3 Lo real no se toca, y se comprueba

Test (§12 paso 7): para las 177 etapas con rasgos, el `profile` de `calendarForSeason(BASE_SEASON)` es idéntico, segmento a segmento, al de hoy (se sella una huella FNV del JSON de cada perfil real antes de tocar nada y se compara después). Los perfiles reales no dependen de `season` (la variación de §6 no se aplica a `origen: 'real'`).

---

## 11. El banco

### 11.1 Lo que cambia sin que nadie lo decida, y qué se hace

Del mapa 06 §4 y mapa 04 §4.2, en orden de certeza:

| Test o banda                                                         | Qué le pasa                                                                                                                              | Qué se hace                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.test.ts` l. 381 (`ENGINE_VERSION` 69)                         | sube                                                                                                                                     | 70 en el paso 8                                                                                                                                                                                                                                                          |
| `apps/api/src/stageHistory.test.ts` l. 199 (`cambian === 49`)        | la cifra cambia                                                                                                                          | re-sellar con la causa: «el generador declara la etiqueta desde la arquitectura y la geografía»; la mitad que importa (`spec.kind === stage.kind`) sigue                                                                                                                 |
| `routes/stageKind.test.ts`                                           | los ocho generadores desaparecen                                                                                                         | se reescribe sobre `trazarEtapa` (§12 paso 4), con `mountainClassic` por fin dentro (hoy 14 % de sus salidas son `media`, mapa 01 §2.6)                                                                                                                                  |
| `routes/calendar.test.ts` l. 162-174 y l. 269-277                    | firma nueva de `stageMix`                                                                                                                | se adaptan; las garantías se conservan                                                                                                                                                                                                                                   |
| `sim/calendarQueens.test.ts`                                         | cambia la población de 157 reinas y el desnivel de 103 de ellas (las 54 reales no); la banda `<1500` puede vaciarse o llenarse por clase | re-medir con 12 semillas antes de tocar la banda; decisión del dueño (§14, 1)                                                                                                                                                                                            |
| `sim/invariants.test.ts` «carreras PEQUEÑAS» (l. 855-955)            | 7 de 10 carreras generadas cambian de relieve y de composición                                                                           | re-medir las nueve bandas de `smallTours`, pareado                                                                                                                                                                                                                       |
| «cola en las reinas REALES» (l. 770-844)                             | Colombia e5, Guatemala e9 y Tachira e6 las dibuja el generador                                                                           | **congelar** esos tres perfiles como literales en `sim/frozenQueens.ts` (el perfil de hoy, con su `why`), para que la lista cerrada sea cerrada de verdad; y añadir tres nuevas del generador nuevo con `why` medido por forma (`finalKindOf` y desnivel), no por nombre |
| «ninguna carrera de un día satura» (l. 511-552)                      | cambia qué 8 son las más duras                                                                                                           | re-medir; el techo 0,92 y el 14 % de pájaras se conservan                                                                                                                                                                                                                |
| «cola de una CONTRARRELOJ real» (l. 222-273)                         | 3 de 5 cronos generadas; con `cri_rompepiernas` y `prologo` el relieve puede subir                                                       | re-medir; `nc-co-itt` pasa a `altiplano_andino`                                                                                                                                                                                                                          |
| `coherence.test.ts` «Race Jaén», `journal.test.ts` `race-tramuntana` | otro relieve                                                                                                                             | re-correr; el listón cero se mantiene; si aflora una contradicción es del motor                                                                                                                                                                                          |
| `db/raceRoutes.test.ts`, `recorridoDelMundo.test.ts`                 | `freezeRaceRoute` lee `calendarForSeason`                                                                                                | auto-consistente; se añade un caso: dos temporadas congelan perfiles distintos con `ROUTE.edicion.activa` y el mismo con `false`                                                                                                                                         |
| `sim/world.test.ts`                                                  | lee `stage.kind` (mapa 04 §0)                                                                                                            | si el reparto de tipos cambia (menos reinas en países llanos), re-medir la carga                                                                                                                                                                                         |
| `raceRoutes.test.ts` l. 9-18                                         | número de etapas por carrera                                                                                                             | no cambia: `n` sigue siendo el de la fila                                                                                                                                                                                                                                |

### 11.2 Lo que se mueve a propósito

1. **`mountain.breakawayWinPct` y `mountain.top10GapSeconds`** siguen sobre `reina-150`: se les cambia la clave a `canonQueen.*` y el rótulo a «control de forma» (mapa 04 §4.3 punto 1). No es del generador, pero es el momento.
2. **`calendarQueens.breakawayWinPct` 6-30**: se re-mide el 18,1 % y se añade una banda por cubeta de desnivel (monótona decreciente: `<1500 > 1500-2500 > 2500-3500 > >3500`), y una por clase (WT, Pro/1, 2). El comentario de `targets.ts` que cita 2.023 m se actualiza con la cifra nueva.
3. **`REAL_QUEENS`**: cerrada por forma (perfiles congelados) y ampliada con tres generadas nuevas elegidas por `finalKindOf` (una `alto`, una `cima_cerca`, una `valle_largo`) y clase.
4. **`grandTour.queenLastGroupPct`**: no cambia (20 de 21 etapas reales), pero se parte por `finalKindOf` como recomienda mapa 04 §4.3 punto 4 para que E12 pueda meter una gran vuelta generada sin romperlo.
5. **`smallTours.photoRepeat*`**: se separa la parte de composición (pares de llegadas agrupadas seguidas, ahora contados sobre el itinerario) de la de motor.

### 11.3 Métricas de realismo y variedad (geométricas, al test rápido)

Nuevo `routes/calendarGeometry.test.ts` (coste: leer 1.418 perfiles, milisegundos), sobre `calendarForSeason(BASE_SEASON)`:

| Métrica                                           | Cómo                                                                                                     | Criterio                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitecturas por relieve                         | recuento de `arquitectura` por `paisaje.relieve`                                                         | ninguna arquitectura > 60 % dentro de su relieve y papel; en `montana × un_dia` `final_alto_largo` ≤ 3 %                                              |
| Distancia entre perfiles del mismo `kind` y clase | correlación de `g` por km (`sampleProfile`) entre pares al azar (200 pares) de misma clase y ±10 % de km | mediana < 0,8 (mapa 04 §5.2); hoy se espera > 0,8 en `hilly` porque el esqueleto es único                                                             |
| Km tras la última cota por arquitectura           | `kmAfterLastClimb`                                                                                       | `montana_un_dia` p10-p90 en [3, 17]; `reina_alto` 0; `media_lejana` [10, 40]                                                                          |
| Subida fuera de los últimos 30 km                 | % de km `subida` con `kmToGo > climbRaceKmToGo` (30, `constants.ts` l. 3521)                             | ninguna reina en 0 %; p50 en [10, 40] % (mapa 04 §5.1)                                                                                                |
| Desnivel de reina por clase                       | `desnivelDe` (`calendarQueens.ts` l. 54-58) por `raceClass`                                              | WT p50 ≥ 2.800; `2` p50 ≤ 2.600; sin reina por encima de 5.500                                                                                        |
| Geografía respetada                               | V4 y V5 sobre todo el calendario                                                                         | 0 violaciones; 0 `paves` fuera de {polder, bergs, llanura_norte, costa_atlantica, colinas_toscanas, colinas_britanicas, llano_nordico, serrania_lusa} |
| Reinas por país                                   | recuento de `kind === 'reina'` por `country`                                                             | 0 en países con `cordillera: null` (BE, NL, DK, AE, AU...)                                                                                            |
| Muro en meta                                      | `finishType` sobre `deriveFinishTerrain`                                                                 | > 0 etapas tipan `muro` (hoy 0 de 1.075) y ≤ 4 % de las de un día                                                                                     |
| Circuitos                                         | `arquitectura ∈ {circuito_cotas, circuito_urbano}`                                                       | ≥ 80 % de los `nacional_ruta`; ≥ 2 carreras WT/Pro de un día                                                                                          |
| Fallbacks y degradaciones                         | contadores de `trazarEtapa`                                                                              | fallback 0; degradaciones listadas y ≤ 5 carreras de equipos                                                                                          |
| Entropía de `finalKind` por vuelta con ≥ 2 reinas | Shannon                                                                                                  | ninguna vuelta generada con todas sus reinas `alto` si tiene ≥ 3                                                                                      |

### 11.4 Cómo se mide que es MEJOR y no solo distinto

Pareado, con `engineVersion: 1` fijo en la semilla como hace `realQueens.ts` l. 179-182, mismo `worldSeed`, mismo campo por nivel (`buildField`), misma semilla de etapa, generador viejo contra nuevo, sobre dos muestras: la sistemática de `calendarQueens` (27 reinas × 4 semillas; para el pareado se toman las 27 posiciones de la rejilla nueva y las 27 de la vieja) y las 10 carreras de `smallTours`. Se imprime en `pnpm sim` una tabla `generador: viejo | nuevo` con: fuga que gana por cubeta de desnivel, cola de la reina por `finalKind`, grupos de tiempo en `media`, `flatWinnerGroupPct`, saturación de las 8 más duras, ganadores distintos por vuelta y `photoRepeatTopFive`. Criterio de «mejor», escrito antes de correr: (a) las de §11.3 pasan; (b) la fuga por cubeta es monótona; (c) `distinctWinnerPct` no baja; (d) la saturación sigue en 0 de N; (e) ninguna banda canónica (`llana-180`, `reina-150`, `cri-40`, `chronicle`) se mueve un dígito (si se mueve, se ha tocado el motor y no el generador). El generador viejo se conserva SOLO durante esa medida, copiado a `sim/legacy/profileGenLegacy.ts`, y se borra en el mismo cambio que sube `ENGINE_VERSION`; el resultado de la tabla va a `docs/balance.md`.

---

## 12. Plan de implementación

Cada paso: tests primero, después código, `pnpm typecheck && pnpm test:rapido` en verde antes de pasar al siguiente. Los pasos 1-6 no cambian el calendario (módulos nuevos sin conectar) y no suben `ENGINE_VERSION`; el paso 8 lo conecta y la sube una vez. Ficheros nuevos en `packages/engine/src/routes/`: `geo.ts`, `motivos.ts`, `arquitecturas.ts`, `trazado.ts`, `vetos.ts`, `identidad.ts`, `itinerario.ts`, y sus `.test.ts`.

1. **`geo.ts`: paisajes y territorios.** Tests: (a) `PAISAJES` tiene las 37 claves y cada rango tiene `min ≤ max`; (b) `territorioDe` resuelve los 56 países con carreras de equipos sin `fallback` (lista literal en el test, sacada de `RACE_COUNTRY` y de las filas) y algo para los 133 de `COUNTRIES`; (c) las 20 filas `terrain: 'cobbles'` del calendario (mapa 07 §3 consecuencia 1) caen en países cuyo territorio tiene algún paisaje con `adoquin` o `sterrato`; (d) `cordillera`, si no es null, está en `ruta` y su `relieve ∈ {montana, alta}`. Código: el catálogo de §5.1 y §5.2, `territorioDe`. Constantes: `GEO` (reexportado en `constants.ts`).
2. **`motivos.ts`: dibujar motivos.** Tests: para cada motivo, 500 semillas: `Σ km === km` ± 0,1, `Σ tramos.km === km` ± 0,1, `g` dentro del rango pedido ± 1,6 (el ruido de `climb` l. 78), `muro` tiene al menos una rampa ≥ 8 %, `puerto 'final_duro'` tiene última rampa ≥ 10 %, `sector` lleva `estrellas` y no lleva `tramos`, `circuito` repite literalmente el mismo `Segment[]` N veces, nunca sale `rompepiernas`. Código: mover `climb`, `descent`, `rolling` de `profileGen.ts` a `motivos.ts` (exportados) sin cambiar su cuerpo salvo la amplitud parametrizada y la eliminación del `rompepiernas`; `dibujar`.
3. **`arquitecturas.ts`: plantillas y pesos.** Tests: (a) toda arquitectura tiene plantilla; (b) `admite(spec, a)` prohíbe `sectores` en `alpes`, `reina_*` en `polder`, `final_alto_largo_un_dia` sin `puertoLargo`; (c) `esqueletoDe` sobre cada (`paisaje`, `papel`, `clase`, km de `KM_ROAD`) produce huecos con `aMeta` decrecientes y suma de tamaños ≤ km; (d) sorteo de arquitectura sobre 300 semillas por relieve y papel: ninguna > 60 %, todas las admitidas > 0. Código: plantillas de §4.6, `PESOS_ARQ`, `degradar`.
4. **`vetos.ts` + `trazado.ts`: el generador.** Tests primero, y son los que sustituyen a `stageKind.test.ts`: por cada `papel` y cada paisaje de su relieve, 300 semillas × `KM_ROAD` (l. 28 del test actual): `stageKindOf(profile, timeTrial).kind` es el pedido, `vetos` devuelve vacío, `fallback === false`; en `reina`, `finalKindOf` reparte en las cuatro cubetas dentro de ±0,08 de `queenFinalMix` (por generador, como pide mapa 04 §5.1); determinismo (`trazarEtapa(ctx)` dos veces da igualdad profunda); independencia de subflujos (cambiar `season` no cambia `firmaDe`; cambiar el `km` no cambia la arquitectura). Se conservan los casos de `stageKind.test.ts` que son de la función pura (`segments: []` es llana). Código: `trazarEtapa` de §4, `vetos` de §9, `auto` con `pancartaCimaMinKm`.
5. **`identidad.ts`: firma y variación.** Tests: `firmaDe` igual para 20 temporadas; con `ROUTE.edicion.activa` los perfiles de temporadas consecutivas tienen correlación ≥ 0,6 y no son iguales; con `activa: false` son iguales; el km varía ≤ 8 %; los emblemas se mueven ≤ 1 km. Código: `firmaDe`, `variar`, nombres de emblemas desde `RACE_ROUTES`.
6. **`itinerario.ts`: la vuelta por el país.** Tests: las garantías actuales de `calendar.test.ts` l. 184-246 reescritas sobre `stageMix(ctx)` con tres contextos (BE, ES, CO) y 120 semillas; `reina` solo en etapas con meta en `cordillera` o relieve `montana`/`alta`; ninguna `reina` en BE; km por clase dentro de `ROUTE.kmPorClase`; `.2` ≤ 180 km; bloques (dos metas seguidas iguales) aparecen en ≥ 30 % de las vueltas de 5+ con `cordillera`; prólogo solo en ≥ 6 etapas. Código: `itinerarioDe`, `mixRoles` con la restricción (b) de §7.1, `mixKm` por clase.
7. **Huella de lo real.** Test que sella, ANTES de tocar `calendar.ts`, una huella FNV por perfil de las 177 etapas con rasgos (`STAGE_FEATURES`) y de las 3 grandes vueltas enteras; se comprueba después del paso 8. Es la garantía de §10.3.
8. **Conectar en `calendar.ts` y subir la versión.** `buildRace` con `ContextoCarrera`; `oneDaySpec(ctx)`, `stagesFromEdition(ctx, edition)`, `stageMix(ctx)`, `nationalChampionships(code, name, season)` con `nacional_ruta` → `circuito_cotas` y `nacional_cri` → `cri_llana`/`cri_rompepiernas` según paisaje; `StageSpec.origen/paisaje/arquitectura`; `calendarForSeason(season)` memoizado y `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)`; borrar `profileGen.ts` (sus tres primitivas ya viven en `motivos.ts`; `routeRng` se queda en `motivos.ts`) salvo la copia legacy de §11.4; re-sellar `calendar.test.ts` l. 162-174 y l. 269-277, `stageHistory.test.ts` l. 199 con la cifra nueva y la causa; `ENGINE_VERSION` 69 → 70 en `constants.ts` l. 718 e `index.test.ts` l. 381; `calendarGeometry.test.ts` de §11.3 en verde. Nota en `docs/balance.md` como sección nueva («v61 §1 · El generador sabe dónde está», o el número que toque), con la tabla pareada de §11.4, la lista de constantes retiradas y añadidas, y las cifras re-selladas.
9. **Base, API y web.** `freezeRaceRoute` lee `calendarForSeason(seasonDe(raceKey))` y escribe `routeSource` desde `origen`; `apps/api/src/routes/calendar.ts` devuelve `origen`, `paisaje`, `arquitectura`; la web pinta las tres marcas y la línea de sitio (§10.2). Tests: `db/raceRoutes.test.ts` con dos temporadas; `apps/api` contrato; `apps/web/src/api/contracts.test.ts`.
10. **Banco.** `sim/frozenQueens.ts` con los tres perfiles congelados y `REAL_QUEENS` ampliada por forma; re-medir `calendarQueens` (12 semillas, sin banda hasta tener la cifra), `smallTours`, saturación, cronos; bandas nuevas de §11.2 puntos 2 y 4 solo cuando la cifra tenga sigma; `targets.ts` con los comentarios actualizados (2.023 → nuevo, «control de forma» en `canonQueen`). Todo en `pnpm sim` y en `test:bancos`.
11. **Documentación.** `docs/generador.md` (este documento, ya como decisión y no como propuesta), `scripts/inventario-recorridos.mjs` con `origen` y `paisaje` y regeneración de `docs/inventario-recorridos.md`, una línea en `SPEC.md` §6.2 diciendo que el generador existe y dónde está escrito, y el comentario de umbrales de `stageKind.ts` l. 44-58 re-medido con las cifras del generador nuevo (hoy está desfasado desde la v64, mapa 01 §5.1).

Orden de riesgo: los pasos 1-6 se pueden hacer en cualquier orden entre sí salvo 4 (necesita 2 y 3) y 6 (necesita 4); 7 es un día de trabajo y protege todo; 8 es el único que rompe tests sellados y por eso va con la versión.

---

## 13. Riesgos y lo que se sacrifica

1. **El paisaje es una etiqueta, no un mapa.** No hay coordenadas ni tabla ciudad → paisaje; las 250 carreras sin edición tienen ciudades en `RACE_ROUTES` sin fuente (mapa 02 §8) y no se cruzan con el territorio. Una `.2` francesa con ciudades bretonas puede caer en `macizo_medio` si la fila no lleva `paisaje`. Mitigación: `RaceRow.paisaje` en las filas donde se sepa (el paso 1 puede anotar las evidentes: Jura, Alsacia, Provenza, Asturias...), y la marca en la ficha hace visible el error para corregirlo con dato.
2. **La altitud no existe en el motor.** Colombia se dibuja con puertos largos y suaves, pero corre como si estuviera a nivel del mar; `cimaMax` es solo veto y relato. Se sacrifica a sabiendas: meter altitud en `Segment` cambia el contrato del motor (`stage/types.ts` l. 37-42) y es otro encargo.
3. **El viento tampoco.** `PaisajeSpec.viento` se guarda y no se consume; `simulate.ts` sortea el viento por etapa (mapa 03 §5.1). Una `llana_costa` del `polder` es hoy tan ventosa como una `llanura_padana`. Se anota para E2 o para un cambio del viento con exposición por tramo.
4. **Los circuitos repiten literalmente.** El motor cuenta `kmSubida` por tipo (mapa 03 §4.1), así que un circuito con una cota de 1 km × 12 vueltas suma 12 km de subida y `breakAppeal` sube; un critérium tiene 0. Es correcto en dirección (Montréal se corre como una carrera dura), pero la magnitud se mide en el paso 10 y puede pedir una banda propia.
5. **Muchos muros, muchos `puerto`.** Una `muros_encadenados` con 20 muros produce 20 segmentos `puerto` cortos: `selectionFactor` en subida es 1 con deriva (mapa 03 §4.2), así que la selección por acumulación va a existir; lo que no se sabe es si es demasiada. El banco de saturación (las 8 más duras) lo vigila; y las pancartas limitadas a ≥ 1,5 km evitan 20 GPM cat4.
6. **Coste de generación.** Hoy el calendario se genera en el arranque del módulo; con vetos y hasta cinco reintentos por etapa el peor caso son 7.000 dibujos. Estimación por el coste actual (microsegundos por etapa): por debajo de un segundo. Se mide en el paso 8 y, si molesta en tests, `calendarForSeason` se memoiza por fichero de caché en `dist`, no en el motor.
7. **Los bancos que hoy están «en verde por casualidad» se pondrán rojos.** `smallTours` y `calendarQueens` van a moverse (mapa 06 §4 puntos 5 y 6). El plan lo asume: re-medir con más semillas antes de tocar una banda, y ninguna banda nueva nace en rojo.
8. **El 60/40 de desnivel desaparece como dial.** La cola baja (< 1.500 m) pasa a ser consecuencia de la clase `2` y de los países de relieve `montana` sin `alta`; si el calendario no la puebla, `calendarQueens.test.ts` l. 62-63 se pone rojo y hay que decidir (§14, 1). Es mejor que hoy, donde «el 60/40 está sostenido por un test, no por el diseño» (mapa 06 §6 punto 3).
9. **La variación por temporada cambia lo que un jugador espera.** Si el dueño prefiere recorridos fijos (como hoy), `ROUTE.edicion.activa = false` y no se pierde nada del resto.
10. **El generador de campeonatos nacionales cambia 532 etapas de golpe.** Hoy `classic(220, id)` para todos (`calendar.ts` l. 358-360). Con `circuito_cotas` por paisaje, el nacional belga es un circuito con bergs y adoquín y el colombiano un circuito de altiplano con una cota de 4 km. Es lo que `motor.md` §V.3 pedía en agosto (mapa 05 §2), y es lo que más se va a notar en la ficha de cada corredor.
11. **Lo que este diseño no hace**: no carga datos reales nuevos (E12), no toca `featureProfile.ts` ni `RELIEF` (la amplitud por terreno de lo real sigue siendo la de `constants.ts` l. 1124-1131), no crea el Mundial ni las grandes vueltas generadas (E12), no cambia el motor.

---

## 14. Decisiones que son del dueño

1. **La cola baja de reinas.** ¿Se mantiene la garantía de que existan reinas de < 1.500 m (hoy un dado del 40 %, `ROUTE.queenHighDplusShare`) o se deja que la pongan la clase `2` y la geografía, aceptando que `calendarQueens.test.ts` l. 62-63 se re-selle con lo que salga? Propuesta: lo segundo; si la cubeta se vacía, se rebaja el mínimo de la .2 (`queenDplusPorClase['2']`) antes que volver al dado.
2. **Variación entre ediciones.** ¿`ROUTE.edicion.activa` a `true` (km ±8 %, cotas ±3 km, opcionales) o el recorrido fijo de hoy? Propuesta: `true`; la firma garantiza que la carrera se reconozca.
3. **Vueltas belgas y neerlandesas sin reina.** Con `cordillera: null` no hay etapa `reina` en BE, NL, DK, AE, AU, GB... y la general se decide en `media_alto`, muro y crono. Es lo real, pero cambia lo que hoy sale del sorteo (`mixWeights` da reinas en cualquier terreno `hilly`). ¿Se acepta?
4. **Kilómetros por clase.** Una `.2` pasa a 100-160 km por etapa y 140-180 en un día; una WT de un día a 200-260. Cambia la carga de la temporada (`world.ts` lee `kind`, no km, así que el banco de mundo no lo nota; el motor sí). ¿Se acepta la tabla de §8 o se quiere otra?
5. **La rareza del final en alto largo de un día** (`final_alto_largo_un_dia`, ≤ 2 %, solo clase `1` y `Pro` con `puertoLargo`). ¿Existe o se prohíbe del todo (V1 sin excepción)?
6. **Nacionales como circuito.** ¿Todos los `nc-*-road` con `circuito_cotas` (≥ 80 %) y el resto `muros_encadenados`/`montana_un_dia` según paisaje, o se deja alguna cuota de punto a punto?
7. **Pancartas de cima solo en cotas ≥ 1,5 km.** Cambia los puntos de montaña en clásicas generadas (hoy cada muro es un cat4 de 1 punto). ¿Se acepta?
8. **`RaceRow.terrain` como petición y no como identidad.** Con la geografía delante, ¿se mantiene la columna como sesgo (propuesta) o se borra de las filas y se deja que el sitio decida solo? Borrarla simplifica pero pierde el «esta carrera es de adoquín» que hoy distingue Kuurne de Nokere.
9. **El nombre de la temporada base.** `BASE_SEASON` tiene que coincidir con la primera temporada de un mundo (`season` en `db`); hay que confirmar con qué número arranca un mundo nuevo para que `SEASON_CALENDAR` y `calendarForSeason(primera)` sean la misma cosa.
10. **La medida pareada antes de borrar el generador viejo.** ¿Se exige la tabla de §11.4 en `balance.md` como condición para mezclar el paso 8, o basta con las métricas geométricas de §11.3? Propuesta: se exige; es lo que distingue «mejor» de «distinto».
