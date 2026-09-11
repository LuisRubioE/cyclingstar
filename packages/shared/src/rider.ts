/**
 * Modelo visible del ciclista (SPEC 3): atributos, vocaciones, géneros y el mapeo a
 * estrellas. Puro y compartido; el jugador nunca ve el valor interno (SPEC 3.2).
 */

/** Los 10 atributos internos (escala [1,99]); ver SPEC 3.1. */
export const ATTRIBUTES = [
  'RES',
  'REC',
  'LLA',
  'MON',
  'COL',
  'CRI',
  'SPR',
  'DES',
  'PAV',
  'TAC',
] as const
export type Attribute = (typeof ATTRIBUTES)[number]

/**
 * LAS TRES CLASES DE ATRIBUTO: qué se aprende deprisa, qué se construye despacio y qué se aprende
 * toda la vida (docs/epics.md «G1», docs/entrenamiento.md §2.1 y §4.1).
 *
 * Hasta aquí eran DOS —motor y oficio— y esa partición no podía representar lo que el dueño
 * describió: «la contrarreloj sube muy rápido cuando eres joven, menos rápido según creces», que no
 * es lo mismo que el fondo, que se construye hasta bien entrados los veinte. Con una sola clase de
 * «motor» un esprínter de 29 y un rodador de 29 tenían el mismo reloj, y en la carretera no lo
 * tienen.
 *
 * - **`motor_rapido`** — SPR, CRI, COL. Potencia y punta: sube muy deprisa de joven, muy poco entre
 *   los 24 y los 27, y después se estanca. Es también lo primero que se va.
 * - **`motor_lento`** — RES, REC, LLA, MON. Fondo y capacidad aeróbica: se construyen tarde y duran.
 * - **`oficio`** — DES, PAV, TAC. Cabeza y manos: «Tactics debería mejorar siempre». Un veterano baja
 *   de puerto y pasa el adoquín mejor que un neoprofesional, y eso no es una concesión: es lo que se
 *   ve en la carretera.
 *
 * Son tres y no cuatro —REC podría ser clase propia— porque en todo lo que el banco mide REC dentro
 * de `motor_lento` da lo mismo, y ahorra una fila en cada tabla. Si el banco enseña que REC debe
 * declinar antes, es una fila más y no un rediseño.
 *
 * La tabla la consumen tres sitios que hasta ahora no se hablaban: el reloj de edad del
 * entrenamiento, los techos de la generación de bots y lo que enseña la carrera. Un solo reloj de
 * edad para la misma persona.
 */
export type AttributeClass = 'motor_rapido' | 'motor_lento' | 'oficio'

/**
 * (Documentación histórica de la partición en dos, que sigue explicando por qué DES y PAV van con
 * la cabeza y no con el cuerpo.)
 *
 * OFICIO CONTRA MOTOR: qué se puede seguir aprendiendo toda la vida y qué no (docs/epics.md «G1»).
 *
 * El dueño, cuando se le enseñó que un NPC de 24 años no podía mejorar jamás: «yo creo que quizás
 * hay que ser menos cartesianos… en la realidad un ciclista sí mejora después de los 24 años, pero
 * mejora en cosas diferentes. Por ejemplo Tactics… eso debería mejorar siempre después de los 24.
 * Otras como contrarreloj suben muy rápido cuando eres joven, menos rápido según creces».
 *
 * Así que los atributos se parten en dos y la edad les afecta distinto:
 *
 * - **motor** — lo que da el cuerpo: RES, REC, LLA, MON, COL, CRI, SPR. Sube rápido de joven, muy
 *   poco entre los 24 y la plenitud, y después ya no sube: se defiende.
 * - **oficio** — lo que da la cabeza y las manos: TAC, DES, PAV. Se aprende corriendo y se sigue
 *   aprendiendo a los 34. Un veterano baja de puerto y pasa el adoquín mejor que un neoprofesional,
 *   y eso no es una concesión: es lo que se ve en la carretera.
 *
 * DES y PAV van en «oficio» y no es una clasificación nueva sacada de la nada: el motor YA los
 * trataba aparte al decaer (`TRAINING.desPavDecayFactor` les baja el declive por edad al 25 %,
 * mientras el resto se lleva el 100 %). Esta constante solo le pone nombre a una decisión que ya
 * estaba tomada y la extiende al otro lado, el de crecer. TAC además no decae nunca: está fuera de
 * los atributos físicos desde siempre.
 *
 * El caso discutible es RES: el fondo se sigue construyendo hasta bien entrados los veinte. Va en
 * «motor» porque al final es cuerpo, y porque su ventana de crecimiento ya es la más larga por la
 * vía normal. Si algún día se quiere mover, se mueve aquí y en un solo sitio.
 */
