# Propuesta E2 · El modelo de estado

Ángulo de esta propuesta: la retransmisión como **un valor que evoluciona**. Una etapa corrida se guarda como una línea temporal completa y autocomprobada (catálogo, fotos clave, sucesos de estado, muestras de reloj, sucesos narrables fechados cuando se supieron y la capa de detalle de la radio), un reductor puro la hace avanzar, y todo lo que ve el jugador (la barra de la tele, el perfil con cursores, los rótulos, el journal en vivo, la radio del dueño, las noticias) es una proyección de ese valor pasada por `render(idioma, semilla, datos)`. El destripe se resuelve en el mismo sitio: el servidor corta la línea por el horizonte de cada jugador.

Leído para escribir esto, además de los siete mapas enteros: `packages/engine/src/sim/raceRadio.ts` (entero), `stage/group.ts` (entero), `stage/types.ts` l. 1-120 y 160-607, `stage/events.ts` l. 1-60, `stage/citas.ts` l. 1-70 y 245-264, `stage/simulate.ts` l. 1920-1955, 3040-3135, 4095-4125, 7905-7945, 8150-8170, 8540-8562, 8800-8820 y 8955-9030, `stage/timetrial.ts` l. 225-348, `world/news.ts` l. 1-60; `packages/db/src/stageRun.ts` l. 505-600, `news.ts` l. 20-50, `schema.ts` l. 587-612, 735-760 y 785-812; `packages/shared/src/jerseys.ts` (entero) y `contracts.ts` l. 1340-1480; `SPEC.md` l. 588-630; `docs/tactica.md` l. 244-252 y 7584-7612; `docs/agenda.md` l. 505-526 y 736-739; las citas del dueño de `docs/balance.md` que se usan, comprobadas en su línea.

**Medidas propias** (scripts en `scratchpad/e2p-estado/`, sin tocar el repositorio): el motor v89 del `dist` del repositorio, el campo del banco de `scratchpad/medir-etapa.mjs` (mapa 07: 22 equipos × 8, nombres reales, órdenes de `autoStageOrders`), la sonda pedida en **cada bloque de 100 m**, y cinco etapas con tres semillas cada una: `race-france` e7 (llana, 175 km), e13 (media, 206 km), e18 (reina, 185 km), `race-flanders` e1 (clásica, 278 km) y `race-colombia` e5 (reina, 232 km, 126 corredores); para la crono, `race-france` e1 (20 km, dorsales) y e16 (26 km, general inventada y dorsales) sobre una copia parcheada de `timetrial.js` que devuelve la traza. Tamaño en disco con PGlite 0.5.4 (PostgreSQL 18.3, TOAST `pglz`), como el mapa 04. «Medido» en este documento quiere decir con esos scripts; «estimado», que es una cuenta.

---

## 0. Resumen

1. **El estado es un tipo cerrado y la línea temporal es su historia.** `LineaTemporal` = catálogo de grupos + fotos clave cada 10 km + sucesos de estado
   bloque a bloque (`mueve`, `sale`, `titulo`, `percance`, `reloj`) + sucesos narrables con su bloque de emisión + capa de detalle (quién tira, motivo,
   destinatario, velocidad). La graba `packages/db` al correr la etapa pidiendo la foto del motor en **cada bloque**. Medido: la carrera sale idéntica en
   15 de 15 corridas (huella `puesto:id:tiempo` y sucesos iguales con y sin sonda) y la simulación cuesta entre un 4 % y un 27 % más (mediana, un 10 %) en
   una máquina compartida con otros agentes.
2. **Un reductor puro reproduce la foto del motor.** `reducir(foto, suceso) → foto` desde la foto clave más cercana da, en cada km, la misma partición,
   el mismo orden de carretera, los mismos huecos, el mismo tipo de grupo y el mismo pelotón que `radioKmFrom` sobre la foto del motor: **0 discrepancias
   en 3.246 fotos de km** (15 corridas). Es el invariante I1; va como test y como autocomprobación al grabar, y una línea que no lo cumple no se guarda.
3. **La tele enseña un instante, el motor guarda puntos.** El motor avanza por distancia y cada grupo lleva su reloj (mapa 01 §0). Aquí el espacio es
   canónico y el instante es una proyección: `instanteEn(T)` pone cada grupo donde está según su reloj, con la composición canónica de ese punto (un
   corte diagonal). Coincide con la foto en los puntos de medida (invariante I2) y deja «en tránsito» entre dos grupos a 0-2 corredores en el 90 % de los
   instantes (medido): es la tierra de nadie de la televisión, no un error.
4. **El reloj absoluto se graba, no se inventa.** Muestras del reloj de cada grupo en cada km, en su nacimiento y muerte, en cada cambio de su
   composición y en cada bloque del último km. Error de la posición interpolada: p99 de 3 a 196 m según el terreno, máximo 422 m (medido), menos de dos
   píxeles en la altimetría de 720 px.
5. **Identidad no es nombre.** La identidad es el id del motor (nace por origen y no caduca, `stage/group.ts` l. 164-193) más una regla de sucesor (la
   mayoría de sus corredores) para las fusiones; el nombre de pantalla (`cabeza`, `caza`, `grueso`, `grupeto`, «grupo del maillot») se deriva del estado
   con histéresis y es el mismo en la barra, la radio y el journal.
6. **Bytes.** La línea entera ocupa 24-104 KB de JSON por etapa en línea (gzip 4-30 KB) y **5,5-39 KB en disco** como columna `json`, contra 132-546 KB
   de JSON y 12,6-122 KB en disco de la radio de hoy (medido en las mismas etapas). Y sitúa al **100 % de los corredores en cada bloque**, contra el
   18-33 % por km que nombra la radio de hoy (mapa 01 §2.3). Objetivo: ≤ 128 KB de JSON y ≤ 48 KB en disco por etapa; la crono, 15-20 KB (medido).
7. **Sin destripe como propiedad del servidor.** La línea se entrega en tramos de 10 km (las fotos clave son la unidad de entrega) más un tramo de meta;
   lo entregado es el horizonte del jugador. Toda ruta de la API pasa por un único módulo de horizonte, y un test canario recorre las rutas registradas
   en Fastify y falla si una no está clasificada.
8. **Ni una palabra en el dato.** La línea no guarda texto; las noticias ganan `seed`, `data`, `race_key` y `stage_day`; la semilla de variante es neutra
   de idioma. Lo que E10 hereda es un `render(idioma, …)` por superficie.
9. **Lo que deja fuera**: el dibujo de los maillots de campeón y de equipo (E3; aquí se define la interfaz y un marcador provisional), el sistema de
   avisos (E4; aquí la plantilla sin destripe y su test), los títulos persistidos (E12; aquí se derivan del palmarés), los menús (E6).

**En qué se distingue de lo obvio.** Lo obvio es reproducir la radio de hoy kilómetro a kilómetro y filtrar la crónica por km. No funciona por cinco
motivos medidos: la radio guardada no tiene reloj ni identidad de grupo y nombra a menos de un tercio del pelotón (mapa 01 §2.3); el segundo de un
suceso tiene tres significados distintos según la plantilla (§1, punto 3); la crónica ve el futuro (mapa 07 §5.2); y la lista de
seguimiento mete en la radio a los diez primeros de la etapa desde el km 0 (mapa 07 §5.2.1). Aquí el estado es completo y se demuestra igual a la foto
del motor; la pantalla, la radio y el relato son vistas del mismo valor.

---

## 1. Diagnóstico

1. **No hay estado guardado completo.** La radio guarda una fila por km sin el reloj del grupo, sin su id y con los corredores de los grupos grandes reducidos a los que tiran y a la lista de seguimiento (mapa 01 §2.3; `raceRadio.ts` l. 776-963). Medido por el mapa 01: fuera del pelotón, en reina, solo se nombra el 47-64 %.
2. **No hay instante.** Todos los grupos cruzan el mismo bloque a la vez con relojes distintos (`group.ts` l. 82-119; mapa 01 §0, hecho 1). Lo que la tele enseña (dónde está cada grupo AHORA) no existe en ninguna parte (mapa 06 §1.5).
3. **El segundo de un suceso no significa lo mismo en todas las plantillas.** Medido aquí, comparando el `tS` de cada suceso con el reloj del grupo de su primer protagonista en el bloque en que está fechado (15 corridas, 1.815 sucesos):

   | Qué reloj lleva `tS` | Plantillas (sucesos) |
   | --- | --- |
   | El de la foto, al **final** del bloque | `attack_sticks` (68/68), `attack_reeled` (135/203), `climb_kom` (83/84), `move_merge`, `group_overtake`, `move_caught`, `bridge_made`, `bridge_failed` (30/31), `chase_work` (16/19), `sprint_intermediate`, `breakaway_caught` (6/7), `stage_win`, `time_cut` |
   | El de la **entrada** del bloque (un bloque antes) | `rider_sits_up` (203/203), `no_help_for_leader` (197/197), `time_gap` (147/147), `rider_bonks` (145/145), `peloton_pull` (58/59), `front_group` (56/57), `peloton_split` (24/25), `attack_swarm`, `break_share`, `peloton_selection`, `sprinters_chase` (8/9) |
   | **Ninguno** de los dos | `attack_go` (291/292, mediana −8 s), `breakaway_formed` y `break_cooperation` (15/15, fecha de nacimiento), `peloton_concedes` (10/10, +199 s), `peloton_regroup` (8/10), `bunch_sprint` (8/8, +68 s) y `final_km` (7/7, +221 s) con el reloj de llegada, `puncture` (24/37) y `mechanical` (5/6) |

   Cuadra con las siete fechas trucadas del mapa 01 §1.2 y añade una octava: 867 de los 1.815 sucesos (el 48 %) llevan el reloj de un bloque antes que la foto. Un reproductor que suelte los sucesos por `tS` y pinte el estado por foto enseña cosas antes de que pasen.
4. **La crónica mira el futuro.** Concesión «cazada», criba que se borra si se deshace, rachas y racimos cosidos con km posteriores (mapa 07 §5.2.2; mapa 05 §6.3; `stageJournal.ts` l. 1085-1120 según el mapa 03 §2.3).
5. **Todo sale en una respuesta**: resultado, clasificaciones de después, crónica, radio y altimetría con marcas, 0,95-2,16 MB por etapa sin comprimir (mapa 02 §4 y §7).
6. **La radio guardada destripa**: la lista de seguimiento incluye a los diez primeros de la etapa recién corrida (`stageRun.ts` l. 558-568; mapa 07 §5.2.1).
7. **Las noticias se guardan redactadas** (`news.ts` l. 40-48 de `packages/db`; mapa 02 §3) y no saben de qué etapa son.
8. **Nadie sabe qué ha visto nadie**: ni tabla, ni columna, ni almacenamiento del navegador (mapa 04 §3; mapa 03 §5).
9. **El destripe está en 48 superficies** (mapa 03 §4), incluida la portada, que re-simula (mapa 02 §0).
10. **Maillots: tres de cinco** (mapa 03 §6): no hay campeón ni maillot de equipo en el relato.
11. **El pelotón del motor caduca dentro del kilómetro.** Medido aquí: el motor recalcula `mainId` una vez por km en el bloque de decisión (`simulate.ts` l. 4095-4115) y en los bloques siguientes puede apuntar a un grupo ya vaciado; entonces `radioKmFrom` lo recalcula (`raceRadio.ts` l. 317-320). Un estado que copie el `mainId` de la foto sin esa regla discrepa de la radio: medido, en 8 a 27 de las 233 fotos de km de `race-colombia` e5, y en 69 de 3.246 en las cinco etapas.

---

## 2. Principios

1. **El estado es la verdad; todo lo demás es proyección.** Consecuencia: la barra de la tele, la radio del dueño, el journal en vivo, el perfil con cursores y el correo salen de la misma línea. Es la regla del dueño llevada al diseño: «Un solo concepto, con el mismo nombre, en el motor y en la Race Radio» (`docs/balance.md` l. 6740-6741, v34).
2. **Se graba al correr, completo, y se autocomprueba.** Consecuencia: el grabador verifica el invariante I1 en cada foto de km antes de escribir; si falla, no escribe la línea y lo registra. «Una crónica que miente es peor que una muda» (balance l. 13274, v60 §20, citado por el mapa 05 §10).
3. **El espacio es canónico; el tiempo es una proyección.** Consecuencia: el reductor opera por bloques y es exacto; el instante de la tele se define encima con reglas explícitas para lo que no es exacto (los corredores entre dos grupos).
4. **Un suceso se enseña cuando se sabe, no cuando pasó.** Es lo que hace la tele (mapa 06 §3.1). Consecuencia: cada suceso narrable lleva su bloque de emisión; la fecha del hecho (`km`, `tS`) sigue en el suceso para el texto.
5. **El ritmo solo depende del recorrido y del pasado.** Si la reproducción frena antes de un ataque, el frenazo lo anuncia. Consecuencia: la velocidad se fija por tramo del recorrido y los frenazos reaccionan a lo ya enseñado; la barra de progreso va en km, nunca en minutos restantes (mapa 06 §7.2, regla 3).
6. **El servidor no entrega lo que el jugador no ha alcanzado.** Consecuencia: tramos, horizonte por jugador y un único módulo que filtra todas las rutas, con test canario.
7. **Ni una palabra en el dato.** Consecuencia: códigos cerrados, ids y números en la línea, en los sucesos y en las noticias; la semilla de variante no lleva nombres ni conjunciones (mapa 07 §3).
8. **Observación, no conducta.** Consecuencia: lo que E2 pide al motor es sonda (no sube `ENGINE_VERSION` y se prueba con la huella), salvo el orden completo de volantes y cimas, que cambia sucesos y sube a la v90.
9. **El microscopio del dueño no pierde detalle.** La radio es con lo que caza defectos (mapa 05 §2.8). Consecuencia: la capa de detalle conserva quién tira, motivo, destinatario, velocidad y percance por km, y `raceLearning` sigue leyendo `pullFor` a la misma cadencia de un km (`stageRun.ts` l. 527-532 y 802).

