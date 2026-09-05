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
  /**
   * DÓNDE Y CUÁNDO SE CORRE (v42). Lo único que el motor necesita para saber qué clima le toca a
   * esta etapa, y es la petición del dueño en una línea: «el clima debería depender del país y del
   * GD». Sin esto llovería igual en Flandes en marzo que en Almería en agosto.
   *
   * Es OPCIONAL a propósito: una etapa sin sitio ni fecha —los escenarios sintéticos del banco, un
   * campo de pruebas— corre con el clima templado de referencia, que es exactamente el
   * comportamiento anterior a esta versión.
   */
  lugar?: {
    /** País donde se disputa, ISO alpha-2. Sin él, el clima es el de un sitio templado. */
    pais?: string
    /** Día del año (1-365), que en este juego es el día de la temporada y el GD del reloj. */
    dia: number
  }
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
/**
 * PARA QUÉ ESTÁ DANDO LA CARA AL VIENTO ESTE HOMBRE (v47).
 *
 * Petición literal del dueño, después de ver a un equipo tirando en el TERCER grupo mientras su
 * líder iba en el segundo: «¿para qué carajos tiran si en ese grupo donde están no está su líder?
 * ¿Para llevarle 138 ciclistas más a su líder? MAL. No deberían tirar… o no entiendo para qué
 * tiran; o sea, busca de algún modo dejar una evidencia que explique por qué o para qué tira cada
 * ciclista de un grupo».
 *
 * No es una etiqueta inventada a posteriori: son las MISMAS ramas con las que `relayTurn` decide el
 * turno, leídas en el mismo bloque en que se decide. Si el motivo no cuadra con lo que se ve, el
 * defecto está en la decisión y no en la etiqueta —que es exactamente para lo que sirve una
 * evidencia—.
 *
 * Es una pregunta DISTINTA de la que responde `simulate.ts::pullReason` (la v13), y por eso conviven
 * las dos: aquélla mira a un grupo de relevistas y dice **para quién trabajan** («son los gregarios
 * de Fulano», «es una alianza de tres equipos»); ésta mira a UN hombre y dice **qué le ha puesto ahí
 * a él**. La queja del dueño no se podía contestar con la primera: los que tiraban en el tercer
 * grupo eran, efectivamente, los gregarios de su líder.
 */
export type PullMotive =
  /** Va SOLO: da la cara el 100 % del tiempo porque no hay nadie más. */
  | 'solo'
  /** Con viento de lado no hay rueda: o entras al turno o te caes de la fila. */
  | 'abanico'
  /** Lanza a su velocista en el desenlace (`sprintTrainKm`). */
  | 'tren'
  /** Colabora en un grupo que va POR DELANTE del grueso de la carrera. */
  | 'fuga'
  /** Rueda en un grupo que va POR DETRÁS: no persigue nada, sobrevive el día. */
  | 'grupeto'
  /** Su equipo lleva el frente del pelotón porque tiene al favorito para ESTE final. */
  | 'equipo_etapa'
  /** …porque el maillot es suyo y lo de delante lo amenaza. */
  | 'equipo_maillot'
  /** …porque su hombre de la general se juega lo mismo un escalón más abajo. */
  | 'equipo_general'
  /** Nadie manda al frente: le toca por su papel (gregario, o corredor sin órdenes). */
  | 'rol'

export interface SnapshotRider {
  riderId: string
  /** En qué grupo va: el pelotón, un movimiento o un grupeto. */
  groupId: string
  /** Reloj de SU grupo al cruzar el punto, en segundos desde la salida. Ordena la carrera. */
  tS: number
  /** Cuánto le queda en el depósito y con cuánto salió (SPEC 6.5). */
  energy: number
  energy0: number
  /**
   * ¿TIRABA en el bloque de la foto? (SPEC 6.10, `relayTurn`). El motor lo decidía en cada bloque y
   * lo tiraba: hacia fuera solo salía el trabajo ACUMULADO del día (`frontWorkPeloton`), que
   * responde a «quién ha tirado más» pero no a «quién va tirando AHORA», que es lo que anuncia una
   * radio de carrera.
   *
   * Es UNA bandera y no dos desde la v34: hasta la v33 había además un `onTheFront` que separaba a
   * los del equipo que llevaba el frente del resto del turno, y esos dos estados eran dos nombres
   * para un continuo (ver `shelterOf`). O tiras o no tiras.
   */
  pulling: boolean
  /**
   * PARA QUÉ tira (v47). `null` si no está tirando en este bloque. Ver `PullMotive`.
   */
  pullMotive: PullMotive | null
  /**
   * Trabajo al frente del pelotón CON OLVIDO (`pullWindowDecayPerKm`): la misma ventana con la que
   * la crónica responde «quién tira ahora» en `peloton_pull`. Ordena a los relevistas por lo que
   * están poniendo, en vez de por el orden en que aparecen en la lista. 0 fuera del pelotón.
   */
  pullWindow: number
}