export const ATTRIBUTE_CLASS: Record<Attribute, AttributeClass> = {
  RES: 'motor_lento',
  REC: 'motor_lento',
  LLA: 'motor_lento',
  MON: 'motor_lento',
  COL: 'motor_rapido',
  CRI: 'motor_rapido',
  SPR: 'motor_rapido',
  DES: 'oficio',
  PAV: 'oficio',
  TAC: 'oficio',
}

/**
 * LA CLASE VIEJA, DERIVADA DE LA NUEVA Y NO ESCRITA A MANO.
 *
 * `ATTRIBUTE_GROWTH` sigue viva porque la consume el camino legacy de la generación de bots
 * (`NPC.ceilingBoost` se indexa por sus dos claves) y su prueba filtra por ellas. Lo que no puede
 * pasar es que existan dos tablas independientes con la misma información: el día que alguien mueva
 * un atributo de clase en una y no en la otra, el bot nacería con un techo de una clase y crecería
 * con el reloj de otra, y no lo notaría nadie.
 *
 * Así que se DERIVA. Las dos velocidades del motor colapsan a «motor», que es exactamente lo que la
 * tabla vieja sabía distinguir, y el día que el camino legacy se borre esto se va con él.
 */
export const ATTRIBUTE_GROWTH: Record<Attribute, 'motor' | 'oficio'> = Object.fromEntries(
  ATTRIBUTES.map((a) => [a, ATTRIBUTE_CLASS[a] === 'oficio' ? 'oficio' : 'motor']),
) as Record<Attribute, 'motor' | 'oficio'>

/** Nombres legibles (en inglés, UI del MVP) de cada atributo. */
export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  RES: 'Endurance',
  REC: 'Recovery',
  LLA: 'Flat',
  MON: 'Mountain',
  COL: 'Hills',
  CRI: 'Time trial',
  SPR: 'Sprint',
  DES: 'Descending',
  PAV: 'Cobbles',
  TAC: 'Tactics',
}

/** Qué es cada atributo y para qué sirve (ayuda del perfil, #8). */
export const ATTRIBUTE_DESCRIPTIONS: Record<Attribute, string> = {
  RES: 'Stamina over long distances. Keeps you strong deep into a race and resists fading in the finale.',
  REC: 'How fast you shed fatigue between efforts and days. Higher recovery lets you absorb more training and race harder back-to-back.',
  LLA: 'Power on flat roads. Matters for tempo on the flat, holding a wheel, and lead-outs.',
  MON: 'Sustained climbing on long ascents — the key to winning mountain stages and grand tours.',
  COL: 'Punch on short, steep climbs and walls, where accelerations decide the move.',
  CRI: 'Solo effort against the clock: the decisive skill in time trials.',
  SPR: 'Top-end speed for the bunch sprint and the final metres of any finish.',
  DES: 'Handling and nerve on descents — extend a gap downhill or catch back on.',
  PAV: 'Skill and strength over cobbles and rough roads, in the spring classics.',
  TAC: 'Race intelligence: positioning, timing a move, reading the finish. Learned by racing, not just training.',
}

export const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo'] as const
export type Vocation = (typeof VOCATIONS)[number]