---

## 3. El estado de la retransmisión

### 3.1 Tres relojes y un eje

- **El bloque** `b` es el eje del motor: 100 m, `km = (b + 0,5) · dx` (`simulate.ts` l. 1929). En un bloque, todos los grupos están en el mismo punto.
- **El reloj de un grupo** `r_g(b)` es el tiempo de carrera con que el grupo cruza el bloque `b`: el mínimo de los relojes de sus corredores, que es la cuenta de la radio (`raceRadio.ts` l. 284-300). El hueco entre dos grupos es `r_h(b) − r_g(b)`, exacto, y es el que mide la tele (mapa 06 §1.4).
- **El reloj de carrera** `L(b) = min_g r_g(b)` es cuándo pasa la cabeza por `b`. Medido: monótono salvo en 0-2 bloques por etapa (las vueltas al grupo que perdonan un hueco, `simulate.ts` l. 7844 y 7903-7912); se fuerza con un máximo acumulado. La hora del reproductor `T` corre sobre `L`: la cabeza está en `L⁻¹(T)` y cada grupo en `r_g⁻¹(T)`.

La **foto** es el estado en un bloque (un punto): lo que guarda el motor y lo que enseña la radio, que el dueño definió así: «es que la foto de la radio no es un instante, es 1 km entero» (balance l. 16714, nota de radio posterior a la v86). El **instante** es el estado en una hora `T`: lo que enseña la tele. La línea temporal guarda fotos (en forma de sucesos) y el instante se calcula. Formalmente, la línea temporal es la secuencia de instantes `I_b = instanteEn(L(b))`, uno por bloque de cabeza (1.750 a 2.782 por etapa en las medidas); se guarda por su diferencia (los sucesos de estado) y por puntos de control (las fotos clave), y cualquier `I_b`, o cualquier `T` entre dos, se recalcula.

### 3.2 Los tipos

Viven en `packages/engine/src/broadcast/` (nuevo, puro, sin dependencias fuera del motor): la web ya importa el motor en producción (mapa 07 §2), así que el reductor y las proyecciones son el mismo código en el grabador, en la API y en el navegador.

```ts
// packages/engine/src/broadcast/types.ts
import type { JerseyKind } from '@cyclingstar/shared'
import type { PullMotive } from '../stage/types.js'

/** Posición del corredor en `StageInput.riders` (el orden con que entra al motor). */
export type CorredorIx = number
/** Posición del grupo en `LineaTemporal.grupos`, por orden de aparición en la etapa. */
export type GrupoIx = number
/** Bloque de 100 m del motor. */
export type Bloque = number
/** Décimas de segundo desde la salida real. */
export type RelojDs = number

/** Cómo nació un grupo: se lee del prefijo del id del motor (`group.ts` l. 167-170). */
export type OrigenGrupo = 'salida' | 'ataque' | 'descuelgue'
export type TipoPercance = 'caida' | 'pinchazo' | 'averia' // `Incident.tipo`, types.ts l. 358-365

export interface GrupoDelCatalogo {
  readonly id: string // 'peloton', 'mov-3', 'shed-7': el del motor, tal cual
  readonly origen: OrigenGrupo
  readonly nace: Bloque
  /** Último bloque con gente; null si llega a meta. */
  readonly muere: Bloque | null
  /** Adonde fue la mayoría de los suyos al morir (§3.5); null si llega a meta o abandonan todos. */
  readonly sucesor: GrupoIx | null
}

/** LO ÚNICO QUE CAMBIA LA FOTO. Unión cerrada: el reductor tiene un `case` por variante. */
export type SucesoDeEstado =
  | { readonly t: 'mueve'; readonly b: Bloque; readonly de: GrupoIx; readonly a: GrupoIx; readonly corredores: readonly CorredorIx[] }
  | { readonly t: 'sale'; readonly b: Bloque; readonly corredor: CorredorIx }
  | { readonly t: 'titulo'; readonly b: Bloque; readonly grupo: GrupoIx | null }
  | { readonly t: 'percance'; readonly b: Bloque; readonly corredor: CorredorIx; readonly tipo: TipoPercance; readonly perdidaDs: number }
  | { readonly t: 'reloj'; readonly b: Bloque; readonly marcas: readonly (readonly [GrupoIx, RelojDs])[] }

/** Un suceso del motor (`RaceEvent`, sin tocar) con el momento en que se SUPO. */
export interface SucesoNarrable {
  /** Posición en `stage_snapshots.events`: el suceso viaja tal cual, con su `km` y su `tS` del hecho. */
  readonly i: number
  /** Bloque en que el motor lo emitió (sonda `onEvent`, §11); `bloques` si se emitió tras la meta. */
  readonly bEmision: Bloque
  /** Reloj del grupo de su primer protagonista (o de la cabeza) al final de `bEmision`. */
  readonly tEmision: RelojDs
}

/** Quién tira en un grupo y por qué: lo que hoy guarda la radio (`raceRadio.ts` l. 497-572), sin `watching`. */
export interface Relevista {
  readonly corredor: CorredorIx
  readonly motivo: PullMotive | null // el `PullMotive` del motor, 15 valores (types.ts l. 400-447)
  readonly para: CorredorIx | null
}
export interface DetalleDeGrupo {
  readonly g: GrupoIx
  readonly velocidadKmh: number | null
  readonly relevanTotal: number
  readonly relevan: readonly Relevista[] // tope 12, como hoy (`raceRadio.ts` l. 591)
  readonly percance: { readonly tipo: TipoPercance; readonly perdidaS: number } | null
}

/** EL ESTADO ESPACIAL CANÓNICO en el bloque b: la carrera tal como pasa por ese punto. */
export interface Foto {
  readonly b: Bloque
  /** Por corredor: su grupo, o −1 si ya no está en carrera. */
  readonly grupoDe: Int16Array
  /** Quién es el pelotón (§3.5). */
  readonly titulo: GrupoIx | null
  /** Reloj de cada grupo vivo al cruzar b: exacto en las muestras, interpolado fuera de ellas (§3.6). */
  readonly reloj: ReadonlyMap<GrupoIx, RelojDs>
  /** Solo en los bloques de foto de km: la capa de detalle. */
  readonly detalle: readonly DetalleDeGrupo[] | null
}

/** Qué papel hace un grupo en la carretera: el vocabulario de SPEC 6.15 más el grupeto. */
export type PapelDeGrupo = 'cabeza' | 'caza' | 'grueso' | 'grupeto'

export interface HuecoMedido {
  readonly aCabezaS: number
  readonly aDelanteS: number
  /** Dónde se midió: el último km de foto por el que ha pasado este grupo (la tele mide en un punto). */
  readonly medidoEnKm: number
  /** Cambio del hueco a la cabeza en los últimos `tendenciaKm`; null si el grupo no existía entonces. */
  readonly tendenciaS: number | null
}

export interface GrupoEnPantalla {
  readonly g: GrupoIx
  /** 1 = el primero de la carretera. La tele renumera; la identidad es `g`. */
  readonly numero: number
  readonly papel: PapelDeGrupo
  /** ≤ 3 corredores: se nombra por ellos (SPEC 6.15, l. 614-615). */
  readonly porNombres: boolean
  /** Lleva al líder de esta clasificación y no es ni la cabeza ni el grueso («grupo del maillot»). */
  readonly delMaillot: JerseyKind | null
  /** Dónde está en la hora T (corte diagonal, §3.3). */
  readonly km: number
  readonly miembros: readonly CorredorIx[]
  readonly hueco: HuecoMedido
  readonly detalle: DetalleDeGrupo | null
}

export interface EnTransito {
  readonly corredor: CorredorIx
  readonly de: GrupoIx
  readonly a: GrupoIx
}

export interface ResultadoDePancarta {
  readonly tipo: 'meta_volante' | 'cima'
  readonly km: number
  readonly categoria: 'HC' | 'cat1' | 'cat2' | 'cat3' | 'cat4' | null
  /** Orden de paso con sus puntos; tras la v90 hasta el 8.º (§11), antes solo el ganador. */
  readonly orden: readonly { readonly corredor: CorredorIx; readonly puntos: number }[]
}

export interface FilaGeneralVirtual {
  readonly corredor: CorredorIx
  /** Déficit de salida (`input.riders[].gcDeficitSeconds`) más el hueco en carretera con el líder. */
  readonly deficitS: number
  readonly g: GrupoIx
}

/** EL ESTADO EN UNA HORA DE CARRERA: lo que pinta la pantalla. */
export interface Instante {
  readonly T: RelojDs
  readonly kmCabeza: number
  readonly kmAMeta: number
  readonly grupos: readonly GrupoEnPantalla[]
  readonly enTransito: readonly EnTransito[]
  readonly pancartas: readonly ResultadoDePancarta[]
  /** Solo si hay general y alguien de los `generalVirtualTop` primeros va en otro grupo que el líder. */
  readonly generalVirtual: readonly FilaGeneralVirtual[] | null
  /** Sucesos narrables emitidos en los últimos `rotuloVidaS` antes de T: el rótulo del momento. */
  readonly rotulos: readonly SucesoNarrable[]
}

/** LA LÍNEA TEMPORAL en memoria, ya desempaquetada. */
export interface LineaTemporal {
  readonly formato: 1
  readonly bloques: number
  readonly corredores: number
  readonly grupos: readonly GrupoDelCatalogo[]
  /** Cada `fotoClaveKm`: la pertenencia completa. */
  readonly claves: readonly { readonly b: Bloque; readonly grupoDe: Int16Array; readonly titulo: GrupoIx | null }[]
  readonly sucesos: readonly SucesoDeEstado[] // ordenados por b; dentro del bloque, en el orden del tipo
  readonly narrables: readonly SucesoNarrable[]
  readonly detalle: ReadonlyMap<Bloque, readonly DetalleDeGrupo[]>
}
```

El formato guardado (§3.8) empaqueta esto en listas planas de enteros; `desempaquetar(guardada): LineaTemporal` y `empaquetar(linea): LineaTemporalGuardada` son inversas y un test lo sella (§13, I3).

### 3.3 El reductor y las dos proyecciones

```ts
// packages/engine/src/broadcast/reducir.ts
export function reducir(foto: Foto, s: SucesoDeEstado): Foto        // puro: devuelve una Foto nueva
export function fotoEn(linea: LineaTemporal, b: Bloque): Foto       // clave ⌊b⌋ + sucesos (clave, b]
export function instanteEn(linea: LineaTemporal, T: RelojDs, ctx: ContextoDeEtapa): Instante

/** Lo que el instante necesita además de la línea: todo sale del `input` y los `events` congelados. */
export interface ContextoDeEtapa {
  readonly bloques: readonly Block[] // `sampleProfile(input.profile)`
  readonly longitudKm: number
  readonly lideres: Omit<RaceLeaders, 'team'> // en carretera: tras la N−1
  readonly deficitSalidaS: readonly (number | null)[] // por CorredorIx; null sin general
  readonly sucesos: readonly RaceEvent[] // `stage_snapshots.events`, para pancartas y rótulos
}
```

`reducir` tiene un `case` por variante: `mueve` reasigna `grupoDe` de los corredores listados; `sale` pone −1; `titulo` cambia el pelotón; `percance` se anota en el detalle del km en curso; `reloj` escribe marcas en `reloj`. Entre dos marcas, el reloj de un grupo se interpola linealmente por bloque (§3.6). Dentro de un bloque el orden es fijo: `sale`, `mueve`, `titulo`, `reloj`, `percance`.

`instanteEn(T)` es el **corte diagonal**, en cuatro pasos:
1. La cabeza está en `kmCabeza = L⁻¹(T)`, y `kmAMeta` es la longitud del perfil (`stageLengthKm`, `sample.ts` l. 60) menos eso.
2. Cada grupo del catálogo cuya vida cubre `T` está en `b_g = r_g⁻¹(T)`, interpolando entre sus marcas.
3. Su composición es la de `fotoEn(b_g)` para ese grupo. El hueco que se enseña es el del último km de foto por el que ya ha pasado (`medidoEnKm`), que es como lo mide la tele.
4. Un corredor que aparece en dos grupos (se cambió de uno a otro en el tramo de carretera que los separa) se enseña en el de **atrás**, porque en su punto el cambio aún no ha pasado; uno que sigue en carrera y no está en ninguno va a `enTransito` con su grupo de origen y de destino.

