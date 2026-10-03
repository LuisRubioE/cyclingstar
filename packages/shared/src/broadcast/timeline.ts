/**
 * LA LÍNEA TEMPORAL DE UNA ETAPA (E2, docs/retransmision.md §4.1 y §4.2): las unidades, sus cuatro
 * redondeos y los tipos de lo que se graba al correr la etapa. Aquí no hay lógica: la usan el
 * grabador (paso 4b), el reductor y el corte (3a), el reloj de revelado (`reveal.ts`) y la API.
 *
 * Nace en el PR 2 con los tipos y sin el código que los rellena, porque otros ficheros los importan
 * antes (decisión 17-z): `reveal.ts`, `constants.ts` (`CueClass`, `PaceZone`) y la API.
 *
 * Una regla de importación vale para todo el paquete: `shared` no importa nada de `packages/engine`
 * ni de `packages/db`. Los ciclos con `jerseys.ts` son solo de tipos (`import type`), que se borran al
 * compilar. Y este fichero, como `reveal.ts`, no puede leer `BROADCAST` ni `SPOILER` (15-b): es del
 * lado del grabador, y un ajuste de pantalla no puede cambiar lo que se graba sin pasar los bancos.
 */
import type { PullMotive } from '../contracts.js'
import type { Distinction, WornJersey } from '../jerseys.js'

// ------------------------------------------------------------------------------- 4.1 Unidades

/** Bloque de 100 m del motor, entero desde 0: km = (b + 0,5) · dx (simulate.ts, `kmAt`). */
export type Block = number
/** Décimas de segundo de carrera, entero; desde la salida común; en crono, desde la primera salida. */
export type Ds = number
/** Segundos de carrera en coma flotante: solo en memoria, nunca guardados ni servidos. */
export type RaceS = number
/** Posición en `stage_snapshots.input.riders`, que es orden de dorsal (stageRun.ts, `orderBy`). */
export type RiderIx = number
/** Posición en `StageTimeline.groups`: orden de aparición (su marca de nacimiento); 0 = el pelotón de salida. */
export type GroupIx = number

/** Los únicos cuatro sitios donde un número del formato pierde precisión. Nadie redondea por su cuenta. */
export const toDs = (s: RaceS): Ds => Math.round(s * 10)
export const fromDs = (d: Ds): RaceS => d / 10
export const toKm10 = (km: number): number => Math.round(km * 10)
export const fromKm10 = (k10: number): number => k10 / 10

// ----------------------------------------------------------------------- 4.2 La línea temporal

/** Cómo nació un grupo: el prefijo de su id en el motor (`peloton`, `mov-N`, `shed-N`). */
export type GroupOrigin = 'start' | 'attack' | 'shed'

/** Un grupo de la etapa, de su primer a su último bloque con gente. Se graba: hoy el id se tira. */
export interface GroupCatalogEntry {
  /** existe: SnapshotRider.groupId, tal cual: 'peloton', 'mov-3', 'shed-7' */
  readonly id: string
  /** se graba: del prefijo del id; un prefijo que no sea de los tres hace fallar el grabado (§4.3) */
  readonly origin: GroupOrigin
  /** se graba: primer bloque con gente; lleva marca de reloj (§3.4) */
  readonly bornB: Block
  /** se graba: último bloque con gente, con marca; null si llega a meta */
  readonly diedB: Block | null
  /** se graba: el grupo al que fue la mayoría de los suyos en diedB (D-03); null si llega a meta o abandonan todos */
  readonly successor: GroupIx | null
}

/** El percance de un corredor: `Incident['tipo']` del motor, un código cerrado que se guarda como cadena. */
export type MishapKind = 'caida' | 'pinchazo' | 'averia'

/**
 * LO ÚNICO QUE CAMBIA LA FOTO de un bloque al siguiente. Unión cerrada: `reducePhoto` (3a) tiene un
 * `case` por variante. Orden dentro de un mismo bloque, fijo: out, move, main, clock, mishap. Todas se
 * graban (hoy nada de esto se guarda).
 */