export const VOCATION_LABELS: Record<Vocation, string> = {
  escalada: 'Climber',
  velocidad: 'Sprinter',
  clasicas: 'Classics rider',
  crono: 'Time trialist',
  fondo: 'All-rounder',
}

export interface VocationProfile {
  primary: Attribute[]
  adjacent: Attribute[]
}

/** Sesgo de cada vocación sobre valores iniciales y techos (SPEC 3.5). */
export const VOCATION_PROFILES: Record<Vocation, VocationProfile> = {
  escalada: { primary: ['MON', 'RES'], adjacent: ['COL', 'REC'] },
  velocidad: { primary: ['SPR', 'LLA'], adjacent: ['TAC', 'REC'] },
  clasicas: { primary: ['COL', 'PAV'], adjacent: ['LLA', 'DES'] },
  crono: { primary: ['CRI', 'LLA'], adjacent: ['RES', 'REC'] },
  fondo: { primary: ['RES', 'REC'], adjacent: ['MON', 'LLA'] },
}

export const GENDERS = ['M', 'F'] as const
export type Gender = (typeof GENDERS)[number]

/** Estados de salud (SPEC 3.3, 4.3). */
export const HEALTH_STATES = ['sano', 'molestias', 'enfermo', 'lesionado'] as const
export type HealthState = (typeof HEALTH_STATES)[number]

/** Vista pública del ciclista propio (contrato api/web). Valores internos solo para estrellas. */
export interface PublicRider {
  id: string
  name: string
  country: string
  gender: Gender
  /** Ocho desde la génesis v2: las cinco vocaciones más puncheur, rodador y gregario. */
  archetype: RiderArchetype
  birthSeason: number
  attributes: Record<Attribute, number>
}

/**
 * ESCALA DE ESTRELLAS DE **FORMA Y FRESCURA** (SPEC 3.2): clamp(round(x/10)/2, 0.5, 5).
 *
 * SE LLAMABA `stars` Y HABÍA QUE RENOMBRARLA (docs/entrenamiento.md §2.3). Con `attrStars` en
 * la casa conviven dos funciones de medias estrellas que dan números DISTINTOS para el mismo valor
 * —`stars(84) = 4`, `attrStars(84) = 5`— y con el nombre genérico era cuestión de tiempo que
 * alguien pintara un atributo con la escala de la forma sin enterarse.
 *
 * No es un descuido que sean distintas: la forma es una magnitud continua de 0 a 100 sin umbrales
 * de dominio, y su suelo de media estrella dice «siempre hay algo». Un atributo, en cambio, lleva
 * los umbrales con los que el dueño midió su «menos del 15 % con cinco estrellas» (17/34/51/67/84),
 * y ahí el 0 existe: se puede no saber esprintar.
 */
export function formStarsScale(x: number): number {
  return Math.min(5, Math.max(0.5, Math.round(x / 10) / 2))
}

/**
 * Estrellas ENTERAS de un atributo (0..5). Bandas: 0-16→0, 17-33→1, 34-50→2, 51-66→3, 67-83→4,
 * 84-100→5. Es la escala con la que se cuenta el mundo: «cinco estrellas» son 84 o más, y ése es el
 * listón del que habla el dueño.
 */
export function attrStarsWhole(x: number): number {
  if (x < 17) return 0
  if (x < 34) return 1
  if (x < 51) return 2
  if (x < 67) return 3
  if (x < 84) return 4
  return 5
}

/**
 * …Y LAS MEDIAS, QUE SON LAS QUE VE EL JUGADOR (docs/entrenamiento.md §2.3).
 *
 * Seis escalones enteros para diez atributos y un rango de 99 puntos es demasiado grueso: dos
 * corredores separados por dieciséis puntos —la diferencia entre un gregario y un líder— pueden
 * enseñar exactamente las mismas cuatro estrellas, y la ficha deja de informar. Con medias hay once
 * escalones y la silueta de dos arquetipos vecinos se distingue.
 *
 * La media estrella cae en la mitad de cada banda entera, así que `attrStarsWhole(x) ==
 * Math.floor(attrStars(x))` para todo x: la escala fina NUNCA contradice a la gruesa, solo la parte.
 */
