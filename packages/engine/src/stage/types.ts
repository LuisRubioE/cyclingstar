/**
 * Contrato del motor de etapa (SPEC 6.1, 6.2, 6.15). Autoría a escala humana (tramos) y
 * simulación a bloques de 100 metros. Todo es puro y determinista: los tipos no llevan
 * ninguna referencia a tiempo real ni a base de datos.
 *
 * Paso 21: andamiaje. La física (6.4-6.14) llega a partir del Paso 22.
 */
import type { Attribute } from '@cyclingstar/shared'

/** Terreno tal como lo escribe el autor del recorrido (SPEC 6.2). */
export type SegmentTerrain = 'llano' | 'rompepiernas' | 'puerto' | 'descenso' | 'paves'

/** Terreno que consume la ley de velocidad (SPEC 6.4): rompepiernas se colapsa en llano. */
export type BlockTerrain = 'llano' | 'subida' | 'descenso' | 'paves'

/** Un tramo dentro de un segmento: `km` de longitud a una pendiente media `g` (en %). */
export interface Ramp {
  km: number
  g: number
}

/** Banner puntuable cruzado en un punto del recorrido (SPEC 6.2, 6.11). */
export type BannerType = 'meta_volante' | 'cima'

export interface Banner {
  km: number
  tipo: BannerType
  /** Categoría REAL de la cima (si el recorrido la trae del dato oficial); si no, se deriva. */
  cat?: ClimbCategory
}

/**
 * Segmento de autoría (SPEC 6.2). Si trae `tramos`, la pendiente se muestrea de ellos; si no,
 * se deriva del tipo. `estrellas` califica la dureza del pavés (coste, SPEC 6.5).
 */
export interface Segment {
  km: number
  tipo: SegmentTerrain
  tramos?: Ramp[]
  estrellas?: number
}

/** Recorrido completo de una etapa antes de muestrear (SPEC 6.2). */
export interface StageProfile {
  segments: Segment[]
  banners?: Banner[]
}

/** Un bloque de 100 metros ya muestreado, listo para la física (SPEC 6.2, 6.16). */
export interface Block {
  /** Pendiente en % (positiva sube, negativa baja). */
  g: number
  /** Categoría de terreno para la ley de velocidad (SPEC 6.4). */
  tipo: BlockTerrain
  /** Dureza del pavés; 0 fuera del pavés (SPEC 6.5). */
  estrellas: number
  /** Banner cruzado en este bloque, si lo hay (SPEC 6.11). */
  banner?: BannerType
  /** Categoría de la cima, si el banner es una cima (derivada del segmento, SPEC 6.2). */
  climbCategory?: ClimbCategory
}

/** Categoría de una cima, derivada del score de dureza (SPEC 6.2). */
export type ClimbCategory = 'HC' | 'cat1' | 'cat2' | 'cat3' | 'cat4' | null

/** Órdenes de etapa: el piloto automático (SPEC 6.18). */
export type StageRole =
  'lider' | 'sprinter' | 'lanzador' | 'gregario' | 'cazaetapas' | 'marcador' | 'libre'

export type Mentality = 'reservon' | 'oportunista' | 'combativo' | 'supercombativo'

export interface StageOrders {
  role: StageRole
  /** Objetivo para roles que lo requieren (lanzador, gregario, marcador). */
  targetRiderId?: string
  mentality: Mentality
  contestSprints: boolean
  contestClimbs: boolean
}

