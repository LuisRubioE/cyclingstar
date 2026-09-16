# Esqueleto de `docs/generador.md` (E1 · El generador de recorridos)

Este fichero es la ley de los redactores. Cada sección del documento final la escribe un redactor distinto y en paralelo; lo único que impide que se contradigan es esto: un glosario con UN nombre por concepto (§B), una lista de decisiones ya tomadas (§C), el índice con lo que cada sección tiene que contener (§D) y las dos tablas de trazabilidad (§E). Quien redacte una sección lee su fila de §D, las fuentes que cita, y usa los nombres de §B tal cual. Si una propuesta usa otro nombre, se traduce con la tabla de alias de §B.4 y no se cita el alias en el documento final salvo en el apéndice.

Base: la propuesta ganadora es `propuestas/arquitectura.md` (la gramática de motivos: dos votos de tres, 100 puntos). Sobre ella se injertan los 45 injertos de `juicios/veredicto.json` y se resuelven los 27 riesgos de los tres jueces, condensados en las 12 obligaciones del encargo de síntesis. Las cifras medidas que aquí se citan salen de los mapas (`mapas/01` a `07`), del juez del motor (`juicios/motor.md` §1, script `juicios/coste-motor.mjs`) y de `propuestas/datos.md` §1.4 (script `scratchpad/e1/medir-real.mjs`); cada sección tiene que decir de cuál sale cada número.

Reglas de redacción comunes (repetidas aquí porque cada redactor solo ve su sección):

- Español, registro de `docs/entrenamiento.md` (denso, argumentado, con rutas de fichero y línea, con números medidos y de dónde salen).
- Sin rayas ni guiones largos como puntuación dentro de una frase; comas, dos puntos o paréntesis. Los rangos numéricos se escriben `[a; b]` o «de a a b», nunca `a-b` en prosa (el guion queda para títulos e identificadores como `ud_muros`, `test:rapido`, `race-france`).
- Nada inventado del código: si se afirma que una función hace algo, es porque un mapa lo cita con ruta y línea. Cada número medido lleva su procedencia (mapa, propuesta o juicio).
- Cada decisión está tomada. Cada tipo va escrito como TypeScript en bloque de código. Cada constante lleva valor e intención. Cada paso del plan lleva sus tests primero. Nada «se podría».
- Las citas del dueño van entre «» y solo esas: «para las que no se puedan nunca reproducir, el generador es una basura. Hay que arreglarlo, está pésimo» (epics G6), «Hay que arreglar eso» (G5), «siempre son los mismos tres o cuatro modelos» (agenda §4.18, parafraseado por la agenda), «está bien así» (balance v44 cierre, sobre el 18,1 %).
- Las cifras de versión: `ENGINE_VERSION` es 69 hoy (`constants.ts` l. 718) y sube UNA vez, en el paso 8 del plan, al siguiente número libre en producción al empezar. La nota de `docs/balance.md` se llama «v61 · El generador es una gramática» y, si al implementar ya existe una v61, toma el siguiente número libre; el documento lo dice así y no de otra forma.

---

## A. Cabecera y resumen ejecutivo provisional

Título: `# El generador de recorridos: la gramática de motivos (diseño final)`.

Encargo, literal (`docs/encargos.md` E1, l. 73-111): «El generador de recorridos», fichero `docs/generador.md`, tamaño «grande», primero de los trece porque «los perfiles son la ENTRADA de la calibración táctica» (agenda §4.18).

Estado: diseño único que se implementa; sale de cinco propuestas (arquitectura, banco, geografía, ingeniero, datos) y tres juicios (cobertura, motor, ejecutabilidad); la base es la gramática de motivos de `arquitectura.md` (dos votos de tres) con 45 injertos de las otras cuatro, todos localizados en el apéndice A.

Método (como `docs/tactica.md` y `docs/entrenamiento.md`, `docs/diseno/README.md`): siete mapas del código y de la realidad, cinco propuestas independientes, tres jueces con foco distinto, síntesis sobre la ganadora, y la fase adversaria pendiente (refutadores contra el código) que este documento deja preparada con el apéndice B.

Qué cambia respecto de hoy, en diez líneas (es el resumen que abre el documento; el redactor de la cabecera lo escribe con estas diez ideas y en este orden):

1. Los ocho moldes de `profileGen.ts` (siete en realidad: `ittSegments === flatSegments`, mapa 01 §2.1) y los tres terrenos de `MixTerrain` desaparecen; en su lugar hay 12 motivos, 9 metas, 32 esqueletos de etapa y 4 de composición, y la semilla decide primero la arquitectura y después el detalle.
2. El país entra por fin: 29 zonas geográficas con firma (qué existe y qué no, con `null` como «aquí no existe»), 56 territorios como ruta ordenada con cordillera, y `RACE_REGION` curada a mano para las 310 carreras de equipos y por etapa para las 60 ediciones.
3. Una carrera es la misma carrera: esqueleto y firma fijos por `raceId`; la edición (temporada) mueve una lista cerrada de cosas, con `BASE_SEASON = 0` y `SEASON_CALENDAR = calendarForSeason(0)` tirando los mismos dados que cualquier otra temporada.
4. Lo que el motor lee no cambia (`Segment`, `Ramp`, `Banner`, `types.ts` l. 12-48); viento, altitud, costa y meseta se entregan como metadatos de la ficha y no como física.
5. Dieciséis vetos por etapa, de calendario y de vuelta, con el caso v40 (V5: última cota de un día ≤ 4,2 km a [3; 17] km; en meta solo muro ≤ 2,2 km) y la lección de `reina-150` (V8: reina de verdad, con ≥ 25 % de la subida a más de 30 km de meta) escritos como reglas, no como bandas.
6. Lo real manda y se ve: huella FNV de las 177 etapas reales y las 3 grandes vueltas sellada antes de tocar `calendar.ts`; `routeSource` con tres valores hasta la pantalla; `featureProfile.ts` no se toca en E1.
7. El banco mide el calendario que el juego corre: `routeCensus` en cada push (0,57 s medidos), protocolo «mejor y no solo distinto» con línea base, dirección pre-registrada y cuatro condiciones, tabla pareada como condición para borrar el generador viejo, y remedición con dueño, orden y horas.
8. Kilómetros por clase y papel: desaparecen el 210 fijo de 142 carreras de un día y las etapas de 165 a 195 km en una .2.
9. El dueño ve el resultado antes de aceptarlo: galería de altimetrías por zona × esqueleto (`scripts/galeria-recorridos.mjs`) y frase de arquitectura en la ficha de cada etapa generada.
10. Un solo salto de `ENGINE_VERSION`, once pasos con tests primero, coste de arranque MEDIDO con objetivo y techo, y 10 decisiones que son del dueño, cada una con valor por defecto.

---

## B. Glosario canónico

Todo redactor usa estos nombres tal cual. Están agrupados por fichero. Los alias de las propuestas van en §B.4.

### B.1 Ficheros nuevos y tocados

| Ruta                                                                                                          | Qué contiene                                                                                                                                                                                                                                                                                                                                                                                                                   | Estado                       |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `packages/engine/src/routes/grammar/motifs.ts`                                                                | `MotifKind`, `MetaKind`, `Motif`, `validateMotif`, `renderMotif`                                                                                                                                                                                                                                                                                                                                                               | nuevo                        |
| `packages/engine/src/routes/grammar/skeletons.ts`                                                             | `Slot`, `Skeleton`, `SkeletonId`, `SKELETONS` (catálogo de 32), plantilla canónica y alternativas por esqueleto                                                                                                                                                                                                                                                                                                                | nuevo                        |
| `packages/engine/src/routes/grammar/geo.ts`                                                                   | `GeoZone`, `GeoSignature`, `ZONAS`, `Territorio`, `TERRITORIOS`, `zonaDe`                                                                                                                                                                                                                                                                                                                                                      | nuevo                        |
| `packages/engine/src/routes/grammar/regions.ts`                                                               | `RACE_REGION`, `regionOf`                                                                                                                                                                                                                                                                                                                                                                                                      | nuevo (contenido curado)     |
| `packages/engine/src/routes/grammar/place.ts`                                                                 | colocación por ventanas (§4.5 de arquitectura)                                                                                                                                                                                                                                                                                                                                                                                 | nuevo                        |
| `packages/engine/src/routes/grammar/render.ts`                                                                | `renderSkeleton`, `normalizeEnlaces`, `garantizaClase`, `emitirPancartas`                                                                                                                                                                                                                                                                                                                                                      | nuevo                        |
| `packages/engine/src/routes/grammar/veto.ts`                                                                  | `V1` a `V16` como predicados puros, `verify`                                                                                                                                                                                                                                                                                                                                                                                   | nuevo                        |
| `packages/engine/src/routes/grammar/edition.ts`                                                               | `BASE_SEASON`, `calendarForSeason`, `raceForSeason`, `stagesForSeason`, identidad y edición                                                                                                                                                                                                                                                                                                                                    | nuevo                        |
| `packages/engine/src/routes/grammar/tour.ts`                                                                  | `StageRole`, `TourSkeleton`, `TOUR_SKELETONS`, `itinerarioDe`, `composeTour`, `kmDe`                                                                                                                                                                                                                                                                                                                                           | nuevo                        |
| `packages/engine/src/routes/grammar/generate.ts`                                                              | `StageRequest`, `GeneratedStage`, `generateStage`                                                                                                                                                                                                                                                                                                                                                                              | nuevo                        |
| `packages/engine/src/routes/grammar/geometry.ts`                                                              | `dPlusDe`, `describeProfile`, `profileCorrelation`, `kmSubidaShare`                                                                                                                                                                                                                                                                                                                                                            | nuevo                        |
| `packages/engine/src/routes/grammar/legacy.ts`                                                                | los ocho builders legado del paso 1 (esqueletos que reproducen las formas de hoy)                                                                                                                                                                                                                                                                                                                                              | nuevo, se borra en el paso 8 |
| `packages/engine/src/sim/legacy/profileGenLegacy.ts`                                                          | copia del generador viejo SOLO durante la medida pareada del paso 9                                                                                                                                                                                                                                                                                                                                                            | temporal                     |
| `packages/engine/src/sim/routeCensus.ts`                                                                      | `RouteStats`, `routeCensus`, `aggregate`, `ROUTE_CENSUS_TARGETS`                                                                                                                                                                                                                                                                                                                                                               | nuevo                        |
| `packages/engine/src/sim/frozenSkeletons.ts`                                                                  | los tres esqueletos literales de `REAL_QUEENS` (Colombia e5, Guatemala e9, Tachira e6)                                                                                                                                                                                                                                                                                                                                         | nuevo                        |
| `packages/engine/src/routes/profileGen.ts`                                                                    | queda solo con las primitivas exportadas: `hashInt`, `routeRng`, `between`, `split`, `climb` (con `gMax`), `descent`, `rolling` (con `amp` numérica y `pRompepiernas`); los ocho `xxxSegments`, `normalize` y `garantizaPuerto` se retiran en el paso 8                                                                                                                                                                        | reducido                     |
| `packages/engine/src/routes/calendar.ts`                                                                      | `buildRace`, `stagesFromEdition`, `nationalChampionships` llaman a `generateStage`; `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva firma y delega en `composeTour`; `CalendarStage` gana `routeSource` y `arch`; `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)`; `auto()` se sustituye por `emitirPancartas` para lo generado y se conserva para lo real                                           | tocado                       |
| `packages/engine/src/routes/stageKind.ts`                                                                     | gana `SUMMIT_RUN_IN_KM = 5` exportada y la etiqueta `Summit finish` pasa a decidirse por `kmAfterLastClimb(profile) <= SUMMIT_RUN_IN_KM` (misma regla que `apps/api/src/stageHistory.ts` l. 73); `kind` no cambia de regla; comentario de umbrales l. 44-58 reescrito con la tabla medida                                                                                                                                      | tocado                       |
| `packages/engine/src/constants.ts`                                                                            | bloque nuevo `ARCH`; de `ROUTE` se retiran `queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`, `mixWeights`, `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit`; se conservan `ROUTE.itt*`, `lastDecisiveChance`, `grandTourStages`, `grandTourLastDecisiveFactor`, `lastSummitShare`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor`, y todo `RELIEF` (es de `featureProfile.ts`) | tocado                       |
| `packages/db/src/raceRoutes.ts`                                                                               | `freezeRaceRoute(db, worldId, raceKey, raceId, season)`; `RouteSource = 'real' \| 'edicion' \| 'generado'` (columna `text`, `schema.ts` l. 523: sin migración por el tipo); escribe `kind`, `label`, `time_trial`                                                                                                                                                                                                              | tocado                       |
| `packages/db/migrations/00NN_race_routes_kind.sql`                                                            | columnas `kind`, `label`, `time_trial` en `race_routes` (NN = siguiente libre tras la línea del motor; hoy la última es `0039`)                                                                                                                                                                                                                                                                                                | nuevo                        |
| `packages/db/src/calendarRun.ts` l. 516, 1603-1616; `world/callups.ts` l. 98; `raceContext.ts` l. 56-59 y 127 | leen `kind`, `timeTrial` y `profile` del congelado (`raceStagesForWorld`) y, si no hay fila, de `calendarForSeason(season)`; nunca de `SEASON_CALENDAR` directamente                                                                                                                                                                                                                                                           | tocados                      |
| `apps/api/src/stageHistory.ts`                                                                                | `calendarStageSpec` deja de reetiquetar por su cuenta y usa `stageKindOf(...).label`; el test l. 199 se re-sella con la cifra nueva y la causa                                                                                                                                                                                                                                                                                 | tocado                       |
| `apps/api/src/routes/calendar.ts` l. 91-105                                                                   | expone `routeSource`, `arch.frase`, `edicion` y `cambiosRespectoAnterior`; la altimetría de una etapa no corrida lee `run?.profile ?? frozen?.profile ?? stagesForSeason(...)`                                                                                                                                                                                                                                                 | tocado                       |
| `scripts/galeria-recorridos.mjs`                                                                              | galería HTML de altimetrías por zona × esqueleto con `renderAltimetrySvg`                                                                                                                                                                                                                                                                                                                                                      | nuevo                        |
| `scripts/medir-real.mjs`                                                                                      | el extractor de p10/p50/p90 de las 177 etapas reales (hoy en `scratchpad/e1/medir-real.mjs`), como instrumento de medida, nunca como fuente del generador                                                                                                                                                                                                                                                                      | nuevo (movido)               |
| `scripts/medir-arranque.mjs`                                                                                  | mide la carga del módulo `routes/calendar.js` y de una temporada adicional                                                                                                                                                                                                                                                                                                                                                     | nuevo                        |
| Tests nuevos                                                                                                  | `routes/golden.test.ts` (1.418 huellas, se borra en el paso 8), `routes/realFingerprint.test.ts` (177 + 3 grandes vueltas, sobrevive), `grammar/{geo,motifs,skeletons,place,veto,edition,tour,generate,geometry}.test.ts`, `grammar/calendario.test.ts` (bandas geométricas), `sim/routeCensus.test.ts`, `routes/arranque.test.ts`, `sim/frozenSkeletons.test.ts`                                                              | nuevos                       |