export type StateEvent =
  /** cambian de grupo al final de b, por RiderIx creciente */
  | {
      readonly t: 'move'
      readonly b: Block
      readonly to: GroupIx
      readonly riders: readonly RiderIx[]
    }
  /** deja de estar en la foto: abandono */
  | { readonly t: 'out'; readonly b: Block; readonly rider: RiderIx }
  /** el título de pelotón pasa a group (regla por bloque, D-03) */
  | { readonly t: 'main'; readonly b: Block; readonly group: GroupIx | null }
  /** marcas de reloj exactas en b (los cuatro sitios de §3.4) */
  | {
      readonly t: 'clock'
      readonly b: Block
      readonly marks: readonly (readonly [GroupIx, Ds])[]
    }
  /** de output.incidents (D-13) */
  | {
      readonly t: 'mishap'
      readonly b: Block
      readonly rider: RiderIx
      readonly kind: MishapKind
      readonly lostDs: Ds
    }

/**
 * La pertenencia completa cada `TIMELINE.keyPhotoKm` km y al empezar el último km. Suma de control y
 * acceso aleatorio del servidor (I3); NUNCA unidad de entrega (D-06): los tramos no la llevan.
 */
export interface KeyPhoto {
  /** el bloque de la foto de km, estado al final del bloque */
  readonly b: Block
  /** por RiderIx: su GroupIx, o −1 si ya no corre */
  readonly groupOf: Int16Array
  /** el título en b (lo repite la serie `main`: en el formato guardado no va aquí, §4.3) */
  readonly main: GroupIx | null
}

/** Quién tira y por qué: lo de hoy de la radio, sin `watching`, que es la lista que destripa (D-16). */
export interface Puller {
  readonly rider: RiderIx
  readonly motive: PullMotive | null
  /** null si no tira por nadie */
  readonly forRider: RiderIx | null
}

/**
 * LA CAPA DE DETALLE de un grupo en un km de foto: el microscopio del dueño. Existe: la calcula
 * `radioForStorage` con las mismas funciones; se graba re-indexada, solo en los bloques de
 * `radioKmPoints` (D-08).
 */
export interface GroupDetail {
  readonly g: GroupIx
  /** existe: mediana de sus hombres, techo 75; null si no se puede medir. Guardada a 0,1 km/h */
  readonly speedKmh: number | null
  /** existe: los que están en el turno de verdad, aunque la lista se corte en 12 */
  readonly pullingTotal: number
  /** existe: tope 12 (STORED_PULLERS_MAX), turno de 3 km contado en fotos (TURNO_KM) */
  readonly pullers: readonly Puller[]
  /** existe: el más caro de los suyos en el km */
  readonly mishap: { readonly kind: MishapKind; readonly lostS: number } | null
}

/**
 * LA FOTO: el estado espacial canónico al final del bloque b (D-01, §3.2). Se deriva: `photoAt` (3a)
 * desde la foto clave anterior; nunca se guarda entera.
 */
export interface Photo {
  readonly b: Block
  /** por RiderIx: su GroupIx, o −1 si ya no corre. Nadie la muta: el reductor copia */
  readonly groupOf: Int16Array
  /** el pelotón (título por bloque, D-03) */
  readonly main: GroupIx | null
  /** reloj de cada grupo vivo al cruzar b: exacto en una marca, interpolado entre dos */
  readonly clock: ReadonlyMap<GroupIx, Ds>
  /** la capa de detalle, solo en los bloques de radioKmPoints */
  readonly detail: readonly GroupDetail[] | null
}

/**
 * UN SUCESO NARRABLE fechado cuando se SUPO. El `RaceEvent` del motor viaja tal cual en
 * `stage_snapshots.events`; esto añade el bloque de emisión y la hora de enseñarlo, y lo copia para no
 * depender de él al cortar.
 */