/** Un corredor tal como entra al motor (SPEC 6.1, 6.5, 6.6): efectividades ya resueltas. */
export interface StageRider {
  riderId: string
  /** eff0 por atributo (Banister ya aplicado, SPEC 4). */
  eff0: Record<Attribute, number>
  /** Tanque de energía inicial E0 (SPEC 6.5). */
  energy: number
  /** Cerillos disponibles al arrancar (SPEC 6.6). */
  matches: number
  /**
   * PENDIENTE DE IMPLEMENTAR (SPEC 6.6): campo definido pero sin efecto en la simulación de etapa.
   * El TSB solo se consume en `physics.matchCount()`, que el bucle de carrera no llama (recibe
   * `matches` ya resuelto desde fuera). Lo rellena packages/db pero el motor lo ignora.
   */
  tsb: number
  orders: StageOrders
  /**
   * Desventaja del corredor en la general, en segundos (SPEC 6.9). Lo rellena packages/db y desde
   * la v9 el motor lo LEE: el pelotón acorta la cuerda si en el movimiento va una amenaza
   * (`STAGE.gcThreatFraction`), el que anda cerca ataca más en el final en alto y sus rivales no le
   * dejan marchar (docs/motor.md §13, regla 9). Un 0 solo cuenta si hay diferencias en el campo: en
   * la etapa 1 y en las carreras de un día todos llegan con 0 y no hay general que defender.
   */
  gcDeficitSeconds: number
  /**
   * EL PUESTO en la clasificación general, 1 el líder (v19). Lo rellena packages/db, igual que
   * `gcDeficitSeconds`, y viaja aparte porque **el déficit no basta**: es un tiempo, y los empates
   * a tiempo son la norma —tras la etapa 2 de Race Colombia, 58 corredores comparten un tiempo y 54
   * otro, el 86 % del pelotón—. Al motor le llegaban indistinguibles y la rampa de la crono caía al
   * dorsal, que no es la regla del ciclismo: **el desempate en una etapa 2 no es por dorsal, es por
   * posición en la etapa 1.**
   *
   * El desempate bueno ya existe y vive donde tiene que vivir (`packages/db/src/gcSort.ts`): tiempo,
   * luego SUMA DE PUESTOS y luego el puesto en la última etapa. El motor no lo reimplementa —sería
   * una segunda verdad que puede divergir—: recibe el puesto ya resuelto y lo respeta.
   *
   * Nulo o ausente = no hay general que consultar (etapa 1, carrera de un día, banco de simulación),
   * y entonces la rampa vuelve al dorsal, que es la regla real cuando no hay general.
   */
  gcRank?: number | null
  /**
   * EL DORSAL de la carrera (`race_rosters.bib`), v18. Lo rellena packages/db, igual que
   * `gcDeficitSeconds`, y el motor NO se lo inventa: sin él no habría forma de repartir la rampa de
   * salida de una crono por dorsales (`stage/startOrder.ts`), que es la regla real cuando no hay
   * general que invertir. Nulo o ausente = el roster no lo tiene (vuelta de prueba, roster antiguo,
   * banco de simulación) y la regla lo pone a salir al principio, donde no le quita el hueco a nadie.
   *
   * Fuera de la crono el motor lo ignora: la carrera en línea no depende del número que lleves.
   */
  bib?: number | null
  /** Fragilidad oculta (SPEC 3.4): escala la probabilidad de lesión al caer. Por defecto 1. */
  fragility?: number
  /**
   * EL EQUIPO del corredor (docs/motor.md §V.1, v15). Es lo que faltaba para que el motor pudiera
   * tener un plan colectivo: hasta la v14 lo único que conocía era `orders.targetRiderId`, que dice
   * «X trabaja para Y» pero no «este equipo persigue y este otro se esconde».
   *
   * **Nulo o ausente = agente libre**, y eso es una decisión de diseño, no una laguna: el dueño lo
   * dijo explícitamente («un ciclista sin equipo, pues corre de forma individual»). Un corredor sin
   * equipo no participa de ningún plan, no recibe compañeros fantasma y decide solo con sus órdenes.
   * Un campo ENTERO sin equipos se comporta exactamente como antes de la v15.
   */
  teamId?: string | null
}

/** Entrada completa del motor (SPEC 6.1). */
export interface StageInput {
  profile: StageProfile
  riders: StageRider[]
  /** CRI/cronoescalada: grupos de un corredor, sin drafting ni hazards (SPEC 6.13). */
  timeTrial?: boolean
}