### B.2 Tipos (forma TypeScript completa)

```ts
// packages/engine/src/routes/grammar/motifs.ts
export type MotifKind =
  | 'enlace'
  | 'expuesto'
  | 'tendida'
  | 'descenso' // enlaces
  | 'cota'
  | 'puerto'
  | 'muro'
  | 'cadena'
  | 'sector'
  | 'racimo'
  | 'circuito' // dificultades
  | 'meta' // siempre el último

export type MetaKind =
  | 'esprint'
  | 'repecho'
  | 'muro_meta'
  | 'alto_corto'
  | 'alto_largo'
  | 'cima_cerca'
  | 'descenso_meta'
  | 'valle'
  | 'sector_meta'

export interface Motif {
  kind: MotifKind
  km: number // total del motivo; en `circuito`, el de una vuelta
  g?: number // dificultades y `tendida`: pendiente media en %
  forma?: 'regular' | 'progresiva' | 'irregular'
  adoquin?: boolean // `muro` adoquinado (sigue siendo `puerto`) o `sector` de adoquín (frente a tierra)
  firme?: 'adoquin' | 'tierra' // solo `sector`; tierra se rinde como `paves` 2-3★
  estrellas?: number // solo `sector`: 1..5
  hijos?: Motif[] // `cadena`, `racimo`, `circuito`
  vueltas?: number // solo `circuito`
  meta?: MetaKind // solo `meta`
  cotaFinal?: { km: number; g: number } // `meta` con cota
  firma?: boolean // motivo de FIRMA: no cambia entre ediciones
  nombre?: string // texto para la ficha («Muro de 1,2 km al 11 %»)
}
```

```ts
// packages/engine/src/routes/grammar/skeletons.ts
export interface Slot {
  motif: MotifKind
  n: [number, number] // cardinalidad; 0 en el mínimo = hueco opcional
  ventana: [number, number] // fracción de la etapa donde EMPIEZA el motivo
  params?: Partial<Pick<Motif, 'g' | 'forma' | 'adoquin' | 'estrellas' | 'vueltas'>> & {
    kmRango?: [number, number]
    gRango?: [number, number]
  }
  firma?: boolean
}

export interface Skeleton {
  id: SkeletonId
  kind: StageKind // lo que `stageKindOf` TIENE que devolver
  label: string
  finalKind?: FinalKind // reinas y medias: lo que `finalKindOf` TIENE que devolver
  meta: MetaKind
  slots: Slot[]
  dPlus: [number, number] // objetivo TOTAL, relleno incluido (ARCH.reina.dPlusIncluyeRelleno)
  km: [number, number] // rango bruto antes de ARCH.km.porClase
  requiere?: Partial<GeoSignature>
  pesoBase: number // peso del catálogo antes de zona y clase
  canonico: Motif[] // instancia fija escrita a mano: pasa todos los vetos por construcción
  alternativas?: Motif[][] // rotación DECLARADA (ARCH.edicion.nivel 2): la edición elige season % n
}

export type SkeletonId =
  // un día (15)
  | 'ud_esprint'
  | 'ud_esprint_capi'
  | 'ud_circuito'
  | 'ud_muro_final'
  | 'ud_muros'
  | 'ud_muros_adoquin'
  | 'ud_sterrato'
  | 'ud_adoquin'
  | 'ud_adoquin_ligero'
  | 'ud_montana'
  | 'ud_montana_media'
  | 'ud_montana_alto'
  | 'ud_criterium'
  | 'nc_ruta'
  | 'nc_crono'
  // etapa de vuelta (17)
  | 'et_llana'
  | 'et_llana_viento'
  | 'et_media_valle'
  | 'et_media_alto'
  | 'et_media_muro'
  | 'et_media_tendida'
  | 'et_reina_alto_largo'
  | 'et_reina_alto_corto'
  | 'et_reina_cima_cerca'
  | 'et_reina_valle'
  | 'et_reina_encadenada'
  | 'et_montana_corta'
  | 'et_reina_blanda'
  | 'et_crono'
  | 'et_prologo'
  | 'et_cronoescalada'
```

```ts
// packages/engine/src/routes/grammar/geo.ts
export type GeoZone =
  | 'flandes'
  | 'ardenas'
  | 'bretana'
  | 'francia_norte'
  | 'macizo_central'
  | 'alpes'
  | 'pirineos'
  | 'provenza'
  | 'italia_norte'
  | 'italia_centro'
  | 'dolomitas'
  | 'italia_sur'
  | 'cantabrico'
  | 'meseta'
  | 'andalucia'
  | 'levante'
  | 'portugal'
  | 'centroeuropa'
  | 'escandinavia'
  | 'britanicas'
  | 'balcanes'
  | 'anatolia'
  | 'andes'
  | 'cono_sur'
  | 'norteamerica'
  | 'australia'
  | 'asia_oriental'
  | 'golfo'
  | 'africa_llana'
  | 'generico'

export type Relieve = 'llano' | 'ondulado' | 'media' | 'montana' | 'alta'

/** `null` significa «aquí no existe» y los vetos V1 a V4 lo hacen cumplir. */
export interface GeoSignature {
  zona: GeoZone
  relieve: Relieve
  puerto: { km: [number, number]; g: [number, number]; forma: Motif['forma'] } | null
  cota: { km: [number, number]; g: [number, number] } | null
  muro: { km: [number, number]; g: [number, number]; adoquin: boolean } | null
  adoquin: 0 | 1 | 2 | 3 // 0 ninguno · 1 urbano · 2 sectores · 3 masivo
  sterrato: boolean
  viento: 0 | 1 | 2 | 3 // METADATO: no llega al motor (mapa 03 §5.1)
  altitud: 'mar' | 'colina' | 'media' | 'alta' | 'altiplano' // METADATO y veto V4; no hay altitud en `Segment`
  amplitud: number // ondulación del `enlace`, en % (tope ARCH.motivo.enlace.ampMax 2,4)
  finalesAlto: 'ninguno' | 'corto' | 'largo'
  pesos: Partial<Record<SkeletonId, number>> // multiplican `Skeleton.pesoBase`
}

export interface Territorio {
  ruta: readonly { zona: GeoZone; peso: number }[] // orden = recorrido plausible por el país
  cordillera: GeoZone | null // null = el país no tiene reina
  fallback?: boolean // país sin tabla: territorio genérico, contado en test
}

export const ZONAS: Record<GeoZone, GeoSignature>
export const TERRITORIOS: Record<string, Territorio> // ISO alpha-2, los 56 países con equipos explícitos
export function zonaDe(country: string): GeoZone // primera zona de la ruta por peso; `generico` si fallback
```

```ts
// packages/engine/src/routes/grammar/regions.ts
export interface RaceRegion {
  default: GeoZone
  stages?: Record<number, GeoZone>
} // stages: índice 1-based
export const RACE_REGION: Record<string, RaceRegion> // 310 carreras de equipos, curadas desde raceRoutes.ts
export function regionOf(raceId: string, stageIndex: number, country: string): GeoZone
// = RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
// Test: ninguna carrera de equipos cae a zonaDe(country); solo los 532 .NC pasan por ahí.
```

```ts
// packages/engine/src/routes/grammar/tour.ts
export type StageRole =
  | 'llana' | 'llana_viento' | 'media' | 'media_alto' | 'media_muro'
  | 'reina_alto' | 'reina_valle' | 'reina_encadenada' | 'montana_corta'
  | 'cri' | 'prologo' | 'cronoescalada'

export type TourSkeletonId = 'vu_corta' | 'vu_semana' | 'vu_larga' | 'vu_gran_vuelta'

export interface BlockRule {
  id: string                                   // 'reinaTarde', 'bloqueMontana', 'llanasEntreBloques', 'maxCronos', 'maxFinalesAlto', 'descansos'
  aplica: (n: number) => boolean
  repara: (roles: StageRole[], zonas: GeoZone[]) => StageRole[]   // determinista, de atrás hacia delante
}
export type Weighted<T extends string> = Partial<Record<T, number>>

export interface TourSkeleton {
  id: TourSkeletonId
  n: [number, number]
  bloques: BlockRule[]
  primera: Weighted<StageRole>
  ultima: Weighted<StageRole> | 'ROUTE.lastDecisiveChance'
  pesos: Record<Relieve, Weighted<StageRole>>  // ARCH.pesosComposicion
}

export interface Itinerario { metas: GeoZone[]; papeles: StageRole[]; km: number[]; desde: GeoZone[] }
export function itinerarioDe(raceId: string, country: string, n: number, terrain: RouteTerrain,
  raceClass: RaceClass, format: RaceFormat): Itinerario           // subflujo `arch|raceId`, sin season
export function composeTour(...): StageSpec[]                     // lo que hoy hace stageMix por dentro
export function kmDe(role: StageRole | 'un_dia', raceClass: RaceClass, last: boolean, rand: () => number): number
```

```ts
// packages/engine/src/routes/grammar/generate.ts
export type RouteSource = 'real' | 'edicion' | 'generado' // por ETAPA; por carrera: 'real' | 'mixto' | 'generado'

export interface StageRequest {
  raceId: string
  stageIndex: number // 1-based; 1 en un día
  season: number // BASE_SEASON = 0 es la canónica y tira sus propios dados
  km: number // contrato al 0,1 (calendar.test.ts l. 162-174) si viene de edición
  role: StageRole | 'un_dia'
  terrain: RouteTerrain // sesgo, nunca orden
  geo: GeoSignature // ZONAS[regionOf(...)]
  desde?: GeoZone // etapa de transición (40 % con la ondulación de `desde`)
  raceClass: RaceClass
  format: RaceFormat
  routeSource: 'edicion' | 'generado'
  editionKey?: string // `${from}|${to}|${km}` de editions.ts, para la semilla de edición
  fixed?: { skeleton?: SkeletonId; finalKind?: FinalKind; dPlus?: number } // bancos
}

export interface GeneratedStage {
  profile: StageProfile
  kind: StageKind // = stageKindOf(profile, timeTrial).kind, garantizado por V6
  label: string // = stageKindOf(...).label
  timeTrial?: boolean
  arch: {
    skeleton: SkeletonId
    geo: GeoZone
    motivos: Motif[]
    finalKind: FinalKind | null
    dPlus: number // dPlusDe(profile), relleno incluido
    intentos: number
    degradado: boolean
    frase: string // «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro»
    metadatos: { viento: 0 | 1 | 2 | 3; altitud: GeoSignature['altitud'] } // ficha, no física
  }
  routeSource: 'edicion' | 'generado'
}

export function generateStage(req: StageRequest): GeneratedStage
```

```ts
// packages/engine/src/routes/grammar/edition.ts
export const BASE_SEASON = 0 // calendarRun.ts l. 135: season = floor(gameDay / SEASON_DAYS)
export function calendarForSeason(season: number): CalendarRace[] // memoizada por season
export function raceForSeason(raceId: string, season: number): CalendarRace
export function stagesForSeason(raceId: string, season: number): CalendarStage[]
// Subflujos: `arch|raceId`, `firma|raceId` (sin season); `ed|raceId|season`; `mot|raceId|i|season|slot|j|i{intento}`,
// `pos|raceId|i|season|i{intento}`, `dib|raceId|i|season|slot|i{intento}`. Etapa de edición: raceId|e{i}|{editionKey} en lugar de raceId|i.
```