export function attrStars(x: number): number {
  const entero = attrStarsWhole(x)
  if (entero === 0) return x < 9 ? 0 : 0.5
  if (entero === 5) return 5
  // Los cortes enteros son 17, 34, 51, 67, 84: el medio de cada banda es su punto de partida + 8.
  const inicios = [0, 17, 34, 51, 67]
  const siguiente = [17, 34, 51, 67, 84]
  const mitad = (inicios[entero]! + siguiente[entero]!) / 2
  return x >= mitad ? entero + 0.5 : entero
}

/**
 * LA MARCA DE PROGRESO DENTRO DE LA BANDA, EN CUATRO PASOS (docs/entrenamiento.md §2.3).
 *
 * Responde a la queja del dueño —«hice descanso activo y no mejoró»— sin dibujar el número. Devuelve
 * 0..3: en qué cuarto de su banda ENTERA está el atributo, para pintar cuatro segmentos bajo las
 * estrellas.
 *
 * Cuatro pasos y no una barra continua, a propósito: con bandas de 16-17 puntos una barra continua
 * resolvería el atributo a menos de medio punto, o sea MÁS resolución que las medias estrellas que
 * se acaban de introducir, y eso es enseñar el número interno por la puerta de atrás
 * (`MVP.md:114`, `SPEC.md:40`).
 *
 * Las cinco estrellas no tienen banda superior —84 es el suelo y no hay techo—, así que se pinta
 * siempre lleno: un 5★ está en lo más alto de la escala que el jugador conoce.
 */
export function attrProgress(x: number): number {
  const entero = attrStarsWhole(x)
  if (entero === 5) return 3
  const inicios = [0, 17, 34, 51, 67]
  const siguiente = [17, 34, 51, 67, 84]
  const desde = inicios[entero]!
  const ancho = siguiente[entero]! - desde
  return Math.min(3, Math.max(0, Math.floor((4 * (x - desde)) / ancho)))
}

/** Los cinco niveles de la flecha de tendencia (docs/entrenamiento.md §2.3). */
export const TREND_ARROWS = ['↓', '↘', '→', '↗', '↑'] as const
export type TrendArrow = (typeof TREND_ARROWS)[number]

/**
 * FLECHA DE TENDENCIA SOBRE VENTANA DE 28 DÍAS (SPEC 3.2, con dos parámetros sobrescritos).
 *
 * El SPEC pedía 7 días y tres niveles. Las dos cosas se cambian y hay que decirlo: a siete días el
 * ruido de un solo bloque domina —una semana de descanso activo pinta `↓` en un corredor que está
 * subiendo— y con tres niveles no se distingue «no se mueve» de «sube despacio», que es justo lo que
 * hace un atributo secundario del bot: +0,3 en cuatro semanas, y merece verse.
 *
 * Δ28 es la suma de los `delta` de `rider_attr_log` de los últimos 28 días, con TODOS sus orígenes:
 * si el declive se come lo que se entrenó, la flecha tiene que decirlo.
 */
export function trendArrow(delta28: number): TrendArrow {
  if (delta28 >= 1) return '↑'
  if (delta28 >= 0.3) return '↗'
  if (delta28 <= -1) return '↓'
  if (delta28 <= -0.3) return '↘'
  return '→'
}

/**
 * LOS OCHO ARQUETIPOS, CON SU ETIQUETA Y SU CARTA (docs/entrenamiento.md §3.1).
 *
 * Las cinco vocaciones de siempre más tres que el pelotón tenía y el juego no sabía nombrar: el
 * puncheur de los muros, el rodador de las fugas y los abanicos, y el gregario. `fondo` se queda
 * como todoterreno.
 */
export const ARCHETYPE_LABELS: Record<RiderArchetype, string> = {
  escalada: 'Climber',
  velocidad: 'Sprinter',
  puncheur: 'Puncheur',
  clasicas: 'Classics rider',
  crono: 'Time trialist',
  rodador: 'Rouleur',
  fondo: 'All-rounder',
  gregario: 'Domestique',
}