/** Un evento narrable de la carrera (SPEC 6.15). */
export interface RaceEvent {
  km: number
  tS: number
  tipo: string
  plantilla: string
  protagonistas: string[]
  datos?: Record<string, number | string>
}

/** Resultado de un corredor en la etapa (SPEC 6.15). */
export interface StageResult {
  riderId: string
  puesto: number
  tiempoS: number
  bonificacionS: number
  puntosVolante: number
  puntosMontana: number
  estado: 'finish' | 'abandon' | 'dnf'
}

/** Incidente físico (caída, lesión) con su severidad (SPEC 6.14). */
export interface Incident {
  riderId: string
  km: number
  tipo: 'caida'
  severidad: 'none' | 'scratches' | 'minor' | 'major'
  perdidaS: number
  diasBaja: number
}

/**
 * UNA FOTO DE LA CARRERA EN UN PUNTO DEL RECORRIDO (v26, `sim/climbs.ts`).
 *
 * El motor sabe en todo momento dónde va cada corredor —en qué grupo y qué reloj lleva ese grupo— y
 * esa información moría dentro del bucle: hacia fuera solo salían los eventos narrables y el
 * resultado de meta. Con eso NO se puede responder a la pregunta de la v26 —«¿quién adelanta a quién
 * DENTRO de un puerto?»—, porque entre el pie y la cima el motor no emite un solo dato con el orden
 * de la carrera, y sin regla no se puede saber si un cambio de física funciona.
 *
 * Es OBSERVACIÓN PURA, como la atribución del trabajo de la v11: no tira un dado, no toca un
 * compromiso, no mueve un reloj y no existe si nadie la pide. Sin `StageProbe` el motor corre
 * exactamente igual —lo comprueban las huellas selladas, que no se movieron al entrar esto—.
 */
export interface SnapshotRider {
  riderId: string
  /** En qué grupo va: el pelotón, un movimiento o un grupeto. */
  groupId: string
  /** Reloj de SU grupo al cruzar el punto, en segundos desde la salida. Ordena la carrera. */
  tS: number
  /** Cuánto le queda en el depósito y con cuánto salió (SPEC 6.5). */
  energy: number
  energy0: number
}

export interface StageProbe {
  /** Kilómetros del recorrido en los que se quiere la foto. */
  atKm: readonly number[]
  /** Recibe cada foto con el km REAL del bloque en que se tomó (múltiplo de `dx`). */
  onSnapshot: (km: number, riders: readonly SnapshotRider[]) => void
}

/** Salida del motor (SPEC 6.1, 6.15). `workUnits` alimenta el TSS de 5.1. */
export interface StageOutput {
  events: RaceEvent[]
  results: StageResult[]
  workUnits: Map<string, number>
  incidents: Incident[]
  /**
   * Estado del tanque en meta por corredor (SPEC 6.6, 6.7). Sin esto la erosión no se podía medir
   * desde fuera —era imposible calibrarla o vigilarla en CI— y el vaciado profundo que resta un
   * cerillo al día siguiente no se podía propagar (docs/motor.md §12-bis).
   */
  tank: Map<string, TankState>
  /** Versión del motor con que se generó (sellada para replays reproducibles, SPEC 6.1). */
  engineVersion: number
}

/** Cómo terminó el tanque de un corredor (SPEC 6.6, 6.7). */
export interface TankState {
  /** Depósito inicial E0 con que tomó la salida. */
  energy0: number
  /** Energía restante en meta. */
  energy: number
  /** Vaciado 1 - E/E0, en [0,1]. */
  depletion: number
  /** Erosión resultante, en [0,1]: lo que de verdad le quitó el día. */
  erosion: number
  /** Terminó por debajo del umbral de vaciado profundo: mañana sale con un cerillo menos (6.6). */
  deepDepleted: boolean
}
