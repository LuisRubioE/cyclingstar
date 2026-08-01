/**
 * La vuelta de prueba de 5 etapas con variedad (SPEC, Paso 28): llana, media montaña, reina,
 * contrarreloj y llana. Autoría a escala humana (tramos y banners); el motor la muestrea a
 * bloques de 100 m y las categorías de las cimas se derivan solas de la dureza de cada puerto.
 */
import type { StageProfile } from '../stage/types.js'

export type StageKind = 'llana' | 'media' | 'reina' | 'cri' | 'clasica'

export interface TourStage {
  day: number
  name: string
  kind: StageKind
  profile: StageProfile
  /** Contrarreloj individual (SPEC 6.13). */
  timeTrial?: boolean
}

/** Cinco etapas variadas; los km de cada segmento suman la distancia de la etapa. */
export const TEST_TOUR: TourStage[] = [
  {
    day: 1,
    name: 'Etapa 1 · Apertura llana',
    kind: 'llana',
    profile: {
      segments: [{ km: 182, tipo: 'llano' }],
      banners: [{ km: 95, tipo: 'meta_volante' }],
    },
  },
  {
    day: 2,
    name: 'Etapa 2 · Media montaña',
    kind: 'media',
    profile: {
      segments: [
        { km: 55, tipo: 'llano' },
        { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 6 }] }, // 10·36 = 360 -> cat2
        { km: 15, tipo: 'descenso', tramos: [{ km: 15, g: -5 }] },
        { km: 48, tipo: 'llano' },
        { km: 8, tipo: 'puerto', tramos: [{ km: 8, g: 6 }] }, // 8·36 = 288 -> cat3
        { km: 14, tipo: 'llano' },
      ],
      banners: [
        { km: 65, tipo: 'cima' }, // cima del puerto de 10 km (55-65)
        { km: 100, tipo: 'meta_volante' },
        { km: 136, tipo: 'cima' }, // cima del puerto de 8 km (128-136)
      ],
    },
  },
  {
    day: 3,
    name: 'Etapa 3 · Reina',
    kind: 'reina',
    profile: {
      segments: [
        { km: 100, tipo: 'llano' },
        { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 6 }] }, // cat2
        { km: 15, tipo: 'descenso', tramos: [{ km: 15, g: -5 }] },
        { km: 37, tipo: 'llano' },
        { km: 18, tipo: 'puerto', tramos: [{ km: 18, g: 8 }] }, // 18·64 = 1152 -> HC, meta en alto
      ],
      banners: [
        { km: 110, tipo: 'cima' },
        { km: 180, tipo: 'cima' },
      ],
    },
  },
  {
    day: 4,
    name: 'Etapa 4 · Contrarreloj',
    kind: 'cri',
    timeTrial: true,
    profile: { segments: [{ km: 40, tipo: 'llano' }] },
  },
  {
    day: 5,
    name: 'Etapa 5 · Llana final',
    kind: 'llana',
    profile: {
      segments: [{ km: 150, tipo: 'llano' }],
      banners: [{ km: 75, tipo: 'meta_volante' }],
    },
  },
]