/**
 * LOS OFFSETS DE TECHO POR ARQUETIPO (docs/entrenamiento.md §3.1).
 *
 * En la génesis v2 el offset se aplica al **techo** y no al atributo: `C[a] = L + offset[a]·pureza +
 * ruido`, donde `L` es el nivel del corredor. Un 0 quiere decir «ésta es su carta y puede llegar a
 * su nivel entero»; un −34 quiere decir «esto no lo va a tener nunca».
 *
 * Por qué así y no el −22 uniforme de hoy: el velocista con MON a −34 y el escalador con SPR a −30
 * son lo que hace que en una reina el velocista se descuelgue de verdad y en un esprint el escalador
 * no exista. Con el −22 plano, un velocista del WorldTour tiene montaña 49 y sube como un
 * continental medio, que es la razón de que hoy no haya especialistas puros a partir de la quinta
 * temporada.
 *
 * TAC deja de ser «siempre −22»: el gregario y el rodador nacen con oficio, porque el oficio es
 * justamente lo suyo.
 */
export const ARCHETYPE_CEILING_OFFSETS: Record<RiderArchetype, Record<Attribute, number>> = {
  escalada: {
    RES: -6,
    REC: -10,
    LLA: -18,
    MON: 0,
    COL: -8,
    CRI: -16,
    SPR: -30,
    DES: -12,
    PAV: -26,
    TAC: -22,
  },
  velocidad: {
    RES: -18,
    REC: -12,
    LLA: -4,
    MON: -34,
    COL: -20,
    CRI: -20,
    SPR: 0,
    DES: -16,
    PAV: -16,
    TAC: -18,
  },
  puncheur: {
    RES: -10,
    REC: -12,
    LLA: -10,
    MON: -14,
    COL: 0,
    CRI: -16,
    SPR: -10,
    DES: -12,
    PAV: -16,
    TAC: -18,
  },
  clasicas: {
    RES: -8,
    REC: -10,
    LLA: -4,
    MON: -22,
    COL: -8,
    CRI: -14,
    SPR: -12,
    DES: -10,
    PAV: 0,
    TAC: -16,
  },
  crono: {
    RES: -8,
    REC: -12,
    LLA: -4,
    MON: -16,
    COL: -18,
    CRI: 0,
    SPR: -22,
    DES: -14,
    PAV: -16,
    TAC: -20,
  },
  rodador: {
    RES: -8,
    REC: -8,
    LLA: 0,
    MON: -22,
    COL: -16,
    CRI: -10,
    SPR: -16,
    DES: -12,
    PAV: -10,
    TAC: -14,
  },
  fondo: {
    RES: -4,
    REC: -8,
    LLA: -6,
    MON: -6,
    COL: -6,
    CRI: -8,
    SPR: -16,
    DES: -10,
    PAV: -14,
    TAC: -16,
  },
  /**
   * EL GREGARIO, Y SU RES −2 EN VEZ DE −4 (v63, decisión 22 del dueño).
   *
   * El requisito de `epics.md` —«que tampoco se quede nadie sin pasar de 4 en nada»— choca de frente
   * con un arquetipo que por definición no destaca en nada, y los gregarios son el 26-32 % del
   * pelotón. Subir su mejor offset es la palanca más barata: con −4 un gregario del WorldTour llega
   * a 4★ en RES el 53 % de las veces y con −2 el 60 %, sin tocar su cuota ni convertirlo en otra
   * cosa —sigue a 16 y 18 puntos de peaje en todo lo demás—.
   *
   * Lo que NO hace, y por eso queda escrito: cerrar el requisito literal. Para eso la palanca es RES
   * a 0 y bajar la cuota de gregarios, y ésa es otra decisión.
   */
  gregario: {
    RES: -2,
    REC: -6,
    LLA: -10,
    MON: -14,
    COL: -16,
    CRI: -18,
    SPR: -18,
    DES: -12,
    PAV: -14,
    TAC: -8,
  },
}