```ts
// packages/engine/src/routes/grammar/veto.ts
export type VetoId =
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'V7'
  | 'V8'
  | 'V9'
  | 'V10'
  | 'V11'
  | 'V12'
  | 'V13'
  | 'V14'
  | 'V15'
  | 'V16'
export interface Veto {
  id: VetoId
  detalle: string
}
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
): Veto | null
// Solo lee routes/ (stageKindOf, finalKindOf, climbSize, dPlusDe) y geometría del esqueleto. NUNCA sampleProfile,
// finishType ni costBase (regla del juez del motor, riesgo 3): eso se mide en routeCensus.
```

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
export function routeCensus(calendar?: CalendarRace[]): RouteStats[]
export function aggregate(
  rows: RouteStats[],
  by: (r: RouteStats) => string,
): Record<string, Summary>
```

### B.3 Constantes canónicas (bloque `ARCH` en `constants.ts`, con intención)

Las tablas grandes (`ZONAS`, `TERRITORIOS`, `RACE_REGION`, `SKELETONS`, `TOUR_SKELETONS`) viven como datos en `routes/grammar/*.ts` y se reexportan desde `constants.ts` por referencia; `ARCH` guarda los números de intención. Valores decididos:

| Constante                                                   | Valor                                                                                                                                                                                                                                                                                                | Intención (resumen; la sección 12 escribe el apoyo)                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ARCH.motivo.cota.km` / `.g`                                | [2,5; 8,0] / [4; 7]                                                                                                                                                                                                                                                                                  | media montaña; techo 8,0 deja 0,5 a `PASS_MIN_KM` 8,5                                                               |
| `ARCH.motivo.puerto.km` / `.g`                              | [9,0; 25] / [5; 9]                                                                                                                                                                                                                                                                                   | alta montaña; suelo 9,0 (0,5 sobre 8,5). El hueco [8,0; 9,0] se asume y se documenta (Ghisallo 8,6 sale como 9,0)   |
| `ARCH.motivo.puerto.rampaIrregular`                         | { km: [0,3; 0,8], g: [11; 13] }                                                                                                                                                                                                                                                                      | SPEC §6.17: el irregular abre ≥ 1,5× brecha                                                                         |
| `ARCH.motivo.muro.km` / `.g` / `.gMax`                      | [0,4; 3,0] / [8; 16] / 16                                                                                                                                                                                                                                                                            | `WALL_MAX_KM` 3; `gMax` evita rampas al 14,8 % medidas (mapa 01 §2.4)                                               |
| `ARCH.motivo.sector.km` / `.estrellas`                      | [0,3; 3,7] / [1; 5]                                                                                                                                                                                                                                                                                  | Roubaix                                                                                                             |
| `ARCH.motivo.racimo.sectores` / `.separacion`               | [4; 10] / [2; 6] km                                                                                                                                                                                                                                                                                  | impide reagrupar                                                                                                    |
| `ARCH.motivo.circuito.kmVuelta` / `.vueltas`                | [8; 30] / [3; 18]                                                                                                                                                                                                                                                                                    | Québec 12,6, Montréal 17-18                                                                                         |
| `ARCH.motivo.tendida.km` / `.g`                             | [5; 30] / [1,5; 3,5]                                                                                                                                                                                                                                                                                 | tipada `llano`: desgasta, no suma `kmSubida`                                                                        |
| `ARCH.motivo.descenso.g`                                    | [−8; −3]                                                                                                                                                                                                                                                                                             |                                                                                                                     |
| `ARCH.motivo.descenso.kmPorDesnivel`                        | { perdidaPorKm: 55, kmMin: 2, kmMax: 10 }                                                                                                                                                                                                                                                            | bajada canónica `clamp(len·g·10/55, 2, 10)` (regla de `mountainClassicSegments` l. 467)                             |
| `ARCH.motivo.enlace.km` / `.ampMax`                         | [1; 60] / 2,4                                                                                                                                                                                                                                                                                        | el relleno nunca alcanza el 3 % que `finish.ts` lee como cota (`finishClimbMinGradient` 3)                          |
| `ARCH.motivo.expuesto.amp`                                  | 1,0                                                                                                                                                                                                                                                                                                  | pólder, desierto, meseta: 300 m de D+ en Brugge-De Panne                                                            |
| `ARCH.meta.repecho`                                         | { km: [1; 2,9], g: [4; 7] }                                                                                                                                                                                                                                                                          | por debajo de `finishAltoMinKm` 3                                                                                   |
| `ARCH.meta.muro`                                            | { km: [0,5; 2,2], g: [8; 16], aproxKm: 2, aproxAmp: 2,5, finishMuroMaxKm: 1,0 }                                                                                                                                                                                                                      | Huy 1,3, San Luca 2,1; por encima de 1,0 km `finishType` dirá `puncheur` y se declara así en la tabla de `MetaKind` |
| `ARCH.meta.altoCorto`                                       | { km: [3; 7], g: [6; 11] }                                                                                                                                                                                                                                                                           | Planche, Xorret, Arrate                                                                                             |
| `ARCH.meta.altoLargo`                                       | { km: [9; 22], g: [6; 9], gMaxSiMasDe17: 7 }                                                                                                                                                                                                                                                         | 70-80 % de los finales en alto de gran vuelta; Loze y Bondone largos y suaves                                       |
| `ARCH.meta.cimaCerca.valle`                                 | [1,2; 4,3]                                                                                                                                                                                                                                                                                           | holgura 0,7 sobre los cortes 0,5 y 5 de `FINAL_KIND_CUTS`                                                           |
| `ARCH.meta.descensoMeta.valle`                              | [5,7; 19,3]                                                                                                                                                                                                                                                                                          | holgura 0,7 sobre 5 y 20                                                                                            |
| `ARCH.meta.valle.valle`                                     | [20,7; 45]                                                                                                                                                                                                                                                                                           | holgura 0,7 sobre 20                                                                                                |
| `ARCH.meta.sectorMeta.aMeta`                                | [1; 8]                                                                                                                                                                                                                                                                                               | Carrefour de l'Arbre a 17, Roubaix a 1,1                                                                            |
| `ARCH.meta.unDiaUltimaCota`                                 | { km: [1,3; 4,2], g: [7; 11], aMeta: [3; 17] }                                                                                                                                                                                                                                                       | el caso v40 en positivo (mapa 07 §1.6, §4.3)                                                                        |
| `ARCH.reina.dPlusIncluyeRelleno`                            | true                                                                                                                                                                                                                                                                                                 | el objetivo se persigue sobre lo que `desnivelDe` mide                                                              |
| `ARCH.reina.rellenoDplusPorKm`                              | 5,5 m/km                                                                                                                                                                                                                                                                                             | estimación del relleno (661-1.413 m en llanas, mapa 01 §1); se recalibra en el paso 3                               |
| `ARCH.reina.escalaDificultades`                             | [0,7; 1,4]                                                                                                                                                                                                                                                                                           | hoy [0,55; 1,8]                                                                                                     |
| `ARCH.reina.verdad`                                         | { puertoMetaMinKm: 9, dPlusMin: 3400 }                                                                                                                                                                                                                                                               | V8a                                                                                                                 |
| `ARCH.reina.subidaLejanaMin` / `.subidaLejanaKm`            | 0,25 / 30 (= `STAGE.climbRaceKmToGo`, `constants.ts` l. 3521)                                                                                                                                                                                                                                        | V8b: la lección de `reina-150`                                                                                      |
| `ARCH.reina.blandaShare`                                    | { media: 0,25; montana: 0,25; alta: 0,10 }                                                                                                                                                                                                                                                           | la cola baja de desnivel decidida en el diseño, no en `calendarQueens.test.ts`                                      |
| `ARCH.colocacion.enlaceMinimo` / `.enlaceMinimoTotal`       | 1,5 km / 0,12                                                                                                                                                                                                                                                                                        | dos dificultades nunca se tocan salvo `cadena`; fracción mínima de enlace                                           |
| `ARCH.colocacion.bajadaTrasPuerto`                          | [0,6; 0,9] × km del puerto                                                                                                                                                                                                                                                                           |                                                                                                                     |
| `ARCH.colocacion.maxIntentos`                               | 8                                                                                                                                                                                                                                                                                                    | reintentos antes de la plantilla canónica                                                                           |
| `ARCH.veto.margenClaseKm` / `.margenValleKm`                | 0,3 / 0,7                                                                                                                                                                                                                                                                                            | `garantizaClase` sobre 8,5 / sobre los cortes 5 y 20                                                                |
| `ARCH.veto.fallbackMaxShare`                                | { calendario: 0, testPorEsqueleto: 0,005 }                                                                                                                                                                                                                                                           | cero degradados en las 1.418; 0,5 % en 300 semillas × zona                                                          |
| `ARCH.veto.intentosP95`                                     | 3                                                                                                                                                                                                                                                                                                    | si se supera en el paso 4, se estrechan rangos antes que subir `maxIntentos`                                        |
| `ARCH.pancarta.cimaMinKm`                                   | 1,5 (= `CLIMB_MIN_KM`)                                                                                                                                                                                                                                                                               | pancarta `cima` en todo `puerto` ≥ 1,5 km y SIEMPRE en el último `puerto` de la etapa (para `lastClimbKm`)          |
| `ARCH.edicion.activa` / `.nivel`                            | true / 1                                                                                                                                                                                                                                                                                             | 0 fija; 1 jitter acotado; 2 rotación declarada por `Skeleton.alternativas`                                          |
| `ARCH.edicion.kmJitter` / `.vueltasJitter` / `.motivoNuevo` | 0,06 / 0,5 / 0,35                                                                                                                                                                                                                                                                                    | no aplica a etapas de edición real (km es contrato)                                                                 |
| `ARCH.km.porClase`                                          | tabla de banco §7.3 (WT llana [160, 30], media [150, 30], reina [140, 40], corta [120, 20], un día [200, 60]; Pro [150,30]/[140,30]/[140,35]/[120,20]/[180,50]; .1 [140,30]/[135,30]/[135,35]/[115,20]/[170,40]; .2 [110,40]/[110,40]/[115,40]/[100,20]/[140,40]; NC ruta [180,60], sub-23 [140,40]) | [min, rango]; el 210 fijo desaparece desde la temporada 0                                                           |
| `ARCH.km.maxPorClase`                                       | { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 }                                                                                                                                                                                                                                                   | techo UCI «a confirmar» en el comentario; Sanremo 294 va por `km` de fila                                           |
| `ARCH.pesoPorClase`                                         | tabla esqueleto × clase (`ud_montana_alto` 0,02 en .1 y 0 en el resto; `ud_adoquin` 0 en .2 fuera de `adoquin ≥ 2`; `ud_criterium` 0 salvo decisión del dueño)                                                                                                                                       |                                                                                                                     |
| `ARCH.pesosComposicion`                                     | tabla de arquitectura §7.3 por `Relieve` × `StageRole`                                                                                                                                                                                                                                               | sustituye `ROUTE.mixWeights`                                                                                        |
| `ARCH.bloques.gv`                                           | { descansos: [9, 15], reina: [15, 20], primeraSemanaFinalesAlto: 1, maxAltaMontana: 7, minLlanasEntreBloques: 2 }                                                                                                                                                                                    |                                                                                                                     |
| `ARCH.itinerario.avance`                                    | 0,6                                                                                                                                                                                                                                                                                                  | p de avanzar por la ruta del territorio (bloques por quedarse)                                                      |
| `ARCH.itinerario.transicion`                                | 0,4                                                                                                                                                                                                                                                                                                  | fracción inicial con la ondulación de `desde`                                                                       |
| `ARCH.anticlon.maxCorrelacion`                              | calibrado en el paso 9 (provisional 0,85)                                                                                                                                                                                                                                                            | p90 de pares reales de la misma familia (Ronde/E3, Amstel/Brabant, Lombardía/Lieja)                                 |
| `ARCH.arranque`                                             | { objetivoMs: 1500, techoMs: 2500, porTemporadaMs: 1000 }                                                                                                                                                                                                                                            | medidos por `scripts/medir-arranque.mjs` y `routes/arranque.test.ts`; hoy 578 ms                                    |

### B.4 Tabla de alias (para traducir las propuestas)

| Canónico                                    | arquitectura                                    | banco                            | geografia                    | ingeniero                             | datos                                    |
| ------------------------------------------- | ----------------------------------------------- | -------------------------------- | ---------------------------- | ------------------------------------- | ---------------------------------------- |
| `Motif` / `MotifKind`                       | igual                                           | `Motif` (unión discriminada)     | `Motivo`                     | `Motif` (unión)                       | `MotifKind`                              |
| `Skeleton` / `SkeletonId`                   | igual                                           | `RouteBrief` / `ArchetypeId`     | `Esqueleto` / `Arquitectura` | `Skeleton` / `FamilyId`               | `Archetype` / `ArchFamily`               |
| `MetaKind`                                  | igual                                           | `FinalBrief`                     | (en `aMeta` de `Hueco`)      | `contract.finish`                     | `finalMix`                               |
| `GeoZone` / `GeoSignature`                  | igual                                           | `GeoKey` / `GeoSignature`        | `Paisaje` / `PaisajeSpec`    | `GeoKey` / `RouteGeo`                 | `RegionId` / `GeoSignature`              |
| `Territorio` / `TERRITORIOS`                | (no existe)                                     | (no existe)                      | igual                        | (no existe)                           | (no existe)                              |
| `RACE_REGION`                               | `RaceRow.geo` + `RACE_PLACE` (sorteo: retirado) | `RACE_GEO`                       | `RaceRow.paisaje`            | `RACE_GEO_OVERRIDE`                   | `RACE_REGION`                            |
| `zonaDe(country)`                           | `zonaDe`                                        | `COUNTRY_GEO`                    | `territorioDe`               | `GEO_BY_COUNTRY`                      | `COUNTRY_REGION`                         |
| `StageRole`                                 | igual                                           | `Papel`                          | `Papel`                      | `MixRole`                             | `MixRole`                                |
| `TourSkeleton`                              | igual                                           | `TourCharacter` + `TourTemplate` | `Itinerario`                 | `mixRoles` + reglas                   | `TourTemplate`                           |
| `routeSource` (`real`/`edicion`/`generado`) | igual                                           | `source`                         | `origen`                     | `origen`                              | `RouteMeta.source` (`mixto` = `edicion`) |
| `StageRequest`                              | igual                                           | `RouteRequest`                   | `ContextoEtapa`              | `RouteContext` + request              | `GenInput`                               |
| `GeneratedStage.arch`                       | igual                                           | `brief`                          | `paisaje` + `arquitectura`   | `skeleton`                            | `RouteMeta`                              |
| `generateStage`                             | igual                                           | `stageFor`                       | `trazarEtapa`                | (builders + render)                   | `generateStage`                          |
| `renderSkeleton`                            | (paso 6)                                        | `render`                         | `dibujar`                    | `renderSkeleton`                      | (draw.ts)                                |
| `normalizeEnlaces` + `garantizaClase`       | `normalizeEnlaces`                              | `normalize` + guardas            | `normalize`                  | `normalize` + `garantizaPuerto`       | `garantizaClase`                         |
| `verify` / `V1..V16`                        | V1-V15                                          | `vetoesOf` / V1-V18              | `vetos` / V1-V14             | `verify` / V1-V10                     | `vetos` / V1-V12                         |
| `ARCH`                                      | igual                                           | `GEN`                            | `ROUTE.*` + `VETO` + `GEO`   | `ROUTE.motif/families/edition/verify` | `ARCH` + `EDITION` + `GEO_SIGNATURES`    |
| `BASE_SEASON` (0)                           | `season: 0`                                     | `calendarFor(1)` (error)         | `BASE_SEASON` (pregunta)     | `season 0`                            | `season 0`                               |
| `calendarForSeason`                         | `raceForSeason`/`stagesForSeason`               | `calendarFor`                    | `calendarForSeason`          | `calendarForSeason`                   | `seasonCalendar`                         |
| `ARCH.edicion.nivel`                        | (jitter)                                        | `editionOf`                      | `ROUTE.edicion.activa`       | `ROUTE.edition.p*`                    | `EDITION.level`                          |
| `routeCensus`                               | `calendario.test.ts`                            | `routeCensus`                    | `calendarGeometry.test.ts`   | `geometry.ts`                         | `routeFidelity.ts`                       |
| `frozenSkeletons`                           | «perfiles literales»                            | «cerrar por brief»               | `frozenQueens`               | `frozenSkeletons`                     | `frozenQueens`                           |
| `dPlusDe`                                   | `desnivelDe`                                    | `desnivelDe`                     | `climbMetres`                | `desnivelDe`                          | `dPlus`                                  |
| V8 (reina de verdad, dos cláusulas)         | V8                                              | V6 + V8                          | V2                           | V2 + §9.2                             | V2                                       |
| V5 (caso v40)                               | V5                                              | V1                               | V1                           | V1                                    | V1                                       |

Regla de numeración de vetos: los V del documento son los de arquitectura §9 con dos cambios: V7 se parte en V7 (`finalKindOf` por etapa, con reintento) y V16 (`finishType` medido en `routeCensus`, sin reintento); y V8 gana la cláusula (b) de banco (subida fuera de los últimos 30 km). La lista completa está en §C, decisión 24.

---

## C. Decisiones ya tomadas

Cada una con la propuesta o el injerto de donde sale (`I-nn` es el número de la tabla de §E.1). Son cerradas: el documento las escribe como hechos.

### C.1 Decisiones cerradas por la síntesis

1. **La gramática de motivos es la base** (arquitectura §3): 12 `MotifKind`, 9 `MetaKind`, 32 esqueletos, 4 esqueletos de composición; la semilla decide la arquitectura antes que el detalle; los rangos viven en `ARCH`, no en cuerpos de función.
2. **El contrato del motor no cambia** (todas): `Segment`, `Ramp`, `Banner` de `types.ts` l. 12-48 intactos; nunca se emite `rompepiernas` (`sample.ts` l. 100-101 lo colapsa a g 1,5 e ignora tramos); `tendida` y `expuesto` se tipan `llano` con tramos.
3. **Un solo salto de `ENGINE_VERSION`** en el paso 8 (arquitectura, banco, geografía, datos; contra los seis saltos de ingeniero, que se sustituyen por el paso 0 de línea base y el paso 1 de builders legado, I-16, I-42).
4. **Vetos puros de `routes/`**: `verify` solo lee `stageKindOf`, `finalKindOf`, `climbSize`, `dPlusDe` y geometría del esqueleto; `finishType` y demanda se miden en `routeCensus` y en `motifs.test.ts`, nunca por intento (juez motor, riesgo 3). Consecuencia: una recalibración de `STAGE.finish*` o de `physics.ts` no redibuja perfiles.
5. **`V5`, el caso v40, con los números del mapa 07** (I-23): en un día la última cota mide ≤ 4,2 km y corona a [3; 17] km; si muere en meta mide ≤ 2,2 km (muro) o es `ud_montana_alto` (peso 0,02, solo .1, solo `finalesAlto: 'largo'`).
6. **`V8` reina de verdad con dos cláusulas** (I-5, I-18, I-32): (a) puerto ≥ 9 km en meta, o dos puertos ≥ 9 km, o D+ ≥ 3.400 m (no aplica a `et_reina_blanda`); (b) ≥ 25 % de los km de subida a más de 30 km de meta (aplica a TODA reina, blanda incluida). Test con nombre: «`reina-150` expresada como esqueleto no pasa `verify`».
7. **`muro_meta` de [0,5; 2,2] km al [8; 16] %** (I-35), con `aproxKm` 2 y `aproxAmp` 2,5 para que `finishClimbGapBlocks` 5 no funda la racha (I-21); por encima de 1,0 km `finishType` dirá `puncheur` y la tabla de `MetaKind` lo declara; `routeCensus` mide `muro` ≥ 1 % y `puncheur` ≥ 8 % (V16).
8. **`et_reina_blanda` con peso propio** (I-22): `ARCH.reina.blandaShare` {media 0,25; montana 0,25; alta 0,10}; cota×[1;2]@[0,15; 0,6] de [5; 8] km, `alto_largo` de [9; 12] km al [6; 7] %, D+ [1.500; 2.500] con relleno. Es la cola baja que `calendarQueens.test.ts` l. 62-63 exige, decidida en el diseño; el 60/40 de `ROUTE.queenHighDplusShare` se retira.
9. **El objetivo de desnivel incluye el relleno** (I-8, I-19): `Skeleton.dPlus` es total; se persigue con `ARCH.reina.rellenoDplusPorKm` 5,5 (estimación, sin `sampleProfile`) y se verifica con `dPlusDe(profile)` (integración de tramos con g > 0, como `altimetry.ts::elevationProfile`); `routeCensus` imprime el delta contra `calendarQueens::desnivelDe` (esperado < 5 %).
10. **`normalizeEnlaces` cuadra los km solo con los enlaces** (arquitectura §4.6) y **`garantizaClase` es la red de seguridad** (I-24): mueve el motivo que decide (puerto más largo, última cota o valle) al borde con `margenClaseKm` 0,3 y `margenValleKm` 0,7 compensando en el enlace más largo; guarda «toda cota ≤ 2,9 km en clásica»; guarda `segment.km === Σ tramos` (I-8). `normalize` y `garantizaPuerto` se retiran en el paso 8.
11. **`climb(rand, len, avg, { gMax })`** con `muro.gMax` 16, **bajada canónica por desnivel** `clamp(len·g·10/55, 2, 10)`, **`rolling(rand, km, amp, pRompepiernas = 0)`** con amplitud numérica (I-17, I-43).
12. **Geografía: 29 zonas de `GeoZone` con `GeoSignature` y `null` como «aquí no existe»** (I-1, I-38) en `puerto`, `cota` y `muro`; `admite()` y `degradar()` siempre hacia abajo (`montana → media → ondulado → llano`); pólder con `amplitud` [0,4; 0,9]; `enlace.ampMax` 2,4.
13. **Territorios con ruta ordenada y cordillera** (I-1, I-2, I-28, I-36): `TERRITORIOS` para los 56 países con carreras de equipos; `cordillera: null` es veto estructural sellado en test («0 reinas en BE, NL, DK, AE, AU...»); los 77 países restantes de `COUNTRIES` caen a `fallback` contado.
14. **`RACE_REGION` curada a mano, por carrera y por etapa** (I-10, I-25, I-40): 310 carreras de equipos desde las ciudades de `raceRoutes.ts`, con `stages` para las 60 ediciones (`race-france` e6 → `pirineos`); test que prohíbe que una carrera de equipos caiga a `zonaDe(country)`; ningún sorteo de zona (se retira `geo|raceId` de arquitectura §3.5).
15. **Los 532 nacionales** pasan por `nc_ruta` (circuito con los motivos de `zonaDe(code)`) y `nc_crono`; es la promesa de `motor.md` §V.3.
16. **La tabla geográfica es juicio**: dato son solo las 20 filas `terrain: 'cobbles'` (todas en zonas con adoquín, mapa 07 §3), las ciudades de `raceRoutes.ts` y las 177 etapas reales; el documento lo dice en la sección 6 y da al dueño la galería (sección 16) y tests de consistencia interna (`grammar/geo.test.ts`).
17. **Viento, altitud, costa y meseta no llegan al motor** (todas; riesgo 3 de cobertura y 2 de ejecutabilidad): E1 entrega relieve y firme; `GeoSignature.viento` y `.altitud` viajan en `arch.metadatos` y en la ficha con texto que no promete abanicos («llano abierto», nunca «abanicos»); el abanico sigue saliendo de `rng('viento')` en cualquier km de `llano` (mapa 03 §5.1).
18. **Composición como itinerario** (I-2, I-36): ventana contigua de `TERRITORIOS[country].ruta`; avance con p 0,6 (bloques por quedarse); reina solo en etapa con meta en `cordillera` o zona `montana`/`alta`, si no se degrada a `media_alto` y se anota; etapa de transición 40/60 con la ondulación de `desde`; las cuatro garantías de `mixRoles` (`calendar.ts` l. 457-519) se conservan como reglas y las de bloque de arquitectura §7.2 se aplican como reparación determinista después. `ARCH.pesosComposicion` por `Relieve` sustituye `ROUTE.mixWeights`.
19. **`stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva firma** (I-17, I-43) delegando en `composeTour`, para que `calendar.test.ts` l. 184-277 y `stageKind.test.ts` compilen entre pasos.
20. **Los papeles (kind) y `timeTrial` y el número de etapas son identidad, nunca edición** (juez motor, riesgo 1): la edición mueve motivos no firma, km ± 6 % (no en ediciones reales), vueltas ± 1, motivo opcional y dibujo; nunca el papel de una etapa. Sellado en `edition.test.ts`.
21. **`BASE_SEASON = 0`** (`calendarRun.ts` l. 135, I-29, I-34); `SEASON_CALENDAR = calendarForSeason(0)`; la temporada 0 tira sus propios dados con `ed|raceId|0` (no la mediana de cardinalidades de arquitectura §4.3); `ARCH.edicion.activa` es el interruptor que devuelve el calendario fijo.
22. **Identidad de edición con `ARCH.edicion.nivel`** (I-11, I-41): 0 fija, 1 jitter (por defecto), 2 rotación declarada por `Skeleton.alternativas` elegida por `season % n` (Como/Bérgamo, Angliru/Lagos). Semilla de edición separada de la de identidad (I-27): `arch|raceId` y `firma|raceId` sin season; para etapas de edición real, `raceId|e{i}|{from}|{to}|{km}` (dos carreras con la misma salida, meta y km ya no dibujan lo mismo).
23. **Kind coherente entre código, congelado y ficha** (juez motor, riesgos 1 y 2): `race_routes` gana `kind`, `label`, `time_trial`; `calendarRun.ts` l. 1614, l. 516, `callups.ts` l. 98 y `raceContext.ts::terrenoRestante` leen el congelado; `stageKindOf` decide `Summit finish` con `SUMMIT_RUN_IN_KM` 5 (la regla de `stageHistory.ts` l. 73) y `stageHistory.ts` deja de reetiquetar; `kind = stageKindOf(profile).kind` para toda etapa generada (I-44); el 49 de `stageHistory.test.ts` l. 199 se re-sella con objetivo escrito «solo etapas reales cuya etiqueta declarada difiere; generadas = 0».
24. **Los dieciséis vetos**: V1 geografía puerto; V2 geografía adoquín; V3 geografía sterrato; V4 geografía altitud (`alto_largo` solo con `finalesAlto: 'largo'`; ningún puerto ≥ 15 km fuera de `altitud ∈ {alta, altiplano, media}`; D+ de un solo puerto integrado por tramos, I-28); V5 caso v40; V6 reina es reina (`stageKindOf` = `Skeleton.kind`); V7 `finalKindOf` = `Skeleton.finalKind`; V8 reina de verdad (a) y (b); V9 llana es llana (D+ ≤ 1.800 y sin cota ≥ 2,5 km a ≥ 5 % en los últimos 15 km); V10 cabe (enlaces ≥ 12 %, ningún segmento < 0,5 km, Σ km al 0,1); V11 muro en meta existe (calendario: `muro` ≥ 1 %, `puncheur` ≥ 8 %, medido en `routeCensus`); V12 no se repite (correlación < `ARCH.anticlon.maxCorrelacion` calibrado, I-12, I-39); V13 clase (`km ≤ maxPorClase`; `vu_corta` ≤ 1 crono; `vu_semana` ≤ 3 finales en alto y ≤ 2 seguidos); V14 gran vuelta (`ARCH.bloques.gv`); V15 pendientes (ningún tramo g > 20 ni < −14; ningún bloque `subida` con g < 1); V16 el final declarado según el motor (`finishType` ∈ lo que `MetaKind` promete, solo en `routeCensus` y `motifs.test.ts`). V1-V10 y V15 disparan reintento; V11-V14 y V16 son de calendario o vuelta.
25. **Pancartas** (obligación 6; I-31): `emitirPancartas` pone `cima` al final de todo `puerto` con `climbSize ≥ ARCH.pancarta.cimaMinKm` 1,5 y SIEMPRE en el último `puerto` de la etapa (así `lastClimbKm` ve el muro de meta); en un `circuito`, una por paso de cota ≥ 1,5 km; los muros de circuito < 1,5 km no puntúan. `kmSubida` no se toca (el motor cuenta por tipo, mapa 03 §4.1); `routeCensus` mide `kmSubidaShare` y `breakAppealEstimado` por esqueleto, con banda informativa `ud_circuito` ≤ 0,20 y `ud_muros` ≤ 0,15, y el banco de saturación vigila. Ninguna `meta_volante` generada (regla de la casa, `calendar.ts` l. 89-91; decisión del dueño D4).
26. **`stageKindOf` no se recalibra en E1** (obligación 5; datos D2, I-41): sus umbrales 8,5 / 3.200 / 3 son la vara; lo generado se acota con holgura (V6); lo real sigue con la discrepancia medida (27 de 113 reinas y medias, datos §1.5) y se abre como decisión del dueño D2 con la cifra tras el paso 8; la única modificación es la de la etiqueta `Summit finish` (decisión 23), que no toca `kind`.
27. **`featureProfile.ts` no se unifica en E1** (obligación 11; ingeniero §13.1.5): las 177 etapas reales conservan `normalizeTotal` y `rollingFill` con `RELIEF`; razón: huella FNV sellada y `erosion.*` medida sobre ellas; unificar los dos rellenos es un paso propio posterior a E1 (se anota en riesgos con lo que movería: `erosion.longClassicFresh`, `hardestClassicFresh`).
28. **Huella FNV de lo real** (I-3, I-30, I-37): `routes/realFingerprint.test.ts` sella antes de tocar `calendar.ts` las 177 etapas con rasgos y las 3 grandes vueltas enteras, y se comprueba después; `routes/golden.test.ts` sella las 1.418 en el paso 1 y se borra en el paso 8.
29. **Tabla pareada viejo/nuevo como condición para borrar el generador viejo** (I-4): `sim/legacy/profileGenLegacy.ts` existe solo durante el paso 9 y se borra en el mismo cambio que cierra la nota de `balance.md`.
30. **Protocolo «mejor y no solo distinto»** (I-6, I-20, I-33): línea base con el generador viejo en el paso 0; dirección pre-registrada de cada banda de simulación; pareado con `engineVersion` fijo en la semilla y 12 semillas; cuatro condiciones necesarias (realismo rojo→verde sin verde→rojo; variedad en verde; canónicas sin moverse un dígito; simulación en la dirección prevista o explicación medida sin ajustar la banda); doble lectura de las listas cerradas (por nombre y por forma).
31. **`routeCensus` en `test:rapido`** (I-6, I-20, I-33): 0,57 s medidos sobre 1.418 etapas (juez motor §1); bandas de realismo con columna «hoy (medido)»; ninguna banda nace en rojo.
32. **`calendarQueens` estratificada por `finalKind` × cubeta de desnivel** con `PASO` ajustado a ~30 etapas (I-7, I-34); `reina-175-4800` (plantilla 3 del mapa 07 §5) como escenario canónico impreso sin banda; `mountain.*` renombrada `forma.reinaCanonica.*` en el informe.
33. **Las tres reinas generadas de `REAL_QUEENS` se congelan como `Skeleton` literal en `sim/frozenSkeletons.ts`** (obligación 7; I-15, I-43) y se renderizan con `renderSkeleton`: cerradas por forma, con el renderizador nuevo, `why` reescrito para describir el esqueleto; no como `Segment[]` (museo) ni por brief resorteado (pierde comparabilidad). `REAL_QUEENS` sigue con 9 entradas; aparte, `GENERATED_QUEENS` (3 del calendario nuevo elegidas por forma: una `alto`, una `cima_cerca`, una `valle_largo`) se imprime sin banda.
34. **Remedición con dueño, orden y horas** (obligación 7): dueño operativo = el implementador del paso 9; dueño de cada banda = el dueño del repositorio (decide con la cifra delante). Orden por coste creciente: `routeCensus` (segundos), `stageKind` por esqueleto (minutos), `realQueens` (6 semillas, ~4 min reales; reloj 900 s), `timeTrials`, `calendarQueens` (12 semillas, ~6 a 19 min reales; reloj 3.600 s con 4), saturación de las 8 más duras (12 semillas, ~30 min), `smallTours` (12 semillas, ~25 min; reloj 3.900 s con 8), Jaén y Tramuntana. Todo ×2 (viejo y nuevo). Presupuesto: 4 h de máquina y 2 sesiones humanas; techo 8 h. Un resultado que contradiga la previsión se anota como «previsión fallida» en `balance.md` con la medida y NO mueve la banda hasta decisión del dueño.
35. **Coste de arranque medido, no estimado** (obligación 4): paso 0 mide hoy con `scripts/medir-arranque.mjs` (referencia del juez motor: 578 ms la carga, 0,40 ms por etapa una pasada de `sampleProfile` + lecturas); tras el paso 8 `routes/arranque.test.ts` exige carga de `SEASON_CALENDAR` ≤ `ARCH.arranque.objetivoMs` 1.500 con techo 2.500 y ≤ 1.000 ms por temporada adicional; `generateStage` no llama a `sampleProfile`; `calendarForSeason` memoizada por `Map` y `raceForSeason` por (id, season); si se supera el techo, el calendario se construye perezoso por carrera (decisión ya tomada, no «si molesta»).
36. **Kilómetros por clase y papel** (I-14, I-45): `ARCH.km.porClase` como tabla (no factor); el 210 fijo de 142 carreras de un día desaparece desde la temporada 0 (km sorteado con `firma|raceId`, estable entre ediciones salvo jitter); las 36 filas con `km` explícito lo conservan.
37. **`ud_montana_alto` existe como rareza** (arquitectura, banco, ingeniero): peso 0,02, solo .1, solo `finalesAlto: 'largo'`; el dueño puede ponerlo a 0 (D1).
38. **Etiquetas nuevas de `label`**: `Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic` (ingeniero §4.2 paso 6) además de las ocho actuales; el `label` de una etapa generada sale de `stageKindOf(...).label` y la frase de arquitectura va aparte.
39. **La interfaz distingue tres orígenes y anuncia la edición** (obligación 9): «Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado»; para generadas, la frase de arquitectura y «Edición {season + 1}» con `cambiosRespectoAnterior` (lista de motivos no firma que difieren de la temporada anterior, calculada por `diffMotivos(prev, actual)`); `scripts/inventario-recorridos.mjs` lee `routeSource`.
40. **El extractor `scripts/medir-real.mjs` es instrumento de medida, no fuente** (I-13, I-26, I-39): da p10/p50/p90 de las 177 reales para las bandas de `routeCensus` donde haya ≥ 3 fuentes y para calibrar `ARCH.anticlon.maxCorrelacion`; el generador no depende de ningún fichero regenerable.
41. **Galería para el dueño** (obligación 2): `scripts/galeria-recorridos.mjs` genera `docs/galeria-recorridos/` (HTML estático, una página por zona) con 5 perfiles por (zona × esqueleto compatible) rendidos con `renderAltimetrySvg`, más los 4 nacionales de cada uno de los 133 países en una página aparte; se corre en el paso 4 y se entrega ANTES del paso 8; el dueño la revisa con un criterio escrito (tres preguntas por perfil: ¿existe en ese sitio?, ¿existe en esa clase?, ¿la reconocería un aficionado?).
42. **Prólogo y cronoescalada entran** (`et_prologo`, `et_cronoescalada`): prólogo con p 0,25 en etapa 1 de vueltas ≥ 6 (requiere una tirada más en `mixRoles` para permitir crono en `roles[0]`, que hoy nunca la lleva, l. 493); cronoescalada con p 0,08 en vueltas con `cordillera`; `stageKind.test.ts` l. 32-43 se re-sella («una crono llana sin `timeTrial` es llana; una cronoescalada sin `timeTrial` es media»); `timeTrials.*` se remide (D3 del dueño puede dejarlos a 0).
43. **Critérium** (`ud_criterium`): existe en el catálogo con peso 0 hasta decisión del dueño (D5).
44. **`raceRoutes.test.ts` no cambia** porque `n` sigue viniendo de la fila; `recorridoDelMundo.test.ts` sigue auto-consistente y gana «dos temporadas, dos recorridos, un esqueleto».
45. **`backfillRaceRoutes`** (`db/raceRoutes.ts` l. 91-109) se corre ANTES del paso 8 en cualquier mundo vivo (el mundo se reinicia antes del lanzamiento; se anota en `docs/ops.md`).

### C.2 Decisiones que son del dueño (con valor por defecto, que es el que se implementa)

| #   | Decisión                                                                                                                                                                | Valor por defecto                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| D1  | `ud_montana_alto` (Ventoux, Mercan'Tour) como rareza al 0,02 en .1                                                                                                      | existe                                                                                                     |
| D2  | Recalibrar `stageKindOf` a la realidad (27 de 113 reinas y medias reales mal clasificadas)                                                                              | no en E1; se abre tras el paso 8 con la tabla del censo                                                    |
| D3  | `et_prologo` y `et_cronoescalada`                                                                                                                                       | entran con p 0,25 y 0,08                                                                                   |
| D4  | Metas volantes generadas (2 de depósito y 5 km de alivio cada una, mapa 03 §10.8)                                                                                       | no                                                                                                         |
| D5  | `ud_criterium` como carrera puntuable                                                                                                                                   | no (peso 0)                                                                                                |
| D6  | `calendarQueens.breakawayWinPct` 6-30: recentrar con la medida nueva o mantener como vigilancia; y si la cubeta < 1.500 m se despuebla, comparar < 2.000 contra > 3.000 | mantener 6-30 como vigilancia hasta la remedición del paso 9; la cubeta baja la sostiene `et_reina_blanda` |
| D7  | `ARCH.edicion.activa` y `nivel` (0 fija, 1 jitter, 2 rotación declarada)                                                                                                | activa, nivel 1; nivel 2 donde el esqueleto declare alternativas                                           |
| D8  | Vueltas belgas, neerlandesas, danesas, del Golfo y australianas sin reina (`cordillera: null`)                                                                          | se acepta                                                                                                  |
| D9  | `ARCH.km.maxPorClase` con cifras UCI «a confirmar»                                                                                                                      | se codifican las del mapa 07 §4.1                                                                          |
| D10 | Qué enseña la ficha: marca de origen a secas o frase de arquitectura y edición                                                                                          | frase de arquitectura y «Edición N» siempre en la ficha de etapa                                           |

---

## D. Índice del documento

Veinte entradas (la 0 es la cabecera). Longitud objetivo total ≈ 4.950 líneas. Cada entrada: id, número, título, contenido obligatorio con las decisiones ya tomadas, injertos que absorbe (por `I-nn` de §E.1), fuentes que el redactor debe leer, y líneas objetivo.

### 0 · `cabecera` · Cabecera y resumen ejecutivo (120 líneas)

Contenido: título, encargo literal (encargos.md l. 73-111), estado, método, «cómo leer» (mismas reglas que `entrenamiento.md`: citas del dueño entre «», conclusiones del repositorio marcadas como tales, cada número con procedencia, decisiones del dueño marcadas y recogidas en la sección 18 con valor por defecto), las diez líneas de §A, y el mapa del documento (una línea por sección). Dice que la base es la gramática de motivos (arquitectura, dos votos de tres) y que los 45 injertos están localizados en el apéndice A. Cita la versión del código contra la que se escribió (`ENGINE_VERSION` 69, HEAD `8585ca2` del mapa 04) y la regla de un solo salto de versión. Injertos: ninguno (cita el apéndice). Fuentes: `docs/encargos.md` l. 73-111, `docs/agenda.md` §4.18, `docs/entrenamiento.md` l. 1-60 (estilo), `juicios/veredicto.json` (ranking y votos), este esqueleto §A.

### 1 · `diagnostico` · Diagnóstico medido: lo que el generador hace hoy (300 líneas)

Contenido: los tres hallazgos de agenda §4.18 confirmados con línea (`MixTerrain` l. 410; `oneDaySpec` l. 400-407; ocho `xxxSegments` con `ittSegments === flatSegments`; el país calculado en `buildRace` l. 889 y no pasado a ninguna rama). Qué mueve la semilla y qué no (mapa 01 §4, tabla §8 entera: número de dificultades por umbral de km, orden fijo, rangos literales). Las siete consecuencias medidas de arquitectura §1.4 con sus cifras: 0 de 1.075 etapas tipan `muro`; dos generadores de reina (52 `mountainSegments`, 51 `mountainClassicSegments` sin vigilar y 14 % clasificadas `media`, 54 reales; desniveles medianos 2.898 / 1.734 / 1.854 m, mapa 06 §1); el caso v40; los tres bordes sin holgura (3 de 1.500, 4 de 6.000, 12 de 1.500); el relleno de 661 a 1.413 m; ninguna temporada; 142 carreras de un día a 210 km. Añadir: `stagesFromEdition` → `oneDaySpec` → `mountainOneDay` dibuja reinas de vuelta con plantilla de un día (Colombia e5 con 18 km tras la cota contra los «47 km rodadores» del `why`); 72 discrepancias `kind` declarado contra leído y el 49 sellado; la tabla real contra generado de datos §1.4 (p10/p50/p90 de 177 etapas) y la de mapa 07 §4.3; la lección de E3 (`reina-150` 27-30 % contra 3,3 % y 18,1 %; seis repeticiones del patrón, mapa 04 §3.3); lo que ya está bien y se conserva (`climb`, `descent`, `rolling`, `split`, `routeRng`, `stageKindOf`, `finalKindOf`, `race_routes`, `featureProfile`). Cierra con la frase de por qué E1 va primero. Injertos: I-9 (el defecto Colombia e5 como diagnóstico), I-13/I-26 (la tabla real medida como vara). Fuentes: mapas 01 (entero), 02 §4-§9, 04 §3, 05 §5 y §10, 06 §1 y §2.1, 07 §4.3; `propuestas/arquitectura.md` §1; `propuestas/datos.md` §1.4-1.5; `propuestas/banco.md` §1.2-1.3.

### 2 · `principios` · Principios (120 líneas)

Contenido: los nueve principios de arquitectura §2 reescritos con las decisiones de §C: (1) la arquitectura se sortea, el detalle se rellena; (2) cada motivo es un tipo con rangos en `ARCH`; (3) la geografía restringe, no decora, y `null` es «no existe»; (4) lo que se declara se garantiza (`stageKindOf`, `finalKindOf`, reintento, plantilla canónica, cero degradados); (5) identidad por carrera y edición por temporada, con `BASE_SEASON` 0 tirando sus dados; (6) lo real manda y se distingue hasta la pantalla; (7) puro y determinista con subflujos nominales; (8) el motor no cambia y los vetos solo leen `routes/` (decisión 4); (9) medir antes de bandear y «mejor y no solo distinto» (decisión 30); más (10) el dueño ve antes de aceptar (galería). Cada principio con una línea de qué lo viola hoy (cita a la sección 1). Injertos: I-20 (regla de vetos puros y censo), I-38 (null y degradar hacia abajo). Fuentes: `arquitectura.md` §2, `banco.md` §2, `geografia.md` §2, `ingeniero.md` §2, `juicios/motor.md` §5 riesgo 3.

### 3 · `modelo` · El modelo de tipos (330 líneas)

Contenido: TODOS los bloques TypeScript de §B.2 tal cual (motivos, esqueletos, geografía, regiones, composición, petición y salida, edición, vetos, censo), cada uno con un párrafo de por qué esa forma y contra qué línea del código encaja (`Segment`/`Ramp`/`Banner` de `types.ts` l. 12-48; `StageSpec`/`CalendarStage` de `calendar.ts` l. 33-46; `RaceRow` l. 381-398; `RouteSource` de `db/raceRoutes.ts` l. 29). Lo que gana `CalendarStage` (`routeSource`, `arch`) y `CalendarRace` (`routeSource` agregado `real`/`mixto`/`generado`). Cómo encaja cada motivo con `Segment` (tabla de arquitectura §3.1 «rinde a Segment[] como», con `tendida` y `expuesto` tipados `llano`, `muro` adoquinado como `puerto`, `sector` tierra como `paves` 2-3★). La tabla de alias §B.4 va aquí en una nota al pie por si un lector viene de las propuestas. Injertos: I-1 (null en firma, cordillera), I-10/I-25 (`RACE_REGION` por etapa), I-15 (`Skeleton` serializable para congelar), I-17 (`DEFAULT_ROUTE_CONTEXT`), I-22 (`et_reina_blanda` en el catálogo), I-27 (semillas separadas: `editionKey`). Fuentes: este esqueleto §B.2; `arquitectura.md` §3; `ingeniero.md` §3.1-3.3; `geografia.md` §3.1-3.2; `datos.md` §3.2; mapa 03 §1.

### 4 · `gramatica` · La gramática de motivos completa (320 líneas)

Contenido: los 12 `MotifKind` uno a uno con rango, cómo se rinde (`climb`, `descent`, `rolling`, `sector`), qué lee el motor de cada uno (mapa 03 §3-§4) y el caso real que lo motiva (mapa 07). `cadena` (muros sin valle), `racimo` (sectores separados [2; 6] km), `circuito` (hijos rendidos `vueltas` veces con la MISMA semilla de detalle `dib|…|hijo{h}`). Los 9 `MetaKind` con la tabla de arquitectura §3.2 completa (cómo se rinde, `finishType` esperado, `finalKindOf`, regla que lo garantiza), con las holguras 0,7 (decisión 10) y `muro_meta` [0,5; 2,2] declarando `puncheur` por encima de 1,0 (decisión 7) y la aproximación de 2 km a amplitud ≤ 2,5 diseñada contra `deriveFinishTerrain` (`finish.ts` l. 94-123, comprueba `alto` antes que `muro` l. 165-189). Cómo se cierran los tres bordes sin holgura (9,0 / 8,0 en vez de 8,5; 0,7 sobre 5 y 20; pancarta en el último puerto). `validateMotif` y sus tests unitarios. Lo que la gramática NO produce (sin `rompepiernas`, sin metas volantes, sin altitud). Injertos: I-21 (meta contra `deriveFinishTerrain`), I-35 (`muro_meta` 0,5-2,2), I-17/I-43 (`climb` con `gMax`, bajada canónica), I-38 (`ampMax` 2,4 y pólder 0,4-0,9). Fuentes: `arquitectura.md` §3.1-3.2 y §8; `ingeniero.md` §4.4; `datos.md` §3.3; `banco.md` §3.3; mapa 03 §2-§4 y §10; mapa 07 §1 y §4.3; `juicios/motor.md` §1 (hechos sobre `finish.ts`).

### 5 · `esqueletos` · Los esqueletos por tipo y clase (320 líneas)

Contenido: el catálogo de 32 esqueletos (15 de un día, 17 de etapa) en dos tablas con `motivo×n@ventana`, meta, `finalKind`, D+ total, km bruto, `requiere`, `pesoBase` (aquí se escriben los pesos base que arquitectura dejó sin escribir: se toman de las columnas de pesos de banco §5.2 y geografía §4.6, y se dan enteros), referencia real. `et_reina_blanda` con sus slots exactos (decisión 8). `ud_montana_alto` como rareza (decisión 37). `nc_ruta` y `nc_crono`. La plantilla canónica de cada esqueleto (un `Motif[]` literal por esqueleto: es lo que pasa los vetos por construcción; el redactor escribe las 32). `alternativas` declaradas para los que rotan (`ud_montana`: Como/Bérgamo como dos `canonico`; `et_reina_alto_largo`: dos metas). La tabla `ARCH.pesoPorClase` entera (esqueleto × WT/Pro/.1/.2/NC). Cómo se elige (`arch|raceId`: candidatos por `role`/`terrain`/`requiere`, peso = `pesoBase × geo.pesos × pesoPorClase`). Qué esqueleto recibe cada una de las 226 etapas de edición sin rasgos (`flat → et_llana`, `hilly → et_media_*`, `mountain → et_reina_*`, `itt → et_crono`, `cobbles → ud_adoquin_ligero`), nunca uno de un día (decisión de I-9). Injertos: I-9 (etapas de edición reciben esqueletos de etapa), I-11/I-41 (`alternativas`), I-22 (`et_reina_blanda`), I-23 (V5 en `ud_montana`), I-45 (km por clase y papel aplicado a cada esqueleto). Fuentes: `arquitectura.md` §3.3, §4.1; `banco.md` §4.2 y §5.2 (pesos); `geografia.md` §4.6; `ingeniero.md` §4.3 (tres builders como plantillas canónicas); mapa 07 §1, §2, §5.

### 6 · `geografia` · La geografía: zonas, territorios y RACE_REGION (320 líneas)

Contenido: la tabla `ZONAS` con las 29 filas y las 12 columnas de `GeoSignature` (arquitectura §5.1 completada con las filas que faltan, `null` en `cota` para pólder y desierto, `relieve`), con la fila del mapa 07 §3 que la sostiene. `TERRITORIOS` para los 56 países (geografía §5.2 traducida a `GeoZone`; corregir el bug AR/CL: `cono_sur` con `cordillera: null` y `puerto` de 20-30 km como `finalesAlto: 'largo'` por vuelta) y `fallback` para los 77 restantes. `RACE_REGION`: el procedimiento de curación (con `raceRoutes.ts` abierto, una tarde de contenido), los 20 ejemplos obligados (race-liege y race-fleche → ardenas, race-lombardy → italia_norte, race-jura → macizo_central, race-tramuntana → levante...), la forma por etapa para las 60 ediciones (`race-france` con `stages` 6 → pirineos, 15/18/19/20 → alpes) y el test que prohíbe caer al país. Qué es DATO (20 filas `cobbles` en zonas con adoquín, ciudades de `raceRoutes.ts`, 177 reales) y qué es JUICIO (todo lo demás), dicho con esas palabras. Los tests de consistencia interna (`geo.test.ts`: `min ≤ max`; `puerto.km[0] ≥ 9`; `cota.km[1] ≤ 8`; `muro.km[1] ≤ 3`; `adoquin ≥ 2` ⇒ `muro.adoquin` posible; `cordillera` está en `ruta` y su `relieve ∈ {montana, alta}`; toda clave de `COUNTRIES` resuelve; las 20 `cobbles`). Cómo entra: disponibilidad (`requiere`), rangos (intersección), pesos, relleno (`amplitud`), vetos V1-V4. Los nacionales por zona (`motor.md` §V.3). Viento y altitud como metadatos (decisión 17) y remite a la sección 16 (galería) para la validación por el dueño. Injertos: I-1, I-2 (ruta y cordillera), I-10, I-25, I-40 (`RACE_REGION`), I-28 (cordillera null como veto), I-36, I-38. Fuentes: `arquitectura.md` §3.5, §5; `geografia.md` §3.1-3.2, §5.1-5.4; `datos.md` §5.1-5.2, §7.5; `ingeniero.md` §5.2; mapa 07 §3 entero; mapa 02 §8 y §10; `juicios/ejecutabilidad.md` §2.2 (bug AR/CL).

### 7 · `vueltas` · Las vueltas por etapas: territorio, itinerario, papeles, km por clase (250 líneas)

Contenido: `itinerarioDe` paso a paso (ventana contigua de la ruta del territorio; si `terrain: 'mountain'` y hay cordillera, la incluye; avance con p 0,6; reina solo en meta de cordillera o zona montana/alta, si no se degrada a `media_alto` y se anota; transición 40/60). Los cuatro `TourSkeleton` (arquitectura §7.2) con sus `BlockRule` escritas como reparación determinista de atrás hacia delante. Lo que se conserva de `mixRoles` (crono según `ROUTE.itt*`, última decisiva, mínimo de selectivas, final en alto en 4+, garantía de fondo) y las dos tiradas nuevas (prólogo en `roles[0]`, cronoescalada) con la advertencia de que cualquier tirada añadida a `mixRoles` desplaza las composiciones de las 72 vueltas (juez motor §1) y se remide `smallTours`. `ARCH.pesosComposicion` (tabla de arquitectura §7.3) y la consecuencia sobre el 40 % de reinas de hoy. `kmDe` con `ARCH.km.porClase` y `maxPorClase`, `lastStageKmFactor` conservado. Papeles como identidad (decisión 20). `stageMix` conserva firma (decisión 19). Gran vuelta generada (no existe hoy; `vu_gran_vuelta` para 9-21). Injertos: I-2/I-36 (itinerario), I-14/I-45 (km por clase y papel), I-17 (`DEFAULT_ROUTE_CONTEXT` en `stageMix`). Fuentes: `arquitectura.md` §7; `geografia.md` §7; `banco.md` §7; `ingeniero.md` §7; mapa 02 §4; mapa 07 §2; `calendar.ts` l. 457-561 vía mapa 02.

### 8 · `algoritmo` · La instanciación: colocación, rendido, cuadre, garantías, pancartas y circuitos (300 líneas)

Contenido: `generateStage` en siete pasos con el subflujo de cada uno (arquitectura §4 con las decisiones de §C): identidad (`arch|raceId`), firma (`firma|raceId`), edición (`ed|raceId|season`, la temporada 0 tira dados), instanciación de motivos (`mot|…`) con la persecución del desnivel total (decisión 9) y la degradación por geografía, colocación por ventanas (`pos|…`, `place.ts`), rendido (`dib|…`, `renderSkeleton` en pseudocódigo como ingeniero §4.4 adaptado), `normalizeEnlaces` (solo enlaces, residuo al enlace más largo, V10 si no absorben), `garantizaClase` (decisión 10, con la guarda de tramos), `emitirPancartas` (decisión 25), verificación (`verify`, decisión 4 y 24) y reintento (`…|i{intento}` solo en `mot`, `pos`, `dib`; tope 8; plantilla canónica `degradado: true`; cero en el calendario). Circuitos: colocación de `vueltas × kmVuelta`, misma semilla de detalle por vuelta, pancartas por paso ≥ 1,5 km, la advertencia sobre `kmSubida` y `breakAppeal` con la banda informativa del censo. Etapa de transición (40 % con `desde`). Etapa de edición real: km como contrato, `season` solo en `dib`. El pseudocódigo del punto de entrada (como banco §4) con la lista cerrada de subflujos. Injertos: I-8 (guarda de tramos), I-17/I-43 (`climb` `gMax`, bajada canónica, `finalKindMarginKm` 0,7), I-24 (`garantizaClase`), I-27 (semillas), I-31 (pancartas corregidas), I-34 (temporada 0 con dados). Fuentes: `arquitectura.md` §4; `ingeniero.md` §4.4-4.5; `banco.md` §4, §4.5; `datos.md` §4.4-4.6; `geografia.md` §4.3-4.5; mapa 01 §1 y §5.1; mapa 03 §2.

### 9 · `vetos` · Los vetos y la plausibilidad (250 líneas)

Contenido: la tabla de V1 a V16 (decisión 24) con columna «regla», «dónde se comprueba» (esqueleto / perfil por etapa con reintento / calendario en `routeCensus` / vuelta en `tour.test.ts`), «solo lee» (para demostrar la regla de vetos puros), «caso que impide» y «test que lo dispara». V5 y V8 con párrafo propio: el caso v40 recorrido paso a paso (`ud_montana` en `alpes`: puertos 12-25 km en [0,4; 0,85], última cota 1,3-4,2 a 3-17, V5, V6, V7) y `race-jura` como en banco §9.3; y la lección de E3 como regla (V8b) con el test «`reina-150` como esqueleto no pasa» y la explicación de por qué 30 km (`climbRaceKmToGo`, mapa 03 §4.2). V12 anti-clon con el método de calibración sobre pares reales (I-12). V16 medido en el censo, con la razón (juez motor riesgo 3). Plausibilidad blanda (se imprime, no veta): distribución de puertos, posición del primero, entropía de `finalKind` por vuelta, correlación intra-esqueleto. Fallback y su contador. Injertos: I-5, I-18, I-32 (V8), I-23 (V5), I-12, I-39 (anti-clon), I-28 (V4 altitud por integración), I-24 (guarda clásica ≤ 2,9). Fuentes: `arquitectura.md` §9; `banco.md` §9; `geografia.md` §9; `ingeniero.md` §9; `datos.md` §9-§10.2; mapa 07 §4.4; `juicios/motor.md` §5 riesgo 3.

### 10 · `identidad` · La identidad entre ediciones (220 líneas)

Contenido: qué es fijo (esqueleto, zona, firma con parámetros, papeles, crono, número de etapas: decisión 20) y qué es de la edición (motivos no firma, km ± 6 % salvo edición real, vueltas ± 1, motivo opcional, dibujo). `BASE_SEASON = 0` con la cita a `calendarRun.ts` l. 135 y l. 783 (`raceKey = ${race.id}:s${season}`), la temporada 0 tirando dados (decisión 21), `ARCH.edicion.activa` y `nivel` 0/1/2 con `alternativas` (decisión 22), semillas separadas (decisión 22). `calendarForSeason`, `raceForSeason`, `stagesForSeason` memoizadas. Las etapas `real` no varían nunca; las `edicion` varían solo el dibujo (`season` en `dib`). En la base: `freezeRaceRoute(..., season)`, `race_routes` gana `kind`, `label`, `time_trial` (migración), los cuatro lectores que hoy leen `SEASON_CALENDAR` (decisión 23) y el test que sella que la edición no cambia `kind`, `timeTrial` ni `n`. En la ficha: «Edición N», `cambiosRespectoAnterior` y la frase de arquitectura (decisión 39). Test de identidad (temporadas 1-5 contra 0: mismo esqueleto, firma igual, km ± 6 %, ≥ 1 diferencia no firma en 4 de 5; correlación entre ediciones consecutivas en [0,55; 0,9] y entre carreras distintas del mismo esqueleto < 0,6). Injertos: I-11, I-41 (nivel 2), I-27 (semillas), I-29, I-34 (`BASE_SEASON`, interruptor). Fuentes: `arquitectura.md` §6; `datos.md` §6; `ingeniero.md` §6; `geografia.md` §6; `banco.md` §6; mapa 02 §7 y §11; mapa 03 §8-§9; `juicios/motor.md` §5 riesgo 1; `juicios/cobertura.md` §5 riesgo 10.

### 11 · `real` · Lo real frente a lo generado (200 líneas)

Contenido: prioridad sin cambios en `buildRace` (edición real > rasgos > generado) y qué marca cada rama (`featureSpec` → `real`; `stagesFromEdition` sin rasgos → `edicion` con esqueleto de etapa; tabla y nacionales → `generado`). `featureProfile.ts` no se toca en E1 y por qué (decisión 27), con la deuda anotada (dos rellenos: `rollingFill` con `RELIEF` para 177 etapas, `enlace` con `amplitud` para 1.241) y lo que movería unificar. Huella FNV (decisión 28): `realFingerprint.test.ts` con 177 + 3 grandes vueltas, sellada antes de tocar `calendar.ts`, comprobada después, sobrevive al paso 8; `golden.test.ts` de las 1.418 solo en el paso 1. `routeSource` de tres valores hasta `race_routes.route_source` (columna `text`, sin migración por el tipo), la API y la web (tres textos), `scripts/inventario-recorridos.mjs` leyendo `routeSource`. Kind coherente (decisión 23): `stageKindOf` con `SUMMIT_RUN_IN_KM`, `stageHistory.ts` sin regla propia, el 49 re-sellado con objetivo escrito. `stageKindOf` no se recalibra (decisión 26) y qué verá el jugador mientras tanto (una Lieja generada con puertos ≤ 4,5 km sale `media / Mountains classic` y es correcto). La doctrina de `fuentes-recorridos.md` heredada. Injertos: I-3, I-30, I-37 (huella), I-40 (`mixto` como agregado de carrera), I-44 (`kind` leído del perfil y el 49). Fuentes: `arquitectura.md` §10; `ingeniero.md` §10, §13.1.5; `datos.md` §10; `geografia.md` §10.3; mapa 02 §9; mapa 05 §6-§8; mapa 06 §3.4-3.5; `juicios/motor.md` §1 y §5 riesgo 2.

### 12 · `constantes` · Las constantes (250 líneas)

Contenido: la tabla `ARCH` entera de §B.3, con las cuatro columnas del repositorio (nombre, valor, intención, en qué se apoya con cita) y agrupada por bloque (`motivo`, `meta`, `reina`, `colocacion`, `veto`, `pancarta`, `edicion`, `km`, `pesoPorClase`, `pesosComposicion`, `bloques`, `itinerario`, `anticlon`, `arranque`). Qué se retira de `ROUTE` y qué lo sustituye (con la nota que irá a `balance.md`), qué se conserva de `ROUTE` y todo `RELIEF`. Los literales de `profileGen.ts` que migran (l. 247-248, 276-283, 358-363, 451-454, 477-478, 496) con su valor de hoy al lado. Qué NO cambia y por qué (`FINAL_KIND_CUTS`, `CLIMB_MIN_KM`, `PASS_MIN_KM`, `QUEEN_MIN_CLIMB_METRES`, `WALL_MAX_KM`, `STAGE.finish*`, `STAGE.dx`). Injertos: I-8/I-19 (`dPlusIncluyeRelleno`), I-14/I-45 (`km.porClase`), I-22 (`blandaShare`), I-43 (`gMax`, `margenValleKm` 0,7, `fallbackMaxShare`), I-35 (`meta.muro`). Fuentes: `arquitectura.md` §8; `banco.md` §8; `ingeniero.md` §8; `geografia.md` §8; `datos.md` §8; mapa 01 §3; este esqueleto §B.3.

### 13 · `banco` · El banco: invariantes, censo, calendarQueens, «mejor y no solo distinto», remedición (350 líneas)

Contenido: (a) lo que no se mueve y no debe moverse (las 15 bandas canónicas, las cuatro huellas, 6.17 sintéticos, `grandTour` 20 de 21 reales, tests de perfiles reales, `finalKind.test.ts`, `recorridoDelMundo.test.ts`: mapa 06 §5); (b) lo que se mueve a propósito y cómo se re-sella (tabla de arquitectura §11.2 completada con mapa 06 §4: `stageKind.test.ts` por esqueleto × 5 km × 60 semillas × zonas compatibles, con `ud_montana` por fin dentro; `calendar.test.ts` l. 162-174 y l. 269-277; `stageHistory.test.ts` l. 199 con objetivo; `calendarQueens.test.ts`; `smallTours`; `realQueens` con `frozenSkeletons`; saturación de las 8 más duras; `timeTrials`; Jaén y Tramuntana; `world.test.ts` y `RACE_DAY_TSS`, con la medida antes/después del reparto de `kind`); (c) `routeCensus` (interfaz de §B.2, `finishType` con `groupSize` 50 aquí y solo aquí, 0,57 s medidos) y `ROUTE_CENSUS_TARGETS`: la tabla de bandas de realismo con columna «hoy (medido)» (banco §11.2 más las de arquitectura §11.3: esqueletos distintos por clase ≥ 8/10/6/9; entropía por zona ≥ 1,5 bits; correlación mediana < 0,8 y máx < 0,9; reparto de `finalKindOf` con cada cubeta ≥ 5 % y `alto` en [0,35; 0,55]; D+ de reina por formato con la cubeta < 1.500 poblada ≥ 5 %; subida fuera de 30 km ninguna en 0 % y p10 ≥ 5 %; `muro` ≥ 1 % y `puncheur` ≥ 8 %; última cota de un día ≤ 4,2 y [3; 17] en el 98 %; p90 de .2 ≤ 170; sectores 15-30 y 40-60 km en `ud_adoquin`; identidad; nacionales con geografía; `kmSubidaShare` por esqueleto informativo) y las de variedad; (d) `calendarQueens` estratificada, `reina-175-4800`, `forma.reinaCanonica.*` (decisión 32); (e) `frozenSkeletons` y `GENERATED_QUEENS` (decisión 33); (f) el protocolo «mejor y no solo distinto» entero (decisión 30) con la tabla pareada como condición de borrado (decisión 29) y los criterios de mapa 04 §5; (g) la remedición con dueño, orden, horas y techo (decisión 34) y la regla «previsión fallida». Injertos: I-4, I-6, I-7, I-13, I-15, I-16, I-20, I-26, I-33, I-39, I-43 (`frozenSkeletons`). Fuentes: mapa 04 entero; mapa 06 §3-§5; `banco.md` §11; `arquitectura.md` §11; `ingeniero.md` §11-§12 (paso 0); `geografia.md` §11.4; `datos.md` §11.1, §11.4; `juicios/motor.md` §1 (0,57 s) y §5 riesgos 5 y 8.

### 14 · `rendimiento` · Rendimiento y arranque: la medida (120 líneas)

Contenido: lo que se sabe hoy con cifra y fuente (carga del módulo 578 ms; 46.354 segmentos, 32,7 por etapa; una pasada de `sampleProfile` + `finishType` + `stageKindOf` + `finalKindOf` sobre 1.418 etapas 569 ms, 0,40 ms por etapa; 0,92 ms para 120 segmentos: juez motor §1 con `coste-motor.mjs`; 18 cargas de test y 12 ficheros fuera del motor que importan el paquete entero). Lo que la gramática añade por etapa (≤ 12 motivos, ≤ 80 segmentos, hasta 8 intentos, sin `sampleProfile`). La decisión 35: `scripts/medir-arranque.mjs` en el paso 0 (línea base) y en el paso 8; `routes/arranque.test.ts` con objetivo 1.500 ms, techo 2.500 ms, ≤ 1.000 ms por temporada adicional; memoización de `calendarForSeason` por `Map` y de `raceForSeason` por (id, season); calendario perezoso por carrera si se supera el techo (ya decidido, no condicional); los tests que generan temporadas 1-3 pagan y se dice cuánto. Coste de simulación: perfiles con más segmentos solo encarecen `sampleProfile` (O(n·segmentos) una vez); el bucle O(bloques × corredores) no cambia. Injertos: I-20 (censo cabe en cada push), I-34 (temporadas en memoria). Fuentes: `juicios/motor.md` §1; mapa 03 §7; `arquitectura.md` §4.8; `juicios/cobertura.md` §5 riesgo 7; `juicios/ejecutabilidad.md` §5 riesgo 3.

### 15 · `plan` · El plan de implementación por pasos, tests primero (450 líneas)

Contenido: regla común (tests primero; `pnpm typecheck && pnpm test` en verde; un solo salto de versión en el paso 8; presupuesto de reloj ≥ 4× CI; `backfillRaceRoutes` antes del paso 8; nada de `Math.random`). Once pasos, cada uno con: tests primero (nombre de fichero y aserciones concretas), código, qué cambia de conducta, qué se re-sella con qué causa, coste en sesiones y riesgo. Paso 0 línea base y medida (`routeCensus` contra el calendario de hoy con las que fallan en `it.todo`, `scripts/medir-real.mjs`, `scripts/medir-arranque.mjs`, tabla en `balance.md` «v61 §0»); Paso 1 congelar y extraer primitivas (`golden.test.ts` 1.418, `realFingerprint.test.ts` 177 + 3, `profileGen.ts` reducido a primitivas con `gMax`/`amp`, `legacy.ts` con los ocho builders y tabla pareada «igual dentro del ruido»; sin versión); Paso 2 geografía (`geo.test.ts` de consistencia interna, `regions.test.ts` con `RACE_REGION` para 310 y por etapa para 60, ninguna carrera de equipos al país); Paso 3 motivos (`motifs.test.ts`: rangos, rendido, `muro_meta` → `finishType 'muro'` en 300 de 300 con ≤ 1,0 km y `puncheur` por encima, `tendida` no cuenta en `kmSubida`, circuito repite rampas; recalibrar `rellenoDplusPorKm`); Paso 4 esqueletos y colocación (`skeletons.test.ts` catálogo bien formado, cada esqueleto × 5 km × 60 semillas × zonas compatibles con V6/V7, `intentos` p95 ≤ 3, plantilla canónica pasa todo; `place.test.ts`; y la GALERÍA se genera aquí y se entrega al dueño); Paso 5 vetos (`veto.test.ts` un perfil que dispara y otro que no por veto, «una carrera de un día no muere en un puerto de 14 km» sobre 2.000 instancias, «`reina-150` como esqueleto no pasa»; `generateStage` completa); Paso 6 identidad y temporada (`edition.test.ts`; `stagesForSeason(id, 0) === SEASON_CALENDAR`); Paso 7 composición (`tour.test.ts`: garantías de `calendar.test.ts` l. 184-246 sin tocar, bloques V13/V14 sobre 120 semillas × n × 5 relieves, km por clase, `vu_corta` ≤ 1 crono, gran vuelta generada con descansos y reina en [15; 20], itinerario con BE sin reina); Paso 8 el cambio de calendario (`ENGINE_VERSION` 69 → 70; borrar `golden.test.ts`; `stageKind.test.ts` por esqueleto; `stageHistory.test.ts` re-sellado con objetivo; `calendar.test.ts` l. 108-121, 162-174, 269-277 en verde; `calendario.test.ts` entero; `arranque.test.ts`; `realFingerprint.test.ts` verde; `buildRace`, `stagesFromEdition`, `nationalChampionships` a `generateStage`; retirar los ocho `xxxSegments`, `normalize`, `garantizaPuerto`, `ROUTE.queen*`, `ROUTE.mixWeights`, `ROUTE.km*`; nota «v61 §1»); Paso 9 remedición de bancos (decisión 34 con orden, horas y techo; `frozenSkeletons`; `calendarQueens` 12 semillas; `smallTours`; saturación; cronos; Jaén; Tramuntana; todo pareado; `targets.ts` sin la «mediana de 2.023»; borrar `sim/legacy/`); Paso 10 base, API y web (migración `00NN`, `freezeRaceRoute` con `season`, lectores del congelado, API con `routeSource`/frase/edición, web con las tres marcas, `inventario-recorridos.mjs`); Paso 11 documentación (`docs/generador.md` cerrado con las tablas medidas, SPEC §6.2 una línea, `motor.md` §V.3 y §10, `stageKind.ts` comentario, `calendar.ts` l. 2 «28 carreras»). Orden de dependencias y qué pasos van en paralelo. Coste total estimado en sesiones. Injertos: I-3, I-16, I-30, I-37, I-42 (paso 0 y paso 1), I-17/I-43 (`DEFAULT_ROUTE_CONTEXT` entre pasos), I-4 (tabla pareada como condición). Fuentes: `arquitectura.md` §12; `ingeniero.md` §12 (paso 0 y paso 1); `banco.md` §12; `geografia.md` §12 (paso 7); `datos.md` §12; mapa 06 §0, §4, §5; `Claude.md` § Tests y § Código vía mapa 06 §0.

### 16 · `galeria` · La galería: que el dueño vea antes de aceptar (120 líneas)

Contenido: `scripts/galeria-recorridos.mjs`: entrada (`SEASON_CALENDAR` y `generateStage` con `fixed.skeleton`), salida (`docs/galeria-recorridos/index.html` más una página por zona y una para nacionales), qué muestra por perfil (SVG de `renderAltimetrySvg` 720×200, frase de arquitectura, `kind`/`label`, `finalKind`, D+, km, esqueleto, zona, vetos que costó, `finishType` del censo), cuántos (5 semillas por zona × esqueleto compatible; los 4 nacionales de cada uno de los 133 países; las 20 carreras `cobbles` reales al lado de su equivalente generado), cómo se lee (las tres preguntas por perfil de la decisión 41 y una casilla por fila para «no existe aquí» / «no existe en esta clase» / «no lo reconozco»), qué hace el implementador con las respuestas (editar `ZONAS`, `RACE_REGION` o `pesoPorClase`, que son datos; nunca código), cuándo se entrega (paso 4, antes del paso 8) y que se regenera en cada paso. Explicita que esto es el instrumento de validación de una tabla que es juicio (decisión 16) y que sustituye la validación externa imposible (PCS y Overpass vetados, `fuentes-recorridos.md`). Injertos: ninguno directo (resuelve el riesgo 2 de cobertura); cita I-13 (el extractor como segunda vara). Fuentes: mapa 01 §7 (`altimetry.ts`); `juicios/cobertura.md` §5 riesgo 2; `juicios/ejecutabilidad.md` §5 riesgo 1; mapa 05 §6.

### 17 · `riesgos` · Riesgos y lo que queda fuera (180 líneas)

Contenido: lista numerada con mitigación o sacrificio consciente: (1) viento, altitud, costa y meseta no llegan al motor (qué entrega E1: relieve y firme; qué queda para el motor: `windMin` por zona, altitud en `Segment`, exposición por tramo; cita mapa 03 §5 y `motor.md` §19.5); (2) la tabla geográfica es juicio (galería y tests de consistencia; corrección por datos); (3) `stageKindOf` no recalibrado (D2, dos criterios según origen hasta entonces); (4) circuitos y `kmSubida` (banda informativa y saturación); (5) muro en meta exige precisión de bloque (test 300 de 300 en el paso 3 con `finishType`; si falla, se ajusta `aproxKm`); (6) el hueco [8,0; 9,0] km; (7) `featureProfile.ts` con otro relleno (paso propio posterior); (8) más varianza en los bancos (listas cerradas conservan nombre y no forma; `fixed.skeleton` para bancos; `frozenSkeletons`); (9) reintentos en esqueletos de borde (estrechar rangos antes que subir `maxIntentos`); (10) la cola baja de reinas (`et_reina_blanda` la sostiene; si aun así se despuebla, D6); (11) `world.test.ts` y `RACE_DAY_TSS` con otro reparto de `kind` (medido en el paso 8 antes de mover); (12) coste de arranque (medido, techo, perezoso); (13) remedición cara (presupuesto y techo de la decisión 34); (14) `RACE_REGION` con errores de contenido (test de existencia, galería, corrección como dato); (15) lo que E1 NO hace: no carga dato real (E12), no crea el Mundial ni grandes vueltas generadas (E12), no toca el motor, no reescribe SPEC §6.17 (banda 25-45 sobre `reina-150` es decisión del dueño), no unifica `featureProfile`. Injertos: ninguno directo; cita las decisiones 4, 16, 17, 25, 26, 27, 35. Fuentes: `arquitectura.md` §13; `banco.md` §13; `geografia.md` §13; `ingeniero.md` §13; `datos.md` §13; los tres §5 de riesgos de los juicios.

### 18 · `dueno` · Decisiones que son del dueño (120 líneas)

Contenido: las diez de §C.2 (D1 a D10), cada una con: qué se decide, qué cambia según la respuesta (con cifras: 532 etapas de nacionales, 142 carreras de un día, 3 de 5 cronos del banco, 2 de depósito por meta volante), la recomendación y el valor por defecto que se implementa si no contesta. Remite a la sección 13 para D6 (con la cifra de la remedición delante) y a la 16 para lo que la galería le pide (revisar `ZONAS` y `RACE_REGION` una tarde). Injertos: I-41 (D2 con la cifra 27 de 113), I-11 (D7 nivel 2). Fuentes: `arquitectura.md` §14; `banco.md` §14; `geografia.md` §14; `ingeniero.md` §14; `datos.md` §14; `juicios/ejecutabilidad.md` §6.

### 19 · `apendices` · Apéndice A: los 45 injertos y dónde cayeron · Apéndice B: objeciones de los jueces y respuesta (260 líneas)

Contenido: A: la tabla de §E.1 tal cual (45 filas: número, de qué propuesta, idea abreviada, sección del documento donde cayó, cómo se absorbió, y si se absorbió entera o con qué cambio; por ejemplo, I-40 «`mixto`» se absorbe como agregado de carrera y no como valor de etapa; I-45 sustituye el factor de I-14 por la tabla). B: los 27 riesgos de los tres jueces (10 + 8 + 9) y las objeciones concretas a la ganadora (temporada 0 sin dados, hueco 8,0-9,0, ningún `MetaKind` entre 1,0 y 3,0 km, pesos base sin escribir, `normalizeEnlaces` como mecanismo nuevo, sorteo de zona en FR/IT/ES, `finishType` por intento, edición que cambia papeles, `Weighted`/`BlockRule` sin definir, el 210 conservado en temporada 0, la lección de `reina-150` solo como banda), cada una con la sección que la resuelve y en una línea cómo, o con «se acepta y se documenta» donde es un sacrificio (el hueco de 8,0-9,0). Cierra con la tabla de §E.2. Injertos: los 45. Fuentes: `juicios/veredicto.json` entero; `juicios/cobertura.md` §3-§5; `juicios/motor.md` §2.1, §4, §5; `juicios/ejecutabilidad.md` §2.1, §4, §5, §6; este esqueleto §E.

---

## E. Trazabilidad

### E.1 Injerto → sección (los 45 de `veredicto.json`, en el orden del fichero)

| I    | Juez           | De           | Idea (abreviada)                                                                                                    | Sección      | Cómo                                                              |
| ---- | -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| I-1  | cobertura      | geografia    | `PaisajeSpec` con `null` = no existe; `Territorio` con `cordillera`                                                 | 3, 6         | `GeoSignature.puerto/cota/muro` nullable; `Territorio.cordillera` |
| I-2  | cobertura      | geografia    | itinerario como ventana contigua; reina solo en cordillera; transición                                              | 7            | `itinerarioDe`, `ARCH.itinerario`                                 |
| I-3  | cobertura      | geografia    | huella FNV de 177 + 3 GV antes de tocar `calendar.ts`                                                               | 11, 15       | `realFingerprint.test.ts` (paso 1, comprobado en el 8)            |
| I-4  | cobertura      | geografia    | tabla pareada como condición para borrar el viejo, copiado a `sim/legacy/`                                          | 13, 15       | decisión 29 (paso 9)                                              |
| I-5  | cobertura      | banco        | V8 por etapa (0,25 fuera de 30 km) y test «`reina-150` no pasa»                                                     | 9            | V8b, decisión 6                                                   |
| I-6  | cobertura      | banco        | `routeCensus` estratificado con `finishType`; bandas con «hoy»; pre-registro; 4 condiciones                         | 13           | decisiones 30 y 31                                                |
| I-7  | cobertura      | banco        | `calendarQueens` estratificada; `reina-175-4800`; `mountain.*` renombrada                                           | 13           | decisión 32                                                       |
| I-8  | cobertura      | banco        | `queenDplusIncludesFill` y guarda `segment.km === Σ tramos`                                                         | 8, 12        | decisiones 9 y 10                                                 |
| I-9  | cobertura      | banco        | etapas de edición reciben esqueletos DE ETAPA                                                                       | 5, 1         | tabla `EditionTerrain → et_*`                                     |
| I-10 | cobertura      | datos        | `RACE_REGION` curada (310 + por etapa en 60) y test                                                                 | 6            | decisión 14                                                       |
| I-11 | cobertura      | datos        | `EDITION.level` 2: rotación declarada                                                                               | 10, 5        | `ARCH.edicion.nivel`, `Skeleton.alternativas`                     |
| I-12 | cobertura      | datos        | anti-clon calibrado en pares reales                                                                                 | 9            | V12 con `ARCH.anticlon.maxCorrelacion` calibrado en el paso 9     |
| I-13 | cobertura      | datos        | extractor como instrumento de medida, no fuente                                                                     | 13, 16       | `scripts/medir-real.mjs` alimenta `ROUTE_CENSUS_TARGETS`          |
| I-14 | cobertura      | datos        | `kmByClass` con «un día»; desaparece el 210 fijo                                                                    | 7, 12        | `ARCH.km.porClase` (tabla, decisión 36)                           |
| I-15 | cobertura      | ingeniero    | `frozenSkeletons`                                                                                                   | 13           | decisión 33                                                       |
| I-16 | cobertura      | ingeniero    | paso 0 de línea base con `it.todo` y builders legado pareados                                                       | 15           | pasos 0 y 1                                                       |
| I-17 | cobertura      | ingeniero    | `climb` con `gMax`; `DEFAULT_ROUTE_CONTEXT`                                                                         | 4, 7, 8      | decisiones 11 y 19                                                |
| I-18 | motor          | banco        | V8 duro en contrato y `verify` + test `reina-150`                                                                   | 9            | = I-5                                                             |
| I-19 | motor          | banco        | `queenDplusIncludesFill` con `desnivelDe` o estimación de relleno                                                   | 8, 12        | decisión 9: estimación 5,5 m/km + `dPlusDe`                       |
| I-20 | motor          | banco        | protocolo «mejor y no solo distinto» + censo en `test:rapido`                                                       | 13, 2        | decisiones 30 y 31                                                |
| I-21 | motor          | arquitectura | meta contra `deriveFinishTerrain` (aprox 2 km a amp ≤ 2,5)                                                          | 4            | `ARCH.meta.muro.aproxKm/aproxAmp`                                 |
| I-22 | motor          | arquitectura | `et_reina_blanda` con peso propio                                                                                   | 5, 12        | decisión 8                                                        |
| I-23 | motor          | arquitectura | V5 con 4,2 km a 3-17 y muro ≤ 2,1                                                                                   | 9, 5         | decisión 5 (muro ≤ 2,2 por I-35)                                  |
| I-24 | motor          | datos        | `garantizaClase` + guarda clásica ≤ 2,9 + recorte de valle                                                          | 8, 9         | decisión 10                                                       |
| I-25 | motor          | datos        | región por etapa para las ediciones                                                                                 | 6, 3         | `RaceRegion.stages`                                               |
| I-26 | motor          | datos        | `medir-real.mjs` como referencia p10/p50/p90                                                                        | 13, 1        | = I-13                                                            |
| I-27 | motor          | datos        | semilla de edición separada de identidad; `${from}                                                                  | ${to}        | ${km}`con`raceId`                                                 | 10, 8 | `StageRequest.editionKey`, decisión 22 |
| I-28 | motor          | geografia    | `cordillera: null` como veto sellado; V4 altitud por integración                                                    | 6, 9         | decisión 13; V4                                                   |
| I-29 | motor          | geografia    | `BASE_SEASON` cuadrado con `calendarRun.ts` l. 135; `edicion.activa`                                                | 10           | decisión 21                                                       |
| I-30 | motor          | geografia    | huella FNV (177 + 3) y golden de 1.418 en el paso sin cambio                                                        | 11, 15       | decisión 28                                                       |
| I-31 | motor          | geografia    | pancarta `cima` ≥ 1,5 km, corregida para muro de meta                                                               | 8            | decisión 25                                                       |
| I-32 | ejecutabilidad | banco        | V8 duro y test `reina-150`                                                                                          | 9            | = I-5                                                             |
| I-33 | ejecutabilidad | banco        | `routeCensus` + línea base + pre-registro + 4 condiciones + doble lectura                                           | 13           | = I-6, I-20                                                       |
| I-34 | ejecutabilidad | banco        | `SEASON_CALENDAR = calendarFor(BASE_SEASON)` tirando dados; estratificada; `reina-175-4800`; renombrar              | 10, 13       | decisiones 21 y 32                                                |
| I-35 | ejecutabilidad | datos        | `muro_meta` 0,5-2,2 km al 8-16 %, `puncheur` por encima de 1,0                                                      | 4, 12        | decisión 7                                                        |
| I-36 | ejecutabilidad | geografia    | territorio como ruta con cordillera; itinerario; transición 40/60                                                   | 6, 7         | = I-2                                                             |
| I-37 | ejecutabilidad | geografia    | huella FNV; fallback 0 en equipos; lista de `generico`                                                              | 11, 6        | decisiones 28 y 13                                                |
| I-38 | ejecutabilidad | geografia    | `null`; `admite`/`degradar` hacia abajo; pólder 0,4-0,9; `fillMaxGradient` 2,4                                      | 6, 4         | decisión 12; `enlace.ampMax`                                      |
| I-39 | ejecutabilidad | datos        | extractor y tabla real como referencia; anti-clon calibrado                                                         | 13, 9        | = I-12, I-13                                                      |
| I-40 | ejecutabilidad | datos        | `RACE_REGION` curada en vez de sorteo; `source: 'mixto'`                                                            | 6, 11        | decisión 14; `mixto` como agregado de carrera                     |
| I-41 | ejecutabilidad | datos        | `EDITION.level` 2; D2 con la cifra 27 de 113                                                                        | 10, 18       | decisiones 22 y 26; D2                                            |
| I-42 | ejecutabilidad | ingeniero    | paso previo con la arquitectura de hoy (legacy builders, tabla pareada)                                             | 15           | paso 1                                                            |
| I-43 | ejecutabilidad | ingeniero    | `gMax` 16; bajada canónica; `finalKindMarginKm` 0,7; `fallbackMaxShare`; `DEFAULT_ROUTE_CONTEXT`; `frozenSkeletons` | 4, 8, 12, 13 | decisiones 10, 11, 19, 33                                         |
| I-44 | ejecutabilidad | ingeniero    | `kind = stageKindOf(profile).kind` con objetivo de que el 49 baje                                                   | 11           | decisión 23                                                       |
| I-45 | ejecutabilidad | banco        | `kmByClass` por clase Y papel como tabla; `stageMaxKm`; «cifras UCI a confirmar»                                    | 7, 12        | decisión 36; `ARCH.km.maxPorClase`; D9                            |

### E.2 Riesgo de los jueces → sección que lo resuelve

| Juez · riesgo    | Resumen                                                                  | Sección   | Resolución                                                               |
| ---------------- | ------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------ |
| cobertura 1      | tabla geográfica es juicio sin validación                                | 6, 16     | dato/juicio explícito; galería; tests de consistencia                    |
| cobertura 2      | ningún instrumento para que el dueño vea                                 | 16        | `scripts/galeria-recorridos.mjs` en el paso 4                            |
| cobertura 3      | viento, altitud, costa, meseta no llegan al motor                        | 17, 6     | decisión 17: metadatos y texto de ficha que no promete                   |
| cobertura 4      | la cola baja y `calendarQueens.test.ts` deciden por el diseño            | 5, 13, 18 | `et_reina_blanda` con peso; censo mide por clase ANTES (paso 0/8); D6    |
| cobertura 5      | `stageKindOf` calibrado contra el viejo (27 de 113)                      | 11, 18    | decisión 26; D2                                                          |
| cobertura 6      | circuitos inflan pancartas y puntos                                      | 8         | decisión 25                                                              |
| cobertura 7      | coste de arranque no medido                                              | 14        | decisión 35                                                              |
| cobertura 8      | remedición sin dueño ni horas                                            | 13        | decisión 34                                                              |
| cobertura 9      | `featureProfile.ts` no se unifica                                        | 11, 17    | decisión 27                                                              |
| cobertura 10     | la interfaz no anuncia la edición                                        | 10, 11    | decisión 39 («Edición N», `cambiosRespectoAnterior`)                     |
| motor 1          | lectores de `SEASON_CALENDAR` fuera de `race_routes`                     | 10, 11    | decisión 23 y 20                                                         |
| motor 2          | dos reglas de etiqueta y la cifra 49                                     | 11        | `SUMMIT_RUN_IN_KM` en `stageKindOf`; decisión 23                         |
| motor 3          | acoplamiento inverso generador → motor                                   | 2, 9      | decisión 4; V16 solo en censo                                            |
| motor 4          | pancartas de `auto()` sobre muros; `kmSubida`                            | 8         | decisión 25; banda informativa                                           |
| motor 5          | remedición no presupuestada; muestra de `calendarQueens` cambia          | 13        | decisión 34; pareado sobre `frozenSkeletons` y estratificación           |
| motor 6          | arranque y temporadas en memoria                                         | 14        | decisión 35                                                              |
| motor 7          | tablas geográficas sin validación externa                                | 6, 16     | = cobertura 1                                                            |
| motor 8          | congelar literales = museo; por brief = pierde comparabilidad            | 13        | decisión 33 (`Skeleton` literal, renderizador nuevo)                     |
| ejecutabilidad 1 | tabla geográfica juicio sin fuente                                       | 6, 16     | = cobertura 1                                                            |
| ejecutabilidad 2 | viento y altitud fingidos en el relato                                   | 17, 11    | decisión 17: la ficha dice «llano abierto»                               |
| ejecutabilidad 3 | coste de arranque y temporadas memoizadas                                | 14        | decisión 35                                                              |
| ejecutabilidad 4 | circuitos repetidos y el motor sin noción de vuelta; nacionales de golpe | 8, 13     | decisión 25; saturación remedida con los `nc-*-road`                     |
| ejecutabilidad 5 | 226 etapas de edición con paisaje arbitrario                             | 6         | `RACE_REGION.stages` curada; test                                        |
| ejecutabilidad 6 | `stageKindOf` con dos criterios según origen                             | 11, 18    | decisión 26; D2                                                          |
| ejecutabilidad 7 | muro en meta exige precisión de bloque                                   | 4, 15     | `aproxKm`/`aproxAmp`; test 300 de 300 en el paso 3                       |
| ejecutabilidad 8 | remedición sin dueño ni presupuesto                                      | 13        | decisión 34                                                              |
| ejecutabilidad 9 | `world.test.ts` y `RACE_DAY_TSS` con otro reparto de `kind`              | 13        | medida antes/después en el paso 8, fila propia de la tabla de re-sellado |

### E.3 Obligación del encargo de síntesis → sección

| Obligación                                            | Sección    | Decisión       |
| ----------------------------------------------------- | ---------- | -------------- |
| 1 gramática + 45 injertos + tabla                     | todas; 19  | §E.1           |
| 2 galería + consistencia + dato/juicio                | 16, 6      | 16, 41         |
| 3 viento, altitud, costa, meseta                      | 17, 6      | 17             |
| 4 medida de arranque con objetivo y techo             | 14         | 35             |
| 5 `stageKindOf`                                       | 11, 18     | 26             |
| 6 pancartas, `kmSubida`, `breakAppeal`                | 8          | 25             |
| 7 remedición con dueño, orden, horas; las tres reinas | 13         | 33, 34         |
| 8 `RACE_REGION` por carrera y etapa + test            | 6          | 14             |
| 9 identidad: semillas, nivel, interfaz                | 10         | 20, 21, 22, 39 |
| 10 lectores de `SEASON_CALENDAR` y `kind` coherente   | 10, 11     | 23             |
| 11 `featureProfile.ts`                                | 11         | 27             |
| 12 huella FNV y tabla pareada como condición          | 11, 15, 13 | 28, 29         |
