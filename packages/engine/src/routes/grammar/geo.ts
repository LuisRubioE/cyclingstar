/**
 * GEOGRAFÍA DE LA GRAMÁTICA (docs/generador.md §3.4).
 *
 * La firma de una zona dice qué existe y qué no, y la palabra para lo segundo es `null`.
 *
 * Paso 0: nació `GeoZone`, porque `RouteStats` del censo la cita. Paso 1: `Relieve`, `GeoSignature`
 * y `Territorio`. Paso 2: las tablas y funciones (`ZONAS`, `TERRITORIOS`, `FALLBACK`, `territorioDe`,
 * `zonaDe`, `admite`, `degradar`, `degradarMotivo`, `firmeDe`, `conFirmeDeZona`), con el contenido
 * de la sección 6. Las tablas son JUICIO (§6.1): se corrigen como dato cuando la galería (sección 16)
 * diga que algo no existe en un sitio, nunca tocando código. Sin llamadores hasta el paso 4.
 */
import type { Motif, MotifKind } from './motifs.js'
import type { Requiere, SkeletonId } from './skeletons.js' // solo tipos: skeletons.ts importará valores de aquí

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
  | 'montana_sur' // MY, RW, MA: sin fila en el mapa 07, juicio (sección 6 §6.2)
  | 'generico'

export type Relieve = 'llano' | 'ondulado' | 'media' | 'montana' | 'alta'

/** `null` significa "aquí no existe" y los vetos V1 a V4 lo hacen cumplir. */
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

/** Cómo entra un país en una vuelta: su ruta ordenada de zonas y la cordillera que una vuelta de montaña tiene que atravesar. */
export interface Territorio {
  ruta: readonly { zona: GeoZone; peso: number }[] // orden = recorrido plausible por el país
  cordillera: GeoZone | null // null = el país no tiene reina; si no, la zona que una vuelta `mountain` tiene que contener
  fallback?: boolean // país sin tabla: territorio genérico, contado en test
}

/*
 * ZONAS (sección 6 §6.2): 31 filas, las 30 zonas con nombre más `generico`, la firma del país sin
 * territorio. Cada comentario cita la fila del mapa 07 §3 que la sostiene (dos zonas no tienen fila y
 * lo dicen). Reglas de lectura, que son también las del fichero:
 *  - todo rango `[min; max]` está CONTENIDO en el del motivo en `ARCH.motivo` (constants.ts): la zona
 *    estrecha, nunca amplía (geo.test.ts (a) y (b));
 *  - `null` es "aquí no existe", y lo hacen cumplir `admite` sobre el esqueleto y V1 a V4 sobre el perfil;
 *  - `finalesAlto: 'largo'` implica que también existe el corto; `relieve` es el techo de la zona;
 *  - `adoquin` 1 es METADATO (adoquín urbano: no dibuja nada), 2 sectores y muros adoquinados, 3 masivo;
 *  - `viento` y `altitud` son METADATOS (altitud además alimenta V4); ninguno llega al motor (§6.7);
 *  - `pesos` multiplica `Skeleton.pesoBase`; lo ausente vale 1, 0 prohíbe.
 */