Por qué no se reduce en orden de reloj: se probó (`scratchpad/e2p-estado/medir-diagonal.mjs`). Ordenar los `mueve` por el reloj del corredor o del grupo de destino y reducir hasta `T` discrepa de la foto en el 0,3-12,5 % de los grupo-km (cinco etapas, dos semillas), porque el motor deja que el que salta a otro grupo **adopte** su reloj y la puerta de `rejoinGapSeconds` le perdona el hueco (`simulate.ts` l. 7844 y 7903-7912; la radio lo llama «el regalo», `raceRadio.ts` l. 836-845): medido, el reloj de un corredor retrocede en el 0,003-0,17 % de los pares de bloques. El tiempo del motor no es causal al segundo; el espacio sí. Por eso el espacio es canónico.

### 3.4 De dónde sale cada campo

| Campo | Origen | Cita |
| --- | --- | --- |
| `grupoDe` por bloque | **se graba**: `SnapshotRider.groupId` de la sonda en cada bloque (hoy se pide por km y se adelgaza) | types.ts l. 449-485; `raceRadio.ts` l. 776-963 |
| `titulo` | **se graba**: `mainId` de la foto si ese grupo tiene gente; si no, `mainGroupId` con el título del bloque anterior, que es la regla de la radio aplicada por bloque | `raceRadio.ts` l. 317-320; `group.ts` l. 194-206 |
| `reloj` (marcas) | **se graba**: mínimo de los relojes de los suyos en la foto; hoy se tira | `raceRadio.ts` l. 284-300 y 945-963; mapa 01 §2.3 |
| `percance` | **se graba** desde `output.incidents`, que hoy se tira después de usarlo; sin `diasBaja` (§8.2) | `stageRun.ts` l. 586-590; types.ts l. 358-365 |
| `SucesoNarrable.bEmision` | **se graba** con la sonda nueva `onEvent` (§11) | `events.ts` l. 9-49 |
| `DetalleDeGrupo` | **existe**: lo calcula `radioForStorage` con las mismas funciones (velocidad por los hombres, turno de 3 km, tope 12) | `raceRadio.ts` l. 679-963 |
| `kmAMeta`, pendiente, próximo puerto | **se deriva** del perfil congelado | `sample.ts` l. 60-68; `citas.ts` l. 35-60 y 256-264 |
| hueco, tendencia | **se deriva**: resta de relojes en el mismo bloque | `group.ts` l. 121-124 |
| `papel`, `porNombres`, `delMaillot`, `numero` | **se deriva** (§3.5) | SPEC l. 600-615 |
| `enTransito` | **se deriva** del corte diagonal | §3.3 |
| `pancartas` | **existe a medias**: hoy solo el ganador; el orden completo **se graba** tras la v90 | `simulate.ts` l. 9221, 9310; §11 |
| `generalVirtual` | **se deriva**: `gcDeficitSeconds` del `input` congelado más los huecos del instante | types.ts l. 183-189 |
| rótulo de corredor | **se deriva al leer** en la API (§6) | `jerseys.ts` l. 80-98 |

### 3.5 La identidad de los grupos

El motor nombra los grupos por su **origen** y el nombre no caduca: `peloton` es el que salió del pelotón, `mov-N` el que atacó, `shed-N` el que se descolgó (`group.ts` l. 164-193). Las fusiones reales (`mergeGroups` de `group.ts` l. 135-147 no la llama nadie en `simulate.ts`) se hacen reasignando `groupId`: el movimiento cazado pasa a `peloton` (l. 8813), el de detrás se une al de delante y éste conserva su id (l. 8556), el grupeto va al pelotón (l. 7927) o al grupeto cercano (l. 7936). De ahí tres reglas:

1. **La identidad es el id del motor** mientras el grupo tenga gente. Medido: 14-22 ids por llana, 53-71 por media, 67-102 por reina, 83-103 en Flandes y 116-140 en Colombia.
2. **El sucesor** de un grupo que muere es el grupo al que fue la mayoría de sus corredores en el bloque de su muerte (la regla con que la radio sigue a un grupo para medir su velocidad, `raceRadio.ts` l. 614-632 y 694-712). Sirve para la continuidad en pantalla: el cursor de la fuga cazada se funde con el del grupo que la caza, y la tendencia del hueco se sigue por la cadena de sucesores.
3. **El nombre no es la identidad.** El papel se deriva en cada instante: `cabeza` el primero; `grueso` el del título; `caza` el primero entre la cabeza y el grueso que lleve al menos `cazaFraccionMinima` de los que van detrás de la cabeza (la regla de `chaseReferenceIndex`, `group.ts` l. 235-245); `grupeto` todo lo que va detrás del grueso. Con tres corredores o menos, `porNombres`. `delMaillot` cuando lleva a un líder y no es ni cabeza ni grueso, que es la petición del dueño que hoy solo cumple la radio («podría llamarse grupo del maillot amarillo en vez de grupo 3», `RaceRadioPanel.tsx` l. 50-52, v58, citada por el mapa 05 §2.2). El papel tiene histéresis de `nombreHisteresisKm` (1 km): no cambia si la condición no se sostiene un km, salvo con un `mueve` de más de un corredor en ese grupo.

El **título de pelotón** es un suceso aparte porque el motor lo decide con histéresis (`mainGroupId`, `takeover` 1,25, constants.ts l. 2672) y la radio lo usa para `kind`. Resolverlo por bloque con la regla de la radio da el mismo `mainId` que la radio de hoy en 3.242 de 3.246 fotos de km (medido); las 4 restantes difieren porque la radio hereda el título de la foto del km anterior y aquí del bloque anterior. Se adopta la de bloque: es la misma regla con la memoria correcta.

### 3.6 El reloj absoluto

Hoy no existe (mapa 01 §1-2): la radio guarda el hueco al líder redondeado y tira el reloj. Se guardan **marcas del reloj de cada grupo** en cuatro sitios: (a) cada foto de km; (b) su nacimiento y su muerte; (c) el bloque de cada cambio de su composición y el anterior; (d) cada bloque del último km, donde la tele pone carteles a 500, 300, 200 y 100 m (mapa 06 §1.5). Entre dos marcas, interpolación lineal por bloque. Medido sobre todos los bloques y grupos (`scratchpad/e2p-estado/medir-v2.mjs`):

| Etapa (3 semillas) | Marcas por etapa | Error del reloj p99 | Error de posición p99 | Máximo |
| --- | --- | --- | --- | --- |
| llana e7 | 518-802 | 0,27-0,44 s | 3-6 m | 53 m |
| media e13 | 1.535-1.682 | 3,3-8,4 s | 37-76 m | 183 m |
| reina e18 | 1.937-2.582 | 8,8-9,4 s | 75-83 m | 195 m |
| Flandes e1 | 1.769-2.042 | 23,8-29,9 s | 157-196 m | 422 m |
| Colombia e5 | 2.914-3.392 | 18,7-20,3 s | 121-124 m | 271 m |

Sin las marcas (c), la llana tiene p99 de 12-29 m y Flandes llega a 3,5 km de error máximo (primera pasada, `medir-estado.mjs`): los cambios de composición mueven el mínimo de los relojes y la recta no los ve. En pavé el error sube porque la velocidad cambia dentro del km; aun así, en la altimetría del motor (720 px para 278 km, `routes/altimetry.ts` l. 95-96 según el mapa 03 §7) 422 m son 1,1 px. **Los huecos que se enseñan no se interpolan nunca**: son la resta exacta en el último km de foto por el que ha pasado el grupo.

### 3.7 Las fotos clave

Cada `fotoClaveKm` (10 km), y una más al empezar el último km (abre el tramo de meta, §7.1), se guarda la pertenencia completa: un `Uint8Array` de `corredores` bytes (índice de grupo + 1; 0 = fuera) en base64, 236 caracteres para 176 corredores. Medido: 4,2-6,7 KB por etapa todas juntas. **No son por coste**: reducir la etapa entera desde el km 0 cuesta 0,02-0,22 ms en Node (medido, `medir-densidad.mjs`). Son tres cosas: (1) la **unidad de entrega** del servidor (§7): un tramo es foto clave + sucesos hasta la siguiente, y el servidor no reduce nada, recorta; (2) el **salto**: ir al km 120 es desempaquetar una clave y aplicar como mucho 10 km de sucesos; (3) la **suma de control**: cada clave tiene que ser la reducción de la anterior más sus sucesos (invariante I3), y un formato corrupto se detecta sin la foto del motor.

### 3.8 El presupuesto de bytes y la codificación

```ts
// El formato guardado (`stage_timelines.linea`, columna `json`, §10). Todo entero salvo los ids y la base64.
export interface LineaTemporalGuardada {
  readonly formato: 1
  readonly dx: number // `STAGE.dx` con que se grabó
  readonly bloques: number
  readonly corredores: number
  readonly grupos: readonly string[] // ids del motor por `GrupoIx`
  readonly claves: readonly (readonly [Bloque, string])[] // base64 de un byte por corredor: GrupoIx + 1, 0 = fuera
  readonly mov: readonly number[] // tríos [Δbloque, corredor, grupo + 1]; grupo + 1 = 0 es `sale`
  readonly titulo: readonly number[] // pares [bloque, grupo + 1]
  readonly relojes: readonly (readonly number[])[] // por foto de km: [Δcabeza, gCabeza, g, huecoDs, …]
  readonly sueltas: readonly number[] // tríos [Δbloque, g, reloj menos cabeza del km anterior]
  readonly percances: readonly number[] // cuartetos [bloque, corredor, tipo, pérdidaDs]
  readonly narrables: readonly number[] // tríos [i, bEmision, tEmision]
  /** Por foto de km, una fila por grupo: [g, velocidad·10 o −1, relevanTotal, relevo, tipoPercance?, pérdidaS?].
   *  `relevo`: 0 si no cambió desde el km anterior de ese grupo; [motivo, para, c…] si todos comparten
   *  motivo y destinatario; [−9, c, m, p, c, m, p…] si no. Motivo por índice en `PullMotive`, −1 = null. */
  readonly detalle: readonly (readonly (readonly (number | readonly number[])[])[])[]
}
```

Medido (tres semillas por etapa; KB de 1.024 B; disco = `pg_column_size` en PGlite):

| | llana e7 | media e13 | reina e18 | Flandes | Colombia e5 |
| --- | --- | --- | --- | --- | --- |
| Radio de hoy, JSON | 132-167 | 241-277 | 286-347 | 268-323 | 485-546 |
| Radio de hoy, disco (`jsonb`) | 12,6-14,1 | 23,1-42,0 | 26,9-42,3 | 29,3-31,2 | 117-122 |
| Línea: núcleo (pertenencia, título, relojes), JSON | 8,8-10,9 | 27,8-35,1 | 39,1-50,1 | 39,8-44,4 | 47,6-51,6 |
| Línea: capa de detalle, JSON | 13,1-16,0 | 19,9-28,4 | 22,7-33,9 | 27,2-29,9 | 45,5-52,5 |
| **Línea entera, JSON** (gzip) | **24,0-24,8** (4,0-4,7) | **47,7-61,2** (11,8-15,2) | **61,8-84,1** (16,6-23,5) | **68,6-73,0** (16,6-18,3) | **93,9-104,1** (26,8-29,9) |
| **Línea entera, disco** como `json` | **5,5-6,6** | **16,0-20,2** | **22,4-31,0** | **22,5-24,5** | **35,4-39,4** |
| … la misma como `jsonb` | 7,9-9,3 | 22,2-29,6 | 31,5-43,1 | 32,8-36,3 | 52,3-58,4 |

Tres lecturas. (1) La línea ocupa en disco entre un tercio (Colombia) y tres cuartos (reina e18, Flandes) de la radio de hoy, y sitúa a todos los corredores en todos los bloques. (2) `json` (texto validado) ocupa entre un 26 % y un 32 % menos que `jsonb` con el mismo contenido, porque `pglz` comprime mejor el texto que el binario, y nadie consulta dentro de la línea: se elige `json`. (3) Dentro del núcleo, lo que más pesa en montaña son los `mov` (16-22 KB en reina): el grupeto se deshace de dos en dos (sucesos de estado por etapa: 26-42 en llana, 224-263 en media, 352-456 en reina, 326-343 en Flandes y 404-487 en Colombia; mediana de 2 corredores por suceso).

**Objetivo**: ≤ 64 KB de JSON en la mediana del banco y ≤ 128 KB en el máximo; ≤ 48 KB en disco; la crono ≤ 32 KB (medido 15-20 KB, §9). Un tramo de 10 km con sus sucesos narrables: 2,6-12,3 KB de JSON (gzip 0,4-2,3), medido en el tramo central de cada etapa.

### 3.9 Los invariantes