export interface TimelineEvent {
  /** se graba: índice en stage_snapshots.events; −1 si es sintetizado (caída, D-13) */
  readonly source: number
  /** existe: la del motor, como cadena (D-10); nunca un índice */
  readonly plantilla: string
  /** existe: guardado en décimas; solo de pantalla (la voz lee el km original por `source`, 4-h) */
  readonly km: number
  /** existe: la fecha del HECHO, el reloj que puso el motor; guardado en Ds */
  readonly tS: RaceS
  /** se graba: bloque en que el motor lo emitió (sonda onEvent, §5.2); `blocks` si fue tras el bucle */
  readonly bEmit: Block
  /** se graba: cuándo se enseña (revealSOf, §4.7); guardado en Ds */
  readonly revealS: RaceS
  /** existe: `protagonistas` como RiderIx, en su orden */
  readonly riders: readonly RiderIx[]
  /** existe: tal cual; las claves `…Id` siguen siendo riderId */
  readonly datos: Readonly<Record<string, number | string>> | null
}

/** Lo que da `onBanner` en cada pancarta disputada (I-18): el orden y los puntos que hoy no se emiten. */
export interface BannerResult {
  /** existe: BannerType */
  readonly kind: 'meta_volante' | 'cima'
  /** existe: km del bloque de la pancarta */
  readonly km: number
  /** existe: ClimbCategory de la cima ('HC', 'cat1'…); null en una volante */
  readonly cat: string | null
  /** existe: STAGE_FEATURES en etapas con rasgos reales; si no, null */
  readonly name: string | null
  /** se graba: reloj del grupo del primero que puntúa, no el del primer grupo */
  readonly revealS: RaceS
  /** se graba: los que puntúan, por sprintPoints o climbPoints */
  readonly order: readonly { readonly rider: RiderIx; readonly points: number }[]
}

/** De qué etapa sale un dato del reparto (la procedencia, D-15): si esa etapa está velada, el dato no viaja (B13). */
export interface StageRef {
  /** `${raceId}:s${season}` (raceKey.ts) */
  readonly raceKey: string
  /** desde 1 */
  readonly stageDay: number
}

/** Lo que la cabecera sirve del recorrido: nunca un suceso ni una marca de dónde pasa algo (D-17). Se graba congelado. */
export interface ProfileStrip {
  /** existe: cota al final de cada km entero, de 0 a ceil(lengthKm), en metros enteros */
  readonly altM: readonly number[]
  /**
   * footKm: inicio de la racha `subida` que acaba en la cima; topKm: km de la pancarta `cima`; cat: su
   * ClimbCategory; lenKm y avgPct se derivan al grabar; name: STAGE_FEATURES, o null sin rasgos reales.
   */
  readonly climbs: readonly {
    readonly footKm: number
    readonly topKm: number
    readonly cat: string
    readonly lenKm: number
    readonly avgPct: number
    readonly name: string | null
  }[]
  /** existe: km de cada pancarta `meta_volante` del perfil */
  readonly sprintsKm: readonly number[]
  /** existe: StageProfile.laps ?? 1 */
  readonly laps: number
}

/** El tiempo de la etapa, congelado sin tocar el motor (D-14, I-19): las mismas funciones puras que usa la carrera. */
export interface StageWeather {
  /** existe: stageWeather(seed, input.lugar).grados, a 0,1 °C */
  readonly tempC: number
  /** existe: su `lluvia`, en [0, 1] */
  readonly rain: number
  /** un tramo por STAGE.weather.roadTurnKm, fundidos los iguales seguidos; crosswind se deriva al grabar */
  readonly spans: readonly {
    readonly fromKm: number
    readonly rain: number
    readonly windDir: number
    readonly windKmh: number
    readonly crosswind: boolean
  }[]
}

