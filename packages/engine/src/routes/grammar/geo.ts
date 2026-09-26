/**
 * GEOGRAFÍA DE LA GRAMÁTICA (docs/generador.md §3.4).
 *
 * Paso 0: solo nace `GeoZone`, porque `RouteStats` del censo la cita. El paso 1 añade `Relieve`,
 * `GeoSignature` y `Territorio`, y el paso 2 las tablas.
 */

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