export const ZONAS: Record<GeoZone, GeoSignature> = {
  // 3.1: BE, NL. Pólder: sin cotas de 2,5 km (Kwaremont y Cauberg quedan bajo el 8 % del muro), bergs
  // adoquinados y viento.
  flandes: {
    zona: 'flandes',
    relieve: 'ondulado',
    puerto: null,
    cota: null,
    muro: { km: [0.4, 2.2], g: [8, 14], adoquin: true },
    adoquin: 3,
    sterrato: false,
    viento: 3,
    altitud: 'mar',
    amplitud: 0.55,
    finalesAlto: 'ninguno',
    pesos: {
      ud_muros_adoquin: 3,
      ud_muros: 2,
      et_media_muro: 2,
      et_llana_viento: 2,
      ud_circuito: 0.5,
    },
  },
  // 3.2: BE sur, LU. Côtes de 2,5-4,5 km y muros (Huy, Redoute) sin adoquín.
  ardenas: {
    zona: 'ardenas',
    relieve: 'media',
    puerto: null,
    cota: { km: [2.5, 4.5], g: [5, 7] },
    muro: { km: [0.8, 2.0], g: [8, 13], adoquin: false },
    adoquin: 1,
    sterrato: false,
    viento: 1,
    altitud: 'colina',
    amplitud: 0.85,
    finalesAlto: 'corto',
    pesos: { ud_muro_final: 2, ud_montana_media: 1.5, et_media_muro: 1.5, et_media_alto: 1.2 },
  },
  // 3.13: Bretaña (y, por proximidad, el Loira y el bocage normando: los chemins de vigne de tierra de
  // Paris-Tours). Côtes de 1 km, tierra, viento.
  bretana: {
    zona: 'bretana',
    relieve: 'ondulado',
    puerto: null,
    cota: { km: [2.5, 3.0], g: [5, 7] },
    muro: { km: [0.5, 2.0], g: [8, 10], adoquin: false },
    adoquin: 1,
    sterrato: true,
    viento: 3,
    altitud: 'colina',
    amplitud: 0.7,
    finalesAlto: 'ninguno',
    pesos: { ud_circuito: 1.5, ud_adoquin_ligero: 1.5, et_llana_viento: 1.5 },
  },
  // 3.1 y 1.4: norte de Francia y la cuenca de París y de Aquitania. Llano, pavé en sectores y muros
  // adoquinados cortos; sin cotas.
  francia_norte: {
    zona: 'francia_norte',
    relieve: 'llano',
    puerto: null,
    cota: null,
    muro: { km: [0.5, 1.5], g: [8, 10], adoquin: true },
    adoquin: 2,
    sterrato: false,
    viento: 2,
    altitud: 'mar',
    amplitud: 0.55,
    finalesAlto: 'ninguno',
    pesos: { ud_adoquin: 3, ud_adoquin_ligero: 2, ud_esprint: 1.5, et_llana_viento: 1.5 },
  },
  // 3.14: Macizo Central. También proxy de media montaña continental para Jura, Vosgos y Lorena, que
  // no tienen zona propia en E1 (§6.4, `race-jura`).
  macizo_central: {
    zona: 'macizo_central',
    relieve: 'montana',
    puerto: { km: [9, 17], g: [6, 8], forma: 'irregular' },
    cota: { km: [2.5, 6], g: [5, 7] },
    muro: { km: [1, 2], g: [8, 12], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 1,
    altitud: 'media',
    amplitud: 1.0,
    finalesAlto: 'largo',
    pesos: {
      et_media_valle: 1.5,
      et_media_alto: 1.5,
      ud_montana_media: 1.5,
      et_reina_alto_corto: 1.2,
    },
  },
  // 3.5: FR, IT, CH, AT. Puertos largos y regulares, finales de 15 a 25 km.
  alpes: {
    zona: 'alpes',
    relieve: 'alta',
    puerto: { km: [12, 25], g: [5.5, 8.5], forma: 'regular' },
    cota: { km: [4, 8], g: [5, 7] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 0,
    altitud: 'alta',
    amplitud: 1.15,
    finalesAlto: 'largo',
    pesos: {
      et_reina_alto_largo: 2,
      et_reina_valle: 1.3,
      et_reina_encadenada: 1.2,
      et_llana: 0.5,
    },
  },
  // 3.6: FR, ES, AD. Puertos más cortos y más duros que los alpinos, encadenados.
  pirineos: {
    zona: 'pirineos',
    relieve: 'alta',
    puerto: { km: [10, 17], g: [7, 8.5], forma: 'regular' },
    cota: { km: [4, 8], g: [6, 7] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 0,
    altitud: 'alta',
    amplitud: 1.15,
    finalesAlto: 'largo',
    pesos: { et_reina_encadenada: 2, et_reina_alto_largo: 1.5, et_reina_alto_corto: 1.2 },
  },
  // 3.15: Provenza y prealpes de Niza (Ventoux, Turini, Couillole); mistral. Suelo del puerto 11 km y
  // no 15, para que la meta de `et_reina_blanda` [9; 12] quepa (§6.2, lista de revisión del dueño).
  provenza: {
    zona: 'provenza',
    relieve: 'montana',
    puerto: { km: [11, 22], g: [6.5, 7.5], forma: 'regular' },
    cota: { km: [2.5, 8], g: [5, 7] },
    muro: { km: [1, 2], g: [8, 9], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 3,
    altitud: 'media',
    amplitud: 0.9,
    finalesAlto: 'largo',
    pesos: { et_llana_viento: 2, et_media_valle: 1.3 },
  },
  // 3.3: norte de Italia (lagos, prealpes, Emilia, Liguria). `sterrato` y `adoquin` 1 para Veneto
  // Classic (tierra y adoquín urbano); `cota.g` desde el 4 % para Cipressa y Poggio (§6.2).
  italia_norte: {
    zona: 'italia_norte',
    relieve: 'montana',
    puerto: { km: [9, 13], g: [6, 8], forma: 'irregular' },
    cota: { km: [4, 8], g: [4, 7] },
    muro: { km: [1, 2], g: [10, 16], adoquin: false },
    adoquin: 1,
    sterrato: true,
    viento: 0,
    altitud: 'media',
    amplitud: 1.0,
    finalesAlto: 'corto',
    pesos: {
      ud_montana: 2,
      ud_esprint_capi: 2,
      ud_montana_media: 1.5,
      et_reina_alto_corto: 1.3,
      ud_sterrato: 0.5,
    },
  },
  // 3.4: Toscana, Umbría, Marcas y Romaña. Colinas, muros y strade bianche; sin puertos.
  italia_centro: {
    zona: 'italia_centro',
    relieve: 'media',
    puerto: null,
    cota: { km: [2.5, 6], g: [5, 7] },
    muro: { km: [0.5, 2.1], g: [9, 14], adoquin: false },
    adoquin: 0,
    sterrato: true,
    viento: 1,
    altitud: 'colina',
    amplitud: 0.9,
    finalesAlto: 'corto',
    pesos: { ud_sterrato: 3, ud_muro_final: 2, et_media_muro: 1.5, ud_circuito: 1.3 },
  },
  // 3.7: Dolomitas. Puertos cortos y progresivos, finales en alto cortos y duros.
  dolomitas: {
    zona: 'dolomitas',
    relieve: 'alta',
    puerto: { km: [9, 14], g: [7.5, 9], forma: 'progresiva' },
    cota: { km: [4, 8], g: [6, 7] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 0,
    altitud: 'alta',
    amplitud: 1.15,
    finalesAlto: 'largo',
    pesos: { et_reina_alto_corto: 2, et_reina_encadenada: 1.5, et_montana_corta: 1.5 },
  },
  // 3.4 (Abruzos: Blockhaus, Gran Sasso), Lazio, Campania, Calabria y Cerdeña: se separa de
  // `italia_centro` porque los Abruzos no caben en una zona `media`.
  italia_sur: {
    zona: 'italia_sur',
    relieve: 'montana',
    puerto: { km: [9, 16], g: [5, 8], forma: 'progresiva' },
    cota: { km: [2.5, 7], g: [5, 7] },
    muro: { km: [0.5, 2], g: [8, 12], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 2,
    altitud: 'media',
    amplitud: 0.9,
    finalesAlto: 'largo',
    pesos: { et_media_valle: 1.3, ud_montana_media: 1.3, et_reina_alto_largo: 1.2 },
  },
  // 3.8: Cantábrico y País Vasco (y, como proxy, Navarra, Galicia y la sierra de la Demanda). Muros
  // vascos topados a 2,5 km por `ARCH.motivo.muro.km`; puertos irregulares.
  cantabrico: {
    zona: 'cantabrico',
    relieve: 'montana',
    puerto: { km: [9, 15], g: [7, 9], forma: 'irregular' },
    cota: { km: [3, 8], g: [6, 7] },
    muro: { km: [1, 2.5], g: [10, 15], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 1,
    altitud: 'media',
    amplitud: 1.1,
    finalesAlto: 'largo',
    pesos: { et_reina_alto_corto: 2, et_media_muro: 1.5, ud_montana: 1.5, et_llana: 0.3 },
  },
  // 3.9: Meseta. Sin puerto (Navacerrada sale como cota de 8 km), viento, altiplano.
  meseta: {
    zona: 'meseta',
    relieve: 'ondulado',
    puerto: null,
    cota: { km: [3, 8], g: [4, 6] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 3,
    altitud: 'altiplano',
    amplitud: 0.6,
    finalesAlto: 'corto',
    pesos: { et_llana_viento: 2, et_media_tendida: 2, ud_esprint: 1.5 },
  },
  // 3.10: Andalucía (Sierra Nevada, Calar Alto, La Pandera).
  andalucia: {
    zona: 'andalucia',
    relieve: 'montana',
    puerto: { km: [9, 20], g: [6, 8], forma: 'regular' },
    cota: { km: [4, 8], g: [5, 7] },
    muro: { km: [1, 2], g: [8, 11], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 2,
    altitud: 'alta',
    amplitud: 0.9,
    finalesAlto: 'largo',
    pesos: { et_media_alto: 1.5, et_reina_alto_largo: 1.3, et_llana: 1.2 },
  },
  // 3.11: Levante, Cataluña litoral, Murcia y Baleares (Sa Calobra, Puig Major, Aitana, Xorret de
  // Catí). Sube a `montana` para que su puerto lo lea algún esqueleto (§6.2); `finalesAlto` sigue `corto`.
  levante: {
    zona: 'levante',
    relieve: 'montana',
    puerto: { km: [9, 22], g: [5, 7], forma: 'regular' },
    cota: { km: [3, 6], g: [6, 7] },
    muro: { km: [1, 2.5], g: [10, 12], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 1,
    altitud: 'media',
    amplitud: 0.9,
    finalesAlto: 'corto',
    pesos: { et_media_alto: 2, ud_muro_final: 1.3, et_media_muro: 1.2 },
  },
  // 3.12: Portugal. `montana` y `largo` por la Torre (Estrela), reina de la Volta.
  portugal: {
    zona: 'portugal',
    relieve: 'montana',
    puerto: { km: [9, 20], g: [5, 7], forma: 'regular' },
    cota: { km: [3, 8], g: [6, 7] },
    muro: { km: [1, 2.5], g: [8, 10], adoquin: false },
    adoquin: 1,
    sterrato: false,
    viento: 2,
    altitud: 'media',
    amplitud: 0.9,
    finalesAlto: 'largo',
    pesos: { et_media_alto: 1.3, et_reina_alto_largo: 1.2, et_llana_viento: 1.2 },
  },
  // 3.16: Centroeuropa (Alemania, Chequia, Eslovaquia, Polonia, Hungría, y Austria y Eslovenia fuera
  // de los Alpes). `montana` por Krvavec y Sölden, para que PL, CZ y SK lleven cordillera.
  centroeuropa: {
    zona: 'centroeuropa',
    relieve: 'montana',
    puerto: { km: [9, 13], g: [5, 8], forma: 'regular' },
    cota: { km: [2.5, 6], g: [5, 7] },
    muro: { km: [1, 2], g: [8, 10], adoquin: false },
    adoquin: 1,
    sterrato: false,
    viento: 1,
    altitud: 'colina',
    amplitud: 0.85,
    finalesAlto: 'corto',
    pesos: {
      et_media_valle: 1.5,
      ud_circuito: 1.3,
      et_media_alto: 1.2,
      et_reina_alto_corto: 1.2,
    },
  },
  // 3.17: Dinamarca y Noruega en una sola zona (y el Báltico): cota hasta 7 km, sin puerto.
  escandinavia: {
    zona: 'escandinavia',
    relieve: 'ondulado',
    puerto: null,
    cota: { km: [2.5, 7], g: [5, 7] },
    muro: { km: [0.5, 1.0], g: [8, 10], adoquin: false },
    adoquin: 1,
    sterrato: false,
    viento: 3,
    altitud: 'mar',
    amplitud: 0.6,
    finalesAlto: 'corto',
    pesos: { et_llana_viento: 2, ud_esprint: 1.5, ud_circuito: 1.3 },
  },
  // 3.18: Islas Británicas. Sin puerto; el adoquín es urbano (metadato) y los sectores de Rutland
  // salen de tierra (`sterrato`).
  britanicas: {
    zona: 'britanicas',
    relieve: 'media',
    puerto: null,
    cota: { km: [2.5, 8], g: [6, 7] },
    muro: { km: [0.4, 1.0], g: [10, 16], adoquin: false },
    adoquin: 1,
    sterrato: true,
    viento: 3,
    altitud: 'colina',
    amplitud: 0.9,
    finalesAlto: 'corto',
    pesos: { ud_circuito: 1.5, et_media_alto: 1.3, et_media_muro: 1.3 },
  },
  // 3.19: Balcanes (sierras de 10-25 km: Učka, Rila, Cárpatos; también la Istria eslovena).
  balcanes: {
    zona: 'balcanes',
    relieve: 'montana',
    puerto: { km: [10, 23], g: [5, 7], forma: 'regular' },
    cota: { km: [3, 8], g: [5, 7] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 2,
    altitud: 'media',
    amplitud: 0.9,
    finalesAlto: 'largo',
    pesos: { et_reina_alto_largo: 1.3, et_llana: 1.2, et_media_valle: 1.2 },
  },
  // 3.19: TR, CY, AZ. Suelo del puerto 11 km (§6.2, lista de revisión del dueño).
  anatolia: {
    zona: 'anatolia',
    relieve: 'montana',
    puerto: { km: [11, 21], g: [6, 7], forma: 'regular' },
    cota: { km: [3, 8], g: [5, 7] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 2,
    altitud: 'media',
    amplitud: 0.8,
    finalesAlto: 'largo',
    pesos: { et_reina_alto_largo: 1.5, et_llana: 1.5, et_llana_viento: 1.2 },
  },
  // 3.20: Andes (y Centroamérica). Altiplano; Alto de Letras (80 km) no cabe bajo el techo de 25.
  // Cota desde 2,5 km: repechos cortos antes de los puertos (§6.2).
  andes: {
    zona: 'andes',
    relieve: 'alta',
    puerto: { km: [11, 25], g: [5, 7], forma: 'regular' },
    cota: { km: [2.5, 8], g: [5, 7] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 0,
    altitud: 'altiplano',
    amplitud: 1.0,
    finalesAlto: 'largo',
    pesos: { et_reina_valle: 2, et_reina_alto_largo: 1.5, et_media_tendida: 1.5, et_llana: 0.3 },
  },
  // 3.21: Cono Sur (AR, CL). `ondulado` con puerto: la única reina posible es `et_reina_blanda`, por
  // la excepción escrita de §6.2 (AR y CL tienen `cordillera: null`).
  cono_sur: {
    zona: 'cono_sur',
    relieve: 'ondulado',
    puerto: { km: [9, 25], g: [5, 6], forma: 'regular' },
    cota: { km: [4, 8], g: [4, 6] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 3,
    altitud: 'media',
    amplitud: 0.6,
    finalesAlto: 'largo',
    pesos: { et_llana_viento: 2, et_llana: 1.5, et_media_tendida: 1.2, et_reina_blanda: 1 },
  },
  // 3.22: Norteamérica (Mount Baldy, Snowbird; los muros de circuito de Québec y Montréal).
  norteamerica: {
    zona: 'norteamerica',
    relieve: 'montana',
    puerto: { km: [10, 25], g: [5, 9], forma: 'regular' },
    cota: { km: [2.5, 6], g: [6, 7] },
    muro: { km: [0.4, 1.8], g: [8, 10], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 2,
    altitud: 'media',
    amplitud: 0.9,
    finalesAlto: 'largo',
    pesos: { ud_circuito: 2, et_media_alto: 1.3, et_reina_alto_largo: 1.2, et_llana: 1.2 },
  },
  // 3.23: Australia (Willunga 3 × 7,5; circuitos).
  australia: {
    zona: 'australia',
    relieve: 'ondulado',
    puerto: null,
    cota: { km: [2.5, 3.5], g: [6, 7] },
    muro: { km: [0.5, 1.1], g: [9, 11], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 3,
    altitud: 'colina',
    amplitud: 0.7,
    finalesAlto: 'corto',
    pesos: { ud_circuito: 2, et_media_alto: 1.5, et_llana_viento: 1.5 },
  },
  // 3.24: Asia oriental. Puerto topado en 14 km porque `altitud` es `colina` (V4); los 20-40 km al
  // 3-4 % de Qinghai son `tendida`. Muro de circuito para la Japan Cup.
  asia_oriental: {
    zona: 'asia_oriental',
    relieve: 'montana',
    puerto: { km: [9, 14], g: [6, 9], forma: 'regular' },
    cota: { km: [2.5, 5], g: [6, 7] },
    muro: { km: [0.5, 1.5], g: [8, 10], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 1,
    altitud: 'colina',
    amplitud: 0.8,
    finalesAlto: 'corto',
    pesos: { ud_circuito: 2, et_llana: 1.5, et_media_alto: 1.2, et_reina_alto_corto: 1.2 },
  },
  // 3.25: Golfo. Sin puerto ni muro (D8): Jebel Hafeet se dibuja como `alto_corto` de 7 km.
  golfo: {
    zona: 'golfo',
    relieve: 'llano',
    puerto: null,
    cota: { km: [2.5, 7], g: [5, 7] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 3,
    altitud: 'mar',
    amplitud: 0.4,
    finalesAlto: 'corto',
    pesos: { et_llana_viento: 3, et_llana: 2, et_media_alto: 1, et_media_valle: 0.2 },
  },
  // SIN FILA en el mapa 07 (juicio del redactor): Genting de la 3.25, Atlas y Ruanda (MY, RW, MA).
  // `adoquin` 1 (metadato) por el adoquín urbano de Kigali. Lista de revisión del dueño.
  montana_sur: {
    zona: 'montana_sur',
    relieve: 'montana',
    puerto: { km: [9, 22], g: [5, 9], forma: 'regular' },
    cota: { km: [2.5, 8], g: [5, 7] },
    muro: { km: [0.4, 1.5], g: [8, 12], adoquin: false },
    adoquin: 1,
    sterrato: false,
    viento: 1,
    altitud: 'media',
    amplitud: 1.0,
    finalesAlto: 'largo',
    pesos: { et_reina_alto_largo: 1.3, et_media_alto: 1.3 },
  },
  // SIN FILA en el mapa 07 (juicio): costa y sabana de BJ, BF, CM, MU y DZ (el Tour d'Algérie corre por
  // la costa, no por el Tell). Cota corta, sin muro.
  africa_llana: {
    zona: 'africa_llana',
    relieve: 'ondulado',
    puerto: null,
    cota: { km: [2.5, 4], g: [4, 7] },
    muro: null,
    adoquin: 0,
    sterrato: false,
    viento: 2,
    altitud: 'colina',
    amplitud: 0.7,
    finalesAlto: 'corto',
    pesos: { et_llana: 1.5, ud_esprint: 1.5, et_llana_viento: 1.2 },
  },
  // SIN FILA: la firma del país sin territorio (`FALLBACK`), y la de los llanos tropicales de las
  // ediciones andinas (Yopal, §6.4). Deliberadamente mediocre: un país del que no se sabe nada
  // produce carreras del montón, y la marca `fallback` lo hace visible.
  generico: {
    zona: 'generico',
    relieve: 'ondulado',
    puerto: null,
    cota: { km: [2.5, 6], g: [4, 7] },
    muro: { km: [1, 2], g: [8, 10], adoquin: false },
    adoquin: 0,
    sterrato: false,
    viento: 1,
    altitud: 'colina',
    amplitud: 0.85,
    finalesAlto: 'corto',
    pesos: {},
  },
}

/*
 * TERRITORIOS (sección 6 §6.3): 64 filas explícitas, los 56 países con carreras de equipos más 8
 * voluntarias (AR, CL, NZ, IE, SE, FI, LV, QA) cuya zona tiene nombre. `ruta` es un recorrido
 * plausible por el país (la composición, sección 7, toma una ventana contigua); `peso` solo lo lee
 * `zonaDe`. `cordillera: null` es un veto estructural: el país no tiene reina (D8), con la única
 * excepción de `et_reina_blanda` en zonas con `finalesAlto: 'largo'` (`cono_sur`). Los demás países
 * de `COUNTRIES` caen a `FALLBACK`.
 */
const unaZona = (zona: GeoZone, cordillera: GeoZone | null): Territorio => ({
  ruta: [{ zona, peso: 1 }],
  cordillera,
})
const ALPES_CENTROEUROPA: Territorio = {
  ruta: [
    { zona: 'alpes', peso: 2 },
    { zona: 'centroeuropa', peso: 2 },
  ],
  cordillera: 'alpes',
}
export const TERRITORIOS: Record<string, Territorio> = {
  FR: {
    ruta: [
      { zona: 'bretana', peso: 3 },
      { zona: 'francia_norte', peso: 3 },
      { zona: 'macizo_central', peso: 2 },
      { zona: 'alpes', peso: 3 },
      { zona: 'provenza', peso: 2 },
      { zona: 'pirineos', peso: 2 },
    ],
    cordillera: 'alpes',
  },
  BE: {
    ruta: [
      { zona: 'flandes', peso: 4 },
      { zona: 'ardenas', peso: 3 },
    ],
    cordillera: null,
  },
  NL: unaZona('flandes', null),
  LU: unaZona('ardenas', null),
  IT: {
    ruta: [
      { zona: 'italia_norte', peso: 3 },
      { zona: 'dolomitas', peso: 2 },
      { zona: 'italia_centro', peso: 3 },
      { zona: 'italia_sur', peso: 2 },
    ],
    cordillera: 'dolomitas',
  },
  ES: {
    ruta: [
      { zona: 'cantabrico', peso: 3 },
      { zona: 'meseta', peso: 3 },
      { zona: 'andalucia', peso: 2 },
      { zona: 'levante', peso: 3 },
      { zona: 'pirineos', peso: 2 },
    ],
    cordillera: 'pirineos',
  },
  AD: unaZona('pirineos', 'pirineos'),
  PT: unaZona('portugal', 'portugal'),
  DE: unaZona('centroeuropa', null),
  HU: unaZona('centroeuropa', null),
  CZ: unaZona('centroeuropa', 'centroeuropa'),
  SK: unaZona('centroeuropa', 'centroeuropa'),
  PL: unaZona('centroeuropa', 'centroeuropa'),
  AT: ALPES_CENTROEUROPA,
  SI: ALPES_CENTROEUROPA,
  CH: ALPES_CENTROEUROPA,
  DK: unaZona('escandinavia', null),
  EE: unaZona('escandinavia', null),
  LT: unaZona('escandinavia', null),
  SE: unaZona('escandinavia', null),
  FI: unaZona('escandinavia', null),
  LV: unaZona('escandinavia', null),
  NO: unaZona('escandinavia', null),
  GB: unaZona('britanicas', null),
  IE: unaZona('britanicas', null),
  HR: unaZona('balcanes', 'balcanes'),
  BA: unaZona('balcanes', 'balcanes'),
  RS: unaZona('balcanes', 'balcanes'),
  RO: unaZona('balcanes', 'balcanes'),
  BG: unaZona('balcanes', 'balcanes'),
  AL: unaZona('balcanes', 'balcanes'),
  XK: unaZona('balcanes', 'balcanes'),
  GR: unaZona('balcanes', 'balcanes'),
  TR: unaZona('anatolia', 'anatolia'),
  CY: unaZona('anatolia', 'anatolia'),
  AZ: unaZona('anatolia', 'anatolia'),
  CO: unaZona('andes', 'andes'),
  EC: unaZona('andes', 'andes'),
  VE: unaZona('andes', 'andes'),
  GT: unaZona('andes', 'andes'),
  AR: unaZona('cono_sur', null), // reina blanda por excepción (§6.2)
  CL: unaZona('cono_sur', null), // reina blanda por excepción (§6.2)
  US: unaZona('norteamerica', 'norteamerica'),
  CA: unaZona('norteamerica', 'norteamerica'),
  AU: unaZona('australia', null),
  NZ: unaZona('australia', null),
  JP: unaZona('asia_oriental', 'asia_oriental'),
  TW: unaZona('asia_oriental', 'asia_oriental'),
  CN: unaZona('asia_oriental', 'asia_oriental'),
  KR: unaZona('asia_oriental', null),
  TH: unaZona('asia_oriental', null),
  IN: unaZona('asia_oriental', null),
  MY: unaZona('montana_sur', 'montana_sur'),
  RW: unaZona('montana_sur', 'montana_sur'),
  MA: unaZona('montana_sur', 'montana_sur'),
  AE: unaZona('golfo', null),
  SA: unaZona('golfo', null),
  OM: unaZona('golfo', null),
  QA: unaZona('golfo', null),
  BJ: unaZona('africa_llana', null),
  BF: unaZona('africa_llana', null),
  CM: unaZona('africa_llana', null),
  MU: unaZona('africa_llana', null),
  DZ: unaZona('africa_llana', null),
}

/** El territorio del país sin fila: una sola zona, `generico`, sin reina, con la marca que el test cuenta. */
export const FALLBACK: Territorio = {
  ruta: [{ zona: 'generico', peso: 1 }],
  cordillera: null,
  fallback: true,
}

/** = TERRITORIOS[country] ?? FALLBACK; `null` (banco sin país) da FALLBACK. */
export function territorioDe(country: string | null): Territorio {
  return (country === null ? undefined : TERRITORIOS[country]) ?? FALLBACK
}

/**
 * Zona de mayor peso de `territorioDe(country).ruta` (empate: la primera en `ruta`); `generico` si el
 * país es fallback, es desconocido o `country` es null. Sin sorteo. La usan SOLO los 532 nacionales
 * (§6.6) y `regionOf` como último recurso: ninguna carrera de equipos llega aquí (regions.test.ts).
 */
export function zonaDe(country: string | null): GeoZone {
  let mejor: { zona: GeoZone; peso: number } | null = null
  for (const r of territorioDe(country).ruta) if (mejor === null || r.peso > mejor.peso) mejor = r
  return mejor?.zona ?? 'generico'
}

/** El orden del relieve, de menos a más: `Requiere.relieve` es un mínimo y `degradar` baja por aquí. */
const ORDEN_RELIEVE: readonly Relieve[] = ['llano', 'ondulado', 'media', 'montana', 'alta']

/** Un `Requiere` sin alternativas se cumple campo a campo; un campo ausente no exige nada (§5.1, §6.5 punto 1). */
function cumple(r: Requiere, geo: GeoSignature): boolean {
  if (r.puerto && geo.puerto === null) return false
  if (r.cota && geo.cota === null) return false
  if (r.muro) {
    if (geo.muro === null) return false
    if (r.muro !== true && !geo.muro.adoquin) return false
  }
  if (r.cotaKmMin !== undefined && (geo.cota === null || geo.cota.km[1] < r.cotaKmMin)) return false
  if (r.cotaCortaMax !== undefined && (geo.cota === null || geo.cota.km[0] > r.cotaCortaMax))
    return false
  if (r.adoquin !== undefined && geo.adoquin < r.adoquin) return false
  if (r.sterrato && !geo.sterrato) return false
  if (r.viento !== undefined && geo.viento < r.viento) return false
  if (
    r.relieve !== undefined &&
    ORDEN_RELIEVE.indexOf(geo.relieve) < ORDEN_RELIEVE.indexOf(r.relieve)
  )
    return false
  if (r.finalesAlto === 'corto' && geo.finalesAlto === 'ninguno') return false
  if (r.finalesAlto === 'largo' && geo.finalesAlto !== 'largo') return false
  if (r.altitud !== undefined && geo.altitud !== r.altitud) return false
  return true
}

/**
 * (sección 5, §5.1) Cierto si `requiere` es `undefined` o si él (o, si es lista, alguna de sus
 * alternativas) se cumple campo a campo con la semántica de los comentarios de `Requiere`. Solo lee
 * `requiere`: que el esqueleto además se pueda DIBUJAR en la zona lo sella el test (h) de §6.8.
 */
export function admite(requiere: Requiere | Requiere[] | undefined, geo: GeoSignature): boolean {
  if (requiere === undefined) return true
  if (Array.isArray(requiere)) return requiere.some((r) => cumple(r, geo))
  return cumple(requiere, geo)
}

/** Siempre hacia abajo: alta → montana → media → ondulado → llano; `llano` se queda en `llano`. Nunca hacia arriba. */
export function degradar(relieve: Relieve): Relieve {
  return ORDEN_RELIEVE[Math.max(0, ORDEN_RELIEVE.indexOf(relieve) - 1)] ?? 'llano'
}

/**
 * Hueco cuyo motivo no existe en la zona (sección 8, §8.5), siempre hacia abajo: puerto → cota → muro →
 * enlace; cota → muro → enlace; muro → cota → enlace (un muro no existe en el pólder llano, pero una
 * cota corta sí donde `geo.cota` no es null); `sector` y `racimo` sin firme posible (`firmeDe` null) →
 * enlace. Un motivo que existe en la zona se devuelve igual. `circuito` y `cadena` se devuelven a sí
 * mismos (degradan a sus hijos); los enlaces y la meta no dependen de la zona.
 */
export function degradarMotivo(kind: MotifKind, geo: GeoSignature): MotifKind {
  switch (kind) {
    case 'puerto':
      return geo.puerto ? 'puerto' : geo.cota ? 'cota' : geo.muro ? 'muro' : 'enlace'
    case 'cota':
      return geo.cota ? 'cota' : geo.muro ? 'muro' : 'enlace'
    case 'muro':
      return geo.muro ? 'muro' : geo.cota ? 'cota' : 'enlace'
    case 'sector':
    case 'racimo':
      return firmeDe(geo) === null ? 'enlace' : kind
    default:
      return kind
  }
}

/** El firme que la zona da a un `sector` (§6.5 punto 5): 'adoquin' si geo.adoquin ≥ 2; si no, 'tierra' si geo.sterrato; si no, null. */
export function firmeDe(geo: GeoSignature): 'adoquin' | 'tierra' | null {
  if (geo.adoquin >= 2) return 'adoquin'
  return geo.sterrato ? 'tierra' : null
}

/**
 * Copia de una plantilla en la que todo `sector`, a cualquier profundidad de `hijos` (racimo, circuito,
 * sector_meta), cuyo firme la zona no admite ('adoquin' —el firme por defecto de un sector, §5.4— con
 * geo.adoquin < 2; 'tierra' sin geo.sterrato) lleva firmeDe(geo). Si firmeDe(geo) es null lo deja como
 * está: V2 o V3 lo dirán, y el test (h) de §6.8 impide que ocurra con un esqueleto admitido. Pura, sin
 * RNG: no toca la plantilla de entrada.
 */
export function conFirmeDeZona(motivos: readonly Motif[], geo: GeoSignature): Motif[] {
  const firme = firmeDe(geo)
  const rehacer = (m: Motif): Motif => {
    const copia: Motif = { ...m }
    if (m.hijos) copia.hijos = m.hijos.map(rehacer)
    if (m.separaciones) copia.separaciones = [...m.separaciones]
    if (m.cotaFinal) copia.cotaFinal = { ...m.cotaFinal }
    if (m.kind !== 'sector' || firme === null) return copia
    const admitido = (m.firme ?? 'adoquin') === 'adoquin' ? geo.adoquin >= 2 : geo.sterrato
    if (admitido) return copia
    copia.firme = firme
    if (m.adoquin !== undefined) copia.adoquin = firme === 'adoquin'
    return copia
  }
  return motivos.map(rehacer)
}