/** El equipo con el que se corrió la etapa y su equipación de ESE día: un traspaso posterior no reescribe el pasado (D-15). */
export interface CastTeam {
  readonly teamId: string
  readonly jerseySeed: string
}

/** Un corredor del reparto congelado: lo arma packages/db al correr (buildTimelineCast, D-15) y el grabador lo guarda. */
export interface CastRider {
  /** igual a su posición en cast.riders; explícito para que un test lo compruebe */
  readonly rider: RiderIx
  /** existe: input.riders[].riderId */
  readonly riderId: string
  /** existe: input.riders[].bib, de race_rosters.bib */
  readonly bib: number | null
  /** existe: índice en TimelineCast.teams, el equipo CON EL QUE CORRIÓ; null = individual */
  readonly team: number | null
  /** existe: riders.country, ISO-2 en mayúsculas */
  readonly country: string
  /** existe: riders.gender; para la concordancia de E10 */
  readonly gender: 'M' | 'F'
  /** existen: gcRank y gcDeficitSeconds de la entrada; from se graba: la N−1; los tres null sin general */
  readonly start: {
    readonly gcRank: number | null
    readonly gcDeficitS: number | null
    readonly from: StageRef | null
  }
  /** se graba: wornJerseys (§4.8, regla en §7.2) sobre las clasificaciones tras la N−1 y los títulos */
  readonly worn: WornJersey
  /** se graba: distinctions (§7.2), cada una con su `from` */
  readonly distinctions: readonly Distinction[]
  /** se graba: victorias de palmares de carreras cuya fila gc tiene game_day ≤ día de la etapa − SPOILER.expiryGameDays */
  readonly knownWins: number
}

/** El reparto congelado (D-15): riders por RiderIx; teams por primera aparición en riders. */
export interface TimelineCast {
  readonly riders: readonly CastRider[]
  readonly teams: readonly CastTeam[]
  /**
   * se graba (8-g, 4-u): los BROADCAST.previewAttrTop mejores inscritos por el atributo del tipo de
   * etapa, por valor decreciente y, a igual valor, por RiderIx; con los atributos que lee runOneStage
   * al empezar la etapa, antes de que el aprendizaje los cambie.
   */
  readonly favourites: readonly {
    readonly rider: RiderIx
    readonly why: 'sprint' | 'hills' | 'climb' | 'tt' | 'cobbles'
  }[]
}

/** La contrarreloj (I-08, D-23): lo que `simulateTimeTrial` calcula y tira; lo entrega la sonda onTimeTrialRide (§5.2). */
export interface TimeTrialTrace {
  /** existe: timeTrialStartOrder(input.riders).mode, 'general' o 'dorsales' */
  readonly order: 'gc' | 'bib'
  /** existe: su intervalS, 120 con general o 60 por dorsales */
  readonly intervalS: number
  /** existe: los controles de ttSplitChecks a ⅓ y ⅔, sin los que caen a menos de ttSplitMinKm de salida o meta */
  readonly checksKm: readonly number[]
  /** existe: por RiderIx, su startS del plan, en Ds */
  readonly startDs: readonly Ds[]
  /** se graba: por RiderIx, reloj propio al acabar cada km entero; la última entrada es la meta (10 · tiempoS, 9-a) */
  readonly kmClockDs: readonly (readonly Ds[])[]
  /** se graba (9-b): por RiderIx y control, 10 · Math.round(raw[idx] · noise), sin la pérdida del percance; [] sin controles */
  readonly checkClockDs: readonly (readonly Ds[])[]
  /** existen: el percance de cada corredor; km, el que pone el motor; lostDs, perdidaS · noise */
  readonly mishaps: readonly {
    readonly rider: RiderIx
    readonly km: number
    readonly kind: MishapKind
    readonly lostDs: Ds
  }[]
}