/**
 * LOS OCHO ARQUETIPOS, derivados de lo que un corredor ES y no de lo que su ficha DICE.
 *
 * `riders.archetype` es una etiqueta: la elige el jugador y el generador de bots la sortea antes de
 * repartir los atributos. Sirve para decidir qué entrena, pero no para medir el mundo, porque un
 * corredor etiquetado `escalada` que ha crecido en llano y esprint sigue diciendo `escalada` toda su
 * vida. Si el banco contase por la etiqueta mediría el sorteo del nacimiento, no la población.
 *
 * Por eso el reparto que vigila G1 se deriva de los atributos. Es además la misma función que usará
 * el relleno hacia atrás cuando el enum crezca a ocho valores, y por eso vive aquí y no en el banco:
 * una regla que se reimplementa en SQL es una regla que se separa de su motor.
 */
export const RIDER_ARCHETYPES = [
  'escalada',
  'velocidad',
  'clasicas',
  'crono',
  'fondo',
  'puncheur',
  'rodador',
  'gregario',
] as const
export type RiderArchetype = (typeof RIDER_ARCHETYPES)[number]

/**
 * EL ATRIBUTO DE LA CARTA: en qué es bueno cada arquetipo, en una palabra.
 *
 * Se DERIVA de los offsets de techo en vez de escribirse a mano —es el que sale a 0, o sea el que no
 * paga peaje— para que no puedan contradecirse. Una tabla paralela escrita a mano se desincroniza el
 * día que alguien afine un offset, y entonces el juego le diría a un escalador que su carta es el
 * esprint sin que nadie lo hubiera decidido.
 *
 * No es lo mismo que `ARCHETYPE_CARD` de `training.ts`, que es la SESIÓN que afila esa carta.
 */
export const ARCHETYPE_KEY_ATTR: Record<RiderArchetype, Attribute> = Object.fromEntries(
  RIDER_ARCHETYPES.map((arq) => {
    const offsets = ARCHETYPE_CEILING_OFFSETS[arq]
    let mejor: Attribute = ATTRIBUTES[0]!
    for (const a of ATTRIBUTES) if (offsets[a] > offsets[mejor]) mejor = a
    return [arq, mejor]
  }),
) as Record<RiderArchetype, Attribute>

/** Qué atributo manda en cada especialidad. El que no destaca en ninguno no es un especialista. */
const CARTA_DE_ARQUETIPO: readonly (readonly [Attribute, RiderArchetype])[] = [
  ['SPR', 'velocidad'],
  ['MON', 'escalada'],
  ['COL', 'puncheur'],
  ['PAV', 'clasicas'],
  ['CRI', 'crono'],
  ['LLA', 'rodador'],
]

/** Cuánto tiene que despuntar la carta sobre la media del corredor para que sea una especialidad. */
const ARCHETYPE_EDGE = 8
/** Por debajo de cuatro estrellas en todo no hay oficio de especialista: hay gregario. */
const ARCHETYPE_DOMESTIQUE_MAX = 67

export function archetypeFromAttributes(attrs: Record<Attribute, number>): RiderArchetype {
  const cartas = CARTA_DE_ARQUETIPO.map(([attr, arquetipo]) => ({
    arquetipo,
    valor: attrs[attr],
  }))
  const mejor = cartas.reduce((a, b) => (b.valor > a.valor ? b : a))
  const fisicos = ATTRIBUTES.filter((a) => a !== 'TAC')
  const mediaPropia = fisicos.reduce((acc, a) => acc + attrs[a], 0) / fisicos.length
  // Destaca de verdad: la carta se separa de su propia media. Un corredor plano no es especialista
  // de lo que le salga más alto por un punto.
  if (mejor.valor - mediaPropia >= ARCHETYPE_EDGE) return mejor.arquetipo
  return mejor.valor < ARCHETYPE_DOMESTIQUE_MAX ? 'gregario' : 'fondo'
}