- **I1 · la foto reducida es la foto del motor.** Para toda etapa y todo `k` de `radioKmPoints`: `proyectar(fotoEn(linea, b_k)) ≡ radioKmFrom(foto_motor(b_k), engineMainId = titulo(b_k))` en orden de carretera, ids, miembros, tamaño, `kind`, `gapS` redondeado, `racing`, `gone` y `mainId`. **Medido: 0 discrepancias en 3.246 fotos de km** (5 etapas × 3 semillas, `medir-v2.mjs`). Con el título copiado de la foto sin la regla de la radio salían 69 (§1, punto 11).
- **I2 · el instante coincide con la foto donde se mide.** Para toda foto de km `k` y todo grupo `g` de ella: los miembros de `g` en `instanteEn(r_g(k))` son los de la foto menos los que el corte diagonal pone en un grupo de atrás. Se sigue de I1 y de que hay marca de reloj en cada km. Medido cada 30 s de carrera (`medir-corte.mjs`, semilla 0 de las cinco etapas): corredores en dos grupos, p90 0 y máximo 2-100 en el instante de una gran fusión; en ningún grupo, p50 0, p90 0-2, máximo 13-66.
- **I3 · las claves cuadran.** `clave(k + 10) = reducir*(clave(k), sucesos(k, k + 10])`, y `desempaquetar(empaquetar(l)) = l`.
- **I4 · mirar no cambia la carrera.** Huella de resultados y sucesos idéntica con y sin la sonda en cada bloque: 15 de 15 (medido); es la extensión del test «la radio no toca la carrera» (`sim/raceRadio.test.ts` l. 748-799).

### 3.10 El mismo estado en cualquier idioma

La línea no tiene ni una palabra: ids del motor (que son identificadores, no rótulos), índices, códigos cerrados (`PapelDeGrupo`, `TipoPercance`, `PullMotive`, `JerseyKind`) y números. Toda superficie es `render(idioma, entrada)`: la barra (`PapelDeGrupo` → «Lead group»), el journal en vivo (`plantilla` + `datos`), la radio del dueño, el correo, el título de la pestaña y las noticias (§8). La elección de variante usa una semilla neutra: `hash(plantilla, raceKey, stageDay, bEmision, ids de los protagonistas)`, sin nombres ni la conjunción «and» que hoy entra en `variantIndex` (mapa 07 §3). En cada idioma la elección es determinista; entre idiomas, lo idéntico es el hecho (mapa 07 §6, punto 4).

---

## 4. Lo permanente y lo eventual

La UCI obliga a dos números fijos (km a meta y diferencia principal) y a las diferencias generales cada 3-5 minutos (mapa 06 §1.1); la agenda añade quién va en cada grupo, el perfil con la posición y el rótulo del momento (`docs/agenda.md` l. 510-515). Un km son 80 s de carrera a 45 km/h: con reproducción a ×60, una diferencia nueva por segundo y medio de pantalla. Por eso la barra de grupos es permanente aquí y no periódica.

| Pieza | Cuándo | Campo del `Instante` | Texto (pantalla, en inglés) |
| --- | --- | --- | --- |
| **Capa fija**: km a meta, diferencia principal y tendencia | siempre | `kmAMeta`; hueco del grupo `caza` o, sin caza, del `grueso` | `42.6 km to go · +2:14 ▼0:18 in 5 km` |
| Reloj de carrera | siempre | `T` | `3:41:07` |
| **Barra de grupos**: número, papel, tamaño, hueco, iconos de maillot | siempre; fila nueva al partirse, fusión animada al cazar | `grupos[]` | `1 LEAD GROUP · 5` · `2 CHASE GROUP · 2 · +0:45` · `3 BUNCH · 142 · +2:14 [GC][PTS]` · `4 GRUPPETTO · 18 · +6:40` |
| **Tu corredor** | siempre que corra | `grupoDe(mío)` | `You · in the bunch · +2:14` |
| **Perfil con un cursor por grupo** y el puerto que viene | siempre | `grupos[].km`, perfil | `Next: Col du Lys · Cat 1 · summit in 6.2 km` |
| Rótulo del momento | `rotuloVidaS` tras cada suceso narrable | `rotulos` | `ATTACK · 21 L. BERTOLINI · Team Alpha` |
| Escapada con su lista (§6.4) | al nacer la cabeza y cada vez que gana o pierde a alguien | `grupos[0]` + rótulos | `FRONT OF THE RACE · 5 riders` y cinco líneas |
| Ficha de puerto | al pie (sale del recorrido, no destripa) | perfil | `Col du Lys · Cat 1 · 12.4 km at 7.8%` |
| Resultado de pancarta | tras la línea | `pancartas` | `KOM · Col du Lys · 1. VERHOEVEN 10 · 2. ARRIETA 8 · 3. OLSEN 6` |
| General virtual | si alguien del top `generalVirtualTop` va en otro grupo que el líder a menos de `generalVirtualMaxS` | `generalVirtual` | `VIRTUAL GC · 1. ARRIETA (break) · 2. [GC] CARTER +0:47` |
| Percance | en su bloque | `detalle.percance`, `enTransito` | `PUNCTURE · 45 J. MOREAU` |
| Último km | carteles 1 km, 500, 300, 200, 100 m | marcas por bloque del último km | `FLAMME ROUGE · 5 in front · +0:08` |
| Llegada | tramo de meta (§7) | resultado | `STAGE WINNER · L. BERTOLINI · 4:12:33` |

**Qué no se enseña nunca en la retransmisión**: la clasificación general de después, el número de sucesos que quedan, la duración total de la reproducción, marcas en el perfil donde va a pasar algo (hoy la altimetría las lleva, mapa 03 E7) y la lista de llegada antes de la línea.

Maqueta (pantalla, 360 px de ancho, estimada sobre las clases de hoy; E3 decide el dibujo):

```
┌──────────────────────────────────────┐
│ 42.6 km to go   +2:14 ▼0:18   3:41:07 │ ← capa fija
│ ▁▂▃▅▇▆▃▂▁▂▃▅▇█▇▅▃ ●1   ●3 ●4           │ ← perfil con cursores
│ Next: Col du Lys · Cat 1 · 6.2 km     │
├──────────────────────────────────────┤
│ 1 LEAD GROUP · 5                  ▸   │
│ 2 CHASE GROUP · 2           +0:45 ▸   │
│ 3 BUNCH · 142  [GC][PTS]    +2:14 ▸   │ ← tocar abre la lista y la radio
│   You · in the bunch                  │
│ 4 GRUPPETTO · 18            +6:40 ▸   │
├──────────────────────────────────────┤
│ ATTACK · 21 L. BERTOLINI · Team Alpha │ ← rótulo del momento
│ ▶ ❚❚  ×1  +10 km  Final 20 km  Finish │
└──────────────────────────────────────┘
```

---

## 5. El ritmo de la reproducción

**La curva.** La hora `T` avanza a una velocidad que depende del **tramo del recorrido** (sabido antes de salir) y se frena **después** de cada hito ya enseñado, nunca antes (principio 5). Hitos: un `mueve` de dos o más corredores en un grupo de delante del grueso o en el propio grueso, y los narrables de la lista `hitosNarrables` (§12). Aplicada a las cinco etapas con las constantes de §12 (`medir-ritmo.mjs`, semilla 0):

| Etapa | Carrera | Reproducción | > 60 km | 60-20 | 20-5 | 5-1 | último km |
| --- | --- | --- | --- | --- | --- | --- | --- |
| llana e7, 175 km | 3 h 57 | **5:02** | 2:13 | 1:43 | 0:41 | 0:19 | 0:06 |
| media e13, 206 km | 4 h 56 | **8:17** | 2:51 | 4:04 | 0:51 | 0:21 | 0:09 |
| reina e18, 185 km | 4 h 50 | **11:00** | 6:04 | 1:32 | 1:38 | 1:06 | 0:40 |
| Flandes, 278 km | 6 h 42 | **11:39** | 6:53 | 3:00 | 1:17 | 0:21 | 0:09 |
| Colombia e5, 232 km | 7 h 36 | **15:03** | 7:21 | 3:18 | 1:45 | 1:25 | 1:14 |

Medido con la cabeza de carrera como reloj; la reina e18 y Colombia terminan en alto, y su último km a ×4 dura lo que dura una subida. Es una compresión del orden de la de un resumen de televisión en la hora muerta (1:100 o más) y de 1:4 en el último km (mapa 06 §5.4).

**Los mandos** (pantalla): pausa; multiplicador `×½ ×1 ×2 ×4` sobre la curva; `+10 km` y `Final 20 km`, que saltan por el **recorrido** (no «al siguiente suceso», que diría que hay uno); `Finish`, que es revelar y pide confirmación (`Reveal the result of stage 7?`); y el deslizador, que solo llega hasta lo entregado. Saltar hacia delante entrega los tramos intermedios: el horizonte avanza igual que si se hubieran visto (§7.1).

**Lo que nunca se comprime**: la capa fija y la barra (están en todos los fotogramas); cada cambio de estructura de delante del grueso se ve al menos `frenoS` segundos reales; cada rótulo vive `rotuloVidaS`; el último km no pasa de ×4; y ninguna frase se enseña antes de su `tEmision`. **Lo que se comprime sin daño**: el rodar del grueso sin cambios, las lecturas repetidas de la diferencia y los descuelgues de dos en dos del grupeto (medido: 16-20 km seguidos sin cambio de estructura ni suceso narrable en cada etapa, `medir-densidad.mjs`).

**El resumen** (`Highlights`, pantalla): la misma curva sin la parte de más de 60 km salvo la formación de la fuga, en 2-3 minutos (estimado sobre la tabla). Pide la línea entera, así que es una forma de ver la etapa: al terminarlo, la etapa cuenta como vista.

**Volver a una etapa a medias**: el cliente informa de su posición cada `vistoCadaS` y al pausar o salir (§10); al volver, arranca en `visto_hasta_b` con la capa fija puesta, que es lo que hace legible cualquier corte (mapa 06 §5.4).

**Móvil.** Una columna: capa fija de una línea con el reloj debajo por debajo de 400 px; perfil de 72 px de alto a todo el ancho; barra de grupos con el hueco alineado a la derecha y la lista de cada grupo en un panel que se abre al tocar (la radio del dueño vive ahí, §8.1); los mandos en una fila fija sobre la barra inferior de navegación (56 px, `BottomNav.tsx` l. 22-70 según el mapa 03 §7). Con la pestaña oculta (`visibilitychange`) la reproducción se pausa: un móvil bloqueado no puede ver la etapa por el jugador. Un tramo de 10 km son 2,6-12,3 KB de JSON (medido), así que la carga inicial es la cabecera (§10) y el primer tramo, no los 0,9-3 MB de hoy.

---

## 6. Los rótulos

### 6.1 El maillot que se ve y lo que dice el rótulo

La tele enseña dos cosas que no hay que confundir: el maillot **llevado** (uno, el que se ve) y las **distinciones** (varias, en el rótulo) (mapa 06 §2.3). Las dos son funciones puras en `packages/shared/src/rotulo.ts` (nuevo), junto a `jerseys.ts`, porque las calcula la API y las pinta la web.

```ts
// packages/shared/src/rotulo.ts
import type { JerseyKind, RaceLeaders } from './jerseys.js'

export type Disciplina = 'ruta' | 'crono'
export type AmbitoTitulo = 'mundo' | 'nacional'

/** Un título vigente. Lo crean E3 y E12; mientras no existan, `titulosDesdePalmares` (§6.2). */
export interface Titulo {
  readonly riderId: string
  readonly ambito: AmbitoTitulo
  readonly pais: string | null // ISO alfa-2; null en el del mundo
  readonly disciplina: Disciplina
  readonly desdeDia: number // día de juego absoluto del campeonato
  readonly hastaDia: number // el día de la edición siguiente: se lleva un año (UCI 1.3.063, 1.3.068)
}
/** LA INTERFAZ QUE E2 PIDE A E3 Y E12, y lo único que E2 sabe de ellos. */
export interface FuenteDeTitulos {
  vigentes(worldId: string, dia: number): Promise<readonly Titulo[]>
}

export type MaillotLlevado =
  | { readonly k: 'lider'; readonly clasificacion: JerseyKind }
  | { readonly k: 'campeon'; readonly ambito: AmbitoTitulo; readonly pais: string | null; readonly disciplina: Disciplina }
  | { readonly k: 'equipo' }

export type Distincion =
  | { readonly k: 'lidera'; readonly clasificacion: JerseyKind } // aunque vista otro maillot
  | { readonly k: 'viste_por'; readonly clasificacion: JerseyKind; readonly puesto: number } // delegación
  | { readonly k: 'titulo'; readonly ambito: AmbitoTitulo; readonly pais: string | null; readonly disciplina: Disciplina }
  | { readonly k: 'general'; readonly puesto: number; readonly deficitS: number } // los `rotuloGeneralTop` primeros
  | { readonly k: 'etapas'; readonly ganadas: number } // victorias de etapa en ESTA carrera hasta la N−1

export interface RotuloCorredor {
  readonly riderId: string
  readonly dorsal: number | null
  readonly nombre: string
  readonly genero: 'M' | 'F' // lo pide la concordancia de E10 (mapa 07 §3); hoy no viaja
  readonly pais: string
  readonly equipo: { readonly id: string; readonly nombre: string; readonly semillaMaillot: string } | null
  readonly lleva: MaillotLlevado
  readonly distinciones: readonly Distincion[]
  /** El corredor del jugador que mira: lo pone la API con la sesión, nunca la línea temporal. */
  readonly esMio: boolean
}

export interface ContextoDeRotulo {
  /** `assignLeaderJerseys` sobre las clasificaciones tras la N−1; `NO_LEADERS` en la etapa 1 y en un día. */
  readonly lideres: Omit<RaceLeaders, 'team'>
  readonly titulos: readonly Titulo[]
  readonly disciplina: Disciplina
}

/** La general con la que se sale hoy (la de tras la N−1) y las victorias de etapa de esta carrera. */
export interface GeneralDeSalida {
  readonly puesto: ReadonlyMap<string, number>
  readonly deficitS: ReadonlyMap<string, number>
  readonly etapasGanadas: ReadonlyMap<string, number>
}

export function maillotLlevado(riderId: string, ctx: ContextoDeRotulo): MaillotLlevado
export function distinciones(riderId: string, ctx: ContextoDeRotulo, general: GeneralDeSalida): readonly Distincion[]
```

