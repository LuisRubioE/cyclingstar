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
  archetype: Vocation
  birthSeason: number
  attributes: Record<Attribute, number>
}

/**
 * Mapeo a estrellas de media en media (SPEC 3.2): stars(x) = clamp(round(x/10)/2, 0.5, 5).
 * El jugador ve estrellas, jamás el número interno. Suelo 0.5 (forma, siempre hay algo).
 */
export function stars(x: number): number {
  return Math.min(5, Math.max(0.5, Math.round(x / 10) / 2))
}

/**
 * Estrellas ENTERAS de un atributo (0..5). Como en la realidad no ves el número: un flojo sale
 * vacío, un especialista llena las 5. Bandas: 0-16→0, 17-33→1, 34-50→2, 51-66→3, 67-83→4, 84-100→5.
 */
export function attrStars(x: number): number {
  if (x < 17) return 0
  if (x < 34) return 1
  if (x < 51) return 2
  if (x < 67) return 3
  if (x < 84) return 4
  return 5
}

/**
 * ESTRELLAS ENTERAS, CON SU NOMBRE DEFINITIVO. Alias exacto de `attrStars`: mismos cortes, mismo
 * resultado, cero conducta nueva.
 *
 * Existe porque el rediseño de entrenamiento introduce MEDIAS estrellas en la ficha del jugador
 * (`formStarsScale`), y a partir de ahí «estrellas de un atributo» pasa a ser ambiguo: el banco de
 * mundo cuenta atributos de cinco estrellas ENTERAS —el listón de 84 del dueño— y la pantalla
 * enseñará mitades. Dos cosas distintas con el mismo nombre acaban mezcladas, y cuando se mezclan
 * el `cincoEstrellasWTPct` que vigila la banda del dueño deja de significar lo que dice.
 *
 * Se añade AHORA, en el paso que solo mide, para que las medias estrellas lleguen a un sitio donde
 * el nombre ya está ocupado por quien debe. `attrStars` se conserva mientras haya llamadas vivas.
 */
export function attrStarsWhole(x: number): number {
  return attrStars(x)
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