export interface StageProbe {
  /** Kilómetros del recorrido en los que se quiere la foto. */
  atKm: readonly number[]
  /**
   * Recibe cada foto con el km REAL del bloque en que se tomó (múltiplo de `dx`) y **cuál es el
   * pelotón** en ese punto.
   *
   * `mainGroupId` viaja desde la v47 y no es un adorno: `mainGroupId()` (stage/group.ts) lleva
   * HISTÉRESIS —el título de pelotón se hereda y solo cambia de manos por un margen—, así que quien
   * lo recalcule por su cuenta arranca otra cadena y acaba llamando pelotón a otro grupo. Es
   * exactamente lo que pasaba: medido sobre seis carreras del banco, la radio y el motor discrepaban
   * en 12 fotos, y en ellas los relevos del pelotón salían anotados como de un grupeto y al revés.
   * Aquí viaja **el que el motor está usando de verdad**, que es el que decide quién tira y por qué.
   *
   * `null` = todavía no hay ninguno (no queda nadie en carretera).
   */
  onSnapshot: (km: number, riders: readonly SnapshotRider[], mainGroupId: string | null) => void
}

/**
 * EN QUÉ SE FUE EL DEPÓSITO, por concepto (v47). Unidades de depósito, la misma escala del tanque:
 * la suma de los cinco es lo que le falta al corredor en meta (`TankState.energy0 − energy`).
 *
 * Nace de una pregunta del dueño que el motor no sabía contestar: «esta vez le dije que corriera
 * súper agresivo… y no hay ni una sola mención en el journal ni en la race radio, pero consumió un
 * montón de energía; algo habrá hecho, digo yo». Y era verdad las dos veces: el corredor hizo cosas
 * y el motor las cobró —el gasto es real y va al TSS del día—, pero hacia fuera solo salía el TOTAL
 * (`workUnits`), un número sin historia. La crónica solo cuenta lo que es NOTICIA (un ataque que
 * abre hueco, una fuga, una pájara) y un día entero de dar la cara en el pelotón no lo es: se ve en
 * las piernas de mañana y en ningún otro sitio.
 *
 * No es una estimación ni un reparto a posteriori: cada término se apunta EN EL SITIO en que el
 * motor ya descontaba esa energía, así que el desglose y el total no pueden discrepar.
 */
export interface StageSpend {
  /** Rodar: el peaje de estar en carrera, ya con el rebufo que le tocara. */
  rodar: number
  /** Dar la cara al viento: lo que le cuesta ir al frente por encima de ir a rueda. */
  relevo: number
  /** Apretar los dientes por encima de su umbral (la reserva, W′ de SPEC 6.6). */
  reserva: number
  /** Cerillos: atacar, saltar a una rueda y quemar uno para no soltarse (SPEC 6.6). */
  cerillos: number
  /** Disputar una meta volante o una cima (SPEC 6.11). */
  banderas: number
}

/**
 * EL PARTE DEL CORREDOR: qué hizo en el día, además de en qué puesto entró (v47).
 *
 * Es OBSERVACIÓN PURA, como `StageProbe` y como la atribución del trabajo: son contadores que el
 * bucle ya tenía dentro y que morían al terminar la etapa. No tira un dado, no mueve un reloj y no
 * cambia una sola carrera —lo comprueban las huellas selladas—.
 *
 * Se emite para TODOS los corredores porque contarlo cuesta lo mismo y porque un parte que solo
 * existiera para el humano sería una segunda verdad que puede divergir; quién lo guarda y a quién
 * se lo enseña es cosa de `packages/db`.
 */
export interface StageEffort {
  /** Kilómetros dando la cara al viento al frente de su grupo. */
  kmAlFrente: number
  /** Kilómetros rodando por DELANTE del grupo principal: la fuga, un contraataque, un puente. */
  kmEnFuga: number
  /** Kilómetros rodando por DETRÁS del grupo principal. */
  kmDescolgado: number
  /** Ataques que lanzó él, y ataques ajenos a los que saltó. */
  ataques: number
  saltos: number
  /** Cerillos que quemó, de los que salió con ellos (SPEC 6.6). */
  cerillos: number
  /** Segundos de reserva que gastó yendo por encima de su umbral (SPEC 6.6, `reserveSeconds`). */
  reservaGastadaS: number
  /** En qué se fue el depósito. */
  gasto: StageSpend
  /** Km en el que se le vació el depósito (la pájara), o `null` si no reventó. */
  pajaraKm: number | null
  /** Km en el que perdió el grupo principal por última vez, o `null` si no lo perdió. */
  descuelgueKm: number | null
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
  /**
   * EL PARTE DE CADA CORREDOR (v47): qué hizo hoy, no solo dónde entró. Ver `StageEffort`.
   */
  efforts: Map<string, StageEffort>
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