**La regla de prioridad** es la de la UCI (mapa 06 §2.2), en este orden: (1) maillot de líder de la carrera, `gc` > `points` > `kom`, con el «pasa al siguiente» que ya aplica `assignLeaderJerseys` (`jerseys.ts` l. 80-98; UCI 1.3.071 y 2.6.018); (2) campeón del mundo de la disciplina de la etapa; (3) campeón nacional de la disciplina; (4) la equipación del equipo. Copa y continental no existen en el juego. En la etapa 1 no hay maillot de líder (UCI 2.6.018) y ya sale así porque `lideres` es `NO_LEADERS` sin general previa (mapa 03 §6). El título se lleva solo en su disciplina y categoría (UCI 1.3.063, 1.3.068): el nacional de crono no se ve en una etapa en línea, y los títulos sub-23 (`nc-<cc>-u23-*`, `calendar.ts` l. 3655-3660 según el mapa 04 §4) no se ven nunca en carreras élite. Un líder que además es campeón lleva el de líder y el rótulo dice las dos cosas (`lidera` + `titulo`).

### 6.2 Las cinco categorías y qué se enseña mientras E3 y E12 no existan

| Categoría | De dónde sale el dato | Con qué se dibuja | Mientras E3 y E12 no existan |
| --- | --- | --- | --- |
| General, puntos, montaña | `assignLeaderJerseys` tras la N−1 (`routes/races.ts` l. 469-472) | `LeaderJersey` (`Jersey.tsx` l. 71-117) | igual que hoy |
| Campeón nacional | **ya derivable**: la última fila de `palmares` con `race_id` `nc-<cc>-road` o `nc-<cc>-itt` y `kind = 'gc'` anterior al día (`stageRun.ts` l. 1291-1307; índice `palmares_race_idx`, `schema.ts` l. 783-786; mapa 04 §4) | componente `ChampionJersey` de E3 | el maillot del equipo con una banda de la bandera del país (`Flag`) y la línea `National champion`; nunca los colores de un campeonato real (SPEC §8) |
| Campeón del mundo | E12 (no hay Mundial en el calendario, mapa 04 §4) | `ChampionJersey` de E3, sin arcoíris (SPEC §8) | no se enseña: `vigentes` no devuelve ninguno |
| Equipo | `teams.jersey_seed` (`schema.ts` l. 234) | `Jersey seed` (`Jersey.tsx` l. 15-52) | el dibujo de hoy; E3 lo rediseña detrás de la misma prop `semillaMaillot` |
| (dorsal del equipo líder) | `leadingTeam` (`jerseys.ts` l. 116-118) | fuera del rótulo, como decidió navegación §7.4 | igual |

`titulosDesdePalmares(db, worldId, dia)` es la implementación provisional de `FuenteDeTitulos`: una consulta `DISTINCT ON (race_id)` sobre `palmares` filtrada por `race_id LIKE 'nc-%-road' OR LIKE 'nc-%-itt'` y `game_day ≤ dia`, ordenada por `game_day` descendente. El precedente de la misma consulta es el dorsal 1 del campeón defensor (`calendarRun.ts` l. 991-1007). Cuando E12 cree los títulos, se cambia la implementación, no la interfaz.

### 6.3 El rótulo de una escapada

La lista de una escapada va por orden de carretera o de dorsal (mapa 06 §2.4 no lo verificó; aquí, dorsal, que es estable); la **frase** ordena por notoriedad y cuenta al resto. `presentarGrupo(miembros: readonly RotuloCorredor[]): { destacados: readonly RotuloCorredor[]; resto: number }` ordena por: maillot de líder (`gc` > `points` > `kom`), campeón del mundo, campeón nacional, amenaza a la general (`general.puesto ≤ rotuloGeneralTop`), ganador de etapa en esta carrera, el resto por dorsal; toma `destacadosMax` (2). Es puro y vive en `shared`.

Se enseña la lista entera cuando el grupo tiene `nombrarGrupoHasta` (12) o menos, que es el tope con que la radio ya nombra un grupo entero (`raceRadio.ts` l. 611). Con la pertenencia completa de §3, **todo** corredor de todo grupo tiene rótulo en todo instante; hoy, fuera del pelotón, en reina, el 47-64 % (mapa 01 §2.3). El test B3 (§13) lo exige al 100 %.

### 6.4 El caso literal: «cuando se escapan cinco»

El requisito está en la agenda como transcripción del dueño, sin comillas (`docs/agenda.md` l. 736-739; mapa 05 §1): «cuando se escapan cinco, que se vean sus maillots… es la diferencia entre "se escapan cinco" y "se escapa el campeón de Italia con cuatro más"». Del estado a la pantalla:

1. Bloque 234 (km 23,45): `mueve { de: peloton, a: mov-4, corredores: [102, 37, 88, 140, 9] }`. En el instante en que el grupo pasa a número 1, su papel es `cabeza`.
2. La API ya envió en la cabecera los 176 rótulos (§10). `presentarGrupo` sobre los cinco: 102 lleva `{ k: 'campeon', ambito: 'nacional', pais: 'IT', disciplina: 'ruta' }`, 37 lleva `{ k: 'lider', clasificacion: 'kom' }`; destacados [37, 102] (el maillot de líder va antes que el título), resto 3.
3. Pantalla:

```
(pantalla)
1  FRONT OF THE RACE · 5 riders                     +0:38 on the bunch
   [KOM]   37  Jonas VERHOEVEN    BEL  Team Gamma   Mountains leader
   [NC IT] 102 Luca BERTOLINI     ITA  Team Alpha   Italian champion
   [team]   88 Pierre LAMBERT     FRA  Team Epsilon
   [team]  140 Iñigo ARRIETA      ESP  Team Delta   14th overall +4:02
   [team]    9 Tom HARGREAVES     GBR  Team Zeta
The mountains leader and the Italian champion go clear with three more.
```

La lista sale del estado (la composición de la cabeza en el instante); la frase, del suceso del motor que lo cuenta (`attack_sticks` o `front_group`, mapa 01 §1.3) a su `tEmision`, renderizado con los miembros del grupo en ese instante y `presentarGrupo`: el motor no gana ninguna plantilla y el `datos` del suceso no cambia. En otro idioma cambia el orden de las palabras, no el hecho. Mientras E3 no dibuje el maillot de campeón, `[NC IT]` es el maillot del equipo 102 con la banda de la bandera; mientras E12 no cree el Mundial, ningún rótulo dice `World champion`.

---

## 7. El modo sin destripe como propiedad del producto

### 7.1 El modelo de «visto»

Vive en la base, por usuario y etapa (el mapa 04 §3 midió que es la forma A, 150 B por fila, despreciable al lado del tick):

```ts
export type EstadoDeVisionado = 'viendo' | 'vista' | 'revelada'
export interface Visionado {
  readonly userId: string
  readonly raceKey: string
  readonly stageDay: number
  readonly estado: EstadoDeVisionado
  /** Hasta dónde ha llegado la reproducción: lo informa el cliente, solo crece (reanudar). */
  readonly vistoHastaB: number
  /** Hasta dónde ha ENTREGADO el servidor: el horizonte de verdad dentro de la etapa. */
  readonly entregadoHastaB: number
}
```

- **Qué etapas están protegidas.** Las de una carrera en cuyo `race_rosters` va el corredor del jugador (o, para un mánager, un corredor de su equipo), y cualquiera que el jugador haya empezado a ver (tiene fila). El resto del mundo no espera a nadie («races happen whether you are watching or not», `docs/captacion.md` l. 101): sus resultados se ven en todas partes, aunque su página de etapa también abra en modo ver.
- **Cómo avanza.** `viendo` al pedir el primer tramo; `entregadoHastaB` crece con cada tramo entregado; `vista` al entregar el **tramo de meta** (último km más resultado, §10); `revelada` con `Finish`, con `Reveal` en cualquier superficie que lo ofrezca, o al ver el resumen. Para las demás superficies solo hay dos estados: oculta (protegida y ni `vista` ni `revelada`) o visible.
- **Caducidad.** Mientras la carrera está en curso, sus etapas no caducan. Cuando termina, las no vistas caducan a los `caducidadDiasReales` (7) días reales: pasan a visibles y la portada lo dice una vez (`Results of Race France are now shown everywhere`).
- **Volver tras una semana.** El mapa 04 §2 midió que una gran vuelta entera cabe en la semana. La portada abre con la tarjeta `To watch` (pantalla): `Race France · 14 stages to watch` con tres acciones, `Watch from stage 8`, `Highlights, about 2 min each` y `Reveal all`. Todo lo demás (general, noticias, ranking, palmarés, dinero) está cortado en su horizonte hasta que elija.

### 7.2 El horizonte en el servidor

Un módulo, `apps/api/src/horizonte.ts`, calculado una vez por petición (decorador de Fastify) y aplicado por cada ruta según su política:

```ts
export interface Horizonte {
  readonly userId: string | null // null: visitante sin cuenta, sin horizonte (§7.6)
  /** `${raceKey}#${stageDay}` de las etapas protegidas no vistas ni caducadas. */
  readonly ocultas: ReadonlySet<string>
  /** Por carrera, la última etapa visible seguida desde la 1: para cortar clasificaciones. */
  readonly visibleHasta: ReadonlyMap<string, number>
  /** Días de juego de las etapas ocultas: para restar agregados fechados. */
  readonly diasOcultos: ReadonlyMap<string, readonly number[]>
}
export type Politica = 'P0_sin_carrera' | 'P1_por_etapa' | 'P2_agregado_fechado' | 'P3_contador_sin_fecha'
export const POLITICA_DE_RUTAS: Readonly<Record<string, Politica>> // clave: método y patrón de Fastify
```

Coste estimado: una consulta a `stage_views` por usuario, una a `race_rosters` de su corredor en la temporada y el calendario en memoria; por debajo de 5 ms. Las tres políticas que recortan, sobre el inventario completo del mapa 03 §4:

| Superficies (mapa 03 §4) | Política | Regla |
| --- | --- | --- |
| E1, E2, E4, E5, E7 | P1 | La página de etapa abre en modo ver; crónica entera, podio, resultado, clasificaciones y altimetría con marcas solo en el acta (§10), que exige `vista` o `revelada` |
| E3 | P1 | «On the road today» son los líderes tras la N−1: si la N−1 está oculta, puerta (§7.5) |
| E6 | P1 | El deslizador llega a `entregadoHastaB`, nunca a meta |
| E8 | P1 | Desaparece la respuesta única: cabecera, tramos y acta por separado (§10) |
| E9 | P1 | `?tab=result` sobre una etapa oculta abre la puerta, no el resultado |
| C1, C2, C4, C5 | P1 | Ganador, clasificaciones y ganadores de etapa hasta `visibleHasta`; el palmarés de la temporada en curso solo si la carrera entera es visible |
| C3 | P1 | Una clásica terminada abre en modo ver |
| C6 | P0 | «Under way, 7 of 21 stages raced» no es un resultado: se queda |
| I1, I2, I4 | P2 | El ganador de una carrera con su última etapa oculta no se enseña (`🏆` ausente, sin tooltip) |
| I3 | P2 | El buscador no casa contra ganadores ocultos (se re-sella `raceTimeline.test.ts` l. 120-128) |
| N1, N2, N3, N4 | P2 | Se quitan las noticias con `(race_key, stage_day)` oculta; los filtros se construyen con las visibles (§8.2) |
| H1, H5 | P1 | Si la última carrera tiene la etapa oculta: `Stage 7 of Race France is ready to watch ▶`, sin puesto ni veredicto |
| H2 | P2 | Puntos de temporada y dinero sin las filas de `rider_points` y `transactions` de los días ocultos |
| H3 | P3 | La forma se enseña: el jugador la necesita para dar órdenes (decisión del dueño, §16) |
| H4 | P1 | «Where the energy went» de una etapa oculta: `Watch stage 7 to see` |
| H6 | P2 | El apunte del premio de un día oculto sale como `Prize · watch stage 7 to reveal`, sin importe, y el saldo sin él |
| H7, P4 | P1 | Resultados propios y ajenos hasta `visibleHasta` |
| P1, W1, W2, W5 | P2 | Ranking, premios, naciones y equipos restando los `rider_points` de `diasOcultos` (`race_id` es la `raceKey` y lleva `game_day`, mapa 03 §4.1) |
| P2, P3, W4 | P2 | Palmarés, logros, salón de la fama y récords sin las filas `(race_id, season, game_day)` ocultas |
| W3 | P1 | Como C5 |
| P5 | P3 | «Injured» causado por una etapa oculta (la noticia `injury` de §8.2 dice cuál): `Status hidden until you watch stage 7` |
| P6 | P2 / P3 | Puntos de equipo, P2; presupuesto, P3 (sin libro por equipo; decisión, §16) |
| W6 | P3 | Las órdenes enseñan la general en el horizonte (§7.5); el orden por fama queda como está (mapa 03 no lo comprobó) |
| T1, T2, T3 | regla | §7.3 |
| T4 | regla | Un contador de novedades cuenta etapas por ver, nunca resultados |
| T5, T6 | regla | §7.4 |

**El canario (B1, §13)** hace la regla ejecutable: un mundo de prueba con un ganador de nombre, id y tiempo únicos en una etapa protegida no vista; el test recorre **todas** las rutas registradas (hook `onRoute` de Fastify, no una lista a mano), las llama con parámetros del fixture y busca el canario en cada JSON, en el correo y en los títulos. Una ruta que no esté en `POLITICA_DE_RUTAS` hace fallar el test.

### 7.3 El título de la pestaña

Hoy es fijo (`apps/web/index.html` l. 7) y ninguna página toca `document.title` (mapa 03 §0). Regla: un único gancho `useTituloDePestana(partes: readonly ('carrera' | 'etapa' | 'viendo')[])` que solo acepta nombre de carrera, número de etapa y la marca `Watching`; nunca un corredor, un puesto ni un tiempo. Pantalla: `Stage 7 · Race France · Watching · Cycling Star`. El canario renderiza el título de cada página.

### 7.4 Los correos y avisos

No existe ningún correo de juego (mapa 02 §5). E4 decide qué se avisa y con qué baja; E2 fija la plantilla y su prueba: asunto `Stage 7 of Race France is ready to watch`; cuerpo con nombre de la etapa, km, tipo de perfil y un enlace al modo ver; sin puesto, sin ganador, sin «tu corredor terminó», sin imagen de la llegada. El aviso se genera tras `runTick` en el servicio `web`, que es el que tiene el `mailer` (mapa 02 §5), con los datos del calendario, nunca de `stage_results`. El canario lo renderiza.

### 7.5 La previa de la N+1 que destripa la N

La cabecera de la N+1 lleva los líderes en carretera (tras la N), la general de salida (base de la general virtual) y la lista de salida sin los abandonos de la N. Si la N está oculta, la página de la N+1 abre con una puerta (pantalla): `You haven't watched stage 6 yet` con `Watch stage 6` y `Reveal and continue`. La pantalla de órdenes de la N+1 enseña la general del horizonte con el aviso `Standings after stage 5: stage 6 is still to watch`; las órdenes se pueden dar igual, porque son papeles y no dependen del resultado.