/** SOLO para el paquete de meta (D-06): nunca va en un tramo. Se graba. */
export interface FinishRecord {
  /** en línea, la última marca de reloj de la cabeza; en crono, la última LLEGADA (4-w) */
  readonly finishS: RaceS
  /** existe: results agrupados por tiempoS, en Ds de reloj de carrera, de menor a mayor */
  readonly arrivals: readonly (readonly [Ds, readonly RiderIx[]])[]
}

/** LA LÍNEA TEMPORAL decodificada, en memoria (D-02). La guarda StoredTimelineV1 (§4.3) y la lee todo lo demás. */
export interface StageTimeline {
  /** TIMELINE.format: un decodificador por versión (§4.3) */
  readonly format: 1
  /** existe: ENGINE_VERSION con que corrió */
  readonly engineVersion: number
  /** existe: STAGE.dx con que se grabó, 0,1 */
  readonly dx: number
  /** existe: Math.round(lengthKm / dx) */
  readonly blocks: number
  /** existe: stageLengthKm(profile) */
  readonly lengthKm: number
  /** existe: input.timeTrial */
  readonly timeTrial: boolean
  /** 'exact' en toda línea grabada; 'estimated' solo en el adaptador de la radio (D-07) */
  readonly clock: 'exact' | 'estimated'
  /** existe: por RiderIx */
  readonly riderIds: readonly string[]
  /** se graba: por GroupIx (4-a) */
  readonly groups: readonly GroupCatalogEntry[]
  /** se graba: por b creciente; vacío en crono, en el adaptador y en la web */
  readonly keys: readonly KeyPhoto[]
  /** se graba: por b y, dentro del bloque, en el orden de StateEvent */
  readonly stateEvents: readonly StateEvent[]
  /** se graba: por revealS y, a igual hora, por source */
  readonly events: readonly TimelineEvent[]
  /** se graba: solo bloques de radioKmPoints, filas por GroupIx */
  readonly detail: ReadonlyMap<Block, readonly GroupDetail[]>
  /** se graba: por km */
  readonly banners: readonly BannerResult[]
  readonly profile: ProfileStrip
  readonly cast: TimelineCast
  readonly weather: StageWeather
  /** solo en crono */
  readonly tt: TimeTrialTrace | null
  readonly finish: FinishRecord
}

/**
 * Lo que reciben las funciones que cortan y reducen y lo que la web arma con la cabecera y los tramos:
 * la línea sin el reparto congelado (se sirve degradado por el velo en la cabecera, B13), sin el
 * tiempo (va en la cabecera) y sin la meta (D-06).
 */
export type TimelineCore = Omit<StageTimeline, 'cast' | 'weather' | 'finish'>

// ------------------------------------------------- los dos tipos que importan otros (17-z)

/**
 * Importancia de un rótulo (D-21, §4.9): 3 meta, caza de la fuga, corte, cambio de líder virtual,
 * caída, descolgado o abandono de un maillot o de un top BROADCAST.cueTopStart de salida (6-g); 2
 * ataque, fuga, su frase, pancarta, caída, llama roja, fuera de control y la ronda de la moto,
 * reservada (6-m); 1 diferencias, grupo cambiado, percance, rótulo de corredor; 0 ficha del puerto, la
 * ronda ON COURSE de la crono (9-k) y datos. Dura cueHoldS[clase] s de pared sin parar el reloj. Se
 * declara aquí y no en `cues.ts` porque la importan `constants.ts`, `cues.ts` y el reproductor.
 */
export type CueClass = 0 | 1 | 2 | 3

/**
 * Una zona de la curva del ritmo (§8.2, §4.11): s de carrera por s de pared mientras quedan más de
 * aboveKm km a meta. Se declara aquí y no en `wire.ts` porque la importan `constants.ts`, `pace.ts`
 * y `wire.ts`, y nace en el PR 2, antes que la red.
 */
export interface PaceZone {
  readonly aboveKm: number
  readonly x: number
}
