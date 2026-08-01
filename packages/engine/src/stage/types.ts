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
  tsb: number
  orders: StageOrders
  /** Desventaja del corredor en la general, en segundos (para 6.9). */
  gcDeficitSeconds: number
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

/** Salida del motor (SPEC 6.1, 6.15). `workUnits` alimenta el TSS de 5.1. */
export interface StageOutput {
  events: RaceEvent[]
  results: StageResult[]
  workUnits: Map<string, number>
  incidents: Incident[]
}