### 7.6 Rutas públicas, visitantes y el acta compartible

Un visitante sin cuenta no tiene horizonte (`userId: null`): las superficies P1-P3 se le sirven enteras, pero **toda página de etapa y de carrera abre en modo ver para todo el mundo**, que es lo que significa «por defecto». El acta vive en su propia URL, `/world/races/:raceId/stages/:day/report`, pública e indexable, que es lo que piden la vista de espectador del motor (`docs/motor.md` l. 1504-1514 según el mapa 05 §3) y la captación («El mejor activo que tiene este juego hoy es la crónica de una etapa», `docs/captacion.md` l. 39-42 según el mapa 05 §3). El botón de compartir ofrece dos enlaces: `Share to watch` (por defecto, vista previa `Stage 7 · 187 km · Ready to watch` con el perfil, nunca la llegada) y `Share the report`, marcado como resultado. Un jugador con sesión que abre un `report` de una etapa oculta ve la puerta de §7.5 antes.

---

## 8. El journal, la crónica y las noticias rehechos

### 8.1 Estado en el km t contra acta final

Son dos productos con la misma materia:

- **En la retransmisión**, el texto es la capa de voz sobre el estado: los sucesos narrables con `tEmision ≤ T`, renderizados con plantillas en presente que solo miran lo ya sucedido. `buildChronicle` (`chronicle.ts` l. 289-376) se parte en `pasadasVivas` (identidad, maillot en carretera, filtro `narra`, deduplicación, y los racimos, que se emiten cuando se cierran, en el `bEmision` de su último miembro) y `pasadasActa` (la concesión `cazada`, la criba que se deshace, `time_gap_run`, `juntos`, `respecto` y `desenlace`: todas las que el mapa 07 §5.2 y el mapa 03 §2.3 señalan como mirada al futuro). La lista de lo ya dicho es la pestaña `Commentary` (pantalla) de la reproducción.
- **El acta** es `pasadasVivas` más `pasadasActa`: la crónica de hoy, con el resultado y las clasificaciones de después. Es lo que se comparte.
- **Test B9, no mira al futuro**: para todo horizonte `b`, `vivo(sucesos, b)` es igual a `vivo(sucesos con bEmision ≤ b, b)`. Una línea que cambia al añadir sucesos posteriores es un destripe y falla.
- **La radio del dueño** deja de leer `stage_snapshots.radio`: es `fotoEn(b_k)` en cada foto de km más la capa de detalle, con el mismo contrato `RaceRadio` (`contracts.ts` l. 1476-1480) para no romper su pantalla, que se convierte en el panel de cada grupo de la reproducción y en su propia pestaña cuando la etapa es visible. Como la pertenencia es completa, la radio nombra a quien quiera la vista: el corredor propio siempre (R23.7, `docs/tactica.md` l. 4875-4876, hoy sin código) y la lista de seguimiento desaparece, y con ella los diez primeros de la etapa en la radio desde el km 0 (mapa 07 §5.2.1).
- **Vocabulario**: `PapelDeGrupo` es el mismo código en la barra, la radio y el journal (principio 1). La tabla de SPEC 6.15 (l. 600-615) queda como la traducción inglesa de tres de los cuatro códigos; lo que la radio llama hoy «Peloton» pasa a decir lo mismo que el journal (decisión del dueño, §16).

### 8.2 Las noticias con `seed`, `data` y carrera

```ts
// packages/engine/src/world/news.ts (reescrito: el dato es de códigos e ids, el texto sale al leer)
export type CausaAbandono = 'colapso' | 'fuera_control' | 'lesion' | 'enfermedad' | 'voluntario'
export type NoticiaDatos =
  | { readonly kind: 'stage_win' | 'tt_win' | 'breakaway_win'; readonly raceKey: string; readonly stage: number; readonly riderId: string }
  | { readonly kind: 'one_day_win' | 'one_day_tt_win' | 'gc_win' | 'kom'; readonly raceKey: string; readonly riderId: string }
  | { readonly kind: 'gc_leader'; readonly raceKey: string; readonly stage: number; readonly riderId: string } // nuevo
  | { readonly kind: 'abandon'; readonly raceKey: string; readonly stage: number | null; readonly riderId: string; readonly causa: CausaAbandono }
  | { readonly kind: 'injury'; readonly raceKey: string | null; readonly stage: number | null; readonly riderId: string; readonly diasBaja: number }
  | { readonly kind: 'contract'; readonly riderId: string; readonly teamId: string; readonly mudanza: string | null }
  | { readonly kind: 'retirement'; readonly riderId: string; readonly edad: number }
export type NewsKind = NoticiaDatos['kind']
export interface NombresDeNoticia {
  corredor(id: string): string
  equipo(id: string): string
  carrera(raceKey: string): string
  pais(iso2: string): string
}
export function renderNoticia(locale: 'en', seed: string, datos: NoticiaDatos, n: NombresDeNoticia): string
```

- Se conservan los once `kind` de hoy (`world/news.ts` l. 8-19) para no romper `newsLabel` (`labels.ts` l. 167-185) y se añade `gc_leader` («X takes the race lead»), el titular que la tele da en el cierre y que hoy no existe (mapa 02 §3). `detail` en inglés (`stageRun.ts` l. 1020-1026, 1127-1130; `contracts.ts` l. 326-329 de `db`; `rollover.ts` l. 331) se sustituye por códigos (`causa`, `diasBaja`, `mudanza`, `edad`), y el defecto del espacio antes de la coma de `contract` desaparece con él.
- `emitNews` guarda `kind`, `seed`, `data`, `race_key` y `stage_day` (columnas nuevas, §10) y deja de redactar. La semilla es la que el código ya construye y hoy tira (`win:${raceKey}:${gameDay}:${stageDay}`, `stageRun.ts` l. 1195 y 1214): no lleva nombres.
- `GET /api/news` devuelve `{ kind, seed, data, raceKey, stageDay, gameDay, riderId, personal }` y un diccionario de nombres; la web renderiza con `renderNoticia`. `raceOfHeadline` (`newsFeed.ts` l. 17-24), que adivina la carrera buscando su nombre en el texto inglés, desaparece: el enlace sale de `raceKey`.
- Orden estable dentro del día, que hoy no lo es porque todas comparten `created_at` (mapa 04 §1.2): `game_day` desc, `race_key`, `stage_day` desc, prioridad del `kind` (general, líder, etapa, montaña, abandono, lesión, contrato, retirada), `id`.
- **La lesión se sabe después**: la caída sale en la retransmisión en su bloque como `CRASH · 45 J. MOREAU`, sin gravedad; los días de baja van en la noticia `injury`, atada a la etapa y oculta con ella. Es el orden en que lo sabe la tele (mapa 06 §3.1).

### 8.3 Re-render idéntico y lo que E10 necesita

Mismo `(kind, seed, data)` y mismos nombres dan el mismo texto hoy y dentro de un año (golden por `kind`, B4) y añadir una redacción no reescribe el pasado (hash de un corpus congelado, B5). Lo que E10 recibe de E2: (1) línea, sucesos y noticias sin una palabra; (2) un `render(locale, …)` por superficie (barra, journal, radio, noticia, correo, título), cada una en un fichero, para que un idioma nuevo sea un fichero nuevo; (3) semillas neutras; (4) `genero` en el rótulo y cuentas como números para la concordancia; (5) el vocabulario de grupo como código (`PapelDeGrupo`) y la lista `GROUP_NOUNS` del motor (`sim/coherence.ts` l. 571-635) convertida en lista de códigos permitidos por plantilla; (6) `users.locale`, que existe y nadie lee (mapa 02 §6), como la única fuente del idioma.

---

## 9. Las contrarrelojes

La crono no tiene grupos ni fotos: `simulateStage` la desvía antes de mirar la sonda (`simulate.ts` l. 1264; mapa 01 §4), y cada corredor se simula entero con su traza por bloque `raw`, que se tira (`timetrial.ts` l. 262-348). Su estado es otro tipo, con el mismo reductor de fondo:

```ts
export interface LineaDeCrono {
  readonly formato: 1
  /** Salida de cada corredor, en s del reloj de carrera. No se guarda: se deriva al desempaquetar con
   *  `timeTrialStartOrder` sobre el `input` congelado, que es pura (`startOrder.ts` l. 127, mapa 01 §4). */
  readonly salidas: readonly number[]
  /** Por corredor, décimas de segundo que tarda en cada km (delta), y cada bloque del último km. */
  readonly trazas: readonly (readonly number[])[]
  /** Por corredor, pérdida por percance (ds) y su km (hoy siempre meta/2, `timetrial.ts` l. 312-330). */
  readonly percances: readonly (readonly [CorredorIx, number, number])[]
}
export interface InstanteDeCrono {
  readonly T: RelojDs
  readonly enRuta: readonly { readonly corredor: CorredorIx; readonly km: number; readonly aParcialS: number | null }[]
  readonly sillon: { readonly corredor: CorredorIx; readonly tiempoDs: RelojDs } | null // mejor tiempo en meta hasta T
  readonly parciales: readonly { readonly km: number; readonly orden: readonly { readonly corredor: CorredorIx; readonly tiempoDs: number }[] }[]
  readonly generalVirtual: readonly FilaGeneralVirtual[] | null
  readonly porSalir: number
}
```

Medido con la copia parcheada de `timetrial.js` (`medir-crono.mjs`; los resultados salen idénticos a los del motor en los tres casos): la traza por km de 176 corredores ocupa **14,7 KB** de JSON en 20 km (gzip 2,4) y **20,3 KB** en 26 km (gzip 5,0); la jornada dura 12.212 s por dorsales y 23.581 s con la general a 2 min. Con la traza, cualquier km es un parcial (la tele da dos o tres, mapa 06 §4) y el sillón, los alcances y la general virtual en cada control se derivan; hoy los sucesos solo dan los cambios del mejor parcial en dos controles (mapa 01 §4). La fecha trucada (e) del mapa 01 §1.2 se corrige al grabar: el reloj de carrera de un pinchazo es `salida + tS`. Pantalla: `ON COURSE · 51 S. CARTER · km 18.2 · +0:05 at split 1`, `SPLIT 1 · km 12.4 · 1. OLSEN 15:32 · 2. ARRIETA +0:04`, `HOT SEAT: OLSEN 32:15`, `VIRTUAL GC after split 2 · CARTER leads ARRIETA by 0:23` (mapa 06 §4).

**Ritmo**: la primera hora anónima a ×240, el resto a ×120, los `cronoUltimosSalir` (20) últimos en salir a ×40 y el último km del último corredor a ×4; frenazo tras cada cambio de sillón, de mejor parcial o alcance. **Horizonte**: los tramos son de `tramoCronoS` (1.200 s) de reloj de carrera, porque en una crono el km no ordena nada; el tramo de meta es la llegada del último.

---

## 10. El esquema y la API

### 10.1 Tablas y migraciones

Tres migraciones con `drizzle-kit generate`, desde la `0043` (mapa 04 §6). No se rellena nada viejo: hay reinicio antes del lanzamiento (`docs/ops.md` l. 179-182 según el mapa 04 §8), y todo es nullable o tabla nueva para que el mundo de pruebas siga vivo hasta entonces.

```ts
// packages/db/src/schema.ts
/** 0043. La línea temporal de la retransmisión (§3). Tabla aparte porque `stage_snapshots` no gana
 *  columnas (docs/tactica.md l. 7589-7591): 1:1 con ella, misma clave, escrita en la misma transacción. */
export const stageTimelines = pgTable('stage_timelines', {
  raceId: text('race_id').notNull(),
  stageDay: integer('stage_day').notNull(),
  formato: integer('formato').notNull(),
  linea: json('linea'), // `LineaTemporalGuardada`, null en la crono
  crono: json('crono'), // `LineaDeCrono` empaquetada igual que la línea, null en carretera
  bytes: integer('bytes').notNull(), // JSON.stringify de lo guardado: el banco B6 lo vigila en producción
}, (t) => [primaryKey({ columns: [t.raceId, t.stageDay] })])

/** 0044. Qué ha visto cada jugador (§7.1). */
export const estadoVisionadoEnum = pgEnum('estado_visionado', ['viendo', 'vista', 'revelada'])
export const stageViews = pgTable('stage_views', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  raceKey: text('race_key').notNull(),
  stageDay: integer('stage_day').notNull(),
  estado: estadoVisionadoEnum('estado').notNull().default('viendo'),
  vistoHastaB: integer('visto_hasta_b').notNull().default(0),
  entregadoHastaB: integer('entregado_hasta_b').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.raceKey, t.stageDay] }), index('stage_views_user_idx').on(t.userId, t.estado)])

/** 0045. `news` gana el dato (§8.2); `text` pasa a nullable y solo lo llevan las filas de antes. */
// ADD COLUMN seed text, data jsonb, race_key text, stage_day integer; ALTER text DROP NOT NULL;
// index('news_race_stage_idx').on(t.worldId, t.raceKey, t.stageDay)
```

`stage_snapshots.radio` se sigue escribiendo hasta que la radio del dueño lea de la línea (paso 7 del plan) y después se deja de escribir; la columna se queda nullable y su borrado no es de E2. `columnasVivas.test.ts` (mapa 04 §6) exige escribir `visto_hasta_b` y `entregado_hasta_b`: los escriben las rutas de §10.2.

### 10.2 Endpoints

| Ruta | Sesión | Respuesta (Zod en `packages/shared/src/contracts.ts`) | Presupuesto |
| --- | --- | --- | --- |
| `GET /api/stages/:raceKey/:day/broadcast` | opcional | `EmisionCabecera`: etapa (nombre, km, tipo, crono, `perfil: Segment[]` y pancartas, sin marcas), `rotulos: RotuloCorredor[]` por `CorredorIx`, líderes en carretera, general de salida, número de tramos, `Visionado` si hay sesión. **Sin** catálogo de grupos | ≤ 40 KB (estimado: 176 rótulos de ~120 B) |
| `GET /api/stages/:raceKey/:day/broadcast/:tramo` | opcional | `TramoEmision`: clave, grupos nacidos en el tramo, `mov`, `titulo`, relojes, marcas sueltas, percances, narrables con su `RaceEvent`, detalle; y `meta` (resultado de los 10 primeros con tiempos) solo en el tramo de meta. Con sesión, sube `entregadoHastaB` | ≤ 16 KB (medido 2,6-12,3 KB) |
| `POST /api/stages/:raceKey/:day/seen` `{ b }` | sí | 204; `vistoHastaB = max(actual, b)` | |
| `POST /api/stages/:raceKey/:day/reveal` | sí | `ActaDeEtapa`; estado `revelada` | |
| `GET /api/stages/:raceKey/:day/report` | opcional | `ActaDeEtapa`: la `StageReplay` de hoy sin `radio`, o `409 { bloqueada: true }` si la etapa está oculta para ese jugador | la de hoy menos la radio |
| `GET /api/stages/:raceKey/:day/radio?km=` | opcional | `RaceRadio` de un km, construida de la línea; oculta igual que el acta | ≤ 20 KB |

```ts
// packages/shared/src/contracts.ts: tipos inferidos de los esquemas Zod nuevos (la web valida toda respuesta, mapa 07 §2)
export interface EtapaSinResultado { raceKey: string; day: number; name: string; km: number; kind: string; timeTrial: boolean; perfil: Segment[]; pancartas: Banner[] }
export interface EmisionCabecera { etapa: EtapaSinResultado; rotulos: RotuloCorredor[]; lideresEnCarretera: RaceLeaders; generalDeSalida: { riderId: string; puesto: number; deficitS: number }[]; tramos: number; visionado: Visionado | null }
export interface ResultadoDeMeta { primeros: { riderId: string; puesto: number; tiempoS: number; bonificacionS: number }[] }
export interface TramoEmision { tramo: number; desdeB: number; hastaB: number; clave: [number, string]; gruposNuevos: [number, string][]; mov: number[]; titulo: number[]; relojes: number[][]; sueltas: number[]; percances: number[]; narrables: { i: number; bEmision: number; tEmision: number; suceso: RaceEvent }[]; detalle: LineaTemporalGuardada['detalle']; meta: ResultadoDeMeta | null }
export type ActaDeEtapa = Omit<StageReplay, 'radio'> // `stageReplaySchema` de hoy, contracts.ts l. 1482-1533
```

El catálogo de grupos **no** va en la cabecera: su tamaño cuenta cuánto se rompe la etapa (14 ids en una llana, 140 en Colombia, medido), y «lo que mide la duración revela el final» (mapa 06 §7.2, regla 3). Cada tramo trae los grupos que nacen en él. La ruta de hoy `GET /api/races/:raceId/stages/:day` se conserva durante la transición solo para etapas visibles y se retira en el paso 10.

**Peso.** Hoy la etapa pesa 0,95-2,16 MB sin comprimir en una respuesta (mapa 02 §7) y la API no comprime. Con este diseño, una etapa vista entera son la cabecera, 18-28 tramos y el acta: 24-104 KB de línea (medido) más ~21 KB de rótulos (estimado) más 16-42 KB de sucesos (medido, mapa 01 §5), por debajo de 200 KB en total; y se añade `@fastify/compress` para JSON de más de 1 KB, porque la línea comprime entre 3,4 y 6,2 veces con gzip (medido).

---

## 11. Lo que el motor tiene que guardar al correr la etapa

**Frontera 3 intacta**: `StageOutput` no gana ni un campo (`docs/tactica.md` l. 246-249 y 7597-7611). Lo nuevo entra por la sonda, que es observación, o como datos de sucesos que ya existen. Todo lo que no se grabe al correr no se recupera después, porque cada subida de versión deja sin replay fiel a lo anterior (`checkReplay`, `raceRadio.ts` l. 49-55; mapa 01 §6).

| Qué | Cómo | ¿Sube `ENGINE_VERSION`? | Prueba |
| --- | --- | --- | --- |
| La foto en **cada bloque** | el grabador pide `atKm` con el centro de cada bloque; la sonda ya lo admite (`simulate.ts` l. 1944-1950, 8996-9023) | no: no cambia el motor | I4: huella idéntica, 15 de 15 medido |
| `raceLearning` sin cambios | `trabajaronParaOtro` (`stageRun.ts` l. 527-532) solo apunta en los bloques de `radioKmPoints`: con fotos cada 100 m el muestreo sería otro y el aprendizaje cambiaría | no | test de `stageRun`: mismo conjunto con la sonda vieja y la nueva |
| `StageProbe.onEvent?(e: RaceEvent)` | `EventLog` (`events.ts` l. 9-49) recibe un oyente opcional; `simulateStage` y `simulateTimeTrial` le pasan el de la sonda. El grabador fecha cada suceso con el número de fotos recibidas: las del bloque `i` llegan al final del bloque, después de sus sucesos. Lo emitido tras el bucle (meta, corte) va a `bloques`; `rider_defies_team`, que `announceRebels` inserta al cerrar (`simulate.ts` l. 9081), toma el `bEmision` del siguiente suceso de su protagonista | no: observación | I4 con oyente |
| `StageProbe.onRiderTrace?(riderId, salidaS, relojes)` en la crono | `simulateStage` deja de ignorar la sonda en la crono (l. 1264) y `simulateTimeTrial` la llama al cerrar cada corredor con `raw · noise` (`timetrial.ts` l. 345-348) | no: observación | I5; medido con la copia parcheada: resultados idénticos, 3 de 3 |
| Orden completo de volantes y cimas | `sprint_intermediate` gana `orden` (hasta 8 ids) y `puntos`, y `climb_kom` gana `orden` y `puntosOrden`: el motor ya los reparte (`sprintPoints`, `constants.ts` l. 5032; tabla de cima, l. 5036) y solo emite al ganador (mapa 01 §1.4) | **sí, a la v90**: cambia lo que viaja en `events` (la regla de la fila 17c, `docs/tactica.md` l. 7435) | `journal.test.ts` con las claves nuevas; re-sellado de huellas |

**Lo que NO se pide al motor.** Las caídas como suceso: el grabador las toma de `output.incidents`, que ya tiene km y corredor (`types.ts` l. 358-365), y las guarda como `percance`; la gravedad y los días de baja no entran en la línea (§8.2). Las fechas trucadas del mapa 01 §1.2 no se tocan: `bEmision` pone cada suceso donde se supo y `km`/`tS` siguen siendo la fecha del hecho para el texto. La fase de carrera y el tiempo meteorológico no los necesita la pantalla de E2.

**Lo que se deriva al leer**: `kmAMeta`, posiciones en el perfil, huecos y tendencia, papeles, rótulos, general virtual, el instante entero y la crono en cualquier `T`.

**Coste.** CPU: +4 % a +27 % por etapa, mediana +10 % (medido en 15 pares con y sin sonda, máquina compartida; el mapa 01 midió de +1,5 % a +4 % con la sonda cada 100 m, §5). Memoria: el grabador **no** guarda las fotos; compara cada una con la anterior y emite sucesos, así que ocupa lo de dos fotos (el prototipo las guardaba todas y eso no vale en el tick). Autocomprobación de I1 al grabar: 15-24 ms por etapa (medido, incluye proyectar y comparar cada foto de km). Disco por temporada: unos 19 MB de `stage_timelines` contra unos 40 MB de radio de hoy (estimado con las medianas de §3.8 por tipo de etapa y los recuentos del mapa 04 §5).

---

## 12. Constantes

Bloque nuevo `BROADCAST` en `packages/engine/src/constants.ts`: la web y la API ya importan el motor (mapa 07 §2) y así el grabador, la API y el reproductor leen el mismo número. No lo lee la simulación, así que añadirlo no cambia el motor.

```ts
export const BROADCAST = {
  /** Cada cuántos km una foto clave: unidad de entrega del horizonte y suma de control (I3). Un tramo de 10 km son 2,6-12,3 KB (medido). */
  fotoClaveKm: 10,
  /** Bloques finales con marca de reloj en cada uno: el último km, donde la tele pone carteles cada 100 m. */
  ultimoTramoBloques: 10,
  /** Resolución del reloj guardado, en s. Los huecos se enseñan al segundo; la décima sirve para el último km. */
  relojResolucionS: 0.1,
  /** Km que una condición tiene que sostenerse para cambiar el papel de un grupo: que la barra no parpadee. */
  nombreHisteresisKm: 1,
  /** La caza tiene que llevar esta fracción del mayor de detrás: la regla del motor, no una segunda. */
  cazaFraccionMinima: STAGE.gapChaseMainFraction, // 0,5 (l. 2657)
  /** Hasta este tamaño un grupo se lista entero: el tope con que la radio ya nombra (raceRadio.ts l. 611). */
  nombrarGrupoHasta: 12,
  /** Nombres que la frase de un grupo destaca; el resto se cuenta («and three more»). */
  destacadosMax: 2,
  /** Puestos de la general de salida que se ganan una línea en el rótulo. */
  rotuloGeneralTop: 20,
  /** Ventana de la tendencia del hueco («▼0:18 in 5 km»): la agenda pide «si sube o baja». */
  tendenciaKm: 5,
  /** General virtual: los primeros que se miran y el hueco máximo con el líder para sacarla. */
  generalVirtualTop: 10, generalVirtualMaxS: 300,
  /** Segundos reales que vive el rótulo del momento. */
  rotuloVidaS: 5,
  /** La curva: [km a meta desde, s de carrera por s real]. Medido con ella: 5:02 a 15:03 por etapa (§5). */
  ritmo: [[60, 120], [20, 60], [5, 30], [1, 15], [0, 4]] as const,
  /** Tras un hito ya enseñado, `frenoS` s reales a ×`frenoVelocidad`: que se vea, sin anunciarlo antes. */
  frenoVelocidad: 12, frenoS: 4,
  /** Plantillas narrables que frenan la reproducción (las de la cabeza de carrera y las pancartas). */
  hitosNarrables: ['attack_sticks', 'breakaway_formed', 'breakaway_caught', 'front_group', 'peloton_split', 'peloton_selection', 'peloton_regroup',
    'echelon_split', 'leader_dropped', 'climb_kom', 'sprint_intermediate', 'bridge_made', 'move_merge', 'time_gap', 'rider_abandons',
    'puncture', 'mechanical', 'final_km', 'bunch_sprint', 'stage_win'] as const,
  /** Crono: primera hora anónima, el resto, los últimos en salir y su tramo de entrega en s de carrera. */
  cronoPrimeraHoraVelocidad: 240, cronoVelocidad: 120, cronoUltimosSalir: 20, cronoUltimosVelocidad: 40, tramoCronoS: 1200,
  /** El cliente pide el tramo siguiente a esta distancia del final del actual: sin cortes, sin adelantarse más. */
  pedirTramoAntesKm: 2,
  /** Cada cuántos s reales informa el cliente de su posición (reanudar). */
  vistoCadaS: 15,
  /** Días reales tras el final de una carrera en que sus etapas no vistas dejan de ocultarse (decisión, §16). */
  caducidadDiasReales: 7,
  /** Presupuesto (B6): JSON por etapa en línea, mediana y máximo; crono; tramo. */
  lineaMedianaMaxBytes: 65_536, lineaMaxBytes: 131_072, cronoMaxBytes: 32_768, tramoMaxBytes: 16_384,
} as const
```

---

## 13. Bancos y tests

Los de la casa se escriben desde la regla, no desde lo que hoy sale (mapa 05 §10, lección 5). Parten de B1-B8 del mapa 07 §5.3 y añaden los invariantes del modelo:

| Id | Qué afirma | Cómo se mide | Listón | Dónde |
| --- | --- | --- | --- | --- |
| I1 | La foto reducida es la foto del motor | fotos sintéticas en `broadcast/reducir.test.ts`; y las 24 etapas del mapa 07 §7 con `radioKmFrom` en cada km | 0 discrepancias (medido hoy: 0 en 3.246) | rápido y bancos |
| I2 | El instante coincide con la foto donde se mide | `instanteEn(r_g(k))` por grupo y km; tránsito cada 30 s | igualdad salvo deduplicados; tránsito p90 ≤ 2 | bancos |
| I3 | Claves y empaquetado | `clave(k+10) = reducir*(clave(k), …)`; `desempaquetar ∘ empaquetar = id` | igualdad | rápido |
| I4 | Mirar no cambia la carrera | extiende `sim/raceRadio.test.ts` l. 748-799: sonda en cada bloque, `onEvent` y traza de crono | huella idéntica | bancos |
| I5 | La traza de la crono cuadra con el resultado | `salida + traza final + pérdida = results.tiempoS` por corredor | igualdad al segundo | rápido |
| B1 | Nada de una etapa oculta sale del servidor | canario en PGlite; todas las rutas por `onRoute`, correo y títulos (§7.2) | 0 apariciones; ruta sin política = rojo | rápido |
| B2 | Los sucesos casan con el estado | por suceso, sus protagonistas en carrera en `bEmision`; `front_group.size` y `time_gap.leadSize` contra la cabeza de la foto; `breakaway_formed`, todos juntos | 0 en las familias exactas; en las demás, la tasa medida y escrita en el test, como `coherence.test.ts` | bancos |
| B3 | Cada escapado lleva rótulo | cada 30 s, todo miembro de grupo ≤ 12 con `lleva` resuelto | 100 % (hoy 47-64 % fuera del pelotón en reina) | bancos |
| B4 | Re-render idéntico | golden por `kind` de noticia y por plantilla en `en` | igualdad | rápido |
| B5 | Añadir una redacción no reescribe el pasado | hash de un corpus congelado de sucesos y noticias | hash fijo; se re-sella a propósito | rápido |
| B6 | Tamaño | las 24 etapas: JSON de la línea, de la crono y de cada tramo; en producción, `stage_timelines.bytes` | constantes de §12 | bancos |
| B7 | Cobertura | cada plantilla emitida tiene render vivo y de acta; cada `PapelDeGrupo`, `PullMotive` y `MaillotLlevado` tiene texto; guardarraíl de tipos motor/contrato como el de `PullMotive` (`apps/api/src/raceRadio.test.ts` l. 148-152) | 0 huecos; error de `typecheck` | rápido |
| B8 | Coste en el cliente | `instanteEn` por fotograma y `safeParse` de un tramo, en Colombia e5 | ≤ 2 ms en Node (estimado ×3-5 en móvil) | rápido |
| B9 | El journal vivo no mira al futuro | `vivo(s, b) = vivo(s filtrados a bEmision ≤ b, b)` para todo `b` | igualdad | rápido |
| B10 | El ritmo no anuncia nada | la curva con la línea truncada en `T` es igual a la curva de la línea entera hasta `T`; bandas de duración por tipo de etapa | igualdad; llana ≤ 7 min, reina ≤ 16 min | bancos |

**Re-sellados esperados** (mapa 07 §1.5): las variantes en presente de `stageJournal.test.ts`, `world/news.test.ts` y `db/abandon.test.ts` (el texto se comprueba renderizando), `newsFeed.test.ts` (`raceOfHeadline` desaparece), `raceTimeline.test.ts` l. 120-128 (el buscador por ganador), los de radio guardada si se deja de escribir `radio`, y `ENGINE_VERSION` una vez (v90). **No se re-sellan** `jerseys.test.ts` ni `leaderJerseys.test.tsx`: `JerseyKind` sigue con tres valores y las categorías nuevas viven en `MaillotLlevado`.

---

## 14. Plan por pasos, tests primero

| Paso | Qué | Tests que van antes | Depende de | PR (estimado) |
| --- | --- | --- | --- | --- |
| 1 | `broadcast/`: tipos, `reducir`, `fotoEn`, `instanteEn`, empaquetar y desempaquetar | I1 e I3 sobre fotos sintéticas; I2 sobre un caso de fusión con tránsito | | 1 |
| 2 | Grabador en `packages/db`: sonda en cada bloque con diferencia sobre la foto anterior, título por bloque, marcas de reloj, percances, autocomprobación I1; `trabajaronParaOtro` solo en km; migración `0043` | I4, test de `stageRun` del aprendizaje, B6 | 1 | 1 |
| 3 | Noticias con `seed` y `data` (`0045`), render al leer, orden estable, `gc_leader` | B4, B5, `abandon.test.ts` re-sellado | | 1 (**va antes del reinicio**: `docs/agenda.md` l. 131-133 según el mapa 04 §8) |
| 4 | Motor: `onEvent` y traza de crono (observación); en PR aparte, orden de pancartas y v90 | I4, I5; `journal.test.ts` con las claves nuevas | 2 | 2 |
| 5 | Rótulos: `rotulo.ts`, `titulosDesdePalmares` | B3; tabla de casos de la regla UCI (líder campeón, día 1, disciplina, sub-23) | 1 | 1 |
| 6 | `stage_views` (`0044`), `horizonte.ts`, `POLITICA_DE_RUTAS` | B1 en rojo primero: el canario falla con todas las rutas sin clasificar, y el paso las clasifica | 3 | 2 |
| 7 | API de emisión: cabecera, tramos, `seen`, `reveal`, `report`, radio desde la línea; `@fastify/compress`; contratos Zod con test de contrato (hoy no hay ninguno de etapa, mapa 07 §5.2) | B1 sobre las rutas nuevas, B6 por tramo, contratos | 2, 5, 6 | 2 |
| 8 | Web: reproducción (capa fija, barra, perfil con cursores, rótulos, mandos, móvil), título de pestaña | B8, B10, renderizado estático de la barra con un instante fijo | 7 | 3 |
| 9 | Journal vivo y acta: `buildChronicle` partido, plantillas en presente, `Commentary` | B9, B7 | 4, 7 | 1 |
| 10 | Las 48 superficies al horizonte, tarjeta `To watch`, plantilla de correo, retirada de la ruta vieja, dejar de escribir `radio` | B1 completo | 6, 8 | 2 |
| 11 | Crono: `LineaDeCrono`, instante, pantalla y ritmo | I5, B6 de crono, B10 | 4, 8 | 1 |

Unos 17 PR. Los pasos 1-2 y 3 pueden ir en paralelo; el 3 tiene fecha (el reinicio). Cada paso que toca el motor lleva su comprobación de que no tocó la Frontera 3.

---

## 15. Riesgos y fronteras

- **E3** (sistema visual): E2 decide qué se enseña y cuándo; E3 decide cómo. E2 le pide `ChampionJersey { ambito, pais, disciplina, semillaMaillotEquipo }`, el rediseño del maillot de equipo detrás de la prop `semillaMaillot`, y la densidad de la barra en 360 px (la maqueta de §4 es una estimación). Riesgo: que el marcador provisional del campeón nacional se quede para siempre; el paso 5 lo marca como provisional en el propio componente.
- **E4** (avisos): E2 fija la propiedad (ningún aviso destripa) y la plantilla; E4, qué se avisa y con qué baja. Riesgo: un aviso nuevo que no pase por el canario; B1 renderiza todos los correos registrados.
- **E6** (experiencia): E2 añade la reproducción, la tarjeta `To watch` y la puerta de §7.5; no rehace menús. La pestaña `Race Radio` pasa a ser el panel de grupo más una pestaña de etapas vistas.
- **E10** (idiomas): recibe un `render` por superficie, semillas neutras, `genero` y códigos. Riesgo: que un idioma elija variantes distintas y parezca otro hecho; B5 por idioma y la regla «idéntico es el hecho» (§3.10).
- **E12** (calendario): E2 consume `FuenteDeTitulos`. Riesgo: títulos que no sean `mundo` o `nacional` (continentales, crono por equipos); `AmbitoTitulo` y `Disciplina` se amplían, y `maillotLlevado` tiene un `case` por valor.
- **E13** (enciclopedia): rachas y récords son suyos; E2 solo añade `gc_leader`.
- **Táctica**: R23.4 y R23.8 traerán plantillas nuevas, que B7 obliga a tener render vivo y de acta; el paso 17d reescribirá `last-race`, que H1 y H5 ya consumen a través del horizonte; un maillot de joven (paso 4) entra como `JerseyKind` nuevo y `maillotLlevado` lo coloca en la prioridad UCI («others», 2.6.018).
- **Semántica del instante**: I2 no es exacto; un corredor puede verse unos segundos «entre grupos» (p90 0-2, medido). Es lo que la tele llama tierra de nadie y se enseña así, no se esconde.
- **Relojes que retroceden**: la puerta de `rejoinGapSeconds` hace retroceder el reloj de cabeza en 0-2 bloques por etapa y el de un grupo en 0-3 (medido); el reproductor fuerza la monotonía y un cursor nunca vuelve hacia atrás en el perfil.
- **CPU del tick**: +10 % de mediana y +27 % en el peor caso medido; en los días de 187 etapas de los campeonatos nacionales (mapa 02 §1.3) eso suma. Si hiciera falta, la foto cada bloque se puede pedir solo donde el recorrido o la carrera lo piden (últimos 20 km y puertos) sin cambiar el formato; no se propone de entrada porque el error de §3.6 sin marcas en los cambios de composición llega a 3,5 km.

---

## 16. Decisiones que son del dueño

| # | Decisión | Valor por defecto | Consecuencia |
| --- | --- | --- | --- |
| 1 | Qué etapas se protegen | las de las carreras de su corredor (o de su equipo, si es mánager) y las que empieza a ver | el resto del mundo se ve sin filtro; el ranking solo resta etapas protegidas |
| 2 | Caducidad de lo no visto | 7 días reales tras el final de la carrera; nunca mientras está en curso | quien vuelve tras una semana encuentra su gran vuelta por ver; tras dos, revelada |
| 3 | Visitante sin cuenta | modo ver por defecto, acta a un clic, P1-P3 sin recorte | la captación comparte el acta por su URL; el enlace de lista lleva a ver |
| 4 | Vocabulario de grupos | los de SPEC 6.15 en toda superficie: `Lead group`, `Chase group`, `Bunch`, más `Gruppetto` | la radio deja de decir «Peloton» y «2nd group»; un solo nombre por concepto (v34) |
| 5 | Duración de la reproducción | la curva de §5: 5 min una llana, 11-15 una reina (medido) | más corta = más frenazos perdidos; `Highlights` en 2-3 min para quien tenga prisa |
| 6 | Contadores sin fecha | forma visible; salud oculta si la lesión viene de una etapa oculta; presupuesto del equipo visible | la forma puede insinuar el esfuerzo de ayer; a cambio, se pueden dar órdenes |
| 7 | Maillot delegado a un campeón | la regla de hoy: pasa al siguiente sin mirar títulos | la UCI dejaría al campeón con su maillot (2.6.018); cambiarlo es tocar `assignLeaderJerseys` |
| 8 | Campeón nacional antes de E3 | maillot del equipo con banda de la bandera y la línea `National champion` | se ve «el campeón de Italia» desde el primer PR; alternativa: solo texto |
| 9 | ¿El resumen cuenta como visto? | sí | quien ve `Highlights` ya no tiene la etapa oculta en ninguna superficie |
| 10 | Noticia `gc_leader` | sí | el feed cuenta el cambio de líder, que hoy no cuenta (MVP l. 160 pide que «cuente la historia») |
| 11 | Orden de la lista de una escapada | por dorsal | estable; alternativa, por carretera dentro del grupo (cambia cada km) |
